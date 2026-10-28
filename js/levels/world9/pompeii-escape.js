/* Pip & Bo - Level 9-1 Pompeii Escape (team). */
'use strict';

/* ===== MODES.pompeii — 9-1 Pompeii Escape (World 9 "Great Escapes", team) =====
   Gavyn's idea: ash falls and lava creeps in, and you help each other climb the rooftops to the harbor boat.
   A cartoony Pompeii, 79 AD, with Vesuvius puffing on the left. Two teamwork moves:
   - BOOST: hop on your standing partner's head and jump. It springs you higher than a normal jump (780 px/s).
   - HAND-UP (the action, 'help'): stand at a roof edge and press help. An arm reaches down, grabs the partner
     below and pulls them up. The partner below can press help too (the arm reaches, or they call "Help!").
   Every teamwork wall is 4 or 5 tiles, more than a jump, so the last one up always needs a hand. Roles swap at
   every wall (def.leads). The lava creeps in sideways along the street from the volcano side. It waits for the room
   card, stops short of the next teamwork wall (def.lava.caps) and never closer than stopGap behind the rearmost
   player (so it can't cut anyone off), backs off and slows down after a "Hot foot!", and a hot foot only pops you
   back to your own last banner. Falling ash makes you sneeze (a little hop), never fall.
   Map chars (parsed here, the rest of the game never sees them):
     h q v  house walls (three plaster colours)   m  marble   j  amphora crates   d  quay planks   B  ship hull
     K  the wobbly column   Y  the cargo cart (2 x 2)                          -> solid '#' cells, drawn here
     ~  lava pool (always hot)   A  market awning (bounces you def.awnB[i] px)   N  banner (checkpoint)
     !  teamwork spot, on the cell above a roof's end (the open end is the drop side)   y  the cart's stop column
     E  the exit arch (the engine's door, taken over: drawn and checked here)
   Room def: { title, tip, bg: 'town'|'forum'|'harbor', leads: [who climbs first at each spot], awnB, exitLabel,
     lava: { delay, speed, caps: [tiles per stage, or 'cart'] }, ash: { every, aim }, boards: [{ x, y, text, ... }] }
   Every top-level name starts with pompeii / POMPEII (Sfx.extra.pompeii* too); all level state lives in G.mst. */
const POMPEII = {
  // teamwork
  boostV: 780, superV: 900, boostCredit: 100,
  reachLen: 100, longLen: 140, longW: 72, reachGrow: 0.12, reachLife: 1.1, zoneW: 44, edgeNear: 14,
  pullT: 0.55, gripT: 0.1, riseT: 0.38, stepBackV: 190,
  // lava (the street band and the pools)
  lavaTop: 466, hotLine: 469, heatGap: 70, stopGap: 56, backOff: 90, backWait: 2.5, assistStep: 0.85, assistMin: 0.5,
  catchGap: 300, catchMul: 2.2, breezeAt: 2, breezeMul: 0.7, hotV: 520, hotT: 0.6, cartLag: 4,
  // ash
  ashR: 9, ashV: 165, sneezeT: 0.45, sneezeV: 230, sneezeCD: 3.0,
  // the world's moving bits
  awnB: 70, colBoth: 0.35, creakT: 0.5, fallT: 0.7, colNoJump: 0.15,
  heaveT: 0.28, slideT: 0.18, aloneT: 0.5, boardT: 0.3, sailT: 3.6,
  // help for stuck players (gold help is always announced)
  backHold: 1.0, backShow: 0.15, sepHint: 2.5, sepAuto: 8, exitHold: 0.35,
  superAfter: 22, longFails: 3, badgeT: 5, hintGap: 6, hintLife: 3, upHint: 2.5,
};
const POMPEII_SOLID = 'hqvmjdBKY';
// wall, trim, shade per house letter
const POMPEII_HOUSE = { h: ['#f2c784', '#c98b4c', '#e3b26e'], q: ['#f0a487', '#bf6a52', '#e2917a'], v: ['#f5e2b6', '#c4a46c', '#e8d2a0'] };

// the player's own key for hint bubbles: keyboard (F / '/', W / ↑, S / ↓), controller or touch
function pompeiiKey(id, what) {
  const how = actKey(id);
  if (what === 'act') return how === 'pad' ? glyph('act') : how === 'touch' ? 'help' : id === 0 ? 'F' : '/';
  if (what === 'jump') return how === 'pad' ? glyph('a') : how === 'touch' ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'right') return how === 'pad' ? 'stick ▶' : how === 'touch' ? '▶' : id === 0 ? 'D' : '→';
  return how === 'pad' ? 'stick ▼' : how === 'touch' ? '▼' : id === 0 ? 'S' : '↓';
}

/* ---------- the room: parse the map, set up the lava, ash and helpers ---------- */
// the standable run on row r through column c: cells solid on row r with open air above
function pompeiiRun(L, r, c) {
  const g = L.grid, ok = x => x >= 0 && x < COLS && g[r][x] === '#' && (r === 0 || g[r - 1][x] !== '#');
  let c0 = c, c1 = c;
  while (ok(c0 - 1)) c0--;
  while (ok(c1 + 1)) c1++;
  return { c0, c1, x0: c0 * T, x1: (c1 + 1) * T };
}
function pompeiiBox(cells) {
  const xs = cells.map(k => k.c), ys = cells.map(k => k.r);
  return { c0: Math.min(...xs), c1: Math.max(...xs), r0: Math.min(...ys), r1: Math.max(...ys) };
}
function pompeiiRoom(st, L) {
  const def = L.def, g = L.grid, cfg = POMPEII;
  st.sty = [];
  for (let r = 0; r < ROWS; r++) st.sty.push(new Array(COLS).fill(null));
  const marks = [], flags = [], cells = { K: [], Y: [], B: [] };
  st.pools = []; st.awnings = []; st.stopCol = -1;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = g[r][c];
    if (POMPEII_SOLID.includes(ch)) { st.sty[r][c] = ch; g[r][c] = '#'; if (cells[ch]) cells[ch].push({ c, r }); }
    else if (ch === '~') { st.pools.push({ c, r }); g[r][c] = '.'; }
    else if (ch === 'A') {
      const a = st.awnings[st.awnings.length - 1];
      if (a && a.r === r && a.c1 === c - 1) a.c1 = c; else st.awnings.push({ r, c0: c, c1: c });
      g[r][c] = '.';
    } else if (ch === 'N') { flags.push({ c, r }); g[r][c] = '.'; }
    else if (ch === '!') { marks.push({ c, r }); g[r][c] = '.'; }
    else if (ch === 'y') { st.stopCol = c; g[r][c] = '.'; }
  }
  st.awnings.forEach((a, i) => Object.assign(a, { x0: a.c0 * T, x1: (a.c1 + 1) * T, top: a.r * T + 8, b: (def.awnB && def.awnB[i]) || cfg.awnB, sq: 0 }));
  // teamwork spots, left to right; roles from def.leads
  const leads = def.leads || [0, 1];
  marks.sort((a, b) => a.c - b.c);
  st.spots = marks.map((m, i) => {
    const run = pompeiiRun(L, m.r + 1, m.c), dir = m.c === run.c1 && m.c !== run.c0 ? 1 : -1, under = st.sty[m.r + 1][m.c];
    const edgeX = dir < 0 ? run.x0 : run.x1;
    return { i, kind: under === 'K' ? 'column' : under === 'B' ? 'ship' : 'spot', dir, edgeX, top: (m.r + 1) * T, run,
      lead: leads[i % leads.length], done: false, fails: 0, longArm: false, key: edgeX };
  });
  st.banners = flags.sort((a, b) => a.c - b.c).map(f => ({ c: f.c, r: f.r, x: f.c * T + 15, feet: (f.r + 1) * T, run: pompeiiRun(L, f.r + 1, f.c), pop: [0, 0] }));
  st.column = null; st.cart = null; st.ship = null;
  if (cells.K.length) {
    const b = pompeiiBox(cells.K);
    st.column = { ...b, x: b.c0 * T, y: b.r0 * T, w: (b.c1 - b.c0 + 1) * T, h: (b.r1 - b.r0 + 1) * T, px: (b.c1 + 1) * T, py: (b.r1 + 1) * T,
      phase: 'stand', t: 0, both: 0, riders: null };
    // where the riders hop off: the bank at the far end of the fallen column
    const far = pompeiiRun(L, (st.column.py - st.column.w) / T, (st.column.px + st.column.h) / T);
    st.column.land = [far.x0 + 4, Math.max(far.x0 + PW + 8, far.x1 - 4 - PW)];
    st.column.landFeet = st.column.py - st.column.w;
  }
  if (cells.Y.length) {
    const b = pompeiiBox(cells.Y);
    st.cart = { kind: 'cart', c: b.c0, r: b.r0, w: b.c1 - b.c0 + 1, h: b.r1 - b.r0 + 1, heave: 0, alone: 0, slide: 0, done: false, key: b.c0 * T, wheel: 0 };
  }
  if (cells.B.length) {
    const b = pompeiiBox(cells.B);
    st.ship = { x: b.c0 * T, top: b.r0 * T, off: 0, board: 0, sail: null, wag: 0 };
  }
  // the painted and carved words (no windows behind them)
  st.boardBox = (def.boards || []).map(b => { const sz = b.size || 16, hw = b.text.length * sz * 0.36 + 8;
    return [b.x - Math.max(hw, b.dog ? 34 : 0), b.y - sz, b.x + Math.max(hw, b.dog ? 34 : 0), b.y + sz + (b.dog ? 54 : 0)]; });
  st.objs = st.spots.concat(st.cart ? [st.cart] : []).sort((a, b) => a.key - b.key);
  st.stage = 0;
  st.exit = L.door ? { ...L.door } : null; L.door = null; st.exitT = 0; st.inExit = [false, false];
  pompeiiPoolCols(st);
  // lava, ash
  const lv = def.lava || {};
  st.lava = { front: 0, wait: lv.delay == null ? 3 : lv.delay, speed: lv.speed || 12, caps: lv.caps || [COLS], assist: 1, breeze: 1, roomHot: 0, started: false, t: 0 };
  st.ashCfg = Object.assign({ every: 2, aim: 0.5 }, def.ash || {});
  st.ash = []; st.ashT = st.ashCfg.every; st.piles = [];
  // players: their own banner, locks, hints
  st.spawns = L.spawns.map(s => ({ ...s }));
  st.pl = [0, 1].map(k => ({ lock: null, lockT: 0, reach: null, banner: -1, sneezeCD: 0, downT: 0, sepT: 0, sepHinted: false,
    headPre: false, boost: null, waitJump: false, prevFeet: st.spawns[k].y + PH, hint: null, hintCD: 0, saved: null, heat: false,
    colT: 9, sayCD: 0, cartT: 0 }));
  st.pull = null; st.badgeT = 0; st.badgeWait = 0; st.badgeArmed = true; st.stuckT = 0; st.upT = 0; st.superBoost = false;
  st.news = null; st.newsNext = null; st.pops = []; st.embers = []; st.embT = 0; st.swapT = 0; st.roomStart = G.time; st.shake = 0;
  const first = st.objs[0];
  st.lastLead = first && first.lead != null ? first.lead : null;
}
// per pool column: the lava surface (the top open pool cell) and its bottom
function pompeiiPoolCols(st) {
  const by = {};
  for (const pc of st.pools) {
    if (G.level.grid[pc.r][pc.c] === '#') continue;   // covered (the fallen column)
    const o = by[pc.c] || (by[pc.c] = { c: pc.c, top: pc.r * T, bot: (pc.r + 1) * T });
    o.top = Math.min(o.top, pc.r * T); o.bot = Math.max(o.bot, (pc.r + 1) * T);
  }
  st.poolCols = Object.values(by).sort((a, b) => a.c - b.c);
}

