#!/usr/bin/env node
// Title screen check: the full-screen title, its menu and the How to play screen, with the keyboard, a stubbed
// controller and touch, on a laptop and a phone held sideways. Screenshots go to build/title/.
// Usage: node tools/title/title.js
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..', '..'), out = path.join(root, 'build', 'title');
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
    const pad = { id: 'Test pad', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    window.__pad = pad;
    navigator.getGamepads = () => [pad];
  });
  await page.goto('file://' + path.join(root, 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.waitForTimeout(1200);
  return { page, errors };
}
const focused = page => page.evaluate(() => { const a = document.activeElement; return a ? (a.dataset.act || '') + (a.dataset.v ? ':' + a.dataset.v : '') : ''; });
const screen = page => page.evaluate(() => document.querySelector('.title-screen') ? 'title' : document.querySelector('.howto-card') ? 'howto'
  : document.querySelector('.worlds-card') ? 'worlds' : document.querySelector('.world-page') ? 'world' : 'other');
// what a title fits: nothing spills out of the title box, and the page never scrolls sideways
const layout = page => page.evaluate(() => {
  const ts = document.querySelector('.title-screen').getBoundingClientRect();
  const inside = [...document.querySelectorAll('.title-screen .logo, .title-screen .ts-menu, .title-screen .ts-foot')]
    .every(e => { const r = e.getBoundingClientRect(); return r.left >= ts.left - 1 && r.right <= ts.right + 1 && r.top >= ts.top - 1 && r.bottom <= ts.bottom + 1; });
  const menu = document.querySelector('.ts-menu').getBoundingClientRect(), logo = document.querySelector('.logo').getBoundingClientRect();
  const overlap = !(menu.left >= logo.right || menu.right <= logo.left || menu.top >= logo.bottom || menu.bottom <= logo.top);
  const art = document.querySelector('.ts-art');
  return { inside, overlap, hscroll: document.documentElement.scrollWidth > innerWidth + 1, artW: art.width, artH: art.height,
    artFill: Math.abs(art.width / art.height - art.clientWidth / art.clientHeight) < 0.05 };
});

(async () => {
  const browser = await chromium.launch();
  for (const [name, vp, touch] of [['laptop', { width: 1280, height: 800 }], ['laptop-small', { width: 1024, height: 640 }],
    ['phone-wide', { width: 844, height: 390 }, true], ['phone-tall', { width: 390, height: 844 }, true]]) {
    const { page, errors } = await open(browser, vp, { touch });
    for (const players of [2, 1]) {
      await page.evaluate(n => { const b = document.querySelector(`[data-act=cpucfg][data-k=players][data-v="${n}"]`); if (b) b.click(); }, players);
      await page.waitForTimeout(500);
      const l = await layout(page);
      check(l.inside && !l.overlap && !l.hscroll, `${name} ${players}P: logo, menu and footer fit, menu clear of the logo, no sideways scroll`);
      check(l.artFill, `${name} ${players}P: the backdrop fills the title (${l.artW}x${l.artH})`);
      await page.screenshot({ path: path.join(out, `${name}-${players}p.png`) });
    }
    await page.evaluate(() => document.querySelector('[data-act=cpucfg][data-k=players][data-v="2"]').click());
    check(!errors.length, `${name}: no errors ${errors.join(' | ')}`);
    await page.close();
  }

  /* ---- keyboard ---- */
  {
    const { page, errors } = await open(browser, { width: 1280, height: 800 });
    check(await focused(page) === 'worlds', 'Play has focus when the title opens');
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(100);
    check((await focused(page)).startsWith('cpucfg'), `down from Play reaches the Players buttons (${await focused(page)})`);
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(100);
    check(await focused(page) === 'howto', `down again reaches How to play (${await focused(page)})`);
    await page.keyboard.press('Enter'); await page.waitForTimeout(700);
    check(await screen(page) === 'howto', 'Enter on How to play opens it');
    await page.screenshot({ path: path.join(out, 'howto.png') });
    await page.keyboard.press('Escape'); await page.waitForTimeout(700);
    check(await screen(page) === 'title' && await focused(page) === 'howto', 'Esc goes back to the title, with How to play focused');
    await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp'); await page.waitForTimeout(100);
    check(await focused(page) === 'worlds', 'up twice is back on Play');
    await page.keyboard.press('Enter'); await page.waitForTimeout(700);
    check(await screen(page) === 'worlds', 'Enter on Play opens the world map');
    await page.keyboard.press('Escape'); await page.waitForTimeout(700);
    check(await screen(page) === 'title', 'Esc on the world map goes back to the title');
    check(!errors.length, 'keyboard: no errors ' + errors.join(' | '));
    await page.close();
  }

  /* ---- controller ---- */
  {
    const { page, errors } = await open(browser, { width: 1280, height: 800 }, { pad: true });
    const press = async b => { await page.evaluate(b => { window.__pad.buttons[b].pressed = true; window.__pad.buttons[b].value = 1; }, b); await page.waitForTimeout(160);
      await page.evaluate(b => { window.__pad.buttons[b].pressed = false; window.__pad.buttons[b].value = 0; }, b); await page.waitForTimeout(200); };
    await press(1); await page.waitForTimeout(900); // wake the pad (B does nothing on the title)
    check(await screen(page) === 'title', 'controller: still on the title after waking the pad');
    const prompt = await page.evaluate(() => { const e = document.querySelector('.ts-press .pad-only'); return e && getComputedStyle(e).display !== 'none'; });
    check(prompt, 'controller: the title says "Press A to start"');
    await press(13); await press(13); // d-pad down twice
    check(await focused(page) === 'howto', `controller: d-pad down twice reaches How to play (${await focused(page)})`);
    await press(0); await page.waitForTimeout(600);
    check(await screen(page) === 'howto', 'controller: A opens How to play');
    await press(1); await page.waitForTimeout(600);
    check(await screen(page) === 'title', 'controller: B goes back to the title');
    await press(12); await press(12);
    await press(0); await page.waitForTimeout(600);
    check(await screen(page) === 'worlds', 'controller: up to Play, A opens the world map');
    check(!errors.length, 'controller: no errors ' + errors.join(' | '));
    await page.close();
  }

  /* ---- touch ---- */
  {
    const { page, errors } = await open(browser, { width: 844, height: 390 }, { touch: true });
    await page.tap('[data-act=howto]'); await page.waitForTimeout(600);
    check(await screen(page) === 'howto', 'touch: tapping How to play opens it');
    await page.tap('[data-act=howto-back]'); await page.waitForTimeout(600);
    await page.tap('[data-act=cpucfg][data-k=players][data-v="1"]'); await page.waitForTimeout(300);
    check(await page.evaluate(() => window.__pipbo.CPU ? window.__pipbo.CPU.cfg.players : CPU.cfg.players) === 1, 'touch: tapping 1 player + computer turns on 1-player mode');
    await page.tap('[data-act=cpucfg][data-k=players][data-v="2"]'); await page.waitForTimeout(300);
    await page.tap('.play-btn'); await page.waitForTimeout(700);
    check(await screen(page) === 'worlds', 'touch: tapping Play opens the world map');
    check(!errors.length, 'touch: no errors ' + errors.join(' | '));
    await page.close();
  }
  await browser.close();
  console.log(bad ? `${bad} FAILED` : 'all ok');
  process.exit(bad ? 1 : 0);
})();
