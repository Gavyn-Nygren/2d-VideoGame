/* Pip & Bo - Level 35-1 Moonwick Academy: class 2 'lift' (Levitation, spell Lift). */
'use strict';

/* ===== 35-1 class 2: Levitation (WIZ_PHASES.lift) ===============================================================
   Inside the round library tower, floor after floor of shelves, scrolling UP. One floats a stone slab with their wand,
   the other rides it up, and books keep escaping.

   THE TWO JOBS (room field `first` is the first LIFTER; they swap at floors 3 and 5, when Thimblewick poofs them)
   - LIFTER (stands on a balcony, action word "lift"): HOLD the action to raise the slab (WIZLIFT.slab.up px/s); let go
     and it sinks slowly (slab.sink px/s) down to the floor's stone lip. While the action is held, LEFT / RIGHT slide the
     slab along its glowing track instead (it holds its height while sliding; the lifter stays put). A FOCUS meter drains over 6 s of lifting and refills in
     3 s of rest; at empty the slab sags until focus is back to 60 %, so lifting is done in pulls, with rests while the
     rider stands on a ledge. The lifter can only lift a slab it can see (within WIZLIFT.reach px up or down).
   - RIDER (on the slab, action word "grab"): walks and jumps on the slab, hops off onto ledges, and grabs runaway books
     (they flap in loose circles; the action within WIZLIFT.grab px grabs one). Each floor has a brass switch on a high
     ledge only the rider can reach: with WIZLIFT.need books grabbed on that floor, pressing it unfolds the stairs to
     the next balcony so the LIFTER can climb up, and lets the slab rise to the next floor.
   So the lifter can't go up without the rider, and the rider can't go up without the lifter.

   SIX FLOORS, each adding one thing:
     1 The Reading Room      plain: ledges and books
     2 The Arch              a shelf wall with a low arch: the slab rides through on a rail; the rider must DUCK
                             (hold down) or the slab won't go in ("Duck!")
     3 The Chandelier        a chandelier swings across the middle (swap jobs first)
     4 Two Slabs             the first track ends half-way up: the rider jumps across to a second slab on its own
                             track (the lifter's wand works the slab nearest the rider)
     5 Sliding Ladders       library ladders slide along their rails across the shelves: a lane lights up and a "!"
                             shows 1 s ahead; a rider in the lane is knocked off (swap jobs first)
     6 The Book Flock        the books swarm the rider and nudge them toward the slab's edge until grabbed
   At the top, the sixth switch opens the roof hatch: both up onto the roof garden to finish.

   FAILS. A rider who falls lands in a pile of soft books on the last ledge they stood on: an Oops. GOLD HELP after
   WIZ.goldAfter Oops on one floor: a gold bookmark, focus drains at half speed for 30 s (announced).
   Safe spots: every floor reached (the lifter on its new balcony) is a mid-class safe spot.
   Stats (st.stats.lift): books, floors, falls.   Names: wizLift* / WIZLIFT* (Sfx.extra.wizLift*). */
const WIZLIFT = {
  FH: 400, base0: 480, floors: 6,
  slab: { w: 110, h: 16, up: 95, sink: 30, side: 130, rail: 9 },
  focus: { drain: 1 / 6, fill: 1 / 3, wake: 0.6 },
  reach: 440, grab: 52, need: 6, fallBy: 150,
  bal: { x0: 0, x1: 150 },
  // the slabs' tracks: left edge x range, top-y range (from the floor numbers: lo = floor k's lip, hi = floor k's top)
  tracks: [{ x0: 236, x1: 452, f0: 0, f1: 3.5 }, { x0: 596, x1: 720, f0: 3.3, f1: 6 }],
  arch: { x0: 470, x1: 500, open: 32, rail: 236, under: 120 },   // floor 2's shelf wall; the opening's floor is `rail` px over the base
  chand: { x: 440, len: 200, amp: 0.95, period: 3.2, r: 24 },
  ladder: { every: 4.2, warn: 1.1, cross: 1.3, band: 46 },
  flock: { near: 150, push: 70 },
  swapAt: [2, 4], goldT: 30,
};
// per floor: ledges [x0, x1, height over the floor's base], the switch [x, height], books [cx, height, r]
const WIZLIFT_FLOORS = [
  { name: 'The Reading Room', ledges: [[640, 780, 150], [600, 780, 330]], sw: [740, 330], books: [[320, 110, 36], [430, 190, 30], [300, 280, 34], [700, 220, 30], [520, 120, 28], [380, 340, 30], [540, 300, 26]] },
  // (the low ledge on the right is level with the arch's rail: the slab rides through, the rider steps across)
  { name: 'The Arch', ledges: [[600, 860, 252], [660, 860, 330]], sw: [790, 330], books: [[330, 130, 32], [300, 300, 30], [420, 200, 28], [620, 290, 30], [760, 280, 28], [720, 400, 30], [380, 60, 26]] },
  { name: 'The Chandelier', ledges: [[640, 780, 160], [600, 780, 330]], sw: [740, 330], books: [[310, 120, 30], [500, 160, 32], [300, 320, 30], [440, 280, 28], [700, 240, 28], [560, 340, 26], [360, 220, 30]] },
  { name: 'Two Slabs', ledges: [[820, 950, 200], [800, 950, 340]], sw: [900, 340], books: [[320, 110, 30], [430, 160, 30], [660, 280, 30], [720, 340, 28], [880, 270, 28], [380, 60, 26], [650, 200, 28]] },
  { name: 'Sliding Ladders', ledges: [[820, 950, 160], [800, 950, 330]], sw: [900, 330], books: [[650, 90, 30], [700, 190, 30], [640, 300, 30], [770, 250, 28], [880, 90, 28], [720, 350, 26], [880, 230, 26]] },
  { name: 'The Book Flock', ledges: [[820, 950, 170], [800, 950, 330]], sw: [900, 330], books: [[660, 120, 34], [720, 200, 34], [650, 280, 32], [760, 330, 30], [880, 240, 28], [700, 60, 30], [880, 110, 28]] },
];
const WIZLIFT_C = { wall: '#3a2f5a', wallDk: '#2a2144', shelf: '#6e4a2a', shelfDk: '#4a2f18', spine: ['#c95a4a', '#4a7ac9', '#c9a24a', '#5aa86a', '#9a5ac9', '#e08a3c'],
  slab: '#8a86a8', slabDk: '#5a5678', slabLt: '#b0acc8', track: 'rgba(181,140,255,0.45)', brass: '#d9a441', brassDk: '#8a6420', book: ['#d9485a', '#3c78d8', '#e0a43c', '#4aa86a', '#9a5ac9'] };

const wizLiftBase = k => WIZLIFT.base0 - k * WIZLIFT.FH;
// the slab rect for collisions (top-left x, top y)
const wizLiftRect = s => ({ x0: s.x, y0: s.y, x1: s.x + WIZLIFT.slab.w, y1: s.y + WIZLIFT.slab.h });

