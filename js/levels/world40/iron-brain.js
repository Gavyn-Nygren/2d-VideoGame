/* Pip & Bo - Level 40-1 The Iron Colossus: Part 6 'brain' (The Lantern Head, core 3). */
'use strict';

/* ===== 40-1 Part 6: The Lantern Head (IRON_PHASES.brain) ===========================================================
   Inside the head, scrolling UP. A round room of stacked iron galleries (floors 0..8, 150 px apart; floor 0 is solid,
   the rest are one-way decks), the back of the lantern eye one great amber window behind them, Tick's enormous chair
   at the top with Tick in it, and a glass bulb (the brain) crackling over the chair. Twist: LIGHTNING, and Tick.
   QUARTERS: the middle of each floor q (x 180..780) is quarter q, where arcs jump between brass knobs (ceiling to
   floor) on a pattern: a tell (sparks on the knobs), then the bolt. A rubber MAT in the middle is always safe.
   STAIRS: a step block at one end of each floor (the right on even floors, the left on odd), up to the next floor.
   RODS: earthing rod k stands on floor k (left on even floors, right on odd). Holding it (the action, standing by it)
   switches off quarters k-1 and k; they stay dead `warm` s after letting go.
   THE LEAPFROG (ironLampLeap): at step n the holder holds rod n; the dasher runs from rod n-1 through quarters n-1
   and n to rod n+1 and takes over. Twice round the room: lap 1 is floors 0-3, lap 2 floors 4-7 (two patterns).
   TICK fights for his head: SPANNERS (from step 1, at the dasher: a chalk X and a dashed arc first, then it lands: a
   bonk), the SWAP lever (from step 2: "SWAP! HA!", 1 s, then for `swap.len` s each held rod kills the WRONG two
   quarters), and on lap 2 the chair's own CLAW (reaches for the holder's rod for `claw.reach` s, then closes: still
   holding is a PLUCK).
   THE CORE (rod 8, the top floor): one holds rod 8 so the bulb's cage goes dead, the other climbs the chair (stool,
   seat; Tick hops about, furious, harmless) and unscrews the bulb (hold the action `core.need` s; it only turns while
   the cage is dead). Then Tick grabs the other end: a tug of war (hold the action and pull left, `core.tug` s). The
   bulb comes out, the eye goes dark, the room fades to pencil, two quiet seconds: core 3.
   Gold help: the arcs fire half as often, the dead quarters get a gold edge, the arcs wait longer, the claw is slow.
   Rivets: 6, along the floors.   Stats (st.stats.brain): zaps, plucks.   Names: ironLamp* / IRONLAMP. */
const IRONLAMP = {
  fl: 150, top: 8, zone: [180, 780], mat: [470, 530], stepH: 75, grab: 26,
  arcsA: [250, 370, 610, 730], arcsB: [310, 420, 580, 680], perA: 2.2, perB: 1.5, tell: [0.35, 0.55], on: [0.55, 0.8],
  warm: 1.2, goldWarm: 2.0,
  span: { every: 5, tell: 1, goldTell: 1.5, fall: 0.35, lie: 1.2, r: 18 },
  swap: { every: 9, warn: 1, len: 2.5 },
  claw: { every: 8, reach: 1.2, goldReach: 2.0, shut: 0.35, back: 0.6 },
  core: { stool: [520, 580, -1255], seat: [580, 700, -1310], back: [700, 728, -1470], bulb: 640, bulbY: -1398, reach: 62, need: 3, tug: 1.2, decay: 0.15 },
  camLo: -470, camHi: -1660,
  rivets: [[300, -164], [660, -314], [250, -464], [600, -614], [400, -764], [700, -914]],
};
const ironLampY = q => -IRONLAMP.fl * q;   // floor q's deck top
const ironLampRodX = k => (k % 2 === 0 ? 40 : 920);
const ironLampStairs = q => (q % 2 === 0 ? [800, 870] : [90, 160]);
const ironLampFloorOf = p => Math.max(0, Math.min(IRONLAMP.top, Math.floor((-(p.y + p.h) + 20) / IRONLAMP.fl)));
const ironLampInZone = x => x > IRONLAMP.zone[0] && x < IRONLAMP.zone[1];
const ironLampOnMat = x => x > IRONLAMP.mat[0] + 4 && x < IRONLAMP.mat[1] - 4;
const ironLampGold = st => ironHasGold(st, 'brain');
// a quarter's arcs: [{ x, s }] where s is 'off' | 'tell' | 'on' (pattern A, and on lap 2 pattern B too)
function ironLampArcState(st, per, off) {
  const K = IRONLAMP, ph = st.ph, P = per * (ironLampGold(st) ? 2 : 1);
  const s = (((ph.t + off) / P) % 1 + 1) % 1;
  return s >= K.on[0] && s < K.on[1] ? 'on' : s >= K.tell[0] && s < K.tell[1] ? 'tell' : 'off';
}
function ironLampArcs(st, q) {
  const K = IRONLAMP, out = [];
  K.arcsA.forEach((x, i) => out.push({ x, s: ironLampArcState(st, K.perA, i * 0.61 + q * 0.37) }));
  if (q >= 4) K.arcsB.forEach((x, i) => out.push({ x, s: ironLampArcState(st, K.perB, i * 0.47 + q * 0.29 + 0.7) }));
  return out;
}
// will any arc of quarter q between xa and xb fire (or start its tell) in the next T s? (what a person can read off the
// knobs: the computer uses it only to get back to its own rod across a live quarter)
function ironLampArcSoon(st, q, xa, xb, T) {
  const K = IRONLAMP, ph = st.ph, lo = Math.min(xa, xb) - 16, hi = Math.max(xa, xb) + 16, t0 = ph.t;
  if (ironLampDead(st, q)) return false;
  const lists = [[K.arcsA, K.perA, (i) => i * 0.61 + q * 0.37]];
  if (q >= 4) lists.push([K.arcsB, K.perB, (i) => i * 0.47 + q * 0.29 + 0.7]);
  for (const [xs, per, off] of lists) xs.forEach((x, i) => { if (x < lo || x > hi) return; for (let u = 0; u <= T; u += 0.05) { ph.t = t0 + u; if (ironLampArcState(st, per, off(i)) !== 'off') { lists.hit = true; break; } } ph.t = t0; });
  ph.t = t0;
  return !!lists.hit;
}
// the quarters a held rod k kills (the SWAP lever kills the wrong two)
const ironLampKills = (st, k) => (st.ph.swap.st === 'on' ? [k - 2, k + 1] : [k - 1, k]);

