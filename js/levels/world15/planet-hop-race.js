/* Pip & Bo - Level 15-4 Planet Hop Race (versus, World 15 Orbit Outpost). */
'use strict';

/* ===== 15-4 Planet Hop Race (mode 'planethop', versus, best of 5) =====
   Gavyn's pick: "race across tiny round planets that each have their own gravity, jumping from one to the next."
   Side-on space. def.ownStep: this mode runs the whole live tick, the camera and the picture; the platformer bodies are
   hidden (the mode draws Pip and Bo in little bubble helmets).
     run     ◀ ▶ run round the planet you stand on, relative to your own up: holding ▶ always runs the same way round
             (clockwise), so it still feels right upside down.
     jump    ▲ pushes you straight out from the planet, plus your run speed along it. Each planet has its own gravity well
             (the faint dotted ring); in flight the planet whose well you are deepest in pulls you, so a good running
             jump gets caught by the next planet. In the air ◀ ▶ nudge you a little the way they point on the screen
             (toward the next planet), ▼ dives (stronger pull).
     boost   the action: a jet puff, one per jump (refilled when you land). It pushes the way you hold on the screen
             (◀ ▶ ▲ ▼ and diagonals), or forward-and-up with no direction held. On the ground it is a jet hop.
   Soft failures only: drifting outside every well for a moment, flying too long or too far brings Tow-bot, the friendly
   robot, who tows you gently back to the last planet you stood on ("Whoopsie!"). Bumping each other is a little "Bump!";
   a puffing runner bonks the other off ("Boing!"). Nobody is ever hurt.
   First to touch the rocket on the finish planet wins the round (the same tick for both is a dead heat, replayed).
   Shared camera: it pans and zooms to fit both runners and the leader's next planet (zoom 1 down to 0.5, a bit bigger
   on phones). When they can't both fit, it keeps the leader in view and an arrow at the edge shows the other runner.
   Catch-up help, always gold and announced: a runner far behind (1500 px of course) for 2.5 s gets a Comet lift from
   Tow-bot to two planets behind the leader; whoever trails in rounds gets Gold jets (two puffs per jump, a bit stronger),
   and 2+ rounds behind Gold boots too (run 8% faster). Shown on the round card and in their corner.
   Rounds: round 1 is Hop Along (plain); rounds 2-5 are four of Tiny Moons, Jelly Planets (bouncy; hold ▼ to stick),
   Spinny Planets, Moon Orbits (moving moons), Comet Shower (comets bump you) and Wormhole (a shortcut swirl over one
   planet), shuffled per match. A sudden-death replay (2 ties in a row) is a short Sudden Sprint; the tiebreak before it
   is most stars this match. A safety bell at 75 s gives a round nobody finishes to whoever is farther along.
   Every top-level name is prefixed planethop / PLANETHOP, every sound is Sfx.extra.planethop*. Rule randomness only from
   MODES.planethop.rand (the course); looks use their own planethopVR. */
const PLANETHOP = {
  R: 13,                                                // runner radius: feet to middle
  vRun: 220, accRun: 1400, fric: 1900, vMax: 320,       // running round a planet (px/s along the surface)
  jumpV: 400, jellyJump: 1.35, jumpBuf: 0.12,           // a jump pushes straight out from the planet (plus your run speed)
  airCtl: 210, dive: 1.3, vAir: 720, catchDrag: 1.0,    // in flight: ◀ ▶ nudge, ▼ dives, top speed, a new well slows you a bit
  puffV: 310, goldPuff: 1.15, puffCap: 3,               // jet puff: speed added (gold jets push harder); most puffs you can hold
  landKeep: 0.8, bounceE: 0.6, bounceMin: 150,          // landing keeps 80% of your speed along the ground; jelly bounce
  driftTow: 1.0, airTow: 4.5, farTow: 700,              // Tow-bot comes after drifting outside every well, a long flight, or far off
  bumpCD: 0.35, knockV: 330, dizzyT: 0.5,
  starR: 22, wormR: 30, rocketR: 28, rocketArc: 26, cometR: 16,
  goldRun: 1.08, liftGap: 1500, liftAfter: 2.5,         // catch-up: gold boots; a Comet lift after 2.5 s this far behind
  capT: 75,                                             // the safety bell (s after GO)
  skip: 2.2,                                            // (planning) about how many seconds skipping a planet saves
  ang: 72,                                              // (planning) launch angles tried per planet and direction
};
const PLANETHOP_TWISTS = {
  plain: { name: 'Hop Along', hint: 'Run round, jump to the next planet, first to the rocket!' },
  tiny: { name: 'Tiny Moons', hint: 'Lots of tiny moons with a strong pull: quick little hops!' },
  jelly: { name: 'Jelly Planets', hint: 'Pink jelly planets bounce you! Hold ▼ to stick.' },
  spin: { name: 'Spinny Planets', hint: 'Some planets spin and carry you round. Time your jump!' },
  moons: { name: 'Moon Orbits', hint: 'Little moons circle the planets. Ride one, or hop past!' },
  comets: { name: 'Comet Shower', hint: 'Friendly comets zoom by. A bump is a big Boing!' },
  worm: { name: 'Wormhole', hint: 'Stand on top, jump straight up into the swirl: a shortcut!' },
  sprint: { name: 'Sudden Sprint', hint: 'Two ties! A short dash to the rocket decides it.' },
};
const PLANETHOP_MIX = ['tiny', 'jelly', 'spin', 'moons', 'comets', 'worm'];
const PLANETHOP_COLS = {
  rock: [['#c3b2f0', '#8e79cc', '#e6dcff'], ['#92dccd', '#58ab9b', '#cdf5ec'], ['#f4b991', '#cd8a5d', '#ffe0c8'],
    ['#a3c8f7', '#6894d0', '#d9e9ff'], ['#eeaad0', '#c277a3', '#ffd9ee'], ['#cfe08f', '#98b05a', '#ecf6c6']],
  tiny: ['#cfc9f2', '#9a92c9', '#efecff'], jelly: ['#ff9fd0', '#e0609f', '#ffe0f0'], moon: ['#e8e4f7', '#ada4d2', '#ffffff'],
  start: ['#8fdcff', '#4b9fd3', '#dff5ff'], finish: ['#ffd98a', '#d6a03c', '#fff3d0'],
};
const PLANETHOP_TAU = Math.PI * 2;
// looks-only randomness (sparkles, smoke): never MODES.planethop.rand, so the rules' random numbers don't depend on looks
let planethopVS = 20261104;
const planethopVR = () => { planethopVS = (Math.imul(planethopVS, 1664525) + 1013904223) >>> 0; return planethopVS / 4294967296; };
const planethopHash = (a, b) => (((Math.imul(a + 7, 73856093) ^ Math.imul(b + 3, 19349663)) >>> 0) % 1000) / 1000;
const planethopWrap = a => { a %= PLANETHOP_TAU; return a > Math.PI ? a - PLANETHOP_TAU : a < -Math.PI ? a + PLANETHOP_TAU : a; };
// 1-player mode: the computer plays this runner (no key reminders for it)
const planethopCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
// phones: this mode's HUD and camera go bigger a little sooner than the shared HUD (a landscape phone is about 0.6-0.7)
const planethopBig = () => (typeof stageScale === 'number' ? stageScale < 0.72 : hudBig());
// zoomed far out on a small screen the runners would be specks: draw them up to 1.7x bigger (looks only)
const planethopRunK = cam => clamp(0.6 / (cam.z * (typeof stageScale === 'number' ? stageScale : 1)), 1, 1.7);

/* ---------- the course ---------- */
function planethopPlanet(c, o) {
  const q = Object.assign({ i: c.pl.length, ci: -1, x: 0, y: 0, r: 60, g: 900, well: 125, kind: 'rock', spin: 0, host: -1, orb: null, seed: 0, face: 0, col: 0 }, o);
  q.cx = q.x; q.cy = q.y; q.vx = 0; q.vy = 0; q.rot = 0;
  c.pl.push(q);
  return q;
}
// moons go round their planets and spinny planets turn: where everything is at round time t
function planethopMove(c, t) {
  for (const q of c.pl) {
    q.rot = q.spin * t;
    if (q.host < 0) continue;
    const h = c.pl[q.host], o = q.orb, a = o.ph + o.w * t;
    q.cx = h.cx + Math.cos(a) * o.rad; q.cy = h.cy + Math.sin(a) * o.rad;
    q.vx = -Math.sin(a) * o.rad * o.w; q.vy = Math.cos(a) * o.rad * o.w;
  }
}
// lists of planets: all of them, the ones that stay put, and (for planning) the still planets near each still planet
function planethopLists(c) {
  c.all = c.pl.map(q => q.i);
  c.stat = c.pl.filter(q => q.host < 0).map(q => q.i);
  c.near = [];
  for (const i of c.stat) { const a = c.pl[i]; c.near[i] = c.stat.filter(j => Math.hypot(c.pl[j].x - a.x, c.pl[j].y - a.y) < 1150); }
}

/* ---------- flight: shared by the race and the computer's planning ---------- */
// one flight step for body b { x, y, vx, vy, from, well, dizzy }. inp { left, right, down } or null. list: planet indices.
// Returns the index of the planet touched this step, or -1.
function planethopAir(c, b, inp, dt, list) {
  const P = PLANETHOP, pl = c.pl;
  let best = -1, bd = 0;
  for (const i of list) {
    const q = pl[i], dx = b.x - q.cx, dy = b.y - q.cy, wr = q.r + q.well, d2 = dx * dx + dy * dy;
    if (d2 >= wr * wr) continue;
    const dep = 1 - (Math.sqrt(d2) - q.r) / q.well;
    if (dep > bd) { bd = dep; best = i; }
  }
  b.well = best;
  if (best >= 0) {
    const q = pl[best], dx = q.cx - b.x, dy = q.cy - b.y, d = Math.hypot(dx, dy) || 1, nx = dx / d, ny = dy / d;
    const g = q.g * (inp && inp.down && !b.dizzy ? 1 + P.dive : 1);
    let ax = nx * g, ay = ny * g;
    // ◀ ▶ nudge the way they point on the screen (in the air, "right" is the way to the next planet, not round this one)
    if (inp && !b.dizzy) ax += ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * P.airCtl;
    b.vx += ax * dt; b.vy += ay * dt;
    if (best !== b.from) { const f = Math.exp(-P.catchDrag * dt); b.vx *= f; b.vy *= f; }
  }
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > P.vAir) { b.vx *= P.vAir / sp; b.vy *= P.vAir / sp; }
  b.x += b.vx * dt; b.y += b.vy * dt;
  for (const i of list) {
    const q = pl[i], rr = q.r + P.R, dx = b.x - q.cx, dy = b.y - q.cy;
    if (dx * dx + dy * dy <= rr * rr) return i;
  }
  return -1;
}
// the velocity of a jump from planet q at angle a with speed s along the ground (jk: jelly jumps higher)
function planethopLaunch(q, a, s, jk) {
  const P = PLANETHOP, nx = Math.cos(a), ny = Math.sin(a), sv = s + q.spin * (q.r + P.R);
  return { vx: nx * P.jumpV * jk - ny * sv + q.vx, vy: ny * P.jumpV * jk + nx * sv + q.vy };
}
// where a flight with no keys pressed ends: { land (planet index, -1 = Tow-bot), T (s), la (landing angle), worm }
// (still planets only: moons and comets are left out, like a person who plans the hop and hopes)
function planethopSim(c, x, y, vx, vy, from, maxT = 3.2) {
  const P = PLANETHOP, b = { x, y, vx, vy, from, well: -1, dizzy: 0 }, list = c.near[from] || c.stat, w = c.worm;
  let drift = 0;
  for (let t = 0; t < maxT; t += DT) {
    const hit = planethopAir(c, b, null, DT, list);
    if (w && Math.abs(b.x - w.x) < 60 && Math.hypot(b.x - w.x, b.y - w.y) < P.wormR + P.R) return { land: w.exit, T: t + 0.9, la: -Math.PI / 2, worm: true };
    if (hit >= 0) return { land: hit, T: t, la: Math.atan2(b.y - c.pl[hit].cy, b.x - c.pl[hit].cx) };
    if (b.well < 0) { if ((drift += DT) > P.driftTow) break; } else drift = 0;
  }
  return { land: -1, T: maxT, la: 0 };
}
// every launch angle from still planet i, running either way at full speed: where each one lands
function planethopTable(c, i, n = PLANETHOP.ang) {
  const P = PLANETHOP, q = c.pl[i], jk = q.kind === 'jelly' ? P.jellyJump : 1, out = { 1: [], '-1': [] }, d = q.r + P.R;
  for (const dir of [1, -1]) for (let k = 0; k < n; k++) {
    const a = k / n * PLANETHOP_TAU, v = planethopLaunch(q, a, dir * P.vRun, jk);
    const res = planethopSim(c, q.x + Math.cos(a) * d, q.y + Math.sin(a) * d, v.vx, v.vy, i);
    res.a = a; res.dir = dir; res.ci = res.land >= 0 ? c.pl[res.land].ci : -1;
    out[dir].push(res);
  }
  return out;
}
// running time from angle a0 to a1 on planet q going round in dir (with the planet's own spin)
function planethopArcT(q, a0, a1, dir) {
  const P = PLANETHOP;
  let d = ((((a1 - a0) * dir) % PLANETHOP_TAU) + PLANETHOP_TAU) % PLANETHOP_TAU;
  const w = P.vRun / (q.r + P.R) + dir * q.spin;
  return w > 0.25 ? d / w : 9;
}
// the computer's map of good jumps (worked out once per course, the first time a brain asks): every still planet's
// launch table, each launch costed as flight time + the run to the landing planet's own best jump - planets skipped
function planethopPlan(c) {
  if (c.plan) return c.plan;
  const P = PLANETHOP, tab = [], best1 = [], fin = c.byCi[c.n];
  for (const i of c.stat) if (c.pl[i].ci < c.n) tab[i] = planethopTable(c, i);
  const each = (i, f) => { for (const dir of [1, -1]) for (const e of tab[i][dir]) f(e); };
  for (const i of c.stat) {
    if (!tab[i]) continue;
    const ci = c.pl[i].ci;
    let b = null;
    each(i, e => { if (e.ci > ci) { e.c1 = e.T - P.skip * (e.ci - ci - 1); if (!b || e.c1 < b.c1) b = e; } });
    best1[i] = b;
  }
  for (const i of c.stat) {
    if (!tab[i]) continue;
    const ci = c.pl[i].ci;
    each(i, e => {
      if (e.ci <= ci) { e.cost = null; return; }
      const lq = c.pl[e.land];
      let next = 3;
      if (lq === fin) next = Math.abs(planethopWrap(c.rocketA - e.la)) * (lq.r + P.R) / P.vRun;
      else if (best1[e.land]) { const b = best1[e.land]; next = planethopArcT(lq, e.la, b.a, b.dir) + b.c1; }
      e.cost = e.T + next - P.skip * (e.ci - ci - 1);
    });
  }
  c.plan = { tab };
  return c.plan;
}

