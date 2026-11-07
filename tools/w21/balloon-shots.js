#!/usr/bin/env node
// 21-1 Hot Air Balloon Climb: drives both players through the real input paths like people (keyboard keys, then a
// stubbed controller, then touch buttons), takes screenshots at chosen moments and checks each job reacts.
// Usage: node tools/w21/balloon-shots.js [--out=build/w21] [--at=3,12,24] [--room=0] [--w=1280] [--h=720] [--tag=x]
//        [--input=kb|pad|touch] [--solo=1] (1-player mode: the person is Pip, the computer Bo) [--intro=1]
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const out = opt('out', 'build/w21'), at = opt('at', '3,12,24').split(',').map(Number), room = +opt('room', 0);
const dpr = +opt('dpr', 1), zoom = +opt('zoom', 0), vw = +opt('w', 1280), vh = +opt('h', 720), tag = opt('tag', ''), input = opt('input', 'kb'), solo = +opt('solo', 0), intro = +opt('intro', 0);
fs.mkdirSync(out, { recursive: true });
let fails = 0;
const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch();
  const ctxo = { viewport: { width: vw, height: vh }, deviceScaleFactor: dpr };
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
    // wake both controllers (the first press only connects one)
    for (const i of [0, 1]) {
      await page.evaluate(i => { window.__pads[i].buttons[0] = { pressed: true, value: 1 }; window.__pipbo.pollInput(1 / 60); window.__pads[i].buttons[0] = { pressed: false, value: 0 }; window.__pipbo.pollInput(1 / 60); }, i);
    }
  }
  await page.evaluate(({ room, solo, intro }) => {
    const P = window.__pipbo, G = P.G;
    if (solo) { P.CPU.cfg.players = 1; P.CPU.cfg.human = 0; P.cpuApplyCfg(); } else { P.CPU.cfg.players = 2; P.cpuApplyCfg(); }
    G.manual = true;
    P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Hot Air Balloon Climb'));
    for (let k = 0; k < room; k++) P.nextRoom();
    if (!intro) G.introT = 0;
    window.__simT = 0;
  }, { room, solo, intro });
  if (input === 'touch') {
    const vis = await page.evaluate(() => Array.from(document.querySelectorAll('.tbtn-act')).map(e => ({ shown: e.offsetParent !== null && getComputedStyle(e).display !== 'none', label: e.textContent })));
    ok(vis.some(v => v.shown), 'touch: the round action button shows (' + JSON.stringify(vis) + ')');
  }
  const labels = await page.evaluate(() => { window.__pipbo.step(window.__pipbo.DT); return Array.from(document.querySelectorAll('[data-actlabel]')).map(e => e.textContent); });
  console.log('act labels:', labels.join(', '));
  // the person-like drivers: press and release through the real devices
  const KEYS = [{ burn: 'w', left: 'a', right: 'd', steady: 's' }, { burn: 'ArrowUp', left: 'ArrowLeft', right: 'ArrowRight', steady: 'ArrowDown' }];
  const PADB = { burn: 0, steady: 2, left: 14, right: 15 };
  const held = [new Set(), new Set()];
  async function set(id, what, on) {
    if (held[id].has(what) === on) return;
    if (on) held[id].add(what); else held[id].delete(what);
    if (input === 'kb') { if (on) await page.keyboard.down(KEYS[id][what]); else await page.keyboard.up(KEYS[id][what]); }
    else if (input === 'pad') await page.evaluate(({ id, b, on }) => { window.__pads[id].buttons[b] = { pressed: on, value: on ? 1 : 0 }; }, { id, b: PADB[what], on });
    else {
      const k = { burn: 'jump', steady: 'act', left: 'left', right: 'right' }[what];
      const sel = `#${id === 0 ? 'padPip' : 'padBo'} [data-k="${k}"]`;
      await page.evaluate(({ sel, on }) => {
        const el = document.querySelector(sel); if (!el) return;
        const r = el.getBoundingClientRect(), o = { bubbles: true, pointerId: 50 + (sel.includes('Bo') ? 1 : 0) + (sel.includes('act') ? 2 : 0) + (sel.includes('left') ? 4 : 0) + (sel.includes('right') ? 6 : 0), clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, pointerType: 'touch', isPrimary: true };
        el.dispatchEvent(new PointerEvent(on ? 'pointerdown' : 'pointerup', o));
      }, { sel, on });
    }
  }
  const state = () => page.evaluate(() => { const G = window.__pipbo.G, st = G.mst; return { mode: G.mode, room: G.room, burner: st.burner, b: { ...st.b }, plan: st.plan, state: st.state, t: window.__simT }; });
  let burnSeen = false, steerSeen = false, steadySeen = false;
  for (const t of at) {
    while (true) {
      const s = await state();
      if (s.t >= t || (s.mode !== 'play')) break;
      const bu = s.burner, se = 1 - bu, pl = s.plan || {};
      if (!(solo && bu === 1)) {
        // the burner: hold while the plan wants more climb, else let go (a person pulses it)
        const want = pl.burn === 'burn' || (pl.vy > s.b.vy + 8 && s.b.heat < 0.82 && pl.burn !== 'cool');
        await set(bu, 'burn', want);
      }
      if (!(solo && se === 1)) {
        const dx = (pl.tx || s.b.x) - s.b.x;
        await set(se, 'right', dx > 30 && s.b.vx < 120);
        await set(se, 'left', dx < -30 && s.b.vx > -120);
        await set(se, 'steady', Math.abs(dx) < 20 && Math.abs(s.b.vx) > 40);
      }
      await page.evaluate(() => { const P = window.__pipbo; for (let i = 0; i < 6; i++) { P.pollInput(P.DT); P.step(P.DT); window.__simT += P.DT; } });
      const s2 = await page.evaluate(() => { const st = window.__pipbo.G.mst; return { burning: st.b.burning, pull: st.b.pull, steady: st.b.steady }; });
      if (s2.burning) burnSeen = true;
      if (Math.abs(s2.pull) > 0.5) steerSeen = true;
      if (s2.steady) steadySeen = true;
    }
    await page.waitForTimeout(120);
    const f = path.join(out, 'balloon-' + (tag || input) + '-r' + room + '-' + t + 's-' + vw + 'x' + vh + '.png');
    if (zoom) {
      // a close-up around the balloon (screen px of the page)
      const box = await page.evaluate(() => { const G = window.__pipbo.G, st = G.mst, c = document.getElementById('game').getBoundingClientRect(), k = c.width / 960; return { x: c.x + (st.b.x - 130) * k, y: c.y + (540 - (st.b.h + 230 - st.cam)) * k, width: 260 * k, height: 280 * k }; });
      await page.screenshot({ path: f, clip: box });
    } else await page.screenshot({ path: f });
    const s = await state();
    console.log(f, JSON.stringify({ mode: s.mode, room: s.room, x: Math.round(s.b.x), h: Math.round(s.b.h), state: s.state }));
  }
  ok(burnSeen, input + ': the burner fires from the burner\'s button');
  ok(steerSeen, input + ': the steerer pulls a vent rope with ◀ ▶');
  console.log('steady seen: ' + steadySeen);
  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); fails++; }
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
