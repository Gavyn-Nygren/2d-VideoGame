/* Pip & Bo - Computer partner: 35-1 Moonwick Academy, class 'glow' (Light Spell). */
'use strict';

/* The plan (rules: js/levels/world35/wiz-glow.js). The jobs are fixed per part (S.ph.light carries the wand, S.ph.find
   does the climbing) and swap in the lantern rooms; the computer plays its player's job, reading the class's plan(st).
   It knows only what the light shows and what it has passed (the course ahead is the plan's next gate or pit).
   - LIGHT: walks to the plan's spot (up to a gate, to the edge of a pit, under a high ledge), leading the FINDER by
     half a body and waiting whenever they are out of the light; raises the wand when the FINDER climbs to a high lever;
     flashes when shadows (or a moth) come close; steps out from under a drip that is about to fall.
   - FINDER: in the dark it creeps back toward the light rather than into the unknown; in the light it climbs to the
     lever (step ledge first), pulls it, jumps a pit from the edge when the light is there, and flees to the bright
     middle when a shadow comes for it. */
function wizGlowBrainLight(bst, p, out, S, P) {
  const ph = S.ph, cx = p.x + p.w / 2;
  if (P.tap && wizBrainLate(bst, 'flash', true, 0.15)) out.act = 'tap';
  if (P.hold === 'up') out.jump = true;
  const dx = P.x - cx;
  if (Math.abs(dx) > 8) { if (dx > 0) out.right = true; else out.left = true; }
  // never walk into an open pit
  for (const pi of ph.pits) if (!pi.down && ((out.right && cx + 16 > pi.x0 - 6 && cx < pi.x0) || (out.left && cx - 16 < pi.x1 + 6 && cx > pi.x1))) { out.right = false; out.left = false; }
  // what the finder (the person) should do
  const f = wizGlowPlan(S)[ph.find];
  if (f.lever && !f.lever.pulled && f.high) wizBrainSay(bst, p, 'high', 'I\'ll light the ledges. Up you go!', 10);
  else if (f.pit && !f.pit.down) wizBrainSay(bst, p, 'pit', 'Jump the pit while I light it!', 12);
  return out;
}
function wizGlowBrainFind(bst, p, out, S, P) {
  const ph = S.ph, cx = p.x + p.w / 2, feet = p.y + p.h, K = WIZGLOW;
  if ((bst.hold = (bst.hold || 0) - DT) > 0) out.jump = true;
  // in the air: steer to where the jump was meant to land
  if (!p.grounded) { if (bst.airTx != null && Math.abs(bst.airTx - cx) > 5) { if (bst.airTx > cx) out.right = true; else out.left = true; } return out; }
  bst.airTx = null;
  const c = wizGlowCenter(ph), lit = ph.findLit;
  // a shadow coming for us at the rim: into the bright middle
  const R = wizGlowR(ph);
  const danger = ph.shadows.some(s => !s.dead && Math.abs(s.x - cx) < 140 && Math.hypot(cx - c.x, p.y + p.h / 2 - c.y) > R * 0.6);
  if (danger && Math.abs(c.x - cx) > 10 && !(P.pit && cx > P.pit.x1)) { if (c.x > cx) out.right = true; else out.left = true; return out; }
  let tx = P.x, jump = false, air = null;
  if (P.lever && !P.lever.pulled) {
    const lv = P.lever;
    if (P.pit && cx < P.pit.x1) {
      // cross the pit: from its edge, with the light there
      tx = P.pit.x1 + 30; air = tx;
      if (cx > P.pit.x0 - 34) jump = true;
      else if (cx > P.pit.x0 - 20) { tx = P.pit.x0 - 26; }
    } else if (lv.y < feet - 20) {
      // up to the lever's ledge (a step ledge first if it's two high)
      const ledge = ph.solids.find(r => r.kind === 'ledge' && Math.abs((r.x0 + r.x1) / 2 - lv.x) < 4);
      const step = ph.solids.find(r => r.kind === 'ledge' && r !== ledge && r.x0 < lv.x - 60 && r.x1 > lv.x - 130 && r.x1 < lv.x && r.y0 > lv.y + 20);
      const onStep = step && p.ground === step;
      if (step && !onStep) { tx = (step.x0 + step.x1) / 2 - 8; air = tx + 8; if (Math.abs(cx - tx) < 22) jump = true; }
      else if (onStep) { tx = ledge.x0 + 12; air = ledge.x0 + 36; if (Math.abs(cx - tx) < 10) jump = true; }   // (the step runs on under the ledge's end: straight up)
      else { tx = (ledge.x0 + ledge.x1) / 2 - 10; air = tx + 10; if (Math.abs(cx - tx) < 24) jump = true; }
    } else {
      tx = lv.x;
      if (Math.abs(cx - lv.x) < 18 && Math.abs(feet - lv.y) < 20) { out.act = 'tap'; return out; }
    }
  } else if (P.why === 'walk') tx = P.x;
  // a jump needs the light: in the dark, creep back toward it first
  if (jump && !lit) { jump = false; tx = c.x; }
  // don't wander out of the light ahead of the LIGHT (stay within reach), except to cross or reach the lever
  const dx = tx - cx;
  if (Math.abs(dx) > 6) { if (dx > 0) out.right = true; else out.left = true; }
  // never walk off into an open pit
  for (const pi of ph.pits) if (!pi.down && !jump && ((out.right && cx + 14 > pi.x0 - 4 && cx < pi.x0) || (out.left && cx - 14 < pi.x1 + 4 && cx > pi.x1))) { out.right = false; out.left = false; }
  // (a fresh press each time: one held down forever never jumps again if the first press was eaten)
  if (jump && bst.hold < -0.12) { out.jump = true; bst.hold = 0.3; bst.airTx = air != null ? air : tx; }
  return wizBrainHop(bst, out, p);
}
WIZ_BRAINS.glow = {
  think(bst, p, o, dt, info, S) {
    const out = {}, ph = S.ph;
    if (!ph.solids) return out;
    const P = wizGlowPlan(S)[p.id];
    if (!P) return out;
    return p.id === ph.light ? wizGlowBrainLight(bst, p, out, S, P) : wizGlowBrainFind(bst, p, out, S, P);
  },
};