/* ---------- small rules ---------- */
const pompeiiCx = p => p.x + p.w / 2;
// the floor at the foot of a teamwork wall, right now (the cart can be there)
function pompeiiBaseY(s) {
  const c = s.dir < 0 ? Math.floor(s.edgeX / T) - 1 : Math.floor(s.edgeX / T);
  for (let r = Math.floor(s.top / T); r < ROWS; r++) if (tile(c, r) === '#') return r * T;
  return H;
}
// the spot whose edge p stands at (on its top, within edgeNear of the drop)
function pompeiiEdge(st, p) {
  if (!p.alive || !p.grounded || !p.tileGround) return null;
  const feet = p.y + p.h;
  for (const s of st.spots) {
    if (Math.abs(feet - s.top) > 1.5) continue;
    if (s.kind === 'column' && (!st.column || st.column.phase !== 'stand')) continue;
    if (s.dir < 0 ? p.x + p.w > s.edgeX && p.x <= s.edgeX + POMPEII.edgeNear : p.x < s.edgeX && p.x + p.w >= s.edgeX - POMPEII.edgeNear) return s;
  }
  return null;
}
// q's body touches the hand's reach: the strip beside the wall from the top down to the hand
// (gold "Super stretch!" reaches further down and further out from the wall)
function pompeiiInZone(q, s, len) {
  const zw = s.longArm ? POMPEII.longW : POMPEII.zoneW, zx = s.dir < 0 ? s.edgeX - zw : s.edgeX;
  return q.alive && q.y + q.h > s.top + 4 && rectHit(q, zx, s.top, zw, len + 2);
}
// the hand can't reach the head of a partner standing at the foot: they have to jump for it
function pompeiiTall(s) { return pompeiiBaseY(s) - PH - 2 > s.top + (s.longArm ? POMPEII.longLen : POMPEII.reachLen); }
// q waits below this wall (near its foot)
function pompeiiNear(q, s) {
  const zw = POMPEII.zoneW + 40, zx = s.dir < 0 ? s.edgeX - zw : s.edgeX;
  return q.alive && q.y + q.h > s.top + 4 && q.y + q.h <= pompeiiBaseY(s) + 2 && rectHit(q, zx, s.top, zw, H);
}
// q stands at the foot of the wall, where the hand reaches
function pompeiiAtFoot(q, s) {
  const zx = s.dir < 0 ? s.edgeX - POMPEII.zoneW : s.edgeX;
  return q.alive && q.grounded && q.tileGround && Math.abs(q.y + q.h - pompeiiBaseY(s)) < 2 && q.x + q.w > zx && q.x < zx + POMPEII.zoneW;
}
// p is on top of (or past) the spot's wall
function pompeiiUp(p, s) {
  return p.alive && p.y + p.h <= s.top + 2 && (s.dir < 0 ? pompeiiCx(p) > s.edgeX : pompeiiCx(p) < s.edgeX);
}
function pompeiiOnColumn(st, p) {
  const col = st.column;
  return !!col && col.phase === 'stand' && p.alive && p.grounded && p.tileGround && Math.abs(p.y + p.h - col.y) < 1.5 && p.x + p.w > col.x && p.x < col.x + col.w;
}
// p stands on the partner's head (the partner is under them)
const pompeiiOnHead = p => p.alive && p.onPartner && !p.tileGround && other(p).alive && other(p).y > p.y;
// standing on `where` (column top, ship deck), or on the head of a partner who is: a stacked pair counts too
const pompeiiStackOn = (p, where) => where(p) || (pompeiiOnHead(p) && where(other(p)));
// in the middle of teamwork (reaching, being reached for, a pull, standing on or carrying a partner): ash doesn't make you sneeze
function pompeiiBusy(st, p) {
  const o = other(p);
  return !!st.pull || !!st.pl[p.id].reach || !!st.pl[o.id].reach || pompeiiOnHead(p) || pompeiiOnHead(o);
}
function pompeiiStage(st) {
  for (let i = 0; i < st.objs.length; i++) if (!st.objs[i].done) return i;
  return st.objs.length;
}
// how far the lava may creep right now (px): short of the next teamwork spot, or behind the cart
function pompeiiCap(st) {
  const caps = st.lava.caps, cv = caps[Math.min(st.stage, caps.length - 1)];
  if (cv === 'cart') return st.cart ? Math.max(0, (st.cart.c - POMPEII.cartLag) * T) : 0;
  return (+cv || 0) * T;
}
// where p comes back: their own last banner (or the room's start)
function pompeiiSpawnFor(st, id) {
  const P = st.pl[id], b = st.banners[P.banner];
  if (!b) return { ...st.spawns[id] };
  const x0 = b.run.x0 + 4, x1 = b.run.x1 - 4;
  const x = id === 0 ? clamp(b.x - 30, x0, x1 - 2 * PW - 6) : clamp(b.x + 8, x0 + PW + 6, x1 - PW);
  return { x, y: b.feet - PH };
}
function pompeiiToBanner(st, p) {
  G.spawnPts[p.id] = pompeiiSpawnFor(st, p.id);
  puff(pompeiiCx(p), p.y + p.h / 2, 8, 'rgba(255,255,255,0.9)');
  Sfx.play('pompeiiPoof', p.id);
  respawn(p);
}

/* ---------- words over heads, news, pops ---------- */
// a hint bubble over p (hints repeat at most every hintGap; force = say it now)
function pompeiiSay(st, p, text, force) {
  const P = st.pl[p.id];
  if (!force && P.hintCD > 0) return;
  if (P.hint && P.hint.text === text && P.hint.t < P.hint.life - 0.4) return;
  P.hint = { text, t: 0, life: POMPEII.hintLife };
  P.hintCD = POMPEII.hintGap;
}
// the news pill at the top; gold help is never cut short by plain news (that waits its turn)
function pompeiiNews(st, text, gold, life = 3) {
  const n = { text, gold: !!gold, t: 0, life };
  if (!gold && st.news && st.news.gold && st.news.t < st.news.life - 0.3) { st.newsNext = n; return; }
  st.news = n;
  if (gold) Sfx.play('pompeiiGold');
}
function pompeiiPop(st, x, y, text, col, size = 18) {
  // a fresh pop steps up over any young one in the same place (Boost! then Hand-up! a moment later)
  for (let n = 0; n < 3; n++) {
    const q = st.pops.find(o => o.t < 0.8 && Math.abs(o.x - x) < 80 && Math.abs(o.y - o.t / o.life * 26 - y) < 24);
    if (!q) break;
    y = q.y - q.t / q.life * 26 - 26;
  }
  st.pops.push({ x, y, text, col, size, t: 0, life: 1.1 });
}

/* ---------- the hand-up ---------- */
function pompeiiStartReach(st, p, s, auto) {
  const P = st.pl[p.id];
  if (P.lock) return;
  if (!P.reach || P.reach.s !== s) { P.reach = { s, t: 0, len: 0, auto: !!auto }; Sfx.play('pompeiiReach', p.id); }
  else { P.reach.t = Math.min(P.reach.t, POMPEII.reachGrow); P.reach.auto = !!auto && P.reach.auto; }
  // a tall wall: the partner below has to jump for the hand (told the first time)
  const q = other(p);
  if (pompeiiNear(q, s) && pompeiiTall(s)) pompeiiSay(st, q, 'Jump for the hand! (' + pompeiiKey(q.id, 'jump') + ')', !s.toldJump);
  s.toldJump = true;
}
function pompeiiPress(st, p) {
  const P = st.pl[p.id];
  if (P.lock || !p.alive || st.pull) return;
  const s = pompeiiEdge(st, p);
  if (s) { pompeiiStartReach(st, p, s, false); return; }
  // below a wall: the partner at the edge reaches down, or you call for help
  for (const s2 of st.spots) {
    if (!pompeiiNear(p, s2)) continue;
    const o = other(p);
    if (pompeiiEdge(st, o) === s2 && !st.pl[o.id].lock) pompeiiStartReach(st, o, s2, true);
    else if (P.sayCD <= 0) {
      P.sayCD = 0.8;
      pompeiiSay(st, p, 'Help! Give me a hand!', true);
      Sfx.play('pompeiiCall', p.id);
    }
    return;
  }
}
function pompeiiReachStep(st, dt) {
  const cfg = POMPEII;
  for (const p of G.players) {
    const P = st.pl[p.id], R = P.reach;
    if (!R) continue;
    const s = R.s;
    if (P.lock || st.pull || pompeiiEdge(st, p) !== s) { P.reach = null; continue; }
    R.t += dt;
    R.len = (s.longArm ? cfg.longLen : cfg.reachLen) * Math.min(1, R.t / cfg.reachGrow);
    const q = other(p);
    if (!st.pl[q.id].lock && pompeiiInZone(q, s, R.len)) { P.reach = null; pompeiiStartPull(st, p, q, s); continue; }
    if (R.t >= cfg.reachLife && !(p.input.act && !R.auto)) {
      // a miss while the partner waited below: after a few, gold "Super stretch!"
      if (pompeiiNear(q, s)) {
        s.fails++;
        if (s.fails >= cfg.longFails && !s.longArm) {
          s.longArm = true;
          pompeiiNews(st, 'Super stretch! ' + NAMES[p.id] + '’s arm reaches extra far', true, 3.5);
          burst(s.edgeX, s.top, C.gold, 12);
        }
      }
      P.reach = null;
    }
  }
}
function pompeiiStartPull(st, hp, q, s) {
  const H_ = st.pl[hp.id], Q = st.pl[q.id];
  const lx = s.dir < 0 ? s.edgeX + 2 : s.edgeX - 2 - PW;
  const hx = s.dir < 0 ? Math.max(hp.x, lx + PW + 3) : Math.min(hp.x, lx - PW - 3);
  const stack = s.dir < 0 ? hx + PW > s.run.x1 : hx < s.run.x0;   // no room to step back: land on the helper's head
  st.pull = { s, helper: hp.id, partner: q.id, t: 0, x0: q.x, y0: q.y, lx, hx, stack };
  H_.lock = 'pull'; Q.lock = 'pulled'; H_.reach = null; Q.reach = null; Q.boost = null;
  q.vx = 0; q.vy = 0; hp.vx = 0;
  Sfx.play('pompeiiGrab', hp.id);
  pompeiiPop(st, pompeiiCx(q), q.y - 16, 'Got you!', PCOL[hp.id], 15);
  rumble(hp.id, 0.2, 0.4, 90); rumble(q.id, 0.2, 0.4, 90);
}
function pompeiiPullStep(st, dt) {
  const pu = st.pull;
  if (!pu) return;
  const cfg = POMPEII, s = pu.s, hp = G.players[pu.helper], q = G.players[pu.partner];
  pu.t += dt;
  const t = pu.t, sm = k => k * k * (3 - 2 * k);
  if (t >= cfg.gripT && !pu.stack) {   // the helper steps back to make room
    const dx = pu.hx - hp.x;
    if (Math.abs(dx) > 0.3) moveX(hp, Math.sign(dx) * Math.min(Math.abs(dx), cfg.stepBackV * dt), true);
  }
  hp.vx = 0; hp.vy = 0; hp.face = s.dir;
  const hangX = s.dir < 0 ? s.edgeX - PW - 1 : s.edgeX + 1, upY = s.top - PH - 6;
  const lx = pu.stack ? hp.x : pu.lx, ly = pu.stack ? hp.y - PH : s.top - PH;
  let x, y;
  if (t < cfg.gripT) { x = pu.x0; y = pu.y0; }
  else if (t < cfg.riseT) { const k = sm((t - cfg.gripT) / (cfg.riseT - cfg.gripT)); x = pu.x0 + (hangX - pu.x0) * k; y = pu.y0 + (upY - pu.y0) * k; }
  else { const k = clamp((t - cfg.riseT) / (cfg.pullT - cfg.riseT), 0, 1), e = sm(k); x = hangX + (lx - hangX) * e; y = upY + (ly - upY) * e - Math.sin(Math.PI * k) * 6; }
  q.x = x; q.y = y; q.vx = 0; q.vy = 0; q.jumping = false; q.face = -s.dir;
  if (t >= cfg.pullT) {
    q.x = lx; q.y = ly; q.sx = 0.8; q.sy = 1.2;
    st.pl[hp.id].lock = null; st.pl[q.id].lock = null; st.pull = null;
    st.stats.hands[hp.id]++;
    Sfx.play('pompeiiPull');
    pompeiiPop(st, pompeiiCx(q) - s.dir * 12, ly - 20, 'Hand-up!', C.gold, 20);
    for (let k = 0; k < 14; k++) confetti(pompeiiCx(q), ly);
    rumble(hp.id, 0.3, 0.5, 140); rumble(q.id, 0.3, 0.5, 140);
  }
}

