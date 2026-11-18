/* Pip & Bo - Level 42-4 Go-Kart Grand Prix (versus, World 42 Midnight Theme Park, 3D). */
'use strict';

/* ===== 42-4 Go-Kart Grand Prix (mode 'parkkarts', versus, view3d, one continuous race) =====
   To finish the night, Pip and Bo find the park's go-kart track with the engines already idling, and for once they are
   not on the same side. The wind-up robots have moved the barriers, so the circuit runs out of its fence and round the
   whole park (PARKKARTS_TRACK). Pip's kart is orange, number 1; Bo's is blue, number 2.

   Both karts are on one screen. The camera sits behind the pair, leaning toward the leader. SCORING BY BREAKING AWAY:
   when the leader is S.LIMIT units of road ahead, the chaser has reached the bottom edge of the picture (the red danger
   band, a quickening beep); still there after S.DANGER_T s and the leader TAKES A FLAG. THE LONG STOP: if nobody breaks
   away, each time the pair has done a full lap since the last flag (or the start), the kart in front at the gantry
   takes a flag. FIRST TO THREE FLAGS WINS (best of five, as the game's other versus levels).
   After a flag there is no card: the crane robot lifts the chaser (S.CRANE_T s) and sets it down level with the
   leader, the inside line alternating; both are held side by side at S.ROLL_V for "Three, two, one, go!" (S.ROLL_T s,
   steering allowed) and let go. The road is cleared of prizes; prizes held are kept. After the winning flag both
   karts coast to a stop (the winner spins a doughnut, the loser's bumper falls off), then the versus results card.

   Driving is PARKKARTS_KART (parkkarts-kart.js), prizes PARKKARTS_PRIZES (parkkarts-prizes.js). Six wind-up robot
   karts lap at S.ROBOT_K of top speed as traffic: they hold their line, never score and never use prizes.
   G.match runs the start (the framework's 3-2-1) and the end (matchRoundEnd on the winning flag); the flags between
   are counted here, straight into G.match.wins, with no round banner.
   State lives in G.mst; the rules never read the renderer (K3D.noRender plays the same). Names are prefixed parkkarts. */

