// Probe for the 25-1 brain: run a JS snippet inside the game page (node tools/w25/zf-probe.js file.js)
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => console.log('[pageerror]', String(e)));
  // the same repeatable Math.random as tools/cpu-test.js (window.__seed(n); set window.__inStep while stepping)
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const code = fs.readFileSync(process.argv[2], 'utf8');
  const r = await page.evaluate(code);
  console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 1));
  await browser.close();
})();
