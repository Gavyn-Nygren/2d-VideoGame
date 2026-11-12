/* Pip & Bo - Computer partner: 35-1 Moonwick Academy, class 'exam' (Final Exam: The Big Mistake). */
'use strict';

/* The plan (rules: js/levels/world35/wiz-exam.js); the computer plays its player's job, reading the class's plan(st).
   - THE FLOOD: CASTER walks into the gate's circle and holds the action while the RUNNER is between the circle and the
     lever; RUNNER waits short of the obstacle until the spell is held, crosses, and pulls the lever. Then both run on.
   - THE GREAT HALL: both jump ink waves, hold the shield for a bolt on their line and step out of an arm's ring. When
     the eye glows, the LIFTER holds the action in the lift circle and the STRIKER climbs the steps and casts at the eye
     only while it is held open. */
function wizExBrainGo(out, p, tx, dead = 5, bst = null) {
  const cx = p.x + p.w / 2, d = Math.abs(tx - cx);
  if (d <= dead) return;
  // close to a spot: short steps with a pause between (so a slow reaction doesn't overshoot it again and again)
  if (bst && d < 70) { bst.pulse = (bst.pulse || 0) - DT; if (bst.pulse <= 0) bst.pulse = 0.55; if (bst.pulse < 0.45) return; }
  if (tx > cx) out.right = true; else out.left = true;
}
WIZ_BRAINS.exam = {
  think(bst, p, o, dt, info, S) {
    const out = {}, ph = S.ph;
    if (!ph.solids) return out;
    const P = wizExPlan(S)[p.id];
    if (!P) return out;
    if (P.why === 'climb') {
      const cx = p.x + p.w / 2;
      // the steps overlap: stand under the next one and jump straight up through it
      if (p.grounded) { if (Math.abs(cx - P.x) < 12 && Math.abs(p.vx) < 30) { out.jump = true; bst.air = P.jumpTo; } else wizExBrainGo(out, p, P.x, 6, bst); }
      else if (p.vy < 0) out.jump = true;
      return out;
    }
    bst.air = null;
    const spot = P.why === 'cast' || P.why === 'lift' || P.why === 'pull';
    wizExBrainGo(out, p, P.x, spot ? 10 : 5, spot ? bst : null);
    if (P.why === 'cast' || P.why === 'lift') { if (P.hold) out.act = true; }
    else if (P.tap === 'act' && wizBrainTap(bst, 'tap', 0.4)) out.act = 'tap';
    if (P.shield) out.act = true;
    if (P.jump || (ph.part === 2 && !p.grounded && p.vy < 0 && bst.hopping)) { out.jump = true; bst.hopping = true; } else if (p.grounded) bst.hopping = false;
    if (ph.part === 1 && P.why !== 'pull' && P.why !== 'cast') wizBrainHop(bst, out, p);
    if (!info.partnerCpu && P.why === 'wait' && ph.part === 1 && ph.mode === 'run') wizBrainSay(bst, p, 'hold', 'Stand in the circle and hold the spell!', 10);
    return out;
  },
};
