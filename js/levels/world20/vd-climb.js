/* Pip & Bo - Level 20-1 Volcano Dragon: phase 'climb' (Slope Climb). */
'use strict';

/* ===== 20-1 phase 1: Slope Climb (VD_PHASES.climb) — Gavyn's pick =====
   Up the OUTSIDE slope of the erupting volcano, seen from the side. The camera scrolls right AND up after the pair.
   The course is hand-made (VDCL_STRETCHES below): 4 stretches, each ending at a checkpoint flag where jobs swap.
   - The ground is a height map (one height every 4 px), not the engine grid: gentle slopes you walk up, small rock
     steps (30 px: a shield hop clears them; 60 px: lower the shield and jump) and tall GRIP WALLS (130-170 px: nobody
     can jump them). The world is wider and taller than the screen, so the phase runs its own collision (vdClimbBody).
     Pip and Bo pass through each other here (no stacking).
   - Jobs: the SHIELDER holds the action to raise the big shield over their head (slower walk, small hops only); it
     blocks Cinder's fire and the rolling lava rocks for anyone under it. The CLIMBER runs ahead, climbs the grips on a
     grip wall (hold jump / up at the wall), and on top HOLDS the action at the gold hook post (~0.55 s, a ring fills;
     letting go drains it, so mashing can't do it) to unroll a rope ladder. Anyone can climb a dropped ladder (hold jump / up at it). Only the climber can climb grips ("Too heavy!").
     Ladders stay down for good, so the shielder can never be stranded below a wall.
   - Stretch 1 only: until the shield is first raised, whoever holds the action first takes the shield (so a person
     can pick the job; the computer waits 2 s before taking its default). Then jobs swap at every flag ("Swap jobs!").
   - Cinder flies along at the top right and breathes fire: he inhales (1.15 s) while a glowing zone marks where the
     flame lands: on the pair when they stand together (wide zone), else on one of them. Under a raised shield = safe.
     Anyone else on the zone's ground: "Toasty!" (a pop in place, never knocked off a ledge). Never at someone on a
     wall or ladder, nor at someone waiting on a ledge top for the partner to come up (no shield could reach them).
   - Lava rocks (from stretch 2): a rumble, shake and a glowing "!" at the right edge 1.35 s before a rock rolls in from
     the top of the slope. It bounces down steps and walls. Jump it, or let the shield block it (it shatters). A hit
     is a "Bonk!" (a pop in place).
   - The lava pacer: friendly lava rises behind (the valley fills up). It creeps at VDCL.lava.v px/s, speeds up to stay
     about 520 px behind the slower player, and can never pass 170 px before the first wall or flag that both players
     have not cleared yet (so whoever waits at a wall's foot is always dry). Touching it: "Hot foot!" and a pop
     forward onto dry ground; the lava sighs back a little.
   - "Wait for Bo!": nobody gets more than VDCL.maxSep px ahead of the partner sideways. The leash only ever stops the
     one walking away; it never moves anyone, so it can't drag anyone into the lava.
   - Gold help (announced): 3 hot feet in a stretch slow the lava; 4 fire / rock bonks in a stretch make Cinder sleepy
     (longer inhale, fewer attacks); 22 s without progress puts a gold hint over whoever's turn it is and a gold arrow
     at the grips, the hook or the ladder (the news line only the first time per wall or flag). A shielder who walks
     into a 60 px step with the shield still up gets "Big step! Let go of F, then jump W!" (a kid holding the shield
     button forever would otherwise be stuck there; the 22 s gold hint says the same).
   - Cinder waits (no attacks, lava stops) during cards, cutscenes, celebrations and while nobody plays (vdCalm).
   Stats (st.stats.climb): stretch times, hot feet, ladders, rocks, rock blocks. Every top-level name starts with
   vdClimb / VDCL (Sfx.extra.vdClimb*). State lives in st.ph (fresh every phase start). */
const VDCL = {
  cell: 4, stepUp: 7, snap: 9, x0: -1200, y0: 450,
  climbV: 170, ladderV: 150, downV: 200, reach: 9,
  maxSep: 440, hookR: 46, unrollT: 0.6, holdT: 0.55,
  fire: { inhale: 1.15, firstInhale: 1.7, sleepyInhale: 1.6, breathe: 0.9, w: 150, wOne: 130, h: 110 },
  rock: { r: 14, vx: 185, g: 1500, bounce: 0.42, warn: 1.35, life: 14 },
  lava: { v: 28, gap: 520, catch: 2.2, cap: 170, back: 220, rise: 70, slowK: 0.45 },
  goldLava: 3, goldBonks: 4, stuckT: 22, lockT: 8, claimWait: 2,
};
// The hand-made course. Tokens: 'f N' flat N px; 'u N R' a slope rising R px over N px; 's H' a rock step H px up;
// 'W H' a grip wall H px up (with a hook post on top); 'F' the stretch's checkpoint flag.
// every: s between attacks; pattern: F fire, R rock (cycled); first: s before the first attack; lavaK: lava speed.
const VDCL_STRETCHES = [
  { name: 'Ashy Foothills', every: 6.2, pattern: 'F', first: 3.2, lavaK: 0.8,
    course: 'f 360|u 240 60|f 120|s 30|f 160|W 130|f 200|u 300 90|f 100|s 30|f 160|W 140|f 200|u 160 40|f 80|F|f 160' },
  { name: 'Rumbly Ramp', every: 5.3, pattern: 'RF', first: 2.4, lavaK: 1,
    course: 'u 260 80|f 100|s 60|f 160|W 150|f 160|u 280 100|f 120|s 30|f 80|s 30|f 160|W 130|f 180|u 200 60|f 140|W 140|f 200|u 120 30|f 80|F|f 160' },
  { name: 'Smoky Switchback', every: 4.9, pattern: 'FRFF', first: 2.2, lavaK: 1.1,
    course: 'u 200 60|s 30|f 140|W 160|f 120|u 240 80|f 140|s 60|f 140|W 140|f 140|u 220 70|f 100|s 30|f 140|W 150|f 160|u 200 60|f 120|F|f 160' },
  { name: 'Crater Rim', every: 4.5, pattern: 'RFRRF', first: 2.2, lavaK: 1.2,
    course: 'u 240 80|f 120|W 150|f 120|s 30|f 60|s 30|f 160|u 260 90|f 120|W 170|f 160|u 220 60|f 100|s 60|f 140|W 140|f 160|u 160 40|f 160|F|f 520' },
];
const VDCL_LINES = ['Grr! Nobody climbs MY mountain!', 'Stop climbing! *hic*', 'You again?! Toasty time!', 'Not my crater! Grrr!'];
const vdClimbSolo = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);

/* ---------- the course: tokens -> heights (one per 4 px), steps, walls, flags ---------- */
function vdClimbCompile() {
  const K = VDCL, h = [], steps = [], walls = [], flags = [], spans = [];
  let x = K.x0, y = K.y0 + 300;
  const push = (len, fn) => { const n = Math.max(1, Math.round(len / K.cell)); for (let i = 0; i < n; i++) h.push(fn(i, n)); x += n * K.cell; };
  const slope = (len, rise) => { const y0 = y; push(len, (i, n) => { const u = (i + 0.5) / n; return y0 - rise * (u * u * (3 - 2 * u)); }); y = y0 - rise; };
  slope(-K.x0, 300);   // the lead-in below the start, where the lava rises from
  VDCL_STRETCHES.forEach((S, k) => {
    const x0 = x;
    for (const tk of S.course.split('|')) {
      const [c, a, b] = tk.trim().split(/\s+/), n1 = +a, n2 = +b;
      if (c === 'f') push(n1, () => y);
      else if (c === 'u') slope(n1, n2);
      else if (c === 's') { steps.push({ x, base: y, top: y - n1, k }); y -= n1; }
      else if (c === 'W') { walls.push({ i: walls.length, k, face: x, base: y, top: y - n1, hookX: x + 26, unroll: 0, down: false, hold: 0, dropT: 0, by: -1, cleared: false, gold: false }); y -= n1; }
      else if (c === 'F') flags.push({ k, x: x + 30, y, got: false, t: 0 });
    }
    spans.push({ x0, x1: x });
  });
  // the gates the lava may not pass (walls and flags, in course order)
  const gates = walls.map(w => ({ x: w.face, w })).concat(flags.map(f => ({ x: f.x - 30, f }))).sort((a, b) => a.x - b.x);
  return { X0: K.x0, h, steps, walls, flags, spans, gates, xMax: x, yTop: y };
}
const vdClimbCellOf = (ph, x) => clamp(Math.floor((x - ph.c.X0) / VDCL.cell), 0, ph.c.h.length - 1);
const vdClimbCellX = (ph, c) => ph.c.X0 + c * VDCL.cell;
const vdClimbG = (ph, x) => ph.c.h[vdClimbCellOf(ph, x)];
// the highest ground (smallest y) under [x, x + w]
function vdClimbSup(ph, x, w) {
  const c0 = vdClimbCellOf(ph, x + 0.01), c1 = vdClimbCellOf(ph, x + w - 0.01), h = ph.c.h;
  let m = Infinity;
  for (let c = c0; c <= c1; c++) if (h[c] < m) m = h[c];
  return m;
}
const vdClimbCx = p => p.x + p.w / 2;
const vdClimbFeet = p => p.y + p.h;
// p stands on top of wall w
const vdClimbTopped = (p, w) => vdClimbCx(p) > w.face + 2 && vdClimbFeet(p) <= w.top + 3;
const vdClimbBusy = (st, p) => { const P = st.ph && st.ph.P && st.ph.P[p.id]; return !!(P && P.climb); };
// the stretch k's walls
const vdClimbWallsOf = (ph, k) => ph.c.walls.filter(w => w.k === k);

