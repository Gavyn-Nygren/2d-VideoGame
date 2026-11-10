/* Pip & Bo - Computer partner: 30-1 The Time Thief, era 'finale' (The End of Time). */
'use strict';

/* The End of Time (js/levels/world30/tth-finale.js): a clockwork tower climbed in 4 ledges, then the machine is smashed
   together. The level hands out the jobs (S.ph.holder brakes, the other one climbs; they swap at every ledge), so the
   computer simply does whichever job its player has: there is nothing to fight over. It reads only what a person can
   see on the screen: the platforms and where they are going (a person watches a pendulum swing too), the gear lamps,
   the grip meter, the huge hand, the bubble rings, the ram lamps.
   HOLDER (tthFinBrainHold): walks to the brake lever and stands there. It HOLDS the action when the climber needs it:
     - the climber stands on the thing just before a gear (or already rides a peg, or is in the air between them), or
     - the huge hand is on its red stretch while the climber is up in the clockwork.
     It lets go the moment nobody needs the brake, so the grip refills. For a climber who only WAITS at a gear it holds
     from a good grip (TTHFINB.gripGo) down to gripKeep and then rests, so there is always enough grip left for a ride
     that starts at the last moment; once the climber rides, it holds on to the end. After a slip it lets go and waits
     for gripGo. It reacts TTHFINB.react (0.15 s) late, like a person. A bubble aimed at the lever: it steps to the
     other side of the lever (still in reach) instead of jumping, because a jump would let go of the brake.
   CLIMBER (tthFinBrainClimb): follows the clockwork in order (sec.els, then the hatch, then the button). From where it
     stands it walks to the edge nearest the next thing and looks ahead: tthFinBrainSim plays a full jump forward
     (with its own 0.12 s reaction time and the next thing moving the way it visibly moves: tthFinElAt / the gear's
     turn) and it only jumps when that lands well inside the platform. A tooth must stay out for a moment after the
     landing. A gear is only boarded while its lamp is green, the brake is held and the grip meter shows enough for
     the ride (gripRide), so it WAITS for the holder (and says "Brake, please!"). On a peg it stands on the hatch side
     and jumps up through the hatch as soon as it is under it and high enough. On the next deck it walks to the
     button and presses once. Bubbles: it moves on if it can, else steps out of the ring, else hops over the pop.
   THE LIFT: whoever is still below walks into the lift column and rides up; whoever is up keeps out of the shaft.
   THE TOP (tthFinBrainTop): it takes the plunger the partner leaves (the nearer one when both are free), hops cogs
     (when one is about 0.16 s away), hops over a bubble's pop, and presses TOGETHER: when the partner's ram shoots it
     follows 0.15 s later; when both stand ready on green lamps it counts a beat and leads (with two computers Pip
     leads and Bo follows). After a lone ram it lets the person lead for a while ("You first!"). A hit always needs the
     partner's own press, so the computer never smashes the machine alone; with an idle person nothing moves on: an
     idle holder never brakes (no gear can be ridden), an idle climber never climbs, an idle smasher never presses.
   While the person is away (info.away) the core brain returns no input at all. Bubbles (tthBrainSay) only show in
   1-player mode. No hidden state is read: S.ph is used for positions, lamps and meters that are all drawn. */
const TTHFINB = { react: 0.15, jumpLead: 0.12, gripGo: 0.72, gripKeep: 0.45, gripRide: 0.42, near12: 0.9, edge: 5, land: 9 };
const TTHFINB_TMP = { x: 0, y: 0, solid: true, warn: false };
// The brain thinks before the era's tick, when p.x / p.y are still SCREEN coords: the era's world is screen + camera
// (the camera only scrolls up and down here).
const tthFinBrainFeet = p => p.y + p.h + G.mst.cam.y;