function ironLampSetup(st, L) {
  const ph = st.ph, K = IRONLAMP;
  ph.first = L.def.first || 0;
  ph.t = 0; ph.n = 0; ph.holder = ph.first;
  ph.rods = []; for (let k = 0; k <= K.top; k++) ph.rods.push({ k, x: ironLampRodX(k), held: -1, glow: 0 });
  ph.qs = []; for (let q = 0; q <= K.top; q++) ph.qs.push({ q, held: false, deadT: 0, arcs: [] });
  ph.span = { st: 'wait', t: 0, x: 0, q: 0, y: 0 };
  ph.swap = { st: 'wait', t: 0 };
  ph.claw = { st: 'wait', t: 0, k: 0 };
  ph.core = { st: 'shut', prog: 0, tug: 0, t: 0, spark: 0, fade: 0, out: 0 };
  st.cam = { x: 0, y: K.camLo };
  const sx = [ironLampRodX(0), ironLampRodX(0) + 70];
  G.players.forEach((p, k) => Object.assign(p, { x: sx[k === ph.first ? 0 : 1] - p.w / 2 - st.cam.x, y: -p.h - st.cam.y, vx: 0, vy: 0, face: 1, grounded: true, alive: true }));
  ph.safePt = [{ x: sx[0], y: 0 }, { x: sx[1], y: 0 }];
  ironRivetsSetup(st, K.rivets);
  const s = ironStats(st); Object.assign(s, { zaps: s.zaps || 0, plucks: s.plucks || 0, bonks: s.bonks || 0 });
  Object.assign(st.tick, { hidden: false, x: 672, y: K.core.seat[2], face: -1, pose: 'sit', s: 1.1, mood: 'cross' });
  ph.solids = [{ x0: -60, y0: 0, x1: 1020, y1: 90, kind: 'floor' }, { x0: -60, y0: -1800, x1: 0, y1: 90, kind: 'wall' }, { x0: 960, y0: -1800, x1: 1020, y1: 90, kind: 'wall' },
    { x0: -60, y0: -1800, x1: 1020, y1: -1720, kind: 'ceil' }];
  for (let q = 1; q <= K.top; q++) ph.solids.push({ x0: 0, x1: 960, y0: ironLampY(q), y1: ironLampY(q) + 14, one: true, kind: 'deck' });
  for (let q = 0; q < K.top; q++) { const [a, b] = ironLampStairs(q); ph.solids.push({ x0: a, x1: b, y0: ironLampY(q) - K.stepH, y1: ironLampY(q), kind: 'step', q }); }
  const C = K.core, T = ironLampY(K.top);
  ph.stool = { x0: C.stool[0], x1: C.stool[1], y0: C.stool[2], y1: T, kind: 'stool' };
  ph.seat = { x0: C.seat[0], x1: C.seat[1], y0: C.seat[2], y1: T, kind: 'seat' };
  ph.solids.push(ph.stool, ph.seat, { x0: C.back[0], x1: C.back[1], y0: C.back[2], y1: T, kind: 'chairback' });
  ph.prep = [];
  for (let k = 0; k < 4; k++) ph.prep.push(() => IRON_ART.lampWall(k));
  ph.prep.push(() => IRON_ART.lampDeck(), () => IRON_ART.lampStep(1), () => IRON_ART.lampStep(-1), () => IRON_ART.lampRod(), () => IRON_ART.lampKnob(), () => IRON_ART.lampMat(),
    () => IRON_ART.lampChair(), () => IRON_ART.lampBulb(), () => IRON_ART.lampCage(), () => IRON_ART.lampSpanner(), () => IRON_ART.lampClaw(0), () => IRON_ART.lampClaw(1));
}

