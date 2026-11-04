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
             jump gets caught by the next planet. ◀ ▶ nudge you a little in the air, ▼ dives (stronger pull).
     boost   the action: a jet puff, one per jump (refilled when you land). It pushes the way you hold (▲ out from the
             planet, ▼ in, ◀ ▶ along it), or forward-and-up with no direction held. On the ground it is a jet hop.
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
    if (inp && !b.dizzy) { const k = (inp.right ? 1 : 0) - (inp.left ? 1 : 0); ax += ny * k * P.airCtl; ay -= nx * k * P.airCtl; }
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
// the jet puff: the way you hold (relative to the planet pulling you), or forward-and-up
function planethopPuff(st, r, inp, live) {
  const P = PLANETHOP, c = st.c;
  if (r.puffs <= 0) { if (r.nopeT <= 0) { r.nopeT = 0.5; Sfx.play('planethopNope', r.id); planethopPop(r, 'No puff left!', '#d9d3ef'); } return; }
  if (r.mode === 'ground') planethopJump(st, r, live); // a jet hop: jump, then puff
  const q = c.pl[r.well >= 0 ? r.well : r.from], dx = r.x - q.cx, dy = r.y - q.cy, d = Math.hypot(dx, dy) || 1;
  const nx = dx / d, ny = dy / d, tx = -ny, ty = nx;
  const ku = inp ? (inp.up ? 1 : 0) - (inp.down ? 1 : 0) : 0, kr = inp ? (inp.right ? 1 : 0) - (inp.left ? 1 : 0) : 0;
  let ux = nx * ku + tx * kr, uy = ny * ku + ty * kr;
  if (!ku && !kr) { ux = tx * r.face + nx * 0.6; uy = ty * r.face + ny * 0.6; }
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
function planethopCamera(st, dt, snap) {
  const c = st.c, cam = st.cam, big = hudBig(), [A, B] = st.run;
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
  for (const q of v.fx) { q.life -= dt; q.vx *= Math.exp(-1.5 * dt); q.vy *= Math.exp(-1.5 * dt); q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
  v.fx = v.fx.filter(q => q.life > 0);
  for (const w of v.words) w.t += dt;
  v.words = v.words.filter(w => w.t < 0.8);
  for (const w of v.warps) w.t += dt;
  v.warps = v.warps.filter(w => w.t < 0.6);
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
    if (st.stat.best[w.id] == null || rt < st.stat.best[w.id]) st.stat.best[w.id] = rt;
    const lci = l.mode === 'ground' ? c.pl[l.pi].ci : l.reach, left = c.n - lci;
    const why = left <= 0 ? 'Rocket first, by a whisker!' : left === 1 ? 'Rocket first, one planet ahead!' : 'Rocket first, ' + left + ' planets ahead!';
    if (left <= 0) st.stat.whiskers++;
    if (matchRoundEnd(w.id, why)) { st.cele = { id: w.id, t: 0 }; w.hidden = true; Sfx.play('planethopRocket'); }
    return;
  }
  // the safety bell: a round that somehow runs this long goes to whoever is farther along
  if (st.t - st.t0 > PLANETHOP.capT) {
    const [A, B] = st.run;
    matchRoundEnd(Math.abs(A.prog - B.prog) < 2 ? -1 : A.prog > B.prog ? 0 : 1, 'Farther along at the bell!');
  }
}

MODES.planethop = {
  rand: Math.random,
  setup(st, L) {
    for (const row of L.grid) row.fill('.');
    st.stat = { jumps: [0, 0], hops: [0, 0], puffs: [0, 0], stars: [0, 0], tows: [0, 0], lifts: [0, 0], worms: [0, 0], boings: [0, 0],
      comets: [0, 0], bonks: [0, 0], best: [null, null], bumps: 0, whiskers: 0 };
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
    planethopCamera(st, 0, true);
    // the runners are the players: hide the platformer bodies every round (matchResetPlayers revives them)
    for (const p of G.players) Object.assign(p, { alive: false, respawnT: Infinity });
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
    planethopCamera(st, dt, true);
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
    if (fast != null) out.push('Fastest race: ' + NAMES[fast] + ', ' + f(s.best[fast]) + ' s.' + (s.whiskers ? ' Won by a whisker: ' + s.whiskers + '!' : ''));
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
function planethopDrawWorld() {}
function planethopDrawTop() {}
function planethopHud() {}
