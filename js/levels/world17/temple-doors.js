/* Pip & Bo - Level 17-1 Temple Doors (team, World 17 Jungle Jamboree). */
'use strict';

/* ===== 17-1 Temple Doors (mode 'temple', team) — Gavyn's pick =====
   "One stands on pressure plates to open stone doors while the other runs through before they shut."
   A sunny, overgrown jungle temple. Nothing hurts: water is a "Splash!" (back to your own torch), and a door that
   comes down on someone stops and nudges them out ("Squeeze!").
   - Stone doors: a plate held down opens its door fast. Let go and the door slides down SLOWLY; a column of glyph lights
     over the doorway counts down how long it can still be passed (the last light goes out as the gap gets too low for
     anyone), and the HUD shows a short door timer. Passing a closing door is a "Dash!".
   - Plates can open one door and shut another (Room 2), need a partner plate at the same time (Room 3, the moon door),
     or be pressed in order (Room 4, the Sun Door: the order is carved on the door, a wrong plate starts it again).
   - The stone monkey idol (map Y) is a heavy block: walk into it to push it (slowly, a tile at a time) and press the
     action ('pull') beside it to tug it a tile toward you. It presses a plate it sits on, and it never goes into a
     doorway or onto water.
   - Each player has their own torch checkpoint (map f, lit by walking past). Hold ▼ for 1 s to go back to it.
   - Rooms: Mossy Gate (hold the plate, then the partner holds the far one), Two-Way Plates (leaf plate, then hop to
     the flower plate while the partner dashes through both doors and over a little moat), Idol Hall (a two-plate moon
     door, the idol, and a big slow star door opened from the far end of the hall), The Sun Door (one on each side; star
     plates open the partner's star door; glyph plates in the carved order open the Sun Door).
   - Help, always gold and announced: Gold sand (doors close 1.4x slower) after 2 missed dashes (bumping a door that
     just shut, or waiting right by a door that closed again) or 60 s with nobody getting through a door; Super gold
     sand (2.2x) after 4 misses or another 120 s;
     Gold lily pads on the water after 3 splashes in a room; Gold glyphs on the Sun Door after 2 restarts (the next
     plate glows and a wrong one no longer restarts). Mango the monkey cheers dashes and points the way after a stall.
   - Brains and hints read templePlan(st): each player's job right now (hold a plate, wait by a door, cross, press a
     glyph, go back...), worked out from where both stand, so roles swap naturally.
   - Kind rules: a full-speed run skims Room 2's 1-tile moat (a stop or a walk still splashes); a glyph pressed
     before the first one only says "Not first!" (nothing to start again); someone already standing on a plate when it
     becomes the next one presses it; a player who fell where their job can't be reached is told to hold ▼ (the
     computer does it).
   Room def fields: see the comment above the level in js/levels/level-list.js.
   Every top-level name starts with temple / TEMPLE (Sfx.extra.temple* too); level state lives in G.mst. */
const TEMPLE = {
  openV: 300,              // px/s a door slides up when its plate is held
  gold: 1.4, gold2: 2.2,   // Gold sand / Super gold sand: doors take this much longer to shut
  missGold: 2, missGold2: 4, stallGold: 60, lilyAfter: 3, glyphGold: 2,
  pushHold: 0.45, slideT: 0.5, pullCD: 0.35,
  dwell: 0.35,             // seconds standing on a glyph plate to press it
  respawn: 1.0, backHold: 1.0, backShow: 0.18,
  exitHold: 0.35, winHold: 1.8, newsLife: 3.8, mangoAfter: 24, chipT: 8, chipAgain: 18,
  squeezeV: 170, squeezeT: 0.3,
};
// what each glyph looks like (doors, plates and the Sun Door carving)
const TEMPLE_GLYPH = {
  leaf: { col: '#6fd65a', dark: '#2f7a2c', word: 'leaf' }, flower: { col: '#ff8fc7', dark: '#a8346a', word: 'flower' },
  moon: { col: '#b9a2ff', dark: '#5b44a8', word: 'moon' }, star: { col: '#ffd84a', dark: '#a97e10', word: 'star' },
  sun: { col: '#ffb43a', dark: '#a8621a', word: 'sun' }, fish: { col: '#5bc8ff', dark: '#1f6f9c', word: 'fish' },
  bird: { col: '#ff8a4a', dark: '#a8461a', word: 'bird' }, frog: { col: '#9be36a', dark: '#3f7a2a', word: 'frog' },
};
const templeBig = () => (typeof hudBig === 'function' && hudBig());
const templeCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);   // 1-player mode: the computer's character
const templeIx = (c, r) => r * COLS + c;
const templeCx = p => p.x + p.w / 2;

/* ---------- each player's own keys (keyboard, controller or touch) for the hint chips ---------- */
function templeDev(id) { try { return actKey(id); } catch (e) { return 'kb'; } }
function templeBackKey(id) {
  const d = templeDev(id);
  if (d === 'pad') return 'hold the stick down';
  if (d === 'touch') return 'hold ▼';
  if (typeof cpuSolo === 'function' && cpuSolo()) return 'hold S or ↓';
  return id === 0 ? 'hold S' : 'hold ↓';
}
function templeActKey(id) {
  const d = templeDev(id);
  if (d === 'pad') return glyph('act');
  if (d === 'touch') return 'the round button';
  if (typeof cpuSolo === 'function' && cpuSolo()) return 'F or /';
  return id === 0 ? 'F' : '/';
}

/* ---------- the room: doors, plates, water, bananas, torches, the idol, the exit ---------- */
function templeRoom(st, L) {
  const def = L.def, g = L.grid, D = def.doors || {}, Pd = def.plates || {};
  st.k = def.roomIndex || 0; st.def = def; st.logic = def.logic; st.style = def.style || 'gate'; st.lead = def.lead || 0;
  // which chars are plates: the room's own list plus every plate a door names
  const plateIds = new Set(Object.keys(Pd));
  for (const id in D) { for (const grp of D[id].open || []) for (const q of grp) plateIds.add(q); for (const q of D[id].shut || []) plateIds.add(q); }
  st.doors = []; st.doorBy = {}; st.plates = []; st.plateBy = {}; st.bananas = []; st.torches = []; st.idol = null;
  st.water = new Uint8Array(COLS * ROWS); st.waterCols = [];
  const cells = {};
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = g[r][c];
    if (D[ch]) (cells[ch] = cells[ch] || []).push({ c, r });
    else if (plateIds.has(ch)) {
      const pl = Object.assign({ id: ch, c, r, x: c * T + T / 2, feet: (r + 1) * T, down: false, by: [false, false], idolOn: false, anim: 0, flash: 0, dwell: [0, 0], used: [false, false], pressT: 0 }, Pd[ch] || {});
      st.plates.push(pl); st.plateBy[ch] = pl; g[r][c] = '.';
    } else if (ch === '~') { st.water[templeIx(c, r)] = 1; if (!st.waterCols.includes(c)) st.waterCols.push(c); }
    else if (ch === 'z') { st.bananas.push({ x: c * T + T / 2, y: r * T + T / 2, got: false, ph: (hash(c, r) % 100) / 16, pop: 0 }); g[r][c] = '.'; }
    else if (ch === 'f') { st.torches.push({ c, x: c * T + T / 2, feet: (r + 1) * T, on: [false, false] }); g[r][c] = '.'; }
    else if (ch === 'Y') { st.idol = { tx: c, ty: r, fx: c, from: c, to: c, slideT: 0, pushT: [0, 0], pullCD: 0, pushes: 0, glow: 0, home: c }; g[r][c] = '#'; }
  }
  for (const id in cells) {
    const cs = cells[id], c = cs[0].c, r0 = Math.min(...cs.map(q => q.r)), r1 = Math.max(...cs.map(q => q.r));
    const h = (r1 - r0 + 1) * T, d = Object.assign({ id, c, r0, r1, x: c * T, top: r0 * T, h, cover: h, want: false, perm: false, lit: 0, sqT: 0, pass: [0, 0], closingT: 0, glow: 0, sinceShut: 9 }, D[id]);
    d.cx = d.x + T / 2;
    st.doors.push(d); st.doorBy[id] = d;
  }
  st.waterCols.sort((a, b) => a - b);
  // a moat one tile wide (floor on both sides): a running player skims over it, like any small gap
  st.moats = st.waterCols.filter(c => !st.water[templeIx(c - 1, 16)] && !st.water[templeIx(c + 1, 16)] && g[16][c - 1] === '#' && g[16][c + 1] === '#');
  // what each plate does (for the little stone tablets beside them)
  for (const pl of st.plates) {
    pl.opens = st.doors.filter(d => (d.open || []).some(grp => grp.includes(pl.id))).map(d => ({ d, pair: (d.open || []).find(grp => grp.includes(pl.id)).length > 1 }));
    pl.shuts = st.doors.filter(d => (d.shut || []).includes(pl.id));
  }
  // the room drawn without the idol (it moves, so it is drawn on its own)
  st.base = g.map(row => row.slice());
  if (st.idol) st.base[st.idol.ty][st.idol.tx] = '.';
  st.exit = L.door; L.door = null; L.flags = [];
  st.torches.sort((a, b) => a.x - b.x);
  for (const tc of st.torches) tc.spots = [0, 1].map(id => templeSpot(st, tc.x + (id === 0 ? -14 : 14), tc.feet));
  // per player
  st.pl = [0, 1].map(id => ({ spot: { x: L.spawns[id].x, y: L.spawns[id].y }, torch: -1, downT: 0, sqT: 0, sqDir: 0, sqCD: 0, px: L.spawns[id].x, py: L.spawns[id].y, shoutCD: 0, missCD: 0, side: {}, deadT: 0 }));
  for (const d of st.doors) d.side = G.players.map(p => (templeCx(p) < d.cx ? -1 : 1));
  // the room's flow and help
  st.roomT = 0; st.phase = 'play'; st.winT = 0; st.winTick = 0; st.exitT = 0; st.doorIn = [false, false];
  st.miss = 0; st.splash = 0; st.goldDoors = false; st.goldLv = 0; st.stallT = 0; st.lily = false; st.goldGlyph = false;
  st.pops = []; st.news = null; st.stepId = ''; st.stepT = 0; st.planTick = -1; st.plan = null;
  st.holder = -1; st.relay = 'first'; st.readyT = 0; st.secondT = 0; st.race = null; st.raceGo = 0; st.side4 = null; st.owner = {};
  st.cheerCD = 0;
  st.mango = st.mango || { x: W / 2, y: 50, t: 0, say: '', sayT: 0, on: false, face: 1, dir: 0, cheer: 0, hint: '' };
  const mh = def.mango || [W / 2, 50];
  st.mango.home = { x: mh[0], y: mh[1] }; st.mango.x = mh[0]; st.mango.y = mh[1]; st.mango.on = false; st.mango.sayT = 0;
  // Room 4: the glyph order carved on the Sun Door (each side's three glyphs, woven together)
  st.seq = null; st.seqI = 0; st.sunOpen = false; st.sunT = 0;
  if (st.logic === 'sun') templeSunSeq(st);
  st.stats.roomT[st.k] = 0;
  for (const p of G.players) { p.downLatch = true; }
  templeActLabel(def.act && def.act.label);
}
// the touch buttons' word follows the room (Room 3 pulls the idol, the others shout "Go!")
function templeActLabel(word) {
  if (!word || typeof document === 'undefined') return;
  let changed = false;
  document.querySelectorAll('[data-actlabel]').forEach(el => { if (el.textContent !== word) { el.textContent = word; changed = true; } });
  if (changed && typeof fitActLabels === 'function') fitActLabels();
}
// a standing spot near x on the floor at feet: no water, no plate under it, not inside a door
function templeSpot(st, x, feet) {
  const r = Math.round(feet / T) - 1;
  const ok = cx => {
    const x0 = cx - PW / 2, c1 = Math.floor((x0 + 1) / T), c2 = Math.floor((x0 + PW - 1) / T);
    for (let c = c1; c <= c2; c++) {
      if (tile(c, r + 1) !== '#' || tile(c, r) !== '.' || st.water[templeIx(c, r + 1)]) return false;
      if (st.plates.some(pl => pl.c === c && pl.r === r)) return false;
    }
    return true;
  };
  for (let k = 0; k <= 90; k += 2) for (const d of [1, -1]) if (ok(x + d * k)) return { x: x + d * k - PW / 2, y: feet - PH };
  return { x: x - PW / 2, y: feet - PH };
}
function templeSunSeq(st) {
  const side = { L: [], R: [] };
  for (const pl of st.plates) if (pl.seq) { pl.wing = pl.c < 12 ? 'L' : 'R'; pl.alcove = pl.r < 10; side[pl.wing].push(pl); }
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  shuffle(side.L); shuffle(side.R);
  // both sides keep taking turns (never three in a row from one side)
  const pats = ['LRLRLR', 'RLRLRL', 'LRRLLR', 'RLLRRL', 'LRLRRL', 'RLRLLR'];
  const pat = pats[Math.floor(Math.random() * pats.length)];
  st.seq = pat.split('').map(s => side[s].shift());
}

/* ---------- plates ---------- */
function templeOnPlate(p, pl) {
  return p.alive && p.grounded && Math.abs(p.y + p.h - pl.feet) < 2 && rectHit(p, pl.c * T + 4, pl.feet - 8, T - 8, 8);
}
function templePlates(st, dt) {
  const idl = st.idol;
  for (const pl of st.plates) {
    const was = pl.down;
    pl.by = G.players.map(p => templeOnPlate(p, pl));
    pl.idolOn = !!idl && idl.slideT <= 0 && idl.tx === pl.c && idl.ty === pl.r;
    pl.down = pl.by[0] || pl.by[1] || pl.idolOn;
    if (pl.down && !was && !pl.seq) Sfx.play('templePlate');
    pl.anim = approach(pl.anim, pl.down ? 1 : 0, dt * 9);
    pl.flash = Math.max(0, pl.flash - dt * 1.6);
    for (let i = 0; i < 2; i++) if (pl.by[i] && !pl.seq) st.stats.held[i] += dt;
  }
}
const templeDown = (st, id) => !!(st.plateBy[id] && st.plateBy[id].down);

