/* Pip & Bo - Computer partner: 35-1 Moonwick Academy, class 'lift' (Levitation). */
'use strict';

/* The plan (rules: js/levels/world35/wiz-lift.js). The jobs are S.ph.lift and S.ph.ride (they swap at floors 3 and 5);
   both read the class's plan(st), the same plan the hints use.
   - LIFTER: holds the wand while the slab is below the plan's height or off its x (sliding it with left / right), lets
     go when it is above (it sinks slowly), rests at 15 % focus when the rider is safe on a ledge, and never lifts a
     slab whose rider is mid-jump. When the floor's stairs are open it climbs them, step by step.
   - RIDER: grabs any book in reach; walks along the slab under the plan's book; ducks through the arch; steps onto the
     switch ledge when the slab is level with it and presses the switch; waits on a ledge for the slab to come back,
     then hops on. On floor 4 it walks off the first slab onto the second when they line up.
   It never clears alone: the lifter can't climb without the rider's switch, the rider can't rise without the lifter. */
function wizLiftBrainLifter(bst, p, out, S, P) {
  const ph = S.ph, K = WIZLIFT;
  if (P.why === 'climb') {
    // the stairs: the lowest step above our feet, then the balcony
    const feet = p.y + p.h, k = ph.floor;
    const steps = ph.stairs.filter(r => r.floor === k && !r.off).concat([{ x0: 0, x1: 150, y0: wizLiftBase(k + 1) }]);
    // (chosen on the ground and kept in the air, or a jump past one step turns round for the next)
    if (p.grounded || !bst.climb) bst.climb = steps.filter(r => r.y0 < feet - 4).sort((a, b) => b.y0 - a.y0)[0];
    const next = bst.climb;
    if (!next) return out;
    const tx = clamp(p.x + p.w / 2, next.x0 + 18, next.x1 - 18), dx = tx - (p.x + p.w / 2);
    if (Math.abs(dx) > 6) { if (dx > 0) out.right = true; else out.left = true; }
    const edge = dx > 0 ? next.x0 - (p.x + p.w) : p.x - next.x1;
    if (p.grounded && edge < 34 && feet - next.y0 < 110) { out.jump = true; bst.jumpT = 0.35; }
    if ((bst.jumpT = (bst.jumpT || 0) - DT) > 0) out.jump = true;
    return out;
  }
  if (P.why !== 'lift' && P.why !== 'fetch') return out;
  const s = ph.slabs[P.slab], rd = G.players[ph.ride];
  // a rider in mid-air: keep the slab where it is (let it sink a hair at most)
  if (!rd.grounded && P.why === 'lift') return out;
  const riderSafe = rd.grounded && rd.ground && !rd.ground.slab;
  if (ph.focus < 0.18 && riderSafe) bst.rest = true;
  if (bst.rest) { if (ph.focus > 0.9 || !riderSafe) bst.rest = false; else return out; }
  const dy = s.y - P.y, dx = P.x - s.x;
  let hold = false;
  if (dy > 3) hold = true;
  // slide first when far off sideways (sliding holds the height), else rise
  let dir = 0;
  // (sliding holds the height, so slide only when well off, or to finish once the height is right)
  if ((Math.abs(dx) > 14 || (Math.abs(dx) > 2.5 && Math.abs(dy) < 8)) && (dy > -40 || Math.abs(dx) > 30)) { hold = true; dir = dx > 0 ? 1 : -1; }
  // (left / right only with the wand held: without it they walk, off the balcony)
  if (hold && !ph.tired) { out.act = true; if (dir > 0) out.right = true; else if (dir < 0) out.left = true; }
  return out;
}
// walk toward x (dead zone d)
const wizLiftWalk = (out, cx, x, d) => { if (x > cx + d) out.right = true; else if (x < cx - d) out.left = true; };
// On a ledge (or the floor): reach the target from here (under it, jump), or climb a ledge above toward it.
// False: the target can't be reached from this ledge (go back to the slab).
function wizLiftRiderLedge(bst, p, out, S, P) {
  const ph = S.ph, g = p.ground, cx = p.x + p.w / 2, feet = p.y + p.h, k = ph.floor;
  const sw = P.kind === 'switch' || P.kind === 'roof';
  if (!g) return false;
  if (sw && Math.abs(feet - P.y) < 4) {   // on the switch's ledge (the roof: we're there)
    if (P.kind === 'switch') { if (Math.abs(cx - P.x) > 12) wizLiftWalk(out, cx, P.x, 0); else out.act = 'tap'; }
    return true;
  }
  if (!sw && P.y > feet - 118 && P.y < feet + 10 && P.x > g.x0 - 34 && P.x < g.x1 + 34) {   // the book is in jumping reach
    wizLiftWalk(out, cx, clamp(P.x, g.x0 + 10, g.x1 - 10), 6);
    if (Math.abs(P.x - cx) < 26 && P.y < feet - 34 && wizBrainTap(bst, 'hop', 0.5)) out.jump = true;
    return true;
  }
  // a one-way ledge above, toward the target: under it, then jump up through it
  let up = null;
  if (P.y < feet - 20) for (const r of ph.solids) {
    if (r.kind !== 'ledge' || r.floor !== k || r === g || r.off) continue;
    if (r.y0 < feet - 10 && feet - r.y0 < 100 && r.x1 > g.x0 + 20 && r.x0 < g.x1 - 20 && r.y0 > P.y - 30 && (!up || r.y0 > up.y0)) up = r;
  }
  if (up) {
    const x0 = Math.max(up.x0, g.x0) + 14, x1 = Math.min(up.x1, g.x1) - 14, tx = clamp(clamp(P.x, x0, x1), x0, x1);
    wizLiftWalk(out, cx, tx, 6);
    if (Math.abs(tx - cx) < 10 && wizBrainTap(bst, 'hop', 0.6)) out.jump = true;
    return true;
  }
  return false;
}
// Off the slab, on a ledge: wait for the slab to come level, then walk / hop on
function wizLiftRiderBoard(bst, p, out, S) {
  const ph = S.ph, K = WIZLIFT, cx = p.x + p.w / 2, feet = p.y + p.h, k = ph.floor;
  const s = wizLiftActive(ph), top = s.y, sx0 = s.x, sx1 = s.x + K.slab.w;
  if (!p.grounded) return out;
  const over = cx > sx0 + 4 && cx < sx1 - 4;
  if (!over && top > feet + 8 && feet < wizLiftBase(k) - 4) return out;   // the slab is still below this ledge: wait
  if (top > feet - 95 && top < feet + 34 && cx > sx0 - 220 && cx < sx1 + 220) {
    const want = (sx0 + sx1) / 2;
    wizLiftWalk(out, cx, want, 4);
    const gap = Math.max(sx0 - cx, cx - sx1);   // > 0: beside the slab, <= 0: over it
    const g = p.ground, edge = g && !g.slab && (out.left ? cx - g.x0 < 14 : out.right ? g.x1 - cx < 14 : false);
    const brink = edge && gap > -2;   // the next step is off this ledge and not onto the slab
    if (top < feet - 6 && gap < 45) { if (wizBrainTap(bst, 'hop', 0.45)) out.jump = true; }   // the slab is higher: hop up
    else if (brink) { if (gap < 130 && wizBrainTap(bst, 'hop', 0.45)) out.jump = true; else out.left = out.right = false; }   // never walk off
  }
  return out;
}
function wizLiftBrainRider(bst, p, out, S, P) {
  const ph = S.ph, K = WIZLIFT, cx = p.x + p.w / 2, feet = p.y + p.h, k = ph.floor;
  const onSlab = p.grounded && p.ground && p.ground.slab;
  // any book in reach: grab it
  for (const b of ph.books) if (!b.got && b.floor === k && Math.hypot(b.x - cx, b.y - (p.y + p.h / 2)) < K.grab - 8) { out.act = 'tap'; return out; }
  if (!p.grounded) return out;   // (the jump keeps its direction: see think)
  // the arch on floor 2: duck while the slab goes through
  if (onSlab && (k === 1 || k === 2) && onSlab.i === 0) {
    const A = K.arch, railY = ph.archOpen.y1 - K.slab.h;
    const L = wizLiftPlan(S)[ph.lift], moving = L && L.why === 'lift' && Math.abs(L.x - onSlab.x) > 5;
    if (moving && Math.abs(onSlab.y - railY) < 30 && onSlab.x + K.slab.w > A.x0 - 50 && onSlab.x < A.x1 + 10) { out.down = true; return out; }
  }
  if (!P || !P.kind || P.kind === 'wait') return onSlab ? out : wizLiftRiderBoard(bst, p, out, S);
  if (!onSlab) return wizLiftRiderLedge(bst, p, out, S, P) ? out : wizLiftRiderBoard(bst, p, out, S);
  // the roof (open, one-way, the whole width): straight up through it
  if (P.kind === 'roof' && onSlab.y - P.y < 90) { if (wizBrainTap(bst, 'hop', 0.6)) out.jump = true; return out; }
  // on the slab: step off onto the ledge we're heading for when level with it, else walk under the target
  const V = P.via || ((P.kind === 'switch' || P.kind === 'roof') ? { y: P.y, x0: P.x - 40, x1: P.x + 40 } : null);
  const reachV = V && (V.x0 > cx ? V.x0 - (onSlab.x + K.slab.w) : onSlab.x - V.x1) < 100;   // (no wall between: the gap is a hop)
  if (V && reachV && Math.abs(onSlab.y - V.y) < 26) {
    const side = (V.x0 + V.x1) / 2 > cx ? 1 : -1, edge = side > 0 ? V.x0 - (p.x + p.w) : p.x - V.x1;
    // walk to the slab's end (its rails stop us), then hop across
    const toEnd = side > 0 ? onSlab.x + K.slab.w - (p.x + p.w) : p.x - onSlab.x;
    if (toEnd < 14) { if (!wizBrainTap(bst, 'hop', 0.4)) return out; out.jump = true; }
    void edge;
    if (side > 0) out.right = true; else out.left = true;
    return out;
  }
  // floor 4: walk off the first slab onto the second when it waits beside and below
  if (k === 3 && onSlab.i === 0 && P.x > 560) {
    const s2 = ph.slabs[1];
    if (onSlab.x >= K.tracks[0].x1 - 8 && s2.y > onSlab.y && s2.y - onSlab.y < 120 && s2.x < onSlab.x + K.slab.w + 60) { out.right = true; if (onSlab.x + K.slab.w - (p.x + p.w) < 14 && wizBrainTap(bst, 'hop', 0.4)) out.jump = true; return out; }
  }
  const tx = V ? ((V.x0 + V.x1) / 2 > cx ? onSlab.x + K.slab.w - 16 : onSlab.x + 16) : P.x;
  wizLiftWalk(out, cx, clamp(tx, onSlab.x + 12, onSlab.x + K.slab.w - 12), 6);
  return out;
}
WIZ_BRAINS.lift = {
  think(bst, p, o, dt, info, S) {
    const out = {}, ph = S.ph;
    if (!ph.slabs || ph.poof) return out;
    const P = wizLiftPlan(S)[p.id] || {};
    if (p.id === ph.lift) {
      wizLiftBrainLifter(bst, p, out, S, P);
      if (!info.partnerCpu) {
        const R = wizLiftPlan(S)[ph.ride];
        if (R && R.kind === 'switch') wizBrainSay(bst, p, 'sw', 'Six books! Hit the switch!', 9);
        else if (R && R.kind === 'book') wizBrainSay(bst, p, 'bk', 'Grab the books: your action button!', 14);
      }
    } else {
      wizLiftBrainRider(bst, p, out, S, P);
      // walking into something (the slab's side, a wall) for a moment: hop
      const pushing = p.grounded && (out.left || out.right) && Math.abs(p.x - (bst.lastX == null ? p.x : bst.lastX)) < 0.05;
      bst.stuckT = pushing ? (bst.stuckT || 0) + dt : 0; bst.lastX = p.x;
      if (bst.stuckT > 0.35) { out.jump = true; bst.stuckT = 0; }
      // a jump is held for a full-height hop (a one-tick tap makes a little skip), and keeps its direction in the air
      if (out.jump && p.grounded) { bst.jh = 0.28; bst.airT = 0.8; bst.airDir = out.right ? 1 : out.left ? -1 : 0; }
      if ((bst.jh = (bst.jh || 0) - dt) > 0) out.jump = true;
      if ((bst.airT = (bst.airT || 0) - dt) > 0 && !p.grounded && bst.airDir) { out.left = bst.airDir < 0; out.right = bst.airDir > 0; }
      if (p.grounded && !out.jump) bst.airT = 0;
      if (!info.partnerCpu) {
        const L2 = wizLiftPlan(S)[ph.lift];
        if (L2 && L2.why === 'climb') wizBrainSay(bst, p, 'up', 'Stairs are open! Climb up!', 9);
        else if (L2 && (L2.why === 'lift' || L2.why === 'fetch') && !ph.held && !ph.tired) wizBrainSay(bst, p, 'lift', 'Hold your action to lift me!', 10);
      }
    }
    return out;
  },
};
