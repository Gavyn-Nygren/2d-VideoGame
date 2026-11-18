/* Pip & Bo - Computer partner brain for 42-1 Runaway Coaster (mode 'parkcoaster', 3D). */
'use strict';

(() => {
  /* 42-1 Runaway Coaster: the track carries the train, so the brain only rides it. It reads the route's lists
     (PARKCOASTER_ROUTE.lists) and looks ahead by time (the train's speed), always riding its own seat (Pip left,
     Bo right). Everything is timed the way a person would: a press a little before the thing, never after.
       BENDS     leans the arrow's way from just before the bend (the tilt eases in over S.EASE) to its end. One
                 chevron needs only one rider, but it leans anyway (a full tilt counts too).
       TIPS      leans the other way from the thing leaning in, early enough to be tipped up when it passes.
       DUCKS     holds down for a low board that crosses its own head (or both heads).
       HOPS      jumps so the middle of the 1 s of air is over the gap; if the partner jumped first, it jumps at once
                 (inside the 0.3 s window), and it never jumps again while the train is in the air.
       LEVERS    taps the action in the zone of a switch, the rocket's points, a bell or target on its own side (not
                 if already thrown; PARKCOASTER.leverPre gives each zone), and taps its brake lever at the brake house.
                 It cannot reach the person's side: it says "Your lever!" a second before their switch's zone.
       CAMERAS   presses nothing at all for the hands-up second after a camera sign (that wins over tickets).
       TICKETS   leans out to its side for a ticket on its side when nothing else needs the lean; a far one (two
                 lines out) needs both, so with a computer partner both lean.
     With a person in the other seat it says the shared things once ahead: "Lean with me!" for a gold double arrow,
     "Jump with me!" for a gap, "Hands up!" at a camera. It never steers the person and never clears anything alone
     that needs both (a full hop and a double bend still need the person). */
  const sgn = x => (x > 0 ? 1 : x < 0 ? -1 : 0);
  cpuBrain('parkcoaster', {
    idleStop: 30,
    reset(s) { s.said = {}; s.lastJump = -9; s.lastAct = -9; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || st.phase !== 'ride' || info.intro || st.det >= 0) return out;
      const PR = PARKCOASTER_ROUTE, L = PR.lists, S = PARKCOASTER.S, id = p.id, solo = !info.partnerCpu;
      const v = Math.max(2, st.v), at = st.s, ahead = x => (x - at) / v; // seconds until the train is at x
      const say = (k, text) => { if (solo && !s.said[k]) { s.said[k] = 1; cpuSay(p, text, 1.8); } };
      // the hands-up second: press nothing
      for (const cm of L.cams) { const a = ahead(cm.s); if (a < 0.25 && a > -1.15) { if (a > 0) say('cam' + cm.s, 'Hands up!'); return out; } }
      let lean = 0, why = '';
      // bends
      for (const bd of L.bends) {
        const a0 = ahead(bd.s0), a1 = ahead(bd.s1);
        if (a0 < 0.45 && a1 > -0.05) { lean = bd.dir; why = 'bend'; }
        if (bd.need === 2 && a0 > 0 && a0 < 2.2) say('bend' + bd.s0, 'Lean with me!');
      }
      // tips: be up on the rail the far side from the thing when it passes
      if (!why) for (const tp of L.tips) { const a = ahead(tp.s); if (a < 0.75 && a > -0.15) { lean = tp.dir; why = 'tip'; if (a > 0.4) say('tip' + tp.s, 'Lean with me!'); } }
      // tickets out to the side (only when nothing else needs the lean)
      if (!why) for (const tk of L.tickets) {
        if (tk.lat === 0) continue;
        const a = ahead(tk.s), side = tk.lat < 0 ? 0 : 1, far = Math.abs(tk.lat) >= 2;
        if (a > (far ? 0.5 : 0.28) || a < -0.12) continue;
        const i = L.tickets.indexOf(tk); if (st.got[i]) continue;
        if (far || side === id) { lean = sgn(tk.lat); why = 'ticket'; }
      }
      if (lean < 0) out.left = true; else if (lean > 0) out.right = true;
      // ducks (its own head); a low thing over the person's head gets a "Duck!" 0.8 s ahead
      for (const d of L.ducks) {
        const a = ahead(d.s);
        if (a < 0.3 && a > -0.15 && (d.who === 'both' || d.who === id)) out.down = true;
        if (a < 0.85 && a > 0.5 && d.who !== id) say('duck' + d.s, 'Duck!');
      }
      // hops
      const inAir = st.airT >= 0 && st.full;
      if (!inAir) {
        if (st.hopFirst === o.id && st.hopWinT > 0.03 && st.t - s.lastJump > 0.4) { out.jump = 'tap'; s.lastJump = st.t; }
        else for (const h of L.hops) {
          const mid = ahead((h.s0 + h.s1) / 2), a0 = ahead(h.s0);
          if (a0 > 0 && a0 < 2.4) say('hop' + h.s0, 'Jump with me!');
          if (mid <= S.HOP_AIR / 2 + 0.02 && mid > 0.15 && st.t - s.lastJump > 1.2) { out.jump = 'tap'; s.lastJump = st.t; }
        }
      }
      // levers on its own side (switches, the rocket's points, bells, targets, its brake); the person's switches get
      // a "Your lever!" about a second before their zone opens
      for (let i = 0; i < L.levers.length; i++) {
        const lv = L.levers[i];
        if (lv.kind !== 'brake' && st.thrown[i]) continue;
        const pre = PARKCOASTER.leverPre(lv, v), d = lv.s - at;
        if (lv.side !== id) {
          if ((lv.kind === 'switch' || lv.kind === 'rocket') && d - pre > 0 && (d - pre) / v < 1.0) say('lever' + i, 'Your lever!');
          continue;
        }
        if (lv.kind === 'brake' && st.brake[id]) continue;
        if (d < pre * 0.6 && d > -S.LEVER_POST * 0.5 && st.t - s.lastAct > S.ARM_T + 0.1) { out.act = 'tap'; s.lastAct = st.t; }
      }
      return out;
    },
  });
})();
