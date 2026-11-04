/* Pip & Bo - Computer partner: World 3 golf (3-1 Tee for Two, 3-2 Bounce House, 3-3 Windmill Way, 3-4 Portal Park). */
'use strict';

(() => {
/* The plan. One brain plays whichever job the hole gives the computer.
   Golfer: once the ball rests, it tries a grid of shots (aim x power, plus the moment of the swing on windmill holes) in a
   copy of the ball physics with no boost, and scores where each ends: the cup, a penalty (+1 stroke from the same spot),
   or how far the ball still is from the cup through open air (portals count as shortcuts). It picks a shot whose
   neighbours are good too, so a small miss isn't a splash, then fine-tunes the power, turns the aim, waits for the
   sail gap and holds jump until the meter reaches that power. Lower skill aims and swings less exactly, and a bit slower.
   Ball: in flight it tries "coast" and short boosts in 8 directions from where it is now, a few times a second, and
   boosts the way that ends best (coasting wins ties, to save fuel). Lower skill re-plans less often and reacts later.
   With a person: as golfer it waits and says "Ready?" when the person (the ball) has been away a long time, so the
   computer never plays a whole hole alone for someone who left; as ball it waits for the person's swing. */

const NOISE = { // per skill: aim (degrees) and power (meter) spread of a swing, thinking time before it, and the ball's
  // re-plan interval, reaction time, boost-length spread (s), how far off it judges a result, and boosts per shot
  easy: { aim: 5.5, pow: 0.075, think: 1.6, every: 0.35, react: 0.35, len: 0.1, judge: 0.45, bursts: 1 },
  normal: { aim: 2.8, pow: 0.04, think: 1.0, every: 0.2, react: 0.16, len: 0.05, judge: 0.2, bursts: 1 },
  hard: { aim: 1.6, pow: 0.022, think: 0.6, every: 0.12, react: 0.1, len: 0.03, judge: 0.08, bursts: 2 },
};
const noiseFor = skill => (skill < 0.5 ? NOISE.easy : skill < 0.85 ? NOISE.normal : NOISE.hard);
const gauss = () => { let s = 0; for (let k = 0; k < 4; k++) s += Math.random(); return (s - 2) * 1.73; };
const KSTEP = DT / GOLF.charge;      // meter rise per physics step
const SHOT = 600;                    // px of distance that "cost" about one stroke in the score
const BUDGET = 8000;                 // simulated ball sub-steps of thinking per game step (about 2 ms)
const MAXMS = 3;                     // and never more than this many ms per step (a slow device just thinks longer)
let work = 0;                        // sub-steps simulated so far
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
// true once this step's thinking is used up (w0 and t0: work and time when the step's thinking began)
const spent = (w0, t0) => work - w0 >= BUDGET || now() - t0 > MAXMS;

/* ---------- the course, as the brain sees it (cached per hole) ---------- */
const COURSES = new WeakMap();
function course() {
  const L = G.level;
  if (COURSES.has(L)) return COURSES.get(L);
  const n = COLS * ROWS, solid = new Uint8Array(n), bad = new Uint8Array(n);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const ch = L.grid[y][x];
    solid[y * COLS + x] = golfSolid(x, y) ? 1 : 0;
    bad[y * COLS + x] = ch === 'w' || ch === '^' ? 1 : 0;
  }
  // distance (tiles) to the cup through open cells, with portals as two-way shortcuts
  const dist = new Float32Array(n).fill(1e6), open = i => !solid[i] && !bad[i];
  const ci = L.cup.ty * COLS + L.cup.tx;
  dist[ci] = 0;
  const q = [ci], links = {};
  for (const p of L.portals) {
    const o = L.portals.find(r => r.ch === p.pair);
    if (o) (links[Math.floor(p.y / T) * COLS + Math.floor(p.x / T)] = links[Math.floor(p.y / T) * COLS + Math.floor(p.x / T)] || []).push(Math.floor(o.y / T) * COLS + Math.floor(o.x / T));
  }
  // small grid: a simple relax-until-stable pass is plenty
  while (q.length) {
    const i = q.shift(), x = i % COLS, y = (i / COLS) | 0;
    const nb = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const j = ny * COLS + nx;
      if (!open(j)) continue;
      if (dx && dy && (!open(y * COLS + nx) || !open(ny * COLS + x))) continue;
      nb.push([j, dx && dy ? 1.414 : 1]);
    }
    for (const j of links[i] || []) nb.push([j, 1]);
    for (const [j, c] of nb) if (dist[i] + c < dist[j] - 1e-6) { dist[j] = dist[i] + c; q.push(j); }
  }
  let per = 0;
  if (L.spinners.length) per = (2 * Math.PI / L.spinners[0].arms) / Math.abs(L.spinners[0].w) / DT; // sail period in steps
  const m = { solid, bad, dist, per };
  COURSES.set(L, m);
  return m;
}
function distAt(m, x, y) {
  const tx = clamp(Math.floor(x / T), 0, COLS - 1), ty = clamp(Math.floor(y / T), 0, ROWS - 1);
  let d = m.dist[ty * COLS + tx];
  if (d >= 1e6) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const nx = tx + dx, ny = ty + dy;
    if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS) d = Math.min(d, m.dist[ny * COLS + nx] + 1);
  }
  return Math.min(d, 200) * T;
}
// strokes still to play from a resting spot (rough): 0 in the cup, about 1 + distance / SHOT otherwise
const restValue = (m, x, y) => 1 + distAt(m, x, y) / SHOT;

