#!/usr/bin/env node
// Kite Tandem input check: a stubbed controller (navigator.getGamepads) and the touch buttons reach the level; also
// saves a shot of the runner waiting on the landing pad under the flag, and the pause card, to build/w21/.
// Usage: node tools/w21/kite-input-check.js
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
      G.cpuOn = [false, false]; G.manual = true;
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Kite Tandem'));
      G.introT = 0;
      const run = n => { for (let i = 0; i < n; i++) { P.pollInput(P.DT); P.step(P.DT); } };
      if (touch) { run(240); return out; } // (a controller in use hides the touch pads, so the phone run is touch only)
      window.__pad.on = true; window.__pad.axes[0] = 1; // controller 1 (Pip, the runner): stick right
      run(240);
      out.padRunX = Math.round(G.mst.rx);
      window.__pad.axes[0] = 0; window.__pad.buttons[2] = { pressed: true, value: 1 }; // X: reel
      run(30);
      out.padReel = G.mst.reeling;
      window.__pad.buttons[2] = { pressed: false, value: 0 }; // (left connected: unplugging it pauses the game)
      run(10);
      out.runKeyShown = P.MODES.kite.key(0, 'run');
      return out;
    }, touch);
    if (touch) {
      // Bo rides: hold Bo's ▲ touch button
      const sel = '#padBo [data-k="jump"]';
      r.boUpVisible = await page.$eval(sel, el => !!el.offsetParent);
      r.actBtns = await page.$$eval('.tbtn-act', els => els.map(e => e.textContent + ':' + !!e.offsetParent).join(' '));
      await page.dispatchEvent(sel, 'pointerdown', { pointerId: 7, bubbles: true });
      r.touchUp = await page.evaluate(() => { const P = window.__pipbo; for (let i = 0; i < 40; i++) { P.pollInput(P.DT); P.step(P.DT); } return Math.round(P.G.mst.up); });
      await page.dispatchEvent(sel, 'pointerup', { pointerId: 7, bubbles: true });
    }
    // the runner waits at the fence on the landing pad, the rider idle: the kite hangs just under the flag
    await page.evaluate(() => {
      const P = window.__pipbo, G = P.G, st = G.mst, e = st.c.end;
      if (G.mode === 'paused') P.pause(); // (switching the stub controller off pauses: carry on)
      P.keys.clear();
      st.rx = e.fence - 12; st.ry = e.y; st.groundY = e.y; st.anchorY = e.y - 36; st.grounded = true; st.vx = 0; st.L = 300; st.th = 0.98;
      st.kx = st.rx - 167; st.ky = e.y - 300;
      for (let i = 0; i < 300; i++) P.step(P.DT);
    });
    await page.waitForTimeout(150);
    await page.screenshot({ path: `build/w21/kite-pad-${vw}x${vh}.png` });
    await page.evaluate(() => window.__pipbo.pause());
    await page.waitForTimeout(300);
    await page.screenshot({ path: `build/w21/kite-pause-${vw}x${vh}.png` });
    console.log(vw + 'x' + vh, JSON.stringify(r));
    await page.close();
  }
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
