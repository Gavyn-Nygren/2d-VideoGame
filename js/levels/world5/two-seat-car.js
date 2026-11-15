/* Pip & Bo - Level 5-1 Two-Seat Car (team). */
'use strict';

/* ===== 5-1 Two-Seat Car (mode 'car', World 5 Road Trip, teamwork) =====
   A top-down driving level: Pip and Bo share one toy car. One player steers ("point the nose" where to go), the
   other does gas and brake. Seats swap every room, and once more on room 4's purple SWAP pad.
   The mode owns the whole tick (def.ownStep), parses the raw room maps itself, paints its own ground (cached), and
   hides both players (they ride in the car). Every top-level name here starts with car / CAR; sounds are Sfx.extra.car*.
   Map chars: # hedge  . grass  = road  w water  s mud  r railing  1 2 car start  f checkpoint flag  p parking box
              ! cone  > < A v ramps  z zoom pad  S swap pad  t rails  n train tunnel  g crossing gate */
const CAR = {
  len: 48, wid: 30, r: 13, off: 10,     // body 48x30 px; collision = 2 circles r=13 at +-10 px along the heading
  vMax: 210, vRev: 90,                  // px/s top speed forward / backward (road)
  acc: 300, brake: 600, drag: 150,      // px/s^2: gas, brake, coasting
  revDrag: 300,                         // px/s^2: coasting while reversing (let go = quick stop)
  revDelay: 0.6,                        // s stopped with brake held before reversing (> parkHold)
  turn: 2.7, vTurn: 80,                 // rad/s nose turn rate at |v| >= vTurn; scales linearly below
  pivot: 0.35,                          // min turn-rate fraction while gas is held or reversing
  steerMode: 'point',                   // 'point' | 'wheel'
  grass: 0.6, mud: 0.4,                 // speed and accel multipliers on grass / mud
  bumpMin: 90, bumpKeep: 0.2, scrape: 200,
  rampVMin: 40, rampAir: 1.0, rampCos: 0.5, rampMinAir: 0.3, rampStraight: 0.7, rampH: 26, rampAssist: 3,
  boostV: 340, boostHold: 0.8, boostDecay: 0.6,
  parkV: 12, parkHold: 0.4, parkInset: 4, parkCelebrate: 1.8, perfectT: 3,
  parkAssist: 3,                        // after this many drives through the box without parking, the box brakes the car itself
  sinkT: 0.6, backT: 1.0,
  flagR: 45,
  coneR: 7, coneSlow: 0.9, coneFric: 500,
  duckR: 8, duckSpeed: 28, duckHurry: 3, duckHurryT: 1.5, duckPause: 3, duckGap: 16, duckGiveUp: 1.0, duckWaitMax: 6, honkR: 200, honkCool: 0.3,
  towWin: 8, towPress: 4, towDist: 30, stuckHint: 4, towBox: 40, // the tow truck never drops the car within towBox px of the box
  tootGap: 2.5, critterR: 300, critterGap: 1.5, quackGap: 0.8,  // honk replies: train toot at most every tootGap s; critter only within critterR
  wedge: 2,                             // px: a turn that leaves the car deeper than this in a hedge is undone
  idleHint: 3,                          // s with the car still and nobody pressing anything: the key hint pill shows again
  groundScale: 4,                       // max backing scale of the cached ground canvas (x 960x540); below that it matches the canvas 1:1 (a scaled blit every frame cost more than the build)
  hintT: 8,                             // s the key-hint pill shows at each room start (and after the swap pad)
  introLock: 0.6,                       // inputs are ignored while the room card shows (G.introT above this)
};
const CAR_RAMP = { '>': [1, 0], '<': [-1, 0], A: [0, -1], v: [0, 1] };
const CAR_ROAD = '=><AvzStg';          // road surfaces (after parsing, 1 2 f p ! are road '=' too)
const carWrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a <= -Math.PI) a += 2 * Math.PI; return a; };
const carRand = () => MODES.car.rand();
function carInBox(st, x, y) { const P = st.park, I = CAR.parkInset; return x > P.x0 + I && x < P.x1 - I && y > P.y0 + I && y < P.y1 - I; }
function carTile(st, tx, ty) { return tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS ? '#' : st.grid[ty][tx]; }
function carAt(st, x, y) { return carTile(st, Math.floor(x / T), Math.floor(y / T)); }
function carSolid(st, ch) { return ch === '#' || ch === 'n' || ch === 'r' || (ch === 'g' && st.gatesClosed); }
function carIsRoad(st, tx, ty) { return CAR_ROAD.includes(carTile(st, tx, ty)); }
function carCircleRect(cx, cy, r, x, y, w, h) { const qx = clamp(cx, x, x + w), qy = clamp(cy, y, y + h); return (cx - qx) ** 2 + (cy - qy) ** 2 < r * r; }
function carCircles(c) { const ux = Math.cos(c.a), uy = Math.sin(c.a); return [[c.x + ux * CAR.off, c.y + uy * CAR.off], [c.x - ux * CAR.off, c.y - uy * CAR.off]]; }
// which device a player uses: 'pad' (controller), 'touch' or 'kb'
function carOnPad(id) { return Pads.kind === 'pad' && !!padFor(padSlots(), id); }
// B brakes on a controller, as in kart games (Xbox B, PlayStation ○; not on Switch pads, where B is the bottom "go"
// button). The core maps A and B both to jump, so this reads the pad's own state (Pads.prev = this frame's readPad).
function carPadB(id) { return carOnPad(id) && Pads.family !== 'nintendo'; }
function carPadState(id) { const sl = padFor(padSlots(), id); return (sl && Pads.prev[sl.ix]) || null; }
function carHow(id) { return actKey(id); } // (each player's own device: js/controls.js)
// the key hint for a seat: 'steer' or 'pedals'
function carKeys(id, role) {
  if (typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id)) return role === 'steer' ? 'the computer steers' : 'the computer does gas and brake';
  const h = carHow(id);
  if (role === 'steer') return h === 'pad' ? 'stick: point the way' : h === 'touch' ? '◀ ▶ ▲ ▼ point the way' : id === 0 ? 'W A S D point the way' : '← ↑ → ↓ point the way';
  return h === 'pad' ? glyph('a') + ' go · ' + (carPadB(id) ? glyph('b') : 'stick ↓') + ' brake' : h === 'touch' ? '▲ go · ▼ brake' : id === 0 ? 'W go · S brake' : '↑ go · ↓ brake';
}
// one key name: 'gas' or 'brake'
function carKey(id, what) {
  const h = carHow(id);
  if (what === 'gas') return h === 'pad' ? glyph('a') : h === 'touch' ? '▲' : id === 0 ? 'W' : '↑';
  return h === 'pad' ? (carPadB(id) ? glyph('b') : 'stick ↓') : h === 'touch' ? '▼' : id === 0 ? 'S' : '↓';
}
function carMsg(st, text, col, t = 1.4, big = false) { st.msg = { text, col: col || C.paper, t, max: t, big }; }
function carPart(x, y, vx, vy, life, col, size, grav = 0) {
  G.particles.push({ x, y, vx, vy, life, max: life, col, size, grav, kind: 'dot' });
}
function carRumble(strong, weak, ms, who) { if (who === 0 || who === 1) rumble(who, strong, weak, ms); else { rumble(0, strong, weak, ms); rumble(1, strong, weak, ms); } }

/* ----- room setup ----- */
// 1-player mode: a room-card tip or road sign that gives the computer's seat its keys ("Bo: hold ▲ to go") says
// what the computer does instead (def is this room's own copy, roomDef in main.js; the signs array is shared, so
// it gets a new one)
function carSoloText(def) {
  if (typeof cpuSolo !== 'function' || !cpuSolo()) return;
  const id = cpuOn(0) ? 0 : 1, nm = NAMES[id], job = (def.steer | 0) === id ? 'steers' : 'does gas and brake';
  if (def.signs) def.signs = def.signs.map(sg => (sg.text.startsWith(nm + ':') ? Object.assign({}, sg, { text: nm + ' (computer) ' + job }) : sg));
  if (def.tip) def.tip = def.tip.replace(new RegExp(nm + '( steers)?: [^.!]*[.!]'), nm + ' (computer) ' + job + '.');
}
function carRoom(st, L, k) {
  const def = L.def, map = def.map;
  carSoloText(def);
  Object.assign(st, {
    k, n: def.roomCount || 1, def, grid: [], cones: [], flags: [], ducks: [], park: null, start: null,
    rampGroup: [], rampGroups: [], rampFails: {}, tr: null, gatesClosed: false, gateA: 0,
    steer: def.steer | 0, lock: [true, true], lockT: [0, 0], phase: 'drive', parkT2: 0,
    swapUsed: false, swapT: 0, pulseT: 0, tagT: 0, t: 0, msg: null, hint: CAR.hintT, nudge: null, wrongShow: 0,
    honkCd: [0, 0], honkFx: [], rings: [], skids: [], tootBack: 0, tootAt: -99, quackAt: -99, turboMsg: false, idleT: 0,
    pedalIdle: 0, steerIdle: 0, steerBump: false, wrongT: 0, stuck: false, samp: [], sampT: 0, press: 0,
    lastHitT: -99, prevBrake: false, putT: 0, revBeepT: 0, exhT: 0, dirtT: 0, mudT: 0, sparkT: 0, thudCd: 0,
    groundCv: st.groundCv || null, groundKey: '', boxIn: false, boxMiss: 0, parkAssist: false,
  });
  // parse the raw map (the core's grid is blanked below, so its side-view tile pass draws nothing)
  const sp = [];
  let px0 = 99, py0 = 99, px1 = -1, py1 = -1;
  for (let y = 0; y < ROWS; y++) {
    const row = [];
    for (let x = 0; x < COLS; x++) {
      let ch = (map[y] && map[y][x]) || '#';
      const cx = x * T + T / 2, cy = y * T + T / 2;
      if (ch === '1' || ch === '2') { sp[ch === '1' ? 0 : 1] = [cx, cy]; ch = '='; }
      else if (ch === 'f') { st.flags.push({ x: cx, y: cy, on: false, t: 0 }); ch = '='; }
      else if (ch === 'p') { px0 = Math.min(px0, x); py0 = Math.min(py0, y); px1 = Math.max(px1, x); py1 = Math.max(py1, y); ch = '='; }
      else if (ch === '!') { st.cones.push({ x: cx, y: cy, vx: 0, vy: 0, hit: false, gone: false, rot: 0, spin: 0, slowT: 0, sinkT: 0 }); ch = '='; }
      row.push(ch);
    }
    st.grid.push(row);
  }
  st.park = px1 < 0 ? { x0: 0, y0: 0, x1: 0, y1: 0 } : { x0: px0 * T, y0: py0 * T, x1: (px1 + 1) * T, y1: (py1 + 1) * T };
  // ramp groups: 4-connected tiles of the same ramp char share one splash counter (turbo-ramp assist)
  st.rampGroup = st.grid.map(r => r.map(() => -1));
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const ch = st.grid[y][x];
    if (!CAR_RAMP[ch] || st.rampGroup[y][x] >= 0) continue;
    const gid = st.rampGroups.length, grp = { ch, dir: CAR_RAMP[ch], x0: x, y0: y, x1: x, y1: y, glow: 0 };
    const stack = [[x, y]]; st.rampGroup[y][x] = gid;
    while (stack.length) {
      const [cx, cy] = stack.pop();
      grp.x0 = Math.min(grp.x0, cx); grp.x1 = Math.max(grp.x1, cx); grp.y0 = Math.min(grp.y0, cy); grp.y1 = Math.max(grp.y1, cy);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS && st.grid[ny][nx] === ch && st.rampGroup[ny][nx] < 0) { st.rampGroup[ny][nx] = gid; stack.push([nx, ny]); }
      }
    }
    st.rampGroups.push(grp);
  }
  const a0 = (def.startDir || 0) * Math.PI / 180;
  const s0 = sp[0] || [3 * T, 3 * T], s1 = sp[1] || s0;
  st.start = { x: (s0[0] + s1[0]) / 2, y: (s0[1] + s1[1]) / 2, a: a0 };
  st.respawn = { ...st.start };
  st.car = carNewCar(st.start);
  st.path = (def.path || []).map(([x, y]) => [x * T + T / 2, y * T + T / 2]);
  for (const d of def.ducks || []) {
    const ax = d.from[0] * T + T / 2, ay = d.from[1] * T + T / 2, bx = d.to[0] * T + T / 2, by = d.to[1] * T + T / 2;
    st.ducks.push({ ax, ay, bx, by, len: Math.hypot(bx - ax, by - ay), n: d.n || 3, s: 0, dir: 1, pause: d.start || 0, ext: 0, hurry: 0, blockT: 0, turnNow: false, bubble: 0, hop: 0 });
  }
  st.critter = def.critter ? { kind: def.critter.kind, x: def.critter.x * T + T / 2, y: def.critter.y * T + T / 2, t: 0, at: -99 } : null;
  if (def.train) carTrainInit(st, def.train);
  st.prog = { x: st.car.x, y: st.car.y, t: 0, press: 0 };
  for (const row of L.grid) row.fill('.');
  // both players ride in the car: hide them from the core (no physics, kills, respawns or name tags)
  for (const p of G.players) Object.assign(p, { alive: false, respawnT: Infinity, vx: 0, vy: 0 });
  G.spawnPts = [];
  st.tagT = 0;
}
function carNewCar(s) {
  return { x: s.x, y: s.y, a: s.a, v: 0, vReal: 0, revT: 0, air: 0, airDur: 0, airV: 0, z: 0, boostT: 0, sink: 0, parkT: 0,
    lastTurn: 1, wheel: 0, w: 0, rampT: 9, lastRamp: -1, bumpT: 0, squash: 0, pop: 0.35, lean: 0 };
}