function wizLiftSetup(st, L) {
  const ph = st.ph, K = WIZLIFT;
  ph.lift = L.def.first || 0; ph.ride = 1 - ph.lift;
  ph.floor = 0; ph.open = [false, false, false, false, false, false]; ph.got = [0, 0, 0, 0, 0, 0];
  ph.focus = 1; ph.tired = false; ph.gold = 0; ph.t = 0; ph.held = false; ph.ladT = 2; ph.lanes = []; ph.duckMsg = 0;
  ph.books = [];
  WIZLIFT_FLOORS.forEach((f, k) => f.books.forEach((b, i) => ph.books.push({ floor: k, cx: b[0], cy: wizLiftBase(k) - b[1], r: b[2], a: i * 1.7 + k, w: 0.9 + ((i * 7 + k) % 5) * 0.12, got: false, x: b[0], y: wizLiftBase(k) - b[1], col: WIZLIFT_C.book[(i + k) % 5] })));
  // the slabs: the first rests on the ground floor; the second waits at the bottom of its track
  ph.slabs = K.tracks.map((tr, i) => ({ i, x: i ? tr.x0 : 300, y: wizLiftLo(ph, i), dx: 0, dy: 0, lit: 0 }));
  wizLiftBuild(ph);
  const ps = G.players, lf = ps[ph.lift], rd = ps[ph.ride];
  Object.assign(lf, { x: 70 - lf.w / 2, y: wizLiftBase(0) - lf.h, vx: 0, vy: 0, grounded: true, face: 1 });
  const s0 = ph.slabs[0];
  Object.assign(rd, { x: s0.x + 55 - rd.w / 2, y: s0.y - rd.h, vx: 0, vy: 0, grounded: true, face: 1 });
  ph.safe = [{ x: 70, y: wizLiftBase(0) }, { x: s0.x + 55, y: wizLiftBase(0) }]; ph.stand = [wizLiftBase(0), s0.y];
  ph.ledgeSafe = { x: s0.x + 55, y: wizLiftBase(0) };
  ph.camY = 0; st.cam = { x: 0, y: 0 };
  const s = wizStats(st); Object.assign(s, { books: s.books || 0, floors: s.floors || 0, falls: s.falls || 0 });
  Object.assign(st.hm, { x: 820, y: 360, s: 0.8, face: -1, pose: 'talk' });
  wizSay(st, 'Levitation! Lift the slab, ride it up, catch the books.', 3);
  wizNews(st, 'Floor 1: ' + WIZLIFT_FLOORS[0].name + '. Grab ' + K.need + ' books, then press the switch!');
}
// the slab's lowest and highest top-y now (its track, the floor's lip, the lock under the next floor until its switch)
function wizLiftLo(ph, i) {
  return i === 0 ? wizLiftBase(Math.min(ph.floor, 3)) - WIZLIFT.slab.h : wizLiftBase(Math.max(WIZLIFT.tracks[1].f0, ph.floor)) - WIZLIFT.slab.h;
}
function wizLiftHi(ph, i) {
  const tr = WIZLIFT.tracks[i];
  let k = ph.floor;
  while (k < 6 && ph.open[k]) k++;
  const lock = wizLiftBase(Math.min(6, k + 1)) + 34;   // just under the next floor's balcony until this floor's switch
  return Math.min(Math.max(wizLiftBase(tr.f1) + (i ? 20 : 0), lock), wizLiftLo(ph, i));   // (a parked slab: hi = lo)
}
// the static world: walls, the ground floor, balconies, stairs, ledges, the roof, floor 2's arch wall
function wizLiftBuild(ph) {
  const K = WIZLIFT, S = [];
  S.push({ x0: -40, y0: -3000, x1: 0, y1: 600, wall: true }, { x0: W, y0: -3000, x1: W + 40, y1: 600, wall: true });
  S.push({ x0: 0, y0: K.base0, x1: W, y1: K.base0 + 60, kind: 'ground' });
  ph.stairs = [];
  for (let k = 0; k <= 6; k++) {
    const b = wizLiftBase(k);
    if (k > 0 && k < 6) {
      S.push({ x0: K.bal.x0, y0: b, x1: K.bal.x1, y1: b + 18, one: true, kind: 'balcony', floor: k });
      S.push({ x0: K.bal.x1 - 6, y0: b - 26, x1: K.bal.x1, y1: b, kind: 'railing', floor: k });   // its railing: hop over it, don't walk off
    }
    if (k < 6) {
      // the folding stairs from balcony k up to balcony k+1: off until floor k's switch
      // (wide, one-way, stacked: jump straight up from one to the next, a forgiving climb)
      const steps = [[34, 200, 80], [34, 200, 160], [34, 200, 240], [34, 200, 320]];
      for (const [x0, x1, dy] of steps) { const r = { x0, y0: b - dy, x1, y1: b - dy + 12, one: true, kind: 'step', floor: k, off: true }; ph.stairs.push(r); S.push(r); }
      for (const [x0, x1, dy] of WIZLIFT_FLOORS[k].ledges) S.push({ x0, y0: b - dy, x1, y1: b - dy + 16, one: true, kind: 'ledge', floor: k });
    }
  }
  ph.roof = { x0: 0, y0: wizLiftBase(6), x1: W, y1: wizLiftBase(6) + 20, one: true, kind: 'roof', off: true };
  S.push(ph.roof);
  // floor 2's shelf wall with the low arch
  const b1 = wizLiftBase(1), A = K.arch, oy1 = b1 - A.rail, oy0 = oy1 - K.slab.h - A.open;
  // (the lower wall stops A.under px over the floor: a rider walks under it, the slab can't rise past it)
  ph.archWall = [{ x0: A.x0, y0: wizLiftBase(2) + 18, x1: A.x1, y1: oy0, kind: 'arch' }, { x0: A.x0, y0: oy1, x1: A.x1, y1: b1 - A.under, kind: 'arch' }];
  ph.archOpen = { y0: oy0, y1: oy1 };
  for (const r of ph.archWall) S.push(r);
  ph.solids = S;
}
const wizLiftActive = ph => {
  // the slab the lifter's wand works: the one the rider stands on, else the one nearest the rider
  const rd = G.players[ph.ride];
  const on = ph.slabs.find(s => rd.ground && rd.ground.slab === s);
  if (on) return on;
  // (a slab that can come level with the rider's feet first)
  let best = ph.slabs[0], bd = 1e9;
  for (const s of ph.slabs) {
    if (!wizLiftUsable(ph, s)) continue;
    const feet = rd.y + rd.h, can = feet > wizLiftHi(ph, s.i) - 60 && feet < Math.max(wizLiftLo(ph, s.i), s.y) + 60;
    const d = Math.hypot(s.x + 55 - (rd.x + rd.w / 2), s.y - feet) + (can ? 0 : 2000);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
};
const wizLiftUsable = (ph, s) => s.i === 0 ? ph.floor <= 3 : ph.floor >= 3;

function wizLiftStep(st, dt) {
  const ph = st.ph, K = WIZLIFT, ps = G.players, lf = ps[ph.lift], rd = ps[ph.ride];
  ph.t += dt;
  if (st.idle) { wizLiftCoast(st, dt); return; }
  ph.gold = Math.max(0, ph.gold - dt); ph.duckMsg = Math.max(0, ph.duckMsg - dt);
  if (ph.poof) { ph.poof -= dt; if (ph.poof <= 0) ph.poof = 0; for (const p of ps) { p.vx = 0; p.vy = 0; } wizLiftCam(st, dt); return; }
  // --- the lifter's wand ---
  const s = wizLiftActive(ph), lfOnSlab = lf.ground && lf.ground.slab;
  const holding = !!lf.input.act && lf.grounded && !lfOnSlab && Math.abs(s.y - (lf.y + lf.h)) < K.reach;
  lf.pendingAct = false;
  if (lf.input.act && lfOnSlab && !ph.saidRide) { ph.saidRide = true; wizHint(st, ph.lift, 'You can\'t lift a slab you\'re standing on!', { cpu: 'Hopping off!' }); }
  if (ph.tired) { ph.focus = Math.min(1, ph.focus + K.focus.fill * dt); if (ph.focus >= K.focus.wake) { ph.tired = false; Sfx.play('wizDing'); } }
  const lifting = holding && !ph.tired;
  if (lifting) { ph.focus -= K.focus.drain * (ph.gold > 0 ? 0.5 : 1) * dt; if (ph.focus <= 0) { ph.focus = 0; ph.tired = true; wizPop(st, lf.x + lf.w / 2, lf.y - 30, 'Puff! Rest...', '#d9c6ff', 16); Sfx.play('wizLiftTired'); } }
  else if (!ph.tired) ph.focus = Math.min(1, ph.focus + K.focus.fill * dt);
  if (lifting && !ph.held) Sfx.play('wizSpell_lift');
  ph.held = lifting;
  // move the slabs
  for (const sl of ph.slabs) {
    const x0 = sl.x, y0 = sl.y, tr = K.tracks[sl.i];
    let vy = K.slab.sink, vx = 0;
    if (sl === s && lifting) {   // hold: up; hold with left / right: slide (and no rise)
      vx = ((lf.input.right ? 1 : 0) - (lf.input.left ? 1 : 0)) * K.slab.side;
      vy = vx ? 0 : -K.slab.up;
    }
    if (sl.i === 1 && ph.floor < 3) vy = 0;
    sl.lit = sl === s && lifting ? Math.min(1, sl.lit + dt * 6) : Math.max(0, sl.lit - dt * 3);
    // (a slab still under this floor's lip, from the floor below, may rise but not sink further)
    let nx = clamp(sl.x + vx * dt, tr.x0, tr.x1), ny = clamp(sl.y + vy * dt, wizLiftHi(ph, sl.i), Math.max(wizLiftLo(ph, sl.i), sl.y));
    if (sl.i === 0) [nx, ny] = wizLiftArch(st, sl, nx, ny);
    sl.dx = nx - x0; sl.dy = ny - y0; sl.x = nx; sl.y = ny;
  }
  // --- bodies ---
  const solids = ph.solids.concat(ph.slabs.map(sl => Object.assign(wizLiftRect(sl), { dx: sl.dx, dy: sl.dy, slab: sl, src: sl })));
  // the slab's low brass rails: a rider standing on it can't walk off the ends, only hop off (for the rider only)
  const rails = [];
  for (const sl of ph.slabs) { const r = K.slab.rail; rails.push({ x0: sl.x - 2, x1: sl.x + 4, y0: sl.y - r, y1: sl.y + 1, dx: sl.dx, dy: sl.dy, src: sl, rail: true }, { x0: sl.x + K.slab.w - 4, x1: sl.x + K.slab.w + 2, y0: sl.y - r, y1: sl.y + 1, dx: sl.dx, dy: sl.dy, src: sl, rail: true }); }
  const rdSolids = rd.grounded && rd.ground && rd.ground.slab ? solids.concat(rails) : solids;
  const duck = !!rd.input.down && rd.grounded;
  wizBody(lf, dt, solids, { ctl: (p, d) => { const real = p.input; if (real.act && p.grounded) p.input = NO_INPUT; try { control(p, d); } finally { p.input = real; } } });
  wizBody(rd, dt, rdSolids, { ctl: (p, d) => { const real = p.input; if (duck) p.input = Object.assign({}, real, { left: false, right: false, jump: false }); try { control(p, d); } finally { p.input = real; } } });
  if (duck) { rd.sx = 1.25; rd.sy = 0.55; }
  ph.duck = duck;
  // --- the rider's work: books and switches ---
  const grabP = rd.pendingAct; rd.pendingAct = false;
  if (grabP) wizLiftGrab(st, rd);
  wizLiftBooks(st, dt);
  wizLiftHazards(st, dt);
  // --- safe spots and falls ---
  for (const p of [lf, rd]) {
    const k = p.id === ph.lift ? 0 : 1;
    // a rider who dropped onto the stairs below this floor can't jump back up past the balcony rail: back onto the slab
    if (k === 1 && p.grounded && p.ground && p.ground.kind === 'step' && p.ground.floor < ph.floor) { ph.fromSlab = null; ph.safe[1] = { x: 0, y: 0, slab: true }; wizLiftFell(st, p, 1); continue; }
    if (p.grounded && p.ground && !p.ground.slab && p.ground.kind !== 'arch' && p.ground.kind !== 'railing') { const g = p.ground; ph.safe[k] = { x: clamp(p.x + p.w / 2, g.x0 + 16, g.x1 - 16), y: g.y0 }; }
    if (p.grounded) { ph.stand[k] = p.y + p.h; if (k === 1) ph.fromSlab = (p.ground && p.ground.slab) || null; }
    // a rider who wandered down to the floor below (the stairs, the ground): back up, as for a fall
    if (k === 1 && p.grounded && p.ground && !p.ground.slab && p.y + p.h > wizLiftBase(ph.floor) + 260) { ph.fromSlab = null; ph.safe[1] = { x: 0, y: 0, slab: true }; wizLiftFell(st, p, 1); continue; }
    const ref = ph.safe[k].slab ? ph.stand[k] : Math.min(ph.stand[k], ph.safe[k].y);
    if (!p.grounded && p.y + p.h > ref + K.fallBy) wizLiftFell(st, p, k);
  }
  // --- floors: the lifter on the next balcony starts the next floor ---
  const nb = wizLiftBase(ph.floor + 1);
  if (ph.open[ph.floor] && lf.grounded && lf.ground && Math.abs(lf.ground.y0 - nb) < 2 && ph.floor < 5) wizLiftNextFloor(st);
  if (ph.open[5] && ps.every(p => p.grounded && p.ground && p.ground.kind === 'roof')) {
    wizStats(st).floors = 6;
    wizPhaseDone(st, { say: 'Up top already? Lift is yours. Mind the gutters.' });
  }
  wizLiftHints(st);
  wizLiftCam(st, dt);
}
// floor 2's arch: the first slab only goes through the opening on its rail, and not with a standing rider on it
function wizLiftArch(st, sl, nx, ny) {
  const ph = st.ph, K = WIZLIFT, A = K.arch, w = K.slab.w, h = K.slab.h, o = ph.archOpen, railY = o.y1 - h;
  const inX = (x) => x + w > A.x0 && x < A.x1;
  const room = 34;   // a slab under the wall stops this far below it (room for a rider)
  const band = ny + h > ph.archWall[0].y0 && ny < ph.archWall[1].y1 + room;
  if (!band) return [nx, ny];
  if (inX(nx)) {
    const was = inX(sl.x), wTop = ph.archWall[0].y0, wBot = ph.archWall[1].y1;
    if (Math.abs(sl.y - railY) > 1.5) {
      if (sl.y >= wBot + room - 0.5) return [nx, Math.max(ny, wBot + room)];   // under the wall: it can't rise into it
      if (sl.y + h <= wTop + 0.5) return [nx, Math.min(ny, wTop - h)];  // over it
      if (!was && Math.abs(ny - railY) > 26) return [sl.x, ny];         // beside it, not lined up: the wall stops it
    }
    const rd = G.players[ph.ride];
    if (!ph.duck && rd.grounded && rd.ground && rd.ground.slab === sl && rd.x + rd.w > A.x0 - 6 + (nx - sl.x) && rd.x < A.x1) {
      if (ph.duckMsg <= 0) { ph.duckMsg = 3; wizHint(st, ph.ride, 'Duck! Hold ' + wizKey(ph.ride, 'down'), { cpu: 'Ducking!' }); wizPop(st, A.x0, o.y0 - 14, 'Duck!', '#ffffff', 18); }
      return [sl.x, Math.abs(sl.y - railY) < 26 ? railY : sl.y];
    }
    return [nx, railY];
  }
  // beside the wall: it can't rise or sink through the wall's ends
  return [nx, ny];
}
function wizLiftGrab(st, rd) {
  const ph = st.ph, K = WIZLIFT, cx = rd.x + rd.w / 2, cy = rd.y + rd.h / 2;
  // the switch first, if in reach
  const k = ph.floor, f = WIZLIFT_FLOORS[k], swx = f.sw[0], swy = wizLiftBase(k) - f.sw[1];
  if (!ph.open[k] && Math.abs(cx - swx) < 40 && Math.abs(rd.y + rd.h - swy) < 40) {
    if (ph.got[k] >= K.need) wizLiftOpen(st, k);
    else { wizHint(st, ph.ride, 'Need ' + K.need + ' books first! (' + ph.got[k] + '/' + K.need + ')', { cpu: 'More books first!' }); Sfx.play('wizLiftNo'); }
    return;
  }
  let best = null, bd = K.grab;
  for (const b of ph.books) { if (b.got || b.floor !== k) continue; const d = Math.hypot(b.x - cx, b.y - cy); if (d < bd) { bd = d; best = b; } }
  if (!best) { Sfx.play('wizLiftSwish'); return; }
  best.got = true; ph.got[k]++; wizStats(st).books++;
  wizPop(st, best.x, best.y - 16, ph.got[k] >= K.need && ph.got[k] - 1 < K.need ? 'Switch is awake!' : 'Got it!', '#fff3c4', 16);
  Sfx.play('wizLiftBook'); wizSparks(best.x, best.y, 'lift', 6);
  if (ph.got[k] === K.need) wizNews(st, 'Six books! Now press the brass switch up on the right.');
}
function wizLiftOpen(st, k) {
  const ph = st.ph;
  ph.open[k] = true; Sfx.play('wizLiftSwitch');
  for (const r of ph.stairs) if (r.floor === k) r.off = false;
  if (k === 5) { ph.roof.off = false; wizNews(st, 'The roof hatch is open! Both of you, up onto the roof!'); }
  else wizNews(st, 'Click! The stairs unfold. Up to the next balcony, ' + NAMES[ph.lift] + '!');
  wizHint(st, ph.lift, 'Climb the stairs! ' + wizKey(ph.lift, 'jump'), { cpu: 'Climbing up!' });
}
function wizLiftNextFloor(st) {
  const ph = st.ph, K = WIZLIFT, ps = G.players;
  ph.floor++; wizStats(st).floors = ph.floor; Sfx.play('wizDing');
  const f = WIZLIFT_FLOORS[ph.floor];
  wizNews(st, 'Floor ' + (ph.floor + 1) + ': ' + f.name + '!');
  ph.safe[0] = { x: 70, y: wizLiftBase(ph.floor) };
  if (K.swapAt.includes(ph.floor)) {
    // Thimblewick poofs them into each other's places: the old rider onto the balcony, the old lifter onto the slab
    [ph.lift, ph.ride] = [ph.ride, ph.lift];
    const lf = ps[ph.lift], rd = ps[ph.ride], sl = ph.floor >= 3 ? ph.slabs[1] : ph.slabs[0];
    if (ph.floor >= 3 && sl.y > wizLiftBase(ph.floor) - 40) sl.y = Math.max(wizLiftHi(ph, 1), wizLiftBase(ph.floor) - 40);
    puff(lf.x + lf.w / 2, lf.y + lf.h / 2, 12, 'rgba(181,140,255,0.9)'); puff(rd.x + rd.w / 2, rd.y + rd.h / 2, 12, 'rgba(181,140,255,0.9)');
    Object.assign(lf, { x: 70 - lf.w / 2, y: wizLiftBase(ph.floor) - lf.h, vx: 0, vy: 0, grounded: true, ground: null });
    Object.assign(rd, { x: sl.x + 55 - rd.w / 2, y: sl.y - rd.h, vx: 0, vy: 0, grounded: true, ground: null });
    ph.safe = [{ x: 70, y: wizLiftBase(ph.floor) }, { x: sl.x + 55, y: sl.y, slab: true }]; ph.stand = [wizLiftBase(ph.floor), sl.y];
    ph.poof = 0.5; ph.focus = 1; ph.tired = false;
    wizSwap(st); Sfx.play('wizLiftPoof');
    wizSay(st, 'Poof! Swap places. Fair\'s fair.', 2.2);
  }
  ph.ledgeSafe = null;
}
function wizLiftFell(st, p, k) {
  const ph = st.ph, sp = ph.safe[k];
  if (p.id === ph.lift) {   // the lifter slipped off the stairs: back on the balcony, no Oops (the books catch them)
    Object.assign(p, { x: sp.x - p.w / 2, y: sp.y - p.h - 2, vx: 0, vy: -150, grounded: false });
    wizPop(st, sp.x, sp.y - 40, 'Whoops!', '#ffffff', 16); return;
  }
  // back on the last ledge (in a pile of soft books), or onto the slab when that ledge is far below
  let to = { x: sp.x, y: sp.y };
  const sl = ph.fromSlab || wizLiftActive(ph);
  // (a rider who fell off the slab is put back on it, in the books it flies through: falling off a ledge, back on that)
  if (sp.slab || ph.fromSlab || sp.y - ph.stand[1] > 300) { to = { x: sl.x + WIZLIFT.slab.w / 2, y: sl.y }; ph.safe[1] = { x: 0, y: 0, slab: true }; }
  ph.stand[1] = to.y;
  if (wizOops(st, p, { word: 'Flump!', to, kind: 'fall' })) {
    wizStats(st).falls++; Sfx.play('wizLiftFlump');
    for (let n = 0; n < 6; n++) burst(sp.x, sp.y - 6, WIZLIFT_C.book[n % 5], 2);
    const n = wizMiss(st, 'f' + ph.floor);
    if (n >= WIZ.goldAfter && wizGoldOnce(st, 'bookmark' + ph.floor, 'Gold bookmark! Lifting tires half as fast for 30 s.')) ph.gold = WIZLIFT.goldT;
    else if (n === 1) wizSay(st, 'Soft landing. That\'s what the books are for.', 2.2);
  } else Object.assign(p, { x: to.x - p.w / 2, y: to.y - p.h - 2, vx: 0, vy: -150 });
}
function wizLiftBooks(st, dt) {
  const ph = st.ph, K = WIZLIFT, rd = G.players[ph.ride], rx = rd.x + rd.w / 2, ry = rd.y + rd.h / 2;
  for (const b of ph.books) {
    if (b.got) { b.y -= 60 * dt; continue; }
    b.a += b.w * dt;
    let tx = b.cx + Math.cos(b.a) * b.r, ty = b.cy + Math.sin(b.a * 1.3) * b.r * 0.6;
    // the book flock on floor 6: they crowd the rider and push toward the slab's edge
    if (b.floor === 5 && ph.floor === 5 && Math.hypot(tx - rx, ty - ry) < K.flock.near) {
      tx = rx + Math.cos(b.a * 2) * 34; ty = ry - 6 + Math.sin(b.a * 2) * 18;
      if (rd.grounded && rd.ground && rd.ground.slab) { const g = rd.ground, mid = g.x0 + (g.x1 - g.x0) / 2; rd.x += Math.sign(rx - mid || 1) * K.flock.push * dt * 0.5; }
    }
    b.x += (tx - b.x) * Math.min(1, dt * 3); b.y += (ty - b.y) * Math.min(1, dt * 3);
  }
}
function wizLiftHazards(st, dt) {
  const ph = st.ph, K = WIZLIFT, rd = G.players[ph.ride], k = ph.floor;
  const knock2 = (word, dir) => { if (st.safe[rd.id] > 0) return; knock(rd, dir * 220, -260, 0.5, 0.3); st.safe[rd.id] = 1; wizPop(st, rd.x + rd.w / 2, rd.y - 20, word, '#ffffff', 18); Sfx.play('wizLiftKnock'); };
  // the chandelier on floor 3
  if (k === 2) {
    const C2 = K.chand, a = Math.sin(ph.t * Math.PI * 2 / C2.period) * C2.amp, px = C2.x, py = wizLiftBase(3) + 20;
    ph.chand = { x: px + Math.sin(a) * C2.len, y: py + Math.cos(a) * C2.len, px, py, a };
    const cx = rd.x + rd.w / 2, cy = rd.y + rd.h / 2;
    if (Math.hypot(ph.chand.x - cx, ph.chand.y - cy) < C2.r + 14) knock2('Clonk!', cx > ph.chand.x ? 1 : -1);
  } else ph.chand = null;
  // the sliding ladders on floor 5
  if (k === 4) {
    const L = K.ladder, b = wizLiftBase(4);
    if ((ph.ladT -= dt) <= 0) {
      ph.ladT = L.every;
      const lanes = [100, 200, 290];
      ph.lanes.push({ y: b - lanes[Math.floor(wizRand() * 3)], t: -L.warn, dir: wizRand() < 0.5 ? 1 : -1 });
      wizWarn(st, ph.ride, L.warn); Sfx.play('wizLiftWarn');
    }
    for (const ln of ph.lanes) {
      ln.t += dt;
      if (ln.t > 0) {
        const u = ln.t / L.cross, x = ln.dir > 0 ? 200 + u * 800 : 1000 - u * 800;
        ln.x = x;
        const ry0 = rd.y, ry1 = rd.y + rd.h;
        if (ry1 > ln.y - L.band / 2 && ry0 < ln.y + L.band / 2 && Math.abs(x - (rd.x + rd.w / 2)) < 26) knock2('Thwack!', ln.dir);
      }
    }
    ph.lanes = ph.lanes.filter(ln => ln.t < L.cross);
  } else ph.lanes = [];
}
// what each player should be doing (hints, the HUD and the brain all read this)
// the ledge the slab should bring the rider level with, for a goal out of the slab's reach (null: from the slab)
function wizLiftVia(ph, goal) {
  const K = WIZLIFT, k = ph.floor, s = wizLiftActive(ph), tr = K.tracks[s.i], w = K.slab.w;
  const sw = goal.kind === 'switch';
  if (!sw && goal.x < tr.x1 + w + 30 && goal.x > tr.x0 - 30) return null;
  const hi = wizLiftHi(ph, s.i), lo = wizLiftLo(ph, s.i);
  const railY = ph.archOpen.y1 - K.slab.h, archR = k === 1 && s.i === 0 && goal.x > K.arch.x0;
  const reach = r => r.y0 >= hi - 2 && r.y0 <= lo + 2 && (!archR || Math.abs(r.y0 - railY) < 2) && (goal.x > tr.x1 ? r.x0 < tr.x1 + w + 90 : r.x1 > tr.x0 - 90);
  let best = null, bd = 1e9;
  for (const r of ph.solids) {
    if (r.kind !== 'ledge' || r.floor !== k || r.off || !reach(r)) continue;
    if (sw && Math.abs(r.y0 - goal.y) < 2) return { y: r.y0, x0: r.x0, x1: r.x1 };   // the switch's own ledge
    const under = goal.x > r.x0 - 10 && goal.x < r.x1 + 10 && r.y0 > goal.y - 14;
    const d = (under ? 0 : 400) + Math.abs(r.y0 - goal.y) + Math.max(0, r.x0 - goal.x, goal.x - r.x1);
    if (d < bd) { bd = d; best = { y: r.y0, x0: r.x0, x1: r.x1 }; }
  }
  return best;
}
function wizLiftPlan(st) {
  const ph = st.ph, K = WIZLIFT, k = ph.floor, f = WIZLIFT_FLOORS[k], rd = G.players[ph.ride], lf = G.players[ph.lift];
  const out = [null, null];
  // the rider's goal: a book (nearest, open), or the switch, or (switch done) the next floor
  let goal = null;
  if (ph.open[k]) goal = k === 5 ? { kind: 'roof', x: 480, y: wizLiftBase(6) } : { kind: 'wait', x: rd.x + rd.w / 2, y: rd.y + rd.h };
  else if (ph.got[k] >= K.need) {
    goal = { kind: 'switch', x: f.sw[0], y: wizLiftBase(k) - f.sw[1] };
    goal.via = wizLiftVia(ph, goal);
  }
  else {
    let bd = 1e9;
    for (const b of ph.books) { if (b.got || b.floor !== k) continue; const d = Math.hypot(b.cx - (rd.x + rd.w / 2), b.cy - rd.y) + (b.cx > 800 ? 40 : 0); if (d < bd) { bd = d; goal = { kind: 'book', x: b.cx, y: b.cy + 14, book: b }; } }
    // a book out past the slab's reach: from a ledge (under it, or the nearest one the slab can reach on that side)
    if (goal) goal.via = wizLiftVia(ph, goal);
  }
  out[ph.ride] = goal ? Object.assign({ why: goal.kind }, goal) : { why: 'wait' };
  // the lifter: where the slab should be (its top under the rider's goal), or climb when the stairs are open
  if (ph.open[k] && !(lf.grounded && lf.ground && Math.abs(lf.ground.y0 - wizLiftBase(k + 1)) < 2)) out[ph.lift] = { why: 'climb', x: 100, y: wizLiftBase(k + 1) };
  else if (goal && goal.kind !== 'wait') {
    const s = wizLiftActive(ph), tr = K.tracks[s.i], w = K.slab.w;
    const off = rd.grounded && !(rd.ground && rd.ground.slab) && !(goal.kind === 'switch' && rd.grounded && Math.abs(rd.y + rd.h - goal.y) < 4);
    let tx, ty, gx = goal.x;
    if (off) {
      // the rider is off the slab: fetch them (the slab's top level with their feet, beside them)
      const rx = rd.x + rd.w / 2; gx = rx;
      tx = rx < tr.x0 ? tr.x0 : rx > tr.x1 + w ? tr.x1 : rx - w / 2; ty = rd.y + rd.h + 2;
    } else {
      tx = goal.x - w / 2; ty = goal.y + 10;
      if (goal.kind === 'switch' || goal.kind === 'roof') ty = goal.y + 4;
      if (goal.via) { ty = goal.via.y; tx = goal.x > tr.x1 ? tr.x1 : tr.x0; }
      if (k === 3 && s.i === 0 && goal.x > 560) { tx = tr.x1; ty = wizLiftHi(ph, 0); }   // floor 4: the first slab up to the hand-over
    }
    if ((k === 1 || (k === 2 && s.y + K.slab.h > ph.archWall[0].y0 - 4)) && s.i === 0) {
      // floor 2's arch: out from under (or over) the wall, line up with the rail, ride through; back out the same way
      const A = K.arch, railY = ph.archOpen.y1 - K.slab.h, inX = s.x + w > A.x0 - 2, onRail = Math.abs(s.y - railY) < 6;
      // (right: the side past the wall, up at rail height; a rider on a ledge from the floor below is under it)
      const right = k === 1 && gx > A.x0 && (!off || rd.y + rd.h < ph.archWall[1].y1);
      const under = ph.archWall[1].y1 + 34;   // a slab this low passes under the wall
      if (right) {
        if (inX && !onRail) { tx = A.x0 - w - 8; ty = s.y; }
        else if (!onRail) { tx = A.x0 - w - 4; ty = railY; }
        else { ty = railY; tx = tr.x1; }
      } else if (inX && onRail) { tx = A.x0 - w - 8; ty = railY; }   // back out on the rail
      else if (ty < under) {   // up past the wall's foot: left of it
        if (inX) { tx = A.x0 - w - 8; ty = s.y; } else tx = Math.min(tx, A.x0 - w - 8);
      }
    }
    out[ph.lift] = { why: off ? 'fetch' : 'lift', x: clamp(tx, tr.x0, tr.x1), y: clamp(ty, wizLiftHi(ph, s.i), Math.max(wizLiftLo(ph, s.i), s.y)), slab: s.i, hold: 'act' };
  } else out[ph.lift] = { why: 'rest' };
  return out;
}
function wizLiftHints(st) {
  const ph = st.ph, lf = G.players[ph.lift], rd = G.players[ph.ride];
  if (ph.t < 2.5 && !ph.hinted) { ph.hinted = true; wizHint(st, ph.lift, 'Hold ' + wizKey(ph.lift, 'act') + ' to lift the slab', { life: 4, cpu: 'I\'ll lift!' }); wizHint(st, ph.ride, 'Grab books: ' + wizKey(ph.ride, 'act'), { life: 4, cpu: 'I\'ll ride!' }); }
  if (ph.tired && !st.hints[ph.lift]) wizHint(st, ph.lift, 'Out of puff! Rest a moment...', { life: 1.5, cpu: 'Catching my breath!' });
}
function wizLiftCam(st, dt) {
  const ph = st.ph, ps = G.players, lf = ps[ph.lift], rd = ps[ph.ride];
  const mid = Math.min(lf.y, rd.y) * 0.55 + Math.max(lf.y, rd.y) * 0.45;
  let want = clamp(mid - 300, wizLiftBase(6) - 160, 0);
  want = clamp(want, Math.max(lf.y, rd.y) + 60 - H, Math.min(lf.y, rd.y) - 120);
  ph.camY += (want - ph.camY) * Math.min(1, (dt || 0) * 4);
  st.cam.x = 0; st.cam.y = Math.round(ph.camY);
  const c = st.hm;
  c.x = 860 + Math.sin(ph.t * 0.6) * 20; c.y = st.cam.y + 200 + Math.sin(ph.t * 0.9) * 14; c.face = -1;
}
function wizLiftCoast(st, dt) {
  const ph = st.ph;
  if (!ph.slabs) return;
  for (const p of G.players) { p.vx = 0; p.vy = 0; p.pendingJump = false; p.pendingAct = false; }
  wizLiftCam(st, dt || 0);
}

/* ---------- drawing ---------- */
function wizLiftDrawBack(st) {
  const ph = st.ph, cy = st.cam.y, t = G.clock, C2 = WIZLIFT_C;
  wizScreen(st, () => {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#30264f'); g.addColorStop(1, C2.wallDk);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  });
  // shelves full of books all the way up the round wall
  const sh = 60;
  for (let y = Math.floor(cy / sh) * sh - sh; y < cy + H + sh; y += sh) {
    const row = Math.floor(y / sh);
    ctx.fillStyle = C2.wall; ctx.fillRect(0, y, W, sh - 8);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(0, y, W, 6); // the shelf above casts a shadow
    let x = 2;
    while (x < W) {
      const h2 = hash(x, row), bw = 8 + (h2 % 6), bh = sh - 20 - ((h2 >> 3) % 12);
      if ((h2 >> 6) % 11 === 0) { x += 10; continue; } // a gap on the shelf
      const col = C2.spine[h2 % 6], by = y + sh - 8 - bh;
      ctx.globalAlpha = 0.62;
      if ((h2 >> 9) % 9 === 0 && x > 4) { // a book leaning over
        ctx.save(); ctx.translate(x, y + sh - 8); ctx.rotate(-0.28); ctx.fillStyle = col; ctx.fillRect(0, -bh, bw, bh); ctx.restore();
        ctx.globalAlpha = 1; x += bw + 10; continue;
      }
      ctx.fillStyle = col; ctx.fillRect(x, by, bw, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x + 1, by, 2, bh);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + bw - 2, by, 2, bh);
      ctx.fillStyle = 'rgba(255,214,120,0.55)'; ctx.fillRect(x, by + 5, bw, 2); ctx.fillRect(x, by + bh - 7, bw, 2);
      ctx.globalAlpha = 1;
      x += bw + 1;
    }
    // the shelf board: lit top edge and a dark lip
    ctx.fillStyle = C2.shelf; ctx.fillRect(0, y + sh - 8, W, 8);
    ctx.fillStyle = 'rgba(255,220,160,0.25)'; ctx.fillRect(0, y + sh - 8, W, 2);
    ctx.fillStyle = C2.shelfDk; ctx.fillRect(0, y + sh - 2, W, 2);
  }
  // keep the far shelves back so the books to catch and the ledges stand out
  wizScreen(st, () => { ctx.fillStyle = 'rgba(28,20,58,0.42)'; ctx.fillRect(0, 0, W, H); });
  // carved wooden uprights between the bays
  for (const ux of [0, 236, 712, 948]) {
    ctx.fillStyle = C2.shelfDk; ctx.fillRect(ux - 6, cy - 10, 18, H + 20);
    ctx.fillStyle = C2.shelf; ctx.fillRect(ux - 4, cy - 10, 10, H + 20);
    ctx.fillStyle = 'rgba(255,220,160,0.2)'; ctx.fillRect(ux - 4, cy - 10, 2, H + 20);
  }
  // tall windows with the moon outside
  for (let k = 0; k < 7; k++) {
    const wy = wizLiftBase(k) - 300;
    if (wy > cy + H + 20 || wy + 200 < cy) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; rr(372, wy - 6, 136, 196, 66); ctx.fill();
    ctx.fillStyle = C2.shelfDk; ctx.strokeStyle = shade(C2.shelfDk, 0.3); ctx.lineWidth = 2; rr(374, wy - 6, 132, 192, 66); ctx.fill(); ctx.stroke();
    ctx.save(); rr(380, wy, 120, 180, 60); ctx.clip();
    const g = ctx.createLinearGradient(0, wy, 0, wy + 180); g.addColorStop(0, '#22195a'); g.addColorStop(1, '#6a4a9a');
    ctx.fillStyle = g; ctx.fillRect(380, wy, 120, 180);
    for (let s = 0; s < 9; s++) { const h3 = hash(k * 31 + s, 5); ctx.fillStyle = 'rgba(255,248,220,' + (0.4 + 0.5 * ((h3 >> 4) % 2)) + ')'; ctx.fillRect(384 + (h3 % 112), wy + 6 + ((h3 >> 7) % 160), 2, 2); }
    ctx.fillStyle = 'rgba(255,248,220,0.18)'; circle(440, wy + 70, 32); ctx.fill();
    ctx.fillStyle = 'rgba(255,248,220,0.8)'; circle(440, wy + 70, 20); ctx.fill();
    ctx.fillStyle = 'rgba(200,190,170,0.5)'; circle(446, wy + 64, 4); ctx.fill(); circle(434, wy + 78, 3); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = C2.shelfDk; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(440, wy); ctx.lineTo(440, wy + 180); ctx.moveTo(380, wy + 90); ctx.lineTo(500, wy + 90); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.beginPath();
    for (const ly of [45, 135]) { ctx.moveTo(380, wy + ly); ctx.lineTo(500, wy + ly); }
    for (const lx of [410, 470]) { ctx.moveTo(lx, wy + 8); ctx.lineTo(lx, wy + 180); }
    ctx.stroke();
    ctx.fillStyle = C2.shelf; ctx.strokeStyle = C2.shelfDk; ctx.lineWidth = 2; rr(366, wy + 180, 148, 10, 3); ctx.fill(); ctx.stroke();
    // a pool of moonlight on the shelves below
    ctx.fillStyle = 'rgba(200,190,255,0.06)'; ctx.beginPath(); ctx.moveTo(380, wy + 190); ctx.lineTo(500, wy + 190); ctx.lineTo(540, wy + 290); ctx.lineTo(340, wy + 290); ctx.fill();
  }
  // floating candles drifting near the shelves
  for (let k = 0; k < 6; k++) {
    for (const cx0 of [140, 820]) {
      const h4 = hash(k, cx0), x = cx0 + (h4 % 60) - 30, y = wizLiftBase(k) - 150 - ((h4 >> 5) % 60) + (reduceMotion ? 0 : Math.sin(t * 1.3 + k + cx0) * 5);
      if (y < cy - 40 || y > cy + H + 40) continue;
      ctx.fillStyle = 'rgba(255,200,110,0.16)'; circle(x, y - 14, 18); ctx.fill();
      ctx.fillStyle = '#f2e6c8'; ctx.strokeStyle = '#a89870'; ctx.lineWidth = 1.5; rr(x - 4, y - 8, 8, 22, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.ellipse(x, y - 13, 3, 5 + (reduceMotion ? 0 : Math.sin(t * 9 + k) * 1), 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff6d8'; circle(x, y - 12, 1.5); ctx.fill();
    }
  }
  // the slab tracks glow on the wall
  for (const tr of WIZLIFT.tracks) {
    const y0 = wizLiftBase(tr.f1), y1 = wizLiftBase(tr.f0);
    ctx.strokeStyle = C2.track; ctx.lineWidth = 3; ctx.setLineDash([6, 8]);
    ctx.strokeRect(tr.x0, y0, tr.x1 - tr.x0 + WIZLIFT.slab.w, y1 - y0); ctx.setLineDash([]);
  }
  // floor plaques, on the wall just above each floor
  for (let k = 0; k < 6; k++) {
    const b = wizLiftBase(k); if (b - 46 < cy + 120 || b > cy + H + 60) continue;   // (never under the top HUD)
    const label = 'Floor ' + (k + 1);
    text('', 0, 0, 13, C.paper, 'left', 'body'); const tw = ctx.measureText(label).width;
    const px = 14, py = b - 46;
    ctx.fillStyle = C2.brassDk; ctx.strokeStyle = shade(C2.brassDk, 0.4); ctx.lineWidth = 1.5; rr(px, py, tw + 16, 20, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,230,160,0.35)'; ctx.fillRect(px + 3, py + 2, tw + 10, 1.5);
    text(label, px + 8, py + 10, 13, '#fff0c8', 'left', 'body');
  }
}
function wizLiftDraw(st) {
  const ph = st.ph, K = WIZLIFT, C2 = WIZLIFT_C, t = G.clock;
  ctx.lineJoin = 'round';
  for (const r of ph.solids) {
    if (r.wall) continue;
    if (r.y1 < st.cam.y - 40 || r.y0 > st.cam.y + H + 40) continue;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    if (r.kind === 'ground') {
      ctx.fillStyle = '#5a4630'; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); ctx.fillStyle = '#7a5a3a'; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, 6);
      ctx.fillStyle = 'rgba(255,226,170,0.3)'; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let x = r.x0 + 40; x < r.x1; x += 80) { ctx.moveTo(x + (hash(x, 3) % 20), r.y0 + 6); ctx.lineTo(x + (hash(x, 3) % 20), r.y0 + 40); }
      ctx.moveTo(r.x0, r.y0 + 22); ctx.lineTo(r.x1, r.y0 + 22); ctx.stroke(); continue;
    }
    if (r.kind === 'step') {
      if (r.off) { ctx.globalAlpha = 0.25; ctx.fillStyle = C2.shelf; ctx.fillRect(r.x0 + 30, r.y0, 24, r.y1 - r.y0); ctx.globalAlpha = 1; continue; }
      ctx.fillStyle = C2.shelf; rr(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0, 3); ctx.fill(); ctx.stroke(); continue;
    }
    if (r.kind === 'roof') {
      if (r.off) { ctx.fillStyle = '#3a3552'; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, 20); ctx.fillStyle = C2.brass; ctx.fillRect(420, r.y0 + 4, 120, 10); continue; }
      ctx.fillStyle = '#4f8a58'; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, 20); ctx.fillStyle = '#7fd38a'; for (let x = 10; x < W; x += 50) { circle(x, r.y0, 8); ctx.fill(); } continue;
    }
    if (r.kind === 'arch') { ctx.fillStyle = C2.shelf; ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); continue; }
    if (r.kind === 'railing') { ctx.fillStyle = C2.brass; rr(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0, 2); ctx.fill(); ctx.stroke(); circle((r.x0 + r.x1) / 2, r.y0, 5); ctx.fill(); ctx.stroke(); continue; }
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; rr(r.x0 + 4, r.y1 - 2, r.x1 - r.x0 - 4, 8, 4); ctx.fill();
    ctx.fillStyle = r.kind === 'balcony' ? '#8a6640' : '#7e5632'; rr(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,226,170,0.45)'; ctx.fillRect(r.x0 + 4, r.y0 + 2, r.x1 - r.x0 - 8, 2.5);
    if (r.kind === 'balcony') { ctx.strokeStyle = C2.shelfDk; ctx.lineWidth = 2; for (let x = r.x0 + 10; x < r.x1; x += 16) { ctx.beginPath(); ctx.moveTo(x, r.y0); ctx.lineTo(x, r.y0 - 18); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(r.x0, r.y0 - 18); ctx.lineTo(r.x1, r.y0 - 18); ctx.stroke(); }
  }
  // the arch's opening, with its rail
  { const o = ph.archOpen; ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(K.arch.x0, o.y0, K.arch.x1 - K.arch.x0, o.y1 - o.y0); ctx.strokeStyle = C2.brass; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(K.arch.x0 - 40, o.y1); ctx.lineTo(K.arch.x1 + 40, o.y1); ctx.stroke(); }
  // switches
  WIZLIFT_FLOORS.forEach((f, k) => {
    const x = f.sw[0], y = wizLiftBase(k) - f.sw[1];
    if (y < st.cam.y - 60 || y > st.cam.y + H + 60) return;
    const on = ph.open[k], ready = ph.got[k] >= K.need;
    ctx.fillStyle = C2.brassDk; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(x - 12, y - 10, 24, 10, 3); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C2.brass; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + (on ? 14 : -14), y - 30); ctx.stroke();
    ctx.fillStyle = on ? '#9fe07f' : ready ? (Math.sin(t * 8) > 0 ? '#ffd23f' : '#fff3c4') : '#d9485a'; circle(x + (on ? 14 : -14), y - 32, 5); ctx.fill(); ctx.stroke();
  });
  // the slabs
  for (const s of ph.slabs) {
    if (s.i === 1 && ph.floor < 3 && s.y > st.cam.y + H) continue;
    const r = wizLiftRect(s);
    if (s.lit > 0) { ctx.save(); ctx.globalAlpha = s.lit; ctx.fillStyle = WIZ_SPELLS.lift.glow; rr(r.x0 - 8, r.y0 - 6, r.x1 - r.x0 + 16, r.y1 - r.y0 + 18, 10); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = C2.slab; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C2.slabLt; ctx.fillRect(r.x0 + 4, r.y0 + 3, r.x1 - r.x0 - 8, 3);
    // the little brass rails at the ends
    ctx.fillStyle = C2.brass; ctx.lineWidth = 1.5;
    for (const x of [r.x0 + 1, r.x1 - 1]) { rr(x - 3, r.y0 - K.slab.rail, 6, K.slab.rail + 2, 2); ctx.fill(); ctx.stroke(); circle(x, r.y0 - K.slab.rail, 3.5); ctx.fill(); ctx.stroke(); }
    if (s.lit > 0) for (let n = 0; n < 4; n++) wizDrawStar(r.x0 + 12 + n * 28, r.y1 + 8 + Math.sin(t * 9 + n) * 3, 3, WIZ_SPELLS.lift.col, { line: false });
  }
  // the chandelier
  if (ph.chand) {
    const c = ph.chand;
    ctx.strokeStyle = '#2a2140'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(c.px, c.py); ctx.lineTo(c.x, c.y); ctx.stroke();
    ctx.fillStyle = C2.brass; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(c.x, c.y, 26, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    for (const dx of [-18, 0, 18]) { ctx.fillStyle = '#fff4d6'; ctx.fillRect(c.x + dx - 2, c.y - 16, 4, 10); ctx.fillStyle = '#ffcf6a'; circle(c.x + dx, c.y - 19, 3 + Math.sin(t * 12 + dx) * 0.8); ctx.fill(); }
  }
  // the sliding ladders: the lane lights up first
  for (const ln of ph.lanes) {
    if (ln.t < 0) { ctx.fillStyle = 'rgba(255,95,109,' + (0.18 + 0.12 * Math.sin(t * 16)) + ')'; ctx.fillRect(160, ln.y - K.ladder.band / 2, W - 160, K.ladder.band); bigText('!', ln.dir > 0 ? 190 : W - 30, ln.y, 26, '#ff5f6d', 1); continue; }
    ctx.strokeStyle = C2.shelf; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ln.x - 14, ln.y - 60); ctx.lineTo(ln.x - 14, ln.y + 30); ctx.moveTo(ln.x + 14, ln.y - 60); ctx.lineTo(ln.x + 14, ln.y + 30); ctx.stroke();
    ctx.lineWidth = 3; for (let y = ln.y - 50; y < ln.y + 30; y += 16) { ctx.beginPath(); ctx.moveTo(ln.x - 14, y); ctx.lineTo(ln.x + 14, y); ctx.stroke(); }
  }
  // the books
  for (const b of ph.books) {
    if (b.got && b.y < st.cam.y - 40) continue;
    if (b.y < st.cam.y - 40 || b.y > st.cam.y + H + 40) continue;
    const flap = Math.sin(t * 12 + b.a * 3) * 0.7;
    ctx.save(); ctx.translate(b.x, b.y); if (b.got) ctx.globalAlpha = 0.5;
    ctx.fillStyle = b.col; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6;
    for (const d of [-1, 1]) { ctx.save(); ctx.scale(d, 1); ctx.rotate(-flap * 0.6); ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(13, -9); ctx.lineTo(13, 7); ctx.lineTo(0, 8); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff8e0'; ctx.fillRect(2, -6, 9, 2); ctx.fillStyle = b.col; ctx.restore(); }
    ctx.restore();
  }
}
function wizLiftHud(st) {
  const ph = st.ph, big = wizBig(), z = big ? 1.4 : 1, lf = G.players[ph.lift];
  // the lifter's focus meter over their head
  const x = lf.x + lf.w / 2, y = lf.y - 42 * z, w = 48 * z, h = 8 * z;
  ctx.fillStyle = 'rgba(30,20,66,0.85)'; rr(x - w / 2 - 3, y - 3, w + 6, h + 6, 5); ctx.fill();
  ctx.fillStyle = ph.tired ? '#ff9a3c' : ph.gold > 0 ? C.gold : WIZ_SPELLS.lift.col; rr(x - w / 2, y, w * ph.focus, h, 3); ctx.fill();
  if (ph.tired) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - w / 2 + w * WIZLIFT.focus.wake, y - 2); ctx.lineTo(x - w / 2 + w * WIZLIFT.focus.wake, y + h + 2); ctx.stroke(); }
}