/* --- the step --- */
// down never drops through a deck here (the galleries are one-way only from below); the climber is held in place
function ironLampCtl(p, dt) {
  control(p, dt); p.dropT = 0;
  const ph = G.mst && G.mst.ph;
  if (ph && ph.core && ph.core.lock === p.id) p.vx = 0;
}
function ironLampStep(st, dt) {
  const ph = st.ph, ps = G.players;
  ph.t += dt;
  if (st.idle) { ironCoast(st, dt, ph.solids); ironLampCamera(st, dt); ironLampTickPose(st, dt); return; }
  if (ph.core.st === 'out') { ironLampOut(st, dt); return; }
  for (const p of ps) ironBody(p, dt, ph.solids, { partner: true, ctl: ironLampCtl });
  ironTrack(st);
  ironLampRods(st, dt);
  ironLampZaps(st);
  ironLampLeap(st);
  ironLampTick(st, dt);
  ironLampCore(st, dt);
  ironLampTickPose(st, dt);
  ironLampCamera(st, dt);
  ironRivetsStep(st, dt);
  ironLampHints(st);
}
function ironLampGoldNow(st) { ironGoldOnce(st, 'brain', 'Gold help! The lightning fires half as often, and the safe floors have a gold edge.'); }
const ironLampMissed = st => { if (ironMiss(st, 'brain') >= IRON.goldAfter) ironLampGoldNow(st); };
/* --- rods: hold to earth; the quarters they kill --- */
function ironLampRods(st, dt) {
  const ph = st.ph, K = IRONLAMP, warm = ironLampGold(st) ? K.goldWarm : K.warm;
  for (const q of ph.qs) q.held = false;
  for (const r of ph.rods) {
    const was = r.held;
    r.held = -1;
    for (const p of G.players) {
      if (!p.alive || !p.grounded || p.stun > 0 || !p.input.act || p.ground && p.ground.head) continue;
      if (ironLampFloorOf(p) === r.k && Math.abs(p.x + p.w / 2 - r.x) < K.grab) r.held = p.id;
    }
    if (r.held >= 0 && was < 0) Sfx.play('ironlampRodOn');
    if (r.held < 0 && was >= 0) Sfx.play('ironlampRodOff');
    r.glow += ((r.held >= 0 ? 1 : 0) - r.glow) * Math.min(1, dt * 8);
    if (r.held >= 0) for (const q of ironLampKills(st, r.k)) if (q >= 0 && q <= K.top) ph.qs[q].held = true;
  }
  for (const q of ph.qs) {
    if (q.held) q.deadT = warm; else q.deadT = Math.max(0, q.deadT - dt);
    const live = !q.held && q.deadT <= 0;
    const old = q.arcs;
    q.arcs = live ? ironLampArcs(st, q.q) : [];
    // a crackle for an arc firing on screen (one at a time)
    for (let i = 0; i < q.arcs.length; i++) if (q.arcs[i].s === 'on' && !(old[i] && old[i].s === 'on')) { const y = ironLampY(q.q) - 70; if (y > st.cam.y - 40 && y < st.cam.y + H + 40 && !(ph.zzT > 0)) { Sfx.play('ironlampArc'); ph.zzT = 0.35; } }
  }
  ph.zzT = (ph.zzT || 0) - dt;
}
const ironLampDead = (st, q) => q < 0 || q > IRONLAMP.top || st.ph.qs[q].held || st.ph.qs[q].deadT > 0;
// an arc that is on hits anyone in its column between the knobs: zapped back to the last safe spot
function ironLampZaps(st) {
  const ph = st.ph, K = IRONLAMP;
  for (let q = 0; q < K.top; q++) {
    const Q = ph.qs[q];
    if (!Q.arcs.length) continue;
    const y = ironLampY(q);
    for (const a of Q.arcs) {
      if (a.s !== 'on') continue;
      for (const p of G.players) {
        if (!p.alive || st.safe[p.id] > 0) continue;
        const cx = p.x + p.w / 2;
        if (Math.abs(cx - a.x) < 12 && p.y + p.h > y - 136 && p.y < y) {
          const to = ph.safePt[p.id];
          if (ironClang(st, p, { kind: 'zap', word: 'ZZAP!', to: { x: to.x, y: to.y } })) { ironStats(st).zaps++; Sfx.play('ironlampZap'); ironLampMissed(st); }
        }
      }
    }
  }
  // remember each hero's last safe spot (a rod end, the stairs, a mat)
  for (const p of G.players) {
    if (!p.alive || !p.grounded || (p.ground && p.ground.head)) continue;
    const cx = p.x + p.w / 2;
    if (!ironLampInZone(cx) || ironLampOnMat(cx)) ph.safePt[p.id] = { x: cx, y: p.y + p.h };
  }
}
// the leapfrog: the dasher reached the next rod: it is theirs now
function ironLampLeap(st) {
  const ph = st.ph, K = IRONLAMP;
  if (ph.n >= K.top) return;
  const dash = G.players[1 - ph.holder], k = ph.n + 1;
  if (dash.alive && dash.grounded && ironLampFloorOf(dash) === k && Math.abs(dash.x + dash.w / 2 - ironLampRodX(k)) < 34) {
    ph.n = k; ph.holder = dash.id; ironSwap(st); ironCelebrate(st, 0.3);
    ph.claw = { st: 'wait', t: 0, k: 0 };
    if (k === K.top) { ironNews(st, 'The top! Hold rod 9 so the bulb goes dead. ' + NAMES[1 - dash.id] + ': climb the chair!'); ironSay(st, 'NOT THE CHAIR. NOBODY SITS IN THE CHAIR.', 2.4, { caption: false }); }
    else if (k === 4) { ironNews(st, 'Once round! Lap 2: the lightning doubles up.'); ironSay(st, 'Right. Arms! Get them!', 2, { caption: false }); }
    else ironNews(st, 'Rod ' + (k + 1) + ' of 9. Swap: now ' + NAMES[dash.id] + ' holds.');
  }
}
/* --- Tick's attacks: spanners, the swap lever, the claw --- */
function ironLampTick(st, dt) {
  const ph = st.ph, K = IRONLAMP, n = ph.n, gold = ironLampGold(st);
  const dash = G.players[1 - ph.holder];
  // spanners at the dasher (from step 1)
  const S = ph.span; S.t += dt;
  if (S.st === 'wait' && n >= 1 && n < K.top && S.t >= K.span.every) {
    const q = ironLampFloorOf(dash), cx = dash.x + dash.w / 2, dir = q % 2 === 0 ? 1 : -1;
    if (dash.alive && dash.grounded && ironLampInZone(cx) && q <= n && !(st.safe[dash.id] > 0)) {
      let x = clamp(cx + dir * 46, K.zone[0] + 20, K.zone[1] - 20);
      if (ironLampOnMat(x)) x = K.mat[0] - 20 * dir;
      Object.assign(S, { st: 'tell', t: 0, x, q, y: ironLampY(q), x0: 480 + (x < 480 ? 300 : -300) });
      Sfx.play('ironlampSpannerWhistle');
    } else S.t = K.span.every - 0.5;
  } else if (S.st === 'tell' && S.t >= (gold ? K.span.goldTell : K.span.tell)) { S.st = 'fall'; S.t = 0; }
  else if (S.st === 'fall' && S.t >= K.span.fall) {
    S.st = 'lie'; S.t = 0; Sfx.play('ironlampSpannerClank');
    ironWord(st, 'CLANK', S.x, S.y - 30, 14, { life: 0.7, rise: 8, fill: null, col: '#efe8d8' });
    for (const p of G.players) {
      if (!p.alive || st.safe[p.id] > 0 || ironLampFloorOf(p) !== S.q) continue;
      if (Math.abs(p.x + p.w / 2 - S.x) < K.span.r && p.y + p.h > S.y - 40) {
        if (ironClang(st, p, { kind: 'bonk', word: 'BONK!', fromX: S.x })) { ironStats(st).bonks++; ironLampMissed(st); }
      }
    }
  } else if (S.st === 'lie' && S.t >= K.span.lie) { S.st = 'wait'; S.t = 0; }
  // the swap lever (from step 2; not at the top)
  const W2 = ph.swap; W2.t += dt;
  if (W2.st === 'wait' && n >= 2 && n < K.top && W2.t >= K.swap.every) { W2.st = 'warn'; W2.t = 0; ironSay(st, 'SWAP! HA!', 1.6, { caption: false }); Sfx.play('ironlampSwapLever'); }
  else if (W2.st === 'warn' && W2.t >= K.swap.warn) { W2.st = 'on'; W2.t = 0; Sfx.play('ironlampSwapThrow'); ironNews(st, 'Tick swapped the rods! Wait on a mat or the stairs.'); }
  else if (W2.st === 'on' && W2.t >= K.swap.len) { W2.st = 'wait'; W2.t = 0; Sfx.play('ironlampSwapBack'); }
  else if (W2.st !== 'wait' && n >= K.top) { W2.st = 'wait'; W2.t = 0; }
  // the chair's claw on lap 2: it reaches for the holder's rod
  const C = ph.claw, reach = gold ? K.claw.goldReach : K.claw.reach; C.t += dt;
  if (C.st === 'wait' && n >= 4 && n < K.top && C.t >= K.claw.every) { Object.assign(C, { st: 'reach', t: 0, k: n }); Sfx.play('ironlampClawWhirr'); }
  else if (C.st === 'reach' && C.t >= reach) {
    C.st = 'shut'; C.t = 0; Sfx.play('ironlampClawSnap');
    const r = ph.rods[C.k];
    if (r.held >= 0) {
      const p = G.players[r.held];
      if (ironClang(st, p, { kind: 'pluck', word: 'PLUCK!', fromX: r.x })) { ironStats(st).plucks++; ironLampMissed(st); r.held = -1; }
    }
  } else if (C.st === 'shut' && C.t >= K.claw.shut) { C.st = 'back'; C.t = 0; }
  else if (C.st === 'back' && C.t >= K.claw.back) { C.st = 'wait'; C.t = 0; }
}
/* --- the core: the bulb, the unscrewing, the tug of war --- */
function ironLampCore(st, dt) {
  const ph = st.ph, K = IRONLAMP, C = K.core, c = ph.core;
  c.lock = -1;
  if (ph.n < K.top) return;
  const climber = G.players[1 - ph.holder];
  const on = climber.alive && climber.grounded && climber.ground === ph.seat && Math.abs(climber.x + climber.w / 2 - C.bulb) < C.reach;
  const dead = ph.qs[K.top].held;
  if (c.st === 'shut') {
    if (on && climber.input.act) {
      c.lock = climber.id;
      if (dead) { c.prog += dt; if (!(c.sqT > 0)) { Sfx.play('ironlampUnscrew'); c.sqT = 0.4; } }
      else { c.spark += dt; if (!(c.spT > 0)) { Sfx.play('ironlampSpark'); c.spT = 0.3; ironHint(st, climber.id, 'The cage is live! Wait for ' + NAMES[ph.holder] + ' to hold the rod.', { life: 1.6, cpu: '' }); } }
    }
    c.sqT = (c.sqT || 0) - dt; c.spT = (c.spT || 0) - dt;
    if (c.prog >= C.need) {
      c.st = 'tug'; c.t = 0; Sfx.play('ironlampTickGrab');
      ironSay(st, 'MINE! LET GO! THAT IS MY THINKING!', 2.2, { caption: false });
      ironNews(st, 'Tick has the other end! Hold ' + ironKey(climber.id, 'act') + ' and pull left!');
    }
  } else if (c.st === 'tug') {
    c.t += dt;
    const pull = on && climber.input.act && climber.input.left;
    if (on && climber.input.act) c.lock = climber.id;
    if (pull) { c.tug += dt; if (!(c.tgT > 0)) { Sfx.play('ironlampTug'); c.tgT = 0.3; } } else c.tug = Math.max(0, c.tug - C.decay * dt);
    c.tgT = (c.tgT || 0) - dt;
    if (c.tug >= C.tug) {
      c.st = 'out'; c.t = 0; Sfx.play('ironlampBulbOut');
      ironWord(st, 'POP!', C.bulb - 20, C.bulbY - 40, 30, { life: 1.1, rise: 12 });
    }
  }
}
// the bulb is out: the eye goes dark, the room fades to pencil, two quiet seconds, then the part is won
function ironLampOut(st, dt) {
  const ph = st.ph, c = ph.core;
  c.t += dt; c.out = Math.min(1, c.t / 0.6); c.fade = clamp((c.t - 0.5) / 1.4, 0, 1);
  ironCoast(st, dt, ph.solids);
  ironLampTickPose(st, dt);
  ironLampCamera(st, dt);
  if (c.t > 0.8 && !c.dark) { c.dark = true; Sfx.play('ironlampEyeDark'); }
  if (c.t > 3.4 && !st.cut) ironPhaseDone(st, { core: true, say: '...Oh. It has gone all quiet in my head.' });
}
// Tick: sits in his chair working the pedals; hops about on the seat when someone climbs it; hangs on in the tug
function ironLampTickPose(st, dt) {
  const ph = st.ph, K = IRONLAMP, C = K.core, c = ph.core, T = st.tick;
  T.hidden = false; T.ride = -1;
  if (c.st === 'out') {
    // dragged off the chair, a bump to the floor, a sulk
    const k = Math.min(1, c.t / 0.9);
    T.x = 690 + k * 50; T.y = k < 1 ? C.seat[2] + (ironLampY(K.top) - C.seat[2]) * k * k : ironLampY(K.top); T.pose = k < 1 ? 'gasp' : 'sulk'; T.face = -1;
    return;
  }
  if (c.st === 'tug') { T.x = C.bulb + 26 - Math.min(1, c.tug / C.tug) * 14; T.y = C.bulbY + 64; T.pose = 'hang'; T.face = -1; return; }
  const cl = G.players[1 - ph.holder];
  const up = ph.n >= K.top && cl.alive && cl.ground === ph.seat;
  if (up) { T.pose = 'stamp'; T.x = 676 + Math.sin(ph.t * 3) * 10; T.y = C.seat[2]; T.face = cl.x + cl.w / 2 < T.x ? -1 : 1; }
  else {
    T.x = 672; T.y = C.seat[2]; T.face = -1;
    T.pose = ph.swap.st === 'warn' || ph.claw.st === 'reach' ? 'point' : ph.span.st === 'tell' ? 'shout' : 'sit';
  }
}
// the camera: between the two, up the room
function ironLampCamera(st, dt) {
  const ps = G.players.filter(p => p.alive);
  if (!ps.length) return;
  const K = IRONLAMP, mid = ps.reduce((a, p) => a + p.y + p.h, 0) / ps.length;
  const ty = clamp(mid - 330, K.camHi, K.camLo);
  st.cam.x = 0; st.cam.y += (ty - st.cam.y) * Math.min(1, dt * 2.5);
}

