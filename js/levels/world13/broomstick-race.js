/* Pip & Bo - Level 13-4 Broomstick Race (versus, World 13 Spooky Hollow). */
'use strict';

/* ===== 13-4 Broomstick Race (mode 'broom', versus, best of 5): witch brooms over a sleepy spooky town =====
   Side-on. def.ownStep: this mode runs the whole live tick, the scrolling camera and the picture; the platformer bodies are
   hidden (Pip and Bo sit on their brooms). Brooms always fly forward by themselves (a kid can just steer):
     ▲ / ▼ (W S, ↑ ↓, stick, touch ▲ ▼) climb and dive; ▶ flies fast, ◀ flies slow. The faster you fly, the slower you climb.
     Glowing rings: fly through the middle for a speed burst (the rim only clinks). Speed stars: grab one (you hold one at a
     time) and press zoom (the action, or A on a controller) for a big boost; zooming brooms bowl through bats unharmed.
     Friendly bats flutter in patterns: bump one and you spin ("Squeak!") and lose speed, nobody is hurt. Rooftops bounce you
     back up ("Boing!"). The brooms bump each other a little.
   First through the giant jack-o'-lantern gate wins the round. Crossings 0.02 s apart or closer are a dead heat (replayed).
   Shared camera: it follows the pair, never lets the leader off the right side, and the left edge carries a trailer along.
   Catch-up help, always gold and announced: Tailwind (the trailer flies a bit faster while far behind) and, for a player
   2+ rounds behind, a Gold star ready at the start of every round (its zoom is bigger and longer: +400 for 1.6 s).
   Round 1 is a plain course; rounds 2-5 are a fresh shuffle of Windy Night, Foggy Hollow, Ring Trains and Bat Swarm; a
   sudden-death replay (2 ties in a row) is a short Photo Finish sprint. Every course is built at the start of its round.
   Every top-level name is prefixed broom / BROOM, every sound is Sfx.extra.broom*. Rule randomness only from
   MODES.broom.rand (the course); looks use their own broomVR. */
const BROOM = {
  len: 9600, photoLen: 4600, startX: 150, startY: [190, 318],
  top: 100, floorY: 470, street: 505, R: 14,              // flight band top, lowest a rider can go, the street, rider radius
  // forward speed (px/s): cruise with no key, ▶ fast, ◀ slow
  cruise: 250, fast: 330, slow: 175, accX: 280, decX: 380,
  // climb / dive: the top climb speed falls as forward speed rises (vyMax0 at 180 px/s, -vyK per px/s faster)
  vyMax0: 340, vyK: 0.5, vyMin: 150, vyAcc: 1500, vyDec: 1800,
  // rings
  ringIn: 30, ringOut: 46, ringAdd: 115, burstMax: 260, burstK: 1.15, clinkSlow: 25, trainAdd: 110,
  // speed stars + zoom
  starR: 26, zoomAdd: 300, zoomT: 1.15, zoomRamp: 0.3, goldZoomAdd: 400, goldZoomT: 1.6, // a Gold star (catch-up) zooms bigger and longer
  // bats
  batR: 12, batSlow: 0.5, batMin: 120, spinT: 0.75, batCool: 1.2, batHitT: 1.1, batKnock: 170,
  // rooftops, the other broom
  roofBounce: 230, roofSlow: 0.85, roofCD: 0.45, bumpR: 30, bumpVy: 150, bumpCD: 0.35,
  // catch-up (gold): Tailwind for the trailer, a Gold star for a player 2+ rounds behind
  tailGap: 260, tailK: 0.22, tailMax: 55, tailShow: 10, goldMin: 2,
  // camera
  camAvg: 380, camLead: 600, camLeadMax: 150, edgeL: 50,
  // finish: wait this long after the first crossing for a photo finish; crossings this close are a dead heat
  finWait: 0.03, photo: 0.02, capT: 75,
};
const BROOM_TWISTS = {
  plain: { name: 'Moonlit Dash', hint: 'Fly through the rings, grab a star, race to the pumpkin!' },
  wind: { name: 'Windy Night', hint: 'Gusts push you up and down! Steer against the arrows.' },
  fog: { name: 'Foggy Hollow', hint: 'Fog rolls in! Watch for the bats’ glowing eyes.' },
  train: { name: 'Ring Trains', hint: 'Rings bob up and down. Fly through a whole train!' },
  swarm: { name: 'Bat Swarm', hint: 'A big bat flock! Find the gap, or zoom right through.' },
  photo: { name: 'Photo Finish', hint: 'Two ties! A short sprint decides it.' },
};
const BROOM_MIX = ['wind', 'fog', 'train', 'swarm'];
const BROOM_COLS = {
  wall: ['#5a4a7a', '#4d6878', '#6a4a62', '#47587a', '#735570', '#5c6a5a'], roof: ['#2e2244', '#3b2a3e', '#283048', '#3a2850'],
  win: '#ffd77a', winDk: '#3a3050', ring: '#ffb347', ringHi: '#fff0c0', train: '#ff9de2', trainHi: '#ffe6f6',
  bat: '#6b4c9a', batDk: '#4a3270', batWing: '#5b3f8c', pumpkin: '#ff8a2a', pumpkinDk: '#c95a12', stem: '#5a8a3a',
  hat: '#3a2a66', hatDk: '#241a44', stick: '#8a5833', straw: '#e8c36a', strawDk: '#b08a3a',
};
// looks-only randomness (sparkles, smoke): never MODES.broom.rand, so the rules' random sequence doesn't depend on the looks
let broomVS = 20261031;
const broomVR = () => { broomVS = (Math.imul(broomVS, 1664525) + 1013904223) >>> 0; return broomVS / 4294967296; };
const broomHash = (a, b) => (((Math.imul(a + 7, 73856093) ^ Math.imul(b + 3, 19349663)) >>> 0) % 1000) / 1000;
// is this player's jump (A / B) coming from their own controller right now? There A zooms (the stick climbs);
// on a keyboard W / ↑ and on touch ▲ climb.
function broomPadJump(id) {
  try { const pd = padFor(padSlots(), id), s = pd && Pads.prev[pd.ix]; return !!(s && s.jump); } catch (e) { return false; }
}
// 1-player mode: the computer flies this broom (no key reminders for it)
const broomCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);

/* ---------- the course ---------- */
// the town's surface (roofs, chimneys, tree tops) at world x: the lowest y a rider's middle can reach is this minus R
function broomGroundY(c, x) {
  let y = BROOM.street;
  if (!c) return y;
  const hs = c.houses;
  // houses are sorted by x and never overlap: binary search the one under x
  let lo = 0, hi = hs.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1, h = hs[mid];
    if (x < h.x - 10) hi = mid - 1; else if (x > h.x + h.w + 10) lo = mid + 1;
    else {
      const cx = h.x + h.w / 2, half = h.w / 2 + 10, k = Math.abs(x - cx) / half;
      y = Math.min(y, h.flat ? h.wallTop - 4 : h.peak + (h.wallTop - 6 - h.peak) * k);
      if (h.chim && x > h.chim.x - 2 && x < h.chim.x + h.chim.w + 2) y = Math.min(y, h.chim.top);
      break;
    }
  }
  for (const t of c.trees) {
    const dx = x - t.x;
    if (Math.abs(dx) < t.r) y = Math.min(y, t.y - Math.sqrt(t.r * t.r - dx * dx) * 0.9);
  }
  return y;
}
// the lowest a rider can fly near x (the roof under it and just ahead), with the floor cap
function broomFloorAt(c, x) {
  return Math.min(BROOM.floorY, broomGroundY(c, x - 8), broomGroundY(c, x), broomGroundY(c, x + 12)) - BROOM.R;
}
function broomRingY(r, t) { return r.train ? r.y + r.train.amp * Math.sin(t * r.train.w + r.train.ph) : r.y; }
// where a bat is at time t (its path is fixed for the round, so a person and the computer can both read it)
function broomBatPos(b, t) {
  let x = b.x, y = b.y;
  if (b.kind === 'bob') { y += b.amp * Math.sin(t * b.w + b.ph); x += 8 * Math.sin(t * b.w * 0.5 + b.ph); }
  else if (b.kind === 'loop') { x += b.amp * Math.cos(t * b.w + b.ph); y += b.amp * Math.sin(t * b.w + b.ph); }
  else if (b.kind === 'hover') { y += 10 * Math.sin(t * 3 + b.ph); x += 6 * Math.cos(t * 2 + b.ph); }
  else if (b.kind === 'wall') { y += b.wall.amp * Math.sin(t * b.wall.w + b.wall.ph); x += 3 * Math.sin(t * 5 + b.ph); }
  return { x, y };
}
// a bat that was bumped flutters up out of the way for a moment (it can't be bumped again until it is back)
function broomBatDraw(b, t) {
  const q = broomBatPos(b, t);
  if (b.hitT > 0) { const k = b.hitT / BROOM.batHitT; q.y -= Math.sin(k * Math.PI) * 70; q.x += Math.sin(k * Math.PI) * 30; }
  return q;
}
function broomGustAt(c, x) {
  if (!c || !c.gusts.length) return 0;
  for (const g of c.gusts) if (x >= g.x0 && x <= g.x1) {
    const e = Math.min(1, (x - g.x0) / 80, (g.x1 - x) / 80);
    return g.v * e;
  }
  return 0;
}
// build one round's course with the rules' random numbers: the town, rings, ring trains, stars, bats, gusts and fog
function broomBuild(twist, R) {
  const P = BROOM, len = twist === 'photo' ? P.photoLen : P.len;
  const c = { twist, len, houses: [], trees: [], rings: [], trains: [], stars: [], bats: [], walls: [], gusts: [], fogs: [], props: [] };
  // the town: houses in a row (sorted, no overlaps), with trees and owls in some of the gaps
  let x = -700;
  while (x < len + 2600) {
    const w = 110 + Math.floor(R() * 90), h = 46 + Math.floor(R() * 52), wallTop = P.street - h;
    const flat = R() < 0.14, peak = flat ? wallTop : wallTop - 34 - Math.floor(R() * 34);
    const hs = { x, w, wallTop, peak, flat, col: Math.floor(R() * 6), roofCol: Math.floor(R() * 4), seed: Math.floor(R() * 1000) };
    // no chimneys or tall roofs right at the start or the gate
    const quiet = x < P.startX + 260 || Math.abs(x + w / 2 - len) < 260;
    if (quiet) { hs.peak = Math.max(hs.peak, wallTop - 30); }
    if (!flat && !quiet && R() < 0.55) {
      const cw = 18 + Math.floor(R() * 6), side = R() < 0.5 ? 0.22 : 0.62;
      const cxp = x + w * side, k = Math.abs(cxp + cw / 2 - (x + w / 2)) / (w / 2 + 10);
      const roofAt = hs.peak + (wallTop - 6 - hs.peak) * k;
      hs.chim = { x: cxp, w: cw, top: Math.round(roofAt - 26 - R() * 22) };
    }
    hs.lantern = R() < 0.45 ? (R() < 0.5 ? -1 : 1) : 0; // a jack-o'-lantern on the windowsill or doorstep
    hs.cat = !flat && R() < 0.12;
    c.houses.push(hs);
    x += w;
    const gap = 26 + Math.floor(R() * 60);
    if (gap > 54 && R() < 0.6 && !(Math.abs(x + gap / 2 - len) < 200)) {
      const tr = 34 + Math.floor(R() * 14);
      c.trees.push({ x: x + gap / 2, y: P.street - 70 - Math.floor(R() * 26), r: tr, owl: R() < 0.55, col: Math.floor(R() * 3), seed: Math.floor(R() * 1000) });
    }
    x += gap;
  }
  const floor = xx => broomFloorAt(c, xx);
  const safeY = (xx, y, room = 50) => clamp(y, P.top + 34, Math.min(floor(xx - 30), floor(xx), floor(xx + 30)) - room);
  // the racing line: a smooth wander through the sky (control points every 700 px)
  const ctrl = [];
  for (let k = 0; k * 700 <= len + 1400; k++) ctrl.push(k === 0 ? 255 : 150 + R() * 220);
  const line = xx => { const u = Math.max(0, xx) / 700, i = Math.floor(u), f = u - i, a = ctrl[Math.min(i, ctrl.length - 1)], b = ctrl[Math.min(i + 1, ctrl.length - 1)]; return a + (b - a) * (1 - Math.cos(f * Math.PI)) / 2; };
  c.line = ctrl;
  // twist zones first (rings and bats keep out of a bat wall's lane)
  if (twist === 'swarm') for (const f of [0.3, 0.55, 0.8]) {
    const wx = Math.round(len * f + (R() - 0.5) * 200), gapY = 195 + R() * 105, wall = { x: wx, amp: 50 + R() * 20, w: 1.1 + R() * 0.5, ph: R() * 6.28, gap: 128 };
    c.walls.push(wall);
    // bats from far above the band to the street, 46 px apart, with one 128 px gap (the whole wall bobs)
    for (let y = gapY - wall.gap / 2 - 23; y > -140; y -= 46) c.bats.push({ x: wx, y, kind: 'wall', wall, ph: R() * 6.28, hitT: 0, cool: [0, 0] });
    for (let y = gapY + wall.gap / 2 + 23; y < 640; y += 46) c.bats.push({ x: wx, y, kind: 'wall', wall, ph: R() * 6.28, hitT: 0, cool: [0, 0] });
  }
  if (twist === 'wind') {
    let gx = 1300 + R() * 300, up = R() < 0.5;
    while (gx < len - 900) { const gw = 480 + R() * 220; c.gusts.push({ x0: gx, x1: gx + gw, v: (up ? -1 : 1) * (115 + R() * 45) }); gx += gw + 520 + R() * 380; up = !up; }
  }
  if (twist === 'fog') { const a = 1200 + R() * 400; c.fogs.push({ x0: a, x1: a + 1300 }); const b = len * 0.62 + R() * 300; c.fogs.push({ x0: b, x1: Math.min(len - 350, b + 1350) }); }
  const nearWall = xx => c.walls.some(wl => Math.abs(wl.x - xx) < 230);
  // rings along the line: mostly singles 360-420 px apart, a few slaloms (tight high-low rings), and in Ring Trains,
  // trains of 4 bobbing rings
  let rx = 700, slalomLeft = 0, n = 0;
  while (rx < len - 380) {
    if (nearWall(rx)) { rx += 120; continue; }
    if (twist === 'train' && n % 4 === 2 && rx < len - 900) {
      const tr = { amp: 50 + R() * 30, w: 2.2 + R() * 0.8, ph: R() * 6.28, n: 4, got: [0, 0], miss: [false, false] };
      const base = Math.max(P.top + 26 + tr.amp, safeY(rx + 130, line(rx + 130), 50 + tr.amp));
      for (let k = 0; k < 4; k++) c.rings.push({ x: rx + k * 86, y: base, train: tr, got: [false, false], k });
      c.trains.push(tr);
      rx += 86 * 3 + 400; n++; continue;
    }
    let y = line(rx) + (R() - 0.5) * 50;
    if (slalomLeft > 0) { y = line(rx) + (slalomLeft % 2 ? -1 : 1) * 70; slalomLeft--; }
    else if (n > 1 && R() < 0.16) slalomLeft = 2;
    c.rings.push({ x: Math.round(rx), y: Math.round(safeY(rx, y, 52)), got: [false, false] });
    rx += slalomLeft > 0 ? 235 + R() * 30 : 360 + R() * 70; n++;
  }
  // speed stars: off the racing line (a ring or a star, your pick), one every ~1900 px
  const nStars = twist === 'photo' ? 2 : 4;
  for (let k = 0; k < nStars; k++) {
    let sx = (len - 900) * (k + 0.75) / nStars + (R() - 0.5) * 240;
    if (nearWall(sx)) sx += 260;
    const off = (R() < 0.5 ? -1 : 1) * (85 + R() * 30);
    c.stars.push({ x: Math.round(sx), y: Math.round(safeY(sx, line(sx) + off, 46)), taken: -1, t: 0, ph: R() * 6.28 });
  }
  // friendly bats between the rings: bobbers that cross the line, loopers and hoverers
  const nBats = { plain: 14, wind: 11, fog: 15, train: 11, swarm: 7, photo: 7 }[twist] || 12;
  const ringXs = c.rings.map(r => r.x);
  for (let k = 0; k < nBats; k++) {
    let bx = 1000 + (len - 1500) * (k + R() * 0.6) / nBats;
    // halfway between two rings (never inside a ring's doorway)
    const after = ringXs.find(v => v > bx), before = ringXs.slice().reverse().find(v => v <= bx);
    if (after != null && before != null && after - before > 150) bx = (after + before) / 2 + (R() - 0.5) * 40;
    if (nearWall(bx)) continue;
    const kind = R() < 0.5 ? 'bob' : R() < 0.55 ? 'loop' : 'hover';
    const y0 = line(bx) + (kind === 'hover' ? (R() < 0.5 ? -1 : 1) * (28 + R() * 30) : (R() - 0.5) * 50);
    const amp = kind === 'bob' ? 55 + R() * 45 : kind === 'loop' ? 30 + R() * 16 : 0;
    c.bats.push({ x: Math.round(bx), y: Math.round(safeY(bx, y0, 30 + amp)), kind, amp, w: kind === 'bob' ? 1.7 + R() * 1.1 : 2.2 + R() * 0.8, ph: R() * 6.28, hitT: 0, cool: [0, 0] });
  }
  c.bats.sort((a, b) => a.x - b.x);
  c.rings.sort((a, b) => a.x - b.x);
  // decorations (looks only): ghosts cheering at the gate, a goofy skeleton on a roof waving the flag
  c.props.push({ kind: 'skel', x: len + 250 }, { kind: 'ghost', x: len - 250, y: 150, ph: 0 }, { kind: 'ghost', x: len + 240, y: 135, ph: 2 }, { kind: 'ghost', x: len - 430, y: 118, ph: 4 });
  return c;
}

