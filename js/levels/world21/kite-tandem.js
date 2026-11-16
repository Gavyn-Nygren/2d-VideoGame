/* Pip & Bo - Level 21-2 Kite Tandem (team, World 21 Sky Kingdom). */
'use strict';

/* ===== 21-2 Kite Tandem (mode 'kite', World 21 "Sky Kingdom", team) =====
   One player is the RUNNER on the ground and one is the RIDER on a big kite flying behind and above on a string. The
   scene scrolls rightwards, seen from the side. The mode owns the tick, the camera, the whole picture and the HUD
   (def.ownStep + def.ownHUD + def.noFalls); the engine grid is empty apart from the two spawns.
   THE RUNNER: hold ▶ to run (◀ slows down and backs up), ▲ jumps chimneys, crates, fences and the small gaps between
   roofs. Hold ▼ (or the action, 'reel') to reel the string in: the kite comes lower and closer. Let go and the wind lets
   the string out again (up to its full length), so the kite climbs. THE KITE ONLY FLIES WHILE THE RUNNER RUNS: its lift
   comes from the runner's speed, so if the runner stops the kite slowly sinks (on the landing pad at the end of a
   stretch a steady breeze holds it up). The kite is tied to the runner's feet on the ground, never to a jump, so a
   jump never lifts the kite.
   THE RIDER: ▲ / ▼ lean the kite a little higher or lower (it drifts back when let go), ◀ ▶ slide it a little back or
   forward along the string. The action ('tuck') is a quick spin: for half a second the kite is much smaller and birds
   flutter past. Steer through stars and ring gates; dodge power lines, washing lines, bunting, birds, tree tops,
   church spires, ship masts, windmill sails, hot air balloons and cloud arches (go UNDER those: the runner reels in).
   A hit TANGLES the kite: "Tangled!", a short wobble, the rider can't steer for a second and the runner runs at half
   speed for a moment. Never a real fail. Falling into a gap is a "Whoops!": an awning, a rubber ring, a lily pad or a
   fluffy cloud boings the runner back to the take-off spot.
   THE END OF A STRETCH: a tall tower with a flag on top (clock tower, lookout, lighthouse, the Sky Kingdom castle) and a
   landing pad with a fence after it. The flag hangs higher than the kite flies by itself, so only the rider leaning ▲
   (with the string all the way out) can grab it: one player alone can never finish a stretch. Once the flag is
   grabbed and the runner stands on the pad, the kite lands, the rider hops down and the two swap jobs. 4 stretches
   (roomWord 'Stretch'): Rooftop Run, Windy Hill (gusts push the kite up or down, a windmill), Seaside Pier (gulls,
   masts, bunting, water gaps), Bridge to the Sky Kingdom (balloons, cloud arches, the castle). Pip runs stretches 1
   and 3, Bo runs 2 and 4.
   GOLD HELP (always announced): 2 tangles in one group of obstacles: a gold gust lifts (or lowers) the kite safely past
   the rest of it. 4 tangles in a stretch: gold gusts for every group left in that stretch. 2 whoopses at one gap: a
   gold plank across it. 12 s on the landing pad without the flag (while the rider plays): a gold gust lifts the kite closer
   to the flag and the flag gets easier to grab (still never without the rider).
   Scoring: stars and rings (a ring is worth 3 stars), tangles, whoopses, time. Medal (MODES.kite.medals, js/medals.js): Gold
   at <= 3:30 with <= 5 tangles + whoopses and 40% of the stars, Silver at <= 5:30 with <= 14, else Bronze.
   Room def: { title, runner: 0|1, look: 'roofs'|'hill'|'pier'|'bridge', tip, act, course: [tokens] }.
   Course tokens (heights are px above the ground at that spot, lengths in px):
     fN flat   uN:D smooth slope over N px by D (negative = up)   jD step (a wall if up)   gN gap   c chimney/crate/fence
     W:h:len power line   H:h:len washing line / bunting (things hang 40 px below)   B:h birds   T:h tree top
     P:h church spire   K:h ship mast   M:h windmill hub (sails 95 px)   L:h hot air balloon   A:h:len cloud arch (go under)
     *:h:n[:gap] a row of stars   O:h a ring gate   U:len / D:len a gust zone (up / down)   S:text a sign ({R} the runner's
     name, {K} the rider's)   E the end: tower, flag, landing pad, fence.
   Obstacles close together form one group (for the gold gust). MODES.kite.plan(st) is the one place that reads what is
   ahead (the prompts, the HUD and the computer brain read it).
   Every global is prefixed kite / KITE (and Sfx.extra.kite*); all state lives in G.mst. */
const KITE = {
  vRun: 250, acc: 900, accAir: 900, fric: 760, vBack: -120, g: 1500, jumpV: 560, coyote: 0.12, jbuf: 0.14, step: 12, hw: 9,
  handUp: 36, Lmin: 100, Lmax: 300, reelV: 190, outV: 120, thMin: 0.12, thMax: 0.98, thUp: 1.1, thDown: 0.32,
  leanMax: 60, leanV: 240, leanBack: 45, sideMax: 70, sideV: 210, sideBack: 50,
  kR: 20, kRT: 8, tuckT: 0.55, tuckCd: 0.9, tangleT: 1.1, safeT: 1.8, slowT: 1.3, slowK: 0.5,
  starR: 26, ringR: 30, oopsT: 1.45,
  flagH: 350, grabR: 34, padGoldT: 12, goldLift: 18, goldGrab: 6, groupGap: 420, stretchGold: 4,
  camX: 560, camFeet: 420, scale: 1.3, landT: 3.3, finT: 4.6, tryWin: 5,
};
const kiteLerp = (a, b, u) => a + (b - a) * u;
const kiteSmooth = u => u * u * (3 - 2 * u);
const KITE_STEP = 2;

/* ---------- the course: tokens -> ground heights (2 px steps, NaN in gaps), obstacles, stars, rings ---------- */
function kiteCompile(def) {
  const X0 = -700, runner = def.runner || 0;
  const name = s => s.replace(/\{R\}/g, NAMES[runner]).replace(/\{K\}/g, NAMES[1 - runner]);
  const c = { x0: X0, look: def.look || 'roofs', gaps: [], chims: [], obs: [], stars: [], rings: [], signs: [], winds: [], secs: [], end: null, groups: [] };
  const gy = [], by = [];
  let x = X0, y = 0;
  const seg = (len, fn, fb) => {
    len = Math.max(2, Math.round(len / KITE_STEP) * KITE_STEP);
    for (let k = 0; k < len; k += KITE_STEP) { const v = fn(k, len); gy.push(v); by.push(fb ? fb(k, len) : v); }
    x += len; return len;
  };
  const flat = len => { const x0 = x, y0 = y; seg(len, () => y0); c.secs.push({ x0, x1: x, y: y0 }); };
  flat(-X0);
  const ob = o => { o.id = c.obs.length; c.obs.push(o); return o; };
  for (const tk of def.course || []) {
    const t = String(tk);
    if (t[1] === ':' || t[0] === '*') {
      const parts = t.split(':'), k = parts[0], a = +parts[1] || 0, b = +parts[2] || 0;
      if (k === 'S') { c.signs.push({ x, y, text: name(t.slice(2)) }); continue; }
      const top = y - a;
      if (k === 'W' || k === 'H') ob({ kind: k === 'W' ? 'wire' : 'wash', x0: x, x1: x + b, yw: top, sag: 14, gy: y, top: top - 4, bot: top + 14 + (k === 'H' ? 40 : 4) });
      else if (k === 'B') ob({ kind: 'birds', x0: x - 16, x1: x + 126, bx: x, by: top, gy: y, top: top - 22 - 14 - 10, bot: top + 14 + 10 });
      else if (k === 'T') ob({ kind: 'tree', x0: x - 62, x1: x + 62, tx: x, gy: y, top, bot: y });
      else if (k === 'P') ob({ kind: 'spire', x0: x - 36, x1: x + 36, tx: x, gy: y, top, bot: y });
      else if (k === 'K') ob({ kind: 'mast', x0: x - 40, x1: x + 40, tx: x, gy: y, top, bot: y });
      else if (k === 'M') ob({ kind: 'mill', x0: x - 98, x1: x + 98, tx: x, hy: top, gy: y, top: top - 98, bot: y });
      else if (k === 'L') ob({ kind: 'balloon', x0: x - 34, x1: x + 34, tx: x, cy: top, gy: y, top: top - 30 - 10, bot: top + 58 + 10 });
      else if (k === 'A') ob({ kind: 'arch', x0: x, x1: x + b, gy: y, top: -99999, bot: top });
      else if (k === '*') { const n = b || 3, gap = +parts[3] || 46; for (let i = 0; i < n; i++) c.stars.push({ x: x + i * gap, y: top, got: false, t: 0 }); }
      else if (k === 'O') c.rings.push({ x, y: top, got: false, t: 0, missed: false });
      else if (k === 'U' || k === 'D') c.winds.push({ x0: x, x1: x + a, dir: k === 'U' ? 1 : -1 });
      continue;
    }
    const ch = t[0], n = parseFloat(t.slice(1)) || 0;
    if (ch === 'f') flat(n);
    else if (ch === 'u') {
      const [len, dy] = t.slice(1).split(':').map(Number), y0 = y;
      seg(len, (k, L) => y0 + dy * kiteSmooth(k / L));
      y = y0 + dy;
    } else if (ch === 'j') y += n;
    else if (ch === 'g') {
      c.gaps.push({ x0: x, x1: x + n, y, oops: 0, gold: false, id: c.gaps.length });
      seg(n, () => NaN);
    } else if (ch === 'c') {
      const y0 = y, x0 = x, hh = 40;
      seg(32, () => y0 - hh, () => y0);
      c.chims.push({ x: x0, w: 32, y: y0, h: hh, k: c.chims.length });
      c.secs.push({ x0, x1: x, y: y0 });
    } else if (ch === 'E') {
      const x0 = x, y0 = y;
      flat(1100);
      c.end = { x0, y: y0, towerX: x0 + 560, flagX: x0 + 560, flagY: y0 - KITE.flagH, pad0: x0 + 600, pad1: x0 + 770, fence: x0 + 780, padT: 0, gold: false, got: false };
      flat(900);
    }
  }
  flat(600);
  c.gy = Float32Array.from(gy); c.by = Float32Array.from(by);
  c.len = x;
  // groups of obstacles close together (for the gold gust), and the safe height to carry the kite past each group
  const sorted = c.obs.slice().sort((a, b) => a.x0 - b.x0);
  let g = null;
  for (const o of sorted) {
    if (!g || o.x0 > g.x1 + KITE.groupGap) { g = { id: c.groups.length, x0: o.x0, x1: o.x1, obs: [], tangles: 0, gold: false, said: false }; c.groups.push(g); }
    g.x1 = Math.max(g.x1, o.x1); g.obs.push(o); o.group = g.id;
  }
  for (const gp of c.groups) {
    const over = gp.obs.some(o => ['tree', 'spire', 'mast', 'mill'].includes(o.kind)), under = gp.obs.some(o => o.kind === 'arch');
    const topY = Math.min(...gp.obs.map(o => o.top)), botY = Math.max(...gp.obs.filter(o => o.kind !== 'arch').map(o => o.bot).concat([-99999]));
    const gyy = gp.obs[0].gy;
    if (under) gp.safe = Math.min(...gp.obs.filter(o => o.kind === 'arch').map(o => o.bot)) + 44;
    else if (over || topY - 40 > gyy - 340) gp.safe = topY - 40;
    else gp.safe = botY + 40;
    gp.word = { wire: 'power lines', wash: 'washing lines', birds: 'birds', tree: 'trees', spire: 'spires', mast: 'masts', mill: 'windmill', balloon: 'balloons', arch: 'cloud arch' }[gp.obs[0].kind] || 'things';
  }
  return c;
}
// the ground height (world px, y down) at x; NaN over a gap
function kiteGy(st, x) {
  const c = st.c, i = Math.round((x - c.x0) / KITE_STEP);
  if (i < 0) return c.gy[0];
  if (i >= c.gy.length) return c.gy[c.gy.length - 1];
  return c.gy[i];
}
function kiteBy(st, x) {
  const c = st.c, i = Math.round((x - c.x0) / KITE_STEP);
  if (i < 0) return c.by[0];
  if (i >= c.by.length) return c.by[c.by.length - 1];
  return c.by[i];
}
// the highest ground under the runner's feet (Infinity: nothing there)
function kiteSupport(st, x) {
  let s = Infinity;
  for (let d = -KITE.hw; d <= KITE.hw; d += 3) { const v = kiteGy(st, x + d); if (v === v && v < s) s = v; }
  return s;
}
// the ground the kite can't go below (a gap uses the roofs next to it)
function kiteFloor(st, x) {
  let s = Infinity;
  for (let d = -60; d <= 60; d += 12) { const v = kiteBy(st, x + d); if (v === v && v < s) s = v; }
  return s === Infinity ? st.ry : s;
}
const kiteGapAt = (st, x) => st.c.gaps.find(g => x > g.x0 - 14 && x < g.x1 + 14) || null;

// each player's own keys, for prompts and the HUD (a player with a controller is shown its buttons)
function kiteKey(id, what) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
  if (what === 'run') return pad || touch ? '▶' : id === 0 ? 'D' : '→';
  if (what === 'jump') return pad ? glyph('a') : touch ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'reel' || what === 'down') return pad || touch ? '▼' : id === 0 ? 'S' : '↓';
  if (what === 'up') return pad || touch ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'back') return pad || touch ? '◀' : id === 0 ? 'A' : '←';
  if (what === 'tuck') return pad ? glyph('act') : touch ? '●' : id === 0 ? 'F' : '/';
  return '';
}
// 1-player mode: the computer's own job gets no key hints or prompts (it knows its job)
const kiteQuiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);

/* ---------- a stretch (one room) ---------- */
function kiteRoom(st, L, k) {
  const def = L.def;
  st.k = k; st.runner = def.runner || 0; st.rider = 1 - st.runner; st.look = def.look || 'roofs'; st.title = def.title || '';
  st.c = kiteCompile(def);
  st.starsN += st.c.stars.length; st.ringsN += st.c.rings.length;
  st.stats.roomT[k] = null;
  // the runner
  st.rx = 0; st.ry = kiteGy(st, 0); st.vx = 0; st.vy = 0; st.grounded = true; st.coyote = 0; st.jb = 0; st.face = 1;
  st.anchorY = st.ry - KITE.handUp; st.groundY = st.ry; st.blockT = 0; st.stillT = 0; st.oops = null; st.slowT = 0; st.lastSafeX = 0;
  st.step = 0; st.reeling = false;
  // the kite: resting on the roof behind the runner
  st.L = KITE.Lmin; st.th = KITE.thMin; st.up = 0; st.side = 0; st.wind = 0; st.gold = 0;
  st.tuck = 0; st.tuckCd = 0; st.tangle = 0; st.safe = 0; st.spin = 0; st.groupGoldAll = false;
  const kb = kiteKiteBase(st);
  st.kx = kb.x; st.ky = kb.y; st.kvx = 0; st.kvy = 0; st.tilt = 0;
  st.state = 'run'; st.land = null; st.fin = null;
  st.tanglesHere = 0; st.roomT = 0; st.segStart = G.time; st.inT = [-99, -99];
  st.cam = { x: st.rx - KITE.camX, y: st.ry - KITE.camFeet - 10 };
  st.parts = []; st.pops = []; st.hints = [null, null]; st.hinted = {}; st.msg = null; st.reelClick = 0;
  kiteMirror(st);
}

/* ---------- the tick (def.ownStep: this is all of it) ---------- */
function kiteStep(st, dt) {
  if (!st.c) return;
  const ps = G.players;
  for (const q of [0, 1]) {
    const i = ps[q].input;
    if (i.left || i.right || i.jump || i.down || i.up || i.act || ps[q].pendingJump) st.inT[q] = G.time;
  }
  st.roomT += dt;
  kiteActLabels(st);
  if (G.introT > 0) {
    for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
    kiteKiteMove(st, dt, false);
  } else if (st.state === 'run') {
    kiteRunner(st, dt);
    kiteKiteMove(st, dt, true);
    kiteHits(st, dt);
    kiteEndCheck(st, dt);
    if (st.state === 'run') { kiteHelp(st, dt); kiteNudges(st, dt); }
  } else {
    for (const p of ps) { p.pendingJump = false; p.pendingAct = false; }
    if (st.state === 'land') { if (kiteLandStep(st, dt)) return; }
  }
  kiteCam(st, dt);
  kiteFx(st, dt);
  kiteMirror(st);
}
const kiteBoth = st => G.time - st.inT[0] < KITE.tryWin && G.time - st.inT[1] < KITE.tryWin;

