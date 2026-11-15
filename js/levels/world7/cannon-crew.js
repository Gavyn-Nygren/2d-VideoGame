/* Pip & Bo - Level 7-1 Cannon Crew (team). */
'use strict';

/* ===== Cannon Crew (7-1, mode 'cannon', team): one loads the cannon, the other aims and fires =====
   The loader runs through the yard and brings a keg of powder and a cannonball (one in each hand) to the hopper;
   the gunner sits at the cannon, turns the angle and power dials and fires to knock the flags off a block castle.
   Four castles, roles swap every castle, stars per castle from the shots fired. ownStep: MODES.cannon.step is the tick.
   Everything here is prefixed: CANNON*, cannon*, Sfx.extra.cannon*. The tile chars n B | I - _ r C f K Y p i g m are
   read and drawn by this mode only (cannonRoom turns them into '.' in G.level.grid). Test hook: MODES.cannon.test. */

/* --- castle + cannonball physics (no DOM; px, y down, 30 px tiles, 32 x 18 map) --- */
const CANNON_T = 30, CANNON_COLS = 32, CANNON_ROWS = 18, CANNON_W = 960, CANNON_H = 540;
const CANNON_PHYS = {
  // cannon + aim
  angMin: 5, angMax: 80, angStart: 40, powStart: 0.55,
  angRate: 30, angRateMax: 70, powRate: 0.28, powRateMax: 0.6, rampT: 0.5, // deg/s and power/s, faster after rampT s held
  vMin: 250, vMax: 900, barrel: 34, gBall: 1000,
  // balls (r px, m mass, dmg per fast hit, pierce: speed kept after breaking a block, punch: blocks it can break through)
  ball: {
    iron: { r: 9, m: 2, dmg: 2, pierce: 0.5, punch: 1 },
    big: { r: 13, m: 5, dmg: 4, pierce: 0.6, punch: 2 },
    boom: { r: 10, m: 2, dmg: 2, pierce: 0, punch: 0, boomR: 80, boomDmg: 4, boomDmgFar: 2, boomV: 560 },
  },
  fastV: 380, slowV: 140, spent: 0.2,          // impact speed (along the normal) for full / half damage
  eBall: 0.25, eGround: 0.3, ballFric: 0.7, ballLife: 6, ballRestV: 25, ballRestT: 0.3,
  // blocks
  gBlock: 1800, maxFallB: 1000, tipAcc: 700, tipMargin: 2,
  sleepV: 6, sleepT: 0.25, jitterT: 1, jitterD: 2, crushV: 520, crushDmg: 1, bounceV: 260, bounceK: 0.12,
  mat: {
    wood: { dens: 1, hp: 2, fric: 1400, push: 0.8, col: '#d9a066' },
    stone: { dens: 2.2, hp: 4, fric: 2400, push: 0.45, col: '#a3a9c2' },
    roof: { dens: 0.6, hp: 1, fric: 1400, push: 0.8, col: '#ff6b6b' },
    cat: { dens: 1.5, hp: 2, fric: 1400, push: 0.8, col: '#b07a48' },
  },
  plankHp: 1, slabHp: 3,
  flagMove: 20, poleH: 36,
};

// n wood cube, | wood pillar (vertical run), - wood plank (horizontal run, 15 tall), r roof,
// B stone cube, I stone pillar (vertical run), _ stone slab (horizontal run, 15 tall), C catapult (horizontal run)
// f flag / K crown: on the highest block under the cell's centre
function cannonPhysParse(rows) {
  const grid = rows.map(r => r.split(''));
  const blocks = [], flags = [], used = grid.map(r => r.map(() => false));
  let id = 0;
  const add = (x, y, w, h, mat, shape, hp) => {
    const md = CANNON_PHYS.mat[mat];
    const b = { id: id++, x, y, w, h, mat, shape, hp: hp == null ? md.hp : hp, maxHp: 0, m: (w * h / 900) * md.dens,
      vx: 0, vy: 0, awake: false, still: 0, rest: false, tip: 0, rot: 0, dead: false, hitT: 0, sx: x, sy: y, awakeT: 0, drift: 0, throwT: 0 };
    b.maxHp = b.hp; blocks.push(b); return b;
  };
  for (let ty = 0; ty < CANNON_ROWS; ty++) for (let tx = 0; tx < CANNON_COLS; tx++) {
    const ch = grid[ty][tx];
    if (used[ty][tx]) continue;
    const X = tx * CANNON_T, Y = ty * CANNON_T;
    if (ch === 'n') add(X, Y, CANNON_T, CANNON_T, 'wood', 'cube');
    else if (ch === 'B') add(X, Y, CANNON_T, CANNON_T, 'stone', 'cube');
    else if (ch === 'r') add(X, Y, CANNON_T, CANNON_T, 'roof', 'roof');
    else if (ch === '|' || ch === 'I') {
      let k = ty; while (k < CANNON_ROWS && grid[k][tx] === ch) { used[k][tx] = true; k++; }
      add(X, Y, CANNON_T, (k - ty) * CANNON_T, ch === '|' ? 'wood' : 'stone', 'pillar');
    } else if (ch === '-' || ch === '_' || ch === 'C') {
      let k = tx; while (k < CANNON_COLS && grid[ty][k] === ch) { used[ty][k] = true; k++; }
      if (ch === 'C') add(X, Y, (k - tx) * CANNON_T, CANNON_T, 'cat', 'cat');
      else add(X, Y + CANNON_T / 2, (k - tx) * CANNON_T, CANNON_T / 2, ch === '-' ? 'wood' : 'stone', 'plank', ch === '-' ? CANNON_PHYS.plankHp : CANNON_PHYS.slabHp);
    } else if (ch === 'f' || ch === 'K') flags.push({ tx, ty, crown: ch === 'K' });
    else continue;
    used[ty][tx] = true;
  }
  const terr = grid.map(r => r.map(ch => (ch === '#' ? 1 : ch === 'w' ? 2 : 0))); // '#' solid, 'w' water
  return { blocks, flagSpots: flags, terr };
}

function cannonPhysTerrain(W) {
  W.solid = (tx, ty) => tx >= 0 && tx < CANNON_COLS && ty >= 0 && ty < CANNON_ROWS && W.terr[ty][tx] === 1;
  W.water = (tx, ty) => tx >= 0 && tx < CANNON_COLS && ty >= 0 && ty < CANNON_ROWS && W.terr[ty][tx] === 2;
  W._aw = []; W._sup = { n: 0, lo: 0, hi: 0, sv: 0 };
  return W;
}
function cannonPhysWorld(rows, rand) {
  const P = cannonPhysParse(rows);
  const W = cannonPhysTerrain({ blocks: P.blocks, terr: P.terr, balls: [], flags: [], events: [], t: 0, rand: rand || Math.random,
    stats: { broken: 0, hits: 0 } });
  cannonPhysSettle(W);
  for (const f of P.flagSpots) {
    const cx = f.tx * CANNON_T + CANNON_T / 2;
    let base = null;
    for (const b of W.blocks) if (b.x < cx && b.x + b.w > cx && b.y >= f.ty * CANNON_T && (!base || b.y < base.y)) base = b;
    if (!base) throw new Error('Cannon Crew: flag without a block at ' + f.tx + ',' + f.ty);
    W.flags.push({ base: base.id, x: cx, crown: f.crown, down: false, downT: 0, fx: cx, fy: base.y, fvx: 0, fvy: 0, frot: 0, wobble: 0 });
  }
  for (const b of W.blocks) { b.sx = b.x; b.sy = b.y; }
  return W;
}

const cannonPhysOverlap = (a, b) => a.x < b.x + b.w - 0.001 && a.x + a.w > b.x + 0.001 && a.y < b.y + b.h - 0.001 && a.y + a.h > b.y + 0.001;

// drop every block straight down onto what is under it (lowest first): maps can be drawn cell-aligned
function cannonPhysSettle(W) {
  const bs = W.blocks.slice().sort((a, b) => (b.y + b.h) - (a.y + a.h)), done = [];
  for (const b of bs) {
    let top = CANNON_H + 200;
    const tx1 = Math.floor((b.x + 0.5) / CANNON_T), tx2 = Math.floor((b.x + b.w - 0.5) / CANNON_T);
    for (let tx = tx1; tx <= tx2; tx++) for (let ty = Math.floor((b.y + b.h - 0.01) / CANNON_T); ty < CANNON_ROWS; ty++) {
      if (ty >= 0 && W.solid(tx, ty)) { top = Math.min(top, ty * CANNON_T); break; }
    }
    for (const o of done) if (o.x < b.x + b.w - 0.5 && o.x + o.w > b.x + 0.5 && o.y >= b.y + b.h - 0.5) top = Math.min(top, o.y);
    b.y = top - b.h;
    done.push(b);
  }
}

function cannonPhysWake(W, b) { if (!b.dead && !b.awake) { b.awake = true; b.still = 0; b.awakeT = 0; b.drift = 0; } }
function cannonPhysWakeNear(W, b, pad = 1.5) {
  for (const o of W.blocks) {
    if (o === b || o.dead || o.awake) continue;
    if (o.x < b.x + b.w + pad && o.x + o.w > b.x - pad && o.y < b.y + b.h + pad && o.y + o.h > b.y - pad) cannonPhysWake(W, o);
  }
}
function cannonPhysDamage(W, b, d, why) {
  if (b.dead || d <= 0) return;
  b.hp -= d; b.hitT = 0.25;
  W.events.push({ e: 'hit', b, d, why });
  if (b.hp <= 0) cannonPhysBreak(W, b, why);
  else cannonPhysWake(W, b);
}
function cannonPhysBreak(W, b, why) {
  if (b.dead) return;
  b.dead = true; b.awake = false; W.stats.broken++;
  W.events.push({ e: 'break', b, why, x: b.x + b.w / 2, y: b.y + b.h / 2 });
  cannonPhysWakeNear(W, b, 2);
}
function cannonPhysKill(W, b, why) { // off the screen, into the moat or into the yard: gone, no debris
  if (b.dead) return;
  b.dead = true; b.awake = false; W.events.push({ e: why, b, x: b.x + b.w / 2, y: b.y + b.h / 2 });
  cannonPhysWakeNear(W, b, 2);
}

// what holds b up: count, span (lo..hi) of all supports together (a bridge on two pillars is fine), mean support vx
function cannonPhysSupports(W, b, out) {
  let n = 0, lo = Infinity, hi = -Infinity, sv = 0;
  const by = b.y + b.h, ty = Math.floor((by + 0.5) / CANNON_T);
  if (Math.abs(ty * CANNON_T - by) < 0.6) {
    const tx1 = Math.floor((b.x + 0.01) / CANNON_T), tx2 = Math.floor((b.x + b.w - 0.01) / CANNON_T);
    for (let tx = tx1; tx <= tx2; tx++) if (W.solid(tx, ty)) { n++; lo = Math.min(lo, Math.max(b.x, tx * CANNON_T)); hi = Math.max(hi, Math.min(b.x + b.w, tx * CANNON_T + CANNON_T)); }
  }
  for (const o of W.blocks) {
    if (o === b || o.dead) continue;
    if (Math.abs(o.y - by) < 0.6 && o.x < b.x + b.w - 0.001 && o.x + o.w > b.x + 0.001) { n++; lo = Math.min(lo, Math.max(b.x, o.x)); hi = Math.max(hi, Math.min(b.x + b.w, o.x + o.w)); sv += o.vx; }
  }
  out.n = n; out.lo = lo; out.hi = hi; out.sv = n ? sv / n : 0;
  return out;
}

