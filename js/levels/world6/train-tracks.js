/* Pip & Bo - Level 6-3 Train Tracks (team). */
'use strict';

/* ===== Train Tracks (World 6, team, mode 'train'): a top-down toy railway on a play rug. A little train drives itself;
   the builder lays track from its last wagon on the dotted squares ahead of it, the switcher flips the junction levers so
   each passenger gets home. Roles swap every room. Nothing fails: the train waits at gaps, a red lamp costs one lap, and a
   gold helper bird steps in after clear thresholds. Every top-level name starts with TRAIN / train. ===== */
const TRAIN = {
  speed: 2.8,        // cells/s cruise; x room.speed (R1 0.85, R4 1.1) x MODES.train.speedMul
  accel: 1.6,        // cells/s^2 pulling away
  brake: 2.4,        // cells/s^2: the stopping curve is v = sqrt(2 * brake * d)
  look: 4,           // cells of route scanned for the next stop
  stopT: 0.6,        // at a gap or a red lamp the engine stops at t 0.6 of the last cell before it
  depart: 0.8,       // s after the room card before the first departure
  dwell: 1.2,        // s at a station (hops: 0..0.5 off, 0.5..1.0 on)
  doneT: 1.6,        // s of "Everyone's home!" before the next room / level clear
  walk: 150, walkAcc: 1500, walkDec: 2000,   // top-down walking, px/s and px/s^2
  nudge: 10,         // px corner assist around trees, huts and banks
  carry: 3,          // pieces the builder carries (a top-up to 3 at the wagon)
  grabPad: 8,        // px the wagon's box grows for "touching"
  layReach: 14,      // px: builder centre inside the dotted cell grown by this -> lay
  leverReach: 42,    // px, player centre to lever-cell centre
  flipCool: 0.25,    // s between two flips by the same player
  greenHold: 0.8,    // s a lever is held after a flip turns its preview-route lamp green; presses re-arm it
  peepCool: 0.5,     // s per player between two conductor's whistles (act with no lever in reach)
  redWait: 3,        // s the train waits at a red lamp before taking the set (wrong) way
  helpWait: 8,       // s at one gap before the gold bird lays track
  helpLay: 1.2,      // s between helper pieces
  helpMisses: 1,     // wrong turns in a trip before the gold bird sets the levers
  warnCells: 3,      // the lever helper fixes red junctions this many cells ahead; red lamps blink fast inside it
  smoothWait: 0.5,   // s: a trip with at most this much standing still (and no wrong turn) is smooth
  carBox: 26,        // px: each car's square box (boops, wagon touch)
  boopV: 0.3, boopCool: 1.0,
  tootEvery: 2.5,    // s between "toot toot"s while waiting at a gap
  fallT: 0.6, fallRetry: 0.1,   // rickety bridges: s after the wagon leaves; re-check an occupied cell this often
  previewCells: 40,
  hintT: 5,          // s the top-centre key hint shows after each room card
  grabHint: 2,       // s at a gap with an empty-handed builder before "Grab track from the wagon!"
  // the cheeky squirrel (rooms with def.squirrel): up to sqPerTrip visits a trip, never while the lever helper is on or the
  // switcher has been idle sqIdle s; on a room's last trip only on the rails. On a lever,
  // it runs from the nearest hedge to a GREEN lever on the train's route, flips it red and sits on it until the switcher
  // comes within leverReach ("Shoo!"). With no such lever in time it sits on the rails ahead instead: the train stops before
  // it until the switcher shoos it (or the gold bird does, after sqHelp s). It only comes when the switcher can make it:
  // run + walk + slack <= the train's time to that spot.
  sqFar: 12,         // s: it sets off when the train is at most this long (at cruise) from that spot
  sqRun: 1.5,        // s from the hedge to the lever
  sqSlack: 3,        // s the switcher keeps after the run and the walk there (reaction + the press) ...
  sqLateSlack: 1.5,  // ... + this much for each earlier squirrel the train had to wait for (at most 2): kids get more time
  sqRailMin: 9,      // cells: a squirrel on the rails sits at least this far (walking) from the switcher, the farthest it can
  sqRailSlack: 1.2,  // s of slack for a squirrel on the rails (being late there only makes the train wait a little)
  sqPerTrip: 2,      // visits per trip (a second one comes sqGap s after the first has gone, if it still fits)
  sqGap: 1.5,
  sqLastRail: true,  // on a room's last trip it may still sit on the rails (never on a lever: no wrong lap to end a room)
  sqAway: 120,       // px: only when the switcher is farther than this from that lever
  sqFlee: 0.8,       // s back into the hedge
  sqIdle: 30,        // s: no squirrel for a switcher who hasn't touched the controls for this long (an AFK partner)
  sqDelay: [0, 0.8], // s (seeded) after a station stop begins before it may come for the next trip
  sqHelp: 6,         // s the train waits at a squirrel on the rails before the gold bird shoos it
};
const TRAIN_STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const TRAIN_DIRS = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
const TRAIN_OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
const TRAIN_LIGHT = { '─': 'WE', '│': 'NS', '┌': 'ES', '┐': 'WS', '└': 'NE', '┘': 'NW', '├': 'NSE', '┤': 'NSW', '┬': 'WES', '┴': 'WEN', '┼': 'NSEW' };
const TRAIN_HEAVY = { '━': 'WE', '┃': 'NS', '┏': 'ES', '┓': 'WS', '┗': 'NE', '┛': 'NW' };
const TRAIN_DOUBLE = { '═': 'WE', '║': 'NS', '╔': 'ES', '╗': 'WS', '╚': 'NE', '╝': 'NW' };
const TRAIN_ANIMALS = ['bunny', 'duck', 'bear', 'frog'];   // passenger n of the level is TRAIN_ANIMALS[n % 4]
const TRAIN_STATION_DEF = { name: '?', col: '#888888', icon: 'cow' };

/* ---------- map ---------- */
function trainCell(x, y) { const cs = G.mst.cells; return !cs || x < 0 || y < 0 || x >= COLS || y >= ROWS ? null : cs[y * COLS + x]; }
function trainStation(letter) { const s = (LEVELS[G.levelIndex] || {}).stations; return (s && s[letter]) || TRAIN_STATION_DEF; }
function trainParse(st, def) {
  const cells = new Array(COLS * ROWS);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const ch = (def.map[y] || '')[x] || '#';
    const c = { x, y, i: y * COLS + x, ch, solid: false, water: false, foot: false, track: null, ghost: false, bridge: false,
      hut: null, face: null, lever: null, junction: null, merge: null, pop: 0, falling: 0, hedge: false, tree: false, shade: (x * 7 + y * 13) % 3 };
    if (ch === '#') { c.solid = true; if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) c.hedge = true; else c.tree = true; }
    else if (ch === '~') c.water = true;
    else if (ch === '=') { c.water = true; c.foot = true; }
    else if (TRAIN_LIGHT[ch]) c.track = TRAIN_LIGHT[ch];
    else if (TRAIN_HEAVY[ch]) { c.track = TRAIN_HEAVY[ch]; c.ghost = true; }
    else if (TRAIN_DOUBLE[ch]) { c.track = TRAIN_DOUBLE[ch]; c.ghost = true; c.water = true; c.bridge = true; }
    else if ('ABCD'.includes(ch)) { c.hut = ch; c.solid = true; }
    else if (ch === 'Y') c.lever = true; // tied to its junction below
    cells[c.i] = c;
  }
  st.cells = cells;
  st.junctions = (def.junctions || []).map((j, i) => ({ i, x: j.at[0], y: j.at[1], stem: j.stem, exits: j.exits.slice(), set: 0,
    lx: j.lever[0], ly: j.lever[1], anim: 0, wiggle: 0, helpPop: 0, greenT: 0, pulse: 0 }));
  for (const j of st.junctions) {
    const c = trainCell(j.x, j.y), l = trainCell(j.lx, j.ly);
    if (c) c.junction = j;
    if (l) l.lever = j;
  }
  for (const m of def.merges || []) { const c = trainCell(m.at[0], m.at[1]); if (c) c.merge = m.stem; }
  st.stops = {}; st.huts = [];
  for (const c of cells) if (c.hut) {
    st.huts.push(c);
    for (const d of 'NSEW') {
      const n = trainCell(c.x + TRAIN_DIRS[d][0], c.y + TRAIN_DIRS[d][1]);
      if (n && n.track && !st.stops[c.hut]) { st.stops[c.hut] = n; c.face = d; }
    }
  }
}
// the side the train leaves a cell by, entering through side inS
function trainOut(c, inS) {
  if (c.junction) { const j = c.junction; return inS === j.stem ? j.exits[j.set] : j.stem; }
  if (c.merge) return inS === c.merge ? null : c.merge;
  if (c.track.length === 4) return TRAIN_OPP[inS];
  for (const s of c.track) if (s !== inS) return s;
  return null;
}
// the neighbour through outS, only if its track has the matching side (dotted cells included)
function trainNext(c, outS) {
  const n = trainCell(c.x + TRAIN_DIRS[outS][0], c.y + TRAIN_DIRS[outS][1]);
  return n && n.track && n.track.includes(TRAIN_OPP[outS]) ? n : null;
}
const trainLen = (inS, outS) => (TRAIN_OPP[inS] === outS ? 1 : Math.PI / 4);
// position and heading on a piece at t (straight: the line between side midpoints; curve: a quarter circle, r 15)
function trainPos(c, inS, outS, t, o) {
  o = o || {};
  const cx = c.x * T + 15, cy = c.y * T + 15, di = TRAIN_DIRS[inS], dd = TRAIN_DIRS[outS] || TRAIN_DIRS[TRAIN_OPP[inS]];
  const ax = cx + di[0] * 15, ay = cy + di[1] * 15, bx = cx + dd[0] * 15, by = cy + dd[1] * 15;
  if (di[0] === -dd[0] && di[1] === -dd[1]) { o.x = ax + (bx - ax) * t; o.y = ay + (by - ay) * t; o.ang = Math.atan2(by - ay, bx - ax); return o; }
  const kx = cx + (di[0] + dd[0]) * 15, ky = cy + (di[1] + dd[1]) * 15;
  const a0 = Math.atan2(ay - ky, ax - kx), a1 = Math.atan2(by - ky, bx - kx);
  let da = a1 - a0; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
  const an = a0 + da * t;
  o.x = kx + Math.cos(an) * 15; o.y = ky + Math.sin(an) * 15; o.ang = an + Math.sign(da) * Math.PI / 2;
  return o;
}
// cells ahead of the engine: [{ c, inS, outS }], starting with the engine's own cell
function trainRoute(st, n, out) {
  out = out || [];
  out.length = 0;
  let cur = st.tr.hist[0];
  out.push(cur);
  for (let k = 0; k < n; k++) {
    const nc = cur.outS && trainNext(cur.c, cur.outS);
    if (!nc) break;
    const inS = TRAIN_OPP[cur.outS];
    cur = { c: nc, inS, outS: trainOut(nc, inS) };
    out.push(cur);
  }
  return out;
}
// shortest distance (cells) from entering c0 through inS0 to the stop cell dest; every junction free, dotted cells count
function trainDistTo(st, c0, inS0, dest) {
  const seen = new Uint8Array(COLS * ROWS * 4), q = [c0, inS0, 0];
  for (let h = 0; h < q.length; h += 3) {
    const c = q[h], inS = q[h + 1], d = q[h + 2];
    if (c === dest) return d;
    const key = c.i * 4 + 'NSEW'.indexOf(inS);
    if (seen[key]) continue;
    seen[key] = 1;
    const outs = c.junction ? (inS === c.junction.stem ? c.junction.exits : [c.junction.stem]) : [trainOut(c, inS)];
    for (const o of outs) { const n = o && trainNext(c, o); if (n) q.push(n, TRAIN_OPP[o], d + 1); }
  }
  return Infinity;
}
function trainBestExit(st, j, dest) {
  const c = trainCell(j.x, j.y);
  const ds = j.exits.map(o => { const n = trainNext(c, o); return n ? trainDistTo(st, n, TRAIN_OPP[o], dest) : Infinity; });
  return ds[0] <= ds[1] ? 0 : 1;
}
const trainIsRed = (st, j, letter) => !!letter && !!st.best[j.i] && st.best[j.i][letter] !== undefined && j.set !== st.best[j.i][letter];
const trainPlain = c => !!c && !!c.track && c.track.length === 2 && !c.junction && !c.merge;

// map check: flood every (cell, side) the train can reach from its start (all lever settings); one warning per room
function trainValidate(st, def) {
  const tr = st.tr, errs = [], dirs = new Map(), seen = new Set(), q = [[tr.hist[0].c, tr.hist[0].inS]];
  while (q.length) {
    const [c, inS] = q.shift(), key = c.i * 4 + 'NSEW'.indexOf(inS);
    if (seen.has(key)) continue;
    seen.add(key);
    if (!dirs.has(c)) dirs.set(c, new Set());
    dirs.get(c).add(inS);
    if (c.merge && inS === c.merge) { errs.push('merge ' + c.x + ',' + c.y + ' entered from its stem'); continue; }
    const outs = c.junction ? (inS === c.junction.stem ? c.junction.exits : [c.junction.stem]) : [trainOut(c, inS)];
    for (const o of outs) { const n = o && trainNext(c, o); if (!n) errs.push('dead end leaving ' + c.x + ',' + c.y + ' by ' + o); else q.push([n, TRAIN_OPP[o]]); }
  }
  for (const c of st.cells) {
    if (c.track) {
      const d = dirs.get(c);
      if (!d) errs.push('track ' + c.x + ',' + c.y + ' is never reached');
      else if (!c.junction && !c.merge && c.track.length !== 4 && d.size > 1) errs.push('track ' + c.x + ',' + c.y + ' is run both ways');
      if (c.track.length === 3 && !c.junction && !c.merge) errs.push('3-way cell ' + c.x + ',' + c.y + ' is neither a junction nor a merge');
    }
    if (c.lever === true) errs.push('lever ' + c.x + ',' + c.y + ' has no junction');
  }
  for (const j of st.junctions) {
    const c = trainCell(j.x, j.y);
    if (!c || !c.track || c.track.length !== 3) errs.push('junction ' + j.x + ',' + j.y + ' is not a 3-way cell');
    if (Math.max(Math.abs(j.lx - j.x), Math.abs(j.ly - j.y)) !== 1) errs.push('lever ' + j.lx + ',' + j.ly + ' is not next to its junction');
  }
  for (const k of st.trips) {
    const s = st.stops[k];
    if (!s || !dirs.get(s)) { errs.push('station ' + k + ' unreachable'); continue; }
    for (const inS of dirs.get(s)) { const o = trainOut(s, inS), n = o && trainNext(s, o); if (!trainPlain(n)) errs.push('station ' + k + ': the engine cell after the stop is not a plain piece'); }
  }
  for (let k = 1; k < tr.hist.length; k++) if (!trainPlain(tr.hist[k].c)) errs.push('start car ' + k + ' is not on a plain piece');
  st.dirs = dirs;
  if (errs.length) console.warn('Train Tracks room ' + ((def.roomIndex || 0) + 1) + ': ' + errs.slice(0, 6).join('; '));
  return errs;
}

