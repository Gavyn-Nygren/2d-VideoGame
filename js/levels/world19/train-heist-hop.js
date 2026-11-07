/* Pip & Bo - Level 19-1 Train Heist Hop (team, World 19 Tumbleweed Gulch). */
'use strict';

/* ===== 19-1 Train Heist Hop (mode 'heist', team) — Gavyn's pick =====
   "Run along the roofs of a runaway train to reach the engine and pull the brake. You carry a sack of gold back to the
   sheriff. Whoever holds it can only jump low, so you toss it to each other across the wide gaps between cars. Duck
   under low bridges and water towers."
   Side view. A long train speeds right across the desert; the mode owns the tick, the camera, the picture and the HUD
   (def.ownStep + def.ownHUD). Pip and Bo run on the car roofs with the engine's own platformer control() (like 17-3
   Waterfall Climb), in TRAIN coordinates: x along the train from the back of the stretch, y on screen (the train never
   moves up or down). Between steps p.x is on screen (train x - camX), so the engine draws them, their name tags and the
   computer's bubbles in the right place; particles made during the step are moved onto the screen the same way.
   - The gold sack (the bandits dropped it; you are taking it back to the sheriff): whoever carries it runs at 80% and
     jumps low (about 1.6 tiles). Car gaps are narrow (2 tiles: anyone hops them, sack or not) or wide (about 4 tiles: only an
     empty-handed jump makes it). At a wide gap the free one jumps over first, then the carrier presses the action (toss)
     to throw the sack in an arc the way they face (hold longer = farther; a dotted arc shows where it goes). Touching the
     flying sack catches it; a sack that lands on a roof is picked up by walking over it (or the action next to it). A
     sack that falls between the cars bounces back off Dusty the donkey's hay cart to the one who threw it ("missed").
   - Hazards come from the front (they are fixed to the ground; the train passes them): low bridges, canyon arches,
     water-tower spouts and a tunnel mouth. A whistle and a sign warn 1.5 s ahead; hold ▼ to duck under (a low bridge or
     a spout can also be jumped by someone with free hands). Tumbleweeds roll along the roof: jump them. A hit is a soft
     "Bonk!": a small push toward the middle of your car and a short dizzy spell. The tunnel is dark: lanterns glow
     round Pip, Bo and the sack.
   - Falling between cars: "Whoops!" Dusty's hay cart catches you and boings you back onto the roof you jumped from (the
     sack comes back with you). No lives, no game over.
   - Rooms are stretches (def.roomWord 'Stretch'): each a run of cars ending at the flag car; the stretch ends when both
     stand on it with the sack. The sack starts with Pip in stretches 1 and 3, Bo in 2 and 4 (def carrier). Stretch 4
     ends at the engine: both in the cab hold the action on the big brake lever together (one alone only rattles it),
     the train screeches into Tumbleweed Gulch station and the sheriff tips his hat and takes the sack.
   - "Wait for me!": standing on a roof you can't get more than HEIST.maxSep px ahead of your partner (never while in
     the air, so the leash can't drop anyone into a gap).
   - Gold help, announced: a Gold sack (much bigger catch area) after 2 missed catches at one gap; a gold plank over a
     gap after 3 whoopses there; a gold hint line after 25 s with no progress.
   Every top-level name starts with heist / HEIST (Sfx.extra.heist* too); level state lives in G.mst.
   Room def: { title, carrier: 0|1, tip, act, cars: [tokens], hz: [{ k, first, every }], news }
     cars: 'kind len [cN | hN ...]' a car (kinds caboose box pass stock tank hay check tender engine; cN a crate and hN a
           hay bale N px from the car's back end), 'n' a narrow gap, 'w' a wide gap, 'p' a short gap with a deck plate.
     hz:   k = 'bridge' | 'arch' | 'tower' | 'tunnel' | 'weed'; the first one comes `first` s into the stretch, then
           about every `every` s (len: the tunnel's length in px). */
const HEIST = {
  roof: 350, body: 100, wheelY: 470, railY: 482,
  narrow: 60, wide: 124, plate: 18,
  carryRun: 0.8, carryJumpV: 440, duckH: 15, duckRun: 0.42, coyote: 0.15,   // (free hands: a longer coyote time at roof edges)
  clear: 18,                       // beams pass this far above the roof (a ducked player is 15 px tall)
  hz: 420,                         // the ground (and every hazard on it) streams past at this speed
  warn: 1.5, weedV: 150, weedR: 10, weedHit: 8,
  sackG: 1500, tossVx: 320, tossVxMax: 520, tossVy: 430, tossVyMax: 500, chargeMax: 0.55,
  catchR: 16, catchGold: 40, pickR: 12, ownWait: 0.45,
  fallBelow: 60, whoopsT: 1.6,
  maxSep: 420,
  goldMiss: 2, goldFalls: 3, stuckHint: 25,
  bonkStun: 0.75, bonkSafe: 1.3, bonkPush: 130,
  brakeNeed: 1.1, stopT: 3.4, finT: 7.4,
  introHold: 0.4, newsLife: 3.8, chipT: 7, chipAgain: 15, clearT: 1.7,
};
const heistSolo = () => typeof cpuSolo === 'function' && cpuSolo();
const heistCpu = id => heistSolo() && cpuOn(id);           // 1-player mode: the computer's character (no hints for it)
const heistBig = () => typeof hudBig === 'function' && hudBig();
const heistLerp = (a, b, u) => a + (b - a) * u;
const heistEase = u => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

/* ---------- each player's own keys (keyboard, controller or touch) for the hint chips and signs ---------- */
function heistDev(id) { try { return actKey(id); } catch (e) { return 'kb'; } }
function heistKey(id, what) {
  const d = heistDev(id), solo = heistSolo();
  if (what === 'act') return d === 'pad' ? glyph('act') : d === 'touch' ? 'the round button' : solo ? 'F' : id === 0 ? 'F' : '/';
  if (what === 'down') return d === 'pad' ? 'stick down' : d === 'touch' ? '▼' : solo ? 'S' : id === 0 ? 'S' : '↓';
  if (what === 'jump') return d === 'pad' ? glyph('a') : d === 'touch' ? '▲' : solo ? 'W' : id === 0 ? 'W' : '↑';
  return '';
}

/* ---------- building a stretch from its car tokens ---------- */
function heistBuild(st, def) {
  const R = HEIST.roof, B = HEIST.body;
  st.cars = []; st.gaps = []; st.solids = []; st.crates = [];
  let x = 0;
  for (const raw of def.cars || []) {
    const tk = String(raw);
    if (tk === 'n' || tk === 'w' || tk === 'p') {
      const w = tk === 'n' ? HEIST.narrow : tk === 'w' ? HEIST.wide : HEIST.plate;
      st.gaps.push({ i: st.gaps.length, x0: x, x1: x + w, kind: tk === 'w' ? 'wide' : tk === 'n' ? 'narrow' : 'plate', plank: tk === 'p', gold: false, falls: 0, misses: 0 });
      x += w; continue;
    }
    const parts = tk.split(/\s+/), kind = parts[0], len = +parts[1] || 300;
    const car = { i: st.cars.length, kind, x0: x, x1: x + len, seed: hash(st.cars.length + 3, len) };
    for (const q of parts.slice(2)) {
      const cx = x + (+q.slice(1) || 0);
      if (q[0] === 'c') st.crates.push({ kind: 'crate', x0: cx - 15, x1: cx + 15, y0: R - 30, seed: hash(cx | 0, 7) });
      else if (q[0] === 'h') st.crates.push({ kind: 'hay', x0: cx - 20, x1: cx + 20, y0: R - 24, seed: hash(cx | 0, 9) });
    }
    st.cars.push(car);
    x += len;
  }
  st.len = x;
  for (const c of st.cars) {
    if (c.kind === 'engine') {
      c.cab = { x0: c.x0, x1: c.x0 + 130, lever: c.x0 + 66 };
      st.solids.push({ x0: c.x0, x1: c.x0 + 130, y0: R, y1: R + B, kind: 'car' });
      st.solids.push({ x0: c.x0 + 130, x1: c.x1, y0: R + 18, y1: R + B, kind: 'car' });
      st.solids.push({ x0: c.x1 - 96, x1: c.x1 - 66, y0: R - 30, y1: R + 18, kind: 'stack' });
      st.cab = c.cab;
    } else st.solids.push({ x0: c.x0, x1: c.x1, y0: R, y1: R + B, kind: 'car' });
    if (c.kind === 'caboose') { c.cupola = { x0: c.x0 + (c.x1 - c.x0) * 0.42, w: 72 }; st.solids.push({ x0: c.cupola.x0, x1: c.cupola.x0 + 72, y0: R - 24, y1: R, kind: 'cupola' }); }
  }
  for (const k of st.crates) st.solids.push({ x0: k.x0, x1: k.x1, y0: k.y0, y1: R, kind: k.kind });
  for (const g of st.gaps) if (g.plank) st.solids.push({ x0: g.x0 - 2, x1: g.x1 + 2, y0: R, y1: R + 8, kind: 'plate', gap: g });
  // the back of the stretch and the front (the flag car's front end, or the engine's nose)
  st.solids.push({ x0: -60, x1: 0, y0: -600, y1: R + B, kind: 'wall' });
  st.solids.push({ x0: st.len, x1: st.len + 60, y0: -600, y1: R - 0.5, kind: 'wall' });
  const last = st.cars[st.cars.length - 1];
  st.goal = last.kind === 'engine' ? null : last;
}
const heistCarAt = (st, x) => st.cars.find(c => x >= c.x0 && x <= c.x1) || null;
const heistGapAt = (st, x) => st.gaps.find(g => x > g.x0 - 2 && x < g.x1 + 2) || null;

/* ---------- moving (train coordinates) ---------- */
function heistOver(p, s) { return p.x < s.x1 - 0.01 && p.x + p.w > s.x0 + 0.01 && p.y < s.y1 - 0.01 && p.y + p.h > s.y0 + 0.01; }
function heistMoveX(st, p, dx) {
  if (!dx) return 0;
  const x0 = p.x;
  p.x += dx;
  for (const s of st.solids) if (heistOver(p, s)) { if (dx > 0) p.x = Math.min(p.x, s.x0 - p.w); else p.x = Math.max(p.x, s.x1); p.vx = 0; }
  return p.x - x0;
}
function heistMoveY(st, p, dy) {
  if (!dy) return 0;
  const y0 = p.y;
  p.y += dy;
  for (const s of st.solids) if (heistOver(p, s)) {
    if (dy > 0) { p.y = Math.min(p.y, s.y0 - p.h); p.vy = 0; }
    else { p.y = Math.max(p.y, s.y1); p.vy = Math.max(0, p.vy); p.jumping = false; }
  }
  return p.y - y0;
}
function heistGround(st, p) {
  const by = p.y + p.h;
  for (const s of st.solids) if (Math.abs(by - s.y0) < 1 && p.x < s.x1 - 0.01 && p.x + p.w > s.x0 + 0.01) return s;
  return null;
}
// a standing box at p's place would hit a low hazard (so a ducked player stays ducked under a beam)
function heistLowOver(st, p) {
  const box = { x: p.x, y: p.y + p.h - PH, w: p.w, h: PH };
  for (const h of st.hz) { const b = heistHzBox(h); if (b && box.x < b.x1 && box.x + box.w > b.x0 && box.y < b.y1 && box.y + box.h > b.y0) return true; }
  return false;
}

/* ---------- one player's tick ---------- */
function heistPlayer(st, p, dt) {
  const P = st.pl[p.id], inp = p.input, s = st.sack;
  if (P.whoops) { heistWhoopsStep(st, p, dt); return; }
  P.safe = Math.max(0, P.safe - dt);
  const carry = s.state === 'held' && s.who === p.id;
  // duck: hold ▼ on a roof (stays ducked under a beam even after letting go, so it never bonks you on the way up)
  const low = heistLowOver(st, p);
  const wantDuck = inp.down && p.grounded && st.state === 'play' && p.stun <= 0;
  if (wantDuck || (P.duck && low && p.grounded)) {
    if (!P.duck) { P.duck = true; p.y += p.h - HEIST.duckH; p.h = HEIST.duckH; P.ducks++; }
  } else if (P.duck) { P.duck = false; p.y -= PH - p.h; p.h = PH; }
  // (every jump is a full jump here, even a quick tap: no jump cut, so a short press still clears a wide gap)
  const S = { maxRun: PHYS.maxRun, jumpV: PHYS.jumpV, coyote: PHYS.coyote, cut: PHYS.cut };
  const real = p.input;
  PHYS.cut = 1;
  if (carry) { PHYS.maxRun = S.maxRun * HEIST.carryRun; PHYS.jumpV = HEIST.carryJumpV; } else PHYS.coyote = HEIST.coyote;
  if (P.duck) { PHYS.maxRun = S.maxRun * HEIST.duckRun; p.pendingJump = false; p.jumpBuf = 0; p.input = Object.assign({}, inp, { jump: false }); }
  if (st.state !== 'play') { p.input = NO_INPUT; p.pendingJump = false; }
  const was = p.grounded;
  try { control(p, dt); } finally { Object.assign(PHYS, S); p.input = real; }
  heistMoveX(st, p, p.vx * dt);
  const vy = p.vy;
  heistMoveY(st, p, p.vy * dt);
  const gs = heistGround(st, p);
  p.grounded = !!gs; p.tileGround = !!gs; p.onPartner = false; p.onOneWay = false;
  if (p.grounded && !was && vy > 260) { p.sx = 1.25; p.sy = 0.78; puff(p.x + p.w / 2, p.y + p.h, 5, 'rgba(255,240,210,0.75)'); Sfx.play('land'); }
  p.lastVy = p.grounded ? 0 : p.vy;
  if (p.grounded) {
    const c = heistCarAt(st, p.x + p.w / 2);
    if (c) {
      P.car = c.i;
      if (c.i > P.best) { P.best = c.i; st.progressT = 0; }
    }
  }
  if (p.y > HEIST.roof + HEIST.fallBelow) heistWhoops(st, p);
}

