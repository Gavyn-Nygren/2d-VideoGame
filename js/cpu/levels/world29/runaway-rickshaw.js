/* Pip & Bo - Computer partner brain for 29-3 Runaway Rickshaw (mode 'rickshaw'). */
'use strict';

(() => {
  /* 29-3 Runaway Rickshaw (MODES.rickshaw): G.mst.steer says who steers this stretch; the other is the sword rider.
     Both jobs read MODES.rickshaw.plan(st), the same plan the prompts and the HUD chips read.
     STEERER: holds ▲ or ▼ until the rickshaw is heading for the lane the plan picked (round tall things, onto the ramp
     before a canal, into the open lane of a narrow bridge, through dumplings), and taps the action to hop when the plan
     says (a low thing or a ditch right in front, or dumplings in the air). It never brakes by itself, except to give a
     person a breather: when the person on the sword has just been bonked dizzy it drags a foot until they are up again.
     SWORD RIDER: points the sword (◀ behind, ▶ ahead, ▲ up) at the side of the star that arrives soonest (or of the
     next warning), holds ▼ under a lantern gate, and taps the action about 0.09 s before the star arrives, which is
     inside the "great" window, so its stars fly back and bonk the thrower.
     It can't finish alone: the level takes a break after 25 s with no person pressing anything (the rickshaw is held
     still), and the shared idle stop (CPU.idleStop) waits too. Team brains always play at full skill. */
  const M = () => MODES.rickshaw;
  cpuBrain('rickshaw', {
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.c || info.intro || st.state !== 'go' || st.waiting) return out;
      const pl = M().plan(st), human = !info.partnerCpu, rk = st.rk, rd = st.rd;
      if (p.id === st.steer) {
        if (pl.lane !== rk.laneT) { if (pl.lane === 0) out.up = true; else out.down = true; }
        if (pl.hop) out.act = 'tap';
        if (human) {
          if (rd.dizzy > 0) out.left = true;
          if (pl.duck && !rd.duck) cpuSay(p, 'Duck!', 1.0);
          else if (pl.rWhy === 'aim') cpuSay(p, pl.dir === 'a' ? 'Star ahead!' : pl.dir === 'b' ? 'Behind you!' : 'Above you!', 1.1);
          else if (rk.air && rk.ramp) cpuSay(p, 'Wheeee!', 1.0);
        }
        return out;
      }
      // the sword rider
      if (pl.duck) out.down = true;
      if (pl.aim !== rd.aim && rd.swing <= 0) { if (pl.aim === 'k') out.up = true; else if (pl.aim === 'a') out.right = true; else out.left = true; }
      if (pl.swing) out.act = 'tap';
      if (human) {
        if (pl.sWhy === 'swerve' && pl.what !== 'bao') cpuSay(p, pl.what === 'ramp' ? 'Take the ramp!' : pl.what === 'bridge' ? 'Narrow bridge!' : 'Swerve!', 1.1);
        else if (pl.hopSoon) cpuSay(p, pl.what === 'ditch' ? 'Hop the ditch!' : 'Hop!', 1.0);
        else if (rk.brake && rk.v > 60) cpuSay(p, 'Faster! I have got this!', 1.4);
      }
      return out;
    },
  });
})();
