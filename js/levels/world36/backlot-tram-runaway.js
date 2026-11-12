/* Pip & Bo - Level 36-2 Backlot Tram Runaway (team, World 36 Movie Studio). */
'use strict';

/* ===== 36-2 Backlot Tram Runaway (mode 'tramrun', team, scrolls right through four film sets, Gavyn's pick) =====
   The studio tour tram has lost its brakes and rolls through one film set after another. One hero stays aboard on the
   hand brake and the track switches; the other jumps off, sprints ahead to clear the props off the line, and jumps back
   on as the tram catches up. Jobs swap every take. World px: x along the track (st.cam is the camera), the main line's
   rails at S.base, an upper line (a trestle S.tresH px up) at forks. ownStep + ownHUD + noFalls.
   THE TRAM: three open cars (front car first) with a striped canopy and cardboard tourists. It rolls at st.T.v (rising
     each take) and the brake slows it toward S.vBrake.
   THE BRAKE HERO (G.mst.brk, always aboard): HOLD the action on the front car to haul the hand brake. The brake heats
     (full in S.heatT s of holding, cools in S.coolT s); full = smoke, useless for S.cookT s ("Brake's cooked!"), so it
     is spent in short pulls. ▲ / ▼ throw the next track switch (the arrow over the fork; it locks S.lockD px before
     the fork). ◀ ▶ walk along the cars. CATCH: when the runner jumps for a car and comes up a little short (within
     S.catchD px behind it), a tap of the action by the brake hero standing on that car pulls them aboard.
   THE RUNNER: jump (with ▶ held) off the front, and runs at S.runV, a bit faster than the unbraked tram. On foot: ◀ ▶
     run, ▲ jump (▲ at the foot of a trestle ramp walks up it; ▼ + jump drops through the trestle), and the action does
     the job in front of them. Land on a car deck to get back aboard (a jump as the car arrives). A runner the tram
     catches on the ground is scooped onto the cowcatcher with a honk (no harm), but an unfinished job is undone.
   JOBS on the line (a ring shows what is left): PUSH a prop off the rails (hold toward it), CRANK a gate or bridge open
     (tap the action at the post), UNPLUG a cable (press at the plug box beside the line), LEVER pairs (hold the
     action at the lever while the tram passes over the trapdoor or under the boulder; then catch the last car).
     REAL obstructions (glossy, rivets, the red REAL stripe) can't be moved: the fix is the switch. The upper line is
     hidden behind a painted curtain until the tram is within S.seeT px, but the runner sees it first (S.runSee px
     around them): at the fork sign, ▲ or ▼ calls "Go up!" or "Stay low!" and the brake hero's arrow flashes.
     An uncleared prop is a crash (cutouts fly, the take meter drops); a REAL obstruction is a big crash (double).
   SETS (one per take, about 40 s): Dusty Gulch (foam cacti, a saloon-door gate), Planet Zog (low-gravity wires: the
     runner jumps S.zogJump x higher and floats; cardboard rockets, a laser cable, a REAL lighting tower), Jungle Temple
     (a prop boulder on the upper line, a rope bridge, harmless rubber snakes, REAL mud that halves the runner's speed,
     a trapdoor lever), Monster Island (the monster's tail sweeps the line on a timer: brake to let it pass; its foot
     comes down on the upper line; two jobs in a row; at the end both heroes hold the big red emergency lever for
     S.finalT s together, the runner on the ground handle and the brake hero on the tram's, to stop a foot short of
     the gates).
   TAKE METER: as in 36-1. Empty: "CUT!", rewind, restart the take (a Retake).
   TICKETS: 20 golden tickets (5 a set), beside the line ahead of the tram, some high, 5 on the upper line.
   GOLD HELP (3 crashes in a take, both playing, announced, counted): gold brake shoes, the brake heats half as fast.
   IDLE: no person presses anything for 12 s: "Taking a break", the clock stops.
   MEDAL: Gold <= 215 s, Silver <= 330 s (a clean computer pair takes about 200 s; the line alone is 170 s).
   MODES.tramrun.plan(st) says what each job should do now (the prompts, HUD chips and the computer brain read it).
   Everything lives inside this block; sounds are Sfx.extra.tramrun*. */