/* ---------- doors ---------- */
const templeGap = d => d.h - d.cover;                       // the open gap under a door
const templePassable = (d, need = PH + 1) => d.h - d.cover >= need;
const templeSlow = st => (st.goldLv >= 2 ? TEMPLE.gold2 : st.goldLv ? TEMPLE.gold : 1);   // Gold sand: slower doors
const templeCloseV = (st, d) => d.h / (d.close * templeSlow(st));
// seconds until a closing door can't be passed any more (Infinity while it's held open)
function templeTimeLeft(st, d) {
  if (d.want || d.perm) return Infinity;
  return Math.max(0, (d.h - PH - 1 - d.cover) / templeCloseV(st, d));
}
function templeDoorWant(st, d) {
  if (d.sun) return st.sunOpen;
  if ((d.shut || []).some(q => templeDown(st, q))) return false;
  return (d.open || []).some(grp => grp.every(q => templeDown(st, q)));
}
// before anyone moves: doors slide; a closing door stops at anyone under it and nudges them out
function templeDoorsPre(st, dt) {
  for (const d of st.doors) {
    const was = d.want;
    d.want = templeDoorWant(st, d);
    if (d.want && !was) { Sfx.play('templeOpen'); d.sinceShut = 9; }
    if (!d.want && was) Sfx.play('templeRumble');
    d.glow = approach(d.glow, st.goldDoors ? 1 : 0, dt * 2);
    // how long it has been open enough to pass, and which side everyone was on when it opened (for missed dashes)
    if (templePassable(d)) { if (!d.openT) d.openSide = d.side.slice(); d.openT = (d.openT || 0) + dt; }
    if (d.want) { d.cover = Math.max(0, d.cover - TEMPLE.openV * dt); d.closingT = 0; continue; }
    if (d.cover >= d.h) { d.sinceShut += dt; continue; }
    d.closingT += dt;
    let nc = Math.min(d.h, d.cover + templeCloseV(st, d) * dt);
    for (const p of G.players) {
      if (!p.alive || p.x >= d.x + T - 2 || p.x + p.w <= d.x + 2 || p.y + p.h <= d.top) continue;
      if (p.y < d.top + nc) {
        nc = Math.max(d.cover, p.y - d.top);
        if (p.grounded) templeSqueeze(st, p, d);   // (a jump into it just bumps your head: the slab waits over you)
      }
    }
    if (nc >= d.h && d.cover < d.h) {
      Sfx.play('templeThud'); d.sinceShut = 0; for (let i = 0; i < 6; i++) puff(d.x + 4 + i * 4, d.top + d.h, 1, 'rgba(230,220,190,0.8)');
    }
    d.cover = nc;
    // it just got too low to pass: anyone who waited right by it and didn't go missed the dash
    if (d.openT > 0 && !templePassable(d)) { if (!d.sun && d.openT > 0.3 && d.openSide) templeMissedWindow(st, d); d.openT = 0; }
  }
}
// a door came down on p: nudge them out to the side they're more on (or the side with floor, next to water)
function templeSqueeze(st, p, d) {
  const P = st.pl[p.id];
  if (P.sqT > 0) return;
  let dir = templeCx(p) < d.cx ? -1 : 1;
  const r = Math.floor((d.top + d.h) / T);
  const safe = s => !st.water[templeIx(d.c + s, r)] && tile(d.c + s, r) === '#' && !solidFor(tile(d.c + s, r - 1), p);
  if (!safe(dir) && safe(-dir)) dir = -dir;
  P.sqT = TEMPLE.squeezeT; P.sqDir = dir;
  if (P.sqCD <= 0) {
    st.stats.squeezes++;
    templePop(st, templeCx(p), p.y - 12, 'Squeeze!', '#fff1b8', 18);
    Sfx.play('templeSqueeze', p.id); rumble(p.id, 0.3, 0.3, 100);
    P.sqCD = 1.2;
  }
  p.sx = 1.25; p.sy = 0.78;
}
// after everyone moved: nobody stands inside a door slab
function templeDoorsCollide(st) {
  for (const p of G.players) {
    if (!p.alive) continue;
    const P = st.pl[p.id];
    for (const d of st.doors) {
      if (d.cover <= 0.5) continue;
      const x0 = d.x + 2, x1 = d.x + T - 2, y0 = d.top, y1 = d.top + d.cover;
      if (!(p.x < x1 && p.x + p.w > x0 && p.y < y1 && p.y + p.h > y0)) continue;
      if (P.py >= y1 - 2) { p.y = y1; if (p.vy < 0) p.vy = 0; p.jumping = false; continue; }   // a jump into its bottom edge
      const left = P.px + p.w / 2 < d.cx;
      const pushing = left ? p.input.right : p.input.left;
      p.x = left ? x0 - p.w : x1; p.vx = left ? Math.min(p.vx, 0) : Math.max(p.vx, 0);
      // bumping into a door that shut a moment ago, trying to get through: a missed dash
      if (pushing && !d.want && d.sinceShut < 0.8 && P.missCD <= 0) templeMiss(st, p, d);
    }
  }
}
function templeMiss(st, p, d) {
  const P = st.pl[p.id];
  P.missCD = 3;
  templePop(st, templeCx(p), p.y - 14, 'Too late! Bonk!', '#ffe0a8', 17);
  Sfx.play('templeBonk', p.id);
  templeMissCount(st);
}
// a door shut again while someone waited right by it on the same side (they didn't make the dash): a gentle miss
function templeMissedWindow(st, d) {
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (!p.alive || !p.grounded || P.missCD > 0 || d.side[p.id] !== d.openSide[p.id]) continue;
    if (Math.abs(templeCx(p) - d.cx) > 130 || Math.abs(p.y + p.h - (d.top + d.h)) > 40) continue;
    if (st.plates.some(pl => pl.by[p.id])) continue;   // (the holder)
    P.missCD = 3;
    templePop(st, templeCx(p), p.y - 14, 'So close! Try again!', '#ffe0a8', 16);
    templeMissCount(st);
    return;
  }
}
function templeMissCount(st) {
  st.miss++;
  if (st.goldLv < 1 && st.miss >= TEMPLE.missGold) templeGoldDoors(st, 'Gold sand! The doors in this room close slower', 1);
  else if (st.goldLv < 2 && st.miss >= TEMPLE.missGold2) templeGoldDoors(st, 'Super gold sand! The doors close really slowly now', 2);
}
// passing a door: a held-open door is just a walk; a closing one is a Dash! (Phew! when it was really close)
function templeDoorsPass(st) {
  for (const d of st.doors) for (const p of G.players) {
    if (!p.alive) continue;
    const s = templeCx(p) < d.cx ? -1 : 1;
    if (s !== d.side[p.id]) {
      d.side[p.id] = s; st.stallT = 0;
      if (!d.want && !d.perm && !d.sun && d.cover > 1) {
        st.stats.dashes[p.id]++;
        const close = templeGap(d) < 46;
        templePop(st, templeCx(p) + s * 16, p.y - 16, close ? 'Phew! Dash!' : 'Dash!', PCOL[p.id], 20);
        Sfx.play('templeDash', p.id);
        if (st.cheerCD <= 0) { templeMangoSay(st, close ? 'Ooh-ooh! Just in time!' : 'Ooh-ooh! Nice dash!', 2.2); st.cheerCD = 6; }
      }
    }
  }
}

// running over a 1-tile moat at full speed keeps you up (a slow walk or a stop still splashes)
function templeSkim(st, p, dt) {
  if (!p.alive || !st.moats.length || Math.abs(p.vx) < 150 || p.vy < 0) return;
  const floor = 16 * T, feet = p.y + p.h;
  if (feet < floor - 0.5 || feet > floor + 6) return;
  if (st.moats.some(c => p.x < (c + 1) * T && p.x + p.w > c * T)) { p.y = floor - p.h; p.vy = -PHYS.g * dt; }
}

/* ---------- the stone monkey idol: a heavy block on the floor ---------- */
function templeIdolFree(st, c, r) {
  if (c < 0 || c >= COLS) return false;
  if (tile(c, r) !== '.' || tile(c, r + 1) !== '#' || st.water[templeIx(c, r + 1)]) return false;
  if (st.doors.some(d => Math.abs(d.c - c) <= 0)) return false;
  return !G.players.some(p => p.alive && rectHit(p, c * T + 1, r * T + 1, T - 2, T - 2));
}
function templeIdolStep(st, dt) {
  const I = st.idol;
  if (!I) return;
  I.pullCD = Math.max(0, I.pullCD - dt);
  I.glow = approach(I.glow, st.plates.some(pl => pl.idolOn) ? 1 : 0, dt * 3);
  const g = G.level.grid;
  if (I.slideT > 0) {
    I.slideT -= dt;
    const k = 1 - Math.max(0, I.slideT) / TEMPLE.slideT;
    I.fx = I.from + (I.to - I.from) * k;
    // (a pull: the idol slides toward the puller, who is nudged back out of its way)
    const x0 = I.fx * T, x1 = x0 + T;
    for (const p of G.players) if (p.alive && p.y + p.h > I.ty * T + 2 && p.y < (I.ty + 1) * T && p.x < x1 && p.x + p.w > x0) {
      const dx = templeCx(p) < x0 + T / 2 ? x0 - (p.x + p.w) : x1 - p.x;
      moveX(p, dx, true);
    }
    if (I.slideT <= 0) {
      g[I.ty][I.from] = '.'; g[I.ty][I.to] = '#'; I.tx = I.to; I.fx = I.to; I.slideT = 0;
      Sfx.play('templeIdolStop');
      puff(I.tx * T + T / 2, (I.ty + 1) * T, 5, 'rgba(220,200,160,0.8)');
    }
    return;
  }
  for (const p of G.players) {
    const P = I.pushT;
    if (!p.alive || !p.grounded || Math.abs(p.y + p.h - (I.ty + 1) * T) > 2) { P[p.id] = 0; continue; }
    const leftOf = Math.abs(p.x + p.w - I.tx * T) < 1.5 && p.input.right && !p.input.left;
    const rightOf = Math.abs(p.x - (I.tx + 1) * T) < 1.5 && p.input.left && !p.input.right;
    if (!leftOf && !rightOf) { P[p.id] = 0; continue; }
    P[p.id] += dt;
    p.sx = 1.08; p.sy = 0.94;
    if (P[p.id] >= TEMPLE.pushHold) {
      P[p.id] = 0;
      const to = I.tx + (leftOf ? 1 : -1);
      if (templeIdolFree(st, to, I.ty)) templeIdolSlide(st, I, to, p);
      else if (!I.bumpT || I.bumpT < st.roomT) { I.bumpT = st.roomT + 1.5; templePop(st, I.tx * T + T / 2, I.ty * T - 10, 'Too heavy there!', '#e8dcc0', 14); }
    }
  }
}
function templeIdolSlide(st, I, to, by) {
  const g = G.level.grid;
  I.from = I.tx; I.to = to; I.slideT = TEMPLE.slideT;
  g[I.ty][to] = '#';   // (both cells are stone while it slides; the old one frees when it arrives)
  st.stats.pushes++;
  Sfx.play('templeIdol');
  rumble(by.id, 0.25, 0.4, 120);
  if (!st.idolTold) { st.idolTold = true; templeMangoSay(st, 'Ooh! Heavy monkey!', 2); }
}
// the action: tug the idol a tile toward you; anywhere else, shout "Go!"
function templeAct(st, p) {
  if (!p.pendingAct) return;
  p.pendingAct = false;
  if (!p.alive || st.phase !== 'play') return;
  const I = st.idol, P = st.pl[p.id];
  if (I && I.slideT <= 0 && I.pullCD <= 0 && p.grounded && Math.abs(p.y + p.h - (I.ty + 1) * T) < 2) {
    const leftOf = Math.abs(p.x + p.w - I.tx * T) < 4, rightOf = Math.abs(p.x - (I.tx + 1) * T) < 4;
    if (leftOf || rightOf) {
      const dir = leftOf ? -1 : 1, to = I.tx + dir;
      I.pullCD = TEMPLE.pullCD;
      // room for the idol where you stand, and for you a step further back
      const behind = to + dir;
      const ok = tile(to, I.ty) === '.' && tile(to, I.ty + 1) === '#' && !st.water[templeIx(to, I.ty + 1)] && !st.doors.some(d => d.c === to)
        && !solidFor(tile(behind, I.ty), p) && !G.players.some(q => q !== p && q.alive && rectHit(q, to * T + 1, I.ty * T + 1, T - 2, T - 2));
      if (ok) { templeIdolSlide(st, I, to, p); templePop(st, templeCx(p), p.y - 14, 'Heave!', PCOL[p.id], 16); }
      else templePop(st, templeCx(p), p.y - 14, 'No room!', '#e8dcc0', 15);
      return;
    }
  }
  if (P.shoutCD > 0) return;
  P.shoutCD = 1.0;
  templePop(st, templeCx(p), p.y - 18, 'Go, ' + NAMES[1 - p.id] + '!', PCOL[p.id], 18);
  Sfx.play('templeShout', p.id);
  st.shout = { id: p.id, t: st.roomT };
}