/* ---------- moving on the height map ---------- */
function vdClimbMoveX(ph, p, dx) {
  if (!dx) return;
  const K = VDCL, feet = p.y + p.h, h = ph.c.h;
  let nx = p.x + dx;
  if (dx > 0) {
    const c0 = vdClimbCellOf(ph, p.x + p.w - 0.01), c1 = vdClimbCellOf(ph, nx + p.w - 0.01);
    for (let c = c0 + 1; c <= c1; c++) if (h[c] < feet - K.stepUp) { nx = vdClimbCellX(ph, c) - p.w; p.vx = Math.min(0, p.vx); break; }
  } else {
    const c0 = vdClimbCellOf(ph, p.x + 0.01), c1 = vdClimbCellOf(ph, nx + 0.01);
    for (let c = c0 - 1; c >= c1; c--) if (h[c] < feet - K.stepUp) { nx = vdClimbCellX(ph, c + 1); p.vx = Math.max(0, p.vx); break; }
  }
  const lo = ph.c.X0 + 8, hi = ph.c.xMax - p.w - 8;
  if (nx < lo) { nx = lo; p.vx = Math.max(0, p.vx); }
  if (nx > hi) { nx = hi; p.vx = Math.min(0, p.vx); }
  p.x = nx;
  const sup = vdClimbSup(ph, p.x, p.w);
  if (sup < feet && feet - sup <= K.stepUp + 0.01) p.y = sup - p.h;   // walk up the slope (or onto a ledge corner)
}
function vdClimbMoveY(ph, p, dt) {
  const K = VDCL, sup = vdClimbSup(ph, p.x, p.w), feet = p.y + p.h, was = p.grounded;
  if (p.vy >= 0 && (feet + p.vy * dt >= sup - 0.01 || (was && sup - feet <= K.snap))) {
    p.y = sup - p.h; p.vy = 0; p.grounded = true;
  } else { p.y += p.vy * dt; p.grounded = false; }
  p.tileGround = p.grounded; p.onPartner = false; p.onOneWay = false;
  if (p.grounded && !was && p.lastVy > 260) { p.sx = 1.25; p.sy = 0.78; puff(p.x + p.w / 2, p.y + p.h, 5, 'rgba(255,255,255,0.75)'); Sfx.play('land'); }
  p.lastVy = p.grounded ? 0 : p.vy;
}
// a wall face p could grab right now: grips for the climber, a dropped ladder for anyone
function vdClimbReach(st, p) {
  const ph = st.ph, r = p.x + p.w, feet = vdClimbFeet(p), K = VDCL;
  for (const w of ph.c.walls) {
    if (r < w.face - K.reach || r > w.face + 1 || feet < w.top + 8 || feet > w.base + 2) continue;
    if (w.down && w.unroll >= 0.8) return { w, kind: 'ladder' };
    if (p.id !== ph.sh) return { w, kind: 'grip' };
    return { w, kind: 'none' };
  }
  return null;
}
// one player's movement this tick (inp: what they press; the cards and cutscenes pass NO_INPUT)
function vdClimbBody(st, p, dt) {
  const ph = st.ph, P = ph.P[p.id], K = VDCL, inp = p.input;
  if (P.climb) {
    const c = P.climb, w = c.w, up = inp.jump || inp.up, dn = inp.down && !up;
    p.stun = Math.max(0, p.stun - dt); p.pendingJump = false;
    p.x = w.face - p.w; p.vx = 0; p.grounded = false; p.face = 1;
    if (inp.left && !up) { P.climb = null; p.vx = -90; p.vy = 0; p.x -= 2; p.coyote = 0; return; }   // let go (no coyote jump in mid-air)
    const v = up ? (c.kind === 'ladder' ? K.ladderV : K.climbV) : dn ? K.downV : 0;
    p.vy = 0; p.y += (up ? -v : v) * dt;
    if (up || dn) { P.climbAnim += dt * 9; p.sx = 1 + Math.sin(P.climbAnim) * 0.06; p.sy = 1 - Math.sin(P.climbAnim) * 0.06; if ((P.gripSnd -= dt) <= 0) { P.gripSnd = 0.22; Sfx.play('vdClimbGrip', p.id); } }
    if (p.y + p.h <= w.top + 1) {           // over the top: step onto the ledge
      p.y = w.top - p.h; p.x = w.face + 3; P.climb = null; p.grounded = true; p.vy = 0; p.lastVy = 0;
      p.sx = 0.8; p.sy = 1.2; Sfx.play('land'); puff(p.x + p.w / 2, w.top, 5, 'rgba(255,255,255,0.75)');
      if (c.kind === 'grip') vdStats(st).grips = (vdStats(st).grips || 0) + 1;
    } else if (p.y + p.h >= w.base) { p.y = w.base - p.h; if (dn) { P.climb = null; p.grounded = true; } }
    return;
  }
  const want = inp.jump || inp.up || p.pendingJump;
  if (want && p.stun <= 0) {
    const r = vdClimbReach(st, p);
    if (r && r.kind !== 'none') { P.climb = { w: r.w, kind: r.kind }; P.climbAnim = 0; p.pendingJump = false; p.jumpBuf = 0; p.vy = 0; vdShield(st, p.id, false); vdClimbDone(st, p.id, ['grip', 'ladder', 'waitL', 'start', 'gold']); return; }
    if (r && r.kind === 'none' && (p.pendingJump || inp.up)) {
      const cl = 1 - p.id;
      vdClimbTip(st, p.id, 'heavy', 'Too heavy to climb! ' + NAMES[cl] + ' drops a ladder.', 4, { cpu: null });
    }
  }
  vdControl(st, p, dt);
  vdClimbMoveX(ph, p, p.vx * dt);
  vdClimbMoveY(ph, p, dt);
}
function vdClimbStill(st, dt) {
  for (const p of G.players) {
    p.pendingJump = false; p.pendingAct = false;
    const real = p.input; p.input = NO_INPUT;
    try { vdClimbBody(st, p, dt); } finally { p.input = real; }
  }
}

/* ---------- the camera and the leash ---------- */
function vdClimbCam(st, snap, dt = DT) {
  const ps = G.players, xs = ps.map(vdClimbCx), fs = ps.map(vdClimbFeet);
  const lo = Math.min(xs[0], xs[1]), hi = Math.max(xs[0], xs[1]), top = Math.min(ps[0].y, ps[1].y), bot = Math.max(fs[0], fs[1]);
  let tx = (lo + hi) / 2 + 70 - W / 2, ty = (fs[0] + fs[1]) / 2 - H * 0.64;
  tx = Math.min(tx, lo - 70); tx = Math.max(tx, hi + 70 - W);
  ty = Math.min(ty, top - 110); ty = Math.max(ty, bot + 34 - H);
  tx = clamp(tx, st.ph.c.X0, st.ph.c.xMax - W);
  const c = st.cam;
  if (snap) { c.x = tx; c.y = ty; return; }
  const k = Math.min(1, dt * 3.5);
  c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
  // both always on screen (hard edges)
  c.x = Math.min(c.x, lo - 40); c.x = Math.max(c.x, hi + 40 - W);
  c.y = Math.min(c.y, top - 70); c.y = Math.max(c.y, bot + 16 - H);
}
function vdClimbLeash(st, xb) {
  const ps = G.players, ph = st.ph;
  if (Math.abs(vdClimbCx(ps[0]) - vdClimbCx(ps[1])) <= VDCL.maxSep) return;
  for (const p of ps) {
    const o = ps[1 - p.id];
    if (ph.P[p.id].climb || Math.abs(p.x - o.x) <= Math.abs(xb[p.id] - o.x)) continue;   // only the one moving away
    p.x = xb[p.id]; p.vx = 0;
    const P = ph.P[p.id];
    if (P.waitCD <= 0) {
      P.waitCD = 3.2;
      vdPop(st, vdClimbCx(p), p.y - 26, 'Wait for ' + NAMES[o.id] + '!', PCOL[o.id], 17);
      if (typeof cpuSay === 'function' && cpuOn(o.id)) cpuSay(o, 'Wait for me!');
    }
  }
}

