/* Pip & Bo - Computer partner: finding a way around a tile level (walk, jump, fall, drop through planks). */
'use strict';

/* ---------- how it works ----------
   A "cell" is a tile where a player can stand: the tile itself is open and the tile under it holds this player
   (stone, a plank, this player's colour block, a closed gate, a bridge that is on). From every cell the computer
   tries short moves with a copy of the game's own physics (tiles only, no partner): walk one tile, walk off a ledge,
   jump (from standing, with a pause before steering for ledges overhead, or with a run-up), and drop through a plank.
   A move counts when it lands on another cell without touching spikes or falling off the screen. The moves make a
   map; the shortest way (by time) is followed one move at a time, the same way: the same steering the copy used.
   The map is rebuilt whenever the tiles change (gates, bridges, blocks a level adds), and the plan is checked again
   every landing.

   cpuNav(st, p, x, feetY, opts) -> { left, right, jump, down }: one step of going to the cell nearest the point
     (x = where the player's centre should end up, feetY = the height of their feet). st.nav.status becomes
     'moving', 'arrived' (within opts.tol px, default 6) or 'noPath' (it then walks straight at the point, jumping
     at walls and gaps).
   opts: avoid(tx, ty) -> true for extra cells to stay out of (water, lava...), key: a short string that changes
     whenever avoid changes its answer (so the map is rebuilt), solid(ch, p): replaces solidFor for the map,
     maxDx / maxUp / maxDown: how far one move may go in tiles (6, 4, 10), tol: px.
   cpuNavCell(p) -> { tx, ty } the cell the player stands in (or null in the air).
   cpuNavReach(p, x, feetY, opts) -> seconds the way takes from the player's cell, or Infinity.
   While walking, a partner standing right in the way is hopped over (opts.noHop turns that off). */
const NAV = { maxT: 2.4, hold: 0.06, cache: [null, null] };

function navSolid(opts, ch, p) { return opts.solid ? opts.solid(ch, p) : solidFor(ch, p); }
function navSpike(x, y, w, h) {
  const tx1 = Math.floor(x / T), tx2 = Math.floor((x + w) / T), ty1 = Math.floor(y / T), ty2 = Math.floor((y + h) / T);
  for (let ty = ty1; ty <= ty2; ty++) for (let tx = tx1; tx <= tx2; tx++) {
    if (tile(tx, ty) === '^' && x < tx * T + 4 + T - 8 && x + w > tx * T + 4 && y < ty * T + 17 + 13 && y + h > ty * T + 17) return true;
  }
  return false;
}
const navCellX = tx => tx * T + T / 2;       // the centre x a player stands at in this cell
const navFeet = ty => (ty + 1) * T;          // feet height in this cell
function navOpen(opts, p, tx, ty) {
  if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return false;
  const ch = tile(tx, ty);
  return !navSolid(opts, ch, p) && ch !== '^' && !(opts.avoid && opts.avoid(tx, ty));
}
function navStand(opts, p, tx, ty) {
  if (!navOpen(opts, p, tx, ty)) return false;
  if (ty + 1 >= ROWS) return false;
  const below = tile(tx, ty + 1);
  return navSolid(opts, below, p) || below === '=';
}

