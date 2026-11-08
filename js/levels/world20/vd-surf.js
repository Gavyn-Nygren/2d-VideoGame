/* Pip & Bo - Level 20-1 Volcano Dragon: phase 'surf' (Lava Surf Race, versus). */
'use strict';

/* ===== 20-1 phase 4: Lava Surf Race (VD_PHASES.surf, versus inside the team boss level) =====
   Cinder has cheered up and wants a race. Pip and Bo each surf a cooled rock slab down the lava river on the far side
   of the volcano (scrolling right and down). Split screen like 11-3 Hurdle Dash: Pip's lane on top, Bo's below, each
   with its own camera; the other surfer shows as a faded ghost in your lane, and a bar in each lane's corner shows who
   is ahead. Best of 3 races: first to 2 wins is the Surf champ.
     lean   the slab slides by itself. Hold ▶ to lean forward (faster); ◀ or ▼ leans back (slower: wait for a geyser).
     jump   a hop (the same small arc on any slope). Hop rocks and lava waves. A jump at the GOLD edge at the top of a
            rock ramp (or just off it) is a POP: a big air and a speed boost. A hop needs a short push on the lava first,
            so mashing jump just bobs along.
     trick  the action, in the air: a spin / flip / grab (0.55 s). Finished before you land = a little boost (more than
            one per air on a big jump). Landing mid-trick = a wobble (slow for a moment, never a crash). Plain hops are
            too short for a trick, so tricks need a pop, a bump or a lava fall.
   Hazards (soft, nobody is hurt): a rock = "Bonk!" (slower, a wobble, the rock crumbles); a lava wave rolling up the
   river = "Sploosh!" unless you hop it (a hop near it = "Wave hop!", a small boost); a geyser (it bubbles, then
   spouts on a steady beat) = "Hot foot!": tossed up and slowed. Gold streams on the lava = "Zoom!" while you ride them.
   Tracks (hand-made, in order; a dead heat replays the same track): 1 Ember Run (rocks, bumps, ramps, gold streams),
   2 Wave Rapids (lava waves), 3 Geyser Gulch (geysers, rock pairs, lava falls). Ties within 0.002 s are a dead heat:
   replayed; the 2nd tie in a row goes to more tricks, else more POPs, else fewer bumps, else Cinder's lucky coin
   (announced), so it never replays forever. A safety bell ends a race nobody finishes (furthest wins).
   Catch-up: whoever trails in races rides a GOLD SLAB (announced on the race card and in the news, a chip in the
   lane): a wider pop edge, quicker tricks and longer boosts.
   Calm: the race (and its countdown) freezes while nobody plays for VD.idleAfter s (Cinder waits), so an idle person
   never lets the computer win alone. Surf hits are race slowdowns only: they are not team bonks.
   After the deciding race Cinder crowns the winner (a little scene), then the core's ending plays. Results: the line
   "Surf champ: Pip (2-1)". Stats: st.stats.surf { wins, champ, races, tricks, pops, hits, best }.
   The engine players are hidden while the lanes draw and only mirror each surfer's screen spot (hints, bubbles).
   The brain (js/cpu/levels/world20/vd-surf.js) is the opponent and reads VDSURF and these helpers.
   Names: vdSurf* / VDSURF*; sounds Sfx.extra.vdSurf*. */

const VDSURF = {
  laneY: [84, 312], laneH: 224, riderX: 210, feetLo: 62, feetHi: 168, RS: 1.2,      // lanes (screen), rider spot, sprite scale
  g: 1700, jumpV: 430, rampK: 0.6, buf: 0.15, push: 0.2, coyote: 0.08,
  cruise: 350, slopeK: 520, leanAdd: 95, slowK: 0.5, acc: 270, accFast: 950, decay: 170, brake: 560, vMin: 80, vMax: 720, airDrag: 14, airK: 0.35,
  boostAdd: 150, streamAdd: 200,
  popLen: 66, popBoost: 0.75,
  trickT: 0.55, trickBoost: 0.7, trickSave: 0.82,
  wobT: 0.75, wobK: 0.55, wobHit: 0.85,
  slabHalf: 18,
  rockMul: 0.5, rockWob: 0.6,
  waveV: 150, waveTrig: 720, waveMul: 0.6, waveBoost: 0.45,
  geyP: 3.0, geyCalm: 1.35, geyWarn: 0.95, geyErupt: 0.7, geyH: 180, geyW: 26, geyMul: 0.4, geyToss: 560, geyWob: 0.8,
  help: { pop: 1.4, trick: 0.88, boost: 1.2 },
  win: 2, cardT: 5, endT: 2.9, crownT: 4.6, tieEps: 0.002, limitK: 1.7,
};
// the three hand-made tracks: segs [length, drop] (a smooth S between points; negative drop = a bump up), feat:
// ['k', x, len, h] a rock ramp (its lip at x + len), ['r', x, h, w] a rock, ['s', x0, x1] a gold stream,
// ['w', x, h] a lava wave (it starts there and rolls up the river when you come near), ['g', x, beat offset] a geyser
const VDSURF_TRACKS = [
  { key: 'ember', name: 'Ember Run', hint: 'Hop over the rocks. Hop at the gold edge of a ramp: POP!', len: 13300,
    say: 'Race me down the volcano! Wheee!',
    segs: [[600, 20], [700, 110], [300, -36], [500, 110], [700, 50], [600, 150], [500, 30], [260, -40], [600, 140], [700, 40],
      [220, 150], [700, 50], [600, 140], [300, -40], [600, 120], [800, 40], [600, 150], [700, 40], [260, 160], [700, 90],
      [600, 140], [700, 40], [700, 110], [800, 30]],
    feat: [['s', 800, 1260], ['r', 1950, 26], ['k', 2380, 150, 44], ['r', 3650, 28], ['s', 4250, 4700], ['k', 5050, 150, 44],
      ['r', 6300, 28], ['r', 6850, 30], ['s', 7330, 7820], ['k', 8100, 150, 46], ['r', 9250, 28], ['r', 9800, 30],
      ['k', 10460, 150, 46], ['s', 11000, 11480], ['r', 11800, 30], ['r', 12300, 30], ['k', 12720, 140, 40]] },
  { key: 'waves', name: 'Wave Rapids', hint: 'Lava waves roll up the river: hop over them!', len: 13600,
    say: 'Watch out for my lava waves!',
    segs: [[600, 20], [600, 120], [700, 40], [300, -40], [600, 140], [700, 30], [600, 130], [700, 50], [240, 150], [700, 40],
      [600, 130], [300, -36], [700, 110], [800, 40], [600, 150], [700, 40], [700, 120], [260, -40], [600, 130], [700, 40],
      [600, 140], [800, 50], [700, 100], [900, 30]],
    feat: [['w', 1500, 30], ['s', 2000, 2500], ['r', 2900, 28], ['w', 3700, 32], ['k', 4250, 150, 44], ['w', 5650, 32],
      ['r', 6150, 30], ['s', 6450, 6900], ['w', 7350, 34], ['w', 8000, 32], ['k', 8650, 150, 46], ['r', 9850, 30],
      ['w', 10550, 34], ['s', 10750, 11200], ['w', 11700, 34], ['r', 12300, 30], ['w', 12900, 32]] },
  { key: 'geysers', name: 'Geyser Gulch', hint: 'Geysers spout on a beat: slow down to wait, then go!', len: 13600,
    say: 'Geysers! They tickle! Hee hee!',
    segs: [[600, 20], [700, 150], [600, 40], [240, 160], [700, 40], [600, 160], [300, -40], [700, 140], [700, 40], [260, 170],
      [700, 50], [600, 150], [700, 40], [300, -40], [600, 160], [700, 40], [240, 170], [700, 60], [600, 150], [700, 40],
      [700, 120], [800, 40], [900, 30]],
    feat: [['g', 1700, 0], ['r', 2620, 30], ['k', 3000, 150, 44], ['g', 4200, 1.2], ['s', 4600, 5050],
      ['r', 5900, 30], ['r', 6450, 30], ['g', 6950, 2.1], ['k', 7500, 150, 46], ['g', 8800, 0.6], ['r', 9750, 30],
      ['r', 10300, 28], ['s', 10450, 10900], ['g', 11150, 1.7], ['k', 11700, 150, 44], ['g', 12700, 0.3]] },
];
const VDSURF_TRICKS = [['spin', 'Spin!'], ['flip', 'Flip!'], ['grab', 'Grab!']];
const vdSurfName = k => NAMES[k];
const vdSurfCpu = k => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(k);
// looks-only randomness (spray, sparks): never vdRand, so the race rules never depend on the drawing
let vdSurfVS = 20261107;
const vdSurfVR = () => { vdSurfVS = (Math.imul(vdSurfVS, 1664525) + 1013904223) >>> 0; return vdSurfVS / 4294967296; };

/* ---------- the track: a smooth river surface, rock ramps ---------- */
function vdSurfTrack(i) {
  const D = VDSURF_TRACKS[i], pts = [{ x: -1200, y: 0 }, { x: 0, y: 0 }];
  let x = 0, y = 0;
  for (const [L, dy] of D.segs) { x += L; y += dy; pts.push({ x, y }); }
  pts.push({ x: x + 2000, y: y + 40 });
  const T = { i, key: D.key, name: D.name, hint: D.hint, say: D.say, len: D.len, pts, kick: [], rocks: [], streams: [], waves: [], geys: [] };
  for (const [kind, a, b, c] of D.feat) {
    if (kind === 'k') T.kick.push({ x0: a, lip: a + (b || 150), h: c || 44 });
    else if (kind === 'r') T.rocks.push({ x: a, h: b || 28, w: c || 34 });
    else if (kind === 's') T.streams.push({ x0: a, x1: b });
    else if (kind === 'w') T.waves.push({ x: a, A: b || 32 });
    else if (kind === 'g') T.geys.push({ x: a, off: b || 0 });
  }
  return T;
}
function vdSurfBase(T, x) {
  const P = T.pts;
  let lo = 0, hi = P.length - 1;
  if (x <= P[0].x) return P[0].y;
  if (x >= P[hi].x) return P[hi].y;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P[m].x <= x) lo = m; else hi = m; }
  const a = P[lo], b = P[hi], u = (x - a.x) / (b.x - a.x);
  return a.y + (b.y - a.y) * u * u * (3 - 2 * u);
}
function vdSurfKickAt(T, x) { for (const k of T.kick) if (x >= k.x0 && x < k.lip) return k; return null; }
// the surface the slab rides on (world y, down is +)
function vdSurfGround(T, x) {
  let y = vdSurfBase(T, x);
  const k = vdSurfKickAt(T, x);
  if (k) { const u = (x - k.x0) / (k.lip - k.x0); y -= k.h * u * u; }
  return y;
}
const vdSurfSlope = (T, x) => (vdSurfGround(T, x + 4) - vdSurfGround(T, x - 4)) / 8;
// geyser state on the shared beat: { on: 'calm' | 'warn' | 'erupt', u (0..1 through that part), n (which spout) }
function vdSurfGey(ph, g) {
  const K = VDSURF, c = ph.clock + g.off, n = Math.floor(c / K.geyP), m = c - n * K.geyP;
  if (m < K.geyCalm) return { on: 'calm', u: m / K.geyCalm, n };
  if (m < K.geyCalm + K.geyWarn) return { on: 'warn', u: (m - K.geyCalm) / K.geyWarn, n };
  return { on: 'erupt', u: (m - K.geyCalm - K.geyWarn) / K.geyErupt, n };
}
// the spout's height while erupting (shoots up fast, holds, sinks)
const vdSurfGeyH = u => VDSURF.geyH * Math.min(1, u / 0.15, (1 - u) / 0.2 + 0.25);
// seconds until a surfer in the air lands (a plain ballistic guess over the track, as a person would judge it)
function vdSurfLandIn(T, r, max = 2) {
  let x = r.x, y = r.y, vy = r.vy;
  const h = 1 / 120;
  for (let t = 0; t < max; t += h) {
    vy += VDSURF.g * h; x += r.v * h; y += vy * h;
    if (y >= vdSurfGround(T, x)) return t;
  }
  return max;
}
// the next of a kind ahead of x (rocks not yet knocked by this surfer)
function vdSurfAhead(ph, k, x, kind) {
  const T = ph.T;
  if (kind === 'rock') { let best = null; T.rocks.forEach((rk, i) => { if (!ph.rockHit[k][i] && rk.x + rk.w / 2 + VDSURF.slabHalf > x && (!best || rk.x < best.x)) best = rk; }); return best; }
  if (kind === 'kick') return T.kick.find(q => q.lip > x - 4) || null;
  if (kind === 'gey') return T.geys.find(q => q.x + VDSURF.geyW + VDSURF.slabHalf > x) || null;
  if (kind === 'wave') { let best = null; for (const w of ph.waves[k]) if (w.x > x - 10 && !w.past && (!best || w.x < best.x)) best = w; return best; }
  return null;
}