WIZ_PHASES.lift = {
  setup(st, L) { wizLiftSetup(st, L); },
  step(st, dt) { wizLiftStep(st, dt); },
  coast(st, dt) { wizLiftCoast(st, dt); },
  plan(st) { return wizLiftPlan(st); },
  // the lifter holding the wand on a balcony is working even without a fresh press; so is a rider riding a rising slab
  present(st, p) { const ph = st.ph; return p.id === ph.ride && !!(p.ground && p.ground.slab && ph.held); },
  labels(st) { const ph = st.ph; return [0, 1].map(id => (id === ph.lift ? 'lift' : 'grab')); },
  roles(st) { const ph = st.ph; return [0, 1].map(id => (id === ph.lift ? 'Lift!' : 'Ride!')); },
  jobKeys(st) { return st.ph.lift === 1 ? ['rider', 'lifter'] : ['lifter', 'rider']; },
  legend(st) {
    const ph = st.ph, l = k => (k ? 'hold <kbd>/</kbd> lift, <kbd>←</kbd><kbd>→</kbd> slide it' : 'hold <kbd>F</kbd> lift, <kbd>A</kbd><kbd>D</kbd> slide it');
    return { pip: ph.lift === 0 ? l(0) : '<kbd>S</kbd> duck', bo: ph.lift === 1 ? l(1) : '<kbd>↓</kbd> duck', pad: 'lifter: hold the action and steer with the stick,' };
  },
  hudText(st) { const ph = st.ph; return 'Books ' + ph.got.reduce((a, b) => a + b, 0) + '/' + ph.books.length + '   Floor ' + (ph.floor + 1) + ' of 6'; },
  progress(st) { const ph = st.ph; return { n: ph.floor + (ph.open[ph.floor] ? 1 : 0), of: 6 }; },
  drawBack(st) { wizLiftDrawBack(st); },
  draw(st) { wizLiftDraw(st); },
  hud(st) { wizLiftHud(st); },
  statLine(st) { const s = st.stats.lift; return s && s.books >= 40 ? 'Caught ' + s.books + ' runaway books' : ''; },
};