/* --- the plan --- */
// a quarter the dasher may run now: dead because a rod is held now (or has a good while left), and no swap coming
function ironLampSafeQ(st, q) {
  const ph = st.ph;
  if (q < 0 || q >= IRONLAMP.top) return true;
  if (ph.swap.st === 'warn') return false;
  const Q = ph.qs[q];
  return Q.held || Q.deadT > 0.6;
}
function ironLampPlan(st) {
  const ph = st.ph, K = IRONLAMP, out = [{}, {}], h = ph.holder, d = 1 - h, n = ph.n;
  const C = ph.claw, clawNear = C.st === 'reach' || C.st === 'shut';
  out[h] = { why: 'hold', k: n, x: ironLampRodX(n), hold: 'act', say: clawNear ? 'The claw! Let go and step back.' : 'Hold ' + ironKey(h, 'act') + ' on the rod.' };
  if (n < K.top) {
    const q = ironLampFloorOf(G.players[d]);
    const ok = ironLampSafeQ(st, Math.min(q, n));
    out[d] = { why: 'dash', k: n + 1, x: ironLampRodX(n + 1), say: ph.swap.st !== 'wait' ? 'SWAP! Wait on a mat or the stairs.' : ok ? 'Lightning off! Run up to rod ' + (n + 2) + '.' : 'Wait for the lightning to stop.' };
  } else {
    const c = ph.core;
    if (c.st === 'tug') out[d] = { why: 'tug', x: K.core.bulb, hold: 'act', say: 'Pull! Hold ' + ironKey(d, 'act') + ' and pull left!' };
    else out[d] = { why: 'bulb', x: K.core.bulb, hold: 'act', say: G.players[d].ground === ph.seat ? 'Unscrew the bulb: hold ' + ironKey(d, 'act') + '.' : 'Climb the chair to the bulb.' };
  }
  return out;
}
function ironLampHints(st) {
  const ph = st.ph, P = ironLampPlan(st);
  for (const id of [0, 1]) {
    const s = P[id] && P[id].say;
    if (s && ph['said' + id] !== s) { ph['said' + id] = s; ironHint(st, id, s, { life: 3.2, cpu: '' }); }
    if (!s) ph['said' + id] = null;
  }
}