/* ---------- a surfer ---------- */
function vdSurfRacer(k) {
  return { k, x: 0, y: 0, v: 0, vy: 0, air: false, airT: 0, jumped: false, soft: false, push: 1, buf: 0, wob: 0, boost: 0,
    trick: null, trickN: 0, tricks: 0, pops: 0, hits: 0, splash: 0, toss: 0, fin: null, tilt: 0, land: 0, lean: 0,
    lastJumpT: -9, airN: 0, lipK: null, lipT: 9, popT: 0, inStream: false, streamN: -1, hotT: 0, sprayT: 0, place: 0, airMax: 0 };
}
function vdSurfPop(ph, k, x, y, s, col = '#ffffff', size = 20, life = 0.9) {
  ph.pops = ph.pops.filter(q => q.k !== k || q.t > 0.35);
  ph.pops.push({ k, x, y, s, col, size, t: 0, life });
}
function vdSurfPart(ph, k, x, y, vx, vy, life, col, size, grav = 900, kind = 'dot') {
  if (ph.parts.length > 300) ph.parts.shift();
  ph.parts.push({ k, x, y, vx, vy, life, max: life, col, size, grav, kind });
}
function vdSurfHint(st, k, key, text, life = 2.8) {
  const ph = st.ph;
  if (ph.hinted[k][key] || vdSurfCpu(k)) return;
  ph.hinted[k][key] = true;
  vdHint(st, k, text, { life });
}
function vdSurfWobble(st, r, word) {
  const K = VDSURF, ph = st.ph;
  r.wob = K.wobT; r.v *= K.wobHit; r.trick = null; r.wobN = (r.wobN || 0) + 1;
  vdSurfPop(ph, r.k, r.x, r.y - 60, word || 'Wobble!', '#ffd27a', 20);
  Sfx.play('vdSurfWobble', r.k);
}
function vdSurfJump(st, r, vyG) {
  const K = VDSURF, ph = st.ph, hk = ph.help[r.k] ? K.help.pop : 1;
  r.buf = 0; r.air = true; r.airT = 0; r.jumped = true; r.soft = false; r.vy = Math.min(vyG, 0) * K.rampK + Math.max(vyG, 0) - K.jumpV; r.lastJumpT = ph.t; r.airMax = 0; r.airN++;
  // a POP: the gold edge at the top of a ramp (or a moment after leaving it)
  const kk = vdSurfKickAt(ph.T, r.x);
  const pop = (kk && kk.lip - r.x <= K.popLen * hk) || (r.lipK && r.lipT <= K.coyote * hk);
  if (pop) {
    r.pops++; r.boost = Math.max(r.boost, K.popBoost * (ph.help[r.k] ? K.help.boost : 1)); r.popT = 0.5;
    vdSurfPop(ph, r.k, r.x, r.y - 64, 'POP!', C.gold, 26);
    for (let n = 0; n < 10; n++) vdSurfPart(ph, r.k, r.x, r.y, -60 + vdSurfVR() * 120, -120 - vdSurfVR() * 200, 0.6, n % 2 ? C.gold : '#fff1a8', 3, 500, 'spark');
    Sfx.play('vdSurfPop', r.k);
    if (ph.stat) ph.stat.pops[r.k]++;
  } else Sfx.play('vdSurfHop', r.k);
  r.lipK = null;
}
function vdSurfLand(st, r, gy) {
  const K = VDSURF, ph = st.ph, s = vdSurfSlope(ph.T, r.x), vyG = r.v * s;
  const tossed = r.tossAir;
  r.y = gy; r.air = false; r.tossAir = false;
  const skim = r.soft && r.airT < 0.08 && !r.trick;
  r.soft = false;
  if (skim) { r.vy = vyG; return; }
  if (r.trick) {
    if (r.trick.u >= K.trickSave) { vdSurfPop(ph, r.k, r.x, r.y - 60, 'Phew!', '#ffffff', 18); r.trick = null; }
    else {
      const short = r.trick.short;
      vdSurfWobble(st, r);
      if (short) vdSurfHint(st, r.k, 'wobS', 'Hops are too low for tricks: POP a ramp!', 3);
      else vdSurfHint(st, r.k, 'wob', 'Trick sooner, before you land!');
    }
  }
  // landing on a downslope keeps some of the fall
  if (s > 0.05 && r.vy > 0) r.v = Math.min(K.vMax, r.v + Math.min(90, r.vy * s * 0.3));
  r.vy = vyG; r.push = 0; r.land = 0.2; r.trickN = 0;
  if (tossed) r.wob = Math.max(r.wob, K.geyWob);   // a geyser toss lands with a wobble: waiting for the spout is the better plan
  if (r.airT > 0.25) {
    Sfx.play('vdSurfLand', r.k);
    for (let n = 0; n < 8; n++) vdSurfPart(ph, r.k, r.x - 20 + vdSurfVR() * 40, r.y, -80 + vdSurfVR() * 160, -140 - vdSurfVR() * 160, 0.5, n % 2 ? '#ffc04d' : '#ff7a1f', 3.2);
  }
}
// one surfer's tick (live race)
function vdSurfRide(st, r, p, dt) {
  const K = VDSURF, ph = st.ph, T = ph.T, inp = p.input, k = r.k, hp = ph.help[k];
  if (p.pendingJump) { p.pendingJump = false; r.buf = K.buf; } else r.buf = Math.max(0, r.buf - dt);
  let act = false;
  if (p.pendingAct) { p.pendingAct = false; act = true; }
  const done = r.fin != null;
  r.lean = done ? 0 : inp.right && !inp.left ? 1 : inp.left || inp.down ? -1 : 0;
  r.wob = Math.max(0, r.wob - dt); r.boost = Math.max(0, r.boost - dt); r.land = Math.max(0, r.land - dt);
  r.popT = Math.max(0, r.popT - dt); r.hotT = Math.max(0, r.hotT - dt); r.lipT += dt;
  if (r.lipT > 0.3) r.lipK = null;
  r.inStream = false;
  if (!r.air) {
    r.push += dt;
    const s = vdSurfSlope(T, r.x);
    let vt = K.cruise + K.slopeK * clamp(s, -0.6, 1.2), acc = K.acc;
    const si = done ? -1 : T.streams.findIndex(q => r.x >= q.x0 && r.x <= q.x1);
    if (si >= 0) {
      r.inStream = true; vt += K.streamAdd; acc = K.accFast;
      if (r.streamN !== si) { r.streamN = si; vdSurfPop(ph, k, r.x, r.y - 60, 'Zoom!', '#fff1a8', 20); Sfx.play('vdSurfZoom', k); vdSurfHint(st, k, 'stream', 'Gold stream: zoom!', 2); }
    }
    if (r.boost > 0) { vt += K.boostAdd; acc = K.accFast; }
    if (r.lean > 0) vt += K.leanAdd;
    if (r.lean < 0) vt *= K.slowK;
    if (r.wob > 0) vt *= K.wobK;
    if (done) vt = 160;
    // (in the air the slab keeps the ride it had: a hop costs next to nothing)
    r.vtG = K.cruise + K.slopeK * clamp(s, -0.6, 1.2) + (r.lean > 0 ? K.leanAdd : 0);
    if (r.lean < 0) r.vtG *= K.slowK;
    const a = r.v < vt ? acc : r.lean < 0 || done ? K.brake : K.decay;
    r.v = clamp(approach(r.v, vt, a * dt), done ? 0 : K.vMin, K.vMax);
    if (r.buf > 0 && r.push >= K.push && r.wob <= 0 && !done) vdSurfJump(st, r, r.vy);
    else {
      const x0 = r.x, y0 = r.y, vy0 = r.vy;
      r.x += r.v * dt;
      const ny = vdSurfGround(T, r.x), by = y0 + vy0 * dt + 0.5 * K.g * dt * dt;
      for (const q of T.kick) if (x0 < q.lip && r.x >= q.lip) { r.lipK = q; r.lipT = 0; }
      if (ny > by) { r.air = true; r.airT = 0; r.jumped = false; r.soft = true; r.airMax = 0; r.airN++; r.y = by; r.vy = vy0 + K.g * dt; }
      else { r.y = ny; r.vy = (ny - y0) / dt; }
      r.tilt = approach(r.tilt, Math.atan(s), dt * 4);
      if ((r.sprayT -= dt) <= 0 && r.v > 120) {
        r.sprayT = 0.035;
        vdSurfPart(ph, k, r.x - 34, r.y - 2, -r.v * 0.25 - vdSurfVR() * 60, -60 - vdSurfVR() * 110, 0.45, r.inStream || r.boost > 0 ? '#fff1a8' : vdSurfVR() < 0.5 ? '#ffc04d' : '#ff8a3d', 2.4 + vdSurfVR() * 1.6, 700);
      }
    }
  } else {
    // a coyote jump (just off an edge without jumping): still counts, and still pops off a ramp lip
    if (r.buf > 0 && !r.jumped && r.airT < K.coyote && r.wob <= 0 && !done) vdSurfJump(st, r, Math.min(r.vy, 0));
    r.airT += dt;
    r.vy += K.g * dt;
    const vtA = (r.vtG || K.cruise) + (r.boost > 0 ? K.boostAdd : 0);
    r.v = r.v < vtA && !done ? Math.min(vtA, r.v + (r.boost > 0 ? K.accFast : K.acc) * K.airK * dt) : Math.max(K.vMin, r.v - K.airDrag * dt);
    r.x += r.v * dt; r.y += r.vy * dt;
    const want = Math.atan2(r.vy, Math.max(120, r.v)) * 0.6;
    r.tilt = approach(r.tilt, want, dt * 3);
    if (r.airT > 0.12 && !r.soft) r.airMax = Math.max(r.airMax, r.airT);
    // tricks in the air
    if (act && !r.trick && r.wob <= 0 && !r.tossAir && !done) {
      const kind = VDSURF_TRICKS[(r.tricks + r.trickN + k) % 3];
      r.trick = { u: 0, kind: kind[0], word: kind[1], short: vdSurfLandIn(T, r, 1) < K.trickT * 0.7 };   // (short: a plain hop, far too little air)
      Sfx.play('vdSurfSwish', k);
    }
    if (r.trick) {
      r.trick.u += dt / (K.trickT * (hp ? K.help.trick : 1));
      if (r.trick.u >= 1) {
        r.tricks++; r.trickN++;
        r.boost = Math.max(r.boost, K.trickBoost * (hp ? K.help.boost : 1));
        vdSurfPop(ph, k, r.x, r.y - 70, r.trickN > 1 ? (r.trickN === 2 ? 'Double ' : 'Triple ') + r.trick.word.toLowerCase() : r.trick.word, C.gold, 24);
        for (let n = 0; n < 8; n++) vdSurfPart(ph, k, r.x, r.y - 20, -100 + vdSurfVR() * 200, -100 + vdSurfVR() * 120, 0.5, n % 2 ? C.gold : '#ffffff', 3, 200, 'spark');
        Sfx.play('vdSurfTrick', k);
        if (ph.stat) ph.stat.tricks[k]++;
        r.trick = null;
      }
    }
    // a hint for the first big air
    if (!done && !r.trick && !r.tossAir && r.airT > 0.05 && !ph.hinted[k].trick && vdSurfLandIn(T, r, 1.5) > K.trickT + 0.12) vdSurfHint(st, k, 'trick', 'Quick, ' + vdKey(k, 'act') + ': a trick!', 2.2);
    const gy = vdSurfGround(T, r.x);
    if (r.y >= gy) vdSurfLand(st, r, gy);
  }
  if (!done) vdSurfHazards(st, r, dt);
}
function vdSurfHazards(st, r, dt) {
  const K = VDSURF, ph = st.ph, T = ph.T, k = r.k;
  // rocks
  T.rocks.forEach((rk, i) => {
    if (ph.rockHit[k][i] || Math.abs(r.x - rk.x) > rk.w / 2 + K.slabHalf) return;
    const top = vdSurfGround(T, rk.x) - rk.h;
    if (r.y <= top + 3) return;
    ph.rockHit[k][i] = true; r.hits++; if (ph.stat) ph.stat.hits[k]++;
    r.v *= K.rockMul; r.trick = null; r.wob = K.rockWob;
    if (!r.air) { r.air = true; r.airT = 0.1; r.jumped = true; r.soft = false; }
    r.vy = Math.min(r.vy, -330);
    vdSurfPop(ph, k, rk.x, top - 30, 'Bonk!', '#ffffff', 22);
    for (let n = 0; n < 9; n++) vdSurfPart(ph, k, rk.x, top + 10, -60 + vdSurfVR() * 260, -160 - vdSurfVR() * 220, 0.9, n % 3 ? '#4d4453' : '#ff9a4d', 3 + vdSurfVR() * 4, 1200, 'rock');
    Sfx.play('vdSurfBonk', k); rumble(k, 0.5, 0.3, 140);
    if (r.hits === 2 && !ph.hinted[k].rock2) vdSurfHint(st, k, 'rock2', 'Hop ' + vdKey(k, 'jump') + ' just before a rock!');
  });
  // lava waves: each surfer's own, started as they come near, rolling up the river
  T.waves.forEach((w, i) => {
    if (!ph.waveOn[k][i] && r.x >= w.x - K.waveTrig) { ph.waveOn[k][i] = true; ph.waves[k].push({ i, x: w.x, A: w.A, t: 0, past: false, hit: false }); Sfx.play('vdSurfRumble', k); }
  });
  for (const w of ph.waves[k]) {
    if (w.past) continue;
    if (r.x >= w.x) {
      w.past = true;
      const crest = vdSurfGround(T, w.x) - w.A * Math.min(1, w.t / 0.5);
      if (r.y > crest + 4) {
        w.hit = true; r.splash++; r.v *= K.waveMul; r.trick = null; r.wob = K.rockWob;
        r.air = true; r.airT = 0.1; r.jumped = true; r.soft = false; r.vy = Math.min(r.vy, -300);
        vdSurfPop(ph, k, w.x, crest - 30, 'Sploosh!', '#ffd27a', 22);
        for (let n = 0; n < 12; n++) vdSurfPart(ph, k, w.x, crest, -120 + vdSurfVR() * 240, -200 - vdSurfVR() * 200, 0.7, n % 2 ? '#ffc04d' : '#ff7a1f', 3 + vdSurfVR() * 3, 1100);
        Sfx.play('vdSurfSplash', k);
      } else if (r.jumped && ph.t - r.lastJumpT > 0.1 && ph.t - r.lastJumpT < 0.42) {
        r.boost = Math.max(r.boost, K.waveBoost * (ph.help[k] ? K.help.boost : 1));
        vdSurfPop(ph, k, w.x, crest - 34, 'Wave hop!', C.gold, 20); Sfx.play('vdSurfPop', k);
      }
    }
  }
  // geysers on their beat
  for (const g of T.geys) {
    if (Math.abs(r.x - g.x) > K.geyW + K.slabHalf * 0.6) continue;
    const s = vdSurfGey(ph, g);
    if (s.on !== 'erupt' || g['hit' + k] === s.n) continue;
    if (r.y < vdSurfGround(T, g.x) - vdSurfGeyH(s.u) + 6) continue;
    g['hit' + k] = s.n; r.toss++; if (ph.stat) ph.stat.hits[k]++;
    r.v *= K.geyMul; r.trick = null; r.hotT = 1;
    r.air = true; r.airT = 0.1; r.jumped = true; r.soft = false; r.vy = -K.geyToss; r.tossAir = true;   // (no tricks on a toss: a hit never pays)
    vdSurfPop(ph, k, g.x, r.y - 70, 'Hot foot!', '#ffd27a', 22);
    Sfx.play('vdToasty', k); rumble(k, 0.5, 0.3, 140);
  }
  // first-time hints as each kind of thing comes into view
  const near = (x, d) => x > r.x && x - r.x < d;
  if (!ph.hinted[k].rock && T.rocks.some(q => near(q.x, 560))) vdSurfHint(st, k, 'rock', 'Hop ' + vdKey(k, 'jump') + ' over the rock!');
  if (!ph.hinted[k].kick && T.kick.some(q => near(q.x0, 380))) vdSurfHint(st, k, 'kick', 'Hop ' + vdKey(k, 'jump') + ' at the gold edge: POP!');
  if (!ph.hinted[k].wave && ph.waves[k].some(w => !w.past && w.x - r.x < 620)) vdSurfHint(st, k, 'wave', 'Hop the lava wave!');
  if (!ph.hinted[k].gey && T.geys.some(q => near(q.x, 640))) vdSurfHint(st, k, 'gey', 'Geyser! Hold ' + vdKey(k, 'left') + ' to wait for it', 3.2);
}

