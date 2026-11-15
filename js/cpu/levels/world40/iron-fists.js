/* Pip & Bo - Computer partner: 40-1 Part 3 'fists' (The Fists). World coords (see the core brain). */
'use strict';

/* Follows ironFistPlan. As decoy: goes to the live lock, taunts, steps off 0.35 s after the eye narrows (so the slam
   always lands on the lock), then stays in sight and off the arm. As puller: waits beside the lock on the arm's side,
   out of the slam, and runs up the arm the moment the fist lands, then holds the action on the elbow. If the person
   decoy keeps leaving early it says "Stay on the lock!". It never does both jobs. Jumps sweeps, stomps mice. */
IRON_BRAINS.fists = {
  reset(bst) { bst.early = 0; },
  think(bst, p, o, dt, info, S) {
    const ph = S.ph, K = IRONFIST, E = ph.eye, out = {}, cx = cpuCx(p);
    if (!p.alive || st0(S)) return out;
    const P = ironFistPlan(S)[p.id] || {}, w = P.why;
    // the person decoy left the lock before the eye narrowed: count it
    if (E.st === 'rise' && bst.lastE === 'hunt' && E.tgt !== p.id && ph.li < 3) { const lk = ironFistLock(ph); if (Math.abs(E.sx - lk.x) >= K.crackR) bst.early++; }
    bst.lastE = E.st;
    if (bst.early >= 2 && E.st === 'hunt') ironBrainSay(bst, p, 'stay', 'Stay on the lock until the eye goes narrow!', 14);
    if (w === 'go' || w === 'hatch') { ironBrainSeek(out, p, P.x, 6); return ironFistCpuMice(bst, p, ph, ironBrainJumpHold(bst, ironBrainHop(bst, out, p))); }
    if (w === 'dodge') return ironFistCpuSweep(bst, p, ph, out);
    if (w === 'lure') {
      ironLegNear(bst, out, p, P.x, 5);
      if (p.grounded && Math.abs(cx - P.x) < 12 && (E.tgt !== p.id || ph.taunt[p.id] < 1.2) && E.st === 'hunt' && ironBrainTap(bst, 'taunt', 0.6)) out.act = 'tap';
      return ironFistCpuMice(bst, p, ph, ironBrainJumpHold(bst, ironBrainHop(bst, out, p)));
    }
    if (w === 'clear') {
      if (E.t < 0.3) return out;   // the slam has to come to the lock: step off a moment after it narrows
      ironBrainSeek(out, p, P.x, 6); return ironFistCpuMice(bst, p, ph, ironBrainJumpHold(bst, ironBrainHop(bst, out, p)));
    }
    if (w === 'watch' || w === 'ready') { ironLegNear(bst, out, p, P.x, w === 'ready' ? 8 : 12); return ironFistCpuMice(bst, p, ph, ironBrainJumpHold(bst, ironBrainHop(bst, out, p))); }
    if (w === 'pull') {
      const A = ph.arm;
      if (P.onElbow) { out.act = true; return out; }   // stand still on it and hold
      // on the floor: get under the forearm and jump up onto it; on the arm: run up it to the elbow
      const onArm = p.grounded && p.ground && (p.ground.kind === 'arm' || p.ground.kind === 'fist');
      // off the arm: walk into the fist and hop up onto it (blocked by it: the hop); on the arm: up to the elbow
      if (A && !onArm) { if (p.grounded || p.vy < 0) ironBrainSeek(out, p, A.sx, 2); else ironBrainSeek(out, p, P.x, 4); if (p.grounded && Math.abs(cx - A.sx) < K.fist.hw + 26) ironBrainJump(bst, out, p, 0.3); }
      else ironLegNear(bst, out, p, P.x, 10);
      return ironBrainJumpHold(bst, ironBrainHop(bst, out, p));
    }
    return out;
  },
};
const st0 = S => !!(S.ph && S.ph.eye && S.ph.eye.st === 'wake');
// a sweep coming: jump it as it gets close
function ironFistCpuSweep(bst, p, ph, out) {
  const E = ph.eye, cx = cpuCx(p);
  if (E.st === 'sweep') {
    const d = (cx - E.fx) * -E.side;   // how far ahead of the fist
    if (d > 0 && d < 150 && p.grounded) ironBrainJump(bst, out, p, 0.3);
  }
  return ironBrainJumpHold(bst, out);
}
// mice: hop one coming at it (and land on it)
function ironFistCpuMice(bst, p, ph, out) {
  if (!p.grounded) return out;
  const cx = cpuCx(p);
  for (const m of ph.mice) {
    if (m.dead || Math.abs(m.y - (p.y + p.h)) > 6) continue;
    const d = m.x - cx;
    if (Math.abs(d) < 46 && Math.sign(d) === -m.dir) { ironBrainJump(bst, out, p, 0.2); return ironBrainJumpHold(bst, out); }
  }
  return out;
}
