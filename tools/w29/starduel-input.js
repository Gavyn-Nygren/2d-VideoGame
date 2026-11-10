#!/usr/bin/env node
// 29-4 Throwing Star Duel through the real input paths (no computer): two scripted people play a whole match, pressing
// through pollInput instead of writing p.input.
//   A 960x540: Pip on a stubbed controller (stick, A hops, X throws/swings), Bo on the keyboard (arrows, /).
//   B 844x390 with touch: both on the on-screen pads (move bar, ▲, ▼, the round "throw" button).
// Each person: throws high and low, ducks high stars, hops low ones, swings at about half the stars, steps around.
// Prints per player: throws high/low, ducks, hops, deflects, bonks landed, and the touch button words.
// Usage: node tools/w29/starduel-input.js
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
      const P = window.__pipbo, G = P.G, M = P.MODES.starduel, DT = P.DT;
      P.CPU.cfg.players = 2; P.cpuApplyCfg(); G.cpuOn = [false, false]; G.manual = true;
      P.loadLevel(P.LEVELS.findIndex(l => l.mode === 'starduel'));
      const mem = [0, 1].map(() => ({ seen: {}, next: 1, q: [], goal: null, goalT: 0 }));
      const count = [0, 1].map(() => ({ high: 0, low: 0 }));
      const want = id => {
        const st = G.mst, o = {}; if (!st.pl || !G.match || G.match.phase !== 'live' || st.res) return o;
        const S = mem[id], pl = M.plan(st, id), D = st.pl[id], now = G.time, s = pl.star;
        if (s) {
          const key = s.id + ':' + s.bounces;
          let m = S.seen[key];
          if (!m) m = S.seen[key] = { at: now + 0.25, swing: Math.random() < 0.5, aim: 0.05 + Math.random() * 0.09 };
          if (now >= m.at && pl.tti < 0.6) {
            const low = s.lane === 1;
            if (m.swing && !m.done) { if (low && pl.tti < 0.4) o.down = true; if (pl.tti <= m.aim && pl.grounded && D.duck === low) { o.act = 'tap'; m.done = true; } }
            else if (low) { if (pl.tti < 0.2 && pl.grounded) o.jump = 'tap'; }
            else if (pl.tti < 0.4) o.down = true;
            return o;
          }
        }
        S.next -= DT;
        if (S.q.length) {
          const q = S.q[0]; o.down = q.low; q.t += DT;
          if (q.t > 0.08 && !pl.inZone && pl.canThrow && D.duck === q.low) { o.act = 'tap'; count[id][q.low ? 'low' : 'high']++; S.q.shift(); }
          else if (q.t > 0.8) S.q.shift();
          return o;
        }
        if (S.next <= 0 && pl.canThrow) { S.q.push({ t: 0, low: Math.random() < 0.45 }); S.next = 0.8 + Math.random() * 1.2; }
        if ((S.goalT -= DT) <= 0) { const [lo, hi] = M.test.SD.side[id]; S.goal = lo + Math.random() * (hi - lo); S.goalT = 1 + Math.random() * 2; }
        if (S.goal != null && Math.abs(S.goal - D.x) > 12) { o.left = S.goal < D.x; o.right = S.goal > D.x; }
        return o;
      };
      const prev = [{}, {}];
      const edge = (id, o) => { const a = o.act === 'tap' ? !prev[id].act : !!o.act, j = o.jump === 'tap' ? !prev[id].jump : !!o.jump; prev[id] = { act: a, jump: j }; return { left: !!o.left, right: !!o.right, down: !!o.down, jump: j, act: a }; };
      const pad = d => { const p = window.__pad; p.on = true; p.axes[0] = d.left ? -1 : d.right ? 1 : 0; p.axes[1] = d.down ? 1 : 0; p.buttons[0] = { pressed: d.jump, value: d.jump ? 1 : 0 }; p.buttons[2] = { pressed: d.act, value: d.act ? 1 : 0 }; };
      const kb = d => { const k = P.keys; const s = (c, v) => (v ? k.add(c) : k.delete(c)); s('ArrowLeft', d.left); s('ArrowRight', d.right); s('ArrowUp', d.jump); s('ArrowDown', d.down); s('Slash', d.act); };
      const tstate = [{}, {}];
      const tbtn = (id, k, v) => {
        if (!!tstate[id][k] === !!v) return; tstate[id][k] = v;
        const el = document.querySelector((id ? '#padBo' : '#padPip') + ' .tbtn[data-k="' + k + '"]');
        el.dispatchEvent(new PointerEvent(v ? 'pointerdown' : 'pointerup', { pointerId: 20 + id * 10 + ({ jump: 1, act: 2, down: 3 })[k], bubbles: true }));
      };
      const tmove = (id, dir) => {
        const cur = tstate[id].dir || 0; if (cur === dir) return;
        const el = document.querySelector((id ? '#padBo' : '#padPip') + ' .tmove'), b = el.getBoundingClientRect(), pid = 20 + id * 10;
        if (cur) el.dispatchEvent(new PointerEvent('pointerup', { pointerId: pid, bubbles: true }));
        if (dir) el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: pid, bubbles: true, clientX: b.left + b.width * (dir < 0 ? 0.2 : 0.8), clientY: b.top + b.height / 2 }));
        tstate[id].dir = dir;
      };
      const tp = (id, d) => { tmove(id, d.left ? -1 : d.right ? 1 : 0); tbtn(id, 'jump', d.jump); tbtn(id, 'down', d.down); tbtn(id, 'act', d.act); };
      let n = 0;
      const labels = Array.from(document.querySelectorAll(touch ? '.tbtn-act' : '[data-actlabel]')).map(e => e.textContent + (e.offsetParent ? '' : '(hidden)')).join(' / ');
      while (G.mode === 'play' && n < 120 * 600) {
        const d0 = edge(0, want(0)), d1 = edge(1, want(1));
        if (touch) { tp(0, d0); tp(1, d1); } else { pad(d0); kb(d1); }
        P.pollInput(DT); P.step(DT); n++;
        if (n % 600 === 0) await new Promise(res => setTimeout(res, 0));
      }
      const s = G.mst.stat;
      return { mode: G.mode, secs: Math.round(n / 120), rounds: G.match.wins.join('-'), throwsHL: count.map(c => c.high + '/' + c.low).join(' vs '), starsThrown: s.throws.join('/'), dodges: s.dodges.join('/'), deflects: s.deflects.join('/'), perfects: s.perfects.join('/'), whiffs: s.whiffs.join('/'), bonksLanded: s.bonks.join('/'), labels };
    }, touch);
    console.log(vw + 'x' + vh + (touch ? ' touch (both pads)' : ' controller Pip + keyboard Bo'), JSON.stringify(r));
    await page.close();
  }
  console.log(errors.length ? 'ERRORS:\n' + errors.slice(0, 8).join('\n') : 'no page errors');
  await browser.close();
})();
