#!/usr/bin/env node
// Runaway Pigs input check: the real keyboard path (keys + pollInput), a stubbed controller (navigator.getGamepads)
// and the touch buttons (hasTouch, at a phone's landscape and portrait size) all reach 23-2: walking in four
// directions, the herder's clap and the gatekeeper's gate. Also 1-player mode with the computer as each role (the
// person's keys work, the computer's touch pad is hidden). Saves the play screen and the pause card to build/w23/.
// Usage: node tools/w23/pigherd-input.js
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  fs.mkdirSync('build/w23', { recursive: true });
  const browser = await chromium.launch();
  const errors = [], fails = [];
  const check = (ok, what) => { if (!ok) fails.push(what); };
  for (const [vw, vh, touch] of [[960, 540, 0], [844, 390, 1], [390, 844, 1]]) {
    const co = { viewport: { width: vw, height: vh }, deviceScaleFactor: 1 };
    if (touch) Object.assign(co, { hasTouch: true });
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
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Runaway Pigs'));
      G.introT = 0;
      const run = n => { for (let i = 0; i < n; i++) { P.pollInput(P.DT); P.step(P.DT); } };
      const st = G.mst, wx = id => G.players[id].x + st.camX;
      run(10);
      out.herder = st.herder; out.keeper = st.keeper;
      if (touch) return out;
      // keyboard: Pip walks right (D) and down (S), Bo walks up (↑)
      let x0 = wx(0), y0 = G.players[0].y, y1 = G.players[1].y;
      P.keys.add('KeyD'); P.keys.add('KeyS'); P.keys.add('ArrowUp'); run(40); P.keys.delete('KeyD'); P.keys.delete('KeyS'); P.keys.delete('ArrowUp');
      out.kbPipRight = Math.round(wx(0) - x0); out.kbPipDown = Math.round(G.players[0].y - y0); out.kbBoUp = Math.round(y1 - G.players[1].y);
      // F claps (Pip herds chase 1)
      P.keys.add('KeyF'); run(3); P.keys.delete('KeyF'); run(3);
      out.kbClap = st.stats.claps[0];
      // Bo walks to the first gate with the arrows and opens it with /
      const g = st.gates.find(q => q.id === 'g1');
      for (let i = 0; i < 900 && Math.abs(wx(1) - (g.cx - 24)) > 8; i++) { P.keys.add(wx(1) < g.cx - 24 ? 'ArrowRight' : 'ArrowLeft'); P.pollInput(P.DT); P.step(P.DT); P.keys.delete('ArrowRight'); P.keys.delete('ArrowLeft'); }
      for (let i = 0; i < 300 && Math.abs(G.players[1].y + G.players[1].h / 2 - g.cy) > 8; i++) { P.keys.add(G.players[1].y + G.players[1].h / 2 < g.cy ? 'ArrowDown' : 'ArrowUp'); P.pollInput(P.DT); P.step(P.DT); P.keys.delete('ArrowDown'); P.keys.delete('ArrowUp'); }
      run(30);
      P.keys.add('Slash'); run(3); P.keys.delete('Slash'); run(3);
      out.kbGate = g.open;
      // controller: stick left walks, X claps (Pip's controller)
      window.__pad.on = true; x0 = wx(0);
      window.__pad.axes[0] = -1; run(40); window.__pad.axes[0] = 0;
      out.padMoved = Math.round(wx(0) - x0);
      run(120);
      const c0 = st.stats.claps[0];
      window.__pad.buttons[2] = { pressed: true, value: 1 }; run(3); window.__pad.buttons[2] = { pressed: false, value: 0 }; run(3);
      out.padClap = st.stats.claps[0] - c0;
      out.chipPad = P.MODES.pigherd.jobText(st, 0, { k: 'push' })[1];
      window.__pad.on = false;
      return out;
    }, touch);
    if (!touch) {
      check(r.kbPipRight > 40 && r.kbPipDown > 20 && r.kbBoUp > 20, 'keyboard walking');
      check(r.kbClap === 1, 'keyboard clap'); check(r.kbGate === true, 'keyboard gate');
      check(r.padMoved < -40, 'pad walk'); check(r.padClap === 1, 'pad clap'); check(/Clap X|Clap /.test(r.chipPad), 'pad chip names the button');
    } else {
      r.actBtns = await page.$$eval('.tbtn-act', els => els.map(e => e.textContent + ':' + !!e.offsetParent).join(' '));
      check(/clap:true/.test(r.actBtns) && /gate:true/.test(r.actBtns), 'touch buttons show clap and gate');
      const x0 = await page.evaluate(() => window.__pipbo.G.players[1].x);
      const mb = await page.$eval('#padBo .tmove', e => { const b = e.getBoundingClientRect(); return { x: b.x + b.width * 0.8, y: b.y + b.height / 2 }; });
      await page.dispatchEvent('#padBo .tmove', 'pointerdown', { pointerId: 9, bubbles: true, clientX: mb.x, clientY: mb.y });
      await page.evaluate(() => { const P = window.__pipbo; for (let i = 0; i < 40; i++) { P.pollInput(P.DT); P.step(P.DT); } });
      await page.dispatchEvent('#padBo .tmove', 'pointerup', { pointerId: 9, bubbles: true, clientX: mb.x, clientY: mb.y });
      r.touchBoMoved = Math.round(await page.evaluate(() => window.__pipbo.G.players[1].x) - x0);
      check(r.touchBoMoved > 20, 'touch walk');
      await page.dispatchEvent('#padPip .tbtn-act', 'pointerdown', { pointerId: 7, bubbles: true });
      r.touchClap = await page.evaluate(() => { const P = window.__pipbo; for (let i = 0; i < 5; i++) { P.pollInput(P.DT); P.step(P.DT); } return P.G.mst.stats.claps[0]; });
      await page.dispatchEvent('#padPip .tbtn-act', 'pointerup', { pointerId: 7, bubbles: true });
      check(r.touchClap === 1, 'touch clap');
      // Bo is put by the first gate, then taps the gate button
      await page.evaluate(() => { const P = window.__pipbo, G = P.G, st = G.mst, g = st.gates.find(q => q.id === 'g1'), b = G.players[1]; b.x = g.cx - 24 - b.w / 2 - st.camX; b.y = g.cy - b.h / 2; for (let i = 0; i < 2; i++) { P.pollInput(P.DT); P.step(P.DT); } });
      await page.dispatchEvent('#padBo .tbtn-act', 'pointerdown', { pointerId: 8, bubbles: true });
      r.touchGate = await page.evaluate(() => { const P = window.__pipbo; for (let i = 0; i < 3; i++) { P.pollInput(P.DT); P.step(P.DT); } return P.G.mst.gates.find(q => q.id === 'g1').open; });
      await page.dispatchEvent('#padBo .tbtn-act', 'pointerup', { pointerId: 8, bubbles: true });
      check(r.touchGate === true, 'touch gate');
      r.chipTouch = await page.evaluate(() => window.__pipbo.MODES.pigherd.jobText(window.__pipbo.G.mst, 1, { k: 'open' })[0]);
      check(/gate button/.test(r.chipTouch), 'touch chip names the gate button');
    }
    await page.evaluate(() => { const P = window.__pipbo; for (let i = 0; i < 200; i++) { P.pollInput(P.DT); P.step(P.DT); } });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `build/w23/pigherd-input-${vw}x${vh}.png` });
    await page.evaluate(() => { const P = window.__pipbo; if (P.G.mode === 'play') P.pause(); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `build/w23/pigherd-pause-${vw}x${vh}.png` });
    console.log(vw + 'x' + vh, JSON.stringify(r));
    // 1-player mode: the person plays each side in turn; their keys work and the computer helps
    for (const human of [0, 1]) {
      const s = await page.evaluate(human => {
        const P = window.__pipbo, G = P.G;
        P.CPU.cfg.players = 1; P.CPU.cfg.human = human; P.cpuApplyCfg(); G.manual = true;
        P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Runaway Pigs'));
        G.introT = 0;
        const run = n => { for (let i = 0; i < n; i++) { P.pollInput(P.DT); P.step(P.DT); } };
        const st = G.mst, x0 = G.players[human].x + st.camX, c0 = G.players[1 - human].x + st.camX;
        P.keys.add('ArrowRight'); run(60); P.keys.delete('ArrowRight'); run(240);
        const cpuPad = document.querySelector(human === 0 ? '#padBo' : '#padPip'), cpuPadHidden = !cpuPad.offsetParent || getComputedStyle(cpuPad).visibility === 'hidden';
        return { human, role: st.herder === human ? 'herder' : 'gatekeeper', moved: Math.round(G.players[human].x + st.camX - x0), cpuMoved: Math.round(G.players[1 - human].x + st.camX - c0), cpuOn: G.cpuOn, cpuPadHidden };
      }, human);
      check(s.moved > 30, '1p person moves (' + human + ')'); check(Math.abs(s.cpuMoved) > 30, '1p computer moves (' + human + ')');
      await page.waitForTimeout(150);
      await page.screenshot({ path: `build/w23/pigherd-1p${s.human}-${vw}x${vh}.png` });
      console.log('  1p', JSON.stringify(s));
    }
    await page.evaluate(() => { const P = window.__pipbo; P.CPU.cfg.players = 2; P.cpuApplyCfg(); });
    await page.close();
  }
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
  console.log(fails.length ? 'FAIL: ' + fails.join(', ') : 'ALL INPUT CHECKS PASS');
  await browser.close();
  process.exit(fails.length || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