/* ---------- a room ---------- */
function trainRoom(st, L) {
  const def = L.def;
  trainParse(st, def);
  st.builder = def.builder === 1 ? 1 : 0; st.switcher = 1 - st.builder;
  st.roomSpeed = TRAIN.speed * (def.speed || 1) * (MODES.train.speedMul || 1);
  st.trips = (def.trips || []).slice(); st.trip = 0; st.misses = 0; st.waitTrip = 0; st.helpOn = false;
  st.roomSmooth = 0; st.roomDelivered = 0; st.phase = 'wait'; st.phaseT = 0;
  // the train: hist[0] engine, [1] coach, [2] wagon; every car sits on its own cell at the same t
  const e = trainCell(def.train.at[0], def.train.at[1]), dir = def.train.dir;
  const hist = [{ c: e, inS: TRAIN_OPP[dir], outS: dir }];
  for (let k = 0; k < 2; k++) {
    const cur = hist[hist.length - 1], pc = trainCell(cur.c.x + TRAIN_DIRS[cur.inS][0], cur.c.y + TRAIN_DIRS[cur.inS][1]);
    const out = TRAIN_OPP[cur.inS];
    let pin = null;
    if (pc && pc.track) for (const s of pc.track) if (s !== out) { pin = s; break; }
    hist.push({ c: pc || cur.c, inS: pin || cur.inS, outS: out });
  }
  st.tr = { hist, t: 0.5, v: 0, kind: null, d: Infinity, waiting: false, dwellT: 0, redT: 0, redJ: null, redPass: null,
    waitGap: 0, waitAny: 0, tootT: 0, puffT: 0, bellT: 0, chuff: 0 };
  st.boxes = [0, 1, 2].map(() => ({ x: 0, y: 0, w: TRAIN.carBox, h: TRAIN.carBox }));
  st.carPos = [0, 1, 2].map(() => ({ x: 0, y: 0, ang: 0 }));
  st.carry = 0; st.cool = [0, 0]; st.peepT = [0, 0]; st.boopT = [0, 0]; st.walkPh = [0, 0];
  st.fall = []; st.helpT = 0.3; st.helpBird = false; st.helpRun = false;
  st.steam = []; st.pops = []; st.bubbles = [null, null]; st.hop = null; st.leaver = null;
  st.bird = { mode: 'off', x: -40, y: -40, fx: 0, fy: 0, t: 0, flap: 0, linger: 0 };
  st.sq = { mode: 'off', kind: null, j: null, cell: null, x: -40, y: -40, fx: 0, fy: 0, tx: 0, ty: 0, t: 0, anim: 0, face: 1, check: 0, chit: 0, waitT: 0 };
  st.sqN = 0; st.sqKey = -1; st.sqDelay = 0;
  st.cardDone = false; st.cardT = 0; st.grabHinted = false; st.emerg = 0;
  st.rider = st.passenger; st.waiter = st.passenger + 1;
  st.routeTmp = []; st.dirty = true; st.dyn = [];
  st.flowH = st.cells.map(c => { const l = trainCell(c.x - 1, c.y), r = trainCell(c.x + 1, c.y); return !!((l && l.water) || (r && r.water)); });
  st.hasWater = st.cells.some(c => c.water);
  st.best = st.junctions.map(j => {
    const o = {};
    for (const k of Object.keys(st.stops)) o[k] = trainBestExit(st, j, st.stops[k]);
    return o;
  });
  trainValidate(st, def);
  trainBoxes(st);
  trainPreview(st);
}

// each car's box (boops, the wagon touch) and drawing position
function trainBoxes(st) {
  const tr = st.tr;
  tr.hist.forEach((h, k) => {
    const p = trainPos(h.c, h.inS, h.outS, tr.t, st.carPos[k]), b = st.boxes[k];
    b.x = p.x - TRAIN.carBox / 2; b.y = p.y - TRAIN.carBox / 2;
  });
}

// the route preview for the preview destination: dots, orange "lay these next" cells, coloured lamps, an end marker
function trainPreview(st) {
  const pv = st.pv || (st.pv = { route: [], lamps: new Map(), lampK: new Map(), ghosts: new Set(), end: null, endCell: null, dest: null, firstGhost: null });
  pv.route.length = 0; pv.lamps.clear(); pv.lampK.clear(); pv.ghosts.clear(); pv.end = null; pv.endCell = null; pv.firstGhost = null;
  const letter = st.phase === 'dwell' ? st.trips[st.trip + 1] : st.phase === 'wait' || st.phase === 'run' ? st.trips[st.trip] : null;
  pv.dest = letter || null;
  if (!letter || !st.tr) return pv;
  const dest = st.stops[letter];
  let cur = st.tr.hist[0];
  for (let k = 0; k <= TRAIN.previewCells; k++) {
    if (k > 0) {
      const nc = cur.outS && trainNext(cur.c, cur.outS);
      if (!nc) break;
      const inS = TRAIN_OPP[cur.outS];
      cur = { c: nc, inS, outS: trainOut(nc, inS) };
      const j = nc.junction;
      if (j && inS === j.stem) {
        const red = trainIsRed(st, j, letter);
        if (!pv.lamps.has(j)) { pv.lamps.set(j, red ? 'red' : 'green'); pv.lampK.set(j, k); }
        if (red) { pv.route.push(cur); pv.end = 'red'; pv.endCell = nc; break; }
      }
    }
    pv.route.push(cur);
    if (cur.c.ghost) { pv.ghosts.add(cur.c); if (!pv.firstGhost) pv.firstGhost = cur.c; }
    if (cur.c === dest && (k > 0 || st.phase !== 'dwell')) {
      pv.end = 'star'; pv.endCell = dest;
      // the station stop puts the coach on the stop cell, so the engine needs the cell after it too: a dotted one pulses
      const nx = cur.outS && trainNext(cur.c, cur.outS);
      if (nx && nx.ghost) { pv.ghosts.add(nx); if (!pv.firstGhost) pv.firstGhost = nx; }
      break;
    }
  }
  return pv;
}

// distance (path units) from the engine to where it must stop next: a station, a gap, a red lamp (or a dead end)
function trainStopDist(st) {
  const tr = st.tr, route = trainRoute(st, TRAIN.look, st.routeTmp);
  const letter = st.trips[st.trip], dest = st.phase === 'run' ? st.stops[letter] : null;
  const sqc = st.sq && st.sq.mode === 'sit' && st.sq.kind === 'rail' ? st.sq.cell : null;
  let best = Infinity, kind = null, redJ = null, sPrev = 0, lenPrev = 0;
  for (let k = 0; k < route.length; k++) {
    const r = route[k], len = trainLen(r.inS, r.outS), s = k === 0 ? -tr.t * len : sPrev + lenPrev;
    // station: the engine at t 0.5 of route[k] puts the coach at the centre of the stop cell (route[k-1])
    const prev = k ? route[k - 1].c : tr.hist[1].c;
    if (dest && prev === dest) { const d = s + 0.5 * len; if (d >= -0.001 && d < best) { best = d; kind = 'station'; } }
    if (k >= 1) {
      const dStop = sPrev + TRAIN.stopT * lenPrev;
      if (r.c.ghost) { if (dStop < best) { best = dStop; kind = 'gap'; } break; }
      if (r.c === sqc) { if (dStop < best) { best = dStop; kind = 'squirrel'; } break; }
      const j = r.c.junction;
      if (j && r.inS === j.stem && j !== tr.redPass && trainIsRed(st, j, letter)) { if (dStop < best) { best = dStop; kind = 'red'; redJ = j; } break; }
    }
    if (k === route.length - 1 && k < TRAIN.look && kind === null) { // end of the line (only in a broken map)
      const d = s + TRAIN.stopT * len; if (d < best) { best = d; kind = 'end'; }
    }
    sPrev = s; lenPrev = len;
  }
  return { d: Math.max(0, best), kind, redJ };
}

/* ---------- players: top-down walking ---------- */
function trainOnPad(id) { return Pads.kind === 'pad' && !!padFor(padSlots(), id); }
function trainHow(id) { return actKey(id); } // (each player's own device: js/controls.js)
function trainKey(id) { const h = trainHow(id); return h === 'pad' ? glyph('act') : h === 'touch' ? 'tap' : id === 0 ? 'F' : '/'; }
// 1 player + computer: true for the computer's character (no key hints over it)
const trainCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
function trainWalkKeys(id) { const h = trainHow(id); return h === 'pad' ? 'stick' : h === 'touch' ? '◀ ▶ ▲ ▼' : id === 0 ? 'W A S D' : '← ↑ → ↓'; }
function trainSolid(st, x, y) {
  const c = trainCell(x, y);
  if (!c || c.solid) return true;
  return c.water && !c.foot && (!c.track || c.ghost);
}
function trainMove(st, p, dx, dy, dt, noNudge) {
  if (!dx && !dy) return;
  p.x += dx; p.y += dy;
  const x1 = Math.floor(p.x / T), x2 = Math.floor((p.x + p.w - 0.001) / T), y1 = Math.floor(p.y / T), y2 = Math.floor((p.y + p.h - 0.001) / T);
  for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) {
    if (!trainSolid(st, x, y)) continue;
    if (dx > 0) p.x = x * T - p.w; else if (dx < 0) p.x = (x + 1) * T;
    if (dy > 0) p.y = y * T - p.h; else if (dy < 0) p.y = (y + 1) * T;
    // corner assist: clipped a tree or a hut corner by a few px -> slide around it (only if the way round is open,
    // and never against the way the player is steering: a held diagonal used to cancel it and freeze them at the corner)
    let nudged = false;
    if (!noNudge) {
      const N = TRAIN.nudge, stp = TRAIN.walk * dt;
      if (dx) {
        const dn = p.y + p.h - y * T, up = (y + 1) * T - p.y;
        if (dn > 0 && dn <= N && p.vy <= 0 && !trainSolid(st, x, y - 1)) { trainMove(st, p, 0, -Math.min(dn, stp), dt, true); nudged = true; }
        else if (up > 0 && up <= N && p.vy >= 0 && !trainSolid(st, x, y + 1)) { trainMove(st, p, 0, Math.min(up, stp), dt, true); nudged = true; }
      } else {
        const rt = p.x + p.w - x * T, lf = (x + 1) * T - p.x;
        if (rt > 0 && rt <= N && p.vx <= 0 && !trainSolid(st, x - 1, y)) { trainMove(st, p, -Math.min(rt, stp), 0, dt, true); nudged = true; }
        else if (lf > 0 && lf <= N && p.vx >= 0 && !trainSolid(st, x + 1, y)) { trainMove(st, p, Math.min(lf, stp), 0, dt, true); nudged = true; }
      }
    }
    if (!nudged) { if (dx) p.vx = 0; if (dy) p.vy = 0; }
    return;
  }
}
function trainPlayers(st, dt, locked) {
  for (const p of G.players) {
    const inp = locked ? NO_INPUT : p.input, id = p.id;
    const up = inp.up || (inp.jump && !trainOnPad(id));
    let mx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), my = (inp.down ? 1 : 0) - (up ? 1 : 0);
    if (mx && my) { mx *= Math.SQRT1_2; my *= Math.SQRT1_2; }
    p.vx = approach(p.vx, mx * TRAIN.walk, (mx ? TRAIN.walkAcc : TRAIN.walkDec) * dt);
    p.vy = approach(p.vy, my * TRAIN.walk, (my ? TRAIN.walkAcc : TRAIN.walkDec) * dt);
    if (mx) p.face = mx > 0 ? 1 : -1;
    trainMove(st, p, p.vx * dt, 0, dt);
    trainMove(st, p, 0, p.vy * dt, dt);
    p.grounded = true; p.jumping = false; p.alive = true;
    st.boopT[id] = Math.max(0, st.boopT[id] - dt);
    if (Math.hypot(p.vx, p.vy) > 20 && st.boopT[id] < TRAIN.boopCool - 0.25) {
      st.walkPh[id] += dt * 14;
      p.sy = 1 + 0.05 * Math.abs(Math.sin(st.walkPh[id]));
    }
    // the train never blocks anyone: the engine boops whoever it rolls through
    if (st.tr.v > TRAIN.boopV && st.boopT[id] <= 0 && overlap(p, st.boxes[0])) {
      st.boopT[id] = TRAIN.boopCool; p.sx = 1.3; p.sy = 0.75; st.boops++;
      Sfx.play('trainBoop', id); rumble(id, 0.3, 0.3, 90);
    }
  }
}

