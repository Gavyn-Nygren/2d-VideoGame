/* Pip & Bo - Levels: Brick by Brick and Sky Tower (falling blocks), including their drawing. */
'use strict';

/* ---------- Brick by Brick: one player drops blocks, the other climbs ---------- */
const TETRO = {
  I: { cells: [[0, 1], [1, 1], [2, 1], [3, 1]], n: 4, col: '#5fd0e6' },
  O: { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], n: 2, col: '#ffd25e' },
  T: { cells: [[0, 1], [1, 1], [2, 1], [1, 0]], n: 3, col: '#b48cff' },
  S: { cells: [[1, 0], [2, 0], [0, 1], [1, 1]], n: 3, col: '#79d98b' },
  Z: { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], n: 3, col: '#ff7a8a' },
  L: { cells: [[0, 1], [1, 1], [2, 1], [2, 0]], n: 3, col: '#ffa95c' },
  J: { cells: [[0, 0], [0, 1], [1, 1], [2, 1]], n: 3, col: '#7fa6ff' },
};
const BUILD = { fall: 0.42, softFall: 0.03, lock: 0.45, softLock: 0.12, dasDelay: 0.17, dasRate: 0.05, maxResets: 12,
  // Sky Tower: falling blocks can squash the climber, and the climber can head-butt blocks apart
  // trapPop: seconds boxed in (no way up) before the climber pops out by themselves (same time penalty; they land
  // on the nearest open column no higher than they were, and it counts as 'trapped' on the results)
  squashWait: 1.0, squashPenalty: 3, bonkV: 150, cracks: 2, trapPop: 5,
  // stuckPop: seconds stuck in an open pit (too deep to jump out) before they pop out to a spot at the same height
  // they can climb on from. Only if no piece can spawn (stack topped out: after 6 s) or as a last resort
  // (2 x stuckPop) do they pop out on top of the highest column.
  stuckPop: 30 };
const isTower = () => !!(G.build && G.level.def.build.tower);

function nextType() {
  const B = G.build;
  if (!B.bag.length) {
    B.bag = Object.keys(TETRO);
    for (let i = B.bag.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [B.bag[i], B.bag[j]] = [B.bag[j], B.bag[i]]; }
  }
  return B.bag.pop();
}
function updateActiveSet() {
  const pc = G.build && G.build.piece;
  G.activeSet = pc ? new Set(pc.cells.map(([cx, cy]) => (pc.y + cy) * COLS + pc.x + cx)) : null;
}
// Can the piece sit here? It must stay in the build area, off placed blocks, and never overlap the climber
// (in the tower, a piece falling down ignores the climber: it pushes them down or squashes them instead).
function pieceFits(cells, px, py, noClimber) {
  const L = G.level, area = L.def.build, cl = G.players[G.build.climber];
  for (const [cx, cy] of cells) {
    const gx = px + cx, gy = py + cy;
    if (gx < area.x0 || gx > area.x1 || gy >= ROWS) return false;
    if (gy < 0) continue;
    if (L.grid[gy][gx] !== '.') return false;
    if (!noClimber && cl.alive && rectHit(cl, gx * T + 0.5, gy * T + 0.5, T - 1, T - 1)) return false;
  }
  return true;
}
function spawnPiece() {
  const B = G.build, L = G.level, type = B.next, def = TETRO[type];
  const cells = def.cells.map(c => c.slice());
  const base = L.def.build.spawnCol - Math.floor(def.n / 2);
  // if the usual spot is taken, use the nearest free column
  for (let k = 0; k < 30; k++) {
    const px = base + (k % 2 ? 1 : -1) * Math.ceil(k / 2);
    if (pieceFits(cells, px, 1)) {
      B.piece = { type, cells, n: def.n, x: px, y: 1, fallT: 0, lockT: 0, resets: 0 };
      B.next = nextType();
      updateActiveSet();
      return;
    }
  }
  B.spawnWait = 0.2; // no room right now (the climber may be up there); try again shortly
}
function resetLock(pc) { if (pc.resets < BUILD.maxResets) { pc.lockT = 0; pc.resets++; } }
function tryShift(pc, dir) {
  if (!pieceFits(pc.cells, pc.x + dir, pc.y)) return false;
  pc.x += dir; resetLock(pc); updateActiveSet(); return true;
}
function tryRotate(pc) {
  if (pc.type === 'O') return;
  const rot = pc.cells.map(([x, y]) => [pc.n - 1 - y, x]);
  for (const [kx, ky] of [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]]) {
    if (pieceFits(rot, pc.x + kx, pc.y + ky)) {
      pc.cells = rot; pc.x += kx; pc.y += ky; resetLock(pc); updateActiveSet();
      Sfx.tone(700, 0.04, 'square', 0.03);
      return;
    }
  }
}
function lockPiece(pc) {
  const L = G.level, B = G.build, col = TETRO[pc.type].col;
  for (const [cx, cy] of pc.cells) {
    const gx = pc.x + cx, gy = pc.y + cy;
    if (gy < 0) continue;
    L.grid[gy][gx] = 'P'; L.blockCol[gy][gx] = col;
    puff(gx * T + T / 2, gy * T + T, 2, 'rgba(255,255,255,0.8)');
  }
  B.piece = null; B.spawnWait = 0.25; B.placed++;
  updateActiveSet();
  Sfx.tone(160, 0.08, 'triangle', 0.07, 100);
}
function ghostY(pc) { const tw = isTower(); let y = pc.y; while (pieceFits(pc.cells, pc.x, y + 1, tw)) y++; return y; }

