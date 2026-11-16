/* Pip & Bo - Level 40-1 The Iron Colossus: Part 4 'boiler' (The Boiler, core 1). */
'use strict';

/* ===== 40-1 Part 4: The Boiler (IRON_PHASES.boiler) =================================================================
   Inside. Dark charcoal paper, chalk line, the furnace glow the only warm colour apart from the heroes. One holds
   something open while the other dashes through, then they leapfrog. Its twist: PRESSURE.
   A long boiler corridor scrolling right: six VALVES (V0..V5), and between them five steam STRETCHES (S0..S4), a
   curtain of jets from the ceiling pipe to the grating. Valve k shuts the stretch on each side of it (k-1 and k)
   while a hero holds the action at its wheel. The jets come back `warm` s after letting go (a hiss first).
   PRESSURE: a held valve fills its dial in `red` s (gold `goldRed`). In the red it KICKS: the jets on its stretches
   blast for `kickT` s (a Clang for anyone in them) and the holder is knocked off. Letting go BLEEDS it (`bleed`/s):
   the jets come back for that moment, so the dasher waits in an ALCOVE (the chalk arches marked SAFE: no jet there).
   THE LEAPFROG (ironBoilerStep): at step n the holder holds Vn; the dasher runs from V(n-1) through S(n-1) and S(n)
   to V(n+1), and holds it for the other. Step 0 starts with both at V0. After V5 the core room.
   THE CORE: a glowing ember in a cage with two locking wheels on opposite sides. Both turn (hold the action) for
   `core.need` s together, while the furnace's BREATH (a low flame across the floor every `core.every` s, a tell
   first) has to be jumped. Then the cage opens and they lift the ember out: core 1.
   Rivets: 8, on the runs.   Stats (st.stats.boiler): kicks, bleeds.   Names: ironBoiler* / IRONBOILER*. */
const IRONBOILER = {
  camY: -450, ceil: -330, end: 4260,
  valves: [200, 880, 1560, 2240, 2920, 3600], zone: 80, grab: 30,
  red: 4, goldRed: 6.5, goldCap: 0.7, bleed: 0.7, warm: 0.9, goldWarm: 2.6, kickT: 1.2,
  alcoves: [0.33, 0.67], alcoveW: 64,
  core: { x: 3850, fx: 4110, wheel: 92, need: 2, every: 3.4, tell: 1.0, v: 420, h: 34, decay: 0.25 },
  rivets: [[400, -14], [700, -14], [1080, -14], [1380, -14], [1760, -14], [2060, -14], [2440, -14], [2740, -14]],
};
// stretch j: from V(j) + zone to V(j+1) - zone; its alcoves (no jets there)
const ironBoilerStretch = j => { const K = IRONBOILER, a = K.valves[j] + K.zone, b = K.valves[j + 1] - K.zone; return { j, a, b, alc: K.alcoves.map(f => a + (b - a) * f) }; };
const ironBoilerRedT = st => (ironHasGold(st, 'boiler') ? IRONBOILER.goldRed : IRONBOILER.red);
const ironBoilerWarm = st => (ironHasGold(st, 'boiler') ? IRONBOILER.goldWarm : IRONBOILER.warm);
// is world x in steam on stretch j (inside it, not in an alcove)?
function ironBoilerInJet(j, x) {
  if (j < 0 || j > 4) return false;
  const s = ironBoilerStretch(j);
  return x > s.a && x < s.b && !s.alc.some(c => Math.abs(x - c) < IRONBOILER.alcoveW / 2 - 8);
}
const ironBoilerStretchAt = x => { for (let j = 0; j < 5; j++) { const s = ironBoilerStretch(j); if (x > s.a && x < s.b) return j; } return -1; };
const ironBoilerInAlcove = x => { const j = ironBoilerStretchAt(x); return j >= 0 && ironBoilerStretch(j).alc.some(c => Math.abs(x - c) < IRONBOILER.alcoveW / 2 - 8); };

