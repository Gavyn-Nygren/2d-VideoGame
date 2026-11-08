/* Pip & Bo - Computer partner brain for 22-2 Treasure Diver Rope. */
'use strict';

(() => {
  /* 22-2 Treasure Diver Rope (MODES.diverope): the computer does whichever job the dive gives it (G.mst.diver says who
     dives; the other one runs the boat) and reads what the team needs from G.mst.plan, made once a step by
     MODES.diverope.plan (the same thing the prompts, the job panels and the gold help read).
     BOAT: it holds ▼ (rope out) while the plan says 'out' (the diver is pulling on the hose and wants to go deeper),
     ▲ (reel in) while it says 'in' (the chest is hooked, the air is low, or the diver tugged to come up), and pumps
     air (a press every stroke, about 0.45 s apart, like a steady person) whenever the winch should stand still and the
     air isn't full. The plan already makes it stop letting out rope to pump when the air is under half, wait above an
     eel that is about to stretch out or a jellyfish drifting just below (or above, going up), and hold the winch while the diver walks along a ledge. It only lets out rope
     while the diver pulls on it, so it waits for a slow person; it never reels without a reason.
     DIVER: it swims toward the plan's x (the way through the next gap, round eels and jellyfish, past gems, then to the
     chest), with a speed it can stop from. It holds ▼ while the hose is tight and the plan wants rope (a tug, so a
     person in the boat sees "More rope!"), kicks (▲) when it's stuck against a low rock, and presses the action to
     hook the chest once it's in reach. Going up with the chest it steers out from under rocks (the plan's x for the
     way up).
     It can never clear a dive alone: as the diver it can't let out rope or reel in, and as the boat partner it can't
     hook the chest. With a person who does nothing it waits too (CPU.idleStop), and the gold help in the level only
     comes while both are pressing things.
     With a person it says short things ("More rope please!", "Reel me up!", "Pump some air!", "Eek!"). Bubbles only
     show in 1-player mode (cpuSay). Team brains always play at full skill. */
  const M = () => MODES.diverope;

  cpuBrain('diverope', {
    reset(S) { S.pumpT = 0; S.waitT = 0; S.eels = null; S.blubs = null; S.grabT = 0; S.stuckT = 0; },
    bubblePos(p) { return M().bubblePos(p); },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.d || !st.plan || info.intro || st.state !== 'ride') return out;
      const D = M().DROPE, d = st.d, pl = st.plan, human = !info.partnerCpu;
      if (p.id === st.boater) {
        if (pl.rope === 'out') out.down = true;
        else if (pl.rope === 'in') out.up = true;
        else {
          S.pumpT -= dt;
          if (st.air < 0.97 && S.pumpT <= 0) { out.act = 'tap'; S.pumpT = D.strokeT + 0.03; }
        }
        if (human) {
          // waiting on the person who dives
          S.waitT = pl.rope === 'hold' && !d.ground && Math.abs(pl.tx - d.x) > 60 ? S.waitT + dt : 0;
          if (pl.grab) cpuSay(p, 'Grab the chest!');
          else if (pl.why === 'eel' && pl.rope === 'hold') cpuSay(p, 'Wait... the eel is awake!');
          else if (pl.why === 'jelly' && pl.rope === 'hold') cpuSay(p, 'Wait for the jellyfish!');
          else if (pl.turbo && pl.rope === 'in') cpuSay(p, 'Air low! Reeling you up!');
          else if (pl.why === 'chest' && pl.rope === 'in') cpuSay(p, 'Got it! Reeling up!');
          else if (S.waitT > 3) cpuSay(p, pl.tx < d.x ? 'Swim left!' : 'Swim right!');
        }
      } else {
        // swim toward the plan's x with a speed it can stop from
        const dx = pl.tx - d.x, want = Math.abs(dx) < 5 ? 0 : clamp(dx * 2.6, -D.swimV, D.swimV);
        if (d.vx < want - 12) out.right = true; else if (d.vx > want + 12) out.left = true;
        // stuck against a low rock: kick over it
        if (Math.abs(dx) > 24 && Math.abs(d.vx) < 8 && d.ground) S.stuckT += dt; else S.stuckT = 0;
        if (S.stuckT > 0.25 && !d.chest) { out.jump = 'tap'; S.stuckT = 0; }
        // a gem a little above: kick up to it
        if (pl.gem && pl.gem.y < d.y - 24 - 18 && Math.abs(pl.gem.x - d.x) < 40 && !d.chest && d.kickCd <= 0 && d.ground) out.jump = 'tap';
        // a tug for more rope
        if (pl.rope === 'out' && pl.taut && !d.ground && !pl.up) out.down = true;
        // hook the chest
        S.grabT -= dt;
        if (pl.grab && S.grabT <= 0) { out.act = 'tap'; S.grabT = 0.3; }
        if (human) {
          if (pl.rope === 'out' && pl.taut && st.rope.mode !== 'out') cpuSay(p, 'More rope please!');
          else if (pl.rope === 'in' && st.rope.mode !== 'in') cpuSay(p, pl.turbo ? 'Air low! Reel me up!' : 'Reel me up!');
          else if (st.air < 0.6 && pl.rope === 'hold' && st.pumpAnim <= 0) cpuSay(p, 'Pump some air please!');
          else if (pl.snag) cpuSay(p, 'Snag! Hang on...');
        }
      }
      if (human) {
        const e = st.stats.eels, b = st.stats.blubs;
        if (S.eels != null && e > S.eels) cpuSay(p, p.id === st.diver ? 'Eek! Sorry, eel!' : 'Eek! You okay?', 1.6);
        if (S.blubs != null && b > S.blubs) cpuSay(p, 'Blub blub!', 1.6);
        S.eels = e; S.blubs = b;
      }
      return out;
    },
  });
})();
