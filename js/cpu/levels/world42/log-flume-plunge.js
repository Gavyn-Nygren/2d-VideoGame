/* Pip & Bo - Computer partner brain for 42-2 Log Flume Plunge (mode 'parkflume', 3D). */
'use strict';

(() => {
  /* 42-2 Log Flume Plunge: the current carries the log; each rider has one paddle on their own side (Pip left, Bo right)
     for the whole ride. The brain works only its own paddle, the way a person would.
       THE LINE   it looks about 1.5 s ahead (by the log's speed) and picks where the log should be there: the next
                  golden duck it can still reach without a hard swerve, else the middle; it steers wide of anything in
                  the water where that thing will be when the log gets there (swans drift, the wheel's paddles dip);
                  round an island it picks an arm early and keeps to it (the one with more ducks; the wheel there can
                  be passed wide when its paddles are down). Bends throw the log to the outside, so it aims a little in.
       STEERING   from where the log is and is pointing it works out the turn it wants. A stroke turns the nose away
                  from its side (one firm turn), a drag turns it toward its side (held, a gentle turn that slows the
                  log). It strokes only for a big turn the right way, drags for a small one or its own way, and lets go
                  with a margin (no zigzag: it never flips between the two inside 0.4 s).
       PAIRS      when the person strokes and the log is near enough on line, it strokes too within 0.1 s, so the
                  two make a pair (no turn, more push, Speed). Two computers keep a beat on the straights: Pip
                  leads, Bo matches.
       BRACE      holds jump from 0.6 s before a marked drop until the log is through it, and says "Hold on!" once.
       THE FINISH from the lagoon it lines the log up on the dock's ring and holds its paddle in to slow down;
                  "Hold your paddle in!" asks the person to help. If the log goes round again it simply tries again.
     Speech is short and 1-player only (cpuSay): it says what to do, never which of its buttons it is pressing. */
  const sgn = x => (x > 0 ? 1 : x < 0 ? -1 : 0);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  cpuBrain('parkflume', {
    reset(s) { s.said = {}; s.lastStroke = -9; s.lastFlip = -9; s.mode = 0; s.arm = {}; s.beat = -9; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || st.phase !== 'ride' || info.intro) return out;
      const PR = PARKFLUME_ROUTE, R = PR.R, L = PR.lists, CO = PARKFLUME, S = CO.S;
      const id = p.id, side = id === 0 ? -1 : 1, solo = !info.partnerCpu, t = st.t;
      const f = R.at(st.s), c = Math.max(0.3, f.v), vs = Math.max(0.6, st.vs);
      const say = (k, text) => { if (solo && !s.said[k]) { s.said[k] = 1; cpuSay(p, text, 1.8); } };

      const pulling0 = st.pull[id] >= 0, ready0 = !pulling0 && st.rest[id] <= 0;
      const oStart0 = st.pull[o.id] >= 0 && st.pull[o.id] < 0.12 && !st.paired[o.id];
      /* ---- on a lift: the belt has the log; hook the edge ducks on its own side ---- */
      if (CO.liftAt(st.s)) {
        for (let i = 0; i < L.ducks.length; i++) { const dk = L.ducks[i]; if (dk.hook === side && !st.got[i] && dk.s - st.s > 0.4 && dk.s - st.s < 1.6 && ready0) { out.act = 'tap'; s.lastStroke = t; } }
        return out;
      }
      /* ---- in the whirlpool: pairs break out, so match every stroke and keep a beat ---- */
      if (st.whirl) {
        const w = st.whirl, need = L.whirls[w.i].need;
        if (solo && w.n > (s.counted || 0) && w.n <= need) { s.counted = w.n; cpuSay(p, ['One!', 'Two!', 'Three!', 'Four!'][w.n - 1] || 'Go!', 0.9); }
        if (solo) say('whirl' + w.i, 'Paddle with me!');
        if (oStart0 && ready0) { out.act = 'tap'; s.lastStroke = t; }
        else if (!solo && id === 0 && ready0 && t - s.lastStroke > 0.9) { out.act = 'tap'; s.lastStroke = t; }
        else if (solo && ready0 && t - s.lastStroke > 1.0 && t - (st.strokeAt[o.id] || -9) < 1.5) { out.act = 'tap'; s.lastStroke = t; }
        return out;
      }
      s.counted = 0;

      /* ---- hold on for things right across the channel that will be there as the log passes ---- */
      for (const ob of L.obs) {
        if (!ob.braceOk || ob.s < st.s - ob.r - S.HALF_W - S.HALF_LEN - 1 || ob.s > st.s + 20) continue;
        // (a line right across; a curtain in the arm it took; a fountain it is heading into anyway)
        const across = ob.line || (ob.side && ob.side === s.arm[(L.islands.find(q => ob.s > q.s0 && ob.s < q.s1) || {}).s0])
          || (!ob.side && Math.abs(st.x + st.vx * 0.4 - ob.x) < ob.r + S.HALF_W + 0.4);
        if (!across) continue;
        const reach = ob.r + S.HALF_W + S.HALF_LEN + 0.4, ta0 = (ob.s - reach - st.s) / vs, ta1 = (ob.s + reach - st.s) / vs;
        if (ta1 < 0) continue;
        let hit = false; for (let k = Math.max(0, ta0) - 0.3; k <= ta1 + 0.3; k += 0.1) if (CO.obsAt(ob, t + k).on) { hit = true; break; }
        if (!hit) continue;
        if (ta0 < 2.2 && ta0 > 0.7) say('hold' + ob.id + Math.floor(t / 6), 'Hold on!');
        if (ta0 < 0.7) { out.jump = true; return out; }
      }

      /* ---- brace for the drops ---- */
      for (const d of L.drops) {
        if (d.side) { const I = L.islands.find(q => d.s0 > q.s0 && d.s0 < q.s1); if (I && s.arm[I.s0] != null && s.arm[I.s0] !== d.side) continue; }
        const a0 = (d.s0 - st.s) / vs;
        if (a0 < 2.4 && a0 > 0.6) say('drop' + d.s0, 'Hold on!');
        if (a0 < 0.6 && st.s < d.s1 + 0.4) { out.jump = true; return out; }
      }

      /* ---- the finish: line up on the ring and slow down ---- */
      const ring = PR.at.ring, toRing = ring - st.s;
      const finishing = toRing < 22 && toRing > -S.RING_R;

      /* ---- where the log should be about 1.5 s ahead ---- */
      const look = clamp(vs * 1.5, 4, 12), sA = st.s + look;
      let tx = 0, sT = sA, why = 'middle';
      // an island: pick an arm early (the one with more ducks; a soaking thing in it only costs the ducks beside it,
      // since it can be passed wide) and keep to it
      const islOf = ss => CO.islandAt(ss);
      for (const I of L.islands) {
        if (st.s > I.s1 + 2 || st.s < I.s0 - 26) continue;
        if (s.arm[I.s0] == null) {
          let best = -1, bestScore = -1e9;
          for (const sd of [-1, 1]) {
            let score = 0;
            for (let i = 0; i < L.ducks.length; i++) { const dk = L.ducks[i]; if (!st.got[i] && dk.s > I.s0 && dk.s < I.s1 && sgn(dk.x - I.x) === sd) score += dk.big ? S.BIG_DUCKS : 1; }
            for (const ob of L.obs) if (ob.soak && ob.s > I.s0 && ob.s < I.s1 && sgn(ob.x - I.x) === sd) score -= 2;
            if (score > bestScore) { bestScore = score; best = sd; }
          }
          s.arm[I.s0] = best;
        }
        if (sA > I.s0 - 6 && st.s < I.s1) { const isl = islOf(clamp(sA, I.s0 + 0.01, I.s1 - 0.01)); const hw = isl ? isl.hw : 0; tx = I.x + s.arm[I.s0] * (hw + (PR.w(sA) - hw) / 2); why = 'arm'; }
      }
      // the next duck it can still reach
      if (!finishing) for (let i = 0; i < L.ducks.length; i++) {
        const dk = L.ducks[i];
        if (st.got[i] || dk.s < st.s + 1.2) continue;
        if (dk.s > st.s + 18) break;
        const tt = (dk.s - st.s) / vs, dx = dk.x - st.x;
        if (Math.abs(dx) > 0.6 + tt * 1.4) continue; // too far across to reach without a hard swerve
        const I = L.islands.find(q => dk.s > q.s0 - 2 && dk.s < q.s1 + 2);
        if (I && s.arm[I.s0] != null && sgn(dk.x - I.x) !== s.arm[I.s0]) continue;
        tx = dk.x; sT = dk.s; why = 'duck'; break;
      }
      if (finishing) { tx = 0; sT = sA; why = 'ring'; }
      // keep wide of things in the water (where they will be when the log gets there) that lie on the way to the
      // target: the target becomes a point beside the thing
      for (const ob of L.obs) {
        if (ob.line || ob.kind === 'curtain' || ob.s < st.s - 2 || ob.s > Math.max(sT, st.s + (ob.soak ? 20 : 6)) + ob.r + S.HALF_LEN) continue;
        // everywhere it will be while the log goes by (a guess, so a soaking thing that comes and goes or moves across
        // gets a wide margin in time): the ranges across the channel to keep out of
        const ta = t + Math.max(0, ob.s - st.s) / vs, span = ob.soak ? 7 : 5, room = ob.r + S.HALF_W + 0.6, bad = [];
        let qs = ob.s;
        for (let k = -span; k <= span; k++) { const qq = CO.obsAt(ob, ta + k * 0.1); if (qq.on && (qq.soak !== false || !ob.soak)) { bad.push([qq.x - room, qq.x + room]); if (k === 0) qs = qq.s; } }
        if (!bad.length) continue;
        const u = clamp((qs - st.s) / Math.max(0.5, sT - st.s), 0, 1), xi = st.x + (tx - st.x) * u;
        const inBad = v => bad.some(([l, r]) => v > l && v < r);
        if (!inBad(xi)) continue;
        const w = PR.w(qs) - 1.0, isl = islOf(qs);
        const blocked = v => Math.abs(v) > w || (isl && isl.hw > 0.3 && Math.abs(v - isl.I.x) < isl.hw + 1.0) || inBad(v);
        let best = null;
        for (const [l, r] of bad) for (const v of [l - 0.05, r + 0.05]) if (!blocked(v) && (best == null || Math.abs(v - xi) < Math.abs(best - xi))) best = v;
        if (best == null) continue; // nowhere clear: keep the line (it may yet be off by then)
        tx = best; sT = Math.max(st.s + 3, qs); why = 'avoid';
        break; // (the nearest thing in the way sets the line; the ones after it are dealt with as the log reaches them)
      }
      // inside the banks (and off the island)
      { const w = PR.w(sT) - 1.0; tx = clamp(tx, -w, w); const isl = islOf(sT); if (isl && isl.hw > 0.3) { const sd = s.arm[isl.I.s0] || (st.x >= isl.I.x ? 1 : -1); if (sd * (tx - isl.I.x) < isl.hw + 1.0) tx = isl.I.x + sd * (isl.hw + 1.0); } }

      if (typeof window !== 'undefined' && window.__pfDbg && id === 0 && Math.round(t * 50) % 10 === 0) window.__pfDbg.push(`t=${t.toFixed(1)} s=${st.s.toFixed(1)} x=${st.x.toFixed(2)} tx=${tx.toFixed(2)} sT=${sT.toFixed(1)} ${why}`);
      /* ---- the turn it wants ---- */
      const xPred = st.x + st.vx * 0.5;
      const drive = Math.max(0.5, Math.max(0, st.u) + S.KEEL * c);
      const fa = R.at(st.s + look * 0.5);
      // aim a little in on bends (the log slides to the outside)
      const slideComp = (fa.turn * vs * vs * S.SLIDE) / drive;
      const psiD = clamp(Math.atan2(tx - xPred, clamp(sT - st.s, 3, look)) * 1.4 - slideComp, -0.65, 0.65);
      const need = (psiD - st.psi) * 2.2 - st.om * 0.9; // + turns the nose right
      const strokeWay = -side, dragWay = side;
      const pulling = st.pull[id] >= 0, ready = !pulling && st.rest[id] <= 0;

      // a pair: the person just started a stroke and the log is near enough on line
      const oStart = st.pull[o.id] >= 0 && st.pull[o.id] < 0.12 && !st.paired[o.id];
      if (oStart && ready && Math.abs(need) < 0.9 && !finishing) { out.act = 'tap'; s.lastStroke = t; return out; }

      // steering: stroke for a big turn its way, drag for a small one or a turn toward its side
      let want = 0; // 1 stroke, 2 drag
      const nS = need * strokeWay, nD = need * dragWay;
      if (s.mode === 2) want = nD > 0.06 ? 2 : 0;
      if (!want) { if (nS > 0.75) want = 1; else if (nD > 0.22) want = 2; }
      if (want !== s.mode && (want && s.mode) && t - s.lastFlip < 0.4) want = s.mode;
      if (want !== s.mode) { s.lastFlip = t; s.mode = want === 1 ? 0 : want; }
      if (want === 1 && ready && t - s.lastStroke > 0.55) { out.act = 'tap'; s.lastStroke = t; }
      else if (want === 2) out.down = true;

      // the finish: slow down to stop in the ring
      if (finishing && toRing < 16) {
        if (st.vs > S.RING_V * 0.7) { out.down = true; if (solo && !CO.dragOf(o)) say('ring' + st.laps, 'Hold your paddle in!'); }
        return out;
      }

      // two computers keep a beat on the straights (Pip leads, the other matches): pairs build Speed. A beat stroke
      // the partner did not match turns the log, so after two of those in a row it stops beating for a while.
      if (s.beatAt != null && t - s.beatAt > 0.35) { s.beatMiss = st.paired[id] && st.strokeAt[id] >= s.beatAt ? 0 : (s.beatMiss || 0) + 1; s.beatAt = null; if (s.beatMiss >= 2) { s.beatOff = t + 8; s.beatMiss = 0; } }
      if (!solo && !want && id === 0 && ready && Math.abs(need) < 0.35 && t - s.lastStroke > 1.0 && why !== 'avoid' && st.speed < 0.5 && t > (s.beatOff || 0)) { out.act = 'tap'; s.lastStroke = t; s.beatAt = t; }
      return out;
    },
  });
})();
