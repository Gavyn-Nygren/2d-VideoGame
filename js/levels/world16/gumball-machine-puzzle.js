/* Pip & Bo - Level 16-2 Gumball Machine Puzzle (team, World 16 Sugar Rush Factory). */
'use strict';

/* ===== 16-2 Gumball Machine Puzzle (mode 'gumball', team) — Gavyn's pick =====
   "One turns the crank to drop gumballs, the other moves flippers and gates so each colour rolls into its matching
   cup." A giant glass gumball machine fills the screen like a marble run seen from the front. The mode owns the tick,
   the picture and the HUD (def.ownStep + def.ownHUD); the engine grid only holds the keeper's wafer ledges and walls.
   - The CRANKER stands at the crank by the globe. The window under the globe shows the next 3 gumballs (each colour has
     its own pattern: red stripes, blue dots, yellow star, green swirl, purple heart, so colour-blind players can tell
     them apart). ◀ ▶ slide the nozzle to another chute (machines with 2-3 chutes), ▼ swaps the next gumball with the
     one after it, ▲ calls out the next colour ("Red next!") and the action turns the crank: one gumball rolls along the
     tray to the nozzle and drops into the board. A short rest between cranks, and at most 2 gumballs on the board.
   - The GATE KEEPER runs and hops along the wafer ledges beside the board (one-way planks: hop up through, ▼ drops) and
     presses the action at a lever. Each lever has a picture (star, heart, moon, leaf) and works the device on the board
     with the same picture: a flap gate (two-way switch), a seesaw (it also tips over by itself after every gumball), a
     spinner wheel (spins left or right, and a flip mid-ride turns the gumball round), a little conveyor belt (runs
     left or right), a timed trapdoor (opens for 3 s, then springs shut), and a pinball flipper (the gumball rests in its
     cradle for 2.4 s: flick it in time and it flies over into the far cup, or it rolls out the back). Pressing the
     action anywhere else shouts "Ready!".
   - Gumballs roll with simple, readable physics on candy rails: pegs, bumpers, ramps, the spinner, the conveyor. The
     tracks are fixed, so a gumball always ends in a cup: the right one is "Yum!", a wrong one is "Bloop! Wrong cup!"
     and the gumball pops back up into the globe (at the back of the line). Fill every cup to clear the machine.
   - One player alone, or with an idle partner, can never clear a machine: the cranker can't flip levers, the keeper
     can't crank, and every machine has colours that only reach their cup after a lever flip (checked in tests).
   - Machines (rooms), jobs swap every machine (room def crank: 0 Pip cranks, 1 Bo cranks):
       Sweet Start (1 chute, 2 flap gates, 3 cups), Switch Tracks (2 chutes, a seesaw that tips by itself, a two-way
       switch, 4 cups), Spinner Swirl (3 chutes, a spinner wheel and two timed trapdoors), Jackpot Machine (3 chutes, a
       flap gate, a seesaw, a conveyor and a flipper, 5 cups, then the golden JACKPOT gumball: flick it into the gold
       star and the globe rains gumballs).
   - Hints: Machine 1 always shows whose job is what next; later machines show them after 8 s of waiting, after a
     bloop of that colour, or with the gold path on. Each player's prompts use their own keys (keyboard, controller,
     touch); in 1-player mode the computer's job card says "(computer)" and it gets no prompts.
   - Gold help (always announced): Gold path after 2 bloops in a machine or 45 s with nothing sorted (a gold dotted line
     shows where each gumball will roll from the current settings, with a tick or a cross on the cup it reaches), Gold
     slow-mo after 4 bloops in a machine (gumballs roll at 65%, trapdoors stay open longer, the flipper waits longer).
   - Machine data (pieces, cups, levers): GUMBALL_MACHINES below, named by the room def's `machine`. Piece types:
       ramp { pts: [[x, y]...] (the gumball's centre line, always downhill), next }
       gate { x, y, outs: [left, right], lever, state, timed (a trapdoor: outs [closed, open]) }
       see  { x, y, outs, lever, state } a seesaw (0: left end low), tips over after every gumball
       spin { x, y, r, outs, lever, state } (0: spins left / anticlockwise)
       belt { x0, x1, y, outs: [left end, right end], lever, state } (0: runs left)
       flip { x, y, outs: [roll out, flick], lever, apexY }   pegs { x, y, x2, y2, rows, w, next }   bump { x, y, apex, next }
     outs / next name another piece or a cup ('cup:red'). A gumball moves from one piece to the next, falling in a
     real parabola when the next piece starts somewhere else. Room def: { title, machine, crank: 0|1, tip, act, map }.
   Every top-level name starts with gumball / GUMBALL (Sfx.extra.gumball* too); level state lives in G.mst. */
const GUMBALL = {
  r: 10, g: 1500, rollA: 820, drag: 0.5, vMin: 75, vMax: 330, feedV: 320,
  pegHop: 0.12, spinW: 2.5, spinExit: 1.75, spinCap: 6, beltV: 78, beltCap: 7, seeLen: 46, seeTilt: 0.36,
  restT: 2.4, openT: 3.0, slow: 0.65, crankCD: 0.9, crankAnim: 0.5, maxBalls: 2, popT: 1.0, cupT: 0.35,
  reach: 22, flipCD: 0.22, callCD: 1.0, readyCD: 1.2,
  goldPathBloops: 2, goldPathStuck: 45, slowBloops: 4, hintWait: 8,
  introHold: 0.4, winHold: 2.2, rainT: 5.2, newsLife: 4.2,
  globe: { x: 480, y: 68, r: 54 }, head: { x0: 404, y0: 118, x1: 556, y1: 184 }, mouthX: 480, mouthY: 186, trayY: 194, nozzleY: 204,
  crankX: 570, crankY: 150, crankerX: 606, crankerFeet: 186, cupMouth: 452, cupBot: 506,
  boardX0: 212, boardX1: 748, boardY0: 196,
};
const GUMBALL_COL = {
  red: { fill: '#ff3d5e', dark: '#b31a37', light: '#ffb3c1', name: 'Red', pat: 'stripes' },
  blue: { fill: '#3f86f5', dark: '#1f4fb0', light: '#b7d3ff', name: 'Blue', pat: 'dots' },
  yellow: { fill: '#ffd23f', dark: '#c29210', light: '#fff0b0', name: 'Yellow', pat: 'star' },
  green: { fill: '#3fcf86', dark: '#1a8a50', light: '#b8f2d2', name: 'Green', pat: 'swirl' },
  purple: { fill: '#a874ff', dark: '#6234c0', light: '#e0ccff', name: 'Purple', pat: 'heart' },
  gold: { fill: '#ffc53d', dark: '#b9850f', light: '#fff2b8', name: 'Jackpot', pat: 'shine' },
};
const GUMBALL_ICON_NAME = { star: 'star', heart: 'heart', moon: 'moon', leaf: 'leaf' };
const GUMBALL_DEV = { gate: 1, see: 1, spin: 1, belt: 1, flip: 1 };
// the four machines: pieces, cups and levers (lever row = the wafer ledge it stands on; feet at row * 30)
const GUMBALL_MACHINES = {
  // ---- Machine 1: Sweet Start (learn it: one chute, two flap gates) ----
  start: {
    rail: ['#ff7eb6', '#ffe4f1'], chutes: [{ x: 480, to: 'p0' }], cupW: 116, need: 2,
    cups: [['red', 320], ['blue', 480], ['yellow', 640]],
    order: ['red', 'blue', 'yellow', 'blue', 'red', 'yellow'],
    pieces: {
      p0: { t: 'pegs', x: 480, y: 226, x2: 480, y2: 266, rows: 3, w: 44, next: 'A' },
      A: { t: 'gate', x: 480, y: 280, outs: ['a0', 'a1'], lever: 'A', state: 0 },
      a0: { t: 'ramp', pts: [[480, 280], [362, 336]], next: 'B' },
      B: { t: 'gate', x: 362, y: 336, outs: ['b0', 'b1'], lever: 'B', state: 0 },
      b0: { t: 'ramp', pts: [[362, 336], [318, 356], [300, 364]], next: 'cup:red' },
      b1: { t: 'ramp', pts: [[362, 336], [446, 376], [474, 388]], next: 'cup:blue' },
      a1: { t: 'ramp', pts: [[480, 280], [588, 330]], next: 'K' },
      K: { t: 'bump', x: 628, y: 362, apex: 28, next: 'cup:yellow' },
    },
    levers: { A: { x: 868, row: 11, icon: 'star' }, B: { x: 92, row: 14, icon: 'heart' } },
  },
  // ---- Machine 2: Switch Tracks (two chutes, a seesaw that tips by itself, a two-way switch) ----
  switch: {
    rail: ['#5fd6a4', '#e3fff2'], chutes: [{ x: 330, to: 'S' }, { x: 630, to: 'G' }], cupW: 104, need: 2,
    cups: [['red', 300], ['blue', 420], ['yellow', 540], ['green', 660]],
    pieces: {
      S: { t: 'see', x: 330, y: 262, outs: ['sR', 's1'], lever: 'S', state: 0 },
      sR: { t: 'pegs', x: 292, y: 300, x2: 300, y2: 404, rows: 6, w: 40, next: 'cup:red' },
      s1: { t: 'ramp', pts: [[384, 284], [466, 320]], next: 'X' },
      X: { t: 'gate', x: 480, y: 340, outs: ['x0', 'x1'], lever: 'X', state: 0, funnel: true },
      x0: { t: 'ramp', pts: [[480, 340], [436, 364], [424, 370]], next: 'cup:blue' },
      x1: { t: 'ramp', pts: [[480, 340], [524, 364], [536, 370]], next: 'cup:yellow' },
      G: { t: 'gate', x: 630, y: 254, outs: ['g0', 'g1'], lever: 'G', state: 1 },
      g0: { t: 'ramp', pts: [[630, 254], [576, 282], [494, 320]], next: 'X' },
      g1: { t: 'ramp', pts: [[630, 254], [684, 282]], next: 'K2' },
      K2: { t: 'bump', x: 702, y: 344, apex: 22, next: 'cup:green' },
    },
    levers: { S: { x: 92, row: 8, icon: 'moon' }, X: { x: 92, row: 14, icon: 'leaf' }, G: { x: 868, row: 11, icon: 'star' } },
  },
  // ---- Machine 3: Spinner Swirl (three chutes, a spinner wheel, two timed trapdoors) ----
  spin: {
    rail: ['#b98cff', '#f1e6ff'], chutes: [{ x: 300, to: 'P1' }, { x: 480, to: 'W' }, { x: 660, to: 'K3' }], cupW: 104, need: 2,
    cups: [['red', 300], ['blue', 420], ['yellow', 540], ['green', 660]],
    pieces: {
      P1: { t: 'pegs', x: 300, y: 226, x2: 262, y2: 282, rows: 3, w: 40, next: 'r1' },
      r1: { t: 'ramp', pts: [[262, 290], [300, 306]], next: 'T1' },
      T1: { t: 'gate', timed: true, x: 300, y: 306, outs: ['t1c', 'cup:red'], lever: 'T', state: 0 },
      t1c: { t: 'ramp', pts: [[300, 306], [392, 348], [408, 354]], next: 'cup:blue' },
      W: { t: 'spin', x: 480, y: 286, r: 30, outs: ['w0', 'w1'], lever: 'W', state: 0 },
      w0: { t: 'ramp', pts: [[436, 298], [420, 336]], next: 'cup:blue' },
      w1: { t: 'ramp', pts: [[524, 298], [540, 306]], next: 'T2' },
      T2: { t: 'gate', timed: true, x: 540, y: 306, outs: ['t2c', 'cup:yellow'], lever: 'U', state: 0 },
      t2c: { t: 'ramp', pts: [[540, 306], [630, 346], [646, 352]], next: 'cup:green' },
      K3: { t: 'bump', x: 690, y: 268, apex: 24, next: 'K4' },
      K4: { t: 'bump', x: 722, y: 372, apex: 20, next: 'cup:green' },
    },
    levers: { T: { x: 92, row: 11, icon: 'heart' }, W: { x: 868, row: 8, icon: 'star' }, U: { x: 868, row: 14, icon: 'moon' } },
  },
  // ---- Machine 4: Jackpot Machine (a gate, a seesaw, a conveyor and a flipper, five cups, then the jackpot) ----
  jackpot: {
    rail: ['#ffb84d', '#fff3d6'], chutes: [{ x: 270, to: 'A' }, { x: 480, to: 'S' }, { x: 690, to: 'K5' }], cupW: 96, need: 2,
    cups: [['red', 264], ['blue', 372], ['yellow', 480], ['green', 588], ['purple', 696]],
    pieces: {
      A: { t: 'gate', x: 270, y: 250, outs: ['a0', 'a1'], lever: 'A', state: 0 },
      a0: { t: 'ramp', pts: [[270, 250], [234, 268]], next: 'cup:red' },
      a1: { t: 'ramp', pts: [[270, 250], [330, 278], [372, 296]], next: 'C' },
      C: { t: 'belt', x0: 358, x1: 494, y: 342, outs: ['cup:blue', 'cup:yellow'], lever: 'C', state: 0 },
      S: { t: 'see', x: 480, y: 262, outs: ['C', 's1'], lever: 'S', state: 0 },
      s1: { t: 'ramp', pts: [[532, 286], [596, 316], [626, 326]], next: 'F' },
      F: { t: 'flip', x: 640, y: 332, outs: ['f0', 'cup:purple'], lever: 'F', apexY: 262 },
      f0: { t: 'ramp', pts: [[640, 332], [604, 368], [594, 374]], next: 'cup:green' },
      K5: { t: 'bump', x: 712, y: 250, apex: 18, next: 'k5r' },
      k5r: { t: 'ramp', pts: [[734, 290], [652, 328]], next: 'F' },
    },
    levers: { A: { x: 92, row: 8, icon: 'star' }, C: { x: 92, row: 14, icon: 'leaf' }, S: { x: 868, row: 8, icon: 'moon' }, F: { x: 868, row: 14, icon: 'heart' } },
    jackpot: true,
  },
};
const gumballBig = () => (typeof hudBig === 'function' && hudBig());
const gumballCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);   // 1-player mode: the computer's character
const gumballFont = (n, w) => (w || '700') + ' ' + n + 'px "Atkinson Hyperlegible", system-ui, sans-serif';

/* ---------- each player's own keys (keyboard, controller or touch) for prompts and the job cards ---------- */
function gumballDevice(id) { try { return actKey(id); } catch (e) { return 'kb'; } }
function gumballKey(id, what) {
  const d = gumballDevice(id), solo = typeof cpuSolo === 'function' && cpuSolo();
  const pad = d === 'pad', touch = d === 'touch';
  if (what === 'act') return pad ? glyph('act') : touch ? '●' : solo ? 'F' : id === 0 ? 'F' : '/';
  if (what === 'lr') return pad ? '◀ ▶' : touch ? '◀ ▶' : solo ? '◀ ▶' : id === 0 ? 'A D' : '← →';
  if (what === 'left') return pad || touch ? '◀' : solo ? '◀' : id === 0 ? 'A' : '←';
  if (what === 'right') return pad || touch ? '▶' : solo ? '▶' : id === 0 ? 'D' : '→';
  if (what === 'down') return pad || touch ? '▼' : solo ? '▼' : id === 0 ? 'S' : '↓';
  if (what === 'up') return pad ? glyph('a') : touch ? '▲' : solo ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'move') return pad ? 'stick' : touch ? '◀ ▶ ▲' : solo ? 'arrows' : id === 0 ? 'WASD' : '↑←↓→';
  return '';
}
const gumballLeverName = l => 'the ' + (GUMBALL_ICON_NAME[l.icon] || 'star') + ' lever';

