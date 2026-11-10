#!/usr/bin/env node
// Shadow Sneak timing: node tools/w29/shadowsneak-perf.js  (ms per step and per drawn frame, in each stretch)
'use strict';
const path = require('path'); const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), page = await b.newPage({ viewport: { width: 1100, height: 640 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '../../index.html')); await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const out = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, M = P.MODES.shadowsneak, i = P.LEVELS.findIndex(l => l.mode === 'shadowsneak'), res = [];
    G.manual = true; G.cpuOn = [true, true]; P.loadLevel(i);
    const c = document.querySelector('canvas').getContext('2d');
    for (let r = 0; r < 4; r++) {
      if (r) { G.introT = 0; P.nextRoom(); }
      let t0 = performance.now(); for (let k = 0; k < 2400; k++) P.step(P.DT); const stepMs = (performance.now() - t0) / 2400;
      t0 = performance.now(); for (let k = 0; k < 200; k++) { M.draw(); M.drawTop(); M.hud(); } c.getImageData(0, 0, 1, 1); const drawMs = (performance.now() - t0) / 200;
      res.push('stretch ' + (r + 1) + ': step ' + stepMs.toFixed(3) + ' ms, draw+hud ' + drawMs.toFixed(2) + ' ms');
    }
    return res;
  });
  console.log(out.join('\n'), errs); await b.close();
})();
