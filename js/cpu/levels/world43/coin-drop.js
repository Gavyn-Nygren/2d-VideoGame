/* Pip & Bo - Computer partner brain for 43-1 Coin Drop (mode 'arcadecoin', 3D). */
'use strict';

(() => {
  /* 43-1 Coin Drop: the chute carries both coins; each rider only steers across it and jumps. The brain rides its
     own coin (Pip's left of Bo's, unless the person is already there) and reads the route's lists
     (ARCADECOIN_ROUTE.lists) by time ahead (ARCADECOIN_ROUTE.eta, the clock the cue cards count with).
     WHERE IT STEERS, first that applies:
       RESCUE    the partner in a pixel bubble close enough to pop: straight into it.
       SPRING    from 1.6 s before a twin springboard (and while the pad holds): onto its own half of the pad.
       SPLIT     from 1.4 s before a split chute and all through it: its own side of the divider (the side the person
                 did not take), well clear of the divider.
       GATE      in a gate's zone: out to its own post, so the spark touches both.
       PILLAR    the same side of a pillar as the partner, so the spark does not snap.
       ROW       a row of coins within 1.2 s: out toward its end of the row, only as far as the spark will stretch
                 (without snapping) from where the partner is.
       LINK      otherwise a comfortable spark's length (2.6) to its own side of the partner.
     WHAT IT KEEPS CLEAR OF (the target is pushed out of these, whichever rule chose it): teeth that will be up as it
     passes, the Sweeper's brush (awake, lit), the wall of a gap it can steer round.
     WHEN IT JUMPS (a press in the middle of the moment the cue card shows, CO.jumpWin): a wire or a lever across its
     line, a gap under it, a bug in its line the spark will not zap first. Never in the open air or a springboard
     flight. With a person it says the shared things once, a moment ahead: "Spread out!" for a wide row, "Each to a
     post!" at a gate, "You take that side!" at a split, "Together!" at a springboard, "Hang on, I'll pop you!". */
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  cpuBrain('arcadecoin', {
    idleStop: 30,
    reset(s) { s.said = {}; s.lastJump = -9; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || st.phase !== 'ride' || info.intro) return out;
      const CO = ARCADECOIN, PR = ARCADECOIN_ROUTE, L = PR.lists, S = CO.S, id = p.id, solo = !info.partnerCpu;
      const me = st.c[id], them = st.c[1 - id];
      if (me.state !== 'ride' || st.fly) return out;
      const at = st.s, ahead = x => PR.eta(at, x), now = PR.tAt(at);
      const say = (k, text) => { if (solo && !s.said[k]) { s.said[k] = 1; cpuSay(p, text, 1.8); } };
      const w = PR.w(at), lim = w - S.R - 0.15;
      const gold = CO.gold(st), htAt = a => st.ht + a * (gold ? S.GOLD_SLOW : 1);
      const theirX = them.state === 'bubble' ? them.bx : them.x, theyRide = them.state === 'ride';
      // which side is mine: Pip left, Bo right, unless the person sits clearly the other way
      let side = id ? 1 : -1;
      if (theyRide && Math.abs(theirX - me.x) > 0.6) side = me.x > theirX ? 1 : -1;
      let want = null, why = '';
      // RESCUE
      if (them.state === 'bubble' && them.boff < 3.4) { want = them.bx; why = 'rescue'; say('pop' + Math.round(at / 10), 'Hang on, I\'ll pop you!'); }
      // SPRING
      if (want == null) for (const sp of L.springs) {
        const i = L.springs.indexOf(sp); if (st.springDone[i]) continue;
        const a = ahead(sp.s0);
        if ((a < 1.6 && ahead(sp.sh) > -0.1) || (st.hold && st.hold.i === i)) {
          const mid = (sp.x0 + sp.x1) / 2, half = (sp.x1 - sp.x0) / 2;
          want = mid + side * half * 0.45; why = 'spring';
          if (a > 0.5) say('spring' + i, 'Together!');
          break;
        }
      }
      // SPLIT
      if (want == null) for (const sp of L.splits) {
        const a0 = ahead(sp.s0), a1 = ahead(sp.s1);
        if (a0 < 1.4 && a1 > 0) {
          let mySide = side;
          if (at >= sp.s0) { mySide = me.side || side; }
          else if (theyRide && Math.abs(theirX) > 0.8 && Math.sign(theirX) === mySide) mySide = -mySide;
          want = mySide * Math.min(lim, S.DIV + S.R + 1.4); why = 'split';
          if (a0 > 0.5) say('split' + sp.s0, 'You take that side!');
          break;
        }
      }
      // GATE
      if (want == null) L.gates.forEach((g, i) => {
        if (want != null || st.gateOpen[i]) return;
        const a = ahead(g.s - S.GATE_ZONE + 1);
        if (a < 1.0 && ahead(g.s) > 0) { want = side * Math.min(lim, g.gx); why = 'gate'; if (a > 0.4) say('gate' + i, 'Each to a post!'); }
      });
      // PILLAR: their side of it
      if (want == null) for (const pl of L.pillars) {
        const a = ahead(pl.s);
        if (a < 1.1 && a > -0.3) {
          const ps = theyRide ? (theirX < pl.x ? -1 : 1) : (me.x < pl.x ? -1 : 1);
          const edge = pl.x + ps * (pl.r + S.R + 0.35);
          want = ps < 0 ? Math.min(edge, theyRide ? theirX + side * 2.3 : edge) : Math.max(edge, theyRide ? theirX + side * 2.3 : edge);
          if (ps < 0) want = Math.min(want, edge); else want = Math.max(want, edge);
          why = 'pillar'; break;
        }
      }
      // ROW
      const th = CO.stretchAt(at) - 0.5;
      if (want == null) for (const r of L.rows) {
        const a = ahead(r.s);
        if (a > 1.2 || a < -0.05) continue;
        const end = side < 0 ? r.x0 + 0.2 : r.x1 - 0.2;
        want = theyRide ? clamp(end, theirX - th, theirX + th) : end; why = 'row';
        if (r.x1 - r.x0 > 6 && a > 0.7) say('row' + r.id, 'Spread out!');
        break;
      }
      // LINK
      if (want == null) { want = theyRide ? theirX + side * 2.6 : side * 2.2; why = 'link'; }
      // KEEP CLEAR: teeth up as it passes, an awake brush, a steerable gap
      const blocks = [];
      for (const tt of L.teeth) { const a = ahead(tt.s); if (a < 0.85 && a > -0.25 && [-0.18, 0, 0.18].some(d => CO.teethOn(tt, htAt(Math.max(0, a + d))))) blocks.push([tt.x0 - S.R * 0.8 - 0.6, tt.x1 + S.R * 0.8 + 0.6, a]); }
      if (CO.awake(st)) for (const b of L.brush) { const a = ahead(b.s); if (a < 1.3 && a > -0.3) blocks.push([b.x0 - S.R * 0.8 - 0.6, b.x1 + S.R * 0.8 + 0.6, a]); }
      for (const g of L.gaps) { const a = ahead(g.s0); if (a < 1.2 && ahead(g.s1) > 0 && (g.x0 > -w || g.x1 < w)) blocks.push([g.x0 - S.R * 0.2, g.x1 + S.R * 0.2, a]); }
      const [lo, hi] = (() => { const sp = CO.splitAt(at); if (sp) { const sd = me.side || side; return sd < 0 ? [-lim, -S.DIV - S.R - 0.1] : [S.DIV + S.R + 0.1, lim]; } return [-lim, lim]; })();
      want = clamp(want, lo, hi);
      // the latest first, so the nearest thing (pushed last) always wins
      blocks.sort((p1, p2) => p2[2] - p1[2]);
      for (const [a, b] of blocks) {
        if (want > a && want < b) {
          const l = a, r2 = b, gl = l >= lo, gr = r2 <= hi;
          want = gl && (!gr || Math.abs(want - l) < Math.abs(want - r2)) ? l : gr ? r2 : want;
        }
      }
      // steer (lead the drift a little so it settles instead of wobbling)
      const err = want - (me.x + me.vx * 0.12);
      const dead = blocks.length ? 0.12 : 0.22;
      if (err > dead) out.right = true; else if (err < -dead) out.left = true;
      // JUMPS
      const ground = me.air <= 0;
      if (ground && !PR.inAir(at) && st.t - s.lastJump > S.AIR + 0.1) {
        let jump = false;
        const inWin = (t0, t1) => now >= (t0 + t1) / 2 - 0.06 && now <= t1;
        const xAt = me.x + me.vx * 0.3;
        for (const wr of L.wires) { if (Math.abs(wr.s - at) > 30) continue; const [t0, t1] = CO.jumpWin('low', wr.s); if (inWin(t0, t1) && xAt + S.R > wr.x0 && xAt - S.R < wr.x1) jump = true; }
        for (const lv of L.levers) { if (Math.abs(lv.s - at) > 30) continue; const [t0, t1] = CO.jumpWin('low', lv.s); if (inWin(t0, t1)) { const bx = CO.leverX(lv, htAt(ahead(lv.s))); if (Math.abs(xAt - bx) < lv.hw + S.R + 0.6) jump = true; } }
        for (const g of L.gaps) {
          if (Math.abs(g.s0 - at) > 30 || L.springs.some(sp => Math.abs(sp.sh - g.s0) < 0.5)) continue;
          const [t0, t1] = CO.jumpWin('gap', g.s0, g.s1); if (inWin(t0, t1) && xAt > g.x0 - 0.2 && xAt < g.x1 + 0.2) jump = true;
        }
        L.bugs.forEach((b, i) => {
          if (st.bugGone[i] || Math.abs(b.s - at) > 30) return;
          const [t0, t1] = CO.jumpWin('low', b.s);
          if (!inWin(t0, t1) || Math.abs(xAt - b.x) > S.R * 0.8 + 0.6) return;
          const lo2 = Math.min(me.x, theirX), hi2 = Math.max(me.x, theirX);
          const zapped = theyRide && CO.arcOn(st) && b.x > lo2 + 0.5 && b.x < hi2 - 0.5;
          if (!zapped) jump = true;
        });
        if (jump) { out.jump = 'tap'; s.lastJump = st.t; }
      }
      s.why = why;
      return out;
    },
  });
})();
