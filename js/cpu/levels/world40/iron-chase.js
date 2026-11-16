/* Pip & Bo - Computer partner: 40-1 Part 1 'chase' (Under the Feet). World coords (see the core brain). */
'use strict';

/* Dodges what a person sees: the growing shadow of a landing foot (gets out of the zone, never runs into one), a planted
   foot (waits), ground waves (jumps just before one: a wave hop), open cracks (jumps), a leaning pillar (out from under
   it), and follows the plan at the walls (ride the steam lift / hold its lever / step off: ironBrainLift) and the chain (grab / take the hand), then
   hops and ducks on the tow. It stays near its partner: never more than `ahead` px in front. */
const IRONCHASE_CPU = { ahead: 170, margin: 26 };
IRON_BRAINS.chase = {
  reset(bst) { bst.react = 0.1 + Math.random() * 0.1; },
  think(bst, p, o, dt, info, S) {
    const ph = S.ph, K = IRONCHASE, gy = ironChaseGY(), out = {}, cx = cpuCx(p);
    if (!p.alive) return out;
    if (ph.reel) return out;
    if (ph.tow) return ironChaseCpuTow(bst, p, ph, out, gy);
    const P = ironChasePlan(S)[p.id] || {};
    // 1. danger first: a growing shadow (only once a person could see it: after the reaction time)
    let flee = null;
    for (const f of ph.feet) {
      if (f.state !== 'tell' || f.t < bst.react) continue;
      const x0 = f.x - IRONCHASE_CPU.margin, x1 = f.x + K.foot.w + IRONCHASE_CPU.margin;
      if (cx > x0 && cx < x1) {
        const camL = S.cam.x + K.leftPad + 20, camR = S.cam.x + W - K.rightPad - 20;
        const L = x0 - 10, R = x1 + 10;
        const okL = L > camL && !ironChaseCpuInZone(ph, L, f), okR = R < camR && !ironChaseCpuInZone(ph, R, f);
        const left = okL && (!okR || cx - L < R - cx);
        flee = left ? L : okR ? R : (cx - L < R - cx ? L : R);
      }
    }
    if (flee != null) { ironBrainSeek(out, p, flee, 4); return ironChaseCpuJumps(bst, p, ph, out, gy); }
    // 2. where the plan wants it
    let x = null, hold = null;
    const w = P.why;
    if (w === 'wait' || w === 'follow') x = P.x;
    else if (w === 'ride' || w === 'off' || w === 'valve') return ironBrainLift(bst, p, o, P, out, dt);
    else if (w === 'back') { ironBrainSeek(out, p, P.x, 4); if (p.grounded && cx > P.x + 6 && cx < P.x + 90) ironBrainJump(bst, out, p, 0.3); return ironBrainJumpHold(bst, ironBrainHop(bst, out, p)); }
    else if (w === 'grab') { x = P.x; if (Math.abs(cx - P.x) < K.chain.grab - 8 && ironBrainTap(bst, 'grab', 0.3)) out.act = 'tap'; }
    else if (w === 'handchain') { x = P.x - 20; if (Math.abs(cx - cpuCx(o)) < K.chain.hand - 10 && Math.abs(p.y - o.y) < 30 && ironBrainTap(bst, 'hand', 0.3)) out.act = 'tap'; }
    else if (w === 'held') return out;
    else {
      // run: ahead, but never far ahead of the partner; grab a rivet close by
      x = Math.min(cpuCx(o) + IRONCHASE_CPU.ahead, S.cam.x + W - 120 - p.id * 56);
      const r = ph.rivets.find(q => !q.got && q.x > cx - 40 && q.x < cx + 220 && q.y > gy - 150);
      if (r && r.x < x + 60) { x = r.x; if (p.grounded && Math.abs(r.x - cx) < 40 && r.y < p.y) ironBrainJump(bst, out, p, 0.3); }
    }
    // never walk into a shadow or under a pillar about to fall
    if (x != null) {
      for (const f of ph.feet) {
        if (f.state === 'air') continue;
        const x0 = f.x - IRONCHASE_CPU.margin - 6, x1 = f.x + K.foot.w + IRONCHASE_CPU.margin + 6;
        if (f.state === 'tell' && cx <= x0 && x > x0) x = x0 - 8;
        if (f.state === 'tell' && cx >= x1 && x < x1) x = x1 + 8;
      }
      for (const pl of ph.pillars) {
        if (pl.state !== 'lean' && pl.state !== 'fall') continue;
        const a = pl.x - K.pillarLen - 14, b = pl.x + 14;
        if (cx > a && cx < b) x = cx - a < 50 && pl.state === 'lean' ? a - 10 : b + 16;
        else if (cx <= a && x > a) x = a - 10;
      }
    }
    if (x != null) ironBrainSeek(out, p, x, 6);
    if (hold === 'act') out.act = true;
    return ironChaseCpuJumps(bst, p, ph, out, gy);
  },
};
// a point x is inside another foot's tell zone
function ironChaseCpuInZone(ph, x, not) {
  return ph.feet.some(f => f !== not && (f.state === 'tell' || f.state === 'planted') && x > f.x - 20 && x < f.x + IRONCHASE.foot.w + 20);
}
// the jumps every run needs: a wave about to arrive (the hop), an open crack ahead, a low thing in the way
function ironChaseCpuJumps(bst, p, ph, out, gy) {
  const K = IRONCHASE, cx = cpuCx(p);
  if (!p.grounded || out.down) return ironBrainJumpHold(bst, ironBrainHop(bst, out, p));
  for (const w of ph.waves) {
    if (w.hit[p.id] || w.dead) continue;
    const d = (cx - w.x) * w.dir;
    if (d > 0 && d / K.wave.v < 0.13) { ironBrainJump(bst, out, p, 0.15); return ironBrainJumpHold(bst, out); }
  }
  const dir = out.right ? 1 : out.left ? -1 : 0;
  if (dir) {
    for (const c of ph.cracks) if (c.open) { const d = (c.x - cx) * dir; if (d > -4 && d < 62) { ironBrainJump(bst, out, p, 0.25); return ironBrainJumpHold(bst, out); } }
  }
  return ironBrainJumpHold(bst, ironBrainHop(bst, out, p));
}
// on the tow: hop rocks and cacti, duck bone arches, and jump at the top of a whip unless an arch is near
function ironChaseCpuTow(bst, p, ph, out, gy) {
  const tw = ph.tow, cx = cpuCx(p);
  const ahead = tw.stuff.filter(s => s.x - cx > -80 && s.x - cx < 260);
  const arch = ahead.find(s => s.kind === 'arch' && s.x - cx < 150 + 70);
  if (arch && p.grounded) { out.down = true; bst._jh = 0; return out; }
  const low = ahead.find(s => s.kind !== 'arch' && s.x - cx > 30 && s.x - cx < 80);
  if (low && p.grounded) { ironBrainJump(bst, out, p, 0.25); return ironBrainJumpHold(bst, out); }
  if (!p.grounded && !p.whipTop && Math.abs(p.vy) < 150 && p.y + p.h < gy - 90 && !tw.stuff.some(s => s.kind === 'arch' && s.x - cx > -60 && s.x - cx < 420)) out.jump = 'tap';
  return ironBrainJumpHold(bst, out);
}
