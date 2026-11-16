/* Pip & Bo - Level 25-1 Defend the Heart (team, World 25 Zombie Acres). */
'use strict';

/* ===== 25-1 Defend the Heart (mode 'zombiefort', team) — Gavyn's idea and rules (Nov 2026) =====
   "One level based on zombie survival. The 2 players defend themselves from zombies coming from each side, in waves
   that get harder. Upgrade weapons and base throughout. A 5 minute grace period to build the base. Protect something
   in the center of your base or you lose. Incentives to build wide and tall. Zombies jump over a wall that's too short,
   their pathing tries to skip as many blocks as possible, and they dig up, down, left and right to reach the heart."
   His follow-up answers: 15-20 minutes on average; ENDLESS waves that get harder until you lose however good you are;
   not overly cartoony (some animated violence is fine, silly guns are fun too); building should feel natural;
   Terraria-like trees to chop (they don't block your path) and stone below the dirt; players must know every block
   tier and its durability; zombies knock you back and damage you; a short respawn near the centre of the base.

   One screen, side view (32 x 18 tiles). Rows 12-13 are dirt (grass on top), rows 14-16 stone, row 17 bedrock. The
   Heart (a glowing crystal, ZF.heartMax HP) sits in the middle (cols 15-16, rows 10-11). Trees stand on the ground
   (ZF.trees), behind everything: you walk through them. The two pads either side of the heart are where players
   start and respawn.

   The engine moves Pip and Bo on the tile grid as usual (not ownStep): every solid cell of the grid is '#', and this
   mode keeps what each cell really is in st.cell ({ k: dirt|wood|stone|metal|turret|bed, hp, max, by }; by is the
   player who built it, -1 for natural ground) and draws it.
   - BLOCK TIERS (shown on screen during build time, and on the build cursor): Dirt 2 HP, Wood 5, Stone 10, Metal 20,
     Turret 10; bedrock can't be dug.
   - ONE BUTTON, two uses: TAP the action to shoot (the way you face; hold ▼ while tapping to shoot down at 45°).
     HOLD the action (ZF.holdBuild s) to work; it repeats every ZF.buildRep s while held, and one hold keeps doing the
     same kind of job it started with (place, dig, chop, fix), so holding never undoes itself. What a hold does
     (zfTarget):
       - standing at a tree trunk (or facing one right in front): chop it (+1 wood a chop; ZF.treeWood chops fell
         it, it regrows after ZF.regrow s). You can't build on a standing tree's trunk cell.
       - holding ▼ on a pad: buy (Guns pad: YOUR next gun; Turret pad: a turret in your hands, placed like a block;
         by the heart: +ZF.repairHp HP). Without ▼ a pad is ordinary ground.
       - on the ground: the column just in front of your body, from your feet up 2 cells. Natural dirt or stone at your
         feet is dug (+1 dirt at once; stone takes ZF.stoneHits hits, +1 stone); otherwise a block goes in the lowest
         empty cell, made of your strongest material (stone, then wood, then dirt). When all three are full, the hold
         fixes the lowest cracked block (free), else upgrades the lowest one: dirt -> wood (1 wood, or ZF.upCoins coins
         when out of wood), wood -> stone (1 stone, or coins), stone -> metal (coins). An upgrade paid in coins ends
         the hold, so one long hold can't spend everything.
       - holding ▼: the column below-front, 3 deep: digs dirt and stone (moats, mines), takes back one of your own
         blocks right below-front (refund: metal gives stone, a turret goes back in your hands), or fills a hole from
         the bottom up.
       - in the air: the cell under your feet (jump and hold to build a tower under you).
     Dirt, wood, stone and coins are shared by the team. Nothing can be built in the zombie lanes (cols 0-1, 30-31),
     on the pads or the 3 cells above them, the heart, a cell a player or zombie is in, or above row ZF.ceilRow.
   - ZOMBIES walk in from both edges (diggers also come up through the ground at the edges). They step between cells:
     walk, fall, jump up a wall at most `jump` cells tall (2; leapers 4: build TALL), climb in tunnels they dug, and
     dig left, right, up and down. They follow a cost field from the heart (buildField): every move costs time, digging
     a block costs digW + its hp, so they go the way with the fewest and weakest blocks (diggers like digging, digW
     0.6). Digging down costs extra (downPen) and natural ground just under a built block counts as that block, so
     a wall can't be skipped by tunnelling under it for free. Turrets can't see through natural ground. A zombie in a cell next to the heart attacks it. Kinds: walker, digger, leaper, brute and the Behemoth
     (every 10th wave).
   - PLAYERS HAVE HEALTH (ZF.playerHp). A zombie that touches you hits you (its `hit`) and knocks you back; you can't
     be hit again for ZF.invuln s and you heal ZF.regen HP/s after ZF.regenAfter s without a hit. At 0 you are down
     and come back on your pad after ZF.respawn s.
   - FLOW: build time (ZF.grace = 5:00 before wave 1, ZF.breakT between waves). Both players standing by the heart
     holding ▼ (standing still, not holding the action) for ZF.readyHold s start the next wave early. The waves never end (zfWaveSpec: more zombies, more
     kinds, more HP, faster digging, every wave), so sooner or later the heart falls. A wave ends when its last zombie
     is down; then a FORT BONUS pays coins for how wide and how tall the fort is.
   - GAME OVER: the heart at 0. A banner, then the results card: waves survived (best kept in the browser as
     'zfwave:<name>'). Medal (MODES.zombiefort.medals, js/medals.js; def.noTime): Gold at ZF.medal.gold waves survived,
     Silver at ZF.medal.silver, Bronze for any stand.
   - When no person has pressed anything for ZF.idleAfter s, the zombies wait (nothing moves, the clocks stop).
   MODES.zombiefort exposes helpers the computer brain reads (target, cellAt, solid, canPlace, trees, ...). State in
   G.mst. Every top-level name starts with zf / ZF / zombiefort (Sfx.extra.zombiefort* too). */
const ZF = {
  ground: 12, stoneRow: 14, ceilRow: 3, bedRow: 17, heart: { c0: 15, c1: 16, r0: 10, r1: 11 }, pads: { guns: 13, turret: 18, row: 11 },
  lanes: [0, 1, 30, 31],
  trees: [4, 7, 10, 21, 24, 27], treeWood: 5, regrow: 60, chopRep: 0.32,
  grace: 300, breakT: 30, readyHold: 1.6,
  holdBuild: 0.26, buildRep: 0.2, holdBuy: 0.45, stoneHits: 3,
  start: { dirt: 10, wood: 10, stone: 0, coins: 10 },
  kinds: {
    dirt: { hp: 2, next: 'wood', name: 'Dirt' }, wood: { hp: 5, next: 'stone', name: 'Wood' },
    stone: { hp: 10, next: 'metal', name: 'Stone' }, metal: { hp: 20, name: 'Metal', coins: 6 },
    turret: { hp: 10, name: 'Turret' }, bed: { hp: Infinity, name: 'Bedrock' },
  },
  heartMax: 100,
  playerHp: 100, invuln: 0.9, regen: 5, regenAfter: 4, respawn: 4, knockV: 340,
  zombies: {
    walker: { hp: 3,  speed: 1.25, dig: 1.0, jump: 2, dps: 4,  hit: 12, coins: 2,  field: 'w', name: 'zombie' },
    digger: { hp: 3,  speed: 1.05, dig: 2.6, jump: 2, dps: 4,  hit: 10, coins: 3,  field: 'd', name: 'digger' },
    leaper: { hp: 2,  speed: 1.7,  dig: 0.8, jump: 4, dps: 3,  hit: 10, coins: 3,  field: 'h', name: 'leaper' },
    brute:  { hp: 12, speed: 0.8,  dig: 2.4, jump: 2, dps: 8,  hit: 25, coins: 8,  field: 'w', name: 'brute' },
    behemoth: { hp: 70, speed: 0.6, dig: 4.0, jump: 2, dps: 14, hit: 35, coins: 40, field: 'w', name: 'the Behemoth' },
  },
  // downPen: extra planning cost to dig DOWN, so most zombies go over or through a wall, not under it
  fields: { w: { jump: 2, digW: 3, downPen: 10 }, h: { jump: 4, digW: 3, downPen: 10 }, d: { jump: 2, digW: 0.6, downPen: 1 } },
  guns: [
    { name: 'Pistol', cd: 0.4, dmg: 1, kind: 'bullet', v: 720, life: 0.9 },
    { name: 'SMG', cd: 0.14, dmg: 1, kind: 'bullet', v: 780, life: 0.8, jitter: 0.06 },
    { name: 'Shotgun', cd: 0.6, dmg: 1, kind: 'pellet', v: 700, life: 0.36, pellets: 5, spread: 0.32 },
    { name: 'Laser rifle', cd: 0.45, dmg: 4, kind: 'laser', v: 1300, life: 0.75, pierce: true },
    { name: 'Rocket launcher', cd: 0.85, dmg: 5, kind: 'rocket', v: 500, life: 1.4, splash: 64 },
  ],
  gunCost: [0, 12, 25, 45, 70], turretCost: 15, turretMax: 6, turretRange: 300, turretCD: 1.0,
  repairCost: 8, repairHp: 20, upCoins: { wood: 2, stone: 3 }, // an upgrade paid in coins when the team has no wood or stone
  medal: { gold: 12, silver: 8 },
  idleAfter: 15, newsLife: 3.6, overT: 4.0,
};

// one wave of the endless list: how many of each kind, and how much tougher they are (wave n, from 1)
function zfWaveSpec(n) {
  const count = Math.round(4 + 1.8 * n + 0.1 * n * n), mix = {};
  const w = { walker: 1, digger: n >= 3 ? 0.3 : 0, leaper: n >= 4 ? 0.28 : 0, brute: n >= 6 ? Math.min(0.35, 0.05 + 0.016 * n) : 0 };
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  let left = count;
  for (const k of ['digger', 'leaper', 'brute']) { mix[k] = Math.round(count * w[k] / sum); left -= mix[k]; }
  mix.walker = Math.max(1, left);
  if (n % 10 === 0) mix.behemoth = Math.floor(n / 10);
  return {
    mix, count: Object.values(mix).reduce((a, b) => a + b, 0),
    hpK: 1 + 0.08 * (n - 1), digK: 1 + 0.06 * (n - 1), spdK: Math.min(1.7, 1 + 0.035 * (n - 1)), dpsK: 1 + 0.05 * (n - 1),
    gap: Math.max(0.45, 2.4 - 0.13 * n),
  };
}

