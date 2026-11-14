/* Pip & Bo - Level 9-4 Krakatoa Ash Run (team). */
'use strict';

/* ===== MODES.ash — 9-4 Krakatoa Ash Run (World 9 "Great Escapes", team) =====
   Gavyn's idea: a sky full of ash blocks your view, so one player clears a path with a fan while the other leads the way.
   A cartoony Krakatoa, 1883: palms, jungle, lava rocks, sea cliffs and a rescue ship. Nobody gets hurt: the ash is
   fluffy grey clumps, lava is "Toasty toes!" and the sea a "Splash!", and both just pop back at their last camp torch.
   - The FANNER holds the action ('fan') to blow a wind cone the way they face. The wind clears the ash cloud (it
     drifts back a few seconds later), blows away soft ash drifts (solid piles in tunnels: only the fan moves them),
     gusts the leader through the air (glide + push: the 7-tile gust gaps, marked by a windsock, need it; even a
     perfect running jump falls short) and blows the ash hat off the leader's head.
   - The LEADER knows the way: glowing footprints and levers show through the ash only near the leader. The action
     ('pull') pulls a lever (a bamboo gate opens, a rope bridge drops for the fanner); anywhere else it is a
     "This way!" call. Volcano puffs drop ash clumps on the leader's head (an ash hat): the more ash, the less they see.
   Roles swap every room. A parrot perches over the next job; hints after 12 s stuck; gold "Sea breeze" / "Super
   gust" help is always announced.
   Map chars (parsed here; replaced by '#' or '.'):
     #  rock / earth (drawn in the room's style)   z  sand   w  ship / dock planks   d  ash drift (solid, the fan blows it)
     A B C  levers   3 4 5  bamboo gate of lever A / B / C (solid until pulled)   6 7 8  rope bridge of lever A / B / C
     v  lava (hot foot)   ~  sea water (splash)   m  footprint (trail marker)   t  camp torch (checkpoint)
     p  palm   f  fern   E  the exit (the engine's door, taken over here)
   Room def: { title, tip, leader: 0|1, style: 'jungle'|'lava'|'cliff'|'beach', act, exitKind: 'arch'|'cave'|'ship',
     ash: { windy, hats, top (first cloud row), clear: [[c0,r0,c1,r1]] (clear pockets),
            turn, climb (a room that climbs to a higher path walked back right to left: see ashRK) },
     boards: [{ x, y, post, text }] }
   Every top-level name starts with ash / ASH (Sfx.extra.ash* too); all level state lives in G.mst. */
const ASH = {
  // the fan: a wind cone the way the fanner faces
  range: 230, half: 0.63, nearR: 44, clearRate: 4.2,
  regrowDelay: 2.6, regrowRate: 0.33, windyDelay: 1.7, windyRate: 0.5,
  driftT: 0.8, driftRange: 175,
  // gusts: over a gust gap, a leader in mid-air glides (fall speed capped) and is pushed along while the fan reaches
  // the gap (gustR: how far behind its edge the fan may stand)
  gustR: 260, gustX: 170, glideV: 85, gustHalf: 0.72, gustH: 150, luckyGust: 1.35, luckyReach: 1.3, gustMin: 0.15, gustDist: 150,
  // the updraft over a gust gap: a leader in the wind below liftH above the gap's ground is lifted (rise speed liftV), so a
  // quick tap of jump, or just stepping off the edge, floats across too
  liftH: 40, liftV: 110, liftA: 3400,
  // the leader
  seeR: 165, hatSee: 36, hatMax: 3, hatEvery: 9, hatJitter: 5, hatOffT: 0.25, clumpV: 230,
  reach: 34, callCD: 0.7, callLife: 1.6,
  // flow and help
  hopHold: 1.0, hopShow: 0.15, exitHold: 0.35, stuckHint: 12, stuckLucky: 30, luckyFalls: 3, luckyT: 10, gapFalls: 2,
  badgeT: 7, hintLife: 3, newsLife: 3, bridgeStep: 0.06, introHold: 0.4,
};
// lever letter -> its gate char and bridge char
const ASH_LEVER = { A: ['3', '6'], B: ['4', '7'], C: ['5', '8'] };
const ASH_GATE = { 3: 'A', 4: 'B', 5: 'C' }, ASH_BRIDGE = { 6: 'A', 7: 'B', 8: 'C' };
const ashIdx = (c, r) => r * COLS + c;

// the player's own key for hint bubbles: keyboard (F / '/', S / ↓), controller or touch (the round button says fan or pull)
function ashHow(id) { try { return actKey(id); } catch (e) { return 'kb'; } }
function ashKey(id, what) {
  const how = ashHow(id);
  if (what === 'act') return how === 'pad' ? glyph('act') : how === 'touch' ? 'the ' + (G.mst && G.mst.fanner === id ? 'fan' : 'pull') + ' button' : id === 0 ? 'F' : '/';
  return how === 'pad' ? 'stick ▼' : how === 'touch' ? '▼' : id === 0 ? 'S' : '↓';
}

/* ---------- the room: parse the map, set up the ash cloud, levers, drifts, camps ---------- */
function ashRoom(st, L) {
  const def = L.def, g = L.grid, A = def.ash || {};
  st.leader = def.leader; st.fanner = 1 - def.leader;
  st.style = def.style || 'jungle';
  st.windy = !!A.windy; st.hats = !!A.hats;
  st.kind = new Array(COLS * ROWS).fill('');
  st.levers = []; st.drifts = []; st.gates = []; st.bridges = []; st.camps = []; st.marks = [];
  st.palms = []; st.ferns = []; st.hazard = new Array(COLS * ROWS).fill('');
  const driftCells = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = g[r][c], i = ashIdx(c, r);
    if (ch === 'z' || ch === 'w') { st.kind[i] = ch; g[r][c] = '#'; }
    else if (ch === 'd') { st.kind[i] = 'd'; g[r][c] = '#'; driftCells.push({ c, r }); }
    else if (ASH_LEVER[ch]) { st.levers.push({ id: ch, c, r, x: c * T + T / 2, y: (r + 1) * T, on: false, t: 0, seen: 0 }); g[r][c] = '.'; }
    else if (ASH_GATE[ch]) { st.kind[i] = 'g'; st.gates.push({ c, r, lever: ASH_GATE[ch], open: false, t: 0 }); g[r][c] = '#'; }
    else if (ASH_BRIDGE[ch]) { st.kind[i] = 'b'; st.bridges.push({ c, r, lever: ASH_BRIDGE[ch], on: false, t: 0, at: 0 }); g[r][c] = '.'; }
    else if (ch === 'v' || ch === '~') { st.hazard[i] = ch; g[r][c] = '.'; }
    else if (ch === 'm') { st.marks.push({ c, r, x: c * T + T / 2, y: (r + 1) * T, found: false, t: 0, seen: 0 }); g[r][c] = '.'; }
    else if (ch === 't') { st.camps.push({ c, r, x: c * T + T / 2, y: (r + 1) * T, lit: false, t: 0 }); g[r][c] = '.'; }
    else if (ch === 'p') { st.palms.push({ x: c * T + T / 2, y: (r + 1) * T, s: 0.9 + (hash(c, r) % 5) * 0.08, ph: (hash(c, r) % 100) / 16 }); g[r][c] = '.'; }
    else if (ch === 'f') { st.ferns.push({ x: c * T + T / 2, y: (r + 1) * T, ph: (hash(r, c) % 100) / 16 }); g[r][c] = '.'; }
  }
  // drifts: connected drift cells make one pile
  const seen = new Set();
  for (const d of driftCells) {
    if (seen.has(ashIdx(d.c, d.r))) continue;
    const cells = [], todo = [d];
    seen.add(ashIdx(d.c, d.r));
    while (todo.length) {
      const q = todo.pop(); cells.push(q);
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = driftCells.find(e => e.c === q.c + dc && e.r === q.r + dr);
        if (n && !seen.has(ashIdx(n.c, n.r))) { seen.add(ashIdx(n.c, n.r)); todo.push(n); }
      }
    }
    const xs = cells.map(e => e.c), ys = cells.map(e => e.r);
    const c0 = Math.min(...xs), c1 = Math.max(...xs), r0 = Math.min(...ys), r1 = Math.max(...ys);
    st.drifts.push({ cells, c0, c1, r0, r1, x: (c0 + c1 + 1) * T / 2, y: (r0 + r1 + 1) * T / 2, hp: 1, gone: false, wob: 0, hitT: 0 });
  }
  // bridges: build order from the lever's end outward; each bridge is a gust gap until it is down
  st.gaps = [];
  for (const id of Object.keys(ASH_LEVER)) {
    const bs = st.bridges.filter(b => b.lever === id);
    if (!bs.length) continue;
    const lv = st.levers.find(l => l.id === id);
    if (lv) bs.sort((a, b) => Math.abs(a.c * T + 15 - lv.x) - Math.abs(b.c * T + 15 - lv.x));
    bs.forEach((b, k) => { b.at = k * ASH.bridgeStep; });
    const c0 = Math.min(...bs.map(b => b.c)), c1 = Math.max(...bs.map(b => b.c));
    st.gaps.push({ lever: id, c0, c1, r: bs[0].r, x0: c0 * T, x1: (c1 + 1) * T, falls: 0, crossed: false });
  }
  // a room that climbs to a higher path walked back right to left: ash.turn = the first row below that path,
  // ash.climb = [c, r], the top of the way up (the parrot points there first)
  st.turnY = A.turn != null ? A.turn * T : null; st.ldUp = false;
  st.climb = A.climb ? { x: A.climb[0] * T + 15, y: A.climb[1] * T - 40 } : null;   // (y like a lever job: 40 above the floor)
  st.marks.sort((a, b) => ashRK(st, a.x, a.y) - ashRK(st, b.x, b.y)); st.camps.sort((a, b) => ashRK(st, a.x, a.y) - ashRK(st, b.x, b.y));
  // the exit: the engine's door rect, checked and drawn here
  st.exit = L.door; L.door = null;
  st.exitKind = def.exitKind || 'arch';
  // the ash cloud: density per cell (0 clear .. 1 thick); top rows are open sky, clear pockets stay clear
  st.base = new Float32Array(COLS * ROWS); st.dens = new Float32Array(COLS * ROWS); st.since = new Float32Array(COLS * ROWS).fill(99);
  const top = A.top == null ? 4 : A.top;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const tr = top + (hash(c, 99) % 3) - 1;   // a lumpy cloud top
    let b = r < tr ? 0 : r === tr ? 0.5 : 1;
    for (const [c0, r0, c1, r1] of A.clear || []) if (c >= c0 && c <= c1 && r >= r0 && r <= r1) b = 0;
    st.base[ashIdx(c, r)] = b;
  }
  // soft edges: thick ash next to a clear cell is only half thick
  const hard = st.base.slice();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const i = ashIdx(c, r);
    if (hard[i] < 1) continue;
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => { const x = c + dc, y = r + dr; return x >= 0 && x < COLS && y >= 0 && y < ROWS && hard[ashIdx(x, y)] === 0; });
    if (nb) st.base[i] = 0.6;
  }
  st.dens.set(st.base);
  // the start: each player's camp is the room spawn
  st.camp = [-1, -1];
  st.roomT = 0; st.exitT = 0; st.progT = 0; st.hintN = 0; st.roomFalls = 0; st.luckyT = 0; st.luckyUsed = false; st.luckyGust = false;
  st.hat = 0; st.hatT = ASH.hatEvery + 4; st.hatOff = 0; st.clumps = [];
  st.pops = []; st.bubbles = []; st.news = null; st.calls = []; st.nudge = { kind: '', t: 0, cd: 0 };
  st.fan = { on: false, t: 0, snd: 0, ph: 0 };
  st.gust = { t: 0, x0: 0, air: false, on: false, gp: null };
  st.pl = [0, 1].map(() => ({ downT: 0, downOk: false, prevDown: true, why: '', nearLever: 0 }));
  const lp = G.players[st.leader];
  for (const p of G.players) p.face = 1;   // the way out is to the right: the fan starts blowing that way
  st.parrot = { x: lp.x + 40, y: lp.y - 60, tx: lp.x + 40, ty: lp.y - 60, face: 1, flap: 0, perch: false, squawk: 0, gold: false };
  st.boards = def.boards || [];
  st.wind = [];   // wind streaks (cosmetic)
  st.done = false;
  ashActLabels(st);
}
/* ---------- little feedback helpers ---------- */
function ashPop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || C.gold, size: size || 18, t: 0 }); }
function ashSay(st, id, s, life) {
  if (typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id)) return;   // 1-player mode: no key hints for the computer's character
  st.bubbles = st.bubbles.filter(b => b.id !== id);
  st.bubbles.push({ id, s, t: 0, life: life || ASH.hintLife });
}
function ashNews(st, s, gold, life) { st.news = { s, gold: !!gold, t: 0, life: life || ASH.newsLife }; }
function ashProgress(st) { st.progT = 0; st.hintN = 0; st.parrot.gold = false; }
// the touch buttons and the top-bar legend name each player's own action this room: the fanner fans, the leader pulls
// (the framework has one act label per level; this only touches the DOM when a word differs)
let ashLabelEls = null;
function ashActLabels(st) {
  try {
    if (!ashLabelEls || !ashLabelEls.every(o => document.contains(o.el))) ashLabelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
      const box = el.closest('[data-p]') || el.closest('[data-legp]') || el.closest('.kb-only') || el.closest('.pad-only');
      const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.querySelector('.nm-bo') ? 1 : box && box.querySelector('.nm-pip') ? 0 : -1;
      return { el, id };
    });
    let changed = false;
    for (const o of ashLabelEls) {
      const want = o.id < 0 ? 'fan/pull' : o.id === st.leader ? 'pull' : 'fan';
      if (o.el.textContent !== want) { o.el.textContent = want; changed = true; }
    }
    if (changed && typeof fitActLabels === 'function') fitActLabels();
  } catch (e) { /* labels stay as the framework set them */ }
}