// Sky Tower: the piece just moved down a row. If it now overlaps the climber, shove them out of the way:
// sideways if only a corner clipped them, otherwise down. No room below means they get squashed.
function towerPush(pc) {
  const cl = G.players[G.build.climber];
  if (!cl.alive) return;
  const cells = pc.cells.map(([cx, cy]) => [(pc.x + cx) * T, (pc.y + cy) * T]);
  const hits = () => cells.filter(([x, y]) => rectHit(cl, x + 0.5, y + 0.5, T - 1, T - 1));
  let hs = hits();
  if (!hs.length) return;
  const left = Math.min(...hs.map(c => c[0])), right = Math.max(...hs.map(c => c[0] + T));
  const toRight = right - cl.x, toLeft = cl.x + cl.w - left;
  const side = toRight <= 9 ? toRight + 0.5 : toLeft <= 9 ? -(toLeft + 0.5) : 0;
  if (side) {
    const x0 = cl.x;
    moveX(cl, side, true);
    if (!hits().length) return;
    cl.x = x0;
  }
  for (let k = 0; k < 3 && hs.length; k++) {
    const need = Math.max(...hs.map(c => c[1] + T)) - cl.y;
    if (moveY(cl, need, true) < need - 0.5) { squash(cl); return; }
    hs = hits();
  }
  if (hs.length) { squash(cl); return; }
  cl.vy = Math.max(cl.vy, 150);
}
function squash(p, label) {
  const B = G.build;
  // (a pop-out from a trap counts as 'trapped', not as a squash; same time cost.) Remember the row they
  // stood on: getting squashed or boxed in must never be a free ride up the tower.
  if (label) B.pops[p.id]++; else B.squashes[p.id]++;
  B.popRow = B.popHigh ? null : B.foot ? B.foot[1] : Math.floor((p.y + p.h + 1) / T); B.foot = null;
  B.t += BUILD.squashPenalty;
  B.pop = { x: p.x + p.w / 2, y: p.y, t: 1.6, text: (label || 'Squashed!') + ' +' + BUILD.squashPenalty + 's' };
  Sfx.play('squash', p.id);
  if (!reduceMotion) G.shake = 0.3;
  rumble(p.id, 1, 0.6, 260);
  burst(p.x + p.w / 2, p.y + p.h / 2, PCOL[p.id], 18);
  p.sx = 1.6; p.sy = 0.3;
  p.alive = false; p.respawnT = BUILD.squashWait;
}
// Where a popped-out climber lands: on top of the stack, in the nearest column that isn't under the falling piece
// and isn't more than a step higher than the row they were on (so squashing or boxing in your partner never lifts
// them up: they get squeezed out to the side and drop down). mode 'escape' (stuck in a pit): also only a spot they
// can climb on from. mode 'high' (stuck for good): the highest column instead.
function towerPick(p, mode, px, row) {
  const L = G.level, a = L.def.build, pc = G.build.piece;
  const busy = new Set(pc ? pc.cells.map(([cx]) => pc.x + cx) : []);
  let best = null, bestD = Infinity;
  for (let tx = a.x0; tx <= a.x1; tx++) {
    let ty = 0;
    while (ty < ROWS && !solidFor(L.grid[ty][tx], p)) ty++;
    if (ty < 1) continue;
    // (a 1-row step up is fine, any more is a lift)
    const lift = mode === 'high' ? ty * 1e4 : row == null || ty >= row ? 0 : row - ty === 1 ? 90 : 1e5 + (row - ty) * 1e3;
    const ok = mode !== 'escape' || towerCanClimbFrom(tx, ty);
    const d = Math.abs(tx * T + T / 2 - px) + (busy.has(tx) ? 1e6 : 0) + lift + (ok ? 0 : 1e4);
    if (d < bestD) { bestD = d; best = { x: tx * T + (T - PW) / 2, y: ty * T - PH, ok, lift: row != null && row - ty > 1 }; }
  }
  return best;
}
function towerSpot(p) {
  const B = G.build, s = towerPick(p, B.popHigh ? 'high' : B.popEscape ? 'escape' : '', B.pop ? B.pop.x : p.x + p.w / 2, B.popRow);
  B.popHigh = B.popEscape = false; B.popRow = null;
  return s ? { x: s.x, y: s.y } : G.spawnPts[p.id];
}
// Sky Tower: jumping hard into a placed block from below cracks it, and the second hit breaks it.
function towerBonk(p, ty, tx1, tx2) {
  if (!isTower() || p.id !== G.build.climber || G.build.phase !== 'play') return;
  const L = G.level, cx = Math.floor((p.x + p.w / 2) / T);
  const tx = [cx, tx1, tx2].find(x => L.grid[ty] && L.grid[ty][x] === 'P');
  if (tx === undefined) return;
  const key = ty * COLS + tx, n = (L.crack[key] || 0) + 1;
  rumble(p.id, 0.5, 0.4, 90);
  if (n >= BUILD.cracks) {
    const col = L.blockCol[ty][tx];
    L.grid[ty][tx] = '.'; L.blockCol[ty][tx] = null; delete L.crack[key];
    for (let k = 0; k < 4; k++) G.particles.push({ x: tx * T + 8 + (k % 2) * 14, y: ty * T + 8 + (k >> 1) * 14, vx: (k % 2 ? 1 : -1) * (60 + Math.random() * 80), vy: -120 - Math.random() * 120, life: 0.7, max: 0.7, col, size: 9, grav: 1400, kind: 'dot' });
    Sfx.play('crumble', p.id);
  } else {
    L.crack[key] = n;
    puff(tx * T + T / 2, (ty + 1) * T, 4, 'rgba(255,255,255,0.8)');
    Sfx.play('crack', p.id);
  }
}
// Is the climber boxed in? (no open path up to the top of the shaft) Then show them how to dig out.
function towerTrapped() {
  const L = G.level, a = L.def.build, cl = G.players[G.build.climber];
  if (!cl.alive) return false;
  const sx = Math.floor((cl.x + cl.w / 2) / T), sy = Math.floor((cl.y + cl.h / 2) / T);
  const open = (x, y) => x >= 0 && x < COLS && y >= 0 && y < ROWS && !solidFor(L.grid[y][x], cl);
  if (!open(sx, sy)) return false;
  const seen = new Set([sy * COLS + sx]), q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.pop();
    if (y <= 2) return false;
    if (x < a.x0 || x > a.x1) return false; // reached the ledge side
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = ny * COLS + nx;
      if (!seen.has(k) && open(nx, ny)) { seen.add(k); q.push([nx, ny]); }
    }
  }
  return true;
}
// Can the standing climber still get as high as the top of the stack? (walking, dropping, jumps of up to
// 3 blocks.) If not (a deep pit, a chimney, a sheer wall) the builder has to add steps or drop a block on them.
function towerCanClimb() {
  const B = G.build, cl = G.players[B.climber];
  if (!cl.alive) return true;
  const f = cl.grounded ? towerFoot(cl) || B.foot : B.foot; // mid-jump: from where they jumped
  return !f || towerCanClimbFrom(f[0], f[1]);
}
// the placed block (or floor) tile the climber stands on, as [x, row], or null
function towerFoot(cl) {
  const L = G.level, S = (x, y) => x < 0 || x >= COLS || y < 0 || (y < ROWS && solidFor(L.grid[y][x], cl));
  const r0 = Math.floor((cl.y + cl.h + 1) / T);
  const x0 = [cl.x + cl.w / 2, cl.x + 1, cl.x + cl.w - 1].map(v => Math.floor(v / T)).find(x => S(x, r0) && !S(x, r0 - 1));
  return x0 === undefined ? null : [x0, r0];
}
// ...from standing on top of tile (x0, r0)
function towerCanClimbFrom(x0, r0) {
  const L = G.level, a = L.def.build, cl = G.players[G.build.climber];
  const S = (x, y) => x < 0 || x >= COLS || y < 0 || (y < ROWS && solidFor(L.grid[y][x], cl));
  let top = ROWS;
  for (let x = a.x0; x <= a.x1; x++) { let y = 0; while (y < ROWS && !S(x, y)) y++; top = Math.min(top, y); }
  const seen = new Set([r0 * COLS + x0]), q = [[x0, r0]];
  const add = (x, y) => { const k = y * COLS + x; if (!seen.has(k)) { seen.add(k); q.push([x, y]); } };
  while (q.length) {
    const [x, r] = q.pop();
    if (r <= top + 1 || x < a.x0 || x > a.x1) return true;
    for (const nx of [x - 1, x + 1]) {
      if (!S(nx, r - 1)) { let y = r; while (y < ROWS && !S(nx, y)) y++; if (y < ROWS) add(nx, y); }
      for (let k = 1; k <= 3 && !S(x, r - k - 1); k++) if (S(nx, r - k) && !S(nx, r - k - 1)) add(nx, r - k);
      // a running leap over a 1-wide gap, landing up to 3 rows higher or 2 rows lower
      const lx = 2 * nx - x, open = (cx, y0, y1) => { for (let y = y0; y <= y1; y++) if (S(cx, y)) return false; return true; };
      if (S(nx, r) || !open(nx, r - 1, r - 1)) continue;
      for (let r2 = r + 2; r2 >= r - 3; r2--) {
        if (!S(lx, r2) || S(lx, r2 - 1)) continue;
        const hi = r2 < r ? r2 - 2 : r - 1; // landing higher needs a real jump: headroom over all three columns
        if (open(nx, hi, Math.max(r, r2) - 1) && open(lx, hi, r2 - 1) && (r2 >= r || open(x, hi, r - 1))) add(lx, r2);
      }
    }
  }
  return false;
}