/* ---------- the riders ---------- */
function broomMakeRider(k) {
  const P = BROOM;
  return { id: k, x: P.startX, y: P.startY[k], px: P.startX, vy: 0, base: P.cruise, burst: 0, zoomT: 0, zoomAdd: BROOM.zoomAdd, star: 0, spin: 0, wob: 0,
    tail: 0, roofCD: 0, bumpCD: 0, finT: null, v: P.cruise,
    // looks only (never read by the rules)
    tilt: 0, popT: 9, pop: '', popCol: '#fff', trailT: 0, loopT: -1, flap: 0, holdT: 0, tailSaid: false, spinA: 0 };
}
const broomSpeed = r => r.base + r.burst + (r.zoomT > 0 ? r.zoomAdd * Math.min(1, r.zoomT / BROOM.zoomRamp) : 0) + r.tail;
function broomVyMax(v) { const P = BROOM; return clamp(P.vyMax0 - P.vyK * (v - 180), P.vyMin, P.vyMax0); }
function broomPop(r, text, col) { r.pop = text; r.popCol = col || '#ffffff'; r.popT = 0; }

// one rider's flight for one tick. inp: { climb, dive, fast, slow } or null (no input: the broom just cruises)
function broomFly(st, r, inp, dt, live) {
  const P = BROOM, c = st.c;
  r.px = r.x;
  r.roofCD = Math.max(0, r.roofCD - dt); r.bumpCD = Math.max(0, r.bumpCD - dt);
  r.spin = Math.max(0, r.spin - dt); r.wob = Math.max(0, r.wob - dt);
  if (r.zoomT > 0) r.zoomT = Math.max(0, r.zoomT - dt);
  const spinning = r.spin > 0;
  const tv = !inp || spinning ? P.cruise : inp.fast ? P.fast : inp.slow ? P.slow : P.cruise;
  if (!spinning) r.base = approach(r.base, tv, (r.base < tv ? P.accX : P.decX) * dt);
  r.burst *= Math.exp(-P.burstK * dt); if (r.burst < 1) r.burst = 0;
  const v = broomSpeed(r); r.v = v;
  const vyMax = broomVyMax(v);
  const dir = !inp || spinning ? 0 : (inp.climb ? -1 : 0) + (inp.dive ? 1 : 0);
  if (dir) r.vy = approach(r.vy, dir * vyMax * (r.wob > 0 ? 0.6 : 1), P.vyAcc * dt);
  else r.vy = approach(r.vy, 0, (spinning ? P.vyDec * 0.5 : P.vyDec) * dt);
  const wind = broomGustAt(c, r.x);
  r.x += v * dt; r.y += (r.vy + wind) * dt;
  if (r.y < P.top) { r.y = P.top; r.vy = Math.max(0, r.vy); }
  const fl = broomFloorAt(c, r.x);
  if (r.y > fl) {
    r.y = Math.max(fl, r.y - 900 * dt);   // (slides up a wall or chimney face over a few frames: it used to pop up 50 px in one step)
    if (fl >= P.floorY - P.R - 1) r.vy = Math.min(r.vy, 0); // just the bottom of the sky (over the street): no bounce
    else if (r.vy >= 0 || wind > 0) {
      r.vy = -P.roofBounce;
      if (r.roofCD <= 0) {
        r.base = Math.max(P.slow * 0.8, r.base * P.roofSlow); r.roofCD = P.roofCD;
        if (live) { broomPop(r, 'Boing!', '#ffe6a8'); st.stat.boings[r.id]++; }
        Sfx.play('broomBoing', r.id); broomPuff(st, r.x, r.y + 14, 5, 'rgba(230,220,250,0.9)');
      }
    }
  }
  // looks
  r.tilt += (clamp(-(r.vy + wind) / 700, -0.35, 0.35) - r.tilt) * Math.min(1, dt * 10);
  r.flap += dt * (6 + v / 60);
  if (spinning) r.spinA += dt * 17; else r.spinA = 0;
}

function broomZoom(st, r) {
  if (!r.star) { if (r.noStarT <= 0 || r.noStarT === undefined) { Sfx.play('broomNope', r.id); r.noStarT = 0.4; } return; }
  const gold = r.star === 2;
  r.star = 0; r.zoomT = gold ? BROOM.goldZoomT : BROOM.zoomT; r.zoomAdd = gold ? BROOM.goldZoomAdd : BROOM.zoomAdd; r.zoomGold = gold; r.spin = 0; r.holdT = 0;
  st.stat.zooms[r.id]++;
  broomPop(r, gold ? 'GOLD ZOOM!' : 'ZOOM!', C.gold);
  Sfx.play('broomZoom', r.id); rumble(r.id, 0.25, 0.5, 140);
  for (let k = 0; k < 16; k++) { const a = broomVR() * Math.PI * 2, s = 60 + broomVR() * 160; broomFx(st, r.x - 20, r.y, Math.cos(a) * s - 120, Math.sin(a) * s, 0.5, k % 2 ? C.gold : '#fff6c8', 3.5, 0); }
  st.vis.shock.push({ x: r.x, y: r.y, t: 0 });
}

// rings: a rider crossing a ring's x this tick goes through it cleanly, clinks the rim, or misses it
function broomRings(st, r, live) {
  const P = BROOM, c = st.c;
  for (const g of c.rings) {
    if (g.x <= r.px || g.x > r.x || g.got[r.id]) continue;
    const gy = broomRingY(g, st.t), d = Math.abs(r.y - gy);
    if (d < P.ringIn) {
      g.got[r.id] = true; g.flash = 0.35; g.flashId = r.id;
      r.burst = Math.min(P.burstMax, r.burst + P.ringAdd);
      if (live) st.stat.rings[r.id]++;
      Sfx.play('broomRing', r.id);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; broomFx(st, g.x, gy, Math.cos(a) * 30 - 60, Math.sin(a) * 110, 0.45, k % 2 ? PCOL[r.id] : (g.train ? BROOM_COLS.trainHi : BROOM_COLS.ringHi), 3, 0); }
      if (g.train) {
        g.train.got[r.id]++;
        if (g.train.got[r.id] === g.train.n && !g.train.miss[r.id]) {
          r.burst = Math.min(P.burstMax + P.trainAdd, r.burst + P.trainAdd);
          if (live) st.stat.trains[r.id]++;
          broomPop(r, 'Ring train!', BROOM_COLS.train); Sfx.play('broomTrain', r.id);
        }
      }
    } else if (d < P.ringOut) {
      g.got[r.id] = true; g.wob = 0.4;
      if (g.train) g.train.miss[r.id] = true;
      r.base = Math.max(P.slow, r.base - P.clinkSlow);
      broomPop(r, 'Clink!', '#ffd7a0'); Sfx.play('broomClink', r.id);
    } else if (g.train) g.train.miss[r.id] = true;
  }
}
// stars: touch one to pick it up (one at a time; a full hand leaves it for the other broom)
function broomStars(st, r, live) {
  const P = BROOM, c = st.c;
  for (const s of c.stars) {
    if (s.taken >= 0 || Math.abs(s.x - r.x) > P.starR + 8) continue;
    const sy = s.y + Math.sin(st.t * 2.4 + s.ph) * 6;
    if (Math.hypot(s.x - r.x, sy - r.y) > P.starR) continue;
    if (r.star) { if (!s.full || s.full < st.t) { s.full = st.t + 1; broomPop(r, 'Hands full!', '#d9d3ef'); } continue; }
    s.taken = r.id; s.t = 0; r.star = 1; r.holdT = 0;
    if (live) st.stat.stars[r.id]++;
    broomPop(r, 'Star!', C.gold); Sfx.play('broomStar', r.id);
    for (let k = 0; k < 12; k++) { const a = broomVR() * 6.28, sp = 50 + broomVR() * 120; broomFx(st, s.x, sy, Math.cos(a) * sp, Math.sin(a) * sp, 0.55, k % 3 ? C.gold : '#ffffff', 3, 0); }
  }
}
// bats: bump one and you spin and slow down ("Squeak!"); a zooming broom just bowls it aside
function broomBats(st, r, live) {
  const P = BROOM, c = st.c, rr2 = (P.batR + P.R) * (P.batR + P.R);
  for (const b of c.bats) {
    if (b.x < r.x - 140 || b.x > r.x + 140) continue;
    if (b.hitT > 0 || b.cool[r.id] > st.t) continue;
    const q = broomBatPos(b, st.t), dx = q.x - r.x, dy = q.y - r.y;
    if (dx * dx + dy * dy > rr2) continue;
    b.hitT = P.batHitT; b.cool[r.id] = st.t + P.batCool; b.spinDir = dx >= 0 ? 1 : -1;
    if (r.zoomT > 0) {
      broomPop(r, 'Whee!', '#ffe6f6'); Sfx.play('broomWhee', r.id);
      if (live) st.stat.bowled[r.id]++;
      continue;
    }
    if (r.spin > 0) continue;
    r.spin = P.spinT; r.base = Math.max(P.batMin, r.base * P.batSlow); r.burst = 0;
    r.vy = (dy > 0 ? -1 : 1) * P.batKnock;
    if (live) st.stat.squeaks[r.id]++;
    broomPop(r, 'Squeak!', '#e0c8ff'); Sfx.play('broomSqueak', r.id); rumble(r.id, 0.3, 0.5, 120);
    for (let k = 0; k < 6; k++) broomFx(st, q.x, q.y, (broomVR() - 0.5) * 120, -40 - broomVR() * 90, 0.6, '#cdb4ff', 2.5, 120, 'heart');
  }
}
// the two brooms bump a little: pushed apart up and down; a zooming broom shoves the other harder
function broomBump(st, live) {
  const P = BROOM, [A, B] = st.riders;
  if (A.finT != null && B.finT != null) return;
  const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
  if (d >= P.bumpR) return;
  let ny = d > 1e-3 ? dy / d : (G.tickN & 1 ? 1 : -1), nx = d > 1e-3 ? dx / d : 0;
  if (Math.abs(ny) < 0.35) ny = ny < 0 ? -0.35 : ny > 0 ? 0.35 : (G.tickN & 1 ? 0.35 : -0.35); // mostly up and down
  const over = P.bumpR - d;
  A.y -= ny * over / 2; B.y += ny * over / 2;
  A.x -= nx * over * 0.15; B.x += nx * over * 0.15;
  for (const r of [A, B]) r.y = clamp(r.y, P.top, broomFloorAt(st.c, r.x));
  if (A.bumpCD > 0 || B.bumpCD > 0) return;
  A.bumpCD = B.bumpCD = P.bumpCD;
  A.vy = -Math.sign(ny) * P.bumpVy; B.vy = Math.sign(ny) * P.bumpVy;
  const za = A.zoomT > 0, zb = B.zoomT > 0;
  // the broom behind (or the one not zooming) loses a little speed
  const back = za !== zb ? (za ? B : A) : (A.x < B.x ? A : B);
  back.base = Math.max(P.slow, back.base - (za !== zb ? 70 : 30)); back.wob = za !== zb ? 0.45 : 0.25;
  if (live) st.stat.bumps++;
  const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
  st.vis.words.push({ x: mx, y: my - 26, text: za !== zb ? 'BONK!' : 'Bump!', t: 0, col: '#ffffff' });
  Sfx.play('broomBonk'); rumble(0, 0.2, 0.3, 70); rumble(1, 0.2, 0.3, 70);
  for (let k = 0; k < 6; k++) { const a = broomVR() * 6.28; broomFx(st, mx, my, Math.cos(a) * 120, Math.sin(a) * 120, 0.3, k % 2 ? '#fff6c8' : C.gold, 2.5, 0); }
}
// catch-up: whoever is far behind gets a gold Tailwind (more the farther behind, up to tailMax)
function broomCatchup(st, dt, live) {
  const P = BROOM, [A, B] = st.riders;
  for (const r of st.riders) {
    const o = r === A ? B : A, gap = o.x - r.x;
    const want = live && r.finT == null && o.finT == null && !st.sd ? clamp((gap - P.tailGap) * P.tailK, 0, P.tailMax) : 0;
    r.tail = approach(r.tail, want, 120 * dt);
    if (live && r.tail > P.tailShow && !r.tailSaid) { r.tailSaid = true; broomPop(r, 'Tailwind!', C.gold); Sfx.play('broomTail', r.id); st.stat.tails[r.id]++; }
    if (r.tail <= 0) r.tailSaid = false;
  }
}
// the shared camera: follows the pair, keeps the leader off the right edge, and the left edge carries the trailer along
function broomCamera(st, dt, snap) {
  const P = BROOM, [A, B] = st.riders, cam = st.cam;
  const lead = Math.max(A.x, B.x), avg = (A.x + B.x) / 2;
  const want = Math.max(avg - P.camAvg, lead - P.camLead, 0);
  cam.x = snap ? want : cam.x + (want - cam.x) * Math.min(1, dt * 5);
  cam.x = Math.max(cam.x, lead - (W - P.camLeadMax));
  cam.v = (cam.x - (cam.px == null ? cam.x : cam.px)) / Math.max(dt, 1e-6); cam.px = cam.x;
  for (const r of st.riders) if (r.x < cam.x + P.edgeL) { r.x = cam.x + P.edgeL; r.carried = 0.2; }
  for (const r of st.riders) r.carried = Math.max(0, (r.carried || 0) - dt);
}