const PARKKARTS = (function () {
  const TR = PARKKARTS_TRACK, KK = PARKKARTS_KART, PZ = PARKKARTS_PRIZES;
  const S = {
    LIMIT: 26, DANGER_T: 1.5, WARN: 0.82, CRANE_T: 1.3, ROLL_T: 2.6, ROLL_V: 9, LANE: 1.5,
    LAP_FLAG: 0.7, ROBOTS: 6, ROBOT_K: 0.75, FINISH_T: 4.2, NEED: 3,
  };
  const CO = { S };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sgn = x => (x > 0 ? 1 : x < 0 ? -1 : 0);

  /* ---------- what each driver presses ---------- */
  CO.input = function (p) {
    const i = p.input || {};
    let steer = Math.abs(i.ax || 0) > 0.12 ? clamp(i.ax, -1, 1) : (i.right ? 1 : 0) - (i.left ? 1 : 0);
    return { steer, brake: !!(i.down || (i.ay || 0) > 0.55), drift: !!i.jump };
  };
  CO.anyPress = p => { const i = p.input || {}; return !!(i.left || i.right || i.down || i.jump || i.act || i.up || Math.abs(i.ax || 0) > 0.3 || Math.abs(i.ay || 0) > 0.5); };

  function fresh(st) {
    let seed = (Math.floor(Math.random() * 2147483646) + 1) | 0;
    st.rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    Object.assign(st, {
      phase: 'grid', t: 0, phaseT: 0, raceT: 0,
      karts: [KK.make(0, TR.GRID, -S.LANE), KK.make(1, TR.GRID, S.LANE)],
      robots: [], flags: [0, 0], log: [], dangerT: 0, warnT: 0, lead: 0, gap: 0, nextLapAt: TR.L, lapsDone: 0,
      says: [], fx: [], winner: -1, frontT: [0, 0], inside: 0, decider: '', restartN: 0, roll: null, finish: null,
    });
    PZ.fresh(st);
    // the robots: spread round the lap ahead of the grid, each holding its own lane
    for (let i = 0; i < S.ROBOTS; i++) {
      const s = TR.wrap(TR.GRID + 60 + i * (TR.L - 120) / S.ROBOTS), lane = [-2.4, 1.6, -0.6, 2.6, -1.8, 0.8][i];
      const r = { id: 2 + i, robot: i, s, lat: lane, lane, nudge: 0, v: KK.S.VMAX * S.ROBOT_K, heavy: 3, fixed: true, r: 0.8, x: 0, z: 0, yaw: 0, px: 0, pz: 0 };
      placeRobot(r); st.robots.push(r);
    }
    for (const k of st.karts) { k.lap = 0; k.prog = k.s; }
  }
  function placeRobot(r) { const f = TR.at(r.s), l = r.lat + r.nudge; r.x = f.x + f.rx * l; r.z = f.z + f.rz * l; r.yaw = f.yaw; }

  const say = (st, text) => { st.says.push({ text, t: st.t }); Sfx.play('parkkartsTannoy'); };
  CO.say = say;
  const placeOf = st => k => (k.id === st.lead ? 0 : 1);

  /* ---------- flags ---------- */
  function award(st, w, how) {
    const k = st.karts[w], o = st.karts[1 - w], part = TR.PARTS[TR.partAt(k.s)];
    st.flags[w]++;
    const line = how === 'line' ? NAMES[w] + ' was in front at the line' : NAMES[w] + ' broke away ' + PLACE_WORDS[TR.partAt(k.s)];
    st.log.push({ w, how, part, t: st.t, line, gap: +(k.prog - o.prog).toFixed(1) });
    st.fx.push({ k: 'flag', t: st.t, who: w, how });
    Sfx.play('parkkartsFlag');
    const m = G.match;
    if (st.flags[w] >= S.NEED) {
      st.winner = w; st.decider = line;
      st.phase = 'finish'; st.phaseT = 0;
      for (const kk of st.karts) { kk.drift = 0; kk.spark = 0; }
      say(st, 'Number ' + (w + 1) + ' wins the Grand Prix!');
      Sfx.play('parkkartsWin');
      return;
    }
    if (m) { m.wins[w]++; m.history.push({ round: m.round, winner: w, reason: line + '!', tiebreak: false, secs: Math.round(st.raceT * 10) / 10 }); m.round++; }
    if (st.flags[0] === S.NEED - 1 && st.flags[1] === S.NEED - 1) say(st, 'Two flags each. Next flag wins!');
    else say(st, 'Number ' + (w + 1) + ' takes a flag!');
    // the rolling restart: the crane lifts the other kart and sets it down level; the road is cleared
    st.phase = 'crane'; st.phaseT = 0; st.dangerT = 0;
    PZ.clear(st);
    o.crane = { t: 0, why: 'flag', x: o.x, z: o.z, yaw: o.yaw }; o.drift = 0; o.spark = 0; o.v = 0;
    if (k.crane) k.crane = null;
    lockOn(k);
    st.restartN++;
    st.nextLapAt = Math.ceil((k.prog + S.LAP_FLAG * TR.L) / TR.L) * TR.L;
  }
  const PLACE_WORDS = ['on the kart track', 'on the Midway', 'under the Comet', 'in the funhouse', 'on the pier', 'on Spook Manor Lane'];

  /* ---------- side by side (the crane and the rolling restart) ---------- */
  function lockOn(k) { k.lock = { v: k.v }; k.drift = 0; k.spark = 0; k.px = k.pz = 0; }
  function lockStep(k, inp, v, dt, slot) {
    const f = TR.at(k.s);
    k.lock.v = v;
    k.v = v;
    const lim = f.hw - 1.0;
    if (slot != null) k.lat += clamp(slot - k.lat, -dt * 3, dt * 3);
    else k.lat = clamp(k.lat + inp.steer * 3.2 * dt, -lim, lim);
    const s = TR.wrap(k.s + v * dt);
    const g = TR.at(s);
    k.x = g.x + g.rx * k.lat; k.z = g.z + g.rz * k.lat;
    k.yaw = g.yaw + (slot != null ? 0 : -inp.steer * 0.12);
    k.on = -1; k.verge = false;
    KK.track(k, s);
    k.steer = inp.steer;
  }
  // the inside of the next bend (for the grid and every restart), alternating who gets it
  function insideSign(s) { let tot = 0; for (let d = 0; d < 60; d += 2) tot += TR.at(s + d).turn; return tot >= 0 ? -1 : 1; } // + turn is left: inside is left (-lat)

  /* ---------- one step ---------- */
  function step(st, dt) {
    const ps = G.players, ks = st.karts;
    st.t += dt; st.phaseT += dt;
    while (st.fx.length && st.t - st.fx[0].t > 4) st.fx.shift();
    while (st.says.length > 4) st.says.shift();
    const inp = ps.map(p => CO.input(p));
    K3D.heading = TR.at((ks[0].s + ks[1].s) / 2).yaw + Math.PI;
    for (const k of ks) PZ.kart(st, k, dt);
    // robots go round
    for (const r of st.robots) {
      r.nudge *= Math.exp(-1.2 * dt);
      r.s = TR.wrap(r.s + r.v * dt); placeRobot(r);
    }
    if (st.phase === 'finish') return finish(st, dt, inp);
    if (st.phase === 'crane' || st.phase === 'roll') return restart(st, dt, inp);
    st.raceT += dt;
    // driving
    for (const p of ps) {
      const k = ks[p.id];
      if (k.crane) { craneStep(st, k, dt); p.pendingAct = false; continue; }
      if (p.pendingAct) { p.pendingAct = false; PZ.use(st, k, ks[1 - k.id]); }
      const d = PZ.drive(k);
      // the magnet: a pull toward the kart ahead
      if (k.magT > 0) { const o = ks[1 - k.id], dx = o.x - k.x, dz = o.z - k.z, l = Math.hypot(dx, dz) || 1; k.px += dx / l * PZ.S.MAG_PULL * dt; k.pz += dz / l * PZ.S.MAG_PULL * dt; }
      KK.step(k, inp[p.id], dt, d);
    }
    // bumps: kart with kart, karts with robots
    if (!ks[0].crane && !ks[1].crane) {
      const rel = KK.bump(ks[0], ks[1], { ringA: ks[0].ringT > 0, ringB: ks[1].ringT > 0 });
      if (rel) { if (!st.bumpT || st.t - st.bumpT > 0.3) { st.bumpT = st.t; st.fx.push({ k: 'bump', t: st.t, rel }); Sfx.play('parkkartsBump'); } for (const k of ks) KK.contain(k); }
    }
    for (const k of ks) if (!k.crane) for (const r of st.robots) {
      const rel = KK.bump(k, r);
      if (rel) { r.nudge += 0; KK.contain(k); if (!k.robotT || st.t - k.robotT > 0.4) { k.robotT = st.t; Sfx.play('parkkartsBump'); } }
    }
    // slipstream: close behind any kart (or robot) in its line
    const all = ks.concat(st.robots);
    for (const k of ks) {
      if (k.crane) continue;
      let behind = false;
      for (const o of all) {
        if (o === k || o.crane) continue;
        const ds = PZ.sd(o.s, k.s);
        if (ds > 1.2 && ds < KK.S.SLIP_D && Math.abs((o.lat + (o.nudge || 0)) - k.lat) < KK.S.SLIP_W) { behind = true; break; }
      }
      k.slipping = behind;
      k.slipC = behind ? k.slipC + dt : Math.max(0, k.slipC - dt * 2);
      if (k.slipC >= KK.S.SLIP_T) { if (k.slipOn <= 0) { k.slips = (k.slips || 0) + 1; st.fx.push({ k: 'slip', t: st.t, who: k.id }); } k.slipOn = KK.S.SLIP_HOLD; }
      else k.slipOn = Math.max(0, k.slipOn - dt);
    }
    // prizes on the road and in the boxes
    st.lead = ks[0].prog >= ks[1].prog ? 0 : 1;
    st.gap = Math.abs(ks[0].prog - ks[1].prog);
    PZ.boxes(st, dt, ks, placeOf(st), st.gap);
    PZ.items(st, dt, ks, st.robots);
    st.frontT[st.lead] += dt;
    // the loudspeaker's places
    for (const sy of TR.say) { const a = ks[st.lead].prog - dt * ks[st.lead].v, b = ks[st.lead].prog; const at = Math.floor(b / TR.L) * TR.L + sy.s; if (a < at && b >= at) say(st, sy.text); }
    // breaking away: the chaser in the danger band for long enough
    const L = ks[st.lead], C = ks[1 - st.lead];
    if (st.gap >= S.LIMIT) {
      if (st.dangerT === 0) st.fx.push({ k: 'danger', t: st.t, who: C.id });
      st.dangerT += dt;
      if (st.dangerT >= S.DANGER_T) return award(st, st.lead, 'breakaway');
    } else st.dangerT = 0;
    // the long stop: a full lap since the last flag, and the kart in front at the gantry takes it
    if (L.prog >= st.nextLapAt) { st.lapsDone++; return award(st, st.lead, 'line'); }
    void C;
  }
  // a kart the crane has (stuck, turned round): lifted, then set on the road ahead, facing the right way
  function craneStep(st, k, dt) {
    k.crane.t += dt;
    if (k.crane.t >= KK.S.CRANE_T) {
      // the put-back spot: a little ahead, in the middle half of the road, clear of the other kart and the robots
      let s = TR.wrap(k.s + 2), lat = clamp(k.lat, -2, 2);
      const o = st.karts[1 - k.id];
      if (Math.abs(PZ.sd(o.s, s)) < 2.5 && Math.abs(o.lat - lat) < 1.8) lat = o.lat > 0 ? lat - 2 : lat + 2;
      KK.craneEnd(k, s, lat);
      for (const r of st.robots) if (Math.abs(PZ.sd(r.s, k.s)) < 4) { r.s = TR.wrap(r.s + 8); placeRobot(r); }
      st.fx.push({ k: 'crane', t: st.t, who: k.id });
    }
  }
  function restart(st, dt, inp) {
    const ks = st.karts, w = st.lead, L = ks[w], C = ks[1 - w];
    for (const p of G.players) { if (p.pendingAct) { p.pendingAct = false; PZ.use(st, ks[p.id], ks[1 - p.id]); } }
    if (st.phase === 'crane') {
      // the leader rolls on, easing to the restart speed and over to its slot; the chaser hangs from the crane
      const v = S.ROLL_V + (L.lock.v - S.ROLL_V) * Math.max(0, 1 - st.phaseT / S.CRANE_T);
      if (!st.roll) { const ins = insideSign(L.s + 20), chaserInside = st.restartN % 2 === 1; st.roll = { slots: [0, 0] }; st.roll.slots[C.id] = (chaserInside ? ins : -ins) * S.LANE; st.roll.slots[w] = -st.roll.slots[C.id]; }
      lockStep(L, inp[w], v, dt, st.roll.slots[w]);
      C.crane.t += dt;
      if (st.phaseT >= S.CRANE_T) {
        // set down level with the leader
        C.crane = null;
        KK.place(C, L.s, st.roll.slots[C.id], S.ROLL_V);
        C.lap = L.lap; C.s = L.s; C.prog = L.prog;
        lockOn(C);
        for (const r of st.robots) if (Math.abs(PZ.sd(r.s, L.s)) < 14) { r.s = TR.wrap(L.s + 24 + r.robot * 3); placeRobot(r); }
        st.phase = 'roll'; st.phaseT = 0;
        st.fx.push({ k: 'drop', t: st.t, who: C.id });
        Sfx.play('parkkartsCrane');
      }
      return;
    }
    // 'roll': side by side for the count, steering allowed
    const n = 3 - Math.floor(st.phaseT / (S.ROLL_T / 3.4));
    if (n !== st.roll.n) { st.roll.n = n; if (n >= 1 && n <= 3) Sfx.play('parkkartsCount'); }
    for (const k of ks) lockStep(k, inp[k.id], S.ROLL_V, dt, null);
    // never overlapping
    const d = ks[1].lat - ks[0].lat, minD = 1.7;
    if (Math.abs(d) < minD) { const push = (minD - Math.abs(d)) / 2 * (d >= 0 ? 1 : -1); ks[0].lat -= push; ks[1].lat += push; }
    if (st.phaseT >= S.ROLL_T) {
      st.phase = 'race'; st.phaseT = 0; st.roll = null;
      for (const k of ks) { k.lock = null; k.v = S.ROLL_V; k.stuckT = 0; k.wrongT = 0; }
      Sfx.play('parkkartsGo');
      st.fx.push({ k: 'go', t: st.t });
    }
  }
  function finish(st, dt, inp) {
    // both coast to a stop: the winner spins a doughnut, the loser's kart backfires and its bumper falls off
    const ks = st.karts;
    for (const k of ks) {
      if (k.crane) { k.crane.t += dt; if (k.crane.t >= KK.S.CRANE_T) KK.craneEnd(k, TR.wrap(k.s + 2), 0); continue; }
      if (k.lock) k.lock = null;
      const win = k.id === st.winner;
      k.v = Math.max(0, k.v - dt * (win ? 4 : 6));
      if (win && st.phaseT > 1.6) { k.yaw += dt * 5.5; k.v = Math.max(k.v, 3); }
      const nx = Math.sin(k.yaw), nz = Math.cos(k.yaw);
      k.x += nx * k.v * dt; k.z += nz * k.v * dt;
      KK.contain(k);
    }
    if (!st.backfired && st.phaseT > 1.2) { st.backfired = true; st.fx.push({ k: 'backfire', t: st.t, who: 1 - st.winner }); Sfx.play('parkkartsBackfire'); }
    if (st.phaseT >= S.FINISH_T && st.phase === 'finish') { st.phase = 'done'; matchRoundEnd(st.winner, st.decider + '!'); }
  }
  // the start: the grid, engines revving, until the framework's "GO!"
  function idle(st, dt) {
    st.t += dt; st.phaseT += dt;
    for (const r of st.robots) { r.s = TR.wrap(r.s + r.v * dt); placeRobot(r); }
    // jump skips the opening sweep (the name tags)
    if (G.introT > 0 && st.phaseT > 0.5 && G.players.some(p => p.input && p.input.jump)) G.introT = 0;
  }
  function go(st) {
    st.phase = 'race'; st.phaseT = 0;
    for (const k of st.karts) { k.v = 3; }
    say(st, "And they're off!");
    Sfx.play('parkkartsGo');
  }

  CO.fresh = fresh; CO.step = step; CO.idle = idle; CO.go = go; CO.award = award;
  return CO;
})();