/* ---------- "Whoops!": Dusty's hay cart catches you and boings you back up ---------- */
function heistWhoops(st, p) {
  const P = st.pl[p.id];
  if (P.whoops) return;
  const cx = p.x + p.w / 2, car = st.cars[P.car] || st.cars[0];
  const fromRight = cx > car.x1 - 4;
  let sx = fromRight ? car.x1 - 34 : car.x0 + 34;
  // never back onto a crate
  for (const k of st.crates) if (sx > k.x0 - 14 && sx < k.x1 + 14) sx = fromRight ? k.x0 - 16 : k.x1 + 16;
  if (car.kind === 'engine') sx = car.cab.x0 + 30;
  const g = heistGapAt(st, cx);
  P.whoops = { t: 0, x0: cx, y0: p.y + p.h / 2, sx, gap: g ? g.i : -1, cartX: g ? (g.x0 + g.x1) / 2 : cx };
  if (P.duck) { P.duck = false; p.h = PH; }
  p.alive = false; P.charging = false;
  st.stats.whoops[p.id]++;
  heistPop(st, cx, HEIST.roof + 20, 'Whoops!', '#fff1c4', 24);
  Sfx.play('heistWhoops', p.id); rumble(p.id, 0.4, 0.4, 140);
  if (g && !g.plank) {
    g.falls++;
    if (g.falls >= HEIST.goldFalls) heistGold(st, 'plank', g);
  }
  if (heistCpu(1 - p.id) && typeof cpuSay === 'function') cpuSay(G.players[1 - p.id], 'Whoops! You’re okay!');
}
function heistWhoopsStep(st, p, dt) {
  const P = st.pl[p.id], w = P.whoops;
  w.t += dt;
  p.pendingJump = false; p.pendingAct = false;
  if (w.t > 0.55 && !w.boing) { w.boing = true; Sfx.play('heistBoing', p.id); }
  if (w.t < HEIST.whoopsT) return;
  const input = p.input;
  Object.assign(p, { x: w.sx - PW / 2, y: HEIST.roof - PH, w: PW, h: PH, vx: 0, vy: 0, alive: true, grounded: true, jumping: false, jumpBuf: 0,
    pendingJump: false, coyote: 0, stun: 0, sx: 0.6, sy: 1.4, carryVx: 0, offT: 0, knockT: 0, input });
  p.pendingAct = false; p.prevJump = true;
  P.whoops = null; P.safe = 1.0;
  const c = heistCarAt(st, w.sx); if (c) P.car = c.i;
  puff(w.sx, HEIST.roof, 8, 'rgba(255,226,140,0.9)');
  heistPop(st, w.sx, HEIST.roof - 46, 'Boing!', '#ffe08a', 18);
}
// where a player in a whoops is drawn (train coords, the centre of the body)
function heistWhoopsPos(st, w) {
  const R = HEIST.roof, bottom = HEIST.railY - 14;
  if (w.t < 0.55) { const u = w.t / 0.55; return { x: heistLerp(w.x0, w.cartX, u), y: heistLerp(w.y0, bottom, u * u), sq: 0 }; }
  if (w.t < 0.75) return { x: w.cartX, y: bottom, sq: Math.sin((w.t - 0.55) / 0.2 * Math.PI) * 0.4 };
  const u = clamp((w.t - 0.75) / (HEIST.whoopsT - 0.75), 0, 1);
  return { x: heistLerp(w.cartX, w.sx, u), y: heistLerp(bottom, R - PH / 2, u) - Math.sin(u * Math.PI) * 120, sq: 0 };
}

/* ---------- the gold sack ---------- */
function heistSackHome(st, p) {
  // on the carrier's back (train coords)
  const P = st.pl[p.id];
  return { x: p.x + p.w / 2 - p.face * 9, y: p.y + (P.duck ? 4 : 9) };
}
function heistSackStep(st, dt) {
  const s = st.sack, R = HEIST.roof;
  s.t += dt;
  if (s.state === 'held') {
    const p = G.players[s.who], P = st.pl[s.who];
    if (P.whoops) { const q = heistWhoopsPos(st, P.whoops); s.x = q.x; s.y = q.y - 4; }
    else { const h = heistSackHome(st, p); s.x = h.x; s.y = h.y; }
    return;
  }
  if (s.state === 'ret') {
    // Dusty's hay cart bounces the sack back to whoever threw it
    const r = s.ret, u = clamp(r.t / 1.0, 0, 1), to = G.players[r.to], P = st.pl[r.to];
    r.t += dt;
    const home = P.whoops ? { x: P.whoops.sx, y: R - 20 } : heistSackHome(st, to);
    s.x = heistLerp(r.x0, home.x, u); s.y = heistLerp(r.y0, home.y, u) - Math.sin(u * Math.PI) * 150;
    if (u >= 1) { s.state = 'held'; s.who = r.to; s.t = 0; s.ret = null; Sfx.play('heistCatch', r.to); }
    return;
  }
  if (s.state === 'fly') {
    s.vy += HEIST.sackG * dt;
    s.spin += dt * 9 * Math.sign(s.vx || 1);
    const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt, r = 9;
    // side hits (a wall, a crate) knock it back a little; tops catch it
    let landed = false;
    for (const b of st.solids) {
      if (nx + r > b.x0 && nx - r < b.x1 && ny + r > b.y0 && ny - r < b.y1) {
        if (s.vy > 0 && s.y + r <= b.y0 + 2) { s.y = b.y0 - r; landed = true; break; }
        if (s.y - r < b.y1 && s.y + r > b.y0) { s.vx = -s.vx * 0.3; }
      }
    }
    if (landed) {
      s.state = 'roof'; s.vx = 0; s.vy = 0; s.t = 0;
      Sfx.play('heistThud'); puff(s.x, s.y + r, 5, 'rgba(255,236,190,0.8)');
    } else { s.x = s.x + s.vx * dt; s.y = ny; }
    // a catch: a free player touches it (the thrower only after a moment)
    for (const p of G.players) {
      const P = st.pl[p.id];
      if (!p.alive || P.whoops || s.state !== 'fly' && s.state !== 'roof') continue;
      if (p.id === s.from && s.t < HEIST.ownWait) continue;
      const cr = s.state === 'fly' ? (st.goldSack ? HEIST.catchGold : HEIST.catchR) : HEIST.pickR;
      if (s.x > p.x - cr && s.x < p.x + p.w + cr && s.y > p.y - cr && s.y < p.y + p.h + cr) { heistGrab(st, p, s.state === 'fly' && !landed); break; }
    }
    if (s.state === 'fly' && s.y > R + 70) heistSackMiss(st);
    return;
  }
  if (s.state === 'roof') {
    for (const p of G.players) {
      const P = st.pl[p.id];
      if (!p.alive || P.whoops) continue;
      if (p.id === s.from && s.t < HEIST.ownWait) continue;
      const cr = HEIST.pickR;
      if (s.x > p.x - cr && s.x < p.x + p.w + cr && s.y > p.y - cr && s.y < p.y + p.h + cr) { heistGrab(st, p, false); break; }
    }
  }
}
function heistGrab(st, p, caught) {
  const s = st.sack;
  const wasFly = s.state === 'fly';
  s.state = 'held'; s.who = p.id; s.t = 0; s.ret = null;
  st.progressT = 0;
  if (wasFly && caught && s.from !== p.id) {
    st.stats.catches[p.id]++;
    heistPop(st, p.x + p.w / 2, p.y - 30, st.goldSack ? 'Gold catch!' : 'Nice catch!', C.gold, 20);
    Sfx.play('heistCatch', p.id); rumble(p.id, 0.2, 0.3, 80);
    p.sx = 1.2; p.sy = 0.85;
  } else { heistPop(st, p.x + p.w / 2, p.y - 30, 'Got it!', '#fff1c4', 16); Sfx.play('heistCatch', p.id); }
}
function heistSackMiss(st) {
  const s = st.sack, g = heistGapAt(st, s.x);
  st.stats.misses++;
  heistPop(st, s.x, HEIST.roof + 30, 'Oops! Missed', '#fff1c4', 20);
  Sfx.play('heistBoing');
  let to = s.from == null ? st.carrier : s.from;
  s.state = 'ret'; s.ret = { t: 0, x0: s.x, y0: HEIST.railY - 20, to };
  if (g) {
    g.misses++;
    if (g.misses >= HEIST.goldMiss && !st.goldSack) heistGold(st, 'sack', g);
  }
}
// the action: the carrier presses (and holds, to throw farther) to toss; the free one picks up a sack lying close by
function heistAct(st, p, dt) {
  const P = st.pl[p.id], s = st.sack, inp = p.input;
  if (!p.alive || P.whoops) { P.charging = false; return; }
  const carry = s.state === 'held' && s.who === p.id;
  if (st.state === 'play' && st.final && heistInCab(st, p)) { P.charging = false; return; }   // (the brake, see heistBrake)
  if (st.state !== 'play') { P.charging = false; p.pendingAct = false; return; }
  if (carry) {
    if (P.charging) {
      if (inp.act && p.stun <= 0) P.chargeT = Math.min(HEIST.chargeMax + 0.4, P.chargeT + dt);
      else heistToss(st, p, clamp(P.chargeT / HEIST.chargeMax, 0, 1));
    } else if (p.pendingAct && p.stun <= 0) { p.pendingAct = false; P.charging = true; P.chargeT = 0; }
    return;
  }
  P.charging = false;
  if (p.pendingAct) {
    p.pendingAct = false;
    if (s.state === 'roof' && Math.abs(s.x - (p.x + p.w / 2)) < 44 && Math.abs(s.y - (p.y + p.h / 2)) < 50) { heistGrab(st, p, false); return; }
    if (P.shoutCD <= 0) { P.shoutCD = 1.2; heistPop(st, p.x + p.w / 2, p.y - 34, s.state === 'held' ? 'Toss it here!' : 'Yee-haw!', PCOL[p.id], 15); Sfx.play('heistShout', p.id); }
  }
}
// the sack's starting speed for a toss of strength k (0..1) facing dir
function heistTossV(k, dir) {
  return { vx: dir * heistLerp(HEIST.tossVx, HEIST.tossVxMax, k), vy: -heistLerp(HEIST.tossVy, HEIST.tossVyMax, k) };
}
function heistToss(st, p, k) {
  const P = st.pl[p.id], s = st.sack, v = heistTossV(k, p.face);
  P.charging = false; P.chargeT = 0;
  const h = heistSackHome(st, p);
  Object.assign(s, { state: 'fly', who: -1, from: p.id, x: h.x + p.face * 6, y: h.y - 4, vx: v.vx + p.vx * 0.3, vy: v.vy, t: 0, spin: 0 });
  st.stats.tosses[p.id]++;
  Sfx.play('heistToss', p.id);
  p.sx = 0.85; p.sy = 1.15;
  if (heistCpu(p.id) && typeof cpuSay === 'function') cpuSay(p, 'Catch!');
}
// the arc a toss of strength k would follow from p (for the dotted aim line)
function heistArc(st, p, k) {
  const h = heistSackHome(st, p), v = heistTossV(k, p.face), pts = [];
  let x = h.x + p.face * 6, y = h.y - 4, vx = v.vx + p.vx * 0.3, vy = v.vy;
  for (let i = 0; i < 60; i++) {
    const dt = 1 / 40;
    vy += HEIST.sackG * dt; x += vx * dt; y += vy * dt;
    pts.push({ x, y });
    if (y > HEIST.roof + 40) break;
    if (vy > 0 && st.solids.some(b => b.kind !== 'wall' && x > b.x0 && x < b.x1 && y + 9 >= b.y0 && y < b.y0 + 12)) break;
  }
  return pts;
}