/* ---------- water, torches, going back, bananas ---------- */
function templeHazards(st, p) {
  if (!p.alive) return;
  const c = Math.floor(templeCx(p) / T), r = Math.floor((p.y + p.h - 4) / T);
  if (p.y + p.h > 16 * T + 6 && (st.water[templeIx(c, Math.max(16, r))] || st.water[templeIx(c, 16)])) templeSplash(st, p);
}
function templeSplash(st, p) {
  const P = st.pl[p.id], cx = templeCx(p);
  p.alive = false; p.respawnT = TEMPLE.respawn; P.deadT = TEMPLE.respawn;
  G.spawnPts[p.id] = { x: P.spot.x, y: P.spot.y };
  st.stats.whoops[p.id]++; st.splash++;
  templePop(st, cx, 16 * T - 30, 'Splash!', '#9fe3ff', 22);
  for (let i = 0; i < 18; i++) G.particles.push({ x: cx, y: 16 * T + 4, vx: (Math.random() - 0.5) * 220, vy: -120 - Math.random() * 260, life: 0.8, max: 0.8, col: i % 3 ? '#8fd8ff' : '#e8fbff', size: 3 + Math.random() * 3, grav: 900, kind: 'dot' });
  Sfx.play('templeSplash', p.id); rumble(p.id, 0.5, 0.4, 160);
  if (!st.lily && st.splash >= TEMPLE.lilyAfter) templeLily(st);
}
// (the engine brings a splashed player back at G.spawnPts after p.respawnT; this is the hold-▼ way back)
function templeBack(st, p) {
  const P = st.pl[p.id], s = P.spot, input = p.input;
  Object.assign(p, { x: s.x, y: s.y, vx: 0, vy: 0, alive: true, grounded: false, jumping: false, jumpBuf: 0, pendingJump: false, coyote: 0, stun: 0, dropT: 0, sx: 0.6, sy: 1.4, carryVx: 0, offT: 0, knockT: 0, input });
  p.pendingAct = false; p.downLatch = true;
  P.downT = 0; P.px = p.x; P.py = p.y; P.lost = false;
  for (const d of st.doors) d.side[p.id] = templeCx(p) < d.cx ? -1 : 1;
  st.stats.backs++;
  templePop(st, templeCx(p), p.y - 14, 'Boing! Back!', '#ffe9a8', 17);
  for (let i = 0; i < 12; i++) G.particles.push({ x: templeCx(p), y: p.y + p.h / 2, vx: (Math.random() - 0.5) * 140, vy: (Math.random() - 0.5) * 140, life: 0.5, max: 0.5, col: '#ffe9a8', size: 3 + Math.random() * 3, grav: 0, kind: 'dot' });
  Sfx.play('templeBack', p.id);
}
function templeBackStep(st, p, dt) {
  const P = st.pl[p.id];
  if (p.alive && p.input.down && !p.downLatch && st.phase === 'play') {
    P.downT += dt;
    if (P.downT >= TEMPLE.backHold) templeBack(st, p);
  } else P.downT = 0;
}
function templeTorches(st) {
  for (const p of G.players) {
    if (!p.alive || !p.grounded) continue;
    const P = st.pl[p.id];
    st.torches.forEach((tc, i) => {
      if (tc.on[p.id] && P.torch === i) return;
      if (Math.abs(templeCx(p) - tc.x) > 34 || Math.abs(p.y + p.h - tc.feet) > 3) return;
      P.torch = i; P.spot = tc.spots[p.id];
      if (!tc.on[p.id]) { tc.on[p.id] = true; Sfx.play('templeTorch', p.id); burst(tc.x, tc.feet - 40, PCOL[p.id], 8); }
    });
  }
}
function templeBananas(st) {
  for (const b of st.bananas) {
    if (b.got) { b.pop = Math.max(0, b.pop - 0.02); continue; }
    for (const p of G.players) if (p.alive && rectHit(p, b.x - 12, b.y - 13, 24, 26)) {
      b.got = true; b.pop = 1; st.stats.bananas++; st.stats.bananasBy[p.id]++;
      Sfx.play('templeBanana'); burst(b.x, b.y, '#ffe066', 10);
      templePop(st, b.x, b.y - 18, 'Golden banana!', C.gold, 15);
      break;
    }
  }
}

/* ---------- the plan: what each player should do right now (hints, Mango and the computer all read it) ---------- */
// a job: { k: 'hold' | 'wait' | 'cross' | 'via' | 'press' | 'back' | 'drop' | 'exit' | 'idle', x, feet, plate, door, say }
function templeJob(k, x, feet, extra) { return Object.assign({ k, x, feet }, extra || {}); }
const templeHold = (pl, say) => templeJob('hold', pl.x, pl.feet, { plate: pl, say });
// where a player is (a splashed player counts where they will come back)
function templePos(st, id) {
  const p = G.players[id];
  if (p.alive) return { x: templeCx(p), feet: p.y + p.h, grounded: p.grounded };
  const s = st.pl[id].spot;
  return { x: s.x + PW / 2, feet: s.y + PH, grounded: true };
}
function templeExitJob(st, id) {
  const e = st.exit;
  return templeJob('exit', e.x + e.w / 2 + (id === 0 ? -9 : 9), e.y + e.h, { say: 'Into the temple door, both of you!' });
}
function templePlan(st) {
  if (st.plan && st.planTick === G.tickN) return st.plan;
  st.planTick = G.tickN;
  let plan;
  if (st.logic === 'relay') plan = templePlanRelay(st);
  else if (st.logic === 'idol') plan = templePlanIdol(st);
  else if (st.logic === 'sun') plan = templePlanSun(st);
  else plan = templePlanGate(st);
  if (plan.id !== st.stepId) { st.stepId = plan.id; st.stepT = 0; }
  st.plan = plan;
  return plan;
}
// a sticky choice of who holds: whoever stands on one of the plates, else the one nearer the plates (with some
// stickiness, so a step to the side doesn't swap jobs), else the room's lead
function templePickHolder(st, plates, nearX) {
  const on = [0, 1].filter(id => plates.some(pl => pl.by[id]));
  if (on.length === 1) { st.holder = on[0]; return st.holder; }
  const d = [0, 1].map(id => Math.abs(templePos(st, id).x - nearX));
  if (st.holder < 0) st.holder = Math.abs(d[0] - d[1]) < 45 ? st.lead : d[0] < d[1] ? 0 : 1;
  else if (d[1 - st.holder] + 90 < d[st.holder]) st.holder = 1 - st.holder;
  return st.holder;
}
const templeWaitX = (d, side) => (side < 0 ? d.x - 24 : d.x + T + 24);

// Room 1: one door, a plate on each side
function templePlanGate(st) {
  const A = st.doorBy.A, p3 = st.plateBy['3'], p4 = st.plateBy['4'], floor = A.top + A.h;
  const z = [0, 1].map(id => (templePos(st, id).x < A.cx ? 0 : 1));
  const past = templeJob('cross', A.x + T + 70, floor, { door: A, say: 'Run through the leaf door!' });
  const wait = templeJob('wait', templeWaitX(A, -1), floor, { door: A, say: 'Wait by the leaf door, then run through!' });
  if (z[0] === 1 && z[1] === 1) return { id: 'g-exit', jobs: [templeExitJob(st, 0), templeExitJob(st, 1)] };
  if (z[0] !== z[1]) {
    const h = z[0] === 1 ? 0 : 1, r = 1 - h, jobs = [];
    jobs[h] = templeHold(p4, 'Stand on the plate to open the leaf door for ' + NAMES[r] + '!');
    jobs[r] = templePassable(A, 34) && p4.by[h] ? Object.assign(past, { say: 'It’s open: run through!' }) : wait;
    return { id: 'g-split' + h, jobs, focus: { id: h, x: p4.x, y: p4.feet - 60, text: NAMES[h] + ': stand on the plate!' } };
  }
  const h = templePickHolder(st, [p3], p3.x), r = 1 - h, jobs = [];
  jobs[h] = templeHold(p3, 'Stand on the plate to open the leaf door for ' + NAMES[r] + '!');
  jobs[r] = templePassable(A, 34) && p3.by[h] ? Object.assign(past, { say: 'It’s open: run through!' }) : wait;
  return { id: 'g-both' + h, jobs, focus: { id: h, x: p3.x, y: p3.feet - 60, text: NAMES[h] + ': stand on the plate!' } };
}

// Room 2: two doors one behind the other with a moat between; each plate opens one and shuts the other
function templePlanRelay(st) {
  const A = st.doorBy.A, B = st.doorBy.B, floor = A.top + A.h, mid = (A.cx + B.cx) / 2;
  const pos = [0, 1].map(id => templePos(st, id));
  st.zone2 = st.zone2 || [0, 0];
  for (const id of [0, 1]) { const x = pos[id].x; if (x < A.x) st.zone2[id] = 0; else if (x > B.x + T) st.zone2[id] = 1; }
  const z = st.zone2;
  if (z[0] === 1 && z[1] === 1) return { id: 'r-exit', jobs: [templeExitJob(st, 0), templeExitJob(st, 1)] };
  const P = st.plateBy;
  let h, first, second;
  if (z[0] !== z[1]) { h = z[0] === 1 ? 0 : 1; first = P['6']; second = P['5']; }
  else {
    // both still on the left: whoever stands up on the ledge holds, else the one further from the door
    const ledge = id => pos[id].grounded && Math.abs(pos[id].feet - (P['3'].feet)) < 3 && pos[id].x > 5 * T && pos[id].x < A.x;
    const up = [0, 1].filter(ledge);
    if (up.length === 1) st.holder = up[0];
    else if (st.holder < 0) st.holder = st.lead;
    else if (!up.length) { const d = [0, 1].map(id => Math.abs(pos[id].x - templeWaitX(A, -1))); if (d[st.holder] + 70 < d[1 - st.holder]) st.holder = 1 - st.holder; }
    h = st.holder; first = P['3']; second = P['4'];
  }
  // a new holder (or the same one on the other side) starts the relay over
  const hk = h + ':' + first.id;
  if (st.relayH !== hk) { st.relayH = hk; st.relay = 'first'; st.secondT = 0; st.readyT = 0; }
  const r = 1 - h, pr = G.players[r], rp = pos[r];
  const ready = rp.grounded && Math.abs(rp.x - templeWaitX(A, -1)) < 40 && Math.abs(rp.feet - floor) < 3;
  const inTunnel = rp.x >= A.x - 4 && rp.x <= B.x + T + 4;
  st.readyT = ready ? st.readyT + DT : 0;
  if (st.relay === 'first') {
    if (first.by[h] && A.cover <= 4 && (st.readyT > 0.5 || (inTunnel && pr.alive))) { st.relay = 'second'; st.secondT = 0; }
  } else {
    st.secondT += DT;
    const lost = !templePassable(A) && !inTunnel && rp.x < A.x && st.secondT > 0.5;
    if (lost || (!second.by[h] && !first.by[h] && st.secondT > 4)) st.relay = 'first';
    if (first.by[h] && !second.by[h] && st.secondT > 5) st.relay = 'first';   // (time for a slow hop)
  }
  const jobs = [];
  const fw = TEMPLE_GLYPH[A.glyph].word, sw = TEMPLE_GLYPH[B.glyph].word;
  if (st.relay === 'first') jobs[h] = templeHold(first, ready ? 'Now hop to the ' + sw + ' plate!' : 'Stand on the ' + fw + ' plate (it opens the ' + fw + ' door)');
  else jobs[h] = templeHold(second, second.by[h] ? 'Stay on the ' + sw + ' plate until ' + NAMES[r] + ' is through!' : 'Now hop to the ' + sw + ' plate!');
  if (st.relay === 'first' && ready && first.by[h] && A.cover <= 4) jobs[h] = templeJob('hold', second.x, second.feet, { plate: second, say: 'Now hop to the ' + sw + ' plate!' });
  const go = (templePassable(A, 30) || inTunnel) && templePassable(B, 30) && st.relay === 'second';
  if (go || (inTunnel && templePassable(B))) jobs[r] = templeJob('cross', B.x + T + 60, floor, { doors: [A, B], say: 'Dash! Hop the moat!' });
  else jobs[r] = templeJob('wait', templeWaitX(A, -1), floor, { door: A, say: 'Wait by the leaf door. When both doors open: dash!' });
  void mid;
  return { id: 'r-' + h + z.join('') + st.relay, jobs, focus: { id: h, x: (st.relay === 'first' ? first : second).x, y: first.feet - 60, text: NAMES[h] + ': ' + (st.relay === 'first' ? fw : sw) + ' plate!' } };
}

