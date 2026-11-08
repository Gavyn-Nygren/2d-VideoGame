/* Pip & Bo - Computer partner: 20-1 Volcano Dragon, phase 'golf' (Gong Golf). */
'use strict';

/* The plan (the World 3 golf brain's approach, js/cpu/levels/golf.js, on this phase's own ball physics).
   The jobs are fixed per hole (Pip golfs hole 1, Bo hole 2), so the computer simply plays whichever job its character
   has on this hole.
   Golfer: once the ball rests, it tries a grid of shots (aim x power) with the phase's own ball code (vdgTick, the same
   function the game runs, with no effects) and scores where each ends: ringing the gong, a penalty (+1 stroke from the
   same spot), or how far the ball still is from the gong through open air. Fire rings come for free: a shot through
   them simply ends near the gong. It picks a shot whose neighbours are good too (so a small miss isn't a splash),
   fine-tunes it, turns the aim and holds jump until the meter reaches that power. Just before charging it flies the
   shot once more through the lava blobs that are out (or puffing in his cheeks) and waits for a gap if one would knock
   it (at most VDGB.blobWait s).
   Ball: in flight it tries "coast" and short boosts in 8 directions from where it is now, a few times a second (with
   the blobs where they will be), and boosts the way that ends best; coasting wins ties, so it never spoils a good shot.
   After a fire ring it may steer again with what is left of its bar (rings don't refill it).
   Shots never use less power than a real swing can (a hold shorter than VDG.minHold is not a swing, so a planned
   tap would never leave). A person who is the ball and pushes the same way right after every swing (the last two
   flights) has that push planned into the next shot, so a kid holding a key doesn't make every shot fail.
   With a person (1-player mode): as golfer it says "Ready? Here we go!" and gives the person (the ball) a moment
   before the first swing of the hole, and cheers them on to steer; as ball it waits for the person's swing and, when
   they wait long, says what to do ("Aim at the fire ring!", "Hold, then let go!"). When the person has been away for
   VD.idleAfter s the core brain stops it (Cinder waits too) and it asks them to press a key, so it never plays the
   phase alone; a charge it was in the middle of is cancelled (down), never let go as a random swing. A new hole counts
   as a fresh start (the person may just have watched their own shot and the gong for most of those 10 s), so the
   wait starts no earlier than VD.idleAfter s into the hole. It still can't clear the phase alone: the person golfs
   the other hole. The jobs never change hands inside a hole, so there is no job to "leave" for the computer here. */
const VDGB = {
  aim: 1.6, pow: 0.022,            // the computer's own spread of aim (degrees) and power (meter): how much to trust a shot
  think: 0.6, firstWait: 1.6,      // s before a swing; before the first swing of a hole with a person
  every: 0.12, react: 0.1, len: 0.03, judge: 0.08, bursts: 2,
  shot: 380,                       // px of distance that "cost" about one stroke
  budget: 8000, maxMs: 3,          // simulated ball sub-steps (and ms) of thinking per game step
  blobWait: 5,                     // s it waits at most for the blobs to clear its shot
};

