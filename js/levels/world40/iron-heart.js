/* Pip & Bo - Level 40-1 The Iron Colossus: Part 5 'heart' (The Gear Heart, core 2). */
'use strict';

/* ===== 40-1 Part 5: The Gear Heart (IRON_PHASES.heart) =============================================================
   Inside the chest, scrolling UP. Everything moves on the heart's TICK (once a second): the carriage, the lifts, the
   pendulums, the crushers. Twist: ROUTES. Each level has a signal booth with a three-way lever (top / middle /
   bottom rail: hold the action and press up or down). A RIDER rides the one carriage up a rail network from the dock
   at level k to the dock at level k+1; the network has two JUNCTIONS, and at each one the carriage takes the rail the
   lever at booth k points to when it leaves the junction. Of the three rails out of a junction one goes on, one ends
   in a CRUSHER (it closes on the next tick: a Clang, back to the dock) and one is a DEAD END (the carriage runs back
   to the dock with the rider on it). The two junctions want different rails, so the controller must switch the lever
   between them while the rider is out on the rails (no one can do this leg alone).
   When the rider reaches level k+1 the jobs swap: the rider becomes the controller at booth k+1 and the old
   controller takes the booth's chain LIFT up (it only runs once the carriage got there) and rides the next leg.
   Legs 1-3 have a PENDULUM over the route (it swings through at 0.7 past each tick, once the carriage has stopped: jump it). From leg 2 Tick flips
   a master switch now and then: REVERSE (1 s warning, then the carriage runs backwards for 3 ticks).
   THE CORE (level 4): the gear heart on its spindle. One stands on the ESCAPEMENT PEDAL (every 4th tick it bucks:
   jump on that tick or be thrown off), the other unscrews the spindle NUT (hold the action, 3 s, it only turns while
   the pedal is down). The heart drops; both grab it (hold the action beside it) and carry it out: core 2.
   Gold help: the right lever position glows at the next junction and the carriage waits at a junction until the lever
   is right; the pendulums stop; the pedal never bucks.
   Rivets: 8, two along each leg's good route.   Stats (st.stats.heart): crushes, dead ends.   Names: ironHeart*. */
const IRONHEART = {
  lvl: 360, levels: 4, carHW: 46, step: 110, move: 0.4, rows: [-240, -150, -60],
  // per leg: the good rail at junction 1 and 2 (0 top, 1 middle, 2 bottom) and which of the others is the crusher
  legs: [
    { j1: 0, c1: 1, j2: 2, c2: 0 },
    { j1: 2, c1: 0, j2: 0, c2: 1 },
    { j1: 0, c1: 2, j2: 1, c2: 0 },
    { j1: 2, c1: 1, j2: 1, c2: 2 },
  ],
  zone: 34, liftW: 64, liftUp: 180, pend: { L: 110, A: 0.68, r: 14 }, revEvery: 8, revT: 2,
  core: { pedal: 380, pedalW: 76, nut: 620, heart: 620, need: 3, buck: 4, grab: 90, carry: 0.6 },
};
// leg geometry: k 0..3; dir +1 runs left to right (booth on the left), -1 right to left
function ironHeartLeg(k) {
  const K = IRONHEART, dir = k % 2 === 0 ? 1 : -1, xd = dir > 0 ? 260 : 700, y0 = -K.lvl * k;
  return { k, dir, xd, xe: xd + 440 * dir, y0, j2x: xd + 220 * dir, rows: K.rows.map(r => y0 + r), L: K.legs[k] };
}
// a booth / lift at level k (the side of the dock that leg k starts from); level 4 has no booth
function ironHeartBooth(k) {
  const left = k % 2 === 0;
  return { k, left, lever: left ? 150 : 810, x0: left ? 100 : 760, x1: left ? 200 : 860, lift: left ? 52 : 908, y: -IRONHEART.lvl * k };
}
// straight-line points from a to b at most `step` apart (b included, a not)
function ironHeartSteps(a, b, out) {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / IRONHEART.step));
  for (let i = 1; i <= n; i++) out.push({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n });
  return out;
}
const ironHeartGold = st => ironHasGold(st, 'heart');
// the rail a junction leads to on each lever position: 'ok' | 'crush' | 'dead'
const ironHeartFate = (L, j, r) => (r === (j === 1 ? L.j1 : L.j2) ? 'ok' : r === (j === 1 ? L.c1 : L.c2) ? 'crush' : 'dead');