function ironBoilerSetup(st, L) {
  const ph = st.ph, K = IRONBOILER;
  ph.first = L.def.first || 0;
  ph.t = 0; ph.n = 0; ph.holder = ph.first;
  ph.valves = K.valves.map((x, i) => ({ i, x, p: 0, held: -1, kick: 0, spin: 0, heldWas: false }));
  ph.jets = [0, 1, 2, 3, 4].map(j => ({ j, on: 1, offT: 0 }));   // on: 1 blowing, 0 shut; offT: how long shut / warming
  ph.core = { st: 'shut', prog: 0, t: 0, breath: { st: 'wait', t: 0, x: 0, dir: 1 }, lift: 0 };
  ph.safeX = [K.valves[0], K.valves[0]];
  st.cam = { x: 0, y: K.camY };
  G.players.forEach((p, k) => Object.assign(p, { x: K.valves[0] - 70 + k * 44 - p.w / 2 - st.cam.x, y: -p.h - st.cam.y, vx: 0, vy: 0, face: 1, grounded: true, alive: true }));
  ironRivetsSetup(st, K.rivets);
  const s = ironStats(st); Object.assign(s, { kicks: s.kicks || 0, bleeds: s.bleeds || 0 });
  Object.assign(st.tick, { hidden: true });
  ph.solids = [{ x0: -60, y0: 0, x1: K.end + 60, y1: 90, kind: 'floor' }, { x0: -60, y0: -700, x1: 0, y1: 90, kind: 'wall' }, { x0: K.end, y0: -700, x1: K.end + 60, y1: 90, kind: 'wall' }];
  ph.prep = [];
  for (let k = 0; k < 5; k++) ph.prep.push(() => IRON_ART.boilerWall(k));
  ph.prep.push(() => IRON_ART.boilerFloor(), () => IRON_ART.furnace(), () => IRON_ART.valve(), () => IRON_ART.valveStand(), () => IRON_ART.nozzle(),
    () => IRON_ART.porthole('hollow'), () => IRON_ART.porthole('candy'), () => IRON_ART.emberCage());
}

