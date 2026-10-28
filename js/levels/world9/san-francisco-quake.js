/* Pip & Bo - Level 9-2 San Francisco 1906 Quake (team). */
'use strict';

/* ===== San Francisco 1906 Quake (mode 'quake', World 9 "Great Escapes", team) =====
   Gavyn's idea: "The ground cracks and shifts, and you hold up a wobbly bridge for each other to cross."
   Every room has two streets, one per player. Over each crack lies a plank bridge balanced on its middle, and it is
   worked from the OTHER street: a rope comes down to a lower bridge from a winch above it, a prop pole goes up to an
   upper bridge from a foot plate below it. So the two leapfrog: I hold yours, you cross and hold mine, and so on.
   The holder stands on the crank and HOLDS the action; then ◀ ▶ balance the bridge (keep the ball in the green)
   against the rumble waves and the crosser's weight. A slip only slides the crosser back to the start ("Whoa!"), a
   crossed bridge is bolted down for good, and a fall into a crack pops you back on your last safe spot ("Oops!").
   Room 2 and 4 have a cable car (the holder pulls it across with ◀ ▶), rooms 3 and 4 have crates on the planks.
   Map markers (replaced in G.level.grid; the def is never changed): ~ crack with a plank, _ crack with a cable car
   (both on a street band: rows 8-9 upper, 16-17 lower), h crank (row 7 / 15, holds the crack in the other street
   whose columns it sits in), x crate (on a plank), D drop gate (solid until every crossing is done).
   Room def: { title, tip, deco: 'nob'|'cable'|'market'|'ferry', quake: { amp, calm: [min, max], len: [min, max] }, map }
   All state lives in G.mst; every global here starts with quake / QUAKE (Sfx.extra.quake* too). */
const QUAKE = {
  upY: 240, loY: 480, bandBot: 300,          // street tops (upper, lower) and the underside of the upper street
  over: 8, plankTh: 9, maxEnd: 16,           // plank overhang onto each street, thickness, end lift at full tilt (px)
  raiseT: 0.45, droopT: 0.5, letGo: 0.25,    // swing up when held, droop when let go (after a short grace)
  crankR: 15, stepUp: 18, tiptoe: 0.4,       // stand this close to a crank's centre to grab it; step up onto a tilted plank end; speed on a wobbly plank
  // the ball (balance): accel = load*Kload + crates*Kcrate + quake + input*Kin - Ks*ball - D*velocity
  // (on its own it settles back to the middle; a partner's weight or a rumble pushes it out, the holder pushes it back)
  Kin: 5.5, Kload: 3.6, Kcrate: 1.0, Ks: 0.4, D: 2.2, green: 0.35, red: 0.7, redHold: 0.7,   // in the red this long (or at the end) = a slip
  slideAt: 0.4, slideV: 70,                  // past 0.4 tilt the crosser slides downhill (px/s at full tilt)
  thump: 0.4,                                // a hop landing at the very end of a plank kicks the ball this hard
  whoaT: 0.55, settleT: 1.0, settleQ: 0.3,   // the slide back; after a whoa the rumble is weaker on that bridge for a moment
  // rumble waves
  warnT: 1.5, firstUp: 1.5, firstMax: 12, calmQ: 0.3, shakeK: 1.6, joltEvery: [0.5, 0.9], joltK: 0.3,
  // cable car
  carW: 90, carV: 85, carAcc: 420, carBack: 45, carJolt: 30, goldCar: 1.5,
  // crates
  crateW: 26, crateH: 24, crateAcc: 900, crateFric: 1.4, crateStick: 0.22, pushV: 70, bonkV: 70, boingV: 520,
  // help (gold, announced)
  goldAfter: 2, goldQ: 0.45, goldLoad: 0.6, goldD: 1.8,   // gold braces: weaker rumble, lighter crossers, steadier ball
  settleD: 4, settleK: 6,                    // for a moment after a whoa (nobody on) the ball swings back to the middle
  // soft failure
  fallDepth: 45, rescueT: 0.6, edgeSafe: 16,
  // hints (s)
  roleT: 6, crankHint: 4, gripHint: 1.0, goHint: 2.5, pushHint: 2, hintLife: 2.6,
};
// painted-lady colours: facade, trim shade, roof
const QUAKE_HOUSES = [['#f7b8c8', '#d97f98', '#8f5a8c'], ['#bfe6cf', '#7fbf9c', '#4f7f8f'], ['#ffe39a', '#e0b453', '#b06a4a'],
  ['#c9d8ff', '#8ea6e6', '#5d5a9a'], ['#e5c6f2', '#b48fcc', '#7a4f8f'], ['#ffd0a8', '#e09a68', '#9a5a46']];
const QUAKE_SHOPS = [['#f3c7a6', 'TEA ROOM', '#e8344e'], ['#cfe7f5', 'BAKERY', '#f2a33a'], ['#f8e1a1', 'TOYS', '#5b95ff'],
  ['#d9f0c6', 'HATS', '#2f9b6a'], ['#f5cde0', 'CANDY', '#ff6b9a'], ['#e3dcf6', 'BOOKS', '#7a5ac8']];
// one look per room: sky, far hills, and the historic touch on a street sign
const QUAKE_LOOK = {
  nob: { skyTop: '#86cdf0', skyBot: '#ffe6c8', hill: '#b8c9e8', hill2: '#9fb7dd', sign: 'San Francisco, 1906' },
  cable: { skyTop: '#90d4f2', skyBot: '#fff0d6', hill: '#c3d6c0', hill2: '#a6c4a8', sign: 'Powell St · 1906' },
  market: { skyTop: '#a0d8f4', skyBot: '#fff3dc', hill: '#d4c6e2', hill2: '#bba9d2', sign: 'Market St' },
  ferry: { skyTop: '#7cc0ea', skyBot: '#ffd7b0', hill: '#b7c3e0', hill2: '#9aaad0', sign: 'Ferry Building · 1906' },
};
let quakeBg = null, quakeRoomN = 0;   // the painted backdrop (sky, houses, streets, cracks), cached per room and canvas size
const quakeR = () => MODES.quake.rand();
const quakeEase = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const quakeLaneY = ln => (ln ? QUAKE.loY : QUAKE.upY);
const quakeLaneOf = p => (p.y + p.h <= QUAKE.bandBot ? 0 : 1);
// particles only while frames can age them (bots step thousands of ticks without a frame)
const quakePuff = (x, y, n, col) => { if (G.particles.length < 480) puff(x, y, n, col); };
const quakeBurst = (x, y, col, n) => { if (G.particles.length < 480) burst(x, y, col, n); };

/* ---------- the room ---------- */
function quakeNewBridge(lane, c0, c1, kind) {
  const x0 = c0 * T, x1 = (c1 + 1) * T, cy = quakeLaneY(lane), hw = (x1 - x0) / 2;
  const br = { lane, kind, c0, c1, x0, x1, cx: (x0 + x1) / 2, cy, hw, hl: hw + QUAKE.over, crank: null, crates: [],
    up: 0, b: 0, v: 0, th: 0, prevTh: 0, held: -1, lastHolder: -1, letGo: 0, done: false, gold: false, whoas: 0,
    settle: 0, saveArm: false, redT: 0, flash: 0, boltT: 0, upT: 0, ph: quakeR() * 6, droopDir: 1, crossT0: null, clean: true,
    // cable car: position 0..1 along the crack, speed (px/s), parked at the far side for good once a rider docks
    s: 0, vel: 0, parked: false, rollbacks: 0, peakS: 0, travel: (x1 - x0) - 30, carX: 0, prevCarX: 0, bellT: 0 };
  br.thMax = Math.atan(QUAKE.maxEnd / br.hl);
  br.droopDir = lane ? -1 : 1;
  if (kind === 'car') { br.up = 1; br.carX = br.prevCarX = x0 - 30; }
  br.th = br.prevTh = kind === 'car' ? 0 : quakePose(br).th;
  return br;
}
function quakeRoom(st, L) {
  const def = L.def, grid = L.grid;
  st.cfg = Object.assign({ amp: 1.4, calm: [6, 8], len: [2.4, 3.0] }, def.quake || {});
  st.deco = def.deco || 'nob'; st.look = QUAKE_LOOK[st.deco] || QUAKE_LOOK.nob;
  st.bridges = []; st.gate = []; st.gateOpen = false; st.gateT = 0; st.gateSay = 0; st.roomN = ++quakeRoomN;
  for (const [row, ln] of [[8, 0], [16, 1]]) {
    for (let c = 0; c < COLS; c++) {
      const ch = grid[row][c];
      if (ch !== '~' && ch !== '_') continue;
      let c1 = c; while (c1 + 1 < COLS && grid[row][c1 + 1] === ch) c1++;
      st.bridges.push(quakeNewBridge(ln, c, c1, ch === '_' ? 'car' : 'plank'));
      c = c1;
    }
  }
  for (const r of [8, 9, 16, 17]) for (let c = 0; c < COLS; c++) {
    const ch = grid[r][c];
    if (ch === '~' || ch === '_') grid[r][c] = '.';
    else if (ch === 'D') { st.gate.push({ c, r }); grid[r][c] = '#'; }
  }
  for (const [row, ln] of [[7, 0], [15, 1]]) for (let c = 0; c < COLS; c++) {
    const ch = grid[row][c];
    if (ch === 'h') {
      const br = st.bridges.find(b => b.lane !== ln && c >= b.c0 && c <= b.c1);
      if (br) br.crank = { x: c * T + T / 2, lane: ln, y: quakeLaneY(ln) };
      grid[row][c] = '.';
    } else if (ch === 'x') {
      const br = st.bridges.find(b => b.lane === ln && c >= b.c0 && c <= b.c1);
      if (br) br.crates.push({ u: c * T + T / 2 - br.cx, vu: 0, gone: false, fall: null, boing: 0, wob: quakeR() * 6 });
      grid[row][c] = '.';
    }
  }
  for (const br of st.bridges) if (!br.crank) console.warn('quake: crack at columns ' + br.c0 + '-' + br.c1 + ' has no crank');
  st.bridges.sort((a, b) => a.x0 - b.x0);
  st.bridges.forEach((b, i) => { b.i = i; });
  // who is on which street (spawns): lanePl[0] upper, lanePl[1] lower
  st.lanePl = [0, 1].map(ln => G.players.find(p => quakeLaneOf(p) === ln) ? G.players.find(p => quakeLaneOf(p) === ln).id : ln);
  st.pl = G.players.map(p => ({ on: null, prevFeet: p.y + p.h, prevX: p.x, prevCx: p.x + p.w / 2, prevVy: 0, wasGround: true,
    safe: { x: p.x, y: p.y }, whoa: null, grip: null, gripT: 0, enter: 0, aboard: null, boingCD: 0, bonkCD: 0,
    still: 0, offCrank: 0, notGrip: 0, idle: 0, hint: null, said: {} }));
  // rumble waves: 'wait' (until a bridge has been up a moment) -> 'warn' -> 'shake' -> 'calm' -> 'warn' ...
  st.wave = { phase: 'wait', t: 0, dur: 0, I: 0, q: 0, n: 0, ph1: quakeR() * 6, ph2: quakeR() * 6, jolt: 0.7, tick: 0, rumbleT: 0, teaT: 0 };
  st.seis = new Float32Array(96); st.seisK = 0; st.seisT = 0;
  st.pops = []; st.dust = []; st.roomT = 0; st.crackFx = 0.9; st.banner = null;
  st.gulls = [0, 1, 2].map(k => ({ x: 160 + k * 330 + quakeR() * 80, y: 60 + quakeR() * 40, fly: 0, ph: quakeR() * 6 }));
  st.liveT = 0; st.roomIdx = def.roomIndex || 0;
  quakeLayout(st, grid);
}
function quakePose(br) {   // the plank's angle and the height of its middle (drooped when nobody holds it)
  if (br.kind === 'car') return { th: 0, py: br.cy };
  const e = quakeEase(br.up), droopTh = (br.lane ? 0.38 : 0.26) * br.droopDir, droopY = br.lane ? 45 : 28;
  return { th: droopTh + (br.b * br.thMax - droopTh) * e, py: br.cy + droopY * (1 - e) };
}
const quakeWalkable = br => br.kind === 'car' || br.done || br.up >= 1;
function quakeSpan(br) { return br.kind === 'car' ? [br.carX + 3, br.carX + QUAKE.carW - 3] : [br.cx - br.hl, br.cx + br.hl]; }
function quakeSurf(br, x, prev) { return br.kind === 'car' ? br.cy : br.cy + Math.tan(prev ? br.prevTh : br.th) * (x - br.cx); }
const quakeOverCrack = (br, p) => { const cx = p.x + p.w / 2; return cx > br.x0 && cx < br.x1; };
// catch-up help is announced in a gold banner under the seismograph
function quakeBanner(st, s) { st.banner = { s, t: 0 }; }
function quakePop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || C.gold, size: size || 18, t: 0 }); }
// a hint bubble over a player; key: only once per room
function quakeSay(st, id, s, key, life) {
  const P = st.pl[id];
  if (key) { if (P.said[key]) return; P.said[key] = true; }
  P.hint = { s, t: 0, life: life || QUAKE.hintLife };
}
// each player's own keys for hints (keyboard, controller or touch)
function quakeKey(id, what) {
  const how = actKey(id);
  if (what === 'act') return how === 'pad' ? glyph('act') : how === 'touch' ? 'hold' : id === 0 ? 'F' : '/';
  return how === 'kb' ? (id === 0 ? 'D' : '→') : how === 'pad' ? 'stick ▶' : '▶';
}
function quakeHoldWords(id, keep) { const k = quakeKey(id, 'act'); return (keep ? 'Keep holding ' : 'Hold ') + (k === 'hold' ? 'the round button' : k) + '!'; }
// the next crossing still to do (they go left to right) and who does what for it
function quakeActive(st) {
  const br = st.bridges.find(b => !b.done) || null;
  if (!br) return null;
  return { br, X: st.lanePl[br.lane], H: st.lanePl[1 - br.lane] };
}

