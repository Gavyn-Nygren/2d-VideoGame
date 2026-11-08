/* Pip & Bo - Computer partner brain for 21-1 Hot Air Balloon Climb. */
'use strict';

(() => {
  /* 21-1 Hot Air Balloon Climb (MODES.balloon): the computer does whichever job the climb gives it (G.mst.burner says
     who burns; the other one steers) and reads what the crew needs from G.mst.plan, made once a step by
     MODES.balloon.plan (the same thing the prompts and job panels read): tx, where to steer, and vy, how fast to climb.
     BURNER: it holds the burner while the heat is below the heat that holds the wanted climb speed (plus a nudge for the
     difference between the wanted and the real speed), and lets go above it, with a little gap so it pulses like a
     person. It never lets the heat into the red (no sputter), unless the gold burner is on. The plan makes it wait
     under an island row, an island, the dock or a storm cloud that is over the balloon (so it waits for the steerer to
     line up with the gap), wait below a flock of birds that would be over it while it passes their height (then it
     burns up behind them), and over the dock it eases off to float down gently.
     STEERER: it pulls ◀ or ▶ toward the plan's x with a speed it can still stop from (bang-bang on the push it needs,
     with the wind and the gold breeze taken into account), and holds steady (the action) when it is there but still
     drifting. The plan's x threads the next gap, goes around storm clouds and islands, grabs stars and party balloons
     on the way when that's cheap, and lines up over the dock once above it.
     It can never climb alone: as the steerer it can't heat the balloon, and as the burner the plan keeps it waiting
     under the first island row (whose gap is never above the start). With a person who does nothing it waits too
     (CPU.idleStop).
     With a person it says short things ("Steer to the gap!", "Burn! Up we go!", "Little puffs!", "Bzzt!"). Bubbles only
     show in 1-player mode (cpuSay). Team brains always play at full skill. */
  const M = () => MODES.balloon;

  cpuBrain('balloon', {
    reset(S) { S.hold = false; S.holdT = 0; S.waitT = 0; S.lowT = 0; S.zaps = null; },
    bubblePos(p) { return M().bubblePos(p); },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.b || !st.plan || info.intro || st.state !== 'ride') { S.hold = false; return out; }
      const B = M().BALLOON, b = st.b, pl = st.plan, human = !info.partnerCpu;
      if (p.id === st.burner) {
        // the heat that holds the wanted climb, nudged by how far off the real climb is
        const lim = st.goldBurn ? 0.98 : B.hot - 0.03;
        const hw = Math.min(lim, M().heatFor(pl.vy) + clamp((pl.vy - b.vy) * 0.004, -0.3, 0.3));
        S.holdT += dt;
        if (b.sput > 0) S.hold = false;
        else if (S.hold && b.heat > hw + 0.02 && S.holdT > 0.1) { S.hold = false; S.holdT = 0; }
        else if (!S.hold && b.heat < hw - 0.02 && S.holdT > 0.08) { S.hold = true; S.holdT = 0; }
        if (b.heat > lim) S.hold = false;
        if (S.hold) out.act = true;
        if (human) {
          // waiting under something while the person steers
          S.waitT = pl.burn === 'wait' || pl.burn === 'hold' ? S.waitT + dt : 0;
          if (S.waitT > 2.2 && (pl.steer === 'left' || pl.steer === 'right')) cpuSay(p, pl.why === 'dock' ? 'Steer over the dock!' : pl.why === 'storm' ? 'Steer around the cloud!' : 'Steer to the gap!');
          else if (pl.burn === 'birds') cpuSay(p, 'Wait for the birds!');
          else if (pl.burn === 'land') cpuSay(p, 'Floating down...');
        }
      } else {
        // steer toward the plan's x, with a speed it can stop from
        const dx = pl.tx - b.x, wind = M().pushAt(st);
        const vWant = Math.abs(dx) < 6 ? 0 : clamp(dx * 1.7, -150, 150);
        const need = (vWant - b.vx) * 3 + b.vx * B.damp - wind;
        // pull in short bursts that add up to the push it needs (so it can hold still against the wind)
        S.sd = clamp((S.sd || 0) + need / B.steerA, -1.5, 1.5);
        if (S.sd > 0.5) { out.right = true; S.sd -= 1; } else if (S.sd < -0.5) { out.left = true; S.sd += 1; }
        if (Math.abs(dx) < 16 && Math.abs(b.vx) > 28 && Math.abs(wind) < 1) { out.act = true; out.left = out.right = false; }
        if (human) {
          // the person burns: ask for heat when nothing is in the way, and puffs over the dock
          S.lowT = (pl.burn === 'burn') && b.vy < 30 ? S.lowT + dt : 0;
          if (S.lowT > 2.5) cpuSay(p, b.h < 5 ? 'Burn! Up we go!' : 'Burn! Hold it up!');
          else if (pl.burn === 'hot' || pl.burn === 'cool') cpuSay(p, 'Too hot! Little puffs!');
          else if (pl.burn === 'land' && b.vy < -B.soft + 15) cpuSay(p, 'Slow! A little puff!', 1.2);
          else if (pl.burn === 'wait' && b.vy > 40) cpuSay(p, 'Wait! I\'m lining up!');
        }
      }
      if (human) {
        const z = st.stats.zaps + st.stats.birds;
        if (S.zaps != null && z > S.zaps) cpuSay(p, st.stats.birds > (S.birds || 0) ? 'Boing! Sorry, birdie!' : 'Bzzt! Oops!', 1.6);
        S.zaps = z; S.birds = st.stats.birds;
      }
      return out;
    },
  });
})();
