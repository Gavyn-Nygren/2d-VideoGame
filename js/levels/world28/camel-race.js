/* Pip & Bo - Level 28-4 Camel Race (versus, World 28 Pyramid Sands). */
'use strict';

/* ===== 28-4 Camel Race (mode 'camelrace', versus, best of 5, scrolls sideways) — Gavyn's pick =====
   "Race camels across the desert and time your jumps over the dunes."
   def.ownStep: the mode runs the live tick, the camera and the picture. Each player rides a camel in their own lane
   (two lanes, one behind the other, swapping every round); both lanes have the same dunes and the same obstacles, so
   the race is fair. Pip and Bo themselves are the engine's players placed on the camels' humps (the engine draws them
   between draw() and drawTop()); their bodies never move on their own.
   A round (after the framework's Round N card and 3-2-1):
     run    the camel runs right by itself (cruise 245 px/s). It follows the dunes: going downhill speeds it up,
            uphill slows it down.
     jump   ▲ (W / ↑ / Space / A / touch ▲) jumps (about 90 px high). A jump taken on the way up a dune flies
            higher, because the camel keeps its climb. Landing on the far side of a dune (going downhill) is a
            "Perfect landing!" (+60 speed); landing on the face of the next dune is a "Thud!" (a little slower).
            ▼ in the air drops you down faster (to time a landing).
     dash   the action (giddy-up) is a burst (+130 for 0.7 s). You hold up to 3 dates (one dash each); a new date
            grows every 4 s. The first dash within 0.6 s of "GO!" is a "Great start!".
     things cacti and rock piles (jump them: hitting one halves your speed, "Prickly!" / "Bonk!"), clay pots (they
            break: "Crash!", a little slower), quicksand (on the ground in it you sink and crawl: jump it!) and oasis
            puddles (a splash, a little slower). Gold scarabs float over some dunes: grab one in a jump for +70 speed.
            Nobody gets hurt: camels shake it off.
     finish the first camel under the pyramid arch wins the round. Time (75 s): the camel farther along wins.
   Courses, one per round, built fresh from tokens with MODES.camelrace.rand: 1 Dune Dash, 2 Cactus Canyon, 3 Quicksand
   Flats, 4 Oasis Run, 5 Pyramid Final.
   Camera and catch-up like 22-4 Dolphin Race: it follows the leader but never leaves the trailer behind (the trailer is
   pulled along at the left edge); a trailer far behind gets a gold tailwind (+40). 1 round behind: a 4th date and
   dates grow every 3 s; 2+ behind: also a gold head start. Off in sudden death.
   tiebreak(): more perfect landings this match, else replay.
   Every top-level name starts with cr / CR (Sfx.extra.cr*). Rule randomness only from MODES.camelrace.rand. */
const CR = {
  lanes: [318, 452], amp: 34, startX: 160,
  cruise: 245, drag: 0.9, slopeK: 520, maxSp: 500, minSp: 70,
  jumpV: 560, g: 1650, fastFall: 2400, perfect: 60, perfectSlope: 0.1, thudSlope: -0.12, thudKeep: 0.86,
  dash: 130, dashT: 0.7, dates: 3, dateT: 4, dateTGold: 3, startWin: 0.6, goldStart: 150, goldStartT: 1.5,
  bumpKeep: 0.5, bumpMin: 90, imm: 0.9, potKeep: 0.78, sandSp: 95, splashKeep: 0.86, scarab: 70,
  camLead: 0.58, camTrail: 110, camRight: 120, camHard: 70, windX: 160, windGap: 460, windV: 40,
  roundTime: 75, timeTie: 12,
};
const CR_COURSES = {
  dunes: { name: 'Dune Dash', hint: 'Jump from the top of a dune, land on the far side: Perfect landing!', plan: '_ d d S d C d S d d P d S d C d d S d R d d S d P d', dune: [0.006, 0.0137] },
  cactus: { name: 'Cactus Canyon', hint: 'Prickly! Jump the cacti and the rock piles.', plan: '_ d C d C S d R C d P C d S C R d C d S C d R C d', dune: [0.0055, 0.012] },
  sand: { name: 'Quicksand Flats', hint: 'Quicksand! Jump over it or you\'ll sink.', plan: '_ d Q d S C d Q P d S Q d R Q d S d Q C d Q d S d', dune: [0.005, 0.011] },
  oasis: { name: 'Oasis Run', hint: 'Splash through the oasis, or jump the puddles!', plan: '_ d W d S P d C W d S P W d R d W S C d P W d S d', dune: [0.0065, 0.0145] },
  final: { name: 'Pyramid Final', hint: 'The final! A bit of everything. Save a date for the end!', plan: '_ d C S d Q d P R d S W C d Q d S C R d P d W S C d Q d S d', dune: [0.006, 0.013] },
};
const CR_ORDER = ['dunes', 'cactus', 'sand', 'oasis', 'final'];
const crCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);

