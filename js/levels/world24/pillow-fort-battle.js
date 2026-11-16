/* Pip & Bo - Level 24-4 Pillow Fort Battle (versus, World 24 Toy Box Town). */
'use strict';

/* ===== 24-4 Pillow Fort Battle (mode 'pillowfort', versus, best of 5, 75 s rounds) =====
   Gavyn's pick: "build up your fort and toss plushies to knock the other one down."
   Side view of a kid's bedroom floor. Pip's fort is on the left (on a peach rug), Bo's on the right (on a blue rug).
   The two rugs meet at a stitched line in the middle: you stay on your own side of it. In the middle stands the open
   toy box. Pip and Bo are the normal platformer bodies (walk, jump, stand on the fort); the mode adds everything else.
   The forts: each fort is 7 columns of soft blocks stacked from the carpet up (at most 8 high): cushions and pillows
   (1 knock each), folded blankets at the bottom (2 knocks) and gold pillows (2 knocks). Blocks are solid: you can
   climb your own fort (every layout starts with steps up from the front). Columns settle: knock a block out and the
   ones above it drop down softly. On top of one column (the teddy column, near the back) sits the fort's teddy bear,
   holding a little flag in the player's colour, tucked in behind a taller shield column (2 blocks higher), so tosses
   can't reach him until the shield is knocked lower: knock the shield down, then wobble the teddy; build it back up
   to keep him safe.
   The toy box: every 3 s (2.5 s after 40 s) it pops out two of the same toy, one onto each side of the line
   ("one for you, one for you"), so both sides always get the same. Toys are plushies (bunny, duck, sock monkey,
   elephant) and building pillows and cushions, plus sometimes the specials below. At most 16 toys lie about: past
   that the oldest one lying still is tidied back into the box (a puff).
   Hands (one toy at a time, carried over your head):
     pick up   walk over a toy with empty hands, or press the action next to one (a bit further reach). Only toys
               on your own side of the line: the other side's toys are theirs.
     ▼         (S / ↓ / stick down / touch ▼) drops what you hold ("Plop!"). It stays down until you step off
               it (or press the action on it).
     plushie   hold the action: a dotted arc shows exactly where it will fly (it rises with the charge, full in
               1.1 s; held 2 s at full it throws itself); let go to toss. You always toss toward the other fort, at a
               steep 58° lob; jumping or standing on your fort throws from higher. You can still walk slowly while
               aiming. A quick tap (under 0.16 s) is an easy lob that aims itself at the top of one of the other
               fort's front columns (a little wobbly), so small kids can just tap. A press made while dizzy or just
               after a toss isn't lost: if you still hold it when you can act again, it counts then.
     pillow    the action puts it on your own fort, at once. A see-through ghost shows where it will go: the column
               you face, else the one you stand in (it goes under you and lifts you up), else the one behind you; on
               top of that column, at most 4 blocks above your feet ("Climb up to build higher!") and 8 high.
               Out of reach: "Bring it to your fort!". You can only build on your own side.
   Hits (your toss passes through your own fort; it stops at the first thing of the other side it touches):
     a block    loses 1 knock (big teddy: 2, and 1 to the block behind it). Out of knocks it pops loose and tumbles
                off softly; the column settles.
     the teddy  "Wobble!": the teddy's wobble goes up 1 (big teddy: 2). A block knocked out from under the teddy also
                wobbles it 1. 5 wobbles (the 5 gold stars over him), or no blocks left under him, and he topples off the fort: that player loses
                the round ("Pip's teddy toppled!"). Building a pillow onto the teddy column slips it under him:
                "Comfy!", one wobble less (but he sits higher). A teddy left alone for 12 s steadies one wobble
                ("Steady!").
     the player "Fwump!": they drop what they hold and are dizzy for 0.75 s (a little bounce back), then 1.4 s safe
                (tosses fly through a safe player). Never hurts.
     the carpet the toy lands and lies there: anyone on that side can pick it up and toss it back.
   Specials (a gold glow while they lie about): the big heavy teddy (a big soft knock, see above, and it lies there to
   be tossed back), the bouncy ball (bounces once off whatever it hits first and keeps going: two knocks for one toss),
   the feather pillow (bursts in a cloud of floating feathers: just for show, it knocks like a plushie and is used up).
   Stuck in a pit inside your own fort (walls 4+ blocks high on both sides)? A jump is a big "Boing!" out.
   The round ends when a teddy topples (the other player wins it; both on the same tick: a tie and a replay). At the
   75 s bell the fort with more blocks standing wins ("Time! Bigger fort!"); forts the same size: the teddy with more
   stars left wins ("the steadier teddy!"); both the same: a tie and the round is replayed. A second tie in a row goes to more blocks knocked this match, then fewer teddy wobbles this match,
   else sudden death (the match framework calls the match after 4 ties in a row).
   Rounds (forts are rebuilt fresh every round): 1 Cosy Castle; rounds 2-4 are Bouncy Ball Day (lots of balls),
   Tall Towers (towers and lots of big teddies) and Feather Frenzy (feather pillows, a low teddy) in shuffled order;
   5 Bedtime Battle (night light on, bigger forts, every kind of toy). A replayed round keeps its look; sudden death is
   Wobbly Teddies (both teddies start on 4 wobbles: one bump and over they go).
   Catch-up help (gold, announced on the round card, on the HUD panel and with a pop at GO; off in sudden death):
     1 round behind:  gold pillows: every building toy the box pops onto your side is a gold pillow (2 knocks).
     2+ rounds behind: also a bigger fort: a gold pillow on top of your 3 front columns at the start.
   Idle: 40 s of live play with no person pressing anything pauses the game (like 11-4).
   Results: Rounds won, Hits (tosses that hit the other fort, teddy or player), Blocks knocked, Blocks built, plus a
   teddy-toppler or builder star line and the Fwump count.
   Soft fails only; nobody gets hurt. Rule randomness only from MODES.pillowfort.rand (Math.random, inside the step);
   looks use pfbVR. Every top-level name is prefixed pfb / PFB, every sound Sfx.extra.pillowfort*. */
const PFB = {
  floorY: 480, line: 480, maxH: 8, cols: 7, reach: 4,
  // the two fort zones: column index i (0 = back by the wall, 6 = front) -> map column
  // throwing
  ang: 58 * Math.PI / 180, v0: 300, v1: 1040, g: 1100, tapT: 0.16, chargeT: 1.1, autoT: 2.0, aimSlow: 0.55, shotR: 9,
  tapJit: 18, tossCD: 0.22,
  // toys
  itemG: 1400, itemR: 11, pickPad: 5, actPick: 34, maxItems: 16, spawnEvery: 3.0, spawnLate: 2.5, lateAt: 40,
  // hits
  dizzy: 0.75, safeT: 1.4, wobMax: 5, tedHitCD: 0.35, steadyT: 12,
  roundTime: 75, idlePause: 40,
};
const PFB_HP = { c: 1, p: 1, b: 2, g: 2 };
const PFB_ROUNDS = {
  castle: { name: 'Cosy Castle', hint: 'Toss plushies at their fort! Bring pillows home to build yours up.', h: [2, 3, 3, 5, 3, 2, 1], ted: 2,
    mix: { plush: 0.52, block: 0.38, teddy: 0.04, ball: 0.03, feather: 0.03 } },
  bouncy: { name: 'Bouncy Ball Day', hint: 'Bouncy balls bounce once: two knocks for one toss!', h: [3, 3, 2, 4, 4, 2, 1], ted: 2,
    mix: { plush: 0.36, block: 0.36, ball: 0.22, teddy: 0.03, feather: 0.03 } },
  towers: { name: 'Tall Towers', hint: 'Big heavy teddies knock two blocks! Your teddy hides between the towers.', h: [3, 6, 3, 5, 2, 3, 1], ted: 2,
    mix: { plush: 0.4, block: 0.36, teddy: 0.17, ball: 0.035, feather: 0.035 } },
  feather: { name: 'Feather Frenzy', hint: 'Feather pillows go POOF! Put a pillow under your teddy to calm him.', h: [3, 2, 2, 4, 3, 2, 2], ted: 2,
    mix: { plush: 0.36, block: 0.38, feather: 0.2, teddy: 0.03, ball: 0.03 } },
  bedtime: { name: 'Bedtime Battle', hint: 'Night light on! Bigger forts and every kind of toy.', h: [3, 4, 4, 6, 4, 3, 2], ted: 2, night: true,
    mix: { plush: 0.38, block: 0.34, teddy: 0.1, ball: 0.1, feather: 0.08 } },
  sudden: { name: 'Wobbly Teddies', hint: 'Sudden death! Both teddies are wobbly: one bump and over they go!', h: [2, 3, 3, 5, 3, 2, 1], ted: 2, wob: 4,
    mix: { plush: 0.55, block: 0.3, teddy: 0.05, ball: 0.05, feather: 0.05 } },
};
const PFB_MIDDLE = ['bouncy', 'towers', 'feather'];
const PFB_PLUSH = ['bunny', 'duck', 'monkey', 'elephant'];
// cushion colours: warm on Pip's side, cool on Bo's
const PFB_COLS = [['#ffb38a', '#ffd36b', '#ff8fa8', '#ffc9a3', '#f7a7c8'], ['#8ec5ff', '#9be3d0', '#c3a8f5', '#a7d8ff', '#b8f0c8']];
const PFB_INK = 'rgba(28,26,54,';
// looks-only randomness (fluff, feathers, wiggles): never MODES.pillowfort.rand
let pfbVS = 20261124;
const pfbVR = () => { pfbVS = (Math.imul(pfbVS, 1664525) + 1013904223) >>> 0; return pfbVS / 4294967296; };
const pfbCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
const pfbDir = k => (k === 0 ? 1 : -1);                         // the way player k tosses
const pfbColOf = (k, i) => (k === 0 ? 1 + i : 30 - i);         // fort column index -> map column
const pfbIdx = (k, c) => { const i = k === 0 ? c - 1 : 30 - c; return i >= 0 && i < PFB.cols ? i : -1; };
const pfbIsBlock = t => t === 'cushion' || t === 'pillow' || t === 'gold';
const pfbBlockKind = t => (t === 'gold' ? 'g' : t === 'pillow' ? 'p' : 'c');
const pfbTopY = (k, i) => PFB.floorY - G.mst.fort[k][i].length * T; // the top of a column (where the next block's bottom goes)
const pfbMine = (k, it) => (k === 0 ? it.x < PFB.line : it.x > PFB.line); // a toy on player k's own side of the line
const pfbName = t => ({ plush: 'Plushie', teddy: 'Big teddy', ball: 'Bouncy ball', feather: 'Feather pillow', cushion: 'Cushion', pillow: 'Pillow', gold: 'Gold pillow' }[t] || 'Toy');

