/* Pip & Bo - Level 30-1 The Time Thief: era 'moon' (Moon Landing, 1969). */
'use strict';

/* ===== 30-1 era 8: Moon Landing, 1969 (TTH_PHASES.moon) — Gavyn's pick =====
   "Land the moon lander before he takes the flag. One works the thrusters, the other watches the fuel."
   20 July 1969. Pip and Bo ride the lunar lander Eagle down from orbit to the Moon; the screen scrolls DOWN. The Time
   Thief has pinched the Moon flag and races them down in his jet machine to plant HIS clock flag first. Both sit in
   the lander's two windows (hide() is true: the era draws them with tthDrawHero; p.x / p.y stay on their seats).
   The course is built fresh every start (tthMoonBuild, all randomness through tthRand): 3 stretches, about 8100 px.

   THE TWO JOBS (they swap at both hover beacons: each player flies and fuels; room field `first` flies first)
   - The PILOT flies. Left / right fire the side jets (free), up (the jump button; the action button does the same,
     so touch players never need two arrows at once) burns the main engine to slow the fall. The engine only burns
     from the small READY tank (TTHMOON.ready.cap = 3.2 s of burn). Empty = it sputters and the lander just falls.
     Low gravity (g 70 px/s2, engine 190): floaty, sideways speed carries on, so steer and burn in turns.
   - The ENGINEER "watches the fuel". The action PUMPS: one stroke moves 1 s of fuel from the two side pods into the
     ready tank (a stroke takes 0.3 s, so a steady rhythm of about one press a second keeps the engine fed; mashing
     gains nothing). Pumping while the ready tube is in its red top (less than 0.45 s of room) SPILLS 0.6 s of fuel.
     The pods are not enough: the Thief fumbles spare FUEL CELLS (one about every 4.6 s, 2.5 s of fuel each) that float
     in the lander's way down. Left / right swing the grabber arm on the roof; when a cell is at the claw (it lights
     up, "GRAB!") the action grabs it instead of pumping. The arm only reaches about 120 px, so the engineer needs the
     pilot to fly close and slow, and the pilot needs the engineer's fuel to slow at all.
   - A cell goes into the pod on the arm's side (left grab = left pod; each pod holds 5.5 s). The pump always draws
     from the heavier pod. A lopsided lander (a difference of more than half a cell) TILTS, and a tilted engine pushes
     it sideways; more than 1.3 cells of difference is too lopsided to land ("Lopsided!").
   - Nothing needs more than about 2 presses a second, never two directions at once.

   THE THREE STRETCHES
   1 High orbit      rows of drifting rocks and old satellites with one wide gap each (the first two rows are half
                     rows, to learn to burn). The Thief nudges a rock into a gap now and then (see below).
   2 Crater canyon   crater walls with narrow passes between wide chambers (the shelves above a pass are safe to rest
                     on). Dust GEYSERS blow across 4 of the 8 passes: the vent glows and puffs for 1 s (the telegraph),
                     blows for 1.1 s, then rests 3 s. Hover above (that costs fuel: teamwork) and drop through
                     while it rests. A blast tosses the lander back up: "Whoosh!".
   3 Boulder field   bigger boulders, narrower gaps, more nudges, then the LANDING PAD on the ground: touch down on the
                     pad at 75 px/s or slower, not sliding (60 px/s) and level. Too fast, off the pad or lopsided =
                     a floaty bounce back up ("Too fast!", "Missed the pad!", "Lopsided!") to try again.
   Between the stretches a HOVER BEACON (the checkpoint and the breather): fly through its ring slowly (under
   60 px/s for 0.8 s; the ring fills). The lander docks for 2.6 s, the pods are topped up to half, and the jobs swap
   ("Swap jobs!"). Falling past the ring to the red line under it = "Too fast!" and a pop-back to 240 px above it.

   SOFT FAILS (nobody is hurt; all are team bumps, tthBump)
   - Hitting a rock, a satellite or a wall faster than 105 px/s: "Bonk!", a bounce (95 px/s) off it. Slower touches
     are free: the lander may slide along walls and rest on top of things (it sticks there until the pilot steers).
   - A geyser blast, a missed beacon, a bad landing: see above. After any bump the lander is safe for 1.4 s.
   - Running dry is not a fail by itself, the lander just falls; see the gold cell below.

   THE THIEF is on screen all the way, a little ahead and below (pinned near the bottom of the screen, so he is
   "always just ahead"; the race bar on the right shows the same: rubber-banded, a good landing always wins). He
   holds the Moon flag in his claw and carries his own clock flag. His mischief, always telegraphed:
   - fuel cells: he "drops" them (a help, thrown in an arc from his machine to a free spot ahead of the lander);
   - a nudge (stretches 1 and 3): he points, a rock beside the next gap blinks red with a "!" and an arrow for
     0.9 s, then slides 60 / 50 px into the gap over 1.2 s (the gap stays at least 200 px wide; the lander is 84).
   On the final approach he waits by the pad wrestling his flag pole into the rock. When Pip and Bo touch down, the
   thump makes his machine bounce in the low gravity: he drops the Moon flag (it floats down beside the pad) and his
   clock flag drifts off into space. Pip and Bo hop out (moon hops: gravity 380 instead of 2000) and PLANT the flag
   together: both stand at the flag and hold the action for 1.3 s. Then tthPhaseDone.

   GOLD HELP (always announced with tthHelp, never hidden)
   - 3 spills: "Gold safety valve" (the pump just clunks when the ready tube is full; nothing spills any more).
   - 4 fuel cells floated past while the pods had room: "Gold magnet claw" (reach 72 px instead of 40).
   - Both tanks empty for 2.2 s: the Thief tosses a GOLD fuel cell that floats along right beside the arm until it
     is grabbed (2.5 s into each pod). It still needs the engineer's arm and button, so nobody is carried.
   - 4 bonks (rocks / walls) in one stretch: "Gold bumpers" (bumps only count above 150 px/s and bounce less).
   - 3 geyser blasts: "Sleepy geysers" (they rest 5 s). 2 missed beacons: its beam widens (zone 150 x 110, 115 px/s).
   - 2 bad landings: a wider gold pad (300 px) and 100 px/s is slow enough; 4: 125 px/s and lopsided is forgiven.

   FAIRNESS
   - An idle partner stalls everything: without the engineer the ready tank is empty in a second (it starts at
     0.9 s), without the pilot nothing slows or steers the lander. Both beacons and the landing need a slow lander,
     which needs the engine: free fall from any pop-back is always too fast (checked for the gold limits too), and
     the flag needs both players' buttons. While nobody plays (st.idle) an autopilot holds the lander still.
   - Every hazard shows at least 0.9 s before it can hit; rocks and walls are in view about 3 s ahead (the lander
     sits high on the screen, TTHMOON.camY). Gaps are at least 2.4 lander-widths wide; successive gaps are at most
     250 px apart sideways. Fuel cells never appear inside rocks, walls, a beacon's zone or near the ground.
   - Supply follows time, not distance (a cell every 4.6 s of flying against about 1.9 s of burn needed), so a slow
     pair is not starved. Free fall is capped at 215 px/s.
   - Facts in the news line / taunts: 20 July 1969; the lander was called Eagle and landed with about 25 s of fuel
     left (the time pill counts this lander's fuel in seconds, and the landing news compares); the Moon's gravity is
     one sixth of Earth's.
   Stats (tthStats(st), plain JSON): t [stretch times], cells, missed, pumps, spills, tries (landing bounces),
   fuel (s left at touchdown), gold [help keys]. Every top-level name starts with tthMoon / TTHMOON, sounds with
   Sfx.extra.tthMoon. All state lives in st.ph (fresh every start). Brain: js/cpu/levels/world30/tth-moon.js. */
const TTHMOON = {
  // the lander (px, s): gravity, main engine, side jets, sideways drag (per s, only while not steering), speed caps
  g: 70, thrust: 190, side: 240, drag: 0.5, maxVx: 180, maxFall: 215, maxRise: 140,
  r: 42, foot: 46, camY: 205, xMin: 62, xMax: W - 62, startY: 205,
  bumpV: 105, bounceV: 95, softBumpV: 150, softBounceV: 55, goldBumps: 4,
  seat: [{ x: -19, y: -9 }, { x: 19, y: -9 }], seatS: 0.82,
  // fuel, in seconds of burn
  ready: { cap: 3.2, start: 0.9, stroke: 1, strokeT: 0.3, full: 0.45, spill: 0.6, goldSpills: 3 },
  pod: { cap: 5.5, start: 2.75, beacon: 2.75, cell: 2.5, dead: 0.5, tilt: 0.11 },
  cell: { fuel: 2.5, every: 4.6, first: 2.4, max: 3, flyT: 0.75, goldMiss: 4, dryT: 2.2 },
  arm: { len: 84, reach: 40, goldReach: 72, swing: 2.7, max: 1.95, pivotY: -52 },
  // the course: per stretch the number of rows / passes, the px between them, gap width first -> last, sideways shift
  stretch: [
    { name: 'High orbit', rows: 8, gap: 290, w: [320, 285], shift: [120, 250], lead: 440, nudgeEvery: 3 },
    { name: 'Crater canyon', rows: 8, gap: 300, w: [250, 220], shift: [110, 230], lead: 280, geysers: [2, 4, 6, 7] },
    { name: 'Boulder field', rows: 6, gap: 285, w: [280, 250], shift: [120, 250], lead: 470, nudgeEvery: 2 },
  ],
  beacon: { after: 400, zoneX: 100, zoneY: 70, v: 60, goldX: 150, goldY: 110, goldV: 115, holdT: 0.8, dockT: 2.6, gate: 185, back: 240, gold: 2 },
  gey: { rest: 3, sleepy: 5, warn: 1, blow: 1.1, firstRest: 1.2, h: 44, range: 520, gold: 3, upV: 125, sideV: 120 },
  nudge: { warn: 0.9, move: 1.2, dx: [60, 0, 50], first: 7, every: [9, 0, 6.5] },
  land: { after: 560, v: 75, vx: 60, lean: 1.3, padW: 190, goldW: 300, goldV: 100, gold2V: 125, bounce: 170, hop: 120, gold: 2, gold2: 4 },
  groundH: 64,
  foot: { g: 380, run: 140, acc: 700, jump: 330, plantR: 58, plantT: 1.3 },
  thief: { s: 0.62, sy: 498 },
  bot: { cruise: 104, pass: 88, cell: 52 },   // the brain's speeds (px/s): open sky, through a gap, beside a fuel cell
};
const TTHMOON_LINES = [
  'Race you down! MY flag goes up first!',
  'Only one sixth of Earth\'s gravity... wheee!',
  'The real lander was called Eagle. Mine is called FASTER!',
  'Eagle landed with 25 seconds of fuel left. And you?',
  'Tick, tock! The Moon is getting closer!',
  'Twelve people walked on the Moon. I\'ll be number 13!',
];
const tthMoonSolo = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
const tthMoonLerp = (a, b, k) => a + (b - a) * k;
const tthMoonPods = ph => ph.F.pod[0] + ph.F.pod[1];
const tthMoonFuel = ph => ph.F.ready + ph.F.pod[0] + ph.F.pod[1];
// how lopsided, in fuel cells: + = the right pod is heavier
const tthMoonLean = ph => (ph.F.pod[1] - ph.F.pod[0]) / TTHMOON.pod.cell;
const tthMoonRiding = ph => ph.mode === 'fly' || ph.mode === 'dock' || ph.mode === 'down';
// a hint or a line at most once every `gap` s
function tthMoonOnce(ph, key, gap) {
  if (ph.t - (ph.said[key] == null ? -999 : ph.said[key]) < gap) return false;
  ph.said[key] = ph.t; return true;
}

