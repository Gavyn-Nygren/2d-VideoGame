#!/usr/bin/env node
// Screenshots of a World 32 level played by a computer pair: node tools/w32/shots.js <code|name|mode> <t1,t2,...> [--solo] [--w=960 --h=540]
// Writes build/w32/<code>-<t>.png (simulated seconds after the level loads).
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2), code = args[0], times = (args[1] || '3,10').split(',').map(Number);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +opt('w', 1100), height: +opt('h', 640) } });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const out = path.resolve(__dirname, '../../build/w32'); fs.mkdirSync(out, { recursive: true });
  await page.evaluate(({ code, solo }) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex((l, k) => P.levelCode(k) === code || l.name === code || l.mode === code);
    G.manual = true; G.cpuOn = solo ? [false, true] : [true, true]; P.loadLevel(i);
  }, { code, solo: args.includes('--solo') });
  let t = 0;
  for (const tt of times) {
    await page.evaluate(n => { const P = window.__pipbo; for (let k = 0; k < n && P.G.mode === 'play'; k++) P.step(P.DT); }, Math.round((tt - t) * 120));
    t = tt;
    await page.waitForTimeout(80);
    await page.screenshot({ path: path.join(out, code.replace(/\W+/g, '_') + '-' + tt + '.png') });
  }
  console.log('errors:', errs.slice(0, 5));
  await browser.close();
})();