/* ----- the tick (def.ownStep: this is all of it) ----- */
function carStep(st, dt) {
  const ps = G.players, live = G.introT <= CAR.introLock;
  st.t += dt;
  for (const p of ps) p.pendingJump = false;
  carTimers(st, dt);
  // a seat change locks a player's controls until they have let go of every move button once
  for (let k = 0; k < 2; k++) if (st.lock[k]) {
    const i = ps[k].input;
    if (!(i.left || i.right || i.up || i.jump || i.down)) { st.lock[k] = false; st.lockT[k] = 0; }
    else if (live) st.lockT[k] += dt;
  }
  // honk (both players, any time after the room card)
  for (const p of ps) {
    st.honkCd[p.id] = Math.max(0, st.honkCd[p.id] - dt);
    if (p.pendingAct) { p.pendingAct = false; if (live && st.honkCd[p.id] <= 0) carHonk(st, p.id); }
  }
  if (!live) return;
  if (st.phase === 'parked') {
    st.parkT2 += dt;
    carTrain(st, dt); carDucks(st, dt); carConeSlide(st, dt);
    if (st.parkT2 >= CAR.parkCelebrate && st.k < st.n - 1) nextRoom();
    return;
  }
  const c = st.car, sk = st.steer, pk = 1 - sk;
  const I = k => (st.lock[k] ? NO_INPUT : ps[k].input);
  const si = I(sk), pi = I(pk);
  const steer = { l: !!si.left, r: !!si.right, u: !!(si.up || (si.jump && !carOnPad(sk))), d: !!si.down };
  const pb = pi.jump && carPadB(pk) ? carPadState(pk) : null; // B held on a pad = brake, not gas (A + B = brake only)
  const gas = !!(pi.up || (pi.jump && !(pb && pb.back && !pb.ok))), brake = !!(pi.down || (pb && pb.back));
  st.gas = gas; st.brake = brake; st.steerIn = steer;
  st.stats.steerT[sk] += dt;
  carTrain(st, dt);
  carDucks(st, dt);
  carConeSlide(st, dt);
  carCoach(st, dt, steer, gas, brake);
  if (c.sink > 0) {
    c.sink += dt;
    if (c.sink >= CAR.backT) carRespawn(st);
    return;
  }
  if (c.air > 0) { carFly(st, dt); return; }
  carDrive(st, dt, steer, gas, brake);
}
function carTimers(st, dt) {
  const c = st.car;
  if (st.msg) { st.msg.t -= dt; if (st.msg.t <= 0) st.msg = null; }
  st.hint = Math.max(0, st.hint - (G.introT <= CAR.introLock ? dt : 0));
  st.swapT = Math.max(0, st.swapT - dt); st.pulseT = Math.max(0, st.pulseT - dt); st.tagT = Math.max(0, st.tagT - dt);
  st.wrongShow = Math.max(0, st.wrongShow - dt); st.thudCd = Math.max(0, st.thudCd - dt);
  c.bumpT = Math.max(0, c.bumpT - dt); c.squash = Math.max(0, c.squash - dt * 4); c.pop = Math.max(0, c.pop - dt);
  for (const f of st.flags) if (f.on) f.t += dt;
  for (const g of st.rampGroups) g.glow += dt;
  for (let i = st.honkFx.length - 1; i >= 0; i--) { st.honkFx[i].t -= dt; if (st.honkFx[i].t <= 0) st.honkFx.splice(i, 1); }
  for (let i = st.rings.length - 1; i >= 0; i--) { st.rings[i].t += dt; if (st.rings[i].t > 0.7) st.rings.splice(i, 1); }
  if (st.critter) st.critter.t = Math.max(0, st.critter.t - dt);
  if (st.tootBack > 0) { st.tootBack -= dt; if (st.tootBack <= 0) { Sfx.play('carToot'); st.tr && (st.tr.tootFx = 0.8); } }
  if (st.skids.length && st.t - st.skids[0].t > 3) st.skids.shift();
}