// build one round's course with the rules' random numbers
function planethopBuild(tw, R) {
  const P = PLANETHOP, c = { tw, pl: [], stars: [], comets: [], worm: null, n: 0, rocketA: -Math.PI / 2, plan: null };
  const n = tw === 'sprint' ? 8 : tw === 'tiny' ? 27 : 20;   // course planets after the start (the last one is the finish)
  let prev = planethopPlanet(c, { ci: 0, x: 0, y: 0, r: 74, g: 1000, well: 130, kind: 'start', col: 0 });
  for (let k = 1; k <= n; k++) {
    const fin = k === n;
    let kind = 'rock', r = 50 + R() * 30, g = 1000, well = 125, spin = 0;
    if (fin) { kind = 'finish'; r = 80; g = 1000; well = 130; }
    else if (tw === 'tiny') { kind = 'tiny'; r = 27 + R() * 13; g = 1250; well = 100; }
    else if (tw === 'jelly' && k % 2 === 1) { kind = 'jelly'; r = 56 + R() * 20; g = 950; }
    else if (tw === 'spin' && k % 2 === 0) spin = (R() < 0.5 ? -1 : 1) * (0.5 + R() * 0.35);
    const gap0 = tw === 'tiny' ? 85 + R() * 40 : 115 + R() * 60, seed = Math.floor(R() * 1000), face = R() < 0.6 ? 1 + Math.floor(R() * 3) : 0, col = Math.floor(R() * 6);
    let placed = null;
    for (let at = 0; at < 14 && !placed; at++) {
      const gap = Math.max(50, gap0 - Math.floor(at / 2) * 16);
      const th = clamp((R() - 0.5) * 1.5 - prev.y / 650, -0.8, 0.8);
      const d = prev.r + r + gap, x = prev.x + Math.cos(th) * d, y = prev.y + Math.sin(th) * d;
      // clear of every earlier planet, not just the last one
      if (c.pl.some(q => q !== prev && Math.hypot(q.x - x, q.y - y) < q.r + r + 130)) continue;
      const q = planethopPlanet(c, { ci: k, x, y, r, g, well, kind, spin, seed, face, col });
      // can a running jump from the last planet get here?
      planethopLists(c);
      const tb = planethopTable(c, prev.i, 30);
      if (tb[1].some(e => e.ci >= k) || tb[-1].some(e => e.ci >= k)) placed = q;
      else c.pl.pop();
    }
    if (!placed) placed = planethopPlanet(c, { ci: k, x: prev.x + prev.r + r + 60, y: prev.y, r, g, well, kind, spin, seed, face, col });
    prev = placed;
  }
  c.n = n;
  c.byCi = [];
  for (const q of c.pl) c.byCi[q.ci] = q;
  c.cum = [0];
  for (let k = 1; k <= n; k++) c.cum[k] = c.cum[k - 1] + Math.hypot(c.byCi[k].x - c.byCi[k - 1].x, c.byCi[k].y - c.byCi[k - 1].y);
  const clearOf = (x, y, pad, skip) => c.pl.every(q => q === skip || Math.hypot(q.x - x, q.y - y) > q.r + pad);
  // Moon Orbits: every other planet has a little moon going round it (never through a neighbour)
  if (tw === 'moons') for (let k = 2; k < n; k += 2) {
    const h = c.byCi[k], mr = 17 + R() * 5, rad = h.r + 66 + R() * 14, w = (R() < 0.5 ? -1 : 1) * (0.7 + R() * 0.3), ph = R() * PLANETHOP_TAU;
    const ok = c.byCi.every(q => q === h || Math.hypot(q.x - h.x, q.y - h.y) - q.r - rad - mr > 34);
    if (ok) planethopPlanet(c, { ci: h.ci, host: h.i, r: mr, g: 1000, well: 62, kind: 'moon', orb: { rad, w, ph }, seed: Math.floor(R() * 1000), col: 0 });
  }
  // Wormhole: a swirl over one planet near the middle; it pops you out over the planet three further on
  if (tw === 'worm') for (let k = Math.floor(n / 2) - 1; k <= n - 4 && !c.worm; k++) {
    const q = c.byCi[k], e = c.byCi[k + 3], wx = q.x, wy = q.y - (q.r + 112), ex = e.x, ey = e.y - (e.r + 64);
    if (clearOf(wx, wy, 80, q) && clearOf(ex, ey, 46, e)) c.worm = { x: wx, y: wy, ex, ey, exit: e.i, from: q.i };
  }
  // stars: a few in the gaps, a little above the straight line (each gives an extra jet puff)
  for (let k = 1; k < n - 1; k += 3) {
    const A = c.byCi[k], B = c.byCi[k + 1], dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy);
    let ux = -dy / L, uy = dx / L; if (uy > 0) { ux = -ux; uy = -uy; }
    const m = (A.r + (L - A.r - B.r) / 2) / L, off = 50 + R() * 40, sx = A.x + dx * m + ux * off, sy = A.y + dy * m + uy * off;
    if (clearOf(sx, sy, 34)) c.stars.push({ x: sx, y: sy, taken: -1, ph: R() * 6.28 });
  }
  // Comet Shower: friendly comets cross the course on fixed paths, again and again
  if (tw === 'comets') for (let k = 0; k < 7; k++) {
    const ci = 1 + Math.floor((n - 2) * (k + 0.5) / 7), A = c.byCi[ci], B = c.byCi[ci + 1];
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, ph = (R() < 0.5 ? -1 : 1) * (0.9 + R() * 0.5) + (R() < 0.5 ? 0 : Math.PI);
    const ux = Math.cos(ph), uy = Math.sin(ph), L = 1000, sp = 170 + R() * 60, per = L / sp + 1.6 + R() * 1.6;
    c.comets.push({ x0: mx - ux * L / 2, y0: my - uy * L / 2, vx: ux * sp, vy: uy * sp, dur: L / sp, per, t0: R() * per });
  }
  planethopLists(c);
  planethopMove(c, 0);
  return c;
}
// a comet's place at time t (null while it is between passes)
function planethopComet(cm, t) {
  const k = ((t + cm.t0) % cm.per + cm.per) % cm.per;
  if (k > cm.dur) return null;
  return { x: cm.x0 + cm.vx * k, y: cm.y0 + cm.vy * k, k };
}
// how far along the course a spot is (px along the line through the planets' middles)
function planethopProgAt(c, x, y) {
  let best = 1e18, out = 0;
  for (let k = 0; k < c.n; k++) {
    const A = c.byCi[k], B = c.byCi[k + 1], dx = B.x - A.x, dy = B.y - A.y, L2 = dx * dx + dy * dy;
    const u = clamp(((x - A.x) * dx + (y - A.y) * dy) / L2, 0, 1), px = A.x + dx * u - x, py = A.y + dy * u - y, d2 = px * px + py * py;
    if (d2 < best) { best = d2; out = c.cum[k] + Math.sqrt(L2) * u; }
  }
  return out;
}