/* ---------- the course ---------- */
function crBuild(key, R) {
  const cs = CR_COURSES[key], c = { key, name: cs.name, hint: cs.hint, obs: [], zones: [], scarabs: [], len: 0, f: cs.dune, ph: [R() * 6.28, R() * 6.28] };
  let x = 520, id = 0;
  const ob = (k, ox, h) => c.obs.push({ id: id++, k, x: ox, h, hitT: 9, hit: [false, false], broke: [false, false] });
  // the plan twice (the second time without the start stretch): a round of about 40 s
  const toks = cs.plan.split(/\s+/);
  for (const tok of toks.concat(toks.filter(t => t !== '_'))) {
    switch (tok) {
      case '_': x += 200; break;
      case 'd': x += 260 + R() * 160; break;
      case 'C': ob('cactus', x + 60, 50); if (R() < 0.35) ob('cactus', x + 60 + 46, 38); x += 260; break;
      case 'R': ob('rocks', x + 60, 34); x += 240; break;
      case 'P': ob('pot', x + 50, 30); if (R() < 0.5) ob('pot', x + 84, 26); x += 220; break;
      case 'Q': { const w = 120 + R() * 40; c.zones.push({ k: 'sand', x0: x + 30, x1: x + 30 + w }); x += w + 160; break; }
      case 'W': { const w = 90 + R() * 30; c.zones.push({ k: 'water', x0: x + 30, x1: x + 30 + w }); x += w + 150; break; }
      case 'S': c.scarabs.push({ id: id++, x: x + 80, dy: 92 + R() * 26, got: [false, false], t: 0 }); x += 200; break;
    }
  }
  c.len = Math.round(x + 260);
  return c;
}
// the dune height at x (down positive), and its slope dy/dx
function crH(c, x) {
  if (x < 360) return 0;
  const k = Math.min(1, (x - 360) / 300), e = Math.max(0, Math.min(1, (c.len - 120 - x) / 300));
  return CR.amp * k * e * (Math.sin(x * c.f[0] + c.ph[0]) * 0.75 + Math.sin(x * c.f[1] + c.ph[1]) * 0.35);
}
const crSlope = (c, x) => (crH(c, x + 3) - crH(c, x - 3)) / 6;
const crGround = (c, lane, x) => CR.lanes[lane] + crH(c, x);
const crZoneAt = (c, x) => c.zones.find(z => x > z.x0 && x < z.x1) || null;

