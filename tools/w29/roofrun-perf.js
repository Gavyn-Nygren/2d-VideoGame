#!/usr/bin/env node
// Draw cost of 29-1 Rooftop Moonlight Run next to a World 26 level, measured the same way (ms per frame):
//   node tools/w29/roofrun-perf.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  for (const [mode, t] of [['cannonball', 20], ['clowncar', 20], ['roofrun', 8], ['roofrun', 50], ['roofrun', 92], ['roofrun', 140]]) {
    const ms = await page.evaluate(({ mode, t }) => {
      const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === mode);
      G.manual = true; G.cpuOn = [true, true]; P.loadLevel(i);
      for (let n = 0; n < 120 * t; n++) P.step(P.DT);
      const c = document.getElementById('game').getContext('2d');
      const t0 = performance.now();
      for (let n = 0; n < 300; n++) { render(); c.getImageData(0, 0, 1, 1); }
      return (performance.now() - t0) / 300;
    }, { mode, t });
    console.log(mode, 't=' + t, ms.toFixed(2), 'ms');
  }
  await browser.close();
})();