function ironHeartSetup(st, L) {
  const ph = st.ph, K = IRONHEART;
  ph.first = L.def.first || 0;
  ph.t = 0; ph.tickN = 0; ph.tickT = 0; ph.leg = 0;
  ph.lever = [1, 1, 1, 1];
  ph.aboard = [false, false]; ph.fresh = false;
  const g = ironHeartLeg(0);
  ph.car = { x: g.xd, y: g.y0, fx: g.xd, fy: g.y0, tx: g.xd, ty: g.y0, mt: 1, mode: 'board', ahead: [], hist: [], at: null, end: null, j: 0, wait: 0 };
  ph.carSolid = { x0: 0, y0: 0, x1: 0, y1: 0, one: true, kind: 'car' };
  ph.lifts = [0, 1, 2, 3].map(k => { const b = ironHeartBooth(k); return { k, x: b.lift, y: b.y, base: b.y, st: 'down', solid: { x0: b.lift - K.liftW / 2, x1: b.lift + K.liftW / 2, y0: b.y, y1: b.y + 12, one: true, kind: 'lift' } }; });
  ph.crush = null; ph.rev = 0; ph.revWarn = 0; ph.revNext = K.revEvery;
  ph.core = { st: 'off', prog: 0, carry: 0, t: 0, lift: 0, buckT: 0, heartY: 0 };
  ph.safeX = [0, 0];
  st.cam = { x: 0, y: -470 };
  const bx = [ironHeartBooth(0).lever, g.xd - 40];
  G.players.forEach((p, k) => Object.assign(p, { x: bx[k === ph.first ? 0 : 1] - p.w / 2 - st.cam.x, y: -p.h - st.cam.y, vx: 0, vy: 0, face: 1, grounded: true, alive: true }));
  const rv = [];
  for (let k = 0; k < 4; k++) { const g2 = ironHeartLeg(k); rv.push([g2.xd + 110 * g2.dir, g2.rows[g2.L.j1] - 26], [g2.xd + 330 * g2.dir, g2.rows[g2.L.j2] - 74]); }
  ironRivetsSetup(st, rv);
  const s = ironStats(st); Object.assign(s, { crushes: s.crushes || 0, deads: s.deads || 0 });
  Object.assign(st.tick, { hidden: true });
  ph.solids = [{ x0: -60, y0: 0, x1: 1020, y1: 90, kind: 'floor' }, { x0: -60, y0: -2400, x1: 0, y1: 90, kind: 'wall' }, { x0: 960, y0: -2400, x1: 1020, y1: 90, kind: 'wall' }];
  for (let k = 1; k <= 4; k++) ph.solids.push({ x0: 0, x1: 960, y0: -K.lvl * k, y1: -K.lvl * k + 14, one: true, kind: 'catwalk' });
  // the booth floors are solid plate (holding the lever down must not drop anyone through the grating)
  for (let k = 1; k <= 3; k++) { const b = ironHeartBooth(k); ph.solids.push({ x0: b.x0 - 10, x1: b.x1 + 10, y0: b.y, y1: b.y + 14, kind: 'boothfloor' }); }
  ph.solids.push(ph.carSolid, ...ph.lifts.map(l => l.solid));
  ph.pedal = { x0: K.core.pedal - K.core.pedalW / 2, x1: K.core.pedal + K.core.pedalW / 2, y0: -K.lvl * 4 - 2, y1: -K.lvl * 4 + 6, kind: 'pedal', up: 0 };
  ph.solids.push(ph.pedal);
  ph.prep = [];
  for (let k = 0; k < 4; k++) ph.prep.push(() => IRON_ART.heartWall(k));
  for (let k = 0; k < 4; k++) ph.prep.push(() => IRON_ART.heartRails(k));
  ph.prep.push(() => IRON_ART.heartCatwalk(), () => IRON_ART.signalBooth(1), () => IRON_ART.signalBooth(-1), () => IRON_ART.carriage(), () => IRON_ART.chainLift(), () => IRON_ART.gear(70, 14), () => IRON_ART.gear(120, 22),
    () => IRON_ART.gear(46, 10), () => IRON_ART.pendulumBob(), () => IRON_ART.gearHeart(), () => IRON_ART.escapePedal(), () => IRON_ART.crusherJaw());
}