(() => {
const KSTEP = DT / VDG.charge;
const KMIN = Math.ceil(VDG.minHold / DT) + 3;   // the softest swing that really leaves (a shorter hold is a whiff)
let work = 0;
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const spent = (w0, t0) => work - w0 >= VDGB.budget || now() - t0 > VDGB.maxMs;
const gauss = () => { let s = 0; for (let k = 0; k < 4; k++) s += Math.random(); return (s - 2) * 1.73; };

/* ---------- the crater, as the brain sees it (cached per hole) ---------- */
const COURSES = new WeakMap();
function course(S) {
  const grid = G.level.grid, key = S.ph.hole;
  const c = COURSES.get(grid);
  if (c && c.key === key) return c;
  const n = COLS * ROWS, open = new Uint8Array(n);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const ch = grid[y][x]; open[y * COLS + x] = ch === '#' || ch === 's' || ch === 'v' ? 0 : 1; }
  // distance (tiles) to the gong through open cells; going up costs a bit more (the club is short here)
  const dist = new Float32Array(n).fill(1e6), g = S.ph.gong;
  const gi = clamp(Math.floor(g.y / T), 0, ROWS - 1) * COLS + clamp(Math.floor(g.x / T), 0, COLS - 1);
  dist[gi] = 0;
  const q = [gi];
  while (q.length) {
    const i = q.shift(), x = i % COLS, y = (i / COLS) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const j = ny * COLS + nx;
      if (!open[j]) continue;
      if (dx && dy && (!open[y * COLS + nx] || !open[ny * COLS + x])) continue;
      // (searching from the gong: a step from j up to i is "up" when dy > 0)
      const cst = (dx && dy ? 1.414 : 1) * (dy > 0 ? 1.4 : 1);
      if (dist[i] + cst < dist[j] - 1e-6) { dist[j] = dist[i] + cst; q.push(j); }
    }
  }
  const m = { key, dist };
  COURSES.set(grid, m);
  return m;
}
function distAt(m, x, y) {
  const tx = clamp(Math.floor(x / T), 0, COLS - 1), ty = clamp(Math.floor(y / T), 0, ROWS - 1);
  let d = m.dist[ty * COLS + tx];
  if (d >= 1e6) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const nx = tx + dx, ny = ty + dy;
    if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS) d = Math.min(d, m.dist[ny * COLS + nx] + 1);
  }
  return Math.min(d, 200) * T;
}
const restValue = (m, x, y) => 1 + distAt(m, x, y) / VDGB.shot;

/* ---------- flying a copy of the ball ---------- */
const RES = { k: 'rest', x: 0, y: 0 };
// fly ball state b0 in scene E from scene time t0. boost: null or { d, t, ax, ay } (s from now, s long, direction)
function simFly(b0, E, t0, boost) {
  if (boost === undefined) boost = null;
  const b = Object.assign({}, b0);
  const E2 = { rings: E.rings, gong: E.gong, head: E.head, blobs: E.blobs, t: t0 };
  RES.k = 'rest';
  for (let n = 0; n < 120 * 15; n++) {
    let ax = 0, ay = 0;
    if (boost) { const u = n * DT; if (u >= boost.d && u < boost.d + boost.t) { ax = boost.ax; ay = boost.ay; } }
    work += Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * DT / 4));
    const ev = vdgTick(b, ax, ay, E2, null);
    E2.t += DT;
    if (ev) { RES.k = ev; break; }
  }
  RES.x = b.x; RES.y = b.y;
  return RES;
}
// strokes still to play after a shot that ended in r, hit from (fx, fy); pen: how much more a penalty hurts
function outcome(m, r, fx, fy, pen = 1) {
  if (r.k === 'gong') return 0.5;
  if (r.k !== 'rest') return 1 + pen + restValue(m, fx, fy);
  return restValue(m, r.x, r.y);
}
function launch(bx, by, aim, pow) {
  const b = vdgNewBall(bx, by), a = aim * Math.PI / 180, v = pow * VDG.vmax;
  b.vx = Math.cos(a) * v; b.vy = -Math.sin(a) * v; b.ground = false;
  return b;
}
const powOf = k => Math.max(0.04, k * KSTEP);
// the scene for planning: no blobs (they move on; the swing waits for a gap instead)
function calmScene(S) { const E = vdgScene(S); return { rings: E.rings, gong: E.gong, head: E.head, blobs: [], t: S.ph.t }; }
function blobScene(S) { const E = vdgScene(S); return { rings: E.rings, gong: E.gong, head: E.head, blobs: E.blobs.filter(bl => !bl.out && !bl.hit && bl.t1 > 0), t: S.ph.t }; }