/* ---------- jobs: grab, lay, flip, whistle ---------- */
function trainJobs(st, dt, locked) {
  const tr = st.tr, b = G.players[st.builder];
  for (let k = 0; k < 2; k++) { st.cool[k] = Math.max(0, st.cool[k] - dt); st.peepT[k] = Math.max(0, st.peepT[k] - dt); }
  if (!locked && st.phase !== 'done') {
    // grab: touch the track wagon -> carry 3 (a top-up)
    const w = st.boxes[2], g = TRAIN.grabPad;
    if (st.carry < TRAIN.carry && rectHit(b, w.x - g, w.y - g, w.w + 2 * g, w.h + 2 * g)) {
      st.carry = TRAIN.carry; st.grabs++;
      Sfx.play('trainGrab', b.id); puff(w.x + w.w / 2, w.y + w.h / 2, 3, '#e0b07a'); rumble(b.id, 0, 0.15, 30);
      if (st.bubbles[b.id] && st.bubbles[b.id].grab) st.bubbles[b.id] = null;
    }
    // lay: the nearest dotted cell whose rect grown by layReach holds the builder's centre (one per tick)
    if (st.carry > 0) {
      const bx = b.x + b.w / 2, by = b.y + b.h / 2, R = TRAIN.layReach;
      let pick = null, pd = 1e9;
      for (let y = Math.floor((by - 45) / T); y <= Math.floor((by + 45) / T); y++) for (let x = Math.floor((bx - 45) / T); x <= Math.floor((bx + 45) / T); x++) {
        const c = trainCell(x, y);
        if (!c || !c.ghost) continue;
        if (bx > x * T - R && bx < x * T + T + R && by > y * T - R && by < y * T + T + R) {
          const d = Math.hypot(bx - x * T - 15, by - y * T - 15);
          if (d < pd) { pd = d; pick = c; }
        }
      }
      if (pick) { trainLay(st, pick, b.id); st.carry--; st.laid[b.id]++; rumble(b.id, 0, 0.2, 40); }
    }
  }
  // presses (act, or A/B on a controller): consumed every tick, also during the card
  for (const p of G.players) {
    const id = p.id, fromAct = p.pendingAct, press = fromAct || (trainOnPad(id) && p.pendingJump);
    p.pendingAct = false; p.pendingJump = false;
    if (!press || locked || st.phase === 'done') continue;
    let near = null, nd = TRAIN.leverReach;
    const px = p.x + p.w / 2, py = p.y + p.h / 2;
    for (const j of st.junctions) { const d = Math.hypot(px - (j.lx * T + 15), py - (j.ly * T + 15)); if (d < nd) { nd = d; near = j; } }
    if (!near) {
      // the conductor's whistle: act always answers (cosmetic only)
      if (fromAct && st.peepT[id] <= 0) {
        st.peepT[id] = TRAIN.peepCool; st.peeps++;
        trainPop(st, 'Peep!', px, p.y - 30, C.paper, 15, 0.6, 14);
        st.steam.push({ x: px - 6, y: p.y - 4, vx: -14, vy: -22, r0: 2, r1: 5, t: 0.5, max: 0.5, a: 0.7 }, { x: px + 6, y: p.y - 4, vx: 14, vy: -22, r0: 2, r1: 5, t: 0.5, max: 0.5, a: 0.7 });
        Sfx.play('trainPeep', id);
      }
      continue;
    }
    if (id !== st.switcher) { trainBubble(st, id, NAMES[st.switcher] + ' flips!', 1.2); continue; }
    if (st.cool[id] > 0) continue;
    st.cool[id] = TRAIN.flipCool;
    if (tr.hist.some(h => h.c.junction === near)) { near.wiggle = 0.3; Sfx.play('trainNope', id); rumble(id, 0, 0.15, 40); continue; }
    if (near.greenT > 0 && st.pv.lamps.get(near) === 'green') { // green lock: a mash always ends on green
      near.greenT = TRAIN.greenHold; near.pulse = 0.25; st.holds++;
      Sfx.play('trainHold', id);
      continue;
    }
    near.set = 1 - near.set; st.flips[id]++;
    Sfx.play('trainFlip', id); rumble(id, 0.2, 0.3, 60);
    trainPreview(st);
    if (st.pv.lamps.get(near) === 'green') { near.greenT = TRAIN.greenHold; Sfx.play('trainGreen'); }
    else near.greenT = 0;
  }
}
function trainLay(st, c, id) {
  c.ghost = false; c.pop = 0.25; c.falling = 0;
  st.dyn.push(c);
  const cx = c.x * T + 15, cy = c.y * T + 15;
  if (id >= 0) { Sfx.play('trainLay', id); puff(cx, cy, 5, 'rgba(255,255,255,0.8)'); }
  else { Sfx.play('trainHelp'); burst(cx, cy, C.gold, 10); trainPop(st, 'Helper!', cx, cy - 10, C.gold, 17); }
  trainPreview(st);
}
function trainBubble(st, id, text, t, grab) { st.bubbles[id] = { text, t, max: t, grab: !!grab }; }
function trainPop(st, text, x, y, col, size, life = 0.9, rise = 30) {
  if (st.pops.length > 24) st.pops.shift();
  st.pops.push({ text, x, y, col, size, t: life, max: life, rise });
}
function trainPuff(st, x, y, r0, r1, life, a) {
  if (st.steam.length >= 40) st.steam.shift();
  const rnd = MODES.train.rand;
  st.steam.push({ x, y, vx: (rnd() - 0.5) * 8, vy: -10 - rnd() * 6, r0, r1, t: life, max: life, a });
}

/* ---------- the train ---------- */
// returns true when the room is over and the game moved on (next room or level clear)
function trainTrain(st, dt) {
  const tr = st.tr;
  tr.waiting = false;
  if (st.phase === 'wait') {
    if (G.introT <= 0) { st.phaseT += dt; if (st.phaseT >= TRAIN.depart) { st.phase = 'run'; st.phaseT = 0; Sfx.play('trainToot'); trainPop(st, 'Toot toot!', st.carPos[0].x, st.carPos[0].y - 22, C.paper, 16); } }
    return false;
  }
  if (st.phase === 'dwell') { trainDwell(st, dt); return false; }
  if (st.phase === 'done') {
    st.phaseT += dt;
    if (st.phaseT >= TRAIN.doneT) {
      const def = G.level.def;
      if (def.roomIndex < def.roomCount - 1) nextRoom(); else levelClear();
      return true;
    }
    return false;
  }
  // run
  const letter = st.trips[st.trip], sd = trainStopDist(st), d = sd.d;
  const v0 = tr.v;
  tr.v = Math.min(tr.v + TRAIN.accel * dt, st.roomSpeed, Math.sqrt(2 * TRAIN.brake * d));
  if (v0 - tr.v > 0.3) { // a toy-train emergency stop: one big puff
    st.emerg++;
    const e = st.carPos[0];
    trainPuff(st, e.x, e.y, 6, 14, 0.9, 0.8);
  }
  tr.kind = sd.kind; tr.d = d;
  if (sd.kind === 'red') tr.redJ = sd.redJ;
  if (sd.kind === 'station' && d <= 0.0005) { trainArrive(st); return false; }
  const waiting = (sd.kind === 'gap' || sd.kind === 'red' || sd.kind === 'end' || sd.kind === 'squirrel') && tr.v < 0.05 && d < 0.01;
  tr.waiting = waiting;
  if (waiting) { st.waitTrip += dt; st.waitAll += dt; }
  // waiting at a gap: toots, big puffs, the grab hint; the track helper counts this (a squirrel on the rails: toots only)
  const atGap = waiting && sd.kind !== 'red' && sd.kind !== 'squirrel', atSq = waiting && sd.kind === 'squirrel';
  if (atGap || atSq) {
    if (tr.waitAny === 0) tr.tootT = 0.5;
    tr.waitAny += dt; tr.tootT -= dt;
    if (tr.tootT <= 0) { tr.tootT = TRAIN.tootEvery; Sfx.play('trainWait'); trainPop(st, 'Toot toot!', st.carPos[0].x, st.carPos[0].y - 22, C.paper, 16); }
  } else tr.waitAny = 0;
  if (atGap) {
    tr.waitGap += dt;
    if (tr.waitGap >= TRAIN.grabHint && st.carry === 0 && !st.grabHinted) { st.grabHinted = true; if (!trainCpu(st.builder)) trainBubble(st, st.builder, 'Grab track from the wagon!', 2.5, true); }
  } else { tr.waitGap = 0; st.grabHinted = false; }
  // waiting at a red lamp: the bell, then after redWait the train goes the set (wrong) way
  if (waiting && sd.kind === 'red') {
    if (tr.redT === 0 || tr.bellT <= 0) { tr.bellT = 1; Sfx.play('trainRed'); }
    tr.redT += dt; tr.bellT -= dt;
    if (tr.redT >= TRAIN.redWait) { tr.redPass = tr.redJ; tr.redT = 0; Sfx.play('trainToot'); }
  } else { tr.redT = 0; tr.bellT = 0; }
  // move along the track
  let adv = Math.min(tr.v * dt, d);
  while (adv > 1e-9) {
    const h = tr.hist[0], len = trainLen(h.inS, h.outS);
    if (tr.t + adv / len < 1) { tr.t += adv / len; break; }
    adv -= (1 - tr.t) * len;
    const nc = h.outS && trainNext(h.c, h.outS);
    if (!nc || nc.ghost) { tr.t = 1; tr.v = 0; break; } // safety only: the stop logic never lets it happen
    const inS = TRAIN_OPP[h.outS], j = nc.junction;
    if (j && inS === j.stem) {
      if (trainIsRed(st, j, letter)) {
        st.misses++; st.wrong++;
        trainPop(st, 'Long way round!', st.carPos[0].x, st.carPos[0].y - 22, C.paper, 16);
        if (st.misses >= TRAIN.helpMisses && !st.helpOn) {
          st.helpOn = true;
          const s = G.players[st.switcher];
          trainPop(st, 'Helper bird!', s.x + s.w / 2, s.y - 34, C.gold, 17);
        }
      }
      tr.redPass = null;
    }
    tr.hist.unshift({ c: nc, inS, outS: trainOut(nc, inS) });
    const left = tr.hist.pop();
    tr.t = 0;
    if (G.level.def.rickety && left.c.bridge && !left.c.ghost) {
      const f = st.fall.find(q => q.c === left.c);
      if (f) f.t = TRAIN.fallT; else st.fall.push({ c: left.c, t: TRAIN.fallT });
    }
    if (tr.v > 0.5) Sfx.play('trainChuff');
  }
  // steam from the chimney
  tr.puffT -= dt;
  if (tr.puffT <= 0) {
    const e = st.carPos[0], ch = { x: e.x + Math.cos(e.ang) * 6, y: e.y + Math.sin(e.ang) * 6 }, rm = reduceMotion ? 2 : 1;
    if (waiting) { tr.puffT = 0.6 * rm; trainPuff(st, ch.x, ch.y, 5, 12, 0.8, 0.6); }
    else if (tr.v > 0.2) { tr.puffT = 0.3 * rm; trainPuff(st, ch.x, ch.y, 3, 8, 0.8, 0.6); }
    else tr.puffT = 0.1;
  }
  return false;
}
function trainArrive(st) {
  const tr = st.tr, letter = st.trips[st.trip], stop = st.stops[letter];
  tr.v = 0; st.phase = 'dwell'; tr.dwellT = TRAIN.dwell; st.delivered++; st.roomDelivered++;
  const smooth = st.misses === 0 && st.waitTrip <= TRAIN.smoothWait;
  if (smooth) { st.smooth++; st.roomSmooth++; }
  Sfx.play('trainDing');
  const cx = stop.x * T + 15, cy = stop.y * T + 15;
  for (let k = 0; k < 14; k++) confetti(cx, cy);
  rumble(0, 0, 0.25, 80); rumble(1, 0, 0.25, 80);
  const hut = st.huts.find(h => h.hut === letter);
  const last = st.trip >= st.trips.length - 1;
  st.hop = { t: 0, hut, letter, off: st.rider, on: last ? null : st.waiter, offDone: false, onDone: false, last };
  trainPop(st, '+1', st.carPos[1].x, st.carPos[1].y - 20, C.paper, 16);
  trainPreview(st);
}
function trainDwell(st, dt) {
  const tr = st.tr, hp = st.hop;
  if (hp) {
    hp.t += dt;
    if (!hp.offDone) { hp.offDone = true; Sfx.play('trainHop'); }
    if (hp.t >= 0.5 && !hp.onDone) {
      hp.onDone = true;
      const P = trainPlatform(st, hp.hut, -1);
      st.leaver = { idx: hp.off, x: P.x, y: P.y, t: hp.last ? 2.6 : 1.2, heart: hp.last };
      if (hp.on !== null) { st.rider = hp.on; st.waiter = hp.on + 1; Sfx.play('trainHop'); }
      else st.rider = null;
    }
  }
  tr.dwellT -= dt;
  if (tr.dwellT > 0) return;
  st.hop = null; st.trip++;
  if (st.trip < st.trips.length) {
    st.phase = 'run'; st.misses = 0; st.waitTrip = 0; st.helpOn = false;
    Sfx.play('trainToot');
    return;
  }
  // everyone's home
  st.phase = 'done'; st.phaseT = 0; st.passenger = st.waiter + 1;
  Sfx.play('trainRoomDone'); rumble(0, 0.3, 0.4, 150); rumble(1, 0.3, 0.4, 150);
  for (const h of st.huts) if (st.trips.includes(h.hut)) for (let k = 0; k < 12; k++) confetti(h.x * T + 15, h.y * T + 10);
  const def = G.level.def;
  if (def.roomIndex === def.roomCount - 1 && st.smooth === st.tripsTotal) {
    st.golden = true;
    Sfx.play('trainWhistle'); rumble(0, 0.4, 0.5, 250); rumble(1, 0.4, 0.5, 250);
    for (let k = 0; k < 60; k++) confetti(W * (0.2 + 0.3 * (k % 3)), 40);
  }
}

/* ---------- the gold helper bird ---------- */
function trainHelp(st, dt) {
  const tr = st.tr, gapWait = tr.waiting && (tr.kind === 'gap' || tr.kind === 'end');
  // track: after helpWait s at one gap, a piece now and then one every helpLay s until that gap is closed
  // (helpRun: the train creeping on to the next dotted cell of the same gap does not restart the 8 s)
  if (st.helpRun && (st.phase !== 'run' || tr.kind !== 'gap')) st.helpRun = false;
  if ((gapWait && tr.waitGap >= TRAIN.helpWait) || st.helpRun) {
    st.helpT -= dt;
    if (st.helpT <= 0) {
      st.helpT = TRAIN.helpLay;
      const g = trainRoute(st, 6, st.routeTmp).find(r => r.c.ghost);
      if (g) {
        trainLay(st, g.c, -1); st.helped++; st.helpRun = true;
        if (!st.helpBird) { st.helpBird = true; const b = G.players[st.builder]; trainPop(st, 'Helper bird!', b.x + b.w / 2, b.y - 34, C.gold, 17); }
      }
    }
  } else { st.helpT = 0.3; if (!gapWait) st.helpBird = false; }
  // levers: after a wrong turn in this trip, the bird sets red junctions a few cells ahead
  if (st.helpOn && st.phase === 'run') {
    const route = trainRoute(st, TRAIN.warnCells, st.routeTmp), letter = st.trips[st.trip];
    for (let k = 1; k < route.length; k++) {
      const r = route[k], j = r.c.junction;
      if (!j || r.inS !== j.stem || !trainIsRed(st, j, letter) || tr.hist.some(h => h.c.junction === j)) continue;
      j.set = 1 - j.set; st.helped++;
      Sfx.play('trainHelp');
      if (j.helpPop <= 0) { j.helpPop = 0.5; trainPop(st, 'Helper!', j.lx * T + 15, j.ly * T + 2, C.gold, 17); burst(j.lx * T + 15, j.ly * T + 15, C.gold, 8); }
      trainPreview(st);
    }
  }
}
// where the bird wants to be (null: away)
function trainBirdTarget(st) {
  const tr = st.tr;
  if ((tr.waiting && tr.kind === 'gap' && tr.waitGap >= TRAIN.helpWait - 0.2) || st.helpRun) {
    const g = st.pv.firstGhost || trainRoute(st, 6, st.routeTmp).map(r => r.c).find(c => c.ghost);
    if (g) return { x: g.x * T + 15, y: g.y * T - 2, kind: 'track' };
  }
  const sq = st.sq;
  if (sq.mode === 'sit' && sq.kind === 'rail' && sq.waitT >= TRAIN.sqHelp - 0.6) return { x: sq.x + 4, y: sq.y - 22, kind: 'track' };
  if (st.helpOn && (st.phase === 'run' || st.phase === 'dwell')) { const e = st.carPos[0]; return { x: e.x + Math.cos(e.ang) * 6, y: e.y + Math.sin(e.ang) * 6 - 9, kind: 'perch' }; }
  return null;
}
function trainBird(st, dt) {
  const bd = st.bird;
  bd.flap += dt;
  let tg = trainBirdTarget(st);
  if (tg) { bd.last = tg; bd.linger = 0.5; }
  else if (bd.linger > 0 && bd.last && bd.last.kind === 'track') { bd.linger -= dt; tg = bd.last; }
  if (tg) {
    if (bd.mode === 'off' || bd.mode === 'out') {
      const ex = [{ x: tg.x, y: -30 }, { x: -30, y: tg.y }, { x: W + 30, y: tg.y }].sort((a, b) => Math.hypot(a.x - tg.x, a.y - tg.y) - Math.hypot(b.x - tg.x, b.y - tg.y))[0];
      if (bd.mode === 'off') { bd.x = ex.x; bd.y = ex.y; }
      bd.mode = 'in'; bd.t = 0; bd.fx = bd.x; bd.fy = bd.y;
    }
    if (bd.mode === 'in') {
      bd.t += dt;
      const f = Math.min(1, bd.t / 0.5), e = 1 - (1 - f) * (1 - f);
      bd.x = bd.fx + (tg.x - bd.fx) * e; bd.y = bd.fy + (tg.y - bd.fy) * e;
      if (f >= 1) bd.mode = 'on';
    } else { // on: follow the target (a perch rides on the chimney)
      const k = tg.kind === 'perch' ? 1 : Math.min(1, dt * 8);
      bd.x += (tg.x - bd.x) * k; bd.y += (tg.y - bd.y) * k;
    }
    bd.perch = tg.kind === 'perch' && bd.mode === 'on';
  } else if (bd.mode === 'in' || bd.mode === 'on') {
    const ex = [{ x: bd.x, y: -40 }, { x: -40, y: bd.y }, { x: W + 40, y: bd.y }].sort((a, b) => Math.hypot(a.x - bd.x, a.y - bd.y) - Math.hypot(b.x - bd.x, b.y - bd.y))[0];
    bd.mode = 'out'; bd.t = 0; bd.fx = bd.x; bd.fy = bd.y; bd.tx = ex.x; bd.ty = ex.y; bd.perch = false;
  } else if (bd.mode === 'out') {
    bd.t += dt;
    const f = Math.min(1, bd.t / 0.5), e = f * f;
    bd.x = bd.fx + (bd.tx - bd.fx) * e; bd.y = bd.fy + (bd.ty - bd.fy) * e;
    if (f >= 1) bd.mode = 'off';
  }
}

