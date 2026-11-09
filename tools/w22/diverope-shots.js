#!/usr/bin/env node
// 22-2 Treasure Diver Rope: drives both players through the real input paths like people (keyboard keys, a stubbed
// controller, or the touch buttons), takes screenshots at chosen moments and checks that each job reacts: the boat
// partner's rope out / reel / pump and the diver's swim and grab. Prints page errors.
// Usage: node tools/w22/diverope-shots.js [--out=build/w22] [--at=3,12,24] [--room=0] [--w=1280] [--h=720] [--tag=x]
//        [--input=kb|pad|touch] [--solo=1] (1-player mode: the person is Pip, the computer Bo) [--human=0|1] [--intro=1]
//        [--pause=1] (also a shot of the pause card at the end) [--until=clear] (keep playing to the results card)
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const out = opt('out', 'build/w22'), at = opt('at', '3,12,24').split(',').map(Number), room = +opt('room', 0);
const vw = +opt('w', 1280), vh = +opt('h', 720), tag = opt('tag', ''), input = opt('input', 'kb'), solo = +opt('solo', 0), human = +opt('human', 0), intro = +opt('intro', 0);
const pauseShot = +opt('pause', 0), until = opt('until', '');
fs.mkdirSync(out, { recursive: true });
let fails = 0;
const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch();
  const ctxo = { viewport: { width: vw, height: vh }, deviceScaleFactor: 1 };
  if (input === 'touch') Object.assign(ctxo, { hasTouch: true, isMobile: true });
  const ctx = await browser.newContext(ctxo);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(pad => {
    let s = 7919;
    Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    if (pad) {
      const mk = i => ({ index: i, id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', mapping: 'standard', connected: true, timestamp: 0,
        axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
      window.__pads = [mk(0), mk(1)];
      navigator.getGamepads = () => window.__pads;
    }
  }, input === 'pad');
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  if (input === 'pad') {
    for (const i of [0, 1]) await page.evaluate(i => { window.__pads[i].buttons[0] = { pressed: true, value: 1 }; window.__pipbo.pollInput(1 / 60); window.__pads[i].buttons[0] = { pressed: false, value: 0 }; window.__pipbo.pollInput(1 / 60); }, i);
  }
  await page.evaluate(({ room, solo, intro, human }) => {
    const P = window.__pipbo, G = P.G;
    if (solo) { P.CPU.cfg.players = 1; P.CPU.cfg.human = human; P.cpuApplyCfg(); } else { P.CPU.cfg.players = 2; P.cpuApplyCfg(); }
    G.manual = true;
    P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Treasure Diver Rope'));
    for (let k = 0; k < room; k++) P.nextRoom();
    if (!intro) G.introT = 0;
    window.__simT = 0;
  }, { room, solo, intro, human });
  if (input === 'touch') {
    const vis = await page.evaluate(() => Array.from(document.querySelectorAll('.tbtn-act')).map(e => ({ shown: e.offsetParent !== null && getComputedStyle(e).display !== 'none', label: e.textContent })));
    ok(vis.some(v => v.shown), 'touch: the round action button shows (' + JSON.stringify(vis) + ')');
  }
  const labels = await page.evaluate(() => { window.__pipbo.step(window.__pipbo.DT); return Array.from(document.querySelectorAll('[data-actlabel]')).map(e => e.textContent); });
  console.log('act labels:', labels.join(', '));
  const KEYS = [{ up: 'w', left: 'a', right: 'd', down: 's', act: 'f' }, { up: 'ArrowUp', left: 'ArrowLeft', right: 'ArrowRight', down: 'ArrowDown', act: '/' }];
  const PADB = { up: 0, act: 2, left: 14, right: 15, down: 13 };
  const held = [new Set(), new Set()];
  async function set(id, what, on) {
    if (held[id].has(what) === on) return;
    if (on) held[id].add(what); else held[id].delete(what);
    if (input === 'kb') { if (on) await page.keyboard.down(KEYS[id][what]); else await page.keyboard.up(KEYS[id][what]); }
    else if (input === 'pad') await page.evaluate(({ id, b, on }) => { window.__pads[id].buttons[b] = { pressed: on, value: on ? 1 : 0 }; }, { id: solo ? 0 : id, b: PADB[what], on }); // (1-player mode: the first controller is the person's)
    else {
      const k = { up: 'jump', down: 'down', act: 'act', left: 'left', right: 'right' }[what];
      const sel = `#${id === 0 ? 'padPip' : 'padBo'} [data-k="${k}"]`;
      await page.evaluate(({ sel, on, pid }) => {
        const el = document.querySelector(sel); if (!el) return;
        const r = el.getBoundingClientRect(), o = { bubbles: true, pointerId: pid, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, pointerType: 'touch', isPrimary: true };
        el.dispatchEvent(new PointerEvent(on ? 'pointerdown' : 'pointerup', o));
      }, { sel, on, pid: 40 + id * 10 + ['up', 'down', 'act', 'left', 'right'].indexOf(what) });
    }
  }
  const state = () => page.evaluate(() => { const G = window.__pipbo.G, st = G.mst; return { mode: G.mode, room: G.room, diver: st.diver, d: st.d ? { x: st.d.x, y: st.d.y, vx: st.d.vx, chest: st.d.chest } : null, plan: st.plan, state: st.state, air: st.air, rope: st.rope && { L: st.rope.L, mode: st.rope.mode }, t: window.__simT, intro: G.introT }; });
  const seen = { out: false, reel: false, pump: false, swim: false, grab: false };
  let pumpT = 0;
  const shoot = async t => {
    await page.waitForTimeout(120);
    const f = path.join(out, 'diverope-' + (tag || input) + '-r' + room + '-' + t + 's-' + vw + 'x' + vh + '.png');
    await page.screenshot({ path: f });
    const s = await state();
    console.log(f, JSON.stringify({ mode: s.mode, room: s.room, x: s.d && Math.round(s.d.x), y: s.d && Math.round(s.d.y), state: s.state, air: s.air && +s.air.toFixed(2) }));
  };
  const cpuSide = id => solo && id !== human;
  const plays = async limit => {
    while (true) {
      const s = await state();
      if (s.t >= limit || s.mode !== 'play') break;
      const pl = s.plan || {}, dv = s.diver, bt = 1 - dv;
      if (s.state === 'ride' && s.d && !(s.intro > 0)) {
        if (!cpuSide(bt)) {
          await set(bt, 'down', pl.rope === 'out'); await set(bt, 'up', pl.rope === 'in');
          const pumpNow = pl.rope !== 'out' && pl.rope !== 'in' && s.air < 0.97 && s.t >= pumpT;
          if (pumpNow) pumpT = s.t + 0.45;
          await set(bt, 'act', pumpNow);
        }
        if (!cpuSide(dv)) {
          const dx = (pl.tx || s.d.x) - s.d.x;
          await set(dv, 'right', dx > 14 && s.d.vx < 110); await set(dv, 'left', dx < -14 && s.d.vx > -110);
          await set(dv, 'act', !!pl.grab && !held[dv].has('act'));
          await set(dv, 'down', pl.rope === 'out' && pl.taut);
        }
      } else for (const id of [0, 1]) for (const k of ['up', 'down', 'left', 'right', 'act']) await set(id, k, false);
      await page.evaluate(() => { const P = window.__pipbo; for (let i = 0; i < 6; i++) { P.pollInput(P.DT); P.step(P.DT); window.__simT += P.DT; } });
      const s2 = await page.evaluate(() => { const st = window.__pipbo.G.mst; return st.rope ? { mode: st.rope.mode, pump: st.pumpAnim, vx: st.d.vx, chest: st.d.chest } : {}; });
      if (s2.mode === 'out') seen.out = true;
      if (s2.mode === 'in') seen.reel = true;
      if (s2.pump > 0.5) seen.pump = true;
      if (Math.abs(s2.vx) > 60) seen.swim = true;
      if (s2.chest) seen.grab = true;
    }
  };
  for (const t of at) { await plays(t); await shoot(t); }
  if (until === 'clear') {
    await plays(1e9);
    for (const id of [0, 1]) for (const k of ['up', 'down', 'left', 'right', 'act']) await set(id, k, false);
    await page.evaluate(() => { const P = window.__pipbo; for (let i = 0; i < 400; i++) { P.step(P.DT); } window.__pipbo.frame && 0; });
    await page.waitForTimeout(2200);
    const f = path.join(out, 'diverope-' + (tag || input) + '-results-' + vw + 'x' + vh + '.png');
    await page.screenshot({ path: f });
    const m = await page.evaluate(() => ({ mode: window.__pipbo.G.mode, t: window.__pipbo.G.time }));
    console.log(f, JSON.stringify(m));
    ok(m.mode === 'result', 'played through to the results card (' + m.mode + ' at ' + Math.round(m.t) + ' s)');
  }
  if (pauseShot) {
    await page.evaluate(() => window.__pipbo.pause());
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, 'diverope-' + (tag || input) + '-pause-' + vw + 'x' + vh + '.png') });
  }
  const bt = await page.evaluate(() => 1 - window.__pipbo.G.mst.diver);
  if (!(solo && bt !== human) || until) { ok(seen.out, input + ': the boat partner lets out rope'); ok(seen.reel, input + ': the boat partner reels in'); ok(seen.pump, input + ': the boat partner pumps air'); }
  ok(seen.swim, input + ': the diver swims');
  if (until) ok(seen.grab, input + ': the diver hooks a chest');
  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); fails++; }
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