function ironBoilerStep(st, dt) {
  const ph = st.ph, K = IRONBOILER, ps = G.players;
  ph.t += dt;
  if (st.idle) { ironCoast(st, dt, ph.solids); ironBoilerCamera(st, dt); return; }
  if (ph.core.st === 'lift') { ironBoilerLift(st, dt); return; }
  ironBoilerValves(st, dt);
  for (const p of ps) ironBody(p, dt, ph.solids, { partner: true });
  ironTrack(st);
  ironBoilerJets(st, dt);
  ironBoilerLeap(st);
  ironBoilerCore(st, dt);
  ironBoilerCamera(st, dt);
  ironRivetsStep(st, dt);
  ironBoilerHints(st);
}
function ironBoilerGold(st) { ironGoldOnce(st, 'boiler', 'Gold help! The valves never kick now, and the steam waits longer.'); }
/* --- valves: hold to shut; pressure; the kick; the bleed --- */
function ironBoilerValves(st, dt) {
  const ph = st.ph, K = IRONBOILER;
  for (const v of ph.valves) {
    v.held = -1;
    if (v.kick > 0) { v.kick -= dt; continue; }
    for (const p of G.players) if (p.alive && p.grounded && p.input.act && Math.abs(p.x + p.w / 2 - v.x) < K.grab) v.held = p.id;
    if (v.held >= 0) {
      v.p += dt / ironBoilerRedT(st); v.spin += dt * 3;
      if (ironHasGold(st, 'boiler')) v.p = Math.min(v.p, K.goldCap);   // gold: the dial sticks below the red, no kick
      if (!v.heldWas) Sfx.play('ironboilerValveTurn');
      if (v.p >= 1) {
        // the kick: a blast, the holder knocked off the wheel
        v.kick = K.kickT; v.p = 0.45; ironStats(st).kicks++;
        const p = G.players[v.held]; knock(p, -p.face * 160 || -160, -220, 0.5, 0.3); v.held = -1;
        Sfx.play('ironboilerValveKick'); ironWord(st, 'KA-BLAM!', v.x, -220, 30, { life: 1, rise: 14 });
        if (!reduceMotion) G.shake = Math.max(G.shake, 0.25);
        if (ironMiss(st, 'boiler') >= IRON.goldAfter) ironBoilerGold(st);
      }
    } else {
      if (v.heldWas && v.p > 0.15) { Sfx.play('ironboilerBleed'); ironStats(st).bleeds++; }
      v.p = Math.max(0, v.p - K.bleed * dt);
    }
    if (v.p > 0.75 && v.held >= 0 && ((G.clock * 8) | 0) % 2 === 0 && !(v.dialT > 0)) { Sfx.play('ironboilerDialTick'); v.dialT = 0.25; }
    v.dialT = (v.dialT || 0) - dt;
    v.heldWas = v.held >= 0;
  }
}
// a stretch is shut while either of its valves is held (and neither is kicking)
function ironBoilerJets(st, dt) {
  const ph = st.ph, K = IRONBOILER;
  for (const J of ph.jets) {
    const a = ph.valves[J.j], b = ph.valves[J.j + 1];
    const kick = a.kick > 0 || b.kick > 0, shut = !kick && (a.held >= 0 || b.held >= 0);
    if (shut) { if (J.on && J.offT <= 0) Sfx.play('ironboilerJetOff'); J.on = 0; J.offT = ironBoilerWarm(st); }
    else if (kick) { J.on = 1; J.offT = 0; }
    else if (J.offT > 0) { J.offT -= dt; if (J.offT <= 0) { J.on = 1; Sfx.play('ironboilerJetHiss'); } }
    else J.on = 1;
    if (!J.on) continue;
    for (const p of G.players) {
      if (!p.alive || st.safe[p.id] > 0) continue;
      const cx = p.x + p.w / 2;
      if (ironBoilerInJet(J.j, cx) && p.y < 0) {
        // scalded back to the last safe spot (a valve, an alcove)
        if (ironClang(st, p, { kind: 'steam', word: 'TSSS!', to: { x: ph.safeX[p.id], y: 0 } }) && ironMiss(st, 'boiler') >= IRON.goldAfter) ironBoilerGold(st);
      }
    }
  }
  // remember each hero's last safe spot
  for (const p of G.players) {
    const cx = p.x + p.w / 2;
    if (p.grounded && (ironBoilerInAlcove(cx) || ironBoilerStretchAt(cx) < 0)) ph.safeX[p.id] = cx;
  }
}
// the leapfrog: the dasher reached the next valve: it is theirs now
function ironBoilerLeap(st) {
  const ph = st.ph, K = IRONBOILER;
  if (ph.n > 5) return;
  const dash = G.players[1 - ph.holder];
  if (ph.n < 5) {
    const nx = K.valves[ph.n + 1];
    if (dash.alive && dash.grounded && Math.abs(dash.x + dash.w / 2 - nx) < 46) {
      ph.n++; ph.holder = dash.id; ironSwap(st); ironCelebrate(st, 0.3);
      ironNews(st, ph.n === 5 ? 'Last valve! Hold it so ' + NAMES[1 - dash.id] + ' can get through.' : 'Valve ' + (ph.n + 1) + ' of 6. Swap: now ' + NAMES[dash.id] + ' holds.');
    }
  } else if (dash.alive && dash.x + dash.w / 2 > K.valves[5] + K.zone + 20) {
    ph.n = 6; ironCelebrate(st, 0.5); ironNews(st, 'The core! Turn both wheels together.'); Sfx.play('ironboilerCageWheel');
  }
}
/* --- the core: two wheels and the furnace's breath --- */
function ironBoilerCore(st, dt) {
  const ph = st.ph, K = IRONBOILER, C = K.core, c = ph.core, ps = G.players;
  if (ph.n < 6) return;
  const on = [-1, 1].map(s => ps.find(p => p.alive && p.grounded && p.input.act && Math.abs(p.x + p.w / 2 - (C.x + s * C.wheel)) < K.grab));
  const both = on[0] && on[1] && on[0] !== on[1];
  c.turning = on.map(Boolean);
  if (both) { c.prog += dt; if (!(c.ratT > 0)) { Sfx.play('ironboilerCageWheel'); c.ratT = 0.35; } } else c.prog = Math.max(0, c.prog - C.decay * dt);
  c.ratT = (c.ratT || 0) - dt;
  // the breath: a low flame from the furnace across the floor, on the beat
  const b = c.breath, v = ironHasGold(st, 'boiler') ? C.v * 0.7 : C.v;
  b.t += dt;
  if (b.st === 'wait' && b.t >= C.every - C.tell) { b.st = 'tell'; b.t = 0; b.dir = -1; Sfx.play('ironboilerFlameSweep'); }
  else if (b.st === 'tell' && b.t >= C.tell) { b.st = 'go'; b.t = 0; b.x = C.fx - 90; }   // out of the furnace door, along the floor
  else if (b.st === 'go') {
    b.x += b.dir * v * dt;
    for (const p of ps) {
      if (!p.alive || st.safe[p.id] > 0) continue;
      const feet = p.y + p.h;
      if (feet > -C.h && Math.abs(p.x + p.w / 2 - b.x) < 30) ironClang(st, p, { kind: 'flame', word: 'FWOOSH!', fromX: b.x - b.dir * 40 });
    }
    if (b.x < C.x - 320) { b.st = 'wait'; b.t = 0; }
  }
  if (c.prog >= C.need) {
    c.st = 'lift'; c.t = 0; Sfx.play('ironboilerEmberLift');
    ironWord(st, 'CLUNK!', C.x, -200, 28, { life: 1, rise: 12 });
    ironNews(st, 'The cage is open! Lift the ember out together.');
  }
}
function ironBoilerLift(st, dt) {
  const ph = st.ph, c = ph.core;
  c.t += dt; c.lift = Math.min(1, c.t / 1.4);
  ironCoast(st, dt, ph.solids);
  if (c.t > 1.0 && !c.cold) { c.cold = true; Sfx.play('ironboilerBoilerCold'); }
  if (c.t > 1.8 && !st.cut) ironPhaseDone(st, { core: true, say: 'NOT MY EMBER! ...It is going all cold in here.' });
}
// the camera: between the two (they stay within one screen of each other: the leapfrog keeps them so)
function ironBoilerCamera(st, dt) {
  const ps = G.players.filter(p => p.alive);
  if (!ps.length) return;
  const mid = ps.reduce((a, p) => a + p.x + p.w / 2, 0) / ps.length;
  st.cam.x += (clamp(mid - W / 2, 0, IRONBOILER.end - W) - st.cam.x) * Math.min(1, dt * 3);
  st.cam.y = IRONBOILER.camY;
  for (const p of G.players) if (p.alive) p.x = clamp(p.x, st.cam.x + 6, st.cam.x + W - 6 - p.w);
}