function cannonPhysMoveX(W, b, dx) {
  if (!dx) return;
  b.x += dx;
  const ty1 = Math.floor((b.y + 0.01) / CANNON_T), ty2 = Math.floor((b.y + b.h - 0.01) / CANNON_T);
  if (dx > 0) {
    const tx = Math.floor((b.x + b.w - 0.001) / CANNON_T);
    for (let ty = ty1; ty <= ty2; ty++) if (W.solid(tx, ty)) { b.x = tx * CANNON_T - b.w; b.vx = -Math.max(0, b.vx) * 0.1; break; }
  } else {
    const tx = Math.floor((b.x + 0.001) / CANNON_T);
    for (let ty = ty1; ty <= ty2; ty++) if (W.solid(tx, ty)) { b.x = (tx + 1) * CANNON_T; b.vx = -Math.min(0, b.vx) * 0.1; break; }
  }
  for (const o of W.blocks) {
    if (o === b || o.dead || !cannonPhysOverlap(b, o)) continue;
    b.x = dx > 0 ? o.x - b.w : o.x + o.w;
    // sideways bump: share the speed (perfectly inelastic), hard bumps hurt both
    if ((dx > 0 && b.vx > o.vx) || (dx < 0 && b.vx < o.vx)) {
      const rel = Math.abs(b.vx - o.vx), v = (b.m * b.vx + o.m * o.vx) / (b.m + o.m);
      b.vx = v; o.vx = v; cannonPhysWake(W, o);
      if (rel > CANNON_PHYS.crushV) { cannonPhysDamage(W, b, CANNON_PHYS.crushDmg, 'bump'); cannonPhysDamage(W, o, CANNON_PHYS.crushDmg, 'bump'); }
    }
  }
}
function cannonPhysMoveY(W, b, dy) {
  if (!dy) return null;
  b.y += dy;
  let landed = null, hit = false;
  const tx1 = Math.floor((b.x + 0.01) / CANNON_T), tx2 = Math.floor((b.x + b.w - 0.01) / CANNON_T);
  if (dy > 0) {
    const ty = Math.floor((b.y + b.h - 0.001) / CANNON_T);
    for (let tx = tx1; tx <= tx2; tx++) if (W.solid(tx, ty)) { b.y = ty * CANNON_T - b.h; hit = true; break; }
  } else {
    const ty = Math.floor((b.y + 0.001) / CANNON_T);
    for (let tx = tx1; tx <= tx2; tx++) if (W.solid(tx, ty)) { b.y = (ty + 1) * CANNON_T; b.vy = 0; break; }
  }
  for (const o of W.blocks) {
    if (o === b || o.dead || !cannonPhysOverlap(b, o)) continue;
    if (dy > 0) { b.y = o.y - b.h; hit = true; landed = o; }
    else { b.y = o.y + o.h; b.vy = Math.max(b.vy, o.vy, 0); }
  }
  if (hit) {
    const ov = landed ? landed.vy : 0, imp = b.vy - ov;
    if (imp > CANNON_PHYS.crushV) { cannonPhysDamage(W, b, CANNON_PHYS.crushDmg, 'fall'); if (landed) cannonPhysDamage(W, landed, CANNON_PHYS.crushDmg, 'fall'); W.events.push({ e: 'thud', b, imp }); }
    else if (imp > 200) W.events.push({ e: 'thud', b, imp });
    b.vy = imp > CANNON_PHYS.bounceV ? ov - imp * CANNON_PHYS.bounceK : ov;
    if (landed && imp > 30) cannonPhysWake(W, landed); // a soft touch doesn't wake what's below (keeps stacks asleep)
  }
  return landed;
}

const cannonPhysLowFirst = (a, b) => (b.y + b.h) - (a.y + a.h) || a.id - b.id;
function cannonPhysStepBlocks(W, dt) {
  const P = CANNON_PHYS, bs = W._aw, sup = W._sup;
  bs.length = 0;
  for (const b of W.blocks) if (b.awake && !b.dead) bs.push(b);
  if (bs.length > 1) bs.sort(cannonPhysLowFirst);
  for (const b of bs) {
    if (b.dead) continue;
    if (b.hitT > 0) b.hitT -= dt;
    const x0 = b.x, y0 = b.y;
    b.vy = Math.min(b.vy + P.gBlock * dt, P.maxFallB);
    cannonPhysMoveX(W, b, b.vx * dt);
    cannonPhysMoveY(W, b, b.vy * dt);
    cannonPhysSupports(W, b, sup);
    b.rest = sup.n > 0 && b.vy >= -1;
    b.tip = 0;
    if (b.rest) {
      // tipping: the middle of the block hangs over thin air -> it slides off that side
      const cx = b.x + b.w / 2;
      if (cx < sup.lo - P.tipMargin || cx > sup.hi + P.tipMargin) {
        b.tip = cx > sup.hi ? 1 : -1;
        b.vx += b.tip * P.tipAcc * dt;
        b.rot += b.tip * dt * 2.2;
      } else {
        const f = P.mat[b.mat].fric * dt, sv = sup.sv;
        b.vx = Math.abs(b.vx - sv) <= f ? sv : b.vx - Math.sign(b.vx - sv) * f;
        b.rot *= Math.max(0, 1 - dt * 10);
      }
    } else b.rot += (b.vx > 0 ? 1 : b.vx < 0 ? -1 : 0) * dt * 1.2 * Math.min(1, Math.abs(b.vx) / 200);
    b.rot = Math.max(-0.45, Math.min(0.45, b.rot));
    const moved = Math.abs(b.x - x0) + Math.abs(b.y - y0);
    if (moved > 0.01) cannonPhysWakeNear(W, b, 1.5);
    // jitter guard: awake a whole second but hardly moving -> sleep
    b.awakeT += dt; b.drift += moved;
    if (b.awakeT >= P.jitterT) {
      const d = b.drift; b.awakeT = 0; b.drift = 0;
      // (a block wedged while tipping keeps its lean: it rests against its neighbour)
      if (d < P.jitterD) { b.awake = false; b.vx = 0; b.vy = 0; b.still = 0; if (!b.tip) b.rot = 0; W.stats.jitter = (W.stats.jitter || 0) + 1; continue; }
    }
    // gone?
    const cxT = Math.floor((b.x + b.w / 2) / CANNON_T), cyT = Math.floor((b.y + b.h / 2) / CANNON_T);
    if (W.water(cxT, cyT)) { cannonPhysKill(W, b, 'sink'); continue; }
    if (b.y > CANNON_H + 60 || b.x > CANNON_W + 60 || b.x + b.w < -60) { cannonPhysKill(W, b, 'gone'); continue; }
    if (b.rest && !b.tip && Math.abs(b.vx) < P.sleepV && Math.abs(b.vy) < P.sleepV) {
      b.still += dt;
      if (b.still >= P.sleepT) { b.awake = false; b.vx = 0; b.vy = 0; b.still = 0; b.rot = 0; b.awakeT = 0; b.drift = 0; }
    } else b.still = 0;
  }
}

// ---- balls ----
function cannonPhysFire(W, x, y, angDeg, power, type) {
  const P = CANNON_PHYS, a = angDeg * Math.PI / 180, v = P.vMin + (P.vMax - P.vMin) * power, bt = P.ball[type];
  const mx = x + Math.cos(a) * P.barrel, my = y - Math.sin(a) * P.barrel;
  const ball = { x: mx, y: my, vx: Math.cos(a) * v, vy: -Math.sin(a) * v, r: bt.r, type, t: 0, restT: 0, dead: false,
    touched: false, trail: [[mx, my]], firstHit: null, punches: 0, wobbled: false };
  W.balls.push(ball);
  return ball;
}
function cannonPhysExplode(W, x, y, ball) {
  const bt = CANNON_PHYS.ball.boom;
  W.events.push({ e: 'boom', x, y });
  for (const b of W.blocks) {
    if (b.dead) continue;
    const qx = Math.max(b.x, Math.min(x, b.x + b.w)), qy = Math.max(b.y, Math.min(y, b.y + b.h));
    const d = Math.hypot(qx - x, qy - y);
    if (d >= bt.boomR) continue;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, dd = Math.hypot(cx - x, cy - y) || 1;
    const k = 1 - d / bt.boomR, sp = bt.boomV * k / Math.sqrt(Math.max(0.5, b.m));
    b.vx += (cx - x) / dd * sp; b.vy += Math.min(0, (cy - y) / dd * sp) - sp * 0.35; // always some lift
    cannonPhysWake(W, b);
    cannonPhysDamage(W, b, d < bt.boomR * 0.5 ? bt.boomDmg : bt.boomDmgFar, 'boom');
    ball.touched = true; // a blast that reaches a block is not a miss
  }
  for (const f of W.flags) if (!f.down && Math.hypot(f.x - x, (cannonPhysFlagTop(W, f) + CANNON_PHYS.poleH / 2) - y) < bt.boomR) cannonPhysFlagDown(W, f, 'boom');
  ball.dead = true;
  W.events.push({ e: 'ballGone', ball });
}
function cannonPhysBlockById(W, id) { return W.blocks[id]; } // ids are indices
function cannonPhysFlagTop(W, f) { return W.blocks[f.base].y - CANNON_PHYS.poleH; }
function cannonPhysPoleHit(W, f, x, y, r) { // circle vs the 6 x 36 pole box on the base block's top
  const b = W.blocks[f.base], px = f.x - 3, py = b.y - CANNON_PHYS.poleH;
  const qx = Math.max(px, Math.min(x, px + 6)), qy = Math.max(py, Math.min(y, py + CANNON_PHYS.poleH));
  return Math.hypot(x - qx, y - qy) < r;
}
function cannonPhysPoleOverlap(W, f, o) {
  const b = W.blocks[f.base], px = f.x - 3, py = b.y - CANNON_PHYS.poleH;
  return px < o.x + o.w - 0.001 && px + 6 > o.x + 0.001 && py < o.y + o.h - 0.001 && py + CANNON_PHYS.poleH > o.y + 0.001;
}
function cannonPhysFlagDown(W, f, why) {
  if (f.down) return;
  const b = W.blocks[f.base];
  f.down = true; f.why = why; f.fx = f.x; f.fy = b.y - CANNON_PHYS.poleH; f.fvx = (W.rand() - 0.5) * 160 + b.vx; f.fvy = -220; f.frot = 0;
  W.events.push({ e: 'flag', f, why });
}

function cannonPhysStepBalls(W, dt) {
  const P = CANNON_PHYS;
  for (const ball of W.balls) {
    if (ball.dead) continue;
    const bt = P.ball[ball.type];
    ball.t += dt;
    ball.vy += P.gBall * dt;
    const sp = Math.hypot(ball.vx, ball.vy), n = Math.max(1, Math.ceil(sp * dt / 4)); // never more than 4 px per substep
    let ground = false;
    for (let s = 0; s < n && !ball.dead; s++) {
      ball.x += ball.vx * dt / n; ball.y += ball.vy * dt / n;
      // terrain
      const r = ball.r;
      const tx1 = Math.floor((ball.x - r) / CANNON_T), tx2 = Math.floor((ball.x + r) / CANNON_T), ty1 = Math.floor((ball.y - r) / CANNON_T), ty2 = Math.floor((ball.y + r) / CANNON_T);
      for (let ty = ty1; ty <= ty2 && !ball.dead; ty++) for (let tx = tx1; tx <= tx2 && !ball.dead; tx++) {
        if (W.water(tx, ty) && ball.y > ty * CANNON_T + 6) { ball.dead = true; W.events.push({ e: 'splash', x: ball.x, y: ty * CANNON_T, ball }); W.events.push({ e: 'ballGone', ball }); break; }
        if (!W.solid(tx, ty)) continue;
        const qx = Math.max(tx * CANNON_T, Math.min(ball.x, tx * CANNON_T + CANNON_T)), qy = Math.max(ty * CANNON_T, Math.min(ball.y, ty * CANNON_T + CANNON_T));
        let dx = ball.x - qx, dy = ball.y - qy, d = Math.hypot(dx, dy);
        if (d >= r) continue;
        if (d < 0.001) { dx = 0; dy = -1; d = 1; }
        const nx = dx / d, ny = dy / d;
        ball.x = qx + nx * r; ball.y = qy + ny * r;
        const vn = ball.vx * nx + ball.vy * ny;
        if (vn < 0) {
          if (ball.type === 'boom') { cannonPhysExplode(W, ball.x, ball.y, ball); break; }
          ball.vx -= (1 + P.eGround) * vn * nx; ball.vy -= (1 + P.eGround) * vn * ny;
          if (ny < -0.7) ball.vx *= P.ballFric;
          if (-vn > 120) W.events.push({ e: 'thump', x: ball.x, y: ball.y, v: -vn });
        }
        if (ny < -0.7) ground = true;
      }
      if (ball.dead) break;
      // blocks
      for (const b of W.blocks) {
        if (b.dead) continue;
        const qx = Math.max(b.x, Math.min(ball.x, b.x + b.w)), qy = Math.max(b.y, Math.min(ball.y, b.y + b.h));
        let dx = ball.x - qx, dy = ball.y - qy, d = Math.hypot(dx, dy);
        if (d >= ball.r) continue;
        if (d < 0.001) { const v = Math.hypot(ball.vx, ball.vy) || 1; dx = -ball.vx / v; dy = -ball.vy / v; d = 1; }
        const nx = dx / d, ny = dy / d;
        const vn = (ball.vx - b.vx) * nx + (ball.vy - b.vy) * ny;
        if (vn >= 0) { ball.x = qx + nx * ball.r; ball.y = qy + ny * ball.r; continue; }
        const imp = -vn;
        ball.touched = true; W.stats.hits++;
        if (ball.firstHit === null) ball.firstHit = b.id;
        if (ball.type === 'boom') { cannonPhysDamage(W, b, imp >= P.slowV ? bt.dmg : 0, 'ball'); cannonPhysExplode(W, ball.x, ball.y, ball); break; }
        const dmg = imp >= P.fastV ? bt.dmg : imp >= P.slowV ? bt.dmg / 2 : 0;
        cannonPhysDamage(W, b, dmg, 'ball');
        if (b.dead) {
          // punched through: keep going, slower; out of punches, it stops nearly dead
          const k = ball.punches < bt.punch ? bt.pierce : P.spent;
          ball.punches++;
          ball.vx *= k; ball.vy *= k;
          continue;
        }
        // bounce off and shove the block
        const j = (1 + P.eBall) * imp / (1 / bt.m + 1 / b.m);
        ball.vx += nx * j / bt.m; ball.vy += ny * j / bt.m;
        const pm = P.mat[b.mat].push;
        b.vx -= nx * j / b.m * pm;
        if (ny > 0.3) b.vy -= ny * j / b.m * pm; // hit from below lifts it
        cannonPhysWake(W, b);
        ball.x = qx + nx * ball.r; ball.y = qy + ny * ball.r;
      }
      if (ball.dead) break;
      // flag poles: flags hold on tight, a ball only makes them wobble
      for (const f of W.flags) if (!f.down && !(f.wobble > 0) && cannonPhysPoleHit(W, f, ball.x, ball.y, ball.r)) { f.wobble = 0.6; W.events.push({ e: 'wobble', f, ball }); }
    }
    ball.tick = (ball.tick || 0) + 1;
    if (ball.tick % 3 === 0) ball.trail.push([ball.x, ball.y]);
    if (ground && Math.hypot(ball.vx, ball.vy) < 120) ball.vx *= Math.max(0, 1 - dt * 3);
    if (Math.hypot(ball.vx, ball.vy) < P.ballRestV) ball.restT += dt; else ball.restT = 0;
    if (!ball.dead && (ball.restT > P.ballRestT || ball.t > P.ballLife || ball.x > CANNON_W + 40 || ball.x < -40 || ball.y > CANNON_H + 40)) {
      ball.dead = true; W.events.push({ e: 'ballGone', ball });
    }
  }
  if (W.balls.some(b => b.dead)) W.balls = W.balls.filter(b => !b.dead);
}

