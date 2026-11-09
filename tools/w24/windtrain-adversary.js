#!/usr/bin/env node
// Wind-Up Train Ride adversary: scripted "people" who play 24-1 in awkward ways through the real keyboard path (keys +
// pollInput), with the computer or with a prompt-following kid (tools/w24/windtrain-people.js) at the other seat.
// Each case says whether it must clear (true), must not clear (false) or either (null), and the run also checks for NaNs,
// a train or switcher off screen and page errors.
// Kinds (this file): nobrake (winds on the beat, never brakes), early (winds, brakes far too soon before stops and holds
//   it 3 s, then lets go), waiter (a kid switcher who stands still 20 s at every job before doing it), flipflop (a kid
//   switcher who flips every lever twice, back to where it was, then once more), ahead (runs to the right edge and taps
//   the action), behind (runs back behind the train every few seconds, then follows the prompts), rider (stays on the
//   caboose and taps the action), jumpy (a kid switcher who holds jump all the time), burst (a winder who mashes 6 quick
//   presses then rests 2 s).
// Usage: node tools/w24/windtrain-adversary.js [--who=all|name,name] [--seeds=1,2] [--max=600]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const seeds = opt('seeds', '1,2').split(',').map(Number), maxT = +opt('max', 600), whoArg = opt('who', 'all');
// [name, pip, bo, cpu seats, should clear?]  (a kind that is a winder in its stretches plays 'kid' as the switcher)
const CASES = [
  ['nobrake+cpu', 'nobrake', null, [false, true], true],
  ['cpu+nobrake', null, 'nobrake', [true, false], true],
  ['nobrake+kid', 'nobrake', 'kid', [false, false], true],
  ['early+cpu', 'early', null, [false, true], true],
  ['waiter+cpu', 'waiter', null, [false, true], true],
  ['cpu+waiter', null, 'waiter', [true, false], true],
  ['flipflop+cpu', 'flipflop', null, [false, true], true],
  ['cpu+flipflop', null, 'flipflop', [true, false], true],
  ['ahead+cpu', 'ahead', null, [false, true], false],
  ['cpu+ahead', null, 'ahead', [true, false], false],
  ['behind+cpu', 'behind', null, [false, true], true],
  ['cpu+behind', null, 'behind', [true, false], true],
  ['rider+cpu', 'rider', null, [false, true], false],
  ['cpu+rider', null, 'rider', [true, false], false],
  ['jumpy+cpu', 'jumpy', null, [false, true], true],
  ['cpu+jumpy', null, 'jumpy', [true, false], true],
  ['burst+cpu', 'burst', null, [false, true], null],
  ['burst+kid', 'burst', 'kid', [false, false], null],
  ['kid+waiter', 'kid', 'waiter', [false, false], true],
];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); window.__seed = n => { seeded = gen((n >>> 0) || 1); }; Math.random = () => seeded();
  });
  await page.addInitScript({ path: path.join(__dirname, 'windtrain-people.js') });
  await page.addInitScript(() => {
    const KB = [{ left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', act: 'KeyF' }, { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', act: 'Slash' }];
    const mem = [{}, {}];
    const tap = (m, k, every) => { m[k] = (m[k] || 0) - 1 / 120; if (m[k] <= 0) { m[k] = every; return true; } return m[k] > every - 0.06; };
    function want(id, kind, P, rnd) {
      const G = P.G, st = G.mst, M = P.MODES.windtrain, m = mem[id], w = {};
      if (!st.c || G.mode !== 'play') return null;
      const isW = id === st.wind, pl = M.plan(st), s = st.sw, tr = st.tr;
      const winders = ['nobrake', 'early', 'burst'];
      if (isW) {
        if (!winders.includes(kind)) return 'kid';
        if (kind === 'burst') { m.bt = (m.bt || 0) - 1 / 120; if (m.bt <= -2) m.bt = 0.9; if (m.bt > 0) w.act = Math.floor(m.bt / 0.075) % 2 === 0; return w; }
        if (tap(m, 'wt', 0.5) && tr.spring < 0.9) w.act = true;
        if (kind === 'early') {
          const far = pl.stopX != null && pl.stopX - tr.x < 320 && pl.stopX - tr.x > 140;
          if (far && !m.eDone) { m.eDone = pl.stopX; m.eT = 3; }
          if (m.eT > 0) { m.eT -= 1 / 120; w.down = true; return w; }
          if (m.eDone && pl.stopX !== m.eDone) m.eDone = null;
          return 'kid';
        }
        return w;
      }
      if (winders.includes(kind)) return 'kid';
      if (kind === 'ahead') { w.right = true; if (tap(m, 'at', 0.4)) w.act = true; return w; }
      if (kind === 'rider') { if (tap(m, 'at', 0.5)) w.act = true; return w; }
      if (kind === 'jumpy') { m.j = (m.j || 0) + 1; return Object.assign({ jumpAlways: true }); }
      if (kind === 'behind') {
        m.bt = (m.bt || 0) - 1 / 120;
        if (m.bt <= -6) m.bt = 1.5;
        if (m.bt > 0) { w.left = true; return w; }
        return 'kid';
      }
      if (kind === 'waiter') {
        const key = pl.job ? pl.job.kind + (pl.job.x | 0) : null;
        if (key && pl.can) { if (m.key !== key) { m.key = key; m.wt = 20; } }
        if (m.wt > 0 && m.key === key) { m.wt -= 1 / 120; return w; }
        return 'kid';
      }
      if (kind === 'flipflop') {
        // flip a good lever back to the dead end (twice), then let the kid fix it
        for (const sw of st.c.switches) {
          if (sw.taken || !sw.dead) continue;
          const d = Math.abs(s.x - sw.lever.x);
          m.ff = m.ff || {};
          if (d < 40 && sw.set !== sw.dead && (m.ff[sw.id] || 0) < 2) { m.ff[sw.id] = (m.ff[sw.id] || 0) + 1; m.fT = 0.1; }
        }
        if (m.fT > 0) { m.fT -= 1 / 120; w.act = m.fT < 0.05; return w; }
        return 'kid';
      }
      return 'kid';
    }
    window.__wtAdv = {
      reset() { mem[0] = {}; mem[1] = {}; },
      drive(id, kind, P, rnd) {
        if (!kind) return;
        if (kind === 'kid' || kind === 'idle') return window.__windtrainPeople.drive(id, kind, P, rnd);
        const w = want(id, kind, P, rnd);
        if (w === 'kid') return window.__windtrainPeople.drive(id, 'kid', P, rnd);
        if (w && w.jumpAlways) { window.__windtrainPeople.drive(id, 'kid', P, rnd); P.keys.add(KB[id].up); return; }
        const K = KB[id];
        for (const k of ['left', 'right', 'up', 'down', 'act']) { if (w && w[k]) P.keys.add(K[k]); else P.keys.delete(K[k]); }
      },
    };
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const bad = [];
  for (const [name, a, b, cpu, wantClear] of CASES) {
    if (whoArg !== 'all' && !whoArg.split(',').includes(name)) continue;
    for (const seed of seeds) {
      const r = await page.evaluate(({ a, b, cpu, seed, maxT }) => {
        const P = window.__pipbo, G = P.G;
        window.__seed(seed * 15485863);
        let rs = seed * 11 + 5; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
        if (cpu[0] || cpu[1]) { P.CPU.cfg.players = 1; P.CPU.cfg.human = cpu[0] ? 1 : 0; P.cpuApplyCfg(); } else { P.CPU.cfg.players = 2; P.cpuApplyCfg(); }
        G.cpuOn = cpu.slice(); G.manual = true;
        P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Wind-Up Train Ride'));
        G.introT = 0;
        P.keys.clear(); window.__windtrainPeople.reset(); window.__wtAdv.reset();
        let n = 0, room = 0, roomAt = [0], off = '', nanAt = '', waitT = 0, stop = 0, stopMax = 0, stopAt = '';
        while (n < maxT / P.DT && G.mode === 'play') {
          window.__wtAdv.drive(0, a, P, rnd); window.__wtAdv.drive(1, b, P, rnd);
          P.pollInput(P.DT); P.step(P.DT); n++;
          const st = G.mst;
          if (st.waiting) waitT += P.DT;
          if (G.room !== room) { room = G.room; roomAt.push(+G.time.toFixed(1)); }
          if (!nanAt && st.c && ![st.tr.x, st.tr.v, st.tr.spring, st.sw.x, st.sw.feet, st.sw.vx, st.sw.vy, st.cam.x].every(Number.isFinite)) nanAt = 't=' + G.time.toFixed(1);
          if (st.c && !off && st.state === 'go') {
            const nx = st.tr.x - st.cam.x, sx = st.sw.x - st.cam.x;
            if (nx < 100 || nx > 960 || sx < -10 || sx > 970 || st.sw.feet < 0 || (st.sw.feet > 600 && st.sw.ground)) off = `offscreen t=${G.time.toFixed(1)} nose ${nx | 0} sw(${sx | 0},${st.sw.feet | 0})`;
          }
          // longest time the train stood still (not braked by the plan's own stop and not waiting)
          if (st.state === 'go' && !st.waiting && Math.abs(st.tr.v) < 1 && !st.tr.rev) { stop += P.DT; if (stop > stopMax) { stopMax = stop; const pl = P.MODES.windtrain.plan(st); stopAt = `r${G.room} x=${st.tr.x | 0} why=${pl.why} job=${pl.job ? pl.job.kind : '-'}`; } } else stop = 0;
        }
        const st = G.mst, pl = P.MODES.windtrain.plan(st);
        return { mode: G.mode, t: +G.time.toFixed(1), real: +(n * P.DT).toFixed(0), room, roomAt, x: st.tr.x | 0, why: pl.why, job: pl.job && pl.job.kind,
          clunks: st.stats.clunks, helps: st.stats.helps, stars: st.stars + '/' + st.starsAll, pass: st.stats.passengers, off, nanAt, waitT: +waitT.toFixed(0), stopMax: +stopMax.toFixed(1), stopAt,
          res: G.mode !== 'play' ? JSON.stringify(G.lmode.stats().slice(0, 4).map(x => x.value)) : '' };
      }, { a, b, cpu, seed, maxT });
      const cleared = r.mode !== 'play';
      const ok = (wantClear === null || wantClear === cleared) && !r.off && !r.nanAt;
      if (!ok) bad.push(name + ' s' + seed);
      console.log(`${ok ? 'ok  ' : 'BAD '} ${name.padEnd(14)} s${seed} ${r.mode} t=${r.t} (sim ${r.real}s, waited ${r.waitT}s) stretch=${r.room + 1}/4 at ${r.roomAt.join(',')} x=${r.x} job=${r.job} plan=${r.why} clunks=${r.clunks} helps=${r.helps} stars=${r.stars} pass=${r.pass} longest stop ${r.stopMax}s (${r.stopAt}) ${r.res} ${r.off} ${r.nanAt ? 'NaN ' + r.nanAt : ''}`);
    }
  }
  // probe: "Taking a break" starts while the train runs at full speed just short of a block; coasting must not pass it
  if (whoArg === 'all' || whoArg.split(',').includes('coast')) {
    const r = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G;
      P.CPU.cfg.players = 2; P.cpuApplyCfg(); G.cpuOn = [false, false]; G.manual = true;
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Wind-Up Train Ride'));
      G.introT = 0; P.keys.clear();
      const st = G.mst, b = st.c.blocks[0];
      st.tr.x = b.x - 12; st.tr.v = P.MODES.windtrain.WTR.vmax; st.tr.spring = 1;
      st.personT = G.time - 13;
      for (let k = 0; k < 240; k++) { st.personT = Math.min(st.personT, G.time - 13); P.step(P.DT); }
      return { waiting: st.waiting, nose: st.tr.x, block: b.x, gone: b.gone };
    });
    const ok = r.waiting && r.nose <= r.block;
    if (!ok) bad.push('coast');
    console.log(`${ok ? 'ok  ' : 'BAD '} coast probe: waiting=${r.waiting} nose=${r.nose.toFixed(1)} block=${r.block}`);
  }
  console.log(bad.length ? 'PROBLEMS: ' + bad.join(', ') : 'all as expected');
  if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
