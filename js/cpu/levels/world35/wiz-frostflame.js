/* Pip & Bo - Computer partner: 35-1 Moonwick Academy, class 'frostflame' (Frost and Flame). */
'use strict';

/* The plan (rules: js/levels/world35/wiz-frostflame.js). The elements swap at the doors (S.ph.frost, S.ph.flame); the
   computer plays its player's element, reading the class's plan(st).
   - FROST: waits at the water's edge until FLAME is close, then holds the action and walks a bridge across (stopping
     on a raft while the thorns burn); freezes the plant, each fire tile and the geyser from a step away; climbs.
   - FLAME: follows a step behind on the ice and never fires along it while anyone stands on it; walks up to thorns,
     ice walls and the lamp and holds the jet until they are gone; waits clear of the frost jobs.
   Both hop what they walk into (the pillar, the ledge). */
function wizFFBrainGo(out, p, tx, dead = 6, bst = null) {
  const cx = p.x + p.w / 2, d = Math.abs(tx - cx);
  if (d <= dead) return;
  // close to a spot: short steps with a pause between (a slow reaction doesn't overshoot it again and again)
  if (bst && d < 70) { bst.pulse = (bst.pulse || 0) - DT; if (bst.pulse <= 0) bst.pulse = 0.55; if (bst.pulse < 0.43) return; }
  if (tx > cx) out.right = true; else out.left = true;
}
WIZ_BRAINS.frostflame = {
  think(bst, p, o, dt, info, S) {
    const out = {}, ph = S.ph;
    if (!ph.pieces || ph.swapT > 0) return out;
    const P = wizFFPlan(S)[p.id];
    if (!P) return out;
    const cx = p.x + p.w / 2, F = WIZFF.floor;
    // in the air: keep going the way the jump was meant
    if (!p.grounded && bst.air) { out[bst.air] = true; if ((bst.hold = (bst.hold || 0) - DT) > 0) out.jump = true; return out; }
    bst.air = null;
    wizFFBrainGo(out, p, P.x, P.why === 'bridge' ? 2 : 6, P.why === 'burn' || P.why === 'freeze' ? bst : null);
    if (p.id === ph.frost) {
      if (P.hold) out.act = true;
      else if (P.tap && wizBrainTap(bst, 'frost', 0.6)) { out.left = out.right = false; out.act = 'tap'; }
      // never walk off the ice into the water
      const pool = wizFFPoolAt(ph, cx + 24);
      if (out.right && pool && !P.hold) { const i = Math.floor((cx + 24 - pool.x0) / WIZFF.tile); if (i >= 0 && i < pool.n && pool.ice[i] <= 0.4) out.right = false; }
    } else {
      // FLAME never fires along ice somebody stands on
      const f = p.face || 1, a = f > 0 ? cx : cx - WIZFF.jet, b = a + WIZFF.jet;
      const iceUnder = G.players.some(q => q.grounded && q.ground && q.ground.kind === 'ice' && q.x + q.w > a && q.x < b);
      if (P.hold && !iceUnder && Math.abs(P.x - cx) < 34) { out.act = true; out.left = out.right = false; if (P.x + 50 > cx && f < 0) out.right = true; }
      // on a bridge: only step onto ice that will hold a while
      const pool = wizFFPoolAt(ph, cx + 20);
      if (out.right && pool && !out.act) { const i = Math.floor((cx + 20 - pool.x0) / WIZFF.tile); if (i >= 0 && i < pool.n && pool.ice[i] <= 1.2) out.right = false; }   // (casting: right only turns round)
    }
    // climbing: the geyser pillar and the ledge
    if (P.up && p.grounded) {
      const g = wizFFGeyserPc(ph), gx = g && g.geyser.x;
      if (g && g.geyser.ice > 0.8 && p.y + p.h > F - 4 && Math.abs(cx - (gx - 40)) < 14) { out.jump = true; bst.hold = 0.3; bst.air = 'right'; }
      else if (g && p.y + p.h <= g.geyser.y + 2 && p.y + p.h > g.ledgeY + 4) { out.jump = true; bst.hold = 0.3; bst.air = 'right'; }
      else if (g && p.y + p.h > F - 4) { out.left = out.right = false; wizFFBrainGo(out, p, gx - 40, 4); }
      return out;
    }
    return wizBrainHop(bst, out, p);
  },
};