/* ---------- the runners ---------- */
function planethopMakeRunner(k, c) {
  const P = PLANETHOP, q = c.byCi[0];
  const r = { id: k, mode: 'ground', pi: q.i, a: -Math.PI / 2, s: 0, x: 0, y: 0, vx: 0, vy: 0, face: 1, from: q.i, well: -1,
    puffs: 1, puffMax: 1, puffK: 1, runK: 1, puffT: 0, puffAng: 0, airT: 0, driftT: 0, jumpBuf: 0, dizzy: 0, bumpCD: 0, cometCD: 0,
    lastPi: q.i, reach: 0, prog: 0, farT: 0, tow: null, finT: null, nopeT: 0, gold: 0,
    // looks only (never read by the rules)
    vu: -Math.PI / 2, step: 0, sq: 0, pop: '', popT: 9, popCol: '#fff', hidden: false };
  planethopPlace(c, r);
  return r;
}
function planethopPlace(c, r) {
  const q = c.pl[r.pi], d = q.r + PLANETHOP.R;
  r.x = q.cx + Math.cos(r.a) * d; r.y = q.cy + Math.sin(r.a) * d;
}
function planethopPop(r, text, col) { r.pop = text; r.popCol = col || '#ffffff'; r.popT = 0; }
// the keys as this mode reads them (▲ is jump on a keyboard and touch, A or the stick on a controller)
function planethopInput(p) {
  const i = p.input;
  return { left: !!i.left && !i.right, right: !!i.right && !i.left, up: !!(i.up || i.jump), down: !!i.down };
}
function planethopGround(c, r, inp, dt) {
  const P = PLANETHOP, q = c.pl[r.pi];
  const want = inp ? ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * P.vRun * r.runK : 0;
  const acc = !want ? P.fric : Math.sign(want) !== Math.sign(r.s) && r.s !== 0 ? P.accRun + P.fric : P.accRun;
  r.s = approach(r.s, want, acc * dt);
  if (want) r.face = Math.sign(want);
  r.a = planethopWrap(r.a + (r.s / (q.r + P.R) + q.spin) * dt);
  planethopPlace(c, r);
  r.step += Math.abs(r.s) * dt;
}
function planethopJump(st, r, live) {
  const P = PLANETHOP, c = st.c, q = c.pl[r.pi], v = planethopLaunch(q, r.a, r.s, q.kind === 'jelly' ? P.jellyJump : 1);
  r.mode = 'air'; r.vx = v.vx; r.vy = v.vy; r.from = q.i; r.airT = 0; r.driftT = 0; r.jumpBuf = 0;
  r.x += Math.cos(r.a) * 0.5; r.y += Math.sin(r.a) * 0.5;
  r.sq = -0.35;
  if (live) st.stat.jumps[r.id]++;
  Sfx.play(q.kind === 'jelly' ? 'planethopJelly' : 'planethopJump', r.id);
  planethopDust(st, r.x - Math.cos(r.a) * 12, r.y - Math.sin(r.a) * 12, 4, q);
}
// the jet puff: the way you hold on the screen (like the air nudge), or forward-and-up with nothing held
function planethopPuff(st, r, inp, live) {
  const P = PLANETHOP, c = st.c;
  if (r.puffs <= 0) { if (r.nopeT <= 0) { r.nopeT = 0.5; Sfx.play('planethopNope', r.id); planethopPop(r, 'No puff left!', '#d9d3ef'); } return; }
  if (r.mode === 'ground') planethopJump(st, r, live); // a jet hop: jump, then puff
  const q = c.pl[r.well >= 0 ? r.well : r.from], dx = r.x - q.cx;
  const ku = inp ? (inp.up ? 1 : 0) - (inp.down ? 1 : 0) : 0, kr = inp ? (inp.right ? 1 : 0) - (inp.left ? 1 : 0) : 0;
  // (bot tests: holding ▶ toward the next planet saves a short jump about 3 times as often this way as "clockwise")
  let ux = kr, uy = -ku;
  if (!ku && !kr) { ux = Math.sign(r.vx) || (dx >= 0 ? 1 : -1); uy = -0.6; }
  const L = Math.hypot(ux, uy) || 1, V = P.puffV * r.puffK;
  ux /= L; uy /= L;
  r.vx += ux * V; r.vy += uy * V;
  const sp = Math.hypot(r.vx, r.vy); if (sp > P.vAir) { r.vx *= P.vAir / sp; r.vy *= P.vAir / sp; }
  r.puffs--; r.puffT = 0.35; r.puffAng = Math.atan2(uy, ux); r.driftT = 0; r.airT = Math.max(0, r.airT - 0.6);
  if (live) st.stat.puffs[r.id]++;
  Sfx.play('planethopPuff', r.id); rumble(r.id, 0.15, 0.35, 90);
  for (let k = 0; k < 9; k++) {
    const a = r.puffAng + Math.PI + (planethopVR() - 0.5) * 0.9, s = 90 + planethopVR() * 140;
    planethopFx(st, r.x - ux * 12, r.y - uy * 12, Math.cos(a) * s, Math.sin(a) * s, 0.45, k % 3 ? 'rgba(255,255,255,0.9)' : (r.puffK > 1 ? C.gold : '#ffb36b'), 4 + planethopVR() * 3, 0, 'smoke');
  }
}
function planethopLand(st, r, i, inp, live) {
  const P = PLANETHOP, c = st.c, q = c.pl[i];
  const dx = r.x - q.cx, dy = r.y - q.cy, d = Math.hypot(dx, dy) || 1, nx = dx / d, ny = dy / d, tx = -ny, ty = nx;
  const sv = q.spin * (q.r + P.R), rvx = r.vx - q.vx - tx * sv, rvy = r.vy - q.vy - ty * sv;
  const vn = rvx * nx + rvy * ny, vt = rvx * tx + rvy * ty;
  r.x = q.cx + nx * (q.r + P.R); r.y = q.cy + ny * (q.r + P.R);
  r.puffs = Math.max(r.puffs, r.puffMax);
  // jelly: boing back up (hold ▼ to stick; a jump pressed just before is a big jelly jump)
  if (q.kind === 'jelly' && !(inp && inp.down) && r.jumpBuf <= 0 && -vn > P.bounceMin) {
    const e = P.bounceE, bx = rvx - (1 + e) * vn * nx, by = rvy - (1 + e) * vn * ny;
    r.vx = bx + q.vx + tx * sv; r.vy = by + q.vy + ty * sv; r.x += nx; r.y += ny;
    r.from = i; r.airT = 0; r.driftT = 0; r.lastPi = i; r.sq = 0.45;
    if (q.ci > r.reach) { r.reach = q.ci; if (live) st.stat.hops[r.id]++; }
    if (live) st.stat.boings[r.id]++;
    planethopPop(r, 'Boing!', '#ffc2e2'); Sfx.play('planethopBoing', r.id);
    q.wob = 0.5;
    return;
  }
  r.mode = 'ground'; r.pi = i; r.a = Math.atan2(ny, nx); r.s = clamp(vt * P.landKeep, -P.vMax, P.vMax);
  r.lastPi = q.host >= 0 ? q.host : i; r.airT = 0; r.driftT = 0;
  if (r.s) r.face = Math.sign(r.s);
  if (q.ci > r.reach) { r.reach = q.ci; if (live) st.stat.hops[r.id]++; }
  r.sq = clamp(-vn / 900, 0.15, 0.45);
  if (q.kind === 'jelly') q.wob = 0.35;
  Sfx.play('planethopLand', r.id);
  planethopDust(st, r.x - nx * 12, r.y - ny * 12, 5, q);
}
// a knock (a comet, or a puffing runner): off the ground and away, a little dizzy
function planethopKnock(st, r, ux, uy, sp) {
  const P = PLANETHOP, c = st.c;
  if (r.mode === 'ground') {
    const q = c.pl[r.pi], nx = Math.cos(r.a), ny = Math.sin(r.a);
    r.mode = 'air'; r.from = q.i; r.airT = 0; r.driftT = 0;
    r.vx = q.vx + nx * 230 + ux * sp * 0.6; r.vy = q.vy + ny * 230 + uy * sp * 0.6;
    r.x += nx; r.y += ny;
  } else { r.vx += ux * sp; r.vy += uy * sp; }
  r.dizzy = P.dizzyT;
}
// Tow-bot: a gentle tow back to the last planet you stood on ('tow'), or the gold Comet lift forward ('lift')
function planethopTowStart(st, r, kind, live, target) {
  const P = PLANETHOP, c = st.c, pi = target != null ? target : r.lastPi, q = c.pl[pi];
  const a = -Math.PI / 2, d = q.r + P.R, tx = q.cx + Math.cos(a) * d, ty = q.cy + Math.sin(a) * d;
  r.mode = 'tow'; r.tow = { kind, t: 0, x0: r.x, y0: r.y, pi, a, T: clamp(0.8 + Math.hypot(tx - r.x, ty - r.y) / 1400, 0.9, 1.8) };
  r.vx = r.vy = 0; r.s = 0; r.dizzy = 0; r.farT = 0;
  if (live) { if (kind === 'lift') st.stat.lifts[r.id]++; else st.stat.tows[r.id]++; }
  if (kind === 'lift') { planethopPop(r, 'Comet lift!', C.gold); Sfx.play('planethopLift', r.id); st.liftSay = { id: r.id, t: 0 }; }
  else {
    planethopPop(r, 'Whoopsie!', '#ffe6a8'); Sfx.play('planethopTow', r.id);
    // a hint for a person (never the computer): the first tows of the match
    if (live && !planethopCpu(r.id)) { const n = ++st.towN[r.id]; if (n === 1 || n === 3) st.hint[r.id] = { n, t: 0 }; }
  }
}
function planethopTowStep(st, r, dt) {
  const P = PLANETHOP, w = r.tow, q = st.c.pl[w.pi];
  w.t += dt;
  const k = clamp(w.t / w.T, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, d = q.r + P.R;
  const tx = q.cx + Math.cos(w.a) * d, ty = q.cy + Math.sin(w.a) * d;
  r.x = w.x0 + (tx - w.x0) * e; r.y = w.y0 + (ty - w.y0) * e - Math.sin(k * Math.PI) * 70;
  if (k >= 1) {
    r.mode = 'ground'; r.pi = w.pi; r.a = w.a; r.s = 0; r.lastPi = w.pi; r.tow = null; r.airT = 0; r.driftT = 0;
    r.puffs = Math.max(r.puffs, r.puffMax);
    if (q.ci > r.reach) r.reach = q.ci;
    planethopPlace(st.c, r);
    Sfx.play('planethopLand', r.id);
  }
}
// where the rocket stands: its foot on the finish planet and the middle of its body
function planethopRocket(c) {
  const F = c.byCi[c.n], a = c.rocketA;
  return { a, fx: F.cx + Math.cos(a) * F.r, fy: F.cy + Math.sin(a) * F.r, x: F.cx + Math.cos(a) * (F.r + 30), y: F.cy + Math.sin(a) * (F.r + 30), F };
}

// one runner for one tick. inp: the keys, or null (no keys: the end-of-round banner)
function planethopRunner(st, r, inp, dt, live) {
  const P = PLANETHOP, c = st.c, p = G.players[r.id];
  r.dizzy = Math.max(0, r.dizzy - dt); r.bumpCD = Math.max(0, r.bumpCD - dt); r.cometCD = Math.max(0, r.cometCD - dt);
  r.puffT = Math.max(0, r.puffT - dt); r.jumpBuf = Math.max(0, r.jumpBuf - dt); r.nopeT -= dt;
  if (r.mode === 'fin') return;
  if (r.mode === 'tow') { planethopTowStep(st, r, dt); return; }
  const jumpP = !!(inp && p.pendingJump), actP = !!(inp && p.pendingAct);
  if (jumpP) r.jumpBuf = P.jumpBuf;
  const keys = r.dizzy > 0 ? null : inp;
  if (r.mode === 'ground') {
    planethopGround(c, r, keys, dt);
    if (r.jumpBuf > 0 && r.dizzy <= 0) planethopJump(st, r, live);
    else if (actP && r.dizzy <= 0) planethopPuff(st, r, inp, live);
  } else {
    r.airT += dt;
    if (actP && r.dizzy <= 0) planethopPuff(st, r, inp, live);
    const hit = planethopAir(c, r, keys, dt, c.all);
    if (r.well < 0) r.driftT += dt; else r.driftT = 0;
    if (hit >= 0) planethopLand(st, r, hit, keys, live);
    else {
      let far = r.driftT > 0.3;
      if (far) { far = false; for (const i of c.stat) { const q = c.pl[i]; if (Math.hypot(r.x - q.cx, r.y - q.cy) - q.r < P.farTow) { far = true; break; } } far = !far; }
      if (r.driftT > P.driftTow || r.airT > P.airTow || far) { planethopTowStart(st, r, 'tow', live); return; }
    }
  }
  // stars: an extra jet puff (first come)
  for (const s of c.stars) {
    if (s.taken >= 0 || Math.abs(s.x - r.x) > 40) continue;
    if (Math.hypot(s.x - r.x, s.y - r.y) > P.starR + P.R) continue;
    s.taken = r.id; s.t = 0; r.puffs = Math.min(P.puffCap, r.puffs + 1);
    if (live) st.stat.stars[r.id]++;
    planethopPop(r, 'Star! +1 puff', C.gold); Sfx.play('planethopStar', r.id);
    for (let k = 0; k < 12; k++) { const a = planethopVR() * 6.28, sp = 50 + planethopVR() * 130; planethopFx(st, s.x, s.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.6, k % 3 ? C.gold : '#ffffff', 3.5, 0, 'spark'); }
  }
  // the wormhole: in it, out over the planet three further on
  const w = c.worm;
  if (w && r.mode === 'air' && Math.abs(r.x - w.x) < 60 && Math.hypot(r.x - w.x, r.y - w.y) < P.wormR + P.R) {
    for (let k = 0; k < 14; k++) { const a = k / 14 * 6.28; planethopFx(st, w.x, w.y, Math.cos(a) * 120, Math.sin(a) * 120, 0.5, k % 2 ? '#b98cff' : '#7ff0e0', 3, 0, 'spark'); }
    const e = c.pl[w.exit];
    r.x = w.ex; r.y = w.ey; r.vx = 0; r.vy = 90; r.from = e.i; r.airT = 0; r.driftT = 0; r.lastPi = e.i; r.puffs = Math.max(r.puffs, r.puffMax);
    if (live) st.stat.worms[r.id]++;
    planethopPop(r, 'Wheee!', '#b9f5ff'); Sfx.play('planethopWorm', r.id);
    st.vis.warps.push({ x: w.ex, y: w.ey, t: 0 });
  }
  // comets: a bump is a big soft Boing
  for (const cm of c.comets) {
    if (r.cometCD > 0) break;
    const q = planethopComet(cm, st.t);
    if (!q || Math.hypot(q.x - r.x, q.y - r.y) > P.cometR + P.R) continue;
    const sp = Math.hypot(cm.vx, cm.vy), dx = r.x - q.x, dy = r.y - q.y, d = Math.hypot(dx, dy) || 1;
    planethopKnock(st, r, dx / d * 0.6 + cm.vx / sp * 0.7, dy / d * 0.6 + cm.vy / sp * 0.7, P.knockV);
    r.cometCD = 1.2;
    if (live) st.stat.comets[r.id]++;
    planethopPop(r, 'Boing!', '#bfe8ff'); Sfx.play('planethopComet', r.id); rumble(r.id, 0.3, 0.5, 120);
    for (let k = 0; k < 6; k++) planethopFx(st, r.x, r.y, (planethopVR() - 0.5) * 140, (planethopVR() - 0.5) * 140, 0.5, '#bfe8ff', 3, 0, 'spark');
  }
  // the rocket: touch it to win
  const rk = planethopRocket(c);
  const atRocket = r.mode === 'ground' ? r.pi === rk.F.i && Math.abs(planethopWrap(r.a - rk.a)) * (rk.F.r + P.R) < P.rocketArc
    : Math.hypot(r.x - rk.x, r.y - rk.y) < P.rocketR + P.R;
  if (atRocket) { r.mode = 'fin'; r.finT = st.t; r.finNow = live; r.vx = r.vy = 0; }
}

// the two runners bump: pushed apart; a puffing runner bonks the other off
function planethopBump(st, live) {
  const P = PLANETHOP, [A, B] = st.run;
  if (A.mode === 'tow' || B.mode === 'tow' || A.mode === 'fin' || B.mode === 'fin') return;
  const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), min = 2 * P.R;
  if (st.ghost) { if (d > min + 6) st.ghost = false; return; }   // they start on the same spot
  if (d >= min) return;
  const nx = d > 1e-3 ? dx / d : (G.tickN & 1 ? 1 : -1), ny = d > 1e-3 ? dy / d : 0, over = min - d;
  for (const [r, sg] of [[A, -1], [B, 1]]) {
    if (r.mode === 'ground') {
      const q = st.c.pl[r.pi], tx = -Math.sin(r.a), ty = Math.cos(r.a), along = (nx * tx + ny * ty) * sg * over / 2;
      r.a = planethopWrap(r.a + along / (q.r + P.R)); planethopPlace(st.c, r);
    } else { r.x += nx * sg * over / 2; r.y += ny * sg * over / 2; }
  }
  if (A.bumpCD > 0 || B.bumpCD > 0) return;
  A.bumpCD = B.bumpCD = P.bumpCD;
  const pa = A.puffT > 0, pb = B.puffT > 0, mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
  if (pa !== pb) {
    const hitter = pa ? A : B, hit = pa ? B : A, s = pa ? 1 : -1;
    planethopKnock(st, hit, nx * s, ny * s, P.knockV);
    planethopPop(hit, 'Boing!', '#ffe6a8');
    st.vis.words.push({ x: mx, y: my, text: 'BONK!', t: 0, col: C.gold });
    if (live) st.stat.bonks[hitter.id]++;
  } else {
    // equal runners: the speeds along the line between them swap (air), or both stop short (ground)
    for (const [r, sg] of [[A, -1], [B, 1]]) {
      if (r.mode === 'ground') r.s = r.s * 0.3 + sg * 50 * Math.sign((nx * -Math.sin(r.a) + ny * Math.cos(r.a)) || 1);
    }
    if (A.mode === 'air' && B.mode === 'air') {
      const va = A.vx * nx + A.vy * ny, vb = B.vx * nx + B.vy * ny;
      if (va > vb) { A.vx += (vb - va) * nx; A.vy += (vb - va) * ny; B.vx += (va - vb) * nx; B.vy += (va - vb) * ny; }
    }
    st.vis.words.push({ x: mx, y: my, text: 'Bump!', t: 0, col: '#ffffff' });
  }
  if (live) st.stat.bumps++;
  Sfx.play('planethopBump'); rumble(0, 0.15, 0.3, 60); rumble(1, 0.15, 0.3, 60);
}
// catch-up: far behind for a while brings a gold Comet lift to two planets behind the leader
function planethopCatchup(st, dt) {
  const P = PLANETHOP, c = st.c, [A, B] = st.run;
  for (const r of st.run) {
    const o = r === A ? B : A;
    const behind = !st.sd && r.mode !== 'fin' && r.mode !== 'tow' && o.mode !== 'fin' && o.prog - r.prog > P.liftGap;
    r.farT = behind ? r.farT + dt : 0;
    if (r.farT < P.liftAfter) continue;
    r.farT = 0;
    const oci = o.mode === 'ground' ? c.pl[o.pi].ci : o.reach, tci = Math.min(c.n - 1, oci - 2);
    if (tci > r.reach) planethopTowStart(st, r, 'lift', true, c.byCi[tci].i);
  }
}
function planethopRunnerProg(c, r) {
  if (r.mode === 'fin') return c.cum[c.n] + 200;
  return planethopProgAt(c, r.x, r.y);
}
// the shared camera: fits both runners and the leader's next planet; too far apart, it keeps the leader in view
// pre: before GO, the runners stand left of the middle so the round banner and the 3-2-1 don't cover them
function planethopCamera(st, dt, snap, pre) {
  const c = st.c, cam = st.cam, big = planethopBig(), [A, B] = st.run;
  const zMin = big ? 0.58 : 0.5, zMax = big ? 1.12 : 1;
  const lead = A.prog >= B.prog ? A : B, lci = lead.mode === 'ground' ? c.pl[lead.pi].ci : lead.reach;
  const nq = c.byCi[Math.min(c.n, lci + 1)];
  let x0 = Math.min(A.x, B.x, nq.cx - nq.r * 0.7) - 30, x1 = Math.max(A.x, B.x, nq.cx + nq.r * 0.7) + 30;
  let y0 = Math.min(A.y, B.y, nq.cy - nq.r * 0.7) - 40, y1 = Math.max(A.y, B.y, nq.cy + nq.r * 0.7) + 30;
  const mx = big ? 70 : 110, top = big ? 96 : 80, bot = big ? 74 : 62;
  const z = clamp(Math.min((W - 2 * mx) / (x1 - x0), (H - top - bot) / (y1 - y0)), zMin, zMax);
  let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 - ((top + H - bot) / 2 - H / 2) / z;
  // keep the leader on screen
  const hx = (W / 2 - mx) / z, hyT = (H / 2 - top) / z, hyB = (H / 2 - bot) / z;
  cx = clamp(cx, lead.x - hx, lead.x + hx); cy = clamp(cy, lead.y - hyB, lead.y + hyT);
  if (pre) cx = (A.x + B.x) / 2 + (W / 2 - W * 0.22) / z;
  if (snap || cam.z == null) { cam.x = cx; cam.y = cy; cam.z = z; return; }
  const kp = 1 - Math.exp(-dt * 3.2), kz = 1 - Math.exp(-dt * 2);
  cam.x += (cx - cam.x) * kp; cam.y += (cy - cam.y) * kp; cam.z += (z - cam.z) * kz;
}
const planethopToScreen = (cam, x, y) => ({ x: (x - cam.x) * cam.z + W / 2, y: (y - cam.y) * cam.z + H / 2 });