/* ---------- MODES.parkkarts ---------- */
MODES.parkkarts = {
  scene3dOpts: { bg: '#0d0d24', fov: 52, near: 0.2, far: 1600 },
  setup(st) { PARKKARTS.fresh(st); for (const p of G.players) p.alive = true; },
  resetRound() {},
  idle(dt) { PARKKARTS.idle(G.mst, dt); },
  go() { PARKKARTS.go(G.mst); },
  step(dt) { PARKKARTS.step(G.mst, dt); },
  hud() { PARKKARTS_HUD.hud(G.mst); },
  scene3d(K) { if (typeof PARKKARTS_SCENE !== 'undefined') PARKKARTS_SCENE.build(K, G.mst); },
  draw3d(K, dt) { if (typeof PARKKARTS_SCENE !== 'undefined') PARKKARTS_SCENE.update(K, G.mst, dt); },
  drawTop() { if (typeof PARKKARTS_SCENE !== 'undefined') PARKKARTS_SCENE.drawTop(G.mst); PARKKARTS_HUD.top(G.mst); },
  resultTitle() { const st = G.mst; return st.winner >= 0 ? NAMES[st.winner] + ' wins the Grand Prix!' : 'The Grand Prix'; },
  stats() {
    const st = G.mst, k = st.karts;
    const out = [
      { label: 'Flags', values: st.flags.map(String) },
      { label: 'Best drift boost chain', values: k.map(x => String(x.bestChain)) },
      { label: 'Prizes used', values: k.map(x => String(x.used || 0)) },
      { label: 'Time in front', values: st.frontT.map(t => Math.round(t) + ' s') },
    ];
    if (st.decider) out.push('The deciding flag: ' + st.decider + '.');
    return out;
  },
};