// Room 3: the two-plate moon door, the idol, and the big slow star door opened from the far end of the hall
function templePlanIdol(st) {
  const C2 = st.doorBy.C, D = st.doorBy.D, P = st.plateBy, floor = C2.top + C2.h;
  const pos = [0, 1].map(id => templePos(st, id));
  const zone = x => (x < C2.cx ? 0 : x < D.cx ? 1 : 2), z = pos.map(q => zone(q.x));
  const I = st.idol, idolOn = I ? (st.plates.find(pl => pl.idolOn) || null) : null;
  const dPerm = !!idolOn && (idolOn.id === '5');
  const pairIdol = !!idolOn && (idolOn.id === '3' || idolOn.id === '4');
  const zone1X = C2.x + T + 70, zone2X = D.x + T + 40, jobs = [];
  const exitJob = id => templeExitJob(st, id);
  if (z[0] === 2 && z[1] === 2) return { id: 'i-exit', jobs: [exitJob(0), exitJob(1)] };
  for (const X of [0, 1]) {
    const Y = 1 - X;
    if (z[X] === 2 && z[Y] === 1) {
      jobs[X] = templeHold(P['7'], 'Stand on the star plate: it opens the star door for ' + NAMES[Y] + '!');
      jobs[Y] = templePassable(D, 32) ? templeJob('cross', zone2X, floor, { door: D, say: 'Through the star door!' }) : templeJob('wait', templeWaitX(D, -1), floor, { door: D, say: 'Wait by the star door' });
      return { id: 'i-21' + X, jobs, focus: { id: X, x: P['7'].x, y: floor - 60, text: NAMES[X] + ': star plate!' } };
    }
    if (z[X] === 2 && z[Y] === 0) {
      if (pairIdol) {
        const other = idolOn.id === '3' ? P['4'] : P['3'];
        jobs[X] = templeHold(P['7'], 'Hold the star plate for ' + NAMES[Y] + '!');
        jobs[Y] = templeJob('via', zone2X, floor, { plate: other, door: C2, say: 'Stand on the other moon plate, then run through both doors!' });
      } else {
        jobs[X] = templeJob('via', zone1X + 60, floor, { plate: P['7'], door: D, say: 'Go back through the star door to help ' + NAMES[Y] + '!' });
        jobs[Y] = templeJob('wait', templeWaitX(C2, -1), floor, { door: C2, say: 'Wait by the moon door: ' + NAMES[X] + ' is coming to help' });
      }
      return { id: 'i-20' + X + (pairIdol ? 'p' : ''), jobs, focus: { id: Y, x: C2.x, y: floor - 70, text: 'Teamwork!' } };
    }
    if (z[X] === 1 && z[Y] === 0) {
      jobs[X] = templeHold(P['6'], 'Stand on the moon plate: it opens the moon door for ' + NAMES[Y] + '!');
      if (dPerm || templePassable(D, 60) && D.want) jobs[Y] = templeJob('cross', zone2X, floor, { doors: [C2, D], say: 'Run through the moon door and the star door!' });
      else if (!templePassable(D, 60) || (!D.want && templeTimeLeft(st, D) < Math.abs(pos[Y].x - D.cx) / 190 + 0.4)) jobs[Y] = templeJob('via', zone2X, floor, { plate: P['5'], door: D, say: 'Tap the star plate (far left), then run all the way through!' });
      else jobs[Y] = templeJob('cross', zone2X, floor, { doors: [C2, D], say: 'Run! Through the moon door and the star door!' });
      return { id: 'i-10' + X + (dPerm ? 'p' : ''), jobs, focus: { id: Y, x: P['5'].x, y: floor - 60, text: NAMES[Y] + ': the star plate opens the big door!' } };
    }
  }
  if (z[0] === 1 && z[1] === 1) {
    if (dPerm || templePassable(D, 34)) return { id: 'i-11go', jobs: [0, 1].map(id => templeJob('cross', zone2X, floor, { door: D, say: 'Through the star door, quick!' })) };
    const h = templePickHolder(st, [P['6']], P['6'].x), r = 1 - h;
    jobs[h] = templeHold(P['6'], 'Stand on the moon plate so ' + NAMES[r] + ' can go back');
    jobs[r] = templePassable(C2, 34) ? templeJob('cross', C2.x - 70, floor, { door: C2, say: 'Go back and tap the star plate (far left)!' }) : templeJob('wait', templeWaitX(C2, 1), floor, { door: C2, say: 'Wait for the moon door' });
    return { id: 'i-11' + h, jobs, focus: { id: h, x: P['6'].x, y: floor - 60, text: NAMES[h] + ': moon plate!' } };
  }
  // both on the left
  if (pairIdol && !dPerm) {
    const other = idolOn.id === '3' ? P['4'] : P['3'];
    const h = templePickHolder(st, [other], other.x), r = 1 - h;
    jobs[h] = templeHold(other, 'Stand on the other moon plate: the idol holds one!');
    jobs[r] = templePassable(C2, 34) && other.by[h] ? templeJob('cross', zone1X, floor, { door: C2, say: 'Run through the moon door!' }) : templeJob('wait', templeWaitX(C2, -1), floor, { door: C2, say: 'Wait by the moon door' });
    return { id: 'i-00p' + h, jobs, focus: { id: h, x: other.x, y: floor - 60, text: NAMES[h] + ': the other moon plate!' } };
  }
  // a plate each, then both off together and through (the idol may already hold the star door open)
  const a = st.race || (st.race = {});
  const taken = id => (P['3'].by[id] ? '3' : P['4'].by[id] ? '4' : null);
  const t0 = taken(0), t1 = taken(1);
  if (t0 && t1 && t0 !== t1) { a[0] = t0; a[1] = t1; }
  else if (t0) { a[0] = t0; a[1] = t0 === '3' ? '4' : '3'; }
  else if (t1) { a[1] = t1; a[0] = t1 === '3' ? '4' : '3'; }
  else if (!a[0]) { const near4 = Math.abs(pos[0].x - P['4'].x) < Math.abs(pos[1].x - P['4'].x) ? 0 : 1; a[near4] = '4'; a[1 - near4] = '3'; }
  const both = P['3'].down && P['4'].down;
  if (both && C2.cover <= 4) st.raceGo = 3.0;
  const pa = idolOn && !dPerm ? null : null; void pa;
  if (st.raceGo > 0 && templePassable(C2, 30)) {
    for (const id of [0, 1]) jobs[id] = templeJob('cross', zone1X + (id ? 30 : 0), floor, { door: C2, say: 'Both off and run through together!' });
    return { id: 'i-00go', jobs, focus: { id: 0, x: C2.cx, y: floor - 80, text: 'Run, run!' } };
  }
  for (const id of [0, 1]) jobs[id] = templeHold(P[a[id]], both ? 'Ready? Both run through together!' : 'Stand on a moon plate each!');
  return { id: 'i-00' + a[0], jobs, focus: { id: st.lead, x: I ? (I.tx * T + T / 2) : P['3'].x, y: floor - 60, text: 'Push the idol onto a plate, or a plate each!' } };
}

// Room 4: one on each side; the glyphs in the carved order; star plates open the other side's star door
function templeWing(st, id) {
  const q = templePos(st, id);
  if (q.feet <= 6 * T && q.x >= 12 * T && q.x < 20 * T) return 'top';
  if (q.x < 12 * T) return 'L';
  if (q.x >= 20 * T) return 'R';
  return 'mid';
}
function templePlanSun(st) {
  const jobs = [], P = st.plateBy;
  const w = [templeWing(st, 0), templeWing(st, 1)];
  // who takes which side: a side's first arrival keeps it; on the balcony, the lead goes left
  for (const s of ['L', 'R']) if (st.owner[s] != null && w[st.owner[s]] !== s && w[1 - st.owner[s]] === s && w[st.owner[s]] !== 'top') st.owner[s] = null;
  for (const id of [0, 1]) if ((w[id] === 'L' || w[id] === 'R') && st.owner[w[id]] == null && st.owner[w[id] === 'L' ? 'R' : 'L'] !== id) st.owner[w[id]] = id;
  const sideOf = id => (st.owner.L === id ? 'L' : st.owner.R === id ? 'R' : st.owner.L != null ? 'R' : st.owner.R != null ? 'L' : id === st.lead ? 'L' : 'R');
  const n = st.seq[st.seqI], helper = { L: P.n, R: P.p }, alcDoor = { L: st.doorBy.K, R: st.doorBy.N };
  const idle = { L: 8 * T, R: 23 * T + T / 2 };
  // inside a star alcove when its glyph isn't the next one: get out (the partner opens the star door to let you out)
  const inside = id => { const s = sideOf(id), d = alcDoor[s], q = templePos(st, id); return w[id] === s && q.feet <= 10 * T + 1 && (s === 'L' ? q.x < d.x + T + 4 : q.x > d.x - 4); };
  const stuck = [0, 1].map(id => inside(id) && !(n && n.wing === sideOf(id) && n.alcove));
  if (st.sunOpen && !stuck[0] && !stuck[1]) return { id: 's-exit', jobs: [templeExitJob(st, 0), templeExitJob(st, 1)] };
  for (const id of [0, 1]) {
    const s = sideOf(id), o = 1 - id;
    if (stuck[id]) {
      const d = alcDoor[s], out = s === 'L' ? d.x + T + 18 : d.x - 18;
      jobs[id] = templePassable(d, 32) && helper[s === 'L' ? 'R' : 'L'].by[o] ? templeJob('cross', out, d.top + d.h, { door: d, say: 'Out through the star door!' })
        : templeJob('wait', s === 'L' ? d.x - 20 : d.x + T + 20, d.top + d.h, { door: d, say: 'Wait here: ' + NAMES[o] + ' opens the star door to let you out' });
      continue;
    }
    if (stuck[o] && w[id] === s) { jobs[id] = templeHold(helper[s], 'Stand on the star plate: let ' + NAMES[o] + ' out of the star room!'); continue; }
    if (st.sunOpen) { jobs[id] = templeExitJob(st, id); continue; }
    if (w[id] === 'top') { jobs[id] = templeJob('drop', s === 'L' ? 11 * T + T / 2 : 20 * T + T / 2, 16 * T, { say: 'Drop down on the ' + (s === 'L' ? 'left' : 'right') + ' side!' }); continue; }
    if (w[id] !== s) { jobs[id] = templeJob('back', 0, 0, { say: 'One on each side! ' + templeBackKey(id) + ' to go back up' }); continue; }
    if (!n) { jobs[id] = templeJob('idle', idle[s], 16 * T); continue; }
    const gw = TEMPLE_GLYPH[n.seq].word;
    if (n.wing === s) {
      if (n.alcove) {
        const d = alcDoor[s], q = templePos(st, id), inside = q.feet <= 10 * T + 1 && (s === 'L' ? q.x < d.x : q.x > d.x + T);
        if (inside || templePassable(d, 32) && helper[s === 'L' ? 'R' : 'L'].by[o]) jobs[id] = templeJob('press', n.x, n.feet, { plate: n, say: 'In you go: stand on the ' + gw + ' plate!' });
        else jobs[id] = templeJob('wait', s === 'L' ? d.x + T + 18 : d.x - 18, d.top + d.h, { door: d, say: 'Wait by the star door: ' + NAMES[o] + ' opens it' });
      } else jobs[id] = templeJob('press', n.x, n.feet, { plate: n, say: 'Stand on the ' + gw + ' plate!' });
    } else if (n.alcove) {
      const hp = helper[s];
      jobs[id] = templeHold(hp, 'Stand on the star plate: it opens ' + NAMES[o] + '’s star door');
    } else jobs[id] = templeJob('idle', idle[s], 16 * T, { say: NAMES[o] + '’s turn: the ' + gw + ' plate' });
  }
  const f = n ? { id: st.owner[n.wing] != null ? st.owner[n.wing] : 0, x: n.x, y: n.feet - 70, text: 'The ' + TEMPLE_GLYPH[n.seq].word + ' plate is next!' } : null;
  return { id: 's-' + st.seqI + w.join('') + jobs.map(j => j.k).join(''), jobs, focus: f };
}

/* ---------- can a player still get to their job? (a fall into a pocket they can't climb out of) ---------- */
// the walking map the computer uses too: a door too low to get under is stone
function templeNavOpts(st) {
  const shut = {};
  let key = 'tp';
  for (const d of st.doors) { const ok = templePassable(d); shut[d.id] = !ok; key += ok ? '1' : '0'; }
  return { key, maxDown: 12, solid: (ch, p) => (shut[ch] === true) || solidFor(ch, p) };
}
// after a little stall, now and then (one player per check): a player who can't reach their plate or spot is told
// (or, the computer, knows) to hold ▼ back to their torch. A person's check uses a map with every door open (built
// once a room, so no hitch while doors move): only a pocket no door can fix counts. The computer's uses its own map.
const TEMPLE_OPEN_NAV = { key: 'tpOpen', maxDown: 12 };
function templeLostCheck(st, plan, dt) {
  st.lostT = (st.lostT || 0) - dt;
  if (st.lostT > 0) return;
  st.lostT = 0.6;
  const id = st.lostId = 1 - (st.lostId || 0);
  const p = G.players[id], j = plan.jobs[id], P = st.pl[id];
  // (it sticks while in the air, until a check on the ground or a new step says otherwise)
  if (P.lostId !== plan.id || !p.alive || !j || !'hold press wait'.includes(j.k)) P.lost = false;
  P.lostId = plan.id;
  if (st.stallT < 8 || !p.alive || !p.grounded || !j || !'hold press wait'.includes(j.k) || typeof cpuNavReach !== 'function') return;
  const x = j.plate ? j.plate.x : j.x, feet = j.plate ? j.plate.feet : j.feet;
  const opts = typeof cpuOn === 'function' && cpuOn(id) ? templeNavOpts(st) : TEMPLE_OPEN_NAV;
  try { P.lost = cpuNavReach(p, x, feet, opts) === Infinity; } catch (e) { P.lost = false; }
}

/* ---------- Room 4: glyph presses ---------- */
function templeGlyphs(st, dt) {
  if (!st.seq || st.sunOpen) return;
  for (const pl of st.plates) {
    if (!pl.seq) continue;
    for (const id of [0, 1]) {
      if (!pl.by[id]) { pl.dwell[id] = 0; pl.used[id] = false; continue; }
      const want = st.seq[st.seqI];
      // (pressed already: counts again only if it has since become the next one, for someone still standing on it)
      if (pl.used[id] && !(pl === want && pl.used[id] !== st.seqI + 1)) continue;
      pl.dwell[id] += dt;
      if (pl.dwell[id] < TEMPLE.dwell) continue;
      pl.used[id] = st.seqI + 1;
      if (pl === want) {
        st.seqI++; pl.flash = 1; st.stallT = 0;
        Sfx.play('templeGlyph', st.seqI);
        templePop(st, pl.x, pl.feet - 46, st.seqI >= st.seq.length ? 'The sun rises!' : 'Glyph ' + st.seqI + '!', TEMPLE_GLYPH[pl.seq].col, 18);
        if (st.seqI >= st.seq.length) templeSunRise(st);
      } else if (st.seq.indexOf(pl) < st.seqI) {
        templePop(st, pl.x, pl.feet - 46, 'Done already!', '#e8dcc0', 14);
      } else if (st.seqI === 0) {
        templePop(st, pl.x, pl.feet - 46, 'Not first! Look at the Sun Door', '#e8dcc0', 14);
        Sfx.play('templeNope', id);
      } else if (st.goldGlyph) {
        templePop(st, pl.x, pl.feet - 46, 'Not that one: follow the gold glow', C.gold, 14);
        Sfx.play('templeNope', id);
      } else {
        st.stats.whoops[id]++; st.stats.resets++; st.resets = (st.resets || 0) + 1;
        st.seqI = 0;
        for (const q of st.plates) q.flash = 0;
        templePop(st, pl.x, pl.feet - 46, 'Oops! Start again!', '#ffd0d0', 17);
        Sfx.play('templeNope', id);
        templeNews(st, 'Wrong glyph! The Sun Door starts again from the first one', false);
        if (st.resets >= TEMPLE.glyphGold) templeGoldGlyphs(st);
      }
    }
  }
}
function templeSunRise(st) {
  st.sunOpen = true; st.sunT = 0;
  for (const d of st.doors) if (d.sun) d.perm = true;
  templeNews(st, 'The Sun Door is open! Into the temple, both of you!', false);
  Sfx.play('templeSun'); rumble(0, 0.3, 0.5, 300); rumble(1, 0.3, 0.5, 300);
  for (let i = 0; i < 40; i++) confetti(W / 2, 200);
  templeMangoSay(st, 'Ooh-ooh-AAH! Sunshine!', 2.5);
}

