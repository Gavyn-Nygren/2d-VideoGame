/* Pip & Bo - Level 36-1 Car Chase, Take One (team, World 36 Movie Studio). */
'use strict';

/* ===== 36-1 Car Chase, Take One (mode 'takeone', team, scrolls right down the studio backlot, Gavyn's pick) =====
   Filming a car chase. One hero drives the stunt car; the other stands in the back with the scene dial and decides which
   movie you are in. Painted scenery walls (flats) block the road: the ones that match the current scene are paper and
   you burst through them, the rest are plywood. Jobs swap every take.
   Side view with depth; everything is in screen px with st.dist = how far the camera has come. The road has 3 lanes
   (depth bands S.laneY, 0 = far, 2 = near). The car sits left of centre and moves inside a window (S.winL..S.winR).
   The mode owns the tick, the picture and the HUD (ownStep + ownHUD + noFalls).
   THE DRIVER (G.mst.drv): ▲ / ▼ change lane (0.2 s; 0.45 s in SNOW, with a little drift), ◀ ▶ ease back or forward in
     the window. Action = "Stunt!": a hop (0.9 s in the air) that clears LOW things (cones, cables, a steam jet, a
     tumbleweed). Pressed while the car is on a RAMP it becomes a long jump (1.6 s) that clears anything on the road,
     even a row of prop buses. Driving over a ramp without pressing is a little bump. No lane changes in the air.
   THE SCENE HERO (G.mst.dial): ◀ ▶ turn the scene dial through this take's scenes (the next one shows as a picture over
     the dial). Action = "Clap!": the clapperboard snaps and the backdrop rolls over to that scene in S.rollT s; the
     scene changes when the roll ends. S.cd s cooldown from the clap (gold help: S.goldCd), so call it ahead.
   THE SCENES: CITY (prop taxis parked in lanes: steer round; manhole steam: hop), DESERT (tumbleweeds roll toward the
     car: hop or dodge; sand-dune ramps), SNOW (lane changes are slow and drift, but snow covers every cone and cable),
     NIGHT (dark except the headlight cone; reels and paper flats glow; no traffic). PREMIERE only appears for the very
     last flat of Take 4. A scene's hazards are props: they puff away when the scene changes, and a switch never drops a
     new prop into the road less than S.dropT s ahead of the car. REAL hazards (a steel light stand, a generator truck,
     a hole with a red barrier: glossy, rivets, the red REAL stripe) stay in every scene.
   FLATS: a painted wall across 1, 2 or 3 lanes. It swings up S.showT s before the car gets there (gold help: + S.goldShow)
     with its scene's picture over it. Matching scene when the car's middle reaches it: paper, a great rip (+1 Burst).
     Otherwise plywood: a crash. Partial flats can be steered round.
   REELS: 20 gold film reels (5 a take): on the road behind paper flats and in free lanes, and high over ramps (only a
     long jump reaches those).
   TAKE METER (st.meter 0..100): a crash costs S.crashCost and dents the car (bumper hanging, door flapping, smoke).
     Clean driving and Bursts win it back. Empty: "CUT! From the top!", the rewind, the clapper, and the take restarts
     (a Retake). No game over.
   TAKES (rooms, about 38 s each; each take's layout is the same on every retake): Downtown (city and desert, one-lane
     flats), Location Shoot (+ snow, two-lane flats, ramps), Night Shoot (+ night, full-width flats, REAL hazards), The
     Big Finish (rows of three full-width flats of different scenes S.rowGap s apart, a ramp jump over a row of prop
     buses, and THE END: clap to PREMIERE and Stunt! through it onto the red carpet).
   GOLD HELP (only while both are playing, announced, counted): 3 crashes in a take = a gold clapper: cooldown
     S.goldCd s and flats show S.goldShow s earlier, for the rest of the take.
   IDLE: no person presses anything for 12 s: "Taking a break", the clock stops.
   MEDAL (MODES.takeone.medals, js/medals.js): by time. Gold <= 185 s, Silver <= 310 s.
   MODES.takeone.plan(st) says what each job should do now (the prompts, HUD chips and the computer brain read it).
   Everything lives inside this block; sounds are Sfx.extra.takeone*. */