/* ---------- the HUD: three flag slots each, the held prize, the gap bar, the danger band ---------- */
const PARKKARTS_HUD = (function () {
  const H2 = {};
  function flag(x, y, on, col, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#2a2235'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-7, 11); ctx.lineTo(-7, -11); ctx.stroke();
    ctx.globalAlpha = on ? 1 : 0.28;
    // a chequered flag
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { ctx.fillStyle = (r + c) % 2 ? '#1a1530' : '#f6f2e6'; ctx.fillRect(-6 + c * 4, -11 + r * 4, 4, 4); }
    ctx.strokeStyle = on ? col : 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.strokeRect(-6, -11, 16, 12);
    ctx.restore();
  }
  // a little prize icon
  H2.prizeIcon = function (n, x, y, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const ink = '#2a2235'; ctx.lineWidth = 1.6; ctx.strokeStyle = ink;
    if (n === 'popcorn') { ctx.fillStyle = '#f8f2e4'; ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(8, -4); ctx.lineTo(6, 10); ctx.lineTo(-6, 10); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#e0403a'; ctx.fillRect(-4, -3, 3, 12); ctx.fillRect(2, -3, 3, 12); ctx.fillStyle = '#fff6cf'; for (const [px, py] of [[-6, -6], [-2, -8], [2, -7], [6, -6], [0, -11]]) { ctx.beginPath(); ctx.arc(px, py, 3, 0, 7); ctx.fill(); ctx.stroke(); } }
    else if (n === 'floss') { ctx.strokeStyle = '#c9a06a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, 0); ctx.stroke(); ctx.fillStyle = '#ff9ad6'; for (const [px, py, r] of [[-4, -4, 6], [4, -5, 6], [0, -10, 6], [0, -2, 5]]) { ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill(); } }
    else if (n === 'balloons') { const cs = ['#5ac8ff', '#9aff8a', '#ffd24a']; cs.forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(-7 + i * 7, -2 + (i % 2) * 4, 5, 6, 0, 0, 7); ctx.fill(); ctx.stroke(); }); }
    else if (n === 'teddy') { ctx.fillStyle = '#c98a5a'; for (const [px, py, r] of [[-7, -9, 3.5], [7, -9, 3.5], [0, -3, 8], [0, 8, 7]]) { ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill(); ctx.stroke(); } ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(-3, -4, 1.3, 0, 7); ctx.arc(3, -4, 1.3, 0, 7); ctx.fill(); }
    else if (n === 'ring') { ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.stroke(); ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.stroke(); }
    else if (n === 'magnet') { ctx.strokeStyle = '#d83a4a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, -1, 7, Math.PI, 0); ctx.lineTo(7, 8); ctx.moveTo(-7, -1); ctx.lineTo(-7, 8); ctx.stroke(); ctx.fillStyle = '#e8e4f0'; ctx.fillRect(-10, 6, 6, 4); ctx.fillRect(4, 6, 6, 4); }
    else if (n === 'rocket') { ctx.fillStyle = '#7ae0ff'; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(5, -2); ctx.lineTo(5, 8); ctx.lineTo(-5, 8); ctx.lineTo(-5, -2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.moveTo(-3, 8); ctx.lineTo(0, 14); ctx.lineTo(3, 8); ctx.fill(); }
    ctx.restore();
  };
  H2.hud = function (st) {
    if (!st.karts) return;
    const big = typeof hudBig === 'function' && hudBig();
    // flags and prize: Pip under the level pill on the left, Bo on the right (clear of the top-right 50 px)
    for (const k of [0, 1]) {
      const left = k === 0, y = left ? 46 : 58, w = 158;
      const x0 = left ? 14 : W - 14 - w;
      ctx.fillStyle = 'rgba(23,25,29,0.72)'; rr(x0, y, w, 40, 20); ctx.fill();
      ctx.strokeStyle = PCOL[k]; ctx.lineWidth = 2; rr(x0, y, w, 40, 20); ctx.stroke();
      const nx = left ? x0 + 20 : x0 + w - 20;
      ctx.fillStyle = PCOL[k]; circle(nx, y + 20, 13); ctx.fill();
      text(String(k + 1), nx, y + 21, 15, '#fff', 'center');
      for (let i = 0; i < 3; i++) flag(left ? x0 + 46 + i * 24 : x0 + w - 46 - i * 24, y + 20, i < st.flags[k], PCOL[k]);
      // the held prize (or the wheel spinning)
      const kt = st.karts[k], px = left ? x0 + w + 24 : x0 - 24;
      if (kt.prize || kt.spinT > 0) {
        ctx.fillStyle = 'rgba(23,25,29,0.72)'; circle(px, y + 20, 19); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; circle(px, y + 20, 19); ctx.stroke();
        if (kt.spinT > 0) H2.prizeIcon(PARKKARTS_PRIZES.KINDS[Math.floor(st.t * 14) % 7], px, y + 20, 0.9);
        else { H2.prizeIcon(kt.prize, px, y + 20, 0.95); if (kt.charges > 1) text('x' + kt.charges, px + 15, y + 34, 12, '#fff', 'center'); }
      }
    }
    void big;
    // the gap bar: the two karts' icons, how close a breakaway is
    const gx = W / 2, gy = H - 30, bw = 200;
    ctx.fillStyle = 'rgba(23,25,29,0.72)'; rr(gx - bw / 2 - 30, gy - 16, bw + 60, 32, 16); ctx.fill();
    const f = Math.min(1, st.gap / PARKKARTS.S.LIMIT), lead = st.lead;
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(gx - bw / 2, gy - 4, bw, 8, 4); ctx.fill();
    const danger = f >= PARKKARTS.S.WARN;
    ctx.fillStyle = danger ? '#ff5a5a' : PCOL[lead]; rr(gx - bw / 2, gy - 4, Math.max(8, bw * f), 8, 4); ctx.fill();
    // the chaser's icon on the left end, the leader's at the gap
    const ic = (k, x) => { ctx.fillStyle = PCOL[k]; circle(x, gy, 10); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; circle(x, gy, 10); ctx.stroke(); text(String(k + 1), x, gy + 1, 12, '#fff', 'center'); };
    ic(1 - lead, gx - bw / 2 - 14); ic(lead, gx - bw / 2 + Math.max(8, bw * f));
    ctx.strokeStyle = 'rgba(255,90,90,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx + bw / 2, gy - 9); ctx.lineTo(gx + bw / 2, gy + 9); ctx.stroke();
  };
  // the danger band and the restart count (drawn over the picture)
  H2.top = function (st) {
    if (!st.karts) return;
    const f = st.gap / PARKKARTS.S.LIMIT;
    if (st.phase === 'race' && f >= PARKKARTS.S.WARN) {
      const a = Math.min(1, (f - PARKKARTS.S.WARN) / (1 - PARKKARTS.S.WARN)), pulse = st.dangerT > 0 ? 0.6 + 0.4 * Math.sin(st.t * (8 + st.dangerT * 10)) : 0.5;
      const g = ctx.createLinearGradient(0, H, 0, H - 110);
      g.addColorStop(0, `rgba(255,40,60,${0.55 * a * pulse + 0.15 * a})`); g.addColorStop(1, 'rgba(255,40,60,0)');
      ctx.fillStyle = g; ctx.fillRect(0, H - 110, W, 110);
      if (st.dangerT > 0) {
        const c = st.karts[1 - st.lead];
        ctx.save(); ctx.globalAlpha = pulse; text(NAMES[c.id] + ', catch up!', W / 2, H - 70, 24, '#ffd0d0', 'center'); ctx.restore();
      }
    }
    if (st.phase === 'roll' && st.roll) {
      const n = st.roll.n;
      text(n >= 1 ? String(n) : 'GO!', W / 2, H / 2 - 40, 64, n >= 1 ? '#fff6dc' : C.gold, 'center');
    }
  };
  return H2;
})();

/* ---------- the 2D 'parkkarts' outfit (previews, world page, ready card): the 3D one is parkkarts-outfits.js ----------
   Pip: a tan leather racing cap (the sprout through the top), brass goggles with green lenses pushed up on the brow, a
   long yellow and white chequered scarf streaming behind. Bo: a shiny purple open-face crash helmet with a white stripe
   and holes for the ears, a clear visor flipped up, a short green cape-scarf. (Pip no blue, Bo no orange or red.) */
defineOutfitPart('pkCap', { layer: 'head', lift: 5, draw(c) {
  const g = c.g, ink = OF_INK;
  g.beginPath(); g.moveTo(-11, -22); g.bezierCurveTo(-11.5, -32, 11.5, -32, 11, -22); g.closePath(); ofFillStroke(g, '#b8854e', ink, 1.3);
  g.strokeStyle = 'rgba(80,50,20,0.7)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(0, -29.5); g.lineTo(0, -22.5); g.moveTo(-6, -28.5); g.quadraticCurveTo(-7.5, -25, -7, -22.5); g.moveTo(6, -28.5); g.quadraticCurveTo(7.5, -25, 7, -22.5); g.stroke();
  // ear flaps
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 10.6, -19.5, 2.6, 4.2, 0, 0, Math.PI * 2); ofFillStroke(g, '#a4743f', ink, 1); }
} });
defineOutfitPart('pkGoggles', { layer: 'head', draw(c) {
  const g = c.g, ink = OF_INK;
  g.strokeStyle = '#5a3a1a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-11, -23.6); g.lineTo(11, -23.6); g.stroke();
  for (const x of [-4.6, 4.6]) { ofCircle(g, x, -24, 3.6); ofFillStroke(g, '#d9a94a', ink, 1.1); ofCircle(g, x, -24, 2.4); g.fillStyle = '#5fd07a'; g.fill(); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(x - 1.4, -25.4, 1.1, 1.1); }
} });
defineOutfitPart('pkScarf', { layer: 'back', draw(c) {
  const g = c.g, ink = OF_INK, t = c.t || 0, dir = -(c.face || 1);
  // wrapped round the neck, then a long tail streaming back
  g.save();
  const pts = []; for (let i = 0; i <= 8; i++) pts.push([dir * (6 + i * 3.2), -9.5 + Math.sin(t * 9 + i * 0.8) * (0.4 + i * 0.25) - i * 0.4]);
  for (let i = 0; i < 8; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; g.beginPath(); g.moveTo(x0, y0 - 2); g.lineTo(x1, y1 - 2); g.lineTo(x1, y1 + 2); g.lineTo(x0, y0 + 2); g.closePath(); g.fillStyle = i % 2 ? '#fff6dc' : '#f2c83a'; g.fill(); g.strokeStyle = ink; g.lineWidth = 0.7; g.stroke(); }
  g.restore();
} });
defineOutfitPart('pkScarfNeck', { layer: 'body', draw(c) {
  const g = c.g, ink = OF_INK;
  g.beginPath(); g.moveTo(-10, -11); g.quadraticCurveTo(0, -6.5, 10, -11); g.lineTo(10, -8); g.quadraticCurveTo(0, -3.5, -10, -8); g.closePath(); ofFillStroke(g, '#f2c83a', ink, 1);
  g.fillStyle = '#fff6dc'; for (let x = -8; x < 9; x += 4) g.fillRect(x, -9.6, 2, 2);
} });
defineOutfitPart('pkHelmet', { layer: 'head', earsOver: true, draw(c) {
  const g = c.g, ink = OF_INK;
  g.beginPath(); g.moveTo(-12, -16); g.bezierCurveTo(-13, -33, 13, -33, 12, -16); g.lineTo(9.5, -16); g.bezierCurveTo(9.5, -24, -9.5, -24, -9.5, -16); g.closePath(); ofFillStroke(g, '#8a4ad8', ink, 1.4);
  g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-2, -31.2); g.lineTo(2, -31.2); g.lineTo(2, -24); g.lineTo(-2, -24); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(-6, -27, 3, 1.4, -0.5, 0, Math.PI * 2); g.fill();
  // the visor flipped up over the top
  g.beginPath(); g.moveTo(-10, -27); g.quadraticCurveTo(0, -36, 10, -27); g.lineTo(9, -25.5); g.quadraticCurveTo(0, -33, -9, -25.5); g.closePath(); g.fillStyle = 'rgba(200,240,255,0.55)'; g.fill(); g.strokeStyle = ink; g.lineWidth = 0.9; g.stroke();
} });
defineOutfitPart('pkCape', { layer: 'back', draw(c) {
  const g = c.g, ink = OF_INK, t = c.t || 0, dir = -(c.face || 1);
  g.beginPath(); g.moveTo(-8, -11); g.quadraticCurveTo(dir * 14, -8 + Math.sin(t * 8) * 1.5, dir * 15, -1 + Math.sin(t * 8 + 1) * 1.5); g.lineTo(dir * 4, -2); g.lineTo(8, -11); g.closePath(); ofFillStroke(g, '#3faa5a', ink, 1.1);
} });
defineOutfit('parkkarts', { pip: [['pkScarf', {}], ['pkScarfNeck', {}], ['pkCap', {}], ['pkGoggles', {}]], bo: [['pkCape', {}], ['pkHelmet', {}]] });

