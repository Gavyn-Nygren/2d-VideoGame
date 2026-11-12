/* Pip & Bo - Computer opponent brain for 36-4 Stunt Show Showdown (mode 'stuntshow'). */
'use strict';

(() => {
  /* 36-4 Stunt Show Showdown (MODES.stuntshow): the computer performs its own half, reading MODES.stuntshow.plan(st, id)
     and its own stunt state. Versus brains use the Opponent setting (info.skill: Easy < 0.5 <= Normal <= 0.9 < Hard).
     It picks its plan once per stunt (S.key) and then only makes timing errors of that size. It ignores the crowd.
     RAMP JUMP: lets go of the rev off the band's middle by Easy 25%, Normal 10%, Hard 4% of the dial (either side);
       tries Easy 1, Normal 2, Hard 3 flips (as many as the air time allows) and lands level Easy 70%, Normal 85%,
       Hard 95% (else it stops 30-70 degrees out: a Bail).
     HIGH DIVE: climbs to Easy half, Normal three-quarters, Hard full height; Easy 1 turn, Normal 2-3, Hard 4 (tucked
       when it needs the speed); straightens for a clean entry Easy 67%, Normal 75%, Hard 92%.
     WALL SMASH: reads the fake panel right Easy 65%, Normal 85%, Hard 97% once it is in focus; Easy slows for every
       wall, Normal for the walls it is unsure of (30%), Hard runs flat out. Charges inside the window (Easy is late
       now and then).
     FIRE HOOP LEAP: hits the bounce window Easy 55%, Normal 78%, Hard 93%; steers under the lowest hoop it can reach;
       Hard pikes at the top of its highest bounces.
     GRAND FINALE: the same habits strung together. */
  const M = () => MODES.stuntshow;
  const LV = sk => (sk < 0.5 ? 0 : sk > 0.9 ? 2 : 1);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  cpuBrain('stuntshow', {
    reset(S) { S.key = null; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.pl || info.frozen) return out;
      const m = M(), SS = m.SS, P = st.pl[p.id], pl = m.plan(st, p.id);
      if (!P || P.done) return out;
      const lv = LV(info.skill);
      const key = st.round + ':' + st.si + ':' + st.ties;
      if (S.key !== key) {
        S.key = key;
        const sign = Math.random() < 0.5 ? -1 : 1;
        S.revOff = sign * [0.25, 0.10, 0.04][lv] * Math.random() * 1.4 * 0.5 + sign * [0.25, 0.10, 0.04][lv] * 0.15;
        S.flips = [1, 2, 3][lv];
        S.land = Math.random() < [0.7, 0.85, 0.95][lv];
        S.miss = (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 40);
        S.h = [0.5, 0.75, 1][lv];
        S.turns = [1, pick([2, 3]), 4][lv];
        S.clean = Math.random() < [0.67, 0.75, 0.92][lv];
        S.entry = Math.random() * [14, 12, 9][lv];
        S.walls = {}; S.bounce = null; S.tapT = 0;
        S.fLand = Math.random() < [0.7, 0.85, 0.95][lv];
        S.fClean = Math.random() < [0.67, 0.75, 0.92][lv];
      }
      S.tapT = Math.max(0, S.tapT - dt);
      const ph = P.ph;
      // ---- the rev (ramp jump and the finale)
      if (ph === 'rev') {
        const tgt = clamp(pl.band.c + S.revOff, 0.1, 0.98);
        if (P.needle < tgt) out.act = true;
        return out;
      }
      // ---- in the air on the bike
      if (ph === 'air' && (st.si === 0 || st.si === 4)) {
        const left = P.airT - P.t;
        if (st.si === 0 && S.flipT === undefined) S.flipT = Math.min(S.flips, Math.max(0, Math.floor((P.airT - 0.25) * SS.spinRate / 360)));
        const want = st.si === 0 ? S.flipT * 360 : 0, land = st.si === 0 ? S.land : S.fLand;
        const goal = want + (land ? 0 : S.miss);
        if (P.rot < goal - 3 && left > 0.02) out.right = true;
        if (P.t + dt >= P.airT) S.flipT = undefined;
        return out;
      }
      // ---- the high dive
      if (st.si === 1) {
        if (ph === 'climb') { if (P.h < S.h - 0.01 && P.clock > 0.3) out.up = true; else out.act = S.tapT <= 0 ? 'tap' : false; S.tapT = 0.1; return out; }
        if (ph === 'air') {
          // (a clean entry still stops a few degrees out: it doesn't press ▲ to straighten the last of it)
          const left = P.airT - P.t, goal = S.turns * 360 + (S.clean ? S.entry : S.miss);
          // can it still make the turns? tuck when it needs the speed
          const need = (goal - P.rot) / SS.turnRate;
          if (P.rot < goal - 4) { out.right = true; if (need > left - 0.15) out.down = true; }
          return out;
        }
        return out;
      }
      // ---- walls (wall smash and the finale's three)
      if (ph === 'walls' || ph === 'run') {
        const W8 = pl.wall;
        if (!W8) { out.right = lv === 2; return out; }
        const w = W8.w, id = st.round + ':' + w.x;
        if (!S.walls[id]) {
          const right = Math.random() < [0.65, 0.85, 0.97][lv];
          S.walls[id] = { guess: right ? w.fake : pick([0, 1, 2].filter(q => q !== w.fake)), slow: lv === 0 || (lv === 1 && Math.random() < 0.3), late: Math.random() < [0.25, 0.08, 0.02][lv] };
        }
        const plan = S.walls[id];
        // speed: slow to look (until it's in focus), else run (Hard flat out)
        if (W8.fake === null && plan.slow) out.left = true;
        else if (lv === 2 || W8.fake !== null && !plan.slow) out.right = true;
        if (W8.fake !== null && W8.eta < 0.6) { if (plan.guess === 0) out.up = true; else if (plan.guess === 2) out.down = true; }
        const winT = SS.chargeWin * (P.gold ? SS.gold : 1);
        if (W8.fake !== null && W8.eta < winT * (plan.late ? 1.25 : 0.55) && S.charged !== id) { out.act = 'tap'; S.charged = id; }
        return out;
      }
      // ---- the trampoline
      if (st.si === 3 && (ph === 'bounce' || ph === 'finish')) {
        // steering: under the lowest hoop it can reach, else the middle (or the cross to finish)
        let tx = 240;
        if (ph === 'bounce') {
          const reach = m.apexH(P.L) - 8, hs = [0, 1, 2, 3, 4].filter(k => !P.lit[k]).map(k => Object.assign({ k }, m.hoopPos(st, k))).filter(h => h.h <= reach);
          if (hs.length && P.vy < 0) tx = hs.sort((a, b) => a.h - b.h)[0].x;
          if (P.vy > 0 && P.y > 300) tx = clamp(P.x, 190, 290);
        }
        if (tx - P.x > 6) out.right = true; else if (tx - P.x < -6) out.left = true;
        // the bounce: decide once per fall whether it hits the window
        if (P.vy > 0 && P.y > SS.bed - 160) {
          if (!S.bounce) S.bounce = { hit: Math.random() < [0.55, 0.78, 0.93][lv], at: (Math.random() - 0.5) * 0.08, wrong: 0.14 + Math.random() * 0.2 };
          const tc = (SS.bed - P.y) / Math.max(50, P.vy);
          const when = S.bounce.hit ? S.bounce.at : S.bounce.wrong;
          if (tc <= Math.max(0, when) && !S.bounce.done) { out.act = 'tap'; S.bounce.done = true; }
        } else if (P.vy < 0) {
          if (S.bounce && S.bounce.hit && !S.bounce.done && S.bounce.at < 0 && P.y > SS.bed - 40) { out.act = 'tap'; S.bounce.done = true; }
          if (P.y < SS.bed - 60) S.bounce = null;
        }
        // Hard pikes at the top of its big bounces
        if (lv === 2 && P.L >= 5 && Math.abs(P.vy) < 120 && !P.pike && P.lit.filter(Boolean).length >= 4) out.down = true;
        return out;
      }
      // ---- the finale's dive
      if (ph === 'dive') { if (S.fClean) out.up = true; else if (P.t < 0.4) out.right = true; return out; }
      return out;
    },
  });
})();
