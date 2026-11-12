/* Pip & Bo - Computer partner brain for 34-2 Ice Fortress Raid (mode 'icefort'). */
'use strict';

(() => {
  /* 34-2 Ice Fortress Raid (MODES.icefort): G.mst.axe says who has the axe this section; the other has the shield.
     Both jobs read MODES.icefort.plan(st), the same plan the prompts and the HUD chips read. The plan's route is a
     cheapest-path search over the wall's cells (moves cost 1, each chop a little more, runes a little less, spout
     columns and icicle columns more), to a rune stone in this section if one is left, else to the next ledge.
     AXE: chops the next cell on the route (hold the direction, tap the action) and climbs into it; knocks icicles loose;
       stops and tucks under the shield when a volley, icicle or roller is coming and the shield is over it; waits out
       spouts; never climbs 2 rows above the shield hero. If a person with the shield hasn't come within reach in 6 s it
       says "Over here!" and climbs back toward them.
     SHIELD: climbs onto the axe hero's hold, raises the shield as soon as a tell starts that reaches either of them and
       lowers it when clear so it can keep up, tilts it for rollers, steps out of a spout's column.
     Gusts: both hold ▼ to cling. Twitch guard: a direction is kept for 0.15 s and the shield for 0.3 s once raised.
     Team brains always play at full skill. */
  const M = () => MODES.icefort;
  const KEYS = { up: { jump: true }, ul: { jump: true, left: true }, ur: { jump: true, right: true }, l: { left: true }, r: { right: true }, d: { down: true }, dl: { down: true, left: true }, dr: { down: true, right: true } };
  cpuBrain('icefort', {
    reset(s) { s.upT = 0; s.waitT = 0; s.dir = null; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.g || info.intro || st.state !== 'go' || st.waiting) return out;
      const pl = M().plan(st), me = st.h[p.id], other = st.h[1 - p.id];
      if (me.stun > 0) return out;
      const cling = st.gust && (st.gust.state === 'warn' || st.gust.state === 'blow');
      if (p.id === st.axe) {
        const a = pl.axe;
        // patience with a person who has the shield and is far below
        if (!info.partnerCpu && me.r - other.r >= 2) { s.waitT = (s.waitT || 0) + dt; if (s.waitT > 6) cpuSay(p, 'Over here! Bring the shield!', 1.6); } else s.waitT = 0;
        if (cling) { out.down = true; return out; }
        if (s.waitT > 6 && me.r > other.r + 1) { Object.assign(out, KEYS.d); return out; }
        // the plan reads the hold being climbed into, so its direction is held through a move (no key flicker)
        if (a.dir) Object.assign(out, KEYS[a.dir]);
        if (a.chop && me.chopT <= -0.06 && me.mt <= 0) out.act = 'tap';
        if (!info.partnerCpu) {
          if (pl.danger && pl.danger.axe.t < 1.2 && st.h[st.shield].raise < 0.9) cpuSay(p, 'Shield up over me!', 1.2);
          else if (a.why === 'wait for shield') cpuSay(p, 'Climb up to me!', 1.4);
        }
      } else {
        const sh = pl.shield;
        s.upT = Math.max(0, (s.upT || 0) - dt);
        if (sh.up) s.upT = 0.3;
        const up = sh.up || s.upT > 0;
        if (up) { out.act = true; if (sh.tilt < 0) out.left = true; else if (sh.tilt > 0) out.right = true; }
        if (cling && !up) { out.down = true; return out; }
        if (sh.dir) {
          const k = KEYS[sh.dir];
          if (!(up && (k.left || k.right))) Object.assign(out, k);
        }
        if (!info.partnerCpu && st.h[st.axe].r - me.r >= 2 && !up) cpuSay(p, 'Wait for me and the shield!', 1.4);
      }
      return out;
    },
  });
})();
