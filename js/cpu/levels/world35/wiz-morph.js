/* Pip & Bo - Computer partner: 35-1 Moonwick Academy, class 'morph' (Shape Shifting). */
'use strict';

/* The plan (rules: js/levels/world35/wiz-morph.js). The jobs swap per garden (S.ph.cast on the walkway, S.ph.shift in
   the garden); the computer plays its player's job, reading the class's plan(st).
   - CASTER: walks above the SHIFTER (stopping at the shut gate), turns the dial one press at a time to the shape the
     obstacle needs and casts when it is in range. Each press is a real press and release, as a person's would be.
   - SHIFTER: waits short of the obstacle until it has the right shape, then plays that shape: a FROG hops from a
     set-off spot and steers to its landing, a FISH swims at mid-depth and leaps out at the far bank, a BAT holds the
     height of the hole with small flaps and only flies on when it is lined up. Plain again on the pad, it pulls the
     rope. */
// one press of a key: held for a few frames, then let go (so the next press is a new press)
function wizMorphBrainPress(bst, out, key) {
  bst.pr = (bst.pr || 0) - DT;
  if (bst.pr > 0.12) { out[key] = true; return; }
  if (bst.pr <= 0) bst.pr = 0.24;
  if (bst.pr > 0.12) out[key] = true;
}
function wizMorphBrainCast(bst, p, out, S, P) {
  const cx = p.x + p.w / 2;
  if (Math.abs(P.x - cx) > 10) { if (P.x > cx) out.right = true; else out.left = true; }
  if (P.tap === 'act') { if (wizBrainTap(bst, 'cast', 0.4)) out.act = 'tap'; }
  else if (P.tap) wizMorphBrainPress(bst, out, P.tap);
  else bst.pr = 0;
  const ph = S.ph;
  if (P.need && P.need !== 'plain' && P.need !== ph.shape && P.why === 'closer') wizBrainSay(bst, p, 'closer', 'Come closer so I can reach you!', 10);
  return out;
}
// where to stand while waiting for a shape (short of the obstacle)
function wizMorphBrainStage(o) {
  return o.sx + ({ hedge: 110, moat: 50, belfry: 130, pondbank: 24, tower: 40 }[o.kind] || 40);
}
function wizMorphBrainShift(bst, p, out, S, P) {
  const ph = S.ph, K = WIZMORPH, F = K.floor, cx = p.x + p.w / 2, feet = p.y + p.h, shape = ph.shape;
  const go = tx => { if (Math.abs(tx - cx) > 5) { if (tx > cx) out.right = true; else out.left = true; } };
  const jumpPress = () => { if (!bst.jp) out.jump = true; bst.jp = !bst.jp; };
  const o = P.ob || wizMorphOb(ph);
  if (P.why === 'wait') {
    bst.jp = false;
    if (shape === 'plain' && o && !o.done) go(wizMorphBrainStage(o));
    else if (shape === 'fish' && wizMorphInPool(ph, cx, feet - 2)) { if (p.y + p.h / 2 < F + 30) out.down = true; }
    return out;
  }
  const tx = P.x;
  if (shape === 'plain') {
    go(tx);
    if (P.tap === 'act' && wizBrainTap(bst, 'rope', 0.5)) out.act = 'tap';
    return wizBrainHop(bst, out, p);
  }
  if (shape === 'frog') {
    const fr = K.frog;
    if (!p.grounded && ph.float <= 0) { const a = bst.airTx != null ? bst.airTx : tx; if (Math.abs(a - cx) > 6) { if (a > cx) out.right = true; else out.left = true; } return out; }
    if (ph.float > 0) { out.right = true; jumpPress(); bst.airTx = o.exit + 40; return out; }
    bst.jp = false;
    let from = null, air = tx;
    if (P.why === 'through' && o.kind === 'hedge') { from = o.sx + 95; air = o.sx + 280; }
    else if (P.why === 'through' && o.kind === 'tower' && feet > F - 20) { from = o.block.x0 - 34; air = (o.block.x0 + o.block.x1) / 2; }
    if (from != null && (cx < from + 30 || (cx < o.exit && feet > F - 20))) {
      go(from);
      if (Math.abs(cx - from) < 10) { out.right = true; out.jump = true; bst.airTx = air; }
      return out;
    }
    go(tx); void fr;
    return out;
  }
  if (shape === 'fish') {
    bst.airTx = null;
    const water = wizMorphInPool(ph, cx, feet - 2);
    if (!water) { go(P.why === 'through' && o.pool ? Math.max(tx, o.pool.x0 + 30) : tx); return out; }
    const pool = water;
    // swim at mid-depth; at the far end (or the "Now!" ring), up and out
    let wx = tx;
    if (o.kind === 'pondbank' && P.why === 'through') wx = o.ring.x;
    else wx = pool.x1 + 20;
    const leap = o.kind !== 'pondbank' && cx > pool.x1 - 40;
    if (leap) { out.up = true; out.right = true; return out; }
    go(Math.min(wx, pool.x1 - 10));
    const my = p.y + p.h / 2;
    if (my < F + 34) out.down = true; else if (my > F + 70) out.up = true;
    return out;
  }
  if (shape === 'bat') {
    bst.airTx = null;
    // the height to hold: the hole's, or a low glide to the pad
    let ty, wall = null;
    if (P.why === 'through' && o.hole) { ty = o.hole.bot; wall = o.hole.x; }
    else ty = (o ? o.pad.y : F) - 22;
    const onPad = o && Math.abs(cx - (o.pad.x0 + o.pad.x1) / 2) < 20 && P.why === 'rope';
    if (onPad) { bst.jp = false; return out; }   // just drop onto the pad
    const lined = Math.abs(feet - ty) < 6;
    if (!(wall != null && cx > wall - 40 && cx < wall - 14 && !lined)) go(tx);
    if (feet > ty + 2 && p.vy > -40) jumpPress(); else bst.jp = false;
    return out;
  }
  return out;
}
WIZ_BRAINS.morph = {
  think(bst, p, o, dt, info, S) {
    const out = {}, ph = S.ph;
    if (!ph.obs || ph.swapT > 0) return out;
    const P = wizMorphPlan(S)[p.id];
    if (!P) return out;
    return p.id === ph.cast ? wizMorphBrainCast(bst, p, out, S, P) : wizMorphBrainShift(bst, p, out, S, P);
  },
};
