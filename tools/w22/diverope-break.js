#!/usr/bin/env node
// 22-2 Treasure Diver Rope: the computer plays both seats; each scenario changes one player's presses (CPU.filter) to
// act like a kind of person (perfect, slow, idle, alone, a masher, wrong job...) and reports how the level ended, the
// time per dive, the stats, the medal and the gold help given. "want" says what should happen.
// Usage: node tools/w22/diverope-break.js [--seed=1] [--only=name,name] [--trace=1]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const seed = +opt('seed', 1), only = opt('only', '').split(',').filter(Boolean), trace = +opt('trace', 0);
const RND = `(S.r = ((S.r || 7) * 1103515245 + 12345) % 2147483648) / 2147483648`;
const SCEN = {
  // two computers: the best pair
  pair: { max: 600, want: 'clear', f: `return o;` },
  // a slow kid on each side in turn: does the computer's moves 0.6 s late and stops for 2 s every 8 s
  slowPip: { max: 700, want: 'clear', f: `if (p.id !== 0) return o; S.q = S.q || []; S.q.push(o); if (S.q.length > 72) S.q.shift(); if ((G.time % 8) < 2) return {}; return S.q[0];` },
  slowBo: { max: 700, want: 'clear', f: `if (p.id !== 1) return o; S.q = S.q || []; S.q.push(o); if (S.q.length > 72) S.q.shift(); if ((G.time % 8) < 2) return {}; return S.q[0];` },
  // a distracted person: does the right thing, but every 6 s wanders for 1.5 s with random presses
  noisyPip: { max: 700, want: 'clear', f: `if (p.id !== 0) return o; if ((G.time % 6) < 1.5) { const r = () => ${RND}; return { left: r() < 0.3, right: r() < 0.3, jump: r() < 0.2, down: r() < 0.3, act: r() < 0.2 }; } return o;` },
  noisyBo: { max: 700, want: 'clear', f: `if (p.id !== 1) return o; if ((G.time % 6) < 1.5) { const r = () => ${RND}; return { left: r() < 0.3, right: r() < 0.3, jump: r() < 0.2, down: r() < 0.3, act: r() < 0.2 }; } return o;` },
  // nobody home: one player presses nothing at all (and no idle stop for the computer): must NOT clear
  idlePip: { max: 400, want: 'stuck', f: `if (p.id === 0) return {}; return o;` },
  idleBo: { max: 400, want: 'stuck', f: `if (p.id === 1) return {}; return o;` },
  // one person alone does BOTH jobs as best one pair of hands can (the other seat idle): must NOT clear
  soloPip: { max: 400, want: 'stuck', f: `if (p.id === 1) return {}; return o;`, both: 0 },
  // a masher on both jobs (random presses every step), the computer partner: should still get through (gold help)
  masherPip: { max: 900, want: 'clear', f: `if (p.id === 0) { const r = () => ${RND}; return { left: r() < 0.5, right: r() < 0.5, jump: r() < 0.5, act: r() < 0.5, down: r() < 0.5 }; } return o;` },
  masherBo: { max: 900, want: 'clear', f: `if (p.id === 1) { const r = () => ${RND}; return { left: r() < 0.5, right: r() < 0.5, jump: r() < 0.5, act: r() < 0.5, down: r() < 0.5 }; } return o;` },
  // two mashers: nobody plays properly; must not finish quickly (it may never finish)
  masherBoth: { max: 400, want: 'any', f: `const r = () => ${RND}; return { left: r() < 0.5, right: r() < 0.5, jump: r() < 0.5, act: r() < 0.5, down: r() < 0.5 };` },
  // Pip in the boat never pumps (only the winch): blubs, then a gold air hose
  noPump: { max: 700, want: 'clear', f: `if (p.id === st.boater && p.id === 0) { const q = Object.assign({}, o); q.act = false; return q; } return o;` },
  // Pip in the boat never reels in (lets out and pumps only): the gold winch must come
  noReel: { max: 800, want: 'clear', f: `if (p.id === st.boater && p.id === 0) { const q = Object.assign({}, o); q.up = false; if (!q.down) q.act = (G.time % 1) < 0.5; return q; } return o;` },
  // Pip the diver never grabs: stuck at the chest (the diver's job), must not clear
  noGrab: { max: 400, want: 'stuck', f: `if (p.id === st.diver && p.id === 0) { const q = Object.assign({}, o); q.act = false; return q; } return o;` },
  // Pip only ever holds the action (pumps once per press -> one press): stuck when Pip dives
  holdAct: { max: 400, want: 'stuck', f: `if (p.id === 0) return { act: true }; return o;` },
  // Pip does the other job's buttons: swims when in the boat, holds ▼ and pumps when diving: must not clear
  wrongJob: { max: 500, want: 'stuck', f: `if (p.id !== 0) return o; if (p.id === st.boater) return { left: (G.time % 4) < 2, right: (G.time % 4) >= 2 }; return { down: true, act: (G.time % 0.5) < 0.25 };` },
  // Pip as the diver swims the wrong way for the first 30 s of each dive (gold current comes)
  backwards: { max: 700, want: 'clear', f: `if (p.id !== 0 || p.id !== st.diver || st.diveT > 30) return o; return Object.assign({}, o, { left: !!o.right, right: !!o.left });` },
};
(async () => {
  const browser = await chromium.launch();
  let wrong = 0;
  for (const [name, sc] of Object.entries(SCEN)) {
    if (only.length && !only.includes(name)) continue;
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(s => {
      const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
      Math.random = gen(s * 7919);
    }, seed);
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
    const r = await page.evaluate(({ f, max, seed, trace }) => {
      const P = window.__pipbo, G = P.G, S = { r: seed * 99991 % 2147483647 + 1 };
      G.manual = true; G.cpuOn = [true, true]; P.CPU.idleStop = 1e9;
      const fn = new Function('p', 'o', 'dt', 'st', 'S', 'G', f);
      P.CPU.filter = (p, o, dt) => fn(p, o, dt, G.mst, S, G);
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Treasure Diver Rope'));
      const msgs = [], tr = [];
      let n = 0, lastMsg = null;
      while (n < max / P.DT && (G.mode === 'play')) {
        P.step(P.DT); n++;
        const st = G.mst, m = st.msg;
        if (m && m.text !== lastMsg) { lastMsg = m.text; msgs.push(Math.round(G.time) + 's d' + (G.room + 1) + ': ' + m.text); }
        if (!m) lastMsg = null;
        if (trace && n % 120 === 0) tr.push(`${Math.round(G.time)}s d${G.room + 1} ${st.state} x${st.d.x | 0} y${st.d.y | 0} L${st.rope.L | 0} air${(st.air * 100) | 0} rope:${st.plan.rope} tx${st.plan.tx} up${+st.plan.up} why:${st.plan.why} bag${st.d.bag.length} ch${+st.d.chest}`);
      }
      const st = G.mst;
      return { mode: G.mode, t: Math.round(G.time), room: G.room, x: Math.round(st.d.x), y: Math.round(st.d.y), stats: st.stats, all: st.allTreasure, msgs, tr,
        res: G.results[G.levelIndex] && G.results[G.levelIndex].stats };
    }, { f: sc.f, max: sc.max, seed, trace });
    const cleared = r.mode === 'clear' || r.mode === 'result';
    const ok = sc.want === 'any' || (sc.want === 'clear') === cleared;
    if (!ok) wrong++;
    console.log(`== ${name}: ${cleared ? 'CLEARED' : 'not finished (dive ' + (r.room + 1) + ' at x ' + r.x + ' y ' + r.y + ')'} in ${r.t}s  ${ok ? '[as wanted]' : '[WRONG: wanted ' + sc.want + ']'}`);
    const s = r.stats;
    console.log(`   dives ${s.roomT.map(x => x == null ? '-' : Math.round(x)).join(' / ')}  treasure ${s.banked}/${r.all} chests ${s.chests} eels ${s.eels} jellies ${s.jellies} blubs ${s.blubs} helps ${s.helps} pumps ${s.pumps}`);
    for (const m of r.msgs) console.log('   ' + m);
    for (const m of r.tr) console.log('   . ' + m);
    if (r.res) console.log('   medal: ' + r.res.find(x => x.label === 'Medal').value);
    if (errors.length) { console.log('   ERRORS: ' + errors.slice(0, 5).join(' | ')); wrong++; }
    await page.close();
  }
  await browser.close();
  process.exit(wrong ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