/* ---------- the camels ---------- */
function crMake(k, lane) {
  return { k, lane, x: CR.startX, y: CR.lanes[lane], vy: 0, sp: 0, air: false, airT: 0, dates: CR.dates, maxDates: CR.dates, dateT: 0,
    dashT: 0, boostT: 0, wobT: 0, immT: 0, sink: 0, tail: false, tailSaid: false, gold: 0, started: false, done: false, finishT: null,
    leg: 0, pop: '', popT: 9, popCol: '#fff', popBig: false, cheer: 0, lean: 0 };
}
function crPop(D, s, col, big) { D.pop = s; D.popCol = col || '#ffffff'; D.popT = 0; D.popBig = !!big; }
// pure movement for one tick (also used by the computer brain to look ahead). inp = { jump (fresh), down } or null
function crMoveBody(c, D, inp, dt) {
  let ev = '';
  if (!D.air) {
    const sl = crSlope(c, D.x);
    if (inp && inp.jump) { D.air = true; D.airT = 0; D.vy = Math.min(0, sl * D.sp) - CR.jumpV; ev = 'jump'; }
  }
  D.x += D.sp * dt;
  if (D.air) {
    D.airT += dt;
    D.vy += (inp && inp.down ? CR.fastFall : CR.g) * dt; D.y += D.vy * dt;
    const gy = crGround(c, D.lane, D.x);
    if (D.y >= gy && D.vy > 0) { D.y = gy; D.air = false; ev = 'land'; }
  } else D.y = crGround(c, D.lane, D.x);
  return ev;
}
// speed for one tick: back to cruise, slopes, boosts, quicksand (pure, also used by the computer brain)
function crSpeed(c, D, dt) {
  const zone = !D.air ? crZoneAt(c, D.x) : null, sand = zone && zone.k === 'sand';
  const target = sand ? CR.sandSp : D.done ? 200 : CR.cruise + (D.tail ? CR.windV : 0);
  D.sink = sand ? Math.min(1, D.sink + dt * 2) : Math.max(0, D.sink - dt * 3);
  if (D.dashT > 0) { D.sp = Math.max(D.sp, Math.min(CR.maxSp, D.sp + CR.dash * 2 * dt)); D.dashT -= dt; }
  else if (!(D.boostT > 0 && D.sp > target) || sand) D.sp += (target - D.sp) * CR.drag * dt * (sand ? 3 : 1);
  if (!D.air) D.sp += crSlope(c, D.x) * CR.slopeK * dt;
  D.sp = clamp(D.sp, CR.minSp, CR.maxSp);
}
function crBump(st, D, o) {
  if (o.k === 'pot') {
    D.sp *= CR.potKeep; o.broke[D.k] = true; crPop(D, 'Crash!', '#ffe6a8');
    Sfx.play('pyrSmash', D.k ? 0.84 : 1);
    for (let i = 0; i < 10; i++) pyrFx(st, o.x, crGround(st.course, D.lane, o.x) - 14, (pyrVR() - 0.2) * 260, -120 - pyrVR() * 200, 1, ['#c8643a', '#e08a4a', '#a84e2a'][i % 3], 3 + pyrVR() * 3, 1200, 'rock', crGround(st.course, D.lane, o.x));
  } else {
    D.sp = Math.max(CR.bumpMin, D.sp * CR.bumpKeep); D.wobT = 0.6; D.boostT = 0; D.dashT = 0;
    crPop(D, o.k === 'cactus' ? 'Prickly!' : 'Bonk!', '#ffe6a8');
    Sfx.play(o.k === 'cactus' ? 'crPrickle' : 'heistBonk' in Sfx.extra ? 'heistBonk' : 'bonk', D.k ? 0.84 : 1);
    rumble(D.k, 0.3, 0.4, 150);
    if (D.air) D.vy = Math.max(D.vy, 120);
  }
  D.immT = CR.imm; o.hit[D.k] = true; o.hitT = 0;
  st.stat.bumps[D.k]++;
}
function crRun(st, D, p, dt, live) {
  const c = st.course;
  const inp = live && !D.done ? { jump: p.pendingJump, down: !!p.input.down } : null;
  if (p.pendingJump) p.pendingJump = false;
  if (live && !D.done && p.pendingAct) {
    p.pendingAct = false;
    if (D.dates >= 1 && D.dashT <= 0) {
      D.dates--; D.dashT = CR.dashT; D.boostT = Math.max(D.boostT, CR.dashT);
      D.sp = Math.max(D.sp, CR.cruise) + CR.dash * 0.5;
      Sfx.play('crDash', D.k ? 0.84 : 1); st.stat.dashes[D.k]++;
      if (!D.started && st.rt < CR.startWin) { D.sp += 100; crPop(D, 'Great start!', C.gold, true); Sfx.play('pyrGold'); st.stat.starts[D.k]++; }
      for (let i = 0; i < 6; i++) pyrFx(st, D.x - 40, D.y - 4, -80 - pyrVR() * 80, -30 - pyrVR() * 40, 0.8, 'rgba(230,200,150,0.7)', 6 + pyrVR() * 6, -10, 'dust');
    } else if (D.dates < 1) crPop(D, 'No dates yet!', 'rgba(255,255,255,0.8)');
    D.started = true;
  }
  if (inp && inp.jump) D.started = true;
  const zone = !D.air ? crZoneAt(c, D.x) : null;
  if (st.ph === 'set') D.sp = 0;
  else crSpeed(c, D, dt);
  const ev = crMoveBody(c, D, inp, dt);
  if (ev === 'jump') { Sfx.play('crJump', D.k ? 0.84 : 1); st.stat.jumps[D.k]++; for (let i = 0; i < 5; i++) pyrFx(st, D.x - 10, D.y, (pyrVR() - 0.7) * 120, -40 - pyrVR() * 50, 0.8, 'rgba(230,200,150,0.6)', 5 + pyrVR() * 5, -10, 'dust'); }
  if (ev === 'land') {
    const sl = crSlope(c, D.x);
    if (live && !D.done && D.airT > 0.25) {
      if (sl > CR.perfectSlope) { D.sp = Math.min(CR.maxSp, D.sp + CR.perfect); D.boostT = 0.6; crPop(D, 'Perfect landing!', C.gold, true); Sfx.play('crPerfect', D.k ? 0.84 : 1); st.stat.perfect[D.k]++; }
      else if (sl < CR.thudSlope) { D.sp *= CR.thudKeep; crPop(D, 'Thud!', '#ffe6a8'); Sfx.play('land'); }
    }
    for (let i = 0; i < 8; i++) pyrFx(st, D.x + (pyrVR() - 0.5) * 40, D.y, (pyrVR() - 0.5) * 160, -40 - pyrVR() * 60, 0.9, 'rgba(230,200,150,0.65)', 6 + pyrVR() * 8, -10, 'dust');
    D.lean = -0.25;
  }
  // dates grow back
  if (D.dates < D.maxDates) { D.dateT += dt; const per = D.gold >= 1 ? CR.dateTGold : CR.dateT; if (D.dateT >= per) { D.dateT = 0; D.dates++; } } else D.dateT = 0;
  D.wobT = Math.max(0, D.wobT - dt); D.immT = Math.max(0, D.immT - dt); D.boostT = Math.max(0, D.boostT - dt);
  D.leg += dt * D.sp * (D.air ? 0.004 : 0.045); D.lean += (0 - D.lean) * Math.min(1, dt * 6);
  if (!live || D.done) return;
  // obstacles
  if (D.immT <= 0) for (const o of c.obs) {
    if (o.hit[D.k] || o.broke[D.k] || Math.abs(o.x - D.x) > 26) continue;
    const gy = crGround(c, D.lane, o.x);
    if (D.y > gy - o.h + 4) { crBump(st, D, o); break; }
  }
  // water splash (once per puddle)
  if (zone && zone.k === 'water' && zone.splash !== st.tickK + D.k) {
    if (!zone.wet) zone.wet = [false, false];
    if (!zone.wet[D.k]) { zone.wet[D.k] = true; D.sp *= CR.splashKeep; crPop(D, 'Splash!', '#bff0ff'); Sfx.play('splash'); for (let i = 0; i < 12; i++) pyrFx(st, D.x, D.y - 4, (pyrVR() - 0.5) * 200, -100 - pyrVR() * 160, 0.8, i % 2 ? '#bff0ff' : '#ffffff', 2.5, 900, 'spark'); }
  }
  if (zone && zone.k === 'sand' && pyrVR() < dt * 8) crPop(D, 'Sinking!', '#ffe6a8');
  // scarabs
  for (const s of c.scarabs) {
    if (s.got[D.k]) continue;
    const sy = crGround(c, D.lane, s.x) - s.dy;
    if (Math.abs(D.x - s.x) < 26 && Math.abs(D.y - 40 - sy) < 30) {
      s.got[D.k] = true; D.sp = Math.min(CR.maxSp, D.sp + CR.scarab); D.boostT = 0.7; st.stat.scarabs[D.k]++;
      crPop(D, 'Scarab boost!', C.gold, true); Sfx.play('pyrGold');
      for (let i = 0; i < 10; i++) pyrFx(st, s.x, sy, (pyrVR() - 0.5) * 180, (pyrVR() - 0.5) * 180, 0.6, i % 2 ? C.gold : '#7fe0c0', 2.5, 0, 'spark');
    }
  }
}
function crEnd(st, w, reason) {
  if (st.ended) return;
  st.ended = true; st.ph = 'done'; st.res = { winner: w };
  if (w >= 0) { st.stat.wins[w]++; st.pl[w].cheer = 1; }
  matchRoundEnd(w, reason);
}
function crTick(dt, live) {
  const st = G.mst, c = st.course;
  st.t += dt;
  if (live) st.rt += dt;
  if (live && st.ph === 'set') st.ph = 'race';
  for (const D of st.pl) crRun(st, D, G.players[D.k], dt, live);
  if (live && !st.ended) {
    const done = st.pl.filter(D => !D.done && D.x >= c.len);
    if (done.length) {
      for (const D of done) { D.done = true; D.finishT = st.rt; }
      const [A, B] = st.pl;
      let w = done[0].k;
      if (done.length === 2) w = Math.abs(A.x - B.x) < 0.5 ? -1 : (A.x > B.x ? 0 : 1);
      if (w >= 0) { if (!(st.stat.fast[w] <= st.rt)) { st.stat.fast[w] = st.rt; st.stat.fastCourse[w] = c.name; } Sfx.play('pyrFanfare'); crEnd(st, w, 'First under the pyramid arch!'); }
      else crEnd(st, -1, 'A photo finish! Nose and nose!');
    }
  }
  crCamera(st, dt, false, live);
  crLooks(st, dt);
  crMirror(st);
}
function crCamera(st, dt, snap, live) {
  const cam = st.cam, c = st.course;
  if (!st.pl || !c) return;
  const xs = st.pl.map(D => D.x), lead = Math.max(xs[0], xs[1]), trail = Math.min(xs[0], xs[1]);
  let want = lead - W * CR.camLead;
  want = Math.min(want, trail - CR.camTrail);
  want = Math.max(want, lead - (W - CR.camRight));
  const maxX = c.len + 200 - W * 0.6;
  want = clamp(want, 0, Math.max(0, maxX));
  cam.x = snap ? want : cam.x + (want - cam.x) * (1 - Math.exp(-7 * dt));
  cam.x = clamp(Math.max(cam.x, lead - (W - CR.camHard)), 0, Math.max(0, maxX));
  for (const D of st.pl) {
    if (D.done || st.ph === 'set') { D.tail = false; continue; }
    const O = st.pl[1 - D.k], edge = cam.x + CR.camTrail - 40;
    if (live && D.x < edge && O.x - D.x > CR.windGap) D.x = edge;
    const was = D.tail;
    D.tail = live && !st.noHelp && O.x - D.x > CR.windGap && D.x - cam.x < CR.windX;
    if (D.tail && !was && !D.tailSaid) { D.tailSaid = true; crPop(D, 'Gold tailwind!', C.gold, true); Sfx.play('pyrGold'); }
  }
}
// the riders: the engine draws Pip and Bo sitting on the humps
function crMirror(st) {
  if (!st.pl || !st.cam) return;
  for (const p of G.players) {
    const D = st.pl[p.id], bob = D.air ? 0 : Math.abs(Math.sin(D.leg)) * 4;
    p.alive = true; p.face = 1; p.vx = 0; p.vy = D.air ? D.vy * 0.3 : 0;
    p.x = D.x - st.cam.x - p.w / 2 - 4; p.y = D.y - 74 - bob - p.h + D.sink * 26;
    p.stun = D.wobT > 0 ? Math.max(0.05, D.wobT) : 0;
  }
}
function crLooks(st, dt) {
  pyrFxTick(st, dt);
  for (const D of st.pl) {
    D.popT += dt; D.cheer = Math.max(0, D.cheer - dt * 0.4);
    if (!D.air && st.ph !== 'set' && pyrVR() < dt * (6 + D.sp / 40)) pyrFx(st, D.x - 20 + (pyrVR() - 0.5) * 20, D.y - 2, -40 - pyrVR() * 60, -20 - pyrVR() * 30, 0.7, 'rgba(230,200,150,0.5)', 4 + pyrVR() * 5, -10, 'dust');
    if ((D.boostT > 0 || D.tail) && pyrVR() < dt * 20) pyrFx(st, D.x - 50 - pyrVR() * 40, D.y - 40 + (pyrVR() - 0.5) * 40, -100, 0, 0.35, 'rgba(255,214,90,0.9)', 2.4, 0, 'spark');
    if (D.done && D.cheer > 0 && pyrVR() < dt * 10) pyrFx(st, D.x + (pyrVR() - 0.5) * 60, D.y - 110, (pyrVR() - 0.5) * 100, -80 - pyrVR() * 80, 0.9, ['#ffc53d', '#ff8fc7', '#8fe3b0', '#ffffff'][Math.floor(pyrVR() * 4)], 3.5, 160, 'spark');
  }
  for (const s of st.course ? st.course.scarabs : []) s.t += dt;
  for (const o of st.course ? st.course.obs : []) o.hitT += dt;
}

