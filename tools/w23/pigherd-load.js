#!/usr/bin/env node
// Runaway Pigs load check: the whole game loads with no console errors, the world map shows World 23, the World 23
// page shows the 23-2 card with its blurb and an animating preview, the card starts the level (intro card, then the
// first chase), and every level in the game still loads without errors.
// Usage: node tools/w23/pigherd-load.js   (screenshots to build/w23/pigherd-load-*.png)
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
  const tiles = await page.evaluate(() => [...document.querySelectorAll('.wtile')].map(b => ({ w: +b.dataset.w, name: b.querySelector('.wname').textContent })));
  const w23 = tiles.find(t => t.w === 22);
  check(!!w23, 'world map has World 23: ' + JSON.stringify(w23));
  await page.evaluate(() => { const b = document.querySelector('.wtile[data-w="22"]'); b && b.scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, 'pigherd-load-worlds.png') });
  await page.click('.wtile[data-w="22"]');
  await page.waitForTimeout(900);
  const cards = await page.evaluate(() => [...document.querySelectorAll('.lvl')].map(b => ({ code: b.querySelector('.lcode').textContent, name: b.querySelector('.lname').textContent, text: b.textContent })));
  const card = cards.find(c => c.code === '23-2');
  check(card && card.name === 'Runaway Pigs', '23-2 card: ' + JSON.stringify(card && { code: card.code, name: card.name }));
  check(card && /slippery pigs/.test(card.text), '23-2 card shows the blurb');
  const grab = () => page.evaluate(() => { const b = [...document.querySelectorAll('.lvl')].find(x => x.querySelector('.lcode').textContent === '23-2'); const c = b && b.querySelector('canvas'); return c ? c.toDataURL().slice(-200) : ''; });
  const a = await grab(); await page.waitForTimeout(900); const b = await grab();
  check(a && a !== b, '23-2 preview animates');
  await page.screenshot({ path: path.join(out, 'pigherd-load-world23.png') });
  // start it from its card
  await page.evaluate(() => { const b = [...document.querySelectorAll('.lvl')].find(x => x.querySelector('.lcode').textContent === '23-2'); b.click(); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(out, 'pigherd-load-intro.png') });
  await page.waitForTimeout(3000);
  const st = await page.evaluate(() => { const G = window.__pipbo.G; return { mode: G.mode, name: G.level && G.level.def.name, room: G.room, pigs: G.mst.pigs && G.mst.pigs.length }; });
  check(st.mode === 'play' && st.name === 'Runaway Pigs' && st.pigs === 4, 'the card starts chase 1: ' + JSON.stringify(st));
  await page.screenshot({ path: path.join(out, 'pigherd-load-play.png') });
  // every level still loads
  const all = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, badL = [];
    G.manual = true;
    for (let i = 0; i < P.LEVELS.length; i++) {
      try { P.loadLevel(i); G.introT = 0; for (let k = 0; k < 30; k++) P.step(P.DT); } catch (e) { badL.push(P.LEVELS[i].name + ': ' + e); }
    }
    return { n: P.LEVELS.length, badL };
  });
  check(all.badL.length === 0, 'all ' + all.n + ' levels load and step: ' + all.badL.join(' | '));
  check(errors.length === 0, 'no console errors ' + errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(bad ? bad + ' FAILED' : 'ALL LOAD CHECKS PASS');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
