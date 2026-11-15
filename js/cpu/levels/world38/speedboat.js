/* Pip & Bo - Computer partner brain for 38-4 Speedboat Getaway (mode 'spyboat'). */
'use strict';

(() => {
  /* 38-4 (MODES.spyboat): the brain reads MODES.spyboat.plan(st). The plan looks at the water ahead the way the signs,
     the gate bars and the HUD show it (the brain knows the stretch's layout a little past the screen edge, as a person
     who has played it does):
     - as STEERER it holds ▲ / ▼ until the boat's channel is the plan's channel (the clearest run, a late dodge when a
       boat follows so it hits what we missed, crates when the gadgets are low, the low arch in the grab, away from a
       dropping net), holds into a wake, keeps the throttle full (full speed takes a ramp), and sounds the horn for
       gulls and fishing boats. With a person on the gadgets it says "Boost!" at a gate, and takes the slow way round
       if no Boost comes in time.
     - as GADGET agent it steps ◀ / ▶ to the plan's gadget and presses the action when the plan says use: Boost at a
       closing gate it can then make, before a ramp when the boat is too slow, off the final ramp, or to get away when
       the Chase meter is high (keeping one for what's ahead); Smoke for two chasers, a jet ski close or a net coming
       down; Oil for a boat right behind in our channel; Magnet for a mine in reach. It holds the action in the grab.
     It commits to a gadget for at least 0.3 s, and never presses the person's buttons. */
  const M = () => MODES.spyboat;
  cpuBrain('spyboat', {
    reset(s) { s.pickT = 0; s.pick = null; s.sayT = 0; s.useT = 0; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.b || info.intro || st.state !== 'go' || st.waiting) return out;
      const pl = M().plan(st), b = st.b;
      s.sayT -= dt; s.pickT -= dt; s.useT -= dt;
      if (p.id === st.steerId) {
        const P = pl.steer;
        if (P.brace) { if (P.brace > 0) out.jump = true; else out.down = true; }
        else if (P.lane > b.tl) out.jump = true;
        else if (P.lane < b.tl) out.down = true;
        if (b.thr < P.thr - 0.01) out.right = true; else if (b.thr > P.thr + 0.05) out.left = true;
        if (P.horn) out.act = 'tap';
        if (!info.partnerCpu) talkSteer(s, p, st, pl);
        return out;
      }
      const P = pl.gad;
      if (P.hold) { out.act = true; return out; }
      // the gadget to have under the finger: commit for 0.3 s unless one is needed right now
      let want = P.use || P.pick;
      if (s.pick && s.pickT > 0 && !P.use) want = s.pick;
      if (want !== s.pick) { s.pick = want; s.pickT = 0.3; }
      if (want && st.sel !== want) {
        const have = M().GADGETS.filter(n => n !== 'magnet' || st.k >= 2), i = have.indexOf(st.sel), j = have.indexOf(want);
        if (j >= 0) { const fwd = (j - i + have.length) % have.length; if (fwd <= have.length / 2) out.right = 'tap'; else out.left = 'tap'; }
        return out;
      }
      if (P.use && st.sel === P.use && s.useT <= 0) { out.act = 'tap'; s.useT = 0.25; }
      return out;
    },
  });
  function talkSteer(s, p, st, pl) {
    // a person on the gadgets: call the Boost at a closing gate, and a smoke-out when two are on us
    const g = pl.gad;
    if (s.sayT > 0 || !g.use) return;
    if (g.use === 'boost' && g.why === 'gate') { s.sayT = 3; cpuSay(p, 'Boost! The gate\'s closing!', 1.6); }
    else if (g.use === 'boost' && g.why === 'final') { s.sayT = 3; cpuSay(p, 'Boost! Now!', 1.4); }
    else if (g.use === 'smoke' && g.why === 'two') { s.sayT = 5; cpuSay(p, 'Two behind us! Smoke!', 1.6); }
  }
})();
