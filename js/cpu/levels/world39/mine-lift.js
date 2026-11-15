/* Pip & Bo - Computer partner brain for 39-1 Mine Lift Plunge (mode 'cavelift'). */
'use strict';

(() => {
  /* 39-1 Mine Lift Plunge (MODES.cavelift): Pip cranks the left end, Bo the right. Both read
     MODES.cavelift.plan(st), the same plan the prompts and the HUD chips read.
     THE LIFT: plan.ahead[id] is how far this end is below where the plan wants it (the plan asks for a level lift, or a
       tilt to slip past a shelf). One side leads (the side the plan wants lower, Pip when level) and keeps lowering; the
       other follows: it holds while its end is more than 16 px ahead and lowers again under 6. Both ends then run down
       together at full speed, and the tilt follows the plan by itself. A person
       partner is followed the same way: the computer never runs off ahead of them.
       Knots: wind up (▲) that end while the plan says so. A snag: the snagged end holds and the
       other end lets out more, to tip the lift further. Slam brake when the plan says a snag is coming.
       Jobs on its own half (a sitting bat, a spark, the sliding crate): walk over and press the action, then walk back
       to the crank. Its end brakes while it is away, so the other side waits. Rocks: step out from under the shadow.
       Two seconds with both ends stopped and nothing to do: let out a little anyway (never stuck).
     THE SWING (stretch 4): Pip lowers when plan.lower says it is safe; Bo pumps the swing (runs the way it swings) up to
       the size the plan wants for a single spike, damps it (runs against it) for a pair, and holds the action on a
       chain when plan.grab says so. */
  const M = () => MODES.cavelift;
  cpuBrain('cavelift', {
    reset(s) { s.low = false; s.stopT = 0; s.job = null; s.sayT = 0; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst, id = p.id;
      if (!st || !st.items || info.intro || st.state !== 'go' || st.waiting) return out;
      const pl = M().plan(st), S = M().S, HOME = M().HOME;
      const solo = !info.partnerCpu;
      if (st.sw) {
        if (id === 0) { if (pl.lower) out.down = true; return out; }
        const sw = st.sw;
        if (pl.grab) { out.act = true; return out; }
        const want = pl.swing === 'pump' ? 135 : 4;
        const dir = Math.sign(sw.V) || 1;
        // a gem on Bo's wall coming up and no spike close: go and stand at that end to grab it
        const gem = st.items.find(it => it.kind === 'gem' && !it.done && it.side === 1 && it.d - st.y[0] < 330 && it.d - st.y[0] > -20);
        const spNear = pl.spike && pl.spike.d - st.y[0] < 260;
        if (gem && !spNear) { if (st.u[1] < S.LW - 34) out.right = true; return out; }
        // pump or damp in runs, not single steps (each starts outside a band around the size wanted and ends at it)
        if (!s.run) { if (pl.amp < want - 14) s.run = 'pump'; else if (pl.amp > want + 18) s.run = 'damp'; }
        else if (s.run === 'pump' ? pl.amp >= want : pl.amp <= want + 2) s.run = null;
        if (s.run === 'pump') { if (dir > 0) out.right = true; else out.left = true; }
        else if (s.run === 'damp' && Math.abs(sw.V) > 20) { if (dir > 0) out.left = true; else out.right = true; }
        if (solo && pl.why === 'wait') cpuSay(p, 'Wait for the swing!', 1.4);
        return out;
      }
      const u = st.u[id], home = HOME[id], atHome = Math.abs(u - home) < S.atCrank - 4;
      const walkTo = x => { if (x > u + 6) out.right = true; else if (x < u - 6) out.left = true; };
      // a rock shadow: step out from under it
      if (pl.dodge[id]) { if (pl.dodge[id] > 0) out.right = true; else out.left = true; return out; }
      // a job on my half (not while the lift needs my crank for a knot or a snag)
      let job = pl.jobs[id];
      // the crate only once the lift is level again (pushing it while tipped only stalls the lift), unless it is about to fall
      if (job && job.kind === 'crate' && Math.abs(pl.tilt) > 9 && job.u > 50 && job.u < S.LW - 50) job = null;
      // not while the lift is being tipped past a shelf: walking off stops my end, the tilt runs away and it snags or
      // lurches (a sitting bat, or a spark about to scorch the rope, still comes first)
      if (job && pl.why === 'shelf' && pl.dist < 260 && pl.dist > -40 && !(job.kind === 'bat' || job.urgent || job.kind === 'crate')) job = null;
      if (job && !pl.wind[id] && !pl.slam) {
        if (Math.abs(job.u - u) < 18) { out.act = 'tap'; }
        else walkTo(job.u);
        if (solo) cpuSay(p, job.kind === 'bat' ? 'Shoo, bat!' : job.kind === 'fire' ? 'Spark! Got it' : 'Saving the lamps!', 1.4);
        return out;
      }
      if (!atHome) { walkTo(home); return out; }
      if (pl.slam && st.slamCD <= 0) { out.act = 'tap'; return out; }
      if (pl.wind[id] && st.restT[id] <= 0) { out.jump = true; return out; }
      // lower while not ahead of the plan
      // one side leads (the side the plan wants lower; Pip when level) and keeps lowering, the other follows it, so
      // both run at full speed together instead of taking turns. With a person partner the computer always follows.
      const a = pl.ahead[id], lead = info.partnerCpu && id === (pl.dh > 0 ? 1 : 0);
      // (at a shelf the room between a Snag and a Lurch is small: the follower keeps closer to the plan's tilt, and the
      // leader only runs on ahead while the other end is moving too, or the tilt runs away into a Lurch)
      const tight = pl.why === 'shelf', alone = Math.abs(st.v[1 - id]) < 60;
      const stopAt = lead ? (tight && alone ? 12 : 40) : tight ? 12 : 16, goAt = lead ? (tight && alone ? 4 : 20) : tight ? 4 : 6;
      if (s.low && a > stopAt) s.low = false;
      else if (!s.low && a <= goAt) s.low = true;
      if (s.low) out.down = true;
      // a snag on the other end: tip it further (and never lower into a snag on mine)
      if (pl.more[id] && Math.abs(pl.tilt) < 20) out.down = true;
      if (st.block[id]) out.down = false;
      // never stuck: two seconds with both ends stopped
      if (Math.abs(st.v[0]) + Math.abs(st.v[1]) < 5) s.stopT += dt; else s.stopT = 0;
      if (s.stopT > 2 && a < 30) out.down = true;
      if (solo) {
        if (a < -50 && st.v[1 - id] > 30) cpuSay(p, 'Slow down! Keep it level', 1.6);
        else if (pl.why === 'shelf' && pl.dist < 200) cpuSay(p, (pl.next.side === id ? 'My side goes high!' : 'Tip it! Your side high!'), 1.6);
        else if (pl.narrow) cpuSay(p, 'Narrows! Keep it level', 1.6);
      }
      return out;
    },
  });
})();