/* ---------- the fan ---------- */
// the fan's wind origin and direction (the fanner's face)
function ashFanO(p) { return { x: p.x + p.w / 2 + p.face * 10, y: p.y + p.h * 0.45, dir: p.face }; }
// 0..1: how strongly the cone reaches the point (x, y) (0 = outside)
function ashInCone(o, x, y, range, half) {
  const dx = (x - o.x) * o.dir, dy = y - o.y, d = Math.hypot(dx, dy);
  if (d > range) return 0;
  if (d < 18) return 1;
  if (dx <= 0 || Math.abs(Math.atan2(dy, dx)) > half) return 0;
  return 1 - 0.55 * (d / range) * (d / range);
}
function ashFanStep(st, dt) {
  const f = G.players[st.fanner], ld = G.players[st.leader], S = st.stats;
  const on = f.alive && f.input.act && G.introT <= ASH.introHold && !st.done;
  f.pendingAct = false;   // the fan is a hold; a fresh press means nothing else
  if (on && !st.fan.on) { Sfx.play('ashFanOn', f.id); rumble(f.id, 0, 0.18, 60); }
  st.fan.on = on; st.fan.ph += dt * (on ? 16 : 3);
  if (!on) { st.gust.on = false; st.gust.gp = null; return; }
  st.fan.t += dt; st.fan.snd -= dt;
  if (st.fan.snd <= 0) { st.fan.snd = 0.22; Sfx.play('ashWhoosh', f.id); }
  const o = ashFanO(f), R = ASH.range;
  // clear the cloud
  const c0 = Math.max(0, Math.floor((o.x - R) / T)), c1 = Math.min(COLS - 1, Math.floor((o.x + R) / T));
  const r0 = Math.max(0, Math.floor((o.y - R) / T)), r1 = Math.min(ROWS - 1, Math.floor((o.y + R) / T));
  let cleared = 0;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const i = ashIdx(c, r), cx = c * T + 15, cy = r * T + 15;
    let k = ashInCone(o, cx, cy, R, ASH.half);
    if (Math.hypot(cx - o.x, cy - o.y) < ASH.nearR) k = Math.max(k, 1);
    if (k <= 0) continue;
    st.since[i] = 0;
    const d0 = st.dens[i];
    if (d0 > 0) { const d1 = Math.max(0, d0 - ASH.clearRate * k * dt); st.dens[i] = d1; cleared += d0 - d1; }
  }
  S.ash[f.id] += cleared;
  // blow drifts away
  for (const d of st.drifts) {
    if (d.gone) continue;
    const k = Math.max(...d.cells.map(e => ashInCone(o, e.c * T + 15, e.r * T + 15, ASH.driftRange, ASH.half + 0.15)));
    if (k <= 0) continue;
    d.hp -= dt / ASH.driftT; d.wob = 0.2; d.hitT += dt;
    if (d.hitT > 0.12 && Math.floor(d.hitT * 9) !== Math.floor((d.hitT - dt) * 9)) puff(d.x - o.dir * 8, d.y + (MODES.ash.rand() - 0.5) * (d.r1 - d.r0 + 1) * T, 2, 'rgba(160,150,170,0.8)');
    if (d.hp <= 0) ashBlowDrift(st, d, o.dir);
  }
  // gust the leader; blow the ash hat off
  const lc = { x: ld.x + ld.w / 2, y: ld.y + ld.h / 2 };
  const k = ld.alive ? ashInCone(o, lc.x, lc.y, R, ASH.gustHalf) : 0;
  // the wind only carries the leader over a big gust gap (marked with a windsock), so little hops stay little;
  // while the fan blows at the gap from behind its edge, it carries the leader all the way over (any height up to gustH)
  const gp = ld.alive ? ashGapAt(st, lc.x) : null;
  st.gust.on = !!gp && ashGustReach(st, gp, f) && (lc.x - o.x) * o.dir > -12 && Math.abs(lc.y - o.y) < ASH.gustH
    && ld.y + ld.h > gp.r * T - ASH.gustH;   // (not through the rock of a path that runs above the gap)
  st.gust.gp = st.gust.on ? gp : null;
  if (k > 0 && st.hat > 0) {
    st.hatOff += dt;
    if (st.hatOff >= ASH.hatOffT) {
      S.hatsOff++; st.hat = 0; st.hatOff = 0;
      ashPop(st, lc.x, ld.y - 34, 'Fwoosh! Hat off!', '#fff', 16);
      Sfx.play('ashHatOff'); puff(lc.x, ld.y, 10, 'rgba(150,140,160,0.9)'); ashProgress(st);
    }
  } else st.hatOff = 0;
  // wind streaks (cosmetic)
  if (!reduceMotion && st.wind.length < 26 && MODES.ash.rand() < dt * 30) {
    const a = (MODES.ash.rand() * 2 - 1) * ASH.half * 0.85;
    st.wind.push({ x: o.x, y: o.y, vx: Math.cos(a) * o.dir * 420, vy: Math.sin(a) * 420, t: 0, life: 0.5, ph: MODES.ash.rand() * 6 });
  }
}
function ashBlowDrift(st, d, dir) {
  d.gone = true; st.stats.drifts++;
  for (const e of d.cells) { G.level.grid[e.r][e.c] = '.'; st.kind[ashIdx(e.c, e.r)] = ''; }
  const R = MODES.ash.rand;
  for (let i = 0; i < 26; i++) G.particles.push({ x: d.x + (R() - 0.5) * 24, y: d.y + (R() - 0.5) * (d.r1 - d.r0 + 1) * T, vx: dir * (120 + R() * 260), vy: -60 - R() * 140,
    life: 0.9, max: 0.9, col: i % 3 ? 'rgba(170,160,180,0.9)' : 'rgba(225,220,230,0.95)', size: 5 + R() * 6, grav: 120, kind: 'dot' });
  ashPop(st, d.x, d.r0 * T - 12, 'Poof!', '#fff', 22);
  Sfx.play('ashPoof'); rumble(st.fanner, 0.2, 0.4, 120);
  ashProgress(st);
}
// does the fanner's wind reach this gust gap? (fan on, facing it, standing behind its near edge, close enough)
function ashGustReach(st, gp, f) {
  if (!st.fan.on || !f.alive) return false;
  const o = ashFanO(f), back = o.dir > 0 ? gp.x0 - o.x : o.x - gp.x1;
  return back > -30 && back < ASH.gustR * (st.luckyGust ? ASH.luckyReach : 1);   // a Lucky gust also reaches further
}
// the gust gap (bridge not down yet) the point x is over, from a little before its edge
function ashGapAt(st, x) {
  return st.gaps.find(gp => x >= gp.x0 - 34 && x <= gp.x1 + 16 && !st.levers.some(l => l.id === gp.lever && l.on)) || null;
}
// a leader in the wind in mid-air glides and is pushed along (after the players moved)
function ashGustStep(st, dt) {
  const ld = G.players[st.leader], f = G.players[st.fanner], gs = st.gust;
  if (!ld.alive) { gs.air = false; gs.t = 0; return; }
  if (!ld.grounded) {
    if (!gs.air) { gs.air = true; gs.t = 0; gs.x0 = ld.x; }
    if (gs.on) {
      const mul = st.luckyGust ? ASH.luckyGust : 1;
      moveX(ld, f.face * ASH.gustX * mul * dt, true);
      if (ld.vy > ASH.glideV) ld.vy = ASH.glideV;
      // the updraft: below float height with the whole body over the open gap, the wind lifts the leader (a full jump still
      // rises higher); over the ground at either edge it only glides, so nobody hovers above a ledge without landing
      const gp = gs.gp;
      if (gp && ld.x >= gp.x0 - 2 && ld.x + ld.w <= gp.x1 + 2 && ld.y + ld.h > gp.r * T - ASH.liftH && ld.vy > -ASH.liftV) ld.vy = Math.max(-ASH.liftV, ld.vy - ASH.liftA * dt);
      gs.t += dt;
      if (Math.floor(gs.t * 8) !== Math.floor((gs.t - dt) * 8)) puff(ld.x + ld.w / 2 - f.face * 12, ld.y + ld.h / 2, 1, 'rgba(255,255,255,0.85)');
      if (gs.t > 0 && gs.t - dt <= 0) Sfx.play('ashGust', ld.id);
    }
  } else if (gs.air) {
    // landed: a real gust jump carried the leader a good way
    if (gs.t >= ASH.gustMin && Math.abs(ld.x - gs.x0) >= ASH.gustDist) {
      st.stats.gusts++;
      ashPop(st, ld.x + ld.w / 2, ld.y - 30, 'Whoosh! Nice gust!', C.gold, 18);
      Sfx.play('ashGustLand'); rumble(ld.id, 0.15, 0.3, 80); rumble(f.id, 0, 0.3, 80);
      for (const gp of st.gaps) if (!gp.crossed && ld.x + ld.w / 2 > gp.x1 && gs.x0 < gp.x0) { gp.crossed = true; ashProgress(st); }
    }
    gs.air = false; gs.t = 0;
  }
}