/* ---------- boosts, awnings, the wobbly column, the cart, the ship ---------- */
function pompeiiBoosts(st) {
  for (const p of G.players) {
    const P = st.pl[p.id], o = other(p);
    // a fresh jump (jump() sets offT = 0.05 this tick) off a standing partner's head springs higher
    if (P.headPre && p.alive && !P.lock && p.offT > 0.049 && p.vy < 0) {
      const v = st.superBoost ? POMPEII.superV : POMPEII.boostV;
      p.vy = -v; p.jumping = false;   // a full spring: letting go of jump doesn't cut it short
      P.boost = { carrier: o.id, y0: o.y + o.h };   // (measured from the step's feet)
      o.sx = 1.3; o.sy = 0.72; p.sx = 0.72; p.sy = 1.35;
      Sfx.play('pompeiiBoing', p.id);
      puff(pompeiiCx(p), p.y + p.h, 7, 'rgba(255,255,255,0.9)');
      if (st.superBoost) burst(pompeiiCx(p), p.y + p.h, C.gold, 10);
      rumble(o.id, 0.3, 0.2, 80);
    }
    if (P.boost && P.lock) P.boost = null;
    else if (P.boost && p.grounded && p.tileGround && p.offT <= 0) {
      if (P.boost.y0 - (p.y + p.h) >= POMPEII.boostCredit) {
        st.stats.boosts[P.boost.carrier]++;
        pompeiiPop(st, pompeiiCx(p), p.y - 14, 'Boost!', PCOL[P.boost.carrier], 16);
      }
      P.boost = null;
    }
  }
}
function pompeiiAwnings(st) {
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (!p.alive || p.vy <= 0 || (P.lock && P.lock !== 'sneeze')) continue;
    const feet = p.y + p.h;
    for (const a of st.awnings) {
      if (P.prevFeet <= a.top + 0.5 && feet >= a.top && p.x + p.w > a.x0 + 2 && p.x < a.x1 - 2) {
        p.y = a.top - p.h; p.vy = -Math.sqrt(2 * PHYS.g * a.b); p.jumping = false; p.grounded = false;
        p.sx = 0.8; p.sy = 1.25; a.sq = 1;
        Sfx.play('pompeiiBounce', p.id);
        break;
      }
    }
  }
}
// the wobbly column: both on top -> it creaks, then tips over the lava river and lies there as a bridge
function pompeiiColRider(col, r, a) {
  const c = Math.cos(a), s = Math.sin(a), d = col.h + (r.lift || 0);   // (a rider on the partner's head rides one body higher)
  return { x: col.px + r.rx * c + d * s, y: col.py + r.rx * s - d * c };
}
function pompeiiColumnStep(st, dt) {
  const col = st.column, cfg = POMPEII;
  if (!col || col.phase === 'down') return;
  const ps = G.players, g = G.level.grid;
  if (col.phase === 'stand') {
    // both up there: side by side, or one on the other's head
    const on = ps.every(p => pompeiiStackOn(p, q => pompeiiOnColumn(st, q)) && !st.pl[p.id].lock) && !st.pull;
    col.both = on ? col.both + dt : 0;
    if (col.both < cfg.colBoth) return;
    col.phase = 'creak'; col.t = 0;
    const order = ps.slice().sort((a, b) => a.x - b.x);
    col.riders = order.map((p, k) => ({ id: p.id, rx: pompeiiCx(p) - col.px, lx: col.land[k], lift: pompeiiOnHead(p) ? PH : 0 }));
    for (const p of ps) { const P = st.pl[p.id]; P.lock = 'ride'; P.reach = null; P.colT = 9; P.hint = null; }
    Sfx.play('pompeiiCreak');
    pompeiiPop(st, col.x + col.w / 2, col.y - 48, 'Wobble wobble!', '#fff3df', 16);
    return;
  }
  col.t += dt;
  let a = 0, u = 0;
  if (col.phase === 'creak') {
    a = reduceMotion ? 0.02 * (col.t / cfg.creakT) : Math.sin(col.t * 38) * 0.02 * (col.t / cfg.creakT);
    if (col.t >= cfg.creakT) {
      col.phase = 'fall'; col.t = 0;
      for (let r = col.r0; r <= col.r1; r++) for (let c = col.c0; c <= col.c1; c++) { g[r][c] = '.'; st.sty[r][c] = null; }
      Sfx.play('whoosh');
    }
  } else {
    u = clamp(col.t / cfg.fallT, 0, 1); a = Math.PI / 2 * u * u;
  }
  col.a = a;
  for (const r of col.riders) {
    const p = ps[r.id];
    let { x, y } = pompeiiColRider(col, r, a);
    if (u > 0.55) {   // hop off onto the far bank
      const k = (u - 0.55) / 0.45, e = k * k * (3 - 2 * k);
      x += (r.lx + PW / 2 - x) * e; y += (col.landFeet - y) * e; y -= Math.sin(Math.PI * k) * 46;
    }
    p.x = x - PW / 2; p.y = y - PH; p.vx = 0; p.vy = 0; p.face = 1;
  }
  if (col.phase === 'fall' && u >= 1) {
    col.phase = 'down'; col.a = Math.PI / 2;
    const c0 = col.px / T, c1 = (col.px + col.h) / T - 1, r0 = (col.py - col.w) / T, r1 = col.py / T - 1;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { g[r][c] = '#'; st.sty[r][c] = 'K'; }
    pompeiiPoolCols(st);
    for (const r of col.riders) {
      const p = ps[r.id];
      p.x = r.lx; p.y = col.landFeet - PH; p.vx = 0; p.vy = 0; p.sx = 1.25; p.sy = 0.78;
      st.pl[r.id].lock = null; st.pl[r.id].prevFeet = col.landFeet;
    }
    for (const s of st.spots) if (s.kind === 'column') s.done = true;
    Sfx.play('pompeiiThud');
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.2);
    for (let k = 0; k < 5; k++) puff(col.px + 20 + k * 28, col.py - 4, 4, 'rgba(240,232,220,0.9)');
    pompeiiPop(st, (col.land[0] + col.land[1]) / 2 + PW / 2, col.landFeet - 50, 'What a ride!', C.gold, 20);
    rumble(0, 0.5, 0.4, 200); rumble(1, 0.5, 0.4, 200);
  }
}
// the cart rolls one tile per heave, and only when both push it (one behind the other)
function pompeiiCartStep(st, dt) {
  const cart = st.cart;
  if (!cart) return;
  cart.slide = Math.max(0, cart.slide - dt);
  if (cart.done) return;
  const g = G.level.grid, x0 = cart.c * T, floor = (cart.r + cart.h) * T;
  const pushing = p => p.alive && !st.pl[p.id].lock && p.grounded && p.tileGround && p.input.right && !p.input.left && Math.abs(p.y + p.h - floor) < 2;
  const front = G.players.find(p => pushing(p) && Math.abs(p.x + p.w - x0) < 1.5);
  const back = front && other(front), chain = !!back && pushing(back) && Math.abs(back.x + back.w - front.x) < 2;
  if (front && chain) {
    cart.heave += dt; cart.alone = 0; cart.wheel += dt * 2;
    const nc = cart.c + cart.w;
    let free = nc <= st.stopCol && !G.players.some(p => rectHit(p, nc * T, cart.r * T, T, cart.h * T));
    for (let k = 0; k < cart.h; k++) if (g[cart.r + k][nc] !== '.') free = false;
    if (cart.heave >= POMPEII.heaveT && free) {
      for (let k = 0; k < cart.h; k++) { g[cart.r + k][cart.c] = '.'; st.sty[cart.r + k][cart.c] = null; g[cart.r + k][nc] = '#'; st.sty[cart.r + k][nc] = 'Y'; }
      cart.c++; cart.heave = 0; cart.slide = POMPEII.slideT; cart.wheel += 1;
      Sfx.play('pompeiiHeave');
      puff(cart.c * T + 8, floor - 2, 4, 'rgba(230,215,190,0.9)');
      if (cart.c + cart.w - 1 >= st.stopCol) {
        cart.done = true;
        Sfx.play('pompeiiPull');
        pompeiiPop(st, cart.c * T + cart.w * T / 2, cart.r * T - 40, 'Ready to board!', C.gold, 20);
      }
    }
  } else {
    cart.heave = Math.max(0, cart.heave - dt * 2);
    if (front) {
      cart.alone += dt;
      if (cart.alone > POMPEII.aloneT) { cart.alone = -1.5; pompeiiSay(st, front, 'Too heavy! Push together!', true); Sfx.play('pompeiiHeavy', front.id); }
    } else cart.alone = 0;
  }
  if (G.introT > 0 || cart.done) return;
  // the one who isn't pushing gets told how to help: off the crates, off the cart, back behind it, or push too
  for (const p of G.players) {
    const P = st.pl[p.id], o = other(p), feet = p.y + p.h, cw = cart.w * T;
    // (someone who fell back behind the crates gets the "Fell down?" help instead)
    if (!p.alive || P.lock || !p.grounded || st.spots.some(s2 => s2.done && pompeiiBehind(pompeiiCx(p), feet, s2))) { P.cartT = 0; continue; }
    const onTop = Math.abs(feet - cart.r * T) < 2 && p.x + p.w > x0 && p.x < x0 + cw;
    const ahead = p.x >= x0 + cw - 4 && Math.abs(feet - floor) < 2;
    const high = !onTop && feet < floor - 2;   // still up on the crates (or on a head)
    const idle = !onTop && !ahead && !high && front === o && !p.input.right && p.x + p.w <= o.x + 1;
    if (!(onTop || ahead || high || idle)) { P.cartT = 0; continue; }
    P.cartT += dt;
    if (P.cartT < 2.5) continue;
    P.cartT = -4;
    pompeiiSay(st, p, onTop ? 'Hop down behind the cart!' : ahead ? 'Hop back behind the cart!' : high ? 'Hop down and push the cart!'
      : 'Push ' + NAMES[o.id] + ' and the cart! (' + pompeiiKey(p.id, 'right') + ')', true);
  }
}
// both on the deck: all aboard, the ship sails off (the clock stops at boarding)
function pompeiiShipStep(st, dt) {
  const sh = st.ship;
  if (!sh || sh.sail) return false;
  const deck = p => p.grounded && p.tileGround && Math.abs(p.y + p.h - sh.top) < 1.5 && p.x >= sh.x - 4;
  const on = p => p.alive && !st.pl[p.id].lock && pompeiiStackOn(p, deck);   // (one on the other's head counts too)
  sh.board = G.players.every(on) ? sh.board + dt : 0;
  if (sh.board < POMPEII.boardT) return false;
  for (const s of st.spots) if (s.kind === 'ship') s.done = true;
  sh.sail = { t: 0, at: G.time, base: G.players.map(p => p.x), lift: G.players.map(p => (pompeiiOnHead(p) ? PH : 0)), barks: 0 };
  for (const p of G.players) { const P = st.pl[p.id]; P.lock = 'sail'; P.reach = null; P.hint = null; }
  Sfx.play('pompeiiBark');
  pompeiiNews(st, 'All aboard! Bye bye, Vesuvius!', false, 4);
  pompeiiPop(st, sh.x + 300, sh.top - 50, 'Woof!', '#fff3df', 18);
  rumble(0, 0.3, 0.5, 200); rumble(1, 0.3, 0.5, 200);
  return true;
}
function pompeiiSail(st, dt) {
  const sh = st.ship, sl = sh.sail;
  sl.t += dt; G.time = sl.at;
  sh.off = sl.t > 0.9 ? 95 * (sl.t - 0.9) * (sl.t - 0.9) : 0;
  G.players.forEach((p, k) => { p.x = sl.base[k] + sh.off; p.y = sh.top - PH - sl.lift[k]; p.vx = 0; p.vy = 0; p.face = 1; });
  if (sl.barks === 0 && sl.t > 0.45) { sl.barks = 1; Sfx.play('pompeiiBark'); pompeiiPop(st, sh.x + 300 + sh.off, sh.top - 50, 'Woof woof!', '#fff3df', 18); }
  if (sl.barks === 1 && sl.t > 0.9) { sl.barks = 2; Sfx.play('pompeiiHorn'); }
  if (sl.t >= POMPEII.sailT) { st.stats.roomT.push(sl.at - st.roomStart); levelClear(); }
}

/* ---------- banners, lava, hot foots, ash ---------- */
function pompeiiBanners(st) {
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (!p.alive || P.lock || !p.grounded || !p.tileGround) continue;
    const feet = p.y + p.h;
    for (let i = st.banners.length - 1; i > P.banner; i--) {
      const b = st.banners[i];
      if (Math.abs(feet - b.feet) < 1.5 && p.x + p.w > b.run.x0 && p.x < b.run.x1) {
        P.banner = i; b.pop[p.id] = 1;
        G.spawnPts[p.id] = pompeiiSpawnFor(st, p.id);
        Sfx.play('pompeiiBanner', p.id);
        break;
      }
    }
  }
}
function pompeiiLavaStep(st, dt) {
  const lv = st.lava, cfg = POMPEII;
  lv.t += dt;
  if (G.introT <= 0) {
    if (lv.wait > 0) lv.wait -= dt;
    else {
      // short of the next teamwork wall, and never closer than stopGap behind the rearmost player:
      // it pushes you on, it never cuts anyone off (a hot foot only comes from walking back into it, or a pool)
      let rear = W;
      for (const p of G.players) if (p.alive) rear = Math.min(rear, p.x);
      const cap = Math.min(pompeiiCap(st), Math.max(0, rear - cfg.stopGap));
      if (!lv.started && cap > lv.front + 1) { lv.started = true; pompeiiNews(st, 'Here comes the lava! Climb, climb!', false, 2.5); Sfx.play('pompeiiRumble'); }
      let v = lv.speed * lv.assist * lv.breeze;
      if (rear - lv.front > cfg.catchGap) v *= cfg.catchMul;
      if (lv.started && lv.front < cap) lv.front = Math.min(cap, lv.front + v * dt);
    }
  }
  // heat warnings and the closest call
  for (const p of G.players) {
    const P = st.pl[p.id], feet = p.y + p.h, cx = pompeiiCx(p);
    const street = p.alive && !P.lock && feet >= cfg.hotLine && feet <= cfg.hotLine + 20;
    P.heat = lv.started && street && cx >= lv.front - 4 && cx - lv.front < cfg.heatGap;
    if (lv.started && street) {
      const d = Math.max(0, cx - lv.front);
      if (d < st.stats.closest) { st.stats.closest = d; st.stats.closeWho = p.id; }
    }
  }
}
function pompeiiHotCheck(st) {
  const lv = st.lava, cfg = POMPEII;
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (!p.alive || P.lock) continue;
    const feet = p.y + p.h, cx = pompeiiCx(p);
    let hot = feet >= cfg.hotLine && cx < lv.front - 4;
    if (!hot) for (const pc of st.poolCols) if (cx >= pc.c * T && cx < pc.c * T + T && feet > pc.top + 8) { hot = true; break; }
    if (hot) pompeiiHot(st, p);
  }
}
// "Hot foot!": a hop with smoke, then a poof back to your own banner. The lava backs off and slows a little.
function pompeiiHot(st, p) {
  const P = st.pl[p.id], cfg = POMPEII, lv = st.lava;
  P.lock = 'hot'; P.lockT = cfg.hotT; P.reach = null; P.boost = null; P.downT = 0;
  p.vy = -cfg.hotV; p.vx = 0; p.jumping = false; p.grounded = false; p.offT = 0.05;
  st.stats.hot[p.id]++; st.stats.closest = 0; st.stats.closeWho = p.id;
  pompeiiPop(st, pompeiiCx(p), p.y - 18, 'Hot foot!', '#ffcf6b', 20);
  Sfx.play('pompeiiHot', p.id);
  rumble(p.id, 0.5, 0.3, 180);
  for (let k = 0; k < 3; k++) puff(pompeiiCx(p), p.y + p.h, 5, 'rgba(120,110,115,0.8)');
  const sp = pompeiiSpawnFor(st, p.id);
  lv.front = Math.max(0, Math.min(lv.front - cfg.backOff, sp.x - 40));
  lv.wait = Math.max(lv.wait, cfg.backWait);
  lv.assist = Math.max(cfg.assistMin, lv.assist * cfg.assistStep);
  lv.roomHot++;
  if (lv.roomHot === cfg.breezeAt) { lv.breeze = cfg.breezeMul; pompeiiNews(st, 'Cool breeze! The lava slows down', true, 3.5); }
  else if (lv.started) pompeiiNews(st, 'Phew! The lava backs off a bit', false, 2.5);
}
function pompeiiGroundY(st, x, noAwn) {
  const c = clamp(Math.floor(x / T), 0, COLS - 1), g = G.level.grid;
  let y = H;
  for (let r = 0; r < ROWS; r++) if (g[r][c] === '#') { y = r * T; break; }
  if (!noAwn) for (const a of st.awnings) if (x >= a.x0 && x < a.x1 && a.top < y) y = a.top;
  for (const pc of st.poolCols) if (pc.c === c && pc.top + 6 < y) y = pc.top + 6;
  if (x < st.lava.front && y > POMPEII.lavaTop) y = POMPEII.lavaTop + 3;
  return y;
}
function pompeiiSneeze(st, p) {
  const P = st.pl[p.id], cfg = POMPEII;
  P.lock = 'sneeze'; P.lockT = cfg.sneezeT; P.sneezeCD = cfg.sneezeCD + cfg.sneezeT; P.reach = null; P.downT = 0;
  p.vy = -cfg.sneezeV; p.vx = 0; p.grounded = false; p.jumping = false; p.offT = 0.05; p.carryVx = 0;
  st.stats.sneezes[p.id]++;
  pompeiiPop(st, pompeiiCx(p), p.y - 18, 'Ah-choo!', '#e9e6f2', 18);
  Sfx.play('pompeiiSneeze', p.id);
  rumble(p.id, 0.15, 0.3, 90);
  puff(pompeiiCx(p) + p.face * 10, p.y + 10, 8, 'rgba(205,203,210,0.95)');
}
function pompeiiAshStep(st, dt) {
  const cfg = POMPEII, R = MODES.pompeii.rand, ac = st.ashCfg;
  if (G.introT <= 0) {
    st.ashT -= dt;
    if (st.ashT <= 0) {
      st.ashT = ac.every * (0.75 + R() * 0.5);
      const tg = G.players.filter(p => p.alive && !st.pl[p.id].lock && !pompeiiBusy(st, p));   // (not at someone mid-teamwork)
      let x = 30 + R() * (W - 60);
      if (tg.length && R() < ac.aim) { const p = tg[Math.floor(R() * tg.length) % tg.length]; x = pompeiiCx(p) + (R() - 0.5) * 40; }
      x = clamp(x, 12, W - 12);
      st.ash.push({ x, x0: x, y: -16, ph: R() * 6, rot: R() * 6, r: cfg.ashR * (0.85 + R() * 0.3), land: pompeiiGroundY(st, x) });
    }
  }
  for (let i = st.ash.length - 1; i >= 0; i--) {
    const a = st.ash[i];
    a.y += cfg.ashV * dt; a.ph += dt; a.rot += dt * 1.4;
    a.x = a.x0 + Math.sin(a.ph * 2.2) * 5;
    a.land = pompeiiGroundY(st, a.x);
    let hit = false;
    for (const p of G.players) {
      if (!p.alive) continue;
      const nx = clamp(a.x, p.x, p.x + p.w), ny = clamp(a.y, p.y, p.y + p.h);
      if ((a.x - nx) * (a.x - nx) + (a.y - ny) * (a.y - ny) > a.r * a.r) continue;
      hit = true;
      const P = st.pl[p.id];
      if (!P.lock && p.grounded && P.sneezeCD <= 0 && !pompeiiBusy(st, p)) pompeiiSneeze(st, p);
      else puff(a.x, a.y, 6, 'rgba(205,203,210,0.9)');
      break;
    }
    if (hit) { st.ash.splice(i, 1); continue; }
    if (a.y + a.r * 0.5 >= a.land) {
      const lava = a.land < H && (a.land === POMPEII.lavaTop + 3 || st.poolCols.some(pc => a.land === pc.top + 6));
      puff(a.x, a.land - 3, 4, lava ? 'rgba(255,190,110,0.8)' : 'rgba(200,198,205,0.85)');
      if (!lava && a.land < H) st.piles.push({ x: a.x, y: a.land, t: 0, life: 6, w: 7 + a.r * 0.6 });
      st.ash.splice(i, 1);
    }
  }
  for (const pl of st.piles) pl.t += dt;
  st.piles = st.piles.filter(pl => pl.t < pl.life && Math.abs(pompeiiGroundY(st, pl.x) - pl.y) < 1);   // (gone when the lava or the cart gets there)
  if (st.piles.length > 24) st.piles.splice(0, st.piles.length - 24);
}

