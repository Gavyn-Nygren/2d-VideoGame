/* Pip & Bo - Level 13-3 Haunted Mansion (team, World 13 Spooky Hollow). */
'use strict';

/* ===== 13-3 Haunted Mansion (mode 'mansion', team) — Gavyn's own idea =====
   "One player carries a flashlight that reveals hidden ghost platforms; the other can only move while the light is off
   them; portraits that swap players; a ghost race." Silly-spooky, nobody gets hurt.
   - The HOLDER has the flashlight. The action ('light') turns it on and off. While it is on, ▲ / ▼ tilt the beam (so no
     jumping with the light on) and ◀ ▶ walk and turn it. The beam is a soft yellow cone: stone walls and floors stop it,
     and so do the ghosts it lands on.
   - Sleepy ghosts lie about as platforms (faint outlines). Light one and it wakes up, glows minty and holds the MOVER up
     (only the mover: the holder falls through with a "Tee-hee! Not you!"). It stays awake MANSION.awake s after the
     beam leaves (flickering at the end), then dozes off again.
   - The MOVER is spooked still while the beam touches them ("Eep!"): no walking or jumping, sideways speed stops at
     once and gravity still pulls (a startled drop, never a hover). They can move again MANSION.shake s after the light
     leaves them. So the holder lights the ghosts ahead of (or below) the mover and keeps the beam off them.
   - Haunted portraits: the mover presses the action ('swap') at one and Pip and Bo swap places in a puff of purple
     smoke. The flashlight stays in the holder's hand, so a portrait brings the light to where only the mover could go.
     Jobs swap every room. Rooms: Foyer, Library (a floating ghost book lifts the mover), Portrait Gallery (two
     portraits: leapfrog the light ahead), Attic Race (Bertie the friendly sheet ghost races you to the attic door:
     both must get there first; a miss restarts the race with a gold head start).
   - Soft failure only: off the bottom is "Boo-hoo!" and a puff of purple smoke back on your last safe floor; a ghost
     that dozes off under the mover is a "Whoops!" (both count as Falls). Gold help: wide-awake ghosts after 2 falls in
     a room (or a long time stuck), a narrow beam after 5 Eeps in a room, Flap the bat shows the way when you are stuck.
   Map chars (parsed here): g ghost platform (a run of them is one ghost), p haunted portrait (the mover stands at it),
   d candle stand, E the door (the engine's door rect, taken over here). Room def: { title, tip, holder: 0|1, style:
   'foyer'|'library'|'gallery'|'attic', act, deco: [...], cat: [c, r], books: [{ c, w, low, high, period, pause }],
   race: { route: [[x, y]...], time }, plan: [...] (the designed route: the bat and the computer use it) }.
   Every top-level name starts with mansion / MANSION (Sfx.extra.mansion* too); level state lives in G.mst. */
const MANSION = {
  // the flashlight beam
  range: 330, half: 0.25, halfNarrow: 0.16, rays: 27, step: 4, tiltV: 1.9, tiltMax: 1.45, handX: 8, handY: 11,
  // the ghosts
  awake: 3.0, wideAwake: 6.0, flicker: 0.8, slab: 12,
  // the mover's freeze
  shake: 0.25, eepGap: 0.5,
  // portraits and calls
  swapCD: 1.0, swapSafe: 0.7, portraitReach: 22, callCD: 1.0, callLife: 1.4,
  // flow
  introHold: 0.4, exitHold: 0.35, winHold: 1.6, badgeT: 6, newsLife: 3.6,
  // help
  goldFalls: 2, goldStuck: 55, narrowEeps: 5, batAfter: 22, nudgeFrozen: 1.6, nudgePortrait: 3,
  // the race
  raceCount: 2.6, headStart: 5, slowMul: 0.82, lostHold: 2.6,
};
const mansionIx = (c, r) => r * COLS + c;
const mansionBig = () => (typeof hudBig === 'function' && hudBig());
const mansionCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);   // 1-player mode: the computer's character

/* ---------- each player's own keys (keyboard, controller or touch) for the hint chips ---------- */
function mansionDev(id) { try { return actKey(id); } catch (e) { return 'kb'; } }
function mansionKeys(id, role) {
  const dev = mansionDev(id);
  if (role === 'hold') return dev === 'pad' ? glyph('act') + ' light on/off · stick ▲▼ aim'
    : dev === 'touch' ? 'light button on/off · ▲ ▼ aim'
    : id === 0 ? 'F light on/off · W S aim' : '/ light on/off · ↑ ↓ aim';
  return dev === 'pad' ? 'stick move · ' + glyph('a') + ' jump · ' + glyph('act') + ' at a painting: swap'
    : dev === 'touch' ? '◀ ▶ move · ▲ jump · swap button at a painting'
    : id === 0 ? 'A D move · W jump · F at a painting: swap' : '← → move · ↑ jump · / at a painting: swap';
}
const mansionActKey = id => { const d = mansionDev(id); return d === 'pad' ? glyph('act') : d === 'touch' ? 'the swap button' : id === 0 ? 'F' : '/'; };
// the top-bar legend shows each player's keys for their job in this room (the framework adds "F <act label>")
const MANSION_LEGEND = {
  hold: ['<kbd>A</kbd><kbd>D</kbd> walk <kbd>W</kbd> jump <kbd>W</kbd><kbd>S</kbd> aim (light on)', '<kbd>←</kbd><kbd>→</kbd> walk <kbd>↑</kbd> jump <kbd>↑</kbd><kbd>↓</kbd> aim (light on)'],
  move: ['<kbd>A</kbd><kbd>D</kbd> move <kbd>W</kbd> jump <kbd>S</kbd> drop', '<kbd>←</kbd><kbd>→</kbd> move <kbd>↑</kbd> jump <kbd>↓</kbd> drop'],
};
function mansionLegend(st) {
  try {
    const lg = Object.assign({}, LEVELS[G.levelIndex].legend || {});
    for (const id of [0, 1]) lg[id === 0 ? 'pip' : 'bo'] = MANSION_LEGEND[id === st.holder ? 'hold' : 'move'][id];
    setLegend(lg);
  } catch (e) { /* the level's own legend stays */ }
}
// the touch buttons and the legend name each player's own action this room (one act label per level in the framework)
let mansionLabelEls = null;
function mansionActLabels(st) {
  try {
    if (!mansionLabelEls || !mansionLabelEls.every(o => document.contains(o.el))) mansionLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.pad-only');
      const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.dataset.legp !== undefined ? +box.dataset.legp : -1;
      return { el, id };
    });
    let changed = false;
    for (const o of mansionLabelEls) {
      const want = o.id < 0 ? 'light/swap' : o.id === st.holder ? 'light' : 'swap';
      if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
    }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}

/* ---------- the room: ghosts, books, portraits, candles, the door ---------- */
function mansionRoom(st, L) {
  const def = L.def, g = L.grid;
  st.k = def.roomIndex || 0;
  st.holder = def.holder; st.mover = 1 - def.holder;
  st.style = def.style || 'foyer';
  st.plats = []; st.books = []; st.portraits = []; st.candles = [];
  st.ghostAt = new Int16Array(COLS * ROWS).fill(-1);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = g[r][c];
    if (ch === 'g' && st.ghostAt[mansionIx(c, r)] < 0) {
      let c1 = c; while (c1 + 1 < COLS && g[r][c1 + 1] === 'g') c1++;
      const pl = { id: st.plats.length, c0: c, c1, r, x: c * T, y: r * T, w: (c1 - c + 1) * T, h: MANSION.slab, t: 0, lit: false, wake: 0, seen: 0, ph: (hash(c, r) % 100) / 16, book: false, stood: false };
      st.plats.push(pl);
      for (let k = c; k <= c1; k++) st.ghostAt[mansionIx(k, r)] = pl.id;
    } else if (ch === 'p') st.portraits.push({ i: st.portraits.length, c, r, x: c * T + T / 2, y: (r + 1) * T, cd: 0, anim: 0, used: 0, look: 0, near: 0, art: (st.portraits.length + st.k) % 3 });
    else if (ch === 'd') st.candles.push({ x: c * T + T / 2, y: (r + 1) * T, ph: (hash(r, c) % 100) / 10 });
  }
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if ('gpd'.includes(g[r][c])) g[r][c] = '.';
  for (const bd of def.books || []) {
    const pl = { id: st.plats.length, x: bd.c * T, y: bd.low * T, w: (bd.w || 3) * T, h: MANSION.slab, t: 0, lit: false, wake: 0, seen: 0, ph: 0, book: true, stood: false,
      y0: bd.low * T, y1: bd.high * T, period: bd.period || 9, pause: bd.pause || 1.4, s: 0, dy: 0, c0: bd.c, c1: bd.c + (bd.w || 3) - 1 };
    st.plats.push(pl); st.books.push(pl);
  }
  st.exit = L.door; L.door = null;
  st.deco = def.deco || [];
  st.cat = def.cat ? { x: def.cat[0] * T + T / 2, y: (def.cat[1] + 1) * T, face: def.cat[2] || -1, mew: 0, cd: 0, look: 0 } : null;
  st.plan = def.plan || [];
  // per-room state
  st.light = false; st.tilt = 0.35; st.cast = null; st.ride = null;
  st.frz = { on: false, after: 0, t: 0, endT: 9 }; st.safeT = 0; st.callCD = 0; st.call = null;
  st.safe = G.players.map(p => ({ x: p.x, y: p.y })); st.safeStand = [0, 0];
  st.roomT = 0; st.exitT = 0; st.phase = 'play'; st.winT = 0;
  st.roomFalls = 0; st.roomEeps = 0; st.wide = false; st.narrow = false; st.stuckT = 0;
  st.pops = []; st.news = null; st.nudge = { frozenT: 0, portT: 0 };
  st.bat = { x: W / 2, y: -40, on: false, t: 0, flap: 0 };
  st.giggleCD = 0; st.drops = 0; st.wasOn = -1;
  st.race = def.race ? mansionNewRace(def.race, st.raceMisses || 0) : null;
  st.stats.roomT[st.k] = 0;
  for (const p of G.players) p.face = 1;
  if (G.mode === 'play') { mansionLegend(st); mansionActLabels(st); }
}
function mansionNewRace(rd, misses) {
  const pts = rd.route.map(([x, y]) => ({ x, y })), segs = [];
  let len = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); segs.push(d); len += d; }
  const wait = MANSION.raceCount + MANSION.headStart * misses;
  return { pts, segs, len, time: rd.time / (misses >= 2 ? MANSION.slowMul : 1), wait, t: 0, prog: 0, phase: 'count', misses, x: pts[0].x, y: pts[0].y, face: 1, say: null, sayT: 0, lostT: 0 };
}
const mansionSolid = pl => pl.t > 0 || (MODES.mansion.debug && !pl.book);

