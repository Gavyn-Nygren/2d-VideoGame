#!/usr/bin/env node
// Cloud Bridge Builder input check: a stubbed controller (navigator.getGamepads) and the touch buttons reach the level
// (the caller's action starts an aim and plants a flag, the builder's action puffs); saves the pause card to build/w21/.
// Usage: node tools/w21/cloudbridge-input.js
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  fs.mkdirSync('build/w21', { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  for (const [vw, vh, touch] of [[960, 540, 0], [640, 360, 1]]) {
    const co = { viewport: { width: vw, height: vh }, deviceScaleFactor: 1 };
    if (touch) Object.assign(co, { hasTouch: true, isMobile: true });
    const page = await browser.newPage(co);
    page.on('pageerror', e => errors.push(String(e)));
    await page.addInitScript(() => {
      window.__pad = { on: false, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
      navigator.getGamepads = () => [window.__pad.on ? { id: 'Xbox stub', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(), axes: window.__pad.axes, buttons: window.__pad.buttons } : null, null, null, null];
    });
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
    if (touch) await page.evaluate(() => { document.documentElement.classList.add('has-touch'); window.dispatchEvent(new Event('resize')); });
    const r = await page.evaluate(touch => {
      const P = window.__pipbo, G = P.G, out = {};
      P.CPU.cfg.players = 2; P.cpuApplyCfg(); G.cpuOn = [false, false]; G.manual = true;
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Cloud Bridge Builder'));
      G.introT = 0;
      const run = n => { for (let i = 0; i < n; i++) { P.pollInput(P.DT); P.step(P.DT); } };
      // put Pip (the caller) near the first edge
      const st = G.mst, i0 = st.isles[0];
      G.players[0].x = i0.x1 - 40 - st.camX; run(30);
      if (touch) return out;
      window.__pad.on = true; window.__pad.buttons[2] = { pressed: true, value: 1 }; // X held: aim
      run(30);
      out.padAim = !!st.pl[0].aim;
      out.chipKeyPad = P.MODES.cloudbridge.job(st, 0);
      window.__pad.buttons[2] = { pressed: false, value: 0 }; run(5);
      out.padFlag = st.marks.length;
      return out;
    }, touch);
    if (touch) {
      r.actBtns = await page.$$eval('.tbtn-act', els => els.map(e => e.textContent + ':' + !!e.offsetParent).join(' '));
      const sel = '#padPip .tbtn-act';
      await page.dispatchEvent(sel, 'pointerdown', { pointerId: 7, bubbles: true });
      r.touchAim = await page.evaluate(() => { const P = window.__pipbo; for (let i = 0; i < 30; i++) { P.pollInput(P.DT); P.step(P.DT); } return !!P.G.mst.pl[0].aim; });
      await page.dispatchEvent(sel, 'pointerup', { pointerId: 7, bubbles: true });
      r.touchFlag = await page.evaluate(() => { const P = window.__pipbo; for (let i = 0; i < 5; i++) { P.pollInput(P.DT); P.step(P.DT); } return P.G.mst.marks.length; });
      const sel2 = '#padBo .tbtn-act';
      await page.dispatchEvent(sel2, 'pointerdown', { pointerId: 8, bubbles: true });
      r.touchPuff = await page.evaluate(() => { const P = window.__pipbo; for (let i = 0; i < 10; i++) { P.pollInput(P.DT); P.step(P.DT); } return P.G.mst.stats.squeezes[1]; });
      await page.dispatchEvent(sel2, 'pointerup', { pointerId: 8, bubbles: true });
      r.keyWord = await page.evaluate(() => window.__pipbo.G.mst && document.documentElement.className);
    }
    await page.evaluate(() => { const P = window.__pipbo; if (P.G.mode === 'play') P.pause(); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `build/w21/cloudbridge-pause-${vw}x${vh}.png` });
    console.log(vw + 'x' + vh, JSON.stringify(r));
    await page.close();
  }
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
