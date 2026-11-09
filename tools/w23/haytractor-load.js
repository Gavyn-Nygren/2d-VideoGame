#!/usr/bin/env node
// Loads the whole game, opens the world map and World 23's page, and checks for console errors; saves
// build/w23/haytractor-worldmap.png and build/w23/haytractor-world23.png (deviceScaleFactor 1).
// Usage: node tools/w23/haytractor-load.js
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  fs.mkdirSync('build/w23', { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.waitForTimeout(800);
  const w = await page.evaluate(() => { const i = LEVELS.findIndex(l => l.name === 'Tractor & Trailer'); return { i, world: LEVELS[i].world, code: levelCode(i), live: liveWorlds().includes(LEVELS[i].world) }; });
  console.log('23-1:', JSON.stringify(w));
  await page.evaluate(() => showWorlds(22));
  await page.waitForTimeout(900);
  const tile = await page.evaluate(() => { const b = [...document.querySelectorAll('[data-act="openworld"]')].find(x => /World 23/.test(x.getAttribute('aria-label') || '')); if (b) b.scrollIntoView({ block: 'center' }); return b ? b.getAttribute('aria-label') : null; });
  console.log('world map tile:', tile);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'build/w23/haytractor-worldmap.png' });
  await page.evaluate(w => showWorld(w), w.world);
  await page.waitForTimeout(1500);
  const card = await page.evaluate(i => { const b = document.querySelector(`[data-act="level"][data-i="${i}"]`); return b ? b.getAttribute('aria-label') : null; }, w.i);
  console.log('level card:', card);
  await page.screenshot({ path: 'build/w23/haytractor-world23.png' });
  console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].join('\n') : 'no console errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
