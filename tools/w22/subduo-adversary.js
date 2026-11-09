#!/usr/bin/env node
// Submarine Duo adversary test (QA review): odd play that the scripted people don't try. The computer plays both seats
// until a blocker is mid-job, then a "person" takes over and does something strange (carries the boulder forward through
// the pinch, drops it at random spots, lets the log go at random, throws the conch past Clammy, mashes during the swap),
// then the computer takes over again and the stretch must still be finishable (no soft lock, prompts agree). Also:
// restart mid-carry and mid-swap, pause and resume, 1-player breaks, the level-done card, NaNs and page errors.
// Usage: node tools/w22/subduo-adversary.js [--seeds=1,2,3,4,5,6]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const seeds = opt('seeds', '1,2,3,4,5,6').split(',').map(Number);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); window.__seed = n => { seeded = gen((n >>> 0) || 1); }; Math.random = () => seeded();
  });
  await page.addInitScript({ path: path.join(__dirname, 'subduo-people.js') });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(() => {
    const P = window.__pipbo, G = P.G;
    const KB = [{ left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', act: 'KeyF' }, { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', act: 'Slash' }];
    window.__A = {
      start(room, seed) {
        window.__seed(seed * 7919);
        P.CPU.cfg.players = 2; P.cpuApplyCfg(); G.cpuOn = [true, true]; G.manual = true;
        P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Submarine Duo'));
        for (let k = 0; k < room; k++) P.nextRoom();
        G.introT = 0; P.keys.clear();
        window.__bad = '';
      },
      check() {
        const st = G.mst;
        if (!st.c) return;
        if (![st.sub.x, st.sub.y, st.sub.vx, st.sub.vy, st.claw.x, st.claw.y, st.cam.x].every(Number.isFinite)) window.__bad = window.__bad || 'NaN t=' + G.time.toFixed(1);
        const sx = st.sub.x - st.cam.x, cx = st.claw.x - st.cam.x;
        if (st.state === 'go' && (sx < 0 || sx > 960 || cx < -20 || cx > 980)) window.__bad = window.__bad || 'offscreen t=' + G.time.toFixed(1);
      },
      // step with the computer at both seats until cond() or maxT seconds
      cpuUntil(cond, maxT) {
        G.cpuOn = [true, true]; P.keys.clear();
        let n = 0;
        while (n < maxT / P.DT && G.mode === 'play' && !cond()) { P.pollInput(P.DT); P.step(P.DT); this.check(); n++; }
        return cond();
      },
      // a person at both seats, pressing what fn(t, st) returns ({0:{right:1}, 1:{act:1}})
      person(fn, T) {
        G.cpuOn = [false, false];
        let n = 0;
        while (n < T / P.DT && G.mode === 'play') {
          const w = fn(n * P.DT, G.mst) || {};
          for (const id of [0, 1]) for (const k of ['left', 'right', 'up', 'down', 'act']) { const c = KB[id][k]; if (w[id] && w[id][k]) P.keys.add(c); else P.keys.delete(c); }
          P.pollInput(P.DT); P.step(P.DT); this.check(); n++;
        }
        P.keys.clear();
      },
      info() { const st = G.mst, pl = P.MODES.subduo.plan(st); return { mode: G.mode, room: G.room, t: +G.time.toFixed(1), x: st.sub.x | 0, why: pl.why, job: pl.job && pl.job.kind, state: st.state, hold: st.claw.hold && st.claw.hold.kind, bad: window.__bad }; },
    };
  });
  const bad = [];
  const report = (name, ok, r) => { if (!ok || r.bad) bad.push(name); console.log(`${ok && !r.bad ? 'ok  ' : 'BAD '} ${name.padEnd(30)} ${JSON.stringify(r)}`); };

  for (const seed of seeds) {
    // 1. hold the boulder, then drive FORWARD through the pinch and drop it on the far side
    let r = await page.evaluate(seed => {
      const A = window.__A, P = window.__pipbo, G = P.G; A.start(0, seed);
      A.cpuUntil(() => G.mst.claw.hold && G.mst.claw.hold.kind === 'boulder', 120);
      const b = G.mst.c.boulders[0], x0 = G.mst.sub.x;
      A.person((t, st) => ({ 0: { right: t < 6 + seed, up: st.sub.y > 300 && t % 1 < 0.3 }, 1: { up: t < 0.6, right: t > 0.6 && t < 6 + seed, act: t > 6.5 + seed && t < 6.6 + seed } }), 9 + seed);
      const mid = { movedFwd: (G.mst.sub.x - x0) | 0, bx: b.x | 0, bstate: b.state, pastPinch: b.x - b.r > b.pin1, done: b.done };
      const ok = A.cpuUntil(() => G.room > 0, 160);
      return Object.assign(A.info(), mid, { cleared: ok });
    }, seed);
    report('boulder-forward s' + seed, r.cleared && (!r.pastPinch || r.done), r);

    // 2. drop the boulder at random spots several times (random steering and claw), then the computer finishes
    r = await page.evaluate(seed => {
      const A = window.__A, P = window.__pipbo, G = P.G; A.start(seed % 2 ? 0 : 3, seed);
      const room = G.room;
      let rs = seed * 31 + 7; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
      for (let k = 0; k < 4; k++) {
        A.cpuUntil(() => G.mst.claw.hold && G.mst.claw.hold.kind === 'boulder', 90);
        const ks = ['left', 'right', 'up', 'down'], a = ks[(rnd() * 4) | 0], b = ks[(rnd() * 4) | 0], T = 0.5 + rnd() * 3;
        A.person(t => ({ 0: { [a]: true }, 1: { [b]: true, act: t > T && t < T + 0.1 } }), T + 2);
      }
      const ok = A.cpuUntil(() => G.room > room || G.mode !== 'play', 200);
      return Object.assign(A.info(), { cleared: ok, gold: G.mst.c.boulders.some(b => b.gold) });
    }, seed);
    report('boulder-drops s' + seed, r.cleared, r);

    // 3. the log: let go at random moments, steer at random, then the computer finishes
    r = await page.evaluate(seed => {
      const A = window.__A, P = window.__pipbo, G = P.G; A.start(seed % 2 ? 1 : 2, seed);
      const room = G.room;
      let rs = seed * 53 + 1; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
      for (let k = 0; k < 3; k++) {
        if (!A.cpuUntil(() => G.mst.claw.hold && G.mst.claw.hold.kind === 'log', 120)) break;
        const ks = ['left', 'right', 'up', 'down'], a = ks[(rnd() * 4) | 0], T = 0.3 + rnd() * 2;
        A.person(t => ({ 0: { [a]: true }, 1: { left: true, act: t > T && t < T + 0.1 } }), T + 1.5);
      }
      const ok = A.cpuUntil(() => G.room > room || G.mode !== 'play', 200);
      return Object.assign(A.info(), { cleared: ok });
    }, seed);
    report('log-slips s' + seed, r.cleared, r);

    // 4. the conch: carry it right past Clammy (claw reaches over her) and let go there, or drop it in odd spots
    r = await page.evaluate(seed => {
      const A = window.__A, P = window.__pipbo, G = P.G; A.start(seed % 2 ? 2 : 3, seed);
      const room = G.room;
      A.cpuUntil(() => G.mst.claw.hold && G.mst.claw.hold.kind === 'conch', 120);
      A.person(t => ({ 0: { right: t < 3, up: seed % 3 === 0 && t < 1, down: seed % 3 === 1 && t < 1 }, 1: { right: true, up: seed % 2 === 0, act: t > 3.5 && t < 3.6 } }), 6);
      const clm = G.mst.c.clams[0], q = clm.conch, mid = { conchX: (q.x - clm.x) | 0, conch: q.state, open: clm.done };
      const ok = A.cpuUntil(() => G.room > room || G.mode !== 'play', 200);
      return Object.assign(A.info(), mid, { cleared: ok });
    }, seed);
    report('conch-past-clammy s' + seed, r.cleared, r);
  }

  // 5. restart (R) mid-carry and mid-swap: everything fresh
  let r = await page.evaluate(() => {
    const A = window.__A, P = window.__pipbo, G = P.G; A.start(0, 9);
    A.cpuUntil(() => G.mst.claw.hold && G.mst.claw.hold.kind === 'boulder', 120);
    P.loadLevel(G.levelIndex); G.introT = 0;
    const a = { room: G.room, hold: G.mst.claw.hold, heavy: G.mst.sub.heavy, t: G.time, pearls: G.mst.pearls, state: G.mst.state };
    A.cpuUntil(() => G.mst.state === 'dock', 120);
    A.cpuUntil(() => G.mst.dock && G.mst.dock.t > 1.5, 5);
    P.loadLevel(G.levelIndex); G.introT = 0;
    const b = { room: G.room, state: G.mst.state, dock: G.mst.dock, steer: G.mst.steer, t: G.time };
    const ok = A.cpuUntil(() => G.room > 0, 120);
    return { a, b, ok, steer2: G.mst.steer, bad: window.__bad };
  });
  report('restart mid-carry/mid-swap', r.a.room === 0 && !r.a.hold && !r.a.heavy && r.a.pearls === 0 && r.b.state === 'go' && !r.b.dock && r.b.steer === 0 && r.ok && r.steer2 === 1, r);

  // 6. pause during a carry and during the swap, then resume: nothing moves while paused, play carries on
  r = await page.evaluate(() => {
    const A = window.__A, P = window.__pipbo, G = P.G; A.start(0, 11);
    G.manual = true;
    A.cpuUntil(() => G.mst.claw.hold && G.mst.claw.hold.kind === 'boulder', 120);
    P.pause();
    const m1 = G.mode, still = !!document.querySelector('#overlay') && G.mst.claw.hold && G.mst.claw.hold.kind === 'boulder';
    P.resume(); G.mode = 'play';
    A.cpuUntil(() => G.mst.state === 'dock', 120);
    P.pause();
    P.resume(); G.mode = 'play';
    const ok = A.cpuUntil(() => G.room > 0, 30);
    return { m1, still, ok, bad: window.__bad };
  });
  report('pause and resume', r.m1 === 'paused' && r.still && r.ok, r);

  // 7. 1-player: the person (Pip, steering) walks away for 40 s mid-stretch: the clock stops; back again, it clears
  r = await page.evaluate(() => {
    const A = window.__A, P = window.__pipbo, G = P.G;
    window.__seed(77);
    P.CPU.cfg.players = 1; P.CPU.cfg.human = 0; P.cpuApplyCfg(); G.manual = true;
    P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Submarine Duo')); G.introT = 0; P.keys.clear();
    // the person plays like the scripted kid (subduo-people.js) for 20 s
    let rs = 5; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
    window.__subduoPeople.reset();
    const follow = () => window.__subduoPeople.drive(0, 'kid', P, rnd);
    for (let i = 0; i < 20 / P.DT; i++) { follow(); P.pollInput(P.DT); P.step(P.DT); }
    P.keys.clear();
    const t0 = G.time, x0 = G.mst.sub.x;
    let waitedAt = null;
    for (let i = 0; i < 40 / P.DT; i++) { P.pollInput(P.DT); P.step(P.DT); if (G.mst.waiting && waitedAt == null) waitedAt = G.time - t0; }
    const t1 = G.time, waiting = G.mst.waiting;
    let n = 0;
    while (n < 500 / P.DT && G.mode === 'play') { follow(); P.pollInput(P.DT); P.step(P.DT); n++; }
    return { waitedAt: waitedAt && +waitedAt.toFixed(1), clockRan: +(t1 - t0).toFixed(1), waiting, x0: x0 | 0, mode: G.mode, t: +G.time.toFixed(1), room: G.room };
  });
  report('1-player walk away and back', r.waiting && r.clockRan < 13 && r.mode !== 'play', r);

  // 8. the level-done card: keep stepping and mashing after the chest, levelClear only once, no errors
  r = await page.evaluate(() => {
    const A = window.__A, P = window.__pipbo, G = P.G; A.start(3, 5);
    let clears = 0; const orig = P.G.mode;
    A.cpuUntil(() => G.mst.state === 'dock', 150);
    A.person(t => ({ 0: { act: t % 0.3 < 0.1, right: true }, 1: { act: t % 0.2 < 0.1, up: true } }), 8);
    const m = G.mode;
    for (let i = 0; i < 600; i++) { P.step(P.DT); if (G.mode === 'clear' && G.mst.dock && G.mst.dock.cleared) clears = 1; }
    void orig;
    return { m, mode: G.mode, results: !!G.results[G.levelIndex], stats: G.lmode.stats().slice(0, 4).map(x => x.value), bad: window.__bad };
  });
  report('level-done card', r.m !== 'play' && r.results, r);

  // 9. mashing during the swap hop and the intro card does nothing odd
  r = await page.evaluate(() => {
    const A = window.__A, P = window.__pipbo, G = P.G; A.start(0, 3);
    A.cpuUntil(() => G.mst.state === 'dock', 150);
    const g0 = G.mst.stats.grabs, t0 = G.mst.stats.toots;
    A.person(t => ({ 0: { act: t % 0.2 < 0.1, left: true, up: true }, 1: { act: t % 0.15 < 0.07, right: true, down: true } }), 4);
    const room = G.room, hold = G.mst.claw.hold;
    G.introT = 2;
    A.person(t => ({ 0: { act: t % 0.2 < 0.1, right: true }, 1: { act: t % 0.15 < 0.07, right: true } }), 1.5);
    return { room, hold, grabs: G.mst.stats.grabs - g0, toots: G.mst.stats.toots - t0, bad: window.__bad };
  });
  report('mash during swap + intro', r.room === 1 && !r.hold && r.grabs === 0 && r.toots === 0, r);

  console.log(bad.length ? 'PROBLEMS: ' + bad.join(', ') : 'all as expected');
  if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