/* ---------- looks: effects that never touch the rules ---------- */
function broomFx(st, x, y, vx, vy, life, col, size, grav, kind) {
  const v = st.vis; if (!v) return;
  v.fx.push({ x, y, vx, vy, life, max: life, col, size, grav, kind: kind || 'dot' });
  if (v.fx.length > 420) v.fx.splice(0, v.fx.length - 420);
}
function broomPuff(st, x, y, n, col) { for (let k = 0; k < n; k++) broomFx(st, x, y, (broomVR() - 0.5) * 110, -broomVR() * 70, 0.4, col, 3 + broomVR() * 3, 160); }
function broomVisNew() { return { fx: [], words: [], shock: [], smoke: [], leaves: [], leafT: 0 }; }
function broomVisTick(st, dt) {
  const v = st.vis; if (!v) return;
  for (const q of v.fx) { q.life -= dt; q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
  v.fx = v.fx.filter(q => q.life > 0);
  const age = (arr, life) => { for (const e of arr) e.t += dt; return arr.filter(e => e.t < life); };
  v.words = age(v.words, 0.8); v.shock = age(v.shock, 0.45); v.smoke = age(v.smoke, 2.4);
  if (!st.riders || !st.c) return;
  for (const r of st.riders) {
    r.popT += dt;
    if (r.loopT >= 0) r.loopT += dt;
    // sparkle trail from the bristles (gold while zooming or with a tailwind)
    r.trailT -= dt;
    if (r.trailT <= 0) {
      r.trailT = r.zoomT > 0 ? 0.012 : 0.04;
      const gold = r.zoomT > 0 || r.tail > BROOM.tailShow;
      broomFx(st, r.x - 46 + (broomVR() - 0.5) * 6, r.y + 6 + (broomVR() - 0.5) * 10, -40 - broomVR() * 40, (broomVR() - 0.5) * 30, gold ? 0.55 : 0.4,
        gold ? (broomVR() < 0.5 ? C.gold : '#fff6c8') : (broomVR() < 0.5 ? PCOL[r.id] : '#ffffff'), gold ? 2.8 : 2.2, 0, 'spark');
    }
  }
  // chimney smoke in view
  const cam = st.cam;
  if (broomVR() < dt * 3) {
    const hs = st.c.houses.filter(h => h.chim && h.x > cam.x - 40 && h.x < cam.x + W + 40);
    if (hs.length) { const h = hs[Math.floor(broomVR() * hs.length)]; v.smoke.push({ x: h.chim.x + h.chim.w / 2, y: h.chim.top - 4, t: 0, s: 0.7 + broomVR() * 0.6 }); }
  }
  // blowing leaves in the gusts
  if (st.c.gusts.length) {
    v.leafT -= dt;
    if (v.leafT <= 0) {
      v.leafT = 0.05;
      for (const g of st.c.gusts) if (g.x1 > cam.x && g.x0 < cam.x + W) {
        const lx = clamp(cam.x + broomVR() * W, g.x0 + 10, g.x1 - 10);
        v.leaves.push({ x: lx, y: g.v < 0 ? BROOM.floorY + 10 : BROOM.top - 20, vy: g.v * (1.4 + broomVR() * 0.6), vx: (broomVR() - 0.5) * 40, t: 0, rot: broomVR() * 6, col: ['#ff8a2a', '#d9822b', '#c4572e', '#ffc53d'][Math.floor(broomVR() * 4)] });
      }
    }
    for (const l of v.leaves) { l.t += dt; l.x += l.vx * dt; l.y += l.vy * dt; l.rot += dt * 5; }
    v.leaves = v.leaves.filter(l => l.t < 3 && l.y > 40 && l.y < 520);
  }
}

/* ---------- the tick ---------- */
function broomInput(p) {
  const i = p.input;
  return { climb: !!(i.up || (i.jump && !broomPadJump(p.id))), dive: !!i.down, fast: !!i.right && !i.left, slow: !!i.left && !i.right };
}
// live = the round is live; false during the round-end banner (the brooms fly on by themselves, no rules)
function broomTick(dt, live) {
  const st = G.mst, P = BROOM;
  st.t += dt;
  for (const b of st.c.bats) if (b.hitT > 0) b.hitT = Math.max(0, b.hitT - dt);
  for (const g of st.c.rings) { if (g.flash > 0) g.flash -= dt; if (g.wob > 0) g.wob -= dt; }
  for (const s of st.c.stars) s.t += dt;
  // fresh presses: zoom (the action, or A on a controller)
  for (const r of st.riders) {
    const p = G.players[r.id];
    r.noStarT = (r.noStarT || 0) - dt;
    if (live) {
      const press = p.pendingAct || (p.pendingJump && broomPadJump(r.id));
      if (press) broomZoom(st, r);
      if (r.star) r.holdT += dt;
    }
    p.pendingAct = false; p.pendingJump = false;
  }
  // in versus, who moves first alternates every tick so neither player wins every bump
  const order = G.tickN & 1 ? [st.riders[1], st.riders[0]] : st.riders;
  for (const r of order) {
    const inp = live && r.finT == null ? broomInput(G.players[r.id]) : null;
    broomFly(st, r, inp, dt, live);
    broomRings(st, r, live);
    broomStars(st, r, live);
    broomBats(st, r, live);
  }
  broomBump(st, live);
  broomCatchup(st, dt, live);
  broomCamera(st, dt);
  // the finish line
  for (const r of st.riders) {
    if (r.finT == null && r.x >= st.c.len) {
      const v = Math.max(1, r.v);
      r.finT = st.t - (r.x - st.c.len) / v;
      if (live || (G.match && G.match.phase === 'end')) {
        const rt = r.finT - st.t0;
        if (st.stat.best[r.id] == null || rt < st.stat.best[r.id]) st.stat.best[r.id] = rt;
      }
      st.gateFlash = 0.6;
      if (!st.fin && live) st.fin = { first: r.id, wait: P.finWait };
      Sfx.play('broomGate', r.id);
      for (let k = 0; k < 18; k++) { const a = broomVR() * 6.28, sp = 80 + broomVR() * 200; broomFx(st, st.c.len, r.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.7, ['#ff8a2a', C.gold, PCOL[r.id], '#ffffff'][k % 4], 3.5, 200); }
    }
  }
  st.gateFlash = Math.max(0, (st.gateFlash || 0) - dt);
  broomVisTick(st, dt);
  if (!live) { broomCelebrate(st, dt); return; }
  if (st.fin) {
    st.fin.wait -= dt;
    const [A, B] = st.riders;
    if (st.fin.wait <= 0 || (A.finT != null && B.finT != null)) {
      if (A.finT != null && B.finT != null && Math.abs(A.finT - B.finT) <= P.photo) { matchRoundEnd(-1, 'Photo finish: a dead heat!'); return; }
      const w = A.finT != null && (B.finT == null || A.finT < B.finT) ? 0 : 1, l = st.riders[1 - w];
      // the margin: how long the other broom still needs, at its speed, to reach the gate
      const margin = l.finT != null ? l.finT - st.riders[w].finT : (st.c.len - l.x) / Math.max(60, l.v) + (st.t - st.riders[w].finT);
      if (st.stat.closest == null || margin < st.stat.closest.m) st.stat.closest = { m: margin, w };
      const why = margin < 0.25 ? 'Pumpkin first, by a whisker!' : 'Pumpkin first, by ' + margin.toFixed(1) + ' s!';
      if (matchRoundEnd(w, why)) st.cele = { id: w, t: 0 };
      return;
    }
  }
  // a safety bell: a round that somehow runs this long goes to whoever is farther along
  if (st.t - st.t0 > P.capT) {
    const [A, B] = st.riders;
    matchRoundEnd(Math.abs(A.x - B.x) < 2 ? -1 : A.x > B.x ? 0 : 1, 'Farther along at moonset!');
  }
}
// round won: the winner loops the loop, ghosts cheer
function broomCelebrate(st, dt) {
  const ce = st.cele; if (!ce) return;
  ce.t += dt;
  const w = st.riders[ce.id];
  if (ce.t >= 0.25 && w.loopT < 0) { w.loopT = 0; Sfx.play('broomCheer'); }
}

MODES.broom = {
  rand: Math.random,
  setup(st, L) {
    for (const row of L.grid) row.fill('.');
    st.stat = { rings: [0, 0], stars: [0, 0], zooms: [0, 0], squeaks: [0, 0], bowled: [0, 0], trains: [0, 0], boings: [0, 0], tails: [0, 0], best: [null, null], closest: null, bumps: 0 };
    const mix = BROOM_MIX.slice();
    for (let i = mix.length - 1; i > 0; i--) { const j = Math.floor(this.rand() * (i + 1)); [mix[i], mix[j]] = [mix[j], mix[i]]; }
    st.order = ['plain', ...mix];
    st.forceTwist = this.testTwist || null;
    st.vis = broomVisNew();
  },
  resetRound(n, info) {
    const st = G.mst, m = G.match;
    st.sd = !!info.suddenDeath;
    st.twist = info.suddenDeath ? 'photo' : (st.forceTwist || st.order[Math.min(n, st.order.length) - 1]);
    st.c = broomBuild(st.twist, () => this.rand());
    st.riders = [0, 1].map(k => broomMakeRider(k));
    st.t = 0; st.t0 = 0; st.fin = null; st.cele = null; st.gateFlash = 0; st.goldSaid = false;
    st.vis = broomVisNew();
    st.cam = { x: 0, px: null, v: 0 };
    // a player 2+ rounds behind starts with a gold star (not in a sudden-death sprint)
    const lead = m.wins[0] - m.wins[1];
    for (const k of [0, 1]) { const behind = k === 0 ? -lead : lead; st.riders[k].goldStart = !info.suddenDeath && behind >= BROOM.goldMin; if (st.riders[k].goldStart) st.riders[k].star = 2; }
    // the brooms are the players: hide the platformer bodies every round (matchResetPlayers revives them)
    for (const p of G.players) Object.assign(p, { alive: false, respawnT: Infinity });
  },
  go() {
    const st = G.mst; st.t0 = st.t;
    for (const r of st.riders) for (let k = 0; k < 8; k++) broomFx(st, r.x - 40, r.y + 6, -80 - broomVR() * 120, (broomVR() - 0.5) * 80, 0.5, k % 2 ? PCOL[r.id] : '#ffffff', 3, 0, 'spark');
    Sfx.play('broomWhoosh');
  },
  step(dt) { broomTick(dt, true); },
  idle(dt) {
    const st = G.mst, m = G.match; if (!st.riders) return;
    if (m.phase === 'end' && m.end && m.end.winner >= 0 && !st.cele) st.cele = { id: m.end.winner, t: 0 };
    if (m.phase === 'end') { broomTick(dt, false); return; }
    // before GO: hovering at the start, bats flutter, rings bob
    st.t += dt;
    for (const r of st.riders) { r.flap += dt * 6; broomClearPress(G.players[r.id]); }
    broomVisTick(st, dt);
    broomCamera(st, dt, true);
    if (m.phase === 'count' && !st.goldSaid && m.t >= 0.05) {
      st.goldSaid = true;
      for (const r of st.riders) if (r.goldStart) { Sfx.play('broomGold', r.id); for (let k = 0; k < 10; k++) { const a = broomVR() * 6.28; broomFx(st, r.x, r.y - 34, Math.cos(a) * 90, Math.sin(a) * 90, 0.5, C.gold, 3, 0); } }
    }
  },
  tiebreak() {
    const s = G.mst.stat.rings; if (s[0] === s[1]) return -1;
    return { winner: s[0] > s[1] ? 0 : 1, reason: 'Most clean rings this match!' };
  },
  draw() { broomDrawWorld(); },
  drawTop() { broomDrawTop(); },
  hud() { broomHud(); },
  stats() {
    const s = G.mst.stat, f = t => (t == null ? '–' : t.toFixed(1)), g = t => (t == null ? '–' : String(Math.round(t)));
    const out = [
      { label: 'Clean rings', values: s.rings.slice() },
      { label: 'Stars zoomed', values: s.zooms.slice() },
      { label: 'Bat squeaks', values: s.squeaks.slice() },
      // whole seconds here ("22.1 – 20.5" wraps onto two lines in a desktop tile); the line below gives the tenths
      { label: 'Best secs', values: [g(s.best[0]), g(s.best[1])] },
    ];
    const fast = s.best[0] == null && s.best[1] == null ? null : s.best[1] == null || (s.best[0] != null && s.best[0] <= s.best[1]) ? 0 : 1;
    const fastTxt = fast == null ? '' : ' Fastest: ' + NAMES[fast] + ', ' + f(s.best[fast]) + ' s.';
    if (s.closest) out.push((s.closest.m < 0.25 ? 'Closest finish: ' + NAMES[s.closest.w] + ' by a whisker!' : 'Closest finish: ' + NAMES[s.closest.w] + ' by ' + s.closest.m.toFixed(1) + ' s.') + fastTxt);
    else if (fastTxt) out.push(fastTxt.trim());
    const tr = s.trains[0] + s.trains[1], bw = s.bowled[0] + s.bowled[1];
    if (tr > 0) out.push('Whole ring trains: ' + tr + '!');
    else if (bw > 0) out.push('Bats bowled over by a zoom: ' + bw + ' (they loved it).');
    return out;
  },
  // test access for the bot harness (no window globals)
  test: { BROOM, BROOM_TWISTS, build: broomBuild, groundY: broomGroundY, floorAt: broomFloorAt, ringY: broomRingY, batPos: broomBatPos, gustAt: broomGustAt },
};
// nothing pressed before GO carries into the race
function broomClearPress(p) { p.pendingAct = false; p.pendingJump = false; }

/* ---------- drawing ---------- */
function broomStarShape(x, y, r, col, rot = 0) {
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + rot + i * Math.PI / 5, q = i % 2 ? r * 0.48 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  ctx.closePath(); ctx.fill();
}
function broomDrawSky(st) {
  const cam = st.cam;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1d1640'); g.addColorStop(0.45, '#3b2766'); g.addColorStop(0.8, '#8a4a78'); g.addColorStop(1, '#e8845a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // twinkly stars
  for (let i = 0; i < 70; i++) {
    const sx = ((i * 137.5 - cam.x * 0.02) % W + W) % W, sy = 8 + (i * 61) % 300, tw = 0.45 + 0.55 * Math.abs(Math.sin(G.clock * (0.8 + (i % 5) * 0.3) + i));
    ctx.globalAlpha = tw * (sy < 220 ? 1 : 0.5); ctx.fillStyle = i % 7 ? '#fff6dc' : '#ffd77a';
    if (i % 9 === 0) broomStarShape(sx, sy, 3.2, ctx.fillStyle, 0); else { circle(sx, sy, i % 3 ? 1.1 : 1.6); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  // the big orange harvest moon, with a sleepy smile
  const mx = 690 - ((cam.x * 0.025) % 1400), my = 150;
  if (mx > -140) {
    const gl = ctx.createRadialGradient(mx, my, 70, mx, my, 190);
    gl.addColorStop(0, 'rgba(255,170,90,0.42)'); gl.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.fillStyle = gl; circle(mx, my, 190); ctx.fill();
    ctx.fillStyle = '#ffb45e'; circle(mx, my, 86); ctx.fill();
    ctx.fillStyle = '#ffc57a'; circle(mx - 18, my - 20, 64); ctx.fill();
    ctx.fillStyle = 'rgba(214,120,58,0.35)';
    for (const [cx, cy, cr] of [[-40, 30, 13], [30, 42, 9], [44, -30, 11], [-10, -52, 7], [52, 12, 6]]) { circle(mx + cx, my + cy, cr); ctx.fill(); }
    ctx.strokeStyle = 'rgba(150,70,40,0.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(mx - 24, my - 4, 9, 0.25, Math.PI - 0.25); ctx.stroke();
    ctx.beginPath(); ctx.arc(mx + 22, my - 4, 9, 0.25, Math.PI - 0.25); ctx.stroke();
    ctx.beginPath(); ctx.arc(mx, my + 18, 16, 0.4, Math.PI - 0.4); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = 'rgba(255,120,120,0.25)'; circle(mx - 40, my + 14, 9); ctx.fill(); circle(mx + 40, my + 14, 9); ctx.fill();
  }
  // wispy clouds drifting
  ctx.fillStyle = 'rgba(200,170,230,0.16)';
  for (let i = 0; i < 6; i++) {
    const cx = ((i * 260 - cam.x * 0.06 - G.clock * 6) % (W + 300) + W + 300) % (W + 300) - 150, cy = 70 + (i * 47) % 190;
    ctx.beginPath(); ctx.ellipse(cx, cy, 90, 13, 0, 0, Math.PI * 2); ctx.ellipse(cx + 40, cy - 8, 55, 11, 0, 0, Math.PI * 2); ctx.fill();
  }
  // far hills with a crooked little manor and tiny bats
  const off = cam.x * 0.12;
  ctx.fillStyle = '#4a3070'; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 360 + Math.sin((x + off) * 0.006 + 1.2) * 28 + Math.sin((x + off) * 0.017) * 10);
  ctx.lineTo(W, H); ctx.fill();
  const MW = 1500, mxp = ((900 - off) % MW + MW) % MW - 200;
  ctx.fillStyle = '#3a2560';
  ctx.fillRect(mxp, 300, 60, 60); ctx.fillRect(mxp + 46, 280, 22, 80);
  ctx.beginPath(); ctx.moveTo(mxp - 6, 302); ctx.lineTo(mxp + 30, 272); ctx.lineTo(mxp + 66, 302); ctx.fill();
  ctx.beginPath(); ctx.moveTo(mxp + 42, 282); ctx.lineTo(mxp + 57, 254); ctx.lineTo(mxp + 72, 282); ctx.fill();
  ctx.fillStyle = 'rgba(255,215,122,0.8)'; ctx.fillRect(mxp + 12, 316, 8, 10); ctx.fillRect(mxp + 34, 316, 8, 10); ctx.fillRect(mxp + 53, 292, 6, 8);
  for (let i = 0; i < 3; i++) {
    const bx = ((i * 330 - cam.x * 0.1 + G.clock * (14 + i * 5)) % (W + 100) + W + 100) % (W + 100) - 50, by = 120 + i * 50 + Math.sin(G.clock * 2 + i) * 10, f = Math.sin(G.clock * 12 + i * 2) * 4;
    ctx.strokeStyle = 'rgba(40,24,70,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx - 7, by - f); ctx.quadraticCurveTo(bx - 3, by + 2, bx, by); ctx.quadraticCurveTo(bx + 3, by + 2, bx + 7, by - f); ctx.stroke();
  }
  // a row of far houses with lit windows
  const off2 = cam.x * 0.32, RW = 120;
  ctx.fillStyle = '#2f2050';
  for (let i = -1; i < W / RW + 2; i++) {
    const k = Math.floor(off2 / RW) + i, x = k * RW - off2, h = 50 + broomHash(k, 3) * 50, w = 70 + broomHash(k, 4) * 40;
    ctx.fillStyle = '#2f2050'; ctx.fillRect(x, 470 - h, w, h + 40);
    ctx.beginPath(); ctx.moveTo(x - 6, 472 - h); ctx.lineTo(x + w / 2, 440 - h - broomHash(k, 5) * 20); ctx.lineTo(x + w + 6, 472 - h); ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,150,0.16)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 6, 472 - h); ctx.lineTo(x + w / 2, 440 - h - broomHash(k, 5) * 20); ctx.stroke();
    ctx.fillStyle = 'rgba(255,215,122,0.55)';
    for (let j = 0; j < 3; j++) if (broomHash(k, j + 9) > 0.45) ctx.fillRect(x + 10 + j * (w - 26) / 2, 486 - h, 6, 8);
  }
}
// a house's still picture (walls, windows, door, roof, chimney) painted on g in world coordinates; the cat (its tail
// swishes) and the lantern (it flickers) are drawn live over it by broomDrawHouse
function broomPaintHouse(g, h) {
  const K = BROOM_COLS, x = h.x, w = h.w, y0 = h.wallTop, base = BROOM.street;
  // walls
  g.fillStyle = K.wall[h.col]; g.fillRect(x, y0, w, base - y0 + 40);
  // clapboard siding, a stone footing and the soft shadow under the eaves
  g.fillStyle = 'rgba(20,10,40,0.16)'; for (let yy = y0 + 9; yy < base; yy += 9) g.fillRect(x, yy, w, 1.4);
  g.fillStyle = 'rgba(255,255,255,0.04)'; for (let yy = y0 + 10.4; yy < base; yy += 9) g.fillRect(x, yy, w, 1);
  g.fillStyle = 'rgba(20,10,40,0.3)'; g.fillRect(x, y0, w, 6);
  // a little moss and weather streaks under the eaves
  g.fillStyle = 'rgba(20,10,40,0.12)'; for (let k = 0; k < 3; k++) { const sx = x + 10 + broomHash(h.seed, k + 40) * (w - 20); g.fillRect(sx, y0 + 6, 2, 10 + broomHash(h.seed, k + 50) * 18); }
  g.fillStyle = '#3a2a4a'; g.fillRect(x - 2, base - 8, w + 4, 8);
  g.fillStyle = 'rgba(255,255,255,0.08)'; for (let bx = x + (h.seed % 9); bx < x + w - 6; bx += 16) g.fillRect(bx, base - 7, 10, 2);
  g.fillStyle = 'rgba(10,5,20,0.45)'; for (let bx = x + (h.seed % 9) - 3; bx < x + w; bx += 16) g.fillRect(bx, base - 8, 1.2, 8);
  g.fillRect(x - 2, base - 4.4, w + 4, 0.8);
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x - 2, base - 8, w + 4, 1);
  g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x, y0, 6, base - y0);
  g.fillStyle = 'rgba(20,10,40,0.25)'; g.fillRect(x + w - 8, y0, 8, base - y0);
  // corner boards with a lit edge and nail heads
  const wallC = K.wall[h.col];
  g.fillStyle = tint(wallC, 0.12); g.fillRect(x, y0 + 4, 4, base - y0 - 12); g.fillStyle = shade(wallC, 0.35); g.fillRect(x + w - 4, y0 + 4, 4, base - y0 - 12);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x, y0 + 4, 1, base - y0 - 12);
  g.fillStyle = 'rgba(10,5,20,0.4)'; for (let yy = y0 + 14; yy < base - 10; yy += 18) { g.fillRect(x + 1.5, yy, 1, 1); g.fillRect(x + w - 2.5, yy, 1, 1); }
  // windows (lit, with a cross frame) and a door
  const nw = Math.max(1, Math.floor((w - 30) / 44));
  for (let i = 0; i < nw; i++) {
    const wx = x + 18 + i * (w - 36) / Math.max(1, nw) + ((w - 36) / Math.max(1, nw) - 20) / 2, wy = y0 + 14, lit = broomHash(h.seed, i) > 0.25;
    if (w > 70 && broomHash(h.seed, i + 60) > 0.4) {   // shutters
      const sc = shade(K.wall[h.col], 0.45);
      for (const sx of [wx - 11, wx + 23]) { g.fillStyle = sc; g.fillRect(sx, wy - 2, 8, 26); g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(sx, wy - 2, 8, 1); g.fillStyle = 'rgba(10,5,20,0.35)'; for (let yy = wy + 2; yy < wy + 22; yy += 4) g.fillRect(sx + 1, yy, 6, 1); }
    }
    g.fillStyle = 'rgba(20,10,40,0.45)'; rrOn(g, wx - 3, wy - 3, 26, 28, 4); g.fill();
    g.fillStyle = 'rgba(255,230,200,0.22)'; g.fillRect(wx - 4, wy + 23, 28, 3);
    g.fillStyle = lit ? K.win : K.winDk; rrOn(g, wx, wy, 20, 22, 3); g.fill();
    if (lit) { g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(wx + 2.5, wy + 2.5, 5, 6); }
    if (lit) { g.fillStyle = 'rgba(255,215,122,0.18)'; circleOn(g, wx + 10, wy + 11, 20); g.fill(); }
    g.strokeStyle = 'rgba(30,20,50,0.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(wx + 10, wy); g.lineTo(wx + 10, wy + 22); g.moveTo(wx, wy + 11); g.lineTo(wx + 20, wy + 11); g.stroke();
    g.fillStyle = '#3a2a4a'; g.fillRect(wx - 5, wy + 23, 30, 3); g.fillStyle = 'rgba(255,230,200,0.3)'; g.fillRect(wx - 5, wy + 23, 30, 1);
    if (lit && broomHash(h.seed, i + 5) > 0.8) { // a little ghost peeking out of a window
      g.fillStyle = '#f6f0ff'; g.beginPath(); g.arc(wx + 6, wy + 14, 5, Math.PI, 0); g.lineTo(wx + 11, wy + 21); g.lineTo(wx + 1, wy + 21); g.fill();
      g.fillStyle = C.ink; circleOn(g, wx + 4.5, wy + 14, 1); g.fill(); circleOn(g, wx + 7.5, wy + 14, 1); g.fill();
    }
  }
  if (base - y0 > 60) { g.fillStyle = 'rgba(20,10,40,0.4)'; rrOn(g, x + w * 0.5 - 12, base - 33, 24, 33, 9); g.fill(); g.fillStyle = '#2a1c30'; rrOn(g, x + w * 0.5 - 9, base - 30, 18, 30, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + w * 0.5, base - 28); g.lineTo(x + w * 0.5, base); g.stroke();
    g.strokeStyle = 'rgba(10,5,20,0.5)'; g.strokeRect(x + w * 0.5 - 6.5, base - 22, 5, 8); g.strokeRect(x + w * 0.5 + 1.5, base - 22, 5, 8); g.strokeRect(x + w * 0.5 - 6.5, base - 11, 5, 8); g.strokeRect(x + w * 0.5 + 1.5, base - 11, 5, 8);
    g.strokeStyle = 'rgba(255,220,180,0.18)'; g.beginPath(); g.arc(x + w * 0.5, base - 23, 9, Math.PI * 1.1, Math.PI * 1.6); g.stroke();
    g.fillStyle = '#4a3a5a'; g.fillRect(x + w * 0.5 - 14, base - 3, 28, 3); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(x + w * 0.5 - 14, base - 3, 28, 0.8);
    g.fillStyle = '#a8802a'; circleOn(g, x + w * 0.5 + 4.4, base - 14.6, 1.9); g.fill(); g.fillStyle = C.gold; circleOn(g, x + w * 0.5 + 4, base - 15, 1.6); g.fill(); }
  // roof
  g.fillStyle = K.roof[h.roofCol];
  if (h.flat) {
    g.fillRect(x - 6, y0 - 8, w + 12, 10); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x - 6, y0 - 8, w + 12, 3);
    g.fillStyle = 'rgba(10,5,20,0.4)'; for (let bx = x - 6 + 14; bx < x + w + 6; bx += 16) g.fillRect(bx, y0 - 8, 1.2, 10);
    g.fillRect(x - 6, y0 + 1, w + 12, 1);
    g.fillStyle = 'rgba(255,200,140,0.22)'; g.fillRect(x - 6, y0 - 8, w + 12, 1);
  }
  else {
    g.beginPath(); g.moveTo(x - 10, y0 + 2); g.lineTo(x + w / 2, h.peak); g.lineTo(x + w + 10, y0 + 2); g.closePath(); g.fill();
    g.fillStyle = 'rgba(20,10,40,0.22)'; g.beginPath(); g.moveTo(x + w / 2, h.peak); g.lineTo(x + w + 10, y0 + 2); g.lineTo(x + w / 2, y0 + 2); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(20,10,40,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 10, y0 + 2); g.lineTo(x + w + 10, y0 + 2); g.stroke();
    g.save(); g.beginPath(); g.moveTo(x - 10, y0 + 2); g.lineTo(x + w / 2, h.peak); g.lineTo(x + w + 10, y0 + 2); g.closePath(); g.clip();
    const rows = Math.max(3, Math.round((y0 - h.peak) / 8)), rh = (y0 + 2 - h.peak) / rows, sw = 9;
    g.fillStyle = 'rgba(255,255,255,0.05)'; g.beginPath();
    for (let k = 0; k < rows; k++) if (k % 2) { const yy = h.peak + k * rh; g.rect(x - 10, yy, w + 20, rh); }
    g.fill();
    // the scallops: each shingle's round foot, a dark line under it and a lit lip
    g.strokeStyle = 'rgba(10,5,25,0.45)'; g.lineWidth = 1.1; g.beginPath();
    for (let k = 1; k <= rows; k++) { const yy = h.peak + k * rh, off = (k % 2) * sw / 2; for (let sx = x - 10 - off; sx < x + w + 10; sx += sw) { g.moveTo(sx, yy - 2); g.quadraticCurveTo(sx + sw / 2, yy + 1.5, sx + sw, yy - 2); } }
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.1)'; g.lineWidth = 0.9; g.beginPath();
    for (let k = 1; k <= rows; k++) { const yy = h.peak + k * rh, off = (k % 2) * sw / 2; for (let sx = x - 10 - off; sx < x + w + 10; sx += sw) { g.moveTo(sx + 2, yy - rh + 1.5); g.lineTo(sx + sw - 2, yy - rh + 1.5); } }
    g.stroke();
    // a few odd shingles: a darker one, a slipped one
    g.fillStyle = 'rgba(10,5,25,0.25)';
    for (let k = 0; k < 4; k++) { const rr2 = 1 + Math.floor(broomHash(h.seed, k + 70) * (rows - 1)), yy = h.peak + rr2 * rh, sx = x + broomHash(h.seed, k + 80) * w; g.fillRect(sx, yy - rh + 1, sw - 1, rh - 2); }
    g.restore();
    // fascia board along the eaves and a ridge cap
    g.fillStyle = shade(K.roof[h.roofCol], 0.4); g.fillRect(x - 10, y0 + 1, w + 20, 3);
    g.fillStyle = 'rgba(255,200,140,0.18)'; g.fillRect(x - 10, y0 + 1, w + 20, 0.8);
    g.fillStyle = shade(K.roof[h.roofCol], 0.3); circleOn(g, x + w / 2, h.peak + 1, 2.6); g.fill();
    g.strokeStyle = 'rgba(255,200,140,0.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 10, y0 + 2); g.lineTo(x + w / 2, h.peak); g.stroke(); // moonlit edge
    if (h.peak < y0 - 50) {   // attic window, framed with a cross bar
      g.fillStyle = shade(K.roof[h.roofCol], 0.5); circleOn(g, x + w / 2, h.peak + 26, 8.5); g.fill();
      g.fillStyle = h.seed % 2 ? K.win : 'rgba(255,215,122,0.75)'; circleOn(g, x + w / 2, h.peak + 26, 6); g.fill();
      g.strokeStyle = 'rgba(30,20,50,0.7)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x + w / 2 - 6, h.peak + 26); g.lineTo(x + w / 2 + 6, h.peak + 26); g.moveTo(x + w / 2, h.peak + 20); g.lineTo(x + w / 2, h.peak + 32); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.4)'; circleOn(g, x + w / 2 - 2.5, h.peak + 23.5, 1.4); g.fill();
    }
  }
  if (h.chim) {
    const c = h.chim;
    g.fillStyle = '#7a4a5a'; g.fillRect(c.x, c.top, c.w, y0 - c.top);
    g.fillStyle = 'rgba(20,10,30,0.3)'; g.fillRect(c.x + c.w - 4, c.top, 4, y0 - c.top);
    g.fillStyle = 'rgba(255,200,160,0.18)'; g.fillRect(c.x, c.top, 2, y0 - c.top);
    g.fillStyle = '#5a3444'; g.fillRect(c.x - 3, c.top - 2, c.w + 6, 7);
    g.strokeStyle = 'rgba(30,10,20,0.35)'; g.lineWidth = 1;
    for (let yy = c.top + 12; yy < y0; yy += 9) { g.beginPath(); g.moveTo(c.x, yy); g.lineTo(c.x + c.w, yy); g.stroke(); }
    g.beginPath();
    for (let yy = c.top + 3, k = 0; yy < y0; yy += 9, k++) for (let bx = c.x + (k % 2 ? 4 : 9); bx < c.x + c.w - 1; bx += 10) { g.moveTo(bx + 0.5, Math.max(c.top + 5, yy)); g.lineTo(bx + 0.5, Math.min(y0, yy + 9)); }
    g.stroke();
    g.fillStyle = 'rgba(255,200,160,0.1)'; for (let yy = c.top + 13; yy < y0; yy += 9) g.fillRect(c.x, yy, c.w, 1);
    g.fillStyle = 'rgba(30,10,20,0.18)'; for (let k = 0; k < 3; k++) { const bx = c.x + broomHash(h.seed, k + 90) * (c.w - 8), by = c.top + 14 + broomHash(h.seed, k + 95) * Math.max(1, y0 - c.top - 24); g.fillRect(bx, by, 8, 7); }
    g.fillStyle = '#5a3444'; g.fillRect(c.x - 3, c.top - 2, c.w + 6, 7);
    g.fillStyle = 'rgba(255,200,160,0.3)'; g.fillRect(c.x - 3, c.top - 2, c.w + 6, 1.2);
    g.fillStyle = 'rgba(20,5,15,0.4)'; g.fillRect(c.x - 3, c.top + 4, c.w + 6, 1);
    g.fillStyle = '#1a0f1a'; g.fillRect(c.x + 2, c.top - 2, c.w - 4, 2);
  }
}
// still pictures of houses and tree crowns, made with the rk kit's picture maker (copied on whole pixels without
// smoothing) and kept only while near the screen: a course has about 60 houses, too many to keep them all
const BROOM_PICS = new Map();
function broomPic(key, w, h, ox, oy, paint) {
  const sc = Math.max(1, Math.min(3, canvas.width / W));
  let sp = BROOM_PICS.get(key);
  if (sp && sp.sc === sc) { BROOM_PICS.delete(key); BROOM_PICS.set(key, sp); return sp; }
  sp = rkPic(key, w, h, ox, oy, paint); _sprites.delete('rk|' + key); sp.sc = sc;
  BROOM_PICS.delete(key); BROOM_PICS.set(key, sp);
  while (BROOM_PICS.size > 24) BROOM_PICS.delete(BROOM_PICS.keys().next().value);
  return sp;
}
function broomDrawHouse(h) {
  const x = h.x, w = h.w, y0 = h.wallTop, base = BROOM.street;
  // the picture's box: the roof overhangs 10 px each side; the top is the roof peak, flat roof or chimney cap
  const top = Math.floor(Math.min(h.flat ? y0 - 8 : h.peak, h.chim ? h.chim.top - 2 : 1e9)) - 6, x0 = Math.floor(x) - 16;
  const key = 'broomHouse|' + [x, w, y0, h.peak, h.flat ? 1 : 0, h.col, h.roofCol, h.seed, h.chim ? h.chim.x + ',' + h.chim.w + ',' + h.chim.top : '-'].join('|');
  blitSprite(broomPic(key, Math.ceil(x + w) + 16 - x0, base + 46 - top, 0, 0, g => { g.translate(-x0, -top); broomPaintHouse(g, h); }), x0, top);
  if (h.cat) { // a black cat on the roof, tail curling
    const cx = x + w * 0.72, cy = h.peak + (y0 - h.peak) * 0.44 * 2 * 0.5 + 2;
    ctx.fillStyle = '#161026'; ctx.beginPath(); ctx.ellipse(cx, cy - 6, 8, 6, 0, 0, Math.PI * 2); ctx.fill(); circle(cx + 6, cy - 14, 5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 2, cy - 17); ctx.lineTo(cx + 3, cy - 23); ctx.lineTo(cx + 6, cy - 18); ctx.moveTo(cx + 7, cy - 18); ctx.lineTo(cx + 10, cy - 23); ctx.lineTo(cx + 11, cy - 16); ctx.fill();
    ctx.strokeStyle = '#161026'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - 7, cy - 4); ctx.quadraticCurveTo(cx - 16, cy - 8 + Math.sin(G.clock * 2) * 3, cx - 12, cy - 18); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = '#c8ff6a'; circle(cx + 4.5, cy - 15, 1.2); ctx.fill(); circle(cx + 8, cy - 15, 1.2); ctx.fill();
  }
  if (h.lantern) broomDrawPumpkin(h.lantern < 0 ? x + 16 : x + w - 18, base - 8, 9, true);
}
function broomDrawPumpkin(x, y, r, lit) {
  const K = BROOM_COLS;
  ctx.fillStyle = K.pumpkin; ctx.beginPath(); ctx.ellipse(x, y, r * 1.2, r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = K.pumpkinDk; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, y, r * 0.45, r, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = K.stem; ctx.fillRect(x - 1.5, y - r - 4, 3, 5);
  if (lit) {
    const fl = 0.8 + 0.2 * Math.sin(G.clock * 9 + x);
    ctx.fillStyle = 'rgba(255,215,122,' + (0.25 * fl) + ')'; circle(x, y, r * 2.2); ctx.fill();
    ctx.fillStyle = '#ffe28a';
    ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.15); ctx.lineTo(x - r * 0.3, y - r * 0.55); ctx.lineTo(x - r * 0.1, y - r * 0.15); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + r * 0.1, y - r * 0.15); ctx.lineTo(x + r * 0.3, y - r * 0.55); ctx.lineTo(x + r * 0.6, y - r * 0.15); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - r * 0.6, y + r * 0.2); ctx.quadraticCurveTo(x, y + r * 0.8, x + r * 0.6, y + r * 0.2); ctx.quadraticCurveTo(x, y + r * 0.45, x - r * 0.6, y + r * 0.2); ctx.fill();
  }
}
// a tree's still picture (trunk and crown) painted on g in world coordinates; the owl (it blinks) is drawn live
function broomPaintTree(g, t) {
  const cols = [['#8a3a2e', '#a84a32'], ['#9a5a24', '#b87030'], ['#5a3a6a', '#704a82']][t.col];
  g.fillStyle = '#2e1f2e'; g.beginPath(); g.moveTo(t.x - 7, BROOM.street + 10); g.lineTo(t.x - 4, t.y); g.lineTo(t.x + 4, t.y); g.lineTo(t.x + 8, BROOM.street + 10); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(t.x - 2, BROOM.street + 6); g.lineTo(t.x - 1, t.y + t.r * 0.6); g.moveTo(t.x + 3, BROOM.street + 2); g.lineTo(t.x + 2, t.y + t.r * 0.7); g.stroke();
  g.fillStyle = 'rgba(255,220,200,0.12)'; g.fillRect(t.x - 5, t.y + t.r * 0.5, 1.5, BROOM.street - t.y - t.r * 0.5);
  g.fillStyle = cols[0]; circleOn(g, t.x, t.y, t.r); g.fill();
  // leaf clumps round the edge
  for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2 + (t.seed || 1) * 0.1, q = broomHash(t.seed || 1, k + 50); g.fillStyle = k % 3 ? cols[0] : cols[1]; circleOn(g, t.x + Math.cos(a) * t.r * 0.86, t.y + Math.sin(a) * t.r * 0.86, t.r * (0.22 + q * 0.12)); g.fill(); }
  g.fillStyle = 'rgba(20,10,40,0.25)'; g.beginPath(); g.arc(t.x, t.y, t.r, 0.1, Math.PI - 0.1); g.fill();
  g.fillStyle = cols[1]; circleOn(g, t.x - t.r * 0.3, t.y - t.r * 0.3, t.r * 0.62); g.fill(); circleOn(g, t.x + t.r * 0.4, t.y - t.r * 0.1, t.r * 0.45); g.fill();
  g.fillStyle = 'rgba(255,220,180,0.14)'; circleOn(g, t.x - t.r * 0.42, t.y - t.r * 0.45, t.r * 0.3); g.fill();
  g.strokeStyle = shade(cols[0], 0.4); g.lineWidth = 1; g.beginPath();
  for (let k = 0; k < 6; k++) { const q = broomHash(t.seed || 1, k + 60), a = q * Math.PI * 2, rr2 = t.r * (0.3 + broomHash(t.seed || 1, k + 66) * 0.5), lx = t.x + Math.cos(a) * rr2, ly = t.y + Math.sin(a) * rr2; g.moveTo(lx - 2.5, ly + 1); g.quadraticCurveTo(lx, ly - 2, lx + 2.5, ly + 1); }
  g.stroke();
  g.fillStyle = cols[1]; for (let k = 0; k < 4; k++) { const q = broomHash(t.seed || 1, k + 20); circleOn(g, t.x - t.r * 0.8 + q * t.r * 1.6, t.y + t.r * 0.2 + broomHash(t.seed || 1, k + 30) * t.r * 0.5, 2.2); g.fill(); }
}
function broomDrawTree(t) {
  const x0 = Math.floor(t.x - t.r * 1.2) - 4, y0 = Math.floor(t.y - t.r * 1.2) - 4;
  const key = 'broomTree|' + [t.x, t.y, t.r, t.col, t.seed].join('|');
  blitSprite(broomPic(key, Math.ceil(t.x + t.r * 1.2) + 4 - x0, BROOM.street + 14 - y0, 0, 0, g => { g.translate(-x0, -y0); broomPaintTree(g, t); }), x0, y0);
  if (t.owl) { // a cute owl on a branch, blinking
    const ox = t.x + (t.seed % 2 ? 10 : -12), oy = t.y + 4;
    ctx.strokeStyle = '#2e1f2e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(t.x, oy + 9); ctx.lineTo(ox + (t.seed % 2 ? 14 : -14), oy + 7); ctx.stroke();
    ctx.fillStyle = '#8a6a4a'; ctx.beginPath(); ctx.ellipse(ox, oy, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8a880'; ctx.beginPath(); ctx.ellipse(ox, oy + 3, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a6a4a'; ctx.beginPath(); ctx.moveTo(ox - 7, oy - 6); ctx.lineTo(ox - 5, oy - 13); ctx.lineTo(ox - 2, oy - 8); ctx.moveTo(ox + 7, oy - 6); ctx.lineTo(ox + 5, oy - 13); ctx.lineTo(ox + 2, oy - 8); ctx.fill();
    const blink = ((G.clock + t.seed * 0.01) % 3.3) < 0.14;
    for (const ex of [-3.5, 3.5]) {
      if (blink) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ox + ex - 2.5, oy - 3); ctx.lineTo(ox + ex + 2.5, oy - 3); ctx.stroke(); }
      else { ctx.fillStyle = '#fff6c8'; circle(ox + ex, oy - 3, 3.3); ctx.fill(); ctx.fillStyle = C.ink; circle(ox + ex, oy - 3, 1.7); ctx.fill(); }
    }
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(ox - 1.5, oy); ctx.lineTo(ox + 1.5, oy); ctx.lineTo(ox, oy + 3); ctx.fill();
  }
}
function broomDrawWind(st) {
  const c = st.c, cam = st.cam;
  for (const g of c.gusts) {
    if (g.x1 < cam.x || g.x0 > cam.x + W) continue;
    const up = g.v < 0;
    ctx.fillStyle = up ? 'rgba(160,230,255,0.07)' : 'rgba(255,190,240,0.07)'; ctx.fillRect(g.x0, BROOM.top - 20, g.x1 - g.x0, BROOM.floorY - BROOM.top + 40);
    // streaks moving with the gust
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < Math.floor((g.x1 - g.x0) / 40); i++) {
      const sx = g.x0 + 20 + i * 40 + Math.sin(i * 7.1) * 10, ph = ((G.clock * Math.abs(g.v) * 1.6 + i * 97) % 420);
      const sy = up ? BROOM.floorY - ph : BROOM.top - 20 + ph;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 6, sy + (up ? 18 : -18), sx, sy + (up ? 36 : -36)); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    // big chevrons at the zone's edges
    for (const ax of [g.x0 + 40, (g.x0 + g.x1) / 2, g.x1 - 40]) for (let j = 0; j < 2; j++) {
      const ay = (up ? 300 : 200) + (up ? -1 : 1) * (((G.clock * 60) % 40) + j * 22);
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 - j * 0.12) + ')'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(ax - 14, ay + (up ? 8 : -8)); ctx.lineTo(ax, ay); ctx.lineTo(ax + 14, ay + (up ? 8 : -8)); ctx.stroke();
    }
  }
  for (const l of st.vis.leaves) {
    ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.rot); ctx.fillStyle = l.col;
    ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}
