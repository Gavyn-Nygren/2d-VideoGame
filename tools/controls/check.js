#!/usr/bin/env node
// Checks the ready card and device detection (js/controls.js) in headless Chromium:
//   every level opens on its ready card from the menus, starts only when every person is ready, and runs after it;
//   keyboard, controllers (Xbox, PlayStation, unknown), touch and 1-player mode each ready up their own way.
// Usage: node tools/controls/check.js      (needs Playwright; exit code 1 on a failure)
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..', '..');
const PADS = `(() => { window.__pads = []; navigator.getGamepads = () => window.__pads.map((p, i) => p && ({ index: i, id: p.id, mapping: p.mapping === undefined ? 'standard' : p.mapping, connected: true,
  axes: p.axes || [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, b) => ({ pressed: !!(p.down || []).includes(b), value: (p.down || []).includes(b) ? 1 : 0 })) })); })();`;
const XBOX = 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)', PS = 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)';
let fails = 0;
const ok = (cond, what) => { if (!cond) { fails++; console.log('FAIL  ' + what); } else console.log('ok    ' + what); };
(async () => {
  const browser = await chromium.launch();
  const open = async (opts = {}) => {
    const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 760 }, hasTouch: !!opts.touch, isMobile: !!opts.touch });
    const page = await ctx.newPage();
    page.errs = [];
    page.on('pageerror', e => page.errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') page.errs.push(m.text()); });
    await page.addInitScript(PADS);
    await page.goto('file://' + path.join(root, 'index.html'));
    await page.waitForFunction(() => window.__pipbo);
    return page;
  };
  const mode = page => page.evaluate(() => window.__pipbo.G.mode);
  const start = (page, name) => page.evaluate(n => { const P = window.__pipbo; P.startLevel(typeof n === 'number' ? n : P.LEVELS.findIndex(l => l.name === n)); }, name);
  const tap = async (page, k, btn, ms = 70) => { await page.evaluate(([k, b]) => { window.__pads[k].down = [b]; }, [k, btn]); await page.waitForTimeout(ms); await page.evaluate(k => { window.__pads[k].down = []; }, k); await page.waitForTimeout(ms); };
  const devs = page => page.evaluate(() => [0, 1].map(k => { const d = window.__pipbo.playerDevice(k); return d.kind + (d.family ? ':' + d.family : ''); }).join(' '));

  // --- keyboard, two players, through the real menus
  let page = await open();
  await page.keyboard.press('Enter'); await page.waitForTimeout(700);             // Play -> world map
  await page.keyboard.press('Enter'); await page.waitForTimeout(700);             // a world -> its page
  await page.keyboard.press('Enter'); await page.waitForTimeout(500);             // Play World -> the ready card
  ok(await mode(page) === 'ready', 'menus: picking a level opens its ready card');
  await page.waitForTimeout(400);
  await page.keyboard.press('KeyW'); await page.waitForTimeout(900);
  ok(await mode(page) === 'ready', 'keyboard: Pip alone does not start the level');
  ok(await page.evaluate(() => window.__pipbo.Ready.ok.join()) === 'true,false', 'keyboard: W readies Pip only');
  await page.keyboard.press('KeyF'); await page.keyboard.press('Space'); await page.waitForTimeout(700);
  ok(await mode(page) === 'ready', 'keyboard: more Pip keys do not ready Bo');
  await page.keyboard.down('Enter'); await page.waitForTimeout(900);
  ok(await mode(page) === 'play', 'keyboard: Bo\'s Enter starts the level');
  ok(await page.evaluate(() => { const P = window.__pipbo; return !P.G.players[1].pendingAct && !P.G.players[1].input.act; }), 'keyboard: the held Enter is not an action in the level');
  await page.keyboard.up('Enter');
  ok(await page.evaluate(() => window.__pipbo.G.players.every(p => p.y >= window.__pipbo.G.level.spawns[p.id].y - 1)), 'keyboard: nobody jumped from the ready press');
  // R restarts without the card; Esc on the card goes back to the world page
  await page.keyboard.press('KeyR'); await page.waitForTimeout(200);
  ok(await mode(page) === 'play', 'R restarts straight into the level');
  await start(page, 'Snowball Fight'); await page.waitForTimeout(450);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  ok(await mode(page) === 'title' && await page.evaluate(() => !!document.querySelector('.world-page')), 'Esc on the ready card goes back to the world page');
  ok(!page.errs.length, 'keyboard: no page errors ' + page.errs.join(' | '));
  await page.close();

  // --- Xbox + PlayStation
  page = await open();
  await page.evaluate(([a, b]) => { window.__pads = [{ id: a }, { id: b }]; }, [XBOX, PS]);
  await page.waitForTimeout(200); await tap(page, 0, 3); await tap(page, 1, 3); await page.waitForTimeout(350);
  ok(await devs(page) === 'pad:xbox pad:ps', 'controllers: Pip on Xbox, Bo on PlayStation (' + await devs(page) + ')');
  ok(await page.evaluate(() => window.__pipbo.btnLabel(0, 'jump') + window.__pipbo.btnLabel(1, 'jump') + window.__pipbo.btnLabel(1, 'act')) === 'A✕□', 'controllers: each player gets their own button names');
  await start(page, 'King of the Hill'); await page.waitForTimeout(450);
  await tap(page, 0, 0); await page.waitForTimeout(800);
  ok(await mode(page) === 'ready', 'controllers: one A press does not start the level');
  await tap(page, 0, 0); await tap(page, 0, 2); await page.waitForTimeout(700);
  ok(await mode(page) === 'ready', 'controllers: Pip\'s controller cannot ready Bo');
  await tap(page, 1, 0); await page.waitForTimeout(800);
  ok(await mode(page) === 'play', 'controllers: both ready starts the level');
  // a key press moves only that player to the keyboard
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(150);
  ok(await devs(page) === 'pad:xbox kb', 'mixed: Bo pressing a key shows Bo keys, Pip keeps the Xbox buttons (' + await devs(page) + ')');
  await page.click('#menuBtn'); await page.waitForTimeout(300);
  ok(await mode(page) === 'paused', 'mixed: the on-screen Menu button opens the pause menu');
  ok(await page.evaluate(() => { const l = document.querySelectorAll('#overlay .ctl-line'); return l.length === 2 && !!l[0].querySelector('.g-xbox-a') && l[1].textContent.includes('←'); }), 'mixed: the pause menu shows each player\'s own buttons');
  await page.click('#overlay [data-act="settings"]'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const b = document.querySelector('[data-k="sound"]'); b.click(); const off = window.__pipbo.Sfx.muted && b.textContent === 'Sound off'; b.click(); return off && !window.__pipbo.Sfx.muted; }), 'pause menu > Settings: the Sound button turns sound off and on');
  await page.click('#overlay [data-act="settings-back"]'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const s = document.getElementById('stage').getBoundingClientRect(); return s.width >= innerWidth - 1 || s.height >= innerHeight - 1; }), 'the game screen fills the window (' + JSON.stringify(await page.evaluate(() => { const s = document.getElementById('stage').getBoundingClientRect(); return [s.width, s.height, innerWidth, innerHeight]; })) + ')');
  await tap(page, 0, 9); await page.waitForTimeout(300);
  ok(await mode(page) === 'play', 'controllers: the Menu / Start button closes the pause menu');
  await tap(page, 0, 9); await page.waitForTimeout(300);
  ok(await mode(page) === 'paused', 'controllers: the Menu / Start button opens it');
  await start(page, 'Snowball Fight'); await page.waitForTimeout(450);
  await tap(page, 0, 1); await page.waitForTimeout(300);
  ok(await mode(page) === 'title', 'controllers: B on the ready card goes back');
  ok(!page.errs.length, 'controllers: no page errors ' + page.errs.join(' | '));
  await page.close();

  // --- an unknown controller, 1 player + computer
  page = await open();
  await page.evaluate(() => { window.__pipbo.cpuSetCfg('players', 1); window.__pads = [{ id: 'USB Gamepad (Vendor: 0079 Product: 0006)', mapping: '' }]; });
  await page.waitForTimeout(200); await tap(page, 0, 0); await page.waitForTimeout(350);
  ok((await devs(page)).startsWith('pad:generic'), 'unknown controller: buttons shown by number (' + await devs(page) + ')');
  await start(page, 'Tug of War'); await page.waitForTimeout(450);
  ok(await page.evaluate(() => document.querySelectorAll('.rdy-duo .pcard').length === 2 && !!document.querySelector('.rdy-duo .pcard.bo.is-ready')), '1 player: the computer is on the card, already ready');
  await tap(page, 0, 0); await page.waitForTimeout(800);
  ok(await mode(page) === 'play', '1 player: one ready press starts the level');
  // 1 player, keyboard: either set of keys readies the person
  await start(page, 'Tug of War'); await page.waitForTimeout(450);
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(800);
  ok(await mode(page) === 'play', '1 player: the arrow keys ready Pip too');
  ok(await page.evaluate(() => window.__pipbo.btnLabel(0, 'jump')) === '↑', '1 player: prompts follow the keys the person uses');
  ok(!page.errs.length, '1 player: no page errors ' + page.errs.join(' | '));
  await page.close();

  // --- touch (a phone)
  page = await open({ touch: true, viewport: { width: 844, height: 390 } });
  await start(page, 'King of the Hill'); await page.waitForTimeout(450);
  ok(await devs(page) === 'touch touch', 'touch: both players on touch buttons');
  ok(await page.evaluate(() => { const o = document.getElementById('overlay'); return o.scrollHeight <= o.clientHeight + 1; }), 'touch: the ready card fits a phone without scrolling');
  await page.tap('[data-act="ready"][data-p="1"]'); await page.waitForTimeout(700);
  ok(await mode(page) === 'ready', 'touch: Bo alone does not start the level');
  await page.tap('[data-act="ready"][data-p="0"]'); await page.waitForTimeout(800);
  ok(await mode(page) === 'play', 'touch: both taps start the level');
  ok(!page.errs.length, 'touch: no page errors ' + page.errs.join(' | '));
  await page.close();

  // --- every level: card up, text present, ready, then half a second of play without an error
  page = await open();
  const bad = await page.evaluate(async () => {
    const P = window.__pipbo, G = P.G, out = [];
    for (let i = 0; i < P.LEVELS.length; i++) {
      try {
        P.startLevel(i);
        if (G.mode !== 'ready') { out.push(P.LEVELS[i].name + ': no ready card'); continue; }
        const card = document.querySelector('.ready-card');
        if (!card || !card.querySelector('.lede').textContent.trim()) out.push(P.LEVELS[i].name + ': empty card');
        if (card.querySelectorAll('.rdy-duo .ctl-keys').length !== 2) out.push(P.LEVELS[i].name + ': controls missing');
        P.Ready.armAt = 0; P.readyPress(0); P.readyPress(1);
        G.clock += 1; P.pollInput(0);
        if (G.mode !== 'play') { out.push(P.LEVELS[i].name + ': did not start'); continue; }
        G.manual = true;
        for (let k = 0; k < 420 && G.mode === 'play'; k++) P.step(P.DT);
        G.manual = false;
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));   // (draw it once too)
      } catch (e) { G.manual = false; out.push(P.LEVELS[i].name + ': ' + e.message); }
    }
    return out;
  });
  ok(!bad.length, 'all levels: ready card, start and play ' + bad.join(' | '));
  ok(!page.errs.length, 'all levels: no page errors ' + page.errs.slice(0, 5).join(' | '));
  await page.close();
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'all passed');
  process.exit(fails ? 1 : 0);
})();
