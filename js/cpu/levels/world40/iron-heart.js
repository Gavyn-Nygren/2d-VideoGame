/* Pip & Bo - Computer partner: 40-1 Part 5 'heart' (The Gear Heart). World coords (see the core brain). */
'use strict';

/* Follows ironHeartPlan. Controller: stands at its booth's lever holding the action and notches it to the rail the
   next junction needs (it switches for junction 2 only once the carriage has left junction 1). Rider: walks onto the
   carriage, stands in the middle, jumps the pendulum at half past the tick, says "Top route, please!" (or middle /
   bottom) when the lever has been wrong for 4 s. Lift: stands on it. Core: one on the pedal (jumps just before the 4th
   tick), one on the nut; then both grab the heart. */
IRON_BRAINS.heart = {
  reset(bst) { bst.wrong = 0; },
  think(bst, p, o, dt, info, S) {
    const ph = S.ph, K = IRONHEART, out = {}, cx = cpuCx(p);
    if (!p.alive || !ph.car) return out;
    const P = ironHeartPlan(S)[p.id] || {}, w = P.why, c = ph.car;
    if (w === 'ctrl') {
      if (Math.abs(cx - P.x) > 8 || !p.inBooth) { ironLegNear(bst, out, p, P.x, 5); return ironBrainHop(bst, out, p); }
      out.act = true;
      const lv = ph.lever[P.k];
      // a press is a one-tick tap every 0.25 s (the lever moves on the press, not while held)
      if (lv !== P.need && ironBrainTap(bst, 'notch', 0.25)) { if (lv > P.need) out.up = true; else out.down = true; }
      return out;
    }
    if (w === 'board') {
      if (c.mode === 'board') { if (Math.abs(cx - c.x) > 6) ironLegNear(bst, out, p, c.x, 4); }
      else { const g = ironHeartLeg(ph.leg); ironLegNear(bst, out, p, g.xd - 80 * g.dir, 8); }
      return ironBrainJumpHold(bst, ironBrainHop(bst, out, p));
    }
    if (w === 'ride') {
      if (Math.abs(cx - c.x) > 10) ironLegNear(bst, out, p, c.x, 6);
      const g = ironHeartLeg(ph.leg), px = g.xd + 330 * g.dir, row = g.rows[g.L.j2];
      // the pendulum (and the rivet over it): jump at the stop under it, just before it swings through
      if (Math.abs(c.x - px) < 4 && Math.abs(c.y - row) < 4 && ph.tickT > 0.46 && ph.tickT < 0.6 && p.grounded) ironBrainJump(bst, out, p, 0.3);
      const need = ironHeartNeed(S);
      bst.wrong = ph.lever[ph.leg] !== need ? bst.wrong + dt : 0;
      if (bst.wrong > 4) ironBrainSay(bst, p, 'route', ['Top', 'Middle', 'Bottom'][need] + ' rail, please!', 8);
      return ironBrainJumpHold(bst, out);
    }
    if (w === 'lift') {
      const l = ph.lifts[P.k];
      if (Math.abs(cx - l.x) > 8) ironLegNear(bst, out, p, l.x, 5);
      return ironBrainHop(bst, out, p);
    }
    if (w === 'pedal') {
      const C = K.core, on = p.grounded && p.ground === ph.pedal;
      if (!on && Math.abs(cx - C.pedal) > 10) { ironLegNear(bst, out, p, C.pedal, 6); return ironBrainJumpHold(bst, ironBrainHop(bst, out, p)); }
      if (!on && p.grounded && Math.abs(cx - C.pedal) <= 10) ironLegNear(bst, out, p, C.pedal, 2);
      if (ph.core.tell && ph.tickT > 0.84 && p.grounded) ironBrainJump(bst, out, p, 0.2);
      return ironBrainJumpHold(bst, out);
    }
    if (w === 'nut' || w === 'carry') {
      if (Math.abs(cx - P.x) > 12) { ironLegNear(bst, out, p, P.x, 8); return ironBrainHop(bst, out, p); }
      out.act = true;
      return out;
    }
    return out;
  },
};
