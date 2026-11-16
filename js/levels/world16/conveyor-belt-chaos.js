/* Pip & Bo - Level 16-1 Conveyor Belt Chaos (team, World 16 Sugar Rush Factory). */
'use strict';

/* ===== 16-1 Conveyor Belt Chaos (mode 'conveyor', World 16 "Sugar Rush Factory", team) — Gavyn's pick =====
   "One works the levers that change belt speed and direction, the other rides the belts and sorts candy into the right
   bins." Side view of a bright candy factory floor, one screen per room. The mode owns the tick (def.ownStep) and the
   HUD (def.ownHUD); the engine still moves the players (control / moveX / moveY / probe) over a grid the mode builds.
   - The OPERATOR walks the catwalk along the top of the screen (no jumping up there). Each lever station on the catwalk
     works the thing below it: a BELT lever (the action flips the belt's direction, ▲ ▼ change its speed: stop, slow,
     fast), the LIFT lever (▲ up, ▼ down, the action toggles), the TRAPDOOR lever (the action or ▼ opens it for a moment,
     holding keeps it open). The operator can never touch candy.
   - The SORTER is a platformer on the factory floor. Belts are one-way (jump up through them, ▼ drops down) and carry
     you. The action grabs one candy within reach (from the floor, a lift, a stopped or slow belt, or out of the air)
     and holds it over your head; the action again tosses it, aimed into the bin in front of you (▼ + action just drops
     it). Candy on a FAST belt is "Too fast!" to grab, so the operator has to slow it down.
   - Candy pops out of chutes onto a belt, but only while that belt is running: an idle operator means no candy at all.
     Candy that falls off a belt end onto a recycle grate (or into the recycler mouth) comes back later ("Recycled!", a
     soft miss, never a fail). A wrong bin is a silly "Blech! Wrong flavour!" and the candy pops back out.
   - Each room has an order board (e.g. 3 of each). Fill it and the room is done. Roles swap every room.
   - Candy kinds have a colour AND a shape: lollipop (pink, round on a stick), gumdrop (green dome), chocolate bar
     (brown, square grid), toffee (orange, twisted ends), gift box (blue box with a gold ribbon: a wrapped toffee).
   Rooms (room def keys below): Lollipop Line (one belt, two bins), Gumdrop Gallery (stacked belts, a lift up to the
   high gumdrop shelf; candy off the top belt falls onto the low belt or into the lift shaft), Wrap & Ribbon (a wrapping
   machine on the high belt wraps toffees only when the belt runs slow; a trapdoor drops candy down to the low belt;
   wrapped toffees go in the gift box), Rush Hour (everything, two chutes, faster; Boss Bonbon's confetti finale).
   Gold help (always announced): Gold grabber (grab from fast belts, longer reach) after 4 useful candies recycled in a
   room; Gold labels (bins light up for the candy you hold) after 2 Blechs in a room; Gold candy (the chutes send only
   what the order needs) after 30 s without sorting a candy once the room is a minute old; Gold wrapper (wraps at any
   speed) after 3 toffees rush through the wrapper unwrapped; Gold trapdoor (a tile wider each side, open 1.6 s) after 3
   good candies ride past the trapdoor into the recycler.
   An unwrapped toffee anywhere but on the wrapper's belt goes "Back to the wrapper!" after a moment (a toffee in the gift
   box is a lesson, not a Blech). When junk fills the floor and belts, the oldest junk poofs back so the chutes never stall.
   Medal (MODES.conveyor.medals, js/medals.js): Gold ≤ 4:00 with ≤ 3 Blechs, Silver ≤ 7:00 with ≤ 8 (two computers about 2:40, noisy computer pairs 3:20-4:00, prompt-following scripted kids 3:00-4:00).
   Room def: { title, sorter: 0|1, tip, act, belts: [{ id, name, c0, c1, r, col, ends: [l, r] ('fall'|'wall'|'mouth'),
   st (station x), spd, dir }], chutes: [{ belt, x, every, mix: [kinds] }], bins: [{ kind, x, y }], shelves: [[c0, c1,
   r]], lift: { x0, x1, lo, hi, st }, trap: { belt, c0, c1, st }, wrap: { belt, x }, order: { kind: n } }.
   Every top-level name starts with conveyor / CONVEYOR (Sfx.extra.conveyor* too); all state lives in G.mst. */
const CONVEYOR = {
  speeds: [0, 60, 150],          // belt speeds: stop, slow, fast (px/s)
  candyG: 1250, candyR: 11, cap: 9, gap: 25,
  grabX: 28, grabUp: 34, grabDown: 8, goldReach: 1.5,
  tossReach: 200, tossAbove: 160, tossBelow: 70,
  liftSpeed: 165, trapT: 0.7, stationR: 24,
  recycleBack: 4.5, floorPoof: 20, chuteFirst: 0.6, toffeeBack: 0.9, crowdPoof: 6,
  helpRecycled: 4, helpTrapRecycled: 3, goldTrapT: 1.6, helpBlechs: 2, helpNoSortT: 30, helpRoomT: 60, helpWrapMiss: 3,
  doneT: 2.4, finalT: 6.2, hintLife: 2.8,
  catwalkY: 120, floorY: 450, ceilY: 150,
};
const CONVEYOR_KINDS = {
  lolly: { name: 'Lollipop', bin: 'LOLLIES', col: '#ff5c8a', dark: '#b02a58', tint: '#ffd3e1' },
  gum: { name: 'Gumdrop', bin: 'GUMDROPS', col: '#3ccb6c', dark: '#1d7d40', tint: '#cff5da' },
  choc: { name: 'Chocolate', bin: 'CHOCS', col: '#8a5430', dark: '#4a2814', tint: '#f0dccb' },
  toffee: { name: 'Toffee', bin: 'TOFFEES', col: '#ffad3b', dark: '#b06a10', tint: '#ffe9c8' },
  gift: { name: 'Gift box', bin: 'GIFTS', col: '#4fb6ff', dark: '#2366a8', tint: '#d4ecff' },
};
const CONVEYOR_BELTCOL = { mint: ['#5fd3a8', '#2f9a74'], lilac: ['#b897ff', '#7a5bd0'], lemon: ['#ffd65c', '#c9971a'] };
const conveyorBig = () => (typeof hudBig === 'function' && hudBig());
// 1-player mode: the computer's own job gets no key hints or prompts (it knows its job)
const conveyorQuiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
const conveyorLerp = (a, b, u) => a + (b - a) * u;
const conveyorFont = (n, w) => (w === 'd' ? n + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif' : '700 ' + n + 'px "Atkinson Hyperlegible", system-ui, sans-serif');

// each player's own keys, for the job cards and the prompts (a player with a controller is shown its buttons)
function conveyorKey(id, what) {
  let how = 'kb';
  try { how = actKey(id); } catch (e) { how = 'kb'; }
  const pad = how === 'pad', touch = how === 'touch';
  if (what === 'jump') return pad ? glyph('a') : touch ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'up') return pad ? '▲' : touch ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'down') return pad ? '▼' : touch ? '▼' : id === 0 ? 'S' : '↓';
  if (what === 'updown') return pad ? '▲▼' : touch ? '▲▼' : id === 0 ? 'W S' : '↑ ↓';
  if (what === 'act') return pad ? glyph('act') : touch ? '●' : id === 0 ? 'F' : '/';
  if (what === 'left') return pad ? '◀' : touch ? '◀' : id === 0 ? 'A' : '←';
  if (what === 'right') return pad ? '▶' : touch ? '▶' : id === 0 ? 'D' : '→';
  return pad ? 'stick' : touch ? '◀ ▶' : id === 0 ? 'A D' : '← →';
}

/* ---------- a room: the grid, belts, chutes, bins, grates, the lift, the trapdoor, the wrapper ---------- */
function conveyorRoom(st, L, k) {
  const C0 = CONVEYOR, def = L.def;
  st.k = k; st.sorter = def.sorter || 0; st.op = 1 - st.sorter; st.title = def.title || '';
  st.style = def.style || 'pink';
  // the grid: the catwalk (row 4), the floor (rows 15-17), shelves (solid) and belts (one-way '=')
  const g = [];
  for (let r = 0; r < ROWS; r++) { g.push([]); for (let c = 0; c < COLS; c++) g[r].push(r === 4 || r >= 15 ? '#' : '.'); }
  st.belts = []; st.beltById = {};
  for (const b0 of def.belts || []) {
    const b = { id: b0.id, name: b0.name || ('Belt ' + b0.id), c0: b0.c0, c1: b0.c1, r: b0.r, x0: b0.c0 * T, x1: (b0.c1 + 1) * T, y: b0.r * T,
      ends: (b0.ends || ['fall', 'fall']).slice(), col: CONVEYOR_BELTCOL[b0.col] || CONVEYOR_BELTCOL.mint, colName: b0.col || 'mint',
      dir: b0.dir || 1, spd: b0.spd || 0, off: 0, st: b0.st, flash: 0, v: 0 };
    for (let c = b.c0; c <= b.c1; c++) g[b.r][c] = '=';
    st.belts.push(b); st.beltById[b.id] = b;
  }
  st.shelves = [];
  for (const s of def.shelves || []) {
    for (let c = s[0]; c <= s[1]; c++) g[s[2]][c] = '#';
    st.shelves.push({ x0: s[0] * T, x1: (s[1] + 1) * T, y: s[2] * T });
  }
  L.grid = g;
  // the trapdoor: a few tiles of a belt that open
  st.trap = null;
  if (def.trap) {
    const b = st.beltById[def.trap.belt];
    st.trap = { belt: b, c0: def.trap.c0, c1: def.trap.c1, x0: def.trap.c0 * T, x1: (def.trap.c1 + 1) * T, y: b.y, openT: 0, open: false, anim: 0, st: def.trap.st };
    b.trap = st.trap;
  }
  // the lift: a one-way platform that goes between the floor and the high shelf
  st.lift = def.lift ? { x0: def.lift.x0, x1: def.lift.x1, lo: def.lift.lo, hi: def.lift.hi, y: def.lift.lo, target: def.lift.lo, st: def.lift.st, moving: 0, blocked: false } : null;
  st.wrap = def.wrap ? { belt: st.beltById[def.wrap.belt], x: def.wrap.x, x0: def.wrap.x - 42, x1: def.wrap.x + 42, spin: 0, puff: 0 } : null;
  // chutes (pipes from the ceiling) drop candy onto their belt while it runs
  st.chutes = (def.chutes || []).map((c, i) => ({ i, belt: st.beltById[c.belt], x: c.x, every: c.every || 3, mix: (c.mix || def.mix || ['lolly']).slice(), t: C0.chuteFirst + i * 0.9, next: null, pop: 0, waitT: 0 }));
  st.bins = (def.bins || []).map(b => ({ kind: b.kind, x: b.x, y: b.y, w: 66, h: 56, glow: 0, shake: 0, yum: 0, blech: 0, high: b.y < C0.floorY - 10 }));
  // recycle grates on the floor, where candy falling off a belt end lands (and the lift shaft's floor)
  st.grates = [];
  for (const b of st.belts) {
    for (const side of [0, 1]) {
      if (b.ends[side] !== 'fall') continue;
      const ex = side ? b.x1 : b.x0, dir = side ? 1 : -1;
      // only where the candy would land on the floor (not on a lower belt or into the lift shaft)
      const lower = st.belts.some(o => o !== b && o.y > b.y && ex + dir * 20 > o.x0 && ex + dir * 20 < o.x1);
      const shaft = st.lift && ex + dir * 30 > st.lift.x0 && ex + dir * 30 < st.lift.x1;
      if (lower || shaft) continue;
      const a = ex - dir * 14, z = ex + dir * 70;
      st.grates.push({ x0: Math.min(a, z), x1: Math.max(a, z), y: C0.floorY, flash: 0 });
    }
  }
  if (st.lift) st.grates.push({ x0: st.lift.x0, x1: st.lift.x1, y: C0.floorY, flash: 0, shaft: true });
  // the order board
  st.order = {}; st.orderKeys = [];
  for (const [kind, n] of Object.entries(def.order || {})) { st.order[kind] = { need: n, got: 0, pop: 0 }; st.orderKeys.push(kind); }
  // the lever stations on the catwalk
  st.stations = [];
  for (const b of st.belts) if (b.st != null) st.stations.push({ kind: 'belt', x: b.st, ref: b, col: b.col, label: b.name, flash: 0, lever: 0 });
  if (st.lift && st.lift.st != null) st.stations.push({ kind: 'lift', x: st.lift.st, ref: st.lift, col: CONVEYOR_BELTCOL.lemon, label: 'Lift', flash: 0, lever: 0 });
  if (st.trap && st.trap.st != null) st.stations.push({ kind: 'trap', x: st.trap.st, ref: st.trap, col: ['#ff9ccf', '#c2508a'], label: 'Trapdoor', flash: 0, lever: 0 });
  st.stations.sort((a, b) => a.x - b.x);
  for (const b of st.belts) b.v = b.dir * C0.speeds[b.spd];
  st.candies = []; st.recycleQ = []; st.held = null; st.nextId = st.nextId || 1;
  st.phase = 'play'; st.phaseT = 0; st.roomT = 0; st.lastSortT = 0;
  st.pops = []; st.parts = []; st.msg = null; st.hints = [null, null]; st.hinted = {};
  st.gold = { grab: false, labels: false, candy: false, wrap: false, trap: false };
  st.room = { recycled: 0, blechs: 0, wrapMiss: 0, tooFast: 0, missedTrap: 0 };
  st.opPrev = { up: true, down: true }; st.opNope = 0; st.tooFastT = 0; st.tooFastBelt = null; st.missGrab = 0;
  st.inT = [-99, -99]; st.boss = null;
  st.stats.roomT[k] = null; st.stats.roomTitles[k] = st.title;
  // where everyone starts: the operator on the catwalk, the sorter on the floor
  const ps = G.players;
  const place = (p, x, feet) => { Object.assign(p, { x: x - PW / 2, y: feet - PH, vx: 0, vy: 0, grounded: true, jumping: false, jumpBuf: 0, coyote: 0, carryVx: 0, dropT: 0, alive: true }); p.face = 1; p.downLatch = true; p.onLift = false; };
  place(ps[st.op], def.opX || 480, C0.catwalkY);
  place(ps[st.sorter], def.sorterX || 480, C0.floorY);
  conveyorActLabels(st);
}