/* ---------- help: gold sand, gold lily pads, gold glyphs, Mango ---------- */
function templeGoldDoors(st, why, lv) {
  st.goldDoors = true; st.goldLv = lv || 1;
  templeUsed(st, st.goldLv >= 2 ? 'Super gold sand' : 'Gold sand');
  templeNews(st, why, true); Sfx.play('templeGold');
  templeMangoSay(st, st.goldLv >= 2 ? 'Super gold sand! Sloooow doors!' : 'Gold sand! Slower doors!', 2.5);
}
function templeUsed(st, s) { if (!st.stats.gold.includes(s)) st.stats.gold.push(s); }
function templeLily(st) {
  st.lily = true; templeUsed(st, 'Gold lily pads');
  const g = G.level.grid;
  for (let c = 0; c < COLS; c++) if (st.water[templeIx(c, 16)]) g[15][c] === '.' && (g[16][c] = '=');
  templeNews(st, 'Gold lily pads! Hop on them over the water', true); Sfx.play('templeGold');
}
function templeGoldGlyphs(st) {
  st.goldGlyph = true; templeUsed(st, 'Gold glyphs');
  templeNews(st, 'Gold glyphs! The next plate glows, and a wrong one no longer starts again', true); Sfx.play('templeGold');
}
function templeNews(st, s, gold, life) { st.news = { s, gold: !!gold, t: 0, life: life || TEMPLE.newsLife }; }
function templePop(st, x, y, s, col, size) {
  size = size || 18;
  // a new pop near one that just appeared goes above it, so two at once don't overlap
  for (let k = 0; k < 4; k++) {
    const q = st.pops.find(q => q.t < 0.9 && Math.abs(q.x - x) < 110 && Math.abs((q.y - q.t * 26) - y) < (q.size + size) * 0.6);
    if (!q) break;
    y = q.y - q.t * 26 - (q.size + size) * 0.65;
  }
  st.pops.push({ x, y, s, col: col || C.gold, size, t: 0 });
}
function templeMangoSay(st, s, secs) { const m = st.mango; m.say = s; m.sayT = secs || 2.2; m.cheer = 1; }
function templeHelp(st, pl, dt) {
  st.stepT += dt; st.stallT += dt; st.cheerCD -= dt;
  // a long time with nobody getting through a door (or pressing the next glyph): slower doors
  if (st.doors.some(d => !d.sun && !d.perm) && st.goldLv < 2 && st.stallT >= TEMPLE.stallGold * (st.goldLv + 1)) {
    if (st.goldLv < 1) templeGoldDoors(st, 'Gold sand! The doors close slower now', 1);
    else templeGoldDoors(st, 'Super gold sand! The doors close really slowly now', 2);
  }
  const m = st.mango;
  let f = pl.focus;
  // 1-player mode: Mango points out the person's own job, never the computer's
  if (f && templeCpu(f.id)) {
    const hid = 1 - f.id, j = pl.jobs[hid];
    f = j && j.say && j.k !== 'back' ? { id: hid, x: j.plate ? j.plate.x : j.x, y: (j.plate ? j.plate.feet : j.feet) - 60, text: NAMES[hid] + ': ' + j.say } : null;
  }
  m.t += dt; if (m.sayT > 0) m.sayT -= dt; m.cheer = Math.max(0, m.cheer - dt);
  m.on = st.phase === 'play' && st.stallT >= TEMPLE.mangoAfter && !!f && G.introT <= 0;
  if (m.on) {
    const tx = clamp(f.x, 50, W - 50), ty = clamp(f.y - 40 * (templeBig() ? 1.3 : 1), 96, H - 80);   // (high enough to leave the plate's tablet clear)
    m.face = tx > m.x ? 1 : -1;
    m.x += (tx - m.x) * Math.min(1, dt * 1.8); m.y += (ty + Math.sin(m.t * 2.5) * 5 - m.y) * Math.min(1, dt * 1.8);
    m.hint = f.text;
    if (Math.floor(m.t / 5) !== Math.floor((m.t - dt) / 5)) Sfx.play('templeMango');
  } else { m.x += (m.home.x - m.x) * Math.min(1, dt * 1.5); m.y += (m.home.y - m.y) * Math.min(1, dt * 1.5); }
}

/* ---------- the exit ---------- */
function templeExitStep(st, dt) {
  const d = st.exit;
  if (!d) return;
  st.doorIn = G.players.map(p => p.alive && templeCx(p) > d.x + 2 && templeCx(p) < d.x + d.w - 2 && p.y + p.h / 2 > d.y && p.y + p.h / 2 < d.y + d.h);
  if (st.doorIn[0] && st.doorIn[1]) { st.exitT += dt; if (st.exitT >= TEMPLE.exitHold) templeWin(st); }
  else st.exitT = 0;
}
function templeWin(st) {
  st.phase = 'won'; st.winT = 0;
  st.stats.roomT[st.k] = st.roomT;
  const d = st.exit;
  Sfx.play('templeRoom'); rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250);
  for (let i = 0; i < 40; i++) confetti(d.x + d.w / 2, d.y + 10);
  templeMangoSay(st, 'Ooh-ooh! Yay!', 2);
}

/* ---------- the tick (hooks around the engine's own movement) ---------- */
function templePre(st, dt) {
  if (st.phase === 'won') {
    st.winT += dt; st.winTick++;
    for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; p.input.left = p.input.right = p.input.jump = false; }
    if (st.winT < 1.0 && st.winTick % 14 === 0 && st.exit) confetti(st.exit.x + st.exit.w / 2, st.exit.y);
    if (st.winT >= TEMPLE.winHold) { const L = G.level; if (L.def.roomIndex < L.def.roomCount - 1) nextRoom(); else levelClear(); }
    return;
  }
  templePlates(st, dt);
  templeDoorsPre(st, dt);
  for (const p of G.players) {
    const P = st.pl[p.id];
    P.px = p.x; P.py = p.y;
    P.sqCD -= dt; P.missCD -= dt; P.shoutCD -= dt;
    templeSkim(st, p, dt);
    if (P.sqT > 0 && p.alive) { P.sqT -= dt; moveX(p, P.sqDir * TEMPLE.squeezeV * dt, true); if (p.input) { p.input.left = P.sqDir < 0; p.input.right = P.sqDir > 0; } }
  }
}
function templeStep(st, dt) {
  if (st.phase === 'won') return;
  st.roomT += dt;
  templeDoorsCollide(st);
  templeDoorsPass(st);
  templeIdolStep(st, dt);
  for (const p of G.players) { templeAct(st, p); templeHazards(st, p); templeBackStep(st, p, dt); }
  templeTorches(st);
  templeBananas(st);
  templeGlyphs(st, dt);
  if (st.sunOpen) st.sunT += dt;
  const pl = templePlan(st);
  templeLostCheck(st, pl, dt);
  templeHelp(st, pl, dt);
  templeExitStep(st, dt);
  for (const b of st.bananas) if (b.pop > 0) b.pop = Math.max(0, b.pop - dt * 2);
  st.pops = st.pops.filter(q => (q.t += dt) < 1.3);
  if (st.news) { st.news.t += dt; if (st.news.t > st.news.life) st.news = null; }
}

