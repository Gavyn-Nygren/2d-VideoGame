/* Pip & Bo - Computer partner brain for 29-1 Rooftop Moonlight Run (mode 'roofrun'). */
'use strict';

(() => {
  /* 29-1 Rooftop Moonlight Run (MODES.roofrun): G.mst.thr says who throws the hook this stretch; the other swings.
     Both jobs read MODES.roofrun.plan(st), the same plan the prompts and HUD chips read, and run with
     MODES.roofrun.nav(st, id, x) (hop small gaps, steps and cats; stop at a wide gap; wait for a crumbly roof).
     THROWER: runs to the throwing strip at the edge of the next wide gap, throws when the plan says the sweeping aim
     line will pass through the ring, gives the swinger one tug at the back of the swing, then holds the action all the
     way across while the swinger heaves.
     SWINGER: waits by the peg, grabs the rope once the hook has bitten, leans the way it is swinging, leaps off as soon
     as the plan says the leap lands on the far roof, then heaves in rhythm (a tap the moment the rope is ready).
     It waits for a person who has fallen behind, and it can't finish alone: the thrower can't cross without someone
     swinging over to pull, and the swinger has no hook. After 12 s with no person pressing anything the level takes a
     break, and the shared idle stop (CPU.idleStop) waits too. */
  const M = () => MODES.roofrun;
  cpuBrain('roofrun', {
    reset(S) { S.t = 0; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.c || info.intro || st.state !== 'go' || st.waiting) return out;
      const pl = M().plan(st), thr = p.id === st.thr, me = st.run[p.id], pal = st.run[o.id], w = thr ? pl.thr : pl.swg;
      const human = !info.partnerCpu, g = pl.g;
      if (me.st === 'run') {
        let tx = w.x;
        // a person who has fallen behind: wait for them
        if (human && tx != null && tx > me.x && me.x - pal.x > 380) { tx = null; cpuSay(p, 'This way!', 1.4); }
        const nv = M().nav(st, p.id, tx);
        if (nv.dir > 0) out.right = true; else if (nv.dir < 0) out.left = true;
        if (nv.jump) out.jump = true;
      } else if (me.st === 'swing') {
        if (w.dir > 0) out.right = true; else if (w.dir < 0) out.left = true;
      }
      if (w.act === 'tap') out.act = 'tap'; else if (w.act === 'hold') out.act = true;
      if (!human || !g) return out;
      // short, helpful words for the person
      const near = pal.x > g.xL - 320 || pal.x > g.xR;
      if (thr) {
        if (pl.phase === 'swing' && !pl.onRope && near) cpuSay(p, pl.canGrab ? 'Grab the rope!' : 'Come to the rope!', 1.6);
        else if (pl.phase === 'swing' && pl.letGo) cpuSay(p, 'Leap now!', 0.8);
        else if (pl.phase === 'pull' && pl.holding) cpuSay(p, 'Heave ho! Pull me over!', 1.6);
      } else {
        if (pl.phase === 'throw' && me.x > g.xL - 200 && near) cpuSay(p, pl.aiming ? 'Hook the ring!' : 'Throw from the edge!', 1.6);
        else if (pl.phase === 'swing' && pl.tug) cpuSay(p, 'Give me a tug!', 0.8);
        else if (pl.phase === 'pull' && !pl.holding) cpuSay(p, 'Hold on tight!', 1.6);
      }
      return out;
    },
  });
})();