/* a copy of the game's movement (control + moveX + moveY + probe), tiles only */
function navSim(opts, p, s, mv, jumpHeld, dt) {
  if (mv) s.vx = approach(s.vx, mv * PHYS.maxRun, (s.g ? PHYS.accG : PHYS.accA) * dt);
  else s.vx = approach(s.vx, 0, (s.g ? PHYS.fricG : PHYS.fricA) * dt);
  if (s.jumping && !jumpHeld && s.vy < 0) { s.vy *= PHYS.cut; s.jumping = false; }
  if (s.vy >= 0) s.jumping = false;
  s.vy = Math.min(s.vy + PHYS.g * dt, PHYS.maxFall);
  s.dropT -= dt;
  // x
  s.x += s.vx * dt;
  const ty1 = Math.floor((s.y + 0.01) / T), ty2 = Math.floor((s.y + PH - 0.01) / T);
  if (s.vx > 0) {
    const tx = Math.floor((s.x + PW - 0.001) / T);
    for (let ty = ty1; ty <= ty2; ty++) if (navSolid(opts, tile(tx, ty), p)) { s.x = tx * T - PW; s.vx = 0; break; }
  } else if (s.vx < 0) {
    const tx = Math.floor((s.x + 0.001) / T);
    for (let ty = ty1; ty <= ty2; ty++) if (navSolid(opts, tile(tx, ty), p)) { s.x = (tx + 1) * T; s.vx = 0; break; }
  }
  // y
  const prevBottom = s.y + PH;
  s.y += s.vy * dt;
  const tx1 = Math.floor((s.x + 0.01) / T), tx2 = Math.floor((s.x + PW - 0.01) / T);
  if (s.vy > 0) {
    const ty = Math.floor((s.y + PH - 0.001) / T), top = ty * T;
    for (let tx = tx1; tx <= tx2; tx++) {
      const ch = tile(tx, ty);
      if (navSolid(opts, ch, p) || (ch === '=' && prevBottom <= top + 0.5 && s.dropT <= 0)) { s.y = top - PH; s.vy = 0; break; }
    }
  } else if (s.vy < 0) {
    const ty = Math.floor((s.y + 0.001) / T);
    for (let tx = tx1; tx <= tx2; tx++) if (navSolid(opts, tile(tx, ty), p)) { s.y = (ty + 1) * T; s.vy = 0; s.jumping = false; break; }
  }
  // ground under the feet
  const by = s.y + PH, gy = Math.floor((by + 1) / T), gtop = gy * T;
  s.g = false;
  for (let tx = tx1; tx <= tx2; tx++) {
    const ch = tile(tx, gy);
    if (navSolid(opts, ch, p) || (ch === '=' && s.dropT <= 0 && by <= gtop + 0.5)) { s.g = true; break; }
  }
}
// The steering one kind of move uses, shared by the map builder and the follower so both do exactly the same thing.
// kind: 'walk' | 'off' (walk off a ledge) | 'jump' (steer at once) | 'high' (go straight up first, steer near the top)
// | 'run' (jump with a run-up) | 'drop' (through a plank). Returns -1, 0 or 1.
function navSteer(kind, s, tx, airborne) {
  const d = navCellX(tx) - (s.x + PW / 2);
  const toward = Math.abs(d) > 2 ? Math.sign(d) : 0;
  if (kind === 'high' && airborne && s.vy < -260) return 0;
  return toward;
}
// try one move from cell a to cell b; returns the seconds it takes, or 0 if it doesn't land there
function navTry(opts, p, a, b, kind) {
  const dir = Math.sign(b.tx - a.tx);
  const s = { x: navCellX(a.tx) - PW / 2, y: navFeet(a.ty) - PH, vx: 0, vy: 0, g: true, jumping: false, dropT: 0 };
  if (kind === 'run') { if (!dir) return 0; s.vx = dir * PHYS.maxRun; }
  let t = 0, air = false;
  if (kind === 'jump' || kind === 'high' || kind === 'run') { s.vy = -PHYS.jumpV; s.jumping = true; s.g = false; air = true; }
  if (kind === 'drop') { if (tile(a.tx, a.ty + 1) !== '=') return 0; s.dropT = 0.2; s.g = false; }
  const dt = 1 / 60;
  for (; t < NAV.maxT; t += dt) {
    const mv = navSteer(kind, s, b.tx, air);
    navSim(opts, p, s, kind === 'off' && !air ? dir : mv, true, dt);
    if (!s.g) air = true;
    if (s.y > H + 20) return 0;
    if (navSpike(s.x, s.y, PW, PH)) return 0;
    const cx = Math.floor((s.x + PW / 2) / T), cy = Math.floor((s.y + PH - 1) / T);
    if (opts.avoid && opts.avoid(cx, cy)) return 0;
    if (air && s.g) {
      if (cx !== b.tx || cy !== b.ty) return 0;
      // settle: it must be able to come to rest there (not slide off)
      return t + 0.1;
    }
    if (kind === 'off' && !air && t > 0.6) return 0; // never left the ledge
  }
  return 0;
}

