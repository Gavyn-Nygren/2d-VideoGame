/* Pip & Bo - Computer partner: 20-1 Volcano Dragon, phase 'surf' (Lava Surf Race, versus). */
'use strict';

/* The computer is the OPPONENT here (versus inside the team level), at the saved Opponent setting: info.vs from
   vdVersusSkill (Easy / Normal / Hard), not cpuSkill (always 1 in a team level). It surfs like a person who watches its
   own lane: its own spot and speed, the rocks, ramps, waves and geysers ahead (what the lane shows), never the other
   lane's things. The same code drives Pip and Bo, so there is no side bias. The gold slab helps it like a person.
     lean     holds ▶ (Easy lets go now and then, like a kid looking around, and starts a moment after GO).
     rocks    taps jump so the top of the hop is over the rock, with a human timing error (a habit this race plus a
              fresh wobble each time); Easy sometimes forgets.
     ramps    taps jump on the gold POP edge near the lip (Easy often just rides off, sometimes too early).
     waves    hops each lava wave as it rolls up (the closing speed is its own plus the wave's).
     tricks   in the air it guesses how long until it lands (the ballistic arc over the track, as a person judges it)
              and presses trick only if there is time; Easy guesses badly now and then and wobbles.
     geysers  it times the spout: rides on if it gets past before (or after) it, else leans back just long enough
              (vdSurfGeyWait, with a human error); Easy rarely bothers.
   In 1-player mode it says a few short things ("Catch me!", "Wheee!", "Good race!"). While the person is away the
   core brain returns {} and the race freezes (Cinder waits), so it never wins alone.
   Tuning (bot runs, see the phase notes): Hard beats Easy clearly from both sides; a kid-like scripted player (the
   'kid' profile below, driven through this same code) beats Easy most of the time. */
const VDSURF_SK = {
  //        rock timing spread / habit (s), forget, pop chance + spread, trick chance + safety margin, bad-guess chance,
  //        geyser care, lapses per s, GO delay
  easy:   { sig: 0.075, bias: 0.035, miss: 0.16, popP: 0.35, popSig: 0.07, trickP: 0.45, marg: 0.12, bad: 0.25, gey: 0.25, lapse: 0.16, react: 0.45 },
  normal: { sig: 0.045, bias: 0.015, miss: 0.04, popP: 0.8, popSig: 0.045, trickP: 0.85, marg: 0.08, bad: 0.08, gey: 0.7, lapse: 0.03, react: 0.22 },
  hard:   { sig: 0.025, bias: 0.008, miss: 0, popP: 0.97, popSig: 0.022, trickP: 1, marg: 0.04, bad: 0, gey: 0.97, lapse: 0, react: 0.12 },
  // a kid-like person, for bot tests only (between Easy and Normal: sloppy timing, forgets sometimes)
  kid:    { sig: 0.06, bias: 0.03, miss: 0.08, popP: 0.6, popSig: 0.06, trickP: 0.6, marg: 0.1, bad: 0.15, gey: 0.5, lapse: 0.05, react: 0.35 },
};
const vdSurfSkOf = s => (s <= 0.4 ? VDSURF_SK.easy : s < 0.9 ? VDSURF_SK.normal : VDSURF_SK.hard);
const vdSurfGauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 2;   // about N(0, 1)

