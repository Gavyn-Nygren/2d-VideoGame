#!/usr/bin/env node
// 24-2 Jack-in-the-Box Launch: the computer plays both seats; each scenario changes one player's presses (CPU.filter)
// to act like a kind of person (perfect, slow, idle, alone, a masher, wrong job...) and reports how the level ended, the
// time per shelf, the stats, the medal and the gold help given. "want" says what should happen.
// Usage: node tools/w24/jackbox-break.js [--seed=1] [--only=name,name] [--trace=1]
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
  // a slow kid on each side in turn: does the computer's moves 0.35 s late and stops for 2 s every 9 s
  slowPip: { max: 700, want: 'clear', f: `if (p.id !== 0) return o; S.q = S.q || []; S.q.push(o); if (S.q.length > 42) S.q.shift(); if ((G.time % 9) < 2) return {}; return S.q[0];` },
  slowBo: { max: 700, want: 'clear', f: `if (p.id !== 1) return o; S.q = S.q || []; S.q.push(o); if (S.q.length > 42) S.q.shift(); if ((G.time % 9) < 2) return {}; return S.q[0];` },
  // a distracted person: does the right thing, but every 6 s wanders for 1.5 s with random presses
  noisyPip: { max: 700, want: 'clear', f: `if (p.id !== 0) return o; if ((G.time % 6) < 1.5) { const r = () => ${RND}; return { left: r() < 0.3, right: r() < 0.3, jump: r() < 0.2, down: r() < 0.3, act: r() < 0.2 }; } return o;` },
  noisyBo: { max: 700, want: 'clear', f: `if (p.id !== 1) return o; if ((G.time % 6) < 1.5) { const r = () => ${RND}; return { left: r() < 0.3, right: r() < 0.3, jump: r() < 0.2, down: r() < 0.3, act: r() < 0.2 }; } return o;` },
  // a cranker with no rhythm: presses at random moments (about 3 a second), never aims
  offbeatPip: { max: 800, want: 'clear', f: `if (p.id !== 0 || p.id !== st.cranker) return o; const q = Object.assign({}, o); q.left = q.right = false; q.act = (${RND}) < 0.025; if (st.phase === 'hook') q.act = o.act; return q;` },
  // a jumper who never steers or hops (the cranker's aim still counts): gold help gets them there
  noSteerBo: { max: 900, want: 'clear', f: `if (p.id !== 1 || p.id !== st.jumper || st.phase !== 'fly') return o; return {};` },
  // nobody home: one player presses nothing at all (and no idle stop for the computer): must NOT clear
  idlePip: { max: 400, want: 'stuck', f: `if (p.id === 0) return {}; return o;` },
  idleBo: { max: 400, want: 'stuck', f: `if (p.id === 1) return {}; return o;` },
  // a masher on everything (random presses every step), the computer partner: should still get through (gold help)
  masherPip: { max: 900, want: 'clear', f: `if (p.id === 0) { const r = () => ${RND}; return { left: r() < 0.5, right: r() < 0.5, jump: r() < 0.5, act: r() < 0.5, down: r() < 0.5 }; } return o;` },
  masherBo: { max: 900, want: 'clear', f: `if (p.id === 1) { const r = () => ${RND}; return { left: r() < 0.5, right: r() < 0.5, jump: r() < 0.5, act: r() < 0.5, down: r() < 0.5 }; } return o;` },
  // two mashers: nobody plays properly; must not finish quickly (it may never finish)
  masherBoth: { max: 400, want: 'any', f: `const r = () => ${RND}; return { left: r() < 0.5, right: r() < 0.5, jump: r() < 0.5, act: r() < 0.5, down: r() < 0.5 };` },
  // Pip only ever holds the action: one press, never again
  holdAct: { max: 400, want: 'stuck', f: `if (p.id === 0) return { act: true }; return o;` },
  // Pip does the other job's buttons: steers and hops while cranking, cranks (action) while jumping: must not clear
  wrongJob: { max: 500, want: 'stuck', f: `if (p.id !== 0) return o; if (p.id === st.cranker) return { left: (G.time % 2) < 1, right: (G.time % 2) >= 1, jump: (G.time % 0.6) < 0.3 }; return { down: true, left: (G.time % 3) < 1 };` },
  // Pip as the jumper never hauls (but drops the yo-yo): stuck at the first haul
  noHaul: { max: 400, want: 'stuck', f: `if (p.id === 0 && p.id === st.jumper && st.phase === 'haul') return {}; return o;` },
  // Bo as the cranker never hooks the yo-yo: stuck at the first hook
  noHook: { max: 400, want: 'stuck', f: `if (p.id === 1 && p.id === st.cranker && st.phase === 'hook') return {}; return o;` },
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
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Jack-in-the-Box Launch'));
      const msgs = [], tr = [];
      let n = 0, lastMsg = null, lastPh = null;
      while (n < max / P.DT && (G.mode === 'play')) {
        P.step(P.DT); n++;
        const st = G.mst, m = st.msg;
        if (m && m.text !== lastMsg) { lastMsg = m.text; msgs.push(Math.round(n * P.DT) + 's s' + (G.room + 1) + ': ' + m.text); }
        if (!m) lastMsg = null;
        if (trace && st.phase !== lastPh) { lastPh = st.phase; tr.push(`${(n * P.DT).toFixed(1)}s s${G.room + 1}L${st.li} ${st.phase} pow${(st.lastPower || 0).toFixed(2)} tilt${st.box.tilt}/${st.plan.tilt} j${st.j.x | 0},${st.j.y | 0}`); }
      }
      const st = G.mst;
      return { mode: G.mode, steps: n, t: Math.round(G.time), room: G.room, li: st.li, phase: st.phase, stats: st.stats, all: st.allStars, msgs, tr,
        res: G.results[G.levelIndex] && G.results[G.levelIndex].stats };
    }, { f: sc.f, max: sc.max, seed, trace });
    const cleared = r.mode === 'clear' || r.mode === 'result';
    const ok = sc.want === 'any' || (sc.want === 'clear') === cleared;
    if (!ok) wrong++;
    const s = r.stats;
    console.log(`${ok ? 'ok  ' : 'BAD '} ${name.padEnd(11)} ${cleared ? 'CLEAR' : 'stuck'} t=${r.t}s (steps ${(r.steps / 120).toFixed(0)}s) shelf ${r.room + 1} launch ${r.li} ${r.phase}` +
      ` stars ${s.stars}/${r.all} boings ${s.boings} bumps ${s.bumps} best ${s.best}cm helps ${s.helps} perfect ${s.notes[0][2] + s.notes[1][2]}/${s.notes.flat().reduce((a, b) => a + b, 0)}` +
      ` shelves ${s.roomT.map(x => x == null ? '-' : Math.round(x)).join(',')}` + (r.res ? ' medal ' + (r.res.find(x => x.label === 'Medal') || {}).value : ''));
    if (r.msgs.length) console.log('      ' + r.msgs.join(' | '));
    if (trace) console.log(r.tr.join('\n'));
    if (errors.length) { console.log('      ERRORS: ' + errors.slice(0, 5).join(' | ')); wrong++; }
    await page.close();
  }
  await browser.close();
  console.log(wrong ? wrong + ' scenario(s) wrong' : 'all scenarios as wanted');
  process.exit(wrong ? 1 : 0);
})();