/* ---------- the course ---------- */
function tthMoonNextGap(gx, sh, lo, hi) {
  for (let n = 0; n < 16; n++) {
    const x = gx + (tthRand() < 0.5 ? -1 : 1) * (sh[0] + tthRand() * (sh[1] - sh[0]));
    if (x >= lo && x <= hi) return x;
  }
  return clamp(W - gx, lo, hi);
}
// a lumpy rock: 10 radius factors, made once
function tthMoonRock(k, s, x, y, r, amp) {
  const sh = [];
  for (let i = 0; i < 10; i++) sh.push(0.86 + tthRand() * 0.2);
  return { k, s, x, hx: x, y, r, amp, sp: 0.5 + tthRand() * 0.6, ph: tthRand() * 6.28, rot: tthRand() * 6.28, vr: (tthRand() - 0.5) * 0.5, sh, flash: 0 };
}
// one row of rocks (and old satellites in stretch 1) with a gap gw wide at gx
function tthMoonRow(ph, s, i, y, gx, gw) {
  const big = s === 2, gate = { s, i, y, x: gx, w: gw, top: y, bot: y, gey: null, nudged: false, rim: [null, null] };
  for (const d of [-1, 1]) {
    if (s === 0 && i < 2 && d === (i ? 1 : -1) * (gx < W / 2 ? 1 : -1)) continue;   // the first two rows: one side only
    let edge = gx + d * gw / 2, first = true;
    while (d < 0 ? edge > 10 : edge < W - 10) {
      let o;
      if (s === 0 && !first && tthRand() < 0.42) {
        const cx = edge + d * (84 + tthRand() * 14);
        o = { k: 'sat', s, x: cx, hx: cx, y: y + tthRand() * 50 - 25, r: 19, pan: 76, amp: 0, sp: 0.4, ph: tthRand() * 6.28, flash: 0, look: Math.floor(tthRand() * 2) };
        edge = cx + d * (84 + 14 + tthRand() * 30);
      } else {
        const r = big ? 34 + tthRand() * 22 : 26 + tthRand() * 17, amp = first ? 0 : 6 + tthRand() * 8;
        const cx = edge + d * (r + amp + (first ? 0 : tthRand() * 24));
        o = tthMoonRock(big ? 'boulder' : 'rock', s, cx, y + (first ? tthRand() * 24 - 12 : tthRand() * 70 - 35), r, amp);
        if (first) gate.rim[d < 0 ? 0 : 1] = o;
        edge = cx + d * (r + amp + 12 + tthRand() * 34);
      }
      ph.obs.push(o);
      gate.top = Math.min(gate.top, o.y - o.r - 4); gate.bot = Math.max(gate.bot, o.y + o.r + 4);
      first = false;
    }
  }
  ph.gates.push(gate);
}
function tthMoonBuild(ph) {
  const K = TTHMOON, S = K.stretch, R = tthRand;
  ph.obs = []; ph.gates = []; ph.beacons = []; ph.wall = [[], []];
  let y = K.startY + S[0].lead, gx = W / 2;
  const width = (s, i) => tthMoonLerp(S[s].w[0], S[s].w[1], i / Math.max(1, S[s].rows - 1));
  // 1: high orbit
  for (let i = 0; i < S[0].rows; i++, y += S[0].gap) { gx = tthMoonNextGap(gx, S[0].shift, 230, W - 230); tthMoonRow(ph, 0, i, y, gx, width(0, i)); }
  y += K.beacon.after - S[0].gap;
  ph.beacons.push({ i: 0, x: W / 2, y, got: false, p: 0, misses: 0, gold: false });
  // 2: the crater canyon: two wall lines (x as a function of y) with narrow passes
  const mouth = y + 300, wl = ph.wall[0], wr = ph.wall[1];
  let cl = 60 + R() * 50, cr = W - 60 - R() * 50;
  wl.push(-70, mouth, cl, mouth + 130); wr.push(W + 70, mouth, cr, mouth + 130);
  y = mouth + 130 + S[1].lead; gx = W / 2;
  for (let i = 0; i < S[1].rows; i++, y += S[1].gap) {
    gx = tthMoonNextGap(gx, S[1].shift, 260, W - 260);
    const w = width(1, i), gate = { s: 1, i, y, x: gx, w, top: y - 95, bot: y + 62, gey: null, nudged: true, rim: [null, null] };
    wl.push(cl + R() * 26, y - 95, gx - w / 2, y - 30, gx - w / 2, y + 35);
    wr.push(cr - R() * 26, y - 95, gx + w / 2, y - 30, gx + w / 2, y + 35);
    cl = 55 + R() * 60; cr = W - 55 - R() * 60;
    wl.push(cl, y + 88); wr.push(cr, y + 88);
    if (S[1].geysers.includes(i)) gate.gey = { dir: R() < 0.5 ? -1 : 1, state: 'off', t: 0, n: 0 };
    ph.gates.push(gate);
  }
  y -= S[1].gap;
  wl.push(cl - 10, y + 190, -70, y + 330); wr.push(cr + 10, y + 190, W + 70, y + 330);
  y += 330 + 200;
  ph.beacons.push({ i: 1, x: W / 2, y, got: false, p: 0, misses: 0, gold: false });
  // 3: the boulder field, then the ground and the pad
  y += S[2].lead; gx = W / 2;
  for (let i = 0; i < S[2].rows; i++, y += S[2].gap) { gx = tthMoonNextGap(gx, S[2].shift, 220, W - 220); tthMoonRow(ph, 2, i, y, gx, width(2, i)); }
  ph.ground = y - S[2].gap + K.land.after;
  const px = clamp(gx + (R() < 0.5 ? -1 : 1) * (60 + R() * 110), 330, W - 330), side = px < W / 2 ? 1 : -1;
  ph.pad = { x: px, w: K.land.padW, side };
  ph.thiefX = clamp(px + side * 310, 110, W - 110); ph.flagX = px + side * 165;
  // two big boulders sit on the ground on the far side of the pad
  ph.obs.push(tthMoonRock('boulder', 2, px - side * (K.land.padW / 2 + 120), ph.ground - 14, 62, 0));
  ph.obs.push(tthMoonRock('boulder', 2, px - side * (K.land.padW / 2 + 250), ph.ground - 4, 40, 0));
  ph.camMax = ph.ground + K.groundH - H;
  // ground decoration (craters, pebbles), made once
  ph.deco = [];
  for (let i = 0; i < 16; i++) ph.deco.push({ x: R() * W, y: 14 + R() * (K.groundH - 22), w: 10 + R() * 28, k: R() < 0.6 ? 0 : 1 });
}
// a canyon wall's x at height y (side 0 left, 1 right); off the screen outside the canyon
function tthMoonWallAt(ph, side, y) {
  const a = ph.wall[side], out = side ? W + 70 : -70;
  if (!a.length || y <= a[1] || y >= a[a.length - 1]) return out;
  for (let i = 0; i + 3 < a.length; i += 2) if (y <= a[i + 3]) { const dy = a[i + 3] - a[i + 1]; return dy > 0 ? a[i] + (a[i + 2] - a[i]) * (y - a[i + 1]) / dy : a[i + 2]; }
  return out;
}
// the first gap or pass the lander has not cleared yet (null after the last one of the course)
function tthMoonNextGate(ph) {
  const y = ph.L.y - TTHMOON.r;
  for (const g of ph.gates) if (y < g.bot) return g;
  return null;
}

/* ---------- setup ---------- */
function tthMoonSetup(st, Lv) {
  const K = TTHMOON, ph = st.ph, c = st.thief;
  ph.t = 0; ph.mode = 'fly'; ph.stretch = 0; ph.said = {};
  ph.pilot = Lv.def.first === 1 ? 1 : 0;
  ph.L = { x: W / 2, y: K.startY, vx: 0, vy: 36, tilt: 0, bank: 0, burn: 0, jet: 0, sput: 0, rest: false, dizzy: 0, top: K.startY - 40 };
  ph.F = { ready: K.ready.start, pod: [K.pod.start, K.pod.start], strokeT: 0, spillT: 0 };
  ph.arm = { a: 0.7, grabT: 0 }; ph.pv = { x: 0, y: 0 }; ph.claw = { x: 0, y: 0 }; ph.reachCell = null;
  ph.cells = []; ph.cellT = K.cell.first; ph.cellN = 0; ph.missN = 0; ph.magnet = false; ph.valve = false; ph.spillN = 0;
  ph.soft = false; ph.bumpN = 0; ph.geyN = 0; ph.sleepy = false; ph.dryT = 0; ph.dryN = 0;
  ph.nudgeT = K.nudge.first; ph.nudge = null; ph.sayT = 9; ph.sayN = 1; ph.intro = 0;
  ph.dock = null; ph.down = null; ph.land = { tries: 0, gold: 0 }; ph.sT0 = 0;
  ph.flag = { state: 'held', x: 0, y: 0, x0: 0, y0: 0, u: 0, rot: 0, plant: 0, hold: [false, false] }; ph.cflag = null; ph.pt = 0;
  ph.thiefSide = 1; ph.tv = 0; ph.hopT = [0.2, 0.7];
  tthMoonBuild(ph);
  st.cam = { x: 0, y: clamp(ph.L.y - K.camY, 0, ph.camMax) };
  Object.assign(c, { x: W - 150, y: st.cam.y + K.thief.sy, s: K.thief.s, face: -1, pose: 'idle', mood: 'smug', baseMood: 'smug', jet: true, item: st.era.loot, claw: 0.3, hidden: false, alpha: 1, flame: 1 });
  Object.assign(tthStats(st), { t: [], cells: 0, missed: 0, pumps: 0, spills: 0, tries: 0, fuel: 0, gold: [] });
  tthMoonArm(ph);
  tthMoonSeats(st, true);
}
// the arm's pivot (on the roof) and its claw, in world coords
function tthMoonArm(ph) {
  const K = TTHMOON, L = ph.L, A = ph.arm, ct = Math.cos(L.tilt), sn = Math.sin(L.tilt);
  ph.pv.x = L.x - K.arm.pivotY * sn; ph.pv.y = L.y + K.arm.pivotY * ct;
  ph.claw.x = ph.pv.x + Math.sin(A.a) * K.arm.len; ph.claw.y = ph.pv.y - Math.cos(A.a) * K.arm.len;
}
// Pip and Bo sit in the two windows: keep p.x / p.y on their seats (tags, hints and bubbles sit over them)
function tthMoonSeats(st, screen) {
  const K = TTHMOON, ph = st.ph, L = ph.L, ct = Math.cos(L.tilt), sn = Math.sin(L.tilt);
  for (const p of G.players) {
    const s = K.seat[p.id], x = L.x + s.x * ct - s.y * sn, y = L.y + s.x * sn + s.y * ct;
    p.x = x - p.w / 2 - (screen ? st.cam.x : 0); p.y = y - p.h - (screen ? st.cam.y : 0);
    p.vx = 0; p.vy = 0; p.alive = true; p.grounded = true; p.stun = 0; p.knockT = 0; p.sx = 1; p.sy = 1; p.face = p.id ? -1 : 1;
  }
}
function tthMoonGold(st, key, text, o) {
  const s = tthStats(st);
  if (!s.gold.includes(key)) s.gold.push(key);
  tthHelp(st, text, o);
}

/* ---------- flying: the pilot's physics ---------- */
// the lander touched something: push it out along the normal (nx, ny); a hard hit is a bump with a bounce
function tthMoonHit(st, nx, ny, pen, kind) {
  const K = TTHMOON, ph = st.ph, L = ph.L;
  L.x += nx * pen; L.y += ny * pen;
  const vn = L.vx * nx + L.vy * ny;
  if (vn >= 0) return;
  L.vx -= vn * nx; L.vy -= vn * ny;
  if (-vn > (ph.soft ? K.softBumpV : K.bumpV)) {
    const b = ph.soft ? K.softBounceV : K.bounceV;
    L.vx = L.vx * 0.6 + nx * b; L.vy = L.vy * 0.6 + ny * b;
    if (tthBump(st, { word: 'Bonk!', x: L.x - nx * K.r, y: L.y - ny * K.r - 16, kind })) {
      L.dizzy = 0.8; Sfx.play('tthMoonBonk');
      if (!reduceMotion) G.shake = Math.max(G.shake, 0.24);
      puff(L.x - nx * K.r, L.y - ny * K.r, 8, 'rgba(200,204,220,0.85)');
      if (++ph.bumpN === K.goldBumps && !ph.soft) { ph.soft = true; tthMoonGold(st, 'bumpers', 'Gold bumpers! Slow bumps don\'t count now.'); }
      else if (ph.bumpN % 3 === 1 && tthMoonOnce(ph, 'haha', 9)) tthReact(st, 'happy', ph.bumpN > 1 ? 'Bonk! Ha ha ha!' : 'Mind the rocks! Hee hee!', 1.6);
      if (tthMoonOnce(ph, 'slow', 14)) tthHint(st, ph.pilot, 'Slow down: ' + tthKey(ph.pilot, 'jump') + ' burns!', { cpu: 'Oops! Slowing down.' });
    }
  } else if (ny < -0.5) L.rest = true;
}
function tthMoonCollide(st) {
  const K = TTHMOON, ph = st.ph, L = ph.L, r = K.r;
  for (const o of ph.obs) {
    const dy = L.y - o.y;
    if (dy > 140 || dy < -140) continue;
    const dx = L.x - o.x, d = Math.hypot(dx, dy), min = r + o.r;
    if (d < min && d > 0.01) tthMoonHit(st, dx / d, dy / d, min - d, o.k);
    if (o.k === 'sat') {   // its solar panels: a thick line
      const cx = clamp(L.x, o.x - o.pan, o.x + o.pan), ex = L.x - cx, ey = L.y - o.y, e = Math.hypot(ex, ey);
      if (e < r + 8 && e > 0.01) tthMoonHit(st, ex / e, ey / e, r + 8 - e, 'sat');
    }
  }
  for (let side = 0; side < 2; side++) {
    const a = ph.wall[side];
    if (!a.length || L.y < a[1] - r || L.y > a[a.length - 1] + r) continue;
    for (let i = 0; i + 3 < a.length; i += 2) {
      const x0 = a[i], y0 = a[i + 1], x1 = a[i + 2], y1 = a[i + 3];
      if (y1 < L.y - r - 2 || y0 > L.y + r + 2) continue;
      const ex = x1 - x0, ey = y1 - y0, l2 = ex * ex + ey * ey, u = l2 ? clamp(((L.x - x0) * ex + (L.y - y0) * ey) / l2, 0, 1) : 0;
      const dx = L.x - (x0 + ex * u), dy = L.y - (y0 + ey * u), d = Math.hypot(dx, dy);
      if (d < r && d > 0.01) tthMoonHit(st, dx / d, dy / d, r - d, 'wall');
    }
    // never inside the rock itself
    const wx = tthMoonWallAt(ph, side, L.y);
    if (side ? L.x > wx - 8 : L.x < wx + 8) { L.x = wx + (side ? -r : r); L.vx = 0; }
  }
}
function tthMoonFly(st, dt) {
  const K = TTHMOON, ph = st.ph, L = ph.L, F = ph.F, idle = !!st.idle;
  const pilot = G.players[ph.pilot], eng = G.players[1 - ph.pilot];
  const lf = !idle && pilot.input.left, rt = !idle && pilot.input.right, up = !idle && (tthUp(pilot) || pilot.input.act);
  pilot.pendingAct = false; pilot.pendingJump = false; eng.pendingJump = false;
  // the main engine burns from the ready tank
  let burn = false;
  if (up && F.ready > 0) { burn = true; F.ready = Math.max(0, F.ready - dt); L.sput = 0; }
  else if (up) {
    if ((L.sput -= dt) <= 0) {
      L.sput = 0.28; Sfx.play('tthMoonSputter'); puff(L.x, L.y + K.foot, 2, 'rgba(150,150,170,0.8)');
      if (tthMoonOnce(ph, 'pump', 5)) {
        if (tthMoonPods(ph) > 0.05) tthHint(st, eng.id, 'Pump! Tap ' + tthKey(eng.id, 'act'), { cpu: 'Pumping!' });
        else tthHint(st, eng.id, 'Empty! Grab a fuel cell', { cpu: 'We need a fuel cell!' });
      }
    }
  }
  if (burn && (G.tickN % 12) === 0) Sfx.play('tthMoonBurn');
  if (burn && (G.tickN % 5) === 0) puff(L.x + (tthRand() - 0.5) * 10, L.y + K.foot + 14, 1, 'rgba(255,214,150,0.7)');
  L.burn = approach(L.burn, burn ? 1 : 0, dt * 9);
  if ((lf || rt) && L.jet === 0) Sfx.play('tthMoonJet');
  L.jet = lf ? -1 : rt ? 1 : 0;
  // a lopsided lander tilts, and a tilted engine pushes sideways
  const lean = tthMoonLean(ph), tiltT = Math.sign(lean) * Math.max(0, Math.abs(lean) - K.pod.dead) * K.pod.tilt;
  L.tilt += (tiltT - L.tilt) * Math.min(1, 2.5 * dt);
  L.bank += (L.jet * 0.05 - L.bank) * Math.min(1, 8 * dt);
  if (Math.abs(lean) >= 1.5 && tthMoonOnce(ph, 'lean', 16)) tthHint(st, eng.id, 'Lopsided! Grab on the ' + (lean > 0 ? 'left' : 'right') + ' next', { cpu: 'We lean! Fuel on the ' + (lean > 0 ? 'left' : 'right') + ', please.' });
  if (idle) { L.vx *= Math.exp(-3 * dt); L.vy -= L.vy * Math.min(1, 3 * dt); }   // nobody plays: the autopilot holds still
  else {
    L.vx += ((rt ? 1 : 0) - (lf ? 1 : 0)) * K.side * dt + (burn ? K.thrust * Math.sin(L.tilt) * dt : 0);
    if (!lf && !rt) L.vx *= Math.exp(-K.drag * dt);
    L.vx = clamp(L.vx, -K.maxVx, K.maxVx);
    L.vy = clamp(L.vy + (K.g - (burn ? K.thrust * Math.cos(L.tilt) : 0)) * dt, -K.maxRise, K.maxFall);
  }
  L.x += L.vx * dt; L.y += L.vy * dt;
  if (L.x < K.xMin) { L.x = K.xMin; L.vx = Math.max(0, L.vx); }
  if (L.x > K.xMax) { L.x = K.xMax; L.vx = Math.min(0, L.vx); }
  if (L.y < L.top) { L.y = L.top; L.vy = Math.max(0, L.vy); }
  L.rest = false;
  tthMoonCollide(st);
  if (L.rest && !lf && !rt && !burn) { L.vx = 0; L.vy = Math.min(0, L.vy); }   // resting on top of something: it stays put
  if (L.dizzy > 0) L.dizzy -= dt;
  tthMoonArm(ph);
  tthMoonEngineer(st, dt, eng, idle);
  tthMoonCells(st, dt);
  tthMoonHazards(st, dt);
  if (ph.mode === 'fly') tthMoonBeacon(st, dt);
  if (ph.mode === 'fly') tthMoonLanding(st);
  tthMoonTalk(st, dt);
}

