#!/usr/bin/env node
// 29-2 Shadow Sneak through the real input paths: two scripted people who follow the prompts (the brain's rules) play
// the whole level, pressing through pollInput instead of writing p.input.
//   A 960x540: Pip on a stubbed controller (stick, A hops, X is the action, stick down), Bo on the keyboard.
//   B 844x390 with touch: both on the on-screen touch pads (move bar, ▲ ▼, the round action button).
// Jobs swap every stretch, so each input type drives both jobs. Also prints the touch action words per stretch.
// Usage: node tools/w29/shadowsneak-input.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  for (const [vw, vh, touch] of [[960, 540, 0], [844, 390, 1]]) {
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
    const r = await page.evaluate(async touch => {
      const P = window.__pipbo, G = P.G, DT = P.DT, brain = P.CPU.brains.shadowsneak;
      P.CPU.cfg.players = 2; P.cpuApplyCfg(); G.cpuOn = [false, false]; G.manual = true;
      P.loadLevel(P.LEVELS.findIndex(l => l.mode === 'shadowsneak'));
      const labels = [], bs = [{}, {}], prev = [{}, {}];
      const want = id => brain.think(bs[id], G.players[id], G.players[1 - id], DT, { mst: G.mst, intro: G.introT > 0, partnerCpu: true, time: G.time }) || {};
      const down = (id, o) => {
        const d = { left: !!o.left, right: !!o.right, down: !!o.down };
        for (const b of ['jump', 'act']) { const on = o[b] === 'tap' ? !prev[id][b] : !!o[b]; d[b] = on; prev[id][b] = on; }
        return d;
      };
      const pad = d => { const p = window.__pad; p.on = true; p.axes[0] = d.left ? -1 : d.right ? 1 : 0; p.axes[1] = d.down ? 1 : 0; p.buttons[0] = { pressed: d.jump, value: d.jump ? 1 : 0 }; p.buttons[2] = { pressed: d.act, value: d.act ? 1 : 0 }; };
      const kb = d => { const k = P.keys; const s = (c, v) => (v ? k.add(c) : k.delete(c)); s('ArrowLeft', d.left); s('ArrowRight', d.right); s('ArrowUp', d.jump); s('ArrowDown', d.down); s('Slash', d.act); };
      const tstate = [{}, {}];
      const tbtn = (id, k, v) => {
        if (!!tstate[id][k] === !!v) return; tstate[id][k] = v;
        const el = document.querySelector((id ? '#padBo' : '#padPip') + ' .tbtn[data-k="' + k + '"]'), pid = 20 + id * 10;
        el.dispatchEvent(new PointerEvent(v ? 'pointerdown' : 'pointerup', { pointerId: pid + (k === 'jump' ? 1 : k === 'down' ? 3 : 2), bubbles: true }));
      };
      const tmove = (id, dir) => {
        const cur = tstate[id].dir || 0; if (cur === dir) return;
        const el = document.querySelector((id ? '#padBo' : '#padPip') + ' .tmove'), b = el.getBoundingClientRect(), pid = 20 + id * 10;
        if (cur) el.dispatchEvent(new PointerEvent('pointerup', { pointerId: pid, bubbles: true }));
        if (dir) el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: pid, bubbles: true, clientX: b.left + b.width * (dir < 0 ? 0.2 : 0.8), clientY: b.top + b.height / 2 }));
        tstate[id].dir = dir;
      };
      const tp = (id, d) => { tmove(id, d.left ? -1 : d.right ? 1 : 0); tbtn(id, 'jump', d.jump); tbtn(id, 'down', d.down); tbtn(id, 'act', d.act); };
      let n = 0, lastRoom = -1;
      while (G.mode === 'play' && n < 120 * 600) {
        const d0 = down(0, want(0)), d1 = down(1, want(1));
        if (touch) { tp(0, d0); tp(1, d1); } else { pad(d0); kb(d1); }
        P.pollInput(DT); P.step(DT); n++;
        if ((G.room || 0) !== lastRoom && G.mst && G.mst.c) {
          lastRoom = G.room || 0;
          const st = G.mst;
          labels.push('stretch ' + (lastRoom + 1) + ' sneaker ' + ['Pip', 'Bo'][st.sneak] + ': ' + Array.from(document.querySelectorAll(touch ? '.tbtn-act' : '[data-actlabel]')).map(e => e.textContent + (touch ? (e.offsetParent ? '' : '(hidden)') : '')).join(' / '));
        }
        if (n % 600 === 0) await new Promise(res => setTimeout(res, 0));
      }
      const s = G.mst.stats;
      return { mode: G.mode, time: Math.round(G.time), room: G.room + 1, spotted: s.spotted, caught: s.caught, pebbles: s.pebbles, slides: s.slides, medal: G.mode === 'play' ? '-' : P.MODES.shadowsneak.medal(G.time, s.spotted, s.caught), labels };
    }, touch);
    console.log(vw + 'x' + vh + (touch ? ' touch (both pads)' : ' controller Pip + keyboard Bo'), JSON.stringify(r, null, 1));
    await page.close();
  }
  console.log(errors.length ? 'ERRORS:\n' + errors.slice(0, 8).join('\n') : 'no page errors');
  await browser.close();
})();