function setupBuildRound() {
  const B = G.build, L = G.level;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (L.grid[y][x] === 'P') { L.grid[y][x] = '.'; L.blockCol[y][x] = null; }
  B.piece = null; B.next = nextType(); B.t = 0; B.phase = 'play'; B.spawnWait = 0.8; B.das = { dir: 0, t: 0, r: 0 };
  B.pop = null; B.trapped = false; B.trapT = 0; B.trapHeld = 0; B.stuck = false; B.stuckT = 0; B.popHigh = B.popEscape = false; B.popRow = null; B.noSpawnT = 0; B.escape = false; B.popLeft = Infinity; B.foot = null; L.crack = {};
  updateActiveSet();
  const cl = G.players[B.climber], bd = G.players[B.builder];
  Object.assign(cl, makePlayer(cl.id), { x: L.spawns[cl.id].x, y: L.spawns[cl.id].y, prevJump: true });
  // the builder has no body this round: they run the blocks instead
  Object.assign(bd, makePlayer(bd.id), { alive: false, respawnT: Infinity, prevJump: true });
  G.spawnPts = L.spawns.map(sp => ({ ...sp }));
}

function buildStep(dt) {
  const B = G.build, L = G.level;
  if (B.phase === 'swap') {
    B.swapT -= dt;
    if (B.swapT <= 0) {
      if (B.round < B.rounds - 1) { B.round++; [B.builder, B.climber] = [B.climber, B.builder]; setupBuildRound(); G.introT = 0; }
      else levelClear();
    }
    return;
  }
  B.t += dt;
  const bp = G.players[B.builder], inp = bp.input;
  if (!B.piece) { B.spawnWait -= dt; if (B.spawnWait <= 0) spawnPiece(); }
  const pc = B.piece;
  if (pc) {
    if (bp.pendingJump) tryRotate(pc);
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), das = B.das;
    if (dir !== das.dir) { das.dir = dir; das.t = 0; das.r = 0; if (dir) tryShift(pc, dir); }
    else if (dir) {
      das.t += dt;
      if (das.t >= BUILD.dasDelay) { das.r += dt; while (das.r >= BUILD.dasRate) { das.r -= BUILD.dasRate; tryShift(pc, dir); } }
    }
    const interval = inp.down ? BUILD.softFall : BUILD.fall, tw = isTower();
    pc.fallT += dt;
    while (pc.fallT >= interval) {
      pc.fallT -= interval;
      if (pieceFits(pc.cells, pc.x, pc.y + 1, tw)) { pc.y++; pc.lockT = 0; updateActiveSet(); if (tw) towerPush(pc); } else break;
    }
    if (B.piece && !pieceFits(pc.cells, pc.x, pc.y + 1, tw)) {
      pc.lockT += dt;
      if (pc.lockT >= (inp.down ? BUILD.softLock : BUILD.lock)) lockPiece(pc);
    }
  }
  bp.pendingJump = false;
  if (B.pop) { B.pop.t -= dt; if (B.pop.t <= 0) B.pop = null; }
  if (isTower()) {
    const tc = G.players[B.climber];
    if (tc.alive && tc.grounded) B.foot = towerFoot(tc) || B.foot;
    B.trapT -= dt;
    if (B.trapT <= 0) {
      B.trapT = 0.3; B.trapped = towerTrapped(); B.stuck = !B.trapped && !towerCanClimb();
      // is there a spot at about the same height they could climb on from? (else only the builder can help)
      const e = B.stuck && B.foot && towerPick(tc, 'escape', tc.x + tc.w / 2, B.foot[1]);
      B.escape = !!(e && e.ok && !e.lift);
    }
    B.stuckT = B.stuck ? B.stuckT + dt : 0;
    // boxed in for too long (say the roof is too high to head-butt): pop them out (no higher than they were)
    B.trapHeld = B.trapped && tc.alive ? B.trapHeld + dt : 0;
    if (B.trapHeld >= BUILD.trapPop) { B.trapHeld = 0; B.trapped = false; squash(tc, 'Popped out!'); }
    // stuck in an open pit for a long time: pop them out to a climbable spot at the same height. If there's none,
    // only when no piece can even spawn (the stack is topped out), or as a last resort, on top of the highest column.
    B.noSpawnT = B.piece ? 0 : (B.noSpawnT || 0) + dt;
    B.popLeft = (B.noSpawnT > 2 ? 6 : B.escape ? BUILD.stuckPop : 2 * BUILD.stuckPop) - B.stuckT;
    if (B.stuck && tc.alive && B.popLeft <= 0) { B.stuck = false; B.stuckT = 0; B.popHigh = !B.escape; B.popEscape = B.escape; squash(tc, 'Popped out!'); }
  }
  // the climber made it when they stand on the flag ledge
  const cl = G.players[B.climber];
  if (cl.alive && cl.tileGround && cl.y + cl.h <= L.goal.y + T + 1 && cl.x + cl.w / 2 >= L.def.build.goalX) {
    B.times[cl.id] = (B.times[cl.id] || 0) + B.t; B.lastT = B.t; // (each player's climbs add up)
    B.phase = 'swap'; B.swapT = B.round < B.rounds - 1 ? 2.4 : 1.4;
    B.piece = null; updateActiveSet();
    Sfx.play(B.round < B.rounds - 1 ? 'flag' : 'clear');
    for (let k = 0; k < 40; k++) confetti(cl.x + cl.w / 2, cl.y);
  }
}