/* ---------- the cheeky squirrel ---------- */
// walking distance (cells, 4-way) from player p to every cell; -1 = can't get there. One flood per check.
function trainFlood(st, p) {
  const n0 = COLS * ROWS, q = st.bfsQ || (st.bfsQ = new Int16Array(n0)), d = st.bfsD || (st.bfsD = new Int16Array(n0));
  d.fill(-1);
  const x0 = clamp(Math.floor((p.x + p.w / 2) / T), 0, COLS - 1), y0 = clamp(Math.floor((p.y + p.h / 2) / T), 0, ROWS - 1);
  let h = 0, n = 0;
  q[n++] = y0 * COLS + x0; d[y0 * COLS + x0] = 0;
  while (h < n) {
    const i = q[h++], x = i % COLS, y = (i / COLS) | 0;
    for (const [dx, dy] of TRAIN_STEPS) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const k = ny * COLS + nx;
      if (d[k] >= 0 || trainSolid(st, nx, ny)) continue;
      d[k] = d[i] + 1; q[n++] = k;
    }
  }
  return d;
}
// cells to walk from the flooded player to within reach of cell x, y (that cell or a side neighbour); Infinity if none
function trainReach(d, x, y) {
  let best = Infinity;
  for (const [dx, dy] of [[0, 0]].concat(TRAIN_STEPS)) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
    const v = d[ny * COLS + nx];
    if (v >= 0 && v < best) best = v;
  }
  return best;
}
function trainWalkTo(st, p, j) { return trainReach(trainFlood(st, p), j.lx, j.ly); } // (tests)
// the nearest point inside the hedge (the map's border) from x, y
function trainHedgePoint(x, y) {
  const o = [{ x, y: -6, d: y }, { x, y: H + 6, d: H - y }, { x: -6, y, d: x }, { x: W + 6, y, d: W - x }];
  return o.sort((a, b) => a.d - b.d)[0];
}
// where the squirrel sits: on the lever's base, on the side away from its lamp, facing the handle
function trainSquirrelSeat(j) {
  const side = j.x < j.lx ? 1 : -1;
  return { x: j.lx * T + 15 - side * 9, y: j.ly * T + 15 + 4, face: side };
}
// a plain finished piece on dry land that isn't a station's stop cell: a squirrel may sit there
function trainSqRail(st, c) {
  if (!trainPlain(c) || c.ghost || c.water || c.bridge) return false;
  for (const k in st.stops) if (st.stops[k] === c) return false;
  return true;
}
// the trip a squirrel coming now is for: during a station stop, the next one
const trainSqKey = st => (st.phase === 'dwell' ? st.trip + 1 : st.trip);
function trainSquirrelCheck(st, dt) {
  const tr = st.tr, sq = st.sq;
  // it may already come while the train stands at a station: then it is for the next trip (the one the preview shows)
  const key = trainSqKey(st), dwell = st.phase === 'dwell';
  if (st.sqKey !== key) { st.sqKey = key; st.sqN = 0; const [a, b] = TRAIN.sqDelay; st.sqDelay = a + (b - a) * MODES.train.rand(); }
  const last = key >= st.trips.length - 1, pv = st.pv;
  if (!G.level.def.squirrel || key >= st.trips.length || st.sqN >= TRAIN.sqPerTrip || (st.phase !== 'run' && !dwell)
    || (st.helpOn && !dwell) || (last && !TRAIN.sqLastRail) || G.introT > 0 || st.idle[st.switcher] > TRAIN.sqIdle) return;
  st.sqDelay -= dt;
  if (st.sqDelay > 0) return;
  // only while the preview reaches the trip's stop (or its first red lamp), and not while pulling in
  if ((pv.end !== 'star' && pv.end !== 'red') || (!dwell && tr.kind === 'station')) return;
  sq.check -= dt;
  if (sq.check > 0) return;
  sq.check = 0.25;
  const s = G.players[st.switcher], sx = s.x + s.w / 2, sy = s.y + s.h / 2, v = st.roomSpeed, t0 = dwell ? tr.dwellT : 0;
  const late = TRAIN.sqLateSlack * Math.min(2, st.sqLate[st.switcher]), run = walk => TRAIN.sqRun + walk * T / TRAIN.walk + late;
  let d = null, pick = null;
  // 1) a green lever on the route (never on a room's last trip)
  if (!last) for (const [j, lamp] of pv.lamps) {
    if (lamp !== 'green') continue;
    const tt = t0 + (pv.lampK.get(j) - 1 + TRAIN.stopT - tr.t) / v;
    if (tt > TRAIN.sqFar || tr.hist.some(h => h.c.junction === j)) continue;
    if (Math.hypot(sx - (j.lx * T + 15), sy - (j.ly * T + 15)) <= TRAIN.sqAway) continue;
    d = d || trainFlood(st, s);
    if (tt >= run(trainReach(d, j.lx, j.ly)) + TRAIN.sqSlack) { pick = { kind: 'lever', j }; break; }
  }
  // 2) else the rails ahead, before the preview's end (the stop or the first red lamp): the spot the switcher can reach
  //    in time that is the longest walk away
  if (!pick) {
    let bw = TRAIN.sqRailMin - 1;
    for (let k = 2; k < pv.route.length; k++) {
      const c = pv.route[k].c, tt = t0 + (k - 1 + TRAIN.stopT - tr.t) / v;
      if (tt > TRAIN.sqFar || c === pv.endCell) break;
      if (!trainSqRail(st, c) || Math.hypot(sx - (c.x * T + 15), sy - (c.y * T + 15)) <= TRAIN.sqAway) continue;
      d = d || trainFlood(st, s);
      const w = trainReach(d, c.x, c.y);
      if (tt >= run(w) + TRAIN.sqRailSlack && w > bw) { bw = w; pick = { kind: 'rail', cell: c }; }
    }
  }
  if (!pick) return;
  const seat = pick.kind === 'lever' ? trainSquirrelSeat(pick.j) : { x: pick.cell.x * T + 15, y: pick.cell.y * T + 15, face: 1 };
  const from = trainHedgePoint(seat.x, seat.y);
  Object.assign(sq, { mode: 'run', key, kind: pick.kind, j: pick.j || null, cell: pick.cell || null, x: from.x, y: from.y, fx: from.x, fy: from.y,
    tx: seat.x, ty: seat.y, t: 0, face: seat.x >= from.x ? 1 : -1, sitFace: seat.face, chit: 0, waitT: 0, late: false });
  st.sqN++; st.squirrels++;
  Sfx.play('trainChitter');
  trainBubble(st, st.switcher, 'A squirrel! Shoo it!', 2.5);
}
function trainSquirrelOff(st, how) { // how: 'shoo' (the switcher), 'bird' (the gold helper) or null (it just leaves)
  const sq = st.sq, to = trainHedgePoint(sq.x, sq.y);
  if (how === 'shoo') {
    st.shooed++;
    trainPop(st, 'Shoo!', sq.x, sq.y - 22, C.paper, 17);
    Sfx.play('trainShoo', st.switcher); rumble(st.switcher, 0.2, 0.25, 70);
    puff(sq.x, sq.y, 4, 'rgba(255,255,255,0.8)');
  } else if (how === 'bird') {
    st.helped++;
    trainPop(st, 'Helper!', sq.x, sq.y - 22, C.gold, 17); burst(sq.x, sq.y, C.gold, 10);
    Sfx.play('trainHelp');
  }
  Object.assign(sq, { mode: 'flee', fx: sq.x, fy: sq.y, tx: to.x, ty: to.y, t: 0, face: to.x > sq.x ? 1 : to.x < sq.x ? -1 : sq.face });
}
function trainSquirrel(st, dt) {
  const sq = st.sq, tr = st.tr, s = G.players[st.switcher];
  for (const p of G.players) { const i = p.input; st.idle[p.id] = i.left || i.right || i.up || i.down || i.jump || i.act ? 0 : st.idle[p.id] + dt; }
  sq.anim += dt;
  if (sq.mode === 'off') { trainSquirrelCheck(st, dt); return; }
  if (sq.mode === 'flee') {
    sq.t += dt;
    const f = Math.min(1, sq.t / TRAIN.sqFlee), e = f * f;
    sq.x = sq.fx + (sq.tx - sq.fx) * e; sq.y = sq.fy + (sq.ty - sq.fy) * e;
    if (f >= 1) { sq.mode = 'off'; st.sqDelay = Math.max(st.sqDelay, TRAIN.sqGap); }
    return;
  }
  // within reach of the switcher (the builder is busy; the squirrel isn't scared of hard hats)
  if (Math.hypot(s.x + s.w / 2 - sq.tx, s.y + s.h / 2 - sq.ty) < TRAIN.leverReach) { trainSquirrelOff(st, 'shoo'); return; }
  const j = sq.j, onSpot = sq.kind === 'lever' ? tr.hist.some(h => h.c.junction === j) : tr.hist.some(h => h.c === sq.cell);
  // its trip ended, the lever helper took over, or the train got there anyway: it scampers off
  if ((st.phase !== 'run' && st.phase !== 'dwell') || sq.key !== trainSqKey(st) || (sq.kind === 'lever' && st.helpOn && st.phase === 'run') || onSpot) {
    trainSquirrelOff(st, null); return;
  }
  if (sq.mode === 'run') {
    sq.t += dt;
    const f = Math.min(1, sq.t / TRAIN.sqRun);
    sq.x = sq.fx + (sq.tx - sq.fx) * f; sq.y = sq.fy + (sq.ty - sq.fy) * f;
    if (f < 1) return;
    if (sq.kind === 'lever') {
      if (st.pv.lamps.get(j) !== 'green') { trainSquirrelOff(st, null); return; } // someone set it some other way meanwhile
      j.set = 1 - j.set; j.greenT = 0; j.wiggle = 0.3;
      trainPreview(st);
      Sfx.play('trainFlip');
    }
    sq.mode = 'sit'; sq.t = 0; sq.face = sq.sitFace; sq.chit = 2.4;
    if (sq.kind === 'rail') { // face the train
      const e = st.carPos[0]; sq.face = e.x > sq.x + 2 ? 1 : e.x < sq.x - 2 ? -1 : sq.face;
    }
    Sfx.play('trainChitter');
    trainPop(st, 'Squirrel!', sq.x, sq.y - 34, C.paper, 16);
    return;
  }
  // sitting: a chitter now and then; on the rails the gold bird shoos it after sqHelp s of the train waiting
  sq.t += dt; sq.chit -= dt;
  if (sq.chit <= 0) { sq.chit = 2.5; Sfx.play('trainChitter'); }
  if (sq.kind === 'lever' && tr.waiting && tr.kind === 'red' && tr.redJ === j && !sq.late) { sq.late = true; st.sqLate[st.switcher]++; }
  if (sq.kind === 'rail' && tr.waiting && tr.kind === 'squirrel') {
    if (!sq.late && sq.waitT >= 0.5) { sq.late = true; st.sqLate[st.switcher]++; }
    sq.waitT += dt;
    if (sq.waitT >= TRAIN.sqHelp) trainSquirrelOff(st, 'bird');
  }
}

/* ---------- rickety bridges ---------- */
function trainFalls(st, dt) {
  if (!st.fall.length) return;
  for (const f of st.fall) {
    f.t -= dt;
    if (f.t > 0) continue;
    const c = f.c;
    if (c.ghost) { f.done = true; continue; }
    const busy = G.players.some(p => rectHit(p, c.x * T, c.y * T, T, T)) || st.tr.hist.some(h => h.c === c);
    if (busy) { f.t = TRAIN.fallRetry; continue; }
    c.ghost = true; c.falling = 0.3; c.pop = 0; f.done = true; st.fallen++;
    st.dyn.push(c);
    const cx = c.x * T + 15, cy = c.y * T + 15;
    Sfx.play('trainFall'); burst(cx, cy, '#bfe6ff', 12);
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.08);
    for (const p of G.players) if (Math.hypot(p.x + p.w / 2 - cx, p.y + p.h / 2 - cy) < 5 * T) rumble(p.id, 0.35, 0.2, 120);
    trainPreview(st);
  }
  st.fall = st.fall.filter(f => !f.done);
}

