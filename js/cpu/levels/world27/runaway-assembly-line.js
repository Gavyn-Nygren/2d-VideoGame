/* Pip & Bo - Computer partner brain for 27-2 Runaway Assembly Line (mode 'runbelt'). */
'use strict';

(() => {
  /* 27-2 Runaway Assembly Line (MODES.runbelt): G.mst.runner rides the belt, G.mst.fixer runs the catwalk. Both read
     MODES.runbelt.plan(st) (world coordinates): the next open gap ahead of the runner, the next switch box the fixer
     should hit, the next stamper and its state, and the next catwalk gap.
     RUNNER: stays about a third of the way across the screen. Before a small open gap it runs at it and jumps from
     just before the edge; it never walks up to a wide open gap (it waits for the fix). Before a stamper it waits just
     short of the press unless the press will stay up long enough to run right under it; if it is under a press it runs
     on out. After a Boing (the line waits) it jumps the gap at once.
     FIXER: runs to the next open gap's switch box and presses the action there; with nothing to fix it keeps well
     ahead of the line. It jumps catwalk gaps and steps from just before them, and gets back on when it falls behind.
     It can't finish a stretch alone: the runner can't fix a wide gap, the fixer can't bring the runner over a gap. In
     1-player mode it says short things ("Fix the wide gap!", "Jump!"). Team brains play at full skill. */
  const RB = () => MODES.runbelt;
  cpuBrain('runbelt', {
    reset(S) { S.stuck = 0; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.belts || info.intro || st.state !== 'play' || st.onBreak || !p.alive || st.boing[p.id]) return out;
      const B = RB().BELT, pl = RB().plan(st), off = pl.off, human = !info.partnerCpu;
      const x = p.x + off, cx = x + p.w / 2, ground = p.grounded;
      if (p.id === st.runner) {
        let tx = off + 320;
        const g = pl.gapR, front = x + p.w;
        let jump = false;
        if (g && g.x0 - front < 260) {
          if (g.wide && RB().open(g)) { tx = Math.min(tx, g.x0 - 50); if (human) cpuSay(p, 'Fix the wide gap!', 1.8); }
          else {
            tx = g.x1 + 60;
            const lead = 10 + (st.running ? st.v * 0.04 : 0);
            if (ground && g.x0 - front < lead && g.x0 - front > -14) jump = true;
          }
        }
        const s = pl.stamp;
        if (s) {
          const hw = B.headW / 2, ss = pl.ss, under = front > s.x - hw && x < s.x + hw;
          if (under) tx = Math.max(tx, s.x + hw + 40);
          else if (s.x - hw - front < 180 && s.x - hw > front - 4) {
            const pass = (s.x + hw + 6 - x) / (220 + (st.running ? st.v : 0));
            const safe = ss.ph === 'sleep' || (ss.ph === 'up' && ss.until > pass + 0.15) || (ss.ph === 'rise' && !ss.danger && ss.y < B.BY - 120);
            if (!safe) tx = Math.min(tx, s.x - hw - 30);
            else tx = Math.max(tx, s.x + hw + 40);
          }
        }
        if (st.camX >= st.len - 961) tx = Math.max(tx, st.endX + 120);
        const d = tx - cx;
        if (d > 6) out.right = true; else if (d < -6 || (st.running && d < 0)) out.left = true;
        if (jump) { out.jump = true; out.right = true; out.left = false; }
        if (!ground && p.vy < 0) out.jump = true; // (hold for the full jump)
        return out;
      }
      // the fixer
      let tx = off + 720, act = false;
      const g = pl.gapF;
      if (g) {
        if (g.goldSw) act = true;
        else {
          tx = g.sw.x;
          if (Math.abs(g.sw.x - cx) < B.switchR - 10 && ground) act = true;
        }
        if (human && g.wide && g.x0 - (pl.rx) < 500) cpuSay(p, 'I\'ll fix it!', 1.4);
      }
      tx = Math.max(tx, off + 40);
      // a catwalk gap just ahead: cross it at full speed (a slow hop falls short)
      const cg = pl.cgap;
      if (cg && cg.x0 > cx - 10 && cg.x0 - cx < 90 && tx > cg.x0 - 40) tx = Math.max(tx, cg.x1 + 50);
      if (st.camX >= st.len - 961 && !g) tx = st.endX + 160;
      const d = tx - cx, dir = d > 0 ? 1 : -1;
      if (Math.abs(d) > 8) { if (dir > 0) out.right = true; else out.left = true; }
      if (act && g && g.fixT <= 0) out.act = 'tap';
      // catwalk gaps and steps ahead
      if (ground) {
        const sol = RB().fixerSolids(st), feet = p.y + p.h, ahead = cx + dir * 30;
        const here = sol.find(q => ahead > q.x && ahead < q.x + q.w && Math.abs(q.y - feet) < 6);
        const step = sol.find(q => ahead > q.x && ahead < q.x + q.w && q.y < feet - 6);
        if ((out.left || out.right) && (!here || step)) out.jump = true;
      } else if (p.vy < 0) out.jump = true;
      if (!ground && human && st.jam && st.jam.kind === 'fall') cpuSay(p, 'Jump it!', 1.4);
      return out;
    },
  });
})();
