/* Pip & Bo - Level 7-4 Bumper Cars (versus). */
'use strict';

/* ===== 7-4 Bumper Cars (mode 'bumper', versus, best of 7): bumper cars on a castle tournament island in a moat =====
   Top-down. def.ownStep: this mode runs the whole live tick; the platformer players are hidden (they sit in the cars).
   Every top-level name is prefixed bumper / BUMPER, every sound is Sfx.extra.bumper*. Rules = w7/bumper/SPEC.md.
   Rule randomness only from MODES.bumper.rand (twist shuffle, cannon lanes); looks use their own bumperVR. */
const BUMPER = {
  // car (px, s)
  r: 20, accel: 900, turn: 7.5, maxV: 240, capDrag: 8, grip: 8, coast: 2.0, coastMin: 80, thrustMin: 0.15, pushDrag: 0.3,
  // boost (act, tap only)
  boostAdd: 240, boostV: 440, boostT: 0.22, boostCD: 1.5, boostMass: 1, boostTurn: 0.3, superT: 1.5, superV: 540, superAdd: 320, superKick: 2.2, assistAng: 0.8, assistMax: 0.55, assistR: 260,
  // touch diagonals: one arrow held on the touch pad and the other car 22.5°..touchAng off it (and nearer than touchR)
  // -> the car steers the diagonal on that side (what a keyboard player gets by holding two keys); never finer than 8-way
  touchHelp: true, touchAng: 1.18, touchR: 420,
  // bumps
  e: 0.8, kNose: 0.6, headOn: 1, headOnIdle: 0.5, boostKick: 1.8, sideCos: 0.5, hitMin: 60, bigBump: 400,
  dizzyMin: 260, dizzyBase: 0.15, dizzyMax: 0.5, dizzySpan: 300, dizzyGrip: 3, spinK: 0.025, spinMax: 14, spinDrag: 4,
  // edge
  teeterV: 150, teeterT: 0.6, teeterDrag: 8, teeterAcc: 0.5, teeterBack: 450, teeterPull: 0, creditT: 3,
  edgeBrake: true, brakeHit: 1.0,   // (lead review) edge brake: driving off by yourself always teeters (not on Ice Rink)
  selfPull: 500, selfT: 1.0,        // (playtest) a braked teeter's wheels pull it back to land by themselves (px/s²), and it may last up to selfT s
  // flags (lives) + respawn
  flags: 2, sinkT: 1.0, dropT: 0.9, ghostT: 1.0, sinkDrag: 12,
  // crumbling courtyard (ring 0 = the outer ring of flagstones)
  crumbleAt: 30, crumbleEvery: 8, crumbleWarn: 2, crumbleRings: 3,
  // comeback: a player goldMin+ rounds behind gets gold flags (extra lives) and a super boost ready on every life
  goldMin: 2, goldFlags: 1, goldMax: 2, heavy1: 1, heavy2: 1, respawnSuper: false, goldSuper: true,
  // twist props
  well: true, wellR: 26, wellE: 0.5, towers: false, towerR: 24, towerE: 1.2, towerMin: 200,
  pads: false, padV: 460, padCD: 0.5, padSlide: 0.35,
  balls: false, ballR: 15, ballV: 330, ballM: 2.2, ballE: 0.8, ballEvery: 4.5, ballFirst: 3, ballWarn: 1.2, ballLife: 6,
  ice: false, fence: false, fenceE: 0.9, fenceMin: 120,
};
const BUMPER_TWISTS = {
  classic: { name: 'Courtyard Clash', hint: 'Bump the other car into the moat!', P: {} },
  ice: { name: 'Ice Rink', hint: 'The courtyard froze! Slippery!', P: { ice: true, grip: 2.5, coast: 1.0, coastMin: 25, accel: 560, turn: 5.5, dizzyGrip: 1.6, maxV: 220, boostV: 360, boostAdd: 180, superV: 420, superAdd: 240 } },
  towers: { name: 'Bumper Towers', hint: 'Bounce off the towers like a pinball!', P: { towers: true } },
  pads: { name: 'Royal Carpets', hint: 'Drive on the arrows for a free boost!', P: { pads: true } },
  balls: { name: 'Cannonballs', hint: 'Rubber cannonballs! Watch the lines!', P: { balls: true } },
  tyres: { name: 'Tyre Wall', hint: 'Bounce off the tyres! The corners are open!', P: { fence: true, crumbleAt: 20 } },
  crumble: { name: 'Castle Crumble', hint: 'Last round: the floor crumbles early!', P: { crumbleAt: 8, crumbleEvery: 7, crumbleRings: 4 } },
  sudden: { name: 'Sudden Death', hint: 'One flag each. First splash loses!', P: { flags: 1, crumbleAt: 5, crumbleEvery: 6, crumbleRings: 4, goldFlags: 0 } },
};
const BUMPER_MIX = ['ice', 'towers', 'pads', 'balls', 'tyres'];
// prop positions (px), all symmetric under a 180° turn about the island centre (480, 255), which swaps the two homes
const BUMPER_WELL = [480, 255];
const BUMPER_TOWERS = [[315, 150], [645, 360]];
const BUMPER_PADS = [ // x, y (centre), dir: unit vector of the arrow; 60 x 30 px carpets
  { x: 180, y: 255, dx: 1, dy: 0 }, { x: 780, y: 255, dx: -1, dy: 0 },
  { x: 480, y: 135, dx: -1, dy: 0 }, { x: 480, y: 375, dx: 1, dy: 0 },
];
const BUMPER_LANES = [165, 255, 345];
// the moat's water (px): a sinking car's centre stays inside it (minus a sunk car's radius), never on the walls or stands
const BUMPER_MOAT = [30 + 12, 30 + 12, 930 - 12, 480 - 12];
const BUMPER_COLS = { floor: '#e8d9b5', floorHi: '#f3e7c8', floorEdge: '#c9b48a', floorFace: '#b39b70', joint: 'rgba(120,96,60,0.25)', ice: '#d8f1fb', iceHi: '#f4fcff',
  water: '#4aa3d8', waterDk: '#2f7fb8', waterHi: 'rgba(255,255,255,0.35)', wall: '#8d86a8', wallDk: '#5f587e', wallHi: '#aaa4c3',
  rubber: '#2c2a40', carpet: '#d8424f', carpetDk: '#9c2733', stand: '#7cc46a', standDk: '#4f9a4a', wood: '#d39a5e', woodDk: '#8a5833',
  crowd: ['#ffd166', '#ff8fc7', '#b28dff', '#8fe3b0', '#ffffff'], skin: ['#f6d2b0', '#e0a97c', '#b97a53', '#8a5636'] };
const bumperP = () => G.mst.P || BUMPER;
// looks-only randomness (particles, wobble): never MODES.bumper.rand, so the rules' random sequence doesn't depend on the looks
let bumperVS = 20240607;
const bumperVR = () => { bumperVS = (Math.imul(bumperVS, 1664525) + 1013904223) >>> 0; return bumperVS / 4294967296; };
const bumperHash = (a, b) => (((Math.imul(a + 7, 73856093) ^ Math.imul(b + 3, 19349663)) >>> 0) % 1000) / 1000;
function bumperFloorAt(x, y) {
  const st = G.mst, tx = Math.floor(x / T), ty = Math.floor(y / T);
  if (!st.floor || tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return 0;
  return st.floor[ty][tx] > 0 ? 1 : 0;
}
// is this player's jump (A / B) coming from their own controller right now? Per player, so mixed keyboard + controller
// play works: a keyboard player's W is "up", a controller player's A is a boost (the stick gives "up" there).
function bumperPadJump(id) {
  try { const pd = padFor(padSlots(), id), s = pd && Pads.prev[pd.ix]; return !!(s && s.jump); } catch (e) { return false; }
}
function bumperMakeCar(k) {
  const P = bumperP(), s = G.mst.home[k];
  return { id: k, x: s.x, y: s.y, vx: 0, vy: 0, a: k ? Math.PI : 0, spin: 0, r: P.r,
    state: 'drive', t: 0, boostT: 0, cd: 0, readyT: 0, super: false, dizzy: 0, slideT: 0, ghost: 0, teeter: 0, selfT: false, flags: P.flags, gold: 0,
    lastHitBy: -1, lastHitT: 9, lastHitKind: 'bump', crumbT: 9, padCD: 0,
    // looks only (never read by the rules)
    wob: 0, wheel: 0, honkT: 0, honkSnd: 0, popT: 9, pop: '', popCol: '#fff', readyFlash: 0, sq: 0, lostFlag: null, dripT: 0, markT: 0, mk: null };
}
function bumperSolid(c) { return c.state === 'drive' || c.state === 'teeter'; }
function bumperMass(c) { return (c.boostT > 0 ? bumperP().boostMass : 1) * (c.heavy || 1); }
// is this player steering with the on-screen touch pad right now?
function bumperOnTouch(id) {
  const tt = MODES.bumper.testTouch; if (tt) return !!tt[id];
  try { const t = touchState[id]; return !!(t && (t.left || t.right || t.jump || t.down)); } catch (e) { return false; }
}
function bumperInput(p) {
  const i = p.input, up = i.up || (i.jump && !bumperPadJump(p.id));
  let dx = (i.right ? 1 : 0) - (i.left ? 1 : 0), dy = (i.down ? 1 : 0) - (up ? 1 : 0);
  const out = { dx, dy, any: dx !== 0 || dy !== 0 };
  // touch has no diagonals with one thumb: a single arrow whose side the other car is on turns into that diagonal
  const P = bumperP(), st = G.mst;
  if (P.touchHelp && out.any && (dx === 0 || dy === 0) && st.cars && bumperOnTouch(p.id)) {
    const c = st.cars[p.id], o = st.cars[1 - p.id];
    if (bumperSolid(o) && o.ghost <= 0) {
      const ox = o.x - c.x, oy = o.y - c.y, d = Math.hypot(ox, oy), da = bumperAngDiff(Math.atan2(dy, dx), Math.atan2(oy, ox));
      if (d < P.touchR && Math.abs(da) > Math.PI / 8 && Math.abs(da) <= P.touchAng) {
        const s = Math.sign(da); out.dx = dx - s * dy; out.dy = dy + s * dx; out.help = true; // rotate 45° toward the car
      }
    }
  }
  return out;
}
const bumperAngDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

// one fresh press of boost (act, or A on a controller)
function bumperBoost(c, live) {
  const P = bumperP(), st = G.mst;
  if (!live || !bumperSolid(c) || c.dizzy > 0) return;
  if (c.cd > 0) { if (c.honkSnd <= 0) { Sfx.play('bumperHonk', c.id); c.honkSnd = 0.35; } c.honkT = 0.5; return; }
  // aim help: bend the boost toward the other car when it is roughly ahead and near
  const o = st.cars[1 - c.id];
  let a = c.a;
  if (bumperSolid(o) && o.ghost <= 0) {
    const dx = o.x - c.x, dy = o.y - c.y, d = Math.hypot(dx, dy), da = bumperAngDiff(c.a, Math.atan2(dy, dx));
    if (d < P.assistR && Math.abs(da) < P.assistAng) { a = c.a + clamp(da, -P.assistMax, P.assistMax); c.a = a; }
  }
  const hx = Math.cos(a), hy = Math.sin(a), fwd = c.vx * hx + c.vy * hy, lat = -c.vx * hy + c.vy * hx;
  const sup = P.superT > 0 && c.readyT >= P.superT;
  c.super = sup;
  const nf = Math.min(sup ? P.superV : P.boostV, Math.max(fwd, 0) + (sup ? P.superAdd : P.boostAdd));
  if (sup) { c.pop = 'SUPER!'; c.popCol = C.gold; c.popT = 0; st.stat.supers[c.id]++; }
  c.vx = hx * nf - hy * lat * 0.5; c.vy = hy * nf + hx * lat * 0.5;
  c.boostT = P.boostT; c.cd = P.boostCD; c.readyT = 0; st.stat.boosts[c.id]++;
  Sfx.play(sup ? 'bumperSuper' : 'bumperBoost', c.id); rumble(c.id, sup ? 0.25 : 0.1, sup ? 0.5 : 0.3, sup ? 120 : 80);
  bumperFxBoost(c, hx, hy, sup);
}

// driving: point steering (hold a direction: the nose turns toward it and the car drives)
// (lead review) unit vector from the car's centre to the nearest flagstone (within 2 tiles), or null
function bumperLandDir(c) {
  const st = G.mst; let bx = 0, by = 0, bd = 1e9; const tx0 = Math.floor(c.x / T), ty0 = Math.floor(c.y / T);
  for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) {
    const tx = tx0 + ox, ty = ty0 + oy; if (!st.floor[ty] || !(st.floor[ty][tx] > 0)) continue;
    const px = clamp(c.x, tx * T, tx * T + T), py = clamp(c.y, ty * T, ty * T + T), d = Math.hypot(px - c.x, py - c.y);
    if (d < bd) { bd = d; bx = px; by = py; }
  }
  return bd < 1e8 && bd > 1e-6 ? [(bx - c.x) / bd, (by - c.y) / bd] : null;
}
function bumperDrive(c, inp, dt) {
  const P = bumperP();
  if (c.cd <= 0) c.readyT += dt; else c.readyT = 0;
  c.cd = Math.max(0, c.cd - dt); c.boostT = Math.max(0, c.boostT - dt); if (c.boostT <= 0) c.super = false; c.slideT = Math.max(0, c.slideT - dt); c.padCD = Math.max(0, c.padCD - dt);
  if (c.dizzy > 0) c.dizzy = Math.max(0, c.dizzy - dt);
  const can = c.dizzy <= 0 && inp && inp.any;
  let thrust = 0;
  if (can) {
    const ta = Math.atan2(inp.dy, inp.dx), da = bumperAngDiff(c.a, ta);
    const turn = P.turn * dt * (c.boostT > 0 ? P.boostTurn : 1);
    c.a += Math.abs(da) <= turn ? da : Math.sign(da) * turn;
    const cosd = Math.cos(bumperAngDiff(c.a, ta));
    thrust = P.accel * clamp((cosd + 0.3) / 1.3, P.thrustMin, 1) * (c.state === 'teeter' ? P.teeterAcc : 1);
  }
  // (lead review) on the edge, only input toward land drives: holding toward the water just wobbles there (no driving out over the moat)
  let landOK = true;
  c.holdOut = false;
  if (c.state === 'teeter' && can) { const d = bumperLandDir(c) || c.landD; c.landD = d; const dot = d ? inp.dx * d[0] + inp.dy * d[1] : 0; landOK = dot > 0; c.holdOut = dot < 0; if (!landOK) thrust = 0; }
  // spin from bumps
  c.a += c.spin * dt; c.spin *= Math.exp(-P.spinDrag * dt);
  if (Math.abs(c.spin) < 0.05) c.spin = 0;
  const hx = Math.cos(c.a), hy = Math.sin(c.a);
  let fwd = c.vx * hx + c.vy * hy, lat = -c.vx * hy + c.vy * hx;
  if (thrust > 0) fwd = Math.min(Math.max(P.maxV, fwd), fwd + thrust * dt); // driving never pushes past maxV
  const slide = c.dizzy > 0 || c.slideT > 0;
  const grip = slide ? P.dizzyGrip : P.grip;
  lat *= Math.exp(-grip * dt);
  if (thrust <= 0) {
    const k = slide ? P.dizzyGrip : P.coast;
    fwd *= Math.exp(-k * dt);
    const s = Math.sign(fwd), m = Math.max(0, Math.abs(fwd) - P.coastMin * dt); fwd = s * m;
  } else fwd *= Math.exp(-P.pushDrag * dt);
  // speed cap (not while boosting): the extra speed fades
  if (c.boostT <= 0 && !slide && Math.abs(fwd) > P.maxV) fwd = Math.sign(fwd) * (P.maxV + (Math.abs(fwd) - P.maxV) * Math.exp(-P.capDrag * dt));
  if (c.state === 'teeter') { fwd *= Math.exp(-P.teeterDrag * dt * (thrust > 0 ? 0.3 : 1)); lat *= Math.exp(-P.teeterDrag * dt); }
  c.vx = hx * fwd - hy * lat; c.vy = hy * fwd + hx * lat;
  // teetering: the wheels scramble straight toward the held direction, whatever way the car faces (so "press back to land" works)
  if (c.state === 'teeter' && can && landOK && P.teeterBack > 0) { const l = Math.hypot(inp.dx, inp.dy); c.vx += inp.dx / l * P.teeterBack * dt; c.vy += inp.dy / l * P.teeterBack * dt; }
  c.x += c.vx * dt; c.y += c.vy * dt;
  c.wheel += fwd * dt * 0.2; c.lat = lat; // looks only
}