/* ---------- locks, hop back, the player who went too far, objectives and hints ---------- */
function pompeiiLocks(st, dt) {
  for (const p of G.players) {
    const P = st.pl[p.id];
    P.sneezeCD = Math.max(0, P.sneezeCD - dt); P.sayCD = Math.max(0, P.sayCD - dt); P.hintCD = Math.max(0, P.hintCD - dt);
    if (P.hint) { P.hint.t += dt; if (P.hint.t >= P.hint.life) P.hint = null; }
    if (P.lock === 'sneeze') { P.lockT -= dt; if (P.lockT <= 0) P.lock = null; }
    else if (P.lock === 'hot') {
      P.lockT -= dt;
      if (Math.floor(P.lockT * 20) % 3 === 0) puff(pompeiiCx(p), p.y + p.h, 1, 'rgba(110,100,105,0.7)');
      if (P.lockT <= 0) { P.lock = null; pompeiiToBanner(st, p); }
    }
  }
}
function pompeiiHelpers(st, dt) {
  const cfg = POMPEII, ob = st.objs[st.stage], s = ob && ob.kind !== 'cart' ? ob : null;
  for (const p of G.players) {
    const P = st.pl[p.id];
    // hold down: hop back to your banner
    if (!P.lock && p.alive && p.input.down && !p.downLatch && p.grounded) {
      P.downT += dt;
      if (P.downT >= cfg.backHold) { P.downT = 0; pompeiiPop(st, pompeiiCx(p), p.y - 16, 'Hop back!', PCOL[p.id], 15); pompeiiToBanner(st, p); continue; }
    } else P.downT = 0;
    // went on past a wall while the partner still waits below it (away), or fell back down below a wall you both
    // already climbed, with your banner up there (fell): a hint, then (gold, announced) back to your banner
    if (P.lock === 'sneeze') continue;   // (a sneeze doesn't reset the wait)
    const o = other(p);
    const far = q => s.dir < 0 ? pompeiiCx(q) > s.edgeX : pompeiiCx(q) < s.edgeX;
    const away = !!s && p.alive && !P.lock && far(p) && p.y + p.h > s.top + 4 && o.alive && !far(o);
    const sp = pompeiiSpawnFor(st, p.id);
    const fell = !away && p.alive && !P.lock && !st.pull && st.spots.some(s2 => s2.done && s2.kind === 'spot' &&
      pompeiiBehind(pompeiiCx(p), p.y + p.h, s2) && !pompeiiBehind(sp.x + PW / 2, sp.y + PH, s2));
    if (!away && !fell) { P.sepT = 0; P.sepHinted = false; continue; }
    P.sepT += dt;
    if (P.sepT >= cfg.sepHint && !P.sepHinted) {
      P.sepHinted = true;
      pompeiiSay(st, p, (away ? 'Too far! Hold ' : 'Fell down? Hold ') + pompeiiKey(p.id, 'down') + (away ? ' to hop back' : ' to hop back up'), true);
    }
    if (P.sepT >= cfg.sepAuto) {
      P.sepT = 0; P.sepHinted = false;
      pompeiiPop(st, pompeiiCx(p), p.y - 16, away ? 'Back you go!' : 'Back up you go!', C.gold, 15);
      pompeiiNews(st, away ? NAMES[p.id] + ' hops back to wait for ' + NAMES[o.id] : NAMES[p.id] + ' hops back up to the banner', true, 2.5);
      pompeiiToBanner(st, p);
    }
  }
}
// a point (centre x, feet) on the low side of a teamwork wall: before its edge and below its top
function pompeiiBehind(cx, feet, s) { return (s.dir < 0 ? cx < s.edgeX : cx > s.edgeX) && feet > s.top + 4; }
function pompeiiObjectives(st, dt) {
  const cfg = POMPEII, ps = G.players;
  for (const s of st.spots) {
    if (s.done || s.kind !== 'spot') continue;
    if (ps.every(p => !st.pl[p.id].lock && p.grounded && pompeiiUp(p, s))) s.done = true;
  }
  const stage = pompeiiStage(st);
  if (stage !== st.stage) {
    st.stage = stage; st.stuckT = 0; st.upT = 0; st.superBoost = false;
    for (const P of st.pl) P.hint = null;   // (hints were about the last job)
    const nx = st.objs[stage];
    if (nx) { st.badgeT = G.introT > 0 ? 0 : cfg.badgeT - 0.2; st.badgeWait = 0.8; }
    if (nx && nx.lead != null) {
      if (st.lastLead != null && nx.lead !== st.lastLead) { st.swapT = 2.2; Sfx.play('pompeiiSwap'); }
      st.lastLead = nx.lead;
    }
  }
  if (st.badgeArmed && G.introT <= 0) { st.badgeArmed = false; st.badgeT = cfg.badgeT; }
  st.badgeT = Math.max(0, st.badgeT - dt); st.badgeWait = Math.max(0, st.badgeWait - dt);
  st.swapT = Math.max(0, st.swapT - dt);
  pompeiiHints(st, dt);
}
function pompeiiHints(st, dt) {
  const cfg = POMPEII, ob = st.objs[st.stage];
  if (G.introT > 0 || st.pull || !ob || ob.kind === 'cart' || (ob.kind === 'column' && st.column && st.column.phase !== 'stand')) { st.stuckT = 0; st.upT = 0; return; }
  const s = ob, ps = G.players, lead = ps[s.lead], step = ps[1 - s.lead];
  const up = ps.filter(p => pompeiiUp(p, s));
  if (up.length === 0) {
    st.upT = 0; st.stuckT += dt;
    if (st.stuckT >= cfg.superAfter && !st.superBoost) {
      st.superBoost = true;
      pompeiiNews(st, 'Super boost! Jump off a head to fly extra high', true, 3.5);
    }
    if (st.stuckT < cfg.hintGap) return;
    const jk = '(' + pompeiiKey(lead.id, 'jump') + ')';
    if (!pompeiiAtFoot(step, s)) {
      pompeiiSay(st, step, s.kind === 'ship' ? 'Stand on the cart, by the ship!' : s.kind === 'column' ? 'Stand by the column: be the step!' : 'Stand by the wall: be the step!');
      pompeiiSay(st, lead, 'Hop on ' + NAMES[step.id] + '’s head!');
    } else if (!(lead.onPartner && !lead.tileGround)) pompeiiSay(st, lead, 'Hop on ' + NAMES[step.id] + '’s head! ' + jk);
    else pompeiiSay(st, lead, 'Jump off ' + NAMES[step.id] + '’s head! ' + jk);
  } else if (up.length === 1) {
    st.stuckT = 0; st.upT += dt;
    if (st.upT < cfg.upHint) return;
    const U = up[0], D = other(U), R = st.pl[U.id].reach;
    if (pompeiiEdge(st, U) !== s) pompeiiSay(st, U, 'Go to the edge, by ' + NAMES[D.id] + '!');
    else if (!R) pompeiiSay(st, U, 'Press ' + pompeiiKey(U.id, 'act') + ' to help ' + NAMES[D.id] + ' up!');
    const onBase = D.grounded && D.tileGround && Math.abs(D.y + D.h - pompeiiBaseY(s)) < 2;
    if (s.kind === 'ship' && D.grounded && !onBase && !pompeiiUp(D, s)) pompeiiSay(st, D, 'Hop on the cart, by the ship!');
    else if (!pompeiiNear(D, s)) pompeiiSay(st, D, s.kind === 'column' ? 'Come to the column!' : 'Come to the wall!');
    else if (onBase && !pompeiiAtFoot(D, s) && !pompeiiInZone(D, s, H)) pompeiiSay(st, D, s.kind === 'column' ? 'Stand right by the column!' : 'Stand right by the wall!');
    else if (R && pompeiiTall(s)) pompeiiSay(st, D, 'Jump for the hand! (' + pompeiiKey(D.id, 'jump') + ')');
  } else { st.stuckT = 0; st.upT = 0; }
}
function pompeiiExitStep(st, dt) {
  const d = st.exit;
  if (!d) return false;
  st.inExit = G.players.map(p => {
    if (!p.alive || st.pl[p.id].lock) return false;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    return cx > d.x + 2 && cx < d.x + d.w - 2 && cy > d.y && cy < d.y + d.h;
  });
  if (!(st.inExit[0] && st.inExit[1])) { st.exitT = 0; return false; }
  st.exitT += dt;
  if (st.exitT < POMPEII.exitHold) return false;
  st.stats.roomT.push(G.time - st.roomStart);
  nextRoom();
  return true;
}
function pompeiiFx(st, dt) {
  const R = MODES.pompeii.rand;
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < q.life);
  if (st.news) { st.news.t += dt; if (st.news.t >= st.news.life) { st.news = st.newsNext || null; st.newsNext = null; } }
  for (const a of st.awnings) a.sq = Math.max(0, a.sq - dt * 4);
  for (const b of st.banners) for (let k = 0; k < 2; k++) b.pop[k] = Math.max(0, b.pop[k] - dt * 2);
  // embers off the lava
  const lv = st.lava;
  st.embT -= dt;
  if (st.embT <= 0) {
    st.embT = reduceMotion ? 0.5 : 0.16;
    const spots = [];
    if (lv.front > 20) spots.push([R() * lv.front, POMPEII.lavaTop]);
    for (const pc of st.poolCols) spots.push([pc.c * T + R() * T, pc.top + 6]);
    if (spots.length) {
      const [x, y] = spots[Math.floor(R() * spots.length) % spots.length];
      st.embers.push({ x, y, vx: (R() - 0.5) * 20, vy: -30 - R() * 40, life: 0.9 + R() * 0.6, max: 1.5, size: 2 + R() * 2 });
    }
  }
  for (const e of st.embers) { e.life -= dt; e.x += e.vx * dt; e.y += e.vy * dt; }
  st.embers = st.embers.filter(e => e.life > 0);
  if (st.ship) st.ship.wag += dt;
}