/* ---------- the race flow: card (3-2-1) -> live -> fin -> next card | crown ---------- */
function vdSurfNewRace(st, replay) {
  const K = VDSURF, ph = st.ph;
  const ti = replay ? ph.ti : Math.min(ph.raceN - 1, VDSURF_TRACKS.length - 1);
  ph.ti = ti; ph.T = vdSurfTrack(ti);
  ph.state = 'card'; ph.cardT = 0; ph.t = 0; ph.clock = 0; ph.end = null; ph.endT = 0; ph.go = 0;
  ph.R = [vdSurfRacer(0), vdSurfRacer(1)];
  for (const r of ph.R) { r.y = vdSurfGround(ph.T, 0); }
  ph.rockHit = [ph.T.rocks.map(() => false), ph.T.rocks.map(() => false)];
  ph.waveOn = [ph.T.waves.map(() => false), ph.T.waves.map(() => false)];
  ph.waves = [[], []];
  for (const g of ph.T.geys) { delete g.hit0; delete g.hit1; }
  ph.help = [0, 1].map(k => (ph.wins[1 - k] > ph.wins[k] ? 1 : 0));
  ph.replay = !!replay;
  ph.cam = [0, 1].map(k => ({ x: -K.riderX, y: vdSurfCamY(ph, ph.R[k], 0) }));
  ph.parts = []; ph.pops = [];
  ph.stat = { tricks: [0, 0], pops: [0, 0], hits: [0, 0] };
  ph.limit = ph.T.len / K.cruise * K.limitK + 10;
  ph.cheer = [0, 0];
  if (ph.help.some(Boolean)) {
    const h = ph.help[0] ? 0 : 1;
    vdHelp(st, 'Gold slab for ' + vdSurfName(h) + ': a wider POP edge, quicker tricks!', { id: h, hint: 'Gold slab!', life: 4.5 });
  }
  Sfx.play('vdSurfCard');
}
function vdSurfSayCard(st) {
  const ph = st.ph;
  if (ph.replay) vdSay(st, 'A tie?! Again, again!', 2.6);
  else vdSay(st, ph.T.say, 2.8);
}
function vdSurfCamY(ph, r, y0) {
  const K = VDSURF, T = ph.T, gy = vdSurfGround(T, r.x);
  let cy = 0.5 * gy + 0.5 * vdSurfGround(T, r.x + 420) - 140;
  const feet = Math.min(r.y, gy);
  cy = clamp(cy, feet - K.feetHi, feet - K.feetLo);
  return y0 == null ? cy : cy;
}
function vdSurfCams(st, dt, snap) {
  const K = VDSURF, ph = st.ph;
  for (const k of [0, 1]) {
    const r = ph.R[k], c = ph.cam[k];
    c.x = Math.min(r.x, ph.T.len + 260) - K.riderX;
    const want = vdSurfCamY(ph, r);
    c.y = snap ? want : c.y + (want - c.y) * Math.min(1, dt * 5);
    // never let the rider leave the lane
    c.y = clamp(c.y, r.y - (K.laneH - 34), r.y - 76);
  }
}
// particles, pops, the background dragon
function vdSurfFx(st, dt) {
  const ph = st.ph;
  for (let i = ph.parts.length - 1; i >= 0; i--) {
    const q = ph.parts[i];
    q.life -= dt;
    if (q.life <= 0) { ph.parts.splice(i, 1); continue; }
    q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt;
  }
  for (let i = ph.pops.length - 1; i >= 0; i--) { ph.pops[i].t += dt; if (ph.pops[i].t > ph.pops[i].life) ph.pops.splice(i, 1); }
  for (const w of ph.waves[0].concat(ph.waves[1])) { w.t += dt; w.x -= VDSURF.waveV * dt; }
  for (const k of [0, 1]) ph.waves[k] = ph.waves[k].filter(w => w.t < 9 && w.x > ph.R[k].x - 700);
  ph.cheer = ph.cheer.map(c => Math.max(0, c - dt));
  for (const c of ph.bgC) { c.t += dt; c.actT += dt; }
}
// the engine players mirror each surfer's screen spot (hint bubbles, the computer's bubbles, name tags on the card)
function vdSurfMirror(st) {
  const K = VDSURF, ph = st.ph;
  if (!ph.R) return;
  if (ph.state === 'crown') { vdSurfCrownPlace(st); return; }
  for (const p of G.players) {
    const r = ph.R[p.id], c = ph.cam[p.id];
    p.w = PW; p.h = PH;
    p.x = r.x - c.x - PW / 2; p.y = K.laneY[p.id] + (r.y - c.y) - 7 * K.RS - PH * K.RS;
    p.vx = 0; p.vy = 0; p.alive = true; p.face = 1; p.grounded = !r.air; p.stun = 0; p.knockT = 0; p.sx = 1; p.sy = 1;
  }
}
function vdSurfFinish(st, crossed) {
  const ph = st.ph, [a, b] = ph.R;
  ph.state = 'fin'; ph.endT = 0;
  Sfx.play('vdSurfFinish');
  if (crossed.length === 2 && Math.abs(a.fin - b.fin) < VDSURF.tieEps) { vdSurfTie(st, 'Dead heat!'); return; }
  const w = crossed.length === 2 ? (a.fin < b.fin ? 0 : 1) : crossed[0].k, L = ph.R[1 - w], R = ph.R[w];
  const lt = L.fin != null ? L.fin : ph.t + (ph.T.len - L.x) / Math.max(150, L.v);
  const m = Math.max(0.01, lt - R.fin);
  vdSurfResult(st, w, m < 0.1 ? 'by ' + m.toFixed(2) + ' s! Photo finish!' : m < 1 ? 'by ' + m.toFixed(1) + ' s!' : 'by ' + m.toFixed(1) + ' s');
}
// A tie (a dead heat, or neck and neck at the bell): replay the track. A 2nd tie in a row is settled: more tricks,
// else more POPs, else fewer bumps, else (two surfers who did exactly the same, e.g. both only holding ▶) Cinder's
// lucky coin, announced, so a tie can never replay forever.
function vdSurfTie(st, word) {
  const ph = st.ph, [a, b] = ph.R;
  ph.ties++;
  if (ph.ties >= 2) {
    const hits = q => q.hits + q.splash + q.toss;
    if (a.tricks !== b.tricks) { vdSurfResult(st, a.tricks > b.tricks ? 0 : 1, 'More tricks wins the tie!'); return; }
    if (a.pops !== b.pops) { vdSurfResult(st, a.pops > b.pops ? 0 : 1, 'More POPs wins the tie!'); return; }
    if (hits(a) !== hits(b)) { vdSurfResult(st, hits(a) < hits(b) ? 0 : 1, 'Fewer bumps wins the tie!'); return; }
    const w = vdRand() < 0.5 ? 0 : 1;
    vdSay(st, 'Tie again?! My lucky coin says... ' + vdSurfName(w) + '!', 2.6);
    vdSurfResult(st, w, 'Cinder\'s lucky coin!');
    return;
  }
  ph.end = { w: -1, reason: word };
  vdNews(st, word + ' Race again!', false, 2.6);
  vdSay(st, word === 'Dead heat!' ? 'Exactly the same?! Wow!' : 'So close! Again!', 2);
}
function vdSurfResult(st, w, reason) {
  const ph = st.ph, s = vdStats(st), R = ph.R[w];
  ph.ties = 0;
  ph.wins[w]++;
  ph.end = { w, reason };
  ph.cheer[w] = 3;
  s.wins = ph.wins.slice();
  s.races = s.races || [];
  s.races.push({ track: ph.T.name, w, t: R.fin != null ? Math.round(R.fin * 10) / 10 : null });
  for (const key of ['tricks', 'pops', 'hits']) { s[key] = s[key] || [0, 0]; for (const k of [0, 1]) s[key][k] += ph.stat[key][k]; }
  s.best = s.best || [null, null];
  for (const q of ph.R) if (q.fin != null && (s.best[q.k] == null || q.fin < s.best[q.k])) s.best[q.k] = Math.round(q.fin * 10) / 10;
  const champ = ph.wins[w] >= VDSURF.win;
  vdNews(st, vdSurfName(w) + ' wins race ' + ph.raceN + '!' + (champ ? '' : '  ' + NAMES[0] + ' ' + ph.wins[0] + ' - ' + ph.wins[1] + ' ' + NAMES[1]), false, 2.8);
  Sfx.play('vdSurfWin', w);
  if (champ) { s.champ = w; }
}
function vdSurfAfter(st) {
  const ph = st.ph;
  if (ph.end && ph.end.w < 0) { vdSurfNewRace(st, true); return; }
  ph.raceN++;
  if (ph.wins[0] >= VDSURF.win || ph.wins[1] >= VDSURF.win) { vdSurfCrownStart(st); return; }
  vdSurfNewRace(st, false);
}
function vdSurfBell(st) {
  const ph = st.ph, [a, b] = ph.R, d = a.x - b.x;
  ph.state = 'fin'; ph.endT = 0;
  if (Math.abs(d) < 6) { vdSurfTie(st, 'Neck and neck!'); return; }
  vdSurfResult(st, d > 0 ? 0 : 1, 'furthest down the river!');
}

