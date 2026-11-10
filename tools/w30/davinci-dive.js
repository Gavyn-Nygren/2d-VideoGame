#!/usr/bin/env node
// 30-1 era 'davinci': the dive on the piazza with a steerer who does it wrong, to check that misses are counted and
// the gold help (gold claw -> bigger claw -> gold magnet) arrives and is announced.   node tools/w30/davinci-dive.js [scene ...] [--trace]
//   pair    the computer pair as it is (the reference)
//   level   the steerer never dives (flies level, high over the Thief)
//   low     the steerer holds down all the time (bumps on the piazza)
//   slow    the flapper stops flapping for 2 s every 5 s
// --trace prints the machine and the Thief every half second of the dive.
// Each scene prints the time the dive took, the misses and the help lines; it fails when the plans are not won.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  const scenes = {
    pair: 'return out;',
    level: 'if (p.id !== ph.flap) return {}; return out;',
    low: 'if (p.id !== ph.flap) return { down: true }; return out;',
    slow: 'if (p.id === ph.flap && st.phT % 5 < 2) return {}; return out;',
  };
  let bad = 0;
  const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
  for (const name of Object.keys(scenes)) {
    if (only.length && !only.includes(name)) continue;
    const r = await page.evaluate(({ src, max, trace }) => {
      const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
      G.manual = true; G.cpuOn = [true, true]; P.CPU.filter = null; TT.jump('davinci', { seed: 3, intro: false });
      const st = G.mst, ph = st.ph, f = new Function('p', 'out', 'st', 'ph', 'G', src);
      let n = 0;
      while (n++ < 200 * 120 && !(ph.chase && ph.chase.phase === 'dive') && !st.cut) P.step(P.DT);
      const t0 = st.phT, t1 = [];
      P.CPU.filter = (p, out) => f(p, out, st, ph, G);
      let miss = 0, k = 0; const tr = [];
      while (st.phT - t0 < max && !st.cut && G.mode === 'play') { P.step(P.DT); if (trace && k++ % (trace === 2 ? 6 : 60) === 0 && tr.length < 90) { const cl = tthVinciClaw(st), g = ph.g; tr.push(`${(st.phT - t0).toFixed(1)} gap ${Math.round(st.thief.x - g.x)} dx ${Math.round(cl.x - g.x - 22)} y ${Math.round(g.y)} claw ${Math.round(cl.y)} v ${Math.round(g.v)} tv ${Math.round(ph.chase.vx)} land ${+g.landed} lift ${g.liftT.toFixed(1)} zip ${ph.chase.zip} lead ${ph.chase.lead}`); } if (ph.chase.miss > miss) { miss = ph.chase.miss; t1.push(+(st.phT - t0).toFixed(1)); } }
      P.CPU.filter = null;
      return { won: !!st.cut, took: +(st.phT - t0).toFixed(1), miss: ph.chase.miss, missAt: t1, help: st.stats.help.slice(), bumps: st.stats.team, tr };
    }, { src: scenes[name], max: 120, trace: process.argv.includes("--fine") ? 2 : process.argv.includes("--trace") });
    const ok = r.won, tr = r.tr; delete r.tr;
    if (tr.length) console.log(tr.join('\n'));
    if (!ok) bad++;
    console.log((ok ? 'ok   ' : 'FAIL ') + name.padEnd(6) + JSON.stringify(r));
  }
  if (errs.length) { console.log('PAGE ERRORS:\n' + errs.join('\n')); bad++; }
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
