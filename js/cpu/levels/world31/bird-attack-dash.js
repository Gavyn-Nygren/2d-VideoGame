/* Pip & Bo - Computer partner brain for 31-3 Bird Attack Dash (mode 'birddash'). */
'use strict';

(() => {
  /* 31-3 Bird Attack Dash (MODES.birddash): G.mst.wat is the sky watcher this stretch, G.mst.dash the dasher. Both read
     MODES.birddash.plan(st), the same plan the prompts and HUD chips read.
     WATCHER: lies down under cover and holds ▼ to watch the sky whenever it is not moving on; taps the action about
       0.15 s after the robin starts staring (a warn); moves on to the next hiding spot only behind the dasher, and only
       while the sky is clear.
     DASHER: runs from cover to cover when the plan says the sky is clear (the watcher sees the robin circling, or the
       robin was just seen climbing away), hops twigs and stones, and when a strike spot shows while it is in the open it
       runs for the nearest cover and dive-rolls the last bit.
     What the computer knows about the robin is what the screen shows: the spyglass while the watcher looks, the robin
     itself while it is low, and the strike spot. It can't finish alone: the level takes a break after 12 s with no
     person pressing anything, and the shared idle stop (CPU.idleStop) waits as well. Team brains play at full skill. */
  const M = () => MODES.birddash;
  cpuBrain('birddash', {
    reset(S) { S.seeT = 0; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.c || info.intro || st.state !== 'go' || st.waiting) return out;
      const me = st.run[p.id];
      if (me.st !== 'run') return out;
      const pl = M().plan(st), job = p.id === st.wat ? pl.wat : pl.dash, human = !info.partnerCpu;
      if (p.id === st.wat && job.look && job.why !== 'hide') {
        out.down = true;
        if (job.warn) { S.seeT += dt; if (S.seeT > 0.15) out.act = 'tap'; } else S.seeT = 0;
        if (human && pl.danger && st.bird.tg === o.id) cpuSay(p, 'Hide! It\'s after you!', 1.2);
        else if (human && pl.watching && pl.phase === 'circle' && pl.dash.why === 'go') cpuSay(p, 'All clear! Run!', 1.2);
        return out;
      }
      S.seeT = 0;
      const dx = job.x - me.x;
      if (job.why !== 'wait' && job.why !== 'stay') { if (dx > 6) out.right = true; else if (dx < -6) out.left = true; }
      else if (job.why === 'stay' && Math.abs(dx) > 6) { if (dx > 0) out.right = true; else out.left = true; }
      if (job.dive && p.id === st.dash) out.act = 'tap';
      // hop the twigs and stones in the way
      const hw = M().S.bw / 2;
      if (me.grounded && (out.right || out.left)) for (const q of st.c.lows) {
        const gap = out.right ? q.x - (me.x + hw) : (me.x - hw) - (q.x + q.w);
        if (gap > -1 && gap < 30) { out.jump = 'tap'; break; }
      }
      if (human && p.id === st.dash && job.why === 'wait' && !pl.watching && !M().hidden(st, o) === false) cpuSay(p, 'Look up for me! Hold ▼', 1.4);
      return out;
    },
  });
})();