/* ---------- drawing ---------- */
let templeBackCache = null;
const TEMPLE_STYLE = {
  gate: { wall: ['#3d5a3a', '#2c432b'], glow: 'rgba(255,240,170,0.10)' },
  relay: { wall: ['#46563a', '#323f2a'], glow: 'rgba(255,230,160,0.10)' },
  idol: { wall: ['#4f4a36', '#3a3626'], glow: 'rgba(255,220,150,0.12)' },
  sun: { wall: ['#5a4a32', '#40341f'], glow: 'rgba(255,210,120,0.16)' },
};
function templePaintBack(c, st) {
  const S = TEMPLE_STYLE[st.style] || TEMPLE_STYLE.gate, g = st.base;
  // the jungle sky behind the temple (it shows at the very top)
  const sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, C.skyTop); sky.addColorStop(1, C.skyBot);
  c.fillStyle = sky; c.fillRect(0, 0, W, H);
  // the temple's inner wall: big carved blocks, warm and shady
  const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, S.wall[0]); gr.addColorStop(1, S.wall[1]);
  c.fillStyle = gr; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(0,0,0,0.16)'; c.lineWidth = 2;
  for (let y = 60; y < H - 60; y += 45) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); for (let x = (y / 45) % 2 ? 0 : 45; x < W; x += 90) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 45); c.stroke(); } }
  // sun shafts through gaps in the roof
  for (const [x, w] of [[180, 60], [520, 80], [800, 50]]) {
    const sg = c.createLinearGradient(x, 60, x + 120, H);
    sg.addColorStop(0, 'rgba(255,248,200,0.22)'); sg.addColorStop(1, 'rgba(255,248,200,0)');
    c.fillStyle = sg; c.beginPath(); c.moveTo(x, 60); c.lineTo(x + w, 60); c.lineTo(x + w + 140, H - 60); c.lineTo(x + 140, H - 60); c.closePath(); c.fill();
  }
  // faint carvings on the wall: big round sun-faces and monkey masks
  c.strokeStyle = 'rgba(255,230,170,0.08)'; c.lineWidth = 3;
  for (const [x, y] of [[120, 200], [430, 150], [720, 230]]) {
    c.beginPath(); c.arc(x, y, 34, 0, Math.PI * 2); c.stroke();
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; c.beginPath(); c.moveTo(x + Math.cos(a) * 40, y + Math.sin(a) * 40); c.lineTo(x + Math.cos(a) * 50, y + Math.sin(a) * 50); c.stroke(); }
    c.beginPath(); c.arc(x - 11, y - 6, 4, 0, Math.PI * 2); c.arc(x + 11, y - 6, 4, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(x, y + 6, 12, 0.2, Math.PI - 0.2); c.stroke();
  }
  // stone: mossy temple blocks with a leafy top where they can be walked on
  for (let r = 0; r < ROWS; r++) for (let cc = 0; cc < COLS; cc++) {
    if (g[r][cc] !== '#') continue;
    const x = cc * T, y = r * T, h = hash(cc, r);
    c.fillStyle = C.stone; c.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
    c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(x + 2, y + 2, T - 4, 3);
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(x, y + T - 3, T, 3);
    if ((cc + r) % 2) c.fillRect(x + T - 2, y, 2, T);
    if (h % 5 === 0) { c.fillStyle = C.stoneLight; c.fillRect(x + 6 + h % 10, y + 10 + (h >> 4) % 10, 8, 4); }
    if (h % 7 === 1) { c.fillStyle = 'rgba(120,190,90,0.35)'; c.beginPath(); c.arc(x + 8 + h % 14, y + T - 6, 6, 0, Math.PI * 2); c.fill(); }
    const open = r > 0 && g[r - 1][cc] !== '#';
    if (open) {
      c.fillStyle = C.grassDark; c.fillRect(x, y, T, 8);
      c.fillStyle = C.grass; c.fillRect(x, y, T, 5);
      for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(x + 5 + i * 10, y + 4, 5, 3, (i - 1) * 0.5, 0, Math.PI * 2); c.fill(); }
    }
    // a vine hanging from a ceiling block now and then
    if (r < ROWS - 1 && g[r + 1][cc] === '.' && h % 4 === 0 && r < 13) {
      const len = 30 + h % 60;
      c.strokeStyle = C.ropeDark; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x + 15, y + T); c.quadraticCurveTo(x + 22, y + T + len / 2, x + 14, y + T + len); c.stroke();
      c.fillStyle = C.rope;
      for (let k = 12; k < len; k += 14) { c.beginPath(); c.ellipse(x + 17 + (k % 28 ? 5 : -5), y + T + k, 5, 2.6, k % 28 ? 0.5 : -0.5, 0, Math.PI * 2); c.fill(); }
    }
  }
  // doorways: dark lintels and frames with carvings
  for (const d of st.doors) {
    c.fillStyle = 'rgba(20,16,8,0.45)'; c.fillRect(d.x - 3, d.top, T + 6, d.h);
    const gl = TEMPLE_GLYPH[d.glyph] || TEMPLE_GLYPH.leaf;
    c.fillStyle = '#7a6440'; c.fillRect(d.x - 5, d.top - 8, T + 10, 8);
    c.fillStyle = gl.dark; c.fillRect(d.x - 5, d.top - 3, T + 10, 3);
  }
  // water channels
  for (let r = 0; r < ROWS; r++) for (let cc = 0; cc < COLS; cc++) if (st.water[templeIx(cc, r)]) { c.fillStyle = '#1f5d6e'; c.fillRect(cc * T, r * T, T, T); }
  templePaintDeco(c, st);
}
function templePaintDeco(c, st) {
  // leaves around the edges of the screen (the jungle growing in)
  for (let i = 0; i < 26; i++) {
    const x = (i * 97) % W, top = i % 2 === 0, y = top ? 58 + (i * 13) % 20 : H - 52 - (i * 11) % 14;
    c.fillStyle = i % 3 ? C.grassDark : C.grass;
    c.beginPath(); c.ellipse(x, y, 16, 6, (i % 5 - 2) * 0.4, 0, Math.PI * 2); c.fill();
  }
  if (st.style === 'sun') {
    // the Sun Door's big carved frame over the chamber
    c.fillStyle = '#7a6440'; c.fillRect(12 * T, 6 * T, 8 * T, 4);
  }
}
function templeDrawBack(st) {
  const L = G.level, cw = canvas.width, ch = canvas.height;
  try {
    if (!templeBackCache || templeBackCache.L !== L || templeBackCache.cv.width !== cw || templeBackCache.cv.height !== ch || templeBackCache.lily !== st.lily) {
      const cv = (templeBackCache && templeBackCache.cv) || document.createElement('canvas');
      cv.width = cw; cv.height = ch;
      const c = cv.getContext('2d');
      c.setTransform(cw / W, 0, 0, ch / H, 0, 0); c.clearRect(0, 0, W, H);
      templePaintBack(c, st);
      templeBackCache = { cv, L, lily: st.lily };
    }
    ctx.drawImage(templeBackCache.cv, 0, 0, W, H);
  } catch (e) { templeBackCache = null; templePaintBack(ctx, st); }
}
// a glyph icon (leaf, flower, moon, star, sun, fish, bird, frog) centred at (x, y), about 2s wide
function templeGlyph(kind, x, y, s, col) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.2, s * 0.22); ctx.lineCap = 'round';
  switch (kind) {
    case 'leaf': ctx.beginPath(); ctx.ellipse(0, 0, s * 0.55, s, 0.6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.moveTo(-s * 0.5, s * 0.7); ctx.lineTo(s * 0.5, -s * 0.7); ctx.stroke(); break;
    case 'flower': for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55, s * 0.42, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#fff3a8'; ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2); ctx.fill(); break;
    case 'moon': ctx.beginPath(); ctx.arc(0, 0, s * 0.9, 0.5, Math.PI * 2 - 0.5); ctx.arc(s * 0.4, 0, s * 0.62, Math.PI * 2 - 0.9, 0.9, true); ctx.closePath(); ctx.fill(); break;
    case 'star': ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rd = k % 2 ? s * 0.42 : s; ctx.lineTo(Math.cos(a) * rd, Math.sin(a) * rd); } ctx.closePath(); ctx.fill(); break;
    case 'sun': ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2); ctx.fill(); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.68, Math.sin(a) * s * 0.68); ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s); ctx.stroke(); } break;
    case 'fish': ctx.beginPath(); ctx.ellipse(-s * 0.1, 0, s * 0.7, s * 0.42, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(s * 0.5, 0); ctx.lineTo(s, -s * 0.45); ctx.lineTo(s, s * 0.45); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.arc(-s * 0.45, -s * 0.08, s * 0.1, 0, Math.PI * 2); ctx.fill(); break;
    case 'bird': ctx.beginPath(); ctx.arc(0, s * 0.15, s * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(s * 0.3, -s * 0.4, s * 0.35, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.moveTo(s * 0.6, -s * 0.45); ctx.lineTo(s, -s * 0.3); ctx.lineTo(s * 0.6, -s * 0.2); ctx.fill(); break;
    case 'frog': ctx.beginPath(); ctx.ellipse(0, s * 0.2, s * 0.85, s * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(-s * 0.4, -s * 0.35, s * 0.28, 0, Math.PI * 2); ctx.arc(s * 0.4, -s * 0.35, s * 0.28, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#1c1a36'; ctx.beginPath(); ctx.arc(-s * 0.4, -s * 0.38, s * 0.1, 0, Math.PI * 2); ctx.arc(s * 0.4, -s * 0.38, s * 0.1, 0, Math.PI * 2); ctx.fill(); break;
    default: ctx.beginPath(); ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
// a stone door: the slab (with its glyph) comes down from the lintel; glyph lights above count the time left
function templeDrawDoor(st, d, t) {
  const gl = TEMPLE_GLYPH[d.glyph] || TEMPLE_GLYPH.leaf, x = d.x + 2, w = T - 4, y1 = d.top + d.cover;
  if (d.cover > 0.5) {
    ctx.save(); ctx.beginPath(); ctx.rect(d.x - 2, d.top, T + 4, d.cover); ctx.clip();
    const sy = y1 - d.h;   // the slab slides as a whole; its bottom edge is at y1
    ctx.fillStyle = '#9a8460'; ctx.fillRect(x, sy, w, d.h);
    ctx.fillStyle = '#b39c74'; ctx.fillRect(x + 2, sy + 2, w - 4, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; for (let k = 1; k < d.h / T; k++) ctx.fillRect(x, sy + k * T, w, 2);
    ctx.fillStyle = 'rgba(110,170,80,0.5)'; ctx.beginPath(); ctx.arc(x + 4, sy + d.h - 6, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(40,30,10,0.35)'; ctx.beginPath(); ctx.arc(x + w / 2, sy + d.h / 2, 10, 0, Math.PI * 2); ctx.fill();
    templeGlyph(d.glyph, x + w / 2, sy + d.h / 2, 7.5, gl.col);
    if (d.glow > 0) { ctx.globalAlpha = d.glow * 0.6; ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.strokeRect(x + 1, sy + 1, w - 2, d.h - 2); ctx.globalAlpha = 1; }
    ctx.restore();
    ctx.fillStyle = '#6b5636'; ctx.fillRect(x - 1, y1 - 3, w + 2, 3);
  }
  // the light column over the doorway
  if (d.lights > 0) {
    const left = templeTimeLeft(st, d), full = d.close * templeSlow(st) * (d.h - PH - 1) / d.h;
    const frac = d.want || d.perm ? 1 : clamp(left / full, 0, 1), lit = Math.ceil(frac * d.lights - 0.001);
    const big = templeBig(), gap = big ? 13 : 11, r = big ? 4.8 : 3.8;
    for (let i = 0; i < d.lights; i++) {
      const ly = d.top - 16 - i * gap, on = i < lit, closing = !d.want && on && frac < 1;
      ctx.fillStyle = 'rgba(30,22,10,0.55)'; circle(d.cx, ly, r + 2); ctx.fill();
      if (on) {
        const blink = closing && i === lit - 1 && !reduceMotion ? 0.55 + 0.45 * Math.sin(t * 16) : 1;
        ctx.globalAlpha = blink * 0.35; ctx.fillStyle = gl.col; circle(d.cx, ly, r + 5); ctx.fill(); ctx.globalAlpha = blink;
        ctx.fillStyle = st.goldDoors ? C.gold : gl.col; circle(d.cx, ly, r); ctx.fill(); ctx.globalAlpha = 1;
      } else { ctx.fillStyle = '#5a4a30'; circle(d.cx, ly, r * 0.8); ctx.fill(); }
    }
  }
}
function templeDrawPlate(st, pl, t) {
  const x = pl.c * T, base = pl.feet, sink = pl.anim * 3;
  // a stone tablet beside the plate shows what it does
  if (!pl.seq) {
    const icons = pl.opens.map(o => ({ g: o.d.glyph, open: true, pair: o.pair })).concat(pl.shuts.map(d => ({ g: d.glyph, open: false })));
    icons.forEach((ic, i) => {
      const cx = x + T / 2 + (i - (icons.length - 1) / 2) * 22, cy = base - 40;
      ctx.fillStyle = 'rgba(40,30,14,0.7)'; rr(cx - 10, cy - 10, 20, 20, 5); ctx.fill();
      templeGlyph(ic.g, cx, cy, 6, (TEMPLE_GLYPH[ic.g] || TEMPLE_GLYPH.leaf).col);
      ctx.lineWidth = 2;
      if (ic.open) { ctx.strokeStyle = '#9dff8a'; ctx.beginPath(); ctx.moveTo(cx + 7, cy + 6); ctx.lineTo(cx + 7, cy - 2); ctx.moveTo(cx + 4, cy + 1); ctx.lineTo(cx + 7, cy - 3); ctx.lineTo(cx + 10, cy + 1); ctx.stroke(); }
      else { ctx.strokeStyle = '#ff8a8a'; ctx.beginPath(); ctx.moveTo(cx - 8, cy - 8); ctx.lineTo(cx + 8, cy + 8); ctx.stroke(); }
      if (ic.pair) { ctx.fillStyle = '#fff3c4'; circle(cx - 6, cy + 13, 2); ctx.fill(); circle(cx + 6, cy + 13, 2); ctx.fill(); }
    });
  } else {
    // a glyph plate: its glyph on a little stone post; the next one in the order glows gold (with gold glyphs)
    const gl = TEMPLE_GLYPH[pl.seq], cx = x + T / 2, cy = base - 44, next = st.seq && st.seq[st.seqI] === pl && !st.sunOpen, done = st.seq && st.seq.indexOf(pl) < st.seqI;
    if (next && st.goldGlyph) { ctx.globalAlpha = 0.45 + 0.3 * Math.sin(t * 6); ctx.fillStyle = C.gold; circle(cx, cy, 20); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.fillStyle = '#6b5636'; ctx.fillRect(cx - 3, cy + 10, 6, base - cy - 12);
    ctx.fillStyle = done ? '#3a5a2a' : 'rgba(40,30,14,0.85)'; rr(cx - 13, cy - 13, 26, 26, 6); ctx.fill();
    templeGlyph(pl.seq, cx, cy, 8.5, done ? '#c8ffb0' : gl.col);
    if (pl.flash > 0) { ctx.globalAlpha = pl.flash; ctx.strokeStyle = gl.col; ctx.lineWidth = 3; circle(cx, cy, 16 + (1 - pl.flash) * 22); ctx.stroke(); ctx.globalAlpha = 1; }
    for (const id of [0, 1]) if (pl.by[id] && !pl.used[id] && pl.dwell[id] > 0.02) {
      ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(pl.dwell[id] / TEMPLE.dwell, 0, 1)); ctx.stroke();
    }
  }
  ctx.fillStyle = '#3a2e1a'; rr(x + 2, base - 5, T - 4, 5, 2); ctx.fill();
  const top = base - 9 + sink;
  ctx.fillStyle = pl.down ? '#ffe9a0' : '#d6b25e'; rr(x + 4, top, T - 8, base - 4 - top, 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x + 7, top + 1, T - 14, 1.5);
  if (pl.down) { ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff3b0'; ctx.fillRect(x + 2, base - 22, T - 4, 14); ctx.globalAlpha = 1; }
}
// the stone monkey idol (sitting, arms on knees, gold eyes that shine on a plate)
function templeDrawIdol(st, t) {
  const I = st.idol;
  if (!I) return;
  const x = I.fx * T, y = I.ty * T, wob = I.slideT > 0 && !reduceMotion ? Math.sin(t * 40) * 0.8 : 0;
  ctx.save(); ctx.translate(x + T / 2 + wob, y + T);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 0, 16, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8c7a5a'; rr(-15, -12, 30, 12, 3); ctx.fill();                 // base
  ctx.fillStyle = '#a8946c'; ctx.beginPath(); ctx.ellipse(0, -16, 12, 10, 0, 0, Math.PI * 2); ctx.fill();   // body
  ctx.beginPath(); ctx.arc(-13, -26, 5, 0, Math.PI * 2); ctx.arc(13, -26, 5, 0, Math.PI * 2); ctx.fill(); // ears
  ctx.beginPath(); ctx.arc(0, -27, 10, 0, Math.PI * 2); ctx.fill();               // head
  ctx.fillStyle = '#c9b48a'; ctx.beginPath(); ctx.ellipse(0, -24, 7, 5.5, 0, 0, Math.PI * 2); ctx.fill();  // face
  const eye = I.glow > 0 ? 'rgba(255,215,90,' + (0.6 + 0.4 * I.glow) + ')' : '#5a4a30';
  ctx.fillStyle = eye; circle(-3.5, -27, 2); ctx.fill(); circle(3.5, -27, 2); ctx.fill();
  ctx.strokeStyle = '#6b5636'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(0, -23, 3, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.strokeStyle = 'rgba(70,140,60,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-12, -6); ctx.quadraticCurveTo(-4, -2, 6, -8); ctx.stroke();
  if (I.glow > 0) { ctx.globalAlpha = 0.3 * I.glow; ctx.fillStyle = C.gold; circle(0, -27, 14); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.restore();
  // pushing: a little effort ring on whoever pushes
  for (const p of G.players) {
    const k = I.pushT[p.id] / TEMPLE.pushHold;
    if (k > 0.05 && p.alive) { ctx.strokeStyle = PCOL[p.id]; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(templeCx(p), p.y - 10, 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke(); }
  }
}
function templeDrawWater(st, t) {
  for (const c of st.waterCols) {
    const x = c * T, y = 16 * T;
    ctx.fillStyle = 'rgba(70,170,200,0.85)'; ctx.fillRect(x, y + 6, T, H - y - 6);
    ctx.fillStyle = 'rgba(200,245,255,0.9)';
    ctx.beginPath(); ctx.moveTo(x, y + 9);
    for (let i = 0; i <= 6; i++) ctx.lineTo(x + i * 5, y + 7 + (reduceMotion ? 0 : Math.sin(t * 3 + c * 1.7 + i * 0.9) * 1.6));
    ctx.lineTo(x + T, y + 11); ctx.lineTo(x, y + 11); ctx.closePath(); ctx.fill();
    if (st.lily) {
      const ly = y + 2 + (reduceMotion ? 0 : Math.sin(t * 2 + c) * 1);
      ctx.fillStyle = C.gold; ctx.beginPath(); ctx.ellipse(x + T / 2, ly + 4, 15, 5, 0, 0.3, Math.PI * 2 - 0.3); ctx.lineTo(x + T / 2, ly + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff8fc7'; circle(x + T / 2 + 6, ly + 2, 2.5); ctx.fill();
    }
  }
}
function templeDrawBanana(b, t) {
  if (b.got) { if (b.pop > 0) { ctx.save(); ctx.globalAlpha = b.pop; ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 2; circle(b.x, b.y, 8 + (1 - b.pop) * 20); ctx.stroke(); ctx.restore(); } return; }
  const y = b.y + (reduceMotion ? 0 : Math.sin(t * 2.4 + b.ph) * 2.5);
  ctx.fillStyle = 'rgba(255,230,110,0.25)'; circle(b.x, y, 14); ctx.fill();
  ctx.save(); ctx.translate(b.x, y); ctx.rotate(-0.4);
  ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#a8790f'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, -8, 12, 0.35, Math.PI - 0.35); ctx.arc(0, -15, 15, Math.PI - 0.55, 0.55, true); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6b4a20'; ctx.fillRect(9, -6, 3, 3);
  ctx.restore();
}
function templeDrawTorch(tc, t) {
  const x = tc.x, y = tc.feet;
  ctx.fillStyle = '#6b5636'; ctx.fillRect(x - 3, y - 34, 6, 34); ctx.fillStyle = '#8c7a5a'; rr(x - 8, y - 40, 16, 8, 3); ctx.fill();
  const lit = tc.on[0] || tc.on[1];
  if (lit) {
    const f = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 13 + x);
    ctx.fillStyle = 'rgba(255,200,90,0.3)'; circle(x, y - 48, 14 * f); ctx.fill();
    ctx.fillStyle = '#ffb43a'; ctx.beginPath(); ctx.ellipse(x, y - 48, 6 * f, 10 * f, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff1a8'; ctx.beginPath(); ctx.ellipse(x, y - 46, 3, 5 * f, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 2; i++) { ctx.fillStyle = tc.on[i] ? PCOL[i] : '#5a4a30'; circle(x + (i ? 5 : -5), y - 30, 2.5); ctx.fill(); }
}
// the exit: a golden temple doorway with a sunny glow, and a light per player
function templeDrawExit(st, t) {
  const d = st.exit;
  if (!d) return;
  const locked = st.logic === 'sun' && !st.sunOpen;
  ctx.fillStyle = '#7a6440'; rr(d.x - 6, d.y - 12, d.w + 12, d.h + 12, 6); ctx.fill();
  ctx.fillStyle = C.gold; rr(d.x - 3, d.y - 9, d.w + 6, d.h + 9, 5); ctx.fill();
  const g = ctx.createLinearGradient(0, d.y, 0, d.y + d.h); g.addColorStop(0, '#fff6cf'); g.addColorStop(1, C.glow);
  ctx.fillStyle = locked ? '#3a2e1a' : g; rr(d.x + 3, d.y - 3, d.w - 6, d.h + 3, 4); ctx.fill();
  templeGlyph('sun', d.x + d.w / 2, d.y - 16, 7, locked ? '#8c7a5a' : '#fff1a8');
  for (let i = 0; i < 2; i++) {
    const cx = d.x + d.w / 2 + (i === 0 ? -9 : 9), cy = d.y - 30;
    circle(cx, cy, 5.5);
    if (st.doorIn[i]) { ctx.fillStyle = PCOL[i]; ctx.fill(); }
    else { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill(); ctx.strokeStyle = PCOL[i]; ctx.lineWidth = 2; ctx.stroke(); }
  }
}
// Room 4: the Sun Door's carved order (on the wall over the chamber): done glyphs shine, the next one pulses
function templeDrawSunCarving(st, t) {
  if (!st.seq) return;
  const n = st.seq.length, x0 = 13 * T + 4, w = 6 * T - 8, y0 = 6 * T + 6, cw = w / n;
  ctx.fillStyle = 'rgba(40,30,14,0.75)'; rr(x0, y0, w, 52, 8); ctx.fill();
  ctx.strokeStyle = '#c9a25a'; ctx.lineWidth = 2; rr(x0, y0, w, 52, 8); ctx.stroke();
  for (let i = 0; i < n; i++) {
    const pl = st.seq[i], cx = x0 + cw * (i + 0.5), cy = y0 + 22, done = i < st.seqI || st.sunOpen, next = i === st.seqI && !st.sunOpen;
    if (next) { ctx.globalAlpha = reduceMotion ? 0.5 : 0.35 + 0.3 * Math.sin(t * 5); ctx.fillStyle = st.goldGlyph ? C.gold : '#fff1c0'; circle(cx, cy, 14); ctx.fill(); ctx.globalAlpha = 1; }
    templeGlyph(pl.seq, cx, cy, 8.5, done ? TEMPLE_GLYPH[pl.seq].col : 'rgba(230,210,170,0.45)');
    // a small arrow under each says which side it is on
    ctx.fillStyle = done ? '#c8ffb0' : '#e8d8b0';
    ctx.beginPath(); const ax = cx, ay = y0 + 42, s = pl.wing === 'L' ? -1 : 1; ctx.moveTo(ax + s * 6, ay); ctx.lineTo(ax - s * 2, ay - 4); ctx.lineTo(ax - s * 2, ay + 4); ctx.closePath(); ctx.fill();
  }
  // the sun over the chamber: rises when the order is done
  const k = st.sunOpen ? Math.min(1, st.sunT / 1.2) : 0, sy = 11 * T - k * 40;
  ctx.globalAlpha = 0.35 + 0.65 * k; templeGlyph('sun', W / 2, sy, 20 + k * 6, st.sunOpen ? '#ffd23f' : '#8c7a5a'); ctx.globalAlpha = 1;
  if (k > 0) { ctx.globalAlpha = 0.25 * k; ctx.fillStyle = '#fff1a8'; circle(W / 2, sy, 60); ctx.fill(); ctx.globalAlpha = 1; }
}
// friendly critters that live in the temple (they only watch and cheer)
function templeDrawCritters(st, t) {
  const blink = (t % 3.3) < 0.12;
  if (st.style === 'gate' || st.style === 'sun') {
    // a toucan on a ledge
    const x = st.style === 'gate' ? 830 : 90, y = st.style === 'gate' ? 106 : 152;
    ctx.fillStyle = '#1c1a36'; ctx.beginPath(); ctx.ellipse(x, y, 9, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.ellipse(x + 2, y - 2, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.moveTo(x + 5, y - 8); ctx.quadraticCurveTo(x + 22, y - 10, x + 20, y - 2); ctx.lineTo(x + 5, y - 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = blink ? '#1c1a36' : '#fff'; circle(x + 3, y - 8, 2); ctx.fill();
  }
  if (st.style === 'relay') {
    // a frog on the moat's edge
    const x = 420, y = 360, hop = reduceMotion ? 0 : Math.max(0, Math.sin(t * 1.3)) * 2;
    ctx.fillStyle = '#6fd65a'; ctx.beginPath(); ctx.ellipse(x, y - 6 - hop, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - 5, y - 13 - hop, 3.5, 0, Math.PI * 2); ctx.arc(x + 5, y - 13 - hop, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = blink ? '#6fd65a' : '#1c1a36'; circle(x - 5, y - 13 - hop, 1.5); ctx.fill(); circle(x + 5, y - 13 - hop, 1.5); ctx.fill();
  }
  if (st.style === 'idol') {
    // a sleepy tapir napping in the middle hall
    const x = 650, y = 474;
    ctx.fillStyle = '#5a5470'; ctx.beginPath(); ctx.ellipse(x, y - 12, 26, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8e4f0'; ctx.beginPath(); ctx.ellipse(x + 2, y - 13, 12, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a5470'; ctx.beginPath(); ctx.ellipse(x + 26, y - 12, 10, 8, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 36, y - 9, 6, 3, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x + 27, y - 14, 2.5, 0.2, Math.PI - 0.2); ctx.stroke();
    if (!reduceMotion) for (let k = 0; k < 3; k++) { const ph = (t * 0.5 + k / 3) % 1; ctx.globalAlpha = 1 - ph; text('z', x + 30 + ph * 16 + k * 4, y - 30 - ph * 30, 10 + k * 3, '#e8e4f0', 'center'); }
    ctx.globalAlpha = 1;
  }
  if (st.style === 'sun') {
    // a helpful capybara on the balcony, and a parrot
    const x = 420, y = 150;
    ctx.fillStyle = '#a8784a'; ctx.beginPath(); ctx.ellipse(x, y - 11, 17, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x - 14, y - 15, 9, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c1a36'; circle(x - 17, y - 17, 1.6); ctx.fill();
    ctx.fillStyle = '#ffb3d9'; ctx.beginPath(); ctx.ellipse(x - 2, y - 24, 4, 2, 0, 0, Math.PI * 2); ctx.fill();   // (a flower on its head)
    const px = 870, py = 152;
    ctx.fillStyle = '#ff4a4a'; ctx.beginPath(); ctx.ellipse(px, py - 10, 7, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5bc8ff'; ctx.beginPath(); ctx.ellipse(px - 2, py - 6, 4, 8, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.moveTo(px + 5, py - 16); ctx.lineTo(px + 10, py - 13); ctx.lineTo(px + 5, py - 11); ctx.fill();
    ctx.fillStyle = blink ? '#ff4a4a' : '#fff'; circle(px + 2, py - 15, 1.8); ctx.fill();
  }
}
// Mango the monkey: swings down to point the way after a stall, and cheers dashes
function templeDrawMango(st, t) {
  const m = st.mango, big = templeBig(), s = big ? 1.3 : 1, x = m.x, y = m.y, boxes = [];
  // the vine he hangs from
  ctx.strokeStyle = C.ropeDark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y - 22 * s); ctx.stroke();
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const bounce = m.cheer > 0 && !reduceMotion ? Math.sin(m.cheer * 18) * 3 : 0;
  ctx.translate(0, bounce);
  ctx.fillStyle = '#8a5a2e';
  ctx.strokeStyle = '#8a5a2e'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -22); ctx.stroke();                 // arm up on the vine
  ctx.beginPath(); ctx.moveTo(8, 10); ctx.quadraticCurveTo(22, 14, 18, 26); ctx.stroke(); // tail
  ctx.beginPath(); ctx.ellipse(0, 4, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -10, 10, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-10, -11, 4.5, 0, Math.PI * 2); ctx.arc(10, -11, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2c99a'; ctx.beginPath(); ctx.ellipse(0, -8, 7, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, 5, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
  const blink = (m.t % 3.7) < 0.13;
  ctx.fillStyle = '#1c1a36';
  if (blink) { ctx.fillRect(-5 + m.face, -11, 4, 1.4); ctx.fillRect(1 + m.face, -11, 4, 1.4); }
  else { circle(-3 + m.face, -10.5, 1.8); ctx.fill(); circle(3 + m.face, -10.5, 1.8); ctx.fill(); }
  ctx.strokeStyle = '#1c1a36'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(m.face * 0.5, -6, 3, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();
  boxes.push({ x0: x - 22 * s, y0: y - 34 * s, x1: x + 26 * s, y1: y + 28 * s });
  const say = m.sayT > 0 ? m.say : m.on ? m.hint : '';
  if (say) {
    const fs = big ? 17 : 13;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(say).width + 18, h = fs + 10, bx = clamp(x + 24 * s, 6, W - w - 6), by = clamp(y - 10 * s - h / 2, 78, H - h - 8);
    const bx2 = bx + w > W - 6 ? clamp(x - 24 * s - w, 6, W - w - 6) : bx;
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = m.on && m.sayT <= 0 ? C.gold : '#8a5a2e'; ctx.lineWidth = 2; rr(bx2, by, w, h, 9); ctx.fill(); ctx.stroke();
    text(say, bx2 + w / 2, by + h / 2 + 0.5, fs, '#3a3070', 'center', 'body');
    boxes.push({ x0: bx2, y0: by, x1: bx2 + w, y1: by + h });
  }
  if (m.on && m.sayT <= 0) {
    const ay = y + 34 * s + (reduceMotion ? 0 : Math.sin(t * 6) * 3);
    ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, ay + 10); ctx.lineTo(x - 8, ay); ctx.lineTo(x + 8, ay); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  return boxes;
}
// a dark chip with a coloured title and an optional second line (job hints)
function templeChip(t1, t2, x, y, col, avoid) {
  const z = templeBig() ? 1.6 : 1, f1 = Math.round(13 * z), f2 = Math.round(12 * z);
  ctx.font = '700 ' + f1 + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  let w = ctx.measureText(t1).width;
  if (t2) { ctx.font = '700 ' + f2 + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; w = Math.max(w, ctx.measureText(t2).width); }
  w = Math.min(W - 16, w + 22 * z); const h = (t2 ? 38 : 22) * z;
  const x0 = clamp(x - w / 2, 8, W - 8 - w);
  let y0 = clamp(y - h, 78, H - 8 - h);
  for (const b of avoid || []) if (x0 < b.x1 + 4 && x0 + w > b.x0 - 4 && y0 < b.y1 + 4 && y0 + h > b.y0 - 4) y0 = b.y0 - h - 6 >= 78 ? b.y0 - h - 6 : b.y1 + 6;
  ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(x0, y0, w, h, 10 * z); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; rr(x0, y0, w, h, 10 * z); ctx.stroke();
  text(t1, x0 + w / 2, y0 + 11 * z, f1, col, 'center', 'body');
  if (t2) text(t2, x0 + w / 2, y0 + 28 * z, f2, C.paper, 'center', 'body');
  return { x0, y0, x1: x0 + w, y1: y0 + h };
}
function templeDraw() {
  const st = G.mst;
  if (!st.doors) return;
  const t = G.clock;
  templeDrawBack(st);
  templeDrawCritters(st, t);
  if (st.logic === 'sun') templeDrawSunCarving(st, t);
  templeDrawWater(st, t);
  for (const tc of st.torches) templeDrawTorch(tc, t);
  templeDrawExit(st, t);
  for (const pl of st.plates) templeDrawPlate(st, pl, t);
  for (const d of st.doors) templeDrawDoor(st, d, t);
  templeDrawIdol(st, t);
  for (const b of st.bananas) templeDrawBanana(b, t);
}
function templeDrawTop() {
  const st = G.mst;
  if (!st.doors) return;
  const t = G.clock, big = templeBig(), boxes = [];
  // hold ▼ rings (going back to your torch)
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (!p.alive || P.downT <= TEMPLE.backShow) continue;
    const f = clamp(P.downT / TEMPLE.backHold, 0, 1), rs = big ? 1.5 : 1, cx = templeCx(p), ry = p.y - 14 * rs;
    ctx.lineWidth = 3 * rs; ctx.strokeStyle = 'rgba(255,255,255,0.4)'; circle(cx, ry, 9 * rs); ctx.stroke();
    ctx.strokeStyle = '#ffe9a8'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, ry, 9 * rs, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke(); ctx.lineCap = 'butt';
  }
  for (const q of templeDrawMango(st, t)) boxes.push(q);
  // job hints over each person (never for the computer): for a while when a step starts, and again when it drags on
  const pl = templePlan(st);
  const show = st.phase === 'play' && G.introT <= 0 && (st.stepT < TEMPLE.chipT || st.stepT > TEMPLE.chipAgain);
  if (show) {
    ctx.save(); if (st.stepT > TEMPLE.chipAgain && !reduceMotion) ctx.globalAlpha = 0.82 + 0.18 * Math.sin(t * 5);
    for (const id of [0, 1]) {
      const p = G.players[id], j = pl.jobs[id];
      if (!p.alive || !j || !j.say || templeCpu(id)) continue;
      let line = j.say;
      // 1-player mode: say what the computer does instead of telling the person to do its part
      const o = 1 - id;
      if (templeCpu(o) && pl.jobs[o] && pl.jobs[o].k === 'hold' && j.k === 'wait') line = j.say + ' (' + NAMES[o] + ' holds the plate)';
      const far = Math.abs(templeCx(p) - (st.pl[id].spot.x + PW / 2)) > 100 || Math.abs(p.y - st.pl[id].spot.y) > 40;
      const extra = j.k === 'back' ? '' : st.pl[id].lost ? 'Can’t get there? ' + templeBackKey(id) + ' to go back to your torch' : st.stallT > 30 && far ? 'Stuck? ' + templeBackKey(id) + ' to go back to your torch' : '';
      boxes.push(templeChip(NAMES[id] + ': ' + line, extra, templeCx(p), p.y - 22, PCOL[id], boxes));
    }
    ctx.restore();
  }
  // pops (Dash!, Squeeze!, Splash!)
  for (const q of st.pops) {
    const size = q.size * (big ? 1.3 : 1);
    ctx.font = size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const w = ctx.measureText(q.s).width + size * 0.3, x = clamp(q.x, w / 2 + 6, W - w / 2 - 6);
    let y = clamp(q.y - q.t * 26, 86, H - 20);
    // (never on top of a hint chip or Mango: go just above it)
    for (const b of boxes) if (x + w / 2 > b.x0 && x - w / 2 < b.x1 && y + size * 0.55 > b.y0 && y - size * 0.55 < b.y1) y = Math.max(86, b.y0 - size * 0.6 - 2);
    ctx.save(); ctx.globalAlpha = clamp(Math.min(q.t / 0.1, (1.3 - q.t) / 0.4), 0, 1);
    bigText(q.s, x, y, Math.round(size), q.col);
    ctx.restore();
  }
  if (st.phase === 'won') {
    const k = Math.min(1, st.winT / 0.3), last = G.level.def.roomIndex >= G.level.def.roomCount - 1;
    bigText(last ? 'Temple cleared!' : 'Room clear!', W / 2, 230, 44, C.gold, 0.6 + 0.4 * k);
  }
}
function templeHud() {
  const st = G.mst;
  if (!st.stats) return;
  const big = templeBig(), fs = big ? 20 : 14, h = big ? 40 : 28;
  const wh = st.stats.whoops[0] + st.stats.whoops[1];
  const parts = [[fmtTime(G.time), C.paper], ['🍌 ' + st.stats.bananas + '/' + st.stats.bananasTotal, '#ffe066'], ['Whoopsies ' + wh, wh ? '#ffd0b0' : C.paper]];
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const ws = parts.map(q => ctx.measureText(q[0]).width), gap = fs;
  const w = ws.reduce((a, b) => a + b, 0) + gap * 2 + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
  let x = x0 + 15;
  parts.forEach((q, i) => { text(q[0], x, cy, fs, q[1], 'left', 'body'); x += ws[i] + gap; });
  // gold help chips under it
  let gy = 12 + h + 6;
  for (const [on, s] of [[st.goldDoors, st.goldLv >= 2 ? 'SUPER GOLD SAND' : 'GOLD SAND'], [st.lily, 'GOLD LILY PADS'], [st.goldGlyph, 'GOLD GLYPHS']]) {
    if (!on) continue;
    const fs2 = big ? 15 : 11;
    ctx.font = '700 ' + fs2 + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w2 = ctx.measureText(s).width + 20;
    pill(W - 14, gy, w2, fs2 + 10, 'right');
    text(s, W - 24, gy + (fs2 + 10) / 2 + 0.5, fs2, C.gold, 'right', 'body');
    gy += fs2 + 14;
  }
  // the door timer: a closing door that someone is near, with its time left as a shrinking bar
  let best = null;
  for (const d of st.doors) {
    if (d.want || d.perm || d.sun || d.cover >= d.h || !templePassable(d)) continue;
    const near = G.players.some(p => p.alive && Math.abs(templeCx(p) - d.cx) < 260);
    if (!near) continue;
    const left = templeTimeLeft(st, d);
    if (!best || left < best.left) best = { d, left };
  }
  const ny = big ? 60 : 50;
  if (best) {
    const d = best.d, gl = TEMPLE_GLYPH[d.glyph], full = d.close * templeSlow(st) * (d.h - PH - 1) / d.h;
    const fs3 = big ? 18 : 13, bw = big ? 300 : 220, bh = big ? 40 : 30, y = ny;
    pill(W / 2, y, bw, bh, 'center');
    templeGlyph(d.glyph, W / 2 - bw / 2 + 18, y + bh / 2, big ? 8 : 6.5, gl.col);
    text(gl.word[0].toUpperCase() + gl.word.slice(1) + ' door ' + best.left.toFixed(1) + ' s', W / 2 - bw / 2 + 32, y + bh / 2 + 0.5, fs3, C.paper, 'left', 'body');
    const bx = W / 2 + (big ? 30 : 22), barW = W / 2 + bw / 2 - 14 - bx;
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(bx, y + bh / 2 - 4, barW, 8, 4); ctx.fill();
    ctx.fillStyle = st.goldDoors ? C.gold : gl.col; rr(bx, y + bh / 2 - 4, Math.max(8, barW * clamp(best.left / full, 0, 1)), 8, 4); ctx.fill();
  }
  const n = st.news;
  if (n && G.mode === 'play') {
    const a = clamp(Math.min(n.t / 0.2, (n.life - n.t) / 0.3), 0, 1), nfs = big ? 19 : 14, nh = big ? 34 : 26, yy = best ? ny + (big ? 46 : 36) : ny;
    ctx.font = '700 ' + nfs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const nw = Math.min(W - 20, ctx.measureText(n.s).width + 32);
    ctx.save(); ctx.globalAlpha = a;
    const px = pill(W / 2, yy, nw, nh, 'center');
    if (n.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(px, yy, nw, nh, nh / 2); ctx.stroke(); }
    text(n.s, W / 2, yy + nh / 2 + 0.5, nfs, n.gold ? C.gold : C.paper, 'center', 'body');
    ctx.restore();
  }
}

MODES.temple = {
  setup(st, L) {
    const lv = LEVELS[G.levelIndex], total = (lv.rooms || []).reduce((n, r) => n + r.map.join('').split('z').length - 1, 0);
    st.stats = { whoops: [0, 0], dashes: [0, 0], held: [0, 0], bananas: 0, bananasBy: [0, 0], bananasTotal: total, squeezes: 0, pushes: 0, resets: 0, backs: 0, roomT: [], gold: [] };
    templeRoom(st, L);
  },
  room(k, L) { templeRoom(G.mst, L); },
  pre(dt) { const st = G.mst; if (st.doors) templePre(st, dt); },
  step(dt) { const st = G.mst; if (st.doors) templeStep(st, dt); },
  draw() { templeDraw(); },
  drawTop() { templeDrawTop(); },
  hud() { templeHud(); },
  onRespawn(p) {
    const st = G.mst;
    if (!st.pl) return;
    const P = st.pl[p.id]; P.px = p.x; P.py = p.y; p.downLatch = true;
    for (const d of st.doors) d.side[p.id] = templeCx(p) < d.cx ? -1 : 1;
    templePop(st, templeCx(p), p.y - 14, 'Boing!', '#9fe3ff', 16);
  },
  stats() {
    const s = G.mst.stats, wh = s.whoops[0] + s.whoops[1], time = G.time;
    const medal = time <= TEMPLE_MEDAL.gold[0] && wh <= TEMPLE_MEDAL.gold[1] ? 'Gold' : time <= TEMPLE_MEDAL.silver[0] && wh <= TEMPLE_MEDAL.silver[1] ? 'Silver' : 'Bronze';
    const words = wh === 0 ? 'Not one whoopsie! Temple masters!' : wh <= 3 ? 'Super door dashing, explorers!' : 'Lots of splashes, and you made it together!';
    return [
      { label: 'Whoopsies', values: s.whoops.slice() },
      { label: 'Golden bananas', value: s.bananas + ' of ' + s.bananasTotal },
      { label: 'Dashes', values: s.dashes.slice() },
      medal + ' medal · ' + words,
      'Plates held: Pip ' + Math.round(s.held[0]) + ' s, Bo ' + Math.round(s.held[1]) + ' s · Squeezes ' + s.squeezes + ' · Idol pushes ' + s.pushes + (s.gold.length ? ' · Help: ' + s.gold.join(', ') : ''),
    ];
  },
};
// medal: [seconds, whoopsies] for Gold and Silver
const TEMPLE_MEDAL = { gold: [120, 3], silver: [240, 10] };   // (bots: a good pair ~1:00, slow 1-player people 1:25-2:10)

/* ---------- sounds ---------- */
Sfx.extra.templePlate = function () { this.tone(330, 0.07, 'triangle', 0.05, 260); this.tone(180, 0.1, 'sine', 0.05, null, 0.03); };
Sfx.extra.templeOpen = function () { this.tone(110, 0.3, 'sawtooth', 0.025, 220); this.tone(660, 0.08, 'triangle', 0.025, 880, 0.2); };
Sfx.extra.templeRumble = function () { this.tone(90, 0.5, 'sawtooth', 0.02, 70); };
Sfx.extra.templeThud = function () { this.tone(120, 0.18, 'sine', 0.08, 60); this.tone(70, 0.2, 'triangle', 0.05, null, 0.02); };
Sfx.extra.templeSqueeze = function (p) { this.tone(700 * p, 0.12, 'sine', 0.05, 1100 * p); this.tone(400 * p, 0.1, 'triangle', 0.03, null, 0.08); };
Sfx.extra.templeDash = function (p) { [523 * p, 784 * p, 1047 * p].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.045, null, i * 0.05)); };
Sfx.extra.templeBonk = function (p) { this.tone(220 * p, 0.14, 'square', 0.03, 150 * p); };
Sfx.extra.templeSplash = function (p) { this.tone(900 * p, 0.25, 'sawtooth', 0.02, 160 * p); this.tone(300, 0.3, 'sine', 0.06, 80); };
Sfx.extra.templeBack = function (p) { this.tone(400 * p, 0.14, 'sine', 0.05, 900 * p); this.tone(1200 * p, 0.08, 'triangle', 0.02, null, 0.1); };
Sfx.extra.templeTorch = function (p) { [523 * p, 784 * p].forEach((f, i) => this.tone(f, 0.1, 'sine', 0.045, null, i * 0.07)); };
Sfx.extra.templeBanana = function () { this.tone(1175, 0.08, 'triangle', 0.045, 1568); this.tone(1760, 0.1, 'sine', 0.03, null, 0.06); };
Sfx.extra.templeIdol = function () { this.tone(80, 0.45, 'sawtooth', 0.03, 60); this.tone(140, 0.2, 'triangle', 0.03, 100, 0.1); };
Sfx.extra.templeIdolStop = function () { this.tone(100, 0.12, 'sine', 0.06, 70); };
Sfx.extra.templeShout = function (p) { this.tone(520 * p, 0.1, 'square', 0.03, 780 * p); this.tone(780 * p, 0.12, 'triangle', 0.03, null, 0.08); };
Sfx.extra.templeGlyph = function (p, n) { const f = 440 * Math.pow(1.12, n || 1); this.tone(f, 0.16, 'triangle', 0.05); this.tone(f * 1.5, 0.14, 'sine', 0.03, null, 0.06); };
Sfx.extra.templeNope = function (p) { this.tone(300 * p, 0.1, 'square', 0.03, 220 * p); this.tone(220 * p, 0.12, 'square', 0.03, null, 0.1); };
Sfx.extra.templeSun = function () { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.05, null, i * 0.09)); };
Sfx.extra.templeGold = function () { [784, 988, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.templeRoom = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.06, null, i * 0.09)); };
Sfx.extra.templeMango = function () { this.tone(900, 0.06, 'square', 0.015, 1300); this.tone(1300, 0.08, 'square', 0.012, 900, 0.08); };
MODES.temple.test = { TEMPLE, templePlan, templePassable, templeTimeLeft, templeOnPlate, templeWing, templeGap, templeIdolFree, TEMPLE_MEDAL };
