/* Pip & Bo - Computer partner: 30-1 The Time Thief, era 'troy' (The Fall of Troy, 1200 BC). */
'use strict';

/* The wooden horse has two jobs and the era hands them out (they swap after stretch 1 and 2), so the brain plays
   whichever job its player has right now (S.ph.roller) and never has to choose. It reads only what a person sees:
   - while the scene is lit (S.ph.light above 0.3): the lantern beams on the ground (S.ph.spots: where, how fast,
     which way), a guard raising his lantern with a "?" (the 0.8 s telegraph: where his beam will start and which way
     it will go), the patrol and his hand lantern, the signs for narrow gates and loose planks, ramps, the gold star;
   - in the dark: only the gold light that leaks through the planks where a beam is on the horse (S.ph.lit, lit0,
     lit1), the horse's own speed, and the claw.
   Every decision is taken a person's reaction time late (0.13 s to stop or duck, 0.2 s to start again).

   ROLLER (tthTroyBrainRoll)
   - It never starts before the lookout has opened the hatch once (the era begins lit, but an idle person at the
     hatch must not get free metres).
   - It cannot see in the dark and the wheels do not turn there, so it lets go and says "Too dark! Peek, please!"
     (on a ramp it holds the brake so the horse does not roll back). That is also why it can never clear anything
     alone: with an idle lookout the hatch stays shut.
   - In the light it works out, for every beam and every "?" guard, how long until that beam reaches the horse if it
     keeps rolling. It rolls while that is longer than its braking time plus a margin, and brakes (left) otherwise;
     standing still, it only starts again when the next beam is more than about a second away, so it rolls in the
     gaps like a person and does not twitch forward under a beam. After a noise ("?" from a clonk or a scrape) it
     stays put until the guard has looked away again.
   - Signs: it tiptoes (down) from about 100 px before a narrow gate until the nose is through, and over a loose
     plank; it keeps rolling up a ramp; it brakes onto the gold star at the end and creeps the last bit if short.
   - The claw: it pulls against the Thief (holds right) for as long as he tugs.
   LOOKOUT (tthTroyBrainLook)
   - It holds the action to peek whenever no beam is on or about to reach the horse's head (0.5 s ahead in the
     light). In the dark it opens up unless the gold leak is on or right next to the head; if a beam turns out to be
     close it ducks again within its reaction time (the era's own grace covers that blind look).
   - The claw: it holds the action to unhook (the ring only fills while the roller pulls) and says so.
   - In 1-player mode it calls the beams for the person ("Beam! Freeze!", "All clear, roll!", "Tiptoe here!").
   The core brain already stops everything while the person is away (info.away) and during cards and cutscenes. */

