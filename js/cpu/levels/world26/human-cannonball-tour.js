/* Pip & Bo - Computer partner brain for 26-3 Human Cannonball Tour (mode 'cannonball'). */
'use strict';

(() => {
  /* 26-3 Human Cannonball Tour (MODES.cannonball): G.mst.fly says who is the cannonball this tour; the other drives the
     net truck. Both jobs read MODES.cannonball.plan(st), the same plan the prompts and HUD chips read.
     CANNONBALL: aims (▲ ▼) to the cannon's own angle (the one its rings were hung for), fires when the plan says the net
     is parked under the landing ring, flaps for balloons just above or to stretch a shot the truck can't reach, and
     drifts toward the truck when it's far.
     DRIVER: drives toward plan.xWant (the landing ring before a shot, the predicted landing in flight, a cannonball in
     the sawdust, or the next cannon's loading spot), braking early so it stops there.
     It can't finish a tour alone (the cannonball can't move the truck, and the truck can't fire the cannon); after 12 s
     with no person pressing anything the level takes a break, and the shared idle stop (CPU.idleStop) waits too. */
  const M = () => MODES.cannonball;
  cpuBrain('cannonball', {
    reset(S) { S.wait = 0; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.c || info.intro || st.state !== 'go' || st.waiting) return out;
      const pl = M().plan(st), b = st.ball, tr = st.truck, human = !info.partnerCpu, Sx = M().S;
      if (p.id === st.drv) {
        const d = pl.xWant - tr.x, stopD = tr.v * tr.v / (2 * Sx.truckBrake) + 6;
        if (Math.abs(d) > 6) {
          const dir = Math.sign(d);
          if (Math.sign(tr.v) === dir && Math.abs(d) < stopD) { /* coast and brake */ }
          else if (dir > 0) out.right = true; else out.left = true;
        }
        if (human && b.state === 'aim' && pl.ready) cpuSay(p, 'Ready! Fire away!', 1.4);
        return out;
      }
      if (b.state === 'aim' && pl.aimWant != null) {
        const da = pl.aimWant - b.a;
        if (da > 0.02) out.jump = true; else if (da < -0.02) out.down = true;
        S.wait = pl.ready ? S.wait + dt : 0;
        if (pl.fire && S.wait > 0.25) out.act = 'tap';
        if (human && !pl.ready && Math.abs(pl.landX - tr.x) > 120) cpuSay(p, 'Park the net under the ring!', 1.6);
      }
      if (b.state === 'fly') {
        if (pl.flap) out.jump = 'tap';
        if (pl.drift < 0) out.left = true; else if (pl.drift > 0) out.right = true;
        if (human && Math.abs(pl.landX - tr.x) > 60) cpuSay(p, 'Catch me!', 1.0);
      }
      if (human && b.state === 'ride' && pl.dWhy === 'load') cpuSay(p, 'To the next cannon!', 1.4);
      return out;
    },
  });
})();
