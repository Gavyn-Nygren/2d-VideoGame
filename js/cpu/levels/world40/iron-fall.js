/* Pip & Bo - Computer partner: 40-1 Part 7 'fall' (Coming Apart). World coords (see the core brain). */
'use strict';

/* Follows ironFallPlan. Runs the marked route right and down (jumps each gap at the platform's end, walks onto chains
   and the slide), hops the slide's loose plates and ducks its cables. Launch plates: stands on the plate if the plan
   says so, otherwise waits beside the pump and hops onto it the moment the partner stands on the plate; throws the
   chain at once. Walls: the step crouches, the climber jumps off its head; the one on top holds the action at the edge.
   The knee: presses jump 0.15 s after the person (or 0.1 s into "JUMP!" when it must lead). */
IRON_BRAINS.fall = {
  reset(bst) { bst.kneeN = -1; },
  think(bst, p, o, dt, info, S) {
    const ph = S.ph, out = {}, cx = cpuCx(p);
    if (!p.alive || !ph.plats || ph.fly[p.id]) return out;
    const P = ironFallPlan(S)[p.id] || {}, w = P.why;
    if (w === 'end') return out;
    if (w === 'run' || w === 'wait') { if (w === 'wait' && Math.abs(cx - P.x) < 10) return out; return ironFallGo(bst, out, p, S, P.x); }
    // far from the job (another platform): run the course there first
    const L = ironFallPlan(S).launch;
    if (L && (w === 'plate' || w === 'pump' || w === 'pumpwait') && !(p.grounded && p.ground === ph.plats[L.from]) && !(p.grounded && p.ground === L.pumpS)) return ironFallGo(bst, out, p, S, P.x);
    if ((w === 'step' || w === 'boost' || w === 'wait') && Math.abs(cx - P.x) > 80) return ironFallGo(bst, out, p, S, P.x);
    if (w === 'plate') { if (Math.abs(cx - P.x) > 5) ironLegNear(bst, out, p, P.x, 4); return ironBrainJumpHold(bst, ironBrainHop(bst, out, p)); }
    if (w === 'pumpwait' || w === 'pump') {
      const l = ironFallPlan(S).launch, pc = (l.pump[0] + l.pump[1]) / 2, stand = l.pump[1] + 16;
      const onPump = p.grounded && p.ground === l.pumpS;
      if (w === 'pumpwait' || onPump) {
        const tx = P.x != null && w === 'pumpwait' && P.x > l.pump[1] + 10 ? P.x : stand + 6;
        if (onPump) { out.right = true; return out; }
        if (cx < l.pump[1] && tx > l.pump[1]) { ironBrainSeek(out, p, tx, 3); return ironBrainJumpHold(bst, ironBrainHop(bst, out, p)); }   // hop over the pump
        if (Math.abs(cx - tx) > 4) ironLegNear(bst, out, p, tx, 3);
        return ironBrainJumpHold(bst, out);
      }
      // hop onto the pump: from beside it, a full jump, steering only until over its middle
      if (!p.grounded) { if (cx < pc - 4) out.right = true; else if (cx > pc + 4) out.left = true; return ironBrainJumpHold(bst, out); }
      if (Math.abs(cx - stand) > 6) { ironLegNear(bst, out, p, stand, 3); return out; }
      ironBrainJump(bst, out, p, 0.25); out.left = true;
      return ironBrainJumpHold(bst, out);
    }
    if (w === 'throw') {
      if (Math.abs(cx - P.x) > 26) return ironFallGo(bst, out, p, S, P.x);
      out.act = true; return out;
    }
    if (w === 'step') {
      if (p.onPartner) { out.left = true; return out; }
      if (Math.abs(cx - P.x) > 8) { ironLegNear(bst, out, p, P.x, 3); return ironBrainJumpHold(bst, out); }
      out.down = true; return out;
    }
    if (w === 'boost') return ironFallBoost(bst, p, o, S, out);
    if (w === 'hand') {
      const wl = ironFallPlan(S).wall, e = wl ? wl.x : P.x - 10;
      if (cx > e + 40) out.left = ironBrainTap(bst, 'inch', 0.1); else if (cx < e + 8) out.right = ironBrainTap(bst, 'inch', 0.1);
      if (p.grounded) out.act = true;
      return out;
    }
    if (w === 'knee') {
      const J = ph.jump;
      if (J.st !== 'go') { bst.kneeT = null; if (Math.abs(cx - P.x) > 8) return ironFallGo(bst, out, p, S, P.x); return out; }
      const win = ironFallGold(S) ? IRONFALL.jump.goldWin : IRONFALL.jump.win;
      if (J.press[p.id] == null) {
        const op = J.press[o.id];
        const when = info.partnerCpu ? 0.1 : op != null ? op + 0.15 : win * 0.6;
        if (J.t >= when) ironBrainJump(bst, out, p, 0.2);
      }
      return ironBrainJumpHold(bst, out);
    }
    return out;
  },
};
// run toward x along the course: jump at the end of a platform with a gap after it, hop plates and duck cables on the slide
function ironFallGo(bst, out, p, S, x) {
  const ph = S.ph, cx = cpuCx(p), Sl = IRONFALL_SLIDE;
  if (!p.grounded) { ironBrainSeek(out, p, x, 3); return ironBrainJumpHold(bst, ironBrainHop(bst, out, p)); }
  if (p.ground === ph.slide) {
    out.right = true;
    if (!ironFallGold(S)) {
      if (Sl.cables.some(c => c - cx > -8 && c - cx < 120)) { out.down = true; bst._jh = 0; return out; }
      if (Sl.plates.some(b => b - cx > 18 && b - cx < 64)) { ironBrainJump(bst, out, p, 0.18); return ironBrainJumpHold(bst, out); }
    }
    return ironBrainJumpHold(bst, out);
  }
  const r = p.ground;
  const gap = r && !r.head && x > r.x1 + 4 && !ph.solids.some(q => q !== r && !q.off && q.x0 <= r.x1 + 6 && q.x1 > r.x1 + 6 && Math.abs((q.slope ? q.ya : q.y0) - r.y0) < 8);
  // near the edge of a gap: creep up to it, then a standing jump with right held (carries ~140 px, and stays safe
  // for someone who reacts late)
  if (gap && cx > r.x1 - 64) {
    if (cx > r.x1 - 30) { out.right = true; ironBrainJump(bst, out, p, 0.3); return ironBrainJumpHold(bst, out); }
    ironLegNear(bst, out, p, r.x1 - 14, 2); return ironBrainJumpHold(bst, out);
  }
  ironBrainSeek(out, p, x, 5);
  return ironBrainJumpHold(bst, ironBrainHop(bst, out, p));
}
// the climber at a wall: beside the crouching partner, jump onto its head, then jump again toward the wall
function ironFallBoost(bst, p, o, S, out) {
  const cx = cpuCx(p), w = ironFallPlan(S).wall;
  if (!w) return out;
  if (p.grounded && p.y + p.h <= w.top + 2) { if (cx > w.x + 30) out.left = ironBrainTap(bst, 'inch', 0.1); return ironBrainJumpHold(bst, out); }
  if (!o.crouch && p.grounded && !p.onPartner) { ironBrainSeek(out, p, w.x - 60, 6); return ironBrainJumpHold(bst, out); }
  // ended up between the step and the wall: back off past the step first, then come again
  if (p.grounded && !p.onPartner) {
    const ocx = cpuCx(o);
    if (bst.bk || cx > ocx + 6) { bst.bk = cx > ocx - 34; if (bst.bk) { out.left = true; return ironBrainJumpHold(bst, out); } }
  } else bst.bk = false;
  out.right = true;
  if (!p.grounded) { if (p.y + p.h < w.top && cpuCx(p) > w.x + 24) out.right = false; return ironBrainJumpHold(bst, out); }
  if (p.onPartner || Math.abs(cx - cpuCx(o)) < 14) ironBrainJump(bst, out, p, 0.35);
  return ironBrainJumpHold(bst, out);
}