// The best moment to hop over something at x0 (moving at vx, half width hw, height h(s) after s seconds): try takeoffs
// over the next 0.7 s and keep the one that clears it highest. P keeps the estimate; returns true when it is time to
// press (the best moment plus the plan's timing error P.err, + late / - early).
function vdSurfHopNow(P, ph, r, v, x0, vx, hw, h, dt) {
  const K = VDSURF, T = ph.T;
  if (P.best == null || (P.recalc = (P.recalc || 0) - dt) <= 0) {
    P.recalc = 1 / 30;
    let best = -1e9, bt = 0;
    for (let tau = 0; tau <= 0.7; tau += 1 / 60) {
      const xt = r.x + v * tau, vyG = v * vdSurfSlope(T, xt);
      let x = xt, y = vdSurfGround(T, xt), vy = Math.min(vyG, 0) * K.rampK + Math.max(vyG, 0) - K.jumpV, m = 1e9, over = false;
      for (let s = 0; s < 1.2; s += 1 / 120) {
        vy += K.g / 120; x += v / 120; y += vy / 120;
        const cx = x0 + vx * (tau + s);
        if (Math.abs(x - cx) <= hw + K.slabHalf) { over = true; m = Math.min(m, vdSurfGround(T, cx) - h(tau + s) - y); }
        if (y >= vdSurfGround(T, x)) break;
      }
      const sc = over ? m : -1e9;
      if (sc > best + 0.5) { best = sc; bt = tau; }
    }
    if (!P.locked) { P.best = ph.t + bt; if (bt < 1 / 60) P.locked = true; }
  }
  return ph.t >= P.best + P.err;   // (race time: it stands still while the race waits for an away person)
}

// Geysers: how long to lean back from now (s) so the slab passes geyser g outside its spouts with `marg` s to spare:
// 0 = ride on now, -1 = no wait clears it (ride on). A simple ground ride forward (lean back for tau, then lean
// forward), the way a person judges "slow down a bit, then go".
function vdSurfGeyWait(ph, r, g, marg) {
  const K = VDSURF, T = ph.T, hw = K.geyW + K.slabHalf * 0.6 + 4, c = ph.clock + g.off, eS = K.geyCalm + K.geyWarn;
  const m = c - Math.floor(c / K.geyP) * K.geyP;
  const s0 = m >= eS ? -(m - eS) : eS - m;   // the start of the current or next spout (from now)
  const hit = (a, b) => { for (let j = 0; j < 4; j++) { const e0 = s0 + j * K.geyP, e1 = e0 + K.geyErupt; if (a < e1 + marg && b > e0 - marg) return true; } return false; };
  const h = 1 / 60;
  for (let tau = 0; tau <= 2.4; tau += 0.1) {
    let x = r.x, v = Math.max(K.vMin, r.v), t = 0, tin = null, boost = r.boost;
    while (t < 4) {
      const back = t < tau, s = vdSurfSlope(T, x);
      let vt = K.cruise + K.slopeK * clamp(s, -0.6, 1.2);
      if (boost > 0) vt += K.boostAdd;
      vt = back ? vt * K.slowK : vt + K.leanAdd;
      v = clamp(approach(v, vt, (v < vt ? (boost > 0 ? K.accFast : K.acc) : back ? K.brake : K.decay) * h), K.vMin, K.vMax);
      x += v * h; t += h; boost -= h;
      if (tin == null && x >= g.x - hw) tin = t;
      if (x > g.x + hw) break;
    }
    if (tin == null) tin = 0;
    if (!hit(tin, t)) return tau;
  }
  return -1;
}

