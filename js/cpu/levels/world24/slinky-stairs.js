/* Pip & Bo - Computer partner brain for 24-3 Slinky Stairs (mode 'slinky'). */
'use strict';

(() => {
  /* 24-3 Slinky Stairs (MODES.slinky): the computer does whichever job the flight gives it (G.mst.flip says who flips;
     the other one steers) and reads what the team needs from G.mst.plan, made once a step by MODES.slinky.plan (the
     same thing the prompts, the HUD and the gold guide read).
     FLIPPER: when the slinky stands still on a step, points the right way (plan.pointOK) and nothing says wait (a
     marble about to be where it lands, a moving step out of reach, a slide), it presses and holds the action. It lets
     go when the swinging meter is at the middle of the green band (plan.zone.mc, which already aims away from a
     marble and to the near side of a shiny lid). If the way goes wrong while it holds, it keeps holding (the meter just
     swings) until it's right again. It waits for a person who steers, and asks them to point.
     STEERER: on a step it points the slinky the way the plan wants (plan.want: toward the next step, and on a branch
     the more-stars way unless the flight has had 4 whoas). In the air it leans toward where the slinky should land
     (plan.lean: the step's middle, the near side of a shiny lid, away from a marble), or first toward a rainbow bonus
     star on that hop. It presses its action (stick) once per flop, about 0.07 s before touchdown, for a "Perfect!",
     and holds ▼ while the slinky wobbles or slides.
     It can never clear a flight alone: as the flipper it can't point (a flop always goes the way the steerer pointed),
     and as the steerer it can't flop. With a person who does nothing it waits too (CPU.idleStop), and the level's gold
     help only comes while both are pressing things.
     With a person it says short things ("Point ▶ please!", "Let go in the green!", "Whoa! Again!"). Bubbles only show
     in 1-player mode (cpuSay). Team brains always play at full skill. */
  const M = () => MODES.slinky;

  cpuBrain('slinky', {
    reset(S) { S.waitT = 0; S.whoas = null; S.stuck = null; S.leanDir = 0; },
    bubblePos(p) { return M().bubblePos(p); },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.s || !st.plan || info.intro) return out;
      const s = st.s, pl = st.plan, human = !info.partnerCpu;
      if (p.id === st.flip) {
        if (s.state === 'rest') {
          const z = pl.zone, ready = !!(pl.target && z && pl.pointOK && !pl.wait);
          if (!s.hold) out.act = ready;
          else out.act = !(ready && Math.abs(s.m - z.mc) < 0.022);
          S.waitT = pl.target && !pl.pointOK && !s.hold ? S.waitT + dt : 0;
          if (human && S.waitT > 2.5) cpuSay(p, pl.want > 0 ? 'Point ▶ please!' : 'Point ◀ please!');
        } else S.waitT = 0;
      } else {
        if (s.state === 'rest') {
          if (pl.want && s.point !== pl.want) { if (pl.want > 0) out.right = true; else out.left = true; }
          if (pl.save) out.down = true;
          S.waitT = pl.target && pl.pointOK && !s.hold && !pl.wait ? S.waitT + dt : 0;
          if (human) {
            if (S.waitT > 4) cpuSay(p, 'Hold the button, let go in the green!');
            else if (pl.branch && pl.pick && pl.pick.way === 'stars') cpuSay(p, 'Let\'s go the starry way!');
          }
        } else if (s.state === 'teeter') out.down = true;
        else if (s.state === 'fly') {
          // lean toward the landing (a little dead zone so it doesn't wiggle)
          if (pl.lean > 0) out.right = true; else if (pl.lean < 0) out.left = true;
          // stick it, once per flop, just before touchdown
          if (pl.stick && S.stuck !== s.fly) { S.stuck = s.fly; out.act = 'tap'; }
        }
      }
      if (human) {
        const w = st.stats.whoas;
        if (S.whoas != null && w > S.whoas) cpuSay(p, 'Whoa! Again!', 1.6);
        S.whoas = w;
      }
      return out;
    },
  });
})();