/* ---------- the leader: levers, calls, footprints ---------- */
function ashLeverNear(st, p) {
  const cx = p.x + p.w / 2, feet = p.y + p.h;
  let best = null;
  for (const lv of st.levers) if (!lv.on && Math.abs(cx - lv.x) <= ASH.reach && Math.abs(feet - lv.y) <= 36) if (!best || Math.abs(cx - lv.x) < Math.abs(cx - best.x)) best = lv;
  return best;
}
function ashPull(st, lv) {
  lv.on = true; lv.t = 0; st.stats.levers++;
  const gates = st.gates.filter(g => g.lever === lv.id), bridges = st.bridges.filter(b => b.lever === lv.id);
  for (const g of gates) { g.open = true; g.t = 0; G.level.grid[g.r][g.c] = '.'; st.kind[ashIdx(g.c, g.r)] = ''; }
  for (const b of bridges) b.t = -b.at;
  Sfx.play('ashLever'); rumble(st.leader, 0.25, 0.4, 120);
  if (gates.length) { Sfx.play('ashGate'); ashNews(st, 'Gate open!'); const gx = gates[0].c * T + 15; for (const g of gates) puff(gx, g.r * T + 15, 4, '#d9c07a'); }
  if (bridges.length) ashNews(st, (st.exitKind === 'ship' ? 'Gangplank down! ' : 'Rope bridge down! ') + NAMES[st.fanner] + ', come across!');
  ashPop(st, lv.x, lv.y - 50, 'Clunk!', '#fff', 18);
  // the leader's pull also fans out the ash around the lever a little (a puff of air)
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (Math.hypot(c * T + 15 - lv.x, r * T + 15 - (lv.y - 20)) < 50) { const i = ashIdx(c, r); st.dens[i] = Math.min(st.dens[i], 0.2); st.since[i] = 0; }
  ashProgress(st);
}
function ashBridgeStep(st, dt) {
  for (const b of st.bridges) {
    if (b.on || !st.levers.some(l => l.id === b.lever && l.on)) continue;
    b.t += dt;
    if (b.t < 0) continue;
    b.on = true; b.t = 0;
    G.level.grid[b.r][b.c] = '#';
    for (const p of G.players) if (p.alive && rectHit(p, b.c * T, b.r * T, T, T)) { p.y = b.r * T - p.h; p.vy = Math.min(p.vy, 0); }
    Sfx.play('ashPlank');
    puff(b.c * T + 15, b.r * T + 6, 3, '#e0b070');
    const i = ashIdx(b.c, b.r); st.dens[i] = Math.min(st.dens[i], 0.3); st.since[i] = 0;
  }
}
function ashLeaderStep(st, dt) {
  const p = G.players[st.leader], P = st.pl[p.id];
  const lv = p.alive ? ashLeverNear(st, p) : null;
  if (p.pendingAct) {
    p.pendingAct = false;
    if (G.introT <= ASH.introHold && p.alive && !st.done) {
      if (lv) ashPull(st, lv);
      else if (!st.calls.some(c => c.t < ASH.callCD)) ashCall(st, p);
    }
  }
  // the fanner by a lever for a moment: say whose job it is
  const f = G.players[st.fanner], fl = f.alive ? ashLeverNear(st, f) : null;
  st.pl[f.id].nearLever = fl ? st.pl[f.id].nearLever + dt : 0;
  if (st.pl[f.id].nearLever > 1.2 && (f.input.act || st.pl[f.id].nearLever > 3)) { st.pl[f.id].nearLever = -20; ashSay(st, f.id, 'Only ' + NAMES[st.leader] + ' can pull levers!'); }
  // footprints: the leader finds them by walking past
  const cx = p.x + p.w / 2, feet = p.y + p.h, see = ashSeeR(st);
  // standing past a gust gap (however they got there): the job there now is its lever
  if (p.alive && p.grounded) for (const gp of st.gaps) if (!gp.crossed && cx > gp.x1 && Math.abs(feet - gp.r * T) < 70) { gp.crossed = true; ashProgress(st); }
  for (const m of st.marks) {
    const d = Math.hypot(m.x - cx, m.y - feet);
    m.seen = p.alive && d < see ? Math.min(1, m.seen + dt * 4) : Math.max(0, m.seen - dt * 2);
    if (!m.found && p.alive && Math.abs(m.x - cx) < 26 && Math.abs(m.y - feet) < 40) {
      m.found = true; m.t = 0; st.stats.marks++;
      Sfx.play('ashMark', p.id); ashProgress(st);
    }
    if (m.found) m.t += dt;
  }
  for (const l of st.levers) { const d = Math.hypot(l.x - cx, l.y - feet); l.seen = p.alive && d < see + 20 ? Math.min(1, l.seen + dt * 4) : Math.max(0, l.seen - dt * 2); l.t += dt; }
  P.lever = lv;
}
function ashSeeR(st) { return ASH.seeR - st.hat * ASH.hatSee; }
// "This way!": an arrow toward the next footprint (or job) for the fanner, and the parrot squawks
function ashCall(st, p) {
  const nx = ashNextTarget(st);
  st.calls.push({ t: 0, dir: nx && nx.x < p.x + p.w / 2 ? -1 : 1, id: p.id });
  st.stats.calls++;
  Sfx.play('ashCall', p.id); rumble(st.fanner, 0, 0.3, 70);
  st.parrot.squawk = 0.6;
}
// how far along the trail a spot is (y = the floor under it): left to right, and in a room that climbs to a
// higher path (ash.turn), the higher path comes after, walked right to left
function ashRK(st, x, y) { return st.turnY != null && y < st.turnY ? 2 * W - x : x; }
// the next thing on the trail: the nearest unfound footprint ahead of the leader, else the next job
function ashNextTarget(st) {
  const p = G.players[st.leader], here = ashRK(st, p.x + p.w / 2, p.y + p.h);
  const m = st.marks.find(q => !q.found && ashRK(st, q.x, q.y) > here - 10);
  const j = ashNextJob(st);
  if (m && (!j || ashRK(st, m.x, m.y) < j.k)) return { x: m.x, y: m.y - 10, kind: 'mark' };
  return j;
}
// the next job, in trail order: drifts, gust gaps, levers, then the exit (k = how far along the trail)
function ashNextJob(st) {
  const jobs = [];
  for (const d of st.drifts) if (!d.gone) jobs.push({ x: d.x, y: d.r0 * T, k: ashRK(st, d.x, (d.r1 + 1) * T), kind: 'drift', ref: d });
  for (const gp of st.gaps) {
    const lv = st.levers.find(l => l.id === gp.lever);
    if (lv && lv.on) continue;
    if (!gp.crossed) jobs.push({ x: (gp.x0 + gp.x1) / 2, y: gp.r * T - 60, k: ashRK(st, (gp.x0 + gp.x1) / 2, gp.r * T), kind: 'gap', ref: gp });
    else if (lv) jobs.push({ x: lv.x, y: lv.y - 40, k: ashRK(st, lv.x, lv.y), kind: 'lever', ref: lv });
  }
  for (const lv of st.levers) if (!lv.on && !st.gaps.some(gp => gp.lever === lv.id)) jobs.push({ x: lv.x, y: lv.y - 40, k: ashRK(st, lv.x, lv.y), kind: 'lever', ref: lv });
  jobs.sort((a, b) => a.k - b.k);
  const e = st.exit;
  let j = jobs.length ? jobs[0] : e ? { x: e.x + e.w / 2, y: e.y - 20, k: ashRK(st, e.x + e.w / 2, e.y + e.h), kind: 'exit' } : null;
  // the next job is up on the higher path and the leader is still down below: first, the climb
  // (where the leader last stood decides, so a jump up the steps doesn't flip it back and forth)
  const ld = G.players[st.leader];
  if (ld.alive && ld.grounded) st.ldUp = st.turnY != null && ld.y + ld.h < st.turnY;
  if (j && st.climb && j.k > W && !st.ldUp) j = { x: st.climb.x, y: st.climb.y, k: W, kind: 'climb' };
  return j;
}

/* ---------- camps, hazards, hop back, the exit ---------- */
function ashCampStep(st) {
  for (const p of G.players) {
    if (!p.alive || !p.grounded) continue;
    const cx = p.x + p.w / 2, feet = p.y + p.h;
    st.camps.forEach((cp, k) => {
      if (k <= st.camp[p.id] || Math.abs(cx - cp.x) > 40 || Math.abs(feet - cp.y) > 4) return;
      st.camp[p.id] = k;
      G.spawnPts[p.id] = { x: cp.x - PW / 2 + (p.id === st.leader ? 14 : -14), y: cp.y - PH };
      if (!cp.lit) {
        cp.lit = true; cp.t = 0; st.stats.camps++;
        // a lit torch keeps a little pocket of the cloud clear around it
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (Math.hypot(c * T + 15 - cp.x, r * T + 15 - (cp.y - 30)) < 62) { st.base[ashIdx(c, r)] = 0; }
        Sfx.play('ashCamp'); ashPop(st, cp.x, cp.y - 70, 'Camp!', C.gold, 18); ashProgress(st);
      }
      puff(cp.x, cp.y - 40, 5, C.gold);
    });
  }
}
function ashHazardStep(st) {
  for (const p of G.players) {
    if (!p.alive) continue;
    const c1 = Math.floor((p.x + 3) / T), c2 = Math.floor((p.x + p.w - 3) / T), r = Math.floor((p.y + p.h - 4) / T);
    for (let c = c1; c <= c2; c++) {
      const hz = r >= 0 && r < ROWS && c >= 0 && c < COLS ? st.hazard[ashIdx(c, r)] : '';
      if (!hz) continue;
      st.pl[p.id].why = hz === 'v' ? 'hot' : 'splash';
      kill(p);
      return;
    }
  }
}
function ashHopStep(st, dt) {
  for (const p of G.players) {
    const P = st.pl[p.id], i = p.input;
    const canHold = p.alive && p.grounded && !i.left && !i.right;
    if (i.down && !P.prevDown) P.downOk = canHold;
    if (!i.down || !canHold) P.downOk = false;
    P.prevDown = i.down;
    if (P.downOk) {
      P.downT += dt;
      if (P.downT >= ASH.hopHold) {
        P.downOk = false; P.downT = 0; st.stats.hops++;
        respawn(p); p.downLatch = true;
        Sfx.play('ashHop', p.id); rumble(p.id, 0, 0.3, 80);
        ashPop(st, p.x + p.w / 2, p.y - 24, 'Back to camp!', '#fff', 14);
      }
    } else P.downT = 0;
  }
}
function ashExitStep(st, dt) {
  const e = st.exit;
  if (!e || st.done) return;
  const inside = p => { if (!p.alive) return false; const cx = p.x + p.w / 2, cy = p.y + p.h / 2; return cx > e.x + 2 && cx < e.x + e.w - 2 && cy > e.y && cy < e.y + e.h; };
  st.exitIn = G.players.map(inside);
  if (st.exitIn[0] && st.exitIn[1]) {
    st.exitT += dt;
    if (st.exitT >= ASH.exitHold) {
      st.done = true;
      const def = G.level.def;
      st.stats.roomT.push({ title: def.title, t: st.roomT });
      if (def.roomIndex < def.roomCount - 1) { nextRoom(); return; }
      G.level.door = e;   // (the confetti comes out of the exit)
      Sfx.play('ashHorn');
      levelClear();
    }
  } else st.exitT = 0;
}

/* ---------- the volcano: puffs drop ash clumps on the leader's head ---------- */
function ashHatStep(st, dt) {
  if (!st.hats || st.done || G.introT > 0) return;
  const ld = G.players[st.leader];
  st.hatT -= dt;
  if (st.hatT <= 0) {
    st.hatT = ASH.hatEvery + MODES.ash.rand() * ASH.hatJitter;
    st.puffT = 1.2;
    Sfx.play('ashRumble'); if (!reduceMotion) G.shake = Math.max(G.shake, 0.08);
    rumble(0, 0.15, 0.25, 200); rumble(1, 0.15, 0.25, 200);
    if (ld.alive && st.hat < ASH.hatMax) st.clumps.push({ x: clamp(ld.x + ld.w / 2 + ld.vx * 0.9, 20, W - 20), y: -30, vy: ASH.clumpV, t: 0, ph: MODES.ash.rand() * 6 });
  }
  if (st.puffT > 0) st.puffT -= dt;
  for (const cl of st.clumps) {
    cl.t += dt; cl.y += cl.vy * dt;
    // it drifts a little toward the leader (the leader can dodge it by running)
    if (ld.alive) cl.x += clamp(ld.x + ld.w / 2 - cl.x, -40, 40) * dt * 0.8;
    if (ld.alive && Math.abs(cl.x - (ld.x + ld.w / 2)) < 18 && cl.y > ld.y - 14 && cl.y < ld.y + 10) {
      cl.done = true; st.hat = Math.min(ASH.hatMax, st.hat + 1); st.stats.hats++;
      Sfx.play('ashPlop'); puff(cl.x, ld.y, 6, 'rgba(150,140,160,0.9)');
      ashPop(st, ld.x + ld.w / 2, ld.y - 36, st.hat >= 2 ? 'Can’t see much!' : 'Ash hat!', '#fff', 15);
      if (!st.saidHat) { st.saidHat = true; ashSay(st, st.fanner, 'Fan ' + NAMES[st.leader] + '’s ash hat off!'); }
    } else if (cl.y > H + 20) cl.done = true;
    else if (cl.y > 0 && ashSolidAt(Math.floor(cl.x / T), Math.floor(cl.y / T))) { cl.done = true; puff(cl.x, cl.y - 6, 4, 'rgba(150,140,160,0.9)'); }   // a rock above keeps your head clean
  }
  st.clumps = st.clumps.filter(c => !c.done);
}