/* ---------- the mode ---------- */
MODES.camelrace = {
  CR,
  rand() { return Math.random(); },
  setup(st, L) {
    for (const row of L.grid) row.fill('.');
    st.stat = { wins: [0, 0], perfect: [0, 0], bumps: [0, 0], jumps: [0, 0], dashes: [0, 0], scarabs: [0, 0], starts: [0, 0], fast: [Infinity, Infinity], fastCourse: ['', ''] };
    st.noHelp = !!this.testNoHelp; st.forceCourse = this.testCourse || null;
    st.t = 0; st.rt = 0; pyrFxNew(st);
  },
  resetRound(n, info) {
    const st = G.mst;
    const key = st.forceCourse || CR_ORDER[Math.min(n, CR_ORDER.length) - 1];
    st.course = crBuild(key, () => this.rand());
    st.round = n; st.ph = 'set'; st.rt = 0; st.ended = false; st.res = null; st.tickK = 0;
    const front = (n - 1) % 2;   // the front lane (nearer the screen) swaps every round
    st.pl = [0, 1].map(k => crMake(k, k === front ? 1 : 0));
    for (const D of st.pl) {
      D.gold = info.suddenDeath || st.noHelp ? 0 : Math.max(0, info.wins[1 - D.k] - info.wins[D.k]);
      if (D.gold >= 1) { D.maxDates = CR.dates + 1; D.dates = D.maxDates; }
      D.y = crGround(st.course, D.lane, D.x);
    }
    st.cam = { x: 0 };
    pyrFxNew(st);
    crCamera(st, 0, true, false);
    G.particles.length = 0;
    crMirror(st);
  },
  go() {
    const st = G.mst;
    st.ph = 'race'; st.rt = 0;
    for (const D of st.pl) {
      D.sp = CR.cruise * 0.6;
      if (D.gold >= 2) { D.sp = CR.cruise + CR.goldStart; D.boostT = CR.goldStartT; }
      if (D.gold) crPop(D, D.gold >= 2 ? 'Gold dates + a gold head start!' : 'Gold dates!', C.gold, true);
    }
  },
  step(dt) { crTick(dt, true); },
  idle(dt) {
    const st = G.mst, m = G.match;
    if (!st.pl) return;
    for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
    if (m && (m.phase === 'end' || m.phase === 'over')) { crTick(dt, false); return; }
    st.t += dt;
    for (const D of st.pl) D.popT += dt;
    pyrFxTick(st, dt);
    crCamera(st, dt, false, false);
    crMirror(st);
  },
  timeUp() {
    const st = G.mst, [A, B] = st.pl, d = A.x - B.x;
    st.ended = true; st.ph = 'done';
    if (Math.abs(d) < CR.timeTie) { st.res = { winner: -1 }; return { winner: -1, reason: 'Time! Neck and neck!' }; }
    const w = d > 0 ? 0 : 1;
    st.res = { winner: w }; st.stat.wins[w]++; st.pl[w].cheer = 1;
    return { winner: w, reason: 'Time! Rode the farthest!' };
  },
  tiebreak() {
    const r = G.mst.stat.perfect;
    if (r[0] !== r[1]) return { winner: r[0] > r[1] ? 0 : 1, reason: 'More perfect landings this match!' };
    return -1;
  },
  draw() { const st = G.mst; if (st.course) crDraw(st); },
  drawTop() { const st = G.mst; if (st.course) crDrawTop(st); },
  hud() { const st = G.mst; if (st.course) crHud(st); },
  stats() {
    const st = G.mst, s = st.stat;
    const out = [
      { label: 'Rounds won', values: (G.match ? G.match.wins : s.wins).slice() },
      { label: 'Perfect landings', values: s.perfect.slice() },
      { label: 'Scarabs', values: s.scarabs.slice() },
      { label: 'Bumps', values: s.bumps.slice() },
    ];
    const f = s.fast;
    if (isFinite(f[0]) || isFinite(f[1])) { const w = !isFinite(f[1]) || f[0] < f[1] ? 0 : 1; out.push('Fastest round: ' + NAMES[w] + ', ' + s.fastCourse[w] + ' in ' + f[w].toFixed(1) + ' s!'); }
    const p = s.perfect;
    if (p[0] + p[1] > 0) out.push(p[0] === p[1] ? '★ Smooth riders: Pip and Bo, ' + p[0] + ' perfect landings each!' : '★ Smoothest rider: ' + NAMES[p[0] > p[1] ? 0 : 1] + ' (' + Math.max(p[0], p[1]) + ' perfect landings)');
    return out;
  },
  test: { CR, H: crH, slope: crSlope, ground: crGround, zoneAt: crZoneAt, move: crMoveBody, speed: crSpeed },
};