/* --- the plan --- */
function ironBoilerPlan(st) {
  const ph = st.ph, K = IRONBOILER, out = [{}, {}];
  if (ph.n >= 6) {
    for (const id of [0, 1]) { const s = id === ph.first ? -1 : 1; out[id] = { why: 'wheel', x: K.core.x + s * K.core.wheel, hold: 'act', say: 'Both turn a wheel: hold ' + ironKey(id, 'act') + '! Jump the flame.' }; }
    return out;
  }
  const h = ph.holder, d = 1 - h, v = ph.valves[ph.n];
  out[h] = { why: 'hold', x: v.x, hold: 'act', say: v.kick > 0 ? 'KICKED! Back on the valve.' : v.p > 0.75 ? 'Nearly red! Let go to bleed it.' : 'Hold ' + ironKey(h, 'act') + ' on the valve.' };
  const goal = ph.n < 5 ? K.valves[ph.n + 1] : K.valves[5] + K.zone + 60;
  const shut = ph.jets.some(J => !J.on && (J.j === ph.n - 1 || J.j === ph.n));
  out[d] = { why: 'dash', x: goal, say: shut ? (ph.n < 5 ? 'Steam off! Run to valve ' + (ph.n + 2) + '.' : 'Steam off! Run to the core.') : 'Wait for the steam to stop.' };
  return out;
}
function ironBoilerHints(st) {
  const ph = st.ph, P = ironBoilerPlan(st);
  for (const id of [0, 1]) {
    const s = P[id] && P[id].say;
    if (s && ph['said' + id] !== s) { ph['said' + id] = s; ironHint(st, id, s, { life: 3.2, cpu: '' }); }
    if (!s) ph['said' + id] = null;
  }
}

