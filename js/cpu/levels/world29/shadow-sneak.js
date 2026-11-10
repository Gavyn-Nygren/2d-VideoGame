/* Pip & Bo - Computer partner brain for 29-2 Shadow Sneak (mode 'shadowsneak'). */
'use strict';

(() => {
  /* 29-2 Shadow Sneak (MODES.shadowsneak): G.mst.sneak says who creeps through the courtyard this stretch; the other
     tosses pebbles from the wall walk. Both jobs read MODES.shadowsneak.plan(st), the same plan the prompts, the
     "toss here" ring and the HUD chips read (it looks a few seconds ahead with the level's own guard rules).
     SNEAKER (plan.sneak): creeps to the next hiding spot only when the look-ahead says nobody will see it on the way,
     waits hidden otherwise, turns back to the last spot if the way closes, dashes only where nobody can hear, hops
     crates and creaky boards, pulls the lever in the gatehouse arch, and in a chase sprints for the hiding spot (not one
     of the red-eyed ones they saw it near) or gatehouse it can reach with the guards farthest behind, hops a guard in
     the way, slides (▼) when a guard is close behind and the run is long, then stays still until they give up.
     THROWER (plan.toss): walks and slides the aim ring onto the pebble spot the plan picked (the one that opens the
     way soonest; two pebbles for two guards), tosses, then waits. In a chase it leads the nearest chasing guard with
     pebbles ("Bonk!"). When the lever is pulled it walks through the tower door.
     The level's gold owl (stuck 45 s at a post) only hoots at the plan's pebble spot; the thrower brain does not toss
     while it is on its way.
     It can't finish alone: the sneaker can't lure the sentries and the thrower can't pull the levers, and each needs
     the other to walk through the gate. It waits for a slow person (the plan is worked out again all the time) and
     after 12 s with no person pressing anything the level takes a break; the shared idle stop (CPU.idleStop) waits too. */
  const M = () => MODES.shadowsneak;
  cpuBrain('shadowsneak', {
    reset(S) { S.hold = 0; S.wait = 0; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.c || info.intro || st.state !== 'go' || st.waiting) return out;
      const pl = M().plan(st), human = !info.partnerCpu, sn = st.sn, th = st.th;
      if (p.id === st.sneak) {
        const sp = pl.sneak;
        if (sp.dir > 0) out.right = true; else if (sp.dir < 0) out.left = true;
        if (sp.jump) out.jump = 'tap';
        if (sp.slide) out.down = true;
        if (sp.mode === 'pull') out.act = 'tap';
        else if (sp.dash && sp.dir && (sp.mode === 'go' || sp.mode === 'gate')) out.act = true;
        if (human) {
          S.wait = sp.mode === 'wait' && sp.wait === Infinity ? S.wait + dt : 0;
          if (st.chase && st.chase.lose != null) cpuSay(p, 'Shh... hiding!', 1.4);
          else if (st.chase) cpuSay(p, 'Bonk them with pebbles!', 1.4);
          else if (S.wait > 2.5) cpuSay(p, st.k === 0 || st.waitT > 8 ? 'Toss a pebble at the ring!' : 'Toss a pebble to lure him away!', 1.8);
          else if (sp.mode === 'partner') cpuSay(p, 'Gate is open! Come through the tower!', 1.6);
          else if (sp.mode === 'pull') cpuSay(p, 'Pulling the lever!', 1.0);
        }
        return out;
      }
      const tp = pl.toss;
      if (tp.dir > 0) out.right = true; else if (tp.dir < 0) out.left = true;
      if (tp.aim > 0) out.jump = true; else if (tp.aim < 0) out.down = true;
      // a short steady moment on the ring before the toss, like a person lining it up
      S.hold = tp.ready ? S.hold + dt : 0;
      if (tp.ready && S.hold > (tp.mode === 'bonk' ? 0.04 : 0.12)) out.act = 'tap';
      if (human) {
        if (tp.mode === 'bonk') cpuSay(p, 'Run and hide! I\'ll bonk them!', 1.4);
        else if (tp.mode === 'toss' && tp.ready) cpuSay(p, 'Tik! Watch the guard...', 1.2);
        else if (tp.mode === 'hold' && pl.sneak.mode === 'go' && pl.sneak.safe && sn.hidden) cpuSay(p, 'Go now! Sneak past!', 1.4);
        else if (tp.mode === 'hold' && pl.sneak.mode === 'pull') cpuSay(p, 'Pull the lever!', 1.4);
        else if (tp.mode === 'partner') cpuSay(p, 'Come through the gate!', 1.4);
      }
      return out;
    },
  });
})();
