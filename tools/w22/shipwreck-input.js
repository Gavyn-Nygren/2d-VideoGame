#!/usr/bin/env node
// Shipwreck Lights input check: the real keyboard path (keys + pollInput), a stubbed controller (navigator.getGamepads)
// and the touch buttons all reach 22-3: swimming, the lantern's flash and the grabber's claw. Also 1-player mode with the
// computer as each role (the person's keys work, the computer's touch pad is hidden). Saves the play screen and the
// pause card at each size to build/w22/.
// Usage: node tools/w22/shipwreck-input.js
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  fs.mkdirSync('build/w22', { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  for (const [vw, vh, touch] of [[960, 540, 0], [844, 390, 1], [390, 844, 1]]) {
    const co = { viewport: { width: vw, height: vh }, deviceScaleFactor: 1 };
    if (touch) Object.assign(co, { hasTouch: true, isMobile: true });
    const page = await browser.newPage(co);
    page.on('pageerror', e => errors.push(vw + ': ' + String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(vw + ': ' + m.text()); });
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
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Shipwreck Lights'));
      G.introT = 0;
      const run = n => { for (let i = 0; i < n; i++) { P.pollInput(P.DT); P.step(P.DT); } };
      const st = G.mst, wx = id => G.players[id].x + st.camX;
      run(10);
      if (touch) return out;
      // keyboard: Pip swims right and flashes (F), Bo swims up (↑) and snaps the claw (/)
      let x0 = wx(0), y1 = G.players[1].y;
      P.keys.add('KeyD'); P.keys.add('ArrowUp'); run(40); P.keys.delete('KeyD'); P.keys.delete('ArrowUp');
      out.kbPipMoved = Math.round(wx(0) - x0); out.kbBoUp = Math.round(y1 - G.players[1].y);
      P.keys.add('KeyF'); P.keys.add('Slash'); run(3); P.keys.delete('KeyF'); P.keys.delete('Slash'); run(3);
      out.kbFlash = st.stats.flashes[0]; out.kbClaw = st.pl[1].armT > 0;
      run(400);
      // controller: stick right swims, X flashes (Pip's controller)
      window.__pad.on = true; x0 = wx(0);
      window.__pad.axes[0] = 1; run(40); window.__pad.axes[0] = 0;
      out.padMoved = Math.round(wx(0) - x0);
      window.__pad.buttons[2] = { pressed: true, value: 1 }; run(3); window.__pad.buttons[2] = { pressed: false, value: 0 }; run(3);
      out.padFlash = st.stats.flashes[0];
      out.chipPad = P.MODES.shipwreck.jobText(st, 0, { k: 'flashGlow' })[0];
      window.__pad.on = false;
      return out;
    }, touch);
    if (touch) {
      r.actBtns = await page.$$eval('.tbtn-act', els => els.map(e => e.textContent + ':' + !!e.offsetParent).join(' '));
      const x0 = await page.evaluate(() => window.__pipbo.G.players[1].x);
      const mb = await page.$eval('#padBo .tmove', e => { const b = e.getBoundingClientRect(); return { x: b.x + b.width * 0.8, y: b.y + b.height / 2 }; });
      await page.dispatchEvent('#padBo .tmove', 'pointerdown', { pointerId: 9, bubbles: true, clientX: mb.x, clientY: mb.y });
      await page.evaluate(() => { const P = window.__pipbo; for (let i = 0; i < 40; i++) { P.pollInput(P.DT); P.step(P.DT); } });
      await page.dispatchEvent('#padBo .tmove', 'pointerup', { pointerId: 9, bubbles: true, clientX: mb.x, clientY: mb.y });
      r.touchBoMoved = Math.round(await page.evaluate(() => window.__pipbo.G.players[1].x) - x0);
      await page.dispatchEvent('#padPip .tbtn-act', 'pointerdown', { pointerId: 7, bubbles: true });
      r.touchFlash = await page.evaluate(() => { const P = window.__pipbo; for (let i = 0; i < 5; i++) { P.pollInput(P.DT); P.step(P.DT); } return P.G.mst.stats.flashes[0]; });
      await page.dispatchEvent('#padPip .tbtn-act', 'pointerup', { pointerId: 7, bubbles: true });
      await page.dispatchEvent('#padBo .tbtn-act', 'pointerdown', { pointerId: 8, bubbles: true });
      r.touchClaw = await page.evaluate(() => { const P = window.__pipbo; for (let i = 0; i < 3; i++) { P.pollInput(P.DT); P.step(P.DT); } return P.G.mst.pl[1].armT > 0; });
      await page.dispatchEvent('#padBo .tbtn-act', 'pointerup', { pointerId: 8, bubbles: true });
      r.chipTouch = await page.evaluate(() => window.__pipbo.MODES.shipwreck.jobText(window.__pipbo.G.mst, 1, { k: 'pull' })[0]);
    }
    await page.evaluate(() => { const P = window.__pipbo; for (let i = 0; i < 200; i++) { P.pollInput(P.DT); P.step(P.DT); } });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `build/w22/shipwreck-input-${vw}x${vh}.png` });
    await page.evaluate(() => { const P = window.__pipbo; if (P.G.mode === 'play') P.pause(); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `build/w22/shipwreck-pause-${vw}x${vh}.png` });
    console.log(vw + 'x' + vh, JSON.stringify(r));
    // 1-player mode: the person plays each role in turn; their keys work and the computer helps
    for (const human of [0, 1]) {
      const s = await page.evaluate(human => {
        const P = window.__pipbo, G = P.G;
        P.CPU.cfg.players = 1; P.CPU.cfg.human = human; P.cpuApplyCfg(); G.manual = true;
        P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Shipwreck Lights'));
        G.introT = 0;
        const run = n => { for (let i = 0; i < n; i++) { P.pollInput(P.DT); P.step(P.DT); } };
        const st = G.mst, x0 = G.players[human].x + st.camX;
        P.keys.add('ArrowRight'); run(60); P.keys.delete('ArrowRight'); run(240);
        const cpuPad = document.querySelector(human === 0 ? '#padBo' : '#padPip'), cpuPadHidden = !cpuPad.offsetParent || getComputedStyle(cpuPad).visibility === 'hidden';
        return { human, role: st.lantern === human ? 'lantern' : 'grabber', moved: Math.round(G.players[human].x + st.camX - x0), cpuX: Math.round(G.players[1 - human].x + st.camX), cpuOn: G.cpuOn, cpuPadHidden, need: P.MODES.shipwreck.need(st).kind };
      }, human);
      await page.waitForTimeout(150);
      await page.screenshot({ path: `build/w22/shipwreck-1p${s.human}-${vw}x${vh}.png` });
      console.log('  1p', JSON.stringify(s));
    }
    await page.evaluate(() => { const P = window.__pipbo; P.CPU.cfg.players = 2; P.cpuApplyCfg(); });
    await page.close();
  }
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
