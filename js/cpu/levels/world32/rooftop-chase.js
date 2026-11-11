/* Pip & Bo - Computer partner brain for 32-3 Rooftop Chase (mode 'roofchase'). */
'use strict';

(() => {
  /* 32-3 Rooftop Chase (MODES.roofchase): G.mst.web says who is the web-slinger this stretch; the other is the ghost.
     Both jobs read MODES.roofchase.plan(st), the same plan the prompts and the HUD chips read.
     WEB-SLINGER: runs to the edge of the next wide gap, taps for a web line once the ghost is close, and while swinging
       lets go at the first moment the let-go would land well onto the far roof (plan.web.act, from predict()).
     GHOST: comes next to the web-slinger and taps to hold on. Before a guard drone, the two meet just outside its
       beams; the ghost waits there until the meter is full enough for the whole way, then holds the action and walks
       through while the web-slinger keeps right beside it (holding hands).
     Both jump small gaps, steps, air-conditioner boxes and vents on their own (the level's boxes and gaps), and hop for
     jewels just ahead and up when nothing is in the way.
     It can't finish alone: the level takes a break after 12 s with no person pressing anything, and the shared idle
     stop (CPU.idleStop) waits as well. Team brains always play at full skill. */
  const M = () => MODES.roofchase;
  // jump now to clear what is just ahead (a wall or box taller than a step, or the edge of a small gap)
  function needJump(st, me, dir) {
    const hw = 11;
    for (const b of st.box) {
      const gap = dir > 0 ? b.x0 - (me.x + hw) : (me.x - hw) - b.x1;
      if (gap >= -1 && gap < 22 && b.top < me.y - 2 && b.bot > me.y - 20) return true;
    }
    for (const g of st.c.gaps) {
      if (g.wide) continue;
      const d = dir > 0 ? g.a - me.x : me.x - g.b;
      if (d >= -4 && d < 28) return true;
    }
    return false;
  }
  cpuBrain('roofchase', {
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.c || info.intro || st.state !== 'go' || st.waiting) return out;
      const me = st.run[p.id];
      if (me.stun > 0 || (me.st !== 'run' && me.st !== 'aim' && me.st !== 'swing')) return out;
      const pl = M().plan(st), web = p.id === st.web, job = web ? pl.web : pl.ghost;
      if (me.st === 'swing') { if (web && job.act) out.act = 'tap'; return out; }
      const dx = job.x - me.x;
      let dir = 0;
      if (me.st !== 'aim') { if (dx > 6) { out.right = true; dir = 1; } else if (dx < -6) { out.left = true; dir = -1; } }
      if (job.act === 'tap') out.act = 'tap';
      else if (job.act) out.act = true;
      if (dir && me.grounded && needJump(st, me, dir)) out.jump = 'tap';
      // hop for a jewel just ahead and up (not near a gap's edge, not while sneaking)
      if (!out.jump && dir && me.grounded && pl.stage !== 'sneak' && st.c.jewels.some(q => !q.got && q.y < me.y - 60 && q.y > me.y - 110 && (q.x - me.x) * dir > 4 && (q.x - me.x) * dir < 34)) {
        const R = M().roofAt(st.c, me.x);
        if (R && me.x - R.x0 > 50 && R.x1 - me.x > 50) out.jump = 'tap';
      }
      if (!info.partnerCpu) {
        const mate = st.run[o.id];
        if (web && st.swing && st.swing.state === 'ready') cpuSay(p, 'Hold on to me!', 1.4);
        else if (!web && pl.stage === 'charge') cpuSay(p, 'Wait, my power is charging!', 1.4);
        else if (!web && pl.stage === 'sneak' && me.inv && !mate.inv) cpuSay(p, 'Hold my hand! Stay close!', 1.4);
        else if (web && pl.stage === 'sneak' && !me.inv && Math.abs(mate.x - me.x) < 60) cpuSay(p, 'Make us vanish!', 1.4);
      }
      return out;
    },
  });
})();
