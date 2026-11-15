/* Pip & Bo - Computer partner: 40-1 Part 6 'brain' (The Lantern Head). World coords (see the core brain). */
'use strict';

/* Follows ironLampPlan. Holder: stands at its rod holding the action; on lap 2, when the chair's claw is about to
   close on its rod it lets go and steps back, then grabs again once the claw rises. Dasher: walks floor to floor up the
   stair blocks, and only steps into a quarter while it is dead (a rod held now, or plenty of its warm-up left, and no
   swap warning); caught in a live one it goes to the nearest safe spot (the mat, either end) and waits. Spanners: one
   step out from under the chalk X, then stand (it stops short of one ahead). At the top: climbs the chair, unscrews
   the bulb, then pulls left in the tug of war. */
IRON_BRAINS.brain = {
  reset(bst) { bst.goX = null; bst.run = null; bst.waitT = 0; },
  think(bst, p, o, dt, info, S) {
    const ph = S.ph, K = IRONLAMP, out = {}, cx = cpuCx(p);
    if (!p.alive || !ph.rods) return out;
    const P = ironLampPlan(S)[p.id] || {}, w = P.why;
    if (w === 'hold') {
      const C = ph.claw, reach = ironLampGold(S) ? K.claw.goldReach : K.claw.reach;
      if (C.k === P.k && ((C.st === 'reach' && C.t > reach - 0.6) || C.st === 'shut')) {
        ironBrainSeek(out, p, P.x + (P.k % 2 === 0 ? 44 : -44), 4);
        return out;
      }
      if (ironLampFloorOf(p) !== P.k || Math.abs(cx - P.x) > 14) return ironLampGo(bst, out, p, S, P.k, P.x, true);
      out.act = true;
      return out;
    }
    if (w === 'dash') return ironLampGo(bst, out, p, S, P.k, P.x);
    if (w === 'bulb' || w === 'tug') {
      if (ironLampFloorOf(p) !== K.top) return ironLampGo(bst, out, p, S, K.top, P.x);
      const onSeat = p.grounded && p.ground === ph.seat;
      if (!onSeat || Math.abs(cx - P.x) > 44) {
        if (Math.abs(cx - P.x) > 40 || !onSeat) ironBrainSeek(out, p, P.x, 4); else ironLegNear(bst, out, p, P.x, 6);
        return ironBrainJumpHold(bst, ironBrainHop(bst, out, p));
      }
      out.act = true;
      if (w === 'tug') out.left = true;
      // the cage is live: wait (the progress pauses anyway)
      if (w === 'bulb' && !ph.qs[K.top].held) out.act = false;
      return out;
    }
    return out;
  },
};
// walk to rod / spot (gq, gx): up the stair blocks floor by floor, into a quarter only while it is dead, around spanners
function ironLampGo(bst, out, p, S, gq, gx, dare) {
  const ph = S.ph, K = IRONLAMP, cx = cpuCx(p), q = ironLampFloorOf(p);
  if (!p.grounded) { if (bst.goX != null) ironBrainSeek(out, p, bst.goX, 3); return ironBrainJumpHold(bst, ironBrainHop(bst, out, p)); }
  let tx = gx;
  const stairs = q < gq && q < K.top ? ironLampStairs(q) : null;
  if (stairs) tx = (stairs[0] + stairs[1]) / 2;
  bst.goX = tx;
  // the quarter on this floor: wait outside it, or get to a safe spot inside it, while it is live
  const cross = ironLampInZone(cx) || (cx <= K.zone[0] && tx > K.zone[0]) || (cx >= K.zone[1] && tx < K.zone[1]);
  // committed to a timed run across a live stretch: keep going
  if (bst.run != null) {
    if (!p.alive || ironLampFloorOf(p) !== bst.runQ || Math.abs(cx - bst.run) < 6) bst.run = null;
    else { ironBrainSeek(out, p, bst.run, 3); return out; }
  }
  const safeQ = ironLampSafeQ(S, q);
  bst.waitT = cross && !safeQ ? (bst.waitT || 0) + DT : 0;
  if (cross && q < K.top && !safeQ) {
    const atSafe = !ironLampInZone(cx) || ironLampOnMat(cx);
    // the holder going back to its own rod (or anyone stuck a long while) times the arcs: safe spot to safe spot
    if (atSafe && (dare || bst.waitT > 8)) {
      const dir = Math.sign(tx - cx) || 1, mid = (K.mat[0] + K.mat[1]) / 2;
      const next = [K.zone[0] - 14, mid, K.zone[1] + 14].filter(x => (x - cx) * dir > 10).sort((a, b) => (a - b) * dir)[0];
      if (next != null && !ironLampArcSoon(S, q, cx, next, Math.abs(next - cx) / 200 + 0.35)) { bst.run = next; bst.runQ = q; ironBrainSeek(out, p, next, 3); return out; }
    }
    if (ironLampInZone(cx) && !ironLampOnMat(cx)) {
      const spots = [K.zone[0] - 14, (K.mat[0] + K.mat[1]) / 2, K.zone[1] + 14];
      const s = spots.reduce((a, c) => (Math.abs(c - cx) < Math.abs(a - cx) ? c : a));
      ironBrainSeek(out, p, s, 4);
    }
    return out;
  }
  // a spanner on this floor: one step out from under it, or stop short of one ahead
  const Sp = ph.span;
  if ((Sp.st === 'tell' || Sp.st === 'fall') && Sp.q === q) {
    const dir = Math.sign(tx - cx) || 1, dd = (Sp.x - cx) * dir;
    if (Math.abs(dd) < 30) { ironBrainSeek(out, p, Sp.x + (dd > 0 ? -1 : 1) * dir * 48, 3); return out; }
    if (dd > 0 && dd < 100) return out;
  }
  // on a stair block: jump up through the deck above
  if (stairs && p.ground && p.ground.kind === 'step') {
    if (Math.abs(cx - tx) > 14) ironBrainSeek(out, p, tx, 3);
    else ironBrainJump(bst, out, p, 0.3);
    return ironBrainJumpHold(bst, out);
  }
  if (Math.abs(cx - tx) > 40) ironBrainSeek(out, p, tx, 4); else ironLegNear(bst, out, p, tx, 6);
  return ironBrainJumpHold(bst, ironBrainHop(bst, out, p));
}