/* --- drawing (dark paper: chalk on charcoal; the lantern eye the one big warm light) --- */
function ironLampDrawBack(st) {
  const ph = st.ph, K = IRONLAMP, cy = st.cam.y, c = ph.core;
  ironScreen(st, () => SKETCH.paper(ctx, 'dark'));
  for (let k = 0; k < 4; k++) { const y = 60 - 540 * (k + 1); if (y > cy + H || y + 540 < cy) continue; SKETCH.blit(ctx, IRON_ART.lampWall(k), 0, y); }
  // the eye's light through the amber glass (it goes out with the bulb)
  const eye = IRON_ART.LAMP_EYE, lit = 1 - (c.out || 0);
  if (lit > 0 && Math.abs(eye.y - cy - 270) < 700) {
    const fl = 0.85 + Math.sin(ph.t * 2.3) * 0.05 + (ph.qs.some(q => q.arcs.some(a => a.s === 'on')) ? 0.08 : 0);
    SKETCH.glow(ctx, eye.x, eye.y, eye.r * 1.5, '255,190,90', 0.32 * fl * lit);
    SKETCH.glow(ctx, eye.x, eye.y, eye.r * 0.8, '255,220,140', 0.22 * fl * lit);
  }
  // decks, the stairs, the knobs and mats
  for (let q = 0; q <= K.top; q++) {
    const y = ironLampY(q);
    if (y < cy - 60 || y - 160 > cy + H) continue;
    if (q > 0) SKETCH.blit(ctx, IRON_ART.lampDeck(), 0, y);
    if (q < K.top) {
      const [a] = ironLampStairs(q);
      SKETCH.glow(ctx, q % 2 === 0 ? 835 : 125, y - 124, 90, '255,200,110', 0.28);
      SKETCH.blit(ctx, IRON_ART.lampStep(q % 2 === 0 ? 1 : -1), a, y);
      SKETCH.blit(ctx, IRON_ART.lampMat(), (K.mat[0] + K.mat[1]) / 2, y);
      const xs = q >= 4 ? K.arcsA.concat(K.arcsB) : K.arcsA;
      for (const x of xs) { SKETCH.blit(ctx, IRON_ART.lampKnob(), x, y); SKETCH.blit(ctx, IRON_ART.lampKnob(), x, y - 136, { sy: -1 }); }
    }
  }
}
// a claw arm segment: a riveted iron strut with a lit edge
function ironLampArm(d, a, b, w) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * w / 2, ny = dx / L * w / 2;
  const pts = [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]];
  d.shape(pts, { fill: '#4a3c34', w: 1.8, corner: 30 });
  d.stroke([[a[0] - nx * 0.5, a[1] - ny * 0.5], [b[0] - nx * 0.5, b[1] - ny * 0.5]], { w: 1.2, col: '#f2c98a', alpha: 0.5, sh: 0 });
  const n = Math.floor(L / 26);
  for (let i = 1; i < n; i++) d.rivet(a[0] + dx * i / n, a[1] + dy * i / n, 1.4);
}
// a lightning bolt: a jagged white chalk line with black spotting, a glow, sparks at the knobs
function ironLampBolt(d, x, y0, y1, seed, on) {
  let s = seed | 0;
  const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const n = 9, pts = [];
  for (let i = 0; i <= n; i++) { const k = i / n, w = i === 0 || i === n ? 0 : (r() - 0.5) * (on ? 26 : 8); pts.push([x + w, y0 + (y1 - y0) * k]); }
  if (on) {
    SKETCH.glow(ctx, x, (y0 + y1) / 2, 90, '200,225,255', 0.45);
    d.stroke(pts, { w: 10, col: '#cfe6ff', alpha: 0.3, sh: 0, curve: false });
    d.stroke(pts, { w: 4.4, col: '#ffffff', sh: 0, curve: false });
    // black spotting along the bolt (the chalk's tooth)
    for (let i = 1; i < n; i++) if (r() < 0.6) { const [px, py] = pts[i]; ctx.fillStyle = '#16120f'; ctx.fillRect(px - 1 + (r() - 0.5) * 3, py - 1 + (r() - 0.5) * 6, 2, 2); }
    // a fork or two
    for (let f = 0; f < 2; f++) { const i = 2 + ((r() * (n - 4)) | 0), [px, py] = pts[i], dx = (r() < 0.5 ? -1 : 1) * (10 + r() * 14); d.stroke([[px, py], [px + dx * 0.6, py + 8], [px + dx, py + 18]], { w: 1.6, col: '#ffffff', sh: 0, curve: false }); }
  } else {
    d.stroke(pts.slice(0, 3), { w: 1.2, col: '#cfe6ff', alpha: 0.7, sh: 0, curve: false });
    d.stroke(pts.slice(n - 2), { w: 1.2, col: '#cfe6ff', alpha: 0.7, sh: 0, curve: false });
  }
  for (const yy of [y0, y1]) for (let i = 0; i < (on ? 5 : 3); i++) { const a = r() * Math.PI * 2, l = 4 + r() * (on ? 10 : 6); d.line(x, yy, x + Math.cos(a) * l, yy + Math.sin(a) * l, { w: 1, col: '#ffffff', ov: 0 }); }
}
function ironLampDraw(st) {
  const ph = st.ph, K = IRONLAMP, C = K.core, c = ph.core, cy = st.cam.y, gold = ironLampGold(st);
  const d = SKETCH.live(ctx, 6160, SKETCH.boil());
  d.dark = true;
  const flick = Math.floor(ph.t * 14);
  // the quarters: gold edges on dead ones (gold help), the arcs on live ones
  for (let q = 0; q < K.top; q++) {
    const y = ironLampY(q), Q = ph.qs[q];
    if (y < cy - 20 || y - 150 > cy + H) continue;
    if (gold && (Q.held || Q.deadT > 0)) {
      d.stroke([[K.zone[0], y - 2], [K.zone[1], y - 2]], { w: 3, col: IRON_P.core, sh: 0, alpha: 0.8 });
      d.stroke([[K.zone[0], y - 134], [K.zone[1], y - 134]], { w: 2, col: IRON_P.core, sh: 0, alpha: 0.5 });
    }
    for (const a of Q.arcs) if (a.s !== 'off') ironLampBolt(d, a.x, y - 136, y - 1, flick * 131 + a.x * 7 + q * 977, a.s === 'on');
  }
  // the rods (a gold dome round a held one)
  for (const r of ph.rods) {
    const y = ironLampY(r.k);
    if (y < cy - 20 || y - 160 > cy + H) continue;
    SKETCH.blit(ctx, IRON_ART.lampRod(), r.x, y, { sx: r.k % 2 === 0 ? 1 : -1 });
    if (r.glow > 0.05) {
      SKETCH.glow(ctx, r.x, y - 40, 60, '255,214,110', 0.35 * r.glow);
      d.stroke(SKETCH.ell(r.x, y, 34, 54 * r.glow + 6, 20, 0, Math.PI, Math.PI * 2), { w: 2, col: IRON_P.core, curve: true, sh: 0, alpha: 0.7 * r.glow });
      for (let i = 0; i < 3; i++) { const a = ph.t * 5 + i * 2.1; d.line(r.x + Math.cos(a) * 6, y - 104, r.x + Math.cos(a) * 14, y - 112 - Math.sin(a) * 4, { w: 1, col: '#ffe9a8', ov: 0 }); }
    }
    d.word(String(r.k + 1), r.x + (r.k % 2 === 0 ? 22 : -22), y - 92, 15, { align: 'center', col: r.k === ph.n ? IRON_P.core : '#efe8d8', w: 2 });
  }
  // the spanner: a chalk X and a dashed arc first, then it drops, then it lies
  const S = ph.span;
  if (S.st === 'tell') {
    const k = S.t / (gold ? K.span.goldTell : K.span.tell);
    d.stroke([[S.x - 9, S.y - 9], [S.x + 9, S.y + 1]], { w: 2.4, col: '#ff8a5a', sh: 0 });
    d.stroke([[S.x + 9, S.y - 9], [S.x - 9, S.y + 1]], { w: 2.4, col: '#ff8a5a', sh: 0 });
    d.word('!', S.x, S.y - 18, 16, { align: 'center', col: '#ff8a5a', w: 2.2 });
    const pts = []; for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push([S.x0 + (S.x - S.x0) * u, S.y - 136 - Math.sin(u * Math.PI) * 30 + u * 20]); }
    for (let i = 0; i < 14; i += 2) d.stroke([pts[i], pts[i + 1]], { w: 1.4, col: '#efe8d8', sh: 0, alpha: 0.5 + 0.5 * k });
  } else if (S.st === 'fall') {
    const k = S.t / K.span.fall;
    SKETCH.blit(ctx, IRON_ART.lampSpanner(), S.x, S.y - 136 + 130 * k * k, { rot: k * 9 });
    d.speed(S.x, S.y - 150 + 120 * k * k, 0, -40, 3, { w: 1, col: '#efe8d8' });
  } else if (S.st === 'lie') SKETCH.blit(ctx, IRON_ART.lampSpanner(), S.x, S.y - 5, { rot: 1.57, alpha: 1 - Math.max(0, S.t - K.span.lie + 0.4) / 0.4 });
  // the claw: down from the dark on a jointed arm
  const Cw = ph.claw;
  if (Cw.st !== 'wait') {
    const r = ph.rods[Cw.k], y = ironLampY(r.k), reach = gold ? K.claw.goldReach : K.claw.reach;
    const k = Cw.st === 'reach' ? Math.min(1, Cw.t / (reach * 0.7)) : Cw.st === 'shut' ? 1 : 1 - Cw.t / K.claw.back;
    const tipX = r.x + (r.k % 2 === 0 ? 4 : -4), tipY = y - 130 + (1 - k) * -220, top = cy - 30;
    const jx = tipX + (r.k % 2 === 0 ? 90 : -90), jy = (top + tipY) / 2 - 10;
    ironLampArm(d, [480, top], [jx, jy], 11);
    ironLampArm(d, [jx, jy], [tipX, tipY - 6], 8);
    d.ellipse(jx, jy, 9, 9, { fill: IRON_P.ironLight, w: 1.6 });
    d.rivet(jx, jy, 2.2);
    SKETCH.blit(ctx, IRON_ART.lampClaw(Cw.st === 'reach' ? 0 : 1), tipX, tipY);
    if (Cw.st === 'reach' && Cw.t > reach - 0.5 && Math.floor(ph.t * 8) % 2) d.word('SNAP?', tipX + (r.k % 2 === 0 ? 40 : -40), tipY - 10, 12, { align: 'center', col: '#ff8a5a', w: 1.8 });
  }
  // the chair, the bulb and its cage, Tick
  const T = ironLampY(K.top);
  if (T - 300 < cy + H) {
    SKETCH.blit(ctx, IRON_ART.lampChair(), 620, T);
    const live = !ph.qs[K.top].held && ph.qs[K.top].deadT <= 0;
    const bx = C.bulb - (c.st === 'tug' ? Math.min(1, c.tug / C.tug) * 10 : 0) - (c.out || 0) * 40, by = C.bulbY + (c.st === 'shut' ? -c.prog * 4 : -12) + (c.out || 0) * 30;
    const lit = 1 - (c.out || 0);
    if (lit > 0) { SKETCH.glow(ctx, bx, by, 160, '255,226,150', (0.45 + Math.sin(ph.t * 7) * 0.05) * lit); }
    // the socket and its cable up into the dark (it stays when the bulb comes out)
    d.stroke([[C.bulb, cy - 20], [C.bulb + 2, C.bulbY - 70]], { w: 4, col: '#2a2421', sh: 0 });
    d.stroke([[C.bulb, cy - 20], [C.bulb + 2, C.bulbY - 70]], { w: 1.4, col: '#efe8d8', sh: 0 });
    d.shape(SKETCH.box(C.bulb - 16, C.bulbY - 74, 32, 22), { fill: '#5a463c', w: 1.6, corner: 30 });
    SKETCH.blit(ctx, IRON_ART.lampBulb(), bx, by, { rot: c.st === 'shut' ? c.prog * 2.1 : c.st === 'tug' ? Math.sin(ph.t * 20) * 0.05 : (c.out || 0) * -0.6, alpha: 1 });
    if (lit < 1) SKETCH.glow(ctx, bx, by, 60, '30,24,40', 0.5 * (1 - lit));
    if (c.st !== 'out') {
      SKETCH.blit(ctx, IRON_ART.lampCage(), C.bulb, C.bulbY);
      if (live) for (let i = 0; i < 3; i++) { const a = (flick * 0.9 + i * 2.1) % 6.28; ironLampBolt(d, C.bulb + Math.cos(a) * 52, C.bulbY + Math.sin(a) * 50 - 6, C.bulbY + Math.sin(a) * 50 + 6, flick * 71 + i * 13, false); }
      if (live && ph.n >= K.top) d.word('LIVE', C.bulb - 76, C.bulbY - 40, 12, { align: 'center', col: '#cfe6ff', w: 1.8 });
    }
    if (c.st === 'shut' && c.prog > 0) d.stroke(SKETCH.ell(C.bulb + 70, C.bulbY - 50, 14, 14, 24, 0, -Math.PI / 2, -Math.PI / 2 + c.prog / C.need * Math.PI * 2), { w: 4, col: IRON_P.core, curve: true, sh: 0 });
    if (c.st === 'tug') {
      const k = Math.min(1, c.tug / C.tug);
      d.stroke([[C.bulb - 60, C.bulbY - 90], [C.bulb - 60 + 120 * k, C.bulbY - 90]], { w: 5, col: IRON_P.core, sh: 0 });
      d.shape(SKETCH.box(C.bulb - 62, C.bulbY - 96, 124, 12), { w: 1.4, col: '#efe8d8' });
      d.word('TUG!', C.bulb, C.bulbY - 108, 16, { align: 'center', col: '#efe8d8', w: 2.2 });
    }
    ironTickDrawAt(st);
  }
}
function ironLampDrawTop(st) {
  const ph = st.ph, c = ph.core;
  if (!c.out) ironScreen(st, () => SKETCH.gloom(ctx, 480, 300, 420, 900, '18,14,30', 0.2));
  // the head fades to pencil: a pale paper wash over everything
  if (c.fade > 0) ironScreen(st, () => { ctx.save(); ctx.globalAlpha = c.fade * 0.55; ctx.fillStyle = '#d8d2c4'; ctx.fillRect(0, 0, W, H); ctx.restore(); });
}