/* ---------- hints (each player's own keys) ---------- */
function vdClimbTip(st, id, key, text, again = 6, o = {}) {
  const T0 = st.ph.tipT[id];
  if (T0[key] != null && st.phT - T0[key] < again) return;
  T0[key] = st.phT;
  vdHint(st, id, text, { life: o.life || 2.8, gold: !!o.gold, cpu: o.cpu });
  st.ph.hintKey[id] = key;
}
// (on touch: name the round button by its word, "the shield button")
function vdClimbAct(id) {
  const st = G.mst, w = st && st.ph && st.ph.sh != null ? (id === st.ph.sh ? 'shield' : 'ladder') : '';
  return w && vdDev(id) === 'touch' ? 'the ' + w + ' button' : vdKey(id, 'act');
}
const vdClimbUp = id => vdKey(id, 'jump');
// that player did it: take down a hint about it that is still showing
function vdClimbDone(st, id, keys) { if (st.hints[id] && keys.includes(st.ph.hintKey[id])) st.hints[id] = null; }
// the shielder walks into a rock step too tall for a shield hop (a 60 px step): they must lower the shield to jump it
// (loose: standing just short of it, pushing or not, for the stuck help)
function vdClimbBigStep(st, p, loose) {
  const ph = st.ph;
  if (p.id !== ph.sh || !(loose || p.input.right) || !p.grounded || ph.P[p.id].climb || !vdShieldUp(st, p.id)) return false;
  const rise = vdClimbFeet(p) - vdClimbG(ph, p.x + p.w + (loose ? 24 : 6));
  return rise > 36 && rise < 110;
}
const vdClimbBigText = id => 'Big step! Let go of ' + vdClimbAct(id) + ', then jump ' + vdClimbUp(id) + '!';
function vdClimbHints(st) {
  const ph = st.ph, ps = G.players, sh = ph.sh, cl = 1 - sh, S = ps[sh], Cl = ps[cl];
  if (vdCalm(st)) return;
  if (vdClimbBigStep(st, S)) vdClimbTip(st, sh, 'bigstep', vdClimbBigText(sh), 6, { cpu: null });
  // the climber at a wall's foot with no ladder yet: climb the grips
  for (const w of ph.c.walls) {
    if (w.cleared) continue;
    const nearC = !ph.P[cl].climb && Cl.grounded && Math.abs(Cl.x + Cl.w - w.face) < 40 && vdClimbFeet(Cl) > w.top + 8;
    if (nearC && !w.down) vdClimbTip(st, cl, 'grip', 'Hold ' + vdClimbUp(cl) + ' at the wall: climb the grips!', 6);
    if (vdClimbTopped(Cl, w) && !w.down && Math.abs(vdClimbCx(Cl) - w.hookX) < 90) vdClimbTip(st, cl, 'hook', 'Hold ' + vdClimbAct(cl) + ' at the hook: drop the ladder!', 5);
    const nearS = !ph.P[sh].climb && S.grounded && Math.abs(S.x + S.w - w.face) < 60 && vdClimbFeet(S) > w.top + 8;
    if (nearS && w.down && w.unroll >= 0.8) vdClimbTip(st, sh, 'ladder', 'Hold ' + vdClimbUp(sh) + ' at the ladder: climb up!', 6);
    else if (nearS && !w.down && !vdClimbTopped(Cl, w)) vdClimbTip(st, sh, 'waitL', 'Shield ' + NAMES[cl] + ' while they climb!', 9);
    break;
  }
}

/* ---------- Cinder: flies along at the top right; fire breath ---------- */
function vdClimbCinder(st, dt) {
  const c = st.cinder, ph = st.ph, ps = G.players;
  const lead = Math.max(vdClimbCx(ps[0]), vdClimbCx(ps[1]));
  const breathing = st.fires.some(f => f.phase !== 'out');
  if (!breathing) {
    ph.cinX = clamp(lead + 320, st.cam.x + 600, st.cam.x + W - 110);
    ph.cinY = st.cam.y + 178 + Math.sin(st.phT * 0.9) * 14;
  }
  c.x += (ph.cinX - c.x) * Math.min(1, dt * 1.6);
  c.y += (ph.cinY - c.y) * Math.min(1, dt * 1.6);
  c.air = true; if (c.pose !== 'fly') c.pose = 'fly';
  c.gy = vdClimbG(ph, c.x);
  const tgt = ps[ph.fireWho] || ps[0];
  c.look = { x: vdClimbCx(tgt), y: tgt.y };
  if (!breathing && Math.abs(vdClimbCx(tgt) - c.x) > 10) c.face = vdClimbCx(tgt) < c.x ? -1 : 1;
}
// the flame only reaches whoever is on the zone's own ground (or hopping just over it), never someone up on a
// higher step or ledge that the tall zone box happens to overlap
function vdClimbFireHit(st, p, f) {
  const ph = st.ph;
  if (vdClimbSup(ph, p.x, p.w) < f.gy - 12 || vdClimbFeet(p) < f.gy - 64) return false;
  return vdBonk(st, p, { kind: 'fire', word: f.word, to: { x: vdClimbCx(p), y: vdClimbFeet(p) } });
}
function vdClimbBreathe(st) {
  const ph = st.ph, ps = G.players, K = VDCL.fire;
  // never at someone on a wall, nor at someone waiting on a ledge top for the partner to come up (no shield can reach)
  const waiting = p => ph.c.walls.some(w => !w.cleared && vdClimbTopped(p, w) && vdClimbCx(p) - w.face < 170);
  const free = ps.filter(p => !vdClimbBusy(st, p) && !waiting(p));
  if (!free.length) return false;
  const [a, b] = ps;
  let x, w, t;
  if (free.length === 2 && Math.abs(vdClimbCx(a) - vdClimbCx(b)) < 120 && Math.abs(vdClimbFeet(a) - vdClimbFeet(b)) < 30) {
    x = (vdClimbCx(a) + vdClimbCx(b)) / 2; w = K.w; t = ps[ph.sh];
  } else {
    ph.fireWho = 1 - ph.fireWho;
    t = free.find(p => p.id === ph.fireWho) || free[0];
    x = vdClimbCx(t) + clamp(t.vx, -120, 120) * 0.3; w = K.wOne;
  }
  ph.fireWho = t.id;
  const gy = t.grounded ? vdClimbFeet(t) : vdClimbG(ph, x);
  const inhale = ph.fires === 0 ? K.firstInhale : ph.sleepy ? K.sleepyInhale : K.inhale;
  const f = vdFire(st, { x, w, gy, h: K.h, inhale, breathe: K.breathe, target: t.id, onHit: vdClimbFireHit });
  if (!f) return false;
  ph.fires++;
  if (ph.fires === 1 || ph.fires % 7 === 3) vdSay(st, ph.fires === 1 ? 'Toasty time! *inhales*' : ['Hot hot hot!', 'Here comes my fire!', 'Toast for two!'][ph.fires % 3], 1.8);
  // hints: the shielder raises the shield, the other gets under it
  const sh = ph.sh, z = vdFireZone(f);
  for (const p of ps) {
    if (!rectHit(p, z.x0 - 30, z.y0, z.x1 - z.x0 + 60, z.y1 - z.y0)) continue;
    if (p.id === sh) vdClimbTip(st, sh, 'shield', 'Fire! Hold ' + vdClimbAct(sh) + ': shield up!', ph.fires <= 2 ? 0 : 7, { life: f.inhale + 0.6 });
    else vdClimbTip(st, p.id, 'under', ph.fires <= 3 ? 'Fire! Hide under ' + NAMES[sh] + "'s shield!" : 'Under the shield!', ph.fires <= 3 ? 0 : 7, { life: f.inhale + 0.6 });
  }
  return true;
}

