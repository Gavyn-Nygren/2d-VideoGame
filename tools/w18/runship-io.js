#!/usr/bin/env node
// Runaway Ship input and housekeeping checks through the real input path (pollInput): keyboard, a stubbed controller,
// touch buttons at phone size, the per-role action labels, no label leak into another level, restart (R) and pause.
// Usage: node tools/w18/runship-io.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
let fails = 0;
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch();
  const url = 'file://' + path.resolve(__dirname, '..', '..', 'index.html');
  const errors = [];
  /* ---------- keyboard + controller, desktop ---------- */
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(() => {
      const mk = i => ({ id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', index: i, connected: true, mapping: 'standard', timestamp: 0,
        buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] });
      window.__pads = [];
      window.__addPad = () => { window.__pads.push(mk(window.__pads.length)); };
      navigator.getGamepads = () => window.__pads;
    });
    await page.goto(url);
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
    const run = (fn, arg) => page.evaluate(fn, arg);
    const steps = n => run(n => { const P = window.__pipbo; for (let k = 0; k < n; k++) { P.pollInput(P.DT); P.step(P.DT); } }, n);
    await run(() => {
      const P = window.__pipbo, G = P.G;
      G.manual = true; G.cpuOn = [false, false];
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Runaway Ship')); G.introT = 0;
    });
    const labels = () => run(() => [...document.querySelectorAll('[data-actlabel]')].map(e => e.textContent).join('|'));
    check((await labels()) === 'bell|fix|bell/fix|bell|fix', 'stretch 1 labels: legend Pip bell, Bo fix, pad bell/fix, touch bell / fix: ' + await labels());
    // Pip steers with S then W, rings with F
    await page.keyboard.down('KeyS'); await steps(3); await page.keyboard.up('KeyS'); await steps(80);
    check(await run(() => window.__pipbo.G.mst.ship.lane) === 2, 'S steers Pip\'s ship down a lane');
    await page.keyboard.down('KeyW'); await steps(3); await page.keyboard.up('KeyW'); await steps(80);
    check(await run(() => window.__pipbo.G.mst.ship.lane) === 1, 'W steers back up');
    await page.keyboard.down('KeyF'); await steps(2); await page.keyboard.up('KeyF');
    check(await run(() => window.__pipbo.G.mst.ship.bellT > 0), 'F rings the bell');
    await page.keyboard.down('KeyA'); await steps(5);
    check(await run(() => window.__pipbo.G.mst.ship.ease), 'A eases off'); await page.keyboard.up('KeyA');
    // Bo runs with the arrows, climbs with ↑ at the mast
    const bx0 = await run(() => window.__pipbo.G.mst.body[1].x);
    await page.keyboard.down('ArrowLeft'); await steps(30); await page.keyboard.up('ArrowLeft'); await steps(30);
    const bx1 = await run(() => window.__pipbo.G.mst.body[1].x);
    check(bx1 < bx0 - 30, 'Bo runs left with ← (' + Math.round(bx0) + ' -> ' + Math.round(bx1) + ')');
    await run(() => { const b = window.__pipbo.G.mst.body[1]; b.x = 300; b.vx = 0; });
    await page.keyboard.down('ArrowUp'); await steps(40); await page.keyboard.up('ArrowUp');
    check(await run(() => ['climb', 'nest'].includes(window.__pipbo.G.mst.body[1].mode)), '↑ at the mast climbs the rope ladder');
    await page.keyboard.down('ArrowDown'); await steps(200); await page.keyboard.up('ArrowDown'); await steps(10);
    check(await run(() => window.__pipbo.G.mst.body[1].mode === 'walk'), '↓ climbs back down to the deck');
    // a leak: Bo stands on it and holds /
    await run(() => { const st = window.__pipbo.G.mst; st.leaks = [{ slot: 3, t: 0, fix: 0 }]; const b = st.body[1]; b.x = 360; b.vx = 0; });
    await page.keyboard.down('Slash'); await steps(130); await page.keyboard.up('Slash');
    check(await run(() => window.__pipbo.G.mst.leaks.length === 0), 'holding / on a leak patches it');
    // the controller: Pip's stick down steers, X rings
    await run(() => window.__addPad()); await steps(5);
    await run(() => { window.__pads[0].axes[1] = 1; }); await steps(3); await run(() => { window.__pads[0].axes[1] = 0; }); await steps(80);
    check(await run(() => window.__pipbo.G.mst.ship.lane) === 2, 'controller stick ▼ steers down');
    await run(() => { window.__pads[0].buttons[0].pressed = true; }); await steps(3); await run(() => { window.__pads[0].buttons[0].pressed = false; }); await steps(80);
    check(await run(() => window.__pipbo.G.mst.ship.lane) === 1, 'controller A steers up (jump is ▲ at the helm)');
    await run(() => { window.__pipbo.G.mst.ship.bellT = 0; window.__pads[0].buttons[2].pressed = true; }); await steps(2); await run(() => { window.__pads[0].buttons[2].pressed = false; });
    check(await run(() => window.__pipbo.G.mst.ship.bellT > 0), 'controller X rings the bell');
    // pause: nothing moves
    await run(() => window.__pipbo.pause());
    const d0 = await run(() => window.__pipbo.G.mst.ship.d); await page.waitForTimeout(400);
    check(await run(() => window.__pipbo.G.mode) === 'paused' && await run(() => window.__pipbo.G.mst.ship.d) === d0, 'pause stops the ship');
    await run(() => window.__pipbo.resume());
    // stretch 2: the labels swap
    await run(() => { const P = window.__pipbo; P.nextRoom(); P.G.introT = 0; }); await steps(2);
    check((await labels()) === 'fix|bell|bell/fix|fix|bell', 'stretch 2 labels swap: ' + await labels());
    // restart with R: back to stretch 1, fresh state
    await run(() => { window.__pipbo.G.mst.stats.bonks = 9; });
    await run(() => { window.__pipbo.G.manual = false; });
    await page.keyboard.press('KeyR'); await page.waitForTimeout(100);
    check(await run(() => (window.__pipbo.G.room || 0) === 0 && window.__pipbo.G.mst.stats.bonks === 0 && window.__pipbo.G.mst.helm === 0), 'R restarts at stretch 1 with fresh stats');
    check((await labels()) === 'bell|fix|bell/fix|bell|fix', 'labels after restart: ' + await labels());
    // no leaks: another level with an action, then back
    const other = await run(() => { const P = window.__pipbo, i = P.LEVELS.findIndex(l => l.name === 'Temple Doors'); P.loadLevel(i); return i; });
    await page.waitForTimeout(100);
    const ol = await labels();
    check(!/bell|fix|anchor/.test(ol), 'Temple Doors labels are its own: ' + ol);
    check(await run(() => !window.__pipbo.G.mst.ship), 'Temple Doors state has no ship');
    await run(() => { const P = window.__pipbo; P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Runaway Ship')); });
    await page.waitForTimeout(100);
    check(await run(() => window.__pipbo.G.mst.ship.d < 0 && window.__pipbo.G.mst.stats.coins === 0), 'back on Runaway Ship: a fresh ship');
    void other;
    await page.close();
  }
  /* ---------- touch at phone size, 1-player as Bo ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true });
    // (no isMobile: the page is published without a viewport meta of its own, so mobile emulation would lay it out 980 px wide)
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url);
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
    const run = (fn, arg) => page.evaluate(fn, arg);
    await run(() => {
      const P = window.__pipbo, G = P.G;
      if (typeof enableTouch === 'function') enableTouch();
      P.CPU.cfg.players = 1; P.CPU.cfg.human = 1; P.cpuApplyCfg();
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Runaway Ship')); G.introT = 0;
      P.nextRoom(); G.introT = 0; // stretch 2: Bo steers
    });
    await page.waitForTimeout(300);
    const btn = sel => page.locator(sel + ':visible').first();
    const vis = await run(() => [...document.querySelectorAll('.tbtn-act')].map(e => (e.offsetParent ? 'shown ' : 'hidden ') + e.textContent));
    check(vis.some(v => v === 'shown bell'), 'Bo\'s touch action button shows "bell" at the helm: ' + vis.join(', '));
    await page.screenshot({ path: 'build/shots/io-touch-bo.png' });
    const box = await btn('[data-p="1"][data-k="down"]').boundingBox();
    check(!!box && box.x + box.width <= 844 && box.y + box.height <= 390, 'Bo\'s ▼ button is on screen ' + JSON.stringify(box));
    const lane0 = await run(() => window.__pipbo.G.mst.ship.lane);
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(700);
    const lane1 = await run(() => window.__pipbo.G.mst.ship.lane);
    check(lane1 === Math.min(2, lane0 + 1), 'a tap on ▼ steers down a lane (' + lane0 + ' -> ' + lane1 + ')');
    const ab = await btn('[data-p="1"][data-k="act"]').boundingBox();
    await run(() => { window.__pipbo.G.mst.ship.bellT = 0; });
    await page.touchscreen.tap(ab.x + ab.width / 2, ab.y + ab.height / 2);
    await page.waitForTimeout(150);
    check(await run(() => window.__pipbo.G.mst.ship.bellT > 0), 'a tap on the action button rings the bell');
    await ctx.close();
  }
  check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