/* --- drawing (dark paper: chalk on charcoal) --- */
function ironBoilerDrawBack(st) {
  const ph = st.ph, K = IRONBOILER, d = SKETCH.live(ctx, 6140, SKETCH.boil()), cx = st.cam.x;
  d.dark = true;
  ironScreen(st, () => SKETCH.paper(ctx, 'dark'));
  for (let k = 0; k < 5; k++) { const x = k * 960; if (x > cx + W || x + 960 < cx) continue; SKETCH.blit(ctx, IRON_ART.boilerWall(k), x, K.camY); }
  // portholes onto the old worlds, the furnace at the core
  for (const [x, w] of [[560, 'hollow'], [2700, 'candy']]) if (Math.abs(x - cx - 480) < 700) SKETCH.blit(ctx, IRON_ART.porthole(w), x, -264);
  const fx = K.core.fx;
  if (Math.abs(fx - cx - 480) < 900) {
    SKETCH.blit(ctx, IRON_ART.furnace(), fx, -182);
    if (!ph.core.cold) IRON_ART.flames(ctx, fx, -182, 70, G.clock);
  }
  for (let k = 0; k < 5; k++) { const x = k * 960; if (x > cx + W || x + 960 < cx) continue; SKETCH.blit(ctx, IRON_ART.boilerFloor(), x, K.camY); }
  // the stretches: nozzles along the ceiling pipe, the jets, the floor vents, the SAFE arches
  for (const J of ph.jets) {
    const s = ironBoilerStretch(J.j);
    if (s.b < cx - 60 || s.a > cx + W + 60) continue;
    for (let x = s.a + 30; x < s.b; x += 80) {
      if (s.alc.some(c => Math.abs(x - c) < K.alcoveW / 2)) continue;
      SKETCH.blit(ctx, IRON_ART.nozzle(), x, K.ceil);
      if (J.on) IRON_ART.steam(d, x, K.ceil + 2, 0, 1, G.clock + x * 0.01);
      else if (J.offT < K.warm * 0.6) { d.stroke([[x, K.ceil + 6], [x + 0.5, K.ceil + 18]], { w: 1.4, col: '#cfe0e8', sh: 0 }); d.word('hss', x + 10, K.ceil + 30, 9, { col: '#efe8d8' }); }
      else d.stroke([[x, K.ceil + 8], [x + 0.5, K.ceil + 14]], { w: 1.2, col: '#cfe0e8', sh: 0, alpha: 0.6 });
      d.shape([[x - 22, -1], [x + 22, -1], [x + 22, 4], [x - 22, 4]], { w: 1, corner: 30, ink: true });
      for (let k = -2; k <= 2; k++) d.line(x + k * 8 - 2, 4, x + k * 8 + 3, -1, { w: 1.4, col: IRON_P.core, ov: 0 });
    }
    for (const ax of s.alc) {
      d.stroke([[ax - 30, 0], [ax - 30, -60], [ax, -84], [ax + 30, -60], [ax + 30, 0]], { w: 2.4, curve: true, col: '#efe8d8' });
      d.hatch([[ax - 26, 0], [ax - 26, -58], [ax, -80], [ax + 26, -58], [ax + 26, 0]], { a: 60, gap: 3, w: 0.6, force: true, alpha: 0.35, col: '#efe8d8' });
      d.word('SAFE', ax, -98, 13, { align: 'center', col: IRON_P.core, w: 2 });
    }
  }
  // valves, dials
  for (const v of ph.valves) {
    if (Math.abs(v.x - cx - 480) > 620) continue;
    SKETCH.blit(ctx, IRON_ART.valveStand(), v.x, 0);
    SKETCH.blit(ctx, IRON_ART.valve(), v.x, -98, { rot: v.spin });
    IRON_ART.dial(ctx, v.x + 54, -82, 19, v.p);
    if (v.kick > 0) for (let i = 0; i < 4; i++) d.cloud(v.x + 30 + i * 22, -120 - i * 12, 14 + i * 4, { fill: '#9a948a', fillAlpha: 0.4, puffs: 6, w: 1.1, curls: 1, col: '#efe8d8' });
    else if (v.p > 0 && v.held < 0) d.word('TSSS', v.x + 70, -120, 11, { col: '#efe8d8', rot: -0.15, w: 1.4 });
    d.word(String(v.i + 1), v.x - 40, -150, 16, { align: 'center', col: '#efe8d8', w: 2 });
  }
}
function ironBoilerDraw(st) {
  const ph = st.ph, K = IRONBOILER, C = K.core, c = ph.core, d = SKETCH.live(ctx, 6150, SKETCH.boil());
  d.dark = true;
  // the ember cage and its wheels
  const cy = -70, lift = c.lift;
  SKETCH.blit(ctx, IRON_ART.emberCage(), C.x, 0, { alpha: 1 - lift * 0.8 });
  const ex = C.x, ey = cy - 30 - lift * 120;
  const glow = c.cold ? 0.15 : 0.5 + Math.sin(G.clock * 6) * 0.08;
  SKETCH.glow(ctx, ex, ey, 120, '255,150,60', glow);
  d.ellipse(ex, ey, 22, 20, { fill: c.cold ? '#7a6a60' : IRON_P.ember, w: 2, col: '#efe8d8' });
  d.ellipse(ex - 6, ey - 6, 8, 7, { fill: IRON_P.coreHot, w: 0.8, ink: false });
  for (const s of [-1, 1]) {
    const wx = C.x + s * C.wheel;
    SKETCH.blit(ctx, IRON_ART.valve(), wx, -70, { rot: (c.turning && c.turning[(s + 1) / 2] ? G.clock * 3 : 0) + s });
    d.stroke([[wx, -70], [C.x + s * 40, -50]], { w: 3, col: '#efe8d8', sh: 0 });
  }
  if (ph.n >= 6 && c.st === 'shut') {
    // the progress: a chalk ring filling
    const k = c.prog / C.need;
    if (k > 0) d.stroke(SKETCH.ell(C.x, -150, 18, 18, 24, 0, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2), { w: 4, col: IRON_P.core, curve: true, sh: 0 });
    const b = c.breath;
    if (b.st === 'tell') d.word('HUFF...', C.fx - 60, -40, 16, { align: 'center', col: IRON_P.ember, w: 2 });
    if (b.st === 'go') { IRON_ART.flames(ctx, b.x, -14, 26, G.clock * 2); d.speed(b.x - b.dir * 30, -14, -b.dir * 90, 0, 4, { w: 1.2, col: '#f2b25a' }); }
  }
  // the furnace light pooled near the core
  const fl = 1 + Math.sin(G.clock * 9) * 0.05;
  if (!c.cold) SKETCH.glow(ctx, C.fx, -182, 420 * fl, '255,140,60', 0.22);
}
function ironBoilerDrawTop(st) {
  // the dark: everything far from a light sinks into the charcoal (the furnace, the heroes' own glow)
  const ph = st.ph;
  if (!ph.core.cold) ironScreen(st, () => SKETCH.gloom(ctx, IRONBOILER.core.fx - 120 - st.cam.x, -182 - st.cam.y, 400, 2600, '18,14,30', 0.28));
}