// car vs car: an elastic bump plus a "nose kick" (hitting with your front pushes harder; a car facing you blocks it)
function bumperCollide(st, live) {
  const P = bumperP(), [A, B] = st.cars;
  if (!bumperSolid(A) || !bumperSolid(B)) return;
  const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), min = A.r + B.r;
  if (A.ghost > 0 || B.ghost > 0) return;
  if (d >= min) return;
  let nx, ny;
  if (d > 1e-6) { nx = dx / d; ny = dy / d; } else { nx = (G.tickN & 1) ? 1 : -1; ny = 0; }
  const mA = bumperMass(A), mB = bumperMass(B), over = min - Math.max(d, 0);
  A.x -= nx * over * mB / (mA + mB); A.y -= ny * over * mB / (mA + mB);
  B.x += nx * over * mA / (mA + mB); B.y += ny * over * mA / (mA + mB);
  const vAn = A.vx * nx + A.vy * ny, vBn = B.vx * nx + B.vy * ny, closing = vAn - vBn;
  if (closing <= 0) return;
  const j = (1 + P.e) * closing / (1 / mA + 1 / mB);
  A.vx -= j / mA * nx; A.vy -= j / mA * ny; B.vx += j / mB * nx; B.vy += j / mB * ny;
  const hAx = Math.cos(A.a), hAy = Math.sin(A.a), hBx = Math.cos(B.a), hBy = Math.sin(B.a);
  const noseA = Math.max(0, hAx * nx + hAy * ny), noseB = Math.max(0, -(hBx * nx + hBy * ny));
  const sA = Math.max(0, vAn), sB = Math.max(0, -vBn);
  // a car facing the hitter blocks the nose kick; a boosting hitter breaks through a block unless the blocker boosts too
  const blkB = A.boostT > 0 && B.boostT <= 0 ? P.headOnIdle : P.headOn, blkA = B.boostT > 0 && A.boostT <= 0 ? P.headOnIdle : P.headOn;
  const kB = P.kNose * sA * noseA * (1 - blkB * noseB) * (A.boostT > 0 ? (A.super ? P.superKick : P.boostKick) : 1);
  const kA = P.kNose * sB * noseB * (1 - blkA * noseA) * (B.boostT > 0 ? (B.super ? P.superKick : P.boostKick) : 1);
  // the kick is an impulse: a heavier hitter kicks harder, a heavier victim moves less
  const kvB = kB * mA / mB, kvA = kA * mB / mA;
  B.vx += kvB * nx; B.vy += kvB * ny; A.vx -= kvA * nx; A.vy -= kvA * ny;
  const dvB = j / mB + kvB, dvA = j / mA + kvA;
  // spin: a hit off the victim's centre line turns it
  const crossB = hBx * ny - hBy * nx, crossA = -(hAx * ny - hAy * nx);
  B.spin = clamp(B.spin + P.spinK * dvB * crossB * (1 - noseB), -P.spinMax, P.spinMax);
  A.spin = clamp(A.spin + P.spinK * dvA * crossA * (1 - noseA), -P.spinMax, P.spinMax);
  for (const [v, dv, s, h, noseV] of [[B, dvB, sA, A, noseB], [A, dvA, sB, B, noseA]]) {
    if (dv >= P.dizzyMin) v.dizzy = Math.max(v.dizzy, P.dizzyBase + (P.dizzyMax - P.dizzyBase) * clamp((dv - P.dizzyMin) / P.dizzySpan, 0, 1));
    if (s >= P.hitMin && v.state === 'teeter') v.teeterHit = true;
    if (s >= P.hitMin) { v.lastHitBy = h.id; v.lastHitT = 0; v.lastHitKind = h.boostT > 0 ? (h.super ? 'super' : 'boost') : noseV < P.sideCos && dv >= P.dizzyMin ? 'side' : 'bump'; }
  }
  if (!live) return;
  const hitter = sA > sB ? A : sB > sA ? B : st.cars[G.tickN & 1];
  if (closing >= P.hitMin) st.stat.bumps++;
  if (closing >= P.bigBump) { st.rbig[hitter.id]++; st.stat.big[hitter.id]++; }
  // looks + sound
  const px = A.x + nx * A.r, py = A.y + ny * A.r, big = closing >= P.bigBump;
  Sfx.play(big ? 'bumperBigBump' : 'bumperBump');
  burst(px, py, big ? C.gold : '#ffffff', big ? 12 : 5);
  if (big && !reduceMotion) G.shake = Math.max(G.shake, 0.12);
  rumble(A.id, big ? 0.5 : 0.2, big ? 0.6 : 0.3, big ? 160 : 70); rumble(B.id, big ? 0.5 : 0.2, big ? 0.6 : 0.3, big ? 160 : 70);
  A.sq = B.sq = big ? 1 : 0.5;
  bumperFxBump(px, py, nx, ny, closing, big, hitter);
}

function bumperWellHit(c) {
  const P = bumperP(), [wx, wy] = BUMPER_WELL, dx = c.x - wx, dy = c.y - wy, d = Math.hypot(dx, dy), min = c.r + P.wellR;
  if (d >= min || d < 1e-6) return;
  const nx = dx / d, ny = dy / d; c.x = wx + nx * min; c.y = wy + ny * min;
  const vn = c.vx * nx + c.vy * ny;
  if (vn < 0) {
    const e = P.towers ? P.towerE : P.wellE, out = P.towers ? Math.max(-vn * e, P.towerMin) : -vn * e;
    c.vx += (out - vn) * nx; c.vy += (out - vn) * ny;
    if (-vn > 120) {
      Sfx.play(P.towers ? 'bumperTower' : 'bumperThud'); c.sq = 0.5;
      if (P.towers) { c.slideT = Math.max(c.slideT, 0.2); G.mst.towerFlash = 0.15; }
      bumperFxPropHit(wx + nx * P.wellR, wy + ny * P.wellR, wx, wy, P.wellR, P.towers);
    }
  }
}
function bumperTowerHit(c) {
  const P = bumperP();
  for (const [tx, ty] of BUMPER_TOWERS) {
    const dx = c.x - tx, dy = c.y - ty, d = Math.hypot(dx, dy), min = c.r + P.towerR;
    if (d >= min || d < 1e-6) continue;
    const nx = dx / d, ny = dy / d; c.x = tx + nx * min; c.y = ty + ny * min;
    const vn = c.vx * nx + c.vy * ny;
    if (vn < 0) {
      const out = Math.max(-vn * P.towerE, P.towerMin);
      c.vx += (out - vn) * nx; c.vy += (out - vn) * ny; c.slideT = Math.max(c.slideT, 0.2);
      Sfx.play('bumperTower'); burst(tx + nx * P.towerR, ty + ny * P.towerR, C.gold, 6); c.sq = 0.6;
      G.mst.towerFlash = 0.15;
      bumperFxPropHit(tx + nx * P.towerR, ty + ny * P.towerR, tx, ty, P.towerR, true);
    }
  }
}
function bumperPadHit(c) {
  const P = bumperP();
  if (c.padCD > 0) return;
  for (const pd of BUMPER_PADS) {
    if (Math.abs(c.x - pd.x) > 30 || Math.abs(c.y - pd.y) > 15 || !bumperFloorAt(pd.x, pd.y)) continue; // a carpet on a fallen tile is gone
    const along = c.vx * pd.dx + c.vy * pd.dy, perp = -c.vx * pd.dy + c.vy * pd.dx;
    const na = Math.max(along, P.padV), np = perp * 0.5;
    c.vx = pd.dx * na - pd.dy * np; c.vy = pd.dy * na + pd.dx * np;
    c.slideT = P.padSlide; c.padCD = P.padCD;
    Sfx.play('bumperPad', c.id);
    for (let k = 0; k < 5; k++) G.particles.push({ x: c.x, y: c.y, vx: -pd.dx * 100 + (bumperVR() - 0.5) * 80, vy: -pd.dy * 100 + (bumperVR() - 0.5) * 80, life: 0.35, max: 0.35, col: C.gold, size: 3.5, grav: 0, kind: 'dot' });
    G.mst.vis.padFlash[BUMPER_PADS.indexOf(pd)] = 0.3;
    return;
  }
}
// cannonballs (twist): a warning line, then a rubber ball hops over the moat and rolls across the island
function bumperBalls(st, dt, live) {
  const P = bumperP(); let moved = false;
  if (!P.balls) return moved;
  if (live) {
    st.ballT -= dt;
    if (st.ballT <= 0) {
      st.ballT += P.ballEvery;
      const side = st.ballN % 2 === 0 ? (st.ballFirstSide) : 1 - st.ballFirstSide;
      const lane = BUMPER_LANES[Math.floor(MODES.bumper.rand() * BUMPER_LANES.length) % BUMPER_LANES.length];
      st.ballN++;
      st.balls.push({ side, x: side === 0 ? 30 : W - 30, y: lane, vx: (side === 0 ? 1 : -1) * P.ballV, vy: 0, r: P.ballR, state: 'warn', t: 0, z: 0, spin: 0 });
      Sfx.play('bumperFuse');
    }
  }
  for (const b of st.balls) {
    b.t += dt;
    if (b.state === 'warn') {
      if (b.t >= P.ballWarn) {
        b.state = 'fly'; b.t = 0; Sfx.play('bumperCannon'); burst(b.x, b.y, '#ffffff', 8);
        st.vis.smoke.push({ x: b.x + (b.side ? -14 : 14), y: b.y, t: 0, dir: b.side ? -1 : 1 });
        if (!reduceMotion) G.shake = Math.max(G.shake, 0.05);
      }
      continue;
    }
    if (b.state === 'fly') { // hop over the moat: from the wall (x 45) to the island (x 150)
      b.x += b.vx * dt; const k = Math.min(1, b.t / 0.32); b.z = Math.sin(k * Math.PI) * 40;
      if (k >= 1) { b.state = 'roll'; b.z = 0; Sfx.play('bumperThud'); puff(b.x, b.y + 8, 6, '#f3e7c8'); }
      continue;
    }
    if (b.state === 'roll') {
      b.x += b.vx * dt; b.y += b.vy * dt; b.spin += b.vx * dt / b.r;
      b.vy *= Math.exp(-1.5 * dt);
      for (const c of st.cars) {
        if (!bumperSolid(c) || c.ghost > 0) continue;
        const dx = c.x - b.x, dy = c.y - b.y, d = Math.hypot(dx, dy), min = c.r + b.r;
        if (d >= min || d < 1e-6) continue;
        const nx = dx / d, ny = dy / d, mc = bumperMass(c), mb = P.ballM, over = min - d; moved = true;
        c.x += nx * over * mb / (mc + mb); c.y += ny * over * mb / (mc + mb); b.x -= nx * over * mc / (mc + mb); b.y -= ny * over * mc / (mc + mb);
        const cl = (b.vx - c.vx) * nx + (b.vy - c.vy) * ny;
        if (cl <= 0) continue;
        const j = (1 + P.ballE) * cl / (1 / mc + 1 / mb);
        c.vx += j / mc * nx; c.vy += j / mc * ny; b.vx -= j / mb * nx; b.vy -= j / mb * ny;
        const dv = j / mc;
        if (dv >= P.dizzyMin) c.dizzy = Math.max(c.dizzy, P.dizzyBase + (P.dizzyMax - P.dizzyBase) * clamp((dv - P.dizzyMin) / P.dizzySpan, 0, 1));
        c.spin = clamp(c.spin + P.spinK * dv * (Math.cos(c.a) * ny - Math.sin(c.a) * nx), -P.spinMax, P.spinMax);
        c.lastHitBy = 2; c.lastHitT = 0; c.lastHitKind = 'ball'; if (c.state === 'teeter') c.teeterHit = true;
        Sfx.play('bumperBallHit'); burst(c.x - nx * c.r, c.y - ny * c.r, '#ffffff', 8); rumble(c.id, 0.4, 0.5, 120); c.sq = 0.8;
        if (live) bumperFxStar(c.x - nx * c.r, c.y - ny * c.r, dv > 300, 'BOING!');
      }
      // the well (and towers) bounce the ball too
      const props = (P.well ? [[BUMPER_WELL[0], BUMPER_WELL[1], P.wellR]] : []).concat(P.towers ? BUMPER_TOWERS.map(t => [t[0], t[1], P.towerR]) : []);
      for (const [px, py, pr] of props) {
        const dx = b.x - px, dy = b.y - py, d = Math.hypot(dx, dy), min = pr + b.r;
        if (d >= min || d < 1e-6) continue;
        const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny; b.x = px + nx * min; b.y = py + ny * min;
        if (vn < 0) { b.vx -= (1 + P.ballE) * vn * nx; b.vy -= (1 + P.ballE) * vn * ny; Sfx.play('bumperThud'); }
      }
      if (!bumperFloorAt(b.x, b.y)) { b.state = 'sink'; b.t = 0; Sfx.play('bumperSplashS'); bumperSplashFx(b.x, b.y, 0.7); }
      else if (b.t >= P.ballLife) { b.state = 'sink'; b.t = 0; b.popped = true; puff(b.x, b.y, 8, '#ffffff'); } // a ball that got stuck pops away
      continue;
    }
  }
  st.balls = st.balls.filter(b => !(b.state === 'sink' && b.t > 0.6));
  return moved;
}

