#!/usr/bin/env node
// Extra checks for 29-1 Rooftop Moonlight Run: node tools/w29/roofrun-check.js
//   1 a thrower who never tugs: every gap must still be crossable on pumping alone (prints the time and whoops);
//   2 a swinger who mashes the action during the pull: slower, but still clears;
//   3 the cost of drawing a frame (ms, average of 300 frames at a busy moment).
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  for (const kind of ['notug', 'mash']) {
    const r = await page.evaluate(kind => {
      const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'roofrun');
      G.manual = true; G.cpuOn = [true, true];
      let flip = false;
      P.CPU.filter = (p, o) => {
        const st = G.mst; if (!st || !st.c) return o;
        const pl = P.MODES.roofrun.plan(st);
        if (kind === 'notug' && p.id === st.thr && pl.phase === 'swing') o.act = false;
        if (kind === 'mash' && p.id === st.swg && pl.phase === 'pull') { flip = !flip; o.act = st.clock * 10 % 1 < 0.5; }
        return o;
      };
      P.loadLevel(i);
      for (let n = 0; n < 120 * 600 && G.mode === 'play'; n++) P.step(P.DT);
      P.CPU.filter = null;
      return { mode: G.mode, time: Math.round(G.time), room: G.room, stats: G.mst.stats };
    }, kind);
    console.log(kind, JSON.stringify(r));
  }
  const ms = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'roofrun');
    G.manual = true; G.cpuOn = [true, true]; P.loadLevel(i);
    for (let n = 0; n < 120 * 92; n++) P.step(P.DT);
    const c = document.getElementById('game').getContext('2d');
    const t0 = performance.now();
    for (let n = 0; n < 300; n++) { render(); c.getImageData(0, 0, 1, 1); }
    return (performance.now() - t0) / 300;
  });
  console.log('draw ms per frame:', ms.toFixed(2));
  console.log('errors:', errs.slice(0, 5));
  await browser.close();
})();