/* ---------- the parrot guide, stuck hints, gold help ---------- */
function ashHelpStep(st, dt) {
  const pr = st.parrot, job = ashNextJob(st), ld = G.players[st.leader], f = G.players[st.fanner];
  if (G.introT <= 0 && !st.done) st.progT += dt;
  // the parrot perches over the next job (or flies along with the leader when it is far away)
  let tx = job ? job.x : ld.x, ty = job ? job.y - 34 : ld.y - 60;
  if (job && job.kind === 'drift') {
    // beside the drift, on the side the leader comes from (a drift often reaches up to the rock above it)
    const d = job.ref, side = ld.x + ld.w / 2 < d.x ? -1 : 1;
    tx = d.x + side * ((d.c1 - d.c0 + 1) * T / 2 + 22); ty = d.y - 10;
  } else if (job) ty = Math.max(ty, ashRoof(job.x, job.kind === 'gap' ? job.y + 50 : job.y + 30) + 18);   // under any rock above
  if (job && Math.abs(job.x - (ld.x + ld.w / 2)) > 420) { tx = ld.x + ld.w / 2 + Math.sign(job.x - ld.x) * 120; ty = ld.y - 70; }
  ty = Math.max(90, ty);
  const dx = tx - pr.x, dy = ty - pr.y, d = Math.hypot(dx, dy), sp = 260 * dt;
  if (d > sp) { pr.x += dx / d * sp; pr.y += dy / d * sp; pr.perch = false; if (Math.abs(dx) > 4) pr.face = Math.sign(dx); }
  else { pr.x = tx; pr.y = ty; pr.perch = true; }
  pr.flap += dt * (pr.perch ? 3 : 14); if (pr.squawk > 0) pr.squawk -= dt;
  // stuck: a squawk and a hint for each of you
  if (st.progT > ASH.stuckHint * (st.hintN + 1) && job) {
    st.hintN++; pr.squawk = 1.0; Sfx.play('ashCall', 0);
    ashHint(st, job);
    if (st.hintN === 3) for (const id of [0, 1]) ashSay(st, id, 'Stuck? Hold ' + ashKey(id, 'down') + ' to go back to camp', 4);
  }
  // gold help: Lucky breeze (stuck a long time, or 3 Oops in this room)
  if (!st.luckyUsed && (st.progT > ASH.stuckLucky || st.roomFalls >= ASH.luckyFalls)) {
    st.luckyUsed = true; st.luckyT = ASH.luckyT; pr.gold = true;
    ashNews(st, 'Sea breeze! The ash thins for a bit', true, 4);
    Sfx.play('ashLucky'); rumble(0, 0, 0.3, 120); rumble(1, 0, 0.3, 120);
  }
  if (st.luckyT > 0) {
    st.luckyT -= dt;
    const cx = (ld.x + f.x) / 2 + 11;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (Math.abs(c * T + 15 - cx) > 330) continue;
      const i = ashIdx(c, r); st.dens[i] = Math.max(0, st.dens[i] - 1.2 * dt); st.since[i] = 0;
    }
    if (!reduceMotion && MODES.ash.rand() < dt * 12) G.particles.push({ x: MODES.ash.rand() * W, y: 120 + MODES.ash.rand() * 380, vx: 160, vy: -10, life: 0.8, max: 0.8, col: C.gold, size: 3, grav: 0, kind: 'dot' });
  }
}
function ashHint(st, job) {
  const L = st.leader, F = st.fanner, fk = ashKey(F, 'act'), lk = ashKey(L, 'act');
  if (job.kind === 'drift') { ashSay(st, F, 'Hold ' + fk + ': blow the drift away!'); ashSay(st, L, 'A drift! ' + NAMES[F] + ' can blow it away'); }
  else if (job.kind === 'gap') { ashSay(st, F, 'Hold ' + fk + ' by the windsock to blow ' + NAMES[L] + ' over!'); ashSay(st, L, 'Jump when the windsock blows!'); }
  else if (job.kind === 'lever') { ashSay(st, L, 'Find the lever, press ' + lk + '!'); ashSay(st, F, 'Clear the ash so ' + NAMES[L] + ' can see!'); }
  else if (job.kind === 'climb') { ashSay(st, L, 'Climb the rocks up to the high path!'); ashSay(st, F, 'Follow ' + NAMES[L] + ' up the rocks!'); }
  else { ashSay(st, L, 'The way out is over there!'); ashSay(st, F, 'Stay close and keep fanning!'); }
}
// quick nudges (sooner than the stuck hints) when the leader waits at a gust gap's edge or pushes on a drift
function ashNudgeStep(st, dt) {
  const ld = G.players[st.leader], f = G.players[st.fanner], N = st.nudge;
  N.cd = Math.max(0, N.cd - dt);
  let want = '';
  if (ld.alive && ld.grounded && !st.done && G.introT <= 0) {
    const cx = ld.x + ld.w / 2, feet = ld.y + ld.h;
    const gp = st.gaps.find(g => !g.crossed && !st.levers.some(l => l.id === g.lever && l.on) && cx > g.x0 - 70 && cx < g.x0 + 4 && Math.abs(feet - g.r * T) < 4);
    if (gp) want = ashGustReach(st, gp, f) ? 'jump' : 'fan';
    else if (st.drifts.some(d => !d.gone && d.wob <= 0 && feet > d.r0 * T && feet <= (d.r1 + 1) * T + 1
      && (Math.abs(ld.x + ld.w - d.c0 * T) < 4 || Math.abs(ld.x - (d.c1 + 1) * T) < 4))) want = 'drift';
  }
  if (want !== N.kind) { N.kind = want; N.t = 0; }
  if (!want) return;
  N.t += dt;
  if (N.t < 1.8 || N.cd > 0) return;
  N.cd = 9; N.t = 0;
  const fk = ashKey(st.fanner, 'act');
  if (want === 'fan') ashSay(st, st.fanner, 'Hold ' + fk + ' by the windsock to blow ' + NAMES[st.leader] + ' over!');
  else if (want === 'jump') ashSay(st, st.leader, 'Jump! The wind will carry you over');
  else ashSay(st, st.fanner, 'Hold ' + fk + ': blow the drift away!');
}
// the cloud drifts back where the wind left it (not while a Lucky breeze blows)
function ashRegrow(st, dt) {
  const delay = st.windy ? ASH.windyDelay : ASH.regrowDelay, rate = st.windy ? ASH.windyRate : ASH.regrowRate, calm = st.luckyT > 0;
  for (let i = 0; i < st.dens.length; i++) {
    st.since[i] += dt;
    const b = st.base[i], d = st.dens[i];
    if (d > b) st.dens[i] = Math.max(b, d - 2 * dt);
    else if (d < b && !calm && st.since[i] > delay) st.dens[i] = Math.min(b, d + rate * dt);
  }
}
function ashFx(st, dt) {
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.1);
  for (const b of st.bubbles) b.t += dt;
  st.bubbles = st.bubbles.filter(b => b.t < b.life);
  if (st.news && (st.news.t += dt) > st.news.life) st.news = null;
  for (const c of st.calls) c.t += dt;
  st.calls = st.calls.filter(c => c.t < ASH.callLife);
  for (const w of st.wind) { w.t += dt; w.x += w.vx * dt; w.y += w.vy * dt; }
  st.wind = st.wind.filter(w => w.t < w.life);
  for (const d of st.drifts) { if (d.wob > 0) d.wob -= dt; else d.hitT = 0; }
  for (const g of st.gates) if (g.open) g.t += dt;
  for (const b of st.bridges) if (b.on) b.t += dt;
  for (const cp of st.camps) cp.t += dt;
}

