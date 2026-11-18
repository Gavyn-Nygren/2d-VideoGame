/* Pip & Bo - Level 42-2 Log Flume Plunge (team, World 42 Midnight Theme Park, 3D). */
'use strict';

/* ===== 42-2 Log Flume Plunge (mode 'parkflume', team, view3d, one continuous ride) =====
   Still buzzing from the coaster, Pip and Bo climb into a hollow log at Timber Falls, the gentle ride. The dock gate
   swings open by itself and the current takes them: down the lantern-lit river, through the jungle of clockwork animals,
   through the old sawmill and up to the top of the biggest drop in the park. PIP SITS IN FRONT AND PADDLES ON THE LEFT,
   BO SITS BEHIND AND PADDLES ON THE RIGHT, all level.

   The current always carries the log downstream at the channel's own speed (PARKFLUME_ROUTE: the rail's v), so nothing
   can lock. Where it goes ACROSS the channel is the riders' doing. The log is free on the water: its place is (s, x)
   (along the channel, and to the right of its middle), its nose points psi radians off the channel's way (+ to the
   right), it turns with angular speed om and moves through the water at u (+ forward). Each rider has their own paddle:
     STROKE  the action: one pull on your side (S.PULL s, then S.REST s before the next). It pushes the log forward a
             little and swings the nose AWAY from your side: Pip's strokes turn it right, Bo's turn it left.
     PAIR    strokes that start within S.PAIR_WIN s of each other: no turn, a bigger push, a deeper chunk and a V of
             spray. Keeping up pairs builds SPEED (0..1) over three or four pairs (the wake turns white, the beaver's
             lantern glows); it fades after S.SPEED_HOLD s without a pair. Speed crosses fast currents and jumps weirs.
     DRAG    hold ▼: your paddle held in the water on your side slows the log and pulls the nose TOWARD your side,
             sharper than a stroke turns it. Both dragging is the brake (the current still carries it, slowly).
     BRACE   both hold jump: they grab the rail and hunker down. Braced, the log takes a drop or a big wave without
             harm; it cannot be paddled. One alone bracing is not enough (that rider is fine, the log still takes it).
   The log has weight: it keeps turning after the paddles stop, the current slowly straightens it, and it slides to the
   outside of bends. Banks (tyres and logs) are soft: a bump and a scrape that costs speed, never a Soak.
   SOAKS: a hazard hit, or a drop taken unbraced, slaps water over the side (it cannot Soak again for S.SAFE s); the
   HUD's little log fills a step. Lifebuoy arches (about every 25 s, the channel narrows under them) tip the water out
   and set the restart point. A full log (three Soaks, five with the gold help) before the next arch sinks: a SINKING
   (the pair bob in rubber rings and a wind-up tug tows a fresh log from the last arch; ducks stay collected). Two
   Sinkings from the same arch: gold help, the log rides higher (five Soaks) until two more arches are passed,
   announced ("The bucket robot is bailing for you").
   DUCKS: golden rubber ducks on the water; the log takes one it touches (a big one is five).
   THE FINISH: the dock's ring; the log must be in it slowly enough to stop (both drag). Too fast and the current takes
   it round Splashdown Lagoon again, no penalty.
   Only the boarding before control starts and the ending are not played (jump skips them). One room in the game's
   sense; the four stretches are places along the channel (never cards).
   State lives in G.mst; the rules never read the renderer (K3D.noRender plays the same). Names are prefixed parkflume. */

