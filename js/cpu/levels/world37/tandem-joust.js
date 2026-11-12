/* Pip & Bo - Computer partner brain for 37-2 Tandem Joust Run (mode 'tandemjoust'). */
'use strict';

(() => {
  /* 37-2 Tandem Joust Run (MODES.tandemjoust): G.mst.rider rides, the other holds the lance. Both jobs read
     MODES.tandemjoust.plan(st), the same plan the prompts and the HUD chips read.
     RIDER: gallops (cantering for crowd crossings; mud slows it anyway), jumps ground things at plan.ride.jumpAt and
       holds the button for the jump length the plan asks for, holds ▼ under beams and ropes. It only jumps for the
       ground (so it never jumps into a low target), and the script never puts a low target inside a jump.
       With a person as lancer who has not couched for a while, it canters into quintains so a miss is only a pat.
     LANCER: sets the height for the next target early (the plan allows for the air step at contact), decides it once
       per target (it changes only when a straw knight switches), couches 0.42 s before contact and lets go at once
       after, lowers to middle for beams and lifts off low before landing on rough ground. Height steps are pressed one
       at a time (a tap each 0.16 s), like a person.
     It can't finish alone: the level takes a break after 12 s with no person pressing anything. */
  const M = () => MODES.tandemjoust;
  cpuBrain('tandemjoust', {
    reset(s) { s.hold = 0; s.stepT = 0; s.lastCouchT = -99; s.held = false; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.lance || info.intro || st.state !== 'go' || st.waiting) return out;
      const pl = M().plan(st), L = st.lance;
      if (p.id === st.rider) {
        const Rd = pl.ride;
        let speed = Rd.speed;
        // a person lancer who isn't couching: canter into quintains (a miss at a canter is only a pat)
        if (!info.partnerCpu) {
          if (L.couch) s.lastCouchT = st.T;
          const q = pl.ahead.find(a => a.kind === 'quintain' && a.t < 2);
          if (q && st.T - s.lastCouchT > 6) speed = 'canter';
        }
        // (never change pace in the air: it changes how far the jump carries)
        if (st.air) { /* keep the pace */ }
        else if (speed === 'gallop' && !st.gal) out.right = true;
        else if (speed === 'canter' && st.gal) out.left = true;
        if (Rd.duck) out.down = true;
        else if (st.air) { if (st.air.held && st.air.t < Rd.len - M().S.jump0 - 0.01) out.jump = true; }
        else if (Rd.jump) out.jump = 'tap';
        return out;
      }
      // ---- the lancer
      const Ln = pl.lance;
      s.stepT -= dt;
      if (L.set !== Ln.h && s.stepT <= 0) { if (Ln.h > L.set) out.jump = 'tap'; else out.down = true; s.stepT = 0.16; }
      else if (s.stepT > 0.08 && s.stepT < 0.16 && out.down === undefined) { /* let the key go between taps */ }
      if (Ln.couch && L.tired <= 0) out.act = true;
      if (!info.partnerCpu) {
        const g = pl.ahead.find(a => a.kind === 'ground' && a.t < 0.8 && a.t > 0);
        const bm = pl.ahead.find(a => a.kind === 'beam' && a.t < 0.6);
        if (bm && !st.duck) cpuSay(p, 'Duck!', 1);
        else if (g && !st.air) cpuSay(p, 'Jump!', 1);
      }
      return out;
    },
  });
})();