function navGridKey(p, opts) {
  const L = G.level;
  let h = 0;
  for (let y = 0; y < ROWS; y++) { const r = L.grid[y]; for (let x = 0; x < COLS; x++) h = (h * 31 + r[x].charCodeAt(0)) | 0; }
  let sw = '';
  for (const k in L.sw) sw += L.sw[k].on ? '1' : '0';
  return p.id + ':' + h + ':' + sw + ':' + (G.activeSet ? G.activeSet.size : 0) + ':' + (opts.key || '') + ':' + (G.levelIndex) + ':' + (G.room || 0);
}
function navGraph(p, opts) {
  const key = navGridKey(p, opts), c = NAV.cache[p.id];
  if (c && c.key === key) return c;
  const maxDx = opts.maxDx || 6, maxUp = opts.maxUp || 4, maxDown = opts.maxDown || 10;
  const cells = [], at = new Map();
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) if (navStand(opts, p, tx, ty)) { const n = { tx, ty, i: cells.length, edges: [] }; cells.push(n); at.set(ty * COLS + tx, n); }
  const walkT = T / PHYS.maxRun;
  for (const a of cells) {
    for (const d of [-1, 1]) {
      const b = at.get(a.ty * COLS + a.tx + d);
      if (b && a.tx + d >= 0 && a.tx + d < COLS) a.edges.push({ to: b.i, kind: 'walk', t: walkT });
    }
    for (const b of cells) {
      if (b === a) continue;
      const dx = b.tx - a.tx, dy = b.ty - a.ty;
      if (Math.abs(dx) > maxDx || dy < -maxUp || dy > maxDown) continue;
      if (dy === 0 && Math.abs(dx) === 1) continue; // a plain walk
      const kinds = dy > 0 ? ['off', 'drop', 'jump', 'high', 'run'] : ['jump', 'high', 'run'];
      for (const kind of kinds) {
        if (kind === 'drop' && (dx !== 0 && Math.abs(dx) > 3)) continue;
        if (kind === 'off' && (!dx || navStand(opts, p, a.tx + Math.sign(dx), a.ty))) continue;
        if (kind === 'run') { const back = at.get(a.ty * COLS + a.tx - Math.sign(dx)); if (!back || !dx) continue; }
        const t = navTry(opts, p, a, b, kind);
        if (t) { a.edges.push({ to: b.i, kind, t: t + (kind === 'run' ? 0.35 : kind === 'off' || kind === 'drop' ? 0 : 0.15) }); break; }
      }
    }
  }
  const g = { key, cells, at };
  NAV.cache[p.id] = g;
  return g;
}
function navPath(g, from, goal) {
  const n = g.cells.length, dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), pe = new Array(n), done = new Uint8Array(n);
  dist[from] = 0;
  for (;;) {
    let u = -1, best = Infinity;
    for (let i = 0; i < n; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
    if (u < 0 || u === goal) break;
    done[u] = 1;
    for (const e of g.cells[u].edges) { const nd = dist[u] + e.t; if (nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = u; pe[e.to] = e; } }
  }
  if (dist[goal] === Infinity) return null;
  const path = [];
  for (let v = goal; v !== from; v = prev[v]) path.unshift({ from: prev[v], to: v, kind: pe[v].kind });
  return { path, t: dist[goal] };
}
function cpuNavCell(p) {
  if (!p.grounded) return null;
  return { tx: Math.floor(cpuCx(p) / T), ty: Math.floor((cpuFeet(p) - 1) / T) };
}
// the map cell for a point: the standable cell nearest to it (feet height counts double)
function navGoal(g, x, feetY) {
  let best = null, bd = Infinity;
  const gx = x / T - 0.5, gy = feetY / T - 1;
  for (const c of g.cells) { const d = Math.abs(c.tx - gx) + Math.abs(c.ty - gy) * 2; if (d < bd) { bd = d; best = c; } }
  return best;
}
function navFrom(g, p) {
  const c = cpuNavCell(p);
  if (!c) return null;
  const n = g.at.get(c.ty * COLS + c.tx);
  if (n) return n;
  // standing somewhere off the map (a partner's head, a ledge corner): the nearest cell at about this height
  let best = null, bd = Infinity;
  for (const k of g.cells) { const d = Math.abs(k.tx * T + T / 2 - cpuCx(p)) + Math.abs(navFeet(k.ty) - cpuFeet(p)) * 3; if (d < bd) { bd = d; best = k; } }
  return bd < 60 ? best : null;
}
function cpuNavReach(p, x, feetY, opts = {}) {
  const g = navGraph(p, opts), a = navFrom(g, p), b = navGoal(g, x, feetY);
  if (!a || !b) return Infinity;
  if (a === b) return 0;
  const r = navPath(g, a.i, b.i);
  return r ? r.t : Infinity;
}