/* ---------- the beam: rays from the holder's hand, stopped by stone, ghosts and the mover ---------- */
function mansionOrigin(h, face) { return { x: h.x + h.w / 2 + face * MANSION.handX, y: h.y + MANSION.handY }; }
// cast from (ox, oy) facing face (+1 right, -1 left), tilt radians up; mover = a rect the beam spooks (or null).
// Returns { pts: [x0, y0, x1, y1, ...] ray ends, plats: Set of ghost ids lit, hit: the mover was touched, ox, oy }
function mansionCast(st, ox, oy, face, tilt, half, mover) {
  const n = MANSION.rays, R = MANSION.range, S = MANSION.step, grid = G.level.grid, res = { pts: [], plats: new Set(), hit: false, ox, oy, face, tilt, half };
  for (let i = 0; i < n; i++) {
    const a = tilt + half * (2 * i / (n - 1) - 1), dx = face * Math.cos(a), dy = -Math.sin(a);
    let ex = ox + dx * R, ey = oy + dy * R;
    for (let d = 3; d <= R; d += S) {
      const x = ox + dx * d, y = oy + dy * d;
      if (mover && x > mover.x - 1 && x < mover.x + mover.w + 1 && y > mover.y - 1 && y < mover.y + mover.h + 1) { res.hit = true; ex = x; ey = y; break; }
      const tx = Math.floor(x / T), ty = Math.floor(y / T);
      if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) { ex = x; ey = y; break; }
      const gi = st.ghostAt[ty * COLS + tx];
      if (gi >= 0 && y - ty * T <= MANSION.slab) { res.plats.add(gi); ex = x; ey = y; break; }
      if (grid[ty][tx] === '#') { ex = x; ey = y; break; }
      let hb = -1;
      for (const b of st.books) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { hb = b.id; break; }
      if (hb >= 0) { res.plats.add(hb); ex = x; ey = y; break; }
    }
    res.pts.push(ex, ey);
  }
  return res;
}
// is the point inside the beam fan of a cast?
function mansionLitAt(cs, x, y) {
  if (!cs) return false;
  const P = cs.pts, n = P.length / 2;
  let inside = false;
  const vx = k => (k < 0 ? cs.ox : P[k * 2]), vy = k => (k < 0 ? cs.oy : P[k * 2 + 1]);
  for (let i = -1, j = n - 1; i < n; j = i++) {
    const xi = vx(i), yi = vy(i), xj = vx(j), yj = vy(j);
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const mansionHalf = st => (st.narrow ? MANSION.halfNarrow : MANSION.half);

function mansionBeam(st, h, m, dt) {
  st.cast = null;
  for (const pl of st.plats) pl.lit = false;
  if (st.light && h.alive && st.phase === 'play') {
    const o = mansionOrigin(h, h.face);
    st.cast = mansionCast(st, o.x, o.y, h.face, st.tilt, mansionHalf(st), m.alive && st.safeT <= 0 ? m : null);
    for (const id of st.cast.plats) st.plats[id].lit = true;
  }
  const awake = st.wide ? MANSION.wideAwake : MANSION.awake;
  for (const pl of st.plats) {
    const was = pl.t > 0;
    if (pl.lit) { pl.t = awake; pl.seen = 1; } else pl.t = Math.max(0, pl.t - dt);
    if (pl.t > 0 && !was) { pl.wake = 1; Sfx.play('mansionWake'); if (MODES.mansion.rand() < 0.5) mansionPop(st, pl.x + pl.w / 2, pl.y - 14, MODES.mansion.rand() < 0.5 ? 'hee hee!' : 'tee hee!', '#b8ffe6', 13); st.stats.woken++; }
    if (pl.t <= 0 && was) Sfx.play('mansionDoze');
    pl.wake = Math.max(0, pl.wake - dt * 3);
  }
}
// static ghosts live in the tile grid as one-way planks while they are awake (so jumps, landings and the computer's map
// all work the usual way); for the holder they are taken out while the holder moves
function mansionSync(st) {
  const g = G.level.grid;
  for (const pl of st.plats) if (!pl.book) { const ch = mansionSolid(pl) ? '=' : '.'; for (let c = pl.c0; c <= pl.c1; c++) g[pl.r][c] = ch; }
}
function mansionHide(st, hide) {
  const g = G.level.grid;
  for (const pl of st.plats) if (!pl.book && mansionSolid(pl)) for (let c = pl.c0; c <= pl.c1; c++) g[pl.r][c] = hide ? '.' : '=';
}

/* ---------- floating ghost books (Library): they drift up and down, and lift the mover while awake ---------- */
function mansionBookY(b, s) {
  const tr = (b.period - 2 * b.pause) / 2, k = s % b.period, ease = u => u * u * (3 - 2 * u);
  if (k < b.pause) return b.y0;
  if (k < b.pause + tr) return b.y0 + (b.y1 - b.y0) * ease((k - b.pause) / tr);
  if (k < 2 * b.pause + tr) return b.y1;
  return b.y1 + (b.y0 - b.y1) * ease((k - 2 * b.pause - tr) / tr);
}
function mansionBooks(st, dt) {
  for (const b of st.books) { b.s += dt; const ny = mansionBookY(b, b.s); b.dy = ny - b.y; b.y = ny; }
}
function mansionRide(st, p) {
  const b = st.ride;
  if (!b) return;
  if (!mansionSolid(b) || p.x >= b.x + b.w - 1 || p.x + p.w <= b.x + 1) { st.ride = null; return; }
  moveY(p, (b.y - p.h) - p.y, true);
}
function mansionBookLand(st, p, prevBottom) {
  let on = null;
  for (const b of st.books) {
    if (!mansionSolid(b) || p.vy < 0) continue;
    if (p.x >= b.x + b.w - 1 || p.x + p.w <= b.x + 1) continue;
    const top = b.y, was = prevBottom <= top + 2 + Math.max(0, -b.dy);
    if (was && p.y + p.h >= top - 0.5) { if (st.ride !== b && p.vy > 200) { Sfx.play('land'); p.sx = 1.2; p.sy = 0.82; } p.y = top - p.h; p.vy = 0; on = b; break; }
  }
  st.ride = on;
}
function mansionBookGround(st, p) {
  if (!st.ride) return;
  p.grounded = true; p.tileGround = true; p.onOneWay = false; p.lastVy = 0; p.jumping = false;
}

/* ---------- moving the players (own step: partners pass through each other here) ---------- */
function mansionMove(st, p, dt, isMover) {
  const o = other(p), oa = o.alive, saved = p.input;
  let inp = saved;
  if (isMover && st.frz.on) { inp = NO_INPUT; p.pendingJump = false; p.jumpBuf = 0; }
  if (!isMover && st.light) { inp = { left: saved.left, right: saved.right, jump: false, down: false, up: false, act: false }; p.pendingJump = false; p.jumpBuf = 0; }
  const hide = !isMover;
  o.alive = false;
  if (hide) mansionHide(st, true);
  p.input = inp;
  try {
    if (isMover) mansionRide(st, p);
    control(p, dt);
    if (isMover && st.frz.on) p.vx = 0;
    if (p.alive) {
      const prevB = p.y + p.h;
      moveX(p, p.vx * dt, true); moveY(p, p.vy * dt, true);
      if (isMover) mansionBookLand(st, p, prevB);
      postStep(p);
      if (isMover) mansionBookGround(st, p);
    }
  } finally { p.input = saved; o.alive = oa; if (hide) mansionHide(st, false); }
}

/* ---------- the holder's flashlight and the mover's freeze ---------- */
function mansionHolder(st, h, dt) {
  if (h.pendingAct) {
    h.pendingAct = false;
    if (h.alive) {
      st.light = !st.light; st.stats.clicks++;
      Sfx.play(st.light ? 'mansionClickOn' : 'mansionClickOff', h.id); rumble(h.id, 0, 0.2, 50);
    }
  }
  if (st.light && h.alive) {
    const up = h.input.up || h.input.jump, dn = h.input.down;
    st.tilt = clamp(st.tilt + ((up ? 1 : 0) - (dn ? 1 : 0)) * MANSION.tiltV * dt, -MANSION.tiltMax, MANSION.tiltMax);
  }
}
function mansionFreeze(st, m, dt) {
  const f = st.frz, hit = !!(st.cast && st.cast.hit) && m.alive;
  st.safeT = Math.max(0, st.safeT - dt);
  if (hit) {
    if (!f.on) {
      f.on = true; f.t = 0;
      if (f.endT > MANSION.eepGap) {
        st.stats.eeps[m.id]++; st.roomEeps++;
        mansionPop(st, m.x + m.w / 2, m.y - 16, 'Eep!', '#fff2a8', 20);
        Sfx.play('mansionEep', m.id); rumble(m.id, 0.3, 0.4, 120);
        if (!st.narrow && st.roomEeps >= MANSION.narrowEeps) { st.narrow = true; mansionNews(st, 'Narrow beam! It’s easier to keep the light off ' + NAMES[m.id], true); Sfx.play('mansionGold'); }
      }
      m.vy = Math.max(m.vy, -60); m.vx = 0; m.jumping = false;
    }
    f.after = MANSION.shake;
  } else if (f.on) { f.after -= dt; if (f.after <= 0) { f.on = false; f.endT = 0; } }
  if (f.on) f.t += dt; else f.endT += dt;
  if (f.on && !reduceMotion) { const k = Math.sin(G.clock * 70) * 0.05; m.sx = 1 + k; m.sy = 1 - k; }
}

/* ---------- portraits: the mover swaps Pip and Bo ---------- */
function mansionPortraitAt(st, p) {
  for (const pt of st.portraits) if (Math.abs(p.x + p.w / 2 - pt.x) <= MANSION.portraitReach && Math.abs(p.y + p.h - pt.y) < 8) return pt;
  return null;
}
function mansionSwap(st, pt) {
  const a = G.players[0], b = G.players[1];
  puff(a.x + a.w / 2, a.y + a.h / 2, 14, 'rgba(190,120,255,0.9)'); puff(b.x + b.w / 2, b.y + b.h / 2, 14, 'rgba(190,120,255,0.9)');
  const ax = a.x, ay = a.y;
  a.x = b.x; a.y = b.y; b.x = ax; b.y = ay;
  for (const p of G.players) { p.vx = 0; p.vy = 0; p.jumping = false; p.jumpBuf = 0; p.carryVx = 0; p.sx = 0.6; p.sy = 1.4; p.coyote = 0; }
  const s0 = st.safe[0]; st.safe[0] = st.safe[1]; st.safe[1] = s0;
  G.spawnPts = st.safe.map(s => ({ x: s.x, y: s.y }));
  st.ride = null; st.frz.on = false; st.frz.after = 0; st.safeT = MANSION.swapSafe;
  pt.cd = MANSION.swapCD; pt.anim = 1; pt.used++; st.stats.swaps++; st.stuckT = 0;
  for (const p of G.players) { burst(p.x + p.w / 2, p.y + p.h / 2, '#b98cff', 16); rumble(p.id, 0.3, 0.5, 140); }
  mansionPop(st, pt.x, pt.y - 66, 'Poof!', '#d6b8ff', 22);
  Sfx.play('mansionSwap');
}
function mansionMoverAct(st, m, h, dt) {
  st.callCD -= dt;
  if (st.call) { st.call.t += dt; if (st.call.t > MANSION.callLife) st.call = null; }
  for (const pt of st.portraits) { pt.cd = Math.max(0, pt.cd - dt); pt.anim = Math.max(0, pt.anim - dt * 1.4); pt.near = approach(pt.near, mansionPortraitAt(st, m) === pt ? 1 : 0, dt * 5); }
  if (!m.pendingAct) return;
  m.pendingAct = false;
  if (!m.alive) return;
  const pt = mansionPortraitAt(st, m);
  if (pt && pt.cd <= 0 && h.alive) { mansionSwap(st, pt); return; }
  if (st.callCD <= 0) {   // anywhere else the action is a call for light
    st.callCD = MANSION.callCD; st.call = { t: 0, text: 'Light, please!' };
    Sfx.play('mansionCall', m.id); rumble(h.id, 0, 0.3, 80); st.stats.calls++;
  }
}

/* ---------- safe floors, falls, the door ---------- */
function mansionSafeStep(st, dt) {
  for (const p of G.players) {
    if (!p.alive || !p.grounded || st.ride && p.id === st.mover) { st.safeStand[p.id] = 0; continue; }
    const c = Math.floor((p.x + p.w / 2) / T), r = Math.floor((p.y + p.h + 1) / T);
    const ok = tile(c, r) === '#' && tile(Math.floor((p.x + 2) / T), r) === '#' && tile(Math.floor((p.x + p.w - 2) / T), r) === '#';
    st.safeStand[p.id] = ok ? st.safeStand[p.id] + dt : 0;
    if (st.safeStand[p.id] >= 0.25) { st.safe[p.id] = { x: p.x, y: p.y }; G.spawnPts[p.id] = { x: p.x, y: p.y }; }
  }
  // the mover standing on a ghost that dozes off: "Whoops!"
  const m = G.players[st.mover];
  let under = -1;
  if (m.alive && m.grounded) {
    const r = Math.floor((m.y + m.h + 1) / T);
    for (const x of [m.x + 3, m.x + m.w / 2, m.x + m.w - 3]) { const gi = r >= 0 && r < ROWS ? st.ghostAt[mansionIx(Math.floor(x / T), r)] : -1; if (gi >= 0) under = gi; }
    if (st.ride) under = st.ride.id;
  }
  if (under >= 0) { const pl = st.plats[under]; if (!pl.stood) { pl.stood = true; st.stuckT = 0; } }
  if (st.wasOn >= 0 && under < 0 && !st.plats[st.wasOn].t && m.alive && !m.grounded && m.vy >= 0 && !st.frz.on) {
    G.falls++; st.roomFalls++; st.stats.drops++;
    mansionPop(st, m.x + m.w / 2, m.y - 12, 'Whoops!', '#c8fff0', 18); Sfx.play('mansionWhoops', m.id);
    mansionGoldCheck(st);
  }
  st.wasOn = under;
  // the holder drops through an awake ghost: it giggles
  const h = G.players[st.holder];
  st.giggleCD -= dt;
  if (h.alive && st.giggleCD <= 0) for (const pl of st.plats) {
    if (!mansionSolid(pl) || h.x >= pl.x + pl.w || h.x + h.w <= pl.x) continue;
    const fb = h.y + h.h;
    if (fb > pl.y + 2 && fb < pl.y + 16 && h.vy > 0) { st.giggleCD = 4; mansionPop(st, pl.x + pl.w / 2, pl.y - 16, 'Tee-hee! Not you!', '#b8ffe6', 15); Sfx.play('mansionGiggle'); break; }
  }
}
function mansionGoldCheck(st) {
  if (!st.wide && (st.roomFalls >= MANSION.goldFalls || st.stuckT >= MANSION.goldStuck)) {
    st.wide = true; mansionNews(st, 'Wide-awake ghosts! They stay solid longer', true); Sfx.play('mansionGold');
  }
}
function mansionExitStep(st, dt) {
  const d = st.exit;
  if (!d) return;
  const inD = p => { if (!p.alive) return false; const cx = p.x + p.w / 2, cy = p.y + p.h / 2; return cx > d.x + 2 && cx < d.x + d.w - 2 && cy > d.y && cy < d.y + d.h; };
  st.doorIn = G.players.map(inD);
  if (st.doorIn[0] && st.doorIn[1]) { st.exitT += dt; if (st.exitT >= MANSION.exitHold) mansionWin(st); }
  else st.exitT = 0;
}
function mansionWin(st) {
  st.phase = 'won'; st.winT = 0; st.light = false;
  st.stats.roomT[st.k] = st.roomT;
  const d = st.exit, x = d.x + d.w / 2, y = d.y + 10;
  if (st.race) {
    st.race.phase = 'won';
    st.stats.race = { tries: st.race.misses + 1, margin: Math.max(0, (1 - st.race.prog) * st.race.time) };
    st.race.say = 'You win! Boo-ray!'; st.race.sayT = 2.5;
  }
  Sfx.play('mansionRoom'); rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250);
  for (let i = 0; i < 40; i++) confetti(x, y);
}

/* ---------- the ghost race (Attic): Bertie flies his route; both of you must reach the door first ---------- */
function mansionRaceStep(st, dt) {
  const R = st.race;
  if (!R) return;
  if (R.sayT > 0) R.sayT -= dt;
  if (R.phase === 'count') {
    R.t += dt;
    const left = R.wait - R.t, n = Math.ceil(left);
    if (n !== R.lastN && n >= 1 && n <= 3) { R.lastN = n; Sfx.play('mansionTick'); R.say = ['', 'Set...', 'Ready...', 'Ready...'][n] || ''; R.sayT = 0.9; }
    if (left > 3 && R.sayT <= 0 && R.misses > 0) { R.say = 'I’ll count to ' + Math.ceil(left) + '!'; R.sayT = 1; }
    if (R.t >= R.wait) { R.phase = 'go'; R.t = 0; R.say = 'BOO! Catch me!'; R.sayT = 1.6; Sfx.play('mansionGo'); }
    return;
  }
  if (R.phase === 'go') {
    R.t += dt;
    R.prog = Math.min(1, R.t / R.time);
    let d = R.prog * R.len, i = 0;
    while (i < R.segs.length - 1 && d > R.segs[i]) { d -= R.segs[i]; i++; }
    const a = R.pts[i], b = R.pts[i + 1], u = R.segs[i] ? clamp(d / R.segs[i], 0, 1) : 1;
    const nx = a.x + (b.x - a.x) * u, ny = a.y + (b.y - a.y) * u;
    if (Math.abs(nx - R.x) > 0.01) R.face = nx > R.x ? 1 : -1;
    R.x = nx; R.y = ny;
    if (R.sayT <= 0 && MODES.mansion.rand() < dt * 0.25) { R.say = ['Hee hee!', 'Too slow!', 'Wheee!', 'Boo-hoo-hoo!'][Math.floor(MODES.mansion.rand() * 4)]; R.sayT = 1.3; }
    if (R.prog >= 1) {
      R.phase = 'lost'; R.lostT = 0; st.stats.raceMisses++;
      R.say = 'I win! Again?'; R.sayT = 2.4;
      Sfx.play('mansionLose');
      for (let k = 0; k < 20; k++) confetti(R.x, R.y);
    }
    return;
  }
  if (R.phase === 'lost') {
    R.lostT += dt;
    if (R.lostT >= MANSION.lostHold) mansionRaceReset(st);
  }
}
function mansionRaceReset(st) {
  const L = G.level, misses = st.race.misses + 1;
  st.raceMisses = misses;
  G.players.forEach((p, k) => {
    const input = p.input;
    Object.assign(p, makePlayer(k), { x: L.spawns[k].x, y: L.spawns[k].y, input, prevJump: true, prevAct: true, sx: 0.6, sy: 1.4, face: 1 });
    burst(p.x + p.w / 2, p.y + p.h / 2, '#b98cff', 12);
  });
  for (const pl of st.plats) { pl.t = 0; pl.stood = false; if (pl.book) { pl.s = 0; pl.y = pl.y0; } }
  mansionSync(st);
  st.light = false; st.tilt = 0.35; st.ride = null; st.frz = { on: false, after: 0, t: 0, endT: 9 }; st.exitT = 0; st.wasOn = -1;
  st.safe = G.players.map(p => ({ x: p.x, y: p.y })); G.spawnPts = st.safe.map(s => ({ ...s }));
  st.race = mansionNewRace(G.level.def.race, misses);
  mansionNews(st, misses >= 2 ? 'Head start! And sleepy Bertie flies slower now' : 'Head start! Bertie counts to ' + Math.round(st.race.wait) + ' first', true, 4.2);
  Sfx.play('mansionGold');
}

/* ---------- help: gold, the bat, nudges ---------- */
function mansionNews(st, s, gold, life) { st.news = { s, gold: !!gold, t: 0, life: life || MANSION.newsLife }; }
function mansionPop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || C.gold, size: size || 18, t: 0 }); }
// the designed route's next stop: the first portrait in the plan nobody has used yet, else the door
function mansionNextStop(st) {
  for (const step of st.plan) if (step.portrait != null) { const pt = st.portraits[step.portrait]; if (pt && !pt.used) return { x: pt.x, y: pt.y - 70, kind: 'portrait', pt }; }
  const d = st.exit;
  return d ? { x: d.x + d.w / 2, y: d.y - 34, kind: 'door' } : null;
}
function mansionHelp(st, dt) {
  st.stuckT += dt;
  if (st.stuckT >= MANSION.goldStuck) mansionGoldCheck(st);
  const bat = st.bat;
  bat.flap += dt;
  const stop = mansionNextStop(st);
  bat.on = st.stuckT >= MANSION.batAfter && !!stop && st.phase === 'play' && !(st.race && st.race.phase !== 'go');
  if (bat.on) { bat.t += dt; bat.x += (stop.x - bat.x) * Math.min(1, dt * 2); bat.y += (stop.y + Math.sin(bat.t * 3) * 6 - bat.y) * Math.min(1, dt * 2); if (Math.floor(bat.t / 3) !== Math.floor((bat.t - dt) / 3)) Sfx.play('mansionSqueak'); }
  else { bat.t = 0; bat.x += (W / 2 - bat.x) * Math.min(1, dt); bat.y += (-40 - bat.y) * Math.min(1, dt); }
  const m = G.players[st.mover];
  st.nudge.frozenT = st.frz.on ? st.nudge.frozenT + dt : 0;
  const pt = mansionPortraitAt(st, m), stp = mansionNextStop(st);
  st.nudge.portT = pt && stp && stp.pt === pt && m.grounded ? st.nudge.portT + dt : 0;
}
function mansionFx(st, dt) {
  st.pops = st.pops.filter(q => (q.t += dt) < 1.3);
  if (st.news) { st.news.t += dt; if (st.news.t > st.news.life) st.news = null; }
  const c = st.cat;
  if (c) {
    c.cd -= dt; c.mew = Math.max(0, c.mew - dt);
    const near = G.players.find(p => p.alive && Math.abs(p.x + p.w / 2 - c.x) < 46 && Math.abs(p.y + p.h - c.y) < 40);
    if (near) { c.look = approach(c.look, near.x + near.w / 2 > c.x ? 1 : -1, dt * 4); if (c.cd <= 0) { c.cd = 7; c.mew = 1.1; Sfx.play('mansionMew'); } }
  }
}