IRON_PHASES.brain = {
  setup(st, L) { ironLampSetup(st, L); },
  wait(st, dt) { const ph = st.ph; if (ph.prep && ph.prep.length) ph.prep.shift()(); ironCoast(st, dt, ph.solids); },
  step(st, dt) { const ph = st.ph; if (ph.prep && ph.prep.length) ph.prep.shift()(); ironLampStep(st, dt); },
  plan(st) { return ironLampPlan(st); },
  busy(st) { return st.ph.core.st === 'out'; },
  labels(st) {
    const ph = st && st.ph;
    if (!ph || !ph.core || ph.n < IRONLAMP.top) return ['earth', 'earth'];
    const w = ['earth', 'earth']; w[1 - ph.holder] = ph.core.st === 'tug' ? 'pull' : 'unscrew'; return w;
  },
  hudText(st) {
    const ph = st.ph;
    if (ph.n >= IRONLAMP.top) return ph.core.st === 'tug' ? 'Tug of war with Tick!' : 'The bulb: unscrew it';
    return 'Rod ' + (ph.n + 1) + ' of 9  ·  Lap ' + (ph.n < 4 ? 1 : 2);
  },
  drawBack(st) { ironLampDrawBack(st); },
  draw(st) { ironLampDraw(st); },
  drawTop(st) { ironLampDrawTop(st); },
  music() { return { song: 'ironworks', amb: 'ironBelly' }; },
  stat(st) { const s = st.stats.brain; return s ? { label: 'Zaps', value: s.zaps || 0 } : null; },
  leave() { SKETCH.forget('iron:lamp'); },
};