/* ---------- the tick (def.ownStep: this is all of it) ---------- */
function conveyorStep(st, dt) {
  if (!st.belts) return;
  const ps = G.players;
  for (const k of [0, 1]) { const i = ps[k].input; if (i.left || i.right || i.jump || i.down || i.up || i.act || ps[k].pendingJump) st.inT[k] = G.time; }
  st.phaseT += dt;
  if (G.introT > 0) {
    for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
    st.opPrev = { up: true, down: true };
    conveyorFx(st, dt);
    return;
  }
  if (st.phase === 'done') { if (conveyorDoneStep(st, dt)) return; conveyorFx(st, dt); return; }
  if (st.phase === 'final') { if (conveyorFinalStep(st, dt)) return; conveyorFx(st, dt); return; }
  st.roomT += dt;
  conveyorLiftStep(st, dt);
  conveyorTrapStep(st, dt);
  conveyorOperator(st, ps[st.op], dt);
  conveyorSorter(st, ps[st.sorter], dt);
  for (const b of st.belts) { b.v = b.dir * CONVEYOR.speeds[b.spd]; b.off += b.v * dt; b.flash = Math.max(0, b.flash - dt * 2); }
  conveyorChutes(st, dt);
  conveyorCandies(st, dt);
  conveyorHelp(st, dt);
  conveyorNudges(st, dt);
  conveyorFx(st, dt);
  if (st.orderKeys.every(kd => st.order[kd].got >= st.order[kd].need)) conveyorRoomDone(st);
}

/* ---------- moving a player (the engine's platformer rules, plus the lift and the belts) ---------- */
function conveyorMove(st, p, dt, op) {
  const C0 = CONVEYOR;
  if (op) { p.pendingJump = false; p.jumpBuf = 0; }
  const was = p.grounded, n0 = G.particles.length;
  control(p, dt);
  if (op) p.jumping = false;
  // a jump off a moving belt keeps the belt's push (until you steer)
  if (!op && was && p.vy < 0 && p.beltV) p.carryVx = p.beltV;
  const vy0 = p.vy;
  moveX(p, p.vx * dt, true);
  const feet0 = p.y + p.h;
  moveY(p, p.vy * dt, true);
  const pr = probe(p);
  let onLift = false;
  const lf = st.lift;
  if (!op && lf && p.x + p.w > lf.x0 + 2 && p.x < lf.x1 - 2 && p.vy >= 0 && p.dropT <= 0) {
    const feet = p.y + p.h;
    if (feet0 <= lf.y + 1.5 && feet >= lf.y - 0.5) { p.y = lf.y - p.h; p.vy = 0; onLift = true; }
  }
  p.tileGround = pr.tile; p.onPartner = false; p.onOneWay = pr.oneway && !onLift; p.grounded = pr.tile || onLift; p.onLift = onLift;
  // standing on a belt: it carries you
  p.beltV = 0;
  if (!op && p.grounded && !onLift) {
    const feet = p.y + p.h;
    for (const b of st.belts) {
      if (Math.abs(feet - b.y) > 1.5 || p.x + p.w <= b.x0 + 1 || p.x >= b.x1 - 1) continue;
      if (b.trap && b.trap.open && p.x >= b.trap.x0 - 2 && p.x + p.w <= b.trap.x1 + 2) continue;
      if (b.v) { moveX(p, b.v * dt, true); p.beltV = b.v; }
      break;
    }
  }
  if (p.grounded && !was && vy0 > 260) { p.sx = 1.22; p.sy = 0.8; puff(p.x + p.w / 2, p.y + p.h, 5, 'rgba(255,255,255,0.8)'); Sfx.play('land'); }
  void C0; void n0;
}

/* ---------- the operator: walk the catwalk, work the levers ---------- */
function conveyorStationAt(st, p) {
  const cx = p.x + p.w / 2;
  let best = null, bd = CONVEYOR.stationR + 1;
  for (const s of st.stations) { const d = Math.abs(s.x - cx); if (d < bd) { bd = d; best = s; } }
  return best;
}
function conveyorOperator(st, p, dt) {
  const i = p.input, prev = st.opPrev;
  const up = p.pendingJump || (i.up && !prev.up), down = i.down && !prev.down, act = p.pendingAct;
  prev.up = !!(i.up || i.jump); prev.down = !!i.down;
  p.pendingAct = false;
  conveyorMove(st, p, dt, true);
  // the catwalk ends: a railing at each side
  if (p.x < 6) { p.x = 6; p.vx = 0; } else if (p.x + p.w > W - 6) { p.x = W - 6 - p.w; p.vx = 0; }
  const s = conveyorStationAt(st, p);
  st.opAt = s;
  st.opNope = Math.max(0, st.opNope - dt);
  if (!s) {
    if ((act || up || down) && st.opNope <= 0) {
      st.opNope = 2.2;
      conveyorPop(st, p.x + p.w / 2, p.y - 16, 'Walk to a lever!', PCOL[p.id], 15);
      Sfx.play('conveyorNope', p.id);
    }
    return;
  }
  if (s.kind === 'belt') {
    const b = s.ref;
    if (act) {
      b.dir = -b.dir; b.flash = 1; s.flash = 1; s.lever = b.dir; b.flipT = st.roomT;
      st.stats.flips[p.id]++;
      conveyorPop(st, (b.x0 + b.x1) / 2, b.y - 34, b.dir > 0 ? 'Flip! ▶' : '◀ Flip!', b.col[0], 20, 'belt' + b.id);
      Sfx.play('conveyorFlip', p.id); rumble(p.id, 0, 0.25, 60);
    }
    if (up && b.spd < 2) { b.spd++; s.flash = 1; b.flash = 0.6; st.stats.speeds[p.id]++; Sfx.play(b.spd === 1 ? 'conveyorStart' : 'conveyorFaster', p.id); conveyorPop(st, (b.x0 + b.x1) / 2, b.y - 34, b.spd === 2 ? 'FAST!' : 'Slow', b.col[0], 18, 'belt' + b.id); }
    else if (up) { s.flash = 0.4; Sfx.play('conveyorClick', p.id); }
    if (down && b.spd > 0) { b.spd--; s.flash = 1; b.flash = 0.6; st.stats.speeds[p.id]++; Sfx.play(b.spd === 0 ? 'conveyorStop' : 'conveyorSlower', p.id); conveyorPop(st, (b.x0 + b.x1) / 2, b.y - 34, b.spd === 0 ? 'STOP' : 'Slow', b.col[0], 18, 'belt' + b.id); }
    else if (down) { s.flash = 0.4; Sfx.play('conveyorClick', p.id); }
  } else if (s.kind === 'lift') {
    const lf = s.ref;
    let want = null;
    if (up) want = lf.hi; else if (down) want = lf.lo; else if (act) want = lf.target === lf.hi ? lf.lo : lf.hi;
    if (want != null) {
      if (want !== lf.target) { lf.target = want; s.flash = 1; st.stats.lifts[p.id]++; Sfx.play(want === lf.hi ? 'conveyorLiftUp' : 'conveyorLiftDown', p.id); }
      else { s.flash = 0.4; Sfx.play('conveyorClick', p.id); }
    }
  } else if (s.kind === 'trap') {
    const tp = s.ref;
    if (act || down) { if (!tp.open) { Sfx.play('conveyorTrap', p.id); st.stats.traps[p.id]++; } tp.openT = Math.max(tp.openT, tp.gold ? CONVEYOR.goldTrapT : CONVEYOR.trapT); s.flash = 1; }
    else if (i.act && tp.open) tp.openT = Math.max(tp.openT, 0.12);
    if (up && tp.open) tp.openT = 0;
  }
}
function conveyorLiftStep(st, dt) {
  const lf = st.lift;
  if (!lf) return;
  const ps = G.players, s = ps[st.sorter];
  let ny = approach(lf.y, lf.target, CONVEYOR.liftSpeed * dt);
  // (never down onto someone standing under it: it waits)
  lf.blocked = false;
  if (ny > lf.y && !s.onLift && s.x + s.w > lf.x0 + 2 && s.x < lf.x1 - 2 && s.y < ny + 14 && s.y + s.h > lf.y) { ny = lf.y; lf.blocked = true; }
  // (someone waiting under it for a long while gets a gentle nudge out of the shaft: "Beep beep!")
  lf.blockT = lf.blocked ? (lf.blockT || 0) + dt : 0;
  if (lf.blockT > 4 && s.grounded) {
    const mid = (lf.x0 + lf.x1) / 2, side = s.x + s.w / 2 < mid ? -1 : 1;
    moveX(s, side * 120 * dt, true);
    if (!lf.beeped) { lf.beeped = true; conveyorPop(st, mid, lf.y - 30, 'Beep beep!', '#ffe680', 18); Sfx.play('conveyorNope'); }
  } else if (!lf.blocked) lf.beeped = false;
  const dy = ny - lf.y;
  lf.moving = dy;
  if (!dy) return;
  // (a rider who stands on a belt or shelf with only an edge over the lift is not carried down through it)
  if (s.onLift && !(dy > 0 && s.tileGround) && Math.abs(s.y + s.h - lf.y) < 2) {
    if (dy < 0) {
      // (going up, the rider moves with tile collision: with part of the body under the shelf beside the shaft the lift
      // waits and shuffles them fully aboard, where it used to push them up into the shelf)
      const y0 = s.y; moveY(s, dy, true);
      if (s.y > y0 + dy + 0.01) {
        s.y = y0; s.vy = 0; lf.moving = 0;
        moveX(s, (s.x + s.w / 2 < (lf.x0 + lf.x1) / 2 ? 1 : -1) * 120 * dt, true);
        return;
      }
      s.vy = Math.min(s.vy, 0);
    } else s.y += dy;
  }
  lf.y = ny;
  for (const c of st.candies) if (c.st === 'rest' && c.surf === 'lift') c.y = lf.y - CONVEYOR.candyR;
  if (Math.abs(lf.y - lf.target) < 0.01) Sfx.play('conveyorDing');
}
function conveyorTrapStep(st, dt) {
  const tp = st.trap;
  if (!tp) return;
  tp.openT = Math.max(0, tp.openT - dt);
  const open = tp.openT > 0;
  // Gold trapdoor: one tile wider each side (changed while it is shut)
  if (tp.goldPending && !open && !tp.open) {
    tp.goldPending = false; tp.gold = true;
    tp.c0 = Math.max(tp.belt.c0 + 1, tp.c0 - 1); tp.c1 = Math.min(tp.belt.c1 - 1, tp.c1 + 1); tp.x0 = tp.c0 * T; tp.x1 = (tp.c1 + 1) * T;
  }
  if (open !== tp.open) {
    tp.open = open;
    const g = G.level.grid, r = tp.belt.r;
    for (let c = tp.c0; c <= tp.c1; c++) g[r][c] = open ? '.' : '=';
    if (!open) Sfx.play('conveyorTrapShut');
  }
  tp.anim = approach(tp.anim, open ? 1 : 0, dt * 9);
}

