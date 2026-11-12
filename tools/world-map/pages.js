#!/usr/bin/env node
// World map paging check: 10 worlds a page (5 across, 2 down, a boss world in the bottom-right corner), ▶ and ◀ arrows, with the keyboard, a stubbed
// controller and touch, on a laptop, a phone held sideways and a phone held upright. Also adds pretend worlds to
// check paging works for any number of worlds. Usage: node tools/world-map/pages.js  (screenshots to build/world-map/)
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..', '..'), out = path.join(root, 'build', 'world-map');
fs.mkdirSync(out, { recursive: true });
let bad = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) bad++; };

async function open(browser, vp, opts = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: !!opts.touch, isMobile: !!opts.touch });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  if (opts.pad) await page.addInitScript(() => {
    // a fake standard controller whose buttons the test presses through window.__pad
    const pad = { id: 'Test pad', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    window.__pad = pad;
    navigator.getGamepads = () => [pad];
  });
  await page.goto('file://' + path.join(root, opts.file || 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.waitForTimeout(900);
  return { page, errors };
}
const state = page => page.evaluate(() => ({
  tiles: [...document.querySelectorAll('.wtile')].map(b => +b.dataset.w + 1),
  prev: !!document.querySelector('.pagearrow.prev'), next: !!document.querySelector('.pagearrow.next'),
  dots: (document.querySelector('.pagedots') || {}).textContent || '',
  focus: document.activeElement ? (document.activeElement.className + ' ' + (document.activeElement.dataset.w || '')).trim() : '',
  cols: (() => { const t = [...document.querySelectorAll('.wtile')].map(b => b.getBoundingClientRect().top); return t.filter(y => Math.abs(y - t[0]) < 8).length; })(),
  hscroll: document.documentElement.scrollWidth > window.innerWidth + 1,
}));
const P = 10; // worlds a page
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => a + k);

(async () => {
  const browser = await chromium.launch();
  const n = await (async () => { const { page } = await open(browser, { width: 1280, height: 800 }); const k = await page.evaluate(() => window.__pipbo.liveWorlds().length); await page.close(); return k; })();
  console.log(`     ${n} worlds in the game`);

  /* ---- keyboard, laptop ---- */
  {
    const { page, errors } = await open(browser, { width: 1280, height: 800 });
    await page.keyboard.press('Enter'); await page.waitForTimeout(700);
    let s = await state(page);
    check(s.tiles.length === Math.min(P, n) && s.tiles[0] === 1, `page 1 shows worlds ${s.tiles[0]}-${s.tiles[s.tiles.length - 1]} (${s.tiles.length} tiles)`);
    check(s.cols === 5, `5 tiles across (got ${s.cols})`);
    check(!s.prev && s.next === n > P, 'page 1: no back arrow, a next arrow');
    // 2 rows of 5, and the boss world (World 10) is the last tile, bottom right
    const rows = await page.evaluate(() => (() => { const t = [...document.querySelectorAll('.wtile')].map(b => b.getBoundingClientRect().top).sort((a, b) => a - b); return t.filter((y, k) => k === 0 || y - t[k - 1] > 8).length; })());
    check(rows === 2, `2 rows of tiles (got ${rows})`);
    const boss = await page.evaluate(() => { const t = [...document.querySelectorAll('.wtile')], last = t[t.length - 1];
      return { last: +last.dataset.w + 1, boss: last.classList.contains('boss'), others: t.slice(0, -1).filter(b => b.classList.contains('boss')).length }; });
    check(boss.last === 10 && boss.boss && boss.others === 0, `boss World ${boss.last} is the last tile of page 1 and the only boss there`);
    await page.screenshot({ path: path.join(out, 'laptop-page1.png') });
    // walk right along the top row to the arrow
    await page.evaluate(() => document.querySelector('.wtile[data-w="0"]').focus());
    for (let k = 0; k < 5; k++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(60); }
    s = await state(page);
    check(/pagearrow next/.test(s.focus), 'arrow keys reach the ▶ arrow from the top row: ' + s.focus);
    await page.keyboard.press('Enter'); await page.waitForTimeout(500);
    s = await state(page);
    check(s.tiles[0] === P + 1 && s.tiles.length === Math.min(P, n - P), `▶ shows page 2: worlds ${s.tiles.join(',')}`);
    check(s.prev, 'page 2 has a back arrow');
    check(/wtile 10$/.test(s.focus) || /pagearrow next/.test(s.focus), 'focus lands on the first world of the page (or stays on ▶): ' + s.focus);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(out, 'laptop-page2.png') });
    // back with ◀ by keyboard
    await page.evaluate(() => document.querySelector('.wtile').focus());
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(60);
    s = await state(page);
    check(/pagearrow prev/.test(s.focus), 'left from the first tile reaches ◀: ' + s.focus);
    await page.keyboard.press('Space'); await page.waitForTimeout(500);
    s = await state(page);
    check(s.tiles[0] === 1, 'Space on ◀ goes back to page 1');
    // opening a world on page 2 and coming back lands on page 2
    await page.evaluate(() => document.querySelector('.pagearrow.next').click()); await page.waitForTimeout(300);
    await page.click('.wtile[data-w="14"]'); await page.waitForTimeout(800);
    await page.keyboard.press('Escape'); await page.waitForTimeout(700);
    s = await state(page);
    check(s.tiles.includes(15) && /wtile 14$/.test(s.focus), 'Back from World 15 returns to page 2 with World 15 focused: ' + s.focus);
    // every page ends on its boss world (20, 30...) and has no other boss on it
    const bosses = await page.evaluate(() => { const ws = liveWorlds(), bad = [];
      for (let p = 0; p * 10 < ws.length; p++) { const on = ws.slice(p * 10, p * 10 + 10); on.forEach((w, k) => { if (isBossWorld(w) && k !== 9) bad.push(w + 1); }); }
      return bad; });
    check(bosses.length === 0, 'boss worlds always sit at the end of their page' + (bosses.length ? ': ' + bosses : ''));
    // World 10's page flips on to World 11 (other page) and back still work
    await page.evaluate(() => window.__pipbo.G && document.querySelector('.pagearrow.prev').click()); await page.waitForTimeout(300);
    await page.click('.wtile[data-w="9"]'); await page.waitForTimeout(800);
    await page.click('.flip[data-w="10"]'); await page.waitForTimeout(800);
    await page.keyboard.press('Escape'); await page.waitForTimeout(700);
    s = await state(page);
    check(s.tiles[0] === P + 1, 'World 10 page ▶ World 11, then Back: world map is on page 2');
    check(errors.length === 0, 'no errors: ' + errors.join(' | '));
    await page.close();
  }

  /* ---- controller ---- */
  {
    const { page, errors } = await open(browser, { width: 1280, height: 800 }, { pad: true });
    const press = async (b, ms = 120) => { await page.evaluate(b => { window.__pad.buttons[b].pressed = true; window.__pad.buttons[b].value = 1; }, b); await page.waitForTimeout(ms);
      await page.evaluate(b => { window.__pad.buttons[b].pressed = false; window.__pad.buttons[b].value = 0; }, b); await page.waitForTimeout(150); };
    await page.waitForTimeout(500);
    await press(9); await page.waitForTimeout(800); // Start = Play
    let s = await state(page);
    check(s.tiles[0] === 1, 'controller: Start opens the world map on page 1');
    await page.evaluate(() => document.querySelector('.wtile[data-w="4"]').focus());
    await press(15); // d-pad right
    s = await state(page);
    check(/pagearrow next/.test(s.focus), 'controller: d-pad right from World 5 reaches ▶: ' + s.focus);
    await press(0); await page.waitForTimeout(400); // A
    s = await state(page);
    check(s.tiles[0] === P + 1, 'controller: A on ▶ shows page 2');
    await page.evaluate(() => document.querySelector('.pagearrow.prev').focus());
    await press(0); await page.waitForTimeout(400);
    s = await state(page);
    check(s.tiles[0] === 1, 'controller: A on ◀ goes back to page 1');
    check(errors.length === 0, 'no errors: ' + errors.join(' | '));
    await page.close();
  }

  /* ---- touch, two phone sizes ---- */
  for (const vp of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
    const { page, errors } = await open(browser, vp, { touch: true });
    await page.tap('[data-act="worlds"]'); await page.waitForTimeout(700);
    let s = await state(page);
    check(s.tiles.length === Math.min(P, n) && !s.hscroll && (s.cols === 5 || s.cols === 2), `touch ${vp.width}x${vp.height}: page 1 has ${s.tiles.length} tiles, ${s.cols} across, no sideways scroll`);
    await page.screenshot({ path: path.join(out, `phone-${vp.width}x${vp.height}-page1.png`) });
    await page.locator('.pagearrow.next').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, `phone-${vp.width}x${vp.height}-arrow.png`) });
    await page.tap('.pagearrow.next'); await page.waitForTimeout(500);
    s = await state(page);
    check(s.tiles[0] === P + 1, `touch ${vp.width}x${vp.height}: tapping ▶ shows page 2`);
    await page.screenshot({ path: path.join(out, `phone-${vp.width}x${vp.height}-page2.png`) });
    await page.tap('.pagearrow.prev'); await page.waitForTimeout(500);
    s = await state(page);
    check(s.tiles[0] === 1, `touch ${vp.width}x${vp.height}: tapping ◀ goes back`);
    check(errors.length === 0, 'no errors: ' + errors.join(' | '));
    await page.close();
  }

  /* ---- any number of worlds: add pretend worlds up to 47 ---- */
  {
    const { page, errors } = await open(browser, { width: 1280, height: 800 });
    await page.evaluate(() => {
      const { WORLDS, LEVELS } = window.__pipbo;
      for (let w = WORLDS.length; w < 47; w++) { WORLDS[w] = Object.assign({}, WORLDS[0], { name: 'Pretend ' + (w + 1) }); LEVELS.push(Object.assign({}, LEVELS[0], { world: w, name: 'Pretend level ' + (w + 1) })); }
    });
    await page.keyboard.press('Enter'); await page.waitForTimeout(700);
    const pages = [];
    let s = await state(page); pages.push(s.tiles);
    while (s.next) { await page.click('.pagearrow.next'); await page.waitForTimeout(250); s = await state(page); pages.push(s.tiles); }
    const live = await page.evaluate(() => window.__pipbo.liveWorlds().map(w => w + 1));
    check(pages.length === Math.ceil(live.length / P) && pages.flat().join() === live.join(), `${live.length} worlds: ${pages.length} pages of ${pages.map(p => p.length).join(' + ')}, every world once, in order`);
    check(/Worlds 41 to 47/.test(s.dots), 'last page label: ' + s.dots);
    await page.screenshot({ path: path.join(out, 'laptop-47-worlds-page3.png') });
    check(errors.length === 0, 'no errors: ' + errors.join(' | '));
    await page.close();
  }

  /* ---- the bundled demo ---- */
  if (fs.existsSync(path.join(root, 'build', 'pip-and-bo.html'))) {
    const { page, errors } = await open(browser, { width: 1280, height: 800 }, { file: 'build/pip-and-bo.html' });
    await page.keyboard.press('Enter'); await page.waitForTimeout(700);
    await page.click('.pagearrow.next'); await page.waitForTimeout(300);
    const s = await state(page);
    check(s.tiles[0] === P + 1, 'bundled demo pages to worlds 11+');
    check(errors.length === 0, 'no errors: ' + errors.join(' | '));
    await page.close();
  }
  await browser.close();
  console.log(bad ? `${bad} FAILED` : 'all ok');
  process.exit(bad ? 1 : 0);
})();