/* ---------- a copy of the ball physics (golfFly and friends) without sounds, effects or game changes ---------- */
const S = { x: 0, y: 0, vx: 0, vy: 0, fuel: 1, flyT: 0, rest: 0, ground: false, sand: false, padCD: 0, portCD: 0, lastPad: -1, padStreak: 0 };
const ang = [], rings = [];
const solidAt = (m, tx, ty) => (tx < 0 || tx >= COLS || ty < 0 ? true : ty >= ROWS ? false : m.solid[ty * COLS + tx] === 1);
function simCollide(m, b) {
  const r = GOLF.r, L = G.level;
  const x0 = Math.floor((b.x - r) / T), x1 = Math.floor((b.x + r) / T), y0 = Math.floor((b.y - r) / T), y1 = Math.floor((b.y + r) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!solidAt(m, tx, ty)) continue;
    const qx = clamp(b.x, tx * T, tx * T + T), qy = clamp(b.y, ty * T, ty * T + T);
    const dx = b.x - qx, dy = b.y - qy;
    let d = Math.hypot(dx, dy), nx, ny;
    if (d >= r) continue;
    if (d > 1e-6) { nx = dx / d; ny = dy / d; } else {
      const outs = [[b.y - ty * T, 0, -1], [ty * T + T - b.y, 0, 1], [b.x - tx * T, -1, 0], [tx * T + T - b.x, 1, 0]]
        .filter(([, ox, oy]) => !solidAt(m, tx + ox, ty + oy)).sort((a, c) => a[0] - c[0]);
      const o = outs[0] || [b.y - ty * T, 0, -1];
      nx = o[1]; ny = o[2]; d = -o[0];
    }
    b.x += nx * (r - d); b.y += ny * (r - d);
    const vn = b.vx * nx + b.vy * ny, ch = tile(tx, ty), sand = ch === 's', bump = ch === 'X';
    if (vn < 0 && bump) {
      const out = Math.max(GOLF.bumpMin, -vn * GOLF.bumpBounce);
      b.vx += (out - vn) * nx; b.vy += (out - vn) * ny;
      if (ny < -0.6 && Math.abs(b.vx) < 120) b.vx = 120 * (Math.sign(b.vx) || (L.cup.x >= b.x ? 1 : -1));
    } else if (vn < 0) {
      const hard = -vn > 90, e = hard ? (sand ? GOLF.sandBounce : GOLF.bounce) : 0;
      b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
      if (hard) { const vt = -b.vx * ny + b.vy * nx; b.vx -= 0.12 * vt * -ny; b.vy -= 0.12 * vt * nx; }
    }
    if (ny < -0.6 && !bump) { b.ground = true; if (sand) b.sand = true; }
  }
}
// one sail (or the hub) as a round bar at (qx, qy): push the ball out and bat it with the sail's speed
function simHit(b, s, qx, qy, rad, t0, t1) {
  let dx = b.x - qx, dy = b.y - qy, d = Math.hypot(dx, dy);
  if (d >= rad) return;
  if (d < 1e-6) { dx = t0; dy = t1; d = 1; }
  const nx = dx / d, ny = dy / d;
  b.x = qx + nx * rad; b.y = qy + ny * rad;
  const svx = -s.w * (qy - s.y), svy = s.w * (qx - s.x);
  const rvx = b.vx - svx, rvy = b.vy - svy, vn = rvx * nx + rvy * ny;
  if (vn < 0) { b.vx = svx + rvx - (1 + GOLF.millBounce) * vn * nx; b.vy = svy + rvy - (1 + GOLF.millBounce) * vn * ny; }
}
function simMills(b) {
  const r = GOLF.r, sp = G.level.spinners;
  for (let si = 0; si < sp.length; si++) {
    const s = sp[si], a0 = ang[si];
    const reach = s.len + r + s.hw + 1, hx = b.x - s.x, hy = b.y - s.y;
    if (hx * hx + hy * hy > reach * reach) continue; // nowhere near the sails (the same result as checking them)
    work += s.arms;
    simHit(b, s, s.x, s.y, r + 8, 0, -1);
    for (let k = 0; k < s.arms; k++) {
      const a = a0 + k * Math.PI * 2 / s.arms, ex = Math.cos(a), ey = Math.sin(a);
      const t = clamp((b.x - s.x) * ex + (b.y - s.y) * ey, 0, s.len);
      simHit(b, s, s.x + ex * t, s.y + ey * t, r + s.hw, -ey, ex);
    }
  }
}
function simGadgets(b) {
  const L = G.level, r = GOLF.r;
  if (b.padCD <= 0) for (const p of L.pads) {
    const x0 = p.tx * T, top = p.ty * T + 18, bot = (p.ty + 1) * T;
    if (b.x > x0 + 1 && b.x < x0 + T - 1 && b.y + r > top && b.y - r < bot) {
      if (p.dir === 0) {
        const key = p.ty * COLS + p.tx;
        b.padStreak = b.lastPad === key ? (b.padStreak || 0) + 1 : 1; b.lastPad = key;
        let dir = Math.sign(b.vx) || (L.cup.x >= b.x ? 1 : -1);
        if (Math.abs(b.vx) < 90 && [0, 1, 2].some(k => golfSolid(p.tx + dir, p.ty - k))) dir = -dir;
        const drift = b.padStreak >= 3 ? 220 : 90;
        b.vx = Math.abs(b.vx) < drift ? drift * dir : b.vx * 0.85; b.vy = -GOLF.padV;
      } else { const a = GOLF.padAngle * Math.PI / 180; b.vx = p.dir * Math.cos(a) * GOLF.padSideV; b.vy = -Math.sin(a) * GOLF.padSideV; }
      b.y = Math.min(b.y, top - r); b.padCD = 0.25;
      break;
    }
  }
  if (b.portCD <= 0 && Math.hypot(b.vx, b.vy) > 40) for (const p of L.portals) {
    if (Math.abs(b.x - p.x) < 12 && Math.abs(b.y - p.y) < 18) {
      const q = L.portals.find(o => o.ch === p.pair);
      if (!q) break;
      b.x = q.x; b.y = q.y; b.portCD = 0.45;
      break;
    }
  }
  for (let i = 0; i < L.rings.length; i++) {
    const rg = L.rings[i];
    if (!rings[i] && Math.hypot(b.x - rg.x, b.y - rg.y) < 19) { rings[i] = true; b.fuel = 1; }
  }
}
/* Fly the ball from state b0 until it stops. off: sail angles are the current ones moved on by `off` steps.
   boost: null, or { d: delay s, t: seconds, ax, ay } (a unit direction). Returns { k: 'cup'|'pen'|'rest', x, y, t } */