/* ---------- rumble waves ---------- */
function quakeWaveStep(st, dt) {
  const w = st.wave, cfg = st.cfg, R = quakeR;
  w.t += dt; w.tick += dt;
  const live = G.introT <= 0;
  if (w.phase === 'wait') {
    // the very first crossing of the level is calm, so you can learn; later rooms rumble once a bridge is up a moment
    const ready = st.roomIdx === 0 ? st.bridges.some(b => b.done) : st.bridges.some(b => b.kind === 'plank' && b.up >= 1 && b.upT >= QUAKE.firstUp && !b.done);
    if (live && (ready || st.roomT >= QUAKE.firstMax * (st.roomIdx === 0 ? 2 : 1))) quakeWavePhase(st, 'warn');
  } else if (w.t >= w.dur) {
    if (w.phase === 'warn') quakeWavePhase(st, 'shake');
    else if (w.phase === 'shake') quakeWavePhase(st, 'calm');
    else quakeWavePhase(st, 'warn');
  }
  // intensity 0..1 and the shared push signal (each bridge adds its own phase)
  const f = w.dur > 0 ? w.t / w.dur : 0;
  w.I = w.phase === 'warn' ? 0.18 * f : w.phase === 'shake' ? Math.min(1, w.t / 0.35, (w.dur - w.t) / 0.5 + 0.1) : 0;
  w.I = Math.max(0, w.I);
  if (w.phase === 'shake') {
    w.jolt -= dt;
    if (w.jolt <= 0) {
      w.jolt = QUAKE.joltEvery[0] + R() * (QUAKE.joltEvery[1] - QUAKE.joltEvery[0]);
      for (const br of st.bridges) if (!br.done && br.up >= 1) br.v += (R() < 0.5 ? -1 : 1) * QUAKE.joltK * cfg.amp * w.I * (br.gold ? QUAKE.goldQ : 1) * (br.settle > 0 ? QUAKE.settleQ : 1);
    }
    // feel it: a gentle shake, controller pulses, dust from under the upper street, teacups
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.03 + 0.05 * w.I);
    w.rumbleT -= dt;
    if (w.rumbleT <= 0) { w.rumbleT = 0.45; rumble(0, 0.12 * w.I, 0.35 * w.I, 220); rumble(1, 0.12 * w.I, 0.35 * w.I, 220); }
    w.teaT -= dt;
    if (w.teaT <= 0) { w.teaT = 0.35 + R() * 0.4; Sfx.play('quakeTeacup'); }
    if (st.dust.length < 40 && R() < dt * 30 * w.I) st.dust.push({ x: R() * W, y: QUAKE.bandBot + 2, vy: 30 + R() * 40, life: 1.4, size: 1.5 + R() * 2.5 });
  } else if (w.phase === 'warn') {
    w.teaT -= dt;
    if (w.teaT <= 0) { w.teaT = 0.5 + R() * 0.3; Sfx.play('quakeTeacup'); }
  }
  w.q = cfg.amp * (w.I * QUAKE.shakeK + (w.phase === 'calm' || w.phase === 'wait' ? QUAKE.calmQ : 0));
  // seismograph trace (30 samples a second)
  st.seisT += dt;
  while (st.seisT >= 1 / 30) {
    st.seisT -= 1 / 30;
    const v = (w.phase === 'warn' ? 0.25 * (0.4 + f) * Math.sin(G.time * 70) : 0) + w.I * (0.75 * Math.sin(G.time * 23 + w.ph1) + 0.35 * Math.sin(G.time * 51)) + 0.06 * Math.sin(G.time * 9);
    st.seis[st.seisK] = clamp(v, -1, 1); st.seisK = (st.seisK + 1) % st.seis.length;
  }
}
function quakeWavePhase(st, ph) {
  const w = st.wave, cfg = st.cfg, R = quakeR;
  w.phase = ph; w.t = 0;
  if (ph === 'warn') { w.dur = QUAKE.warnT; w.teaT = 0; Sfx.play('quakeWarn'); rumble(0, 0, 0.25, 150); rumble(1, 0, 0.25, 150); }
  else if (ph === 'shake') {
    w.dur = cfg.len[0] + R() * (cfg.len[1] - cfg.len[0]); w.n++; w.ph1 = R() * 6; w.ph2 = R() * 6; w.jolt = 0.3; w.rumbleT = 0;
    Sfx.play('quakeShake');
    for (const g of st.gulls) g.fly = 1;
  } else if (ph === 'calm') w.dur = cfg.calm[0] + R() * (cfg.calm[1] - cfg.calm[0]);
}
// the push on one bridge's ball this tick (bridges sway a little out of step with each other)
function quakeForce(st, br) {
  const w = st.wave, t = G.time;
  const s = 0.65 * Math.sin(2 * Math.PI * 0.55 * t + w.ph1 + br.ph) + 0.45 * Math.sin(2 * Math.PI * 1.35 * t + w.ph2 + br.ph * 1.7);
  return w.q * s;
}

/* ---------- holding: grab the crank you stand on (hold the action) ---------- */
function quakeGrips(st, dt) {
  for (const br of st.bridges) br.held = -1;
  for (const p of G.players) {
    const P = st.pl[p.id];
    let g = null;
    if (p.alive && !P.whoa && p.input.act && p.grounded && !P.on) {
      const cx = p.x + p.w / 2;
      for (const br of st.bridges) {
        if (br.done || !br.crank || br.crank.lane !== quakeLaneOf(p)) continue;
        if (Math.abs(cx - br.crank.x) <= (P.grip === br ? 24 : QUAKE.crankR) && Math.abs(p.y + p.h - br.crank.y) < 3) { g = br; break; }
      }
    }
    if (g !== P.grip) {
      if (g) { Sfx.play('quakeGrip', p.id); rumble(p.id, 0.1, 0.3, 70); P.gripT = 0; }
      else if (P.grip && !P.grip.done) Sfx.play('quakeRelease', p.id);
      P.grip = g;
    }
    if (g) {
      g.held = p.id; g.lastHolder = p.id; P.gripT += dt;
      // the holder stays put: ◀ ▶ balance the bridge instead of walking
      p.x = g.crank.x - p.w / 2; p.vx = 0; p.carryVx = 0;
    }
  }
}

/* ---------- planks ---------- */
function quakePlankStep(st, br, dt) {
  br.prevTh = br.th; br.flash = Math.max(0, br.flash - dt); br.settle = Math.max(0, br.settle - dt);
  if (br.done) { br.boltT += dt; br.up = 1; br.b = approach(br.b, 0, dt * 2.5); br.v = 0; br.th = br.b * br.thMax; return; }
  const H = br.held >= 0 ? G.players[br.held] : null;
  if (H) {
    br.letGo = QUAKE.letGo;
    if (br.up < 1) {
      br.up = Math.min(1, br.up + dt / QUAKE.raiseT); br.b = 0; br.v = 0;
      if (br.up >= 1) { br.upT = 0; Sfx.play('quakeUp'); quakePuff(br.cx, br.cy, 6, 'rgba(255,255,255,0.8)'); }
    }
  } else if (br.letGo > 0) br.letGo -= dt;
  else if (br.up > 0) {
    if (br.up >= 1) {
      // let go with someone on the plank: they slide back to the start, never into the crack
      for (const p of G.players) if (quakeRiding(st, p, br)) quakeWhoa(st, p, br, 'letgo');
      Sfx.play('quakeDroop');
    }
    br.up = Math.max(0, br.up - dt / QUAKE.droopT); br.v = 0;
    br.b = approach(br.b, 0, dt * 2);
  }
  if (br.up >= 1) {
    br.upT += dt;
    let load = 0, crates = 0, riders = 0;
    for (const p of G.players) if (quakeRiding(st, p, br)) { load += clamp((p.x + p.w / 2 - br.cx) / br.hw, -1, 1); riders++; }
    for (const c of br.crates) if (!c.gone) crates += clamp(c.u / br.hw, -1, 1);
    const lw = br.gold ? QUAKE.goldLoad : 1, qk = (br.gold ? QUAKE.goldQ : 1) * (br.settle > 0 ? QUAKE.settleQ : 1);
    const inp = H ? (H.input.right ? 1 : 0) - (H.input.left ? 1 : 0) : 0;
    // gold braces also steady it (more damping); just after a whoa, with nobody on, it settles back to the middle
    const damp = QUAKE.D * (br.gold ? QUAKE.goldD : 1) + (br.settle > 0 && !riders ? QUAKE.settleD : 0);
    const a = (load * QUAKE.Kload + crates * QUAKE.Kcrate) * lw + quakeForce(st, br) * qk + inp * QUAKE.Kin - br.b * (QUAKE.Ks + (br.settle > 0 && !riders ? QUAKE.settleK : 0)) - br.v * damp;
    br.v += a * dt; br.b += br.v * dt;
    if (Math.abs(br.b) > 1) {
      if (Math.abs(br.v) > 0.6) Sfx.play('quakeClonk');
      br.b = Math.sign(br.b); if (br.v * br.b > 0) br.v = -br.v * 0.25;
    }
    br.th = br.b * br.thMax;
  } else br.th = quakePose(br).th;
}
// the ball's state for feedback: red with a crosser on (warning blip), back to green = a wobble saved
function quakeBallWatch(st, br, dt) {
  if (br.kind !== 'plank' || br.done || br.up < 1) { br.saveArm = false; br.redT = 0; return; }
  const crosser = G.players.find(p => quakeRiding(st, p, br));
  const ab = Math.abs(br.b);
  if (crosser && ab >= QUAKE.red) {
    if (!br.saveArm) { br.saveArm = true; Sfx.play('quakeWobble'); if (br.held >= 0) rumble(br.held, 0.25, 0.4, 120); }
    br.redT += dt;
  } else br.redT = 0;
  if (br.saveArm && ab < QUAKE.green && crosser) quakeSaved(st, br);
  if (!crosser && ab < QUAKE.green) br.saveArm = false;
  // a slip: the ball hits the end, or stays in the red too long, with someone over the crack
  if (crosser && (ab >= 1 || br.redT >= QUAKE.redHold)) quakeWhoa(st, crosser, br, 'slip');
}
function quakeSaved(st, br) {
  br.saveArm = false;
  const h = br.held >= 0 ? br.held : br.lastHolder;
  if (h >= 0) {
    st.stats.saved[h]++;
    const p = G.players[h];
    quakePop(st, p.x + p.w / 2, p.y - 82, 'Saved!', C.gold, 18);
  }
  Sfx.play('quakeSaved');
}
function quakeWhoa(st, p, br, why) {
  const P = st.pl[p.id];
  if (P.whoa) return;
  const side = P.enter > 0 ? 1 : -1;   // back to the street they came from
  const tx = side < 0 ? br.x0 - 12 - p.w : br.x1 + 12;
  P.whoa = { t: 0, x0: p.x, y0: p.y, x1: tx, y1: br.cy - p.h };
  P.on = null; p.vx = 0; p.vy = 0; p.carryVx = 0; p.jumping = false;
  br.whoas++; br.clean = false; st.stats.whoas++; st.streak = 0;
  const h = br.held >= 0 ? br.held : br.lastHolder;
  br.saveArm = false; br.b = clamp(br.b, -1, 1) * 0.4; br.v = 0; br.settle = QUAKE.settleT;
  quakePop(st, p.x + p.w / 2, p.y - 18, 'Whoa!', '#ffffff', 22);
  Sfx.play('quakeWhoa', p.id); rumble(p.id, 0.3, 0.5, 160);
  if (h >= 0 && h !== p.id) {
    if (why === 'letgo') quakeSay(st, h, quakeHoldWords(h, true), null, 2.2);
    else quakeSay(st, h, 'Keep the ball in the green!', 'green');
  }
  if (why === 'slip' && st.wave.phase === 'shake') quakeSay(st, p.id, 'Wait for the calm, then go!', 'calm');
  // gold braces after 2 whoas on a bridge, or after 1 for a holder whose last bridge needed them too
  if (br.whoas >= (h >= 0 && st.help[h] ? 1 : QUAKE.goldAfter) && !br.gold) {
    br.gold = true; st.stats.golds++;
    if (h >= 0) st.help[h] = true;
    quakeBanner(st, 'Gold braces: less wobble!');
    Sfx.play('quakeGold'); quakeBurst(br.cx, br.cy, C.gold, 14);
  }
}
function quakeWhoaStep(st, p, dt) {
  const P = st.pl[p.id], w = P.whoa;
  w.t += dt;
  const f = Math.min(1, w.t / QUAKE.whoaT), e = quakeEase(f);
  p.x = w.x0 + (w.x1 - w.x0) * e;
  p.y = w.y0 + (w.y1 - w.y0) * e - Math.sin(Math.PI * f) * 26;
  p.vx = 0; p.vy = 0; p.pendingJump = false; p.jumpBuf = 0;   // (no dizzy stun: it's only a gentle slide back)
  if (f >= 1) { P.whoa = null; p.y = w.y1; p.grounded = true; P.prevFeet = p.y + p.h; }
}