/* ---------- sounds ---------- */
Sfx.extra.wizLiftBook = function () { [784, 1046].forEach((f, i) => this.tone(f, 0.07, 'triangle', 0.04, null, i * 0.05)); };
Sfx.extra.wizLiftSwish = function () { this.tone(500, 0.08, 'sawtooth', 0.012, 900); };
Sfx.extra.wizLiftSwitch = function () { this.tone(300, 0.06, 'square', 0.05); [523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.045, null, 0.08 + i * 0.07)); };
Sfx.extra.wizLiftNo = function () { this.tone(200, 0.12, 'square', 0.03, 160); };
Sfx.extra.wizLiftTired = function () { this.tone(500, 0.3, 'sine', 0.03, 200); };
Sfx.extra.wizLiftFlump = function () { this.tone(160, 0.2, 'triangle', 0.05, 90); for (let k = 0; k < 4; k++) this.tone(600 + k * 100, 0.04, 'square', 0.015, null, 0.05 + k * 0.04); };
Sfx.extra.wizLiftKnock = function () { this.tone(330, 0.1, 'square', 0.045, 160); };
Sfx.extra.wizLiftWarn = function () { [880, 660].forEach((f, i) => this.tone(f, 0.08, 'square', 0.028, null, i * 0.12)); };
Sfx.extra.wizLiftPoof = function () { this.tone(300, 0.25, 'sine', 0.04, 900); this.tone(600, 0.2, 'triangle', 0.02, 1400, 0.05); };

/* ---------- the room ---------- */
wizRoom('lift', {
  jobs: {
    lifter: { title: 'Lifter', act: 'lift', legend: '<kbd>A</kbd><kbd>D</kbd> slide the slab',
      howTo: ['Hold lift to raise the slab. Let go to rest.', 'While you hold lift, left and right slide it.'] },
    rider: { title: 'Rider', act: 'grab', legend: '<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump <kbd>S</kbd> duck',
      howTo: ['Grab runaway books, then press the brass switch.'] },
  },
  act: { label: 'lift', labels: ['lift', 'grab'] },
  tip: 'One holds the action to float the slab up, the other rides it and grabs runaway books. Then press the switch!',
  legend: { pip: 'hold <kbd>F</kbd> lift, <kbd>A</kbd><kbd>D</kbd> slide it', bo: '<kbd>↓</kbd> duck', pad: 'lifter: hold the action and steer with the stick,' },
  map: WIZ_EMPTY_MAP,
});