(() => {
  const H0 = ZF.heart;
  const idx = (x, y) => y * COLS + x;
  const solo = () => typeof cpuSolo === 'function' && cpuSolo();
  const isCpu = id => solo() && cpuOn(id);
  const big = () => typeof hudBig === 'function' && hudBig();
  const FONT = '"Atkinson Hyperlegible", system-ui, sans-serif';
  const inHeart = (x, y) => x >= H0.c0 && x <= H0.c1 && y >= H0.r0 && y <= H0.r1;
  const isPad = (x, y) => y === ZF.pads.row && (x === ZF.pads.guns || x === ZF.pads.turret);
  const isLane = x => ZF.lanes.includes(x);
  const HX = (H0.c0 + 1) * T, HY = (H0.r1 + 1) * T; // the heart's bottom centre
  const recKey = () => 'zfwave:' + LEVELS[G.levelIndex].name;

  /* ---------- each player's own keys ---------- */
  function dev(id) { try { return actKey(id); } catch (e) { return 'kb'; } }
  function key(id, what) {
    const d = dev(id), s = solo();
    if (what === 'act') return d === 'pad' ? glyph('act') : d === 'touch' ? 'the shoot button' : s ? 'F' : id === 0 ? 'F' : '/';
    if (what === 'down') return d === 'pad' ? 'stick down' : d === 'touch' ? '▼' : s ? 'S' : id === 0 ? 'S' : '↓';
    return '';
  }

  /* ---------- the grid ---------- */
  function cellAt(x, y) { const st = G.mst; if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return null; return st.cell[idx(x, y)]; }
  // solid for zombies (off the sides and below the map count as solid, the sky above is open)
  function zSolid(x, y) { if (y < 0) return false; if (x < 0 || x >= COLS || y >= ROWS) return true; return !!G.mst.cell[idx(x, y)]; }
  // a dug tunnel cell lets a zombie stand and climb, but only while some side of it is still solid
  const tunOK = (x, y) => !!G.mst.tun[idx(x, y)] && (zSolid(x - 1, y) || zSolid(x + 1, y) || zSolid(x, y + 1));
  function setCell(x, y, c) {
    const st = G.mst, i = idx(x, y);
    st.cell[i] = c;
    G.level.grid[y][x] = c ? '#' : '.';
    if (c) st.tun[i] = 0;
    st.ver++;
  }
  const mk = (k, by) => ({ k, hp: ZF.kinds[k].hp, max: ZF.kinds[k].hp, by: by == null ? -1 : by, hit: 0, mine: 0 });
  const playerBlock = c => !!c && c.by >= 0;
  const natural = c => !!c && c.by < 0 && (c.k === 'dirt' || c.k === 'stone');
  const upCost = k => { const nx = ZF.kinds[k] && ZF.kinds[k].next; if (!nx) return null; return nx === 'metal' ? { coins: ZF.kinds.metal.coins } : { [nx]: 1 }; };
  // the coin price of an upgrade when the team is out of the material (wood, stone)
  const coinAlt = k => { const nx = ZF.kinds[k] && ZF.kinds[k].next; return nx && ZF.upCoins[nx] ? { coins: ZF.upCoins[nx] } : null; };
  // what an upgrade will actually cost now: the material if you have it, else coins
  const payCost = (st, k) => { const c = upCost(k); if (!c) return null; const a = coinAlt(k); return !canPay(st, c) && a && canPay(st, a) ? a : c; };
  const costWords = c => Object.entries(c).map(([k, n]) => n + ' ' + k).join(', ');
  const canPay = (st, c) => Object.entries(c).every(([k, n]) => (k === 'coins' ? st.coins : st.res[k]) >= n);
  const pay = (st, c) => { for (const [k, n] of Object.entries(c)) { if (k === 'coins') st.coins -= n; else st.res[k] -= n; } };

  /* ---------- the zombies' way to the heart: a cost field per kind of zombie ---------- */
  // forward moves from an open cell (x, y) for a zombie that jumps up to J cells; each is [to, cost]
  // (asDug: plan from a solid cell as if it were already dug open, which makes it a tunnel)
  // what a zombie pays to dig a cell: natural ground just under a player's block (its foundation) is as hard as
  // that block, so digging under a wall costs as much as digging through it
  function digHp(cx, cy) {
    const st = G.mst, c = st.cell[idx(cx, cy)];
    if (c.k === 'bed') return Infinity;
    let hp = c.hp;
    if (c.by < 0) for (let k = 1; k <= 2 && cy - k >= 0; k++) { const a = st.cell[idx(cx, cy - k)]; if (!a) break; if (a.by >= 0) { hp = Math.max(hp, a.hp); break; } }
    return hp;
  }
  function movesFrom(x, y, J, digW, out, asDug, downPen) {
    out.length = 0;
    const st = G.mst, dc = (cx, cy) => { const h = digHp(cx, cy); return h === Infinity ? Infinity : 1 + digW + h; };
    const tunHere = asDug || tunOK(x, y);
    const sup = y + 1 >= ROWS || zSolid(x, y + 1) || inHeart(x, y + 1) || tunHere;
    if (!sup) { out.push([idx(x, y + 1), 0.3]); return out; }
    for (const d of [-1, 1]) {
      const nx = x + d;
      if (nx < 0 || nx >= COLS) continue;
      if (inHeart(nx, y)) continue;
      if (!zSolid(nx, y)) out.push([idx(nx, y), 1]);
      else {
        const c = dc(nx, y);
        if (c < Infinity) out.push([idx(nx, y), c]);
        for (let k = 1; k <= J; k++) {
          if (y - k < 0 || zSolid(x, y - k)) break;
          if (inHeart(nx, y - k)) break;
          if (!zSolid(nx, y - k)) { out.push([idx(nx, y - k), 1 + 0.5 * k]); break; }
        }
      }
    }
    if (y + 1 < ROWS) {
      if (zSolid(x, y + 1)) { const c = dc(x, y + 1); if (c < Infinity) out.push([idx(x, y + 1), c + (downPen || 0)]); }
      else if (tunHere) out.push([idx(x, y + 1), 1]);
    }
    if (y - 1 >= 0) {
      if (zSolid(x, y - 1)) { const c = dc(x, y - 1); if (c < Infinity) out.push([idx(x, y - 1), c]); }
      else if (tunOK(x, y - 1)) out.push([idx(x, y - 1), 1]);
    }
    return out;
  }
  const goalCells = (() => {
    const g = [];
    for (let y = H0.r0 - 1; y <= H0.r1 + 1; y++) for (let x = H0.c0 - 1; x <= H0.c1 + 1; x++) {
      const corner = (x < H0.c0 || x > H0.c1) && (y < H0.r0 || y > H0.r1);
      if (!corner && !inHeart(x, y)) g.push(idx(x, y));
    }
    return g;
  })();
  const isGoal = new Uint8Array(COLS * ROWS); for (const i of goalCells) isGoal[i] = 1;
  function buildField(key) {
    const { jump, digW, downPen } = ZF.fields[key], N = COLS * ROWS, st = G.mst;
    const rev = Array.from({ length: N }, () => []), tmp = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      // a zombie only stands in open cells; a solid one plans as if dug open (the dig is the cost of stepping in)
      const sol = zSolid(x, y);
      if ((sol && st.cell[idx(x, y)].k === 'bed') || inHeart(x, y)) continue;
      movesFrom(x, y, jump, digW, tmp, sol, downPen);
      for (const [to, c] of tmp) rev[to].push(idx(x, y), c);
    }
    const dist = new Float64Array(N).fill(Infinity), heap = [];
    const push = (i, d) => { heap.push([d, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    for (const g of goalCells) { dist[g] = 0; push(g, 0); }
    while (heap.length) {
      const [d, u] = pop();
      if (d > dist[u]) continue;
      const r = rev[u];
      for (let k = 0; k < r.length; k += 2) { const v = r[k], nd = d + r[k + 1]; if (nd < dist[v]) { dist[v] = nd; push(v, nd); } }
    }
    return dist;
  }
  function fieldsFresh(st) {
    if (st.fieldVer === st.ver) return;
    if (st.fieldT > 0 && st.fields) return; // (at most every 0.2 s while the fort keeps changing)
    st.fields = { w: buildField('w'), h: buildField('h'), d: buildField('d') };
    st.fieldVer = st.ver; st.fieldT = 0.2;
  }

  /* ---------- zombies ---------- */
  function spawnZombie(st, kind, side, under) {
    const z = ZF.zombies[kind], x = side < 0 ? 0 : COLS - 1, sp = st.spec || zfWaveSpec(st.wave);
    let y = ZF.ground - 1;
    if (under) {
      y = ZF.ground + 1 + ((st.zid * 7) % 2); // (2 at most: the shaft a digger leaves in the lane is 3 deep, which a jump gets out of)
      if (st.cell[idx(x, y)] && st.cell[idx(x, y)].k !== 'bed') setCell(x, y, null);
      st.tun[idx(x, y)] = 1; st.ver++;
      puff(x * T + T / 2, y * T + T / 2, 8, '#6b4a34');
    } else {
      while (y > 0 && zSolid(x, y)) y--;
    }
    const hp = Math.round(z.hp * sp.hpK * 10) / 10;
    st.zs.push({ id: st.zid++, kind, cx: x, cy: y, px: x * T + T / 2, py: (y + 1) * T, hp, max: hp,
      speed: z.speed * sp.spdK, dig: z.dig * sp.digK, dps: z.dps * sp.dpsK, face: side < 0 ? 1 : -1, act: null, flash: 0,
      t: Math.random() * 6, groanT: 2 + Math.random() * 6, lurch: 0.8 + Math.random() * 0.4, stagger: 0 });
  }
  const supported = (x, y) => y + 1 >= ROWS || zSolid(x, y + 1) || inHeart(x, y + 1) || tunOK(x, y);
  const zSize = z => (z.kind === 'behemoth' ? [44, 58] : z.kind === 'brute' ? [30, 38] : z.kind === 'leaper' ? [20, 26] : [22, 30]);
  const zRect = z => { const b = zSize(z); return { x: z.px - b[0] / 2, y: z.py - b[1], w: b[0], h: b[1] }; };
  function zChoose(st, z) {
    const zt = ZF.zombies[z.kind], here = idx(z.cx, z.cy);
    if (isGoal[here] && !zSolid(z.cx, z.cy) && supported(z.cx, z.cy)) { z.act = { type: 'chew', t: 0 }; return; }
    const fd = st.fields[zt.field], tmp = st.tmpMoves || (st.tmpMoves = []);
    movesFrom(z.cx, z.cy, zt.jump, ZF.fields[zt.field].digW, tmp, false, ZF.fields[zt.field].downPen);
    let best = null, bv = Infinity;
    for (const [to, c] of tmp) {
      const v = c + fd[to] + ((to * 31 + z.id * 17) % 7) * 0.002;
      if (v < bv) { bv = v; best = to; }
    }
    if (best == null || bv === Infinity) { z.act = { type: 'wait', t: 0, dur: 0.5 }; return; }
    const tx = best % COLS, ty = (best / COLS) | 0;
    if (tx !== z.cx) z.face = tx > z.cx ? 1 : -1;
    if (zSolid(tx, ty)) { z.act = { type: 'dig', tx, ty, t: 0 }; return; }
    const kind = ty < z.cy && tx !== z.cx ? 'jump' : ty > z.cy && !tunOK(z.cx, z.cy) ? 'fall' : ty !== z.cy ? 'climb' : 'walk';
    const dur = kind === 'fall' ? 0.13 : kind === 'jump' ? (0.45 + 0.12 * (z.cy - ty)) / Math.max(0.6, z.speed) : kind === 'climb' ? 0.7 / z.speed : 1 / z.speed;
    z.act = { type: 'move', kind, tx, ty, t: 0, dur, x0: z.cx, y0: z.cy };
  }
  function zTick(st, z, dt) {
    z.t += dt; z.flash = Math.max(0, z.flash - dt);
    if (z.stagger > 0) { z.stagger -= dt; return; }
    if (!z.act) zChoose(st, z);
    let a = z.act;
    // the ground went from under it (dug out by a player): drop
    if (a.type !== 'move' && !supported(z.cx, z.cy)) { zChoose(st, z); a = z.act; }
    a.t += dt;
    if (a.type === 'wait') { if (a.t >= a.dur) z.act = null; }
    else if (a.type === 'chew') {
      // next to the heart: attack it
      if (zSolid(z.cx, z.cy)) { z.act = null; return; }
      heartHit(st, z.dps * dt);
      if (a.t > 0.6) z.act = null; // look again now and then
    } else if (a.type === 'dig') {
      const c = st.cell[idx(a.tx, a.ty)];
      if (!c) { z.act = null; return; }
      c.hp -= z.dig * dt; c.hit = 0.25;
      if ((st.digSfx -= dt) <= 0) { st.digSfx = 0.18; Sfx.play('zombiefortChomp', z.id & 1); }
      if (Math.random() < dt * 6) puff(a.tx * T + T / 2 - z.face * 8, a.ty * T + T / 2, 1, zfCol(c.k).main);
      if (c.hp <= 0) {
        setCell(a.tx, a.ty, null);
        st.tun[idx(a.tx, a.ty)] = 1;
        burst(a.tx * T + T / 2, a.ty * T + T / 2, zfCol(c.k).main, 6);
        if (c.k === 'turret') news(st, 'A turret got knocked out!');
        z.act = null;
      }
    } else if (a.type === 'move') {
      if (zSolid(a.tx, a.ty)) { z.act = null; return; } // a block went in: think again (it will dig)
      const u = Math.min(1, a.t / a.dur);
      const x0 = a.x0 * T + T / 2, y0 = (a.y0 + 1) * T, x1 = a.tx * T + T / 2, y1 = (a.ty + 1) * T;
      if (a.kind === 'jump') {
        // up first, then over the top of the wall
        z.px = x0 + (x1 - x0) * clamp((u - 0.3) / 0.7, 0, 1);
        z.py = y0 + (y1 - y0) * Math.min(1, u / 0.6) - Math.sin(u * Math.PI) * 12;
      } else { z.px = x0 + (x1 - x0) * u; z.py = y0 + (y1 - y0) * u; }
      if (u >= 1) {
        z.cx = a.tx; z.cy = a.ty; z.px = x1; z.py = y1; z.act = null;
        if (a.kind === 'jump') puff(x1, y1, 3, 'rgba(255,255,255,0.5)');
      }
    }
    if (z.act === a && a.type !== 'move') { z.px = z.cx * T + T / 2 + (a.type === 'dig' ? Math.sin(z.t * 30) * 1.5 : 0); z.py = (z.cy + 1) * T; }
    if ((z.groanT -= dt) <= 0) { z.groanT = 4 + Math.random() * 7; if (Math.random() < 0.5) Sfx.play('zombiefortGroan', z.id & 1); }
  }
  function heartHit(st, dmg) {
    if (st.phase !== 'wave') return;
    st.heart = Math.max(0, st.heart - dmg);
    if (st.heartFlash <= 0) st.heartFlash = 0.3; // a blink now and then while it's being hit, not solid white
    if ((st.heartSfx -= DT) <= 0) { st.heartSfx = 0.5; Sfx.play('zombiefortHeart'); }
    if (!st.heartWarned && st.heart < 40) { st.heartWarned = true; news(st, 'The heart is in danger! Stop the zombies attacking it!'); }
    if (st.heart <= 0) gameOver(st);
  }
  function hurtZombie(st, z, dmg, by, push) {
    if (z.hp <= 0) return;
    z.hp -= dmg; z.flash = 0.12;
    if (push && z.kind !== 'behemoth') z.stagger = Math.max(z.stagger || 0, 0.12);
    Sfx.play('zombiefortHit', by >= 0 ? by : 0);
    for (let k = 0; k < 3; k++) G.particles.push({ x: z.px, y: z.py - 18, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 120, life: 0.4, max: 0.4, col: '#4f6a3e', size: 2 + Math.random() * 2, grav: 600, kind: 'dot' });
    if (z.hp <= 0) {
      const zt = ZF.zombies[z.kind];
      st.coins += zt.coins; st.stats.coins += zt.coins;
      if (by >= 0) st.stats.downed[by]++; else st.stats.turret++;
      st.pops.push({ x: z.px, y: z.py - 34, t: 0, s: '+' + zt.coins });
      st.corpses.push({ x: z.px, y: z.py, face: z.face, kind: z.kind, id: z.id, t: 0 });
      Sfx.play('zombiefortDown', by >= 0 ? by : 0);
      if (z.kind === 'behemoth') news(st, 'The Behemoth is down!');
    }
  }

  /* ---------- trees ---------- */
  // a tree stands only while the ground under it is still there and the trunk cell is open
  const treeUp = t => t.wood > 0 && !cellAt(t.col, ZF.ground - 1) && !!cellAt(t.col, ZF.ground);
  function treesTick(st, dt) {
    for (const t of st.trees) {
      if (t.wood > 0) { t.shake = Math.max(0, t.shake - dt); continue; }
      t.regrowT -= dt;
      if (t.regrowT <= 0 && !cellAt(t.col, ZF.ground - 1) && cellAt(t.col, ZF.ground)) { t.wood = ZF.treeWood; t.grow = 0; }
    }
    for (const t of st.trees) if (t.grow < 1) t.grow = Math.min(1, t.grow + dt / 1.5);
  }

  /* ---------- players: shoot, build, buy ---------- */
  // what a hold of the action would do right now: { op: 'place'|'dig'|'take'|'fix'|'buy'|'chop'|null, x, y, ... }
  // (op null may carry `why`, said when the hold comes due)
  const cracked = c => playerBlock(c) && c.hp < c.max - 0.01;
  // (lock: the kind of job a running hold started with; a dig hold keeps digging down to 3 deep)
  function zfTarget(p, lock) {
    if (!p.alive) return { op: null };
    const st = G.mst;
    const cxp = p.x + p.w / 2, col = Math.floor(cxp / T), feet = Math.floor((p.y + p.h - 1) / T), f = p.face;
    // ▼ + hold on a pad or by the heart: buy
    if (p.grounded && p.input.down && feet === ZF.pads.row) {
      if (col === ZF.pads.guns) return { op: 'buy', what: 'gun', x: col, y: feet };
      if (col === ZF.pads.turret) return { op: 'buy', what: 'turret', x: col, y: feet };
      if (col >= H0.c0 && col <= H0.c1) return { op: 'buy', what: 'heart', x: col, y: feet };
    }
    // the cell column just in front of your body (not the one you overlap)
    const fx = f > 0 ? Math.ceil((p.x + p.w - 0.01) / T) : Math.floor((p.x + 0.01) / T) - 1; // (0.01: the same inset moveX/moveY use)
    if (p.grounded && !p.input.down && feet === ZF.ground - 1) {
      // a tree you stand at, or one right in front of you (unless the block in front needs fixing)
      let t = st.trees.find(q => treeUp(q) && Math.abs(cxp - (q.col * T + T / 2)) < 16);
      if (!t && !cracked(cellAt(fx, feet))) t = st.trees.find(q => treeUp(q) && q.col === fx);
      if (t) return { op: 'chop', tree: t, x: t.col, y: feet };
    }
    if (!p.grounded) return { op: 'place', x: col, y: feet + 1, under: true };
    if (fx < 0 || fx >= COLS || isLane(fx)) return { op: null, why: 'Zombie lane!' };
    if (p.input.down) {
      // the column below-front, 3 deep: dig natural ground out (a dig hold goes on down), take back one of your
      // blocks, or fill a hole from the bottom up
      if (lock === 'dig') {
        for (let y = feet + 1; y <= feet + 3 && y < ROWS; y++) { const c = cellAt(fx, y); if (!c) continue; if (natural(c)) return { op: 'dig', x: fx, y }; break; }
      }
      const c1 = cellAt(fx, feet + 1);
      if (c1) return natural(c1) ? { op: 'dig', x: fx, y: feet + 1 } : c1.k === 'bed' ? { op: null, why: 'Bedrock!' } : { op: 'take', x: fx, y: feet + 1 };
      let y = feet + 1;
      while (y < feet + 3 && y + 1 < ROWS && !cellAt(fx, y + 1)) y++;
      return { op: 'place', x: fx, y };
    }
    const c0 = cellAt(fx, feet);
    if (natural(c0)) return { op: 'dig', x: fx, y: feet };
    for (let y = feet; y >= feet - 2; y--) if (!cellAt(fx, y)) return { op: 'place', x: fx, y };
    // the wall in front is full: fix the lowest cracked block first, then upgrade the lowest one that can be
    for (let y = feet; y >= feet - 2; y--) if (cracked(cellAt(fx, y))) return { op: 'fix', x: fx, y };
    for (let y = feet; y >= feet - 2; y--) { const c = cellAt(fx, y); if (playerBlock(c) && upCost(c.k)) return { op: 'fix', x: fx, y }; }
    return { op: 'fix', x: fx, y: feet };
  }
  // the material a new block is made of: the strongest the team has (a turret in your hands goes first)
  const material = (st, p) => (st.carry[p.id] ? 'turret' : st.res.stone > 0 ? 'stone' : st.res.wood > 0 ? 'wood' : st.res.dirt > 0 ? 'dirt' : null);
  // can a block go in this cell? null, or a short reason
  function canPlace(x, y) {
    if (x < 0 || x >= COLS || y < ZF.ceilRow || y >= ZF.bedRow) return 'Too high!';
    if (isLane(x)) return 'Zombie lane!';
    if (inHeart(x, y) || isPad(x, y)) return 'Not there!';
    if ((x === ZF.pads.guns || x === ZF.pads.turret) && y >= ZF.pads.row - 3 && y < ZF.pads.row) return 'Keep the pad clear!';
    if (cellAt(x, y)) return 'Full!';
    // a pad always keeps one side you can jump out over: the walls next to it are not both taller than 3
    for (const pc of [ZF.pads.guns, ZF.pads.turret]) {
      if (Math.abs(x - pc) !== 1 || y > ZF.pads.row - 3 || y < ZF.pads.row - 4) continue;
      const ox = 2 * pc - x;
      if (cellAt(ox, ZF.pads.row - 3) || cellAt(ox, ZF.pads.row - 4)) return 'Keep the pad clear!';
    }
    if (y === ZF.ground - 1 && G.mst.trees.some(t => t.col === x && treeUp(t))) return 'Chop the tree first!';
    const rx = x * T, ry = y * T;
    for (const q of G.players) if (q.alive && rectHit(q, rx + 0.01, ry + 0.01, T - 0.02, T - 0.02)) return 'In the way!'; // (0.01, as moveX/moveY: a block never goes in overlapping a body)
    for (const z of G.mst.zs) {
      if (z.hp <= 0) continue;
      if (z.cx === x && z.cy === y) return 'Zombie!';
      if (z.act && z.act.type === 'move' && z.act.tx === x && z.act.ty === y) return 'Zombie!';
      const r = zRect(z);
      if (rx + 2 < r.x + r.w && rx + T - 2 > r.x && ry + 2 < r.y + r.h && ry + T - 2 > r.y) return 'Zombie!';
    }
    return null;
  }
  function doHold(st, p, tg, op) {
    const s = st.stats;
    if (tg.op !== op) return false;
    if (op === 'chop') {
      const t = tg.tree;
      if (!treeUp(t)) return false;
      t.wood--; t.shake = 0.3; st.res.wood++; s.wood[p.id]++;
      for (let k = 0; k < 4; k++) G.particles.push({ x: t.col * T + T / 2, y: (ZF.ground - 1) * T + 6, vx: (Math.random() - 0.5) * 140, vy: -60 - Math.random() * 100, life: 0.5, max: 0.5, col: '#b98a55', size: 2.5, grav: 500, kind: 'dot' });
      Sfx.play('zombiefortChop', p.id);
      if (t.wood <= 0) { t.regrowT = ZF.regrow; news(st, 'Timber! The tree grows back in ' + ZF.regrow + ' s'); }
      return true;
    }
    if (op === 'dig') {
      const c = cellAt(tg.x, tg.y);
      if (!natural(c) || isLane(tg.x)) return false;
      if (c.k === 'stone' && ++c.mine < ZF.stoneHits) { c.hit = 0.2; Sfx.play('zombiefortMine', p.id); puff(tg.x * T + T / 2, tg.y * T + T / 2, 3, '#b0b6c8'); return true; }
      setCell(tg.x, tg.y, null);
      st.res[c.k]++; s.dug[p.id]++;
      burst(tg.x * T + T / 2, tg.y * T + T / 2, zfCol(c.k).main, 6);
      Sfx.play(c.k === 'stone' ? 'zombiefortMine' : 'zombiefortDig', p.id);
      return true;
    }
    if (op === 'take') {
      const c = cellAt(tg.x, tg.y);
      if (!playerBlock(c)) return false;
      if (c.k === 'turret') {
        if (st.carry[p.id]) { say(st, p, 'Your hands are full!'); return false; }
        st.carry[p.id] = true;
      } else st.res[c.k === 'metal' ? 'stone' : c.k]++;
      setCell(tg.x, tg.y, null);
      burst(tg.x * T + T / 2, tg.y * T + T / 2, zfCol(c.k).main, 6);
      Sfx.play('zombiefortDig', p.id);
      return 'stop'; // one block back per hold
    }
    if (op === 'place') {
      const why = canPlace(tg.x, tg.y);
      if (why) { if (why !== 'In the way!' || !tg.under) say(st, p, why); return false; }
      const m = material(st, p);
      if (!m) { say(st, p, 'Nothing to build with! Dig or chop'); return false; }
      if (m === 'turret') { st.carry[p.id] = false; st.tcd[idx(tg.x, tg.y)] = 0.5; news(st, NAMES[p.id] + ' set up a turret!'); }
      else st.res[m]--;
      setCell(tg.x, tg.y, mk(m, p.id));
      s.built[p.id]++;
      puff(tg.x * T + T / 2, tg.y * T + T, 5, 'rgba(255,255,255,0.7)');
      Sfx.play('zombiefortPlace', p.id);
      return true;
    }
    if (op === 'fix') {
      const c = cellAt(tg.x, tg.y);
      if (!playerBlock(c)) return false;
      if (c.hp < c.max - 0.01) { c.hp = c.max; st.ver++; Sfx.play('zombiefortPlace', p.id); s.fixed[p.id]++; sparkle(tg.x, tg.y); return true; }
      const cost = payCost(st, c.k);
      if (!cost) { say(st, p, c.k === 'turret' ? 'Turret is fine!' : 'Metal is the strongest!'); return false; }
      if (!canPay(st, cost)) { say(st, p, 'Upgrade needs ' + costWords(upCost(c.k)) + (coinAlt(c.k) ? ' or ' + costWords(coinAlt(c.k)) : '')); return false; }
      pay(st, cost);
      const nx = ZF.kinds[c.k].next;
      c.k = nx; c.hp = c.max = ZF.kinds[nx].hp; c.mine = 0; st.ver++;
      s.upgraded[p.id]++; sparkle(tg.x, tg.y); Sfx.play('zombiefortBuy', p.id);
      return cost.coins ? 'stop' : true; // an upgrade that cost coins ends the hold, so one hold can't spend them all
    }
    if (op === 'buy') {
      if (tg.what === 'gun') {
        const lv = st.gun[p.id];
        if (lv >= ZF.guns.length - 1) { say(st, p, 'Best gun already!'); return false; }
        const cost = ZF.gunCost[lv + 1];
        if (st.coins < cost) { say(st, p, ZF.guns[lv + 1].name + ' costs ' + cost + ' coins'); return false; }
        st.coins -= cost; st.gun[p.id] = lv + 1;
        news(st, NAMES[p.id] + ' got the ' + ZF.guns[lv + 1].name + '!');
      } else if (tg.what === 'turret') {
        if (st.carry[p.id]) { say(st, p, 'Place your turret first'); return false; }
        if (turretCount(st) + (st.carry[0] ? 1 : 0) + (st.carry[1] ? 1 : 0) >= ZF.turretMax) { say(st, p, 'No more turrets'); return false; }
        if (st.coins < ZF.turretCost) { say(st, p, 'A turret costs ' + ZF.turretCost + ' coins'); return false; }
        st.coins -= ZF.turretCost; st.carry[p.id] = true;
        news(st, NAMES[p.id] + ' has a turret: hold ' + key(p.id, 'act') + ' to place it like a block');
      } else {
        if (st.heart >= ZF.heartMax - 0.5) { say(st, p, 'The heart is full!'); return false; }
        if (st.coins < ZF.repairCost) { say(st, p, 'Healing costs ' + ZF.repairCost + ' coins'); return false; }
        st.coins -= ZF.repairCost; st.heart = Math.min(ZF.heartMax, st.heart + ZF.repairHp); st.heartWarned = st.heart < 40;
        news(st, 'The heart is healed: +' + ZF.repairHp + ' HP');
      }
      s.bought[p.id]++;
      Sfx.play('zombiefortBuy', p.id);
      burst(p.x + p.w / 2, p.y, C.gold, 12);
      return true;
    }
    return false;
  }
  const turretCount = st => st.cell.reduce((n, c) => n + (c && c.k === 'turret' ? 1 : 0), 0);
  function sparkle(x, y) { burst(x * T + T / 2, y * T + T / 2, C.gold, 7); }
  function say(st, p, s) { const b = st.say[p.id]; if (b && b.s === s && b.t < 1) return; st.say[p.id] = { s, t: 0 }; Sfx.play('zombiefortNo', p.id); }
  function news(st, s) { st.news = { s, t: 0 }; }
  function fire(st, p) {
    const g = ZF.guns[st.gun[p.id]], f = p.face, low = p.input.down;
    const base = low ? Math.PI / 4 : 0, n = g.pellets || 1;
    for (let k = 0; k < n; k++) {
      const a = base + (n > 1 ? (k / (n - 1) - 0.5) * g.spread : 0) + (g.jitter ? (Math.random() - 0.5) * g.jitter : 0);
      const vx = Math.cos(a) * g.v * f, vy = Math.sin(a) * g.v;
      st.shots.push({ x: p.x + p.w / 2 + f * 10, y: p.y + 11, vx, vy, dmg: g.dmg, kind: g.kind, splash: g.splash || 0, pierce: !!g.pierce, life: g.life, by: p.id, hit: [] });
    }
    st.cd[p.id] = g.cd; st.stats.shots[p.id]++;
    puff(p.x + p.w / 2 + f * 16, p.y + 11, 2, 'rgba(255,230,160,0.9)');
    Sfx.play(g.kind === 'rocket' ? 'zombiefortRocket' : g.kind === 'laser' ? 'zombiefortLaser' : 'zombiefortShoot', p.id);
  }
  function shotsTick(st, dt) {
    for (let i = st.shots.length - 1; i >= 0; i--) {
      const d = st.shots[i];
      d.life -= dt;
      if (d.homing) { const z = st.zs.find(q => q.id === d.homing && q.hp > 0); if (z) { const a = Math.atan2(z.py - 14 - d.y, z.px - d.x), sp = Math.hypot(d.vx, d.vy); d.vx = Math.cos(a) * sp; d.vy = Math.sin(a) * sp; } }
      if (d.kind === 'rocket' && Math.random() < dt * 40) puff(d.x, d.y, 1, 'rgba(200,200,210,0.7)');
      const nx = d.x + d.vx * dt, ny = d.y + d.vy * dt;
      let gone = d.life <= 0 || nx < -20 || nx > W + 20 || ny > H;
      if (gone && d.splash && d.life <= 0) splash(st, d, d.x, d.y);
      if (!gone && !d.ghost) {
        const tx = Math.floor(nx / T), ty = Math.floor(ny / T);
        if (tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS && st.cell[idx(tx, ty)]) { gone = true; puff(nx, ny, 3, 'rgba(255,240,200,0.8)'); if (d.splash) splash(st, d, nx, ny); }
      }
      d.x = nx; d.y = ny;
      if (!gone) for (const z of st.zs) {
        if (z.hp <= 0 || d.hit.includes(z.id)) continue;
        const r = zRect(z);
        if (d.x > r.x - 4 && d.x < r.x + r.w + 4 && d.y > r.y - 4 && d.y < r.y + r.h + 4) {
          d.hit.push(z.id);
          if (d.splash) splash(st, d, d.x, d.y); else hurtZombie(st, z, d.dmg, d.by, true);
          if (!d.pierce) { gone = true; break; }
        }
      }
      if (gone) st.shots.splice(i, 1);
    }
  }
  function splash(st, d, x, y) {
    if (d.splashed) return; d.splashed = true;
    for (const z of st.zs) if (z.hp > 0 && Math.hypot(z.px - x, z.py - 14 - y) < d.splash + 12) hurtZombie(st, z, d.dmg, d.by, true);
    burst(x, y, '#ffb347', 16); puff(x, y, 10, 'rgba(90,90,100,0.8)');
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.12);
    Sfx.play('zombiefortBoom');
  }
  function turretsTick(st, dt) {
    for (let i = 0; i < st.cell.length; i++) {
      const c = st.cell[i];
      if (!c || c.k !== 'turret') continue;
      st.tcd[i] = (st.tcd[i] || 0) - dt;
      if (st.tcd[i] > 0) continue;
      const x = (i % COLS) * T + T / 2, y = ((i / COLS) | 0) * T + 8;
      let best = null, bd = ZF.turretRange;
      const tx0 = i % COLS, ty0 = (i / COLS) | 0;
      for (const z of st.zs) { if (z.hp <= 0) continue; const dd = Math.hypot(z.px - x, z.py - 14 - y); if (dd < bd && clearShot(st, x, y, z.px, z.py - 14, tx0, ty0)) { bd = dd; best = z; } }
      if (!best) continue;
      st.tcd[i] = ZF.turretCD;
      const a = Math.atan2(best.py - 14 - y, best.px - x);
      c.aim = a;
      st.shots.push({ x, y, vx: Math.cos(a) * 700, vy: Math.sin(a) * 700, dmg: 1, kind: 'tbullet', life: 0.7, by: -1, hit: [], ghost: true, homing: best.id });
      Sfx.play('zombiefortTurret');
    }
  }
  // can a turret at cell (tx0, ty0) see this point? Natural ground and bedrock block it (no shooting zombies that
  // tunnel underground); the team's own blocks don't (it shoots over its wall)
  function clearShot(st, x0, y0, x1, y1, tx0, ty0) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (T / 3));
    for (let k = 1; k < n; k++) {
      const cx = Math.floor((x0 + (x1 - x0) * k / n) / T), cy = Math.floor((y0 + (y1 - y0) * k / n) / T);
      if (Math.abs(cx - tx0) <= 1 && Math.abs(cy - ty0) <= 1) continue;
      const c = cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS ? st.cell[idx(cx, cy)] : null;
      if (c && c.by < 0) return false;
    }
    return true;
  }
  // a zombie touched a player: damage and knock-back
  function hitPlayer(st, p, z) {
    const k = p.id, zt = ZF.zombies[z.kind], sp = st.spec || zfWaveSpec(st.wave);
    const dmg = Math.round(zt.hit * Math.sqrt(sp.dpsK));
    st.php[k] = Math.max(0, st.php[k] - dmg); st.inv[k] = ZF.invuln; st.calm[k] = 0; st.hurtFlash[k] = 0.3;
    const dir = p.x + p.w / 2 < z.px ? -1 : 1;
    knock(p, dir * ZF.knockV * (z.kind === 'behemoth' ? 1.5 : 1), -280, 0.25, 0.35);
    rumble(k, 0.6, 0.4, 140);
    Sfx.play('zombiefortOuch', k);
    st.stats.hits[k]++;
    if (st.php[k] <= 0) down(st, p);
  }
  function down(st, p) {
    const k = p.id;
    st.stats.downs[k]++;
    burst(p.x + p.w / 2, p.y + p.h / 2, PCOL[k], 14);
    p.alive = false; p.respawnT = ZF.respawn;
    st.downAt[k] = { x: p.x + p.w / 2, y: p.y + p.h };
    news(st, NAMES[k] + ' is down! Back in ' + ZF.respawn + ' s');
    Sfx.play('zombiefortKO', k);
  }

  /* ---------- waves ---------- */
  function planWave(st) {
    const spec = st.spec = zfWaveSpec(st.wave), list = [];
    for (const [k, n] of Object.entries(spec.mix)) for (let i = 0; i < n; i++) list.push(k);
    let s = st.wave * 7919 + 13;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    // the Behemoth comes half way through
    const bs = list.filter(k => k === 'behemoth'), rest = list.filter(k => k !== 'behemoth');
    rest.splice(Math.floor(rest.length / 2), 0, ...bs);
    let t = 1.5, side = st.wave % 2 ? -1 : 1;
    st.queue = rest.map((k, i) => {
      if (i % 3 === 0) side = -side;
      const e = { kind: k, side, under: k === 'digger' && i % 2 === 1, t };
      t += spec.gap * (0.6 + rnd() * 0.8);
      return e;
    });
    st.waveTotal = rest.length;
  }
  function startWave(st) {
    st.phase = 'wave'; st.waveT = 0; st.readyT = 0;
    planWave(st);
    Sfx.play('zombiefortWave');
    news(st, st.wave % 10 === 0 ? 'Wave ' + st.wave + ': the Behemoth is coming!' : 'Wave ' + st.wave + ': here they come!');
  }
  function fortSize(st) {
    let minX = Infinity, maxX = -Infinity, tall = 0;
    for (let x = 0; x < COLS; x++) {
      let h = 0, run = 0;
      for (let y = ZF.ground - 1; y >= 0; y--) { const c = st.cell[idx(x, y)]; if (playerBlock(c)) { run++; h = Math.max(h, run); } else run = 0; }
      if (h) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); tall = Math.max(tall, h); }
    }
    return { wide: maxX >= minX ? maxX - minX + 1 : 0, tall };
  }
  function waveCleared(st) {
    const f = fortSize(st), bonus = Math.min(30, Math.floor(f.wide / 2) + f.tall * 2) + 4;
    st.coins += bonus; st.stats.coins += bonus;
    if (f.wide * 100 + f.tall > st.stats.bestFort.wide * 100 + st.stats.bestFort.tall) st.stats.bestFort = f;
    st.stats.waves = st.wave;
    st.wave++; st.phase = 'build'; st.buildT = ZF.breakT; st.heartWarned = st.heart < 40;
    news(st, 'Wave ' + (st.wave - 1) + ' survived! Fort bonus (' + f.wide + ' wide, ' + f.tall + ' tall): +' + bonus + ' coins');
    Sfx.play('zombiefortClear');
  }
  function gameOver(st) {
    if (st.phase === 'over') return;
    st.phase = 'over'; st.overT = 0;
    st.stats.waves = st.wave - 1;
    const best = store.get(recKey());
    st.best = best; st.newBest = best == null || st.stats.waves > best;
    if (st.newBest) store.set(recKey(), st.stats.waves);
    news(st, 'The zombies broke the heart!');
    Sfx.play('zombiefortLose');
  }

  /* ---------- the mode ---------- */
  MODES.zombiefort = {
    medals: { bronze: 'Defend the heart (any stand counts)', goals: [{ key: 'waves', gold: ZF.medal.gold, silver: ZF.medal.silver, more: true, word: 'wave' }] },
    medalValues() { const s = G.mst.stats; return { waves: s ? s.waves : 0 }; },
    setup(st, L) {
      const N = COLS * ROWS;
      st.cell = new Array(N).fill(null); st.tun = new Array(N).fill(0); st.ver = 1; st.fieldVer = -1; st.fieldT = 0; st.fields = null;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const k = y >= ZF.bedRow ? 'bed' : y >= ZF.stoneRow ? 'stone' : y >= ZF.ground ? 'dirt' : null;
        st.cell[idx(x, y)] = k ? mk(k) : null;
        L.grid[y][x] = k ? '#' : '.';
      }
      st.trees = ZF.trees.map((col, i) => ({ col, wood: ZF.treeWood, regrowT: 0, shake: 0, grow: 1, h: 3 + (i % 3 === 1 ? 1 : 0) }));
      st.phase = 'build'; st.wave = 1; st.buildT = ZF.grace; st.readyT = 0; st.waveT = 0; st.spec = null;
      st.heart = ZF.heartMax; st.heartFlash = 0; st.heartSfx = 0; st.digSfx = 0; st.heartWarned = false;
      st.res = { dirt: ZF.start.dirt, wood: ZF.start.wood, stone: ZF.start.stone }; st.coins = ZF.start.coins;
      st.gun = [0, 0]; st.carry = [false, false]; st.tcd = {};
      st.php = [ZF.playerHp, ZF.playerHp]; st.inv = [0, 0]; st.calm = [9, 9]; st.hurtFlash = [0, 0]; st.downAt = [null, null];
      st.zs = []; st.zid = 1; st.queue = []; st.shots = []; st.pops = []; st.corpses = [];
      st.hold = [null, null]; st.latch = [false, false]; st.cd = [0, 0]; st.say = [null, null]; st.news = null;
      st.idle = false; st.overT = 0; st.ended = false; st.hintT = 0; st.usedHold = [false, false]; st.usedTap = [false, false];
      st.best = null; st.newBest = false;
      st.stats = { downed: [0, 0], built: [0, 0], dug: [0, 0], wood: [0, 0], fixed: [0, 0], upgraded: [0, 0], bought: [0, 0], shots: [0, 0],
        hits: [0, 0], downs: [0, 0], turret: 0, coins: 0, waves: 0, bestFort: { wide: 0, tall: 0 }, playT: 0 };
      G.spawnPts = [0, 1].map(k => ({ x: (k ? ZF.pads.turret : ZF.pads.guns) * T + (T - PW) / 2, y: (ZF.pads.row + 1) * T - PH }));
      news(st, 'Build your fort! The zombies come in ' + Math.round(ZF.grace / 60) + ' minutes.');
    },
    step(dt) {
      const st = G.mst, ps = G.players;
      if (st.ended) return;
      st.fieldT -= dt;
      // the wait: no person pressed anything for a while
      const humans = ps.filter(p => !cpuOn(p.id));
      const wasIdle = st.idle;
      st.idle = humans.length > 0 && humans.every(p => (CPU.idle[p.id] || 0) >= ZF.idleAfter) && (st.phase === 'wave' || st.phase === 'build');
      if (wasIdle && !st.idle) news(st, 'The zombies are moving again!');
      for (const k of [0, 1]) { const b = st.say[k]; if (b && (b.t += dt) > 1.6) st.say[k] = null; st.hurtFlash[k] = Math.max(0, st.hurtFlash[k] - dt); }
      if (st.news && (st.news.t += dt) > ZF.newsLife) st.news = null;
      for (let i = st.pops.length - 1; i >= 0; i--) if ((st.pops[i].t += dt) > 1) st.pops.splice(i, 1);
      for (let i = st.corpses.length - 1; i >= 0; i--) if ((st.corpses[i].t += dt) > 1.4) st.corpses.splice(i, 1);
      st.heartFlash = Math.max(0, st.heartFlash - dt);
      if (st.phase === 'over') {
        st.overT += dt;
        for (const z of st.zs) z.t += dt;
        if (st.overT > ZF.overT && !st.ended) { st.ended = true; levelClear(); }
        return;
      }
      if (st.idle) return;
      if (G.introT > 0) return;
      st.hintT += dt; st.stats.playT += dt;
      treesTick(st, dt);
      // players: health, cooldowns, shooting, holding to work or buy
      for (const p of ps) {
        const k = p.id;
        st.cd[k] = Math.max(0, st.cd[k] - dt);
        st.inv[k] = Math.max(0, st.inv[k] - dt);
        if (!p.alive) { st.hold[k] = null; continue; }
        st.calm[k] += dt;
        if (st.calm[k] > ZF.regenAfter) st.php[k] = Math.min(ZF.playerHp, st.php[k] + ZF.regen * dt);
        if (p.pendingAct && st.cd[k] <= 0) { p.pendingAct = false; fire(st, p); st.usedTap[k] = true; }
        if (st.latch[k] && !p.input.act) st.latch[k] = false; // (a hold carried through a respawn does nothing)
        if (p.input.act && !st.latch[k]) {
          const h = st.hold[k] || (st.hold[k] = { t: 0, next: 0, op: null, done: false });
          h.t += dt;
          const tg = zfTarget(p, h.op);
          const need = tg.op === 'buy' ? ZF.holdBuy : ZF.holdBuild;
          if (h.t >= need && !h.done && h.t >= h.next) {
            if (!h.op) h.op = tg.op;
            if (h.op) {
              st.usedHold[k] = true;
              const ok = doHold(st, p, tg, h.op);
              if (h.op === 'buy' || ok === 'stop') h.done = true;
              h.next = h.t + (ok ? (h.op === 'chop' ? ZF.chopRep : ZF.buildRep) : 0.12);
            } else if (tg.why) { say(st, p, tg.why); h.next = h.t + 0.5; }
          }
        } else st.hold[k] = null;
      }
      // zombies touching players
      for (const p of ps) {
        if (!p.alive || st.inv[p.id] > 0) continue;
        for (const z of st.zs) {
          if (z.hp <= 0 || z.stagger > 0) continue;
          const r = zRect(z);
          if (rectHit(p, r.x + 3, r.y + 3, r.w - 6, r.h - 3)) { hitPlayer(st, p, z); break; }
        }
      }
      // build time / waves
      if (st.phase === 'build') {
        st.buildT -= dt;
        // ready early: both stand still by the heart holding ▼ (not the action: that's digging or healing)
        const atHeart = p => p.alive && p.grounded && p.input.down && !p.input.act && !p.input.left && !p.input.right &&
          Math.abs(p.x + p.w / 2 - HX) < 2.2 * T && Math.floor((p.y + p.h - 1) / T) === ZF.pads.row;
        if (ps.every(atHeart)) { st.readyT += dt; if (st.readyT >= ZF.readyHold) st.buildT = 0; } else st.readyT = 0;
        if (st.buildT <= 0) startWave(st);
      } else if (st.phase === 'wave') {
        st.waveT += dt;
        while (st.queue.length && st.queue[0].t <= st.waveT) { const e = st.queue.shift(); spawnZombie(st, e.kind, e.side, e.under); }
        fieldsFresh(st);
        for (const z of st.zs) if (z.hp > 0) zTick(st, z, dt);
        if (st.phase !== 'wave') return;
        turretsTick(st, dt);
      }
      shotsTick(st, dt);
      st.zs = st.zs.filter(z => z.hp > 0);
      if (st.phase === 'wave' && !st.queue.length && !st.zs.length) waveCleared(st);
    },
    onRespawn(p) { const st = G.mst; st.latch[p.id] = true; st.inv[p.id] = 1.5; st.php[p.id] = ZF.playerHp; st.calm[p.id] = 9; },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const words = s.waves >= ZF.medal.gold ? 'An amazing stand! ' : s.waves >= ZF.medal.silver ? 'A strong fort and a long fight! ' : 'Build wider and taller next time! ';
      const rec = st.newBest ? 'New best!' : 'Best: ' + st.best + ' waves';
      return [
        { label: 'Waves survived', value: String(s.waves) },
        { label: 'Zombies stopped', values: s.downed.slice() },
        { label: 'Blocks built', values: s.built.slice() },
        words + rec + ' · Time ' + fmtTime(s.playT) + ' · Biggest fort: ' + s.bestFort.wide + ' wide, ' + s.bestFort.tall + ' tall' + (s.turret ? ' · Turrets stopped ' + s.turret : '') + ' · Times down: ' + (s.downs[0] + s.downs[1]),
      ];
    },
    // the game ends with the heart falling: no clear party, and the results card says how long you held
    quietClear() { return true; },
    resultTitle() { const n = G.mst.stats ? G.mst.stats.waves : 0; return 'You held ' + n + ' wave' + (n === 1 ? '' : 's') + '!'; },
    draw() { zfDraw(); },
    drawTop() { zfDrawTop(); },
    hud() { zfHUD(); },
    // for the computer brain and tests
    target: zfTarget, cellAt, solid: zSolid, canPlace, isPad, inHeart, isLane, fortSize, material, treeUp, upCost, payCost, canPay, zRect, HX, HY,
    test: { startWave, waveCleared, gameOver, spawnZombie, buildField },
  };

  /* ---------- drawing ---------- */
  const COLS_K = {
    dirt: { main: '#7a5034', dark: '#5c3a24', light: '#94643f' }, wood: { main: '#a8743f', dark: '#6e4824', light: '#c48e55' },
    stone: { main: '#7f8494', dark: '#555a69', light: '#a1a6b4' }, metal: { main: '#8fa3b2', dark: '#55687a', light: '#cfdde6' },
    turret: { main: '#6c7686', dark: '#40495a', light: '#a7b1c2' }, bed: { main: '#2d2833', dark: '#1c1922', light: '#3c3644' },
  };
  function zfCol(k) { return COLS_K[k] || COLS_K.dirt; }
  const ZF_SHADE = {}, zfShade = (c, t) => ZF_SHADE[c + t] || (ZF_SHADE[c + t] = shade(c, t));
  function drawCell(st, x, y, c) {
    const px = x * T, py = y * T, k = zfCol(c.k), h = hash(x, y);
    ctx.fillStyle = k.main; ctx.fillRect(px - 0.5, py - 0.5, T + 1, T + 1);
    if (c.k === 'dirt') {
      ctx.fillStyle = k.dark; for (let i = 0; i < 3; i++) { circle(px + 5 + ((h >> (i * 3)) % 20), py + 6 + ((h >> (i * 4 + 2)) % 18), 2); ctx.fill(); }
      if (h % 5 === 0) { ctx.fillStyle = '#8a7d6e'; ctx.beginPath(); ctx.ellipse(px + 8 + ((h >> 6) % 16), py + 12 + ((h >> 9) % 12), 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#a89a88'; circle(px + 7 + ((h >> 6) % 16), py + 11 + ((h >> 9) % 12), 1.2); ctx.fill(); }
      if (h % 7 === 1) { ctx.strokeStyle = 'rgba(220,190,150,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px + 4 + (h % 10), py + 8 + ((h >> 4) % 10)); ctx.quadraticCurveTo(px + 14, py + 18, px + 24, py + 14 + ((h >> 8) % 8)); ctx.stroke(); }
      if (c.by >= 0) { ctx.strokeStyle = k.dark; ctx.lineWidth = 2; ctx.strokeRect(px + 1, py + 1, T - 2, T - 2); }
      else if (!cellAt(x, y - 1) && y > 0) { ctx.fillStyle = C.grassDark; ctx.fillRect(px, py, T, 7); ctx.fillStyle = C.grass; ctx.fillRect(px, py, T, 5); for (let i = 0; i < 3; i++) { circle(px + 5 + i * 10, py + 5, 2.5); ctx.fill(); } }
    } else if (c.k === 'bed') {
      ctx.fillStyle = k.light; rr(px + 4 + (h % 12), py + 8, 8, 4, 2); ctx.fill();
    } else if (c.k === 'wood') {
      ctx.fillStyle = k.dark; ctx.fillRect(px, py + 9, T, 2); ctx.fillRect(px, py + 19, T, 2);
      ctx.fillStyle = k.light; ctx.fillRect(px + 2, py + 2, T - 4, 3);
      ctx.fillStyle = zfShade(k.main, 0.14); ctx.beginPath(); ctx.rect(px, py + 21, T, T - 21); ctx.fill();
      ctx.strokeStyle = zfShade(k.main, 0.2); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px + 3, py + 6 + (h % 3)); ctx.lineTo(px + T - 3, py + 6 + ((h >> 2) % 3)); ctx.moveTo(px + 3, py + 15 + ((h >> 4) % 3)); ctx.lineTo(px + T - 3, py + 15); ctx.stroke();
      ctx.fillStyle = zfShade(k.main, 0.3); ctx.beginPath(); ctx.ellipse(px + 7 + ((h >> 5) % 18), py + 25, 2.2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#cfd3da'; ctx.beginPath(); for (const a of [3, T - 5]) { ctx.rect(px + a, py + 9, 2, 2); ctx.rect(px + a, py + 19, 2, 2); } ctx.fill();
      ctx.strokeStyle = k.dark; ctx.lineWidth = 2; ctx.strokeRect(px + 1, py + 1, T - 2, T - 2);
    } else if (c.k === 'stone') {
      if (c.by >= 0) {
        ctx.fillStyle = k.dark; ctx.fillRect(px, py + 14, T, 2); ctx.fillRect(px + 14, py, 2, 14); ctx.fillRect(px + 6, py + 16, 2, 14); ctx.fillRect(px + 22, py + 16, 2, 14);
        ctx.fillStyle = zfShade(k.main, 0.12); ctx.beginPath(); ctx.rect(px + 1, py + 10, T - 2, 4); ctx.rect(px + 1, py + 26, T - 2, 5); ctx.fill();
        ctx.fillStyle = k.light; ctx.fillRect(px + 2, py + 2, 10, 3); ctx.fillRect(px + 17, py + 2, 10, 3); ctx.fillRect(px + 9, py + 18, 11, 2);
        ctx.strokeStyle = k.dark; ctx.lineWidth = 2; ctx.strokeRect(px + 1, py + 1, T - 2, T - 2);
      } else {
        ctx.fillStyle = k.dark; rr(px + 3 + (h % 9), py + 4 + ((h >> 3) % 8), 10, 7, 3); ctx.fill();
        ctx.fillStyle = k.light; rr(px + 14 + ((h >> 5) % 8), py + 16 + ((h >> 7) % 8), 8, 5, 2); ctx.fill();
        ctx.fillStyle = zfShade(k.main, 0.22); circle(px + 4 + ((h >> 11) % 22), py + 24 + ((h >> 13) % 5), 1.3); ctx.fill(); circle(px + 20 + ((h >> 15) % 8), py + 5 + ((h >> 17) % 6), 1); ctx.fill();
        if (h % 6 === 2) { ctx.strokeStyle = zfShade(k.main, 0.3); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px + 2, py + 20 + (h % 6)); ctx.lineTo(px + 12, py + 22 + ((h >> 3) % 6)); ctx.lineTo(px + 18, py + 28); ctx.stroke(); }
      }
    } else if (c.k === 'metal' || c.k === 'turret') {
      const g = ctx.createLinearGradient(px, py, px, py + T); g.addColorStop(0, k.light); g.addColorStop(1, k.main);
      ctx.fillStyle = g; ctx.fillRect(px, py, T, T);
      ctx.strokeStyle = k.dark; ctx.lineWidth = 2.5; ctx.strokeRect(px + 1.5, py + 1.5, T - 3, T - 3);
      ctx.fillStyle = k.dark; for (const [a, b] of [[6, 6], [24, 6], [6, 24], [24, 24]]) { circle(px + a, py + b, 1.8); ctx.fill(); }
      if (c.k === 'turret') {
        const a = c.aim != null ? c.aim : (x < COLS / 2 ? Math.PI : 0);
        ctx.save(); ctx.translate(px + T / 2, py + 10); ctx.rotate(a);
        ctx.fillStyle = '#3a3f4a'; ctx.fillRect(0, -3, 17, 6); ctx.fillStyle = '#1f232b'; ctx.fillRect(14, -3.5, 4, 7);
        ctx.restore();
        ctx.fillStyle = '#4c5566'; circle(px + T / 2, py + 10, 7); ctx.fill(); ctx.strokeStyle = '#1f232b'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#ff5050'; circle(px + T / 2, py + 10, 1.8); ctx.fill();
      }
    }
    if (c.k === 'stone' && c.mine > 0) { ctx.strokeStyle = 'rgba(20,20,30,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px + 8, py + 6); ctx.lineTo(px + 15, py + 15); ctx.lineTo(px + 11, py + 24); if (c.mine > 1) { ctx.moveTo(px + 15, py + 15); ctx.lineTo(px + 25, py + 12); } ctx.stroke(); }
    if (c.k !== 'bed' && c.hp < c.max) {
      const u = 1 - c.hp / c.max;
      ctx.strokeStyle = 'rgba(20,18,30,0.8)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(px + 6, py + 4); ctx.lineTo(px + 13, py + 13); ctx.lineTo(px + 9, py + 20);
      if (u > 0.4) { ctx.moveTo(px + 13, py + 13); ctx.lineTo(px + 23, py + 10); ctx.lineTo(px + 26, py + 18); }
      if (u > 0.7) { ctx.moveTo(px + 9, py + 20); ctx.lineTo(px + 18, py + 27); ctx.moveTo(px + 20, py + 4); ctx.lineTo(px + 16, py + 12); }
      ctx.stroke();
    }
    if (c.hit > 0) { c.hit -= 1 / 60; ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(px, py, T, T); }
  }
  function drawTree(st, t) {
    const x = t.col * T + T / 2, by = ZF.ground * T, sh = t.shake > 0 ? Math.sin(G.clock * 60) * 2 : 0;
    if (cellAt(t.col, ZF.ground - 1) || !cellAt(t.col, ZF.ground)) return; // built over or dug out
    if (t.wood <= 0) {
      // a stump, and a sapling growing back
      ctx.fillStyle = '#5a3d26'; rr(x - 7, by - 8, 14, 8, 2); ctx.fill();
      ctx.fillStyle = '#7a5636'; ctx.beginPath(); ctx.ellipse(x, by - 8, 7, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      const g = 1 - Math.max(0, t.regrowT) / ZF.regrow;
      if (g > 0.3) { ctx.fillStyle = '#3f7a3a'; circle(x + 4, by - 12 - g * 6, 3 + g * 3); ctx.fill(); }
      return;
    }
    const hgt = t.h * T * (0.4 + 0.6 * t.grow), k = t.wood / ZF.treeWood;
    ctx.save(); ctx.translate(x + sh, by);
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(-sh, 0, 16, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a3220'; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-6, -8); ctx.lineTo(-6, -hgt); ctx.lineTo(6, -hgt); ctx.lineTo(6, -8); ctx.lineTo(9, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5e4129'; ctx.fillRect(-6, -hgt, 4, hgt - 2);
    ctx.fillStyle = '#3a2618'; ctx.fillRect(3, -hgt, 3, hgt);
    ctx.strokeStyle = '#33221a'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < 4; i++) { const yy = -10 - ((hash(t.col, i) % 1000) / 1000) * (hgt - 20); ctx.moveTo(-3, yy); ctx.lineTo(-1, yy - 6); }
    ctx.stroke();
    if (k < 1) { ctx.fillStyle = '#c49a68'; ctx.beginPath(); ctx.moveTo(-6, -14); ctx.lineTo(-6 + 7 * (1 - k), -10); ctx.lineTo(-6, -6); ctx.fill(); }
    const cols = ['#1f4a2c', '#275a34', '#2f6b3c'];
    ctx.fillStyle = '#163a22'; circle(2, -hgt + 2, 17); ctx.fill();
    for (let i = 0; i < 3; i++) { ctx.fillStyle = cols[i]; circle((i - 1) * 11, -hgt - 4 + (i === 1 ? -10 : 0), 18 - i * 2); ctx.fill(); }
    ctx.fillStyle = '#367844'; circle(-8, -hgt - 12, 7); ctx.fill(); circle(4, -hgt - 20, 6); ctx.fill();
    ctx.fillStyle = 'rgba(180,220,255,0.1)'; circle(-6, -hgt - 16, 10); ctx.fill();
    ctx.restore();
  }
  function drawHeart(st) {
    const x = HX, by = HY, t = G.clock, u = st.heart / ZF.heartMax, pulse = 1 + Math.sin(t * (u < 0.4 ? 9 : 3)) * 0.04;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, by, 32, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3d3a4a'; rr(x - 26, by - 12, 52, 12, 3); ctx.fill();
    ctx.fillStyle = '#2c2a37'; ctx.beginPath(); ctx.rect(x - 26, by - 5, 52, 5); ctx.fill();
    ctx.fillStyle = '#56526a'; rr(x - 22, by - 16, 44, 6, 2); ctx.fill();
    ctx.fillStyle = '#7a7690'; ctx.beginPath(); ctx.rect(x - 20, by - 16, 40, 1.5); ctx.fill();
    ctx.strokeStyle = '#2c2a37'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 9, by - 12); ctx.lineTo(x - 9, by - 5); ctx.moveTo(x + 9, by - 12); ctx.lineTo(x + 9, by - 5); ctx.stroke();
    ctx.save(); ctx.translate(x, by - 36 + Math.sin(t * 1.6) * 2); ctx.scale(pulse, pulse);
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 48);
    glow.addColorStop(0, 'rgba(255,70,110,0.55)'); glow.addColorStop(1, 'rgba(255,70,110,0)');
    ctx.fillStyle = glow; circle(0, 0, 48); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 20);
    ctx.lineTo(-22, -2); ctx.lineTo(-18, -16); ctx.lineTo(-8, -20); ctx.lineTo(0, -12); ctx.lineTo(8, -20); ctx.lineTo(18, -16); ctx.lineTo(22, -2); ctx.closePath();
    const g = ctx.createLinearGradient(-20, -20, 20, 20); g.addColorStop(0, '#ff7a9c'); g.addColorStop(1, '#b0123f');
    ctx.fillStyle = st.heartFlash > 0.2 ? '#ffffff' : g; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#6e0a26'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-18, -14); ctx.lineTo(0, 20); ctx.moveTo(18, -14); ctx.lineTo(0, 20); ctx.moveTo(0, -12); ctx.lineTo(0, 20); ctx.stroke();
    if (u < 0.66) { ctx.strokeStyle = '#2a0610'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(6, -16); ctx.lineTo(-1, -5); ctx.lineTo(5, 3); if (u < 0.33) { ctx.moveTo(-1, -5); ctx.lineTo(-14, -3); ctx.moveTo(5, 3); ctx.lineTo(2, 13); } ctx.stroke(); }
    ctx.restore();
  }
  function drawPad(col, label, sub) {
    const x = col * T + T / 2, y = (ZF.pads.row + 1) * T;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y, 17, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c9931f'; rr(x - 15, y - 6, 30, 6, 2); ctx.fill();
    ctx.fillStyle = '#ffc53d'; rr(x - 14, y - 6, 28, 3.5, 2); ctx.fill();
    const fs = big() ? 13 : 11, bh = fs * 2 + 14;
    ctx.font = '700 ' + fs + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = Math.max(64, ctx.measureText(sub).width + 16, ctx.measureText(label).width + 16), top = y - 46 - bh;
    ctx.fillStyle = '#6c7180'; ctx.fillRect(x - 1.5, y - 46, 3, 41); ctx.fillStyle = '#a3a8b6'; ctx.fillRect(x - 1.5, y - 46, 1.2, 41);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; rr(x - w / 2 + 2, top + 3, w, bh, 7); ctx.fill();
    ctx.fillStyle = 'rgba(20,18,34,0.88)'; rr(x - w / 2, top, w, bh, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,211,107,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(label, x, top + 7 + fs / 2);
    ctx.fillStyle = '#ffd36b'; ctx.fillText(sub, x, top + bh - 7 - fs / 2);
  }
  const ZSKIN = { walker: ['#8aa37c', '#5f7655'], digger: ['#93a582', '#647558'], leaper: ['#9fb08a', '#6c7d5e'], brute: ['#7d8f73', '#53644c'], behemoth: ['#6f8466', '#465540'] };
  const ZCLOTH = ['#5a5f7a', '#6e4a4a', '#4a6670', '#6b6145', '#55456b'];
  function drawZombie(st, z, dead) {
    const kind = z.kind, s = kind === 'behemoth' ? 1.95 : kind === 'brute' ? 1.3 : kind === 'leaper' ? 0.88 : 1, t = z.t || 0;
    const a = z.act, walking = !dead && a && a.type === 'move', digging = !dead && a && a.type === 'dig', chewing = !dead && a && a.type === 'chew';
    const lurch = walking ? Math.sin(t * 7 * (z.lurch || 1)) : 0, f = z.face, [skin, skinDk] = ZSKIN[kind];
    const cloth = ZCLOTH[z.id % 5];
    ctx.save(); ctx.translate(z.px, z.py);
    if (dead) { const u = Math.min(1, z.t / 0.35); ctx.globalAlpha = Math.max(0, 1 - Math.max(0, z.t - 0.8) / 0.6); ctx.rotate(-f * u * Math.PI / 2); }
    ctx.scale(s * f, s);
    if (!dead && z.flash > 0) ctx.globalAlpha = 0.55;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(0.06 * lurch + (kind === 'leaper' ? 0.18 : 0.08));
    // legs
    ctx.strokeStyle = '#2f3240'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    const lw = lurch * 4;
    ctx.beginPath(); ctx.moveTo(-4, -11); ctx.lineTo(-4 + lw, 0); ctx.moveTo(4, -11); ctx.lineTo(4 - lw, 0); ctx.stroke();
    // torn shirt
    ctx.fillStyle = cloth; ctx.strokeStyle = '#1c1a24'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-8, -23); ctx.lineTo(8, -23); ctx.lineTo(9, -11); ctx.lineTo(6, -9); ctx.lineTo(4, -12); ctx.lineTo(1, -9); ctx.lineTo(-2, -12); ctx.lineTo(-5, -9); ctx.lineTo(-9, -11); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = skin; ctx.fillRect(-3, -19, 3, 3); // a rip
    // arms reaching forward
    const reach = digging || chewing ? Math.sin(t * 16) * 3 : Math.sin(t * 3) * 1.5;
    ctx.strokeStyle = skinDk; ctx.lineWidth = 4.2;
    ctx.beginPath(); ctx.moveTo(5, -21); ctx.lineTo(16 + reach, -20 + (digging ? 5 : 0)); ctx.moveTo(1, -18); ctx.lineTo(14 - reach, -15 + (digging ? 6 : 0)); ctx.stroke();
    ctx.strokeStyle = skin; ctx.lineWidth = 2.6; ctx.stroke();
    if (kind === 'digger') { ctx.strokeStyle = '#5a3d26'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, -21); ctx.lineTo(18, -8 + reach); ctx.stroke(); ctx.strokeStyle = '#9aa0ae'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(13, -6 + reach); ctx.quadraticCurveTo(19, -12 + reach, 23, -6 + reach); ctx.stroke(); }
    // head
    ctx.fillStyle = skin; ctx.strokeStyle = '#33402d'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(1, -30, 8.5, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // sunken eyes with dim glowing pupils, a crooked mouth
    ctx.fillStyle = '#2a2e26'; ctx.beginPath(); ctx.ellipse(4.5, -31.5, 2.8, 2.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(-2, -31.5, 2.4, 2.1, 0, 0, Math.PI * 2); ctx.fill();
    if (!dead) { ctx.fillStyle = '#e8e2a0'; circle(5, -31.5, 1); ctx.fill(); circle(-1.6, -31.5, 0.9); ctx.fill(); }
    ctx.strokeStyle = '#1c1a1a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-2.5, -25.5); ctx.lineTo(1, chewing ? -23.5 : -24.5); ctx.lineTo(3, -25.8); ctx.lineTo(6.5, -24.8); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,50,35,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-5, -36); ctx.lineTo(-2, -34); ctx.stroke();
    if (kind === 'digger') { ctx.fillStyle = '#c9a23a'; ctx.strokeStyle = '#1c1a24'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(1, -35.5, 9.5, 4.5, 0, Math.PI, 0); ctx.fill(); ctx.stroke(); ctx.fillRect(-10, -36, 21, 2); ctx.fillStyle = '#fff6c8'; circle(8, -38, 1.8); ctx.fill(); }
    if (kind === 'brute') { ctx.fillStyle = '#3a3f52'; ctx.fillRect(-10, -24, 20, 4); }
    if (kind === 'behemoth') { ctx.strokeStyle = '#1c1a24'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-6, -36); ctx.lineTo(-2, -38); ctx.moveTo(3, -38); ctx.lineTo(7, -36); ctx.stroke(); }
    ctx.restore();
    // health bar over the tougher ones
    if (!dead && z.max > 3.5 && z.hp < z.max) {
      const w = kind === 'behemoth' ? 60 : 28, y = z.py - (kind === 'behemoth' ? 96 : 54);
      ctx.fillStyle = 'rgba(20,18,30,0.75)'; rr(z.px - w / 2 - 2, y - 2, w + 4, 7, 3); ctx.fill();
      ctx.fillStyle = '#c94a4a'; rr(z.px - w / 2, y, w * clamp(z.hp / z.max, 0, 1), 3, 1.5); ctx.fill();
    }
  }
  // far silhouettes on the horizon: an old farmhouse with one lit window, a broken windmill, a leaning fence, dead trees
  function zfFarBack() {
    const gy = ZF.ground * T, col = '#1d2333', t = G.clock;
    ctx.save();
    ctx.fillStyle = col;
    // farmhouse (left)
    const fx = 150;
    ctx.beginPath(); ctx.rect(fx, gy - 58, 74, 58); ctx.fill();
    ctx.beginPath(); ctx.moveTo(fx - 8, gy - 56); ctx.lineTo(fx + 37, gy - 92); ctx.lineTo(fx + 82, gy - 56); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.rect(fx + 54, gy - 96, 9, 22); ctx.fill();
    ctx.fillStyle = 'rgba(255,196,110,' + (0.55 + 0.15 * Math.sin(t * 2.3) * Math.sin(t * 0.7)) + ')'; ctx.beginPath(); ctx.rect(fx + 14, gy - 44, 10, 12); ctx.fill();
    ctx.fillStyle = '#141826'; ctx.beginPath(); ctx.rect(fx + 46, gy - 44, 10, 12); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(fx + 18.5, gy - 44); ctx.lineTo(fx + 18.5, gy - 32); ctx.moveTo(fx + 14, gy - 38); ctx.lineTo(fx + 24, gy - 38); ctx.stroke();
    // windmill (right), slowly turning with a missing blade
    const wx = 800;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(wx - 4, gy); ctx.lineTo(wx - 1.5, gy - 100); ctx.lineTo(wx + 1.5, gy - 100); ctx.lineTo(wx + 4, gy); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(wx - 16, gy); ctx.lineTo(wx, gy - 70); ctx.lineTo(wx + 16, gy); ctx.moveTo(wx - 10, gy - 30); ctx.lineTo(wx + 10, gy - 30); ctx.stroke();
    ctx.save(); ctx.translate(wx, gy - 100); ctx.rotate(t * 0.25);
    for (let i = 0; i < 6; i++) { if (i === 4) continue; ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(26, -5); ctx.lineTo(26, 4); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(wx + 2, gy - 100); ctx.lineTo(wx + 22, gy - 104); ctx.lineTo(wx + 22, gy - 96); ctx.closePath(); ctx.fill();
    // leaning fence
    ctx.strokeStyle = col; ctx.lineWidth = 3;
    for (const [x0, x1] of [[300, 420], [600, 720]]) {
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 24) { const lean = ((hash(x, 3) % 7) - 3) * 0.8; ctx.moveTo(x, gy); ctx.lineTo(x + lean, gy - 18 - (hash(x, 5) % 5)); }
      ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, gy - 12); ctx.lineTo(x1, gy - 10); ctx.moveTo(x0, gy - 6); ctx.lineTo(x1 - 24, gy - 5); ctx.stroke(); ctx.lineWidth = 3;
    }
    // dead trees
    ctx.lineCap = 'round';
    for (const [x, hh] of [[96, 70], [880, 58], [262, 44]]) {
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + 3, gy - hh); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(x + 2, gy - hh * 0.55); ctx.lineTo(x - 14, gy - hh * 0.8);
      ctx.moveTo(x + 2, gy - hh * 0.7); ctx.lineTo(x + 16, gy - hh * 0.95);
      ctx.moveTo(x + 3, gy - hh); ctx.lineTo(x - 6, gy - hh - 12);
      ctx.moveTo(x - 8, gy - hh * 0.75); ctx.lineTo(x - 12, gy - hh * 0.92);
      ctx.stroke();
    }
    ctx.restore();
  }
  function zfDraw() {
    const st = G.mst;
    if (!st.cell) return;
    zfFarBack();
    // dug-out holes under the ground (zombie tunnels are darker)
    for (let y = ZF.ground; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (st.cell[idx(x, y)]) continue;
      ctx.fillStyle = st.tun[idx(x, y)] ? '#2a1d17' : y >= ZF.stoneRow ? '#3a3a44' : '#3d2a1f'; ctx.fillRect(x * T - 0.5, y * T - 0.5, T + 1, T + 1);
    }
    for (const t of st.trees) drawTree(st, t);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const c = st.cell[idx(x, y)]; if (c) drawCell(st, x, y, c); }
    // the zombie lanes at both edges
    ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = '#ffffff'; ctx.setLineDash([4, 6]); ctx.lineWidth = 1.5;
    for (const x of [2 * T, (COLS - 2) * T]) { ctx.beginPath(); ctx.moveTo(x, ZF.ceilRow * T); ctx.lineTo(x, ZF.ground * T); ctx.stroke(); }
    ctx.restore();
    const gp = k => (st.gun[k] >= ZF.guns.length - 1 ? 'best' : ZF.gunCost[st.gun[k] + 1]);
    drawPad(ZF.pads.guns, 'Guns (▼ + hold)', st.gun[0] === st.gun[1] ? (gp(0) === 'best' ? 'all bought' : 'next ' + gp(0)) : NAMES[0] + ' ' + gp(0) + ' · ' + NAMES[1] + ' ' + gp(1));
    drawPad(ZF.pads.turret, 'Turret (▼ + hold)', ZF.turretCost + ' coins');
    drawHeart(st);
    for (const c of st.corpses) drawZombie(st, { px: c.x, py: c.y, face: c.face, kind: c.kind, id: c.id, t: c.t, hp: 0, max: 1 }, true);
    for (const z of st.zs) drawZombie(st, z, false);
  }
  function zfDrawTop() {
    const st = G.mst;
    if (!st.cell) return;
    for (const d of st.shots) {
      const ang = Math.atan2(d.vy, d.vx);
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(ang);
      if (d.kind === 'rocket') { ctx.fillStyle = '#6b7280'; rr(-9, -3, 14, 6, 2); ctx.fill(); ctx.fillStyle = '#d94a3a'; ctx.beginPath(); ctx.moveTo(5, -3); ctx.lineTo(10, 0); ctx.lineTo(5, 3); ctx.fill(); ctx.fillStyle = '#ffb347'; circle(-11, 0, 3.5); ctx.fill(); }
      else if (d.kind === 'laser') { ctx.fillStyle = 'rgba(120,255,200,0.95)'; ctx.fillRect(-26, -1.5, 30, 3); ctx.fillStyle = 'rgba(120,255,200,0.3)'; ctx.fillRect(-26, -4, 30, 8); }
      else { ctx.fillStyle = 'rgba(255,230,150,0.5)'; ctx.fillRect(-14, -1, 14, 2); ctx.fillStyle = '#fff3c4'; ctx.fillRect(-3, -1.5, 5, 3); }
      ctx.restore();
    }
    // build cursors while holding, with what the block is and how strong
    for (const p of G.players) {
      const h = st.hold[p.id];
      if (!p.alive || !h || h.t < 0.1) continue;
      const tg = zfTarget(p, h.op);
      if (!tg.op || tg.op === 'buy' || tg.op === 'chop') continue;
      const bad = tg.op === 'place' && canPlace(tg.x, tg.y);
      ctx.save(); ctx.globalAlpha = 0.6 + 0.25 * Math.sin(G.clock * 10);
      ctx.strokeStyle = bad ? '#ff6b6b' : tg.op === 'dig' || tg.op === 'take' ? '#ffd36b' : tg.op === 'fix' ? '#9fe07f' : '#ffffff';
      ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.strokeRect(tg.x * T + 2, tg.y * T + 2, T - 4, T - 4);
      ctx.restore();
      let lab = '';
      const c = cellAt(tg.x, tg.y);
      if (tg.op === 'place') { const m = material(st, p); lab = m ? ZF.kinds[m].name + ' ' + ZF.kinds[m].hp + ' HP' : 'Nothing to build with'; }
      else if (tg.op === 'dig' && c) lab = c.k === 'stone' ? 'Stone ' + (c.mine || 0) + '/' + ZF.stoneHits : 'Dirt';
      else if (tg.op === 'take' && c) lab = 'Take back ' + ZF.kinds[c.k].name;
      else if (tg.op === 'fix' && c) { const uc = payCost(st, c.k); lab = ZF.kinds[c.k].name + ' ' + Math.ceil(c.hp) + '/' + c.max + ' HP' + (c.hp >= c.max && uc ? ' · upgrade: ' + costWords(uc) : ''); }
      if (lab) {
        const fs = big() ? 13 : 11;
        ctx.font = '700 ' + fs + 'px ' + FONT; const w = ctx.measureText(lab).width + 12;
        const lx = clamp(tg.x * T + T / 2, w / 2 + 4, W - w / 2 - 4);
        ctx.fillStyle = 'rgba(20,18,34,0.85)'; rr(lx - w / 2, tg.y * T - fs - 7, w, fs + 4, 7); ctx.fill();
        text(lab, lx, tg.y * T - 5 - fs / 2, fs, '#fff', 'center', 'body');
      }
    }
    // carried turrets, and each player's health bar while hurt
    for (const p of G.players) {
      if (!p.alive) continue;
      const k = p.id, x = p.x + p.w / 2;
      if (st.carry[k]) { ctx.fillStyle = '#6c7686'; rr(x - 7, p.y - 40, 14, 10, 2); ctx.fill(); ctx.fillStyle = '#3a3f4a'; ctx.fillRect(x, p.y - 37, 10, 3); }
      if (st.php[k] < ZF.playerHp - 0.5 || st.hurtFlash[k] > 0) {
        const u = clamp(st.php[k] / ZF.playerHp, 0, 1);
        ctx.fillStyle = 'rgba(20,18,30,0.75)'; rr(x - 16, p.y + p.h + 4, 32, 6, 3); ctx.fill();
        ctx.fillStyle = u < 0.35 ? '#ff5050' : '#7fd65a'; rr(x - 15, p.y + p.h + 5, 30 * u, 4, 2); ctx.fill();
      }
      if (st.hurtFlash[k] > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, st.hurtFlash[k] * 2); ctx.fillStyle = 'rgba(255,60,60,0.5)'; rr(p.x - 2, p.y - 2, p.w + 4, p.h + 4, 8); ctx.fill(); ctx.restore(); }
    }
    for (const q of st.pops) { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - q.t); outlined(q.s, q.x, q.y - q.t * 30, '#ffd36b', 15); ctx.restore(); }
    for (const k of [0, 1]) {
      const d = st.downAt[k], p = G.players[k];
      if (!d || p.alive) continue;
      ctx.save(); ctx.globalAlpha = 0.85; text(NAMES[k] + ' back in ' + Math.max(1, Math.ceil(p.respawnT)), clamp(d.x, 60, W - 60), d.y - 20, big() ? 16 : 13, PCOL[k], 'center', 'body'); ctx.restore();
    }
    for (const k of [0, 1]) {
      const b = st.say[k], p = G.players[k];
      if (!b || !p.alive) continue;
      ctx.save(); ctx.globalAlpha = clamp(1.6 - b.t, 0, 1);
      const fs = big() ? 14 : 12;
      ctx.font = '700 ' + fs + 'px ' + FONT; const w = ctx.measureText(b.s).width + 14, bx = clamp(p.x + p.w / 2, w / 2 + 4, W - w / 2 - 4);
      ctx.fillStyle = 'rgba(20,18,34,0.88)'; rr(bx - w / 2, p.y - 54, w, fs + 6, 9); ctx.fill();
      text(b.s, bx, p.y - 51 + fs / 2 + 1, fs, '#fff', 'center', 'body');
      ctx.restore();
    }
  }
  function outlined(s, x, y, col, size) {
    ctx.font = size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function zfHUD() {
    const st = G.mst;
    if (!st.cell) return;
    const B = big(), fs = B ? 17 : 14;
    // resources, top right (measured first so the centre pill can keep clear of it)
    ctx.font = '700 ' + fs + 'px ' + FONT;
    const items = [['Dirt', st.res.dirt, COLS_K.dirt.light], ['Wood', st.res.wood, COLS_K.wood.light], ['Stone', st.res.stone, COLS_K.stone.light], ['Coins', st.coins, '#ffc53d']];
    const segs = items.map(([n, v]) => ctx.measureText(n + ' ' + v).width + 26);
    const rw = segs.reduce((a, b) => a + b, 0) + 14, rLeft = W - 14 - rw;
    // top centre: what's happening now
    let line;
    const left = st.queue.length + st.zs.length;
    if (st.phase === 'build') line = (st.wave === 1 ? 'Build time ' : 'Break ') + fmtClock(st.buildT) + ' · Wave ' + st.wave + ' next';
    else if (st.phase === 'wave') line = 'Wave ' + st.wave + ' · ' + left + (left === 1 ? ' zombie left' : ' zombies left');
    else line = 'Waves survived: ' + st.stats.waves;
    ctx.font = '700 ' + fs + 'px ' + FONT;
    const lw = ctx.measureText(line).width + 30, mx = Math.min(W / 2, rLeft - 8 - lw / 2);
    pill(mx, 10, lw, B ? 34 : 28, 'center');
    text(line, mx, B ? 27 : 24.5, fs, st.phase === 'wave' ? '#ff9c8a' : C.paper, 'center', 'body');
    // the heart's health
    const bw = B ? 220 : 190, bx = mx - bw / 2, by = B ? 50 : 44, bh = B ? 14 : 10;
    const hpS = Math.ceil(st.heart) + ' HP', hpF = B ? 13 : 11;
    ctx.font = '700 ' + hpF + 'px ' + FONT;
    const hpW = ctx.measureText(hpS).width;
    ctx.fillStyle = 'rgba(20,18,34,0.8)'; rr(bx - 30, by - 4, bw + 38 + hpW + 10, bh + 8, 9); ctx.fill();
    ctx.fillStyle = '#ff4d7a'; ctx.save(); ctx.translate(bx - 16, by + bh / 2); ctx.scale(0.5, 0.5);
    ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(-11, -1); ctx.lineTo(-9, -8); ctx.lineTo(-4, -10); ctx.lineTo(0, -6); ctx.lineTo(4, -10); ctx.lineTo(9, -8); ctx.lineTo(11, -1); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(bx, by, bw, bh, 5); ctx.fill();
    const u = clamp(st.heart / ZF.heartMax, 0, 1);
    ctx.fillStyle = u < 0.35 ? '#ff5050' : '#ff4d7a';
    if (u > 0) { rr(bx, by, Math.max(8, bw * u), bh, 5); ctx.fill(); }
    text(hpS, bx + bw + 8, by + bh / 2 + 0.5, hpF, C.paper, 'left', 'body');
    ctx.font = '700 ' + fs + 'px ' + FONT;
    const rx = pill(W - 14, 12, rw, B ? 32 : 28, 'right');
    let cx = rx + 10;
    items.forEach(([n, v, col], i) => {
      ctx.fillStyle = col; if (n === 'Coins') { circle(cx + 6, B ? 28 : 26, 5.5); ctx.fill(); } else { rr(cx + 1, (B ? 22 : 20.5), 11, 11, 2); ctx.fill(); }
      text(n + ' ' + v, cx + 16, B ? 28 : 26.5, fs, n === 'Coins' ? '#ffd36b' : C.paper, 'left', 'body');
      cx += segs[i];
      ctx.font = '700 ' + fs + 'px ' + FONT;
    });
    // each player's gun and health, under the resources
    const ps = B ? 15 : 12, ph = B ? 24 : 19;
    for (const k of [0, 1]) {
      const s = NAMES[k] + ': ' + ZF.guns[st.gun[k]].name + (st.carry[k] ? ' + turret' : '') + '  ' + Math.ceil(G.players[k].alive ? st.php[k] : 0) + ' HP';
      ctx.font = '700 ' + ps + 'px ' + FONT;
      const w2 = ctx.measureText(s).width + 20, y2 = (B ? 50 : 46) + k * (ph + 3);
      pill(W - 14, y2, w2, ph, 'right');
      text(s, W - 24, y2 + ph / 2 + 0.5, ps, PCOL[k], 'right', 'body');
    }
    // news (on phones it goes under the player pills, out of their way)
    if (st.news) {
      const a = Math.min(1, (ZF.newsLife - st.news.t) * 2, st.news.t * 6);
      ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
      ctx.font = '700 ' + (B ? 18 : 15) + 'px ' + FONT;
      const nw = ctx.measureText(st.news.s).width + 30, ny = B ? 112 : 66;
      pill(W / 2, ny, nw, B ? 30 : 26, 'center');
      text(st.news.s, W / 2, ny + (B ? 15 : 13), B ? 18 : 15, '#ffd36b', 'center', 'body');
      ctx.restore();
    }
    // build time: the block tiers and how strong they are, and the how-to for each person
    if (st.phase === 'build' && G.introT <= 0) {
      const tiers = ['dirt', 'wood', 'stone', 'metal'];
      const ts = B ? 14 : 12, th = B ? 26 : 22;
      ctx.font = '700 ' + ts + 'px ' + FONT;
      const lab = 'Block strength:', parts = tiers.map(k => ZF.kinds[k].name + ' ' + ZF.kinds[k].hp + ' HP');
      const pw = parts.map(s => ctx.measureText(s).width + 26), labW = ctx.measureText(lab).width, tw = labW + pw.reduce((a, b) => a + b, 0) + 30;
      const ty = H - th / 2 - 11, tx0 = W / 2 - tw / 2;
      ctx.fillStyle = 'rgba(20,18,34,0.82)'; rr(tx0, ty - th / 2, tw, th, th / 2); ctx.fill();
      text(lab, tx0 + 12, ty, ts, '#d9d3ef', 'left', 'body');
      let px = tx0 + 20 + labW;
      tiers.forEach((k, i) => { ctx.fillStyle = COLS_K[k].main; rr(px, ty - 5, 10, 10, 2); ctx.fill(); ctx.strokeStyle = COLS_K[k].dark; ctx.lineWidth = 1; ctx.stroke(); text(parts[i], px + 14, ty, ts, C.paper, 'left', 'body'); px += pw[i]; });
      const sub = st.readyT > 0 ? 'Wave ' + st.wave + ' starts in ' + Math.max(1, Math.ceil(ZF.readyHold - st.readyT)) + '...' : 'Ready early? Both stand still by the heart and hold ' + (solo() ? key(cpuHuman(), 'down') : '▼');
      const sf = B ? 15 : 12, sh2 = sf + 12, sy = ty - th / 2 - 4 - sh2 / 2;
      ctx.font = '700 ' + sf + 'px ' + FONT;
      const sw = ctx.measureText(sub).width + 26;
      ctx.fillStyle = 'rgba(20,18,34,0.72)'; rr(W / 2 - sw / 2, sy - sh2 / 2, sw, sh2, sh2 / 2); ctx.fill();
      text(sub, W / 2, sy + 0.5, sf, st.readyT > 0 ? '#ffd36b' : '#fff', 'center', 'body');
      if (st.wave === 1) {
        const hs = B ? 14 : 12, lh = hs + 7;
        for (const k of [0, 1]) {
          if (isCpu(k) || (st.usedHold[k] && st.usedTap[k] && st.hintT > 30)) continue;
          const lines = ['Tap ' + key(k, 'act') + ' to shoot, hold it to build', 'Hold ' + key(k, 'act') + ' at a tree to chop wood', 'Hold ' + key(k, 'down') + ' + ' + key(k, 'act') + ' to dig, mine, or buy on a pad', 'Hold on a full wall to upgrade it'];
          ctx.font = '700 ' + hs + 'px ' + FONT;
          const w3 = Math.max(...lines.map(s => ctx.measureText(s).width)) + 22, ins = (B || (typeof playerDevice === 'function' && playerDevice(k).kind === 'touch')) ? 62 : 14, x3 = k === 0 ? ins : W - ins - w3, hh = lines.length * lh + 10, y3 = H - (B ? 84 : 72) - hh;
          ctx.fillStyle = 'rgba(20,18,34,0.82)'; rr(x3, y3, w3, hh, 10); ctx.fill();
          lines.forEach((s, i) => text(s, x3 + 11, y3 + 5 + lh / 2 + i * lh, hs, i === 0 ? PCOL[k] : C.paper, 'left', 'body'));
        }
      }
    }
    if (st.idle) { ctx.save(); ctx.globalAlpha = 0.9; bigText('The zombies wait for you... press anything!', W / 2, H / 2 - 40, B ? 24 : 19, '#c8e8b0', 1); ctx.restore(); }
    if (st.phase === 'over') {
      ctx.fillStyle = 'rgba(12,10,20,' + Math.min(0.6, st.overT * 0.4) + ')'; ctx.fillRect(0, 0, W, H);
      bigText('The heart has fallen!', W / 2, H / 2 - 40, B ? 42 : 36, '#ff7a90', 1);
      bigText('You survived ' + st.stats.waves + ' wave' + (st.stats.waves === 1 ? '' : 's'), W / 2, H / 2 + 10, B ? 28 : 24, '#ffd36b', 1);
      if (st.newBest && st.stats.waves > 0) text('A new best!', W / 2, H / 2 + 44, 15, '#fff', 'center', 'body');
    }
  }
  const fmtClock = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  /* ---------- sounds ---------- */
  Sfx.extra.zombiefortShoot = function (p) { this.tone(260 * p, 0.05, 'square', 0.03, 120 * p); this.tone(1800, 0.02, 'sawtooth', 0.012); };
  Sfx.extra.zombiefortLaser = function (p) { this.tone(1400 * p, 0.12, 'sine', 0.035, 500 * p); };
  Sfx.extra.zombiefortRocket = function (p) { this.tone(120 * p, 0.3, 'sawtooth', 0.03, 60 * p); };
  Sfx.extra.zombiefortBoom = function () { this.tone(90, 0.35, 'sawtooth', 0.05, 40); this.tone(60, 0.4, 'square', 0.03, 30, 0.03); };
  Sfx.extra.zombiefortTurret = function () { this.tone(520, 0.04, 'square', 0.015, 260); };
  Sfx.extra.zombiefortHit = function (p) { this.tone(180 * p, 0.05, 'triangle', 0.035, 120 * p); };
  Sfx.extra.zombiefortDown = function (p) { this.tone(160 * p, 0.25, 'sawtooth', 0.025, 70 * p); };
  Sfx.extra.zombiefortPlace = function (p) { this.tone(170 * p, 0.07, 'square', 0.035, 130 * p); };
  Sfx.extra.zombiefortDig = function (p) { this.tone(110 * p, 0.08, 'sawtooth', 0.02, 75 * p); };
  Sfx.extra.zombiefortMine = function (p) { this.tone(900 * p, 0.04, 'square', 0.02, 700 * p); };
  Sfx.extra.zombiefortChop = function (p) { this.tone(240 * p, 0.05, 'square', 0.03, 180 * p); };
  Sfx.extra.zombiefortBuy = function (p) { [660, 880, 1100].forEach((f, i) => this.tone(f * p, 0.08, 'triangle', 0.04, null, i * 0.06)); };
  Sfx.extra.zombiefortNo = function (p) { this.tone(200 * p, 0.08, 'square', 0.02, 150 * p); };
  Sfx.extra.zombiefortChomp = function (p) { this.tone(130 * p, 0.04, 'square', 0.012, 100 * p); };
  Sfx.extra.zombiefortGroan = function (p) { this.tone(110 * p, 0.6, 'sawtooth', 0.014, 80 * p); };
  Sfx.extra.zombiefortHeart = function () { this.tone(300, 0.14, 'sine', 0.05, 180); };
  Sfx.extra.zombiefortOuch = function (p) { this.tone(420 * p, 0.12, 'square', 0.035, 220 * p); };
  Sfx.extra.zombiefortKO = function (p) { this.tone(500 * p, 0.4, 'triangle', 0.04, 120 * p); };
  Sfx.extra.zombiefortWave = function () { [147, 147, 175, 131].forEach((f, i) => this.tone(f, 0.22, 'sawtooth', 0.035, null, i * 0.2)); };
  Sfx.extra.zombiefortClear = function () { [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.09)); };
  Sfx.extra.zombiefortLose = function () { [330, 262, 220, 165].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.045, null, i * 0.2)); };
})();