/* ---------- the level ---------- */
PARKKARTS.def = {
  name: 'Go-Kart Grand Prix', world: 41, kind: 'versus', mode: 'parkkarts', outfit: 'parkkarts', music: 'parkmidnight', amb: 'parkmidnight',
  view3d: true, touch: 'stick', ownStep: true, ownHUD: true, ownMatchHUD: true, noFalls: true,
  match: { bestOf: 5, roundTime: 0 },
  legend: {
    pip: '<kbd>A</kbd><kbd>D</kbd> steer <kbd>Space</kbd> hold to drift <kbd>S</kbd> brake <kbd>F</kbd> use a prize',
    bo: '<kbd>←</kbd><kbd>→</kbd> steer <kbd>Shift</kbd> hold to drift <kbd>↓</kbd> brake <kbd>/</kbd> use a prize',
  },
  tip: 'Get far enough ahead to drop them off the screen. First to 3 flags.',
  howTo: ['Your kart drives by itself. You steer.', 'Hold jump in a corner to drift, let go to boost.', 'Leave them off the screen to take a flag.'],
  act: { label: 'prize', labels: ['prize', 'prize'] },
  map: Array.from({ length: 18 }, () => '.'.repeat(32)),
  sortLast: true,
};
PARKKARTS.def.map[16] = '.'.repeat(10) + '1' + '.'.repeat(10) + '2' + '.'.repeat(10);
LEVELS.push(PARKKARTS.def);

