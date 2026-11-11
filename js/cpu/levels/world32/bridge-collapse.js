/* Pip & Bo - Computer partner brain for 32-2 Bridge Collapse (mode 'bridge'). */
'use strict';

(() => {
  /* 32-2 Bridge Collapse (MODES.bridge): G.mst.str says who is the stretchy hero this stretch; the other is the strong
     hero. Both jobs read MODES.bridge.plan(st), the same plan the prompts and the HUD chips read.
     STRONG HERO: walks to the bus and taps the action to lift it, carries it to just before the next gap, waits for the
       stretch and walks across, and carries it on to the tower at the end.
     STRETCHY HERO: goes to the edge of the next gap the bus has to cross (from whichever side it is on) and holds the
       action once the strong hero is close, keeps holding until the strong hero is off the far end, then lets go to
       boing across. It waits before a cracked slab so the two of them cross it together.
     Both wait before a live wire that is about to lash down, and hop for badges that hang just ahead when free.
     It can't finish alone: the level takes a break after 12 s with no person pressing anything, and the shared idle
     stop (CPU.idleStop) waits as well. Team brains always play at full skill. */
  const M = () => MODES.bridge;
  cpuBrain('bridge', {
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.c || info.intro || st.state !== 'go' || st.waiting) return out;
      const me = st.run[p.id];
      if (me.stun > 0 || me.st === 'rescue' || me.st === 'boing') return out;
      const pl = M().plan(st), str = p.id === st.str, job = str ? pl.str : pl.lift;
      if (me.st === 'span') { if (job.act) out.act = true; return out; }
      const dx = job.x - me.x;
      if (dx > 6) out.right = true; else if (dx < -6) out.left = true;
      if (job.act === 'tap') out.act = 'tap';
      else if (job.act) out.act = true;
      // a badge just ahead and up: hop for it (never with the bus, never next to a gap)
      const carrying = !str && st.bus.held, dir = out.right ? 1 : out.left ? -1 : 0;
      if (!carrying && dir && me.grounded && st.c.badges.some(q => !q.got && q.y < me.y - 60 && (q.x - me.x) * dir > 6 && (q.x - me.x) * dir < 36)) {
        const ahead = MODES.bridge.gaps(st).some(g => (dir > 0 ? g.a - me.x : me.x - g.b) > -4 && (dir > 0 ? g.a - me.x : me.x - g.b) < 120);
        if (!ahead) out.jump = 'tap';
      }
      if (!info.partnerCpu) {
        if (str && me.st === 'span' && pl.stage === 'cross') cpuSay(p, 'Walk across me!', 1.2);
        else if (str && pl.stage === 'span' && !pl.str.act) cpuSay(p, 'Bring the bus to the edge!', 1.4);
        else if (!str && pl.stage === 'walk' && Math.abs(me.x - pl.lift.x) < 20) cpuSay(p, 'Stretch over the gap!', 1.4);
        else if (!str && pl.stage === 'get' && Math.abs(me.x - st.bus.x) < 30) cpuSay(p, 'Got the bus!', 1.0);
      }
      return out;
    },
  });
})();