/* ---------- the tick (ownStep) ---------- */
function mansionStep(st, dt) {
  const h = G.players[st.holder], m = G.players[st.mover];
  mansionLegendTick(st);
  if (st.phase === 'won') {
    st.winT += dt;
    if (st.winT < 1.0 && G.tickN % 14 === 0 && st.exit) confetti(st.exit.x + st.exit.w / 2, st.exit.y);
    if (st.winT >= MANSION.winHold) { const L = G.level; if (L.def.roomIndex < L.def.roomCount - 1) nextRoom(); else levelClear(); }
    return;
  }
  if (G.introT > MANSION.introHold) { for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; } return; }
  st.roomT += dt;
  if (st.race) {
    mansionRaceStep(st, dt);
    if (st.race.phase === 'lost') { for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; } mansionFx(st, dt); return; }
  }
  mansionBooks(st, dt);
  mansionHolder(st, h, dt);
  mansionBeam(st, h, m, dt);
  mansionSync(st);
  mansionFreeze(st, m, dt);
  mansionMove(st, m, dt, true);
  mansionMove(st, h, dt, false);
  mansionMoverAct(st, m, h, dt);
  if (h.pendingAct) h.pendingAct = false;
  mansionSafeStep(st, dt);
  mansionExitStep(st, dt);
  mansionHelp(st, dt);
  mansionFx(st, dt);
}
// (the legend and touch labels follow each room's jobs; re-checked now and then in case the page rebuilt them)
function mansionLegendTick(st) { if ((G.tickN % 120) === 0) mansionActLabels(st); }