function bumperSplashFx(x, y, s = 1) {
  for (let k = 0; k < 14 * s; k++) { const a = bumperVR() * Math.PI * 2, v = 60 + bumperVR() * 160 * s; G.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.5, max: 0.5, col: k % 3 ? '#bfe8ff' : '#ffffff', size: 3 + bumperVR() * 3, grav: 120, kind: 'dot' }); }
  G.mst.rings.push({ x, y, t: 0, s });
}

// the edge: a slow car over the water teeters (and can drive back); a fast one, or a teeter that runs out, splashes
function bumperEdge(st, c, live, dt) {
  const P = bumperP();
  if (!bumperSolid(c)) return;
  const on = bumperFloorAt(c.x, c.y);
  if (on) { if (c.state === 'teeter') { if (c.selfT && c.holdOut && !c.teeterHit) return; // still steering out over the edge: no drive/teeter flicker (and no extra Phew)
      c.state = 'drive'; if (live) { st.stat.saves[c.id]++; c.pop = 'Phew!'; c.popCol = '#ffffff'; c.popT = 0; Sfx.play('bumperPhew', c.id); } } return; }
  const sp = Math.hypot(c.vx, c.vy);
  if (c.state === 'drive') {
    // (lead review) edge brake: a car that leaves the flagstones under its own steam (no boost, no slide or dizzy, no car or
    // ball hit in the last brakeHit s) skids to a teeter whatever its speed; bumps, boosts, cannonballs and Ice Rink keep the speed rule
    const brake = P.edgeBrake && !P.ice && c.boostT <= 0 && c.slideT <= 0 && c.dizzy <= 0 && c.lastHitT > P.brakeHit;
    if (sp <= P.teeterV || brake) {
      if (sp > P.teeterV) { const k = P.teeterV / sp; c.vx *= k; c.vy *= k; }
      c.state = 'teeter'; c.teeter = 0; c.selfT = brake; Sfx.play('bumperTeeter', c.id); return;
    }
    bumperSplash(st, c, live); return;
  }
  c.teeter += dt;
  // a boost while teetering escapes to land, or (pointed at the water) is a boosted exit: it splashes right away
  if (c.boostT > 0) { const d = bumperLandDir(c); if (!d || c.vx * d[0] + c.vy * d[1] < 0) { c.teeterHit = false; bumperSplash(st, c, live); return; } }
  if (c.teeterHit || c.teeter >= (c.selfT && P.selfT > 0 ? P.selfT : P.teeterT)) { c.teeterHit = false; bumperSplash(st, c, live); return; }
  // (playtest) a car that drove off by itself (a braked teeter) scrambles back to land on its own: a slow or one-key kid
  // isn't splashed by their own steering. A bump or a ball during the teeter still splashes it (teeterHit), so catching works.
  if (c.selfT && P.selfPull > 0) { const d = bumperLandDir(c); if (d) { c.vx += d[0] * P.selfPull * dt; c.vy += d[1] * P.selfPull * dt; } }
  if (P.teeterPull > 0) { // (tested knob, off) the wheels grab the edge: a gentle pull back toward the nearest flagstone
    const d = bumperLandDir(c);
    if (d) { c.vx += d[0] * P.teeterPull * dt; c.vy += d[1] * P.teeterPull * dt; }
  }
}
function bumperSplash(st, c, live) {
  const P = bumperP();
  c.state = 'sink'; c.t = 0; c.dizzy = 0; c.boostT = 0;
  bumperSplashFx(c.x, c.y, 1);
  Sfx.play('bumperSplash', c.id); rumble(c.id, 0.6, 0.8, 250);
  bumperFxSplash(c, live);
  if (!live) return;
  const credit = c.lastHitT <= P.creditT ? c.lastHitBy : -1;
  // the results list and the banner print the round winner first, so the reason names the car that splashed
  const ln = NAMES[c.id];
  const why = credit === 0 || credit === 1 ? (c.lastHitKind === 'super' ? 'Super-boosted ' + ln + ' into the moat!' : c.lastHitKind === 'boost' ? 'Boosted ' + ln + ' into the moat!' : c.lastHitKind === 'side' ? 'Side-swiped ' + ln + ' into the moat!' : 'Bumped ' + ln + ' into the moat!')
    : credit === 2 ? 'Cannonballed ' + ln + ' into the moat!' : c.crumbT <= 1.2 ? 'The floor crumbled under ' + ln + '!' : 'Oops! ' + ln + ' drove into the moat!';
  if (credit === 1 - c.id) st.stat.dunks[1 - c.id]++;
  st.rsplash[c.id]++; st.stat.splashes[c.id]++;
  c.lostFlag = { t: 0, gold: c.gold > 0, x: c.x, y: c.y };
  if (c.gold > 0) c.gold--;
  c.flags--;
  if (c.flags <= 0) { c.flags = 0; c.out = true; c.why = why; }
}
function bumperRespawn(st, c) {
  const h = st.home[c.id];
  Object.assign(c, { x: h.x, y: h.y, vx: 0, vy: 0, a: c.id ? Math.PI : 0, spin: 0, state: 'drop', t: 0, dizzy: 0, boostT: 0, slideT: 0, teeter: 0, teeterHit: false, selfT: false, cd: 0, readyT: 0, super: false, lastHitBy: -1, lastHitT: 9, crumbT: 9, mk: null });
}

// crumbling courtyard: ring by ring from the outside, each ring cracks crumbleWarn s before it falls
function bumperCrumble(st, dt, live) {
  const P = bumperP();
  if (!live || st.cr.rings >= P.crumbleRings) return;
  const t = G.match ? G.match.roundT : st.t;
  if (!st.cr.warn && t >= st.cr.next - P.crumbleWarn) {
    st.cr.warn = true;
    for (const [tx, ty] of st.ringTiles[st.cr.rings] || []) st.floor[ty][tx] = 2;
    st.floorVer++;
    Sfx.play('bumperCrack'); st.alert = { text: 'The floor is cracking!', t: 0 };
    st.vis.crackT = 0;
  }
  if (t >= st.cr.next) {
    for (const [tx, ty] of st.ringTiles[st.cr.rings] || []) { st.floor[ty][tx] = 0; st.falling.push({ tx, ty, t: 0 }); }
    st.floorVer++;
    for (const c of st.cars) if (bumperSolid(c) && !bumperFloorAt(c.x, c.y)) c.crumbT = 0;
    bumperFxCrumble(st, st.ringTiles[st.cr.rings] || []);
    st.cr.rings++; st.cr.warn = false; st.cr.next += P.crumbleEvery;
    Sfx.play('bumperCrumble'); if (!reduceMotion) G.shake = Math.max(G.shake, 0.18);
    rumble(0, 0.3, 0.3, 200); rumble(1, 0.3, 0.3, 200);
  }
}

// the whole tick (live = the round is live; false during the round-end banner: physics only, no input, no rules)
function bumperTick(dt, live) {
  const st = G.mst, P = bumperP();
  st.t += dt;
  for (const c of st.cars) {
    const p = G.players[c.id];
    let inp = null;
    if (live) {
      // C1: every fresh press is consumed on every live tick (A / B on this player's own controller boost too)
      const boostPress = p.pendingAct || (p.pendingJump && bumperPadJump(c.id));
      p.pendingAct = false; p.pendingJump = false;
      if (boostPress) bumperBoost(c, live);
      inp = bumperInput(p);
    } else { p.pendingAct = false; p.pendingJump = false; }
    c.lastHitT += dt; c.crumbT += dt; c.fenceSnd = Math.max(0, (c.fenceSnd || 0) - dt); c.honkT = Math.max(0, c.honkT - dt); c.honkSnd = Math.max(0, c.honkSnd - dt); c.popT += dt;
    c.sq = Math.max(0, c.sq - dt * 4);
    if (c.lostFlag) { c.lostFlag.t += dt; if (c.lostFlag.t > 1.2) c.lostFlag = null; }
    if (c.state === 'drive' || c.state === 'teeter') {
      const wasReady = c.cd <= 0;
      c.px = c.x; c.py = c.y;
      bumperDrive(c, inp, dt);
      bumperFence(st, c);
      if (!wasReady && c.cd <= 0 && live) { c.readyFlash = 0.25; Sfx.play('bumperReady', c.id); }
      if (c.ghost > 0) { const o = st.cars[1 - c.id]; const apart = !bumperSolid(o) || Math.hypot(o.x - c.x, o.y - c.y) > c.r + o.r + 4; c.ghost = apart ? Math.max(0, c.ghost - dt) : Math.max(c.ghost, 0.05); }
      if (P.well) bumperWellHit(c);
      if (P.towers) bumperTowerHit(c);
      if (P.pads && c.state === 'drive') bumperPadHit(c);
    } else if (c.state === 'sink') {
      // (playtest) a sinking car slows down hard and stays in the water (never slides onto a wall, the stands or off screen)
      c.t += dt; c.x += c.vx * dt; c.y += c.vy * dt; const k = Math.exp(-P.sinkDrag * dt); c.vx *= k; c.vy *= k;
      const [mx0, my0, mx1, my1] = BUMPER_MOAT;
      if (c.x < mx0 || c.x > mx1) { c.x = clamp(c.x, mx0, mx1); c.vx = 0; }
      if (c.y < my0 || c.y > my1) { c.y = clamp(c.y, my0, my1); c.vy = 0; }
      if (c.t >= P.sinkT && !c.out && live) bumperRespawn(st, c);
    } else if (c.state === 'drop') {
      c.t += dt;
      if (c.t >= P.dropT) {
        c.state = 'drive'; c.ghost = P.ghostT; if (P.respawnSuper || (P.goldSuper && c.goldCar)) c.readyT = P.superT;
        puff(c.x, c.y + 10, 6, '#ffffff'); Sfx.play('bumperLand', c.id);
        c.sq = 0.8; st.vis.balloons.push({ x: c.x, y: c.y - 52, t: 0, id: c.id, sway: bumperVR() < 0.5 ? -1 : 1 });
      }
    }
    c.readyFlash = Math.max(0, c.readyFlash - dt);
  }
  bumperCollide(st, live);
  // (playtest) a cannonball's push can shove one car into the other: separate (and bump) them again
  if (bumperBalls(st, dt, live)) bumperCollide(st, live);
  // a bump's or a ball's separation may have pushed a car into the well or a tower: push it out again
  for (const c of st.cars) if (bumperSolid(c)) { if (P.well) bumperWellHit(c); if (P.towers) bumperTowerHit(c); }
  // ... or through the tyre fence (a ram's separation happens after the fence check above)
  if (P.fence) for (const c of st.cars) bumperFence(st, c);
  bumperCrumble(st, dt, live);
  for (const c of st.cars) bumperEdge(st, c, live, dt);
  for (const f of st.falling) f.t += dt;
  st.falling = st.falling.filter(f => f.t < 0.6);
  for (const r of st.rings) r.t += dt;
  st.rings = st.rings.filter(r => r.t < 0.9);
  st.towerFlash = Math.max(0, (st.towerFlash || 0) - dt);
  if (st.alert) { st.alert.t += dt; if (st.alert.t > 2.2) st.alert = null; }
  bumperVisTick(st, dt);
  if (!live) { bumperCelebrate(st, dt); return; }
  const outs = st.cars.filter(c => c.out);
  if (outs.length === 2) matchRoundEnd(-1, 'Double splash!');
  else if (outs.length === 1 && matchRoundEnd(1 - outs[0].id, outs[0].why)) {
    const w = st.cars[1 - outs[0].id]; st.cele = { id: w.id, t: 0, n: 0 };
    if (bumperSolid(w)) burst(w.x, w.y, PCOL[w.id], 16);
  }
}
// round-win celebration (the framework skips its own for hidden players): the winner does a happy spin, honks and hops,
// and a gold crown bounces over it. (playtest) Every won round gets it (time-ups and tiebreaks too), and the crown and the
// confetti sit above or below the framework's round banner when the car is under it.
function bumperCelebrate(st, dt) {
  const ce = st.cele; if (!ce) return;
  const w = st.cars[ce.id], m = G.match; ce.t += dt;
  if (!bumperSolid(w)) return;
  const [sx, sy] = bumperCeleSpot(w);
  if (ce.n === 0 && ce.t >= 0.25) {
    ce.n = 1; w.spin = 9; Sfx.play('bumperHonk', w.id); w.honkT = 0.5;
    for (let k = 0; k < 14; k++) confetti(sx, sy);
    st.vis.hop = Math.max(st.vis.hop, 0.5); st.vis.hopSide = w.id;
  }
  if (ce.t >= 0.25 && (ce.hopT = (ce.hopT || 0) - dt) <= 0) { ce.hopT = 0.42; w.sq = 1; } // the car hops (squash) again and again
  if (m && m.end && m.end.final && ce.n === 1 && ce.t >= 0.25) { ce.n = 2; confetti(sx, sy); }
  if (m && m.end && m.end.final && ce.n === 2 && ce.t >= 0.85) { ce.n = 3; for (let k = 0; k < 24; k++) confetti(sx, sy); }
}
// where the winner's crown goes: over the car, unless the round banner (centred, about x 245..715, y 136..292) or the match
// pill covers that spot. A car under the banner gets its crown just above or below the banner, with a little arrow at the car.
function bumperCeleSpot(w) {
  const under = (x, y) => Math.abs(x - W / 2) < 235 && y > 128 && y < 298;
  const pill = (x, y) => Math.abs(x - W / 2) < 200 && y < (hudBig() ? 112 : 96);
  const cx = clamp(w.x, 40, W - 40);
  if (under(w.x, w.y)) return w.y < 212 ? [cx, hudBig() ? 117 : 112, 1] : [cx, hudBig() ? 323 : 318, -1];
  for (const [x, y] of [[w.x, w.y - 50], [w.x, w.y + 50], [w.x + (w.x < W / 2 ? 52 : -52), w.y]]) if (!under(x, y) && !pill(x, y)) return [clamp(x, 40, W - 40), y, 0];
  return [cx, w.y - 50, 0];
}
function bumperDrawCele(st) {
  const ce = st.cele; if (!ce || ce.t < 0.2 || !st.cars) return;
  const w = st.cars[ce.id]; if (!bumperSolid(w)) return;
  const [x, y, arrow] = bumperCeleSpot(w), a = clamp((ce.t - 0.2) / 0.2, 0, 1), hop = reduceMotion ? 0 : Math.abs(Math.sin(ce.t * 7.5)) * 7;
  const R = hudBig() ? 26 : 21; // bigger on phones, like the rest of the HUD
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(28,26,54,0.55)'; circle(x, y - hop, R); ctx.fill();
  ctx.strokeStyle = PCOL[w.id]; ctx.lineWidth = 3; circle(x, y - hop, R); ctx.stroke();
  drawCrownShape(x, y - hop + 1, R / 18.3);
  if (arrow) { // points at the car under the banner
    const ay = arrow > 0 ? y + R + 5 - hop * 0.3 : y - R - 5 + hop * 0.3;
    ctx.fillStyle = PCOL[w.id]; ctx.beginPath(); ctx.moveTo(x - 8, ay - 5 * arrow); ctx.lineTo(x + 8, ay - 5 * arrow); ctx.lineTo(x, ay + 5 * arrow); ctx.closePath(); ctx.fill();
  }
  for (let i = 0; i < 3; i++) { const q = ce.t * 3 + i * 2.09; bumperStarShape(x + Math.cos(q) * (R + 9), y - hop + Math.sin(q) * 12, R / 5, i === 1 ? '#ffffff' : C.gold); }
  ctx.restore();
}