/* ---------- flying: the engineer (the pump, the arm, the fuel cells) ---------- */
function tthMoonCanStow(ph, c) { return c.gold || tthMoonPods(ph) <= 2 * TTHMOON.pod.cap - 0.6; }
function tthMoonEngineer(st, dt, eng, idle) {
  const K = TTHMOON, ph = st.ph, F = ph.F, A = ph.arm, L = ph.L;
  if (!idle) {
    A.a = clamp(A.a + ((eng.input.right ? 1 : 0) - (eng.input.left ? 1 : 0)) * K.arm.swing * dt, -K.arm.max, K.arm.max);
    tthMoonArm(ph);
  }
  if (A.grabT > 0) A.grabT -= dt;
  if (F.strokeT > 0) F.strokeT -= dt;
  if (F.spillT > 0) F.spillT -= dt;
  // the fuel cell at the claw, if any
  const reach = ph.magnet ? K.arm.goldReach : K.arm.reach;
  let best = null, bd = reach;
  for (const c of ph.cells) { if (c.u < 1 || c.got) continue; const d = Math.hypot(c.x - ph.claw.x, c.y - ph.claw.y); if (d < bd) { bd = d; best = c; } }
  ph.reachCell = best;
  if (best && tthMoonCanStow(ph, best) && tthMoonOnce(ph, 'grab', 9)) tthHint(st, eng.id, 'Grab it: ' + tthKey(eng.id, 'act') + '!', { cpu: 'Got one!', life: 1.6 });
  if (!eng.pendingAct) return;
  eng.pendingAct = false;
  if (idle) return;
  const s = tthStats(st);
  if (best && tthMoonCanStow(ph, best)) {   // grab: into the pod on the arm's side
    best.got = true; A.grabT = 0.4; s.cells++;
    if (best.gold) { F.pod[0] = Math.min(K.pod.cap, F.pod[0] + K.cell.fuel); F.pod[1] = Math.min(K.pod.cap, F.pod[1] + K.cell.fuel); }
    else { let k = A.a < 0 ? 0 : 1; if (F.pod[k] > K.pod.cap - 0.6) k = 1 - k; F.pod[k] = Math.min(K.pod.cap, F.pod[k] + K.cell.fuel); }
    tthPop(st, best.x, best.y - 16, '+' + (best.gold ? 5 : K.cell.fuel) + ' s', best.gold ? C.gold : '#9fe07f', 20);
    burst(best.x, best.y, best.gold ? C.gold : '#9fe07f', 8); Sfx.play('tthMoonGrab', eng.id); rumble(eng.id, 0.3, 0.4, 100);
    ph.dryT = 0;
    return;
  }
  if (best && tthMoonOnce(ph, 'full', 5)) tthPop(st, best.x, best.y - 16, 'Pods full!', '#ffffff', 18);
  if (F.strokeT > 0) return;   // one stroke at a time: mashing gains nothing
  F.strokeT = K.ready.strokeT; s.pumps++;
  const pods = tthMoonPods(ph), room = K.ready.cap - F.ready;
  if (pods <= 0.01) { Sfx.play('tthMoonClunk'); if (tthMoonOnce(ph, 'empty', 6)) tthHint(st, eng.id, 'Pods empty! Grab a fuel cell', { cpu: 'We need a fuel cell!' }); return; }
  const take = amt => { for (let n = 0; n < 2 && amt > 0.001; n++) { const k = F.pod[1] > F.pod[0] ? 1 : 0, a = Math.min(amt, F.pod[k]); F.pod[k] -= a; amt -= a; } };
  if (room < K.ready.full) {
    if (ph.valve) { Sfx.play('tthMoonClunk'); return; }
    take(K.ready.spill); s.spills++; F.spillT = 0.5; Sfx.play('tthMoonSpill');
    tthPop(st, L.x, L.y - 80, 'Spill!', '#ffb13d', 20);
    for (const d of [-1, 1]) puff(L.x + d * 52, L.y + 26, 3, 'rgba(159,224,127,0.9)');
    if (++ph.spillN >= K.ready.goldSpills) { ph.valve = true; tthMoonGold(st, 'valve', 'Gold safety valve! No more spills.'); }
    else if (tthMoonOnce(ph, 'spill', 8)) tthHint(st, eng.id, 'Full! Pump when the tube is low', { cpu: 'Oops, spilled a bit!' });
    return;
  }
  const amt = Math.min(K.ready.stroke, pods, room);
  take(amt); F.ready += amt; Sfx.play('tthMoonPump', eng.id);
}
// where a new fuel cell may float: ahead of the lander, off to one side, clear of rocks, walls, beacons and the ground
function tthMoonCellSpot(st, gold) {
  const K = TTHMOON, ph = st.ph, L = ph.L, R = tthRand;
  let y = st.cam.y + H - 50 - R() * 70;
  for (const g of ph.gates) if (y > g.top - 40 && y < g.bot + 40) { y = g.bot + 46; break; }
  for (const b of ph.beacons) if (!b.got && y > b.y - 300 && y < b.y + K.beacon.gate + 30) return null;
  if (y > ph.ground - 330) return null;
  const wl = tthMoonWallAt(ph, 0, y), wr = tthMoonWallAt(ph, 1, y), lo = Math.max(72, wl + 56), hi = Math.min(W - 72, wr - 56);
  if (hi - lo < 200) return null;
  // mostly on the side of the lighter pod, so a grab levels the lander
  const lean = tthMoonLean(ph);
  let side = R() < 0.5 ? -1 : 1;
  if (Math.abs(lean) > 0.4 && R() < 0.75) side = lean > 0 ? -1 : 1;
  let x = L.x + side * (135 + R() * 105);
  if (wl > 0 || wr < W) x = side < 0 ? lo + R() * 40 : hi - R() * 40;   // in the canyon: by a chamber wall
  if (x < lo || x > hi) x = L.x - side * (135 + R() * 105);
  x = clamp(x, lo, hi);
  if (Math.abs(x - L.x) < 110) return null;
  for (const o of ph.obs) if (Math.abs(o.y - y) < o.r + 40 && Math.abs(o.hx - x) < (o.pan || o.r) + 44) return null;
  return { x, y };
}
function tthMoonCells(st, dt) {
  const K = TTHMOON, ph = st.ph, L = ph.L, c = st.thief, s = tthStats(st);
  // the Thief fumbles a spare cell now and then (not in calm moments)
  if (!tthCalm(st) && (ph.cellT -= dt) <= 0) {
    const live = ph.cells.filter(q => !q.got && !q.gold).length, spot = live < K.cell.max ? tthMoonCellSpot(st) : null;
    if (!spot) ph.cellT = 0.5;
    else {
      const from = tthThiefPts(c).claw;
      ph.cells.push({ x: spot.x, y: spot.y, tx: spot.x, ty: spot.y, x0: from.x, y0: from.y, u: 0, t: tthRand() * 6, gold: false, got: false, gotT: 0 });
      ph.cellT = K.cell.every * (0.85 + tthRand() * 0.3); ph.cellN++;
      Sfx.play('tthMoonToss');
      if (ph.cellN === 1) {
        tthReact(st, 'shocked', 'Oops! My spare fuel cells!', 2.2);
        tthNews(st, 'Fuel cells! Fly close and catch them with the arm.', false, 4.5);
        tthHint(st, 1 - ph.pilot, 'Aim the arm: ' + tthKey(1 - ph.pilot, 'move') + '. Grab: ' + tthKey(1 - ph.pilot, 'act'), { cpu: 'I\'ll catch it. Fly close!', life: 4.5 });
      } else if (ph.cellN % 4 === 0 && tthMoonOnce(ph, 'butter', 12)) tthSay(st, 'Butterfingers! That one was mine!', 1.8);
    }
  }
  // out of fuel for a while: a gold cell floats over, right beside the arm
  if (tthMoonDry(ph)) ph.dryT += dt; else ph.dryT = 0;
  if (ph.dryT > K.cell.dryT && !tthCalm(st) && !ph.cells.some(q => q.gold && !q.got)) {
    const from = tthThiefPts(c).claw;
    ph.cells.push({ x: from.x, y: from.y, tx: 0, ty: 0, x0: from.x, y0: from.y, u: 0, t: 0, gold: true, got: false, gotT: 0, side: L.x < W / 2 ? 1 : -1 });
    Sfx.play('tthMoonToss');
    if (ph.dryN++ === 0) { tthMoonGold(st, 'cell', 'Out of fuel! Grab the gold fuel cell by the arm.'); tthSay(st, 'Have one of mine. I want a RACE, not a wreck!', 2.6); }
    else tthNews(st, 'Out of fuel! Grab the gold fuel cell.', true, 3);
    tthHint(st, 1 - ph.pilot, 'Swing the arm to the gold cell: ' + tthKey(1 - ph.pilot, 'move'), { cpu: 'Gold fuel! I\'ll grab it.', gold: true, life: 4 });
  }
  let n = 0;
  for (const q of ph.cells) {
    q.t += dt;
    if (q.got) { q.gotT += dt; if (q.gotT < 0.25) ph.cells[n++] = q; continue; }
    if (q.gold) {   // it keeps beside the lander (where the arm reaches it sideways and up)
      const wl = tthMoonWallAt(ph, 0, L.y), wr = tthMoonWallAt(ph, 1, L.y);
      if (q.side > 0 && L.x + 96 > Math.min(W - 30, wr - 30)) q.side = -1; else if (q.side < 0 && L.x - 96 < Math.max(30, wl + 30)) q.side = 1;
      q.tx = L.x + q.side * 80; q.ty = L.y - 84;
    }
    if (q.u < 1) {   // tossed over in an arc
      q.u = Math.min(1, q.u + dt / K.cell.flyT);
      const e = q.u * q.u * (3 - 2 * q.u);
      q.x = q.x0 + (q.tx - q.x0) * e; q.y = q.y0 + (q.ty - q.y0) * e - Math.sin(q.u * Math.PI) * 60;
    } else if (q.gold) { q.x += (q.tx - q.x) * Math.min(1, 7 * dt); q.y += (q.ty - q.y) * Math.min(1, 7 * dt); }
    else if (q.y < st.cam.y - 40) {   // it floated off the top: missed
      if (tthMoonPods(ph) <= 2 * K.pod.cap - 0.6) {
        s.missed++;
        if (++ph.missN === K.cell.goldMiss && !ph.magnet) { ph.magnet = true; tthMoonGold(st, 'magnet', 'Gold magnet claw! The arm grabs from farther away.'); }
        else if (tthMoonFuel(ph) < 4 && tthMoonOnce(ph, 'near', 10)) tthHint(st, ph.pilot, 'Fly close to the fuel cells!', { cpu: 'I\'ll fly closer to the fuel.' });
      }
      continue;
    }
    ph.cells[n++] = q;
  }
  ph.cells.length = n;
}
const tthMoonDry = ph => ph.F.ready < 0.2 && tthMoonPods(ph) < 0.3;