function drawBrick(x, y, col, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = col || '#cccccc'; ctx.fillRect(x, y, T, T);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y, T, 4); ctx.fillRect(x, y, 4, T);
  ctx.fillStyle = 'rgba(28,26,54,0.25)'; ctx.fillRect(x, y + T - 4, T, 4); ctx.fillRect(x + T - 4, y, 4, T);
  ctx.strokeStyle = 'rgba(28,26,54,0.45)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
  ctx.restore();
}
function drawMini(type, cx, cy, size) {
  const d = TETRO[type];
  const xs = d.cells.map(c => c[0]), ys = d.cells.map(c => c[1]);
  const w = (Math.max(...xs) - Math.min(...xs) + 1) * size, h = (Math.max(...ys) - Math.min(...ys) + 1) * size;
  for (const [x, y] of d.cells) {
    const px = cx - w / 2 + (x - Math.min(...xs)) * size, py = cy - h / 2 + (y - Math.min(...ys)) * size;
    ctx.fillStyle = d.col; ctx.fillRect(px, py, size - 1, size - 1);
  }
}
function drawBuild() {
  const B = G.build, L = G.level, pc = B.piece;
  // the finish flag
  const g = L.goal, fx = g.x + 15, base = g.y + T;
  ctx.fillStyle = C.ink; ctx.fillRect(fx - 2, base - 62, 4, 62);
  const wave = Math.sin(G.clock * 6) * 3;
  ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(fx + 2, base - 62); ctx.lineTo(fx + 34, base - 50 + wave); ctx.lineTo(fx + 2, base - 38); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,215,90,0.25)'; circle(fx, base - 50, 26 + Math.sin(G.clock * 4) * 3); ctx.fill();
  if (!pc || B.phase !== 'play') return;
  const col = TETRO[pc.type].col, owner = PCOL[B.builder];
  // ghost: where it will land
  const gy = ghostY(pc), cl = G.players[B.climber];
  // in the tower, a ghost that lands on the climber turns red: that drop would squash them
  const danger = isTower() && cl.alive && pc.cells.some(([cx, cy]) => rectHit(cl, (pc.x + cx) * T + 0.5, (gy + cy) * T + 0.5, T - 1, T - 1));
  if (gy !== pc.y) {
    ctx.save(); ctx.setLineDash([5, 4]); ctx.lineWidth = 2;
    ctx.strokeStyle = danger ? 'rgba(235,60,80,0.95)' : 'rgba(28,26,54,0.55)';
    if (danger) ctx.fillStyle = 'rgba(255,90,110,' + (0.18 + 0.12 * Math.sin(G.clock * 12)) + ')';
    for (const [cx, cy] of pc.cells) {
      if (danger) ctx.fillRect((pc.x + cx) * T + 2, (gy + cy) * T + 2, T - 4, T - 4);
      ctx.strokeRect((pc.x + cx) * T + 2, (gy + cy) * T + 2, T - 4, T - 4);
    }
    ctx.restore();
    if (danger) { // a warning bubble over the climber's head
      const hx = cl.x + cl.w / 2, hy = cl.y - 16 + Math.sin(G.clock * 10) * 2;
      ctx.fillStyle = '#eb3c50'; circle(hx, hy, 10); ctx.fill();
      text('!', hx, hy + 1, 16, '#fff', 'center');
    }
  }
  for (const [cx, cy] of pc.cells) drawBrick((pc.x + cx) * T, (pc.y + cy) * T, col);
  // outline the falling piece in the builder's color
  ctx.save(); ctx.strokeStyle = owner; ctx.lineWidth = 3;
  for (const [cx, cy] of pc.cells) ctx.strokeRect((pc.x + cx) * T + 1.5, (pc.y + cy) * T + 1.5, T - 3, T - 3);
  ctx.restore();
}
function drawCrack(x, y) {
  ctx.save(); ctx.strokeStyle = 'rgba(28,26,54,0.75)'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 15, y + T - 2); ctx.lineTo(x + 12, y + 20); ctx.lineTo(x + 18, y + 13); ctx.lineTo(x + 13, y + 4);
  ctx.moveTo(x + 12, y + 20); ctx.lineTo(x + 5, y + 17);
  ctx.moveTo(x + 18, y + 13); ctx.lineTo(x + 26, y + 11);
  ctx.stroke(); ctx.restore();
}
function drawBuildHUD() {
  const B = G.build, bn = NAMES[B.builder], cn = NAMES[B.climber];
  if (isTower()) {
    const n = B.squashes[B.climber], m = B.pops[B.climber];
    if (n || m) {
      const s = [n ? 'Squashed ' + n + '\u00d7' : '', m ? 'Trapped ' + m + '\u00d7' : ''].filter(Boolean).join('  ');
      ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
      pill(14, 126, Math.max(104, ctx.measureText(s).width + 28), 26); text(s, 28, 139.5, 13, '#ff8a98', 'left', 'body');
    }
    const cl = G.players[B.climber];
    if (B.pop) {
      const a = Math.min(1, B.pop.t / 0.4), yy = B.pop.y - 14 - (1.6 - B.pop.t) * 24;
      ctx.save(); ctx.globalAlpha = a;
      ctx.font = '20px "Lilita One", "Arial Rounded MT Bold", sans-serif';
      const w = ctx.measureText(B.pop.text).width + 24, px = clamp(B.pop.x, w / 2 + 8, W - w / 2 - 8);
      pill(px, yy - 15, w, 30, 'center');
      text(B.pop.text, px, yy, 20, '#ff8a98', 'center');
      ctx.restore();
    } else if ((B.trapped || B.stuckT > 3) && cl.alive && B.phase === 'play') {
      const left = BUILD.trapPop - B.trapHeld;
      const s = !B.trapped ? (B.popLeft < 3 ? 'Popping you out in ' + Math.ceil(B.popLeft) + '\u2026' : 'Too high to jump! ' + bn + ', build ' + cn + ' some steps')
        : left < 3 ? 'Popping you out in ' + Math.ceil(left) + '\u2026' : 'Trapped? Jump into a block twice to break it!';
      ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w = ctx.measureText(s).width + 24, px = clamp(cl.x + cl.w / 2, w / 2 + 8, W - w / 2 - 8);
      const py = Math.max(8, cl.y - 40 + Math.sin(G.clock * 5) * 2);
      pill(px, py, w, 24, 'center');
      text(s, px, py + 12.5, 13, C.gold, 'center', 'body');
    }
  }
  // who's doing what, and the climb timer
  ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
  const parts = [[bn + ' builds', PCOL[B.builder]], ['  \u00b7  ', C.paper], [cn + ' climbs', PCOL[B.climber]], ['   ' + fmtTime(B.t), C.paper]];
  const tw = parts.reduce((n, [t]) => n + ctx.measureText(t).width, 0);
  const px = pill(W - 14, 12, tw + 28, 28, 'right');
  let x = px + 14;
  for (const [t, c] of parts) { text(t, x, 26.5, 14, c, 'left', 'body'); x += ctx.measureText(t).width; }
  // next piece
  if (B.next) {
    pill(14, 80, 104, 40);
    text('Next', 28, 100, 12, '#bdb7da', 'left', 'body');
    drawMini(B.next, 84, 100, 9);
  }
  pill(14, 46, 104, 26);
  text('Round ' + (B.round + 1) + ' of ' + B.rounds, 28, 59.5, 13, C.gold, 'left', 'body');
  // builder's controls, along the bottom
  const touch = document.documentElement.classList.contains('has-touch');
  const hasPad = Pads.kind === 'pad' && padFor(padSlots(), B.builder);
  const keysTxt = hasPad ? 'stick move   ' + glyph('a') + ' turn   down faster'
    : touch ? '\u25c0 \u25b6 move   \u25b2 turn   \u25bc faster'
    : (B.builder === 0 ? 'A D move   W turn   S faster' : '\u2190 \u2192 move   \u2191 turn   \u2193 faster');
  const s2 = bn + ', you\u2019re building:  ' + keysTxt;
  ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
  const sw = ctx.measureText(s2).width + 28;
  pill(W / 2, 500, sw, 26, 'center');
  text(s2, W / 2, 513.5, 13, C.paper, 'center', 'body');
  if (B.phase === 'swap') {
    const done = B.lastT;
    const line1 = cn + ' made it in ' + fmtTime(done) + '!';
    const line2 = B.round < B.rounds - 1 ? 'Swap! ' + cn + ' builds now, ' + bn + ' climbs.' : B.rounds > 2 ? 'All climbs done!' : 'Both climbs done!';
    ctx.fillStyle = 'rgba(28,26,54,0.88)'; rr(W / 2 - 220, 190, 440, 86, 18); ctx.fill();
    text(line1, W / 2, 220, 26, PCOL[B.climber], 'center');
    text(line2, W / 2, 252, 15, C.paper, 'center', 'body');
  }
}