/* ---------- drawing ---------- */
const CR_LOOK = {
  dunes: { sky: ['#4f9be0', '#ffe2a8'], far: '#f0c77a', mid: '#e8b468', near: ['#f2cf86', '#e0b06a'] },
  cactus: { sky: ['#5a9ad8', '#ffd8a0'], far: '#d9a868', mid: '#cf9858', near: ['#e8c07a', '#d4a060'] },
  sand: { sky: ['#6aa6dc', '#fff0c0'], far: '#f4d896', mid: '#ecc27a', near: ['#f6dc9a', '#e6c07a'] },
  oasis: { sky: ['#4aa0e8', '#e8f6d8'], far: '#e6c27a', mid: '#dcae66', near: ['#f0cc88', '#dcb070'] },
  final: { sky: ['#ff9a6a', '#ffe0a0'], far: '#e8a868', mid: '#dc9858', near: ['#f0c07a', '#dca462'] },
};
function crDraw(st) {
  const c = st.course, cam = st.cam.x, look = CR_LOOK[c.key] || CR_LOOK.dunes, t = G.clock;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, look.sky[0]); g.addColorStop(0.62, look.sky[1]); g.addColorStop(1, look.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // sun with a heat glow
  ctx.fillStyle = 'rgba(255,240,190,0.35)'; circle(780, 96, 70); ctx.fill();
  ctx.fillStyle = 'rgba(255,248,215,0.95)'; circle(780, 96, 40); ctx.fill();
  // far pyramids (slow parallax)
  const fx = -cam * 0.08;
  for (let i = -1; i < 5; i++) {
    const px = ((i * 420 + fx) % 1680 + 1680) % 1680 - 300, s = 0.7 + (i & 1) * 0.35;
    ctx.fillStyle = look.far; ctx.beginPath(); ctx.moveTo(px - 110 * s, 230); ctx.lineTo(px, 230 - 110 * s); ctx.lineTo(px + 110 * s, 230); ctx.fill();
    ctx.fillStyle = 'rgba(120,70,30,0.18)'; ctx.beginPath(); ctx.moveTo(px, 230 - 110 * s); ctx.lineTo(px + 110 * s, 230); ctx.lineTo(px + 18 * s, 230); ctx.fill();
  }
  // mid dunes
  ctx.fillStyle = look.mid; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 252 + Math.sin((x + cam * 0.3) * 0.006) * 16 + Math.sin((x + cam * 0.3) * 0.017) * 6);
  ctx.lineTo(W, H); ctx.fill();
  // the two lanes (back lane first), each with its dunes and things
  for (const lane of [0, 1]) crDrawLane(st, lane, look);
  // heat shimmer
  ctx.save(); ctx.globalAlpha = 0.06; ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 6; i++) { const y = 240 + i * 8; ctx.fillRect(0, y + Math.sin(t * 3 + i) * 2, W, 2); }
  ctx.restore();
  ctx.save(); ctx.translate(-cam, 0);
  pyrFxDraw(st, false);
  ctx.restore();
}
function crDrawLane(st, lane, look) {
  const c = st.course, cam = st.cam.x, x0 = cam - 40, x1 = cam + W + 40, base = CR.lanes[lane], t = G.clock;
  ctx.save(); ctx.translate(-cam, 0);
  // the sand of this lane
  const g = ctx.createLinearGradient(0, base - 40, 0, base + 100);
  g.addColorStop(0, look.near[lane ? 0 : 1]); g.addColorStop(1, lane ? '#d8a860' : '#c99a58');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, H);
  for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, crGround(c, lane, x));
  ctx.lineTo(x1, H); ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,200,0.6)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let x = x0; x <= x1; x += 8) { const y = crGround(c, lane, x); if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  ctx.stroke();
  // ripples in the sand
  ctx.strokeStyle = 'rgba(150,100,50,0.18)'; ctx.lineWidth = 1.5;
  for (let x = Math.floor(x0 / 70) * 70; x < x1; x += 70) { const y = crGround(c, lane, x) + 18 + (hash(x / 70 | 0, lane) % 30); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 18, y - 4, x + 36, y); ctx.stroke(); }
  // zones: quicksand and oasis puddles
  for (const z of c.zones) {
    if (z.x1 < x0 || z.x0 > x1) continue;
    ctx.beginPath();
    for (let x = z.x0; x <= z.x1; x += 6) { const y = crGround(c, lane, x) + 2; if (x === z.x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    for (let x = z.x1; x >= z.x0; x -= 6) ctx.lineTo(x, crGround(c, lane, x) + (z.k === 'sand' ? 20 : 14));
    ctx.closePath();
    if (z.k === 'sand') {
      // a soft, swirling pit: darker sand with rings that turn
      ctx.fillStyle = '#a06a34'; ctx.fill();
      ctx.strokeStyle = 'rgba(70,36,12,0.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); for (let x = z.x0; x <= z.x1; x += 6) { const y = crGround(c, lane, x) + 2; if (x === z.x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
      const mx = (z.x0 + z.x1) / 2, my = crGround(c, lane, mx) + 10, rw = (z.x1 - z.x0) / 2 - 8;
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 4; i++) { const k = ((t * 0.5 + i / 4) % 1); ctx.strokeStyle = 'rgba(60,30,10,' + (0.5 * (1 - k)).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(mx, my, 6 + rw * (1 - k), 2 + 5 * (1 - k), crSlope(c, mx), 0, Math.PI * 2); ctx.stroke(); }
    } else {
      ctx.fillStyle = '#4fb8e0'; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (let x = z.x0 + 10; x < z.x1 - 10; x += 26) ctx.fillRect(x + Math.sin(t * 2 + x) * 3, crGround(c, lane, x) + 5, 10, 2);
      // a little palm at the oasis edge
      const px = z.x1 + 20, py = crGround(c, lane, px);
      ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + 6, py - 40, px + 14, py - 70); ctx.stroke();
      ctx.fillStyle = '#3f9a4c'; for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(px + 14, py - 70); ctx.rotate(-Math.PI / 2 + (i - 2) * 0.6); ctx.beginPath(); ctx.ellipse(18, 0, 20, 5, 0.25, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    }
  }
  // the start rope and the finish arch
  crPost(CR.startX + 30, crGround(c, lane, CR.startX + 30), false);
  if (c.len > x0 - 100 && c.len < x1 + 100) crArch(c.len, crGround(c, lane, c.len), lane, t);
  // obstacles
  for (const o of c.obs) {
    if (o.x < x0 - 40 || o.x > x1 + 40) continue;
    const gy = crGround(c, lane, o.x), D = st.pl.find(q => q.lane === lane);
    const broke = D && o.broke[D.k];
    const jig = D && o.hit[D.k] && o.hitT < 0.3 ? Math.sin(o.hitT * 60) * 3 : 0;
    ctx.save(); ctx.translate(o.x + jig, gy);
    if (o.k === 'cactus') crCactus(o.h);
    else if (o.k === 'rocks') crRocks(o.h, o.id);
    else if (o.k === 'pot') crPot(o.h, broke);
    ctx.restore();
  }
  // scarabs (the one belonging to this lane's rider)
  const D = st.pl.find(q => q.lane === lane);
  for (const s of c.scarabs) {
    if (s.x < x0 || s.x > x1 || (D && s.got[D.k])) continue;
    const sy = crGround(c, lane, s.x) - s.dy + Math.sin(s.t * 3 + s.x) * 4;
    ctx.fillStyle = 'rgba(255,220,100,0.3)'; circle(s.x, sy, 16); ctx.fill();
    ctx.fillStyle = '#2fa88a'; ctx.beginPath(); ctx.ellipse(s.x, sy, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
    pyrGlyph('scarab', s.x, sy + 1, 0.6, C.gold, 2);
  }
  // this lane's camel
  if (D) crCamel(st, D);
  ctx.restore();
}
function crPost(x, y, fin) {
  ctx.fillStyle = '#8a5a30'; ctx.fillRect(x - 3, y - 50, 6, 50);
  ctx.fillStyle = '#ff6b4a'; ctx.beginPath(); ctx.moveTo(x + 3, y - 50); ctx.lineTo(x + 24, y - 44); ctx.lineTo(x + 3, y - 38); ctx.fill();
}
function crArch(x, y, lane, t) {
  ctx.fillStyle = '#c49a5e'; ctx.strokeStyle = '#8f6436'; ctx.lineWidth = 3;
  ctx.fillRect(x - 10, y - 130, 18, 130); ctx.strokeRect(x - 10, y - 130, 18, 130);
  if (lane === 0) {
    ctx.beginPath(); ctx.moveTo(x - 60, y - 130); ctx.lineTo(x, y - 200); ctx.lineTo(x + 60, y - 130); ctx.closePath(); ctx.fillStyle = '#e0b878'; ctx.fill(); ctx.stroke();
    pyrGlyph('sun', x, y - 155, 0.9, '#b8860b');
  }
  for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#3a2614' : '#fff'; ctx.fillRect(x - 2, y - 120 + k * 18, 4, 18); }
}
function crCactus(h) {
  ctx.fillStyle = '#3f9a5a'; ctx.strokeStyle = '#256b3a'; ctx.lineWidth = 2;
  rr(-7, -h, 14, h, 7); ctx.fill(); ctx.stroke();
  rr(-18, -h * 0.7, 9, h * 0.35, 4.5); ctx.fill(); ctx.stroke(); rr(9, -h * 0.85, 9, h * 0.4, 4.5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff8fc7'; circle(0, -h - 2, 3.5); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
  for (let y = -h + 8; y < -4; y += 9) { ctx.beginPath(); ctx.moveTo(-7, y); ctx.lineTo(-10, y - 2); ctx.moveTo(7, y + 4); ctx.lineTo(10, y + 2); ctx.stroke(); }
}
function crRocks(h, id) {
  ctx.fillStyle = '#9a7a5a'; ctx.strokeStyle = '#5a4030'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-24, 2); ctx.lineTo(-18, -h * 0.7); ctx.lineTo(-4, -h); ctx.lineTo(10, -h * 0.8); ctx.lineTo(22, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#b8987a'; ctx.beginPath(); ctx.moveTo(-14, -h * 0.65); ctx.lineTo(-4, -h + 3); ctx.lineTo(4, -h * 0.75); ctx.closePath(); ctx.fill();
}
function crPot(h, broke) {
  if (broke) { ctx.fillStyle = '#c8643a'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-10, -9); ctx.lineTo(-2, -4); ctx.lineTo(4, -10); ctx.lineTo(12, 0); ctx.closePath(); ctx.fill(); return; }
  ctx.fillStyle = '#d0703f'; ctx.strokeStyle = '#7a3a1a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-6, -h); ctx.quadraticCurveTo(-16, -h * 0.6, -10, 0); ctx.lineTo(10, 0); ctx.quadraticCurveTo(16, -h * 0.6, 6, -h); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#7a3a1a'; ctx.fillRect(-7, -h - 3, 14, 4);
  ctx.strokeStyle = 'rgba(255,230,180,0.6)'; ctx.beginPath(); ctx.moveTo(-11, -h * 0.45); ctx.lineTo(11, -h * 0.45); ctx.stroke();
}
// a camel side-on, feet at (D.x, D.y); saddle in the rider's colour
function crCamel(st, D) {
  const x = D.x, y = D.y + D.sink * 26, sl = D.air ? clamp(D.vy / 1400, -0.25, 0.3) : Math.atan(crSlope(st.course, D.x)) * 0.8;
  ctx.save(); ctx.translate(x, y); ctx.rotate(sl + D.lean * 0.3 + (D.wobT > 0 ? Math.sin(G.clock * 30) * 0.06 : 0));
  // shadow
  if (!D.air) { ctx.fillStyle = 'rgba(80,50,20,0.25)'; ctx.beginPath(); ctx.ellipse(0, 1, 38, 5, 0, 0, Math.PI * 2); ctx.fill(); }
  const body = D.k ? '#d9a868' : '#c9955a', dark = D.k ? '#a8784a' : '#9a6a3c';
  // legs (a simple run cycle)
  ctx.strokeStyle = dark; ctx.lineWidth = 6; ctx.lineCap = 'round';
  const ph = D.leg, air = D.air;
  for (const [lx, o] of [[-20, 0], [-12, Math.PI], [16, Math.PI / 2], [24, Math.PI * 1.5]]) {
    const a = air ? (lx < 0 ? 0.6 : -0.6) : Math.sin(ph + o) * 0.55;
    ctx.beginPath(); ctx.moveTo(lx, -34); ctx.lineTo(lx + Math.sin(a) * 30, -34 + Math.cos(a) * 30); ctx.stroke();
  }
  // body and humps
  ctx.fillStyle = body; ctx.strokeStyle = dark; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(0, -44, 34, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-12, -58, 13, 12, 0, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.ellipse(12, -58, 13, 12, 0, Math.PI, 0); ctx.fill();
  // saddle blanket between the humps
  ctx.fillStyle = PCOL[D.k]; rr(-10, -66, 20, 22, 5); ctx.fill();
  ctx.fillStyle = C.gold; ctx.fillRect(-10, -48, 20, 3);
  // tail
  ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-33, -46); ctx.quadraticCurveTo(-42, -40 + Math.sin(G.clock * 8) * 4, -40, -30); ctx.stroke();
  // neck and head
  ctx.fillStyle = body; ctx.strokeStyle = dark; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(26, -50); ctx.quadraticCurveTo(44, -54, 42, -78); ctx.lineTo(52, -82); ctx.quadraticCurveTo(62, -80, 64, -72); ctx.lineTo(50, -68); ctx.quadraticCurveTo(50, -50, 30, -38); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1c1a36'; circle(54, -77, 2.2); ctx.fill();
  ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(46, -83, 3, 5, -0.5, 0, Math.PI * 2); ctx.fill();
  // tassels in the rider's colour
  ctx.fillStyle = PCOL[D.k]; for (let i = 0; i < 3; i++) { circle(38 + i * 5, -58 + i * 2, 2.5); ctx.fill(); }
  ctx.restore(); ctx.lineCap = 'butt';
}
function crDrawTop(st) {
  const cam = st.cam.x;
  ctx.save(); ctx.translate(-cam, 0);
  pyrFxDraw(st, true);
  // pop words over each rider
  for (const D of st.pl) {
    if (D.popT > 1.1 || !D.pop) continue;
    const a = D.popT < 0.85 ? 1 : 1 - (D.popT - 0.85) / 0.25, s = D.popT < 0.1 ? 0.6 + D.popT * 4 : 1;
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
    bigText(D.pop, D.x + 10, D.y - 130 - D.popT * 26, (D.popBig ? 22 : 17) * (pyrBig() ? 1.3 : 1), D.popCol, s);
    ctx.restore();
  }
  ctx.restore();
}
function crHud(st) {
  const m = G.match; if (!st.pl || !m) return;
  const big = pyrBig(), sz = big ? 1.4 : 1, c = st.course;
  for (const D of st.pl) {
    const left = D.k === 0, pw = 210 * sz, ph = 40 * sz, y = H - 6 - ph, x = left ? 10 : W - 10 - pw;
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(x, y, pw, ph, ph / 2); ctx.fill();
    if (D.gold || D.tail) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; rr(x, y, pw, ph, ph / 2); ctx.stroke(); }
    text(NAMES[D.k], left ? x + 16 * sz : x + pw - 16 * sz, y + ph / 2 + 0.5, 18 * sz, PCOL[D.k], left ? 'left' : 'right');
    // dates: one dash each
    const dx0 = left ? x + 56 * sz : x + pw - 56 * sz - D.maxDates * 18 * sz;
    for (let i = 0; i < D.maxDates; i++) {
      const cx = dx0 + 9 * sz + i * 18 * sz, cy = y + ph * 0.36, full = i < D.dates, grow = i === D.dates ? D.dateT / (D.gold ? CR.dateTGold : CR.dateT) : 0;
      ctx.fillStyle = full ? '#8a4a1a' : 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.ellipse(cx, cy, 5 * sz, 7 * sz, 0.3, 0, Math.PI * 2); ctx.fill();
      if (grow > 0) { ctx.fillStyle = 'rgba(138,74,26,0.6)'; ctx.beginPath(); ctx.ellipse(cx, cy, 5 * sz * grow, 7 * sz * grow, 0.3, 0, Math.PI * 2); ctx.fill(); }
      if (full) { ctx.fillStyle = 'rgba(255,220,160,0.6)'; circle(cx - 1.5 * sz, cy - 3 * sz, 1.5 * sz); ctx.fill(); }
    }
    let lab = '', col = 'rgba(246,239,223,0.8)';
    if (m.phase === 'ready' || m.phase === 'count' || m.phase === 'intro') lab = 'Ready...';
    else if (D.done || st.res) { const w = m.end ? m.end.winner : st.res ? st.res.winner : -2; lab = w === D.k ? 'Winner!' : D.done ? 'Finished' : 'Good race!'; }
    else if (D.tail) { lab = 'Gold tailwind!'; col = C.gold; }
    else if (D.sink > 0.3) { lab = 'Sinking! Jump!'; col = '#ffb07a'; }
    else if (D.wobT > 0) lab = 'Bump!';
    else if (D.dashT > 0 || D.boostT > 0) { lab = 'Zoom!'; col = C.gold; }
    else if (D.air) lab = 'Hup!';
    else lab = Math.round(D.sp) + ' speed';
    text(lab, left ? x + 56 * sz + 50 * sz : x + pw - 56 * sz - 50 * sz, y + ph * 0.76, 11 * sz, col, 'center', 'body');
  }
  // the course progress bar
  {
    const x0 = W / 2 - (big ? 110 : 190), x1 = W / 2 + (big ? 110 : 190), y = H - (big ? 36 : 24);
    ctx.fillStyle = 'rgba(28,26,54,0.7)'; rr(x0 - 14, y - 12, x1 - x0 + 28, 24, 12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; rr(x0, y - 2, x1 - x0, 4, 2); ctx.fill();
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(x1 - 7, y + 6); ctx.lineTo(x1, y - 8); ctx.lineTo(x1 + 7, y + 6); ctx.fill();
    for (const D of [st.pl[1], st.pl[0]]) {
      const px = x0 + (x1 - x0) * clamp((D.x - CR.startX) / (c.len - CR.startX), 0, 1);
      ctx.fillStyle = PCOL[D.k]; circle(px, y + (D.k ? 4 : -4), 6 * (big ? 1.2 : 1)); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }
  // the course name
  const lab = c.name + (st.round >= 5 ? '  ·  the final!' : '');
  pyrPill(lab, 14, 46, C.gold, 'left');
  if (m.phase === 'ready' || m.phase === 'count') pyrPill(c.hint, W / 2, big ? 120 : 96, C.paper, 'center');
  else if (m.phase === 'live' && st.round <= 2 && st.rt < 6) {
    for (const D of st.pl) {
      if (crCpu(D.k)) continue;
      const left = D.k === 0, cx = left ? 10 + 105 * sz : W - 10 - 105 * sz;
      pyrPill('▲ jump · action: dash', cx, H - 52 * sz - 20, C.paper, 'center', big ? 15 : 12);
    }
  }
}
Sfx.extra.crJump = function (p) { this.tone(260 * p, 0.12, 'triangle', 0.05, 520 * p); };
Sfx.extra.crPerfect = function (p) { [660 * p, 880 * p, 1100 * p].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.05, null, i * 0.05)); };
Sfx.extra.crDash = function (p) { pyrNoise(this, 0.3, 0.08, 1500, 0, 400); this.tone(330 * p, 0.16, 'square', 0.03, 660 * p); };
Sfx.extra.crPrickle = function (p) { this.tone(1200 * p, 0.05, 'square', 0.03, 1600 * p); this.tone(300 * p, 0.12, 'triangle', 0.05, 160 * p, 0.04); };