// the 3D-only files: the park kit (42-1's), the drivers' outfits, the kart models and the scenery
K3D.files.push('js/levels/world42/park-kit.js', 'js/levels/world42/parkkarts-outfits.js', 'js/levels/world42/parkkarts-kart3d.js', 'js/levels/world42/parkkarts-scenery.js', 'js/levels/world42/parkkarts-show.js');

/* ---------- sounds (rattling lawnmower engines, tyres on wet tarmac, a seaside fair at midnight) ---------- */
(function () {
  const X = Sfx.extra;
  X.parkkartsHop = function () { this.tone(260, 0.1, 'triangle', 0.03, 420); this.noise(0.08, { type: 'lowpass', f: 900, vol: 0.03, delay: 0.12 }); };
  X.parkkartsDrift = function () { this.noise(0.5, { type: 'bandpass', f: 1800, to: 1200, q: 3, vol: 0.025, a: 0.05 }); };
  X.parkkartsSparks = function (lvl) { for (let k = 0; k < 3; k++) this.tone(lvl > 1 ? 2600 : 1900, 0.04, 'square', 0.008, lvl > 1 ? 3400 : 2400, k * 0.05); };
  X.parkkartsBoost = function (lvl) { this.noise(0.6, { type: 'bandpass', f: 500, to: 2400, q: 0.8, vol: 0.06, a: 0.02 }); this.tone(lvl > 1 ? 220 : 180, 0.5, 'sawtooth', 0.02, lvl > 1 ? 520 : 400); };
  X.parkkartsPad = function () { [880, 1175, 1568].forEach((f, k) => this.tone(f, 0.08, 'triangle', 0.02, null, k * 0.04)); this.noise(0.4, { type: 'bandpass', f: 800, to: 2400, q: 1, vol: 0.04 }); };
  X.parkkartsBump = function () { this.tone(140, 0.12, 'square', 0.05, 80); this.noise(0.12, { type: 'lowpass', f: 1200, vol: 0.05 }); this.tone(600, 0.08, 'triangle', 0.015, 420, 0.03); };
  X.parkkartsTyres = function () { this.noise(0.25, { type: 'lowpass', f: 700, to: 300, vol: 0.06 }); this.tone(90, 0.18, 'sine', 0.05, 60); };
  X.parkkartsSlip = function () { this.noise(0.9, { type: 'bandpass', f: 600, to: 1400, q: 0.6, vol: 0.03, a: 0.3 }); };
  X.parkkartsBox = function () { this.tone(1320, 0.06, 'triangle', 0.02, 1760); this.noise(0.08, { type: 'highpass', f: 3000, vol: 0.015 }); };
  X.parkkartsWheel = function () { for (let k = 0; k < 8; k++) this.tone(1100 + (k % 2) * 300, 0.03, 'square', 0.008, null, k * 0.08); this.tone(1568, 0.2, 'triangle', 0.025, 2093, 0.68); };
  X.parkkartsPopcorn = function () { for (let k = 0; k < 9; k++) this.noise(0.03, { type: 'bandpass', f: 1800 + (k * 377) % 1400, q: 4, vol: 0.05, delay: k * 0.09 + (k % 3) * 0.02 }); };
  X.parkkartsFloss = function () { this.noise(0.7, { type: 'bandpass', f: 2600, to: 900, q: 0.8, vol: 0.03, a: 0.1 }); this.tone(880, 0.4, 'sine', 0.01, 660); };
  X.parkkartsBalloon = function () { this.tone(320, 0.18, 'sine', 0.03, 520); this.noise(0.12, { type: 'bandpass', f: 900, q: 2, vol: 0.02 }); };
  X.parkkartsSplat = function () { this.noise(0.35, { type: 'lowpass', f: 1600, to: 300, vol: 0.08 }); this.tone(180, 0.2, 'sine', 0.04, 90); };
  X.parkkartsTeddy = function () { this.tone(150, 0.3, 'sine', 0.06, 110); this.tone(300, 0.25, 'triangle', 0.02, 250, 0.08); this.noise(0.2, { type: 'lowpass', f: 500, vol: 0.04 }); };
  X.parkkartsRing = function () { this.tone(220, 0.5, 'sine', 0.04, 440); this.noise(0.5, { type: 'bandpass', f: 1200, q: 1, vol: 0.02, a: 0.1 }); };
  X.parkkartsMagnet = function () { this.tone(110, 0.8, 'sawtooth', 0.015, 140); this.tone(220, 0.8, 'sine', 0.02, 260); };
  X.parkkartsRocket = function () { this.noise(1.0, { type: 'bandpass', f: 1500, to: 4000, q: 1, vol: 0.05, a: 0.05 }); this.tone(500, 0.8, 'sawtooth', 0.01, 1600); };
  X.parkkartsWarn = function (n) { this.tone(n > 1 ? 1320 : 990, 0.07, 'square', 0.02); };
  X.parkkartsFlag = function () { [523, 659, 784, 1047].forEach((f, k) => { this.tone(f, 0.22, 'triangle', 0.04, null, k * 0.1); this.tone(f * 1.5, 0.16, 'square', 0.008, null, k * 0.1); }); this.noise(0.8, { type: 'highpass', f: 3000, vol: 0.02, delay: 0.3 }); };
  X.parkkartsCrane = function () { for (let k = 0; k < 5; k++) this.tone(600 + (k % 2) * 200, 0.05, 'square', 0.012, null, k * 0.07); this.tone(90, 0.8, 'sawtooth', 0.015, 120, 0.3); };
  X.parkkartsCount = function () { this.tone(660, 0.18, 'square', 0.03); };
  X.parkkartsGo = function () { this.tone(1320, 0.4, 'square', 0.035); this.tone(660, 0.4, 'triangle', 0.03); this.noise(0.5, { type: 'bandpass', f: 400, to: 1600, q: 0.8, vol: 0.04 }); };
  X.parkkartsSplash = function () { this.noise(0.9, { type: 'lowpass', f: 2400, to: 300, vol: 0.1 }); this.tone(120, 0.4, 'sine', 0.05, 60); };
  X.parkkartsBarrel = function () { this.noise(1.2, { type: 'bandpass', f: 300, q: 2, vol: 0.04, a: 0.2 }); };
  X.parkkartsCoaster = function () { this.noise(2.0, { type: 'lowpass', f: 500, to: 200, vol: 0.08, a: 0.5 }); for (let k = 0; k < 10; k++) this.tone(110, 0.04, 'square', 0.02, 80, 0.2 + k * 0.14); };
  X.parkkartsCrowd = function () { this.noise(1.2, { type: 'bandpass', f: 1100, q: 0.7, vol: 0.04, a: 0.25 }); };
  X.parkkartsWin = function () { [523, 659, 784, 1047, 1319].forEach((f, k) => this.tone(f, 0.35, 'triangle', 0.035, null, k * 0.12)); };
  X.parkkartsBackfire = function () { this.noise(0.18, { type: 'lowpass', f: 900, vol: 0.12 }); this.tone(70, 0.2, 'square', 0.06, 40); this.noise(0.15, { type: 'lowpass', f: 700, vol: 0.09, delay: 0.3 }); this.tone(1800, 0.15, 'triangle', 0.02, 900, 0.5); };
  X.parkkartsTannoy = function () { [659, 523, 784].forEach((f, k) => { this.tone(f, 0.26, 'sine', 0.03, null, k * 0.24); this.tone(f * 2, 0.2, 'triangle', 0.006, null, k * 0.24); }); };
  X.parkkartsEngine = function () { this.tone(90, 0.3, 'sawtooth', 0.02, 140); };
})();