/* ---------- the sorter: run, jump, grab, toss ---------- */
function conveyorReach(st) { return st.gold.grab ? CONVEYOR.goldReach : 1; }
function conveyorCanGrab(st, c) {
  if (c.st === 'belt') return c.belt.spd < 2 || st.gold.grab;
  return c.st === 'rest' || c.st === 'air';
}
// the candy a sorter at p could reach right now (nearest first); fast: one on a fast belt (for "Too fast!")
// ok (optional): only candy that passes it counts (the computer's sorter skips a toffee it has already given up on)
function conveyorInReach(st, p, ok) {
  const C0 = CONVEYOR, k = conveyorReach(st), cx = p.x + p.w / 2;
  let best = null, bd = 1e9, fast = null;
  for (const c of st.candies) {
    if (c.st === 'gone' || c.st === 'held' || c.inWrap || c.noGrab > 0 || (ok && !ok(c))) continue;
    const dx = Math.abs(c.x - cx);
    if (dx > C0.grabX * k) continue;
    if (c.y < p.y - C0.grabUp * k || c.y > p.y + p.h + C0.grabDown) continue;
    // order candy first: an unneeded kind only wins when nothing useful is in reach
    const d = dx + Math.abs(c.y - (p.y + p.h / 2)) * 0.5 + (conveyorCandyUseful(st, c) ? 0 : 1000);
    if (!conveyorCanGrab(st, c)) { if (!fast) fast = c; continue; }
    if (d < bd) { bd = d; best = c; }
  }
  return { best, fast };
}
function conveyorSorter(st, p, dt) {
  const act = p.pendingAct;
  p.pendingAct = false;
  conveyorMove(st, p, dt, false);
  st.stats.beltT += p.beltV ? dt : 0;
  if (act) {
    if (st.held) conveyorToss(st, p);
    else {
      const r = conveyorInReach(st, p);
      if (r.best) conveyorGrab(st, p, r.best);
      else if (r.fast) {
        conveyorPop(st, r.fast.x, r.fast.y - 26, 'Too fast!', '#ffffff', 18);
        Sfx.play('conveyorNope', p.id);
        st.tooFastT = 3.5; st.tooFastBelt = r.fast.belt; st.room.tooFast++;
        conveyorHint(st, st.op, 'Slow ' + r.fast.belt.name + ' down! ' + conveyorKey(st.op, 'down'), 3);
        if (!conveyorQuiet(p.id) && !st.hinted.tooFast) { st.hinted.tooFast = true; conveyorHint(st, p.id, NAMES[st.op] + ' has to slow that belt down', 2.8); }
      } else {
        st.missGrab++;
        if (st.missGrab >= 3) { st.missGrab = 0; conveyorHint(st, p.id, 'Get right next to a candy, then ' + conveyorKey(p.id, 'act'), 2.6); }
      }
    }
  }
  if (st.held) { const c = st.held; c.x = p.x + p.w / 2; c.y = p.y - 12 + Math.sin(G.time * 8) * 1.2; }
}
function conveyorGrab(st, p, c) {
  c.st = 'held'; c.belt = null; c.surf = null; c.vx = c.vy = 0; c.by = p.id;
  st.held = c; st.missGrab = 0;
  st.stats.grabs[p.id]++;
  Sfx.play('conveyorGrab', p.id);
  conveyorSpark(st, c.x, c.y, CONVEYOR_KINDS[c.kind].col, 6);
}
// the bin the sorter would toss into: the nearest one in front within reach (a bin right underfoot counts too)
function conveyorTossTarget(st, p) {
  const C0 = CONVEYOR, cx = p.x + p.w / 2, sy = p.y - 12;
  let best = null, bd = 1e9;
  for (const b of st.bins) {
    const dx = b.x - cx, my = b.y - b.h;
    if (Math.abs(dx) > C0.tossReach) continue;
    if (dx * p.face < -24) continue;
    if (my < sy - C0.tossAbove || my > sy + C0.tossBelow) continue;
    const d = Math.abs(dx) + Math.abs(my - sy) * 0.4;
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}
function conveyorToss(st, p) {
  const C0 = CONVEYOR, c = st.held;
  st.held = null;
  c.st = 'air'; c.by = p.id; c.noGrab = 0.45; c.spin = (Math.random() - 0.5) * 8;
  if (p.input.down) {
    c.vx = p.vx * 0.3; c.vy = 40; c.y = p.y + 4;
    Sfx.play('conveyorDrop', p.id);
    return;
  }
  const bin = conveyorTossTarget(st, p);
  if (bin) {
    // a neat arc into the bin's mouth
    const g = C0.candyG, sx = c.x, sy = c.y, tx = bin.x, ty = bin.y - bin.h - 2;
    const apex = Math.max(C0.ceilY + C0.candyR + 3, Math.min(sy, ty) - 34);
    const vy = -Math.sqrt(2 * g * Math.max(10, sy - apex));
    const Tt = (-vy + Math.sqrt(Math.max(0, vy * vy + 2 * g * (ty - sy)))) / g;
    c.vx = clamp((tx - sx) / Math.max(0.15, Tt), -520, 520); c.vy = vy; c.aim = bin;
  } else { c.vx = p.face * 190 + p.vx * 0.3; c.vy = -280; c.aim = null; }
  st.stats.tosses[p.id]++;
  Sfx.play('conveyorToss', p.id);
}

/* ---------- candy: chutes, belts, flying, bins, grates ---------- */
const conveyorUseful = (st, kind) => {
  if (kind === 'toffee') return !!(st.order.gift && st.order.gift.got < st.order.gift.need);
  const o = st.order[kind];
  return !!(o && o.got < o.need);
};
// this candy (not just its kind): a toffee only counts while it can still reach the wrapper (on the wrapper's belt, not
// rushed through); anywhere else it is on its way back to the machine
function conveyorCandyUseful(st, c) {
  if (c.kind === 'toffee') return !!(st.wrap && c.st === 'belt' && c.belt === st.wrap.belt && !c.wrapSeen) && conveyorUseful(st, 'toffee');
  return conveyorUseful(st, c.kind);
}
function conveyorPickKind(st, ch) {
  // recycled candy comes back first
  for (let i = 0; i < st.recycleQ.length; i++) {
    const q = st.recycleQ[i];
    if (q.t <= 0 && (ch.mix.includes(q.kind) || (q.kind === 'gift' && ch.mix.includes('toffee')))) { st.recycleQ.splice(i, 1); return { kind: q.kind, back: true }; }
  }
  const onScreen = {};
  for (const c of st.candies) if (c.st !== 'gone') onScreen[c.kind] = (onScreen[c.kind] || 0) + 1;
  const ws = ch.mix.map(kd => {
    const use = conveyorUseful(st, kd);
    if (st.gold.candy && !use) return 0;
    let w = use ? 3 : 0.7;
    const left = kd === 'toffee' ? (st.order.gift ? st.order.gift.need - st.order.gift.got : 0) : st.order[kd] ? st.order[kd].need - st.order[kd].got : 0;
    w /= 1 + Math.max(0, (onScreen[kd] || 0) - Math.max(0, left - 1)) * 0.9;
    return w;
  });
  let tot = ws.reduce((a, b) => a + b, 0);
  if (tot <= 0) return { kind: ch.mix[Math.floor(Math.random() * ch.mix.length)] };
  let r = Math.random() * tot;
  for (let i = 0; i < ws.length; i++) { r -= ws[i]; if (r <= 0) return { kind: ch.mix[i] }; }
  return { kind: ch.mix[ch.mix.length - 1] };
}
function conveyorChutes(st, dt) {
  const C0 = CONVEYOR;
  for (const q of st.recycleQ) q.t -= dt;
  const live = st.candies.filter(c => c.st !== 'gone').length;
  for (const ch of st.chutes) {
    ch.pop = Math.max(0, ch.pop - dt * 3);
    if (!ch.next) ch.next = conveyorPickKind(st, ch);
    const b = ch.belt;
    if (!b.spd) { ch.waitT += dt; continue; }
    ch.waitT = 0;
    ch.t -= dt * (st.gold.candy ? 1.25 : 1);
    if (ch.t > 0) continue;
    const crowded = live >= C0.cap || st.candies.some(c => (c.st === 'belt' && c.belt === b && Math.abs(c.x - ch.x) < 36) || (c.st === 'air' && Math.abs(c.x - ch.x) < 30 && c.y < b.y));
    if (crowded) {
      ch.t = 0.25;
      if (live >= C0.cap) {
        let old = null;
        for (const c of st.candies) if ((c.st === 'rest' || (c.st === 'belt' && !c.belt.spd)) && c.t > C0.crowdPoof && !conveyorCandyUseful(st, c) && (!old || c.t > old.t)) old = c;
        if (old) conveyorRecycle(st, old, 'poof');
      }
      continue;
    }
    const nx = ch.next;
    ch.next = null; ch.t = ch.every * (0.85 + Math.random() * 0.3); ch.pop = 1;
    const c = { id: st.nextId++, kind: nx.kind, x: ch.x, y: b.y - 62, vx: 0, vy: 40, st: 'air', belt: null, surf: null, rot: 0, spin: 0, t: 0, age: 0, noGrab: 0, back: !!nx.back };
    st.candies.push(c);
    Sfx.play('conveyorPlop');
    if (nx.back) conveyorPop(st, ch.x, b.y - 92, 'Back again!', '#bff5d6', 15);
  }
}
function conveyorCandies(st, dt) {
  const C0 = CONVEYOR, R = C0.candyR;
  // belts first: front candy moves, the ones behind keep a gap (they bunch up at a wall)
  for (const b of st.belts) {
    if (!b.v) continue;
    const d = Math.sign(b.v);
    const on = st.candies.filter(c => c.st === 'belt' && c.belt === b).sort((a, c) => (c.x - a.x) * d);
    let lim = null;
    for (const c of on) {
      let nx = c.x + b.v * dt;
      const wallEnd = d > 0 ? b.ends[1] === 'wall' : b.ends[0] === 'wall';
      if (lim == null && wallEnd) lim = d > 0 ? b.x1 - R - 2 : b.x0 + R + 2;
      if (lim != null && (nx - lim) * d > 0) nx = (c.x - lim) * d > 0 ? c.x - d * Math.min(40 * dt, (c.x - lim) * d) : lim;
      c.x = nx;
      lim = c.x - d * C0.gap;
    }
  }
  for (const c of st.candies) {
    if (c.st === 'gone' || c.st === 'held') continue;
    c.t += dt; c.noGrab = Math.max(0, c.noGrab - dt); c.noBin = Math.max(0, (c.noBin || 0) - dt);
    // an unwrapped toffee that can't reach the wrapper any more (dropped, tossed, fallen off, rushed through) settles
    // for a moment, then goes back to the machine to come round again ("Back to the wrapper!")
    if (c.kind === 'toffee' && c.st !== 'air' && !(st.wrap && c.st === 'belt' && c.belt === st.wrap.belt && !c.wrapSeen)) {
      c.backT = (c.backT || 0) + dt;
      if (c.backT > C0.toffeeBack) { conveyorRecycle(st, c, 'toffee'); continue; }
    } else c.backT = 0;
    if (c.st === 'belt') {
      const b = c.belt;
      c.y = b.y - R;
      c.rot = 0;
      // the wrapping machine
      if (st.wrap && st.wrap.belt === b) conveyorWrapCheck(st, c, dt);
      // the trapdoor
      if (b.trap && b.trap.open && c.x > b.trap.x0 + 4 && c.x < b.trap.x1 - 4) { c.st = 'air'; c.vx = b.v * 0.3; c.vy = 30; c.belt = null; c.inWrap = false; continue; }
      // the ends
      if (c.x > b.x1 || c.x < b.x0) {
        const side = c.x > b.x1 ? 1 : 0, end = b.ends[side];
        if (end === 'mouth') { if (b.trap && conveyorCandyUseful(st, c) && c.kind !== 'toffee') st.room.missedTrap++; conveyorRecycle(st, c, 'mouth'); continue; }
        if (end === 'wall') { c.x = side ? b.x1 - R : b.x0 + R; continue; }
        c.st = 'air'; c.vx = b.v; c.vy = 0; c.belt = null; c.inWrap = false;
      }
      continue;
    }
    if (c.st === 'rest') {
      if (c.surf === 'lift' && st.lift) {
        c.y = st.lift.y - R;
        if (c.x < st.lift.x0 + 4 || c.x > st.lift.x1 - 4) { c.st = 'air'; c.vy = 0; c.vx = 0; c.surf = null; }
      } else {
        c.age += dt;
        if (c.age > C0.floorPoof) { conveyorRecycle(st, c, 'poof'); continue; }
      }
      continue;
    }
    // flying
    const y0 = c.y;
    c.vy = Math.min(c.vy + C0.candyG * dt, 900);
    c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.spin * dt;
    if (c.x < R) { c.x = R; c.vx = Math.abs(c.vx) * 0.4; } else if (c.x > W - R) { c.x = W - R; c.vx = -Math.abs(c.vx) * 0.4; }
    if (c.y - R < C0.ceilY) { c.y = C0.ceilY + R; c.vy = Math.abs(c.vy) * 0.3; }
    if (c.vy <= 0) continue;
    // into a bin?
    if (!c.noBin) {
      let hit = null;
      for (const bn of st.bins) { const my = bn.y - bn.h; if (y0 <= my && c.y >= my && Math.abs(c.x - bn.x) < bn.w / 2 - 4) { hit = bn; break; } }
      if (hit) { conveyorBinHit(st, c, hit); continue; }
    }
    // landing: the highest surface crossed this step
    let land = null, top = 1e9;
    const cross = (x0, x1, y, what) => { if (c.x > x0 && c.x < x1 && y0 + R <= y + 0.5 && c.y + R >= y && y < top) { top = y; land = what; } };
    for (const b of st.belts) {
      if (b.trap && b.trap.open && c.x > b.trap.x0 && c.x < b.trap.x1) continue;
      cross(b.x0, b.x1, b.y, b);
    }
    for (const s of st.shelves) cross(s.x0, s.x1, s.y, 'shelf');
    if (st.lift) cross(st.lift.x0, st.lift.x1, st.lift.y, 'lift');
    cross(-10, W + 10, C0.floorY, 'floor');
    if (!land) continue;
    c.y = top - R; c.rot = 0; c.spin = 0;
    if (land === 'floor' || land === 'shelf') {
      const gr = land === 'floor' && st.grates.find(gt => c.x > gt.x0 && c.x < gt.x1);
      if (gr) { gr.flash = 1; conveyorRecycle(st, c, 'grate'); continue; }
      if (c.vy > 300) { c.vy = -c.vy * 0.28; c.y = top - R - 1; Sfx.play('conveyorTap'); continue; }
      c.st = 'rest'; c.surf = land; c.vx = 0; c.vy = 0; c.age = 0;
    } else if (land === 'lift') { c.st = 'rest'; c.surf = 'lift'; c.vx = 0; c.vy = 0; c.age = 0; Sfx.play('conveyorTap'); }
    else {
      c.st = 'belt'; c.belt = land; c.vx = 0; c.vy = 0; Sfx.play('conveyorTap');
      // (never right on top of another candy: slide over to the nearest free spot on the belt)
      for (let tries = 0; tries < 8; tries++) {
        const o = st.candies.find(q => q !== c && q.st === 'belt' && q.belt === land && Math.abs(q.x - c.x) < C0.gap - 3);
        if (!o) break;
        let nx = o.x + (c.x >= o.x ? 1 : -1) * C0.gap;
        if (nx > land.x1 - R || nx < land.x0 + R) nx = o.x - (c.x >= o.x ? 1 : -1) * C0.gap;
        c.x = clamp(nx, land.x0 + R, land.x1 - R);
      }
    }
  }
  st.candies = st.candies.filter(c => c.st !== 'gone');
}
function conveyorWrapCheck(st, c, dt) {
  const w = st.wrap, b = w.belt;
  c.inWrap = c.x > w.x0 + 6 && c.x < w.x1 - 6;
  if (c.kind !== 'toffee' || c.wrapSeen) return;
  if (Math.abs(c.x - w.x) > 8) return;
  if (b.spd === 1 || (st.gold.wrap && b.spd > 0)) {
    c.kind = 'gift'; c.wrapSeen = true;
    w.puff = 1; st.stats.wrapped++;
    Sfx.play('conveyorWrap');
    conveyorPop(st, w.x, b.y - 74, 'Wrapped!', '#bfe4ff', 20);
    for (let i = 0; i < 12; i++) conveyorPart(st, w.x + (Math.random() - 0.5) * 50, b.y - 40, (Math.random() - 0.5) * 160, -60 - Math.random() * 120, 0.8, i % 2 ? C.gold : '#4fb6ff', 3, 300, 'conf');
  } else if (b.spd === 2) {
    c.wrapSeen = true; st.room.wrapMiss++;
    conveyorPop(st, w.x, b.y - 74, 'Too fast to wrap!', '#ffe0b0', 16);
    Sfx.play('conveyorNope');
    conveyorHint(st, st.op, 'The wrapper only wraps on SLOW', 3);
  }
  void dt;
}
function conveyorBinHit(st, c, bn) {
  const C0 = CONVEYOR, info = CONVEYOR_KINDS[c.kind], by = c.by == null ? st.sorter : c.by;
  if (bn.kind === c.kind) {
    c.st = 'gone';
    bn.yum = 1; bn.shake = 0.5;
    const o = st.order[c.kind];
    if (o && o.got < o.need) { o.got++; o.pop = 1; st.stats.sorted[by]++; }
    else st.stats.extras++;
    st.lastSortT = st.roomT;
    const words = ['Yum!', 'Sweet!', 'Tasty!', 'Yummy!', 'Delish!'];
    conveyorPop(st, bn.x, bn.y - bn.h - 26, words[st.stats.sorted[0] + st.stats.sorted[1] + st.stats.extras + st.k * 3 & 3], info.col, 24);
    Sfx.play('conveyorYum');
    for (let i = 0; i < 14; i++) { const a = -Math.PI * (0.15 + 0.7 * Math.random()); conveyorPart(st, bn.x, bn.y - bn.h, Math.cos(a) * 160, Math.sin(a) * 200, 0.8, i % 3 ? info.col : C.gold, 3 + Math.random() * 2, 420, i % 2 ? 'conf' : 'spark'); }
    rumble(by, 0, 0.3, 80);
    return;
  }
  // wrong bin: it pops back out
  c.st = 'air'; c.noBin = 0.6; c.noGrab = 0.2;
  c.vy = -380; c.vx = (bn.x < W / 2 ? 1 : -1) * (110 + Math.random() * 50); c.y = bn.y - bn.h - 2; c.spin = 9;
  bn.blech = 1; bn.shake = 1;
  const wrap = bn.kind === 'gift' && c.kind === 'toffee';
  // (a toffee in the gift box is a lesson, not a Blech: it goes back to the wrapper)
  if (!wrap) { st.stats.blechs++; st.room.blechs++; }
  conveyorPop(st, bn.x, bn.y - bn.h - 30, wrap ? 'Wrap it first!' : 'Blech! Wrong flavour!', '#e8ffb0', wrap ? 20 : 19);
  Sfx.play('conveyorBlech');
  if (!conveyorQuiet(by)) conveyorHint(st, by, wrap ? 'Toffees need wrapping first' : 'That goes in the ' + CONVEYOR_KINDS[c.kind].bin + ' bin!', 2.8);
  void C0;
}
function conveyorRecycle(st, c, how) {
  c.st = 'gone';
  if (st.held === c) st.held = null;
  st.recycleQ.push({ kind: c.kind, t: CONVEYOR.recycleBack });
  st.stats.recycled++;
  if (how !== 'toffee' && conveyorUseful(st, c.kind)) st.room.recycled++;
  const y = how === 'mouth' ? c.y - 20 : how === 'poof' || how === 'toffee' ? c.y - 24 : CONVEYOR.floorY - 28;
  conveyorPop(st, c.x, y, how === 'poof' ? 'Poof! Back to the machine' : how === 'toffee' ? 'Back to the wrapper!' : 'Recycled!', '#bff5d6', how === 'poof' ? 13 : 15);
  Sfx.play('conveyorRecycle');
  for (let i = 0; i < 8; i++) conveyorPart(st, c.x + (Math.random() - 0.5) * 20, c.y, (Math.random() - 0.5) * 80, -40 - Math.random() * 80, 0.6, '#9ff0c0', 3, 200, 'dot');
}

/* ---------- the room is done: the order is filled ---------- */
function conveyorRoomDone(st) {
  const last = G.level.def.roomIndex >= G.level.def.roomCount - 1;
  st.stats.roomT[st.k] = st.roomT;
  if (st.held) { st.held.st = 'gone'; st.held = null; }
  for (const b of st.belts) b.spd = 0;
  if (st.trap) st.trap.openT = 0;
  st.phase = last ? 'final' : 'done'; st.phaseT = 0;
  Sfx.play(last ? 'conveyorFinale' : 'conveyorOrder'); rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250);
  if (last) st.boss = { t: 0 };
  for (let i = 0; i < 40; i++) confetti(W / 2 + (Math.random() - 0.5) * 300, 200);
}
function conveyorSettle(st, dt) {
  // nobody steers during the celebration; they just land
  for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; for (const k in p.input) p.input[k] = false; }
  conveyorMove(st, G.players[st.op], dt, true);
  conveyorMove(st, G.players[st.sorter], dt, false);
  for (const b of st.belts) b.v = 0;
  conveyorCandies(st, dt);
}
function conveyorDoneStep(st, dt) {
  conveyorSettle(st, dt);
  if (st.phaseT > 0.9 && !st.hopped) { st.hopped = true; for (const p of G.players) if (p.grounded) { jump(p, 520); } }
  if (st.phaseT >= CONVEYOR.doneT) { st.hopped = false; nextRoom(); return true; }
  return false;
}
function conveyorFinalStep(st, dt) {
  conveyorSettle(st, dt);
  const b = st.boss;
  b.t += dt;
  if (b.t > 1.0 && !b.said) { b.said = true; Sfx.play('conveyorBoss'); }
  // confetti cannons from both sides, and Pip and Bo hop for joy
  if (b.t > 1.2 && b.t < 4.6 && Math.floor(b.t * 6) !== Math.floor((b.t - dt) * 6)) { confetti(40, 300); confetti(W - 40, 300); }
  if (b.t > 1.4 && Math.floor(b.t / 0.9) !== Math.floor((b.t - dt) / 0.9)) for (const p of G.players) if (p.grounded) jump(p, 470);
  if (b.t >= CONVEYOR.finalT && !b.cleared) {
    b.cleared = true;
    G.level.goal = { x: W / 2, y: 200 };
    levelClear();
    return true;
  }
  return false;
}