/* ---------- hazards: low bridges, canyon arches, water towers, the tunnel, tumbleweeds ---------- */
const HEIST_DUCK = { bridge: 1, arch: 1, tower: 1, tunnel: 1 };
// the box that bonks you (train coords), or null
function heistHzBox(h) {
  if (h.phase !== 'go') return null;
  const top = HEIST.roof - HEIST.clear;
  if (h.k === 'bridge') return { x0: h.x, x1: h.x + 70, y0: top - 42, y1: top };
  if (h.k === 'tower') return { x0: h.x, x1: h.x + 30, y0: top - 40, y1: top };
  if (h.k === 'arch' || h.k === 'tunnel') return { x0: h.x, x1: h.x + (h.k === 'arch' ? 90 : 80), y0: -800, y1: top };
  return null;
}
function heistHazards(st, dt) {
  const ps = G.players, R = HEIST.roof;
  // new ones
  if (st.state === 'play' && !(st.final && heistBothInCab(st))) {
    for (const tm of st.timers) {
      tm.t -= dt;
      if (tm.t > 0) continue;
      const duck = HEIST_DUCK[tm.k];
      if (duck && st.hz.some(h => HEIST_DUCK[h.k] && (h.phase === 'warn' || h.x > st.camX - 40))) { tm.t = 1.2; continue; }
      tm.t = tm.every * (0.85 + 0.3 * Math.random());
      if (tm.once) tm.t = 1e9;
      if (tm.k === 'weed') { st.hz.push({ k: 'weed', phase: 'go', x: st.camX + W + 30, ph: Math.random() * 6, t: 0, y: R - HEIST.weedR }); continue; }
      st.hz.push({ k: tm.k, phase: 'warn', t: HEIST.warn, x: 0, len: tm.len || 0, hits: [0, 0] });
      Sfx.play('heistWhistle');
      st.warnCount++;
    }
  }
  const sp = HEIST.hz * st.speedK;
  for (const h of st.hz) {
    if (h.phase === 'warn') { h.t -= dt; if (h.t <= 0) { h.phase = 'go'; h.x = st.camX + W + 40; } continue; }
    if (h.k === 'weed') {
      h.t += dt; h.x -= (HEIST.weedV + sp * 0.15) * dt; h.ph += dt * 9;
      const over = heistGapAt(st, h.x) && !(heistGapAt(st, h.x) || {}).plank;
      h.y = R - HEIST.weedR - Math.abs(Math.sin(h.t * 7)) * (over ? 16 : 6);
    } else h.x -= sp * dt;
  }
  st.hz = st.hz.filter(h => h.phase === 'warn' || h.x + (h.k === 'tunnel' ? h.len + 200 : 120) > st.camX - 220);
  // bonks
  for (const p of ps) {
    const P = st.pl[p.id];
    if (!p.alive || P.whoops || P.safe > 0) continue;
    for (const h of st.hz) {
      if (h.k === 'weed') {
        if (h.phase !== 'go') continue;
        const cx = clamp(h.x, p.x, p.x + p.w), cy = clamp(h.y, p.y, p.y + p.h);
        if (Math.hypot(cx - h.x, cy - h.y) < HEIST.weedHit) { heistBonk(st, p, 'weed'); h.bounced = true; break; }
        continue;
      }
      const b = heistHzBox(h);
      if (b && p.x < b.x1 && p.x + p.w > b.x0 && p.y < b.y1 && p.y + p.h > b.y0) { heistBonk(st, p, h.k); break; }
      if (b && P.duck && p.x < b.x1 && p.x + p.w > b.x0 && !h.hits[p.id]) { h.hits[p.id] = 1; st.stats.ducked++; }
    }
  }
  // the tunnel: dark while its band covers the screen
  const tn = st.hz.find(h => h.k === 'tunnel' && h.phase === 'go');
  const inT = !!tn && tn.x < st.camX + W && tn.x + 80 + tn.len > st.camX;
  st.dark = approach(st.dark, inT ? 1 : 0, dt * (inT ? 2.4 : 1.6));
}
function heistBonk(st, p, k) {
  const P = st.pl[p.id], c = heistCarAt(st, p.x + p.w / 2) || st.cars[P.car] || st.cars[0];
  const mid = (c.x0 + c.x1) / 2, dir = p.x + p.w / 2 < mid ? 1 : -1;
  if (P.duck) { P.duck = false; p.y -= PH - p.h; p.h = PH; }
  knock(p, dir * HEIST.bonkPush, p.grounded ? -160 : Math.max(p.vy, 60), HEIST.bonkStun, 0.25);
  P.safe = HEIST.bonkSafe; P.charging = false;
  st.stats.bonks[p.id]++;
  heistPop(st, p.x + p.w / 2, p.y - 26, k === 'weed' ? 'Bonk! Tumbleweed!' : 'Bonk!', '#fff1c4', 20);
  Sfx.play('heistBonk', p.id); rumble(p.id, 0.5, 0.4, 120);
  if (heistCpu(1 - p.id) && typeof cpuSay === 'function') cpuSay(G.players[1 - p.id], k === 'weed' ? 'Jump the tumbleweeds!' : 'Duck! Hold down!');
}

/* ---------- the stretch's goal: both on the flag car with the sack, or the brake in the engine cab ---------- */
const heistInCab = (st, p) => { if (!st.cab || st.pl[p.id].whoops || !p.alive || !p.grounded) return false; const x = heistTX(st, p); return x > st.cab.x0 + 4 && x < st.cab.x1 - 4; };
const heistBothInCab = st => G.players.every(p => heistInCab(st, p));
const heistOnGoal = (st, p) => { if (!st.goal || !p.alive || st.pl[p.id].whoops || !p.grounded) return false; const x = heistTX(st, p); return x > st.goal.x0 + 4 && x < st.goal.x1 - 4; };
function heistGoalCheck(st, dt) {
  const s = st.sack;
  if (st.goal) {
    const both = G.players.every(p => heistOnGoal(st, p));
    if (both && s.state === 'held') {
      st.state = 'clear'; st.clearT = 0;
      st.stats.stretchT[st.k] = G.time - st.segStart;
      heistPop(st, (st.goal.x0 + st.goal.x1) / 2, HEIST.roof - 120, 'Stretch clear!', C.gold, 30);
      Sfx.play('heistClear');
      for (let i = 0; i < 26; i++) confetti((st.goal.x0 + st.goal.x1) / 2, HEIST.roof - 80);
    } else if (both && s.state === 'roof') heistNews(st, 'Don’t forget the gold sack!', false, 2.4, true);
    return;
  }
  // the engine: the brake lever needs both, holding the action together
  if (!st.cab) return;
  const ps = G.players, inCab = ps.map(p => heistInCab(st, p)), holding = ps.map((p, i) => inCab[i] && p.input.act && p.stun <= 0);
  st.brakeHold = holding;
  if (holding[0] && holding[1] && s.state === 'held') {
    st.brakeK = Math.min(1, st.brakeK + dt / HEIST.brakeNeed);
    if (Math.floor(st.brakeK * 6) !== Math.floor((st.brakeK - dt / HEIST.brakeNeed) * 6)) Sfx.play('heistRatchet');
    if (st.brakeK >= 1) heistStartStop(st);
  } else {
    st.brakeK = Math.max(0, st.brakeK - dt * 0.8);
    if ((holding[0] || holding[1]) && !(holding[0] && holding[1]) && st.rattleCD <= 0) { st.rattleCD = 0.6; Sfx.play('heistRatchet'); st.leverShake = 0.4; }
    if (holding[0] && holding[1] && s.state !== 'held') heistNews(st, 'Bring the gold sack into the cab!', false, 2.4, true);
  }
  st.rattleCD -= dt; st.leverShake = Math.max(0, st.leverShake - dt);
}
function heistStartStop(st) {
  st.state = 'stop'; st.stopT = 0;
  st.stats.stretchT[st.k] = G.time - st.segStart;
  st.stats.time = G.time;
  st.hz = st.hz.filter(h => h.k === 'weed' ? false : h.phase === 'go');
  heistPop(st, st.cab.lever, HEIST.roof - 130, 'SCREEEECH!', '#ffffff', 30);
  Sfx.play('heistScreech'); rumble(0, 0.5, 0.6, 400); rumble(1, 0.5, 0.6, 400);
  st.station = { x: 0 };
}
function heistStopStep(st, dt) {
  st.stopT += dt;
  const T0 = HEIST.stopT, u = clamp(st.stopT / T0, 0, 1);
  st.speedK = 1 - u;
  // the station slides in as the train slows and stops right in front of the engine
  const eng = st.cars[st.cars.length - 1];
  st.station.x = eng.x1 + 40 + HEIST.hz * T0 * (1 - u) * (1 - u) / 2;
  if (st.stopT < T0 && Math.random() < dt * 30) {
    const c = st.cars[Math.floor(Math.random() * st.cars.length)];
    heistSpark(st, c.x0 + 30 + Math.random() * (c.x1 - c.x0 - 60), HEIST.wheelY + 8);
  }
  if (st.stopT > T0 && !st.tipped) { st.tipped = true; Sfx.play('heistTip'); }
  // the sack flies to the sheriff
  if (st.stopT > T0 + 0.7 && st.sack.state === 'held') {
    const p = G.players[st.sack.who], h = heistSackHome(st, p);
    Object.assign(st.sack, { state: 'give', x0: h.x, y0: h.y, t: 0 });
    Sfx.play('heistToss', p.id);
  }
  if (st.sack.state === 'give') {
    const sv = st.sack, k = clamp((st.stopT - T0 - 0.7) / 0.9, 0, 1), tx = st.station.x + 70, ty = HEIST.roof + 10;
    sv.x = heistLerp(sv.x0, tx, k); sv.y = heistLerp(sv.y0, ty, k) - Math.sin(k * Math.PI) * 120;
    if (k >= 1 && !st.given) {
      st.given = true; Sfx.play('heistWin');
      heistPop(st, tx, HEIST.roof - 90, 'Thank you, partners!', C.gold, 26);
      for (let i = 0; i < 70; i++) confetti(tx - st.camX, HEIST.roof - 60);
    }
  }
  if (st.given && Math.random() < dt * 8) confetti(st.station.x + 70 - st.camX + (Math.random() - 0.5) * 300, 80);
  // Pip and Bo cheer
  for (const p of G.players) if (st.stopT > T0 + 1.6 && p.grounded && Math.random() < dt * 1.5) { p.vy = -330; p.grounded = false; }
  if (st.stopT >= HEIST.finT && !st.cleared) {
    st.cleared = true;
    G.level.goal = { x: st.station.x + 70 - st.camX, y: HEIST.roof - 40 };
    levelClear();
  }
}

/* ---------- help: gold, hints, news ---------- */
function heistGold(st, kind, g) {
  if (kind === 'sack') { if (st.goldSack) return; st.goldSack = true; heistNews(st, 'Gold sack! It’s much easier to catch now', true); }
  else if (kind === 'plank') {
    if (g.plank) return;
    g.plank = true; g.gold = true;
    st.solids.push({ x0: g.x0 - 2, x1: g.x1 + 2, y0: HEIST.roof, y1: HEIST.roof + 8, kind: 'plate', gap: g });
    heistNews(st, 'Gold plank! Walk right across this gap', true);
  }
  st.goldUsed.push(kind);
  Sfx.play('heistGold');
}
function heistNews(st, s, gold, life, quiet) {
  if (quiet && st.news && st.news.s === s) { st.news.t = Math.min(st.news.t, 0.3); return; }
  st.news = { s, gold: !!gold, t: 0, life: life || HEIST.newsLife };
}
function heistPop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || C.gold, size: size || 18, t: 0 }); if (st.pops.length > 14) st.pops.shift(); }
function heistSpark(st, x, y) {
  for (let i = 0; i < 4; i++) st.sparks.push({ x, y, vx: -60 - Math.random() * 200, vy: -60 - Math.random() * 160, t: 0, life: 0.35 + Math.random() * 0.25 });
}
// the wide gap the team is working on now (null when every wide gap of the stretch is behind everyone)
function heistFront(st) {
  const s = st.sack, xs = G.players.map(p => heistTX(st, p));
  const sx = s.state === 'held' ? xs[s.who] : s.state === 'ret' ? xs[s.ret.to] : s.x;
  const back = Math.min(xs[0], xs[1], sx);
  for (const g of st.gaps) if (g.kind === 'wide' && !g.plank && g.x1 > back) return g;
  return null;
}
// a player's centre in train coords, during the tick or between ticks (where p.x is on screen)
function heistTX(st, p) {
  const P = st.pl[p.id];
  if (P.whoops) return P.whoops.sx;
  return p.x + p.w / 2 + (st.inTick ? 0 : st.camX);
}
// what player id should do now: the hint chips, the stuck hint and the computer read this
function heistJob(st, id) {
  if (st.state !== 'play') return null;
  const p = G.players[id], o = G.players[1 - id], P = st.pl[id], s = st.sack;
  if (P.whoops) return null;
  const me = heistTX(st, p), them = heistTX(st, o);
  const carry = s.state === 'held' && s.who === id, oCarry = s.state === 'held' && s.who === 1 - id;
  if (s.state === 'fly') return s.from === id ? { k: 'watch' } : { k: 'catch' };
  if (s.state === 'ret') return { k: 'watch' };
  if (s.state === 'roof') return { k: 'getSack', x: s.x };
  const g = heistFront(st);
  if (!g) {
    if (st.final) return heistInCab(st, p) ? { k: heistInCab(st, o) ? 'brake' : 'brakeWait' } : { k: 'toCab' };
    return heistOnGoal(st, p) ? { k: 'onFlag' } : { k: 'toFlag' };
  }
  if (carry) {
    if (them > g.x1 - 2 && !st.pl[o.id].whoops) return { k: 'toss', g };
    return g.x0 - me > 280 ? { k: 'run', g } : { k: 'waitToss', g };
  }
  if (me < g.x0 + 6) return g.x0 - me > 300 ? { k: 'run', g } : { k: oCarry ? 'jumpWide' : 'jumpBack', g };
  if (oCarry) return { k: 'ready', g };
  return { k: 'run', g };
}
function heistJobText(st, id, j) {
  const nm = NAMES[1 - id], cpu = heistCpu(1 - id), act = heistKey(id, 'act'), oAct = heistKey(1 - id, 'act');
  switch (j.k) {
    case 'run': return ['Run to the front! ▶', 'Hop the small gaps, duck the bridges'];
    case 'waitToss': return ['Wide gap! Wait at the edge', cpu ? nm + ' jumps over first' : nm + ': jump over first!'];
    case 'toss': return ['Toss the sack to ' + nm + ': press ' + act + '!', 'Hold ' + act + ' to throw farther'];
    case 'jumpWide': return ['Wide gap! Jump it first', 'Run up fast, jump at the edge'];
    case 'jumpBack': return ['Your turn: jump across!', 'Run up fast, jump at the edge'];
    case 'ready': return ['Get ready to catch!', cpu ? nm + ' tosses the sack to you' : nm + ': press ' + oAct + ' to toss'];
    case 'catch': return ['Catch the sack!', ''];
    case 'getSack': return ['Grab the gold sack!', 'Walk over it'];
    case 'toFlag': return ['Both onto the flag car!', 'Bring the sack'];
    case 'onFlag': return ['Wait here for ' + nm, ''];
    case 'toCab': return ['Into the engine cab!', 'The big brake lever is inside'];
    case 'brakeWait': return ['Wait for ' + nm + ' in the cab', ''];
    case 'brake': return ['Hold ' + act + ': pull the brake!', cpu ? 'Together with ' + nm : 'Both hold it together'];
    default: return null;
  }
}
function heistHelp(st, dt) {
  st.progressT += dt;
  if (st.progressT > HEIST.stuckHint && st.state === 'play') {
    st.progressT = 0;
    const ids = [0, 1].filter(id => !heistCpu(id));
    for (const id of ids) {
      const j = heistJob(st, id), tx = j && heistJobText(st, id, j);
      if (tx && tx[0]) { heistNews(st, 'Hint for ' + NAMES[id] + ': ' + tx[0], true, 5); st.stats.hints++; break; }
    }
  }
}