const RES = { k: 'rest', x: 0, y: 0, t: 0 };
function simFly(m, b0, off, boost, maxT = GOLF.flyMax) {
  const L = G.level, b = S, c = L.cup, sp = L.spinners;
  Object.assign(b, b0);
  for (let i = 0; i < sp.length; i++) ang[i] = sp[i].a + sp[i].w * DT * off;
  for (let i = 0; i < L.rings.length; i++) rings[i] = b0.rings ? b0.rings[i] : false;
  const airBoost = L.def.airBoost;
  RES.k = 'rest';
  for (let step = 0; step < 2000; step++) {
    const dt = DT;
    for (let i = 0; i < sp.length; i++) ang[i] += sp[i].w * dt;
    b.flyT += dt; b.padCD -= dt; b.portCD -= dt;
    if (boost && b.fuel > 0 && !(b.ground && airBoost)) {
      const t = b.flyT - (b0.flyT || 0);
      if (t > boost.d && t <= boost.d + boost.t + 1e-9) {
        b.vx += boost.ax * GOLF.boostAcc * dt; b.vy += boost.ay * GOLF.boostAcc * dt;
        b.fuel = Math.max(0, b.fuel - dt / GOLF.boostTime);
      }
    }
    b.vy += GOLF.g * dt;
    const dr = 1 - GOLF.drag * dt; b.vx *= dr; b.vy *= dr;
    const n = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 4));
    b.ground = false; b.sand = false; work += n;
    for (let i = 0; i < n; i++) {
      b.x += b.vx * dt / n; b.y += b.vy * dt / n;
      simCollide(m, b);
      if (sp.length) { simMills(b); simCollide(m, b); }
      simGadgets(b);
      if (b.x > c.x0 + 2 && b.x < c.x0 + T - 2 && b.y > c.y0 + 3 && b.y < c.y0 + T + 4) { RES.k = 'cup'; RES.x = b.x; RES.y = b.y; RES.t = b.flyT; return RES; }
      const tx = Math.floor(b.x / T), ty = Math.floor(b.y / T);
      if (tile(tx, ty) === 'w' && b.y > ty * T + 6) { RES.k = 'pen'; break; }
      const sy = Math.floor((b.y + GOLF.r - 2) / T);
      if (tile(tx, sy) === '^' && b.y + GOLF.r > sy * T + 14) { RES.k = 'pen'; break; }
      if (b.y > H + 40 || b.x < -30 || b.x > W + 30) { RES.k = 'pen'; break; }
    }
    if (RES.k === 'pen') break;
    if (b.ground) { const f = (b.sand ? GOLF.sandRoll : GOLF.roll) * dt; b.vx = Math.abs(b.vx) <= f ? 0 : b.vx - Math.sign(b.vx) * f; }
    if (b.ground && Math.hypot(b.vx, b.vy) < 14) b.rest += dt; else b.rest = 0;
    if (b.flyT > GOLF.flyMax && !b.ground) { RES.k = 'pen'; break; }
    if (b.rest > 0.25 || b.flyT > GOLF.flyMax || b.flyT - (b0.flyT || 0) > maxT) break;
  }
  RES.x = b.x; RES.y = b.y; RES.t = b.flyT;
  return RES;
}
// remaining strokes after a shot that ended in `r`, hit from (fx, fy)
// Like a person, it aims to get the ball close (a drop is a bonus, not worth a gamble) and hates splashes.
// pen: how much extra a penalty hurts (more after splashing from the same spot already)
function outcome(m, r, fx, fy, pen = 1) {
  if (r.k === 'cup') return 0.5;
  if (r.k === 'pen') return 1 + pen + restValue(m, fx, fy);
  return restValue(m, r.x, r.y);
}
// the ball as it leaves the club
function launch(bx, by, aim, pow) {
  const a = aim * Math.PI / 180, v = pow * GOLF.vmax;
  return { x: bx, y: by, vx: Math.cos(a) * v, vy: -Math.sin(a) * v, fuel: 1, flyT: 0, rest: 0, ground: false, sand: false, padCD: 0, portCD: 0, lastPad: -1, padStreak: 0 };
}
const powOf = k => Math.max(0.04, k * KSTEP);