/* ---------- gold help (always announced) ---------- */
function conveyorHelp(st, dt) {
  const C0 = CONVEYOR, S = NAMES[st.sorter], g = st.gold;
  const active = id => G.time - st.inT[id] < 6;
  if (!g.grab && st.room.recycled >= C0.helpRecycled && active(st.sorter)) { g.grab = true; conveyorGoldMsg(st, 'Gold grabber! ' + S + ' can grab candy from fast belts now'); }
  if (!g.labels && st.room.blechs >= C0.helpBlechs) { g.labels = true; conveyorGoldMsg(st, 'Gold labels! The right bin lights up for the candy you hold'); }
  if (!g.candy && st.roomT > C0.helpRoomT && st.roomT - st.lastSortT > C0.helpNoSortT && active(0) && active(1)) { g.candy = true; conveyorGoldMsg(st, 'Gold candy! The machine sends just what the order needs'); }
  if (!g.trap && st.trap && st.room.missedTrap >= C0.helpTrapRecycled && active(st.op)) { g.trap = true; st.trap.goldPending = true; conveyorGoldMsg(st, 'Gold trapdoor! It\'s wider and stays open longer'); }
  if (!g.wrap && st.wrap && st.room.wrapMiss >= C0.helpWrapMiss) { g.wrap = true; conveyorGoldMsg(st, 'Gold wrapper! It wraps toffees at any speed now'); }
  st.tooFastT = Math.max(0, st.tooFastT - dt);
  for (const bn of st.bins) { bn.glow = Math.max(0, bn.glow - dt * 3); bn.yum = Math.max(0, bn.yum - dt * 1.5); bn.blech = Math.max(0, bn.blech - dt * 1.5); bn.shake = Math.max(0, bn.shake - dt * 2.5); }
  if (g.labels && st.held) for (const bn of st.bins) if (bn.kind === st.held.kind) bn.glow = 1;
}
function conveyorGoldMsg(st, text) { st.stats.helps++; conveyorMsg(st, text, C.gold, 4.2); Sfx.play('conveyorGold'); }

/* ---------- what each job needs right now (the prompts and the job cards read this) ---------- */
function conveyorBinFor(st, kind) { return st.bins.find(b => b.kind === kind) || null; }
function conveyorNeeds(st) {
  const out = { sorter: null, op: null, opStation: null, opText: '', binTarget: null, candy: null };
  if (!st.belts || st.phase !== 'play') return out;
  const ps = G.players, S = ps[st.sorter], O = ps[st.op], lf = st.lift, scx = S.x + S.w / 2, sfeet = S.y + S.h;
  const high = sfeet < CONVEYOR.floorY - 150;
  // the sorter
  if (st.held) {
    const kind = st.held.kind, bin = conveyorBinFor(st, kind);
    if (!bin || kind === 'toffee') out.sorter = kind === 'toffee' ? 'unwrapped' : 'nobin';
    else {
      out.binTarget = bin;
      const tgt = conveyorTossTarget(st, S);
      if (tgt === bin) out.sorter = 'toss';
      else if (bin.high && !high) out.sorter = lf && S.onLift ? 'rideUp' : 'toLift';
      else if (!bin.high && high) out.sorter = lf && S.onLift ? 'rideDown' : 'getDown';
      else out.sorter = 'toBin';
    }
  } else {
    const r = conveyorInReach(st, S);
    if (r.best) { out.sorter = 'grab'; out.candy = r.best; }
    else if (r.fast) { out.sorter = 'tooFast'; out.candy = r.fast; }
    else out.sorter = 'find';
  }
  // the operator
  const station = s => st.stations.find(q => q.ref === s) || null;
  const usefulOn = b => st.candies.filter(c => c.st === 'belt' && c.belt === b && conveyorCandyUseful(st, c));
  const set = (what, ref, text) => {
    // (a belt that was just flipped isn't asked to flip straight back: no flip-flopping prompts)
    if (what === 'flip' && ref.flipT != null && st.roomT - ref.flipT < 3) return;
    if (!out.op) { out.op = what; out.opStation = station(ref); out.opText = text; }
  };
  const chuteBelts = st.chutes.map(c => c.belt);
  if (lf) {
    const holdHigh = st.held && conveyorBinFor(st, st.held.kind) && conveyorBinFor(st, st.held.kind).high;
    if (S.onLift && lf.target === lf.lo && Math.abs(lf.y - lf.lo) < 2 && holdHigh) set('liftUp', lf, 'Lift up!');
    if (lf.blocked) out.sorter = 'jumpLift';
    if (S.onLift && Math.abs(lf.y - lf.hi) < 2 && !holdHigh && st.phaseT > 0) set('liftDown', lf, 'Lift down!');
    // the sorter is waiting by the shaft with a candy for the high shelf and the lift is up: bring it down for them
    if (holdHigh && !high && !S.onLift && lf.target !== lf.lo && Math.abs(scx - (lf.x0 + lf.x1) / 2) < 160) set('liftDown', lf, 'Lift down for ' + NAMES[st.sorter] + '!');
    const liftCandy = st.candies.some(c => c.st === 'rest' && c.surf === 'lift' && conveyorCandyUseful(st, c));
    if (liftCandy && Math.abs(lf.y - lf.hi) < 2 && !high) set('liftDown', lf, 'Bring the candy down!');
  }
  if (st.tooFastT > 0 && st.tooFastBelt && st.tooFastBelt.spd === 2) set('slow', st.tooFastBelt, 'Slow ' + st.tooFastBelt.name + ' down!');
  if (out.sorter === 'tooFast' && out.candy.belt) set('slow', out.candy.belt, 'Slow ' + out.candy.belt.name + ' down!');
  if (st.wrap && st.wrap.belt.spd === 2 && !st.gold.wrap && st.candies.some(c => c.st === 'belt' && c.belt === st.wrap.belt && c.kind === 'toffee' && !c.wrapSeen && conveyorUseful(st, 'toffee')))
    set('slow', st.wrap.belt, 'Slow down to wrap!');
  // a toffee riding away from the wrapper (or waiting on a stopped belt when only gifts are left): send it through
  if (st.wrap && conveyorUseful(st, 'toffee')) {
    const wb = st.wrap.belt, d = Math.sign(wb.v);
    const tof = st.candies.filter(c => c.st === 'belt' && c.belt === wb && c.kind === 'toffee' && !c.wrapSeen);
    const onlyGifts = st.orderKeys.every(kd => kd === 'gift' || st.order[kd].got >= st.order[kd].need);
    const ch = st.chutes.find(q => q.belt === wb), toWrap = ch ? Math.sign(st.wrap.x - ch.x) : 0;
    if (wb.spd && (tof.some(c => (st.wrap.x - c.x) * d < -10) || (onlyGifts && toWrap && d !== toWrap))) set('flip', wb, 'Flip it to the wrapper!');
    else if (!wb.spd && onlyGifts) set('start', wb, 'Run the toffees through the wrapper!');
  }
  if (st.trap) {
    const tp = st.trap, b = tp.belt;
    if (!tp.open && b.spd) for (const c of usefulOn(b)) {
      if (c.kind === 'toffee') continue;
      const ahead = (c.x - (tp.x0 + tp.x1) / 2) * -Math.sign(b.v);
      if (ahead > -20 && ahead < 70) { set('trap', tp, 'Open the trapdoor!'); break; }
    }
    // (good candy on its way: go and stand ready at the trapdoor lever)
    if (!tp.open && b.spd && !out.op && usefulOn(b).some(c => { if (c.kind === 'toffee') return false; const a = (c.x - (tp.x0 + tp.x1) / 2) * -Math.sign(b.v); return a >= 70 && a < 260; })) set('trapReady', tp, 'Get ready to open it!');
  }
  if (!chuteBelts.some(b => b.spd > 0) && !st.candies.some(c => c.st !== 'held' && conveyorCandyUseful(st, c))) set('start', chuteBelts[0], 'Start ' + chuteBelts[0].name + '!');
  // candy piling up against a wall end (out of the sorter's reach, or blocking the chute): flip it back
  for (const b of st.belts) {
    if (!b.spd || out.op) continue;
    const d = Math.sign(b.v), wallX = d > 0 ? b.x1 : b.x0;
    if (b.ends[d > 0 ? 1 : 0] !== 'wall') continue;
    const pile = st.candies.filter(c => c.st === 'belt' && c.belt === b && Math.abs(c.x - wallX) < 16 + CONVEYOR.gap * 2);
    if (pile.length >= 3 || (b.y < 300 && pile.some(c => Math.abs(c.x - wallX) < 18 && conveyorCandyUseful(st, c)))) set('flip', b, 'Flip ' + b.name + '!');
  }
  // a useful candy heading off a belt end while the sorter is far away
  for (const b of st.belts) {
    if (!b.spd || out.op) continue;
    const d = Math.sign(b.v), endX = d > 0 ? b.x1 : b.x0, end = b.ends[d > 0 ? 1 : 0];
    if (end === 'wall') continue;
    for (const c of usefulOn(b)) {
      if (c.kind === 'toffee' && st.wrap && st.wrap.belt === b && (st.wrap.x - c.x) * d > 0) continue;
      const toEnd = (endX - c.x) * d;
      // (falling onto the lower belt, or into the lift when it waits at the top, is fine)
      const fine = st.belts.some(o => o !== b && o.y > b.y && endX + d * 20 > o.x0 && endX + d * 20 < o.x1) || (lf && endX + d * 30 > lf.x0 && endX + d * 30 < lf.x1 && Math.abs(lf.y - lf.hi) < 2 && lf.target === lf.hi);
      if (fine) continue;
      if (toEnd < 130 && Math.abs(c.x - scx) > 110) { set('flip', b, 'Flip ' + b.name + '!'); break; }
    }
  }
  void O;
  return out;
}
// gentle lessons, once, when they first matter
function conveyorNudges(st, dt) {
  const ps = G.players, S = ps[st.sorter];
  if (st.k === 0 && st.roomT > 1.2 && !st.hinted.start && !st.belts.some(b => b.spd)) { st.hinted.start = true; conveyorHint(st, st.op, 'Walk to the lever, ' + conveyorKey(st.op, 'up') + ' starts the belt', 3.4); }
  // (and it goes away as soon as a belt runs)
  if (st.hinted.start && st.hints[st.op] && /starts the belt$/.test(st.hints[st.op].text) && st.belts.some(b => b.spd)) st.hints[st.op] = null;
  if (st.held && !st.hinted.toss && st.k === 0) { st.hinted.toss = true; conveyorHint(st, st.sorter, 'Take it to its bin, then ' + conveyorKey(st.sorter, 'act') + ' to toss', 3.2); }
  void S; void dt;
}

/* ---------- small helpers ---------- */
function conveyorHint(st, id, text, life) { if (conveyorQuiet(id)) return; st.hints[id] = { text, t: 0, life: life || CONVEYOR.hintLife }; }
function conveyorMsg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
// key (optional): a new pop replaces the last one with the same key (a belt's lever words never pile up)
function conveyorPop(st, x, y, s, col, size, key) {
  if (key) st.pops = st.pops.filter(q => q.key !== key);
  st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0, key }); if (st.pops.length > 12) st.pops.shift(); }