/* ---------- a machine (room) ---------- */
function gumballRoom(st, L) {
  const def = L.def, k = def.roomIndex || 0, M = GUMBALL_MACHINES[def.machine] || GUMBALL_MACHINES.start;
  st.k = k; st.M = M; st.title = def.title || ''; st.crank = def.crank || 0; st.keep = 1 - st.crank;
  st.pc = {};
  for (const id of Object.keys(M.pieces)) {
    const src = M.pieces[id], pc = Object.assign({}, src, { id, state: src.state || 0, anim: src.state || 0, hit: 0, flick: 0, open: 0, rot: 0, on: 0, ball: 0 });
    if (pc.outs) pc.outs = pc.outs.slice();
    if (pc.t === 'spin') pc.rr = pc.r + GUMBALL.r + 2;
    st.pc[id] = pc;
  }
  st.devs = Object.values(st.pc).filter(pc => GUMBALL_DEV[pc.t]);
  st.cups = M.cups.map(([col, x]) => ({ id: 'cup:' + col, col, x, w: M.cupW, need: M.need, filled: 0, wob: 0, lid: 0, glow: 0, stack: [] }));
  st.cupBy = {};
  for (const c of st.cups) st.cupBy[c.id] = c;
  st.levers = Object.keys(M.levers).map(id => {
    const l = M.levers[id], dev = st.devs.find(d => d.lever === id) || null;
    return { id, x: l.x, row: l.row, feet: l.row * T, icon: l.icon, dev: dev ? dev.id : null, flash: 0, near: 0, tilt: dev ? dev.state : 0 };
  });
  for (const lv of st.levers) { const d = st.pc[lv.dev]; if (d) d.icon = lv.icon; if (tile(Math.floor(lv.x / T), lv.row) !== '=' && tile(Math.floor(lv.x / T), lv.row) !== '#') console.warn('Gumball: lever ' + lv.id + ' has no ledge under it'); }
  st.queue = M.order ? M.order.slice() : gumballShuffle(M);
  st.total = st.queue.length; st.sorted = 0;
  st.balls = []; st.bid = st.bid || 0;
  st.chute = Math.floor((M.chutes.length - 1) / 2); st.nozX = M.chutes[st.chute].x; st.nozAnim = 0;
  st.crankT = 0; st.crankCD = 0; st.crankRot = 0; st.swapA = 0; st.callCD = [0, 0]; st.readyCD = [0, 0]; st.flipCD = [0, 0]; st.wrongCD = [0, 0];
  st.phase = 'play'; st.winT = 0; st.roomT = 0; st.bloopsRoom = 0; st.noSortT = 0; st.waitT = 0; st.colorBloops = {};
  st.goldPath = false; st.slow = false; st.hintLatch = 0; st.jack = null; st.rain = [];
  st.pops = []; st.news = null; st.calls = [null, null];
  st.inp = [{}, {}];
  st.needsTick = -1; st.needs = null; st.pathCache = null;
  st.stats.roomT[k] = null; st.stats.roomTitles[k] = st.title;
  st.inRoom = [false, false];
  gumballPlace(st);
  gumballActLabels(st);
}
// a fresh order for a machine: every cup's gumballs, shuffled, never three of a colour in a row
function gumballShuffle(M) {
  let q = [];
  for (let tries = 0; tries < 40; tries++) {
    q = [];
    for (const [col] of M.cups) for (let i = 0; i < M.need; i++) q.push(col);
    for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
    let ok = true;
    for (let i = 2; i < q.length; i++) if (q[i] === q[i - 1] && q[i] === q[i - 2]) ok = false;
    if (ok) break;
  }
  return q;
}
// the cranker at the crank, the keeper on the floor at the left
function gumballPlace(st) {
  const ps = G.players, c = ps[st.crank], k = ps[st.keep];
  Object.assign(c, { x: GUMBALL.crankerX - PW / 2, y: GUMBALL.crankerFeet - PH, vx: 0, vy: 0, grounded: true, alive: true, face: -1 });
  Object.assign(k, { x: 92 - PW / 2, y: 17 * T - PH, vx: 0, vy: 0, grounded: true, alive: true, face: 1, jumping: false, jumpBuf: 0, pendingJump: false });
  for (const p of ps) { p.pendingAct = false; p.downLatch = true; p.stun = 0; }
}

/* ---------- devices ---------- */
// the state a device has right now (or in a look-ahead S: an override, or a trapdoor that will have shut by then)
function gumballState(st, id, S) {
  const pc = st.pc[id];
  if (!pc) return 0;
  if (S && S.over && S.over[id] != null) return S.over[id];
  if (pc.t === 'flip') return 0;
  if (pc.timed) return pc.open > (S ? S.t : 0) ? 1 : 0;
  return pc.state;
}
const gumballSlowK = st => (st.slow ? GUMBALL.slow : 1);
// the keeper works a lever: flip, open, reverse or flick its device
function gumballUseLever(st, lv, p) {
  const pc = st.pc[lv.dev];
  if (!pc) return;
  if (pc.t === 'see' && pc.ball > 0) {
    if (st.wrongCD[p.id] <= 0) { st.wrongCD[p.id] = 1.2; gumballPop(st, p.x + p.w / 2, p.y - 18, 'Wait! A gumball is on it', '#ffffff', 15); Sfx.play('gumballNope', p.id); }
    return;
  }
  st.flipCD[p.id] = GUMBALL.flipCD; lv.flash = 1;
  st.stats.flips[p.id]++;
  if (pc.t === 'flip') {
    pc.flick = 1;
    Sfx.play('gumballThwack', p.id);
    const b = st.balls.find(q => q.ph === 'rest' && q.piece === pc.id);
    if (b) gumballFlick(st, b, pc, null);
  } else if (pc.timed) {
    // a trapdoor: a press opens it for 3 s; a press while it is open shuts it again (not in its first 0.6 s, so a
    // double tap doesn't undo itself)
    const full = GUMBALL.openT / gumballSlowK(st);
    if (pc.open > 0 && pc.open < full - 0.6) { pc.open = 0; pc.state = 0; Sfx.play('gumballShut'); }
    else if (pc.open > 0) { st.flipCD[p.id] = 0; lv.flash = 0; st.stats.flips[p.id]--; return; }
    else { pc.open = full; pc.state = 1; Sfx.play('gumballOpen', p.id); }
  } else {
    pc.state ^= 1;
    Sfx.play(pc.t === 'belt' ? 'gumballBelt' : pc.t === 'spin' ? 'gumballSpin' : 'gumballFlip', p.id);
  }
  pc.hit = 1;
  rumble(p.id, 0, 0.3, 70);
  for (let i = 0; i < 8; i++) G.particles.push({ x: lv.x, y: lv.feet - 44, vx: (Math.random() - 0.5) * 140, vy: -Math.random() * 120, life: 0.45, max: 0.45, col: PCOL[p.id], size: 2.5 + Math.random() * 2.5, grav: 300, kind: 'dot' });
}
function gumballLeverAt(st, p) {
  if (!p.alive || !p.grounded) return null;
  const cx = p.x + p.w / 2, feet = p.y + p.h;
  for (const lv of st.levers) if (Math.abs(cx - lv.x) <= GUMBALL.reach && Math.abs(feet - lv.feet) < 4) return lv;
  return null;
}

/* ---------- gumballs: one piece of track after another ---------- */
// where a gumball arriving at a piece starts on it
function gumballEntry(st, id, b) {
  if (id.startsWith('cup:')) {
    const c = st.cupBy[id] || (st.jack && st.jack.cup.id === id ? st.jack.cup : null);
    if (!c) return [b.x, GUMBALL.cupMouth];
    return [clamp(b.x + b.vx * 0.06, c.x - c.w / 2 + 18, c.x + c.w / 2 - 18), GUMBALL.cupMouth];
  }
  const pc = st.pc[id];
  if (!pc) return [b.x, b.y];
  switch (pc.t) {
    case 'ramp': return pc.pts[0];
    case 'see': return [pc.x, pc.y - GUMBALL.r - 4];
    case 'spin': return [pc.x, pc.y - pc.rr];
    case 'belt': return [clamp(b.x, pc.x0 + 8, pc.x1 - 8), pc.y];
    default: return [pc.x, pc.y];
  }
}
// send a gumball on to piece id: straight on if it starts right here, else a fall (a real parabola) onto it
function gumballGo(st, b, id, S) {
  const [tx, ty] = gumballEntry(st, id, b);
  if (Math.hypot(tx - b.x, ty - b.y) < 3 && b.apexY == null) { b.x = tx; b.y = ty; gumballArrive(st, b, id, S); return; }
  const g = GUMBALL.g;
  let vy0, Tt;
  if (b.apexY != null) {
    const ya = Math.min(b.apexY, b.y - 4, ty - 4);
    vy0 = -Math.sqrt(2 * g * (b.y - ya)); Tt = -vy0 / g + Math.sqrt(2 * (ty - ya) / g); b.apexY = null;
  } else if (ty > b.y + 1) {
    vy0 = clamp(b.vy, -200, 420); Tt = (-vy0 + Math.sqrt(vy0 * vy0 + 2 * g * (ty - b.y))) / g;
  } else {
    const ya = Math.min(b.y, ty) - 16;
    vy0 = -Math.sqrt(2 * g * (b.y - ya)); Tt = -vy0 / g + Math.sqrt(2 * (ty - ya) / g);
  }
  Tt = Math.max(0.04, Tt);
  b.f = { x0: b.x, y0: b.y, vx: (tx - b.x) / Tt, vy0, T: Tt };
  b.t = 0; b.ph = 'fall'; b.after = id;
}
// a gumball reaches piece id: devices decide which way it goes on
function gumballArrive(st, b, id, S) {
  if (S && S.stopAt === id) { S.done = true; S.arrived = true; return; }
  if (id.startsWith('cup:')) { gumballInCup(st, b, id, S); return; }
  const pc = st.pc[id];
  if (!pc) { b.ph = 'done'; return; }
  b.piece = id;
  if (S && S.path) S.path.push([b.x, b.y]);
  switch (pc.t) {
    case 'ramp': {
      b.ph = 'ramp'; b.seg = 0; b.s = 0;
      const [x0, y0] = pc.pts[0], [x1, y1] = pc.pts[1], len = Math.hypot(x1 - x0, y1 - y0) || 1;
      b.v = clamp(((b.vx || 0) * (x1 - x0) + (b.vy || 0) * (y1 - y0)) / len, GUMBALL.vMin, GUMBALL.vMax);
      break;
    }
    case 'gate': {
      const s = gumballState(st, id, S);
      if (!S) { pc.hit = 1; Sfx.play('gumballClick'); if (b.route) b.route.push(id + ':' + s); }
      gumballGo(st, b, pc.outs[s], S);
      break;
    }
    case 'see': {
      const s = gumballState(st, id, S);
      b.ph = 'see'; b.dir = s; b.s = 0; b.v = 40;
      const d = s ? 1 : -1, c = Math.cos(GUMBALL.seeTilt), sn = Math.sin(GUMBALL.seeTilt);
      b.sx0 = pc.x; b.sy0 = pc.y - GUMBALL.r - 4; b.sx1 = pc.x + d * c * GUMBALL.seeLen; b.sy1 = pc.y + sn * GUMBALL.seeLen - GUMBALL.r - 4;
      if (!S) { pc.ball++; pc.hit = 1; Sfx.play('gumballTok'); if (b.route) b.route.push(id + ':' + s); }
      break;
    }
    case 'spin': b.ph = 'spin'; b.a = 0; b.t = 0; if (!S) { pc.hit = 1; Sfx.play('gumballTok'); } break;
    case 'belt': b.ph = 'belt'; b.t = 0; b.y = pc.y; if (!S) { pc.hit = 1; Sfx.play('gumballTok'); } break;
    case 'flip': {
      b.ph = 'rest'; b.t = 0; b.x = pc.x; b.y = pc.y;
      if (S) { if (S.over && S.over[id] === 1) gumballFlick(st, b, pc, S); }
      else { pc.hit = 1; Sfx.play('gumballTok'); if (pc.flick > 0.75) gumballFlick(st, b, pc, null); }
      break;
    }
    case 'bump': {
      if (!S) { pc.hit = 1; Sfx.play('gumballBoing'); gumballPop(st, pc.x, pc.y - 22, 'Boing!', '#ffffff', 14); }
      b.apexY = pc.y - (pc.apex || 20);
      gumballGo(st, b, pc.next, S);
      break;
    }
    case 'pegs': {
      b.ph = 'peg'; b.t = 0; b.wi = 0;
      const n = pc.rows || 3, wps = [[b.x, b.y]];
      for (let i = 1; i <= n; i++) {
        const u = i / n, j = i === n ? 0 : ((hash(b.id * 13 + i, pc.x | 0) % 1000) / 1000 - 0.5) * (pc.w || 40) * (1 - u * 0.6);
        wps.push([pc.x + (pc.x2 - pc.x) * u + j, pc.y + (pc.y2 - pc.y) * u]);
      }
      b.wps = wps;
      break;
    }
    default: b.ph = 'done';
  }
}
// the flipper flicks a resting gumball up and over into the far cup
function gumballFlick(st, b, pc, S) {
  b.apexY = pc.apexY || pc.y - 70;
  if (!S) {
    pc.flick = 1; pc.ball = 0;
    Sfx.play('gumballThwack'); gumballPop(st, pc.x, pc.y - 30, 'Thwack!', '#fff3a8', 18);
    if (b.route) b.route.push(pc.id + ':1');
    st.stats.flicks++;
  }
  b.vx = 0; b.vy = -300;
  gumballGo(st, b, pc.outs[1], S);
}
// one gumball moves for dt (S: a look-ahead copy that changes nothing in the machine)
function gumballBallStep(st, b, dt, S) {
  const k = S ? S.sc : gumballSlowK(st), D = dt * k, R = GUMBALL;
  b.spin = (b.spin || 0) + (b.vx || 0) * D / R.r;
  switch (b.ph) {
    case 'feed': {
      b.y = R.trayY; b.x = approach(b.x, b.tx, R.feedV * D); b.vx = Math.sign(b.tx - b.x) * R.feedV;
      if (b.x === b.tx) { b.vx = 0; b.vy = 60; b.y = R.nozzleY; if (!S) Sfx.play('gumballDrop'); gumballGo(st, b, b.to, S); }
      break;
    }
    case 'fall': {
      b.t += D;
      const f = b.f;
      if (b.t >= f.T) { b.x = f.x0 + f.vx * f.T; b.y = f.y0 + f.vy0 * f.T + 0.5 * R.g * f.T * f.T; b.vx = f.vx; b.vy = f.vy0 + R.g * f.T; gumballArrive(st, b, b.after, S); }
      else { b.x = f.x0 + f.vx * b.t; b.y = f.y0 + f.vy0 * b.t + 0.5 * R.g * b.t * b.t; b.vx = f.vx; b.vy = f.vy0 + R.g * b.t; }
      break;
    }
    case 'ramp': {
      const pc = st.pc[b.piece], pts = pc.pts;
      let [x0, y0] = pts[b.seg], [x1, y1] = pts[b.seg + 1], len = Math.hypot(x1 - x0, y1 - y0) || 1;
      b.v += R.rollA * ((y1 - y0) / len) * D - R.drag * b.v * D;
      b.v = clamp(b.v, R.vMin, R.vMax);
      b.s += b.v * D;
      while (b.s >= len) {
        b.s -= len; b.seg++;
        if (b.seg >= pts.length - 1) {
          b.x = x1; b.y = y1; b.vx = b.v * (x1 - x0) / len; b.vy = b.v * (y1 - y0) / len;
          gumballGo(st, b, pc.next, S);
          return;
        }
        [x0, y0] = pts[b.seg]; [x1, y1] = pts[b.seg + 1]; len = Math.hypot(x1 - x0, y1 - y0) || 1;
      }
      b.x = x0 + (x1 - x0) * b.s / len; b.y = y0 + (y1 - y0) * b.s / len;
      b.vx = b.v * (x1 - x0) / len; b.vy = b.v * (y1 - y0) / len;
      break;
    }
    case 'peg': {
      b.t += D;
      const n = b.wps.length - 1;
      while (b.t >= R.pegHop && b.wi < n) {
        b.t -= R.pegHop; b.wi++;
        if (!S) Sfx.play('gumballPlink');
      }
      if (b.wi >= n) {
        const pc = st.pc[b.piece];
        b.x = b.wps[n][0]; b.y = b.wps[n][1]; b.vx = 0; b.vy = 90;
        gumballGo(st, b, pc.next, S);
        return;
      }
      const u = b.t / R.pegHop, [ax, ay] = b.wps[b.wi], [bx, by] = b.wps[b.wi + 1];
      b.x = ax + (bx - ax) * u; b.y = ay + (by - ay) * u - Math.sin(u * Math.PI) * 7;
      b.vx = (bx - ax) / R.pegHop;
      break;
    }
    case 'see': {
      const pc = st.pc[b.piece], len = Math.hypot(b.sx1 - b.sx0, b.sy1 - b.sy0);
      b.v = clamp(b.v + R.rollA * Math.sin(R.seeTilt) * D, 30, R.vMax);
      b.s += b.v * D;
      const u = Math.min(1, b.s / len);
      b.x = b.sx0 + (b.sx1 - b.sx0) * u; b.y = b.sy0 + (b.sy1 - b.sy0) * u;
      b.vx = b.v * (b.sx1 - b.sx0) / len; b.vy = b.v * (b.sy1 - b.sy0) / len;
      if (u >= 1) {
        if (!S) { pc.ball = Math.max(0, pc.ball - 1); pc.state ^= 1; Sfx.play('gumballTip'); }
        gumballGo(st, b, pc.outs[b.dir], S);
      }
      break;
    }
    case 'spin': {
      const pc = st.pc[b.piece], s = gumballState(st, b.piece, S), w = (s ? 1 : -1) * R.spinW;
      b.t += D; b.a += w * D;
      if (b.t > R.spinCap && Math.abs(b.a) < R.spinExit) b.a += Math.sign(b.a || 1) * R.spinW * D * 2;
      b.x = pc.x + pc.rr * Math.sin(b.a); b.y = pc.y - pc.rr * Math.cos(b.a);
      b.vx = pc.rr * Math.cos(b.a) * w; b.vy = pc.rr * Math.sin(b.a) * w;
      if (Math.abs(b.a) >= R.spinExit) gumballGo(st, b, pc.outs[b.a > 0 ? 1 : 0], S);
      break;
    }
    case 'belt': {
      const pc = st.pc[b.piece], s = gumballState(st, b.piece, S);
      let d = s ? 1 : -1;
      b.t += D;
      if (b.t > R.beltCap) d = b.x - pc.x0 < pc.x1 - b.x ? -1 : 1;
      b.x += d * R.beltV * D; b.y = pc.y; b.vx = d * R.beltV; b.vy = 0;
      if (b.x <= pc.x0) { b.vx = -R.beltV; b.vy = 20; gumballGo(st, b, pc.outs[0], S); }
      else if (b.x >= pc.x1) { b.vx = R.beltV; b.vy = 20; gumballGo(st, b, pc.outs[1], S); }
      break;
    }
    case 'rest': {
      const pc = st.pc[b.piece];
      b.t += D; b.vx = 0; b.vy = 0;
      if (!S) pc.ball = 1;
      if (b.t >= R.restT) {
        if (!S) { pc.ball = 0; Sfx.play('gumballTok'); if (b.route) b.route.push(pc.id + ':0'); }
        b.vx = -40; b.vy = 40;
        gumballGo(st, b, pc.outs[0], S);
      }
      break;
    }
    case 'cup': {
      b.t += dt;
      b.y = Math.min(b.cupY, b.y + 260 * dt);
      if (b.t >= R.cupT) gumballCupDone(st, b);
      break;
    }
    case 'pop': {
      b.t += dt;
      const u = Math.min(1, b.t / R.popT), P = b.popFrom;
      b.x = P[0] + (R.globe.x + (b.id % 5 - 2) * 9 - P[0]) * u;
      b.y = P[1] + (R.globe.y + 10 - P[1]) * u - Math.sin(u * Math.PI) * 120;
      b.spin += dt * 12;
      if (u >= 1) { b.ph = 'done'; st.queue.push(b.col); Sfx.play('gumballBack'); }
      break;
    }
    default: break;
  }
}
// into a cup: the right colour is "Yum!", a wrong one goes "Bloop!" and back to the globe
function gumballInCup(st, b, id, S) {
  if (S) { S.done = true; S.end = id; if (S.path) S.path.push([b.x, b.y]); return; }
  const c = st.cupBy[id] || (st.jack && st.jack.cup.id === id ? st.jack.cup : null);
  b.ph = 'cup'; b.t = 0; b.cup = id; b.piece = null;
  const right = !!c && c.col === b.col && c.filled < c.need && !c.lid;
  b.right = right;
  b.cupY = right ? GUMBALL.cupBot - 12 - Math.min(c.filled, 5) * 9 : GUMBALL.cupMouth + 10;
  if (c) c.wob = 1;
}
function gumballCupDone(st, b) {
  const c = st.cupBy[b.cup] || (st.jack && st.jack.cup.id === b.cup ? st.jack.cup : null), R = GUMBALL;
  if (b.right && c) {
    c.filled++; c.glow = 1; b.ph = 'done';
    c.stack.push({ x: b.x - c.x, col: b.col, spin: b.spin });
    st.sorted++; st.noSortT = 0; st.stats.sorted++;
    if (b.first && b.col !== 'gold') st.stats.firstTry++;
    if (c.col === 'gold') { gumballJackpotWin(st); return; }
    Sfx.play('gumballYum'); rumble(0, 0, 0.3, 80); rumble(1, 0, 0.3, 80);
    gumballPop(st, c.x, R.cupMouth - 20, c.filled >= c.need ? 'Full! Yum!' : 'Yum!', GUMBALL_COL[c.col].light, 20);
    burst(c.x, R.cupMouth, GUMBALL_COL[c.col].fill, 10);
    if (c.filled >= c.need) { c.lid = 0.01; Sfx.play('gumballFull'); }
  } else {
    b.ph = 'pop'; b.t = 0; b.popFrom = [b.x, b.y]; b.first = false;
    st.bloopsRoom++; st.stats.bloops++;
    st.colorBloops[b.col] = (st.colorBloops[b.col] || 0) + 1;
    const lid = c && (c.lid || c.filled >= c.need) && c.col !== b.col;
    gumballPop(st, c ? c.x : b.x, R.cupMouth - 22, b.col === 'gold' ? 'Boing! Into the gold star!' : lid ? 'Boing! That cup is full!' : 'Bloop! Wrong cup!', '#ffffff', 19);
    Sfx.play('gumballBloop'); rumble(0, 0.2, 0.2, 90); rumble(1, 0.2, 0.2, 90);
    gumballHelpCheck(st);
  }
}