/* ---------- drawing ---------- */
let mansionBack = null;
const MANSION_WALL = { foyer: ['#3e2c64', '#2c1f4a'], library: ['#3a2a52', '#2a1d3e'], gallery: ['#45284f', '#2f1b3a'], attic: ['#3b2e4a', '#271d33'] };
function mansionPaintBack(c, st, L) {
  const [w0, w1] = MANSION_WALL[st.style] || MANSION_WALL.foyer;
  const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, w0); gr.addColorStop(1, w1);
  c.fillStyle = gr; c.fillRect(0, 0, W, H);
  // wallpaper: little diamonds and stripes (the attic has bare boards)
  if (st.style === 'attic') {
    c.fillStyle = 'rgba(255,230,200,0.04)';
    for (let x = 0; x < W; x += 24) c.fillRect(x, 0, 2, H);
    c.strokeStyle = 'rgba(20,12,30,0.55)'; c.lineWidth = 16;
    c.beginPath(); c.moveTo(0, 260); c.lineTo(W / 2, 20); c.lineTo(W, 260); c.stroke();
    c.lineWidth = 8; for (const x of [150, 330, 630, 810]) { c.beginPath(); c.moveTo(x, x < W / 2 ? 260 - x * 0.93 + 20 : 260 - (W - x) * 0.93 + 20); c.lineTo(x, H); c.stroke(); }
  } else {
    c.fillStyle = 'rgba(255,255,255,0.035)';
    for (let x = 0; x < W; x += 48) c.fillRect(x, 0, 14, H);
    c.fillStyle = 'rgba(255,214,150,0.07)';
    for (let y = 18; y < H; y += 40) for (let x = (y / 40) % 2 ? 24 : 0; x < W; x += 48) { c.beginPath(); c.moveTo(x, y - 5); c.lineTo(x + 4, y); c.lineTo(x, y + 5); c.lineTo(x - 4, y); c.closePath(); c.fill(); }
  }
  for (const d of st.deco) mansionPaintDeco(c, d);
  // stone and wood: floorboards on top, panelled walls, a dark frame around the room
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    if (L.grid[ty][tx] !== '#') continue;
    const x = tx * T, y = ty * T, open = (a, b) => { const ch = tile(a, b); return ch !== '#'; };
    const edge = tx <= 1 || tx >= COLS - 2 || ty <= 0 || ty >= ROWS - 2;
    c.fillStyle = edge ? '#1f1630' : '#4a3352'; c.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
    if (!edge) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(x + 2, y + 4, T - 4, T - 8); c.fillStyle = 'rgba(255,220,180,0.06)'; c.fillRect(x + 3, y + 5, T - 6, 2); }
    else if ((tx + ty) % 2 === 0) { c.fillStyle = 'rgba(255,255,255,0.03)'; c.fillRect(x + 3, y + 3, 12, 8); }
    if (ty > 0 && open(tx, ty - 1)) {
      c.fillStyle = '#6b4127'; c.fillRect(x, y, T, 9);
      c.fillStyle = '#9b6a40'; c.fillRect(x, y, T, 6);
      c.fillStyle = 'rgba(60,30,15,0.5)'; c.fillRect(x + (hash(tx, ty) % 18) + 4, y + 1, 2, 5);
      c.fillStyle = 'rgba(255,230,180,0.25)'; c.fillRect(x, y, T, 1.5);
    }
    if (open(tx, ty + 1) && ty < ROWS - 1) { c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x, y + T - 3, T, 3); }
  }
  // cobwebs in the room's top corners
  mansionWeb(c, 2 * T, T, 1); mansionWeb(c, (COLS - 2) * T, T, -1);
}
function mansionWeb(c, x, y, dir) {
  c.strokeStyle = 'rgba(230,225,255,0.28)'; c.lineWidth = 1;
  for (let k = 0; k < 5; k++) { const a = k / 4 * Math.PI / 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + dir * Math.cos(a) * 46, y + Math.sin(a) * 46); c.stroke(); }
  for (let r = 12; r <= 40; r += 10) { c.beginPath(); for (let k = 0; k <= 4; k++) { const a = k / 4 * Math.PI / 2, rr2 = r * (k % 2 ? 0.86 : 1); const px = x + dir * Math.cos(a) * rr2, py = y + Math.sin(a) * rr2; if (k) c.lineTo(px, py); else c.moveTo(px, py); } c.stroke(); }
}
function mansionPaintDeco(c, d) {
  const x = d.x, y = d.y;
  if (d.kind === 'window') {
    const w = d.w || 70, h = d.h || 100;
    c.fillStyle = '#1b1430'; c.beginPath(); c.moveTo(x - w / 2 - 6, y + h + 4); c.lineTo(x - w / 2 - 6, y + w / 2); c.arc(x, y + w / 2, w / 2 + 6, Math.PI, 0); c.lineTo(x + w / 2 + 6, y + h + 4); c.closePath(); c.fill();
    const sky = c.createLinearGradient(0, y, 0, y + h); sky.addColorStop(0, '#2b2155'); sky.addColorStop(1, '#a8587a');
    c.fillStyle = sky; c.beginPath(); c.moveTo(x - w / 2, y + h); c.lineTo(x - w / 2, y + w / 2); c.arc(x, y + w / 2, w / 2, Math.PI, 0); c.lineTo(x + w / 2, y + h); c.closePath(); c.fill();
    if (d.moon) { c.fillStyle = 'rgba(255,160,80,0.35)'; c.beginPath(); c.arc(x + 8, y + 34, 22, 0, Math.PI * 2); c.fill(); c.fillStyle = '#ffb867'; c.beginPath(); c.arc(x + 8, y + 34, 14, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(200,110,50,0.4)'; c.beginPath(); c.arc(x + 4, y + 31, 3, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#ffffff'; for (let k = 0; k < 4; k++) c.fillRect(x - w / 2 + 8 + (hash(k, x) % (w - 16)), y + 16 + (hash(x, k) % 50), 1.5, 1.5);
    c.fillStyle = '#1b1430'; c.fillRect(x - 2, y + 4, 4, h); c.fillRect(x - w / 2, y + h * 0.55, w, 4);
    c.fillStyle = 'rgba(20,12,30,0.8)'; // a little bat silhouette
    c.beginPath(); c.moveTo(x - 16, y + 60); c.quadraticCurveTo(x - 10, y + 54, x - 6, y + 60); c.quadraticCurveTo(x - 2, y + 56, x + 2, y + 60); c.quadraticCurveTo(x - 6, y + 64, x - 16, y + 60); c.fill();
  } else if (d.kind === 'frame') {
    const w = d.w || 40, h = d.h || 50;
    c.fillStyle = '#8a6a2a'; c.fillRect(x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8);
    c.fillStyle = '#d9b35a'; c.fillRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4);
    c.fillStyle = d.bg || '#3b5a6a'; c.fillRect(x - w / 2, y - h / 2, w, h);
    if (d.art === 'pumpkin') { c.fillStyle = '#ff8a2a'; c.beginPath(); c.ellipse(x, y + 4, w * 0.3, h * 0.24, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#3a6a2a'; c.fillRect(x - 2, y - h * 0.24, 4, 7); c.fillStyle = '#2a1a10'; c.fillRect(x - 6, y, 4, 4); c.fillRect(x + 3, y, 4, 4); }
    else if (d.art === 'moon') { c.fillStyle = '#ffe2a0'; c.beginPath(); c.arc(x, y, w * 0.26, 0, Math.PI * 2); c.fill(); c.fillStyle = d.bg || '#3b5a6a'; c.beginPath(); c.arc(x + 6, y - 4, w * 0.24, 0, Math.PI * 2); c.fill(); }
    else if (d.art === 'cat') { c.fillStyle = '#1a1424'; c.beginPath(); c.ellipse(x, y + 8, w * 0.22, h * 0.24, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(x, y - 6, w * 0.16, 0, Math.PI * 2); c.fill(); c.fillStyle = '#ffd84a'; c.fillRect(x - 4, y - 8, 3, 2); c.fillRect(x + 2, y - 8, 3, 2); }
    else { c.fillStyle = '#eef3ff'; c.beginPath(); c.arc(x, y - 4, w * 0.22, Math.PI, 0); c.lineTo(x + w * 0.22, y + h * 0.26); c.lineTo(x - w * 0.22, y + h * 0.26); c.closePath(); c.fill(); c.fillStyle = '#1c1a36'; c.fillRect(x - 5, y - 6, 3, 4); c.fillRect(x + 3, y - 6, 3, 4); }
  } else if (d.kind === 'shelf') {   // a background bookcase (library)
    const w = d.w || 120, h = d.h || 150;
    c.fillStyle = '#3a2418'; c.fillRect(x, y, w, h);
    const cols = ['#c0504d', '#4f81bd', '#9bbb59', '#e0a040', '#8064a2', '#4bacc6', '#d07c9a'];
    for (let sy = y + 8; sy < y + h - 20; sy += 34) {
      let bx = x + 6;
      while (bx < x + w - 10) { const bw = 6 + (hash(bx, sy) % 7), bh = 18 + (hash(sy, bx) % 9); c.fillStyle = cols[hash(bx, sy) % cols.length]; c.globalAlpha = 0.55; c.fillRect(bx, sy + 26 - bh, bw, bh); c.globalAlpha = 1; bx += bw + 1; }
      c.fillStyle = '#5a3a24'; c.fillRect(x, sy + 26, w, 5);
    }
  } else if (d.kind === 'pillar') {
    const h = d.h || 200;
    c.fillStyle = 'rgba(30,18,40,0.55)'; c.fillRect(x - 14, y, 28, h);
    c.fillStyle = 'rgba(255,230,200,0.06)'; c.fillRect(x - 10, y, 5, h);
    c.fillStyle = 'rgba(30,18,40,0.7)'; c.fillRect(x - 20, y, 40, 10); c.fillRect(x - 20, y + h - 10, 40, 10);
  } else if (d.kind === 'carpet') {
    c.fillStyle = '#7a2238'; c.fillRect(x, y - 3, d.w || 200, 3);
    c.fillStyle = '#c9a240'; for (let k = x + 6; k < x + (d.w || 200); k += 14) c.fillRect(k, y - 3, 6, 1.2);
  } else if (d.kind === 'stairs') {   // the old broken staircase (why you need the ghosts!)
    c.strokeStyle = 'rgba(20,12,30,0.6)'; c.lineWidth = 3; c.fillStyle = 'rgba(110,70,50,0.35)';
    const n = d.n || 6, sx = d.dx || 30, sy2 = d.dy || 30;
    for (let k = 0; k < n; k++) { if ((d.broken || []).includes(k)) continue; c.fillRect(x + k * sx, y - k * sy2, sx, 8); }
    c.beginPath(); c.moveTo(x, y + 8); c.lineTo(x + n * sx, y - n * sy2 + 8); c.stroke();
  } else if (d.kind === 'trunk') {
    c.fillStyle = '#6a3e24'; c.fillRect(x, y - 30, 56, 30); c.fillStyle = '#8a5432'; c.fillRect(x, y - 36, 56, 10);
    c.fillStyle = '#d9b35a'; c.fillRect(x + 25, y - 30, 6, 8); c.fillRect(x + 6, y - 36, 4, 36); c.fillRect(x + 46, y - 36, 4, 36);
  } else if (d.kind === 'boxes') {
    c.fillStyle = '#7a5a3a'; c.fillRect(x, y - 34, 40, 34); c.fillRect(x + 44, y - 24, 30, 24); c.fillRect(x + 8, y - 60, 30, 26);
    c.strokeStyle = 'rgba(40,24,14,0.6)'; c.lineWidth = 2; c.strokeRect(x, y - 34, 40, 34); c.strokeRect(x + 44, y - 24, 30, 24); c.strokeRect(x + 8, y - 60, 30, 26);
  } else if (d.kind === 'rails') {   // a balcony railing (scenery only)
    c.fillStyle = 'rgba(160,110,70,0.75)'; c.fillRect(x, y - 22, d.w, 4);
    for (let k = x + 4; k < x + d.w; k += 12) c.fillRect(k, y - 20, 3, 20);
  } else if (d.kind === 'round') {   // the attic's round window
    c.fillStyle = '#1b1430'; c.beginPath(); c.arc(x, y, 40, 0, Math.PI * 2); c.fill();
    const sky = c.createLinearGradient(0, y - 34, 0, y + 34); sky.addColorStop(0, '#2b2155'); sky.addColorStop(1, '#c06a6a');
    c.fillStyle = sky; c.beginPath(); c.arc(x, y, 34, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffb867'; c.beginPath(); c.arc(x + 10, y - 6, 12, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1b1430'; c.fillRect(x - 34, y - 2, 68, 4); c.fillRect(x - 2, y - 34, 4, 68);
  }
}
function mansionDrawBack(st) {
  const L = G.level, cw = canvas.width, ch = canvas.height;
  try {
    if (!mansionBack || mansionBack.L !== L || mansionBack.cv.width !== cw || mansionBack.cv.height !== ch) {
      const cv = (mansionBack && mansionBack.cv) || document.createElement('canvas');
      cv.width = cw; cv.height = ch;
      const c = cv.getContext('2d');
      c.setTransform(cw / W, 0, 0, ch / H, 0, 0); c.clearRect(0, 0, W, H);
      mansionPaintBack(c, st, L);
      mansionBack = { cv, L };
    }
    ctx.drawImage(mansionBack.cv, 0, 0, W, H);
  } catch (e) { mansionBack = null; mansionPaintBack(ctx, st, L); }
}
function mansionCandle(cd, t) {
  const x = cd.x, y = cd.y, fl = reduceMotion ? 0 : Math.sin(t * 9 + cd.ph) * 1.2 + Math.sin(t * 23 + cd.ph) * 0.6;
  ctx.fillStyle = '#8a6a2a'; ctx.fillRect(x - 8, y - 4, 16, 4); ctx.fillRect(x - 2, y - 30, 4, 26); ctx.fillRect(x - 10, y - 32, 20, 3);
  for (const dx of [-8, 0, 8]) {
    ctx.fillStyle = '#f4ead2'; ctx.fillRect(x + dx - 2, y - 44, 4, 12);
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.ellipse(x + dx, y - 49 + fl * 0.3, 2.6, 5 + fl * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.ellipse(x + dx, y - 48, 1.2, 2.4, 0, 0, Math.PI * 2); ctx.fill();
  }
}
function mansionGlow(x, y, r, a, col) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col.replace('A', String(a))); g.addColorStop(1, col.replace('A', '0'));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
// a sleepy sheet ghost lying flat: the platform. a: how awake (0 asleep .. 1 awake), book: a floating ghost book instead
function mansionDrawGhost(pl, t) {
  const x = pl.x, y = pl.y, w = pl.w, awake = mansionSolid(pl), left = pl.t;
  let a = awake ? 1 : 0;
  if (awake && left < MANSION.flicker && !MODES.mansion.debug) a = 0.45 + 0.55 * (Math.sin(t * 30) > 0 ? 1 : 0.2);
  const bob = reduceMotion ? 0 : Math.sin(t * 2.2 + pl.ph) * (awake ? 0.8 : 1.6), yy = y + bob - pl.wake * 4;
  ctx.save();
  if (!awake) {
    // asleep: a faint dotted outline with closed eyes (and a little "z" now and then)
    ctx.globalAlpha = 0.32 + 0.1 * Math.sin(t * 1.5 + pl.ph);
    ctx.strokeStyle = '#d7f7ff'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    mansionGhostPath(x, yy, w, pl.book); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(215,247,255,0.08)'; mansionGhostPath(x, yy, w, pl.book); ctx.fill();
    ctx.strokeStyle = '#d7f7ff'; ctx.lineWidth = 1.5;
    for (const ex of [x + w / 2 - 7, x + w / 2 + 7]) { ctx.beginPath(); ctx.arc(ex, yy + 5, 2.5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
    const zp = (t * 0.6 + pl.ph) % 3;
    if (zp < 1.2) { ctx.globalAlpha = 0.45 * Math.sin(zp / 1.2 * Math.PI); text('z', x + w - 6 + zp * 6, yy - 6 - zp * 10, 12, '#d7f7ff', 'center', 'body'); }
  } else {
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(140,255,215,0.22)'; rr(x - 4, yy - 6, w + 8, MANSION.slab + 14, 10); ctx.fill();
    ctx.fillStyle = '#c8fff0'; mansionGhostPath(x, yy, w, pl.book); ctx.fill();
    ctx.strokeStyle = '#3fbf96'; ctx.lineWidth = 1.5; mansionGhostPath(x, yy, w, pl.book); ctx.stroke();
    if (pl.book) { ctx.strokeStyle = 'rgba(60,140,120,0.55)'; ctx.lineWidth = 1; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + w / 2, yy + 2); ctx.quadraticCurveTo(x + w / 2 - k * 10, yy - 2, x + 6 + (3 - k) * 6, yy + 3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + w / 2, yy + 2); ctx.quadraticCurveTo(x + w / 2 + k * 10, yy - 2, x + w - 6 - (3 - k) * 6, yy + 3); ctx.stroke(); } }
    ctx.fillStyle = C.ink;
    for (const ex of [x + w / 2 - 7, x + w / 2 + 7]) { ctx.beginPath(); ctx.ellipse(ex, yy + 5, 2, 2.6, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,140,170,0.6)'; circle(x + w / 2 - 12, yy + 8, 2); ctx.fill(); circle(x + w / 2 + 12, yy + 8, 2); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(x + w / 2, yy + 7, 2.6, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    if (left < MANSION.awake * 0.98 && !MODES.mansion.debug) {   // a little ring: how long it stays awake
      const max = G.mst.wide ? MANSION.wideAwake : MANSION.awake;
      ctx.strokeStyle = 'rgba(63,191,150,0.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x + w - 7, yy - 7, 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(left / max, 0, 1)); ctx.stroke();
    }
  }
  ctx.restore();
}
function mansionGhostPath(x, y, w, book) {
  const h = MANSION.slab;
  ctx.beginPath();
  if (book) { ctx.moveTo(x + 2, y + 2); ctx.quadraticCurveTo(x + w / 4, y - 4, x + w / 2, y + 2); ctx.quadraticCurveTo(x + 3 * w / 4, y - 4, x + w - 2, y + 2); ctx.lineTo(x + w - 2, y + h); ctx.lineTo(x + 2, y + h); ctx.closePath(); return; }
  ctx.moveTo(x + 2, y + h); ctx.lineTo(x + 2, y + 5); ctx.quadraticCurveTo(x + 2, y, x + 8, y); ctx.lineTo(x + w - 8, y); ctx.quadraticCurveTo(x + w - 2, y, x + w - 2, y + 5); ctx.lineTo(x + w - 2, y + h);
  const n = Math.max(3, Math.round(w / 10)), sw = (w - 4) / n;
  for (let k = n - 1; k >= 0; k--) ctx.quadraticCurveTo(x + 2 + sw * (k + 0.5), y + h + 5, x + 2 + sw * k, y + h);
  ctx.closePath();
}
function mansionDrawPortrait(st, pt, t) {
  const x = pt.x, base = pt.y, w = 40, h = 50, y = base - 62;
  const glowA = 0.18 + 0.12 * Math.sin(t * 3 + pt.i) + pt.near * 0.25 + pt.anim * 0.4;
  mansionGlow(x, y + h / 2, 48, glowA.toFixed(3), 'rgba(185,120,255,A)');
  ctx.fillStyle = '#7a5a1a'; rr(x - w / 2 - 6, y - 6, w + 12, h + 12, 4); ctx.fill();
  ctx.fillStyle = '#e0b85a'; rr(x - w / 2 - 4, y - 4, w + 8, h + 8, 3); ctx.fill();
  ctx.fillStyle = '#5a3a8a'; ctx.fillRect(x - w / 2, y, w, h);
  // the painted ancestor: a ghost with a moustache, a skeleton in a top hat, or a pumpkin-head lady
  const look = clamp((G.players[st.mover].x - x) / 120, -1, 1) * 2.5, sw = pt.anim > 0 ? Math.sin(pt.anim * 20) * 3 : 0;
  if (pt.art === 0) {
    ctx.fillStyle = '#eef3ff'; ctx.beginPath(); ctx.arc(x, y + 22, 12, Math.PI, 0); ctx.lineTo(x + 12, y + h - 4); ctx.lineTo(x - 12, y + h - 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.ink; circle(x - 4 + look + sw, y + 21, 2); ctx.fill(); circle(x + 4 + look + sw, y + 21, 2); ctx.fill();
    ctx.strokeStyle = '#3a2a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 7, y + 29); ctx.quadraticCurveTo(x, y + 25, x + 7, y + 29); ctx.stroke();
  } else if (pt.art === 1) {
    ctx.fillStyle = '#f2ede0'; circle(x, y + 24, 10); ctx.fill(); ctx.fillRect(x - 6, y + 32, 12, 6);
    ctx.fillStyle = '#1c1a36'; ctx.fillRect(x - 12, y + 8, 24, 4); ctx.fillRect(x - 8, y - 2, 16, 11);
    ctx.fillStyle = C.ink; circle(x - 4 + look * 0.6 + sw, y + 23, 2.6); ctx.fill(); circle(x + 4 + look * 0.6 + sw, y + 23, 2.6); ctx.fill();
    ctx.fillStyle = '#e0503a'; ctx.fillRect(x - 6, y + 40, 12, 4);
  } else {
    ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.ellipse(x, y + 22, 13, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a6a2a'; ctx.fillRect(x - 2, y + 7, 4, 6);
    ctx.fillStyle = '#ffe36a'; ctx.beginPath(); ctx.moveTo(x - 7 + look, y + 19); ctx.lineTo(x - 3 + look, y + 19); ctx.lineTo(x - 5 + look, y + 15); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 3 + look, y + 19); ctx.lineTo(x + 7 + look, y + 19); ctx.lineTo(x + 5 + look, y + 15); ctx.fill();
    ctx.fillStyle = '#c04a8a'; ctx.beginPath(); ctx.moveTo(x - 12, y + h); ctx.lineTo(x, y + 34); ctx.lineTo(x + 12, y + h); ctx.fill();
  }
  if (pt.anim > 0) { ctx.save(); ctx.globalAlpha = pt.anim; ctx.strokeStyle = '#d6b8ff'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x, y + h / 2, 8 + k * 7 + (1 - pt.anim) * 16, t * 6 + k, t * 6 + k + 4); ctx.stroke(); } ctx.restore(); }
  // a ⇄ swap sign hangs under it
  const big = mansionBig(), sy = base - 6;
  ctx.fillStyle = 'rgba(28,26,54,0.75)'; rr(x - 13, sy - 9, 26, 14, 7); ctx.fill();
  text('⇄', x, sy - 2, big ? 14 : 12, pt.near > 0.5 ? C.gold : '#d6b8ff', 'center', 'body');
}
function mansionDrawDoor(st, t) {
  const d = st.exit; if (!d) return;
  const x = d.x, y = d.y, w = d.w, h = d.h, cx = x + w / 2, open = st.phase === 'won';
  ctx.fillStyle = '#2a1a14'; ctx.beginPath(); ctx.moveTo(x - 4, y + h); ctx.lineTo(x - 4, y + 18); ctx.arc(cx, y + 18, w / 2 + 4, Math.PI, 0); ctx.lineTo(x + w + 4, y + h); ctx.closePath(); ctx.fill();
  if (open) { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#fff2c4'); g.addColorStop(1, C.glow); ctx.fillStyle = g; }
  else ctx.fillStyle = '#7a4a2a';
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + 18); ctx.arc(cx, y + 18, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
  if (!open) {
    ctx.strokeStyle = 'rgba(40,20,10,0.5)'; ctx.lineWidth = 2; for (const k of [0.33, 0.66]) { ctx.beginPath(); ctx.moveTo(x + w * k, y + 6); ctx.lineTo(x + w * k, y + h); ctx.stroke(); }
    ctx.fillStyle = '#ff8a2a'; circle(cx, y + 30, 7); ctx.fill();   // a jack-o'-lantern knocker
    ctx.fillStyle = '#ffe36a'; ctx.fillRect(cx - 4, y + 28, 2.5, 2.5); ctx.fillRect(cx + 1.5, y + 28, 2.5, 2.5); ctx.fillRect(cx - 3, y + 32, 6, 1.5);
  }
  if (st.style === 'attic') text('ATTIC', cx, y - 18, mansionBig() ? 16 : 12, C.gold, 'center');
  for (let i = 0; i < 2; i++) {
    const dx = cx + (i === 0 ? -9 : 9), dy = y - 4;
    circle(dx, dy, 5.5);
    if (st.doorIn && st.doorIn[i]) { ctx.fillStyle = PCOL[i]; ctx.fill(); }
    else { ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill(); ctx.strokeStyle = PCOL[i]; ctx.lineWidth = 2; ctx.stroke(); }
  }
}
function mansionDrawCat(c, t) {
  const x = c.x, y = c.y, f = c.face, blink = (t % 4) < 0.15;
  ctx.fillStyle = '#17121f';
  ctx.beginPath(); ctx.ellipse(x, y - 9, 10, 9, 0, 0, Math.PI * 2); ctx.fill();
  circle(x + f * 7, y - 21, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + f * 2, y - 25); ctx.lineTo(x + f * 4, y - 33); ctx.lineTo(x + f * 8, y - 27); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + f * 8, y - 27); ctx.lineTo(x + f * 12, y - 33); ctx.lineTo(x + f * 13, y - 24); ctx.fill();
  const sw = reduceMotion ? 0 : Math.sin(t * 2) * 6;
  ctx.strokeStyle = '#17121f'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - f * 9, y - 4); ctx.quadraticCurveTo(x - f * 22, y - 8, x - f * 18 + sw, y - 24); ctx.stroke(); ctx.lineCap = 'butt';
  if (!blink) { ctx.fillStyle = '#ffd84a'; const lx = c.look * 1.2; ctx.beginPath(); ctx.ellipse(x + f * 4 + lx, y - 22, 2, 2.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + f * 10 + lx, y - 22, 2, 2.6, 0, 0, Math.PI * 2); ctx.fill(); }
  if (c.mew > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, c.mew * 2); bigText('Mew!', x + f * 14, y - 44 - (1.1 - c.mew) * 10, mansionBig() ? 17 : 13, '#fff'); ctx.restore(); }
}
function mansionDrawBeam(st) {
  const cs = st.cast; if (!cs) return;
  const P = cs.pts;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(cs.ox, cs.oy, 6, cs.ox, cs.oy, MANSION.range);
  g.addColorStop(0, 'rgba(255,236,150,0.42)'); g.addColorStop(0.6, 'rgba(255,220,120,0.2)'); g.addColorStop(1, 'rgba(255,210,110,0.05)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(cs.ox, cs.oy);
  for (let i = 0; i < P.length; i += 2) ctx.lineTo(P[i], P[i + 1]);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
function mansionDraw() {
  const st = G.mst; if (!st.plats) return;
  const t = G.clock;
  mansionDrawBack(st);
  // dim the room; candles and the moon windows keep a warm glow
  ctx.fillStyle = 'rgba(10,6,24,0.34)'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const cd of st.candles) mansionGlow(cd.x, cd.y - 46, 70, (0.16 + (reduceMotion ? 0 : 0.03 * Math.sin(t * 7 + cd.ph))).toFixed(3), 'rgba(255,170,80,A)');
  for (const d of st.deco) if (d.kind === 'window' && d.moon) mansionGlow(d.x + 8, d.y + 34, 80, 0.12, 'rgba(255,160,90,A)');
  ctx.restore();
  for (const cd of st.candles) mansionCandle(cd, t);
  if (st.style === 'foyer') mansionChandelier(W / 2, 30, t);
  for (const pt of st.portraits) mansionDrawPortrait(st, pt, t);
  mansionDrawDoor(st, t);
  if (st.cat) mansionDrawCat(st.cat, t);
  mansionDrawBeam(st);
  for (const pl of st.plats) mansionDrawGhost(pl, t);
}
function mansionChandelier(x, y, t) {
  ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y); ctx.stroke();
  ctx.fillStyle = '#b8902a'; ctx.beginPath(); ctx.ellipse(x, y + 6, 46, 7, 0, 0, Math.PI * 2); ctx.fill();
  for (let k = -2; k <= 2; k++) {
    const cx = x + k * 20, fl = reduceMotion ? 0 : Math.sin(t * 8 + k) * 0.8;
    ctx.fillStyle = '#f4ead2'; ctx.fillRect(cx - 2, y - 6, 4, 9);
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.ellipse(cx, y - 10 + fl * 0.3, 2.4, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; mansionGlow(x, y, 110, 0.12, 'rgba(255,180,90,A)'); ctx.restore();
}
// Bertie, the friendly sheet ghost, with a bow tie and a racing scarf
function mansionDrawBertie(R, t) {
  const x = R.x, y = R.y + (reduceMotion ? 0 : Math.sin(t * 4) * 3), f = R.face, s = mansionBig() ? 1.15 : 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.globalAlpha = 0.95;
  mansionGlow(0, 0, 40, 0.25, 'rgba(220,240,255,A)');
  ctx.fillStyle = '#f4f7ff'; ctx.strokeStyle = '#9aa6c8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-15, 16); ctx.lineTo(-15, -4); ctx.arc(0, -4, 15, Math.PI, 0); ctx.lineTo(15, 16);
  for (let k = 3; k >= 0; k--) ctx.quadraticCurveTo(-15 + 7.5 * (k + 0.5), 22 + (reduceMotion ? 0 : Math.sin(t * 8 + k) * 2), -15 + 7.5 * k, 16);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(-5 + f * 3, -6, 2.6, 3.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(5 + f * 3, -6, 2.6, 3.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff7aa8'; circle(f * 3, 2, 3); ctx.fill();
  ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.moveTo(-1, 9); ctx.lineTo(-8, 5); ctx.lineTo(-8, 13); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(1, 9); ctx.lineTo(8, 5); ctx.lineTo(8, 13); ctx.closePath(); ctx.fill(); circle(0, 9, 2); ctx.fill();
  const fl = reduceMotion ? 0 : Math.sin(t * 12) * 3;
  ctx.strokeStyle = '#8f6bff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-f * 10, 0); ctx.quadraticCurveTo(-f * 22, -2 + fl, -f * 30, 4 - fl); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.restore();
  if (R.say && R.sayT > 0) {
    const fs = mansionBig() ? 18 : 13;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(R.say).width + 18, bx = clamp(x - w / 2, 6, W - w - 6), by = Math.max(6, y - 34 * s - fs - 10);
    ctx.fillStyle = '#f4f7ff'; ctx.strokeStyle = '#8f6bff'; ctx.lineWidth = 2; rr(bx, by, w, fs + 10, 9); ctx.fill(); ctx.stroke();
    text(R.say, bx + w / 2, by + (fs + 10) / 2 + 0.5, fs, '#4a3a8a', 'center', 'body');
  }
}
function mansionDrawBat(b, t) {
  if (b.y < -20) return;
  const s = mansionBig() ? 1.3 : 1, fl = reduceMotion ? 0.5 : Math.abs(Math.sin(b.flap * 12));
  ctx.save(); ctx.translate(b.x, b.y); ctx.scale(s, s);
  ctx.fillStyle = '#6a4a9a';
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 5, 0); ctx.quadraticCurveTo(d * 14, -10 * fl - 2, d * 22, -4 * fl); ctx.quadraticCurveTo(d * 17, 2, d * 12, 4); ctx.quadraticCurveTo(d * 9, 1, d * 5, 4); ctx.closePath(); ctx.fill(); }
  circle(0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-5, -4); ctx.lineTo(-4, -11); ctx.lineTo(-1, -6); ctx.fill(); ctx.beginPath(); ctx.moveTo(5, -4); ctx.lineTo(4, -11); ctx.lineTo(1, -6); ctx.fill();
  ctx.fillStyle = '#fff'; circle(-2.6, -1, 2.4); ctx.fill(); circle(2.6, -1, 2.4); ctx.fill();
  ctx.fillStyle = C.ink; circle(-2.4, -0.6, 1.2); ctx.fill(); circle(2.4, -0.6, 1.2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(-2, 3, 1.5, 2); ctx.fillRect(0.6, 3, 1.5, 2);
  ctx.restore();
  if (b.on && (b.t % 3) < 1.4) { ctx.save(); ctx.globalAlpha = Math.min(1, (b.t % 3) * 3); bigText('This way!', b.x, b.y - 22 * s, mansionBig() ? 17 : 13, C.gold); ctx.restore(); }
}
function mansionFlashlight(st, h) {
  if (!h.alive) return;
  const o = mansionOrigin(h, h.face), a = h.face > 0 ? -st.tilt : Math.PI + st.tilt;
  ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(a);
  ctx.fillStyle = '#5a5a72'; rr(-9, -3.5, 13, 7, 2); ctx.fill();
  ctx.fillStyle = '#8a8aa8'; rr(2, -5, 6, 10, 2); ctx.fill();
  ctx.fillStyle = st.light ? '#fff4b0' : '#3a3a4a'; ctx.fillRect(7, -4, 2.5, 8);
  ctx.restore();
}
// the spooked mover: big round eyes, shiver lines and a sweat drop
function mansionDrawSpooked(st, m, t) {
  if (!m.alive || !st.frz.on) return;
  const cx = m.x + m.w / 2, top = m.y + m.h - m.h * m.sy, ey = top + m.h * 0.4;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2;
  for (const ex of [-5, 5]) { circle(cx + ex, ey, 4.6); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.ink; circle(cx + ex, ey, 1.4); ctx.fill(); ctx.fillStyle = '#fff'; }
  ctx.fillStyle = C.ink; rr(cx - 3, ey + 7, 6, 4, 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
  const j = reduceMotion ? 0 : Math.sin(t * 50) * 1.5;
  for (const d of [-1, 1]) for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(cx + d * (m.w / 2 + 4 + k * 4) + j, top + 4 + k * 7); ctx.lineTo(cx + d * (m.w / 2 + 7 + k * 4) + j, top + 10 + k * 7); ctx.stroke(); }
  ctx.fillStyle = '#8fd8ff'; ctx.beginPath(); ctx.moveTo(cx + m.w / 2 + 2, top - 4); ctx.quadraticCurveTo(cx + m.w / 2 + 6, top + 2, cx + m.w / 2 + 2, top + 4); ctx.quadraticCurveTo(cx + m.w / 2 - 2, top + 2, cx + m.w / 2 + 2, top - 4); ctx.fill();
}
// a dark chip with a coloured title and an optional key line (role hints and nudges)
function mansionChip(t1, t2, x, y, col, avoid) {
  const z = mansionBig() ? 1.45 : 1, f1 = Math.round(13 * z), f2 = Math.round(12 * z);
  ctx.font = '700 ' + f1 + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  let w = ctx.measureText(t1).width;
  if (t2) { ctx.font = '700 ' + f2 + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; w = Math.max(w, ctx.measureText(t2).width); }
  w += 22 * z; const h = (t2 ? 38 : 22) * z;
  const x0 = clamp(x - w / 2, 8, W - 8 - w);
  let y0 = clamp(y - h, 78, H - 8 - h);
  // (stacked above a chip it would cover)
  for (const b of avoid || []) if (x0 < b.x1 + 4 && x0 + w > b.x0 - 4 && y0 < b.y1 + 4 && y0 + h > b.y0 - 4) y0 = b.y0 - h - 6 >= 78 ? b.y0 - h - 6 : b.y1 + 6;
  ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(x0, y0, w, h, 9 * z); ctx.fill();
  text(t1, x0 + w / 2, y0 + 11 * z, f1, col, 'center', 'body');
  if (t2) text(t2, x0 + w / 2, y0 + 28 * z, f2, C.paper, 'center', 'body');
  return { x0, y0, x1: x0 + w, y1: y0 + h };
}
function mansionDrawTop() {
  const st = G.mst; if (!st.plats) return;
  const t = G.clock, h = G.players[st.holder], m = G.players[st.mover], z = mansionBig() ? 1.4 : 1;
  mansionFlashlight(st, h);
  mansionDrawSpooked(st, m, t);
  if (st.race) mansionDrawBertie(st.race, t);
  mansionDrawBat(st.bat, t);
  // the mover's call for light
  if (st.call && m.alive) {
    const k = st.call.t / MANSION.callLife, fs = Math.round(15 * z);
    ctx.save(); ctx.globalAlpha = Math.min(1, (1 - k) * 3);
    ctx.font = fs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const bw = ctx.measureText(st.call.text).width + 18 * z, bh = 24 * z, bx = clamp(m.x + m.w / 2 - bw / 2, 6, W - 6 - bw), by = Math.max(78, m.y - 22 - bh - k * 8);
    ctx.fillStyle = '#fff6e0'; ctx.strokeStyle = PDARK[m.id]; ctx.lineWidth = 2.5; rr(bx, by, bw, bh, 10); ctx.fill(); ctx.stroke();
    text(st.call.text, bx + bw / 2, by + bh / 2, fs, PDARK[m.id], 'center');
    ctx.restore();
  }
  // role badges in the first seconds of the room, then nudges
  const boxes = [];
  if (st.phase === 'play' && G.introT <= MANSION.introHold) {
    const hx = h.x + h.w / 2, mx = m.x + m.w / 2;
    let hy = h.y - 22, my = m.y - 22;
    if (Math.abs(hx - mx) < 170 && Math.abs(hy - my) < 60) { if (hy <= my) hy = my - 46 * z; else my = hy - 46 * z; }
    if (st.roomT < MANSION.badgeT && !(st.race && st.race.misses > 0)) {
      const a = clamp((MANSION.badgeT - st.roomT) / 0.6, 0, 1);
      ctx.save(); ctx.globalAlpha = a;
      if (h.alive) boxes.push(mansionCpu(h.id) ? mansionChip(NAMES[h.id] + ' (computer) has the flashlight', 'it lights the ghosts for you', hx, hy, PCOL[h.id])
        : mansionChip(NAMES[h.id] + ': you have the flashlight!', mansionKeys(h.id, 'hold'), hx, hy, PCOL[h.id]));
      if (m.alive) boxes.push(mansionCpu(m.id) ? mansionChip(NAMES[m.id] + ' (computer) sneaks', 'keep the light off them', mx, my, PCOL[m.id], boxes)
        : mansionChip(NAMES[m.id] + ': hop on lit ghosts!', mansionKeys(m.id, 'move'), mx, my, PCOL[m.id], boxes));
      ctx.restore();
    } else {
      ctx.save(); ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 6);
      if (st.nudge.frozenT > MANSION.nudgeFrozen && h.alive && !st.ride && !mansionCpu(h.id)) boxes.push(mansionChip(NAMES[h.id] + ': light off ' + NAMES[m.id] + '!', NAMES[m.id] + ' can’t move in the light', hx, hy, PCOL[h.id]));
      else if (st.nudge.portT > MANSION.nudgePortrait && m.alive && !mansionCpu(m.id)) boxes.push(mansionChip(NAMES[m.id] + ': press ' + mansionActKey(m.id) + ' to swap!', 'the light goes with ' + NAMES[h.id], mx, my, PCOL[m.id]));
      ctx.restore();
    }
  }
  // pops ("Eep!", "Poof!", "Whoops!"), lifted above any chip they would cover
  for (const q of st.pops) {
    const size = q.size * (mansionBig() ? 1.3 : 1);
    ctx.font = size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const w = ctx.measureText(q.s).width + size * 0.3, hh = size * 1.1, x = clamp(q.x, w / 2 + 6, W - w / 2 - 6);
    let y = Math.max(86, q.y - q.t * 26);
    for (let pass = 0; pass < 2; pass++) for (const b of boxes) if (x + w / 2 > b.x0 && x - w / 2 < b.x1 && y + hh / 2 > b.y0 && y - hh / 2 < b.y1) y = b.y0 - hh / 2 - 3;
    ctx.save(); ctx.globalAlpha = clamp(Math.min(q.t / 0.1, (1.3 - q.t) / 0.4), 0, 1);
    bigText(q.s, x, y, Math.round(size), q.col);
    ctx.restore();
  }
  // banners
  if (st.phase === 'won') {
    const k = Math.min(1, st.winT / 0.3), last = G.level.def.roomIndex >= G.level.def.roomCount - 1;
    bigText(st.race ? 'You beat Bertie!' : last ? 'Mansion cleared!' : 'Room clear!', W / 2, 210, 44, C.gold, 0.6 + 0.4 * k);
    if (st.race && st.stats.race) { ctx.save(); ctx.globalAlpha = k; const s = 'by ' + st.stats.race.margin.toFixed(1) + ' s'; ctx.fillStyle = 'rgba(28,26,54,0.75)'; rr(W / 2 - 70, 236, 140, 28, 14); ctx.fill(); text(s, W / 2, 250.5, 17, C.paper, 'center', 'body'); ctx.restore(); }
  }
  if (st.race && st.race.phase === 'lost') {
    const k = Math.min(1, st.race.lostT / 0.3);
    bigText('Bertie wins this time!', W / 2, 200, 40, '#e6dcff', 0.6 + 0.4 * k);
    ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(W / 2 - 150, 228, 300, 30, 15); ctx.fill(); text('Boo-hoo! Race again, with a head start', W / 2, 243.5, 15, C.gold, 'center', 'body'); ctx.restore();
  }
  if (st.race && st.race.phase === 'count' && G.introT <= 0) {
    const left = st.race.wait - st.race.t;
    if (left <= 3.2) bigText(left > 0.05 ? String(Math.ceil(left)) : 'BOO!', W / 2, 220, 60, C.gold, 1 + 0.3 * (1 - (left % 1)));
  }
}
function mansionHud() {
  const st = G.mst; if (!st.stats) return;
  const big = mansionBig(), fs = big ? 20 : 14, h = big ? 40 : 28;
  const eeps = st.stats.eeps[0] + st.stats.eeps[1];
  const parts = [[fmtTime(G.time), C.paper], ['Eeps ' + eeps, eeps ? '#fff2a8' : C.paper], ['Falls ' + G.falls, G.falls ? '#ffd2a8' : C.paper]];
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const ws = parts.map(q => ctx.measureText(q[0]).width), gap = fs * 1.1;
  const w = ws.reduce((a, b) => a + b, 0) + gap * 2 + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
  let x = x0 + 15;
  parts.forEach((q, i) => { text(q[0], x, cy, fs, q[1], 'left', 'body'); x += ws[i] + gap; });
  // the race bar: Bertie's way to the attic door
  const R = st.race;
  let ny = big ? 86 : 50;
  if (R) {
    const bw = big ? 300 : 240, bh = big ? 30 : 22, bx = W / 2 - bw / 2, by = big ? 58 : 14;
    ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(bx - 70, by, bw + (R.misses ? 150 : 106), bh, bh / 2); ctx.fill();
    text('Bertie', bx - 58, by + bh / 2 + 0.5, big ? 17 : 13, '#e6dcff', 'left', 'body');
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(bx, by + bh / 2 - 4, bw, 8, 4); ctx.fill();
    ctx.fillStyle = R.prog > 0.75 ? '#ff9a7a' : '#b98cff'; if (R.prog > 0) { rr(bx, by + bh / 2 - 4, Math.max(8, bw * R.prog), 8, 4); ctx.fill(); }
    ctx.fillStyle = '#f4f7ff'; circle(bx + bw * R.prog, by + bh / 2, big ? 8 : 6); ctx.fill();
    // the attic door at the end of the bar
    const dx0 = bx + bw + 8, dh = bh - 6, dw = dh * 0.7;
    ctx.fillStyle = '#9b6a40'; ctx.beginPath(); ctx.moveTo(dx0, by + 3 + dh); ctx.lineTo(dx0, by + 3 + dw / 2); ctx.arc(dx0 + dw / 2, by + 3 + dw / 2, dw / 2, Math.PI, 0); ctx.lineTo(dx0 + dw, by + 3 + dh); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.gold; circle(dx0 + dw * 0.7, by + 3 + dh * 0.6, 1.6); ctx.fill();
    text(R.misses ? 'try ' + (R.misses + 1) : '', bx + bw + 14 + dw, by + bh / 2 + 0.5, big ? 15 : 11, C.paper, 'left', 'body');
    ny = by + bh + 6;
  }
  const n = st.news;
  if (n && G.mode === 'play') {
    const a = clamp(Math.min(n.t / 0.2, (n.life - n.t) / 0.3), 0, 1), nfs = big ? 19 : 14, nh = big ? 34 : 26;
    ctx.font = '700 ' + nfs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const nw = ctx.measureText(n.s).width + 32;
    ctx.save(); ctx.globalAlpha = a;
    const px = pill(W / 2, ny, nw, nh, 'center');
    if (n.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(px, ny, nw, nh, nh / 2); ctx.stroke(); }
    text(n.s, W / 2, ny + nh / 2 + 0.5, nfs, n.gold ? C.gold : C.paper, 'center', 'body');
    ctx.restore();
  }
}

MODES.mansion = {
  rand: Math.random,   // cosmetic randomness (giggles, Bertie's chatter); tests may swap in a seeded one
  debug: false,        // true: every ghost drawn awake and solid (for screenshots)
  setup(st, L) {
    st.stats = { eeps: [0, 0], swaps: 0, drops: 0, woken: 0, clicks: 0, calls: 0, raceMisses: 0, race: null, roomT: [] };
    st.raceMisses = 0;
    mansionRoom(st, L);
  },
  room(k, L) { mansionRoom(G.mst, L); },
  step(dt) { const st = G.mst; if (st.plats) mansionStep(st, dt); },
  onKill(p) {
    const st = G.mst; if (!st.plats) return;
    st.roomFalls++;
    if (p.id === st.mover) { st.ride = null; st.frz.on = false; }
    mansionPop(st, p.x + p.w / 2, Math.min(p.y, H - 80), 'Boo-hoo!', '#d6b8ff', 22);
    for (let i = 0; i < 12; i++) G.particles.push({ x: p.x + p.w / 2 + (MODES.mansion.rand() - 0.5) * 20, y: Math.min(p.y + p.h / 2, H - 20), vx: (MODES.mansion.rand() - 0.5) * 60, vy: -40 - MODES.mansion.rand() * 60, life: 0.9, max: 0.9, col: 'rgba(170,110,240,0.7)', size: 6 + MODES.mansion.rand() * 4, grav: -30, kind: 'dot' });
    Sfx.play('mansionBooHoo', p.id);
    mansionGoldCheck(st);
  },
  onRespawn(p) {
    const st = G.mst; if (!st.plats) return;
    puff(p.x + p.w / 2, p.y + p.h / 2, 12, 'rgba(190,120,255,0.9)');
    Sfx.play('mansionPopBack', p.id);
  },
  draw() { mansionDraw(); },
  drawTop() { mansionDrawTop(); },
  hud() { mansionHud(); },
  stats() {
    const s = G.mst.stats, eeps = s.eeps[0] + s.eeps[1], falls = G.falls, time = G.time;
    // (two computers: about 76 s with 7 Eeps and a fall; a first try by people takes a lot longer, with many more Eeps)
    const medal = time <= 270 && eeps + falls <= 12 ? 'Gold' : time <= 480 && eeps + falls <= 30 ? 'Silver' : 'Bronze';
    const race = s.race ? (s.race.tries === 1 ? 'Won by ' + s.race.margin.toFixed(1) + ' s' : 'Won on try ' + s.race.tries) : '–';
    const words = eeps + falls === 0 ? 'Not one Eep! Super sneaky teamwork!' : eeps <= 12 ? 'A few Eeps, lots of brave teamwork!' : 'Lots of Eeps, and you made it together!';
    return [
      { label: 'Eeps (frozen)', values: s.eeps.slice() },
      { label: 'Ghost race', value: race },
      medal + ' medal · ' + words,
      'Portrait swaps: ' + s.swaps + ' · Ghosts woken: ' + s.woken,
    ];
  },
};

/* ---------- sounds ---------- */
Sfx.extra.mansionClickOn = function (p) { this.tone(1500 * p, 0.03, 'square', 0.03); this.tone(900 * p, 0.05, 'triangle', 0.03, null, 0.02); };
Sfx.extra.mansionClickOff = function (p) { this.tone(900 * p, 0.03, 'square', 0.025); this.tone(500 * p, 0.04, 'triangle', 0.025, null, 0.02); };
Sfx.extra.mansionWake = function () { this.tone(660, 0.08, 'sine', 0.035, 990); this.tone(1320, 0.07, 'triangle', 0.02, null, 0.05); };
Sfx.extra.mansionDoze = function () { this.tone(520, 0.18, 'sine', 0.02, 300); };
Sfx.extra.mansionGiggle = function () { [1175, 1397, 1175, 1568].forEach((f, i) => this.tone(f, 0.05, 'triangle', 0.03, null, i * 0.06)); };
Sfx.extra.mansionEep = function (p) { this.tone(1200 * p, 0.12, 'square', 0.03, 1800 * p); this.tone(1800 * p, 0.06, 'triangle', 0.02, null, 0.1); };
Sfx.extra.mansionSwap = function () { this.tone(300, 0.3, 'sine', 0.06, 1200); this.tone(1200, 0.25, 'triangle', 0.03, 300, 0.08); [784, 988].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.035, null, 0.25 + i * 0.07)); };
Sfx.extra.mansionCall = function (p) { this.tone(700 * p, 0.07, 'square', 0.03, 1000 * p); this.tone(1000 * p, 0.09, 'square', 0.025, null, 0.08); };
Sfx.extra.mansionWhoops = function (p) { this.tone(700 * p, 0.25, 'triangle', 0.045, 250 * p); };
Sfx.extra.mansionBooHoo = function (p) { this.tone(440 * p, 0.2, 'sine', 0.05, 330 * p); this.tone(370 * p, 0.3, 'sine', 0.05, 220 * p, 0.2); };
Sfx.extra.mansionPopBack = function (p) { this.tone(500 * p, 0.12, 'triangle', 0.05, 900 * p); };
Sfx.extra.mansionGold = function () { [784, 988, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.mansionRoom = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.06, null, i * 0.09)); };
Sfx.extra.mansionTick = function () { this.tone(880, 0.08, 'triangle', 0.04); };
Sfx.extra.mansionGo = function () { this.tone(330, 0.3, 'sine', 0.06, 880); this.tone(990, 0.2, 'triangle', 0.04, null, 0.1); };
Sfx.extra.mansionLose = function () { [523, 440, 392, 330].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.045, null, i * 0.14)); };
Sfx.extra.mansionMew = function () { this.tone(900, 0.18, 'sine', 0.03, 600); };
Sfx.extra.mansionSqueak = function () { this.tone(2200, 0.05, 'square', 0.018); this.tone(2600, 0.05, 'square', 0.015, null, 0.07); };
MODES.mansion.test = { MANSION, mansionCast, mansionLitAt, mansionOrigin, mansionHalf, mansionSolid, mansionPortraitAt, mansionNextStop, mansionBookY };
