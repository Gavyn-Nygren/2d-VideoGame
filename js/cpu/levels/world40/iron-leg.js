/* Pip & Bo - Computer partner: 40-1 Part 2 'leg' (The Swinging Leg). World coords = the leg's frame (see the core). */
'use strict';

/* Follows ironLegPlan. Knows the stride clock: never starts a ramp it cannot finish before the plant (0.25 s to
   spare, ironLegRampOk) and never runs a plate whose vent puffs this swing. Braces a block until the climber is up,
   and as the climber waits for the brace (after 8 s with none it climbs in the upright phase, when the block is back
   at rest). Holds the knee lever until the partner is through. Hops over oil crows. */
IRON_BRAINS.leg = {
  reset(bst) { bst.noBrace = 0; },
  think(bst, p, o, dt, info, S) {
    const ph = S.ph, K = IRONLEG, out = {}, cx = cpuCx(p);
    if (!p.alive || S.haul && S.haul.who === p.id) return out;
    if (ph.ring.t >= 0) return out;
    const P = ironLegPlan(S)[p.id] || {};
    const g = p.ground, onPlate = p.grounded && g && g.kind === 'plate';
    // on a plate: keep going up while it can be run, else let it slide
    if (onPlate) {
      const pl = ph.plateList[g.plate], v = ph.vents.find(q => q.plate === g.plate);
      const due = v && (v.state !== 'idle' || ironLegVentSoon(S, pl));
      // only stepping across its foot (on the way to the start) while its vent is due: off it, back to the ledge
      if (due && !bst.running && p.y + p.h > pl.yb - 14) { ironBrainSeek(out, p, pl.x0 - 16, 3); return out; }
      if (!p.sliding) out.right = true; return out;
    }
    const w = P.why;
    if (w === 'ramp') {
      const pl = P.plate, at = pl.x0 - 20;
      const v = ph.vents.find(q => q.plate === pl.i);
      const ventDue = v && (v.state !== 'idle' || ironLegVentSoon(S, pl));
      if (p.grounded && ironLegRampOk(S, pl, cx) && !ventDue && cx < pl.x0 + 4) { out.right = true; bst.running = true; }
      else if (bst.running && !p.grounded) out.right = true;
      else { bst.running = false; ironLegNear(bst, out, p, at, 5); }
      return ironLegCpuCrow(bst, p, ph, out);
    }
    if (w === 'climb' || w === 'hop') return ironLegCpuClimb(bst, p, o, P, ph, out, dt);
    if (w === 'brace') {
      const b = ph.blocks.find(q => q.from === ph.ledgeOf[p.id]);
      if (b && cx < b.x + b.w + 4) { out.right = true; return ironBrainHop(bst, out, p); }   // over the block to its far side
      ironLegNear(bst, out, p, P.x, 4);
      // close: lean into its side and hold the action
      if (p.grounded && b && Math.abs(cx - P.x) < 22) { out.act = true; out.right = false; out.left = cx > b.x + b.w / 2; }
      return out;
    }
    if (w === 'drop') { ironLegNear(bst, out, p, P.x, 6); if (p.grounded && p.ground && p.ground.kind === 'ledge' && Math.abs(cx - P.x) < 12) { out.left = out.right = false; out.down = true; } return ironBrainHop(bst, out, p); }
    if (w === 'reach') { ironBrainSeek(out, p, P.x, 8); return ironBrainHop(bst, out, p); }
    if (w === 'hand') { ironLegNear(bst, out, p, P.x, 5); if (p.grounded && Math.abs(cx - P.x) < 14) { out.left = out.right = false; out.act = true; } return out; }
    if (w === 'ride' || w === 'press' || w === 'lift') return ironLegCpuPiston(bst, p, o, P, ph, out);
    if (w === 'lever') { ironLegNear(bst, out, p, P.x, 4); if (p.grounded && Math.abs(cx - P.x) < 16 && ironBrainTap(bst, 'lever', 0.4)) out.act = 'tap'; return ironBrainHop(bst, out, p); }
    if (w === 'knee') {
      if (ph.gateSolid.off && ph.theta > 0.2) out.left = true; else ironBrainSeek(out, p, P.x, 5);
      return ironLegCpuCrow(bst, p, ph, out);
    }
    if (w === 'gate') { ironLegNear(bst, out, p, P.x, 4); if (p.grounded && Math.abs(cx - P.x) < 16) out.act = true; return out; }
    if (w === 'through') { if (ph.gate.held >= 0 || ph.gateSolid.off) out.left = true; else ironBrainSeek(out, p, K.knee.gate + 30, 5); return out; }
    if (P.x != null) ironBrainSeek(out, p, P.x, 6);
    return ironLegCpuCrow(bst, p, ph, ironBrainHop(bst, out, p));
  },
};
// seek a spot that needs standing still at it (a lever, a brace, a hand): far off, walk; close, short steps (a
// partner who reacts late then creeps in instead of swinging past it)
function ironLegNear(bst, out, p, x, dead) {
  const d = x - cpuCx(p);
  if (Math.abs(d) > 46) return ironBrainSeek(out, p, x, dead);
  bst._nearT = ((bst._nearT || 0) + DT) % 0.3;
  if (Math.abs(d) > dead && bst._nearT < 0.07) { if (d > 0) out.right = true; else out.left = true; }
  return out;
}
// will this plate's vent puff in the coming swing?
function ironLegVentSoon(S, pl) {
  const ph = S.ph;
  if (!pl.vent) return false;
  const next = ph.swinging ? ph.strides : ph.strides;   // the swing in this stride
  return pl.vent === 1 ? next % 2 === 1 : next % 2 === 0;
}
// hop a crow in the way
function ironLegCpuCrow(bst, p, ph, out) {
  const cx = cpuCx(p), dir = out.right ? 1 : out.left ? -1 : 0;
  if (!dir || !p.grounded) return out;
  for (const c of ph.crows) {
    if (c.away > 0 || c.l !== ph.ledgeOf[p.id]) continue;
    const d = (c.x - cx) * dir;
    if (d > 12 && d < 40) { out.jump = true; break; }
  }
  return out;
}
// the climber at a ballast block: onto the block (when it is braced, or at rest in the upright phase), then up
function ironLegCpuClimb(bst, p, o, P, ph, out, dt) {
  const cx = cpuCx(p), b = ph.blocks.find(q => q.from === ph.ledgeOf[p.id]);
  if (!b) return out;
  const onBlock = p.grounded && p.ground === b.solid;
  if (b.braced < 0) bst.noBrace += dt; else bst.noBrace = 0;
  const ok = b.braced >= 0 && b.x - b.rest < 10 || (bst.noBrace > 8 && !ph.swinging && Math.abs(b.x - b.rest) < 4);
  if (onBlock) {
    ironBrainSeek(out, p, b.x + 11, 3);
    if (Math.abs(cx - (b.x + 11)) < 6 && (b.braced >= 0 || !ph.swinging)) out.jump = ironBrainTap(bst, 'up', 0.45) ? true : out.jump;
    if (bst._uph > 0) { bst._uph -= dt; out.jump = true; } else if (out.jump) bst._uph = 0.3;
    return out;
  }
  if (!p.grounded) { ironBrainSeek(out, p, b.x + 20, 3); if (p.vy < 0) out.jump = true; return out; }
  const right = cx > b.x + b.w / 2;   // which side of it it is on (it climbs from either)
  if (!ok) { ironLegNear(bst, out, p, right ? Math.min(b.x + b.w + 44, IRONLEG.halfW - 14) : Math.max(b.x - 30, ironLegLedge(b.from)[1] + 24), 6); if (b.braced < 0) ironBrainSay(bst, p, 'brace', 'Brace it!', 8); return out; }
  // up onto the block
  ironBrainSeek(out, p, b.x + b.w / 2, 4);
  if (Math.abs(cx - (b.x + b.w / 2)) < b.w / 2 + 40) { out.jump = true; bst._uph = 0.3; }
  return out;
}
// pistons: the rider stands on the near one and rides it up; the presser crouches on the far one
function ironLegCpuPiston(bst, p, o, P, ph, out) {
  const cx = cpuCx(p), q = ph.pistons.find(r => r.from === ph.ledgeOf[p.id]);
  if (!q) return out;
  const ly = ironLegLedge(q.from + 1)[0];
  if (P.why === 'lift') {
    if (p.y + p.h <= ly + 3) { out.left = true; return out; }
    ironBrainSeek(out, p, P.x, 4); return ironBrainHop(bst, out, p);
  }
  const mine = P.why === 'ride' ? q.sa : q.sb;
  if (p.grounded && p.ground === mine) {
    ironBrainSeek(out, p, P.x, 3);
    // press only once the rider has settled on the other one (pressed early, the other one rises out of reach)
    bst.riderOn = o.alive && o.grounded && o.ground === q.sa ? (bst.riderOn || 0) + DT : 0;
    if (P.why === 'press') { out.left = out.right = false; out.down = bst.riderOn > 0.4 || q.ha > q.h0 + 4 && bst.riderOn > 0; }
    // the rider: at the top, step off onto the ledge
    if (P.why === 'ride' && p.y + p.h <= ly + 3) { out.left = true; out.right = false; }
    return out;
  }
  if (P.why === 'ride' && q.ha > q.h0 + 40) ironBrainSay(bst, p, 'letgo', 'Let go, so I can get on!', 6);
  ironBrainSeek(out, p, P.x, 4);
  return ironBrainHop(bst, out, p);
}