/* ---------- lava rocks: a rumble at the top of the slope, then one rolls and bounces down ---------- */
function vdClimbRock(st) {
  const ph = st.ph, K = VDCL.rock;
  const sx = Math.min(st.cam.x + W + 70, ph.c.xMax - 40);
  if (sx < Math.max(vdClimbCx(G.players[0]), vdClimbCx(G.players[1])) + 160) return false;
  const g = vdClimbG(ph, sx);
  ph.rocks.push({ x: sx, y: g - K.r - 60, vx: -K.vx * (0.92 + vdRand() * 0.16), vy: 0, r: K.r, rot: 0, warn: K.warn, t: 0, gone: false, thudCD: 0 });
  ph.rockN++; vdStats(st).rocks = (vdStats(st).rocks || 0) + 1;
  Sfx.play('vdClimbRumble');
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.12);
  const first = ph.rockN <= 2;
  for (const p of G.players) {
    if (vdClimbBusy(st, p)) continue;
    vdWarn(st, p.id, K.warn);
    vdClimbTip(st, p.id, 'rock', first ? 'Rock coming! Jump it (' + vdClimbUp(p.id) + ') or hide under the shield!' : 'Rock! Jump or shield!', first ? 0 : 8, { life: 2.6 });
  }
  if (ph.rockN === 1) vdSay(st, 'Rock and roll! Hee hee!', 2);
  return true;
}
function vdClimbSmash(st, r, col) {
  r.gone = true;
  burst(r.x, r.y, col || '#ffb347', 10); burst(r.x, r.y, '#5a4a55', 6);
  Sfx.play('vdClimbSmash');
}
function vdClimbRocks(st, dt) {
  const ph = st.ph, K = VDCL.rock;
  for (const r of ph.rocks) {
    if (r.gone) continue;
    if (r.warn > 0) { r.warn -= dt; continue; }
    r.t += dt; r.thudCD -= dt;
    r.vy = Math.min(r.vy + K.g * dt, 900);
    r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.vx * dt / r.r;
    const g = vdClimbG(ph, r.x);
    if (r.y + r.r >= g) {
      r.y = g - r.r;
      if (r.vy > 260) {
        r.vy = -r.vy * K.bounce;
        if (r.thudCD <= 0) { r.thudCD = 0.15; Sfx.play('vdClimbThud'); }
        for (let n = 0; n < 4; n++) G.particles.push({ x: r.x, y: g, vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 120, life: 0.4, max: 0.4, col: n % 2 ? '#ffb347' : '#6b5a60', size: 3 + Math.random() * 2, grav: 600, kind: 'dot' });
      } else r.vy = 0;
    }
    if ((G.tickN % 6) === 0) G.particles.push({ x: r.x + r.r * 0.6, y: r.y - r.r * 0.3, vx: 40 + Math.random() * 30, vy: -30 - Math.random() * 40, life: 0.35, max: 0.35, col: '#ffcf6a', size: 2.5, grav: 0, kind: 'dot' });
    // the shield dome blocks it (and anyone under a raised shield is covered)
    const dome = vdShieldHit(st, r.x, r.y, r.r);
    if (dome >= 0) { vdShieldBlock(st, dome, r.x, r.y - r.r); vdClimbSmash(st, r); vdStats(st).blocks = (vdStats(st).blocks || 0) + 1; vdPop(st, r.x, r.y - 30, 'Clang!', C.gold, 18); continue; }
    for (const p of G.players) {
      if (vdClimbBusy(st, p)) continue;
      const nx = clamp(r.x, p.x, p.x + p.w), ny = clamp(r.y, p.y, p.y + p.h);
      if ((nx - r.x) ** 2 + (ny - r.y) ** 2 > (r.r - 2) ** 2) continue;
      const u = vdUnderShield(st, p);
      if (u >= 0) { vdShieldBlock(st, u, r.x, r.y - r.r); vdClimbSmash(st, r); vdStats(st).blocks = (vdStats(st).blocks || 0) + 1; vdPop(st, r.x, r.y - 30, 'Clang!', C.gold, 18); break; }
      vdBonk(st, p, { kind: 'rock', word: 'Bonk!', to: { x: vdClimbCx(p), y: vdClimbFeet(p) } });
    }
    if (r.gone) continue;
    if (r.y + r.r > ph.lava.y && g >= ph.lava.y - 2) { r.gone = true; Sfx.play('vdClimbSizzle'); for (let n = 0; n < 5; n++) st.smoke.push({ x: r.x + (n - 2) * 6, y: ph.lava.y - 4, vx: (n - 2) * 8, vy: -40 - n * 8, r: 6 + n, t: 0, life: 1 }); continue; }
    if (r.x < st.cam.x - 140 || r.t > K.life) r.gone = true;
  }
  if (ph.rocks.some(r => r.gone)) ph.rocks = ph.rocks.filter(r => !r.gone);
}

/* ---------- the lava pacer ---------- */
function vdClimbGate(st) {
  const ph = st.ph;
  for (const g of ph.c.gates) {
    if (g.w && !g.w.cleared) return g;
    if (g.f && !g.f.got) return g;
  }
  return null;
}
function vdClimbLava(st, dt) {
  const ph = st.ph, L = ph.lava, K = VDCL.lava, ps = G.players;
  const gate = vdClimbGate(st), cap = gate ? gate.x - K.cap : ph.c.xMax;
  if (!vdCalm(st)) {
    const trail = Math.min(vdClimbCx(ps[0]), vdClimbCx(ps[1]));
    let v = K.v * VDCL_STRETCHES[ph.k].lavaK * (ph.lavaSlow ? K.slowK : 1);
    const gap = trail - L.x;
    if (gap > K.gap) v += (gap - K.gap) * K.catch;
    L.x = Math.min(L.x + v * dt, Math.max(L.x, cap));
  }
  const want = vdClimbG(ph, L.x) + 10;
  L.y = approach(L.y, want, K.rise * dt * (want < L.y ? 1 : 1.5));
  // the front: where the ground comes up out of the lava
  let c = vdClimbCellOf(ph, L.x);
  while (c < ph.c.h.length - 1 && ph.c.h[c] > L.y) c++;
  while (c > 0 && ph.c.h[c - 1] <= L.y) c--;
  L.front = vdClimbCellX(ph, c);
  // hot feet: popped forward onto dry ground
  for (const p of ps) {
    if (vdClimbBusy(st, p) || st.safe[p.id] > 0) continue;
    const g = vdClimbG(ph, vdClimbCx(p));
    if (g < L.y - 2 || vdClimbFeet(p) < L.y - 4) continue;
    let sx = L.front + 70;
    const lim = gate ? gate.x - 40 : ph.c.xMax - 60;
    while (sx < lim && vdClimbG(ph, sx) > L.y - 26) sx += 8;
    sx = Math.min(sx, lim);
    if (vdBonk(st, p, { kind: 'lava', to: { x: sx, y: vdClimbSup(ph, sx - p.w / 2, p.w) }, safe: 1.6 })) {
      ph.hot++; vdStats(st).hot = (vdStats(st).hot || 0) + 1;
      L.x -= K.back;
      Sfx.play('vdClimbSizzle');
      if (ph.hot >= VDCL.goldLava && !ph.lavaSlow) { ph.lavaSlow = true; vdHelp(st, 'Gold help: the lava takes a nap! It creeps slower now.'); }
      else vdClimbTip(st, p.id, 'hot', 'Hot foot! Keep climbing, the lava is coming!', 6);
    }
  }
}