/* ---------- animations ---------- */
function trainFx(st, dt) {
  for (const j of st.junctions) {
    j.anim = approach(j.anim, j.set, dt * 6);
    j.wiggle = Math.max(0, j.wiggle - dt); j.pulse = Math.max(0, j.pulse - dt); j.helpPop = Math.max(0, j.helpPop - dt);
    if (j.greenT > 0) { j.greenT = Math.max(0, j.greenT - dt); if (st.pv.lamps.get(j) !== 'green') j.greenT = 0; }
  }
  if (st.dyn.length) {
    let ended = null;
    for (const c of st.dyn) {
      c.pop = Math.max(0, c.pop - dt); c.falling = Math.max(0, c.falling - dt);
      if (c.pop <= 0 && c.falling <= 0) (ended || (ended = [])).push(c);
    }
    if (ended) {
      st.dyn = st.dyn.filter(c => c.pop > 0 || c.falling > 0);
      if (!trainCachePaint(st, ended)) st.dirty = true; // no valid cache yet: the next draw rebuilds it whole
    }
  }
  for (const s of st.steam) { s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; }
  if (st.steam.length && st.steam[0].t <= 0) st.steam = st.steam.filter(s => s.t > 0);
  for (const q of st.pops) q.t -= dt;
  if (st.pops.length && st.pops.some(q => q.t <= 0)) st.pops = st.pops.filter(q => q.t > 0);
  for (let k = 0; k < 2; k++) { const b = st.bubbles[k]; if (b) { b.t -= dt; if (b.t <= 0) st.bubbles[k] = null; } }
  if (st.leaver) { st.leaver.t -= dt; if (st.leaver.t <= 0) st.leaver = null; }
  trainBird(st, dt);
}