function conveyorPart(st, x, y, vx, vy, life, col, size, grav, kind) {
  if (st.parts.length > 260) st.parts.shift();
  st.parts.push({ x, y, vx, vy, life, max: life, col, size, grav: grav || 0, kind: kind || 'dot', r: Math.random() * 6 });
}
function conveyorSpark(st, x, y, col, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 50 + Math.random() * 110; conveyorPart(st, x, y, Math.cos(a) * s, Math.sin(a) * s, 0.45, col, 2.5 + Math.random() * 2, 0, 'spark'); } }
function conveyorFx(st, dt) {
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const q = st.parts[i];
    if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
    q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 6;
  }
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.4);
  for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
  for (const s of st.stations) { s.flash = Math.max(0, s.flash - dt * 2.5); const want = s.kind === 'belt' ? s.ref.dir * (0.4 + 0.3 * s.ref.spd) : s.kind === 'lift' ? (s.ref.target === s.ref.hi ? -0.8 : 0.8) : (s.ref.open ? 0.9 : -0.3); s.lever = approach(s.lever, want, dt * 6); }
  for (const g of st.grates) g.flash = Math.max(0, g.flash - dt * 2);
  for (const kd of st.orderKeys) st.order[kd].pop = Math.max(0, st.order[kd].pop - dt * 2);
  if (st.wrap) { st.wrap.puff = Math.max(0, st.wrap.puff - dt * 1.5); st.wrap.spin += dt * (st.wrap.belt.v ? 4 : 0.5); }
}
// the touch buttons and the top-bar legend name each player's own action this room: the sorter grabs, the operator works levers
let conveyorLabelEls = null;
function conveyorActLabels(st) {
  try {
    if (!conveyorLabelEls || !conveyorLabelEls.every(o => document.contains(o.el))) conveyorLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.dataset.legp !== undefined ? +box.dataset.legp : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
      return { el, id };
    });
    let changed = false;
    for (const o of conveyorLabelEls) {
      const want = o.id < 0 ? 'grab/lever' : o.id === st.sorter ? 'grab' : 'lever';
      if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
    }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}

MODES.conveyor = {
  // medal (js/medals.js): two computers about 2:40 with no Blechs; noisy computer pairs 3:20-4:00; a parent and a kid take longer and mix up a few bins
  medals: { bronze: 'Send out every order', goals: [{ key: 'time', gold: 240, silver: 420 }, { key: 'blechs', gold: 3, silver: 8, text: n => (n === 1 ? '1 or fewer Blechs' : `${n} or fewer Blechs`),
    gap: (v, n) => { const d = Math.max(1, Math.ceil(v - n)); return d + (d === 1 ? ' fewer Blech' : ' fewer Blechs'); } }] },
  medalValues() { const s = G.mst.stats; return s ? { blechs: s.blechs } : {}; },
  CONVEYOR, KINDS: CONVEYOR_KINDS,
  needs: conveyorNeeds, useful: conveyorUseful, candyUseful: conveyorCandyUseful, binFor: conveyorBinFor, inReach: conveyorInReach, tossTarget: conveyorTossTarget,
  stationAt: conveyorStationAt, canGrab: conveyorCanGrab, key: conveyorKey,
  setup(st, L) {
    st.stats = { sorted: [0, 0], grabs: [0, 0], tosses: [0, 0], flips: [0, 0], speeds: [0, 0], lifts: [0, 0], traps: [0, 0], blechs: 0, recycled: 0, extras: 0, wrapped: 0, helps: 0, beltT: 0, roomT: [], roomTitles: [] };
    const def = LEVELS[G.levelIndex];
    st.total = (def.rooms || [def]).reduce((n, r) => n + Object.values(r.order || {}).reduce((a, b) => a + b, 0), 0);
    conveyorRoom(st, L, 0);
  },
  room(k, L) { conveyorRoom(G.mst, L, k); },
  step(dt) { conveyorStep(G.mst, dt); },
  draw() { const st = G.mst; if (st.belts) conveyorDraw(st); },
  drawTop() { const st = G.mst; if (st.belts) conveyorDrawTop(st); },
  hud() { const st = G.mst; if (st.belts) conveyorHud(st); },
  stats() {
    const st = G.mst, s = st.stats;
    if (!s) return [];
    const b = s.blechs;
    const out = [
      { label: 'Candy sorted', values: s.sorted.slice() },
      { label: 'Blechs!', value: b },
      { label: 'Recycled', value: s.recycled },
    ];
    const words = b === 0 ? 'Not one wrong flavour! Boss Bonbon is over the moon!' : b <= 3 ? 'Sweet sorting, candy crew!' : 'A few Blechs, but every order went out!';
    out.push(words + ' Lever pulls: Pip ' + (s.flips[0] + s.speeds[0] + s.lifts[0] + s.traps[0]) + ', Bo ' + (s.flips[1] + s.speeds[1] + s.lifts[1] + s.traps[1]) + (s.wrapped ? ' · Toffees wrapped: ' + s.wrapped : '') + '.');
    if (s.helps) out.push('Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!');
    return out;
  },
};
MODES.conveyor.test = { conveyorRoom, conveyorGrab, conveyorToss, conveyorRecycle, conveyorPickKind, conveyorRoomDone };