/* ---------- the forts ---------- */
function pfbBlock(kind, k, n) {
  return { kind, hp: PFB_HP[kind], max: PFB_HP[kind], col: PFB_COLS[k][((n * 7 + k * 3) >>> 0) % 5], dropY: 0, squish: 0, wob: 0, pop: 0 };
}
// rebuild both forts for this round's layout (with a gold top row for a player 2+ rounds behind)
function pfbBuildForts(st, lay) {
  st.fort = [[], []]; st.ted = [];
  for (const k of [0, 1]) {
    for (let i = 0; i < PFB.cols; i++) {
      const col = [];
      // folded blankets (2 knocks) along the bottom and on top of the teddy's shield column
      for (let j = 0; j < lay.h[i]; j++) col.push(pfbBlock((j === 0 && lay.h[i] >= 3) || (i === lay.ted + 1 && j >= lay.h[i] - 2) ? 'b' : (i + j) % 2 ? 'p' : 'c', k, i * 3 + j));
      if (st.gold[k] >= 2 && i >= PFB.cols - 3) col.push(pfbBlock('g', k, i * 3 + 9));
      st.fort[k].push(col);
    }
    st.ted.push({ i: lay.ted, wob: lay.wob || 0, hitT: 9, fallen: false, fx: 0, fy: 0, fvx: 0, fvy: 0, rot: 0, vy: 0, lift: 0, shake: 0, comfy: 0 });
  }
  pfbSync(st);
}
// the fort blocks are 'P' tiles in the level grid, so Pip and Bo can stand and climb on them
function pfbSync(st) {
  const L = G.level;
  for (const k of [0, 1]) for (let i = 0; i < PFB.cols; i++) {
    const c = pfbColOf(k, i), h = st.fort[k][i].length;
    for (let j = 0; j < PFB.maxH; j++) { const r = 15 - j; L.grid[r][c] = j < h ? 'P' : '.'; }
  }
}
const pfbCount = (st, k) => st.fort[k].reduce((a, c) => a + c.length, 0);
// a block of fort k (column i, height j) lost knocks; out of knocks it tumbles off and the column settles
function pfbHitBlock(st, k, i, j, dmg, by, dir) {
  const col = st.fort[k][i], b = col[j];
  if (!b) return false;
  b.hp -= dmg; b.squish = 1; b.wob = 1;
  const cx = pfbColOf(k, i) * T + T / 2, cy = PFB.floorY - j * T - T / 2;
  if (b.hp > 0) { pfbPop(st, 'Squish!', cx, cy - 18, '#ffffff'); Sfx.play('pillowfortThump', by); return false; }
  col.splice(j, 1);
  for (let n = j; n < col.length; n++) col[n].dropY += T;   // drawn where they were, they settle down softly
  st.tumbles.push({ kind: b.kind, col: b.col, x: cx, y: cy, vx: dir * (90 + pfbVR() * 120), vy: -260 - pfbVR() * 140, rot: 0, vr: dir * (4 + pfbVR() * 4), life: 1.3 });
  for (let n = 0; n < 6; n++) pfbFx(st, cx, cy, (pfbVR() - 0.5) * 160, -60 - pfbVR() * 120, 0.8, '#ffffff', 3 + pfbVR() * 3, 200, 'fluff');
  if (by >= 0) st.stat.knocked[by]++;
  Sfx.play('pillowfortKnock', by < 0 ? 0 : by); rumble(k, 0.1, 0.3, 80);
  pfbSync(st);
  // under the teddy: he wobbles (and with no blocks left he's on the carpet: toppled)
  const td = st.ted[k];
  if (i === td.i && !td.fallen) {
    td.lift += T;
    if (!col.length) pfbTopple(st, k, by, dir);
    else pfbWobble(st, k, 1, by, dir);
  }
  // toys lying on top of that column drop with it (they fall by themselves); a player standing there falls too
  return true;
}
function pfbWobble(st, k, n, by, dir) {
  const td = st.ted[k];
  if (td.fallen) return;
  td.wob = Math.min(PFB.wobMax, td.wob + n); td.shake = 1; td.hitT = 0;
  if (by >= 0) st.stat.wobbles[by] += n;
  st.matchWob[k] += n;
  const x = pfbColOf(k, td.i) * T + T / 2, y = pfbTopY(k, td.i) - 50;
  if (td.wob >= PFB.wobMax) { pfbTopple(st, k, by, dir); return; }
  pfbPop(st, td.wob >= PFB.wobMax - 1 ? 'Wobble! Wobble!' : 'Wobble!', x, y, td.wob >= PFB.wobMax - 1 ? '#ffd0d8' : '#ffffff');
  Sfx.play('pillowfortWobble', k); rumble(k, 0.2, 0.4, 120);
}
function pfbTopple(st, k, by, dir) {
  const td = st.ted[k];
  if (td.fallen) return;
  td.fallen = true; td.wob = PFB.wobMax;
  td.fx = pfbColOf(k, td.i) * T + T / 2; td.fy = pfbTopY(k, td.i);
  td.fvx = (dir || -pfbDir(k)) * 150; td.fvy = -320; td.rot = 0;
  if (by >= 0 && by !== k) st.stat.topples[by]++;
  st.toppled.push(k);
  Sfx.play('pillowfortTopple', k); rumble(k, 0.5, 0.6, 300);
  pfbPop(st, 'Toppled!', td.fx, td.fy - 60, '#ffd0d8');
}