/* ---------- looks: effects that never touch the rules ---------- */
function planethopFx(st, x, y, vx, vy, life, col, size, grav, kind) {
  const v = st.vis; if (!v) return;
  v.fx.push({ x, y, vx, vy, life, max: life, col, size, grav, kind: kind || 'dot' });
  if (v.fx.length > 400) v.fx.splice(0, v.fx.length - 400);
}
function planethopDust(st, x, y, n, q) {
  const col = q.kind === 'jelly' ? 'rgba(255,190,225,0.9)' : 'rgba(230,224,250,0.85)';
  for (let k = 0; k < n; k++) planethopFx(st, x, y, (planethopVR() - 0.5) * 120, (planethopVR() - 0.5) * 120, 0.35, col, 2.5 + planethopVR() * 2.5, 0, 'dot');
}
function planethopVisNew() { return { fx: [], words: [], warps: [], trailT: 0 }; }
function planethopVisTick(st, dt) {
  const v = st.vis; if (!v) return;
  // (kept in place: no new arrays every tick)
  const fr = Math.exp(-1.5 * dt);
  let n = 0;
  for (const q of v.fx) { q.life -= dt; q.vx *= fr; q.vy *= fr; q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.life > 0) v.fx[n++] = q; }
  v.fx.length = n; n = 0;
  for (const w of v.words) { w.t += dt; if (w.t < 0.8) v.words[n++] = w; }
  v.words.length = n; n = 0;
  for (const w of v.warps) { w.t += dt; if (w.t < 0.6) v.warps[n++] = w; }
  v.warps.length = n;
  for (const q of st.c.pl) if (q.wob > 0) q.wob = Math.max(0, q.wob - dt);
  for (const s of st.c.stars) if (s.taken >= 0) s.t = (s.t || 0) + dt;
  for (const r of st.run) {
    r.popT += dt;
    r.sq *= Math.exp(-dt * 9);
    // which way is up for the picture: out from the planet you stand on, or the one pulling you
    let want = r.vu;
    if (r.mode === 'ground') want = r.a;
    else if (r.mode === 'tow' || r.mode === 'fin') want = -Math.PI / 2;
    else { const q = st.c.pl[r.well >= 0 ? r.well : r.from]; if (q) want = Math.atan2(r.y - q.cy, r.x - q.cx); }
    r.vu += planethopWrap(want - r.vu) * Math.min(1, dt * (r.mode === 'ground' ? 20 : 8));
    if (r.mode === 'air' && Math.abs(r.vx) + Math.abs(r.vy) > 1) {
      // facing: the way you are going round the planet pulling you
      const tx = -Math.sin(r.vu), ty = Math.cos(r.vu), along = r.vx * tx + r.vy * ty;
      if (Math.abs(along) > 40 && !(G.players[r.id].input.left || G.players[r.id].input.right)) r.face = Math.sign(along);
    }
    // gold sparkles while lifted, a trail of the jet puff
    if (r.mode === 'tow' && r.tow && r.tow.kind === 'lift' && planethopVR() < dt * 30) planethopFx(st, r.x + (planethopVR() - 0.5) * 20, r.y + (planethopVR() - 0.5) * 20, 0, 30, 0.6, C.gold, 3, 0, 'spark');
  }
  if (st.liftSay) { st.liftSay.t += dt; if (st.liftSay.t > 3) st.liftSay = null; }
  for (const k of [0, 1]) if (st.hint[k]) { st.hint[k].t += dt; if (st.hint[k].t > 4.5) st.hint[k] = null; }
  if (st.cele) st.cele.t += dt;
}

/* ---------- the tick ---------- */
// live = the round is live; false during the round-end banner (everyone floats on, no keys, no rules)
function planethopTick(dt, live) {
  const st = G.mst, c = st.c;
  st.t += dt;
  planethopMove(c, st.t);
  // in versus, who moves first alternates every tick so neither runner wins every bump
  const order = G.tickN & 1 ? [st.run[1], st.run[0]] : st.run;
  for (const r of order) { r.finNow = false; planethopRunner(st, r, live ? planethopInput(G.players[r.id]) : null, dt, live); }
  for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
  planethopBump(st, live);
  for (const r of st.run) r.prog = planethopRunnerProg(c, r);
  if (live) planethopCatchup(st, dt);
  planethopCamera(st, dt, false);
  planethopVisTick(st, dt);
  if (!live) return;
  const done = st.run.filter(r => r.finNow);
  if (done.length) {
    if (done.length === 2) { matchRoundEnd(-1, 'Both at the rocket: a dead heat!'); return; }
    const w = done[0], l = st.run[1 - w.id], rt = st.t - st.t0;
    if (st.stat.best[w.id] == null || rt < st.stat.best[w.id]) { st.stat.best[w.id] = rt; st.stat.bestTw[w.id] = st.twist; }
    const lci = l.mode === 'ground' ? c.pl[l.pi].ci : l.reach, left = c.n - lci;
    const why = left <= 0 ? 'Rocket first, by a whisker!' : left === 1 ? 'Rocket first, one planet ahead!' : 'Rocket first, ' + left + ' planets ahead!';
    if (left <= 0) st.stat.whiskers++;
    if (matchRoundEnd(w.id, why)) { st.cele = { id: w.id, t: 0 }; w.hidden = true; Sfx.play('planethopRocket'); }
    return;
  }
  // the safety bell: a round that somehow runs this long goes to whoever is farther along
  if (st.t - st.t0 > PLANETHOP.capT) {
    const [A, B] = st.run;
    const tie = Math.abs(A.prog - B.prog) < 2;
    matchRoundEnd(tie ? -1 : A.prog > B.prog ? 0 : 1, tie ? 'Neck and neck at the bell!' : 'Farther along at the bell!');
  }
}

MODES.planethop = {
  rand: Math.random,
  setup(st, L) {
    for (const row of L.grid) row.fill('.');
    st.stat = { jumps: [0, 0], hops: [0, 0], puffs: [0, 0], stars: [0, 0], tows: [0, 0], lifts: [0, 0], worms: [0, 0], boings: [0, 0],
      comets: [0, 0], bonks: [0, 0], best: [null, null], bestTw: [null, null], bumps: 0, whiskers: 0 };
    const mix = PLANETHOP_MIX.slice();
    for (let i = mix.length - 1; i > 0; i--) { const j = Math.floor(this.rand() * (i + 1)); [mix[i], mix[j]] = [mix[j], mix[i]]; }
    st.order = ['plain', ...mix.slice(0, 4)];
    st.forceTwist = this.testTwist || null;
    st.towN = [0, 0];
    st.vis = planethopVisNew();
  },
  resetRound(n, info) {
    const st = G.mst, m = G.match;
    st.sd = !!info.suddenDeath;
    st.twist = info.suddenDeath ? 'sprint' : (st.forceTwist || st.order[Math.min(n, st.order.length) - 1]);
    st.c = planethopBuild(st.twist, () => this.rand());
    st.run = [0, 1].map(k => planethopMakeRunner(k, st.c));
    st.t = 0; st.t0 = 0; st.cele = null; st.ghost = true; st.goldSaid = false; st.liftSay = null; st.hint = [null, null];
    st.vis = planethopVisNew();
    st.cam = { x: 0, y: 0, z: null };
    // whoever trails in rounds gets gold jets (2 puffs a jump, a bit stronger); 2+ behind also gold boots (run faster)
    for (const r of st.run) {
      const behind = r.id === 0 ? m.wins[1] - m.wins[0] : m.wins[0] - m.wins[1];
      r.gold = Math.max(0, behind);
      if (r.gold >= 1) { r.puffMax = 2; r.puffs = 2; r.puffK = PLANETHOP.goldPuff; }
      if (r.gold >= 2) r.runK = PLANETHOP.goldRun;
    }
    for (const r of st.run) r.prog = planethopRunnerProg(st.c, r);
    planethopCamera(st, 0, true, true);
    // the runners are the players: hide the platformer bodies every round (matchResetPlayers revives them)
    for (const p of G.players) Object.assign(p, { alive: false, respawnT: Infinity });
    G.particles.length = 0; // (and the puff it makes where those hidden bodies stand)
  },
  go() {
    const st = G.mst; st.t0 = st.t;
    Sfx.play('planethopGo');
    for (const r of st.run) if (r.gold) planethopPop(r, r.gold >= 2 ? 'Gold jets + boots!' : 'Gold jets!', C.gold);
  },
  step(dt) { planethopTick(dt, true); },
  idle(dt) {
    const st = G.mst, m = G.match; if (!st.run) return;
    for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
    if (m.phase === 'end') {
      if (m.end && m.end.winner >= 0 && !st.cele) { st.cele = { id: m.end.winner, t: 0 }; st.run[m.end.winner].hidden = true; }
      planethopTick(dt, false); return;
    }
    // before GO: standing at the start, moons go round, the camera waits
    st.t += dt;
    planethopMove(st.c, st.t);
    for (const r of st.run) planethopPlace(st.c, r);
    planethopVisTick(st, dt);
    planethopCamera(st, dt, true, true);
    if (m.phase === 'count' && !st.goldSaid) { st.goldSaid = true; if (st.run.some(r => r.gold)) Sfx.play('planethopGold'); }
  },
  tiebreak() {
    const s = G.mst.stat.stars; if (s[0] === s[1]) return -1;
    return { winner: s[0] > s[1] ? 0 : 1, reason: 'Most stars this match!' };
  },
  draw() { planethopDrawWorld(); },
  drawTop() { planethopDrawTop(); },
  hud() { planethopHud(); },
  stats() {
    const s = G.mst.stat, f = t => (t == null ? '–' : t.toFixed(1));
    const out = [
      { label: 'Planets hopped', values: s.hops.slice() },
      { label: 'Jet puffs', values: s.puffs.slice() },
      { label: 'Stars', values: s.stars.slice() },
      { label: 'Tow-bot rides', values: [s.tows[0] + s.lifts[0], s.tows[1] + s.lifts[1]] },
    ];
    const fast = s.best[0] == null && s.best[1] == null ? null : s.best[1] == null || (s.best[0] != null && s.best[0] <= s.best[1]) ? 0 : 1;
    if (fast != null) out.push('Fastest race: ' + NAMES[fast] + ', ' + f(s.best[fast]) + ' s (' + PLANETHOP_TWISTS[s.bestTw[fast]].name + ').' + (s.whiskers ? ' Won by a whisker: ' + s.whiskers + '!' : ''));
    const wm = s.worms[0] + s.worms[1], bk = s.bonks[0] + s.bonks[1];
    if (wm > 0) out.push('Wormhole shortcuts: ' + wm + '. Wheee!');
    else if (bk > 0) out.push('Jet-puff bonks: ' + bk + ' (all bouncy, nobody hurt).');
    else if (s.bumps > 0) out.push('Bumps in space: ' + s.bumps + '.');
    return out;
  },
  // test access for the bot harness and the computer brain (no window globals)
  test: { PLANETHOP, PLANETHOP_TWISTS, build: planethopBuild, sim: planethopSim, launch: planethopLaunch, plan: planethopPlan, arcT: planethopArcT, wrap: planethopWrap, air: planethopAir, comet: planethopComet, rocket: planethopRocket },
};