function cpuNav(st, p, x, feetY, opts = {}) {
  const out = { left: false, right: false, jump: false, down: false };
  const N = st.nav || (st.nav = { plan: null, goalKey: '', airborne: false, cur: null, backI: -1, phase: '', stuckT: 0, lastX: 0, status: 'moving', replanT: 0 });
  if (!p.alive) { N.plan = null; N.cur = null; N.airborne = false; return out; }
  const tol = opts.tol || 6, dt = DT;
  const g = navGraph(p, opts), goal = navGoal(g, x, feetY);
  N.replanT -= dt;
  // in the air: keep steering the move under way
  if (!p.grounded) {
    N.airborne = true;
    const e = N.cur, b = e && g.cells[e.to];
    if (b && e.kind !== 'walk') {
      const m = navSteer(e.kind, { x: p.x, vy: p.vy }, b.tx, true); out.left = m < 0; out.right = m > 0;
      out.jump = p.vy < 0 && (e.kind === 'jump' || e.kind === 'high' || e.kind === 'run');
    } else { cpuSteer(out, p, x, tol); out.jump = p.vy < 0 && N.hop; } // a hop over the partner (or a stuck hop) is a full jump
    return out;
  }
  N.hop = false;
  const here = navFrom(g, p);
  const gk = goal ? goal.i + ':' + g.key : '';
  // just landed: did the move work?
  if (N.airborne) {
    N.airborne = false;
    if (N.cur && N.cur.kind !== 'walk') { if (!here || here.i !== N.cur.to) N.plan = null; N.cur = null; }
  }
  if (!goal || !here) { N.cur = null; return navGreedy(N, p, x, out, tol); }
  // arrived at the goal cell: fine steering
  if (here.i === goal.i) {
    N.plan = null; N.cur = null;
    const ok = cpuSeek(out, p, x, tol);
    N.status = ok || Math.abs(cpuCx(p) - x) <= tol ? 'arrived' : 'moving';
    return out;
  }
  // the move under way: done, still going, or knocked off course?
  if (N.cur) {
    const e = N.cur;
    if (here.i === e.to) N.cur = null;
    else if (N.goalKey !== gk || (here.i !== e.from && !(e.kind === 'run' && here.i === N.backI))) { N.cur = null; N.plan = null; }
  }
  if (!N.cur) {
    let k = N.plan && N.goalKey === gk && N.replanT > 0 ? N.plan.path.findIndex(s => s.from === here.i) : -1;
    if (k < 0) { N.plan = navPath(g, here.i, goal.i); N.goalKey = gk; N.replanT = 0.8; k = N.plan ? 0 : -1; }
    if (k < 0) { N.status = 'noPath'; return navGreedy(N, p, x, out, tol); }
    N.cur = N.plan.path[k]; N.phase = '';
    if (N.cur.kind === 'run') { const a = g.cells[N.cur.from], bk = g.at.get(a.ty * COLS + a.tx - Math.sign(g.cells[N.cur.to].tx - a.tx)); N.backI = bk ? bk.i : -1; }
  }
  N.status = 'moving';
  const e = N.cur, a = g.cells[e.from], b = g.cells[e.to], dir = Math.sign(b.tx - a.tx), cx = cpuCx(p), ax = navCellX(a.tx);
  // stuck (a partner in the way, a moving thing): hop
  N.stuckT = Math.abs(cx - N.lastX) < 0.3 && (e.kind === 'walk' || e.kind === 'off') ? N.stuckT + dt : 0; N.lastX = cx;
  if (N.stuckT > 0.9) { N.stuckT = 0; N.cur = null; N.plan = null; out.jump = !CPU.last[p.id].jump; N.hop = true; out.left = dir < 0; out.right = dir > 0; return out; }
  if (e.kind === 'walk' || e.kind === 'off') {
    out.left = dir < 0; out.right = dir > 0;
    // the partner stands right in the way: hop over (or onto) them
    if (!opts.noHop && navPartnerAhead(p, dir)) { out.jump = !CPU.last[p.id].jump; N.hop = true; }
    return out;
  }
  if (e.kind === 'drop') {
    if (N.phase !== 'go' && !cpuSteer(out, p, ax, 3)) return out;
    N.phase = 'go'; out.left = out.right = false; out.down = true; return out;
  }
  if (e.kind === 'run') {
    const bx = ax - dir * T;
    if (N.phase !== 'go') {
      // back up one tile, then run at the take-off point
      if (!cpuSteer(out, p, bx, 3) || Math.abs(p.vx) > 30) return out;
      N.phase = 'go';
    }
    out.left = dir < 0; out.right = dir > 0;
    if ((cx - ax) * dir >= -1) out.jump = !CPU.last[p.id].jump;
    return out;
  }
  // jump / high: stand still on the take-off point, then jump
  if (!cpuSteer(out, p, ax, 2.5) || Math.abs(p.vx) > 25) { if (Math.abs(cx - ax) <= 2.5) out.left = out.right = false; return out; }
  out.left = out.right = false;
  if (CPU.last[p.id].jump) return out; // let go first so the press counts
  out.jump = true;
  const m = navSteer(e.kind, { x: p.x, vy: -PHYS.jumpV }, b.tx, true); out.left = m < 0; out.right = m > 0;
  return out;
}
// is the other player standing right in front of p, at the same height, in the way of walking `dir`?
function navPartnerAhead(p, dir) {
  const o = other(p);
  if (!o.alive || !solidPartners() || Math.abs(cpuFeet(o) - cpuFeet(p)) > 8) return false;
  const gap = dir > 0 ? o.x - (p.x + p.w) : p.x - (o.x + o.w);
  return gap > -2 && gap < 12;
}
// no map way: walk straight at the point, jumping at walls and gaps
function navGreedy(N, p, x, out, tol) {
  N.status = 'noPath';
  const ok = cpuSteer(out, p, x, tol);
  if (ok) { N.status = 'arrived'; return out; }
  const dir = out.right ? 1 : -1, cx = cpuCx(p);
  const fx = Math.floor((cx + dir * (p.w / 2 + 6)) / T), fy = Math.floor((cpuFeet(p) - 2) / T);
  const wall = solidFor(tile(fx, fy), p), gap = !solidFor(tile(fx, fy + 1), p) && tile(fx, fy + 1) !== '=';
  N.stuckT = Math.abs(cx - N.lastX) < 0.3 ? N.stuckT + DT : 0; N.lastX = cx;
  if ((wall || gap || N.stuckT > 0.5) && p.grounded) out.jump = !CPU.last[p.id].jump;
  else out.jump = !p.grounded && p.vy < 0;
  return out;
}
