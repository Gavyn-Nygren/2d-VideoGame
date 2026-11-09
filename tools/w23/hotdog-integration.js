#!/usr/bin/env node
// Hot Dog Stand Rush integration check: index.html loads with no errors, the world map shows World 23, its page has
// the 23-3 Hot Dog Stand Rush card with a preview that animates, and every level in the game still loads with no errors.
// Usage: node tools/w23/hotdog-integration.js   (screenshots to build/w23/hotdog-integration-*.png)
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..', '..'), out = path.join(root, 'build', 'w23');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  let bad = 0;
  const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) bad++; };
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.join(root, 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.waitForTimeout(900);
  await page.click('[data-act="worlds"]');
  await page.waitForTimeout(600);
  const tiles = await page.evaluate(() => [...document.querySelectorAll('.wtile')].map(b => ({ w: +b.dataset.w, name: b.querySelector('.wname').textContent, meta: b.querySelector('.wmeta').textContent })));
  const w23 = tiles.find(t => t.w === 22);
  check(!!w23, 'world map has World 23: ' + JSON.stringify(w23));
  await page.evaluate(() => { const b = document.querySelector('.wtile[data-w="22"]'); b && b.scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, 'hotdog-integration-worlds.png') });
  await page.click('.wtile[data-w="22"]');
  await page.waitForTimeout(900);
  const info = await page.evaluate(() => ({ eyebrow: (document.querySelector('.home-title .eyebrow') || {}).textContent,
    cards: [...document.querySelectorAll('.lvl')].map(b => b.querySelector('.lcode').textContent + ' ' + b.querySelector('.lname').textContent) }));
  console.log('     ' + JSON.stringify(info));
  const k = info.cards.findIndex(c => c === '23-3 Hot Dog Stand Rush');
  check(k >= 0, 'World 23 page has the 23-3 Hot Dog Stand Rush card');
  const grab = () => page.evaluate(k => { const c = document.querySelectorAll('.lvl canvas')[k]; return c ? c.toDataURL() : ''; }, k);
  const a = await grab(); await page.waitForTimeout(900); const b = await grab();
  check(a.length > 2000 && a !== b, 'the 23-3 preview draws and animates');
  await page.screenshot({ path: path.join(out, 'hotdog-integration-world23.png') });
  const all = await page.evaluate(async () => {
    const P = window.__pipbo, G = P.G, fails = [];
    G.manual = true;
    for (let i = 0; i < P.LEVELS.length; i++) {
      try { P.loadLevel(i); G.introT = 0; for (let j = 0; j < 60; j++) P.step(P.DT); } catch (e) { fails.push(i + ' ' + P.LEVELS[i].name + ': ' + e); }
    }
    return { n: P.LEVELS.length, fails };
  });
  check(all.fails.length === 0, `all ${all.n} levels load and step ` + all.fails.slice(0, 3).join(' | '));
  check(errors.length === 0, 'no page errors ' + errors.slice(0, 3).join(' | '));
  console.log(bad ? bad + ' FAILED' : 'all passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