/* ---------- the crowning ---------- */
function vdSurfCrownStart(st) {
  const ph = st.ph, c = st.cinder, w = ph.end.w;
  ph.state = 'crown'; ph.crT = 0; ph.champ = w; ph.crownSaid = 0;
  Object.assign(c, { hidden: false, alpha: 1, x: W / 2 + 170, y: 200, s: 0.72, face: -1, pose: 'fly', air: true, mood: 'happy', baseMood: 'happy', gy: 456, lava: null, sayAt: null, act: null });
  st.hints = [null, null]; st.news = null;
  vdCelebrate(st, VDSURF.crownT + 1);
  vdSurfCrownPlace(st);
  Sfx.play('vdSurfCrown');
}
function vdSurfCrownPlace(st) {
  const ph = st.ph, w = ph.champ, t = ph.crT;
  for (const p of G.players) {
    p.w = PW; p.h = PH; p.alive = true; p.vx = 0; p.stun = 0; p.knockT = 0;
    const champ = p.id === w;
    const fx = champ ? W / 2 - 40 : W / 2 - 190, fy = champ ? 392 : 456;
    const hop = champ ? (t > 2.2 ? Math.abs(Math.sin((t - 2.2) * 6)) * 18 : 0) : Math.abs(Math.sin(t * 5 + 1)) * 12;
    p.x = fx - PW / 2; p.y = fy - PH - hop; p.vy = hop > 1 ? -100 : 0;
    p.face = champ ? 1 : 1; p.grounded = hop < 1; p.sx = 1; p.sy = 1;
  }
}
function vdSurfCrownStep(st, dt) {
  const ph = st.ph, c = st.cinder, K = VDSURF, w = ph.champ;
  ph.crT += dt;
  const t = ph.crT;
  // he flies down beside the podium, holds up the crown, pops it on the champ, then cheers
  const tx = W / 2 + 120, ty = 456;
  if (t < 1.2) { const u = t / 1.2, e = 1 - (1 - u) * (1 - u); c.x = W / 2 + 330 - 210 * e; c.y = 210 + (ty - 210) * e; c.air = true; c.pose = 'fly'; }
  else { c.x = tx; c.y = ty; c.air = false; c.pose = t < 2.4 ? 'hug' : 'cheer'; }
  c.look = { x: W / 2 - 40, y: 360 };
  if (ph.crownSaid === 0 && t > 0.3) { ph.crownSaid = 1; vdSay(st, 'Surf champ: ' + vdSurfName(w) + '! Here is your crown!', 2.4); }
  if (ph.crownSaid === 1 && t > 2.2) { ph.crownSaid = 2; Sfx.play('vdCheer'); for (let n = 0; n < 6; n++) confetti(W / 2 - 40 + (n - 2.5) * 30, 300); }
  if (t > 2.2 && (G.tickN % 10) === 0) confetti(120 + vdRand() * (W - 240), 60 + vdRand() * 60);
  vdSurfCrownPlace(st);
  if (t >= K.crownT) {
    const s = vdStats(st); s.champ = w;
    vdPhaseDone(st, { say: 'Woohoo! ' + vdSurfName(w) + ' is the Surf champ! Best race EVER!' });
  }
}
// where the crown is: floating from his hands to the champ's head (screen)
function vdSurfCrownAt(st) {
  const ph = st.ph, t = ph.crT, p = G.players[ph.champ], hx = p.x + p.w / 2, hy = p.y - 6;
  const P = vdCinderPts(st.cinder), from = { x: P.mouth.x - 20, y: P.top.y - 4 };
  if (t < 1.6) return { x: from.x, y: from.y, s: 1 };
  const u = clamp((t - 1.6) / 0.6, 0, 1), e = u * u * (3 - 2 * u);
  return { x: from.x + (hx - from.x) * e, y: from.y + (hy - from.y) * e - Math.sin(e * Math.PI) * 70, s: 1 };
}

