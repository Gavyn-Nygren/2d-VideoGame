/* Pip & Bo - Computer partner brain for 26-2 Clown Car Getaway (mode 'clowncar'). */
'use strict';

(() => {
  /* 26-2 Clown Car Getaway (MODES.clowncar): G.mst.drive says who drives this stretch; the other is the popper. Both
     jobs read MODES.clowncar.plan(st), the same plan the prompts and the HUD chips read.
     DRIVER: a speed controller toward plan.vWant (the stretch's pace, slower before an animal that hasn't been shooed,
     creeping to scoop up a clown waiting by the road), and a hop when the plan says (just before a pie or a peel).
     POPPER: leans toward where the next leaping clown will come down (or over a waiting one), ducks for banners, honks
     at animals ahead.
     It can't finish a stretch alone: the level takes a break after 15 s with no person pressing anything, and the shared
     idle stop (CPU.idleStop) waits too. Team brains always play at full skill. */
  const M = () => MODES.clowncar;
  cpuBrain('clowncar', {
    reset(S) { S.honkCd = 0; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.c || info.intro || st.state !== 'go' || st.waiting) return out;
      const pl = M().plan(st), human = !info.partnerCpu, car = st.car, pp = st.pp;
      if (p.id === st.drive) {
        const dv = pl.vWant - car.v;
        if (dv > 6) out.right = true;
        else if (dv < -6) { if (pl.vWant < 0 && car.v <= 2) out.left = true; else out.down = true; }
        if (pl.hop) out.jump = 'tap';
        if (human) {
          if (pl.honk) cpuSay(p, 'Honk at them!', 1.4);
          else if (pl.duck && !pp.duck) cpuSay(p, 'Duck!', 1.0);
          else if (pl.pWhy === 'catch' && Math.abs(pl.uWant - pp.u) > 14) cpuSay(p, 'Catch that clown!', 1.2);
        }
        return out;
      }
      if (pl.duck) out.down = true;
      else {
        const du = pl.uWant - pp.u;
        if (du > 4) out.right = true; else if (du < -4) out.left = true;
      }
      if (S.honkCd > 0) S.honkCd -= dt;
      if (pl.honk && S.honkCd <= 0 && !pl.duck) { out.act = 'tap'; S.honkCd = 0.5; }
      if (human) {
        if (pl.dWhy === 'pie' && pl.pie && pl.pie.x - car.s < 260) cpuSay(p, 'Hop over the pie!', 1.2);
        else if (pl.dWhy === 'scoop' && Math.abs(car.v) > 100) cpuSay(p, 'Slow down, I can grab them!', 1.6);
        else if (car.v < st.c.pace - 70 && pl.dWhy === 'pace') cpuSay(p, 'Faster!', 1.2);
      }
      return out;
    },
  });
})();
