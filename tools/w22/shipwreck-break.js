#!/usr/bin/env node
// Shipwreck Lights: tries to break 22-3.
//  solo     the computer plays one seat with no idle stop, the other seat presses nothing: no section may clear
//  lone     a lone person who swims right, hugs the walls and mashes the action (the other seat idle): no clear
//  idle     nobody presses anything for 60 s: the clock waits (rest) and nothing breaks
//  masher   1-player mode: a button-masher (random direction + action) with the computer: may clear slowly (Bronze)
//  mash2    two button-mashers, no computer: must not get stuck in a wall or throw; prints how far they got
//  person   1-player mode, the computer as each role, the "person" is the brain made slow (0.35 s late, pauses)
//  wander   1-player mode, the person wanders off left for 20 s first, then plays (the computer must wait, not leave)
// Usage: node tools/w22/shipwreck-break.js [--only=solo,idle,...]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const only = opt('only', 'solo,lone,idle,masher,mash2,person,wander').split(',');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    Math.random = gen(777);
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(() => {
    const P = window.__pipbo, G = P.G;
    window.__load = (room, cpuOn) => {
      G.manual = true; G.cpuOn = cpuOn; P.CPU.filter = null; P.CPU.idleStop = 30;
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Shipwreck Lights'));
      for (let k = 0; k < room; k++) P.nextRoom();
      G.introT = 0;
    };
    window.__set = (p, o) => { for (const k of ['left', 'right', 'down', 'up', 'act', 'jump']) p.input[k] = !!o[k]; if (o.act && !p.prevAct) p.pendingAct = true; p.prevAct = !!o.act; if (o.jump && !p.prevJump) p.pendingJump = true; p.prevJump = !!o.jump; };
    window.__stuck = () => {
      // is any player inside a solid?
      const st = G.mst, sol = P.MODES.shipwreck.solids(st);
      return G.players.some(p => { const x = p.x + st.camX; return sol.some(s => x < s.x1 - 1 && x + p.w > s.x0 + 1 && p.y < s.y1 - 1 && p.y + p.h > s.y0 + 1); });
    };
  });
  const run = (name, fn, a) => page.evaluate(fn, a).then(r => console.log(name.padEnd(8), JSON.stringify(r)));

  if (only.includes('solo')) for (const room of [0, 1, 2, 3]) for (const cpu of [0, 1]) {
    await run('solo', ({ room, cpu }) => {
      const P = window.__pipbo, G = P.G;
      window.__load(room, [cpu === 0, cpu === 1]); P.CPU.idleStop = 1e9;
      const st = G.mst;
      let n = 0;
      for (; n < 200 / P.DT && G.mode === 'play' && G.room === room && st.state === 'play'; n++) P.step(P.DT);
      const nd = P.MODES.shipwreck.need(st);
      return { room, cpuRole: st.lantern === cpu ? 'lantern' : 'grabber', advanced: G.room !== room || G.mode !== 'play' || st.state !== 'play', stuckAt: nd.kind, x: (G.players[cpu].x + st.camX) | 0, gold: st.goldUsed };
    }, { room, cpu });
  }
  if (only.includes('lone')) for (const room of [0, 1, 2, 3]) for (const who of [0, 1]) {
    await run('lone', ({ room, who }) => {
      const P = window.__pipbo, G = P.G;
      window.__load(room, [false, false]);
      const st = G.mst, p = G.players[who];
      for (let n = 0; n < 200 / P.DT && G.room === room && st.state === 'play'; n++) {
        const k = Math.floor(n / 90) % 6;
        window.__set(p, { right: k !== 5, left: k === 5, up: k % 2 === 0, down: k % 2 === 1, act: n % 20 < 10 });
        P.step(P.DT);
      }
      return { room, role: st.lantern === who ? 'lantern' : 'grabber', advanced: G.room !== room || st.state !== 'play', at: P.MODES.shipwreck.need(st).kind, x: (p.x + st.camX) | 0, stuck: window.__stuck() };
    }, { room, who });
  }
  if (only.includes('idle')) {
    await run('idle', () => {
      const P = window.__pipbo, G = P.G;
      window.__load(0, [false, false]);
      for (let n = 0; n < 60 / P.DT; n++) P.step(P.DT);
      return { time: +G.time.toFixed(1), rest: G.mst.rest, state: G.mst.state, gold: G.mst.goldUsed, hints: G.mst.stats.hints };
    });
    await run('idle1p', () => {
      const P = window.__pipbo, G = P.G;
      window.__load(0, [false, true]);
      for (let n = 0; n < 90 / P.DT; n++) P.step(P.DT);
      const st = G.mst;
      return { time: +G.time.toFixed(1), rest: st.rest, need: P.MODES.shipwreck.need(st).kind, cpuX: (G.players[1].x + st.camX) | 0, gold: st.goldUsed };
    });
  }
  if (only.includes('masher')) for (const cpu of [0, 1]) for (const seed of [1, 2]) {
    await run('masher', ({ cpu, seed }) => {
      const P = window.__pipbo, G = P.G;
      window.__load(0, [cpu === 0, cpu === 1]);
      let s = seed * 9973; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
      const p = G.players[1 - cpu];
      let cur = {}, hold = 0, stuck = 0;
      for (let n = 0; n < 900 / P.DT && G.mode === 'play'; n++) {
        if (--hold <= 0) { hold = 10 + Math.floor(rnd() * 50); cur = { left: rnd() < 0.3, right: rnd() < 0.55, up: rnd() < 0.35, down: rnd() < 0.35, act: rnd() < 0.5 }; }
        window.__set(p, cur);
        P.step(P.DT);
        if (n % 600 === 0 && G.mode === 'play' && window.__stuck()) stuck++;
      }
      const st = G.mst;
      return { cpuSeat: cpu, mode: G.mode, room: G.room, t: +G.time.toFixed(1), medal: P.MODES.shipwreck.medalOf(st), bonks: st.stats.bonks, gems: st.stats.gems, gold: st.goldUsed, stuck };
    }, { cpu, seed });
  }
  if (only.includes('mash2')) {
    await run('mash2', () => {
      const P = window.__pipbo, G = P.G;
      window.__load(0, [false, false]);
      let s = 4242; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
      const cur = [{}, {}], hold = [0, 0]; let stuck = 0;
      for (let n = 0; n < 600 / P.DT && G.mode === 'play'; n++) {
        for (const p of G.players) {
          if (--hold[p.id] <= 0) { hold[p.id] = 10 + Math.floor(rnd() * 50); cur[p.id] = { left: rnd() < 0.3, right: rnd() < 0.55, up: rnd() < 0.35, down: rnd() < 0.35, act: rnd() < 0.5 }; }
          window.__set(p, cur[p.id]);
        }
        P.step(P.DT);
        if (n % 600 === 0 && G.mode === 'play' && window.__stuck()) stuck++;
      }
      const st = G.mst;
      return { mode: G.mode, room: G.room, t: +G.time.toFixed(1), need: P.MODES.shipwreck.need(st).kind, gold: st.goldUsed, bonks: st.stats.bonks, stuck };
    });
  }
  if (only.includes('person') || only.includes('wander')) for (const cpu of [0, 1]) for (const kind of ['person', 'wander']) {
    if (!only.includes(kind)) continue;
    await run(kind, ({ cpu, kind }) => {
      const P = window.__pipbo, G = P.G;
      window.__load(0, [cpu === 0, cpu === 1]);
      // the person: the same brain, but late and with pauses (it is not the computer, so it gets chips)
      const brain = P.CPU.brains.shipwreck, S = {}, lag = [];
      brain.reset(S);
      const p = G.players[1 - cpu], o = G.players[cpu];
      let pause = 0, room = 0, t = 0;
      for (let n = 0; n < 900 / P.DT && G.mode === 'play'; n++) {
        t += P.DT;
        if (G.room !== room) { room = G.room; brain.reset(S); }
        const info = { L: G.level, def: G.level.def, mst: G.mst, room: G.room, skill: 1, partnerCpu: true, partnerIdle: 0, frozen: false, intro: G.introT > 0, time: G.time };
        let r = brain.think(S, p, o, P.DT, info) || {};
        lag.push(r); r = lag.length > 42 ? lag.shift() : {};
        if (pause > 0) { pause -= P.DT; r = {}; } else if ((n * 7919) % 1000 < 2) pause = 1.5;
        if (kind === 'wander' && t < 20) r = { left: true, up: t % 4 < 2 };
        window.__set(p, { left: r.left, right: r.right, up: r.up, down: r.down, act: r.act === 'tap' ? (n % 2 === 0) : r.act });
        P.step(P.DT);
      }
      const st = G.mst;
      return { cpuRole0: cpu === 0 ? 'lantern' : 'grabber', mode: G.mode, room: G.room, t: +G.time.toFixed(1), medal: P.MODES.shipwreck.medalOf(st), bonks: st.stats.bonks, gems: st.stats.gems[0] + st.stats.gems[1] + '/' + st.stats.gemsAll, gold: st.goldUsed };
    }, { cpu, kind });
  }
  if (errors.length) console.log('ERRORS', [...new Set(errors)].join('\n'));
  await browser.close();
})();