/* ---------- drawing helpers (take a context so the static layer can be cached) ---------- */
function trainRR(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function trainDisc(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); }
// one piece's path (sides a -> b) at a sideways offset from the centre line (curves: a quarter circle around a corner)
function trainPath(g, c, a, b, off) {
  const cx = c.x * T + 15, cy = c.y * T + 15, da = TRAIN_DIRS[a], db = TRAIN_DIRS[b];
  if (da[0] === -db[0] && da[1] === -db[1]) {
    const nx = -da[1], ny = da[0];
    g.moveTo(cx + da[0] * 15 + nx * off, cy + da[1] * 15 + ny * off); g.lineTo(cx + db[0] * 15 + nx * off, cy + db[1] * 15 + ny * off);
    return;
  }
  const kx = cx + (da[0] + db[0]) * 15, ky = cy + (da[1] + db[1]) * 15, r = 15 + off;
  const a0 = Math.atan2(da[1] * 15 + cy - ky, da[0] * 15 + cx - kx), a1 = Math.atan2(db[1] * 15 + cy - ky, db[0] * 15 + cx - kx);
  let d = a1 - a0; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
  g.moveTo(kx + Math.cos(a0) * r, ky + Math.sin(a0) * r); g.arc(kx, ky, r, a0, a1, d < 0);
}
// the legs a built cell draws: [a, b, alpha]
function trainLegs(c) {
  if (c.junction) { const j = c.junction; return [[j.stem, j.exits[1 - j.set], 0.55], [j.stem, j.exits[j.set], 1]]; }
  if (c.merge) return c.track.split('').filter(s => s !== c.merge).map(s => [c.merge, s, 1]);
  if (c.track.length === 4) return [['W', 'E', 1], ['N', 'S', 1]];
  return [[c.track[0], c.track[1], 1]];
}
// wooden band: 2 px edge, 16 px fill, two grooves at +-4 px, a joint line at each cell edge
function trainDrawBand(g, c, a, b, alpha) {
  g.save(); g.globalAlpha *= alpha; g.lineCap = 'butt';
  g.beginPath(); trainPath(g, c, a, b, 0);
  g.strokeStyle = '#a8743f'; g.lineWidth = 20; g.stroke();
  g.strokeStyle = '#d9a066'; g.lineWidth = 16; g.stroke();
  g.beginPath(); trainPath(g, c, a, b, -4); trainPath(g, c, a, b, 4);
  g.strokeStyle = '#8a5a2b'; g.lineWidth = 1.5; g.stroke();
  g.beginPath();
  for (const s of [a, b]) {
    const d = TRAIN_DIRS[s], ex = c.x * T + 15 + d[0] * 14.5, ey = c.y * T + 15 + d[1] * 14.5;
    g.moveTo(ex - d[1] * 8, ey + d[0] * 8); g.lineTo(ex + d[1] * 8, ey - d[0] * 8);
  }
  g.strokeStyle = 'rgba(138,90,43,0.55)'; g.lineWidth = 1; g.stroke();
  g.restore();
}
function trainPiece(g, c) { for (const [a, b, al] of trainLegs(c)) trainDrawBand(g, c, a, b, al); }
// a bridge deck under the band (rickety: grey with a crack) and four posts
function trainDeck(g, c, rickety) {
  const cx = c.x * T + 15, cy = c.y * T + 15, ns = c.track.includes('N') && c.track.includes('S');
  g.save(); g.translate(cx, cy); if (!ns) g.rotate(Math.PI / 2);
  g.fillStyle = rickety ? '#c9a77a' : C.plank; g.fillRect(-12, -15, 24, 30);
  g.strokeStyle = C.plankDark; g.lineWidth = 1.5; g.strokeRect(-12, -15, 24, 30);
  g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1; g.beginPath();
  for (let y = -9; y < 15; y += 6) { g.moveTo(-12, y); g.lineTo(12, y); }
  g.stroke();
  if (rickety) { g.strokeStyle = 'rgba(60,40,20,0.7)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-9, -3); g.lineTo(-3, 1); g.lineTo(2, -2); g.lineTo(8, 4); g.stroke(); }
  g.restore();
  trainPosts(g, c);
}
function trainPosts(g, c) {
  const cx = c.x * T + 15, cy = c.y * T + 15, ns = c.track.includes('N') && c.track.includes('S');
  g.fillStyle = '#8a5a2b';
  for (const s of [-1, 1]) for (const e of [-1, 1]) {
    const px = ns ? cx + s * 12 : cx + e * 13, py = ns ? cy + e * 13 : cy + s * 12;
    g.fillRect(px - 2, py - 2, 4, 4);
  }
}

/* ---------- the static layer: rug, water, banks, footbridges, finished track, hedges, trees, huts (cached) ---------- */
function trainStaticLayer(st) {
  const M = MODES.train, cw = canvas.width, chh = canvas.height;
  let cv = M.cacheCv;
  if (!cv) { try { cv = M.cacheCv = document.createElement('canvas'); } catch (e) { return false; } }
  if (M.cacheOwner === st && !st.dirty && cv.width === cw && cv.height === chh) return true;
  if (cv.width !== cw || cv.height !== chh) { cv.width = cw; cv.height = chh; }
  const g = cv.getContext('2d');
  if (!g) return false;
  g.setTransform(cw / W, 0, 0, chh / H, 0, 0);
  g.clearRect(0, 0, W, H);
  trainDrawGround(g, st);
  M.cacheOwner = st; st.dirty = false; M.rebuilds = (M.rebuilds || 0) + 1;
  return true;
}
// a piece whose laying pop just ended goes into the cached layer by itself (a full rebuild costs 4-7 ms, 30-48 ms on a slow
// phone). Cells drawn live (junctions, rickety bridges, dotted cells) are never in the cache, so a fallen rickety bridge
// needs nothing. Returns false when there is no valid cache to paint into.
function trainCachePaint(st, cells) {
  const M = MODES.train, cv = M.cacheCv;
  if (!cv || M.cacheOwner !== st || st.dirty || cv.width !== canvas.width || cv.height !== canvas.height) return false;
  const g = cv.getContext('2d');
  if (!g) return false;
  const rick = !!G.level.def.rickety;
  g.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
  for (const c of cells) {
    if (!trainStaticTrack(c, rick)) continue;
    if (c.bridge && !rick) trainDeck(g, c, false);
    trainPiece(g, c);
  }
  M.paints = (M.paints || 0) + 1;
  return true;
}
function trainDrawGround(g, st) {
  const rick = !!G.level.def.rickety;
  // the rug and a soft 2x2-cell checker
  g.fillStyle = '#8fd16f'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.05)';
  for (let y = 0; y < ROWS; y += 2) for (let x = (y / 2) % 2 ? 2 : 0; x < COLS; x += 4) g.fillRect(x * T, y * T, 2 * T, 2 * T);
  // water, banks, footbridges
  const isW = (x, y) => { const c = trainCell(x, y); return !!c && c.water; };
  for (const c of st.cells) if (c.water) { g.fillStyle = '#5bb8e8'; g.fillRect(c.x * T, c.y * T, T, T); }
  for (const c of st.cells) if (c.water) {
    const x = c.x * T, y = c.y * T;
    for (const d of 'NSEW') {
      const [dx, dy] = TRAIN_DIRS[d];
      const n = trainCell(c.x + dx, c.y + dy);
      if (!n || isW(c.x + dx, c.y + dy)) continue;
      g.fillStyle = '#3f9fd0';
      if (d === 'N') g.fillRect(x, y, T, 3); else if (d === 'S') g.fillRect(x, y + T - 3, T, 3); else if (d === 'W') g.fillRect(x, y, 3, T); else g.fillRect(x + T - 3, y, 3, T);
      if (!n.solid) {
        g.fillStyle = '#e9d8a6';
        if (d === 'N') g.fillRect(x, y - 2, T, 2); else if (d === 'S') g.fillRect(x, y + T, T, 2); else if (d === 'W') g.fillRect(x - 2, y, 2, T); else g.fillRect(x + T, y, 2, T);
      }
    }
  }
  for (const c of st.cells) if (c.foot) {
    const up = trainCell(c.x, c.y - 1), dn = trainCell(c.x, c.y + 1);
    const x = c.x * T, y = c.y * T, vert = !isW(c.x, c.y - 1) || !isW(c.x, c.y + 1) || (up && up.foot) || (dn && dn.foot);
    g.save(); g.translate(x + 15, y + 15); if (!vert) g.rotate(Math.PI / 2);
    const ph = (T - 4) / 5;
    for (let k = 0; k < 5; k++) { g.fillStyle = C.plank; g.fillRect(-11, -15 + k * (ph + 1), 22, ph); g.strokeStyle = C.plankDark; g.lineWidth = 1; g.strokeRect(-11, -15 + k * (ph + 1), 22, ph); }
    g.strokeStyle = '#8a5a2b'; g.lineWidth = 2; g.beginPath(); g.moveTo(-12, -15); g.lineTo(-12, 15); g.moveTo(12, -15); g.lineTo(12, 15); g.stroke();
    g.restore();
  }
  // station platforms (a light strip in the stop cell, beside the hut)
  for (const h of st.huts) if (h.face) {
    const s = st.stops[h.hut], x = s.x * T, y = s.y * T;
    g.fillStyle = '#d8d4cc';
    if (h.face === 'N') g.fillRect(x + 1, y + T - 6, T - 2, 6); else if (h.face === 'S') g.fillRect(x + 1, y, T - 2, 6);
    else if (h.face === 'W') g.fillRect(x + T - 6, y + 1, 6, T - 2); else g.fillRect(x, y + 1, 6, T - 2);
  }
  // finished track that isn't animating (junctions, laying pops, rickety bridges and dotted cells are drawn live)
  for (const c of st.cells) if (c.track && !c.ghost && c.bridge && !(rick) && !c.pop) trainDeck(g, c, false);
  for (const c of st.cells) if (trainStaticTrack(c, rick)) trainPiece(g, c);
  // hedges and trees
  const base = ['#3f8f5c', '#3a8757', '#46966a'], hi = ['#5cb87a', '#55af72', '#63bf82'];
  for (const c of st.cells) if (c.solid && !c.hut) {
    const x = c.x * T + 15, y = c.y * T + 15;
    if (c.tree) { g.fillStyle = 'rgba(28,26,54,0.18)'; g.beginPath(); g.ellipse(x + 3, y + 5, 14, 11, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#2f7449'; trainDisc(g, x, y, 15); g.fill(); g.fillStyle = base[c.shade]; trainDisc(g, x, y, 11.5); g.fill(); }
    else { g.fillStyle = base[c.shade]; trainDisc(g, x, y, 14); g.fill(); }
    g.fillStyle = hi[c.shade]; trainDisc(g, x - 3, y - 3, c.tree ? 7 : 9); g.fill();
  }
  // station huts and their badges
  for (const h of st.huts) trainDrawHut(g, h);
}
const trainStaticTrack = (c, rick) => !!c.track && !c.ghost && !c.junction && !c.pop && !c.falling && !(rick && c.bridge);
function trainDrawHut(g, h) {
  const s = trainStation(h.hut), x = h.x * T, y = h.y * T;
  g.fillStyle = 'rgba(28,26,54,0.16)'; g.fillRect(x + 4, y + 26, 26, 5);
  g.fillStyle = '#fff6e6'; g.fillRect(x + 3, y + 12, 24, 18);
  g.strokeStyle = '#d6c3a0'; g.lineWidth = 1.5; g.strokeRect(x + 3, y + 12, 24, 18);
  g.fillStyle = s.col; trainRR(g, x + 11, y + 19, 8, 11, 3); g.fill();
  g.beginPath(); g.moveTo(x, y + 14); g.lineTo(x + 30, y + 14); g.lineTo(x + 15, y + 1); g.closePath();
  g.fillStyle = s.col; g.fill(); g.strokeStyle = 'rgba(28,26,54,0.45)'; g.lineWidth = 1.5; g.stroke();
  const b = trainBadgePos(h);
  trainBadge(g, b.x, b.y, 11, h.hut);
}
function trainBadgePos(h) { return { x: h.x * T + 15, y: h.face === 'N' ? h.y * T + 35 : h.y * T - 5 }; }
function trainBadge(g, x, y, r, letter) {
  const s = trainStation(letter);
  g.fillStyle = '#ffffff'; trainDisc(g, x, y, r); g.fill();
  g.strokeStyle = s.col; g.lineWidth = Math.max(2, r * 0.23); trainDisc(g, x, y, r - 0.5); g.stroke();
  trainIcon(g, s.icon, x, y, r * 1.35);
}
// station icons (s = size in px)
function trainIcon(g, kind, x, y, s) {
  const u = s / 16;
  g.save(); g.translate(x, y); g.scale(u, u); g.lineJoin = 'round';
  if (kind === 'cow') {
    g.fillStyle = '#f2b8c6'; g.beginPath(); g.ellipse(-6.5, -3.5, 2.6, 1.7, -0.5, 0, Math.PI * 2); g.ellipse(6.5, -3.5, 2.6, 1.7, 0.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.strokeStyle = '#1c1a36'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(0, -0.5, 5.6, 6.2, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#1c1a36'; g.beginPath(); g.ellipse(-2.4, -3.6, 2.4, 2, 0.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ff9bb3'; g.beginPath(); g.ellipse(0, 3.2, 4.2, 2.6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1c1a36'; trainDisc(g, -1.5, 3.2, 0.8); g.fill(); trainDisc(g, 1.5, 3.2, 0.8); g.fill(); trainDisc(g, 2.4, -1.6, 0.9); g.fill();
  } else if (kind === 'castle') {
    g.fillStyle = '#9a6bff'; g.strokeStyle = '#5b3ab8'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(-5.5, 7); g.lineTo(-5.5, -2); g.lineTo(-5.5, -4.5); g.lineTo(-3.5, -4.5); g.lineTo(-3.5, -2.5); g.lineTo(-1, -2.5); g.lineTo(-1, -4.5); g.lineTo(1, -4.5); g.lineTo(1, -2.5); g.lineTo(3.5, -2.5); g.lineTo(3.5, -4.5); g.lineTo(5.5, -4.5); g.lineTo(5.5, 7); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#3b2470'; g.beginPath(); g.moveTo(-1.8, 7); g.lineTo(-1.8, 3); g.arc(0, 3, 1.8, Math.PI, 0); g.lineTo(1.8, 7); g.closePath(); g.fill();
    g.strokeStyle = '#1c1a36'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -4.5); g.lineTo(0, -8.5); g.stroke();
    g.fillStyle = '#ff5a6e'; g.beginPath(); g.moveTo(0, -8.5); g.lineTo(4, -7.3); g.lineTo(0, -6); g.closePath(); g.fill();
  } else if (kind === 'umbrella') {
    g.strokeStyle = '#1c1a36'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, -2); g.lineTo(0, 7); g.arc(1.5, 7, 1.5, Math.PI, 0, true); g.stroke();
    for (let k = 0; k < 4; k++) {
      g.fillStyle = k % 2 ? '#ffffff' : '#f2b630';
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 7.5, Math.PI + k * Math.PI / 4, Math.PI + (k + 1) * Math.PI / 4); g.closePath(); g.fill();
    }
    g.strokeStyle = '#b8860b'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 7.5, Math.PI, 0); g.lineTo(-7.5, 0); g.stroke();
  } else { // cone
    g.fillStyle = '#e8b56a'; g.strokeStyle = '#a8743f'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(-4.5, 0); g.lineTo(4.5, 0); g.lineTo(0, 8); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-2.5, 1.5); g.lineTo(1.8, 5.5); g.moveTo(2.5, 1.5); g.lineTo(-1.8, 5.5); g.stroke();
    g.fillStyle = '#ff7fb6'; g.strokeStyle = '#d4508c'; trainDisc(g, 0, -2.5, 5); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.6)'; trainDisc(g, -1.8, -4.2, 1.4); g.fill();
    g.fillStyle = '#e0303e'; trainDisc(g, 1, -7.5, 1.6); g.fill();
  }
  g.restore();
}
// passengers: a 14 px head
function trainAnimal(g, kind, x, y, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const eye = (ex, ey, r = 1.1) => { g.fillStyle = '#1c1a36'; trainDisc(g, ex, ey, r); g.fill(); };
  g.lineWidth = 1.2; g.strokeStyle = 'rgba(28,26,54,0.55)';
  if (kind === 'bunny') {
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(-3, -8, 2.2, 5.5, -0.15, 0, Math.PI * 2); g.ellipse(3, -8, 2.2, 5.5, 0.15, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#ffb3c7'; g.beginPath(); g.ellipse(-3, -8, 1, 3.6, -0.15, 0, Math.PI * 2); g.ellipse(3, -8, 1, 3.6, 0.15, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; trainDisc(g, 0, 0, 7); g.fill(); g.stroke();
    eye(-2.5, -1); eye(2.5, -1); g.fillStyle = '#ff8fab'; trainDisc(g, 0, 1.8, 1.2); g.fill();
  } else if (kind === 'duck') {
    g.fillStyle = '#ffd84a'; trainDisc(g, 0, 0, 7); g.fill(); g.stroke();
    eye(-2.6, -1.5); eye(2.6, -1.5);
    g.fillStyle = '#ff9a2e'; g.beginPath(); g.ellipse(0, 2.6, 3.8, 1.9, 0, 0, Math.PI * 2); g.fill();
  } else if (kind === 'bear') {
    g.fillStyle = '#a8714a'; trainDisc(g, -5, -5, 2.8); g.fill(); g.stroke(); trainDisc(g, 5, -5, 2.8); g.fill(); g.stroke();
    trainDisc(g, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#e2bf98'; g.beginPath(); g.ellipse(0, 2.2, 3.4, 2.6, 0, 0, Math.PI * 2); g.fill();
    eye(-2.6, -1.6); eye(2.6, -1.6); eye(0, 1.3, 1.2);
  } else { // frog
    g.fillStyle = '#6cc04a'; g.beginPath(); g.ellipse(0, 1, 7.2, 6, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    trainDisc(g, -3.6, -4.2, 3); g.fill(); g.stroke(); trainDisc(g, 3.6, -4.2, 3); g.fill(); g.stroke();
    g.fillStyle = '#ffffff'; trainDisc(g, -3.6, -4.2, 2); g.fill(); trainDisc(g, 3.6, -4.2, 2); g.fill();
    eye(-3.6, -4, 1); eye(3.6, -4, 1);
    g.strokeStyle = '#2f6b25'; g.lineWidth = 1; g.beginPath(); g.arc(0, 1.5, 3, 0.25, Math.PI - 0.25); g.stroke();
  }
  g.restore();
}
function trainHeart(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = '#ff4f6d';
  g.beginPath(); g.moveTo(0, 3); g.bezierCurveTo(-5, -1, -3, -5, 0, -2.5); g.bezierCurveTo(3, -5, 5, -1, 0, 3); g.fill();
  g.restore();
}
// where a passenger stands on a station's platform (side -1/+1: a little to one side of the middle)
function trainPlatform(st, hut, side = 1) {
  const s = st.stops[hut.hut], d = TRAIN_DIRS[hut.face] || [0, 1];
  const ex = (hut.x * T + 15 + s.x * T + 15) / 2, ey = (hut.y * T + 15 + s.y * T + 15) / 2;
  return { x: ex - d[0] * 2 + d[1] * 9 * side, y: ey - d[1] * 2 - d[0] * 9 * side - 2 };
}

/* ---------- drawing the live parts ---------- */
function trainDrawGhost(st, c) {
  const cx = c.x * T + 15, cy = c.y * T + 15, onPv = st.pv.ghosts.has(c);
  const [a, b] = [c.track[0], c.track[1]];
  ctx.save(); ctx.lineCap = 'butt';
  if (c.bridge) {
    if (c.falling > 0) { // the fallen deck sinks into the water
      const f = c.falling / 0.3;
      ctx.save(); ctx.globalAlpha = f; ctx.translate(cx, cy); ctx.scale(0.6 + 0.4 * f, 0.6 + 0.4 * f); ctx.translate(-cx, -cy);
      trainDeck(ctx, c, true); ctx.restore();
    }
    trainPosts(ctx, c);
  }
  ctx.beginPath(); trainPath(ctx, c, a, b, 0);
  ctx.lineWidth = 16; ctx.strokeStyle = 'rgba(255,255,255,' + (onPv ? 0.4 : 0.15) + ')'; ctx.stroke();
  if (onPv) { ctx.strokeStyle = 'rgba(255,140,40,' + (reduceMotion ? 0.55 : 0.4 + 0.25 * Math.sin(G.clock * 8)).toFixed(3) + ')'; ctx.stroke(); }
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); trainPath(ctx, c, a, b, -8); trainPath(ctx, c, a, b, 8);
  ctx.strokeStyle = onPv ? 'rgba(150,70,10,0.8)' : 'rgba(70,50,30,0.55)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}
function trainDrawLiveTrack(st) {
  const rick = !!G.level.def.rickety;
  for (const c of st.cells) {
    if (!c.track) continue;
    if (c.ghost) { trainDrawGhost(st, c); continue; }
    if (trainStaticTrack(c, rick)) continue; // in the static layer
    const pop = c.pop > 0 ? 1 + c.pop : 1;
    const f = st.fall.find(q => q.c === c), shake = rick && c.bridge && f && f.t < 0.2 && !reduceMotion ? Math.sin(G.clock * 60) : 0;
    ctx.save();
    if (pop !== 1 || shake) { ctx.translate(c.x * T + 15 + shake, c.y * T + 15); ctx.scale(pop, pop); ctx.translate(-(c.x * T + 15), -(c.y * T + 15)); }
    if (c.bridge) trainDeck(ctx, c, rick);
    trainPiece(ctx, c);
    if (c.junction) trainChevron(c.junction);
    ctx.restore();
  }
}
// a white chevron on the junction pointing along the set leg (slides between the legs with the lever)
function trainChevron(j) {
  const c = trainCell(j.x, j.y), p0 = trainPos(c, j.stem, j.exits[0], 0.5), p1 = trainPos(c, j.stem, j.exits[1], 0.5), f = j.anim;
  let da = p1.ang - p0.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
  const x = p0.x + (p1.x - p0.x) * f, y = p0.y + (p1.y - p0.y) * f, a = p0.ang + da * f;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.strokeStyle = 'rgba(28,26,54,0.35)'; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(1.5, 0); ctx.lineTo(-3, 4); ctx.stroke();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.restore();
}
function trainDrawWater(st) {
  if (!st.hasWater) return;
  ctx.save(); ctx.strokeStyle = '#8fd3f4'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
  const tt = reduceMotion ? 0 : G.clock * 6;
  for (const c of st.cells) {
    if (!c.water || c.foot || (c.track && !c.ghost)) continue;
    const horiz = st.flowH[c.i], ph = (c.x * 13 + c.y * 7) % 30;
    for (let k = 0; k < 2; k++) {
      const u = (ph + tt + k * 15) % 30;
      if (u < 5 || u > 25) continue;
      const v = k ? 8 : -6;
      const x = c.x * T + (horiz ? u : 15 + v), y = c.y * T + (horiz ? 15 + v : u);
      ctx.moveTo(x - 4, y); ctx.quadraticCurveTo(x, y + 3, x + 4, y);
    }
  }
  ctx.stroke(); ctx.restore();
}
function trainDrawPreview(st) {
  const pv = st.pv, tr = st.tr;
  if (!pv.route.length) return;
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const off = reduceMotion ? 0 : (G.clock * 2) % 0.5, o = {};
  ctx.beginPath();
  pv.route.forEach((r, k) => {
    if (!r.outS) return;
    for (let q = 0; q < 2; q++) {
      const t = 0.25 + q * 0.5 + off, tt = t >= 1 ? t - 1 : t;
      if (k === 0 && tt <= tr.t + 0.05) continue;
      if (r.c === pv.endCell && pv.end === 'red' && tt > 0.3) continue;
      trainPos(r.c, r.inS, r.outS, tt, o);
      ctx.moveTo(o.x + 2.5, o.y); ctx.arc(o.x, o.y, 2.5, 0, Math.PI * 2);
    }
  });
  ctx.fill(); ctx.restore();
}
function trainDrawLevers(st) {
  const pv = st.pv;
  for (const j of st.junctions) {
    const cx = j.lx * T + 15, cy = j.ly * T + 15, jx = j.x * T + 15, jy = j.y * T + 15;
    ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(28,26,54,0.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(jx, jy); ctx.stroke(); ctx.restore();
    // base, handle, knob
    ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.fillRect(cx - 6, cy + 7, 14, 4);
    ctx.fillStyle = '#8a5a2b'; trainRR(ctx, cx - 7, cy + 4, 14, 7, 2); ctx.fill();
    const wig = j.wiggle > 0 ? Math.sin(G.clock * 50) * 4 * Math.PI / 180 : 0, a = (-25 + 50 * j.anim) * Math.PI / 180 + wig;
    const hx = cx + Math.sin(a) * 13, hy = cy + 6 - Math.cos(a) * 13;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy + 6); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = '#e04040'; trainDisc(ctx, hx, hy, 4); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; trainDisc(ctx, hx - 1.2, hy - 1.2, 1.4); ctx.fill();
    // the lamp: green / red with a check or a cross on the preview route, grey otherwise
    const side = j.x < j.lx ? 1 : -1, lx = cx + side * 11, ly = cy - 7;
    ctx.strokeStyle = '#4a4a5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, cy + 8); ctx.lineTo(lx, ly); ctx.stroke();
    const st8 = pv.lamps.get(j), k = pv.lampK.get(j);
    let col = '#9a9aa8', glow = 0, on = true;
    if (st8 === 'green') { col = '#3ccf5a'; glow = 1; }
    else if (st8 === 'red') {
      const fast = k <= TRAIN.warnCells || (st.tr.waiting && st.tr.kind === 'red' && st.tr.redJ === j);
      on = reduceMotion || Math.floor(G.clock * (fast ? 8 : 4)) % 2 === 0;
      col = on ? '#ff4a4a' : '#b03030'; glow = on ? 1 : 0.3;
    }
    const sc = 1 + 1.4 * j.pulse;
    ctx.save(); ctx.translate(lx, ly); ctx.scale(sc, sc);
    if (glow) { ctx.fillStyle = st8 === 'green' ? 'rgba(60,207,90,' + (0.3 * glow) + ')' : 'rgba(255,74,74,' + (0.3 * glow) + ')'; trainDisc(ctx, 0, 0, 11 + 6 * j.pulse); ctx.fill(); }
    ctx.fillStyle = col; trainDisc(ctx, 0, 0, 6); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; trainDisc(ctx, 0, 0, 6); ctx.stroke();
    if (st8) {
      ctx.strokeStyle = on ? '#ffffff' : 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
      if (st8 === 'green') { ctx.moveTo(-2.6, 0); ctx.lineTo(-0.6, 2.2); ctx.lineTo(2.8, -2.4); }
      else { ctx.moveTo(-2.2, -2.2); ctx.lineTo(2.2, 2.2); ctx.moveTo(2.2, -2.2); ctx.lineTo(-2.2, 2.2); }
      ctx.stroke();
    }
    ctx.restore();
  }
}
function trainDrawSquirrel(st) {
  const sq = st.sq;
  if (!sq || sq.mode === 'off') return;
  const moving = sq.mode !== 'sit', still = reduceMotion;
  const hop = moving && !still ? Math.abs(Math.sin(sq.anim * 16)) * 5 : 0;
  ctx.save();
  ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.beginPath(); ctx.ellipse(sq.x, sq.y + 8, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(sq.x, sq.y - hop); ctx.scale(sq.face * 1.3, 1.3);
  ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(28,26,54,0.6)'; ctx.lineJoin = 'round';
  // the big bushy tail (it waves while the squirrel sits on the lever)
  const wave = still ? 0 : Math.sin(sq.anim * (moving ? 12 : 5)) * (moving ? 0.12 : 0.3);
  ctx.save(); ctx.translate(-4, 3); ctx.rotate(-0.15 + wave);
  ctx.beginPath(); ctx.moveTo(1, 0); ctx.bezierCurveTo(-9, 0, -12, -12, -6, -17); ctx.bezierCurveTo(-1, -21, 5, -16, 1, -12);
  ctx.bezierCurveTo(-2, -9, -3, -5, 3, -2); ctx.closePath();
  ctx.fillStyle = '#c97f3f'; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-1, -3); ctx.bezierCurveTo(-6, -5, -8, -11, -5, -15); ctx.strokeStyle = 'rgba(255,226,180,0.8)'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.restore();
  ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(28,26,54,0.6)';
  // body, belly, head, ear, eye, nose
  ctx.fillStyle = '#b8692f'; ctx.beginPath(); ctx.ellipse(0, 1, 6, 5.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f3d6ad'; ctx.beginPath(); ctx.ellipse(2.6, 2, 2.8, 3.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b8692f'; ctx.beginPath(); ctx.moveTo(2.6, -8.5); ctx.lineTo(3.6, -12.8); ctx.lineTo(6.2, -8.8); ctx.closePath(); ctx.fill(); ctx.stroke();
  trainDisc(ctx, 5, -5, 4.4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f3d6ad'; trainDisc(ctx, 7.4, -3.9, 1.9); ctx.fill();
  ctx.fillStyle = C.ink; trainDisc(ctx, 6.2, -6, 1.1); ctx.fill(); trainDisc(ctx, 9.2, -4.4, 0.9); ctx.fill();
  if (!moving) { // paws up on the lever, and a little chitter
    ctx.fillStyle = '#b8692f'; trainDisc(ctx, 6.5, 0, 1.6); ctx.fill(); ctx.stroke();
    if (!still && sq.chit > 2.1) { ctx.strokeStyle = C.paper; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(11, -9); ctx.lineTo(14, -11); ctx.moveTo(11.5, -6); ctx.lineTo(15, -6); ctx.stroke(); }
  }
  ctx.restore();
}
function trainDrawStations(st) {
  // the passenger waiting on the current destination's platform (and the one who just got off, waving)
  const hp = st.hop, done = st.phase === 'done';
  const letter = done ? st.trips[st.trips.length - 1] : st.trips[st.trip];
  if (letter && st.waiter !== null) {
    const hut = st.huts.find(h => h.hut === letter), last = done || st.trip >= st.trips.length - 1;
    if (hut && hut.face && (last || !(hp && hp.t >= 0.5))) {
      const P = trainPlatform(st, hut, 1), bob = reduceMotion ? 0 : Math.sin(G.clock * 3 + hut.x);
      trainAnimal(ctx, TRAIN_ANIMALS[st.waiter % 4], P.x, P.y + bob, 1.25);
      if (last) trainHeart(ctx, P.x + 10, P.y + 5 + bob, 1.3);
    }
  }
  const lv = st.leaver;
  if (lv) {
    ctx.save(); ctx.globalAlpha = clamp(lv.t / 1, 0, 1);
    trainAnimal(ctx, TRAIN_ANIMALS[lv.idx % 4], lv.x, lv.y + (reduceMotion ? 0 : Math.abs(Math.sin(G.clock * 9)) * -3), 1.25);
    ctx.restore();
  }
}
function trainDrawTrain(st) {
  const tr = st.tr, P = st.carPos, hp = st.hop;
  ctx.save();
  // shadows, couplings
  ctx.fillStyle = 'rgba(28,26,54,0.18)';
  for (const p of P) { ctx.beginPath(); ctx.ellipse(p.x + 2, p.y + 3, 14, 11, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P[0].x, P[0].y); ctx.lineTo(P[1].x, P[1].y); ctx.lineTo(P[2].x, P[2].y); ctx.stroke();
  const emptyWait = st.carry === 0 && tr.waiting && tr.kind === 'gap';
  for (let k = 2; k >= 0; k--) {
    const p = P[k];
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
    if (k === 0) { // engine
      ctx.fillStyle = '#d23a3a'; trainRR(ctx, -12, -9, 24, 18, 6); ctx.fill();
      ctx.fillStyle = '#a82d2d'; trainRR(ctx, -12, -9, 9, 18, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; trainRR(ctx, -10, -5.5, 5, 11, 1.5); ctx.fill();
      ctx.fillStyle = '#f2c14e'; ctx.fillRect(-2, -9, 3, 18);
      trainDisc(ctx, 3.5, 0, 2.5); ctx.fill();
      ctx.fillStyle = '#1c1a36'; trainDisc(ctx, 7.5, 0, 3.8); ctx.fill(); ctx.fillStyle = '#5a5a6a'; trainDisc(ctx, 7.5, 0, 2); ctx.fill();
      ctx.fillStyle = '#1c1a36'; trainRR(ctx, 10.5, -7, 2.5, 14, 1); ctx.fill();
      ctx.strokeStyle = '#8f2424'; ctx.lineWidth = 1.5; trainRR(ctx, -12, -9, 24, 18, 6); ctx.stroke();
    } else if (k === 1) { // coach
      ctx.fillStyle = '#f6ecd2'; trainRR(ctx, -12, -9, 24, 18, 6); ctx.fill();
      ctx.strokeStyle = '#c9b98f'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#2fb3a8'; trainRR(ctx, -10, -6.5, 20, 13, 4); ctx.fill();
      ctx.fillStyle = '#2b3a6b'; for (const x of [-5.5, 4.5]) for (const y of [-7.8, 7.8]) { trainDisc(ctx, x, y, 1.1); ctx.fill(); }
    } else { // track wagon (it never runs out)
      ctx.fillStyle = '#b57a45'; trainRR(ctx, -12, -9, 24, 18, 5); ctx.fill();
      ctx.fillStyle = '#7d4f28'; trainRR(ctx, -9.5, -6.5, 19, 13, 2.5); ctx.fill();
      for (let i = 0; i < 3; i++) { ctx.fillStyle = '#e0b07a'; trainRR(ctx, -7.5, -5 + i * 3.7, 15, 2.8, 1.3); ctx.fill(); }
      if (emptyWait) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 + 0.45 * Math.sin(G.clock * 8)).toFixed(3) + ')'; ctx.lineWidth = 2.5; trainRR(ctx, -15, -12, 30, 24, 8); ctx.stroke(); }
    }
    ctx.restore();
  }
  // the rider's head pokes out of the coach roof (not during their hop)
  if (st.rider !== null && !(hp && hp.t < 0.5)) {
    const c = P[1];
    if (!(hp && hp.t >= 0.5 && hp.t < 1)) trainAnimal(ctx, TRAIN_ANIMALS[st.rider % 4], c.x, c.y - 2, 0.9);
  }
  if (hp && hp.t < 0.5) { // the rider hops off onto the platform
    const f = hp.t / 0.5, c = P[1], Q = trainPlatform(st, hp.hut, -1);
    trainAnimal(ctx, TRAIN_ANIMALS[hp.off % 4], c.x + (Q.x - c.x) * f, c.y + (Q.y - c.y) * f - Math.sin(f * Math.PI) * 24, 1 + 0.25 * f);
  } else if (hp && hp.on !== null && hp.t < 1) { // and the next passenger hops on
    const f = (hp.t - 0.5) / 0.5, c = P[1], Q = trainPlatform(st, hp.hut, 1);
    trainAnimal(ctx, TRAIN_ANIMALS[hp.on % 4], Q.x + (c.x - Q.x) * f, Q.y + (c.y - Q.y) * f - Math.sin(f * Math.PI) * 24, 1.25 - 0.25 * f);
  }
  // steam
  for (const s of st.steam) {
    const f = 1 - s.t / s.max;
    ctx.fillStyle = 'rgba(255,255,255,' + (s.a * (1 - f)).toFixed(3) + ')';
    trainDisc(ctx, s.x, s.y, s.r0 + (s.r1 - s.r0) * f); ctx.fill();
  }
  ctx.restore();
}
function trainDrawHats(st) {
  for (const p of G.players) {
    const builder = p.id === st.builder, cx = p.x + p.w / 2, top = p.y + p.h - p.h * p.sy;
    ctx.save(); ctx.translate(cx, top);
    if (builder) {
      ctx.fillStyle = '#ffcf33'; ctx.strokeStyle = '#b88a00'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 1, 10, 8, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      trainRR(ctx, -12, 0, 24, 3, 1.5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(-1, -6, 2, 6);
      // the carried pieces
      for (let i = 0; i < st.carry; i++) {
        ctx.fillStyle = '#e0b07a'; ctx.strokeStyle = '#a8743f'; ctx.lineWidth = 1;
        trainRR(ctx, -9, -16 - 5 * i, 18, 4, 2); ctx.fill(); ctx.stroke();
      }
    } else {
      const f = p.face;
      ctx.fillStyle = '#2b3a6b'; trainRR(ctx, -9, -6, 18, 7, 3); ctx.fill();
      ctx.beginPath(); ctx.ellipse(f * 7, 1, 7, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f2c14e'; trainDisc(ctx, f * 2, -3, 1.8); ctx.fill();
    }
    ctx.restore();
  }
}
// shift: the box moves sideways by that much while its tail still points at x (the lever hint keeps clear of the junction)
function trainBubbleBox(x, by, label, big, border, shift = 0) {
  const fs = big ? 15 : 13;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(label).width + 16, h = fs + 10;
  const bx = clamp(x + shift - w / 2, 4, W - 4 - w), y = Math.max(4, by - h), tx = clamp(x, bx + 9, bx + w - 9);
  ctx.fillStyle = '#ffffff'; trainRR(ctx, bx, y, w, h, 8); ctx.fill();
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(tx - 5, y + h - 0.5); ctx.lineTo(tx + 5, y + h - 0.5); ctx.lineTo(tx, y + h + 5); ctx.closePath(); ctx.fillStyle = '#ffffff'; ctx.fill();
  text(label, bx + w / 2, y + h / 2 + 0.5, fs, C.ink, 'center', 'body');
}
// a white speech bubble with a station icon (the rider's and the waiting passenger's destination)
function trainIconBubble(x, y, letter, heart) {
  const s = trainStation(letter), w = 26, h = 22;
  ctx.fillStyle = '#ffffff'; trainRR(ctx, x - w / 2, y - h / 2, w, h, 7); ctx.fill();
  ctx.strokeStyle = heart ? '#ff4f6d' : s.col; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 4, y + h / 2 - 1); ctx.lineTo(x + 4, y + h / 2 - 1); ctx.lineTo(x, y + h / 2 + 5); ctx.closePath(); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.strokeStyle = heart ? '#ff4f6d' : s.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, y + h / 2); ctx.lineTo(x, y + h / 2 + 5); ctx.lineTo(x + 4, y + h / 2); ctx.stroke();
  if (heart) trainHeart(ctx, x, y + 0.5, 1.5); else trainIcon(ctx, s.icon, x, y, 14);
}
function trainDrawBird(st) {
  const bd = st.bird;
  if (bd.mode === 'off') return;
  const up = Math.floor(bd.flap * 16) % 2 === 0 && !bd.perch;
  ctx.save(); ctx.translate(bd.x, bd.y + (bd.perch ? 0 : Math.sin(bd.flap * 5) * 2)); ctx.scale(1.35, 1.35);
  ctx.fillStyle = 'rgba(28,26,54,0.15)'; if (!bd.perch) { ctx.beginPath(); ctx.ellipse(2, 18, 7, 3, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.ellipse(0, 0, 7, 5.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-1, up ? -6 : 1, 5, 2.6, up ? -0.6 : 0.4, 0, Math.PI * 2); ctx.fillStyle = '#ffe08a'; ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.gold; trainDisc(ctx, 6, -3.5, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff9a2e'; ctx.beginPath(); ctx.moveTo(9.5, -4.5); ctx.lineTo(13, -3.2); ctx.lineTo(9.5, -2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.ink; trainDisc(ctx, 7, -4.3, 1); ctx.fill();
  ctx.restore();
}
function trainStar(x, y, r) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr2 = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  ctx.closePath();
}

MODES.train = {
  medals: { bronze: 'Get every passenger home', goals: [{ key: 'time', gold: 240, silver: 360 }, { key: 'smooth', gold: 1, silver: 0.5, more: true, text: n => n >= 1 ? 'Every trip smooth' : 'Half the trips smooth', show: v => Math.round(v * 100) + '% smooth', gap: (v, n) => n >= 1 ? 'every trip smooth' : 'more smooth trips' }] },
  medalValues() { const st = G.mst; return st && st.tripsTotal ? { smooth: st.smooth / st.tripsTotal } : {}; },
  rand: Math.random,
  speedMul: 1,                // test knob: multiplies the train's speed (bots); players never see it
  cfg: TRAIN,
  fn: { route: trainRoute, out: trainOut, next: trainNext, distTo: trainDistTo, bestExit: trainBestExit, solid: trainSolid, pos: trainPos, preview: trainPreview, isRed: trainIsRed, walkTo: trainWalkTo, sqSeat: trainSquirrelSeat, sqKey: trainSqKey, stopDist: trainStopDist },
  setup(st, L) {
    st.laid = [0, 0]; st.flips = [0, 0]; st.helped = 0; st.delivered = 0; st.smooth = 0; st.wrong = 0; st.waitAll = 0;
    st.boops = 0; st.fallen = 0; st.passenger = 0; st.grabs = 0; st.peeps = 0; st.holds = 0; st.golden = false;
    st.squirrels = 0; st.shooed = 0;   // squirrels that came, and that the switcher shooed
    st.sqLate = [0, 0];                // per player: squirrels the train had to wait for while they switched
    st.idle = [0, 0];                  // per player: s since they last touched the controls (kept across rooms)
    st.tripsTotal = (LEVELS[G.levelIndex].rooms || []).reduce((n, r) => n + ((r.trips || []).length), 0);
    trainRoom(st, L);
  },
  room(k, L) { trainRoom(G.mst, L); },
  step(dt) {
    const st = G.mst;
    if (!st.cells) return;
    const locked = G.introT > 0.6;
    if (!st.cardDone && G.introT <= 0) { st.cardDone = true; st.cardT = 0; }
    else if (st.cardDone) st.cardT += dt;
    trainPlayers(st, dt, locked);
    trainJobs(st, dt, locked);
    if (trainTrain(st, dt)) return; // the room is over: the next one is already set up (or the level is clear)
    trainHelp(st, dt);
    trainFalls(st, dt);
    trainSquirrel(st, dt);
    trainBoxes(st);
    trainPreview(st);
    trainFx(st, dt);
  },
  draw() {
    const st = G.mst;
    if (!st.cells || !st.pv) return;
    st.cacheOK = trainStaticLayer(st);
    if (st.cacheOK) ctx.drawImage(MODES.train.cacheCv, 0, 0, W, H);
    else trainDrawGround(ctx, st);
    trainDrawWater(st);
    for (const sg of G.level.def.signs || []) {
      ctx.font = '17px "Lilita One", "Arial Rounded MT Bold", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(28,26,54,0.5)'; ctx.fillText(sg.text, sg.x, sg.y);
    }
    trainDrawLiveTrack(st);
    trainDrawPreview(st);
    trainDrawLevers(st);
    trainDrawSquirrel(st);
    trainDrawStations(st);
    trainDrawTrain(st);
  },
  drawTop() {
    const st = G.mst;
    if (!st.cells || !st.pv) return;
    const pv = st.pv, big = hudBig(), tr = st.tr;
    trainDrawHats(st);
    // the end of the preview: a gold star by the station's badge, or a red cross on the first red junction
    if (pv.end === 'star') {
      const hut = st.huts.find(h => h.hut === pv.dest);
      if (hut) {
        const b = trainBadgePos(hut), bob = reduceMotion ? 0 : Math.sin(G.clock * 4) * 3;
        trainStar(b.x + 15, b.y + (hut.face === 'N' ? 9 : -9) + bob, 9); ctx.fillStyle = C.gold; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.stroke();
      }
    } else if (pv.end === 'red' && pv.endCell) {
      const x = pv.endCell.x * T + 15, y = pv.endCell.y * T + 15;
      ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6); ctx.moveTo(x + 6, y - 6); ctx.lineTo(x - 6, y + 6);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = '#ff4a4a'; ctx.lineWidth = 3; ctx.stroke();
    }
    // the rider's bubble (never rotated) and the waiting passenger's bubble (the trip after, or a heart)
    if (st.rider !== null && st.phase !== 'done' && !(st.hop && st.hop.t < 1)) {
      // above the coach on a level stretch, beside it when the train runs up or down (never on the engine)
      const c = st.carPos[1], letter = st.phase === 'dwell' ? st.trips[st.trip + 1] : st.trips[st.trip];
      const sa = Math.abs(Math.sin(c.ang)), ca = Math.abs(Math.cos(c.ang)), side = c.x > W - 60 ? -1 : 1;
      if (letter) trainIconBubble(c.x + side * 24 * sa, c.y - 26 * ca - 12 * sa, letter);
    }
    if (st.phase !== 'done' && st.waiter !== null && !(st.hop && st.hop.t >= 0.5)) {
      const letter = st.trips[st.trip], hut = st.huts.find(h => h.hut === letter), next = st.trips[st.trip + 1];
      if (hut && hut.face && next) {
        const P = trainPlatform(st, hut, 1);
        if (hut.face === 'S') trainIconBubble(hut.x * T + 30 + 16, hut.y * T + 8, next); // beside the hut, not over its roof
        else if (hut.face === 'N') trainIconBubble(P.x, P.y - 24, next);
        else trainIconBubble(P.x + (hut.face === 'E' ? 16 : -16), P.y - 24, next);
      }
    }
    // lever key hint for the switcher near a red lamp (none over the computer in 1-player mode)
    const s = G.players[st.switcher], sx = s.x + s.w / 2, sy = s.y + s.h / 2;
    if (!trainCpu(st.switcher)) for (const j of st.junctions) {
      if (pv.lamps.get(j) !== 'red') continue;
      const lx = j.lx * T + 15, ly = j.ly * T + 15;
      if (Math.hypot(sx - lx, sy - ly) < 90) trainBubbleBox(lx, ly - 18, trainKey(st.switcher) + ' flip', big, '#ff4a4a', -(j.x - j.lx) * 20);
    }
    // player bubbles (bottom edge at p.y - 42, clear of the name tags and the stack)
    for (const p of G.players) {
      const b = st.bubbles[p.id];
      if (!b) continue;
      ctx.save(); ctx.globalAlpha = clamp(b.t / 0.25, 0, 1);
      trainBubbleBox(p.x + p.w / 2, p.y - 42, b.text, big);
      ctx.restore();
    }
    trainDrawBird(st);
    // pops: gold = help, white = toots and +1, "Peep!"
    for (const q of st.pops) {
      const f = 1 - q.t / q.max;
      ctx.save(); ctx.globalAlpha = clamp(q.t / 0.3, 0, 1);
      bigText(q.text, clamp(q.x, 40, W - 40), q.y - q.rise * f, q.size * (big ? 1.15 : 1), q.col);
      ctx.restore();
    }
    // "!" over the first dotted cell ahead while the train waits at a gap (after the pops: "Toot toot!" never hides it)
    if (tr.waiting && tr.kind === 'gap' && pv.firstGhost) {
      const g = pv.firstGhost, x = g.x * T + 15, y = g.y * T - 6 - (reduceMotion ? 0 : Math.abs(Math.sin(G.clock * 6)) * 6);
      ctx.fillStyle = '#ffffff'; trainDisc(ctx, x, y, 9); ctx.fill(); ctx.strokeStyle = '#ff9a3c'; ctx.lineWidth = 2.5; ctx.stroke();
      bigText('!', x, y + 1, 16, '#ff9a3c');
    }
  },
  hud() {
    const st = G.mst;
    if (!st.cells || !st.pv) return;
    const big = hudBig();
    trainHudStop(st, big);
    trainHudRoles(st, big);
    trainHudHint(st, big);
    if (st.phase === 'done') trainHudDone(st);
  },
  stats() {
    const st = G.mst, out = [
      { label: 'Track laid', values: st.laid.slice() },
      { label: 'Lever flips', values: st.flips.slice() },
      { label: 'Smooth trips', value: st.smooth + '/' + st.tripsTotal }];
    // one warm line: the Golden Whistle, else the bird's help, else the squirrels, else a lot of boops, else everyone home
    const sq = st.shooed;
    out.push(st.smooth === st.tripsTotal ? 'Golden Whistle! Every trip smooth!'
      : st.helped > 0 ? `The gold bird helped ${st.helped} time${st.helped === 1 ? '' : 's'}`
      : sq > 0 ? `Shoo! You chased off ${sq === 1 ? 'a cheeky squirrel' : sq + ' cheeky squirrels'}`
      : st.boops >= 25 ? `Boop! The train bumped you ${st.boops} times`
      : `All ${st.tripsTotal} passengers got home!`);
    return out;
  },
};

/* ---------- HUD ---------- */
// top centre: the trip dots, the next stop's badge and name, and the clock
function trainHudStop(st, big) {
  const h = big ? 36 : 28, fs = big ? 19 : 15, br = big ? 12 : 9, y = 12, n = st.trips.length;
  const done = st.phase === 'done', letter = done ? null : st.phase === 'dwell' ? st.trips[st.trip + 1] : st.trips[st.trip];
  const delivered = st.roomDelivered, name = letter ? trainStation(letter).name : 'All home!';
  const clock = fmtTime(G.time), cfs = big ? 16 : 13;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const nw = ctx.measureText(name).width;
  ctx.font = '700 ' + cfs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const cw = ctx.measureText('0:00.0').width;
  const dotW = n * (big ? 14 : 11), w = Math.round(14 + dotW + 8 + (letter ? 2 * br + 6 : 0) + nw + 12 + cw + 14);
  const x0 = pill(W / 2, y, w, h, 'center'), cy = y + h / 2;
  let x = x0 + 14;
  for (let k = 0; k < n; k++) {
    const dx = x + k * (big ? 14 : 11) + (big ? 5 : 4), r = big ? 5 : 4;
    if (k < delivered || done) { ctx.fillStyle = C.paper; trainDisc(ctx, dx, cy, r); ctx.fill(); }
    else {
      const cur = k === delivered && st.phase !== 'dwell', pr = cur && !reduceMotion ? r + Math.sin(G.clock * 6) * 0.8 : r - 0.5;
      ctx.strokeStyle = cur ? C.gold : 'rgba(246,239,223,0.55)'; ctx.lineWidth = 1.8; trainDisc(ctx, dx, cy, pr); ctx.stroke();
    }
  }
  x += dotW + 8;
  if (letter) { trainBadge(ctx, x + br, cy, br, letter); x += 2 * br + 6; }
  text(name, x, cy + 0.5, fs, letter ? C.paper : C.gold, 'left', 'body');
  text(clock, x0 + w - 14, cy + 0.5, cfs, 'rgba(246,239,223,0.75)', 'right', 'body');
}
// top right: who builds and who flips (pops a little after each card: "Swap!")
function trainHudRoles(st, big) {
  const h = big ? 34 : 28, fs = big ? 17 : 14, b = st.builder, s = st.switcher;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const parts = [[NAMES[b], PCOL[b]], [' builds', C.paper], ['  ·  ', 'rgba(246,239,223,0.6)'], [NAMES[s], PCOL[s]], [' flips', C.paper]];
  const ws = parts.map(p => ctx.measureText(p[0]).width), icon = big ? 0 : 20;
  const w = Math.round(14 + icon + ws[0] + ws[1] + ws[2] + icon + ws[3] + ws[4] + 14);
  const sc = st.cardDone && st.cardT < 1 ? 1 + 0.1 * Math.sin(Math.PI * st.cardT) : 1;
  ctx.save(); ctx.translate(W - 14 - w / 2, 12 + h / 2); ctx.scale(sc, sc); ctx.translate(-(W - 14 - w / 2), -(12 + h / 2));
  const x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2;
  let x = x0 + 14;
  parts.forEach(([t, col], k) => {
    if (icon && (k === 0 || k === 3)) {
      ctx.save(); ctx.translate(x + 8, cy + 3);
      if (k === 0) { ctx.fillStyle = '#ffcf33'; ctx.beginPath(); ctx.ellipse(0, 0, 7, 6, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.fillRect(-8.5, -0.5, 17, 2.5); }
      else { ctx.fillStyle = '#5b6fb8'; trainRR(ctx, -6, -6, 12, 5.5, 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(4.5, 0, 5, 1.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#f2c14e'; trainDisc(ctx, 1, -3.3, 1.4); ctx.fill(); }
      ctx.restore();
      x += icon;
    }
    text(t, x, cy + 0.5, fs, col, 'left', 'body');
    x += ws[k];
  });
  ctx.restore();
}
// top centre, under the stop pill (phones: bottom centre): the key hint for a few seconds after each card
function trainHudHint(st, big) {
  if (!st.cardDone || st.cardT >= TRAIN.hintT || st.phase === 'done') return;
  const a = clamp((TRAIN.hintT - st.cardT) / 0.5, 0, 1), b = st.builder, s = st.switcher;
  // phones: at the bottom (rows 16-17: hedge and lawn), so the bigger pill never covers a station badge near the top
  const fs = big ? 16 : 13, h = big ? 30 : 26, y = big ? H - 14 - h : 46;
  // 1 player + computer: the computer's half says what it does instead of which keys to press
  const parts = [[NAMES[b] + ': ', PCOL[b]], [trainCpu(b) ? 'lays the track' : trainWalkKeys(b) + ' walk onto the dots', C.paper], ['   ·   ', 'rgba(246,239,223,0.6)'], [NAMES[s] + ': ', PCOL[s]], [trainCpu(s) ? 'flips the levers' : trainKey(s) + ' flip', C.paper]];
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const ws = parts.map(p => ctx.measureText(p[0]).width), w = Math.round(ws.reduce((m, v) => m + v, 0) + 28);
  ctx.save(); ctx.globalAlpha = a;
  const x0 = pill(W / 2, y, w, h, 'center');
  let x = x0 + 14;
  parts.forEach(([t, col], k) => { text(t, x, y + h / 2 + 0.5, fs, col, 'left', 'body'); x += ws[k]; });
  ctx.restore();
}
// "Everyone's home!" (and "Smooth ride!" / the Golden Whistle)
function trainHudDone(st) {
  const f = clamp(st.phaseT / 0.2, 0, 1), sc = 0.6 + 0.4 * f;
  const last = G.level.def.roomIndex === G.level.def.roomCount - 1;
  bigText('Everyone’s home!', W / 2, 150, 36, C.paper, sc);
  let line = null, col = C.paper;
  if (last && st.golden) { line = 'Golden Whistle!'; col = C.gold; }
  else if (st.roomSmooth === st.trips.length) line = 'Smooth ride!';
  if (!line) return;
  ctx.save(); ctx.globalAlpha = f;
  bigText(line, W / 2 + (st.golden && last ? 14 : 0), 186, 20, col, sc);
  if (st.golden && last) { // a gold whistle
    ctx.font = '20px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const x = W / 2 + 14 - ctx.measureText(line).width / 2 - 24, y = 186;
    ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    trainDisc(ctx, x, y + 2, 7); ctx.fill(); ctx.stroke(); trainRR(ctx, x - 1, y - 6, 16, 7, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.ink; trainDisc(ctx, x, y + 2, 2); ctx.fill();
  }
  ctx.restore();
}

/* ---------- sounds (C7: <= 0.1 per tone, repeating <= 0.03; player sounds take the player's pitch) ---------- */
Sfx.extra.trainToot = function () { this.tone(587, 0.18, 'triangle', 0.06); this.tone(740, 0.26, 'triangle', 0.05, null, 0.2); };
Sfx.extra.trainWait = function () { this.tone(523, 0.1, 'triangle', 0.03); this.tone(523, 0.12, 'triangle', 0.03, null, 0.16); };
Sfx.extra.trainChuff = function () { this.tone(120, 0.05, 'sawtooth', 0.012, 70); };
Sfx.extra.trainGrab = function (p) { this.tone(520 * p, 0.05, 'square', 0.04); this.tone(700 * p, 0.05, 'square', 0.04, null, 0.05); };
Sfx.extra.trainLay = function (p) { this.tone(180 * p, 0.08, 'triangle', 0.08, 120 * p); this.tone(900 * p, 0.03, 'square', 0.03, null, 0.02); };
Sfx.extra.trainFlip = function (p) { this.tone(1250 * p, 0.04, 'square', 0.04); this.tone(600 * p, 0.06, 'triangle', 0.05, null, 0.04); };
Sfx.extra.trainNope = function (p) { this.tone(200 * p, 0.12, 'square', 0.04, 160 * p); };
Sfx.extra.trainGreen = function () { this.tone(988, 0.08, 'sine', 0.04); this.tone(1319, 0.1, 'sine', 0.04, null, 0.07); };
Sfx.extra.trainRed = function () { this.tone(1568, 0.08, 'triangle', 0.03); this.tone(1568, 0.08, 'triangle', 0.03, null, 0.16); };
Sfx.extra.trainDing = function () { [880, 1175].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.06, null, i * 0.1)); };
Sfx.extra.trainHop = function () { this.tone(500, 0.08, 'sine', 0.04, 800); };
Sfx.extra.trainBoop = function (p) { this.tone(660 * p, 0.06, 'sine', 0.05, 990 * p); };
Sfx.extra.trainHelp = function () { [1047, 1397, 1760].forEach((f, i) => this.tone(f, 0.08, 'sine', 0.035, null, i * 0.06)); };
Sfx.extra.trainFall = function () { this.play('crumble'); this.play('splash'); };
Sfx.extra.trainRoomDone = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.06, null, i * 0.08)); };
Sfx.extra.trainWhistle = function () { this.tone(1175, 0.3, 'triangle', 0.06); this.tone(1480, 0.45, 'triangle', 0.05, null, 0.25); };
Sfx.extra.trainPeep = function (p) { this.tone(2093 * p, 0.08, 'sine', 0.03); this.tone(2349 * p, 0.12, 'sine', 0.025, null, 0.07); };
Sfx.extra.trainHold = function (p) { this.tone(1400 * p, 0.03, 'square', 0.02); };
Sfx.extra.trainChitter = function () { for (let k = 0; k < 4; k++) this.tone(1900 + (k % 2) * 350, 0.03, 'square', 0.022, null, k * 0.055); };
Sfx.extra.trainShoo = function (p) { this.tone(900 * p, 0.16, 'triangle', 0.05, 320 * p); this.tone(1400 * p, 0.05, 'sine', 0.03, null, 0.02); };
/* ===== end of Train Tracks ===== */

