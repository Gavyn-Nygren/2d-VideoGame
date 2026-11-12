/* Pip & Bo - Computer partner brain for 36-1 Car Chase, Take One (mode 'takeone'). */
'use strict';

(() => {
  /* 36-1 Car Chase, Take One (MODES.takeone): G.mst.drv drives this take; the other is the scene hero.
     Both jobs read MODES.takeone.plan(st), the same plan the prompts and the HUD chips read.
     SCENE HERO: reads the flats it can see, turns the dial to the next flat's scene and claps so the backdrop has
       finished rolling well before the car gets there (it chains claps on the cooldown in the Big Finish). It never
       claps to NIGHT with a REAL hazard close in the car's lane unless a full-width flat forces it, and holds the desert
       while the car is about to use a dune ramp.
     DRIVER: plans from the scene that will be showing when it gets there (it trusts this plan's clap when its partner is
       the computer; with a person on the dial it steers round a partial flat whose scene hasn't changed 0.7 s out),
       takes the lane with the longest clear run, hops low things and long-jumps off ramps for reels or the buses.
     Twitch guard: a lane or a dial direction is kept for at least 0.3 s once chosen.
     It can't finish alone: the level takes a break after 12 s with no person pressing anything. */
  const M = () => MODES.takeone;
  cpuBrain('takeone', {
    reset(s) { s.lane = null; s.laneT = 0; s.dir = 0; s.dirT = 0; s.nag = 0; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.car || info.intro || st.state !== 'go' || st.waiting) return out;
      // with a person at the dial, the driver plans from what is on screen
      const pl = M().plan(st, { cpuHero: p.id === st.drv ? !!info.partnerCpu : true }), c = st.car;
      s.laneT = Math.max(0, s.laneT - dt); s.dirT = Math.max(0, s.dirT - dt);
      if (p.id === st.drv) {
        if (s.lane === null || s.laneT <= 0) { if (pl.drv.lane !== s.lane) s.laneT = 0.3; s.lane = pl.drv.lane; }
        if (c.air <= 0) {
          if (s.lane < c.lane) out.jump = 'tap';
          else if (s.lane > c.lane) out.down = !(CPU.last[p.id] || {}).down;
        }
        if (pl.drv.hop) out.act = 'tap';
        const dx = pl.drv.x - c.x;
        if (dx > 30) out.right = true; else if (dx < -30) out.left = true;
        if (!info.partnerCpu) {
          const f = pl.flats[0];
          if (f && f.full && f.sc !== st.scene && !st.roll && f.ta < 1.3) cpuSay(p, 'Clap to ' + M().SCN[f.sc].word + '!', 1.2);
        }
      } else {
        const h = pl.hero;
        // hold the dial's direction: it steps on its own repeat (0.32 s, then 0.22 s) and is let go on the target
        if (h.dial > 0) out.right = true; else if (h.dial < 0) out.left = true;
        if (h.clap) out.act = 'tap';
        if (!info.partnerCpu) {
          const low = st.items.find(it => !it.done && M().active(it, st.scene) && ['cone', 'cable', 'steam', 'weed'].includes(it.k) && it.lanes.includes(c.lane) && M().eta(st, it) < 0.9 && M().eta(st, it) > 0.2);
          if (low && c.air <= 0) cpuSay(p, 'Stunt! Hop it!', 1.0);
        }
      }
      return out;
    },
  });
})();