/* ---------- the plan: which way each gumball can go (prompts, the gold path and the computer all read it) ---------- */
// every way from piece id to a cup: { end, req: [[device, state]...] } (each device two ways, no loops)
function gumballRoutes(st, id) {
  const out = [];
  const walk = (pid, req, depth) => {
    if (depth > 40 || !pid) return;
    if (pid.startsWith('cup:')) { out.push({ end: pid, req }); return; }
    const pc = st.pc[pid];
    if (!pc) return;
    if (GUMBALL_DEV[pc.t]) {
      const had = req.find(r => r[0] === pid);
      for (const s of [0, 1]) { if (had && had[1] !== s) continue; walk(pc.outs[s], had ? req : req.concat([[pid, s]]), depth + 1); }
    } else walk(pc.next, req, depth + 1);
  };
  walk(id, [], 0);
  return out;
}
const gumballTimedReq = (st, d, s) => s === 1 && (st.pc[d].t === 'flip' || st.pc[d].timed);
// what a way costs the keeper: a flip for every device set the other way, a bit more for a timed press
function gumballCost(st, req) {
  let c = 0;
  for (const [d, s] of req) c += gumballTimedReq(st, d, s) ? 1.2 : gumballState(st, d) !== s ? 1 : 0;
  return c;
}
// the cup a gumball of colour col belongs in
const gumballCupFor = (st, col) => (col === 'gold' && st.jack ? st.jack.cup.id : 'cup:' + col);
// the cheapest way from piece id to the right cup that doesn't need a device another gumball is still counting on
function gumballBest(st, id, col, lock) {
  let best = null;
  const want = gumballCupFor(st, col);
  for (const r of gumballRoutes(st, id)) {
    if (r.end !== want) continue;
    if (lock && r.req.some(([d, s]) => lock[d] != null && lock[d] !== s)) continue;
    const cost = gumballCost(st, r.req);
    if (!best || cost < best.cost) best = { req: r.req, cost, end: r.end };
  }
  return best;
}
// where a gumball goes next that still matters (a device it is riding still decides)
function gumballAhead(st, b) {
  switch (b.ph) {
    case 'feed': return b.to;
    case 'fall': return b.after;
    case 'ramp': case 'peg': return b.piece;
    case 'see': return st.pc[b.piece].outs[b.dir];
    case 'spin': case 'belt': case 'rest': return b.piece;
    default: return null;
  }
}
const gumballLive = b => b.ph !== 'cup' && b.ph !== 'pop' && b.ph !== 'done';
// look ahead: how long until the gumball arrives at device dev (Infinity if it never does), with these states
function gumballEta(st, b, dev, over) {
  const S = { t: 0, over: over || null, stopAt: dev, sc: gumballSlowK(st), done: false, arrived: false };
  if (b.ph === 'rest' && b.piece === dev) return 0;
  if ((b.ph === 'spin' || b.ph === 'belt') && b.piece === dev) return 0;
  const c = Object.assign({}, b), step = 1 / 60;
  c.route = null;
  while (!S.done && S.t < 9) { gumballBallStep(st, c, step, S); S.t += step; if (!gumballLive(c)) break; }
  return S.arrived ? S.t : Infinity;
}
// the dotted way a gumball will roll from here with the machine as it is (the gold path)
function gumballTrace(st, b, maxT) {
  const S = { t: 0, over: null, stopAt: null, sc: gumballSlowK(st), done: false, path: [], end: null };
  const c = Object.assign({}, b), step = 1 / 60;
  c.route = null;
  let k = 0;
  S.path.push([c.x, c.y]);
  while (!S.done && S.t < (maxT || 9)) {
    gumballBallStep(st, c, step, S); S.t += step;
    if (++k % 3 === 0) S.path.push([c.x, c.y]);
    if (!gumballLive(c)) break;
  }
  return { path: S.path, end: S.end };
}
// the jobs right now: every gumball on the board first (in order), then the next one in the globe from the nozzle
//   jobs: [{ dev, kind: 'flip' (set it to want) | 'time' (a trapdoor to open as it comes) | 'flick', b (null: the
//   next gumball), lever }], next: { col, best, bestAny, chuteBest }, ready (the next gumball's way is set), busy
//   (gumballs on the board that still pass a device)
function gumballNeeds(st) {
  if (st.needsTick === G.tickN && st.needs) return st.needs;
  st.needsTick = G.tickN;
  const jobs = [], lock = {};
  let busy = 0;
  const leverOf = d => st.levers.find(l => l.dev === d) || null;
  for (const b of st.balls) {
    if (!gumballLive(b)) continue;
    const from = gumballAhead(st, b);
    if (!from) continue;
    const best = gumballBest(st, from, b.col, lock);
    b.plan = best;
    if (gumballRoutes(st, from).some(r => r.req.length)) busy++;
    if (!best) continue;
    for (const [d, s] of best.req) {
      lock[d] = s;
      const pc = st.pc[d];
      if (pc.t === 'flip' && s === 1) jobs.push({ dev: d, kind: 'flick', b, lever: leverOf(d) });
      else if (pc.timed && s === 1) jobs.push({ dev: d, kind: 'time', b, lever: leverOf(d) });
      else if (gumballState(st, d) !== s) jobs.push({ dev: d, kind: 'flip', want: s, b, lever: leverOf(d) });
    }
  }
  const col = st.queue[0];
  let next = null, ready = false;
  if (col && st.phase === 'play') {
    const ch = st.M.chutes[st.chute];
    next = { col, best: gumballBest(st, ch.to, col, lock), chuteBest: -1, bestAny: null };
    st.M.chutes.forEach((c, i) => {
      const bb = gumballBest(st, c.to, col, lock);
      if (bb && (!next.bestAny || bb.cost + Math.abs(i - st.chute) * 0.3 < next.bestAny.cost + Math.abs(next.chuteBest - st.chute) * 0.3)) { next.bestAny = bb; next.chuteBest = i; }
    });
    if (next.best) {
      ready = true;
      for (const [d, s] of next.best.req) {
        const pc = st.pc[d];
        if (pc.t === 'flip' && s === 1) jobs.push({ dev: d, kind: 'flick', b: null, lever: leverOf(d) });
        else if (pc.timed && s === 1) jobs.push({ dev: d, kind: 'time', b: null, lever: leverOf(d) });
        else if (gumballState(st, d) !== s) { ready = false; jobs.push({ dev: d, kind: 'flip', want: s, b: null, lever: leverOf(d) }); }
      }
    }
  }
  st.needs = { jobs, next, ready, busy, lock };
  return st.needs;
}

/* ---------- the cranker and the keeper ---------- */
function gumballCrank(st, p) {
  const R = GUMBALL;
  if (st.crankCD > 0 || !st.queue.length || st.phase !== 'play') return;
  const live = st.balls.filter(gumballLive).length;
  if (live >= R.maxBalls) {
    if (st.wrongCD[p.id] <= 0) { st.wrongCD[p.id] = 1.4; gumballPop(st, R.crankerX, R.crankerFeet - 50, 'Wait! The board is busy', '#ffffff', 15); Sfx.play('gumballNope', p.id); }
    return;
  }
  const col = st.queue.shift(), ch = st.M.chutes[st.chute];
  const b = { id: ++st.bid, col, ph: 'feed', x: R.mouthX, y: R.trayY, vx: 0, vy: 0, spin: 0, tx: ch.x, to: ch.to, chute: st.chute, route: [], first: true, born: G.time };
  // a gumball that already bounced once doesn't count as right first time
  const back = (st.backs[col] || 0) > 0;
  if (back) { b.first = false; st.backs[col]--; }
  st.balls.push(b);
  st.crankT = R.crankAnim; st.crankCD = R.crankCD; st.waitT = 0;
  st.stats.cranks[p.id]++;
  Sfx.play('gumballCrank', p.id); rumble(p.id, 0.1, 0.3, 120);
  p.sx = 1.15; p.sy = 0.88;
}
function gumballCranker(st, p, dt) {
  const inp = p.input, P = st.inp[p.id], M = st.M, R = GUMBALL;
  const edge = k => inp[k] && !P[k];
  const feeding = st.balls.some(b => b.ph === 'feed');
  if ((edge('left') || edge('right')) && M.chutes.length > 1) {
    const d = edge('right') ? 1 : -1, n = clamp(st.chute + d, 0, M.chutes.length - 1);
    if (n !== st.chute && !feeding) { st.chute = n; st.nozAnim = 1; Sfx.play('gumballSlide', p.id); st.stats.chuteMoves++; }
    else if (n === st.chute) Sfx.play('gumballNope', p.id);
  }
  if (edge('down')) {
    if (st.queue.length >= 2 && st.queue[0] !== st.queue[1]) { [st.queue[0], st.queue[1]] = [st.queue[1], st.queue[0]]; st.swapA = 1; Sfx.play('gumballSwap', p.id); st.stats.swaps++; }
    else if (st.wrongCD[p.id] <= 0) { st.wrongCD[p.id] = 1; gumballPop(st, R.crankerX, R.crankerFeet - 50, st.queue.length >= 2 ? 'Same colour!' : 'Nothing to swap', '#ffffff', 14); }
  }
  if (p.pendingJump) {
    p.pendingJump = false;
    if (st.queue.length && st.callCD[p.id] <= 0) {
      st.callCD[p.id] = R.callCD;
      const c = GUMBALL_COL[st.queue[0]];
      st.calls[p.id] = { s: c.name + ' next!', col: c.fill, t: 0, ball: st.queue[0] }; st.stats.calls++;
      Sfx.play('gumballCall', p.id);
    }
  }
  if (p.pendingAct) { p.pendingAct = false; gumballCrank(st, p); }
  st.nozX += (M.chutes[st.chute].x - st.nozX) * Math.min(1, dt * 14);
  for (const k of ['left', 'right', 'down']) P[k] = !!inp[k];
  // the cranker stays at the crank
  Object.assign(p, { x: R.crankerX - PW / 2, y: R.crankerFeet - PH, vx: 0, vy: 0, grounded: true, face: -1 });
}
function gumballKeeper(st, p, dt) {
  const o = G.players[1 - p.id], oa = o.alive, was = p.grounded;
  o.alive = false;   // (the cranker is far away anyway; partners never bump here)
  let landV = 0;
  try {
    control(p, dt);
    const vy0 = p.vy;
    moveX(p, p.vx * dt, true);
    moveY(p, p.vy * dt, true);
    const pr = probe(p);
    p.tileGround = pr.tile; p.onPartner = false; p.onOneWay = pr.oneway; p.grounded = pr.tile;
    if (p.grounded && !was) landV = vy0;
  } finally { o.alive = oa; }
  if (landV > 300) { p.sx = 1.2; p.sy = 0.82; puff(p.x + p.w / 2, p.y + p.h, 4, 'rgba(255,240,250,0.85)'); Sfx.play('land'); }
  if (p.y > H + 40) { p.x = 92 - PW / 2; p.y = 17 * T - PH; p.vx = p.vy = 0; }
  if (p.pendingAct) {
    p.pendingAct = false;
    const lv = gumballLeverAt(st, p);
    if (lv) { if (st.flipCD[p.id] <= 0) gumballUseLever(st, lv, p); }
    else if (st.readyCD[p.id] <= 0) {
      st.readyCD[p.id] = GUMBALL.readyCD;
      st.calls[p.id] = { s: 'Ready!', col: PCOL[p.id], t: 0 };
      st.lastReady = G.time;
      Sfx.play('gumballReady', p.id);
    }
  }
}