/* ---------- toys, tosses and building ---------- */
function pfbItem(st, t, x, y, vx, vy) {
  const it = { id: st.nid++, t, v: t === 'plush' ? PFB_PLUSH[Math.floor(MODES.pillowfort.rand() * 4)] : '', x, y, vx, vy, rest: false, age: 0, spin: 0 };
  st.items.push(it);
  return it;
}
const pfbSolidAt = (x, y) => { const ch = tile(Math.floor(x / T), Math.floor(y / T)); return ch === '#' || ch === 'P'; };
// a toy lying about: gravity, the carpet, fort tops, the walls (it can never cross into the wall columns)
function pfbItemStep(it, dt) {
  const r = PFB.itemR;
  it.age += dt;
  // pushed up out of a block that appeared under it (a pillow put down, a column refilled)
  let guard = 0;
  while (pfbSolidAt(it.x, it.y + r - 1) && pfbSolidAt(it.x, it.y) && guard++ < 10) { it.y = Math.floor(it.y / T) * T - r; it.vy = Math.min(0, it.vy); }
  if (it.rest) {
    if (!pfbSolidAt(it.x, it.y + r + 1)) it.rest = false;   // its column was knocked away: it falls
    else return;
  }
  it.vy = Math.min(900, it.vy + PFB.itemG * dt);
  let nx = it.x + it.vx * dt;
  if (pfbSolidAt(nx + Math.sign(it.vx) * r, it.y)) { it.vx *= -0.35; nx = it.x; }
  it.x = clamp(nx, T + r, W - T - r);
  const ny = it.y + it.vy * dt;
  if (it.vy > 0 && pfbSolidAt(it.x, ny + r)) {
    it.y = Math.floor((ny + r) / T) * T - r;
    if (it.vy > 220) { it.vy *= -0.32; it.vx *= 0.6; } else { it.vy = 0; it.vx = 0; it.rest = true; }
  } else it.y = ny;
  it.spin += it.vx * dt * 0.05;
}
// where and how fast a toss leaves the hands (power 0..1)
function pfbLaunch(p, power, aim) {
  const k = p.id, d = pfbDir(k), x = p.x + p.w / 2 + d * 6, y = p.y - 6;
  let v = PFB.v0 + (PFB.v1 - PFB.v0) * clamp(power, 0, 1);
  if (aim) v = aim;
  return { x, y, vx: d * v * Math.cos(PFB.ang), vy: -v * Math.sin(PFB.ang), v };
}
// the speed a 58° lob needs from (x0, y0) to land on (x1, y1) (or null)
function pfbSolveV(x0, y0, x1, y1) {
  const dx = Math.abs(x1 - x0), dy = y1 - y0, c = Math.cos(PFB.ang), den = 2 * c * c * (dy + dx * Math.tan(PFB.ang));
  if (dx < 4 || den <= 0) return null;
  return Math.sqrt(PFB.g * dx * dx / den);
}
// what a toss by player k at (x, y) touches now: { kind: 'ted'|'pl'|'block'|'floor'|'wall', i, j } or null
function pfbTouch(st, k, x, y, r, skipPlayer) {
  const o = 1 - k;
  if (x < T + r || x > W - T - r) return { kind: 'wall' };
  if (y + r >= PFB.floorY) return { kind: 'floor' };
  const td = st.ted[o];
  if (!td.fallen) {
    const tx = pfbColOf(o, td.i) * T + T / 2, ty = pfbTopY(o, td.i);
    if (pfbCircRect(x, y, r, tx - 12, ty - 34, 24, 34)) return { kind: 'ted' };
  }
  if (!skipPlayer && !(st.pl[o].safe > 0)) {   // a player still safe after a Fwump: tosses fly through them
    const q = G.players[o];
    if (q && q.alive && pfbCircRect(x, y, r, q.x, q.y, q.w, q.h)) return { kind: 'pl' };
  }
  // the other fort's blocks (the nearest one the ball overlaps)
  const c0 = Math.floor((x - r) / T), c1 = Math.floor((x + r) / T);
  let best = null, bd = 1e9;
  for (let c = c0; c <= c1; c++) {
    const i = pfbIdx(o, c); if (i < 0) continue;
    const h = st.fort[o][i].length;
    for (let j = 0; j < h; j++) {
      const by = PFB.floorY - (j + 1) * T;
      if (pfbCircRect(x, y, r, c * T, by, T, T)) { const d = Math.hypot(x - (c * T + 15), y - (by + 15)); if (d < bd) { bd = d; best = { kind: 'block', i, j }; } }
    }
  }
  return best;
}
const pfbCircRect = (cx, cy, r, x, y, w, h) => { const nx = clamp(cx, x, x + w), ny = clamp(cy, y, y + h); return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) < r * r; };
// the flight of a toss, integrated exactly like the game, to the first thing it touches (players not counted)
function pfbPath(st, k, l, maxT = 2.6, every = 1) {
  const b = { x: l.x, y: l.y, vx: l.vx, vy: l.vy }, pts = [], n = Math.ceil(maxT / DT);
  for (let s = 1; s <= n; s++) {
    b.vy += PFB.g * DT; b.x += b.vx * DT; b.y += b.vy * DT;
    const hit = pfbTouch(st, k, b.x, b.y, PFB.shotR, true);
    if (hit || s % every === 0) pts.push({ x: b.x, y: b.y, t: s * DT, hit });
    if (hit) break;
  }
  return pts;
}
// a quick tap: an easy lob that aims itself at the top of one of the other fort's front columns (a little wobbly)
function pfbTapAim(st, p) {
  const k = p.id, o = 1 - k, R = () => MODES.pillowfort.rand(), l = pfbLaunch(p, 0.5);
  const cand = [];
  for (let i = PFB.cols - 1; i >= 0 && cand.length < 3; i--) if (st.fort[o][i].length) cand.push(i);
  let tx, ty;
  if (cand.length) { const i = cand[Math.floor(R() * cand.length)]; tx = pfbColOf(o, i) * T + T / 2; ty = pfbTopY(o, i) + 4; }
  else { const td = st.ted[o]; tx = pfbColOf(o, td.i) * T + T / 2; ty = PFB.floorY - 10; }
  tx += (R() * 2 - 1) * PFB.tapJit;
  const v = pfbSolveV(l.x, l.y, tx, ty);
  return v ? clamp(v, PFB.v0, PFB.v1) : PFB.v0 + (PFB.v1 - PFB.v0) * 0.6;
}
function pfbToss(st, p, power, tap) {
  const k = p.id, s = st.pl[k], it = s.hold;
  const l = pfbLaunch(p, power, tap ? pfbTapAim(st, p) : 0);
  st.shots.push({ t: it.t, v: it.v, k, x: l.x, y: l.y, vx: l.vx, vy: l.vy, bounces: it.t === 'ball' ? 1 : 0, age: 0, spin: 0, trail: [], hitSet: {} });
  s.hold = null; s.aim = false; s.holdT = 0; s.cd = PFB.tossCD;
  st.stat.throws[k]++;
  Sfx.play(it.t === 'teddy' ? 'pillowfortHeavy' : 'pillowfortToss', k);
  p.sx = 1.15; p.sy = 0.88;
}
// a toss touched something of the other side
function pfbShotHit(st, b, hit) {
  const k = b.k, o = 1 - k, d = Math.sign(b.vx) || pfbDir(k);
  let counted = false;
  if (hit.kind === 'ted') {
    const td = st.ted[o];
    if (td.hitT > PFB.tedHitCD) { pfbWobble(st, o, b.t === 'teddy' ? 2 : 1, k, d); counted = true; st.stat.direct[k]++; }
  } else if (hit.kind === 'pl') {
    // (pfbTouch never returns a player who is still safe from the last Fwump)
    const q = G.players[o], s = st.pl[o];
    pfbDrop(st, q, true);
    knock(q, d * 170, -180, PFB.dizzy, 0.3);
    s.dizzy = PFB.dizzy; s.safe = PFB.safeT; s.aim = false; s.holdT = 0;
    st.stat.fwumps[k]++; counted = true;
    pfbPop(st, 'Fwump!', q.x + q.w / 2, q.y - 20, '#ffffff');
    Sfx.play('pillowfortFwump', o); rumble(o, 0.5, 0.4, 140);
    for (let n = 0; n < 8; n++) pfbFx(st, b.x, b.y, (pfbVR() - 0.5) * 200, -pfbVR() * 160, 0.6, n % 2 ? '#ffffff' : PCOL[o], 3, 200, 'fluff');
  } else if (hit.kind === 'block') {
    pfbHitBlock(st, o, hit.i, hit.j, b.t === 'teddy' ? 2 : 1, k, d);
    if (b.t === 'teddy') { // the big teddy's knock goes on into the block behind
      const i2 = hit.i - 1;
      if (i2 >= 0 && st.fort[o][i2][hit.j]) pfbHitBlock(st, o, i2, hit.j, 1, k, d);
      pfbPop(st, 'BIG knock!', b.x, b.y - 26, C.gold);
      if (!reduceMotion) G.shake = Math.max(G.shake, 0.12);
    }
    counted = true;
  }
  if (counted) { st.stat.hits[k]++; if (b.t === 'feather') pfbFeathers(st, b.x, b.y); }
  // a bouncy ball bounces once off the first thing and flies on
  if (b.bounces > 0 && hit.kind !== 'wall') {
    b.bounces--;
    b.vy = -Math.abs(b.vy) * 0.62 - 120; b.vx = hit.kind === 'floor' ? b.vx * 0.85 : -b.vx * 0.35 + d * 60;
    if (hit.kind === 'floor') b.y = PFB.floorY - PFB.shotR - 1;
    b.immT = 0.12;
    Sfx.play('pillowfortBoing', k);
    pfbPop(st, 'Boing!', b.x, b.y - 16, '#ffe9a8');
    return false;
  }
  if (b.t === 'feather') { if (!counted) pfbFeathers(st, b.x, b.y); return true; }   // used up in a cloud of feathers
  // otherwise the toy drops and lies there for anyone to toss back
  const it = pfbItem(st, b.t, clamp(b.x, T + PFB.itemR, W - T - PFB.itemR), Math.min(b.y, PFB.floorY - PFB.itemR - 1),
    hit.kind === 'floor' ? b.vx * 0.25 : -b.vx * 0.12, hit.kind === 'floor' ? -Math.abs(b.vy) * 0.25 : -120);
  it.v = b.v || it.v;
  if (hit.kind === 'floor' || hit.kind === 'wall') Sfx.play('pillowfortPlop', k);
  return true;
}
function pfbFeathers(st, x, y) {
  for (let n = 0; n < 18; n++) pfbFx(st, x, y, (pfbVR() - 0.5) * 260, -40 - pfbVR() * 200, 2.6 + pfbVR() * 1.2, '#ffffff', 5 + pfbVR() * 3, 0, 'feather');
  pfbPop(st, 'POOF!', x, y - 24, '#ffffff');
  Sfx.play('pillowfortFeather');
}
function pfbShots(st, dt) {
  for (const b of st.shots) {
    if (b.dead) continue;
    b.age += dt; b.spin += dt * 9 * Math.sign(b.vx || 1);
    b.vy += PFB.g * dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.immT > 0) b.immT -= dt;
    if ((st.tick & 1) === 0) { b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 4) b.trail.shift(); }
    if (b.age > 4 || b.y > H + 40) { b.dead = true; continue; }
    if (b.immT > 0) continue;
    const hit = pfbTouch(st, b.k, b.x, b.y, PFB.shotR, false);
    if (hit) {
      if (hit.kind === 'wall') { b.vx = -b.vx * 0.4; b.x = clamp(b.x, T + PFB.shotR + 1, W - T - PFB.shotR - 1); continue; }
      if (pfbShotHit(st, b, hit)) b.dead = true;
    }
  }
  st.shots = st.shots.filter(b => !b.dead);
}
// a toy in hand drops (▼, or a Fwump knocks it out of your hands)
function pfbDrop(st, p, knocked) {
  const s = st.pl[p.id];
  if (!s.hold) return;
  const it = pfbItem(st, s.hold.t, clamp(p.x + p.w / 2, T + PFB.itemR, W - T - PFB.itemR), p.y - 4, knocked ? -pfbDir(p.id) * 70 : p.face * 40, knocked ? -260 : -120);
  it.v = s.hold.v || it.v;
  s.hold = null; s.aim = false; s.holdT = 0; s.pickCd = knocked ? 0.6 : 0.45; s.dropped = it.id;
  if (!knocked) Sfx.play('pillowfortPlop', p.id);
}
function pfbPick(st, p, it) {
  const s = st.pl[p.id];
  s.hold = { t: it.t, v: it.v }; it.dead = true; s.pickT = 0;
  st.items = st.items.filter(x => x !== it);
  Sfx.play(pfbIsBlock(it.t) ? 'pillowfortPickSoft' : 'pillowfortPick', p.id);
  p.sx = 0.9; p.sy = 1.12;
  if (pfbCpu(p.id)) return;
  // a first-time hint over a person: what to do with it
  const kk = pfbKeys(p.id);
  if (pfbIsBlock(it.t) && st.hint[p.id].b < 2) { st.hint[p.id].b++; pfbSay(st, p.id, kk.touch ? 'Tap at your fort to build!' : kk.act + ' at your fort to build!'); }
  else if (!pfbIsBlock(it.t) && st.hint[p.id].t < 2) { st.hint[p.id].t++; pfbSay(st, p.id, kk.touch ? 'Hold to aim, let go to toss!' : 'Hold ' + kk.act + ' to aim, let go to toss!'); }
}
// where a pillow would go now: { i, j, c, top, lift } or { why } (never on the other side)
function pfbPlaceSpot(st, p) {
  const k = p.id, cx = p.x + p.w / 2, pc = Math.floor(cx / T), f = p.face || pfbDir(k), feet = p.y + p.h;
  let why = 'far';
  for (const c of [pc + f, pc, pc - f]) {
    const i = pfbIdx(k, c); if (i < 0) continue;
    const j = st.fort[k][i].length;
    if (j >= PFB.maxH) { why = 'full'; continue; }
    const top = PFB.floorY - (j + 1) * T;
    if (feet - top > PFB.reach * T + 2) { why = 'high'; continue; }
    let lift = 0;
    if (p.x < c * T + T && p.x + p.w > c * T && p.y < top + T && p.y + p.h > top) {
      // it goes under you: you're lifted on top of it, if there's room up there
      const ny = top - p.h;
      let ok = true;
      for (let ty = Math.floor(ny / T); ty <= Math.floor((ny + p.h - 0.01) / T); ty++) for (let tx = Math.floor(p.x / T); tx <= Math.floor((p.x + p.w - 0.01) / T); tx++) {
        if (tx === c && ty === Math.floor(top / T)) continue;
        const ch = tile(tx, ty); if (ch === '#' || ch === 'P') ok = false;
      }
      if (!ok) { why = 'room'; continue; }
      lift = p.y - ny;
    }
    return { i, j, c, top, lift };
  }
  return { why };
}
function pfbPlace(st, p) {
  const k = p.id, s = st.pl[k], sp = pfbPlaceSpot(st, p);
  if (sp.why) {
    const msg = sp.why === 'high' ? 'Climb up to build higher!' : sp.why === 'full' ? 'Tall enough there!' : sp.why === 'room' ? 'No room!' : 'Bring it to your fort!';
    pfbSay(st, k, msg);
    Sfx.play('pillowfortNope', k);
    return false;
  }
  const b = pfbBlock(pfbBlockKind(s.hold.t), k, st.stat.built[k] + 31);
  b.fromX = p.x + p.w / 2; b.fromY = p.y - 12; b.place = 0;
  st.fort[k][sp.i].push(b);
  pfbSync(st);
  if (sp.lift > 0) { p.y -= sp.lift; p.vy = Math.min(p.vy, 0); }
  s.hold = null; s.cd = 0.18;
  st.stat.built[k]++;
  Sfx.play('pillowfortPlace', k);
  const td = st.ted[k];
  if (sp.i === td.i && !td.fallen) {
    td.lift -= T;
    if (td.wob > 0 && !st.lay.wob) { td.wob--; td.comfy = 1; pfbPop(st, 'Comfy!', sp.c * T + 15, sp.top - 50, '#c8ffd8'); Sfx.play('pillowfortComfy', k); }
    else if (td.wob > 0 && st.lay.wob) { pfbPop(st, 'Still wobbly!', sp.c * T + 15, sp.top - 50, '#ffffff'); }
  }
  return true;
}

/* ---------- the toy box ---------- */
function pfbPickType(st) {
  const R = MODES.pillowfort.rand(), mix = st.lay.mix;
  let a = 0;
  for (const t of ['plush', 'block', 'teddy', 'ball', 'feather']) { a += mix[t] || 0; if (R < a) return t; }
  return 'plush';
}
function pfbSpawn(st) {
  let t = pfbPickType(st);
  if (t === 'block') t = MODES.pillowfort.rand() < 0.5 ? 'cushion' : 'pillow';
  const d = 70 + MODES.pillowfort.rand() * 105, fly = 0.75;
  // tidy up: too many toys lying about, the oldest still ones go back in the box
  while (st.items.length + 2 > PFB.maxItems) {
    const old = st.items.filter(x => x.rest).sort((a, b) => b.age - a.age)[0] || st.items[0];
    if (!old) break;
    pfbFx(st, old.x, old.y, 0, -40, 0.6, '#ffffff', 8, 0, 'fluff');
    st.items = st.items.filter(x => x !== old);
  }
  for (const k of [0, 1]) {
    const tt = pfbIsBlock(t) && st.gold[k] >= 1 ? 'gold' : t;
    const x0 = PFB.line + (k ? 8 : -8), y0 = PFB.floorY - 56, x1 = PFB.line + (k ? d : -d);
    const it = pfbItem(st, tt, x0, y0, (x1 - x0) / fly, -(PFB.itemG * fly) / 2 + 30);
    if (k === 1 && st.items.length > 1) it.v = st.items[st.items.length - 2].v; // the same plushie on both sides
  }
  st.boxPop = 1;
  Sfx.play(t === 'teddy' || t === 'ball' || t === 'feather' ? 'pillowfortSpecial' : 'pillowfortSpawn');
}