/* ---------- the cable car ---------- */
function quakeCarStep(st, br, dt) {
  br.prevCarX = br.carX; br.bellT = Math.max(0, br.bellT - dt); br.flash = Math.max(0, br.flash - dt);
  const riders = G.players.filter(p => p.alive && st.pl[p.id].on === br);
  if (br.done || br.parked) { br.vel = 0; br.s = 1; }
  else {
    const H = br.held >= 0 ? G.players[br.held] : null, w = st.wave;
    if (H) {
      const inp = (H.input.right ? 1 : 0) - (H.input.left ? 1 : 0);
      // an empty car the holder isn't pulling rolls back down to the rider (so it can't be left out over the crack)
      const want = !riders.length && inp <= 0 && br.s > 0 ? -QUAKE.carBack : inp * QUAKE.carV * (br.gold ? QUAKE.goldCar : 1);
      br.vel = approach(br.vel, want, QUAKE.carAcc * dt);
      if (!br.gold) br.vel += quakeForce(st, br) * QUAKE.carJolt * dt * 2;
    } else if (br.s > 0) br.vel = approach(br.vel, br.gold ? 0 : -QUAKE.carBack, 200 * dt);
    else br.vel = Math.max(0, br.vel);
    if (w.phase === 'shake' && !br.gold && H) br.vel -= w.I * 18 * dt;   // a rumble nudges it back down the hill
    const s0 = br.s;
    br.s = clamp(br.s + br.vel * dt / br.travel, 0, 1);
    if (br.s <= 0) { br.vel = Math.max(0, br.vel); if (s0 > 0) Sfx.play('quakeThunk'); }
    if (br.s >= 1) br.vel = Math.min(0, br.vel);
    br.peakS = Math.max(br.peakS, br.s);
    if (!H && br.s < s0 && riders.length && s0 > 0.05 && Math.floor(s0 * 6) !== Math.floor(br.s * 6)) Sfx.play('quakeRoll');
    // rolled all the way back with a rider: count it; twice = gold cable
    if (br.s <= 0 && br.peakS >= 0.3) {
      if (riders.length) {
        br.rollbacks++;
        if (br.rollbacks >= QUAKE.goldAfter && !br.gold) {
          br.gold = true; st.stats.golds++;
          quakeBanner(st, 'Gold cable: no rolling back!');
          Sfx.play('quakeGold'); quakeBurst(br.cx, br.cy - 30, C.gold, 14);
        }
      }
      br.peakS = 0;
    }
    if (br.s >= 1 && riders.length) {   // docked with a rider aboard: parked for good
      br.parked = true; br.vel = 0; br.bellT = 0.8; br.flash = 0.5;
      Sfx.play('quakeBell'); quakePop(st, br.x1 - 20, br.cy - 104, 'Ding ding!', C.gold, 18);
      rumble(riders[0].id, 0.2, 0.4, 120);
    }
  }
  br.carX = br.x0 - 30 + br.s * br.travel;
  const dx = br.carX - br.prevCarX;
  if (dx) for (const p of riders) moveX(p, dx, true);
}
// riders stay inside the car while it is out over the crack (the open sides are the ends that touch a street)
function quakeCarWalls(st, br) {
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (!p.alive || P.whoa) { P.aboard = null; continue; }
    const cx = p.x + p.w / 2, inside = cx > br.carX && cx < br.carX + QUAKE.carW && p.y + p.h <= br.cy + 1 && p.y + p.h > br.cy - 120;
    if (P.on === br) P.aboard = br;
    else if (P.aboard === br && (!inside || (p.grounded && !P.on))) P.aboard = null;
    if (P.aboard !== br) continue;
    const lo = br.s > 0.02 ? br.carX + 3 : -1e9, hi = br.parked || br.s >= 0.98 ? 1e9 : br.carX + QUAKE.carW - 3 - p.w;
    if (p.x < lo) { p.x = lo; p.vx = Math.max(0, p.vx); }
    if (p.x > hi) { p.x = hi; p.vx = Math.min(0, p.vx); }
  }
}

/* ---------- landing on planks and cars (mode-owned platforms: land from above, never block from below) ---------- */
function quakeResolve(st) {
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (!p.alive || P.whoa) { P.on = null; continue; }
    const feet = p.y + p.h, cx = p.x + p.w / 2;
    let best = null, bestY = Infinity;
    if (p.vy >= -1) for (const br of st.bridges) {
      if (!quakeWalkable(br)) continue;
      const [xa, xb] = quakeSpan(br);
      if (!(p.x + 4 < xb && p.x + p.w - 4 > xa)) continue;
      const sNow = quakeSurf(br, clamp(cx, xa, xb)), sWas = quakeSurf(br, clamp(P.prevCx, xa, xb), true), sticky = P.on === br;
      const tol = sticky ? 8 : P.wasGround ? QUAKE.stepUp : 2;
      if (P.prevFeet > sWas + tol) continue;
      if (feet < sNow - (sticky ? 8 : 0.5)) continue;
      if (sNow < bestY) { bestY = sNow; best = br; }
    }
    if (!best) { P.on = null; continue; }
    const landed = P.on !== best;
    moveY(p, bestY - p.h - p.y, true);
    if (Math.abs(p.y + p.h - bestY) > 1) { P.on = null; continue; }   // a street edge under the feet holds them up instead
    p.vy = 0; p.grounded = true; p.onOneWay = false; p.onPartner = false; p.jumping = false; p.coyote = PHYS.coyote;
    P.on = best;
    if (landed && P.prevVy > 260) { p.sx = 1.2; p.sy = 0.82; quakePuff(cx, bestY, 4, 'rgba(255,255,255,0.75)'); Sfx.play('land'); }
  }
}
// the wobbly plank over the crack in this player's street that they are on, or in the air just over (while it is held up)
function quakeOverPlank(st, p) {
  const P = st.pl[p.id];
  if (P.on) return P.on.kind === 'plank' && quakeOverCrack(P.on, p) ? P.on : null;
  const ln = quakeLaneOf(p), feet = p.y + p.h;
  for (const br of st.bridges) {
    if (br.kind !== 'plank' || br.done || br.up < 1 || br.lane !== ln || !quakeOverCrack(br, p)) continue;
    if (feet <= quakeSurf(br, p.x + p.w / 2) + 2) return br;
  }
  return null;
}
// on this plank over its crack, or hopping just above it: their weight counts (so a hop doesn't make you weightless)
const quakeRiding = (st, p, br) => p.alive && !st.pl[p.id].whoa && quakeOverPlank(st, p) === br;
// over a wobbly plank: tiptoe (in a hop too, so hopping or bouncing off a crate is no faster than walking),
// a hard landing near an end gives the ball a bump, and the crosser slides downhill when it tips
function quakeWobbleWalk(st, dt) {
  for (const p of G.players) {
    const P = st.pl[p.id], br = p.alive && !P.whoa ? quakeOverPlank(st, p) : null;
    if (P.floaty && (p.grounded || !p.alive || P.whoa)) P.floaty = false;
    if (!br) {
      if (P.floaty) { const dx = p.x - P.prevX; if (dx) p.x -= dx * (1 - QUAKE.tiptoe); }
      P.wasOn = P.on; continue;
    }
    if (P.enter === 0) P.enter = P.prevCx < br.cx ? -1 : 1;
    if (br.crossT0 == null && P.on === br) br.crossT0 = G.time;
    if (br.done) { P.wasOn = P.on; continue; }
    const dx = p.x - P.prevX;
    if (dx) p.x -= dx * (1 - QUAKE.tiptoe);
    if (P.on === br && P.wasOn !== br && P.prevVy > 200) {
      const off = clamp((p.x + p.w / 2 - br.cx) / br.hw, -1, 1);
      br.v += off * QUAKE.thump * clamp(P.prevVy / 650, 0, 1) * (br.gold ? QUAKE.goldQ : 1);
      if (Math.abs(off) > 0.3) Sfx.play('quakeClonk');
    }
    P.wasOn = P.on;
    if (P.on !== br) continue;
    const ab = Math.abs(br.b);
    if (ab > QUAKE.slideAt) moveX(p, Math.sign(br.b) * QUAKE.slideV * (ab - QUAKE.slideAt) / (1 - QUAKE.slideAt) * dt, true);
  }
}

// a plank end tipped below the street: walking (or sliding) into the street's edge steps you up onto it
function quakeStepUp(st, p, P) {
  const br = P.on;
  if (!br || br.kind !== 'plank' || !p.alive || P.whoa) return;
  const feet = p.y + p.h, lift = feet - br.cy;
  if (lift <= 0.01 || lift > QUAKE.stepUp) return;
  const dir = (p.input.right ? 1 : 0) - (p.input.left ? 1 : 0), slide = Math.abs(br.b) > QUAKE.slideAt ? Math.sign(br.b) : 0;
  if (((dir > 0 || slide > 0) && p.x + p.w >= br.x1 - 3) || ((dir < 0 || slide < 0) && p.x <= br.x0 + 3)) moveY(p, -lift, true);
}

/* ---------- crates ---------- */
function quakeCrates(st, br, dt) {
  const w = st.wave;
  for (const c of br.crates) {
    c.boing = Math.max(0, c.boing - dt);
    if (c.gone) {
      if (c.fall) { const f = c.fall; f.t += dt; f.vy += 1400 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt; if (f.t > 0.7) c.fall = null; }
      continue;
    }
    if (br.up >= 1 && !br.done) {
      const acc = QUAKE.crateAcc * Math.sin(br.th) + (w.I > 0 ? Math.sin(G.time * 31 + c.wob) * 60 * w.I : 0);
      if (Math.abs(br.b) < QUAKE.crateStick && Math.abs(c.vu) < 10 && w.I < 0.3) c.vu = approach(c.vu, 0, 300 * dt);
      else c.vu += acc * dt;
      c.vu *= Math.max(0, 1 - QUAKE.crateFric * dt);
    } else c.vu = 0;
    c.u += c.vu * dt;
    // slid (or pushed) past the crack's edge: down it goes
    if (Math.abs(c.u) > br.hw - 6) {
      c.gone = true; st.stats.crates++;
      const x = br.cx + c.u, y = quakeSurf(br, x);
      c.fall = { x, y, vx: c.vu * 0.3, vy: -60, rot: br.th, vr: Math.sign(c.u) * 5, t: 0 };
      quakePop(st, x, y - 40, 'Plonk!', '#ffffff', 18);
      Sfx.play('quakePlonk'); quakePuff(x, y + 20, 8, 'rgba(200,180,160,0.9)');
      const h = br.held >= 0 ? br.held : -1;
      if (h >= 0) { const p = G.players[h]; quakePop(st, p.x + p.w / 2, p.y - 82, 'Nice tip!', C.gold, 16); }
      continue;
    }
    quakeCrateHits(st, br, c);
  }
}
function quakeCrateHits(st, br, c) {
  if (!quakeWalkable(br)) return;   // a drooped plank's crates are down in the crack with it
  const bx = br.cx + c.u, bottom = quakeSurf(br, bx), top = bottom - QUAKE.crateH, hw = QUAKE.crateW / 2;
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (!p.alive || P.whoa || quakeLaneOf(p) !== br.lane) continue;
    if (!(p.x < bx + hw && p.x + p.w > bx - hw && p.y < bottom - 1 && p.y + p.h > top)) continue;
    if (P.prevFeet <= top + 5 && p.vy >= -1) {
      // on top: boing!
      p.y = top - p.h; p.vy = -QUAKE.boingV; p.grounded = false; p.jumping = false; p.coyote = 0; p.jumpBuf = 0;
      p.sx = 0.8; p.sy = 1.25; P.on = null; P.floaty = true; c.boing = 0.25; st.stats.boings++;   // (a boing is straight up: it never flings you off over the street)
      Sfx.play('quakeBoing', p.id); quakePuff(bx, top, 5, 'rgba(255,255,255,0.8)');
      if (P.boingCD <= 0) { quakePop(st, bx, top - 30, 'Boing!', C.gold, 16); P.boingCD = 1.2; }
      continue;
    }
    const side = p.x + p.w / 2 < bx ? -1 : 1;   // the player is on this side of the crate
    if (c.vu * side > QUAKE.bonkV) {
      // a crate sliding into you: bonk, back you go a little
      moveX(p, (side < 0 ? bx - hw - p.w : bx + hw) - p.x, true);
      knock(p, side * 170, -170, 0.2, 0.3);
      c.vu *= -0.3; st.stats.bonks++;
      Sfx.play('quakeBonk', p.id); rumble(p.id, 0.2, 0.3, 90);
      if (P.bonkCD <= 0) { quakePop(st, p.x + p.w / 2, p.y - 24, 'Bonk!', '#ffffff', 18); P.bonkCD = 1; }
      continue;
    }
    // walking into it: push it along (slowly)
    const intr = side < 0 ? p.x + p.w - (bx - hw) : bx + hw - p.x;
    if (intr > 0) {
      const mv = Math.min(intr, QUAKE.pushV * DT * 1.2);
      c.u -= side * mv; c.vu = -side * Math.max(Math.abs(c.vu), QUAKE.pushV * 0.4);
      const nbx = br.cx + c.u;
      moveX(p, (side < 0 ? nbx - hw - p.w : nbx + hw) - p.x, true);
      P.pushT = 0.15;
    }
  }
}

/* ---------- crossing done, falls, safe spots ---------- */
function quakeDone(st, br, p) {
  br.done = true; br.boltT = 0; br.settle = 0; br.flash = 0.6;
  const h = br.held >= 0 ? br.held : br.lastHolder, S = st.stats;
  if (h >= 0 && h !== p.id) S.held[h]++;
  if (br.saveArm) quakeSaved(st, br);
  if (br.clean) { st.streak++; S.bestStreak = Math.max(S.bestStreak, st.streak); }
  if (br.kind === 'plank' && h >= 0 && br.clean && !br.gold) st.help[h] = false;   // steady on your own: back to the usual 2
  if (br.crossT0 != null) { const t = G.time - br.crossT0; if (!S.fast || t < S.fast.t) S.fast = { t, id: p.id }; }
  if (br.kind === 'car') S.rides[p.id]++;
  // over the plank just crossed (the far end is where the crosser often picks up the next crank, gauge and badge)
  quakePop(st, br.kind === 'car' ? br.x1 + 10 : br.cx, br.cy - 40, br.kind === 'car' ? 'Off we hop!' : 'Across!', PCOL[p.id], 20);
  if (h >= 0 && h !== p.id) { const q = G.players[h]; quakePop(st, q.x + q.w / 2, q.y - 82, 'Nice holding!', C.gold, 16); }
  Sfx.play('quakeAcross');
  for (let k = 0; k < 16; k++) confetti(br.kind === 'car' ? br.x1 : br.cx, br.cy - 20);
  rumble(p.id, 0.2, 0.5, 140); if (h >= 0) rumble(h, 0.15, 0.4, 120);
  for (const q of G.players) { st.pl[q.id].enter = 0; st.pl[q.id].hint = null; }   // new roles: old hints go
  if (st.bridges.every(b => b.done)) quakeOpenGate(st);
}
function quakeOpenGate(st) {
  if (st.gateOpen) return;
  st.gateOpen = true; st.gateT = 0;
  for (const g of st.gate) G.level.grid[g.r][g.c] = '.';
  if (st.gate.length) {
    const gx = st.gate[0].c * T + T;
    quakeBurst(gx, QUAKE.upY + 20, '#c98b5a', 12);
    st.gateSay = 1.0;   // the hint waits until the "Across!" pop has floated away
  }
  Sfx.play('quakeGate');
}
function quakeRescue(st, p, br) {
  const P = st.pl[p.id];
  G.falls++; st.stats.oops[p.id]++;
  p.alive = false; p.respawnT = QUAKE.rescueT; p.pendingJump = false;
  G.spawnPts[p.id] = { x: P.safe.x, y: P.safe.y };
  P.on = null; P.whoa = null; P.aboard = null; P.enter = 0;
  quakePop(st, clamp(p.x + p.w / 2, br.x0 + 30, br.x1 - 30), br.cy - 22, 'Oops!', '#ffffff', 22);
  Sfx.play('quakeOops', p.id); rumble(p.id, 0.3, 0.4, 150);
  quakePuff(p.x + p.w / 2, br.cy + 30, 8, 'rgba(210,190,170,0.9)');
}
function quakeFallsAndSafe(st) {
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (!p.alive || P.whoa) continue;
    const cx = p.x + p.w / 2, feet = p.y + p.h, ln = quakeLaneOf(p);
    let fell = null, nearEdge = false;
    for (const br of st.bridges) {
      if (br.lane !== ln && !(br.lane === 0 && feet < QUAKE.bandBot + 20)) continue;
      if (cx > br.x0 && cx < br.x1 && feet > br.cy + QUAKE.fallDepth && !P.on) fell = br;
      if (br.lane === ln && cx > br.x0 - QUAKE.edgeSafe && cx < br.x1 + QUAKE.edgeSafe) nearEdge = true;
    }
    if (fell) { quakeRescue(st, p, fell); continue; }
    // a safe spot: standing on a real street (not a plank or car), away from the crack edges
    if (p.grounded && !P.on) {
      P.enter = 0;
      if (!nearEdge && solidFor(tile(Math.floor(cx / T), Math.floor((feet + 1) / T)), p)) P.safe = { x: p.x, y: p.y };
    }
  }
}

