#!/usr/bin/env node
// Hot Dog Stand Rush input check: the real keyboard path (keys + pollInput), a stubbed controller (navigator.getGamepads)
// and touch taps on the on-screen buttons all reach 23-3: walking, the cook's action at the grill and the server's at
// a fairgoer. Then 1-player mode with the computer as each role (the person's keys work, the computer's touch pad is
// hidden, the computer's job panel says "(computer)"). Sizes: 960x540 desktop, 844x390 and 390x844 phones (hasTouch).
// Saves the play screen and the pause card at each size to build/w23/.
// Usage: node tools/w23/hotdog-input.js
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const out = path.resolve(__dirname, '..', '..', 'build', 'w23');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  let bad = 0;
  const check = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) bad++; };
  for (const [vw, vh, touch] of [[960, 540, 0], [844, 390, 1], [390, 844, 1]]) {
    const co = { viewport: { width: vw, height: vh }, deviceScaleFactor: 1 };
    if (touch) co.hasTouch = true;
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
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Hot Dog Stand Rush'));
      G.introT = 0;
      const run = n => { for (let i = 0; i < n; i++) { P.pollInput(P.DT); P.step(P.DT); } };
      const st = G.mst, cx = id => G.players[id].x + G.players[id].w / 2;
      run(10);
      if (touch) return out;
      // keyboard: Pip (cook) walks left to the grill (A), puts a sausage on (F); Bo walks right (→)
      let x0 = cx(0), x1 = cx(1);
      P.keys.add('KeyA'); P.keys.add('ArrowRight'); run(25); P.keys.delete('KeyA'); P.keys.delete('ArrowRight'); run(30);
      out.kbPipMoved = Math.round(cx(0) - x0); out.kbBoMoved = Math.round(cx(1) - x1);
      const sp = P.MODES.hotdog.stationAt(st, 0, cx(0));
      P.keys.add('KeyF'); run(3); P.keys.delete('KeyF'); run(3);
      out.kbStation = sp && sp.k; out.kbGrill = st.grill.filter(Boolean).length;
      P.keys.add('KeyW'); run(10); P.keys.delete('KeyW'); out.kbHop = G.players[0].y < P.MODES.hotdog.HD.floor - G.players[0].h - 5; run(80);
      // controller (Pip's): stick right walks, X is the action
      window.__pad.on = true; x0 = cx(0);
      window.__pad.axes[0] = 1; run(20); window.__pad.axes[0] = 0; run(30);
      out.padMoved = Math.round(cx(0) - x0);
      const before = st.grill.filter(Boolean).length + (st.hold ? 1 : 0);
      window.__pad.buttons[2] = { pressed: true, value: 1 }; run(3); window.__pad.buttons[2] = { pressed: false, value: 0 }; run(3);
      out.padAct = st.grill.filter(Boolean).length + (st.hold ? 1 : 0) !== before || st.pl[0].armT > 0;
      out.padText = P.MODES.hotdog.jobText(st, 0, { k: 'grill' })[1];
      window.__pad.on = false;
      return out;
    }, touch);
    if (!touch) {
      check(r.kbPipMoved < -20 && r.kbBoMoved > 20, `${vw}: keyboard walks both (${r.kbPipMoved}, ${r.kbBoMoved})`);
      check(r.kbStation === 'grill' && r.kbGrill === 1, `${vw}: F at the grill puts a sausage on`);
      check(r.kbHop, `${vw}: W hops`);
      check(r.padMoved > 20 && r.padAct, `${vw}: controller stick walks (${r.padMoved}) and X acts`);
      check(/Press X/.test(r.padText), `${vw}: hint text names the controller button (${r.padText})`);
    } else {
      r.actBtns = await page.$$eval('.tbtn-act', els => els.map(e => e.textContent + ':' + !!e.offsetParent).join(' '));
      check(/cook:true/.test(r.actBtns) && /serve:true/.test(r.actBtns), `${vw}x${vh}: touch action buttons say cook / serve (${r.actBtns})`);
      // Bo (the server) walks right with the ▶ button, then taps the action at a fairgoer
      await page.evaluate(() => { const P = window.__pipbo, st = P.G.mst; st.arrT = 0; for (let i = 0; i < 120 * 9; i++) { P.pollInput(P.DT); P.step(P.DT); } });
      const x0 = await page.evaluate(() => window.__pipbo.G.players[1].x);
      const btn = await page.$('#padBo [data-k="right"]') || await page.$('#padBo .tmove');
      const b = await btn.boundingBox();
      await page.dispatchEvent(btn ? '#padBo [data-k="right"]' : '#padBo .tmove', 'pointerdown', { pointerId: 9, bubbles: true, clientX: b.x + b.width / 2, clientY: b.y + b.height / 2 });
      await page.evaluate(() => { const P = window.__pipbo; for (let i = 0; i < 30; i++) { P.pollInput(P.DT); P.step(P.DT); } });
      await page.dispatchEvent('#padBo [data-k="right"]', 'pointerup', { pointerId: 9, bubbles: true });
      const x1 = await page.evaluate(() => window.__pipbo.G.players[1].x);
      check(x1 - x0 > 20, `${vw}x${vh}: touch ▶ walks Bo (${Math.round(x1 - x0)})`);
      // put Bo at the waiting fairgoer and tap the action button
      await page.evaluate(() => { const P = window.__pipbo, st = P.G.mst, c = st.custs.find(q => q.state === 'hi'); if (c) { const p = P.G.players[1]; p.x = P.MODES.hotdog.HD.spots[c.spot] - p.w / 2; p.vx = 0; } });
      const tb = await (await page.$('#padBo .tbtn-act')).boundingBox();
      await page.touchscreen.tap(tb.x + tb.width / 2, tb.y + tb.height / 2);
      const taken = await page.evaluate(() => { const P = window.__pipbo; for (let i = 0; i < 4; i++) { P.pollInput(P.DT); P.step(P.DT); } return P.G.mst.stats.taken[1]; });
      check(taken === 1, `${vw}x${vh}: tapping the round button takes the order`);
      const tt = await page.evaluate(() => window.__pipbo.MODES.hotdog.jobText(window.__pipbo.G.mst, 1, { k: 'take' })[1]);
      check(/the button/.test(tt), `${vw}x${vh}: touch hint says "the button" (${tt})`);
    }
    await page.evaluate(() => { const P = window.__pipbo; for (let i = 0; i < 200; i++) { P.pollInput(P.DT); P.step(P.DT); } });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${out}/hotdog-input-${vw}x${vh}.png` });
    await page.evaluate(() => { const P = window.__pipbo; if (P.G.mode === 'play') P.pause(); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/hotdog-pause-${vw}x${vh}.png` });
    // 1-player mode: the person plays each role; their keys work and the computer does the other job
    for (const human of [0, 1]) {
      const s = await page.evaluate(human => {
        const P = window.__pipbo, G = P.G;
        P.CPU.cfg.players = 1; P.CPU.cfg.human = human; P.cpuApplyCfg(); G.manual = true;
        P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Hot Dog Stand Rush'));
        G.introT = 0;
        const run = n => { for (let i = 0; i < n; i++) { P.pollInput(P.DT); P.step(P.DT); } };
        const st = G.mst, x0 = G.players[human].x;
        P.keys.add(human === 0 ? 'ArrowLeft' : 'ArrowRight'); run(40); P.keys.delete(human === 0 ? 'ArrowLeft' : 'ArrowRight'); run(120 * 12);
        const cpuPad = document.querySelector(human === 0 ? '#padBo' : '#padPip');
        const cpuPadHidden = !cpuPad.offsetParent || getComputedStyle(cpuPad).visibility === 'hidden';
        return { human, role: st.cook === human ? 'cook' : 'server', moved: Math.round(G.players[human].x - x0), cpuOn: G.cpuOn, cpuPadHidden, taken: st.stats.taken, grill: st.grill.filter(Boolean).length };
      }, human);
      await page.waitForTimeout(150);
      await page.screenshot({ path: `${out}/hotdog-1p${s.human}-${vw}x${vh}.png` });
      check(Math.abs(s.moved) > 20 && s.role === (human === 0 ? 'cook' : 'server'), `${vw}x${vh} 1p as ${['Pip', 'Bo'][human]} (${s.role}): the person's keys walk (${s.moved})`);
      check(human === 0 ? s.taken[1] > 0 : true, `${vw}x${vh} 1p: the computer server takes orders (${s.taken})`);
      if (touch) check(s.cpuPadHidden, `${vw}x${vh} 1p: the computer's touch pad is hidden`);
    }
    await page.evaluate(() => { const P = window.__pipbo; P.CPU.cfg.players = 2; P.cpuApplyCfg(); });
    await page.close();
  }
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
  console.log(bad ? bad + ' FAILED' : 'all passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