function broomDrawWorld() {
  const st = G.mst; if (!st.c || !st.cam) return;
  const cam = st.cam, c = st.c;
  broomDrawSky(st);
  ctx.save(); ctx.translate(-cam.x, 0);
  // chimney smoke behind the houses
  for (const s of st.vis.smoke) { const k = s.t / 2.4; ctx.fillStyle = 'rgba(200,185,225,' + (0.32 * (1 - k)) + ')'; circle(s.x + k * 30 + Math.sin(k * 6) * 5, s.y - k * 70, (5 + k * 14) * s.s); ctx.fill(); }
  for (const t of c.trees) if (t.x + t.r > cam.x - 10 && t.x - t.r < cam.x + W + 10) broomDrawTree(t);
  for (const h of c.houses) if (h.x + h.w > cam.x - 20 && h.x < cam.x + W + 20) broomDrawHouse(h);
  // the street with a little fence
  ctx.fillStyle = '#241838'; ctx.fillRect(cam.x - 10, BROOM.street, W + 20, H - BROOM.street);
  ctx.fillStyle = '#33244a'; ctx.fillRect(cam.x - 10, BROOM.street, W + 20, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let x = Math.floor(cam.x / 26) * 26 - 26; x < cam.x + W + 26; x += 26) for (let r = 0; r < 3; r++) { const yy = BROOM.street + 9 + r * 9; if (yy > H - 22) break; ctx.fillRect(x + (r % 2) * 13, yy, 20, 6); }
  ctx.strokeStyle = '#463560'; ctx.lineWidth = 3;
  const fx0 = Math.floor(cam.x / 22) * 22;
  for (let x = fx0; x < cam.x + W + 22; x += 22) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x, H - 18); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(cam.x - 10, H - 12); ctx.lineTo(cam.x + W + 10, H - 12); ctx.stroke();
  // (no pumpkins along the fence: that band is under the HUD, and one peeking past the course map looked like part of it)
  // the start sign
  if (BROOM.startX + 60 > cam.x - 80 && BROOM.startX < cam.x + W) {
    const sx = BROOM.startX + 48, gy = broomGroundY(c, sx);
    ctx.fillStyle = '#6b4630'; ctx.fillRect(sx - 2, gy - 50, 4, 50);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(sx - 2, gy - 50, 1, 50);
    ctx.fillStyle = 'rgba(20,10,30,0.3)'; rr(sx - 28, gy - 64, 60, 22, 6); ctx.fill();
    ctx.fillStyle = '#c98650'; rr(sx - 30, gy - 66, 60, 22, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(120,70,30,0.4)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(sx - 26, gy - 60); ctx.quadraticCurveTo(sx, gy - 58, sx + 26, gy - 61); ctx.moveTo(sx - 26, gy - 49); ctx.quadraticCurveTo(sx, gy - 51, sx + 26, gy - 48.5); ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,210,0.3)'; ctx.fillRect(sx - 26, gy - 65, 52, 1.2);
    ctx.fillStyle = 'rgba(60,30,10,0.25)'; ctx.fillRect(sx - 26, gy - 47, 52, 2);
    ctx.strokeStyle = '#7a4a2a'; ctx.lineWidth = 2; rr(sx - 30, gy - 66, 60, 22, 6); ctx.stroke();
    rkNail(ctx, sx - 25, gy - 55, 1.1); rkNail(ctx, sx + 25, gy - 55, 1.1);
    text('START', sx, gy - 54.5, 13, '#3a2210', 'center');
    ctx.setLineDash([6, 8]); ctx.strokeStyle = 'rgba(255,215,122,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, BROOM.top - 10); ctx.lineTo(sx, gy - 70); ctx.stroke(); ctx.setLineDash([]);
  }
  broomDrawWind(st);
  ctx.restore();
}
// a glowing ring seen from the side; part 'back' (behind the riders) or 'front' (over them)
function broomDrawRing(g, t, part) {
  const K = BROOM_COLS, y = broomRingY(g, t), wob = g.wob > 0 ? Math.sin(g.wob * 40) * 3 : 0;
  const col = g.train ? K.train : K.ring, hi = g.train ? K.trainHi : K.ringHi, rx = 11, ry = 40 + wob;
  const a0 = part === 'back' ? -Math.PI / 2 : Math.PI / 2, a1 = part === 'back' ? Math.PI / 2 : Math.PI * 1.5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = g.train ? 'rgba(255,157,226,0.25)' : 'rgba(255,179,71,0.25)'; ctx.lineWidth = 13;
  ctx.beginPath(); ctx.ellipse(g.x, y, rx, ry, 0, a0, a1); ctx.stroke();
  ctx.strokeStyle = 'rgba(60,20,50,0.55)'; ctx.lineWidth = 8.5;
  ctx.beginPath(); ctx.ellipse(g.x, y, rx, ry, 0, a0, a1); ctx.stroke();
  ctx.strokeStyle = g.flash > 0 ? PCOL[g.flashId] : col; ctx.lineWidth = 5.5;
  ctx.beginPath(); ctx.ellipse(g.x, y, rx, ry, 0, a0, a1); ctx.stroke();
  ctx.strokeStyle = hi; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(g.x, y, rx, ry, 0, a0, a1); ctx.stroke();
  ctx.lineCap = 'butt';
  if (part === 'front') {
    // who already took it: a dot in their colour on top
    for (const k of [0, 1]) if (g.got[k]) { ctx.fillStyle = PCOL[k]; circle(g.x + (k ? 5 : -5), y - ry - 7, 4); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke(); }
    const sp = t * 2 + g.x;
    ctx.fillStyle = '#fff6dc'; circle(g.x + Math.cos(sp) * rx, y + Math.sin(sp) * ry, 1.8); ctx.fill();
  }
}
function broomDrawStarPickup(s, t) {
  if (s.taken >= 0) return;
  const y = s.y + Math.sin(t * 2.4 + s.ph) * 6, rot = Math.sin(t * 1.5 + s.ph) * 0.2;
  ctx.fillStyle = 'rgba(255,215,90,0.22)'; circle(s.x, y, 26 + Math.sin(G.clock * 4 + s.ph) * 3); ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,180,0.55)'; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) { const a = G.clock * 1.4 + i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a) * 20, y + Math.sin(a) * 20); ctx.lineTo(s.x + Math.cos(a) * 27, y + Math.sin(a) * 27); ctx.stroke(); }
  broomStarShape(s.x, y, 16, '#b9850f', rot); broomStarShape(s.x, y - 1, 15, C.gold, rot);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(s.x - 5, y - 6, 3); ctx.fill();
  ctx.fillStyle = C.ink; circle(s.x - 4, y - 1, 1.6); ctx.fill(); circle(s.x + 4, y - 1, 1.6); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(s.x, y + 2, 3.5, 0.3, Math.PI - 0.3); ctx.stroke();
}
function broomDrawBat(b, t, eyesOnly) {
  const K = BROOM_COLS, q = broomBatDraw(b, t), x = q.x, y = q.y, hit = b.hitT > 0;
  const f = Math.sin(G.clock * (hit ? 26 : 15) + b.ph);
  ctx.save(); ctx.translate(x, y);
  if (hit) ctx.rotate((1 - b.hitT / BROOM.batHitT) * Math.PI * 2 * (b.spinDir || 1));
  if (!eyesOnly) {
    ctx.fillStyle = K.batWing;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 7, -3); ctx.lineTo(s * 25, -10 - f * 9); ctx.lineTo(s * 22, 1 - f * 4);
      ctx.quadraticCurveTo(s * 18, -1 - f * 3, s * 15, 4 - f * 2); ctx.quadraticCurveTo(s * 11, 1, s * 7, 5); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = K.bat; circle(0, 0, 10.5); ctx.fill();
    ctx.fillStyle = '#8a6ab8'; ctx.beginPath(); ctx.ellipse(0, 4, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = K.bat; ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(-6, -15); ctx.lineTo(-2, -8); ctx.moveTo(8, -5); ctx.lineTo(6, -15); ctx.lineTo(2, -8); ctx.fill();
    ctx.fillStyle = 'rgba(255,140,190,0.6)'; circle(-6, 2, 2); ctx.fill(); circle(6, 2, 2); ctx.fill();
  }
  if (hit) { ctx.strokeStyle = eyesOnly ? '#fff6c8' : C.ink; ctx.lineWidth = 1.6; for (const ex of [-3.5, 3.5]) { ctx.beginPath(); ctx.moveTo(ex - 2, -4); ctx.lineTo(ex + 1, -2); ctx.lineTo(ex - 2, 0); ctx.stroke(); } }
  else {
    if (eyesOnly) { ctx.fillStyle = 'rgba(255,240,150,0.35)'; circle(0, -2, 9); ctx.fill(); }
    for (const ex of [-3.5, 3.5]) { ctx.fillStyle = eyesOnly ? '#fff6a0' : '#ffffff'; circle(ex, -2, 3); ctx.fill(); ctx.fillStyle = C.ink; circle(ex - 0.8, -1.6, 1.5); ctx.fill(); }
  }
  if (!eyesOnly) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 3, 2.5, 0.3, Math.PI - 0.3); ctx.stroke(); }
  ctx.restore();
}
function broomInFog(c, x) { for (const f of c.fogs) if (x > f.x0 + 30 && x < f.x1 - 30) return true; return false; }
function broomDrawFog(st) {
  const c = st.c, cam = st.cam;
  // cartoon fog: three drifting cloud strips, each one path of puffs filled once (so it has one even colour and bumpy
  // edges), thinner toward the two ends of the bank
  for (const f of c.fogs) {
    if (f.x1 < cam.x - 100 || f.x0 > cam.x + W + 100) continue;
    for (let j = 0; j < 3; j++) {
      const yc = 175 + j * 110 + Math.sin(G.clock * 0.5 + j * 2) * 8, drift = Math.sin(G.clock * 0.35 + j) * 24;
      ctx.fillStyle = j === 1 ? 'rgba(170,145,215,0.5)' : 'rgba(150,125,195,0.42)';
      ctx.beginPath();
      for (let x = f.x0 + 30, i = 0; x < f.x1 - 20; x += 44, i++) {
        if (x < cam.x - 140 || x > cam.x + W + 140) continue;
        const k = Math.min(1, (x - f.x0) / 260, (f.x1 - x) / 260), r = (34 + broomHash(i, j) * 26) * (0.35 + 0.65 * k);
        const px = x + drift, py = yc + Math.sin(i * 1.7 + j + G.clock * 0.6) * 12;
        ctx.moveTo(px + r, py - 18); ctx.arc(px, py - 18, r, 0, Math.PI * 2);
        ctx.moveTo(px + r * 0.9, py + 22); ctx.arc(px, py + 22, r * 0.9, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  }
}
// a rider on a broom, with a witch hat and a scarf; at (0, 0) = the rider's middle
function broomDrawRider(st, r) {
  const K = BROOM_COLS, col = PCOL[r.id], dk = PDARK[r.id];
  let x = r.x, y = r.y, rot = r.tilt;
  if (r.loopT >= 0 && r.loopT < 1.1) { const k = clamp(r.loopT / 1.1, 0, 1), a = k * Math.PI * 2; x += Math.sin(a) * 34; y += -(1 - Math.cos(a)) * 34; rot -= a; }
  if (r.spin > 0) rot += r.spinA;
  const bob = reduceMotion ? 0 : Math.sin(r.flap * 0.5 + r.id) * 2.5;
  ctx.save(); ctx.translate(x, y + bob);
  // tailwind (gold swirls) and zoom (gold aura + speed lines)
  if (r.tail > BROOM.tailShow) {
    ctx.strokeStyle = 'rgba(255,197,61,' + clamp(r.tail / BROOM.tailMax, 0.3, 0.85) + ')'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const ph = (G.clock * 3 + i * 0.33) % 1, sx = -40 - ph * 50, sy = -16 + i * 16; ctx.beginPath(); ctx.arc(sx, sy, 6, Math.PI * 0.2, Math.PI * 1.6); ctx.moveTo(sx + 2, sy - 6); ctx.lineTo(sx + 22, sy - 6); ctx.stroke(); }
    ctx.lineCap = 'butt';
  }
  if (r.zoomT > 0) {
    const gz = r.zoomGold ? 1.3 : 1; // a Gold zoom: a bigger aura and more speed lines
    ctx.fillStyle = r.zoomGold ? 'rgba(255,214,90,0.36)' : 'rgba(255,197,61,0.28)'; ctx.beginPath(); ctx.ellipse(-6, 0, 40 * gz, 24 * gz, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,180,0.85)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (const oy of r.zoomGold ? [-26, -12, 2, 16] : [-18, -4, 10]) { const L = 30 + broomHash(Math.floor(G.clock * 40), oy + 30) * 30; ctx.beginPath(); ctx.moveTo(-58, oy); ctx.lineTo(-58 - L, oy); ctx.stroke(); }
    ctx.lineCap = 'butt';
  }
  ctx.rotate(rot);
  // the scarf, fluttering behind
  const sw = Math.sin(r.flap) * 4;
  ctx.fillStyle = dk; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.quadraticCurveTo(-20, -10 + sw, -34, -6 + sw * 1.4); ctx.lineTo(-32, 0 + sw * 1.4); ctx.quadraticCurveTo(-20, -3 + sw, -6, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-18, -8 + sw * 0.9); ctx.lineTo(-18, -2 + sw * 0.9); ctx.moveTo(-26, -7 + sw * 1.2); ctx.lineTo(-26, -1 + sw * 1.2); ctx.stroke();
  // the broom: stick, then the bristles tied with a band in the rider's colour
  ctx.strokeStyle = K.stick; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-32, 9); ctx.lineTo(28, 5); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,220,170,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-28, 7.5); ctx.lineTo(26, 3.6); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = K.straw; ctx.beginPath(); ctx.moveTo(-31, 5); ctx.lineTo(-56, -2 + sw * 0.3); ctx.lineTo(-58, 10); ctx.lineTo(-55, 21 - sw * 0.3); ctx.lineTo(-31, 13); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = K.strawDk; ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-32, 7 + i * 1.5); ctx.lineTo(-56, 1 + i * 4.5); ctx.stroke(); }
  ctx.fillStyle = col; ctx.fillRect(-34, 4, 5, 10);
  // the rider sits on the stick
  ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 2.2;
  rr(-10, -15, 21, 22, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(-7, -12, 7, 8, 4); ctx.fill();
  ctx.fillStyle = col; circle(12, 4, 3.6); ctx.fill(); ctx.stroke(); // a hand on the stick
  // face (looking ahead)
  const dizzy = r.spin > 0;
  for (const ex of [1.5, 7.5]) {
    if (dizzy) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ex - 2, -8); ctx.lineTo(ex + 2, -4); ctx.moveTo(ex + 2, -8); ctx.lineTo(ex - 2, -4); ctx.stroke(); }
    else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, -6, 2.8, 3.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = C.ink; circle(ex + 1, -5.6, 1.5); ctx.fill(); }
  }
  ctx.fillStyle = 'rgba(255,120,140,0.5)'; circle(9, -1, 2.2); ctx.fill();
  if (r.popT < 0.9 || (st.cele && st.cele.id === r.id)) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(5, -1, 2.6, 0.2, Math.PI - 0.2); ctx.stroke(); }
  // Bo's round ears peek out under the hat brim
  if (r.id === 1) { ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 2; circle(-9, -15, 4.2); ctx.fill(); ctx.stroke(); circle(10, -15, 4.2); ctx.fill(); ctx.stroke(); }
  // the witch hat: a wide brim and a floppy cone bent back by the wind
  const flop = Math.sin(r.flap * 0.7) * 2 + clamp(r.v / 100, 2, 6);
  ctx.fillStyle = K.hatDk; ctx.beginPath(); ctx.ellipse(1, -16, 16, 4.2, -0.05, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = K.hat; ctx.beginPath(); ctx.moveTo(-8, -17); ctx.quadraticCurveTo(-4, -30, -6 - flop, -40); ctx.quadraticCurveTo(-2 - flop * 0.6, -36, 4 - flop * 1.6, -38 + flop * 0.4);
  ctx.quadraticCurveTo(4, -28, 10, -17); ctx.closePath(); ctx.fill();
  ctx.fillStyle = col; ctx.fillRect(-8.5, -21, 18.5, 4);
  ctx.fillStyle = C.gold; ctx.fillRect(-1.5, -21.5, 5, 5); ctx.fillStyle = K.hat; ctx.fillRect(0, -20, 2, 2);
  if (r.id === 0) { ctx.fillStyle = '#5cc27f'; ctx.strokeStyle = '#3d8f5a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(4 - flop * 1.6 + 4, -40 + flop * 0.4, 5, 2.4, -0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } // Pip's sprout
  ctx.restore();
  // a held star floats over the rider (gold-ringed when it is a Gold star)
  if (r.star) {
    const sx = x + 26, sy = y - 34 + Math.sin(G.clock * 4 + r.id) * 3, pulse = r.holdT > 3 ? 1 + 0.15 * Math.sin(G.clock * 10) : 1;
    if (r.star === 2) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; circle(sx, sy, 13 * pulse); ctx.stroke(); }
    broomStarShape(sx, sy, 10 * pulse, '#b9850f', G.clock); broomStarShape(sx, sy, 8.5 * pulse, r.star === 2 ? '#fff3b0' : C.gold, G.clock);
  }
  if (r.spin > 0) for (let i = 0; i < 3; i++) { const a = G.clock * 9 + i * 2.1; broomStarShape(x + Math.cos(a) * 18, y - 28 + Math.sin(a) * 5, 4, C.gold); }
}
// the giant jack-o'-lantern gate: a huge grinning pumpkin on the rooftops with the checkered finish line in front of it.
// part 'back' (the pumpkin and the line, behind everything that flies) or 'front' (the FINISH banner, over the riders)
function broomDrawGate(st, part) {
  const c = st.c, gx = c.len, K = BROOM_COLS, fl = st.gateFlash > 0 ? st.gateFlash / 0.6 : 0;
  if (gx < st.cam.x - 320 || gx > st.cam.x + W + 320) return;
  const cy = 322, RY = 186, top = BROOM.top - 4;
  if (part === 'back') {
    const gl = ctx.createRadialGradient(gx, cy, 60, gx, cy, 300);
    gl.addColorStop(0, 'rgba(255,190,90,' + (0.35 + 0.35 * fl) + ')'); gl.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = gl; circle(gx, cy, 300); ctx.fill();
    // the body: five fat ribs
    for (const [ox, rx, col] of [[-118, 92, K.pumpkinDk], [118, 92, K.pumpkinDk], [-62, 104, '#f07a22'], [62, 104, '#f07a22'], [0, 108, K.pumpkin]]) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(gx + ox, cy, rx, RY * (1 - Math.abs(ox) / 1100), 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.beginPath(); ctx.ellipse(gx - 70, cy - 110, 22, 50, 0.35, 0, Math.PI * 2); ctx.fill();
    // a curly stem and a leaf
    ctx.fillStyle = K.stem; ctx.beginPath(); ctx.moveTo(gx - 12, cy - RY + 8); ctx.quadraticCurveTo(gx - 10, cy - RY - 22, gx + 6, cy - RY - 34); ctx.lineTo(gx + 16, cy - RY - 26); ctx.quadraticCurveTo(gx + 6, cy - RY - 14, gx + 12, cy - RY + 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6fb04a'; ctx.beginPath(); ctx.ellipse(gx + 40, cy - RY - 8, 26, 11, 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4f8a34'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx + 18, cy - RY - 14); ctx.lineTo(gx + 62, cy - RY - 1); ctx.stroke();
    ctx.strokeStyle = '#5a8a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx - 10, cy - RY - 4); ctx.bezierCurveTo(gx - 50, cy - RY - 30, gx - 60, cy - RY + 10, gx - 38, cy - RY - 6); ctx.stroke();
    // a happy face: smiling eyes, a little nose and a big grin with two teeth, lit from inside (brighter when someone crosses)
    const lit = fl > 0 ? '#fffbe0' : '#ffe28a', deep = fl > 0 ? '#ffd24a' : '#ffb347';
    for (const s of [-1, 1]) {
      const ex = gx + s * 72, ey = cy - 62;
      ctx.fillStyle = deep; ctx.beginPath(); ctx.ellipse(ex, ey, 34, 30, 0, Math.PI, 0); ctx.ellipse(ex, ey + 4, 30, 14, 0, 0, Math.PI, true); ctx.closePath(); ctx.fill();
      ctx.fillStyle = lit; ctx.beginPath(); ctx.ellipse(ex, ey + 2, 24, 20, 0, Math.PI, 0); ctx.ellipse(ex, ey + 5, 22, 9, 0, 0, Math.PI, true); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = deep; ctx.beginPath(); ctx.moveTo(gx - 14, cy - 8); ctx.lineTo(gx, cy - 30); ctx.lineTo(gx + 14, cy - 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = deep; ctx.beginPath(); ctx.moveTo(gx - 120, cy + 18); ctx.quadraticCurveTo(gx, cy + 150, gx + 120, cy + 18); ctx.quadraticCurveTo(gx, cy + 70, gx - 120, cy + 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = lit; ctx.beginPath(); ctx.moveTo(gx - 104, cy + 30); ctx.quadraticCurveTo(gx, cy + 132, gx + 104, cy + 30); ctx.quadraticCurveTo(gx, cy + 80, gx - 104, cy + 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = K.pumpkin; rr(gx - 34, cy + 66, 22, 20, 4); ctx.fill(); rr(gx + 12, cy + 66, 22, 20, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,120,120,0.35)'; circle(gx - 132, cy - 4, 18); ctx.fill(); circle(gx + 132, cy - 4, 18); ctx.fill();
    // the finish line: a checkered ribbon from the top of the sky down to the pumpkin's chin
    ctx.fillStyle = 'rgba(28,26,54,0.35)'; ctx.fillRect(gx - 7, top, 14, cy + RY - 20 - top);
    for (let yy = top, k = 0; yy < cy + RY - 20; yy += 10, k++) for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (k + j) % 2 ? 'rgba(255,255,255,0.92)' : 'rgba(28,26,54,0.9)'; ctx.fillRect(gx - 6 + j * 6, yy, 6, Math.min(10, cy + RY - 20 - yy));
    }
    return;
  }
  // the FINISH banner at the top of the line, swinging a little
  const sw = Math.sin(G.clock * 2) * 0.04, sy = top - 2;
  ctx.save(); ctx.translate(gx, sy); ctx.rotate(sw);
  ctx.fillStyle = 'rgba(28,26,54,0.9)'; rr(-50, -2, 100, 26, 9); ctx.fill(); ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; rr(-50, -2, 100, 26, 9); ctx.stroke();
  text('FINISH', 0, 11.5, 16, fl > 0 ? '#ffffff' : C.gold, 'center');
  ctx.restore();
}
function broomDrawProps(st) {
  const c = st.c, cam = st.cam;
  for (const pr of c.props) {
    if (pr.x < cam.x - 80 || pr.x > cam.x + W + 80) continue;
    if (pr.kind === 'ghost') {
      const y = pr.y + Math.sin(G.clock * 2 + pr.ph) * 8, x = pr.x + Math.sin(G.clock * 1.3 + pr.ph) * 6, cheer = st.cele ? Math.abs(Math.sin(G.clock * 9)) * 6 : 0;
      ctx.fillStyle = 'rgba(246,240,255,0.82)';
      ctx.beginPath(); ctx.arc(x, y - cheer, 14, Math.PI, 0); ctx.lineTo(x + 14, y + 14 - cheer);
      for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(x + 10.5 - i * 7, y + 19 - cheer, x + 7 - i * 7, y + 14 - cheer);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.ink; circle(x - 5, y - 3 - cheer, 2); ctx.fill(); circle(x + 5, y - 3 - cheer, 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x, y + 4 - cheer, 3, st.cele ? 4 : 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,140,190,0.5)'; circle(x - 9, y + 2 - cheer, 2.2); ctx.fill(); circle(x + 9, y + 2 - cheer, 2.2); ctx.fill();
      // a little pennant in the leader's colour... or both
      ctx.strokeStyle = '#d8d3e8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 14, y + 2 - cheer); ctx.lineTo(x + 20, y - 18 - cheer); ctx.stroke();
      ctx.fillStyle = st.cele ? PCOL[st.cele.id] : C.gold; ctx.beginPath(); ctx.moveTo(x + 20, y - 18 - cheer); ctx.lineTo(x + 33, y - 14 - cheer + Math.sin(G.clock * 8) * 2); ctx.lineTo(x + 20, y - 10 - cheer); ctx.fill();
    } else if (pr.kind === 'skel') { // a goofy skeleton on the roof, waving a checkered flag
      const gy = broomGroundY(c, pr.x), x = pr.x, y = gy - 2, wave = Math.sin(G.clock * (st.cele ? 10 : 4)) * 0.6;
      ctx.strokeStyle = '#f4efe2'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x, y - 34); ctx.moveTo(x, y - 14); ctx.lineTo(x - 6, y); ctx.moveTo(x, y - 14); ctx.lineTo(x + 7, y); ctx.moveTo(x, y - 30); ctx.lineTo(x - 10, y - 20); ctx.stroke();
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - 5, y - 30 + i * 5); ctx.lineTo(x + 5, y - 30 + i * 5); ctx.stroke(); }
      const ax = x + Math.cos(-1.2 + wave) * 14, ay = y - 30 + Math.sin(-1.2 + wave) * 14;
      ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.lineTo(ax, ay); ctx.stroke();
      ctx.strokeStyle = '#d8d3e8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, ay + 4); ctx.lineTo(ax, ay - 26); ctx.stroke(); ctx.lineCap = 'butt';
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? '#1c1a36' : '#ffffff'; ctx.fillRect(ax + i * 6, ay - 26 + j * 6 + Math.sin(G.clock * 8 + i) * 1.2, 6, 6); }
      ctx.fillStyle = '#f4efe2'; circle(x, y - 42, 9); ctx.fill();
      ctx.fillStyle = C.ink; circle(x - 3.5, y - 43, 2.4); ctx.fill(); circle(x + 3.5, y - 43, 2.4); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y - 40, 4.5, 0.3, Math.PI - 0.3); ctx.stroke();
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 1.8, y - 37.6); ctx.lineTo(x + i * 1.8, y - 35.6); ctx.stroke(); }
    }
  }
}
function broomWordY(x, y, below) {
  const b = G.matchHudBox; if (!b) return y;
  return y < (hudBig() ? 104 : 86) && x > b.x0 - 60 && x < b.x1 + 60 ? Math.max(y, below) : y;
}
function broomDrawTop() {
  const st = G.mst, m = G.match; if (!st.c || !st.riders) return;
  const c = st.c, cam = st.cam, t = st.t;
  ctx.save(); ctx.translate(-cam.x, 0);
  const vis = (x, pad = 80) => x > cam.x - pad && x < cam.x + W + pad;
  // dotted links between the rings of a train
  for (const tr of c.trains) {
    const rs = c.rings.filter(g => g.train === tr);
    if (!rs.length || !vis(rs[0].x, 400)) continue;
    ctx.setLineDash([4, 7]); ctx.strokeStyle = 'rgba(255,157,226,0.45)'; ctx.lineWidth = 2; ctx.beginPath();
    rs.forEach((g, i) => { const y = broomRingY(g, t); if (i) ctx.lineTo(g.x, y); else ctx.moveTo(g.x, y); }); ctx.stroke(); ctx.setLineDash([]);
  }
  broomDrawGate(st, 'back');
  for (const g of c.rings) if (vis(g.x)) broomDrawRing(g, t, 'back');
  for (const s of c.stars) if (vis(s.x)) broomDrawStarPickup(s, t);
  const fogOn = c.fogs.length > 0;
  for (const b of c.bats) if (vis(b.x, 60) && !(fogOn && broomInFog(c, b.x))) broomDrawBat(b, t, false);
  if (fogOn) {
    for (const b of c.bats) if (vis(b.x, 60) && broomInFog(c, b.x)) broomDrawBat(b, t, false);
    broomDrawFog(st);
    // glowing eyes and ring glints show through the fog
    for (const b of c.bats) if (vis(b.x, 60) && broomInFog(c, b.x)) broomDrawBat(b, t, true);
    for (const g of c.rings) if (vis(g.x) && broomInFog(c, g.x)) { ctx.strokeStyle = 'rgba(255,215,140,0.55)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(g.x, broomRingY(g, t), 11, 40, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  broomDrawProps(st);
  // the riders (the one behind drawn first)
  const order = st.riders.slice().sort((a, b) => a.x - b.x);
  for (const r of order) broomDrawRider(st, r);
  for (const g of c.rings) if (vis(g.x)) broomDrawRing(g, t, 'front');
  broomDrawGate(st, 'front');
  // sparkles and effects
  for (const q of st.vis.fx) {
    const a = clamp(q.life / q.max, 0, 1); ctx.globalAlpha = a; ctx.fillStyle = q.col;
    if (q.kind === 'spark') broomStarShape(q.x, q.y, q.size * (0.6 + 0.6 * a), q.col, q.life * 4);
    else if (q.kind === 'heart') { const s = q.size; ctx.beginPath(); ctx.moveTo(q.x, q.y + s); ctx.bezierCurveTo(q.x - s * 2, q.y - s * 0.5, q.x - s * 0.6, q.y - s * 2, q.x, q.y - s * 0.6); ctx.bezierCurveTo(q.x + s * 0.6, q.y - s * 2, q.x + s * 2, q.y - s * 0.5, q.x, q.y + s); ctx.fill(); }
    else { circle(q.x, q.y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  for (const s of st.vis.shock) { const k = s.t / 0.45; ctx.strokeStyle = 'rgba(255,197,61,' + (1 - k) + ')'; ctx.lineWidth = 4 * (1 - k) + 1; circle(s.x, s.y, 12 + 46 * k); ctx.stroke(); }
  // floating words: each rider's latest, and bumps
  for (const r of st.riders) if (r.popT < 0.9 && r.pop) {
    const k = r.popT / 0.9, sx = r.x - cam.x;
    ctx.globalAlpha = 1 - k * k; bigText(r.pop, r.x, broomWordY(sx, r.y - 44 - 26 * k, r.y + 44 + 20 * k), 18, r.popCol, 1 + 0.3 * Math.max(0, 1 - k * 5)); ctx.globalAlpha = 1;
  }
  for (const w of st.vis.words) { const k = w.t / 0.8; ctx.globalAlpha = 1 - k; bigText(w.text, w.x, broomWordY(w.x - cam.x, w.y - 18 * k, w.y + 50), 16, w.col); ctx.globalAlpha = 1; }
  // name tags through "Round N" and 3-2-1 (the framework draws none for hidden players)
  const tagA = G.introT > 0 ? 1 - clamp(G.introT / 0.5, 0, 1) : m && (m.phase === 'ready' || m.phase === 'count') ? 1 : 0;
  if (tagA > 0) for (const r of st.riders) {
    ctx.globalAlpha = tagA; const x = r.x, y = r.y - (r.star ? 76 : 56), cpu = broomCpu(r.id), hw = cpu ? 30 : 18;
    ctx.fillStyle = PCOL[r.id]; rr(x - hw, y - 11, hw * 2, 18, 9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 4, y + 7); ctx.lineTo(x + 4, y + 7); ctx.lineTo(x, y + 11); ctx.fill();
    text(cpu ? NAMES[r.id] + ' · CPU' : NAMES[r.id], x, y - 1.5, 12, '#fff', 'center', 'body'); ctx.globalAlpha = 1;
  }
  if (m && m.phase === 'count' && m.t < 1.1) for (const r of st.riders) if (r.goldStart) {
    const k = m.t / 1.1; ctx.globalAlpha = 1 - k * k; bigText('Gold star!', r.x + 70, r.y - 30 - 20 * k, 17, C.gold); ctx.globalAlpha = 1;
  }
  ctx.restore();
}
// each player's own keys for a reminder chip under their broom (none for the computer)
function broomKeyLabel(id, what) {
  let k = 'kb'; try { k = actKey(id); } catch (e) { k = 'kb'; }
  if (what === 'zoom') return k === 'pad' ? glyph('a') + ' zoom!' : k === 'touch' ? 'Tap zoom!' : (id === 0 ? 'F' : '/') + ' zoom!';
  return k === 'pad' ? 'stick ▲▼ fly · ▶ fast · ' + glyph('a') + ' zoom' : k === 'touch' ? '▲ ▼ fly · ▶ fast · zoom button' : id === 0 ? 'W S fly · D fast · F zoom' : '↑ ↓ fly · → fast · / zoom';
}
function broomChip(label, x, y, big, col) {
  const fs = big ? 18 : 13, h = big ? 30 : 22;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(label).width + (big ? 26 : 20), cx = clamp(x, w / 2 + 6, W - w / 2 - 6);
  ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(cx - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; rr(cx - w / 2, y - h / 2, w, h, h / 2); ctx.stroke();
  text(label, cx, y + 0.5, fs, C.gold, 'center', 'body');
}
function broomHud() {
  const st = G.mst, m = G.match; if (!st.riders || !st.c) return;
  const big = hudBig(), tw = BROOM_TWISTS[st.twist], cam = st.cam;
  // bottom corners: each player's star slot
  for (const r of st.riders) {
    const left = r.id === 0, sz = big ? 1.45 : 1, pw = 98 * sz, ph = 34 * sz, y = H - 8 - ph, x = left ? 12 : W - 12 - pw;
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(x, y, pw, ph, 12); ctx.fill();
    if (r.star === 2 || r.tail > BROOM.tailShow) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x, y, pw, ph, 12); ctx.stroke(); }
    text(NAMES[r.id], left ? x + 12 * sz : x + pw - 12 * sz, y + ph / 2 + 0.5, 17 * sz, PCOL[r.id], left ? 'left' : 'right');
    const sx = left ? x + pw - 22 * sz : x + 22 * sz, sy = y + ph / 2;
    if (r.star) broomStarShape(sx, sy, 11 * sz * (r.holdT > 3 ? 1 + 0.12 * Math.sin(G.clock * 10) : 1), r.star === 2 ? '#fff3b0' : C.gold, 0);
    else if (r.zoomT > 0) broomStarShape(sx, sy, 11 * sz * (0.6 + 0.4 * Math.sin(G.clock * 30)), 'rgba(255,197,61,0.7)', G.clock * 6);
    else { ctx.strokeStyle = 'rgba(246,239,223,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); circle(sx, sy, 10 * sz); ctx.stroke(); ctx.setLineDash([]); }
  }
  // bottom centre: the course map, start to pumpkin, with both brooms
  {
    // it sits low in the street band, below the doorstep pumpkins, and is nearly solid so the street doesn't show through
    const mw = big ? 360 : 380, mh = big ? 28 : 22, x0 = W / 2 - mw / 2, y = H - (big ? 4 : 5) - mh;
    ctx.fillStyle = 'rgba(28,26,54,0.92)'; rr(x0, y, mw, mh, mh / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(246,239,223,0.18)'; ctx.lineWidth = 1.5; rr(x0, y, mw, mh, mh / 2); ctx.stroke();
    const a = x0 + 18, b = x0 + mw - 28, cy = y + mh / 2, len = st.c.len, sx = BROOM.startX;
    ctx.strokeStyle = 'rgba(246,239,223,0.35)'; ctx.lineWidth = 3; ctx.setLineDash([2, 6]); ctx.beginPath(); ctx.moveTo(a, cy); ctx.lineTo(b, cy); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(246,239,223,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a - 6, cy - mh * 0.28); ctx.lineTo(a - 6, cy + mh * 0.28); ctx.stroke(); // the start line
    ctx.save(); ctx.translate(b + 10, cy); ctx.scale(big ? 1.2 : 0.9, big ? 1.2 : 0.9); broomDrawPumpkin(0, 1, 8, true); ctx.restore();
    for (const r of st.riders) {
      const k = clamp((r.x - sx) / (len - sx), 0, 1), px = a + (b - a) * k, py = cy + (r.id ? 3 : -3);
      ctx.fillStyle = PCOL[r.id]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; circle(px, py, big ? 7 : 5.5); ctx.fill(); ctx.stroke();
    }
  }
  // twist pill (not in the plain round), top left under the level pill
  if (st.twist !== 'plain') {
    const fs = big ? 20 : 13, h = big ? 36 : 26, y0 = 46;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(tw.name).width + (big ? 36 : 28); pill(14, y0, w, h); text(tw.name, 14 + (big ? 18 : 14), y0 + h / 2 + 0.5, fs, C.gold, 'left', 'body');
  }
  // one live chip, top right: a tailwind (gold), or what's coming up (gusts, fog, a bat wall)
  if (m.phase === 'live') {
    // top right: what's coming up (gusts, fog, a bat wall) first, then a tailwind (gold) under it
    const chips = [], ahead = cam.x + W;
    if (st.c.gusts.some(g => g.x0 > cam.x + W * 0.4 && g.x0 < ahead + 200)) chips.push({ text: 'Gusts ahead!', col: '#bfe8ff' });
    else if (st.c.fogs.some(f => f.x0 > cam.x + W * 0.4 && f.x0 < ahead + 300)) chips.push({ text: 'Fog ahead!', col: '#d9c8ff' });
    else if (st.c.walls.some(wl => wl.x > cam.x + W * 0.5 && wl.x < ahead + 300)) chips.push({ text: 'Bat swarm ahead!', col: '#e0c8ff' });
    const tr = st.riders.find(r => r.tail > BROOM.tailShow);
    if (tr) chips.push({ text: 'Tailwind for ' + NAMES[tr.id] + '!', col: C.gold });
    let cy = null;
    for (const chip of chips) {
      const fs = big ? 20 : 13, h = big ? 36 : 28;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w = ctx.measureText(chip.text).width + (big ? 36 : 28), x1 = W - 14, box = G.matchHudBox;
      const y = cy != null ? cy : box && x1 - w < box.x1 + 8 ? box.y1 + 6 : 12;
      pill(x1 - w, y, w, h); text(chip.text, x1 - (big ? 18 : 14), y + h / 2 + 0.5, fs, chip.col, 'right', 'body');
      cy = y + h + 6;
    }
    // a star held a while: a reminder chip over that broom, in its player's own keys (never for the computer)
    for (const r of st.riders) if (r.star && r.holdT > 3.5 && r.holdT < 9 && !broomCpu(r.id) && Math.sin(G.clock * 5) > -0.6) {
      broomChip(broomKeyLabel(r.id, 'zoom'), r.x - cam.x, r.y - (big ? 92 : 80), big, PCOL[r.id]);
    }
  }
  if (m.phase === 'ready' || m.phase === 'count') {
    // the twist card, every round (the plain one too)
    const nf = big ? 30 : 26, hf = big ? 19 : 14, ch = big ? 78 : 60, cy = big ? 372 : 384;
    ctx.font = hf + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const hw = ctx.measureText(tw.hint).width, w = Math.max(big ? 380 : 300, hw + 48), a = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1;
    const cx = Math.max(W / 2 + 30, 270 + w / 2);
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(cx - w / 2, cy, w, ch, 16); ctx.fill();
    text(tw.name, cx, cy + (big ? 25 : 21), nf, C.gold, 'center'); text(tw.hint, cx, cy + (big ? 57 : 46), hf, C.paper, 'center', 'body'); ctx.globalAlpha = 1;
    // key reminders under each broom before rounds 1 and 2 (each player's own device)
    if (m.round <= 2) { ctx.globalAlpha = a; for (const r of st.riders) if (!broomCpu(r.id)) broomChip(broomKeyLabel(r.id, 'all'), r.x - cam.x + 30, r.y + (big ? 42 : 36), big, PCOL[r.id]); ctx.globalAlpha = 1; }
  }
}

Sfx.extra.broomRing = function (p) { this.tone(880 * p, 0.07, 'triangle', 0.045, 1320 * p); this.tone(1320 * p, 0.1, 'triangle', 0.035, 1760 * p, 0.05); };
Sfx.extra.broomTrain = function (p) { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f * p, 0.1, 'triangle', 0.045, null, i * 0.06)); };
Sfx.extra.broomClink = function (p) { this.tone(1500 * p, 0.05, 'square', 0.025, 1100 * p); };
Sfx.extra.broomStar = function (p) { [1046, 1318, 1568, 2093].forEach((f, i) => this.tone(f * p, 0.08, 'triangle', 0.04, null, i * 0.045)); };
Sfx.extra.broomZoom = function (p) { this.tone(200 * p, 0.35, 'sawtooth', 0.05, 900 * p); this.tone(600 * p, 0.25, 'triangle', 0.04, 1600 * p, 0.05); };
Sfx.extra.broomNope = function (p) { this.tone(260 * p, 0.08, 'triangle', 0.03, 200 * p); };
Sfx.extra.broomSqueak = function (p) { this.tone(1700, 0.06, 'square', 0.03, 2300); this.tone(2100, 0.07, 'triangle', 0.03, 1500, 0.07); this.tone(300 * p, 0.2, 'triangle', 0.04, 140 * p, 0.03); };
Sfx.extra.broomWhee = function () { this.tone(1500, 0.06, 'triangle', 0.03, 2400); };
Sfx.extra.broomBoing = function (p) { this.tone(160 * p, 0.22, 'sine', 0.07, 480 * p); };
Sfx.extra.broomBonk = function () { this.tone(260, 0.07, 'triangle', 0.06, 170); this.tone(620, 0.05, 'square', 0.02, 420); };
Sfx.extra.broomTail = function (p) { this.tone(400 * p, 0.3, 'sine', 0.035, 700 * p); this.tone(800 * p, 0.25, 'triangle', 0.025, 1100 * p, 0.12); };
Sfx.extra.broomGate = function (p) { this.tone(392 * p, 0.12, 'triangle', 0.06); this.tone(523 * p, 0.12, 'triangle', 0.05, null, 0.09); this.tone(784 * p, 0.2, 'triangle', 0.045, null, 0.18); };
Sfx.extra.broomWhoosh = function () { this.tone(300, 0.3, 'sawtooth', 0.025, 800); };
Sfx.extra.broomCheer = function () { this.tone(660, 0.08, 'triangle', 0.03, 880, 0.05); this.tone(784, 0.1, 'triangle', 0.03, 1046, 0.15); this.tone(988, 0.14, 'triangle', 0.025, 1318, 0.25); };
Sfx.extra.broomGold = function (p) { this.tone(784 * p, 0.1, 'triangle', 0.05); this.tone(1046 * p, 0.12, 'triangle', 0.045, null, 0.08); this.tone(1318 * p, 0.16, 'triangle', 0.04, null, 0.16); };
/* ===== end of 13-4 Broomstick Race ===== */