/* --- the clock --- */
function ironHeartCtl(p, dt) { control(p, dt); p.dropT = 0; }
function ironHeartStep(st, dt) {
  const ph = st.ph, ps = G.players;
  ph.t += dt;
  if (st.idle) { ironCoast(st, dt, ph.solids); ironHeartCamera(st, dt); return; }
  if (ph.core.st === 'lift') { ironHeartCoreLift(st, dt); return; }
  ph.tickT += dt;
  const tick = ph.tickT >= 1;
  if (tick) { ph.tickT -= 1; ph.tickN++; ironHeartTick(st); }
  // the carriage and lifts glide over the first part of each tick
  const c = ph.car, m = Math.min(1, ph.tickT / IRONHEART.move), e = m * m * (3 - 2 * m);
  const ox = c.x, oy = c.y;
  c.x = c.fx + (c.tx - c.fx) * e; c.y = c.fy + (c.ty - c.fy) * e;
  const dx = c.x - ox, dy = c.y - oy;
  for (const l of ph.lifts) { const ly = l.y; l.y = l.fy != null ? l.fy + (l.ty - l.fy) * e : l.y; l.dy = l.y - ly; Object.assign(l.solid, { y0: l.y, y1: l.y + 12, dy: l.dy, dx: 0 }); }
  Object.assign(ph.carSolid, { x0: c.x - IRONHEART.carHW, x1: c.x + IRONHEART.carHW, y0: c.y, y1: c.y + 20, dx: 0, dy: 0 });
  // riders aboard are carried (in the air too) and kept on the deck while it is out on the rails
  for (const p of ps) if (ph.aboard[p.id]) { p.x += dx; p.y += dy; }
  ironHeartLever(st);
  // no dropping through the grating (down is half of working the lever)
  for (const p of ps) ironBody(p, dt, ph.solids, { partner: true, ctl: ironHeartCtl });
  ironHeartAboard(st);
  ironTrack(st);
  ironHeartPendulums(st);
  ironHeartCore(st, dt);
  ironHeartCamera(st, dt);
  ironRivetsStep(st, dt);
  ironHeartHints(st);
}
// what happens on each tick
function ironHeartTick(st) {
  const ph = st.ph, K = IRONHEART, c = ph.car;
  Sfx.play(ph.tickN % 2 ? 'ironheartTick' : 'ironheartTock');
  ironWord(st, ph.tickN % 2 ? 'tick' : 'tock', 480 + (ph.tickN % 2 ? -1 : 1) * 380, st.cam.y + 96, 15, { life: 0.7, rise: 6, grow: 0.2, fill: null, col: '#efe8d8', key: 'tick' });
  // the lifts: step 120 px a tick toward where they are going
  for (const l of ph.lifts) {
    l.fy = l.y; l.ty = l.y;
    const top = l.base - K.lvl;
    const riding = G.players.some(p => p.alive && p.grounded && p.ground === l.solid);
    if (l.st === 'down' && riding && ph.leg > l.k) { l.st = 'up'; Sfx.play('ironheartPlatformRoll'); }
    if (l.st === 'up') { l.ty = Math.max(top, l.y - K.liftUp); if (l.ty === top) l.st = 'top'; }
    else if (l.st === 'top') { if (!riding) { l.wait = (l.wait || 0) + 1; if (l.wait >= 2) { l.st = 'back'; l.wait = 0; } } }
    else if (l.st === 'back') { l.ty = Math.min(l.base, l.y + K.liftUp); if (l.ty === l.base) l.st = 'down'; }
  }
  // Tick's master switch: REVERSE (legs 3 and 4)
  if (c.mode === 'run' && ph.leg >= 2 && !ph.rev) {
    ph.revNext--;
    if (ph.revNext === 1) { ironSay(st, 'REVERSE! HA!', 1.6, { caption: false }); ph.revWarn = 1; Sfx.play('ironheartReverseWhirr'); }
    if (ph.revNext <= 0) { ph.rev = K.revT; ph.revWarn = 0; ph.revNext = K.revEvery + 2; }
  }
  // the crusher closes on the tick after the carriage got to it
  if (ph.crush) { ironHeartCrushNow(st); return; }
  c.fx = c.x; c.fy = c.y; c.tx = c.x; c.ty = c.y;
  if (c.mode === 'board') {
    if (ph.leg >= 4) return;   // it has done its last run
    const who = [0, 1].find(id => ph.aboard[id]);
    if (who != null && !ph.fresh) { c.mode = 'run'; c.rider = who; c.ahead = ironHeartSteps({ x: c.x, y: c.y }, { x: c.x, y: ironHeartLeg(ph.leg).rows[1] }, []); c.ahead[c.ahead.length - 1].j = 1; c.hist = []; c.jDone = 0; Sfx.play('ironheartPlatformRoll'); }
    return;
  }
  if (c.mode === 'back') {
    // running back to the dock: three stops a tick
    for (let i = 0; i < 3 && c.hist.length; i++) { const q = c.hist.pop(); c.tx = q.x; c.ty = q.y; }
    if (!c.hist.length) { c.mode = 'board'; c.ahead = []; c.at = null; c.jDone = 0; ph.fresh = false; }
    return;
  }
  if (c.mode !== 'run') return;
  if (ph.rev > 0) {
    ph.rev--;
    if (c.hist.length > 1) { c.ahead.unshift({ x: c.x, y: c.y, j: c.at && c.at.j, end: c.at && c.at.end }); const q = c.hist.pop(); c.tx = q.x; c.ty = q.y; c.at = q; }
    return;
  }
  const g = ironHeartLeg(ph.leg);
  // at a junction with nothing built past it: take the rail the lever says
  if (!c.ahead.length && c.at && c.at.j) {
    const r = ph.lever[ph.leg], fate = ironHeartFate(g.L, c.at.j, r);
    if (fate !== 'ok' && ironHeartGold(st)) { c.wait++; return; }   // gold: it waits for the right rail
    Sfx.play('ironheartJunctionClack'); c.jDone = c.at.j;
    if (c.at.j === 1) {
      const a = { x: g.xd, y: g.rows[r] };
      if (r !== 1) ironHeartSteps({ x: c.x, y: c.y }, a, c.ahead);
      ironHeartSteps(a, { x: fate === 'ok' ? g.j2x : g.xd + 170 * g.dir, y: g.rows[r] }, c.ahead);
    } else {
      const a = { x: g.j2x, y: g.rows[r] };
      if (Math.abs(a.y - c.y) > 1) ironHeartSteps({ x: c.x, y: c.y }, a, c.ahead);
      if (fate === 'ok') { ironHeartSteps(a, { x: g.xe, y: g.rows[r] }, c.ahead); ironHeartSteps({ x: g.xe, y: g.rows[r] }, { x: g.xe, y: g.y0 - IRONHEART.lvl }, c.ahead); }
      else ironHeartSteps(a, { x: g.j2x + 170 * g.dir, y: g.rows[r] }, c.ahead);
    }
    const last = c.ahead[c.ahead.length - 1];
    if (fate !== 'ok') last.end = fate;
    else if (c.at.j === 1) last.j = 2;
    else last.end = 'dock';
  }
  if (c.at && c.at.end === 'crush' && !c.ahead.length) { ph.crush = { t: 0 }; return; }
  if (c.at && c.at.end === 'dead' && !c.ahead.length) {
    ironWord(st, 'DEAD END', c.x, c.y - 70, 18, { life: 1.2, rise: 10 }); Sfx.play('ironheartReverseWhirr'); ironStats(st).deads++;
    if (ironMiss(st, 'heart') >= IRON.goldAfter) ironHeartGoldNow(st);   // a wrong rail is a miss (no Clang)
    c.mode = 'back'; return;
  }
  if (c.at && c.at.end === 'dock' && !c.ahead.length) { ironHeartArrive(st); return; }
  const q = c.ahead.shift();
  if (q) { c.hist.push({ x: c.x, y: c.y, j: c.at && c.at.j, end: c.at && c.at.end }); c.tx = q.x; c.ty = q.y; c.at = q; c.wait = 0; }
}
function ironHeartCrushNow(st) {
  const ph = st.ph, c = ph.car;
  ph.crush = null; ph.crushAnim = { x: c.x, y: c.y, t: 0 };
  Sfx.play('ironheartCrusher'); ironStats(st).crushes++;
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.3);
  const g = ironHeartLeg(ph.leg);
  for (const p of G.players) if (ph.aboard[p.id]) {
    ph.aboard[p.id] = false;
    if (ironClang(st, p, { kind: 'crush', word: 'KRUNCH!', to: { x: g.xd - 60 * g.dir, y: g.y0 } }) && ironMiss(st, 'heart') >= IRON.goldAfter) ironHeartGoldNow(st);
  }
  c.mode = 'back'; c.fx = c.x; c.fy = c.y; c.tx = c.x; c.ty = c.y;
}
function ironHeartGoldNow(st) { ironGoldOnce(st, 'heart', 'Gold help! The right rail glows, and the carriage waits for it.'); }
function ironHeartArrive(st) {
  const ph = st.ph, c = ph.car;
  ph.leg++; c.mode = 'board'; c.ahead = []; c.hist = []; c.at = null; ph.fresh = true;
  ironCelebrate(st, 0.4); Sfx.play('ironheartLeverNotch');
  if (ph.leg >= 4) { ph.core.st = 'on'; ironNews(st, 'The gear heart! One on the pedal, one on the nut.'); return; }
  ironSwap(st);
  ironNews(st, 'Booth ' + (ph.leg + 1) + ' of 4. Swap: ' + NAMES[c.rider] + ' works the lever, ' + NAMES[1 - c.rider] + ' takes the lift up.');
}
/* --- who is aboard --- */
function ironHeartAboard(st) {
  const ph = st.ph, c = ph.car, K = IRONHEART;
  for (const p of G.players) {
    const cx = p.x + p.w / 2, on = Math.abs(cx - c.x) < K.carHW - 4;
    if (!p.alive) { ph.aboard[p.id] = false; continue; }
    if (c.mode === 'board') {
      const now = on && p.grounded && Math.abs(p.y + p.h - c.y) < 3;
      if (!now && p.grounded) ph.aboard[p.id] = false;
      else if (now) ph.aboard[p.id] = true;
    } else if (ph.aboard[p.id]) {
      // out on the rails: kept on the deck
      p.x = clamp(p.x, c.x - K.carHW, c.x + K.carHW - p.w);
      if (p.vy >= 0 && p.y + p.h > c.y - 1 && p.y + p.h < c.y + 40) { p.y = c.y - p.h; p.vy = 0; p.grounded = true; p.ground = ph.carSolid; }
    }
  }
  // after an arrival (or a run back) the carriage only goes again once someone new has stepped on
  if (ph.fresh && c.mode === 'board' && !ph.aboard.some(Boolean)) ph.fresh = false;
}
/* --- the levers: hold the action in the booth, up / down picks the rail --- */
function ironHeartLever(st) {
  const ph = st.ph, K = IRONHEART;
  for (const p of G.players) {
    const was = ph['in' + p.id] || {};
    const k = ironHeartLevelOf(st, p), b = k < 4 ? ironHeartBooth(k) : null;
    const inB = b && p.alive && p.grounded && !ph.aboard[p.id] && Math.abs(p.x + p.w / 2 - b.lever) < K.zone && Math.abs(p.y + p.h - b.y) < 4;
    const up = !!p.input.up, dn = !!p.input.down;
    if (inB && p.input.act) {
      if (up && !was.up && ph.lever[k] > 0) { ph.lever[k]--; Sfx.play('ironheartLeverNotch'); }
      if (dn && !was.dn && ph.lever[k] < 2) { ph.lever[k]++; Sfx.play('ironheartLeverNotch'); }
    }
    ph['in' + p.id] = { up, dn };
    p.inBooth = !!inB;
  }
}
function ironHeartLevelOf(st, p) {
  const ph = st.ph;
  if (ph.aboard[p.id] && ph.car.mode !== 'board') return ph.leg;
  return clamp(Math.floor((-(p.y + p.h) + 40) / IRONHEART.lvl), 0, 4);
}
/* --- pendulums (legs 2-4) --- */
function ironHeartPend(st, k) {
  const g = ironHeartLeg(k), P = IRONHEART.pend, ph = st.ph;
  const px = g.xd + 330 * g.dir, by = g.rows[g.L.j2] - 26, py = by - P.L;
  const s = ph.tickN + ph.tickT, a = ironHeartGold(st) ? 0.9 : P.A * Math.sin(Math.PI * (s - 0.7));   // through the bottom at 0.7 past each tick (the carriage has stopped)
  return { px, py, a, bx: px + Math.sin(a) * P.L, by: py + Math.cos(a) * P.L };
}
function ironHeartPendulums(st) {
  const ph = st.ph, P = IRONHEART.pend;
  if (ironHeartGold(st)) return;
  for (let k = 1; k < 4; k++) {
    if (Math.abs(k - ph.leg) > 0) continue;
    const q = ironHeartPend(st, k);
    for (const p of G.players) {
      if (!p.alive || st.safe[p.id] > 0) continue;
      const nx = clamp(q.bx, p.x, p.x + p.w), ny = clamp(q.by, p.y, p.y + p.h);
      if (Math.hypot(q.bx - nx, q.by - ny) < P.r) {
        const g = ironHeartLeg(ph.leg);
        if (ph.aboard[p.id]) { ph.aboard[p.id] = false; ph.car.mode = 'back'; ph.car.fx = ph.car.x; ph.car.fy = ph.car.y; ph.car.tx = ph.car.x; ph.car.ty = ph.car.y; }
        if (ironClang(st, p, { kind: 'pendulum', word: 'BONK!', to: { x: g.xd - 60 * g.dir, y: g.y0 } }) && ironMiss(st, 'heart') >= IRON.goldAfter) ironHeartGoldNow(st);
      }
    }
  }
}
/* --- the core: pedal, nut, carry --- */
function ironHeartCore(st, dt) {
  const ph = st.ph, K = IRONHEART, C = K.core, c = ph.core, ps = G.players, y4 = -K.lvl * 4;
  if (c.st !== 'on' && c.st !== 'carry') return;
  const onPedal = ps.find(p => p.alive && p.grounded && p.ground === ph.pedal);
  if (c.st === 'on') {
    // the buck: every 4th tick (a tell on the tick before)
    const beat = ph.tickN % C.buck;
    c.tell = !ironHeartGold(st) && beat === C.buck - 1;
    if (!ironHeartGold(st) && beat === 0 && ph.tickT < 0.2 && c.lastBuck !== ph.tickN) {
      c.lastBuck = ph.tickN; ph.pedal.up = 0.3; Sfx.play('ironheartPedalBuck');
      for (const p of ps) if (p.alive && p.grounded && p.ground === ph.pedal) { knock(p, (p.x + p.w / 2 > C.pedal ? 1 : -1) * 240, -360, 0.6, 0.3); if (ironMiss(st, 'heart') >= IRON.goldAfter) ironHeartGoldNow(st); ironWord(st, 'BUCK!', C.pedal, y4 - 90, 20, { life: 0.9, rise: 12 }); }
    }
    ph.pedal.up = Math.max(0, ph.pedal.up - dt);
    const turner = ps.find(p => p !== onPedal && p.alive && p.grounded && p.input.act && Math.abs(p.x + p.w / 2 - C.nut) < 34);
    c.turning = !!(onPedal && turner);
    if (c.turning) { c.prog += dt; if (!(c.spinT > 0)) { Sfx.play('ironheartNutSpin'); c.spinT = 0.3; } } else c.prog = Math.max(0, c.prog - dt * 0.2);
    c.spinT = (c.spinT || 0) - dt;
    if (c.prog >= C.need) { c.st = 'carry'; c.t = 0; Sfx.play('ironheartHeartStop'); ironWord(st, 'CLUNK!', C.nut, y4 - 120, 26, { life: 1, rise: 12 }); ironNews(st, 'It stopped! Both grab the heart and carry it out.'); }
  } else {
    c.t += dt; c.heartY = Math.min(1, c.t / 0.6);
    const both = ps.filter(p => p.alive && p.grounded && p.input.act && Math.abs(p.x + p.w / 2 - C.heart) < C.grab).length === 2;
    c.carry = both ? c.carry + dt : Math.max(0, c.carry - dt * 0.3);
    if (c.carry >= C.carry) { c.st = 'lift'; c.t = 0; Sfx.play('ironheartHeartStop'); }
  }
}
function ironHeartCoreLift(st, dt) {
  const ph = st.ph, c = ph.core;
  c.t += dt; c.lift = Math.min(1, c.t / 1.4);
  ironCoast(st, dt, ph.solids);
  if (c.t > 1.8 && !st.cut) ironPhaseDone(st, { core: true, say: 'MY HEART! ...Everything is going all floppy.' });
}
// the camera: the lowest hero's level (an aboard rider counts as the leg's level)
function ironHeartCamera(st, dt) {
  const ph = st.ph, ps = G.players.filter(p => p.alive);
  if (!ps.length) return;
  const L = Math.min(...ps.map(p => ironHeartLevelOf(st, p)));
  const ty = -IRONHEART.lvl * L - 470;
  st.cam.x = 0; st.cam.y += (ty - st.cam.y) * Math.min(1, dt * 2.5);
}