/* ----- driving on the ground ----- */
function carDrive(st, dt, steer, gas, brake) {
  const c = st.car, ch = carAt(st, c.x, c.y), a0 = c.a, pen0 = carPen(st, c);
  const mul = ch === '.' ? CAR.grass : ch === 's' ? CAR.mud : 1;
  let cap = CAR.vMax;
  if (c.boostT > 0) {
    c.boostT -= dt;
    const k = c.boostT > CAR.boostDecay ? 1 : Math.max(0, c.boostT / CAR.boostDecay);
    cap = CAR.vMax + (CAR.boostV - CAR.vMax) * k;
  }
  cap *= mul;
  // pedals
  let v = c.v; const v0 = v;
  if (st.parkAssist && carInBox(st, c.x, c.y)) { v = v > 0 ? Math.max(0, v - CAR.brake * dt) : Math.min(0, v + CAR.brake * dt); c.revT = 0; } // park assist: the box stops the car
  else if (brake && gas) { v = v > 0 ? Math.max(0, v - CAR.brake * dt) : Math.min(0, v + CAR.brake * dt); c.revT = 0; }
  else if (brake) {
    if (v > 0) { v = Math.max(0, v - CAR.brake * dt); c.revT = 0; }
    else { c.revT += dt; if (c.revT >= CAR.revDelay || v < 0) v = Math.max(-CAR.vRev * mul, v - CAR.acc * mul * dt); }
  } else if (gas) {
    c.revT = 0;
    if (v < 0) v = Math.min(0, v + CAR.brake * dt);
    else if (v < cap) v = Math.min(cap, v + CAR.acc * mul * dt);
  } else { c.revT = 0; v = v > 0 ? Math.max(0, v - CAR.drag * dt) : Math.min(0, v + CAR.revDrag * dt); }
  if (v > cap) v = Math.max(cap, v - 2 * CAR.drag * dt);
  if (v < -CAR.vRev * mul) v = Math.min(-CAR.vRev * mul, v + 2 * CAR.drag * dt);
  c.v = v;
  c.lean = approach(c.lean, gas ? 2 : brake ? -2 : 0, dt * 20);
  if (brake && !st.prevBrake && v0 > 120) Sfx.play('carSqueak');
  st.prevBrake = brake;
  // steering: point the nose (or 'wheel': left/right turn it)
  const sx = (steer.r ? 1 : 0) - (steer.l ? 1 : 0), sy = (steer.d ? 1 : 0) - (steer.u ? 1 : 0);
  const w = CAR.turn * Math.min(1, Math.max(Math.abs(v) / CAR.vTurn, gas || v < 0 ? CAR.pivot : 0));
  let wheelT = 0; c.w = 0;
  if (CAR.steerMode === 'wheel') {
    if (sx) { c.a = carWrap(c.a + sx * w * dt); c.w = sx * w; wheelT = sx * 0.5; }
  } else if (sx || sy) {
    let d = carWrap(Math.atan2(sy, sx) - c.a);
    if (Math.abs(d) > Math.PI - 0.01) d = c.lastTurn * Math.PI;
    const da = clamp(d, -w * dt, w * dt);
    c.a = carWrap(c.a + da); c.w = da / dt;
    if (Math.abs(d) > 0.01) c.lastTurn = Math.sign(d);
    wheelT = clamp(d, -0.5, 0.5);
  }
  c.wheel = approach(c.wheel, wheelT, dt * 5);
  // move in small steps, pushing out of hedges after each
  const ox = c.x, oy = c.y;
  c.scrape = false;
  const n = Math.max(1, Math.ceil(Math.abs(v) * dt / 4));
  for (let i = 0; i < n; i++) { c.x += Math.cos(c.a) * c.v * dt / n; c.y += Math.sin(c.a) * c.v * dt / n; carCollide(st, c); }
  // a turn between two close hedges can't be pushed out: undo the turn (the car can still go straight or back up)
  if (c.a !== a0) {
    const pen1 = carPen(st, c);
    if (pen1 > CAR.wedge && pen1 > pen0 + 0.05) {
      c.a = a0; c.w = 0; carCollide(st, c); carCollide(st, c);
      if (carPen(st, c) > Math.max(CAR.wedge, pen0 + 0.05)) { c.x = ox; c.y = oy; }
    }
  }
  if (c.scrape) c.v = c.v > 0 ? Math.max(0, c.v - CAR.scrape * dt) : Math.min(0, c.v + CAR.scrape * dt);
  carConeHits(st);
  carDuckPush(st);
  c.vReal = Math.hypot(c.x - ox, c.y - oy) / dt;
  // what the car's centre is on
  const tx = Math.floor(c.x / T), ty = Math.floor(c.y / T), ch2 = carTile(st, tx, ty);
  if (CAR_RAMP[ch2]) { c.rampT = 0; c.lastRamp = st.rampGroup[ty][tx]; } else c.rampT += dt;
  if (ch2 === 'w') { carSplash(st, c.rampT < 1.5 ? c.lastRamp : -1); return; }
  if (CAR_RAMP[ch2] && c.v >= CAR.rampVMin) {
    const [rx, ry] = CAR_RAMP[ch2];
    if (Math.cos(c.a) * rx + Math.sin(c.a) * ry > CAR.rampCos) { carLaunch(st, st.rampGroup[ty][tx], rx, ry); return; }
  }
  if (ch2 === 'z' && c.v > 20 && c.boostT <= CAR.boostHold + CAR.boostDecay - 0.3) {
    c.boostT = CAR.boostHold + CAR.boostDecay; c.v = CAR.boostV;
    Sfx.play('carZoom'); carRumble(0.2, 0.6, 300); carMsg(st, 'Zoom!', C.gold, 1.0);
  }
  if (ch2 === 'S' && !st.swapUsed) carSwap(st);
  for (const f of st.flags) if (!f.on && Math.hypot(c.x - f.x, c.y - f.y) < CAR.flagR) {
    f.on = true; f.t = 0;
    st.respawn = { x: f.x, y: f.y, a: carPathHeading(st, f.x, f.y) };
    Sfx.play('flag'); burst(f.x, f.y - 14, C.grass, 12);
  }
  // stuck help: a "back up" hint after stuckHint s, the tow truck after towWin s
  st.press += gas || brake ? dt : 0;
  st.sampT -= dt;
  if (st.sampT <= 0) { st.sampT = 0.25; st.samp.push({ x: c.x, y: c.y, press: st.press }); if (st.samp.length > CAR.stuckHint * 4 + 1) st.samp.shift(); }
  const old = st.samp[0];
  st.stuck = st.samp.length > CAR.stuckHint * 4 && Math.hypot(c.x - old.x, c.y - old.y) < 30 && st.press - old.press >= 2 && !carWaitReason(st);
  if (gas || brake) st.prog.press += dt;
  if (st.t - st.prog.t >= CAR.towWin) {
    if (Math.hypot(c.x - st.prog.x, c.y - st.prog.y) < CAR.towDist && st.prog.press >= CAR.towPress && !carWaitReason(st)) carTow(st); // not while waiting for the train or ducks
    st.prog = { x: c.x, y: c.y, t: st.t, press: 0 };
  }
  // parking: centre in the box, (nearly) still for parkHold s
  const inBox = carInBox(st, c.x, c.y);
  if (inBox && c.vReal < CAR.parkV) {
    c.parkT += dt;
    if (c.parkT >= CAR.parkHold) { carParked(st); return; }
  } else c.parkT = 0;
  // drove through the box without stopping: after parkAssist misses the box helps (like the turbo ramp after splashes)
  if (st.boxIn && !inBox && ++st.boxMiss === CAR.parkAssist) { st.parkAssist = true; carMsg(st, 'Easy park! The box stops the car', C.gold, 2.2); Sfx.play('ring'); }
  st.boxIn = inBox;
  carDriveFx(st, dt, gas, brake, ch2);
}
// sounds and particles of a moving car
function carDriveFx(st, dt, gas, brake, ch) {
  const c = st.car, ux = Math.cos(c.a), uy = Math.sin(c.a), sp = Math.abs(c.v), k = Math.min(1, sp / CAR.vMax);
  st.putT -= dt;
  if ((gas || sp > 20) && st.putT <= 0) { Sfx.tone(55 + 70 * k, 0.06, 'triangle', 0.018 + 0.012 * k); st.putT = 0.17 - 0.09 * k; }
  st.revBeepT -= dt;
  if (c.v < -10 && st.revBeepT <= 0) { Sfx.play('carRevBeep'); st.revBeepT = 0.5; }
  const rx = c.x - ux * 24, ry = c.y - uy * 24;
  st.exhT -= dt;
  if (gas && st.exhT <= 0) { st.exhT = 0.12; carPart(rx + (carRand() - 0.5) * 4, ry + (carRand() - 0.5) * 4, -ux * 30 + (carRand() - 0.5) * 16, -uy * 30 + (carRand() - 0.5) * 16 - 8, 0.5, 'rgba(255,255,255,0.7)', 3 + carRand() * 2); }
  st.dirtT -= dt;
  if (ch === '.' && sp > 60 && st.dirtT <= 0) {
    st.dirtT = 0.05;
    for (const s of [-1, 1]) carPart(rx - uy * s * 12, ry + ux * s * 12, -ux * c.v * 0.3 + (carRand() - 0.5) * 50, -uy * c.v * 0.3 + (carRand() - 0.5) * 50, 0.35, 'rgba(85,173,128,0.8)', 2 + carRand() * 2);
  }
  st.mudT -= dt;
  if (ch === 's' && sp > 10) {
    if (st.dirtT <= 0) { st.dirtT = 0.06; for (const s of [-1, 1]) carPart(rx - uy * s * 12, ry + ux * s * 12, -ux * 40 + (carRand() - 0.5) * 70, -uy * 40 + (carRand() - 0.5) * 70, 0.45, 'rgba(138,90,44,0.9)', 2.5 + carRand() * 2.5); }
    if (st.mudT <= 0) { st.mudT = 0.3; carRumble(0.15, 0.15, 60, st.steer); }
  }
  if (c.boostT > 0) {
    st.sparkT -= dt;
    if (st.sparkT <= 0) { st.sparkT = 0.03; carPart(rx + (carRand() - 0.5) * 20, ry + (carRand() - 0.5) * 20, -ux * 60, -uy * 60, 0.4, C.gold, 2 + carRand() * 3); }
  }
  // skid marks while braking hard
  if (brake && c.v > 120) {
    const last = st.skids[st.skids.length - 1], px = -uy, py = ux;
    const seg = { t: st.t, a: [rx + px * 11, ry + py * 11, rx - px * 11, ry - py * 11] };
    if (last && st.t - last.t < 0.05) { seg.b = last.a; st.skids.push(seg); } else { seg.b = seg.a; st.skids.push(seg); }
    if (st.skids.length > 200) st.skids.shift();
  }
}
// push the car's two circles out of solid tiles; a head-on hit bounces (fast) or stops (slow), a graze slides
function carCollide(st, c) {
  const ux = Math.cos(c.a), uy = Math.sin(c.a);
  let nxS = 0, nyS = 0, hit = false;
  for (let pass = 0; pass < 2; pass++) for (const sgn of [1, -1]) {
    const qx0 = c.x + ux * CAR.off * sgn, qy0 = c.y + uy * CAR.off * sgn;
    const x0 = Math.floor((qx0 - CAR.r) / T), x1 = Math.floor((qx0 + CAR.r) / T), y0 = Math.floor((qy0 - CAR.r) / T), y1 = Math.floor((qy0 + CAR.r) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (!carSolid(st, carTile(st, tx, ty))) continue;
      const qx = c.x + ux * CAR.off * sgn, qy = c.y + uy * CAR.off * sgn;
      const px = clamp(qx, tx * T, tx * T + T), py = clamp(qy, ty * T, ty * T + T);
      const dx = qx - px, dy = qy - py;
      let d = Math.hypot(dx, dy), nx, ny;
      if (d >= CAR.r) continue;
      if (d > 1e-6) { nx = dx / d; ny = dy / d; } else { nx = -ux * sgn; ny = -uy * sgn; d = 0; }
      c.x += nx * (CAR.r - d); c.y += ny * (CAR.r - d);
      nxS += nx; nyS += ny; hit = true;
    }
  }
  if (!hit) return;
  const m = Math.hypot(nxS, nyS) || 1, nx = nxS / m, ny = nyS / m;
  const into = -(ux * nx + uy * ny) * (Math.sign(c.v) || 1);
  if (into <= 0) return;
  st.lastHitT = st.t;
  if (into > 0.6) {
    const sp = Math.abs(c.v);
    if (sp > CAR.bumpMin) { carBump(st, c, sp, 1); c.v = -c.v * CAR.bumpKeep; }
    else { if (sp > 40) carBump(st, c, sp, 0.5); c.v = 0; }
  } else c.scrape = true;
}
// how deep (px) the car's circles sit inside solid tiles (0 = clear)
function carPen(st, c) {
  let m = 0;
  for (const [qx, qy] of carCircles(c)) {
    const x0 = Math.floor((qx - CAR.r) / T), x1 = Math.floor((qx + CAR.r) / T), y0 = Math.floor((qy - CAR.r) / T), y1 = Math.floor((qy + CAR.r) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (!carSolid(st, carTile(st, tx, ty))) continue;
      const d = Math.hypot(qx - clamp(qx, tx * T, tx * T + T), qy - clamp(qy, ty * T, ty * T + T));
      if (d < CAR.r) m = Math.max(m, CAR.r - d);
    }
  }
  return m;
}
function carBump(st, c, sp, k) {
  st.steerBump = true;
  if (st.thudCd > 0) return;
  st.thudCd = 0.25;
  Sfx.play('carThud'); c.squash = k; c.bumpT = 0.3 * k + 0.05;
  if (k >= 1) carRumble(0.5, 0.4, 120); else carRumble(0.2, 0.25, 70);
  st.stats.bumps++;
  const fx = c.x + Math.cos(c.a) * 24 * Math.sign(c.v || 1), fy = c.y + Math.sin(c.a) * 24 * Math.sign(c.v || 1);
  for (let i = 0; i < (k >= 1 ? 6 : 3); i++) carPart(fx, fy, (carRand() - 0.5) * 120, (carRand() - 0.5) * 120, 0.45, i % 2 ? '#4fa36f' : '#3d8a5c', 2.5 + carRand() * 2.5);
}
// the direction of the room path segment nearest a point (checkpoint and tow headings)
function carPathHeading(st, x, y) {
  const p = carPathNearest(st, x, y);
  return p ? p.a : st.start.a;
}
function carPathNearest(st, x, y) {
  const pts = st.path;
  let best = null;
  for (let j = 0; j < pts.length - 1; j++) {
    const [ax, ay] = pts[j], [bx, by] = pts[j + 1], sx = bx - ax, sy = by - ay, L2 = sx * sx + sy * sy || 1;
    const t = clamp(((x - ax) * sx + (y - ay) * sy) / L2, 0, 1), px = ax + sx * t, py = ay + sy * t, d = Math.hypot(px - x, py - y);
    if (!best || d < best.d) best = { d, x: px, y: py, a: Math.atan2(sy, sx) };
  }
  return best;
}
function carSplash(st, grp) {
  const c = st.car;
  c.sink = 1e-6; c.v = 0; c.air = 0; c.z = 0; c.boostT = 0; c.parkT = 0;
  G.falls++; st.stats.splashes++;
  Sfx.play('splash'); carRumble(0.6, 0.6, 220);
  for (let i = 0; i < 14; i++) { const a = carRand() * Math.PI * 2, s = 60 + carRand() * 140; carPart(c.x, c.y, Math.cos(a) * s, Math.sin(a) * s, 0.6, i % 3 ? '#9fdcff' : '#ffffff', 2.5 + carRand() * 3); }
  st.rings.push({ x: c.x, y: c.y, t: 0 });
  carMsg(st, 'Splash!', '#9fdcff', 1.1);
  if (grp >= 0) {
    st.rampFails[grp] = (st.rampFails[grp] || 0) + 1;
    if (st.rampFails[grp] === CAR.rampAssist) { st.turboMsg = true; st.rampGroups[grp].glow = 0; }
  }
}
function carRespawn(st) {
  const c = st.car, r = st.respawn;
  Object.assign(c, carNewCar(r));
  // nothing sits on the respawn spot: push nearby cones aside
  for (const cn of st.cones) if (!cn.gone && Math.hypot(cn.x - r.x, cn.y - r.y) < 20) { const a = Math.atan2(cn.y - r.y, cn.x - r.x) || 1; cn.x += Math.cos(a) * 24; cn.y += Math.sin(a) * 24; }
  st.samp = []; st.prog = { x: c.x, y: c.y, t: st.t, press: 0 };
  burst(c.x, c.y, 'rgba(255,255,255,0.9)', 10);
  if (st.turboMsg) { st.turboMsg = false; carMsg(st, 'Turbo ramp!', C.gold, 1.8); Sfx.play('ring'); }
}
function carLaunch(st, grp, rx, ry) {
  const c = st.car, g = st.rampGroups[grp];
  if ((st.rampFails[grp] || 0) >= CAR.rampAssist) c.v = Math.max(c.v, CAR.vMax);
  c.lastRamp = grp; c.rampT = 0;
  c.a = carWrap(c.a + carWrap(Math.atan2(ry, rx) - c.a) * CAR.rampStraight);
  c.air = 1e-6; c.airV = c.v; c.airDur = Math.max(CAR.rampMinAir, CAR.rampAir * c.v / CAR.vMax); c.boostT = 0; c.parkT = 0;
  Sfx.play('carLaunch');
  for (let i = 0; i < 6; i++) carPart(c.x - Math.cos(c.a) * 20, c.y - Math.sin(c.a) * 20, (carRand() - 0.5) * 90, (carRand() - 0.5) * 90, 0.45, 'rgba(255,255,255,0.85)', 3 + carRand() * 3);
  if (g) g.used = true;
}
function carFly(st, dt) {
  const c = st.car;
  c.air += dt;
  c.x = clamp(c.x + Math.cos(c.a) * c.v * dt, 34, W - 34); c.y = clamp(c.y + Math.sin(c.a) * c.v * dt, 34, H - 34);
  const f = Math.min(1, c.air / c.airDur);
  c.z = 4 * CAR.rampH * (c.airV / CAR.vMax) * f * (1 - f);
  if (c.air < c.airDur) return;
  c.air = 0; c.z = 0;
  if (carAt(st, c.x, c.y) === 'w') { carSplash(st, c.lastRamp); return; }
  carCollide(st, c);
  st.stats.jumps++;
  Sfx.play('carThump'); Sfx.play('land'); carRumble(0.7, 0.5, 160);
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.12);
  c.squash = 0.8;
  for (let i = 0; i < 8; i++) { const a = carRand() * Math.PI * 2; carPart(c.x + Math.cos(a) * 18, c.y + Math.sin(a) * 12, Math.cos(a) * 70, Math.sin(a) * 70, 0.5, 'rgba(255,255,255,0.85)', 3 + carRand() * 3); }
}
function carTow(st) {
  const c = st.car, p = carPathNearest(st, c.x, c.y);
  if (!p) return;
  // the path ends in the box: a tow there would park the car for free, so back off along the last segment
  const P = st.park, m = CAR.towBox, inB = (x, y) => x > P.x0 - m && x < P.x1 + m && y > P.y0 - m && y < P.y1 + m;
  if (inB(p.x, p.y) && st.path.length > 1) {
    const n = st.path.length, [ax, ay] = st.path[n - 2], [bx, by] = st.path[n - 1], L = Math.hypot(bx - ax, by - ay) || 1;
    for (let d = 0; d <= L && inB(p.x, p.y); d += 5) { p.x = bx - (bx - ax) / L * d; p.y = by - (by - ay) / L * d; }
    p.a = Math.atan2(by - ay, bx - ax);
  }
  Object.assign(c, { x: p.x, y: p.y, a: p.a, v: 0, revT: 0, boostT: 0, parkT: 0, pop: 0.35 });
  st.stats.tows++; st.samp = []; st.stuck = false;
  Sfx.play('carTow'); Sfx.play('boing');
  carMsg(st, 'Tow truck! Beep beep!', C.paper, 1.6);
  burst(c.x, c.y, 'rgba(255,255,255,0.9)', 12);
}
function carSwap(st) {
  const c = st.car;
  st.swapUsed = true; st.steer = 1 - st.steer; st.lock = [true, true]; st.lockT = [0, 0];
  st.swapT = 0.4; st.pulseT = 1; st.tagT = 1.5; st.hint = 5; st.stats.swaps++;
  st.pedalIdle = 0; st.steerIdle = 0; st.steerBump = false; st.wrongT = 0;
  carMsg(st, 'SWAP SEATS!', '#d9c6ff', 1.6, true);
  Sfx.play('carSwap'); Sfx.play('boing'); carRumble(0.3, 0.5, 150);
  burst(c.x, c.y - 8, PCOL[0], 10); burst(c.x, c.y + 8, PCOL[1], 10);
}
function carParked(st) {
  const c = st.car, P = st.park, bx = (P.x0 + P.x1) / 2, by = (P.y0 + P.y1) / 2;
  st.phase = 'parked'; st.parkT2 = 0; c.v = 0; st.nudge = null; st.stuck = false;
  const perfect = st.t - st.lastHitT > CAR.perfectT;
  if (perfect) st.stats.perfect++;
  st.stats.parks++;
  carMsg(st, perfect ? 'Perfect park!' : 'Parked!', C.gold, 2.2, true);
  carRumble(0.3, 0.6, 250);
  if (st.k >= st.n - 1) {
    G.level.goal = { x: bx, y: P.y0 - 10 }; // the core's level-clear confetti bursts from the garage
    levelClear();
    return;
  }
  Sfx.play('carParked');
  burst(bx, by, C.gold, 16);
  for (let i = 0; i < 50; i++) confetti(bx, by);
}