/* ---------- the tick ---------- */
function pfbPlayerState() {
  return { hold: null, aim: false, holdT: 0, charge: 0, cd: 0, dizzy: 0, safe: 0, pickCd: 0, pickT: 9, dropped: -1, prevDown: true, boing: false, say: 0, bubble: null, ghost: null, buf: false };
}
function pfbPre(st, dt) {
  for (const p of G.players) {
    const k = p.id, s = st.pl[k];
    s.cd = Math.max(0, s.cd - dt); s.safe = Math.max(0, s.safe - dt); s.dizzy = Math.max(0, s.dizzy - dt); s.pickCd = Math.max(0, s.pickCd - dt);
    const busy = !p.alive || p.stun > 0;
    // ▼ drops what you hold (a fresh press)
    const dn = !!p.input.down;
    if (dn && !s.prevDown && s.hold && !busy && !s.aim) pfbDrop(st, p, false);
    s.prevDown = dn;
    // a press while dizzy or just after a toss isn't lost: still held when you can act again, it counts then
    let press = p.pendingAct;
    p.pendingAct = false;
    if (press && (busy || s.cd > 0)) s.buf = true;
    if (s.buf && !p.input.act) s.buf = false;
    if (s.buf && !busy && s.cd <= 0) { s.buf = false; press = true; }
    if (press) {
      if (!busy && s.cd <= 0) {
        if (!s.hold) {
          // grab the nearest toy in reach
          const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
          let best = null, bd = PFB.actPick + PFB.itemR;
          for (const it of st.items) { if (!pfbMine(k, it)) continue; const d = Math.hypot(it.x - cx, it.y - cy); if (d < bd) { bd = d; best = it; } }
          if (best) pfbPick(st, p, best);
        } else if (pfbIsBlock(s.hold.t)) pfbPlace(st, p);
        else { s.aim = true; s.holdT = 0; s.charge = 0; s.tickT = 0; }
      }
    }
    if (s.aim) {
      if (busy || !s.hold) { s.aim = false; s.holdT = 0; }
      else {
        s.holdT += dt;
        s.charge = s.holdT < PFB.tapT ? 0 : clamp((s.holdT - PFB.tapT) / PFB.chargeT, 0, 1);
        if (s.charge > 0 && s.charge < 1) { s.tickT -= dt; if (s.tickT <= 0) { s.tickT = 0.1; Sfx.tone((330 + 420 * s.charge) * (k ? 0.84 : 1), 0.04, 'triangle', 0.02); } }
        if (!p.input.act) pfbToss(st, p, s.charge, s.holdT < PFB.tapT);
        else if (s.holdT >= PFB.tapT + PFB.chargeT + PFB.autoT) pfbToss(st, p, 1, false);
      }
    }
  }
}
// how many blocks stand on each side of x in this column... (the pit check for the "Boing!" jump)
function pfbWallUp(cx, feetRow) {
  let n = 0;
  for (let ty = feetRow; ty >= 0 && n < 12; ty--) { const ch = tile(cx, ty); if (ch === '#' || ch === 'P') n++; else break; }
  return n;
}
function pfbStep(st, dt) {
  st.t += dt; st.rt += dt; st.tick++;
  for (const p of G.players) {
    const k = p.id, s = st.pl[k];
    if (!p.alive) continue;
    // stay on your own side of the rug line
    if (k === 0 && p.x + p.w > PFB.line - 4) { p.x = PFB.line - 4 - p.w; if (p.vx > 0) p.vx = 0; }
    if (k === 1 && p.x < PFB.line + 4) { p.x = PFB.line + 4; if (p.vx < 0) p.vx = 0; }
    if (s.aim && p.knockT <= 0) { const lim = PHYS.maxRun * PFB.aimSlow; p.vx = clamp(p.vx, -lim, lim); }
    // a pit in your fort: the jump out is a big Boing!
    if (p.grounded) s.boing = false;
    else if (!s.boing && p.vy < -PHYS.jumpV + 60 && p.vy > -PHYS.jumpV - 5) {
      s.boing = true;
      const feetRow = Math.floor((p.y + p.h - 2) / T), cc = Math.floor((p.x + p.w / 2) / T);
      // (the nearest wall on each side, across up to 4 columns of pit floor: a pit 2 or more wide used to get no Boing, and
      // a player could wall themselves in behind their own shield for the rest of the round)
      const wall = d => { for (let i = 1; i <= 5; i++) { const n = pfbWallUp(cc + d * i, feetRow); if (n) return n; } return 0; };
      const hl = wall(-1), hr = wall(1);
      const need = Math.min(hl, hr);
      if (need >= 4 && need < 12) {
        p.vy = -Math.sqrt(2 * PHYS.g * (need + 0.8) * T);
        pfbPop(st, 'Boing!', p.x + p.w / 2, p.y - 18, '#ffe9a8'); Sfx.play('pillowfortBoing', k);
      }
    }
    // walk over a toy with empty hands: picked up
    if (!s.hold && s.pickCd <= 0 && p.stun <= 0) {
      let onDropped = false;
      for (const it of st.items) {
        if (it.dead || (it.vy < -60 && !it.rest) || !pfbMine(k, it)) continue;
        if (pfbCircRect(it.x, it.y, PFB.itemR, p.x - PFB.pickPad, p.y - PFB.pickPad, p.w + 2 * PFB.pickPad, p.h + 2 * PFB.pickPad)) {
          // the toy you just dropped with ▼ stays down until you step off it (the action still picks it up)
          if (it.id === s.dropped) { onDropped = true; continue; }
          pfbPick(st, p, it); break;
        }
      }
      if (!onDropped && !s.hold) s.dropped = -1;
    }
    s.ghost = s.hold && pfbIsBlock(s.hold.t) ? pfbPlaceSpot(st, p) : null;
  }
  pfbShots(st, dt);
  for (const it of st.items) pfbItemStep(it, dt);
  // the toy box
  st.spawnT -= dt;
  if (st.spawnT <= 0) { st.spawnT += st.rt > PFB.lateAt ? PFB.spawnLate : PFB.spawnEvery; pfbSpawn(st); }
  pfbTedStep(st, dt, true);
  // the round is decided by a toppled teddy
  if (st.toppled.length && !st.ended) {
    st.ended = true;
    if (st.toppled.length >= 2 && st.toppled[0] !== st.toppled[1]) matchRoundEnd(-1, 'Both teddies toppled!');
    else { const l = st.toppled[0]; st.stat.wins[1 - l]++; matchRoundEnd(1 - l, NAMES[l] + '’s teddy toppled!'); }
  }
  // nobody (no person) pressed anything for 40 s: pause
  const people = G.players.filter(p => !cpuOn(p.id));
  if (people.length) {
    if (people.some(p => { const i = p.input; return i.left || i.right || i.jump || i.down || i.up || i.act; })) st.idleT = 0;
    else { st.idleT += dt; if (st.idleT >= PFB.idlePause && G.mode === 'play') { st.idleT = 0; pause(); } }
  }
}
function pfbTedStep(st, dt, live) {
  for (const k of [0, 1]) {
    const td = st.ted[k];
    if (live) td.hitT += dt;
    td.shake = Math.max(0, td.shake - dt * 1.6); td.comfy = Math.max(0, td.comfy - dt);
    // a teddy left alone steadies himself (not in sudden death)
    if (live && !td.fallen && td.wob > 0 && !st.lay.wob && td.hitT >= PFB.steadyT) {
      td.wob--; td.hitT = 0; td.comfy = 1;
      pfbPop(st, 'Steady!', pfbColOf(k, td.i) * T + T / 2, pfbTopY(k, td.i) - 50, '#c8ffd8'); Sfx.play('pillowfortComfy', k);
    }
    if (td.fallen) {
      // tumbling off onto the carpet
      if (td.fy < PFB.floorY - 12 || td.fvy < 0) { td.fvy += 1500 * dt; td.fx += td.fvx * dt; td.fy = Math.min(PFB.floorY - 12, td.fy + td.fvy * dt); td.rot += dt * 7 * Math.sign(td.fvx || 1); }
      else { td.fvy = 0; td.fvx *= Math.exp(-5 * dt); td.fx += td.fvx * dt; td.rot = approach(td.rot, Math.sign(td.rot || 1) * Math.PI / 2, dt * 6); }
      td.fx = clamp(td.fx, T + 14, W - T - 14);
    }
  }
}
// looks only: block squish and settling, tumbles, fluff, pops (also during banners)
function pfbVisTick(st, dt) {
  st.vt += dt; st.boxPop = Math.max(0, st.boxPop - dt * 2.5);
  for (const k of [0, 1]) for (const col of st.fort[k]) for (const b of col) {
    b.squish = Math.max(0, b.squish - dt * 4); b.wob = Math.max(0, b.wob - dt * 2.5);
    if (b.dropY > 0) b.dropY = Math.max(0, b.dropY - dt * 260);
    if (b.place !== undefined && b.place < 1) b.place = Math.min(1, b.place + dt * 5);
  }
  for (const td of st.ted) td.lift = approach(td.lift, 0, dt * 260);
  for (const tb of st.tumbles) { tb.vy += 1100 * dt; tb.x += tb.vx * dt; tb.y += tb.vy * dt; tb.rot += tb.vr * dt; tb.life -= dt; if (tb.y > PFB.floorY - 14 && tb.vy > 0) { tb.y = PFB.floorY - 14; tb.vy *= -0.3; tb.vx *= 0.6; tb.vr *= 0.5; } }
  st.tumbles = st.tumbles.filter(tb => tb.life > 0);
  let n = 0;
  for (const f of st.fx) {
    f.life -= dt;
    if (f.kind === 'feather') { f.vx *= Math.exp(-2.2 * dt); f.vy = f.vy < 30 ? f.vy + 220 * dt : 30; f.x += (f.vx + Math.sin(f.life * 3 + f.rot) * 30) * dt; f.y = Math.min(PFB.floorY - 3, f.y + f.vy * dt); }
    else { f.vx *= Math.exp(-2 * dt); f.vy += f.grav * dt; f.x += f.vx * dt; f.y += f.vy * dt; }
    f.rot += dt * 2;
    if (f.life > 0) st.fx[n++] = f;
  }
  st.fx.length = n;
  st.pops = st.pops.filter(q => (q.t += dt) < 1.1);
  for (const s of st.pl) { s.pickT += dt; if (s.bubble) { s.bubble.t -= dt; if (s.bubble.t <= 0) s.bubble = null; } }
}
function pfbFx(st, x, y, vx, vy, life, col, size, grav, kind) {
  st.fx.push({ x, y, vx, vy, life, max: life, col, size, grav, kind, rot: pfbVR() * 6.28 });
  if (st.fx.length > 260) st.fx.splice(0, st.fx.length - 260);
}
function pfbPop(st, text, x, y, col) { st.pops.push({ text, x, y, t: 0, col: col || '#ffffff' }); if (st.pops.length > 8) st.pops.shift(); }
// a short hint bubble over a person (never over the computer)
function pfbSay(st, k, text) { if (pfbCpu(k)) return; st.pl[k].bubble = { text, t: 1.8 }; }