/* ---------- the phase ---------- */
VD_PHASES.surf = {
  setup(st, L) {
    const ph = st.ph, c = st.cinder;
    Object.assign(c, { hidden: true, mood: 'happy', baseMood: 'happy', pose: 'surf', s: 0.6, face: 1, air: false, gy: null, lava: null, x: -999, y: -999 });
    ph.wins = [0, 0]; ph.raceN = 1; ph.ties = 0; ph.ti = 0;
    ph.hinted = [{}, {}];
    ph.bgC = [0, 1].map(k => Object.assign(vdNewCinder(), { pose: 'surf', mood: 'happy', baseMood: 'happy', s: 0.26, face: 1, t: k * 1.3 }));
    st.cam = { x: 0, y: 0 };
    vdSurfNewRace(st, false);
    vdSurfCams(st, 0, true);
    c.sayAt = vdSurfSayAt(st);
    vdSurfMirror(st);
    void L;
  },
  wait(st, dt) { vdSurfFx(st, dt); vdSurfMirror(st); },
  coast(st, dt) { vdSurfFx(st, dt); vdSurfMirror(st); },
  step(st, dt) {
    const ph = st.ph, K = VDSURF;
    st.cam.x = 0; st.cam.y = 0;
    if (ph.state === 'crown') { st.idle = false; st.idleT = 0; vdSurfCrownStep(st, dt); return; }   // (a cutscene: no idle nagging over it)
    st.cinder.sayAt = vdSurfSayAt(st);
    if (st.idle) { for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; } vdSurfMirror(st); return; }   // Cinder waits
    ph.clock += dt;
    if (ph.state === 'card') {
      for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
      const was = ph.cardT;
      if (G.introT <= 0) ph.cardT += dt;   // (race 1: the race card waits for the phase card to go)
      if (was < 0.15 && ph.cardT >= 0.15) vdSurfSayCard(st);
      for (const n of [1, 2, 3]) if (was < K.cardT - n && ph.cardT >= K.cardT - n) Sfx.play('vdSurfBeep');
      if (ph.cardT >= K.cardT) {
        ph.state = 'live'; ph.go = 1; Sfx.play('vdSurfGo');
        if (ph.raceN === 1 && !ph.replay) for (const k of [0, 1]) vdSurfHint(st, k, 'go', 'Hold ' + vdKey(k, 'right') + ' to surf fast!', 3);
      }
    } else if (ph.state === 'live') {
      ph.t += dt; ph.go = Math.max(0, ph.go - dt);
      const crossed = [];
      for (const r of ph.R) {
        const x0 = r.x;
        vdSurfRide(st, r, G.players[r.k], dt);
        if (r.fin == null && r.x >= ph.T.len) { r.fin = ph.t - dt + clamp(r.x > x0 ? (ph.T.len - x0) / (r.x - x0) : 1, 0, 1) * dt; crossed.push(r); }
      }
      if (crossed.length) vdSurfFinish(st, crossed);
      else if (ph.t >= ph.limit) vdSurfBell(st);
    } else if (ph.state === 'fin') {
      ph.t += dt; ph.endT += dt;
      for (const r of ph.R) {
        const x0 = r.x;
        vdSurfRide(st, r, G.players[r.k], dt);
        if (r.fin == null && r.x >= ph.T.len) { r.fin = ph.t - dt + clamp(r.x > x0 ? (ph.T.len - x0) / (r.x - x0) : 1, 0, 1) * dt; r.place = 2; }
      }
      if (ph.endT >= K.endT) vdSurfAfter(st);
    }
    vdSurfFx(st, dt);
    if (ph.state !== 'crown') vdSurfCams(st, dt);
    vdSurfMirror(st);
  },
  busy: () => true,       // (no shared attacks here)
  labels: () => ['trick', 'trick'],
  legend: () => ({ jump: 'hop', down: 'slow', padJump: 'hop', padDown: 'down slows' }),
  roles: () => null,
  hudText(st) { const ph = st.ph; return ph.state === 'crown' ? 'Champ!' : 'Race ' + ph.raceN + (ph.replay ? ' again' : ''); },
  progress(st) { const ph = st.ph; return { n: ph.wins[0] + ph.wins[1], of: 3 }; },
  headLift: () => 0,
  drawBack(st) { vdSurfDrawBack(st); },
  draw(st) {
    // the engine draws the players between draw() and drawTop(): hidden for that moment (the lanes drew them)
    const ph = st.ph;
    if (ph.state === 'crown') return;
    ph.hid = G.players.map(p => p.alive);
    for (const p of G.players) p.alive = false;
  },
  drawTop(st) {
    const ph = st.ph;
    if (ph.hid) { G.players.forEach((p, i) => { p.alive = ph.hid[i]; }); ph.hid = null; }
    if (ph.state === 'crown') vdSurfDrawCrown(st);
  },
  hud(st) { vdSurfHud(st); },
  statLine(st) {
    const s = st.stats.surf;
    if (!s || s.champ == null) return '';
    return 'Surf champ: ' + NAMES[s.champ] + (s.wins ? ' (' + Math.max(s.wins[0], s.wins[1]) + '-' + Math.min(s.wins[0], s.wins[1]) + ')' : '');
  },
};
// where Cinder's speech bubble points (he is not drawn big during the races): the card's dragon, else the divider
function vdSurfSayAt(st) {
  const ph = st.ph;
  if (ph.state === 'card') { const B = vdSurfCardBox(); return { x: B.x0 + 40, y: B.y0 + B.h + (B.big ? 34 : 26), r: 6 }; }   // (under the card: above it the news line and the card itself would cover it)
  const c = ph.bgC && ph.bgC[0];
  return c ? { x: c.x, y: VDSURF.laneY[0] + c.y - 30, r: 14 } : { x: W / 2, y: VDSURF.laneY[1] - 2, r: 8 };
}

