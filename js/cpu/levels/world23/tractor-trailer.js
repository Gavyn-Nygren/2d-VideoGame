/* Pip & Bo - Computer partner brain for 23-1 Tractor & Trailer (mode 'haytractor'). */
'use strict';

(() => {
  /* 23-1 Tractor & Trailer (MODES.haytractor): G.mst.drive says who drives this field; the other catches on the wagon.
     Both jobs read MODES.haytractor.plan(st), the same plan the prompts and the HUD chips read.
     DRIVER: a simple speed controller toward plan.vWant (gas when slower, ▼ to brake, ◀ only to back up). The plan's
     speed is the field's pace (what the tossers aim for), slowed under a bump's safe speed just before the wagon rolls
     over it, backed up or crept forward to put a spilled or missed item under the wagon, and 0 behind sheep or geese.
     It honks when the plan says (sheep or geese ahead, a crow coming or pecking), at most every 0.6 s.
     CATCHER: walks to plan.uWant (where along the wagon the next toss will come down, found by stepping the item's
     flight forward with the wagon at its current speed), jumps when the plan says (high bales from the baler), holds the
     load when a hard bump is about to roll under the wagon and no catch comes first, and stands over a lying item while
     the wagon is slow so it gets scooped up.
     The one shortcut: a lying item the pair hasn't scooped after a while (6 s, 10 s with a person) is marked skip on the
     level state, so the plan, the prompts and both seats move on together.
     It can't finish a field alone: as the catcher it can't move the tractor, and as the driver it stops when the person
     has pressed nothing for 15 s (the level's "Taking a break"), and the shared idle stop (CPU.idleStop) stops it too.
     In 1-player mode it says short things ("Catch that one!", "Slow down, a bump!", "Honk at the sheep!"). Team brains always
     play at full skill. */
  const M = () => MODES.haytractor;

  cpuBrain('haytractor', {
    reset(S) { S.honkCd = 0; S.scoop = null; S.scoopT = 0; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.c || info.intro || st.state !== 'go' || st.waiting) return out;
      const pl = M().plan(st), human = !info.partnerCpu, tr = st.tr, c = st.cat;
      // a lying item nobody manages to scoop is skipped after a while
      if (pl.scoop) {
        if (S.scoop !== pl.scoop) { S.scoop = pl.scoop; S.scoopT = 0; }
        S.scoopT += dt;
        if (S.scoopT > (human ? 10 : 6)) pl.scoop.skip = true;
      } else S.scoop = null;
      if (p.id === st.drive) {
        const dv = pl.vWant - tr.v;
        if (dv > 6) out.right = true;
        else if (dv < -6) { if (pl.vWant < 0 && tr.v <= 2) out.left = true; else out.down = true; }
        if (S.honkCd > 0) S.honkCd -= dt;
        if (pl.honk && S.honkCd <= 0 && tr.honkCd <= 0) { out.act = 'tap'; S.honkCd = 0.6; }
        if (human) {
          if (pl.cWhy === 'jump' && pl.jumpSoon) cpuSay(p, 'Jump for it!', 1.4);
          else if (pl.cWhy === 'catch' && Math.abs(pl.uWant - c.u) > 30 && pl.catchT < 1.2) cpuSay(p, 'Catch that one!', 1.2); // (no left/right here: a bubble outlives the move, the prompt shows the way)
          else if (pl.holdNow && !c.hold) cpuSay(p, 'Bump! Hold on!', 1.4);
          else if (pl.dWhy === 'back' || pl.dWhy === 'creep') cpuSay(p, 'I\'ll back up. Scoop it!', 1.8);
          else if (st.wob > 0.7) cpuSay(p, 'The load is wobbly!', 1.4);
        }
        return out;
      }
      // the catcher
      const du = pl.uWant - c.u;
      if (!pl.holdNow) { if (du > 5) out.right = true; else if (du < -5) out.left = true; }
      if (pl.jumpNow && !c.air) out.jump = 'tap';
      if (pl.holdNow) out.act = true;
      if (human) {
        if (pl.dWhy === 'bump' && tr.v > pl.vWant + 20) cpuSay(p, 'Slow down, a bump!', 1.5);
        else if (pl.honk) cpuSay(p, st.birds.some(b => b.st === 'peck' || b.st === 'in') ? 'Honk at the crow!' : 'Honk! They\'re in the way!', 1.6);
        else if (pl.dWhy === 'back' && tr.v > -20) cpuSay(p, 'Back up! I can scoop it!', 1.6);
        else if (pl.dWhy === 'pace' && tr.v < st.c.pace - 60 && st.c.tossers.some(t => t.i < t.items.length && Math.abs(t.x - tr.s) < 700)) cpuSay(p, 'Faster! Keep the pace!', 1.5);
        else if (pl.dWhy === 'pace' && tr.v > st.c.pace + 70) cpuSay(p, 'Not so fast!', 1.4);
      }
      return out;
    },
  });
})();