/* ---------- the mode ---------- */
MODES.pillowfort = {
  rand() { return Math.random(); },
  setup(st, L) {
    st.stat = { wins: [0, 0], hits: [0, 0], knocked: [0, 0], built: [0, 0], fwumps: [0, 0], wobbles: [0, 0], throws: [0, 0], topples: [0, 0], direct: [0, 0] };
    st.matchWob = [0, 0];
    // rounds 2-4 in a shuffled order
    const mid = PFB_MIDDLE.slice();
    for (let i = mid.length - 1; i > 0; i--) { const j = Math.floor(this.rand() * (i + 1)); [mid[i], mid[j]] = [mid[j], mid[i]]; }
    st.order = ['castle', ...mid, 'bedtime'];
    st.noHelp = !!this.testNoHelp; st.forceRound = this.testRound || null;
    st.hint = [{ b: 0, t: 0 }, { b: 0, t: 0 }];
    st.t = 0; st.rt = 0; st.vt = 0; st.tick = 0; st.idleT = 0; st.nid = 1;
    st.gold = [0, 0]; st.lay = PFB_ROUNDS.castle;
    st.items = []; st.shots = []; st.tumbles = []; st.fx = []; st.pops = []; st.toppled = [];
    st.pl = [pfbPlayerState(), pfbPlayerState()];
    pfbBuildForts(st, st.lay);
  },
  resetRound(n, info) {
    const st = G.mst;
    st.round = n; st.sudden = !!info.suddenDeath;
    st.key = st.forceRound || (st.sudden ? 'sudden' : st.order[Math.min(n, st.order.length) - 1]);
    st.lay = PFB_ROUNDS[st.key];
    st.gold = [0, 1].map(k => (st.sudden || st.noHelp ? 0 : Math.max(0, info.wins[1 - k] - info.wins[k])));
    pfbBuildForts(st, st.lay);
    st.items = []; st.shots = []; st.tumbles = []; st.fx = []; st.pops = []; st.toppled = [];
    st.pl = [pfbPlayerState(), pfbPlayerState()];
    st.ended = false; st.rt = 0; st.spawnT = 0.35; st.idleT = 0; st.boxPop = 0; st.goldSaid = false;
  },
  go() {
    const st = G.mst;
    for (const k of [0, 1]) if (st.gold[k]) {
      const p = G.players[k];
      pfbPop(st, st.gold[k] >= 2 ? 'Gold pillows + a bigger fort!' : 'Gold pillows!', p.x + p.w / 2, p.y - 24, C.gold);
    }
    if (st.gold[0] || st.gold[1]) Sfx.play('pillowfortGold');
  },
  pre(dt) { const st = G.mst; if (st.pl) pfbPre(st, dt); },
  step(dt) { const st = G.mst; pfbStep(st, dt); pfbVisTick(st, dt); },
  idle(dt) {
    const st = G.mst; if (!st.pl) return;
    pfbVisTick(st, dt); pfbTedStep(st, dt, false);
    for (const s of st.pl) { s.aim = false; s.holdT = 0; }
    const m = G.match;
    if (m && (m.phase === 'end' || m.phase === 'over')) {
      // the round is over: tosses still flying puff away, toys settle
      if (st.shots.length) { for (const b of st.shots) pfbFx(st, b.x, b.y, 0, -30, 0.5, '#ffffff', 7, 0, 'fluff'); st.shots = []; }
      for (const it of st.items) pfbItemStep(it, dt);
    }
    if (m && m.phase === 'count' && !st.goldSaid) { st.goldSaid = true; if (st.gold[0] || st.gold[1]) Sfx.play('pillowfortGold'); }
  },
  timeUp() {
    const st = G.mst, a = pfbCount(st, 0), b = pfbCount(st, 1), wa = st.ted[0].wob, wb = st.ted[1].wob;
    st.ended = true;
    // the bigger fort; same size: the steadier teddy (more stars left); both the same: a tie
    let w = -1, reason = 'Time! The forts are even (' + a + '-' + b + ')!';
    if (a !== b) { w = a > b ? 0 : 1; reason = 'Time! Bigger fort (' + Math.max(a, b) + '-' + Math.min(a, b) + ')!'; }
    else if (wa !== wb) { w = wa < wb ? 0 : 1; reason = 'Time! Same size forts (' + a + '-' + b + '): the steadier teddy!'; }
    if (w >= 0) st.stat.wins[w]++;
    return { winner: w, reason };
  },
  tiebreak() {
    const st = G.mst, kn = st.stat.knocked, wb = st.matchWob;
    if (kn[0] !== kn[1]) return { winner: kn[0] > kn[1] ? 0 : 1, reason: 'More blocks knocked this match!' };
    if (wb[0] !== wb[1]) return { winner: wb[0] < wb[1] ? 0 : 1, reason: 'The steadier teddy!' };
    return -1;
  },
  draw() { pfbDrawWorld(); },
  drawTop() { pfbDrawTop(); },
  hud() { pfbHud(); },
  stats() {
    const st = G.mst, s = st.stat;
    const out = [
      { label: 'Rounds won', values: (G.match ? G.match.wins : s.wins).slice() },
      { label: 'Hits', values: s.hits.slice() },
      { label: 'Blocks knocked', values: s.knocked.slice() },
      { label: 'Blocks built', values: s.built.slice() },
    ];
    const tp = s.topples, bl = s.built, fw = s.fwumps;
    if (tp[0] + tp[1] > 0) out.push(tp[0] === tp[1] ? '★ Teddy topplers: Pip and Bo, ' + tp[0] + ' each!' : '★ Teddy toppler: ' + NAMES[tp[0] > tp[1] ? 0 : 1] + ' (' + Math.max(tp[0], tp[1]) + ')');
    else if (bl[0] + bl[1] > 0) out.push('★ Master builder: ' + NAMES[bl[0] >= bl[1] ? 0 : 1] + ' (' + Math.max(bl[0], bl[1]) + ' blocks)');
    if (fw[0] + fw[1] > 0) out.push('Fwumps: Pip ' + fw[0] + ' · Bo ' + fw[1]);
    return out;
  },
  // read-only helpers for the computer brain and the bot tests
  test: { PFB, PFB_ROUNDS, launch: pfbLaunch, path: pfbPath, solveV: pfbSolveV, placeSpot: pfbPlaceSpot, colOf: pfbColOf, idx: pfbIdx, topY: pfbTopY, isBlock: pfbIsBlock, count: pfbCount },
};

