/* Pip & Bo - Computer partner brain for 26-1 Trapeze Catch (mode 'trapeze'). */
'use strict';

(() => {
  /* 26-1 Trapeze Catch (MODES.trapeze): G.mst.fly says who flies this act; the other catches. Both jobs read
     MODES.trapeze.plan(st), the same plan the prompts and the HUD chips read.
     CATCHER: pumps ◀ ▶ with the swing until it's in the gold band, calls "Hep!" when the plan says the ring is lit,
     and holds the action to reach while the flyer is in the air.
     FLYER: lets go when the plan says (just at the top of the forward swing), tucks for flips when the plan says there's
     time to finish them before the hands meet, opens up, and steers toward the catcher's hands.
     It can't finish an act alone: a catcher can't fly, and a flyer only leaves the board on the catcher's "Hep!". When
     the person has pressed nothing for 12 s the level takes a break, and the shared idle stop (CPU.idleStop) waits too.
     In 1-player mode it says short things ("Hep! Here I come!", "Let go on the gold!", "Open up!"). Team brains always
     play at full skill. */
  const M = () => MODES.trapeze;
  cpuBrain('trapeze', {
    reset(S) { S.hepCd = 0; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.flyer || info.intro || st.state !== 'go' || st.waiting) return out;
      const pl = M().plan(st), fl = st.flyer, human = !info.partnerCpu;
      if (p.id === st.catchId) {
        if (pl.pumpNow && pl.pumpDir) { if (pl.pumpDir < 0) out.left = true; else out.right = true; }
        if (S.hepCd > 0) S.hepCd -= dt;
        if (fl.state === 'board' && pl.hep && S.hepCd <= 0) { out.act = 'tap'; S.hepCd = 0.8; if (human) cpuSay(p, 'Hep! Here I come!', 1.4); }
        else if (fl.state === 'swing' || fl.state === 'air') out.act = true;
        if (human && fl.state === 'swing' && pl.glow > 0.6) cpuSay(p, 'Let go on the gold!', 1.2);
        if (human && fl.state === 'air' && fl.tuck && !pl.tuck) cpuSay(p, 'Open up!', 1.0);
        return out;
      }
      // the flyer
      if (fl.state === 'swing' && pl.letGo) out.act = 'tap';
      if (fl.state === 'air') {
        if (pl.tuck) out.jump = true;
        if (pl.steer < 0) out.left = true; else if (pl.steer > 0) out.right = true;
      }
      if (human && fl.state === 'board' && st.cat.A < 0.45) cpuSay(p, 'Swing higher, then Hep!', 1.6);
      if (human && fl.state === 'air' && pl.meet && pl.meet.t < 0.7 && !st.cat.reach) cpuSay(p, 'Reach for me!', 1.0);
      return out;
    },
  });
})();