/* ---------- help, hints, news ---------- */
function gumballNews(st, s, gold, life) { st.news = { s, gold: !!gold, t: 0, life: life || GUMBALL.newsLife }; }
function gumballPop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 10) st.pops.shift(); }
function gumballHelpCheck(st) {
  if (!st.goldPath && (st.bloopsRoom >= GUMBALL.goldPathBloops || st.noSortT >= GUMBALL.goldPathStuck)) {
    st.goldPath = true; st.stats.helps++;
    gumballNews(st, 'Gold path! The gold line shows where each gumball goes', true);
    Sfx.play('gumballGold');
  }
  if (!st.slow && st.bloopsRoom >= GUMBALL.slowBloops) {
    st.slow = true; st.stats.helps++;
    gumballNews(st, 'Gold slow-mo! Gumballs roll slower in this machine', true, 4.6);
    Sfx.play('gumballGold');
  }
}
// show the "what to do next" hints? (always in Machine 1; later after a wait, a bloop of that colour, or gold path)
function gumballHintsOn(st) {
  if (st.k === 0 || st.goldPath || st.hintLatch > 0) return true;
  return gumballHintsWant(st);
}
// (once on, they stay on for a while, so a hint doesn't vanish halfway through the gumball it was about)
function gumballHintsWant(st) {
  const col = st.queue[0];
  if (st.waitT > GUMBALL.hintWait) return true;
  return !!(col && st.colorBloops[col]) || st.balls.some(b => gumballLive(b) && st.colorBloops[b.col]);
}

/* ---------- the finish: machine clear, the jackpot, the gumball rain ---------- */
function gumballCheckDone(st) {
  if (st.phase !== 'play') return;
  if (st.jack) return;
  if (!st.cups.every(c => c.filled >= c.need) || st.balls.some(b => b.ph !== 'done')) return;
  st.stats.roomT[st.k] = st.roomT;
  if (st.M.jackpot) {
    // the golden jackpot gumball: flick it into the gold star
    const pu = st.cups.find(c => c.col === 'purple') || st.cups[st.cups.length - 1];
    st.jack = { cup: { id: 'cup:jackpot', col: 'gold', x: pu.x, w: pu.w, need: 1, filled: 0, wob: 0, lid: 0, glow: 0, stack: [] }, t: 0 };
    st.pc.F.outs[1] = 'cup:jackpot';
    for (const c of st.cups) c.lid = Math.max(c.lid, 0.01);
    st.queue = ['gold']; st.total = 1; st.sorted = 0;
    gumballNews(st, 'JACKPOT gumball! Flick it into the gold star!', true, 5);
    Sfx.play('gumballGold');
    return;
  }
  st.phase = 'won'; st.winT = 0;
  Sfx.play('gumballClear'); rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250);
  for (let i = 0; i < 40; i++) confetti(GUMBALL.globe.x, GUMBALL.globe.y + 40);
}
function gumballJackpotWin(st) {
  st.phase = 'rain'; st.winT = 0; st.stats.jackpot = true;
  st.stats.roomT[st.k] = st.roomT;
  Sfx.play('gumballJackpot'); rumble(0, 0.5, 0.8, 500); rumble(1, 0.5, 0.8, 500);
  for (let i = 0; i < 60; i++) confetti(st.jack.cup.x, GUMBALL.cupMouth - 20);
  // gumballs rain out of the globe all over the machine
  const cols = ['red', 'blue', 'yellow', 'green', 'purple', 'gold'];
  st.rain = [];
  for (let i = 0; i < 150; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, s = 160 + Math.random() * 420;
    st.rain.push({ x: GUMBALL.globe.x + (Math.random() - 0.5) * 60, y: GUMBALL.globe.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, col: cols[i % cols.length], d: Math.random() * 1.6, spin: Math.random() * 6, floor: 470 + Math.random() * 34, r: 7 + Math.random() * 4 });
  }
}
function gumballRainStep(st, dt) {
  for (const q of st.rain) {
    if (q.d > 0) { q.d -= dt; continue; }
    q.vy += 900 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.spin += q.vx * dt / 8;
    if (q.x < 10 || q.x > W - 10) { q.vx = -q.vx * 0.6; q.x = clamp(q.x, 10, W - 10); }
    if (q.y > q.floor) { q.y = q.floor; q.vy = -Math.abs(q.vy) * 0.42; q.vx *= 0.7; if (Math.abs(q.vy) < 40) q.vy = 0; }
  }
}

/* ---------- the tick (ownStep) ---------- */
function gumballStep(st, dt) {
  const ps = G.players, R = GUMBALL;
  st.pops = st.pops.filter(q => (q.t += dt) < 1.4);
  if (st.news) { st.news.t += dt; if (st.news.t > st.news.life) st.news = null; }
  for (const k of [0, 1]) { const c = st.calls[k]; if (c && (c.t += dt) > 1.6) st.calls[k] = null; }
  gumballFx(st, dt);
  if (st.phase === 'won' || st.phase === 'rain') {
    st.winT += dt;
    for (const p of ps) { p.pendingAct = false; p.pendingJump = false; }
    if (st.phase === 'rain') {
      gumballRainStep(st, dt);
      if (Math.floor(st.winT * 6) !== Math.floor((st.winT - dt) * 6) && st.winT < 3.5) confetti(80 + Math.random() * 800, 120 + Math.random() * 80);
      for (const p of ps) if (p.id === st.keep && p.grounded && Math.floor(st.winT * 2.2) !== Math.floor((st.winT - dt) * 2.2)) { p.vy = -420; p.grounded = false; }
      gumballKeeperIdle(st, ps[st.keep], dt);
      if (st.winT >= R.rainT) levelClear();
      return;
    }
    gumballKeeperIdle(st, ps[st.keep], dt);
    if (st.winT < 1.2 && Math.floor(st.winT * 10) !== Math.floor((st.winT - dt) * 10)) confetti(R.globe.x + (Math.random() - 0.5) * 300, 240);
    if (st.winT >= R.winHold) { const L = G.level; if (L.def.roomIndex < L.def.roomCount - 1) nextRoom(); else levelClear(); }
    return;
  }
  if (G.introT > R.introHold) {
    for (const p of ps) { p.pendingAct = false; p.pendingJump = false; }
    gumballCranker(st, ps[st.crank], 0); ps[st.crank].pendingAct = false;
    return;
  }
  st.roomT += dt;
  for (const k of [0, 1]) { st.callCD[k] -= dt; st.readyCD[k] -= dt; st.flipCD[k] -= dt; st.wrongCD[k] -= dt; }
  st.crankCD = Math.max(0, st.crankCD - dt); st.crankT = Math.max(0, st.crankT - dt);
  gumballCranker(st, ps[st.crank], dt);
  gumballKeeper(st, ps[st.keep], dt);
  // devices: trapdoors shut by themselves, the wheel and the belt keep moving, flaps swing
  for (const pc of st.devs) {
    if (pc.timed && pc.open > 0) { pc.open -= dt; if (pc.open <= 0) { pc.open = 0; pc.state = 0; Sfx.play('gumballShut'); } }
    if (pc.t === 'spin') pc.rot += (pc.state ? 1 : -1) * R.spinW * dt * gumballSlowK(st);
    if (pc.t === 'belt') pc.rot += (pc.state ? 1 : -1) * R.beltV * dt * gumballSlowK(st);
  }
  for (const b of st.balls) gumballBallStep(st, b, dt, null);
  // a gumball that bounced back remembers it (so the next one of its colour isn't "right first time")
  for (const b of st.balls) if (b.ph === 'done' && !b.right && !b.counted) { b.counted = true; st.backs[b.col] = (st.backs[b.col] || 0) + 1; }
  st.balls = st.balls.filter(b => b.ph !== 'done');
  // waiting with the board quiet: hints come on after a while; long with nothing sorted: gold path
  const nd = gumballNeeds(st);
  if (st.queue.length && nd.busy === 0) st.waitT += dt; else st.waitT = 0;
  if (st.queue.length || st.balls.length) st.noSortT += dt;
  st.hintLatch = gumballHintsWant(st) ? 8 : Math.max(0, st.hintLatch - dt);
  gumballHelpCheck(st);
  gumballCheckDone(st);
}
// the keeper during a celebration: physics only (hops of joy), no steering
function gumballKeeperIdle(st, p, dt) {
  const inp = p.input; p.input = NO_INPUT;
  try { gumballKeeper(st, p, dt); } finally { p.input = inp; }
  p.pendingAct = false;
}
function gumballFx(st, dt) {
  const R = GUMBALL;
  for (const pc of st.devs) {
    const want = pc.t === 'flip' ? 0 : pc.state;
    pc.anim = approach(pc.anim, want, dt * 6);
    pc.hit = Math.max(0, pc.hit - dt * 3); pc.flick = Math.max(0, pc.flick - dt * 3);
  }
  for (const pc of Object.values(st.pc)) if (pc.t === 'bump' || pc.t === 'pegs') pc.hit = Math.max(0, pc.hit - dt * 4);
  for (const c of st.cups) { c.wob = Math.max(0, c.wob - dt * 2.5); c.glow = Math.max(0, c.glow - dt * 1.5); if (c.lid > 0 && c.lid < 1) c.lid = Math.min(1, c.lid + dt * 3); }
  if (st.jack) { st.jack.t += dt; const jc = st.jack.cup; jc.wob = Math.max(0, jc.wob - dt * 2.5); }
  for (const lv of st.levers) {
    lv.flash = Math.max(0, lv.flash - dt * 2.5);
    const d = st.pc[lv.dev];
    lv.tilt = approach(lv.tilt, d ? (d.t === 'flip' ? (d.flick > 0.4 ? 1 : 0) : d.timed ? (d.open > 0 ? 1 : 0) : d.state) : 0, dt * 7);
    const kp = G.players[st.keep];
    lv.near = approach(lv.near, gumballLeverAt(st, kp) === lv ? 1 : 0, dt * 6);
  }
  st.swapA = Math.max(0, st.swapA - dt * 4); st.nozAnim = Math.max(0, st.nozAnim - dt * 3);
  st.crankRot += (st.crankT > 0 ? 1 : 0) * dt * (Math.PI * 2 / R.crankAnim);
}