/* ---------- the runner: a little platformer of its own on the ground heights ---------- */
function kiteRunner(st, dt) {
  const K = KITE, p = G.players[st.runner], i = p.input;
  if (p.pendingJump) { st.jb = K.jbuf; p.pendingJump = false; }
  st.reeling = !!(i.down || i.act);
  p.pendingAct = false;
  G.players[st.rider].pendingJump = false;
  if (st.jb > 0) st.jb -= dt;
  if (st.oops) { kiteOopsStep(st, dt); return; }
  if (st.slowT > 0) st.slowT -= dt;
  // running: ◀ ▶ (a tangle slows the runner on the ground for a moment)
  const dir = (i.right ? 1 : 0) - (i.left ? 1 : 0);
  const top = st.slowT > 0 && st.grounded ? K.vRun * K.slowK : K.vRun;
  const want = dir > 0 ? top : dir < 0 ? K.vBack : 0;
  const acc = !st.grounded ? K.accAir : dir === 0 || Math.sign(want) !== Math.sign(st.vx) ? K.fric : K.acc;
  st.vx = approach(st.vx, want, acc * dt);
  if (st.grounded && st.vx > top) st.vx = approach(st.vx, top, K.fric * dt);
  if (dir) st.face = dir;
  // the jump (buffered, with a little coyote time after a roof edge)
  if (st.jb > 0 && (st.grounded || st.coyote > 0)) {
    st.jb = 0; st.vy = -K.jumpV; st.grounded = false; st.coyote = 0;
    Sfx.play('kiteJump', st.runner);
    kiteDust(st, 4);
  }
  // across: a wall in front stops you (chimneys and steps up need a jump)
  let nx = st.rx + st.vx * dt;
  const fx = nx + Math.sign(st.vx || 1) * (K.hw + 1), fg = kiteGy(st, fx);
  st.blocked = false;
  if (fg === fg && fg < st.ry - K.step) { nx = st.rx; if (Math.abs(st.vx) > 0) st.blocked = true; st.vx = 0; }
  nx = Math.max(nx, st.c.x0 + 60);
  if (st.c.end) nx = Math.min(nx, st.c.end.fence - 12);
  if (nx === st.c.end?.fence - 12 && st.vx > 0) st.vx = 0;
  st.rx = nx;
  // up and down
  const s = kiteSupport(st, st.rx);
  if (st.grounded) {
    if (s !== Infinity && s >= st.ry - K.step && s <= st.ry + 16) st.ry = s;
    else { st.grounded = false; st.coyote = K.coyote; st.vy = 0; }
  } else {
    if (st.coyote > 0) st.coyote -= dt;
    st.vy = Math.min(st.vy + K.g * dt, 900);
    const ny = st.ry + st.vy * dt;
    // (a landing also catches feet a little below a roof edge that came under them, so nobody sinks into a roof)
    if (st.vy >= 0 && s !== Infinity && st.ry <= s + K.step + 2 && ny >= s) {
      st.ry = s; st.vy = 0; st.grounded = true;
      Sfx.play('kiteLand'); kiteDust(st, 3);
    } else st.ry = ny;
  }
  if (st.grounded) {
    st.groundY = st.ry;
    if (!kiteGapAt(st, st.rx + 50) && !kiteGapAt(st, st.rx - 40)) st.lastSafeX = st.rx;
  }
  // fell into a gap
  const gap = kiteGapAt(st, st.rx);
  if (!st.grounded && gap && st.ry > gap.y + 90) kiteStartOops(st, gap);
  // safety net: feet inside solid ground (never a gap) pop back up on top of it
  else if (!st.grounded && !gap && s !== Infinity && st.ry > s + 30) { st.ry = s; st.vy = 0; st.grounded = true; st.groundY = s; }
  // footsteps
  if (st.grounded && Math.abs(st.vx) > 20) st.step += Math.abs(st.vx) * dt / 28;
  st.blockT = st.blocked ? st.blockT + dt : 0;
}
function kiteStartOops(st, gap) {
  gap.oops++; st.stats.oops++;
  const toX = Math.min(st.lastSafeX, gap.x0 - 90);
  st.oops = { t: 0, x0: st.rx, y0: st.ry, toX, toY: kiteGy(st, toX), by: gap.y + kiteBounceY(st), gap };
  st.vx = 0; st.vy = 0;
  Sfx.play('kiteWhoops');
  kitePop(st, st.rx, gap.y - 90, 'Whoops!', '#ffe7a8', 30);
  rumble(st.runner, 0.3, 0.4, 180);
  if (gap.oops >= 2 && !gap.gold) {
    gap.gold = true; st.stats.helps++;
    const c = st.c, i0 = Math.round((gap.x0 - c.x0) / KITE_STEP), i1 = Math.round((gap.x1 - c.x0) / KITE_STEP);
    for (let i = i0 - 1; i <= i1 + 1; i++) if (i >= 0 && i < c.gy.length && c.gy[i] !== c.gy[i]) { c.gy[i] = gap.y; c.by[i] = gap.y; }
    kiteMsg(st, 'Gold plank! It bridges the gap for you', C.gold, 3.8); Sfx.play('kiteHelp');
  } else kiteHint(st, st.runner, 'Take a run-up and jump ' + kiteKey(st.runner, 'jump') + ' at the edge!', 3);
}
// how far below the roof the bouncer sits
const kiteBounceY = st => ({ roofs: 70, hill: 46, pier: 92, bridge: 80 }[st.look] || 70);
function kiteOopsStep(st, dt) {
  const o = st.oops, K = KITE;
  o.t += dt;
  if (o.t < 0.3) { st.ry = Math.min(o.by, st.ry + 500 * dt); st.rx += (o.gap.x0 + (o.gap.x1 - o.gap.x0) / 2 - st.rx) * Math.min(1, dt * 6); return; }
  if (!o.boing) { o.boing = true; o.bx = st.rx; o.byy = st.ry; Sfx.play('kiteBoing'); kitePop(st, st.rx, o.by - 40, 'Boing!', '#ffffff', 24); }
  const u = clamp((o.t - 0.3) / (K.oopsT - 0.3), 0, 1);
  st.rx = kiteLerp(o.bx, o.toX, kiteSmooth(u));
  st.ry = kiteLerp(o.byy, o.toY, u) - Math.sin(u * Math.PI) * 170;
  st.vx = 0; st.vy = 0;
  if (o.t >= K.oopsT) {
    st.rx = o.toX; st.ry = o.toY; st.grounded = true; st.groundY = st.ry; st.oops = null;
    kitePop(st, st.rx, st.ry - 90, 'Try again!', '#ffe7a8', 20);
  }
}
const kiteOnPad = st => !!st.c.end && st.grounded && st.rx >= st.c.end.pad0 && st.rx <= st.c.end.pad1;

/* ---------- the kite: string length, angle (lift from the runner's speed), the rider's lean ---------- */
// where the kite would be with the rider's lean and slide (no lag)
function kiteKiteBase(st) {
  const K = KITE;
  return { x: st.rx - st.L * Math.cos(st.th) + st.side, y: st.anchorY - st.L * Math.sin(st.th) - st.up - st.wind - st.gold };
}
// how much lift the wind gives right now (0..1)
function kiteLift(st) {
  if (st.state !== 'run' || G.introT > 0) return st.state === 'land' ? 1 : 0;
  if (kiteOnPad(st)) return 1;
  if (st.oops) return 0;
  return clamp(st.vx / (KITE.vRun * 0.85), 0, 1);
}
function kiteKiteMove(st, dt, live) {
  const K = KITE, rp = G.players[st.rider], i = rp.input;
  // the string is tied to the runner's ground spot, never to a jump
  const ay = st.groundY - K.handUp;
  st.anchorY = approach(st.anchorY, ay, 260 * dt);
  const lift = kiteLift(st);
  st.lift = lift;
  const thT = K.thMin + (K.thMax - K.thMin) * lift;
  st.th = st.th < thT ? Math.min(thT, st.th + K.thUp * dt) : Math.max(thT, st.th - K.thDown * dt);
  if (live && !st.oops && st.reeling) {
    const was = st.L;
    st.L = Math.max(K.Lmin, st.L - K.reelV * dt);
    if (st.L < was) { st.reelClick -= dt; if (st.reelClick <= 0) { st.reelClick = 0.09; Sfx.play('kiteReel'); } }
  } else if (lift > 0.3) st.L = Math.min(K.Lmax, st.L + K.outV * lift * dt);
  // the rider leans (▲ ▼) and slides (◀ ▶); a tangled rider can't steer
  if (live && st.tangle <= 0) {
    const up = !!(i.jump || i.up), dn = !!i.down;
    if (up && !dn) st.up = Math.min(K.leanMax, st.up + K.leanV * dt);
    else if (dn && !up) st.up = Math.max(-K.leanMax, st.up - K.leanV * dt);
    else st.up = approach(st.up, 0, K.leanBack * dt);
    if (i.right && !i.left) st.side = Math.min(K.sideMax, st.side + K.sideV * dt);
    else if (i.left && !i.right) st.side = Math.max(-K.sideMax, st.side - K.sideV * dt);
    else st.side = approach(st.side, 0, K.sideBack * dt);
    if (rp.pendingAct) {
      rp.pendingAct = false;
      if (st.tuckCd <= 0) { st.tuck = K.tuckT; st.tuckCd = K.tuckCd; Sfx.play('kiteTuck', st.rider); }
    }
  } else {
    rp.pendingAct = false;
    st.up = approach(st.up, 0, K.leanBack * dt); st.side = approach(st.side, 0, K.sideBack * dt);
  }
  rp.pendingJump = false;
  if (st.tuck > 0) st.tuck -= dt;
  if (st.tuckCd > 0) st.tuckCd -= dt;
  // gusts on the windy hill push the kite up or down; a gold gust carries it past a group
  let wantWind = 0;
  for (const w of st.c.winds) if (st.kx > w.x0 && st.kx < w.x1) wantWind = w.dir * 58;
  st.wind = approach(st.wind, wantWind, 90 * dt);
  let wantGold = 0;
  const gp = kiteGoldGroupAt(st, st.kx);
  if (gp) wantGold = clamp(kiteKiteBaseNoGold(st).y - gp.safe, -400, 400);
  if (st.c.end && st.c.end.gold && !st.c.end.got && st.kx > st.c.end.x0) wantGold = K.goldLift;
  st.gold = approach(st.gold, wantGold, 260 * dt);
  // follow the spot with a little lag, never below the roofs
  const b = kiteKiteBase(st);
  let tx = b.x, ty = b.y;
  if (st.tangle > 0) { ty += 26 * Math.sin(Math.min(1, (K.tangleT - st.tangle) / K.tangleT) * Math.PI); st.tangle -= dt; }
  const px = st.kx, py = st.ky;
  st.kx += (tx - st.kx) * Math.min(1, dt * 6);
  st.ky += (ty - st.ky) * Math.min(1, dt * 6);
  const fl = kiteFloor(st, st.kx) - 26;
  if (st.ky > fl) st.ky = fl;
  st.kvx = (st.kx - px) / dt; st.kvy = (st.ky - py) / dt;
  st.tilt = approach(st.tilt, clamp(st.kvy / 500, -0.35, 0.35) + (st.side / K.sideMax) * 0.12, dt * 2);
  if (st.safe > 0) st.safe -= dt;
  st.spin = st.tuck > 0 ? (1 - st.tuck / K.tuckT) * Math.PI * 2 : 0;
}
function kiteKiteBaseNoGold(st) { const g = st.gold; st.gold = 0; const b = kiteKiteBase(st); st.gold = g; return b; }
function kiteGoldGroupAt(st, x) { return st.c.groups.find(g => g.gold && x > g.x0 - 300 && x < g.x1 + 80) || null; }
const kiteRadius = st => (st.tuck > 0 ? KITE.kRT : KITE.kR);

/* ---------- obstacle shapes (world px) ---------- */
function kiteSegD(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, u = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return Math.hypot(px - (ax + dx * u), py - (ay + dy * u));
}
// a power or washing line sags in the middle
const kiteWireY = (o, x) => { const u = clamp((x - o.x0) / (o.x1 - o.x0), 0, 1); return o.yw + o.sag * 4 * u * (1 - u); };
function kiteBirdsXY(o, t) {
  const out = [];
  for (let i = 0; i < 3; i++) out.push({ x: o.bx + i * 55, y: o.by - (i % 2) * 22 + Math.sin(t * 2.2 + i * 1.7 + o.bx * 0.01) * 10, i });
  return out;
}
const kiteMillA = (o, t) => t * 0.9 + o.tx * 0.003;
const kiteBalloonY = (o, t) => o.cy + Math.sin(t * 1.3 + o.tx * 0.02) * 10;
// distance from (x, y) to an obstacle's solid part (minus its thickness)
function kiteObsD(st, o, x, y) {
  const t = st.roomT;
  switch (o.kind) {
    case 'wire': case 'wash': {
      let d = Infinity;
      for (let k = 0; k < 6; k++) { const xa = kiteLerp(o.x0, o.x1, k / 6), xb = kiteLerp(o.x0, o.x1, (k + 1) / 6); d = Math.min(d, kiteSegD(x, y, xa, kiteWireY(o, xa), xb, kiteWireY(o, xb)) - 3); }
      if (o.kind === 'wash') for (let k = 0; k < 6; k++) { const xa = kiteLerp(o.x0, o.x1, k / 6), xb = kiteLerp(o.x0, o.x1, (k + 1) / 6); d = Math.min(d, kiteSegD(x, y, xa, kiteWireY(o, xa) + 22, xb, kiteWireY(o, xb) + 22) - 16); }
      return d;
    }
    case 'birds': return Math.min(...kiteBirdsXY(o, t).map(b => Math.hypot(x - b.x, y - b.y) - 14));
    case 'tree': {
      const cy = o.top + 56;
      return Math.min(Math.hypot(x - o.tx, y - cy) - 56, Math.hypot(x - o.tx + 34, y - cy - 24) - 40, Math.hypot(x - o.tx - 34, y - cy - 24) - 40,
        x > o.tx - 70 && x < o.tx + 70 && y > cy ? 0 : Infinity);
    }
    case 'spire': {
      const ty = o.top, by = o.top + 120;
      if (y >= by) return Math.abs(x - o.tx) - 35;
      if (y < ty) return Math.hypot(x - o.tx, y - ty);
      const half = 27 * (y - ty) / 120;
      return Math.min(Math.abs(x - o.tx) - half, kiteSegD(x, y, o.tx, ty, o.tx - 27, by), kiteSegD(x, y, o.tx, ty, o.tx + 27, by));
    }
    case 'mast': return Math.min(kiteSegD(x, y, o.tx, o.gy, o.tx, o.top) - 4, kiteSegD(x, y, o.tx - 40, o.top + 36, o.tx + 40, o.top + 36) - 4);
    case 'mill': {
      let d = kiteSegD(x, y, o.tx, o.hy, o.tx, o.gy) - 20;
      const a = kiteMillA(o, t);
      for (let k = 0; k < 4; k++) { const b = a + k * Math.PI / 2; d = Math.min(d, kiteSegD(x, y, o.tx, o.hy, o.tx + Math.cos(b) * 95, o.hy + Math.sin(b) * 95) - 8); }
      return d;
    }
    case 'balloon': { const cy = kiteBalloonY(o, t); return Math.min(Math.hypot(x - o.tx, (y - cy) * 0.9) - 30, Math.hypot(x - o.tx, y - cy - 48) - 10); }
    case 'arch': return x < o.x0 - 10 || x > o.x1 + 10 ? Infinity : y - o.bot;
  }
  return Infinity;
}