// hold a button for a short moment, at most once every `every` s (a person's single press)
function tthFinBrainPress(bst, key, every, dt, want) {
  const k = '_pr_' + key, q = bst[k] || (bst[k] = { hold: 0, cd: 0 });
  q.cd -= dt;
  if (q.hold > 0) { q.hold -= dt; return true; }
  if (want && q.cd <= 0) { q.hold = 0.07; q.cd = every; return true; }
  return false;
}
// where a platform (a plat of the level: shelf, bob, piston, tooth, peg, deck, lift) will be t seconds from now, as a
// person sees it coming; out: { x, y, w, solid }
function tthFinBrainAt(ph, q, t, out) {
  out.w = q.w; out.solid = true;
  if (q.kind === 'peg') {
    const el = q.el; tthFinPegAt(el, q.n, el.a + el.w * el.dir * t, out); out.w = q.w; out.solid = q.solid;
  } else if (q.kind === 'pend' || q.kind === 'piston') {
    tthFinElAt(q.el, ph.tm + t * ph.mechK, out); out.w = q.w;
  } else if (q.kind === 'tooth') {
    // (the teeth stand still while the brake holds the clock)
    const tt = ph.braking ? ph.tt : ph.tt + t * ph.mechK, o2 = TTHFINB_TMP;
    tthFinElAt(q.el, tt, out); out.w = q.w;
    if (out.solid && !ph.braking) { tthFinElAt(q.el, tt + 0.5 * ph.mechK, o2); out.solid = o2.solid; }   // still out a moment later?
  } else { out.x = q.x; out.y = q.y; }
  return out;
}
// A full jump, started after `lead` s (the computer's reaction time), steering at the target all the way: does it land
// well inside target platform q? `from` is what p stands on (it carries p during the lead).
function tthFinBrainSim(ph, p, from, q, lead) {
  const o = TTHFINB_TMP_A, h = 1 / 60;
  let x = p.x, y = p.y + G.mst.cam.y, vx = 0, vy = -PHYS.jumpV, t = lead;
  if (from && from.kind !== 'deck' && from.kind !== 'shelf' && from.kind !== 'lift') {   // carried along while reacting
    const x0 = from.x, y0 = from.y; tthFinBrainAt(ph, from, lead, o); x += o.x - x0; y += o.y - y0;
    if (from.kind === 'tooth' && !o.solid) return false;
  }
  vx = p.vx;
  for (let n = 0; n < 62; n++) {
    t += h;
    tthFinBrainAt(ph, q, t, o);
    const d = o.x + o.w / 2 - (x + p.w / 2), dir = Math.abs(d) < 5 ? 0 : Math.sign(d);
    vx = dir ? approach(vx, dir * PHYS.maxRun, PHYS.accA * h) : approach(vx, 0, PHYS.fricA * h);
    const f0 = y + p.h;
    vy = Math.min(vy + PHYS.g * h, PHYS.maxFall);
    x = clamp(x + vx * h, TTHFIN.x0, TTHFIN.x1 - p.w); y += vy * h;
    if (vy > 0 && f0 <= o.y + 3 && y + p.h >= o.y - 1) return o.solid && x + p.w - 3 > o.x + TTHFINB.land && x + 3 < o.x + o.w - TTHFINB.land;
    if (vy > 0 && y + p.h > o.y + 40) return false;
  }
  return false;
}
const TTHFINB_TMP_A = { x: 0, y: 0, w: 0, solid: true, warn: false };
// a live bubble whose ring covers p (so p would be frozen when it lands), or null
function tthFinBrainThreat(ph, p) {
  const K = TTHFIN.bub;
  for (const b of ph.bubs) {
    if (b.dud || b.gone) continue;
    if (Math.abs(cpuCx(p) - b.tx) < K.rx + 5 && Math.abs(cpuCy(p) + G.mst.cam.y - b.ty) < K.ry + 6) return b;
  }
  return null;
}
// the gear the climber needs next (they stand on the thing before it, ride it, or are in the air right there), or null
function tthFinBrainNeed(bst, ph, cl, dt) {
  const sec = ph.sec, on = ph.P[cl.id].on;
  let need = null;
  if (on && on.kind === 'peg' && on.el.sec === ph.k) need = on.el;
  else if (on) {
    const i = on.el && on.el.sec === ph.k ? sec.els.indexOf(on.el) : -1, nx = sec.els[i + 1];
    if (nx && nx.kind === 'gear') need = nx;
  }
  // in the air: remember the last answer for a moment (a hop from the tooth to the peg must not drop the brake)
  if (on) { bst.needEl = need; bst.needT = 0.5; } else if ((bst.needT = (bst.needT || 0) - dt) > 0) need = bst.needEl || null; else bst.needEl = null;
  return need;
}