/* ----- honk, ducks, cones ----- */
function carHonk(st, id) {
  const c = st.car;
  st.honkCd[id] = CAR.honkCool; st.stats.honks[id]++;
  Sfx.play('carHonk', id); rumble(id, 0, 0.25, 60);
  st.honkFx.push({ id, t: 0.35 });
  let quacked = false;
  for (const d of st.ducks) {
    let near = 1e9;
    for (let k = 0; k < d.n; k++) { const p = carDuckPos(d, k); near = Math.min(near, Math.hypot(p.x - c.x, p.y - c.y)); }
    if (near >= CAR.honkR) continue;
    if (d.pause > 0) { const add = clamp(3 - d.pause, 0, CAR.duckWaitMax - d.ext); d.pause += add; d.ext += add; } // waiting at the side: they keep waiting for you (up to duckWaitMax s more)
    else if (d.blockT > 0) d.turnNow = true;         // waiting on the car: they turn around now
    else d.hurry = CAR.duckHurryT;                   // crossing: they hurry
    d.bubble = 0.9; quacked = true;
  }
  // the lone duck / frog answers a honk nearby, at most every critterGap s
  const cr = st.critter;
  if (cr && Math.hypot(cr.x - c.x, cr.y - c.y) < CAR.critterR && st.t - cr.at >= CAR.critterGap) {
    cr.t = 0.8; cr.at = st.t;
    if (cr.kind === 'frog') Sfx.play('carRibbit'); else quacked = true;
  }
  if (quacked) { st.stats.quacks++; if (st.t - st.quackAt >= CAR.quackGap) { st.quackAt = st.t; Sfx.play('carQuack'); } }
  if (st.tr && st.tootBack <= 0 && st.t - st.tootAt >= CAR.tootGap) { st.tootBack = 0.35; st.tootAt = st.t; } // the toy train toots back
}
function carDuckPos(d, k) {
  const s = clamp(d.s - d.dir * k * CAR.duckGap, 0, d.len), f = d.len ? s / d.len : 0;
  return { x: d.ax + (d.bx - d.ax) * f, y: d.ay + (d.by - d.ay) * f };
}
// duck lines walk from -> to, pause, and walk back; they wait for the car, and turn around if it doesn't move
function carDucks(st, dt) {
  const c = st.car;
  for (const d of st.ducks) {
    d.bubble = Math.max(0, d.bubble - dt); d.hop = Math.max(0, d.hop - dt);
    if (d.pause > 0) { d.pause -= dt; d.blockT = 0; continue; }
    const sp = CAR.duckSpeed * (d.hurry > 0 ? CAR.duckHurry : 1);
    d.hurry = Math.max(0, d.hurry - dt);
    const m = carDuckPos(d, 0), ux = (d.bx - d.ax) / d.len * d.dir, uy = (d.by - d.ay) / d.len * d.dir;
    let blocked = false;
    // blocked only by a car in front of the leader (one beside them is pushed aside as they walk past)
    if (c.sink === 0 && c.air === 0) for (const [qx, qy] of carCircles(c)) if (Math.hypot(m.x + ux * 6 - qx, m.y + uy * 6 - qy) < CAR.r + CAR.duckR + 2 && (qx - m.x) * ux + (qy - m.y) * uy > 0.6 * Math.abs((qx - m.x) * uy - (qy - m.y) * ux)) blocked = true;
    if (blocked) {
      d.blockT += dt;
      if (d.blockT > CAR.duckGiveUp || d.turnNow) { // the last duckling leads the way back
        d.s = clamp(d.s - d.dir * (d.n - 1) * CAR.duckGap, 0, d.len); d.dir = -d.dir; d.blockT = 0; d.turnNow = false; d.bubble = Math.max(d.bubble, 0.5);
      }
      continue;
    }
    d.blockT = 0; d.turnNow = false;
    d.s += d.dir * sp * dt;
    const tail = d.s - d.dir * (d.n - 1) * CAR.duckGap;
    if (d.dir > 0 && tail >= d.len) { d.dir = -1; d.s = d.len; d.pause = CAR.duckPause; d.ext = 0; }
    else if (d.dir < 0 && tail <= 0) { d.dir = 1; d.s = 0; d.pause = CAR.duckPause; d.ext = 0; }
  }
}
// the car can't drive through ducks: it's pushed back out (and bounces off, with a quack, if it was going for them)
function carDuckPush(st) {
  const c = st.car;
  for (const d of st.ducks) for (let k = 0; k < d.n; k++) {
    const p = carDuckPos(d, k);
    for (const [qx, qy] of carCircles(c)) {
      const dx = qx - p.x, dy = qy - p.y, dd = Math.hypot(dx, dy);
      if (dd >= CAR.r + CAR.duckR || dd < 0.01) continue;
      const push = CAR.r + CAR.duckR - dd;
      c.x += dx / dd * push; c.y += dy / dd * push;
      const dot = -(dx * Math.cos(c.a) + dy * Math.sin(c.a)) / dd * Math.sign(c.v || 1);
      if (dot > 0.3 && Math.abs(c.v) > 20) {
        c.v = -c.v * CAR.bumpKeep; d.hop = 0.35; d.bubble = 0.9;
        st.stats.quacks++; Sfx.play('carQuack'); carRumble(0.2, 0.4, 80);
      }
    }
  }
}
function carConeHits(st) {
  const c = st.car;
  for (const cn of st.cones) {
    if (cn.gone) continue;
    for (const [qx, qy] of carCircles(c)) {
      const dx = cn.x - qx, dy = cn.y - qy, dd = Math.hypot(dx, dy);
      if (dd >= CAR.r + CAR.coneR || dd < 0.01) continue;
      const nx = dx / dd, ny = dy / dd, sp = Math.abs(c.v) * 1.3 + 60;
      cn.vx = nx * sp; cn.vy = ny * sp; cn.x = qx + nx * (CAR.r + CAR.coneR); cn.y = qy + ny * (CAR.r + CAR.coneR);
      cn.spin = (carRand() < 0.5 ? -1 : 1) * (8 + carRand() * 6);
      if (cn.slowT <= 0) { c.v *= CAR.coneSlow; cn.slowT = 0.3; }
      if (!cn.hit) {
        cn.hit = true; st.stats.cones++;
        Sfx.play('carCone'); carRumble(0.1, 0.3, 50);
        for (let i = 0; i < 4; i++) carPart(cn.x, cn.y, nx * 80 + (carRand() - 0.5) * 90, ny * 80 + (carRand() - 0.5) * 90, 0.35, '#ff8a3d', 2 + carRand() * 2);
      }
    }
  }
}
// knocked cones slide, spin, bounce off hedges and sink in water (a cone stuck in a hedge pops)
function carConeSlide(st, dt) {
  for (const cn of st.cones) {
    if (cn.gone) { cn.sinkT += dt; continue; }
    cn.slowT = Math.max(0, cn.slowT - dt);
    if (!cn.vx && !cn.vy) continue;
    cn.x += cn.vx * dt; cn.y += cn.vy * dt; cn.rot += cn.spin * dt;
    const sp = Math.hypot(cn.vx, cn.vy), f = Math.max(0, sp - CAR.coneFric * dt) / (sp || 1);
    cn.vx *= f; cn.vy *= f; cn.spin *= f;
    if (sp * f < 1) { cn.vx = cn.vy = 0; }
    const ch = carAt(st, cn.x, cn.y);
    if (ch === 'w') { cn.gone = true; cn.vx = cn.vy = 0; Sfx.play('carPlop'); for (let i = 0; i < 6; i++) carPart(cn.x, cn.y, (carRand() - 0.5) * 80, (carRand() - 0.5) * 80, 0.4, '#9fdcff', 2 + carRand() * 2); }
    else if (carSolid(st, ch)) {
      cn.x -= cn.vx * dt * 2; cn.y -= cn.vy * dt * 2; cn.vx = -cn.vx * 0.5; cn.vy = -cn.vy * 0.5;
      if (carSolid(st, carAt(st, cn.x, cn.y))) { cn.gone = true; cn.vx = cn.vy = 0; puff(cn.x, cn.y, 5, '#ff8a3d'); }
    }
  }
}

/* ----- the toy train and its crossing gates (room 4) ----- */
function carTrainInit(st, cfg) {
  const len = cfg.cars * cfg.carLen + (cfg.cars - 1) * cfg.gap;
  let gx0 = 99, gx1 = -1;
  for (let ty = cfg.top + 1; ty < cfg.bot; ty++) for (let tx = 0; tx < COLS; tx++) if (st.grid[ty][tx] === 'g') { gx0 = Math.min(gx0, tx); gx1 = Math.max(gx1, tx); }
  const roadTop = (cfg.top + 1) * T, roadBot = cfg.bot * T;
  st.tr = { cfg, len, y0: cfg.top * T, roadTop, roadBot, yEnd: (cfg.bot + 1) * T + len, front: cfg.top * T, run: false, wait: cfg.phase || 0,
    x0: cfg.col * T, x1: (cfg.col + cfg.w) * T, zone: { x: gx0 * T, y: roadTop, w: (gx1 + 1 - gx0) * T, h: roadBot - roadTop },
    gx: [gx0, gx1], hold: false, holdT: 0, tootT: 0, clackT: 0, bellT: 0, puffT: 0, tootFx: 0, gateCloses: 0 };
}
function carTrain(st, dt) {
  const t = st.tr;
  if (!t) return;
  const c = st.car, cfg = t.cfg, z = t.zone;
  t.tootFx = Math.max(0, t.tootFx - dt);
  const circ = carCircles(c);
  const inZone = c.sink === 0 && circ.some(([qx, qy]) => carCircleRect(qx, qy, CAR.r, z.x, z.y, z.w, z.h));
  t.hold = false;
  if (!t.run) {
    t.wait -= dt;
    if (t.wait <= 0) { t.run = true; t.front = t.y0; Sfx.play('carToot'); t.tootFx = 0.8; }
  } else {
    // it waits at the tunnel mouth while the car is on the crossing, and stops for a car right in front of it
    if (t.front <= t.roadTop && inZone) t.hold = true;
    for (const [qx, qy] of circ) if (carCircleRect(qx, qy, CAR.r, t.x0, t.front, t.x1 - t.x0, 26)) t.hold = true;
    if (t.hold) {
      t.holdT += dt;
      if (t.holdT >= 1.2) { t.holdT = 0; Sfx.play('carToot'); t.tootFx = 0.8; }
    } else {
      t.holdT = 0.9;
      t.front = Math.min(t.front + cfg.speed * dt, t.front <= t.roadTop && inZone ? t.roadTop : 1e9);
    }
    if (t.front >= t.yEnd) { t.run = false; t.wait = Math.max(0.5, cfg.period - (t.yEnd - t.y0) / cfg.speed); }
  }
  // gates close warn s before the train comes out, and open when its tail is past the road; never on top of the car
  const toRoad = t.run ? (t.roadTop - t.front) / cfg.speed : t.wait + (t.roadTop - t.y0) / cfg.speed;
  const want = t.run ? t.front - t.len < t.roadBot : toRoad <= cfg.warn;
  if (want !== st.gatesClosed && !(want && inZone)) { st.gatesClosed = want; Sfx.play(want ? 'close' : 'open'); if (want) t.gateCloses++; }
  st.gateA = approach(st.gateA, st.gatesClosed ? 1 : 0, dt * 5);
  const shows = t.run && t.front > t.roadTop && t.front - t.len < t.roadBot;
  t.clackT -= dt;
  if (shows && !t.hold && t.clackT <= 0) { t.clackT = 0.16; Sfx.play('carClack'); }
  t.bellT -= dt;
  if (st.gatesClosed && t.bellT <= 0) { t.bellT = 0.45; Sfx.play('carBell'); }
  t.puffT -= dt;
  if (shows && t.puffT <= 0 && t.front < t.roadBot + 10) {
    t.puffT = 0.14;
    const cx = (t.x0 + t.x1) / 2, cy = t.front - 12;
    if (cy > t.roadTop && cy < t.roadBot) carPart(cx + (carRand() - 0.5) * 6, cy, (carRand() - 0.5) * 30, -20 - carRand() * 20, 0.6, 'rgba(255,255,255,0.8)', 3 + carRand() * 3);
  }
}

/* ----- coaching: nudges that name the player who should do something ----- */
// a good reason to be stopped: a closed gate or a duck just ahead
function carWaitReason(st) {
  const c = st.car, ux = Math.cos(c.a), uy = Math.sin(c.a);
  if (st.gatesClosed && st.tr) {
    const t = st.tr;
    for (const gx of t.gx) for (let ty = t.cfg.top + 1; ty < t.cfg.bot; ty++) {
      const rx = gx * T + T / 2 - c.x, ry = ty * T + T / 2 - c.y, ahead = rx * ux + ry * uy;
      if (Math.abs(ahead) < 130 && Math.abs(-rx * uy + ry * ux) < 40) return true;
    }
  }
  for (const d of st.ducks) for (let k = 0; k < d.n; k++) {
    const p = carDuckPos(d, k), rx = p.x - c.x, ry = p.y - c.y;
    if (!carIsRoad(st, Math.floor(p.x / T), Math.floor(p.y / T))) continue; // resting on the grass: no reason to wait
    if (Math.hypot(rx, ry) < 90 && rx * ux + ry * uy > -10) return true;
  }
  return false;
}
function carCoach(st, dt, steer, gas, brake) {
  const c = st.car, sk = st.steer, pk = 1 - sk, raw = G.players[pk].input;
  st.pedalIdle = gas || brake ? 0 : st.pedalIdle + dt;
  if (steer.l || steer.r || steer.u || steer.d) { st.steerIdle = 0; st.steerBump = false; } else st.steerIdle += dt;
  const wrong = !st.lock[pk] && (raw.left || raw.right) && !gas && !brake;
  st.wrongT = wrong ? st.wrongT + dt : 0;
  if (st.wrongT >= 0.7) st.wrongShow = 2.5;
  let n = null;
  const moving = Math.abs(c.v) > 5 || c.air > 0 || c.sink > 0, now = st.k > 0 || st.swapUsed ? 'Now ' : '';
  // car still and nobody pressing anything: show the key hint again (the page's top-bar legend is the core's platformer one)
  const anyIn = G.players.some(p => { const i = p.input; return i.left || i.right || i.up || i.down || i.jump; });
  st.idleT = !anyIn && !moving ? st.idleT + dt : 0;
  if (st.idleT >= CAR.idleHint) st.hint = Math.max(st.hint, 0.6);
  if (st.stuck) n = { id: pk, text: `Stuck? Hold ${carKey(pk, 'brake')} to back up!` };
  else if (st.wrongShow > 0) n = { id: pk, text: `${NAMES[pk]}, you do gas and brake:  ${carKey(pk, 'gas')} go   ${carKey(pk, 'brake')} brake` };
  else if (st.lock[pk] && st.lockT[pk] > 0.6) n = { id: pk, text: `${NAMES[pk]}, let go first! ${now ? 'Now you' : 'You'} do gas and brake` };
  else if (st.lock[sk] && st.lockT[sk] > 0.6) n = { id: sk, text: `${NAMES[sk]}, let go first! ${now ? 'Now you' : 'You'} steer` };
  else if (st.pedalIdle >= 5 && !moving && !carWaitReason(st)) n = { id: pk, text: `${NAMES[pk]}, you're on the pedals!  ${carKey(pk, 'gas')} to go` };
  else if (st.steerIdle >= 6 && st.steerBump) n = { id: sk, text: `${NAMES[sk]}, you steer! Point the way` };
  if (n && typeof cpuSolo === 'function' && cpuSolo() && cpuOn(n.id)) n = null; // (1-player mode: no key nudges for the computer's seat)
  st.nudge = n;
}