(() => {
  const K = STUDIO, TAU = Math.PI * 2;
  const S = {
    base: 432, tresH: 86, ramp: 140, carL: 104, carGap: 8, deck: 30, frontX: 430, vBrake: 70, brakeAcc: 220, rollAcc: 60,
    heatT: 3.5, coolT: 5, cookT: 4, lockD: 60, catchD: 40, runV: 215, grav: 1500, jumpV: 560, zogJump: 1.6, walkV: 160,
    seeT: 330, runSee: 340, crankGap: 0.1, finalT: 1.5, crashCost: 24, realCost: 48, regen: 2, idleWait: 12, goldT: 215, silverT: 330,
  };
  const SETS = [
    { title: 'Dusty Gulch', v: 150, look: 'west' },
    { title: 'Planet Zog', v: 158, look: 'zog', zog: true },
    { title: 'Jungle Temple', v: 166, look: 'jungle' },
    { title: 'Monster Island', v: 174, look: 'monster' },
  ];
  const TRAM_L = 3 * S.carL + 2 * S.carGap;
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- a set's layout ----------
     jobs: { k, x (the prop / hazard on the line), line 'low'|'up', need, prog, ... }; forks: { x0, x1, sw, locked, route };
     tickets: { x, y (height above its line), line }. x is world px along the track; the tram's front starts at 0. */
  function layout(k) {
    const J = [], F = [], T = [];
    const job = (k2, x, o) => J.push(Object.assign({ k: k2, x, line: 'low', prog: 0, done: false }, o || {}));
    const fork = (x0, len, o) => { const f = Object.assign({ x0, x1: x0 + len, sw: 'low', locked: false, route: null, i: F.length }, o || {}); F.push(f); return f; };
    const tix = (x, h, line) => T.push({ x, h, line: line || 'low', got: false });
    if (k === 0) {
      job('push', 900, { need: 1.3, what: 'cactus' });
      tix(1250, 60); tix(1500, 120);
      job('crank', 2100, { need: 7, what: 'saloon' });
      const f = fork(2900, 1100); job('real', 3250, { line: 'low', what: 'trough' });
      tix(3300, 34, 'up'); tix(3550, 70, 'up');
      job('push', 4700, { need: 1.6, what: 'cactus' });
      tix(5000, 60);
      job('push', 5800, { need: 1.4, what: 'cactus' });
      return { jobs: J, forks: F, tix: T, end: 6500, f };
    }
    if (k === 1) {
      job('push', 900, { need: 1.5, what: 'rocket' });
      tix(1150, 150); tix(1400, 190);
      job('plug', 2000, { what: 'laser' });
      fork(2700, 1100); job('real', 3050, { line: 'low', what: 'tower' });
      tix(3200, 40, 'up');
      job('push', 4400, { need: 1.8, what: 'rocket' }); tix(4700, 120);
      fork(5000, 1000); job('real', 5300, { line: 'up', what: 'tower' });
      tix(5200, 160);
      job('plug', 6300, { what: 'laser' });
      return { jobs: J, forks: F, tix: T, end: 6900 };
    }
    if (k === 2) {
      job('crank', 900, { need: 8, what: 'bridge' });
      job('snake', 1300, { what: 'snake' });
      tix(1500, 70);
      fork(2000, 1200); job('lever', 2600, { line: 'up', what: 'boulder', zone: 160 }); tix(2450, 40, 'up');
      job('mud', 2350, { len: 200 });
      tix(2500, 120);
      job('push', 3900, { need: 1.6, what: 'idol' });
      job('lever', 4900, { line: 'low', what: 'trapdoor', zone: 120 });
      tix(4650, 70); tix(3500, 120);
      job('snake', 5600, { what: 'snake' });
      job('crank', 6200, { need: 8, what: 'bridge' });
      return { jobs: J, forks: F, tix: T, end: 6800 };
    }
    // Monster Island
    job('tail', 1100, { period: 5.0, sweep: 0.8, ph: 1.0 });
    tix(1350, 110);
    fork(1900, 1100); job('real', 2250, { line: 'up', what: 'foot' }); tix(2300, 70, 'up');
    tix(2600, 60);
    job('push', 3500, { need: 1.6, what: 'egg' });
    job('crank', 3850, { need: 8, what: 'fence' });
    tix(4200, 120); tix(5200, 90);
    job('tail', 4800, { period: 4.8, sweep: 0.8, ph: 2.6 });
    job('plug', 5500, { what: 'eyes' });
    job('final', 6300, {});
    return { jobs: J, forks: F, tix: T, end: 6420 };
  }

  /* ---------- the line ---------- */
  // y of the rails on a line at x (the trestle ramps up from the fork and down to the rejoin)
  function lineY(st, x, line) {
    if (line !== 'up') return S.base;
    const f = forkAt(st, x);
    if (!f) return S.base;
    const u = Math.min(clamp((x - f.x0) / S.ramp, 0, 1), clamp((f.x1 - x) / S.ramp, 0, 1));
    return S.base - S.tresH * u;
  }
  const forkAt = (st, x) => st.forks.find(f => x > f.x0 && x < f.x1) || null;
  // which line the tram takes at x (the switch, until it locks; then the route)
  const tramLine = (st, x) => { const f = forkAt(st, x); return f ? (f.route || f.sw) : 'low'; };
  function carSpan(st, j) { const x1 = st.tram.x - j * (S.carL + S.carGap); return { x0: x1 - S.carL, x1 }; }
  function carDeck(st, j, x) { const c = carSpan(st, j), mx = x === undefined ? (c.x0 + c.x1) / 2 : x; return lineY(st, mx, tramLine(st, mx)) - S.deck; }

  /* ---------- a take (one room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.brk = def.brk || 0; st.run = 1 - st.brk; st.title = def.title || ''; st.set = SETS[k];
    st.goldUsed = false; st.gold = false;
    labels(st);
    startTake(st);
    K.fx(st);
    st.intro = 1.6;
  }
  function startTake(st) {
    const L = layout(st.k);
    st.jobs = L.jobs; st.forks = L.forks; st.tix = L.tix; st.end = L.end;
    st.jobs.forEach((j, i) => { j.i = i; if (j.k === 'crank') j.taps = 0; });
    st.tram = { x: 0, v: st.set.v, heat: 0, cook: 0, braking: false, hitT: 0, smoke: 0, back: 0 };
    st.bh = { off: 30, face: 1 };
    st.rn = { x: -40, y: S.base - S.deck, vx: 0, vy: 0, on: 'car', car: 0, off: 40, face: 1, grounded: true, drop: 0, daze: 0, crankT: 0, line: 'low', airT: 0, lastJump: -9 };
    st.cam = 0; st.meter = 100; st.lastHit = -9; st.state = 'go'; st.endT = 0; st.cut = null;
    st.rc = { bad: 0 }; st.segStart = G.time; st.call = {}; st.callT = {}; st.bubble = null;
    st.final = { prog: 0, done: false }; st.tixTake = 0; st.party = false; st.cleared = false; st.planMemo = null;
    st.prevUp = [false, false]; st.prevDown = [false, false]; st.leftT = 0; st.tailUntil = 0;
  }
  function labels(st) { const w = []; w[st.brk] = 'brake'; w[st.run] = 'do it'; K.actLabels(w, 'brake'); }
  const zog = st => !!st.set.zog;

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.tram) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    st.clock += dt;
    if (st.intro > 0 && G.introT <= 0) { const i0 = st.intro; st.intro -= dt; if (i0 > 1.0 && st.intro <= 1.0) { Sfx.play('studioClap'); Sfx.play('studioAction'); K.pop(st, W / 2, 200, 'ACTION!', '#ffffff', 34); } }
    if (live) {
      brake(st, dt); tram(st, dt); runner(st, dt); jobs(st, dt);
      if (G.time - st.lastHit > 3) st.meter = Math.min(100, st.meter + S.regen * dt);
      if (st.meter <= 0) { st.state = 'cut'; st.stats.retakes++; K.retake(st); }
      if (st.k < 3 && st.tram.x >= st.end) endTake(st);
    } else if (st.state === 'cut') {
      if (K.cutStep(st, dt) === 'done') { startTake(st); K.msg(st, st.title + ', take ' + (st.k + 1) + ' again. Action!', '#ffffff', 2.5); Sfx.play('studioAction'); }
    } else if (st.state === 'end') endStep(st, dt);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    if (st.bubble && (st.bubble.t -= dt) <= 0) st.bubble = null;
    // the camera leads the tram, easing back to keep a runner behind the front on screen (a lever post as the tram passes)
    const rn = st.rn, camT = Math.max(st.tram.x - (W - 90), Math.min(st.tram.x - S.frontX, rn.on === 'car' ? 1e9 : rn.x - 60));
    st.cam = K.lerp(st.cam, camT, Math.min(1, dt * 6));
    K.tickFx(st, dt);
    mirror(st);
  }
  const bhCar = st => clamp(Math.floor(st.bh.off / (S.carL + S.carGap)), 0, 2);
  function brake(st, dt) {
    const p = G.players[st.brk], i = p.input, T = st.tram, bh = st.bh;
    // walk along the cars
    const want = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    bh.off = clamp(bh.off - want * S.walkV * dt, 14, TRAM_L - 14);
    if (want) bh.face = want;
    // the switch for the next fork that hasn't locked
    const upE = (i.up || i.jump) && !st.prevUp[st.brk], dnE = i.down && !st.prevDown[st.brk];
    st.prevUp[st.brk] = i.up || i.jump; st.prevDown[st.brk] = i.down;
    const f = nextFork(st);
    if (f && (upE || dnE)) { const to = upE ? 'up' : 'low'; if (f.sw !== to) { f.sw = to; Sfx.play('tramrunSwitch'); K.pop(st, f.x0 - st.cam, S.base - 140, to === 'up' ? 'Switch: UP' : 'Switch: LOW', '#ffffff', 18); } }
    // the hand brake is on the front car; the action elsewhere is a reach for the runner
    const atFront = bhCar(st) === 0;
    if (T.cook > 0) { T.cook -= dt; if (T.cook <= 0) T.heat = 0.6; }
    T.braking = atFront && i.act && T.cook <= 0;
    if (T.braking) {
      T.heat += dt / (S.heatT * (st.gold ? 2 : 1));
      if (T.heat >= 1) { T.heat = 1; T.cook = S.cookT; T.braking = false; st.stats.cooked++; Sfx.play('tramrunHiss'); K.pop(st, T.x - 40 - st.cam, carDeck(st, 0) - 90, 'Brake\'s cooked!', '#ffb0a0', 20); }
    } else if (T.cook <= 0) T.heat = Math.max(0, T.heat - dt / S.coolT);
    if (T.braking && Math.random() < 0.3) K.part(st, T.x - 30, carDeck(st, 0) + 24, -30 - Math.random() * 40, -30, 0.5, '#ffd08a', 2.5, 300, 'star');
    // a catch
    if (p.pendingAct && !atFront || p.pendingAct && st.rn.on === 'air') tryCatch(st);
  }
  function tryCatch(st) {
    const r = st.rn, j = bhCar(st), c = carSpan(st, j), deck = carDeck(st, j);
    if (r.on !== 'air' || r.vy < -60) return;
    const short = c.x0 - r.x;
    if (short > -4 && short <= S.catchD && Math.abs(r.y - deck) < 70) {
      boardCar(st, j, 8); st.stats.catches++;
      Sfx.play('tramrunCatch'); K.pop(st, r.x - st.cam, deck - 70, 'Gotcha!', C.gold, 22);
    }
  }
  function nextFork(st) { return st.forks.find(f => !f.locked && f.x0 > st.tram.x - 4) || null; }
  function tram(st, dt) {
    const T = st.tram;
    if (T.hitT > 0) T.hitT -= dt;
    let top = st.set.v;
    // the uphill crawl to the studio gates at the very end
    const fin = st.jobs.find(j => j.k === 'final');
    if (fin && T.x > fin.x - 320) top = Math.min(top, 46);
    if (fin && st.final.done) top = 0;
    if (T.back > 0) { T.back -= dt; T.v = -90; }
    else if (T.braking) T.v = approach(T.v, Math.min(top, S.vBrake), S.brakeAcc * dt);
    else T.v = approach(T.v, top, (T.v > top ? 300 : S.rollAcc) * dt);
    T.x += T.v * dt;
    for (const f of st.forks) if (!f.locked && T.x >= f.x0 - S.lockD) { f.locked = true; f.route = f.sw; Sfx.play('tramrunClunk'); }
  }
  function boardCar(st, j, off) {
    const r = st.rn, c = carSpan(st, j);
    r.on = 'car'; r.car = j; r.off = clamp(c.x1 - r.x, 6, S.carL - 6); if (off !== undefined) r.off = clamp(r.off, off, S.carL - 6);
    r.vy = 0; r.vx = 0; r.grounded = true;
  }
  function runner(st, dt) {
    const r = st.rn, p = G.players[st.run], i = p.input, T = st.tram;
    if (r.daze > 0) r.daze -= dt;
    if (r.drop > 0) r.drop -= dt;
    if (r.crankT > 0) r.crankT -= dt;
    const busy = r.daze > 0;
    const want = busy ? 0 : (i.right ? 1 : 0) - (i.left ? 1 : 0);
    if (want) r.face = want;
    const g = zog(st) ? S.grav / S.zogJump : S.grav;
    if (r.on === 'car') {
      // aboard: walk along this car; walk off the front of the front car (or jump with ▶) to get off
      r.off -= want * S.walkV * dt;
      const c = carSpan(st, r.car);
      r.x = c.x1 - r.off; r.y = carDeck(st, r.car, r.x);
      if (r.off < 0) {
        if (r.car === 0) leave(st, want > 0 ? 160 : 60);
        else { r.car--; r.off += S.carL + S.carGap; }
      } else if (r.off > S.carL) {
        if (r.car < 2) { r.car++; r.off -= S.carL + S.carGap; } else r.off = S.carL;
      }
      if (r.on === 'car' && p.pendingJump && !busy) {
        if (want > 0 && r.car === 0) leave(st, 220);
        else { r.on = 'air'; r.vy = -S.jumpV * 0.7; r.vx = T.v + want * S.runV * 0.5; r.lastJump = G.time; }
      }
      return;
    }
    // on foot or in the air
    const mud = st.jobs.some(j => j.k === 'mud' && r.on === 'ground' && r.line === 'low' && r.x > j.x && r.x < j.x + j.len);
    const vMax = S.runV * (mud ? 0.5 : 1);
    if (r.on !== 'air') r.vx = approach(r.vx, want * vMax, 1600 * dt);
    else r.vx = approach(r.vx, want * vMax, 700 * dt);
    if (r.on !== 'air' && p.pendingJump && !busy) {
      if (i.down && r.on === 'tres') { r.on = 'air'; r.drop = 0.25; r.vy = 40; }
      else { r.on = 'air'; r.vy = -S.jumpV; r.lastJump = G.time; Sfx.play('tramrunJump'); }
    }
    // ▲ at the foot of a ramp walks up onto the trestle
    if (r.on === 'ground' && i.up && !busy) { const f = forkAt(st, r.x + 1); if (f && r.x - f.x0 < 40) { r.on = 'tres'; r.line = 'up'; } }
    r.x += r.vx * dt;
    // the camera holds the runner on screen (the crew wave you back)
    r.x = clamp(r.x, st.cam + 16, st.cam + W - 24);
    if (r.on === 'ground') { r.y = S.base; r.line = 'low'; }
    else if (r.on === 'tres') {
      const f = forkAt(st, r.x);
      if (!f) { r.on = 'ground'; r.y = S.base; r.line = 'low'; }
      else r.y = lineY(st, r.x, 'up');
    } else {
      r.vy += g * dt; r.y += r.vy * dt;
      if (r.vy > 0) {
        // land on a car deck, the trestle, or the ground
        for (let j = 0; j < 3; j++) {
          const c = carSpan(st, j), d = carDeck(st, j, clamp(r.x, c.x0, c.x1));
          if (r.x > c.x0 - 2 && r.x < c.x1 - 4 && r.y >= d && r.y - r.vy * dt <= d + 6) { boardCar(st, j); Sfx.play('tramrunLand'); st.stats.boards++; return; }
        }
        const f = forkAt(st, r.x);
        if (f && r.drop <= 0) { const ty = lineY(st, r.x, 'up'); if (ty < S.base - 4 && r.y >= ty && r.y - r.vy * dt <= ty + 6) { r.on = 'tres'; r.line = 'up'; r.y = ty; r.vy = 0; return; } }
        if (r.y >= S.base) { r.y = S.base; r.vy = 0; r.on = 'ground'; r.line = 'low'; }
      }
    }
    // tickets
    for (const tk of st.tix) {
      if (tk.got) continue;
      const ty = lineY(st, tk.x, tk.line) - tk.h;
      if (Math.abs(r.x - tk.x) < 20 && Math.abs(r.y - 14 - ty) < 26) { tk.got = true; st.tickets++; st.tixTake++; st.stats.tickets = st.tickets; Sfx.play('studioPop', 1 + (st.tickets % 5) * 0.08); K.pop(st, tk.x - st.cam, ty - 30, 'Ticket ' + st.tickets + '!', C.gold, 18); }
    }
    // scooped by the cowcatcher: the tram caught a runner on its own line
    // (not a runner at a post beside the line: a lever, the big red lever or a plug box)
    const post = workAt(st), beside = post && (post.k === 'lever' || post.k === 'final' || post.k === 'plug');
    if (!beside && r.on !== 'air' && r.line === tramLine(st, r.x) && r.x <= T.x + 6 && r.x >= T.x - 40 && r.vx < T.v + 20) {
      const undone = st.jobs.filter(j => !j.done && j.prog > 0 && j.k !== 'lever' && j.k !== 'final');
      for (const j of undone) { j.prog = 0; if (j.k === 'crank') j.taps = 0; }
      boardCar(st, 0, 10); st.stats.scoops++;
      Sfx.play('studioHonk'); K.pop(st, T.x - st.cam, carDeck(st, 0) - 70, undone.length ? 'HONK! Scooped up... job undone!' : 'HONK! Scooped up!', undone.length ? '#ffb0a0' : '#ffffff', 18);
    }
  }
  function leave(st, push) {
    const r = st.rn, T = st.tram;
    r.on = 'air'; r.vy = -S.jumpV * 0.55; r.vx = T.v + push; r.lastJump = G.time; st.stats.offs++;
    Sfx.play('tramrunJump');
  }
  // what the runner is standing at (the job they can work right now)
  function workAt(st) {
    const r = st.rn;
    if (r.on === 'car' || r.on === 'air' || r.daze > 0) return null;
    for (const j of st.jobs) {
      if (j.done || j.line !== r.line) continue;
      const w = workSpot(j);
      if (w !== null && Math.abs(r.x - w) < (j.k === 'push' ? 22 : 26)) return j;
    }
    return null;
  }
  // where the runner stands to do a job (null = not a job)
  const workSpot = j => (j.k === 'push' ? j.x - 30 : j.k === 'crank' ? j.x - 46 : j.k === 'plug' ? j.x + 70 : j.k === 'lever' ? j.x - 56 : j.k === 'final' ? j.x - 60 : null);
  function jobs(st, dt) {
    const r = st.rn, p = G.players[st.run], i = p.input, T = st.tram;
    const at = workAt(st);
    st.working = null;
    if (at) {
      if (at.k === 'push' && i.right) { at.prog += dt; st.working = at; if (Math.random() < 0.15) K.dust(st, at.x, S.base, null, 1); }
      else if (at.k === 'crank' && p.pendingAct && r.crankT <= 0) { at.taps++; at.prog = at.taps; r.crankT = S.crankGap; st.working = at; Sfx.play('tramrunCrank', 1 + at.taps * 0.04); }
      else if (at.k === 'plug' && p.pendingAct) { at.done = true; st.stats.props++; Sfx.play('tramrunUnplug'); K.spark(st, workSpot(at), S.base - 20, 10, ['#ff5aff', '#ffffff']); K.pop(st, at.x - st.cam, S.base - 90, 'Unplugged!', '#d9ffd0', 20); }
      else if ((at.k === 'lever' || at.k === 'final') && i.act) st.working = at;
      if ((at.k === 'push' && at.prog >= at.need) || (at.k === 'crank' && at.taps >= at.need)) {
        at.done = true; at.flyT = 0; st.stats.props++;
        Sfx.play(at.k === 'push' ? 'studioFoam' : 'tramrunGate'); K.pop(st, at.x - st.cam, S.base - 90, at.k === 'push' ? 'Off the rails!' : 'Open!', '#d9ffd0', 20);
      }
    }
    for (const j of st.jobs) {
      if (j.flyT !== undefined) j.flyT += dt;
      if (j.done && j.k !== 'lever') continue;
      if (j.k === 'tail') { tailStep(st, j, dt); continue; }
      if (j.k === 'snake' || j.k === 'mud') continue;
      if (j.k === 'final') { finalStep(st, j, dt); continue; }
      // lever pairs: safe while held; the job is done once the last car is past the zone
      if (j.k === 'lever') {
        j.held = st.working === j;
        if (j.done) continue;
        if (tramLine(st, j.x) !== j.line && T.x > j.x) { if (forkAt(st, j.x) && forkAt(st, j.x).locked) { j.done = true; j.skip = true; } continue; }
        const inZone = T.x > j.x && T.x - TRAM_L < j.x + j.zone;
        if (inZone && !j.held && !j.crashed) { j.crashed = true; crash(st, j, false); }
        if (T.x - TRAM_L > j.x + j.zone) { j.done = true; if (!j.crashed) { st.stats.props++; K.pop(st, j.x - st.cam, S.base - 100, j.what === 'boulder' ? 'Held it!' : 'Safe across!', '#d9ffd0', 20); } }
        continue;
      }
      // the tram reaches the job
      if (T.x >= j.x - 8) {
        if (tramLine(st, j.x) !== j.line) { if (T.x > j.x + 40) j.done = true; continue; }
        j.done = true; j.crashed = true; j.flyT = 0;
        crash(st, j, j.k === 'real');
      }
    }
  }
  function tailStep(st, j, dt) {
    const T = st.tram, ph = (st.clock + j.ph) % j.period;
    j.sweeping = ph < j.sweep; j.warn = ph > j.period - 1.2;
    if (j.sweeping) {
      // it sweeps in front of the cars: only the front car can run into it
      const inZone = T.x > j.x - 46 && T.x - S.carL < j.x + 46;
      if (inZone && !j.hitNow) { j.hitNow = true; crash(st, j, false); }
      const r = st.rn;
      if (r.on !== 'car' && r.on !== 'air' && Math.abs(r.x - j.x) < 46 && r.daze <= 0) { r.daze = 1; r.vx = -200; Sfx.play('studioFoam'); K.pop(st, r.x - st.cam, r.y - 70, 'Whump! Foam tail!', '#ffffff', 16); }
    } else j.hitNow = false;
    if (T.x - TRAM_L > j.x + 60) j.done = true;
  }
  function finalStep(st, j, dt) {
    const T = st.tram, F = st.final;
    if (F.done) return;
    const tramHand = bhCar(st) === 0 && G.players[st.brk].input.act;
    const groundHand = st.working === j;
    F.ground = groundHand; F.tram = tramHand;
    if (tramHand && groundHand && T.x > j.x - 300) {
      F.prog += dt / S.finalT;
      if (Math.random() < 0.3) K.spark(st, j.x - 60, S.base - 40, 2, ['#ff5a4a', '#ffffff']);
      if (F.prog >= 1) {
        F.done = true; st.state = 'end'; st.endT = 0; st.lastRoom = true; st.stats.roomT[st.k] = G.time - st.segStart;
        Sfx.play('tramrunStop'); Sfx.play('studioCheer'); K.confetti(st, T.x - st.cam, S.base - 80, 60);
        K.pop(st, W / 2, 150, 'STOPPED! A foot short of the gates!', C.gold, 28);
      }
    } else F.prog = Math.max(0, F.prog - dt * 0.5);
    // into the gates: a crash, and the tram rolls back down the slope
    if (T.x >= j.x + 120 && !F.done) {
      crash(st, j, false); st.tram.back = 1.4;
      K.msg(st, 'Both hold the big red lever together! Runner on the ground handle, brake hero on the front car.', '#ffe7a8', 3.4);
    }
  }
  function crash(st, j, real) {
    const T = st.tram;
    if (T.hitT > 0 && !real) return;
    T.hitT = 0.6; st.rc.bad++; st.stats.crashes++;
    st.meter = Math.max(0, st.meter - (real ? S.realCost : S.crashCost)); st.lastHit = G.time;
    G.shake = Math.max(G.shake || 0, real ? 0.5 : 0.3);
    const x = T.x - st.cam;
    K.pop(st, x + 20, carDeck(st, 0) - 100, real ? 'CLANG! That was REAL!' : ['CRUNCH!', 'Cutouts everywhere!', 'WHUMP!'][st.stats.crashes % 3], '#ffb0a0', 24);
    K.foamBurst(st, x + 10, carDeck(st, 0) - 20, 10); K.scraps(st, x - 60, carDeck(st, 0) - 40, 8, '#f2e6c8');
    Sfx.play('studioCrash'); Sfx.play('studioGroan');
    if (st.rc.bad === 1) K.msg(st, real ? 'REAL things don\'t move: throw the switch to the other line!' : 'Crash! Clear the props before the tram gets there: the brake buys time.', '#ffd0c8', 3.4);
    if (st.rc.bad >= 3 && !st.goldUsed && K.both(st)) { st.goldUsed = true; st.gold = true; K.goldHelp(st, 'Gold brake shoes! The brake heats half as fast for the rest of this take'); }
  }
  function endTake(st) {
    st.state = 'end'; st.endT = 0; st.lastRoom = false; st.stats.roomT[st.k] = G.time - st.segStart;
    Sfx.play('tramrunBell'); Sfx.play('studioCheer');
    K.pop(st, W / 2, 160, st.title + ': that\'s a wrap! Swap jobs!', '#ffffff', 24);
  }
  function endStep(st, dt) {
    st.endT += dt;
    if (!st.lastRoom) { st.tram.x += st.tram.v * dt; const r = st.rn; if (r.on === 'car') { const c = carSpan(st, r.car); r.x = c.x1 - r.off; r.y = carDeck(st, r.car, r.x); } else r.x += st.tram.v * dt; }
    if (st.lastRoom) {
      if (st.endT > 0.8 && !st.party) { st.party = true; Sfx.play('tramrunFanfare'); K.confetti(st, W / 2, 140, 50); }
      if (st.endT > 3.4 && !st.cleared) { st.cleared = true; G.level.goal = { x: W / 2, y: 300 }; levelClear(); }
    } else if (st.endT > 2.2) nextRoom();
  }
  function bhPos(st) { const x = st.tram.x - st.bh.off, j = bhCar(st); return { x, y: carDeck(st, j, x) }; }
  function mirror(st) {
    const b = bhPos(st), r = st.rn;
    K.place(st.brk, b.x - st.cam, b.y);
    K.place(st.run, r.x - st.cam, r.y);
    st.run2 = null;
    st.runPos = [0, 1].map(id => (id === st.brk ? { x: b.x, y: b.y } : { x: r.x, y: r.y, grounded: r.on !== 'air' }));
  }

  /* ---------- what to do next ----------
     plan(st): { brk: { hold, car (0..2 where to stand), sw ('up'|'low'|null for the next fork), catch, why },
                 run: { x, line, act ('hold'|'tap'|null), right, jump, up, down, why }, jobs: [...] }
     The jobs that matter are the ones on the line the tram will take (a locked fork's route; otherwise the runner's
     call, the switch, or for a fork not yet called the clear line). */
  function predictLine(st, f) {
    if (f.locked) return f.route;
    if (st.call[f.i]) return st.call[f.i];
    return clearLine(st, f) || f.sw;
  }
  // the line at a fork with no REAL thing (and no unheld boulder) on it
  function clearLine(st, f) {
    const realOn = l => st.jobs.some(j => (j.k === 'real') && j.line === l && j.x > f.x0 && j.x < f.x1);
    if (realOn('up') && !realOn('low')) return 'low';
    if (realOn('low') && !realOn('up')) return 'up';
    if (st.jobs.some(j => j.k === 'lever' && j.line === 'up' && j.x > f.x0 && j.x < f.x1)) return 'low';
    return null;
  }
  function relevant(st, j) {
    if (j.done) return false;
    const f = forkAt(st, j.x);
    const line = f ? predictLine(st, f) : 'low';
    return j.line === line;
  }
  // would the tail hit the tram if the brake were held b s from now and then let go? (a small forward sim)
  function tailHit(st, tail, b) {
    const T = st.tram, top = st.set.v, h = 0.04;
    let x = T.x, v = T.v, t = 0;
    while (t < 14 && x - S.carL < tail.x + 50) {
      v = t < b ? approach(v, Math.min(top, S.vBrake), S.brakeAcc * h) : approach(v, top, (v > top ? 300 : S.rollAcc) * h);
      x += v * h; t += h;
      const ph = (st.clock + t + tail.ph) % tail.period;
      if (ph < tail.sweep + 0.06 && x > tail.x - 50 && x - S.carL < tail.x + 50) return true;
    }
    return false;
  }
  function plan(st) {
    const key = G.tickN + ':' + st.k;
    if (st.planMemo && st.planMemo.key === key) return st.planMemo.p;
    const p = planNow(st);
    st.planMemo = { key, p };
    return p;
  }
  function planNow(st) {
    const T = st.tram, r = st.rn, out = { brk: { hold: false, car: 0, sw: null, catch: false, why: 'roll' }, run: { x: null, line: 'low', act: null, why: 'ride' }, jobs: [] };
    if (st.state !== 'go') return out;
    const vRoll = st.set.v;
    // the jobs ahead that need doing, in order
    const todo = st.jobs.filter(j => (j.k === 'push' || j.k === 'crank' || j.k === 'plug' || j.k === 'lever' || j.k === 'final') && relevant(st, j) && j.x > T.x - (j.k === 'lever' ? TRAM_L + j.zone : 0)).sort((a, b) => a.x - b.x);
    out.jobs = todo;
    const J = todo[0];
    const runT = j => {
      // seconds until the runner has this job done (or is in place for a lever)
      const spot = workSpot(j), d = Math.abs(spot - r.x), run = (r.on === 'car' ? 0.25 : 0) + d / S.runV;
      const work = j.k === 'push' ? Math.max(0, j.need - j.prog) : j.k === 'crank' ? Math.max(0, j.need - j.taps) * (S.crankGap + 0.03) : j.k === 'plug' ? 0.1 : 0;
      return run + work;
    };
    // ---- the brake: when the runner needs more time than the tram gives
    if (J) {
      const ta = (J.x - T.x) / Math.max(40, T.v), need = runT(J), lever = J.k === 'lever' || J.k === 'final';
      const second = todo[1] && (todo[1].x - T.x) / vRoll < 6;
      const cap = second ? 0.55 : 0.8;
      const want = lever ? (r.on === 'car' || Math.abs(workSpot(J) - r.x) > 30 ? need > ta - 0.6 : false) : need > ta - 0.8;
      const stop = lever ? false : need < ta - 1.6;
      const was = !!st.braking;
      let hold = T.cook <= 0 && T.heat < cap && (want || was && !stop);
      if (J.k === 'final' && T.x > J.x - 300) hold = true;
      st.braking = hold;
      out.brk.hold = hold; out.brk.why = hold ? 'time for ' + J.k : 'roll';
    } else st.braking = false;
    // a monster tail: brake so the tram doesn't arrive during a sweep
    const tail = st.jobs.find(j => j.k === 'tail' && !j.done && j.x + 46 > T.x - TRAM_L && j.x - 46 - T.x < 500);
    if (tail && T.cook <= 0) {
      // the shortest pull that gets the whole tram past between sweeps (none needed: let it roll)
      const bMax = Math.max(0, (1 - T.heat) * S.heatT * (st.gold ? 2 : 1) - 0.3);
      if (tailHit(st, tail, 0)) {
        let b = 0.1;
        while (b <= bMax && tailHit(st, tail, b)) b += 0.1;
        if (b <= bMax) st.tailUntil = st.clock + b;
        else if (!J || J.k !== 'final') { out.brk.hold = false; st.braking = false; }
      } else if (out.brk.why !== 'roll' && J && J.x > tail.x && !(st.clock < st.tailUntil)) { out.brk.hold = false; st.braking = false; out.brk.why = 'roll'; }
      // a pull, once chosen, is held for its length (no flapping on the edge of a sweep)
      if (st.clock < st.tailUntil && T.heat < 0.95) { out.brk.hold = true; out.brk.why = 'tail'; st.braking = true; }
    }
    // the switch: the runner's call, else the line the brake hero can see is clear
    const f = nextFork(st);
    if (f) {
      const seen = T.x > f.x0 - S.seeT || Math.abs(r.x - (f.x0 + f.x1) / 2) < S.runSee + 300;
      const want = st.call[f.i] || (seen ? clearLine(st, f) : null);
      if (want && want !== f.sw) out.brk.sw = want;
    }
    // where to stand: the front (brake), or the car the runner is jumping for
    out.brk.car = 0;
    if (r.on === 'air' && r.vy > -100) {
      for (let j = 0; j < 3; j++) { const c = carSpan(st, j); if (r.x > c.x0 - S.catchD - 30 && r.x < c.x1) { out.brk.car = j; break; } }
      const j = out.brk.car, c = carSpan(st, j), short = c.x0 - r.x;
      if (bhCar(st) === j && short > -4 && short <= S.catchD && r.vy > -60 && Math.abs(r.y - carDeck(st, j)) < 70) out.brk.catch = true;
    } else if (J && J.k === 'lever' && r.on !== 'car') out.brk.car = (out.brk.hold || T.x < J.x) ? 0 : 2;
    if (J && J.k === 'final') out.brk.car = 0;
    // ---- the runner
    const R = out.run;
    // the next fork to call (the runner sees the upper line first)
    const callF = st.forks.find(ff => !ff.locked && !st.call[ff.i] && ff.x0 > T.x && clearLine(st, ff));
    const lead = J ? (J.x - T.x) / Math.max(40, T.v) - runT(J) : 9;
    if (J) {
      const spot = workSpot(J);
      R.x = spot; R.line = J.line; R.why = J.k;
      if (callF && callF.x0 - 100 < spot && T.x > callF.x0 - 900) { R.x = callF.x0 - 100; R.line = 'low'; R.why = 'call'; R.call = clearLine(st, callF); }
      const at = workAt(st);
      if (at === J) {
        R.act = J.k === 'push' ? null : J.k === 'crank' ? 'tap' : J.k === 'plug' ? 'tap' : 'hold';
        if (J.k === 'push') R.push = true;
        if (J.k === 'lever' && T.x - TRAM_L > J.x + J.zone) R.act = null;
      }
    } else if (callF && T.x > callF.x0 - 900) { R.x = callF.x0 - 100; R.line = 'low'; R.why = 'call'; R.call = clearLine(st, callF); }
    // tickets on the way, when the lead allows
    {
      const tk = st.tix.filter(t => !t.got && t.x > T.x + 40 && t.x < st.cam + W - 30).sort((a, b) => a.x - b.x)[0];
      // (a job more than a screen ahead of the tram can't be reached early anyway: the camera holds the runner back)
      const far = J && workSpot(J) - T.x > 520;
      if (tk && (lead > 1.6 || !J || far) && (!J || tk.x < workSpot(J) + 10 || r.on !== 'car')) {
        const line = tk.line === 'up' ? (forkAt(st, tk.x) && predictLine(st, forkAt(st, tk.x)) === 'up' || r.line === 'up' || lead > 2.5 || !J || far ? 'up' : null) : 'low';
        if (line && (!J || far || Math.abs(tk.x - r.x) / S.runV < lead) && (R.why !== 'call' || tk.x < R.x - 20)) { R.tx = tk.x; R.tline = tk.line; R.th = tk.h; if (!J || tk.x < (R.x || 1e9)) { R.x = tk.x; R.line = tk.line; R.why = 'ticket'; R.jumpFor = tk.h > 50; } }
      }
    }
    // the monster's tail: wait outside its sweep rather than run through it
    if (r.on !== 'car') {
      const tl = st.jobs.find(j => j.k === 'tail' && !j.done && r.x < j.x - 40 && (R.x === null ? T.x + 300 : R.x) > j.x - 60);
      if (tl) {
        const ph = (st.clock + tl.ph) % tl.period, safe = ph >= tl.sweep && tl.period - ph > 0.75;
        if (!safe && r.x > tl.x - 140) { if (T.x > tl.x - 400) { R.x = null; R.why = 'board'; } else { R.x = tl.x - 80; R.line = 'low'; R.why = 'tail'; } R.act = null; R.push = false; }
      }
    }
    // nothing to do: get back aboard (stand on the tram's line ahead and hop as the front car arrives)
    if (R.x === null) { R.why = r.on === 'car' ? 'ride' : 'board'; }
    return out;
  }

  /* ---------- drawing ---------- */
  function setBack(st, t) {
    const look = st.set.look, cx = st.cam;
    if (look === 'zog') K.backlot(cx, t, { night: true, base: 300 });
    else if (look === 'monster') K.backlot(cx, t, { dusk: true, base: 300 });
    else K.backlot(cx, t, { base: 300 });
    // the set's painted flats along the back, on wooden struts (the backs of the ones scrolling off show bare wood)
    const step = 260, off = cx * 0.55, i0 = Math.floor(off / step) - 1;
    for (let i = i0; i < i0 + W / step + 3; i++) {
      const x = i * step - off, h = 150 + K.hash(i) * 50, y = 330;
      ctx.save(); ctx.translate(x, y);
      if (look === 'west') {
        ctx.fillStyle = ['#c8844a', '#a8643a', '#d8a46a'][((i % 3) + 3) % 3]; ctx.fillRect(0, -h, 200, h);
        ctx.fillRect(30, -h - 24, 140, 24);
        ctx.fillStyle = '#5a3418'; ctx.fillRect(70, -70, 60, 70);
        ctx.fillStyle = '#2a1a0a'; for (const wx of [20, 150]) ctx.fillRect(wx, -h + 30, 30, 40);
        text(['SALOON', 'BANK', 'HOTEL', 'JAIL'][((i % 4) + 4) % 4], 100, -h - 10, 16, '#fff2c8', 'center', 'display');
      } else if (look === 'zog') {
        ctx.fillStyle = '#3a2a6a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(40, -h * 0.6); ctx.lineTo(100, -h * 0.4); ctx.lineTo(160, -h * 0.8); ctx.lineTo(220, 0); ctx.fill();
        ctx.fillStyle = '#8a5aff'; circle(150, -h - 30, 30); ctx.fill(); ctx.strokeStyle = '#ffb0ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(150, -h - 30, 50, 10, -0.3, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#5affc8'; for (let k = 0; k < 4; k++) { circle(20 + k * 50, -20 - k * 8, 4); ctx.fill(); }
      } else if (look === 'jungle') {
        ctx.fillStyle = '#2a6a3a'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(k * 60 + 20, -h + 30, 50, 34, 0, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#8a7a5a'; ctx.fillRect(60, -h * 0.75, 120, h * 0.75); ctx.fillStyle = '#6a5a3a'; for (let k = 0; k < 4; k++) ctx.fillRect(56 + k * 8, -h * 0.75 - 8 - k * 8, 128 - k * 16, 8);
        ctx.fillStyle = '#2a1a0a'; ctx.fillRect(105, -50, 30, 50);
      } else {
        ctx.fillStyle = '#4a3a5a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(60, -h * 1.2, 120, -h * 0.6); ctx.quadraticCurveTo(170, -h * 0.9, 230, 0); ctx.fill();
        ctx.fillStyle = '#2a8a5a'; for (let k = 0; k < 3; k++) { ctx.fillRect(30 + k * 70, -60, 8, 60); ctx.beginPath(); ctx.ellipse(34 + k * 70, -64, 26, 10, 0, 0, TAU); ctx.fill(); }
      }
      ctx.restore();
    }
    // the monster itself, huge and animatronic, behind the set on Monster Island
    if (look === 'monster') {
      const mx = ((1400 - cx * 0.2) % 2400 + 2400) % 2400 - 400;
      ctx.fillStyle = '#3a6a4a'; ctx.beginPath(); ctx.ellipse(mx, 220, 120, 90, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(mx + 90, 120, 60, 44, -0.3, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd23a'; circle(mx + 110, 108, 9); ctx.fill(); ctx.fillStyle = '#1a1a1a'; ctx.fillRect(mx + 108, 100, 4, 16);
      ctx.fillStyle = '#ffffff'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(mx + 100 + k * 9, 140); ctx.lineTo(mx + 104 + k * 9, 152); ctx.lineTo(mx + 108 + k * 9, 140); ctx.fill(); }
      ctx.strokeStyle = '#5a5e68'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(mx - 60 + k * 50, 0); ctx.lineTo(mx - 60 + k * 50, 150); ctx.stroke(); }
    }
  }
  function draw(st) {
    const t = st.clock, cx = st.cam;
    setBack(st, t);
    // the ground and the main line
    ctx.fillStyle = st.set.look === 'zog' ? '#4a3a6a' : st.set.look === 'jungle' ? '#5a6a3a' : st.set.look === 'monster' ? '#4a4a3a' : '#c8a06a';
    ctx.fillRect(0, S.base - 4, W, H - S.base + 4);
    ctx.save(); ctx.translate(-cx, 0);
    drawRails(st, cx, cx + W, 'low');
    for (const j of st.jobs) if (j.k === 'mud') { ctx.fillStyle = '#4a3420'; rr(j.x, S.base - 6, j.len, 14, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.15)'; for (let k = 0; k < 6; k++) { circle(j.x + 20 + k * 30, S.base - 1, 3); ctx.fill(); } K.realTag(j.x + j.len / 2, S.base + 22, 70, 1); }
    // forks: the trestle, the sign and the switch arrow
    for (const f of st.forks) {
      if (f.x1 < cx - 40 || f.x0 > cx + W + 40) continue;
      drawTrestle(st, f, t);
    }
    // jobs and things on the lines
    for (const j of st.jobs) drawJob(st, j, t);
    // tickets
    for (const tk of st.tix) if (!tk.got && tk.x > cx - 30 && tk.x < cx + W + 30) K.ticket(tk.x, lineY(st, tk.x, tk.line) - tk.h - 10, 0.8, t);
    drawTram(st, t);
    drawRunner(st, t);
    // the painted curtain over the upper line, until the tram (or the runner) is close
    for (const f of st.forks) {
      const x0 = Math.max(f.x0 + 40, st.tram.x + S.seeT), x1 = f.x1 - 40;
      if (x1 <= x0 || f.x0 > cx + W + 40) continue;
      const r = st.rn, hole = Math.abs(r.x - clamp(r.x, x0, x1)) < S.runSee * 0.5 ? r.x : null;
      ctx.save();
      ctx.beginPath(); ctx.rect(x0, S.base - S.tresH - 120, x1 - x0, 116);
      if (hole !== null) { ctx.moveTo(hole + 160, S.base - S.tresH - 60); ctx.arc(hole, S.base - S.tresH - 60, 160, 0, TAU, true); }
      ctx.clip('evenodd');
      ctx.fillStyle = '#6a2a3a'; ctx.fillRect(x0, S.base - S.tresH - 120, x1 - x0, 116);
      ctx.fillStyle = '#8a3a4a'; for (let x = x0; x < x1; x += 18) ctx.fillRect(x, S.base - S.tresH - 120, 8, 116);
      ctx.restore();
      if (x1 - x0 > 80) text('?', (x0 + x1) / 2, S.base - S.tresH - 60, 28, '#ffd0d8', 'center', 'display');
    }
    K.drawParts(st, cx);
    ctx.restore();
  }
  function drawRails(st, x0, x1, line, f) {
    const a = Math.max(x0, f ? f.x0 : x0), b = Math.min(x1, f ? f.x1 : x1);
    // sleepers and two rails
    ctx.fillStyle = '#6a4a2a';
    for (let x = Math.floor(a / 26) * 26; x < b; x += 26) { const y = lineY(st, x, line); ctx.fillRect(x, y - 2, 14, 7); }
    ctx.strokeStyle = '#9aa2ae'; ctx.lineWidth = 3;
    ctx.beginPath(); for (let x = a; x <= b; x += 10) { const y = lineY(st, x, line) - 3; if (x === a) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
  }
  function drawTrestle(st, f, t) {
    // wooden legs under the upper line, then its rails
    ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 5;
    for (let x = f.x0 + 30; x < f.x1 - 20; x += 50) { const y = lineY(st, x, 'up'); if (y < S.base - 8) { ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x - 10, S.base); ctx.moveTo(x, y + 4); ctx.lineTo(x + 10, S.base); ctx.stroke(); } }
    ctx.fillStyle = '#8a6a40'; ctx.beginPath(); for (let x = f.x0; x <= f.x1; x += 10) ctx.lineTo(x, lineY(st, x, 'up') + 6); for (let x = f.x1; x >= f.x0; x -= 10) ctx.lineTo(x, lineY(st, x, 'up') - 2); ctx.closePath(); ctx.fill();
    drawRails(st, st.cam - 20, st.cam + W + 20, 'up', f);
    // the fork sign (where the runner calls the line) and the switch arrow over the fork
    const sx = f.x0 - 100;
    ctx.fillStyle = '#5a3418'; ctx.fillRect(sx - 3, S.base - 64, 6, 64);
    ctx.fillStyle = '#f2e6c8'; rr(sx - 26, S.base - 84, 52, 24, 4); ctx.fill();
    text('FORK', sx, S.base - 72, 11, '#5a3418', 'center', 'body');
    const call = st.call[f.i], route = f.locked ? f.route : f.sw, flash = call && !f.locked && call !== f.sw && Math.sin(t * 14) > 0;
    ctx.save(); ctx.translate(f.x0 + 4, S.base - 40);
    ctx.fillStyle = flash ? C.gold : f.locked ? '#8a8a96' : '#ffffff'; ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 2;
    ctx.rotate(route === 'up' ? -0.6 : 0);
    ctx.beginPath(); ctx.moveTo(-14, -5); ctx.lineTo(6, -5); ctx.lineTo(6, -11); ctx.lineTo(18, 0); ctx.lineTo(6, 11); ctx.lineTo(6, 5); ctx.lineTo(-14, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    if (call) text(call === 'up' ? 'Go up!' : 'Stay low!', f.x0 + 6, S.base - 70, 12, flash ? C.gold : '#ffffff', 'center', 'body');
  }
  function ring(x, y, u, col) {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 5; circle(x, y, 12); ctx.stroke();
    ctx.strokeStyle = col || C.gold; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 12, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(u, 0, 1)); ctx.stroke();
  }
  function drawJob(st, j, t) {
    if (j.x < st.cam - 200 || j.x > st.cam + W + 200) return;
    const y = lineY(st, j.x, j.line);
    if (j.k === 'push') {
      const fly = j.flyT !== undefined ? j.flyT : -1;
      ctx.save(); ctx.translate(j.x + (fly > 0 ? fly * 120 : 0), y - (fly > 0 ? Math.sin(Math.min(1, fly) * Math.PI) * 60 - fly * fly * 20 : 0)); ctx.rotate(fly > 0 ? fly * 3 : K.wobble(j.i, t, 0.04) + (st.working === j ? 0.15 : 0));
      if (fly < 0 || fly < 1.5) {
        if (j.what === 'cactus') { ctx.fillStyle = '#5ab85a'; rr(-9, -54, 18, 54, 8); ctx.fill(); rr(-24, -40, 10, 22, 5); ctx.fill(); ctx.fillRect(-18, -24, 12, 7); rr(14, -46, 10, 22, 5); ctx.fill(); ctx.fillRect(6, -30, 12, 7); }
        else if (j.what === 'rocket') { ctx.fillStyle = '#e8e8f0'; rr(-10, -62, 20, 52, 6); ctx.fill(); ctx.fillStyle = '#e8322a'; ctx.beginPath(); ctx.moveTo(-10, -60); ctx.lineTo(0, -76); ctx.lineTo(10, -60); ctx.fill(); ctx.fillRect(-18, -24, 8, 18); ctx.fillRect(10, -24, 8, 18); }
        else if (j.what === 'idol') { ctx.fillStyle = '#d8a83a'; rr(-16, -50, 32, 50, 6); ctx.fill(); ctx.fillStyle = '#5a3a0a'; circle(-6, -36, 3); ctx.fill(); circle(6, -36, 3); ctx.fill(); ctx.fillRect(-8, -22, 16, 3); }
        else { ctx.fillStyle = '#f2ead2'; ctx.beginPath(); ctx.ellipse(0, -26, 18, 26, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#8ad08a'; for (let k = 0; k < 4; k++) { circle(-8 + k * 5, -30 + (k % 2) * 10, 3); ctx.fill(); } }
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.strokeRect(-20, -70, 40, 70); ctx.setLineDash([]);
        K.propTag(0, -10, 0.85);
      }
      ctx.restore();
      if (!j.done) ring(j.x, y - 90, j.prog / j.need);
    } else if (j.k === 'crank') {
      const open = j.done ? Math.min(1, (j.flyT || 0) * 3) : j.taps / j.need * 0.25;
      // the post with its crank handle
      const px = j.x - 46;
      ctx.fillStyle = '#5a3418'; ctx.fillRect(px - 4, y - 50, 8, 50); ctx.fillStyle = '#9aa2ae'; circle(px, y - 40, 7); ctx.fill();
      ctx.save(); ctx.translate(px, y - 40); ctx.rotate((j.taps || 0) * 0.8); ctx.strokeStyle = '#3a3e48'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(12, 0); ctx.stroke(); ctx.restore();
      if (j.what === 'saloon') {
        for (const d of [-1, 1]) { ctx.save(); ctx.translate(j.x + d * 22, y - 60); ctx.rotate(d * -open * 1.4); ctx.fillStyle = '#c8844a'; ctx.fillRect(d > 0 ? -22 : 0, 0, 22, 42); ctx.strokeStyle = '#5a3418'; ctx.lineWidth = 1.5; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo((d > 0 ? -22 : 0) + 3, 6 + k * 9); ctx.lineTo((d > 0 ? 0 : 22) - 3, 6 + k * 9); ctx.stroke(); } ctx.restore(); }
      } else if (j.what === 'bridge') {
        ctx.save(); ctx.translate(j.x - 30, y - 4); ctx.rotate(-(1 - open) * 1.2); ctx.fillStyle = '#a8804a'; ctx.fillRect(0, -4, 70, 8); ctx.strokeStyle = '#e8d8b0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(70, -30); ctx.stroke(); ctx.restore();
      } else {
        ctx.save(); ctx.translate(j.x, y); ctx.rotate(-open * 1.5);
        ctx.fillStyle = '#e8e8f0'; ctx.fillRect(0, -40, 60, 8); ctx.fillStyle = '#e8322a'; for (let k = 0; k < 3; k++) ctx.fillRect(6 + k * 20, -40, 8, 8);
        ctx.restore();
      }
      K.propTag(j.x, y - 76, 0.85);
      if (!j.done) { ring(px, y - 74, j.taps / j.need); text(String(j.need - j.taps), px, y - 74, 11, '#ffffff', 'center', 'body'); }
    } else if (j.k === 'plug') {
      // the cable across the line, and its plug box beside it
      const bx = j.x + 70;
      if (!j.done) { ctx.strokeStyle = j.what === 'laser' ? 'rgba(255,90,255,' + (0.6 + 0.4 * Math.sin(t * 20)) + ')' : 'rgba(255,90,90,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(j.x, y - 60); ctx.lineTo(j.x, y); ctx.stroke(); }
      K.cable(j.x, y - 2, bx - 10, y - 10, 6);
      ctx.fillStyle = '#3a3e48'; rr(bx - 12, y - 30, 24, 30, 4); ctx.fill();
      ctx.fillStyle = j.done ? '#5a5e68' : '#5aff8a'; circle(bx, y - 20, 4); ctx.fill();
      ctx.fillStyle = '#ffd23a'; ctx.fillRect(bx - 4, y - 10, 8, 6);
      if (!j.done) { text('UNPLUG', bx, y - 42, 9, '#ffffff', 'center', 'body'); }
      if (j.what === 'eyes') { ctx.fillStyle = j.done ? '#5a5e68' : '#ff3a3a'; circle(j.x - 10, y - 74, 6); ctx.fill(); circle(j.x + 10, y - 74, 6); ctx.fill(); }
    } else if (j.k === 'lever') {
      const lx = j.x - 56, held = j.held;
      ctx.fillStyle = '#3a3e48'; ctx.fillRect(lx - 8, y - 6, 16, 6);
      ctx.save(); ctx.translate(lx, y - 4); ctx.rotate(held ? 0.7 : -0.5); ctx.strokeStyle = '#8a92a0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -34); ctx.stroke(); ctx.fillStyle = '#e8322a'; circle(0, -36, 6); ctx.fill(); ctx.restore();
      if (j.what === 'trapdoor') {
        ctx.fillStyle = held || j.done ? '#6a4a2a' : '#1a1208'; ctx.fillRect(j.x, y - 2, j.zone, 8);
        ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2; ctx.strokeRect(j.x, y - 2, j.zone, 8);
        if (!held && !j.done) { ctx.fillStyle = '#1a1208'; ctx.save(); ctx.translate(j.x, y + 6); ctx.rotate(1.2 + Math.sin(t * 4) * 0.05); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(0, -4, j.zone / 2, 6); ctx.restore(); }
        K.propTag(j.x + j.zone / 2, y - 14, 0.8);
      } else {
        // the prop boulder up the slope, straining at its rope
        const bx = j.x + j.zone + 40, by = y - 40, roll = (!held && st.tram.x > j.x - 200 && !j.done) ? Math.sin(t * 6) * 4 : 0;
        ctx.fillStyle = '#9a8a6a'; circle(bx + roll, by, 34); ctx.fill(); ctx.strokeStyle = '#6a5a3a'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.setLineDash([3, 3]); circle(bx + roll, by, 30); ctx.stroke(); ctx.setLineDash([]);
        K.propTag(bx, by, 0.9);
        ctx.strokeStyle = '#e8d8b0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, y - 30); ctx.lineTo(bx - 30, by); ctx.stroke();
      }
      if (!j.done) text(held ? 'HOLDING' : 'HOLD', lx, y - 56, 10, held ? '#8fe3b0' : '#ffffff', 'center', 'body');
    } else if (j.k === 'real') {
      if (j.what === 'trough' || j.what === 'tower' || j.what === 'foot') {
        if (j.what === 'foot') {
          ctx.fillStyle = '#3a6a4a'; rr(j.x - 40, y - 150, 80, 150, 20); ctx.fill(); ctx.fillStyle = '#e8e8d8'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(j.x - 36 + k * 26, y); ctx.lineTo(j.x - 30 + k * 26, y + 8); ctx.lineTo(j.x - 22 + k * 26, y); ctx.fill(); }
          ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(j.x - 30, y - 140, 8, 120);
          ctx.fillStyle = '#9aa2ae'; for (let k = 0; k < 4; k++) { circle(j.x - 20 + k * 13, y - 70, 2.5); ctx.fill(); }
          K.realTag(j.x, y - 20, 70, 1);
        } else if (j.what === 'tower') { K.steel(j.x - 16, y - 120, 32, 120, {}); K.light(j.x, y - 118, 0.8, { on: true, dir: -1 }); K.realTag(j.x, y - 50, 44, 1); }
        else { K.steel(j.x - 34, y - 38, 68, 38, {}); ctx.fillStyle = '#6ab0e8'; ctx.fillRect(j.x - 28, y - 34, 56, 8); K.realTag(j.x, y - 16, 60, 1); }
      }
    } else if (j.k === 'snake') {
      ctx.strokeStyle = '#5ab83a'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath();
      for (let k = 0; k < 8; k++) { const xx = j.x - 30 + k * 8, yy = y - 4 + Math.sin(k * 1.2 + t * 3) * 4; if (k) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); } ctx.stroke(); ctx.lineCap = 'butt';
      ctx.fillStyle = '#ff3a3a'; ctx.fillRect(j.x + 28, y - 6, 6, 2);
      K.propTag(j.x, y - 20, 0.8); text('rubber!', j.x, y - 34, 9, '#ffffff', 'center', 'body');
    } else if (j.k === 'tail') {
      // the monster's tail swings in from the right across the line on its timer (a red warning before each sweep)
      const ph = (st.clock + j.ph) % j.period, u = ph < j.sweep ? Math.sin(ph / j.sweep * Math.PI) : 0;
      if (j.warn && !j.sweeping) { ctx.strokeStyle = 'rgba(255,60,60,' + (0.5 + 0.5 * Math.sin(t * 16)) + ')'; ctx.lineWidth = 3; ctx.strokeRect(j.x - 46, y - 80, 92, 80); text('TAIL!', j.x, y - 92, 14, '#ff8a7a', 'center', 'body'); }
      ctx.save(); ctx.translate(j.x + 160, y - 150); ctx.rotate(-1.2 + u * 1.1);
      ctx.strokeStyle = '#3a6a4a'; ctx.lineWidth = 34; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-60, 60, -170, 140); ctx.stroke();
      ctx.strokeStyle = '#4a8a5a'; ctx.lineWidth = 20; ctx.stroke(); ctx.lineCap = 'butt';
      ctx.restore();
      K.propTag(j.x + 120, y - 160, 0.9);
    } else if (j.k === 'final') {
      // the studio gates and the big red emergency lever (a ground handle and a cable to the tram's handle)
      const gx = j.x + 140;
      ctx.fillStyle = '#c8bca2'; ctx.fillRect(gx, y - 170, 22, 170); ctx.fillRect(gx + 160, y - 170, 22, 170);
      ctx.fillStyle = '#3a3e48'; for (let k = 0; k < 8; k++) ctx.fillRect(gx + 24 + k * 18, y - 130, 5, 130);
      text('GIGANTIC PICTURES', gx + 91, y - 180, 16, '#ffd23a', 'center', 'display');
      const lx = j.x - 60, F = st.final;
      ctx.fillStyle = '#3a3e48'; rr(lx - 16, y - 16, 32, 16, 4); ctx.fill();
      ctx.save(); ctx.translate(lx, y - 12); ctx.rotate(F.ground ? 0.8 : -0.4); ctx.strokeStyle = '#8a92a0'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -46); ctx.stroke(); ctx.fillStyle = '#ff2a2a'; circle(0, -50, 10); ctx.fill(); ctx.restore();
      text('EMERGENCY', lx, y - 78, 11, '#ff8a7a', 'center', 'body');
      if (F.prog > 0) ring(lx, y - 100, F.prog, '#ff5a4a');
    }
  }
  function drawTram(st, t) {
    const T = st.tram;
    for (let j = 2; j >= 0; j--) {
      const c = carSpan(st, j), mx = (c.x0 + c.x1) / 2, y = lineY(st, mx, tramLine(st, mx));
      const ang = Math.atan2(lineY(st, c.x1, tramLine(st, c.x1)) - lineY(st, c.x0, tramLine(st, c.x0)), S.carL);
      ctx.save(); ctx.translate(mx, y - 8); ctx.rotate(ang);
      // wheels, the open body, the striped canopy on posts, cardboard tourists
      ctx.fillStyle = '#1a1a22'; for (const d of [-36, 36]) { circle(d, 0, 9); ctx.fill(); ctx.fillStyle = '#9aa2ae'; circle(d, 0, 3.5); ctx.fill(); ctx.fillStyle = '#1a1a22'; }
      const body = ctx.createLinearGradient(0, -34, 0, -2); body.addColorStop(0, '#ffffff'); body.addColorStop(1, '#c8d0dc');
      ctx.fillStyle = body; ctx.strokeStyle = '#2a2e38'; ctx.lineWidth = 2; rr(-S.carL / 2, -26, S.carL, 22, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(-S.carL / 2 + 4, -24, S.carL - 8, 2);
      ctx.fillStyle = '#e8322a'; ctx.fillRect(-S.carL / 2, -12, S.carL, 4);
      ctx.strokeStyle = '#3a3e48'; ctx.lineWidth = 3; for (const d of [-S.carL / 2 + 6, S.carL / 2 - 6]) { ctx.beginPath(); ctx.moveTo(d, -26); ctx.lineTo(d, -88); ctx.stroke(); }
      for (let k = 0; k < 8; k++) { ctx.fillStyle = k % 2 ? '#ffffff' : '#e8322a'; ctx.beginPath(); ctx.moveTo(-S.carL / 2 - 4 + k * (S.carL + 8) / 8, -88); ctx.lineTo(-S.carL / 2 - 4 + (k + 1) * (S.carL + 8) / 8, -88); ctx.lineTo(-S.carL / 2 - 4 + (k + 1) * (S.carL + 8) / 8, -80 + (k % 2 ? 4 : 0)); ctx.lineTo(-S.carL / 2 - 4 + k * (S.carL + 8) / 8, -80); ctx.closePath(); ctx.fill(); }
      text('TOUR', 0, -16, 9, '#2a2e38', 'center', 'body');
      // cardboard tourists (flat, wobbling, PROP tag on one)
      for (let k = 0; k < 3; k++) {
        const tx = -32 + k * 30, fly = T.hitT > 0 ? T.hitT * 30 : 0;
        ctx.save(); ctx.translate(tx, -26 - fly * (k % 2)); ctx.rotate(K.wobble(j * 3 + k, t, 0.06) + (T.hitT > 0 ? Math.sin(t * 30 + k) * 0.3 : 0));
        ctx.fillStyle = ['#f2c8a0', '#c8946a', '#e8b890'][k]; circle(0, -22, 6); ctx.fill();
        ctx.fillStyle = ['#5aa8e8', '#e85a8a', '#8ad05a'][(k + j) % 3]; rr(-7, -16, 14, 16, 3); ctx.fill();
        ctx.fillStyle = '#1a1a22'; ctx.fillRect(-4, -24, 8, 2);
        ctx.restore();
      }
      if (j === 0) {
        // the cowcatcher and the hand brake with its heat gauge
        ctx.fillStyle = '#c8202e'; ctx.beginPath(); ctx.moveTo(S.carL / 2, -18); ctx.lineTo(S.carL / 2 + 18, -2); ctx.lineTo(S.carL / 2, -2); ctx.closePath(); ctx.fill();
        ctx.save(); ctx.translate(S.carL / 2 - 14, -26); ctx.rotate(T.braking ? 0.5 : -0.3); ctx.strokeStyle = '#3a3e48'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -26); ctx.stroke(); ctx.fillStyle = st.gold ? C.gold : '#1a1a22'; circle(0, -27, 4); ctx.fill(); ctx.restore();
        if (T.heat > 0.55 || T.cook > 0) for (let k = 0; k < 2; k++) { const ph = (t * 1.5 + k / 2) % 1; ctx.fillStyle = 'rgba(80,80,90,' + (0.6 - ph * 0.5) + ')'; circle(30 - ph * 20, -2 - ph * 40, 6 + ph * 10); ctx.fill(); }
      }
      ctx.restore();
    }
    // the brake hero on the cars
    const b = bhPos(st);
    K.stunt(st.brk, b.x, b.y, { look: 'crew', s: 0.95, face: st.bh.face, arms: st.tram.braking ? 'grab' : null });
  }
  function drawRunner(st, t) {
    const r = st.rn, w = st.working;
    K.stunt(st.run, r.x, r.y, { look: 'crew', s: 0.95, face: r.face, stun: r.daze > 0, arms: w ? (w.k === 'push' ? 'fwd' : 'grab') : r.on === 'air' ? 'up' : null, sy: w && w.k === 'push' ? 0.9 : undefined });
    if (zog(st) && r.on === 'air') { ctx.strokeStyle = 'rgba(220,220,240,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(r.x, r.y - 30); ctx.lineTo(r.x, 0); ctx.stroke(); }
    if (st.bubble && st.bubble.who === st.run) {
      const s = st.bubble.text; ctx.font = K.FONT(13); const bw = ctx.measureText(s).width + 18;
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = PCOL[st.run]; ctx.lineWidth = 2; rr(r.x - bw / 2, r.y - 76, bw, 24, 12); ctx.fill(); ctx.stroke();
      text(s, r.x, r.y - 64, 13, C.ink, 'center', 'body');
    }
  }
  function drawTop(st) {
    K.drawPops(st, 0, 0);
    K.frame(st.clock, st.state === 'go' && G.introT <= 0);
    if (st.cut) K.drawCut(st, st.k + 1);
    if (st.intro > 0.8 && G.introT <= 0) { const u = (st.intro - 0.8) / 0.8; K.clapper(W / 2, H / 2 - 30, 2.2, u > 0.5 ? 1 : u * 2, st.k + 1, { scene: st.title.toUpperCase().slice(0, 14) }); }
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = '🎟 ' + st.tickets + ' / 20';
      ctx.font = K.FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, cy, fs, C.gold, 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play || !st.tram) return;
    K.takeMeter(W / 2 - 120 * z, H - 34 * z, 240 * z, 14 * z, st.meter / 100, z);
    const pl = plan(st), T = st.tram, Bn = st.brk, Rn = st.run, r = st.rn;
    const kk = (id, what) => (K.quiet(id) ? '' : K.key(id, what) + ' ');
    {
      const bx = K.panel(Bn, 'brake', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      // the heat gauge fills the brake chip
      K.chip(x0, cy, cw, chh, T.cook > 0 ? 'COOKED ' + Math.ceil(T.cook) : kk(Bn, 'act') + 'BRAKE', pl.brk.hold && !T.braking, T.braking, z);
      ctx.fillStyle = T.heat > 0.8 ? '#ff5a4a' : T.heat > 0.5 ? '#ffb04a' : '#8fe3b0'; rr(x0, cy + chh + 3 * z, cw * T.heat, 3 * z, 1.5 * z); ctx.fill();
      const f = nextFork(st);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, f ? kk(Bn, 'up') + kk(Bn, 'down') + (f.sw === 'up' ? 'UP' : 'LOW') : 'no fork', !!pl.brk.sw, false, z);
    }
    {
      const bx = K.panel(Rn, 'runner', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      const J = pl.jobs[0], at = workAt(st);
      K.chip(x0, cy, cw, chh, r.on === 'car' ? kk(Rn, 'right') + '+ jump: OFF' : r.on === 'air' ? 'in the air' : 'on foot', r.on === 'car' && !!J, false, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, at ? (at.k === 'push' ? 'hold ' + K.key(Rn, 'right') : kk(Rn, 'act') + (at.k === 'crank' ? 'CRANK' : at.k === 'plug' ? 'UNPLUG' : 'HOLD')) : J ? 'next: ' + J.k : 'ride', !!at, !!st.working, z);
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
    const P = K.prompter(st), b = bhPos(st);
    {
      let s = null, col = C.gold, pulse = false;
      if (pl.brk.catch) { s = 'GRAB! ' + K.key(Bn, 'act'); pulse = true; }
      else if (bhCar(st) !== pl.brk.car) { s = 'Walk ' + K.key(Bn, pl.brk.car > bhCar(st) ? 'left' : 'right'); }
      else if (pl.brk.sw) { s = (pl.brk.sw === 'up' ? 'Switch UP ' + K.key(Bn, 'up') : 'Switch LOW ' + K.key(Bn, 'down')); pulse = true; }
      else if (pl.brk.hold && !T.braking && T.cook <= 0) { s = 'BRAKE! Hold ' + K.key(Bn, 'act'); pulse = true; }
      else if (T.braking && T.heat > 0.8) { s = 'Let go! It\'s hot'; col = '#ffb0a0'; }
      P.say(Bn, s, clamp(b.x - st.cam, 70, W - 70), b.y - 70, col, pulse);
    }
    {
      let s = null, col = C.gold, pulse = false;
      const R = pl.run, at = workAt(st);
      if (at && R.act === 'tap') { s = (at.k === 'crank' ? 'CRANK! Tap ' : 'UNPLUG! ') + K.key(Rn, 'act'); pulse = true; }
      else if (at && R.act === 'hold') { s = 'HOLD ' + K.key(Rn, 'act') + ' till it\'s past'; pulse = true; }
      else if (at && R.push) { s = 'PUSH! Hold ' + K.key(Rn, 'right'); pulse = true; }
      else if (R.why === 'call' && Math.abs(r.x - R.x) < 30) { s = (R.call === 'up' ? 'Call: Go up! ' + K.key(Rn, 'up') : 'Call: Stay low! ' + K.key(Rn, 'down')); pulse = true; }
      else if (r.on === 'car' && pl.jobs[0]) { s = 'Jump off! ' + K.key(Rn, 'right') + ' + ' + K.key(Rn, 'up'); }
      else if (R.why === 'board' && r.on !== 'car') { s = 'Hop on as it comes ' + K.key(Rn, 'up'); col = '#ffffff'; }
      P.say(Rn, s, clamp(r.x - st.cam, 70, W - 70), r.y - 70, col, pulse);
    }
  }
  const medal = t => K.medal(t <= S.goldT, t <= S.silverT);

  // the runner's call at a fork sign (▲ / ▼ there), read every tick before jobs
  const tickCall = st => {
    const r = st.rn, p = G.players[st.run], i = p.input;
    if (r.on !== 'ground') return;
    for (const f of st.forks) {
      if (f.locked || Math.abs(r.x - (f.x0 - 100)) > 30) continue;
      const to = (i.up && !i.down) || p.pendingJump ? 'up' : i.down ? 'low' : null;
      if (to && st.call[f.i] !== to) { st.call[f.i] = to; st.stats.calls++; st.bubble = { who: st.run, text: to === 'up' ? 'Go up!' : 'Stay low!', t: 1.6 }; Sfx.play('tramrunCall'); }
    }
  };

  MODES.tramrun = {
    S, SETS, plan, tailHit, medal, layout, workAt, workSpot, carSpan, carDeck, lineY, tramLine, forkAt, bhCar, nextFork, TRAM_L,
    setup(st, L) {
      st.stats = { crashes: 0, props: 0, catches: 0, tickets: 0, retakes: 0, cooked: 0, boards: 0, offs: 0, scoops: 0, calls: 0, helps: 0, roomT: [] };
      st.tickets = 0; st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0;
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; for (const row of L.grid) row.fill('.'); room(st, L, k); },
    step(dt) { const st = G.mst; if (st.tram && st.state === 'go' && G.introT <= 0 && !st.waiting) tickCall(st); tick(st, dt); },
    draw() { const st = G.mst; if (!st.tram) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.tram) drawTop(st); },
    hud() { const st = G.mst; if (st.tram) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Props cleared', value: String(s.props) },
        { label: 'Crashes', value: String(s.crashes) },
        { label: 'Tickets', value: st.tickets + ' of 20' },
        { label: 'Medal', value: medal(G.time) },
      ];
      out.push('Catches: ' + s.catches + '. Retakes: ' + s.retakes + '. Cooked brakes: ' + s.cooked + '. The tour is saved!');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  const acts = b => ({ label: 'brake', labels: b === 0 ? ['brake', 'do it'] : ['do it', 'brake'] });
  STUDIO.defs.tramrun = {
    name: 'Backlot Tram Runaway', world: 35, kind: 'team', mode: 'tramrun', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Take', outfit: 'none',
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> walk / <kbd>W</kbd><kbd>S</kbd> switch or jump',
      bo: '<kbd>←</kbd><kbd>→</kbd> walk / <kbd>↑</kbd><kbd>↓</kbd> switch or jump',
      pad: 'stick walks, A jumps,',
    },
    tip: 'Stop the runaway tram! The brake hero brakes in short pulls and throws the switches; the runner jumps off and clears the props ahead.',
    act: acts(0),
    map: K.stubMap(),
    rooms: [
      { title: 'Dusty Gulch', brk: 0, act: acts(0), tip: 'Pip holds the brake (it heats up: short pulls!). Bo jumps off the front (▶ + jump), pushes the foam cacti off and hops back on.' },
      { title: 'Planet Zog', brk: 1, act: acts(1), tip: 'Swap jobs! Low-gravity wires: big floaty jumps. Unplug the laser cable at its box. REAL towers need the switch: call it at the FORK sign.' },
      { title: 'Jungle Temple', brk: 0, act: acts(0), tip: 'Hold the lever while the tram passes, then catch the last car. The mud is REAL: it slows you right down.' },
      { title: 'Monster Island', brk: 1, act: acts(1), tip: 'Brake to let the tail sweep past! At the gates, both hold the big red lever together to stop the tram.' },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.tramrunSwitch = function () { this.tone(600, 0.05, 'square', 0.03, 400); this.tone(300, 0.08, 'triangle', 0.03, 200, 0.04); };
  Sfx.extra.tramrunClunk = function () { this.tone(150, 0.08, 'square', 0.04, 90); };
  Sfx.extra.tramrunHiss = function () { this.tone(2400, 0.5, 'sawtooth', 0.008, 3000); };
  Sfx.extra.tramrunCatch = function () { this.tone(500, 0.08, 'triangle', 0.04, 800); this.tone(800, 0.1, 'triangle', 0.03, 1100, 0.06); };
  Sfx.extra.tramrunJump = function () { this.tone(330, 0.1, 'square', 0.03, 560); };
  Sfx.extra.tramrunLand = function () { this.tone(140, 0.06, 'triangle', 0.05, 90); };
  Sfx.extra.tramrunCrank = function (p) { p = p || 1; this.tone(700 * p, 0.03, 'square', 0.02, 500 * p); };
  Sfx.extra.tramrunUnplug = function () { this.tone(1200, 0.15, 'sawtooth', 0.02, 200); };
  Sfx.extra.tramrunGate = function () { this.tone(300, 0.2, 'sawtooth', 0.02, 500); };
  Sfx.extra.tramrunCall = function () { this.tone(520, 0.08, 'triangle', 0.03, 660); };
  Sfx.extra.tramrunBell = function () { [1318, 1046, 1318].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.04, null, i * 0.12)); };
  Sfx.extra.tramrunStop = function () { this.tone(400, 0.8, 'sawtooth', 0.025, 80); this.tone(1800, 0.6, 'square', 0.006, 300, 0.05); };
  Sfx.extra.tramrunFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.055, null, i * 0.12)); };
})();
