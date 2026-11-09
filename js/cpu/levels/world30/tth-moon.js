/* Pip & Bo - Computer partner: 30-1 The Time Thief, era 'moon' (Moon Landing, 1969). */
'use strict';

/* The lander has two jobs and the era hands them out (they swap at both beacons), so the brain plays whichever job
   its player has right now (S.ph.pilot) and never has to choose. It reads only what is on the screen: the lander's
   speed and place, the rocks' gaps and canyon passes that have scrolled into view (S.ph.gates: where the gap is and
   how wide), a geyser's state and rhythm, the beacon ring, the pad, the fuel gauges and the fuel cells.

   PILOT (tthMoonBrainPilot)
   - Speed: it keeps a target fall speed and burns (holds jump) when the lander falls faster than that, with a
     person's reaction time (0.13 s) and a little hysteresis, so it pulses the engine like a person. The target is
     the cruise speed in the open, slower through a gap, and "can still stop in time" before anything it must not
     pass yet: a gap it is not lined up with, a pass whose geyser is about to blow, the beacon ring (it creeps
     through at about 30 px/s so the ring fills) and the ground (it only goes down the last stretch when it is over
     the pad, not sliding and level; otherwise it hovers above).
   - Steering: toward the middle of the next gap once it is in view; before that, toward a fuel cell when the pods
     have room: it flies BESIDE the cell (an arm's length away, on the side it comes from) and slows down there so
     the engineer can grab. Side jets are tapped toward a wanted sideways speed (no frame-perfect braking).
   - It cannot burn without fuel in the ready tank: then it says "Pump, please!" and waits (it falls), so it never
     clears anything without the engineer. With nothing to grab and empty pods it asks for fuel cells.
   ENGINEER (tthMoonBrainEngineer)
   - Pump: one press when the ready tube has room for a whole stroke (never in the red top, so it does not spill),
     at most every 0.42 s: a steady human rhythm.
   - Arm: it swings toward the nearest fuel cell coming up (seen 0.14 s late) and presses when the cell lights up
     at the claw (0.12 s after it lights). With no cell around it parks the arm out to the side.
   - It tells the pilot which way the fuel is when the pods run low ("Fuel on the left!").
   ON FOOT: it moon-hops to its side of the flag and holds the action there; the flag only goes up when the person
   holds too, so it waits ("Plant it with me!").
   The core brain already stops everything while the person is away (info.away) and during cards and cutscenes. */
