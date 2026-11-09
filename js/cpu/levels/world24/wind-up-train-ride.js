/* Pip & Bo - Computer partner brain for 24-1 Wind-Up Train Ride (mode 'windtrain'). */
'use strict';

(() => {
  /* 24-1 Wind-Up Train Ride (MODES.windtrain): G.mst.wind says who winds this stretch; the other is the switcher. Both
     jobs read MODES.windtrain.plan(st), the same plan the prompts and the HUD chips read: the first thing ahead the
     train must stop for (a block, a lever set to the dead end, the raised drawbridge, a bouncing toy that will be down
     when the engine gets there, a station with a passenger, the end station) with brake = "brake now" and hold = "keep
     the brake on here"; and the switcher's next job (rx, ry where to stand, act = a press does it now).
     WINDER: holds ▼ while the plan says brake, and otherwise winds with a steady rhythm of about 0.42-0.58 s (the gold
     window is 0.3-0.7 s), never with the spring nearly full (so it never sproings). It also winds while braked, so the
     train leaves a stop with a full spring. It waits at a stop for the switcher however long it takes.
     SWITCHER: runs to the plan's spot (or, with nothing to do, to just ahead of the engine), jumps gaps it is about to
     run into, roaming dust bunnies just ahead and onto anything above it, and jumps when it has been stuck a moment.
     With time to spare it hops for a high star near its path. It presses the action when the plan says a press does
     the job now (at a station and at the bell that means once the winder has the train stopped with the brake on).
     It can't finish a stretch alone: as the winder it can't flip, kick or ring; as the switcher it can't move the train.
     In 1-player mode it says short things ("Flip the lever!", "Brake now!", "Ring the bell!"). It never cheats with
     level state: everything it reads is on screen (the plan only looks at what the players can see). Team brains always
     play at full skill. */
  const M = () => MODES.windtrain;

  cpuBrain('windtrain', {
    reset(S) { S.beat = 0.5; S.stuckT = 0; S.lastX = null; S.hopT = 0; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.c || info.intro || st.state !== 'go' || st.waiting) return out;
      const D = M().WTR, pl = M().plan(st), tr = st.tr, human = !info.partnerCpu;
      if (p.id === st.wind) {
        if (pl.brake) out.down = true;
        const since = st.roomT - tr.lastPress;
        if (tr.sproing <= 0 && tr.spring < 0.86 && since >= S.beat) { out.act = 'tap'; S.beat = 0.42 + Math.random() * 0.16; }
        if (human && pl.job) {
          const j = pl.job;
          if (pl.brake || pl.hold) {
            if (j.kind === 'lever' && !pl.bonus) cpuSay(p, 'Flip the lever!', 1.8);
            else if (j.kind === 'block') cpuSay(p, j.o.kind === 'bunny' ? 'Shoo the bunny!' : 'Kick it off the track!', 1.8);
            else if (j.kind === 'bridge') cpuSay(p, 'Lower the bridge!', 1.8);
            else if (j.kind === 'station' && !pl.wait) cpuSay(p, 'Help ' + j.o.name + ' on!', 1.8);
            else if (j.kind === 'end' && !pl.wait) cpuSay(p, 'Ring the bell!', 1.8);
          }
        }
        return out;
      }
      // the switcher
      const s = st.sw, F = D.FLOOR;
      let tx = tr.x + 150, ty = F, urgent = false;
      if (pl.job && pl.rx != null && pl.job.x - tr.x < 1200) { tx = pl.rx; ty = pl.ry; urgent = true; }
      // spare time: hop for a high star near the way
      if (!urgent || pl.job.x - tr.x > 500) {
        let best = null;
        for (const q of st.c.stars) if (!q.got && q.x > s.x - 60 && q.x < s.x + 160 && q.y < s.feet - 60 && q.y > s.feet - 160) if (!best || q.x < best.x) best = q;
        if (best) { tx = best.x; ty = best.y + 60; if (Math.abs(best.x - s.x) < 34 && s.ground) out.jump = true; }
      }
      const dx = tx - s.x, dir = dx > 0 ? 1 : -1;
      if (Math.abs(dx) > (urgent ? 8 : 24)) { if (dir > 0) out.right = true; else out.left = true; }
      // jumps: a gap just ahead, a roaming dust bunny just ahead, something above, stuck
      if (s.ground) {
        const ahead = s.x + dir * 34, moving = out.left || out.right;
        const footing = M().surfaces(st, ahead).some(q => Math.abs(q.y - s.feet) < 10);
        if (moving && !footing && s.feet >= F - 2) out.jump = true;
        if (!st.sleepy) for (const b of st.c.bunnies) if ((b.x - s.x) * dir > 0 && Math.abs(b.x - s.x) < 70 && s.feet > F - 20) out.jump = true;
        if (ty < s.feet - 24 && Math.abs(dx) < 110) out.jump = true;
        if (moving && S.lastX != null && Math.abs(s.x - S.lastX) < 0.2) S.stuckT += dt; else S.stuckT = 0;
        if (S.stuckT > 0.8) { out.jump = true; S.stuckT = 0; }
        // a target below (on the floor while on a roof or a deck): drop down near it
        if (ty > s.feet + 30 && Math.abs(dx) < 60 && s.ground !== 'floor') out.down = true;
      }
      if (!s.ground && s.vy < 0) out.jump = true; // keep holding for a full hop
      S.lastX = s.x;
      if (pl.act) out.act = 'tap';
      if (human) {
        if (pl.brake && tr.v > 20) cpuSay(p, 'Brake now!', 1.4);
        else if (pl.hold && pl.wait && pl.can) cpuSay(p, 'Stop here, brake on!', 1.6);
        else if (tr.spring < 0.05 && !pl.brake && !tr.rev) cpuSay(p, 'Wind the key!', 1.6);
      }
      return out;
    },
  });
})();