/* ----- drawing: the ground is painted once per room into a cached canvas ----- */
function carShape(g, x, y, w, h, r) { // a rect with its own radius per corner [tl, tr, br, bl]
  const [a, b, cc, d] = r;
  g.moveTo(x + a, y); g.lineTo(x + w - b, y); if (b) g.arcTo(x + w, y, x + w, y + b, b);
  g.lineTo(x + w, y + h - cc); if (cc) g.arcTo(x + w, y + h, x + w - cc, y + h, cc);
  g.lineTo(x + d, y + h); if (d) g.arcTo(x, y + h, x, y + h - d, d);
  g.lineTo(x, y + a); if (a) g.arcTo(x, y, x + a, y, a);
  g.closePath();
}
// the cached ground's backing size: the main canvas's, capped at CAR.groundScale x the logical size
function carGroundSize() {
  // each axis on its own, so the cached ground is exactly the canvas size and the blit is 1:1
  const kx = Math.min(canvas.width / W, CAR.groundScale), ky = Math.min(canvas.height / H, CAR.groundScale);
  return [Math.max(1, Math.round(W * kx)), Math.max(1, Math.round(H * ky))];
}
function carBuildGround(st) {
  const cv = st.groundCv || (st.groundCv = document.createElement('canvas'));
  const [gw, gh] = carGroundSize();
  if (cv.width !== gw || cv.height !== gh) { cv.width = gw; cv.height = gh; } // reuse the backing store when it fits
  st.groundKey = st.k + ':' + gw + 'x' + gh; st.groundWant = st.groundKey;
  const g = cv.getContext('2d');
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, gw, gh);
  g.setTransform(gw / W, 0, 0, gh / H, 0, 0);
  const tl = (x, y) => carTile(st, x, y), road = (x, y) => carIsRoad(st, x, y);
  const isW = (x, y) => { const ch = tl(x, y); return ch === 'w' || ch === 'r'; };
  const hedge = (x, y) => { const ch = tl(x, y); return ch === '#' || ch === 'n'; };
  // grass, with speckles and a few flowers
  g.fillStyle = C.grass; g.fillRect(0, 0, W, H);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (tl(x, y) !== '.') continue;
    const h = hash(x + 40, y + 7);
    g.fillStyle = 'rgba(85,173,128,0.35)';
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x * T + 4 + ((h >> (i * 5)) % 22), y * T + 4 + ((h >> (i * 5 + 3)) % 22), 1.6 + (i % 2), 0, Math.PI * 2); g.fill(); }
    if (h % 11 === 0) {
      const fx = x * T + 8 + (h >> 8) % 14, fy = y * T + 8 + (h >> 12) % 14;
      g.fillStyle = (h >> 4) % 2 ? '#fff6d8' : '#ffc0de';
      for (let i = 0; i < 5; i++) { const a = i * 1.2566; g.beginPath(); g.arc(fx + Math.cos(a) * 2.6, fy + Math.sin(a) * 2.6, 1.8, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = C.gold; g.beginPath(); g.arc(fx, fy, 1.5, 0, Math.PI * 2); g.fill();
    }
  }
  // hedge shadows on the grass
  g.fillStyle = 'rgba(28,26,54,0.13)';
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (hedge(x, y) && !hedge(x, y + 1)) g.fillRect(x * T, y * T + T, T, 5);
  // water (pond, creeks): deeper along the banks
  g.fillStyle = '#69c3f0'; g.beginPath();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (isW(x, y)) g.rect(x * T, y * T, T, T);
  g.fill();
  g.fillStyle = '#4aa6d6';
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (!isW(x, y)) continue;
    const X = x * T, Y = y * T;
    if (!isW(x, y - 1)) g.fillRect(X, Y, T, 4);
    if (!isW(x, y + 1)) g.fillRect(X, Y + T - 4, T, 4);
    if (!isW(x - 1, y)) g.fillRect(X, Y, 4, T);
    if (!isW(x + 1, y)) g.fillRect(X + T - 4, Y, 4, T);
  }
  // mud
  g.fillStyle = '#a8743f'; g.beginPath();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (tl(x, y) === 's') g.rect(x * T, y * T, T, T);
  g.fill();
  g.fillStyle = '#8a5a2c';
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (tl(x, y) !== 's') continue;
    const h = hash(x, y + 99);
    for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(x * T + 5 + ((h >> (i * 6)) % 20), y * T + 5 + ((h >> (i * 6 + 3)) % 20), 3 + (i % 2) * 2, 2.2 + (i % 2), 0, 0, Math.PI * 2); g.fill(); }
  }
  // road: dark rim, surface inset on open sides, white edge line (rounded at outer corners)
  const ROUND = 8, RIM = 3, LINE = 5;
  const corners = (x, y) => {
    const up = road(x, y - 1), dn = road(x, y + 1), lf = road(x - 1, y), rt = road(x + 1, y);
    return { up, dn, lf, rt, tl: !up && !lf, tr: !up && !rt, br: !dn && !rt, bl: !dn && !lf };
  };
  g.fillStyle = '#5a5675'; g.beginPath();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (!road(x, y)) continue;
    const k = corners(x, y);
    carShape(g, x * T, y * T, T, T, [k.tl ? ROUND : 0, k.tr ? ROUND : 0, k.br ? ROUND : 0, k.bl ? ROUND : 0]);
  }
  g.fill();
  g.fillStyle = '#6c6889'; g.beginPath();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (!road(x, y)) continue;
    const k = corners(x, y), il = k.lf ? 0 : RIM, ir = k.rt ? 0 : RIM, iu = k.up ? 0 : RIM, id = k.dn ? 0 : RIM, rr2 = ROUND - RIM;
    carShape(g, x * T + il, y * T + iu, T - il - ir, T - iu - id, [k.tl ? rr2 : 0, k.tr ? rr2 : 0, k.br ? rr2 : 0, k.bl ? rr2 : 0]);
  }
  g.fill();
  g.fillStyle = '#5a5675';
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (!road(x, y)) continue;
    const k = corners(x, y), X = x * T, Y = y * T;
    if (k.up && k.lf && !road(x - 1, y - 1)) g.fillRect(X, Y, RIM, RIM);
    if (k.up && k.rt && !road(x + 1, y - 1)) g.fillRect(X + T - RIM, Y, RIM, RIM);
    if (k.dn && k.lf && !road(x - 1, y + 1)) g.fillRect(X, Y + T - RIM, RIM, RIM);
    if (k.dn && k.rt && !road(x + 1, y + 1)) g.fillRect(X + T - RIM, Y + T - RIM, RIM, RIM);
  }
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath();
  const cr = ROUND - LINE;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (!road(x, y)) continue;
    const k = corners(x, y), X = x * T, Y = y * T, X2 = X + T, Y2 = Y + T;
    if (!k.up) { g.moveTo(k.lf ? X : X + ROUND, Y + LINE); g.lineTo(k.rt ? X2 : X2 - ROUND, Y + LINE); }
    if (!k.dn) { g.moveTo(k.lf ? X : X + ROUND, Y2 - LINE); g.lineTo(k.rt ? X2 : X2 - ROUND, Y2 - LINE); }
    if (!k.lf) { g.moveTo(X + LINE, k.up ? Y : Y + ROUND); g.lineTo(X + LINE, k.dn ? Y2 : Y2 - ROUND); }
    if (!k.rt) { g.moveTo(X2 - LINE, k.up ? Y : Y + ROUND); g.lineTo(X2 - LINE, k.dn ? Y2 : Y2 - ROUND); }
    if (k.tl) { g.moveTo(X + LINE, Y + ROUND); g.arc(X + ROUND, Y + ROUND, cr, Math.PI, Math.PI * 1.5); }
    if (k.tr) { g.moveTo(X2 - ROUND, Y + LINE); g.arc(X2 - ROUND, Y + ROUND, cr, Math.PI * 1.5, Math.PI * 2); }
    if (k.br) { g.moveTo(X2 - LINE, Y2 - ROUND); g.arc(X2 - ROUND, Y2 - ROUND, cr, 0, Math.PI * 0.5); }
    if (k.bl) { g.moveTo(X + ROUND, Y2 - LINE); g.arc(X + ROUND, Y2 - ROUND, cr, Math.PI * 0.5, Math.PI); }
    // inner corners: the edge line bends around the corner of the grass
    if (k.up && k.lf && !road(x - 1, y - 1)) { g.moveTo(X + LINE, Y); g.arc(X, Y, LINE, 0, Math.PI * 0.5); }
    if (k.up && k.rt && !road(x + 1, y - 1)) { g.moveTo(X2, Y + LINE); g.arc(X2, Y, LINE, Math.PI * 0.5, Math.PI); }
    if (k.dn && k.rt && !road(x + 1, y + 1)) { g.moveTo(X2 - LINE, Y2); g.arc(X2, Y2, LINE, Math.PI, Math.PI * 1.5); }
    if (k.dn && k.lf && !road(x - 1, y + 1)) { g.moveTo(X, Y2 - LINE); g.arc(X, Y2, LINE, Math.PI * 1.5, Math.PI * 2); }
  }
  g.stroke();
  // wooden bridge deck over the creek (road next to a railing)
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (!road(x, y) || !(tl(x, y - 1) === 'r' || tl(x, y + 1) === 'r' || tl(x, y - 2) === 'r' || tl(x, y + 2) === 'r')) continue;
    if (!(isW(x, y - 2) || isW(x, y + 2) || isW(x, y - 1) || isW(x, y + 1))) continue;
    const X = x * T, Y = y * T;
    g.fillStyle = C.plank; g.fillRect(X, Y, T, T);
    g.fillStyle = C.plankDark;
    for (let i = 0; i < 3; i++) g.fillRect(X + i * 10 + 9, Y, 1.5, T);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(X, Y + 2, T, 3);
  }
  // railings: a wooden beam along the road side, posts, water around them
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (tl(x, y) !== 'r') continue;
    const X = x * T, Y = y * T, onTop = road(x, y + 1);
    const by = onTop ? Y + T - 9 : Y + 1;
    g.fillStyle = 'rgba(28,26,54,0.2)'; g.fillRect(X, by + (onTop ? -4 : 8), T, 4);
    g.fillStyle = C.plank; g.fillRect(X, by, T, 8);
    g.fillStyle = C.plankDark; g.fillRect(X, by + 6, T, 2);
    for (const px of [X + 3, X + T - 9]) { g.fillStyle = C.plankDark; g.fillRect(px, by - 1, 6, 10); g.fillStyle = C.plank; g.fillRect(px + 1, by, 4, 3); }
  }
  // rails
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (tl(x, y) !== 't' || tl(x - 1, y) === 't') continue;
    let w = 1; while (tl(x + w, y) === 't') w++;
    const X = x * T, Y = y * T, X2 = X + w * T;
    g.fillStyle = C.plankDark;
    for (let i = 0; i < 3; i++) g.fillRect(X + 8, Y + 3 + i * 10, X2 - X - 16, 5);
    g.fillStyle = '#d9dbe8';
    g.fillRect(X + 16, Y, 4, T); g.fillRect(X2 - 20, Y, 4, T);
    g.fillStyle = 'rgba(28,26,54,0.25)'; g.fillRect(X + 16, Y, 1, T); g.fillRect(X2 - 20, Y, 1, T);
  }
  // ramps: a wooden wedge, high end at the launch side, white chevrons, a shadow beyond it
  for (const rg of st.rampGroups) {
    const X = rg.x0 * T, Y = rg.y0 * T, Wd = (rg.x1 - rg.x0 + 1) * T, Ht = (rg.y1 - rg.y0 + 1) * T, [dx, dy] = rg.dir;
    g.fillStyle = 'rgba(28,26,54,0.28)';
    if (dx > 0) g.fillRect(X + Wd, Y + 2, 8, Ht - 4); else if (dx < 0) g.fillRect(X - 8, Y + 2, 8, Ht - 4);
    else if (dy > 0) g.fillRect(X + 2, Y + Ht, Wd - 4, 8); else g.fillRect(X + 2, Y - 8, Wd - 4, 8);
    const grd = g.createLinearGradient(dx < 0 ? X + Wd : X, dy < 0 ? Y + Ht : Y, dx > 0 ? X + Wd : dx < 0 ? X : X, dy > 0 ? Y + Ht : dy < 0 ? Y : Y);
    grd.addColorStop(0, '#f0bb6e'); grd.addColorStop(1, '#d48c3e');
    g.fillStyle = grd; g.beginPath(); carShape(g, X + 1, Y + 1, Wd - 2, Ht - 2, [3, 3, 3, 3]); g.fill();
    g.fillStyle = '#b9772f';
    if (dx) { g.fillRect(X + 1, Y + 1, Wd - 2, 3); g.fillRect(X + 1, Y + Ht - 4, Wd - 2, 3); } else { g.fillRect(X + 1, Y + 1, 3, Ht - 2); g.fillRect(X + Wd - 4, Y + 1, 3, Ht - 2); }
    g.strokeStyle = 'rgba(138,88,51,0.45)'; g.lineWidth = 1; g.beginPath();
    if (dx) for (let i = 1; i < 4; i++) { g.moveTo(X + Wd * i / 4, Y + 4); g.lineTo(X + Wd * i / 4, Y + Ht - 4); }
    else for (let i = 1; i < 4; i++) { g.moveTo(X + 4, Y + Ht * i / 4); g.lineTo(X + Wd - 4, Y + Ht * i / 4); }
    g.stroke();
    g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.lineCap = 'round'; g.lineJoin = 'round';
    const n = dx ? rg.y1 - rg.y0 + 1 : rg.x1 - rg.x0 + 1;
    for (let i = 0; i < n; i++) {
      const cx = dx ? X + Wd / 2 : X + i * T + T / 2, cy = dx ? Y + i * T + T / 2 : Y + Ht / 2;
      g.beginPath(); g.moveTo(cx - dx * 4 - dy * 7, cy - dy * 4 - dx * 7); g.lineTo(cx + dx * 4, cy + dy * 4); g.lineTo(cx - dx * 4 + dy * 7, cy - dy * 4 + dx * 7); g.stroke();
    }
  }
  // the garage (a box closed on three sides by hedges) gets brick walls and a roof
  const P = st.park, garage = [];
  for (let y = P.y0 / T - 1; y <= P.y1 / T; y++) for (let x = P.x0 / T - 1; x <= P.x1 / T; x++) if (tl(x, y) === '#' && x > 0 && x < COLS - 1 && y > 0 && y < ROWS - 1) garage.push([x, y]);
  st.garage = garage.length >= 6 ? garage : null;
  // hedges: dark base, round bushes, an ink outline on the outside
  g.fillStyle = '#3d8a5c'; g.beginPath();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (hedge(x, y)) g.rect(x * T, y * T, T, T);
  g.fill();
  const gset = new Set((st.garage || []).map(([x, y]) => x + ',' + y));
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (!hedge(x, y) || tl(x, y) === 'n' || gset.has(x + ',' + y)) continue;
    const h = hash(x, y), X = x * T, Y = y * T;
    for (let i = 0; i < 2; i++) {
      const bx = X + 9 + ((h >> (i * 4)) % 13), by = Y + 9 + ((h >> (i * 4 + 2)) % 13), r = 10 + ((h >> (i * 3 + 9)) % 3);
      g.fillStyle = '#4fa36f'; g.beginPath(); g.arc(bx, by, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.13)'; g.beginPath(); g.arc(bx - r * 0.35, by - r * 0.35, r * 0.4, 0, Math.PI * 2); g.fill();
    }
  }
  g.strokeStyle = 'rgba(28,26,54,0.15)'; g.lineWidth = 1.5; g.beginPath();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (!hedge(x, y)) continue;
    const X = x * T, Y = y * T;
    if (!hedge(x, y - 1) && y > 0) { g.moveTo(X, Y + 0.75); g.lineTo(X + T, Y + 0.75); }
    if (!hedge(x, y + 1) && y < ROWS - 1) { g.moveTo(X, Y + T - 0.75); g.lineTo(X + T, Y + T - 0.75); }
    if (!hedge(x - 1, y) && x > 0) { g.moveTo(X + 0.75, Y); g.lineTo(X + 0.75, Y + T); }
    if (!hedge(x + 1, y) && x < COLS - 1) { g.moveTo(X + T - 0.75, Y); g.lineTo(X + T - 0.75, Y + T); }
  }
  g.stroke();
  // train tunnels: a stone arch with a dark mouth facing the rails
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (tl(x, y) !== 'n' || tl(x - 1, y) === 'n') continue;
    let w = 1; while (tl(x + w, y) === 'n') w++;
    const X = x * T, Y = y * T, Wd = w * T, down = tl(x, y + 1) === 't' || road(x, y + 1);
    g.fillStyle = '#8f8aa8'; g.beginPath(); carShape(g, X + 2, Y + 2, Wd - 4, T - 4, [6, 6, 6, 6]); g.fill();
    g.fillStyle = C.ink; g.beginPath();
    if (down) carShape(g, X + 9, Y + 8, Wd - 18, T - 8, [10, 10, 0, 0]); else carShape(g, X + 9, Y, Wd - 18, T - 8, [0, 0, 10, 10]);
    g.fill();
  }
  if (st.garage) {
    // brick walls (seen from above: mortar lines, a lighter top edge), a shadow on the garage floor, an ink outline
    const isG = (x, y) => gset.has(x + ',' + y);
    g.fillStyle = '#6c6889'; g.fillRect(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0); // a flat garage floor
    g.fillStyle = 'rgba(28,26,54,0.22)';
    for (const [x, y] of st.garage) {
      const X = x * T, Y = y * T;
      if (!isG(x, y + 1) && carIsRoad(st, x, y + 1)) g.fillRect(X, Y + T, T, 7);
      if (!isG(x - 1, y) && carIsRoad(st, x - 1, y)) g.fillRect(X - 7, Y, 7, T);
    }
    for (const [x, y] of st.garage) {
      const X = x * T, Y = y * T;
      g.fillStyle = '#c45c44'; g.fillRect(X, Y, T, T);
      g.fillStyle = '#a3473a';
      for (let r = 0; r < 4; r++) { g.fillRect(X, Y + r * 7.5 + 6.5, T, 1.2); for (let i = 0; i < 3; i++) g.fillRect(X + (r % 2) * 5 + i * 10 + 4, Y + r * 7.5, 1.2, 7.5); }
    }
    g.strokeStyle = C.ink; g.lineWidth = 2; g.lineCap = 'square'; g.beginPath();
    for (const [x, y] of st.garage) {
      const X = x * T, Y = y * T;
      if (!isG(x, y - 1)) { g.moveTo(X, Y + 1); g.lineTo(X + T, Y + 1); }
      if (!isG(x, y + 1)) { g.moveTo(X, Y + T - 1); g.lineTo(X + T, Y + T - 1); }
      if (!isG(x - 1, y)) { g.moveTo(X + 1, Y); g.lineTo(X + 1, Y + T); }
      if (!isG(x + 1, y)) { g.moveTo(X + T - 1, Y); g.lineTo(X + T - 1, Y + T); }
    }
    g.stroke();
    g.fillStyle = 'rgba(28,26,54,0.16)';
    g.fillRect(P.x0, P.y0, P.x1 - P.x0, 6); g.fillRect(P.x1 - 6, P.y0, 6, P.y1 - P.y0);
  }
  // parking box: a dashed white outline (the P and the gold fill are drawn live)
  g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.setLineDash([7, 5]);
  g.strokeRect(P.x0 + 3, P.y0 + 3, P.x1 - P.x0 - 6, P.y1 - P.y0 - 6);
  g.setLineDash([]);
  g.restore();
}
function carDraw(st) {
  if (!st || !st.grid || !st.car) return;
  const [gw, gh] = carGroundSize(), key = st.k + ':' + gw + 'x' + gh;
  if (!st.groundCv || st.groundKey !== key) {
    // a resize within the room keeps drawing the old picture (scaled) until the new size has held for 0.25 s
    const now = performance.now(), sameRoom = st.groundCv && st.groundKey.startsWith(st.k + ':');
    if (st.groundWant !== key) { st.groundWant = key; st.groundWantT = now; }
    if (!sameRoom || now - st.groundWantT > 250) carBuildGround(st);
  }
  ctx.drawImage(st.groundCv, 0, 0, W, H);
  const c = st.car, clk = G.clock;
  // water shimmer
  ctx.strokeStyle = 'rgba(200,238,255,0.75)'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (st.grid[y][x] !== 'w') continue;
    const h = hash(x, y), X = x * T + 6 + (h % 8), Y = y * T + 9 + ((h >> 4) % 12), ph = clk * 2.2 + (h % 7);
    ctx.moveTo(X, Y + Math.sin(ph) * 1.5); ctx.quadraticCurveTo(X + 5, Y - 3 + Math.sin(ph + 1) * 1.5, X + 10, Y + Math.sin(ph + 2) * 1.5);
  }
  ctx.stroke();
  // skid marks
  if (st.skids.length) {
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const s of st.skids) {
      ctx.strokeStyle = `rgba(40,36,60,${(0.28 * (1 - (st.t - s.t) / 3)).toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(s.b[0], s.b[1]); ctx.lineTo(s.a[0], s.a[1]); ctx.moveTo(s.b[2], s.b[3]); ctx.lineTo(s.a[2], s.a[3]); ctx.stroke();
    }
  }
  // zoom pads (pulsing gold) and the swap pad (purple, grey once used)
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const ch = st.grid[y][x];
    if (ch !== 'z' && ch !== 'S') continue;
    const X = x * T, Y = y * T;
    if (ch === 'z') {
      const pu = 0.5 + 0.5 * Math.sin(clk * 6 - x * 0.3 - y * 0.6);
      ctx.fillStyle = C.gold; rr(X + 2, Y + 2, T - 4, T - 4, 5); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${(0.15 + 0.3 * pu).toFixed(3)})`; rr(X + 2, Y + 2, T - 4, T - 4, 5); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const o of [-5, 3]) { ctx.beginPath(); ctx.moveTo(X + 11 + o, Y + 9); ctx.lineTo(X + 16 + o, Y + 15); ctx.lineTo(X + 11 + o, Y + 21); ctx.stroke(); }
    } else {
      const used = st.swapUsed;
      ctx.fillStyle = used ? '#8c87a8' : '#b28dff'; rr(X + 2, Y + 2, T - 4, T - 4, 5); ctx.fill();
      if (!used) { ctx.fillStyle = `rgba(255,255,255,${(0.12 + 0.18 * (0.5 + 0.5 * Math.sin(clk * 4 + y))).toFixed(3)})`; rr(X + 2, Y + 2, T - 4, T - 4, 5); ctx.fill(); }
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
      ctx.moveTo(X + 8, Y + 11); ctx.lineTo(X + 22, Y + 11); ctx.lineTo(X + 18, Y + 7);
      ctx.moveTo(X + 22, Y + 19); ctx.lineTo(X + 8, Y + 19); ctx.lineTo(X + 12, Y + 23); ctx.stroke();
    }
  }
  // turbo ramps glow in rainbow colours
  for (let i = 0; i < st.rampGroups.length; i++) {
    if ((st.rampFails[i] || 0) < CAR.rampAssist) continue;
    const rg = st.rampGroups[i], X = rg.x0 * T, Y = rg.y0 * T, Wd = (rg.x1 - rg.x0 + 1) * T, Ht = (rg.y1 - rg.y0 + 1) * T;
    const hue = (clk * 160) % 360;
    ctx.lineWidth = 4; ctx.strokeStyle = `hsl(${hue.toFixed(0)}, 95%, 62%)`; rr(X - 1, Y - 1, Wd + 2, Ht + 2, 6); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = `hsl(${((hue + 120) % 360).toFixed(0)}, 95%, 70%)`; rr(X + 3, Y + 3, Wd - 6, Ht - 6, 4); ctx.stroke();
    text('TURBO', X + Wd / 2, Y - 10, 13, '#fff', 'center');
  }
  // parking box: a big P, and a gold fill while the car holds still inside
  const P = st.park, pw = P.x1 - P.x0, ph = P.y1 - P.y0;
  const fill = st.phase === 'parked' ? 1 : clamp(c.parkT / CAR.parkHold, 0, 1);
  if (fill > 0) { ctx.fillStyle = 'rgba(255,197,61,0.5)'; ctx.fillRect(P.x0 + 4, P.y1 - 4 - (ph - 8) * fill, pw - 8, (ph - 8) * fill); }
  if (st.parkAssist && st.phase !== 'parked') { ctx.lineWidth = 4; ctx.strokeStyle = `rgba(255,197,61,${(0.55 + 0.45 * Math.sin(clk * 6)).toFixed(3)})`; rr(P.x0 + 1, P.y0 + 1, pw - 2, ph - 2, 6); ctx.stroke(); }
  ctx.save(); ctx.globalAlpha = 0.35; text('P', P.x0 + pw / 2, P.y0 + ph / 2 + 2, Math.min(pw, ph) * 0.62, '#fff', 'center'); ctx.restore();
  // checkpoint flags
  for (const f of st.flags) {
    const x = f.x, y = f.y + 6, wave = Math.sin(clk * 6 + f.x) * 1.5, k = f.on ? Math.min(1, f.t / 0.25) : 0;
    ctx.fillStyle = 'rgba(28,26,54,0.25)'; ctx.beginPath(); ctx.ellipse(x + 1, y + 2, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink; ctx.fillRect(x - 1.25, y - 30, 2.5, 30);
    ctx.fillStyle = f.on ? C.gold : '#ffffff';
    const top = y - 30 + (1 - k) * 0;
    ctx.beginPath(); ctx.moveTo(x + 1.2, top); ctx.lineTo(x + 18, top + 6 + wave); ctx.lineTo(x + 1.2, top + 12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(28,26,54,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  }
  // signs (same look as the core's)
  ctx.font = '17px "Lilita One", "Arial Rounded MT Bold", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(28,26,54,0.55)';
  for (const sg of st.def.signs || []) ctx.fillText(sg.text, sg.x, sg.y);
  carDrawCritter(st);
  carDrawCones(st);
  carDrawDucks(st);
  carDrawTrain(st);
  carDrawGates(st);
  if (c.air <= 0) carDrawCar(st);
}
function carDrawTop(st) {
  if (!st || !st.grid || !st.car) return;
  if (st.car.air > 0) carDrawCar(st);
  for (const r of st.rings) {
    const k = r.t / 0.7;
    ctx.strokeStyle = `rgba(230,248,255,${(0.8 * (1 - k)).toFixed(3)})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(r.x, r.y, 10 + 34 * k, 7 + 24 * k, 0, 0, Math.PI * 2); ctx.stroke();
  }
}
function carDrawCritter(st) {
  const cr = st.critter;
  if (!cr) return;
  const hop = cr.t > 0 ? Math.sin((0.8 - cr.t) / 0.8 * Math.PI * 2) ** 2 * 6 : 0, x = cr.x, y = cr.y - hop;
  if (cr.kind === 'frog') {
    ctx.fillStyle = '#3f9d5a'; ctx.beginPath(); ctx.arc(cr.x, cr.y, 13, 0.4, Math.PI * 2 - 0.1); ctx.lineTo(cr.x, cr.y); ctx.fill();
    ctx.fillStyle = '#7fd36f'; circle(x, y, 7); ctx.fill();
    ctx.fillStyle = '#fff'; circle(x - 3.5, y - 5, 2.6); ctx.fill(); circle(x + 3.5, y - 5, 2.6); ctx.fill();
    ctx.fillStyle = C.ink; circle(x - 3.5, y - 5, 1.2); ctx.fill(); circle(x + 3.5, y - 5, 1.2); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.beginPath(); ctx.ellipse(cr.x, cr.y + 7, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(x, y, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(28,26,54,0.3)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#ffffff'; circle(x + 5, y - 6, 5); ctx.fill();
    ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.moveTo(x + 9, y - 7); ctx.lineTo(x + 14, y - 5.5); ctx.lineTo(x + 9, y - 4); ctx.fill();
    ctx.fillStyle = C.ink; circle(x + 6.5, y - 7.5, 1.1); ctx.fill();
  }
  if (cr.t > 0) carBubble(x, y - 22, cr.kind === 'frog' ? 'ribbit!' : 'quack!');
}
function carBubble(x, y, s) {
  ctx.font = '700 12px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(s).width + 14;
  ctx.fillStyle = '#ffffff'; rr(x - w / 2, y - 10, w, 20, 10); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 4, y + 9); ctx.lineTo(x + 4, y + 9); ctx.lineTo(x, y + 14); ctx.fill();
  text(s, x, y, 12, C.ink, 'center', 'body');
}
function carDrawCones(st) {
  for (const cn of st.cones) {
    if (cn.gone) {
      if (cn.sinkT < 0.4) { ctx.strokeStyle = `rgba(230,248,255,${(1 - cn.sinkT / 0.4).toFixed(3)})`; ctx.lineWidth = 2; circle(cn.x, cn.y, 4 + cn.sinkT * 30); ctx.stroke(); }
      continue;
    }
    ctx.save(); ctx.translate(cn.x, cn.y);
    if (cn.hit) {
      // knocked over: lying flat, spinning while it slides
      ctx.rotate(cn.rot);
      ctx.fillStyle = 'rgba(28,26,54,0.2)'; ctx.beginPath(); ctx.ellipse(1, 3, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.moveTo(-9, -5); ctx.lineTo(8, -1.5); ctx.lineTo(8, 1.5); ctx.lineTo(-9, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(-2, -3.4, 3.5, 6.8);
      ctx.fillStyle = '#e06a22'; ctx.fillRect(-11, -6, 3, 12);
    } else {
      // standing up (toy look)
      ctx.fillStyle = 'rgba(28,26,54,0.22)'; ctx.beginPath(); ctx.ellipse(2, 7, 9, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e06a22'; ctx.fillRect(-9, 4, 18, 4);
      ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(7, 5); ctx.lineTo(-7, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-3.6, -3.5); ctx.lineTo(3.6, -3.5); ctx.lineTo(4.6, -1); ctx.lineTo(-4.6, -1); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}
function carDrawDucks(st) {
  for (const d of st.ducks) {
    const walking = d.pause <= 0 && d.blockT === 0, fx = (d.bx - d.ax) / d.len * d.dir, fy = (d.by - d.ay) / d.len * d.dir;
    for (let k = d.n - 1; k >= 0; k--) {
      const p = carDuckPos(d, k), r = k ? 6 : 8, bob = walking ? Math.sin(G.clock * 12 + k * 1.7) * 1.2 : 0;
      const hop = k === 0 && d.hop > 0 ? Math.sin(d.hop / 0.35 * Math.PI) * 5 : 0;
      const x = p.x - fy * bob, y = p.y + fx * bob - hop;
      ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.beginPath(); ctx.ellipse(p.x + 1, p.y + r * 0.7, r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = k ? '#ffe066' : '#ffffff'; circle(x, y, r); ctx.fill();
      ctx.strokeStyle = 'rgba(28,26,54,0.3)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#ffb02e'; ctx.beginPath();
      ctx.moveTo(x + fx * (r + 4), y + fy * (r + 4)); ctx.lineTo(x + fx * (r - 1) - fy * 3, y + fy * (r - 1) + fx * 3); ctx.lineTo(x + fx * (r - 1) + fy * 3, y + fy * (r - 1) - fx * 3); ctx.fill();
      ctx.fillStyle = C.ink;
      circle(x + fx * r * 0.4 - fy * r * 0.45, y + fy * r * 0.4 + fx * r * 0.45, 1.2); ctx.fill();
      circle(x + fx * r * 0.4 + fy * r * 0.45, y + fy * r * 0.4 - fx * r * 0.45, 1.2); ctx.fill();
    }
    if (d.bubble > 0) { const m = carDuckPos(d, 0); carBubble(m.x, m.y - 24, d.bubble > 0.6 ? 'quack!' : '!'); }
  }
}
function carDrawTrain(st) {
  const t = st.tr;
  if (!t || !t.run) return;
  const cfg = t.cfg, x0 = t.x0 + 8, w = t.x1 - t.x0 - 16;
  ctx.save();
  ctx.beginPath(); ctx.rect(t.x0, t.roadTop, t.x1 - t.x0, t.roadBot - t.roadTop); ctx.clip();
  const cols = ['#e2483d', '#5b95ff', '#ffc53d'];
  for (let i = 0; i < cfg.cars; i++) {
    const y1 = t.front - i * (cfg.carLen + cfg.gap), y0 = y1 - cfg.carLen;
    if (y1 < t.roadTop || y0 > t.roadBot) continue;
    ctx.fillStyle = 'rgba(28,26,54,0.22)'; rr(x0 + 3, y0 + 4, w, cfg.carLen, 7); ctx.fill();
    ctx.fillStyle = cols[i % 3]; rr(x0, y0, w, cfg.carLen, 7); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
    if (i === 0) {
      ctx.fillStyle = '#ffd77a'; circle(x0 + 9, y1 - 4, 3); ctx.fill(); circle(x0 + w - 9, y1 - 4, 3); ctx.fill();
      ctx.fillStyle = C.ink; circle(x0 + w / 2, y1 - 12, 6); ctx.fill();
      ctx.fillStyle = '#bfe9ff'; rr(x0 + 6, y0 + 4, w - 12, 9, 3); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; rr(x0 + 6, y0 + 6, w - 12, cfg.carLen - 12, 4); ctx.fill();
    }
    if (i > 0) { ctx.fillStyle = C.ink; ctx.fillRect(x0 + w / 2 - 2, y1, 4, cfg.gap); }
  }
  ctx.restore();
  if (t.tootFx > 0 && t.front > t.roadTop && t.front - t.len < t.roadBot) carBubble((t.x0 + t.x1) / 2, clamp(t.front, t.roadTop + 30, t.roadBot) - 40, 'toot toot!');
  else if (t.tootFx > 0) carBubble((t.x0 + t.x1) / 2, t.y0 - 12, 'toot toot!');
}
function carDrawGates(st) {
  const t = st.tr;
  if (!t) return;
  const a = st.gateA, blink = st.gatesClosed && Math.floor(G.clock * 4) % 2 === 0;
  const span = t.roadBot - t.roadTop;
  for (let i = 0; i < 2; i++) {
    const gx = t.gx[i] * T + T / 2, top = i === 0, py = top ? t.roadTop - 3 : t.roadBot + 3, dir = top ? 1 : -1;
    const len = 10 + (span - 4) * a;
    // the arm
    ctx.save(); ctx.translate(gx, py);
    ctx.fillStyle = 'rgba(28,26,54,0.2)'; ctx.fillRect(-1, 3 * dir, 7, len * dir);
    for (let k = 0; k < len; k += 10) { ctx.fillStyle = (k / 10) % 2 ? '#ffffff' : '#ef4b4b'; ctx.fillRect(-3, dir * k, 6, dir * Math.min(10, len - k)); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.strokeRect(-3, 0, 6, dir * len);
    // the post and its lamp
    ctx.fillStyle = C.ink; circle(0, 0, 6); ctx.fill();
    ctx.fillStyle = blink ? '#ff5050' : '#7a2c3a'; circle(0, 0, 3.6); ctx.fill();
    if (blink) { ctx.fillStyle = 'rgba(255,80,80,0.3)'; circle(0, 0, 10); ctx.fill(); }
    ctx.restore();
  }
}
// the car: wheels, body, windshield, lights, Pip and Bo in their seats, and the steering wheel in front of the steerer
function carDrawCar(st) {
  const c = st.car, z = c.z || 0;
  let sc = (1 + z / 90) * (1 + c.pop * 0.6 * Math.sin(c.pop / 0.35 * Math.PI));
  let tint = 0;
  if (c.sink > 0) { const k = Math.min(1, c.sink / CAR.sinkT); sc *= 1 - 0.45 * k; tint = k; if (c.sink >= CAR.sinkT) return; }
  const sq = c.squash > 0 ? 1 - 0.12 * c.squash : 1;
  // shadow
  const sk = 1 - z / 150;
  ctx.save(); ctx.translate(c.x + 2 + 0.3 * z, c.y + 4 + 0.6 * z); ctx.rotate(c.a); ctx.scale(sk * sc, sk * sc);
  ctx.fillStyle = 'rgba(28,26,54,0.24)'; rr(-25, -15, 50, 30, 11); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a); ctx.scale(sc * sq, sc * (2 - sq));
  // wheels (the front ones turn toward where the steerer points, even when stopped)
  ctx.fillStyle = C.ink;
  for (const [wx, wy, front] of [[15, -15, 1], [15, 15, 1], [-15, -15, 0], [-15, 15, 0]]) {
    ctx.save(); ctx.translate(wx, wy); if (front) ctx.rotate(c.wheel); rr(-5, -3, 10, 6, 2); ctx.fill(); ctx.restore();
  }
  // body
  ctx.fillStyle = '#ffd77a'; rr(-24, -15, 48, 30, 10); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; rr(-20, -12, 40, 6, 3); ctx.fill();
  ctx.fillStyle = 'rgba(185,133,15,0.25)'; rr(-20, 7, 40, 5, 2.5); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(-24, -15, 48, 30, 10); ctx.stroke();
  // bonnet stripe, windshield, lights
  ctx.fillStyle = '#ffffff'; rr(13, -2.5, 9, 5, 2); ctx.fill();
  ctx.fillStyle = '#bfe9ff'; rr(8.5, -11.5, 4.5, 23, 2); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; rr(8.5, -11.5, 4.5, 23, 2); ctx.stroke();
  ctx.fillStyle = '#fffbe0'; circle(21.5, -9.5, 2.6); ctx.fill(); circle(21.5, 9.5, 2.6); ctx.fill();
  const braking = st.brake && c.v > 1, rev = c.v < -1;
  ctx.fillStyle = braking ? '#ff3030' : '#a8333f'; rr(-24.5, -12, 3, 5, 1); ctx.fill(); rr(-24.5, 7, 3, 5, 1); ctx.fill();
  if (braking) { ctx.fillStyle = 'rgba(255,60,60,0.3)'; circle(-26, -9.5, 5); ctx.fill(); circle(-26, 9.5, 5); ctx.fill(); }
  if (rev) { ctx.fillStyle = '#ffffff'; rr(-24.5, -5, 3, 3, 1); ctx.fill(); rr(-24.5, 2, 3, 3, 1); ctx.fill(); }
  // seats: Pip on the left (-y), Bo on the right (+y); the steering wheel sits in front of the steerer and slides over on a swap
  const sw = st.swapT > 0 ? st.swapT / 0.4 : 0;
  const wheelY = st.steer === 0 ? -7.5 + 15 * sw : 7.5 - 15 * sw;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(4, wheelY, 4.6); ctx.stroke();
  ctx.save(); ctx.translate(4, wheelY); ctx.rotate(c.wheel * 2); ctx.beginPath(); ctx.moveTo(0, -4.6); ctx.lineTo(0, 4.6); ctx.stroke(); ctx.restore();
  const hopK = st.swapT > 0 ? Math.sin(st.swapT / 0.4 * Math.PI) : 0;
  for (const id of [0, 1]) {
    const hy = id === 0 ? -7.5 : 7.5, pedal = id !== st.steer;
    const hx = -5 + (pedal ? c.lean : 0), hs = 1 + 0.3 * hopK;
    ctx.save(); ctx.translate(hx, hy); ctx.scale(hs, hs);
    if (id === 0) { // Pip's sprout leaf
      ctx.fillStyle = C.grassDark; ctx.beginPath(); ctx.ellipse(-7.5, -1.5, 4, 2, -0.5, 0, Math.PI * 2); ctx.fill();
    } else { // Bo's ears
      ctx.fillStyle = PDARK[1]; circle(-3, -6, 2.8); ctx.fill(); circle(-3, 6, 2.8); ctx.fill();
    }
    ctx.fillStyle = PCOL[id]; circle(0, 0, 7); ctx.fill();
    ctx.strokeStyle = PDARK[id]; ctx.lineWidth = 1.2; ctx.stroke();
    // eyes look along the heading; xx after a bump
    if (c.bumpT > 0) {
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.3; ctx.beginPath();
      for (const ey of [-2.6, 2.6]) { ctx.moveTo(2, ey - 1.5); ctx.lineTo(5, ey + 1.5); ctx.moveTo(5, ey - 1.5); ctx.lineTo(2, ey + 1.5); }
      ctx.stroke();
    } else {
      ctx.fillStyle = '#fff'; circle(3.6, -2.6, 2.1); ctx.fill(); circle(3.6, 2.6, 2.1); ctx.fill();
      ctx.fillStyle = C.ink; circle(4.4, -2.6, 1.1); ctx.fill(); circle(4.4, 2.6, 1.1); ctx.fill();
    }
    ctx.restore();
  }
  if (tint > 0) { ctx.fillStyle = `rgba(105,195,240,${(0.7 * tint).toFixed(3)})`; rr(-25, -16, 50, 32, 10); ctx.fill(); }
  ctx.restore();
  // honk: sound waves from the bonnet in the honker's colour
  for (const h of st.honkFx) {
    const k = 1 - h.t / 0.35, fx = c.x + Math.cos(c.a) * 28, fy = c.y + Math.sin(c.a) * 28;
    ctx.strokeStyle = PCOL[h.id]; ctx.globalAlpha = 1 - k; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const r of [8 + 16 * k, 16 + 16 * k]) { ctx.beginPath(); ctx.arc(fx, fy, r, c.a - 0.6, c.a + 0.6); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
}

/* ----- HUD: who does what (top right), the keys / a nudge (top centre), big messages, name tags ----- */
function carHud(st) {
  if (!st || !st.grid || !st.car || G.mode === 'title') return;
  const big = hudBig();
  carRolePill(st, big);
  carHintPill(st, big);
  if (st.msg) {
    const m = st.msg, s = big ? 1.5 : 1, a = clamp(m.t / 0.3, 0, 1), sz = (m.big ? 30 : 24) * s;
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = sz + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const w = Math.max(220 * s, ctx.measureText(m.text).width + 50 * s), h = (m.big ? 58 : 50) * s, y = big ? 150 : 120;
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(W / 2 - w / 2, y, w, h, 16 * s); ctx.fill();
    text(m.text, W / 2, y + h / 2 + 1, sz, m.col, 'center');
    ctx.restore();
  }
  const tagA = G.introT > 0 && G.mode === 'play' ? clamp(G.introT / 0.5, 0, 1) : clamp(st.tagT / 0.3, 0, 1);
  if (tagA > 0) carTags(st, tagA, big);
}
function carWheelIcon(x, y, r, col) {
  ctx.strokeStyle = col; ctx.lineWidth = r * 0.28; circle(x, y, r * 0.8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - r * 0.8, y); ctx.lineTo(x + r * 0.8, y); ctx.moveTo(x, y); ctx.lineTo(x, y + r * 0.8); ctx.stroke();
  ctx.fillStyle = col; circle(x, y, r * 0.25); ctx.fill();
}
// gas and brake: a little up arrow over a down arrow (the pedal player's two buttons)
function carPedalIcon(x, y, r, col) {
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(x, y - r * 0.95); ctx.lineTo(x + r * 0.7, y - r * 0.12); ctx.lineTo(x - r * 0.7, y - r * 0.12); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x, y + r * 0.95); ctx.lineTo(x + r * 0.7, y + r * 0.12); ctx.lineTo(x - r * 0.7, y + r * 0.12); ctx.closePath(); ctx.fill();
}
function carRolePill(st, big) {
  const s = big ? 1.55 : 1, h = 30 * s, fs = 14 * s, ir = 11 * s, y = 11;
  const sk = st.steer, pk = 1 - sk;
  const parts = [[sk, 'wheel', NAMES[sk], ' steers'], [pk, 'pedal', NAMES[pk], big ? ': pedals' : ': gas & brake']];
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const segW = parts.map(([, , n, r]) => ir * 2 + 6 * s + ctx.measureText(n + r).width);
  const gap = 18 * s, w = segW[0] + segW[1] + gap + 22 * s;
  const x0 = pill(W - 14, y, w, h, 'right');
  if (st.pulseT > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, st.pulseT) * (0.5 + 0.5 * Math.sin(st.pulseT * 18)); ctx.strokeStyle = C.gold; ctx.lineWidth = 3; rr(x0 - 2, y - 2, w + 4, h + 4, h / 2 + 2); ctx.stroke(); ctx.restore(); }
  let x = x0 + 11 * s;
  parts.forEach(([id, icon, n, r], i) => {
    const cx = x + ir, cy = y + h / 2;
    ctx.fillStyle = PCOL[id]; circle(cx, cy, ir); ctx.fill();
    if (icon === 'wheel') carWheelIcon(cx, cy, ir * 0.8, '#fff'); else carPedalIcon(cx, cy, ir * 0.8, '#fff');
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    let tx = cx + ir + 6 * s;
    text(n, tx, cy + 0.5, fs, PCOL[id], 'left', 'body'); tx += ctx.measureText(n).width;
    text(r, tx, cy + 0.5, fs, C.paper, 'left', 'body');
    x += segW[i] + gap;
  });
}
function carHintPill(st, big) {
  const sk = st.steer, pk = 1 - sk, n = st.nudge;
  let parts;
  if (n) parts = [[n.text, C.paper, n.id]];
  else if (st.hint > 0 || G.introT > 0) parts = [[NAMES[sk] + ': ', PCOL[sk]], [carKeys(sk, 'steer'), C.paper], ['     ', C.paper], [NAMES[pk] + ': ', PCOL[pk]], [carKeys(pk, 'pedals'), C.paper]];
  else return;
  const s = big ? 1.5 : 1, fs = 13 * s, h = 26 * s, y = big ? 84 : 46;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const tw = parts.reduce((a, [t]) => a + ctx.measureText(t).width, 0), dot = n ? 14 * s : 0;
  const w = tw + 28 * s + dot;
  const a = n ? 1 : clamp(Math.max(st.hint, G.introT) / 0.5, 0, 1);
  ctx.save(); ctx.globalAlpha = a;
  const x0 = pill(W / 2, y, w, h, 'center');
  if (n) { ctx.fillStyle = PCOL[n.id]; circle(x0 + 14 * s, y + h / 2, 5 * s); ctx.fill(); }
  let x = x0 + 14 * s + dot;
  for (const [t, col] of parts) { text(t, x, y + h / 2 + 0.5, fs, col, 'left', 'body'); ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; x += ctx.measureText(t).width; }
  ctx.restore();
}
// "Pip · steers" / "Bo · pedals" tags over the car (room card, and after a swap)
function carTags(st, a, big) {
  const c = st.car, s = big ? 1.4 : 1, fs = 12 * s, h = 19 * s;
  const lines = [[st.steer, NAMES[st.steer] + ' · steers'], [1 - st.steer, NAMES[1 - st.steer] + ' · pedals']];
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = Math.max(...lines.map(([, t]) => ctx.measureText(t).width)) + 18 * s;
  const above = c.y - 26 - 2 * h - 4 > (big ? 130 : 84);
  let y = above ? c.y - 26 - 2 * h - 4 : c.y + 26;
  const x = clamp(c.x, w / 2 + 4, W - w / 2 - 4);
  for (const [id, t] of lines) {
    ctx.fillStyle = PCOL[id]; rr(x - w / 2, y, w, h, h / 2); ctx.fill();
    text(t, x, y + h / 2 + 0.5, fs, '#fff', 'center', 'body');
    y += h + 4;
  }
  if (above) { ctx.fillStyle = PCOL[1 - st.steer]; ctx.beginPath(); ctx.moveTo(x - 5, y - 4); ctx.lineTo(x + 5, y - 4); ctx.lineTo(x, y + 2); ctx.fill(); }
  ctx.restore();
}

MODES.car = {
  medals: { bronze: 'Park all four times', goals: [{ key: 'time', gold: 105, silver: 180 }, { key: 'cones', gold: 0, silver: 4, word: 'cone' }] },
  medalValues() { const s = G.mst.stats; return s ? { cones: s.cones } : {}; },
  CFG: CAR, rand: Math.random,
  setup(st, L) {
    st.stats = { steerT: [0, 0], honks: [0, 0], cones: 0, jumps: 0, quacks: 0, swaps: 0, splashes: 0, tows: 0, bumps: 0, perfect: 0, parks: 0 };
    carRoom(st, L, 0);
  },
  room(k, L) { carRoom(G.mst, L, k); },
  step(dt) { carStep(G.mst, dt); },
  draw() { carDraw(G.mst); },
  drawTop() { carDrawTop(G.mst); },
  hud() { carHud(G.mst); },
  stats() {
    const s = G.mst.stats;
    if (!s) return [];
    const pl = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');
    return [
      { label: 'Steering time', values: [Math.round(s.steerT[0]) + ' s', Math.round(s.steerT[1]) + ' s'] },
      { label: 'Honks', values: [s.honks[0], s.honks[1]] },
      { label: 'Perfect parks', value: s.perfect + ' of ' + (G.mst.n || 4) },
      { label: 'Cones bumped', value: s.cones },
      `${pl(s.jumps, 'big jump')} landed · ${pl(s.quacks, 'quack')}${s.splashes ? ' · ' + pl(s.splashes, 'splash', 'splashes') : ''}`,
    ];
  },
};
Sfx.extra.carHonk = function (p) { this.tone(415 * p, 0.16, 'square', 0.045); this.tone(523 * p, 0.16, 'square', 0.035); };
Sfx.extra.carSqueak = function () { this.tone(1500, 0.14, 'triangle', 0.018, 1100); };
Sfx.extra.carThud = function () { this.tone(150, 0.12, 'triangle', 0.08, 80); this.tone(260, 0.05, 'square', 0.03, 180); };
Sfx.extra.carCone = function () { this.tone(760, 0.05, 'square', 0.035, 520); this.tone(380, 0.08, 'triangle', 0.04, 260, 0.02); };
Sfx.extra.carQuack = function () { this.tone(600, 0.06, 'sawtooth', 0.035, 420); this.tone(560, 0.07, 'sawtooth', 0.03, 380, 0.09); };
Sfx.extra.carRibbit = function () { this.tone(220, 0.07, 'square', 0.03, 160); this.tone(240, 0.08, 'square', 0.03, 170, 0.1); };
Sfx.extra.carPlop = function () { this.tone(700, 0.12, 'sine', 0.05, 180); };
Sfx.extra.carLaunch = function () { this.tone(240, 0.3, 'sine', 0.07, 720); this.tone(480, 0.12, 'square', 0.02, 900); };
Sfx.extra.carThump = function () { this.tone(120, 0.14, 'triangle', 0.09, 70); };
Sfx.extra.carZoom = function () { this.tone(330, 0.35, 'sawtooth', 0.03, 1100); this.tone(660, 0.25, 'square', 0.02, 1320, 0.05); };
Sfx.extra.carSwap = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.carToot = function () { [0, 0.3].forEach(d => { this.tone(587, 0.22, 'square', 0.03, null, d); this.tone(740, 0.22, 'square', 0.025, null, d); }); };
Sfx.extra.carClack = function () { this.tone(1300, 0.025, 'square', 0.012); };
Sfx.extra.carBell = function () { this.tone(1568, 0.07, 'triangle', 0.035); this.tone(2093, 0.05, 'triangle', 0.02, null, 0.01); };
Sfx.extra.carParked = function () { [659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.06, null, i * 0.07)); };
Sfx.extra.carTow = function () { this.tone(880, 0.08, 'square', 0.03); this.tone(880, 0.08, 'square', 0.03, null, 0.15); };
Sfx.extra.carRevBeep = function () { this.tone(1050, 0.09, 'square', 0.02); };
/* ===== end of 5-1 Two-Seat Car ===== */