function cannonPhysStepFlags(W, dt) {
  for (const f of W.flags) {
    if (f.wobble > 0) f.wobble -= dt;
    if (f.down) {
      if (f.downT < 2) { f.downT += dt; f.fvy += 900 * dt; f.fx += f.fvx * dt; f.fy += f.fvy * dt; f.frot += f.fvx * dt * 0.03; }
      continue;
    }
    const b = W.blocks[f.base];
    if (b.dead) { cannonPhysFlagDown(W, f, 'broken'); continue; }
    if (Math.abs(b.x - b.sx) > CANNON_PHYS.flagMove || Math.abs(b.y - b.sy) > CANNON_PHYS.flagMove) { cannonPhysFlagDown(W, f, 'moved'); continue; }
    for (const o of W.blocks) if (!o.dead && o !== b && o.awake && cannonPhysPoleOverlap(W, f, o)) { cannonPhysFlagDown(W, f, 'debris'); break; }
  }
}

function cannonPhysStep(W, dt) {
  W.t += dt;
  cannonPhysStepBalls(W, dt);
  cannonPhysStepBlocks(W, dt);
  cannonPhysStepFlags(W, dt);
}
const cannonPhysSettled = W => W.balls.length === 0 && W.blocks.every(b => b.dead || !b.awake);
const cannonPhysFlagsLeft = W => { let n = 0; for (const f of W.flags) if (!f.down) n++; return n; };

// deep copy for look-ahead bots (tests only)
function cannonPhysClone(W) {
  const C2 = Object.assign({}, W);
  C2.blocks = W.blocks.map(b => Object.assign({}, b));
  C2.balls = W.balls.map(b => Object.assign({}, b, { trail: [] }));
  C2.flags = W.flags.map(f => Object.assign({}, f));
  C2.events = []; C2.stats = Object.assign({}, W.stats);
  return cannonPhysTerrain(C2);
}

/* --- the level mode --- */
const CANNON = {
  rackShow: 3,             // the cannon takes every keg and ball you bring (no limit); the rack draws up to 3 of each, then "+N"
  pileGrow: 4,             // pickup zone = the pile tiles grown by this (px)
  fireCool: 0.6,           // s between two shots
  shoutCool: 0.8,          // loader's "FIRE!" shout
  callCool: 0.8,           // gunner's "HURRY!" call (a fire press on a cannon that isn't loaded)
  callT: 2.0,              // s the call's arrows point at the missing piles
  introHold: 0.6,          // inputs ignored while G.introT is above this (the room card)
  hintT: 9,                // s the role hints show at each castle start
  peek: 0.30, peek2: 0.65, // s of flight shown by the aim dots; after missHelp1 misses in a row the longer peek
  missHelp1: 3, missHelp2: 5, // after missHelp2 misses in a row: the whole arc
  wobbleOver: 3,           // shots over par before the castle gets wobbly (any block hit drops the nearest flag)
  winT: 3.0, crumbleT: 1.2, // celebration before the next castle; how long the leftover castle takes to crumble
  floorLife: 15, itemR: 8, itemG: 1500,
  carryLift: 18,           // carried keg centre, px above the loader's head (a ball sits on top of it)
  idleHint: 12,            // s with a loaded cannon and an idle gunner before "Loaded! Bo, fire!"
  loaderHint: 8,           // s with an unloaded cannon and no pickup or load before an arrow points at the pile it needs
  balloon: { first: 5, every: 6.5, flight: 1.6, g: 600, splashR: 48, wetR: 44, knockV: 140, knockUp: 260, stun: 0.35, lead: 0.3, alt: true, ammo: 6 },
};
const CANNON_KINDS = { p: 'powder', i: 'iron', g: 'big', m: 'boom' };
const CANNON_LABELS = { powder: 'Powder', iron: 'Balls', big: 'Big balls', boom: 'Boom balls' };
const CANNON_PILE_TOP = { powder: 40, iron: 48, big: 49, boom: 55 }; // px from the floor to the top of each pile's drawing
const cannonStarsFor = (n, par) => (n <= par ? 3 : n <= par + 2 ? 2 : 1);
const cannonRand = () => MODES.cannon.rand();

function cannonRoom(st, L, k) {
  const def = L.def, map = def.map;
  st.W = cannonPhysWorld(map, cannonRand);
  st.k = k; st.gunner = def.gunner; st.loader = 1 - def.gunner;
  st.piles = []; st.cannon = null;
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const ch = map[ty][tx];
    if (ch === 'Y') st.cannon = { tx, ty, x: tx * T + 30, y: (ty + 1) * T - 22, floor: (ty + 1) * T };
    else if (CANNON_KINDS[ch]) {
      const last = st.piles.find(p => p.ch === ch && p.ty === ty && p.tx1 === tx - 1);
      if (last) last.tx1 = tx; else st.piles.push({ ch, kind: CANNON_KINDS[ch], tx0: tx, tx1: tx, ty, pop: 0 });
    }
    if ('nB|I-_rCfKYpigm'.includes(ch)) L.grid[ty][tx] = '.';
  }
  if (!st.cannon) throw new Error('Cannon Crew: room ' + (k + 1) + ' has no cannon (Y)');
  for (const p of st.piles) { const g = CANNON.pileGrow; Object.assign(p, { x: p.tx0 * T - g, y: p.ty * T - g, w: (p.tx1 - p.tx0 + 1) * T + 2 * g, h: T + 2 * g }); }
  const cn = st.cannon;
  Object.assign(cn, { ang: CANNON_PHYS.angStart, pow: CANNON_PHYS.powStart, powder: 0, balls: [], cool: 0, kick: 0, holdA: 0, holdP: 0,
    readyT: 0, idleT: 0, clickT: 0, need: null, wasLoaded: false });
  st.hop = { x: cn.tx * T - 4, y: (cn.ty - 2) * T, w: T + 8, h: 3 * T };
  st.fence = (cn.tx + 2) * T;
  st.seat = { x: G.spawnPts[st.gunner].x, y: G.spawnPts[st.gunner].y };
  st.carry = { powder: false, ball: null, t: 0 }; st.shoutT = 0; st.shout = 0;
  st.call = null; st.callCoolT = 0; st.ldIdle = 0;
  st.items = []; st.balloons = []; st.balloonT = CANNON.balloon.first; st.wetT = 0; st.throwN = 0; st.catDown = false; st.outMsg = false;
  st.shots = 0; st.par = def.par; st.missRow = 0; st.ghost = null; st.lock = [true, true];
  st.hint = CANNON.hintT; st.phase = 'play'; st.winT = 0; st.crumble = null; st.crumbleN = 0; st.flash = [];
  st.flagsTotal = st.W.flags.length; st.wobbly = false; st.cat = st.W.blocks.find(b => b.shape === 'cat') || null;
  st.msg = null; st.shotFlags = 0; st.boomFx = null; st.stars = 0; st.labs = null;
  cannonActLabels(st);
  const gn = G.players[st.gunner];
  Object.assign(gn, { x: st.seat.x, y: st.seat.y, vx: 0, vy: 0, face: 1, grounded: true });
  G.players[st.loader].face = 1;
}

// The loader's action button only shouts "FIRE!": say so on that player's touch button and top-bar legend.
// (The framework writes one label for both players; it puts its own back on the next level start. See the report:
// a per-player def.act.labels would make this unnecessary.)
function cannonActLabels(st) {
  try {
    for (const id of [0, 1]) {
      const lab = id === st.gunner ? 'fire' : 'shout';
      document.querySelectorAll('.tbtn-act[data-p="' + id + '"]').forEach(el => { el.textContent = lab; });
      const leg = document.querySelector('[data-leg="' + (id ? 'bo' : 'pip') + '"]');
      const el = leg && leg.parentElement && leg.parentElement.querySelector('.acth [data-actlabel]');
      if (el) el.textContent = lab;
    }
    // one shared controller legend line: both roles
    const pl = document.querySelector('.pad-only .acth [data-actlabel]');
    if (pl) pl.textContent = 'fire/shout';
    if (typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* no page (tests) */ }
}
// the hint text: how this player aims and fires (device-aware, like golfKeys)
function cannonKeys(id, what) {
  // 1 player + computer: the computer's bubble says what it does instead of which keys to press
  if (typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id)) return what === 'gunner' ? 'aims and fires' : 'brings powder and balls';
  if (what !== 'gunner') return 'bring powder and a ball to the cannon';
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad'; // (each player's own device: js/controls.js)
  return pad ? 'stick ▲▼ aim  ◀▶ power  ' + glyph('a') + ' fire'
    : touch ? '▲▼ aim  ◀▶ power  round button: fire' : id === 0 ? 'W S aim  A D power  F/Space fire' : '↑ ↓ aim  ← → power  / fire';
}
// a key that is down now, or was tapped (down and up again) within the framework's tap window (TAP_STEPS)
function cannonKeyHeld(c) {
  if (keys.has(c)) return true;
  try { return typeof tapLive === 'function' && tapLive(keysTapped, c); } catch (e) { return false; }
}
function cannonTouchJump(id) {
  if (touchState[id] && touchState[id].jump) return true;
  try { return typeof tapLive === 'function' && tapLive(touchTapped[id], 'jump'); } catch (e) { return false; }
}
// Is this player's jump coming from a controller? Then A / B fire for the gunner and only the stick aims up.
// (Pads.kind turns 'kb' on any key press, so a pad gunner next to a keyboard loader is checked by the keys themselves;
// a key tap shorter than a frame still counts as the keyboard, through the framework's tap window.)
function cannonOnPad(id) {
  try { return !!padFor(padSlots(), id) && !BIND[id].jump.some(cannonKeyHeld) && !cannonTouchJump(id); } catch (e) { return false; }
}
// Pip's Space is a fire key for the gunner (Space is Pip's "main button" everywhere else); W keeps aiming up
const cannonSpaceFire = id => id === 0 && cannonKeyHeld('Space') && !cannonKeyHeld('KeyW');
// a player's inputs, or nothing while they're locked (each castle start: let go of everything once)
function cannonInput(st, p) {
  const i = p.input, any = i.left || i.right || i.jump || i.down || i.up || i.act;
  if (st.lock[p.id]) { if (!any) st.lock[p.id] = false; p.pendingJump = false; p.pendingAct = false; return NO_INPUT; }
  return i;
}
const cannonLoaded = cn => cn.powder > 0 && cn.balls.length > 0;
const cannonHolding = st => st.carry.powder || !!st.carry.ball;