/* ---------- drawing ---------- */
let gumballBack = null;
function gumballPaintBack(c, st, L) {
  const R = GUMBALL, g = L.grid;
  // the candy factory wall: pink and peach stripes, a frosting trim, lollipops
  const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#ffc6e2'); gr.addColorStop(1, '#ffe9d2');
  c.fillStyle = gr; c.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 48) { c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x, 0, 24, H); }
  // a wafer wainscot along the lower wall with a cream rail on top
  { const wy = 372;
    c.fillStyle = '#f7c9a0'; c.fillRect(0, wy, W, 140);
    c.strokeStyle = 'rgba(160,90,40,0.22)'; c.lineWidth = 1.5;
    for (let x = 0; x < W; x += 14) { c.beginPath(); c.moveTo(x, wy + 10); c.lineTo(x, wy + 140); c.stroke(); }
    for (let y = wy + 24; y < wy + 140; y += 14) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.fillStyle = '#fff3f8'; c.fillRect(0, wy - 4, W, 12); c.fillStyle = 'rgba(200,90,140,0.25)'; c.fillRect(0, wy + 6, W, 3);
    c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(0, wy - 4, W, 2);
    const sg = c.createLinearGradient(0, wy + 80, 0, wy + 140); sg.addColorStop(0, 'rgba(120,50,30,0)'); sg.addColorStop(1, 'rgba(120,50,30,0.18)'); c.fillStyle = sg; c.fillRect(0, wy + 80, W, 60);
    // (rich props pass) each wafer cell gets a lit top-left lip, a sunken middle and a crumb now and then
    for (let y = wy + 24; y < wy + 140; y += 14) for (let x = 0; x < W; x += 14) {
      c.fillStyle = 'rgba(255,240,220,0.35)'; c.fillRect(x + 1, y + 1, 12, 1); c.fillRect(x + 1, y + 1, 1, 12);
      c.fillStyle = 'rgba(160,90,40,0.12)'; c.fillRect(x + 3, y + 3, 9, 9);
      if (CK.r(x, y) < 0.05) { c.fillStyle = 'rgba(170,100,50,0.5)'; c.beginPath(); c.arc(x + 7, y + 8, 1.6, 0, Math.PI * 2); c.fill(); }
    } }
  // cotton candy clouds high up the wall
  for (const [x, y, s] of [[60, 56, 1], [880, 50, 0.9], [130, 150, 0.7], [840, 160, 0.8]]) {
    c.fillStyle = 'rgba(255,255,255,0.55)';
    for (const [dx, dy, r] of [[0, 0, 16], [16, -8, 20], [36, 0, 15], [18, 6, 16]]) { c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); c.fill(); }
  }
  // lollipops planted along the floor
  for (const [x, col, h] of [[30, '#ff7eb6', 60], [150, '#7fd8ff', 46], [810, '#b98cff', 52], [935, '#ffd23f', 64]]) {
    c.fillStyle = 'rgba(90,30,50,0.2)'; c.beginPath(); c.ellipse(x, 511, 10, 3, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#e6dce6'; c.lineWidth = 4; c.beginPath(); c.moveTo(x + 1, 510); c.lineTo(x + 1, 510 - h); c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x - 0.5, 510); c.lineTo(x - 0.5, 510 - h); c.stroke();
    c.fillStyle = col; c.beginPath(); c.arc(x, 510 - h - 12, 14, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(80,20,60,0.35)'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2.5; c.beginPath(); for (let a = 0; a < 9; a += 0.25) { const rr = a * 1.5; c.lineTo(x + Math.cos(a) * rr, 510 - h - 12 + Math.sin(a) * rr); } c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(x - 6, 510 - h - 18, 4, 2.5, -0.6, 0, Math.PI * 2); c.fill();
  }
  // the machine: a big cherry-red frame around the glass board, standing over the walkway on candy-cane legs
  const X0 = 180, X1 = 780;
  c.fillStyle = 'rgba(80,20,50,0.18)'; c.beginPath(); c.roundRect ? c.roundRect(X0 + 6, 116, X1 - X0, 348, 26) : c.rect(X0 + 6, 116, X1 - X0, 348); c.fill();
  c.fillStyle = '#e8384f'; c.beginPath(); c.roundRect ? c.roundRect(X0, 110, X1 - X0, 348, 26) : c.rect(X0, 110, X1 - X0, 348); c.fill();
  c.fillStyle = '#ff6b7f'; c.fillRect(X0 + 6, 116, 10, 330); c.fillRect(X1 - 16, 116, 10, 330);
  // the frame's lit top lip, a darker foot, an outline and four shiny bolts
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.roundRect ? c.roundRect(X0 + 20, 113, X1 - X0 - 40, 4, 2) : c.rect(X0 + 20, 113, X1 - X0 - 40, 4); c.fill();
  c.fillStyle = 'rgba(110,10,30,0.25)'; c.fillRect(X0 + 16, 446, X1 - X0 - 32, 10);
  c.strokeStyle = '#a81f35'; c.lineWidth = 2.5; c.beginPath(); c.roundRect ? c.roundRect(X0, 110, X1 - X0, 348, 26) : c.rect(X0, 110, X1 - X0, 348); c.stroke();
  for (const [bx, by] of [[X0 + 22, 128], [X1 - 22, 128], [X0 + 22, 440], [X1 - 22, 440]]) { c.fillStyle = '#b8bcd6'; c.beginPath(); c.arc(bx, by, 4.5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(bx - 1.3, by - 1.3, 1.6, 0, Math.PI * 2); c.fill(); }
  // glass board
  const gb = c.createLinearGradient(0, R.boardY0, 0, 452); gb.addColorStop(0, '#fff6fb'); gb.addColorStop(1, '#ffe3f0');
  c.fillStyle = gb; c.beginPath(); c.roundRect ? c.roundRect(R.boardX0, R.boardY0, R.boardX1 - R.boardX0, 452 - R.boardY0 + 6, 14) : c.rect(R.boardX0, R.boardY0, R.boardX1 - R.boardX0, 256); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.moveTo(R.boardX0 + 20, R.boardY0 + 6); c.lineTo(R.boardX0 + 70, R.boardY0 + 6); c.lineTo(R.boardX0 + 20, R.boardY0 + 120); c.closePath(); c.fill();
  // little candy dots on the frame
  for (let y = 130; y < 450; y += 26) for (const x of [X0 + 11, X1 - 11]) { c.fillStyle = ['#fff3a8', '#bdf5ff', '#ffd1ec'][(y / 26) % 3 | 0]; c.beginPath(); c.arc(x, y, 3.2, 0, Math.PI * 2); c.fill(); }
  // legs over the walkway (an arch)
  for (const x of [X0 + 2, X1 - 30]) {
    c.fillStyle = '#fff'; c.fillRect(x, 452, 28, 58);
    c.save(); c.beginPath(); c.rect(x, 452, 28, 58); c.clip();
    c.strokeStyle = '#ff4f6d'; c.lineWidth = 7; for (let k = -2; k < 6; k++) { c.beginPath(); c.moveTo(x - 10, 452 + k * 16); c.lineTo(x + 40, 452 + k * 16 + 24); c.stroke(); }
    c.restore();
  }
  // the static rails (devices are drawn live)
  for (const pc of Object.values(st.pc)) if (pc.t === 'ramp') gumballRail(c, pc.pts, st.M.rail);
  for (const pc of Object.values(st.pc)) if (pc.t === 'pegs') gumballPegField(c, pc);
  for (const pc of Object.values(st.pc)) if (pc.funnel) {
    c.fillStyle = st.M.rail[0]; c.strokeStyle = 'rgba(90,30,60,0.55)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(pc.x - 30, pc.y - 26); c.lineTo(pc.x - 7, pc.y - 4); c.lineTo(pc.x - 11, pc.y); c.lineTo(pc.x - 34, pc.y - 22); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(pc.x + 30, pc.y - 26); c.lineTo(pc.x + 7, pc.y - 4); c.lineTo(pc.x + 11, pc.y); c.lineTo(pc.x + 34, pc.y - 22); c.closePath(); c.fill(); c.stroke();
  }
  // the tray under the head, with a little stop at every chute
  const cx0 = Math.min(...st.M.chutes.map(q => q.x)) - 26, cx1 = Math.max(...st.M.chutes.map(q => q.x)) + 26;
  c.fillStyle = '#c9cbe0'; c.beginPath(); c.roundRect ? c.roundRect(Math.min(cx0, 440), R.trayY + R.r - 2, Math.max(cx1, 520) - Math.min(cx0, 440), 8, 4) : c.rect(cx0, R.trayY + 8, cx1 - cx0, 8); c.fill();
  c.fillStyle = '#8e90b0'; c.fillRect(Math.min(cx0, 440), R.trayY + R.r + 4, Math.max(cx1, 520) - Math.min(cx0, 440), 2);
  st.M.chutes.forEach((q, i) => { c.fillStyle = 'rgba(90,30,60,0.35)'; c.beginPath(); c.arc(q.x, R.trayY + R.r + 14, 3, 0, Math.PI * 2); c.fill(); if (st.M.chutes.length > 1) { c.fillStyle = 'rgba(90,30,60,0.55)'; c.font = '700 10px "Atkinson Hyperlegible", sans-serif'; c.textAlign = 'center'; c.fillText(String(i + 1), q.x, R.trayY + R.r + 26); } });
  // the side ledges: wafer biscuits with pink cream (one-way planks), and the floor: chocolate with frosting
  for (let r = 0; r < ROWS; r++) for (let cc = 0; cc < COLS; cc++) {
    const ch = g[r][cc], x = cc * T, y = r * T;
    if (ch === '=') {
      c.fillStyle = 'rgba(120,40,60,0.15)'; c.fillRect(x, y + 11, T, 5);
      c.fillStyle = '#e7b06c'; c.fillRect(x, y, T, 11); c.fillStyle = '#ffd1ec'; c.fillRect(x, y + 4, T, 3);
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x, y, T, 1.5); c.fillStyle = 'rgba(140,80,30,0.3)'; c.fillRect(x, y + 9.5, T, 1.5);
      c.strokeStyle = 'rgba(140,80,30,0.45)'; c.lineWidth = 1; for (let k = 4; k < T; k += 7) { c.beginPath(); c.moveTo(x + k, y + 1); c.lineTo(x + k, y + 10); c.stroke(); }
      if (g[r][cc - 1] !== '=') { c.fillStyle = '#c98c4a'; c.fillRect(x, y, 3, 11); }
      if (g[r][cc + 1] !== '=') { c.fillStyle = '#c98c4a'; c.fillRect(x + T - 3, y, 3, 11); }
    } else if (ch === '#' && r >= ROWS - 1) {
      c.fillStyle = C.stone; c.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
      if (r > 0 && g[r - 1][cc] !== '#') { c.fillStyle = C.grassDark; c.fillRect(x, y, T, 8); c.fillStyle = C.grass; c.fillRect(x, y, T, 5); c.fillStyle = ['#ff7eb6', '#7fd8ff', '#ffd23f', '#9cf2b8'][(cc * 7) % 4]; c.fillRect(x + 6 + (cc % 3) * 5, y + 1, 4, 2); }
    }
  }
  CK.on(c, () => gumballBackDetail(st, L));
  // the head and the globe are drawn live (the crank turns, the gumballs show what is left)
}
// (rich props pass, Nov 2026) extra detail painted once into the cached back: wafer cells with a lit lip, the
// machine frame's trim, panel seams and rivets, shaded candy-cane legs, waffle-textured ledges with cream oozing out
// of the ends, and a chocolate floor of squares under a dripping frosting edge with sprinkles
function gumballBackDetail(st, L) {
  const g = L.grid, X0 = 180, X1 = 780;
  // the frame: a chrome trim inside the red, a seam and a row of little rivets along the top and bottom
  ctx.strokeStyle = 'rgba(255,220,226,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(X0 + 26, 140, X1 - X0 - 52, 302, 14) : ctx.rect(X0 + 26, 140, X1 - X0 - 52, 302); ctx.stroke();
  ctx.strokeStyle = 'rgba(110,10,30,0.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(X0 + 4, 300); ctx.lineTo(X0 + 26, 300); ctx.moveTo(X1 - 26, 300); ctx.lineTo(X1 - 4, 300); ctx.stroke();
  for (let x = X0 + 44; x < X1 - 40; x += 32) for (const y of [122, 449]) {
    ctx.fillStyle = '#a81f35'; circle(x + 0.5, y + 0.6, 2); ctx.fill(); ctx.fillStyle = '#ff9aa8'; circle(x, y, 1.6); ctx.fill();
  }
  ctx.fillStyle = 'rgba(110,10,30,0.22)'; ctx.fillRect(X1 - 24, 130, 6, 310);
  // the candy-cane legs: a lit left edge, a shaded right edge, a cap and a foot
  for (const x of [X0 + 2, X1 - 30]) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x + 1, 452, 3, 58);
    ctx.fillStyle = 'rgba(110,10,40,0.25)'; ctx.fillRect(x + 21, 452, 7, 58);
    ctx.fillStyle = '#a81f35'; ctx.fillRect(x - 2, 452, 32, 5); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x - 2, 452, 32, 1.2);
    ctx.fillStyle = '#c42a43'; rr(x - 3, 504, 34, 7, 3); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x - 1, 504.5, 30, 1.2);
  }
  // the cranker's tray rail posts and the board's glass edge
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(GUMBALL.boardX0 + 14, GUMBALL.boardY0 + 1.5); ctx.lineTo(GUMBALL.boardX1 - 14, GUMBALL.boardY0 + 1.5); ctx.stroke();
  for (let r = 0; r < ROWS; r++) for (let cc = 0; cc < COLS; cc++) {
    const ch = g[r][cc], x = cc * T, y = r * T;
    if (ch === '=') {
      // a waffle cross-hatch on the wafer halves, crumbs underneath
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, T, 4); ctx.rect(x, y + 7, T, 3); ctx.clip();
      ctx.strokeStyle = 'rgba(140,80,30,0.3)'; ctx.lineWidth = 0.8; ctx.beginPath();
      for (let k = -12; k < T + 12; k += 5) { ctx.moveTo(x + k, y); ctx.lineTo(x + k + 10, y + 11); ctx.moveTo(x + k + 10, y); ctx.lineTo(x + k, y + 11); }
      ctx.stroke(); ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x, y + 4, T, 1);
      if (CK.r(cc, r) < 0.35) { ctx.fillStyle = 'rgba(200,140,80,0.6)'; circle(x + 8 + CK.r(r, cc) * 16, y + 14, 1.2); ctx.fill(); }
      for (const [side, open] of [[0, g[r][cc - 1] !== '='], [1, g[r][cc + 1] !== '=']]) {
        if (!open) continue;
        // pink cream bulging out of the end
        const ex = side ? x + T - 1 : x + 1;
        ctx.fillStyle = '#ffd1ec'; ctx.beginPath(); ctx.ellipse(ex, y + 5.5, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(ex - 1.5, y + 4, 2, 1);
      }
    } else if (ch === '#' && r >= ROWS - 1) {
      // chocolate squares below a frosting edge
      const top = r > 0 && g[r - 1][cc] !== '#', y0 = top ? y + 8 : y;
      for (let sx = 0; sx < T; sx += T / 2) {
        ctx.fillStyle = 'rgba(255,220,200,0.18)'; ctx.fillRect(x + sx + 2, y0 + 3, T / 2 - 4, 1.2); ctx.fillRect(x + sx + 2, y0 + 3, 1.2, T - (y0 - y) - 5);
        ctx.fillStyle = 'rgba(30,10,5,0.25)'; ctx.fillRect(x + sx + 2, y + T - 3, T / 2 - 4, 1.2); ctx.fillRect(x + sx + T / 2 - 3, y0 + 3, 1.2, T - (y0 - y) - 5);
      }
      if (top) {
        ctx.fillStyle = C.grass;
        const d1 = 4 + CK.r(cc, 1) * 6, d2 = 3 + CK.r(cc, 2) * 5;
        ctx.beginPath(); ctx.ellipse(x + 9, y + 7, 3.2, d1, 0, 0, Math.PI); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + 24, y + 7, 2.6, d2, 0, 0, Math.PI); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x, y, T, 1.3);
        const sp = ['#ff7eb6', '#7fd8ff', '#ffd23f', '#9cf2b8'];
        for (let k = 0; k < 3; k++) { const h = CK.r(cc * 3 + k, r); ctx.save(); ctx.translate(x + 4 + h * (T - 8), y + 2.5 + (k % 2)); ctx.rotate(h * 6); ctx.fillStyle = sp[(cc + k) % 4]; ctx.fillRect(-2, -0.8, 4, 1.6); ctx.restore(); }
      }
    }
  }
}
// a candy rail under a gumball's centre line
function gumballRail(c, pts, cols) {
  const off = GUMBALL.r + 3;
  c.lineCap = 'round'; c.lineJoin = 'round';
  const path = () => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y + off) : c.moveTo(x, y + off))); };
  c.strokeStyle = 'rgba(90,30,60,0.5)'; c.lineWidth = 9; path(); c.stroke();
  c.strokeStyle = cols[0]; c.lineWidth = 6; path(); c.stroke();
  c.setLineDash([5, 6]); c.strokeStyle = cols[1]; c.lineWidth = 3; path(); c.stroke(); c.setLineDash([]);
  // little posts holding the rail to the glass
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.floor(Math.hypot(x1 - x0, y1 - y0) / 60);
    for (let k = 1; k <= n; k++) { const u = k / (n + 1); c.fillStyle = 'rgba(90,30,60,0.25)'; c.fillRect(x0 + (x1 - x0) * u - 1.5, y0 + (y1 - y0) * u + off + 3, 3, 8); }
  }
  c.lineCap = 'butt';
}
function gumballPegField(c, pc) {
  const n = pc.rows || 3;
  for (let i = 0; i <= n; i++) {
    const u = i / n, y = pc.y + (pc.y2 - pc.y) * u + 9, cx = pc.x + (pc.x2 - pc.x) * u, wd = (pc.w || 40) * (1 - u * 0.4) + 16;
    for (let k = -1; k <= 1; k += (i % 2 ? 2 : 1)) {
      const x = cx + k * wd / 2;
      c.fillStyle = 'rgba(90,30,60,0.3)'; c.beginPath(); c.arc(x, y + 1.5, 4.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = ['#ff7eb6', '#7fd8ff', '#ffd23f'][(i + k + 3) % 3]; c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(x - 1.2, y - 1.2, 1.4, 0, Math.PI * 2); c.fill();
    }
  }
}
function gumballDrawBack(st) {
  const L = G.level, cw = canvas.width, ch = canvas.height;
  try {
    if (!gumballBack || gumballBack.L !== L || gumballBack.cv.width !== cw || gumballBack.cv.height !== ch) {
      const cv = (gumballBack && gumballBack.cv) || document.createElement('canvas');
      cv.width = cw; cv.height = ch;
      const c = cv.getContext('2d');
      c.setTransform(cw / W, 0, 0, ch / H, 0, 0); c.clearRect(0, 0, W, H);
      gumballPaintBack(c, st, L);
      gumballBack = { cv, L };
    }
    ctx.drawImage(gumballBack.cv, 0, 0, W, H);
  } catch (e) { gumballBack = null; gumballPaintBack(ctx, st, L); }
}
// a gumball: its colour, its own pattern (so colours never have to be told apart by colour alone) and a shine
function gumballDrawBall(x, y, r, col, rot, alpha) {
  const c = GUMBALL_COL[col] || GUMBALL_COL.red;
  ctx.save();
  if (alpha != null) ctx.globalAlpha *= alpha;
  ctx.fillStyle = c.fill; circle(x, y, r); ctx.fill();
  ctx.save(); circle(x, y, r); ctx.clip();
  ctx.translate(x, y); ctx.rotate(rot || 0);
  gumballPattern(c.pat, r, 'rgba(255,255,255,0.88)');
  ctx.restore();
  ctx.strokeStyle = c.dark; ctx.lineWidth = Math.max(1.2, r * 0.16); circle(x, y, r); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.3, r * 0.18, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// a pattern centred on 0,0 (the canvas already translated), size r
function gumballPattern(pat, r, col) {
  ctx.fillStyle = col; ctx.strokeStyle = col;
  if (pat === 'stripes') { ctx.fillRect(-r, -r * 0.62, r * 2, r * 0.32); ctx.fillRect(-r, r * 0.22, r * 2, r * 0.32); }
  else if (pat === 'dots') { for (const [dx, dy] of [[-0.42, -0.35], [0.4, -0.3], [-0.1, 0.42], [0.5, 0.45], [-0.62, 0.3]]) { circle(dx * r, dy * r, r * 0.18); ctx.fill(); } }
  else if (pat === 'star') gumballStar(0, 0, r * 0.62, true);
  else if (pat === 'swirl') { ctx.lineWidth = Math.max(1.4, r * 0.2); ctx.lineCap = 'round'; ctx.beginPath(); for (let a = 0; a < 10.5; a += 0.3) { const rr = a / 10.5 * r * 0.78; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.stroke(); ctx.lineCap = 'butt'; }
  else if (pat === 'heart') gumballHeart(0, r * 0.08, r * 0.55, true);
  else if (pat === 'shine') { gumballStar(0, 0, r * 0.7, true); ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(r * 0.5, -r * 0.5, r * 0.16); ctx.fill(); }
}
function gumballStar(x, y, r, fill) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rad = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
  ctx.closePath(); if (fill) ctx.fill(); else ctx.stroke();
}
function gumballHeart(x, y, s, fill) {
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s * 1.2, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.7, y - s * 1.2, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  ctx.closePath(); if (fill) ctx.fill(); else ctx.stroke();
}
// a lever's picture (white on a chocolate disc), the same on its device
function gumballIcon(x, y, r, kind, ring) {
  ctx.fillStyle = '#4a2a3a'; circle(x, y, r); ctx.fill();
  ctx.strokeStyle = ring || '#fff3d6'; ctx.lineWidth = Math.max(1.5, r * 0.18); circle(x, y, r); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  const s = r * 0.62;
  if (kind === 'star') gumballStar(x, y + s * 0.05, s, true);
  else if (kind === 'heart') gumballHeart(x, y + s * 0.05, s * 0.85, true);
  else if (kind === 'moon') { ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#4a2a3a'; ctx.beginPath(); ctx.arc(x + s * 0.45, y - s * 0.3, s * 0.8, 0, Math.PI * 2); ctx.fill(); }
  else if (kind === 'leaf') { ctx.beginPath(); ctx.moveTo(x - s, y + s * 0.6); ctx.quadraticCurveTo(x - s * 0.9, y - s, x + s, y - s * 0.7); ctx.quadraticCurveTo(x + s * 0.6, y + s * 0.9, x - s, y + s * 0.6); ctx.fill(); ctx.strokeStyle = '#4a2a3a'; ctx.lineWidth = Math.max(1, r * 0.1); ctx.beginPath(); ctx.moveTo(x - s * 0.8, y + s * 0.45); ctx.lineTo(x + s * 0.5, y - s * 0.4); ctx.stroke(); }
}
// the globe full of what is left, the head with the next-gumballs window, the crank and the nozzle
function gumballDrawHead(st, t) {
  const R = GUMBALL, gl = R.globe, h = R.head;
  // the globe: glass, gumballs inside (the colours still to come), a cap and a knob
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; circle(gl.x, gl.y, gl.r); ctx.fill();
  ctx.save(); circle(gl.x, gl.y, gl.r - 2); ctx.clip();
  const left = st.queue.length;
  const n = Math.min(26, left * 2 + (st.jack ? 0 : 2));
  for (let i = 0; i < n; i++) {
    const col = st.queue[i % Math.max(1, left)] || 'gold', row = Math.floor(i / 6), k = i % 6;
    const x = gl.x - 40 + k * 16 + (row % 2) * 8 + Math.sin(i * 2.3) * 2, y = gl.y + gl.r - 12 - row * 13;
    gumballDrawBall(x, y, 8, col, i * 1.3);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(120,60,90,0.45)'; ctx.lineWidth = 2.5; circle(gl.x, gl.y, gl.r); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(gl.x - 22, gl.y - 26, 14, 8, -0.7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8384f'; ctx.beginPath(); ctx.ellipse(gl.x, gl.y - gl.r + 4, 24, 8, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#e8384f'; circle(gl.x, gl.y - gl.r - 2, 7); ctx.fill(); ctx.fillStyle = '#ff8a9b'; circle(gl.x - 2, gl.y - gl.r - 4, 2.5); ctx.fill();
  // the head
  ctx.fillStyle = '#e8384f'; rr(h.x0, h.y0, h.x1 - h.x0, h.y1 - h.y0, 16); ctx.fill();
  ctx.fillStyle = '#c42639'; rr(h.x0, h.y1 - 12, h.x1 - h.x0, 12, 6); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; rr(h.x0 + 6, h.y0 + 4, h.x1 - h.x0 - 12, 6, 3); ctx.fill();
  // the window: the next three gumballs (the first one bigger)
  const wx0 = 426, wy0 = 128, ww = 108, wh = 34;
  ctx.fillStyle = '#4a2a3a'; rr(wx0 - 3, wy0 - 3, ww + 6, wh + 6, 12); ctx.fill();
  ctx.fillStyle = '#fff6fb'; rr(wx0, wy0, ww, wh, 10); ctx.fill();
  const slots = [[448, 145, 13], [484, 147, 10], [512, 147, 10]];
  for (let i = 0; i < 3; i++) {
    const col = st.queue[i];
    if (!col) { ctx.strokeStyle = 'rgba(120,60,90,0.25)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; circle(slots[i][0], slots[i][1], slots[i][2] - 1); ctx.stroke(); ctx.setLineDash([]); continue; }
    let [x, y, r] = slots[i];
    if (st.swapA > 0 && i < 2) { const o = slots[1 - i], u = st.swapA; x += (o[0] - x) * u; y += (o[1] - y) * u - Math.sin(u * Math.PI) * 10 * (i ? -1 : 1); r += (o[2] - r) * u; }
    gumballDrawBall(x, y, r, col, 0);
  }
  text('NEXT', 448, 172, 9, '#fff3d6', 'center', 'body');
  // the crank: a hub and a handle that turns
  const cx = R.crankX, cy = R.crankY, a = st.crankRot;
  ctx.fillStyle = '#c9cbe0'; circle(cx, cy, 13); ctx.fill(); ctx.strokeStyle = '#8e90b0'; ctx.lineWidth = 2; circle(cx, cy, 13); ctx.stroke();
  const hx = cx + Math.cos(a - Math.PI / 2) * 18, hy = cy + Math.sin(a - Math.PI / 2) * 18;
  ctx.strokeStyle = '#8e90b0'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(hx, hy); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = PCOL[st.crank]; circle(hx, hy, 6); ctx.fill(); ctx.strokeStyle = PDARK[st.crank]; ctx.lineWidth = 2; circle(hx, hy, 6); ctx.stroke();
  // the cranker's little stand
  ctx.fillStyle = '#e7b06c'; rr(R.crankerX - 26, R.crankerFeet, 52, 9, 4); ctx.fill(); ctx.fillStyle = '#ffd1ec'; ctx.fillRect(R.crankerX - 26, R.crankerFeet + 3, 52, 2.5);
  // the nozzle on the tray
  const nx = st.nozX, ny = R.trayY + R.r + 2, bob = st.nozAnim * Math.sin(st.nozAnim * 12) * 2;
  ctx.fillStyle = '#4a2a3a'; ctx.beginPath(); ctx.moveTo(nx - 15, ny - 2 + bob); ctx.lineTo(nx + 15, ny - 2 + bob); ctx.lineTo(nx + 6, ny + 12 + bob); ctx.lineTo(nx - 6, ny + 12 + bob); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PCOL[st.crank]; ctx.beginPath(); ctx.moveTo(nx - 12, ny + bob); ctx.lineTo(nx + 12, ny + bob); ctx.lineTo(nx + 5, ny + 10 + bob); ctx.lineTo(nx - 5, ny + 10 + bob); ctx.closePath(); ctx.fill();
  // the mouth under the head where gumballs come out
  ctx.fillStyle = '#4a2a3a'; rr(R.mouthX - 13, h.y1 - 6, 26, 10, 5); ctx.fill();
}
// one device, with its lever's picture on it
function gumballDrawDevice(st, pc, t) {
  const R = GUMBALL, rail = st.M.rail, icon = pc.icon || 'star', near = (st.levers.find(l => l.dev === pc.id) || {}).near || 0;
  const ring = near > 0.05 ? C.gold : null, glow = Math.max(pc.hit, near * 0.6);
  if (glow > 0.02) { ctx.save(); ctx.globalAlpha = 0.35 * glow; ctx.fillStyle = C.gold; circle(pc.t === 'belt' ? (pc.x0 + pc.x1) / 2 : pc.x, pc.y + 4, pc.t === 'spin' ? pc.r + 22 : 26); ctx.fill(); ctx.restore(); }
  if (pc.t === 'gate' && !pc.timed) {
    // a flap gate: a candy paddle that points the way the gumball will go
    const ang = (-1 + 2 * pc.anim) * 0.85, len = 30;
    ctx.save(); ctx.translate(pc.x, pc.y + R.r + 2); ctx.rotate(ang);
    ctx.fillStyle = 'rgba(90,30,60,0.5)'; rr(-5.5, -2, 11, len + 4, 5.5); ctx.fill();
    ctx.fillStyle = rail[0]; rr(-4, 0, 8, len, 4); ctx.fill();
    ctx.fillStyle = rail[1]; ctx.fillRect(-1.5, 5, 3, len - 10);
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(-6, len - 2); ctx.lineTo(6, len - 2); ctx.lineTo(0, len + 7); ctx.closePath(); ctx.fill();
    ctx.restore();
    gumballIcon(pc.x, pc.y + R.r + 2, 9, icon, ring);
  } else if (pc.timed) {
    // a trapdoor in the rail: shut, or swung open with a countdown ring
    const open = pc.open > 0 ? 1 : 0, a = pc.anim * 1.25, y = pc.y + R.r + 3;
    ctx.save(); ctx.translate(pc.x - 16, y); ctx.rotate(a);
    ctx.fillStyle = 'rgba(90,30,60,0.5)'; rr(-1, -4.5, 34, 9, 4.5); ctx.fill();
    ctx.fillStyle = open ? '#fff3a8' : rail[0]; rr(0, -3, 32, 6, 3); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(90,30,60,0.6)'; circle(pc.x - 16, y, 3); ctx.fill();
    const ix = pc.x, iy = pc.y - 30;
    gumballIcon(ix, iy, 9, icon, ring);
    if (open) {
      const f = clamp(pc.open / (R.openT / gumballSlowK(st)), 0, 1);
      ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ix, iy, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke();
    }
    text(open ? 'OPEN' : 'SHUT', ix, iy - 18, 9, open ? '#b9850f' : 'rgba(90,30,60,0.6)', 'center', 'body');
  } else if (pc.t === 'see') {
    // a seesaw plank on a pivot
    const ang = (-1 + 2 * pc.anim) * R.seeTilt, L0 = R.seeLen + 8;
    ctx.fillStyle = 'rgba(90,30,60,0.55)'; ctx.beginPath(); ctx.moveTo(pc.x, pc.y); ctx.lineTo(pc.x - 11, pc.y + 20); ctx.lineTo(pc.x + 11, pc.y + 20); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(pc.x, pc.y); ctx.rotate(ang);
    ctx.fillStyle = 'rgba(90,30,60,0.5)'; rr(-L0 - 1, -5, 2 * L0 + 2, 10, 5); ctx.fill();
    ctx.fillStyle = rail[0]; rr(-L0, -4, 2 * L0, 8, 4); ctx.fill();
    ctx.fillStyle = rail[1]; for (let k = -L0 + 6; k < L0 - 4; k += 12) ctx.fillRect(k, -1.5, 6, 3);
    ctx.fillStyle = rail[0]; rr(-L0, -12, 5, 10, 2); ctx.fill(); rr(L0 - 5, -12, 5, 10, 2); ctx.fill();
    ctx.restore();
    gumballIcon(pc.x, pc.y + 16, 8, icon, ring);
    // which way it will tip the next gumball
    const d = pc.state ? 1 : -1;
    ctx.fillStyle = 'rgba(185,133,15,0.8)'; ctx.beginPath(); ctx.moveTo(pc.x + d * 40, pc.y + 30); ctx.lineTo(pc.x + d * 30, pc.y + 25); ctx.lineTo(pc.x + d * 30, pc.y + 35); ctx.closePath(); ctx.fill();
  } else if (pc.t === 'spin') {
    // the spinner wheel: candy spokes and little cups, turning left or right
    ctx.save(); ctx.translate(pc.x, pc.y); ctx.rotate(pc.rot);
    ctx.fillStyle = 'rgba(90,30,60,0.35)'; circle(0, 2, pc.r + 3); ctx.fill();
    ctx.fillStyle = '#fff'; circle(0, 0, pc.r); ctx.fill();
    for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? rail[0] : '#ff9ccf'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, pc.r, k * Math.PI / 3, (k + 1) * Math.PI / 3); ctx.closePath(); ctx.fill(); }
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ctx.fillStyle = '#4a2a3a'; circle(Math.cos(a) * (pc.r + 1), Math.sin(a) * (pc.r + 1), 3); ctx.fill(); }
    ctx.restore();
    gumballIcon(pc.x, pc.y, 10, icon, ring);
    // a curved arrow for the way it spins
    const d = pc.state ? 1 : -1, r2 = pc.r + 16;
    ctx.strokeStyle = 'rgba(185,133,15,0.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(pc.x, pc.y, r2, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5); ctx.stroke();
    const ea = -Math.PI / 2 + d * 0.5, ex = pc.x + Math.cos(ea) * r2, ey = pc.y + Math.sin(ea) * r2;
    ctx.fillStyle = 'rgba(185,133,15,0.95)'; ctx.beginPath(); ctx.moveTo(ex + d * 6, ey + 3); ctx.lineTo(ex - d * 3, ey - 6); ctx.lineTo(ex - d * 3, ey + 7); ctx.closePath(); ctx.fill();
  } else if (pc.t === 'belt') {
    // a little conveyor belt: rollers and moving chevrons
    const x0 = pc.x0 - 6, x1 = pc.x1 + 6, y = pc.y + R.r + 2;
    ctx.fillStyle = 'rgba(90,30,60,0.55)'; rr(x0 - 2, y - 2, x1 - x0 + 4, 16, 8); ctx.fill();
    ctx.fillStyle = '#4a2a3a'; rr(x0, y, x1 - x0, 12, 6); ctx.fill();
    ctx.save(); ctx.beginPath(); rr(x0, y, x1 - x0, 12, 6); ctx.clip();
    const d = pc.state ? 1 : -1, off = ((pc.rot % 18) + 18) % 18;
    ctx.strokeStyle = rail[0]; ctx.lineWidth = 2.5;
    for (let x = x0 - 18 + off; x < x1 + 18; x += 18) { ctx.beginPath(); ctx.moveTo(x - d * 4, y + 2); ctx.lineTo(x + d * 2, y + 6); ctx.lineTo(x - d * 4, y + 10); ctx.stroke(); }
    ctx.restore();
    for (const x of [x0 + 6, x1 - 6]) { ctx.fillStyle = '#c9cbe0'; circle(x, y + 6, 4); ctx.fill(); }
    gumballIcon((x0 + x1) / 2, y + 26, 9, icon, ring);
    ctx.fillStyle = 'rgba(185,133,15,0.9)'; const ax = (x0 + x1) / 2 + d * 22; ctx.beginPath(); ctx.moveTo(ax + d * 8, y + 26); ctx.lineTo(ax, y + 20); ctx.lineTo(ax, y + 32); ctx.closePath(); ctx.fill();
  } else if (pc.t === 'flip') {
    // a pinball flipper with a cradle: it kicks up when flicked
    const ang = -0.35 - pc.flick * 0.9;
    ctx.fillStyle = 'rgba(90,30,60,0.35)'; ctx.beginPath(); ctx.arc(pc.x, pc.y + R.r + 2, 16, 0, Math.PI); ctx.fill();
    ctx.save(); ctx.translate(pc.x - 18, pc.y + R.r + 6); ctx.rotate(ang);
    ctx.fillStyle = 'rgba(90,30,60,0.5)'; rr(-2, -6, 42, 12, 6); ctx.fill();
    ctx.fillStyle = '#fff'; rr(0, -5, 38, 10, 5); ctx.fill();
    ctx.fillStyle = rail[0]; rr(0, -5, 12, 10, 5); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#4a2a3a'; circle(pc.x - 18, pc.y + R.r + 6, 4); ctx.fill();
    gumballIcon(pc.x + 2, pc.y + 38, 9, icon, ring);
    const b = st.balls.find(q => q.ph === 'rest' && q.piece === pc.id);
    if (b) {
      // how long the gumball still waits
      const f = clamp(1 - b.t / R.restT, 0, 1);
      ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(pc.x, pc.y, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke();
    }
  }
}
function gumballDrawBumpers(st, t) {
  for (const pc of Object.values(st.pc)) {
    if (pc.t !== 'bump') continue;
    // a bouncy marshmallow pillow (flat and mint, so it never looks like a gumball), squashed when hit
    const sq = 1 + pc.hit * 0.3;
    ctx.fillStyle = 'rgba(90,30,60,0.25)'; rr(pc.x - 16, pc.y + GUMBALL.r + 4, 32, 14, 7); ctx.fill();
    ctx.save(); ctx.translate(pc.x, pc.y + GUMBALL.r + 7); ctx.scale(sq, 1 / sq);
    ctx.fillStyle = '#4a2a3a'; rr(-16, -7.5, 32, 15, 7.5); ctx.fill();
    ctx.fillStyle = '#7fe8cf'; rr(-14, -6, 28, 12, 6); ctx.fill();
    ctx.fillStyle = '#ffffff'; for (const dx of [-8, 0, 8]) { ctx.beginPath(); ctx.arc(dx, 0.5, 2.2, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; rr(-10, -4.5, 12, 2.5, 1.2); ctx.fill();
    ctx.restore();
  }
}
// a cup (a glass jar) with its colour, its pattern on the label, the gumballs in it and a lid when it is full
function gumballDrawCup(st, c, t) {
  const R = GUMBALL, col = GUMBALL_COL[c.col], x0 = c.x - c.w / 2, y0 = R.cupMouth, y1 = R.cupBot, wob = Math.sin(c.wob * 20) * c.wob * 3;
  ctx.save(); ctx.translate(wob, 0);
  ctx.fillStyle = 'rgba(90,30,60,0.2)'; ctx.beginPath(); ctx.ellipse(c.x, y1 + 2, c.w / 2, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; rr(x0 + 4, y0, c.w - 8, y1 - y0, 10); ctx.fill();
  if (c.glow > 0) { ctx.globalAlpha = c.glow * 0.6; ctx.fillStyle = col.light; rr(x0 + 4, y0, c.w - 8, y1 - y0, 10); ctx.fill(); ctx.globalAlpha = 1; }
  // the gumballs inside, and dotted spots for the ones still to come
  const need = c.need, per = Math.min(need, 5), gap = Math.min(22, (c.w - 24) / per);
  for (let i = 0; i < need; i++) {
    const row = Math.floor(i / per), k = i % per, x = c.x + (k - (per - 1) / 2) * gap, y = y1 - 13 - row * 18;
    if (i < c.filled) gumballDrawBall(x, y, 9.5, c.col, (c.stack[i] && c.stack[i].spin) || 0);
    else { ctx.strokeStyle = col.dark; ctx.globalAlpha = 0.35; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; circle(x, y, 8.5); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
  }
  // the glass
  ctx.strokeStyle = 'rgba(120,60,90,0.55)'; ctx.lineWidth = 2.5; rr(x0 + 4, y0, c.w - 8, y1 - y0, 10); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x0 + 10, y0 + 6, 4, y1 - y0 - 16);
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x0 + 16, y0 + 10, 1.5, y1 - y0 - 30);
  ctx.fillStyle = 'rgba(120,60,90,0.18)'; ctx.fillRect(x0 + c.w - 14, y0 + 8, 3, y1 - y0 - 18);
  ctx.fillStyle = 'rgba(200,220,255,0.35)'; rr(x0 + 8, y1 - 6, c.w - 16, 5, 2.5); ctx.fill();
  // the rim in the cup's colour, and a label with the pattern
  ctx.fillStyle = col.fill; rr(x0, y0 - 6, c.w, 10, 5); ctx.fill(); ctx.strokeStyle = col.dark; ctx.lineWidth = 2; rr(x0, y0 - 6, c.w, 10, 5); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; rr(x0 + 5, y0 - 4.5, c.w - 10, 2, 1); ctx.fill();
  ctx.fillStyle = col.dark; for (let k = 1; k < 6; k++) { ctx.fillRect(x0 + k * c.w / 6 - 0.5, y0 - 1, 1, 3); }
  const lx = c.x, ly = y0 + 16;
  ctx.fillStyle = col.fill; circle(lx, ly, 11); ctx.fill(); ctx.strokeStyle = col.dark; ctx.lineWidth = 2; circle(lx, ly, 11); ctx.stroke();
  ctx.save(); circle(lx, ly, 10); ctx.clip(); ctx.translate(lx, ly); gumballPattern(col.pat, 11, 'rgba(255,255,255,0.95)'); ctx.restore();
  // full: a candy lid with a tick
  if (c.lid > 0) {
    const u = Math.min(1, c.lid), ly2 = y0 - 8 - (1 - u) * 30;
    ctx.globalAlpha = u;
    ctx.fillStyle = col.dark; rr(x0 - 3, ly2 - 4, c.w + 6, 10, 5); ctx.fill();
    ctx.fillStyle = col.fill; circle(c.x, ly2 - 6, 6); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(c.x - 12, ly2 + 1); ctx.lineTo(c.x - 4, ly2 + 1 + 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c.x + 14, ly2 - 1); ctx.lineTo(c.x + 20, ly2 + 1); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
// the jackpot: a gold star funnel over the last cup
function gumballDrawJackpot(st, t) {
  const j = st.jack;
  if (!j) return;
  const c = j.cup, y = GUMBALL.cupMouth - 34, pulse = 1 + 0.08 * Math.sin(t * 6), wob = Math.sin(c.wob * 20) * c.wob * 4;
  ctx.save(); ctx.translate(c.x + wob, y); ctx.scale(pulse, pulse);
  ctx.fillStyle = 'rgba(255,215,90,0.35)'; circle(0, 0, 40); ctx.fill();
  ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 3; gumballStar(0, 0, 32, true); gumballStar(0, 0, 32, false);
  ctx.fillStyle = '#4a2a3a'; circle(0, 2, 11); ctx.fill();
  ctx.restore();
  bigText('JACKPOT', c.x, y - 46, 18, C.gold);
}
function gumballDrawLever(st, lv, t) {
  const x = lv.x, y = lv.feet, kp = G.players[st.keep];
  ctx.fillStyle = '#4a2a3a'; rr(x - 12, y - 6, 24, 6, 3); ctx.fill();
  // a candy-cane lever on a little box
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x - 10, y - 6, 20, 1.2);
  ctx.fillStyle = '#ffe4f1'; rr(x - 9, y - 18, 18, 13, 4); ctx.fill(); ctx.strokeStyle = 'rgba(90,30,60,0.5)'; ctx.lineWidth = 1.5; rr(x - 9, y - 18, 18, 13, 4); ctx.stroke();
  ctx.fillStyle = 'rgba(200,120,160,0.35)'; ctx.fillRect(x - 7, y - 9, 14, 2.5);
  ctx.fillStyle = '#c995b3'; circle(x - 6, y - 14.5, 1.1); ctx.fill(); circle(x + 6, y - 14.5, 1.1); ctx.fill();
  const a = (-1 + 2 * lv.tilt) * 0.6;
  ctx.save(); ctx.translate(x, y - 14); ctx.rotate(a);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -22); ctx.stroke();
  ctx.strokeStyle = '#ff3d5e'; ctx.lineWidth = 5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -22); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#ff3d5e'; circle(0, -24, 5); ctx.fill(); ctx.lineCap = 'butt';
  ctx.restore();
  const ring = lv.near > 0.05 || lv.flash > 0 ? C.gold : null;
  gumballIcon(x, y - 52, 11, lv.icon, ring);
  if (lv.flash > 0) { ctx.globalAlpha = lv.flash; ctx.strokeStyle = PCOL[st.keep]; ctx.lineWidth = 3; circle(x, y - 52, 14 + (1 - lv.flash) * 14); ctx.stroke(); ctx.globalAlpha = 1; }
  void kp; void t;
}
function gumballDraw() {
  const st = G.mst;
  if (!st.pc) return;
  const t = G.clock;
  gumballDrawBack(st);
  for (const pc of Object.values(st.pc)) if (pc.t === 'pegs' && pc.hit > 0) { /* (pegs light up when hit: drawn in the cache) */ }
  gumballDrawBumpers(st, t);
  for (const pc of st.devs) gumballDrawDevice(st, pc, t);
  for (const lv of st.levers) gumballDrawLever(st, lv, t);
  // gold path: where each gumball will roll, and the next one from the nozzle
  if (st.goldPath && st.phase === 'play') gumballDrawPaths(st, t);
  for (const c of st.cups) gumballDrawCup(st, c, t);
  gumballDrawJackpot(st, t);
  gumballDrawHead(st, t);
  // the gumballs (popping ones fly back over everything)
  for (const b of st.balls) if (b.ph !== 'pop') gumballDrawBall(b.x, b.y, GUMBALL.r, b.col, b.spin);
  for (const b of st.balls) if (b.ph === 'pop') gumballDrawBall(b.x, b.y, GUMBALL.r, b.col, b.spin, 0.9);
  for (const q of st.rain) if (q.d <= 0) gumballDrawBall(q.x, q.y, q.r, q.col, q.spin);
}
function gumballDrawPaths(st, t) {
  if (!st.pathCache || st.pathCache.tick + 6 < G.tickN || st.pathCache.k !== st.k) {
    const list = [];
    for (const b of st.balls) if (gumballLive(b)) list.push(Object.assign({ col: b.col }, gumballTrace(st, b)));
    const nd = gumballNeeds(st);
    if (st.queue.length && nd.busy === 0) {
      const ch = st.M.chutes[st.chute];
      const ghost = { id: st.bid + 1, col: st.queue[0], ph: 'feed', x: st.nozX, y: GUMBALL.trayY, vx: 0, vy: 0, spin: 0, tx: ch.x, to: ch.to };
      list.push(Object.assign({ col: ghost.col, ghost: true }, gumballTrace(st, ghost)));
    }
    st.pathCache = { tick: G.tickN, k: st.k, list };
  }
  for (const tr of st.pathCache.list) {
    const pts = tr.path;
    ctx.fillStyle = C.gold;
    for (let i = 0; i < pts.length; i += 2) { const [x, y] = pts[i]; ctx.globalAlpha = tr.ghost ? 0.7 : 0.5; circle(x, y, 2.4); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (tr.end) {
      const c = st.cupBy[tr.end] || (st.jack && st.jack.cup.id === tr.end ? st.jack.cup : null);
      if (c) {
        const ok = c.col === tr.col && !(c.lid && c.col !== 'gold'), x = c.x + c.w / 2 - 12, y = GUMBALL.cupMouth - 22;
        ctx.fillStyle = ok ? '#3fcf86' : '#ff3d5e'; circle(x, y, 10); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); if (ok) { ctx.moveTo(x - 5, y); ctx.lineTo(x - 1, y + 4); ctx.lineTo(x + 5, y - 4); } else { ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + 4, y + 4); ctx.moveTo(x + 4, y - 4); ctx.lineTo(x - 4, y + 4); } ctx.stroke(); ctx.lineCap = 'butt';
      }
    }
  }
}
// a dark chip with a coloured word line (prompts over heads); returns its box
function gumballChip(s, x, y, col, avoid, pulse, align) {
  const big = gumballBig(), fs = Math.round(13 * (big ? 1.4 : 1)), h = fs + 12;
  ctx.font = gumballFont(fs);
  const w = ctx.measureText(s).width + 20;
  let x0 = align === 'left' ? x : x - w / 2;
  x0 = clamp(x0, 6, W - 6 - w);
  let y0 = clamp(y - h, big ? 60 : 46, H - 6 - h);
  for (let n = 0; n < 3; n++) for (const b of avoid || []) if (x0 < b.x1 + 4 && x0 + w > b.x0 - 4 && y0 < b.y1 + 3 && y0 + h > b.y0 - 3) y0 = b.y0 - h - 4 >= (big ? 60 : 46) ? b.y0 - h - 4 : b.y1 + 4;
  const sc = pulse ? 1 + 0.05 * Math.sin(G.clock * 12) : 1;
  ctx.save(); ctx.translate(x0 + w / 2, y0 + h / 2); ctx.scale(sc, sc);
  ctx.fillStyle = 'rgba(40,20,40,0.86)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
  text(s, 0, 0.5, fs, col, 'center', 'body');
  ctx.restore();
  return { x0, y0, x1: x0 + w, y1: y0 + h };
}
// the prompts: what each person can do right now, in their own keys
function gumballPrompts(st, boxes) {
  const ps = G.players, nd = gumballNeeds(st), hints = gumballHintsOn(st), t = G.clock;
  const C0 = ps[st.crank], K = ps[st.keep], cName = NAMES[st.crank], kName = NAMES[st.keep];
  const big = gumballBig();
  // the cranker: to the right of the crank, under that side's job card
  if (!gumballCpu(st.crank)) {
    const next = nd.next, live = st.balls.filter(gumballLive).length;
    let s = '', col = '#fff3d6', pulse = false;
    if (!st.queue.length) s = '';
    else if (live >= GUMBALL.maxBalls) s = 'Wait: the board is busy';
    else if (st.roomT < 7 && st.stats.cranks[st.crank] + st.stats.cranks[st.keep] === 0) { s = gumballKey(st.crank, 'act') + ': crank!' + (st.M.chutes.length > 1 ? '  ' + gumballKey(st.crank, 'lr') + ': chute' : ''); col = C.gold; pulse = true; }
    else if (hints && next) {
      if (next.chuteBest >= 0 && next.chuteBest !== st.chute && (!next.best || next.best.cost > next.bestAny.cost + 0.6)) { s = gumballKey(st.crank, next.chuteBest > st.chute ? 'right' : 'left') + ' Chute ' + (next.chuteBest + 1) + ' for ' + GUMBALL_COL[next.col].name.toLowerCase(); col = C.gold; pulse = true; }
      else if (nd.ready && nd.busy === 0) {
        const keeperSet = nd.jobs.filter(j => !j.b && (j.kind === 'time' || j.kind === 'flick')).every(j => j.lever && gumballLeverAt(st, K) === j.lever);
        if (keeperSet) { s = 'Ready! ' + gumballKey(st.crank, 'act') + ': crank'; col = '#9cf2b8'; pulse = true; }
        else s = 'Wait for ' + kName + ' at the lever';
      } else if (nd.busy) s = 'Wait for the gumball to roll';
      else s = 'Wait for ' + kName + '...';
    } else if (st.k === 0 && !st.stats.calls) { s = gumballKey(st.crank, 'up') + ': call out the colour'; }
    if (s) {
      const x = C0.x + C0.w + 14, y = (big ? 214 : 168);
      boxes.push(gumballChip(s, x, y, col, boxes, pulse, 'left'));
    }
  }
  // the keeper: over their head
  if (!gumballCpu(st.keep) && K.alive) {
    const lv = gumballLeverAt(st, K), job = nd.jobs[0] || null;
    let s = '', col = '#fff3d6', pulse = false;
    if (hints && job && job.lever) {
      const jl = job.lever, at = lv === jl, nm = gumballLeverName(jl);
      const verb = st.pc[job.dev] && st.pc[job.dev].timed ? 'Shut' : 'Flip';
      if (job.kind === 'flip') { s = at ? verb + ' it! ' + gumballKey(st.keep, 'act') : (job.b ? 'Quick! ' : '') + verb + ' ' + nm; col = C.gold; pulse = at || !!job.b; }
      else if (job.kind === 'time') {
        if (!at) { s = 'Go to ' + nm + (job.b ? ', quick!' : ''); col = C.gold; pulse = !!job.b; }
        else if (job.b) { const eta = gumballEta(st, job.b, job.dev); const win = GUMBALL.openT / gumballSlowK(st) - 0.6; if (eta <= win) { s = 'NOW! ' + gumballKey(st.keep, 'act'); col = C.gold; pulse = true; } else s = 'Wait for it...'; }
        else s = 'Wait here, open it as it comes';
      } else if (job.kind === 'flick') {
        if (!at) { s = 'Go to ' + nm + (job.b ? ', quick!' : ''); col = C.gold; pulse = !!job.b; }
        else if (job.b && job.b.ph === 'rest' && job.b.piece === job.dev) { s = 'Flick it! ' + gumballKey(st.keep, 'act'); col = C.gold; pulse = true; }
        else s = 'Flick it when it lands';
      }
    } else if (hints && nd.ready && nd.busy === 0 && st.queue.length) { s = 'All set! Shout: ' + gumballKey(st.keep, 'act'); col = '#9cf2b8'; }
    else if (lv) { s = gumballKey(st.keep, 'act') + ': ' + (st.pc[lv.dev] && st.pc[lv.dev].t === 'flip' ? 'flick' : st.pc[lv.dev] && st.pc[lv.dev].timed ? (st.pc[lv.dev].open > 0 ? 'shut' : 'open') : 'flip') + ' ' + gumballLeverName(lv).replace('the ', ''); }
    else if (st.roomT < 7 && st.k < 2) { s = 'Run to a lever: ' + gumballKey(st.keep, 'move'); }
    if (s) boxes.push(gumballChip(s, K.x + K.w / 2, K.y - 26, col, boxes, pulse));
    // a gold arrow over the lever that needs a hand
    if (hints && job && job.lever && gumballLeverAt(st, K) !== job.lever) {
      const ax = job.lever.x, ay = job.lever.feet - 76 + Math.sin(t * 6) * 4;
      ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, ay + 10); ctx.lineTo(ax - 9, ay - 2); ctx.lineTo(ax + 9, ay - 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
}
function gumballDrawTop() {
  const st = G.mst;
  if (!st.pc) return;
  const t = G.clock, big = gumballBig(), boxes = (st.cardBox || []).slice();
  // call-outs ("Red next!", "Ready!") over each player
  for (const p of G.players) {
    const c = st.calls[p.id];
    if (!c) continue;
    const a = clamp(Math.min(c.t / 0.12, (1.6 - c.t) / 0.3), 0, 1), fs = big ? 22 : 17;
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = gumballFont(fs);
    const w = ctx.measureText(c.s).width + (c.ball ? 44 : 22), h = fs + 14;
    const x0 = clamp(p.x + p.w / 2 - w / 2, 6, W - 6 - w), y0 = clamp(p.y - 30 - h - c.t * 10, 40, H - h - 6);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = PCOL[p.id]; ctx.lineWidth = 3; rr(x0, y0, w, h, h / 2); ctx.fill(); ctx.stroke();
    if (c.ball) gumballDrawBall(x0 + 16, y0 + h / 2, fs * 0.5, c.ball, 0);
    text(c.s, x0 + (c.ball ? 30 : 11), y0 + h / 2 + 0.5, fs, c.ball ? GUMBALL_COL[c.ball].dark : PDARK[p.id], 'left', 'body');
    ctx.restore();
    boxes.push({ x0, y0, x1: x0 + w, y1: y0 + h });
  }
  if (st.phase === 'play' && G.introT <= GUMBALL.introHold) gumballPrompts(st, boxes);
  // pops (Yum!, Bloop!, Boing!)
  for (const q of st.pops) {
    const size = q.size * (big ? 1.3 : 1);
    ctx.font = size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const w = ctx.measureText(q.s).width + size * 0.3, x = clamp(q.x, w / 2 + 6, W - w / 2 - 6), y = clamp(q.y - q.t * 26, 86, H - 20);
    ctx.save(); ctx.globalAlpha = clamp(Math.min(q.t / 0.1, (1.4 - q.t) / 0.4), 0, 1);
    bigText(q.s, x, y, Math.round(size), q.col);
    ctx.restore();
  }
  if (st.phase === 'won') {
    const k = Math.min(1, st.winT / 0.3);
    bigText('Machine clear!', W / 2, 300, 46, C.gold, 0.6 + 0.4 * k);
  }
  if (st.phase === 'rain') {
    const k = Math.min(1, st.winT / 0.3);
    bigText('JACKPOT!', W / 2, 290, 62, C.gold, (0.6 + 0.4 * k) * (1 + 0.04 * Math.sin(t * 8)));
  }
}
// the touch buttons and the top-bar legend name each player's own action this machine: crank or flip
let gumballLabelEls = null;
function gumballActLabels(st) {
  try {
    if (!gumballLabelEls || !gumballLabelEls.every(o => document.contains(o.el))) gumballLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.dataset.legp !== undefined ? +box.dataset.legp : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
      return { el, id };
    });
    let changed = false;
    for (const o of gumballLabelEls) {
      const want = o.id < 0 ? 'crank/flip' : o.id === st.crank ? 'crank' : 'flip';
      if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
    }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}
function gumballHud() {
  const st = G.mst;
  if (!st.stats) return;
  const big = gumballBig(), z = big ? 1.4 : 1, play = G.mode === 'play' || G.mode === 'paused', t = G.clock;
  // top right: the clock, gumballs in their cups this machine, bloops
  const fs = big ? 20 : 14, h = big ? 40 : 28;
  const parts = [fmtTime(G.time), st.sorted + ' / ' + st.total, 'Bloops ' + st.stats.bloops];
  ctx.font = gumballFont(fs);
  const ws = parts.map(s => ctx.measureText(s).width), gap = fs, icon = fs * 1.2;
  const w = ws[0] + ws[1] + ws[2] + gap * 2 + icon + 34, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
  let x = x0 + 15;
  text(parts[0], x, cy, fs, C.paper, 'left', 'body'); x += ws[0] + gap;
  gumballDrawBall(x + icon / 2, cy, fs * 0.5, st.jack ? 'gold' : 'red', t * 0.5); x += icon + 4;
  text(parts[1], x, cy, fs, '#ffd1ec', 'left', 'body'); x += ws[1] + gap;
  text(parts[2], x, cy, fs, st.stats.bloops ? '#ffb3c1' : C.paper, 'left', 'body');
  let yy = 12 + h + 6;
  // gold help chips
  const chips = [];
  if (st.goldPath) chips.push('GOLD PATH');
  if (st.slow) chips.push('GOLD SLOW-MO');
  if (chips.length) {
    const s = chips.join(' · '), f2 = big ? 15 : 11;
    ctx.font = gumballFont(f2);
    const w2 = ctx.measureText(s).width + 20;
    pill(W - 14, yy, w2, f2 + 10, 'right'); text(s, W - 24, yy + (f2 + 10) / 2 + 0.5, f2, C.gold, 'right', 'body');
    yy += f2 + 16;
  }
  // the news line (gold help, the jackpot): under the clock, right-aligned
  const n = st.news;
  if (n && G.mode === 'play') {
    const a = clamp(Math.min(n.t / 0.2, (n.life - n.t) / 0.3), 0, 1);
    let nfs = big ? 18 : 14;
    ctx.font = gumballFont(nfs);
    let nw = ctx.measureText(n.s).width + 30;
    while (nw > W - 560 + (big ? 140 : 0) && nfs > 10) { nfs--; ctx.font = gumballFont(nfs); nw = ctx.measureText(n.s).width + 30; }
    const nh = nfs + 12;
    ctx.save(); ctx.globalAlpha = a;
    const px = pill(W - 14, yy, nw, nh, 'right');
    if (n.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(px, yy, nw, nh, nh / 2); ctx.stroke(); }
    text(n.s, px + nw / 2, yy + nh / 2 + 0.5, nfs, n.gold ? C.gold : C.paper, 'center', 'body');
    ctx.restore();
    yy += nh + 6;
  }
  st.hudBottom = yy;
  if (!play) { st.cardBox = []; return; }
  // the job cards, top corners under the pills: Pip's on the left, Bo's on the right
  st.cardBox = [];
  for (const id of [0, 1]) {
    const crank = id === st.crank, cw = Math.round(176 * z), chh = Math.round(54 * z);
    const cx = id === 0 ? 8 : W - 8 - cw, cy = id === 0 ? (big ? 98 : 80) : Math.max(big ? 98 : 80, id === 1 ? yy : 80);
    // (faded while the keeper stands right under it)
    const kp = G.players[st.keep], under = kp.alive && kp.x + kp.w > cx && kp.x < cx + cw && kp.y < cy + chh + 30 && kp.y + kp.h > cy;
    ctx.save(); if (under) ctx.globalAlpha = 0.35;
    ctx.fillStyle = 'rgba(40,20,40,0.82)'; rr(cx, cy, cw, chh, 12 * z); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(cx, cy, cw, chh, 12 * z); ctx.stroke();
    const quiet = gumballCpu(id);
    const title = NAMES[id] + (quiet ? (crank ? ' cranks (computer)' : ' levers (computer)') : crank ? ' cranks' : ' flips the levers');
    let tf = 13 * z;
    ctx.font = gumballFont(tf);
    while (tf > 8 && ctx.measureText(title).width > cw - 18 * z) { tf -= 0.5; ctx.font = gumballFont(tf); }
    text(title, cx + 10 * z, cy + 13 * z, tf, PCOL[id], 'left', 'body');
    const chips = crank
      ? (st.M.chutes.length > 1 ? [['lr', 'CHUTE'], ['down', 'SWAP'], ['act', 'CRANK']] : [['up', 'CALL'], ['down', 'SWAP'], ['act', 'CRANK']])
      : [['move', 'MOVE'], ['act', 'FLIP']];
    const nC = chips.length, gw = (cw - 20 * z - (nC - 1) * 6 * z) / nC;
    chips.forEach(([k, lab], i) => {
      const bx = cx + 10 * z + i * (gw + 6 * z), by = cy + 25 * z, bh = 22 * z;
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; rr(bx, by, gw, bh, bh / 2); ctx.fill();
      const kk = quiet ? '' : gumballKey(id, k);
      let f = 11 * z, s = (kk ? kk + ' ' : '') + lab;
      ctx.font = gumballFont(f);
      while (f > 7 && ctx.measureText(s).width > gw - 6) { f -= 0.5; ctx.font = gumballFont(f); }
      text(s, bx + gw / 2, by + bh / 2 + 0.5, f, '#f3e6ff', 'center', 'body');
    });
    ctx.restore();
    st.cardBox.push({ x0: cx, y0: cy, x1: cx + cw, y1: cy + chh });
  }
}

MODES.gumball = {
  // medal (js/medals.js): two computers about 2 min 15 s with no bloops; families on a first try take longer and bloop more
  medals: { bronze: 'Fill every cup', goals: [{ key: 'time', gold: 240, silver: 420 }, { key: 'bloops', gold: 3, silver: 10, word: 'bloop' }] },
  medalValues() { const s = G.mst.stats; return s ? { bloops: s.bloops } : {}; },
  GUMBALL, GUMBALL_MACHINES,
  needs: gumballNeeds, routes: gumballRoutes, best: gumballBest, eta: gumballEta, leverAt: gumballLeverAt, state: gumballState, live: gumballLive, ahead: gumballAhead, key: gumballKey, leverName: gumballLeverName,
  setup(st, L) {
    st.stats = { bloops: 0, sorted: 0, firstTry: 0, cranks: [0, 0], flips: [0, 0], flicks: 0, swaps: 0, calls: 0, chuteMoves: 0, helps: 0, jackpot: false, roomT: [], roomTitles: [] };
    st.backs = {};
    st.allBalls = (LEVELS[G.levelIndex].rooms || []).reduce((n, r) => { const M = GUMBALL_MACHINES[r.machine]; return n + (M ? M.cups.length * M.need : 0); }, 0);
    gumballRoom(st, L);
  },
  room(k, L) { const st = G.mst; st.backs = {}; gumballRoom(st, L); },
  step(dt) { const st = G.mst; if (st.pc) gumballStep(st, dt); },
  draw() { gumballDraw(); },
  drawTop() { gumballDrawTop(); },
  hud() { gumballHud(); },
  stats() {
    const st = G.mst, s = st.stats;
    if (!s) return [];
    const b = s.bloops;
    const words = b === 0 ? 'Not one bloop! Every gumball home first time!' : b <= 3 ? 'Sweet sorting, gumball crew!' : 'Lots of bloops, and every cup filled together!';
    const out = [
      { label: 'Right first time', value: s.firstTry + ' of ' + (st.allBalls || s.sorted) },
      { label: 'Bloops', value: b },
      { label: 'Cranks', values: s.cranks.slice() },
      { label: 'Lever flips', values: s.flips.slice() },
      words,
    ];
    out.push((s.jackpot ? 'JACKPOT! ' : '') + 'Flicks: ' + s.flicks + ' · Swaps: ' + s.swaps + (s.helps ? ' · Gold help ' + s.helps + (s.helps === 1 ? ' time' : ' times') : ''));
    return out;
  },
};

/* ---------- sounds ---------- */
Sfx.extra.gumballCrank = function (p) { [0, 0.07, 0.14, 0.21].forEach((d, i) => this.tone(300 + i * 40 * p, 0.05, 'square', 0.025, null, d)); this.tone(180 * p, 0.12, 'triangle', 0.05, 120 * p, 0.28); };
Sfx.extra.gumballDrop = function () { this.tone(900, 0.06, 'sine', 0.035, 500); };
Sfx.extra.gumballPlink = function () { this.tone(1500 + Math.random() * 500, 0.04, 'triangle', 0.02); };
Sfx.extra.gumballClick = function () { this.tone(1200, 0.03, 'square', 0.02, 800); };
Sfx.extra.gumballTok = function () { this.tone(620, 0.05, 'triangle', 0.035, 420); };
Sfx.extra.gumballTip = function () { this.tone(330, 0.1, 'triangle', 0.04, 220); this.tone(500, 0.06, 'sine', 0.02, null, 0.06); };
Sfx.extra.gumballBoing = function () { this.tone(180, 0.25, 'sine', 0.07, 620); };
Sfx.extra.gumballFlip = function (p) { this.tone(700 * p, 0.05, 'square', 0.03, 1000 * p); this.tone(400 * p, 0.06, 'triangle', 0.03, null, 0.04); };
Sfx.extra.gumballSpin = function (p) { this.tone(500 * p, 0.18, 'sine', 0.04, 900 * p); };
Sfx.extra.gumballBelt = function (p) { this.tone(260 * p, 0.14, 'sawtooth', 0.02, 330 * p); };
Sfx.extra.gumballOpen = function (p) { this.tone(440 * p, 0.08, 'square', 0.03, 660 * p); this.tone(880 * p, 0.08, 'triangle', 0.03, null, 0.07); };
Sfx.extra.gumballShut = function () { this.tone(500, 0.06, 'square', 0.02, 300); };
Sfx.extra.gumballThwack = function () { this.tone(160, 0.08, 'square', 0.05, 90); this.tone(1100, 0.06, 'triangle', 0.03, 1600, 0.03); };
Sfx.extra.gumballYum = function () { [784, 988, 1175].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.gumballFull = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.045, null, 0.18 + i * 0.06)); };
Sfx.extra.gumballBloop = function () { this.tone(520, 0.12, 'sine', 0.06, 200); this.tone(260, 0.2, 'sine', 0.05, 520, 0.12); };
Sfx.extra.gumballBack = function () { this.tone(700, 0.06, 'sine', 0.03, 1000); };
Sfx.extra.gumballNope = function (p) { this.tone(300 * p, 0.07, 'square', 0.025); this.tone(240 * p, 0.09, 'square', 0.025, null, 0.08); };
Sfx.extra.gumballSlide = function (p) { this.tone(600 * p, 0.05, 'triangle', 0.03, 760 * p); };
Sfx.extra.gumballSwap = function (p) { this.tone(500 * p, 0.06, 'triangle', 0.035, 800 * p); this.tone(800 * p, 0.06, 'triangle', 0.035, 500 * p, 0.07); };
Sfx.extra.gumballCall = function (p) { [660 * p, 880 * p].forEach((f, i) => this.tone(f, 0.08, 'square', 0.025, null, i * 0.08)); };
Sfx.extra.gumballReady = function (p) { [523 * p, 784 * p].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.04, null, i * 0.08)); };
Sfx.extra.gumballGold = function () { [784, 988, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.gumballClear = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.055, null, i * 0.08)); };
Sfx.extra.gumballJackpot = function () { [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.06, null, i * 0.08)); this.tone(220, 1.2, 'sine', 0.03, 880, 0.1); };
MODES.gumball.test = { gumballRoutes, gumballBest, gumballNeeds, gumballEta, gumballTrace, gumballState, gumballUseLever, gumballLeverAt, gumballCrank };