/* ---------- golfer ---------- */
// The fire rings bob, so a shot is aim x power x the moment it leaves (one of NPH moments in a ring period).
const NPH = 6;
const AIMS = []; for (let a = 2; a <= 178; a += 5) AIMS.push(a);
const KS = []; for (let p = 0.08; p <= 1.0001; p += 0.06) KS.push(Math.max(KMIN, Math.round(p / KSTEP)));
const idx = (ph, ai, ki) => (ph * AIMS.length + ai) * KS.length + ki;
function newPlan(S, pen, push) {
  const n = NPH * AIMS.length * KS.length, b = S.ph.b, rg = S.ph.rings[0];
  const per = rg && rg.amp ? Math.round(rg.per / DT) : 0;
  return { stage: 'grid', i: 0, n, nph: per ? NPH : 1, per, val: new Float32Array(n), bx: b.x, by: b.y, pen, push: push || null, E: calmScene(S),
    tick0: G.tickN, time0: S.ph.t, aim: 0, k: 0, ph: 0, fine: null, R: 0, aimGoal: 0, kGo: 0, waitT: 0 };
}
// steps from the plan's start to a release on moment ph (mod the ring period)
const phaseOff = (P, ph) => (P.per ? Math.round(ph * P.per / P.nph) : 0);
// the scene time of the ball's first flying step after a release `off` steps after the plan's start
const flyT0 = (P, off) => P.time0 + (off + 1) * DT;
function planWork(m, P) {
  const w0 = work, t0 = now();
  const nAll = P.nph * AIMS.length * KS.length;
  if (P.stage === 'grid') {
    while (P.i < nAll && !spent(w0, t0)) {
      const ki = P.i % KS.length, ai = ((P.i / KS.length) | 0) % AIMS.length, ph = (P.i / (KS.length * AIMS.length)) | 0;
      P.val[P.i] = outcome(m, simFly(launch(P.bx, P.by, AIMS[ai], powOf(KS[ki])), P.E, flyT0(P, phaseOff(P, ph)), P.push), P.bx, P.by, P.pen);
      P.i++;
    }
    if (P.i < nAll) return;
    let best = Infinity;
    for (let ph = 0; ph < P.nph; ph++) for (let ai = 0; ai < AIMS.length; ai++) for (let ki = 0; ki < KS.length; ki++) {
      // a shot is judged with its grid neighbours a little (a coarse grid: the fine pass judges properly)
      let s = P.val[idx(ph, ai, ki)] * 2, c = 2;
      for (const [da, dk] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const a2 = ai + da, k2 = ki + dk;
        if (a2 < 0 || k2 < 0 || a2 >= AIMS.length || k2 >= KS.length) continue;
        s += P.val[idx(ph, a2, k2)] * 0.25; c += 0.25;
      }
      const score = s / c + KS[ki] * 1e-5;   // softer shots win ties
      if (score < best) { best = score; P.aim = AIMS[ai]; P.k = KS[ki]; P.ph = ph; }
    }
    const aims = [], ks = [];
    for (let d = -7; d <= 7; d++) aims.push(clamp(P.aim + d, 0, 180));
    for (let d = -18; d <= 18; d += 2) ks.push(clamp(P.k + d, KMIN, Math.round(1 / KSTEP)));
    P.fine = { aims, ks, i: 0, val: new Float32Array(aims.length * ks.length) };
    P.stage = 'fine';
  }
  if (P.stage === 'fine') {
    const F = P.fine, n = F.aims.length * F.ks.length, tt = flyT0(P, phaseOff(P, P.ph));
    while (F.i < n && !spent(w0, t0)) {
      const ai = (F.i / F.ks.length) | 0, ki = F.i % F.ks.length;
      F.val[F.i] = outcome(m, simFly(launch(P.bx, P.by, F.aims[ai], powOf(F.ks[ki])), P.E, tt, P.push), P.bx, P.by, P.pen);
      F.i++;
    }
    if (F.i < n) return;
    let best = Infinity;
    for (let ai = 3; ai < F.aims.length - 3; ai++) for (let ki = 4; ki < F.ks.length - 4; ki++) {
      let s = 0, c = 0;
      for (let a2 = 0; a2 < F.aims.length; a2++) for (let k2 = 0; k2 < F.ks.length; k2++) {
        const da = (F.aims[a2] - F.aims[ai]) / VDGB.aim, dk = (F.ks[k2] - F.ks[ki]) * KSTEP / VDGB.pow;
        if (da * da + dk * dk > 9) continue;
        const w = Math.exp(-0.5 * (da * da + dk * dk));
        s += w * F.val[a2 * F.ks.length + k2]; c += w;
      }
      if (s / c < best) { best = s / c; P.aim = F.aims[ai]; P.k = F.ks[ki]; }
    }
    P.aimGoal = clamp(P.aim + gauss() * VDGB.aim, 0, 180);
    P.kGo = Math.max(KMIN, Math.min(Math.round(1 / KSTEP), P.k + Math.round(gauss() * VDGB.pow / KSTEP)));
    P.stage = 'aim';
  }
}
// the release step on the planned moment (mod the ring period), no earlier than `earliest`
function releaseStep(P, earliest) {
  if (!P.per) return earliest;
  const base = P.tick0 + phaseOff(P, P.ph);
  const k = Math.max(0, Math.ceil((earliest - base) / P.per));
  return Math.round(base + k * P.per);
}
// would the lava blobs out now (or puffing in his cheeks) spoil this shot if it left at step `at`?
function blobsSpoil(S, m, P, at) {
  const E = blobScene(S);
  if (!E.blobs.length) return false;
  const t0 = S.ph.t + (at - G.tickN + 1) * DT;
  const withBlobs = outcome(m, simFly(launch(P.bx, P.by, P.aimGoal, powOf(P.kGo)), E, t0, P.push), P.bx, P.by, P.pen);
  return withBlobs > outcome(m, simFly(launch(P.bx, P.by, P.aimGoal, powOf(P.kGo)), P.E, t0, P.push), P.bx, P.by, P.pen) + 0.25;
}
// a person as the ball: the first push of each flight (from its first press while the bar lasts, one direction)
function watchPush(bst, S) {
  const ph = S.ph, b = ph.b, inp = G.players[ph.ball].input;
  let ax = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), ay = (inp.down ? 1 : 0) - (inp.jump || inp.up ? 1 : 0);
  if (!ax && !ay && inp.act) { const v = Math.hypot(b.vx, b.vy); if (v > 20) { ax = b.vx / v; ay = b.vy / v; } }
  if (!bst.watch || bst.watch.shot !== ph.shots) bst.watch = { shot: ph.shots, push: null, done: false };
  const W = bst.watch;
  if (W.done) return;
  const on = (ax || ay) && b.fuel > 0;
  if (!W.push) { if (on) { const k = Math.hypot(ax, ay); W.push = { d: Math.max(0, b.flyT - DT), t: DT, ax: ax / k, ay: ay / k }; } return; }
  const k = Math.hypot(ax, ay) || 1;
  if (on && ax / k * W.push.ax + ay / k * W.push.ay > 0.9) W.push.t += DT; else W.done = true;
}
// the flight ended: a push that came right after the swing in this flight and the one before is a habit
function endWatch(bst) {
  const W = bst.watch;
  if (!W || W.ended) return;
  W.ended = true;
  const now = W.push && W.push.d < 0.6 ? W.push : null, was = bst.lastPush;
  bst.habit = now && was && now.ax * was.ax + now.ay * was.ay > 0.7 ? { d: now.d, t: Math.min(VDG.boostTime, now.t), ax: now.ax, ay: now.ay } : null;
  bst.lastPush = now;
}
function golferThink(bst, p, o, info, S, m) {
  const out = {}, ph = S.ph, b = ph.b;
  if (!info.partnerCpu) { if (ph.mode === 'fly') watchPush(bst, S); else endWatch(bst); }
  if (ph.mode !== 'aim' && ph.mode !== 'walk') {
    bst.plan = null;
    if (ph.mode === 'fly' && ph.shots === 1 && !info.partnerCpu) vdBrainSay(bst, p, 'steer' + ph.hole, 'Steer into the fire rings!', 60);
    return out;
  }
  const spot = ph.hole + ':' + Math.round(b.x) + ',' + Math.round(b.y), key = spot + ':' + ph.strokes[ph.hole] + ':' + ph.shots;
  if (bst.key !== key || !bst.plan) {
    bst.spots = bst.spots || {};
    if (bst.key && bst.key.startsWith(spot + ':')) bst.spots[spot] = (bst.spots[spot] || 0) + 1;   // a penalty from this same spot: play safer
    bst.key = key; bst.plan = newPlan(S, 1 + (bst.spots[spot] || 0), info.partnerCpu ? null : bst.habit); bst.aimT = 0;
  }
  const P = bst.plan;
  if (P.stage === 'grid' || P.stage === 'fine') planWork(m, P);
  if (ph.mode !== 'aim' || b.hidden) return out;
  bst.aimT += DT;
  if (P.stage === 'grid' || P.stage === 'fine') return out;
  if (P.stage === 'aim') {
    const diff = P.aimGoal - ph.aim, stepA = (35 + Math.min(1, (ph.aimHold + DT) / 0.6) * 85) * DT;
    if (Math.abs(diff) >= stepA) { out.left = diff > 0; out.right = diff < 0; return out; }
    if (ph.aimHold > 0) return out;
    if (Math.abs(diff) > stepA / 2) { out.left = diff > 0; out.right = diff < 0; return out; }
    P.stage = 'wait'; P.R = 0;
  }
  if (P.stage === 'wait') {
    // the person (the ball) went quiet: Cinder waits and so does the computer (the core brain drops this output)
    if (info.away) { vdBrainSay(bst, p, 'away', 'Ready? Press any key and I\'ll swing!', 15); return out; }
    // a person as the ball: a word and a moment before the hole's first swing
    const first = ph.shots === 0 && !info.partnerCpu;
    if (first) vdBrainSay(bst, p, 'ready' + ph.hole, 'Ready? Here we go!', 60);
    const think = first ? Math.max(VDGB.think, VDGB.firstWait) : VDGB.think;
    const earliest = G.tickN + P.kGo + 2 + Math.max(0, Math.ceil((think - bst.aimT) / DT));
    if (!P.R || P.R - P.kGo < G.tickN) P.R = releaseStep(P, earliest);
    if (G.tickN >= P.R - P.kGo) {
      // the blobs: wait for a gap (not for ever)
      if (P.waitT < VDGB.blobWait && blobsSpoil(S, m, P, P.R)) { P.waitT += P.per ? P.per * DT : 0.2; P.R = releaseStep(P, G.tickN + P.kGo + 2); return out; }
      P.stage = 'charge'; out.jump = !(CPU.last[p.id] && CPU.last[p.id].jump);
    }
    return out;
  }
  if (P.stage === 'charge') {
    // the person went quiet mid-charge: cancel it (down) rather than let go of a random swing
    if (info.away) { if (ph.charging) return { down: true, keep: true }; P.stage = 'wait'; P.R = 0; return out; }
    if (!ph.charging) {
      if (G.tickN > P.R - P.kGo + 2) { P.stage = 'wait'; P.R = 0; }
      out.jump = !(CPU.last[p.id] && CPU.last[p.id].jump);
      return out;
    }
    out.jump = ph.powerT + DT < P.kGo * DT - DT / 2;   // let go on the step the meter reaches the planned power
    return out;
  }
  return out;
}