function cannonFire(st) {
  const cn = st.cannon, gn = G.players[st.gunner], R = cannonRand;
  const type = cn.balls.shift(); cn.powder--;
  const ball = cannonPhysFire(st.W, cn.x, cn.y, cn.ang, cn.pow, type);
  ball.shot = ++st.shots; st.stats.shots++; st.stats.fired[st.gunner]++;
  cn.cool = CANNON.fireCool; cn.kick = 1; cn.idleT = 0; st.shotFlags = 0;
  const a = cn.ang * Math.PI / 180, mx = cn.x + Math.cos(a) * (CANNON_PHYS.barrel + 6), my = cn.y - Math.sin(a) * (CANNON_PHYS.barrel + 6);
  for (let n = 0; n < 12; n++) G.particles.push({ x: mx, y: my, vx: Math.cos(a) * (80 + R() * 160) + (R() - 0.5) * 60, vy: -Math.sin(a) * (80 + R() * 160) + (R() - 0.5) * 60, life: 0.6, max: 0.6, col: 'rgba(240,236,228,0.9)', size: 5 + R() * 5, grav: -40, kind: 'dot' });
  Sfx.play(type === 'big' ? 'cannonBoomBig' : 'cannonBoom', st.gunner);
  rumble(st.gunner, 0.7, 0.5, 160); rumble(st.loader, 0.2, 0.3, 90);
  if (!reduceMotion) G.shake = Math.max(G.shake, type === 'big' ? 0.16 : 0.1);
  gn.sx = 1.15; gn.sy = 0.86;
}

function cannonGunner(st, dt) {
  const cn = st.cannon, gn = G.players[st.gunner], inp = cannonInput(st, gn), P = CANNON_PHYS;
  Object.assign(gn, { x: st.seat.x, y: st.seat.y, vx: 0, vy: 0, grounded: true, face: 1, jumping: false, alive: true });
  const onPad = cannonOnPad(gn.id), spaceFire = !onPad && cannonSpaceFire(gn.id);
  const padFire = (onPad || spaceFire) && gn.pendingJump; // read before the seat clears it
  gn.pendingJump = false; gn.jumpBuf = 0;
  cn.cool = Math.max(0, cn.cool - dt); cn.kick = Math.max(0, cn.kick - dt * 3); cn.clickT = Math.max(0, cn.clickT - dt);
  const up = inp.up || (inp.jump && !onPad && !spaceFire), da = (up ? 1 : 0) - (inp.down ? 1 : 0), dp = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  if (da) { cn.holdA += dt; const r = P.angRate + (P.angRateMax - P.angRate) * clamp((cn.holdA - P.rampT) / 0.5, 0, 1); cn.ang = clamp(cn.ang + da * r * dt, P.angMin, P.angMax); } else cn.holdA = 0;
  if (dp) { cn.holdP += dt; const r = P.powRate + (P.powRateMax - P.powRate) * clamp((cn.holdP - P.rampT) / 0.5, 0, 1); cn.pow = clamp(cn.pow + dp * r * dt, 0, 1); } else cn.holdP = 0;
  if (da || dp) cn.idleT = 0; else if (cannonLoaded(cn)) cn.idleT += dt;
  if (!(gn.pendingAct || padFire)) return;
  gn.pendingAct = false;
  if (st.phase !== 'play' || cn.cool > 0) return;
  if (cannonLoaded(cn)) { cannonFire(st); return; }
  // not loaded: a dry click, a bubble saying what is missing, and a "HURRY!" call that points the loader at the piles
  cn.clickT = 1.2; cn.need = { powder: cn.powder === 0, ball: cn.balls.length === 0 }; cn.kick = 0.25;
  Sfx.play('cannonClick', st.gunner); st.stats.clicks++;
  if (st.callCoolT <= 0) {
    st.callCoolT = CANNON.callCool;
    st.call = { t: CANNON.callT, powder: cn.need.powder && !st.carry.powder, ball: cn.need.ball && !st.carry.ball };
    Sfx.play('cannonCall', st.gunner); rumble(st.loader, 0, 0.3, 80); st.stats.calls++;
  }
}

function cannonLoaderMove(st, dt) {
  const ld = G.players[st.loader], gn = G.players[st.gunner];
  const real = ld.input, inp = cannonInput(st, ld);
  ld.input = inp;
  gn.alive = false; // the gunner sits in the cannon seat: the loader passes through them
  try {
    control(ld, dt);
    if (ld.alive) {
      moveX(ld, ld.vx * dt, true);
      if (ld.x + ld.w > st.fence) { ld.x = st.fence - ld.w; ld.vx = Math.min(0, ld.vx); }
      moveY(ld, ld.vy * dt, true);
      postStep(ld);
    }
  } finally { gn.alive = true; ld.input = real; }
  if (inp === NO_INPUT) ld.pendingAct = false;
  if (ld.pendingAct) {
    ld.pendingAct = false;
    if (st.shoutT <= 0 && ld.alive) { st.shoutT = CANNON.shoutCool; st.shout = 0.9; Sfx.play('cannonShout', st.loader); rumble(st.gunner, 0, 0.35, 80); st.stats.shouts++; }
  }
  st.shoutT = Math.max(0, st.shoutT - dt); st.shout = Math.max(0, st.shout - dt);
}

// one free hand for a keg, one for a ball
const cannonHandFree = (st, kind) => (kind === 'powder' ? !st.carry.powder : !st.carry.ball);
function cannonTake(st, kind) {
  if (kind === 'powder') st.carry.powder = true; else st.carry.ball = kind;
  st.ldIdle = 0; st.carry.t = 0;
  if (st.call) { if (kind === 'powder') st.call.powder = false; else st.call.ball = false; }
  Sfx.play('cannonGrab', st.loader);
}
function cannonLoaderJobs(st, dt) {
  const ld = G.players[st.loader], cn = st.cannon;
  if (ld.alive) {
    // touching a pile with that hand free = pick one up (there is no putting back: the cannon takes everything)
    for (const pile of st.piles) {
      if (!cannonHandFree(st, pile.kind) || !rectHit(ld, pile.x, pile.y, pile.w, pile.h)) continue;
      cannonTake(st, pile.kind); pile.pop = 1; st.stats.fetched[st.loader]++;
      break;
    }
    // floor items (dropped by a splash)
    const r = CANNON.itemR;
    for (const it of st.items) if (!it.dead && it.age > 0.3 && cannonHandFree(st, it.kind) && rectHit(ld, it.x - r, it.y - r, 2 * r, 2 * r)) { cannonTake(st, it.kind); it.dead = true; }
  }
  st.carry.t += dt;
  // the hopper: everything in your hands goes in
  if (ld.alive && cannonHolding(st) && rectHit(ld, st.hop.x, st.hop.y, st.hop.w, st.hop.h)) {
    const got = [];
    if (st.carry.powder) got.push('powder');
    if (st.carry.ball) got.push(st.carry.ball);
    got.forEach((kind, n) => {
      if (kind === 'powder') cn.powder++; else cn.balls.push(kind);
      st.flash.push({ kind, t: -0.08 * n, x: ld.x + ld.w / 2, y: ld.y - CANNON.carryLift - (got.length > 1 && kind !== 'powder' ? 22 : 0) });
    });
    st.stats.loaded[st.loader]++; // one trip to the hopper = one load, whatever was in your hands
    st.carry.powder = false; st.carry.ball = null; st.ldIdle = 0;
    Sfx.play(got[0] === 'powder' ? 'cannonPlonkKeg' : 'cannonPlonk', st.loader);
    if (got.length > 1) Sfx.play('cannonPlonk', st.loader);
    rumble(st.loader, 0.1, 0.3, 60);
    if (cannonLoaded(cn) && !cn.wasLoaded) { Sfx.play('cannonReady', st.gunner); cn.readyT = 1.2; st.call = null; }
  }
  cn.wasLoaded = cannonLoaded(cn);
  if (cn.readyT > 0) cn.readyT -= dt;
  // no pickup and no load for a while, and the cannon still can't fire: the loader gets a nudge (an arrow, a bubble)
  st.ldIdle = (!cannonLoaded(cn) && st.phase === 'play') ? st.ldIdle + dt : 0;
  if (st.call) { st.call.t -= dt; if (st.call.t <= 0 || (!st.call.powder && !st.call.ball)) st.call = null; }
  st.callCoolT = Math.max(0, st.callCoolT - dt);
}

function cannonItems(st, dt) {
  const ld = G.players[st.loader], r = CANNON.itemR;
  for (const it of st.items) {
    it.age += dt;
    if (it.age > CANNON.floorLife || it.y > H + 40) { it.dead = true; puff(it.x, it.y, 6, 'rgba(255,255,255,0.8)'); continue; }
    it.vy = Math.min(it.vy + CANNON.itemG * dt, 900);
    const nx = it.x + it.vx * dt;
    const solidAt = (x, y) => solidFor(tile(Math.floor(x / T), Math.floor(y / T)), ld);
    if (!solidAt(nx + Math.sign(it.vx) * r, it.y)) it.x = nx; else it.vx = -it.vx * 0.3;
    if (it.x + r > st.fence) { it.x = st.fence - r; it.vx = -Math.abs(it.vx) * 0.3; }
    if (it.x - r < T) { it.x = T + r; it.vx = Math.abs(it.vx) * 0.3; }
    const ny = it.y + it.vy * dt, foot = ny + r, ty = Math.floor(foot / T), ch = tile(Math.floor(it.x / T), ty);
    if (it.vy > 0 && (solidFor(ch, ld) || (ch === '=' && it.y + r <= ty * T + 1))) { it.y = ty * T - r; it.vy = 0; it.vx *= 0.8; }
    else it.y = ny;
  }
  if (st.items.some(it => it.dead)) st.items = st.items.filter(it => !it.dead);
}