/* --- the plan --- */
function ironHeartPlan(st) {
  const ph = st.ph, K = IRONHEART, out = [{}, {}], c = ph.car;
  if (ph.leg >= 4) {
    const C = K.core, ped = c.rider != null ? c.rider : ph.first, nut = 1 - ped;
    for (const id of [ped, nut]) {
      const p = G.players[id];
      if (ironHeartLevelOf(st, p) < 4) { const b = ironHeartBooth(3); out[id] = { why: 'lift', x: b.lift, k: 3, say: 'Take the lift up to the heart.' }; continue; }
      if (ph.core.st === 'carry') { out[id] = { why: 'carry', x: C.heart + (id === ped ? -40 : 40), hold: 'act', say: 'Grab the heart: hold ' + ironKey(id, 'act') + '!' }; continue; }
      out[id] = id === ped ? { why: 'pedal', x: C.pedal, say: 'Stand on the pedal. Jump when it glows!' } : { why: 'nut', x: C.nut, hold: 'act', say: 'Unscrew the nut: hold ' + ironKey(id, 'act') + '.' };
    }
    return out;
  }
  // the rider of this leg: whoever is aboard, else the one the jobs say
  const rider = c.mode !== 'board' && c.rider != null ? c.rider : ph.leg % 2 === 0 ? 1 - ph.first : ph.first, ctrl = 1 - rider;
  const g = ironHeartLeg(ph.leg), b = ironHeartBooth(ph.leg);
  const need = ironHeartNeed(st);
  const cl = ironHeartLevelOf(st, G.players[ctrl]);
  if (cl < ph.leg) { const lb = ironHeartBooth(cl); out[ctrl] = { why: 'lift', x: lb.lift, k: cl, say: 'Ride the lift up to booth ' + (ph.leg + 1) + '.' }; }
  else out[ctrl] = { why: 'ctrl', x: b.lever, k: ph.leg, need, hold: 'act', say: 'Hold ' + ironKey(ctrl, 'act') + ' + up / down: pick the rail.' };
  const rp = G.players[rider];
  if (c.mode !== 'board' && ph.aboard[rider]) out[rider] = { why: 'ride', x: c.x, say: ph.lever[ph.leg] !== need ? 'Wrong rail! Switch the lever!' : 'Hold on. Jump the pendulum!' };
  else if (ironHeartLevelOf(st, rp) < ph.leg) { const rl = ironHeartLevelOf(st, rp), lb = ironHeartBooth(rl); out[rider] = { why: 'lift', x: lb.lift, k: rl, say: 'Ride the lift up.' }; }
  else out[rider] = { why: 'board', x: g.xd, say: c.mode === 'board' ? 'Step onto the carriage.' : 'Wait for the carriage.' };
  return out;
}
// the rail the next junction needs
function ironHeartNeed(st) {
  const ph = st.ph, c = ph.car, g = ironHeartLeg(Math.min(3, ph.leg));
  return c.mode === 'run' && c.jDone >= 1 ? g.L.j2 : g.L.j1;
}
function ironHeartHints(st) {
  const ph = st.ph, P = ironHeartPlan(st);
  for (const id of [0, 1]) {
    const s = P[id] && P[id].say;
    if (s && ph['said' + id] !== s) { ph['said' + id] = s; ironHint(st, id, s, { life: 3, cpu: '' }); }
    if (!s) ph['said' + id] = null;
  }
}