/* ---------- hits: obstacles tangle, stars and rings score, the flag ---------- */
function kiteHits(st, dt) {
  const K = KITE, r = kiteRadius(st), x = st.kx, y = st.ky;
  if (st.safe <= 0 && st.tangle <= 0) {
    for (const o of st.c.obs) {
      if (x < o.x0 - 60 || x > o.x1 + 60) continue;
      const gp = st.c.groups[o.group];
      if (gp.gold) continue;
      // a tuck spin while the kite meets the birds: they flutter round it for good
      if (o.kind === 'birds' && (o.dodged || (st.tuck > 0 && x > o.x0 - 30))) { if (!o.dodged) { o.dodged = true; kitePop(st, x, y - 50, 'Whoosh!', '#ffffff', 22); st.stats.dodges++; } continue; }
      if (kiteObsD(st, o, x, y) < r) { kiteTangle(st, o, gp); break; }
    }
  }
  for (const s of st.c.stars) {
    if (s.got || Math.abs(s.x - x) > 60) continue;
    if (Math.hypot(s.x - x, s.y - y) < K.starR + (st.tuck > 0 ? -6 : 0)) {
      s.got = true; s.t = 0; st.stars++; st.starsRoom++;
      Sfx.play('kiteStar'); kiteSpark(st, s.x, s.y, C.gold, 5);
    }
  }
  for (const rg of st.c.rings) {
    if (rg.got || rg.missed) continue;
    if (x > rg.x - 6 && x < rg.x + 6 + st.kvx * dt) {
      if (Math.abs(y - rg.y) < K.ringR - 6) {
        rg.got = true; rg.t = 0; st.rings++; st.stars += 3;
        Sfx.play('kiteRing'); kitePop(st, rg.x, rg.y - 56, 'Ring! +3', C.gold, 26);
        for (let i = 0; i < 14; i++) kiteSpark(st, rg.x, rg.y + (Math.random() - 0.5) * 50, i % 2 ? C.gold : '#ffffff', 1);
      }
    } else if (x > rg.x + 40) rg.missed = true;
  }
  // the flag on the tower
  const e = st.c.end;
  if (e && !e.got) {
    const gr = K.grabR + (e.gold ? K.goldGrab : 0);
    if (kiteFlagD(e, x, y) < gr) {
      e.got = true; e.gotT = G.time; st.stats.flags++;
      Sfx.play('kiteFlag'); kitePop(st, e.flagX, e.flagY - 60, 'Got the flag!', C.gold, 30);
      for (let i = 0; i < 24; i++) kiteSpark(st, e.flagX, e.flagY, i % 3 ? C.gold : '#ffffff', 1);
      rumble(0, 0.2, 0.5, 200); rumble(1, 0.2, 0.5, 200);
      if (!kiteOnPad(st)) kiteHint(st, st.runner, 'Got it! Now run to the landing pad', 3);
    }
  }
}
// how far the kite is from the flag: an oval round the flag cloth (wider than tall, so the rider mostly has to get UP
// to it; the kite ends up a little past the pole when the runner stands at the fence, and that still counts)
const kiteFlagD = (e, x, y) => Math.hypot((x - e.flagX - 14) / 1.6, y - e.flagY);
function kiteTangle(st, o, gp) {
  const K = KITE;
  st.tangle = K.tangleT; st.safe = K.safeT; st.slowT = K.slowT; st.tuck = 0;
  st.stats.tangles++; st.tanglesHere++; gp.tangles++;
  Sfx.play('kiteTangle');
  kitePop(st, st.kx, st.ky - 60, 'Tangled!', '#ffffff', 30);
  for (let i = 0; i < 10; i++) kiteSpark(st, st.kx, st.ky, i % 2 ? '#ffffff' : PCOL[st.rider], 1);
  rumble(st.rider, 0.25, 0.45, 160); rumble(st.runner, 0.1, 0.3, 120);
  G.shake = reduceMotion ? 0 : 0.08;
  const both = kiteBoth(st);
  if (both && gp.tangles >= 2 && !gp.gold) {
    gp.gold = true; st.stats.helps++;
    kiteMsg(st, 'Gold gust! It carries the kite past the ' + gp.word, C.gold, 4); Sfx.play('kiteHelp');
  } else if (both && st.tanglesHere >= K.stretchGold && !st.groupGoldAll) {
    st.groupGoldAll = true; st.stats.helps++;
    for (const g of st.c.groups) if (g.x0 > st.kx) g.gold = true;
    kiteMsg(st, 'Gold gusts! They help the kite past everything in this stretch', C.gold, 4.4); Sfx.play('kiteHelp');
  } else {
    const pl = kitePlanFor(st, o);
    kiteHint(st, st.rider, pl === 'down' ? 'Steer under it! Hold ' + kiteKey(st.rider, 'down') : pl === 'tuck' ? 'Tuck ' + kiteKey(st.rider, 'tuck') + ' or fly round the birds' : 'Steer over it! Hold ' + kiteKey(st.rider, 'up'), 3);
    if (o.kind === 'arch') kiteHint(st, st.runner, 'Reel in! Hold ' + kiteKey(st.runner, 'reel') + ' to bring the kite low', 3);
  }
}
// which way round an obstacle is easier (for the hint after a tangle)
function kitePlanFor(st, o) {
  if (o.kind === 'arch') return 'down';
  if (o.kind === 'birds') return 'tuck';
  if (['tree', 'spire', 'mast', 'mill'].includes(o.kind)) return 'up';
  return st.ky > (o.top + o.bot) / 2 ? 'down' : 'up';
}

/* ---------- the end of a stretch: flag + landing pad ---------- */
function kiteEndCheck(st, dt) {
  const e = st.c.end;
  if (!e) return;
  const on = kiteOnPad(st);
  if (on && !e.got) {
    // (the runner's job here is to stand still, so only the rider has to be playing: a lone runner never gets this)
    if (G.time - st.inT[st.rider] < KITE.tryWin) e.padT += dt;
    if (e.padT >= KITE.padGoldT && !e.gold) {
      e.gold = true; st.stats.helps++;
      kiteMsg(st, 'Gold gust! The kite flies higher and the flag is easier to grab', C.gold, 4.2); Sfx.play('kiteHelp');
    }
  }
  if (on && e.got && Math.abs(st.vx) < 80) kiteStartLand(st);
}
function kiteStartLand(st) {
  st.state = 'land'; st.land = { t: 0, kx: st.kx, ky: st.ky };
  st.vx = 0; st.reeling = false;
  st.stats.roomT[st.k] = G.time - st.segStart;
  Sfx.play('kiteLand2');
  const last = !(G.level.def.rooms && G.level.def.roomIndex < G.level.def.roomCount - 1);
  if (last) st.stats.finishT = G.time;
}
function kiteLandSpot(st) { return { x: st.rx - 64, y: st.ry - 20 }; }
function kiteLandStep(st, dt) {
  const ld = st.land, K = KITE, last = !(G.level.def.rooms && G.level.def.roomIndex < G.level.def.roomCount - 1);
  ld.t += dt;
  const sp = kiteLandSpot(st), u = kiteSmooth(clamp(ld.t / 1.5, 0, 1));
  // the runner reels in, the kite glides down onto the pad
  st.L = Math.max(K.Lmin, st.L - 140 * dt);
  st.kx = kiteLerp(ld.kx, sp.x, u); st.ky = kiteLerp(ld.ky, sp.y, u) - Math.sin(u * Math.PI) * 30;
  st.tilt = approach(st.tilt, 0, dt * 2); st.up = 0; st.side = 0; st.wind = 0; st.gold = 0;
  if (ld.t > 1.6 && !ld.hop) {
    ld.hop = true; Sfx.play('kiteHop', st.rider);
    kitePop(st, st.rx - 30, st.ry - 120, last ? 'We made it!' : 'Swap jobs!', last ? C.gold : '#ffffff', last ? 32 : 28);
    if (!last) Sfx.play('kiteSwap');
    for (let i = 0; i < (last ? 60 : 28); i++) { const a = -Math.PI * (0.1 + 0.8 * Math.random()), s = 180 + Math.random() * 180; kitePart(st, st.rx - 30, st.ry - 60, Math.cos(a) * s, Math.sin(a) * s, 1.4, ['#ff6b4a', '#5b95ff', '#ffd36b', '#ffffff', '#8fe3b0'][i % 5], 4, 300, 'conf'); }
    rumble(0, 0.1, 0.4, 120); rumble(1, 0.1, 0.4, 120);
  }
  if (last && ld.t > 2.4 && !ld.fan) { ld.fan = true; Sfx.play('kiteFanfare'); }
  if (ld.t >= (last ? K.finT : K.landT)) {
    const L = G.level;
    if (!last) { nextRoom(); return true; }
    if (!ld.cleared) {
      ld.cleared = true;
      L.goal = { x: st.rx - st.cam.x, y: st.ry - 120 - st.cam.y };
      levelClear();
    }
    return true;
  }
  return false;
}
// where the rider is drawn (world px, feet): on the kite, or hopping down onto the pad
function kiteRiderSpot(st) {
  if (st.state === 'land' && st.land && st.land.t > 1.6) {
    const u = clamp((st.land.t - 1.6) / 0.5, 0, 1), sp = kiteLandSpot(st);
    return { x: kiteLerp(sp.x, st.rx - 40, u), y: kiteLerp(sp.y - 4, st.ry, u) - Math.sin(u * Math.PI) * 50, onKite: false };
  }
  return { x: st.kx, y: st.ky + 4, onKite: true };
}

/* ---------- what the pair needs to do right now (prompts, panels and the computer read this) ---------- */
// the free heights for the kite past the obstacles ahead; target: the nearest free height (or a star, a ring, the flag)
function kitePlan(st) {
  const K = KITE, out = { ty: null, tx: null, why: 'cruise', dist: 9999, obs: null, needL: null, jump: null, birds: false };
  if (!st.c || st.state !== 'run') { out.why = 'none'; return out; }
  const x = st.kx, y = st.ky, look = 330 + Math.max(0, st.vx) * 0.5;
  const hiY = st.anchorY - K.Lmax * Math.sin(K.thMax) - K.leanMax + 8, loY = kiteFloor(st, x + 80) - 34;
  // the first obstacle ahead (or under) the kite, and any that overlap it: the next one waits until this one is passed
  let first = null;
  for (const o of st.c.obs) {
    if (o.x1 + K.kR + 6 < x || o.x0 - K.kR > x + look) continue;
    if (st.c.groups[o.group].gold || (o.kind === 'birds' && o.dodged)) continue;
    if (!first || o.x0 < first.x0) first = o;
  }
  const bands = [];
  if (first) for (const o of st.c.obs) {
    if (o.x1 + K.kR + 6 < x || o.x0 > first.x1 + 140) continue;
    if (st.c.groups[o.group].gold || (o.kind === 'birds' && o.dodged)) continue;
    const m = K.kR + 12;
    bands.push([o.top - m, o.bot + m]);
    if (o.kind === 'birds' && o.x0 - x < 170) out.birds = true;
  }
  const e = st.c.end;
  if (bands.length) {
    bands.sort((a, b) => a[0] - b[0]);
    const free = [];
    let cur = hiY;
    for (const [a, b] of bands) { if (a > cur) free.push([cur, Math.min(a, loY)]); cur = Math.max(cur, b); }
    if (cur < loY) free.push([cur, loY]);
    const ok = free.filter(f => f[1] - f[0] > 4);
    let best = null, bd = Infinity;
    for (const f of ok) { const ty = clamp(y, f[0] + 6, f[1] - 6), d = Math.abs(ty - y); if (d < bd) { bd = d; best = ty; } }
    out.ty = best == null ? hiY : best; out.why = 'dodge'; out.obs = first; out.dist = first.x0 - x;
  } else if (e && !e.got && x > e.x0 - 500) {
    out.ty = e.flagY; out.tx = e.flagX; out.why = 'flag'; out.dist = e.flagX - x;
  } else {
    // a ring or a star a little ahead
    const rg = st.c.rings.find(r => !r.got && !r.missed && r.x > x - 4 && r.x < x + 420);
    const sr = st.c.stars.find(s => !s.got && s.x > x + 10 && s.x < x + 360);
    const pick = rg && (!sr || rg.x < sr.x + 200) ? rg : sr;
    if (pick && pick.y >= hiY - 4 && pick.y <= loY) { out.ty = pick.y; out.why = rg === pick ? 'ring' : 'star'; out.dist = pick.x - x; }
  }
  if (out.ty != null) {
    const sn = Math.sin(Math.max(st.th, 0.55));
    out.needL = clamp((st.anchorY - (out.ty + (out.why === 'flag' ? K.leanMax * 0.5 : 0))) / sn, K.Lmin, K.Lmax);
    if (out.why === 'flag') out.needL = K.Lmax;
  }
  // the runner: the next gap or wall
  for (let d = 12; d < 220; d += 4) {
    const gx = st.rx + d, v = kiteGy(st, gx);
    if (v !== v) { out.jump = { kind: 'gap', dist: d - KITE.hw, x: gx, gap: kiteGapAt(st, gx) }; break; }
    if (v < st.groundY - K.step) { out.jump = { kind: 'wall', dist: d - KITE.hw, x: gx, h: st.groundY - v }; break; }
  }
  return out;
}
// one-time lessons, and gentle nudges when someone seems stuck
function kiteNudges(st, dt) {
  const R = st.runner, Kd = st.rider, pl = kitePlan(st), e = st.c.end;
  // the runner stopped (and isn't on the pad): the kite sinks
  const still = Math.abs(st.vx) < 30 && !kiteOnPad(st) && !st.oops;
  st.stillT = still ? st.stillT + dt : 0;
  if (st.stillT > 3.5) { st.stillT = -5; kiteHint(st, R, 'Keep running ' + kiteKey(R, 'run') + '! The kite needs wind', 3); }
  if (st.blockT > 1.0) { st.blockT = -3; kiteHint(st, R, 'Jump ' + kiteKey(R, 'jump') + ' over it!', 2.6); }
  if (pl.why === 'dodge' && pl.obs && pl.dist < 360) {
    const k = pl.obs.kind;
    if (k === 'arch') kiteHintOnce(st, 'arch' + st.k, R, 'Cloud arch! Hold ' + kiteKey(R, 'reel') + ' to reel the kite in low', 3.2);
    if (k === 'birds') kiteHintOnce(st, 'birds' + st.k, Kd, 'Birds! Fly round them, or tuck ' + kiteKey(Kd, 'tuck') + ' to spin past', 3.2);
    if (['spire', 'mast'].includes(k)) kiteHintOnce(st, 'spire' + st.k, Kd, 'So tall! Hold ' + kiteKey(Kd, 'up') + ' to fly over the top', 3);
  }
  if (e && !e.got && st.kx > e.x0 - 300) kiteHintOnce(st, 'flag' + st.k, Kd, 'Grab the flag! Hold ' + kiteKey(Kd, 'up') + ' to fly up to it', 3.6);
  if (e && !e.got && kiteOnPad(st) && st.reeling) kiteHintOnce(st, 'padreel' + st.k, R, 'Let go of ' + kiteKey(R, 'reel') + ': let the string all the way out', 3);
}
function kiteHintOnce(st, key, id, text, life) { if (st.hinted[key]) return; st.hinted[key] = true; kiteHint(st, id, text, life); }
function kiteHelp(st, dt) {
  // a gold group's message repeats once when the kite reaches it, so the help is never a surprise
  for (const g of st.c.groups) if (g.gold && !g.said && st.kx > g.x0 - 420 && st.kx < g.x0) { g.said = true; if (!st.msg) kiteMsg(st, 'Gold gust ahead! It carries the kite past the ' + g.word, C.gold, 3); }
  void dt;
}

/* ---------- small helpers ---------- */
function kiteHint(st, id, text, life) { if (kiteQuiet(id)) return; st.hints[id] = { text, t: 0, life: life || 2.8 }; }
function kiteMsg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
function kitePop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 10) st.pops.shift(); }
function kitePart(st, x, y, vx, vy, life, col, size, grav, kind) {
  if (st.parts.length > 260) st.parts.shift();
  st.parts.push({ x, y, vx, vy, life, max: life, col, size, grav: grav || 0, kind: kind || 'dot', r: Math.random() * 6 });
}
function kiteSpark(st, x, y, col, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 120; kitePart(st, x, y, Math.cos(a) * s, Math.sin(a) * s, 0.5, col, 3 + Math.random() * 2, 0, 'star'); } }
function kiteDust(st, n) { for (let i = 0; i < n; i++) kitePart(st, st.rx + (Math.random() - 0.5) * 20, st.ry - 2, (Math.random() - 0.5) * 80 - st.vx * 0.1, -20 - Math.random() * 40, 0.5, 'rgba(255,255,255,0.8)', 3 + Math.random() * 3, 30, 'dust'); }
// the touch buttons and the top-bar legend name each player's own action this stretch: the runner reels, the rider tucks
let kiteLabelEls = null;
function kiteActLabels(st) {
  try {
    if (!kiteLabelEls || !kiteLabelEls.every(o => document.contains(o.el))) kiteLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.dataset.legp !== undefined ? +box.dataset.legp : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
      return { el, id };
    });
    let changed = false;
    for (const o of kiteLabelEls) {
      const want = o.id < 0 ? 'reel/tuck' : o.id === st.runner ? 'reel' : 'tuck';
      if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
    }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}