/* ---------- jobs, walls, flags ---------- */
function vdClimbJobs(st) {
  const ph = st.ph, ps = G.players;
  // stretch 1: until the shield is first up, whoever holds the action first takes it
  if (!ph.locked) {
    const cl = 1 - ph.sh, sWant = ps[ph.sh].input.act, cWant = ps[cl].input.act;
    if (cWant && !sWant && !ph.P[cl].climb) {
      ph.sh = cl; ph.locked = true;
      vdNews(st, NAMES[cl] + ' takes the shield! ' + NAMES[1 - cl] + ' climbs.', false, 3);
      vdShowBadges(st, 4); vdActLabels(st); Sfx.play('vdSwap');
    } else if (sWant || st.phT > VDCL.lockT || ps.some(p => ph.P[p.id].climb)) ph.locked = true;
  }
  for (const p of ps) {
    const P = ph.P[p.id];
    vdShield(st, p.id, p.id === ph.sh && !P.climb && !!p.input.act);
    if (p.id === ph.sh && p.input.act) vdClimbDone(st, p.id, ['shield', 'start']);
    else if (p.id === ph.sh) vdClimbDone(st, p.id, ['bigstep']);
  }
  // the climber's action: hold it at the hook post to lower the ladder (a hold, so mashing can't do it)
  const cl = ps[1 - ph.sh];
  for (const w of ph.c.walls) {
    if (w.down) continue;
    const at = !ph.P[cl.id].climb && vdClimbTopped(cl, w) && Math.abs(vdClimbCx(cl) - w.hookX) < VDCL.hookR;
    if (at && cl.input.act) w.hold += DT; else w.hold = Math.max(0, w.hold - DT * 2.5);
    if (w.hold >= VDCL.holdT) {
      w.down = true; w.by = cl.id; w.dropT = 0; w.hold = 0;
      vdStats(st).ladders = (vdStats(st).ladders || 0) + 1;
      Sfx.play('vdClimbLadder'); vdPop(st, w.hookX, w.top - 46, 'Ladder down!', C.gold, 20);
      if (w.gold) w.gold = false;
      vdClimbDone(st, cl.id, ['hook', 'gold', 'actno']);
      if (typeof cpuSay === 'function' && cpuOn(cl.id)) cpuSay(cl, 'Ladder down! Climb up!');
    } else if (w.hold > 0 && (G.tickN % 12) === 0) Sfx.play('vdClimbGrip', cl.id);
  }
  for (const p of ps) {
    if (!p.pendingAct) continue;
    p.pendingAct = false;
    if (p !== cl || ph.P[p.id].climb) continue;
    if (!ph.c.walls.some(w => !w.down && vdClimbTopped(p, w) && Math.abs(vdClimbCx(p) - w.hookX) < VDCL.hookR)
      && ph.c.walls.some(w => !w.down && Math.abs(vdClimbCx(p) - w.face) < 260)) vdClimbTip(st, p.id, 'actno', 'Climb up first, then hold ' + vdClimbAct(p.id) + ' at the gold hook!', 6);
  }
  for (const w of ph.c.walls) {
    if (w.down && w.unroll < 1) w.unroll = Math.min(1, w.unroll + DT / VDCL.unrollT);
    if (!w.cleared && ps.every(p => vdClimbTopped(p, w) && !ph.P[p.id].climb)) {
      w.cleared = true; ph.progT = 0;
      if (w.gold) w.gold = false;
      vdPop(st, w.face + 60, w.top - 50, 'Up!', '#9fe07f', 22); Sfx.play('vdDing');
      if (w.i === 0) vdSay(st, 'Hmph! Lucky climb!', 1.8);
    }
  }
}
function vdClimbFlags(st) {
  const ph = st.ph, f = ph.c.flags[ph.k], ps = G.players;
  if (!f || f.got) return;
  if (!ps.every(p => vdClimbCx(p) > f.x - 16 && !ph.P[p.id].climb)) return;
  f.got = true; f.t = 0;
  const S = vdStats(st);
  (S.stretchT || (S.stretchT = [])).push(Math.round((st.phT - ph.kT0) * 10) / 10);
  Sfx.play('vdClimbFlag');
  for (let n = 0; n < 16; n++) confetti(f.x + (Math.random() - 0.5) * 80, f.y - 90);
  for (const r of ph.rocks) if (!r.gone) vdClimbSmash(st, r, C.gold);
  ph.rocks = [];
  if (ph.k >= VDCL_STRETCHES.length - 1) {
    vdPop(st, f.x, f.y - 120, 'The crater rim!', C.gold, 28);
    vdPhaseDone(st, { say: "Hmph! You climbed my mountain... but you'll never dunk me!" });
    return;
  }
  vdPop(st, f.x, f.y - 120, 'Flag ' + (ph.k + 1) + '!', C.gold, 28);
  ph.k++; ph.kT0 = st.phT; ph.sh = 1 - ph.sh; ph.locked = true;
  ph.hot = 0; ph.bonks = 0; ph.lavaSlow = false; ph.sleepy = false; ph.atkN = 0; ph.progT = 0;
  ph.atkT = VDCL_STRETCHES[ph.k].first + 1.6;
  ph.lava.x -= 160;
  vdSwap(st); vdCelebrate(st, 1.8);
  vdNews(st, 'Stretch ' + (ph.k + 1) + ' of 4: ' + VDCL_STRETCHES[ph.k].name, false, 3);
  vdSay(st, VDCL_LINES[ph.k], 2.2);
}

/* ---------- gold help after a long time with no progress ---------- */
function vdClimbStuck(st, dt) {
  const ph = st.ph, ps = G.players;
  if (vdCalm(st)) return;
  const trail = Math.min(vdClimbCx(ps[0]), vdClimbCx(ps[1])) - Math.max(vdClimbFeet(ps[0]), vdClimbFeet(ps[1]));
  if (trail > ph.progBest + 40) { ph.progBest = trail; ph.progT = 0; return; }
  if ((ph.progT += dt) < VDCL.stuckT) return;
  ph.progT = 0; ph.progBest = trail;
  const sh = ph.sh, cl = 1 - sh;
  const w = ph.c.walls.find(w => !w.cleared && w.k === ph.k);
  let id, text;
  const big = ps.find(p => !vdClimbSolo(p.id) && vdClimbBigStep(st, p, true));
  if (big) { id = big.id; text = vdClimbBigText(id); }
  else if (w && !w.down) { id = cl; text = vdClimbTopped(ps[cl], w) ? 'Hold ' + vdClimbAct(cl) + ' at the gold hook!' : 'Hold ' + vdClimbUp(cl) + ' at the wall to climb the grips!'; }
  else if (w) {
    const q = ps.find(p => !vdClimbTopped(p, w)); id = q.id;
    text = Math.abs(q.x + q.w - w.face) < 90 ? 'Hold ' + vdClimbUp(id) + ' at the rope ladder to climb!' : 'Walk right to the rope ladder! ▶';
  } else { id = vdClimbCx(ps[0]) < vdClimbCx(ps[1]) ? 0 : 1; text = 'Walk right to the flag! ▶'; }
  // 1-player: the computer never holds things up for 22 s; a person lagging behind it gets the hint instead
  if (vdClimbSolo(id) && vdClimbCx(ps[1 - id]) < vdClimbCx(ps[id]) - 40) { id = 1 - id; text = 'Walk right to ' + NAMES[1 - id] + '! ▶'; }
  const first = !(w ? w.gold : ph.goldFlag === ph.k);
  if (w) w.gold = true; else ph.goldFlag = ph.k;
  if (first) vdHelp(st, 'Gold help: follow the gold arrow!', { id, hint: text, life: 5 });
  else vdClimbTip(st, id, 'gold', text, 0, { gold: true, life: 5 });
}