/* ---------- golfer ---------- */
const AIMS = []; for (let a = 2; a <= 178; a += 4) AIMS.push(a);
const KS = []; for (let p = 0.06; p <= 1.0001; p += 0.04) KS.push(Math.round(p / KSTEP));
// a new shot plan for the ball where it rests now
function newPlan(m, g, nz, pen) {
  const nph = m.per ? 6 : 1, n = nph * AIMS.length * KS.length;
  return { stage: 'grid', i: 0, n, nph, val: new Float32Array(n), t0: G.tickN, bx: g.b.x, by: g.b.y, nz, pen,
    aim: 0, k: 0, ph: 0, off: 0, fine: null, R: 0, aimGoal: 0, kGo: 0, told: false };
}
const idx = (P, ph, ai, ki) => (ph * AIMS.length + ai) * KS.length + ki;
// steps from the plan's start to the release step for sail phase ph (mod the sail period)
const phaseOff = (m, P, ph) => (m.per ? (ph * m.per) / P.nph : 0);
function planWork(m, P) {
  const w0 = work, t0 = now();
  if (P.stage === 'grid') {
    while (P.i < P.n && !spent(w0, t0)) {
      const ki = P.i % KS.length, ai = ((P.i / KS.length) | 0) % AIMS.length, ph = (P.i / (KS.length * AIMS.length)) | 0;
      const off = phaseOff(m, P, ph) + 1 - (G.tickN - P.t0); // angles are read now, so move them back to the plan's start
      const r = simFly(m, launch(P.bx, P.by, AIMS[ai], powOf(KS[ki])), off, null);
      P.val[P.i] = outcome(m, r, P.bx, P.by, P.pen);
      P.i++;
    }
    if (P.i < P.n) return;
    // pick the shot with the best expected result for this golfer's own spread of aim and power
    const sa = 4 / P.nz.aim, sk = (KS[1] - KS[0]) * KSTEP / P.nz.pow, wt = [];
    for (let da = -2; da <= 2; da++) for (let dk = -2; dk <= 2; dk++) wt.push(Math.exp(-0.5 * ((da * sa) ** 2 + (dk * sk) ** 2)));
    let best = Infinity;
    for (let ph = 0; ph < P.nph; ph++) for (let ai = 0; ai < AIMS.length; ai++) for (let ki = 0; ki < KS.length; ki++) {
      let s = 0, c = 0;
      for (let da = -2, wi = 0; da <= 2; da++) for (let dk = -2; dk <= 2; dk++, wi++) {
        const a2 = ai + da, k2 = ki + dk;
        if (a2 < 0 || k2 < 0 || a2 >= AIMS.length || k2 >= KS.length) continue;
        const w = wt[wi];
        s += w * P.val[idx(P, ph, a2, k2)]; c += w;
      }
      const score = s / c + KS[ki] * 1e-5; // softer shots win ties
      if (score < best) { best = score; P.aim = AIMS[ai]; P.k = KS[ki]; P.ph = ph; }
    }
    // fine-tune around it: 1 degree and 2 meter steps, same sail phase
    const aims = [], ks = [];
    for (let d = -6; d <= 6; d++) aims.push(clamp(P.aim + d, 0, 180));
    for (let d = -16; d <= 16; d += 2) ks.push(clamp(P.k + d, 5, Math.round(1 / KSTEP)));
    P.fine = { aims, ks, i: 0, val: new Float32Array(aims.length * ks.length) };
    P.stage = 'fine';
  }
  if (P.stage === 'fine') {
    const F = P.fine, n = F.aims.length * F.ks.length;
    while (F.i < n && !spent(w0, t0)) {
      const ai = (F.i / F.ks.length) | 0, ki = F.i % F.ks.length;
      const off = phaseOff(m, P, P.ph) + 1 - (G.tickN - P.t0);
      F.val[F.i] = outcome(m, simFly(m, launch(P.bx, P.by, F.aims[ai], powOf(F.ks[ki])), off, null), P.bx, P.by, P.pen);
      F.i++;
    }
    if (F.i < n) return;
    // only the inner part can win: its neighbours on every side are known
    let best = Infinity;
    for (let ai = 3; ai < F.aims.length - 3; ai++) for (let ki = 4; ki < F.ks.length - 4; ki++) {
      let s = 0, c = 0;
      for (let a2 = 0; a2 < F.aims.length; a2++) for (let k2 = 0; k2 < F.ks.length; k2++) {
        const da = (F.aims[a2] - F.aims[ai]) / P.nz.aim, dk = (F.ks[k2] - F.ks[ki]) * KSTEP / P.nz.pow;
        if (da * da + dk * dk > 9) continue;
        const w = Math.exp(-0.5 * (da * da + dk * dk));
        s += w * F.val[a2 * F.ks.length + k2]; c += w;
      }
      const score = s / c;
      if (score < best) { best = score; P.aim = F.aims[ai]; P.k = F.ks[ki]; }
    }
    // how the swing will really go: a little off, depending on skill
    P.aimGoal = clamp(P.aim + gauss() * P.nz.aim, 0, 180);
    P.kGo = Math.max(5, Math.min(Math.round(1 / KSTEP), P.k + Math.round(gauss() * P.nz.pow / KSTEP)));
    P.stage = 'aim';
  }
}
// the release step: on the planned sail phase, late enough to turn the aim and charge first
function releaseStep(m, P, earliest) {
  if (!m.per) return Math.max(earliest, G.tickN + P.kGo + 1);
  const base = P.t0 + phaseOff(m, P, P.ph);
  const k = Math.max(0, Math.ceil((earliest - base) / m.per));
  return Math.round(base + k * m.per);
}
function golferThink(st, p, o, info, g, m) {
  const out = {};
  const nz = noiseFor(info.skill);
  if (g.phase !== 'aim' && g.phase !== 'walk') { st.plan = null; return out; }
  const spot = g.hole + ':' + Math.round(g.b.x) + ',' + Math.round(g.b.y), key = spot + ':' + g.strokes[g.hole];
  if (st.key !== key || !st.plan) {
    // a splash from this same spot last time: play it safer now
    st.spots = st.spots || {};
    if (st.key && st.key.startsWith(spot + ':')) st.spots[spot] = (st.spots[spot] || 0) + 1;
    st.key = key; st.plan = newPlan(m, g, nz, 1 + (st.spots[spot] || 0)); st.aimT = 0;
  }
  const P = st.plan;
  if (P.stage === 'grid' || P.stage === 'fine') planWork(m, P);
  if (g.phase !== 'aim') return out;
  st.aimT += DT;
  if (P.stage === 'grid' || P.stage === 'fine') return out;
  // turn the aim (◀ raises the angle, ▶ lowers it; holding speeds it up, so ease off near the goal)
  if (P.stage === 'aim') {
    const diff = P.aimGoal - g.aim, stepA = (35 + Math.min(1, (g.aimHold + DT) / 0.6) * 85) * DT;
    if (Math.abs(diff) >= stepA) { out.left = diff > 0; out.right = diff < 0; return out; }
    if (g.aimHold > 0) return out;
    if (Math.abs(diff) > stepA / 2) { out.left = diff > 0; out.right = diff < 0; return out; }
    P.stage = 'wait'; P.R = 0;
  }
  // a person who has been away a long time: wait for them before swinging
  const away = !info.partnerCpu && info.partnerIdle > 24;
  if (P.stage === 'wait') {
    if (away) { cpuSay(p, 'Ready when you are!', 2); P.R = 0; return out; }
    const earliest = G.tickN + P.kGo + 2 + (G.introT > 0.55 ? Math.ceil((G.introT - 0.55) / DT) : 0) + Math.max(0, Math.ceil((nz.think - st.aimT) / DT));
    if (!P.R || P.R - P.kGo < G.tickN) P.R = releaseStep(m, P, earliest);
    if (G.tickN >= P.R - P.kGo && G.introT <= 0.55) { P.stage = 'charge'; out.jump = !(CPU.last[p.id] && CPU.last[p.id].jump); return out; }
    return out;
  }
  if (P.stage === 'charge') {
    if (!g.charging) {
      // the press didn't take (or a pause cancelled it): try again on the next good moment
      if (G.tickN > P.R - P.kGo + 2) { P.stage = 'wait'; P.R = 0; }
      out.jump = !(CPU.last[p.id] && CPU.last[p.id].jump);
      return out;
    }
    // let go on the step where the meter reaches the planned power
    out.jump = g.powerT + DT < P.kGo * DT - DT / 2;
    return out;
  }
  return out;
}