/* ---------- hints for stuck players ---------- */
function quakeHints(st, dt) {
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (P.hint && (P.hint.t += dt) >= P.hint.life) P.hint = null;
    P.boingCD -= dt; P.bonkCD -= dt;
    P.idle = p.input.left || p.input.right || p.input.jump ? 0 : P.idle + dt;
  }
  if (G.introT > 0) return;
  const A = quakeActive(st);
  if (!A) return;
  const br = A.br, H = G.players[A.H], X = G.players[A.X], PH = st.pl[H.id], PX = st.pl[X.id], cr = br.crank;
  if (!cr) return;
  // the holder: get to your crank, then hold the action
  const hcx = H.x + H.w / 2;
  const atCrank = H.alive && H.grounded && quakeLaneOf(H) === cr.lane && Math.abs(hcx - cr.x) <= QUAKE.crankR;
  PH.offCrank = H.alive && !atCrank && quakeLaneOf(H) === cr.lane ? PH.offCrank + dt : 0;
  PH.notGrip = atCrank && br.held !== H.id ? PH.notGrip + dt : 0;
  if (PH.offCrank > QUAKE.crankHint && !PH.hint) { quakeSay(st, H.id, cr.x < hcx ? '◀ To your crank!' : 'To your crank! ▶'); PH.offCrank = -3; }
  if (PH.notGrip > QUAKE.gripHint && !PH.hint) { quakeSay(st, H.id, quakeHoldWords(H.id)); PH.notGrip = -3; }
  // the crosser: go when it's up (cable car: hop in, ride, hop out)
  if (!X.alive || PX.whoa) return;
  const xcx = X.x + X.w / 2, near = quakeLaneOf(X) === br.lane && xcx < br.x0 + 10 && xcx > br.x0 - 5 * T;
  if (br.kind === 'plank') {
    const ready = br.up >= 1 && br.held >= 0;
    if (near && !PX.on && ready && st.wave.phase !== 'shake' && PX.idle > QUAKE.goHint && !PX.hint) { quakeSay(st, X.id, 'Walk across! ▶'); PX.idle = -3; }
    if (near && !ready && PX.idle > 3 && !PX.hint) quakeSay(st, X.id, 'Wait for ' + NAMES[H.id] + ' to hold it up!', 'wait');
    if (ready && br.crates.some(c => !c.gone)) {
      if (br.upT > 1.2) quakeSay(st, H.id, 'Tip it ◀ ▶ to slide the crate off!', 'tip', 3);
      if (near && br.upT > 2.5) quakeSay(st, X.id, 'Hop over the crate!', 'hop');
    }
  } else {
    const aboard = PX.on === br;
    if (!aboard && near && br.s < 0.05 && PX.idle > QUAKE.goHint && !PX.hint) { quakeSay(st, X.id, 'Hop in the cable car! ▶'); PX.idle = -3; }
    if (aboard && !br.parked && br.held === H.id) {
      PH.push = H.input.right ? 0 : (PH.push || 0) + dt;
      if (PH.push > QUAKE.pushHint && !PH.hint) { quakeSay(st, H.id, 'Push ' + quakeKey(H.id, 'right') + ' to pull the car!'); PH.push = -3; }
    } else PH.push = 0;
    if (!aboard && br.s > 0.3 && !br.parked && br.held === H.id) quakeSay(st, H.id, 'Wait for ' + NAMES[X.id] + ' to hop in!', 'carwait');
    if (aboard && br.parked && PX.idle > 1.5 && !PX.hint) { quakeSay(st, X.id, 'Hop out! ▶'); PX.idle = -3; }
  }
}
function quakeFx(st, dt) {
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.1);
  if (st.banner && (st.banner.t += dt) > 3.2) st.banner = null;
  for (const d of st.dust) { d.y += d.vy * dt; d.life -= dt; }
  st.dust = st.dust.filter(d => d.life > 0 && d.y < QUAKE.loY);
  for (const g of st.gulls) if (g.fly > 0) g.fly = Math.max(0, g.fly - dt / 3.5);
}

/* ---------- the mode ---------- */
MODES.quake = {
  rand: Math.random,   // wave timing and cosmetic randomness; tests swap in a seeded one
  setup(st, L) {
    st.stats = { held: [0, 0], saved: [0, 0], whoas: 0, oops: [0, 0], bestStreak: 0, fast: null, crates: 0, boings: 0, bonks: 0, golds: 0, rides: [0, 0], roomT: [] };
    st.streak = 0; st.help = [false, false];
    quakeRoom(st, L);
  },
  room(k, L) { const st = G.mst; st.stats.roomT.push(G.time); quakeRoom(st, L); },
  pre(dt) {
    const st = G.mst;
    if (!st.pl) return;
    for (const p of G.players) {
      const P = st.pl[p.id];
      if ((P.grip && p.input.act) || P.whoa) { p.pendingJump = false; p.jumpBuf = 0; }   // no hopping off a crank you hold
      P.prevVy = p.vy;
      quakeStepUp(st, p, P);
    }
  },
  step(dt) {
    const st = G.mst;
    if (!st.bridges) return;
    st.roomT += dt; st.crackFx = Math.max(0, st.crackFx - dt); st.gateT += dt;
    if (st.gateSay > 0 && (st.gateSay -= dt) <= 0) {
      const up = G.players[st.lanePl[0]];
      if (up && up.alive && quakeLaneOf(up) === 0) quakeSay(st, up.id, 'All across! Hop down the gap ▶', null, 3);
    }
    if (G.introT <= 0) st.liveT += dt;
    quakeWaveStep(st, dt);
    quakeGrips(st, dt);
    for (const br of st.bridges) { if (br.kind === 'car') quakeCarStep(st, br, dt); else quakePlankStep(st, br, dt); }
    quakeResolve(st);
    quakeWobbleWalk(st, dt);
    for (const br of st.bridges) if (br.kind === 'car') quakeCarWalls(st, br);
    for (const br of st.bridges) if (br.crates.length) quakeCrates(st, br, dt);
    for (const br of st.bridges) quakeBallWatch(st, br, dt);
    for (const p of G.players) if (st.pl[p.id].whoa) quakeWhoaStep(st, p, dt);
    // a crossing is done when the crosser stands past the far edge (on the street, or hopped straight into the cable car);
    // the cable car's: parked, and they step out at the far end
    for (const br of st.bridges) {
      if (br.done) continue;
      for (const p of G.players) {
        const P = st.pl[p.id];
        if (!p.alive || P.whoa || quakeLaneOf(p) !== br.lane || p.x + p.w / 2 <= br.x1 + 12) continue;
        if (br.kind === 'car' ? br.parked : p.grounded && P.on !== br) { quakeDone(st, br, p); break; }
      }
    }
    quakeFallsAndSafe(st);
    quakeHints(st, dt);
    quakeFx(st, dt);
    for (const p of G.players) { const P = st.pl[p.id]; P.prevFeet = p.y + p.h; P.prevX = p.x; P.prevCx = p.x + p.w / 2; P.wasGround = p.grounded; }
  },
  onRespawn(p) {
    const st = G.mst, P = st.pl[p.id];
    P.on = null; P.whoa = null; P.prevFeet = p.y + p.h; P.prevX = p.x; P.prevCx = p.x + p.w / 2; P.wasGround = false;
    p.vy = -240;
    Sfx.play('quakeBack', p.id);
    const A = quakeActive(st);
    if (A && A.X === p.id) quakeSay(st, p.id, A.br.kind === 'car' ? 'Ride the cable car across!' : 'Wait for the bridge to come up!', 'oops');
  },
  draw() { quakeDraw(G.mst); },
  drawTop() { quakeDrawTop(G.mst); },
  hud() { quakeHud(G.mst); },
  stats() {
    const st = G.mst, S = st.stats, t = G.time, slips = S.whoas + G.falls;
    const medal = t <= 200 && slips <= 3 ? 'Gold' : t <= 330 && slips <= 9 ? 'Silver' : 'Bronze';
    const words = slips === 0 ? 'Steady as a rock!' : slips <= 4 ? 'Wobbly, but wonderful!' : 'Shaky streets, brave hearts!';
    const out = [
      { label: 'Bridges held', values: S.held.slice() },
      { label: 'Wobbles saved', values: S.saved.slice() },
      { label: 'Whoas', value: S.whoas },
      { label: 'Steady in a row', value: S.bestStreak },
      medal + ' medal · ' + words,
    ];
    if (S.fast) out.push('Fastest crossing: ' + NAMES[S.fast.id] + ' in ' + S.fast.t.toFixed(1) + ' s');
    return out;
  },
};
MODES.quake.test = { QUAKE, quakeActive, quakeSurf, quakeSpan, quakeWalkable, quakeLaneOf, quakeOverCrack, quakeForce, quakeKey };