/* ---------- drawing: the bedroom ---------- */
function pfbDrawRoom(st) {
  const night = !!st.lay.night, t = st.vt;
  // wallpaper: soft stripes and little stars
  const g = ctx.createLinearGradient(0, 0, 0, PFB.floorY);
  if (night) { g.addColorStop(0, '#2e3566'); g.addColorStop(1, '#4b4f86'); } else { g.addColorStop(0, '#a9cdf2'); g.addColorStop(1, '#ffeedd'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, PFB.floorY);
  ctx.fillStyle = night ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.22)';
  for (let x = 0; x < W; x += 60) ctx.fillRect(x, 0, 26, PFB.floorY);
  for (let i = 0; i < 22; i++) {
    const x = (i * 97 + 31) % W, y = 40 + ((i * 53) % 330);
    ctx.fillStyle = night ? 'rgba(255,240,170,' + (0.35 + 0.25 * Math.sin(t * 2 + i)) + ')' : 'rgba(255,255,255,0.55)';
    pfbStarShape(x, y, 4 + (i % 3));
  }
  // the window, high in the middle (sky by day, moon and stars at night)
  const wx = 380, wy = 36, ww = 200, wh = 130;
  ctx.fillStyle = '#fff6ea'; rr(wx - 10, wy - 10, ww + 20, wh + 20, 12); ctx.fill();
  const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
  if (night) { sky.addColorStop(0, '#1a1f4a'); sky.addColorStop(1, '#384088'); } else { sky.addColorStop(0, '#6fc0ff'); sky.addColorStop(1, '#c9ecff'); }
  ctx.fillStyle = sky; rr(wx, wy, ww, wh, 6); ctx.fill();
  if (night) {
    ctx.fillStyle = '#fff4c4'; circle(wx + 150, wy + 36, 18); ctx.fill(); ctx.fillStyle = '#1f2552'; circle(wx + 158, wy + 30, 15); ctx.fill();
    for (let i = 0; i < 7; i++) { ctx.fillStyle = 'rgba(255,250,210,' + (0.5 + 0.4 * Math.sin(t * 3 + i * 2)) + ')'; pfbStarShape(wx + 20 + i * 25, wy + 20 + (i * 37) % 90, 3); }
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const [cx, cy, s] of [[wx + 50 + Math.sin(t * 0.2) * 10, wy + 40, 1], [wx + 140 + Math.sin(t * 0.15 + 2) * 12, wy + 80, 0.8]]) { circle(cx, cy, 14 * s); ctx.fill(); circle(cx + 16 * s, cy - 6 * s, 16 * s); ctx.fill(); circle(cx + 32 * s, cy, 12 * s); ctx.fill(); }
  }
  ctx.fillStyle = '#fff6ea'; ctx.fillRect(wx + ww / 2 - 4, wy, 8, wh); ctx.fillRect(wx, wy + wh / 2 - 4, ww, 8);
  // curtains
  for (const [cx, d] of [[wx - 14, 1], [wx + ww + 14, -1]]) {
    ctx.fillStyle = night ? '#8a6fb8' : '#ffa8c4';
    ctx.beginPath(); ctx.moveTo(cx - 22 * d, wy - 18); ctx.lineTo(cx + 22 * d, wy - 18); ctx.quadraticCurveTo(cx + 6 * d, wy + 70, cx + 18 * d, wy + wh + 26); ctx.lineTo(cx - 22 * d, wy + wh + 26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    for (let n = 0; n < 3; n++) { ctx.beginPath(); ctx.moveTo(cx - (14 - n * 9) * d, wy - 12); ctx.lineTo(cx - (14 - n * 9) * d, wy + wh + 20); ctx.stroke(); }
  }
  ctx.fillStyle = '#c98a52'; rr(wx - 44, wy - 22, ww + 88, 8, 4); ctx.fill();
  // Pip's side: the end of the bed with a quilt; Bo's side: the tall bookshelf
  ctx.fillStyle = night ? '#5b4a7a' : '#d9a06b'; rr(4, 150, 150, 18, 8); ctx.fill();             // headboard top
  ctx.fillStyle = night ? '#4a3d68' : '#c98a52'; ctx.fillRect(14, 160, 16, PFB.floorY - 160); ctx.fillRect(128, 160, 16, PFB.floorY - 160);
  ctx.fillStyle = night ? '#6d5fa0' : '#ffd0a8'; rr(14, 228, 200, 70, 18); ctx.fill();          // mattress and quilt
  ctx.fillStyle = night ? '#7f74b8' : '#ffb38a';
  for (let n = 0; n < 5; n++) { rr(20 + n * 38, 240, 32, 28, 6); ctx.fill(); }
  ctx.strokeStyle = night ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
  ctx.beginPath(); for (let n = 0; n < 5; n++) ctx.rect(23.5 + n * 38, 243.5, 26, 22); ctx.stroke();
  ctx.fillStyle = 'rgba(60,30,40,0.14)'; rr(14, 276, 200, 22, 12); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(14 + 4, 160, 4, PFB.floorY - 160); ctx.fillRect(128 + 4, 160, 4, PFB.floorY - 160);
  ctx.fillStyle = night ? '#8f86c8' : '#ffffff'; rr(30, 206, 70, 30, 12); ctx.fill();           // a pillow on the bed
  ctx.fillStyle = 'rgba(80,60,120,0.14)'; rr(30, 222, 70, 14, 7); ctx.fill();
  // the bookshelf
  ctx.fillStyle = night ? '#4b3c62' : '#b9773f'; ctx.fillRect(806, 70, 150, PFB.floorY - 70);
  ctx.fillStyle = night ? '#3a2e4f' : '#8d5a2b';
  for (let n = 0; n < 4; n++) ctx.fillRect(806, 70 + n * 96 + 88, 150, 8);
  const bookC = ['#4fb5ff', '#ff8a6a', '#6fd88a', '#ffc43d', '#c39bff', '#ff8fc7'];
  for (let n = 0; n < 3; n++) for (let bk = 0; bk < 8; bk++) {
    const bx = 814 + bk * 17, bh = 52 + ((bk * 13 + n * 7) % 26), by = 70 + n * 96 + 88 - bh;
    ctx.fillStyle = bookC[(bk + n) % 6]; ctx.globalAlpha = night ? 0.6 : 1; ctx.fillRect(bx, by, 14, bh);
    ctx.fillStyle = 'rgba(20,10,40,0.2)'; ctx.fillRect(bx + 11, by, 3, bh);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(bx + 2, by + 6, 10, 2); ctx.fillRect(bx + 2, by + bh - 9, 10, 2);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = 'rgba(30,15,5,0.16)'; for (let n = 0; n < 4; n++) ctx.fillRect(806, 70 + n * 96 + 96, 150, 6);
  ctx.fillStyle = night ? '#3a2e4f' : '#8d5a2b'; ctx.fillRect(806, 70, 8, PFB.floorY - 70);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(814, 70, 2, PFB.floorY - 70);
  // the night light by the bookshelf (glowing at bedtime)
  const nx = 740, ny = 300;
  if (night) { const ng = ctx.createRadialGradient(nx, ny, 4, nx, ny, 160); ng.addColorStop(0, 'rgba(255,230,150,0.45)'); ng.addColorStop(1, 'rgba(255,230,150,0)'); ctx.fillStyle = ng; circle(nx, ny, 160); ctx.fill(); }
  ctx.fillStyle = '#f2f2f2'; rr(nx - 10, ny + 6, 20, 26, 4); ctx.fill();
  ctx.fillStyle = night ? '#ffe68a' : '#fff4c8'; ctx.beginPath(); ctx.arc(nx, ny + 4, 14, Math.PI, 0); ctx.fill();
  ctx.fillStyle = night ? '#ffd24d' : '#ffe68a'; pfbStarShape(nx, ny - 2, 6);
  // a skirting board and a soft shade where the wall meets it
  ctx.fillStyle = night ? 'rgba(10,10,30,0.16)' : 'rgba(80,50,60,0.08)'; ctx.fillRect(0, PFB.floorY - 36, W, 24);
  ctx.fillStyle = night ? '#5a5a8a' : '#fff6ea'; ctx.fillRect(0, PFB.floorY - 12, W, 12);
  ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(0, PFB.floorY - 3, W, 3);
  // the carpet: Pip's peach rug and Bo's blue rug meet at a stitched line
  for (const k of [0, 1]) {
    const x0 = k ? PFB.line : 0, x1 = k ? W : PFB.line;
    ctx.fillStyle = k ? (night ? '#4b6fae' : '#8fc0f0') : (night ? '#b07a7a' : '#ffc6a3');
    ctx.fillRect(x0, PFB.floorY, x1 - x0, H - PFB.floorY);
    ctx.fillStyle = k ? (night ? '#5b80c0' : '#a7d0f7') : (night ? '#c08a88' : '#ffd8bd');
    for (let x = x0 + 10; x < x1; x += 40) { ctx.fillRect(x, PFB.floorY + 10, 20, 4); ctx.fillRect(x + 20, PFB.floorY + 30, 20, 4); }
    ctx.fillStyle = k ? (night ? '#3a5a94' : '#6fa6e0') : (night ? '#9a6262' : '#ffad80');
    ctx.fillRect(x0, PFB.floorY, x1 - x0, 5);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); for (let y = PFB.floorY + 8; y < H; y += 6) ctx.rect(0, y, W, 1.5); ctx.fill();
  ctx.fillStyle = 'rgba(30,20,50,0.1)'; ctx.fillRect(0, H - (H - PFB.floorY) * 0.4, W, (H - PFB.floorY) * 0.4);
  // the stitched line down the middle
  ctx.strokeStyle = night ? 'rgba(255,240,200,0.7)' : 'rgba(255,255,255,0.95)'; ctx.lineWidth = 3; ctx.setLineDash([7, 6]);
  ctx.beginPath(); ctx.moveTo(PFB.line, PFB.floorY + 2); ctx.lineTo(PFB.line, H); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = PFB_INK + '0.12)'; ctx.fillRect(PFB.line - 1, PFB.floorY - 70, 2, 70);
}
function pfbStarShape(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r0 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); }
  ctx.closePath(); ctx.fill();
}
// the open toy box in the middle
function pfbDrawToyBox(st, front) {
  const x = PFB.line, y = PFB.floorY, w = 92, h = 50, pop = st.boxPop || 0;
  if (!front) {
    // the lid, open and leaning back against the hinge (it jumps a little on every pop)
    ctx.save(); ctx.translate(x, y - h + 2); ctx.rotate(-0.1 - pop * 0.12);
    ctx.fillStyle = '#c9433a'; ctx.strokeStyle = '#a33328'; ctx.lineWidth = 2; rr(-w / 2 + 3, -34, w - 6, 34, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd36b'; ctx.fillRect(-w / 2 + 4, -12, w - 8, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; rr(-w / 2 + 8, -30, w - 16, 6, 3); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#7a3a2a'; rr(x - w / 2 + 4, y - h - 4, w - 8, 12, 4); ctx.fill();   // the dark inside
    // toys peeking out
    ctx.fillStyle = '#ffd36b'; circle(x - 20, y - h - 2, 9); ctx.fill();
    ctx.fillStyle = '#ff8fa8'; circle(x + 4, y - h - 6, 10); ctx.fill();
    ctx.fillStyle = '#8ec5ff'; circle(x + 24, y - h - 1, 8); ctx.fill();
    return;
  }
  ctx.save(); ctx.translate(x, y); ctx.scale(1 + pop * 0.06, 1 - pop * 0.05);
  ctx.fillStyle = PFB_INK + '0.18)'; ctx.beginPath(); ctx.ellipse(0, 2, w / 2 + 6, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8574a'; ctx.strokeStyle = '#a33328'; ctx.lineWidth = 2.5; rr(-w / 2, -h, w, h, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffd36b'; ctx.fillRect(-w / 2, -h + 6, w, 6); ctx.fillRect(-w / 2, -14, w, 6);
  const letters = ['A', 'B', 'C'], lc = ['#4fb5ff', '#6fd88a', '#c39bff'];
  for (let n = 0; n < 3; n++) { ctx.fillStyle = '#fff6ea'; rr(-36 + n * 25, -38, 22, 20, 4); ctx.fill(); text(letters[n], -25 + n * 25, -27.5, 15, lc[n], 'center'); }
  ctx.restore();
}

/* ---------- drawing: blocks, teddies and toys ---------- */
// one fort block at (x, y) top-left, 30 px
function pfbDrawBlock(b, x, y, k, alpha) {
  const sq = b.squish || 0, wob = b.wob ? Math.sin(b.wob * 20) * 2 * b.wob : 0;
  ctx.save(); ctx.translate(x + T / 2 + wob, y + T); ctx.scale(1 + 0.12 * sq, 1 - 0.14 * sq); ctx.translate(-T / 2, -T);
  if (alpha !== undefined) ctx.globalAlpha = alpha;
  const dam = b.hp < b.max;
  if (b.kind === 'b') { // a folded blanket: stripes
    ctx.fillStyle = k ? '#6f8fd8' : '#e8846a'; rr(0.5, 2, T - 1, T - 2, 6); ctx.fill();
    ctx.fillStyle = k ? '#a7c4ff' : '#ffc29a'; ctx.fillRect(1, 9, T - 2, 4); ctx.fillRect(1, 19, T - 2, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(1, 15, T - 2, 1.5);
    ctx.strokeStyle = k ? '#45609e' : '#a8503a'; ctx.lineWidth = 1.5; rr(0.5, 2, T - 1, T - 2, 6); ctx.stroke();
  } else if (b.kind === 'g') { // a gold pillow
    const gg = ctx.createLinearGradient(0, 0, 0, T); gg.addColorStop(0, '#ffe58a'); gg.addColorStop(1, '#f2b52e');
    ctx.fillStyle = gg; pfbPillowPath(0, 2, T, T - 2); ctx.fill();
    ctx.strokeStyle = '#b9850f'; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; pfbStarShape(T / 2, T / 2 + 1, 5);
  } else if (b.kind === 'p') { // a puffy pillow with pinched corners
    ctx.fillStyle = b.col; pfbPillowPath(0, 3, T, T - 3); ctx.fill();
    ctx.strokeStyle = PFB_INK + '0.35)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(10, 11, 6, 3, -0.3, 0, Math.PI * 2); ctx.fill();
  } else { // a square cushion with a button in the middle
    ctx.fillStyle = b.col; rr(1, 2, T - 2, T - 2, 8); ctx.fill();
    ctx.strokeStyle = PFB_INK + '0.35)'; ctx.lineWidth = 1.4; rr(1, 2, T - 2, T - 2, 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.setLineDash([2.5, 2.5]); rr(4.5, 5.5, T - 9, T - 9, 5); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = PFB_INK + '0.3)'; circle(T / 2, T / 2 + 1, 2.2); ctx.fill();
  }
  if (dam) { ctx.strokeStyle = PFB_INK + '0.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(7, 8); ctx.quadraticCurveTo(12, 14, 9, 21); ctx.moveTo(21, 9); ctx.quadraticCurveTo(18, 15, 22, 22); ctx.stroke(); }
  ctx.restore();
}
function pfbPillowPath(x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x + 2, y + 1);
  ctx.quadraticCurveTo(x + w / 2, y + 5, x + w - 2, y + 1);
  ctx.quadraticCurveTo(x + w - 5, y + h / 2, x + w - 2, y + h - 1);
  ctx.quadraticCurveTo(x + w / 2, y + h - 5, x + 2, y + h - 1);
  ctx.quadraticCurveTo(x + 5, y + h / 2, x + 2, y + 1);
  ctx.closePath();
}
function pfbDrawForts(st) {
  for (const k of [0, 1]) for (let i = 0; i < PFB.cols; i++) {
    const c = pfbColOf(k, i), col = st.fort[k][i];
    for (let j = 0; j < col.length; j++) {
      const b = col[j];
      let x = c * T, y = PFB.floorY - (j + 1) * T - b.dropY;
      if (b.place !== undefined && b.place < 1) { const e = 1 - (1 - b.place) * (1 - b.place); x = b.fromX - T / 2 + (x - b.fromX + T / 2) * e; y = b.fromY - T / 2 + (y - b.fromY + T / 2) * e - Math.sin(b.place * Math.PI) * 20; }
      pfbDrawBlock(b, x, y, k);
    }
  }
  // tumbling blocks
  for (const tb of st.tumbles) {
    ctx.save(); ctx.globalAlpha = clamp(tb.life / 0.4, 0, 1); ctx.translate(tb.x, tb.y); ctx.rotate(tb.rot); ctx.scale(0.85, 0.85);
    pfbDrawBlock({ kind: tb.kind, col: tb.col, hp: 1, max: 1 }, -T / 2, -T / 2, tb.x > PFB.line ? 1 : 0);
    ctx.restore();
  }
}
// the fort's teddy bear with his flag (feet at x, y)
function pfbDrawTeddy(k, x, y, o) {
  const s = o.s || 1, wob = o.wob || 0, mood = o.mood || 'happy';
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
  const fur = '#b98351', dark = '#8a5a32', light = '#e6c39a';
  // the flag (pole in his paw), in the player's colour
  if (!o.noFlag) {
    ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, -10); ctx.lineTo(13, -46); ctx.stroke();
    const fl = Math.sin((o.t || 0) * 6 + k) * 3, d = pfbDir(k);
    ctx.fillStyle = PCOL[k]; ctx.beginPath(); ctx.moveTo(13, -46); ctx.quadraticCurveTo(13 + 12 * d, -45 + fl, 13 + 22 * d, -40 + fl); ctx.quadraticCurveTo(13 + 11 * d, -36 + fl * 0.5, 13, -33); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; pfbStarShape(13 + 8 * d, -40 + fl * 0.6, 3);
  }
  // body, legs, arms
  ctx.fillStyle = fur; ctx.strokeStyle = dark; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.ellipse(0, -10, 10, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(0, -8, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = fur;
  for (const lx of [-7, 7]) { ctx.beginPath(); ctx.ellipse(lx, -2, 5, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(-10, -12, 3.5, 5, 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(10, -13, 3.5, 5, -0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // head
  ctx.save(); ctx.translate(0, -26); ctx.rotate(Math.sin(wob * 20) * 0.12 * (wob > 0 ? 1 : 0));
  for (const ex of [-8, 8]) { ctx.fillStyle = fur; circle(ex, -8, 4.5); ctx.fill(); ctx.stroke(); ctx.fillStyle = light; circle(ex, -8, 2.2); ctx.fill(); }
  ctx.fillStyle = fur; circle(0, 0, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(0, 3, 5.5, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(0, 1.5, 2, 1.4, 0, 0, Math.PI * 2); ctx.fill();
  if (mood === 'dizzy') {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4;
    for (const ex of [-4, 4]) { ctx.beginPath(); ctx.moveTo(ex - 1.8, -4.8); ctx.lineTo(ex + 1.8, -1.2); ctx.moveTo(ex + 1.8, -4.8); ctx.lineTo(ex - 1.8, -1.2); ctx.stroke(); }
  } else {
    ctx.fillStyle = C.ink; for (const ex of [-4, 4]) { circle(ex, -3, mood === 'worried' ? 1.4 : 1.7); ctx.fill(); }
    if (mood === 'worried') { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-6, -7); ctx.lineTo(-2.5, -6); ctx.moveTo(6, -7); ctx.lineTo(2.5, -6); ctx.stroke(); }
  }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.1; ctx.beginPath();
  if (mood === 'worried' || mood === 'dizzy') ctx.arc(0, 7.5, 2, Math.PI + 0.4, -0.4); else ctx.arc(0, 4, 2.4, 0.3, Math.PI - 0.3);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,130,150,0.5)'; circle(-6.5, 2, 1.8); ctx.fill(); circle(6.5, 2, 1.8); ctx.fill();
  ctx.restore();
  // a bow tie in the player's colour
  ctx.fillStyle = PCOL[k]; ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(-6, -20.5); ctx.lineTo(-6, -13.5); ctx.closePath(); ctx.moveTo(0, -17); ctx.lineTo(6, -20.5); ctx.lineTo(6, -13.5); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function pfbDrawTeddies(st) {
  for (const k of [0, 1]) {
    const td = st.ted[k];
    if (td.fallen) { pfbDrawTeddy(k, td.fx, td.fy + 12, { rot: td.rot, mood: 'dizzy', t: st.vt, noFlag: false }); continue; }
    const x = pfbColOf(k, td.i) * T + T / 2, y = pfbTopY(k, td.i) - td.lift;
    const lean = td.wob * 0.055 * -pfbDir(k) + Math.sin(st.vt * (2 + td.wob * 2)) * 0.03 * td.wob + Math.sin(td.shake * 30) * 0.2 * td.shake;
    if (td.comfy > 0) { ctx.fillStyle = 'rgba(200,255,216,' + td.comfy * 0.5 + ')'; circle(x, y - 20, 26); ctx.fill(); }
    pfbDrawTeddy(k, x, y, { rot: lean, wob: td.shake, mood: td.wob >= PFB.wobMax - 2 ? 'worried' : 'happy', t: st.vt });
    // his 5 gold stars over him (bigger on phones), used ones go grey
    const z = hudBig() ? 1.4 : 1;
    for (let n = 0; n < PFB.wobMax; n++) { const sx = x + (n - 2) * 11 * z, sy = y - 62 - 4 * z; ctx.fillStyle = PFB_INK + '0.35)'; pfbStarShape(sx, sy + 1, 5.6 * z); ctx.fillStyle = n < PFB.wobMax - td.wob ? C.gold : 'rgba(150,150,180,0.6)'; pfbStarShape(sx, sy, 4.8 * z); }
  }
}
function pfbHeart(x, y, r, col) {
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.4, x, y - r * 0.5);
  ctx.bezierCurveTo(x + r * 0.7, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
  ctx.fill();
}
// a toy (lying, flying or held), centred at (x, y)
function pfbDrawToy(t, v, x, y, o) {
  o = o || {};
  const s = o.s || 1;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
  if (o.glow) { ctx.fillStyle = 'rgba(255,214,90,0.4)'; circle(0, 0, 17); ctx.fill(); }
  if (pfbIsBlock(t)) {
    pfbDrawBlock({ kind: pfbBlockKind(t), col: o.col || (t === 'pillow' ? '#ffffff' : '#ffd36b'), hp: 1, max: 1 }, -12, -12, o.k || 0);
  } else if (t === 'ball') {
    const cols = ['#ff5f6d', '#ffd36b', '#4fb5ff'];
    for (let n = 0; n < 3; n++) { ctx.fillStyle = cols[n]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 10, n * 2.094, (n + 1) * 2.094); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#ffffff'; circle(0, 0, 3); ctx.fill();
    ctx.strokeStyle = PFB_INK + '0.45)'; ctx.lineWidth = 1.4; circle(0, 0, 10); ctx.stroke();
  } else if (t === 'feather') {
    ctx.fillStyle = '#ffffff'; pfbPillowPath(-13, -9, 26, 18); ctx.fill(); ctx.strokeStyle = '#b9c6e6'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.strokeStyle = '#c8d4ee'; ctx.lineWidth = 1.2;
    for (const [fx, fy, a] of [[-15, -10, -0.6], [14, -11, 0.5], [16, 6, 1.2]]) { ctx.save(); ctx.translate(fx, fy); ctx.rotate(a); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, 5, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); }
  } else if (t === 'teddy') {
    ctx.scale(1.05, 1.05); pfbDrawTeddy(o.k || 0, 0, 15, { noFlag: true, mood: 'happy' });
  } else {
    // plushies: bunny, duck, sock monkey, elephant
    const body = { bunny: '#ffc2d6', duck: '#ffe066', monkey: '#b88a62', elephant: '#c3b4f0' }[v] || '#ffc2d6';
    const edge = { bunny: '#d9809e', duck: '#d8a92c', monkey: '#7d5a3c', elephant: '#8f7fc6' }[v] || '#d9809e';
    ctx.fillStyle = body; ctx.strokeStyle = edge; ctx.lineWidth = 1.5;
    if (v === 'bunny') for (const ex of [-4, 4]) { ctx.beginPath(); ctx.ellipse(ex, -12, 2.8, 7, ex * 0.04, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    if (v === 'elephant') for (const ex of [-9, 9]) { ctx.beginPath(); ctx.ellipse(ex, -2, 5, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    if (v === 'monkey') for (const ex of [-9, 9]) { circle(ex, -3, 3.5); ctx.fill(); ctx.stroke(); }
    circle(0, 0, 9); ctx.fill(); ctx.stroke();
    if (v === 'duck') { ctx.fillStyle = '#ff9a3c'; ctx.beginPath(); ctx.ellipse(6 * (o.face || 1), 2, 5, 2.6, 0, 0, Math.PI * 2); ctx.fill(); }
    if (v === 'monkey') { ctx.fillStyle = '#f0d2b0'; ctx.beginPath(); ctx.ellipse(0, 3, 5.5, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ff5f6d'; ctx.fillRect(-6, 6.5, 12, 2); }
    if (v === 'elephant') { ctx.strokeStyle = edge; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 2); ctx.quadraticCurveTo(1, 9, 5, 10); ctx.stroke(); }
    ctx.fillStyle = C.ink; circle(-3, -2, 1.5); ctx.fill(); circle(3, -2, 1.5); ctx.fill();
    ctx.fillStyle = 'rgba(255,120,150,0.5)'; circle(-5.5, 2, 1.6); ctx.fill(); circle(5.5, 2, 1.6); ctx.fill();
  }
  ctx.restore();
}
function pfbDrawWorld() {
  const st = G.mst; if (!st.fort) return;
  pfbDrawRoom(st);
  pfbDrawToyBox(st, false);
  pfbDrawForts(st);
  pfbDrawTeddies(st);
  pfbDrawToyBox(st, true);
  // toys lying about (a soft shadow, a gentle bob for ones just popped out)
  for (const it of st.items) {
    if (it.rest) { ctx.fillStyle = PFB_INK + '0.15)'; ctx.beginPath(); ctx.ellipse(it.x, it.y + PFB.itemR, 11, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    const special = it.t === 'teddy' || it.t === 'ball' || it.t === 'feather';
    if (special && it.rest) { ctx.fillStyle = 'rgba(255,214,90,' + (0.18 + 0.1 * Math.sin(st.vt * 5 + it.id)) + ')'; circle(it.x, it.y, 17); ctx.fill(); }
    pfbDrawToy(it.t, it.v, it.x, it.y, { rot: it.rest ? 0 : it.spin, col: it.t === 'pillow' ? '#ffffff' : it.x < PFB.line ? '#ffd36b' : '#9be3d0', k: it.x < PFB.line ? 0 : 1, s: it.t === 'teddy' ? 0.9 : 1 });
  }
  // the ghost of where a held pillow will go
  for (const p of G.players) {
    const s = st.pl[p.id], g = s.ghost;
    if (!g || g.why || !p.alive) continue;
    const pulse = 0.35 + 0.15 * Math.sin(st.vt * 8);
    pfbDrawBlock({ kind: pfbBlockKind(s.hold.t), col: PCOL[p.id], hp: 1, max: 1 }, g.c * T, g.top, p.id, pulse);
    ctx.strokeStyle = PCOL[p.id]; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); rr(g.c * T + 1, g.top + 1, T - 2, T - 2, 6); ctx.stroke(); ctx.setLineDash([]);
  }
}
// the held toy over a player's head, the aim arc, flying tosses, effects and pops
function pfbDrawTop() {
  const st = G.mst; if (!st.fort) return;
  const big = hudBig();
  for (const p of G.players) {
    const s = st.pl[p.id];
    if (!p.alive) continue;
    if (s.dizzy > 0) { // little stars round a dizzy head
      for (let n = 0; n < 3; n++) { const a = st.vt * 6 + n * 2.1; ctx.fillStyle = n % 2 ? '#ffffff' : C.gold; pfbStarShape(p.x + p.w / 2 + Math.cos(a) * 13, p.y - 4 + Math.sin(a) * 4, 3.5); }
    }
    if (s.hold) {
      const c = s.aim && s.holdT >= PFB.tapT ? s.charge : 0, d = pfbDir(p.id);
      const hx = p.x + p.w / 2 - d * 7 * c, hy = p.y - 12 - 4 * c + (s.pickT < 0.15 ? (0.15 - s.pickT) * 60 : 0);
      pfbDrawToy(s.hold.t, s.hold.v, hx, hy, { s: (s.hold.t === 'teddy' ? 0.85 : 0.95) * (1 + 0.12 * c), col: s.hold.t === 'pillow' ? '#ffffff' : PFB_COLS[p.id][0], k: p.id, glow: s.hold.t === 'gold', face: d });
      // little hands holding it up
      ctx.fillStyle = PCOL[p.id]; circle(hx - 9, hy + 6, 3.4); ctx.fill(); circle(hx + 9, hy + 6, 3.4); ctx.fill();
    }
  }
  // the dotted aim arc of a held toss (exactly where it will fly), and the charge ring
  for (const p of G.players) {
    const s = st.pl[p.id], k = p.id;
    if (!s.aim || s.holdT < PFB.tapT || !p.alive || !s.hold) continue;
    const pts = pfbPath(st, k, pfbLaunch(p, s.charge, 0), 2.6, 1);
    const n = pts.length;
    for (let i = 3; i < n; i += 4) { const q = pts[i]; ctx.globalAlpha = 0.95 - 0.5 * i / n; ctx.fillStyle = PFB_INK + '0.4)'; circle(q.x, q.y + 1, 3.6); ctx.fill(); ctx.fillStyle = PCOL[k]; circle(q.x, q.y, 3); ctx.fill(); }
    ctx.globalAlpha = 1;
    const e = pts[n - 1];
    if (e) {
      const col = e.hit && (e.hit.kind === 'ted' || e.hit.kind === 'block') ? C.gold : '#ffffff';
      ctx.strokeStyle = PFB_INK + '0.4)'; ctx.lineWidth = 4; circle(e.x, Math.min(e.y, H - 6), 9); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 2.2; circle(e.x, Math.min(e.y, H - 6), 9); ctx.stroke();
      if (e.hit && e.hit.kind === 'ted') bigText('Teddy!', e.x, e.y - 22, 14, C.gold);
    }
    const rx = p.x + p.w / 2, ry = p.y + p.h / 2;
    ctx.lineWidth = 3; ctx.strokeStyle = PFB_INK + '0.35)'; circle(rx, ry, 20); ctx.stroke();
    ctx.strokeStyle = s.charge >= 1 ? C.gold : PCOL[k]; ctx.beginPath(); ctx.arc(rx, ry, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.charge); ctx.stroke();
  }
  // flying tosses
  for (const b of st.shots) {
    b.trail.forEach((q, i) => { ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + i * 0.1) + ')'; circle(q.x, q.y, 3 + i); ctx.fill(); });
    pfbDrawToy(b.t, b.v, b.x, b.y, { rot: b.spin, col: '#ffd36b', k: b.k, s: b.t === 'teddy' ? 0.95 : 1, face: Math.sign(b.vx) || 1 });
  }
  // fluff and feathers
  for (const f of st.fx) {
    const a = clamp(f.life / Math.min(0.5, f.max), 0, 1);
    ctx.globalAlpha = a;
    if (f.kind === 'feather') { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(Math.sin(f.rot) * 0.8); ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#c3cfe8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 0, f.size, f.size * 0.36, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-f.size, 0); ctx.lineTo(f.size, 0); ctx.stroke(); ctx.restore(); }
    else { ctx.fillStyle = f.col; circle(f.x, f.y, f.size * (0.5 + 0.5 * a)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  // pops
  for (const q of st.pops) { const u = q.t / 1.1; ctx.globalAlpha = 1 - u * u; bigText(q.text, clamp(q.x, 60, W - 60), clamp(q.y - 22 * u, 90, H - 70), big ? 24 : 18, q.col, 1 + 0.3 * Math.max(0, 1 - q.t * 6)); ctx.globalAlpha = 1; }
  // hint bubbles over people
  for (const p of G.players) {
    const b = st.pl[p.id].bubble;
    if (!b || !p.alive) continue;
    const S = big ? 1.35 : 1;
    ctx.save(); ctx.globalAlpha = clamp(b.t / 0.25, 0, 1);
    ctx.font = '700 ' + Math.round(13 * S) + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(b.text).width + 22 * S, h = 24 * S, x = clamp(p.x + p.w / 2, w / 2 + 8, W - w / 2 - 8), y = Math.max(96, p.y - 46 - 26 * S);
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(x - w / 2, y, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = PCOL[p.id]; ctx.lineWidth = 2; rr(x - w / 2, y, w, h, h / 2); ctx.stroke();
    text(b.text, x, y + h / 2 + 0.5, 13 * S, '#ffffff', 'center', 'body');
    ctx.restore();
  }
}

/* ---------- HUD ---------- */
// each player's own keys (for chips and hints)
function pfbKeys(id) {
  let k = 'kb'; try { k = actKey(id); } catch (e) { k = 'kb'; }
  if (k === 'pad') return { act: glyph('act'), drop: 'down', pad: true };
  if (k === 'touch') return { act: 'toss', drop: '▼', touch: true };
  if (typeof cpuSolo === 'function' && cpuSolo()) return { act: 'F or /', drop: 'S or ↓' };
  return id === 0 ? { act: 'F', drop: 'S' } : { act: '/', drop: '↓' };
}
function pfbChip(label, x, y, big, col, gold) {
  const fs = big ? 20 : 13, h = big ? 34 : 22;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(label).width + (big ? 26 : 20), cx = clamp(x, w / 2 + 6, W - w / 2 - 6), cy = clamp(y, h / 2 + 4, H - h / 2 - 4);
  ctx.fillStyle = 'rgba(28,26,54,0.88)'; rr(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; rr(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.stroke();
  text(label, cx, cy + 0.5, fs, gold ? C.gold : C.paper, 'center', 'body');
}
function pfbHud() {
  const st = G.mst, m = G.match; if (!st.fort || !m) return;
  const big = hudBig(), sz = big ? 1.42 : 1;
  // each player's panel in their bottom corner (on the carpet): name, fort size, teddy wobbles, what's in hand
  for (const k of [0, 1]) {
    const left = k === 0, pw = 236 * sz, ph = big ? 54 : 42, x = left ? 8 : W - 8 - pw, y = H - 4 - ph, s = st.pl[k], td = st.ted[k];
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(x, y, pw, ph, ph / 2); ctx.fill();
    if (st.gold[k]) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; rr(x, y, pw, ph, ph / 2); ctx.stroke(); }
    // positions measured from the panel's outer end (mirrored for Bo): name, cushion + fort count, 5 teddy stars
    const at = d => (left ? x + d * sz : x + pw - d * sz), ly = y + ph * 0.36;
    text(NAMES[k], at(14), ly, 17 * sz, PCOL[k], left ? 'left' : 'right');
    ctx.save(); ctx.translate(at(62) - 8 * sz, ly - 8 * sz); ctx.scale(0.55 * sz, 0.55 * sz);
    pfbDrawBlock({ kind: st.gold[k] ? 'g' : 'c', col: PFB_COLS[k][0], hp: 1, max: 1 }, 0, 0, k); ctx.restore();
    text('×' + pfbCount(st, k), at(74), ly + 0.5, 15 * sz, C.paper, left ? 'left' : 'right');
    for (let n = 0; n < PFB.wobMax; n++) { ctx.fillStyle = n < PFB.wobMax - td.wob && !td.fallen ? C.gold : 'rgba(255,255,255,0.22)'; pfbStarShape(at(116 + n * 10), ly, 4.6 * sz); }
    // the status line
    let lab = '', col = 'rgba(246,239,223,0.82)';
    if (m.phase === 'ready' || m.phase === 'count' || m.phase === 'intro') lab = st.gold[k] ? (st.gold[k] >= 2 ? 'Gold pillows + bigger fort' : 'Gold pillows') : 'Ready...';
    else if (m.phase === 'end' || m.phase === 'over') { const w = m.end ? m.end.winner : -1; lab = w === k ? 'Round won!' : w < 0 ? 'Tie!' : 'Good battle!'; }
    else if (td.fallen) lab = 'Teddy toppled!';
    else if (s.dizzy > 0) lab = 'Fwump! Dizzy...';
    else if (s.hold) { lab = pfbName(s.hold.t) + (pfbIsBlock(s.hold.t) ? ': build!' : ': toss!'); col = pfbIsBlock(s.hold.t) ? '#c8ffd8' : '#ffe9a8'; if (s.hold.t === 'gold') col = C.gold; }
    else if (td.wob >= PFB.wobMax - 2) { lab = 'Teddy is wobbly!'; col = '#ffb3c4'; }
    else if (st.gold[k]) { lab = 'Gold pillows'; col = C.gold; }
    else lab = 'Grab a toy!';
    text(lab, left ? x + 14 * sz : x + pw - 14 * sz, y + ph * 0.76, 11.5 * sz, col, left ? 'left' : 'right', 'body');
    // what's in hand, small, at the inner end of the panel
    if (s.hold) pfbDrawToy(s.hold.t, s.hold.v, left ? x + pw - 20 * sz : x + 20 * sz, y + ph / 2, { s: 0.8 * sz, col: PFB_COLS[k][0], k, glow: s.hold.t === 'gold' });
  }
  // the round's name, top left under the level pill
  {
    const fs = big ? 17 : 13, h = big ? 32 : 26, y0 = 46;
    const lab = st.lay.name + (st.round >= 5 && !st.sudden ? '  ·  the final!' : '');
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(lab).width + (big ? 34 : 28); pill(14, y0, w, h); text(lab, 14 + (big ? 17 : 14), y0 + h / 2 + 0.5, fs, C.gold, 'left', 'body');
  }
  // key chips sit high on each side (clear of the forts, the players and the toys on the carpet)
  const chipY = big ? 112 : 98;
  if (m.phase === 'live' && st.round <= 2 && st.rt < 8) {
    // each person's keys early in rounds 1-2 (never the computer's)
    for (const k of [0, 1]) {
      if (pfbCpu(k)) continue;
      const kk = pfbKeys(k), cxp = k === 0 ? 8 + 118 * sz : W - 8 - 118 * sz;
      pfbChip(kk.touch ? (big ? 'Hold to aim · tap to build' : 'Hold to aim · tap at your fort to build') : 'Hold ' + kk.act + ' to aim · ' + kk.act + ' at your fort builds', cxp, chipY, big, PCOL[k], false);
    }
  }
  if (m.phase === 'ready' || m.phase === 'count') {
    // the round card, under the framework's "Round N" card and 3-2-1
    const nf = big ? 30 : 22, hf = big ? 19 : 14;
    ctx.font = '700 ' + hf + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const hint = st.lay.hint;
    let lines = [hint];
    if (ctx.measureText(hint).width + 44 > 560) {
      const words = hint.split(' ');
      let bi = 1, bd = Infinity;
      for (let i = 1; i < words.length; i++) { const d = Math.abs(ctx.measureText(words.slice(0, i).join(' ')).width - ctx.measureText(words.slice(i).join(' ')).width); if (d < bd) { bd = d; bi = i; } }
      lines = [words.slice(0, bi).join(' '), words.slice(bi).join(' ')];
    }
    const w = Math.min(W - 20, Math.max(big ? 380 : 320, ...lines.map(l => ctx.measureText(l).width + 44)));
    const lh = hf * 1.25, ch = (big ? 70 : 50) + (lines.length - 1) * lh, gold = st.gold[0] || st.gold[1], yy = big ? 286 : 288;
    const a = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1, cx = W / 2;
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(cx - w / 2, yy, w, ch, 14); ctx.fill();
    ctx.strokeStyle = gold ? C.gold : 'rgba(246,239,223,0.25)'; ctx.lineWidth = 2; rr(cx - w / 2, yy, w, ch, 14); ctx.stroke();
    const h0 = big ? 70 : 50;
    text(st.lay.name, cx, yy + h0 * 0.33, nf, C.gold, 'center');
    lines.forEach((l, i) => text(l, cx, yy + h0 * 0.74 + i * lh, hf, C.paper, 'center', 'body'));
    let gy = chipY;
    for (const k of [0, 1]) {
      const cxp = k === 0 ? 8 + 118 * sz : W - 8 - 118 * sz;
      let y = gy;
      if (!pfbCpu(k) && m.round <= 2) {
        const kk = pfbKeys(k);
        pfbChip(big ? NAMES[k] + ': hold ' + (kk.touch ? 'toss' : kk.act) + ' to aim, let go!' : kk.touch ? NAMES[k] + ': hold the button to aim, let go to toss' : NAMES[k] + ': hold ' + kk.act + ' to aim, let go to toss', cxp, y, big, PCOL[k], false);
        y += big ? 42 : 28;
      }
      if (st.gold[k]) pfbChip(big ? (st.gold[k] >= 2 ? 'Gold pillows + bigger fort!' : 'Gold pillows!') : st.gold[k] >= 2 ? 'Gold for ' + NAMES[k] + ': gold pillows + a bigger fort!' : 'Gold for ' + NAMES[k] + ': tough gold pillows!', cxp, y, big, C.gold, true);
    }
    ctx.globalAlpha = 1;
  }
}

/* ---------- sounds ---------- */
Sfx.extra.pillowfortToss = function (p) { this.tone(520 * p, 0.1, 'triangle', 0.035, 900 * p); this.tone(260 * p, 0.08, 'sine', 0.02, 380 * p, 0.03); };
Sfx.extra.pillowfortHeavy = function (p) { this.tone(240 * p, 0.16, 'triangle', 0.05, 420 * p); this.tone(160 * p, 0.12, 'sine', 0.03, 220 * p, 0.05); };
Sfx.extra.pillowfortPick = function (p) { this.tone(880 * p, 0.05, 'triangle', 0.035); this.tone(1175 * p, 0.06, 'triangle', 0.03, null, 0.04); };
Sfx.extra.pillowfortPickSoft = function (p) { this.tone(440 * p, 0.07, 'sine', 0.04, 620 * p); };
Sfx.extra.pillowfortPlace = function (p) { this.tone(200 * p, 0.09, 'triangle', 0.05, 150 * p); this.tone(660 * p, 0.06, 'sine', 0.025, 880 * p, 0.05); };
Sfx.extra.pillowfortThump = function (p) { this.tone(180 * p, 0.1, 'triangle', 0.05, 120 * p); };
Sfx.extra.pillowfortKnock = function (p) { this.tone(260 * p, 0.12, 'triangle', 0.05, 130 * p); this.tone(140, 0.18, 'sine', 0.04, 80, 0.06); };
Sfx.extra.pillowfortFwump = function () { this.tone(150, 0.16, 'triangle', 0.06, 90); this.tone(420, 0.08, 'sine', 0.025, 260, 0.02); };
Sfx.extra.pillowfortWobble = function () { [520, 470, 520, 470].forEach((f, i) => this.tone(f, 0.07, 'sine', 0.035, null, i * 0.06)); };
Sfx.extra.pillowfortTopple = function () { [660, 560, 470, 390, 330].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.045, null, i * 0.08)); this.tone(120, 0.25, 'sine', 0.05, 70, 0.4); };
Sfx.extra.pillowfortComfy = function (p) { this.tone(660 * p, 0.08, 'sine', 0.035); this.tone(880 * p, 0.12, 'sine', 0.03, null, 0.07); };
Sfx.extra.pillowfortSpawn = function () { this.tone(330, 0.06, 'square', 0.015, 520); this.tone(220, 0.08, 'triangle', 0.03, 180, 0.03); };
Sfx.extra.pillowfortSpecial = function () { [523, 784, 1047].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.04, null, i * 0.05)); };
Sfx.extra.pillowfortBoing = function (p) { this.tone(300 * p, 0.14, 'sine', 0.05, 760 * p); };
Sfx.extra.pillowfortPlop = function (p) { this.tone(210 * p, 0.07, 'sine', 0.035, 140 * p); };
Sfx.extra.pillowfortFeather = function () { this.tone(1400, 0.25, 'sine', 0.015, 900); this.tone(600, 0.2, 'triangle', 0.025, 300, 0.03); };
Sfx.extra.pillowfortNope = function (p) { this.tone(240 * p, 0.06, 'square', 0.02); this.tone(200 * p, 0.08, 'square', 0.02, null, 0.07); };
Sfx.extra.pillowfortGold = function () { this.tone(784, 0.1, 'triangle', 0.05); this.tone(1046, 0.12, 'triangle', 0.045, null, 0.08); this.tone(1318, 0.16, 'triangle', 0.04, null, 0.16); };