/* ---------- the mode ---------- */
MODES.pompeii = {
  rand: Math.random,   // cosmetic and ash randomness; tests swap in a seeded one
  setup(st, L) {
    st.stats = { hands: [0, 0], boosts: [0, 0], hot: [0, 0], sneezes: [0, 0], closest: 1e9, closeWho: 0, roomT: [] };
    pompeiiRoom(st, L);
  },
  room(k, L) { const st = G.mst; if (st.stats) pompeiiRoom(st, L); },
  pre(dt) {
    const st = G.mst;
    if (!st.pl) return;
    for (const p of G.players) {
      const P = st.pl[p.id], o = other(p);
      P.prevFeet = p.y + p.h;
      if (P.lock) {
        // locked (being pulled, pulling, sneezing, hot foot, riding): nothing you press counts
        P.saved = { ...p.input };
        for (const k in p.input) p.input[k] = false;
        p.pendingJump = false; p.jumpBuf = 0; p.pendingAct = false; P.waitJump = false;
        if (P.lock !== 'hot' && P.lock !== 'sneeze') { p.vx = 0; p.vy = 0; }
        P.headPre = false;
        continue;
      }
      P.saved = null;
      const onHead = p.onPartner && !p.tileGround;
      P.headPre = p.alive && onHead && o.alive && o.grounded && o.tileGround && !st.pl[o.id].lock;
      // no jumping off a head while the partner under you is in the air: the press waits until they land
      if (onHead && !o.grounded) {
        if (p.pendingJump || p.jumpBuf > 0) { P.waitJump = true; p.pendingJump = false; p.jumpBuf = 0; }
      } else if (P.waitJump) { if (p.input.jump) p.pendingJump = true; P.waitJump = false; }
      if (P.waitJump && !p.input.jump) P.waitJump = false;
      // the wobbly column: too wobbly to jump off its top (or off a head up there)
      P.colT = pompeiiOnColumn(st, p) || (onHead && pompeiiOnColumn(st, o)) ? 0 : P.colT + dt;
      if (P.colT < POMPEII.colNoJump && (p.pendingJump || p.jumpBuf > 0)) {
        p.pendingJump = false; p.jumpBuf = 0;
        if (P.sayCD <= 0) { P.sayCD = 1.2; pompeiiSay(st, p, 'Too wobbly to jump!', true); Sfx.play('pompeiiCreak'); }
      }
    }
  },
  step(dt) {
    const st = G.mst;
    if (!st.pl) return;
    for (const p of G.players) { const P = st.pl[p.id]; if (P.saved) { Object.assign(p.input, P.saved); P.saved = null; } }
    if (st.ship && st.ship.sail) { pompeiiFx(st, dt); pompeiiSail(st, dt); return; }
    pompeiiBoosts(st);
    pompeiiAwnings(st);
    pompeiiPullStep(st, dt);
    pompeiiColumnStep(st, dt);
    for (const p of G.players) if (p.pendingAct) { p.pendingAct = false; pompeiiPress(st, p); }
    pompeiiReachStep(st, dt);
    pompeiiCartStep(st, dt);
    pompeiiBanners(st);
    pompeiiLavaStep(st, dt);
    pompeiiHotCheck(st);
    pompeiiAshStep(st, dt);
    pompeiiLocks(st, dt);
    pompeiiHelpers(st, dt);
    pompeiiObjectives(st, dt);
    pompeiiFx(st, dt);
    if (pompeiiShipStep(st, dt)) return;
    pompeiiExitStep(st, dt);
  },
  onRespawn(p) {
    const st = G.mst;
    if (!st.pl) return;
    const P = st.pl[p.id];
    Object.assign(P, { lock: null, lockT: 0, reach: null, boost: null, waitJump: false, downT: 0, heat: false, prevFeet: p.y + p.h, colT: 9 });
  },
  draw() { pompeiiDraw(G.mst); },
  drawTop() { pompeiiDrawTop(G.mst); },
  hud() { pompeiiHud(G.mst); },
  stats() {
    const s = G.mst.stats;
    if (!s) return [];
    const hot = s.hot[0] + s.hot[1], sn = s.sneezes[0] + s.sneezes[1], time = G.time;
    // (distances in steps: one step is one tile)
    const steps = Math.round(s.closest / T);
    const closest = hot > 0 ? 'Closest call: ' + NAMES[s.closeWho] + '’s toes touched the lava. Hot foot!'
      : s.closest >= 999 ? 'The lava never even got close. Cool!'
      : steps <= 1 ? 'Closest call: ' + NAMES[s.closeWho] + ', just one step from the lava!'
      : 'The lava never got closer than ' + steps + ' steps. Cool!';
    const medal = time <= 180 && hot <= 1 ? 'Gold' : time <= 300 && hot <= 5 ? 'Silver' : 'Bronze';
    const words = hot === 0 ? 'Not one toe toasted!' : hot <= 3 ? 'Warm toes, cool heads!' : 'Hot stuff, and you made it together!';
    return [
      { label: 'Hand-ups', values: s.hands.slice() },
      { label: 'Boosts', values: s.boosts.slice() },
      { label: 'Hot foots', value: hot },
      { label: 'Ash sneezes', value: sn },
      closest,
      medal + ' medal · ' + words,
    ];
  },
};