/* ---------- the camera and the leash ---------- */
function heistCamera(st, dt, snap) {
  const xs = G.players.map(p => heistTX(st, p));
  let tx = (xs[0] + xs[1]) / 2 - W / 2 + 70;
  if (st.state === 'stop') tx = st.cars[st.cars.length - 1].x1 - W + 300;
  tx = clamp(tx, -40, Math.max(-40, st.len - W + (st.cab ? 260 : 60)));
  // both always on screen
  const lo = Math.min(xs[0], xs[1]), hi = Math.max(xs[0], xs[1]);
  tx = Math.min(tx, lo - 50); tx = Math.max(tx, hi + 50 - W);
  st.camX = snap ? tx : st.camX + (tx - st.camX) * Math.min(1, dt * 4);
}
function heistLeash(st, xb) {
  const [a, b] = G.players;
  if (!a.alive || !b.alive) return;
  const lim = HEIST.maxSep;
  if (Math.abs((a.x + a.w / 2) - (b.x + b.w / 2)) <= lim) return;
  for (const p of [a, b]) {
    const o = other(p), away = Math.abs(p.x - o.x) > Math.abs(xb[p.id] - o.x) && Math.abs(p.x - xb[p.id]) > 0;
    if (!away || !p.grounded) continue;
    p.x = xb[p.id]; p.vx = 0;
    const P = st.pl[p.id];
    if (P.waitCD <= 0) {
      P.waitCD = 3.5;
      heistPop(st, p.x + p.w / 2, p.y - 30, 'Wait for ' + NAMES[o.id] + '!', PCOL[o.id], 16);
      if (typeof cpuSay === 'function' && cpuOn(o.id)) cpuSay(o, 'Wait for me!');
    }
  }
}

/* ---------- the tick (ownStep) ---------- */
function heistStep(st, dt) {
  const ps = G.players;
  for (const p of ps) p.x += st.camX;
  st.inTick = true;
  const n0 = G.particles.length;
  try { heistTick(st, dt); } finally {
    st.inTick = false;
    for (const p of ps) p.x -= st.camX;
    for (let i = n0; i < G.particles.length; i++) G.particles[i].x -= st.camX;
  }
}
function heistTick(st, dt) {
  const ps = G.players;
  st.tick++;
  st.scroll += HEIST.hz * st.speedK * dt;
  heistFx(st, dt);
  if (st.state === 'stop') {
    for (const p of ps) { p.pendingAct = false; p.pendingJump = false; heistPlayer(st, p, dt); }
    heistSackStep(st, dt);
    heistStopStep(st, dt);
    heistHazards(st, dt);
    heistCamera(st, dt);
    return;
  }
  if (st.state === 'clear') {
    st.clearT += dt;
    for (const p of ps) { p.pendingAct = false; p.pendingJump = false; heistPlayer(st, p, dt); }
    heistSackStep(st, dt);
    heistCamera(st, dt);
    if (st.clearT >= HEIST.clearT) st.goNext = true;
    return;
  }
  if (G.introT > HEIST.introHold) { for (const p of ps) { p.pendingAct = false; p.pendingJump = false; } heistCamera(st, dt); return; }
  if (!st.started) { st.started = true; if (st.room.news) heistNews(st, st.room.news, false, 5); }
  for (const p of ps) { const P = st.pl[p.id]; P.waitCD -= dt; P.shoutCD -= dt; }
  const xb = ps.map(p => p.x);
  for (const p of ps) heistPlayer(st, p, dt);
  heistLeash(st, xb);
  for (const p of ps) heistAct(st, p, dt);
  heistSackStep(st, dt);
  heistHazards(st, dt);
  heistGoalCheck(st, dt);
  heistHelp(st, dt);
  heistCamera(st, dt);
}
function heistFx(st, dt) {
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.4);
  if (st.news) { st.news.t += dt; if (st.news.t > st.news.life) st.news = null; }
  for (const q of st.sparks) { q.t += dt; q.vy += 900 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
  st.sparks = st.sparks.filter(q => q.t < q.life);
  // engine smoke drifting back over the train (screen coords)
  st.smokeT -= dt;
  if (st.smokeT <= 0 && st.speedK > 0.05) {
    st.smokeT = 0.28 / Math.max(0.3, st.speedK);
    const eng = st.cars.find(c => c.kind === 'engine');
    const sx = eng ? eng.x1 - 81 - st.camX : W + 40, sy = eng ? HEIST.roof - 40 : 150 + Math.random() * 24;
    if (sx < W + 80) st.smoke.push({ x: sx, y: sy, r: eng ? 10 : 7, t: 0, life: eng ? 2.6 : 3.4, far: !eng });
  }
  for (const q of st.smoke) { q.t += dt; q.x -= (HEIST.hz * 0.55 * st.speedK + 20) * dt; q.y -= 22 * dt; q.r += 16 * dt; }
  st.smoke = st.smoke.filter(q => q.t < q.life && q.x > -80);
}

/* ---------- labels: the touch buttons and the top-bar legend name each player's own action ---------- */
let heistLabelEls = null;
function heistActLabels(st) {
  try {
    if (!heistLabelEls || !heistLabelEls.every(o => document.contains(o.el))) heistLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.dataset.legp !== undefined ? +box.dataset.legp : -1;
      return { el, id };
    });
    const s = st.sack, final = st.final && st.cab && G.players.some(p => heistInCab(st, p));
    const word = id => (final ? 'brake' : id < 0 ? 'toss' : s.state === 'held' && s.who === id ? 'toss' : s.state === 'roof' ? 'grab' : 'toss');
    let changed = false;
    for (const o of heistLabelEls) { const want = word(o.id); if (o.el.textContent !== want) { o.el.textContent = want; changed = true; } }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}

/* ---------- a stretch (room) ---------- */
function heistRoom(st, L, k) {
  const def = L.def;
  st.k = k; st.room = def; st.final = k === (def.roomCount || 1) - 1;
  heistBuild(st, def);
  st.carrier = def.carrier || 0;
  st.sack = { state: 'held', who: st.carrier, from: st.carrier, x: 0, y: 0, vx: 0, vy: 0, t: 0, spin: 0, ret: null };
  st.hz = []; st.timers = (def.hz || []).map(h => ({ k: h.k, every: h.every || 10, t: h.first || 6, len: h.len || 0, once: !!h.once }));
  st.state = 'play'; st.goNext = false; st.clearT = 0; st.started = false; st.progressT = 0; st.segStart = G.time;
  st.brakeK = 0; st.brakeHold = [false, false]; st.rattleCD = 0; st.leverShake = 0;
  st.pops = []; st.news = null; st.sparks = []; st.dark = 0;
  st.pl = [0, 1].map(() => ({ duck: false, ducks: 0, safe: 0, whoops: null, car: 0, best: 0, charging: false, chargeT: 0, waitCD: 0, shoutCD: 0, chipKey: '', chipT: 0 }));
  const c0 = st.cars[0], sx = [c0.x0 + 60, c0.x0 + 110];
  G.players.forEach((p, i) => {
    const input = p.input;
    Object.assign(p, makePlayer(i), { x: sx[i] - PW / 2, y: HEIST.roof - PH, grounded: true, face: 1, input, prevJump: true, prevAct: true });
  });
  st.camX = 0;
  st.inTick = true; heistCamera(st, 0, true); st.inTick = false;
  for (const p of G.players) p.x -= st.camX;
  heistActLabels(st);
}
function heistSetup(st, L) {
  st.stats = { whoops: [0, 0], bonks: [0, 0], tosses: [0, 0], catches: [0, 0], misses: 0, ducked: 0, hints: 0, time: 0, stretchT: [] };
  st.goldUsed = []; st.goldSack = false;
  st.scroll = 0; st.speedK = 1; st.tick = 0; st.smoke = []; st.smokeT = 0; st.warnCount = 0;
  heistRoom(st, L, 0);
}

MODES.heist = {
  HEIST,
  front: heistFront, job: heistJob, tx: heistTX, inCab: heistInCab, hzBox: heistHzBox, tossV: heistTossV, carAt: heistCarAt,
  setup(st, L) { heistSetup(st, L); },
  room(k, L) { heistRoom(G.mst, L, k); },
  step(dt) {
    const st = G.mst;
    if (!st.cars) return;
    heistStep(st, dt);
    if (st.goNext) {
      st.goNext = false;
      const L = G.level;
      if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) nextRoom(); else levelClear();
      return;
    }
    if (st.tick % 15 === 0) heistActLabels(st);
  },
  // the engine draws the players between draw() and drawTop(); someone in a whoops is drawn by drawTop
  draw() { const st = G.mst; if (st.cars) heistDraw(st); },
  drawTop() { const st = G.mst; if (st.cars) heistDrawTop(st); },
  hud() { const st = G.mst; if (st.cars) heistHud(st); },
  stats() {
    const st = G.mst, s = st.stats;
    if (!s) return [];
    const wh = s.whoops[0] + s.whoops[1], t = s.time || G.time;
    // (two computers: about 2:20 with no whoopses; a clumsy computer partner about 2:40-3:20)
    const medal = t <= 225 && wh <= 4 ? 'Gold' : t <= 360 && wh <= 12 ? 'Silver' : 'Bronze';
    const words = wh === 0 ? 'Not one whoops! Real train-top heroes!' : wh <= 4 ? 'Smooth hopping, partners!' : 'Lots of whoopses, and you got the gold home together!';
    const bonks = s.bonks[0] + s.bonks[1];
    const gold = st.goldUsed.length ? ' · Gold help: ' + st.goldUsed.map(k => ({ sack: 'Gold sack', plank: 'Gold plank' }[k])).join(', ') : '';
    return [
      { label: 'Whoops', values: s.whoops.slice() },
      { label: 'Sacks tossed', values: s.tosses.slice() },
      { label: 'Catches', values: s.catches.slice() },
      { label: 'Medal', value: medal },
      words + ' Bonks: ' + bonks + ' · Ducked under: ' + s.ducked + gold,
    ];
  },
};