/* ---------- drawing ---------- */
function planethopStarShape(x, y, r, col, rot = 0) {
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + rot + i * Math.PI / 5, q = i % 2 ? r * 0.48 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  ctx.closePath(); ctx.fill();
}
function planethopCamXform(cam) { ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y); }
function planethopView(cam, pad = 0) { const hw = W / 2 / cam.z + pad, hh = H / 2 / cam.z + pad; return { x0: cam.x - hw, x1: cam.x + hw, y0: cam.y - hh, y1: cam.y + hh }; }
const planethopSeen = (v, x, y, r) => x + r > v.x0 && x - r < v.x1 && y + r > v.y0 && y - r < v.y1;
// where a runner is drawn: at the start both stand on one spot, so the picture nudges them apart until they separate
function planethopDrawPos(st, r) {
  if (!st.ghost) return { x: r.x, y: r.y };
  const o = st.run[1 - r.id], sep = Math.hypot(o.x - r.x, o.y - r.y), k = clamp(1 - sep / (2 * PLANETHOP.R), 0, 1) * 10 * (r.id ? 1 : -1);
  return { x: r.x - Math.sin(r.vu) * k, y: r.y + Math.cos(r.vu) * k };
}

function planethopDrawSky(st) {
  const cam = st.cam;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0b0e2e'); g.addColorStop(0.55, '#221b56'); g.addColorStop(1, '#43306e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // nebula: soft clouds of colour, far away
  [['rgba(255,120,200,0.13)', 0], ['rgba(90,220,230,0.10)', 1], ['rgba(180,140,255,0.13)', 2]].forEach(([col, k]) => {
    const px = ((k * 520 + 240 - cam.x * 0.03) % 1560 + 1560) % 1560 - 300, py = 120 + k * 130 - cam.y * 0.03;
    const rg = ctx.createRadialGradient(px, py, 10, px, py, 240);
    rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(px - 240, py - 240, 480, 480);
  });
  // stars in three layers (nearer ones drift more as the camera moves)
  for (const [par, n, sz, seed] of [[0.02, 70, 1.1, 1], [0.06, 44, 1.5, 2], [0.13, 24, 2, 3]]) {
    for (let i = 0; i < n; i++) {
      const hx = planethopHash(i, seed * 31) * (W + 60), hy = planethopHash(i + 500, seed * 17) * (H + 60);
      const x = ((hx - cam.x * par) % (W + 60) + W + 60) % (W + 60) - 30, y = ((hy - cam.y * par) % (H + 60) + H + 60) % (H + 60) - 30;
      const tw = reduceMotion ? 1 : 0.5 + 0.5 * Math.abs(Math.sin(G.clock * (0.7 + (i % 5) * 0.35) + i));
      ctx.globalAlpha = 0.35 + 0.65 * tw;
      const col = i % 9 === 0 ? '#ffe3a0' : i % 7 === 0 ? '#bfe8ff' : '#ffffff';
      if (seed === 3 && i % 4 === 0) planethopStarShape(x, y, sz * 2.2, col, 0); else { ctx.fillStyle = col; circle(x, y, sz); ctx.fill(); }
    }
  }
  ctx.globalAlpha = 1;
  // the big ringed planet far away and the little Orbit Outpost space station
  const span = 2600, bx = ((780 - cam.x * 0.015) % span + span) % span - 400, by = 110 - cam.y * 0.012;
  if (bx > -180 && bx < W + 180) planethopDrawRinged(bx, by);
  const sx = ((260 - cam.x * 0.025) % 2000 + 2000) % 2000 - 300, sy = 70 - cam.y * 0.02;
  if (sx > -80 && sx < W + 80) planethopDrawStation(sx, sy);
}
function planethopDrawRinged(x, y) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.28); ctx.scale(0.5, 0.5);
  ctx.globalAlpha = 0.22; // far away: small and faint, so it never looks like a planet to land on
  ctx.strokeStyle = 'rgba(255,214,170,0.45)'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.ellipse(0, 0, 112, 26, 0, Math.PI, Math.PI * 2); ctx.stroke();
  const g = ctx.createRadialGradient(-22, -24, 8, 0, 0, 66);
  g.addColorStop(0, '#f7d9ff'); g.addColorStop(0.6, '#c39be8'); g.addColorStop(1, '#8a64c0');
  ctx.fillStyle = g; circle(0, 0, 64); ctx.fill();
  ctx.save(); circle(0, 0, 64); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(-70, -26, 140, 10); ctx.fillRect(-70, 4, 140, 7); ctx.fillRect(-70, 26, 140, 12);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,214,170,0.6)'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.ellipse(0, 0, 112, 26, 0, 0, Math.PI); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,215,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 0, 100, 21, 0, 0, Math.PI); ctx.stroke();
  ctx.restore();
}
function planethopDrawStation(x, y) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(G.clock * 0.15);
  ctx.strokeStyle = 'rgba(200,210,240,0.55)'; ctx.lineWidth = 3; circle(0, 0, 18); ctx.stroke();
  ctx.lineWidth = 1.5; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18); ctx.stroke(); }
  ctx.fillStyle = 'rgba(200,210,240,0.7)'; circle(0, 0, 5); ctx.fill();
  ctx.fillStyle = 'rgba(120,170,255,0.55)'; ctx.fillRect(-36, -4, 14, 8); ctx.fillRect(22, -4, 14, 8);
  const on = Math.sin(G.clock * 4) > 0.3;
  ctx.fillStyle = on ? '#ff8a8a' : 'rgba(255,138,138,0.25)'; circle(18, 0, 2); ctx.fill();
  ctx.fillStyle = !on ? '#8affb8' : 'rgba(138,255,184,0.25)'; circle(-18, 0, 2); ctx.fill();
  ctx.restore();
}

