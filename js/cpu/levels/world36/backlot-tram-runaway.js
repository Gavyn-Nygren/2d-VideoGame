/* Pip & Bo - Computer partner brain for 36-2 Backlot Tram Runaway (mode 'tramrun'). */
'use strict';

(() => {
  /* 36-2 Backlot Tram Runaway (MODES.tramrun): G.mst.brk rides the brake this take; G.mst.run is the runner.
     Both jobs read MODES.tramrun.plan(st), the same plan the prompts and the HUD chips read.
     BRAKE HERO: walks to the car the plan names (the front for the brake, the car the runner is jumping for), holds
       the action for the brake in the plan's short pulls (it lets go before the brake cooks), throws the next switch
       to the plan's line (one press, ▲ or ▼), and taps the action for a catch.
     RUNNER: jumps off the front (▶ + jump) when there is a job ahead, runs to the job's spot (walking up the ramp or
       jumping onto the trestle for the upper line, ▼ + jump to drop off it), pushes by holding ▶, taps cranks and
       plugs, holds levers and the big red lever, calls at the fork sign (▲ or ▼), jumps for high tickets, and hops back
       aboard as the front car arrives when there is nothing left to do.
     Twitch guard: a walking direction has a deadband, and ▲ / ▼ are let go between presses.
     It can't finish alone: the level takes a break after 12 s with no person pressing anything. */
  const M = () => MODES.tramrun;
  const toggle = (p, k) => !(CPU.last[p.id] || {})[k];
  cpuBrain('tramrun', {
    reset(s) { s.swT = 0; s.tapT = 0; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.tram || info.intro || st.state !== 'go' || st.waiting) return out;
      const m = M(), pl = m.plan(st), T = st.tram, S = m.S;
      s.swT = Math.max(0, s.swT - dt); s.tapT = Math.max(0, s.tapT - dt);
      if (p.id === st.brk) {
        const B = pl.brk;
        // stand on the plan's car (the middle of it)
        const tgt = B.car * (S.carL + S.carGap) + (B.car === 0 ? 30 : S.carL / 2), dx = tgt - st.bh.off;
        if (dx > 14) out.left = true; else if (dx < -14) out.right = true;
        if (B.catch) out.act = 'tap';
        else if (B.hold && m.bhCar(st) === 0) out.act = true;
        // the switch: one press, then let go
        if (B.sw && s.swT <= 0) { if (B.sw === 'up') out.up = toggle(p, 'up'); else out.down = toggle(p, 'down'); if (out.up || out.down) s.swT = 0.2; }
        if (!info.partnerCpu) {
          const r = st.rn;
          if (r.on === 'car' && pl.jobs[0] && (pl.jobs[0].x - T.x) / Math.max(40, T.v) < 6) cpuSay(p, 'Off you go! Clear the line!', 1.4);
        }
        return out;
      }
      // ---- the runner
      const R = pl.run, r = st.rn;
      if (r.daze > 0) return out;
      if (r.on === 'car') {
        // a job ahead: walk to the front and jump off forwards
        if (R.x !== null && R.x > T.x - 10) {
          out.right = true;
          if (r.car === 0 && r.off < 12) out.jump = 'tap';
        }
        return out;
      }
      if (r.on === 'air') {
        // steer toward the target (or the front car when boarding)
        const tx = R.x !== null ? R.x : T.x - 50;
        if (tx - r.x > 10) out.right = true; else if (tx - r.x < -10) out.left = true;
        return out;
      }
      if (R.x === null) {
        // nothing left to do: stand on the tram's line a little ahead and hop as the front car arrives
        const line = m.tramLine(st, r.x);
        if (r.line === 'up' && line !== 'up') { out.down = true; out.jump = 'tap'; return out; }
        const gap = r.x - T.x;
        if (gap < 0) { out.right = true; return out; }
        if (gap < 70) out.jump = 'tap';
        else if (gap > 260) out.left = true;
        return out;
      }
      // behind the front of the tram on its line: jump onto the cars (the brake hero stands by to catch)
      if (r.x < T.x - 6 && r.line === m.tramLine(st, r.x) && !(R.act || R.push)) {
        out.right = true;
        if (r.x > T.x - m.TRAM_L - 50) out.jump = 'tap';
        return out;
      }
      // change line
      if (R.line === 'up' && r.line !== 'up' && Math.abs(R.x - r.x) < 520) {
        const fo = m.forkAt(st, R.x);
        if (fo && r.x > fo.x0 - 40) {
          if (r.x - fo.x0 < 40 && r.x >= fo.x0 - 1) out.up = true;
          else if (r.x >= fo.x0) out.jump = 'tap';
          else out.right = true;
          if (out.up || out.jump) { if (R.x - r.x > 10) out.right = true; return out; }
        }
      }
      if (R.line !== 'up' && r.line === 'up') { out.down = true; out.jump = 'tap'; return out; }
      // the call at the fork sign
      if (R.why === 'call' && Math.abs(r.x - R.x) < 26) {
        if (R.call === 'up') out.up = true; else out.down = true;
        return out;
      }
      // work
      if (R.push) { out.right = true; return out; }
      // a tap a beat (a person's pace, and the crank's own gap)
      if (R.act === 'tap') { if (s.tapT <= 0) { out.act = 'tap'; s.tapT = 0.12; } return out; }
      if (R.act === 'hold') { out.act = true; return out; }
      const dx = R.x - r.x;
      if (dx > 8) out.right = true; else if (dx < -8) out.left = true;
      // a high ticket: jump as it comes
      if (R.why === 'ticket' && R.jumpFor && Math.abs(dx) < 50) out.jump = 'tap';
      return out;
    },
  });
})();