function kiteCam(st, dt) {
  const K = KITE, cam = st.cam;
  let tx = st.rx - K.camX + clamp(st.vx * 0.2, -30, 50);
  const e = st.c.end;
  if (e && st.rx > e.x0 + 200) tx = Math.min(tx, e.pad1 - K.camX + 40);
  cam.x += (tx - cam.x) * Math.min(1, dt * 4);
  // keep the kite and the runner on screen
  if (st.kx - cam.x < 60) cam.x = st.kx - 60;
  if (st.rx - cam.x > W - 200) cam.x = st.rx - (W - 200);
  const feet = st.oops ? st.oops.toY : st.groundY;
  let ty = feet - K.camFeet;
  let top = st.ky - 50;
  if (e && st.rx > e.x0 - 300 && !(st.state === 'land')) top = Math.min(top, e.flagY - 40);
  if (top - ty < 78) ty = top - 78;
  if (feet - ty > 492) ty = feet - 492;
  if (G.introT > 0) ty += 10;
  cam.y += (ty - cam.y) * Math.min(1, dt * 3);
  if (st.ry - cam.y > H - 30) cam.y = st.ry - (H - 30);
}
function kiteFx(st, dt) {
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const q = st.parts[i];
    if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
    q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 5;
    if (q.kind === 'dust' || q.kind === 'smoke') { q.vx *= 1 - dt * 2; q.vy *= 1 - dt * 1.5; }
  }
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.3);
  for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
  for (const s of st.c.stars) if (s.got) s.t += dt;
  for (const r of st.c.rings) if (r.got) r.t += dt;
  // chimney smoke on the rooftops, sea spray, cloud wisps (only near the camera)
  st.smokeT = (st.smokeT || 0) - dt;
  if (st.smokeT <= 0) {
    st.smokeT = 0.35;
    for (const ch of st.c.chims) if (st.look === 'roofs' && ch.x > st.cam.x - 40 && ch.x < st.cam.x + W + 40 && ch.k % 2 === 0) kitePart(st, ch.x + 16, ch.y - ch.h - 6, -20 + Math.random() * 10, -30 - Math.random() * 20, 2.2, 'rgba(255,255,255,0.55)', 6 + Math.random() * 4, -4, 'smoke');
  }
  // the kite's tail bows wiggle; wind streaks near the kite while it flies fast
  if (st.state === 'run' && st.lift > 0.8 && Math.random() < dt * 5) kitePart(st, st.kx + 80 + Math.random() * 200, st.ky + (Math.random() - 0.5) * 140, -360, 0, 0.6, 'rgba(255,255,255,0.7)', 1, 0, 'streak');
}
// copy the spots into the engine players (screen px): name tags and bubbles read p.x / p.y
function kiteMirror(st) {
  const cam = st.cam, rs = kiteRiderSpot(st), S = KITE.scale;
  for (const p of G.players) {
    if (p.id === st.runner) { p.x = st.rx - cam.x - PW / 2; p.y = st.ry - cam.y - PH * S; }
    else { p.x = rs.x - cam.x - PW / 2; p.y = rs.y - cam.y - PH - (rs.onKite ? 16 : 0); }
    p.alive = true; p.grounded = true; p.stompSafe = 0; p.vy = 0; p.vx = p.id === st.runner ? st.vx : 0;
    p.face = 1; p.stun = 0;
  }
}

MODES.kite = {
  KITE,
  medals: { bronze: 'Fly the kite to the castle', goals: [{ key: 'time', gold: 210, silver: 330 }, { key: 'bumps', gold: 5, silver: 14, text: n => n + ' or fewer tangles and whoopses' }, { key: 'stars', gold: 0.4, more: true, pct: true, word: 'the stars' }] },
  medalValues() { const st = G.mst, s = st.stats; return s ? { bumps: s.tangles + s.oops, stars: st.stars / (st.starsAll || 1) } : {}; },
  compile: kiteCompile, gy: kiteGy, plan: kitePlan, onPad: kiteOnPad, base: kiteKiteBase, key: kiteKey, obsD: kiteObsD,
  setup(st, L) {
    st.stats = { tangles: 0, oops: 0, flags: 0, helps: 0, dodges: 0, roomT: [], finishT: 0 };
    st.stars = 0; st.starsRoom = 0; st.rings = 0; st.starsN = 0; st.ringsN = 0;
    // count every stretch's stars and rings up front (the HUD shows "x of all")
    const def = LEVELS[G.levelIndex];
    let sN = 0, rN = 0;
    for (const r of def.rooms || [def]) for (const t of r.course || []) {
      const s = String(t);
      if (s[0] === '*') sN += +s.split(':')[2] || 3;
      else if (s[0] === 'O' && s[1] === ':') rN++;
    }
    st.starsAll = sN + rN * 3; st.ringsAll = rN;
    kiteRoom(st, L, 0);
  },
  room(k, L) { G.mst.starsRoom = 0; kiteRoom(G.mst, L, k); },
  step(dt) { kiteStep(G.mst, dt); },
  // the engine draws the players between draw() and drawTop(): they are hidden then, and drawn by the mode instead
  draw() {
    const st = G.mst;
    if (!st.c) return;
    kiteDrawWorld(st);
    st.hid = G.players.map(p => p.alive);
    for (const p of G.players) p.alive = false;
  },
  drawTop() {
    const st = G.mst;
    if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; }
    if (!st.c) return;
    kiteDrawFront(st);
  },
  hud() { const st = G.mst; if (st.c) kiteHud(st); },
  stats() {
    const st = G.mst, s = st.stats;
    if (!s) return [];
    const all = st.starsAll || 1, frac = st.stars / all;
    const out = [
      { label: 'Stars', value: st.stars + ' of ' + all },
      { label: 'Rings', value: st.rings + ' of ' + st.ringsAll },
      { label: 'Tangles', value: String(s.tangles) },
    ];
    const words = frac >= 0.85 ? 'A sky full of stars. Super flying!' : frac >= 0.5 ? 'Up, up and away to the Sky Kingdom!' : 'You flew the kite all the way to the castle!';
    out.push(words + ' Whoopses: ' + s.oops + ', flags grabbed: ' + s.flags + ' of 4.');
    if (s.helps) out.push('Gold help: ' + s.helps + (s.helps === 1 ? ' time' : ' times') + '. Next time, try it without!');
    return out;
  },
};