/* ---------- the phase ---------- */
VD_PHASES.climb = {
  setup(st, L) {
    const ph = st.ph;
    ph.c = vdClimbCompile();
    ph.sh = L.def.first === 1 ? 1 : 0; ph.locked = false; ph.k = 0; ph.kT0 = 0;
    ph.P = [0, 1].map(() => ({ climb: null, climbAnim: 0, gripSnd: 0, waitCD: 0 }));
    ph.tipT = [{}, {}]; ph.hintKey = ['', ''];
    ph.rocks = []; ph.rockN = 0; ph.fires = 0; ph.fireWho = 1;
    ph.atkT = VDCL_STRETCHES[0].first; ph.atkN = 0; ph.hot = 0; ph.bonks = 0; ph.lavaSlow = false; ph.sleepy = false;
    ph.progT = 0; ph.progBest = -Infinity; ph.started = false;
    ph.lava = { x: VDCL.x0 + 500, y: 0, front: VDCL.x0 };
    ph.lava.y = vdClimbG(ph, ph.lava.x) + 10;
    // Pip and Bo at the foot of the slope (world coords; the screen is world - cam)
    G.players.forEach((p, k) => {
      const x = 120 + k * 44;
      p.x = x - p.w / 2; p.y = vdClimbG(ph, x) - p.h; p.vx = 0; p.vy = 0; p.grounded = true; p.face = 1;
    });
    st.cam = { x: 0, y: 0 };
    vdClimbCam(st, true);
    for (const p of G.players) { p.x -= st.cam.x; p.y -= st.cam.y; }
    const c = st.cinder;
    Object.assign(c, { x: st.cam.x + 760, y: st.cam.y + 178, s: 0.7, air: true, pose: 'fly', face: -1, mood: 'grumpy', baseMood: 'grumpy', lava: null, hidden: false });
    ph.cinX = c.x; ph.cinY = c.y; c.gy = vdClimbG(ph, c.x);
    vdStats(st).stretchT = [];
  },
  wait(st, dt) { vdClimbStill(st, dt); vdClimbCam(st, false, dt); vdClimbCinder(st, dt); },
  coast(st, dt) { vdClimbStill(st, dt); vdClimbCam(st, false, dt); vdClimbLava(st, dt); },
  step(st, dt) {
    const ph = st.ph, ps = G.players;
    if (!ph.started) { ph.started = true; vdSay(st, VDCL_LINES[0], 2.4); for (const p of ps) vdClimbTip(st, p.id, 'start', p.id === ph.sh ? 'Your job: hold ' + vdClimbAct(p.id) + ' to raise the shield!' : 'Your job: run ahead and climb the walls!', 0, { life: 4 }); }
    for (const P of ph.P) P.waitCD -= dt;
    vdClimbJobs(st);
    const xb = ps.map(p => p.x);
    for (const p of ps) vdClimbBody(st, p, dt);
    vdClimbLeash(st, xb);
    // attacks
    if (!vdCalm(st)) {
      ph.atkT -= dt;
      const busyNow = st.fires.some(f => f.phase !== 'out') || ph.rocks.some(r => r.warn > 0);
      if (ph.atkT <= 0 && !busyNow) {
        const S = VDCL_STRETCHES[ph.k], kind = S.pattern[ph.atkN % S.pattern.length];
        const ok = kind === 'R' ? vdClimbRock(st) || vdClimbBreathe(st) : vdClimbBreathe(st);
        if (ok) ph.atkN++;
        ph.atkT = ok ? S.every * (0.85 + 0.3 * vdRand()) * (ph.sleepy ? 1.35 : 1) : 0.7;
      }
    } else if (st.idle || st.celebT > 0) {
      for (const r of ph.rocks) if (!r.gone) vdClimbSmash(st, r, '#cfc6d6');
      ph.rocks = [];
    }
    vdClimbRocks(st, dt);
    vdClimbLava(st, dt);
    vdClimbHints(st);
    vdClimbStuck(st, dt);
    vdClimbFlags(st);
    for (const f of ph.c.flags) if (f.got) f.t += dt;
    for (const w of ph.c.walls) if (w.down) w.dropT += dt;
    vdClimbCam(st, false, dt);
    vdClimbCinder(st, dt);
  },
  onBonk(st, p, kind) {
    const ph = st.ph;
    if (kind === 'fire' || kind === 'rock') {
      ph.bonks++;
      if (ph.bonks >= VDCL.goldBonks && !ph.sleepy) { ph.sleepy = true; vdHelp(st, 'Gold help: Cinder is getting sleepy! Slower fire, fewer rocks.'); }
      else if (kind === 'fire' && (st.stats.bonks[0] + st.stats.bonks[1]) % 4 === 1) vdReact(st, 'smug', 'Ha! Toasty!', 1.4);
    }
  },
  busy: (st, p) => vdClimbBusy(st, p),
  labels(st) { return st.ph.sh === 0 ? ['shield', 'ladder'] : ['ladder', 'shield']; },
  roles(st) { return st.ph.sh === 0 ? ['Shield!', 'Climb!'] : ['Climb!', 'Shield!']; },
  legend() {
    return { pip: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump · climb', bo: '<kbd>←</kbd><kbd>→</kbd> move <kbd>↑</kbd> jump · climb', padJump: 'jump/climb', padDown: 'down climbs down' };
  },
  hudText(st) { return 'Flags ' + st.ph.c.flags.filter(f => f.got).length + '/4'; },
  progress(st) { return { n: st.ph.c.flags.filter(f => f.got).length, of: 4 }; },
  headLift: () => 0,
  drawBack(st) { vdClimbDrawBack(st); },
  draw(st) { vdClimbDrawRocks(st); },
  drawTop(st) { vdClimbDrawTop(st); },
  hud(st) { vdClimbHud(st); },
};

/* ---------- drawing ---------- */
const VDCLC = { rock: '#3d3340', rockLt: '#5a4c5c', rockDk: '#271f2b', crust: '#76606e', glow: '#ff9a3c', glowLt: '#ffd27a', wall: '#4a3d4f', wallLt: '#61506a', rope: '#e0a868', rung: '#8f5a2e', post: '#7a4c2a' };
function vdClimbDrawBack(st) {
  const ph = st.ph, cam = st.cam, t = G.clock;
  // sky and far scenery (screen coords): the sunset, the summit ahead, a far ridge with parallax
  vdScreen(st, () => {
    const climbed = clamp((VDCL.y0 - (cam.y + H * 0.64)) / 1900, 0, 1), along = clamp(cam.x / ph.c.xMax, 0, 1);
    vdDrawBackdrop(t, { x: 400 - along * 120, y: 300 + climbed * 70 });   // a neighbour volcano far away (ours is underfoot)
    ctx.fillStyle = 'rgba(255,170,100,0.12)';
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 360 + climbed * 120 + Math.sin((x + cam.x * 0.2) * 0.006) * 30 + Math.sin((x + cam.x * 0.2) * 0.017) * 10);
    ctx.lineTo(W, H); ctx.fill();
    ctx.fillStyle = '#4a2632';
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) { const wx = x + cam.x * 0.32; ctx.lineTo(x, 430 + climbed * 90 - (cam.y - VDCL.y0) * 0.04 + Math.sin(wx * 0.009 + 1) * 26 + Math.sin(wx * 0.023) * 9); }
    ctx.lineTo(W, H); ctx.fill();
    // embers drifting up (a pure function of time)
    for (let k = 0; k < 18; k++) {
      const u = (t * (0.05 + (k % 5) * 0.012) + k * 0.137) % 1, x = (k * 173.3 + Math.sin(t * 0.7 + k) * 30 - cam.x * 0.15) % W;
      ctx.fillStyle = `rgba(255,${160 + (k % 3) * 30},80,${0.55 * (1 - u)})`; circle((x + W) % W, H - u * H, 1.6 + (k % 3) * 0.7); ctx.fill();
    }
  });
  vdClimbDrawGround(st);
  vdClimbDrawLavaPool(st);
}
function vdClimbDrawGround(st) {
  const ph = st.ph, cam = st.cam, K = VDCL, h = ph.c.h, t = G.clock;
  const c0 = vdClimbCellOf(ph, cam.x - 40), c1 = vdClimbCellOf(ph, cam.x + W + 40), bot = cam.y + H + 20;
  const pts = [];
  for (let c = c0; c <= c1; c++) {
    if (c > c0 && Math.abs(h[c] - h[c - 1]) > K.stepUp) { pts.push([vdClimbCellX(ph, c), h[c - 1]]); pts.push([vdClimbCellX(ph, c), h[c]]); }
    else pts.push([vdClimbCellX(ph, c) + K.cell / 2, h[c]]);
  }
  const x0 = vdClimbCellX(ph, c0), x1 = vdClimbCellX(ph, c1 + 1);
  const path = () => { ctx.beginPath(); ctx.moveTo(x0, bot); ctx.lineTo(x0, pts[0][1]); for (const q of pts) ctx.lineTo(q[0], q[1]); ctx.lineTo(x1, pts[pts.length - 1][1]); ctx.lineTo(x1, bot); ctx.closePath(); };
  const g = ctx.createLinearGradient(0, cam.y, 0, cam.y + H);
  g.addColorStop(0, '#4b3c4f'); g.addColorStop(1, '#2a2130');
  ctx.fillStyle = g; path(); ctx.fill();
  ctx.save(); path(); ctx.clip();
  // speckles and glowing cracks under the surface (a pure function of x)
  for (let x = Math.floor((cam.x - 40) / 46) * 46; x < cam.x + W + 40; x += 46) {
    const hs = hash(x, 11), gy = vdClimbG(ph, x);
    ctx.fillStyle = VDCLC.rockLt; ctx.beginPath(); ctx.ellipse(x + (hs % 20), gy + 22 + (hs >> 5) % 50, 7 + hs % 6, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = VDCLC.rockDk; ctx.beginPath(); ctx.ellipse(x + 20 + (hs >> 3) % 14, gy + 60 + (hs >> 8) % 60, 9, 4, 0.3, 0, Math.PI * 2); ctx.fill();
    if (hs % 3 === 0) {
      const a = 0.55 + 0.35 * Math.sin(t * 2 + x * 0.05);
      ctx.strokeStyle = `rgba(255,140,50,${a})`; ctx.lineWidth = 2.5; ctx.beginPath();
      let cx = x + 10, cy = gy + 6; ctx.moveTo(cx, cy);
      for (let n = 0; n < 4; n++) { cx += ((hash(x, n) % 17) - 8); cy += 10 + hash(n, x) % 9; ctx.lineTo(cx, cy); }
      ctx.stroke();
    }
  }
  ctx.restore();
  // the crust along the top
  ctx.strokeStyle = VDCLC.crust; ctx.lineWidth = 5; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1] + 2); for (const q of pts) ctx.lineTo(q[0], q[1] + 2); ctx.stroke();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts) ctx.lineTo(q[0], q[1]); ctx.stroke();
  // rock steps: a block outline on the face
  for (const s of ph.c.steps) {
    if (s.x < cam.x - 60 || s.x > cam.x + W + 60) continue;
    ctx.fillStyle = VDCLC.rockLt; ctx.fillRect(s.x, s.top + 3, 6, s.base - s.top - 3);
    ctx.strokeStyle = 'rgba(28,26,54,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.top + (s.base - s.top) / 2); ctx.lineTo(s.x + 26, s.top + (s.base - s.top) / 2 + 3); ctx.stroke();
  }
  // decor: pebbles, glowing crystals, steam vents (a pure function of x and t)
  for (let x = Math.floor((cam.x - 40) / 70) * 70; x < cam.x + W + 40; x += 70) {
    const hs = hash(x, 5), kind = hs % 7, dx = x + (hs >> 4) % 30;
    if (ph.c.walls.some(w => Math.abs(w.face - dx) < 40) || ph.c.steps.some(s => Math.abs(s.x - dx) < 24)) continue;
    const gy = vdClimbG(ph, dx);
    if (kind === 0 || kind === 1) { ctx.fillStyle = VDCLC.rockLt; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(dx, gy - 3, 7, 5, 0, Math.PI, 0); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(dx + 9, gy - 2, 4, 3, 0, Math.PI, 0); ctx.fill(); ctx.stroke(); }
    else if (kind === 2) {
      const a = 0.7 + 0.3 * Math.sin(t * 3 + x);
      ctx.fillStyle = `rgba(255,120,60,${a})`; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(dx - 5, gy); ctx.lineTo(dx - 2, gy - 14); ctx.lineTo(dx + 2, gy); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dx + 1, gy); ctx.lineTo(dx + 5, gy - 9); ctx.lineTo(dx + 8, gy); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (kind === 3) {
      ctx.fillStyle = '#2a2130'; ctx.beginPath(); ctx.ellipse(dx, gy, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
      for (let n = 0; n < 3; n++) { const u = (t * 0.8 + n / 3 + (hs % 10) / 10) % 1; ctx.fillStyle = `rgba(230,220,235,${0.4 * (1 - u)})`; circle(dx + Math.sin(u * 6 + n) * 5, gy - 6 - u * 46, 4 + u * 9); ctx.fill(); }
    }
  }
  // grip walls, hook posts and rope ladders
  for (const w of ph.c.walls) if (w.face > cam.x - 80 && w.face < cam.x + W + 80) vdClimbDrawWall(st, w);
  // checkpoint flags
  for (const f of ph.c.flags) if (f.x > cam.x - 80 && f.x < cam.x + W + 80) vdClimbDrawFlag(st, f);
}
function vdClimbDrawWall(st, w) {
  const ph = st.ph, t = G.clock, x = w.face, hgt = w.base - w.top, cl = 1 - ph.sh;
  // the face: stacked stone blocks
  ctx.fillStyle = VDCLC.wallLt; ctx.fillRect(x, w.top, 9, hgt);
  ctx.strokeStyle = 'rgba(28,26,54,0.45)'; ctx.lineWidth = 2;
  ctx.beginPath(); for (let y = w.top + 28, n = 0; y < w.base - 6; y += 28, n++) { ctx.moveTo(x, y); ctx.lineTo(x + 40 + (n % 2) * 14, y + 2); } ctx.stroke();
  // grips (in the climber's colour while the ladder is still rolled up)
  const gc = w.down ? '#a08a7a' : PCOL[cl];
  for (let y = w.base - 18, n = 0; y > w.top + 8; y -= 22, n++) {
    const gx = x - 3 + (n % 2) * 5;
    ctx.fillStyle = gc; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
    rr(gx - 5, y - 4, 10, 8, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(gx - 3, y - 3, 4, 2);
  }
  // the hook post on top (glows until the ladder is down)
  const hx = w.hookX, hy = w.top;
  if (!w.down) { const a = 0.35 + 0.25 * Math.sin(t * 5); ctx.fillStyle = `rgba(255,197,61,${a})`; circle(hx, hy - 16, 26); ctx.fill(); }
  if (!w.down && w.hold > 0) {   // the hold meter: a ring that fills round the post
    ctx.strokeStyle = 'rgba(28,26,54,0.6)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(hx, hy - 18, 30, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(hx, hy - 18, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(w.hold / VDCL.holdT, 0, 1)); ctx.stroke();
  }
  ctx.fillStyle = VDCLC.post; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  rr(hx - 4, hy - 34, 8, 34, 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.gold; circle(hx, hy - 34, 5); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx - 6, hy - 26, 5, -0.4, Math.PI * 0.9); ctx.stroke();
  if (!w.down) {   // the rolled-up ladder next to the post
    ctx.fillStyle = VDCLC.rope; ctx.strokeStyle = VDCLC.rung; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(hx + 12, hy - 7, 9, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(hx + 12, hy - 7, 4, 3, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // the rope ladder down the face
  if (w.unroll > 0) {
    const len = hgt * w.unroll, lx0 = x - 20, lx1 = x - 4, sway = Math.sin(t * 2.5 + w.i) * (w.unroll < 1 ? 4 : 1.2);
    ctx.strokeStyle = VDCLC.rope; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(hx - 6, hy - 26); ctx.quadraticCurveTo(x + 4, hy - 20, lx1, hy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx0, hy); ctx.lineTo(lx0 + sway, hy + len); ctx.moveTo(lx1, hy); ctx.lineTo(lx1 + sway, hy + len); ctx.stroke();
    ctx.strokeStyle = VDCLC.rung; ctx.lineWidth = 3.5;
    ctx.beginPath(); for (let y = 12; y < len; y += 16) { const s2 = sway * y / Math.max(1, len); ctx.moveTo(lx0 + s2, hy + y); ctx.lineTo(lx1 + s2, hy + y); } ctx.stroke();
    if (w.unroll < 1) { ctx.fillStyle = VDCLC.rope; ctx.beginPath(); ctx.ellipse((lx0 + lx1) / 2 + sway, hy + len, 11, 6, 0, 0, Math.PI * 2); ctx.fill(); }
  }
}
function vdClimbDrawFlag(st, f) {
  const t = G.clock, x = f.x, y = f.y, last = f.k === VDCL_STRETCHES.length - 1, ph = 96 + (last ? 20 : 0);
  ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - ph); ctx.stroke();
  ctx.fillStyle = '#2a2130'; ctx.beginPath(); ctx.ellipse(x, y, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
  const rise = f.got ? clamp(f.t / 0.5, 0, 1) : 0, fy = y - ph + 4 + (1 - rise) * 0;
  const col = f.got ? C.gold : '#ff6b4a', wav = Math.sin(t * 6) * 4;
  ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  const fw = last ? 58 : 44;
  ctx.beginPath(); ctx.moveTo(x + 2, fy); ctx.quadraticCurveTo(x + fw / 2, fy - 6 + wav, x + fw, fy + 4); ctx.quadraticCurveTo(x + fw / 2, fy + 18 + wav, x + 2, fy + 28); ctx.closePath(); ctx.fill(); ctx.stroke();
  // a little flame emblem (a dragon's peak), or a star once reached
  if (f.got) vdStar(x + fw * 0.42, fy + 13, 7, '#ffffff');
  else { ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.moveTo(x + 14, fy + 20); ctx.quadraticCurveTo(x + 22, fy + 2, x + 24, fy + 8); ctx.quadraticCurveTo(x + 30, fy + 14, x + 26, fy + 20); ctx.closePath(); ctx.fill(); }
  text(String(f.k + 1), x - 12, y - ph + 10, 15, f.got ? C.gold : '#ffffff', 'center');
  if (last) { ctx.save(); ctx.globalAlpha = 0.9; text('Crater', x + 30, y - ph - 14, 15, C.gold, 'center'); ctx.restore(); }
}
function vdClimbDrawLavaPool(st) {
  const ph = st.ph, L = ph.lava, cam = st.cam, t = G.clock;
  if (L.front < cam.x - 30) {   // off screen behind: a warm glow at the left edge
    const a = clamp(1 - (cam.x - L.front) / 500, 0, 0.6);
    if (a > 0.02) vdScreen(st, () => { const g = ctx.createLinearGradient(0, 0, 90, 0); g.addColorStop(0, `rgba(255,120,40,${a})`); g.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 90, H); });
    return;
  }
  const x0 = cam.x - 30, x1 = Math.min(L.front + 2, cam.x + W + 30), y = L.y;
  const surf = x => y + Math.sin(x * 0.05 + t * 2.4) * 3 + Math.sin(x * 0.13 - t * 1.7) * 1.5;
  const g = ctx.createLinearGradient(0, y - 4, 0, y + 160);
  g.addColorStop(0, VDC.lavaLt); g.addColorStop(0.3, VDC.lava); g.addColorStop(1, VDC.lavaDk);
  // heat above it
  const hg = ctx.createLinearGradient(0, y - 70, 0, y);
  hg.addColorStop(0, 'rgba(255,140,60,0)'); hg.addColorStop(1, 'rgba(255,140,60,0.35)');
  ctx.fillStyle = hg; ctx.fillRect(x0, y - 70, x1 - x0 + 30, 70);
  // the pool: from its wavy surface down to the ground under it (left of the front the ground is below the surface)
  const bot = cam.y + H + 30;
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, surf(x0));
  for (let x = x0; x <= x1; x += 10) ctx.lineTo(x, surf(x));
  ctx.lineTo(x1, surf(x1));
  for (let x = x1; x >= x0; x -= 4) ctx.lineTo(x, Math.min(vdClimbG(ph, x), bot));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,170,0.9)'; ctx.lineWidth = 2.5; ctx.beginPath();
  for (let x = x0; x <= x1; x += 10) { const yy = surf(x); if (x === x0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
  ctx.stroke();
  for (let x = Math.ceil(x0 / 60) * 60; x < x1; x += 60) {
    const u = ((t * 0.7 + (hash(x, 9) % 100) / 100) % 1), bx = x + (hash(x, 4) % 30);
    if (u > 0.8) continue;
    ctx.fillStyle = 'rgba(255,225,140,0.9)'; circle(bx, y + 12 - u * 12, 2.5 + u * 5); ctx.fill();
  }
  // the front edge: a creeping glowing lip
  ctx.fillStyle = VDC.lavaLt; circle(L.front - 4, y + 2 + Math.sin(t * 3) * 1.5, 7); ctx.fill();
}
function vdClimbDrawRocks(st) {
  const ph = st.ph, t = G.clock;
  for (const r of ph.rocks) {
    if (r.gone || r.warn > 0) continue;
    ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot);
    ctx.fillStyle = 'rgba(255,140,50,0.35)'; circle(0, 0, r.r + 6); ctx.fill();
    vdClimbRockShape(r.r, t);
    ctx.restore();
  }
}
// a lumpy lava rock with glowing cracks, centred on 0, 0
function vdClimbRockShape(rad, t) {
  ctx.fillStyle = '#4a3b45'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, q = rad * (0.84 + (hash(k, 7) % 10) / 55); ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.beginPath(); ctx.ellipse(-rad * 0.3, -rad * 0.35, rad * 0.4, rad * 0.22, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = `rgba(255,${170 + Math.round(Math.sin(t * 8) * 40)},70,0.95)`; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-rad * 0.55, rad * 0.1); ctx.lineTo(-rad * 0.15, rad * 0.25); ctx.lineTo(0, rad * 0.6);
  ctx.moveTo(rad * 0.15, -rad * 0.55); ctx.lineTo(rad * 0.3, -rad * 0.1); ctx.lineTo(rad * 0.62, rad * 0.05); ctx.stroke();
}
function vdClimbDrawTop(st) {
  const ph = st.ph, t = G.clock, ps = G.players;
  // little hands on the grips / rungs while climbing (players are on screen between ticks)
  vdScreen(st, () => {
    for (const p of ps) {
      const P = ph.P[p.id];
      if (!P.climb) continue;
      const hx = p.x + p.w + 1, a = Math.sin(P.climbAnim) * 4;
      ctx.fillStyle = PCOL[p.id]; ctx.strokeStyle = PDARK[p.id]; ctx.lineWidth = 2;
      circle(hx, p.y + 4 + a, 4.5); ctx.fill(); ctx.stroke();
      circle(hx - 2, p.y + 14 - a, 4.5); ctx.fill(); ctx.stroke();
    }
  });
  // gold arrows (help) at what to use next
  for (const w of ph.c.walls) {
    if (!w.gold || w.cleared) continue;
    const bob = Math.sin(t * 6) * 6, cl = ps[1 - ph.sh];
    let ax, ay;
    if (!w.down) { if (vdClimbTopped(cl, w) || ph.P[cl.id].climb) { ax = w.hookX; ay = w.top - 70; } else { ax = w.face - 12; ay = w.base - 60; } }
    else { ax = w.face - 12; ay = w.base - 70; }
    vdClimbArrow(ax, ay + bob);
  }
}
function vdClimbArrow(x, y) {
  ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x - 10, y - 18); ctx.lineTo(x + 10, y - 18); ctx.lineTo(x + 10, y); ctx.lineTo(x + 18, y); ctx.lineTo(x, y + 18); ctx.lineTo(x - 18, y); ctx.lineTo(x - 10, y); ctx.closePath(); ctx.fill(); ctx.stroke();
}
// rock warnings at the right edge of the screen (screen coords)
function vdClimbHud(st) {
  const ph = st.ph, t = G.clock, big = vdBig();
  for (const r of ph.rocks) {
    if (r.gone || r.warn <= 0) continue;
    const y = clamp(vdClimbG(ph, r.x) - 30 - st.cam.y, 110, H - 40), x = W - 26, k = 1 - r.warn / VDCL.rock.warn, pulse = 0.5 + 0.5 * Math.sin(t * 16);
    const z = big ? 1.5 : 1;
    ctx.save(); ctx.translate(W, y); ctx.scale(z, z); ctx.translate(-W, -y);
    const g = ctx.createRadialGradient(W, y, 4, W, y, 90);
    g.addColorStop(0, `rgba(255,120,40,${0.55 + 0.3 * pulse})`); g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g; ctx.fillRect(W - 90, y - 90, 90, 180);
    ctx.save(); ctx.translate(x - 4 - k * 10, y + 10); ctx.rotate(-t * 3); vdClimbRockShape(12, t); ctx.restore();
    bigText('!', x - 6, y - 22 - pulse * 3, 30, '#ff5f6d', 1);
    bigText('◀', x - 44, y + 10, 22, C.gold, 1);
    ctx.restore();
  }
}

/* ---------- sounds ---------- */
Sfx.extra.vdClimbRumble = function () { for (let k = 0; k < 5; k++) this.tone(60 + Math.random() * 30, 0.16, 'sawtooth', 0.04, 40, k * 0.09); };
Sfx.extra.vdClimbThud = function () { this.tone(110, 0.1, 'triangle', 0.06, 60); };
Sfx.extra.vdClimbSmash = function () { this.tone(900, 0.06, 'square', 0.03, 300); this.tone(160, 0.14, 'triangle', 0.05, 70, 0.02); };
Sfx.extra.vdClimbLadder = function () { for (let k = 0; k < 5; k++) this.tone(300 + k * 70, 0.06, 'triangle', 0.04, null, k * 0.08); };
Sfx.extra.vdClimbGrip = function (p) { this.tone(520 * p, 0.04, 'triangle', 0.025, 640 * p); };
Sfx.extra.vdClimbSizzle = function () { this.tone(1800, 0.25, 'sawtooth', 0.012, 900); this.tone(240, 0.3, 'triangle', 0.03, 120, 0.02); };
Sfx.extra.vdClimbFlag = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };

/* ---------- the room (this file fills in its own room of the level def) ---------- */
vdRoom('climb', {
  title: 'Slope Climb', phase: 'climb', ownStep: true, first: 0,
  jobs: {
    shielder: { title: 'Shielder', act: 'shield', legend: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> hop',
      howTo: ['Hold shield over you both when he breathes fire.'] },
    climber: { title: 'Climber', act: 'ladder', legend: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump, hold to climb',
      howTo: ['Climb the grip wall. On top, hold ladder at the gold hook post.'] },
  },
  act: { label: 'shield', labels: ['shield', 'ladder'] },
  tip: 'Shielder: hold the action to shield you both. Climber: climb the grips and drop the rope ladder!',
  legend: VD_PHASES.climb.legend(),
  map: Array.from({ length: ROWS }, (_, y) => (y === 13 ? '..1.2' + '.'.repeat(COLS - 5) : '.'.repeat(COLS))),
});