/* ---------- drawing ---------- */
let heistSkyG = null, heistDarkCv = null;
function heistDraw(st) {
  const t = G.clock;
  heistDrawSky(st, t);
  heistDrawLand(st, t);
  ctx.save(); ctx.translate(-st.camX, 0);
  for (const h of st.hz) if (h.phase === 'go' && h.k === 'tower') heistDrawTowerBack(st, h);
  if (st.station) heistDrawStation(st, t);
  heistDrawTrack(st);
  for (const g of st.gaps) heistDrawCoupler(st, g);
  for (const c of st.cars) if (c.x1 > st.camX - 40 && c.x0 < st.camX + W + 40) heistDrawCar(st, c, t);
  heistDrawAhead(st);
  for (const k of st.crates) if (k.x1 > st.camX - 40 && k.x0 < st.camX + W + 40) heistDrawCrate(k);
  for (const g of st.gaps) if (g.plank) heistDrawPlank(st, g, t);
  for (const h of st.hz) if (h.k === 'weed' && h.phase === 'go') heistDrawWeed(h);
  if (st.station) heistDrawSheriff(st, t);
  ctx.restore();
}
function heistDrawSky(st, t) {
  if (!heistSkyG) {
    heistSkyG = ctx.createLinearGradient(0, 0, 0, 340);
    heistSkyG.addColorStop(0, '#f39a5a'); heistSkyG.addColorStop(0.45, '#ffc879'); heistSkyG.addColorStop(1, '#ffe8b4');
  }
  ctx.fillStyle = heistSkyG; ctx.fillRect(0, 0, W, H);
  // a big low sun
  ctx.fillStyle = 'rgba(255,236,170,0.35)'; circle(720, 200, 92); ctx.fill();
  ctx.fillStyle = 'rgba(255,246,206,0.95)'; circle(720, 200, 54); ctx.fill();
  // wispy clouds drift slowly
  const off = (st.scroll + st.camX) * 0.02 + t * 4;
  ctx.fillStyle = 'rgba(255,248,232,0.75)';
  for (let i = 0; i < 5; i++) {
    const span = W + 300, x = ((i * 290 - off) % span + span) % span - 150, y = 70 + (i % 3) * 34;
    ctx.beginPath(); ctx.ellipse(x, y, 70, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 30, y - 7, 36, 9, 0, 0, Math.PI * 2); ctx.fill();
  }
}
// far mesas, near buttes, the desert with cactus streaming by, telegraph poles
function heistDrawLand(st, t) {
  const base = st.scroll + st.camX;
  const mesas = (k, col, y0, hgt, step, seedK) => {
    const off = base * k;
    ctx.fillStyle = col;
    const i0 = Math.floor(off / step) - 1;
    for (let i = i0; i < i0 + Math.ceil(W / step) + 3; i++) {
      const hv = hash(i, seedK), x = i * step - off + (hv % 60), w = step * (0.5 + (hv % 100) / 160), h = hgt * (0.55 + ((hv >> 8) % 100) / 220);
      ctx.beginPath(); ctx.moveTo(x - 30, y0); ctx.lineTo(x, y0 - h); ctx.lineTo(x + w, y0 - h); ctx.lineTo(x + w + 34, y0); ctx.closePath(); ctx.fill();
      // a stripe of lighter rock
      ctx.fillStyle = 'rgba(255,220,170,0.18)'; ctx.fillRect(x + 4, y0 - h + 12, w - 6, 6); ctx.fillStyle = col;
    }
  };
  mesas(0.03, '#e3a27a', 300, 120, 340, 11);
  mesas(0.09, '#c9673f', 312, 90, 260, 23);
  // the desert floor
  ctx.fillStyle = '#efc78a'; ctx.fillRect(0, 300, W, H - 300);
  ctx.fillStyle = '#e2b273'; ctx.fillRect(0, 300, W, 8);
  // small cactus and rocks far off (half speed)
  const o2 = base * 0.45;
  for (let i = Math.floor(o2 / 90) - 1; i < Math.floor(o2 / 90) + 13; i++) {
    const hv = hash(i, 41), x = i * 90 - o2 + (hv % 50), y = 312 + (hv % 26);
    if (hv % 3 === 0) heistCactus(x, y, 0.55 + (hv % 10) / 30, '#7aa05a');
    else { ctx.fillStyle = '#d29a62'; ctx.beginPath(); ctx.ellipse(x, y, 7 + hv % 6, 3, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  // telegraph poles and wires (nearly train speed): thin, in a soft colour, behind the train
  const o3 = base * 0.85, step = 300;
  ctx.strokeStyle = 'rgba(110,70,50,0.55)'; ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = Math.floor(o3 / step) - 1; i < Math.floor(o3 / step) + 5; i++) {
    const x0 = i * step - o3, x1 = x0 + step;
    ctx.moveTo(x0, 214); ctx.quadraticCurveTo((x0 + x1) / 2, 226, x1, 214);
    ctx.moveTo(x0, 224); ctx.quadraticCurveTo((x0 + x1) / 2, 236, x1, 224);
  }
  ctx.stroke();
  for (let i = Math.floor(o3 / step) - 1; i < Math.floor(o3 / step) + 5; i++) {
    const x = i * step - o3;
    ctx.fillStyle = 'rgba(120,76,52,0.7)'; ctx.fillRect(x - 2.5, 208, 5, 150); ctx.fillRect(x - 16, 212, 32, 4); ctx.fillRect(x - 12, 222, 24, 3);
  }
  // near cactus between the poles (train speed)
  const o4 = base * 0.95;
  for (let i = Math.floor(o4 / 210) - 1; i < Math.floor(o4 / 210) + 7; i++) {
    const hv = hash(i, 57), x = i * 210 - o4 + (hv % 90);
    if (hv % 2) heistCactus(x, 352, 1 + (hv % 10) / 25, '#5f9a4a');
  }
}
function heistCactus(x, y, s, col) {
  ctx.fillStyle = col;
  rr(x - 5 * s, y - 46 * s, 10 * s, 46 * s, 5 * s); ctx.fill();
  rr(x - 17 * s, y - 32 * s, 7 * s, 18 * s, 3.5 * s); ctx.fill(); rr(x - 17 * s, y - 18 * s, 14 * s, 6 * s, 3 * s); ctx.fill();
  rr(x + 10 * s, y - 38 * s, 7 * s, 20 * s, 3.5 * s); ctx.fill(); rr(x + 3 * s, y - 22 * s, 14 * s, 6 * s, 3 * s); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(x - 3 * s, y - 44 * s, 3 * s, 40 * s, 1.5 * s); ctx.fill();
}
function heistDrawTrack(st) {
  const R = HEIST.railY, x0 = st.camX - 20, x1 = st.camX + W + 20;
  // ballast and sleepers stream past at train speed (train coords: they move left with the ground)
  ctx.fillStyle = '#b88a5c'; ctx.fillRect(x0, R + 2, x1 - x0, 20);
  const off = st.scroll % 34;
  ctx.fillStyle = '#6e4a2e';
  for (let x = Math.floor(x0 / 34) * 34 - off; x < x1 + 34; x += 34) ctx.fillRect(x, R + 4, 20, 7);
  ctx.fillStyle = '#7d7a86'; ctx.fillRect(x0, R, x1 - x0, 4);
  ctx.fillStyle = '#c9c6d2'; ctx.fillRect(x0, R, x1 - x0, 1.5);
  // the sandy ground in front, with pebbles rushing by
  ctx.fillStyle = '#e9bd7c'; ctx.fillRect(x0, R + 22, x1 - x0, H - R);
  const o5 = st.scroll * 1.2;
  ctx.fillStyle = '#c99a5f';
  for (let i = Math.floor((x0 + o5) / 70) - 1; i < Math.floor((x1 + o5) / 70) + 1; i++) {
    const hv = hash(i, 77), x = i * 70 - o5 + (hv % 40);
    ctx.beginPath(); ctx.ellipse(x, R + 34 + (hv % 18), 4 + (hv % 5), 2, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (st.speedK > 0.2) {
    ctx.strokeStyle = 'rgba(255,240,210,0.5)'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const hv = hash(i, Math.floor(st.scroll / 400)), x = x0 + ((hv % 1000) / 1000) * (x1 - x0), y = R + 30 + (hv % 20);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 40 * st.speedK, y); ctx.stroke();
    }
  }
}
function heistDrawCoupler(st, g) {
  const y = HEIST.roof + HEIST.body - 16;
  ctx.fillStyle = '#3a2e2a'; ctx.fillRect(g.x0 - 4, y, g.x1 - g.x0 + 8, 7);
  ctx.fillStyle = '#5a4a40'; rr(g.x0 + (g.x1 - g.x0) / 2 - 7, y - 3, 14, 13, 3); ctx.fill();
}
// cars beyond the flag car (they are the next stretch; a gate rail stops you)
function heistDrawAhead(st) {
  if (!st.goal) return;
  const R = HEIST.roof, x = st.len + HEIST.narrow;
  heistDrawCar(st, { kind: 'box', x0: x, x1: x + 320, seed: 5, ahead: true }, G.clock);
  ctx.fillStyle = '#6b4226'; ctx.fillRect(st.len - 6, R - 34, 6, 34); ctx.fillRect(st.len - 6, R - 34, 22, 5);
}
const HEIST_CAR = {
  caboose: ['#c8452f', '#8f2c1e'], box: ['#a35a32', '#6e3a1e'], pass: ['#3d7a5c', '#25503b'], stock: ['#d4a24c', '#93692a'],
  tank: ['#c9c2b0', '#8a8370'], hay: ['#8a5a36', '#5a3a22'], check: ['#2e6f8e', '#1d4a60'], tender: ['#3a3440', '#211d26'], engine: ['#2d2a36', '#17151d'],
};
function heistDrawCar(st, c, t) {
  const R = HEIST.roof, B = HEIST.body, x = c.x0, w = c.x1 - c.x0, [col, dark] = HEIST_CAR[c.kind] || HEIST_CAR.box;
  const wheelA = st.scroll / 11;
  // trucks and wheels
  const wheel = (wx, r) => {
    ctx.fillStyle = '#2b2530'; circle(wx, HEIST.wheelY + 12 - r, r); ctx.fill();
    ctx.strokeStyle = '#8c8494'; ctx.lineWidth = 2; circle(wx, HEIST.wheelY + 12 - r, r - 3); ctx.stroke();
    ctx.beginPath(); for (let k = 0; k < 3; k++) { const a = wheelA + k * Math.PI / 3; ctx.moveTo(wx - Math.cos(a) * (r - 3), HEIST.wheelY + 12 - r - Math.sin(a) * (r - 3)); ctx.lineTo(wx + Math.cos(a) * (r - 3), HEIST.wheelY + 12 - r + Math.sin(a) * (r - 3)); } ctx.stroke();
  };
  if (c.kind === 'engine') { heistDrawEngine(st, c, t, wheel); return; }
  for (const f of [0.17, 0.83]) { const bx = x + w * f; ctx.fillStyle = '#3a3238'; ctx.fillRect(bx - 34, R + B - 4, 68, 12); wheel(bx - 18, 12); wheel(bx + 18, 12); }
  ctx.fillStyle = '#2a2228'; ctx.fillRect(x + 4, R + B - 8, w - 8, 9);
  if (c.kind === 'tank') {
    ctx.fillStyle = '#4a4048'; ctx.fillRect(x, R + B - 16, w, 10);
    ctx.fillStyle = col; rr(x + 6, R + 12, w - 12, B - 30, 34); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; rr(x + 20, R + 20, w - 40, 10, 5); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 2; for (const f of [0.3, 0.7]) { ctx.beginPath(); ctx.moveTo(x + w * f, R + 12); ctx.lineTo(x + w * f, R + B - 18); ctx.stroke(); }
    ctx.fillStyle = dark; ctx.fillRect(x + w / 2 - 14, R + 4, 28, 10);
    text('WATER', x + w / 2, R + 52, 15, '#6b6658', 'center');
    heistDrawRoof(x, w, '#8a6a46', '#5e452c');
    for (let k = 0; k <= 6; k++) { ctx.fillStyle = '#5e452c'; ctx.fillRect(x + 6 + k * (w - 16) / 6, R - 14, 3, 14); }
    ctx.fillRect(x + 6, R - 15, w - 10, 3);
    return;
  }
  if (c.kind === 'hay') {
    ctx.fillStyle = col; ctx.fillRect(x, R + 70, w, B - 74);
    ctx.fillStyle = dark; ctx.fillRect(x, R + B - 12, w, 8);
    for (let r = 0; r < 3; r++) for (let k = 0; k < Math.floor(w / 48); k++) {
      const bx = x + 4 + k * ((w - 8) / Math.floor(w / 48)) + (r % 2) * 6, bw = (w - 8) / Math.floor(w / 48) - 4, by = R + r * 24;
      ctx.fillStyle = '#e8c35a'; rr(bx, by, bw - (r % 2) * 6, 23, 4); ctx.fill();
      ctx.strokeStyle = '#b8913a'; ctx.lineWidth = 1.2;
      for (let s = 0; s < 4; s++) { ctx.beginPath(); ctx.moveTo(bx + 4, by + 5 + s * 4.5); ctx.lineTo(bx + bw - 10, by + 4 + s * 4.5); ctx.stroke(); }
      ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + bw * 0.3, by); ctx.lineTo(bx + bw * 0.3, by + 23); ctx.moveTo(bx + bw * 0.7, by); ctx.lineTo(bx + bw * 0.7, by + 23); ctx.stroke();
    }
    ctx.fillStyle = '#f6d878'; ctx.fillRect(x + 2, R - 1, w - 4, 3);
    return;
  }
  // the box body
  ctx.fillStyle = col; ctx.fillRect(x, R + 4, w, B - 10);
  ctx.fillStyle = dark; ctx.fillRect(x, R + B - 12, w, 6); ctx.fillRect(x, R + 4, 4, B - 10); ctx.fillRect(x + w - 4, R + 4, 4, B - 10);
  if (c.kind === 'box' || c.kind === 'stock') {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let k = 14; k < w - 6; k += 16) ctx.fillRect(x + k, R + 6, 2, B - 18);
  }
  if (c.kind === 'box') {
    const dx = x + w / 2 - 36;
    ctx.fillStyle = dark; ctx.fillRect(dx, R + 14, 72, B - 30);
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(dx + 4, R + 18); ctx.lineTo(dx + 68, R + B - 20); ctx.moveTo(dx + 68, R + 18); ctx.lineTo(dx + 4, R + B - 20); ctx.stroke();
    if (!c.ahead) { text('GULCH LINE', x + w * 0.2, R + 40, 13, 'rgba(255,236,200,0.75)', 'center'); text('No. ' + (100 + (c.seed % 800)), x + w * 0.8, R + 40, 12, 'rgba(255,236,200,0.6)', 'center', 'body'); }
  } else if (c.kind === 'stock') {
    ctx.fillStyle = '#4a3420';
    for (let r = 0; r < 4; r++) ctx.fillRect(x + 10, R + 16 + r * 18, w - 20, 7);
    // a friendly cow peeks out
    const cx = x + w * 0.62, cy = R + 44 + Math.sin(t * 2) * 2;
    ctx.fillStyle = '#fbf6ee'; rr(cx - 16, cy - 12, 32, 26, 10); ctx.fill();
    ctx.fillStyle = '#3a2e2a'; circle(cx - 6, cy - 4, 2.4); ctx.fill(); circle(cx + 6, cy - 4, 2.4); ctx.fill();
    ctx.fillStyle = '#f2a7b4'; rr(cx - 10, cy + 3, 20, 10, 5); ctx.fill();
    ctx.fillStyle = '#3a2e2a'; circle(cx + 9, cy - 9, 4); ctx.fill();
    ctx.fillStyle = '#e8d6a8'; ctx.beginPath(); ctx.moveTo(cx - 14, cy - 10); ctx.lineTo(cx - 22, cy - 18); ctx.lineTo(cx - 12, cy - 13); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 14, cy - 10); ctx.lineTo(cx + 22, cy - 18); ctx.lineTo(cx + 12, cy - 13); ctx.fill();
  } else if (c.kind === 'pass' || c.kind === 'check' || c.kind === 'caboose') {
    ctx.fillStyle = c.kind === 'caboose' ? '#f3d9a4' : '#f6e7c4'; ctx.fillRect(x + 6, R + 20, w - 12, 34);
    ctx.fillStyle = c.kind === 'caboose' ? '#8f2c1e' : '#c9a24a'; ctx.fillRect(x + 4, R + 58, w - 8, 4);
    const n = Math.max(2, Math.floor((w - 30) / 46));
    for (let k = 0; k < n; k++) {
      const wx = x + 18 + k * ((w - 36) / n), ww = (w - 36) / n - 12;
      ctx.fillStyle = '#ffe9b0'; rr(wx, R + 24, ww, 26, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(wx + 3, R + 27, ww * 0.3, 20);
    }
    if (c.kind === 'pass') text('TUMBLEWEED EXPRESS', x + w / 2, R + 78, 13, 'rgba(255,236,200,0.8)', 'center');
    if (c.kind === 'check') text('GULCH MAIL', x + w / 2, R + 78, 14, 'rgba(255,236,200,0.85)', 'center');
    if (c.kind === 'caboose') {
      // the back porch with its railing and a red lantern
      ctx.fillStyle = '#5a3a22'; ctx.fillRect(x - 22, R + B - 18, 22, 6);
      ctx.strokeStyle = '#3a2e2a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 20, R + B - 18); ctx.lineTo(x - 20, R + 30); ctx.lineTo(x, R + 30); for (let k = 0; k < 3; k++) { ctx.moveTo(x - 20 + k * 7, R + 30); ctx.lineTo(x - 20 + k * 7, R + B - 18); } ctx.stroke();
      ctx.fillStyle = '#ff5a3a'; circle(x - 20, R + 22, 5 + Math.sin(t * 6) * 0.6); ctx.fill();
      ctx.fillStyle = 'rgba(255,120,80,0.25)'; circle(x - 20, R + 22, 12); ctx.fill();
    }
  } else if (c.kind === 'tender') {
    ctx.fillStyle = '#c9a24a'; ctx.fillRect(x + 4, R + 30, w - 8, 3); ctx.fillRect(x + 4, R + 70, w - 8, 3);
  }
  // the roof boards
  heistDrawRoof(x, w, c.kind === 'tender' ? '#3a3440' : '#9b6b42', c.kind === 'tender' ? '#211d26' : '#6a4426');
  if (c.kind === 'tender') {
    ctx.fillStyle = '#1e1a22';
    for (let k = 0; k < w - 10; k += 14) { circle(x + 8 + k, R - 2 + (hash(k, 3) % 4), 7 + (hash(k, 5) % 4)); ctx.fill(); }
  }
  if (c.cupola) {
    const cx0 = c.cupola.x0;
    ctx.fillStyle = col; ctx.fillRect(cx0, R - 24, 72, 26);
    ctx.fillStyle = '#ffe9b0'; rr(cx0 + 8, R - 19, 22, 13, 3); ctx.fill(); rr(cx0 + 42, R - 19, 22, 13, 3); ctx.fill();
    heistDrawRoof(cx0 - 4, 80, '#9b6b42', '#6a4426', R - 24);
  }
  if (c.kind === 'check' && !c.ahead) {
    // the checkpoint flag
    const fx = x + w / 2, on = st.state === 'clear';
    ctx.fillStyle = '#5a3a22'; ctx.fillRect(fx - 2, R - 78, 4, 78);
    const wv = Math.sin(t * 7) * (on ? 4 : 2);
    ctx.fillStyle = on ? C.gold : '#ffd27a'; ctx.beginPath(); ctx.moveTo(fx + 2, R - 78); ctx.quadraticCurveTo(fx + 20, R - 74 + wv, fx + 38, R - 70); ctx.lineTo(fx + 2, R - 58); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b9850f'; heistStar(fx + 15, R - 69, 5); ctx.fill();
  }
}
function heistDrawRoof(x, w, col, dark, y = HEIST.roof) {
  ctx.fillStyle = dark; rr(x - 3, y - 3, w + 6, 10, 3); ctx.fill();
  ctx.fillStyle = col; rr(x - 3, y - 4, w + 6, 7, 3); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let k = 26; k < w; k += 30) ctx.fillRect(x + k, y - 4, 2, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x, y - 4, w, 1.5);
}
function heistStar(x, y, r) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr2 = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  ctx.closePath();
}
function heistDrawEngine(st, c, t, wheel) {
  const R = HEIST.roof, B = HEIST.body, x = c.x0, w = c.x1 - c.x0, cab = c.cab;
  // driving wheels (big and red), then the frame
  for (const f of [0.42, 0.62, 0.82]) {
    const wx = x + w * f;
    ctx.fillStyle = '#b8302a'; circle(wx, HEIST.wheelY - 10, 24); ctx.fill();
    ctx.strokeStyle = '#2b2530'; ctx.lineWidth = 4; circle(wx, HEIST.wheelY - 10, 24); ctx.stroke();
    ctx.strokeStyle = '#f2d39a'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let k = 0; k < 4; k++) { const a = st.scroll / 24 + k * Math.PI / 4; ctx.moveTo(wx - Math.cos(a) * 20, HEIST.wheelY - 10 - Math.sin(a) * 20); ctx.lineTo(wx + Math.cos(a) * 20, HEIST.wheelY - 10 + Math.sin(a) * 20); } ctx.stroke();
  }
  const rodA = st.scroll / 24;
  ctx.strokeStyle = '#c9c6d2'; ctx.lineWidth = 5; ctx.beginPath();
  ctx.moveTo(x + w * 0.42 + Math.cos(rodA) * 12, HEIST.wheelY - 10 + Math.sin(rodA) * 12); ctx.lineTo(x + w * 0.82 + Math.cos(rodA) * 12, HEIST.wheelY - 10 + Math.sin(rodA) * 12); ctx.stroke();
  wheel(x + 30, 12); wheel(x + 80, 12);
  ctx.fillStyle = '#2a2228'; ctx.fillRect(x, R + B - 14, w, 12);
  // the cowcatcher
  ctx.fillStyle = '#c8452f'; ctx.beginPath(); ctx.moveTo(x + w - 8, R + B - 14); ctx.lineTo(x + w + 34, HEIST.railY - 2); ctx.lineTo(x + w - 8, HEIST.railY - 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8f2c1e'; ctx.lineWidth = 2; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + w - 8, R + B - 14 + k * 4); ctx.lineTo(x + w - 8 + k * 9, HEIST.railY - 2); ctx.stroke(); }
  // the boiler
  ctx.fillStyle = '#2d2a36'; rr(x + 126, R + 18, w - 130, 66, 30); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(x + 140, R + 26, w - 170, 10, 5); ctx.fill();
  ctx.fillStyle = '#c9a24a'; for (const f of [0.45, 0.65, 0.85]) ctx.fillRect(x + w * f, R + 18, 5, 66);
  // the front: smokebox door and lamp
  ctx.fillStyle = '#17151d'; circle(x + w - 6, R + 51, 30); ctx.fill();
  ctx.fillStyle = '#ffe9a0'; rr(x + w - 30, R - 2, 26, 20, 5); ctx.fill(); ctx.fillStyle = 'rgba(255,240,170,0.35)'; circle(x + w - 4, R + 8, 22); ctx.fill();
  // the smokestack (solid) and the steam dome with the bell
  ctx.fillStyle = '#2d2a36'; ctx.beginPath(); ctx.moveTo(x + w - 96, R - 30); ctx.lineTo(x + w - 66, R - 30); ctx.lineTo(x + w - 72, R + 20); ctx.lineTo(x + w - 90, R + 20); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#17151d'; rr(x + w - 100, R - 38, 38, 10, 3); ctx.fill();
  ctx.fillStyle = '#c9a24a'; rr(x + w - 184, R + 2, 40, 20, 10); ctx.fill();
  ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(x + w - 230, R + 18); ctx.quadraticCurveTo(x + w - 224, R - 2, x + w - 218, R + 18); ctx.closePath(); ctx.fill();
  // the cab: walls with a window, the canopy roof on posts, the floor
  ctx.fillStyle = '#b8302a'; ctx.fillRect(x, R + 6, cab.x1 - cab.x0, B - 20);
  ctx.fillStyle = '#ffe9b0'; rr(x + 20, R + 22, 36, 26, 4); ctx.fill(); rr(x + 76, R + 22, 36, 26, 4); ctx.fill();
  ctx.fillStyle = '#8f2c1e'; ctx.fillRect(x, R + 6, cab.x1 - cab.x0, 5);
  text('GULCH No. 9', x + 65, R + 68, 13, '#ffd27a', 'center');
  ctx.fillStyle = '#5a3a22'; ctx.fillRect(x + 2, R - 96, 6, 96); ctx.fillRect(x + 122, R - 96, 6, 96);
  ctx.fillStyle = '#8f2c1e'; rr(x - 10, R - 108, 150, 14, 5); ctx.fill();
  ctx.fillStyle = '#b8302a'; rr(x - 10, R - 110, 150, 8, 4); ctx.fill();
  heistDrawRoof(x, 130, '#7d5a3a', '#4e3622');
  // the big brake lever (gold knob), shaking when only one pulls
  const lx = cab.lever, sh = st.leverShake > 0 ? Math.sin(t * 60) * 0.06 : 0, a = -0.55 + st.brakeK * 0.95 + sh + (st.state === 'stop' ? 0.95 : 0);
  ctx.save(); ctx.translate(lx, R - 2); ctx.rotate(a);
  ctx.fillStyle = '#5a5560'; rr(-3, -54, 6, 54, 3); ctx.fill();
  ctx.fillStyle = '#ff5a3a'; circle(0, -56, 8); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(-2, -58, 3); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#3a3238'; rr(lx - 14, R - 8, 28, 8, 3); ctx.fill();
  text('BRAKE', lx, R - 86, 13, C.gold, 'center');
}
function heistDrawCrate(k) {
  const R = HEIST.roof, w = k.x1 - k.x0, h = R - k.y0;
  if (k.kind === 'hay') {
    ctx.fillStyle = '#e8c35a'; rr(k.x0, k.y0, w, h, 5); ctx.fill();
    ctx.strokeStyle = '#b8913a'; ctx.lineWidth = 1.2;
    for (let s = 0; s < 4; s++) { ctx.beginPath(); ctx.moveTo(k.x0 + 4, k.y0 + 5 + s * 4.5); ctx.lineTo(k.x1 - 4, k.y0 + 4 + s * 4.5); ctx.stroke(); }
    ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(k.x0 + w * 0.3, k.y0); ctx.lineTo(k.x0 + w * 0.3, R); ctx.moveTo(k.x0 + w * 0.7, k.y0); ctx.lineTo(k.x0 + w * 0.7, R); ctx.stroke();
    return;
  }
  ctx.fillStyle = '#c08a4e'; ctx.fillRect(k.x0, k.y0, w, h);
  ctx.strokeStyle = '#7a5228'; ctx.lineWidth = 3; ctx.strokeRect(k.x0 + 1.5, k.y0 + 1.5, w - 3, h - 3);
  ctx.beginPath(); ctx.moveTo(k.x0 + 3, k.y0 + 3); ctx.lineTo(k.x1 - 3, R - 3); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(k.x0 + 3, k.y0 + 3, w - 6, 3);
}
function heistDrawPlank(st, g, t) {
  const R = HEIST.roof;
  ctx.fillStyle = g.gold ? C.gold : '#7a5a3a'; rr(g.x0 - 6, R - 3, g.x1 - g.x0 + 12, 9, 3); ctx.fill();
  ctx.fillStyle = g.gold ? C.goldDark : '#4e3622'; ctx.fillRect(g.x0 - 4, R + 4, g.x1 - g.x0 + 8, 2);
  if (g.gold) { ctx.save(); ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 5); ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = 2; rr(g.x0 - 8, R - 5, g.x1 - g.x0 + 16, 13, 4); ctx.stroke(); ctx.restore(); }
}
function heistDrawWeed(h) {
  ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(-h.ph);
  const r = HEIST.weedR + 3;
  ctx.strokeStyle = '#a6743c'; ctx.lineWidth = 2;
  for (let k = 0; k < 7; k++) { const a = k * 0.9; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.55, a, 0, Math.PI * 2); ctx.stroke(); }
  ctx.strokeStyle = '#d2a25e'; ctx.lineWidth = 1.2;
  for (let k = 0; k < 5; k++) { const a = k * 1.3 + 0.4; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.8, r * 0.35, a, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}
