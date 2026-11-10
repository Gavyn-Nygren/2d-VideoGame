#!/usr/bin/env node
// Regression check outside World 30: the page (index.html, or the single-file bundle with --bundle) boots with no
// console errors, World 30 is the last world with 1 level, levelCode gives 30-1, the world map pages 20 a page and
// shows World 30 on page 2 marked Boss, the World-done and final cards work past the gap at World 29.
//   node tools/w30/int-reg-boot.js [--bundle]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..');
(async () => {
  const bundle = process.argv.includes('--bundle');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + String(e)));
  await page.goto('file://' + path.join(ROOT, bundle ? 'build/pip-and-bo.html' : 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.waitForTimeout(600);
  const info = await page.evaluate(() => {
    const P = window.__pipbo, n = P.LEVELS.length, ws = P.liveWorlds();
    return { levels: n, lastCode: P.levelCode(n - 1), lastName: P.LEVELS[n - 1].name, lastWorld: P.LEVELS[n - 1].world, liveWorlds: ws.length, lastLive: ws[ws.length - 1],
      w30levels: P.worldLevels(29).length, worldsLen: P.WORLDS.length, holes: P.WORLDS.map((w, i) => w ? null : i).filter(x => x != null), hole28: P.WORLDS[28] === undefined,
      sorted: P.LEVELS.every((l, i) => i === 0 || l.world >= P.LEVELS[i - 1].world), codes: P.LEVELS.map((l, i) => P.levelCode(i)).slice(-6),
      dupCodes: (() => { const c = P.LEVELS.map((l, i) => P.levelCode(i)); return c.filter((x, i) => c.indexOf(x) !== i); })(),
      dupNames: (() => { const c = P.LEVELS.map(l => l.name); return c.filter((x, i) => c.indexOf(x) !== i); })() };
  });
  console.log(JSON.stringify(info));
  await page.click('[data-act="worlds"]'); await page.waitForTimeout(500);
  const p1 = await page.evaluate(() => ({ tiles: [...document.querySelectorAll('.wtile')].map(b => +b.dataset.w), dots: (document.querySelector('.pagedots') || {}).textContent }));
  console.log('page 1:', p1.tiles.length, 'tiles', p1.tiles[0] + 1, '..', p1.tiles[p1.tiles.length - 1] + 1, '|', p1.dots);
  await page.click('[data-act="wpage"].next'); await page.waitForTimeout(500);
  const p2 = await page.evaluate(() => ({ tiles: [...document.querySelectorAll('.wtile')].map(b => ({ w: +b.dataset.w, boss: !!b.querySelector('.bossb'), cls: b.className, label: b.getAttribute('aria-label'), meta: b.querySelector('.wmeta').textContent })), dots: (document.querySelector('.pagedots') || {}).textContent, next: !!document.querySelector('[data-act="wpage"].next') }));
  console.log('page 2:', p2.tiles.map(t => (t.w + 1) + (t.boss ? 'B' : '')).join(' '), '|', p2.dots, '| next arrow:', p2.next);
  console.log('last tile:', JSON.stringify(p2.tiles[p2.tiles.length - 1]));
  await page.screenshot({ path: path.join(ROOT, 'build/w30/int/reg-map-p2' + (bundle ? '-bundle' : '') + '.png') });
  await page.click('[data-act="openworld"][data-w="29"]'); await page.waitForTimeout(600);
  const wp = await page.evaluate(() => ({ h2: document.querySelector('.world-page h2').textContent, eyebrow: document.querySelector('.world-page .eyebrow').textContent, lv: [...document.querySelectorAll('.lvl')].map(b => b.getAttribute('aria-label')), flips: [...document.querySelectorAll('.flips > *')].map(b => b.textContent.trim()) }));
  console.log('world page:', JSON.stringify(wp));
  await page.screenshot({ path: path.join(ROOT, 'build/w30/int/reg-world30' + (bundle ? '-bundle' : '') + '.png') });
  // play it for a moment (real loop), then clear it by the test hook and walk the cards
  await page.click('[data-act="level"]'); await page.waitForFunction(() => window.__pipbo.G.mode === 'play'); await page.waitForTimeout(1500);
  const cards = await page.evaluate(async () => {
    const P = window.__pipbo, G = P.G, out = {};
    P.levelClear(); P.showResult();
    out.result = { eyebrow: document.querySelector('#overlay .eyebrow').textContent, btns: [...document.querySelectorAll('#overlay button')].map(b => b.textContent.trim()) };
    document.querySelector('#overlay [data-act="next"]').click();
    await new Promise(r => setTimeout(r, 300));
    out.worldDone = { h2: document.querySelector('#overlay h2').textContent, btns: [...document.querySelectorAll('#overlay button')].map(b => b.textContent.trim()) };
    const f = document.querySelector('#overlay [data-act="final"]'); if (f) f.click();
    await new Promise(r => setTimeout(r, 300));
    out.final = { h2: (document.querySelector('#overlay h2') || {}).textContent, lede: [...document.querySelectorAll('#overlay .lede')].map(p => p.textContent).slice(0, 3), mode: G.mode };
    return out;
  });
  console.log('cards:', JSON.stringify(cards));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors or warnings');
  await browser.close();
})();
