#!/usr/bin/env node
// 18-4 Plank Duel through the real input path: keyboard (both players), a stubbed controller, and the touch buttons.
//   node tools/w18/plankduel-input.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const url = 'file://' + path.resolve(__dirname, '..', '..', 'index.html');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
async function open(browser, opts, stubPad) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  if (stubPad) await page.addInitScript(() => {
    window.__pad = { buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] };
    const pad = () => ({ id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(), buttons: window.__pad.buttons, axes: window.__pad.axes });
    navigator.getGamepads = () => [pad(), null, null, null];
  });
  await page.goto(url);
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(() => {
    const P = window.__pipbo; P.cpuSetCfg('players', 2);
    P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Plank Duel'));
  });
  // wait for GO (intro + round card + 3-2-1)
  await page.waitForFunction(() => window.__pipbo.G.match.phase === 'live', null, { timeout: 15000 });
  return { page, errs, ctx };
}
const st = page => page.evaluate(() => { const d = window.__pipbo.G.mst.d; return d.map(D => ({ x: Math.round(D.x), stance: D.stance, sw: D.sw && D.sw.state, air: D.air, swings: window.__pipbo.G.mst.stat.swings[D.k] })); });
(async () => {
  const browser = await chromium.launch();
  // keyboard, two players
  {
    const { page, errs, ctx } = await open(browser, { viewport: { width: 1280, height: 800 } });
    const s0 = await st(page);
    await page.keyboard.down('KeyA'); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(400);
    await page.keyboard.up('KeyA'); await page.keyboard.up('ArrowRight');
    let s1 = await st(page);
    ok(s1[0].x < s0[0].x && s1[1].x > s0[1].x, 'keyboard: A and → step back (' + s0.map(s => s.x) + ' -> ' + s1.map(s => s.x) + ')');
    await page.keyboard.down('KeyS'); await page.keyboard.down('ArrowDown'); await page.waitForTimeout(120);
    s1 = await st(page); ok(s1[0].stance === 'lo' && s1[1].stance === 'lo', 'keyboard: S and ↓ guard low');
    await page.keyboard.press('KeyF'); await page.keyboard.press('Slash'); await page.waitForTimeout(80);
    s1 = await st(page); ok(s1[0].sw && s1[1].sw, 'keyboard: F and / swing (' + s1.map(s => s.sw) + ')');
    await page.keyboard.up('KeyS'); await page.keyboard.up('ArrowDown');
    await page.waitForTimeout(700);
    await page.keyboard.press('KeyW'); await page.waitForTimeout(100);
    s1 = await st(page); ok(s1[0].air, 'keyboard: W hops');
    await page.keyboard.press('ArrowUp'); await page.waitForTimeout(100);
    s1 = await st(page); ok(s1[1].air, 'keyboard: ↑ hops');
    ok(!errs.length, 'keyboard: no page errors ' + errs.join(' | '));
    await ctx.close();
  }
  // a stubbed controller (plays Pip)
  {
    const { page, errs, ctx } = await open(browser, { viewport: { width: 1280, height: 800 } }, true);
    await page.evaluate(() => { window.__pad.buttons[0].pressed = true; });
    await page.waitForTimeout(100);
    await page.evaluate(() => { window.__pad.buttons[0].pressed = false; });
    await page.waitForTimeout(800);
    await page.evaluate(() => { window.__pad.axes[1] = 1; });
    await page.waitForTimeout(150);
    let s1 = await st(page); ok(s1[0].stance === 'lo', 'controller: stick down guards low');
    await page.evaluate(() => { window.__pad.buttons[2].pressed = true; });
    await page.waitForTimeout(100);
    await page.evaluate(() => { window.__pad.buttons[2].pressed = false; window.__pad.axes[1] = 0; });
    s1 = await st(page); ok(s1[0].swings > 0 || s1[0].sw, 'controller: X swings (' + s1[0].sw + ')');
    await page.waitForTimeout(700);
    await page.evaluate(() => { window.__pad.buttons[0].pressed = true; });
    await page.waitForTimeout(100);
    s1 = await st(page); ok(s1[0].air, 'controller: A hops');
    await page.evaluate(() => { window.__pad.buttons[0].pressed = false; });
    ok(!errs.length, 'controller: no page errors ' + errs.join(' | '));
    await ctx.close();
  }
  // touch on a phone
  {
    const { page, errs, ctx } = await open(browser, { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const vis = await page.evaluate(() => [...document.querySelectorAll('#padPip .tbtn-act')].map(e => e.offsetWidth > 0 && e.textContent));
    ok(vis[0] === 'swing', 'touch: the action button reads "swing" (' + vis + ')');
    const tap = async (p, k, ms = 90) => {
      const box = await page.locator(`.tbtn[data-p="${p}"][data-k="${k}"], #pad${p ? 'Bo' : 'Pip'} .tbtn[data-k="${k}"]`).first().boundingBox();
      const cdp = await ctx.newCDPSession(page);
      const pt = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 };
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt] });
      await page.waitForTimeout(ms);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    await tap(0, 'act'); await page.waitForTimeout(30);
    let s1 = await st(page); ok(s1[0].sw || s1[0].swings > 0, 'touch: the round button swings');
    await page.waitForTimeout(800);
    await tap(1, 'jump'); s1 = await st(page); ok(s1[1].air, 'touch: Bo ▲ hops');
    ok(!errs.length, 'touch: no page errors ' + errs.join(' | '));
    await page.screenshot({ path: path.resolve('build/w18/touch-phone.png') });
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