/* ---------- World 25 and its level ----------
   World 25 is added from here (not in the WORLDS literal and LEVELS list of level-list.js), so it lands after any
   worlds 22-24 that get built later, and never conflicts with them. World index 24. */
WORLDS[24] = { name: 'Zombie Acres', blurb: 'Chop, dig and build a fort, then hold off endless waves of zombies!',
  // a moonlit night on an old farm: deep blue-violet sky, a pale moon, dark hills, grass on brown earth
  theme: { skyTop: '#151a33', skyBot: '#4a4870', hillFar: '#2a3246', hillNear: '#222a3a', sun: 'rgba(235, 235, 220, 0.92)', sunGlow: 'rgba(200, 210, 255, 0.22)',
    stone: '#5c3a24', stoneLight: '#7a5034', stoneEdge: '#3d2616', grass: '#5fae4a', grassDark: '#3a7a33', plank: '#a8743f', plankDark: '#6e4824', rope: '#d8c890', ropeDark: '#6a5a2a' } };
LEVELS.push(
  // ----- BEGIN 25-1 Defend the Heart (mode 'zombiefort', js/levels/world25/defend-the-heart.js) -----
  { name: 'Defend the Heart', world: 24, kind: 'team', mode: 'zombiefort', ownHUD: true, noFalls: true, noTime: true,
    act: { label: 'shoot' },
    legend: { down: 'aim low, dig', padDown: 'down aims low' },
    tip: 'Chop, dig and build a fort round the heart, then survive endless zombie waves. Tap to shoot, hold to build!',
    switches: {}, signs: [],
    map: [
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................', '................................',
      '................................', '................................',
      '.............1....2.............',
      '################################', '################################', '################################',
      '################################', '################################', '################################',
    ],
  },
  // ----- END 25-1 Defend the Heart -----
);
