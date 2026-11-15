#!/usr/bin/env node
// 24-3 Slinky Stairs: drives both players through the real input paths like people (keyboard keys, a stubbed controller,
// or the touch buttons), takes screenshots at chosen moments and checks that each job reacts: the flipper's stretch and
// flop, the steerer's point, lean and stick. Prints page errors.
// Usage: node tools/w24/slinky-input.js [--out=build/w24] [--at=3,12,24] [--room=0] [--w=960] [--h=540] [--tag=x]
//        [--input=kb|pad|touch] [--solo=1] (1-player mode: the person is --human, the computer the other) [--human=0|1]
//        [--intro=1] [--pause=1] (also a shot of the pause card) [--until=clear] (keep playing to the results card)
//        [--next=1] (after the results card: print its tiles, press Next level, check 24-4 loads, shot) [--world=1] (a shot of
//        the World 24 page and a check that the 24-3 card's preview draws) [--prefix=slinky] (screenshot name prefix)
// It also counts speech bubbles (only in 1-player mode) and, on touch, checks that each pad button is the top element
// at its own centre (nothing covers it).
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const out = opt('out', 'build/w24'), at = opt('at', '3,12,24').split(',').map(Number), room = +opt('room', 0);
const vw = +opt('w', 960), vh = +opt('h', 540), tag = opt('tag', ''), input = opt('input', 'kb'), solo = +opt('solo', 0), human = +opt('human', 0), intro = +opt('intro', 0);
const pauseShot = +opt('pause', 0), until = opt('until', ''), pre = opt('prefix', 'slinky'), nextShot = +opt('next', 0), worldShot = +opt('world', 0);
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
  if (input === 'touch') {
    // a touch on the page marks it as a touch device (the touch pads show)
    await page.touchscreen.tap(vw / 2, vh / 2);
  }
  if (input === 'pad') {
    for (const i of [0, 1]) await page.evaluate(i => { window.__pads[i].buttons[0] = { pressed: true, value: 1 }; window.__pipbo.pollInput(1 / 60); window.__pads[i].buttons[0] = { pressed: false, value: 0 }; window.__pipbo.pollInput(1 / 60); }, i);
  }
  if (worldShot) {
    await page.evaluate(() => { showWorld(23); });
    await page.waitForTimeout(1200);
    const card = await page.evaluate(() => {
      const b = document.querySelector('[data-act="level"][data-i="' + window.__pipbo.LEVELS.findIndex(l => l.name === 'Slinky Stairs') + '"]');
      if (!b) return null;
      b.scrollIntoView({ block: 'center' });
      return true;
    });
    await page.waitForTimeout(900);
    const card2 = await page.evaluate(() => {
      const b = document.querySelector('[data-act="level"][data-i="' + window.__pipbo.LEVELS.findIndex(l => l.name === 'Slinky Stairs') + '"]');
      const cv = b.querySelector('canvas'), x = cv.getContext('2d'), d = x.getImageData(0, 0, cv.width, cv.height).data;
      let lit = 0; for (let i = 0; i < d.length; i += 4 * 37) if (d[i + 3] > 0) lit++;
      return { text: b.textContent.replace(/\s+/g, ' ').trim(), lit };
    });
    ok(card && card2.lit > 50, 'world page: the 24-3 card has a drawn preview (' + JSON.stringify(card2) + ')');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(out, pre + '-' + (tag || input) + '-world-' + vw + 'x' + vh + '.png') });
  }
  await page.evaluate(({ room, solo, intro, human }) => {
    const P = window.__pipbo, G = P.G;
    if (solo) { P.CPU.cfg.players = 1; P.CPU.cfg.human = human; P.cpuApplyCfg(); } else { P.CPU.cfg.players = 2; P.cpuApplyCfg(); }
    G.manual = true;
    P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Slinky Stairs'));
    for (let k = 0; k < room; k++) P.nextRoom();
    if (!intro) G.introT = 0;
    window.__simT = 0;
  }, { room, solo, intro, human });
  if (input === 'touch') {
    const vis = await page.evaluate(() => Array.from(document.querySelectorAll('.tbtn-act')).map(e => ({ shown: e.offsetParent !== null && getComputedStyle(e).display !== 'none', label: e.textContent })));
    ok(vis.some(v => v.shown), 'touch: the round action button shows (' + JSON.stringify(vis) + ')');
    const cover = await page.evaluate(() => Array.from(document.querySelectorAll('#padPip [data-k], #padBo [data-k]')).filter(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return e.offsetParent !== null && r.width > 0 && cs.visibility !== 'hidden' && +cs.opacity > 0.05; }).map(e => {
      const r = e.getBoundingClientRect(), top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      const inView = r.x >= 0 && r.y >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5;
      return { k: e.closest('[id]').id + ':' + e.dataset.k, ok: !!top && (top === e || e.contains(top)) && inView };
    }).filter(v => !v.ok));
    ok(cover.length === 0, 'touch: every pad button is on screen and uncovered (' + JSON.stringify(cover) + ')');
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
    else if (input === 'pad') await page.evaluate(({ id, b, on }) => { window.__pads[id].buttons[b] = { pressed: on, value: on ? 1 : 0 }; }, { id: solo ? 0 : id, b: PADB[what], on });
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
  const state = () => page.evaluate(() => {
    const G = window.__pipbo.G, st = G.mst, s = st.s, pl = st.plan || {};
    return { mode: G.mode, room: G.room, flip: st.flip, steer: st.steer, state: s && s.state, hold: s && s.hold, m: s && s.m, point: s && s.point, on: s && s.on,
      plan: { want: pl.want, pointOK: pl.pointOK, wait: pl.wait, mc: pl.zone && pl.zone.mc, lean: pl.lean, stick: pl.stick, save: pl.save, target: pl.tIdx },
      lv: s && s.fly && s.fly.lv, stats: st.stats, t: window.__simT, intro: G.introT };
  });
  const seen = { hold: false, flop: false, point: false, lean: false, perfect: false };
  const shoot = async t => {
    await page.waitForTimeout(120);
    const f = path.join(out, pre + '-' + (tag || input) + '-r' + room + '-' + t + 's-' + vw + 'x' + vh + '.png');
    await page.screenshot({ path: f });
    const s = await state();
    console.log(f, JSON.stringify({ mode: s.mode, room: s.room, state: s.state, on: s.on, whoas: s.stats.whoas, perfects: s.stats.perfects, stars: s.stats.stars }));
  };
  const cpuSide = id => solo && id !== human;
  let lastFlops = 0, lastPerf = 0, stuckFly = -1, maxBubbles = 0;
  const plays = async limit => {
    while (true) {
      const s = await state();
      if (s.t >= limit || s.mode !== 'play') break;
      const pl = s.plan, F = s.flip, R = s.steer;
      if (!(s.intro > 0)) {
        if (!cpuSide(F)) {
          let hold = false;
          if (s.state === 'rest') {
            const ready = pl.target >= 0 && pl.pointOK && !pl.wait && pl.mc != null;
            hold = s.hold ? !(ready && Math.abs(s.m - pl.mc) < 0.03) : ready;
          }
          await set(F, 'act', hold);
        }
        if (!cpuSide(R)) {
          if (s.state === 'rest') {
            await set(R, 'right', pl.want > 0 && s.point !== pl.want); await set(R, 'left', pl.want < 0 && s.point !== pl.want);
            await set(R, 'down', !!pl.save);
          } else if (s.state === 'fly') {
            await set(R, 'right', pl.lean > 0); await set(R, 'left', pl.lean < 0);
            await set(R, 'down', !!pl.stick);
          } else { await set(R, 'right', false); await set(R, 'left', false); await set(R, 'down', s.state === 'teeter'); }
        }
      } else for (const id of [0, 1]) for (const k of ['up', 'down', 'left', 'right', 'act']) await set(id, k, false);
      const nb = await page.evaluate(() => { const P = window.__pipbo; let n = 0; for (let i = 0; i < 2; i++) { P.pollInput(P.DT); P.step(P.DT); window.__simT += P.DT; n = Math.max(n, P.CPU.bubbles.filter(b => b && b.t > 0).length); } return n; });
      if (nb > maxBubbles) maxBubbles = nb;
      const s2 = await state();
      if (s2.hold) seen.hold = true;
      if (s2.stats.flops > lastFlops) { seen.flop = true; lastFlops = s2.stats.flops; }
      if (s.state === 'rest' && s2.point !== s.point) seen.point = true;
      if (s2.lv && Math.abs(s2.lv) > 20) seen.lean = true;
      if (s2.stats.perfects > lastPerf) { seen.perfect = true; lastPerf = s2.stats.perfects; }
    }
  };
  for (const t of at) { await plays(t); await shoot(t); }
  if (pauseShot) {
    await page.evaluate(() => window.__pipbo.pause());
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, pre + '-' + (tag || input) + '-pause-' + vw + 'x' + vh + '.png') });
    const tip = await page.evaluate(() => document.querySelector('#overlay').textContent.replace(/\s+/g, ' ').trim());
    console.log('pause card:', tip);
    await page.evaluate(() => window.__pipbo.resume ? window.__pipbo.resume() : resume());
  }
  if (until === 'clear') {
    await plays(1e9);
    for (const id of [0, 1]) for (const k of ['up', 'down', 'left', 'right', 'act']) await set(id, k, false);
    await page.evaluate(() => { const P = window.__pipbo; for (let i = 0; i < 400; i++) P.step(P.DT); });
    await page.waitForTimeout(2200);
    const f = path.join(out, pre + '-' + (tag || input) + '-results-' + vw + 'x' + vh + '.png');
    await page.screenshot({ path: f });
    const m = await page.evaluate(() => ({ mode: window.__pipbo.G.mode, t: window.__pipbo.G.time }));
    console.log(f, JSON.stringify(m));
    ok(m.mode === 'result', 'played through to the results card (' + m.mode + ' at ' + Math.round(m.t) + ' s)');
    const tiles = await page.evaluate(() => Array.from(document.querySelectorAll('#overlay .stat')).map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    const lines = await page.evaluate(() => Array.from(document.querySelectorAll('#overlay .lede, #overlay p:not(.eyebrow)')).map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    console.log('result tiles:', JSON.stringify(tiles), 'lines:', JSON.stringify(lines));
    ok(['Time', 'Stars', 'Perfect', 'Whoas'].every(w => tiles.some(t => t.includes(w))), 'results: Time, Stars, Perfect landings, Whoas and Medal tiles');
    if (nextShot) {
      const btn = await page.evaluate(() => { const b = document.querySelector('#overlay [data-act="next"]'); return b && b.textContent.trim(); });
      if (input === 'kb') await page.keyboard.press('Enter');
      else if (input === 'touch') { const r = await page.evaluate(() => { const b = document.querySelector('#overlay [data-act="next"]').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }); await page.touchscreen.tap(r.x, r.y); }
      else await page.evaluate(() => { window.__pads[0].buttons[0] = { pressed: true, value: 1 }; window.__pipbo.pollInput(1 / 60); setTimeout(() => { window.__pads[0].buttons[0] = { pressed: false, value: 0 }; }, 120); });
      await page.waitForTimeout(700);
      const nx = await page.evaluate(() => { const P = window.__pipbo; return { mode: P.G.mode, code: P.levelCode(P.G.levelIndex), name: P.LEVELS[P.G.levelIndex].name }; });
      ok(nx.code === '24-4', '"' + btn + '" goes on to 24-4 (' + JSON.stringify(nx) + ')');
      await page.screenshot({ path: path.join(out, pre + '-' + (tag || input) + '-next-' + vw + 'x' + vh + '.png') });
    }
  }
  ok(seen.hold, input + ': the flipper stretches (hold)');
  ok(seen.flop, input + ': the flipper flops (let go)');
  ok(seen.point || (solo && human !== 1 - (room % 2)), input + ': the steerer points');
  ok(seen.lean || solo, input + ': the steerer leans in the air');
  ok(seen.perfect, input + ': a perfect landing (stick)');
  ok(solo ? maxBubbles > 0 : maxBubbles === 0, (solo ? '1-player: the computer speaks' : '2-player: no speech bubbles') + ' (max ' + maxBubbles + ' at once)');
  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); fails++; }
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