/* ---------- flying: geysers, the Thief's nudges, wobbling rocks ---------- */
function tthMoonHazards(st, dt) {
  const K = TTHMOON, ph = st.ph, L = ph.L, calm = tthCalm(st), t = ph.t;
  // rocks bob about their place (the rim rocks of a gap keep still unless nudged)
  for (const o of ph.obs) {
    if (o.amp) o.x = o.hx + Math.sin(t * o.sp + o.ph) * o.amp;
    if (o.vr) o.rot += o.vr * dt;
    if (o.flash > 0) o.flash -= dt;
  }
  // dust geysers across some canyon passes: rest, warn (the telegraph), blow
  for (const g of ph.gates) {
    const q = g.gey;
    if (!q) continue;
    const near = L.y > g.y - K.gey.range && L.y < g.y + 160;
    if (q.state === 'off') { if (near && !calm) { q.state = 'rest'; q.t = K.gey.firstRest; } continue; }
    if (!near && q.state === 'rest') { q.state = 'off'; continue; }
    if (calm && q.state === 'rest') continue;
    q.t -= dt;
    if (q.state === 'rest' && q.t <= 0) { q.state = 'warn'; q.t = K.gey.warn; Sfx.play('tthMoonRumble'); if (q.n++ === 0 && tthMoonOnce(ph, 'gey', 30)) { tthNews(st, 'A dust geyser! Hover, then drop through while it rests.', false, 4); tthHint(st, ph.pilot, 'Wait above: hold ' + tthKey(ph.pilot, 'jump'), { cpu: 'I\'ll wait for the dust.' }); } }
    else if (q.state === 'warn' && q.t <= 0) { q.state = 'blow'; q.t = K.gey.blow; Sfx.play('tthMoonWhoosh'); if (!reduceMotion) G.shake = Math.max(G.shake, 0.12); }
    else if (q.state === 'blow' && q.t <= 0) { q.state = 'rest'; q.t = ph.sleepy ? K.gey.sleepy : K.gey.rest; }
    if (q.state === 'blow' && Math.abs(L.y - g.y) < K.r + K.gey.h / 2 - 8 && Math.abs(L.x - g.x) < g.w / 2 + 10 && st.teamSafe <= 0) {
      L.vy = -K.gey.upV; L.vx = q.dir * K.gey.sideV; L.dizzy = 0.8;
      if (tthBump(st, { word: 'Whoosh!', x: L.x, y: L.y - 60, kind: 'geyser', safe: 2 })) {
        if (!reduceMotion) G.shake = Math.max(G.shake, 0.3);
        if (++ph.geyN === K.gey.gold && !ph.sleepy) { ph.sleepy = true; tthMoonGold(st, 'geyser', 'Sleepy geysers! They rest longer now.'); }
        else tthHint(st, ph.pilot, 'Wait for the dust to stop!', { cpu: 'Whoa! I\'ll wait next time.' });
      }
    }
  }
  // the Thief nudges a rock into the next gap: he points, it blinks "!" (0.9 s), then it slides
  const S = K.stretch[ph.stretch];
  if (ph.nudge) {
    const n = ph.nudge, o = n.o;
    n.t += dt;
    if (n.t < K.nudge.warn) o.flash = 0.2;
    else {
      if (!n.go) { n.go = true; Sfx.play('tthMoonNudge'); st.thief.pose = 'laugh'; }
      const u = Math.min(1, (n.t - K.nudge.warn) / K.nudge.move), e = u * u * (3 - 2 * u), x = n.x0 + n.dx * e;
      n.g.x += (x - o.hx) / 2; n.g.w -= Math.abs(x - o.hx); o.hx = o.x = x;
      if (u >= 1) { ph.nudge = null; st.thief.pose = 'idle'; }
    }
  } else if (S.nudgeEvery && !calm && (ph.nudgeT -= dt) <= 0) {
    ph.nudgeT = 0.6;
    for (const g of ph.gates) {
      if (g.s !== ph.stretch || g.nudged || g.i % S.nudgeEvery !== S.nudgeEvery - 1) continue;
      const sy = g.y - st.cam.y;
      if (sy < 380 || sy > H - 20) continue;
      const side = tthRand() < 0.5 ? 0 : 1, o = g.rim[side] || g.rim[1 - side];
      if (!o) continue;
      g.nudged = true;
      ph.nudge = { g, o, t: 0, x0: o.hx, dx: (o.hx < g.x ? 1 : -1) * K.nudge.dx[ph.stretch], go: false };
      ph.nudgeT = K.nudge.every[ph.stretch];
      st.thief.pose = 'point'; Sfx.play('tthMoonWarn');
      tthSay(st, ['Oops! Did I bump that rock?', 'Mind the gap! Hee hee!', 'A little push... whoops!'][Math.floor(tthRand() * 3)], 1.9);
      break;
    }
  }
}

/* ---------- the hover beacons (checkpoints: the jobs swap) and the landing ---------- */
function tthMoonBeacon(st, dt) {
  const K = TTHMOON, ph = st.ph, L = ph.L, b = ph.beacons[ph.stretch], B = K.beacon;
  if (!b || b.got) return;
  const zx = b.gold ? B.goldX : B.zoneX, zy = b.gold ? B.goldY : B.zoneY, vmax = b.gold ? B.goldV : B.v;
  const inZone = Math.abs(L.x - b.x) < zx && Math.abs(L.y - b.y) < zy, sp = Math.hypot(L.vx, L.vy);
  if (L.y > b.y - 330 && tthMoonOnce(ph, 'beacon' + b.i, 999)) {
    tthNews(st, 'A hover beacon! Fly through the ring slowly.', false, 3.6);
    tthHint(st, ph.pilot, 'Slow down in the ring: ' + tthKey(ph.pilot, 'jump'), { cpu: 'I\'ll hover in the ring.' });
  }
  if (inZone && sp < vmax && !st.idle) { if (b.p === 0) Sfx.play('tthTick'); b.p += dt / B.holdT; }
  else b.p = Math.max(0, b.p - dt * 1.6);
  if (b.p >= 1) { tthMoonDockStart(st, b); return; }
  if (L.y > b.y + B.gate) {   // fell past it: back above the ring
    L.y = b.y - B.back; L.x = b.x; L.vx = 0; L.vy = 0; b.p = 0; L.dizzy = 0.8;
    tthBump(st, { word: 'Too fast!', x: L.x, y: L.y - 70, kind: 'beacon' });
    Sfx.play('tthMoonBounce');
    if (++b.misses === B.gold && !b.gold) { b.gold = true; tthMoonGold(st, 'beacon', 'Gold beam! The beacon catches you more easily.', { id: ph.pilot, hint: tthMoonSolo(ph.pilot) ? null : 'Burn with ' + tthKey(ph.pilot, 'jump') + ' before the ring!' }); }
    else tthHint(st, ph.pilot, 'Burn before the ring: hold ' + tthKey(ph.pilot, 'jump'), { cpu: 'Too fast! I\'ll burn sooner.' });
    if (tthMoonFuel(ph) < 1.5) tthHint(st, 1 - ph.pilot, 'Pump! The engine needs fuel', { cpu: 'I need fuel cells!' });
  }
}
function tthMoonDockStart(st, b) {
  const K = TTHMOON, ph = st.ph, F = ph.F, s = tthStats(st);
  b.got = true; ph.mode = 'dock'; ph.dock = { b, t: 0, x0: ph.L.x, y0: ph.L.y, swapped: false };
  s.t[ph.stretch] = Math.round((ph.t - ph.sT0) * 10) / 10; ph.sT0 = ph.t;
  F.pod[0] = Math.max(F.pod[0], K.pod.beacon); F.pod[1] = Math.max(F.pod[1], K.pod.beacon);
  ph.L.vx = 0; ph.L.vy = 0; ph.nudge = null;
  tthNews(st, 'Beacon ' + (b.i + 1) + ' of 2: checkpoint! The pods are topped up.', false, 3);
  tthReact(st, 'shocked', b.i ? 'Still there?! The Moon is MINE!' : 'Docking? I\'m not waiting! ...Much.', 2.2);
  Sfx.play('tthMoonDock'); confetti(b.x - 60, b.y); confetti(b.x + 60, b.y);
}
function tthMoonDockStep(st, dt) {
  const K = TTHMOON, ph = st.ph, L = ph.L, d = ph.dock, b = d.b;
  d.t += dt;
  for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
  const e = Math.min(1, d.t / 0.6), k = e * e * (3 - 2 * e);
  L.x = d.x0 + (b.x - d.x0) * k; L.y = d.y0 + (b.y - d.y0) * k + Math.sin(d.t * 3) * 2 * k;
  L.burn = approach(L.burn, 0.25, dt * 4); L.jet = 0; L.tilt *= 1 - Math.min(1, 3 * dt); L.bank = 0;
  ph.F.strokeT = 0; tthMoonArm(ph);
  if (!d.swapped && d.t >= 0.8) {
    d.swapped = true; ph.pilot = 1 - ph.pilot;
    tthSwap(st);
    tthHint(st, ph.pilot, 'You fly now: ' + tthKey(ph.pilot, 'jump') + ' burns, ' + tthKey(ph.pilot, 'move') + ' steers', { cpu: 'My turn to fly!', life: 3.6 });
    tthHint(st, 1 - ph.pilot, 'You pump now: tap ' + tthKey(1 - ph.pilot, 'act') + ', aim ' + tthKey(1 - ph.pilot, 'move'), { cpu: 'My turn at the pump!', life: 3.6 });
  }
  if (d.t >= K.beacon.dockT) {
    ph.mode = 'fly'; ph.dock = null; ph.stretch++; L.top = b.y - 70; L.vy = 24;
    ph.bumpN = 0; ph.cellT = 1.6; ph.nudgeT = 5;
    tthNews(st, ph.stretch === 1 ? 'The crater canyon: narrow passes ahead!' : 'The boulder field! Apollo 11\'s Eagle landed with about 25 s of fuel left.', false, 4.4);
    tthSay(st, ph.stretch === 1 ? 'Into the canyon! Mind the dust!' : 'I can see the landing spot. MY spot!', 2.2);
  }
}
function tthMoonLanding(st) {
  const K = TTHMOON, ph = st.ph, L = ph.L, D = K.land, pad = ph.pad, s = tthStats(st);
  if (ph.stretch === 2 && L.y > ph.ground - 520 && tthMoonOnce(ph, 'pad', 999)) {
    tthNews(st, 'The landing pad! Touch down slowly and level.', false, 4);
    tthHint(st, ph.pilot, 'Land softly on the pad: ' + tthKey(ph.pilot, 'jump') + ' burns', { cpu: 'Landing... gently!' });
    st.thief.pose = 'grab'; tthSay(st, 'My flag... goes... in... first! Nnngh!', 2.6);
  }
  if (L.y + K.foot < ph.ground) return;
  L.y = ph.ground - K.foot;
  const g = ph.land.gold, vmax = g >= 2 ? D.gold2V : g ? D.goldV : D.v, lean = tthMoonLean(ph);
  const onPad = Math.abs(L.x - pad.x) <= pad.w / 2 - 26, fast = L.vy > vmax || Math.abs(L.vx) > D.vx * (g ? 1.5 : 1), lop = Math.abs(lean) > D.lean && g < 2;
  if (onPad && !fast && !lop) { tthMoonTouchdown(st); return; }
  const word = fast ? 'Too fast!' : !onPad ? 'Missed the pad!' : 'Lopsided!';
  L.vy = -(fast || lop ? D.bounce : D.hop); L.vx *= 0.5; L.dizzy = 0.8;
  puff(L.x - 40, ph.ground, 6, 'rgba(200,204,220,0.85)'); puff(L.x + 40, ph.ground, 6, 'rgba(200,204,220,0.85)');
  Sfx.play('tthMoonBounce');
  if (!tthBump(st, { word, x: L.x, y: L.y - 70, kind: 'landing', safe: 1 })) return;
  ph.land.tries++; s.tries = ph.land.tries;
  if (ph.land.tries === D.gold) { ph.land.gold = 1; pad.w = D.goldW; tthMoonGold(st, 'pad', 'A wider gold pad! A little faster is fine now.'); }
  else if (ph.land.tries === D.gold2) { ph.land.gold = 2; tthMoonGold(st, 'pad2', 'Gold landing legs! They take a harder bump.'); }
  if (fast) tthHint(st, ph.pilot, 'Slower! Burn just before the ground: ' + tthKey(ph.pilot, 'jump'), { cpu: 'Too fast! Once more, slower.' });
  else if (!onPad) tthHint(st, ph.pilot, 'Steer over the pad: ' + tthKey(ph.pilot, 'move'), { cpu: 'Missed! Back to the pad.' });
  else tthHint(st, 1 - ph.pilot, 'Lopsided! Pump from the heavy pod', { cpu: 'Levelling the pods!' });
  if (tthMoonOnce(ph, 'ha2', 6)) tthReact(st, 'happy', 'Boing! Ha ha! Too slow!', 1.6);
}
// the Eagle has landed: the thump bounces the Thief, he drops the Moon flag, Pip and Bo hop out
function tthMoonTouchdown(st) {
  const ph = st.ph, L = ph.L, s = tthStats(st), c = st.thief;
  ph.mode = 'down'; ph.down = { t: 0, trip: false, vy: 0 };
  L.vx = 0; L.vy = 0; L.burn = 0; L.jet = 0; ph.cells.length = 0; ph.nudge = null;
  s.fuel = Math.round(tthMoonFuel(ph) * 10) / 10; s.t[2] = Math.round((ph.t - ph.sT0) * 10) / 10;
  for (let k = 0; k < 4; k++) puff(L.x + (k - 1.5) * 34, ph.ground, 5, 'rgba(210,214,228,0.9)');
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.3);
  Sfx.play('tthMoonLand'); for (const p of G.players) rumble(p.id, 0.5, 0.6, 220);
  const f = Math.round(s.fuel);
  tthNews(st, 'The Eagle has landed, with ' + f + ' s of fuel left! (The real one: about 25 s.)', true, 5);
  c.pose = 'shock'; c.mood = 'shocked'; c.moodT = 2;
}
function tthMoonAfter(st, dt) {
  const ph = st.ph, d = ph.down, c = st.thief, f = ph.flag;
  d.t += dt;
  if (!d.trip && d.t > 0.4) {
    d.trip = true; d.vy = -150;
    const at = tthThiefPts(c).claw;
    c.item = null; c.pose = 'dizzy'; c.claw = 0.2;
    Object.assign(f, { state: 'fly', x: at.x, y: at.y, x0: at.x, y0: at.y, u: 0 });
    const top = tthThiefP(c, -46, -92);
    ph.cflag = { x: top.x, y: top.y, vx: -c.face * 26, vy: -46, rot: 0 };
    tthSay(st, 'Whoa-oa-oa! Silly low gravity!', 2.6); Sfx.play('tthMoonBoing');
  }
  if (d.trip && !st.cut) {   // his machine bounces, slower and lower each time (the core moves him in the cutscene)
    d.vy += 150 * dt; c.y += d.vy * dt;
    if (c.y > ph.ground - 6) { c.y = ph.ground - 6; if (d.vy > 30) { d.vy = -d.vy * 0.6; Sfx.play('tthMoonBoing'); puff(c.x, ph.ground, 4, 'rgba(210,214,228,0.9)'); } else d.vy = 0; }
    if (d.t > 3.4 && c.pose === 'dizzy' && !st.cut) c.pose = 'sulk';
  }
  if (f.state === 'fly') {
    f.u = Math.min(1, f.u + dt / 1.5);
    const e = f.u;
    f.x = f.x0 + (ph.flagX - f.x0) * e; f.y = f.y0 + (ph.ground - 16 - f.y0) * e * e - Math.sin(e * Math.PI) * 70; f.rot = e * 7.85;
    if (f.u >= 1) { f.state = 'down'; f.x = ph.flagX; f.y = ph.ground - 8; Sfx.play('land'); puff(f.x, ph.ground, 4, 'rgba(210,214,228,0.9)'); }
  }
  const q = ph.cflag;
  if (q) { q.x += q.vx * dt; q.y += q.vy * dt; q.rot += dt * 1.6; if (q.y < st.cam.y - 60) ph.cflag = null; }
}
function tthMoonDownStep(st, dt) {
  const ph = st.ph, L = ph.L;
  for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
  tthMoonAfter(st, dt);
  tthMoonSeats(st);
  if (ph.down.t < 1.7) return;
  // out they hop
  ph.mode = 'foot';
  for (const p of G.players) { p.vy = -250; p.vx = (p.id ? 1 : -1) * 55 + ph.pad.side * 35; p.grounded = false; p.sy = 1.2; p.sx = 0.85; }
  Sfx.play('tthMoonHop');
  tthNews(st, 'One small step... Plant the flag together!', false, 4);
  tthShowBadges(st);
  for (const k of [0, 1]) tthHint(st, k, 'Go to the flag, then hold ' + tthKey(k, 'act'), { cpu: 'To the flag!', life: 4 });
}