MODES.ash = {
  rand: Math.random,   // cosmetic randomness and the volcano's puff timing; tests may swap in a seeded one
  setup(st, L) {
    st.stats = { ash: [0, 0], gusts: 0, drifts: 0, marks: 0, markTotal: 0, levers: 0, hatsOff: 0, hats: 0, calls: 0, camps: 0, hops: 0, oops: [0, 0], hot: 0, splash: 0, roomT: [] };
    ashRoom(st, L);
    st.stats.markTotal += st.marks.length;
  },
  room(k, L) { const st = G.mst; ashRoom(st, L); st.stats.markTotal += st.marks.length; },
  step(dt) {
    const st = G.mst;
    if (!st.dens) return;
    st.roomT += dt;
    ashFanStep(st, dt);
    ashGustStep(st, dt);
    ashLeaderStep(st, dt);
    ashBridgeStep(st, dt);
    ashCampStep(st);
    ashHazardStep(st);
    ashHopStep(st, dt);
    ashHatStep(st, dt);
    ashHelpStep(st, dt);
    ashNudgeStep(st, dt);
    ashRegrow(st, dt);
    ashFx(st, dt);
    ashExitStep(st, dt);
  },
  onKill(p) {
    const st = G.mst, P = st.pl[p.id], R = MODES.ash.rand;
    st.roomFalls++; st.stats.oops[p.id]++;
    const x = p.x + p.w / 2, y = Math.min(p.y + p.h / 2, H - 20);
    if (P.why === 'hot') {
      st.stats.hot++; ashPop(st, x, y - 30, 'Toasty toes!', '#ffb347', 22); Sfx.play('ashSizzle');
      for (let i = 0; i < 8; i++) G.particles.push({ x: x + (R() - 0.5) * 16, y, vx: (R() * 2 - 1) * 30, vy: -60 - R() * 50, life: 0.9, max: 0.9, col: 'rgba(120,110,120,0.6)', size: 5 + R() * 3, grav: -40, kind: 'dot' });
    } else if (P.why === 'splash') {
      st.stats.splash++; ashPop(st, x, y - 30, 'Splash!', '#bfe9ff', 22); Sfx.play('splash');
      for (let i = 0; i < 14; i++) G.particles.push({ x, y, vx: (R() * 2 - 1) * 140, vy: -150 - R() * 200, life: 0.7, max: 0.7, col: i % 2 ? '#bfe9ff' : '#ffffff', size: 3 + R() * 3, grav: 700, kind: 'dot' });
    } else { ashPop(st, x, Math.min(y, H - 60) - 20, 'Oops!', '#fff', 22); Sfx.play('ashOops', p.id); }
    P.why = '';
    // a leader who keeps missing the same gust gap gets a gold Lucky gust
    if (p.id === st.leader) for (const gp of st.gaps) {
      if (x < gp.x0 - 10 || x > gp.x1 + 10 || st.levers.some(l => l.id === gp.lever && l.on)) continue;
      gp.falls++;
      if (gp.falls >= ASH.gapFalls && !st.luckyGust) {
        st.luckyGust = true; st.parrot.gold = true;
        ashNews(st, 'Super gust! ' + NAMES[st.fanner] + '’s fan blows extra strong', true, 4);
        Sfx.play('ashLucky');
      }
    }
  },
  onRespawn(p) {
    const st = G.mst;
    if (!st.dens) return;
    st.pl[p.id].downT = 0; st.pl[p.id].downOk = false;
    if (p.id === st.leader) st.gust.air = false;
    Sfx.play('ashPopBack', p.id);
  },
  draw() { const st = G.mst; if (st.dens) ashDraw(st); },
  drawTop() { const st = G.mst; if (st.dens) ashDrawTop(st); },
  hud() { const st = G.mst; if (st.dens) ashHud(st); },
  stats() {
    const s = G.mst.stats, falls = G.falls, time = G.time;
    const medal = time <= 200 && falls <= 2 ? 'Gold' : time <= 320 && falls <= 7 ? 'Silver' : 'Bronze';
    const words = falls === 0 ? 'Not one Oops! Super teamwork!' : falls <= 3 ? 'A few Oops, lots of teamwork!' : 'Ash everywhere, and you made it together!';
    const extra = [s.hatsOff ? 'Ash hats blown off: ' + s.hatsOff : '', 'Levers pulled: ' + s.levers, s.calls ? '“This way!” calls: ' + s.calls : ''].filter(Boolean).join(' · ');
    return [
      { label: 'Ash puffs blown', values: [Math.round(s.ash[0] / 100), Math.round(s.ash[1] / 100)] },
      { label: 'Gust jumps', value: s.gusts },
      { label: 'Drifts blown', value: s.drifts },
      { label: 'Footprints found', value: s.marks + ' of ' + s.markTotal },
      medal + ' medal · ' + words,
      extra,
    ];
  },
};
/* ---------- drawing ---------- */
// cached canvas gradients and the ash-clump sprites (the canvas and its context never change)
let ashSkyG = null, ashSeaG = null, ashSprites = null, ashBase = null, ashBaseX = null, ashBaseImg = null;
const ASH_VOLC_X = { jungle: 760, lava: 600, cliff: 420, beach: 190 };
function ashDraw(st) {
  const t = G.clock;
  ashDrawBack(st, t);
  for (const pm of st.palms) ashPalm(pm.x, pm.y, pm.s, t + pm.ph, false);
  for (const fn of st.ferns) ashFern(fn.x, fn.y, t + fn.ph);
  ashDrawBoards(st);
  ashDrawTiles(st, t);
  ashDrawHazards(st, t);
  ashDrawExit(st, t);
  for (const cp of st.camps) ashTorch(cp, t, false);
  for (const lv of st.levers) ashLeverShape(lv, 1);
  for (const m of st.marks) ashPrints(m, 0.8, false);
  ashDrawCloud(st, t);
  // what the leader knows shows through the ash: footprints and levers near them, footprints already found
  for (const m of st.marks) { const a = Math.max(m.seen, m.found ? 0.5 : 0); if (a > 0.02) ashPrints(m, a, true); }
  for (const lv of st.levers) if (lv.seen > 0.02 && !lv.on) { ctx.save(); ctx.globalAlpha = lv.seen; ashLeverGlow(lv, t); ashLeverShape(lv, 1); ctx.restore(); }
  for (const cp of st.camps) if (cp.lit) ashTorch(cp, t, true);
  // gust gaps: a windsock at the edge (it streams out while the fan blows that way), and swirls over the gap
  const f = G.players[st.fanner];
  for (const gp of st.gaps) {
    if (st.levers.some(l => l.id === gp.lever && l.on)) continue;
    const blow = ashGustReach(st, gp, f);
    ashWindsock(gp.x0 - 6, gp.r * T, t, blow);
    if (blow && !reduceMotion) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (let k = 0; k < 4; k++) {
        const u = (t * 0.9 + k / 4) % 1, x = gp.x0 + u * (gp.x1 - gp.x0), y = gp.r * T - 40 - Math.sin(u * Math.PI) * 50 - k * 6;
        ctx.globalAlpha = Math.sin(u * Math.PI);
        ctx.beginPath(); ctx.arc(x, y, 7, Math.PI * 0.2, Math.PI * 1.5); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.lineCap = 'butt';
    }
  }
}
function ashWindsock(x, y, t, blow) {
  ctx.fillStyle = '#8a5833'; ctx.fillRect(x - 2, y - 54, 4, 54);
  ctx.fillStyle = '#5c3a20'; ctx.fillRect(x - 6, y - 3, 12, 3);
  const lift = blow ? 0 : 0.9 + Math.sin(t * 2) * 0.15, flap = Math.sin(t * (blow ? 14 : 4)) * (blow ? 2 : 1.5);
  ctx.save(); ctx.translate(x + 2, y - 50); ctx.rotate(lift);
  for (let k = 0; k < 3; k++) {
    const x0 = k * 10, h0 = 8 - k * 1.6, h1 = 8 - (k + 1) * 1.6;
    ctx.fillStyle = k % 2 ? '#ffffff' : '#ff7a3d';
    ctx.beginPath(); ctx.moveTo(x0, -h0 + flap * k * 0.4); ctx.lineTo(x0 + 10, -h1 + flap * (k + 1) * 0.4); ctx.lineTo(x0 + 10, h1 + flap * (k + 1) * 0.4); ctx.lineTo(x0, h0 + flap * k * 0.4); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function ashDrawBack(st, t) {
  if (!ashSkyG) {
    ashSkyG = ctx.createLinearGradient(0, 0, 0, H);
    ashSkyG.addColorStop(0, '#f29a7c'); ashSkyG.addColorStop(0.35, '#ffc49a'); ashSkyG.addColorStop(0.6, '#ffe3bb'); ashSkyG.addColorStop(1, '#fff0d6');
    ashSeaG = ctx.createLinearGradient(0, 300, 0, H);
    ashSeaG.addColorStop(0, '#6cc6cf'); ashSeaG.addColorStop(1, '#2f8fb0');
  }
  ctx.fillStyle = ashSkyG; ctx.fillRect(0, 0, W, H);
  // hazy sun
  ctx.fillStyle = 'rgba(255,240,200,0.35)'; circle(ASH_VOLC_X[st.style] > 480 ? 200 : 780, 110, 62); ctx.fill();
  ctx.fillStyle = 'rgba(255,246,214,0.9)'; circle(ASH_VOLC_X[st.style] > 480 ? 200 : 780, 110, 36); ctx.fill();
  // the sea at the horizon, with a far island
  ctx.fillStyle = ashSeaG; ctx.fillRect(0, 300, W, H - 300);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 9; i++) { const x = ((i * 137 + t * 8) % (W + 80)) - 40, y = 312 + (i * 23) % 60; ctx.fillRect(x, y, 26, 2); }
  ashVolcano(ASH_VOLC_X[st.style], 300, t, st.puffT > 0 ? st.puffT : 0);
  ctx.fillStyle = '#6ba58f'; ctx.beginPath(); ctx.ellipse(ASH_VOLC_X[st.style] > 480 ? 120 : 860, 302, 70, 12, 0, Math.PI, 0); ctx.fill();
  // seagulls (scenery)
  ctx.strokeStyle = 'rgba(80,60,70,0.6)'; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const x = ((i * 311 + t * (18 + i * 5)) % (W + 100)) - 50, y = 70 + i * 26 + Math.sin(t * 2 + i) * 6, w = Math.sin(t * 7 + i * 2) * 3;
    ctx.beginPath(); ctx.moveTo(x - 8, y - w); ctx.quadraticCurveTo(x - 4, y - 5, x, y); ctx.quadraticCurveTo(x + 4, y - 5, x + 8, y - w); ctx.stroke();
  }
  // the far shore for each part of the island
  if (st.style === 'jungle' || st.style === 'beach') {
    ctx.fillStyle = 'rgba(70,130,90,0.55)'; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 24) ctx.lineTo(x, 330 + Math.sin(x * 0.013 + 2) * 14 + Math.sin(x * 0.041) * 6);
    ctx.lineTo(W, H); ctx.fill();
    for (let i = 0; i < 7; i++) ashPalm(60 + i * 140 + (i % 2) * 30, 345, 0.7, t + i, true);
  } else if (st.style === 'lava') {
    ctx.fillStyle = 'rgba(90,60,80,0.55)'; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 30) ctx.lineTo(x, 320 + Math.abs(Math.sin(x * 0.02 + 1)) * 30);
    ctx.lineTo(W, H); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(120,100,110,0.5)'; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 300 + (x % 120 === 0 ? 0 : 26) + Math.sin(x * 0.01) * 20);
    ctx.lineTo(W, H); ctx.fill();
  }
}
// Krakatoa on the horizon: a friendly cone with a glowing top, puffing fluffy grey clouds
function ashVolcano(x, base, t, puff) {
  ctx.fillStyle = '#8f6f7d';
  ctx.beginPath(); ctx.moveTo(x - 190, base); ctx.quadraticCurveTo(x - 70, base - 110, x - 34, base - 170); ctx.lineTo(x + 34, base - 170);
  ctx.quadraticCurveTo(x + 70, base - 110, x + 190, base); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7a5c6b';
  ctx.beginPath(); ctx.moveTo(x + 10, base - 170); ctx.lineTo(x + 34, base - 170); ctx.quadraticCurveTo(x + 70, base - 110, x + 190, base); ctx.lineTo(x + 60, base); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#5f9a6e';
  ctx.beginPath(); ctx.moveTo(x - 190, base); ctx.quadraticCurveTo(x - 120, base - 46, x - 60, base - 40); ctx.quadraticCurveTo(x, base - 30, x + 70, base - 44); ctx.quadraticCurveTo(x + 130, base - 40, x + 190, base); ctx.closePath(); ctx.fill();
  // glowing crater and lava stripes
  ctx.fillStyle = '#ff9a4a'; ctx.beginPath(); ctx.ellipse(x, base - 170, 34, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.ellipse(x, base - 171, 22, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,140,70,0.7)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 12, base - 166); ctx.quadraticCurveTo(x - 24, base - 130, x - 18, base - 104); ctx.moveTo(x + 14, base - 166); ctx.quadraticCurveTo(x + 22, base - 140, x + 30, base - 122); ctx.stroke();
  ctx.lineCap = 'butt';
  // the puffing ash column: fluffy balls rising and growing
  const big = puff > 0 ? 1 + puff * 0.5 : 1;
  for (let i = 0; i < 7; i++) {
    const f = ((t * 0.12 + i / 7) % 1), y = base - 178 - f * 160, r = (14 + f * 34) * big;
    const sx = x + Math.sin(f * 5 + i) * 16 + f * 40;
    ctx.fillStyle = 'rgba(150,140,160,' + (0.75 - f * 0.35) + ')'; circle(sx, y, r); ctx.fill();
    ctx.fillStyle = 'rgba(205,198,212,' + (0.6 - f * 0.3) + ')'; circle(sx - r * 0.3, y - r * 0.3, r * 0.55); ctx.fill();
  }
}
function ashPalm(x, y, s, t, far) {
  const sway = Math.sin(t * 1.3) * 0.06;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = far ? 'rgba(60,110,80,0.6)' : '#9b6a3e'; ctx.lineWidth = far ? 5 : 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(10, -50, 4 + sway * 120, -96); ctx.stroke();
  if (!far) { ctx.strokeStyle = '#7d5230'; ctx.lineWidth = 2; for (let k = 1; k < 6; k++) { const yy = -k * 16; ctx.beginPath(); ctx.moveTo(-4 + k * 0.8, yy); ctx.lineTo(6 + k * 0.8, yy - 2); ctx.stroke(); } }
  ctx.translate(4 + sway * 120, -96);
  const leaf = far ? 'rgba(60,120,80,0.6)' : '#3fa45a', dark = far ? 'rgba(50,100,70,0.6)' : '#2e7f45';
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k - 2.5) * 0.62 + sway * 2;
    ctx.save(); ctx.rotate(a);
    ctx.fillStyle = k % 2 ? leaf : dark;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(26, -14, 52, 8); ctx.quadraticCurveTo(26, 0, 0, 0); ctx.fill();
    ctx.restore();
  }
  if (!far) { ctx.fillStyle = '#6b4a2a'; circle(-4, 4, 5); ctx.fill(); circle(5, 5, 5); ctx.fill(); }
  ctx.restore(); ctx.lineCap = 'butt';
}
function ashFern(x, y, t) {
  const sw = Math.sin(t * 1.7) * 2;
  ctx.fillStyle = '#4caf5c';
  for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(x + k * 8 + sw * (k / 2), y - 10 - (2 - Math.abs(k)) * 4, 6, 13, k * 0.4, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#ff7fae'; circle(x + 3, y - 20, 3.5); ctx.fill();
}
function ashDrawBoards(st) {
  for (const b of st.boards) {
    const big = hudBig(), fs = big ? 17 : 13;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(b.text).width + 20, h = fs + 12;
    ctx.fillStyle = '#7d5230'; ctx.fillRect(b.x - 3, b.y, 6, b.post || 40);
    ctx.fillStyle = '#c98b5a'; rr(b.x - w / 2, b.y - h, w, h, 5); ctx.fill();
    ctx.strokeStyle = '#8a5833'; ctx.lineWidth = 2; ctx.stroke();
    text(b.text, b.x, b.y - h / 2 + 0.5, fs, '#4a2a14', 'center', 'body');
  }
}
// the bottom of the first rock above the spot (x, y), or 0 when it is open sky
function ashRoof(x, y) {
  const c = Math.floor(x / T);
  for (let r = Math.min(ROWS - 1, Math.floor(y / T)); r >= 0; r--) if (c >= 0 && c < COLS && G.level.grid[r][c] === '#') return (r + 1) * T;
  return 0;
}
function ashSolidAt(c, r) { return c < 0 || c >= COLS || r < 0 ? true : r >= ROWS ? false : G.level.grid[r][c] === '#'; }
function ashDrawTiles(st, t) {
  const g = G.level.grid;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (g[r][c] !== '#') continue;
    const k = st.kind[ashIdx(c, r)];
    if (k === 'd' || k === 'g' || k === 'b') continue;
    ashCell(st, k === 'z' ? 'sand' : k === 'w' ? 'wood' : st.style, c, r);
  }
  for (const b of st.bridges) if (b.on) ashBridgeCell(st, b);
  for (const gt of st.gates) ashGateCell(gt, t);
  for (const d of st.drifts) if (!d.gone) ashDriftShape(d, t);
}
function ashCell(st, style, c, r) {
  const x = c * T, y = r * T, h = hash(c, r), topOpen = !ashSolidAt(c, r - 1) || st.kind[ashIdx(c, r - 1)] === 'd';
  const leftOpen = !ashSolidAt(c - 1, r), rightOpen = !ashSolidAt(c + 1, r);
  if (style === 'sand') {
    ctx.fillStyle = '#f0d193'; ctx.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
    ctx.fillStyle = '#d9b46e';
    for (let i = 0; i < 4; i++) { circle(x + 4 + ((h >> (i * 3)) % 22), y + 6 + ((h >> (i * 4 + 2)) % 20), 1.4); ctx.fill(); }
    if (topOpen) { ctx.fillStyle = '#fbe6b4'; ctx.fillRect(x, y, T, 5); }
    return;
  }
  if (style === 'wood') {
    ctx.fillStyle = '#a8683c'; ctx.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
    ctx.fillStyle = '#8a5230'; ctx.fillRect(x, y + 9, T, 2); ctx.fillRect(x, y + 20, T, 2); ctx.fillRect(x + (h % 2 ? 8 : 20), y, 2, T);
    if (topOpen) { ctx.fillStyle = '#d39a62'; ctx.fillRect(x, y, T, 5); ctx.fillStyle = '#6b3e20'; circle(x + 6, y + 2.5, 1.3); ctx.fill(); circle(x + 24, y + 2.5, 1.3); ctx.fill(); }
    return;
  }
  const pal = {
    jungle: ['#7a5236', '#8c6142', '#5c3c26', '#6cc04a', '#4c9a38'],
    lava: ['#4d3c52', '#5f4b66', '#33263a', '#7b6578', '#5a4660'],
    cliff: ['#8b7869', '#9d8a7a', '#6a5a4e', '#93d26c', '#5ea44a'],
    beach: ['#7f7069', '#93847c', '#5f524c', '#a89a8e', '#7f7069'],
  }[style] || ['#7a5236', '#8c6142', '#5c3c26', '#6cc04a', '#4c9a38'];
  ctx.fillStyle = pal[0]; ctx.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
  if (h % 3 === 0) { ctx.fillStyle = pal[1]; rr(x + 4 + (h % 14), y + 9 + ((h >> 4) % 12), 8, 5, 2.5); ctx.fill(); }
  if (style === 'cliff') { ctx.fillStyle = pal[2]; ctx.fillRect(x, y + 14 + (h % 5), T, 2); }
  if (style === 'lava' && h % 5 === 1) { ctx.strokeStyle = 'rgba(255,140,60,0.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 6, y + 8); ctx.lineTo(x + 13, y + 16); ctx.lineTo(x + 10, y + 24); ctx.stroke(); }
  ctx.fillStyle = pal[2];
  if (leftOpen) ctx.fillRect(x, y, 3, T);
  if (rightOpen) ctx.fillRect(x + T - 3, y, 3, T);
  if (!ashSolidAt(c, r + 1)) ctx.fillRect(x, y + T - 4, T, 4);
  if (topOpen) {
    ctx.fillStyle = pal[4]; ctx.fillRect(x, y, T, 8);
    ctx.fillStyle = pal[3]; ctx.fillRect(x, y, T, 5);
    if (style === 'jungle' || style === 'cliff') { for (let i = 0; i < 3; i++) { circle(x + 5 + i * 10, y + 6, 3.2); ctx.fill(); } }
  }
}
function ashBridgeCell(st, b) {
  const x = b.c * T, y = b.r * T, u = Math.min(1, b.t / 0.15);
  ctx.save(); ctx.translate(x + 15, y + 4); ctx.scale(1, 0.6 + 0.4 * u);
  ctx.fillStyle = '#8a5833'; rr(-15, -2, T, 9, 2); ctx.fill();
  ctx.fillStyle = '#d39a62'; rr(-14, -3, T - 2, 7, 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#e8cf95'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.quadraticCurveTo(x + 15, y - 8, x + T, y - 12); ctx.stroke();
  ctx.strokeStyle = '#a07a45'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x + 4, y - 11); ctx.lineTo(x + 4, y + 2); ctx.moveTo(x + 26, y - 11); ctx.lineTo(x + 26, y + 2); ctx.stroke();
}
function ashGateCell(gt, t) {
  const x = gt.c * T, y = gt.r * T;
  if (gt.open && gt.t > 0.5) return;
  const u = gt.open ? Math.min(1, gt.t / 0.5) : 0;
  ctx.save(); ctx.globalAlpha = 1 - u; ctx.translate(0, -u * 40);
  for (let k = 0; k < 3; k++) {
    const sx = x + 3 + k * 9;
    ctx.fillStyle = k % 2 ? '#c9b45a' : '#b39d45'; rr(sx, y, 7, T, 3); ctx.fill();
    ctx.fillStyle = '#7f6e2a'; ctx.fillRect(sx, y + 13, 7, 2.5);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(sx + 1.5, y + 2, 1.5, 9);
  }
  ctx.fillStyle = '#7d5230'; ctx.fillRect(x + 1, y + 22, T - 2, 4);
  ctx.restore();
}
function ashDriftShape(d, t) {
  const x0 = d.c0 * T, y0 = d.r0 * T, w = (d.c1 - d.c0 + 1) * T, h = (d.r1 - d.r0 + 1) * T;
  const wob = d.wob > 0 && !reduceMotion ? Math.sin(t * 50) * 2 : 0, sq = 0.55 + 0.45 * clamp(d.hp, 0, 1);
  ctx.save(); ctx.translate(x0 + w / 2 + wob, y0 + h); ctx.scale(1, sq);
  ctx.fillStyle = '#6f6678'; rr(-w / 2 - 4, -h, w + 8, h, 12); ctx.fill();
  ctx.fillStyle = '#857c90';
  for (let k = 0; k < h / 15; k++) { circle(-w / 4 + (k % 2) * w / 2, -h + 10 + k * 15, 11); ctx.fill(); }
  ctx.fillStyle = '#a49bad'; circle(-w / 4, -h + 7, 8); ctx.fill(); circle(w / 5, -h + 4, 9); ctx.fill();
  ctx.strokeStyle = 'rgba(220,214,228,0.75)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, -h / 2, 6, 0.3, Math.PI * 1.6); ctx.stroke();
  ctx.restore();
}
function ashDrawHazards(st, t) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const hz = st.hazard[ashIdx(c, r)];
    if (!hz) continue;
    const x = c * T, y = r * T, top = r === 0 || st.hazard[ashIdx(c, r - 1)] !== hz;
    ctx.fillStyle = hz === 'v' ? (top ? '#ff7a2e' : '#e0502a') : (top ? '#4fb9dc' : '#2f8bc0');
    ctx.fillRect(x - 0.5, y + (top ? 6 : 0), T + 1, T - (top ? 6 : 0) + 0.5);
    if (top) {
      const ph = t * (hz === 'v' ? 2 : 3) + c * 1.7;
      ctx.fillStyle = hz === 'v' ? '#ffd27a' : 'rgba(210,240,255,0.95)';
      ctx.beginPath(); ctx.moveTo(x, y + 9);
      for (let i = 0; i <= 6; i++) ctx.lineTo(x + i * 5, y + 6 + Math.sin(ph + i * 0.9) * 1.8);
      ctx.lineTo(x + T, y + 11); ctx.lineTo(x, y + 11); ctx.closePath(); ctx.fill();
      if (hz === 'v' && !reduceMotion) {
        const b = (t * 0.8 + (hash(c, r) % 100) / 100) % 1;
        if (b < 0.5) { ctx.fillStyle = '#ffcf6b'; circle(x + 8 + (hash(r, c) % 14), y + 10 - b * 6, 2 + b * 3); ctx.fill(); }
      }
    }
  }
}
function ashTorch(cp, t, glowOnly) {
  const x = cp.x, y = cp.y;
  if (!glowOnly) {
    ctx.fillStyle = '#7d5230'; rr(x - 3, y - 44, 6, 44, 2); ctx.fill();
    ctx.fillStyle = '#5c3a20'; ctx.fillRect(x - 6, y - 30, 12, 3);
    ctx.fillStyle = cp.lit ? '#c98b5a' : '#8a7a70'; rr(x - 9, y - 52, 18, 10, 4); ctx.fill();
  }
  if (!cp.lit) return;
  const f = reduceMotion ? 0 : Math.sin(t * 13 + x) * 2;
  ctx.fillStyle = 'rgba(255,200,90,0.22)'; circle(x, y - 62, 26 + f); ctx.fill();
  ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.moveTo(x - 8, y - 52); ctx.quadraticCurveTo(x - 9, y - 66, x + f * 0.5, y - 78); ctx.quadraticCurveTo(x + 9, y - 66, x + 8, y - 52); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.moveTo(x - 4, y - 52); ctx.quadraticCurveTo(x - 4, y - 62, x + f * 0.3, y - 69); ctx.quadraticCurveTo(x + 4, y - 62, x + 4, y - 52); ctx.closePath(); ctx.fill();
}
function ashLeverGlow(lv, t) {
  const p = 0.5 + 0.5 * Math.sin(t * 6);
  ctx.fillStyle = 'rgba(255,215,90,' + (0.18 + 0.12 * p) + ')'; circle(lv.x, lv.y - 22, 26); ctx.fill();
}
function ashLeverShape(lv) {
  const x = lv.x, y = lv.y, a = lv.on ? 0.75 * Math.min(1, lv.t / 0.2) : -0.6;
  ctx.fillStyle = '#5c3a20'; rr(x - 13, y - 9, 26, 9, 3); ctx.fill();
  ctx.fillStyle = '#8a5833'; rr(x - 11, y - 11, 22, 5, 2); ctx.fill();
  ctx.save(); ctx.translate(x, y - 8); ctx.rotate(a);
  ctx.strokeStyle = '#d9c7a0'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -30); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = lv.on ? '#5fd17a' : '#e8344e'; circle(0, -32, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; circle(-2, -34, 2.4); ctx.fill();
  ctx.restore();
}
// two glowing footprints on the ground (a trail marker)
function ashPrints(m, a, glow) {
  ctx.save(); ctx.globalAlpha = a;
  if (glow) { ctx.fillStyle = 'rgba(255,215,90,0.28)'; ctx.beginPath(); ctx.ellipse(m.x, m.y - 4, 22, 9, 0, 0, Math.PI * 2); ctx.fill(); }
  const pop = m.found && m.t < 0.3 ? 1 + 0.5 * Math.sin(m.t / 0.3 * Math.PI) : 1;
  for (const [dx, dy, s] of [[-6, -3, 1], [6, -6, -1]]) {
    ctx.save(); ctx.translate(m.x + dx, m.y + dy); ctx.scale(pop, pop);
    ctx.fillStyle = glow ? '#ffd75e' : '#c9a24a';
    ctx.beginPath(); ctx.ellipse(0, 0, 3.6, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 3; k++) { circle(3.5 + k * 0.4, -2.2 + k * 2.2, 0.95); ctx.fill(); }
    ctx.restore();
  }
  ctx.restore();
}
function ashDrawExit(st, t) {
  const e = st.exit;
  if (!e) return;
  const x = e.x, y = e.y, w = e.w, h = e.h, cx = x + w / 2, big = hudBig();
  if (st.exitKind === 'ship') {
    // the rescue ship: hull under the deck, a mast with a striped sail, a cabin door (the exit) and a flag
    const deck = y + h, hx0 = x - 90;
    ctx.fillStyle = '#7a3b2a'; ctx.beginPath(); ctx.moveTo(hx0, deck); ctx.lineTo(W + 4, deck); ctx.lineTo(W + 4, H); ctx.lineTo(hx0 + 26, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5e2c1f'; ctx.fillRect(hx0 + 18, deck + 70, W - hx0, 6);
    ctx.fillStyle = '#f2e6c8'; ctx.fillRect(hx0 + 4, deck + 14, W - hx0, 6);
    ctx.fillStyle = '#2f5f8c'; for (let k = 0; k < 4; k++) { circle(hx0 + 34 + k * 36, deck + 42, 6.5); ctx.fill(); ctx.strokeStyle = '#d9c7a0'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.fillStyle = 'rgba(210,240,255,0.8)';
    for (let k = 0; k < 5; k++) { const wx = hx0 + 20 + k * 30 + Math.sin(t * 2 + k) * 4; ctx.beginPath(); ctx.ellipse(wx, H - 50 + Math.sin(t * 3 + k) * 2, 12, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#8a5230'; ctx.fillRect(hx0, deck - 4, W - hx0, 5);
    ctx.fillStyle = '#7d5230'; ctx.fillRect(x - 46, y - 200, 7, 200 + h);
    const sw = Math.sin(t * 1.5) * 4;
    ctx.fillStyle = '#fff7e6'; ctx.beginPath(); ctx.moveTo(x - 39, y - 190); ctx.quadraticCurveTo(x + 30 + sw, y - 140, x - 39, y - 70); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff6b4a'; ctx.beginPath(); ctx.moveTo(x - 39, y - 160); ctx.quadraticCurveTo(x + 8 + sw, y - 140, x - 39, y - 120); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5b95ff'; ctx.beginPath(); ctx.moveTo(x - 39, y - 200); ctx.lineTo(x - 8, y - 192 + Math.sin(t * 6) * 2); ctx.lineTo(x - 39, y - 184); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c98b5a'; rr(x - 2, y - 8, w + 4, h + 8, 6); ctx.fill();
    ctx.fillStyle = '#8a5833'; rr(x - 6, y - 14, w + 12, 8, 3); ctx.fill();
    ctx.fillStyle = '#fff2c4'; rr(x + 8, y + 6, w - 16, h - 6, 8); ctx.fill();
  } else if (st.exitKind === 'cave') {
    ctx.fillStyle = '#3a2c40'; ctx.beginPath(); ctx.ellipse(cx, y + h, w / 2 + 14, h + 10, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ffd77a'; ctx.globalAlpha = 0.55 + 0.15 * Math.sin(t * 3); ctx.beginPath(); ctx.ellipse(cx, y + h, w / 2 - 2, h - 6, 0, Math.PI, 0); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#5f4b66'; for (const s of [-1, 1]) { circle(cx + s * (w / 2 + 6), y + h - 10, 12); ctx.fill(); }
  } else {
    // a bamboo trail arch with a leafy thatch roof and hanging vines
    ctx.fillStyle = 'rgba(255,236,170,' + (0.22 + 0.08 * Math.sin(t * 3)) + ')'; ctx.beginPath(); ctx.ellipse(cx, y + h - 4, w / 2 + 8, h * 0.75, 0, Math.PI, 0); ctx.fill();
    for (const sx of [x - 2, x + w - 8]) {
      ctx.fillStyle = '#b39d45'; rr(sx, y - 28, 10, h + 28, 4); ctx.fill();
      ctx.fillStyle = '#7f6e2a'; for (let k = 0; k < 3; k++) ctx.fillRect(sx, y - 12 + k * 26, 10, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(sx + 2, y - 24, 2, h + 18);
    }
    ctx.fillStyle = '#8a6a2a'; ctx.beginPath(); ctx.moveTo(x - 16, y - 24); ctx.lineTo(cx, y - 46); ctx.lineTo(x + w + 16, y - 24); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c9a24a'; ctx.beginPath(); ctx.moveTo(x - 12, y - 26); ctx.lineTo(cx, y - 44); ctx.lineTo(x + w + 12, y - 26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3fa45a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const [vx, len] of [[x + 6, 26], [x + w - 4, 18], [cx + 4, 12]]) { ctx.beginPath(); ctx.moveTo(vx, y - 24); ctx.quadraticCurveTo(vx + 5, y - 24 + len / 2, vx - 2, y - 24 + len); ctx.stroke(); }
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#4caf5c'; for (const [lx, ly] of [[x + 4, y + 2], [x + w - 6, y - 6]]) { ctx.beginPath(); ctx.ellipse(lx, ly, 6, 3, 0.6, 0, Math.PI * 2); ctx.fill(); }
  }
  // who is in: two dots
  for (let i = 0; i < 2; i++) {
    const dx = cx + (i === 0 ? -9 : 9), dy = st.exitKind === 'ship' ? y - 24 : st.exitKind === 'cave' ? y - 26 : y - 58;
    circle(dx, dy, big ? 7 : 6);
    if (st.exitIn && st.exitIn[i]) { ctx.fillStyle = PCOL[i]; ctx.fill(); }
    else { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill(); ctx.strokeStyle = PCOL[i]; ctx.lineWidth = 2; ctx.stroke(); }
  }
}
// the ash cloud: a flat fill that really hides what is under thick ash, with fluffy clumps on top for the soft edges
// a sprite is a little cartoon cloud: shaded circles (a darker underside, a light top), drawn at 2x for sharp edges
function ashMakeSprites() {
  ashSprites = [];
  const shapes = [
    [[0, 4, 26], [-20, 10, 17], [20, 9, 19], [-8, -12, 17], [11, -10, 15]],
    [[0, 2, 24], [-22, 6, 15], [19, 12, 18], [6, -14, 18], [-14, -8, 13]],
    [[0, 6, 27], [-18, -4, 16], [21, 2, 16], [-2, -16, 15], [-24, 14, 12], [16, 18, 12]],
  ];
  for (const sh of shapes) {
    const cv = document.createElement('canvas'), S = 128, k = 2;
    cv.width = S; cv.height = S;
    const g = cv.getContext('2d');
    g.scale(k, k);
    for (const [dx, dy, r] of sh) { g.fillStyle = '#857c91'; g.beginPath(); g.arc(32 + dx * 0.95, 32 + dy * 0.95 + 3, r * 0.95, 0, Math.PI * 2); g.fill(); }
    for (const [dx, dy, r] of sh) {
      const ox = 32 + dx * 0.95, oy = 32 + dy * 0.95, rr0 = r * 0.95;
      const gr = g.createRadialGradient(ox - rr0 * 0.35, oy - rr0 * 0.45, rr0 * 0.1, ox, oy, rr0);
      gr.addColorStop(0, '#e4dfe8'); gr.addColorStop(0.6, '#bdb5c6'); gr.addColorStop(1, '#a69eb0');
      g.fillStyle = gr; g.beginPath(); g.arc(ox, oy, rr0 - 1.2, 0, Math.PI * 2); g.fill();
    }
    ashSprites.push(cv);
  }
}
function ashDrawCloud(st, t) {
  if (!ashSprites) ashMakeSprites();
  // the flat base: really hides what is under thick ash (the gaps between the clumps read as shade).
  // One pixel per cell on a tiny canvas, stretched smoothly over the stage, so it has soft edges and no squares;
  // each cell uses the thinnest of itself and its four neighbours, so the base stays inside the clumps
  if (!ashBase) { ashBase = document.createElement('canvas'); ashBase.width = COLS + 2; ashBase.height = ROWS + 2; ashBaseX = ashBase.getContext('2d'); ashBaseImg = ashBaseX.createImageData(COLS + 2, ROWS + 2); }
  const px = ashBaseImg.data, dn = (c, r, d) => (c < 0 || c >= COLS || r < 0 || r >= ROWS ? d : st.dens[ashIdx(c, r)]);
  for (let r = -1; r <= ROWS; r++) for (let c = -1; c <= COLS; c++) {
    const cc = clamp(c, 0, COLS - 1), rc = clamp(r, 0, ROWS - 1), d = st.dens[ashIdx(cc, rc)];   // (the rim copies the edge)
    const m = d < 0.3 ? 0 : Math.min(d, dn(cc - 1, rc, d), dn(cc + 1, rc, d), dn(cc, rc - 1, d), dn(cc, rc + 1, d));
    const k = ((r + 1) * (COLS + 2) + c + 1) * 4;
    px[k] = 0x98; px[k + 1] = 0x90; px[k + 2] = 0xa3; px[k + 3] = m < 0.3 ? 0 : Math.round(clamp(m * 1.6 - 0.6, 0, 1) * 255);
  }
  ashBaseX.putImageData(ashBaseImg, 0, 0);
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
  ctx.drawImage(ashBase, 1, 1, COLS, ROWS, 0, 0, COLS * T, ROWS * T);
  ctx.restore();
  // the fluffy clumps: one per cell, jittered and of mixed sizes so no grid shows; they bob slowly
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const d = st.dens[ashIdx(c, r)];
    if (d < 0.06) continue;
    const h = hash(c * 3 + 1, r * 5 + 7), sp = ashSprites[h % 3], s = (0.62 + ((h >> 3) % 9) * 0.05) * (0.55 + 0.45 * d);
    const bx = reduceMotion ? 0 : Math.sin(t * 0.6 + (h % 50)) * 3, by = reduceMotion ? 0 : Math.cos(t * 0.5 + (h % 31)) * 2;
    const jx = ((h >> 6) % 17) - 8, jy = ((h >> 11) % 13) - 6;
    ctx.globalAlpha = clamp(d * 1.25, 0, 1);
    ctx.drawImage(sp, c * T + 15 - 32 * s + bx + jx, r * T + 15 - 32 * s + by + jy, 64 * s, 64 * s);
  }
  ctx.globalAlpha = 1;
}

/* ---------- on top of the players ---------- */
function ashDrawTop(st) {
  const t = G.clock, big = hudBig(), f = G.players[st.fanner], ld = G.players[st.leader];
  // wind streaks
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineCap = 'round';
  for (const w of st.wind) {
    const a = 1 - w.t / w.life;
    ctx.globalAlpha = a; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.quadraticCurveTo(w.x - w.vx * 0.03, w.y - w.vy * 0.03 + Math.sin(w.ph + w.t * 20) * 5, w.x - w.vx * 0.06, w.y - w.vy * 0.06); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.lineCap = 'butt';
  if (f.alive) ashFanShape(st, f, t);
  if (ld.alive) ashHatShape(st, ld, t);
  // ash clumps falling from the volcano's puff
  for (const cl of st.clumps) {
    ctx.fillStyle = 'rgba(150,140,160,0.35)'; ctx.fillRect(cl.x - 2, cl.y - 40, 4, 30);
    ctx.fillStyle = '#8e8598'; circle(cl.x, cl.y, 10); ctx.fill();
    ctx.fillStyle = '#b9b1c2'; circle(cl.x - 3, cl.y - 3, 5); ctx.fill();
  }
  ashParrot(st, t);
  // "This way!" calls: an arrow over the leader
  for (const c of st.calls) {
    const p = G.players[c.id]; if (!p.alive) continue;
    const a = clamp((ASH.callLife - c.t) / 0.3, 0, 1), s = big ? 1.4 : 1, bob = reduceMotion ? 0 : Math.sin(c.t * 12) * 4;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x + p.w / 2 + c.dir * (30 + bob), p.y - 34 * s); ctx.scale(c.dir * s, s);
    ctx.beginPath(); ctx.moveTo(-14, -5); ctx.lineTo(2, -5); ctx.lineTo(2, -12); ctx.lineTo(16, 0); ctx.lineTo(2, 12); ctx.lineTo(2, 5); ctx.lineTo(-14, 5); ctx.closePath();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fillStyle = PCOL[p.id]; ctx.fill();
    ctx.restore();
    ctx.save(); ctx.globalAlpha = a; bigText('This way!', p.x + p.w / 2, p.y - 62 * (big ? 1.25 : 1), big ? 22 : 16, PCOL[p.id]); ctx.restore();
  }
  // hold-down ring (hop back to camp)
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (!p.alive || P.downT < ASH.hopShow) continue;
    const rs = big ? 1.6 : 1, R = 9 * rs, cx = p.x + p.w / 2, cy = p.y - 10 - R, fr = clamp(P.downT / ASH.hopHold, 0, 1);
    ctx.lineWidth = 3 * rs; ctx.strokeStyle = 'rgba(255,255,255,0.4)'; circle(cx, cy, R); ctx.stroke();
    ctx.strokeStyle = PCOL[p.id]; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fr); ctx.stroke(); ctx.lineCap = 'butt';
  }
  // role badges for the first seconds of a room (boxes: where words are, so the pops can keep clear of them)
  const boxes = [];
  if (G.introT <= 0 && st.roomT < ASH.badgeT + 3.4 + 0.6 && !st.done) {
    const a = clamp((ASH.badgeT + 4 - st.roomT) / 0.6, 0, 1), fs = big ? 19 : 13;
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const bh = fs * 1.85;
    const cpuSeat = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);   // 1-player mode: no keys for the computer
    const tags = [[f, cpuSeat(f.id) ? NAMES[f.id] + ' (computer) fans the ash' : ashHow(f.id) === 'touch' ? 'Hold the fan button!' : 'Hold ' + ashKey(f.id, 'act') + ' to fan the ash'],
      [ld, cpuSeat(ld.id) ? NAMES[ld.id] + ' (computer) leads the way' : ashHow(ld.id) === 'touch' ? 'Lead the way! Tap pull at levers' : 'Lead the way! Press ' + ashKey(ld.id, 'act') + ' at levers']].map(([p, msg]) => {
      const w = ctx.measureText(msg).width + 20;
      return { p, msg, w, x: clamp(p.x + p.w / 2, w / 2 + 4, W - w / 2 - 4), y: p.y - 40 - (big ? 10 : 0) };
    });
    // side by side when they would overlap: the leader's tag goes on top
    const [a0, a1] = tags;
    if (Math.abs(a0.x - a1.x) < (a0.w + a1.w) / 2 + 6 && Math.abs(a0.y - a1.y) < bh + 4) a1.y = Math.min(a1.y, a0.y - bh - 4);
    for (const tg of tags) {
      if (!tg.p.alive || st.bubbles.some(b => b.id === tg.p.id)) continue;
      ctx.fillStyle = 'rgba(28,26,54,0.84)'; rr(tg.x - tg.w / 2, tg.y - fs * 0.92, tg.w, bh, fs * 0.92); ctx.fill();
      boxes.push({ x0: tg.x - tg.w / 2, y0: tg.y - fs * 0.92, x1: tg.x + tg.w / 2, y1: tg.y - fs * 0.92 + bh });
      text(tg.msg, tg.x, tg.y + 0.5, fs, tg.p.id === 0 ? '#ffb39f' : '#a9c6ff', 'center', 'body');
    }
    ctx.restore();
  }
  // hint bubbles
  for (const b of st.bubbles) {
    const p = G.players[b.id]; if (!p.alive) continue;
    const fs = big ? 19 : 13, a = clamp(Math.min(b.t, b.life - b.t) / 0.2, 0, 1);
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(b.s).width + 20, th = fs + (big ? 14 : 10), px = p.x + p.w / 2, x = clamp(px, w / 2 + 4, W - w / 2 - 4);
    let by = Math.max(th + 6, p.y - (b.id === st.leader ? 40 : 20) - (big ? 8 : 0));
    // two players side by side with a hint each: the second bubble stacks above the first (and above any badge)
    const by0 = by;
    for (let pass = 0; pass < 3; pass++) for (const q of boxes) if (x + w / 2 > q.x0 && x - w / 2 < q.x1 && by + 5 > q.y0 && by - th < q.y1) by = q.y0 - 7;
    by = Math.max(th + 6, by);
    // the tail points at its player; a lifted bubble has no tail, so it gets a dot in its player's colour instead
    const lifted = by !== by0, dot = lifted ? th * 0.55 : 0, bw = w + dot, bx0 = clamp(x - bw / 2, 4, W - bw - 4);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = PCOL[b.id]; ctx.lineWidth = 2;
    rr(bx0, by - th, bw, th, th / 2); ctx.fill(); ctx.stroke();
    boxes.push({ x0: bx0, y0: by - th, x1: bx0 + bw, y1: by + 5 });
    if (!lifted) { ctx.beginPath(); ctx.moveTo(px - 5, by - 1); ctx.lineTo(px + 5, by - 1); ctx.lineTo(px, by + 5); ctx.closePath(); ctx.fill(); }
    else { ctx.fillStyle = PCOL[b.id]; circle(bx0 + th * 0.5, by - th / 2, th * 0.2); ctx.fill(); }
    text(b.s, bx0 + dot + bw / 2 - dot / 2, by - th / 2 + 0.5, fs, C.ink, 'center', 'body');
    ctx.restore();
  }
  // pops ("Poof!", "Camp!"): kept on screen, and lifted above any badge, bubble or older pop they would cover
  for (const q of st.pops) {
    const size = q.size * (big ? 1.3 : 1);
    ctx.font = size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const w = ctx.measureText(q.s).width + size * 0.3, h = size * 1.1, x = clamp(q.x, w / 2 + 6, W - w / 2 - 6);
    let y = Math.max(24, q.y - q.t * 30);
    for (let pass = 0; pass < 3; pass++) for (const b of boxes) if (x + w / 2 > b.x0 && x - w / 2 < b.x1 && y + h / 2 > b.y0 && y - h / 2 < b.y1) y = b.y0 - h / 2 - 3;
    y = Math.max(h / 2 + 4, y);
    ctx.globalAlpha = clamp(1.1 - q.t, 0, 1); bigText(q.s, x, y, size, q.col); ctx.globalAlpha = 1;
    boxes.push({ x0: x - w / 2, y0: y - h / 2, x1: x + w / 2, y1: y + h / 2 });   // a newer pop goes above this one
  }
}
// the fanner's big palm-leaf fan, waving while it blows
function ashFanShape(st, p, t) {
  const dir = p.face, on = st.fan.on, hx = p.x + p.w / 2 + dir * 9, hy = p.y + p.h * 0.62;
  const wave = on ? Math.sin(st.fan.ph) * 0.35 : Math.sin(t * 2) * 0.05;
  ctx.save(); ctx.translate(hx, hy); ctx.scale(dir, 1); ctx.rotate(-0.55 + wave);
  ctx.strokeStyle = '#8a5833'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, -8); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.translate(10, -8);
  ctx.fillStyle = on ? '#58c46e' : '#4caf5c'; ctx.strokeStyle = '#2e7f45'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 22, -1.25, 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(30,90,50,0.6)'; ctx.lineWidth = 1.2;
  for (let k = 0; k < 5; k++) { const a = -1.25 + k * 0.46; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 21, Math.sin(a) * 21); ctx.stroke(); }
  ctx.restore();
}
// the leader's explorer hat, with any ash piled on it
function ashHatShape(st, p, t) {
  const cx = p.x + p.w / 2, top = p.y + p.h - p.h * p.sy;
  ctx.fillStyle = '#c9a66b'; ctx.beginPath(); ctx.ellipse(cx, top + 2, 15, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e0c48a'; ctx.beginPath(); ctx.ellipse(cx, top + 1, 9, 8, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#8a5833'; ctx.fillRect(cx - 9, top - 1, 18, 2.5);
  for (let k = 0; k < st.hat; k++) {
    const y = top - 6 - k * 7, w = 12 - k * 2;
    ctx.fillStyle = '#8e8598'; ctx.beginPath(); ctx.ellipse(cx + (k % 2 ? 2 : -2), y, w, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b9b1c2'; circle(cx - 3 + (k % 2 ? 3 : 0), y - 2, 3); ctx.fill();
  }
  if (st.hat >= ASH.hatMax && Math.floor(t * 3) % 2) text('?', cx + 16, top - 10, 16, '#fff', 'center');
}
// the friendly parrot guide
function ashParrot(st, t) {
  const pr = st.parrot, s = hudBig() ? 1.25 : 1, x = pr.x, y = pr.y + (pr.perch && !reduceMotion ? Math.sin(t * 3) * 2 : 0);
  ctx.save(); ctx.translate(x, y); ctx.scale(pr.face * s, s);
  if (pr.gold) { ctx.fillStyle = 'rgba(255,215,90,0.35)'; circle(0, 0, 20); ctx.fill(); }
  ctx.fillStyle = '#3a7fd6'; ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(-20, 12); ctx.lineTo(-17, 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = pr.gold ? C.gold : '#e8344e'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 8, -0.2, 0, Math.PI * 2); ctx.fill();
  circle(7, -7, 6); ctx.fill();
  ctx.fillStyle = '#ffd75e'; ctx.beginPath(); ctx.moveTo(12, -8); ctx.quadraticCurveTo(18, -6, 13, -2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; circle(8, -8, 2.4); ctx.fill(); ctx.fillStyle = C.ink; circle(8.6, -8, 1.2); ctx.fill();
  const fl = pr.perch ? 0.1 : Math.sin(pr.flap) * 0.9;
  ctx.fillStyle = '#3fa45a'; ctx.save(); ctx.translate(-2, -1); ctx.rotate(-0.3 + fl); ctx.beginPath(); ctx.ellipse(-4, 0, 9, 4.5, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  if (pr.perch) { ctx.strokeStyle = '#8a5833'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, 8); ctx.lineTo(-3, 11); ctx.moveTo(3, 8); ctx.lineTo(3, 11); ctx.stroke(); }
  ctx.restore();
  if (pr.squawk > 0) bigText('Squawk!', x, y - 26 * s, hudBig() ? 18 : 13, pr.gold ? C.gold : '#fff');
}

/* ---------- HUD: time, Oops and footprints top right; news top centre ---------- */
function ashHud(st) {
  const big = hudBig(), fs = big ? 20 : 14, h = big ? 40 : 28;
  const found = st.marks.filter(m => m.found).length;
  const parts = [fmtTime(G.time), 'Falls ' + G.falls, found + '/' + st.marks.length];
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const ws = parts.map(s => ctx.measureText(s).width), gap = fs * 1.1, icon = fs * 1.2;
  const w = ws[0] + ws[1] + ws[2] + gap * 2 + icon + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
  let x = x0 + 15;
  text(parts[0], x, cy, fs, C.paper, 'left', 'body'); x += ws[0] + gap;
  text(parts[1], x, cy, fs, G.falls ? '#ffd2a8' : C.paper, 'left', 'body'); x += ws[1] + gap;
  ashPrints({ x: x + icon / 2, y: cy + fs * 0.35, found: false, t: 1 }, 1, false);
  x += icon;
  text(parts[2], x, cy, fs, C.gold, 'left', 'body');
  // the news: gold help, gates and bridges
  const n = st.news;
  if (n && G.mode === 'play') {
    const a = clamp(Math.min(n.t / 0.2, (n.life - n.t) / 0.3), 0, 1), nfs = big ? 20 : 14, nh = big ? 34 : 26;
    ctx.font = '700 ' + nfs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const nw = ctx.measureText(n.s).width + 32, ny = big ? 84 : 14;
    ctx.save(); ctx.globalAlpha = a;
    const px = pill(W / 2, ny, nw, nh, 'center');
    if (n.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(px, ny, nw, nh, nh / 2); ctx.stroke(); }
    text(n.s, W / 2, ny + nh / 2 + 0.5, nfs, n.gold ? C.gold : C.paper, 'center', 'body');
    ctx.restore();
  }
}

/* ---------- sounds ---------- */
Sfx.extra.ashFanOn = function (p) { this.tone(300 * p, 0.12, 'triangle', 0.03, 520 * p); };
Sfx.extra.ashWhoosh = function (p) { this.tone(620 * p, 0.2, 'sawtooth', 0.008, 260 * p); this.tone(180, 0.18, 'triangle', 0.015, 120); };
Sfx.extra.ashPoof = function () { this.tone(500, 0.25, 'sawtooth', 0.025, 120); this.tone(160, 0.3, 'triangle', 0.06, 70, 0.03); [880, 1175].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.035, null, 0.12 + i * 0.06)); };
Sfx.extra.ashGust = function (p) { this.tone(260 * p, 0.35, 'sine', 0.05, 700 * p); };
Sfx.extra.ashGustLand = function () { [659, 880, 1175].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.ashLever = function () { this.tone(140, 0.12, 'square', 0.05, 90); this.tone(620, 0.06, 'triangle', 0.04, null, 0.08); };
Sfx.extra.ashGate = function () { [0, 0.05, 0.1, 0.15].forEach((d, i) => this.tone(520 - i * 60, 0.06, 'square', 0.03, null, d)); };
Sfx.extra.ashPlank = function () { this.tone(300 + Math.random() * 60, 0.05, 'triangle', 0.045, 200); };
Sfx.extra.ashMark = function (p) { this.tone(1175 * p, 0.07, 'triangle', 0.04); this.tone(1568 * p, 0.1, 'triangle', 0.035, null, 0.05); };
Sfx.extra.ashCamp = function () { this.tone(200, 0.25, 'sawtooth', 0.02, 600); [523, 784].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, 0.1 + i * 0.08)); };
Sfx.extra.ashCall = function (p) { this.tone(1400 * p, 0.06, 'square', 0.035, 1900 * p); this.tone(1700 * p, 0.08, 'square', 0.03, 1200 * p, 0.08); };
Sfx.extra.ashOops = function (p) { this.tone(500 * p, 0.25, 'triangle', 0.05, 180 * p); };
Sfx.extra.ashSizzle = function () { this.tone(1400, 0.3, 'sawtooth', 0.016, 300); this.tone(220, 0.2, 'triangle', 0.04, 440, 0.05); };
Sfx.extra.ashPopBack = function (p) { this.tone(400 * p, 0.1, 'triangle', 0.045, 800 * p); };
Sfx.extra.ashHop = function (p) { this.tone(700 * p, 0.12, 'triangle', 0.04, 350 * p); };
Sfx.extra.ashRumble = function () { [0, 0.08, 0.16, 0.24].forEach((d, i) => this.tone(70 - i * 5, 0.1, 'square', 0.035, 50, d)); };
Sfx.extra.ashPlop = function () { this.tone(240, 0.1, 'sine', 0.07, 120); };
Sfx.extra.ashHatOff = function () { this.tone(400, 0.2, 'sawtooth', 0.015, 1200); this.tone(990, 0.08, 'triangle', 0.04, null, 0.12); };
Sfx.extra.ashLucky = function () { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.ashHorn = function () { this.tone(196, 0.6, 'sawtooth', 0.04); this.tone(247, 0.6, 'sawtooth', 0.03, null, 0.05); this.tone(294, 0.7, 'triangle', 0.04, null, 0.65); };
MODES.ash.test = { ASH, ashInCone, ashNextJob, ashNextTarget, ashLeverNear, ashSeeR };