/* ---------- drawing ---------- */
// cached canvas gradients (the canvas and its context never change)
let pompeiiSkyG = null, pompeiiSeaG = null, pompeiiBandG = null, pompeiiGlowG = null, pompeiiArchG = null;
const pompeiiPoolG = {};
function pompeiiDrawBack(st, t) {
  const bg = G.level.def.bg || 'town';
  if (!pompeiiSkyG) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#d98d88'); g.addColorStop(0.4, '#f5b88c'); g.addColorStop(0.72, '#ffd9ab'); g.addColorStop(1, '#ffe8c4');
    pompeiiSkyG = g;
  }
  ctx.fillStyle = pompeiiSkyG; ctx.fillRect(0, 0, W, H);
  // a hazy sun and soft clouds
  ctx.fillStyle = 'rgba(255,236,190,0.28)'; circle(770, 110, 64); ctx.fill();
  ctx.fillStyle = 'rgba(255,242,205,0.85)'; circle(770, 110, 38); ctx.fill();
  ctx.fillStyle = 'rgba(255,245,235,0.55)';
  for (let i = 0; i < 4; i++) {
    const x = ((i * 271 + t * (5 + i * 2)) % (W + 260)) - 130, y = 60 + i * 37;
    ctx.beginPath(); ctx.ellipse(x, y, 54, 13, 0, 0, Math.PI * 2); ctx.ellipse(x + 30, y - 9, 30, 12, 0, 0, Math.PI * 2); ctx.fill();
  }
  pompeiiDrawVolcano(t);
  if (bg === 'harbor') pompeiiDrawSea(t);
  else pompeiiDrawSkyline(bg);
}
function pompeiiDrawVolcano(t) {
  // Vesuvius, far left: a big friendly cone with a glowing top
  ctx.fillStyle = '#a4808a';
  ctx.beginPath(); ctx.moveTo(-80, 440); ctx.lineTo(96, 168); ctx.quadraticCurveTo(112, 152, 128, 160); ctx.quadraticCurveTo(150, 170, 172, 158);
  ctx.quadraticCurveTo(190, 150, 204, 166); ctx.lineTo(430, 440); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#b8949a';
  ctx.beginPath(); ctx.moveTo(150, 168); ctx.quadraticCurveTo(178, 160, 204, 166); ctx.lineTo(430, 440); ctx.lineTo(250, 440); ctx.closePath(); ctx.fill();
  // the glowing crater and two lazy lava streaks
  ctx.fillStyle = '#ff9b52'; ctx.beginPath(); ctx.ellipse(150, 163, 40, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.ellipse(150, 162, 24, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.lineCap = 'round';
  for (const [w, col] of [[10, 'rgba(255,150,80,0.3)'], [4, 'rgba(255,176,100,0.9)']]) {
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(130, 168); ctx.quadraticCurveTo(116, 200, 108, 236); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(172, 168); ctx.quadraticCurveTo(186, 192, 196, 214); ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // puffs of smoke drifting away
  const sp = reduceMotion ? 0.03 : 0.075;
  for (let i = 0; i < 7; i++) {
    const ph = (t * sp + i / 7) % 1, x = 150 + ph * 190 + Math.sin(ph * 6 + i) * 10, y = 150 - ph * 140, r = 14 + ph * 44;
    ctx.fillStyle = 'rgba(118,106,116,' + (0.55 * (1 - ph)).toFixed(3) + ')';
    circle(x, y, r); ctx.fill();
    ctx.fillStyle = 'rgba(160,150,158,' + (0.35 * (1 - ph)).toFixed(3) + ')';
    circle(x - r * 0.3, y - r * 0.35, r * 0.55); ctx.fill();
  }
}
function pompeiiDrawSkyline(bg) {
  if (bg === 'forum') {
    // a long colonnade and a temple far away, soft in the haze
    ctx.fillStyle = '#f3cdb2';
    ctx.fillRect(240, 372, 720, 9); ctx.fillRect(240, 424, 720, 20);
    for (let x = 250; x < W; x += 24) ctx.fillRect(x, 381, 8, 43);
    ctx.beginPath(); ctx.moveTo(470, 340); ctx.lineTo(560, 314); ctx.lineTo(650, 340); ctx.closePath(); ctx.fill();
    ctx.fillRect(470, 340, 180, 32);
    ctx.fillStyle = '#eabda0'; for (let x = 480; x < 650; x += 20) ctx.fillRect(x, 342, 4, 30);
    ctx.fillStyle = '#9aa57e'; for (const x of [300, 690, 905]) { ctx.beginPath(); ctx.ellipse(x, 400, 8, 34, 0, 0, Math.PI * 2); ctx.fill(); }
    return;
  }
  // the town: rows of small houses with red roofs, a few cypress trees
  for (let k = 0, x = 240; x < W + 40; k++) {
    const h = hash(k, 7), w = 38 + (h % 34), ht = 34 + ((h >> 5) % 46), y = 430 - ht;
    ctx.fillStyle = (h >> 9) % 2 ? '#efc3a4' : '#e7b596'; ctx.fillRect(x, y, w, ht + 10);
    ctx.fillStyle = '#d0806a'; ctx.beginPath(); ctx.moveTo(x - 4, y + 2); ctx.lineTo(x + w / 2, y - 10); ctx.lineTo(x + w + 4, y + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(120,70,60,0.3)'; if (h % 3) ctx.fillRect(x + w / 2 - 4, y + 12, 8, 9);
    if (h % 5 === 0) { ctx.fillStyle = '#7f9c74'; ctx.beginPath(); ctx.ellipse(x + w + 6, 392, 8, 36, 0, 0, Math.PI * 2); ctx.fill(); }
    x += w + 6 + ((h >> 13) % 10);
  }
}
function pompeiiDrawSea(t) {
  if (!pompeiiSeaG) {
    const g = ctx.createLinearGradient(0, 350, 0, H);
    g.addColorStop(0, '#8cc3d0'); g.addColorStop(1, '#3f7fa3');
    pompeiiSeaG = g;
  }
  // hills across the bay, then the sea
  ctx.fillStyle = '#c2a3a2';
  ctx.beginPath(); ctx.moveTo(330, 352); ctx.quadraticCurveTo(520, 318, 700, 340); ctx.quadraticCurveTo(840, 326, 960, 344); ctx.lineTo(960, 356); ctx.lineTo(330, 356); ctx.fill();
  ctx.fillStyle = pompeiiSeaG; ctx.fillRect(300, 352, W - 300, H - 352);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const y = 372 + i * 17, x = 340 + ((i * 113 + t * (reduceMotion ? 2 : 9)) % 560);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 9, y - 4, x + 18, y); ctx.stroke();
  }
  // little boats far away
  for (const [bx, by, s] of [[470, 360, 1], [760, 356, 0.8]]) {
    const x = bx + Math.sin(t * 0.3 + bx) * 6;
    ctx.fillStyle = '#7a5640'; ctx.beginPath(); ctx.moveTo(x - 12 * s, by); ctx.lineTo(x + 12 * s, by); ctx.lineTo(x + 8 * s, by + 5 * s); ctx.lineTo(x - 8 * s, by + 5 * s); ctx.fill();
    ctx.fillStyle = '#fff3df'; ctx.beginPath(); ctx.moveTo(x, by - 20 * s); ctx.lineTo(x + 10 * s, by - 3 * s); ctx.lineTo(x, by - 3 * s); ctx.fill();
  }
}
// one solid cell in its style
function pompeiiCell(st, ch, c, r) {
  const x = c * T, y = r * T, solid = (cc, rr2) => tile(cc, rr2) === '#';
  const top = !solid(c, r - 1), lft = !solid(c - 1, r), rgt = !solid(c + 1, r), h = hash(c, r);
  const topSame = top || !st.sty[r - 1] || st.sty[r - 1][c] !== ch;   // (the street and the quay: their own top row, even under a house)
  if (ch === 'h' || ch === 'q' || ch === 'v') {
    const [wall, trim, shade] = POMPEII_HOUSE[ch];
    ctx.fillStyle = wall; ctx.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
    if (h % 4 === 1) { ctx.fillStyle = shade; ctx.fillRect(x + 4 + (h >> 3) % 12, y + 6 + (h >> 7) % 14, 8, 4); }
    const below = tile(c, r + 1) === '#' && st.sty[r + 1] && st.sty[r + 1][c] !== ch;
    if (below || r === ROWS - 1) { ctx.fillStyle = '#b8463a'; ctx.fillRect(x, y + T - 11, T, 11); ctx.fillStyle = '#8f3229'; ctx.fillRect(x, y + T - 12, T, 2); }
    else if (!top && h % 5 === 0 && !lft && !rgt && !(st.boardBox || []).some(k => x + T > k[0] && x < k[2] && y + T > k[1] && y < k[3])) {   // a window with shutters
      ctx.fillStyle = '#6f9e86'; ctx.fillRect(x + 3, y + 7, 6, 15); ctx.fillRect(x + 21, y + 7, 6, 15);
      ctx.fillStyle = 'rgba(40,60,50,0.35)'; ctx.fillRect(x + 3, y + 14, 6, 1.5); ctx.fillRect(x + 21, y + 14, 6, 1.5);
      ctx.fillStyle = '#5a3426'; rr(x + 9, y + 6, 12, 16, 6); ctx.fill();
      ctx.fillStyle = trim; ctx.fillRect(x + 5, y + 22, 20, 3);
      if ((h >> 6) % 3 === 0) {   // a little pot of flowers on the sill
        ctx.fillStyle = '#5fa65a'; circle(x + 12, y + 20, 2.6); ctx.fill(); circle(x + 18, y + 20, 2.6); ctx.fill();
        ctx.fillStyle = '#ff6f61'; circle(x + 11, y + 19, 2); ctx.fill(); circle(x + 15, y + 18, 2); ctx.fill(); circle(x + 19, y + 19, 2); ctx.fill();
      }
    }
    if (lft) { ctx.fillStyle = trim; ctx.fillRect(x, y, 3, T); }
    if (rgt) { ctx.fillStyle = trim; ctx.fillRect(x + T - 3, y, 3, T); }
    if (top) {   // terracotta roof tiles along the top
      ctx.fillStyle = '#9e3f2c'; ctx.fillRect(x - (lft ? 3 : 0), y, T + (lft ? 3 : 0) + (rgt ? 3 : 0), 10);
      ctx.fillStyle = '#d65f3f';
      for (let k = 0; k < 3; k++) { rr(x + k * 10 + 0.5, y + 1, 9, 7, 3); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,220,190,0.5)'; ctx.fillRect(x, y + 1, T, 2);
    }
    return;
  }
  if (ch === 'm') {
    ctx.fillStyle = '#ece1cf'; ctx.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
    ctx.fillStyle = '#cfc0aa'; ctx.fillRect(x, y + T - 1.5, T, 1.5); if ((c + r) % 2) ctx.fillRect(x + T - 1.5, y, 1.5, T);
    if (h % 5 === 0) { ctx.strokeStyle = 'rgba(170,160,150,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 3, y + 8 + h % 9); ctx.quadraticCurveTo(x + 15, y + 4 + h % 13, x + 27, y + 14 + h % 7); ctx.stroke(); }
    if (lft) { ctx.fillStyle = '#bfae96'; ctx.fillRect(x, y, 3, T); }
    if (rgt) { ctx.fillStyle = '#bfae96'; ctx.fillRect(x + T - 3, y, 3, T); }
    if (top) { ctx.fillStyle = '#fffaf2'; ctx.fillRect(x, y, T, 5); ctx.fillStyle = '#bfae96'; ctx.fillRect(x, y + 5, T, 1.5); }
    return;
  }
  if (ch === 'j') {   // a wooden crate of amphorae
    ctx.fillStyle = '#c48a52'; ctx.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
    ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 2; ctx.strokeRect(x + 1.5, y + 1.5, T - 3, T - 3);
    ctx.beginPath(); ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + T - 3, y + T - 3); ctx.stroke();
    if (top) {
      ctx.fillStyle = '#b8643c'; for (const ax of [x + 8, x + 21]) { ctx.beginPath(); ctx.ellipse(ax, y + 7, 4.5, 4, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#e8a36a'; ctx.fillRect(x, y, T, 3);
    }
    return;
  }
  if (ch === 'd') {   // the quay: planks on top, water and posts under them
    if (topSame) {
      ctx.fillStyle = '#3f7898'; ctx.fillRect(x - 0.5, y + 10, T + 1, T - 10);
      ctx.fillStyle = '#6b4a30'; if (c % 2 === 0) ctx.fillRect(x + 12, y + 10, 7, T - 10);
      ctx.fillStyle = '#b37b4c'; ctx.fillRect(x - 0.5, y, T + 1, 10);
      ctx.fillStyle = '#7d5232'; ctx.fillRect(x + (c % 2 ? 14 : 4), y, 1.5, 10); ctx.fillRect(x, y + 9, T, 1.5);
      ctx.fillStyle = '#e1b07e'; ctx.fillRect(x, y, T, 2);
    } else {
      ctx.fillStyle = '#386f8e'; ctx.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
      ctx.fillStyle = '#5d4029'; if (c % 2 === 0) ctx.fillRect(x + 12, y, 7, T);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 2, y + 8 + (h % 10)); ctx.lineTo(x + 10, y + 8 + (h % 10)); ctx.stroke();
    }
    return;
  }
  // the street: cobbles
  ctx.fillStyle = topSame ? '#ad9a86' : '#8e7c6b'; ctx.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
  ctx.fillStyle = topSame ? '#c5b29c' : '#9f8c7a';
  for (let k = 0; k < 3; k++) { const ox = (k * 11 + (r % 2) * 5 + h % 3) % 26; ctx.beginPath(); ctx.ellipse(x + 3 + ox, y + 8 + (k % 2) * 11, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill(); }
  if (topSame) { ctx.fillStyle = '#d8c7b0'; ctx.fillRect(x, y, T, 3); }
}
function pompeiiColumnShape(col, a, crack) {
  ctx.save(); ctx.translate(col.px, col.py); ctx.rotate(a);
  const w = col.w, h = col.h;
  ctx.fillStyle = '#e7dfd1'; ctx.strokeStyle = '#b9ad9a'; ctx.lineWidth = 1.5;
  rr(-w, -14, w, 14, 3); ctx.fill(); ctx.stroke();                    // base
  ctx.fillStyle = '#f4eee4'; ctx.fillRect(-w + 8, -h + 18, w - 16, h - 32);   // shaft
  ctx.fillStyle = '#ded4c4'; ctx.fillRect(-14, -h + 18, 6, h - 32);
  ctx.strokeStyle = '#d4c9b8'; ctx.lineWidth = 1.5;
  for (let fx = -w + 15; fx < -12; fx += 7) { ctx.beginPath(); ctx.moveTo(fx, -h + 20); ctx.lineTo(fx, -16); ctx.stroke(); }
  ctx.fillStyle = '#ebe3d6'; ctx.strokeStyle = '#b9ad9a';
  rr(-w - 2, -h, w + 4, 10, 2); ctx.fill(); ctx.stroke();            // abacus (the top you stand on)
  rr(-w + 2, -h + 9, w - 4, 9, 3); ctx.fill(); ctx.stroke();          // echinus
  for (const vx of [-w + 6, -6]) { ctx.fillStyle = '#f4eee4'; circle(vx, -h + 15, 6); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(vx, -h + 15, 2.5, 0, Math.PI * 1.5); ctx.stroke(); }
  if (crack > 0) {
    ctx.strokeStyle = 'rgba(110,95,80,' + (0.4 + 0.6 * crack).toFixed(2) + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-w + 10, -30); ctx.lineTo(-w + 22, -42); ctx.lineTo(-w + 18, -52); ctx.lineTo(-w + 30, -64); ctx.stroke();
  }
  ctx.restore();
}
function pompeiiCartShape(cart, t) {
  const x = cart.c * T - T * (cart.slide / POMPEII.slideT), y = cart.r * T, w = cart.w * T, hgt = cart.h * T;
  const wob = cart.heave > 0 && !reduceMotion ? Math.sin(t * 50) * 0.8 : 0;
  ctx.save(); ctx.translate(x + wob, y);
  ctx.fillStyle = '#b5763f'; rr(0, 0, w, hgt - 16, 4); ctx.fill();
  ctx.fillStyle = '#8a5833'; ctx.fillRect(0, 0, w, 5); ctx.fillRect(0, 14, w, 2); ctx.fillRect(0, 28, w, 2);
  ctx.fillRect(0, 0, 4, hgt - 16); ctx.fillRect(w - 4, 0, 4, hgt - 16);
  ctx.fillStyle = '#d99a5c'; ctx.fillRect(4, 5, w - 8, 2);
  // an amphora painted on the side
  ctx.fillStyle = '#c0603a'; ctx.beginPath(); ctx.ellipse(w / 2, 24, 7, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(w / 2 - 2.5, 11, 5, 6);
  for (const wx of [14, w - 14]) {
    const cy = hgt - 11, ang = cart.wheel * 3 + (cart.slide > 0 ? (1 - cart.slide / POMPEII.slideT) * 2 : 0);
    ctx.fillStyle = '#5b3b28'; circle(wx, cy, 11); ctx.fill();
    ctx.fillStyle = '#a7703f'; circle(wx, cy, 7.5); ctx.fill();
    ctx.strokeStyle = '#5b3b28'; ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) { const aa = ang + k * Math.PI / 3; ctx.beginPath(); ctx.moveTo(wx + Math.cos(aa) * 7, cy + Math.sin(aa) * 7); ctx.lineTo(wx - Math.cos(aa) * 7, cy - Math.sin(aa) * 7); ctx.stroke(); }
  }
  ctx.restore();
}
function pompeiiShipShape(st, t) {
  const sh = st.ship, x0 = sh.x + sh.off, top = sh.top, sl = sh.sail;
  const bob = reduceMotion ? 0 : Math.sin(t * 1.6) * 1.2 * (sl ? 1 : 0.4);
  ctx.save(); ctx.translate(0, bob);
  // mast, yard and sail (rolled up until everyone is aboard)
  const mx = x0 + 200;
  ctx.fillStyle = '#6b4630'; ctx.fillRect(mx - 4, 64, 8, top - 64);
  ctx.fillRect(mx - 96, 84, 192, 6);
  const k = sl ? clamp((sl.t - 0.25) / 0.6, 0, 1) : 0;
  if (k > 0) {
    const sh2 = 150 * k, bulge = 18 * k;
    ctx.fillStyle = '#f5ead2';
    ctx.beginPath(); ctx.moveTo(mx - 92, 90); ctx.lineTo(mx + 92, 90); ctx.quadraticCurveTo(mx + 92 + bulge, 90 + sh2 / 2, mx + 90, 90 + sh2);
    ctx.lineTo(mx - 90, 90 + sh2); ctx.quadraticCurveTo(mx - 92 + bulge, 90 + sh2 / 2, mx - 92, 90); ctx.fill();
    ctx.fillStyle = '#c9473a';
    ctx.fillRect(mx - 91, 90 + sh2 * 0.3, 182, 10 * k); ctx.fillRect(mx - 91, 90 + sh2 * 0.62, 182, 10 * k);
  }
  ctx.fillStyle = '#eee0c2'; rr(mx - 92, 86, 184, 9 * (1 - k) + 2, 4); ctx.fill();
  const fw = Math.sin(t * 6) * 3;
  ctx.fillStyle = '#c9473a'; ctx.beginPath(); ctx.moveTo(mx + 4, 64); ctx.lineTo(mx + 30, 70 + fw); ctx.lineTo(mx + 4, 76); ctx.fill();
  // ropes
  ctx.strokeStyle = 'rgba(70,45,30,0.7)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(mx, 66); ctx.lineTo(x0 + 24, top); ctx.moveTo(mx, 66); ctx.lineTo(x0 + 380, top); ctx.stroke();
  // the hull
  ctx.fillStyle = '#8b5a3c';
  ctx.beginPath(); ctx.moveTo(x0 - 6, top - 14); ctx.quadraticCurveTo(x0 + 2, top - 6, x0, top); ctx.lineTo(x0 + 420, top); ctx.lineTo(x0 + 420, H + 4);
  ctx.lineTo(x0 + 40, H + 4); ctx.quadraticCurveTo(x0 + 4, 440, x0, top + 20); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6e4429'; ctx.fillRect(x0 + 2, top + 30, 418, 12);
  ctx.strokeStyle = 'rgba(60,35,20,0.45)'; ctx.lineWidth = 1.5;
  for (let y = top + 56; y < 470; y += 16) { ctx.beginPath(); ctx.moveTo(x0 + (y > 420 ? 20 : 4), y); ctx.lineTo(x0 + 420, y); ctx.stroke(); }
  ctx.fillStyle = '#4a2c1b'; for (let ox = x0 + 40; ox < x0 + 420; ox += 46) { circle(ox, top + 70, 5); ctx.fill(); }
  ctx.fillStyle = '#c4935f'; ctx.fillRect(x0, top, 420, 4);
  ctx.fillStyle = '#e9c08a'; ctx.fillRect(x0, top, 420, 1.5);
  // the dog on deck, wagging
  const dx = x0 + 300, dy = top, wag = Math.sin(sh.wag * (sl ? 22 : 8)) * 4;
  ctx.fillStyle = '#a0683f'; ctx.beginPath(); ctx.ellipse(dx, dy - 9, 13, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(dx - 10, dy - 6, 3, 6); ctx.fillRect(dx + 7, dy - 6, 3, 6);
  circle(dx - 13, dy - 17, 7); ctx.fill();
  ctx.strokeStyle = '#a0683f'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(dx + 12, dy - 12); ctx.lineTo(dx + 18, dy - 20 + wag); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = '#6d4126'; ctx.beginPath(); ctx.ellipse(dx - 9, dy - 21, 3, 5, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.ink; circle(dx - 16, dy - 18, 1.6); ctx.fill(); circle(dx - 20, dy - 15, 1.8); ctx.fill();
  ctx.restore();
  // the water line over the hull
  ctx.fillStyle = 'rgba(66,142,188,0.84)'; ctx.fillRect(Math.max(0, x0 - 10), 478, W, H - 478);
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; for (let k = 0; k < 4; k++) ctx.fillRect(x0 + 40 + ((k * 97 + t * 12) % 360), 496 + (k % 2) * 18, 22, 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 2;
  ctx.beginPath(); for (let x = Math.max(0, x0 - 10); x <= W; x += 10) ctx.lineTo(x, 478 + Math.sin(x / 14 + t * 2) * 1.5); ctx.stroke();
}
function pompeiiArchShape(st, d, label, t) {
  const x = d.x - 14, w = d.w + 28, top = d.y - 34, base = d.y + d.h;
  ctx.fillStyle = '#d9c3a3'; ctx.fillRect(x, top, w, base - top);
  ctx.fillStyle = '#c3aa86'; ctx.fillRect(x, top, w, 12); ctx.fillRect(x, top, 6, base - top); ctx.fillRect(x + w - 6, top, 6, base - top);
  ctx.strokeStyle = 'rgba(140,115,85,0.5)'; ctx.lineWidth = 1;
  for (let y = top + 22; y < base; y += 12) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 12, y); ctx.moveTo(x + w - 12, y); ctx.lineTo(x + w, y); ctx.stroke(); }
  if (!pompeiiArchG) {
    pompeiiArchG = ctx.createLinearGradient(0, 0, 0, 60);
    pompeiiArchG.addColorStop(0, '#fff6d6'); pompeiiArchG.addColorStop(1, '#ffd77a');
  }
  ctx.save(); ctx.translate(0, d.y);
  ctx.fillStyle = pompeiiArchG;
  ctx.beginPath(); ctx.moveTo(d.x + 2, d.h); ctx.lineTo(d.x + 2, 14); ctx.arc(d.x + d.w / 2, 14, d.w / 2 - 2, Math.PI, 0); ctx.lineTo(d.x + d.w - 2, d.h); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#a98d6c'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(d.x + d.w / 2, d.y + 14, d.w / 2 - 1, Math.PI, 0); ctx.stroke();
  if (label) {
    ctx.font = '700 9px "Atkinson Hyperlegible", system-ui, sans-serif';
    text(label, x + w / 2, top + 6.5, Math.min(10, 9 * (w - 10) / Math.max(1, ctx.measureText(label).width)), '#6d5338', 'center', 'body');
  }
  // who is in: one dot each
  for (let i = 0; i < 2; i++) {
    const cx = x + w / 2 + (i === 0 ? -9 : 9), cy = top - 12;
    circle(cx, cy, 6);
    if (st.inExit[i]) { ctx.fillStyle = PCOL[i]; ctx.fill(); }
    else { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill(); ctx.strokeStyle = PCOL[i]; ctx.lineWidth = 2; ctx.stroke(); }
  }
}
function pompeiiAwningShape(a, t) {
  const dip = a.sq * 6, x0 = a.x0 - 4, x1 = a.x1 + 4, y = a.top + dip;
  const ground = pompeiiGroundY(G.mst, a.x0 + 4, true);
  ctx.strokeStyle = '#6b4630'; ctx.lineWidth = 2;
  if (G.mst.poolCols.some(pc => pc.c * T <= a.x0 + 4 && pc.c * T + T > a.x0 + 4)) {   // over a lava stream: hung on ropes
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 - 34, y - 46); ctx.moveTo(x1, y); ctx.lineTo(x1 + 34, y - 46); ctx.stroke();
  } else {
    ctx.fillStyle = '#6b4630'; ctx.fillRect(a.x0 + 1, y + 4, 4, Math.max(0, ground - y - 4)); ctx.fillRect(a.x1 - 5, y + 4, 4, Math.max(0, ground - y - 4));
  }
  const n = Math.max(2, Math.round((x1 - x0) / 12)), sw = (x1 - x0) / n;
  for (let k = 0; k < n; k++) {
    ctx.fillStyle = k % 2 ? '#fff1dc' : '#d9483b';
    ctx.fillRect(x0 + k * sw, y - 3, sw + 0.5, 9);
    circle(x0 + k * sw + sw / 2, y + 6, sw / 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(80,30,20,0.25)'; ctx.fillRect(x0, y - 3, x1 - x0, 2);
}
function pompeiiBannerShape(st, b, i, t) {
  const x = b.x, base = b.feet, wave = reduceMotion ? 0 : Math.sin(t * 3 + i) * 1.5;
  ctx.fillStyle = '#5b3b28'; ctx.fillRect(x - 1.5, base - 60, 3, 60);
  ctx.fillStyle = C.gold; circle(x, base - 62, 3.5); ctx.fill();
  ctx.fillStyle = '#5b3b28'; ctx.fillRect(x - 14, base - 56, 28, 3);
  const any = st.pl.some(P => P.banner >= i), pp = Math.max(b.pop[0], b.pop[1]), s = 1 + 0.25 * pp;
  ctx.save(); ctx.translate(x, base - 53); ctx.scale(s, s);
  ctx.fillStyle = any ? '#c0352c' : '#9a6d68';
  ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.lineTo(12 + wave, 20); ctx.lineTo(0, 25); ctx.lineTo(-12 + wave, 20); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = C.gold; ctx.lineWidth = 1.6; circle(0, 10, 5.5); ctx.stroke();
  ctx.restore();
  for (let k = 0; k < 2; k++) {   // a ribbon for each player whose banner this is
    const on = st.pl[k].banner >= i, rx = x + (k === 0 ? -9 : 9);
    ctx.fillStyle = on ? PCOL[k] : 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.moveTo(rx - 2, base - 30); ctx.lineTo(rx + 2, base - 30); ctx.lineTo(rx + 2.5 + wave, base - 16); ctx.lineTo(rx - 2.5 + wave, base - 18); ctx.closePath(); ctx.fill();
  }
}
function pompeiiBoards(st) {
  for (const b of G.level.def.boards || []) {
    const sz = b.size || 16;
    if (b.paint) { ctx.save(); ctx.globalAlpha = 0.82; text(b.text, b.x, b.y, sz, '#a3342a', 'center', 'display'); ctx.restore(); }
    else if (b.carve) { text(b.text, b.x + 1, b.y + 1.5, sz, 'rgba(255,255,255,0.8)', 'center', 'display'); text(b.text, b.x, b.y, sz, '#a8977f', 'center', 'display'); }
    else if (b.sign) {
      ctx.font = sz + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
      const tw = ctx.measureText(b.text).width + 18;
      ctx.fillStyle = '#8a5833'; rr(b.x - tw / 2 - 2, b.y - sz * 0.75 - 2, tw + 4, sz * 1.5 + 4, 4); ctx.fill();
      ctx.fillStyle = '#d9a46a'; rr(b.x - tw / 2, b.y - sz * 0.75, tw, sz * 1.5, 3); ctx.fill();
      text(b.text, b.x, b.y + 0.5, sz, '#5b3b28', 'center', 'display');
    }
    if (b.dog) {   // CAVE CANEM: a little mosaic dog, waving its tail
      const dx = b.x, dy = b.y + 34;
      ctx.fillStyle = '#f3ead6'; ctx.fillRect(dx - 30, dy - 18, 60, 34);
      ctx.strokeStyle = '#3a2a24'; ctx.lineWidth = 2; ctx.strokeRect(dx - 30, dy - 18, 60, 34);
      ctx.fillStyle = '#3a2a24'; ctx.beginPath(); ctx.ellipse(dx + 2, dy + 2, 14, 7, 0, 0, Math.PI * 2); ctx.fill();
      circle(dx - 13, dy - 5, 6); ctx.fill(); ctx.fillRect(dx - 8, dy + 4, 3, 9); ctx.fillRect(dx + 10, dy + 4, 3, 9);
      ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(dx + 15, dy - 1); ctx.lineTo(dx + 22, dy - 8 + Math.sin(G.clock * 6) * 2); ctx.stroke();
      ctx.fillStyle = '#c0352c'; ctx.fillRect(dx - 9, dy + 1, 4, 2);
    }
  }
}
function pompeiiLavaFill(x0, x1, top, bot, t, key) {
  let g = pompeiiPoolG[key];
  if (!g) {
    g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, '#ffb347'); g.addColorStop(Math.min(0.5, 24 / Math.max(1, bot - top)), '#ff6a2a'); g.addColorStop(1, '#c8391c');
    pompeiiPoolG[key] = g;
  }
  const amp = reduceMotion ? 0.5 : 1.4, wv = x => top + amp * Math.sin(x / 13 + t * 2.4) + amp * 0.5 * Math.sin(x / 7 - t * 3.3);
  let gl = pompeiiPoolG[key + 'g'];
  if (!gl) { gl = pompeiiPoolG[key + 'g'] = ctx.createLinearGradient(0, top - 22, 0, top); gl.addColorStop(0, 'rgba(255,140,60,0)'); gl.addColorStop(1, 'rgba(255,140,60,0.3)'); }
  ctx.fillStyle = gl; rr(x0 + 1, top - 22, x1 - x0 - 2, 30, 8); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x0, bot);
  for (let x = x0; x <= x1; x += 6) ctx.lineTo(x, wv(x));
  ctx.lineTo(x1, wv(x1)); ctx.lineTo(x1, bot); ctx.closePath();
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#ffe28a'; ctx.lineWidth = 3; ctx.beginPath();
  for (let x = x0; x <= x1; x += 6) { if (x === x0) ctx.moveTo(x, wv(x) + 1); else ctx.lineTo(x, wv(x) + 1); }
  ctx.stroke();
  ctx.fillStyle = '#ffd27a';
  for (let k = 0; k < 3; k++) {
    const bx = x0 + ((k * 37 + t * 16) % Math.max(1, x1 - x0)), by = top + 10 + k * 8 + Math.sin(t * 2 + k) * 3;
    if (by < bot - 3) { circle(bx, by, 2.5 + (k % 2)); ctx.fill(); }
  }
}
function pompeiiDrawPools(st, t) {
  const pcs = st.poolCols;
  for (let i = 0; i < pcs.length;) {
    let j = i;
    while (j + 1 < pcs.length && pcs[j + 1].c === pcs[j].c + 1 && pcs[j + 1].top === pcs[i].top) j++;
    let bot = 0;
    for (let k = i; k <= j; k++) bot = Math.max(bot, pcs[k].bot);
    pompeiiLavaFill(pcs[i].c * T, (pcs[j].c + 1) * T, pcs[i].top + 6, bot, t, pcs[i].top + ':' + bot);
    i = j + 1;
  }
}
function pompeiiDrawBand(st, t) {
  const fx = st.lava.front, y0 = POMPEII.lavaTop;
  if (fx <= 2) return;
  if (!pompeiiBandG) {
    pompeiiBandG = ctx.createLinearGradient(0, y0 - 4, 0, H);
    pompeiiBandG.addColorStop(0, '#ffb347'); pompeiiBandG.addColorStop(0.3, '#ff6a2a'); pompeiiBandG.addColorStop(1, '#b8301c');
    pompeiiGlowG = ctx.createLinearGradient(0, y0 - 44, 0, y0);
    pompeiiGlowG.addColorStop(0, 'rgba(255,140,60,0)'); pompeiiGlowG.addColorStop(1, 'rgba(255,140,60,0.32)');
  }
  const amp = reduceMotion ? 0.6 : 1.8;
  const wave = x => y0 + amp * Math.sin(x / 26 + t * 2.2) + amp * 0.6 * Math.sin(x / 11 - t * 3.1);
  ctx.fillStyle = pompeiiGlowG; rr(-40, y0 - 44, fx + 62, 60, 28); ctx.fill();
  const nose = Math.max(0, fx - 16);
  ctx.beginPath(); ctx.moveTo(-10, H + 2); ctx.lineTo(-10, wave(-10));
  for (let x = 0; x <= nose; x += 8) ctx.lineTo(x, wave(x));
  ctx.lineTo(nose, wave(nose));
  ctx.quadraticCurveTo(fx + 6, y0 - 3, fx + 9, y0 + 16); ctx.lineTo(fx + 12, H + 2); ctx.closePath();
  ctx.fillStyle = pompeiiBandG; ctx.fill();
  ctx.strokeStyle = '#ffe28a'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath();
  for (let x = 0; x <= nose; x += 8) { if (x === 0) ctx.moveTo(x, wave(x) + 1.5); else ctx.lineTo(x, wave(x) + 1.5); }
  ctx.quadraticCurveTo(fx + 5, y0 - 1, fx + 8, y0 + 14);
  ctx.stroke();
  // dark crusty bits drifting along
  ctx.fillStyle = 'rgba(140,40,20,0.45)';
  for (let k = 0; k < 8; k++) {
    const bx = (k * 131 + t * 9) % Math.max(40, fx - 10);
    if (bx < fx - 14) { ctx.beginPath(); ctx.ellipse(bx, y0 + 22 + (k % 3) * 14, 14 + (k % 3) * 5, 3.5, 0, 0, Math.PI * 2); ctx.fill(); }
  }
}
function pompeiiDraw(st) {
  if (!st.pl) return;
  const t = G.clock, g = G.level.grid, def = G.level.def;
  pompeiiDrawBack(st, t);
  if (st.ship) pompeiiShipShape(st, t);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (g[r][c] !== '#') continue;
    const ch = st.sty[r][c];
    if (ch === 'K' || ch === 'Y' || ch === 'B') continue;
    pompeiiCell(st, ch, c, r);
  }
  pompeiiBoards(st);
  if (st.exit) pompeiiArchShape(st, st.exit, def.exitLabel || '', t);
  for (const a of st.awnings) pompeiiAwningShape(a, t);
  st.banners.forEach((b, i) => pompeiiBannerShape(st, b, i, t));
  pompeiiDrawPools(st, t);
  if (st.column) pompeiiColumnShape(st.column, st.column.phase === 'stand' ? 0 : st.column.a || 0, st.column.phase === 'creak' ? st.column.t / POMPEII.creakT : st.column.phase === 'stand' ? 0 : 1);
  if (st.cart) pompeiiCartShape(st.cart, t);
  pompeiiDrawBand(st, t);
  // ash piles and the shadows of falling ash
  for (const pl of st.piles) {
    const a = clamp(Math.min(pl.t / 0.2, (pl.life - pl.t) / 1.2), 0, 1);
    ctx.fillStyle = 'rgba(186,184,192,' + (0.9 * a).toFixed(3) + ')';
    ctx.beginPath(); ctx.ellipse(pl.x, pl.y, pl.w, 4, 0, Math.PI, 0); ctx.fill();
  }
  for (const a of st.ash) {
    if (a.land >= H) continue;
    const k = clamp(1 - (a.land - a.y) / 420, 0.12, 1);
    ctx.fillStyle = 'rgba(40,30,40,' + (0.1 + 0.3 * k).toFixed(3) + ')';
    ctx.beginPath(); ctx.ellipse(a.x, a.land - 1, 4 + 9 * k, 2 + 1.6 * k, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (const e of st.embers) {
    ctx.globalAlpha = clamp(e.life / e.max, 0, 1); ctx.fillStyle = '#ffb347';
    ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
  }
  ctx.globalAlpha = 1;
}
// an arm reaching down from p over the edge of s (to the hand, or holding the partner's hand)
function pompeiiArm(st, p, s, len, grip) {
  const sx = s.dir < 0 ? p.x + 5 : p.x + p.w - 5, sy = p.y + 15;
  const ex = s.edgeX + s.dir * 3, ey = s.top + 3;
  const hx = grip ? grip.x : s.edgeX + s.dir * (s.longArm ? 26 : 12), hy = grip ? grip.y : s.top + Math.max(6, len);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const path = () => { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); };
  if (s.longArm) { ctx.strokeStyle = 'rgba(255,197,61,0.6)'; ctx.lineWidth = 14; path(); ctx.stroke(); }
  ctx.strokeStyle = PDARK[p.id]; ctx.lineWidth = 9; path(); ctx.stroke();
  ctx.strokeStyle = PCOL[p.id]; ctx.lineWidth = 5.5; path(); ctx.stroke();
  ctx.fillStyle = PCOL[p.id]; ctx.strokeStyle = PDARK[p.id]; ctx.lineWidth = 2;
  circle(hx, hy, 6.5); ctx.fill(); ctx.stroke();
  if (!grip) for (let k = -1; k <= 1; k++) { circle(hx + k * 4, hy + 6, 2.3); ctx.fill(); }
  ctx.lineCap = 'butt';
}
function pompeiiDrawTop(st) {
  if (!st.pl) return;
  const t = G.clock, big = hudBig();
  for (const p of G.players) {
    const R = st.pl[p.id].reach;
    if (R && p.alive) pompeiiArm(st, p, R.s, R.len, null);
  }
  if (st.pull) {
    const pu = st.pull, hp = G.players[pu.helper], q = G.players[pu.partner];
    const grip = { x: q.x + q.w / 2 + pu.s.dir * 4, y: q.y - 4 };
    if (!pu.stack || pu.t < POMPEII.riseT) pompeiiArm(st, hp, pu.s, 0, grip);
    // the partner's arm up to the hand
    ctx.strokeStyle = PDARK[q.id]; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(q.x + q.w / 2, q.y + 8); ctx.lineTo(grip.x, grip.y); ctx.stroke();
    ctx.strokeStyle = PCOL[q.id]; ctx.lineWidth = 4; ctx.stroke(); ctx.lineCap = 'butt';
  }
  // falling ash: soft grey clumps
  for (const a of st.ash) {
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
    ctx.fillStyle = '#8f8c96'; circle(0, 1, a.r); ctx.fill();
    ctx.fillStyle = '#b4b1bb'; circle(-a.r * 0.35, -a.r * 0.15, a.r * 0.75); ctx.fill(); circle(a.r * 0.4, -a.r * 0.3, a.r * 0.55); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; circle(-a.r * 0.45, -a.r * 0.45, a.r * 0.3); ctx.fill();
    ctx.restore();
  }
  // over heads: the go-back ring and the heat "!"
  for (const p of G.players) {
    if (!p.alive) continue;
    const hs = pompeiiHead(st, p), cx = p.x + p.w / 2, P = st.pl[p.id];
    if (hs.ring) {
      const f = clamp(P.downT / POMPEII.backHold, 0, 1);
      ctx.lineWidth = 3 * hs.rs; ctx.strokeStyle = 'rgba(255,255,255,0.4)'; circle(cx, hs.ringY, hs.ringR); ctx.stroke();
      ctx.lineWidth = 3.5 * hs.rs; ctx.lineCap = 'round'; ctx.strokeStyle = PCOL[p.id];
      ctx.beginPath(); ctx.arc(cx, hs.ringY, hs.ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke(); ctx.lineCap = 'butt';
      text('↓', cx, hs.ringY + 0.5, 10 * hs.rs, C.ink, 'center', 'body');
    }
    if (hs.heat) {
      const s = big ? 1.4 : 1;
      ctx.fillStyle = '#ffffff'; rr(cx - 9 * s, hs.heatY - 9 * s, 18 * s, 18 * s, 6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx - 3, hs.heatY + 8 * s); ctx.lineTo(cx + 3, hs.heatY + 8 * s); ctx.lineTo(cx, hs.heatY + 12 * s); ctx.fill();
      text('!', cx, hs.heatY + 1, 15 * s, '#e5322d', 'center', 'display');
    }
  }
  // floating words: Hand-up!, Hot foot!, Ah-choo!
  for (const q of st.pops) {
    const k = q.t / q.life, a = clamp((1 - k) / 0.3, 0, 1), s = (big ? 1.25 : 1) * (0.8 + 0.2 * Math.min(1, q.t / 0.12));
    ctx.save(); ctx.globalAlpha = a;
    bigText(q.text, clamp(q.x, 60, W - 60), q.y - k * 26, q.size, q.col, s);
    ctx.restore();
  }
}
// what sits above a head, bottom up: the go-back ring, the heat "!", then badges and hint bubbles
function pompeiiHead(st, p) {
  const P = st.pl[p.id], rs = hudBig() ? 1.5 : 1;
  let y = p.y - 8;
  const ring = P.downT >= POMPEII.backShow, ringR = 9 * rs, ringY = y - ringR;
  if (ring) y -= ringR * 2 + 4;
  const heat = P.heat, heatY = y - 11 * rs;
  if (heat) y -= 24 * rs;
  return { ring, ringR, ringY, heat, heatY, top: y, rs };
}
function pompeiiHandIcon(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = C.gold;
  rr(-6, -3, 12, 11, 4); ctx.fill();
  for (let k = 0; k < 4; k++) { rr(-6 + k * 3.2, -10 + (k === 0 || k === 3 ? 2 : 0), 2.6, 9, 1.3); ctx.fill(); }
  ctx.rotate(-0.6); rr(-11, -1, 7, 3, 1.5); ctx.fill();
  ctx.restore();
}
function pompeiiHud(st) {
  if (!st.pl) return;
  const big = hudBig(), fs = big ? 20 : 14, h = big ? 40 : 28, font = n => '700 ' + n + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  // top right: time and hand-ups
  const tm = fmtTime(G.time), hn = String(st.stats.hands[0] + st.stats.hands[1]);
  ctx.font = font(fs);
  const tw = ctx.measureText(tm).width, nw = ctx.measureText(hn).width, icon = fs * 1.2, gap = fs;
  const rw = 15 + tw + gap + icon + fs * 0.35 + nw + 15, rx = pill(W - 14, 12, rw, h, 'right'), cy = 12 + h / 2 + 0.5;
  text(tm, rx + 15, cy, fs, C.paper, 'left', 'body');
  pompeiiHandIcon(rx + 15 + tw + gap + icon / 2, cy, fs / 14);
  text(hn, rx + 15 + tw + gap + icon + fs * 0.35, cy, fs, C.gold, 'left', 'body');
  // top centre: lava news, gold help
  const n = st.news;
  let newsBox = null;
  if (n && G.mode === 'play' && G.introT <= 0) {
    const nfs = big ? 19 : 14, nh = big ? 36 : 28;
    ctx.font = font(nfs);
    const w = Math.min(ctx.measureText(n.text).width + 34, rx - 260);
    const x = clamp(W / 2, 250 + w / 2, rx - 10 - w / 2), y = 12;
    newsBox = [x - w / 2, x + w / 2, y + nh];
    const a = clamp(Math.min(n.t / 0.15, (n.life - n.t) / 0.3), 0, 1);
    ctx.save(); ctx.globalAlpha = a;
    pill(x, y, w, nh, 'center');
    if (n.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x - w / 2, y, w, nh, nh / 2); ctx.stroke(); }
    const fsz = Math.min(nfs, nfs * (w - 30) / Math.max(1, ctx.measureText(n.text).width));
    text(n.text, x, y + nh / 2 + 0.5, fsz, n.gold ? C.gold : C.paper, 'center', 'body');
    ctx.restore();
  }
  if (G.mode !== 'play' || G.introT > 0) return;
  // "Swap jobs!"
  if (st.swapT > 0) {
    const k = 1 - st.swapT / 2.2, a = clamp(st.swapT / 0.4, 0, 1), s = 0.8 + 0.25 * Math.min(1, k * 6);
    ctx.save(); ctx.globalAlpha = a; bigText('Swap jobs!', W / 2, 128, big ? 46 : 36, C.gold, s); ctx.restore();
  }
  // role badges, then hint bubbles, over each player: stacked so the two players' words never overlap,
  // and under the feet instead when a top pill is in the way
  const ob = st.objs[st.stage];
  const clearTop = (x0, x1) => {
    let y = 4;
    if (x0 < 272) y = 78;                                   // the level and room pills (top left)
    if (x1 > rx - 6) y = Math.max(y, 12 + h + 6);           // time and hand-ups (top right)
    if (newsBox && x1 > newsBox[0] - 6 && x0 < newsBox[1] + 6) y = Math.max(y, newsBox[2] + 6);
    return y;
  };
  const placed = [];
  const hit = (x0, y0, w, hh) => placed.find(r => x0 < r[0] + r[2] + 3 && x0 + w > r[0] - 3 && y0 < r[1] + r[3] + 3 && y0 + hh > r[1] - 3);
  const place = (x0, w, hh, k) => {   // a w x hh box over k's head (or under the feet): its top y
    let y = k.by - hh, under = false;
    for (let n = 0; n < 4; n++) { const r = hit(x0, y, w, hh); if (!r) break; y = r[1] - hh - 4; }
    if (y < clearTop(x0, x0 + w)) {
      under = true; y = Math.min(k.below, H - hh - 4);
      for (let n = 0; n < 4; n++) { const r = hit(x0, y, w, hh); if (!r) break; y = r[1] + r[3] + 4; }
      k.below = y + hh + 4;
    } else k.by = y - 4;
    placed.push([x0, y, w, hh]);
    return { y, under };
  };
  const heads = G.players.filter(p => p.alive).map(p => ({ p, px: p.x + p.w / 2, by: pompeiiHead(st, p).top, below: p.y + p.h + 10 }));
  if (st.badgeT > 0 && st.badgeWait <= 0 && ob) for (const k of heads) {
    const p = k.p;
    if (st.pl[p.id].lock) continue;
    const word = ob.kind === 'cart' ? 'Push the cart!' : ob.lead === p.id ? 'Climb up!' : 'Be the step!';
    const bfs = big ? 17 : 11, bh = bfs + (big ? 10 : 8), a = clamp(st.badgeT / 0.4, 0, 1);
    ctx.font = font(bfs);
    const bw = ctx.measureText(word).width + 16, bx = clamp(k.px, bw / 2 + 4, W - bw / 2 - 4);
    const y0 = place(bx - bw / 2, bw, bh, k).y;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = PCOL[p.id]; rr(bx - bw / 2, y0, bw, bh, bh / 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
    text(word, bx, y0 + bh / 2 + 0.5, bfs, '#ffffff', 'center', 'body');
    ctx.restore();
  }
  for (const k of heads) {
    const p = k.p, px = k.px, hn2 = st.pl[p.id].hint;
    if (!hn2) continue;
    const a = clamp(Math.min(hn2.t, hn2.life - hn2.t) / 0.2, 0, 1), hfs = big ? 20 : 12;
    ctx.font = font(hfs);
    const tw2 = ctx.measureText(hn2.text).width + (big ? 22 : 16), th = hfs + (big ? 14 : 10);
    const cx = clamp(px, tw2 / 2 + 4, W - tw2 / 2 - 4);
    const pl = place(cx - tw2 / 2, tw2, th + 6, k), top = pl.under ? pl.y + 6 : pl.y;   // (6 px for the tail)
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = PCOL[p.id]; ctx.lineWidth = 2;
    rr(cx - tw2 / 2, top, tw2, th, th / 2); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    if (pl.under) { ctx.moveTo(px - 5, top + 1); ctx.lineTo(px + 5, top + 1); ctx.lineTo(px, top - 5); }
    else { ctx.moveTo(px - 5, top + th - 1); ctx.lineTo(px + 5, top + th - 1); ctx.lineTo(px, top + th + 5); }
    ctx.closePath(); ctx.fill();
    text(hn2.text, cx, top + th / 2 + 0.5, hfs, C.ink, 'center', 'body');
    ctx.restore();
  }
}
MODES.pompeii.test = { POMPEII, pompeiiRun, pompeiiBaseY, pompeiiTall, pompeiiEdge, pompeiiInZone, pompeiiNear, pompeiiAtFoot, pompeiiUp, pompeiiStage, pompeiiCap, pompeiiSpawnFor, pompeiiGroundY };

Sfx.extra.pompeiiReach = function (pitch) { this.tone(420 * pitch, 0.08, 'triangle', 0.04, 640 * pitch); };
Sfx.extra.pompeiiGrab = function (pitch) { this.tone(660 * pitch, 0.06, 'square', 0.04); this.tone(990 * pitch, 0.08, 'triangle', 0.04, null, 0.05); };
Sfx.extra.pompeiiPull = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.pompeiiBoing = function (pitch) { this.tone(200 * pitch, 0.22, 'sine', 0.08, 700 * pitch); this.tone(400 * pitch, 0.1, 'triangle', 0.03, 900 * pitch, 0.05); };
Sfx.extra.pompeiiBounce = function (pitch) { this.tone(260 * pitch, 0.16, 'triangle', 0.06, 560 * pitch); };
Sfx.extra.pompeiiHot = function () { this.tone(1300, 0.25, 'sawtooth', 0.02, 300); this.tone(880, 0.08, 'square', 0.03, null, 0.05); this.tone(1175, 0.1, 'square', 0.03, null, 0.13); };
Sfx.extra.pompeiiSneeze = function (pitch) { this.tone(700 * pitch, 0.08, 'sine', 0.04, 900 * pitch); this.tone(1600, 0.16, 'sawtooth', 0.02, 400, 0.12); };
Sfx.extra.pompeiiPoof = function (pitch) { this.tone(500 * pitch, 0.14, 'sine', 0.05, 1100 * pitch); };
Sfx.extra.pompeiiBanner = function (pitch) { this.tone(660 * pitch, 0.07, 'triangle', 0.045); this.tone(990 * pitch, 0.1, 'triangle', 0.045, null, 0.06); };
Sfx.extra.pompeiiCreak = function () { this.tone(140, 0.4, 'sawtooth', 0.03, 90); this.tone(180, 0.3, 'square', 0.015, 120, 0.15); };
Sfx.extra.pompeiiThud = function () { this.tone(90, 0.35, 'triangle', 0.1, 45); this.tone(220, 0.12, 'square', 0.03, 80); };
Sfx.extra.pompeiiHeave = function () { this.tone(150, 0.12, 'square', 0.04, 110); this.tone(300, 0.06, 'triangle', 0.03, null, 0.05); };
Sfx.extra.pompeiiHeavy = function (pitch) { this.tone(200 * pitch, 0.12, 'square', 0.03, 160 * pitch); };
Sfx.extra.pompeiiBark = function () { this.tone(520, 0.06, 'square', 0.05, 380); this.tone(560, 0.07, 'square', 0.05, 400, 0.12); };
Sfx.extra.pompeiiHorn = function () { this.tone(196, 0.6, 'sawtooth', 0.035); this.tone(247, 0.6, 'triangle', 0.04); };
Sfx.extra.pompeiiRumble = function () { [0, 0.08, 0.16, 0.24].forEach((d, i) => this.tone(70 - i * 5, 0.1, 'square', 0.035, 50, d)); };
Sfx.extra.pompeiiGold = function () { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.pompeiiCall = function (pitch) { this.tone(700 * pitch, 0.07, 'triangle', 0.045, 900 * pitch); this.tone(900 * pitch, 0.09, 'triangle', 0.04, 1100 * pitch, 0.09); };
Sfx.extra.pompeiiSwap = function () { [523, 784, 659, 988].forEach((f, i) => this.tone(f, 0.09, 'triangle', 0.045, null, i * 0.07)); };
/* ===== end of MODES.pompeii ===== */