/* --- drawing (dark paper) --- */
function ironHeartDrawBack(st) {
  const ph = st.ph, K = IRONHEART, cy = st.cam.y;
  ironScreen(st, () => SKETCH.paper(ctx, 'dark'));
  for (let k = 0; k < 4; k++) { const y = 60 - 540 * (k + 1); if (y > cy + H || y + 540 < cy) continue; SKETCH.blit(ctx, IRON_ART.heartWall(k), 0, y); }
  // the big gears behind, turning a notch each tick
  const notch = ph.tickN + Math.min(1, ph.tickT / 0.25);
  for (const [x, y, r, n, s] of [[120, -300, 120, 22, 1], [840, -620, 70, 14, -1], [700, -980, 120, 22, 1], [160, -1300, 70, 14, -1], [620, -1680, 120, 22, -1], [860, -1200, 46, 10, 1], [60, -820, 46, 10, -1]]) {
    if (y + r < cy || y - r > cy + H) continue;
    SKETCH.blit(ctx, IRON_ART.gear(r, n), x, y, { rot: s * notch * (Math.PI * 2 / n), alpha: 0.75 });
  }
  for (let k = 0; k < 4; k++) { const g = ironHeartLeg(k); if (g.y0 - 420 > cy + H || g.y0 + 60 < cy) continue; SKETCH.blit(ctx, IRON_ART.heartRails(k), 0, g.y0 - 480); }
}
function ironHeartDraw(st) {
  const ph = st.ph, K = IRONHEART, d = SKETCH.live(ctx, 6250, SKETCH.boil()), cy = st.cam.y, c = ph.car;
  d.dark = true;
  // catwalks, booths, lifts
  for (let k = 0; k <= 4; k++) {
    const y = -K.lvl * k;
    if (y < cy - 40 || y > cy + H + 40) continue;
    if (k > 0) SKETCH.blit(ctx, IRON_ART.heartCatwalk(), 0, y);
    if (k < 4) ironHeartDrawBooth(st, d, k);
  }
  for (const l of ph.lifts) {
    if (l.base < cy - 40 || l.base - K.lvl > cy + H) continue;
    d.stroke([[l.x - 26, l.base - K.lvl - 60], [l.x - 26, l.y]], { w: 1.2, col: '#efe8d8', sh: 0, alpha: 0.7 });
    d.stroke([[l.x + 26, l.base - K.lvl - 60], [l.x + 26, l.y]], { w: 1.2, col: '#efe8d8', sh: 0, alpha: 0.7 });
    SKETCH.blit(ctx, IRON_ART.chainLift(), l.x, l.y);
    if (ph.leg > l.k && l.st === 'down') d.word('UP', l.x, l.y - 40, 12, { align: 'center', col: IRON_P.core, w: 1.8 });
  }
  // the next junction's signal: an arrow to the rail the lever picks (gold: the right one glows)
  if (ph.leg < 4) ironHeartDrawSignals(st, d);
  // pendulums
  for (let k = 1; k < 4; k++) {
    const q = ironHeartPend(st, k);
    if (q.py > cy + H || q.by < cy - 40) continue;
    d.stroke([[q.px, q.py], [q.bx, q.by]], { w: 2.4, col: '#efe8d8', sh: 0 });
    d.ellipse(q.px, q.py, 5, 5, { fill: IRON_P.ironLight, w: 1.4, col: '#efe8d8' });
    SKETCH.blit(ctx, IRON_ART.pendulumBob(), q.bx, q.by, { rot: -q.a });
  }
  // crusher jaws on the crusher rails (slam when the carriage gets there)
  for (let k = 0; k < 4; k++) {
    const g = ironHeartLeg(k);
    if (g.y0 - 420 > cy + H || g.y0 + 60 < cy) continue;
    for (const [j, r] of [[1, g.L.c1], [2, g.L.c2]]) {
      const x = (j === 1 ? g.xd : g.j2x) + 170 * g.dir, y = g.rows[r];
      const A = ph.crushAnim, hit = A && Math.abs(A.x - x) < 4 && Math.abs(A.y - y) < 4 ? Math.max(0, 1 - Math.abs(A.t - 0.15) / 0.5) : 0;
      const shut = Math.min(1, hit * 1.6), shake = hit > 0.5 ? (Math.random() - 0.5) * 2 : 0;
      SKETCH.blit(ctx, IRON_ART.crusherJaw(), x + shake, y - 108 + shut * 26);   // a press from above
      if (hit > 0.4) ironWordOnce(st, 'KRUNCH', x, y - 60);
    }
  }
  if (ph.crushAnim) { ph.crushAnim.t += 1 / 60; if (ph.crushAnim.t > 0.8) ph.crushAnim = null; }
  // the carriage
  SKETCH.blit(ctx, IRON_ART.carriage(), c.x, c.y);
  if (c.mode === 'back') d.speed(c.x, c.y - 20, 0, 0, 3, { spread: 30, w: 1, col: '#efe8d8', alpha: 0.6 });
  // the core room
  ironHeartDrawCore(st, d);
}
function ironWordOnce(st, t, x, y) { const ph = st.ph; if (ph.wordAt === ph.crushAnim) return; ph.wordAt = ph.crushAnim; ironWord(st, t + '!', x, y, 24, { life: 0.9, rise: 14 }); }
function ironHeartDrawBooth(st, d, k) {
  const ph = st.ph, b = ironHeartBooth(k), lv = ph.lever[k];
  SKETCH.blit(ctx, IRON_ART.signalBooth(b.left ? 1 : -1), b.lever, b.y);
  // the lever: a long handle in a notched quadrant, top / middle / bottom
  const a = [-0.75, 0, 0.75][lv], sd = b.left ? 1 : -1, hx = b.lever + 18 * sd, hy = b.y - 30;
  d.stroke([[hx, hy], [hx + sd * Math.cos(a) * 36, hy + Math.sin(a) * 36]], { w: 3.2, col: '#efe8d8', sh: 0 });
  d.ellipse(hx + sd * Math.cos(a) * 38, hy + Math.sin(a) * 38, 5, 5, { fill: IRON_P.rust, w: 1.4, col: '#efe8d8' });
  // three signal lamps on the booth roof: the lit one is the rail picked
  for (let r = 0; r < 3; r++) {
    const lx = b.lever + (b.left ? -30 : 30), ly = b.y - 168 + r * 18, on = r === lv;
    if (on) SKETCH.glow(ctx, lx, ly, 22, '255,200,90', 0.45);
    d.ellipse(lx, ly, 6, 6, { fill: on ? IRON_P.core : '#3a332f', w: 1.3, col: '#efe8d8' });
  }
  if (k === ph.leg && ph.leg < 4) d.word(String(k + 1), b.lever + (b.left ? 30 : -30), b.y - 156, 14, { align: 'center', col: '#efe8d8', w: 2 });
}
function ironHeartDrawSignals(st, d) {
  const ph = st.ph, c = ph.car, g = ironHeartLeg(ph.leg), need = ironHeartNeed(st), lv = ph.lever[ph.leg];
  const past1 = c.mode === 'run' && c.jDone >= 1;
  const jx = past1 ? g.j2x : g.xd, jy = past1 ? g.rows[g.L.j1] : g.rows[1];
  // the rail the lever picks out of the next junction, lit along its whole length (where it goes is for the
  // controller to read: a crusher, an END, or on)
  const r = lv, jx2 = g.j2x, endX = past1 ? (r === g.L.j2 ? g.xe : jx2 + 170 * g.dir) : (r === g.L.j1 ? jx2 : g.xd + 170 * g.dir);
  const pts = [[jx, jy], [jx, g.rows[r]], [endX, g.rows[r]]];
  if (past1 && r === g.L.j2) pts.push([g.xe, g.y0 - IRONHEART.lvl]);
  const lift = 36, pulse = 0.55 + 0.25 * Math.sin(ph.t * 6);
  ctx.save(); ctx.globalAlpha = pulse;
  d.stroke(pts.map(([x, y]) => [x, y + lift]), { w: 7, col: 'rgba(244,198,60,0.55)', sh: 0, p: [1, 1, 1] });
  ctx.restore();
  d.stroke(pts.map(([x, y]) => [x, y + lift]), { w: 2, col: IRON_P.coreHot, sh: 0 });
  const dir = g.dir, ty = g.rows[r] + lift;
  d.stroke([[jx + 30 * dir, ty - 9], [jx + 44 * dir, ty], [jx + 30 * dir, ty + 9]], { w: 3, col: IRON_P.coreHot, sh: 0 });
  if (ironHeartGold(st)) { const gy = g.rows[need]; SKETCH.glow(ctx, jx + 40 * dir, gy, 40, '255,210,80', 0.55); d.word('THIS ONE', jx + 70 * dir, gy - 10, 11, { align: dir > 0 ? 'left' : 'right', col: IRON_P.core, w: 1.6 }); }
}
function ironHeartDrawCore(st, d) {
  const ph = st.ph, K = IRONHEART, C = K.core, c = ph.core, y4 = -K.lvl * 4, cy = st.cam.y;
  if (y4 + 60 < cy || y4 - 480 > cy + H) return;
  // the heart hangs on its spindle; when it stops it drops to the floor
  const drop = c.st === 'carry' || c.st === 'lift' ? c.heartY : 0, lift = c.lift || 0;
  const hy = y4 - 230 + drop * 150 - lift * 160;
  if (!drop) d.stroke([[C.heart, y4 - 480], [C.heart, hy - 80]], { w: 6, col: '#6b7d70', sh: 0 });
  const beat = c.st === 'on' ? 1 + 0.04 * Math.max(0, 1 - ph.tickT * 4) : 1;
  SKETCH.glow(ctx, C.heart, hy, 140, '255,170,80', c.st === 'carry' || c.st === 'lift' ? 0.2 : 0.38);
  // the spindle on down from the heart's tip to the nut at hero height (drawn first: the heart sits over it)
  if (!drop) {
    d.stroke([[C.nut, hy + 80], [C.nut, y4 - 34]], { w: 6, col: '#6b7d70', sh: 0 });
    const ny = y4 - 52 + Math.min(1, c.prog / C.need) * 14, spin = c.prog * 4;
    d.shape([[C.nut - 16, ny - 8], [C.nut + 16, ny - 8], [C.nut + 16, ny + 8], [C.nut - 16, ny + 8]], { fill: IRON_P.ochreDeep, w: 1.8, corner: 30, col: '#efe8d8' });
    for (let i = 0; i < 6; i++) { const x = C.nut + Math.cos(spin + i * Math.PI / 3) * 16; if (Math.sin(spin + i * Math.PI / 3) > 0) d.line(x, ny - 8, x, ny + 8, { w: 1.2, col: '#efe8d8', ov: 0 }); }
    const k = c.prog / C.need;
    if (k > 0) d.stroke(SKETCH.ell(C.nut + 34, ny - 30, 13, 13, 24, 0, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2), { w: 4, col: IRON_P.core, curve: true, sh: 0 });
    d.word('NUT', C.nut - 40, ny + 4, 10, { align: 'center', col: '#efe8d8', w: 1.4 });
  }
  SKETCH.blit(ctx, IRON_ART.gearHeart(), C.heart, hy, { sx: beat, sy: beat, alpha: 1 - lift * 0.6 });
  // the escapement pedal, and its linkage rod up to the heart's escape wheel
  const up = ph.pedal.up > 0 ? -0.35 : 0;
  if (!drop) { d.stroke([[C.pedal + 30, y4 - 14 + (up ? -12 : 0)], [C.pedal + 90, y4 - 120], [C.heart - 96, hy + 10]], { w: 3, col: '#8fa3ad', sh: 0, curve: true }); d.ellipse(C.pedal + 90, y4 - 120, 4, 4, { fill: IRON_P.ironLight, w: 1.2, col: '#efe8d8' }); }
  SKETCH.blit(ctx, IRON_ART.escapePedal(), C.pedal, y4 - 4, { rot: up });
  if (c.tell) { SKETCH.glow(ctx, C.pedal, y4 - 8, 50, '255,190,80', 0.5); d.word('HUP!', C.pedal, y4 - 70, 16, { align: 'center', col: IRON_P.core, w: 2 }); }
}
function ironHeartDrawTop(st) {
  const ph = st.ph;
  if (ph.core.st !== 'lift') ironScreen(st, () => SKETCH.gloom(ctx, 480, 300, 380, 900, '18,14,30', 0.22));
}