/* ---------- the holder ---------- */
function tthFinBrainHold(bst, p, o, dt, info, S, out) {
  const ph = S.ph, sec = ph.sec, K = TTHFIN, B = TTHFINB, lv = sec.lever, P = ph.P[p.id];
  // back on the deck first (a holder who wandered up the clockwork)
  let gx = lv.x;
  const th = tthFinBrainThreat(ph, p);
  if (th) { bst.side = lv.x - th.tx >= 0 ? 1 : -1; bst.sideT = 0.5; }
  if (bst.sideT > 0) { bst.sideT -= dt; gx = lv.x + bst.side * (K.lever.reach - 6); }
  tthBrainSeek(out, p, gx, bst.sideT > 0 ? 3 : 8);
  const at = p.grounded && P.on === sec.base.plat && Math.abs(cpuCx(p) - lv.x) <= K.lever.reach;
  // does the climber need the brake?
  const need = tthFinBrainNeed(bst, ph, o, dt), oon = ph.P[o.id].on;
  if (oon) bst.wasRiding = oon.kind === 'peg' && oon.el.sec === ph.k; else if (bst.needT <= 0) bst.wasRiding = false;
  const riding = !!bst.wasRiding;
  const upThere = tthFinBrainFeet(o) < sec.base.y - 8 && ph.P[o.id].on !== sec.upper.plat;
  const near12 = ph.hand.k >= B.near12 && upThere && ph.gold.hand < 2;
  let want = false;
  if (ph.slip) { bst.rest = true; want = false; }
  else if (riding || near12) want = true;
  else if (need) {
    if (bst.rest && ph.grip >= B.gripGo) bst.rest = false;
    if (!bst.rest && ph.grip <= B.gripKeep && !ph.gold.grip) bst.rest = true;
    want = !bst.rest;
  } else { bst.rest = ph.grip < B.gripGo; }
  want = tthBrainLate(bst, 'brake', want, B.react);
  if (ph.slip) want = false;
  if (at && want) out.act = true;
  // talk (1-player mode only)
  if (!bst.hello) { bst.hello = true; tthBrainSay(bst, p, 'job', 'I brake! You climb!', 30); }
  else if (need && !want && bst.rest) tthBrainSay(bst, p, 'rest', ph.slip ? 'Oops, slipped! One moment...' : 'Resting my grip... one moment!', 7);
  else if (need && ph.braking && !riding && need.w <= K.gear.ride) tthBrainSay(bst, p, 'go', 'Green lamp! Hop on!', 8);
  else if (riding && ph.braking) tthBrainSay(bst, p, 'hold', 'I\'ve got the brake!', 14);
  return out;
}

