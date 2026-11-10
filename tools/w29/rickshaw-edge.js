#!/usr/bin/env node
// Runaway Rickshaw edge cases: restart (R = loadLevel) and "next room" in the middle of every state (splash, restock,
// crash stop, swing, star in flight, gold help, the tea stop), pause, the level loaded twice in a row, another level and
// back, a big dt, and the per-room touch action words.   node tools/w29/rickshaw-edge.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 640 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const r = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, M = P.MODES.rickshaw, i = P.LEVELS.findIndex(l => l.mode === 'rickshaw');
    const out = [], bad = [];
    const steps = n => { for (let k = 0; k < n && G.mode === 'play'; k++) P.step(P.DT); };
    const fresh = (tag) => {
      const st = G.mst;
      const ok = st.rk && st.rk.x === 150 && st.stars.length === 0 && st.cargo === 5 && !st.gold.sword && !st.gold.wheels && st.state === 'go' && st.restock <= 0 && st.rk.dunk <= 0 && st.rk.stopT <= 0 && st.rd.swing <= 0 && st.rd.dizzy <= 0 && st.loose.length === 0;
      if (!ok) bad.push(tag + ': ' + JSON.stringify({ x: st.rk.x, stars: st.stars.length, cargo: st.cargo, gold: st.gold, state: st.state, restock: st.restock, dunk: st.rk.dunk }));
      return ok;
    };
    const labels = () => Array.from(document.querySelectorAll('[data-actlabel]')).map(e => e.textContent).join(',');
    G.manual = true; G.cpuOn = [true, true]; P.CPU.filter = null;
    // reach each state with a "rider and steerer who press nothing", then interrupt it
    const states = {
      dunk: st => st.rk.dunk > 0, restock: st => st.restock > 0, stop: st => st.rk.stopT > 0 && st.restock <= 0,
      star: st => st.stars.some(s => s.st === 'fly'), gold: st => st.gold.sword || st.gold.wheels, swing: st => st.rd.swing > 0, end: st => st.state === 'end',
      air: st => st.rk.air && st.rk.ramp, warn: st => st.c.throws.some(t => t.st === 'warn'),
    };
    for (const [name, test] of Object.entries(states)) for (const how of ['restart', 'next']) {
      const lazy = name === 'swing' || name === 'air' || name === 'end' ? null : (p, o) => ({});
      P.CPU.filter = lazy;
      P.loadLevel(i); G.introT = 0;
      let n = 0;
      while (G.mode === 'play' && !test(G.mst) && n < 120 * 300) { P.step(P.DT); n++; }
      if (!test(G.mst)) { out.push(name + ' not reached'); continue; }
      const room0 = G.room;
      if (how === 'restart') { P.loadLevel(i); fresh(name + '/restart'); if (G.room !== 0) bad.push(name + ' restart room ' + G.room); }
      else { P.nextRoom(); fresh(name + '/next'); if (G.room !== room0 + 1) bad.push(name + ' next room ' + G.room); }
      P.CPU.filter = null; G.introT = 0; steps(120 * 5);
      if (!isFinite(G.mst.rk.x) || G.mst.rk.x < 300) bad.push(name + '/' + how + ' did not roll on: ' + G.mst.rk.x);
      out.push(name + '/' + how + ' ok at t=' + G.time.toFixed(1) + ' room ' + (G.room + 1) + ' labels ' + labels());
    }
    // pause holds everything
    P.loadLevel(i); G.introT = 0; steps(120 * 8);
    const x0 = G.mst.rk.x; P.pause(); for (let k = 0; k < 240; k++) P.step(P.DT); const x1 = G.mst.rk.x; P.resume();
    out.push('pause: moved ' + (x1 - x0).toFixed(1) + ' px while paused, mode ' + G.mode);
    // loaded twice, another level in between
    P.loadLevel(i); P.loadLevel(i); fresh('twice');
    const other = P.LEVELS.findIndex(l => l.mode === 'stiltrace'); P.loadLevel(other); steps(120 * 3); P.loadLevel(i); fresh('after other level');
    // per-room action words (Pip, Bo) on the legend and touch buttons
    P.loadLevel(i); const w = [labels()]; for (let k = 0; k < 3; k++) { P.nextRoom(); w.push(labels()); }
    out.push('labels per room: ' + w.join(' | '));
    // a big step (a slow frame): no NaN
    P.loadLevel(i); G.introT = 0; for (let k = 0; k < 50; k++) P.step(0.05);
    out.push('big dt: x=' + G.mst.rk.x.toFixed(0) + ' v=' + G.mst.rk.v.toFixed(0) + ' camY=' + G.mst.cam.y.toFixed(0));
    if (!isFinite(G.mst.rk.x) || !isFinite(G.mst.cam.y)) bad.push('NaN after big dt');
    return { out, bad };
  });
  console.log(r.out.join('\n'));
  console.log('BAD:', r.bad);
  console.log('errors:', [...new Set(errs)].slice(0, 6));
  await browser.close();
})();
