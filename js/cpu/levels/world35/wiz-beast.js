/* Pip & Bo - Computer partner: 35-1 Moonwick Academy, class 'beast' (Beast Taming). */
'use strict';

/* The plan (rules: js/levels/world35/wiz-beast.js). The jobs swap at the troughs (S.ph.rider in front, S.ph.feeder at
   the back); the computer plays its player's seat, reading the class's plan(st).
   - RIDER: jumps fences, gaps and aimed lightning at the plan's moment, ducks branches, charges hay walls and long gaps,
     slows for storm gates and flocks until the sneeze clears them. If the person feeds and hunger is low, it says so.
   - FEEDER: picks the snack the bubble asks for (one press at a time, waiting to see it move), tosses it when hunger
     drops or pepper is asked for, never pepper otherwise; pets the tail when the static climbs. */
WIZ_BRAINS.beast = {
  think(bst, p, o, dt, info, S) {
    const out = {}, ph = S.ph;
    if (!ph.items || ph.mode !== 'run') { bst.hold = 0; return out; }
    const P = wizBeastPlan(S)[p.id];
    if (!P) return out;
    if (p.id === ph.rider) {
      if (P.jump) { if (!bst.jp) out.jump = true; bst.jp = !bst.jp; } else bst.jp = false;
      if (P.duck) out.down = true;
      if (P.charge && wizBrainTap(bst, 'hup', 0.3)) out.act = 'tap';
      if (P.spd < 0) out.left = true; else if (P.spd > 0) out.right = true;
      if (!info.partnerCpu && ph.hunger < 30) wizBrainSay(bst, p, 'hungry', 'It\'s hungry! Feed it the snack in the bubble!', 10);
      return out;
    }
    // the FEEDER: one press at a time, then wait to see the bag turn
    if (bst.hold > 0) { bst.hold -= DT; out[bst.key] = true; if (bst.hold <= 0) bst.wait = { sel: bst.sel0, t: 1.0 }; return out; }
    if (bst.wait) { bst.wait.t -= DT; if (bst.wait.sel === ph.sel && bst.wait.t > 0) return out; bst.wait = null; }
    if (P.pick) { bst.key = P.pick > 0 ? 'right' : 'left'; bst.hold = 0.1; bst.sel0 = ph.sel; out[bst.key] = true; return out; }
    if (P.toss && wizBrainTap(bst, 'feed', 0.4)) out.act = 'tap';
    if (P.pet) out.down = true;
    if (!info.partnerCpu && P.why === 'pepper') wizBrainSay(bst, p, 'pepper', 'Slow down, I\'ll make it sneeze at the gate!', 12);
    return out;
  },
};
