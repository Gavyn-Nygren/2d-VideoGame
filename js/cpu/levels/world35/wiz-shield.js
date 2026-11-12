/* Pip & Bo - Computer partner: 35-1 Moonwick Academy, class 'shield' (Shield Charm). */
'use strict';

/* The plan (rules: js/levels/world35/wiz-shield.js). The jobs swap at each gallery door (S.ph.sh holds the bubble,
   S.ph.zp zaps); the computer plays its player's job, reading the class's plan(st).
   - SHIELDER: walks to the firing spot beside the ZAPPER and holds the bubble when a warning line or a pot shadow is
     on the way, or when the ZAPPER is lined up; tilts up for pots; rests behind the pillar while the bubble refills.
   - ZAPPER: walks to the spot the plan picks for the nearest gem, turns the aim one press at a time and zaps only from
     inside the bubble. */
function wizShBrainGo(out, p, tx, dead = 5) {
  const cx = p.x + p.w / 2;
  if (Math.abs(tx - cx) > dead) { if (tx > cx) out.right = true; else out.left = true; }
}
WIZ_BRAINS.shield = {
  think(bst, p, o, dt, info, S) {
    const out = {}, ph = S.ph;
    if (!ph.armors || ph.swapT > 0) return out;
    const P = wizShPlan(S)[p.id];
    if (!P) return out;
    wizShBrainGo(out, p, P.x, p.id === ph.zp ? 4 : 6);
    if (p.id === ph.sh) {
      if (P.hold) out.act = true;
      if (P.up) out.up = true;
      if (P.why === 'rest') wizBrainSay(bst, p, 'rest', 'Shield\'s empty! Behind the pillar!', 12);
    } else {
      if (P.tap === 'act') { if (wizBrainTap(bst, 'zap', 0.35)) out.act = 'tap'; }
      else if (P.tap) { bst.pr = (bst.pr || 0) - DT; if (bst.pr <= 0) bst.pr = 0.24; if (bst.pr > 0.12) out[P.tap] = true; }
      else bst.pr = 0;
    }
    return out;
  },
};