/* ---------- ball ---------- */
const DIRS = [];
for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; DIRS.push([Math.round(Math.cos(a) * 1e6) / 1e6, Math.round(Math.sin(a) * 1e6) / 1e6]); }
function ballThink(bst, p, o, info, S, m) {
  const out = {}, ph = S.ph, b = ph.b;
  if (ph.mode === 'aim' && !info.partnerCpu && G.introT <= 0) {
    // the person golfs: a nudge when they wait long, a tip when they keep tapping
    if (ph.mT > 7 && !ph.charging) vdBrainSay(bst, p, 'swing' + ph.hole + ':' + ph.shots, ph.shots === 0 ? 'Aim at the fire ring!' : 'Your swing!', 14);
    if (ph.whiffT > 0) vdBrainSay(bst, p, 'hold', 'Hold, then let go!', 10);
  }
  if (ph.mode === 'rung' && !info.partnerCpu) vdBrainSay(bst, p, 'yay' + ph.hole, ph.hole === 0 ? 'BONNNG! Nice one!' : 'We did it!', 30);
  if (ph.mode !== 'fly') { bst.boost = null; bst.next = 0; bst.ev = null; bst.bursts = 0; bst.used = 0; return out; }
  if (b.used !== bst.used) { bst.used = b.used; bst.bursts = 0; bst.next = 0; bst.ev = null; bst.boost = null; }   // a ring: steer again (with what's left of the bar)
  if (b.fuel <= 0) return out;
  const B = bst.boost, ft = b.flyT + DT;
  if (B && ft > B.from + 1e-9 && ft <= B.until + 1e-9) { out.right = B.ax > 0.3; out.left = B.ax < -0.3; out.down = B.ay > 0.3; out.up = B.ay < -0.3; }
  if (B && ft <= B.until + 1e-9) return out;
  if (!bst.ev && b.flyT >= (bst.next || 0) && bst.bursts < VDGB.bursts) {
    const b0 = Object.assign({}, b, { from: b.from }), left = b.fuel * VDG.boostTime, opts = [null];
    for (const t of [0.05, 0.12, 0.25, left]) {
      if (t > left + 1e-6) continue;
      for (const [ax, ay] of DIRS) for (const dt2 of [-VDGB.len, 0, VDGB.len]) opts.push({ d: VDGB.react, t: clamp(t + dt2, 0.02, left), ax, ay });
      if (t === left) break;
    }
    bst.ev = { b0, opts, i: 0, vals: [], tick: G.tickN, E: blobScene(S), t0: ph.t + DT };
  }
  const Ev = bst.ev;
  if (!Ev) return out;
  const w0 = work, t0 = now(), late = G.tickN - Ev.tick;
  while (Ev.i < Ev.opts.length && !spent(w0, t0) && late * DT < VDGB.react - DT) {
    Ev.vals.push(outcome(m, simFly(Ev.b0, Ev.E, Ev.t0, Ev.opts[Ev.i]), b.from.x, b.from.y));
    Ev.i++;
  }
  if (Ev.i < Ev.opts.length && late * DT < VDGB.react - DT) return out;
  bst.ev = null; bst.next = b.flyT + VDGB.every;
  const coast = Ev.vals[0];
  if (coast <= 0.5) bst.bursts = VDGB.bursts;   // ringing the gong anyway: hands off
  let best = Infinity, pick = null;
  if (coast > 0.5) for (let i = 1; i + 2 < Ev.vals.length; i += 3) {
    const avg = (Ev.vals[i] + Ev.vals[i + 1] + Ev.vals[i + 2]) / 3;
    if (avg > coast - 0.05) continue;
    const v = avg + gauss() * VDGB.judge;
    if (v < best) { best = v; pick = Ev.opts[i + 1]; }
  }
  if (pick) {
    bst.bursts++;
    const t = clamp(pick.t + gauss() * VDGB.len, 0.02, b.fuel * VDG.boostTime), from = Ev.b0.flyT + pick.d;
    bst.boost = { ax: pick.ax, ay: pick.ay, from, until: from + t };
  } else bst.boost = null;
  return out;
}

VD_BRAINS.golf = {
  reset(bst) { bst.plan = null; bst.key = null; bst.boost = null; bst.ev = null; bst.next = 0; bst.bursts = 0; },
  think(bst, p, o, dt, info, S) {
    const ph = S.ph;
    if (!ph || !ph.b || !ph.gong) return {};
    const m = course(S);
    // a new hole is a fresh start for the idle wait
    if (bst.hole !== ph.hole) { bst.hole = ph.hole; bst.holeT0 = ph.t; }
    if (info.away && ph.t - bst.holeT0 < VD.idleAfter) { info.away = false; const out = ph.golfer === p.id ? golferThink(bst, p, o, info, S, m) : ballThink(bst, p, o, info, S, m); out.keep = true; return out; }
    if (ph.golfer === p.id) return golferThink(bst, p, o, info, S, m);
    return ballThink(bst, p, o, info, S, m);
  },
  _sim: { simFly, launch, course, outcome },
};
})();