IRON_PHASES.heart = {
  setup(st, L) { ironHeartSetup(st, L); },
  wait(st, dt) { const ph = st.ph; if (ph.prep && ph.prep.length) ph.prep.shift()(); ironCoast(st, dt, ph.solids); },
  step(st, dt) { const ph = st.ph; if (ph.prep && ph.prep.length) ph.prep.shift()(); ironHeartStep(st, dt); },
  plan(st) { return ironHeartPlan(st); },
  busy(st) { return st.ph.core.st === 'lift'; },
  labels() { return ['route', 'route']; },
  hudText(st) {
    const ph = st.ph;
    if (ph.leg >= 4) return ph.core.st === 'carry' ? 'Carry the heart out together' : 'The gear heart: pedal and nut';
    return 'Booth ' + (ph.leg + 1) + ' of 4  ·  Rail: ' + ['top', 'middle', 'bottom'][ph.lever[ph.leg]];
  },
  drawBack(st) { ironHeartDrawBack(st); },
  draw(st) { ironHeartDraw(st); },
  drawTop(st) { ironHeartDrawTop(st); },
  music() { return { song: 'ironworks', amb: 'ironBelly' }; },
  stat(st) { const s = st.stats.heart; return s ? { label: 'Wrong rails', value: (s.crushes || 0) + (s.deads || 0) } : null; },
  leave() { for (const k of ['iron:heart', 'iron:booth', 'iron:carriage', 'iron:lift', 'iron:gear', 'iron:pendulum', 'iron:gearheart', 'iron:pedal', 'iron:crusher']) SKETCH.forget(k); },
};