(() => {
  const K = STUDIO, TAU = Math.PI * 2;
  const S = {
    laneY: [330, 376, 422], laneSc: [0.84, 0.92, 1], winL: 220, winR: 440, carX: 300, half: 54, laneT: 0.2, snowLaneT: 0.45,
    ease: 130, hopT: 0.9, longT: 1.6, bumpT: 0.45, rollT: 0.5, cd: 1.5, goldCd: 0.8, showT: 1.6, goldShow: 0.6, dropT: 1.0,
    crashCost: 26, burstGain: 5, regen: 3, weedV: 70, rowGap: 1.8, idleWait: 12, goldT: 185, silverT: 310,
  };
  const SCN = [
    { name: 'CITY', word: 'City' }, { name: 'DESERT', word: 'Desert' }, { name: 'SNOW', word: 'Snow' }, { name: 'NIGHT', word: 'Night' }, { name: 'PREMIERE', word: 'Premiere' },
  ];
  const TAKES = [
    { title: 'Downtown', scenes: [0, 1], v: 200, dur: 38, flatLanes: [1, 1], beat: [2.7, 3.3], ramps: 2, real: false },
    { title: 'Location Shoot', scenes: [0, 1, 2], v: 210, dur: 38, flatLanes: [1, 2], beat: [2.5, 3.0], ramps: 3, real: false },
    { title: 'Night Shoot', scenes: [0, 1, 2, 3], v: 215, dur: 38, flatLanes: [1, 3], beat: [2.4, 2.9], ramps: 2, real: true },
    { title: 'The Big Finish', scenes: [0, 1, 2, 3], v: 222, dur: 40, rows: true, ramps: 1, real: true },
  ];
  const BLOCK = { taxi: 1, stand: 1, gen: 1, hole: 1, buses: 1 }, LOW = { cone: 1, cable: 1, steam: 1, weed: 1 };
  const SC_OF = { taxi: 0, steam: 0, weed: 1, dune: 1 };
  const W_OF = { flat: 24, taxi: 96, steam: 30, weed: 34, dune: 74, ramp: 74, cone: 22, cable: 30, stand: 30, gen: 120, hole: 70, buses: 300, reel: 20, end: 30 };
  const laneY = l => K.lerp(S.laneY[0], S.laneY[2], l / 2);
  const laneSc = l => K.lerp(S.laneSc[0], S.laneSc[2], l / 2);
  function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------- a take's layout (the same on every retake of it) ----------
     Items: { k: kind, x: world x of its middle (the car's middle reaches it at t s at the take's speed), lane or lanes,
     sc: the scene it belongs to (props) or needs (flats), high (a reel over a ramp) }. */
  function layout(k, seed) {
    const T = TAKES[k], R = seeded(seed + k * 7717), v = T.v, items = [];
    const xAt = t => S.carX + t * v;
    const pick = a => a[Math.floor(R() * a.length)];
    const add = (t, kind, o) => { const it = Object.assign({ k: kind, t, x: xAt(t), w: W_OF[kind] }, o || {}); if (kind === 'weed') it.x = S.carX + t * (v + S.weedV); items.push(it); return it; };
    // which lanes are taken by blocking things around time t (so a row never closes every lane)
    const busy = (t, span) => { const b = new Set(); for (const it of items) if (Math.abs(it.t - t) < span && (BLOCK[it.k] || it.k === 'flat' || it.k === 'dune' || it.k === 'ramp')) for (const l of (it.lanes || [it.lane])) b.add(l); return b; };
    let reels = 0, lastSc = T.scenes[0], t = 3.2;
    const reelAt = (tt, lane, high) => { if (reels >= 5) return; add(tt, 'reel', { lane, high: !!high }); reels++; };
    if (!T.rows) {
      let n = 0;
      while (t < T.dur - 3) {
        // a flat: its scene is usually not the one before, so the dial keeps turning
        const others = T.scenes.filter(s => s !== lastSc), sc = R() < 0.78 ? pick(others) : pick(T.scenes);
        let nl = T.flatLanes[0] + Math.floor(R() * (T.flatLanes[1] - T.flatLanes[0] + 1));
        if (k === 2 && n < 2) nl = Math.min(nl, 2);
        const start = Math.floor(R() * (4 - nl)), lanes = [];
        for (let l = start; l < start + nl; l++) lanes.push(l);
        add(t, 'flat', { lanes, sc });
        // a reel tucked right behind a paper flat (burst through to get it)
        if (R() < 0.5 || n === 0) reelAt(t + 0.35, pick(lanes));
        lastSc = sc;
        const gap = T.beat[0] + R() * (T.beat[1] - T.beat[0]);
        // between flats: one or two rows of hazards, never closing every lane
        const rows = gap > 2.8 ? [0.42, 0.75] : [0.55];
        for (const u of rows) {
          const tt = t + gap * u, b = busy(tt, 0.7), free = [0, 1, 2].filter(l => !b.has(l));
          if (free.length < 2) continue;
          const roll = R();
          let kind, lane = pick(free);
          if (T.real && roll < 0.3) kind = pick(['stand', 'gen', 'hole']);
          else if (roll < 0.55) kind = sc === 0 ? pick(['taxi', 'steam']) : sc === 1 ? 'weed' : pick(['cone', 'cable']);
          else kind = pick(['cone', 'cable', sc === 0 ? 'taxi' : 'weed']);
          const o = { lane };
          if (SC_OF[kind] !== undefined) o.sc = SC_OF[kind];
          add(tt, kind, o);
          // a free lane next to it sometimes gets a reel
          const fl = free.filter(l => l !== lane);
          if (fl.length && R() < 0.3) reelAt(tt + 0.15, pick(fl));
        }
        n++;
        t += gap;
      }
      // ramps (dune ramps belong to the desert), each with a reel high over it, where the lane is clear for 2 s
      let placed = 0;
      for (let tries = 0; tries < 60 && placed < T.ramps; tries++) {
        const tt = 4 + R() * (T.dur - 9), lane = Math.floor(R() * 3);
        const clash = items.some(it => (it.lanes ? it.lanes.includes(lane) : it.lane === lane) && it.t > tt - 0.8 && it.t < tt + 2.1);
        const near = items.some(it => (it.k === 'ramp' || it.k === 'dune') && Math.abs(it.t - tt) < 5);
        if (clash || near) continue;
        const desert = T.scenes.includes(1) && (k === 0 || R() < 0.45);
        add(tt, desert ? 'dune' : 'ramp', Object.assign({ lane }, desert ? { sc: 1 } : {}));
        if (reels < 5) { add(tt + 0.75, 'reel', { lane, high: true }); reels++; }
        placed++;
      }
    } else {
      // The Big Finish: rows of three full-width flats of three different scenes, hazards between the rows
      for (const t0 of [3.5, 13.5]) {
        let prev = lastSc;
        for (let j = 0; j < 3; j++) {
          const sc = pick(T.scenes.filter(s => s !== prev)); prev = sc;
          add(t0 + j * S.rowGap, 'flat', { lanes: [0, 1, 2], sc });
          if (j === 1 && t0 < 5) reelAt(t0 + j * S.rowGap + 0.4, Math.floor(R() * 3));
        }
        lastSc = prev;
        // after the row: a squeeze of hazards
        const tt = t0 + 3 * S.rowGap + 0.4;
        const lanes = [0, 1, 2].sort(() => R() - 0.5);
        add(tt, pick(['stand', 'gen']), { lane: lanes[0] });
        add(tt + 0.2, lastSc === 0 ? 'taxi' : lastSc === 1 ? 'weed' : 'cone', Object.assign({ lane: lanes[1] }, lastSc <= 1 ? { sc: lastSc } : {}));
        if (t0 < 5) reelAt(tt + 0.5, lanes[2]);
        add(tt + 1.6, 'ramp', { lane: lanes[2] });
        reelAt(tt + 2.35, lanes[2], true);
      }
      // two single flats with a hazard squeeze, then the bus jump and THE END
      add(23.5, 'flat', { lanes: [0, 1, 2], sc: pick(T.scenes.filter(s => s !== lastSc)) });
      add(24.7, 'hole', { lane: 1 }); add(25.0, 'cone', { lane: 0 });
      add(26.5, 'flat', { lanes: [0, 1, 2], sc: pick(T.scenes) });
      add(29.0, 'ramp', { lanes: [0, 1, 2], full: true });
      add(29.85, 'buses', { lanes: [0, 1, 2] });
      reelAt(29.85, 1, true);
      add(T.dur - 3.5, 'end', { lanes: [0, 1, 2], sc: 4 });
    }
    // ramps cover their lanes; a full ramp covers all three
    for (const it of items) if ((it.k === 'ramp' || it.k === 'dune') && !it.lanes) it.lanes = [it.lane];
    items.forEach((it, i) => { it.i = i; if (!it.lanes) it.lanes = [it.lane]; });
    return items.sort((a, b) => a.x - b.x);
  }

  /* ---------- a take (one room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.drv = def.drv || 0; st.hero = 1 - st.drv; st.title = def.title || '';
    st.T = TAKES[k];
    st.goldUsed = false; st.gold = false; st.reelsTake = 0;
    labels(st);
    startTake(st);
    K.fx(st);
    st.intro = 1.6;
  }
  function startTake(st) {
    const T = st.T;
    // a retake lays the take's reels out again, so the ones picked up in the cut take don't count twice
    if (st.reelsTake) { st.reels -= st.reelsTake; if (st.stats) st.stats.reels = st.reels; }
    st.items = layout(st.k, st.seed);
    st.car = { x: S.carX, lane: 1, ly: 1, vx: 0, air: 0, airMax: 0, big: false, bump: false, hitT: 0, dents: 0, drift: 0, prevLane: 1 };
    st.dist = 0; st.scene = T.scenes[0]; st.roll = null; st.cdT = 0; st.dial = 0; st.dialRep = 0; st.dialHeld = 0; st.lastClapT = -9;
    st.meter = 100; st.lastHit = -9; st.state = 'go'; st.endT = 0; st.cut = null;
    st.rc = { bad: 0 }; st.segStart = G.time; st.clapAnim = 0; st.prevDown = [false, false];
    st.party = false; st.cleared = false; st.reelsTake = 0; st.planMemo = null;
  }
  function labels(st) { const w = []; w[st.drv] = 'stunt'; w[st.hero] = 'clap'; K.actLabels(w, 'clap'); }
  const avail = st => {
    const a = st.T.scenes.slice();
    if (st.items.some(it => it.k === 'end' && !it.done && it.shown)) a.push(4);
    return a;
  };
  const showT = st => S.showT + (st.gold ? S.goldShow : 0);
  const carW = st => st.dist + st.car.x;
  const vNow = st => st.T.v;
  // seconds until the car's middle reaches this item (weeds roll toward the car)
  const eta = (st, it) => (it.x - carW(st)) / Math.max(40, vNow(st) + st.car.vx + (it.k === 'weed' ? S.weedV : 0));
  // is a prop of scene sc on the road when the scene is `scene`?
  const active = (it, scene) => {
    if (it.gone || it.done) return false;
    if (it.k === 'cone' || it.k === 'cable') return scene !== 2;
    if (it.sc !== undefined && SC_OF[it.k] !== undefined) return it.sc === scene && !it.blocked;
    return true;
  };

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.car) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    st.clock += dt;
    if (st.intro > 0 && G.introT <= 0) { const i0 = st.intro; st.intro -= dt; if (i0 > 1.0 && st.intro <= 1.0) { Sfx.play('studioClap'); Sfx.play('studioAction'); K.pop(st, W / 2, 200, 'ACTION!', '#ffffff', 34); } }
    if (live) {
      const v = vNow(st);
      st.dist += v * dt;
      if (st.cdT > 0) st.cdT -= dt;
      dial(st, dt); drive(st, dt);
      if (st.roll) { st.roll.t += dt; if (st.roll.t >= S.rollT) switchScene(st, st.roll.to); }
      items(st, dt);
      if (G.time - st.lastHit > 2.5) st.meter = Math.min(100, st.meter + S.regen * dt);
      if (st.meter <= 0) { st.state = 'cut'; st.stats.retakes++; K.retake(st); }
      if (st.k < 3 && st.dist > st.T.dur * st.T.v && st.items.every(it => it.done || it.x < carW(st) - 60)) endTake(st);
    } else if (st.state === 'cut') {
      if (K.cutStep(st, dt) === 'done') { const d = st.stats; startTake(st); st.stats = d; K.msg(st, 'Take ' + (st.k + 1) + ' again: ' + st.title + '. Action!', '#ffffff', 2.5); Sfx.play('studioAction'); }
    } else if (st.state === 'end') endStep(st, dt);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    if (st.clapAnim > 0) st.clapAnim -= dt;
    K.tickFx(st, dt);
    mirror(st);
  }
  function dial(st, dt) {
    const p = G.players[st.hero], i = p.input, a = avail(st);
    if (st.dial >= a.length) st.dial = a.length - 1;
    const want = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    if (want) {
      if (st.dialRep <= 0) { st.dial = (st.dial + want + a.length) % a.length; st.dialRep = st.dialHeld ? 0.22 : 0.32; Sfx.play('takeoneTick'); }
      st.dialRep -= dt; st.dialHeld = 1;
    } else { st.dialRep = 0; st.dialHeld = 0; }
    if (p.pendingAct) {
      const to = a[st.dial], now = st.roll ? st.roll.to : st.scene;
      if (st.cdT > 0) K.hint(st, st.hero, 'Clapper resetting... ' + st.cdT.toFixed(1) + ' s', 1);
      else if (to === now) { K.hint(st, st.hero, 'Already ' + SCN[to].word + '! Turn the dial ' + K.key(st.hero, 'lr'), 1.4); }
      else {
        st.roll = { from: now, to, t: 0 }; st.cdT = st.gold ? S.goldCd : S.cd; st.clapAnim = 0.35; st.lastClapT = G.time;
        st.stats.claps++;
        Sfx.play('studioClap'); Sfx.play('takeoneRoll');
        K.pop(st, st.car.x - 20, laneY(st.car.ly) - 110, SCN[to].name + '!', '#ffffff', 22);
      }
    }
  }
  function switchScene(st, to) {
    const from = st.scene; st.scene = to; st.roll = null;
    const cw = carW(st);
    for (const it of st.items) {
      if (it.done || it.gone || it.x < cw - 120) continue;
      const was = active(it, from), now = active(it, to);
      if (was && !now && it.x - st.dist < W + 60 && it.k !== 'flat') K.poof(st, it.x - st.dist, laneY(it.lanes[0]) - 20, 8);
      // a prop of the new scene that would land right in front of the car stays off the road
      if (!was && SC_OF[it.k] !== undefined && it.sc === to && eta(st, it) < S.dropT) it.blocked = true;
      if (!was && now) it.drop = 0.35;
    }
  }
  function drive(st, dt) {
    const c = st.car, p = G.players[st.drv], i = p.input, snow = st.scene === 2;
    if (c.hitT > 0) c.hitT -= dt;
    const downEdge = i.down && !st.prevDown[st.drv];
    st.prevDown[st.drv] = i.down;
    if (c.air <= 0) {
      if (p.pendingJump && c.lane > 0) { c.lane--; Sfx.play('takeoneLane', 1.1); }
      if (downEdge && c.lane < 2) { c.lane++; Sfx.play('takeoneLane', 0.9); }
    }
    const lt = snow ? S.snowLaneT : S.laneT;
    if (c.ly !== c.lane) {
      c.ly = approach(c.ly, c.lane, dt / lt);
      if (c.ly === c.lane && snow) { c.drift = (Math.random() < 0.5 ? -1 : 1) * 70; st.stats.drifts = (st.stats.drifts || 0) + 1; }
    }
    // Stunt!: a hop, or a long jump off a ramp
    if (p.pendingAct) {
      if (c.air > 0) K.hint(st, st.drv, 'Already in the air!', 0.8);
      else {
        const ramp = st.items.find(it => (it.k === 'ramp' || it.k === 'dune') && active(it, st.scene) && it.lanes.includes(Math.round(c.ly)) && Math.abs(it.x - carW(st)) <= it.w / 2 + 14);
        if (ramp) { c.air = c.airMax = S.longT; c.big = true; ramp.used = true; st.stats.jumps++; Sfx.play('takeoneJump'); K.pop(st, c.x, laneY(c.ly) - 140, 'BIG JUMP!', C.gold, 26); }
        else { c.air = c.airMax = S.hopT; c.big = false; Sfx.play('takeoneHop'); }
        st.stats.hops++;
      }
    }
    if (c.air > 0) { c.air -= dt; if (c.air <= 0) { c.air = 0; c.big = false; c.bump = false; Sfx.play('takeoneLand'); K.dust(st, c.x - 30, laneY(c.ly) + 4, 'rgba(120,110,100,0.6)', 6); } }
    const want = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    c.vx = approach(c.vx, want * S.ease + c.drift, 700 * dt);
    c.drift = approach(c.drift, 0, 140 * dt);
    c.x = clamp(c.x + c.vx * dt, S.winL, S.winR);
  }
  function crash(st, it, why) {
    const c = st.car;
    if (c.hitT > 0) return;
    c.hitT = 0.7; c.dents++; st.rc.bad++; st.stats.crashes++;
    st.meter = Math.max(0, st.meter - S.crashCost); st.lastHit = G.time;
    c.x = Math.max(S.winL, c.x - 36); c.vx = 0;
    G.shake = Math.max(G.shake || 0, 0.35);
    const y = laneY(c.ly);
    K.pop(st, c.x + 40, y - 120, why === 'flat' ? 'PLYWOOD! CRUNCH!' : why === 'real' ? 'CLANG! That was REAL!' : 'CRASH!', '#ffb0a0', 24);
    K.poof(st, c.x + 50, y - 20, 12);
    Sfx.play('studioCrash'); Sfx.play('studioGroan');
    if (st.rc.bad === 1) K.msg(st, why === 'flat' ? 'Plywood! A flat only tears when the scene matches its picture.' : 'Crash! Steer round blocks, Stunt! over low things.', '#ffd0c8', 3.2);
    if (st.rc.bad >= 3 && !st.goldUsed && K.both(st)) {
      st.goldUsed = true; st.gold = true;
      K.goldHelp(st, 'Gold clapper! A quicker clapper and the flats show earlier, for the rest of this take');
    }
  }
  function items(st, dt) {
    const c = st.car, cw = carW(st), lane = Math.round(c.ly), sh = showT(st);
    for (const it of st.items) {
      if (it.k === 'weed' && active(it, st.scene)) it.x -= S.weedV * dt;
      if (it.drop > 0) it.drop -= dt;
      if (it.done || it.gone) continue;
      if ((it.k === 'flat' || it.k === 'end') && !it.shown && eta(st, it) <= sh) { it.shown = true; it.rise = 0; Sfx.play('takeoneFlat'); }
      if (it.rise !== undefined && it.rise < 1) it.rise = Math.min(1, it.rise + dt / 0.25);
      if (it.x > cw) continue;
      // the car's middle has reached it
      const on = active(it, st.scene);
      it.done = true;
      const inLane = it.lanes.includes(lane);
      if (it.k === 'reel') {
        if (inLane && (it.high ? c.big : !c.big)) { st.reels++; st.reelsTake++; st.stats.reels = st.reels; Sfx.play('studioReel'); Sfx.play('studioPop', 1 + (st.reels % 5) * 0.08); K.pop(st, c.x, laneY(c.ly) - (it.high ? 170 : 100), 'Reel ' + st.reels + '!', C.gold, 20); }
        else it.missed = true;
        continue;
      }
      if (!inLane || !on) continue;
      if (it.k === 'flat' || it.k === 'end') {
        const ok = st.scene === it.sc && (it.k !== 'end' || c.air > 0);
        if (ok) burst(st, it);
        else if (it.k === 'end') {
          crash(st, it, 'flat'); it.done = false; it.x = cw + vNow(st) * 2.4; it.shown = false; it.rise = undefined;
          K.msg(st, st.scene !== 4 ? 'Clap to PREMIERE, then Stunt! through THE END!' : 'Stunt! through it: the car has to fly!', '#ffe7a8', 3);
        } else { crash(st, it, 'flat'); it.smashed = true; }
      } else if (it.k === 'ramp' || it.k === 'dune') {
        if (c.air <= 0) { c.air = c.airMax = S.bumpT; c.bump = true; c.big = false; Sfx.play('takeoneHop'); }
      } else if (BLOCK[it.k]) {
        if (!c.big) { crash(st, it, it.k === 'taxi' || it.k === 'buses' ? 'block' : 'real'); it.smashed = true; } else { st.stats.cleared++; }
      } else if (LOW[it.k]) {
        if (c.air <= 0) { crash(st, it, 'low'); it.smashed = true; } else { st.stats.cleared++; if (it.k === 'weed' || it.k === 'cone') K.pop(st, c.x, laneY(c.ly) - 110, 'Hup!', '#d9ffd0', 16); }
      }
    }
  }
  function burst(st, it) {
    const c = st.car, y = laneY(c.ly);
    it.torn = true; st.stats.bursts++; st.meter = Math.min(100, st.meter + S.burstGain);
    K.scraps(st, it.x - st.dist + 10, y - 50, 18);
    Sfx.play('studioRip'); Sfx.play('studioCheer');
    if (it.k === 'end') {
      st.state = 'end'; st.endT = 0; st.lastRoom = true; st.stats.roomT[st.k] = G.time - st.segStart;
      K.confetti(st, c.x + 40, y - 80, 60); K.pop(st, W / 2, 150, 'THE END! What a take!', C.gold, 32);
      return;
    }
    K.pop(st, c.x + 30, y - 120, ['RIIIP!', 'Burst!', 'Through!', 'Paper!'][st.stats.bursts % 4], '#ffffff', 22);
  }
  function endTake(st) {
    st.state = 'end'; st.endT = 0; st.lastRoom = false;
    st.stats.roomT[st.k] = G.time - st.segStart;
    Sfx.play('studioClap'); Sfx.play('studioCheer');
    K.pop(st, W / 2, 160, 'That\'s a wrap on ' + st.title + '! Swap jobs!', '#ffffff', 24);
  }
  function endStep(st, dt) {
    st.endT += dt;
    st.dist += vNow(st) * dt * (st.lastRoom ? Math.max(0, 1 - st.endT / 2) : 1);
    if (st.lastRoom) {
      if (st.endT > 0.8 && !st.party) { st.party = true; Sfx.play('takeoneFanfare'); K.confetti(st, W / 2, 140, 50); }
      if (st.endT > 3.4 && !st.cleared) { st.cleared = true; G.level.goal = { x: W / 2, y: 300 }; levelClear(); }
    } else if (st.endT > 2.2) nextRoom();
  }
  function geom(st) {
    const c = st.car, y = laneY(c.ly), sc = laneSc(c.ly), u = c.airMax > 0 ? 1 - c.air / c.airMax : 0;
    const z = c.air > 0 ? Math.sin(u * Math.PI) * (c.big ? 110 : c.bump ? 22 : 44) : 0;
    return { x: c.x, y, sc, z, top: y - z - 26 * sc };
  }
  function mirror(st) {
    const g = geom(st);
    K.place(st.drv, g.x + 18 * g.sc, g.top - 4);
    K.place(st.hero, g.x - 30 * g.sc, g.top - 14);
    st.runPos = [0, 1].map(id => ({ x: st.dist + g.x + (id === st.drv ? 18 : -30), y: g.top }));
  }

  /* ---------- what to do next ----------
     plan(st): { hero: { target, dial (-1/0/1), clap, why, act (the scene that will be on at time tau: sceneAt) },
                 drv: { lane, x, hop, why }, flats: [{ it, ta, sc, full }] }
     The scene hero claps for the first flat it can see so the backdrop has finished rolling S.margin s before the car
     gets there; when no flat is coming it holds. It does not clap to NIGHT with a REAL hazard inside 1.5 s unless a
     full-width flat forces it, and it holds a desert scene while the car is inside 1 s of a dune ramp or a reel unless a
     crash would follow. The driver plans from the scene that will be showing when it gets there (from this plan when its
     partner is the computer; from what is on screen when a person has the dial, steering round a partial flat whose
     scene has not changed 0.7 s out), picks the lane with the longest clear run, moves at least 0.5 s early, hops low
     things and takes ramps for reels or buses when the landing is clear. */
  const MARGIN = 0.45;
  function plan(st, opt) {
    const cpuHero = !opt || opt.cpuHero !== false;
    const key = G.tickN + ':' + st.k + ':' + cpuHero;
    if (st.planMemo && st.planMemo.key === key) return st.planMemo.p;
    const p = planNow(st, cpuHero);
    st.planMemo = { key, p };
    return p;
  }
  function planNow(st, cpuHero) {
    const c = st.car, out = { hero: { target: null, dial: 0, clap: false, why: 'hold' }, drv: { lane: c.lane, x: S.carX, hop: false, why: 'cruise' }, flats: [] };
    if (st.state !== 'go') return out;
    const now = st.roll ? st.roll.to : st.scene, rollLeft = st.roll ? S.rollT - st.roll.t : 0, a = avail(st);
    const flats = st.items.filter(it => (it.k === 'flat' || it.k === 'end') && it.shown && !it.done).map(it => ({ it, ta: eta(st, it), sc: it.sc, full: it.lanes.length === 3 })).filter(f => f.ta > -0.05).sort((p, q) => p.ta - q.ta);
    out.flats = flats;
    // ---- the scene hero
    const F1 = flats[0];
    let target = null, why = 'hold';
    if (F1 && F1.sc !== now) {
      target = F1.sc; why = 'flat';
      // no NIGHT with a REAL hazard close ahead in the car's lane, unless the flat leaves no way round
      if (target === 3 && !F1.full && st.items.some(it => !it.done && (it.k === 'stand' || it.k === 'gen' || it.k === 'hole') && it.lanes.includes(c.lane) && eta(st, it) < 1.5 && eta(st, it) > -0.2)) { target = null; why = 'dark'; }
      // hold the desert while the car is about to use a dune ramp, unless the flat is close
      if (target !== null && now === 1 && F1.ta > 1.7 && st.items.some(it => !it.done && it.k === 'dune' && it.lanes.includes(c.lane) && eta(st, it) < 1 && eta(st, it) > -0.4)) { target = null; why = 'ramp'; }
    }
    if (target !== null) {
      const di = a.indexOf(target), n = a.length;
      if (di >= 0) {
        const fwd = (di - st.dial + n) % n, back = (st.dial - di + n) % n;
        out.hero.dial = fwd === 0 ? 0 : fwd <= back ? 1 : -1;
        // clap when ready and lined up (no use clapping later than needed: the props of the next scene stay away)
        out.hero.clap = fwd === 0 && st.cdT <= 0 && !st.roll && F1.ta - S.rollT < 2.6;
      }
      out.hero.target = target;
    }
    out.hero.why = why;
    // when will each scene be on?  (sceneAt(tau): the scene showing tau s from now)
    const dialSteps = target !== null ? Math.min((a.indexOf(target) - st.dial + a.length) % a.length, (st.dial - a.indexOf(target) + a.length) % a.length) : 0;
    const tAct = target !== null && cpuHero ? Math.max(st.cdT, dialSteps * 0.3, st.roll ? 9 : 0) + S.rollT + 0.05 : null;
    const sceneAt = tau => {
      if (st.roll && tau < rollLeft) return st.roll.from;
      if (tAct !== null && tau >= tAct) return target;
      return now;
    };
    out.sceneAt = sceneAt;
    // ---- the driver: the lane with the longest clear run
    const lanes = [0, 1, 2].map(l => laneRun(st, l, sceneAt, cpuHero));
    let best = c.lane;
    const lt = st.scene === 2 ? S.snowLaneT : S.laneT;
    // a reel counts in a lane the car can reach in time, before that lane's first block
    const reelOK = l => lanes[l].reel > 0 && lanes[l].reelT < lanes[l].clear - 0.05 && lanes[l].reelT > Math.abs(l - c.lane) * lt + 0.12;
    const cost = l => -Math.min(lanes[l].clear, 3) + Math.abs(l - c.lane) * 0.3 - (reelOK(l) ? 1.2 * lanes[l].reel : 0) + (lanes[l].ramp ? -0.2 : 0);
    if (c.air <= 0) {
      for (const l of [0, 1, 2]) if (cost(l) < cost(best) - 0.05) best = l;
      const thr = st.scene === 2 ? 1.6 : 1.25;
      // only move when the lane gets bad within the threshold, or for a reel / ramp worth having
      if (best !== c.lane && (lanes[c.lane].clear < thr || reelOK(best) && !reelOK(c.lane) && lanes[best].clear > Math.min(1.2, lanes[c.lane].clear))) out.drv.lane = best;
      // a reel about to be picked up in this lane: stay for it while that's safe
      if (out.drv.lane !== c.lane && lanes[c.lane].reelT < 0.4 && lanes[c.lane].clear > lanes[c.lane].reelT + 0.25 && lanes[c.lane].clear > 0.5) out.drv.lane = c.lane;
      // passing through the middle lane: not when something hits there now
      if (Math.abs(out.drv.lane - c.lane) === 2 && lanes[1].clear < 0.35) out.drv.lane = c.lane;
      if (out.drv.lane !== c.lane) out.drv.why = 'lane';
    }
    // hop: a low thing about to reach the car's middle; long jump: a ramp under the car, if the landing is clear
    const L = Math.round(c.ly);
    if (c.air <= 0) {
      const low = st.items.find(it => !it.done && LOW[it.k] && it.lanes.includes(L) && active(it, st.scene) && eta(st, it) > 0 && eta(st, it) < 0.32);
      const end = st.items.find(it => !it.done && it.k === 'end' && sceneAt(Math.max(0, eta(st, it))) === 4 && eta(st, it) > 0 && eta(st, it) < 0.45);
      const ramp = st.items.find(it => (it.k === 'ramp' || it.k === 'dune') && !it.done && active(it, st.scene) && it.lanes.includes(L) && Math.abs(it.x - carW(st)) <= it.w / 2 + 6);
      if (ramp) {
        const wantJump = ramp.full || st.items.some(it => !it.done && it.k === 'reel' && it.high && it.lanes.includes(L) && eta(st, it) < S.longT) || lanes[L].clear < 1.7;
        if (wantJump && jumpClear(st, L, sceneAt)) { out.drv.hop = true; out.drv.why = 'ramp'; }
      } else if (low) { out.drv.hop = true; out.drv.why = 'hop'; }
      else if (end) { out.drv.hop = true; out.drv.why = 'end'; }
    }
    return out;
  }
  // how long the lane stays clear (s), whether a reel waits in it, whether a ramp with a reel is in it
  function laneRun(st, l, sceneAt, cpuHero) {
    let clear = 9, reel = 0, ramp = false, reelT = 9;
    for (const it of st.items) {
      if (it.done || it.gone || !it.lanes.includes(l)) continue;
      const ta = eta(st, it);
      if (ta < -0.05 || ta > 4) continue;
      const sc = sceneAt(Math.max(0, ta));
      if (it.k === 'flat' || it.k === 'end') {
        if (!it.shown) continue;
        let bad = sc !== it.sc;
        // a person at the dial: trust them until 0.7 s out
        if (bad && !cpuHero && ta > 0.75 && it.lanes.length < 3) bad = false;
        if (it.k === 'end') bad = false;
        if (bad) clear = Math.min(clear, ta);
        else if (sc === it.sc && ta > 0.3) { reel += 0.15; reelT = Math.min(reelT, ta); }
      } else if (BLOCK[it.k]) {
        if (it.k === 'buses') continue;
        if (!active(it, sc) || (it.sc !== undefined && it.k !== 'stand' && SC_OF[it.k] !== undefined && it.sc !== st.scene && ta < S.dropT + 0.3 && !active(it, st.scene))) continue;
        clear = Math.min(clear, ta);
      } else if (it.k === 'reel') {
        if (ta < 2.6 && ta > -0.02) { reel += it.high ? 0.8 : 1; reelT = Math.min(reelT, it.high ? Math.max(0.05, ta - 0.75) : ta); if (it.high) ramp = true; }
      } else if (LOW[it.k] && active(it, sc)) {
        // a low thing right after another one (or just after a landing) can't be hopped twice: count it from 0.95 s on
        if (st.items.some(q => q !== it && !q.done && LOW[q.k] && q.lanes.includes(l) && active(q, sc) && eta(st, q) < ta && ta - eta(st, q) < 0.95 && ta - eta(st, q) > 0.12)) clear = Math.min(clear, ta);
      }
    }
    return { clear, reel, ramp, reelT };
  }
  // a long jump from here lands clear: no wrong flat while airborne and nothing blocking 0.5 s after landing
  function jumpClear(st, l, sceneAt) {
    for (const it of st.items) {
      if (it.done || it.gone || !it.lanes.includes(l)) continue;
      const ta = eta(st, it);
      if (ta < 0 || ta > S.longT + 0.5) continue;
      if ((it.k === 'flat') && sceneAt(ta) !== it.sc && it.shown) return false;
      if (ta > S.longT - 0.05 && (BLOCK[it.k] || LOW[it.k]) && active(it, sceneAt(ta))) return false;
    }
    return true;
  }

  /* ---------- drawing ---------- */
  // a scene's painting in the box x, y, w, h (the rolling backdrop and the flats use the same pictures)
  function paint(sc, x, y, w, h, t, seed = 0) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    if (sc === 0) { g.addColorStop(0, '#7ab8e8'); g.addColorStop(1, '#e8eef2'); }
    else if (sc === 1) { g.addColorStop(0, '#f2a64a'); g.addColorStop(1, '#ffe2a0'); }
    else if (sc === 2) { g.addColorStop(0, '#9ab4d2'); g.addColorStop(1, '#f2f6fa'); }
    else if (sc === 3) { g.addColorStop(0, '#0a1030'); g.addColorStop(1, '#2a2a5a'); }
    else { g.addColorStop(0, '#5a0a18'); g.addColorStop(1, '#a8202e'); }
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    const base = y + h;
    if (sc === 0 || sc === 3) {
      // a skyline in two layers (lit windows at night), rooftop tanks and aerials, and a moon at night
      const night = sc === 3;
      if (night) { ctx.fillStyle = 'rgba(255,246,200,0.12)'; circle(x + w * 0.78, y + h * 0.22, Math.min(w, h) * 0.16); ctx.fill(); ctx.fillStyle = '#fff6c8'; circle(x + w * 0.78, y + h * 0.22, Math.min(w, h) * 0.1); ctx.fill(); ctx.fillStyle = g; circle(x + w * 0.78 + Math.min(w, h) * 0.05, y + h * 0.2, Math.min(w, h) * 0.09); ctx.fill(); }
      else { ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (let k = 0; k < 3; k++) { const cx = x + (0.15 + k * 0.33) * w, cy = y + h * (0.16 + 0.08 * (k % 2)); circle(cx, cy, 14); ctx.fill(); circle(cx + 16, cy - 6, 18); ctx.fill(); circle(cx + 34, cy, 13); ctx.fill(); } }
      ctx.fillStyle = night ? '#1e2450' : '#9aaac0';
      for (let k = 0; k < Math.max(3, w / 34); k++) { const bw = 22 + K.hash(k + seed + 50) * 20, bh = h * (0.45 + K.hash(k * 5 + seed) * 0.35), bx = x + k * 34 + 10; ctx.fillRect(bx, base - bh, bw, bh); if (K.hash(k + 9) > 0.6) ctx.fillRect(bx + bw / 2 - 1, base - bh - 14, 2, 14); }
      for (let k = 0; k < Math.max(3, w / 40); k++) {
        const bw = 26 + K.hash(k + seed) * 24, bh = h * (0.3 + K.hash(k * 3 + seed) * 0.5), bx = x + k * 40 - 6, bc = night ? '#14183a' : '#5a6a82';
        ctx.fillStyle = bc; ctx.fillRect(bx, base - bh, bw, bh);
        ctx.fillStyle = night ? 'rgba(0,0,0,0.25)' : 'rgba(30,40,60,0.22)'; ctx.fillRect(bx + bw * 0.68, base - bh, bw * 0.32, bh);
        ctx.fillStyle = night ? 'rgba(120,140,220,0.25)' : 'rgba(255,255,255,0.3)'; ctx.fillRect(bx, base - bh, 2, bh); ctx.fillRect(bx, base - bh, bw, 2);
        ctx.fillStyle = night ? 'rgba(255,230,140,0.85)' : 'rgba(230,240,255,0.6)';
        for (let wy = base - bh + 6; wy < base - 8; wy += 10) for (let wx = bx + 4; wx < bx + bw - 6; wx += 9) if (K.hash(wx * 0.3 + wy + seed) > (night ? 0.55 : 0.3)) ctx.fillRect(wx, wy, 4, 5);
        // a rooftop water tank or an aerial
        const rk = K.hash(k * 7 + seed);
        if (rk > 0.6) { ctx.fillStyle = bc; ctx.fillRect(bx + 6, base - bh - 10, 10, 10); ctx.beginPath(); ctx.moveTo(bx + 5, base - bh - 10); ctx.lineTo(bx + 11, base - bh - 15); ctx.lineTo(bx + 17, base - bh - 10); ctx.fill(); }
        else if (rk > 0.3) { ctx.fillStyle = bc; ctx.fillRect(bx + bw - 8, base - bh - 18, 2, 18); if (night) { ctx.fillStyle = Math.sin(t * 3 + k) > 0 ? '#ff4a4a' : 'rgba(255,74,74,0.3)'; circle(bx + bw - 7, base - bh - 19, 1.8); ctx.fill(); } }
      }
    } else if (sc === 1) {
      ctx.fillStyle = 'rgba(255,242,192,0.45)'; circle(x + w * 0.8, y + h * 0.3, Math.min(w, h) * 0.2); ctx.fill();
      ctx.fillStyle = '#fff2c0'; circle(x + w * 0.8, y + h * 0.3, Math.min(w, h) * 0.12); ctx.fill();
      // far mesas with flat tops and banded cliffs
      for (let k = 0; k < Math.max(2, w / 260); k++) {
        const mx = x + k * 260 + K.hash(k + seed + 20) * 80, mw = 120 + K.hash(k * 3 + seed) * 80, mh = h * (0.3 + K.hash(k + 4) * 0.12);
        ctx.fillStyle = '#e8a868'; ctx.beginPath(); ctx.moveTo(mx, base); ctx.lineTo(mx + 18, base - mh); ctx.lineTo(mx + mw - 18, base - mh); ctx.lineTo(mx + mw, base); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#d08a50'; ctx.beginPath(); ctx.moveTo(mx + mw * 0.6, base - mh); ctx.lineTo(mx + mw - 18, base - mh); ctx.lineTo(mx + mw, base); ctx.lineTo(mx + mw * 0.66, base); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(160,90,40,0.35)'; ctx.fillRect(mx + 10, base - mh * 0.62, mw - 20, 3); ctx.fillRect(mx + 6, base - mh * 0.32, mw - 12, 3);
      }
      ctx.fillStyle = '#e09a4a'; ctx.beginPath(); ctx.moveTo(x, base); for (let k = 0; k <= 6; k++) ctx.lineTo(x + k * w / 6, base - h * (0.18 + 0.12 * K.hash(k + seed))); ctx.lineTo(x + w, base); ctx.fill();
      ctx.strokeStyle = 'rgba(255,230,170,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); for (let k = 0; k <= 6; k++) { const yy = base - h * (0.18 + 0.12 * K.hash(k + seed)) + 2; k ? ctx.lineTo(x + k * w / 6, yy) : ctx.moveTo(x, yy); } ctx.stroke();
      // cacti, each with a lit side, a shaded side and ribs
      for (let k = 0; k < Math.max(1, w / 120); k++) {
        const cx = x + 30 + k * 120 + K.hash(k + seed) * 30, ch = h * 0.42;
        const arm = (ax, ay, aw, ah) => { rr(ax, ay, aw, ah, aw / 2); ctx.fill(); };
        ctx.fillStyle = '#3a8a4a'; arm(cx - 6, base - ch, 12, ch); arm(cx - 20, base - ch * 0.7, 8, ch * 0.35); ctx.fillRect(cx - 16, base - ch * 0.45, 12, 6); arm(cx + 12, base - ch * 0.8, 8, ch * 0.4); ctx.fillRect(cx + 4, base - ch * 0.5, 12, 6);
        ctx.fillStyle = '#2a6a38'; ctx.fillRect(cx + 2, base - ch + 6, 4, ch - 6); ctx.fillRect(cx + 16, base - ch * 0.8 + 4, 4, ch * 0.4 - 8);
        ctx.fillStyle = 'rgba(200,255,200,0.35)'; ctx.fillRect(cx - 4, base - ch + 5, 2, ch - 10); ctx.fillRect(cx - 18, base - ch * 0.7 + 4, 1.5, ch * 0.3);
        ctx.fillStyle = '#ff7aa0'; circle(cx, base - ch - 1, 3); ctx.fill();
      }
    } else if (sc === 2) {
      // far peaks behind, then the snowy mountains with shaded faces, then pines
      ctx.fillStyle = '#c8d8ea'; ctx.beginPath(); ctx.moveTo(x, base);
      for (let k = 0; k <= 6; k++) { ctx.lineTo(x + (k + 0.5) * w / 6, base - h * (0.62 + 0.2 * K.hash(k + seed + 7))); ctx.lineTo(x + (k + 1) * w / 6, base - h * 0.4); }
      ctx.lineTo(x + w, base); ctx.fill();
      for (let k = 0; k <= 4; k++) {
        const px = x + (k + 0.5) * w / 4, py = base - h * (0.5 + 0.3 * K.hash(k + seed)), lx = x + k * w / 4, rx = x + (k + 1) * w / 4, fy = base - h * 0.2;
        ctx.fillStyle = '#e8f0f8'; ctx.beginPath(); ctx.moveTo(lx, fy); ctx.lineTo(px, py); ctx.lineTo(rx, fy); ctx.lineTo(rx, base); ctx.lineTo(lx, base); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#b8c8dc'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(rx, fy); ctx.lineTo(rx, base); ctx.lineTo(px + (rx - px) * 0.2, base); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - (px - lx) * 0.3, py + (fy - py) * 0.3); ctx.lineTo(px - 6, py + (fy - py) * 0.22); ctx.lineTo(px + 4, py + (fy - py) * 0.34); ctx.lineTo(px + (rx - px) * 0.28, py + (fy - py) * 0.28); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#ffffff'; for (let k = 0; k < w * h / 900; k++) { circle(x + K.hash(k + seed) * w, y + ((K.hash(k * 7) * h + t * 30) % h), 1.8); ctx.fill(); }
      for (let k = 0; k < Math.max(1, w / 90); k++) {
        const tx = x + 20 + k * 90, th = h * 0.42;
        ctx.fillStyle = '#3a6a5a'; for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.moveTo(tx, base - th + q * th * 0.22); ctx.lineTo(tx + 10 + q * 3, base - th * 0.45 + q * th * 0.2); ctx.lineTo(tx - 10 - q * 3, base - th * 0.45 + q * th * 0.2); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle = '#2a5040'; ctx.beginPath(); ctx.moveTo(tx, base - th); ctx.lineTo(tx + 16, base - 4); ctx.lineTo(tx, base - 4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff'; for (let q = 0; q < 3; q++) ctx.fillRect(tx - 6 - q * 2, base - th * 0.45 + q * th * 0.2 - 2, 10 + q * 3, 2);
        ctx.fillStyle = '#4a3a2a'; ctx.fillRect(tx - 2, base - 6, 4, 6);
      }
    } else {
      // PREMIERE: red curtains, spotlights and a star
      ctx.fillStyle = 'rgba(255,240,180,0.25)'; for (const d of [0.25, 0.75]) { ctx.beginPath(); ctx.moveTo(x + w * d, base); ctx.lineTo(x + w * d - w * 0.15 + Math.sin(t + d * 9) * w * 0.08, y); ctx.lineTo(x + w * d + w * 0.15 + Math.sin(t + d * 9) * w * 0.08, y); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = '#8a0a18'; for (let k = 0; k < w / 16; k++) ctx.fillRect(x + k * 16, y, 7, h);
      ctx.fillStyle = C.gold; K.star(x + w / 2, y + h * 0.42, Math.min(w, h) * 0.22, Math.min(w, h) * 0.09, 0); ctx.fill();
    }
  }
  // the scene's little picture (over flats, on the dial)
  function icon(sc, x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(16,16,24,0.88)'; circle(0, 0, 15); ctx.fill();
    ctx.strokeStyle = sc === 4 ? C.gold : '#ffffff'; ctx.lineWidth = 2; circle(0, 0, 15); ctx.stroke();
    if (sc === 0) { ctx.fillStyle = '#9fc8ff'; ctx.fillRect(-9, -2, 5, 10); ctx.fillRect(-3, -8, 6, 16); ctx.fillRect(4, -4, 5, 12); }
    else if (sc === 1) { ctx.fillStyle = '#6ad06a'; rr(-2.5, -9, 5, 17, 2.5); ctx.fill(); rr(-8, -4, 4, 7, 2); ctx.fill(); rr(4, -6, 4, 7, 2); ctx.fill(); ctx.fillRect(-5, 0, 4, 2.5); ctx.fillRect(1, -2, 4, 2.5); }
    else if (sc === 2) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * -9, Math.sin(a) * -9); ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9); ctx.stroke(); } }
    else if (sc === 3) { ctx.fillStyle = '#fff6c8'; circle(0, 0, 9); ctx.fill(); ctx.fillStyle = 'rgba(16,16,24,1)'; circle(4, -3, 8); ctx.fill(); }
    else { ctx.fillStyle = C.gold; K.star(0, 0, 10, 4.2, t || 0); ctx.fill(); }
    ctx.restore();
  }
  function draw(st) {
    const t = st.clock, night = st.scene === 3, dist = st.dist;
    K.backlot(dist, t, { night: night || st.scene === 4, base: 300 });
    // the rolling backdrop on its frame
    {
      const bx = -20, by = 54, bw = W + 40, bh = 244;
      paint(st.scene, bx, by, bw, bh, t, Math.floor(dist / 400));
      if (st.roll) {
        const u = K.smooth(st.roll.t / S.rollT);
        ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh * u); ctx.clip(); paint(st.roll.to, bx, by, bw, bh, t, Math.floor(dist / 400) + 3); ctx.restore();
        ctx.fillStyle = '#3a3a44'; rr(bx, by + bh * u - 7, bw, 14, 7); ctx.fill(); ctx.fillStyle = '#8a8a96'; ctx.fillRect(bx, by + bh * u - 2, bw, 3);
      }
      ctx.fillStyle = '#2a2a34'; ctx.fillRect(bx, by - 12, bw, 12);
      ctx.fillStyle = '#5a5a66'; for (let x = ((-dist * 0.3) % 80 + 80) % 80 - 80; x < W; x += 80) ctx.fillRect(x, by - 10, 30, 8);
    }
    // the road
    const roadTop = 300, roadBot = 460;
    // the road surface (art pass, Nov 2026): asphalt with grit, tar patches, cracks and oil stains in the city and at
    // night, packed sand with ripples, tyre ruts and pebbles in the desert, trodden snow with ice glints on the
    // mountain; a concrete kerb with joints along the top. Painted in 240 px chunks once and copied (RICH.strip).
    {
      const sc = st.scene, kind = sc === 1 ? 's' : sc === 2 ? 'n' : 'a', rcol = sc === 1 ? '#c49656' : sc === 2 ? '#dfe8f0' : '#4a4a56';
      ctx.save(); ctx.translate(-Math.round(dist), 0);
      RICH.strip('w36road' + kind, dist, dist + W, roadTop, roadBot - roadTop, 240, (c, gx, w, h) => {
        if (kind === 's') {
          RICH.dirt(c, 0, 0, w, h, { col: rcol, gx, seed: 3, roots: false, pebble: '#e8d0a0' });
          // wind ripples and tyre ruts
          c.strokeStyle = 'rgba(120,80,30,0.25)'; c.lineWidth = 1.2; c.beginPath();
          for (let k = 0; k < 14; k++) { const ry = 12 + RICH.r(gx, k) * (h - 24), rx = RICH.r(gx + 1, k) * (w - 40); c.moveTo(rx, ry); c.quadraticCurveTo(rx + 16, ry - 3, rx + 34, ry); } c.stroke();
          c.fillStyle = 'rgba(110,70,30,0.16)'; for (const ry of [44, 52, 92, 100]) c.fillRect(0, ry, w, 3);
        } else if (kind === 'n') {
          c.fillStyle = rcol; c.fillRect(0, 0, w, h);
          c.fillStyle = 'rgba(150,170,200,0.3)'; for (const ry of [42, 51, 88, 97, 132, 141]) { c.beginPath(); c.moveTo(0, ry); for (let x = 0; x <= w; x += 12) c.lineTo(x, ry + Math.sin((gx + x) / 37) * 1.5); c.lineTo(w, ry + 4); c.lineTo(0, ry + 4); c.closePath(); c.fill(); }
          c.fillStyle = 'rgba(120,140,170,0.35)'; for (let k = 0; k < 18; k++) { const ex = RICH.r(gx, k + 30) * w, ey = 10 + RICH.r(gx, k + 40) * (h - 20); c.beginPath(); c.ellipse(ex, ey, 4 + RICH.r(gx, k) * 6, 1.5, 0, 0, Math.PI * 2); c.fill(); }
          c.fillStyle = '#ffffff'; for (let k = 0; k < 40; k++) { const ex = RICH.r(gx, k + 60) * w, ey = 8 + RICH.r(gx, k + 70) * (h - 12); c.fillRect(ex, ey, 1.5, 1.5); if (k % 5 === 0) { c.fillRect(ex - 2, ey + 0.5, 5.5, 0.6); c.fillRect(ex + 0.5, ey - 2, 0.6, 5.5); } }
        } else RICH.road(c, 0, 0, w, h, { col: rcol, gx, seed: 5 });
        // far is lighter, near darker (the depth of the road)
        const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(10,10,30,0.28)');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
        // the kerb: a concrete lip with expansion joints, a lit top and a shadow on the road below it
        const kc = kind === 's' ? '#a87a3a' : kind === 'n' ? '#a8b8c8' : '#76767f';
        c.fillStyle = kc; c.fillRect(0, 0, w, 7);
        c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(0, 0, w, 1.5);
        c.fillStyle = RICH.dk(kc, 0.35); c.fillRect(0, 5.5, w, 1.5);
        c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, 7, w, 3);
        for (let x = 0; x < w; x += 40) { c.fillStyle = RICH.dk(kc, 0.4); c.fillRect(x, 1, 1.5, 5); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x + 1.5, 1, 1, 5); }
        c.fillStyle = RICH.rgba(RICH.dk(kc, 0.4), 0.5); for (let k = 0; k < 10; k++) c.fillRect(RICH.r(gx, k + 90) * w, 2 + RICH.r(gx, k + 91) * 3, 2, 1);
        c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(0, h - 6, w, 6);
      });
      ctx.restore();
    }
    // lane lines: worn paint with chipped ends and scuffs where tyres cross
    {
      const lc = st.scene === 2 ? '#ffffff' : '#ffe27a', i0 = Math.floor(dist / 60);
      for (const yy of [353, 399]) for (let i = i0; i * 60 - dist < W; i++) {
        const x = i * 60 - dist, hh = hash(i, yy);
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x + 1, yy + 2, 28, 1.5);
        ctx.fillStyle = lc; ctx.fillRect(x, yy, 28, 3);
        ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x + 1, yy, 26, 1);
        ctx.fillStyle = st.scene === 2 ? 'rgba(160,180,200,0.6)' : 'rgba(60,50,40,0.45)';
        ctx.fillRect(x + 4 + (hh % 14), yy + 1, 3, 2); if (hh % 3 === 0) ctx.fillRect(x + 22 - (hh >> 4) % 6, yy, 2, 3); if (hh % 4 === 1) ctx.fillRect(x, yy + 1.5, 3, 1.5);
      }
    }
    ctx.fillStyle = '#20202a'; ctx.fillRect(0, roadBot, W, H - roadBot);
    // depth layers: far lane first, the car in its own lane
    const carLayer = Math.round(st.car.ly);
    for (let l = 0; l < 3; l++) {
      for (const it of st.items) if (it.lanes[0] === l) drawItem(st, it, t);
      if (l === carLayer) drawCar(st, t);
    }
    // night: dark except the headlight cone; glowing things show through
    if (night) {
      const g = geom(st), hx = g.x + 50 * g.sc, hy = g.y - g.z - 12;
      ctx.save(); ctx.fillStyle = 'rgba(4,6,20,0.84)'; ctx.beginPath(); ctx.rect(0, 0, W, H);
      ctx.moveTo(hx, hy - 6); ctx.lineTo(hx + 210, hy - 60); ctx.lineTo(hx + 230, hy + 50); ctx.lineTo(hx, hy + 12); ctx.closePath();
      ctx.moveTo(g.x + 70, g.y + 30); ctx.arc(g.x, g.y - 20, 70, 0, TAU, true);
      ctx.fill('evenodd'); ctx.restore();
      for (const it of st.items) {
        if (it.done || it.gone) continue;
        const sx = it.x - dist;
        if (sx < -60 || sx > W + 60) continue;
        if (it.k === 'reel' && !it.high) K.reel(sx, laneY(it.lanes[0]) - 22, 10, t);
        else if (it.k === 'reel') K.reel(sx, laneY(it.lanes[0]) - 150, 10, t);
        else if ((it.k === 'flat' || it.k === 'end') && it.shown && it.sc === 3) { ctx.globalAlpha = 0.8; drawFlat(st, it, t); ctx.globalAlpha = 1; }
        else if (it.k === 'stand' || it.k === 'gen' || it.k === 'hole') { ctx.fillStyle = Math.sin(t * 8 + it.i) > 0 ? '#ff3a3a' : 'rgba(255,58,58,0.3)'; circle(sx, laneY(it.lanes[0]) - 40, 4); ctx.fill(); }
        if ((it.k === 'flat' || it.k === 'end') && it.shown) icon(it.sc, sx, laneY(it.lanes[0]) - 132 - (it.lanes.length - 1) * 20, 1, t);
      }
    }
    // the camera truck pacing the car along the bottom edge (low, under the road), Bellow riding on the back with the megaphone
    {
      const g = geom(st), tx = clamp(g.x + 150, 140, W - 140), ty = 476;
      // the truck (cached: flatbed with a hazard-striped deck edge, riveted panels, a cab with a lit window, a camera
      // on a tripod head with a lens hood and a red tally light), then the wheels live so their spokes turn with the road
      RICH.pic('w36camtruck', 164, 62, c => {
        const ox = 82, oy = 24;   // tx, ty in the picture
        RICH.shadow(c, ox, oy + 36, 74, 4, 0.22);
        // flatbed body
        RICH.metal(c, ox - 70, oy, 140, 30, { col: '#2e3440', r: 7, rivets: 14, seams: 46, seed: 36, lw: 2 });
        c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(ox - 66, oy + 18, 132, 2);
        // hazard stripe along the deck edge
        c.save(); RICH.rr(c, ox - 68, oy + 2, 136, 5, 2); c.clip(); c.fillStyle = '#f2c230'; c.fillRect(ox - 68, oy + 2, 136, 5);
        c.fillStyle = '#1e2028'; for (let k = -4; k < 140; k += 10) { c.beginPath(); c.moveTo(ox - 68 + k, oy + 7); c.lineTo(ox - 63 + k, oy + 2); c.lineTo(ox - 58 + k, oy + 2); c.lineTo(ox - 63 + k, oy + 7); c.closePath(); c.fill(); }
        c.restore();
        // wheel arches
        c.fillStyle = '#16181e'; for (const d of [-46, 46]) { c.beginPath(); c.arc(ox + d, oy + 30, 13, Math.PI, 0); c.fill(); }
        // cab
        RICH.metal(c, ox + 30, oy - 14, 40, 18, { col: '#3e4656', r: 4, rivets: 0, seed: 3, lw: 1.5 });
        const gw = c.createLinearGradient(ox + 46, oy - 11, ox + 66, oy - 1); gw.addColorStop(0, '#bfe0f0'); gw.addColorStop(1, '#5a7a96');
        c.fillStyle = gw; RICH.rr(c, ox + 46, oy - 11, 20, 10, 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.moveTo(ox + 50, oy - 10); c.lineTo(ox + 54, oy - 10); c.lineTo(ox + 49, oy - 2); c.lineTo(ox + 47, oy - 2); c.closePath(); c.fill();
        c.strokeStyle = '#1e222c'; c.lineWidth = 1.2; RICH.rr(c, ox + 46, oy - 11, 20, 10, 2); c.stroke();
        c.fillStyle = '#ffd36a'; RICH.rr(c, ox + 66, oy + 6, 4, 6, 1.5); c.fill();
        c.fillStyle = '#d23a3a'; RICH.rr(c, ox - 70, oy + 6, 3, 6, 1); c.fill();
        // camera head: a tripod collar, the body, a film magazine and a lens hood
        c.fillStyle = '#4a505c'; RICH.rr(c, ox - 4, oy - 4, 14, 5, 1.5); c.fill(); c.strokeStyle = '#1c1f26'; c.lineWidth = 1; c.stroke();
        RICH.metal(c, ox - 10, oy - 16, 26, 14, { col: '#22252e', r: 3, rivets: 0, seed: 9, lw: 1.5 });
        c.fillStyle = '#2c303a'; c.beginPath(); c.arc(ox + 2, oy - 19, 5, 0, Math.PI * 2); c.arc(ox + 11, oy - 19, 5, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#121418'; c.lineWidth = 1; c.beginPath(); c.arc(ox + 2, oy - 19, 5, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(ox + 11, oy - 19, 5, 0, Math.PI * 2); c.stroke();
        c.fillStyle = '#6a7080'; for (const mx of [2, 11]) { c.beginPath(); c.arc(ox + mx, oy - 19, 1.4, 0, Math.PI * 2); c.fill(); }
        c.fillStyle = '#1a1c22'; c.beginPath(); c.moveTo(ox - 10, oy - 13); c.lineTo(ox - 22, oy - 15); c.lineTo(ox - 22, oy - 1); c.lineTo(ox - 10, oy - 4); c.closePath(); c.fill();
        const gl = c.createRadialGradient(ox - 15, oy - 10, 1, ox - 14, oy - 8, 6); gl.addColorStop(0, '#a8c0e8'); gl.addColorStop(0.5, '#5a6a8a'); gl.addColorStop(1, '#2a3248');
        c.fillStyle = gl; c.beginPath(); c.arc(ox - 14, oy - 8, 6, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#11131a'; c.lineWidth = 1.2; c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.arc(ox - 16, oy - 10, 1.6, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ff3a3a'; c.beginPath(); c.arc(ox + 12, oy - 13, 1.6, 0, Math.PI * 2); c.fill();
      }, tx - 82, ty - 24);
      for (const d of [-46, 46]) {
        const wx = tx + d, wy = ty + 32, a = (st.dist || 0) / 10;
        ctx.fillStyle = '#14161c'; circle(wx, wy, 10); ctx.fill();
        ctx.strokeStyle = '#2a2e36'; ctx.lineWidth = 2; circle(wx, wy, 7.5); ctx.stroke();
        ctx.fillStyle = '#8a909c'; circle(wx, wy, 5); ctx.fill();
        ctx.strokeStyle = '#4a505c'; ctx.lineWidth = 1.2; ctx.beginPath();
        for (let k = 0; k < 5; k++) { const q = a + k * Math.PI * 2 / 5; ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(q) * 5, wy + Math.sin(q) * 5); }
        ctx.stroke();
        ctx.fillStyle = '#c8ccd4'; circle(wx, wy, 1.6); ctx.fill();
      }
      const shout = st.cut || st.intro > 0.6 ? 1 : st.clapAnim > 0 ? 0.6 : 0;
      K.bellow(tx - 44, ty + 2, 0.62, { shout, face: -1 });
    }
    K.drawParts(st, 0);
  }
  function drawFlat(st, it, t) {
    const l0 = it.lanes[0], l1 = it.lanes[it.lanes.length - 1], sx = it.x - st.dist, y = laneY(l1) + 8, top = laneY(l0) - 96 * laneSc(l0);
    const u = it.rise === undefined ? 1 : K.smooth(it.rise), h = (y - top) * u;
    if (it.torn) {
      // the torn frame left standing, scraps on the road
      ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 4; ctx.strokeRect(sx - 14, y - (y - top), 28, y - top);
      return;
    }
    if (it.smashed) { ctx.save(); ctx.translate(sx, y); ctx.rotate(0.9); K.flat(-14, 0, 28, y - top, { back: true }); ctx.restore(); return; }
    const isEnd = it.k === 'end';
    // a flat is seen from the side as a tall thin board with its picture facing the car (and a wide sign over it)
    const fw = 34;
    K.flat(sx - fw / 2, y, fw, h, { paper: st.scene === it.sc, t, paint: (x, yy, w, hh) => paint(it.sc, x, yy, w, hh, t, it.i) });
    if (u >= 1) {
      // the scene sign: a board over the flat with the picture and the word
      const signW = isEnd ? 120 : 84;
      ctx.fillStyle = 'rgba(16,16,24,0.9)'; rr(sx - signW / 2, top - 46, signW, 30, 6); ctx.fill();
      ctx.strokeStyle = st.scene === it.sc ? '#8fe3b0' : '#ffffff'; ctx.lineWidth = 2; rr(sx - signW / 2, top - 46, signW, 30, 6); ctx.stroke();
      icon(it.sc, sx - signW / 2 + 15, top - 31, 0.75, t);
      text(isEnd ? 'THE END' : SCN[it.sc].name, sx + 10, top - 30.5, isEnd ? 14 : 11, '#ffffff', 'center', 'body');
      // the lanes it covers: a bracket down the side
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(sx + fw / 2 + 6, top); ctx.lineTo(sx + fw / 2 + 6, y); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  function drawItem(st, it, t) {
    if (it.gone) return;
    const sx = it.x - st.dist, l = it.lanes[0], y = laneY(l) + 6, s = laneSc(l);
    if (sx < -340 || sx > W + 340) return;
    if (it.k === 'flat' || it.k === 'end') { if (it.shown) drawFlat(st, it, t); return; }
    if (it.done && it.k !== 'ramp' && it.k !== 'dune' && it.k !== 'buses' && !it.smashed) return;
    const on = active(it, st.scene) || it.done;
    if (!on) return;
    const drop = it.drop > 0 ? -it.drop * 200 : 0;
    ctx.save(); ctx.translate(0, drop);
    const wob = K.wobble(it.i, t, 0.05);
    if (it.k === 'reel') { if (!it.done) K.reel(sx, it.high ? y - 150 : y - 26, 11 * s, t); }
    else if (it.k === 'taxi') {
      ctx.save(); ctx.translate(sx, y); ctx.rotate(wob * 0.3); ctx.scale(s, s);
      // a cardboard taxi (art pass): corrugated card with a shaded lower body, a lit roof line, a chequer band, glazed
      // windows with a glare, hubcaps, a torn corner showing the flutes, and a wooden strut propping it from behind
      RICH.pic('w36taxi', 104, 66, c => {
        c.translate(52, 58);
        RICH.shadow(c, 0, 0, 50, 5, 0.22);
        c.strokeStyle = '#8a6a40'; c.lineWidth = 3; c.beginPath(); c.moveTo(-30, -2); c.lineTo(-14, -44); c.moveTo(30, -2); c.lineTo(12, -44); c.stroke();
        c.beginPath(); c.moveTo(-48, -8); c.lineTo(-44, -30); c.lineTo(-20, -32); c.lineTo(-12, -50); c.lineTo(22, -50); c.lineTo(32, -32); c.lineTo(48, -30); c.lineTo(48, -8); c.closePath();
        c.fillStyle = '#ffd23a'; c.fill();
        c.save(); c.clip();
        c.fillStyle = '#e8b420'; c.fillRect(-50, -20, 100, 14);
        c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(-50, -32, 100, 2); c.fillRect(-14, -50, 36, 2);
        c.fillStyle = 'rgba(140,100,0,0.18)'; for (let k = -46; k < 48; k += 4) c.fillRect(k, -50, 1, 44);
        c.fillStyle = '#c89a10'; c.beginPath(); c.moveTo(48, -30); c.lineTo(40, -30); c.lineTo(44, -24); c.lineTo(48, -26); c.closePath(); c.fill();
        c.restore();
        c.strokeStyle = '#8a6a00'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-48, -8); c.lineTo(-44, -30); c.lineTo(-20, -32); c.lineTo(-12, -50); c.lineTo(22, -50); c.lineTo(32, -32); c.lineTo(48, -30); c.lineTo(48, -8); c.closePath(); c.stroke();
        for (const wx of [-9, 7]) { c.fillStyle = '#7fb8e8'; c.fillRect(wx, -46, 13, 12); c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.moveTo(wx + 2, -34); c.lineTo(wx + 7, -46); c.lineTo(wx + 10, -46); c.lineTo(wx + 5, -34); c.closePath(); c.fill(); c.strokeStyle = '#6a5000'; c.lineWidth = 1; c.strokeRect(wx, -46, 13, 12); }
        for (let k = 0; k < 12; k++) { c.fillStyle = k % 2 ? '#1a1a22' : '#fff4c8'; c.fillRect(-42 + k * 7, -26, 7, 3.5); c.fillStyle = k % 2 ? '#fff4c8' : '#1a1a22'; c.fillRect(-42 + k * 7, -22.5, 7, 3.5); }
        c.strokeStyle = '#8a6a00'; c.lineWidth = 1; c.beginPath(); c.moveTo(-6, -30); c.lineTo(-6, -10); c.moveTo(14, -30); c.lineTo(14, -10); c.stroke();
        c.fillStyle = '#fff6c8'; c.fillRect(44, -28, 4, 5); c.fillStyle = '#ff6a4a'; c.fillRect(-48, -28, 3, 5);
        for (const wx of [-28, 28]) { c.fillStyle = '#1e1e26'; c.beginPath(); c.arc(wx, -8, 9, 0, Math.PI * 2); c.fill(); c.fillStyle = '#9a9aa4'; c.beginPath(); c.arc(wx, -8, 4.5, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(wx - 1.5, -9.5, 1.5, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#3a3a44'; c.lineWidth = 1; c.beginPath(); c.arc(wx, -8, 7, 0, Math.PI * 2); c.stroke(); }
        c.fillStyle = '#ffffff'; RICH.rr(c, -10, -60, 22, 9, 2); c.fill(); c.strokeStyle = '#8a8a96'; c.lineWidth = 1; c.stroke();
        c.fillStyle = '#1a1a22'; c.font = '700 7px "Atkinson Hyperlegible", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('TAXI', 1, -55.3);
      }, -52, -58);
      ctx.restore();
      K.propTag(sx + 30 * s, y - 40 * s, 0.9);
    } else if (it.k === 'steam') {
      ctx.fillStyle = '#3a3a44'; ctx.beginPath(); ctx.ellipse(sx, y - 2, 18 * s, 5 * s, 0, 0, TAU); ctx.fill();
      for (let k = 0; k < 5; k++) { const ph = (t * 1.6 + k / 5) % 1; ctx.fillStyle = 'rgba(240,240,250,' + (0.7 - ph * 0.6) + ')'; circle(sx + Math.sin(ph * 8 + k) * 6, y - 8 - ph * 50, 7 + ph * 10); ctx.fill(); }
      K.propTag(sx + 22, y - 30, 0.8);
    } else if (it.k === 'weed') {
      const r = 16 * s;
      ctx.save(); ctx.translate(sx, y - r - 2 - Math.abs(Math.sin(t * 6 + it.i)) * 10); ctx.rotate(-t * 6);
      ctx.strokeStyle = '#a8804a'; ctx.lineWidth = 2; for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc(0, 0, r - k * 2, k, k + 4); ctx.stroke(); }
      ctx.restore();
      K.propTag(sx + 18, y - 44, 0.75);
    } else if (it.k === 'cone' || it.k === 'cable') {
      if (it.k === 'cone') { ctx.save(); ctx.translate(sx, y); ctx.scale(s, s); drawCone(); ctx.restore(); }
      else { K.cable(sx - 20, y - 6, sx + 20, y - 6, 4); ctx.fillStyle = '#ffd23a'; ctx.fillRect(sx - 3, y - 12, 6, 8); }
      K.propTag(sx + 16, y - 26, 0.7);
    } else if (it.k === 'stand') { K.light(sx, y, s * 1.1, { on: true, beam: 0, dir: -1, real: true }); }
    else if (it.k === 'gen') {
      ctx.save(); ctx.translate(sx, y); ctx.scale(s, s);
      K.steel(-60, -56, 120, 46, {});
      ctx.fillStyle = '#20262e'; ctx.fillRect(-58, -40, 30, 18); ctx.fillStyle = '#ffd23a'; text('GEN', 20, -36, 10, '#20262e', 'center', 'body');
      ctx.fillStyle = '#14161c'; circle(-36, -8, 11); ctx.fill(); circle(36, -8, 11); ctx.fill();
      ctx.restore();
      K.realTag(sx, y - 62 * s, 60, 1);
    } else if (it.k === 'hole') {
      // a real roadworks hole: a broken tarmac rim with chunks, the dark pit with a glimpse of pipe, sawhorse legs
      ctx.fillStyle = '#5a5a66'; ctx.beginPath(); ctx.ellipse(sx, y - 1, 38 * s, 10 * s, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#0a0a10'; ctx.beginPath(); ctx.ellipse(sx, y - 2, 34 * s, 8 * s, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a2a34'; ctx.beginPath(); ctx.ellipse(sx, y - 4.5, 30 * s, 4.5 * s, 0, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = '#4a5a6a'; ctx.fillRect(sx - 22 * s, y - 1, 44 * s, 3 * s);
      ctx.fillStyle = '#7a7a86'; for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + 0.3, px = sx + Math.cos(a) * 36 * s, py = y - 1 + Math.sin(a) * 9 * s; ctx.beginPath(); ctx.moveTo(px - 3, py); ctx.lineTo(px, py - 3); ctx.lineTo(px + 3.5, py - 0.5); ctx.lineTo(px + 1, py + 2); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx - 34 * s, y - 2); ctx.lineTo(sx - 30 * s, y - 34 * s); ctx.moveTo(sx + 34 * s, y - 2); ctx.lineTo(sx + 30 * s, y - 34 * s); ctx.stroke();
      K.realTag(sx, y - 34 * s, 70 * s, 1.1);
    } else if (it.k === 'ramp' || it.k === 'dune') {
      for (const ln of it.lanes) {
        const yy = laneY(ln) + 6, ss = laneSc(ln);
        ctx.save(); ctx.translate(sx, yy); ctx.scale(ss, ss);
        if (it.k === 'dune') drawDune(); else drawRamp();
        ctx.restore();
      }
      if (!it.done) text('JUMP', sx + 8, laneY(it.lanes[0]) - 30, 10, '#ffe7a8', 'center', 'body');
    } else if (it.k === 'buses') {
      // a row of cardboard buses across all three lanes
      for (let k = 0; k < 3; k++) {
        const bx = sx - 120 + k * 120, by = laneY(1) + 6;
        ctx.save(); ctx.translate(bx, by); ctx.rotate(K.wobble(k, t, 0.02));
        drawBus(!!it.smashed);
        ctx.restore();
        K.propTag(bx + 36, by - 54, 0.9);
      }
    }
    ctx.restore();
  }
  // a traffic cone (feet at 0, 0): a square rubber base, a shaded cone with two reflective bands and a lit edge
  function drawCone() {
    RICH.pic('w36cone', 28, 32, c => {
      c.translate(14, 30);
      RICH.shadow(c, 0, 0, 13, 2.5, 0.25);
      c.fillStyle = '#3a3a44'; c.beginPath(); c.moveTo(-13, 0); c.lineTo(-11, -4); c.lineTo(11, -4); c.lineTo(13, 0); c.closePath(); c.fill();
      c.fillStyle = '#5a5a66'; c.fillRect(-11, -4, 22, 1.5);
      c.beginPath(); c.moveTo(-9, -4); c.lineTo(-1.5, -27); c.lineTo(1.5, -27); c.lineTo(9, -4); c.closePath();
      const g = c.createLinearGradient(-9, 0, 9, 0); g.addColorStop(0, '#ff9a4a'); g.addColorStop(0.45, '#ff7a2a'); g.addColorStop(1, '#c84a10');
      c.fillStyle = g; c.fill();
      c.save(); c.clip();
      c.fillStyle = '#f4f4f8'; c.fillRect(-10, -18, 20, 4); c.fillRect(-10, -11, 20, 3);
      c.fillStyle = 'rgba(160,170,190,0.6)'; c.fillRect(2, -18, 8, 4); c.fillRect(3, -11, 8, 3);
      c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.moveTo(-6, -5); c.lineTo(-1, -26); c.lineTo(0.5, -26); c.lineTo(-3.5, -5); c.closePath(); c.fill();
      c.restore();
      c.strokeStyle = '#8a3008'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-9, -4); c.lineTo(-1.5, -27); c.lineTo(1.5, -27); c.lineTo(9, -4); c.stroke();
    }, -14, -30);
  }
  // the stunt ramp (side view, foot at -37, top of the lip at 37, -26; same wedge as its jump): a plywood side panel
  // with grain, a braced frame of battens with bolts, a steel lip and yellow-black chevrons on the deck edge
  function drawRamp() {
    RICH.pic('w36ramp', 80, 34, c => {
      c.translate(40, 30);
      RICH.shadow(c, 2, 0, 40, 3, 0.25);
      const wedge = () => { c.beginPath(); c.moveTo(-37, 0); c.lineTo(37, -26); c.lineTo(37, 0); c.closePath(); };
      c.save(); wedge(); c.clip();
      RICH.wood(c, -37, -26, 74, 26, { col: '#9a7448', vert: true, bw: 12, seed: 8, knots: 0.8, edge: false });
      c.strokeStyle = '#5a3e20'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(35, -24); c.lineTo(35, -1); c.moveTo(12, -17); c.lineTo(12, -1); c.moveTo(-12, -8); c.lineTo(-12, -1); c.moveTo(12, -2); c.lineTo(35, -22); c.stroke();
      c.strokeStyle = 'rgba(255,230,190,0.3)'; c.lineWidth = 1; c.beginPath(); c.moveTo(33.5, -23); c.lineTo(33.5, -1); c.moveTo(10.5, -16); c.lineTo(10.5, -1); c.stroke();
      for (const [bx, by] of [[35, -20], [35, -4], [12, -14], [12, -4], [-12, -4]]) RICH.nail(c, bx, by, 1.3);
      c.fillStyle = 'rgba(30,20,10,0.25)'; c.fillRect(-37, -4, 74, 4);
      c.restore();
      // the deck: a thick board along the slope with chevrons, the steel lip at the top
      c.save(); c.translate(-37, 0); c.rotate(Math.atan2(-26, 74));
      const L = Math.hypot(74, 26);
      c.fillStyle = '#6a4a26'; c.fillRect(0, -1, L, 5);
      c.save(); c.beginPath(); c.rect(0, -3.5, L, 3.5); c.clip(); c.fillStyle = '#f2c230'; c.fillRect(0, -3.5, L, 3.5); c.fillStyle = '#2a2a30'; for (let k = 0; k < L; k += 9) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 4, 0); c.lineTo(k + 7.5, -3.5); c.lineTo(k + 3.5, -3.5); c.closePath(); c.fill(); } c.restore();
      c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(0, -3.5, L, 0.8);
      c.fillStyle = '#9aa4b0'; c.fillRect(L - 9, -4.5, 9, 6); c.fillStyle = '#ffffff'; c.fillRect(L - 9, -4.5, 9, 1.2);
      c.restore();
      c.strokeStyle = '#3a2810'; c.lineWidth = 1.5; wedge(); c.stroke();
    }, -40, -30);
  }
  // a sand dune (same wedge): a lit windward slope, a shaded lee, wind ripples, a few pebbles and a tuft of grass
  function drawDune() {
    RICH.pic('w36dune', 80, 34, c => {
      c.translate(40, 30);
      RICH.shadow(c, 4, 0, 40, 3, 0.18);
      c.beginPath(); c.moveTo(-37, 0); c.quadraticCurveTo(10, -12, 37, -26); c.lineTo(37, 0); c.closePath();
      c.fillStyle = '#e8b46a'; c.fill();
      c.save(); c.clip();
      c.fillStyle = '#c8904a'; c.beginPath(); c.moveTo(37, -26); c.lineTo(37, 0); c.lineTo(18, 0); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(150,100,40,0.45)'; c.lineWidth = 1; c.beginPath(); for (let k = 0; k < 6; k++) { const yy = -3 - k * 3.6; c.moveTo(-30 + k * 9, yy + 2); c.quadraticCurveTo(-18 + k * 9, yy - 2, -6 + k * 10, yy); } c.stroke();
      c.fillStyle = 'rgba(255,240,200,0.5)'; c.beginPath(); c.moveTo(-37, 0); c.quadraticCurveTo(10, -12, 37, -26); c.lineTo(37, -24); c.quadraticCurveTo(10, -9.5, -37, 1); c.closePath(); c.fill();
      c.restore();
      RICH.pebble(c, -14, -3, 2, '#b89a70', 4); RICH.pebble(c, 22, -5, 1.6, '#a88a60', 7);
      c.strokeStyle = '#6a8a3a'; c.lineWidth = 1.2; c.beginPath(); for (const d of [-3, 0, 3]) { c.moveTo(-24, -4); c.lineTo(-24 + d * 1.5, -11 + Math.abs(d)); } c.stroke();
      c.strokeStyle = '#b8843a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-37, 0); c.quadraticCurveTo(10, -12, 37, -26); c.lineTo(37, 0); c.stroke();
    }, -40, -30);
  }
  // a cardboard bus prop (feet at 0, 0): orange card with a shaded skirt, corrugated flutes showing at a torn top
  // corner, glazed windows with glare, a door, a route sign, hubcaps, and a strut behind. smashed: grey-brown, bent
  function drawBus(smashed) {
    RICH.pic('w36bus' + (smashed ? 'x' : ''), 124, 84, c => {
      c.translate(62, 74);
      RICH.shadow(c, 0, 0, 58, 5, 0.22);
      c.strokeStyle = '#8a6a40'; c.lineWidth = 3; c.beginPath(); c.moveTo(-30, -2); c.lineTo(-10, -60); c.moveTo(30, -2); c.lineTo(10, -60); c.stroke();
      const body = smashed ? '#a8a080' : '#e8622a';
      RICH.rr(c, -56, -64, 112, 56, 8); c.fillStyle = body; c.fill();
      c.save(); RICH.rr(c, -56, -64, 112, 56, 8); c.clip();
      c.fillStyle = RICH.dk(body, 0.2); c.fillRect(-56, -26, 112, 18);
      c.fillStyle = smashed ? '#d8d0b0' : '#fff0d8'; c.fillRect(-56, -30, 112, 4);
      c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(-56, -64, 112, 2.5);
      c.fillStyle = RICH.rgba(RICH.dk(body, 0.5), 0.18); for (let k = -54; k < 56; k += 4) c.fillRect(k, -62, 1, 54);
      for (let w = 0; w < 5; w++) {
        const wx = -48 + w * 20;
        c.fillStyle = smashed ? '#8a9aa4' : '#9fd0f4'; c.fillRect(wx, -56, 14, 16);
        c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.moveTo(wx + 2, -40); c.lineTo(wx + 8, -56); c.lineTo(wx + 11, -56); c.lineTo(wx + 5, -40); c.closePath(); c.fill();
        c.strokeStyle = RICH.dk(body, 0.55); c.lineWidth = 1.2; c.strokeRect(wx, -56, 14, 16);
      }
      c.fillStyle = RICH.dk(body, 0.35); c.fillRect(38, -38, 12, 26); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(39, -37, 4, 24);
      // torn top-right corner with the corrugated flutes showing
      c.fillStyle = '#c8a070'; c.beginPath(); c.moveTo(56, -64); c.lineTo(36, -64); c.lineTo(42, -58); c.lineTo(46, -60); c.lineTo(50, -52); c.lineTo(56, -54); c.closePath(); c.fill();
      c.strokeStyle = '#8a6a40'; c.lineWidth = 1; c.beginPath(); for (let k = 38; k < 56; k += 3) { c.moveTo(k, -64); c.lineTo(k + 2, -56); } c.stroke();
      c.restore();
      if (smashed) { c.strokeStyle = '#6a6040'; c.lineWidth = 2; c.beginPath(); c.moveTo(-20, -64); c.lineTo(-12, -40); c.lineTo(-22, -20); c.stroke(); }
      c.strokeStyle = RICH.dk(body, 0.6); c.lineWidth = 2; RICH.rr(c, -56, -64, 112, 56, 8); c.stroke();
      c.fillStyle = '#20202a'; RICH.rr(c, -46, -72, 30, 9, 2); c.fill(); c.fillStyle = '#ffd23a'; c.font = '700 6.5px "Atkinson Hyperlegible", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ROUTE 36', -31, -67.3);
      for (const wx of [-34, 34]) { c.fillStyle = '#1a1a22'; c.beginPath(); c.arc(wx, -8, 9, 0, Math.PI * 2); c.fill(); c.fillStyle = '#9a9aa4'; c.beginPath(); c.arc(wx, -8, 4.5, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(wx - 1.5, -9.5, 1.5, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#fff6c8'; c.fillRect(52, -22, 4, 6);
    }, -62, -74);
  }
  function drawCar(st, t) {
    const c = st.car, g = geom(st), s = g.sc, x = g.x, y = g.y - g.z, tilt = c.air > 0 ? (c.big ? -0.12 + (1 - c.air / c.airMax) * 0.2 : -0.06) : Math.sin(t * 9) * 0.004;
    // shadow on the road
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, g.y + 4, 58 * s * (1 - g.z / 260), 7 * s, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(s, s);
    if (c.hitT > 0 && Math.sin(t * 40) > 0) ctx.globalAlpha = 0.6;
    // smoke from the bonnet after a couple of dents
    if (c.dents >= 2) for (let k = 0; k < 3; k++) { const ph = (t * 1.2 + k / 3) % 1; ctx.fillStyle = 'rgba(60,60,70,' + (0.5 - ph * 0.45) + ')'; circle(40 - ph * 30, -34 - ph * 40, 6 + ph * 10); ctx.fill(); }
    // the body: a long stunt car with a roll bar, open at the back where the scene hero stands
    const bodyCol = '#f2f2f6';
    ctx.fillStyle = bodyCol; ctx.strokeStyle = '#2a2a34'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-58, -10); ctx.lineTo(-58, -28); ctx.lineTo(-20, -30); ctx.lineTo(4, -44); ctx.lineTo(28, -44); ctx.lineTo(42, -30); ctx.lineTo(60, -26); ctx.lineTo(62, -10); ctx.closePath(); ctx.fill();
    // body shading: a shaded sill, a lit shoulder line, the door seam and handle, a sponsor roundel
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#c8ccd8'; ctx.fillRect(-60, -16, 124, 8); ctx.fillStyle = '#ffffff'; ctx.fillRect(-60, -29, 124, 2);
    ctx.fillStyle = 'rgba(40,40,60,0.18)'; ctx.fillRect(-60, -11, 124, 3);
    ctx.restore(); ctx.stroke();
    ctx.fillStyle = '#e8322a'; ctx.fillRect(-58, -22, 120, 5); ctx.fillStyle = '#2a6ae8'; ctx.fillRect(-58, -17, 120, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(-58, -22, 120, 1);
    ctx.strokeStyle = 'rgba(42,42,52,0.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, -11); ctx.moveTo(30, -30); ctx.lineTo(32, -11); ctx.stroke();
    ctx.fillStyle = '#5a5a66'; ctx.fillRect(18, -27, 7, 2);
    ctx.fillStyle = '#ffffff'; circle(-40, -38, 8); ctx.fill(); ctx.strokeStyle = '#2a2a34'; ctx.lineWidth = 1.2; circle(-40, -38, 8); ctx.stroke(); ctx.strokeStyle = '#2a2a34'; ctx.lineWidth = 2;
    ctx.fillStyle = '#9fd8ff'; ctx.beginPath(); ctx.moveTo(8, -41); ctx.lineTo(26, -41); ctx.lineTo(36, -31); ctx.lineTo(8, -31); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-34, -30); ctx.lineTo(-30, -50); ctx.lineTo(-14, -50); ctx.lineTo(-12, -30); ctx.stroke();
    text('36', -40, -37.5, 8.5, '#2a2a34', 'center', 'display');
    // dents: a hanging bumper, a flapping door
    if (c.dents >= 1) { ctx.save(); ctx.translate(60, -12); ctx.rotate(0.5 + Math.sin(t * 12) * 0.1); ctx.fillStyle = '#9a9aa4'; ctx.fillRect(-2, 0, 4, 16); ctx.restore(); }
    if (c.dents >= 3) { ctx.save(); ctx.translate(-4, -30); ctx.rotate(-0.4 + Math.sin(t * 9) * 0.25); ctx.fillStyle = bodyCol; ctx.strokeStyle = '#2a2a34'; ctx.lineWidth = 1.5; ctx.fillRect(-22, 0, 22, 18); ctx.strokeRect(-22, 0, 22, 18); ctx.restore(); }
    // tyres with a tread rim, five-spoke hubs that turn with the road, a glint
    for (const wx of [-38, 40]) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(wx, 2, 12, 2.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1a1a22'; circle(wx, -8, 11); ctx.fill();
      ctx.strokeStyle = '#3a3a46'; ctx.lineWidth = 1.5; circle(wx, -8, 9.5); ctx.stroke();
      ctx.fillStyle = '#b8bcc8'; circle(wx, -8, 6); ctx.fill();
      ctx.strokeStyle = '#6a6e7a'; ctx.lineWidth = 1.4; ctx.beginPath(); const sp = st.dist * 0.06; for (let q = 0; q < 5; q++) { const a = sp + q * TAU / 5; ctx.moveTo(wx, -8); ctx.lineTo(wx + Math.cos(a) * 5.5, -8 + Math.sin(a) * 5.5); } ctx.stroke();
      ctx.fillStyle = '#e8eaf0'; circle(wx, -8, 1.8); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(wx - 3, -11, 1.4); ctx.fill();
    }
    ctx.fillStyle = '#fff6c8'; ctx.fillRect(58, -26, 4, 6);
    ctx.restore();
    // the heroes: the driver behind the wheel, the scene hero standing in the back with the clapper
    const look = 'stunt';
    K.stunt(st.drv, x + 18 * s, y - 26 * s, { s: 0.85 * s, face: 1, look });
    const hx = x - 30 * s, hy = y - 32 * s;
    K.stunt(st.hero, hx, hy, { s: 0.9 * s, face: 1, look, arms: st.clapAnim > 0 ? 'up' : 'fwd' });
    const open = st.clapAnim > 0 ? Math.max(0, (st.clapAnim - 0.2) / 0.15) : st.cdT > 0 ? 0 : 0.8;
    K.clapper(hx + 4 * s, hy - 44 * s, 0.45 * s, open, st.k + 1, { gold: st.gold, scene: SCN[st.roll ? st.roll.to : st.scene].name });
  }
  function drawTop(st) {
    K.drawPops(st, 0, 0);
    K.frame(st.clock, st.state === 'go' && G.introT <= 0);
    if (st.cut) K.drawCut(st, st.k + 1);
    if (st.intro > 0.8 && G.introT <= 0) { const u = (st.intro - 0.8) / 0.8; K.clapper(W / 2, H / 2 - 30, 2.2, u > 0.5 ? 1 : u * 2, st.k + 1, { scene: st.title.toUpperCase().slice(0, 14) }); }
    if (st.lastRoom && st.state === 'end') {
      // the red carpet unrolls under the car
      const u = K.smooth(st.endT / 1.2), g = geom(st);
      ctx.fillStyle = K.COL.carpet; ctx.fillRect(g.x - 60, g.y + 6, (W - g.x + 60) * u, 14);
    }
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = '◎ ' + st.reels + ' / 20';
      ctx.font = K.FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, cy, fs, C.gold, 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play || !st.car) return;
    K.takeMeter(W / 2 - 120 * z, H - 34 * z, 240 * z, 14 * z, st.meter / 100, z);
    const pl = plan(st, { cpuHero: K.quiet(st.hero) || cpuOn(st.hero) }), c = st.car, D = st.drv, Hn = st.hero;
    const kk = (id, what) => (K.quiet(id) ? '' : K.key(id, what) + ' ');
    {
      const bx = K.panel(D, 'driver', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(D, 'up') + kk(D, 'down') + 'LANE ' + (c.lane + 1), pl.drv.lane !== c.lane, c.ly !== c.lane, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(D, 'act') + 'STUNT!', pl.drv.hop, c.air > 0, z);
    }
    {
      const a = avail(st), next = a[Math.min(st.dial, a.length - 1)];
      const bx = K.panel(Hn, 'scene', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(Hn, 'lr') + '▸ ' + SCN[next].name, pl.hero.dial !== 0, false, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, st.cdT > 0 ? 'clap ' + st.cdT.toFixed(1) : kk(Hn, 'act') + 'CLAP!', pl.hero.clap, !!st.roll, z);
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
    const P = K.prompter(st), g = geom(st);
    {
      let s = null, col = C.gold, pulse = false;
      if (pl.drv.hop) { s = (pl.drv.why === 'ramp' ? 'Ramp! STUNT! ' : 'STUNT! ') + K.key(D, 'act'); pulse = true; }
      else if (pl.drv.lane < c.lane) { s = 'Lane up! ' + K.key(D, 'up'); pulse = true; }
      else if (pl.drv.lane > c.lane) { s = 'Lane down! ' + K.key(D, 'down'); pulse = true; }
      P.say(D, s, clamp(g.x + 60, 70, W - 70), g.top - 70, col, pulse);
    }
    {
      let s = null, col = C.gold, pulse = false;
      if (pl.hero.target !== null && pl.hero.target !== undefined) {
        if (pl.hero.dial !== 0) { s = 'Dial to ' + SCN[pl.hero.target].name + ' ' + K.key(Hn, pl.hero.dial > 0 ? 'right' : 'left'); pulse = true; }
        else if (pl.hero.clap) { s = 'CLAP! ' + K.key(Hn, 'act'); pulse = true; }
        else if (st.cdT > 0) { s = 'Clapper resetting...'; col = '#ffffff'; }
      }
      P.say(Hn, s, clamp(g.x - 40, 70, W - 70), g.top - 104, col, pulse);
    }
  }

  MODES.takeone = {
    S, SCN, TAKES, plan, geom, layout, eta, active,
    medals: { bronze: 'Wrap the car chase', goals: [{ key: 'time', gold: S.goldT, silver: S.silverT }] },
    medalValues() { return {}; },
    setup(st, L) {
      st.stats = { crashes: 0, bursts: 0, claps: 0, reels: 0, retakes: 0, hops: 0, jumps: 0, cleared: 0, helps: 0, roomT: [] };
      st.reels = 0; st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0;
      st.seed = Math.floor(Math.random() * 1e9);
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; for (const row of L.grid) row.fill('.'); room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.car) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.car) drawTop(st); },
    hud() { const st = G.mst; if (st.car) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Crashes', value: String(s.crashes) },
        { label: 'Bursts', value: String(s.bursts) },
        { label: 'Reels', value: st.reels + ' of 20' },
      ];
      out.push('Scene changes: ' + s.claps + '. Retakes: ' + s.retakes + '. That\'s a wrap!');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  const acts = d => ({ label: 'clap', labels: d === 0 ? ['stunt', 'clap'] : ['clap', 'stunt'] });
  STUDIO.defs.takeone = {
    name: 'Car Chase, Take One', world: 35, kind: 'team', mode: 'takeone', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Take', outfit: 'none',
    jobs: {
      driver: { title: 'Driver', act: 'stunt', legend: '<kbd>W</kbd><kbd>S</kbd> change lane <kbd>A</kbd><kbd>D</kbd> slower, faster',
        howTo: ['Stunt! is a hop over low things.'] },
      scene: { title: 'Scene hero', act: 'clap', legend: '<kbd>A</kbd><kbd>D</kbd> turn the scene dial',
        howTo: ['Clap rolls the backdrop to the scene on the dial.'] },
    },
    jobOf: 'drv', jobSwap: 'You swap jobs every take.',
    tip: 'Film the chase! The driver changes lanes and hops low things; the scene hero dials the movie and claps so the paper flats match.',
    act: acts(0),
    map: K.stubMap(),
    rooms: [
      { title: 'Downtown', drv: 0, act: acts(0), tip: 'Pip drives (▲ ▼ lanes, action = Stunt! hop). Bo turns the scene dial (◀ ▶) and Claps: a flat is paper only in its own scene!' },
      { title: 'Location Shoot', drv: 1, act: acts(1), tip: 'Swap jobs! Snow covers the cones but makes lane changes slow and slippy. Stunt! on a ramp for a big jump.' },
      { title: 'Night Shoot', drv: 0, act: acts(0), tip: 'Night is dark except the headlights: watch for the red lights on REAL things. Some flats are full width now!' },
      { title: 'The Big Finish', drv: 1, act: acts(1), tip: 'Rows of three flats: Clap on the cooldown! Jump the buses, then Clap to PREMIERE and Stunt! through THE END.' },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.takeoneTick = function () { this.tone(1400, 0.03, 'square', 0.015, 1100); };
  Sfx.extra.takeoneRoll = function () { this.tone(200, 0.5, 'sawtooth', 0.012, 120); };
  Sfx.extra.takeoneLane = function (p) { p = p || 1; this.tone(300 * p, 0.08, 'triangle', 0.03, 380 * p); };
  Sfx.extra.takeoneHop = function () { this.tone(260, 0.14, 'square', 0.03, 520); };
  Sfx.extra.takeoneJump = function () { this.tone(180, 0.4, 'sawtooth', 0.03, 700); this.tone(900, 0.2, 'triangle', 0.02, 1400, 0.1); };
  Sfx.extra.takeoneLand = function () { this.tone(120, 0.1, 'triangle', 0.05, 70); };
  Sfx.extra.takeoneFlat = function () { this.tone(500, 0.06, 'triangle', 0.02, 700); };
  Sfx.extra.takeoneFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.055, null, i * 0.12)); };
})();