IRON_PHASES.boiler = {
  setup(st, L) { ironBoilerSetup(st, L); },
  wait(st, dt) { const ph = st.ph; if (ph.prep && ph.prep.length) ph.prep.shift()(); ironCoast(st, dt, ph.solids); },
  step(st, dt) { const ph = st.ph; if (ph.prep && ph.prep.length) ph.prep.shift()(); ironBoilerStep(st, dt); },
  plan(st) { return ironBoilerPlan(st); },
  busy(st) { return st.ph.core.st === 'lift'; },
  labels() { return ['valve', 'valve']; },
  hudText(st) {
    const ph = st.ph;
    if (ph.n >= 6) return 'The core: turn both wheels';
    const v = ph.valves[ph.n];
    return 'Valve ' + (ph.n + 1) + ' of 6  ·  Pressure ' + Math.round(v.p * 100) + '%';
  },
  drawBack(st) { ironBoilerDrawBack(st); },
  draw(st) { ironBoilerDraw(st); },
  drawTop(st) { ironBoilerDrawTop(st); },
  music() { return { song: 'ironworks', amb: 'ironBelly' }; },
  stat(st) { const s = st.stats.boiler; return s ? { label: 'Valve kicks', value: s.kicks || 0 } : null; },
  leave() { for (const k of ['iron:boiler', 'iron:furnace', 'iron:porthole', 'iron:valve', 'iron:nozzle', 'iron:embercage']) SKETCH.forget(k); },
};