function bumperParse(L) {
  const st = G.mst, def = L.def;
  st.floor0 = []; st.home = [];
  for (let ty = 0; ty < ROWS; ty++) {
    const row = [];
    for (let tx = 0; tx < COLS; tx++) {
      const ch = def.map[ty][tx];
      row.push(ch === '+' || ch === '1' || ch === '2' ? 1 : 0);
      if (ch === '1' || ch === '2') st.home[ch === '1' ? 0 : 1] = { x: tx * T + T / 2, y: ty * T + T / 2 };
    }
    st.floor0.push(row);
  }
  // rings: 4-neighbour distance to the nearest non-floor tile (0 = touches the water)
  const dist = st.floor0.map(r => r.map(v => (v ? -1 : 0)));
  const q = [];
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) if (st.floor0[ty][tx]) {
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ox, oy]) => !(st.floor0[ty + oy] && st.floor0[ty + oy][tx + ox]));
    if (nb) { dist[ty][tx] = 0; q.push([tx, ty]); }
  }
  for (let i = 0; i < q.length; i++) {
    const [tx, ty] = q[i];
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = tx + ox, y = ty + oy;
      if (st.floor0[y] && st.floor0[y][x] && dist[y][x] < 0) { dist[y][x] = dist[ty][tx] + 1; q.push([x, y]); }
    }
  }
  st.ringTiles = [];
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) if (st.floor0[ty][tx]) (st.ringTiles[dist[ty][tx]] = st.ringTiles[dist[ty][tx]] || []).push([tx, ty]);
  st.ringOf = dist;
  // Tyre Wall twist: every water-facing side of an outer-ring flagstone gets tyres, except in the four corner gaps
  const G0 = L.def.bumper && L.def.bumper.gap || [6, 5]; // corner gap size: tiles with tx <= gx (or mirrored) and ty <= gy (or mirrored)
  const gap = (tx, ty) => (tx <= G0[0] || tx >= 31 - G0[0]) && (ty <= G0[1] || ty >= 16 - G0[1]);
  st.fenceTiles = [];
  for (const [tx, ty] of st.ringTiles[0] || []) if (!gap(tx, ty)) st.fenceTiles.push([tx, ty]);
  // decoration: the stands' crowd (fixed seats, looks only)
  st.fans = [];
  for (let i = 0; i < 46; i++) {
    const row = i % 2, x = 12 + i * 20.6 + (row ? 4 : 0), h = bumperHash(i, 5);
    st.fans.push({ x, y: 16 * T + (row ? 40 : 20), row, shirt: BUMPER_COLS.crowd[i % 5], skin: BUMPER_COLS.skin[Math.floor(h * 4)],
      flag: h > 0.62 ? (x < W / 2 ? 0 : 1) : -1, ph: h * 6.28, hair: h < 0.3 });
  }
}
// the tyres: a car whose centre would leave a fenced flagstone toward the water bounces back (centre-based, like the edge rule)
function bumperFence(st, c) {
  const P = bumperP(); if (!P.fence || !bumperSolid(c)) return;
  const tx = Math.floor(c.px / T), ty = Math.floor(c.py / T);
  if (!st.fenceOn || !st.fenceOn[ty] || !st.fenceOn[ty][tx] || !st.floor[ty] || !(st.floor[ty][tx] > 0)) return;
  const nx = Math.floor(c.x / T), ny = Math.floor(c.y / T);
  if (st.floor[ny] && st.floor[ny][nx] > 0) return;
  // crossed from a fenced tile into water: put the centre back on the border and reflect
  let hit = false;
  if (nx !== tx && !(st.floor[ty] && st.floor[ty][nx] > 0)) { c.x = nx > tx ? tx * T + T - 0.01 : tx * T + 0.01; const out = Math.max(Math.abs(c.vx) * P.fenceE, P.fenceMin); c.vx = (nx > tx ? -1 : 1) * out; hit = true; }
  if (ny !== ty && !(st.floor[ny] && st.floor[ny][Math.floor(c.x / T)] > 0)) { c.y = ny > ty ? ty * T + T - 0.01 : ty * T + 0.01; const out = Math.max(Math.abs(c.vy) * P.fenceE, P.fenceMin); c.vy = (ny > ty ? -1 : 1) * out; hit = true; }
  if (hit) {
    c.sq = 0.6;
    if (c.fenceSnd <= 0) { Sfx.play('bumperTyre'); c.fenceSnd = 0.15; st.vis.tyreWob.push({ tx, ty, t: 0 }); }
  }
}

/* ---------- looks: effects that never touch the rules ---------- */
function bumperVisNew() { return { stars: [], cols: [], marks: [], balloons: [], smoke: [], shock: [], tyreWob: [], hop: 0, hopSide: -1, crackT: 9, padFlash: [0, 0, 0, 0], towerRing: [] }; }
function bumperVisTick(st, dt) {
  const v = st.vis; if (!v) return;
  const age = (arr, life) => { for (const e of arr) e.t += dt; return arr.filter(e => e.t < life); };
  v.stars = age(v.stars, 0.5); v.cols = age(v.cols, 0.75); v.marks = age(v.marks, 1.6); v.balloons = age(v.balloons, 1.6);
  v.smoke = age(v.smoke, 0.7); v.shock = age(v.shock, 0.4); v.tyreWob = age(v.tyreWob, 0.3); v.towerRing = age(v.towerRing, 0.45);
  v.hop = Math.max(0, v.hop - dt); v.crackT += dt;
  for (let i = 0; i < 4; i++) v.padFlash[i] = Math.max(0, v.padFlash[i] - dt);
  if (!st.cars) return;
  for (const c of st.cars) {
    // skid marks while sliding sideways, spinning or dizzy (on the flagstones only)
    if (bumperSolid(c) && bumperFloorAt(c.x, c.y)) {
      const slide = Math.abs(c.lat || 0) > 95 || Math.abs(c.spin) > 3 || (c.dizzy > 0 && Math.hypot(c.vx, c.vy) > 60);
      c.markT -= dt;
      if (slide && c.markT <= 0) {
        c.markT = 0.025;
        const bx = c.x - Math.cos(c.a) * 9, by = c.y - Math.sin(c.a) * 9, sx = -Math.sin(c.a) * 11, sy = Math.cos(c.a) * 11;
        const w = [[bx + sx, by + sy], [bx - sx, by - sy]];
        if (c.mk) for (let k = 0; k < 2; k++) v.marks.push({ x1: c.mk[k][0], y1: c.mk[k][1], x2: w[k][0], y2: w[k][1], t: 0 });
        c.mk = w;
      } else if (!slide) c.mk = null;
    } else c.mk = null;
    // a teetering car splashes a little at the edge
    if (c.state === 'teeter') {
      c.dripT -= dt;
      if (c.dripT <= 0) {
        c.dripT = 0.07;
        const a = bumperVR() * 6.28;
        G.particles.push({ x: c.x + Math.cos(a) * 16, y: c.y + Math.sin(a) * 16, vx: Math.cos(a) * 40, vy: -40 - bumperVR() * 50, life: 0.35, max: 0.35, col: bumperVR() < 0.5 ? '#bfe8ff' : '#ffffff', size: 2.5 + bumperVR() * 2, grav: 260, kind: 'dot' });
      }
    }
  }
  if (v.marks.length > 240) v.marks.splice(0, v.marks.length - 240);
}
function bumperFxBoost(c, hx, hy, sup) {
  const v = G.mst.vis;
  for (let k = 0; k < (sup ? 12 : 6); k++) G.particles.push({ x: c.x - hx * 22, y: c.y - hy * 22, vx: -hx * 120 + (bumperVR() - 0.5) * 80, vy: -hy * 120 + (bumperVR() - 0.5) * 80, life: 0.3, max: 0.3, col: k % 2 ? C.gold : (sup ? '#fff3b0' : '#ff9a3d'), size: 4, grav: 0, kind: 'dot' });
  puff(c.x - hx * 18, c.y - hy * 18, 4, 'rgba(255,255,255,0.8)');
  if (sup) v.shock.push({ x: c.x, y: c.y, t: 0, col: C.gold });
}
function bumperFxStar(x, y, big, word) {
  const v = G.mst.vis; if (!v) return;
  v.stars.push({ x, y, t: 0, big, a: bumperVR() * 6.28, word: big ? word : null });
  if (v.stars.length > 12) v.stars.shift();
}
function bumperFxBump(px, py, nx, ny, closing, big, hitter) {
  if (closing >= 120) bumperFxStar(px, py, big, ['BONK!', 'BUMP!', 'WHAM!', 'BOOF!'][Math.floor(bumperVR() * 4)]);
  // sparks along the contact, both ways
  const n = big ? 10 : 4;
  for (let k = 0; k < n; k++) {
    const s = (k % 2 ? 1 : -1), a = Math.atan2(ny, nx) + Math.PI / 2 * s + (bumperVR() - 0.5) * 0.9, sp = 120 + bumperVR() * (big ? 260 : 120);
    G.particles.push({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.25, max: 0.25, col: k % 3 ? '#fff6c8' : C.gold, size: 2.5, grav: 0, kind: 'dot' });
  }
  if (big) G.mst.vis.shock.push({ x: px, y: py, t: 0, col: '#ffffff' });
}
function bumperFxPropHit(x, y, cx, cy, R, red) {
  const v = G.mst.vis;
  if (red) v.towerRing.push({ x: cx, y: cy, r: R, t: 0 });
  else { puff(x, y, 5, 'rgba(230,220,250,0.9)'); bumperFxStar(x, y, false); }
}
function bumperFxSplash(c, live) {
  const v = G.mst.vis; if (!v) return;
  v.cols.push({ x: c.x, y: c.y, t: 0, word: live, id: c.id });
  G.mst.rings.push({ x: c.x, y: c.y, t: -0.18, s: 1.3 }); // a second, later ring
  for (let k = 0; k < 8; k++) G.particles.push({ x: c.x + (bumperVR() - 0.5) * 20, y: c.y, vx: (bumperVR() - 0.5) * 90, vy: -260 - bumperVR() * 220, life: 0.7, max: 0.7, col: k % 2 ? '#ffffff' : '#bfe8ff', size: 4 + bumperVR() * 3, grav: 700, kind: 'dot' });
  if (live) { v.hop = 0.45; v.hopSide = 1 - c.id; Sfx.play('bumperCheer'); }
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.08);
}
function bumperFxCrumble(st, tiles) {
  for (let i = 0; i < tiles.length; i++) {
    const [tx, ty] = tiles[i], x = tx * T + T / 2, y = ty * T + T / 2;
    // stone chips tumble off, dust puffs, and every other block plops into the moat
    G.particles.push({ x, y, vx: (bumperVR() - 0.5) * 120, vy: -120 - bumperVR() * 120, life: 0.6, max: 0.6, col: i % 2 ? BUMPER_COLS.floorEdge : BUMPER_COLS.floor, size: 5 + bumperVR() * 4, grav: 600, kind: 'conf', rot: bumperVR() * 6, vr: (bumperVR() - 0.5) * 16 });
    if (i % 2 === 0) G.particles.push({ x: x + (bumperVR() - 0.5) * 20, y, vx: (bumperVR() - 0.5) * 50, vy: -30, life: 0.45, max: 0.45, col: 'rgba(243,231,200,0.8)', size: 6 + bumperVR() * 4, grav: -20, kind: 'dot' });
    if (i % 3 === 0) st.rings.push({ x, y, t: -0.35 - bumperVR() * 0.15, s: 0.45 });
  }
  Sfx.play('bumperPlop');
}

