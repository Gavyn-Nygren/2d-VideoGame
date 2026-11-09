#!/usr/bin/env node
// World 24 quick check: the page loads with no errors, World 24 is on the map with its 4 levels, each loads.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..', '..');
(async () => {
  const b = await chromium.launch(); const page = await b.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.join(root, 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const r = await page.evaluate(() => { const { LEVELS, loadLevel, G, step } = window.__pipbo; const out = [];
    LEVELS.forEach((l, i) => { if (l.world === 23) { loadLevel(i); G.manual = true; G.introT = 0; for (let k = 0; k < 240; k++) step(1 / 120); out.push(i + ' ' + l.name); } });
    return { w24: out, w23: WORLDS[23] && WORLDS[23].name, last: LEVELS[LEVELS.length - 1].name, n: LEVELS.length }; });
  console.log(JSON.stringify(r), errors.length ? 'ERRORS ' + errors.join(' | ') : 'no errors');
  await b.close(); process.exit(errors.length ? 1 : 0);
})();
