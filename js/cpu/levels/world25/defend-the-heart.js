/* Pip & Bo - Computer partner brain for 25-1 Defend the Heart (mode 'zombiefort'). */
'use strict';

(() => {
  /* How the computer plays Defend the Heart (MODES.zombiefort)
     Pip looks after the LEFT half of the fort and Bo the RIGHT half. Everything below is written for the left half;
     Bo uses the same plan in a mirror (column x becomes 31 - x, left becomes right). It reads what a person sees: the
     blocks and how cracked they are, the trees, the zombies, the coins and materials in the HUD. It uses the level's own
     helpers (MODES.zombiefort.target, cellAt, treeUp, upCost...) to know what a hold of the button does where it stands,
     and cpu-nav's map (navGraph) to walk and jump around the blocks.

     HOW IT PICKS A SPOT: for a block it wants (built, dug, fixed or upgraded) it looks at every spot it can walk to,
     facing either way, with and without ▼, and works out what a hold would do there (the same rules as the game:
     the column in front of your feet, the column below-front with ▼, a tree trunk chops first, a pad buys). It goes to
     the nearest spot that does the right thing, then holds; it lets go as soon as the hold would do anything else.
     It never takes a spot it couldn't walk back into the fort from.

     THE FORT (left half; the heart is at columns 15-16, the Guns pad at 13):
       - an outer wall column at x 8 and an inner one at x 9, rows 7-11 (5 tall: even leapers, who jump 4, can't hop
         it). Both go into the ground (the inner one 2 blocks, to row 13), so going under costs a zombie about as much
         as going through. To put the inner block at row 13 it digs a pit at x 10 first, stands in it, then fills it.
       - x 10 stays open: the "fix spot". Standing there facing the wall, a hold fixes (or upgrades) the inner column's
         three low blocks, which is where zombies dig in. Tree 10 grows there (it chops it first: a hold on a trunk
         chops instead of building).
       - turrets float at row 9 over x 10-12 (inside, out of the way, over head height; spares at x 13-14).
       - holes zombies dig in the fort floor (x 10-14, rows 12-14) get filled.
       To build the top rows it stands on the 3-tall inner column (a 3-tile jump from the fix spot) and "pillars up":
       it holds ▼ + the button and jumps, then lets go of ▼ when its feet are over the next cell up, which places a
       block under it. From the top it holds ▼ facing out to fill the outer column's top rows. Turrets go in the same
       way: a jump from the floor, letting go of ▼ near the top, places the turret two cells over the floor.

     BUILD TIME (the first 5:00, and the 30 s breaks): it does the first of these jobs that it can reach:
       1. put down a turret it is carrying
       2. heal the heart at the heart pad when it is low and the team has the coins
       3. chop the tree at the fix spot when it has grown back, then fix cracked blocks of its half
       4. first build time only: chop its three trees, then mine two dirt-and-stone pits outside the wall (x 5-6, five
          deep in one corner) and two holes (x 2-3). The game always builds with the best material the team has, so the
          stone mined first goes into the inner column. The pits also slow zombies down.
       5. build the wall: inner column, outer column (from outside, while it can still get back in), floor holes, then
          the top rows, which close the wall. Missing blocks come back in later breaks wherever it can reach them.
       6. buy a turret (15 coins) once its wall stands, while its three turret spots aren't all full
       7. upgrade the inner column's low blocks (dirt -> wood -> stone -> metal), keeping 15 coins for a turret
       8. buy the next gun at the Guns pad when there are coins to spare
       With a person, when its own list is done and the person's half has no wall, it builds the same wall there too.
       Then it stands next to the heart holding ▼ (ready), so two computers start the next wave early; with a person,
       it also goes there as soon as the person stands by the heart holding ▼.

     WAVES:
       - the heart below 40 HP and coins for it: heal it first (Pip when both are computers; Bo when it gets very low).
       - a zombie inside the fort: it picks a spot where its shot (straight, or 45° down with ▼) reaches the zombie with
         no block in the way and not too close, walks there and taps to shoot. Its own half first, then the other half.
       - otherwise, when its half has a turret: fix the wall while the turrets shoot the zombies digging at it (it
         stands at the fix spot and holds as soon as a zombie cracks a block), and put back dug-out inner blocks.
         Without a turret (the first waves) it lets them dig through and shoots them as they come in (a zombie at a
         wall that keeps getting fixed would never go, and the wave would never end).
       - the heart below 60 HP: heal it.
       - otherwise it waits inside its wall (x 12) facing out, ready to shoot; any time a straight or low shot from
         where it stands would hit a zombie, it taps.
       - a zombie right next to it (they hurt and knock you back): it backs off, unless it is healthy and facing it.
     The two computers never deadlock in a doorway: when they walk into each other, Bo waits and Pip hops over.
     It talks in short bubbles in 1-player mode only, each line now and then at most ("I'll build the wall on this
     side!", "I'll help build your wall too!", "Ready! Stand by the heart and hold down", "One got in!", "Turret up!").
     Team brains always play at full skill. It never changes level state: it only presses buttons. */
  const M = () => MODES.zombiefort;
  const TT = 30;
  // the left half's plan, in left-half columns (Bo mirrors them)
  const PLAN = {
    inner: [[9, 13], [9, 12], [9, 11], [9, 10], [9, 9]],
    outer: [[8, 11], [8, 10], [8, 9], [8, 12]],
    top: [[9, 8], [9, 7], [8, 8], [8, 7]],
    mine: [[5, 12], [5, 13], [5, 14], [6, 12], [6, 13], [6, 14], [6, 15], [6, 16], [5, 16], [3, 12], [3, 13], [3, 14],
      [2, 12], [2, 13], [2, 14]],
    // dug out for a moment so the inner column can go one block deeper (row 13), then filled again
    pit: [10, 12],
    // holes in the fort floor get filled (columns 10-14, rows 12-14)
    floor: [10, 14],
    trees: [4, 7, 10],
    turrets: [[12, 9], [11, 9], [10, 9], [13, 9], [14, 9]],
    upgrade: [[9, 11], [9, 10], [9, 12], [9, 9]],
    mySlots: 3, // turret spots this player fills (the rest are spares, for a turret bought when a spot can't be reached)
    fixSpot: [10, 11], guard: [12, 11], ready: 14, heal: 15,
    innerX: 9, // the inner wall column: a zombie past it is inside the fort
  };
  const isNat = c => !!c && c.by < 0 && (c.k === 'dirt' || c.k === 'stone');
  const isPl = c => !!c && c.by >= 0;
  const cellAt = (x, y) => M().cellAt(x, y);
  const zSize = z => (z.kind === 'behemoth' ? [44, 58] : z.kind === 'brute' ? [30, 38] : z.kind === 'leaper' ? [20, 26] : [22, 30]);
  const zRect = z => { const b = zSize(z); return { x: z.px - b[0] / 2, y: z.py - b[1], w: b[0], h: b[1] }; };
  const feetRow = p => Math.floor((p.y + p.h - 1) / TT);
  // a short bubble (1-player mode only), each line at most once every `every` seconds
  const say = (S, p, text, secs, every = 20) => {
    if (!S.human || (S.said[text] || -1e9) > G.time - every) return;
    if (!cpuOn(p.id) || !cpuSolo()) return;
    S.said[text] = G.time; cpuSay(p, text, secs);
  };

  /* ---------- mirror ---------- */
  const RX = (S, x) => (S.m > 0 ? x : COLS - 1 - x);
  const RC = (S, c) => [RX(S, c[0]), c[1]];
  const mine = (S, x) => (S.m > 0 ? x <= 15 : x >= 16); // a column on this player's half

  /* ---------- what a hold would do, for a player standing still in cell (tx, ty) facing f (a copy of zfTarget) ---------- */
  function fixInfo(st, x, y) {
    const c = cellAt(x, y), mod = M();
    if (!isPl(c)) return { op: null };
    if (c.hp < c.max - 0.01) return { op: 'fix', x, y, how: 'repair' };
    const cost = mod.upCost(c.k);
    if (cost && mod.canPay(st, cost)) return { op: 'fix', x, y, how: 'upgrade', to: ZF.kinds[c.k].next, cost };
    return { op: 'fix', x, y, how: 'fail' };
  }
  function predict(st, tx, ty, f, down) {
    const mod = M();
    if (ty === ZF.pads.row && (tx === ZF.pads.guns || tx === ZF.pads.turret || (tx >= ZF.heart.c0 && tx <= ZF.heart.c1))) return { op: 'buy' };
    if (!down && ty === ZF.ground - 1 && st.trees.some(q => q.col === tx && mod.treeUp(q))) return { op: 'chop', x: tx, y: ty };
    const fx = tx + f;
    if (down) {
      const c = cellAt(fx, ty + 1);
      if (c) return isNat(c) ? { op: 'dig', x: fx, y: ty + 1 } : isPl(c) ? fixInfo(st, fx, ty + 1) : { op: null };
      let y = ty + 1;
      while (y < ty + 3 && y + 1 < ROWS && !cellAt(fx, y + 1)) y++;
      return { op: 'place', x: fx, y };
    }
    if (isNat(cellAt(fx, ty))) return { op: 'dig', x: fx, y: ty };
    for (let y = ty; y >= ty - 2; y--) if (!cellAt(fx, y)) return { op: 'place', x: fx, y };
    for (let y = ty; y >= ty - 2; y--) { const c = cellAt(fx, y); if (isPl(c) && (c.hp < c.max || M().upCost(c.k))) return fixInfo(st, fx, y); }
    return fixInfo(st, fx, ty);
  }
  // could a block go in this cell (ignoring players: we plan to be elsewhere when it goes in)?
  function placeable(st, x, y) {
    if (x < 0 || x >= COLS || y < ZF.ceilRow || y >= ZF.bedRow) return false;
    const mod = M();
    if (mod.isLane(x) || mod.inHeart(x, y) || mod.isPad(x, y) || cellAt(x, y)) return false;
    for (const z of st.zs) {
      if (z.hp <= 0) continue;
      if (z.cx === x && z.cy === y) return false;
      if (z.act && z.act.type === 'move' && z.act.tx === x && z.act.ty === y) return false;
    }
    return true;
  }
  const materialLeft = st => st.res.stone + st.res.wood + st.res.dirt > 0;
  // an empty cell in the fort's floor (a hole a zombie dug, or our own pit)
  function floorHole(S, x, y) {
    const lx = S.m > 0 ? x : COLS - 1 - x;
    return lx >= PLAN.floor[0] && lx <= PLAN.floor[1] && y >= ZF.ground && y <= ZF.ground + 2 && !cellAt(x, y);
  }
  const floorHoles = (S, st) => {
    const out = [];
    for (let y = ZF.ground; y <= ZF.ground + 2; y++) for (let lx = PLAN.floor[0]; lx <= PLAN.floor[1]; lx++) {
      const x = RX(S, lx);
      if (floorHole(S, x, y) && placeable(st, x, y)) out.push([lx, y]);
    }
    return out;
  };
  const pitWanted = S => !isPl(cellAt(RX(S, 9), 13));

  /* ---------- the walking map (cpu-nav) ---------- */
  function mapInfo(S, p) {
    const g = navGraph(p, {});
    if (S.g !== g) {
      S.g = g;
      // the cells from which the player can walk back home (inside the fort)
      const home = g.at.get(PLAN.guard[1] * COLS + RX(S, PLAN.guard[0]));
      const back = new Uint8Array(g.cells.length);
      if (home) {
        const rev = g.cells.map(() => []);
        for (const a of g.cells) for (const e of a.edges) rev[e.to].push(a.i);
        const q = [home.i]; back[home.i] = 1;
        while (q.length) { const u = q.pop(); for (const v of rev[u]) if (!back[v]) { back[v] = 1; q.push(v); } }
      }
      S.back = back;
    }
    return g;
  }
  // seconds from the player's cell to every map cell (Infinity where there is no way)
  function distFrom(g, from) {
    const n = g.cells.length, dist = new Float64Array(n).fill(Infinity), done = new Uint8Array(n);
    if (!from) return dist;
    dist[from.i] = 0;
    for (;;) {
      let u = -1, best = Infinity;
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
      if (u < 0) break;
      done[u] = 1;
      for (const e of g.cells[u].edges) { const nd = dist[u] + e.t; if (nd < dist[e.to]) dist[e.to] = nd; }
    }
    return dist;
  }
  // the reachable standing cells we may use: reachable now, and with a way back home
  function stands(S, p, g, from, opts = {}) {
    const dist = distFrom(g, from), out = [];
    for (const c of g.cells) {
      const d = dist[c.i];
      if (d === Infinity || (!S.back[c.i] && !opts.anywhere)) continue;
      out.push({ c, d });
    }
    return out;
  }

  /* ---------- choosing a job ---------- */
  // the best pose (stand cell, face, ▼) from which a hold works on cell [x, y] with one of the ops in `ops`
  function poseFor(S, st, list, x, y, ok, air) {
    let best = null;
    for (const { c, d } of list) {
      if (Math.abs(c.tx - x) > 1 && !(air && c.tx === x)) continue;
      if (Math.abs(c.ty - y) > 3) continue;
      for (const f of [-1, 1]) for (const down of [false, true]) {
        const pr = predict(st, c.tx, c.ty, f, down);
        if (pr.x !== x || pr.y !== y || !ok(pr)) continue;
        const cost = d + (down ? 0.05 : 0);
        if (!best || cost < best.cost) best = { kind: 'work', tx: c.tx, ty: c.ty, f, down, cell: [x, y], op: pr.op, cost };
      }
      // a jump with ▼ held, let go over the cell: a block under your feet (pillar) or floating 1-2 cells up
      if (air && c.tx === x && c.ty - y >= 0 && c.ty - y <= 2) {
        let clear = true;
        for (let yy = c.ty - 1; yy >= c.ty - 4; yy--) if (yy >= 0 && yy !== y && cellAt(x, yy)) { clear = false; break; }
        if (clear && placeable(st, x, y)) {
          const cost = d + 0.6;
          if (!best || cost < best.cost) best = { kind: 'air', tx: c.tx, ty: c.ty, cell: [x, y], op: 'place', cost };
        }
      }
    }
    return best;
  }
  const blocked = (S, key) => (S.block[key] || 0) > G.time;
  function wallDone(S) {
    for (const c of [...PLAN.inner, ...PLAN.top]) if (!isPl(cellAt(...RC(S, c)))) return false;
    return true;
  }
  function turretsOnMySide(S, st) {
    let n = 0;
    st.cell.forEach((c, i) => { if (c && c.k === 'turret' && mine(S, i % COLS)) n++; });
    return n;
  }
  const turretCount = st => st.cell.reduce((n, c) => n + (c && c.k === 'turret' ? 1 : 0), 0);
  // is the wall still open enough to go out and back in? (the inner column 3 tall or less)
  const wallOpen = S => !isPl(cellAt(RX(S, 9), 8)) && !isPl(cellAt(RX(S, 8), 8));

  function buildJob(S, st, p, o, info, g, from) {
    const list = stands(S, p, g, from), help = !!S.helper;
    const any = (cells, ok, air, key) => {
      for (const c of cells) {
        const [x, y] = RC(S, c), k = key + ':' + x + ',' + y;
        if (blocked(S, k)) continue;
        const j = poseFor(S, st, list, x, y, pr => ok(pr, x, y), air);
        if (j) { j.key = k; return j; }
      }
      return null;
    };
    const carrying = st.carry[p.id];
    // 1. a turret in our hands: put it in a turret spot
    if (carrying && !help) {
      const spots = PLAN.turrets.filter(c => { const [x, y] = RC(S, c); return placeable(st, x, y); });
      const j = any(spots, () => false, true, 'turret');
      if (j) return j;
      // no spot can be reached: put it on the ground inside our half (it still shoots)
      const k = any(PLAN.turrets.map(c => [c[0], ZF.ground - 1]), pr => pr.op === 'place', false, 'turret');
      if (k) return k;
      return null;
    }
    if (help) {
      // helping a person: only the wall (no trees, pits, coins or turrets on their half)
      if (carrying || !materialLeft(st)) return null;
      const wantPl = (pr, x, y) => (pr.op === 'place' || pr.op === 'dig') && !isPl(cellAt(x, y));
      const missing = cs => cs.filter(c => !isPl(cellAt(...RC(S, c))));
      const low = [...PLAN.inner, ...PLAN.outer].every(c => c[1] > ZF.ground || isPl(cellAt(...RC(S, c))) || blocked(S, 'build:' + RC(S, c).join(',')));
      return any(missing(PLAN.inner), wantPl, false, 'build') || any(missing(PLAN.outer), wantPl, false, 'build') ||
        (low ? any(missing(PLAN.top), wantPl, true, 'build') : null);
    }
    // 2. heal the heart
    if (st.heart <= ZF.heartMax - ZF.repairHp && st.coins >= ZF.repairCost && (p.id === 0 || !info.partnerCpu || st.heart < 50)) {
      const j = padJob(S, list, RX(S, PLAN.heal), 'heal');
      if (j) return j;
    }
    // the tree at the fix spot grew back: chop it (a hold there chops instead of fixing)
    {
      const x = RX(S, PLAN.fixSpot[0]), t = st.trees.find(q => q.col === x);
      if (t && M().treeUp(t) && !blocked(S, 'chop:' + x)) { const j = chopJob(S, list, x); if (j) return j; }
    }
    // 3. fix cracked blocks on our half (low ones first)
    const cracked = [];
    st.cell.forEach((c, i) => { const x = i % COLS, y = (i / COLS) | 0; if (isPl(c) && c.hp < c.max - 0.01 && mine(S, x)) cracked.push([x, y]); });
    cracked.sort((a, b) => b[1] - a[1]);
    for (const [x, y] of cracked) {
      const k = 'fix:' + x + ',' + y;
      if (blocked(S, k)) continue;
      const j = poseFor(S, st, list, x, y, pr => pr.op === 'fix' && pr.how === 'repair');
      if (j) { j.key = k; return j; }
    }
    const first = st.wave === 1, early = first && st.buildT > 70;
    // 4. first build time: chop our trees, then mine
    if (first) {
      for (const tc of PLAN.trees) {
        const x = RX(S, tc), t = st.trees.find(q => q.col === x);
        if (!t || !M().treeUp(t) || blocked(S, 'chop:' + x)) continue;
        if (st.buildT < 60 && x !== RX(S, PLAN.fixSpot[0])) continue;
        const j = chopJob(S, list, x);
        if (j) return j;
      }
      if (early && wallOpen(S)) {
        const j = any(PLAN.mine.filter(c => isNat(cellAt(...RC(S, c)))), pr => pr.op === 'dig', false, 'mine');
        if (j) return j;
        // the pit at the fix spot, so the inner column can reach row 13
        const [px, py] = RC(S, PLAN.pit);
        if (pitWanted(S) && isNat(cellAt(px, py)) && isNat(cellAt(RX(S, 9), 13))) {
          const k = any([PLAN.pit], pr => pr.op === 'dig', false, 'mine');
          if (k) return k;
        }
      }
    }
    // 5. build the wall: inner column, outer column (from outside, while we can still get back in), the top
    if (materialLeft(st)) {
      const wantPl = (pr, x, y) => (pr.op === 'place' || pr.op === 'dig') && !isPl(cellAt(x, y));
      const missing = cs => cs.filter(c => !isPl(cellAt(...RC(S, c))));
      let j = any(missing(PLAN.inner), wantPl, false, 'build');
      if (j) return j;
      j = any(missing(PLAN.outer), wantPl, false, 'build');
      if (j) return j;
      j = any(floorHoles(S, st), pr => pr.op === 'place', false, 'floor');
      if (j) return j;
      // the top only once the low wall is up (it closes the wall), and the outer top from above
      const low = [...PLAN.inner, ...PLAN.outer].every(c => c[1] > ZF.ground || isPl(cellAt(...RC(S, c))) || blocked(S, 'build:' + RC(S, c).join(',')));
      if (low || !first) {
        j = any(missing(PLAN.top), wantPl, true, 'build');
        if (j) return j;
      }
    }
    // 6. buy a turret once the wall is up
    const freeSpots = PLAN.turrets.slice(0, PLAN.mySlots).filter(c => { const [x, y] = RC(S, c); return placeable(st, x, y) && !blocked(S, 'turret:' + x + ',' + y); }).length;
    const carried = (st.carry[0] ? 1 : 0) + (st.carry[1] ? 1 : 0);
    if (freeSpots && wallDone(S) && st.coins >= ZF.turretCost && turretCount(st) + carried < ZF.turretMax && !blocked(S, 'buyturret')) {
      const j = padJob(S, list, ZF.pads.turret, 'buyturret');
      if (j) return j;
    }
    // 7. upgrades of the inner column's low blocks (coins: keep enough for a turret while spots are free)
    const reserve = freeSpots && turretCount(st) + carried < ZF.turretMax ? ZF.turretCost : 0;
    for (const c of PLAN.upgrade) {
      const [x, y] = RC(S, c), cell = cellAt(x, y), k = 'up:' + x + ',' + y;
      if (!isPl(cell) || blocked(S, k)) continue;
      const cost = M().upCost(cell.k);
      if (!cost || !M().canPay(st, cost)) continue;
      if (cost.coins && st.coins - cost.coins < reserve) continue;
      const j = poseFor(S, st, list, x, y, pr => pr.op === 'fix' && pr.how === 'upgrade');
      if (j) { j.key = k; return j; }
    }
    // 8. a better gun when there are coins to spare
    const lv = st.gun[p.id];
    if (lv < ZF.guns.length - 1 && st.coins >= ZF.gunCost[lv + 1] + reserve && !blocked(S, 'gun')) {
      const j = padJob(S, list, ZF.pads.guns, 'gun');
      if (j) return j;
    }
    // 9. the tree at the fix spot grew back: more wood
    {
      const x = RX(S, PLAN.fixSpot[0]), t = st.trees.find(q => q.col === x);
      if (t && M().treeUp(t) && !blocked(S, 'chop:' + x)) { const j = chopJob(S, list, x); if (j) return j; }
    }
    return null;
  }
  function padJob(S, list, x, what) {
    const s = list.find(q => q.c.tx === x && q.c.ty === ZF.pads.row);
    return s ? { kind: 'buy', tx: x, ty: ZF.pads.row, f: 0, key: what, what } : null;
  }
  function chopJob(S, list, x) {
    const s = list.find(q => q.c.tx === x && q.c.ty === ZF.ground - 1);
    return s ? { kind: 'chop', tx: x, ty: s.c.ty, f: S.m, key: 'chop:' + x } : null;
  }

  /* ---------- shooting ---------- */
  const gunOf = (st, p) => ZF.guns[st.gun[p.id]];
  // does a shot from a player standing with feet at (cx, feet), facing f, straight or low, reach zombie z first?
  function shotHits(st, cx, feet, f, low, z, range) {
    const r = zRect(z), x0 = cx + f * 10, y0 = feet - 15;
    const ax = low ? Math.SQRT1_2 : 1, ay = low ? Math.SQRT1_2 : 0;
    for (let d = 4; d <= range; d += 4) {
      const x = x0 + f * ax * d, y = y0 + ay * d;
      if (x < -20 || x > W + 20 || y > H) return false;
      if (x > r.x - 3 && x < r.x + r.w + 3 && y > r.y - 3 && y < r.y + r.h + 3) return true;
      const tx = Math.floor(x / TT), ty = Math.floor(y / TT);
      if (tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS && cellAt(tx, ty)) return false;
    }
    return false;
  }
  const inFort = z => z.cx > PLAN.innerX && z.cx < COLS - 1 - PLAN.innerX && z.cy <= ZF.ground;
  function shootJob(S, st, p, g, from, z) {
    const list = stands(S, p, g, from), gun = gunOf(st, p), range = gun.v * gun.life;
    let best = null;
    for (const { c, d } of list) {
      if (Math.abs(c.tx * TT + TT / 2 - z.px) > range) continue;
      const cx = c.tx * TT + TT / 2, feet = (c.ty + 1) * TT;
      for (const f of [-1, 1]) for (const low of [false, true]) {
        if (!shotHits(st, cx, feet, f, low, z, range)) continue;
        const near = Math.abs(cx - z.px) < 55 && Math.abs(feet - z.py) < 45;
        const cost = d + (near ? 4 : 0) + (low ? 0.1 : 0) + Math.abs(cx - z.px) / 2000;
        if (!best || cost < best.cost) best = { kind: 'shoot', tx: c.tx, ty: c.ty, f, down: low, cost, z: z.id, key: 'shoot' };
      }
    }
    return best;
  }
  // a shot from right here would hit some zombie
  function shotFromHere(st, p) {
    if (!p.grounded) return null;
    const gun = gunOf(st, p), range = gun.v * gun.life, cx = cpuCx(p), feet = cpuFeet(p);
    for (const low of [false, true]) for (const z of st.zs) if (z.hp > 0 && shotHits(st, cx, feet, p.face, low, z, range)) return { low };
    return null;
  }

  /* ---------- the brain ---------- */
  cpuBrain('zombiefort', {
    // (for bot tests: the planner's pieces)
    dbg: { buildJob: (...a) => buildJob(...a), waveJob: (...a) => waveJob(...a), predict: (...a) => predict(...a), mapInfo: (...a) => mapInfo(...a), stands: (...a) => stands(...a) },
    reset(S, p) { S.m = p.id === 0 ? 1 : -1; S.job = null; S.planT = 0; S.block = {}; S.air = null; S.rel = 0; S.jobT = 0; S.airTries = {}; S.said = {};
      // the partner's half, for helping a person build it (the same plan in the other mirror)
      S.help = { m: -S.m, block: S.block, airTries: S.airTries, helper: true };
    },
    think(S, p, o, dt, info) {
      const out = {};
      const st = info.mst;
      if (!st || !st.cell || !M()) return out;
      if (S.m == null) this.reset(S, p);
      S.human = !info.partnerCpu;
      if (!p.alive || info.intro || st.phase === 'over' || st.idle) { S.job = null; S.air = null; return out; }
      if (!S.hello) { S.hello = true; say(S, p, "I'll build the wall on this side!", 2.4); }
      const g = mapInfo(S, p);
      const from = p.grounded ? navFrom(g, p) : null;
      // a jump that puts a block under us is under way: finish it
      if (S.air) return airStep(S, st, p, out);
      S.planT -= dt; S.jobT += dt;
      if (S.rel > 0) { S.rel--; return out; } // let go of everything for a step (so the next hold starts fresh)
      const hold = st.hold[p.id];
      const busy = S.job && S.job.holding && hold;
      if ((S.planT <= 0 && !busy) || !S.job) {
        S.planT = 0.3;
        const nj = from ? choose(S, st, p, o, info, g, from) : S.job;
        if (nj && S.job && nj.key === S.job.key && nj.tx === S.job.tx && nj.ty === S.job.ty && nj.f === S.job.f) { S.job.cost = nj.cost; S.job.cell = nj.cell; S.job.z = nj.z; S.job.down = nj.down; }
        else if (nj !== S.job) { S.job = nj; S.jobT = 0; if (hold) { S.rel = 1; return out; } }
      }
      // standing somewhere off the walking map (on the partner's head, a block corner): step off toward the fort
      if (p.grounded && !from && (!S.job || p.onPartner)) {
        Object.assign(out, cpuNav(S, p, RX(S, PLAN.guard[0]) * TT + TT / 2, (PLAN.guard[1] + 1) * TT, { tol: 6 }));
        if (p.onPartner && !out.left && !out.right) out.right = S.m < 0, out.left = S.m > 0;
        return out;
      }
      const j = S.job;
      // danger: a zombie right next to us
      const near = st.zs.find(z => z.hp > 0 && Math.abs(z.px - cpuCx(p)) < 34 && Math.abs(z.py - cpuFeet(p)) < 34);
      if (near && st.inv[p.id] <= 0 && p.grounded && !(j && j.what === 'heal' && st.heart < 40)) {
        const facing = Math.sign(near.px - cpuCx(p)) === p.face;
        if (facing && st.php[p.id] > 45 && st.cd[p.id] <= 0) { out.act = 'tap'; return out; }
        const away = near.px < cpuCx(p) ? 1 : -1;
        out.left = away < 0; out.right = away > 0;
        const fx = Math.floor((cpuCx(p) + away * 16) / TT);
        if (cellAt(fx, feetRow(p))) out.jump = 'tap';
        return out;
      }
      if (!j) return idle(S, st, p, out);
      if (S.jobT > 9 && !j.holding) { S.block[j.key] = G.time + 12; S.job = null; return out; }
      return doJob(S, st, p, o, info, g, j, out);
    },
  });

  function choose(S, st, p, o, info, g, from) {
    if (st.phase === 'wave') return waveJob(S, st, p, o, info, g, from);
    // a person stands by the heart holding ▼: join them
    if (S.human && o.alive && o.input.down && Math.abs(cpuCx(o) - M().HX) < 2.2 * TT && feetRow(o) === ZF.pads.row) return readyJob(S);
    const j = buildJob(S, st, p, o, info, g, from);
    if (j) return j;
    // with a person: when our half is done and theirs has no wall yet, help build it
    if (S.human && st.buildT > 25 && !wallDone(S.help)) {
      mapInfo(S.help, p);
      const k = buildJob(S.help, st, p, o, info, g, from);
      if (k) { k.frame = S.help; say(S, p, "I'll help build your wall too!", 2.2, 900); return k; }
    }
    return readyJob(S);
  }
  function readyJob(S) { return { kind: 'ready', tx: RX(S, PLAN.ready), ty: ZF.pads.row, f: -S.m, key: 'ready' }; }
  function waveJob(S, st, p, o, info, g, from) {
    // the heart is getting low: heal it at the heart pad (Pip first when both are computers; Bo joins when it's very
    // low). Below 40 HP this comes before shooting.
    const healAt = p.id === 0 || !info.partnerCpu ? 60 : 30;
    const healNow = st.coins >= ZF.repairCost && st.heart < healAt && !blocked(S, 'heal');
    if (healNow && st.heart < 40) { const j = padJob(S, stands(S, p, g, from), RX(S, PLAN.heal), 'heal'); if (j) return j; }
    // zombies inside the fort: ours first, then the partner's half when they can't
    const inside = st.zs.filter(z => z.hp > 0 && inFort(z));
    const ours = inside.filter(z => mine(S, z.cx));
    const theirs = inside.filter(z => !mine(S, z.cx));
    const targets = ours.length ? ours : theirs;
    if (targets.length) {
      // nearest the heart first
      targets.sort((a, b) => Math.abs(a.px - M().HX) - Math.abs(b.px - M().HX));
      for (const z of targets.slice(0, 3)) { const j = shootJob(S, st, p, g, from, z); if (j) { if (ours.length) say(S, p, 'One got in!', 1.4); return j; } }
    }
    const list = stands(S, p, g, from);
    // fix the wall while the turrets shoot the diggers
    if (turretsOnMySide(S, st) > 0) {
      const cracked = [];
      st.cell.forEach((c, i) => { const x = i % COLS, y = (i / COLS) | 0; if (isPl(c) && c.hp < c.max - 0.01 && mine(S, x) && c.k !== 'turret') cracked.push([x, y, c.hp / c.max]); });
      cracked.sort((a, b) => a[2] - b[2]);
      const fx = RX(S, PLAN.fixSpot[0]), tree = st.trees.find(q => q.col === fx);
      if (cracked.length && tree && M().treeUp(tree)) { const j = chopJob(S, list, fx); if (j) return j; }
      for (const [x, y] of cracked) {
        const j = poseFor(S, st, list, x, y, pr => pr.op === 'fix' && pr.how === 'repair');
        if (j) { j.key = 'fix:' + x + ',' + y; return j; }
      }
      // a dug-out block of the inner column: put it back (no zombie in the way)
      for (const c of PLAN.inner) {
        const [x, y] = RC(S, c);
        if (isPl(cellAt(x, y)) || !placeable(st, x, y) || !materialLeft(st)) continue;
        const j = poseFor(S, st, list, x, y, pr => pr.op === 'place');
        if (j) { j.key = 'build:' + x + ',' + y; return j; }
      }
    }
    if (healNow) { const j = padJob(S, list, RX(S, PLAN.heal), 'heal'); if (j) return j; }
    return { kind: 'guard', tx: RX(S, PLAN.guard[0]), ty: PLAN.guard[1], f: -S.m, key: 'guard' };
  }

  // go to a cell and face a way; returns true once there, standing still, facing it
  function goTo(S, p, j, out, tol = 4) {
    const x = j.tx * TT + TT / 2, feet = (j.ty + 1) * TT;
    const here = p.grounded && Math.floor(cpuCx(p) / TT) === j.tx && feetRow(p) === j.ty;
    if (here && Math.abs(cpuCx(p) - x) <= tol) {
      if (Math.abs(p.vx) > 30) { out.left = p.vx > 0; out.right = p.vx < 0; return false; }
      if (j.f && p.face !== j.f) { out.left = j.f < 0; out.right = j.f > 0; return false; }
      return true;
    }
    const nv = cpuNav(S, p, x, feet, { tol });
    Object.assign(out, nv);
    out.down = false;
    // two computers walking into each other: Bo waits while Pip hops over (else both hop at once, for ever)
    const o = other(p), dir = out.right ? 1 : out.left ? -1 : 0;
    if (p.id === 1 && cpuOn(o.id) && o.alive && dir && p.grounded && Math.abs(cpuFeet(o) - cpuFeet(p)) < 40) {
      const gap = (cpuCx(o) - cpuCx(p)) * dir;
      if (gap > 0 && gap < 60 && (o.input.left || o.input.right) && (o.input.right ? 1 : -1) === -dir) { out.left = out.right = false; out.jump = false; }
    }
    return false;
  }
  function doJob(S, st, p, o, info, g, j, out) {
    const k = p.id;
    if (j.kind === 'ready' || j.kind === 'guard') {
      const at = goTo(S, p, j, out, 13);
      if (at) {
        if (j.kind === 'ready') {
          out.down = true;
          if (S.human && !(o.input.down && Math.abs(cpuCx(o) - M().HX) < 2.2 * TT)) say(S, p, 'Ready! Stand by the heart and hold down', 2.6, 45);
        }
        S.jobT = 0;
      }
      if (st.phase === 'wave') opportunistic(S, st, p, out);
      return out;
    }
    if (j.kind === 'shoot') {
      const z = st.zs.find(q => q.id === j.z && q.hp > 0);
      if (!z) { S.job = null; S.planT = 0; return out; }
      const at = goTo(S, p, j, out, 5);
      if (at) {
        out.down = !!j.down;
        S.jobT = 0;
        if (p.input.down === !!j.down && st.cd[k] <= 0 && shotHits(st, cpuCx(p), cpuFeet(p), p.face, !!j.down, z, 2000)) out.act = 'tap';
        else if (st.cd[k] <= 0) { S.planT = 0; }
      } else opportunistic(S, st, p, out);
      return out;
    }
    if (j.kind === 'air') {
      if (!placeable(st, j.cell[0], j.cell[1])) { S.job = null; S.planT = 0; return out; }
      const at = goTo(S, p, Object.assign({}, j, { f: 0 }), out, 2);
      if (at && CPU.last[k].act) return out; // (let go first)
      if (at && !CPU.last[k].jump) {
        S.air = { t0: G.time, r: j.cell[1], x: j.cell[0], key: j.key, tries: (S.airTries[j.key] || 0) + 1, up: false };
        S.airTries[j.key] = S.air.tries;
        if (S.air.tries > 4) { S.block[j.key] = G.time + 20; S.airTries[j.key] = 0; }
        out.act = true; out.down = true; out.jump = true;
      }
      return out;
    }
    // work / chop / buy: stand there, face, then hold
    const at = goTo(S, p, j, out, j.kind === 'buy' ? 13 : j.kind === 'chop' ? 11 : 2.5); // (a pad works anywhere on it, a trunk 16 px either side)
    if (!at) { j.holding = false; return out; }
    S.jobT = 0;
    // a hold that gets nothing done (a block that won't go in, a zombie in the way): give up on it for a while
    const sig = st.ver + ':' + st.res.dirt + ':' + st.res.wood + ':' + st.res.stone + ':' + st.coins + ':' + st.trees.map(t => t.wood).join('') + ':' + st.carry[k];
    if (sig !== S.sig || !j.holding) { S.sig = sig; S.sigT = G.time; }
    if (j.holding && G.time - S.sigT > 1.6) { S.rel = 2; S.block[j.key] = G.time + 6; S.job = null; S.planT = 0; return out; }
    if (j.kind === 'buy') {
      const h = st.hold[k];
      if (h && h.done) { S.rel = 1; S.job = null; S.planT = 0; S.block[j.key] = G.time + (j.what === 'heal' ? 0.05 : 1.5); return out; }
      out.act = true; j.holding = true;
      if (h && h.t > 1.2) { S.block[j.key] = G.time + 6; S.job = null; S.rel = 2; }
      return out;
    }
    out.down = !!j.down;
    if (p.input.down !== !!j.down) return out; // (the game reads ▼ from the last step)
    const tg = M().target(p);
    const h = st.hold[k];
    const good = j.kind === 'chop' ? tg.op === 'chop' : goodTarget(j.frame || S, st, j, tg, k);
    if (!good) {
      // done (or the hold would do something we don't want): let go and choose again
      if (h) S.rel = 1;
      S.job = null; S.planT = 0;
      if (!j.holding) S.block[j.key] = G.time + 3;
      return out;
    }
    if (h && h.op && h.op !== tg.op) { S.rel = 1; return out; } // a hold keeps its first kind of job: start a new one
    if (h && h.t > 6 && !h.op) { S.rel = 1; S.block[j.key] = G.time + 5; S.job = null; return out; }
    out.act = true; j.holding = true;
    return out;
  }
  // is the live target of a hold one we want for this job?
  function goodTarget(S, st, j, tg, pid) {
    if (!tg || !tg.op) return false;
    const c = cellAt(tg.x, tg.y);
    if (j.op === 'fix' || tg.op === 'fix') {
      if (tg.op !== 'fix' || !isPl(c)) return false;
      if (c.hp < c.max - 0.01) return true;
      const cost = M().upCost(c.k);
      if (!cost || !M().canPay(st, cost) || st.phase === 'wave') return false;
      // upgrades: only the planned ones
      return j.key.startsWith('up:') && tg.x === j.cell[0] && tg.y === j.cell[1];
    }
    if (st.carry[pid]) return tg.op === 'place' && j.key.startsWith('turret') && tg.x === j.cell[0] && tg.y === j.cell[1];
    const inPlan = (cells) => cells.some(q => RX(S, q[0]) === tg.x && q[1] === tg.y);
    if (tg.op === 'dig') {
      if (!isNat(c)) return false;
      return inPlan(PLAN.mine) || inPlan(PLAN.inner) || inPlan(PLAN.outer) || inPlan(PLAN.top) || (inPlan([PLAN.pit]) && pitWanted(S));
    }
    if (tg.op === 'place') return inPlan(PLAN.inner) || inPlan(PLAN.outer) || inPlan(PLAN.top) || floorHole(S, tg.x, tg.y);
    return false;
  }
  // in the air on a "block under me" jump: hold ▼ (no target) until the feet are over the planned cell, then let go
  function airStep(S, st, p, out) {
    const a = S.air, t = G.time - a.t0;
    out.act = true; out.jump = true; out.down = true;
    if (p.grounded && t > 0.12) {
      S.air = null; S.rel = 2; S.planT = 0;
      if (cellAt(a.x, a.r) && cellAt(a.x, a.r).k === 'turret') say(S, p, 'Turret up!', 1.6);
      return { };
    }
    if (t > 1.5) { S.air = null; S.rel = 2; return {}; }
    if (cellAt(a.x, a.r)) { out.act = false; out.down = true; return out; } // (it's in: let go, so nothing else goes in)
    const nextFeet = p.y + p.h + p.vy * DT;
    const row = Math.floor((nextFeet - 1) / TT);
    if (t >= 0.28 && row + 1 === a.r && Math.floor(cpuCx(p) / TT) === a.x) out.down = false;
    return out;
  }
  // nothing planned: stand still
  function idle(S, st, p, out) { if (st.phase === 'wave') opportunistic(S, st, p, out); return out; }
  // a zombie in the line of fire from right here: shoot (straight or low)
  function opportunistic(S, st, p, out) {
    if (st.cd[p.id] > 0 || !p.grounded || out.left || out.right) return;
    const s = shotFromHere(st, p);
    if (!s) return;
    if (p.input.down !== s.low) { out.down = s.low; return; }
    out.down = s.low; out.act = 'tap';
  }
})();
