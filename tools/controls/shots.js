#!/usr/bin/env node
// Screenshots of the ready card and the top-bar legend on each kind of device (js/controls.js).
// Usage: node tools/controls/shots.js [out dir]     (needs Playwright; opens index.html from disk)
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..', '..'), out = path.resolve(process.argv[2] || path.join(root, 'build', 'controls-shots'));
fs.mkdirSync(out, { recursive: true });
// fake controllers: window.__pads = [{ id, mapping, buttons: [pressed...], axes }]
const PADS = `(() => { window.__pads = []; navigator.getGamepads = () => window.__pads.map((p, i) => p && ({ index: i, id: p.id, mapping: p.mapping === undefined ? 'standard' : p.mapping, connected: true,
  axes: p.axes || [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, b) => ({ pressed: !!(p.down || []).includes(b), value: (p.down || []).includes(b) ? 1 : 0 })) })); })();`;
const XBOX = 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)', PS = 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)';
(async () => {
  const browser = await chromium.launch();
  const open = async (opts = {}) => {
    const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 760 }, deviceScaleFactor: 1, hasTouch: !!opts.touch, isMobile: !!opts.touch });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('PAGE ERROR', e.message));
    page.on('console', m => { if (m.type() === 'error') console.log('console error', m.text()); });
    await page.addInitScript(PADS);
    await page.goto('file://' + path.join(root, 'index.html'));
    await page.waitForFunction(() => window.__pipbo && document.fonts.status === 'loaded');
    return page;
  };
  const level = (page, name) => page.evaluate(n => { const P = window.__pipbo; P.startLevel(P.LEVELS.findIndex(l => l.name === n)); }, name);
  const tap = async (page, k, btn, ms = 80) => { await page.evaluate(([k, b]) => { window.__pads[k].down = [b]; }, [k, btn]); await page.waitForTimeout(ms); await page.evaluate(k => { window.__pads[k].down = []; }, k); await page.waitForTimeout(ms); };
  const shot = (page, name) => page.screenshot({ path: path.join(out, name + '.png') });

  // 1. two keyboards
  let page = await open();
  await level(page, 'King of the Hill'); await page.waitForTimeout(500);
  await shot(page, '1-ready-keyboard');
  await page.keyboard.press('KeyW'); await page.waitForTimeout(150);
  await shot(page, '2-ready-pip-ready');
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(1100);
  await shot(page, '3-playing-keyboard');
  console.log('after ready: mode', await page.evaluate(() => window.__pipbo.G.mode));
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await shot(page, '4-pause-keyboard');
  await page.close();

  // 2. Xbox (Pip) + PlayStation (Bo)
  page = await open();
  await page.evaluate(([a, b]) => { window.__pads = [{ id: a }, { id: b }]; }, [XBOX, PS]);
  await page.waitForTimeout(200); await tap(page, 0, 3); await tap(page, 1, 3); await page.waitForTimeout(400);
  await level(page, 'Wind-Up Train Ride'); await page.waitForTimeout(500);
  await shot(page, '5-ready-xbox-playstation');
  await tap(page, 0, 0); await tap(page, 1, 0); await page.waitForTimeout(900);
  await shot(page, '6-playing-xbox-playstation');
  console.log('pads: mode', await page.evaluate(() => window.__pipbo.G.mode), await page.evaluate(() => [0, 1].map(k => window.__pipbo.playerDevice(k))));
  await page.close();

  // 3. keyboard (Pip) + Xbox (Bo plays the second... one pad plays Pip, so swap): mixed
  page = await open();
  await page.evaluate(a => { window.__pads = [{ id: a }]; }, PS);
  await page.waitForTimeout(200); await tap(page, 0, 3); await page.waitForTimeout(300);
  await level(page, 'Snowball Fight'); await page.waitForTimeout(500);
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(200);
  await shot(page, '7-ready-playstation-and-keyboard');
  await page.close();

  // 4. one player + computer, generic controller
  page = await open();
  await page.evaluate(() => { const P = window.__pipbo; P.cpuSetCfg('players', 1); window.__pads = [{ id: 'USB Gamepad (Vendor: 0079 Product: 0006)', mapping: '' }]; });
  await page.waitForTimeout(200); await tap(page, 0, 0); await page.waitForTimeout(300);
  await level(page, 'Tug of War'); await page.waitForTimeout(500);
  await shot(page, '8-ready-one-player-generic-pad');
  await page.close();

  // 5. phone, touch
  page = await open({ touch: true, viewport: { width: 844, height: 390 } });
  await level(page, 'King of the Hill'); await page.waitForTimeout(500);
  await shot(page, '9-ready-phone-touch');
  await page.tap('[data-act="ready"][data-p="0"]'); await page.waitForTimeout(450);
  await page.tap('[data-act="ready"][data-p="1"]'); await page.waitForTimeout(1000);
  await shot(page, '10-playing-phone-touch');
  console.log('touch: mode', await page.evaluate(() => window.__pipbo.G.mode));
  await page.close();
  await browser.close();
  console.log('shots in', out);
})();