// seconds until a beam (or a guard's telegraphed beam) is on the strip [h.x + o0, h.x + o1] of a horse that keeps
// moving at hv. A guard's beam only sweeps his own strip of ground (it is marked on the road), so a beam that
// stops short of the horse never arrives (Infinity).
function tthTroyBrainEta(ph, o0, o1, hv) {
  const h = ph.h, a0 = h.x + o0, a1 = h.x + o1;
  let eta = Infinity;
  const sweep = (g, sx, t0) => {
    const v = g.dir * g.v * (g.gold > 1 ? 0.8 : 1), d = hv * t0, vs = { x0: sx - g.w / 2, x1: sx + g.w / 2, v };
    const e = tthTroyEta(vs, a0 + d, a1 + d, hv);
    if (e === Infinity) return e;
    const cx = sx + v * e;                       // where the beam's middle is when they meet
    return (g.dir < 0 ? cx < g.z0 - 4 : cx > g.z1 + 4) ? Infinity : t0 + e;
  };
  for (const s of ph.spots) {
    if (!s.live) continue;
    const g = s.g;
    eta = Math.min(eta, g && g.state === 'sweep' ? sweep(g, g.sx, 0) : tthTroyEta(s, a0, a1, hv));
  }
  for (const g of ph.c.guards) {
    if (g.deco) continue;
    if (g.state === 'tele') eta = Math.min(eta, sweep(g, g.sx, Math.max(0, g.t)));           // "?": his beam starts at g.sx in g.t s
    else if (g.state === 'look' && g.lp === 'tele') eta = Math.min(eta, Math.max(0, g.t));  // he heard something: he will look right at the horse
  }
  return eta;
}
function tthTroyBrainRoll(bst, p, o, dt, info, S) {
  const K = TTHTROY, ph = S.ph, h = ph.h, c = ph.c, out = {};
  if (ph.caught || ph.swap || ph.done || ph.kick != null) { bst.go = bst.want = false; bst.goT = 0; return out; }
  const onRamp = c.ramps.some(r => r.rise > 0 && h.x + K.wheel > r.x0 && h.x - K.wheel < r.x0 + r.len);
  if (ph.claw) {
    if (ph.claw.st === 'tug') { out.right = true; if (ph.light < K.rollLight) tthBrainSay(bst, p, 'dark', 'Too dark to pull! Peek!', 6); }
    bst.go = bst.want = false; bst.goT = 0;
    return out;
  }
  if (!ph.peeked) {
    // the era starts lit (a first look at the plain), but the horse waits for the lookout's first peek: no free metres
    bst.go = bst.want = false; bst.goT = 0;
    if (ph.t > 2.5) tthBrainSay(bst, p, 'dark', 'Peek out, please! Then I roll.', 7);
    return out;
  }
  if (ph.light < 0.3) {
    // nothing to see, and the wheels will not turn
    bst.go = bst.want = false; bst.goT = 0;
    if (onRamp || Math.abs(h.v) > 30) out.left = true;
    if (ph.t > 2.5 && ph.light < K.rollLight) tthBrainSay(bst, p, 'dark', ph.lit ? 'A beam is on us. Shh!' : 'Too dark! Peek, please!', 7);
    return out;
  }
  const b0 = K.body[0] - 10, b1 = K.body[1] + 10, v = Math.max(0, h.v);
  const stopT = v / K.brake + 0.34;
  const etaNow = tthTroyBrainEta(ph, b0, b1, h.v), etaGo = tthTroyBrainEta(ph, b0, b1, Math.max(h.v, K.vmax * 0.8));
  const looked = c.guards.some(g => g.state === 'look');
  let want;
  if (looked || ph.lit) want = false;
  else if (bst.go) want = etaNow > stopT;
  else want = etaGo > 1.15;
  // a person's reaction time: 0.13 s to brake, 0.2 s to start again
  if (want !== bst.want) { bst.want = want; bst.goT = want ? 0.2 : 0.13; }
  if (bst.goT > 0 && (bst.goT -= dt) <= 0) bst.go = bst.want;
  if (bst.go == null) bst.go = false;
  if (!bst.go) {
    if (Math.abs(h.v) > 2 || onRamp) out.left = true;
    if (ph.lit || etaNow < 0.6) tthBrainSay(bst, p, 'frz', 'Freeze!', 7);
    return out;
  }
  // signs: narrow gates, loose planks, the gold star
  const nose = h.x + K.body[1], fw = h.x + K.wheel;
  const gate = c.gates.find(g => nose > g.x - 105 && nose < g.x + K.gateLen + 8);
  const plank = c.bumps.find(b => fw > b.x - 85 && fw < b.x + 4);
  if (gate && !onRamp) {
    const lim = (gate.gold ? K.slowGold : K.slow) - 8;
    if (h.v > lim && nose > gate.x - 34) out.left = true; else out.down = true;
    tthBrainSay(bst, p, 'gate', 'Tiptoe through the gate...', 9);
    return out;
  }
  if (plank && !onRamp) {
    if (h.v > K.slow - 8 && fw > plank.x - 26) out.left = true; else out.down = true;
    tthBrainSay(bst, p, 'plank', 'Shh... a loose plank.', 9);
    return out;
  }
  if (ph.k === 2) {
    const d = h.x - c.goal, stopD = v * v / (2 * K.brake) + v * 0.05;
    if (d + stopD >= -6) {
      if (d < K.park[0] + 16 && h.v < 20) out.down = true;       // short of the star: creep on
      else if (Math.abs(h.v) > 3) out.left = true;
      return out;
    }
  }
  out.right = true;
  return out;
}
function tthTroyBrainLook(bst, p, o, dt, info, S) {
  const K = TTHTROY, ph = S.ph, h = ph.h, c = ph.c, out = {};
  if (ph.caught || ph.swap || ph.done) return out;
  if (ph.claw) {
    out.act = true;
    if (ph.claw.st === 'tug' && !ph.claw.pulling) tthBrainSay(bst, p, 'pull', 'Pull, and I\'ll unhook!', 5);
    return out;
  }
  const e0 = K.head[0] - 12, e1 = K.head[1] + 12;
  let want;
  if (ph.light > 0.3) {
    const eta = tthTroyBrainEta(ph, e0, e1, h.v);
    want = eta > (bst.peek ? 0.5 : 0.7);
    if (c.guards.some(g => g.state === 'look')) want = false;
  } else want = !(ph.lit && ph.lit1 > K.head[0] - 46 && ph.lit0 < K.head[1] + 46);
  if (want !== bst.want) { bst.want = want; bst.peekT = want ? 0.2 : 0.13; }
  if (bst.peekT > 0 && (bst.peekT -= dt) <= 0) bst.peek = bst.want;
  if (bst.peek == null) bst.peek = false;
  if (bst.peek) out.act = true;
  // calling it for the person at the wheels
  if (ph.light > 0.3 && !tthTroyEvent(ph)) {
    const etaB = tthTroyBrainEta(ph, K.body[0], K.body[1], h.v);
    const nose = h.x + K.body[1], fw = h.x + K.wheel;
    if (etaB < 0.9 && Math.abs(h.v) > K.still) tthBrainSay(bst, p, 'beam', 'Beam! Freeze!', 4);
    else if (c.gates.some(g => nose > g.x - 200 && nose < g.x + K.gateLen) && h.v > K.slow) tthBrainSay(bst, p, 'slow', 'Narrow gate! Tiptoe!', 6);
    else if (c.bumps.some(b => fw > b.x - 170 && fw < b.x) && h.v > K.slow) tthBrainSay(bst, p, 'slow', 'Loose plank! Tiptoe!', 6);
    else if (etaB > 2 && Math.abs(h.v) < K.still && !ph.lit) { if ((bst.clearT = (bst.clearT || 0) + dt) > 1.4) tthBrainSay(bst, p, 'clear', 'All clear, roll!', 8); }
    else bst.clearT = 0;
  }
  return out;
}
TTH_BRAINS.troy = {
  reset(bst) { bst.go = false; bst.want = null; bst.goT = 0; bst.peek = false; bst.peekT = 0; bst.job = null; },
  think(bst, p, o, dt, info, S) {
    const ph = S.ph;
    if (!ph || !ph.h || !ph.c) return {};
    const job = p.id === ph.roller ? 'roll' : 'look';
    if (bst.job !== job) { bst.job = job; bst.go = false; bst.peek = false; bst.want = null; bst.goT = 0; bst.peekT = 0; }
    return job === 'roll' ? tthTroyBrainRoll(bst, p, o, dt, info, S) : tthTroyBrainLook(bst, p, o, dt, info, S);
  },
  back(bst) { bst.go = false; bst.peek = false; bst.want = null; bst.goT = 0; bst.peekT = 0; },
};