function heistDrawTowerBack(st, h) {
  // the water tower beside the track (behind the train): legs and the tank
  const x = h.x + 70, R = HEIST.roof;
  ctx.strokeStyle = '#7a5a40'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(x - 30, 250); ctx.lineTo(x - 44, R + 40); ctx.moveTo(x + 50, 250); ctx.lineTo(x + 64, R + 40); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 36, 270); ctx.lineTo(x + 58, 330); ctx.moveTo(x + 56, 270); ctx.lineTo(x - 40, 330); ctx.stroke();
  ctx.fillStyle = '#9b6b42'; rr(x - 50, 150, 120, 104, 14); ctx.fill();
  ctx.fillStyle = '#6a4426'; for (let k = 0; k < 4; k++) ctx.fillRect(x - 50, 164 + k * 24, 120, 4);
  ctx.fillStyle = '#7a3a26'; ctx.beginPath(); ctx.moveTo(x - 58, 152); ctx.lineTo(x + 10, 118); ctx.lineTo(x + 78, 152); ctx.closePath(); ctx.fill();
  text('WATER', x + 10, 206, 16, '#ffe9c4', 'center');
}
function heistDrawStation(st, t) {
  const R = HEIST.roof, x = st.station.x;
  // the station house and the platform (behind the train and in front of the engine's nose)
  ctx.fillStyle = '#c98b5a'; ctx.fillRect(x - 80, 220, 330, 140);
  ctx.fillStyle = '#8a5833'; for (let k = 0; k < 330; k += 22) ctx.fillRect(x - 80 + k, 220, 3, 140);
  ctx.fillStyle = '#7a3a26'; ctx.beginPath(); ctx.moveTo(x - 100, 224); ctx.lineTo(x + 85, 168); ctx.lineTo(x + 270, 224); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f6e2a8'; rr(x - 20, 186, 210, 30, 8); ctx.fill();
  text('TUMBLEWEED GULCH', x + 85, 202, 18, '#7a3a26', 'center');
  ctx.fillStyle = '#ffe9b0'; rr(x + 10, 250, 40, 40, 5); ctx.fill(); rr(x + 130, 250, 40, 40, 5); ctx.fill();
  ctx.fillStyle = '#9b6b42'; ctx.fillRect(x - 20, R + 56, 300, 14);
  ctx.fillStyle = '#6a4426'; ctx.fillRect(x - 20, R + 70, 300, 60);
}
function heistDrawSheriff(st, t) {
  const R = HEIST.roof, x = st.station.x + 90, feet = R + 56;
  const tip = st.stopT > HEIST.stopT ? Math.min(1, (st.stopT - HEIST.stopT) / 0.4) * (st.stopT < HEIST.stopT + 2.2 ? 1 : Math.max(0, 1 - (st.stopT - HEIST.stopT - 2.2) / 0.4)) : 0;
  const bob = Math.sin(t * 3) * 1.5;
  ctx.save(); ctx.translate(x, feet);
  ctx.fillStyle = 'rgba(28,26,54,0.2)'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
  // boots, trousers, vest, arms
  ctx.fillStyle = '#5a3a22'; rr(-12, -10, 10, 10, 3); ctx.fill(); rr(2, -10, 10, 10, 3); ctx.fill();
  ctx.fillStyle = '#4a5a8a'; rr(-11, -30, 22, 22, 4); ctx.fill();
  ctx.fillStyle = '#e8d6b0'; rr(-14, -58 + bob, 28, 30, 8); ctx.fill();
  ctx.fillStyle = '#8a5a36'; rr(-14, -58 + bob, 9, 30, 4); ctx.fill(); rr(5, -58 + bob, 9, 30, 4); ctx.fill();
  ctx.fillStyle = C.gold; heistStar(-9, -48 + bob, 5); ctx.fill();
  // the head with a big friendly mustache
  ctx.fillStyle = '#f2c79a'; circle(0, -70 + bob, 13); ctx.fill();
  ctx.fillStyle = '#3a2e2a'; circle(-5, -73 + bob, 2); ctx.fill(); circle(5, -73 + bob, 2); ctx.fill();
  ctx.fillStyle = '#7a4a2a'; ctx.beginPath(); ctx.ellipse(-5, -64 + bob, 7, 3, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(5, -64 + bob, 7, 3, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3a2e2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -63 + bob, 4, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  // the arm that tips the hat
  ctx.strokeStyle = '#e8d6b0'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(10, -52 + bob); ctx.lineTo(16 - tip * 4, -40 - tip * 44 + bob); ctx.stroke(); ctx.lineCap = 'butt';
  // the hat (lifts and tilts)
  ctx.save(); ctx.translate(0, -80 + bob - tip * 12); ctx.rotate(tip * 0.35);
  ctx.fillStyle = '#c99a5a'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 5, 0, 0, Math.PI * 2); ctx.fill();
  rr(-11, -16, 22, 16, 6); ctx.fill();
  ctx.fillStyle = '#7a4a2a'; ctx.fillRect(-11, -5, 22, 4);
  ctx.restore();
  // the sack in his arms once given
  if (st.given) heistSackShape(-16, -40 + bob, 0.9, 0, false, t);
  ctx.restore();
}
// the burlap gold sack: x, y its centre
function heistSackShape(x, y, s, rot, gold, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s);
  if (gold) { ctx.fillStyle = 'rgba(255,214,90,' + (0.35 + 0.2 * Math.sin(t * 6)) + ')'; circle(0, 1, 17); ctx.fill(); }
  ctx.fillStyle = '#c9a36a'; ctx.beginPath(); ctx.moveTo(-6, -8); ctx.quadraticCurveTo(-13, 2, -10, 9); ctx.quadraticCurveTo(0, 13, 10, 9); ctx.quadraticCurveTo(13, 2, 6, -8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = '#ffd34a'; circle(-3, -10, 3.4); ctx.fill(); circle(3, -11, 3); ctx.fill();
  ctx.fillStyle = '#fff6c8'; circle(-4, -11, 1.1); ctx.fill();
  ctx.strokeStyle = '#7a5228'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-7, -7); ctx.lineTo(7, -7); ctx.stroke();
  ctx.fillStyle = '#b9850f'; heistStar(0, 3, 4); ctx.fill();
  ctx.restore();
}
function heistDrawTop(st) {
  const t = G.clock, big = heistBig(), R = HEIST.roof;
  ctx.save(); ctx.translate(-st.camX, 0);
  // players in a whoops: Dusty's hay cart below the gap, the boing back up
  for (const p of G.players) {
    const w = st.pl[p.id].whoops;
    if (!w) continue;
    const cartA = clamp(Math.min(w.t / 0.2, (HEIST.whoopsT - w.t) / 0.3), 0, 1);
    heistDrawCart(w.cartX, cartA, w.t);
    const q = heistWhoopsPos(st, w);
    drawPlayer(Object.assign({}, p, { alive: true, x: q.x - PW / 2, y: q.y - PH / 2, w: PW, h: PH, vx: 0, vy: w.t > 0.75 ? -200 : 200, sx: 1 + q.sq, sy: 1 - q.sq * 0.6, stun: 0 }));
  }
  // the sack
  heistDrawSack(st, t);
  // the aim arc while a toss is charging
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (!P.charging || !p.alive) continue;
    const q = Object.assign({}, p, { x: p.x + st.camX });
    const pts = heistArc(st, q, clamp(P.chargeT / HEIST.chargeMax, 0, 1));
    ctx.fillStyle = st.goldSack ? C.gold : 'rgba(255,250,235,0.9)';
    pts.forEach((pt, i) => { if (i % 2 === 0) { circle(pt.x, pt.y, 2.6); ctx.fill(); } });
    const e = pts[pts.length - 1];
    if (e) { ctx.strokeStyle = PCOL[p.id]; ctx.lineWidth = 2; circle(e.x, Math.min(e.y, R - 6), 7); ctx.stroke(); }
  }
  // overhead hazards (in front of the players)
  for (const h of st.hz) if (h.phase === 'go' && h.k !== 'weed') heistDrawHazard(st, h, t);
  for (const q of st.sparks) { ctx.globalAlpha = clamp(1 - q.t / q.life, 0, 1); ctx.fillStyle = q.t < 0.1 ? '#fff6c8' : '#ffb84a'; ctx.fillRect(q.x, q.y, 3, 3); }
  ctx.globalAlpha = 1;
  ctx.restore();
  heistDrawDark(st, t);
  // engine smoke
  for (const q of st.smoke) { ctx.fillStyle = 'rgba(244,236,226,' + ((q.far ? 0.3 : 0.55) * (1 - q.t / q.life)) + ')'; circle(q.x, q.y, q.far ? Math.min(q.r, 22) : q.r); ctx.fill(); }
  // pops
  ctx.save(); ctx.translate(-st.camX, 0);
  for (const q of st.pops) {
    const size = q.size * (big ? 1.3 : 1);
    ctx.font = size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const w = ctx.measureText(q.s).width + size * 0.3, x = clamp(q.x, st.camX + w / 2 + 6, st.camX + W - w / 2 - 6), y = Math.max(96, q.y - q.t * 26);
    ctx.save(); ctx.globalAlpha = clamp(Math.min(q.t / 0.1, (1.4 - q.t) / 0.4), 0, 1);
    bigText(q.s, x, y, Math.round(size), q.col);
    ctx.restore();
  }
  ctx.restore();
  // hint chips over each person
  if (st.state === 'play' && G.introT <= HEIST.introHold) {
    const boxes = [];
    for (const p of G.players) {
      if (!p.alive || heistCpu(p.id)) continue;
      const P = st.pl[p.id], j = heistJob(st, p.id);
      const key = j ? j.k + ':' + (j.g ? j.g.i : '') : '';
      if (key !== P.chipKey) { P.chipKey = key; P.chipT = 0; }
      P.chipT += 1 / 60;
      const lines = j && heistJobText(st, p.id, j);
      if (!lines || !lines[0]) continue;
      const urgent = j.k === 'toss' || j.k === 'catch' || j.k === 'brake' || j.k === 'getSack';
      if (!(P.chipT < HEIST.chipT || P.chipT > HEIST.chipAgain || urgent)) continue;
      if (j.k === 'run' && st.k > 0 && P.chipT > 3.5) continue;
      ctx.save(); if (P.chipT > HEIST.chipAgain) ctx.globalAlpha = 0.8 + 0.2 * Math.sin(t * 5);
      boxes.push(heistChip(NAMES[p.id] + ': ' + lines[0], lines[1], p.x + p.w / 2, p.y - 26, PCOL[p.id], boxes));
      ctx.restore();
    }
  }
  if (st.state === 'stop') {
    const k = clamp((st.stopT - HEIST.stopT) / 0.3, 0, 1);
    if (k > 0) {
      bigText('Tumbleweed Gulch!', W / 2, 170, 44, C.gold, 0.6 + 0.4 * k);
      if (st.stopT > HEIST.stopT + 0.8) { pill(W / 2, 196, big ? 380 : 320, 32, 'center'); text('The sheriff gets his gold back!', W / 2, 212, big ? 21 : 17, C.paper, 'center'); }
    }
  }
}
function heistDrawCart(x, a, t) {
  if (a <= 0) return;
  const y = HEIST.railY + 20;
  ctx.save(); ctx.globalAlpha = a;
  // Dusty the donkey pulls a little hay cart along the ground
  ctx.fillStyle = '#8a5a36'; rr(x - 34, y - 22, 68, 18, 4); ctx.fill();
  ctx.fillStyle = '#e8c35a'; ctx.beginPath(); ctx.ellipse(x, y - 24, 36, 12, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#3a2e2a'; circle(x - 20, y - 2, 8); ctx.fill(); circle(x + 20, y - 2, 8); ctx.fill();
  const dx = x + 62, bob = Math.sin(t * 16) * 2;
  ctx.fillStyle = '#9a8a80'; rr(dx - 18, y - 30 + bob, 34, 18, 8); ctx.fill();
  ctx.fillRect(dx - 14, y - 14 + bob, 4, 12); ctx.fillRect(dx + 8, y - 14 + bob, 4, 12);
  rr(dx + 10, y - 44 + bob, 16, 20, 7); ctx.fill();
  ctx.fillStyle = '#7a6a60'; rr(dx + 12, y - 58 + bob, 4, 14, 2); ctx.fill(); rr(dx + 19, y - 58 + bob, 4, 14, 2); ctx.fill();
  ctx.fillStyle = '#3a2e2a'; circle(dx + 20, y - 37 + bob, 1.8); ctx.fill();
  ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 34, y - 14); ctx.lineTo(dx - 16, y - 20 + bob); ctx.stroke();
  ctx.restore();
}
function heistDrawSack(st, t) {
  const s = st.sack;
  if (s.state === 'held') {
    const p = G.players[s.who], P = st.pl[s.who];
    if (P.whoops) { const q = heistWhoopsPos(st, P.whoops); heistSackShape(q.x - 10, q.y - 4, 0.9, 0, st.goldSack, t); return; }
    if (!p.alive) return;
    const x = p.x + st.camX + p.w / 2 - p.face * 10, y = p.y + (P.duck ? 4 : 11);
    // the strap over the shoulder
    ctx.strokeStyle = '#7a5228'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(p.x + st.camX + p.w / 2 + p.face * 6, p.y + p.h - 6); ctx.stroke();
    heistSackShape(x, y, 1.05, -p.face * 0.25, st.goldSack, t);
    return;
  }
  if (s.state === 'give' && st.given) return;
  heistSackShape(s.x, s.y, 1.15, s.state === 'fly' ? s.spin : 0, st.goldSack, t);
  if (s.state === 'roof') { ctx.save(); ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 6); ctx.fillStyle = C.gold; heistStar(s.x + 12, s.y - 14, 4); ctx.fill(); ctx.restore(); }
}
function heistDrawHazard(st, h, t) {
  const R = HEIST.roof, top = R - HEIST.clear, x = h.x;
  if (h.k === 'bridge') {
    // a wooden road bridge over the line: a thick beam, the deck and its railing
    ctx.fillStyle = '#6e4426'; ctx.fillRect(x, top - 42, 70, 42);
    ctx.fillStyle = '#8a5a36'; ctx.fillRect(x, top - 42, 70, 8);
    ctx.fillStyle = '#4e3020'; ctx.fillRect(x, top - 4, 70, 4);
    ctx.fillStyle = '#c9a24a'; for (const bx of [10, 35, 60]) { circle(x + bx, top - 22, 3); ctx.fill(); }
    ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x + 4, top - 42); ctx.lineTo(x + 4, top - 74); ctx.moveTo(x + 66, top - 42); ctx.lineTo(x + 66, top - 74); ctx.moveTo(x, top - 70); ctx.lineTo(x + 70, top - 70); ctx.stroke();
    ctx.fillStyle = 'rgba(80,50,30,0.35)'; ctx.fillRect(x - 6, top - 120, 82, 48);
  } else if (h.k === 'arch') {
    // a red rock arch over the canyon line, all the way up
    ctx.fillStyle = '#b4583a'; ctx.beginPath(); ctx.moveTo(x - 10, 0); ctx.lineTo(x + 100, 0); ctx.lineTo(x + 94, top - 30); ctx.quadraticCurveTo(x + 86, top + 2, x + 45, top); ctx.quadraticCurveTo(x + 4, top + 2, x - 4, top - 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d0744e'; for (let k = 0; k < 5; k++) ctx.fillRect(x + 4, 40 + k * 56, 82, 6);
    ctx.fillStyle = '#8a3e26'; ctx.fillRect(x + 6, top - 6, 78, 6);
  } else if (h.k === 'tower') {
    // the spout hangs down from the water tower over the roof, dripping
    const tx = x + 70;
    ctx.strokeStyle = '#5a5560'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tx + 10, 250); ctx.quadraticCurveTo(tx, top - 70, x + 15, top - 34); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = '#4a4550'; rr(x, top - 40, 30, 40, 6); ctx.fill();
    ctx.fillStyle = '#6a6570'; rr(x + 3, top - 37, 8, 32, 3); ctx.fill();
    ctx.fillStyle = 'rgba(120,190,240,0.85)';
    for (let k = 0; k < 3; k++) { const dy = ((t * 120 + k * 22) % 70); circle(x + 9 + k * 6, top + dy, 2.5); ctx.fill(); }
  } else if (h.k === 'tunnel') {
    // the mesa's rock face with the tunnel mouth; inside, a high rock ceiling; the far portal
    const len = h.len, x1 = x + 80 + len;
    ctx.fillStyle = '#7a3a26'; ctx.fillRect(x + 80, 0, len, 150);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let k = 0; k < len; k += 60) ctx.fillRect(x + 80 + k, 0, 4, 150);
    ctx.fillStyle = '#b4583a'; ctx.beginPath(); ctx.moveTo(x - 20, 0); ctx.lineTo(x + 80, 0); ctx.lineTo(x + 80, top); ctx.lineTo(x, top); ctx.lineTo(x - 12, top - 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5a3a22'; ctx.fillRect(x, top - 10, 84, 10);
    ctx.fillStyle = '#d0744e'; for (let k = 0; k < 5; k++) ctx.fillRect(x - 6, 30 + k * 60, 80, 6);
    ctx.fillStyle = '#b4583a'; ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x1 + 90, 0); ctx.lineTo(x1 + 90, 150); ctx.quadraticCurveTo(x1 + 40, 120, x1, 160); ctx.closePath(); ctx.fill();
    text('TUNNEL', x + 40, top - 60, 15, '#ffe9c4', 'center');
  }
}
// the tunnel's darkness, with lantern light round Pip, Bo and the gold sack
function heistDrawDark(st, t) {
  if (st.dark <= 0.01) return;
  const tn = st.hz.find(h => h.k === 'tunnel' && h.phase === 'go');
  let x0 = 0, x1 = W;
  if (tn) { x0 = clamp(tn.x + 60 - st.camX, 0, W); x1 = clamp(tn.x + 80 + tn.len - st.camX, 0, W); }
  if (x1 <= x0) return;
  if (!heistDarkCv) { heistDarkCv = document.createElement('canvas'); heistDarkCv.width = W; heistDarkCv.height = H; }
  const d = heistDarkCv.getContext('2d');
  d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H);
  d.fillStyle = 'rgba(16,10,30,' + (0.84 * st.dark) + ')'; d.fillRect(x0, 0, x1 - x0, H);
  d.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r) => { const g = d.createRadialGradient(x, y, r * 0.25, x, y, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.fillRect(x - r, y - r, r * 2, r * 2); };
  for (const p of G.players) {
    const w = st.pl[p.id].whoops;
    if (w) { const q = heistWhoopsPos(st, w); hole(q.x - st.camX, q.y, 110); continue; }
    if (p.alive) hole(p.x + p.w / 2, p.y + 4, 130 + Math.sin(t * 9 + p.id) * 4);
  }
  if (st.sack.state === 'fly' || st.sack.state === 'roof') hole(st.sack.x - st.camX, st.sack.y, 70);
  ctx.drawImage(heistDarkCv, 0, 0, W, H);
  // the lanterns themselves
  for (const p of G.players) {
    if (!p.alive) continue;
    const lx = p.x + p.w / 2 + p.face * 14, ly = p.y + 6;
    ctx.globalAlpha = st.dark;
    ctx.fillStyle = '#5a3a22'; ctx.fillRect(lx - 4, ly - 10, 8, 3);
    ctx.fillStyle = '#ffd27a'; rr(lx - 4, ly - 7, 8, 11, 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,130,0.35)'; circle(lx, ly - 2, 10); ctx.fill();
    ctx.globalAlpha = 1;
  }
}
function heistChip(t1, t2, x, y, col, avoid) {
  const z = heistBig() ? 1.45 : 1, f1 = Math.round(13 * z), f2 = Math.round(12 * z);
  ctx.font = '700 ' + f1 + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  let w = ctx.measureText(t1).width;
  if (t2) { ctx.font = '700 ' + f2 + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; w = Math.max(w, ctx.measureText(t2).width); }
  w = Math.min(W - 16, w + 22 * z); const h = (t2 ? 38 : 22) * z;
  const x0 = clamp(x - w / 2, 8, W - 8 - w);
  let y0 = clamp(y - h, 92, H - 8 - h);
  for (const b of avoid || []) if (x0 < b.x1 + 4 && x0 + w > b.x0 - 4 && y0 < b.y1 + 4 && y0 + h > b.y0 - 4) y0 = b.y0 - h - 6 >= 92 ? b.y0 - h - 6 : b.y1 + 6;
  ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(x0, y0, w, h, 10 * z); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; rr(x0, y0, w, h, 10 * z); ctx.stroke();
  text(t1, x0 + w / 2, y0 + 11 * z, f1, col, 'center', 'body');
  if (t2) text(t2, x0 + w / 2, y0 + 28 * z, f2, C.paper, 'center', 'body');
  return { x0, y0, x1: x0 + w, y1: y0 + h };
}
function heistHud(st) {
  const big = heistBig(), fs = big ? 20 : 14, h = big ? 40 : 28;
  const wh = st.stats.whoops[0] + st.stats.whoops[1];
  const parts = [[fmtTime(G.time), C.paper], ['Whoops ' + wh, wh ? '#fff1c4' : C.paper]];
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const ws = parts.map(q => ctx.measureText(q[0]).width), gap = fs;
  const w = ws.reduce((a, b) => a + b, 0) + gap + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
  let x = x0 + 15;
  parts.forEach((q, i) => { text(q[0], x, cy, fs, q[1], 'left', 'body'); x += ws[i] + gap; });
  // the stretch map: a little train, with Pip, Bo and the sack on it
  const mw = big ? 230 : 300, mh = big ? 30 : 24, mx = W / 2 - mw / 2 + (big ? 30 : 0), my = 12;
  ctx.fillStyle = 'rgba(28,26,54,0.72)'; rr(mx - 10, my, mw + 20, mh + 4, (mh + 4) / 2); ctx.fill();
  const sx = v => mx + clamp(v / Math.max(1, st.len), 0, 1) * mw, ry = my + mh / 2 + 4;
  for (const c of st.cars) {
    ctx.fillStyle = c.kind === 'engine' ? '#2d2a36' : c === st.goal ? '#ffd27a' : 'rgba(255,236,200,0.55)';
    rr(sx(c.x0), ry - 3, Math.max(2, sx(c.x1) - sx(c.x0)), 7, 2); ctx.fill();
    if (c.kind === 'engine') { ctx.fillStyle = '#ff5a3a'; circle(sx(c.x1) - 3, ry - 6, 2.5); ctx.fill(); }
  }
  for (const g of st.gaps) if (g.kind === 'wide') { ctx.fillStyle = g.plank ? C.gold : 'rgba(255,120,90,0.9)'; ctx.fillRect(sx(g.x0), ry + 5, Math.max(2, sx(g.x1) - sx(g.x0)), 2); }
  G.players.forEach((p, i) => {
    const xx = sx(heistTX(st, p));
    ctx.fillStyle = PCOL[i]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; circle(xx, ry - 7 + (i ? 1 : -1), big ? 6 : 4.5); ctx.fill(); ctx.stroke();
  });
  const s = st.sack, sxv = s.state === 'held' ? heistTX(st, G.players[s.who]) : s.x;
  ctx.fillStyle = C.gold; circle(sx(sxv), ry + 9, big ? 4 : 3); ctx.fill();
  // gold help chips under the time pill
  const chips = [];
  if (st.goldSack) chips.push('GOLD SACK');
  if (st.gaps.some(g => g.gold)) chips.push('GOLD PLANK');
  let cy2 = 12 + h + 6;
  for (const c of chips) {
    const fs2 = big ? 15 : 11;
    ctx.font = '700 ' + fs2 + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w2 = ctx.measureText(c).width + 20;
    pill(W - 14, cy2, w2, fs2 + 10, 'right');
    text(c, W - 24, cy2 + (fs2 + 10) / 2 + 0.5, fs2, C.gold, 'right', 'body');
    cy2 += fs2 + 14;
  }
  // hazard warning: a wooden sign with each person's duck key
  const wn = st.hz.find(q => HEIST_DUCK[q.k] && (q.phase === 'warn' || (q.x > st.camX + 120 && q.x < st.camX + W + 60)));
  if (wn && st.state === 'play') {
    const name = { bridge: 'LOW BRIDGE!', arch: 'LOW ARCH!', tower: 'WATER SPOUT!', tunnel: 'TUNNEL!' }[wn.k];
    const humans = [0, 1].filter(id => !heistCpu(id));
    const keys = humans.map(id => (humans.length > 1 ? NAMES[id] + ' ' : '') + heistKey(id, 'down')).join(' · ');
    const l2 = 'Duck: hold ' + keys;
    const sf = big ? 26 : 20, sf2 = big ? 17 : 13;
    ctx.font = '700 ' + sf2 + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const sw = Math.max(big ? 230 : 180, ctx.measureText(l2).width + 30), sh = big ? 70 : 54;
    const bx = W - 20 - sw, by = big ? 130 : 112, k = wn.phase === 'warn' ? 1 - wn.t / HEIST.warn : 1;
    const flash = wn.phase === 'warn' ? 0.75 + 0.25 * Math.sin(G.clock * 14) : 1;
    ctx.save(); ctx.globalAlpha = flash;
    ctx.fillStyle = '#5a3a22'; ctx.fillRect(bx + sw / 2 - 4, by + sh, 8, 14);
    ctx.fillStyle = '#c08a4e'; rr(bx, by, sw, sh, 8); ctx.fill();
    ctx.strokeStyle = '#7a5228'; ctx.lineWidth = 3; rr(bx, by, sw, sh, 8); ctx.stroke();
    text(name, bx + sw / 2, by + sh * 0.34, sf, '#5a2a16', 'center');
    text(l2, bx + sw / 2, by + sh * 0.74, sf2, '#3a2010', 'center', 'body');
    if (wn.phase === 'warn') { ctx.fillStyle = 'rgba(90,42,22,0.35)'; ctx.fillRect(bx + 8, by + sh - 6, (sw - 16) * k, 3); }
    ctx.restore();
  }
  // the brake meter in the cab
  if (st.final && st.cab && st.state === 'play' && G.players.some(p => heistInCab(st, p))) {
    const bw = big ? 280 : 240, bh = big ? 22 : 16, bx = W / 2 - bw / 2, by = big ? 128 : 112;
    ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(bx - 10, by - 6, bw + 20, bh + 30, 12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(bx, by, bw, bh, bh / 2); ctx.fill();
    ctx.fillStyle = C.gold; if (st.brakeK > 0) { rr(bx, by, Math.max(bh, bw * st.brakeK), bh, bh / 2); ctx.fill(); }
    const both = st.brakeHold[0] && st.brakeHold[1], one = st.brakeHold[0] || st.brakeHold[1];
    text(both ? 'Pulling together!' : one ? 'Pull together! Both hold the brake' : 'BRAKE: both hold the action', W / 2, by + bh + 13, big ? 16 : 12, both ? C.gold : C.paper, 'center', 'body');
  }
  // news
  const n = st.news;
  if (n && G.mode === 'play') {
    const a = clamp(Math.min(n.t / 0.2, (n.life - n.t) / 0.3), 0, 1), nfs = big ? 19 : 14, nh = big ? 34 : 26, ny = big ? 84 : 80;
    ctx.font = '700 ' + nfs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const nw = Math.min(W - 40, ctx.measureText(n.s).width + 32);
    const nx = big ? W / 2 - 60 : W / 2;
    ctx.save(); ctx.globalAlpha = a;
    const px = pill(nx, ny, nw, nh, 'center');
    if (n.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(px, ny, nw, nh, nh / 2); ctx.stroke(); }
    text(n.s, nx, ny + nh / 2 + 0.5, nfs, n.gold ? C.gold : C.paper, 'center', 'body');
    ctx.restore();
  }
}

/* ---------- sounds ---------- */
Sfx.extra.heistWhistle = function () { this.tone(587, 0.32, 'triangle', 0.05, 560); this.tone(740, 0.32, 'triangle', 0.035, 700); this.tone(587, 0.4, 'triangle', 0.05, 540, 0.4); this.tone(740, 0.4, 'triangle', 0.035, 690, 0.4); };
Sfx.extra.heistToss = function (p) { this.tone(300 * p, 0.16, 'triangle', 0.05, 700 * p); };
Sfx.extra.heistCatch = function (p) { [660 * p, 990 * p].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.heistThud = function () { this.tone(150, 0.1, 'triangle', 0.06, 90); };
Sfx.extra.heistBonk = function (p) { this.tone(260 * p, 0.12, 'square', 0.035, 120 * p); this.tone(900, 0.06, 'triangle', 0.02, 1400, 0.05); };
Sfx.extra.heistWhoops = function (p) { this.tone(700 * p, 0.35, 'sine', 0.05, 220 * p); };
Sfx.extra.heistBoing = function (p) { this.tone(200 * (p || 1), 0.25, 'sine', 0.06, 640 * (p || 1)); };
Sfx.extra.heistShout = function (p) { this.tone(500 * p, 0.08, 'square', 0.025, 640 * p); this.tone(640 * p, 0.1, 'square', 0.02, 800 * p, 0.08); };
Sfx.extra.heistGold = function () { [784, 988, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.heistClear = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.13, 'triangle', 0.055, null, i * 0.08)); };
Sfx.extra.heistRatchet = function () { this.tone(180, 0.04, 'square', 0.03, 140); };
Sfx.extra.heistScreech = function () { this.tone(1800, 1.6, 'sawtooth', 0.012, 900); this.tone(2400, 1.4, 'square', 0.006, 1300, 0.1); };
Sfx.extra.heistTip = function () { this.tone(520, 0.1, 'triangle', 0.05, 660); this.tone(780, 0.14, 'triangle', 0.05, null, 0.1); };
Sfx.extra.heistWin = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.06, null, i * 0.1)); };