/* ---------- on foot: moon hops and the flag ---------- */
function tthMoonWalk(ph, p, dt, inp) {
  const K = TTHMOON.foot, dir = inp ? (inp.right ? 1 : 0) - (inp.left ? 1 : 0) : 0;
  p.vx = approach(p.vx, dir * K.run, (p.grounded ? K.acc : K.acc * 0.45) * dt);
  if (dir) p.face = dir;
  if (inp && p.grounded && tthUp(p)) { p.vy = -K.jump; p.grounded = false; p.sx = 0.82; p.sy = 1.22; Sfx.play('tthMoonHop', p.id); }
  p.pendingJump = false;
  p.vy += K.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
  if (p.y + p.h >= ph.ground) {
    if (!p.grounded && p.vy > 140) { p.sx = 1.22; p.sy = 0.8; puff(p.x + p.w / 2, ph.ground, 4, 'rgba(210,214,228,0.9)'); Sfx.play('land'); }
    p.y = ph.ground - p.h; p.vy = 0; p.grounded = true;
  } else p.grounded = false;
  p.x = clamp(p.x, 30, W - 30 - p.w);
  p.sx += (1 - p.sx) * Math.min(1, 9 * dt); p.sy += (1 - p.sy) * Math.min(1, 9 * dt);
  p.tileGround = p.grounded; p.onPartner = false; p.alive = true;
}
function tthMoonFootStep(st, dt) {
  const K = TTHMOON.foot, ph = st.ph, f = ph.flag, ps = G.players, idle = !!st.idle;
  tthMoonAfter(st, dt);
  for (const p of ps) tthMoonWalk(ph, p, dt, idle ? null : p.input);
  if (ph.mode === 'planted') {   // a happy moment, then the Thief sulks off
    for (const p of ps) { p.pendingAct = false; if (p.grounded && (ph.hopT[p.id] -= dt) <= 0) { ph.hopT[p.id] = 0.5; p.vy = -K.jump * 0.8; p.grounded = false; p.sx = 0.82; p.sy = 1.22; } }
    if ((G.tickN % 10) === 0) confetti(f.x + (tthRand() - 0.5) * 220, ph.ground - 150 - tthRand() * 60);
    if ((ph.pt += dt) >= 1.2) {
      const c = st.thief;
      c.pose = 'sulk';
      tthPhaseDone(st, { say: 'Bah! One giant SULK for me. Keep your flag!', portal: { x: clamp(c.x - ph.pad.side * 20, 110, W - 110), y: ph.ground - 250 } });
    }
    return;
  }
  if (f.state !== 'down') { for (const p of ps) p.pendingAct = false; return; }
  let both = true;
  for (const p of ps) {
    const near = Math.abs(p.x + p.w / 2 - f.x) < K.plantR;
    f.hold[p.id] = near && p.input.act && !idle;
    if (!f.hold[p.id]) both = false;
    p.pendingAct = false;
  }
  if (both) { if (f.plant === 0) Sfx.play('tthTick'); f.plant += dt / K.plantT; }
  else {
    f.plant = Math.max(0, f.plant - dt * 0.9);
    for (const p of ps) {
      const o = ps[1 - p.id];
      if (f.hold[p.id] && !f.hold[o.id] && tthMoonOnce(ph, 'come' + o.id, 4)) tthHint(st, o.id, Math.abs(o.x + o.w / 2 - f.x) < K.plantR ? 'Hold ' + tthKey(o.id, 'act') + ' too!' : 'Come to the flag and hold ' + tthKey(o.id, 'act'), { cpu: 'Coming!' });
      else if (!f.hold[p.id] && Math.abs(p.x + p.w / 2 - f.x) < K.plantR && tthMoonOnce(ph, 'hold' + p.id, 5)) tthHint(st, p.id, 'Hold ' + tthKey(p.id, 'act') + ' together!', { cpu: 'Plant it with me!' });
    }
  }
  if (f.plant >= 1) {
    ph.mode = 'planted'; f.state = 'up'; ph.pt = 0;
    Sfx.play('tthMoonPlant'); Sfx.play('tthCheer');
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.15);
    for (let k = 0; k < 14; k++) confetti(f.x + (tthRand() - 0.5) * 80, ph.ground - 60);
    tthPop(st, f.x, ph.ground - 110, 'Planted!', C.gold, 28);
    tthReact(st, 'sad', 'Nooo! That was MY spot!', 1.4);
    for (const p of ps) rumble(p.id, 0.4, 0.6, 200);
  }
}

/* ---------- talk, the Thief, the camera, coasting ---------- */
function tthMoonTalk(st, dt) {
  const ph = st.ph, K = TTHMOON;
  if (ph.intro === 0 && ph.t > 0.3) {
    ph.intro = 1;
    tthNews(st, '20 July 1969: land the Eagle before the Thief plants HIS flag!', false, 5);
    tthSay(st, TTHMOON_LINES[0], 2.6);
  } else if (ph.intro === 1 && ph.t > 1.4) {
    ph.intro = 2;
    tthHint(st, ph.pilot, tthKey(ph.pilot, 'jump') + ' burns to slow down, ' + tthKey(ph.pilot, 'move') + ' steers', { cpu: 'I fly! You pump the fuel.', life: 4.5 });
    tthHint(st, 1 - ph.pilot, 'Pump fuel: tap ' + tthKey(1 - ph.pilot, 'act') + ' when the tube is low', { cpu: 'I pump the fuel! You fly.', life: 4.5 });
  } else if (ph.intro === 2 && ph.stretch === 1 && tthMoonOnce(ph, 'sixth', 999)) ph.sayT = Math.min(ph.sayT, 6);
  if (tthCalm(st) || st.say || ph.nudge) return;
  if ((ph.sayT -= dt) <= 0) {
    ph.sayT = 11 + tthRand() * 4;
    tthSay(st, TTHMOON_LINES[ph.sayN++ % TTHMOON_LINES.length], 2.8);
    if (ph.sayN === 2 && tthMoonOnce(ph, 'g6', 999)) tthNews(st, 'The Moon\'s gravity is one sixth of Earth\'s: everything falls slowly.', false, 4.5);
  }
}
// he keeps a little ahead (below), pinned near the bottom of the screen; at the end he waits beside the pad
function tthMoonThief(st, dt) {
  const K = TTHMOON, ph = st.ph, c = st.thief, L = ph.L;
  if (ph.mode !== 'fly' && ph.mode !== 'dock') { c.face = L.x >= c.x ? 1 : -1; return; }
  const yT = Math.min(st.cam.y + K.thief.sy, ph.ground - 6), end = st.cam.y > ph.camMax - 330;
  let xT;
  if (end) xT = ph.thiefX;
  else {
    const wl = tthMoonWallAt(ph, 0, yT - 40), wr = tthMoonWallAt(ph, 1, yT - 40);
    if (wl > 0 || wr < W) xT = (Math.max(0, wl) + Math.min(W, wr)) / 2;
    else { if (L.x > W / 2 + 120) ph.thiefSide = -1; else if (L.x < W / 2 - 120) ph.thiefSide = 1; xT = ph.thiefSide > 0 ? W - 150 : 150; }
  }
  c.x += (xT - c.x) * Math.min(1, 1.5 * dt); c.y += (yT - c.y) * Math.min(1, 7 * dt);
  c.face = L.x >= c.x ? 1 : -1; c.claw = 0.3; c.flame = end ? 0.6 : 1;
}
function tthMoonCam(st, dt, snap) {
  const K = TTHMOON, ph = st.ph, want = clamp(ph.L.y - K.camY, 0, ph.camMax);
  st.cam.x = 0;
  st.cam.y = snap ? want : st.cam.y + (want - st.cam.y) * Math.min(1, 7 * dt);
}
function tthMoonStep(st, dt) {
  const ph = st.ph;
  ph.t += dt;
  if (ph.mode === 'fly') tthMoonFly(st, dt);
  else if (ph.mode === 'dock') tthMoonDockStep(st, dt);
  else if (ph.mode === 'down') tthMoonDownStep(st, dt);
  else tthMoonFootStep(st, dt);
  tthMoonThief(st, dt);
  tthMoonCam(st, dt);
  if (ph.mode === 'fly' || ph.mode === 'dock') tthMoonSeats(st);
}
// the era card and the portal cutscene: the lander hangs still; on foot they land and keep hopping
function tthMoonCoast(st, dt) {
  const ph = st.ph, L = ph.L;
  for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
  if (tthMoonRiding(ph)) {
    L.burn = approach(L.burn, ph.mode === 'down' ? 0 : 0.3, dt * 4); L.jet = 0;
    tthMoonArm(ph); tthMoonThief(st, dt); tthMoonCam(st, dt); tthMoonSeats(st);
    return;
  }
  if (ph.down) tthMoonAfter(st, dt);
  for (const p of G.players) {
    tthMoonWalk(ph, p, dt, null);
    if (p.grounded && (ph.hopT[p.id] -= dt) <= 0) { ph.hopT[p.id] = 0.6; p.vy = -TTHMOON.foot.jump * 0.75; p.grounded = false; p.sx = 0.82; p.sy = 1.22; }
    p.face = st.thief.x > p.x ? 1 : -1;
  }
}

/* ---------- drawing: space, the far Moon, the ground (behind the Thief) ---------- */
const TTHMOONC = { rock: '#8a8fa3', rockLt: '#b4b8c9', rockDk: '#5f6379', boulder: '#9b958c', boulderLt: '#c4bdb1', boulderDk: '#6d675f', wall: '#7b8097', wallLt: '#a9aec2', wallDk: '#585c73',
  ground: '#a4a8b8', groundDk: '#7a7e92', foil: '#e2b24a', foilLt: '#f6d37a', foilDk: '#a87a1e', cabin: '#dfe2ee', cabinDk: '#a7acc2', glass: '#1d2748', fuel: '#9fe07f', hot: '#ff9f3d', dust: '#d9cdb4' };