VD_BRAINS.surf = {
  SK: VDSURF_SK,
  reset(bst) { bst.race = null; },
  think(bst, p, o, dt, info, S) {
    const out = {}, ph = S.ph, K = VDSURF;
    if (!ph || !ph.R || ph.state === 'crown') return out;
    const k = p.id, r = ph.R[k], sk = bst.sk || vdSurfSkOf(info.vs);
    // a new race: a fresh habit
    if (bst.race !== ph.R) { bst.race = ph.R; bst.bias = vdSurfGauss() * sk.bias; bst.plans = {}; bst.lapse = 0; bst.goT = null; bst.trickNo = false; bst.said = bst.said || {}; }
    if (ph.state === 'card') {
      if (ph.cardT < 2 && ph.raceN === 1 && !ph.replay) vdBrainSay(bst, p, 'hi', 'Catch me if you can!', 60);
      return out;
    }
    if (r.fin != null) {
      if (ph.end && ph.end.w === k) vdBrainSay(bst, p, 'won' + ph.raceN, 'Woohoo!', 30);
      else if (ph.end && ph.end.w === 1 - k) vdBrainSay(bst, p, 'lost' + ph.raceN, 'Good race!', 30);
      return out;
    }
    if (bst.goT == null) bst.goT = ph.t;
    if (ph.t - bst.goT < sk.react) return out;
    if (bst.lapse > 0) { bst.lapse -= dt; return out; }
    if (sk.lapse && ph.t > 2 && !r.air && cpuChance(sk.lapse, dt)) { bst.lapse = 0.25 + Math.random() * 0.35; return out; }
    out.right = true;
    const plan = (key, make) => bst.plans[key] || (bst.plans[key] = make());
    const v = Math.max(80, r.v);
    // rocks: hop so the slab passes highest over the rock (judged from the slope it sees), with a human error
    const rk = vdSurfAhead(ph, k, r.x, 'rock');
    if (rk && !r.air && r.wob <= 0 && rk.x - r.x < v * 0.8) {
      const P = plan('r' + rk.x, () => ({ err: bst.bias + vdSurfGauss() * sk.sig, miss: Math.random() < sk.miss }));
      if (!P.miss && !P.done && vdSurfHopNow(P, ph, r, v, rk.x, 0, rk.w / 2, () => rk.h, dt)) { out.jump = 'tap'; P.done = true; }
    }
    // ramps: the gold POP edge
    const kk = vdSurfAhead(ph, k, r.x, 'kick');
    if (kk && kk.x0 < r.x + 600) {
      const P = plan('k' + kk.lip, () => ({ go: Math.random() < sk.popP, err: vdSurfGauss() * sk.popSig }));
      const hk = ph.help[k] ? K.help.pop : 1, tt = (kk.lip - K.popLen * hk * 0.45 - r.x) / v;
      if (P.go && !P.done && !r.air && tt <= P.err && r.x < kk.lip) { out.jump = 'tap'; P.done = true; }
      if (P.go && !P.done && r.air && !r.jumped && r.lipK === kk && r.airT < K.coyote) { out.jump = 'tap'; P.done = true; }
    }
    // lava waves rolling toward it
    const wv = vdSurfAhead(ph, k, r.x, 'wave');
    if (wv && !r.air && r.wob <= 0 && wv.x - r.x < (v + K.waveV) * 0.8) {
      const P = plan('w' + wv.i, () => ({ err: bst.bias + vdSurfGauss() * sk.sig, miss: Math.random() < sk.miss }));
      if (!P.miss && !P.done && vdSurfHopNow(P, ph, r, v, wv.x, -K.waveV, 14, s => wv.A * Math.min(1, (wv.t + s) / 0.5), dt)) { out.jump = 'tap'; P.done = true; }
    }
    // geysers: time it like a person: ride on if it gets past before the spout (or after it), else lean back just long
    // enough (vdSurfGeyWait); a plan per spout, re-judged as it comes closer
    const gy = vdSurfAhead(ph, k, r.x, 'gey');
    if (gy && gy.x - r.x < 650 && !r.air) {
      const P = plan('g' + gy.x + ':' + Math.floor((ph.clock + gy.off) / K.geyP), () => ({ care: Math.random() < sk.gey, err: vdSurfGauss() * sk.sig * 1.5 }));
      if (P.care && vdSurfGeyWait(ph, r, gy, Math.max(0.03, 0.1 + P.err)) > 0) { out.right = false; out.left = true; }
    }
    // tricks: only with time to land them
    if (r.air && !r.trick && r.wob <= 0 && !r.tossAir && !bst.trickNo) {
      const land = vdSurfLandIn(ph.T, r, 2), need = K.trickT * (ph.help[k] ? K.help.trick : 1);
      const P = plan('t' + r.airN + ':' + r.trickN, () => ({ go: Math.random() < sk.trickP, bad: Math.random() < sk.bad }));
      const marg = P.bad ? -0.18 : sk.marg;
      if (P.go && land > need + marg && r.airT > 0.04) { out.act = 'tap'; if (r.trickN === 0 && Math.random() < 0.3) vdBrainSay(bst, p, 'wee', 'Wheee!', 15); }
    }
    return out;
  },
};