/* ---------- ball ---------- */
const DIRS = [];
for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; DIRS.push([Math.round(Math.cos(a) * 1e6) / 1e6, Math.round(Math.sin(a) * 1e6) / 1e6]); }
function ballThink(st, p, o, info, g, m) {
  const out = {}, b = g.b, nz = noiseFor(info.skill);
  if (g.phase === 'aim' && !info.partnerCpu && info.partnerIdle > 10 && G.introT <= 0) cpuSay(p, 'Your swing!', 2);
  if (g.phase !== 'fly') { st.boost = null; st.next = 0; st.ev = null; st.bursts = 0; return out; }
  if (b.fuel <= 0) return out;
  const flying = !(b.ground && G.level.def.airBoost);
  // keep doing the boost we picked
  const B = st.boost;
  // (the game counts this step's flight time before it reads the keys)
  const ft = b.flyT + DT;
  if (B && ft > B.from + 1e-9 && ft <= B.until + 1e-9 && flying) {
    out.right = B.ax > 0.3; out.left = B.ax < -0.3; out.down = B.ay > 0.3; out.up = B.ay < -0.3;
  }
  if (B && ft <= B.until + 1e-9) return out;
  // start a look: what happens if we coast, and if we boost each way for a while (after our reaction time)
  if (!st.ev && b.flyT >= (st.next || 0) && st.bursts < nz.bursts) {
    const b0 = { x: b.x, y: b.y, vx: b.vx, vy: b.vy, fuel: b.fuel, flyT: b.flyT, rest: b.rest, ground: b.ground, sand: false,
      padCD: b.padCD || 0, portCD: b.portCD || 0, lastPad: b.lastPad ?? -1, padStreak: b.padStreak || 0, rings: G.level.rings.map(r => r.used) };
    const left = b.fuel * GOLF.boostTime, opts = [null];
    for (const t of [0.05, 0.12, 0.25, left]) {
      if (t > left + 1e-6) continue;
      // each boost is judged by its average over a person's timing spread: a boost that only works if timed to
      // the millisecond isn't worth much
      for (const [ax, ay] of DIRS) for (const dt2 of [-nz.len, 0, nz.len]) opts.push({ d: nz.react, t: clamp(t + dt2, 0.02, left), ax, ay, t0: t });
      if (t === left) break;
    }
    st.ev = { b0, opts, i: 0, vals: [], tick: G.tickN };
  }
  const E = st.ev;
  if (!E) return out;
  // a few looks per step, all from the moment the look began (the sails moved on since, so step them back)
  const w0 = work, t0 = now(), late = G.tickN - E.tick;
  while (E.i < E.opts.length && !spent(w0, t0) && late * DT < nz.react - DT) {
    const o2 = E.opts[E.i];
    E.vals.push(outcome(m, simFly(m, E.b0, -late, o2), b.from.x, b.from.y));
    E.i++;
  }
  if (E.i < E.opts.length && late * DT < nz.react - DT) return out;
  // decide among the looks taken so far. A ball that is going in anyway is left alone, and only a boost that really
  // ends better than coasting is taken, so the computer never spoils its partner's shot; a person judges by eye, so
  // among the boosts that help it doesn't always pick the very best one
  st.ev = null; st.next = b.flyT + nz.every;
  const coast = E.vals[0];
  if (coast <= 0.5) st.bursts = nz.bursts; // in the cup without help: hands off for the rest of this shot
  let best = Infinity, pick = null;
  if (coast > 0.5) for (let i = 1; i + 2 < E.vals.length; i += 3) {
    const avg = (E.vals[i] + E.vals[i + 1] + E.vals[i + 2]) / 3;
    if (avg > coast - 0.05) continue;
    const v = avg + gauss() * nz.judge;
    if (v < best) { best = v; pick = E.opts[i + 1]; }
  }
  if (pick) {
    st.bursts++;
    const t = clamp(pick.t + gauss() * nz.len, 0.02, b.fuel * GOLF.boostTime), from = E.b0.flyT + pick.d;
    st.boost = { ax: pick.ax, ay: pick.ay, from, until: from + t };
  } else st.boost = null;
  return out;
}

cpuBrain('golf', {
  reset(st) { st.plan = null; st.key = null; st.boost = null; st.ev = null; st.next = 0; st.bursts = 0; },
  think(st, p, o, dt, info) {
    const g = G.golf;
    if (!g || !G.level || !G.level.cup) return {};
    const m = course();
    if (g.golfer === p.id) return golferThink(st, p, o, info, g, m);
    return ballThink(st, p, o, info, g, m);
  },
  // the ball player is drawn as the ball
  bubbleHidden: true,
  bubblePos(p) {
    const g = G.golf;
    if (g && g.ball === p.id && g.b) return { x: g.b.x, y: g.b.y - GOLF.r - 8 };
    return { x: cpuCx(p), y: p.y };
  },
  // for scratch tests: the shot simulator
  _sim: { course, simFly, launch, outcome, powOf, work: () => work },
});
})();