/* ---------- the look of a room (the same every time: a little seeded random of its own) ---------- */
function quakeSeed(n) {
  let s = (Math.imul(n + 7, 2654435761) >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const QUAKE_ITEMS = { 'TEA ROOM': 'cup', BAKERY: 'cake', TOYS: 'top', HATS: 'hat', CANDY: 'jar', BOOKS: 'book' };
function quakeLayout(st, grid) {
  const R = quakeSeed(st.roomIdx * 31 + 3), up = QUAKE.upY, lo = QUAKE.loY;
  // painted ladies along the upper street
  st.houses = [];
  let x = -18 - Math.floor(R() * 16), k = Math.floor(R() * 6);
  while (x < W + 4) {
    const w = 98 + Math.floor(R() * 24), h = 104 + Math.floor(R() * 24), top = up - h, fl = top + Math.round(h * 0.48), left = R() < 0.5;
    const hs = { x, w, h, top, fl, pal: QUAKE_HOUSES[k % QUAKE_HOUSES.length], type: ['gable', 'tower', 'flat'][Math.floor(R() * 3)],
      wins: [0.28, 0.72].map(f => ({ x: x + w * f - 9, y: top + 12, w: 18, h: Math.min(34, fl - top - 20) })),
      door: { x: left ? x + 12 : x + w - 34, y: fl + 14, w: 22, h: up - 8 - (fl + 14) },
      bay: { x: left ? x + w - 56 : x + 12, y: fl + 12, w: 44, h: 30 } };
    hs.pic = R() < 0.5; hs.picCol = ['#ff8f6b', '#7fc8ff', '#9fe3b0', '#ffd36b'][Math.floor(R() * 4)];
    st.houses.push(hs);
    k += 1 + Math.floor(R() * 2); x += w + 2 + Math.floor(R() * 4);
  }
  // one friendly cat on a bay window sill
  const ch = st.houses[1 + Math.floor(R() * Math.max(1, st.houses.length - 2))];
  st.cat = ch ? { x: ch.bay.x + ch.bay.w * (0.3 + R() * 0.4), y: ch.bay.y + ch.bay.h, col: ['#f2a65a', '#5a5370', '#f6efdf'][Math.floor(R() * 3)], ph: R() * 6 } : null;
  // little shops along the lower street, each with its window display (it rattles in a rumble)
  st.shops = []; st.items = [];
  x = -10 - Math.floor(R() * 20); k = Math.floor(R() * QUAKE_SHOPS.length);
  while (x < W + 4) {
    const w = 128 + Math.floor(R() * 30), h = 92 + Math.floor(R() * 12), top = lo - h, sp = QUAKE_SHOPS[k % QUAKE_SHOPS.length];
    const win = { x: x + 10, y: top + 46, w: w - 54, h: lo - 10 - (top + 46) };
    const sh = { x, w, h, top, col: sp[0], name: sp[1], acc: sp[2], win, door: { x: x + w - 36, y: top + 42, w: 24, h: lo - top - 42 } };
    st.shops.push(sh);
    const kind = QUAKE_ITEMS[sp[1]] || 'cup', n = Math.max(2, Math.floor(win.w / 26)), shelf = win.y + Math.round(win.h * 0.62);
    for (let i = 0; i < n; i++) st.items.push({ x: win.x + (i + 0.5) * win.w / n, y: shelf, kind, col: sp[2], ph: R() * 6 });
    k += 1; x += w;
  }
  // lamp posts on the streets, clear of the cracks, cranks, the gate and the door
  st.lamps = [];
  const busy = [];
  for (const br of st.bridges) { busy.push([br.lane, br.x0 - 40, br.x1 + 40]); if (br.crank) busy.push([br.crank.lane, br.crank.x - 46, br.crank.x + 46]); }
  for (const g of st.gate) busy.push([0, g.c * T - 50, g.c * T + T + 50]);
  if (G.level.door) busy.push([1, G.level.door.x - 30, G.level.door.x + G.level.door.w + 30]);
  for (const p of G.players) busy.push([quakeLaneOf(p), p.x - 40, p.x + p.w + 40]);
  busy.push([0, 40, 160]);   // the street sign
  for (const ln of [0, 1]) {
    let last = -1e9, n = 0;
    for (let lx = 60; lx < W - 40 && n < 2; lx += 10) {
      if (lx - last < 260 || busy.some(b => b[0] === ln && lx > b[1] && lx < b[2])) continue;
      st.lamps.push({ x: lx, y: quakeLaneY(ln), ph: R() * 6 }); last = lx; n++;
    }
  }
}
function quakeRRg(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
const quakeFont = (size, body) => (body ? '700 ' + size + 'px "Atkinson Hyperlegible", system-ui, sans-serif' : size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif');

/* ---------- the painted backdrop: sky, hills, houses, shops, streets and cracks (cached per room and canvas size) ---------- */
function quakeBackdrop(st) {
  const fonts = document.fonts && document.fonts.status === 'loaded' ? 1 : 0;
  const key = st.roomN + ':' + canvas.width + 'x' + canvas.height + ':' + fonts;
  if (!quakeBg || quakeBg.key !== key) {
    const cv = (quakeBg && quakeBg.cv) || document.createElement('canvas');
    cv.width = canvas.width; cv.height = canvas.height;
    const g = cv.getContext('2d');
    g.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    g.clearRect(0, 0, W, H);
    quakePaint(g, st);
    quakeBg = { key, cv };
  }
  ctx.drawImage(quakeBg.cv, 0, 0, W, H);
}
function quakePaint(g, st) {
  const L = st.look, R = quakeSeed(st.roomIdx * 17 + 11), up = QUAKE.upY, lo = QUAKE.loY, bb = QUAKE.bandBot;
  // sky and sun
  let gr = g.createLinearGradient(0, 0, 0, up);
  gr.addColorStop(0, L.skyTop); gr.addColorStop(1, L.skyBot);
  g.fillStyle = gr; g.fillRect(0, 0, W, up + 2);
  g.fillStyle = C.sunGlow; g.beginPath(); g.arc(760, 96, 46, 0, Math.PI * 2); g.fill();
  g.fillStyle = C.sun; g.beginPath(); g.arc(760, 96, 30, 0, Math.PI * 2); g.fill();
  // the city climbing the far hills
  const ridge = (x, base, amp, f, ph) => base - amp * Math.sin(x * f + ph) - 8 * Math.sin(x * f * 3.1 + ph);
  for (const [col, base, amp, f, ph] of [[L.hill, 118, 30, 0.006, st.roomIdx + 1], [L.hill2, 146, 20, 0.011, st.roomIdx * 2 + 3]]) {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, up);
    for (let x = 0; x <= W; x += 12) g.lineTo(x, ridge(x, base, amp, f, ph));
    g.lineTo(W, up); g.closePath(); g.fill();
    for (let x = 6 + R() * 20; x < W; x += 18 + R() * 26) {
      const y = ridge(x + 5, base, amp, f, ph) + 3;
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x, y - 7, 10, 9);
      g.fillStyle = 'rgba(60,50,90,0.25)'; g.beginPath(); g.moveTo(x - 1, y - 7); g.lineTo(x + 5, y - 12); g.lineTo(x + 11, y - 7); g.closePath(); g.fill();
    }
  }
  if (st.deco === 'ferry') quakePaintTower(g, 712);
  if (st.deco === 'nob') {   // a big old mansion high on the hill
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(560, 92, 70, 26); g.fillRect(586, 74, 18, 20);
    g.fillStyle = 'rgba(70,60,110,0.3)'; g.beginPath(); g.moveTo(556, 93); g.lineTo(595, 78); g.lineTo(634, 93); g.closePath(); g.fill();
  }
  for (const hs of st.houses) quakePaintHouse(g, hs);
  // the stone wall under the upper street, with ivy
  g.fillStyle = '#dcc7a2'; g.fillRect(0, bb, W, lo - bb);
  g.strokeStyle = '#c3aa82'; g.lineWidth = 1.5;
  for (let y = bb, row = 0; y < lo; y += 20, row++) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    for (let x = (row % 2) * 24; x < W; x += 48) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 20); g.stroke(); }
  }
  gr = g.createLinearGradient(0, bb, 0, bb + 28);
  gr.addColorStop(0, 'rgba(40,30,60,0.35)'); gr.addColorStop(1, 'rgba(40,30,60,0)');
  g.fillStyle = gr; g.fillRect(0, bb, W, 28);
  for (let i = 0; i < 5; i++) {
    const ix = 60 + i * 190 + R() * 60;
    g.fillStyle = i % 2 ? '#6fbf73' : '#5aa862';
    for (let j = 0; j < 6; j++) { g.beginPath(); g.arc(ix + (R() - 0.5) * 26, bb + 6 + j * 7 + R() * 4, 6 + R() * 3, 0, Math.PI * 2); g.fill(); }
  }
  for (const sh of st.shops) quakePaintShop(g, sh);
  // the streets: cobbles on top, earth below; the cable car rails on cable streets
  const rails = st.bridges.some(b => b.kind === 'car');
  for (const [y0, y1, ln] of [[up, bb, 0], [lo, H, 1]]) {
    g.fillStyle = '#a49fb9'; g.fillRect(0, y0, W, 11);
    g.fillStyle = '#8e88a8';
    for (let x = (ln ? 6 : 0); x < W; x += 13) { quakeRRg(g, x + 1, y0 + 2 + ((x / 13) % 2) * 2, 10, 5, 2.5); g.fill(); }
    g.fillStyle = '#6d6789'; g.fillRect(0, y0 + 10, W, 2.5);
    gr = g.createLinearGradient(0, y0 + 12, 0, y1);
    gr.addColorStop(0, ln ? '#9c6e48' : '#b0825a'); gr.addColorStop(1, ln ? '#6f4a30' : '#8a5c3b');
    g.fillStyle = gr; g.fillRect(0, y0 + 12, W, y1 - y0 - 12);
    g.fillStyle = 'rgba(255,230,190,0.28)';
    for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(R() * W, y0 + 20 + R() * (y1 - y0 - 28), 3 + R() * 5, 2 + R() * 2.5, 0, 0, Math.PI * 2); g.fill(); }
    if (!ln) { g.fillStyle = '#5e3d28'; g.fillRect(0, y1 - 3, W, 3); }
    if (ln && rails) { g.fillStyle = '#5d5872'; g.fillRect(0, y0 + 3, W, 2); g.fillRect(0, y0 + 7, W, 2); }
  }
  for (const br of st.bridges) quakePaintCrack(g, br, R);
  // the street sign (with the year)
  g.font = quakeFont(13, true);
  const pw = g.measureText(L.sign).width + 20, sx = 100, px = Math.max(6, sx - pw / 2);
  g.fillStyle = '#2f5d50'; g.fillRect(sx - 2, 150, 4, up - 150);
  quakeRRg(g, px, 140, pw, 22, 5); g.fill();
  g.strokeStyle = '#f6efdf'; g.lineWidth = 1.5; quakeRRg(g, px + 2.5, 142.5, pw - 5, 17, 4); g.stroke();
  g.fillStyle = '#f6efdf'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(L.sign, px + pw / 2, 151.5);
}
function quakePaintTower(g, x) {   // the Ferry Building's clock tower, far behind the houses
  g.fillStyle = '#efe2c8'; g.fillRect(x - 17, 66, 34, 180);
  g.fillStyle = '#d9c7a4'; g.fillRect(x - 21, 102, 42, 6); g.fillRect(x - 21, 140, 42, 5);
  g.fillStyle = '#efe2c8'; g.fillRect(x - 11, 44, 22, 24);
  g.fillStyle = '#b8876a'; g.beginPath(); g.moveTo(x - 13, 46); g.lineTo(x, 22); g.lineTo(x + 13, 46); g.closePath(); g.fill();
  g.fillStyle = '#ff6b4a'; g.fillRect(x - 0.5, 10, 1.5, 13); g.beginPath(); g.moveTo(x + 1, 10); g.lineTo(x + 10, 13); g.lineTo(x + 1, 16); g.fill();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, 84, 10, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#3b2f4a'; g.lineWidth = 1.5; g.stroke();
  g.beginPath(); g.moveTo(x, 84); g.lineTo(x, 77); g.moveTo(x, 84); g.lineTo(x + 5, 86); g.stroke();
  g.fillStyle = '#c9b38c'; for (let i = 0; i < 3; i++) { quakeRRg(g, x - 12 + i * 9, 114, 6, 20, 3); g.fill(); }
}
function quakePaintHouse(g, hs) {
  const [fa, sh, rf] = hs.pal, x = hs.x, w = hs.w, top = hs.top, base = QUAKE.upY;
  g.fillStyle = rf;
  if (hs.type === 'gable') {
    g.beginPath(); g.moveTo(x - 5, top + 2); g.lineTo(x + w / 2, top - 30); g.lineTo(x + w + 5, top + 2); g.closePath(); g.fill();
    g.strokeStyle = '#fff6e6'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x + 2, top + 1); g.lineTo(x + w / 2, top - 24); g.lineTo(x + w - 2, top + 1); g.stroke();
    g.fillStyle = '#fff6e6'; g.beginPath(); g.arc(x + w / 2, top - 7, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#9fd3ef'; g.beginPath(); g.arc(x + w / 2, top - 7, 4.5, 0, Math.PI * 2); g.fill();
  } else {
    g.fillStyle = sh; g.fillRect(x - 5, top - 10, w + 10, 12);
    g.fillStyle = '#fff6e6'; for (let dx = x - 2; dx < x + w + 3; dx += 8) g.fillRect(dx, top - 4, 4, 4);
    if (hs.type === 'tower') {
      const tx = x + w - 22;
      g.fillStyle = fa; g.fillRect(tx - 15, top - 26, 30, 28);
      g.fillStyle = '#9fd3ef'; quakeRRg(g, tx - 5, top - 20, 10, 14, 5); g.fill();
      g.fillStyle = rf; g.beginPath(); g.moveTo(tx - 19, top - 24); g.lineTo(tx, top - 58); g.lineTo(tx + 19, top - 24); g.closePath(); g.fill();
      g.fillStyle = C.gold; g.beginPath(); g.arc(tx, top - 59, 3, 0, Math.PI * 2); g.fill();
    }
  }
  g.fillStyle = fa; g.fillRect(x, top, w, base - top);
  g.strokeStyle = 'rgba(60,40,80,0.08)'; g.lineWidth = 1;
  for (let y = top + 6; y < base; y += 6) { g.beginPath(); g.moveTo(x + 4, y); g.lineTo(x + w - 4, y); g.stroke(); }
  g.fillStyle = sh; g.fillRect(x, top, 4, base - top); g.fillRect(x + w - 4, top, 4, base - top); g.fillRect(x, hs.fl, w, 5);
  for (const wn of hs.wins) quakePaintWindow(g, wn.x, wn.y, wn.w, wn.h, sh);
  const b = hs.bay;
  g.fillStyle = sh; g.fillRect(b.x - 4, b.y - 6, b.w + 8, b.h + 10);
  quakePaintWindow(g, b.x, b.y, b.w, b.h, sh);
  g.fillStyle = '#fff6e6'; g.fillRect(b.x + b.w / 3 - 1, b.y, 2, b.h); g.fillRect(b.x + 2 * b.w / 3 - 1, b.y, 2, b.h);
  const d = hs.door;
  g.fillStyle = '#fff6e6'; quakeRRg(g, d.x - 3, d.y - 3, d.w + 6, d.h + 3, 4); g.fill();
  g.fillStyle = sh; quakeRRg(g, d.x, d.y, d.w, d.h, 3); g.fill();
  g.fillStyle = C.gold; g.beginPath(); g.arc(d.x + d.w - 5, d.y + d.h * 0.55, 1.8, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#cfc6dc'; g.fillRect(d.x - 4, base - 8, d.w + 8, 4); g.fillRect(d.x - 7, base - 4, d.w + 14, 4);
}
function quakePaintWindow(g, x, y, w, h, sh) {
  g.fillStyle = '#fff6e6'; quakeRRg(g, x - 2.5, y - 2.5, w + 5, h + 5, 3); g.fill();
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, '#bfe6f7'); gr.addColorStop(1, '#8fc6e6');
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.moveTo(x + 2, y + h * 0.6); g.lineTo(x + w * 0.5, y + 2); g.lineTo(x + w * 0.7, y + 2); g.lineTo(x + 2, y + h * 0.85); g.closePath(); g.fill();
  g.fillStyle = sh; g.fillRect(x - 3, y + h + 2, w + 6, 3);
}
function quakePaintShop(g, sh) {
  const x = sh.x, w = sh.w, top = sh.top, lo = QUAKE.loY;
  g.fillStyle = sh.col; g.fillRect(x, top, w, lo - top);
  g.fillStyle = 'rgba(60,40,80,0.12)'; g.fillRect(x, top, 3, lo - top); g.fillRect(x + w - 3, top, 3, lo - top);
  g.fillStyle = '#5a4a6a'; g.fillRect(x - 2, top - 5, w + 4, 6);
  // the sign board
  g.fillStyle = '#3b2f4a'; quakeRRg(g, x + 10, top + 5, w - 20, 19, 4); g.fill();
  g.font = quakeFont(13); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffe9b8';
  g.fillText(sh.name, x + w / 2, top + 15);
  // a striped awning with a scalloped edge
  const ay = top + 27, ah = 12;
  for (let sx = x + 4, i = 0; sx < x + w - 4; sx += 12, i++) {
    g.fillStyle = i % 2 ? '#ffffff' : sh.acc;
    g.beginPath(); g.moveTo(sx, ay); g.lineTo(Math.min(sx + 12, x + w - 4), ay); g.lineTo(Math.min(sx + 12, x + w - 4), ay + ah);
    g.arc(sx + 6, ay + ah, 6, 0, Math.PI); g.closePath(); g.fill();
  }
  const wn = sh.win;
  g.fillStyle = '#fff6e6'; g.fillRect(wn.x - 3, wn.y - 3, wn.w + 6, wn.h + 6);
  const gr = g.createLinearGradient(0, wn.y, 0, wn.y + wn.h);
  gr.addColorStop(0, '#d6f0fb'); gr.addColorStop(1, '#a5d4ec');
  g.fillStyle = gr; g.fillRect(wn.x, wn.y, wn.w, wn.h);
  g.fillStyle = '#b58a64'; g.fillRect(wn.x, wn.y + Math.round(wn.h * 0.62), wn.w, 3);
  g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.moveTo(wn.x + 4, wn.y + wn.h * 0.5); g.lineTo(wn.x + wn.w * 0.35, wn.y + 3); g.lineTo(wn.x + wn.w * 0.45, wn.y + 3); g.lineTo(wn.x + 4, wn.y + wn.h * 0.75); g.closePath(); g.fill();
  const d = sh.door;
  g.fillStyle = '#fff6e6'; quakeRRg(g, d.x - 3, d.y - 3, d.w + 6, d.h + 3, 4); g.fill();
  g.fillStyle = sh.acc; quakeRRg(g, d.x, d.y, d.w, d.h, 3); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(d.x + 5, d.y + 5, d.w - 10, 12);
  g.fillStyle = C.gold; g.beginPath(); g.arc(d.x + d.w - 5, d.y + d.h * 0.6, 1.8, 0, Math.PI * 2); g.fill();
}
function quakePaintCrack(g, br, R) {
  const top = br.cy - 0.5, up = br.lane === 0, bot = up ? QUAKE.bandBot - 4 : H + 2, x0 = br.x0, x1 = br.x1, n = 5;
  const left = [], right = [];
  for (let i = 0; i <= n; i++) {
    const y = top + (bot - top) * i / n;
    left.push([x0 + (i ? 2 + R() * 9 : 0), y]); right.push([x1 - (i ? 2 + R() * 9 : 0), y]);
  }
  const tip = up ? [br.cx + (R() - 0.5) * 30, QUAKE.bandBot + 22] : null;
  const path = () => {
    g.beginPath(); g.moveTo(left[0][0], left[0][1]);
    for (const q of left) g.lineTo(q[0], q[1]);
    if (tip) { g.lineTo(left[n][0] + 18, bot + 8); g.lineTo(tip[0], tip[1]); g.lineTo(right[n][0] - 18, bot + 8); }
    for (let i = n; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
    g.closePath();
  };
  const gr = g.createLinearGradient(0, top, 0, up ? QUAKE.bandBot + 20 : H);
  gr.addColorStop(0, '#4a3550'); gr.addColorStop(1, '#1c1a36');
  path(); g.fillStyle = gr; g.fill();
  g.strokeStyle = '#5e3d28'; g.lineWidth = 2.5; path(); g.stroke();
  // broken cobbles at the edges
  g.fillStyle = '#8e88a8';
  for (const [ex, dir] of [[x0, 1], [x1, -1]]) {
    for (let i = 0; i < 2; i++) {
      const cx = ex + dir * (4 + i * 9), cy = top + 4 + i * 6;
      g.save(); g.translate(cx, cy); g.rotate(dir * (0.3 + i * 0.3)); quakeRRg(g, -5, -3, 10, 6, 2.5); g.fill(); g.restore();
    }
  }
}

/* ---------- drawing, every frame (after the tiles, before the players) ---------- */
function quakeDraw(st) {
  if (!st.bridges) return;
  quakeBackdrop(st);
  const I = st.wave.I, t = G.clock;
  for (let i = 0; i < 4; i++) drawCloud(((i * 263 + t * (5 + i * 2)) % (W + 220)) - 110, 34 + ((i * 37) % 48), 0.55 + (i % 2) * 0.25);
  for (const gl of st.gulls) quakeDrawGull(gl, t);
  // the rattling bits: shop window displays, pictures, the cat, the lamp posts
  const jig = (ph, a) => (reduceMotion ? 0 : Math.sin(t * 38 + ph) * a * I);
  for (const it of st.items) quakeDrawItem(it, jig(it.ph, 1.6), jig(it.ph + 2, 0.14));
  for (const hs of st.houses) if (hs.pic) quakeDrawPicture(hs, I, t);
  if (st.cat) quakeDrawCat(st.cat, I, t);
  for (const lp of st.lamps) quakeDrawLamp(lp, I, t);
  quakeDrawGate(st);
  for (const br of st.bridges) quakeDrawCrank(st, br);
  for (const br of st.bridges) { if (br.kind === 'car') quakeDrawCarBack(st, br); else quakeDrawPlank(st, br); }
  for (const br of st.bridges) for (const c of br.crates) quakeDrawCrate(br, c);
  if (G.level.door) drawDoor(G.level.door);
  for (const d of st.dust) { ctx.fillStyle = 'rgba(214,190,150,' + (clamp(d.life / 1.4, 0, 1) * 0.8).toFixed(3) + ')'; circle(d.x, d.y, d.size); ctx.fill(); }
  if (st.crackFx > 0) for (const br of st.bridges) quakeDrawCrackFx(br, st.crackFx / 0.9);
}
function quakeDrawGull(gl, t) {
  const fly = gl.fly, x = gl.x + Math.sin(t * 0.25 + gl.ph) * 50, y = gl.y + Math.sin(t * 0.6 + gl.ph) * 5 - Math.sin(fly * Math.PI) * 18;
  const flap = Math.sin(t * (fly > 0 ? 16 : 4) + gl.ph) * (fly > 0 ? 5 : 2.5);
  ctx.lineCap = 'round';
  for (const [col, lw] of [['#6d6789', 4], ['#ffffff', 2]]) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x - 9, y - flap);
    ctx.quadraticCurveTo(x - 4, y - 4 - flap * 0.3, x, y); ctx.quadraticCurveTo(x + 4, y - 4 - flap * 0.3, x + 9, y - flap); ctx.stroke();
  }
  ctx.lineCap = 'butt';
}
function quakeDrawItem(it, dx, rot) {
  ctx.save(); ctx.translate(it.x + dx, it.y); ctx.rotate(rot);
  if (it.kind === 'cup') {
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, -1, 8, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(6, -10); ctx.lineTo(4, -2); ctx.lineTo(-4, -2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(6.5, -6.5, 2.6, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.fillStyle = it.col; ctx.fillRect(-5.2, -8, 10.4, 1.8);
  } else if (it.kind === 'cake') {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-1, -4, 2, 4); ctx.beginPath(); ctx.ellipse(0, -4, 9, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff0f5'; rr(-7, -14, 14, 10, 3); ctx.fill();
    ctx.fillStyle = '#ff8fb1'; rr(-7, -14, 14, 4, 2); ctx.fill();
    ctx.fillStyle = '#e8344e'; circle(0, -16, 2.4); ctx.fill();
  } else if (it.kind === 'top') {
    ctx.fillStyle = it.col; ctx.beginPath(); ctx.moveTo(-7, -9); ctx.lineTo(7, -9); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd36b'; ctx.fillRect(-7, -10, 14, 2.5); ctx.fillStyle = '#5a4a6a'; ctx.fillRect(-1, -14, 2, 4);
  } else if (it.kind === 'hat') {
    ctx.fillStyle = it.col; ctx.beginPath(); ctx.ellipse(0, -1.5, 10, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    rr(-6, -12, 12, 11, 3); ctx.fill(); ctx.fillStyle = '#3b2f4a'; ctx.fillRect(-6, -5, 12, 2.5);
  } else if (it.kind === 'jar') {
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; rr(-6, -15, 12, 15, 4); ctx.fill();
    for (const [cx, cy, c] of [[-2.5, -4, '#ff6b9a'], [2.5, -4, '#ffd36b'], [0, -9, '#7fc8ff']]) { ctx.fillStyle = c; circle(cx, cy, 2.3); ctx.fill(); }
    ctx.fillStyle = it.col; ctx.fillRect(-5, -17, 10, 3);
  } else {
    for (const [y, w, c] of [[-4, 16, it.col], [-8, 14, '#ffd36b'], [-12, 15, '#7fc8ff']]) { ctx.fillStyle = c; ctx.fillRect(-w / 2 + (y % 8 ? 1 : -1), y, w, 4); }
  }
  ctx.restore();
}
function quakeDrawPicture(hs, I, t) {   // a picture on the wall, seen through the bay window: it swings in a rumble
  const b = hs.bay, a = reduceMotion ? 0 : (Math.sin(t * 9 + hs.x) * 0.35 + 0.08) * I;
  ctx.save(); ctx.translate(b.x + b.w / 2, b.y + 4); ctx.rotate(a);
  ctx.strokeStyle = '#6b4630'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-4, 5); ctx.lineTo(0, 0); ctx.lineTo(4, 5); ctx.stroke();
  ctx.fillStyle = '#b8873a'; ctx.fillRect(-7, 5, 14, 11);
  ctx.fillStyle = hs.picCol; ctx.fillRect(-5, 7, 10, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; circle(-2, 9.5, 1.6); ctx.fill();
  ctx.restore();
}
function quakeDrawCat(c, I, t) {   // a cat on a window sill: it puffs up and hops a little in a rumble
  const puff = 1 + 0.18 * I, hop = reduceMotion ? 0 : Math.abs(Math.sin(t * 12)) * 3 * I, wide = I > 0.2;
  ctx.save(); ctx.translate(c.x, c.y - hop); ctx.scale(puff, puff);
  ctx.strokeStyle = c.col; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  const tw = Math.sin(t * 2 + c.ph) * 2;
  ctx.beginPath(); ctx.moveTo(5, -2); ctx.quadraticCurveTo(12, -4, 10 + tw, -12); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = c.col; ctx.beginPath(); ctx.ellipse(0, -5, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
  circle(0, -12, 4.5); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-4.5, -13); ctx.lineTo(-3.5, -19); ctx.lineTo(-0.8, -15.5); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(4.5, -13); ctx.lineTo(3.5, -19); ctx.lineTo(0.8, -15.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2a2440'; ctx.strokeStyle = '#2a2440'; ctx.lineWidth = 1;
  if (wide) { circle(-1.7, -12.5, 1.1); ctx.fill(); circle(1.7, -12.5, 1.1); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(-1.7, -12.8, 1.1, 0.2, Math.PI - 0.2); ctx.moveTo(2.8, -12.6); ctx.arc(1.7, -12.8, 1.1, 0.2, Math.PI - 0.2); ctx.stroke(); }
  ctx.restore();
}
function quakeDrawLamp(lp, I, t) {
  const a = reduceMotion ? 0 : Math.sin(t * 7 + lp.ph) * 0.06 * I;
  ctx.save(); ctx.translate(lp.x, lp.y); ctx.rotate(a);
  ctx.fillStyle = '#3b3550'; ctx.fillRect(-2, -66, 4, 62); rr(-6, -8, 12, 8, 2); ctx.fill();
  rr(-8, -82, 16, 17, 3); ctx.fill();
  ctx.fillStyle = '#fff2b0'; rr(-5.5, -79.5, 11, 12, 2); ctx.fill();
  ctx.fillStyle = '#3b3550'; ctx.beginPath(); ctx.moveTo(-9, -82); ctx.lineTo(0, -90); ctx.lineTo(9, -82); ctx.closePath(); ctx.fill();
  ctx.restore();
}
// the drop gate at the end of the upper street: a bolted trapdoor until every crossing is done, then it swings open
function quakeDrawGate(st) {
  if (!st.gate.length) return;
  const x0 = Math.min(...st.gate.map(g => g.c)) * T, x1 = (Math.max(...st.gate.map(g => g.c)) + 1) * T, y0 = QUAKE.upY, y1 = QUAKE.bandBot, gw = x1 - x0;
  if (!st.gateOpen) {
    ctx.fillStyle = '#9a6640'; ctx.fillRect(x0, y0, gw, y1 - y0);
    ctx.fillStyle = '#7d5032'; for (let y = y0 + 22; y < y1; y += 13) ctx.fillRect(x0, y, gw, 2);
    ctx.fillStyle = '#c98b5a'; ctx.fillRect(x0, y0, gw, 11);
    ctx.fillStyle = '#8a5833'; for (let x = x0 + 15; x < x1; x += 15) ctx.fillRect(x, y0, 2, 11);
    ctx.fillStyle = '#5d5872'; ctx.fillRect(x0 + 3, y0 + 3, 9, 4); ctx.fillRect(x1 - 12, y0 + 3, 9, 4);
    const lx = x0 + gw / 2, ly = y0 + 32;   // a little padlock
    ctx.strokeStyle = C.goldDark; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(lx, ly - 4, 4.5, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = C.gold; rr(lx - 7, ly - 4, 14, 11, 2); ctx.fill();
    ctx.fillStyle = C.goldDark; circle(lx, ly + 1, 1.8); ctx.fill();
  } else {
    const f = quakeEase(st.gateT / 0.4);
    ctx.fillStyle = '#2a2140'; ctx.fillRect(x0, y0, gw, y1 - y0);
    for (const [hx, dir] of [[x0, 1], [x1, -1]]) {
      ctx.save(); ctx.translate(hx, y0); ctx.rotate(dir * f * 1.35);
      ctx.fillStyle = '#c98b5a'; ctx.fillRect(dir > 0 ? 0 : -gw / 2, 0, gw / 2, 9);
      ctx.fillStyle = '#8a5833'; ctx.fillRect(dir > 0 ? gw / 4 : -gw / 4, 0, 2, 9);
      ctx.restore();
    }
  }
}
function quakeDrawCrank(st, br) {
  const cr = br.crank;
  if (!cr) return;
  const A = quakeActive(st), active = A && A.br === br, hid = st.lanePl[cr.lane], held = br.held >= 0, x = cr.x, y = cr.y, bb = QUAKE.bandBot;
  const pose = quakePose(br);
  // the spot to stand on, in the holder's colour (it glows when it's their turn)
  ctx.fillStyle = br.done ? 'rgba(90,80,120,0.45)' : PCOL[hid];
  ctx.beginPath(); ctx.ellipse(x, y + 1.5, 17, 4, 0, 0, Math.PI * 2); ctx.fill();
  if (active && !held) {
    const pu = 0.5 + 0.5 * Math.sin(G.clock * 6);
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.4 + 0.5 * pu).toFixed(3) + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y + 1.5, 21 + pu * 3, 5.5 + pu, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (cr.lane === 0) {
    // the upper street: a winch; its rope runs down through a pulley under the street to the plank's middle
    if (br.kind === 'plank') {
      for (const [c, lw] of [[C.ropeDark, 4], [br.done ? '#d8c9a8' : C.rope, 2]]) {
        ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x, bb + 9); ctx.lineTo(br.cx, pose.py - 2); ctx.stroke();
      }
    }
    ctx.fillStyle = '#5d5872'; ctx.fillRect(x - 3, bb - 1, 6, 8);
    ctx.fillStyle = '#8e88a8'; circle(x, bb + 9, 5.5); ctx.fill(); ctx.fillStyle = '#3b3550'; circle(x, bb + 9, 2); ctx.fill();
    ctx.strokeStyle = '#6b4630'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 13, y); ctx.lineTo(x - 5, y - 24); ctx.moveTo(x + 13, y); ctx.lineTo(x + 5, y - 24); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = '#8a5833'; rr(x - 10, y - 31, 20, 11, 4); ctx.fill();
    ctx.fillStyle = C.rope; for (let k = -6; k <= 6; k += 4) ctx.fillRect(x + k - 1, y - 30, 2, 9);
    const a = br.up * Math.PI * 3 + (br.kind === 'car' ? br.s * 14 : br.b * 0.8);
    ctx.strokeStyle = '#3b3550'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y - 25.5); ctx.lineTo(x + Math.cos(a) * 11, y - 25.5 + Math.sin(a) * 11); ctx.stroke();
    ctx.fillStyle = C.gold; circle(x + Math.cos(a) * 11, y - 25.5 + Math.sin(a) * 11, 3); ctx.fill();
  } else {
    // the lower street: a jack with a prop pole up to the plank's middle
    const top = pose.py + QUAKE.plankTh + 1, px = br.cx;
    ctx.fillStyle = '#8a5833'; ctx.fillRect(px - 4.5, top, 9, y - 5 - top);
    ctx.fillStyle = '#b57a4a'; ctx.fillRect(px - 2.5, top, 4, y - 5 - top);
    ctx.fillStyle = '#5d5872'; for (let yy = top + 30; yy < y - 30; yy += 46) ctx.fillRect(px - 5.5, yy, 11, 4);
    ctx.fillRect(px - 9, top - 1, 18, 4);
    rr(x - 13, y - 7, 26, 7, 2); ctx.fill();
    ctx.fillStyle = '#e0b453'; rr(x - 11, y - 19, 22, 4, 2); ctx.fill();
  }
}
function quakeDrawPlank(st, br) {
  const pose = quakePose(br), hl = br.hl, tk = QUAKE.plankTh;
  ctx.save(); ctx.translate(br.cx, pose.py); ctx.rotate(br.th);
  ctx.fillStyle = C.plankDark; rr(-hl, 0, 2 * hl, tk, 3); ctx.fill();
  ctx.fillStyle = C.plank; rr(-hl, 0, 2 * hl, tk - 3, 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(-hl + 3, 1, 2 * hl - 6, 1.5);
  ctx.fillStyle = C.plankDark;
  for (let x = -hl + 38; x < hl - 10; x += 38) ctx.fillRect(x, 0, 1.5, tk - 3);
  for (let x = -hl + 6; x < hl; x += 38) { circle(x, tk / 2 - 1, 1.1); ctx.fill(); }
  // the fitting in the middle: a ring for the rope (lower streets), a bracket on the pole (upper streets)
  ctx.fillStyle = '#5d5872';
  if (br.lane === 1) { ctx.strokeStyle = '#5d5872'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -2, 3, 0, Math.PI * 2); ctx.stroke(); }
  else ctx.fillRect(-9, tk - 1, 18, 3);
  if (br.gold) {
    for (const bx of [-hl * 0.5, hl * 0.5]) {
      ctx.fillStyle = C.goldDark; ctx.fillRect(bx - 4, -1.5, 8, tk + 3);
      ctx.fillStyle = C.gold; ctx.fillRect(bx - 3, -1, 6, tk + 2);
    }
    const sx = ((G.clock * 160) % (2 * hl + 80)) - hl - 40;
    ctx.fillStyle = 'rgba(255,240,170,0.55)'; ctx.fillRect(clamp(sx, -hl, hl), 0, Math.max(0, Math.min(18, hl - sx)), tk - 3);
  }
  if (br.done) {
    for (const bx of [-br.hw - 3, br.hw + 3]) {
      ctx.fillStyle = '#5d5872'; circle(bx, tk / 2 - 1, 3.3); ctx.fill();
      ctx.fillStyle = '#c9c4dc'; circle(bx - 0.8, tk / 2 - 1.8, 1.2); ctx.fill();
    }
  }
  if (br.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (br.flash / 0.6 * 0.7).toFixed(3) + ')'; rr(-hl, 0, 2 * hl, tk, 3); ctx.fill(); }
  ctx.restore();
}
function quakeCrateShape(c) {   // origin at the bottom middle
  const w = QUAKE.crateW, h = QUAKE.crateH;
  const fruit = ['#ff9f1c', '#e8344e', '#7cc576'][Math.floor(c.wob) % 3];
  ctx.fillStyle = fruit;
  for (const fx of [-7, 0, 7]) { circle(fx, -h - 1 + (fx ? 1 : -1), 4.2); ctx.fill(); }
  ctx.fillStyle = '#8a5833'; rr(-w / 2, -h, w, h, 3); ctx.fill();
  ctx.fillStyle = '#d9a066'; rr(-w / 2 + 2.5, -h + 2.5, w - 5, h - 5, 2); ctx.fill();
  ctx.strokeStyle = '#8a5833'; ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(-w / 2 + 3, -h + 3); ctx.lineTo(w / 2 - 3, -3); ctx.moveTo(w / 2 - 3, -h + 3); ctx.lineTo(-w / 2 + 3, -3); ctx.stroke();
}
function quakeDrawCrate(br, c) {
  if (c.gone) {
    if (!c.fall) return;
    const f = c.fall;
    ctx.save(); ctx.globalAlpha = clamp(1 - f.t / 0.7, 0, 1); ctx.translate(f.x, f.y); ctx.rotate(f.rot); quakeCrateShape(c); ctx.restore();
    return;
  }
  const pose = quakePose(br), x = br.cx + c.u, y = pose.py + Math.tan(br.th) * c.u;
  const sq = c.boing > 0 ? 1 - 0.2 * Math.sin(c.boing / 0.25 * Math.PI) : 1;
  ctx.save(); ctx.translate(x, y); ctx.rotate(br.th); ctx.scale(2 - sq, sq); quakeCrateShape(c); ctx.restore();
}
// the cable car: the rails still span the crack (only the car can roll on them); a cable runs from the winch's pulley
// down to a wheel at the far end, then back along the rails to the car's grip
function quakeDrawCarBack(st, br) {
  const X = br.carX, F = br.cy, cw = QUAKE.carW, cr = br.crank;
  ctx.fillStyle = '#5d5872'; ctx.fillRect(br.x0 - 8, F + 3, br.x1 - br.x0 + 16, 2.5); ctx.fillRect(br.x0 - 8, F + 8, br.x1 - br.x0 + 16, 2.5);
  ctx.fillStyle = '#4a4560'; for (let x = br.x0 + 6; x < br.x1 - 4; x += 22) ctx.fillRect(x, F + 3, 3, 8);
  if (cr) {
    const fx = br.x1 + 16, fy = F + 6, gx = X + cw / 2;
    ctx.strokeStyle = '#3b3550'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cr.x, QUAKE.bandBot + 9); ctx.lineTo(fx, fy - 5); ctx.moveTo(fx, fy + 5); ctx.lineTo(gx, F + 9); ctx.stroke();
    ctx.fillStyle = '#8e88a8'; circle(fx, fy, 6); ctx.fill(); ctx.fillStyle = '#3b3550'; circle(fx, fy, 2.2); ctx.fill();
  }
  // the far wall of the car, the floor and the wheels
  ctx.fillStyle = '#f6e7c1'; ctx.fillRect(X + 3, F - 70, cw - 6, 44);
  ctx.fillStyle = '#9fd3ef'; for (let i = 0; i < 3; i++) { rr(X + 10 + i * 25, F - 64, 20, 24, 4); ctx.fill(); }
  ctx.fillStyle = '#c23a50'; ctx.fillRect(X + 3, F - 26, cw - 6, 26);
  ctx.fillStyle = '#8a5833'; ctx.fillRect(X + 10, F - 13, cw - 20, 4);
  ctx.fillStyle = '#6b3b2a'; ctx.fillRect(X, F, cw, 5);
  ctx.fillStyle = '#3a2a3a'; ctx.fillRect(X + 8, F + 5, cw - 16, 4);
  for (const wx of [X + 20, X + cw - 20]) { ctx.fillStyle = '#2a2440'; circle(wx, F + 9, 5.5); ctx.fill(); ctx.fillStyle = '#8e88a8'; circle(wx, F + 9, 2); ctx.fill(); }
}
function quakeDrawCarFront(st, br) {
  const X = br.carX, F = br.cy, cw = QUAKE.carW, red = '#b0283f', redD = '#7d1b2e';
  ctx.fillStyle = red; ctx.fillRect(X + 1, F - 72, 4, 60); ctx.fillRect(X + cw - 5, F - 72, 4, 60);
  ctx.fillStyle = redD; rr(X - 5, F - 80, cw + 10, 10, 5); ctx.fill();
  ctx.fillStyle = '#f6e7c1'; rr(X + 14, F - 91, cw - 28, 12, 3); ctx.fill();
  text(st.deco === 'ferry' ? 'FERRY' : 'POWELL ST', X + cw / 2, F - 84.5, 9, redD, 'center', 'body');
  if (br.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; rr(X - 5, F - 80, cw + 10, 10, 5); ctx.stroke(); }
  ctx.fillStyle = red; rr(X + 6, F - 13, cw - 12, 14, 3); ctx.fill();
  ctx.strokeStyle = br.gold ? '#fff2b0' : C.gold; ctx.lineWidth = 1; rr(X + 9, F - 10.5, cw - 18, 9, 2); ctx.stroke();
  text('6', X + cw / 2, F - 5.5, 9, C.gold, 'center', 'body');
  const sw = br.bellT > 0 && !reduceMotion ? Math.sin(br.bellT * 30) * 0.5 : 0;
  ctx.save(); ctx.translate(X + 13, F - 70); ctx.rotate(sw);
  ctx.fillStyle = C.goldDark; ctx.fillRect(-0.75, 0, 1.5, 4);
  ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(0, 9, 5, Math.PI, 0); ctx.lineTo(6, 10.5); ctx.lineTo(-6, 10.5); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function quakeDrawCrackFx(br, f) {   // as a room starts, the cracks flash open
  ctx.strokeStyle = 'rgba(255,240,200,' + f.toFixed(3) + ')'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(br.x0, br.cy + 2);
  for (let x = br.x0, k = 0; x <= br.x1; x += 15, k++) ctx.lineTo(x, br.cy + 2 + (k % 2 ? 6 : -2) * f);
  ctx.stroke();
}

/* ---------- drawing over the players: the car's front, gauges, arrows, badges, hints, pops ---------- */
function quakeDrawTop(st) {
  if (!st.bridges) return;
  const k = hudBig() ? 1.35 : 1, A = quakeActive(st), t = G.clock;
  for (const br of st.bridges) if (br.kind === 'car') quakeDrawCarFront(st, br);
  const lift = G.players.map(() => 6 * k);   // how far over each head the next thing goes
  // the balance gauge over each holder
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (P.grip && p.alive) { quakeDrawGauge(st, P.grip, p, k); lift[p.id] = 44 * k; }
  }
  if (A && G.introT <= 0) {
    // where to go: a bouncing ▼ over the crank to hold, a ▶ for the crosser once the way is ready
    const br = A.br, cr = br.crank, X = G.players[A.X], PX = st.pl[A.X];
    if (cr && br.held < 0) quakeArrow(cr.x, cr.y - 66 - Math.abs(Math.sin(t * 4)) * 6 * (reduceMotion ? 0 : 1), PCOL[A.H], 'down', k);
    const ready = br.held >= 0 && (br.kind === 'car' ? br.s < 0.05 : br.up >= 1);
    const bob = reduceMotion ? 0 : Math.abs(Math.sin(t * 5)) * 6;
    if (X.alive && !PX.whoa && quakeLaneOf(X) === br.lane && st.wave.phase !== 'shake') {
      if (ready && !PX.on && X.x + X.w / 2 < br.x0 + 4) quakeArrow(br.x0 - 12 + bob + (br.kind === 'car' ? 36 : 0), br.cy - 44, PCOL[A.X], 'right', k);
      if (br.kind === 'car' && br.parked && PX.on === br) quakeArrow(br.x1 + 14 + bob, br.cy - 44, PCOL[A.X], 'right', k);
    }
    // who does what, as a room starts
    if (st.liveT < QUAKE.roleT) {
      const a = clamp((QUAKE.roleT - st.liveT) / 0.6, 0, 1);
      for (const [id, s, col] of [[A.H, br.kind === 'car' ? 'Pull the car' : 'Hold the bridge', C.gold], [A.X, br.kind === 'car' ? 'Ride across' : 'Cross', '#ffffff']]) {
        const p = G.players[id];
        if (!p.alive) continue;
        quakeBadge(p, s, col, a, k, p.y - lift[id] - 10 * k);
        lift[id] += 24 * k;
      }
    }
  }
  for (const p of G.players) { const P = st.pl[p.id]; if (P.hint && p.alive) quakeBubble(p, P.hint, k, p.y - lift[p.id]); }
  for (const q of st.pops) {
    const sc = q.t < 0.12 ? 0.5 + q.t / 0.12 * 0.7 : q.t < 0.2 ? 1.2 - (q.t - 0.12) / 0.08 * 0.2 : 1, size = q.size * k;
    ctx.font = size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const hw = ctx.measureText(q.s).width / 2 + 10, x = clamp(q.x, hw, W - hw), y = Math.max(86 + size / 2, q.y - q.t * 26);
    ctx.save(); ctx.globalAlpha = clamp((1.1 - q.t) / 0.35, 0, 1); bigText(q.s, x, y, size, q.col, sc); ctx.restore();
  }
}
function quakeArrow(x, y, col, dir, k) {
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); if (dir === 'right') ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(9, -6); ctx.lineTo(0, 7); ctx.closePath(); ctx.stroke(); ctx.fill();
  ctx.restore();
}
// the level gauge: keep the ball in the green (the cable car: a little track with the car on it)
function quakeDrawGauge(st, br, p, k) {
  const w = 100 * k, h = 14 * k, x = clamp(p.x + p.w / 2, w / 2 + 30 * k, W - w / 2 - 30 * k), y = p.y - 24 * k, hw = w / 2;
  ctx.fillStyle = 'rgba(28,26,54,0.85)'; rr(x - hw - 6 * k, y - h / 2 - 5 * k, w + 12 * k, h + 10 * k, (h + 10 * k) / 2); ctx.fill();
  if (br.kind === 'car') {
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; rr(x - hw, y - 2 * k, w, 4 * k, 2 * k); ctx.fill();
    ctx.fillStyle = C.grass; circle(x + hw - 2 * k, y, 4 * k); ctx.fill();
    const cx = x - hw + 10 * k + clamp(br.s, 0, 1) * (w - 22 * k);
    ctx.fillStyle = '#b0283f'; rr(cx - 9 * k, y - 6 * k, 18 * k, 10 * k, 3 * k); ctx.fill();
    ctx.fillStyle = '#f6e7c1'; ctx.fillRect(cx - 6 * k, y - 4 * k, 12 * k, 3.5 * k);
    ctx.fillStyle = '#2a2440'; circle(cx - 5 * k, y + 5 * k, 2 * k); ctx.fill(); circle(cx + 5 * k, y + 5 * k, 2 * k); ctx.fill();
    const rider = G.players.some(q => st.pl[q.id].on === br);
    if (rider && !br.parked && Math.sin(G.clock * 8) > -0.3) quakeArrow(x + hw + 18 * k, y, PCOL[p.id], 'right', k * 0.8);
    return;
  }
  const gz = hw * QUAKE.green, yz = hw * QUAKE.red, b = clamp(br.b, -1, 1);
  ctx.save(); rr(x - hw, y - h / 2, w, h, h / 2); ctx.clip();
  ctx.fillStyle = '#ff7a6b'; ctx.fillRect(x - hw, y - h / 2, w, h);
  ctx.fillStyle = '#ffd36b'; ctx.fillRect(x - yz, y - h / 2, 2 * yz, h);
  ctx.fillStyle = '#7ee0a0'; ctx.fillRect(x - gz, y - h / 2, 2 * gz, h);
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x - 0.75 * k, y - h / 2, 1.5 * k, h);
  ctx.restore();
  const bx = x + b * (hw - h / 2), red = Math.abs(b) >= QUAKE.red;
  if (red && Math.sin(G.clock * 18) > 0) { ctx.strokeStyle = '#ff7a6b'; ctx.lineWidth = 2.5 * k; circle(bx, y, h / 2 + 5 * k); ctx.stroke(); }
  ctx.fillStyle = '#ffffff'; circle(bx, y, h / 2 + 1.5 * k); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
  // which way to lean it back (it blinks when the ball leaves the green)
  if (Math.abs(b) > QUAKE.green && Math.sin(G.clock * 10) > -0.4) {
    const dir = b > 0 ? -1 : 1;
    ctx.save(); ctx.translate(x + dir * (hw + 18 * k), y); ctx.scale(k * 0.8, k * 0.8); ctx.rotate(dir > 0 ? -Math.PI / 2 : Math.PI / 2);
    ctx.fillStyle = PCOL[p.id]; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(9, -6); ctx.lineTo(0, 7); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.restore();
  }
}
function quakeBadge(p, s, col, a, k, y) {
  const fs = 12 * k;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(s).width + 16 * k, h = 19 * k, x = clamp(p.x + p.w / 2, w / 2 + 4, W - w / 2 - 4);
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(28,26,54,0.85)'; rr(x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = PCOL[p.id]; ctx.lineWidth = 1.5; ctx.stroke();
  text(s, x, y + 0.5, fs, col, 'center', 'body');
  ctx.restore();
}
function quakeBubble(p, hint, k, bottom) {
  const fs = 13 * k, a = clamp(Math.min(hint.t / 0.15, (hint.life - hint.t) / 0.3), 0, 1);
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(hint.s).width + 18 * k, h = 24 * k, cx = p.x + p.w / 2, x = clamp(cx, w / 2 + 4, W - w / 2 - 4), y = Math.max(h / 2 + 78, bottom - 6 * k - h / 2);
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  rr(x - w / 2, y - h / 2, w, h, 8 * k); ctx.fill(); ctx.stroke();
  const tx = clamp(cx, x - w / 2 + 12, x + w / 2 - 12);
  ctx.beginPath(); ctx.moveTo(tx - 6 * k, y + h / 2 - 1); ctx.lineTo(tx, y + h / 2 + 6 * k); ctx.lineTo(tx + 6 * k, y + h / 2 - 1); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(tx - 6 * k, y + h / 2); ctx.lineTo(tx, y + h / 2 + 6 * k); ctx.lineTo(tx + 6 * k, y + h / 2); ctx.stroke();
  text(hint.s, x, y + 0.5, fs, C.ink, 'center', 'body');
  ctx.restore();
}