/* ---------- drawing ---------- */
const KITE_LOOK = {
  roofs: { skyT: '#5ab4f2', skyB: '#fff1dc', far: '#cbd9f4', far2: '#b4c6ea' },
  hill: { skyT: '#64c0f4', skyB: '#f3fbe6', far: '#bfe3c4', far2: '#9fd3a8' },
  pier: { skyT: '#4fb0ee', skyB: '#fff4dc', far: '#9fd8ea', far2: '#6cc0dc' },
  bridge: { skyT: '#7a9cf0', skyB: '#ffe9f2', far: '#ffffff', far2: '#e9e4fb' },
};
const kiteSkyCache = {};
function kiteDrawWorld(st) {
  const cam = st.cam;
  kiteDrawSky(st);
  kiteDrawFar(st);
  ctx.save(); ctx.translate(-Math.round(cam.x * 10) / 10, -Math.round(cam.y * 10) / 10);
  kiteDrawBackThings(st);
  kiteDrawEndBack(st);
  kiteDrawGround(st);
  kiteDrawChims(st);
  kiteDrawSigns(st);
  ctx.restore();
}
function kiteDrawFront(st) {
  const cam = st.cam;
  ctx.save(); ctx.translate(-Math.round(cam.x * 10) / 10, -Math.round(cam.y * 10) / 10);
  kiteDrawSkyThings(st);
  kiteDrawPickups(st);
  kiteDrawEndFront(st);
  kiteDrawString(st);
  kiteDrawKite(st);
  kiteDrawRunner(st);
  for (const q of st.parts) {
    const a = clamp(q.life / q.max, 0, 1);
    if (q.x < cam.x - 40 || q.x > cam.x + W + 40 || q.y < cam.y - 40 || q.y > cam.y + H + 40) continue;
    ctx.globalAlpha = q.kind === 'dust' || q.kind === 'smoke' ? a * 0.8 : a; ctx.fillStyle = q.col;
    if (q.kind === 'star') { kiteStarPath(q.x, q.y, q.size * 1.8, q.size * 0.7, q.r); ctx.fill(); }
    else if (q.kind === 'conf') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillRect(-q.size, -q.size / 2, q.size * 2, q.size); ctx.restore(); }
    else if (q.kind === 'smoke' || q.kind === 'dust') { circle(q.x, q.y, q.size * (1.8 - 0.8 * a)); ctx.fill(); }
    else if (q.kind === 'streak') { ctx.strokeStyle = q.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + 40, q.y); ctx.stroke(); }
    else { circle(q.x, q.y, q.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  const big = hudBig();
  for (const q of st.pops) {
    const x = clamp(q.x - cam.x, 110, W - 110), y = clamp(q.y - cam.y - q.t * 30, 96, H - 120);
    ctx.globalAlpha = clamp((1.3 - q.t) / 0.3, 0, 1);
    bigText(q.s, x, y, q.size * (big ? 1.3 : 1), q.col, 1 + 0.25 * Math.max(0, 1 - q.t / 0.15));
    ctx.globalAlpha = 1;
  }
}
function kiteStarPath(x, y, ro, ri, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot - Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
// drawn once into a picture per size and colour, then copied (the shading costs nothing per frame)
function kiteCloud(x, y, s, col) {
  s = Math.round(s * 20) / 20; col = (col || 'rgba(255,255,255,0.9)');
  blitSprite(artSprite('kiteCloud' + s + col, 140 * s, 85 * s, (30 * s), (52 * s), c => kiteCloudPaint(c, 0, 0, s, col)), x, y);
}
function kiteCloudPaint(c, x, y, s, col) {
  const shape = (dx, dy) => {
    c.beginPath();
    c.arc(x + dx, y + dy, 22 * s, Math.PI * 0.5, Math.PI * 1.5); c.arc(x + 22 * s + dx, y - 14 * s + dy, 22 * s, Math.PI, Math.PI * 1.9);
    c.arc(x + 50 * s + dx, y - 10 * s + dy, 26 * s, Math.PI * 1.2, Math.PI * 1.95); c.arc(x + 74 * s + dx, y + dy, 20 * s, Math.PI * 1.5, Math.PI * 0.5);
    c.closePath();
  };
  // a soft blue-grey underside, the cloud, a bright top
  c.fillStyle = 'rgba(150,170,210,0.25)'; shape(2 * s, 5 * s); c.fill();
  c.fillStyle = col || 'rgba(255,255,255,0.9)'; shape(0, 0); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.6)'; circleOn(c, x + 22 * s, y - 24 * s, 9 * s); c.fill(); circleOn(c, x + 46 * s, y - 24 * s, 10 * s); c.fill();
}
// a bright morning sky, a soft sun and drifting clouds
function kiteDrawSky(st) {
  const lk = KITE_LOOK[st.look] || KITE_LOOK.roofs;
  let g = kiteSkyCache[st.look];
  if (!g) { g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, lk.skyT); g.addColorStop(0.7, lk.skyB); g.addColorStop(1, lk.skyB); kiteSkyCache[st.look] = g; }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const sx = 790 - (st.cam.x * 0.01) % 30, sy = 92;
  ctx.fillStyle = 'rgba(255,236,170,0.28)'; circle(sx, sy, 86); ctx.fill();
  ctx.fillStyle = 'rgba(255,244,200,0.6)'; circle(sx, sy, 56); ctx.fill();
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(G.clock * 0.05); ctx.fillStyle = 'rgba(255,248,210,0.3)';
  ctx.beginPath(); for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.moveTo(-5, 46); ctx.lineTo(0, 92 + (i % 2) * 16); ctx.lineTo(5, 46); ctx.closePath(); } ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fff8dc'; circle(sx, sy, 40); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; circle(sx - 9, sy - 9, 22); ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,140,0.7)'; ctx.lineWidth = 2; circle(sx, sy, 40); ctx.stroke();
  for (let k = 0; k < 7; k++) {
    const span = 1500, x = ((k * 241 - st.cam.x * (0.06 + (k % 3) * 0.03) - G.clock * (5 + k)) % span + span) % span - 200, y = 60 + (k % 4) * 46 + (hash(k, 5) % 24) - st.cam.y * 0.05;
    kiteCloud(x, y, 0.6 + (k % 3) * 0.25, 'rgba(255,255,255,' + (0.55 + (k % 2) * 0.25) + ')');
  }
}
// far scenery per stretch (slow parallax)
function kiteDrawFar(st) {
  const cam = st.cam, lk = KITE_LOOK[st.look] || KITE_LOOK.roofs, base = 360 - (cam.y + KITE.camFeet) * 0.12;
  if (st.look === 'roofs') {
    // a far town: towers and roofs in pale lilac
    for (const [par, span, col, hMin, hVar, dy] of [[0.1, 90, lk.far, 30, 50, 30], [0.22, 70, lk.far2, 20, 40, 66]]) {
      const off = cam.x * par, k0 = Math.floor((off - 100) / span), k1 = Math.floor((off + W + 100) / span);
      ctx.fillStyle = col;
      for (let k = k0; k <= k1; k++) {
        const h = hash(k, span), x = k * span - off, w = span - 6, hh = hMin + h % hVar, y = base + dy - hh;
        ctx.fillRect(x, y, w, H);
        if (h % 3 === 0) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w / 2, y - 26); ctx.lineTo(x + w, y); ctx.fill(); }
        if (h % 7 === 1) { ctx.fillRect(x + w / 2 - 6, y - 60, 12, 60); ctx.beginPath(); ctx.moveTo(x + w / 2 - 9, y - 60); ctx.lineTo(x + w / 2, y - 80); ctx.lineTo(x + w / 2 + 9, y - 60); ctx.fill(); }
        // a shaded side and rows of little windows, so the far town has depth
        ctx.fillStyle = 'rgba(60,60,120,0.08)'; ctx.fillRect(x + w - 12, y, 12, H);
        ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.beginPath(); for (let wy = y + 12; wy < y + 70; wy += 16) for (let wx = x + 8; wx < x + w - 14; wx += 14) if (hash(wx | 0, wy | 0) % 3) ctx.rect(wx, wy, 5, 7); ctx.fill();
        ctx.fillStyle = col;
      }
    }
  } else if (st.look === 'hill') {
    for (const [par, col, amp, dy] of [[0.1, lk.far, 40, -10], [0.25, lk.far2, 34, 40]]) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 16) { const wx = x + cam.x * par; ctx.lineTo(x, base + dy + Math.sin(wx * 0.006) * amp + Math.sin(wx * 0.017 + 1) * 10); }
      ctx.lineTo(W, H); ctx.fill();
    }
    // little far windmills
    const off = cam.x * 0.25, k0 = Math.floor((off - 200) / 700), k1 = Math.floor((off + W + 200) / 700);
    for (let k = k0; k <= k1; k++) {
      const x = k * 700 + 300 - off, wx = x + off, y = base + 40 + Math.sin(wx * 0.006) * 34 + Math.sin(wx * 0.017 + 1) * 10;
      ctx.fillStyle = '#8cc497'; ctx.fillRect(x - 4, y - 40, 8, 40);
      ctx.save(); ctx.translate(x, y - 42); ctx.rotate(G.clock * 0.8 + k);
      ctx.fillStyle = '#e8f6ea'; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.fillRect(-2, 0, 4, 22); }
      ctx.restore();
    }
  } else if (st.look === 'pier') {
    // the sea and its horizon, little sailboats
    const hy = base + 10;
    ctx.fillStyle = lk.far; ctx.fillRect(0, hy, W, H);
    ctx.fillStyle = lk.far2; ctx.fillRect(0, hy + 40, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let k = 0; k < 12; k++) { const x = ((k * 97 - cam.x * 0.2 + G.clock * 10) % 1100 + 1100) % 1100 - 70; ctx.moveTo(x, hy + 14 + (k % 4) * 12); ctx.lineTo(x + 30, hy + 14 + (k % 4) * 12); } ctx.stroke();
    const off = cam.x * 0.12, k0 = Math.floor((off - 200) / 520), k1 = Math.floor((off + W + 200) / 520);
    for (let k = k0; k <= k1; k++) {
      const x = k * 520 + 200 - off + Math.sin(G.clock * 0.3 + k) * 10, y = hy + 6;
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y - 34); ctx.lineTo(x + 18, y - 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = k % 2 ? '#ff8f7a' : '#ffd36b'; ctx.beginPath(); ctx.moveTo(x - 2, y - 30); ctx.lineTo(x - 14, y - 6); ctx.lineTo(x - 2, y - 6); ctx.fill();
      ctx.fillStyle = '#7a5a8c'; ctx.fillRect(x - 14, y - 4, 32, 5);
    }
  } else {
    // the bridge: a sea of clouds below, floating islands, the Sky Kingdom castle far away (it comes closer)
    const e = st.c.end, prog = e ? clamp((cam.x + W / 2) / e.x0, 0, 1) : 1;
    const cx = W * 0.72 - prog * 120, cy = 250 - prog * 40, s = 0.55 + prog * 0.5;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.globalAlpha = 0.85;
    kiteCastle(0, 0, 0.7, true);
    ctx.restore(); ctx.globalAlpha = 1;
    const off = cam.x * 0.15, k0 = Math.floor((off - 300) / 800), k1 = Math.floor((off + W + 300) / 800);
    for (let k = k0; k <= k1; k++) {
      const x = k * 800 + 150 - off, y = 200 + (hash(k, 3) % 80) + Math.sin(G.clock * 0.5 + k) * 6;
      ctx.fillStyle = '#c9b8e8'; ctx.beginPath(); ctx.moveTo(x - 50, y); ctx.lineTo(x + 50, y); ctx.lineTo(x + 10, y + 40); ctx.lineTo(x - 14, y + 34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#9fe0a0'; rr(x - 54, y - 8, 108, 12, 6); ctx.fill();
      ctx.fillStyle = '#6fbf7a'; circle(x - 20, y - 16, 10); ctx.fill(); circle(x - 6, y - 20, 12); ctx.fill();
    }
    for (const [par, col, dy] of [[0.15, lk.far2, 0], [0.3, lk.far, 50]]) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) { const wx = x + cam.x * par; ctx.lineTo(x, base + 30 + dy + Math.sin(wx * 0.02) * 10 + Math.sin(wx * 0.047) * 7); }
      ctx.lineTo(W, H); ctx.fill();
    }
  }
}
// things that stand behind the ground: trees, church spires, masts, the windmill, power line poles
function kiteDrawBackThings(st) {
  const cam = st.cam, x0 = cam.x - 200, x1 = cam.x + W + 200, t = st.roomT;
  for (const o of st.c.obs) {
    if (o.x1 < x0 || o.x0 > x1) continue;
    const gold = st.c.groups[o.group].gold;
    if (o.kind === 'tree') {
      const cy = o.top + 56;
      ctx.fillStyle = '#8a5a36'; ctx.fillRect(o.tx - 9, cy + 20, 18, o.gy - cy - 20 + 60);
      ctx.fillStyle = '#6a4224'; ctx.fillRect(o.tx + 3, cy + 20, 6, o.gy - cy - 20 + 60);
      const cols = st.look === 'hill' ? ['#5fb46a', '#7fcf7c', '#4a9e5a'] : ['#6cc07a', '#8fd88a', '#56aa66'];
      ctx.fillStyle = cols[2]; circle(o.tx - 34, cy + 26, 40); ctx.fill(); circle(o.tx + 34, cy + 26, 40); ctx.fill();
      ctx.fillStyle = cols[0]; circle(o.tx, cy, 56); ctx.fill();
      ctx.fillStyle = cols[1]; circle(o.tx - 18, cy - 18, 26); ctx.fill();
      if (hash(o.tx | 0, 3) % 2) { ctx.fillStyle = '#ff8fa8'; for (let i = 0; i < 5; i++) { circle(o.tx - 30 + i * 15, cy - 10 + (i % 2) * 22, 4); ctx.fill(); } }
      if (gold) kiteGoldGlow(o.tx, cy, 70);
    } else if (o.kind === 'spire') {
      const by = o.top + 120;
      ctx.fillStyle = '#f2e6d0'; ctx.strokeStyle = '#b39a7a'; ctx.lineWidth = 2;
      ctx.fillRect(o.tx - 34, by, 68, o.gy - by + 80); ctx.strokeRect(o.tx - 34, by, 68, o.gy - by + 80);
      ctx.fillStyle = '#7a8fd8'; ctx.beginPath(); ctx.moveTo(o.tx, o.top); ctx.lineTo(o.tx + 30, by + 2); ctx.lineTo(o.tx - 30, by + 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.moveTo(o.tx, o.top); ctx.lineTo(o.tx - 4, by); ctx.lineTo(o.tx - 28, by); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.gold; circle(o.tx, o.top - 4, 5); ctx.fill();
      ctx.fillStyle = '#5a6ab8'; rr(o.tx - 10, by + 22, 20, 28, 10); ctx.fill();
      ctx.fillStyle = '#ffd36b'; circle(o.tx, by + 70, 12); ctx.fill(); ctx.strokeStyle = '#8a6a3a'; circle(o.tx, by + 70, 12); ctx.stroke();
      if (gold) kiteGoldGlow(o.tx, o.top + 40, 60);
    } else if (o.kind === 'mast') {
      ctx.strokeStyle = '#8a5a36'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(o.tx, o.gy + 40); ctx.lineTo(o.tx, o.top); ctx.stroke();
      ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(o.tx - 40, o.top + 36); ctx.lineTo(o.tx + 40, o.top + 36); ctx.stroke();
      ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.moveTo(o.tx - 36, o.top + 40); ctx.quadraticCurveTo(o.tx - 6 + Math.sin(t * 2) * 4, o.top + 100, o.tx - 30, o.top + 150); ctx.lineTo(o.tx + 30, o.top + 150); ctx.quadraticCurveTo(o.tx + 44 + Math.sin(t * 2) * 4, o.top + 100, o.tx + 36, o.top + 40); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#d6cbe8'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ff6b8a'; ctx.beginPath(); ctx.moveTo(o.tx, o.top); ctx.lineTo(o.tx + 26 + Math.sin(t * 6) * 3, o.top + 6); ctx.lineTo(o.tx, o.top + 13); ctx.closePath(); ctx.fill();
      // the boat under it (in the water beside the pier)
      ctx.fillStyle = '#ff9a6a'; ctx.beginPath(); ctx.moveTo(o.tx - 80, o.gy + 30); ctx.lineTo(o.tx + 80, o.gy + 30); ctx.lineTo(o.tx + 60, o.gy + 64); ctx.lineTo(o.tx - 60, o.gy + 64); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(o.tx - 72, o.gy + 38, 144, 5);
      if (gold) kiteGoldGlow(o.tx, o.top + 30, 60);
    } else if (o.kind === 'mill') {
      ctx.fillStyle = '#f6ead2'; ctx.strokeStyle = '#b8a07a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(o.tx - 18, o.hy + 6); ctx.lineTo(o.tx + 18, o.hy + 6); ctx.lineTo(o.tx + 34, o.gy + 30); ctx.lineTo(o.tx - 34, o.gy + 30); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c96a4a'; ctx.beginPath(); ctx.moveTo(o.tx - 24, o.hy + 8); ctx.lineTo(o.tx, o.hy - 20); ctx.lineTo(o.tx + 24, o.hy + 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a5a36'; rr(o.tx - 9, o.gy - 30, 18, 30, 8); ctx.fill();
      ctx.fillStyle = '#9fd0f0'; circle(o.tx, o.hy + 50, 7); ctx.fill();
    } else if ((o.kind === 'wire' || o.kind === 'wash') && st.look !== 'pier') {
      for (const px of [o.x0, o.x1]) {
        const gy = kiteBy(st, px) || o.gy;
        ctx.fillStyle = o.kind === 'wire' ? '#8a6a4a' : '#b0a0c8'; ctx.fillRect(px - 3, kiteWireY(o, px) - 6, 6, gy - kiteWireY(o, px) + 6);
        if (o.kind === 'wire') { ctx.fillRect(px - 14, kiteWireY(o, px) - 4, 28, 4); }
      }
    }
  }
}
function kiteGoldGlow(x, y, r) {
  const a = 0.25 + 0.15 * Math.sin(G.clock * 6);
  ctx.fillStyle = 'rgba(255,197,61,' + a.toFixed(3) + ')'; circle(x, y, r); ctx.fill();
}
// the ground: roofs, the green hill, the pier, the sky bridge
function kiteDrawGround(st) {
  const cam = st.cam, x0 = Math.floor((cam.x - 40) / KITE_STEP) * KITE_STEP, x1 = cam.x + W + 40, yB = cam.y + H + 20;
  const look = st.look;
  // the gaps below first (awnings, water, lily pads, clouds)
  if (look === 'pier') {
    // the sea under the pier
    const wy = Math.min(...st.c.secs.filter(s => s.x1 > x0 && s.x0 < x1).map(s => s.y)) + 110;
    ctx.fillStyle = '#5cc0e0'; ctx.fillRect(cam.x - 40, wy, W + 80, yB - wy + 40);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let x = Math.floor((cam.x - 40) / 40) * 40; x < x1; x += 40) { ctx.beginPath(); ctx.ellipse(x + Math.sin(G.clock * 2 + x * 0.05) * 6, wy + 2, 14, 3, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  for (const g of st.c.gaps) {
    if (g.x1 < x0 - 100 || g.x0 > x1 + 100) continue;
    const mx = (g.x0 + g.x1) / 2, by = g.y + kiteBounceY(st), w = g.x1 - g.x0, bo = st.oops && st.oops.gap === g && st.oops.t > 0.25 && st.oops.t < 0.55 ? 6 : 0;
    if (look === 'roofs') {
      ctx.fillStyle = '#7a6ea8'; ctx.fillRect(g.x0, g.y, w, yB - g.y);
      ctx.fillStyle = '#5e548a'; ctx.fillRect(g.x0, g.y + 140, w, yB);
      for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#ffffff' : '#ff6b6b'; ctx.beginPath(); ctx.moveTo(g.x0 - 4 + k * (w + 8) / 6, by + bo); ctx.lineTo(g.x0 - 4 + (k + 1) * (w + 8) / 6, by + bo); ctx.lineTo(g.x0 - 4 + (k + 1) * (w + 8) / 6, by + 16 + bo); ctx.lineTo(g.x0 - 4 + k * (w + 8) / 6, by + 16 + bo); ctx.fill(); }
      ctx.fillStyle = '#ff6b6b'; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(g.x0 - 4 + (k + 0.5) * (w + 8) / 6, by + 16 + bo, (w + 8) / 12, 0, Math.PI); ctx.fill(); }
    } else if (look === 'hill') {
      ctx.fillStyle = '#6fa85c'; ctx.fillRect(g.x0, g.y, w, yB - g.y);
      ctx.fillStyle = '#6cc6ea'; ctx.fillRect(g.x0, g.y + 50, w, yB);
      ctx.fillStyle = '#5fbf6a'; ctx.beginPath(); ctx.ellipse(mx, by + 6 + bo, w * 0.32, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff9ac8'; circle(mx + w * 0.18, by + 2 + bo, 5); ctx.fill();
    } else if (look === 'pier') {
      ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.ellipse(mx, by + bo, 26, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; for (const a of [0.3, 1.9, 3.5, 5.1]) { ctx.beginPath(); ctx.ellipse(mx + Math.cos(a) * 20, by + bo + Math.sin(a) * 7, 6, 4, a, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#5cc0e0'; ctx.beginPath(); ctx.ellipse(mx, by + bo, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      kiteCloud(mx - 46, by + 18 + bo, 0.7, '#ffffff');
      ctx.fillStyle = 'rgba(255,214,240,0.6)'; ctx.beginPath(); ctx.ellipse(mx, by + 26 + bo, 40, 6, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (g.gold) {
      ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 2;
      rr(g.x0 - 12, g.y - 2, w + 24, 10, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(g.x0 - 8, g.y, w + 16, 2);
    }
  }
  // solid runs of ground (between gaps)
  const runs = [];
  let a = null;
  for (let x = x0; x <= x1; x += KITE_STEP) {
    const v = kiteBy(st, x), gp = v !== v || (kiteGapAt(st, x) && !kiteGapAt(st, x).gold && x > kiteGapAt(st, x).x0 && x < kiteGapAt(st, x).x1);
    if (!gp) { if (!a) a = { x0: x, pts: [] }; a.pts.push([x, v]); }
    else if (a) { runs.push(a); a = null; }
  }
  if (a) runs.push(a);
  for (const r of runs) {
    if (look === 'roofs') kiteDrawRoofRun(st, r, yB);
    else if (look === 'hill') kiteDrawHillRun(st, r, yB);
    else if (look === 'pier') kiteDrawPierRun(st, r, yB);
    else kiteDrawBridgeRun(st, r, yB);
  }
}
function kiteRunPath(r, yB) {
  ctx.beginPath(); ctx.moveTo(r.pts[0][0], yB);
  for (const [x, y] of r.pts) ctx.lineTo(x, y);
  ctx.lineTo(r.pts[r.pts.length - 1][0] + KITE_STEP * 0.5, yB); ctx.closePath();
}
const KITE_HOUSE = ['#f6c6a8', '#ffe0a0', '#c6dcf6', '#d8c8f0', '#f6cad8', '#c8ecd6'];
function kiteDrawRoofRun(st, r, yB) {
  const xa = r.pts[0][0], xb = r.pts[r.pts.length - 1][0] + KITE_STEP;
  for (const s of st.c.secs) {
    if (s.x1 <= xa || s.x0 >= xb) continue;
    const sx0 = Math.max(s.x0, xa), sx1 = Math.min(s.x1, xb);
    // split long roofs into houses
    for (let hx = Math.floor(s.x0 / 220) * 220; hx < s.x1; hx += 220) {
      const ha = Math.max(hx, sx0), hb = Math.min(hx + 220, sx1);
      if (hb <= ha) continue;
      const h = hash(Math.floor(hx / 220), 17);
      ctx.fillStyle = KITE_HOUSE[h % KITE_HOUSE.length]; ctx.fillRect(ha, s.y + 10, hb - ha + 0.5, yB - s.y);
      ctx.fillStyle = 'rgba(28,26,54,0.08)'; ctx.fillRect(ha, s.y + 10, 3, yB - s.y);
      // soft shade under the eaves, faint brick courses and a lit corner
      ctx.fillStyle = 'rgba(28,26,54,0.1)'; ctx.fillRect(ha, s.y + 12, hb - ha + 0.5, 8);
      ctx.strokeStyle = 'rgba(28,26,54,0.05)'; ctx.lineWidth = 1; ctx.beginPath(); for (let by = s.y + 28; by < yB; by += 14) { ctx.moveTo(ha, by); ctx.lineTo(hb, by); } ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; if (hx + 220 <= sx1) ctx.fillRect(hb - 4, s.y + 10, 4, yB - s.y);
      // windows
      for (let wx = hx + 26; wx < hx + 200; wx += 52) {
        if (wx + 26 < ha || wx > hb) continue;
        for (let wy = s.y + 34; wy < yB; wy += 58) {
          ctx.fillStyle = '#ffffff'; rr(wx, wy, 26, 30, 5); ctx.fill();
          ctx.fillStyle = (hash(wx | 0, wy | 0) % 5) ? '#9fd0f0' : '#ffe9a8'; rr(wx + 3, wy + 3, 20, 24, 3); ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.fillRect(wx + 12, wy + 3, 2, 24); ctx.fillRect(wx + 3, wy + 14, 20, 2);
          if (hash(wx | 0, (wy | 0) + 1) % 3 === 0) { ctx.fillStyle = '#ff8fa8'; ctx.fillRect(wx - 2, wy + 28, 30, 5); ctx.fillStyle = '#7fcf7c'; circle(wx + 6, wy + 27, 3); ctx.fill(); circle(wx + 18, wy + 27, 3); ctx.fill(); }
        }
      }
      // a glint on every pane, all in one fill
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath();
      for (let wx = hx + 26; wx < hx + 200; wx += 52) {
        if (wx + 26 < ha || wx > hb) continue;
        for (let wy = s.y + 34; wy < yB; wy += 58) { ctx.moveTo(wx + 4, wy + 26); ctx.lineTo(wx + 12, wy + 4); ctx.lineTo(wx + 17, wy + 4); ctx.lineTo(wx + 9, wy + 26); ctx.closePath(); }
      }
      ctx.fill();
      // a thin frame line round every window, all in one stroke
      ctx.strokeStyle = 'rgba(28,26,54,0.18)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let wx = hx + 26; wx < hx + 200; wx += 52) {
        if (wx + 26 < ha || wx > hb) continue;
        for (let wy = s.y + 34; wy < yB; wy += 58) ctx.roundRect(wx, wy, 26, 30, 5);
      }
      ctx.stroke();
    }
    // the roof top: tiles and a white edge
    ctx.fillStyle = '#c96a5a'; ctx.fillRect(sx0, s.y, sx1 - sx0 + 0.5, 12);
    ctx.fillStyle = '#e88a6e'; ctx.fillRect(sx0, s.y, sx1 - sx0 + 0.5, 4);
    ctx.fillStyle = 'rgba(120,50,40,0.35)'; for (let x = Math.ceil(sx0 / 14) * 14; x < sx1; x += 14) ctx.fillRect(x, s.y + 4, 2, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(sx0, s.y, sx1 - sx0 + 0.5, 1.5);
    ctx.fillStyle = 'rgba(100,40,30,0.4)'; ctx.fillRect(sx0, s.y + 10, sx1 - sx0 + 0.5, 2);
  }
}
function kiteDrawHillRun(st, r, yB) {
  kiteRunPath(r, yB);
  ctx.fillStyle = '#8fd46e'; ctx.fill();
  // softer bands of green deeper down (they follow the hill)
  for (const [dy, col] of [[34, '#80c862'], [80, '#74bb58']]) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(r.pts[0][0], yB);
    for (const [x, y] of r.pts) ctx.lineTo(x, y + dy + Math.sin(x * 0.02) * 6);
    ctx.lineTo(r.pts[r.pts.length - 1][0] + KITE_STEP * 0.5, yB); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = '#5fae4e'; ctx.lineWidth = 6; ctx.beginPath();
  r.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 2) : ctx.moveTo(x, y + 2))); ctx.stroke();
  // flowers and tufts
  for (const [x, y] of r.pts) {
    if ((x | 0) % 34 !== 0) continue;
    const h = hash(x | 0, 9);
    if (h % 3 === 0) { ctx.fillStyle = ['#ffffff', '#ffd36b', '#ff9ac8'][h % 3 === 0 ? (h >> 3) % 3 : 0]; circle(x, y + 12 + h % 20, 3.2); ctx.fill(); }
    else if (h % 3 === 1) { ctx.strokeStyle = '#5fae4e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x - 3, y - 6); ctx.moveTo(x + 4, y + 2); ctx.lineTo(x + 6, y - 5); ctx.stroke(); }
  }
}
function kiteDrawPierRun(st, r, yB) {
  const xa = r.pts[0][0], xb = r.pts[r.pts.length - 1][0] + KITE_STEP;
  // posts down into the water
  for (let x = Math.ceil(xa / 64) * 64 + 10; x < xb - 6; x += 64) {
    const y = kiteBy(st, x);
    ctx.fillStyle = '#8a5a36'; ctx.fillRect(x - 6, y + 12, 12, 160);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x - 6, y + 12, 3, 160);
  }
  // the deck: planks
  ctx.fillStyle = '#c98e57';
  ctx.beginPath(); r.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); for (let i = r.pts.length - 1; i >= 0; i--) ctx.lineTo(r.pts[i][0], r.pts[i][1] + 14); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e0aa70'; for (const [x, y] of r.pts) if ((x | 0) % 2 === 0) ctx.fillRect(x, y, KITE_STEP, 4);
  ctx.fillStyle = '#7d5030'; for (let x = Math.ceil(xa / 24) * 24; x < xb; x += 24) { const y = kiteBy(st, x); ctx.fillRect(x, y + 2, 2, 12); }
  // a railing at the back
  ctx.strokeStyle = '#f6efdf'; ctx.lineWidth = 3;
  ctx.beginPath(); r.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y - 30) : ctx.moveTo(x, y - 30))); ctx.stroke();
  for (let x = Math.ceil(xa / 48) * 48; x < xb; x += 48) { const y = kiteBy(st, x); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 30); ctx.stroke(); }
}
function kiteDrawBridgeRun(st, r, yB) {
  const xa = r.pts[0][0], xb = r.pts[r.pts.length - 1][0] + KITE_STEP;
  // arches under the bridge, fading into the clouds
  for (let x = Math.floor(xa / 180) * 180; x < xb; x += 180) {
    const y = kiteBy(st, clamp(x + 90, xa, xb - 2));
    ctx.fillStyle = '#d8d2f2'; ctx.fillRect(Math.max(x, xa), y + 14, Math.min(26, xb - x), 150);
    ctx.fillStyle = 'rgba(216,210,242,0.85)'; ctx.beginPath(); ctx.moveTo(Math.max(x, xa), y + 14); ctx.lineTo(Math.min(x + 180, xb), y + 14); ctx.lineTo(Math.min(x + 180, xb), y + 40);
    ctx.quadraticCurveTo(x + 90, y + 120, Math.max(x, xa), y + 40); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#a29fd6';
  ctx.beginPath(); r.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); for (let i = r.pts.length - 1; i >= 0; i--) ctx.lineTo(r.pts[i][0], r.pts[i][1] + 16); ctx.closePath(); ctx.fill();
  // a rainbow stripe along the top
  const cols = ['#ff8f8f', '#ffd36b', '#8fe3b0', '#8fc4ff'];
  cols.forEach((col, k) => { ctx.fillStyle = col; for (const [x, y] of r.pts) ctx.fillRect(x, y + k * 2, KITE_STEP + 0.3, 2); });
  ctx.fillStyle = '#ffffff';
  for (let x = Math.ceil(xa / 60) * 60; x < xb; x += 60) { const y = kiteBy(st, x); rr(x - 4, y - 26, 8, 26, 3); ctx.fill(); ctx.fillStyle = C.gold; circle(x, y - 28, 4); ctx.fill(); ctx.fillStyle = '#ffffff'; }
  // fluffy clouds hugging the bridge
  for (let x = Math.floor(xa / 150) * 150; x < xb; x += 150) { const y = kiteBy(st, clamp(x, xa, xb - 2)); kiteCloud(x - 30, y + 60 + (hash(x | 0, 2) % 30), 0.8, 'rgba(255,255,255,0.92)'); }
}
// chimneys (roofs), hay bales and fences (hill), crates (pier), cloud lumps (bridge)
function kiteDrawChims(st) {
  const cam = st.cam;
  for (const ch of st.c.chims) {
    if (ch.x + ch.w < cam.x - 20 || ch.x > cam.x + W + 20) continue;
    const x = ch.x, y = ch.y - ch.h, w = ch.w, hh = ch.h;
    if (st.look === 'roofs') {
      ctx.fillStyle = '#c0583e'; ctx.fillRect(x, y + 4, w, hh);
      ctx.fillStyle = '#d97a5e'; for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) ctx.fillRect(x + 1 + k * 11 + (r % 2) * 5, y + 8 + r * 9, 9, 6);
      ctx.fillStyle = '#5a4a6a'; ctx.fillRect(x - 4, y, w + 8, 7);
    } else if (st.look === 'hill') {
      if (ch.k % 2) {
        ctx.fillStyle = '#f2d06a'; rr(x - 4, y + 4, w + 8, hh, 10); ctx.fill();
        ctx.strokeStyle = '#c9a040'; ctx.lineWidth = 2; ctx.beginPath(); for (let k = 1; k < 4; k++) { ctx.moveTo(x - 2, y + 4 + k * hh / 4); ctx.lineTo(x + w + 2, y + 4 + k * hh / 4); } ctx.stroke();
      } else {
        ctx.fillStyle = '#fff6e6'; ctx.strokeStyle = '#b8a07a'; ctx.lineWidth = 1.5;
        for (const fx of [x + 2, x + w - 8]) { ctx.fillRect(fx, y, 6, hh + 2); ctx.strokeRect(fx, y, 6, hh + 2); }
        ctx.fillRect(x - 10, y + 8, w + 20, 6); ctx.strokeRect(x - 10, y + 8, w + 20, 6); ctx.fillRect(x - 10, y + 24, w + 20, 6); ctx.strokeRect(x - 10, y + 24, w + 20, 6);
      }
    } else if (st.look === 'pier') {
      ctx.fillStyle = '#b77a45'; ctx.strokeStyle = '#704622'; ctx.lineWidth = 2;
      ctx.fillRect(x - 2, y + 2, w + 4, hh); ctx.strokeRect(x - 2, y + 2, w + 4, hh);
      ctx.beginPath(); ctx.moveTo(x - 2, y + 2); ctx.lineTo(x + w + 2, y + hh + 2); ctx.moveTo(x + w + 2, y + 2); ctx.lineTo(x - 2, y + hh + 2); ctx.stroke();
      ctx.fillStyle = '#ff6b6b'; circle(x + w / 2, y - 6, 8); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + w / 2 - 8, y - 7, 16, 2);
    } else {
      kiteCloud(x - 14, y + hh - 4, 0.6, '#ffffff');
      ctx.fillStyle = '#ffffff'; rr(x - 6, y + 4, w + 12, hh - 2, 14); ctx.fill();
      ctx.fillStyle = 'rgba(200,190,240,0.5)'; ctx.fillRect(x - 4, y + hh - 4, w + 8, 4);
    }
  }
}
function kiteDrawSigns(st) {
  const cam = st.cam;
  for (const s of st.c.signs) {
    if (s.x < cam.x - 400 || s.x > cam.x + W + 400) continue;
    const y = kiteBy(st, s.x);
    ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(s.text).width + 22;
    ctx.fillStyle = '#8a5a36'; ctx.fillRect(s.x - 3, y - 58, 6, 58);
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#8a6a8c'; ctx.lineWidth = 2.5; rr(s.x - w / 2, y - 88, w, 32, 9); ctx.fill(); ctx.stroke();
    text(s.text, s.x, y - 71.5, 15, C.ink, 'center', 'body');
  }
}
// sky things in front: power lines, washing lines and bunting, birds, balloons, cloud arches, the windmill sails
function kiteDrawSkyThings(st) {
  const cam = st.cam, x0 = cam.x - 200, x1 = cam.x + W + 200, t = st.roomT;
  for (const o of st.c.obs) {
    if (o.x1 < x0 || o.x0 > x1) continue;
    const gold = st.c.groups[o.group].gold;
    if (o.kind === 'wire' || o.kind === 'wash') {
      if (st.look === 'pier') for (const px of [o.x0, o.x1]) { ctx.fillStyle = '#f6efdf'; ctx.fillRect(px - 3, kiteWireY(o, px) - 4, 6, kiteBy(st, px) - kiteWireY(o, px) + 4); ctx.fillStyle = '#ff6b6b'; circle(px, kiteWireY(o, px) - 6, 5); ctx.fill(); }
      ctx.strokeStyle = o.kind === 'wire' ? '#4a3a5a' : '#8a7a9a'; ctx.lineWidth = o.kind === 'wire' ? 3 : 2;
      ctx.beginPath(); for (let k = 0; k <= 12; k++) { const x = kiteLerp(o.x0, o.x1, k / 12), y = kiteWireY(o, x); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
      if (o.kind === 'wire') {
        // a few little birds perch on the power line
        for (let k = 1; k < 4; k += 2) { const x = kiteLerp(o.x0, o.x1, k / 4), y = kiteWireY(o, x); ctx.fillStyle = '#8a7ab8'; ctx.beginPath(); ctx.ellipse(x, y - 7, 7, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.moveTo(x + 6, y - 8); ctx.lineTo(x + 11, y - 7); ctx.lineTo(x + 6, y - 5); ctx.fill(); ctx.fillStyle = C.ink; circle(x + 3, y - 9, 1.3); ctx.fill(); }
      } else {
        // socks and shirts (or pier bunting): hanging below the line
        const n = Math.max(3, Math.round((o.x1 - o.x0) / 40));
        for (let k = 0; k < n; k++) {
          const x = kiteLerp(o.x0, o.x1, (k + 0.5) / n), y = kiteWireY(o, x), sw = Math.sin(t * 3 + k) * 0.08;
          ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
          if (st.look === 'pier' || st.look === 'bridge') { ctx.fillStyle = ['#ff6b6b', '#ffd36b', '#5b95ff', '#8fe3b0'][k % 4]; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.lineTo(0, 30); ctx.closePath(); ctx.fill(); }
          else if (k % 3 === 0) { ctx.fillStyle = '#ff9a8a'; ctx.fillRect(-12, 0, 24, 8); ctx.fillRect(-12, 0, 8, 26); ctx.fillRect(4, 0, 8, 26); ctx.fillRect(-8, 0, 16, 34); }
          else if (k % 3 === 1) { ctx.fillStyle = '#9fd0f0'; ctx.fillRect(-5, 0, 10, 26); ctx.fillRect(-5, 20, 16, 9); ctx.fillStyle = '#ffffff'; ctx.fillRect(-5, 0, 10, 5); }
          else { ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.lineTo(10, 36); ctx.lineTo(-10, 36); ctx.closePath(); ctx.fill(); }
          ctx.fillStyle = '#b8a07a'; ctx.fillRect(-2, -2, 4, 5);
          ctx.restore();
        }
      }
      if (gold) { ctx.strokeStyle = 'rgba(255,197,61,0.5)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(o.x0, kiteWireY(o, o.x0)); ctx.quadraticCurveTo((o.x0 + o.x1) / 2, o.yw + o.sag * 2, o.x1, kiteWireY(o, o.x1)); ctx.stroke(); }
    } else if (o.kind === 'birds') {
      for (const b of kiteBirdsXY(o, t)) kiteBird(b.x, b.y, t * 9 + b.i * 2, st.look === 'pier' ? 'gull' : st.look === 'bridge' ? 'dove' : 'bird', gold);
    } else if (o.kind === 'balloon') {
      const cy = kiteBalloonY(o, t);
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(o.tx - 14, cy + 22); ctx.lineTo(o.tx - 8, cy + 42); ctx.moveTo(o.tx + 14, cy + 22); ctx.lineTo(o.tx + 8, cy + 42); ctx.stroke();
      ctx.fillStyle = '#c98e57'; rr(o.tx - 10, cy + 40, 20, 15, 3); ctx.fill();
      const cols = (hash(o.tx | 0, 7) % 2) ? ['#ff8f8f', '#ffffff'] : ['#8fc4ff', '#ffd36b'];
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = cols[k % 2]; ctx.beginPath();
        ctx.ellipse(o.tx, cy, 32 * (1 - k * 0.2), 32, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(28,26,54,0.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(o.tx, cy, 32, 32, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(o.tx - 12, cy - 12, 7, 11, -0.4, 0, Math.PI * 2); ctx.fill();
      if (gold) kiteGoldGlow(o.tx, cy, 44);
    } else if (o.kind === 'arch') {
      // a big fluffy cloud arch: fly under it
      const by = o.bot, w = o.x1 - o.x0;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(o.x0 + 10, by - 300, w - 20, 270);
      for (let x = o.x0; x <= o.x1; x += 36) { circle(x + 6, by - 22, 26); ctx.fill(); }
      for (let x = o.x0 - 20; x <= o.x1 + 20; x += 50) { circle(x, by - 120 - (hash(x | 0, 4) % 40), 50); ctx.fill(); }
      ctx.fillStyle = 'rgba(200,190,240,0.55)'; for (let x = o.x0; x <= o.x1; x += 36) { ctx.beginPath(); ctx.ellipse(x + 6, by - 4, 20, 5, 0, 0, Math.PI * 2); ctx.fill(); }
      // a sleepy smiley face
      const fx = (o.x0 + o.x1) / 2, fy = by - 70;
      ctx.strokeStyle = '#8a7ab8'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(fx - 22, fy, 7, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.beginPath(); ctx.arc(fx + 22, fy, 7, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(fx, fy + 14, 10, 0.3, Math.PI - 0.3); ctx.stroke();
      ctx.fillStyle = 'rgba(255,143,168,0.5)'; circle(fx - 36, fy + 12, 7); ctx.fill(); circle(fx + 36, fy + 12, 7); ctx.fill();
      if (gold) { ctx.fillStyle = 'rgba(255,197,61,0.25)'; ctx.fillRect(o.x0, by - 10, w, 12); }
    } else if (o.kind === 'mill') {
      ctx.save(); ctx.translate(o.tx, o.hy); ctx.rotate(kiteMillA(o, t));
      for (let k = 0; k < 4; k++) {
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#8a5a36'; ctx.fillRect(0, -3, 96, 6);
        ctx.fillStyle = gold ? '#ffe7a8' : '#fffaf0'; ctx.strokeStyle = '#b8a07a'; ctx.lineWidth = 1.5;
        ctx.fillRect(20, 3, 74, 16); ctx.strokeRect(20, 3, 74, 16);
        ctx.beginPath(); for (let q = 30; q < 94; q += 12) { ctx.moveTo(q, 3); ctx.lineTo(q, 19); } ctx.stroke();
      }
      ctx.fillStyle = '#5a4a6a'; circle(0, 0, 8); ctx.fill();
      ctx.restore();
    }
  }
  // gust zones: soft white wind swirls with arrows
  for (const w of st.c.winds) {
    if (w.x1 < x0 || w.x0 > x1) continue;
    const midY = st.ky;
    for (let k = 0; k < 6; k++) {
      const x = w.x0 + ((k * 137 + t * 120) % (w.x1 - w.x0)), y = midY - 120 + k * 46 + Math.sin(t * 2 + k) * 10;
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 30, y + w.dir * 12); ctx.quadraticCurveTo(x, y, x + 20, y - w.dir * 14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 20, y - w.dir * 14); ctx.lineTo(x + 10, y - w.dir * 14); ctx.moveTo(x + 20, y - w.dir * 14); ctx.lineTo(x + 18, y - w.dir * 4); ctx.stroke();
    }
  }
}
function kiteBird(x, y, ph, kind, gold) {
  const flap = Math.sin(ph) * 9;
  const body = kind === 'gull' ? '#ffffff' : kind === 'dove' ? '#fff6fb' : '#9a8ad0', wing = kind === 'gull' ? '#c9d4e4' : kind === 'dove' ? '#f2d6e6' : '#7a6ab8';
  if (gold) kiteGoldGlow(x, y, 20);
  ctx.fillStyle = wing; ctx.beginPath(); ctx.moveTo(x - 2, y - 2); ctx.quadraticCurveTo(x - 10, y - 12 - flap, x - 20, y - 6 - flap); ctx.quadraticCurveTo(x - 10, y, x - 2, y + 2); ctx.fill();
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(x, y, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(28,26,54,0.2)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = body; circle(x - 10, y - 4, 6); ctx.fill();
  ctx.fillStyle = wing; ctx.beginPath(); ctx.moveTo(x + 2, y - 2); ctx.quadraticCurveTo(x + 8, y - 12 + flap, x + 18, y - 8 + flap); ctx.quadraticCurveTo(x + 10, y + 1, x + 2, y + 2); ctx.fill();
  ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(x - 15, y - 5); ctx.lineTo(x - 21, y - 3); ctx.lineTo(x - 15, y - 1); ctx.fill();
  ctx.fillStyle = C.ink; circle(x - 11, y - 6, 1.6); ctx.fill();
}
// stars and ring gates
function kiteDrawPickups(st) {
  const cam = st.cam, t = G.clock;
  for (const s of st.c.stars) {
    if (s.x < cam.x - 40 || s.x > cam.x + W + 40) continue;
    if (s.got) { if (s.t < 0.4) { ctx.globalAlpha = 1 - s.t / 0.4; ctx.fillStyle = C.gold; kiteStarPath(s.x, s.y - s.t * 60, 14 + s.t * 20, 6 + s.t * 8, 0); ctx.fill(); ctx.globalAlpha = 1; } continue; }
    const bob = Math.sin(t * 3 + s.x * 0.03) * 3;
    ctx.fillStyle = 'rgba(255,230,140,0.35)'; circle(s.x, s.y + bob, 17); ctx.fill();
    ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 2;
    kiteStarPath(s.x, s.y + bob, 13, 5.5, Math.sin(t * 2 + s.x) * 0.15); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(s.x - 3, s.y + bob - 3, 2.2); ctx.fill();
  }
  for (const r of st.c.rings) {
    if (r.x < cam.x - 60 || r.x > cam.x + W + 60) continue;
    const s = r.got ? 1 + Math.min(r.t, 0.4) : 1;
    ctx.globalAlpha = r.got ? clamp(1 - r.t / 0.6, 0, 1) : r.missed ? 0.45 : 1;
    ctx.lineWidth = 7; ctx.strokeStyle = r.got ? C.gold : '#ff8fc7';
    ctx.beginPath(); ctx.ellipse(r.x, r.y, 12 * s, (KITE.ringR + 6) * s, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(r.x, r.y, 12 * s, (KITE.ringR + 6) * s, 0, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
// the end tower behind the ground; the pad and the fence in front
function kiteDrawEndBack(st) {
  const e = st.c.end;
  if (!e || e.x0 > st.cam.x + W + 400 || e.fence < st.cam.x - 600) return;
  const x = e.towerX, y = e.y, topY = e.flagY + 40;
  if (st.look === 'roofs') {
    ctx.fillStyle = '#e8c8a8'; ctx.strokeStyle = '#a07a5a'; ctx.lineWidth = 2;
    ctx.fillRect(x - 44, topY + 60, 88, y - topY - 60 + 40); ctx.strokeRect(x - 44, topY + 60, 88, y - topY - 60 + 40);
    ctx.fillStyle = '#c96a5a'; ctx.beginPath(); ctx.moveTo(x - 54, topY + 62); ctx.lineTo(x, topY); ctx.lineTo(x + 54, topY + 62); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fffaf0'; circle(x, topY + 110, 30); ctx.fill(); ctx.strokeStyle = '#5a4a6a'; ctx.lineWidth = 3; circle(x, topY + 110, 30); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, topY + 110); ctx.lineTo(x, topY + 88); ctx.moveTo(x, topY + 110); ctx.lineTo(x + 14, topY + 114); ctx.stroke();
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; ctx.fillStyle = '#5a4a6a'; circle(x + Math.cos(a) * 24, topY + 110 + Math.sin(a) * 24, 1.6); ctx.fill(); }
    ctx.fillStyle = '#9fd0f0'; for (let wy = topY + 160; wy < y - 30; wy += 60) { rr(x - 12, wy, 24, 34, 12); ctx.fill(); }
  } else if (st.look === 'hill') {
    ctx.fillStyle = '#d6d0c4'; ctx.strokeStyle = '#9a9080'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 36, topY + 40); ctx.lineTo(x + 36, topY + 40); ctx.lineTo(x + 50, y + 30); ctx.lineTo(x - 50, y + 30); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c4bdb0'; for (let r = 0; r < 12; r++) for (let k = 0; k < 3; k++) { const yy = topY + 52 + r * 26; if (yy > y) break; ctx.fillRect(x - 30 + k * 22 + (r % 2) * 10, yy, 16, 10); }
    ctx.fillStyle = '#b6aea0'; for (let k = 0; k < 5; k++) ctx.fillRect(x - 42 + k * 18, topY + 24, 12, 18);
    ctx.fillRect(x - 42, topY + 38, 84, 8);
  } else if (st.look === 'pier') {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x - 26, topY + 50); ctx.lineTo(x + 26, topY + 50); ctx.lineTo(x + 42, y + 30); ctx.lineTo(x - 42, y + 30); ctx.closePath(); ctx.clip();
    for (let k = 0; k < 10; k++) { ctx.fillStyle = k % 2 ? '#ffffff' : '#ff6b6b'; ctx.fillRect(x - 50, topY + 50 + k * 34, 100, 34); }
    ctx.restore();
    ctx.fillStyle = '#5a4a6a'; ctx.fillRect(x - 32, topY + 44, 64, 8);
    ctx.fillStyle = '#ffe9a8'; rr(x - 18, topY + 12, 36, 32, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,170,0.35)'; ctx.beginPath(); ctx.moveTo(x, topY + 28); ctx.lineTo(x - 160, topY - 10 + Math.sin(G.clock) * 20); ctx.lineTo(x - 160, topY + 60 + Math.sin(G.clock) * 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.moveTo(x - 24, topY + 12); ctx.lineTo(x, topY - 8); ctx.lineTo(x + 24, topY + 12); ctx.closePath(); ctx.fill();
  } else {
    kiteCastle(x, y + 30, 1, false, topY);
  }
  // the flag pole (and the flag, until it's grabbed)
  ctx.strokeStyle = '#6a5a7a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, topY + 6); ctx.lineTo(x, e.flagY - 26); ctx.stroke();
  ctx.fillStyle = C.gold; circle(x, e.flagY - 28, 5); ctx.fill();
  if (!e.got) {
    if (e.gold) kiteGoldGlow(x + 12, e.flagY, 40 + Math.sin(G.clock * 5) * 4);
    kiteFlagShape(x, e.flagY - 20, 1, G.clock);
    // a soft ring shows where to fly
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.4 + 0.3 * Math.sin(G.clock * 4)).toFixed(3) + ')'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
    const gr = KITE.grabR + (e.gold ? KITE.goldGrab : 0);
    ctx.beginPath(); ctx.ellipse(e.flagX + 14, e.flagY, gr * 1.6, gr, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
}
function kiteFlagShape(x, y, s, t) {
  ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y);
  for (let k = 0; k <= 8; k++) ctx.lineTo(x + k * 5 * s, y + Math.sin(t * 6 + k * 0.8) * 3 * s);
  for (let k = 8; k >= 0; k--) ctx.lineTo(x + k * 5 * s, y + 26 * s + Math.sin(t * 6 + k * 0.8) * 3 * s);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff'; kiteStarPath(x + 20 * s, y + 13 * s + Math.sin(t * 6 + 3) * 3 * s, 7 * s, 3 * s, 0); ctx.fill();
}
function kiteCastle(x, y, s, far, topY) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const wall = far ? '#e9e4fb' : '#f4f0ff', edge = far ? '#c9c0ec' : '#a29fd6', roof = far ? '#c9b8f0' : '#8f7ad8';
  const tall = topY != null ? (y - topY) / s : 330;
  ctx.fillStyle = wall; ctx.strokeStyle = edge; ctx.lineWidth = 3;
  // side towers and the keep
  for (const [tx, h, w] of [[-130, tall * 0.55, 50], [130, tall * 0.6, 50], [-60, tall * 0.42, 70], [60, tall * 0.42, 70]]) {
    ctx.fillRect(tx - w / 2, -h, w, h); ctx.strokeRect(tx - w / 2, -h, w, h);
    ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(tx - w / 2 - 8, -h); ctx.lineTo(tx, -h - 50); ctx.lineTo(tx + w / 2 + 8, -h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd36b'; rr(tx - 7, -h + 24, 14, 20, 7); ctx.fill(); ctx.fillStyle = wall;
  }
  ctx.fillRect(-36, -tall + 40, 72, tall - 40); ctx.strokeRect(-36, -tall + 40, 72, tall - 40);
  ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(-46, -tall + 42); ctx.lineTo(0, -tall - 6); ctx.lineTo(46, -tall + 42); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd36b'; rr(-10, -tall + 70, 20, 28, 10); ctx.fill();
  ctx.fillStyle = '#c98e57'; rr(-22, -70, 44, 70, 22); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  if (!far) for (const cx of [-150, -40, 90]) { kiteCloud(cx, 10, 0.9, '#ffffff'); }
  ctx.restore();
}
function kiteDrawEndFront(st) {
  const e = st.c.end;
  if (!e || e.x0 > st.cam.x + W + 400 || e.fence < st.cam.x - 600) return;
  const y = e.y, t = G.clock;
  // the landing pad: a big painted target with "LAND"
  const mx = (e.pad0 + e.pad1) / 2, hw = (e.pad1 - e.pad0) / 2;
  ctx.fillStyle = 'rgba(28,26,54,0.1)'; ctx.beginPath(); ctx.ellipse(mx, y + 4, hw + 6, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(mx, y + 2, hw, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PCOL[st.rider]; ctx.beginPath(); ctx.ellipse(mx, y + 2, hw * 0.66, 5.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(mx, y + 2, hw * 0.33, 3, 0, 0, Math.PI * 2); ctx.fill();
  const on = kiteOnPad(st);
  ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
  ctx.fillStyle = on ? C.gold : '#fffaf0'; ctx.strokeStyle = '#8a6a8c'; ctx.lineWidth = 2;
  rr(mx - 52, y - 112, 104, 26, 8); ctx.fill(); ctx.stroke();
  text('LANDING PAD', mx, y - 98.5, 13, C.ink, 'center', 'body');
  ctx.fillStyle = '#8a5a36'; ctx.fillRect(mx - 3, y - 86, 6, 86);
  // the fence at the end
  ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#b8a07a'; ctx.lineWidth = 1.5;
  for (let k = 0; k < 4; k++) { const fx = e.fence + k * 16; ctx.fillRect(fx, y - 44, 9, 44); ctx.strokeRect(fx, y - 44, 9, 44); }
  ctx.fillRect(e.fence - 4, y - 34, 66, 7); ctx.strokeRect(e.fence - 4, y - 34, 66, 7);
  ctx.fillRect(e.fence - 4, y - 16, 66, 7); ctx.strokeRect(e.fence - 4, y - 16, 66, 7);
  // the grabbed flag waves from the rider's hand (drawn with the kite); after the landing, on the pad's post
  if (e.got && st.state === 'land' && st.land && st.land.t > 1.6) kiteFlagShape(mx + 3, y - 150 + Math.sin(t) * 2, 0.8, t);
}
// the kite string: from the runner's hand to the kite, sagging a little
function kiteRunnerHand(st) {
  const S = KITE.scale, bob = st.grounded ? Math.abs(Math.sin(st.step * Math.PI)) * 3 : 0;
  return { x: st.rx + 10 * st.face, y: st.ry - PH * S - 8 - bob };
}
function kiteKiteBridle(st) {
  const a = st.tilt + (st.tangle > 0 ? Math.sin(G.clock * 30) * 0.3 : 0);
  return { x: st.kx + Math.sin(a) * 22 + 4, y: st.ky + Math.cos(a) * 22 };
}
function kiteDrawString(st) {
  const h = kiteRunnerHand(st), b = kiteKiteBridle(st);
  const slack = clamp(1 - Math.hypot(b.x - h.x, b.y - h.y) / (st.L + 30), 0, 1);
  const mx = (h.x + b.x) / 2, my = (h.y + b.y) / 2 + 12 + slack * 40;
  ctx.strokeStyle = st.reeling ? '#ffffff' : '#fff6e0'; ctx.lineWidth = st.reeling ? 2.4 : 1.6;
  ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.quadraticCurveTo(mx, my, b.x, b.y); ctx.stroke();
  ctx.strokeStyle = 'rgba(28,26,54,0.3)'; ctx.lineWidth = 0.8; ctx.stroke();
}
// the big kite: a diamond in the rider's colour, a bow tail, the rider sitting on it
function kiteDrawKite(st) {
  const K = KITE, t = G.clock, rid = st.rider, col = PCOL[rid], dark = PDARK[rid];
  // (the sail is mint and cream, so Pip's orange and Bo's blue both stand out on it; the edge is the rider's colour)
  const sailA = rid === 0 ? '#7fd8c0' : '#ffd36b', sailB = '#fffaf0';
  const tangled = st.tangle > 0, landed = st.state === 'land' && st.land && st.land.t > 1.4;
  let a = st.tilt + (tangled ? Math.sin(t * 30) * 0.3 : 0) + st.spin;
  if (landed) a = -1.1;
  const s = st.tuck > 0 ? 0.8 : 1;
  const kx = st.kx, ky = st.ky;
  // the tail with bows, trailing behind (and waving)
  ctx.strokeStyle = '#fff6e0'; ctx.lineWidth = 1.6;
  const tail = [];
  const bx = kx + Math.sin(a) * 40 * s, by = ky + Math.cos(a) * 40 * s;
  for (let k = 0; k <= 6; k++) tail.push([bx - k * 18, by + k * 10 + Math.sin(t * 6 - k * 0.9) * (6 + k * 2) * (tangled ? 2 : 1)]);
  if (landed) { tail.length = 0; for (let k = 0; k <= 6; k++) tail.push([bx - k * 14, Math.min(by + 4, st.ry - 3)]); }
  ctx.beginPath(); tail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  tail.forEach(([x, y], i) => {
    if (!i) return;
    ctx.fillStyle = ['#ffd36b', '#ffffff', '#ff8fc7'][i % 3];
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y - 5); ctx.lineTo(x - 6, y + 5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 6, y - 5); ctx.lineTo(x + 6, y + 5); ctx.closePath(); ctx.fill();
  });
  if (st.gold > 4 || (st.c.end && st.c.end.gold && !st.c.end.got && st.kx > st.c.end.x0)) {
    // the gold gust under the kite
    for (let k = 0; k < 3; k++) { const yy = ky + 50 + k * 12, xx = kx - 30 + ((t * 80 + k * 30) % 60); ctx.strokeStyle = 'rgba(255,197,61,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xx - 20, yy); ctx.quadraticCurveTo(xx, yy - 10, xx + 20, yy); ctx.stroke(); }
  }
  ctx.save(); ctx.translate(kx, ky); ctx.rotate(a); ctx.scale(s, s);
  // the sail: 4 panels
  const wd = 34, up = 40, dn = 46;
  const pts = [[0, -up], [wd, -6], [0, dn], [-wd, -6]];
  ctx.fillStyle = sailA; ctx.beginPath(); ctx.moveTo(0, -up); ctx.lineTo(wd, -6); ctx.lineTo(0, -6); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(-wd, -6); ctx.lineTo(0, dn); ctx.closePath(); ctx.fill();
  ctx.fillStyle = sailB; ctx.beginPath(); ctx.moveTo(0, -up); ctx.lineTo(-wd, -6); ctx.lineTo(0, -6); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(wd, -6); ctx.lineTo(0, dn); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke();
  ctx.strokeStyle = '#8a5a36'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -up); ctx.lineTo(0, dn); ctx.moveTo(-wd, -6); ctx.lineTo(wd, -6); ctx.stroke();
  ctx.fillStyle = col; kiteStarPath(0, 18, 7, 3, 0); ctx.fill();
  ctx.restore();
  // the rider on the kite (or hopping down onto the pad)
  const rs = kiteRiderSpot(st), p = G.players[rid];
  const save = { x: p.x, y: p.y, face: p.face, sx: p.sx, sy: p.sy, vy: p.vy, stun: p.stun, alive: p.alive, blink: p.blink };
  ctx.save(); ctx.translate(rs.x, rs.y); if (rs.onKite) { ctx.rotate(a * 0.6); ctx.scale(s, s); }
  p.x = -PW / 2; p.y = -PH; p.alive = true; p.vy = rs.onKite ? clamp(st.kvy, -300, 300) : 0;
  p.face = 1; p.blink = 0;
  const lean = st.up / K.leanMax;
  p.sy = st.tuck > 0 ? 0.72 : rs.onKite ? 0.95 + lean * 0.06 : 1.02; p.sx = 2 - p.sy;
  p.stun = tangled ? 0.5 : 0;
  drawPlayer(p);
  if (rs.onKite) {
    // little hands gripping the spar
    ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
    circle(-14, -10, 4); ctx.fill(); ctx.stroke(); circle(14, -10, 4); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  Object.assign(p, save);
  // the grabbed flag in the rider's hand
  const e = st.c.end;
  if (e && e.got && !(st.state === 'land' && st.land && st.land.t > 1.6)) {
    ctx.strokeStyle = '#6a5a7a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(rs.x + 14, rs.y - 10); ctx.lineTo(rs.x + 14, rs.y - 52); ctx.stroke();
    kiteFlagShape(rs.x + 14, rs.y - 52, 0.6, t);
  }
  if (tangled) for (let i = 0; i < 3; i++) { const aa = t * 8 + i * 2.1; ctx.fillStyle = '#ffffff'; kiteStarPath(kx + Math.cos(aa) * 30, ky - 52 + Math.sin(aa) * 6, 6, 2.5, aa); ctx.fill(); }
}
// the runner: Pip or Bo running along with the string in one hand
function kiteDrawRunner(st) {
  const K = KITE, p = G.players[st.runner], S = K.scale, hand = kiteRunnerHand(st);
  const save = { x: p.x, y: p.y, face: p.face, sx: p.sx, sy: p.sy, vy: p.vy, stun: p.stun, alive: p.alive };
  const run = st.grounded && Math.abs(st.vx) > 20, ph = st.step * Math.PI;
  ctx.save(); ctx.translate(st.rx, st.ry - (run ? Math.abs(Math.sin(ph)) * 3 : 0)); ctx.scale(S, S);
  if (run) ctx.rotate(clamp(st.vx / K.vRun, -1, 1) * 0.1);
  // little feet
  ctx.fillStyle = PDARK[st.runner];
  if (run) { ctx.beginPath(); ctx.ellipse(-4 + Math.sin(ph) * 5, -1, 5, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(4 - Math.sin(ph) * 5, -1, 5, 3, 0, 0, Math.PI * 2); ctx.fill(); }
  p.x = -PW / 2; p.y = -PH; p.alive = true; p.vy = st.grounded ? 0 : st.vy;
  p.face = st.face;
  p.sy = !st.grounded ? (st.vy < 0 ? 1.1 : 0.95) : run ? 1 + Math.sin(ph * 2) * 0.04 : 1; p.sx = 2 - p.sy;
  p.stun = st.oops && st.oops.t < 0.9 ? 0.5 : 0;
  drawPlayer(p);
  ctx.restore();
  Object.assign(p, save);
  // the arm up to the hand, and a little reel
  const sh = { x: st.rx + 6 * st.face, y: st.ry - PH * S * 0.6 };
  ctx.lineCap = 'round';
  for (const [c, lw] of [[PDARK[st.runner], 6], [PCOL[st.runner], 3.5]]) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(hand.x, hand.y); ctx.stroke(); }
  ctx.save(); ctx.translate(hand.x, hand.y); ctx.rotate(st.reeling ? G.clock * 20 : 0);
  ctx.fillStyle = '#c98e57'; circle(0, 0, 6); ctx.fill(); ctx.fillStyle = '#fff6e0'; circle(0, 0, 3.5); ctx.fill();
  ctx.fillStyle = '#8a5a36'; ctx.fillRect(-1, -6, 2, 12);
  ctx.restore();
}

/* ---------- the HUD: clock and stars, the two job panels, prompts ---------- */
function kiteHud(st) {
  const K = KITE, big = hudBig(), z = big ? 1.35 : 1, ps = G.players, play = G.mode === 'play' || G.mode === 'paused', t = G.clock;
  let timeX0 = W - 14;
  {
    const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = st.stars + ' / ' + st.starsAll;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tw = ctx.measureText(tm).width, nw = ctx.measureText(n).width, icon = fs * 1.3, gap = fs;
    const w = tw + gap + icon + fs * 0.4 + nw + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    text(tm, x0 + 15, cy, fs, C.paper, 'left', 'body');
    ctx.fillStyle = C.gold; kiteStarPath(x0 + 15 + tw + gap + icon / 2, cy, fs * 0.62, fs * 0.27, 0); ctx.fill();
    text(n, x0 + 15 + tw + gap + icon + fs * 0.4, cy, fs, '#ffe7a8', 'left', 'body');
    timeX0 = x0;
  }
  if (!play) return;
  const pl = kitePlan(st), e = st.c.end;
  // the job panels: Pip's bottom left, Bo's bottom right
  for (const id of [0, 1]) {
    const pw = Math.round(236 * z), ph = Math.round(58 * z), py = H - ph - 10, px = id === 0 ? 12 : W - 12 - pw;
    // (it fades while a player is right behind it)
    const fade = ps.some(q => q.x + PW > px - 10 && q.x < px + pw + 10 && q.y + PH > py - 30) ? 0.45 : 1;
    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    const quiet = kiteQuiet(id), isRunner = id === st.runner;
    text(NAMES[id] + (isRunner ? ' · runner' : ' · kite rider') + (quiet ? ' (computer)' : ''), px + 12 * z, py + 14 * z, 13 * z, PCOL[id], 'left');
    let chips;
    if (isRunner) {
      // a little wind meter: how much lift the kite has
      const mw = 62 * z, mx = px + pw - mw - 12 * z, my = py + 9 * z;
      text('WIND', mx - 4 * z, my + 5 * z, 9 * z, '#d9d3ef', 'right', 'body');
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(mx, my, mw, 10 * z, 5 * z); ctx.fill();
      const f = clamp((st.th - K.thMin) / (K.thMax - K.thMin), 0, 1);
      ctx.fillStyle = f > 0.85 ? C.gold : f > 0.4 ? '#8fe3b0' : '#ff9a7a'; if (f > 0.02) { rr(mx, my, Math.max(10 * z, mw * f), 10 * z, 5 * z); ctx.fill(); }
      const needRun = st.lift < 0.6 && !kiteOnPad(st) && st.state === 'run';
      const needJump = pl.jump && pl.jump.dist < 110 && st.grounded;
      const needReel = pl.needL != null && st.L > pl.needL + 40 && pl.dist < 420;
      chips = [['run', 'RUN', needRun, false], ['jump', 'JUMP', needJump, false], ['reel', st.reeling ? 'REELING' : 'REEL', needReel && !st.reeling, st.reeling]];
    } else {
      const dy = pl.ty != null ? st.ky - pl.ty : 0, near = pl.dist < 380 || pl.why === 'flag';
      const needUp = pl.ty != null && near && dy > 22, needDown = pl.ty != null && near && dy < -22;
      chips = [['up', 'UP', needUp, false], ['down', 'DOWN', needDown, false], ['tuck', st.tuck > 0 ? 'SPIN!' : 'TUCK', pl.birds && st.tuck <= 0, st.tuck > 0]];
    }
    const n = chips.length, cw = (pw - 24 * z - (n - 1) * 6 * z) / n;
    chips.forEach(([k, lab, lit, held], i) => {
      const cx = px + 12 * z + i * (cw + 6 * z), cy = py + 27 * z, chh = 23 * z;
      ctx.fillStyle = lit ? (Math.sin(t * 12) > -0.3 ? C.gold : 'rgba(255,197,61,0.55)') : held ? 'rgba(143,227,176,0.85)' : 'rgba(255,255,255,0.12)';
      rr(cx, cy, cw, chh, chh / 2); ctx.fill();
      const kk = quiet ? '' : kiteKey(id, k);
      let fs = 12 * z;
      const str = (kk ? kk + ' ' : '') + lab;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      while (fs > 8 && ctx.measureText(str).width > cw - 8) { fs -= 0.5; ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; }
      text(str, cx + cw / 2, cy + chh / 2 + 0.5, fs, lit || held ? C.ink : '#ffffff', 'center', 'body');
    });
    ctx.globalAlpha = 1;
  }
  // the message line (gold help): between the level pill and the clock when it fits, else under the stretch pill
  if (st.msg) {
    let fs = big ? 20 : 14;
    const h = big ? 32 : 26, font = n => '700 ' + n + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.font = font(14);
    const left = 14 + ctx.measureText(levelCode(G.levelIndex) + ' · ' + G.level.def.name).width + 28 + 10, right = timeX0 - 10;
    ctx.font = font(fs);
    let w = ctx.measureText(st.msg.text).width + 30, cx = W / 2 + 40, y = 12;
    if (w <= right - left) cx = clamp(cx, left + w / 2, right - w / 2);
    else {
      cx = W / 2; y = big ? 96 : 80;
      while (w > W - 40 && fs > 11) { fs--; ctx.font = font(fs); w = ctx.measureText(st.msg.text).width + 30; }
    }
    ctx.globalAlpha = clamp((st.msg.life - st.msg.t) / 0.3, 0, 1);
    pill(cx, y, w, h, 'center'); text(st.msg.text, cx, y + h / 2 + 0.5, fs, st.msg.col, 'center', 'body'); ctx.globalAlpha = 1;
  }
  if (G.introT > 0 || st.state !== 'run') return;
  // prompts: over the runner's head and beside the kite. A hint bubble replaces that player's prompt while it shows.
  const fs = 14 * z, yMax = H - Math.round(58 * z) - 18;
  const spot = id => {
    const p = ps[id];
    if (id === st.runner) return { x: p.x + PW / 2 + 14, y: p.y - 26 * z, side: 1 };
    return { x: p.x + PW / 2 - 40, y: p.y - 30 * z, side: -1 };
  };
  const place = (id, w, h) => {
    const s = spot(id);
    let top = s.y - h;
    if (typeof CPU === 'object' && cpuSolo() && !cpuOn(id)) { const cb = CPU.bubbles[1 - id]; if (cb && cb.t > 0 && Math.abs(ps[1 - id].x - ps[id].x) < w) top = Math.min(top, ps[1 - id].y - 22 - (big ? 30 : 22) - 10 - h); }
    return { x: clamp(s.side > 0 ? s.x - 20 : s.x - w + 20, 4, W - w - 4), y: clamp(top, big ? 96 : 80, yMax - h) };
  };
  const say = (id, str, col, pulse) => {
    if (kiteQuiet(id) || st.hints[id]) return;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 20 * z, h = fs + 12 * z, o = place(id, w, h);
    const sc = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
    ctx.save(); ctx.translate(o.x + w / 2, o.y + h / 2); ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
    text(str, 0, 0.5, fs, col, 'center', 'body');
    ctx.restore();
  };
  const R = st.runner, Kd = st.rider;
  // the runner
  if (pl.jump && pl.jump.dist < 90 && st.grounded && st.vx > 60) say(R, 'Jump ' + kiteKey(R, 'jump') + '!', C.gold, true);
  else if (e && e.got && !kiteOnPad(st) && st.rx > e.x0 - 200) say(R, 'Run to the landing pad ' + kiteKey(R, 'run'), C.gold, false);
  else if (pl.needL != null && st.L > pl.needL + 40 && pl.dist < 420 && !st.reeling && pl.why !== 'flag') say(R, 'Reel in! Hold ' + kiteKey(R, 'reel'), C.gold, true);
  else if (st.reeling && pl.needL != null && st.L < pl.needL - 30) say(R, 'Let go of ' + kiteKey(R, 'reel') + ': string out', '#ffe7a8', false);
  else if (st.lift < 0.5 && !kiteOnPad(st) && st.roomT > 4.5 && !st.oops) say(R, 'Run ' + kiteKey(R, 'run') + '! The kite is sinking', '#ffe7a8', false);
  // the rider
  if (pl.ty != null && (pl.dist < 380 || pl.why === 'flag')) {
    const dy = st.ky - pl.ty;
    const fdx = pl.why === 'flag' ? (st.kx - e.flagX - 14) / 1.6 : 0;
    if (pl.why === 'flag' && Math.abs(dy) > 14) say(Kd, (dy > 0 ? 'Up ' + kiteKey(Kd, 'up') : 'Down ' + kiteKey(Kd, 'down')) + ' to the flag!', C.gold, true);
    else if (pl.why === 'flag' && Math.abs(fdx) > 22 && st.rx > e.x0 + 300) say(Kd, (fdx > 0 ? 'Back ' + kiteKey(Kd, 'back') : 'Forward ' + kiteKey(Kd, 'run')) + ' to the flag!', C.gold, true);
    else if (pl.birds && st.tuck <= 0 && Math.abs(dy) > 22) say(Kd, 'Tuck ' + kiteKey(Kd, 'tuck') + ' or steer!', C.gold, true);
    else if (pl.why === 'dodge' && dy > 22) say(Kd, 'Up! ' + kiteKey(Kd, 'up'), C.gold, true);
    else if (pl.why === 'dodge' && dy < -22) say(Kd, 'Down! ' + kiteKey(Kd, 'down'), C.gold, true);
  }
  for (const id of [0, 1]) {
    const hn = st.hints[id];
    if (!hn) continue;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(hn.text).width + 22 * z, h = fs + 14 * z, o = place(id, w, h);
    ctx.globalAlpha = clamp((hn.life - hn.t) / 0.3, 0, 1);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5;
    rr(o.x, o.y, w, h, h / 2); ctx.fill(); ctx.stroke();
    text(hn.text, o.x + w / 2, o.y + h / 2 + 0.5, fs, C.ink, 'center', 'body');
    ctx.globalAlpha = 1;
  }
}

/* ---------- sounds ---------- */
Sfx.extra.kiteJump = function (p) { this.tone(330 * p, 0.12, 'triangle', 0.045, 620 * p); };
Sfx.extra.kiteLand = function () { this.tone(150, 0.06, 'triangle', 0.035, 100); };
Sfx.extra.kiteReel = function () { this.tone(1300, 0.025, 'square', 0.01, 1100); };
Sfx.extra.kiteStar = function () { [988, 1319].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.04, null, i * 0.05)); };
Sfx.extra.kiteRing = function () { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.045, null, i * 0.06)); };
Sfx.extra.kiteTangle = function () { this.tone(520, 0.35, 'sine', 0.05, 220); this.tone(300, 0.25, 'triangle', 0.03, 160, 0.06); };
Sfx.extra.kiteTuck = function (p) { this.tone(500 * p, 0.25, 'sine', 0.035, 1100 * p); };
Sfx.extra.kiteWhoops = function () { this.tone(620, 0.4, 'sine', 0.05, 200); };
Sfx.extra.kiteBoing = function () { this.tone(160, 0.35, 'sine', 0.08, 560); };
Sfx.extra.kiteFlag = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.13, 'triangle', 0.05, null, i * 0.08)); };
Sfx.extra.kiteHelp = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.kiteLand2 = function () { this.tone(700, 0.5, 'sine', 0.03, 300); };
Sfx.extra.kiteHop = function (p) { this.tone(300 * p, 0.2, 'sine', 0.05, 640 * p); };
Sfx.extra.kiteSwap = function () { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, 0.2 + i * 0.07)); };
Sfx.extra.kiteFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.055, null, i * 0.11)); };