/* ---------- the climber ---------- */
function tthFinBrainClimb(bst, p, o, dt, info, S, out) {
  const ph = S.ph, sec = ph.sec, K = TTHFIN, B = TTHFINB, P = ph.P[p.id], on = P.on, up = sec.upper, cx = cpuCx(p);
  if (!bst.hello) { bst.hello = true; tthBrainSay(bst, p, 'job', 'I climb! You brake!', 30); }
  // on the next deck: walk to the button and press it once
  if (on === up.plat || (on === sec.lift && Math.abs(tthFinBrainFeet(p) - up.y) < 2)) {
    bst.plan = null;
    const bt = sec.button;
    if (bt.down) return out;
    tthBrainSeek(out, p, bt.x, 7);
    if (on === up.plat && Math.abs(cx - bt.x) <= K.button.reach - 5 && tthFinBrainPress(bst, 'btn', 0.5, dt, true)) out.act = true;
    return out;
  }
  // a jump under way: react, take off, steer at the target, let go on landing
  const pl = bst.plan;
  if (pl) {
    pl.t += dt;
    if (pl.t < B.jumpLead) return out;                                        // (reaction time: nothing yet)
    if ((p.grounded && pl.t > B.jumpLead + 0.15) || pl.t > 1.5) bst.plan = null;
    else {
      out.jump = pl.t < B.jumpLead + 0.42;
      if (pl.hatch) tthBrainSeek(out, p, clamp(cx, pl.hatch[0] + 16, pl.hatch[1] - 16), 3);
      else { const d = pl.q.x + pl.q.w / 2 - cx; out.left = d < -5; out.right = d > 5; }
      return out;
    }
  }
  if (!on) return out;                                                         // falling: see where we land
  const idx = on.el && on.el.sec === ph.k ? sec.els.indexOf(on.el) : -1, nx = sec.els[idx + 1];
  const x0 = on.kind === 'deck' || on.kind === 'lift' ? K.x0 + 12 : on.x + B.edge, x1 = on.kind === 'deck' || on.kind === 'lift' ? K.x1 - 12 : on.x + on.w - B.edge;
  const th = tthFinBrainThreat(ph, p);
  let gx = cx, go = null;
  if (on.kind === 'peg' && !nx) {
    // riding the last gear: stand on the hatch side of the peg, and up through the hatch when under it and high enough
    const h = sec.S.hatch, hc = (h[0] + h[1]) / 2;
    gx = clamp(hc, x0 + 3, x1 - 3);
    if (cx > h[0] + 12 && cx < h[1] - 12 && tthFinBrainFeet(p) <= up.y + 96) go = { t: 0, hatch: h };
    tthBrainSay(bst, p, 'ride', 'Hold the brake! Nearly there!', 14);
  } else if (nx && nx.kind === 'gear') {
    // a gear: only while its lamp is green, the brake is held and there is grip left for the ride
    const side = Math.sign((on.x + on.w / 2) - nx.x) || 1;
    gx = clamp(nx.x + side * nx.r * 0.75, x0, x1);
    const ready = ph.braking && nx.w <= K.gear.slow + 0.12 && (ph.grip >= B.gripRide || ph.gold.grip);
    if (ready) { for (const q of nx.pegs) if (q.solid && tthFinBrainSim(ph, p, on, q, B.jumpLead)) { go = { t: 0, q }; break; } }
    else if (p.grounded && Math.abs(cx - gx) < 14 && !ph.braking) tthBrainSay(bst, p, 'brake', ph.slip || ph.grip < B.gripRide ? 'I\'ll wait: rest your grip!' : 'Brake, please!', 6);
  } else if (nx) {
    const q = nx.plat;
    gx = clamp(q.x + q.w / 2, x0, x1);
    if (tthFinBrainSim(ph, p, on, q, B.jumpLead)) go = { t: 0, q };
  }
  if (go && p.grounded) { bst.plan = go; return out; }
  // a bubble is coming and there is nowhere to go yet: step out of the ring, or hop over the pop
  if (th) {
    const R = K.bub.rx + 12, a = th.tx - R, b = th.tx + R, rem = th.fly - th.t;
    const cand = Math.abs(gx - th.tx) >= K.bub.rx + 6 ? gx : (a >= x0 && (b > x1 || Math.abs(a - cx) < Math.abs(b - cx))) ? a : b <= x1 ? b : null;
    if (cand != null) gx = cand;
    else if (rem < 0.3 && rem > 0.1) out.jump = true;
  }
  tthBrainSeek(out, p, gx, 3);
  return out;
}

/* ---------- the lift ---------- */
function tthFinBrainLift(bst, p, o, dt, info, S, out) {
  const ph = S.ph, sec = ph.sec, L = sec.lift, cx = cpuCx(p), lx = L.x + L.w / 2;
  bst.plan = null;
  if (tthFinBrainFeet(p) > L.yTop + 30 || ph.P[p.id].on === L) {     // still below (or riding): into the lift column
    if (ph.P[p.id].on !== L || Math.abs(cx - lx) > 14) tthBrainSeek(out, p, lx, 6);
    if (ph.P[p.id].on === L) tthBrainSay(bst, p, 'lift', 'Going up!', 20);
    return out;
  }
  // up already: keep out of the shaft
  if (Math.abs(cx - lx) < L.w / 2 + 26) tthBrainSeek(out, p, lx + (lx < 480 ? 1 : -1) * (L.w / 2 + 60), 8);
  return out;
}