const PARKFLUME = (function () {
  const PR = PARKFLUME_ROUTE, R = PR.R, L = PR.lists;
  const S = {
    PULL: 0.5, REST: 0.2, PAIR_WIN: 0.25,
    STROKE_TURN: 1.25, STROKE_PUSH: 0.75, PAIR_PUSH: 1.0, DRAG_TURN: 1.7, DRAG_SLOW: 2.0,
    OM_DAMP: 1.8, ALIGN: 0.55, PSI_MAX: 1.05, FOLLOW: 0.78, SLIDE: 0.35,
    U_DAMP: 0.42, U_MAX: 2.3, U_MAX_SPEED: 2.0, BRAKE_ONE: -0.3, BRAKE_BOTH: -0.6, KEEL: 0.55,
    SPEED_PAIR: 0.3, SPEED_HOLD: 1.7, SPEED_FADE: 0.32,
    FLOW_MID: 1.02, FLOW_EDGE: 0.12, GLIDE: 8, HEAVY: 0.05,
    HALF_LEN: 1.55, HALF_W: 0.72, BANK_PAD: 0.15,
    SAFE: 1.5, ONCE: 6, WATER: 3, GOLD_WATER: 5, GOLD_ARCHES: 2, BRACE_MEMO: 0.35,
    SINK: 1.6, BOB: 1.0, TUG: 2.0, DUCK_R: 0.95, BIG_R: 1.35, BIG_DUCKS: 5,
    BOARD_T: 6.5, DOCK_T: 6.0, RING_R: 2.4, RING_V: 1.2,
  };
  const CO = { S };
  const sgn = x => (x > 0 ? 1 : x < 0 ? -1 : 0);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  CO.ducksMax = () => L.ducks.reduce((n, d) => n + (d.big ? S.BIG_DUCKS : 1), 0);

  /* ---------- what each rider presses ---------- */
  const dragOf = p => !!(p.input && (p.input.down || (p.input.ay || 0) > 0.55));
  const braceOf = p => !!(p.input && p.input.jump);
  const anyPress = p => { const i = p.input || {}; return !!(i.left || i.right || i.down || i.jump || i.act || i.up || Math.abs(i.ax || 0) > 0.35 || Math.abs(i.ay || 0) > 0.55); };

  CO.partAt = s => { let k = 0; for (let i = 0; i < L.parts.length; i++) if (s >= L.parts[i].s) k = i; return k; };
  CO.partNames = L.parts.map(p => p.name);

  function fresh(st) {
    Object.assign(st, {
      phase: 'board', t: 0, phaseT: 0,
      s: 0, x: 0, psi: 0, om: 0, u: 0, vs: 0, vx: 0, prevS: 0,
      // each rider's paddle: the stroke in progress (-1: none), its turn already given (to take back on a pair), rest
      pull: [-1, -1], pullDir: [0, 0], given: [0, 0], paired: [false, false], rest: [0, 0], strokeAt: [-9, -9],
      drag: [false, false], brace: [false, false], braced: false, braceT: -9, oneBrace: [0, 0],
      speed: 0, lastPair: -9, pairs: 0, strokes: [0, 0], wantTurn: 0,
      water: 0, maxWater: S.WATER, safe: 0, soaks: 0, soakAt: [0, 0, 0, 0], sinkings: 0, lastWhy: '',
      restart: PR.START, sameArch: 0, lastSinkArch: -1, gold: 0, goldMsgT: -99, goldN: 0,
      ducks: 0, got: L.ducks.map(() => false), bank: [0, 0], bumpT: 0, bumps: 0, dropDone: {}, dropBraced: {},
      says: [], fx: [], air: 0, airV: 0, splash: 0, wet: 0, ringT: 0, laps: 0, finished: false, started: false,
      plungeDry: false, plungeTaken: false, hitBy: {}, sink: null, whirl: null, whirlDone: L.whirls.map(() => false),
    });
  }
  CO.fresh = fresh;

  /* ---------- the log's two ends and the water's edges ---------- */
  // the bow (k = 1) or the stern (k = -1) in channel terms
  const end = (st, k) => ({ s: st.s + k * S.HALF_LEN * Math.cos(st.psi), x: st.x + k * S.HALF_LEN * Math.sin(st.psi) });
  CO.end = end;
  // an island's half width at s (a lens), 0 outside it
  CO.islandAt = s => { for (const I of L.islands) if (s > I.s0 && s < I.s1) return { I, hw: I.hw * Math.sin(Math.PI * (s - I.s0) / (I.s1 - I.s0)) }; return null; };
  // where a moving thing is now
  CO.obsAt = (o, t) => (o.move ? o.move(t) : { s: o.s, x: o.x, on: true });
  // the log as a segment: distance from a point (s, x) to it (channel terms; the channel is near enough straight
  // over a log's length)
  function segDist(st, ps, px) {
    const cx = Math.cos(st.psi), sx = Math.sin(st.psi);
    const ds = ps - st.s, dx = px - st.x, along = clamp(ds * cx + dx * sx, -S.HALF_LEN, S.HALF_LEN);
    const qs = st.s + cx * along, qx = st.x + sx * along;
    return { d: Math.hypot(ps - qs, px - qx), ns: qs - ps, nx: qx - px };
  }
  CO.segDist = segDist;

  /* ---------- Soaks and Sinkings ---------- */
  function soak(st, why) {
    if (st.safe > 0 || st.phase !== 'ride') return false;
    st.safe = S.SAFE; st.soaks++; st.water++; st.lastWhy = why;
    st.soakAt[CO.partAt(st.s)]++;
    st.u *= 0.35; st.speed *= 0.4; st.wet = Math.min(1, st.wet + 0.4);
    st.fx.push({ k: 'soak', t: st.t, why });
    Sfx.play('parkflumeSoak');
    G.shake = Math.max(G.shake || 0, 0.25);
    if (typeof rumble === 'function') { rumble(0, 0.4, 0.5, 160); rumble(1, 0.4, 0.5, 160); }
    if (st.water >= st.maxWater) sinkStart(st);
    return true;
  }
  CO.soak = soak;
  function sinkStart(st) {
    st.sinkings++; st.phase = 'sink'; st.phaseT = 0;
    st.sink = { s: st.s, x: st.x, psi: st.psi, arch: st.restart };
    if (st.lastSinkArch === st.restart) st.sameArch++; else { st.sameArch = 1; st.lastSinkArch = st.restart; }
    st.fx.push({ k: 'sink', t: st.t });
    Sfx.play('parkflumeSink');
  }
  function restartAt(st) {
    st.phase = 'ride'; st.phaseT = 0;
    st.s = st.prevS = st.restart + 0.5; st.x = 0; st.psi = 0; st.om = 0; st.u = 0.6; st.speed = 0;
    if (st.sameArch >= 2 && st.gold <= 0) { st.gold = S.GOLD_ARCHES; st.maxWater = S.GOLD_WATER; st.goldMsgT = st.t; st.goldN++; }
    // (sunk again from the same arch with the help on: the bucket robot bails even more, two more Soaks each time)
    else if (st.sameArch >= 3 && st.gold > 0) { st.gold = S.GOLD_ARCHES; st.maxWater = Math.min(S.GOLD_WATER + 6, S.GOLD_WATER + 2 * (st.sameArch - 2)); st.goldMsgT = st.t; }
    st.water = 0; st.safe = 2.0; st.wet = Math.max(0.3, st.wet);
    st.pull = [-1, -1]; st.rest = [0, 0]; st.air = 0; st.airV = 0; st.sink = null;
    st.dropDone = {}; st.dropBraced = {}; st.whirl = null; st.hitBy = {};
    Sfx.play('parkflumeBail');
  }

  /* ---------- paddling ---------- */
  function paddles(st, dt) {
    const ps = G.players;
    // brace: both holding jump (a rider who is bracing cannot paddle)
    for (const p of ps) st.brace[p.id] = braceOf(p);
    const both = st.brace[0] && st.brace[1];
    if (both && !st.braced) Sfx.play('parkflumeBrace');
    st.braced = both; if (both) st.braceT = st.t;
    for (const p of ps) {
      const k = p.id, side = k === 0 ? -1 : 1; // Pip's paddle is on the left (-x)
      st.drag[k] = !st.brace[k] && dragOf(p);
      st.rest[k] = Math.max(0, st.rest[k] - dt);
      if (p.pendingAct) {
        p.pendingAct = false;
        if (!st.brace[k] && st.pull[k] < 0 && st.rest[k] <= 0) {
          // a stroke: away from your side (Pip's turns right, +psi)
          st.pull[k] = 0; st.pullDir[k] = -side; st.given[k] = 0; st.paired[k] = false; st.strokes[k]++;
          st.strokeAt[k] = st.t;
          const o = 1 - k;
          if (st.pull[o] >= 0 && !st.paired[o] && st.t - st.strokeAt[o] <= S.PAIR_WIN) {
            // a pair: no turn (take back what the first already gave), a bigger push, Speed
            st.paired[k] = st.paired[o] = true;
            st.om -= st.given[o]; st.given[o] = 0;
            st.pairs++; st.lastPair = st.t; st.speed = Math.min(1, st.speed + S.SPEED_PAIR);
            st.u += S.PAIR_PUSH * (1 + 0.6 * st.speed) / CO.heavy(st);
            st.fx.push({ k: 'pair', t: st.t });
            Sfx.play('parkflumePair');
          } else Sfx.play('parkflumeStroke', k);
        }
      }
      if (st.pull[k] >= 0) {
        // the pull: push and (unless paired) turn, spread over S.PULL
        const f = Math.min(dt, S.PULL - st.pull[k]);
        st.u += S.STROKE_PUSH / S.PULL * f / CO.heavy(st);
        if (!st.paired[k]) { const a = st.pullDir[k] * S.STROKE_TURN / S.PULL * f; st.om += a; st.given[k] += a; }
        st.pull[k] += dt;
        if (st.pull[k] >= S.PULL) { st.pull[k] = -1; st.rest[k] = S.REST; }
      }
      if (st.drag[k]) {
        // held in the water: slows, and pulls the nose toward your side
        st.om += side * S.DRAG_TURN * dt;
        st.u -= S.DRAG_SLOW * dt;
        if (!st.dragOn || !st.dragOn[k]) Sfx.play('parkflumeDrag', k);
      }
    }
    st.dragOn = st.drag.slice();
    // Speed fades without pairs
    if (st.t - st.lastPair > S.SPEED_HOLD) st.speed = Math.max(0, st.speed - S.SPEED_FADE * dt);
  }

  /* ---------- the log on the water ---------- */
  // THE WATER: the current runs fastest down the middle of the channel and slack along the banks (S.FLOW_MID in the
  // middle, S.FLOW_EDGE less at the edge), as a real stream does: the middle is the quick line, the banks the slow one.
  CO.flow = (s, x, f) => { const q = clamp(Math.abs(x) / Math.max(1, PR.w(s)), 0, 1); return Math.max(0.3, (f || R.at(s)).v) * (S.FLOW_MID - S.FLOW_EDGE * q * q); };
  // water aboard is weight: each Soak's water makes the log a little slower to drive
  CO.heavy = st => 1 + S.HEAVY * st.water;
  function move(st, dt) {
    const f = R.at(st.s), c = CO.flow(st.s, st.x, f);
    // speed through the water: eases back; a brake floor; a top speed that Speed raises
    st.u -= st.u * S.U_DAMP * dt;
    const floor = st.drag[0] && st.drag[1] ? S.BRAKE_BOTH * c : st.drag[0] || st.drag[1] ? S.BRAKE_ONE * c : -0.05;
    st.u = clamp(st.u, floor, (S.U_MAX + S.U_MAX_SPEED * st.speed) / CO.heavy(st));
    // turning: weight (damping), the current straightening it, the channel's bend carrying it round late
    st.om -= st.om * S.OM_DAMP * dt;
    st.om -= st.psi * S.ALIGN * dt;
    st.vs = Math.max(0.15, c + st.u * Math.cos(st.psi));
    st.psi += st.om * dt + f.turn * st.vs * (1 - S.FOLLOW) * dt;
    if (Math.abs(st.psi) > S.PSI_MAX) { st.psi = sgn(st.psi) * S.PSI_MAX; if (sgn(st.om) === sgn(st.psi)) st.om = 0; }
    // across: the heading carries it (the keel), and it slides to the outside of bends
    // (the log has weight: its sideways drift eases toward where its heading and the bend send it, it glides on)
    const wantVx = (Math.max(0, st.u) + S.KEEL * c) * Math.sin(st.psi) + f.turn * st.vs * st.vs * S.SLIDE;
    st.vx += (wantVx - st.vx) * Math.min(1, dt * S.GLIDE);
    st.prevS = st.s;
    st.s += st.vs * dt; st.x += st.vx * dt;
    // the air off a weir jump or the plunge's lip (the look; the rules only remember it)
    if (st.air > 0 || st.airV > 0) { st.airV -= 18 * dt; st.air = Math.max(0, st.air + st.airV * dt); if (st.air <= 0) st.airV = 0; }
    banks(st, dt);
    obstacles(st, dt);
  }
  // the banks and the island: soft, they push the log back in and cost a little speed, never a Soak
  function banks(st, dt) {
    let hit = 0;
    for (const k of [1, -1]) {
      const e = end(st, k), w = PR.w(e.s) - S.HALF_W * 0.85 - S.BANK_PAD;
      let push = 0;
      if (e.x > w) push = w - e.x; else if (e.x < -w) push = -w - e.x;
      const isl = CO.islandAt(e.s);
      if (isl && isl.hw > 0.2) {
        const lim = isl.hw + S.HALF_W * 0.85, rel = e.x - isl.I.x;
        if (Math.abs(rel) < lim) { const sd = rel !== 0 ? sgn(rel) : (st.x >= isl.I.x ? 1 : -1); push = sd * lim - rel; }
      }
      if (push) {
        hit = sgn(push);
        st.x += push;
        // the end that touched swings off the bank: the nose straightens along it
        const want = k === 1 ? sgn(push) : -sgn(push);
        st.om *= 0.6;
        if (sgn(st.psi) !== want) st.psi *= 0.92;
        st.om += want * 0.4 * dt * 10;
      }
    }
    const was = st.bank[0];
    st.bank[0] = hit;
    st.bumpT = Math.max(0, st.bumpT - dt);
    if (hit && !was) {
      if (Math.abs(st.vx) > 0.35 && st.bumpT <= 0) { st.bumps++; st.bumpT = 0.6; st.u *= 0.7; st.speed = Math.max(0, st.speed - 0.15); Sfx.play('parkflumeBump'); st.fx.push({ k: 'bump', t: st.t, side: hit }); }
    }
    if (hit) st.u -= Math.max(0, st.u) * 0.5 * dt;
    st.vx = hit ? 0 : st.vx;
  }
  // round things in the water: bump them (pushed off), and the soaking ones Soak the log
  function obstacles(st) {
    for (const o of L.obs) {
      if (Math.abs(o.s - st.s) > 8) continue;
      const q = CO.obsAt(o, st.t);
      if (!q.on) continue;
      // a thing in one arm of a fork only reaches that arm
      if (o.side && sgn(st.x) !== o.side) continue;
      // (one thing Soaks the log once as it goes by: not again while the log is still beside it)
      const soaks = (q.soak != null ? q.soak : o.soak) && !(st.hitBy[o.id] > st.t);
      if (o.line) {
        // a line right across the channel (a jet, a wave, a wheel's blades): the log is under it or not
        if (Math.abs(q.s - st.s) > o.r + S.HALF_LEN) continue;
        if (o.braceOk && st.braced) { if (!st.lineT || st.t - st.lineT > 0.6) { st.lineT = st.t; st.fx.push({ k: 'shrug', t: st.t, id: o.id }); Sfx.play('parkflumeSplash'); } continue; }
        if (soaks && soak(st, o.kind)) { st.hitBy[o.id] = st.t + S.ONCE; st.fx.push({ k: 'hit', t: st.t, id: o.id }); }
        continue;
      }
      const sd = segDist(st, q.s, q.x), lim = o.r + S.HALF_W;
      if (sd.d >= lim) continue;
      if (o.braceOk && st.braced) { if (!st.lineT || st.t - st.lineT > 0.6) { st.lineT = st.t; st.fx.push({ k: 'shrug', t: st.t, id: o.id }); Sfx.play('parkflumeSplash'); } continue; }
      const n = sd.d > 1e-4 ? 1 / sd.d : 0, over = lim - sd.d;
      // push the log out sideways mostly (the current keeps it going): never back upstream
      st.x += (n ? sd.nx * n : (st.x >= q.x ? 1 : -1)) * over;
      st.s += Math.max(0, (n ? sd.ns * n : 0) * over);
      st.om *= 0.7;
      if (soaks) { if (soak(st, o.kind)) { st.hitBy[o.id] = st.t + S.ONCE; st.fx.push({ k: 'hit', t: st.t, id: o.id }); } }
      else if (!st.obT || st.t - st.obT > 0.7) { st.obT = st.t; st.u *= 0.75; Sfx.play('parkflumeBump'); st.fx.push({ k: 'bonk', t: st.t, id: o.id }); }
    }
  }

  /* ---------- the lifts and the whirlpool ---------- */
  CO.liftAt = s => L.lifts.find(l => s >= l.s0 && s < l.s1) || null;
  // on a lift the belt has the log: straight up the middle at the belt's speed (paddles only hook the edge ducks)
  function belt(st, dt) {
    const f = R.at(st.s);
    st.vs = Math.max(1.2, f.v); st.u = 0; st.speed = Math.max(0, st.speed - 0.2 * dt);
    st.x += (0 - st.x) * Math.min(1, dt * 4); st.psi += (0 - st.psi) * Math.min(1, dt * 4); st.om = 0; st.vx = 0; st.bank[0] = 0;
    st.prevS = st.s; st.s += st.vs * dt;
    if (!st.clank || st.t - st.clank > 0.45) { st.clank = st.t; Sfx.play('parkflumeBelt'); }
  }
  // the whirlpool: caught, the log goes round the pool until enough good pairs (or long enough) break it out
  function whirl(st, dt) {
    const w = st.whirl, W = L.whirls[w.i];
    w.t += dt; w.a += dt * (1.15 + 0.25 * st.speed);
    if (st.pairs > w.pairs0) { w.n += st.pairs - w.pairs0; w.pairs0 = st.pairs; }
    st.prevS = st.s;
    st.s = W.s + Math.sin(w.a) * W.r * 0.6; st.x = W.x + Math.cos(w.a) * W.r * 0.6;
    st.psi = clamp(-Math.cos(w.a) * 0.9, -S.PSI_MAX, S.PSI_MAX); st.vs = 1.8; st.vx = 0; st.u = 0;
    const out = (w.n >= W.need || w.t > 40) && Math.sin(w.a) > 0.85;
    if (out) { st.whirl = null; st.whirlDone[w.i] = true; st.u = 2.0; st.psi = 0; st.om = 0; st.fx.push({ k: 'whirlOut', t: st.t }); Sfx.play('parkflumePair'); }
    else if (!w.snd || st.t - w.snd > 2.2) { w.snd = st.t; Sfx.play('parkflumeWhirl'); }
  }

  /* ---------- what the log passes ---------- */
  const crossed = (x, a, b) => x > a && x <= b;
  function events(st, a, b) {
    // lifebuoy arches: bailed dry, the restart point
    for (const s of L.arches) if (crossed(s, a, b)) {
      if (s > st.restart + 0.01) { st.sameArch = 0; if (st.gold > 0 && --st.gold === 0) st.maxWater = S.WATER; }
      st.restart = s; st.water = 0;
      st.fx.push({ k: 'arch', t: st.t, s }); Sfx.play('parkflumeBail');
    }
    for (const sy of L.says) if (crossed(sy.s, a, b)) { st.says.push({ text: sy.text, t: st.t, s: sy.s }); Sfx.play('parkflumeTannoy'); }
    // drops: braced from before the lip to the landing, or a Soak at the landing
    for (let i = 0; i < L.drops.length; i++) {
      const d = L.drops[i];
      if (d.side && sgn(st.x) !== d.side) continue; // a drop in one arm of a fork
      if (b > d.s0 && a < d.s1 && st.braced) st.dropBraced[i] = true;
      if (crossed(d.s0, a, b) && !st.dropDone[i]) {
        // the lip: over it with a little air (more with Speed on a weir)
        st.airV = d.kind === 'plunge' ? 0.6 : 2.2 + st.speed * 2.6; st.air = 0.01;
        Sfx.play(d.kind === 'plunge' ? 'parkflumePlunge' : 'parkflumeDrop');
      }
      if (crossed(d.s1, a, b) && !st.dropDone[i]) {
        st.dropDone[i] = true;
        const ok = st.dropBraced[i] || st.t - st.braceT < S.BRACE_MEMO;
        st.splash = d.kind === 'plunge' ? 1 : 0.6;
        st.fx.push({ k: 'splash', t: st.t, big: d.kind === 'plunge', ok });
        Sfx.play(d.kind === 'plunge' ? 'parkflumeBigSplash' : 'parkflumeSplash');
        if (!ok) { for (const k of [0, 1]) if (!st.brace[k]) st.oneBrace[k] = 1.0; soak(st, d.kind); }
        else if (d.kind === 'plunge') { st.plungeDry = true; st.u += 2.5; }
        if (d.kind === 'plunge') { st.plungeTaken = true; Sfx.play('parkflumeFlash'); st.fx.push({ k: 'photo', t: st.t }); }
        st.wet = Math.min(1, st.wet + (d.kind === 'plunge' ? 0.6 : 0.15));
      }
    }
    // ducks
    for (let i = 0; i < L.ducks.length; i++) {
      const dk = L.ducks[i];
      if (dk.s > b + 3) break;
      if (st.got[i] || dk.s < a - 3) continue;
      // a duck on a lift's edge: hooked by a stroke on its side as the log passes it
      const hooked = dk.hook && Math.abs(dk.s - st.s) < 2.4 && st.t - st.strokeAt[dk.hook < 0 ? 0 : 1] < 0.3;
      if (hooked || (!dk.hook && segDist(st, dk.s, dk.x).d < (dk.big ? S.BIG_R : S.DUCK_R))) {
        st.got[i] = true; st.ducks += dk.big ? S.BIG_DUCKS : 1;
        st.fx.push({ k: 'duck', t: st.t, i, big: dk.big });
        Sfx.play(dk.big ? 'parkflumeBigDuck' : 'parkflumeDuck');
      }
    }
  }

  /* ---------- the level ---------- */
  function step(st, dt) {
    const ps = G.players;
    st.t += dt; st.phaseT += dt;
    st.safe -= dt;
    for (const k of [0, 1]) st.oneBrace[k] = Math.max(0, st.oneBrace[k] - dt);
    st.splash = Math.max(0, st.splash - dt * 1.2);
    while (st.fx.length && st.t - st.fx[0].t > 3) st.fx.shift();
    while (st.says.length > 4) st.says.shift();
    const f = R.at(st.s);
    K3D.heading = Math.atan2(-f.t[0], -f.t[2]);
    if (st.phase === 'board') {
      // the boarding: the log bumps the jetty, they hop in, the gate swings open, it drifts out
      const skip = ps.some(p => p.pendingJump);
      for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
      if (skip && st.phaseT > 0.4) st.phaseT = Math.max(st.phaseT, S.BOARD_T);
      if (st.phaseT >= S.BOARD_T - 2.6) { if (!st.gate) { st.gate = true; Sfx.play('parkflumeGate'); } st.s += Math.max(0.9, R.at(st.s).v) * dt * (st.phaseT >= S.BOARD_T ? 3 : 1); }
      if (st.s >= PR.START || (skip && st.phaseT >= S.BOARD_T)) {
        if (st.s < PR.START) st.s = PR.START;
        st.phase = 'ride'; st.phaseT = 0; st.started = true; st.prevS = st.s;
        events(st, 0, st.s);
      }
      return;
    }
    if (st.phase === 'ride') {
      // the music: the tense climbing tune while a lift hauls the log up, the jig again once it has splashed down
      { const up = L.lifts.some(lf => st.s > lf.s0 - 1 && st.s < lf.s1 + 6); if (up !== !!st.liftTune && typeof Music !== 'undefined' && Music.cue) { st.liftTune = up; Music.cue({ song: up ? 'parkflumeLift' : 'parkflume' }); } }
      paddles(st, dt);
      if (st.whirl) whirl(st, dt);
      else if (CO.liftAt(st.s)) belt(st, dt);
      else {
        move(st, dt);
        for (let i = 0; i < L.whirls.length; i++) { const W = L.whirls[i]; if (!st.whirlDone[i] && st.s > W.s - W.r * 0.6 && st.s < W.s + W.r * 0.3) { st.whirl = { i, a: Math.atan2(st.s - W.s, st.x - W.x), n: 0, pairs0: st.pairs, t: 0 }; st.says.push({ text: 'Whirlpool! Paddle together to break out!', t: st.t }); } }
      }
      st.wet = Math.max(0, st.wet - dt * 0.004);
      events(st, st.prevS, st.s);
      // the finish: in the dock's ring slowly enough to stop
      const ring = PR.at.ring;
      // (each time round, the dock's robots reach further out to catch the log: by the third time they catch it at any speed)
      const vMax = S.RING_V * (st.laps >= 2 ? 99 : st.laps === 1 ? 1.6 : 1), rr = S.RING_R * (st.laps >= 2 ? 1.5 : 1);
      if (Math.abs(st.s - ring) < rr && Math.abs(st.x) < rr && st.vs < vMax) { st.phase = 'dock'; st.phaseT = 0; st.dockFrom = { s: st.s, x: st.x, psi: st.psi }; Sfx.play('parkflumeDock'); }
      else if (st.s > ring + rr) {
        // too fast: round the lagoon again (back to the splashdown's end of it), no penalty
        // (the first time from the lagoon's far side; after that only from the last arch, a short way out)
        st.laps++; st.s = st.prevS = st.laps === 1 ? PR.at.barges : PR.at.arch9 + 1; st.u = 0; st.x = 0; st.psi = 0; st.om = 0;
        st.says.push({ text: st.laps === 1 ? 'Round again! Both hold your paddles in to stop at the dock!' : 'Round again! The dock robots will catch you this time!', t: st.t });
      }
      return;
    }
    for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
    if (st.phase === 'sink') {
      // the log fills and sinks with a glug, the pair bob in rubber rings, the tug tows a fresh log from the arch
      const T1 = S.SINK, T2 = T1 + S.BOB, T3 = T2 + S.TUG;
      if (st.phaseT < T1) { st.s += R.at(st.s).v * 0.4 * dt; }
      if (st.phaseT >= T1 && !st.sink.bob) { st.sink.bob = true; Sfx.play('parkflumeSplash'); }
      if (st.phaseT >= T2 && !st.sink.tug) { st.sink.tug = true; Sfx.play('parkflumeTug'); }
      if (st.phaseT >= T3) restartAt(st);
      return;
    }
    if (st.phase === 'dock') {
      // bump the jetty, the bucket robot empties a last bucket over them, the photo board
      const d = st.dockFrom, u = Math.min(1, st.phaseT / 1.4), e = 1 - Math.pow(1 - u, 2);
      st.s = d.s + (PR.at.ring + 0.6 - d.s) * e; st.x = d.x * (1 - e); st.psi = d.psi * (1 - e);
      if (st.phaseT > 1.8 && !st.bucket) { st.bucket = true; st.wet = 1; Sfx.play('parkflumeSplash'); }
      const skip = ps.some(p => p.pendingJump);
      if ((st.phaseT >= S.DOCK_T || (skip && st.phaseT > 1)) && !st.finished) { st.finished = true; st.phase = 'done'; levelClear(); }
    }
  }
  CO.step = step; CO.events = events; CO.paddles = paddles; CO.move = move; CO.anyPress = anyPress; CO.dragOf = dragOf; CO.braceOf = braceOf;

  /* ---------- the HUD: ducks, the log's water, Speed, each rider's paddle side ---------- */
  function hudDuck(x, y, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = '#7a5410'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(1, 3, 9, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(-4, -4, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-14, -2.5); ctx.lineTo(-9, -1.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a2235'; ctx.beginPath(); ctx.arc(-5, -5, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function hudLog(x, y, st) {
    // a little log with a water line in steps (three, five in gold)
    const n = st.maxWater, w = 64, h = 22;
    ctx.save(); ctx.translate(x, y);
    rr(-w / 2, -h / 2, w, h, 10); ctx.fillStyle = '#7a4d30'; ctx.fill();
    ctx.save(); rr(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 6); ctx.clip();
    ctx.fillStyle = '#3a2216'; ctx.fillRect(-w / 2, -h / 2, w, h);
    const lvl = Math.min(1, st.water / n);
    ctx.fillStyle = st.gold > 0 ? '#ffd24a' : '#6ad0ff'; ctx.fillRect(-w / 2, h / 2 - 4 - (h - 8) * lvl, w, (h - 8) * lvl + 4);
    ctx.restore();
    ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, 10); ctx.stroke();
    for (let i = 1; i < n; i++) { const xx = -w / 2 + 4 + (w - 8) * i / n; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xx, -h / 2 + 4); ctx.lineTo(xx, h / 2 - 4); ctx.stroke(); }
    // the beaver's nose on the front
    ctx.fillStyle = '#5a3420'; ctx.beginPath(); ctx.arc(w / 2 + 2, 0, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff6dc'; ctx.fillRect(w / 2 + 3, 2, 3, 5);
    ctx.restore();
  }
  function hud(st) {
    if (st.noHud) return;
    // ducks (top left)
    const tt = String(st.ducks);
    ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(tt).width + 52;
    pill(14, 46, tw, 30); hudDuck(34, 62, 1); text(tt, 52, 61.5, 15, C.paper, 'left', 'body');
    // the log's water level
    pill(14, 82, 96, 30); hudLog(58, 97, st);
    // Speed (bottom middle): a meter that fills with paired strokes
    const gx = W / 2, gy = H - 30;
    ctx.fillStyle = 'rgba(23,25,29,0.72)'; rr(gx - 90, gy - 16, 180, 32, 16); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(gx - 48, gy - 6, 96, 12, 6); ctx.fill();
    if (st.speed > 0.01) { ctx.fillStyle = st.speed > 0.66 ? '#ffffff' : '#9ae6ff'; rr(gx - 48, gy - 6, 96 * st.speed, 12, 6); ctx.fill(); }
    text('SPEED', gx, gy - 21, 9, 'rgba(255,255,255,0.7)', 'center', 'body');
    // each rider's paddle side: an icon in their colour by their corner of the meter (Pip left, Bo right)
    for (const k of [0, 1]) {
      const x = k === 0 ? gx - 70 : gx + 70, on = st.pull[k] >= 0, dr = st.drag[k], br = st.brace[k];
      ctx.save(); ctx.translate(x, gy); ctx.rotate((k === 0 ? -1 : 1) * (on ? 0.9 : dr ? -0.3 : 0.35));
      ctx.strokeStyle = '#d8b88a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, 7); ctx.stroke();
      ctx.fillStyle = PCOL[k]; ctx.beginPath(); ctx.ellipse(0, 9, 4.5, 6.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (br) { ctx.fillStyle = '#ffd24a'; circle(x, gy - 15, 3.5); ctx.fill(); }
    }
    // the gold help banner
    if (st.t - st.goldMsgT < 4) {
      const a = Math.min(1, (4 - (st.t - st.goldMsgT)) * 2);
      ctx.save(); ctx.globalAlpha = a; ctx.font = '700 18px "Atkinson Hyperlegible", system-ui, sans-serif';
      const m = 'The bucket robot is bailing for you', mw = ctx.measureText(m).width + 40;
      ctx.fillStyle = 'rgba(120,84,10,0.92)'; rr(W / 2 - mw / 2, 120, mw, 36, 18); ctx.fill(); ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.stroke();
      text(m, W / 2, 138.5, 18, '#ffe9a8', 'center', 'body'); ctx.restore();
    }
  }
  CO.hud = hud;
  return CO;
})();

/* ---------- MODES.parkflume ---------- */
MODES.parkflume = {
  medals: { bronze: 'Reach the dock', goals: [{ key: 'ducks', gold: 0.8, silver: 0.5, more: true, pct: true, word: 'the ducks' }, { key: 'soaks', gold: 3, silver: 8, word: 'soak' }] },
  medalValues() { const st = G.mst; return { ducks: Math.min(1, st.ducks / PARKFLUME.ducksMax()), soaks: st.soaks }; },
  scene3dOpts: { bg: '#0d0d24', fov: 54, near: 0.2, far: 1600 },
  setup(st) { PARKFLUME.fresh(st); for (const p of G.players) p.alive = true; },
  step(dt) { PARKFLUME.step(G.mst, dt); },
  hud() { PARKFLUME.hud(G.mst); },
  // the 3D scenery, log and camera (js/levels/world42/parkflume-scenery.js, loaded with the 3D kit)
  scene3d(K) { if (typeof PARKFLUME_SCENE !== 'undefined') PARKFLUME_SCENE.build(K, G.mst); },
  draw3d(K, dt) { if (typeof PARKFLUME_SCENE !== 'undefined') PARKFLUME_SCENE.update(K, G.mst, dt); },
  drawTop() { if (typeof PARKFLUME_SCENE !== 'undefined') PARKFLUME_SCENE.drawTop(G.mst); },
  resultTitle() { return 'Splashdown at the dock!'; },
  stats() {
    const st = G.mst, names = PARKFLUME.partNames;
    const out = [
      { label: 'Ducks', value: st.ducks + ' of ' + PARKFLUME.ducksMax() },
      { label: 'Soaks', value: String(st.soaks) },
      { label: 'Sinkings', value: String(st.sinkings) },
      { label: 'Strokes together', value: String(st.pairs) },
    ];
    let worst = -1, wn = 0; st.soakAt.forEach((n, k) => { if (n > wn) { wn = n; worst = k; } });
    out.push(worst >= 0 ? 'Most Soaks in ' + names[worst] + ' (' + wn + ').' : 'Not a single Soak. Dry as a bone!');
    if (st.plungeDry) out.push('Not a drop spilled on the big one.');
    if (st.goldN) out.push('Gold help: the bucket robot bailed for you.');
    return out;
  },
};

/* ---------- the 2D 'parkflume' outfit (previews, world page, ready card): the 3D one is parkflume-outfits.js ----------
   Dressed for a soaking, from the ride's gift shop. Pip: a bright yellow sou'wester (the sprout pokes through a hole in
   the crown) and a yellow rain cape; a green rubber-ring life belt over one shoulder. Bo: a green snorkel mask pushed
   up on the forehead with the snorkel by one ear, a purple and white striped swim ring round the middle, yellow water
   wings. (Pip no blue, Bo no orange or red; the eyes, sprout and ears stay clear.) */
defineOutfitPart('pfSouwester', { layer: 'head', lift: 5, draw(c) {
  const g = c.g, ink = OF_INK;
  // the brim: wide, longer at the back, tipped down
  g.beginPath(); g.ellipse(0, -23.5, 14, 3.4, 0, 0, Math.PI * 2); ofFillStroke(g, '#ffd23a', ink, 1.3);
  g.beginPath(); g.moveTo(-9.5, -23.5); g.bezierCurveTo(-10, -33, 10, -33, 9.5, -23.5); g.closePath(); ofFillStroke(g, '#ffdc4a', ink, 1.3);
  g.strokeStyle = 'rgba(160,110,10,0.6)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-8, -27); g.quadraticCurveTo(0, -29, 8, -27); g.stroke();
  // a drip off the brim
  g.fillStyle = '#9ae6ff'; g.beginPath(); g.ellipse(12.6, -20.5 + ((c.t * 3) % 1) * 4, 0.9, 1.4, 0, 0, Math.PI * 2); g.fill();
} });
defineOutfitPart('pfRainCape', { layer: 'back', draw(c) {
  const g = c.g, ink = OF_INK, fl = Math.sin(c.t * 6) * 1.2;
  g.beginPath(); g.moveTo(-10, -18); g.lineTo(10, -18); g.lineTo(12 + fl, -2); g.quadraticCurveTo(0, 1, -12 - fl, -2); g.closePath(); ofFillStroke(g, '#ffd23a', ink, 1.2);
} });
defineOutfitPart('pfLifeRing', { layer: 'body', draw(c) {
  const g = c.g, ink = OF_INK;
  g.save(); g.translate(6, -10); g.rotate(-0.6);
  g.beginPath(); g.ellipse(0, 0, 5, 3.4, 0, 0, Math.PI * 2); g.lineWidth = 3; g.strokeStyle = '#3fae5a'; g.stroke();
  g.lineWidth = 0.8; g.strokeStyle = ink; g.beginPath(); g.ellipse(0, 0, 6.5, 4.9, 0, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#f4f0e8'; g.lineWidth = 3; for (const a of [0.6, 2.2, 3.8, 5.3]) { g.beginPath(); g.ellipse(0, 0, 5, 3.4, 0, a, a + 0.35); g.stroke(); }
  g.restore();
} });
defineOutfitPart('pfSnorkelMask', { layer: 'head', lift: 0, draw(c) {
  const g = c.g, ink = OF_INK;
  // the mask pushed up on the forehead (the eyes stay clear), the strap round, the snorkel up by the right ear
  g.fillStyle = '#2f9a5a'; g.fillRect(-11, -24.6, 22, 2.4);
  g.beginPath(); g.ellipse(0, -23.2, 7.6, 3.6, 0, 0, Math.PI * 2); ofFillStroke(g, '#3fc06a', ink, 1.2);
  g.beginPath(); g.ellipse(0, -23.4, 5.6, 2.3, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(200,240,255,0.85)'; g.fill(); g.strokeStyle = ink; g.lineWidth = 0.7; g.stroke();
  g.strokeStyle = ink; g.lineWidth = 3.2; g.beginPath(); g.moveTo(10, -20); g.lineTo(11.5, -32); g.stroke();
  g.strokeStyle = '#ffd23a'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(10, -20); g.lineTo(11.5, -32); g.stroke();
  g.fillStyle = '#3fc06a'; g.fillRect(10, -34, 3.4, 2.6);
} });
defineOutfitPart('pfSwimRing', { layer: 'body', draw(c) {
  const g = c.g, ink = OF_INK;
  g.beginPath(); g.ellipse(0, -6, 14, 4.4, 0, 0, Math.PI * 2); ofFillStroke(g, '#9a5cf0', ink, 1.3);
  g.save(); g.beginPath(); g.ellipse(0, -6, 14, 4.4, 0, 0, Math.PI * 2); g.clip();
  g.fillStyle = '#f4f0f8'; for (let x = -14; x < 14; x += 6) g.fillRect(x, -11, 3, 10);
  g.restore(); g.beginPath(); g.ellipse(0, -6, 14, 4.4, 0, 0, Math.PI * 2); g.strokeStyle = ink; g.lineWidth = 1.2; g.stroke();
} });
defineOutfitPart('pfWaterWings', { layer: 'front', draw(c) {
  const g = c.g, ink = OF_INK;
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 11.5, -11, 3, 3.6, 0, 0, Math.PI * 2); ofFillStroke(g, '#ffd23a', ink, 1); }
} });
defineOutfit('parkflume', { pip: [['pfRainCape', {}], ['pfLifeRing', {}], ['pfSouwester', {}]], bo: [['pfSwimRing', {}], ['pfWaterWings', {}], ['pfSnorkelMask', {}]] });

/* ---------- the level ---------- */
PARKFLUME.def = {
  name: 'Log Flume Plunge', world: 41, kind: 'team', mode: 'parkflume', outfit: 'parkflume', music: 'parkflume', amb: 'parkflume',
  view3d: true, ownStep: true, ownHUD: true, noFalls: true,
  legend: {
    pip: '<kbd>F</kbd> paddle <kbd>S</kbd> drag left <kbd>Space</kbd> hold on',
    bo: '<kbd>/</kbd> paddle <kbd>↓</kbd> drag right <kbd>Shift</kbd> hold on',
  },
  jobs: {
    left: { title: 'Left paddle', legend: '<kbd>F</kbd> paddle on the left <kbd>S</kbd> hold to drag left <kbd>Space</kbd> hold on (both)', act: 'paddle' },
    right: { title: 'Right paddle', legend: '<kbd>F</kbd> paddle on the right <kbd>S</kbd> hold to drag right <kbd>Space</kbd> hold on (both)', act: 'paddle' },
  },
  job: ['left', 'right'],
  tip: 'Paddle together to go straight. Paddle alone to turn.',
  howTo: ['Your stroke turns the log away from you.', 'Stroke together to go straight and fast.', 'Both hold jump to hold on for drops.'],
  act: { label: 'paddle', labels: ['paddle', 'paddle'] },
  map: Array.from({ length: 18 }, () => '.'.repeat(32)),
};
PARKFLUME.def.map[16] = '.'.repeat(10) + '1' + '.'.repeat(10) + '2' + '.'.repeat(10);
LEVELS.push(PARKFLUME.def);

// the 3D-only files: the water (a park kit addition), the riders' outfits, the log and the scenery
K3D.files.push('js/levels/world42/park-water.js', 'js/levels/world42/parkflume-outfits.js', 'js/levels/world42/parkflume-log.js', 'js/levels/world42/parkflume-scenery2.js', 'js/levels/world42/parkflume-scenery.js');

/* ---------- sounds (a wooden log on a night river: paddles, slaps, splashes, squeaky ducks) ---------- */
(function () {
  const X = Sfx.extra;
  X.parkflumeStroke = function (k) { this.noise(0.22, { type: 'bandpass', f: k ? 900 : 760, to: 300, q: 1.2, vol: 0.05, a: 0.02 }); this.tone(k ? 180 : 160, 0.12, 'sine', 0.025, 110, 0.04); };
  X.parkflumePair = function () { this.noise(0.3, { type: 'bandpass', f: 600, to: 200, q: 1, vol: 0.08, a: 0.01 }); this.tone(110, 0.22, 'sine', 0.07, 70, 0.02); this.tone(220, 0.08, 'triangle', 0.02, 160); };
  X.parkflumeDrag = function () { this.noise(0.6, { type: 'lowpass', f: 900, to: 400, vol: 0.035, a: 0.08 }); };
  X.parkflumeBump = function () { this.tone(140, 0.16, 'square', 0.035, 90); this.noise(0.2, { type: 'lowpass', f: 700, vol: 0.05 }); this.tone(60, 0.25, 'sine', 0.05, 45, 0.02); };
  X.parkflumeBrace = function () { this.tone(520, 0.06, 'triangle', 0.025, 640); this.tone(780, 0.08, 'triangle', 0.02, 900, 0.05); };
  X.parkflumeDrop = function () { this.noise(0.5, { type: 'bandpass', f: 500, to: 1600, q: 0.7, vol: 0.05, a: 0.1 }); };
  X.parkflumeSplash = function () { this.noise(0.7, { type: 'lowpass', f: 2400, to: 500, vol: 0.12, a: 0.01 }); this.tone(90, 0.3, 'sine', 0.06, 50); };
  X.parkflumeSoak = function () { this.noise(0.6, { type: 'lowpass', f: 3000, to: 600, vol: 0.13, a: 0.005 }); this.tone(300, 0.3, 'triangle', 0.03, 140, 0.15); this.tone(520, 0.15, 'sine', 0.02, 340, 0.3); };
  X.parkflumeBail = function () { for (let k = 0; k < 3; k++) this.tone(900 - k * 120, 0.06, 'square', 0.012, 700, k * 0.08); this.noise(0.5, { type: 'bandpass', f: 1200, to: 400, q: 1, vol: 0.06, delay: 0.25 }); this.tone(1320, 0.2, 'triangle', 0.02, 1760, 0.6); };
  X.parkflumeSink = function () { for (let k = 0; k < 4; k++) this.tone(220 - k * 30, 0.14, 'sine', 0.05, 120 - k * 15, k * 0.22); this.noise(0.9, { type: 'lowpass', f: 800, to: 200, vol: 0.06 }); };
  X.parkflumeTug = function () { this.tone(330, 0.35, 'triangle', 0.04, 330); this.tone(247, 0.5, 'triangle', 0.04, 247, 0.35); for (let k = 0; k < 6; k++) this.tone(700 + (k % 2) * 200, 0.04, 'square', 0.01, null, 0.9 + k * 0.08); };
  X.parkflumeDuck = function () { this.tone(1400, 0.07, 'square', 0.015, 1900); this.tone(1900, 0.09, 'square', 0.012, 1300, 0.06); };
  X.parkflumeBigDuck = function () { this.tone(900, 0.12, 'square', 0.02, 1300); this.tone(1300, 0.16, 'square', 0.018, 800, 0.1); [1047, 1319, 1568].forEach((f, k) => this.tone(f, 0.18, 'triangle', 0.02, null, 0.25 + k * 0.08)); };
  X.parkflumeGate = function () { this.tone(200, 0.6, 'sawtooth', 0.012, 150); this.noise(0.5, { type: 'bandpass', f: 600, q: 3, vol: 0.02 }); };
  X.parkflumePlunge = function () { this.noise(2.4, { type: 'bandpass', f: 300, to: 2400, q: 0.6, vol: 0.09, a: 0.6 }); };
  X.parkflumeBigSplash = function () { this.noise(1.6, { type: 'lowpass', f: 3000, to: 300, vol: 0.18, a: 0.01 }); this.tone(60, 0.8, 'sine', 0.1, 35); };
  X.parkflumeFlash = function () { this.tone(4200, 0.03, 'square', 0.012, 2000); this.noise(0.25, { type: 'highpass', f: 5000, to: 2000, vol: 0.02, delay: 0.02 }); };
  X.parkflumeDock = function () { this.tone(120, 0.3, 'square', 0.04, 80); this.noise(0.3, { type: 'lowpass', f: 600, vol: 0.06 }); this.tone(660, 0.3, 'triangle', 0.02, 880, 0.3); };
  X.parkflumeTannoy = function () { [659, 523, 784].forEach((f, k) => { this.tone(f, 0.28, 'sine', 0.03, null, k * 0.26); this.tone(f * 2, 0.2, 'triangle', 0.006, null, k * 0.26); }); };
  X.parkflumeWheel = function () { this.noise(0.4, { type: 'bandpass', f: 400, q: 2, vol: 0.04 }); };
  X.parkflumeBelt = function () { this.tone(95, 0.07, 'square', 0.018, 70); this.noise(0.06, { type: 'bandpass', f: 1800, q: 4, vol: 0.02 }); };
  X.parkflumeWhirl = function () { this.noise(2.0, { type: 'bandpass', f: 300, to: 700, q: 2, vol: 0.05, a: 0.5 }); };
  X.parkflumeHippo = function () { this.tone(70, 0.7, 'sawtooth', 0.04, 50, 0, 0.3); this.noise(0.5, { type: 'lowpass', f: 400, vol: 0.04, delay: 0.2 }); };
  X.parkflumeElephant = function () { this.tone(330, 0.5, 'sawtooth', 0.03, 520); this.tone(520, 0.4, 'sawtooth', 0.025, 260, 0.45); };
  X.parkflumeCroc = function () { this.tone(180, 0.05, 'square', 0.05, 90); this.tone(160, 0.05, 'square', 0.05, 80, 0.08); };
  X.parkflumeCoconut = function () { this.tone(500, 0.06, 'triangle', 0.03, 300); this.noise(0.25, { type: 'lowpass', f: 1600, vol: 0.05, delay: 0.05 }); };
  X.parkflumeSaw = function () { this.tone(1200, 0.5, 'sawtooth', 0.012, 1500, 0, 0.1); this.noise(0.4, { type: 'highpass', f: 3000, vol: 0.015 }); };
  X.parkflumeChute = function () { this.tone(140, 0.4, 'triangle', 0.03, 60); this.noise(0.6, { type: 'lowpass', f: 1200, to: 300, vol: 0.08, delay: 0.35 }); };
  X.parkflumeSteam = function () { this.noise(0.9, { type: 'highpass', f: 2500, to: 1200, vol: 0.05, a: 0.03 }); };
})();