function tthMoonDrawSky(st) {
  const ph = st.ph, cam = st.cam, k = clamp(cam.y / ph.camMax, 0, 1), t = G.clock;
  tthSky('#04051a', '#131a40');
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 64; i++) {
    const h = hash(i, 91), far = i % 3 === 0, span = H + 40;
    const y = (((h >>> 10) % span - cam.y * (far ? 0.02 : 0.05)) % span + span) % span - 20;
    ctx.globalAlpha = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * (1 + (h % 5) * 0.4) + i));
    circle(h % W, y, far ? 0.9 : 1.5); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // the Earth, far away (it sinks a little as we come down)
  const ex = 250, ey = 150 + k * 46, er = 40;
  ctx.fillStyle = 'rgba(120,170,255,0.14)'; circle(ex, ey, er + 12); ctx.fill();
  ctx.save(); circle(ex, ey, er); ctx.clip();
  ctx.fillStyle = '#3f7fe0'; ctx.fillRect(ex - er, ey - er, er * 2, er * 2);
  ctx.fillStyle = '#5cc27f';
  ctx.beginPath(); ctx.ellipse(ex - 12, ey - 8, 15, 20, 0.5, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.ellipse(ex + 18, ey + 14, 12, 9, -0.3, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.ellipse(ex + 12, ey - 22, 9, 5, 0.2, 0, 6.3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(ex - 4, ey + 16, 22, 4, -0.2, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.ellipse(ex + 6, ey - 4, 16, 3, 0.3, 0, 6.3); ctx.fill();
  ctx.fillStyle = 'rgba(4,5,26,0.5)'; circle(ex + 22, ey + 10, er * 1.15); ctx.fill();   // the night side
  ctx.restore();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; circle(ex, ey, er); ctx.stroke();
  // the Moon far below: a curved limb in orbit that flattens into hills as we come down
  const base = tthMoonLerp(H - 26, H - 150, k), R = tthMoonLerp(900, 26000, Math.min(1, k * 2.6)), hill = 30 * clamp((k - 0.25) / 0.5, 0, 1);
  const top = x => base + (x - W / 2) * (x - W / 2) / (2 * R) - hill * (Math.sin(x * 0.011 + 1) * 0.6 + Math.sin(x * 0.027) * 0.4);
  ctx.fillStyle = '#4c5069'; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 24) ctx.lineTo(x, top(x));
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#7a7f9a'; ctx.lineWidth = 3; ctx.beginPath();
  for (let x = 0; x <= W; x += 24) { if (x) ctx.lineTo(x, top(x)); else ctx.moveTo(x, top(x)); }
  ctx.stroke();
  ctx.fillStyle = 'rgba(40,43,64,0.55)';
  for (let i = 0; i < 9; i++) { const h = hash(i, 17), x = 40 + (h % (W - 80)), y = top(x) + 22 + ((h >>> 9) % 70), w = 16 + ((h >>> 5) % 30); if (y < H + 10) { ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.3, 0, 0, 6.3); ctx.fill(); } }
}
function tthMoonDrawRock(o) {
  const col = o.k === 'boulder', n = o.sh.length;
  ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot);
  ctx.beginPath();
  for (let i = 0; i < n; i++) { const a = i / n * 6.283, r = o.r * o.sh[i]; if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath();
  ctx.fillStyle = o.flash > 0 && Math.sin(G.clock * 30) > 0 ? '#ff8f8f' : col ? TTHMOONC.boulder : TTHMOONC.rock; ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.fillStyle = col ? TTHMOONC.boulderLt : TTHMOONC.rockLt; ctx.beginPath(); ctx.ellipse(-o.r * 0.28, -o.r * 0.34, o.r * 0.34, o.r * 0.2, -0.5, 0, 6.3); ctx.fill();
  ctx.fillStyle = col ? TTHMOONC.boulderDk : TTHMOONC.rockDk;
  ctx.beginPath(); ctx.ellipse(o.r * 0.28, o.r * 0.2, o.r * 0.2, o.r * 0.14, 0.3, 0, 6.3); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-o.r * 0.3, o.r * 0.42, o.r * 0.12, o.r * 0.08, 0, 0, 6.3); ctx.fill();
  ctx.restore();
}
function tthMoonDrawSat(o) {
  const t = G.clock;
  ctx.save(); ctx.translate(o.x, o.y + Math.sin(t * o.sp + o.ph) * 3);
  ctx.lineJoin = 'round'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  for (const d of [-1, 1]) {   // the solar panels
    ctx.fillStyle = '#4a6fd6'; ctx.fillRect(d * 22, -9, d * (o.pan - 22), 18); ctx.strokeRect(d * 22, -9, d * (o.pan - 22), 18);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let x = 34; x < o.pan; x += 14) { ctx.moveTo(d * x, -9); ctx.lineTo(d * x, 9); }
    ctx.moveTo(d * 22, 0); ctx.lineTo(d * o.pan, 0); ctx.stroke();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  }
  ctx.fillStyle = o.look ? '#d9dbe8' : TTHMOONC.foil; rr(-20, -17, 40, 34, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(28,26,54,0.25)'; ctx.fillRect(-14, -3, 28, 5);
  ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(-6, -32); ctx.stroke();                 // a bent old aerial
  ctx.fillStyle = Math.sin(t * 5 + o.ph) > 0.6 ? '#ff5f6d' : '#7a2a3a'; circle(-6, -33, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c9ccda'; ctx.beginPath(); ctx.arc(8, 19, 9, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();   // the dish
  ctx.restore();
}
function tthMoonDrawWalls(st) {
  const ph = st.ph, y0 = st.cam.y - 80, y1 = st.cam.y + H + 80;
  for (let side = 0; side < 2; side++) {
    const a = ph.wall[side];
    if (!a.length || a[1] > y1 || a[a.length - 1] < y0) continue;
    const out = side ? W + 80 : -80;
    let i0 = 0, i1 = a.length - 2;
    while (i0 + 2 < a.length && a[i0 + 3] < y0) i0 += 2;
    while (i1 > 1 && a[i1 - 1] > y1) i1 -= 2;
    ctx.beginPath(); ctx.moveTo(out, a[i0 + 1]);
    for (let i = i0; i <= i1; i += 2) ctx.lineTo(a[i], a[i + 1]);
    ctx.lineTo(out, a[i1 + 1]); ctx.closePath();
    ctx.fillStyle = TTHMOONC.wall; ctx.fill();
    // a lit rim and the ink line along the rock face
    ctx.lineJoin = 'round';
    ctx.beginPath(); for (let i = i0; i <= i1; i += 2) { const x = a[i] + (side ? 7 : -7), y = a[i + 1]; if (i > i0) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.strokeStyle = TTHMOONC.wallLt; ctx.lineWidth = 6; ctx.stroke();
    ctx.beginPath(); for (let i = i0; i <= i1; i += 2) { if (i > i0) ctx.lineTo(a[i], a[i + 1]); else ctx.moveTo(a[i], a[i + 1]); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; ctx.stroke();
    // craters in the rock
    ctx.fillStyle = TTHMOONC.wallDk;
    for (let i = i0; i <= i1; i += 2) {
      const h = hash(i, 5 + side), dx = 34 + (h % 50), w = 10 + ((h >>> 7) % 16);
      ctx.beginPath(); ctx.ellipse(a[i] + (side ? dx : -dx), a[i + 1] + ((h >>> 12) % 40) - 10, w, w * 0.45, 0, 0, 6.3); ctx.fill();
    }
  }
}
function tthMoonDrawGeyser(g) {
  const q = g.gey, K = TTHMOON.gey, t = G.clock, x0 = q.dir > 0 ? g.x - g.w / 2 : g.x + g.w / 2, d = q.dir;
  // the vent: a dark crack in the pass wall, glowing while it warns
  const warn = q.state === 'warn', blow = q.state === 'blow';
  if (warn || blow) { ctx.fillStyle = 'rgba(255,196,110,' + (0.35 + 0.3 * Math.sin(t * 22)).toFixed(2) + ')'; circle(x0, g.y, 30); ctx.fill(); }
  ctx.fillStyle = '#2a2c40'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x0 - d * 3, g.y, 9, 20, 0, 0, 6.3); ctx.fill(); ctx.stroke();
  if (warn) {   // puffs: it is about to blow
    ctx.fillStyle = TTHMOONC.dust;
    for (let i = 0; i < 4; i++) { const u = (t * 2.2 + i * 0.25) % 1; ctx.globalAlpha = 0.8 * (1 - u); circle(x0 + d * (10 + u * 46), g.y + Math.sin(i * 2.4 + t * 3) * 8, 5 + u * 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    bigText('!', x0 + d * 30, g.y - 34 - Math.abs(Math.sin(t * 12)) * 4, 26, '#ff5f6d', 1);
  } else if (blow) {
    const k = clamp(Math.min((K.blow - q.t) / 0.12, q.t / 0.2), 0, 1), len = g.w * k;
    ctx.fillStyle = 'rgba(217,205,180,0.55)'; rr(Math.min(x0, x0 + d * len), g.y - K.h / 2, len, K.h, K.h / 2); ctx.fill();
    ctx.fillStyle = TTHMOONC.dust;
    for (let i = 0; i < 9; i++) { const u = (t * 2.6 + i / 9) % 1; ctx.globalAlpha = 0.9 - u * 0.5; circle(x0 + d * u * len, g.y + Math.sin(i * 1.9 + t * 9) * (K.h * 0.3), 9 + (i % 3) * 4 + u * 6); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}
function tthMoonDrawBeacon(b, front, ph) {
  const K = TTHMOON.beacon, t = G.clock, rx = (b.gold ? K.goldX : K.zoneX) + 14, ry = 30, col = b.got ? '#9fe07f' : b.gold ? C.gold : '#7fe9ff';
  ctx.lineCap = 'round';
  if (!front) {
    // the red line under it: falling past is too fast
    if (!b.got) { ctx.strokeStyle = 'rgba(255,95,109,0.5)'; ctx.lineWidth = 3; ctx.setLineDash([10, 12]); ctx.beginPath(); ctx.moveTo(0, b.y + K.gate); ctx.lineTo(W, b.y + K.gate); ctx.stroke(); ctx.setLineDash([]); }
    ctx.fillStyle = b.got ? 'rgba(159,224,127,0.10)' : 'rgba(127,233,255,0.10)'; ctx.beginPath(); ctx.ellipse(b.x, b.y, rx, ry, 0, 0, 6.3); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(b.x, b.y, rx, ry, 0, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(b.x, b.y, rx, ry, 0, Math.PI, Math.PI * 2); ctx.stroke();
    // two little buoys with lamps
    for (const d of [-1, 1]) {
      const x = b.x + d * (rx + 16), y = b.y + Math.sin(t * 2 + d) * 3;
      ctx.fillStyle = '#d9dbe8'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(x - 9, y - 12, 18, 24, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = Math.sin(t * 6 + d) > 0 ? col : '#ffffff'; circle(x, y - 17, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7fe9ff'; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 30 + d); ctx.beginPath(); ctx.moveTo(x - 5, y + 12); ctx.lineTo(x, y + 24); ctx.lineTo(x + 5, y + 12); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    }
    return;
  }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(b.x, b.y, rx, ry, 0, 0, Math.PI); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(b.x, b.y, rx, ry, 0, 0, Math.PI); ctx.stroke();
  // running lights, and the ring filling while the lander hovers
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 6; i++) { const a = (i / 6 + t * 0.25) % 1 * Math.PI; circle(b.x + Math.cos(a) * rx, b.y + Math.sin(a) * ry, 3); ctx.fill(); }
  if (!b.got) {
    if (b.p > 0) { ctx.strokeStyle = C.gold; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(b.x, b.y, rx, ry, 0, Math.PI * (1 - b.p), Math.PI); ctx.stroke(); }
    else if (Math.abs(ph.L.y - b.y) > 60) text('HOVER HERE', b.x, b.y + ry + 22, tthBig() ? 20 : 15, col, 'center', 'body');
  }
}
function tthMoonDrawGround(st) {
  const K = TTHMOON, ph = st.ph, gy = ph.ground, pad = ph.pad, t = G.clock;
  if (gy - st.cam.y > H + 20) return;
  ctx.fillStyle = TTHMOONC.ground; ctx.fillRect(0, gy, W, K.groundH + 40);
  ctx.fillStyle = TTHMOONC.groundDk;
  for (const d of ph.deco) { ctx.beginPath(); if (d.k) ctx.ellipse(d.x, gy + d.y, d.w, d.w * 0.3, 0, 0, 6.3); else circle(d.x, gy + d.y, d.w * 0.22); ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
  ctx.strokeStyle = '#cfd2de'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, gy + 4); ctx.lineTo(W, gy + 4); ctx.stroke();
  // the landing pad: a flat marked slab with blinking lamps
  const x0 = pad.x - pad.w / 2, gold = ph.land.gold > 0;
  ctx.fillStyle = gold ? '#ffe08a' : '#4a4d66'; ctx.strokeStyle = gold ? C.goldDark : C.ink; ctx.lineWidth = 3; rr(x0, gy - 7, pad.w, 14, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = gold ? C.goldDark : '#ffd23f';
  for (let x = x0 + 14; x < x0 + pad.w - 20; x += 28) { ctx.beginPath(); ctx.moveTo(x, gy - 5); ctx.lineTo(x + 12, gy - 5); ctx.lineTo(x + 6, gy + 5); ctx.lineTo(x - 6, gy + 5); ctx.closePath(); ctx.fill(); }
  for (const d of [-1, 1]) {
    const x = pad.x + d * (pad.w / 2 + 12);
    ctx.fillStyle = '#8b8fa5'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.fillRect(x - 3, gy - 26, 6, 26); ctx.strokeRect(x - 3, gy - 26, 6, 26);
    ctx.fillStyle = Math.sin(t * 6 + d) > 0 ? '#9fe07f' : '#ffffff'; circle(x, gy - 30, 6); ctx.fill(); ctx.stroke();
  }
  if (ph.mode === 'fly' && gy - st.cam.y < H) { const bob = Math.abs(Math.sin(t * 5)) * 6; bigText('▼', pad.x, gy - 46 - bob, tthBig() ? 30 : 24, gold ? C.gold : '#9fe07f', 1); text('LAND HERE', pad.x, gy + 30, tthBig() ? 20 : 15, '#2b2e44', 'center', 'body'); }
}
function tthMoonDrawBack(st) {
  const ph = st.ph, y0 = st.cam.y - 120, y1 = st.cam.y + H + 120;
  tthScreen(st, () => tthMoonDrawSky(st));
  tthMoonDrawGround(st);
  tthMoonDrawWalls(st);
  for (const g of ph.gates) if (g.gey && g.y > y0 && g.y < y1) tthMoonDrawGeyser(g);
  for (const b of ph.beacons) if (b.y > y0 - 100 && b.y < y1) tthMoonDrawBeacon(b, false, ph);
  for (const o of ph.obs) { if (o.y < y0 || o.y > y1) continue; if (o.k === 'sat') tthMoonDrawSat(o); else tthMoonDrawRock(o); }
  // a rock the Thief is about to nudge: a "!" and an arrow into the gap
  const n = ph.nudge;
  if (n && n.t < TTHMOON.nudge.warn + 0.3) {
    const o = n.o, d = Math.sign(n.dx);
    bigText('!', o.x, o.y - o.r - 20 - Math.abs(Math.sin(G.clock * 12)) * 5, 30, '#ff5f6d', 1);
    ctx.strokeStyle = '#ff5f6d'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(o.x + d * (o.r + 8), o.y); ctx.lineTo(o.x + d * (o.r + 46), o.y); ctx.moveTo(o.x + d * (o.r + 32), o.y - 12); ctx.lineTo(o.x + d * (o.r + 46), o.y); ctx.lineTo(o.x + d * (o.r + 32), o.y + 12); ctx.stroke();
  }
}

/* ---------- drawing: fuel cells, the lander, the flags (in front of the Thief) ---------- */
function tthMoonDrawCell(q, lit) {
  const t = G.clock, s = q.got ? 1 - q.gotT / 0.25 : 1, bob = q.u >= 1 && !q.gold ? Math.sin(q.t * 2.4) * 4 : 0;
  ctx.save(); ctx.translate(q.x, q.y + bob); ctx.rotate(q.u < 1 ? q.u * 6.283 : Math.sin(q.t * 1.3) * 0.18); ctx.scale(s, s);
  ctx.fillStyle = q.gold ? 'rgba(255,197,61,0.3)' : 'rgba(159,224,127,0.25)'; circle(0, 0, 26 + Math.sin(t * 5) * 3); ctx.fill();
  if (lit) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -t * 30; circle(0, 0, 30); ctx.stroke(); ctx.setLineDash([]); }
  ctx.fillStyle = q.gold ? C.gold : TTHMOONC.fuel; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  rr(-11, -15, 22, 30, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6d7189'; ctx.fillRect(-7, -20, 14, 6); ctx.strokeRect(-7, -20, 14, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(-7, -10, 4, 18);
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(3, -9); ctx.lineTo(-4, 2); ctx.lineTo(0, 2); ctx.lineTo(-3, 10); ctx.lineTo(5, -2); ctx.lineTo(1, -2); ctx.closePath(); ctx.fill();   // a little bolt
  ctx.restore();
  if (lit && !q.got) bigText('GRAB!', q.x, q.y - 40, tthBig() ? 24 : 17, '#ffffff', 1);
}
function tthMoonDrawLander(st) {
  const K = TTHMOON, ph = st.ph, L = ph.L, F = ph.F, A = ph.arm, t = G.clock, riding = tthMoonRiding(ph), eng = 1 - ph.pilot;
  const X = TTHMOONC;
  ctx.save(); ctx.translate(L.x, L.y); ctx.rotate(L.tilt + L.bank);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // the main engine's flame (and a cough of smoke when the ready tank is empty)
  if (L.burn > 0.03) {
    const len = (34 + Math.sin(t * 41) * 7 + Math.sin(t * 23) * 4) * L.burn;
    ctx.fillStyle = '#ffb13d'; ctx.beginPath(); ctx.moveTo(-12, 42); ctx.quadraticCurveTo(-9, 42 + len * 0.7, 0, 44 + len); ctx.quadraticCurveTo(9, 42 + len * 0.7, 12, 42); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.moveTo(-6, 42); ctx.quadraticCurveTo(-4, 42 + len * 0.4, 0, 43 + len * 0.6); ctx.quadraticCurveTo(4, 42 + len * 0.4, 6, 42); ctx.closePath(); ctx.fill();
  }
  // side jets
  if (L.jet) { const d = -L.jet; ctx.fillStyle = 'rgba(255,255,255,' + (0.6 + 0.3 * Math.sin(t * 50)).toFixed(2) + ')'; ctx.beginPath(); ctx.moveTo(d * 38, -26); ctx.lineTo(d * (58 + Math.sin(t * 37) * 5), -22); ctx.lineTo(d * 38, -18); ctx.closePath(); ctx.fill(); }
  // legs and foot pads
  ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 28, 20); ctx.lineTo(d * 46, 42); ctx.stroke(); }
  ctx.strokeStyle = '#c9ccda'; ctx.lineWidth = 3;
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 28, 20); ctx.lineTo(d * 46, 42); ctx.stroke(); }
  ctx.fillStyle = X.foil; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * 47, 44, 10, 3.6, 0, 0, 6.3); ctx.fill(); ctx.stroke(); }
  // the engine bell
  ctx.fillStyle = '#5a5e76'; ctx.beginPath(); ctx.moveTo(-9, 30); ctx.lineTo(9, 30); ctx.lineTo(14, 43); ctx.lineTo(-14, 43); ctx.closePath(); ctx.fill(); ctx.stroke();
  // the two side pods: see-through tanks, the fuel inside
  for (let k = 0; k < 2; k++) {
    const d = k ? 1 : -1, x = d > 0 ? 42 : -56, lv = clamp(F.pod[k] / K.pod.cap, 0, 1);
    ctx.fillStyle = '#6d7189'; ctx.fillRect(d > 0 ? 36 : -42, 8, 6, 5);
    ctx.fillStyle = 'rgba(20,16,50,0.75)'; rr(x, -8, 14, 40, 6); ctx.fill();
    if (lv > 0.01) { ctx.save(); rr(x, -8, 14, 40, 6); ctx.clip(); ctx.fillStyle = F.spillT > 0 ? '#d6ff9a' : X.fuel; ctx.fillRect(x, 32 - 40 * lv, 14, 40 * lv); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 2, 32 - 40 * lv, 3, 40 * lv); ctx.restore(); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(x, -8, 14, 40, 6); ctx.stroke();
  }
  // the gold-foil descent stage
  ctx.fillStyle = X.foil; ctx.beginPath(); ctx.moveTo(-34, 2); ctx.lineTo(34, 2); ctx.lineTo(40, 14); ctx.lineTo(33, 31); ctx.lineTo(-33, 31); ctx.lineTo(-40, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = X.foilDk; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-22, 4); ctx.lineTo(-26, 30); ctx.moveTo(-4, 4); ctx.lineTo(-7, 30); ctx.moveTo(15, 4); ctx.lineTo(19, 30); ctx.stroke();
  ctx.fillStyle = X.foilLt; ctx.fillRect(-30, 6, 22, 4);
  if (ph.soft) { ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.setLineDash([6, 7]); circle(0, 0, K.r + 5); ctx.stroke(); ctx.setLineDash([]); }
  // the cabin with its two windows
  ctx.fillStyle = X.cabin; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(-38, -46, 76, 50, 13); ctx.fill(); ctx.stroke();
  ctx.fillStyle = X.cabinDk; ctx.fillRect(-36, -4, 72, 5);
  for (let k = 0; k < 2; k++) {
    const sx = K.seat[k].x;
    ctx.fillStyle = X.glass; rr(sx - 14, -41, 28, 33, 8); ctx.fill();
    if (riding) {
      ctx.save(); rr(sx - 14, -41, 28, 33, 8); ctx.clip();
      const bob = ph.mode === 'fly' ? Math.sin(t * 9 + k) * (L.burn > 0.3 ? 0.9 : 0) : 0, hop = ph.mode === 'down' ? Math.max(0, (ph.down.t - 1.45) / 0.25) * -16 : 0;
      tthDrawHero(k, sx, K.seat[k].y + bob + hop, { s: K.seatS, face: k ? -1 : 1, stun: L.dizzy > 0, sy: k === eng && F.strokeT > 0 ? 0.93 : 1 });
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.moveTo(sx - 12, -39); ctx.lineTo(sx - 2, -39); ctx.lineTo(sx - 12, -22); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = k === ph.pilot || !riding ? C.ink : PCOL[k]; ctx.lineWidth = 2.5; rr(sx - 14, -41, 28, 33, 8); ctx.stroke();
  }
  // the ready tube between the windows: what the engine can burn right now
  const rl = clamp(F.ready / K.ready.cap, 0, 1), low = F.ready < 0.5;
  ctx.fillStyle = '#141032'; rr(-4, -41, 8, 33, 3); ctx.fill();
  ctx.fillStyle = low && Math.sin(t * 14) > 0 ? '#ff5f6d' : X.hot; ctx.fillRect(-3, -9 - 31 * rl, 6, 31 * rl);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(-4, -41, 8, 33, 3); ctx.stroke();
  // the pump handle over the engineer's window (it dips with every stroke) and the stick over the pilot's
  if (riding) {
    const ex = K.seat[eng].x, dip = F.strokeT > 0 ? Math.sin(F.strokeT / K.ready.strokeT * Math.PI) * 7 : 0;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ex, -46); ctx.lineTo(ex, -56 + dip); ctx.stroke();
    ctx.fillStyle = PCOL[eng]; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(ex - 9, -61 + dip, 18, 7, 3); ctx.fill(); ctx.stroke();
    const px = K.seat[ph.pilot].x;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, -46); ctx.lineTo(px + L.jet * 4, -55); ctx.stroke();
    ctx.fillStyle = PCOL[ph.pilot]; circle(px + L.jet * 4, -56, 3.5); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  // the grabber arm (in the engineer's colour), from the roof to the claw
  if (riding && ph.mode !== 'down') {
    const pv = ph.pv, cl = ph.claw, ang = Math.atan2(cl.y - pv.y, cl.x - pv.x), shut = A.grabT > 0, gold = ph.magnet;
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.ink; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(pv.x, pv.y); ctx.lineTo(cl.x, cl.y); ctx.stroke();
    ctx.strokeStyle = gold ? C.gold : PCOL[eng]; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(pv.x, pv.y); ctx.lineTo(cl.x, cl.y); ctx.stroke();
    ctx.fillStyle = '#c9ccda'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; circle(pv.x, pv.y, 6); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.translate(cl.x, cl.y); ctx.rotate(ang);
    const op = shut ? 0.15 : 0.75;
    for (const d of [-1, 1]) { ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(8, d * 14 * op, 18, d * 9 * op); ctx.stroke(); ctx.strokeStyle = '#c9ccda'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(8, d * 14 * op, 18, d * 9 * op); ctx.stroke(); }
    ctx.restore();
    if (gold) { ctx.strokeStyle = 'rgba(255,197,61,0.55)'; ctx.lineWidth = 2; ctx.setLineDash([5, 6]); circle(cl.x, cl.y, K.arm.goldReach); ctx.stroke(); ctx.setLineDash([]); }
  }
  // how fast it falls: arrows under the lander, green = slow enough to land
  if (ph.mode === 'fly' && L.vy > 30) {
    const n = L.vy > K.bumpV ? 3 : L.vy > K.land.v ? 2 : 1, col = n === 3 ? '#ff5f6d' : n === 2 ? '#ffd23f' : '#9fe07f';
    ctx.strokeStyle = C.ink; ctx.lineJoin = 'round';
    for (let i = 0; i < n; i++) { const y = L.y + 66 + i * 11 + (t * 30 % 6); ctx.lineWidth = 7; ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.moveTo(L.x - 10, y); ctx.lineTo(L.x, y + 8); ctx.lineTo(L.x + 10, y); ctx.stroke(); ctx.lineWidth = 3.5; ctx.strokeStyle = col; ctx.stroke(); }
  }
}
function tthMoonDrawClockFlag(x, y, rot, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.strokeStyle = '#d9dbe8'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(0, -18); ctx.stroke();
  ctx.fillStyle = TTHC.coatLt; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(24, -14); ctx.lineTo(18, -8); ctx.lineTo(24, -1); ctx.lineTo(0, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
  tthClockFace(9, -9.5, 5, G.clock, { speed: 4, lw: 1.3 });
  ctx.restore();
}
function tthMoonDraw(st) {
  const ph = st.ph, c = st.thief, f = ph.flag;
  // his own clock flag rides on the back of his machine until the thump shakes it off
  if (ph.cflag) tthMoonDrawClockFlag(ph.cflag.x, ph.cflag.y, ph.cflag.rot, 1);
  else if (!ph.down && !c.hidden) { const at = tthThiefP(c, -46, -92); tthMoonDrawClockFlag(at.x, at.y + Math.sin(c.t * 3) * 4 * c.s, -0.12 * (c.face || 1), 0.9); }
  for (const q of ph.cells) tthMoonDrawCell(q, q === ph.reachCell && tthMoonCanStow(ph, q));
  tthMoonDrawLander(st);
  for (const b of ph.beacons) if (Math.abs(b.y - st.cam.y - H / 2) < H) tthMoonDrawBeacon(b, true, ph);
  if (f.state === 'fly') { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); tthDrawLoot('flag', 0, 0, 1.2, G.clock); ctx.restore(); }
  else if (f.state === 'down') {
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(1.35 - f.plant * 1.35); tthDrawLoot('flag', 6, -8 - f.plant * 22, 1.3, G.clock); ctx.restore();
  } else if (f.state === 'up') {
    ctx.fillStyle = 'rgba(255,243,196,0.35)'; circle(f.x + 6, ph.ground - 40, 44 + Math.sin(G.clock * 6) * 4); ctx.fill();
    tthDrawLoot('flag', f.x + 14, ph.ground - 30, 1.7, G.clock);
  }
}
function tthMoonDrawTop(st) {
  const ph = st.ph, f = ph.flag, K = TTHMOON.foot;
  if (ph.mode !== 'foot' || f.state !== 'down') return;
  // where to stand, and the ring that fills while both hold the action
  const y = ph.ground, t = G.clock;
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.lineDashOffset = -t * 20;
  ctx.beginPath(); ctx.moveTo(f.x - K.plantR, y + 9); ctx.lineTo(f.x + K.plantR, y + 9); ctx.stroke(); ctx.setLineDash([]);
  const cy = y - 96, r = tthBig() ? 26 : 20;
  ctx.fillStyle = 'rgba(30,20,66,0.8)'; circle(f.x, cy, r + 5); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 6; circle(f.x, cy, r); ctx.stroke();
  if (f.plant > 0) { ctx.strokeStyle = C.gold; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(f.x, cy, r, -Math.PI / 2, -Math.PI / 2 + f.plant * Math.PI * 2); ctx.stroke(); }
  for (let k = 0; k < 2; k++) { ctx.fillStyle = f.hold[k] ? PCOL[k] : 'rgba(255,255,255,0.25)'; circle(f.x + (k ? 7 : -7), cy, 5); ctx.fill(); }
  if (f.plant <= 0) { const bob = Math.abs(Math.sin(t * 5)) * 5; bigText('▼', f.x, y - 54 - bob, tthBig() ? 26 : 20, C.gold, 1); }
}

/* ---------- the HUD: the fuel gauges (left), the race down (right) ---------- */
function tthMoonHud(st) {
  const K = TTHMOON, ph = st.ph, F = ph.F, L = ph.L;
  if (ph.mode !== 'fly' && ph.mode !== 'dock') return;
  const big = tthBig(), z = big ? 1.36 : 1, t = G.clock, eng = 1 - ph.pilot;
  // --- fuel: the ready tube (what the engine burns), the two pods, seconds of fuel in all ---
  const pw = 52 * z, phh = 228 * z, px = 10, py = big ? 124 : 92;
  ctx.save(); if (tthUnder(px, py, px + pw, py + phh)) ctx.globalAlpha = 0.4;
  ctx.fillStyle = 'rgba(30,20,66,0.88)'; rr(px, py, pw, phh, 12); ctx.fill();
  ctx.strokeStyle = PCOL[eng]; ctx.lineWidth = 2.5; rr(px, py, pw, phh, 12); ctx.stroke();
  text('FUEL', px + pw / 2, py + 12 * z, 11 * z, '#f6d37a', 'center', 'body');
  const tw = 22 * z, th = 110 * z, tx = px + pw / 2 - tw / 2, ty = py + 22 * z, rl = clamp(F.ready / K.ready.cap, 0, 1), fullH = th * K.ready.full / K.ready.cap, low = F.ready < 0.5;
  ctx.fillStyle = '#141032'; rr(tx, ty, tw, th, 6); ctx.fill();
  ctx.save(); rr(tx, ty, tw, th, 6); ctx.clip();
  ctx.fillStyle = low && Math.sin(t * 14) > 0 ? '#ff5f6d' : TTHMOONC.hot; ctx.fillRect(tx, ty + th * (1 - rl), tw, th * rl);
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(tx + 3 * z, ty + th * (1 - rl), 4 * z, th * rl);
  if (!ph.valve) { ctx.fillStyle = 'rgba(255,95,109,0.4)'; ctx.fillRect(tx, ty, tw, fullH); }   // the red top: pumping here spills
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let s = 1; s < K.ready.cap; s++) { const y = ty + th * (1 - s / K.ready.cap); ctx.moveTo(tx, y); ctx.lineTo(tx + tw * 0.4, y); }
  ctx.stroke();
  ctx.strokeStyle = ph.valve ? C.gold : '#ffffff'; ctx.lineWidth = 2; rr(tx, ty, tw, th, 6); ctx.stroke();
  const pyy = ty + th + 10 * z, pwid = 14 * z, phei = 50 * z;
  for (let k = 0; k < 2; k++) {
    const x = px + pw / 2 + (k ? 3 * z : -3 * z - pwid), lv = clamp(F.pod[k] / K.pod.cap, 0, 1);
    ctx.fillStyle = '#141032'; rr(x, pyy, pwid, phei, 5); ctx.fill();
    ctx.fillStyle = TTHMOONC.fuel; if (lv > 0.01) { rr(x, pyy + phei * (1 - lv), pwid, phei * lv, Math.min(5, phei * lv / 2)); ctx.fill(); }
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; rr(x, pyy, pwid, phei, 5); ctx.stroke();
  }
  const tot = tthMoonFuel(ph);
  text(Math.round(tot) + ' s', px + pw / 2, py + phh - 13 * z, 15 * z, tot < 3 ? '#ff8f8f' : C.paper, 'center', 'body');
  ctx.restore();
  if (low && Math.sin(t * 9) > -0.3) bigText(tthMoonPods(ph) > 0.05 ? 'PUMP!' : 'EMPTY!', px + pw + 40 * z, ty + th - 8 * z, 19 * z, low && tthMoonPods(ph) <= 0.05 ? '#ff8f8f' : TTHMOONC.hot, 1);
  else if (!ph.valve && F.ready > K.ready.cap - K.ready.full && F.spillT > 0) bigText('FULL', px + pw + 34 * z, ty + 8 * z, 17 * z, '#ff8f8f', 1);
  // --- the race down: the Thief keeps just ahead; under it the falling speed ---
  const rw = 40 * z, rh = 214 * z, rx = W - 10 - rw, ry = big ? 64 : 50, x = rx + rw / 2, y0 = ry + 18 * z, y1 = ry + rh - 30 * z;
  const span = ph.ground - K.foot - K.startY, lf = clamp((L.y - K.startY) / span, 0, 1), tf = Math.min(0.985, lf + 0.055 + 0.012 * Math.sin(t * 0.9));
  ctx.save(); if (tthUnder(rx, ry, rx + rw, ry + rh + 46 * z)) ctx.globalAlpha = 0.4;
  ctx.fillStyle = 'rgba(30,20,66,0.88)'; rr(rx, ry, rw, rh, 12); ctx.fill();
  ctx.strokeStyle = PCOL[ph.pilot]; ctx.lineWidth = 2.5; rr(rx, ry, rw, rh, 12); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
  for (const b of ph.beacons) { const by = y0 + (y1 - y0) * (b.y - K.startY) / span; ctx.fillStyle = b.got ? '#9fe07f' : '#7fe9ff'; circle(x, by, 4 * z); ctx.fill(); }
  tthDrawLoot('flag', x + 3 * z, ry + rh - 15 * z, 0.55 * z, 0);
  const ly = y0 + (y1 - y0) * lf, tyy = y0 + (y1 - y0) * tf;
  ctx.fillStyle = TTHC.coat; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; circle(x + 7 * z, tyy, 6 * z); ctx.fill(); ctx.stroke();   // him: a top hat dot
  ctx.fillStyle = TTHC.hat; ctx.fillRect(x + 3 * z, tyy - 11 * z, 8 * z, 6 * z);
  ctx.fillStyle = TTHMOONC.foil; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 14 * z, ly - 5 * z); ctx.lineTo(x - 2 * z, ly - 5 * z); ctx.lineTo(x + 1 * z, ly + 5 * z); ctx.lineTo(x - 17 * z, ly + 5 * z); ctx.closePath(); ctx.fill(); ctx.stroke();
  const sy = ry + rh + 5 * z, v = Math.max(0, Math.round(L.vy)), col = L.vy > K.bumpV ? '#ff5f6d' : L.vy > K.land.v ? '#ffd23f' : '#9fe07f';
  ctx.fillStyle = 'rgba(30,20,66,0.88)'; rr(rx - 6 * z, sy, rw + 6 * z, 38 * z, 10); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2.5; rr(rx - 6 * z, sy, rw + 6 * z, 38 * z, 10); ctx.stroke();
  text('SPEED', rx + rw / 2 - 3 * z, sy + 10 * z, 9.5 * z, '#f6d37a', 'center', 'body');
  text(String(v), rx + rw / 2 - 3 * z, sy + 25 * z, 15 * z, col, 'center', 'body');
  ctx.restore();
}

/* ---------- the phase ---------- */
TTH_PHASES.moon = {
  setup(st, Lv) { tthMoonSetup(st, Lv); },
  step(st, dt) { tthMoonStep(st, dt); },
  coast(st, dt) { tthMoonCoast(st, dt); },
  hide(st) { return tthMoonRiding(st.ph); },
  busy: () => true,
  labels(st) { const ph = st.ph; return tthMoonRiding(ph) ? (ph.pilot === 0 ? ['burn', 'pump'] : ['pump', 'burn']) : ['plant', 'plant']; },
  roles(st) { const ph = st.ph; return tthMoonRiding(ph) ? (ph.pilot === 0 ? ['Fly!', 'Fuel!'] : ['Fuel!', 'Fly!']) : ['Plant!', 'Plant!']; },
  legend(st) {
    const ph = st.ph;
    if (!tthMoonRiding(ph)) return { pip: '<kbd>A</kbd><kbd>D</kbd> walk <kbd>W</kbd> moon hop', bo: '<kbd>←</kbd><kbd>→</kbd> walk <kbd>↑</kbd> moon hop', padJump: 'moon hop', padDown: 'both hold the action at the flag' };
    const fly = k => (k ? '<kbd>←</kbd><kbd>→</kbd> side jets <kbd>↑</kbd> burn' : '<kbd>A</kbd><kbd>D</kbd> side jets <kbd>W</kbd> burn');
    const fuel = k => (k ? '<kbd>←</kbd><kbd>→</kbd> aim the arm' : '<kbd>A</kbd><kbd>D</kbd> aim the arm');
    return { pip: ph.pilot === 0 ? fly(0) : fuel(0), bo: ph.pilot === 1 ? fly(1) : fuel(1), padJump: 'burn (pilot)', padDown: 'left / right: side jets or the arm' };
  },
  hudText(st) { const ph = st.ph; return tthMoonRiding(ph) ? 'Fuel ' + Math.round(tthMoonFuel(ph)) + ' s' : 'Plant the flag!'; },
  progress(st) { const ph = st.ph; return { n: Math.min(3, ph.stretch + (ph.mode === 'fly' || ph.mode === 'dock' ? 0 : 1)), of: 3 }; },
  headLift(st) { return tthMoonRiding(st.ph) ? 34 : 0; },
  drawBack(st) { tthMoonDrawBack(st); },
  draw(st) { tthMoonDraw(st); },
  drawTop(st) { tthMoonDrawTop(st); },
  hud(st) { tthMoonHud(st); },
};

/* ---------- sounds ---------- */
Sfx.extra.tthMoonBurn = function () { this.tone(70 + Math.random() * 20, 0.12, 'sawtooth', 0.022, 55); };
Sfx.extra.tthMoonJet = function () { this.tone(1700, 0.07, 'sawtooth', 0.01, 900); };
Sfx.extra.tthMoonSputter = function () { this.tone(110, 0.06, 'square', 0.03, 60); this.tone(90, 0.05, 'square', 0.025, 50, 0.09); };
Sfx.extra.tthMoonPump = function (p) { this.tone(260 * p, 0.07, 'triangle', 0.045, 420 * p); this.tone(520 * p, 0.05, 'sine', 0.025, 640 * p, 0.06); };
Sfx.extra.tthMoonClunk = function () { this.tone(150, 0.05, 'square', 0.035, 110); };
Sfx.extra.tthMoonSpill = function () { this.tone(700, 0.2, 'sawtooth', 0.02, 240); this.tone(420, 0.12, 'triangle', 0.03, 200, 0.05); };
Sfx.extra.tthMoonGrab = function (p) { [660, 880, 1320].forEach((f, i) => this.tone(f * p, 0.07, 'triangle', 0.045, null, i * 0.05)); };
Sfx.extra.tthMoonToss = function () { this.tone(500, 0.18, 'sine', 0.025, 900); };
Sfx.extra.tthMoonBonk = function () { this.tone(130, 0.16, 'square', 0.05, 60); this.tone(90, 0.25, 'triangle', 0.05, 45, 0.03); };
Sfx.extra.tthMoonBounce = function () { this.tone(180, 0.25, 'sine', 0.06, 420); };
Sfx.extra.tthMoonBoing = function () { this.tone(220, 0.3, 'sine', 0.045, 520); this.tone(330, 0.2, 'triangle', 0.02, 660, 0.05); };
Sfx.extra.tthMoonRumble = function () { for (let k = 0; k < 5; k++) this.tone(60 + Math.random() * 30, 0.16, 'sawtooth', 0.03, 45, k * 0.18); };
Sfx.extra.tthMoonWhoosh = function () { this.tone(300, 0.9, 'sawtooth', 0.03, 90); this.tone(1200, 0.7, 'sawtooth', 0.012, 300, 0.05); };
Sfx.extra.tthMoonWarn = function () { [880, 660, 880].forEach((f, i) => this.tone(f, 0.08, 'square', 0.03, null, i * 0.11)); };
Sfx.extra.tthMoonNudge = function () { this.tone(160, 0.5, 'triangle', 0.04, 110); };
Sfx.extra.tthMoonDock = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.05, null, i * 0.08)); };
Sfx.extra.tthMoonLand = function () { this.tone(90, 0.4, 'triangle', 0.07, 45); [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.045, null, 0.2 + i * 0.09)); };
Sfx.extra.tthMoonHop = function (p) { this.tone(240 * p, 0.22, 'sine', 0.04, 520 * p); };
Sfx.extra.tthMoonPlant = function () { this.tone(200, 0.12, 'square', 0.05, 120); [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.05, null, 0.1 + i * 0.08)); };

/* ---------- the room (this file fills in its own room of the level def) ---------- */
tthRoom('moon', {
  act: { label: 'burn', labels: ['burn', 'pump'] },
  tip: 'Pilot: steer and burn to slow the fall. Engineer: pump fuel and grab fuel cells. Land softly on the pad!',
  legend: { pip: '<kbd>A</kbd><kbd>D</kbd> side jets <kbd>W</kbd> burn', bo: '<kbd>←</kbd><kbd>→</kbd> aim the arm', padJump: 'burn (pilot)', padDown: 'left / right: side jets or the arm' },
  map: TTH_EMPTY_MAP,
});
