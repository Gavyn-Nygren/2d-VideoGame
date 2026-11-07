/* Pip & Bo - Computer partner brain for 21-4 Paper Plane Race (mode 'paperplane'). */
'use strict';

(() => {
  /* The computer is the other pilot. It presses the same keys a person does: the action (held) to throw from the
     slingshot, ▲ (jump) / ▼ (down) to tilt the nose, a fresh action press to flap.
     The throw: after a short reaction it holds the action and lets go when the swinging meter reaches the power it
     aims for (Hard about 96% ± 3, so mostly "Perfect throw!"; Normal 85% ± 10; Easy 65% ± 22, now and then it waits
     for the second swing).
     Flying, it re-plans every reaction time (Hard 0.07 s, Normal 0.16 s, Easy 0.4 s) by looking ahead along the
     course as far as it can "see" (Hard 560 px, Normal 400, Easy 220):
       1. a free glide: a steady dive that spends the height warm air gives (Hard 0.12 rad, Easy almost hands-off),
          steeper high up and inside warm air, flatter near the ground; or a target height: the next gold ring if it
          can reach it with a sane slope (Hard always tries, Normal 75%, Easy 40%);
       2. obstacles ahead (where they will be when it gets there): if the planned height runs into one it picks the
          side, above or below, that is closer and still open (Normal misses 10% of them, Easy half);
       3. a nose angle that flies that slope (with the plane's own sink and the lift it feels), never climbing while
          slow (no stalls on purpose), pulling up near the ground.
     It then holds ▲ or ▼ until the nose is near that angle (Easy with a wide dead zone and now and then a lapse where
     it lets go of everything for a moment, or holds a random tilt, like a kid looking at the other plane; a random
     nose-up only while fast, so Easy doesn't stall itself on purpose).
     Balance (Nov 2026 review, scripted people): Easy beats a player who does nothing about 92% of the time and a
     masher about 85%; a kid who tries (aims at rings, dodges most things, over-holds ▲ now and then) beats Easy
     about 60%, Normal about 10%, Hard never.
     Flaps: to save a skid when it is about to touch the ground, and the rest as a sprint near the finish (Hard keeps
     one for the sprint; Easy also wastes one now and then).
     What it reads: the course (what is on screen and just past it, about as far as a person can see on a wide
     screen), its own plane, the throw meter. Never the other player's keys.
     It talks (1-player mode only) in short bubbles: "Nice throw!", "Zoom!", "Wheee!", "Good race!". */
  const SK = {
    easy: { look: 220, react: 0.4, db: 0.12, ringP: 0.4, noise: 60, aim: 0.65, aimSd: 0.22, again: 0.2, lapse: 0.2, lapseT: 1.0, see: 0.5, fidget: 0.2, reserve: 0, waste: 0.06, glide: 0.04, throwReact: 0.7 },
    normal: { look: 400, react: 0.16, db: 0.06, ringP: 0.75, noise: 28, aim: 0.85, aimSd: 0.1, again: 0.05, lapse: 0.05, lapseT: 0.6, see: 0.9, fidget: 0.05, reserve: 1, waste: 0.01, glide: 0.09, throwReact: 0.35 },
    hard: { look: 560, react: 0.07, db: 0.03, ringP: 1, noise: 0, aim: 0.96, aimSd: 0.03, again: 0, lapse: 0, lapseT: 0, see: 1, fidget: 0, reserve: 1, waste: 0, glide: 0.12, throwReact: 0.18 },
  };
  const skOf = s => (s <= 0.4 ? SK.easy : s < 0.9 ? SK.normal : SK.hard);
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.5;
  const T = () => MODES.paperplane.test;

  // the vertical stretch an obstacle blocks around course x (lo..hi), at round time t, or null
  function blocked(o, x0, x1, t) {
    const s = T().shapes(o, t);
    let lo = Infinity, hi = -Infinity;
    for (const [cx, cy, r] of s.c) if (cx + r > x0 && cx - r < x1) { lo = Math.min(lo, cy - r); hi = Math.max(hi, cy + r); }
    for (const [a, b, c, d] of s.r) if (c > x0 && a < x1) { lo = Math.min(lo, b); hi = Math.max(hi, d); }
    return lo < hi ? [lo, hi] : null;
  }

  cpuBrain('paperplane', {
    // the computer races on by itself; a person who walked away just loses the rounds (nothing gets stuck)
    noIdleStop: true,
    bubbleHidden: true,
    bubblePos(p) {
      const st = G.mst;
      if (!st || !st.cam || !st.pl) return null;
      const P = st.pl[p.id], x = P.x - st.cam.x;
      return x < 0 || x > W ? null : { x, y: Math.max(110, P.y - 48) };
    },
    reset(S) { S.pl = null; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst, m = G.match;
      if (!st || !st.pl || !st.course || !m) return out;
      const sk = skOf(info.skill), me = st.pl[p.id], q = T().PP, c = st.course;
      if (S.pl !== st.pl) {
        S.pl = st.pl; S.throwAt = null; S.releaseC = null; S.planT = 0; S.angDes = 0.05; S.ty = null; S.lapse = 0; S.fidget = 0;
        S.saidEnd = false; S.seen = {}; S.ringSkip = {}; S.lastRings = st.stat.rings[p.id]; S.wantFlap = false; S.flapDown = false; S.saidThrow = false;
      }
      if (info.frozen) {
        if (m.phase === 'end' && m.end && !S.saidEnd) {
          S.saidEnd = true;
          if (m.end.winner === p.id) cpuSay(p, 'Wheee!');
          else if (m.end.winner === o.id) cpuSay(p, 'Good race!');
        }
        return out;
      }
      // a fresh press for a flap: down one step, up the next
      if (S.flapDown) { S.flapDown = false; }
      // the throw
      if (me.phase === 'hold') {
        if (S.throwAt == null) S.throwAt = st.rt + sk.throwReact * (0.7 + Math.random() * 0.6);
        if (st.rt < S.throwAt) return out;
        if (!me.charging) { out.act = true; return out; }
        if (S.releaseC == null) {
          const aim = clamp(sk.aim + gauss() * sk.aimSd, 0.3, 0.995);
          S.releaseC = aim * q.meterHalf + (Math.random() < sk.again ? 2 * q.meterHalf : 0);
        }
        out.act = me.charge + dt < S.releaseC;
        return out;
      }
      if (me.phase !== 'fly') return out;
      if (me.perfect && !S.saidThrow) { S.saidThrow = true; cpuSay(p, 'Nice throw!'); }
      if (st.stat.rings[p.id] > S.lastRings) { S.lastRings = st.stat.rings[p.id]; if (Math.random() < 0.3) cpuSay(p, 'Zoom!'); }
      // a lapse: hands off for a moment (Easy, a little Normal)
      if (S.lapse > 0) { S.lapse -= dt; return out; }
      if (sk.lapse && Math.random() < sk.lapse * dt) { S.lapse = sk.lapseT * (0.6 + Math.random() * 0.8); return out; }
      // a fidget: a random tilt held for a moment (Easy, a little Normal)
      if (S.fidget > 0) { S.fidget -= dt; if (S.fidgetUp) out.jump = true; else out.down = true; return out; }
      if (sk.fidget && Math.random() < sk.fidget * dt) { S.fidget = 0.2 + Math.random() * 0.4; S.fidgetUp = me.sp > 170 && Math.random() < 0.5; return out; }
      const x = me.x, y = me.y, vx = Math.max(80, me.vx);
      // re-plan every reaction time
      S.planT -= dt;
      if (S.planT <= 0) {
        S.planT = sk.react * (0.8 + Math.random() * 0.4);
        // what is around: warm air it is in
        let inUp = false;
        for (const u of c.ups) if (x > u.x0 && x < u.x1) { inUp = true; break; }
        // 1. the free glide: a steady dive that spends the height warm air gives (steeper high up and in warm air,
        //    flatter low down)
        let free = sk.glide + gauss() * sk.noise * 0.002;
        if (inUp) free = y < 230 ? 0.4 : 0.22;
        else if (y < q.ceil + 70) free = Math.max(free, 0.26);
        else if (y > q.ground - 110) free = me.sp > 230 ? -0.08 : 0.04;
        let ty = null, tdx = 260;
        // 2. the next gold ring it means to take
        for (const g of c.rings) {
          if (g.got[p.id] || g.x < x + 20 || g.x - x > sk.look) continue;
          if (S.ringSkip[g.id] === undefined) S.ringSkip[g.id] = Math.random() >= sk.ringP;
          if (S.ringSkip[g.id]) continue;
          const dx = g.x - x, slope = (g.y - y) / dx;
          if (slope < -0.5 || slope > 0.7) continue;
          ty = g.y + gauss() * sk.noise * 0.4; tdx = dx; break;
        }
        // 3. obstacles ahead (where they will be when it gets there) on the line it means to fly
        const glideSlope = clamp(me.vy / vx, -0.8, 0.8);
        const lineAt = d => (ty == null ? y + glideSlope * d : y + (ty - y) * clamp(d / Math.max(1, tdx), 0, 1));
        const cands = [];
        for (const ob of c.obs) {
          const sp = T().span(ob);
          if (sp[1] < x - 10 || sp[0] > x + sk.look) continue;
          if (S.seen[ob.id] === undefined) S.seen[ob.id] = Math.random() < sk.see;
          if (!S.seen[ob.id]) continue;
          const tArr = st.rt + Math.max(0, sp[0] - x) / vx;
          const s0 = T().shapes(ob, tArr);
          const ox = Math.max(x, Math.min(sp[0], s0.cx - 30));
          const b = blocked(ob, Math.max(x - 30, ox - 40), ox + 120, tArr);
          if (b) cands.push({ d: Math.max(0, ox - x), b });
        }
        cands.sort((a, b) => a.d - b.d);
        const mg = 24;
        for (const cd of cands) {
          const [lo, hi] = cd.b, py = lineAt(cd.d);
          if (py > lo - mg && py < hi + mg) {
            const up = lo - mg - 6, dn = hi + mg + 6;
            const upOk = up > q.ceil + 4, dnOk = dn < q.ground - 16;
            let pick;
            if (upOk && dnOk) pick = Math.abs(up - py) <= Math.abs(dn - py) + 20 ? up : dn;
            else pick = upOk ? up : dnOk ? dn : (lo + hi) / 2;
            ty = pick; tdx = Math.max(80, cd.d); break;
          }
        }
        let ang = free;
        if (ty != null) {
          ty = clamp(ty, q.ceil + 6, q.ground - 24);
          // the nose angle that flies that slope (with the plane's sink and the lift it feels)
          const slope = clamp((ty - y) / tdx, -0.6, 0.7);
          const sink = (me.wings ? q.sinkGold : q.sink) - me.lift;
          ang = Math.atan(slope) - sink / Math.max(120, me.sp);
        }
        // never climb while slow
        if (me.sp < 160) ang = Math.max(ang, -0.08 + (me.sp - 115) / 300);
        if (me.sp < 125) ang = Math.max(ang, 0.12);
        // near the ground, pull up
        if (y > q.ground - 55 && me.vy > 0 && me.sp > 140) ang = Math.min(ang, -0.28);
        S.angDes = clamp(ang, -0.6, 0.6);
        S.ty = ty;
        // flaps: save a skid, sprint at the finish, now and then a wasted one (Easy)
        const left = me.flaps, toEnd = c.len - x;
        S.wantFlap = false;
        if (left > 0 && me.flapCd <= 0) {
          const skid = y > q.ground - 34 && me.vy > 30;
          if (skid && left > (toEnd < 900 ? 0 : sk.reserve)) S.wantFlap = true;
          else if (toEnd < 900 && toEnd > 40 && (left > 0)) S.wantFlap = true;
          else if (me.stallT > 0 && left > sk.reserve) S.wantFlap = true;
          else if (sk.waste && Math.random() < sk.waste) S.wantFlap = true;
        }
      }
      if (S.wantFlap) { out.act = 'tap'; S.wantFlap = false; }
      // hold ▲ or ▼ until the nose is near the wanted angle
      const a = me.ang;
      if (a > S.angDes + sk.db) out.jump = true;
      else if (a < S.angDes - sk.db) out.down = true;
      return out;
    },
  });
})();