/* ---------- HUD: time and crossings (top right), the seismograph (top centre) ---------- */
const QUAKE_SEIS = { wait: ['All calm', '#9fe3b0'], calm: ['All calm', '#9fe3b0'], warn: ['Rumble coming!', '#ffc53d'], shake: ['RUMBLE! Hold on!', '#ff9a8a'] };
function quakeHud(st) {
  if (!st.bridges) return;
  const big = hudBig(), k = big ? 1.3 : 1, fs = 14 * k, h = 28 * k;
  // right: the time and one little plank (or car) per crossing in this room, filled in once crossed
  const tm = fmtTime(G.time);
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const tw = ctx.measureText(tm).width, n = st.bridges.length, iw = 17 * k, gap = 5 * k;
  const w = 15 * k + tw + 12 * k + n * (iw + gap) - gap + 15 * k, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
  text(tm, x0 + 15 * k, cy, fs, C.paper, 'left', 'body');
  st.bridges.forEach((br, i) => {
    const bx = x0 + 15 * k + tw + 12 * k + i * (iw + gap);
    ctx.fillStyle = br.done ? (br.kind === 'car' ? '#e0475e' : C.plank) : 'rgba(255,255,255,0.22)';
    if (br.kind === 'car') { rr(bx + 1 * k, cy - 6 * k, iw - 2 * k, 9 * k, 2.5 * k); ctx.fill(); circle(bx + 5 * k, cy + 4.5 * k, 2 * k); ctx.fill(); circle(bx + iw - 5 * k, cy + 4.5 * k, 2 * k); ctx.fill(); }
    else { rr(bx, cy - 3 * k, iw, 6 * k, 2 * k); ctx.fill(); }
    if (br.done) { ctx.fillStyle = C.gold; circle(bx + iw / 2, cy - (br.kind === 'car' ? 10 : 8) * k, 2 * k); ctx.fill(); }
  });
  // centre: the seismograph (the trace jitters before a rumble, so you can get ready)
  const w8 = st.wave, lab = QUAKE_SEIS[w8.phase] || QUAKE_SEIS.calm, lfs = 13;
  ctx.font = '700 ' + lfs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const lw = Math.max(...Object.values(QUAKE_SEIS).map(v => ctx.measureText(v[0]).width));
  const sw = 34 + 118 + 12 + lw + 16, sh = 32;
  ctx.save(); ctx.translate(W / 2, 10); ctx.scale(k, k);
  const L0 = pill(0, 0, sw, sh, 'center');
  if (w8.phase === 'shake') { ctx.strokeStyle = 'rgba(255,154,138,' + (0.5 + 0.5 * Math.sin(G.clock * 12)).toFixed(3) + ')'; ctx.lineWidth = 2; rr(L0, 0, sw, sh, sh / 2); ctx.stroke(); }
  // a teacup that rattles
  const tj = reduceMotion ? 0 : Math.sin(G.clock * 40) * 1.5 * w8.I;
  ctx.save(); ctx.translate(L0 + 20 + tj, 21); ctx.rotate(tj * 0.08);
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-7, -11); ctx.lineTo(7, -11); ctx.lineTo(5, -1.5); ctx.lineTo(-5, -1.5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(7.5, -7, 3, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  ctx.fillStyle = C.pip; ctx.fillRect(-6, -9, 12, 2);
  ctx.restore();
  // the paper strip with the trace and the pen
  const px = L0 + 36, pw = 118, pmid = sh / 2;
  ctx.fillStyle = '#f6efdf'; rr(px, 5, pw, sh - 10, 5); ctx.fill();
  ctx.strokeStyle = 'rgba(28,26,54,0.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px + 3, pmid); ctx.lineTo(px + pw - 3, pmid); ctx.stroke();
  ctx.strokeStyle = w8.phase === 'shake' ? '#d0354c' : '#3b3550'; ctx.lineWidth = 1.5; ctx.beginPath();
  const N = st.seis.length;
  for (let i = 0; i < N; i++) {
    const v = st.seis[(st.seisK + i) % N], xx = px + 4 + i * (pw - 12) / (N - 1), yy = pmid - v * 9;
    if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
  }
  ctx.stroke();
  const last = st.seis[(st.seisK + N - 1) % N];
  ctx.fillStyle = '#d0354c'; circle(px + pw - 8, pmid - last * 9, 2.6); ctx.fill();
  const blink = w8.phase !== 'warn' || Math.sin(G.clock * 12) > -0.3;
  if (blink) text(lab[0], px + pw + 12, pmid + 0.5, lfs, lab[1], 'left', 'body');
  // the gold help banner
  if (st.banner) {
    const bt = st.banner.t, a = clamp(Math.min(bt / 0.2, (3.2 - bt) / 0.4), 0, 1), sc = bt < 0.15 ? 0.8 + bt / 0.15 * 0.2 : 1;
    ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
    const bw = ctx.measureText(st.banner.s).width + 40;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(0, sh + 20); ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(28,26,54,0.9)'; rr(-bw / 2, -14, bw, 28, 14); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = C.gold; circle(-bw / 2 + 15, 0, 4); ctx.fill();
    text(st.banner.s, 8, 0.5, 14, C.gold, 'center', 'body');
    ctx.restore();
  }
  ctx.restore();
}

/* ---------- sounds ---------- */
Sfx.extra.quakeTeacup = function () { const f = 2300 + Math.random() * 900; this.tone(f, 0.03, 'triangle', 0.016); this.tone(f * 1.26, 0.025, 'triangle', 0.012, null, 0.04); };
Sfx.extra.quakeWarn = function () { this.tone(70, 0.7, 'sawtooth', 0.022, 48); this.tone(110, 0.5, 'triangle', 0.03, 80, 0.12); };
Sfx.extra.quakeShake = function () { this.tone(56, 1.3, 'sawtooth', 0.035, 40); this.tone(92, 0.9, 'square', 0.014, 60, 0.05); this.tone(140, 0.4, 'triangle', 0.03, 70, 0.3); };
Sfx.extra.quakeGrip = function (p) { this.tone(520 * p, 0.06, 'square', 0.035); this.tone(780 * p, 0.05, 'triangle', 0.03, null, 0.04); };
Sfx.extra.quakeRelease = function (p) { this.tone(420 * p, 0.09, 'triangle', 0.03, 300 * p); };
Sfx.extra.quakeUp = function () { this.tone(240, 0.24, 'sawtooth', 0.018, 480); this.tone(880, 0.06, 'triangle', 0.045, null, 0.22); };
Sfx.extra.quakeDroop = function () { this.tone(420, 0.3, 'sawtooth', 0.018, 170); };
Sfx.extra.quakeClonk = function () { this.tone(170, 0.08, 'square', 0.035, 110); };
Sfx.extra.quakeWobble = function () { this.tone(760, 0.07, 'square', 0.03); this.tone(640, 0.07, 'square', 0.028, null, 0.09); };
Sfx.extra.quakeSaved = function () { [784, 1047, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.055, null, i * 0.05)); };
Sfx.extra.quakeWhoa = function (p) { this.tone(900 * p, 0.38, 'sine', 0.06, 320 * p); };
Sfx.extra.quakeGold = function () { [659, 880, 1175, 1568].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.quakeThunk = function () { this.tone(120, 0.1, 'triangle', 0.06, 80); };
Sfx.extra.quakeRoll = function () { this.tone(300, 0.05, 'triangle', 0.022, 250); };
Sfx.extra.quakeBell = function () { [0, 0.2].forEach(d => { this.tone(1568, 0.3, 'triangle', 0.055, null, d); this.tone(2349, 0.22, 'sine', 0.025, null, d); }); };
Sfx.extra.quakePlonk = function () { this.tone(300, 0.12, 'triangle', 0.06, 120); this.tone(90, 0.22, 'sine', 0.07, 60, 0.16); };
Sfx.extra.quakeBoing = function (p) { this.tone(220 * p, 0.24, 'sine', 0.08, 700 * p); };
Sfx.extra.quakeBonk = function () { this.tone(260, 0.08, 'triangle', 0.06, 160); };
Sfx.extra.quakeAcross = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'square', 0.035, null, i * 0.08)); };
Sfx.extra.quakeGate = function () { this.tone(200, 0.2, 'sawtooth', 0.03, 120); this.tone(600, 0.1, 'triangle', 0.04, null, 0.18); };
Sfx.extra.quakeOops = function (p) { this.tone(520 * p, 0.3, 'sine', 0.05, 190 * p); };
Sfx.extra.quakeBack = function (p) { this.tone(400 * p, 0.15, 'triangle', 0.05, 800 * p); };
