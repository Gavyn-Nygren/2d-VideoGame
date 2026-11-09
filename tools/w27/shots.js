#!/usr/bin/env node
// World 27 screenshots: plays a level with a computer pair and saves a picture at each time given.
// Usage: node tools/w27/shots.js <code> <t1,t2,...> [--size=960x540] [--solo]   (pictures in build/w27/)
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const code = args[0], times = (args[1] || '5').split(',').map(Number);
const size = ((args.find(a => a.startsWith('--size=')) || '--size=960x540').split('=')[1]).split('x').map(Number);
const solo = args.includes('--solo');
const out = path.resolve(__dirname, '..', '..', 'build', 'w27'); fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: size[0], height: size[1] } });
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(({ code, solo }) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex((l, k) => P.levelCode(k) === code);
    G.cpuOn = solo ? [false, true] : [true, true]; P.loadLevel(i); G.manual = true;
  }, { code, solo });
  let now = 0;
  for (const t of times) {
    await page.evaluate(n => { const P = window.__pipbo; for (let k = 0; k < n && P.G.mode === 'play'; k++) P.step(P.DT); }, Math.round((t - now) / (1 / 120)));
    now = t;
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(out, code + '-' + t + '.png') });
  }
  if (errors.length) console.log('ERRORS', errors.slice(0, 5).join('\n'));
  console.log('saved to', out);
  await browser.close();
})();