MODES.bumper = {
  rand: Math.random,
  setup(st, L) {
    bumperParse(L);
    for (const row of L.grid) row.fill('.');
    st.stat = { dunks: [0, 0], big: [0, 0], boosts: [0, 0], saves: [0, 0], splashes: [0, 0], supers: [0, 0], bumps: 0 };
    const mix = BUMPER_MIX.slice();
    for (let i = mix.length - 1; i > 0; i--) { const j = Math.floor(this.rand() * (i + 1)); [mix[i], mix[j]] = [mix[j], mix[i]]; }
    st.order = ['classic', ...mix, 'crumble'];
    st.over = this.testOver || null; st.forceTwist = this.testTwist || null;
    st.rings = []; st.falling = []; st.vis = bumperVisNew(); st.loadId = ++bumperLoadN; st.floorVer = 0;
  },
  resetRound(n, info) {
    const st = G.mst, m = G.match;
    st.twist = info.suddenDeath ? 'sudden' : (st.forceTwist || st.order[Math.min(n, st.order.length) - 1]);
    st.P = Object.assign({}, BUMPER, BUMPER_TWISTS[st.twist].P, st.over || {});
    st.floor = st.floor0.map(r => r.slice()); st.floorVer = (st.floorVer || 0) + 1; st.roundVer = (st.roundVer || 0) + 1;
    st.cr = { rings: 0, warn: false, next: st.P.crumbleAt };
    st.fenceOn = st.P.fence ? st.floor0.map(r => r.map(() => 0)) : null;
    if (st.fenceOn) for (const [tx, ty] of st.fenceTiles) st.fenceOn[ty][tx] = 1;
    st.t = 0; st.rbig = [0, 0]; st.rsplash = [0, 0]; st.alert = null; st.falling = []; st.rings = []; st.cele = null;
    st.vis = bumperVisNew();
    st.cars = [0, 1].map(k => bumperMakeCar(k));
    const lead = m.wins[0] - m.wins[1], deficit = [Math.max(0, -lead), Math.max(0, lead)];
    st.goldSaid = false;
    for (const k of [0, 1]) {
      const g = !info.suddenDeath && deficit[k] >= st.P.goldMin ? Math.min(st.P.goldMax, st.P.goldFlags * (deficit[k] - st.P.goldMin + 1)) : 0;
      st.cars[k].gold = g; st.cars[k].flags += g;
      st.cars[k].goldCar = !info.suddenDeath && deficit[k] >= st.P.goldMin; if (st.P.goldSuper && st.cars[k].goldCar) st.cars[k].readyT = st.P.superT;
      st.cars[k].heavy = info.suddenDeath ? 1 : deficit[k] >= 2 ? st.P.heavy2 : deficit[k] >= 1 ? st.P.heavy1 : 1;
    }
    st.balls = []; st.ballT = st.P.ballFirst; st.ballN = 0; st.ballFirstSide = n % 2;
    // the cars are the players: hide the platformer bodies every round (matchResetPlayers revives them)
    for (const p of G.players) Object.assign(p, { alive: false, respawnT: Infinity });
  },
  step(dt) { bumperTick(dt, true); },
  idle(dt) {
    const st = G.mst, m = G.match; if (!st.cars) return;
    // (playtest) a round won any way (a splash-out, the clock, a tiebreak) gets the winner's celebration
    if (m.phase === 'end' && m.end && m.end.winner >= 0 && !st.cele) st.cele = { id: m.end.winner, t: 0, n: 0 };
    if (m.phase === 'end') bumperTick(dt, false);
    else bumperVisTick(st, dt);
    if (m.phase === 'count' && !st.goldSaid && m.t >= 0.05) {
      st.goldSaid = true;
      for (const c of st.cars) if (c.gold > 0) { Sfx.play('bumperGold', c.id); burst(c.x, c.y, C.gold, 10); }
    }
  },
  timeUp() {
    const st = G.mst, f = st.cars.map(c => c.flags), rb = st.rbig;
    if (f[0] !== f[1]) return { winner: f[0] > f[1] ? 0 : 1, reason: 'More flags left!' };
    if (rb[0] !== rb[1]) return { winner: rb[0] > rb[1] ? 0 : 1, reason: 'More big bumps!' };
    return { winner: -1, reason: 'Dead even!' };
  },
  tiebreak() {
    const s = G.mst.stat.dunks; if (s[0] !== s[1]) return { winner: s[0] > s[1] ? 0 : 1, reason: 'Most dunks this match!' };
    const b = G.mst.stat.big; if (b[0] === b[1]) return -1;
    return { winner: b[0] > b[1] ? 0 : 1, reason: 'Most big bumps this match!' };
  },
  draw() { bumperDrawWorld(); },
  drawTop() { bumperDrawTop(); },
  hud() { bumperHud(); },
  stats() {
    // C6: a tile that is 0 for both players is left out, but the card keeps at least two (dunks and saves)
    const s = G.mst.stat;
    const all = [
      { label: 'Moat dunks', values: s.dunks.slice(), keep: true },
      { label: 'Big bumps', values: s.big.slice() },
      { label: 'Super boosts', values: s.supers.slice() },
      { label: 'Edge saves', values: s.saves.slice(), keep: true },
    ];
    let tiles = all.filter(t => t.values[0] || t.values[1]);
    if (tiles.length < 2) tiles = all.filter(t => tiles.includes(t) || t.keep).slice(0, Math.max(2, tiles.length));
    const out = tiles.map(t => ({ label: t.label, values: t.values }));
    if (s.bumps > 0) out.push('Bumps in all: ' + s.bumps + '!');
    return out;
  },
  // test access for the bot harness (no window globals): constants and a few read-only helpers
  test: { BUMPER, BUMPER_TWISTS, BUMPER_TOWERS, BUMPER_WELL, BUMPER_LANES, BUMPER_MOAT, floorAt: bumperFloorAt, padJump: bumperPadJump,
    cache: () => bumperCache, drawStatic: () => bumperDrawStatic(), paint: (g, near, box) => bumperPaintStatic(g, near, box) },
};