// Catapult Keep: the catapult throws water balloons at the yard until it's knocked out or out of balloons
function cannonBalloons(st, dt) {
  const B = CANNON.balloon, cat = st.cat, ld = G.players[st.loader], cn = st.cannon, R = cannonRand;
  const catOK = cat && !cat.dead && Math.abs(cat.x - cat.sx) < CANNON_PHYS.flagMove && Math.abs(cat.y - cat.sy) < CANNON_PHYS.flagMove;
  if (cat && !catOK && !st.catDown) {
    st.catDown = true; st.stats.catapult = 1;
    if (st.phase === 'play') { st.msg = { text: 'Catapult down!', t: 1.6 }; Sfx.play('cannonFlag', st.gunner); }
  }
  if (catOK && st.phase === 'play' && st.throwN < B.ammo) {
    st.balloonT -= dt;
    if (st.balloonT <= 0 && ld.alive) {
      st.balloonT = B.every; st.throwN++;
      // every other balloon goes for the cannon (wet powder!), the others for the loader's feet
      const atCannon = B.alt && st.throwN % 2 === 0;
      const sx = cat.x + cat.w / 2, sy = cat.y - 6;
      const tx = atCannon ? cn.x : clamp(ld.x + ld.w / 2 + ld.vx * B.lead, 20, st.fence - 10), ty = atCannon ? cn.floor - 4 : ld.y + ld.h - 4;
      const tt = B.flight, vx = (tx - sx) / tt, vy = (ty - sy - 0.5 * B.g * tt * tt) / tt;
      st.balloons.push({ x: sx, y: sy, vx, vy, tx, ty, t: 0, tt });
      cat.throwT = 0.5; st.stats.thrown++; Sfx.play('cannonCatapult', st.loader);
    }
  }
  if (catOK && st.throwN >= B.ammo && !st.outMsg && !st.balloons.length && st.phase === 'play') { st.outMsg = true; st.msg = st.msg || { text: 'Out of balloons!', t: 1.6 }; }
  if (cat && cat.throwT > 0) cat.throwT -= dt;
  for (const b of st.balloons) {
    b.t += dt; b.vy += B.g * dt; b.x += b.vx * dt; b.y += b.vy * dt;
    const hitTile = b.t > 0.4 && b.x < st.fence + 30 && solidFor(tile(Math.floor(b.x / T), Math.floor((b.y + 6) / T)), ld);
    if (b.t < b.tt && !hitTile) continue;
    b.dead = true;
    Sfx.play('cannonSplash', st.loader);
    for (let n = 0; n < 16; n++) G.particles.push({ x: b.x, y: b.y, vx: (R() - 0.5) * 260, vy: -80 - R() * 220, life: 0.6, max: 0.6, col: 'rgba(120,200,255,0.95)', size: 3 + R() * 3, grav: 900, kind: 'dot' });
    if (ld.alive && Math.hypot(ld.x + ld.w / 2 - b.x, ld.y + ld.h / 2 - b.y) < B.splashR) {
      knock(ld, (ld.x + ld.w / 2 >= b.x ? 1 : -1) * B.knockV, -B.knockUp, B.stun, 0.2);
      st.wetT = 1.2; st.stats.splashed++; rumble(st.loader, 0.4, 0.4, 120);
      // splashed while carrying: what was in your hands pops out onto the floor (the piles are still there)
      const drop = [];
      if (st.carry.powder) drop.push('powder');
      if (st.carry.ball) drop.push(st.carry.ball);
      drop.forEach((kind, n) => st.items.push({ kind, x: ld.x + ld.w / 2, y: ld.y - 8 - n * 14, vx: (n ? 1 : -1) * (40 + R() * 80), vy: -200, age: 0 }));
      st.carry.powder = false; st.carry.ball = null;
    }
    if (cn.powder > 0 && Math.hypot(cn.x - b.x, cn.y - b.y) < B.wetR) { cn.powder--; st.msg = { text: 'Wet powder!', t: 1.4 }; Sfx.play('cannonFizz', st.gunner); st.stats.wet++; }
  }
  if (st.balloons.some(b => b.dead)) st.balloons = st.balloons.filter(b => !b.dead);
  st.wetT = Math.max(0, st.wetT - dt);
}

function cannonEvents(st) {
  const W = st.W, R = cannonRand, play = st.phase === 'play';
  for (const e of W.events) {
    if (e.e === 'break') {
      const b = e.b, col = b.shape === 'roof' ? (b.id % 2 ? '#ff6b6b' : '#5b95ff') : CANNON_PHYS.mat[b.mat].col;
      const crumble = e.why === 'crumble', nChips = crumble ? 2 : 6; // the victory crumble breaks every block: fewer chips
      for (let n = 0; n < nChips; n++) G.particles.push({ x: b.x + R() * b.w, y: b.y + R() * b.h, vx: (R() - 0.5) * 260, vy: -100 - R() * 200, life: 0.9, max: 0.9, col, size: 6 + R() * 5, grav: 1200, kind: 'conf', rot: R() * 6, vr: (R() - 0.5) * 10 });
      puff(b.x + b.w / 2, b.y + b.h / 2, crumble ? 1 : 5, 'rgba(255,255,255,0.7)');
      if (!crumble) { Sfx.play(b.mat === 'stone' ? 'cannonCrackStone' : 'cannonCrackWood', st.gunner); if (play) st.stats.broken++; }
      else if ((st.crumbleN++) % 5 === 0) Sfx.play(b.mat === 'stone' ? 'cannonCrackStone' : 'cannonCrackWood', st.gunner);
    } else if (e.e === 'hit' && e.why === 'ball') {
      Sfx.play(e.b.mat === 'stone' ? 'cannonClonk' : 'cannonThock', st.gunner);
    } else if (e.e === 'thud' && e.imp > 300) Sfx.play('cannonThud', st.gunner);
    else if (e.e === 'wobble') {
      Sfx.play('cannonPing', st.gunner);
      if (play && !st.msg) st.msg = { text: 'So close!', sub: 'Hit the blocks under the flag!', t: 1.6 }; // teach the rule: flags fall with their blocks
    } else if (e.e === 'flag') {
      Sfx.play('cannonFlag', st.gunner);
      burst(e.f.x, e.f.fy + 10, C.gold, 14);
      rumble(0, 0.3, 0.5, 120); rumble(1, 0.3, 0.5, 120);
      if (play) {
        const left = cannonPhysFlagsLeft(W);
        st.stats.flags++; st.shotFlags++;
        if (left > 0) st.msg = { text: st.shotFlags >= 2 ? (st.shotFlags === 2 ? 'Two in one!' : 'Three in one!') : e.f.crown ? 'The crown fell!' : 'Flag down! ' + left + ' to go', t: 1.6 };
      }
    } else if (e.e === 'boom') {
      Sfx.play('cannonKaboom', st.gunner);
      if (!reduceMotion) G.shake = Math.max(G.shake, 0.3);
      rumble(0, 0.8, 0.6, 250); rumble(1, 0.8, 0.6, 250);
      for (let n = 0; n < 22; n++) { const a = R() * Math.PI * 2, s = 100 + R() * 300; G.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0.5, max: 0.5, col: n % 2 ? '#ffc53d' : '#ff7a3d', size: 5 + R() * 5, grav: 300, kind: 'dot' }); }
      st.boomFx = { x: e.x, y: e.y, t: 0 };
    } else if (e.e === 'splash') {
      Sfx.play('cannonPlop', st.gunner);
      for (let n = 0; n < 10; n++) G.particles.push({ x: e.x, y: e.y, vx: (R() - 0.5) * 160, vy: -120 - R() * 200, life: 0.6, max: 0.6, col: 'rgba(170,220,255,0.95)', size: 3 + R() * 3, grav: 900, kind: 'dot' });
    } else if (e.e === 'sink') {
      Sfx.play('cannonPlop', st.gunner);
      for (let n = 0; n < 6; n++) G.particles.push({ x: e.x, y: e.y, vx: (R() - 0.5) * 120, vy: -80 - R() * 160, life: 0.5, max: 0.5, col: 'rgba(170,220,255,0.95)', size: 3 + R() * 3, grav: 900, kind: 'dot' });
    } else if (e.e === 'ballGone') {
      if (e.ball.gone) continue;
      e.ball.gone = true;
      st.ghost = e.ball.trail;
      if (!play) continue;
      if (e.ball.touched) st.missRow = 0; else { st.missRow++; st.stats.misses++; }
    }
  }
  W.events.length = 0;
}

// after par + wobbleOver shots, any ball that touches the castle knocks down the standing flag nearest to it
// (the castle is at 1 star by then, so this never changes the stars: it only makes sure every castle ends)
function cannonWobble(st) {
  if (st.phase !== 'play' || st.shots < st.par + CANNON.wobbleOver) return;
  st.wobbly = true;
  for (const ball of st.W.balls) {
    if (!ball.touched || ball.wobbled) continue;
    ball.wobbled = true;
    let best = null, bd = Infinity;
    for (const f of st.W.flags) if (!f.down) { const d = Math.abs(f.x - ball.x); if (d < bd) { bd = d; best = f; } }
    if (best) { const b = st.W.blocks[best.base]; b.vx += 60; cannonPhysWake(st.W, b); b.hp = Math.min(b.hp, 0.01); cannonPhysDamage(st.W, b, 1, 'wobble'); st.stats.wobbles++; }
  }
}

function cannonStep(st, dt) {
  if (!st.W) return;
  if (G.introT > CANNON.introHold) { for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; } return; } // the room card: the world waits
  if (st.hint > 0) st.hint -= dt;
  if (st.msg) { st.msg.t -= dt; if (st.msg.t <= 0) st.msg = null; }
  for (const f of st.flash) f.t += dt;
  if (st.flash.length && st.flash[0].t >= 0.3) st.flash = st.flash.filter(f => f.t < 0.3);
  for (const pile of st.piles) pile.pop = Math.max(0, pile.pop - dt * 4);
  if (st.boomFx) { st.boomFx.t += dt; if (st.boomFx.t > 0.35) st.boomFx = null; }
  cannonGunner(st, dt);
  cannonLoaderMove(st, dt);
  cannonLoaderJobs(st, dt);
  cannonItems(st, dt);
  cannonBalloons(st, dt);
  cannonPhysStep(st.W, dt);
  // castle debris never lands in the yard: a block whose middle crosses the fence goes poof
  for (const b of st.W.blocks) if (!b.dead && b.x + b.w / 2 < st.fence + 8) { cannonPhysKill(st.W, b, 'yard'); puff(b.x + b.w / 2, b.y + b.h / 2, 8, 'rgba(255,255,255,0.85)'); }
  cannonWobble(st);
  cannonEvents(st);
  st.stats.time[st.k] = (st.stats.time[st.k] || 0) + dt;
  if (st.phase === 'play' && cannonPhysFlagsLeft(st.W) === 0) {
    // every flag is down: the castle is cleared
    st.phase = 'won'; st.winT = 0;
    st.stars = cannonStarsFor(st.shots, st.par); st.stats.stars[st.k] = st.stars; st.stats.shotsBy[st.k] = st.shots;
    st.crumble = st.W.blocks.filter(b => !b.dead).sort((a, b) => a.y - b.y || a.id - b.id).map((b, n, arr) => ({ b, at: CANNON.crumbleT * n / Math.max(1, arr.length), done: false }));
    Sfx.play('cannonWin', st.gunner); rumble(0, 0.4, 0.7, 300); rumble(1, 0.4, 0.7, 300);
    st.msg = null; st.call = null;
  }
  if (st.phase === 'won') {
    st.winT += dt;
    for (const c of st.crumble) if (!c.done && st.winT >= c.at) { c.done = true; cannonPhysBreak(st.W, c.b, 'crumble'); }
    if (st.winT > 0.2 && (G.tickN % 12) === 0) confetti(780 + (cannonRand() - 0.5) * 200, 300);
    if (st.winT >= CANNON.winT) {
      if (G.level.def.roomIndex < G.level.def.roomCount - 1) nextRoom(); else levelClear();
    }
  }
}