/* --- sounds --- */
Sfx.extra.ironheartTick = function () { this.tone(1800, 0.03, 'square', 0.02); this.noise(0.03, { type: 'highpass', f: 4000, vol: 0.015 }); };
Sfx.extra.ironheartTock = function () { this.tone(1200, 0.04, 'square', 0.02); this.noise(0.04, { type: 'bandpass', f: 1500, vol: 0.015 }); };
Sfx.extra.ironheartLeverNotch = function () { this.tone(300, 0.06, 'square', 0.03, 220); this.noise(0.05, { type: 'bandpass', f: 900, vol: 0.02 }); };
Sfx.extra.ironheartPlatformRoll = function () { this.noise(0.4, { type: 'lowpass', f: 500, to: 300, vol: 0.03 }); this.tone(90, 0.3, 'triangle', 0.03); };
Sfx.extra.ironheartJunctionClack = function () { this.tone(500, 0.04, 'square', 0.03, 300); this.tone(380, 0.04, 'square', 0.025, 260, 0.07); };
Sfx.extra.ironheartCrusher = function () { this.noise(0.4, { type: 'lowpass', f: 900, to: 200, vol: 0.09 }); this.tone(70, 0.4, 'sine', 0.09, 40); };
Sfx.extra.ironheartReverseWhirr = function () { this.tone(900, 0.6, 'sawtooth', 0.015, 300); };
Sfx.extra.ironheartPedalBuck = function () { this.tone(140, 0.15, 'square', 0.05, 260); this.noise(0.12, { type: 'bandpass', f: 700, vol: 0.03 }); };
Sfx.extra.ironheartNutSpin = function () { for (let k = 0; k < 3; k++) this.tone(700 + k * 60, 0.03, 'square', 0.015, null, k * 0.07); };
Sfx.extra.ironheartHeartStop = function () { this.tone(1200, 0.06, 'square', 0.02); this.tone(900, 0.08, 'square', 0.02, null, 0.35); this.tone(600, 0.12, 'square', 0.02, null, 0.9); };

ironRoom('heart', {
  act: { label: 'route', labels: ['route', 'route'] },
  tip: IRON_PARTS.heart.tip,
});
