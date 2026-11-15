#!/usr/bin/env node
// 21-1 Hot Air Balloon Climb: scripted "people" that try to break it, with the computer as the partner. Each scenario
// changes one player's presses (CPU.filter) and reports how the level ended, the stats and the gold help given.
// Usage: node tools/w21/balloon-break.js [--seed=1] [--only=name]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const seed = +opt('seed', 1), only = opt('only', '');
// each: who is the "person" (0 Pip / 1 Bo), and a filter body run on that player's computer output
const SCEN = {
  // the burner never lets go (holds the burner all the time): sputters, but the level still clears
  holdBurn: { max: 600, f: `if (p.id === st.burner) { o.act = true; } return o;` },
  // the burner lets go for 9 s at about 1000 px up in every climb: Gus tows it back; 2 tows = gold burner
  dropper: { max: 600, f: `if (p.id === st.burner && st.b.h > 1000 && !S['d' + G.room]) { S.t = (S.t || 0) + dt; if (S.t < 16) return {}; S['d' + G.room] = 1; S.t = 0; } return o;` },
  // the burner lets go over the dock from up high (lands too fast): bounces, then a gold cushion
  dropLand: { max: 600, f: `if (p.id === st.burner && st.plan && st.plan.burn === 'land') return {}; return o;` },
  // the steerer drifts straight up for the first 25 s of each climb (bonks the first row): gold breeze after 3 bonks
  noSteer: { max: 600, f: `if (p.id !== st.burner && st.t < 25) return {}; return o;` },
  // the steerer only ever holds right: the stuck help turns each row gold (its breeze beats a held rope): clears
  holdRight: { max: 600, want: 'clear', f: `if (p.id !== st.burner) return { right: true }; return o;` },
  // a masher on both jobs: random presses every step
  masher: { max: 600, want: 'clear', f: `if (p.id === 0) return { left: Math.random() < 0.5, right: Math.random() < 0.5, jump: Math.random() < 0.5, act: Math.random() < 0.5, down: Math.random() < 0.2 }; return o;` },
  // --- (reviewer) more people, all with the computer as the partner; "want" says what should happen
  // nobody home: one player presses nothing at all (no idle-stop either): must NOT clear
  idlePip: { max: 600, want: 'stuck', f: `if (p.id === 0) return {}; return o;` },
  idleBo: { max: 600, want: 'stuck', f: `if (p.id === 1) return {}; return o;` },
  // Pip does the partner's job: burns when steering, steers (◀ ▶ toward the plan) when burning: must NOT clear
  wrongJob: { max: 600, want: 'stuck', f: `if (p.id !== 0) return o; const pl = st.plan || {}; if (p.id === st.burner) return { left: pl.tx < st.b.x - 20, right: pl.tx > st.b.x + 20 }; return { act: st.b.heat < 0.6 };` },
  // Pip steers backwards (away from where it should go) for 40 s each climb, then plays right: clears with gold help
  backwards: { max: 600, want: 'clear', f: `if (p.id !== 0 || p.id === st.burner || st.t > 40) return o; return { left: !!o.right, right: !!o.left };` },
  // Pip holds the action button the whole level (burns non-stop / holds steady non-stop): burner sputters, steerer never
  // steers; clears with gold help
  holdAct: { max: 600, want: 'clear', f: `if (p.id === 0) return { act: true }; return o;` },
  // Pip only ever taps the action (half a second on, half off): clears with gold help
  onlyAct: { max: 600, want: 'clear', f: `if (p.id === 0) return { act: (G.time % 1) < 0.5 }; return o;` },
  // Pip holds ◀ the whole level (as steerer: drags left; as burner: nothing): stuck when Pip burns
  holdLeftAll: { max: 400, want: 'stuck', f: `if (p.id === 0) return { left: true }; return o;` },
  // Pip holds ▶ only while steering, and plays the burner right: clears with gold help
  holdRightSteer: { max: 600, want: 'clear', f: `if (p.id === 0 && p.id !== st.burner) return { right: true }; return o;` },
  // a slow kid: does the computer's moves but 0.7 s late, and stops for 2 s every 9 s: clears
  slowKid: { max: 600, want: 'clear', f: `if (p.id !== 0) return o; S.q = S.q || []; S.q.push(o); if (S.q.length > 42) S.q.shift(); if ((G.time % 9) < 2) return {}; return S.q[0];` },
  // Bo is the masher this time (both jobs), Pip the computer: Bo burns in climb 2 and 4
  masherBo: { max: 600, want: 'clear', f: `if (p.id === 1) return { left: Math.random() < 0.5, right: Math.random() < 0.5, jump: Math.random() < 0.5, act: Math.random() < 0.5, down: Math.random() < 0.2 }; return o;` },
};
(async () => {
  const browser = await chromium.launch();
  for (const [name, sc] of Object.entries(SCEN)) {
    if (only && name !== only) continue;
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
    const r = await page.evaluate(({ f, max }) => {
      const P = window.__pipbo, G = P.G, S = {};
      G.manual = true; G.cpuOn = [true, true];
      const fn = new Function('p', 'o', 'dt', 'st', 'S', 'G', f);
      P.CPU.filter = (p, o, dt) => fn(p, o, dt, G.mst, S, G);
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Hot Air Balloon Climb'));
      const msgs = [];
      let n = 0, lastMsg = null;
      while (n < max / P.DT && G.mode === 'play') {
        P.step(P.DT); n++;
        const m = G.mst.msg;
        if (m && m.text !== lastMsg) { lastMsg = m.text; msgs.push(Math.round(G.time) + 's r' + G.room + ': ' + m.text); }
        if (!m) lastMsg = null;
      }
      const st = G.mst;
      return { mode: G.mode, t: Math.round(G.time), room: G.room, h: Math.round(st.b.h), x: Math.round(st.b.x), stats: st.stats, msgs, res: G.results[G.levelIndex] && G.results[G.levelIndex].stats };
    }, sc);
    const cleared = r.mode === 'clear' || r.mode === 'result';
    const verdict = !sc.want ? '' : (sc.want === 'clear') === cleared ? '  [as wanted]' : '  [WRONG: wanted ' + sc.want + ']';
    console.log(`== ${name}: ${cleared ? 'CLEARED' : 'not finished (room ' + (r.room + 1) + ' at x ' + r.x + ' h ' + r.h + ')'} in ${r.t}s${verdict}`);
    const s = r.stats;
    console.log(`   zaps ${s.zaps} birds ${s.birds} bonks ${s.bonks} tows ${s.tows} bounces ${s.bounces} sputters ${s.sputters} helps ${s.helps} stars ${s.stars}`);
    for (const m of r.msgs) console.log('   ' + m);
    if (r.res) console.log('   medal: ' + (r.res.find(x => x && x.label === 'Medal') || {}).value  /* the medal is now on the results' medal ladder (js/medals.js) */);
    if (errors.length) console.log('   ERRORS: ' + errors.join(' | '));
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