/* ---------- drawing ---------- */
const cannonFont = px => '700 ' + px + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
function cannonDrawBlock(b) {
  const md = CANNON_PHYS.mat[b.mat];
  ctx.save();
  const sh = b.hitT > 0 ? Math.sin(b.hitT * 80) * 2 * b.hitT * 4 : 0;
  ctx.translate(b.x + b.w / 2 + sh, b.y + b.h / 2); ctx.rotate(b.rot);
  const x = -b.w / 2, y = -b.h / 2;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  if (b.shape === 'roof') {
    ctx.fillStyle = b.id % 2 ? '#ff6b6b' : '#5b95ff';
    ctx.beginPath(); ctx.moveTo(x - 3, y + b.h); ctx.lineTo(0, y - 2); ctx.lineTo(x + b.w + 3, y + b.h); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.moveTo(x + 2, y + b.h - 3); ctx.lineTo(-1, y + 5); ctx.lineTo(1, y + 9); ctx.lineTo(x + 7, y + b.h - 3); ctx.closePath(); ctx.fill();
    if (b.hp < b.maxHp) { ctx.strokeStyle = 'rgba(28,26,54,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-2, y + 6); ctx.lineTo(3, y + 16); ctx.lineTo(-1, y + 24); ctx.stroke(); }
  } else if (b.shape === 'cat') {
    // a little cart with a throwing arm (holding a water balloon)
    ctx.fillStyle = '#b07a48';
    rr(x, y + b.h * 0.45, b.w, b.h * 0.55 - 4, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(28,26,54,0.25)'; ctx.fillRect(x + 4, y + b.h * 0.72, b.w - 8, 2);
    const arm = b.throwT > 0 ? -1.2 * Math.sin((1 - b.throwT / 0.5) * Math.PI) : 0.5;
    ctx.save(); ctx.translate(x + b.w * 0.3, y + b.h * 0.5); ctx.rotate(-0.9 - arm);
    ctx.fillStyle = '#8a5833'; rr(0, -3, 34, 6, 3); ctx.fill(); ctx.stroke();
    if (!(b.throwT > 0.25)) { ctx.fillStyle = '#7ec8ff'; circle(36, 0, 6); ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = '#5a3a20'; for (const wx of [x + 10, x + b.w - 10]) { circle(wx, y + b.h - 3, 6); ctx.fill(); ctx.stroke(); }
    if (b.hp < b.maxHp) { ctx.strokeStyle = 'rgba(28,26,54,0.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + b.w * 0.5, y + b.h * 0.45); ctx.lineTo(x + b.w * 0.58, y + b.h * 0.7); ctx.stroke(); }
  } else {
    ctx.fillStyle = md.col; ctx.fillRect(x, y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(x, y, b.w, 3);
    ctx.fillStyle = 'rgba(28,26,54,0.22)'; ctx.fillRect(x, y + b.h - 3, b.w, 3);
    ctx.strokeStyle = 'rgba(28,26,54,0.2)'; ctx.lineWidth = 1; ctx.beginPath();
    if (b.mat === 'stone') {
      for (let yy = 15, row = 0; yy < b.h; yy += 15, row++) { ctx.moveTo(x, y + yy); ctx.lineTo(x + b.w, y + yy); }
      for (let yy = 0, row = 0; yy < b.h; yy += 15, row++) { const vx = x + (row % 2 ? b.w * 0.3 : b.w * 0.7); ctx.moveTo(vx, y + yy); ctx.lineTo(vx, y + Math.min(b.h, yy + 15)); }
    } else if (b.shape === 'plank') { ctx.moveTo(x + 4, y + b.h / 2); ctx.lineTo(x + b.w - 4, y + b.h / 2 + 1); }
    else if (b.shape === 'pillar') { for (let k = 1; k < 3; k++) { ctx.moveTo(x + b.w * k / 3, y + 4); ctx.lineTo(x + b.w * k / 3 + 1, y + b.h - 4); } }
    else { for (let k = 1; k < 3; k++) { ctx.moveTo(x + 4, y + b.h * k / 3); ctx.lineTo(x + b.w - 4, y + b.h * k / 3 + 1); } }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(28,26,54,0.6)'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.75, y + 0.75, b.w - 1.5, b.h - 1.5);
    if (b.hp < b.maxHp) { // cracks (more of them the closer it is to breaking)
      const d = 1 - b.hp / b.maxHp;
      ctx.strokeStyle = 'rgba(28,26,54,0.75)'; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(x + b.w * 0.3, y); ctx.lineTo(x + b.w * 0.45, y + Math.min(b.h, 30) * 0.4); ctx.lineTo(x + b.w * 0.3, y + Math.min(b.h, 30) * 0.7);
      ctx.moveTo(x + b.w * 0.45, y + Math.min(b.h, 30) * 0.4); ctx.lineTo(x + b.w * 0.75, y + Math.min(b.h, 30) * 0.55);
      if (d > 0.5) { ctx.moveTo(x + b.w, y + b.h * 0.6); ctx.lineTo(x + b.w * 0.7, y + b.h * 0.75); ctx.lineTo(x + b.w * 0.6, y + b.h); }
      ctx.stroke();
    }
  }
  ctx.restore();
}
function cannonDrawFlag(st, f) {
  const W = st.W;
  if (f.down) {
    if (f.downT > 1.4) return;
    ctx.save(); ctx.globalAlpha = clamp(1.4 - f.downT, 0, 1); ctx.translate(f.fx, f.fy); ctx.rotate(f.frot);
    if (f.crown) { ctx.translate(0, 26); ctx.scale(1.0, 1.0); cannonDrawCrown(0, 0); }
    else {
      ctx.fillStyle = '#e9e4f5'; ctx.fillRect(-1.5, 0, 3, CANNON_PHYS.poleH);
      ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(1.5, 0); ctx.lineTo(24, 7); ctx.lineTo(1.5, 14); ctx.closePath(); ctx.fill();
    }
    ctx.restore(); return;
  }
  const b = W.blocks[f.base], top = b.y - CANNON_PHYS.poleH, wob = f.wobble > 0 ? Math.sin(f.wobble * 40) * 5 * f.wobble / 0.6 : 0;
  const wave = Math.sin(G.clock * 6 + f.x) * 2 + wob;
  if (f.crown) { cannonDrawCrown(f.x + wob * 0.4, b.y - 10); return; }
  ctx.save(); ctx.translate(f.x, b.y); ctx.rotate(wob * 0.02); ctx.translate(-f.x, -b.y);
  ctx.fillStyle = '#e9e4f5'; ctx.strokeStyle = 'rgba(28,26,54,0.5)'; ctx.lineWidth = 1;
  ctx.fillRect(f.x - 1.5, top, 3, CANNON_PHYS.poleH); ctx.strokeRect(f.x - 1.5, top, 3, CANNON_PHYS.poleH);
  ctx.fillStyle = C.gold; circle(f.x, top - 1, 2.5); ctx.fill();
  ctx.beginPath(); ctx.moveTo(f.x + 1.5, top + 1); ctx.quadraticCurveTo(f.x + 14, top + 5 + wave * 0.5, f.x + 26, top + 8 + wave); ctx.quadraticCurveTo(f.x + 14, top + 12 + wave * 0.5, f.x + 1.5, top + 16); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(28,26,54,0.45)'; ctx.stroke();
  ctx.restore();
}
function cannonDrawCrown(cx, cy) {
  ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx - 13, cy + 8); ctx.lineTo(cx - 13, cy - 6); ctx.lineTo(cx - 6, cy + 1); ctx.lineTo(cx, cy - 10); ctx.lineTo(cx + 6, cy + 1); ctx.lineTo(cx + 13, cy - 6); ctx.lineTo(cx + 13, cy + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff6b8a'; circle(cx, cy + 3, 2.5); ctx.fill(); ctx.fillStyle = '#7ec8ff'; circle(cx - 7, cy + 4, 2); ctx.fill(); circle(cx + 7, cy + 4, 2); ctx.fill();
}
function cannonDrawItem(kind, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (kind === 'powder') {
    ctx.fillStyle = '#9a6232'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; rr(-8, -9, 16, 18, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(-5, -7, 3, 14);
    ctx.fillStyle = '#2a2f4f'; ctx.fillRect(-8, -5, 16, 3); ctx.fillRect(-8, 2, 16, 3);
    ctx.fillStyle = C.gold; circle(0, -10, 2.4); ctx.fill();
  } else {
    const r = CANNON_PHYS.ball[kind] ? CANNON_PHYS.ball[kind].r : 9;
    ctx.fillStyle = kind === 'boom' ? '#1c1a36' : kind === 'big' ? '#4a4f6e' : '#3c4260'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
    circle(0, 0, r); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.32)'; circle(-r * 0.35, -r * 0.35, r * 0.3); ctx.fill();
    if (kind === 'boom') {
      ctx.fillStyle = '#ff6b4a'; ctx.fillRect(-r * 0.75, -1.5, r * 1.5, 3);
      ctx.strokeStyle = '#c98b5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(4, -r - 6, 2, -r - 9); ctx.stroke();
      ctx.fillStyle = (G.clock * 10 | 0) % 2 ? '#ffc53d' : '#fff'; circle(2, -r - 10, 2.5); ctx.fill();
    }
  }
  ctx.restore();
}
function cannonDrawPile(p) {
  const x = p.tx0 * T, w = (p.tx1 - p.tx0 + 1) * T, y = (p.ty + 1) * T, s = 1 + p.pop * 0.15;
  if (p.kind === 'powder') { for (const [dx, dy] of [[12, -9], [w - 12, -9], [w / 2, -27]]) cannonDrawItem('powder', x + dx, y + dy, 1.05 * s); }
  else if (p.kind === 'iron') { for (const [dx, dy] of [[10, -9], [w / 2, -9], [w - 10, -9], [w / 2 - 10, -24], [w / 2 + 10, -24], [w / 2, -39]]) cannonDrawItem('iron', x + dx, y + dy, s); }
  else if (p.kind === 'big') { for (const [dx, dy] of [[15, -13], [w - 15, -13], [w / 2, -36]]) cannonDrawItem('big', x + dx, y + dy, s); }
  else {
    ctx.fillStyle = '#c98b5a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(x + 2, y - 22, w - 4, 22, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff6b4a'; ctx.fillRect(x + 4, y - 15, w - 8, 5);
    cannonDrawItem('boom', x + w / 2, y - 32, s);
  }
}
// Where each pile's name goes: above the pile; on top of the ledge over a cellar pile; under the shelf on the top rows
// (the room pill covers y < 76 at the top left). Names on one row are pushed apart so they never overlap (phones: bigger text).
function cannonPileLabels(st) {
  const big = hudBig();
  if (st.labs && st.labs.big === big && G.clock - st.labs.t < 2) return st.labs.list; // (re-measured now and then: web fonts load late)
  const fs = big ? 16 : 11;
  ctx.save(); ctx.font = cannonFont(fs);
  const list = st.piles.map(p => {
    const w = (p.tx1 - p.tx0 + 1) * T, y = (p.ty + 1) * T, str = CANNON_LABELS[p.kind];
    let under = false, stone = false;
    for (let tx = p.tx0; tx <= p.tx1; tx++) { if (tile(tx, p.ty - 1) === '=') under = true; if (tile(tx, p.ty + 1) === '#') stone = true; }
    const top = p.ty <= 4, itemsTop = CANNON_PILE_TOP[p.kind] || 50;
    const ly = top ? y + (stone ? T / 2 : 10 + fs * 0.8) : under ? (p.ty - 1) * T - 10 : y - itemsTop - 4 - fs / 2;
    return { p, str, x: p.tx0 * T + w / 2, y: ly, w: ctx.measureText(str).width, h: fs, top, onStone: top && stone };
  });
  ctx.restore();
  list.sort((a, b) => a.x - b.x);
  for (let i = 1; i < list.length; i++) for (let j = 0; j < i; j++) {
    const a = list[j], b = list[i];
    if (Math.abs(a.y - b.y) < a.h + 2) { const gap = a.x + a.w / 2 + 8 - (b.x - b.w / 2); if (gap > 0) b.x += gap; }
  }
  for (const lb of list) lb.p.lab = lb;
  st.labs = { big, list, t: G.clock };
  return list;
}
function cannonDrawCannon(st) {
  const cn = st.cannon, x = cn.x, y = cn.y, a = cn.ang * Math.PI / 180, kick = cn.kick * 6;
  // the rack behind the carriage: what waits after the shot in the barrel
  for (let k = 1; k < Math.min(cn.powder, CANNON.rackShow + 1); k++) cannonDrawItem('powder', x - 24 - (k - 1) * 3, cn.floor - 10 - (k - 1) * 17, 0.8);
  for (let k = 1; k < Math.min(cn.balls.length, CANNON.rackShow + 1); k++) cannonDrawItem(cn.balls[k], x - 40, cn.floor - 8 - (k - 1) * 16, 0.75);
  const extra = Math.max(0, cn.powder - 1 - CANNON.rackShow) + Math.max(0, cn.balls.length - 1 - CANNON.rackShow);
  if (extra) text('+' + extra, x - 46, cn.floor - 62, 12, C.ink, 'center', 'body');
  ctx.save(); ctx.translate(x, y); ctx.rotate(-a); ctx.translate(-kick, 0);
  ctx.fillStyle = '#3c4260'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  rr(-16, -9, CANNON_PHYS.barrel + 16, 18, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2a2f4f'; rr(CANNON_PHYS.barrel - 6, -11, 9, 22, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; rr(-12, -7, CANNON_PHYS.barrel + 6, 4, 2); ctx.fill();
  ctx.fillStyle = C.gold; ctx.fillRect(4, -9, 3, 18);
  ctx.restore();
  // carriage + wheels
  ctx.fillStyle = '#8a5833'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 22, cn.floor - 6); ctx.lineTo(x - 6, y - 6); ctx.lineTo(x + 8, y - 2); ctx.lineTo(x + 18, cn.floor - 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (const wx of [x - 12, x + 10]) { ctx.fillStyle = '#c98b5a'; circle(wx, cn.floor - 9, 9); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.ink; circle(wx, cn.floor - 9, 2.5); ctx.fill(); }
  // the hopper: a funnel on the breech where the loader drops things in
  const hx = st.hop.x + st.hop.w / 2, hy = y - 16, gold = cn.readyT > 0;
  ctx.fillStyle = gold ? C.gold : '#c98b5a';
  ctx.beginPath(); ctx.moveTo(hx - 14, hy - 14); ctx.lineTo(hx + 14, hy - 14); ctx.lineTo(hx + 5, hy); ctx.lineTo(hx - 5, hy); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(28,26,54,0.55)'; rr(hx - 11, hy - 14, 22, 3, 1.5); ctx.fill();
  // two lights over the funnel: powder and ball, gold when they're in
  const on = [cn.powder > 0, cn.balls.length > 0];
  on.forEach((lit, k) => { const px = hx - 7 + k * 14, py = hy - 23; ctx.fillStyle = lit ? C.gold : 'rgba(28,26,54,0.3)'; circle(px, py, 4.5); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.stroke(); });
  if (cannonLoaded(cn)) { ctx.fillStyle = (G.clock * 8 | 0) % 2 ? '#ffc53d' : '#ffffff'; circle(x - 14, y - 12, 3); ctx.fill(); }
}
// a bouncing arrow at a pile (the loader's nudge, or the gunner's call): over the pile's name, so it never covers it;
// on the top rows (name under the shelf, the room pill above) it points at the pile from the right
function cannonArrow(st, pile, col, z) {
  cannonPileLabels(st);
  const lb = pile.lab, bob = (1 + Math.sin(G.clock * 7)) * 3;
  ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath();
  let box;
  if (lb && lb.top) {
    const ax = (pile.tx1 + 1) * T + 4 + bob, ay = (pile.ty + 1) * T - 20;
    ctx.moveTo(ax + 13 * z, ay - 10 * z); ctx.lineTo(ax + 13 * z, ay + 10 * z); ctx.lineTo(ax, ay);
    box = { x0: ax - bob, x1: ax - bob + 13 * z + 6, y0: ay - 10 * z, y1: ay + 10 * z };
  } else {
    const ax = lb ? lb.x : pile.x + pile.w / 2, ay = (lb ? lb.y - lb.h / 2 - 4 : pile.ty * T - 24) - bob;
    ctx.moveTo(ax - 10 * z, ay - 13 * z); ctx.lineTo(ax + 10 * z, ay - 13 * z); ctx.lineTo(ax, ay);
    box = { x0: ax - 10 * z, x1: ax + 10 * z, y0: ay + bob - 6 - 13 * z, y1: ay + bob };
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  return box;
}
// the ball pile nearest to the loader (climbing counts: a shelf 4 rows up is farther than the far end of the cellar)
function cannonBallPile(st, ld) {
  const fx = ld.x + ld.w / 2, fy = ld.y + ld.h;
  let best = null, bd = Infinity;
  for (const p of st.piles) if (p.kind !== 'powder') { const d = Math.abs(p.x + p.w / 2 - fx) + 3 * Math.abs((p.ty + 1) * T - fy); if (d < bd) { bd = d; best = p; } }
  return best;
}
// the powder pile to point at: the one next to the ball pile the loader also needs (one trip), else the one nearest the loader
function cannonPowderPile(st, ld, ballPile) {
  const fx = ballPile ? ballPile.x + ballPile.w / 2 : ld.x + ld.w / 2, fy = ballPile ? (ballPile.ty + 1) * T : ld.y + ld.h;
  let best = null, bd = Infinity;
  for (const p of st.piles) if (p.kind === 'powder') { const d = Math.abs(p.x + p.w / 2 - fx) + 2 * Math.abs((p.ty + 1) * T - fy); if (d < bd) { bd = d; best = p; } }
  return best;
}
// would a ball of radius r at (x, y) have hit something? (the ground or the moat, a solid tile, a standing block)
function cannonDotHits(st, x, y, r) {
  if (y + r >= (ROWS - 2) * T) return true;
  if (y > 0 && solidFor(tile(Math.floor(x / T), Math.floor(y / T)), G.players[st.gunner])) return true;
  for (const b of st.W.blocks) if (!b.dead && x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r) return true;
  return false;
}
function cannonDraw() {
  const st = G.mst; if (!st.W) return;
  // a castle-wall look for the yard's back (behind the piles): crenellations on the rampart
  for (const p of st.piles) cannonDrawPile(p);
  ctx.font = cannonFont(hudBig() ? 16 : 11); ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  for (const lb of cannonPileLabels(st)) { ctx.fillStyle = lb.onStone ? 'rgba(255,255,255,0.82)' : 'rgba(28,26,54,0.62)'; ctx.fillText(lb.str, lb.x, lb.y); }
  ctx.fillStyle = '#8a5833'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
  rr(st.fence - 6, st.cannon.floor - 26, 5, 26, 2); ctx.fill(); ctx.stroke();
  cannonDrawCannon(st);
  for (const b of st.W.blocks) if (!b.dead) cannonDrawBlock(b);
  if (st.cat && !st.cat.dead && !st.catDown) {
    const c = st.cat, left = CANNON.balloon.ammo - st.throwN;
    for (let k = 0; k < left; k++) { ctx.fillStyle = '#7ec8ff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(c.x + c.w + 6 - (k % 3) * 9, c.y + c.h - 8 - (k / 3 | 0) * 10, 4.5, 5.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  }
  for (const f of st.W.flags) cannonDrawFlag(st, f);
  for (const it of st.items) { ctx.globalAlpha = it.age > CANNON.floorLife - 2 && (G.clock * 8 | 0) % 2 ? 0.4 : 1; cannonDrawItem(it.kind, it.x, it.y); ctx.globalAlpha = 1; }
  // balloon shadows (where it will land): the telegraph
  for (const b of st.balloons) {
    const k = clamp(b.t / b.tt, 0, 1);
    ctx.fillStyle = `rgba(28,26,54,${0.15 + 0.25 * k})`; ctx.beginPath(); ctx.ellipse(b.tx, b.ty + 4, 8 + 16 * k, 3 + 3 * k, 0, 0, Math.PI * 2); ctx.fill();
  }
}
// place speech bubbles so they never overlap each other or the big shouts (items are placed in order; a bubble that
// would touch an earlier one moves up or down by its own height, the nearest free spot first)
const CANNON_SPOTS = [[0, 0], [0, -1], [1, 0], [-1, 0], [0, 1], [1, -1], [-1, -1], [0, -2], [1, 1], [-1, 1], [0, 2], [0, -3]]; // (half a bubble sideways, a bubble up/down)
function cannonLayout(items, z, keepClear) {
  const placed = keepClear.slice(), hit = r => placed.some(q => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0);
  for (const it of items) {
    if (it.big) {
      ctx.font = it.size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
      const hw = ctx.measureText(it.str).width * it.maxScale / 2 + 4, hh = it.size * 0.62 * it.maxScale;
      placed.push({ x0: it.x - hw, x1: it.x + hw, y0: it.y - hh, y1: it.y + hh }); continue;
    }
    ctx.font = cannonFont(13 * z);
    it.w = ctx.measureText(it.str).width + 18 * z;
    it.x = clamp(it.x, it.w / 2 + 6, W - it.w / 2 - 6);
    const y0 = Math.max(it.y, 90 * z), x0 = it.x, sy = 26 * z, sx = it.w / 2 + 10;
    let best = null;
    for (const [kx, ky] of CANNON_SPOTS) {
      const y = y0 + ky * sy, x = clamp(x0 + kx * sx, it.w / 2 + 6, W - it.w / 2 - 6);
      if (y < 90 * z || y > H - 20) continue;
      const r = { x0: x - it.w / 2 - 2, x1: x + it.w / 2 + 2, y0: y - 12 * z - 2, y1: y + 10 * z + 2 };
      if (!hit(r)) { best = { x, y, r }; break; }
    }
    if (!best) best = { x: x0, y: y0, r: { x0: x0 - it.w / 2, x1: x0 + it.w / 2, y0: y0 - 12 * z, y1: y0 + 10 * z } };
    it.x = best.x; it.y = best.y; placed.push(best.r);
  }
}
function cannonDrawTop() {
  const st = G.mst; if (!st.W) return;
  const cn = st.cannon, ld = G.players[st.loader], gn = G.players[st.gunner], big = hudBig(), z = big ? 1.5 : 1, zt = big ? 1.25 : 1;
  const play = st.phase === 'play' && G.introT <= CANNON.introHold + 0.4;
  // last shot's ghost trail
  if (st.ghost && st.phase === 'play') { ctx.fillStyle = PCOL[st.gunner]; ctx.globalAlpha = 0.28; for (let i = 0; i < st.ghost.length; i += 2) { circle(st.ghost[i][0], st.ghost[i][1], 2.2 * z); ctx.fill(); } ctx.globalAlpha = 1; }
  if (st.phase === 'play') {
    // aim dots: the first part of the flight (more of it after misses in a row, the whole arc after missHelp2)
    const a = cn.ang * Math.PI / 180, v = CANNON_PHYS.vMin + (CANNON_PHYS.vMax - CANNON_PHYS.vMin) * cn.pow;
    const x0 = cn.x + Math.cos(a) * CANNON_PHYS.barrel, y0 = cn.y - Math.sin(a) * CANNON_PHYS.barrel, vx = Math.cos(a) * v, vy0 = -Math.sin(a) * v;
    const full = st.missRow >= CANNON.missHelp2, peek = full ? 3 : st.missRow >= CANNON.missHelp1 ? CANNON.peek2 : CANNON.peek;
    const dtd = full ? 0.05 : 0.03, n = Math.round(peek / dtd), loaded = cannonLoaded(cn);
    const br = (CANNON_PHYS.ball[cn.balls[0] || 'iron'] || { r: 8 }).r;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2;
    for (let i = 1; i <= n; i++) {
      const t = i * dtd, px = x0 + vx * t, py = y0 + vy0 * t + 0.5 * CANNON_PHYS.gBall * t * t;
      if (py > H || px > W) break;
      const al = (loaded ? 0.95 : 0.5) * (full ? 0.8 : 1 - i / (n + 2));
      if (cannonDotHits(st, px, py, br)) { // the ball stops here: a little x instead of dots through walls
        ctx.globalAlpha = Math.max(al, 0.9); ctx.strokeStyle = C.ink; ctx.lineWidth = 5 * z; ctx.lineCap = 'round';
        const k = 6 * z; ctx.beginPath(); ctx.moveTo(px - k, py - k); ctx.lineTo(px + k, py + k); ctx.moveTo(px + k, py - k); ctx.lineTo(px - k, py + k); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5 * z; ctx.stroke();
        break;
      }
      ctx.globalAlpha = al;
      circle(px, py, 3 * z); ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.lineCap = 'butt';
    // power meter beside the gunner
    const mw = 8 * z, mh = (big ? 40 : 38) * z, mx = gn.x - 8 - mw, my = gn.y + gn.h - 4 - mh;
    ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(mx - 3, my - 3, mw + 6, mh + 6, 5); ctx.fill();
    const f = cn.pow, col = f < 0.5 ? C.grass : f < 0.85 ? C.gold : '#ff6b6b';
    ctx.fillStyle = col; rr(mx, my + mh * (1 - f), mw, Math.max(3, mh * f), 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let k = 1; k < 5; k++) ctx.fillRect(mx, my + mh * k / 5, mw, 1);
  }
  // balls in flight (a little marker at the top when one flies above the screen)
  for (const ball of st.W.balls) {
    if (ball.y < -ball.r) { ctx.fillStyle = C.paper; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ball.x, 4); ctx.lineTo(ball.x - 7, 16); ctx.lineTo(ball.x + 7, 16); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else cannonDrawItem(ball.type, ball.x, ball.y);
  }
  for (const b of st.balloons) { ctx.fillStyle = '#7ec8ff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(b.x, b.y, 8, 9.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(b.x - 3, b.y - 4, 2.2); ctx.fill(); }
  if (st.boomFx) { ctx.globalAlpha = 1 - st.boomFx.t / 0.35; ctx.fillStyle = '#ffe9a8'; circle(st.boomFx.x, st.boomFx.y, CANNON_PHYS.ball.boom.boomR * (0.4 + st.boomFx.t * 2)); ctx.fill(); ctx.globalAlpha = 1; }
  // what the loader carries (a keg on the head, a ball on top), and items flying into the funnel
  const both = st.carry.powder && st.carry.ball;
  if (ld.alive && cannonHolding(st)) {
    const bob = Math.abs(ld.vx) > 20 && ld.grounded ? Math.sin(G.clock * 14) * 1.5 : 0, hx = ld.x + ld.w / 2, hy = ld.y - CANNON.carryLift + bob;
    if (st.carry.powder) cannonDrawItem('powder', hx, hy);
    if (st.carry.ball) cannonDrawItem(st.carry.ball, hx + (both ? 1 : 0), both ? hy - 10 - CANNON_PHYS.ball[st.carry.ball].r : hy);
  }
  for (const fl of st.flash) { if (fl.t < 0) continue; const k = fl.t / 0.3; cannonDrawItem(fl.kind, fl.x + (st.hop.x + st.hop.w / 2 - fl.x) * k, fl.y + (cn.y - 20 - fl.y) * k, 1 - 0.4 * k); }
  // calls and bubbles, laid out so none covers another: shouts and calls keep their place, then bubbles in order of
  // importance (what's missing, the nudges, the role hints) each take the first free spot just above or below theirs
  const carryH = cannonHolding(st) ? (both ? 44 : 22) : 0, items = [], keepClear = [];
  for (const lb of cannonPileLabels(st)) keepClear.push({ x0: lb.x - lb.w / 2, x1: lb.x + lb.w / 2, y0: lb.y - lb.h / 2, y1: lb.y + lb.h / 2 });
  keepClear.push({ x0: gn.x - 2, x1: gn.x + gn.w + 2, y0: gn.y - 2, y1: gn.y + gn.h }, { x0: cn.x - 30, x1: cn.x + 44, y0: cn.y - 34, y1: cn.floor });
  if (ld.alive) keepClear.push({ x0: ld.x - 2, x1: ld.x + ld.w + 2, y0: ld.y - 2 - carryH, y1: ld.y + ld.h });
  const bigAt = (str, x, y, size, col, scale, maxScale) => items.push({ big: true, str, x, y, size, col, scale, maxScale });
  const bub = (x, y, str, col, alpha = 1) => items.push({ big: false, str, x, y, col, alpha });
  if (st.shout > 0 && ld.alive) bigAt('FIRE!', ld.x + ld.w / 2, ld.y - 42 - carryH, 22 * zt, PCOL[st.loader], 1 + 0.2 * Math.sin(st.shout * 12), 1.2);
  if (st.call && st.call.t > CANNON.callT - 0.9) bigAt('HURRY!', gn.x + gn.w / 2, gn.y - 30, 20 * zt, PCOL[st.gunner], 1 + 0.15 * Math.sin(st.call.t * 14), 1.15);
  const need = cn.clickT > 0 && cn.need;
  if (need) bub(cn.x + 10, cn.y - 62, 'Need ' + (cn.need.powder && cn.need.ball ? 'powder + a ball' : cn.need.powder ? 'powder' : 'a ball') + '!', C.gold);
  else if (cn.readyT > 0) bigAt('READY!', cn.x, cn.y - 62, 20 * zt, C.gold, 1, 1);
  if (st.call && play) {
    const bp = cannonBallPile(st, ld), pp = cannonPowderPile(st, ld, st.call.ball ? bp : null);
    if (st.call.powder && pp) keepClear.push(cannonArrow(st, pp, PCOL[st.gunner], z));
    if (st.call.ball && bp) keepClear.push(cannonArrow(st, bp, PCOL[st.gunner], z));
  }
  if (play && st.hint <= 0 && cannonLoaded(cn) && cn.idleT > CANNON.idleHint) bub(gn.x + gn.w / 2, gn.y - 50, 'Loaded! ' + NAMES[st.gunner] + ', fire!', PCOL[st.gunner]);
  if (play && st.ldIdle > CANNON.loaderHint && st.hint <= 0 && ld.alive && !st.call) {
    const needP = cn.powder === 0 && !st.carry.powder, needB = cn.balls.length === 0 && !st.carry.ball;
    const bp = needB ? cannonBallPile(st, ld) : null, pile = needP ? cannonPowderPile(st, ld, bp) : bp;
    if (pile) keepClear.push(cannonArrow(st, pile, PCOL[st.loader], z));
    bub(ld.x + ld.w / 2, ld.y - 34 - carryH, NAMES[st.loader] + ': ' + (pile ? (needP ? 'get powder!' : 'get a ball!') : 'to the cannon!'), PCOL[st.loader]);
  }
  if (st.hint > 0 && play) {
    const a = clamp(st.hint, 0, 1);
    if (!need) bub(gn.x + gn.w / 2 + 10, gn.y - 64, NAMES[st.gunner] + ': ' + cannonKeys(st.gunner, 'gunner'), PCOL[st.gunner], a); // (the "Need..." bubble says more)
    bub(ld.x + ld.w / 2 + 60, ld.y - 66, NAMES[st.loader] + ': ' + cannonKeys(st.loader, 'loader'), PCOL[st.loader], a);
  }
  cannonLayout(items, z, keepClear);
  for (const it of items) {
    if (it.big) { bigText(it.str, it.x, it.y, it.size, it.col, it.scale); continue; }
    ctx.globalAlpha = it.alpha; ctx.fillStyle = 'rgba(28,26,54,0.85)'; rr(it.x - it.w / 2, it.y - 12 * z, it.w, 22 * z, 11 * z); ctx.fill();
    text(it.str, it.x, it.y - 0.5, 13 * z, it.col, 'center', 'body'); ctx.globalAlpha = 1;
  }
  if (st.msg) { bigText(st.msg.text, W * 0.72, 120 * zt, 30 * zt, C.paper, 1); if (st.msg.sub) bigText(st.msg.sub, W * 0.72, 152 * zt, 17 * zt, C.paper, 1); }
  if (st.phase === 'won') {
    const k = Math.min(1, st.winT / 0.3);
    bigText('Castle down!', W / 2, 150, 46 * zt, C.gold, 0.6 + 0.4 * k);
    bigText('★'.repeat(st.stars) + '☆'.repeat(3 - st.stars), W / 2, 150 + 55 * zt, 36 * zt, C.gold, k);
    bigText(st.shots + ' shot' + (st.shots === 1 ? '' : 's') + ' · par ' + st.par, W / 2, 150 + 92 * zt, 18 * zt, C.paper, k);
  }
}
function cannonHud() {
  const st = G.mst; if (!st.W) return;
  const left = cannonPhysFlagsLeft(st.W), big = hudBig(), fs = big ? 20 : 14;
  // the stars the next clear would earn (while a ball flies: the stars if this one clears)
  const stars = st.phase === 'won' ? st.stars : cannonStarsFor(st.shots + (st.W.balls.length ? 0 : 1), st.par);
  const s = `⚑ ${st.flagsTotal - left}/${st.flagsTotal}    ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}    Shots ${st.shots} · par ${st.par}`;
  ctx.font = cannonFont(fs);
  const w = ctx.measureText(s).width + 28;
  pill(W - 14, 12, w, big ? 36 : 28, 'right');
  text(s, W - 28, big ? 30.5 : 26.5, fs, C.paper, 'right', 'body');
}

Sfx.extra.cannonBoom = function (p) { this.tone(140, 0.32, 'sawtooth', 0.07, 50); this.tone(900, 0.06, 'square', 0.03, 300); };
Sfx.extra.cannonBoomBig = function (p) { this.tone(100, 0.42, 'sawtooth', 0.08, 38); this.tone(700, 0.08, 'square', 0.03, 200); };
Sfx.extra.cannonClick = function (p) { this.tone(1400 * p, 0.03, 'square', 0.03); this.tone(700 * p, 0.05, 'triangle', 0.03, null, 0.04); };
Sfx.extra.cannonCall = function (p) { this.tone(660 * p, 0.07, 'square', 0.035, 880 * p, 0.06); this.tone(880 * p, 0.1, 'square', 0.03, 990 * p, 0.14); };
Sfx.extra.cannonGrab = function (p) { this.tone(500 * p, 0.06, 'triangle', 0.05, 760 * p); };
Sfx.extra.cannonPlonk = function (p) { this.tone(240, 0.08, 'triangle', 0.07, 130); };
Sfx.extra.cannonPlonkKeg = function (p) { this.tone(180, 0.1, 'triangle', 0.06, 120); this.tone(90, 0.12, 'sine', 0.05, null, 0.03); };
Sfx.extra.cannonReady = function (p) { [784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.cannonShout = function (p) { this.tone(620 * p, 0.09, 'square', 0.04, 880 * p); this.tone(880 * p, 0.12, 'square', 0.035, 700 * p, 0.08); };
Sfx.extra.cannonCrackWood = function (p) { this.tone(700, 0.04, 'square', 0.04, 300); this.tone(160, 0.1, 'triangle', 0.06, 90, 0.02); };
Sfx.extra.cannonCrackStone = function (p) { this.tone(1100, 0.03, 'square', 0.035, 500); this.tone(110, 0.16, 'sawtooth', 0.04, 60, 0.02); };
Sfx.extra.cannonThock = function (p) { this.tone(420, 0.05, 'triangle', 0.05, 260); };
Sfx.extra.cannonPing = function (p) { this.tone(1500, 0.09, 'triangle', 0.04, 1250); };
Sfx.extra.cannonClonk = function (p) { this.tone(900, 0.05, 'square', 0.03, 600); this.tone(260, 0.08, 'triangle', 0.05, 180); };
Sfx.extra.cannonThud = function (p) { this.tone(110, 0.08, 'triangle', 0.06, 70); };
Sfx.extra.cannonFlag = function (p) { [660, 880, 1175].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.cannonKaboom = function (p) { this.tone(80, 0.5, 'sawtooth', 0.09, 30); this.tone(1200, 0.15, 'square', 0.03, 200); this.tone(60, 0.6, 'triangle', 0.08, 35, 0.05); };
Sfx.extra.cannonPlop = function (p) { this.tone(600, 0.12, 'sine', 0.05, 180); };
Sfx.extra.cannonSplash = function (p) { this.tone(900, 0.22, 'sawtooth', 0.02, 200); this.tone(260, 0.2, 'sine', 0.06, 90); };
Sfx.extra.cannonFizz = function (p) { this.tone(2000, 0.3, 'sawtooth', 0.015, 600); };
Sfx.extra.cannonCatapult = function (p) { this.tone(200, 0.15, 'triangle', 0.05, 420); this.tone(520, 0.3, 'sine', 0.03, 900, 0.1); };
Sfx.extra.cannonWin = function (p) { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.16, 'square', 0.045, null, i * 0.09)); };

MODES.cannon = {
  medals: { bronze: 'Knock down every castle', goals: [{ key: 'stars', gold: 11, silver: 8, more: true, text: n => `${n} of 12 stars or more`, gap: (v, n) => `${n - v} more star${n - v === 1 ? '' : 's'}` }] },
  medalValues() { const s = G.mst.stats; return s ? { stars: s.stars.reduce((a, b) => a + (b || 0), 0) } : {}; },
  rand: Math.random,
  setup(st, L) {
    st.stats = { shots: 0, fired: [0, 0], fetched: [0, 0], loaded: [0, 0], broken: 0, flags: 0, misses: 0, clicks: 0, calls: 0, shouts: 0,
      splashed: 0, wet: 0, catapult: 0, thrown: 0, wobbles: 0, stars: [], shotsBy: [], time: [] };
    cannonRoom(st, L, 0);
  },
  room(k, L) { cannonRoom(G.mst, L, k); },
  step(dt) { cannonStep(G.mst, dt); },
  draw() { cannonDraw(); },
  drawTop() { cannonDrawTop(); },
  hud() { cannonHud(); },
  stats() {
    const s = G.mst.stats, stars = s.stars.reduce((a, b) => a + (b || 0), 0);
    return [
      { label: 'Stars', value: stars + ' / 12' },
      { label: 'Shots fired', values: [s.fired[0], s.fired[1]] },
      { label: 'Loads', values: [s.loaded[0], s.loaded[1]] },
      { label: 'Blocks smashed', value: s.broken },
      stars >= 12 ? 'Perfect crew! Every castle on par.' : 'Shots per castle: ' + s.shotsBy.map(n => n == null ? '–' : n).join(' · '),
    ];
  },
};
// test hook for bots (window.__pipbo.MODES.cannon.test)
MODES.cannon.test = { CN: CANNON_PHYS, CANNON, cnWorld: cannonPhysWorld, cnClone: cannonPhysClone, cnStep: cannonPhysStep, cnFire: cannonPhysFire,
  cnSettled: cannonPhysSettled, cnFlagsLeft: cannonPhysFlagsLeft, cnSupports: cannonPhysSupports, onPad: cannonOnPad, keysFor: cannonKeys };
/* ===== end Cannon Crew ===== */

