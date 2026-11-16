/* Pip & Bo - Computer partner brain for 31-1 Lawnmower Escape (mode 'mowrun'). */
'use strict';

(() => {
  /* 31-1 Lawnmower Escape (MODES.mowrun): G.mst.cut says who has the thorn this stretch; the other is the springer.
     Both jobs read MODES.mowrun.plan(st), the same plan the prompts and the HUD chips read: a target x for each job,
     whether to hold or tap the action, and when to jump.
     CUTTER: runs to the next clump and taps the action until it is through; at a pebble or stick it waits a little
       back, runs onto the tip of the springy grass blade the springer holds down and jumps (the blade flings it up),
       steers onto the top, then holds the action at the near edge to drop the kite string until the springer is on it.
     SPRINGER: holds the action at the foot of each pebble or stick (bending the springy grass down) until the cutter
       has been flung up, then stands under the string, jumps to grab it and holds ▲ to climb.
     Both hop the little things, and never run more than 300 px ahead of a person partner (the mower is behind!).
     It can't finish alone: the level takes a break after 12 s with no person pressing anything (the mower waits too),
     and the shared idle stop (CPU.idleStop) waits as well. Team brains always play at full skill. */
  const M = () => MODES.mowrun;
  cpuBrain('mowrun', {
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.c || info.intro || st.state !== 'go' || st.waiting || st.whirl) return out;
      const pl = M().plan(st), me = st.run[p.id], mate = st.run[o.id], job = p.id === st.cut ? pl.cut : pl.bst;
      if (me.st === 'climb') { out.up = true; out.jump = true; return out; }
      let tx = job.x;
      // don't leave a person behind in the open
      if (!info.partnerCpu && pl.kind === 'open' && me.x - mate.x > 300) tx = Math.min(tx, me.x);
      const dx = tx - me.x;
      if (me.st !== 'brace' && me.st !== 'reach') {
        if (dx > 7) out.right = true; else if (dx < -7) out.left = true;
      }
      if (job.act === 'tap') out.act = 'tap';
      else if (job.act) out.act = true;
      if (job.jump) out.jump = 'tap';
      if (!info.partnerCpu) {
        if (p.id === st.bst && pl.stage === 'jump' && me.st === 'brace') cpuSay(p, 'Jump on the tip!', 1.2);
        else if (p.id === st.cut && pl.stage === 'climb' && mate.st !== 'climb') cpuSay(p, 'Grab the string!', 1.2);
        else if (st.near > 0.75) cpuSay(p, 'Hurry! It\'s right behind us!', 1.4);
        else if (p.id === st.bst && pl.kind === 'grass' && mate.x < pl.O.x - 120) cpuSay(p, 'Chop the grass!', 1.4);
      }
      return out;
    },
  });
})();