/* ===================================== drawing ===================================== */
// a candy (shape AND colour, so every kind reads without colour too), centred on x, y; s = scale
function conveyorDrawCandy(kind, x, y, s, rot) {
  const k = CONVEYOR_KINDS[kind] || CONVEYOR_KINDS.lolly;
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(s, s);
  ctx.lineWidth = 2; ctx.strokeStyle = k.dark; ctx.lineJoin = 'round';
  if (kind === 'lolly') {
    ctx.fillStyle = '#fff8f0'; ctx.fillRect(-1.6, 3, 3.2, 12); ctx.strokeRect(-1.6, 3, 3.2, 12);
    ctx.fillStyle = k.col; circle(0, -2, 9.5); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff3f7'; ctx.lineWidth = 2; ctx.beginPath();
    for (let a = 0; a < Math.PI * 5; a += 0.3) { const r = a * 0.55; ctx.lineTo(Math.cos(a) * r, -2 + Math.sin(a) * r); }
    ctx.stroke();
  } else if (kind === 'gum') {
    ctx.fillStyle = k.col; ctx.beginPath(); ctx.moveTo(-11, 9);
    ctx.bezierCurveTo(-12, -4, -6, -11, 0, -11); ctx.bezierCurveTo(6, -11, 12, -4, 11, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [dx, dy] of [[-5, -3], [2, -6], [5, 2], [-2, 4], [-7, 5], [7, -3]]) ctx.fillRect(dx - 0.9, dy - 0.9, 1.8, 1.8);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(-4, -5, 2.5, 4, -0.5, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'choc') {
    ctx.fillStyle = k.col; rr(-12, -8, 24, 16, 2.5); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#b07a52'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-4, -7); ctx.lineTo(-4, 7); ctx.moveTo(4, -7); ctx.lineTo(4, 7); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.stroke();
    ctx.fillStyle = '#e8e2f0'; ctx.fillRect(6, -8.5, 6.5, 17); ctx.strokeStyle = k.dark; ctx.lineWidth = 1.2; ctx.strokeRect(6, -8.5, 6.5, 17);
  } else if (kind === 'toffee') {
    ctx.fillStyle = '#ffe2a8';
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 6, 0); ctx.lineTo(sx * 14, -7); ctx.lineTo(sx * 13, 0); ctx.lineTo(sx * 14, 7); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = k.col; ctx.beginPath(); ctx.ellipse(0, 0, 8.5, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-3, -3, 3, 1.6, -0.4, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'gift') {
    ctx.fillStyle = k.col; rr(-11, -8, 22, 18, 2.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.gold; ctx.fillRect(-2.2, -8, 4.4, 18); ctx.fillRect(-11, -1, 22, 4);
    ctx.strokeStyle = '#b9850f'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(-4.5, -11, 4.5, 3, -0.4, 0, Math.PI * 2); ctx.fillStyle = C.gold; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(4.5, -11, 4.5, 3, 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
let conveyorBack = null;
function conveyorPaintBack(c, st) {
  const C0 = CONVEYOR, cw = c;
  // the factory wall: soft pink with candy stripes
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#ffc6de'); g.addColorStop(1, '#ffe4ef');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(255,255,255,0.35)';
  for (let x = 0; x < W; x += 60) c.fillRect(x, C0.ceilY, 22, C0.floorY - C0.ceilY);
  // round windows with candy land outside: cotton candy clouds and lollipop trees
  for (const [wx, wy] of [[110, 300], [480, 205], [850, 300]]) {
    if (st.belts.some(b => wy + 50 > b.y - 6 && wy - 50 < b.y + 30 && wx + 50 > b.x0 && wx - 50 < b.x1)) continue;
    c.save(); c.beginPath(); c.arc(wx, wy, 44, 0, Math.PI * 2); c.clip();
    const sg = c.createLinearGradient(0, wy - 44, 0, wy + 44); sg.addColorStop(0, '#ff9ccf'); sg.addColorStop(1, '#fff0d6');
    c.fillStyle = sg; c.fillRect(wx - 44, wy - 44, 88, 88);
    c.fillStyle = '#e48fc4'; c.beginPath(); c.moveTo(wx - 50, wy + 50); for (let x = -50; x <= 50; x += 10) c.lineTo(wx + x, wy + 22 + Math.sin(x / 13 + wx) * 6); c.lineTo(wx + 50, wy + 50); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.9)'; for (const [cx, cy, r] of [[-20, -18, 9], [-10, -22, 11], [2, -18, 8], [18, -6, 7]]) { c.beginPath(); c.arc(wx + cx, wy + cy, r, 0, Math.PI * 2); c.fill(); }
    for (const [tx, col] of [[-16, '#ff5c8a'], [14, '#7fd8ff']]) { c.fillStyle = '#fff'; c.fillRect(wx + tx - 1.5, wy + 2, 3, 22); c.fillStyle = col; c.beginPath(); c.arc(wx + tx, wy + 2, 8, 0, Math.PI * 2); c.fill(); }
    c.restore();
    c.lineWidth = 7; c.strokeStyle = '#d96aa3'; c.beginPath(); c.arc(wx, wy, 44, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 2; c.strokeStyle = '#ffd6ea'; c.beginPath(); c.arc(wx, wy, 47, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(217,106,163,0.6)'; c.lineWidth = 3; c.beginPath(); c.moveTo(wx - 44, wy); c.lineTo(wx + 44, wy); c.moveTo(wx, wy - 44); c.lineTo(wx, wy + 44); c.stroke();
  }
  // the control deck behind the catwalk: a darker rose wall with pipes and gauges
  const g2 = c.createLinearGradient(0, 0, 0, C0.catwalkY);
  g2.addColorStop(0, '#d9609d'); g2.addColorStop(1, '#f28dbe');
  c.fillStyle = g2; c.fillRect(0, 0, W, C0.catwalkY);
  for (let x = 0; x < W; x += 40) { c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(x, 0, 18, C0.catwalkY); }
  // pipes along the top in candy colours
  for (const [py, col, dk] of [[16, '#7fd8ff', '#3b8fc0'], [30, '#ffe066', '#c9971a']]) {
    c.fillStyle = col; c.fillRect(0, py, W, 9); c.fillStyle = dk; c.fillRect(0, py + 7, W, 2);
    for (let x = 70; x < W; x += 190) { c.fillStyle = dk; c.fillRect(x, py - 2, 8, 13); }
  }
  for (const gx of [70, 890]) {
    c.fillStyle = '#fff8fb'; c.beginPath(); c.arc(gx, 74, 15, 0, Math.PI * 2); c.fill();
    c.lineWidth = 3; c.strokeStyle = '#a8346a'; c.stroke();
    c.strokeStyle = '#ff5c8a'; c.lineWidth = 2; c.beginPath(); c.moveTo(gx, 74); c.lineTo(gx + 9, 66); c.stroke();
  }
  // the catwalk: mint grating with a railing
  c.fillStyle = '#7fe0c0'; c.fillRect(0, C0.catwalkY, W, 30);
  c.fillStyle = '#4fae8f'; c.fillRect(0, C0.catwalkY + 24, W, 6);
  c.fillStyle = 'rgba(30,90,70,0.35)'; for (let x = 4; x < W; x += 12) c.fillRect(x, C0.catwalkY + 6, 6, 14);
  c.fillStyle = '#ffffff'; c.fillRect(0, C0.catwalkY, W, 3);
  c.strokeStyle = '#2f8a6c'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, C0.catwalkY - 34); c.lineTo(W, C0.catwalkY - 34); c.stroke();
  for (let x = 15; x < W; x += 60) { c.beginPath(); c.moveTo(x, C0.catwalkY - 34); c.lineTo(x, C0.catwalkY); c.stroke(); }
  // a scalloped frosting trim under the catwalk
  c.fillStyle = '#fff4fa'; for (let x = 0; x < W; x += 20) { c.beginPath(); c.arc(x + 10, C0.ceilY, 10, 0, Math.PI); c.fill(); }
  // the factory floor: chocolate and cream checks, a candy-stripe edge
  for (let y = C0.floorY; y < H; y += 30) for (let x = 0; x < W; x += 30) {
    c.fillStyle = ((x + y) / 30) % 2 ? '#8f5a3e' : '#a46a4a'; c.fillRect(x, y, 30, 30);
    // each tile a little bevelled: lit top edge, shady bottom edge, a glossy fleck
    c.fillStyle = 'rgba(255,230,210,0.14)'; c.fillRect(x, y, 30, 2); c.fillRect(x, y, 2, 30);
    c.fillStyle = 'rgba(40,15,5,0.18)'; c.fillRect(x, y + 28, 30, 2); c.fillRect(x + 28, y, 2, 30);
    if (hash(x, y) % 4 === 0) { c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(x + 6, y + 6, 8, 2); }
  }
  // a soft shadow along the foot of the wall
  { const fg = c.createLinearGradient(0, C0.floorY - 26, 0, C0.floorY); fg.addColorStop(0, 'rgba(160,60,110,0)'); fg.addColorStop(1, 'rgba(160,60,110,0.18)'); c.fillStyle = fg; c.fillRect(0, C0.floorY - 26, W, 26); }
  for (let x = 0; x < W; x += 24) { c.fillStyle = (x / 24) % 2 ? '#ff6fa8' : '#ffffff'; c.fillRect(x, C0.floorY, 24, 7); }
  c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, C0.floorY + 7, W, 3);
  // shelves: candy-cane ledges
  for (const s of st.shelves) {
    c.fillStyle = '#fff'; c.fillRect(s.x0, s.y, s.x1 - s.x0, 30);
    c.save(); c.beginPath(); c.rect(s.x0, s.y, s.x1 - s.x0, 30); c.clip();
    c.fillStyle = '#ff4f86'; for (let x = s.x0 - 30; x < s.x1 + 30; x += 22) { c.beginPath(); c.moveTo(x, s.y + 30); c.lineTo(x + 11, s.y + 30); c.lineTo(x + 41, s.y); c.lineTo(x + 30, s.y); c.closePath(); c.fill(); }
    c.restore();
    c.strokeStyle = '#a8346a'; c.lineWidth = 2; c.strokeRect(s.x0 + 1, s.y + 1, s.x1 - s.x0 - 2, 28);
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(s.x0 + 3, s.y + 3, s.x1 - s.x0 - 6, 2);
    c.fillStyle = 'rgba(120,30,70,0.16)'; c.fillRect(s.x0 + 4, s.y + 30, s.x1 - s.x0 - 4, 8);
    // a little support post
    c.fillStyle = '#d96aa3'; c.fillRect(s.x1 - 22, s.y + 30, 10, C0.floorY - s.y - 30);
  }
  // the lift shaft: candy-cane rails and a pulley
  const lf = st.lift;
  if (lf) {
    for (const x of [lf.x0 - 6, lf.x1]) {
      c.fillStyle = '#fff'; c.fillRect(x, lf.hi - 40, 6, C0.floorY - lf.hi + 40);
      c.fillStyle = '#ff4f86'; for (let y = lf.hi - 40; y < C0.floorY; y += 16) c.fillRect(x, y, 6, 8);
    }
    c.fillStyle = '#c9971a'; c.beginPath(); c.arc((lf.x0 + lf.x1) / 2, lf.hi - 46, 10, 0, Math.PI * 2); c.fill();
  }
  // the recycler mouth in the wall
  for (const b of st.belts) for (const side of [0, 1]) {
    if (b.ends[side] !== 'mouth') continue;
    const x = side ? b.x1 : b.x0 - 60;
    c.fillStyle = '#3fae7a'; c.beginPath(); c.roundRect ? c.roundRect(x, b.y - 54, 60, 70, 12) : c.rect(x, b.y - 54, 60, 70); c.fill();
    c.fillStyle = '#1d5e40'; c.beginPath(); c.ellipse(x + (side ? 14 : 46), b.y - 18, 12, 26, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1d5e40'; c.beginPath(); c.roundRect ? c.roundRect(x + 2, b.y - 76, 56, 18, 9) : c.rect(x + 2, b.y - 76, 56, 18); c.fill();
    c.fillStyle = '#d6ffe8'; c.font = conveyorFont(10); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('RECYCLE', x + 30, b.y - 67); c.textBaseline = 'alphabetic';
  }
  // cables from each lever station down to what it works
  for (const s of st.stations) {
    let tx = s.x, ty = C0.ceilY;
    if (s.kind === 'belt') { tx = clamp(s.x, s.ref.x0 + 20, s.ref.x1 - 20); ty = s.ref.y; }
    else if (s.kind === 'lift') { tx = (s.ref.x0 + s.ref.x1) / 2; ty = s.ref.hi - 56; }
    else { tx = (s.ref.x0 + s.ref.x1) / 2; ty = s.ref.y; }
    c.strokeStyle = s.col[1]; c.globalAlpha = 0.55; c.lineWidth = 3; c.setLineDash([6, 6]);
    c.beginPath(); c.moveTo(s.x, C0.ceilY); c.lineTo(s.x, C0.ceilY + 16); c.lineTo(tx, ty - 26); c.lineTo(tx, ty); c.stroke();
    c.setLineDash([]); c.globalAlpha = 1;
  }
  void cw;
}
function conveyorDrawBack(st) {
  const L = G.level, cw = canvas.width, ch = canvas.height;
  try {
    if (!conveyorBack || conveyorBack.L !== L || conveyorBack.cv.width !== cw || conveyorBack.cv.height !== ch) {
      const cv = (conveyorBack && conveyorBack.cv) || document.createElement('canvas');
      cv.width = cw; cv.height = ch;
      const c = cv.getContext('2d');
      c.setTransform(cw / W, 0, 0, ch / H, 0, 0); c.clearRect(0, 0, W, H);
      conveyorPaintBack(c, st);
      conveyorBack = { cv, L };
    }
    ctx.drawImage(conveyorBack.cv, 0, 0, W, H);
  } catch (e) { conveyorBack = null; conveyorPaintBack(ctx, st); }
}
function conveyorDrawGrates(st, t) {
  for (const gt of st.grates) {
    const x0 = gt.x0, w = gt.x1 - gt.x0, y = gt.y;
    ctx.fillStyle = '#3b2a4a'; rr(x0, y - 2, w, 12, 4); ctx.fill();
    ctx.fillStyle = gt.flash > 0 ? 'rgba(160,255,200,' + (0.4 + 0.6 * gt.flash) + ')' : '#6a5a7e';
    for (let x = x0 + 5; x < x0 + w - 4; x += 8) ctx.fillRect(x, y, 4, 8);
    // a little recycle sign
    const cx = x0 + w / 2;
    ctx.save(); ctx.translate(cx, y + 26); ctx.rotate(gt.flash > 0 ? t * 6 : 0);
    ctx.strokeStyle = '#7ff0b0'; ctx.lineWidth = 3;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(0, 0, 8, k * 2.09 + 0.3, k * 2.09 + 1.6); ctx.stroke(); }
    ctx.restore();
  }
}
function conveyorDrawStation(st, s, t) {
  const C0 = CONVEYOR, x = s.x, y = C0.catwalkY, op = G.players[st.op];
  const near = st.opAt === s && st.phase === 'play';
  // the console
  ctx.fillStyle = s.col[1]; rr(x - 22, y - 44, 44, 44, 7); ctx.fill();
  ctx.fillStyle = s.col[0]; rr(x - 19, y - 41, 38, 38, 5); ctx.fill();
  if (near || s.flash > 0) { ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * Math.max(s.flash, near ? 0.5 + 0.5 * Math.sin(t * 6) : 0); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; rr(x - 24, y - 46, 48, 48, 9); ctx.stroke(); ctx.restore(); }
  // the screen: what the thing is doing
  ctx.fillStyle = '#2a2140'; rr(x - 15, y - 37, 30, 17, 4); ctx.fill();
  if (s.kind === 'belt') {
    const b = s.ref, col = b.spd ? '#9fffd0' : '#ff9a9a';
    if (!b.spd) text('STOP', x, y - 28.5, 9, col, 'center', 'body');
    else { for (let k = 0; k < b.spd; k++) { const ax = x + b.dir * (k * 8 - (b.spd - 1) * 4); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(ax + b.dir * 5, y - 28.5); ctx.lineTo(ax - b.dir * 3, y - 34); ctx.lineTo(ax - b.dir * 3, y - 23); ctx.closePath(); ctx.fill(); } }
  } else if (s.kind === 'lift') {
    const lf = s.ref, up = lf.target === lf.hi;
    ctx.fillStyle = '#ffe680'; ctx.beginPath();
    if (up) { ctx.moveTo(x, y - 35); ctx.lineTo(x - 6, y - 23); ctx.lineTo(x + 6, y - 23); } else { ctx.moveTo(x, y - 22); ctx.lineTo(x - 6, y - 34); ctx.lineTo(x + 6, y - 34); }
    ctx.closePath(); ctx.fill();
  } else text(s.ref.open ? 'OPEN' : 'SHUT', x, y - 28.5, 9, s.ref.open ? '#ffe680' : '#ffd0ea', 'center', 'body');
  // the lever
  const a = s.lever * 0.7;
  ctx.save(); ctx.translate(x, y - 12); ctx.rotate(a);
  ctx.strokeStyle = '#5a4a6a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -22); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = '#ff5c8a'; circle(0, -24, 5.5); ctx.fill(); ctx.strokeStyle = '#a8346a'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#3a2d4c'; rr(x - 10, y - 14, 20, 6, 3); ctx.fill();
  // its name on the railing
  const big = conveyorBig();
  ctx.font = conveyorFont(big ? 13 : 11);
  const lw = ctx.measureText(s.label).width + 14, lh = big ? 18 : 16;
  ctx.fillStyle = 'rgba(42,33,64,0.82)'; rr(x - lw / 2, y + 6, lw, lh, lh / 2); ctx.fill();
  text(s.label, x, y + 6 + lh / 2, big ? 13 : 11, '#fff8fb', 'center', 'body');
  void op;
}
function conveyorDrawBelt(st, b, t) {
  const x0 = b.x0, x1 = b.x1, y = b.y, tp = b.trap;
  // the frame and the rubber
  ctx.fillStyle = '#4a3d5c'; rr(x0 - 4, y + 4, x1 - x0 + 8, 20, 9); ctx.fill();
  ctx.fillStyle = '#2c2438'; ctx.fillRect(x0, y, x1 - x0, 7);
  // moving chevrons on the belt top (the speed and the direction)
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y - 1, x1 - x0, 9);
  if (tp && tp.anim > 0.05) { ctx.rect(tp.x0, y - 1, tp.x1 - tp.x0, 9); }
  ctx.clip('evenodd');
  const off = ((b.off % 24) + 24) % 24;
  ctx.fillStyle = b.spd ? b.col[0] : 'rgba(255,255,255,0.25)';
  for (let x = x0 - 24 + off; x < x1 + 24; x += 24) {
    ctx.beginPath(); ctx.moveTo(x + b.dir * 5, y + 3.5); ctx.lineTo(x - b.dir * 3, y); ctx.lineTo(x - b.dir * 1, y + 3.5); ctx.lineTo(x - b.dir * 3, y + 7); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // rollers
  const spin = b.off / 9;
  for (let x = x0 + 10; x < x1 - 4; x += 30) {
    ctx.fillStyle = '#d9d0e6'; circle(x + 5, y + 15, 6); ctx.fill();
    ctx.strokeStyle = '#6a5a7e'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 5 + Math.cos(spin) * 5, y + 15 + Math.sin(spin) * 5); ctx.lineTo(x + 5 - Math.cos(spin) * 5, y + 15 - Math.sin(spin) * 5); ctx.stroke();
  }
  // coloured side rail with the belt's name
  ctx.fillStyle = b.col[0]; rr(x0 - 4, y + 19, x1 - x0 + 8, 7, 3.5); ctx.fill();
  if (b.flash > 0) { ctx.save(); ctx.globalAlpha = b.flash * 0.6; ctx.fillStyle = '#ffffff'; rr(x0 - 4, y - 2, x1 - x0 + 8, 28, 9); ctx.fill(); ctx.restore(); }
  const big = conveyorBig(), fs = big ? 14 : 11;
  ctx.font = conveyorFont(fs);
  const lw = ctx.measureText(b.name).width + 14;
  ctx.fillStyle = b.col[1]; rr(x0 + 6, y + 28, lw, fs + 6, (fs + 6) / 2); ctx.fill();
  text(b.name, x0 + 6 + lw / 2, y + 28 + (fs + 6) / 2 + 0.5, fs, '#ffffff', 'center', 'body');
  // end caps: a stopper at a wall end
  for (const side of [0, 1]) if (b.ends[side] === 'wall') { const ex = side ? x1 : x0 - 10; ctx.fillStyle = '#ff6fa8'; rr(ex, y - 14, 10, 38, 4); ctx.fill(); }
  // the trapdoor flaps
  if (tp) {
    const a = tp.anim, hw = (tp.x1 - tp.x0) / 2;
    ctx.save();
    ctx.strokeStyle = '#ff9ccf'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.strokeRect(tp.x0, y - 1, tp.x1 - tp.x0, 9); ctx.setLineDash([]);
    for (const sd of [-1, 1]) {
      const hx = sd < 0 ? tp.x0 : tp.x1;
      ctx.save(); ctx.translate(hx, y + 4); ctx.rotate(sd * a * 1.4);
      ctx.fillStyle = '#ff9ccf'; ctx.fillRect(sd < 0 ? 0 : -hw, -4, hw, 8);
      ctx.restore();
    }
    ctx.restore();
  }
  void t;
}
function conveyorDrawChute(st, ch, t) {
  const b = ch.belt, x = ch.x, top = CONVEYOR.ceilY, ny = b.y - 70;
  // a striped pipe from the ceiling
  ctx.fillStyle = '#fff'; ctx.fillRect(x - 13, top, 26, ny - top);
  ctx.save(); ctx.beginPath(); ctx.rect(x - 13, top, 26, ny - top); ctx.clip();
  ctx.fillStyle = '#ff6fa8'; for (let y = top - 30; y < ny; y += 18) { ctx.beginPath(); ctx.moveTo(x - 13, y); ctx.lineTo(x + 13, y + 12); ctx.lineTo(x + 13, y + 20); ctx.lineTo(x - 13, y + 8); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  // the nozzle with a little window showing the next candy
  const sq = ch.pop * 4;
  ctx.fillStyle = '#d96aa3'; ctx.beginPath(); ctx.moveTo(x - 22 - sq, ny - 26); ctx.lineTo(x + 22 + sq, ny - 26); ctx.lineTo(x + 13, ny + 4); ctx.lineTo(x - 13, ny + 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff4fa'; circle(x, ny - 13, 11); ctx.fill(); ctx.strokeStyle = '#a8346a'; ctx.lineWidth = 2; ctx.stroke();
  if (ch.next) conveyorDrawCandy(ch.next.kind, x, ny - 13, 0.62, 0);
  // waiting for the belt
  if (!b.spd && st.phase === 'play' && G.introT <= 0) {
    ctx.save(); ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 5);
    text('zzz', x + 24, ny - 30, 13, '#ffffff', 'left');
    ctx.restore();
  }
}
function conveyorDrawLift(st, t) {
  const lf = st.lift;
  if (!lf) return;
  const x0 = lf.x0, w = lf.x1 - lf.x0, y = lf.y;
  // ropes up to the pulley
  ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0 + 10, y); ctx.lineTo((x0 + lf.x1) / 2, lf.hi - 46); ctx.lineTo(lf.x1 - 10, y); ctx.stroke();
  ctx.fillStyle = '#ffd65c'; rr(x0, y, w, 13, 4); ctx.fill();
  ctx.strokeStyle = '#c9971a'; ctx.lineWidth = 2; rr(x0, y, w, 13, 4); ctx.stroke();
  ctx.fillStyle = '#c9971a'; for (let x = x0 + 8; x < x0 + w - 6; x += 14) ctx.fillRect(x, y + 4, 7, 5);
  if (lf.blocked) { ctx.save(); ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 10); text('!', x0 + w / 2, y - 14, 16, '#ff5c8a', 'center'); ctx.restore(); }
}
function conveyorDrawWrapper(st, t) {
  const w = st.wrap;
  if (!w) return;
  const y = w.belt.y, x0 = w.x0, x1 = w.x1, pf = w.puff;
  ctx.save(); ctx.translate((x0 + x1) / 2, y); ctx.scale(1 + pf * 0.06, 1 - pf * 0.04); ctx.translate(-(x0 + x1) / 2, -y);
  ctx.fillStyle = '#4fb6ff'; rr(x0, y - 66, x1 - x0, 64, 10); ctx.fill();
  ctx.strokeStyle = '#2366a8'; ctx.lineWidth = 3; rr(x0, y - 66, x1 - x0, 64, 10); ctx.stroke();
  // the tunnel the belt runs through
  ctx.fillStyle = '#1e3f66'; rr(x0 + 8, y - 26, x1 - x0 - 16, 24, 6); ctx.fill();
  // ribbon spools on top, turning
  for (const [sx, col] of [[x0 + 22, C.gold], [x1 - 22, '#ff5c8a']]) {
    ctx.fillStyle = col; circle(sx, y - 72, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx + Math.cos(w.spin) * 7, y - 72 + Math.sin(w.spin) * 7); ctx.lineTo(sx - Math.cos(w.spin) * 7, y - 72 - Math.sin(w.spin) * 7); ctx.stroke();
  }
  const big = conveyorBig();
  text('WRAP', (x0 + x1) / 2, y - 52, big ? 16 : 14, '#ffffff', 'center');
  // its rule on the front: slow only
  ctx.fillStyle = st.gold.wrap ? C.gold : '#fff8e6'; rr(x0 + 6, y - 42, x1 - x0 - 12, 14, 7); ctx.fill();
  text(st.gold.wrap ? 'ANY SPEED' : 'SLOW ONLY', (x0 + x1) / 2, y - 34.5, big ? 11 : 9, '#2366a8', 'center', 'body');
  ctx.restore();
  void t;
}
function conveyorDrawBin(st, bn, t) {
  const k = CONVEYOR_KINDS[bn.kind], x = bn.x, y = bn.y, w = bn.w, h = bn.h;
  const sh = bn.shake > 0 ? Math.sin(t * 50) * 3 * bn.shake : 0;
  ctx.save(); ctx.translate(x + sh, y);
  if (bn.glow > 0) { ctx.save(); ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 8); ctx.fillStyle = C.gold; rr(-w / 2 - 8, -h - 12, w + 16, h + 14, 14); ctx.fill(); ctx.restore(); }
  // a soft shadow under it, then the tub
  ctx.fillStyle = 'rgba(60,20,30,0.2)'; ctx.beginPath(); ctx.ellipse(0, 1, w / 2 + 6, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = k.col; ctx.beginPath(); ctx.moveTo(-w / 2, -h); ctx.lineTo(w / 2, -h); ctx.lineTo(w / 2 - 6, 0); ctx.lineTo(-w / 2 + 6, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = k.dark; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = k.tint; rr(-w / 2 + 9, -h + 10, w - 18, h - 18, 8); ctx.fill();
  // the big picture of its candy
  conveyorDrawCandy(bn.kind, 0, -h / 2 + 2 + (bn.yum > 0 ? -Math.sin(bn.yum * Math.PI) * 4 : 0), 1.25, 0);
  // a shine down the left side, a shade on the right
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.moveTo(-w / 2 + 3, -h + 4); ctx.lineTo(-w / 2 + 9, -h + 4); ctx.lineTo(-w / 2 + 12, -4); ctx.lineTo(-w / 2 + 8, -4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.beginPath(); ctx.moveTo(w / 2 - 8, -h + 4); ctx.lineTo(w / 2 - 2, -h + 4); ctx.lineTo(w / 2 - 7, -2); ctx.lineTo(w / 2 - 12, -2); ctx.closePath(); ctx.fill();
  // the rim
  ctx.fillStyle = k.dark; rr(-w / 2 - 4, -h - 5, w + 8, 9, 4.5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; rr(-w / 2 - 2, -h - 4, w + 4, 2.5, 1.2); ctx.fill();
  // a happy or a yucky face on the rim when something lands in it
  if (bn.blech > 0) { ctx.globalAlpha = bn.blech; text('blech', 0, -h - 15, 12, '#e8ffb0', 'center'); ctx.globalAlpha = 1; }
  ctx.restore();
  // its label and the order count
  const o = st.order[bn.kind], big = conveyorBig(), fs = big ? 13 : 10;
  ctx.font = conveyorFont(fs);
  const lw = ctx.measureText(k.bin).width + 10;
  ctx.fillStyle = 'rgba(28,26,54,0.75)'; rr(x - lw / 2, y + 3, lw, fs + 5, (fs + 5) / 2); ctx.fill();
  text(k.bin, x, y + 3 + (fs + 5) / 2 + 0.5, fs, '#ffffff', 'center', 'body');
  if (o) {
    const done = o.got >= o.need, s = done ? '✓' : o.got + '/' + o.need, r = (big ? 15 : 12) * (1 + o.pop * 0.3);
    // a round badge, or a pill wide enough for its words (with air on each side)
    const fsz = done ? r * 1.1 : r * 0.78; ctx.font = conveyorFont(Math.round(fsz));
    const bw = Math.max(2 * r, ctx.measureText(s).width + 14), bx = x + w / 2 - 2;
    ctx.fillStyle = done ? '#3ccb6c' : '#ffffff'; rr(bx - bw / 2, y - h - 4 - r, bw, 2 * r, r); ctx.fill();
    ctx.strokeStyle = done ? '#1d7d40' : k.dark; ctx.lineWidth = 2; rr(bx - bw / 2, y - h - 4 - r, bw, 2 * r, r); ctx.stroke();
    text(s, bx, y - h - 3.5, fsz, done ? '#ffffff' : C.ink, 'center', 'body');
  }
}
function conveyorDrawCandyObj(st, c) {
  const r = c.inWrap ? 0 : 1;
  if (!r) return;
  // a soft shadow on its surface
  if (c.st === 'belt' || c.st === 'rest') { ctx.fillStyle = 'rgba(28,26,54,0.2)'; ctx.beginPath(); ctx.ellipse(c.x, c.y + CONVEYOR.candyR, 10, 2.5, 0, 0, Math.PI * 2); ctx.fill(); }
  const fade = c.st === 'rest' && c.surf !== 'lift' && c.age > CONVEYOR.floorPoof - 3 ? 0.5 + 0.5 * Math.sin(G.clock * 12) : 1;
  ctx.globalAlpha = fade;
  conveyorDrawCandy(c.kind, c.x, c.y, 1, c.rot);
  ctx.globalAlpha = 1;
  // useful candy gets a small sparkle; a candy on a fast belt a whoosh line
  if (c.st === 'belt' && c.belt.spd === 2) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; for (const dy of [-5, 3]) { ctx.beginPath(); ctx.moveTo(c.x - Math.sign(c.belt.v) * 14, c.y + dy); ctx.lineTo(c.x - Math.sign(c.belt.v) * 26, c.y + dy); ctx.stroke(); } }
}
function conveyorDraw(st) {
  const t = G.clock;
  conveyorDrawBack(st);
  conveyorDrawGrates(st, t);
  for (const s of st.stations) conveyorDrawStation(st, s, t);
  for (const bn of st.bins) conveyorDrawBin(st, bn, t);
  conveyorDrawLift(st, t);
  for (const b of st.belts) conveyorDrawBelt(st, b, t);
  for (const ch of st.chutes) conveyorDrawChute(st, ch, t);
  for (const c of st.candies) if (c.st !== 'held') conveyorDrawCandyObj(st, c);
  conveyorDrawWrapper(st, t);
}
function conveyorDrawBoss(st, t) {
  const b = st.boss;
  if (!b) return;
  // Boss Bonbon: a round, happy chocolate truffle in a chef's hat, rising up behind the catwalk
  const u = clamp((b.t - 0.3) / 0.8, 0, 1), rise = 1 - Math.pow(1 - u, 3), x = W / 2, y = 330 - rise * 40 + Math.sin(t * 3) * 3;
  if (u <= 0) return;
  ctx.save(); ctx.globalAlpha = Math.min(1, u * 2);
  ctx.translate(x, y); const s = 1 + 0.05 * Math.sin(t * 6); ctx.scale(s, s);
  ctx.fillStyle = '#6b3d22'; circle(0, 0, 54); ctx.fill(); ctx.strokeStyle = '#3e2010'; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = '#ff9ccf'; for (let k = 0; k < 9; k++) { const a = -Math.PI + k * Math.PI / 8; ctx.fillRect(Math.cos(a) * 40 - 2, Math.sin(a) * 40 - 5, 4, 10); }
  // the hat
  ctx.fillStyle = '#ffffff'; rr(-30, -84, 60, 32, 6); ctx.fill(); for (const cx of [-22, 0, 22]) { circle(cx, -88, 17); ctx.fill(); }
  ctx.strokeStyle = '#e6d6e6'; ctx.lineWidth = 2; rr(-30, -84, 60, 32, 6); ctx.stroke();
  // the face
  ctx.fillStyle = '#ffffff'; for (const ex of [-17, 17]) { ctx.beginPath(); ctx.ellipse(ex, -10, 9, 11, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = C.ink; for (const ex of [-17, 17]) { circle(ex + 2, -8, 4.5); ctx.fill(); }
  ctx.fillStyle = '#3e2010'; ctx.beginPath(); ctx.moveTo(-26, 8); ctx.quadraticCurveTo(-12, 0, 0, 8); ctx.quadraticCurveTo(12, 0, 26, 8); ctx.quadraticCurveTo(12, 14, 0, 10); ctx.quadraticCurveTo(-12, 14, -26, 8); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 16, 16, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,160,0.6)'; circle(-34, 10, 7); ctx.fill(); circle(34, 10, 7); ctx.fill();
  // waving arms
  const wv = Math.sin(t * 9) * 0.5;
  ctx.strokeStyle = '#6b3d22'; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-48, 6); ctx.lineTo(-74, -30 + wv * 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(48, 6); ctx.lineTo(74, -30 - wv * 20); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = '#ffffff'; circle(-76, -33 + wv * 20, 8); ctx.fill(); circle(76, -33 - wv * 20, 8); ctx.fill();
  ctx.restore();
  if (b.t > 1.0) {
    const k = Math.min(1, (b.t - 1.0) / 0.3), big = conveyorBig();
    bigText('Order complete!', W / 2, 200, big ? 52 : 42, C.gold, 0.6 + 0.4 * k);
    ctx.save(); ctx.globalAlpha = k;
    const say = 'Boss Bonbon: "Best candy crew ever!"';
    ctx.font = conveyorFont(big ? 22 : 16);
    const w = ctx.measureText(say).width + 30, h = big ? 38 : 30;
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#6b3d22'; ctx.lineWidth = 2.5; rr(W / 2 - w / 2, 236, w, h, h / 2); ctx.fill(); ctx.stroke();
    text(say, W / 2, 236 + h / 2 + 0.5, big ? 22 : 16, C.ink, 'center', 'body');
    ctx.restore();
  }
}
function conveyorDrawTop(st) {
  const t = G.clock, cam = null;
  // the candy over the sorter's head (with a gold arrow to its bin when Gold labels are on)
  if (st.held) {
    const c = st.held;
    conveyorDrawCandy(c.kind, c.x, c.y, 1.1, Math.sin(t * 5) * 0.15);
    if (st.gold.labels) {
      const bn = conveyorBinFor(st, c.kind);
      if (bn) {
        const dx = bn.x - c.x, dy = bn.y - bn.h - c.y, d = Math.hypot(dx, dy);
        if (d > 70) { const ux = dx / d, uy = dy / d, ax = c.x + ux * 30, ay = c.y + uy * 30; ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ax + ux * 10, ay + uy * 10); ctx.lineTo(ax - uy * 6, ay + ux * 6); ctx.lineTo(ax + uy * 6, ay - ux * 6); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      }
    }
  }
  for (const q of st.parts) {
    const a = clamp(q.life / q.max, 0, 1);
    ctx.globalAlpha = a; ctx.fillStyle = q.col;
    if (q.kind === 'spark') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillRect(-q.size, -q.size * 0.3, q.size * 2, q.size * 0.6); ctx.fillRect(-q.size * 0.3, -q.size, q.size * 0.6, q.size * 2); ctx.restore(); }
    else if (q.kind === 'conf') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillRect(-q.size, -q.size / 2, q.size * 2, q.size); ctx.restore(); }
    else { circle(q.x, q.y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  conveyorDrawBoss(st, t);
  const big = conveyorBig();
  for (const q of st.pops) {
    const size = q.size * (big ? 1.3 : 1);
    ctx.font = conveyorFont(Math.round(size), 'd');
    const w = ctx.measureText(q.s).width + size * 0.3, x = clamp(q.x, w / 2 + 6, W - w / 2 - 6), y = clamp(q.y - q.t * 26, 84, H - 20);
    ctx.save(); ctx.globalAlpha = clamp(Math.min(q.t / 0.08, (1.4 - q.t) / 0.4), 0, 1);
    bigText(q.s, x, y, Math.round(size), q.col, 1 + 0.2 * Math.max(0, 1 - q.t / 0.12));
    ctx.restore();
  }
  if (st.phase === 'done') {
    const k = Math.min(1, st.phaseT / 0.3);
    bigText('Order up!', W / 2, 240, big ? 54 : 46, C.gold, 0.6 + 0.4 * k);
  }
  void cam;
}

/* ---------- the HUD: the clock, the order board, the job cards, gold news, prompts ---------- */
function conveyorHud(st) {
  const big = conveyorBig(), z = big ? 1.4 : 1, ps = G.players, play = G.mode === 'play' || G.mode === 'paused', t = G.clock;
  // the clock (top right)
  let timeX0 = W - 14;
  {
    const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time);
    ctx.font = conveyorFont(fs);
    const w = ctx.measureText(tm).width + 30, x0 = pill(W - 14, 12, w, h, 'right');
    text(tm, x0 + 15, 12 + h / 2 + 0.5, fs, C.paper, 'left', 'body');
    timeX0 = x0;
  }
  // the order board (top middle): each candy, got / need
  {
    const fs = big ? 18 : 14, h = big ? 46 : 36, iw = big ? 30 : 24, gap = big ? 14 : 10;
    ctx.font = conveyorFont(fs);
    const items = st.orderKeys.map(kd => { const o = st.order[kd], s = o.got >= o.need ? '✓' : o.got + '/' + o.need; return { kd, s, w: iw + 4 + ctx.measureText(s).width }; });
    const title = 'ORDER', tw = (ctx.font = conveyorFont(big ? 15 : 12, 'd'), ctx.measureText(title).width);
    const w = tw + 24 + items.reduce((a, q) => a + q.w + gap, 0) + 6;
    const left = 250, right = timeX0 - 12;
    const cx = clamp(W / 2 + 40, left + w / 2, Math.max(left + w / 2, right - w / 2)), x0 = cx - w / 2, y0 = 8;
    st.boardBox = { x0, y0, x1: x0 + w, y1: y0 + h };
    ctx.fillStyle = '#fff4fa'; rr(x0, y0, w, h, 12); ctx.fill();
    ctx.strokeStyle = '#d96aa3'; ctx.lineWidth = 3; rr(x0, y0, w, h, 12); ctx.stroke();
    text(title, x0 + 12 + tw / 2, y0 + h / 2 + 1, big ? 15 : 12, '#c2508a', 'center');
    let x = x0 + tw + 24;
    for (const q of items) {
      const o = st.order[q.kd], done = o.got >= o.need, pop = 1 + o.pop * 0.35;
      conveyorDrawCandy(q.kd, x + iw / 2, y0 + h / 2, (big ? 1.05 : 0.85) * pop, 0);
      text(q.s, x + iw + 4, y0 + h / 2 + 0.5, fs, done ? '#1d9d50' : C.ink, 'left', 'body');
      x += q.w + gap;
    }
    // gold help chips under the board
    const chips = [];
    if (st.gold.grab) chips.push('GOLD GRABBER'); if (st.gold.labels) chips.push('GOLD LABELS'); if (st.gold.candy) chips.push('GOLD CANDY'); if (st.gold.wrap) chips.push('GOLD WRAPPER'); if (st.gold.trap) chips.push('GOLD TRAPDOOR');
    if (chips.length) {
      const cfs = big ? 13 : 10;
      ctx.font = conveyorFont(cfs);
      let cxp = x0;
      for (const s of chips) { const cw2 = ctx.measureText(s).width + 16; pill(cxp, y0 + h + 4, cw2, cfs + 8); text(s, cxp + cw2 / 2, y0 + h + 4 + (cfs + 8) / 2 + 0.5, cfs, C.gold, 'center', 'body'); cxp += cw2 + 6; }
    }
  }
  if (!play) return;
  const nd = conveyorNeeds(st), Sid = st.sorter, Oid = st.op;
  // the job cards, bottom corners: Pip's on the left, Bo's on the right (they fade while a player is behind them)
  for (const id of [0, 1]) {
    const sorter = id === Sid, pw = Math.round(264 * z), ph = Math.round(56 * z), py = H - ph - 8;
    const px = id === 0 ? 10 : W - 10 - pw;
    const behind = ps.some(p => p.x + p.w > px && p.x < px + pw && p.y + p.h > py - 4);
    ctx.save(); ctx.globalAlpha = behind ? 0.4 : 1;
    ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    const cpuSeat = conveyorQuiet(id);
    text(NAMES[id] + (sorter ? ' sorts the candy' : ' works the levers') + (cpuSeat ? ' (computer)' : ''), px + 12 * z, py + 15 * z, 14 * z, PCOL[id], 'left');
    let chips;
    if (sorter) {
      const go = ['toBin', 'toLift', 'getDown', 'find'].includes(nd.sorter);
      chips = [['lr', 'RUN', go && !!st.held], ['jump', 'JUMP', false], ['act', st.held ? 'TOSS' : 'GRAB', nd.sorter === 'grab' || nd.sorter === 'toss']];
    } else {
      const at = st.opAt, want = nd.opStation;
      const walk = want && at !== want;
      // (trapReady: stand at the trapdoor lever and wait)
      const ud = at && at === want && ['slow', 'start', 'liftUp', 'liftDown'].includes(nd.op);
      const ac = at && at === want && ['flip', 'trap'].includes(nd.op);
      const lab = at && at.kind === 'lift' ? 'LIFT' : at && at.kind === 'trap' ? 'SHUT' : 'SPEED';
      const alab = at && at.kind === 'lift' ? 'LIFT' : at && at.kind === 'trap' ? 'OPEN' : 'FLIP';
      chips = [['lr', 'WALK', !!walk], ['updown', lab, !!ud], ['act', alab, !!ac]];
    }
    const n = chips.length, cw = (pw - 24 * z - (n - 1) * 8 * z) / n;
    chips.forEach(([k, lab, on], i) => {
      const cx = px + 12 * z + i * (cw + 8 * z), cy = py + 26 * z, chh = 24 * z;
      ctx.fillStyle = on ? (Math.sin(t * 12) > -0.3 ? C.gold : 'rgba(255,197,61,0.55)') : 'rgba(255,255,255,0.12)';
      rr(cx, cy, cw, chh, chh / 2); ctx.fill();
      const kk = cpuSeat ? '' : conveyorKey(id, k);
      let fs = 12 * z;
      const s = (kk ? kk + ' ' : '') + lab;
      ctx.font = conveyorFont(fs);
      while (fs > 8 && ctx.measureText(s).width > cw - 8) { fs -= 0.5; ctx.font = conveyorFont(fs); }
      text(s, cx + cw / 2, cy + chh / 2 + 0.5, fs, on ? C.ink : '#e6dcf2', 'center', 'body');
    });
    ctx.restore();
  }
  // the message line (gold help), under the order board
  if (st.msg) {
    let fs = big ? 19 : 14;
    const h = big ? 32 : 26, bb = st.boardBox || { y1: 44 };
    ctx.font = conveyorFont(fs);
    let w = ctx.measureText(st.msg.text).width + 30;
    while (w > W - 40 && fs > 11) { fs--; ctx.font = conveyorFont(fs); w = ctx.measureText(st.msg.text).width + 30; }
    const y = bb.y1 + (st.gold.grab || st.gold.labels || st.gold.candy || st.gold.wrap || st.gold.trap ? (big ? 26 : 22) : 0) + 6;
    const cx = clamp(W / 2 + 40, w / 2 + 10, W - w / 2 - 10);
    ctx.globalAlpha = clamp((st.msg.life - st.msg.t) / 0.3, 0, 1);
    pill(cx, y, w, h, 'center'); ctx.strokeStyle = st.msg.col; ctx.lineWidth = 2; rr(cx - w / 2, y, w, h, h / 2); ctx.stroke();
    text(st.msg.text, cx, y + h / 2 + 0.5, fs, st.msg.col, 'center', 'body'); ctx.globalAlpha = 1;
  }
  if (G.introT > 0 || st.phase !== 'play') return;
  // prompts: the operator's sits just under the catwalk, the sorter's over the sorter's head
  const fs = 13 * z;
  const box = (p, str, col, pulse, under) => {
    ctx.font = conveyorFont(fs);
    const w = ctx.measureText(str).width + 20 * z, h = fs + 12 * z, hx = p.x + p.w / 2;
    let y;
    if (under) y = CONVEYOR.ceilY + 8;
    else {
      y = p.y - 30 * z - h;
      if (typeof CPU === 'object' && cpuSolo() && !cpuOn(p.id)) { const cb = CPU.bubbles[1 - p.id]; if (cb && cb.t > 0 && Math.abs(ps[1 - p.id].x - p.x) < 160) y = Math.min(y, p.y - 22 - (big ? 30 : 22) - 10 - h); }
      y = clamp(y, CONVEYOR.ceilY + 12 + h, H - 80 - h);
    }
    const x = clamp(hx - w / 2, 4, W - w - 4);
    const s = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
    text(str, 0, 0.5, fs, col, 'center', 'body');
    ctx.restore();
  };
  const bubble = (p, str, under) => {
    ctx.font = conveyorFont(fs);
    const w = ctx.measureText(str).width + 22 * z, h = fs + 14 * z, hx = p.x + p.w / 2;
    const y = under ? CONVEYOR.ceilY + 8 : clamp(p.y - 30 * z - h, CONVEYOR.ceilY + 12 + h, H - 80 - h), x = clamp(hx - w / 2, 4, W - w - 4);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = PCOL[p.id]; ctx.lineWidth = 2.5;
    rr(x, y, w, h, h / 2); ctx.fill(); ctx.stroke();
    text(str, x + w / 2, y + h / 2 + 0.5, fs, C.ink, 'center', 'body');
  };
  const S = ps[Sid], O = ps[Oid];
  // the sorter
  if (!conveyorQuiet(Sid) && !st.hints[Sid]) {
    const bin = nd.binTarget, dirTo = x => (x < S.x + S.w / 2 ? conveyorKey(Sid, 'left') + ' ' : '') + '%' + (x >= S.x + S.w / 2 ? ' ' + conveyorKey(Sid, 'right') : '');
    if (nd.sorter === 'grab') box(S, 'Grab it! ' + conveyorKey(Sid, 'act'), C.gold, true);
    else if (nd.sorter === 'tooFast') box(S, 'Too fast! Ask ' + NAMES[Oid] + ' to slow it', '#ffe0b0', false);
    else if (nd.sorter === 'toss') box(S, 'Toss! ' + conveyorKey(Sid, 'act'), C.gold, true);
    else if (nd.sorter === 'toBin' && bin) box(S, dirTo(bin.x).replace('%', CONVEYOR_KINDS[bin.kind].bin + ' bin'), CONVEYOR_KINDS[bin.kind].tint, false);
    else if (nd.sorter === 'toLift' && st.lift && st.lift.target !== st.lift.lo && Math.abs(S.x + S.w / 2 - (st.lift.x0 + st.lift.x1) / 2) < 160) box(S, 'Ask ' + NAMES[Oid] + ' to bring the lift down', '#ffe680', false);
    else if (nd.sorter === 'toLift' && st.lift) box(S, dirTo((st.lift.x0 + st.lift.x1) / 2).replace('%', 'Stand on the lift'), '#ffe680', false);
    else if (nd.sorter === 'jumpLift') box(S, 'Jump up onto the lift! ' + conveyorKey(Sid, 'jump'), C.gold, true);
    else if (nd.sorter === 'rideUp') box(S, 'Ask ' + NAMES[Oid] + ' for the lift ▲', '#ffe680', false);
    else if (nd.sorter === 'rideDown') box(S, 'Ask ' + NAMES[Oid] + ' for the lift ▼', '#ffe680', false);
    else if (nd.sorter === 'getDown') box(S, dirTo(st.lift ? (st.lift.x0 + st.lift.x1) / 2 : W / 2).replace('%', 'Hop down to the ' + CONVEYOR_KINDS[bin.kind].bin + ' bin'), CONVEYOR_KINDS[bin.kind].tint, false);
    else if (nd.sorter === 'unwrapped') box(S, 'Not wrapped! Drop it: ' + conveyorKey(Sid, 'down') + ' + ' + conveyorKey(Sid, 'act'), '#ffe0b0', false);
  }
  // the operator
  if (!conveyorQuiet(Oid) && !st.hints[Oid] && nd.op) {
    const s = nd.opStation, at = st.opAt;
    let str;
    if (s && at !== s) str = (s.x < O.x + O.w / 2 ? conveyorKey(Oid, 'left') + ' ' : '') + 'To the ' + s.label + ' lever' + (s.x >= O.x + O.w / 2 ? ' ' + conveyorKey(Oid, 'right') : '') + ': ' + nd.opText.replace(/!$/, '');
    else if (nd.op === 'slow' || nd.op === 'liftDown') str = nd.opText + ' ' + conveyorKey(Oid, 'down');
    else if (nd.op === 'start' || nd.op === 'liftUp') str = nd.opText + ' ' + conveyorKey(Oid, 'up');
    else if (nd.op === 'trapReady') str = 'Candy coming! Open it when it\'s on top';
    else str = nd.opText + ' ' + conveyorKey(Oid, 'act');
    const now = s && at === s && nd.op !== 'trapReady';
    box(O, str, now ? C.gold : '#ffd6ea', !!now, true);
  } else if (!conveyorQuiet(Oid) && !st.hints[Oid] && st.opAt && st.roomT < 25 && st.k < 2) {
    // first rooms: what this lever does, while standing at it
    const s = st.opAt, str = s.kind === 'belt' ? conveyorKey(Oid, 'updown') + ' speed · ' + conveyorKey(Oid, 'act') + ' flip' : s.kind === 'lift' ? conveyorKey(Oid, 'updown') + ' lift up / down' : conveyorKey(Oid, 'act') + ' open the trapdoor';
    box(O, str, '#e6dcf2', false, true);
  }
  for (const p of ps) if (st.hints[p.id]) bubble(p, st.hints[p.id].text, p.id === Oid);
}

/* ---------- sounds ---------- */
Sfx.extra.conveyorFlip = function (p) { this.tone(300 * p, 0.08, 'square', 0.04, 200 * p); this.tone(500 * p, 0.1, 'triangle', 0.04, 800 * p, 0.06); };
Sfx.extra.conveyorStart = function (p) { this.tone(120 * p, 0.3, 'sawtooth', 0.03, 260 * p); this.tone(660 * p, 0.08, 'triangle', 0.03, null, 0.2); };
Sfx.extra.conveyorFaster = function (p) { this.tone(260 * p, 0.25, 'sawtooth', 0.03, 520 * p); };
Sfx.extra.conveyorSlower = function (p) { this.tone(420 * p, 0.25, 'sawtooth', 0.03, 220 * p); };
Sfx.extra.conveyorStop = function (p) { this.tone(260 * p, 0.3, 'sawtooth', 0.03, 90 * p); this.tone(180 * p, 0.08, 'square', 0.03, null, 0.25); };
Sfx.extra.conveyorClick = function (p) { this.tone(900 * p, 0.03, 'square', 0.02); };
Sfx.extra.conveyorNope = function (p) { this.tone(300 * p, 0.08, 'square', 0.03); this.tone(240 * p, 0.1, 'square', 0.03, null, 0.09); };
Sfx.extra.conveyorLiftUp = function (p) { this.tone(200 * p, 0.6, 'triangle', 0.035, 420 * p); };
Sfx.extra.conveyorLiftDown = function (p) { this.tone(420 * p, 0.6, 'triangle', 0.035, 200 * p); };
Sfx.extra.conveyorDing = function () { this.tone(1320, 0.12, 'sine', 0.04); this.tone(1760, 0.16, 'sine', 0.03, null, 0.06); };
Sfx.extra.conveyorTrap = function (p) { this.tone(500 * p, 0.12, 'triangle', 0.04, 200 * p); this.tone(140, 0.08, 'square', 0.03, null, 0.05); };
Sfx.extra.conveyorTrapShut = function () { this.tone(160, 0.07, 'square', 0.025, 220); };
Sfx.extra.conveyorGrab = function (p) { this.tone(700 * p, 0.06, 'triangle', 0.045, 1100 * p); };
Sfx.extra.conveyorToss = function (p) { this.tone(400 * p, 0.18, 'sine', 0.04, 900 * p); };
Sfx.extra.conveyorDrop = function (p) { this.tone(500 * p, 0.12, 'sine', 0.035, 250 * p); };
Sfx.extra.conveyorPlop = function () { this.tone(520, 0.08, 'sine', 0.045, 260); this.tone(160, 0.06, 'triangle', 0.03, null, 0.04); };
Sfx.extra.conveyorTap = function () { this.tone(820 + Math.random() * 120, 0.03, 'triangle', 0.025); };
Sfx.extra.conveyorYum = function () { [784, 988, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.conveyorBlech = function () { this.tone(180, 0.25, 'sawtooth', 0.04, 110); this.tone(140, 0.3, 'square', 0.025, 90, 0.12); };
Sfx.extra.conveyorRecycle = function () { this.tone(600, 0.25, 'sine', 0.03, 200); this.tone(900, 0.1, 'triangle', 0.02, 1200, 0.15); };
Sfx.extra.conveyorWrap = function () { this.tone(300, 0.15, 'sawtooth', 0.02, 600); [1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.045, null, 0.12 + i * 0.06)); };
Sfx.extra.conveyorGold = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.conveyorOrder = function () { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.055, null, i * 0.08)); this.tone(1568, 0.4, 'sine', 0.04, null, 0.5); };
Sfx.extra.conveyorFinale = function () { [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.055, null, i * 0.08)); };
Sfx.extra.conveyorBoss = function () { [330, 392, 494, 659].forEach((f, i) => this.tone(f, 0.2, 'square', 0.035, null, i * 0.12)); this.tone(110, 0.6, 'sawtooth', 0.03, 220, 0.05); };
/* ===== end of MODES.conveyor ===== */