/* ---------- drawing ---------- */
// Everything that only changes when the floor changes (moat, flagstones, walls, stands, tyres) is painted once, straight into
// an offscreen canvas; each frame draws that copy and then the moving things on top. When a ring cracks or falls, only those
// stones and their neighbours are repainted (a clip), so the crumble finale doesn't hitch.
let bumperCache = null, bumperLoadN = 0;
function bumperStaticKey() {
  const st = G.mst, P = bumperP();
  return st.loadId + '|' + st.roundVer + '|' + (P.ice ? 1 : 0) + (P.fence ? 1 : 0) + '|' + canvas.width + 'x' + canvas.height;
}
function bumperDrawStatic() {
  const st = G.mst, key = bumperStaticKey();
  let c = bumperCache;
  try {
    if (!c) c = bumperCache = { cv: document.createElement('canvas'), g: null, key: '', ver: -1, floor: null };
    const cv = c.cv, g = c.g || (c.g = cv.getContext('2d'));
    if (c.key !== key) { // a new round, twist or canvas size: paint the whole layer (straight into the cache)
      if (cv.width !== canvas.width || cv.height !== canvas.height) { cv.width = canvas.width; cv.height = canvas.height; }
      g.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
      bumperPaintStatic(g, () => true);
      c.key = key; c.ver = st.floorVer; c.floor = st.floor.map(r => r.slice());
    } else if (c.ver !== st.floorVer) { // (playtest) a ring cracked or fell: repaint only those stones and their neighbours
      const dirty = [], mask = st.floor.map(r => r.map(() => false));
      for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) if (st.floor[ty][tx] !== c.floor[ty][tx]) dirty.push([tx, ty]);
      if (dirty.length) {
        // the clip is built in device pixels, snapped to whole pixels: a soft clip edge would blend each layer separately
        const sx = cv.width / W, sy = cv.height / H, px = (v, s) => Math.round(v * s);
        g.setTransform(1, 0, 0, 1, 0, 0); g.save(); g.beginPath();
        const box = [W, H, 0, 0];
        for (const [tx, ty] of dirty) {
          const x0 = px((tx - 1) * T, sx), y0 = px((ty - 1) * T, sy);
          g.rect(x0, y0, px((tx + 2) * T, sx) - x0, px((ty + 2) * T, sy) - y0); // what changes: the stone, its lips, its shadows
          box[0] = Math.min(box[0], (tx - 1) * T); box[1] = Math.min(box[1], (ty - 1) * T); box[2] = Math.max(box[2], (tx + 2) * T); box[3] = Math.max(box[3], (ty + 2) * T);
          for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) if (mask[ty + oy] && ox + tx >= 0 && ox + tx < COLS) mask[ty + oy][tx + ox] = true;
        }
        g.clip(); g.setTransform(sx, 0, 0, sy, 0, 0);
        bumperPaintStatic(g, (tx, ty) => mask[ty][tx], box);                       // everything else is clipped away (or skipped)
        g.restore();
      }
      c.ver = st.floorVer; c.floor = st.floor.map(r => r.slice());
    }
  } catch (e) { bumperCache = null; bumperPaintStatic(ctx, () => true); return; } // no offscreen canvas: paint it directly
  ctx.drawImage(c.cv, 0, 0, W, H);
}
function bumperRR(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function bumperCirc(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); }
// near(tx, ty): which flagstones to paint; box [x0, y0, x1, y1]: the part of the layer being repainted (everything else is skipped)
function bumperPaintStatic(g, near, box = [0, 0, W, H]) {
  const st = G.mst, P = bumperP(), K = BUMPER_COLS, F = st.floor;
  const fl = (tx, ty) => !!(F[ty] && F[ty][tx] > 0);
  const hit = (x0, y0, x1, y1) => x1 > box[0] && x0 < box[2] && y1 > box[1] && y0 < box[3];
  g.fillStyle = K.stand; g.fillRect(box[0], box[1], box[2] - box[0], box[3] - box[1]);
  // moat
  g.fillStyle = K.water; g.fillRect(T, T, 30 * T, 15 * T);
  for (const [lx, ly] of [[62, 448], [W - 62, 62]]) if (hit(lx - 12, ly - 17, lx + 24, ly + 12)) { // lily pads (point-symmetric decoration)
    g.fillStyle = '#5cb860'; g.beginPath(); g.moveTo(lx, ly); g.arc(lx, ly, 11, 0.5, Math.PI * 2 - 0.1); g.closePath(); g.fill();
    g.fillStyle = '#4a9a50'; g.beginPath(); g.moveTo(lx + 16, ly - 9); g.arc(lx + 16, ly - 9, 7, 2.2, Math.PI * 2 + 1.6); g.closePath(); g.fill();
    g.fillStyle = '#ff9ac7'; bumperCirc(g, lx - 3, ly - 2, 3); g.fill();
  }
  // the island's shadow on the water
  g.fillStyle = 'rgba(16,52,96,0.28)';
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) if (F[ty][tx] > 0 && near(tx, ty)) {
    if (!fl(tx, ty + 1)) g.fillRect(tx * T + 3, ty * T + T, T, 7);
    if (!fl(tx + 1, ty)) g.fillRect(tx * T + T, ty * T + 4, 5, T);
  }
  // steady flagstones (cracking ones are drawn every frame, they jitter)
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) if (F[ty][tx] === 1 && near(tx, ty)) bumperTile(g, tx, ty, 0, 0, P.ice, fl);
  // walls with battlements, the gate, the corner towers
  if (hit(0, 0, W, 40) || hit(0, 0, 40, 16 * T) || hit(W - 40, 0, W, 16 * T)) bumperPaintWalls(g);
  // the stands: wooden bleachers (the crowd, the parapet and the bunting are drawn every frame)
  const y0 = 16 * T;
  if (hit(0, y0, W, H)) {
    g.fillStyle = K.wood; g.fillRect(0, y0, W, H - y0);
    g.fillStyle = K.woodDk; g.fillRect(0, y0 + 30, W, 3); g.fillRect(0, y0 + 52, W, 3);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, y0 + 33, W, 3);
  }
  // centre ring + home circles
  g.strokeStyle = P.ice ? 'rgba(120,170,210,0.4)' : 'rgba(160,120,70,0.35)'; g.lineWidth = 3; bumperCirc(g, 480, 255, 60); g.stroke();
  for (const k of [0, 1]) { const h = st.home[k]; g.strokeStyle = PCOL[k]; g.globalAlpha = 0.45; g.lineWidth = 3; bumperCirc(g, h.x, h.y, 24); g.stroke(); g.globalAlpha = 1; }
  // tyres along the outer ring (Tyre Wall)
  if (P.fence && st.fenceOn) for (const [tx, ty] of st.fenceTiles) if (F[ty][tx] > 0 && near(tx, ty)) bumperTyres(g, tx, ty, 1);
}
function bumperPaintWalls(g) {
  const K = BUMPER_COLS;
  g.fillStyle = K.wall; g.fillRect(0, 0, W, T); g.fillRect(0, 0, T, 16 * T); g.fillRect(31 * T, 0, T, 16 * T);
  g.strokeStyle = 'rgba(60,52,90,0.35)'; g.lineWidth = 1;
  for (let x = 15; x < W; x += 30) { g.beginPath(); g.moveTo(x, 14); g.lineTo(x, 26); g.stroke(); }
  for (let y = 45; y < 16 * T; y += 30) { g.beginPath(); g.moveTo(14, y); g.lineTo(26, y); g.moveTo(W - 14, y); g.lineTo(W - 26, y); g.stroke(); }
  g.fillStyle = K.wallHi;
  for (let x = 6; x < W; x += 30) { bumperRR(g, x, 2, 18, 9, 2); g.fill(); }
  for (let y = 36; y < 16 * T; y += 30) { bumperRR(g, 2, y, 9, 18, 2); g.fill(); bumperRR(g, W - 11, y, 9, 18, 2); g.fill(); }
  g.fillStyle = K.wallDk; g.fillRect(T, T - 4, 30 * T, 4); g.fillRect(T - 4, T, 4, 15 * T); g.fillRect(31 * T, T, 4, 15 * T);
  g.fillStyle = 'rgba(28,40,80,0.22)'; g.fillRect(T, T, 30 * T, 7); g.fillRect(T, T, 7, 15 * T); g.fillRect(31 * T - 7, T, 7, 15 * T);
  g.fillStyle = K.wallDk; bumperRR(g, 15 * T - 2, 0, 2 * T + 4, T + 2, 8); g.fill();
  g.fillStyle = '#4b3a2e'; bumperRR(g, 15 * T + 4, 3, 2 * T - 8, T - 3, 6); g.fill();
  g.strokeStyle = '#2e241c'; g.lineWidth = 2;
  for (let x = 15 * T + 12; x < 17 * T - 6; x += 9) { g.beginPath(); g.moveTo(x, 5); g.lineTo(x, T - 1); g.stroke(); }
  g.beginPath(); g.moveTo(15 * T + 5, 14); g.lineTo(17 * T - 5, 14); g.stroke();
  for (const k of [0, 1]) {
    const x = k === 0 ? 15 : W - 15, y = 15;
    g.fillStyle = 'rgba(28,26,54,0.25)'; bumperCirc(g, x + 3, y + 5, 25); g.fill();
    g.fillStyle = K.wallHi; bumperCirc(g, x, y, 24); g.fill(); g.strokeStyle = K.wallDk; g.lineWidth = 3; g.stroke();
    g.fillStyle = K.wall; bumperCirc(g, x, y, 15); g.fill();
    g.fillStyle = K.wallDk; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.2; bumperCirc(g, x + Math.cos(a) * 20, y + Math.sin(a) * 20, 2.2); g.fill(); }
  }
}
// one flagstone: checker with a little per-stone variation, joints, and a stone lip on the sides facing water
function bumperTile(g, tx, ty, jit, crackK, ice, fl) {
  const K = BUMPER_COLS, h = bumperHash(tx, ty), x = tx * T + jit, y = ty * T;
  g.fillStyle = ice ? ((tx + ty) % 2 ? K.ice : K.iceHi) : ((tx + ty) % 2 ? K.floor : K.floorHi);
  g.fillRect(x, y, T, T);
  if (!ice) {
    if (h > 0.55) { g.fillStyle = h > 0.8 ? 'rgba(255,255,255,0.18)' : 'rgba(150,118,70,0.08)'; g.fillRect(x + 1, y + 1, T - 2, T - 2); }
    if (h < 0.3) { g.fillStyle = 'rgba(140,110,70,0.22)'; bumperCirc(g, x + 6 + h * 50, y + 8 + h * 30, 1.4); g.fill(); bumperCirc(g, x + 20 - h * 20, y + 21, 1.1); g.fill(); }
  } else if (h < 0.35) { g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 6, y + 20); g.lineTo(x + 14, y + 10); g.moveTo(x + 13, y + 23); g.lineTo(x + 17, y + 18); g.stroke(); }
  g.strokeStyle = K.joint; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
  if (crackK > 0) { // the crack grows while the ring gets ready to fall (each stone cracks its own way)
    const gr = 0.4 + 0.6 * crackK, q = Math.floor(h * 4) * Math.PI / 2 + h, cx = x + T / 2 + (h - 0.5) * 8, cy = y + T / 2 + (0.5 - h) * 6;
    const pt = (a, r) => [cx + Math.cos(q + a) * r * gr, cy + Math.sin(q + a) * r * gr];
    g.strokeStyle = 'rgba(70,48,26,' + (0.4 + 0.35 * crackK) + ')'; g.lineWidth = 1.1 + 0.7 * crackK; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(cx, cy);
    let p = pt(0.3, 7); g.lineTo(p[0], p[1]); p = pt(-0.2, 13); g.lineTo(p[0], p[1]);
    g.moveTo(cx, cy); p = pt(2.4, 6); g.lineTo(p[0], p[1]); p = pt(2.9, 11); g.lineTo(p[0], p[1]);
    if (crackK > 0.5) { g.moveTo(cx, cy); p = pt(4.4, 16 * (crackK - 0.5)); g.lineTo(p[0], p[1]); }
    g.stroke();
  }
  if (!fl(tx, ty + 1)) { g.fillStyle = K.floorEdge; g.fillRect(x, y + T - 5, T, 5); g.fillStyle = K.floorFace; g.fillRect(x, y + T - 1.5, T, 1.5); }
  if (!fl(tx - 1, ty)) { g.fillStyle = K.floorEdge; g.fillRect(x, y, 3, T); }
  if (!fl(tx + 1, ty)) { g.fillStyle = K.floorEdge; g.fillRect(x + T - 3, y, 3, T); }
  if (!fl(tx, ty - 1)) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x, y, T, 2); }
}
// a row of three tyres on every water-facing side of a fenced flagstone
function bumperTyres(g, tx, ty, ws) {
  const st = G.mst;
  for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (st.floor[ty + oy] && st.floor[ty + oy][tx + ox] > 0) continue;
    const cx = tx * T + T / 2 + ox * (T / 2 + 5), cy = ty * T + T / 2 + oy * (T / 2 + 5);
    for (const k of [-1, 0, 1]) {
      const x = cx + (oy ? k * 10 : 0), y = cy + (ox ? k * 10 : 0);
      g.fillStyle = '#26243a'; bumperCirc(g, x, y, 6 * ws); g.fill(); g.strokeStyle = '#3d3a58'; g.lineWidth = 1.5; bumperCirc(g, x, y, 4.2 * ws); g.stroke();
      g.fillStyle = '#5a5678'; bumperCirc(g, x, y, 2.2); g.fill();
    }
  }
}
function bumperDrawWater() {
  const st = G.mst, K = BUMPER_COLS, F = st.floor;
  const fl = (tx, ty) => !!(F[ty] && F[ty][tx] > 0);
  ctx.strokeStyle = K.waterHi; ctx.lineWidth = 2;
  for (let i = 0; i < 16; i++) { // ripples drifting with the current
    const x = (i * 197 + G.clock * 14) % (30 * T) + T, y = T + 10 + ((i * 83) % (15 * T - 20));
    if (bumperFloorAt(x - 12, y) || bumperFloorAt(x + 12, y) || bumperFloorAt(x, y + 6)) continue;
    ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.quadraticCurveTo(x, y - 4, x + 10, y); ctx.stroke();
  }
  // foam licking the island's edge
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.beginPath();
  for (const ring of st.ringTiles) for (const [tx, ty] of ring) {
    if (!(F[ty][tx] > 0)) continue;
    const dn = !fl(tx, ty + 1), up = !fl(tx, ty - 1), lf = !fl(tx - 1, ty), rt = !fl(tx + 1, ty);
    if (!(dn || up || lf || rt)) continue;
    const o = 3 + Math.sin(G.clock * 2.2 + bumperHash(tx, ty) * 6.28) * 2;
    if (dn) { ctx.moveTo(tx * T + 4, ty * T + T + 6 + o); ctx.lineTo(tx * T + T - 6, ty * T + T + 6 + o); }
    if (up) { ctx.moveTo(tx * T + 6, ty * T - o); ctx.lineTo(tx * T + T - 4, ty * T - o); }
    if (lf) { ctx.moveTo(tx * T - o, ty * T + 6); ctx.lineTo(tx * T - o, ty * T + T - 4); }
    if (rt) { ctx.moveTo(tx * T + T + 3 + o, ty * T + 4); ctx.lineTo(tx * T + T + 3 + o, ty * T + T - 6); }
  }
  ctx.stroke();
  // a rubber duck paddling round the moat
  const per = 2 * (870 + 420), d = (G.clock * 16) % per;
  let dx, dy, dir;
  if (d < 870) { dx = 45 + d; dy = 45; dir = 0; } else if (d < 1290) { dx = 915; dy = 45 + (d - 870); dir = 1; }
  else if (d < 2160) { dx = 915 - (d - 1290); dy = 465; dir = 2; } else { dx = 45; dy = 465 - (d - 2160); dir = 3; }
  if (!bumperFloorAt(dx, dy)) {
    const bob = Math.sin(G.clock * 4) * 1;
    ctx.save(); ctx.translate(dx, dy + bob); ctx.rotate(dir * Math.PI / 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(-6, 0, 10, 2.3, 3.9); ctx.stroke();
    ctx.fillStyle = '#ffd23d'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
    circle(6, 0, 4.5); ctx.fill();
    ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.moveTo(10, -1.5); ctx.lineTo(14, 0); ctx.lineTo(10, 1.5); ctx.fill();
    ctx.restore();
  }
}
// cracking flagstones (they jitter) and stones falling into the moat
function bumperDrawIslandFx() {
  const st = G.mst, P = bumperP(), K = BUMPER_COLS, F = st.floor;
  const fl = (tx, ty) => !!(F[ty] && F[ty][tx] > 0);
  if (st.cr && st.cr.warn) {
    const crackK = clamp(st.vis.crackT / P.crumbleWarn, 0, 1);
    for (const [tx, ty] of st.ringTiles[st.cr.rings] || []) if (F[ty][tx] === 2) {
      const jit = reduceMotion ? 0 : Math.sin(G.clock * 40 + tx * 3 + ty) * (0.6 + 0.9 * crackK);
      bumperTile(ctx, tx, ty, jit, crackK, P.ice, fl);
    }
  }
  for (const f of st.falling) {
    const k = f.t / 0.6, h = bumperHash(f.tx, f.ty), s = T * (1 - 0.5 * k);
    ctx.save(); ctx.globalAlpha = 1 - k * k;
    ctx.translate(f.tx * T + T / 2, f.ty * T + T / 2 + k * 8); ctx.rotate((h - 0.5) * 1.2 * k);
    ctx.fillStyle = (f.tx + f.ty) % 2 ? K.floor : K.floorHi; ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.fillStyle = 'rgba(30,70,120,' + (0.55 * k) + ')'; ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.fillStyle = K.floorEdge; ctx.fillRect(-s / 2, s / 2 - 4, s, 4);
    ctx.restore();
  }
}
// banners and pennants on the walls, and the cheering crowd (it hops after a splash)
function bumperDrawWallsFx() {
  for (const k of [0, 1]) {
    const bx = k === 0 ? 238 : W - 238, sw = Math.sin(G.clock * 2 + k) * 1.5;
    ctx.fillStyle = PDARK[k]; ctx.fillRect(bx - 12, T - 4, 24, 4);
    ctx.fillStyle = PCOL[k]; ctx.beginPath(); ctx.moveTo(bx - 10, T); ctx.lineTo(bx + 10, T); ctx.lineTo(bx + 10 + sw, T + 22); ctx.lineTo(bx + sw, T + 16); ctx.lineTo(bx - 10 + sw, T + 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.gold; circle(bx + sw * 0.5, T + 8, 3.5); ctx.fill();
    const x = k === 0 ? 15 : W - 15, y = 15, fl = Math.sin(G.clock * 7 + k * 2) * 2;
    ctx.strokeStyle = '#d8d3e8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x, y - 18); ctx.stroke();
    ctx.fillStyle = PCOL[k]; ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x + (k ? -16 : 16), y - 13 + fl * 0.4); ctx.lineTo(x, y - 8); ctx.closePath(); ctx.fill();
  }
  const st = G.mst, K = BUMPER_COLS, y0 = 16 * T, v = st.vis || { hop: 0 };
  const hopK = v.hop > 0 ? Math.sin((1 - v.hop / 0.5) * Math.PI) : 0;
  for (const f of st.fans || []) {
    const cheer = hopK * (f.flag < 0 || v.hopSide < 0 || f.flag === v.hopSide ? 1 : 0.4);
    const y = f.y + Math.sin(G.clock * 5 + f.ph) * 1.5 - cheer * 7;
    ctx.fillStyle = f.shirt; rr(f.x - 8, y + 2, 16, 14, 7); ctx.fill();
    ctx.fillStyle = f.skin; circle(f.x, y - 2, 6.5); ctx.fill();
    if (f.hair) { ctx.fillStyle = '#5a3d2b'; ctx.beginPath(); ctx.arc(f.x, y - 3, 6.5, Math.PI, 0); ctx.fill(); }
    if (f.flag >= 0) { // a little fan flag, waved harder when cheering
      const wv = Math.sin(G.clock * (cheer > 0 ? 18 : 4) + f.ph) * (cheer > 0 ? 4 : 1.5);
      ctx.strokeStyle = '#6b4630'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(f.x + 7, y + 8); ctx.lineTo(f.x + 9, y - 12); ctx.stroke();
      ctx.fillStyle = PCOL[f.flag]; ctx.beginPath(); ctx.moveTo(f.x + 9, y - 12); ctx.lineTo(f.x + 21, y - 9 + wv * 0.5); ctx.lineTo(f.x + 9, y - 5); ctx.closePath(); ctx.fill();
    } else if (cheer > 0.3) { // arms up
      ctx.strokeStyle = f.skin; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(f.x - 6, y + 4); ctx.lineTo(f.x - 10, y - 8); ctx.moveTo(f.x + 6, y + 4); ctx.lineTo(f.x + 10, y - 8); ctx.stroke(); ctx.lineCap = 'butt';
    }
  }
  // parapet + bunting in front of the crowd
  ctx.fillStyle = K.wall; ctx.fillRect(0, y0 - 2, W, 8); ctx.fillStyle = K.wallDk; ctx.fillRect(0, y0 + 6, W, 2);
  const cols = [C.pip, C.gold, C.bo, '#ffffff'];
  for (let c = 0; c < 4; c++) {
    ctx.fillStyle = cols[c]; ctx.beginPath();
    for (let i = c; i < 48; i += 4) { const x = i * 20 + 2, sag = Math.sin((i % 8) / 8 * Math.PI) * 3; ctx.moveTo(x, y0 + 7 + sag); ctx.lineTo(x + 16, y0 + 7 + sag); ctx.lineTo(x + 8, y0 + 17 + sag); ctx.closePath(); }
    ctx.fill();
  }
}
function bumperDrawProps() {
  const st = G.mst, P = bumperP(), K = BUMPER_COLS, v = st.vis;
  // skid marks
  ctx.lineCap = 'round'; ctx.lineWidth = 3.2;
  for (const m of v.marks) {
    if (!bumperFloorAt(m.x2, m.y2)) continue;
    ctx.strokeStyle = P.ice ? 'rgba(255,255,255,' + (0.8 * (1 - m.t / 1.6)) + ')' : 'rgba(70,52,36,' + (0.24 * (1 - m.t / 1.6)) + ')';
    ctx.beginPath(); ctx.moveTo(m.x1, m.y1); ctx.lineTo(m.x2, m.y2); ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // tyres that were just hit wobble (drawn bigger over the cached ones)
  if (P.fence) for (const w of v.tyreWob) if (st.floor[w.ty] && st.floor[w.ty][w.tx] > 0) bumperTyres(ctx, w.tx, w.ty, 1 + 0.35 * Math.sin(w.t / 0.3 * Math.PI));
  // royal carpets
  if (P.pads) BUMPER_PADS.forEach((pd, i) => {
    if (!bumperFloorAt(pd.x, pd.y)) return;
    ctx.save(); ctx.translate(pd.x, pd.y); ctx.rotate(Math.atan2(pd.dy, pd.dx));
    ctx.fillStyle = 'rgba(28,26,54,0.2)'; rr(-28, -12, 60, 30, 5); ctx.fill();
    ctx.fillStyle = v.padFlash[i] > 0 ? '#ff6a76' : K.carpet; rr(-30, -15, 60, 30, 5); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(-27, -12, 54, 24, 4); ctx.stroke();
    ctx.fillStyle = C.gold; for (const fx of [-30, 30]) for (const fy of [-10, 0, 10]) { circle(fx, fy, 1.8); ctx.fill(); } // fringe
    const ph = (G.clock * 2) % 1;
    for (let j = 0; j < 2; j++) { const ox = -14 + j * 16 + ph * 6; ctx.globalAlpha = 0.6 + 0.4 * Math.sin((ph + j * 0.5) * Math.PI); ctx.beginPath(); ctx.moveTo(ox - 4, -8); ctx.lineTo(ox + 6, 0); ctx.lineTo(ox - 4, 8); ctx.lineTo(ox - 1, 0); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  });
  // the well (always): stone ring with dark water; in Bumper Towers a red pinball bumper
  if (P.well) {
    const [wx, wy] = BUMPER_WELL, R = P.wellR;
    ctx.fillStyle = 'rgba(28,26,54,0.25)'; circle(wx + 4, wy + 5, R + 2); ctx.fill();
    if (P.towers) bumperDrawBumper(wx, wy, R, st.towerFlash > 0);
    else {
      ctx.fillStyle = K.wall; circle(wx, wy, R); ctx.fill(); ctx.strokeStyle = K.wallDk; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = K.wallHi; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.39; ctx.moveTo(wx + Math.cos(a) * R * 0.66, wy + Math.sin(a) * R * 0.66); ctx.lineTo(wx + Math.cos(a) * (R - 2), wy + Math.sin(a) * (R - 2)); }
      ctx.stroke();
      ctx.fillStyle = K.waterDk; circle(wx, wy, R * 0.6); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(wx, wy, R * 0.35 + Math.sin(G.clock * 3) * 2, 3.6, 5.2); ctx.stroke();
    }
  }
  if (P.towers) for (const [tx, ty] of BUMPER_TOWERS) {
    ctx.fillStyle = 'rgba(28,26,54,0.25)'; circle(tx + 4, ty + 5, P.towerR + 2); ctx.fill();
    bumperDrawBumper(tx, ty, P.towerR, st.towerFlash > 0);
  }
  for (const r of v.towerRing) { const k = r.t / 0.45; ctx.strokeStyle = 'rgba(255,197,61,' + (1 - k) + ')'; ctx.lineWidth = 4 * (1 - k) + 1; circle(r.x, r.y, r.r + 4 + 18 * k); ctx.stroke(); }
  // cannons on the side walls (Cannonballs) and the warning lines
  if (P.balls) {
    for (const k of [0, 1]) for (const y of BUMPER_LANES) {
      const x = k === 0 ? 22 : W - 22, s = k === 0 ? 1 : -1;
      ctx.fillStyle = '#3a3550'; rr(x - 14, y - 9, 28, 18, 7); ctx.fill();
      ctx.fillStyle = '#26223a'; circle(x + 12 * s, y, 7); ctx.fill();
      ctx.fillStyle = '#4c466a'; rr(x - 12, y - 7, 18, 4, 2); ctx.fill();
    }
    for (const b of st.balls) if (b.state === 'warn') {
      const a = 0.4 + 0.4 * Math.sin(G.clock * 20);
      ctx.strokeStyle = 'rgba(255,255,255,' + a + ')'; ctx.lineWidth = 3; ctx.setLineDash([10, 10]); ctx.lineDashOffset = -G.clock * 60 * (b.side ? -1 : 1);
      ctx.beginPath(); ctx.moveTo(b.side === 0 ? 60 : W - 60, b.y); ctx.lineTo(b.side === 0 ? W - 60 : 60, b.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(28,26,54,0.75)'; circle(b.side === 0 ? 75 : W - 75, b.y, 13); ctx.fill();
      text('!', b.side === 0 ? 75 : W - 75, b.y + 1, 20, C.gold, 'center');
      const mx = b.side === 0 ? 34 : W - 34, fz = Math.floor(G.clock * 30); // the fuse sparks at the cannon mouth
      ctx.fillStyle = bumperHash(fz, 1) > 0.5 ? C.gold : '#ffffff'; circle(mx, b.y - 8, 2.5 + bumperHash(fz, 2) * 2); ctx.fill();
    }
  }
  // splash rings
  for (const r of st.rings) { if (r.t < 0) continue; const k = r.t / 0.9; ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - k)) + ')'; ctx.lineWidth = 3; circle(r.x, r.y, 8 + 34 * k * r.s); ctx.stroke(); }
}
function bumperDrawBumper(x, y, R, flash) {
  ctx.fillStyle = BUMPER_COLS.wall; circle(x, y, R); ctx.fill(); ctx.strokeStyle = BUMPER_COLS.wallDk; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = flash ? C.gold : '#e05a5a'; circle(x, y, R * 0.68); ctx.fill();
  ctx.strokeStyle = flash ? '#fff6c8' : '#ffffff'; ctx.lineWidth = 2; circle(x, y, R * 0.45); ctx.stroke();
  ctx.fillStyle = flash ? '#fff6c8' : C.gold;
  ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? R * 0.14 : R * 0.3; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; circle(x - R * 0.3, y - R * 0.3, R * 0.16); ctx.fill();
}
function bumperDrawWorld() {
  const st = G.mst; if (!st.floor) return;
  bumperDrawStatic();
  bumperDrawWater();
  bumperDrawIslandFx();
  bumperDrawWallsFx();
  bumperDrawProps();
}
function bumperDrawCar(c) {
  const P = bumperP(), R = c.r;
  let s = 1, alpha = 1, lift = 0, wet = 0;
  if (c.state === 'sink') { const k = Math.min(1, c.t / P.sinkT); s = 1 - 0.55 * k; alpha = 1 - 0.8 * k; wet = k; }
  if (c.state === 'drop') { const k = c.t / P.dropT; lift = (1 - k) * 60; s = 1 + 0.3 * (1 - k); }
  if (c.ghost > 0 && bumperSolid(c)) alpha = 0.45 + 0.25 * Math.sin(G.clock * 20);
  ctx.save();
  // shadow on the floor (a dropping car's shadow grows as it comes down)
  ctx.globalAlpha = alpha * (c.state === 'drop' ? 0.12 + 0.13 * c.t / P.dropT : 0.25); ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.ellipse(c.x + 3, c.y + 5, (R + 2) * (c.state === 'drop' ? 0.6 + 0.4 * c.t / P.dropT : s), (R + 1) * (c.state === 'drop' ? 0.6 + 0.4 * c.t / P.dropT : s), 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.translate(c.x, c.y - lift);
  if (c.state === 'drop') { // hanging from a balloon
    const sw = Math.sin(G.clock * 3 + c.id) * 3;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -10); ctx.quadraticCurveTo(sw, -26, sw * 0.6, -38); ctx.stroke();
    bumperDrawBalloon(sw * 0.6, -52, c.id, 1);
  }
  const wob = c.state === 'teeter' && !reduceMotion ? Math.sin(G.clock * 30) * 0.14 : 0;
  // motion swirls while spinning hard
  if (Math.abs(c.spin) > 2.5 && bumperSolid(c)) {
    const k = clamp((Math.abs(c.spin) - 2.5) / 9, 0, 1), dir = Math.sign(c.spin);
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 + 0.5 * k) + ')'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) { const a0 = c.a + i * Math.PI + Math.PI / 2; ctx.beginPath(); ctx.arc(0, 0, R + 6, a0, a0 - dir * (0.6 + 0.8 * k), dir > 0); ctx.stroke(); }
    ctx.lineCap = 'butt';
  }
  // boost: speed lines behind the car
  if (c.boostT > 0) {
    ctx.save(); ctx.rotate(c.a); ctx.strokeStyle = c.super ? 'rgba(255,224,130,0.85)' : 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const oy of [-12, 0, 12]) { const L = 14 + bumperHash(Math.floor(G.clock * 40), oy + 20) * 14; ctx.beginPath(); ctx.moveTo(-R - 8, oy); ctx.lineTo(-R - 8 - L, oy); ctx.stroke(); }
    ctx.restore();
  }
  ctx.save(); ctx.rotate(c.a + wob); ctx.scale(s * (1 + c.sq * 0.12), s * (1 - c.sq * 0.08));
  // rubber skirt all round, a white front bumper on the nose
  if (c.super && c.boostT > 0) { ctx.fillStyle = 'rgba(255,197,61,0.45)'; circle(0, 0, R + 6); ctx.fill(); }
  ctx.fillStyle = BUMPER_COLS.rubber; circle(0, 0, R + 1); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R - 1, 3.6, 4.9); ctx.stroke();
  if (c.gold > 0) { ctx.strokeStyle = C.gold; ctx.lineWidth = 3; circle(0, 0, R - 0.5); ctx.stroke(); }
  ctx.strokeStyle = '#f6efdf'; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, R - 2, -0.75, 0.75); ctx.stroke(); ctx.lineCap = 'butt';
  // the tub
  ctx.fillStyle = PCOL[c.id]; ctx.strokeStyle = PDARK[c.id]; ctx.lineWidth = 2.5; circle(0, 0, R - 4.5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(-4, -7, 7, 3.5, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff6c8'; circle(R - 7, -6.5, 2.6); ctx.fill(); circle(R - 7, 6.5, 2.6); ctx.fill(); // headlights
  // boost lamp at the back: red while it recharges (fills up), green when ready, gold when SUPER
  const ready = c.cd <= 0, sup = ready && P.superT > 0 && c.readyT >= P.superT;
  ctx.fillStyle = '#1c1a36'; circle(-R + 6, 0, 5); ctx.fill();
  if (ready) {
    ctx.fillStyle = sup ? C.gold : '#5fe08a'; circle(-R + 6, 0, 4); ctx.fill();
    if (sup) { ctx.strokeStyle = 'rgba(255,240,180,' + (0.5 + 0.5 * Math.sin(G.clock * 14)) + ')'; ctx.lineWidth = 2; circle(-R + 6, 0, 6.5); ctx.stroke(); }
    if (c.readyFlash > 0) { ctx.strokeStyle = 'rgba(160,255,190,' + (c.readyFlash / 0.25) + ')'; ctx.lineWidth = 2; circle(-R + 6, 0, 6 + 8 * (1 - c.readyFlash / 0.25)); ctx.stroke(); }
  } else { ctx.fillStyle = '#ff8a5c'; ctx.beginPath(); ctx.moveTo(-R + 6, 0); ctx.arc(-R + 6, 0, 4, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * (1 - c.cd / P.boostCD)); ctx.fill(); }
  if (c.boostT > 0) { // flame out of the back
    const fl = 14 + bumperHash(Math.floor(G.clock * 50), c.id) * 8;
    ctx.fillStyle = c.super ? '#fff3b0' : C.gold; ctx.beginPath(); ctx.moveTo(-R - 1, -7); ctx.lineTo(-R - fl, 0); ctx.lineTo(-R - 1, 7); ctx.fill();
    ctx.fillStyle = c.super ? '#ffffff' : '#ff9a3d'; ctx.beginPath(); ctx.moveTo(-R - 1, -3.5); ctx.lineTo(-R - fl * 0.55, 0); ctx.lineTo(-R - 1, 3.5); ctx.fill();
  }
  // the driver, seen from above, eyes toward the nose (Bo has round ears, Pip a green sprout)
  ctx.fillStyle = PCOL[c.id]; ctx.strokeStyle = PDARK[c.id]; ctx.lineWidth = 2;
  if (c.id === 1) { circle(-4, -8, 3.6); ctx.fill(); ctx.stroke(); circle(-4, 8, 3.6); ctx.fill(); ctx.stroke(); }
  circle(-1, 0, 8.5); ctx.fill(); ctx.stroke();
  if (c.dizzy > 0 || c.state === 'sink') { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; for (const ey of [-3.8, 3.8]) { ctx.beginPath(); ctx.moveTo(2, ey - 2); ctx.lineTo(6, ey + 2); ctx.moveTo(6, ey - 2); ctx.lineTo(2, ey + 2); ctx.stroke(); } }
  else {
    const happy = c.popT < 0.9 || (G.mst.cele && G.mst.cele.id === c.id);
    for (const ey of [-3.8, 3.8]) {
      if (happy) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(4.5, ey, 2.2, Math.PI / 2 + 0.4, Math.PI * 1.5 - 0.4, true); ctx.stroke(); }
      else { ctx.fillStyle = '#fff'; circle(4, ey, 2.7); ctx.fill(); ctx.fillStyle = C.ink; circle(5.2, ey, 1.4); ctx.fill(); }
    }
  }
  if (c.id === 0) { ctx.fillStyle = '#5cc27f'; ctx.strokeStyle = '#3d8f5a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(-6, -2, 5, 2.5, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  if (wet > 0) { ctx.fillStyle = 'rgba(74,163,216,' + (0.7 * wet) + ')'; circle(0, 0, R + 2); ctx.fill(); }
  ctx.restore();
  // the pole with the flags (lives), drawn upright so it reads from any heading
  const bx = -Math.cos(c.a) * (R - 6) * s, by = -Math.sin(c.a) * (R - 6) * s;
  ctx.strokeStyle = '#d8d3e8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 30 * s); ctx.stroke();
  ctx.fillStyle = C.gold; circle(bx, by - 30 * s, 2.2); ctx.fill();
  const nf = c.flags;
  for (let i = 0; i < nf; i++) {
    const fy = by - 28 * s + i * 7 * s, gold = i < c.gold; // gold flags on top (they are lost first)
    const flap = Math.sin(G.clock * 9 + i) * 2;
    ctx.fillStyle = gold ? C.gold : PCOL[c.id]; ctx.strokeStyle = C.ink; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx, fy); ctx.lineTo(bx + 13 * s, fy + 2.5 * s + flap * 0.3); ctx.lineTo(bx, fy + 6 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  // a lost flag flutters away
  if (c.lostFlag) {
    const L = c.lostFlag, k = L.t / 1.2, fx = L.x + 10 + k * 40, fy = L.y - 30 - k * 50 + Math.sin(k * 12) * 5;
    ctx.save(); ctx.globalAlpha = 1 - k; ctx.translate(fx, fy); ctx.rotate(Math.sin(k * 9) * 0.8);
    ctx.fillStyle = L.gold ? C.gold : PCOL[c.id]; ctx.strokeStyle = C.ink; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(13, 0); ctx.lineTo(0, 3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  if (c.dizzy > 0 && bumperSolid(c)) for (let i = 0; i < 3; i++) { const a = G.clock * 8 + i * 2.1; bumperStarShape(c.x + Math.cos(a) * 17, c.y - 16 + Math.sin(a) * 6, 4, C.gold); }
  if (c.state === 'teeter') { const b = Math.abs(Math.sin(G.clock * 12)) * 3; ctx.fillStyle = 'rgba(28,26,54,0.75)'; circle(c.x, c.y - 46 - b, 11); ctx.fill(); text('!', c.x, c.y - 45 - b, 18, C.gold, 'center'); }
  if (c.honkT > 0) { const k = 1 - c.honkT / 0.5; ctx.globalAlpha = 1 - k; bigText('honk!', c.x, c.y - 32 - 14 * k, 13, '#ffffff'); ctx.globalAlpha = 1; }
  if (c.popT < 0.9) { const k = c.popT / 0.9; ctx.globalAlpha = 1 - k * k; bigText(c.pop, c.x, bumperWordY(c.x, c.y - 48 - 30 * k, c.y + 40 + 24 * k), 18, c.popCol || '#fff', 1 + 0.3 * Math.max(0, 1 - k * 5)); ctx.globalAlpha = 1; }
}
function bumperDrawBalloon(x, y, id, a) {
  ctx.fillStyle = PCOL[id]; ctx.strokeStyle = PDARK[id]; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x, y, 13, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 3, y + 16); ctx.lineTo(x + 3, y + 16); ctx.lineTo(x, y + 13); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(x - 4, y - 5, 3.5, 5, -0.4, 0, Math.PI * 2); ctx.fill();
}
function bumperStarShape(x, y, r, col) {
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  ctx.closePath(); ctx.fill();
}
// a floating word never hides under the match pill + clock (top centre): near it, the word goes below its car instead
function bumperWordY(x, y, below) {
  const b = G.matchHudBox; if (!b) return y;
  return y < (hudBig() ? 104 : 86) && x > b.x0 - 60 && x < b.x1 + 60 ? Math.max(y, below) : y;
}
function bumperDrawTop() {
  const st = G.mst, m = G.match, v = st.vis; if (!st.cars) return;
  // splash columns under the cars (the sinking car is drawn into its own splash)
  for (const s of v.cols) {
    const k = s.t / 0.75;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + s.x, hgt = Math.sin(Math.min(1, k * 1.6) * Math.PI) * (26 + (i % 3) * 10);
      const x = s.x + Math.cos(a) * (10 + k * 10), y = s.y + Math.sin(a) * 5 - hgt;
      ctx.globalAlpha = 1 - k; ctx.fillStyle = i % 2 ? '#ffffff' : '#bfe8ff';
      ctx.beginPath(); ctx.ellipse(x, y, 4.5, 7, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = (1 - k) * 0.8; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 4, 20 + 14 * k, 8 + 5 * k, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  const order = st.cars.slice().sort((a, b) => (a.state === 'sink' ? 0 : 1) - (b.state === 'sink' ? 0 : 1));
  for (const c of order) bumperDrawCar(c);
  for (const b of st.balls || []) {
    if (b.state === 'warn') continue;
    const k = b.state === 'sink' ? Math.min(1, b.t / 0.6) : 0, r = b.r * (1 - 0.4 * k);
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = 'rgba(28,26,54,0.25)'; circle(b.x + 3, b.y + 4, b.r * (1 - b.z / 80)); ctx.fill();
    ctx.fillStyle = '#3a3550'; circle(b.x, b.y - b.z, r); ctx.fill();
    ctx.strokeStyle = '#575078'; ctx.lineWidth = 2.5; ctx.beginPath(); // a stripe that rolls
    const ca = Math.cos(b.spin), cy = b.y - b.z;
    ctx.ellipse(b.x + ca * r * 0.35, cy, Math.max(0.5, Math.abs(Math.sin(b.spin)) * r * 0.9), r * 0.9, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; circle(b.x - 4, cy - 4, 4); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // balloons floating away after a landing
  for (const bl of v.balloons) { const k = bl.t / 1.6; ctx.globalAlpha = 1 - k; bumperDrawBalloon(bl.x + bl.sway * 20 * k + Math.sin(k * 8) * 4, bl.y - 120 * k, bl.id, 1); ctx.globalAlpha = 1; }
  // cannon smoke
  for (const sm of v.smoke) { const k = sm.t / 0.7; ctx.fillStyle = 'rgba(240,240,250,' + (0.7 * (1 - k)) + ')'; circle(sm.x + sm.dir * 26 * k, sm.y - 10 * k, 8 + 12 * k); ctx.fill(); }
  // shock rings (super boosts, big bumps)
  for (const sh of v.shock) { const k = sh.t / 0.4; ctx.strokeStyle = sh.col; ctx.globalAlpha = 1 - k; ctx.lineWidth = 4 * (1 - k) + 1; circle(sh.x, sh.y, 10 + 40 * k); ctx.stroke(); ctx.globalAlpha = 1; }
  // impact stars (+ a comic word on the big ones)
  for (const s of v.stars) {
    const k = s.t / 0.5, sc = k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75 * 0.5, R = (s.big ? 22 : 11) * sc;
    ctx.save(); ctx.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4; ctx.translate(s.x, s.y); ctx.rotate(s.a + k * 0.6);
    ctx.fillStyle = s.big ? C.gold : '#ffffff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, q = i % 2 ? R * 0.5 : R; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } ctx.closePath(); ctx.fill(); if (s.big) ctx.stroke();
    if (s.big) { ctx.fillStyle = '#ffffff'; circle(0, 0, R * 0.35); ctx.fill(); }
    ctx.restore();
    if (s.word && k < 0.9) { ctx.save(); ctx.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.3; bigText(s.word, s.x, bumperWordY(s.x, s.y - 26 - k * 14, s.y + 30 + k * 14), 20, '#ffffff', k < 0.15 ? 0.6 + k / 0.15 * 0.6 : 1.2 - Math.min(0.2, k)); ctx.restore(); }
  }
  // "SPLASH!" over a car that went in
  for (const s of v.cols) if (s.word) { const k = s.t / 0.75; ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3; bigText('SPLASH!', s.x, bumperWordY(s.x, s.y - 40 - 22 * k, s.y + 44 + 12 * k), 22, '#bfe8ff', k < 0.12 ? 0.6 + k / 0.12 * 0.5 : 1.1 - k * 0.1); ctx.globalAlpha = 1; }
  bumperDrawCele(st);
  // name tags through "Round N" and 3-2-1 (the framework draws none for hidden players)
  const tagA = G.introT > 0 ? 1 - clamp(G.introT / 0.5, 0, 1) : m && (m.phase === 'ready' || m.phase === 'count') ? 1 : 0;
  if (tagA > 0) for (const c of st.cars) {
    ctx.globalAlpha = tagA; const x = c.x, y = c.y - 50, cpu = bumperCpu(c.id), hw = cpu ? 30 : 18;   // (the computer's tag says so)
    ctx.fillStyle = PCOL[c.id]; rr(x - hw, y - 11, hw * 2, 18, 9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 4, y + 7); ctx.lineTo(x + 4, y + 7); ctx.lineTo(x, y + 11); ctx.fill();
    text(cpu ? NAMES[c.id] + ' · CPU' : NAMES[c.id], x, y - 1.5, 12, '#fff', 'center', 'body'); ctx.globalAlpha = 1;
  }
  if (m && m.phase === 'count' && m.t < 0.9) for (const c of st.cars) if (c.gold > 0) {
    const k = m.t / 0.9; ctx.globalAlpha = 1 - k * k; bigText('Gold flag!', c.x, bumperWordY(c.x, c.y - 72 - 30 * k, c.y + 56 + 24 * k), 17, C.gold); ctx.globalAlpha = 1;
  }
}
// key reminder under each car before rounds 1 and 2 ("F boost", "Ⓐ boost"); touch players have the labelled button
// 1-player mode: the computer drives this car (no key reminder under it)
const bumperCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
function bumperKeyChip(c, big) {
  if (bumperCpu(c.id)) return;
  let k = 'kb'; try { k = actKey(c.id); } catch (e) { k = 'kb'; }
  if (k === 'touch') return;
  const label = (k === 'pad' ? glyph('a') : c.id === 0 ? 'F' : '/') + ' boost';
  const fs = big ? 19 : 13, h = big ? 30 : 22;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(label).width + (big ? 26 : 20), x = c.x, y = c.y + (big ? 44 : 38);
  ctx.fillStyle = 'rgba(28,26,54,0.78)'; rr(x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = PCOL[c.id]; ctx.lineWidth = 2; rr(x - w / 2, y - h / 2, w, h, h / 2); ctx.stroke();
  text(label, x, y + 0.5, fs, C.gold, 'center', 'body');
}
function bumperHud() {
  const st = G.mst, m = G.match; if (!st.cars) return;
  const big = hudBig(), tw = BUMPER_TWISTS[st.twist];
  // flags left, bottom band (over the stands)
  for (const c of st.cars) {
    const left = c.id === 0, n = c.flags, sz = big ? 1.5 : 1;
    const x0 = left ? 20 : W - 20, y = H - 30, pw = (60 + 26 * 4) * sz;
    ctx.fillStyle = 'rgba(28,26,54,0.72)'; rr(left ? x0 - 6 : x0 - pw + 6, y - 18 * sz, pw, 36 * sz, 12); ctx.fill();
    if (c.gold > 0) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(left ? x0 - 6 : x0 - pw + 6, y - 18 * sz, pw, 36 * sz, 12); ctx.stroke(); }
    text(NAMES[c.id], left ? x0 + 6 : x0 - 6, y, 16 * sz, PCOL[c.id], left ? 'left' : 'right');
    const lost = c.lostFlag ? c.lostFlag.t / 1.2 : 1;
    for (let i = 0; i <= n; i++) {
      if (i === n && lost >= 1) break; // i === n: the flag just lost, shrinking away
      const fx = left ? x0 + (50 + i * 24) * sz : x0 - (58 + i * 24) * sz, gold = i === n ? c.lostFlag.gold : i >= n - c.gold && c.gold > 0;
      const sc = i === n ? 1 - lost : 1, fy = y + (i === n ? lost * 10 * sz : 0);
      ctx.save(); ctx.translate(fx, fy); ctx.scale(sc, sc); if (i === n) ctx.rotate(lost * 0.8);
      ctx.fillStyle = gold ? C.gold : PCOL[c.id]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      const fl = Math.sin(G.clock * 6 + i) * sz;
      ctx.beginPath(); ctx.moveTo(0, -10 * sz); ctx.lineTo(16 * sz, -3 * sz + fl); ctx.lineTo(0, 4 * sz); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -10 * sz); ctx.lineTo(0, 10 * sz); ctx.stroke();
      ctx.restore();
    }
  }
  // twist pill (not in the plain round), top left under the level pill
  if (st.twist !== 'classic') {
    const fs = big ? 20 : 13, h = big ? 36 : 26, y0 = big ? 46 : 46;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(tw.name).width + (big ? 36 : 28); pill(14, y0, w, h); text(tw.name, 14 + (big ? 18 : 14), y0 + h / 2 + 0.5, fs, C.gold, 'left', 'body');
  }
  // one live alert chip, top right
  if (st.alert && m.phase === 'live') {
    const fs = big ? 20 : 13, h = big ? 36 : 28;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(st.alert.text).width + (big ? 36 : 28), x1 = W - 14, box = G.matchHudBox;
    const y = box && x1 - w < box.x1 + 8 ? box.y1 + 6 : 12; // never under the match pill (it is centred, the chip is right-aligned)
    const a = st.alert.t > 1.9 ? 1 - (st.alert.t - 1.9) / 0.3 : 1;
    ctx.globalAlpha = a; pill(x1 - w, y, w, h); text(st.alert.text, x1 - (big ? 18 : 14), y + h / 2 + 0.5, fs, C.gold, 'right', 'body'); ctx.globalAlpha = 1;
  }
  if (m.phase === 'ready' || m.phase === 'count') {
    // the twist card, every round (the plain one too), below the cars and their tags
    const nf = big ? 30 : 26, hf = big ? 19 : 14, ch = big ? 78 : 60, cy = big ? 374 : 384;
    ctx.font = hf + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const hw = ctx.measureText(tw.hint).width, w = Math.max(big ? 380 : 300, hw + 48), a = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1;
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(W / 2 - w / 2, cy, w, ch, 16); ctx.fill();
    text(tw.name, W / 2, cy + (big ? 25 : 21), nf, C.gold, 'center'); text(tw.hint, W / 2, cy + (big ? 57 : 46), hf, C.paper, 'center', 'body'); ctx.globalAlpha = 1;
    if (m.round <= 2) { ctx.globalAlpha = a; for (const c of st.cars) bumperKeyChip(c, big); ctx.globalAlpha = 1; }
  }
}

Sfx.extra.bumperBoost = function (p) { this.tone(220 * p, 0.18, 'sawtooth', 0.05, 520 * p); this.tone(660 * p, 0.08, 'triangle', 0.03, 990 * p, 0.04); };
Sfx.extra.bumperSuper = function (p) { this.tone(260 * p, 0.22, 'sawtooth', 0.06, 700 * p); this.tone(880 * p, 0.1, 'triangle', 0.04, 1320 * p, 0.05); this.tone(1320 * p, 0.12, 'triangle', 0.03, 1760 * p, 0.12); };
Sfx.extra.bumperHonk = function (p) { this.tone(330 * p, 0.09, 'square', 0.04); this.tone(392 * p, 0.12, 'square', 0.035, null, 0.1); };
Sfx.extra.bumperReady = function (p) { this.tone(880 * p, 0.05, 'triangle', 0.025); };
Sfx.extra.bumperBump = function () { this.tone(180, 0.1, 'triangle', 0.07, 120); this.tone(520, 0.05, 'square', 0.02, 380); };
Sfx.extra.bumperBigBump = function () { this.tone(140, 0.18, 'triangle', 0.09, 70); this.tone(700, 0.08, 'square', 0.04, 300); this.tone(1200, 0.06, 'triangle', 0.03, 1600, 0.05); };
Sfx.extra.bumperTower = function () { this.tone(988, 0.07, 'square', 0.04, 1318); this.tone(1318, 0.09, 'triangle', 0.03, null, 0.05); };
Sfx.extra.bumperPad = function (p) { this.tone(392 * p, 0.12, 'triangle', 0.05, 784 * p); };
Sfx.extra.bumperTeeter = function (p) { this.tone(600 * p, 0.08, 'triangle', 0.04, 500 * p); this.tone(560 * p, 0.08, 'triangle', 0.04, 460 * p, 0.12); this.tone(520 * p, 0.1, 'triangle', 0.04, 400 * p, 0.24); };
Sfx.extra.bumperPhew = function (p) { this.tone(500 * p, 0.08, 'triangle', 0.04, 760 * p); this.tone(760 * p, 0.12, 'triangle', 0.035, 1000 * p, 0.08); };
Sfx.extra.bumperSplash = function (p) { this.tone(900 * p, 0.35, 'sine', 0.06, 120 * p); this.tone(200, 0.3, 'triangle', 0.05, 60, 0.05); };
Sfx.extra.bumperSplashS = function () { this.tone(700, 0.2, 'sine', 0.04, 160); };
Sfx.extra.bumperCheer = function () { this.tone(660, 0.08, 'triangle', 0.03, 880, 0.12); this.tone(784, 0.08, 'triangle', 0.03, 1046, 0.2); this.tone(988, 0.12, 'triangle', 0.025, 1318, 0.28); };
Sfx.extra.bumperLand = function (p) { this.tone(260 * p, 0.08, 'triangle', 0.05, 180 * p); };
Sfx.extra.bumperCrack = function () { this.tone(1400, 0.04, 'square', 0.03, 700); this.tone(1100, 0.04, 'square', 0.03, 500, 0.08); };
Sfx.extra.bumperCrumble = function () { this.tone(110, 0.35, 'sawtooth', 0.06, 50); this.tone(70, 0.4, 'triangle', 0.06, 40, 0.05); };
Sfx.extra.bumperPlop = function () { this.tone(520, 0.12, 'sine', 0.03, 180, 0.3); this.tone(440, 0.12, 'sine', 0.025, 150, 0.4); };
Sfx.extra.bumperFuse = function () { this.tone(1800, 0.25, 'sawtooth', 0.015, 2200); };
Sfx.extra.bumperCannon = function () { this.tone(90, 0.25, 'sawtooth', 0.08, 45); this.tone(300, 0.08, 'square', 0.03, 120); };
Sfx.extra.bumperTyre = function () { this.tone(200, 0.09, 'triangle', 0.05, 320); this.tone(140, 0.06, 'square', 0.02, 110, 0.03); };
Sfx.extra.bumperThud = function () { this.tone(150, 0.08, 'triangle', 0.05, 90); };
Sfx.extra.bumperBallHit = function () { this.tone(240, 0.1, 'triangle', 0.07, 140); this.tone(480, 0.06, 'square', 0.03, 300); };
Sfx.extra.bumperGold = function (p) { this.tone(784 * p, 0.1, 'triangle', 0.05); this.tone(1046 * p, 0.12, 'triangle', 0.045, null, 0.08); this.tone(1318 * p, 0.16, 'triangle', 0.04, null, 0.16); };
/* ===== end of 7-4 Bumper Cars ===== */

