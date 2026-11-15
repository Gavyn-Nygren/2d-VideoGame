#!/usr/bin/env node
// Frame draw time for the World 32 levels with a computer pair: node tools/w32/perf.js [codes] [--throttle=4] [--frames=600] [--w=1100 --h=640 --dsf=2]
// Steps the game by hand and times render() only (performance.now around it), with the CPU slowed down by --throttle
// (Chrome's devtools throttling, roughly a phone). Prints the median and the 95th percentile in ms per frame.
// --js='code' runs that code in the page first (e.g. to switch a piece of the drawing off and see what it costs).
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const codes = (args.find(a => !a.startsWith('--')) || '32-1,32-2,32-3,32-4').split(',');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +opt('w', 1100), height: +opt('h', 640) }, deviceScaleFactor: +opt('dsf', 2) });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(() => document.fonts.ready);
  if (opt('js', null)) await page.evaluate(opt('js', null));
  const cdp = await page.context().newCDPSession(page);
  for (const code of codes) {
    await page.evaluate(code => {
      const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex((l, k) => P.levelCode(k) === code);
      G.manual = true; G.cpuOn = [true, true]; P.loadLevel(i);
      for (let k = 0; k < 360 && G.mode === 'play'; k++) P.step(P.DT);
      for (let k = 0; k < 30; k++) render(P.DT);
    }, code);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: +opt('throttle', 4) });
    const r = await page.evaluate(n => {
      const P = window.__pipbo, G = P.G, ts = [];
      for (let k = 0; k < n; k++) { P.step(P.DT); if (k % 2) continue; const t0 = performance.now(); render(P.DT); ts.push(performance.now() - t0); }
      ts.sort((a, b) => a - b);
      return { mean: ts[Math.floor(ts.length * 0.5)], p95: ts[Math.floor(ts.length * 0.95)], mode: G.mode };
    }, +opt('frames', 600) * 2);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    console.log(code, 'median', r.mean.toFixed(2), 'ms  p95', r.p95.toFixed(2), 'ms', r.mode);
  }
  if (errs.length) console.log('errors:', errs.slice(0, 5));
  await browser.close();
})();