/* --- sounds --- */
Sfx.extra.ironlampArc = function () { this.noise(0.18, { type: 'highpass', f: 3500, to: 1800, vol: 0.035 }); this.tone(120, 0.15, 'sawtooth', 0.02, 60); };
Sfx.extra.ironlampZap = function () { this.noise(0.35, { type: 'bandpass', f: 2400, to: 900, vol: 0.06 }); this.tone(880, 0.2, 'square', 0.025, 110); };
Sfx.extra.ironlampRodOn = function () { this.tone(220, 0.25, 'sine', 0.03, 330); this.noise(0.15, { type: 'lowpass', f: 600, vol: 0.02 }); };
Sfx.extra.ironlampRodOff = function () { this.tone(330, 0.2, 'sine', 0.02, 200); };
Sfx.extra.ironlampSpannerWhistle = function () { this.tone(1400, 0.8, 'sine', 0.012, 700, 0.1); };
Sfx.extra.ironlampSpannerClank = function () { this.tone(1300, 0.08, 'square', 0.03, 900); this.tone(1700, 0.12, 'triangle', 0.025, null, 0.05); this.noise(0.1, { type: 'highpass', f: 2500, vol: 0.02 }); };
Sfx.extra.ironlampSwapLever = function () { this.tone(400, 0.1, 'square', 0.025, 300); this.tone(300, 0.1, 'square', 0.025, 200, 0.12); };
Sfx.extra.ironlampSwapThrow = function () { this.noise(0.2, { type: 'bandpass', f: 800, vol: 0.04 }); this.tone(90, 0.3, 'sine', 0.05, 50); };
Sfx.extra.ironlampSwapBack = function () { this.tone(260, 0.12, 'square', 0.02, 340); };
Sfx.extra.ironlampClawWhirr = function () { this.tone(140, 1.0, 'sawtooth', 0.015, 260); };
Sfx.extra.ironlampClawSnap = function () { this.tone(600, 0.05, 'square', 0.04, 200); this.noise(0.08, { type: 'highpass', f: 1800, vol: 0.04 }); };
Sfx.extra.ironlampUnscrew = function () { this.tone(900, 0.12, 'triangle', 0.015, 1100); this.tone(700, 0.1, 'triangle', 0.012, 850, 0.15); };
Sfx.extra.ironlampSpark = function () { this.noise(0.12, { type: 'highpass', f: 4000, vol: 0.03 }); };
Sfx.extra.ironlampTickGrab = function () { this.tone(500, 0.08, 'square', 0.03, 700); this.tone(700, 0.08, 'square', 0.03, 1000, 0.09); };
Sfx.extra.ironlampTug = function () { this.tone(180, 0.2, 'triangle', 0.03, 140); this.noise(0.15, { type: 'lowpass', f: 400, vol: 0.02 }); };
Sfx.extra.ironlampBulbOut = function () { this.noise(0.25, { type: 'highpass', f: 1500, vol: 0.06 }); this.tone(1200, 0.12, 'sine', 0.05, 400); this.tone(220, 1.4, 'sine', 0.04, 55, 0.1); };
Sfx.extra.ironlampEyeDark = function () { this.tone(110, 2.2, 'sine', 0.035, 40); this.noise(1.8, { type: 'lowpass', f: 900, to: 120, vol: 0.03, a: 0.2 }); };

ironRoom('brain', {
  jobs: {
    both: { act: ['earth', 'unscrew', 'pull'], legend: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump <kbd>F</kbd> hold an earthing rod',
      howTo: ['A held rod switches off the lightning near it. The other dashes to the next rod.', 'At the top, hold to unscrew the bulb, then hold and pull left.'] },
  },
  act: { label: 'earth', labels: ['earth', 'earth'] },
  tip: IRON_PARTS.brain.tip,
});
