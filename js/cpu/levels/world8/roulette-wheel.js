/* Pip & Bo - Computer partner: roulette wheel. */
'use strict';

(() => {
  /* Roulette Wheel is head-to-head: the computer plays against you.
     - While the ball rolls it waits near the hub (from there every color is close), a little toward where it stands.
     - When a color lights it notices a moment later (later on easy) and runs to the ball: while the ball drops in, to the
       lit wedge near the ball; once it sits in a pocket, right onto it. Hoppy Ball: hard and normal run to the landing
       shadow of the next hop. Double Trouble: it picks the ball it can get to well before you.
     - It steers round the hub and the Bumper Pegs and brakes in time on the slippery Speedy Spin wheel.
     - Bump: when you would win the chip (you're closer or alone on the color) and you're in reach, it bumps you; when it
       would win and you're right next to it near LOCK, hard and normal bump first. Easy bumps late and seldom, sometimes
       from too far (a stumble), and never bumps you again while you're dizzy.
     It reads only what a person sees: the lit color, where the ball is, the lock ring and who it would go to.
     The level never pauses itself, so it keeps playing when you walk away (noIdleStop) and the match ends. */
  const SK = s => ({
    react: s > 0.8 ? 0.22 : 0.95 - 0.8 * s,   // notices a call this late: easy 0.67 s, normal 0.39 s, hard 0.22 s (a quick person)
    late: 0.6 * (1 - s),            // chance a call is noticed even later (looked away)
    duty: 0.55 + 0.45 * s,          // share of the time it keeps running (easy runs in fits and starts)
    lag: 0.36 - 0.26 * s,           // sees you this late
    aim: 50 * (1 - s),              // stands up to this far off the ball (px)
    dawdle: 0.7 * (1 - s),          // short stops per second (none on hard)
    range: 40 + 26 * s + (s > 0.8 ? 14 : 0),   // bumps when you're this close (px between centres; a lunge reaches about 95)
    rate: 1 + 14 * s * s,           // how eagerly it bumps when it should (per second)
    guard: s > 0.5 ? 0.6 + 0.8 * s : 0,   // when it leads: bumps first in the last this many s before LOCK
    wild: 0.25 * (1 - s),           // easy: a bump from too far now and then (per second)
    waitR: 150 - 40 * s,            // waits this far from the centre while the ball rolls
    hopRead: s > 0.5,               // runs to the next hop's shadow
  });
  const RW = () => MODES.roulette.test;
  const ang = (u, v) => Math.atan2(v, u);
  function toFloor(u, v, th) { const c = Math.cos(th), s = Math.sin(th); return { x: u * c - v * s, y: u * s + v * c }; }
  // the 8 key directions: a wheel-frame direction turned into held keys
  function keysFor(out, du, dv, th) {
    const f = toFloor(du, dv, th), a = Math.atan2(f.y, f.x), k = Math.round(a / (Math.PI / 4));
    const dx = Math.round(Math.cos(k * Math.PI / 4)), dy = Math.round(Math.sin(k * Math.PI / 4));
    out.right = dx > 0; out.left = dx < 0; out.down = dy > 0; out.up = dy < 0;
  }
  // circles to steer round (wheel frame): the hub and the pegs
  function obstacles(mst) {
    const P = mst.P, list = [{ u: 0, v: 0, r: P.hubR + P.rb + 10 }];
    if (P.pegs) for (const pg of mst.pegs || []) list.push({ u: pg.u, v: pg.v, r: P.pegR + P.rb + 7 });
    return list;
  }
  // a way point round the first circle on the straight line to (tu, tv), or null
  function detour(mst, s, tu, tv) {
    const du = tu - s.u, dv = tv - s.v, L = Math.hypot(du, dv);
    if (L < 1) return null;
    const ex = du / L, ey = dv / L;
    let best = null, bt = 1e9;
    for (const c of obstacles(mst)) {
      const t = (c.u - s.u) * ex + (c.v - s.v) * ey;
      if (t < -c.r || t > L) continue;
      const px = s.u + ex * t - c.u, py = s.v + ey * t - c.v, d = Math.hypot(px, py);
      if (d >= c.r || t >= bt) continue;
      // the target itself inside the circle (a ball beside a peg): just go there
      if (Math.hypot(tu - c.u, tv - c.v) < c.r) continue;
      bt = t;
      let nx = px, ny = py;
      if (d < 1) { nx = -ey; ny = ex; } else { nx /= d; ny /= d; }
      best = { u: c.u + nx * (c.r + 16), v: c.v + ny * (c.r + 16) };
    }
    return best;
  }
  // run to (tu, tv) and stop there (the wheel frame: a spot on the wheel stays put while nobody pushes)
  function seek(out, mst, s, tu, tv, dead) {
    const P = mst.P, th = mst.th;
    const w = detour(mst, s, tu, tv);
    if (w) { keysFor(out, w.u - s.u, w.v - s.v, th); return false; }
    const du = tu - s.u, dv = tv - s.v, d = Math.hypot(du, dv), vu = s.wu, vv = s.wv, sp = Math.hypot(vu, vv);
    if (d <= dead) {
      if (sp > 40) keysFor(out, -vu, -vv, th);
      return sp <= 40;
    }
    const ex = du / d, ey = dv / d, vt = vu * ex + vv * ey;
    const stop = vt > 0 ? vt * vt / (2 * P.fric) : 0;
    if (stop >= d - dead * 0.5 && sp > 30) { if (P.fric < 1500) keysFor(out, -vu, -vv, th); return false; }  // brake (slippery: push back)
    const vmax = P.maxV, cu = ex * vmax - vu, cv = ey * vmax - vv;
    if (Math.hypot(cu, cv) < 25) keysFor(out, ex, ey, th); else keysFor(out, cu, cv, th);
    return false;
  }
  const lit = b => b.wedge >= 0 && (b.state === 'set' || b.state === 'drop');

  cpuBrain('roulette', {
    noIdleStop: true,
    reset(st) { st.round = -1; },
    bubblePos(p) { return { x: p.x + p.w / 2, y: p.y + p.h - p.h * 1.25 }; },
    think(st, p, o, dt, info) {
      const out = {}, M = G.match, mst = info.mst;
      if (!M || !mst || !mst.pl || !mst.P) return out;
      if (M.phase !== 'live' || mst.ended) {
        st.seen = {}; st.aimFor = null; st.dawT = 0; st.ball = null; st._lag_o = null;
        if (M.phase === 'live') st.round = M.round;
        return out;
      }
      const sk = SK(info.skill), P = mst.P, s = mst.pl[p.id], so = mst.pl[o.id], k = p.id;
      st.idleLive = info.partnerCpu || info.partnerIdle <= 0.02 ? 0 : (st.idleLive || 0) + dt;   // you pressed nothing in live play
      st.seen = st.seen || {};
      // what it sees of you, a moment late
      const ov = cpuLag(st, 'o', { u: so.u, v: so.v, stun: so.stun, lunge: so.lungeT }, sk.lag);

      /* ---- which ball (if any) it is racing for ---- */
      let tb = null;
      const cands = [];
      for (const b of mst.balls) {
        if (!lit(b)) continue;
        const key = mst.spinN + ':' + b.id + ':' + b.wedge;
        if (st.seen[key] === undefined) st.seen[key] = G.time + sk.react + (Math.random() < sk.late ? 0.3 + Math.random() * 0.5 : 0);
        if (G.time >= st.seen[key]) cands.push(b);
      }
      if (cands.length) {
        const score = b => { const q = RW().ballUV(b); return Math.hypot(q.u - s.u, q.v - s.v) - 0.8 * Math.hypot(q.u - ov.u, q.v - ov.v); };
        const cur = cands.find(b => b === st.ball);
        let best = cands[0];
        for (const b of cands) if (score(b) < score(best)) best = b;
        tb = cur && score(cur) < score(best) + 50 ? cur : best;
      }
      st.ball = tb;

      // easy and normal stop for a moment now and then
      if (st.dawT > 0) { st.dawT -= dt; return out; }
      if (cpuChance(sk.dawdle, dt)) { st.dawT = 0.15 + Math.random() * 0.35; return out; }

      /* ---- where to stand ---- */
      let tu, tv, dead = 5;
      if (tb) {
        const q = RW().ballUV(tb), wa = tb.wedge * Math.PI / 3;
        if (tb.state === 'drop') {
          // still dropping in: the lit wedge, near where the ball is now
          let a = ang(q.u, q.v), da = Math.atan2(Math.sin(a - wa), Math.cos(a - wa));
          da = clamp(da, -0.38, 0.38); a = wa + da;
          tu = 236 * Math.cos(a); tv = 236 * Math.sin(a);
        } else {
          let a = ang(q.u, q.v);
          if (P.hop && sk.hopRead && tb.hopTo >= 0) a = RW().pocketA(tb.hopTo);   // the shadow of its next hop
          tu = 258 * Math.cos(a); tv = 258 * Math.sin(a);
        }
        // a small aiming error, the same for the whole spin (none on hard)
        const ak = mst.spinN + ':' + tb.id;
        if (!st.aimFor || st.aimFor.key !== ak) { const r = sk.aim * Math.random(), t = Math.random() * Math.PI * 2; st.aimFor = { key: ak, u: r * Math.cos(t), v: r * Math.sin(t) }; }
        tu += st.aimFor.u; tv += st.aimFor.v;
        const rr = Math.hypot(tu, tv), rMax = P.R - P.rb - 2;
        if (rr > rMax) { tu *= rMax / rr; tv *= rMax / rr; }
      } else {
        // the ball is rolling: wait near the hub, on its own side
        const a = ang(s.u, s.v);
        tu = sk.waitR * Math.cos(a); tv = sk.waitR * Math.sin(a); dead = 14;
      }
      // easy runs in fits and starts (a short let-go every now and then)
      st.fitT = (st.fitT || 0) - dt;
      if (st.fitT <= 0) { st.fitT = 0.12; st.fit = Math.random() < sk.duty; }
      if (s.stun <= 0 && s.whiff <= 0 && s.wob <= 0 && s.lungeT <= 0 && st.fit) seek(out, mst, s, tu, tv, dead);

      /* ---- bump ---- */
      const canBump = s.cd <= 0 && s.whiff <= 0 && s.wob <= 0 && s.stun <= 0 && s.lungeT <= 0;
      const d = Math.hypot(ov.u - s.u, ov.v - s.v);
      if (canBump) {
        let want = 0;
        if (tb) {
          const q = RW().ballUV(tb), myD = Math.hypot(q.u - s.u, q.v - s.v), oD = Math.hypot(q.u - ov.u, q.v - ov.v);
          const wedgeOf = (u, v) => RW().wedgeAt(ang(u, v));
          const meOn = wedgeOf(s.u, s.v) === tb.wedge, oOn = wedgeOf(ov.u, ov.v) === tb.wedge;
          const oLeads = (oOn && !meOn) || (oOn === meOn && oD < myD);
          const dizzy = ov.stun > 0.05;
          const lockIn = tb.state === 'set' ? tb.lockLeft : 9;
          if (d < sk.range && (!dizzy || (info.skill > 0.8 && lockIn < 1.2))) {
            if (oLeads) want = sk.rate;
            else if (lockIn < sk.guard && lockIn > 0.15 && d < sk.range - 8) want = sk.rate;
          }
          if (d < 120 && d > sk.range && cpuChance(sk.wild, dt)) want = Infinity;
        } else if (d < sk.range - 10 && ov.stun <= 0 && info.skill > 0.5) want = 0.3 * info.skill;   // shoving for the middle
        if (want && cpuChance(want, dt)) out.act = 'tap';
      }
      // you let a spin or two go by without pressing anything (live play only, not the intro or banners) and you're off
      // the lit color: once it says what to do
      if (tb && st.idleLive > 12 && !st.said && RW().wedgeAt(ang(so.u, so.v)) !== tb.wedge) { st.said = true; cpuSay(p, 'Race me to it!'); }
      return out;
    },
  });
})();
