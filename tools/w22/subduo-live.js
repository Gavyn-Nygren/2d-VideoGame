#!/usr/bin/env node
// Submarine Duo live check: plays 22-1 in real time (requestAnimationFrame, not G.manual) for a few seconds with real
// key presses, opens World 22's page (the animated previews) and reports any console errors.
// Usage: node tools/w22/subduo-live.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(() => { const P = window.__pipbo; P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Submarine Duo')); });
  await page.waitForTimeout(3200);
  await page.keyboard.down('KeyD'); await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(1500);
  await page.keyboard.up('KeyD'); await page.keyboard.up('ArrowDown');
  await page.keyboard.press('Slash'); await page.keyboard.press('KeyF');
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => { const st = window.__pipbo.G.mst; return { x: Math.round(st.sub.x), clawOy: Math.round(st.claw.oy), toots: st.stats.toots, grabs: st.stats.grabs, mode: window.__pipbo.G.mode }; });
  console.log('live play:', JSON.stringify(r));
  await page.screenshot({ path: 'build/w22/subduo-live.png' });
  await page.evaluate(() => { const P = window.__pipbo; P.pause(); });
  await page.evaluate(() => { if (typeof showWorld === 'function') showWorld(21); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'build/w22/subduo-worldpage.png' });
  console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].join('\n') : 'no console errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