/* ---------- the top: smash it together ---------- */
function tthFinBrainTop(bst, p, o, dt, info, S, out) {
  const ph = S.ph, tp = ph.top, K = TTHFIN.smash, C0 = TTHFIN.cog, cx = cpuCx(p), ox = cpuCx(o), deckY = tthFinLY(4);
  if (!tp) return out;
  // which plunger: the one the partner leaves; the nearer one when both are free
  const oAt = Math.abs(ox - K.plX[0]) < 60 ? 0 : Math.abs(ox - K.plX[1]) < 60 ? 1 : -1;
  if (bst.pl == null) bst.pl = cx < ox ? 0 : cx > ox ? 1 : p.id;
  if (!info.partnerCpu && oAt >= 0) bst.pl = 1 - oAt;
  else if (info.partnerCpu && bst.pl0 == null) { bst.pl0 = 1; bst.pl = cx < ox ? 0 : cx > ox ? 1 : p.id; }
  const s = bst.pl, px = K.plX[s], r = tp.rams[s], or = tp.rams[1 - s];
  tthBrainSeek(out, p, px, 6);
  const at = p.grounded && Math.abs(tthFinBrainFeet(p) - deckY) < 1 && Math.abs(cx - px) <= K.reach - 5;
  // his tricks: hop a rolling cog; hop over a bubble's pop
  if ((bst.hopT = (bst.hopT || 0) - dt) > 0) { out.jump = true; out.left = out.right = false; return out; }
  for (const g of tp.cogs) {
    if (g.warn > 0) continue;
    const gap = (cx - g.x) * g.dir, v = C0.v * (tp.sleepy ? 0.72 : 1);
    if (gap > 0 && gap < C0.r + 12 + v * 0.17 && p.grounded) { bst.hopT = 0.32; out.jump = true; return out; }
  }
  const th = tthFinBrainThreat(ph, p);
  if (th) { const rem = th.fly - th.t; if (rem < 0.27 && rem > 0.08 && p.grounded) { bst.hopT = 0.3; out.jump = true; return out; } }
  if (tp.state === 'dock') { tthBrainSay(bst, p, 'top', 'To the plungers!', 30); return out; }
  // the press: follow the partner's ram at once; lead after a beat when both stand ready
  const oReady = o.grounded && Math.abs(ox - K.plX[1 - s]) <= K.reach;
  if (tp.state !== 'armed') { bst.readyT = 0; if (tp.state === 'hit') bst.leadWait = 0.45; return out; }
  if (!at || r.live > 0 || r.cool > 0) { if (r.cool > 0 && !info.partnerCpu) { bst.leadWait = 2.4; tthBrainSay(bst, p, 'first', 'Together! You go first!', 8); } bst.readyT = 0; return out; }
  const follow = tthBrainLate(bst, 'ram', or.live > 0 && or.by === o.id, TTHFINB.react);
  bst.readyT = oReady ? (bst.readyT || 0) + dt : 0;
  const lead = info.partnerCpu ? (p.id === 0 && bst.readyT > 0.35) : bst.readyT > (bst.leadWait || 0.45);
  if (lead && !follow) tthBrainSay(bst, p, 'now', 'Ready... NOW!', 5);
  if (!oReady && !follow) tthBrainSay(bst, p, 'come', 'Stand at the other plunger!', 9);
  if (tthFinBrainPress(bst, 'ram', 0.4, dt, follow || lead)) out.act = true;
  return out;
}

TTH_BRAINS.finale = {
  reset(bst) { bst.plan = null; },
  back(bst) { bst.plan = null; bst.readyT = 0; },
  think(bst, p, o, dt, info, S) {
    const ph = S.ph, out = {};
    if (!ph || !ph.c || !ph.stage) return out;
    if (bst.k !== ph.k) { bst.k = ph.k; bst.plan = null; bst.hello = false; bst.rest = false; bst.needEl = null; bst.needT = 0; bst.sideT = 0; }
    if ((ph.rw && ph.rw.who[p.id]) || p.stun > 0) { bst.plan = null; return out; }      // whisked back, or frozen in a bubble
    if (ph.stage === 'top') return tthFinBrainTop(bst, p, o, dt, info, S, out);
    if (ph.stage === 'fin') { if (p.grounded && tthBrainTap(bst, 'hop', 0.8 + p.id * 0.25)) out.jump = true; return out; }   // hooray!
    if (ph.stage === 'lift') return tthFinBrainLift(bst, p, o, dt, info, S, out);
    return p.id === ph.holder ? tthFinBrainHold(bst, p, o, dt, info, S, out) : tthFinBrainClimb(bst, p, o, dt, info, S, out);
  },
};