function planethopCols(q) {
  if (q.kind === 'rock') return PLANETHOP_COLS.rock[q.col % PLANETHOP_COLS.rock.length];
  return PLANETHOP_COLS[q.kind] || PLANETHOP_COLS.rock[0];
}
// a planet: shaded ball, craters (they turn with a spinny planet), a face on some, a checkered band on the finish
function planethopDrawPlanet(st, q) {
  const [base, dark, hi] = planethopCols(q), x = q.cx, y = q.cy, r = q.r;
  const wob = q.wob > 0 ? Math.sin(q.wob * 38) * 5 * q.wob / 0.5 : 0;
  ctx.fillStyle = 'rgba(255,255,255,0.05)'; circle(x, y, r + 9); ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.42, r * 0.08, x, y, r * 1.02);
  g.addColorStop(0, hi); g.addColorStop(0.55, base); g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, y, r + wob, r - wob, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, r + wob, r - wob, 0, 0, Math.PI * 2); ctx.clip();
  if (q.kind === 'jelly') {
    // bubbles drifting up inside the jelly, and a shine
    for (let k = 0; k < 6; k++) {
      const bx = x + (planethopHash(q.seed, k) - 0.5) * r * 1.3, ph = ((G.clock * 0.25 + planethopHash(k, q.seed)) % 1), byy = y + r * 0.8 - ph * r * 1.6;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * (1 - ph)) + ')'; ctx.lineWidth = 1.5; circle(bx, byy, 2.5 + planethopHash(k + 3, q.seed) * 4); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(x - r * 0.4, y - r * 0.45, r * 0.28, r * 0.13, -0.6, 0, Math.PI * 2); ctx.fill();
  } else {
    // craters turn with the planet
    const nC = q.kind === 'finish' || q.kind === 'start' ? 2 : q.r < 40 ? 3 : 4;
    for (let k = 0; k < nC; k++) {
      const a = planethopHash(q.seed, k * 3) * 6.28 + q.rot, dd = r * (0.3 + planethopHash(q.seed, k * 3 + 1) * 0.45), cr = r * (0.09 + planethopHash(q.seed, k * 3 + 2) * 0.1);
      const cx = x + Math.cos(a) * dd, cy = y + Math.sin(a) * dd;
      if (q.face && Math.hypot(cx - x, cy - y + r * 0.05) < r * 0.5) continue; // keep the face clear
      ctx.fillStyle = 'rgba(40,30,80,0.18)'; ctx.beginPath(); ctx.ellipse(cx, cy, cr, cr * 0.8, a, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx - 1, cy - 1, cr, cr * 0.8, a, Math.PI, Math.PI * 1.8); ctx.stroke();
    }
    // fine speckles and a few little rocks across the surface (they turn with it)
    for (let k = 0; k < 10; k++) {
      const a = planethopHash(q.seed + 7, k) * 6.28 + q.rot, dd = r * (0.15 + planethopHash(k, q.seed + 9) * 0.78);
      ctx.fillStyle = k % 2 ? 'rgba(255,255,255,0.18)' : 'rgba(40,30,80,0.16)';
      circle(x + Math.cos(a) * dd, y + Math.sin(a) * dd, 1.2 + (k % 3) * 0.6); ctx.fill();
    }
    if (q.spin) {
      // swirly stripes that show the spin
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = r * 0.12;
      for (let k = 0; k < 3; k++) { const a = q.rot + k * 2.09; ctx.beginPath(); ctx.arc(x, y, r * 0.72, a, a + 0.9); ctx.stroke(); }
    }
    if (q.kind === 'finish') {
      // a checkered band round the middle
      const n = 16;
      for (let k = 0; k < n; k++) for (let j = 0; j < 2; j++) {
        ctx.fillStyle = (k + j) % 2 ? '#ffffff' : '#2b2850';
        ctx.fillRect(x - r + k * (2 * r / n), y - 8 + j * 8, 2 * r / n + 0.5, 8.5);
      }
    }
    if (q.kind === 'start') { ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(x - r, y - 20, 2 * r, 6); ctx.fillRect(x - r, y + 14, 2 * r, 6); }
  }
  // the shady side
  const sh = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.75, x - r * 0.3, y - r * 0.35, r * 1.6);
  sh.addColorStop(0, 'rgba(30,20,70,0)'); sh.addColorStop(1, 'rgba(30,20,70,0.32)');
  ctx.fillStyle = sh; ctx.fillRect(x - r - 8, y - r - 8, 2 * r + 16, 2 * r + 16);
  ctx.restore();
  ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, r + wob, r - wob, 0, 0, Math.PI * 2); ctx.stroke();
  // a thin lit rim on the sunny side
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, r + wob - 3, r - wob - 3, 0, Math.PI * 1.02, Math.PI * 1.45); ctx.stroke();
  if (q.face) planethopDrawFace(st, q, x, y + (q.kind === 'finish' ? -r * 0.32 : 0), r);
  if (q.kind === 'start') text('START', x, y + 2, Math.round(r * 0.3), 'rgba(255,255,255,0.85)', 'center');
  if (q.spin) {
    // three chevrons round the outside, turning with it
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let k = 0; k < 3; k++) {
      const a = q.rot + k * 2.09 + 0.6, s = Math.sign(q.spin), R0 = r + 7;
      const ax = x + Math.cos(a) * R0, ay = y + Math.sin(a) * R0, tx = -Math.sin(a) * s, ty = Math.cos(a) * s, nx = Math.cos(a), ny = Math.sin(a);
      ctx.beginPath(); ctx.moveTo(ax - tx * 6 + nx * 5, ay - ty * 6 + ny * 5); ctx.lineTo(ax, ay); ctx.lineTo(ax - tx * 6 - nx * 5, ay - ty * 6 - ny * 5); ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
}
// a friendly face: eyes that follow the nearer runner, a blink, a smile (an "o" when someone lands on it)
function planethopDrawFace(st, q, x, y, r) {
  let tx = x, ty = y + 50, bd = 1e9;
  for (const rn of st.run) { const d = Math.hypot(rn.x - x, rn.y - y); if (d < bd) { bd = d; tx = rn.x; ty = rn.y; } }
  const la = Math.atan2(ty - y, tx - x), lk = Math.min(1, bd / 200) * r * 0.035;
  const s = r / 60, ex = 13 * s, ey = y - 6 * s, er = 5.2 * s;
  const blink = q.face === 2 || ((G.clock * 0.9 + q.seed * 0.013) % 3.6) < 0.13;
  for (const sx of [-1, 1]) {
    if (blink) { ctx.strokeStyle = 'rgba(40,30,70,0.75)'; ctx.lineWidth = 2.2 * s; ctx.beginPath(); ctx.arc(x + sx * ex, ey, er * 0.8, 0.2, Math.PI - 0.2); ctx.stroke(); }
    else {
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x + sx * ex, ey, er, er * 1.15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink; circle(x + sx * ex + Math.cos(la) * lk * 1.6, ey + Math.sin(la) * lk * 1.6, er * 0.52); ctx.fill();
      ctx.fillStyle = '#ffffff'; circle(x + sx * ex + Math.cos(la) * lk * 1.6 - er * 0.18, ey + Math.sin(la) * lk * 1.6 - er * 0.2, er * 0.17); ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255,120,150,0.4)'; circle(x - ex - 6 * s, ey + 9 * s, 4 * s); ctx.fill(); circle(x + ex + 6 * s, ey + 9 * s, 4 * s); ctx.fill();
  const oh = q.wob > 0 || st.run.some(rn => rn.mode === 'ground' && rn.pi === q.i && rn.sq > 0.12);
  ctx.strokeStyle = 'rgba(40,30,70,0.8)'; ctx.lineWidth = 2.2 * s; ctx.lineCap = 'round';
  if (oh) { ctx.fillStyle = 'rgba(60,30,60,0.8)'; ctx.beginPath(); ctx.ellipse(x, ey + 12 * s, 3.5 * s, 4.5 * s, 0, 0, Math.PI * 2); ctx.fill(); }
  else if (q.face === 3) { ctx.fillStyle = 'rgba(60,30,60,0.75)'; ctx.beginPath(); ctx.arc(x, ey + 8 * s, 7 * s, 0.1, Math.PI - 0.1); ctx.closePath(); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(x, ey + 7 * s, 6 * s, 0.35, Math.PI - 0.35); ctx.stroke(); }
  ctx.lineCap = 'butt';
  if (q.face === 2 && !oh) text('z', x + ex + 14 * s, ey - 14 * s - Math.sin(G.clock * 2) * 3, Math.round(12 * s), 'rgba(255,255,255,0.7)', 'center');
}
// the finish rocket: white and red, a round window; at the end it carries the winner up and away
function planethopDrawRocket(st) {
  const rk = planethopRocket(st.c), ce = st.cele;
  let lift = 0, flame = 0, shake = 0;
  if (ce) { const t = ce.t; lift = t < 0.45 ? 0 : Math.pow(t - 0.45, 2) * 320; flame = t > 0.2 ? 1 : t / 0.2; shake = t < 0.45 ? Math.sin(t * 90) * 1.5 : 0; }
  ctx.save(); ctx.translate(rk.fx, rk.fy); ctx.rotate(rk.a + Math.PI / 2);
  // the launch pad stays put
  ctx.fillStyle = '#6a6f8c'; rr(-24, -5, 48, 8, 3); ctx.fill();
  ctx.fillStyle = '#ffd77a'; for (let k = -2; k <= 2; k++) { circle(k * 10, -1, 1.6); ctx.fill(); }
  ctx.translate(shake, -lift - 4);
  if (flame > 0) {
    const fl = 26 + Math.sin(G.clock * 40) * 6 + (ce && ce.t > 0.45 ? 26 : 0);
    ctx.fillStyle = 'rgba(255,170,60,0.9)'; ctx.beginPath(); ctx.moveTo(-9, -4); ctx.quadraticCurveTo(0, fl * flame * 1.1, 9, -4); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,150,0.95)'; ctx.beginPath(); ctx.moveTo(-5, -4); ctx.quadraticCurveTo(0, fl * flame * 0.6, 5, -4); ctx.fill();
  }
  // fins
  ctx.fillStyle = '#ff5f6d'; ctx.strokeStyle = '#a3313e'; ctx.lineWidth = 2;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 12, -28); ctx.quadraticCurveTo(s * 26, -14, s * 24, 2); ctx.lineTo(s * 10, -6); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  // body
  ctx.fillStyle = '#f7f4ff'; ctx.strokeStyle = '#8f8ab0'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-13, -4); ctx.quadraticCurveTo(-17, -46, 0, -84); ctx.quadraticCurveTo(17, -46, 13, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff5f6d'; ctx.beginPath(); ctx.moveTo(-7.5, -70); ctx.quadraticCurveTo(0, -76, 7.5, -70); ctx.quadraticCurveTo(4, -80, 0, -84); ctx.quadraticCurveTo(-4, -80, -7.5, -70); ctx.fill();
  ctx.fillStyle = '#ff5f6d'; ctx.fillRect(-14, -14, 28, 5);
  // the window, with the winner waving inside
  ctx.fillStyle = '#2b3f63'; circle(0, -44, 9.5); ctx.fill(); ctx.strokeStyle = '#ffc53d'; ctx.lineWidth = 3; circle(0, -44, 9.5); ctx.stroke();
  if (ce) { ctx.fillStyle = PCOL[ce.id]; circle(0, -42, 7); ctx.fill(); ctx.fillStyle = '#fff'; circle(-2.5, -44, 1.8); ctx.fill(); circle(2.5, -44, 1.8); ctx.fill(); ctx.fillStyle = C.ink; circle(-2.3, -43.7, 0.9); ctx.fill(); circle(2.7, -43.7, 0.9); ctx.fill(); }
  else { ctx.fillStyle = 'rgba(190,230,255,0.6)'; ctx.beginPath(); ctx.ellipse(-3, -47, 3, 4.5, -0.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
// a little alien cheering on a planet at angle a
function planethopDrawAlien(q, a, col, ph, cheer) {
  const bob = reduceMotion ? 0 : Math.abs(Math.sin(G.clock * (cheer ? 9 : 2.2) + ph)) * (cheer ? 7 : 2);
  ctx.save(); ctx.translate(q.cx + Math.cos(a) * q.r, q.cy + Math.sin(a) * q.r); ctx.rotate(a + Math.PI / 2); ctx.translate(0, -bob);
  ctx.fillStyle = col; ctx.strokeStyle = 'rgba(30,60,30,0.6)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, -11, 9, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -21); ctx.lineTo(Math.sin(G.clock * 3 + ph) * 3, -30); ctx.stroke();
  ctx.fillStyle = '#ffd77a'; circle(Math.sin(G.clock * 3 + ph) * 3, -31, 2.6); ctx.fill();
  ctx.fillStyle = '#fff'; circle(0, -13, 5); ctx.fill(); ctx.fillStyle = C.ink; circle(0.8, -12.5, 2.4); ctx.fill();
  ctx.strokeStyle = 'rgba(30,60,30,0.8)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, -6, 3, 0.2, Math.PI - 0.2); ctx.stroke();
  const wv = Math.sin(G.clock * (cheer ? 14 : 4) + ph) * (cheer ? 0.8 : 0.3);
  ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(-15, -18 + wv * 6); ctx.moveTo(8, -10); ctx.lineTo(15, -18 - wv * 6); ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.restore();
}
function planethopDrawWorm(st) {
  const w = st.c.worm; if (!w) return;
  for (const [x, y, s, k] of [[w.x, w.y, 1, 0], [w.ex, w.ey, 0.6, 1]]) {
    ctx.save(); ctx.translate(x, y);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 42 * s);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.35, 'rgba(160,110,255,0.6)'); g.addColorStop(1, 'rgba(90,220,230,0)');
    ctx.fillStyle = g; circle(0, 0, 42 * s); ctx.fill();
    ctx.rotate(G.clock * (k ? -2.4 : 2.4));
    ctx.lineWidth = 3.5 * s; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = ['#b98cff', '#7ff0e0', '#ffffff'][i];
      ctx.beginPath();
      for (let j = 0; j <= 18; j++) { const u = j / 18, a = u * 4.4 + i * 2.09, rr0 = (4 + u * 28) * s; ctx.lineTo(Math.cos(a) * rr0, Math.sin(a) * rr0); }
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.restore();
  }
  text('Shortcut!', w.x, w.y - 46, 15, '#d9c8ff', 'center');
}
function planethopDrawComet(cm, t) {
  const q = planethopComet(cm, t); if (!q) return;
  const sp = Math.hypot(cm.vx, cm.vy), ux = cm.vx / sp, uy = cm.vy / sp;
  const g = ctx.createLinearGradient(q.x, q.y, q.x - ux * 110, q.y - uy * 110);
  g.addColorStop(0, 'rgba(190,232,255,0.8)'); g.addColorStop(1, 'rgba(190,232,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(q.x - uy * 14, q.y + ux * 14); ctx.lineTo(q.x - ux * 110, q.y - uy * 110); ctx.lineTo(q.x + uy * 14, q.y - ux * 14); ctx.closePath(); ctx.fill();
  for (let k = 0; k < 4; k++) { const d = 30 + k * 22 + ((G.clock * 60) % 22); planethopStarShape(q.x - ux * d + Math.sin(k * 3 + G.clock * 5) * 6, q.y - uy * d + Math.cos(k * 3 + G.clock * 5) * 6, 3, 'rgba(255,255,255,0.7)', G.clock); }
  ctx.fillStyle = '#e8f6ff'; circle(q.x, q.y, PLANETHOP.cometR); ctx.fill();
  ctx.strokeStyle = '#8fcdf0'; ctx.lineWidth = 2; circle(q.x, q.y, PLANETHOP.cometR); ctx.stroke();
  ctx.fillStyle = C.ink; circle(q.x - 4 + ux * 3, q.y - 3 + uy * 3, 2); ctx.fill(); circle(q.x + 4 + ux * 3, q.y - 3 + uy * 3, 2); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(q.x + ux * 3, q.y + 2 + uy * 3, 4, 0.2, Math.PI - 0.2); ctx.stroke();
}
function planethopDrawWorld() {
  const st = G.mst; if (!st.c || !st.cam) return;
  const c = st.c, cam = st.cam;
  planethopDrawSky(st);
  ctx.save(); planethopCamXform(cam);
  const v = planethopView(cam, 40);
  // gravity wells: a faint dotted ring (in a runner's colour while it pulls that runner)
  ctx.setLineDash([4, 10]); ctx.lineWidth = 2;
  for (const q of c.pl) {
    const wr = q.r + q.well;
    if (!planethopSeen(v, q.cx, q.cy, wr)) continue;
    const who = st.run.filter(r => r.mode === 'air' && r.well === q.i);
    ctx.strokeStyle = who.length ? (who.length === 2 ? 'rgba(255,215,122,0.55)' : PCOL[who[0].id]) : 'rgba(200,190,255,0.16)';
    ctx.globalAlpha = who.length ? 0.6 : 1;
    circle(q.cx, q.cy, wr); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // moon orbits
  ctx.strokeStyle = 'rgba(220,210,255,0.18)'; ctx.setLineDash([2, 8]);
  for (const q of c.pl) if (q.host >= 0) { const h = c.pl[q.host]; if (planethopSeen(v, h.cx, h.cy, q.orb.rad + 30)) { circle(h.cx, h.cy, q.orb.rad); ctx.stroke(); } }
  ctx.setLineDash([]);
  planethopDrawWorm(st);
  for (const q of c.pl) if (planethopSeen(v, q.cx, q.cy, q.r + 20)) planethopDrawPlanet(st, q);
  // the finish: rocket, a flag and two cheering aliens; a flag at the start
  const fin = c.byCi[c.n];
  if (planethopSeen(v, fin.cx, fin.cy, fin.r + 140)) {
    const cheer = !!st.cele;
    planethopDrawAlien(fin, c.rocketA - 0.95, '#8fe36a', 0, cheer);
    planethopDrawAlien(fin, c.rocketA + 0.95, '#6ad3c4', 1.7, cheer);
    planethopDrawFlag(fin, c.rocketA + 0.5, '#ffc53d');
    planethopDrawRocket(st);
  }
  const s0 = c.byCi[0];
  if (planethopSeen(v, s0.cx, s0.cy, s0.r + 80)) { planethopDrawFlag(s0, -Math.PI / 2 - 0.55, '#7fd6ff'); planethopDrawAlien(s0, -Math.PI / 2 + 0.75, '#b28dff', 3, false); }
  // stars to grab
  for (const s of c.stars) {
    if (!planethopSeen(v, s.x, s.y, 40)) continue;
    if (s.taken >= 0) continue;
    const y = s.y + Math.sin(G.clock * 2.4 + s.ph) * 5, rot = Math.sin(G.clock * 1.5 + s.ph) * 0.25;
    const gl = ctx.createRadialGradient(s.x, y, 2, s.x, y, 30); gl.addColorStop(0, 'rgba(255,215,122,0.55)'); gl.addColorStop(1, 'rgba(255,215,122,0)');
    ctx.fillStyle = gl; circle(s.x, y, 30); ctx.fill();
    planethopStarShape(s.x, y + 1, 16, '#b9850f', rot); planethopStarShape(s.x, y, 15, C.gold, rot);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(s.x - 4, y - 4, 2.4); ctx.fill();
  }
  for (const cm of c.comets) planethopDrawComet(cm, st.t);
  ctx.restore();
}
function planethopDrawFlag(q, a, col) {
  ctx.save(); ctx.translate(q.cx + Math.cos(a) * q.r, q.cy + Math.sin(a) * q.r); ctx.rotate(a + Math.PI / 2);
  ctx.fillStyle = '#e6e1f7'; ctx.fillRect(-1.5, -46, 3, 46);
  const wv = Math.sin(G.clock * 5) * 3;
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(1.5, -46); ctx.quadraticCurveTo(14, -42 + wv, 26, -38); ctx.lineTo(1.5, -28); ctx.closePath(); ctx.fill();
  ctx.restore();
}
// a runner: Pip or Bo in a bubble helmet with a little jet pack, feet on the planet
function planethopDrawRunner(st, r) {
  if (r.hidden) return;
  const col = PCOL[r.id], dk = PDARK[r.id], pos = planethopDrawPos(st, r), zk = planethopRunK(st.cam);
  ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(r.vu + Math.PI / 2);
  if (zk > 1) { ctx.translate(0, 13); ctx.scale(zk, zk); ctx.translate(0, -13); } // (bigger round the feet)
  if (r.puffT > 0) {
    // the jet puff's flame, pointing away from where it pushes
    const k = r.puffT / 0.35;
    ctx.save(); ctx.rotate(r.puffAng - r.vu - Math.PI / 2 + Math.PI);
    ctx.fillStyle = r.puffK > 1 ? 'rgba(255,215,122,0.9)' : 'rgba(255,160,70,0.9)';
    ctx.beginPath(); ctx.moveTo(8, -6); ctx.quadraticCurveTo(14 + 34 * k, 0, 8, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,210,0.95)'; ctx.beginPath(); ctx.moveTo(8, -3); ctx.quadraticCurveTo(12 + 18 * k, 0, 8, 3); ctx.fill();
    ctx.restore();
  }
  const sq = r.sq;
  ctx.translate(0, 13); ctx.scale(r.face * (1 + sq * 0.35), 1 - sq * 0.3); ctx.translate(0, -13);
  // jet pack on the back
  ctx.fillStyle = '#b8bdd6'; ctx.strokeStyle = '#6a6f8c'; ctx.lineWidth = 1.5; rr(-16, -9, 7, 15, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = r.gold ? C.gold : '#ff8a5c'; circle(-12.5, -5, 1.8); ctx.fill();
  // feet: a little run cycle on the ground, tucked in the air
  const ground = r.mode === 'ground', ph = ground && Math.abs(r.s) > 20 ? Math.sin(r.step / 7) : 0;
  ctx.fillStyle = dk;
  ctx.beginPath(); ctx.ellipse(-4 + ph * 4, ground ? 11 : 9, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(5 - ph * 4, ground ? 11 : 9, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill();
  // ears (Bo) under the helmet
  if (r.id === 1) { ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 2; for (const ex of [-6, 6]) { circle(ex, -12, 4.2); ctx.fill(); ctx.stroke(); } }
  // body
  ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 2.2;
  rr(-10, -12, 20, 22, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(-7, -9, 7, 8, 4); ctx.fill();
  if (r.id === 0) { ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(1, -16); ctx.stroke(); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(4.5, -17, 4.5, 2.2, -0.5, 0, Math.PI * 2); ctx.fill(); }
  // face (looks ahead)
  const ey = -4;
  if (r.dizzy > 0 || (r.mode === 'tow' && r.tow && r.tow.kind === 'tow')) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6;
    for (const ex of [-2, 5]) { ctx.beginPath(); ctx.moveTo(ex - 2, ey - 2); ctx.lineTo(ex + 2, ey + 2); ctx.moveTo(ex + 2, ey - 2); ctx.lineTo(ex - 2, ey + 2); ctx.stroke(); }
  } else {
    for (const ex of [-2, 5]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, 2.8, 3.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = C.ink; circle(ex + 1, ey + 0.5, 1.5); ctx.fill(); }
  }
  ctx.fillStyle = 'rgba(255,120,140,0.45)'; circle(-5, ey + 5, 1.8); ctx.fill(); circle(8, ey + 5, 1.8); ctx.fill();
  if (r.popT < 0.9 || r.mode === 'air') { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(2, ey + 4, 2.4, 0.2, Math.PI - 0.2); ctx.stroke(); }
  // the bubble helmet
  ctx.fillStyle = 'rgba(200,235,255,0.16)'; circle(0, -3, 16.5); ctx.fill();
  ctx.strokeStyle = 'rgba(235,248,255,0.8)'; ctx.lineWidth = 1.6; circle(0, -3, 16.5); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(0, -3, 13, -2.6, -1.9); ctx.stroke();
  ctx.restore();
  if (r.dizzy > 0) for (let i = 0; i < 3; i++) { const a = G.clock * 9 + i * 2.1; planethopStarShape(pos.x + Math.cos(a) * 16 * zk + Math.cos(r.vu) * 24 * zk, pos.y + Math.sin(a) * 5 * zk + Math.sin(r.vu) * 24 * zk, 4 * zk, C.gold, 0); }
}
// Tow-bot: a round friendly robot with one big eye and a little propeller, holding a tractor beam
function planethopDrawTowBot(st, r) {
  if (r.mode !== 'tow' || !r.tow) return;
  const gold = r.tow.kind === 'lift', k = r.tow.t / r.tow.T, a = Math.min(1, k * 5, (1 - k) * 6 + 0.3);
  const bx = r.x + Math.sin(G.clock * 3) * 3, by = r.y - 48 + Math.sin(G.clock * 6) * 2;
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
  const g = ctx.createLinearGradient(bx, by, r.x, r.y);
  g.addColorStop(0, gold ? 'rgba(255,215,122,0.75)' : 'rgba(255,150,210,0.7)'); g.addColorStop(1, gold ? 'rgba(255,215,122,0.15)' : 'rgba(255,150,210,0.12)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bx - 6, by + 8); ctx.lineTo(r.x - 20, r.y + 6); ctx.lineTo(r.x + 20, r.y + 6); ctx.lineTo(bx + 6, by + 8); ctx.closePath(); ctx.fill();
  // propeller
  const pw = Math.abs(Math.sin(G.clock * 30)) * 14 + 3;
  ctx.fillStyle = '#6a6f8c'; ctx.fillRect(bx - 1.5, by - 20, 3, 7);
  ctx.fillStyle = gold ? '#ffd77a' : '#ff8fc7'; ctx.beginPath(); ctx.ellipse(bx, by - 20, pw, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  // body
  const bg = ctx.createRadialGradient(bx - 4, by - 5, 2, bx, by, 15);
  bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, gold ? '#e8c46a' : '#b8bdd6');
  ctx.fillStyle = bg; circle(bx, by, 14); ctx.fill();
  ctx.strokeStyle = '#6a6f8c'; ctx.lineWidth = 2; circle(bx, by, 14); ctx.stroke();
  ctx.fillStyle = '#2b2850'; rr(bx - 9, by - 7, 18, 10, 5); ctx.fill();
  ctx.fillStyle = '#7ff0e0'; circle(bx + 1, by - 2, 3.3); ctx.fill(); ctx.fillStyle = '#ffffff'; circle(bx + 2, by - 3, 1.2); ctx.fill();
  ctx.strokeStyle = '#2b2850'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bx, by + 6, 3.5, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.strokeStyle = '#8f94b3'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(bx - 12, by + 4); ctx.lineTo(bx - 16, by + 13); ctx.moveTo(bx + 12, by + 4); ctx.lineTo(bx + 16, by + 13); ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.restore();
}
function planethopWordY(x, y, below) {
  const b = G.matchHudBox; if (!b) return y;
  return y < (hudBig() ? 104 : 86) && x > b.x0 - 60 && x < b.x1 + 60 ? Math.max(y, below) : y;
}
function planethopDrawTop() {
  const st = G.mst, m = G.match; if (!st.c || !st.run || !st.cam) return;
  const cam = st.cam, big = planethopBig();
  ctx.save(); planethopCamXform(cam);
  const order = st.run.slice().sort((a, b) => a.prog - b.prog);
  for (const r of order) planethopDrawRunner(st, r);
  for (const r of st.run) planethopDrawTowBot(st, r);
  for (const q of st.vis.fx) {
    const a = clamp(q.life / q.max, 0, 1); ctx.globalAlpha = a; ctx.fillStyle = q.col;
    if (q.kind === 'spark') planethopStarShape(q.x, q.y, q.size * (0.6 + 0.6 * a), q.col, q.life * 4);
    else if (q.kind === 'smoke') { circle(q.x, q.y, q.size * (1.6 - 0.6 * a)); ctx.fill(); }
    else { circle(q.x, q.y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  for (const w of st.vis.warps) { const k = w.t / 0.6; ctx.strokeStyle = 'rgba(185,140,255,' + (1 - k) + ')'; ctx.lineWidth = 4 * (1 - k) + 1; circle(w.x, w.y, 10 + 50 * k); ctx.stroke(); }
  ctx.restore();
  // words over the runners (screen space, so they read the same at any zoom)
  for (const r of st.run) if (r.popT < 1 && r.pop && !r.hidden) {
    const k = r.popT / 1, s = planethopToScreen(cam, r.x, r.y);
    ctx.globalAlpha = 1 - k * k;
    bigText(r.pop, s.x, planethopWordY(s.x, s.y - 34 - 24 * k, s.y + 40 + 20 * k), big ? 24 : 18, r.popCol, 1 + 0.3 * Math.max(0, 1 - k * 5));
    ctx.globalAlpha = 1;
  }
  for (const w of st.vis.words) { const k = w.t / 0.8, s = planethopToScreen(cam, w.x, w.y); ctx.globalAlpha = 1 - k; bigText(w.text, s.x, s.y - 24 - 18 * k, big ? 22 : 16, w.col); ctx.globalAlpha = 1; }
  // zoomed out: a little pin over each runner, so who is who reads at a glance
  const pinA = clamp((0.78 - cam.z) / 0.12, 0, 1);
  if (pinA > 0 && m && m.phase !== 'ready' && m.phase !== 'count') for (const r of st.run) {
    if (r.hidden) continue;
    const s = planethopToScreen(cam, r.x, r.y), up = r.mode === 'ground' ? r.a : r.vu, zk = planethopRunK(cam);
    const rr0 = big ? 11 : 8, d = (26 * zk) * cam.z + rr0 + 6, px = s.x + Math.cos(up) * d, py = s.y + Math.sin(up) * d;
    if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;
    ctx.globalAlpha = pinA;
    ctx.fillStyle = PCOL[r.id]; ctx.beginPath(); ctx.moveTo(px - Math.cos(up) * (rr0 + 6), py - Math.sin(up) * (rr0 + 6));
    ctx.lineTo(px + Math.cos(up + 1.9) * rr0, py + Math.sin(up + 1.9) * rr0); ctx.lineTo(px + Math.cos(up - 1.9) * rr0, py + Math.sin(up - 1.9) * rr0); ctx.fill();
    circle(px, py, rr0); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5; circle(px, py, rr0); ctx.stroke();
    text(NAMES[r.id][0], px, py + 0.5, big ? 14 : 11, '#fff', 'center');
    ctx.globalAlpha = 1;
  }
  // a runner off the screen: a marker at the edge pointing to them
  for (const r of st.run) {
    if (r.hidden) continue;
    const s = planethopToScreen(cam, r.x, r.y), pad = big ? 34 : 26;
    if (s.x > -10 && s.x < W + 10 && s.y > -10 && s.y < H + 10) continue;
    const ex = clamp(s.x, pad, W - pad), ey = clamp(s.y, pad + (big ? 60 : 50), H - pad - (big ? 60 : 46)), a = Math.atan2(s.y - ey, s.x - ex), rr0 = big ? 20 : 15;
    ctx.fillStyle = 'rgba(28,26,54,0.85)'; circle(ex, ey, rr0 + 3); ctx.fill();
    ctx.fillStyle = PCOL[r.id]; circle(ex, ey, rr0); ctx.fill();
    ctx.fillStyle = PCOL[r.id]; ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * (rr0 + 12), ey + Math.sin(a) * (rr0 + 12)); ctx.lineTo(ex + Math.cos(a + 0.5) * (rr0 + 2), ey + Math.sin(a + 0.5) * (rr0 + 2)); ctx.lineTo(ex + Math.cos(a - 0.5) * (rr0 + 2), ey + Math.sin(a - 0.5) * (rr0 + 2)); ctx.closePath(); ctx.fill();
    text(NAMES[r.id][0], ex, ey + 1, big ? 20 : 15, '#fff', 'center');
  }
  // name tags through the intro card, "Round N" and 3-2-1 (the framework draws none for hidden players)
  const tagA = G.introT > 0 ? 1 - clamp(G.introT / 0.5, 0, 1) : m && (m.phase === 'ready' || m.phase === 'count') ? 1 : 0;
  if (tagA > 0) for (const r of st.run) {
    const p0 = planethopDrawPos(st, r), s = planethopToScreen(cam, p0.x, p0.y), cpu = planethopCpu(r.id), hw = cpu ? 30 : 18;
    const x = s.x + (st.ghost ? (r.id ? 1 : -1) * (hw + 2) : 0), y = s.y - 30 * cam.z * planethopRunK(cam) - 16;
    ctx.globalAlpha = tagA; ctx.fillStyle = PCOL[r.id]; rr(x - hw, y - 11, hw * 2, 18, 9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 4, y + 7); ctx.lineTo(x + 4, y + 7); ctx.lineTo(x, y + 11); ctx.fill();
    text(cpu ? NAMES[r.id] + ' · CPU' : NAMES[r.id], x, y - 1.5, 12, '#fff', 'center', 'body'); ctx.globalAlpha = 1;
  }
  // the winner's rocket blasts off: smoke and stars
  if (st.cele && st.cele.t > 0.2 && st.cele.t < 2.2 && planethopVR() < 0.6) {
    const rk = planethopRocket(st.c), t = st.cele.t, lift = t < 0.45 ? 0 : Math.pow(t - 0.45, 2) * 320;
    const bx = rk.fx + Math.cos(rk.a) * (lift + 2), by = rk.fy + Math.sin(rk.a) * (lift + 2);
    planethopFx(st, bx, by, (planethopVR() - 0.5) * 120 - Math.cos(rk.a) * 60, (planethopVR() - 0.5) * 120 - Math.sin(rk.a) * 60, 0.7, planethopVR() < 0.5 ? 'rgba(255,255,255,0.8)' : 'rgba(255,200,120,0.8)', 5, 0, 'smoke');
    if (planethopVR() < 0.3) planethopFx(st, bx, by, (planethopVR() - 0.5) * 300, (planethopVR() - 0.5) * 300, 0.8, [C.gold, PCOL[st.cele.id], '#ffffff'][Math.floor(planethopVR() * 3)], 4, 0, 'spark');
  }
}

/* ---------- HUD ---------- */
// each player's own keys (none for the computer)
function planethopKeys(id) {
  let k = 'kb'; try { k = actKey(id); } catch (e) { k = 'kb'; }
  if (k === 'pad') return { run: 'stick', jump: glyph('a'), boost: glyph('act'), dive: 'stick ▼', boostIs: glyph('act') + ' boost' };
  if (k === 'touch') return { run: '◀ ▶', jump: '▲', boost: 'the boost button', dive: '▼', boostIs: 'boost button' };
  return id === 0 ? { run: 'A D', jump: 'W', boost: 'F', dive: 'S', boostIs: 'F boost' } : { run: '← →', jump: '↑', boost: '/', dive: '↓', boostIs: '/ boost' };
}
function planethopChip(label, x, y, big, col, gold) {
  const fs = big ? 18 : 13, h = big ? 30 : 22;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(label).width + (big ? 26 : 20), cx = clamp(x, w / 2 + 6, W - w / 2 - 6), cy = clamp(y, h / 2 + 4, H - h / 2 - 4);
  ctx.fillStyle = 'rgba(28,26,54,0.88)'; rr(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; rr(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.stroke();
  text(label, cx, cy + 0.5, fs, gold ? C.gold : C.paper, 'center', 'body');
}
// a little jet flame icon for the puff slots
function planethopFlameIcon(x, y, s, on, gold) {
  if (!on) { ctx.strokeStyle = 'rgba(246,239,223,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); circle(x, y, 7 * s); ctx.stroke(); ctx.setLineDash([]); return; }
  ctx.fillStyle = gold ? C.gold : '#ff9a5c'; ctx.beginPath(); ctx.moveTo(x, y - 10 * s); ctx.quadraticCurveTo(x + 9 * s, y + 2 * s, x, y + 9 * s); ctx.quadraticCurveTo(x - 9 * s, y + 2 * s, x, y - 10 * s); ctx.fill();
  ctx.fillStyle = gold ? '#fff3b0' : '#ffe08a'; ctx.beginPath(); ctx.moveTo(x, y - 3 * s); ctx.quadraticCurveTo(x + 4.5 * s, y + 3 * s, x, y + 7 * s); ctx.quadraticCurveTo(x - 4.5 * s, y + 3 * s, x, y - 3 * s); ctx.fill();
}
function planethopHud() {
  const st = G.mst, m = G.match; if (!st.run || !st.c || !st.cam) return;
  const big = planethopBig(), tw = PLANETHOP_TWISTS[st.twist], c = st.c, cam = st.cam;
  // bottom corners: each runner's jet puffs (gold edge with gold jets)
  for (const r of st.run) {
    const left = r.id === 0, sz = big ? 1.45 : 1, slots = Math.max(r.puffMax, r.puffs), pw = (64 + slots * 20) * sz, ph = 34 * sz, y = H - 8 - ph, x = left ? 12 : W - 12 - pw;
    ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(x, y, pw, ph, ph / 2); ctx.fill();
    if (r.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x, y, pw, ph, ph / 2); ctx.stroke(); }
    text(NAMES[r.id], left ? x + 13 * sz : x + pw - 13 * sz, y + ph / 2 + 0.5, 17 * sz, PCOL[r.id], left ? 'left' : 'right');
    for (let k = 0; k < slots; k++) {
      const ix = left ? x + pw - (16 + k * 20) * sz : x + (16 + k * 20) * sz;
      planethopFlameIcon(ix, y + ph / 2 + 1, sz, k < r.puffs, r.gold > 0 && k < r.puffMax || k >= r.puffMax);
    }
  }
  // bottom centre: the course map, start to rocket, with both runners
  {
    const mw = big ? 340 : 380, mh = big ? 30 : 22, x0 = W / 2 - mw / 2, y = H - (big ? 6 : 6) - mh;
    const a = x0 + 16, b = x0 + mw - 30, cy = y + mh / 2, len = c.cum[c.n];
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(x0, y, mw, mh, mh / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(246,239,223,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a, cy); ctx.lineTo(b, cy); ctx.stroke();
    for (let k = 0; k <= c.n; k++) {
      const px = a + (b - a) * c.cum[k] / len, q = c.byCi[k], wk = c.worm && (c.worm.from === q.i || c.worm.exit === q.i);
      ctx.fillStyle = k === 0 ? '#8fdcff' : wk ? '#b98cff' : planethopCols(q)[0]; circle(px, cy, (big ? 3.4 : 2.6) * (q.r > 60 ? 1.2 : 1)); ctx.fill();
    }
    // a tiny rocket at the end
    ctx.save(); ctx.translate(b + (big ? 14 : 12), cy); ctx.scale(big ? 0.28 : 0.22, big ? 0.28 : 0.22); ctx.translate(0, 40);
    ctx.fillStyle = '#f7f4ff'; ctx.beginPath(); ctx.moveTo(-13, -4); ctx.quadraticCurveTo(-17, -46, 0, -84); ctx.quadraticCurveTo(17, -46, 13, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff5f6d'; ctx.fillRect(-20, -14, 40, 12); ctx.restore();
    for (const r of st.run) {
      const k = clamp(r.prog / len, 0, 1), px = a + (b - a) * k, py = cy + (r.id ? 3 : -3) * (big ? 1.3 : 1), rad = big ? 7.5 : 6;
      ctx.fillStyle = PCOL[r.id]; circle(px, py, rad); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; circle(px, py, rad); ctx.stroke();
    }
  }
  // the twist's name, top left under the level pill (not in the plain round)
  if (st.twist !== 'plain') {
    const fs = big ? 20 : 13, h = big ? 36 : 26, y0 = 46;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(tw.name).width + (big ? 36 : 28); pill(14, y0, w, h); text(tw.name, 14 + (big ? 18 : 14), y0 + h / 2 + 0.5, fs, C.gold, 'left', 'body');
  }
  if (m.phase === 'live' || m.phase === 'end') {
    // top right: a Comet lift just given (gold)
    if (st.liftSay) {
      const fs = big ? 20 : 13, h = big ? 36 : 28, lab = 'Comet lift for ' + NAMES[st.liftSay.id] + '!';
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w = ctx.measureText(lab).width + (big ? 36 : 28), x1 = W - 14, box = G.matchHudBox, yy = box && x1 - w < box.x1 + 8 ? box.y1 + 6 : 12;
      pill(x1 - w, yy, w, h); text(lab, x1 - (big ? 18 : 14), yy + h / 2 + 0.5, fs, C.gold, 'right', 'body');
    }
    // after a person's first tows: a tip over their runner, in their own keys (never for the computer)
    for (const k of [0, 1]) {
      const h = st.hint[k], r = st.run[k]; if (!h || r.hidden || planethopCpu(k)) continue;
      const kk = planethopKeys(k), s = planethopToScreen(cam, r.x, r.y);
      const lab = h.n === 1 ? 'Run toward the next planet, then jump!' : 'Jet puff: hold where to go, then ' + kk.boost + '!';
      ctx.globalAlpha = clamp(Math.min(h.t / 0.2, (4.5 - h.t) / 0.4), 0, 1);
      const box = G.matchHudBox, up = s.y - (big ? 86 : 70);
      planethopChip(lab, s.x, box && up < box.y1 + 24 ? s.y + (big ? 70 : 56) : up, big, PCOL[k], false); // (under the runner near the top)
      ctx.globalAlpha = 1;
    }
  }
  if (m.phase === 'ready' || m.phase === 'count') {
    // the round card: this round's twist, and any gold help announced
    const lines = [];
    for (const r of st.run) if (r.gold) lines.push(r.gold >= 2 ? 'Gold jets and gold boots for ' + NAMES[r.id] + '!' : 'Gold jets for ' + NAMES[r.id] + ': two puffs every jump!');
    const nf = big ? 30 : 26, hf = big ? 19 : 14, lh = big ? 26 : 20, ch = (big ? 78 : 60) + lines.length * lh, cy = H - (big ? 64 : 50) - ch - 6;
    ctx.font = hf + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    let w = Math.max(big ? 380 : 300, ctx.measureText(tw.hint).width + 48);
    ctx.font = '700 ' + hf + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    for (const l of lines) w = Math.max(w, ctx.measureText(l).width + 48);
    w = Math.min(W - 20, w);
    const a = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1, cx = W / 2;
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(cx - w / 2, cy, w, ch, 16); ctx.fill();
    if (lines.length) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(cx - w / 2, cy, w, ch, 16); ctx.stroke(); }
    text(tw.name, cx, cy + (big ? 25 : 21), nf, C.gold, 'center'); text(tw.hint, cx, cy + (big ? 57 : 46), hf, C.paper, 'center', 'body');
    lines.forEach((l, i) => text(l, cx, cy + (big ? 57 : 46) + (i + 1) * lh, hf, C.gold, 'center', 'body'));
    ctx.globalAlpha = 1;
    // key reminders just above that card before rounds 1 and 2 (each player's own device; never the computer's)
    if (m.round <= 2) {
      ctx.globalAlpha = a;
      const who = st.run.filter(r => !planethopCpu(r.id)), step = big ? 36 : 28;
      let yy = cy - 6 - step / 2 - (who.length - 1) * step;
      for (const r of who) {
        const kk = planethopKeys(r.id);
        planethopChip(NAMES[r.id] + ': ' + kk.run + ' run · ' + kk.jump + ' jump · ' + kk.boostIs, cx, yy, big, PCOL[r.id], false);
        yy += step;
      }
      ctx.globalAlpha = 1;
    }
  }
}

Sfx.extra.planethopJump = function (p) { this.tone(300 * p, 0.12, 'triangle', 0.05, 640 * p); };
Sfx.extra.planethopJelly = function (p) { this.tone(220 * p, 0.2, 'sine', 0.07, 760 * p); this.tone(500 * p, 0.12, 'triangle', 0.03, 900 * p, 0.05); };
Sfx.extra.planethopLand = function (p) { this.tone(180 * p, 0.07, 'triangle', 0.05, 110 * p); };
Sfx.extra.planethopPuff = function (p) { this.tone(160 * p, 0.22, 'sawtooth', 0.035, 520 * p); this.tone(900 * p, 0.12, 'triangle', 0.02, 1400 * p, 0.03); };
Sfx.extra.planethopNope = function (p) { this.tone(260 * p, 0.08, 'triangle', 0.03, 200 * p); };
Sfx.extra.planethopBoing = function (p) { this.tone(170 * p, 0.26, 'sine', 0.08, 560 * p); };
Sfx.extra.planethopComet = function (p) { this.tone(1300, 0.08, 'triangle', 0.03, 1900); this.tone(170 * p, 0.28, 'sine', 0.08, 560 * p, 0.03); };
Sfx.extra.planethopBump = function () { this.tone(300, 0.07, 'triangle', 0.05, 200); };
Sfx.extra.planethopTow = function (p) { [660, 520, 400].forEach((f, i) => this.tone(f * p, 0.09, 'triangle', 0.035, null, i * 0.07)); this.tone(880, 0.3, 'sine', 0.02, 1200, 0.2); };
Sfx.extra.planethopLift = function (p) { [523, 659, 784, 1047].forEach((f, i) => this.tone(f * p, 0.1, 'triangle', 0.045, null, i * 0.06)); };
Sfx.extra.planethopStar = function (p) { [1046, 1318, 1568, 2093].forEach((f, i) => this.tone(f * p, 0.08, 'triangle', 0.04, null, i * 0.045)); };
Sfx.extra.planethopWorm = function (p) { this.tone(300 * p, 0.35, 'sine', 0.06, 1400 * p); this.tone(1200 * p, 0.3, 'triangle', 0.03, 300 * p, 0.12); };
Sfx.extra.planethopGo = function () { this.tone(200, 0.3, 'sawtooth', 0.02, 600); };
Sfx.extra.planethopRocket = function () { this.tone(120, 0.9, 'sawtooth', 0.035, 600); this.tone(600, 0.5, 'triangle', 0.03, 1500, 0.3); };
Sfx.extra.planethopGold = function () { this.tone(784, 0.1, 'triangle', 0.05); this.tone(1046, 0.12, 'triangle', 0.045, null, 0.08); this.tone(1318, 0.16, 'triangle', 0.04, null, 0.16); };
/* ===== end of 15-4 Planet Hop Race ===== */
