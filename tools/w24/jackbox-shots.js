#!/usr/bin/env node
// 24-2 Jack-in-the-Box Launch: drives both players through the real input paths like people (keyboard keys, a stubbed
// controller, or the touch buttons), takes screenshots at chosen moments and checks that each job reacts: the cranker's
// crank and aim and hook, the jumper's squish, steer, hop, walk, yo-yo and haul. Prints page errors.
// Usage: node tools/w24/jackbox-shots.js [--out=build/w24] [--at=3,9,14] [--room=0] [--w=960] [--h=540] [--tag=x]
//        [--input=kb|pad|touch] [--solo=1] (1-player mode: the person is --human, the computer the other) [--human=0|1]
//        [--intro=1] [--pause=1] (also a shot of the pause card at the end) [--until=clear] (play to the results card)
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const out = opt('out', 'build/w24'), at = opt('at', '3,9,14').split(',').map(Number), room = +opt('room', 0);
const vw = +opt('w', 960), vh = +opt('h', 540), tag = opt('tag', ''), input = opt('input', 'kb'), solo = +opt('solo', 0), human = +opt('human', 0), intro = +opt('intro', 0);
const pauseShot = +opt('pause', 0), until = opt('until', '');
fs.mkdirSync(out, { recursive: true });
let fails = 0;
const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch();
  const ctxo = { viewport: { width: vw, height: vh }, deviceScaleFactor: 1 };
  if (input === 'touch') Object.assign(ctxo, { hasTouch: true });
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
  if (input === 'touch') await page.evaluate(() => { document.documentElement.classList.add('has-touch'); window.dispatchEvent(new Event('resize')); });
  if (input === 'pad') {
    for (const i of [0, 1]) await page.evaluate(i => { window.__pads[i].buttons[0] = { pressed: true, value: 1 }; window.__pipbo.pollInput(1 / 60); window.__pads[i].buttons[0] = { pressed: false, value: 0 }; window.__pipbo.pollInput(1 / 60); }, i);
  }
  await page.evaluate(({ room, solo, intro, human }) => {
    const P = window.__pipbo, G = P.G;
    if (solo) { P.CPU.cfg.players = 1; P.CPU.cfg.human = human; P.cpuApplyCfg(); } else { P.CPU.cfg.players = 2; P.cpuApplyCfg(); }
    G.manual = true;
    P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Jack-in-the-Box Launch'));
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
        const el = document.querySelector(sel) || (sel.includes('"act"') ? document.querySelector(sel.split(' ')[0] + ' .tbtn-act') : null); if (!el) return;
        const r = el.getBoundingClientRect(), o = { bubbles: true, pointerId: pid, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, pointerType: 'touch', isPrimary: true };
        el.dispatchEvent(new PointerEvent(on ? 'pointerdown' : 'pointerup', o));
      }, { sel, on, pid: 40 + id * 10 + ['up', 'down', 'act', 'left', 'right'].indexOf(what) });
    }
  }
  const state = () => page.evaluate(() => {
    const G = window.__pipbo.G, st = G.mst, D = window.__pipbo.MODES.jackbox.JBOX;
    return { mode: G.mode, room: G.room, cranker: st.cranker, jumper: st.jumper, phase: st.phase, state: st.state, plan: st.plan, tilt: st.box && st.box.tilt,
      off: st.beat0 != null ? ((G.time - st.beat0) / D.beatT) : 0, lastSlot: st.lastSlot, note: st.note, pop: !!st.pop, yoyoT: st.yoyo ? st.yoyo.t : 0,
      j: st.j && { x: st.j.x, y: st.j.y, vx: st.j.vx, vy: st.j.vy }, t: window.__simT, intro: G.introT, N: st.c && st.c.tune.length, haul: st.haul };
  });
  const seen = { crank: false, aim: false, hook: false, squish: false, steer: false, hop: false, walk: false, yoyo: false, haul: false };
  let tapT = [0, 0];
  const shoot = async t => {
    await page.waitForTimeout(150);
    const f = path.join(out, 'jackbox-' + (tag || input) + '-r' + room + '-' + t + 's-' + vw + 'x' + vh + '.png');
    await page.screenshot({ path: f });
    const s = await state();
    console.log(f, JSON.stringify({ mode: s.mode, room: s.room, phase: s.phase, j: s.j && [Math.round(s.j.x), Math.round(s.j.y)] }));
  };
  const cpuSide = id => solo && id !== human;
  const tap = async (id, s) => { if (s.t >= tapT[id]) { await set(id, 'act', true); tapT[id] = s.t + 0.15; return true; } return false; };
  const plays = async limit => {
    while (true) {
      const s = await state();
      if (s.t >= limit || s.mode !== 'play') break;
      const pl = s.plan || {}, cr = s.cranker, jm = s.jumper;
      // let go of a tapped action after one tick
      for (const id of [0, 1]) if (held[id].has('act') && s.t >= tapT[id] - 0.1) await set(id, 'act', false);
      if (s.state === 'play' && !(s.intro > 0)) {
        if (!cpuSide(cr)) {
          if (s.phase === 'crank' && !s.pop) {
            await set(cr, 'left', s.tilt > pl.tilt && (s.t * 10 | 0) % 3 === 0); await set(cr, 'right', s.tilt < pl.tilt && (s.t * 10 | 0) % 3 === 0);
            const slot = Math.round(s.off), off = s.off - slot;
            if (slot >= 0 && slot !== s.lastSlot && Math.abs(off) < 0.1 && !held[cr].has('act')) await tap(cr, s);
          } else { await set(cr, 'left', false); await set(cr, 'right', false); }
          if (s.phase === 'hook' && s.yoyoT > 0.9 && !held[cr].has('act')) await tap(cr, s);
        }
        if (!cpuSide(jm)) {
          await set(jm, 'down', s.phase === 'crank' && s.note >= s.N / 2);
          if (s.phase === 'fly') { await set(jm, 'right', pl.steer > 0); await set(jm, 'left', pl.steer < 0); await set(jm, 'up', !!pl.hop); }
          else if (s.phase === 'yoyo') { await set(jm, 'right', pl.walk > 0); await set(jm, 'left', pl.walk < 0); await set(jm, 'up', false); if (pl.atHook && !held[jm].has('act')) await tap(jm, s); }
          else { await set(jm, 'right', false); await set(jm, 'left', false); await set(jm, 'up', false); }
          if (s.phase === 'haul' && !held[jm].has('act')) await tap(jm, s);
        }
      } else for (const id of [0, 1]) for (const k of ['up', 'down', 'left', 'right', 'act']) await set(id, k, false);
      const s2 = await page.evaluate(() => { const P = window.__pipbo; const st = P.G.mst; const b = { tilt: st.box && st.box.tilt, note: st.note, sq: st.j && st.j.sq, vx: st.j && st.j.vx, hop: st.j && st.j.hop, phase: st.phase, haul: st.haul, x: st.j && st.j.x };
        for (let i = 0; i < 6; i++) { P.pollInput(P.DT); P.step(P.DT); window.__simT += P.DT; }
        const a = { tilt: st.box && st.box.tilt, note: st.note, sq: st.j && st.j.sq, vx: st.j && st.j.vx, hop: st.j && st.j.hop, phase: st.phase, haul: st.haul, x: st.j && st.j.x };
        return { b, a }; });
      const { a, b } = s2;
      if (b.phase === 'crank' && a.note > b.note) seen.crank = true;
      if (a.tilt !== b.tilt && a.phase === 'crank') seen.aim = true;
      if (b.phase === 'hook' && a.phase === 'haul') seen.hook = true;
      if (a.sq > 0.5) seen.squish = true;
      if (b.phase === 'fly' && a.phase === 'fly' && Math.abs(a.vx - b.vx) > 20) seen.steer = true;
      if (!b.hop && a.hop) seen.hop = true;
      if (b.phase === 'yoyo' && a.phase === 'yoyo' && Math.abs(a.x - b.x) > 3) seen.walk = true;
      if (b.phase === 'yoyo' && a.phase === 'hook') seen.yoyo = true;
      if (b.phase === 'haul' && a.haul > b.haul) seen.haul = true;
    }
  };
  for (const t of at) { await plays(t); await shoot(t); }
  if (until === 'clear') {
    await plays(1e9);
    for (const id of [0, 1]) for (const k of ['up', 'down', 'left', 'right', 'act']) await set(id, k, false);
    await page.evaluate(() => { const P = window.__pipbo; for (let i = 0; i < 400; i++) P.step(P.DT); });
    await page.waitForTimeout(2200);
    const f = path.join(out, 'jackbox-' + (tag || input) + '-results-' + vw + 'x' + vh + '.png');
    await page.screenshot({ path: f });
    const m = await page.evaluate(() => ({ mode: window.__pipbo.G.mode, t: window.__pipbo.G.time, st: window.__pipbo.G.mst.stats }));
    console.log(f, JSON.stringify({ mode: m.mode, t: Math.round(m.t), stars: m.st.stars, boings: m.st.boings, helps: m.st.helps }));
    ok(m.mode === 'result', 'played through to the results card (' + m.mode + ' at ' + Math.round(m.t) + ' s)');
  }
  if (pauseShot) {
    await page.evaluate(() => window.__pipbo.pause());
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, 'jackbox-' + (tag || input) + '-pause-' + vw + 'x' + vh + '.png') });
  }
  const lastT = at[at.length - 1];
  // what each person's job showed (in 1-player mode only the person's own jobs, unless played to the end)
  const checks = { crank: 'the cranker cranks', aim: 'the cranker aims', hook: 'the cranker hooks the box', squish: 'the jumper squishes the spring',
    steer: 'the jumper steers', walk: 'the jumper walks to the hook', yoyo: 'the jumper drops the yo-yo', haul: 'the jumper hauls' };
  if (until || lastT >= 14) for (const [k, w] of Object.entries(checks)) if (!solo || until) ok(seen[k], input + ': ' + w);
  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); fails++; }
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
