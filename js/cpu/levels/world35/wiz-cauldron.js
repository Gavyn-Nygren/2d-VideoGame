/* Pip & Bo - Computer partner: 35-1 Moonwick Academy, class 'cauldron' (Runaway Cauldron). */
'use strict';

/* The plan (rules: js/levels/world35/wiz-cauldron.js). The jobs are fixed per slope (S.ph.stir on the rim, S.ph.run on
   foot) and swap at the landings; the computer plays whichever job its player has, reading the class's plan(st).
   - STIRRER: presses the action as the bubble ring crosses the gold mark (a little early or late, like a person, but
     inside the window), leans toward the clean rail before a fork, and pulls the brake when the cauldron is about to
     roll past the wanted ingredient while the runner is far from it.
   - RUNNER: reads the recipe card and never touches a wrong one: walks to the wanted ingredient (onto the crate first
     for a high shelf, a jump under a low one), keeps clear of look-alikes on the way, hops barrels and the gap, waits
     out a steam vent that is warning or blowing, then waits ahead of the cauldron and tosses when it is near.
   It never clears alone: a person who doesn't stir boils it over, a person who doesn't fetch leaves the recipe empty. */
function wizCaulBrainStir(bst, p, out, S, P) {
  const ph = S.ph;
  if (ph.mode !== 'roll') { bst.aim = null; return out; }
  // a fresh aim for each beat, a little off the centre of the mark
  const k = wizCaulNearK(ph);
  if (bst.k !== k) { bst.k = k; bst.aim = (Math.random() - 0.5) * wizCaulEarly(ph) * 1.2; }
  const d = ph.bt - wizCaulMarkT(ph, k);
  // (one press per beat, as a person would: a second press in the same beat is a splash)
  if (!wizCaulStirred(ph) && bst.done !== k && d >= bst.aim && d < bst.aim + 0.1) { out.act = 'tap'; bst.done = k; }
  if (P.hold === 'left') out.left = true; else if (P.hold === 'right') out.right = true; else if (P.hold === 'down') out.down = true;
  // what the runner (the person) should do
  const w = wizCaulWant(ph);
  if (ph.carry) { const rn = G.players[ph.run]; if (Math.hypot(rn.x - ph.cx, rn.y - wizCaulRim(ph)) < WIZCAUL.toss - 20) wizBrainSay(bst, p, 'toss', 'Toss it in!', 6); }
  else if (w) wizBrainSay(bst, p, 'fetch' + ph.got, 'Next: the ' + WIZCAUL_NAMES[w.type] + '!', 30);
  return out;
}
// a jump over whatever is just ahead on the floor (a barrel, the gap)
function wizCaulBrainObstacle(ph, p, dir) {
  const fx = p.x + p.w / 2 + dir * 30;
  if (wizCaulInGap(fx) && !wizCaulInGap(p.x + p.w / 2)) return true;
  for (const r of ph.solids) {
    if (r.kind !== 'barrel' && r.kind !== 'crate') continue;
    if (dir > 0 ? (r.x0 > p.x + p.w - 2 && r.x0 < p.x + p.w + 26) : (r.x1 < p.x + 2 && r.x1 > p.x - 26)) if (r.y0 < p.y + p.h - 4) return true;
  }
  return false;
}
// a vent between x0 and x1 that is warning or blowing
function wizCaulBrainVent(ph, x0, x1) {
  for (const v of ph.vents) if (v.x > Math.min(x0, x1) - 40 && v.x < Math.max(x0, x1) + 40 && v.state !== 'off') return v;
  return null;
}
function wizCaulBrainRun(bst, p, out, S, P) {
  const ph = S.ph, cx = p.x + p.w / 2;
  if (P.why === 'wait' && P.x == null) return out;
  let tx = P.x, jumpAt = null;
  // never stand in front of the rolling cauldron: get ahead of it first
  if (ph.mode === 'roll' && cx < ph.cx + 70 && cx > ph.cx - 80) { out.right = true; if (p.grounded && wizCaulBrainObstacle(ph, p, 1)) { out.jump = true; bst.hold = 0.3; } if ((bst.hold = (bst.hold || 0) - DT) > 0) out.jump = true; return wizBrainHop(bst, out, p); }
  if (P.why === 'fetch') {
    const it = P.item;
    if (it.hop > 0) return out;
    // the cauldron will be there first (the ingredient then hops on ahead by itself): wait in front of it
    if (ph.mode === 'roll' && it.x < ph.cx + 150 + Math.max(0, Math.abs(it.x - cx) - 30) * 0.5) { P = { why: 'toss', x: ph.cx + 200 }; }
  }
  if (P.why === 'fetch') {
    const it = P.item;
    if (P.crate != null && !(p.grounded && p.ground && p.ground.kind === 'crate')) {
      // up onto the crate first (it is just left of the high shelf)
      tx = P.crate;
      if (Math.abs(cx - P.crate) < 34 && p.grounded) jumpAt = true;
    } else if (P.crate != null) {
      // on the crate: jump up and right onto the shelf
      jumpAt = true; tx = it.x;
    } else if (it.y < p.y + p.h - 30) {
      // a low shelf: right under it, then straight up
      tx = it.x;
      if (Math.abs(cx - it.x) < 8 && p.grounded) jumpAt = true;
    }
  } else if (P.why === 'toss') {
    if (P.tap) { out.act = 'tap'; return out; }
    // wait ahead of the cauldron for it to come close
    tx = P.x;
    if (cx < ph.cx + 60) tx = ph.cx + 200;
  }
  const dx = tx - cx, dir = Math.sign(dx);
  // a vent in the way that is about to blow: wait short of it
  const v = Math.abs(dx) > 10 ? wizCaulBrainVent(ph, cx, tx) : null;
  if (v && Math.abs(v.x - cx) < 90 && Math.abs(v.x - cx) > 30 + p.w / 2 && Math.sign(v.x - cx) === dir) {
    // (but never wait in front of the rolling cauldron: back toward it, out of the steam's way)
    if (ph.mode === 'roll' && cx < ph.cx + 130) out[dir > 0 ? 'left' : 'right'] = true;
    return out;
  }
  // caught in the column as it starts to hiss: out the near side
  if (v && Math.abs(v.x - cx) <= 30 + p.w / 2) { if (cx < v.x && !(ph.mode === 'roll' && cx < ph.cx + 130)) out.left = true; else out.right = true; return out; }
  if (Math.abs(dx) > 6) { if (dir > 0) out.right = true; else out.left = true; }
  // don't land on a look-alike: it is picked up by touch
  // (no jump next to a look-alike unless it is the jump to the target: a look-alike is picked up by touch)
  const fake = ph.items.some(it => !it.good && !it.used && it.slope === ph.slope && Math.abs(it.x - cx) < 46);
  if (jumpAt) { out.jump = true; bst.hold = 0.3; }
  else if (!fake && Math.abs(dx) > 6 && p.grounded && wizCaulBrainObstacle(ph, p, dir)) { out.jump = true; bst.hold = 0.3; }
  if ((bst.hold = (bst.hold || 0) - DT) > 0) out.jump = true;
  if (!p.grounded && bst.air != null) { if (bst.air > 0) out.right = true; else if (bst.air < 0) out.left = true; }
  if (p.grounded) bst.air = out.right ? 1 : out.left ? -1 : 0;
  return wizBrainHop(bst, out, p);
}
WIZ_BRAINS.cauldron = {
  think(bst, p, o, dt, info, S) {
    const out = {}, ph = S.ph;
    if (!ph.items) return out;
    const P = wizCaulPlan(S)[p.id];
    if (!P) return out;
    return p.id === ph.stir ? wizCaulBrainStir(bst, p, out, S, P) : wizCaulBrainRun(bst, p, out, S, P);
  },
};