/* --- sounds --- */
Sfx.extra.ironboilerValveTurn = function () { this.tone(700, 0.25, 'sawtooth', 0.012, 900); this.tone(950, 0.15, 'square', 0.008, 1200, 0.1); };
Sfx.extra.ironboilerJetHiss = function () { this.noise(0.6, { type: 'highpass', f: 3000, to: 2000, vol: 0.03, a: 0.1 }); };
Sfx.extra.ironboilerJetOff = function () { this.noise(0.25, { type: 'highpass', f: 2500, to: 600, vol: 0.025 }); this.tone(200, 0.1, 'square', 0.02, 120, 0.15); };
Sfx.extra.ironboilerDialTick = function () { this.tone(1600, 0.03, 'square', 0.02); };
Sfx.extra.ironboilerValveKick = function () { this.noise(0.9, { type: 'highpass', f: 1200, to: 400, vol: 0.08 }); this.tone(80, 0.4, 'sine', 0.08, 40); };
Sfx.extra.ironboilerBleed = function () { this.noise(0.8, { type: 'highpass', f: 2200, to: 1400, vol: 0.03, a: 0.05 }); };
Sfx.extra.ironboilerCageWheel = function () { for (let k = 0; k < 4; k++) this.tone(500 + k * 30, 0.03, 'square', 0.02, null, k * 0.06); };
Sfx.extra.ironboilerFlameSweep = function () { this.noise(1.0, { type: 'lowpass', f: 800, to: 2000, vol: 0.05, a: 0.4 }); };
Sfx.extra.ironboilerEmberLift = function () { this.tone(220, 0.8, 'triangle', 0.04, 440); this.tone(330, 0.8, 'triangle', 0.03, 660, 0.1); };
Sfx.extra.ironboilerBoilerCold = function () { this.noise(2.2, { type: 'lowpass', f: 1500, to: 200, vol: 0.05, a: 0.2 }); this.tone(160, 2, 'sine', 0.03, 60); };

ironRoom('boiler', {
  act: { label: 'valve', labels: ['valve', 'valve'] },
  tip: IRON_PARTS.boiler.tip,
});