function tthMoonBrainPilot(bst, p, o, dt, info, S) {
  const K = TTHMOON, ph = S.ph, L = ph.L, out = {}, aNet = K.thrust - K.g;
  const stop = d => Math.sqrt(Math.max(0, 2 * aNet * 0.55 * d));   // a speed it can still brake from within d px
  const see = S.cam.y + H;                                           // the bottom edge of the screen
  let vt = K.bot.cruise, tx = L.x, hold = false;
  const g = tthMoonNextGate(ph), b = ph.beacons[ph.stretch], podRoom = 2 * K.pod.cap - tthMoonPods(ph);
  const beaconNext = b && !b.got && (!g || g.s !== ph.stretch);
  if (beaconNext) {
    // the ring: line up, come in slowly, creep through
    tx = b.x;
    const d = b.y - L.y;
    if (d > 0) vt = Math.min(vt, 28 + stop(d - 24));
    else vt = d > -40 ? 16 : -30;
    if (Math.abs(L.x - b.x) > 70 && d < 90) vt = Math.min(vt, d > 40 ? stop(d - 40) : -10);
  } else if (g && g.s === ph.stretch && g.top < see + 20) {
    // the next gap (or pass): line up before going in
    const slack = g.w / 2 - K.r - 10, off = L.x - g.x, d = g.top - (L.y + K.r) - 14, inside = L.y + K.r > g.top + 6;
    tx = g.x;
    let ok = Math.abs(off) < slack && Math.abs(off + L.vx * 0.35) < slack;
    if (ok && g.gey && !inside) ok = tthMoonBrainGeyOk(g, L);
    if (inside) { vt = Math.min(vt, K.bot.pass); if (Math.abs(off) > slack + 8) vt = Math.min(vt, 30); }
    else if (!ok) { vt = Math.min(vt, d > 0 ? stop(d) : -24); hold = true; }
    else vt = Math.min(vt, K.bot.pass + Math.max(0, d) * 0.25);
  } else if (!g && ph.stretch === 2) {
    // the landing: over the pad, level, slower and slower
    const pad = ph.pad, h = ph.ground - K.foot - L.y, lim = ph.land.gold >= 2 ? K.land.gold2V : ph.land.gold ? K.land.goldV : K.land.v;
    tx = pad.x;
    const over = Math.abs(L.x - pad.x) < pad.w / 2 - 44 && Math.abs(L.vx) < 34, level = Math.abs(tthMoonLean(ph)) < K.land.lean - 0.15 || ph.land.gold >= 2;
    vt = Math.min(vt, lim * 0.55 + stop(h) * 0.6);
    if (!(over && level) && h < 190) { vt = Math.min(vt, h > 130 ? stop(h - 130) : -18); hold = true; }
    if (!level && h < 260) tthBrainSay(bst, p, 'lean', 'Level the pods, please!', 9);
  }
  // a fuel cell worth a detour: in the open before the next gap, not too far sideways
  if (!beaconNext && podRoom > K.cell.fuel * 0.6 && (g || ph.ground - L.y > 420)) {
    let best = null, bd = 1e9;
    for (const c of ph.cells) {
      if (c.got || c.u < 1 || c.gold) continue;
      const dy = c.y - ph.pv.y, dx = c.x - L.x;
      if (dy < -30 || dy > 330 || c.y > see) continue;
      if (g && g.s === ph.stretch && c.y > g.top - 46) continue;
      const need = Math.abs(dx) - 78, time = Math.max(0.2, dy / Math.max(45, L.vy));
      if (need > 90 * time + 60) continue;
      if (dy < bd) { bd = dy; best = c; }
    }
    if (best && !hold) {
      const side = L.x <= best.x ? -1 : 1, wl = tthMoonWallAt(ph, 0, best.y), wr = tthMoonWallAt(ph, 1, best.y);
      tx = clamp(best.x + side * 76, Math.max(K.xMin, wl + K.r + 14), Math.min(K.xMax, wr - K.r - 14));
      const dy = best.y - ph.pv.y;
      if (dy < 150 && Math.abs(L.x - tx) < 60) vt = Math.min(vt, K.bot.cell);
      else if (dy < 150) vt = Math.min(vt, K.bot.cell * 0.6 + Math.max(0, dy - 30) * 0.5);
      bst.cell = best;
    }
  }
  // keep off the canyon walls
  const wl = tthMoonWallAt(ph, 0, L.y + 30), wr = tthMoonWallAt(ph, 1, L.y + 30);
  tx = clamp(tx, Math.max(K.xMin, wl + K.r + 12), Math.min(K.xMax, wr - K.r - 12));
  // side jets: toward a wanted sideways speed
  const wantVx = clamp((tx - L.x) * 1.9, -150, 150), dv = wantVx - L.vx;
  if (dv > 24) out.right = true; else if (dv < -24) out.left = true;
  // the engine, with a person's reaction time
  const raw = L.vy > vt + (bst.burn ? -7 : 5);
  bst.burn = tthBrainLate(bst, 'burn', raw, 0.13);
  if (bst.burn) out.jump = true;
  if (bst.burn && ph.F.ready <= 0) {
    if (tthMoonPods(ph) > 0.05) tthBrainSay(bst, p, 'pump', 'Pump, please!', 6);
    else tthBrainSay(bst, p, 'cells', 'We need a fuel cell!', 7);
  }
  return out;
}
// is it safe to drop through this pass now? (a person watches the geyser's rhythm: go right after it stops)
function tthMoonBrainGeyOk(g, L) {
  const K = TTHMOON, q = g.gey;
  const dist = g.y + K.gey.h / 2 + K.r - L.y, v = Math.max(L.vy, 30);
  // time to fall clear of the dust band from here (speeding up under gravity, capped by the brain's pass speed)
  const t = dist <= 0 ? 0 : Math.min(dist / v, (-v + Math.sqrt(v * v + 2 * K.g * dist)) / K.g) + 0.35;
  if (q.state === 'rest') return q.t + K.gey.warn > t;
  if (q.state === 'warn') return q.t > t;
  return q.state === 'off';
}
function tthMoonBrainEngineer(bst, p, o, dt, info, S) {
  const K = TTHMOON, ph = S.ph, F = ph.F, A = ph.arm, pv = ph.pv, out = {};
  const room = 2 * K.pod.cap - tthMoonPods(ph) > 0.6;
  // the arm: toward the nearest cell coming up
  let best = null, bd = 300;
  for (const c of ph.cells) {
    if (c.got || c.u < 0.6 || !(room || c.gold)) continue;
    const d = Math.hypot(c.x - pv.x, c.y - pv.y);
    if (c.y < pv.y - 120) continue;
    if (d < bd) { bd = d; best = c; }
  }
  let want = bst.park == null ? A.a : bst.park;
  if (best) { want = clamp(Math.atan2(best.x - pv.x, -(best.y - pv.y)), -K.arm.max, K.arm.max); bst.park = want > 0 ? 1.45 : -1.45; }
  const seen = cpuLag(bst, 'aim', want, 0.14), da = seen - A.a;
  if (da > 0.08) out.right = true; else if (da < -0.08) out.left = true;
  // one button: grab when a cell is at the claw, else pump when the tube has room for a whole stroke
  bst.cool = Math.max(0, (bst.cool || 0) - dt);
  const lit = ph.reachCell && tthMoonCanStow(ph, ph.reachCell);
  const litT = cpuFor(bst, 'lit', !!lit, dt);
  if (bst.cool <= 0) {
    if (lit) { if (litT > 0.12) { out.act = true; bst.cool = 0.3; } }
    else if (F.ready <= K.ready.cap - K.ready.stroke && tthMoonPods(ph) > 0.05 && F.strokeT <= 0) { out.act = true; bst.cool = 0.42; }
  }
  // tell the pilot where the fuel is when it runs low
  if (tthMoonFuel(ph) < 5 && best && !best.gold && bd > 150) tthBrainSay(bst, p, 'fuel', 'Fuel on the ' + (best.x < ph.L.x ? 'left' : 'right') + '! Fly close!', 8);
  else if (tthMoonFuel(ph) < 1 && !best) tthBrainSay(bst, p, 'dry', 'We need a fuel cell!', 8);
  else if (ph.L.vy > K.bumpV + 40 && F.ready > 1) tthBrainSay(bst, p, 'fast', 'Too fast! Burn!', 9);
  return out;
}
function tthMoonBrainFoot(bst, p, o, dt, info, S) {
  const K = TTHMOON.foot, ph = S.ph, f = ph.flag, out = {};
  if (ph.mode !== 'foot') return out;
  const tx = (f.state === 'down' ? f.x : ph.flagX) + (p.id ? 20 : -20), d = tx - cpuCx(p);
  if (Math.abs(d) > 10) { out.left = d < 0; out.right = d > 0; if (Math.abs(d) > 90 && p.grounded) out.jump = true; }   // (big moon hops on the way)
  if (f.state !== 'down') return out;
  if (Math.abs(cpuCx(p) - f.x) < K.plantR - 6) {
    out.act = true;
    if (!f.hold[o.id] && cpuFor(bst, 'alone', true, dt) > 2.5) tthBrainSay(bst, p, 'plant', 'Plant it with me!', 7);
  } else cpuFor(bst, 'alone', false, dt);
  return out;
}
TTH_BRAINS.moon = {
  reset(bst) { bst.burn = false; bst.cool = 0; bst.park = null; },
  think(bst, p, o, dt, info, S) {
    const ph = S.ph;
    if (!ph || !ph.L) return {};
    if (ph.mode === 'fly') return p.id === ph.pilot ? tthMoonBrainPilot(bst, p, o, dt, info, S) : tthMoonBrainEngineer(bst, p, o, dt, info, S);
    if (ph.mode === 'foot') return tthMoonBrainFoot(bst, p, o, dt, info, S);
    return {};
  },
  back(bst) { bst.burn = false; bst.cool = 0.3; },
};