/* ---------- drawing: lanes ---------- */
let vdSurfSkyG = null, vdSurfLavaG = null;
function vdSurfDrawBack(st) {
  const ph = st.ph;
  if (!ph.R) return;
  if (ph.state === 'crown') { vdSurfDrawCrownBack(st); return; }
  for (const k of [0, 1]) vdSurfDrawLane(st, k);
  // the divider between the lanes and the band over the top lane
  const K = VDSURF;
  ctx.fillStyle = '#2a1424'; ctx.fillRect(0, K.laneY[0] + K.laneH, W, K.laneY[1] - K.laneY[0] - K.laneH);
  ctx.fillStyle = 'rgba(255,138,61,0.55)'; ctx.fillRect(0, K.laneY[0] + K.laneH + 1, W, 1.5);
  ctx.fillStyle = '#2a1424'; ctx.fillRect(0, K.laneY[1] + K.laneH, W, H - K.laneY[1] - K.laneH);
  vdSurfDrawTopBand(st);
}
// the band above the lanes (behind the HUD pills): dusky sky with the peak's smoke
function vdSurfDrawTopBand(st) {
  const K = VDSURF, t = G.clock;
  const g = ctx.createLinearGradient(0, 0, 0, K.laneY[0]);
  g.addColorStop(0, '#2c1230'); g.addColorStop(1, '#5a2340');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, K.laneY[0]);
  for (let i = 0; i < 7; i++) {
    const u = (t * 0.05 + i / 7) % 1, x = (i * 173 + t * 12) % (W + 120) - 60;
    ctx.fillStyle = `rgba(120,80,110,${0.25 * Math.sin(u * Math.PI)})`; circle(x, 30 + (i % 3) * 14, 22 + 14 * u); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,138,61,0.65)'; ctx.fillRect(0, K.laneY[0] - 2, W, 2);
}
function vdSurfDrawLane(st, k) {
  const K = VDSURF, ph = st.ph, T = ph.T, cam = ph.cam[k], r = ph.R[k], o = ph.R[1 - k], y0 = K.laneY[k], LH = K.laneH, t = G.clock;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, y0, W, LH); ctx.clip();
  ctx.translate(0, y0);
  vdSurfDrawSky(st, k, cam);
  ctx.save(); ctx.translate(-cam.x, -cam.y);
  const X0 = cam.x - 40, X1 = cam.x + W + 40;
  // start and finish arches (behind the river)
  vdSurfDrawArch(T, 40, 'START', X0, X1, false);
  vdSurfDrawArch(T, T.len, 'FINISH', X0, X1, true);
  // the river
  vdSurfDrawRiver(st, k, cam, X0, X1);
  // geyser vents and spouts
  for (const g of T.geys) if (g.x > X0 - 60 && g.x < X1 + 60) vdSurfDrawGeyser(st, g, k, r);
  // rock ramps
  for (const q of T.kick) if (q.lip > X0 && q.x0 < X1) vdSurfDrawKick(st, q, k);
  // rocks
  T.rocks.forEach((rk, i) => { if (!ph.rockHit[k][i] && rk.x > X0 - 40 && rk.x < X1 + 40) vdSurfDrawRock(T, rk); });
  // this surfer's lava waves
  for (const w of ph.waves[k]) if (w.x > X0 - 120 && w.x < X1 + 120) vdSurfDrawWave(T, w);
  // the other surfer, a faded ghost (smaller when right on top of you)
  if (o.x > X0 - 60 && o.x < X1 + 60) {
    const apart = clamp((Math.abs(o.x - r.x) - 16) / 50, 0, 1);
    vdSurfDrawRider(st, o, o.x, o.y - 12, { alpha: 0.18 + 0.27 * apart, s: K.RS * 0.85, ghost: true, tag: apart > 0.6 });
  }
  vdSurfDrawRider(st, r, r.x, r.y, { alpha: 1, s: K.RS });
  // particles
  for (const q of ph.parts) {
    if (q.k !== k || q.x < X0 || q.x > X1) continue;
    const a = clamp(q.life / q.max, 0, 1);
    ctx.globalAlpha = a;
    if (q.kind === 'spark') { vdStar(q.x, q.y, q.size * 1.6, q.col); }
    else if (q.kind === 'rock') { ctx.fillStyle = q.col; ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(q.x - q.size, q.y); ctx.lineTo(q.x, q.y - q.size); ctx.lineTo(q.x + q.size, q.y + q.size * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else { ctx.fillStyle = q.col; circle(q.x, q.y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  // pop words (lane coords, kept inside the lane)
  const big = vdBig();
  for (const q of ph.pops) {
    if (q.k !== k) continue;
    const u = q.t / q.life, x = clamp(r.x - cam.x + 34 + u * 10, 120, W - 90), y = clamp(r.y - cam.y - 78 - u * 24, big ? 52 : 46, LH - 20);
    ctx.globalAlpha = clamp((1 - u) / 0.3, 0, 1);
    bigText(q.s, x, y, q.size * (big ? 1.35 : 1), q.col, 1 + 0.3 * Math.max(0, 1 - q.t / 0.12));
  }
  ctx.globalAlpha = 1;
  // the finish: "1st!" over the winner's lane
  if (ph.end && ph.end.w >= 0 && (ph.state === 'fin')) {
    const won = ph.end.w === k, a = clamp(ph.endT / 0.25, 0, 1);
    ctx.globalAlpha = a;
    if (won) bigText(vdSurfName(k) + ' wins!', W / 2 + 60, big ? 82 : 72, big ? 52 : 40, C.gold, 0.9 + 0.15 * Math.max(0, 1 - ph.endT / 0.3));
    else bigText(r.fin != null ? '2nd' : 'Keep going!', W / 2 + 60, big ? 76 : 68, big ? 34 : 26, '#ffd9c2', 1);
    ctx.globalAlpha = 1;
  }
  if (ph.end && ph.end.w < 0 && ph.state === 'fin') bigText(ph.end.reason, W / 2 + 60, big ? 80 : 70, big ? 44 : 34, C.gold, 1);
  // GO!
  if (ph.state === 'live' && ph.go > 0) { ctx.globalAlpha = clamp(ph.go / 0.3, 0, 1); bigText('GO!', W / 2, LH / 2 - 10, big ? 64 : 52, C.gold, 1 + 0.4 * (ph.go)); ctx.globalAlpha = 1; }
  // the lane's edge in its player's colour
  ctx.fillStyle = PCOL[k]; ctx.fillRect(0, 0, 5, LH);
  ctx.restore();
}
// the sunset sky of one lane: far ridges, the peak behind you, Cinder surfing a far lava stream, near cliffs
function vdSurfDrawSky(st, k, cam) {
  const K = VDSURF, LH = K.laneH, t = G.clock, ph = st.ph;
  if (!vdSurfSkyG) { vdSurfSkyG = ctx.createLinearGradient(0, 0, 0, LH); vdSurfSkyG.addColorStop(0, '#4a1f45'); vdSurfSkyG.addColorStop(0.6, '#c8504a'); vdSurfSkyG.addColorStop(1, '#ff9a55'); }
  ctx.fillStyle = vdSurfSkyG; ctx.fillRect(0, 0, W, LH);
  ctx.fillStyle = 'rgba(255,214,150,0.85)'; circle(780, 46, 24); ctx.fill();
  ctx.fillStyle = 'rgba(255,170,110,0.25)'; circle(780, 46, 40); ctx.fill();
  const dy = clamp(-cam.y * 0.04, -40, 40);
  // the peak you came down from, drifting away to the left as you race
  const px = 260 - cam.x * 0.035, py = 40 + dy;
  if (px > -320) {
    ctx.fillStyle = '#6b2f3a';
    ctx.beginPath(); ctx.moveTo(px - 300, LH); ctx.lineTo(px - 46, py); ctx.lineTo(px + 46, py); ctx.lineTo(px + 300, LH); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,140,60,0.7)'; ctx.beginPath(); ctx.ellipse(px, py, 46, 7, 0, 0, Math.PI * 2); ctx.fill();
    for (let n = 0; n < 4; n++) { const u = (t * 0.15 + n / 4) % 1; ctx.fillStyle = `rgba(110,90,110,${0.45 * (1 - u)})`; circle(px + Math.sin(u * 5 + n) * 20 + u * 50, py - 12 - u * 70, 12 + u * 22); ctx.fill(); }
    // its lava glow streak (the river you are on)
    ctx.strokeStyle = 'rgba(255,150,70,0.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px + 20, py + 6); ctx.quadraticCurveTo(px + 90, py + 60, px + 240, LH - 30); ctx.stroke();
  }
  // far ridges
  const off = cam.x * 0.08;
  ctx.fillStyle = '#5e2a33';
  ctx.beginPath(); ctx.moveTo(0, LH);
  for (let x = 0; x <= W + 20; x += 20) { const wx = x + off; ctx.lineTo(x, 110 + dy * 1.4 + Math.sin(wx * 0.006) * 18 + Math.sin(wx * 0.017 + 1) * 8); }
  ctx.lineTo(W, LH); ctx.closePath(); ctx.fill();
  // a far glowing lava stream on the ridge, and Cinder surfing it (cheering you on)
  const sy = 124 + dy * 1.4;
  ctx.strokeStyle = 'rgba(255,170,80,0.75)'; ctx.lineWidth = 2.5; ctx.beginPath();
  for (let x = 0; x <= W; x += 24) { const wx = x + off * 1.6; ctx.lineTo(x, sy + Math.sin(wx * 0.004) * 6); }
  ctx.stroke();
  const c = ph.bgC[k];
  if (c) {
    const live = ph.state === 'live' || ph.state === 'fin';
    c.x = live ? 560 + Math.sin(ph.clock * 0.33 + k * 2) * 250 : 760; c.y = sy - 2 + Math.sin((c.x + off * 1.6) * 0.004) * 6;
    c.pose = live ? 'surf' : 'wave'; c.face = 1;
    vdDrawCinder(c);
  }
  // near cliffs (basalt, with glowing seams)
  const off2 = cam.x * 0.3;
  ctx.fillStyle = '#3a1d2a';
  ctx.beginPath(); ctx.moveTo(0, LH);
  for (let x = 0; x <= W + 16; x += 16) { const wx = x + off2; ctx.lineTo(x, 150 + dy * 2.4 + Math.sin(wx * 0.011) * 14 + (hash(Math.floor(wx / 64), 5) % 13)); }
  ctx.lineTo(W, LH); ctx.closePath(); ctx.fill();
}
// the lava river from X0 to X1 (world coords), with its gold streams, flowing glints and crust
function vdSurfDrawRiver(st, k, cam, X0, X1) {
  const ph = st.ph, T = ph.T, t = G.clock, bot = cam.y + VDSURF.laneH + 10, step = 12;
  const pts = [];
  for (let x = Math.floor(X0 / step) * step; x <= X1 + step; x += step) pts.push([x, vdSurfBase(T, x) + Math.sin(x * 0.05 + t * 2.6) * 1.8]);
  const top = Math.min(...pts.map(q => q[1]));
  const g = ctx.createLinearGradient(0, top, 0, top + 180);
  g.addColorStop(0, VDC.lavaLt); g.addColorStop(0.25, VDC.lava); g.addColorStop(1, VDC.lavaDk);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(pts[0][0], bot);
  for (const q of pts) ctx.lineTo(q[0], q[1]);
  ctx.lineTo(pts[pts.length - 1][0], bot); ctx.closePath(); ctx.fill();
  // cooled crust plates drifting downstream
  for (let n = Math.floor((X0 - t * 60) / 160); n * 160 + t * 60 < X1 + 80; n++) {
    const x = n * 160 + t * 60 + (hash(n, 9) % 70), gy = vdSurfBase(T, x), d = 16 + (hash(n, 4) % 40);
    ctx.fillStyle = 'rgba(150,40,20,0.45)'; ctx.beginPath(); ctx.ellipse(x, gy + d, 20 + (hash(n, 2) % 16), 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  // glints flowing along the top
  ctx.strokeStyle = 'rgba(255,245,190,0.9)'; ctx.lineWidth = 2;
  for (let n = Math.floor((X0 - t * 140) / 90); n * 90 + t * 140 < X1 + 40; n++) {
    const x = n * 90 + t * 140 + (hash(n, 1) % 40), gy = vdSurfBase(T, x) + 6 + (hash(n, 6) % 10);
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + 14, gy + vdSurfSlope(T, x) * 14); ctx.stroke();
  }
  // the bright skin of the surface
  ctx.strokeStyle = 'rgba(255,240,170,0.9)'; ctx.lineWidth = 3; ctx.beginPath();
  for (const q of pts) ctx.lineTo(q[0], q[1]);
  ctx.stroke();
  // gold streams (with chevrons rushing downstream)
  for (const s of T.streams) {
    if (s.x1 < X0 || s.x0 > X1) continue;
    const a0 = Math.max(s.x0, X0), a1 = Math.min(s.x1, X1), pulse = 0.75 + 0.25 * Math.sin(t * 8);
    ctx.strokeStyle = `rgba(255,228,110,${0.85 * pulse})`; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath();
    for (let x = a0; x <= a1; x += 10) ctx.lineTo(x, vdSurfBase(T, x) + 4);
    ctx.stroke(); ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2.5;
    for (let x = s.x0 + ((t * 260) % 46); x < s.x1 - 8; x += 46) {
      if (x < X0 || x > X1) continue;
      const y = vdSurfBase(T, x) + 4;
      ctx.beginPath(); ctx.moveTo(x - 6, y - 4); ctx.lineTo(x, y); ctx.lineTo(x - 6, y + 4); ctx.stroke();
    }
  }
}
function vdSurfDrawArch(T, x, word, X0, X1, fin) {
  if (x + 120 < X0 || x - 120 > X1) return;
  const gy = vdSurfBase(T, x), t = G.clock, h = 118;
  // two basalt posts and a beam with a checkered banner
  for (const dx of [-58, 58]) {
    ctx.fillStyle = '#3b3540'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x + dx - 9, gy + 6); ctx.lineTo(x + dx - 7, gy - h); ctx.lineTo(x + dx + 7, gy - h); ctx.lineTo(x + dx + 9, gy + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(255,${160 + Math.round(Math.sin(t * 6 + dx) * 40)},70,0.95)`; circle(x + dx, gy - h - 6, 6); ctx.fill();
  }
  ctx.fillStyle = '#3b3540'; ctx.fillRect(x - 70, gy - h - 2, 140, 12); ctx.strokeStyle = C.ink; ctx.strokeRect(x - 70, gy - h - 2, 140, 12);
  const bw = 112, bh = 30, by = gy - h + 12;
  for (let i = 0; i < 14; i++) for (let j = 0; j < 4; j++) { ctx.fillStyle = (i + j) % 2 ? '#1c1a36' : '#ffffff'; ctx.fillRect(x - bw / 2 + i * 8, by + j * 7.5 + Math.sin(t * 3 + i * 0.5) * 1.5, 8, 7.5); }
  ctx.fillStyle = fin ? C.gold : '#ff8a3d'; rr(x - 40, by + 6, 80, 18, 6); ctx.fill();
  text(word, x, by + 15.5, 13, C.ink, 'center', 'body');
}
function vdSurfDrawKick(st, q, k) {
  const ph = st.ph, T = ph.T, t = G.clock, hk = ph.help[k] ? VDSURF.help.pop : 1;
  const b0 = vdSurfBase(T, q.x0), bl = vdSurfBase(T, q.lip);
  ctx.fillStyle = VDC.slab; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(q.x0 - 6, b0 + 8);
  for (let x = q.x0; x < q.lip; x += 8) ctx.lineTo(x, vdSurfGround(T, x));
  ctx.lineTo(q.lip, vdSurfGround(T, q.lip - 0.01)); ctx.lineTo(q.lip + 4, bl + 10); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = VDC.slabLt; ctx.lineWidth = 3; ctx.beginPath();
  for (let x = q.x0 + 10; x < q.lip - 4; x += 8) ctx.lineTo(x, vdSurfGround(T, x) + 3);
  ctx.stroke();
  // glowing cracks
  ctx.strokeStyle = `rgba(255,${150 + Math.round(Math.sin(t * 5 + q.x0) * 40)},60,0.9)`; ctx.lineWidth = 2;
  const my = (vdSurfGround(T, q.lip - 30) + bl) / 2;
  ctx.beginPath(); ctx.moveTo(q.lip - 40, my); ctx.lineTo(q.lip - 28, my + 8); ctx.lineTo(q.lip - 16, my + 2); ctx.stroke();
  // the gold POP edge
  const e0 = q.lip - VDSURF.popLen * hk, pulse = 0.7 + 0.3 * Math.sin(t * 9);
  ctx.strokeStyle = `rgba(255,197,61,${pulse})`; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath();
  for (let x = Math.max(q.x0, e0); x < q.lip - 2; x += 4) ctx.lineTo(x, vdSurfGround(T, x) - 2);
  ctx.stroke(); ctx.lineCap = 'butt';
  if (ph.help[k]) { ctx.fillStyle = 'rgba(255,240,170,0.9)'; vdStar(q.lip - 8, vdSurfGround(T, q.lip - 8) - 14 - Math.abs(Math.sin(t * 4)) * 4, 6, C.gold); }
}
function vdSurfDrawRock(T, rk) {
  const gy = vdSurfBase(T, rk.x), w = rk.w + 6, h = rk.h + 6, t = G.clock;
  ctx.fillStyle = VDC.slab; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(rk.x - w / 2, gy + 6);
  ctx.quadraticCurveTo(rk.x - w / 2 - 2, gy - h * 0.7, rk.x - w * 0.15, gy - h);
  ctx.quadraticCurveTo(rk.x + w * 0.3, gy - h - 3, rk.x + w / 2, gy - h * 0.45);
  ctx.lineTo(rk.x + w / 2 + 2, gy + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = VDC.slabLt; ctx.beginPath(); ctx.ellipse(rk.x - w * 0.18, gy - h * 0.72, w * 0.18, h * 0.12, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = `rgba(255,${150 + Math.round(Math.sin(t * 5 + rk.x) * 40)},60,0.9)`; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(rk.x - 4, gy - h * 0.5); ctx.lineTo(rk.x + 4, gy - h * 0.3); ctx.lineTo(rk.x + 1, gy - 4); ctx.stroke();
  // lava lapping at its foot
  ctx.strokeStyle = 'rgba(255,240,170,0.85)'; ctx.lineWidth = 2;
  const u = (t * 1.2 + rk.x * 0.01) % 1;
  ctx.beginPath(); ctx.ellipse(rk.x, gy + 1, w * (0.6 + u * 0.3), 3 + u * 2, 0, Math.PI, 0, true); ctx.stroke();
}
function vdSurfDrawWave(T, w) {
  const a = Math.min(1, w.t / 0.5), A = w.A * a, gy = vdSurfBase(T, w.x), t = G.clock;
  if (A < 1) return;
  // a swell rolling up the river (toward you): steep curling face on the left, long back on the right
  const g = ctx.createLinearGradient(0, gy - A, 0, gy + 10);
  g.addColorStop(0, VDC.lavaLt); g.addColorStop(1, VDC.lava);
  ctx.fillStyle = g; ctx.strokeStyle = 'rgba(160,40,20,0.8)'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w.x - 30, vdSurfBase(T, w.x - 30) + 2);
  ctx.quadraticCurveTo(w.x - 22, gy - A * 0.7, w.x - 8, gy - A);
  ctx.quadraticCurveTo(w.x + 16, gy - A * 1.08, w.x + 30, gy - A * 0.8);
  ctx.quadraticCurveTo(w.x + 70, gy - A * 0.3, w.x + 110, vdSurfBase(T, w.x + 110) + 2);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // the frothy lip curling forward
  ctx.fillStyle = '#fff1b0';
  ctx.beginPath(); ctx.moveTo(w.x - 10, gy - A - 1); ctx.quadraticCurveTo(w.x - 26, gy - A - 4, w.x - 24, gy - A + 8); ctx.quadraticCurveTo(w.x - 16, gy - A + 2, w.x - 4, gy - A + 3); ctx.closePath(); ctx.fill();
  for (let n = 0; n < 4; n++) { ctx.fillStyle = 'rgba(255,250,210,0.9)'; circle(w.x - 6 + n * 9, gy - A - 2 + Math.sin(t * 12 + n) * 2, 2.5); ctx.fill(); }
  // it rolls toward you: speed streaks in front of it
  ctx.strokeStyle = 'rgba(255,245,200,0.8)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (let n = 0; n < 3; n++) { const u = (t * 3 + n / 3) % 1, x = w.x - 40 - u * 50, y = gy - A * (0.25 + n * 0.25); ctx.globalAlpha = 1 - u; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 18, y + 1); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.lineCap = 'butt';
}
function vdSurfDrawGeyser(st, g, k, r) {
  const ph = st.ph, T = ph.T, gy = vdSurfBase(T, g.x), s = vdSurfGey(ph, g), t = G.clock, K = VDSURF;
  // the vent: a dark crusty ring
  ctx.fillStyle = '#4a2a30'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(g.x, gy + 2, K.geyW + 8, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = s.on === 'calm' ? '#c4501f' : '#ffd27a'; ctx.beginPath(); ctx.ellipse(g.x, gy + 2, K.geyW - 4, 4, 0, 0, Math.PI * 2); ctx.fill();
  if (s.on === 'warn') {
    // bubbling, a glow, and a "!" for the one coming up to it
    const pulse = 0.5 + 0.5 * Math.sin(t * 18);
    ctx.fillStyle = `rgba(255,200,90,${0.25 + 0.35 * s.u})`; ctx.beginPath(); ctx.ellipse(g.x, gy - 4, K.geyW + 16 + 8 * pulse, 12 + 6 * s.u, 0, 0, Math.PI * 2); ctx.fill();
    for (let n = 0; n < 4; n++) { const u = (t * 2.4 + n / 4) % 1; ctx.fillStyle = '#ffc04d'; circle(g.x - 14 + n * 9, gy - 4 - u * 22 * (0.5 + s.u), 3.5 - u * 2); ctx.fill(); }
    if (g.x > r.x && g.x - r.x < 700) bigText('!', g.x, gy - 46 - Math.abs(Math.sin(t * 10)) * 6, 28, '#ff5f6d', 1);
  } else if (s.on === 'erupt') {
    const hgt = vdSurfGeyH(s.u), top = gy - hgt;
    const gr = ctx.createLinearGradient(0, top, 0, gy);
    gr.addColorStop(0, '#fff1b0'); gr.addColorStop(0.3, VDC.lavaLt); gr.addColorStop(1, VDC.lava);
    ctx.fillStyle = gr; ctx.strokeStyle = 'rgba(150,40,20,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(g.x - K.geyW, gy);
    for (let y = gy; y > top; y -= 12) ctx.lineTo(g.x - K.geyW * 0.8 + Math.sin(y * 0.15 + t * 20) * 4, y);
    ctx.quadraticCurveTo(g.x, top - 16, g.x + K.geyW * 0.8, top);
    for (let y = top; y < gy; y += 12) ctx.lineTo(g.x + K.geyW * 0.8 + Math.sin(y * 0.15 - t * 20) * 4, y);
    ctx.lineTo(g.x + K.geyW, gy); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (let n = 0; n < 6; n++) { const a = t * 6 + n, u = (t * 2 + n / 6) % 1; ctx.fillStyle = n % 2 ? VDC.lavaLt : VDC.lava; circle(g.x + Math.cos(a) * (12 + u * 30), top - 8 + u * u * 50 - Math.sin(u * Math.PI) * 26, 5 - u * 2); ctx.fill(); }
  }
}
// a surfer on a slab: feet point (wx, wy) is the bottom of the slab, in world coords
function vdSurfDrawRider(st, r, wx, wy, o) {
  const K = VDSURF, ph = st.ph, t = G.clock;
  ctx.save();
  ctx.globalAlpha *= o.alpha;
  ctx.translate(wx, wy);
  ctx.scale(o.s, o.s);
  let tilt = r.tilt + (r.wob > 0 ? Math.sin(t * 26) * 0.18 * Math.min(1, r.wob / 0.3) : 0);
  let sq = 1, spinX = 1, flip = 0;
  if (r.trick) {
    const u = r.trick.u, e = u * u * (3 - 2 * u);
    if (r.trick.kind === 'flip') flip = -e * Math.PI * 2;
    else if (r.trick.kind === 'spin') spinX = Math.cos(e * Math.PI * 2);
    else sq = 1 - 0.3 * Math.sin(u * Math.PI);
  }
  if (r.land > 0) sq *= 1 - 0.25 * (r.land / 0.2);
  ctx.rotate(tilt);
  if (flip) { ctx.translate(0, -22); ctx.rotate(flip); ctx.translate(0, 22); }
  ctx.scale(spinX || 0.05, 1);
  // boost flames behind the slab
  if ((r.boost > 0 || r.inStream) && !o.ghost) {
    for (let n = 0; n < 3; n++) {
      const fl = 14 + Math.sin(t * 30 + n * 2) * 6 + n * 6;
      ctx.fillStyle = ['rgba(255,120,40,0.85)', 'rgba(255,200,80,0.9)', 'rgba(255,250,200,0.95)'][n];
      ctx.beginPath(); ctx.moveTo(-28, -6 + n * 1.5); ctx.quadraticCurveTo(-28 - fl, -3 - n, -28 - fl * 1.6 + n * 6, -1); ctx.quadraticCurveTo(-28 - fl, 1 + n, -28, 2 - n); ctx.closePath(); ctx.fill();
    }
  }
  // the gold slab (catch-up help), else the plain cooled rock
  vdDrawRockSlab(0, -7, 0.42, t + r.k);
  if (ph.help[r.k]) { ctx.strokeStyle = `rgba(255,197,61,${0.75 + 0.25 * Math.sin(t * 7)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-30, -7); ctx.lineTo(32, -7); ctx.stroke(); }
  // the player (the game's own drawing)
  const f = vdSurfFake(r, sq);
  drawPlayer(f);
  if (r.trick && r.trick.kind === 'grab') { ctx.fillStyle = PCOL[r.k]; ctx.strokeStyle = PDARK[r.k]; ctx.lineWidth = 2; circle(10, -9, 4); ctx.fill(); ctx.stroke(); }
  // hot feet after a geyser
  if (r.hotT > 0) { ctx.fillStyle = `rgba(255,150,60,${0.8 * r.hotT})`; for (let n = 0; n < 3; n++) { const x = -8 + n * 8, h = 8 + Math.sin(t * 30 + n * 2) * 3; ctx.beginPath(); ctx.moveTo(x - 3, -7); ctx.quadraticCurveTo(x, -7 - h * 2, x + 3, -7); ctx.fill(); } }
  ctx.restore();
  // the ghost's little name pill
  if (o.ghost && o.tag) {
    ctx.save(); ctx.globalAlpha = 0.75;
    ctx.fillStyle = PCOL[r.k]; rr(wx - 14, wy - 7 - PH * o.s - 22, 28, 14, 7); ctx.fill();
    text(vdSurfName(r.k), wx, wy - 7 - PH * o.s - 14.5, 10, '#ffffff', 'center', 'body');
    ctx.restore();
  }
}
const vdSurfFakes = [{}, {}];
function vdSurfFake(r, sq) {
  const f = vdSurfFakes[r.k];
  return Object.assign(f, { id: r.k, x: -PW / 2, y: -7 - PH, w: PW, h: PH, sx: 1 / Math.max(0.7, sq) > 1 ? 1.08 : 1, sy: sq, face: 1, vy: r.air ? r.vy * 0.5 : 0,
    stun: r.wob > 0 ? r.wob : 0, blink: 0, alive: true, stompSafe: 0 });
}

/* ---------- drawing: the HUD (lane chips, race bars, the race card) ---------- */
function vdSurfCardBox() { const big = vdBig(), w = big ? 600 : 520, h = big ? 230 : 196; return { x0: W / 2 - w / 2, y0: big ? 150 : 160, w, h, big }; }
function vdSurfHud(st) {
  const ph = st.ph, K = VDSURF, big = vdBig(), z = big ? 1.4 : 1;
  if (!ph.R || ph.state === 'crown') return;
  const nb = vdNewsBox(st), under = (x0, x1, y0, y1) => nb && x1 > nb.x0 - 4 && x0 < nb.x1 + 4 && y1 > nb.y0 - 2 && y0 < nb.y1 + 2;
  for (const k of [0, 1]) {
    const y0 = K.laneY[k] + 6, r = ph.R[k], o = ph.R[1 - k];
    // name and race wins
    ctx.font = vdLilita(Math.round(16 * z));
    const nw = ctx.measureText(vdSurfName(k)).width, cw = nw + 30 + 2 * 15 * z + (vdSurfCpu(k) ? 40 * z : 0), ch = 24 * z;
    // (the lane's chips fade under the news line, so the news stays readable on small screens)
    ctx.save();
    if (under(12, 12 + cw + (ph.help[k] ? 110 * z : 0), y0, y0 + ch)) ctx.globalAlpha = 0.3;
    ctx.fillStyle = 'rgba(40,18,32,0.82)'; rr(12, y0, cw, ch, ch / 2); ctx.fill();
    ctx.strokeStyle = PCOL[k]; ctx.lineWidth = 2; rr(12, y0, cw, ch, ch / 2); ctx.stroke();
    text(vdSurfName(k), 24, y0 + ch / 2 + 1, Math.round(16 * z), PCOL[k], 'left');
    let dx = 24 + nw + 10;
    if (vdSurfCpu(k)) { text('CPU', dx, y0 + ch / 2 + 1, Math.round(11 * z), '#d8c4d0', 'left', 'body'); dx += 34 * z; }
    for (let n = 0; n < K.win; n++) {
      const cx = dx + 6 * z + n * 15 * z, cy = y0 + ch / 2;
      if (n < ph.wins[k]) { ctx.fillStyle = C.gold; circle(cx, cy, 5.5 * z); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; circle(cx, cy, 5.5 * z); ctx.stroke(); }
      else { ctx.strokeStyle = 'rgba(246,239,223,0.5)'; ctx.lineWidth = 2; circle(cx, cy, 4.5 * z); ctx.stroke(); }
    }
    let gx = 12 + cw + 8;
    if (ph.help[k]) {
      const s = 'GOLD SLAB';
      ctx.font = vdFont(Math.round(11 * z)); const gw = ctx.measureText(s).width + 18;
      ctx.fillStyle = 'rgba(255,243,196,0.95)'; rr(gx, y0 + 2, gw, ch - 4, (ch - 4) / 2); ctx.fill();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(gx, y0 + 2, gw, ch - 4, (ch - 4) / 2); ctx.stroke();
      text(s, gx + gw / 2, y0 + ch / 2 + 0.5, Math.round(11 * z), '#7a5200', 'center', 'body');
      gx += gw + 8;
    }
    // the race bar: you (big dot) and the other surfer (small dot), start to the flag
    const bx0 = W - (big ? 300 : 250), bx1 = W - 30, by = y0 + ch / 2, L = ph.T.len;
    ctx.globalAlpha = under(bx0 - 14, bx1 + 20, y0, y0 + ch) ? 0.3 : 1;
    ctx.fillStyle = 'rgba(40,18,32,0.8)'; rr(bx0 - 14, y0, bx1 - bx0 + 34, ch, ch / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,140,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx0, by); ctx.lineTo(bx1, by); ctx.stroke();
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#1c1a36' : '#ffffff'; ctx.fillRect(bx1 - 2, by - 8 + i * 2.7, 6, 2.7); }
    const at = q => bx0 + (bx1 - bx0) * clamp(q.x / L, 0, 1);
    const ga = ctx.globalAlpha; ctx.fillStyle = PCOL[1 - k]; ctx.globalAlpha = ga * 0.7; circle(at(o), by, 4.5 * z); ctx.fill(); ctx.globalAlpha = ga;
    ctx.fillStyle = PCOL[k]; circle(at(r), by, 7 * z); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; circle(at(r), by, 7 * z); ctx.stroke();
    ctx.restore();
    void gx;
  }
  if (ph.state === 'card') vdSurfDrawCard(st);
}
function vdSurfDrawCard(st) {
  const ph = st.ph, K = VDSURF, B = vdSurfCardBox(), big = B.big, t = ph.cardT, z = big ? 1.35 : 1;
  const show = clamp(Math.min(t / 0.25, (K.cardT - 3 - t) / 0.3), 0, 1);   // the panel (about 2 s to read), then 3-2-1 (no overlap)
  if (show > 0) {
    ctx.save(); ctx.globalAlpha = show;
    ctx.fillStyle = 'rgba(40,18,32,0.93)'; rr(B.x0, B.y0, B.w, B.h, 22); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 3; rr(B.x0, B.y0, B.w, B.h, 22); ctx.stroke();
    // Cinder with a checkered flag
    const c = ph.cardC || (ph.cardC = Object.assign(vdNewCinder(), { mood: 'happy', baseMood: 'happy', face: 1 }));
    c.t = G.clock; c.actT = G.clock; c.pose = 'wave'; c.s = 0.42 * z; c.x = B.x0 + 64 * z; c.y = B.y0 + B.h - 22;
    vdDrawCinder(c);
    const tx = B.x0 + 132 * z, w = B.x0 + B.w - tx - 20;
    text(ph.replay ? 'Tie! Race ' + ph.raceN + ' again' : 'Race ' + ph.raceN + ' of 3', tx, B.y0 + 30 * z, Math.round(15 * z), '#ffb36b', 'left', 'body');
    text(ph.T.name, tx, B.y0 + 64 * z, Math.round(34 * z), C.gold, 'left');
    ctx.font = vdFont(Math.round(14 * z));
    const words = ph.T.hint.split(' '), lines = [''];
    for (const wd of words) { const tryL = (lines[lines.length - 1] + ' ' + wd).trim(); if (ctx.measureText(tryL).width > w && lines[lines.length - 1]) lines.push(wd); else lines[lines.length - 1] = tryL; }
    lines.forEach((l, i) => text(l, tx, B.y0 + (98 + i * 20) * z, Math.round(14 * z), C.paper, 'left', 'body'));
    // the score so far
    const sy = B.y0 + B.h - 26 * z;
    text(NAMES[0], tx, sy, Math.round(20 * z), PCOL[0], 'left');
    ctx.font = vdLilita(Math.round(20 * z));
    const pw = ctx.measureText(NAMES[0] + ' ').width;
    text(ph.wins[0] + ' - ' + ph.wins[1], tx + pw, sy, Math.round(20 * z), C.paper, 'left');
    const sw = ctx.measureText(ph.wins[0] + ' - ' + ph.wins[1] + ' ').width;
    text(NAMES[1], tx + pw + sw, sy, Math.round(20 * z), PCOL[1], 'left');
    text('First to 2 wins', B.x0 + B.w - 20, sy, Math.round(13 * z), '#d8c4d0', 'right', 'body');
    ctx.restore();
  }
  // 3-2-1 over the lanes
  const left = K.cardT - t;
  if (left <= 3 && left > 0) {
    const n = Math.ceil(left), u = n - left;
    ctx.save(); ctx.globalAlpha = clamp((1 - u) / 0.25, 0, 1) * clamp(u / 0.06, 0, 1);
    bigText(String(n), W / 2, VDSURF.laneY[1] - 2, big ? 96 : 76, '#ffffff', 1.3 - 0.3 * u);
    ctx.restore();
  }
}

/* ---------- drawing: the crowning scene ---------- */
function vdSurfDrawCrownBack(st) {
  const t = G.clock, gy = 456;
  vdDrawBackdrop(t, { x: W / 2 - 40, y: 190 });
  // a lava pool at the bottom of the run, and the dark shore
  ctx.fillStyle = '#2f2833'; ctx.fillRect(0, gy, W, H - gy);
  ctx.fillStyle = '#ff8a3d'; ctx.fillRect(0, gy, W, 4);
  // the lava run comes down on the right into a little pool (with a basalt rim)
  ctx.save(); ctx.beginPath(); ctx.ellipse(W - 60, gy + 30, 200, 44, 0, 0, Math.PI * 2); ctx.clip();
  vdDrawLava(W - 270, W + 150, gy + 12, t, { depth: 80 });
  ctx.restore();
  ctx.strokeStyle = '#1f1a24'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(W - 60, gy + 30, 200, 44, 0, Math.PI * 0.93, Math.PI * 1.5); ctx.stroke();
  ctx.fillStyle = VDC.lava; ctx.beginPath(); ctx.moveTo(W - 120, gy + 2); ctx.quadraticCurveTo(W - 40, 300, W + 10, 230); ctx.lineTo(W + 10, gy + 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,170,0.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W - 120, gy + 2); ctx.quadraticCurveTo(W - 40, 300, W + 10, 230); ctx.stroke();
  // the podium rock with a "1"
  const px = W / 2 - 40;
  ctx.fillStyle = VDC.slab; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(px - 46, gy + 2); ctx.lineTo(px - 40, 392); ctx.lineTo(px + 40, 392); ctx.lineTo(px + 46, gy + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = VDC.slabLt; ctx.fillRect(px - 38, 394, 76, 4);
  bigText('1', px, 426, 34, C.gold, 1);
  // two slabs leaning on the shore
  vdDrawRockSlab(W / 2 - 280, gy - 8, 0.42, t);
  vdDrawRockSlab(W / 2 + 200, gy - 8, 0.42, t + 1);
}
function vdSurfDrawCrown(st) {
  const ph = st.ph, a = vdSurfCrownAt(st), t = ph.crT;
  ctx.save(); ctx.translate(a.x, a.y);
  ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(-14, -14); ctx.lineTo(-7, -7); ctx.lineTo(0, -17); ctx.lineTo(7, -7); ctx.lineTo(14, -14); ctx.lineTo(13, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff5f6d'; circle(0, -5, 2.6); ctx.fill(); ctx.fillStyle = '#7fd6ff'; circle(-8, -4, 2); ctx.fill(); circle(8, -4, 2); ctx.fill();
  ctx.restore();
  if (t > 2.2) {
    const k = clamp((t - 2.2) / 0.3, 0, 1), big = vdBig();
    ctx.save(); ctx.globalAlpha = k;
    bigText('Surf champ: ' + vdSurfName(ph.champ) + '!', W / 2, big ? 150 : 140, big ? 50 : 42, C.gold, 0.8 + 0.2 * k);
    ctx.restore();
  }
}

/* ---------- sounds ---------- */
Sfx.extra.vdSurfHop = function (p) { this.tone(300 * p, 0.1, 'triangle', 0.035, 560 * p); };
Sfx.extra.vdSurfPop = function (p) { this.tone(520 * p, 0.07, 'square', 0.04, 1040 * p); this.tone(1320, 0.12, 'triangle', 0.035, 1760, 0.05); };
Sfx.extra.vdSurfSwish = function (p) { this.tone(700 * p, 0.18, 'sawtooth', 0.016, 1400 * p); };
Sfx.extra.vdSurfTrick = function (p) { [880, 1175, 1568].forEach((f, i) => this.tone(f * p, 0.08, 'triangle', 0.04, null, i * 0.05)); };
Sfx.extra.vdSurfWobble = function (p) { this.tone(330 * p, 0.14, 'triangle', 0.04, 260 * p); this.tone(300 * p, 0.2, 'triangle', 0.035, 200 * p, 0.12); };
Sfx.extra.vdSurfBonk = function (p) { this.tone(180 * p, 0.12, 'square', 0.045, 90 * p); this.tone(900, 0.06, 'triangle', 0.025, 600, 0.02); };
Sfx.extra.vdSurfSplash = function (p) { this.tone(240 * p, 0.35, 'sawtooth', 0.025, 80); this.tone(800, 0.18, 'sine', 0.03, 300, 0.04); };
Sfx.extra.vdSurfLand = function (p) { this.tone(150 * p, 0.08, 'triangle', 0.045, 90); };
Sfx.extra.vdSurfZoom = function (p) { this.tone(400 * p, 0.3, 'sawtooth', 0.016, 1200 * p); };
Sfx.extra.vdSurfRumble = function () { this.tone(90, 0.4, 'triangle', 0.04, 60); };
Sfx.extra.vdSurfBeep = function () { this.tone(660, 0.12, 'square', 0.04); };
Sfx.extra.vdSurfGo = function () { this.tone(990, 0.28, 'square', 0.045); this.tone(1320, 0.3, 'triangle', 0.04, null, 0.02); this.tone(196, 0.6, 'sine', 0.05, 180); };
Sfx.extra.vdSurfCard = function () { [392, 523, 659].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.045, null, i * 0.08)); };
Sfx.extra.vdSurfFinish = function () { [784, 988, 1175].forEach((f, i) => this.tone(f, 0.1, 'square', 0.035, null, i * 0.06)); };
Sfx.extra.vdSurfWin = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.055, null, i * 0.08)); };
Sfx.extra.vdSurfCrown = function () { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.045, null, i * 0.1)); this.tone(1568, 0.5, 'sine', 0.045, null, 0.62); };

/* ---------- the room ---------- */
vdRoom('surf', {
  title: 'Lava Surf Race', first: 0,
  act: { label: 'trick', labels: ['trick', 'trick'] },
  legend: { jump: 'hop', down: 'slow', padJump: 'hop', padDown: 'down slows' },
  tip: 'Cinder wants a race! Hold ▶ to surf fast, hop rocks, POP off ramps and trick in the air. First to 2 wins!',
  map: Array.from({ length: 18 }, (_, i) => (i === 13 ? '..1.2...........................' : '................................')),
});
