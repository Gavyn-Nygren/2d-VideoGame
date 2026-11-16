/* Pip & Bo - Computer partner: 2-1 Brick by Brick and 2-2 Sky Tower. */
'use strict';

(() => {
  /* The roles swap every round (Pip builds first), so each step it checks which one it has now.

     BUILDER (no body: it steers the falling piece). It aims for a staircase up to the flag ledge: the column next to
     the ledge 2 blocks under it, each column further away 2 lower (the target heights). For each new piece it tries
     every turn and every column it can slide to, drops it in its head, and scores the stack it would leave: blocks
     still missing from the stairs count most, then steps too high to jump, blocks where the stairs don't need them (in
     Sky Tower the far side is kept clear for the climber), holes, and above all a climber shut in a pit. It looks one
     piece ahead (the HUD shows everyone the next piece). Never on the climber, never over their head, no roof over an
     open gap beside them (in Brick by Brick nothing can break it), and in the tower not right beside them. It thinks
     for a moment (longer on easy), turns the piece, slides it over and holds ▼; it picks again every so often, so if
     the climber moves under the piece (or runs toward where it's going) it lets go of ▼ and goes elsewhere. Once the
     stairs are done, extra pieces go where they get in nobody's way, and in Brick by Brick never up near the ceiling
     (a wall there could never be passed). With a person climbing it says "Climb up!" when there's a way, and "Move
     over, please!" if they stand where the stairs need blocks (in 1-player mode the HUD line at the bottom shows it).

     CLIMBER. It finds the way to the ledge with cpuNav (the falling piece left out of the map: it moves). No way yet:
     it waits on the highest spot it can reach, so it rides up with the stack instead of being walled in below, but not
     under a piece that is about to land, not in a pit, not on or next to a column the stairs still need (the builder
     needs room there), and not below a block higher up on its way to the ledge that isn't part of the stairs (one more
     piece there and it would be cut off). It stands in the middle of a column and doesn't wander for a block's
     difference: every move risks walking under a piece. It never steps in under a piece about to land, and if it is
     boxed in (tower) it jumps into the block over its head until it breaks. If the tower is stacked to the top and no
     piece can come, it hops along the top to the ledge. With a person building it asks for steps now and then. */

  const rotate = (cells, n) => cells.map(([x, y]) => [n - 1 - y, x]); // the same turn as tryRotate
  const solidAt = (L, x, y) => y >= ROWS || x < 0 || x >= COLS || (y >= 0 && (L.grid[y][x] === '#' || L.grid[y][x] === 'P'));

  // the shape of the build area, the ledge and the stairs it aims for (cached per level and round)
  function geo(st) {
    const L = G.level, a = L.def.build, key = G.levelIndex + ':' + G.build.round;
    if (st.geo && st.geo.key === key) return st.geo;
    let floor = 1;
    while (floor < ROWS && L.grid[floor][a.x0] !== '#') floor++;
    const ledgeTop = L.goal.y / T + 1, ledgeH = floor - ledgeTop, right = a.goalX > a.x1 * T;
    const edge = right ? a.x1 : a.x0, want = {};
    for (let x = a.x0; x <= a.x1; x++) want[x] = Math.max(0, ledgeH - 2 - 2 * Math.abs(x - edge));
    return (st.geo = { key, x0: a.x0, x1: a.x1, floor, ledgeH, right, edge, want, tower: isTower() });
  }
  // column heights (top block in each column, counted up from the floor) and holes, with the cells in `fill` added
  function survey(g, fill) {
    const L = G.level, h = {};
    let holes = 0;
    for (let x = g.x0; x <= g.x1; x++) {
      let top = g.floor;
      for (let y = 1; y < g.floor; y++) if (fill.has(y * COLS + x) || solidAt(L, x, y)) { top = y; break; }
      h[x] = g.floor - top;
      for (let y = top + 1; y < g.floor; y++) if (!fill.has(y * COLS + x) && !solidAt(L, x, y)) holes++;
    }
    return { h, holes };
  }
  // how many blocks the climber, standing in column cx, is shut in below the top of the stack (steps up of 3 at most,
  // any way down): 0 when they can get up to the top or onto the ledge
  function shutIn(g, h, cx) {
    const seen = new Set([cx]), q = [cx];
    let top = 0, best = 0;
    for (let x = g.x0; x <= g.x1; x++) top = Math.max(top, h[x]);
    while (q.length) {
      const x = q.pop();
      best = Math.max(best, h[x]);
      if (x === g.edge && h[x] >= g.ledgeH - 3) return 0;
      for (const n of [x - 1, x + 1]) if (n >= g.x0 && n <= g.x1 && !seen.has(n) && h[n] - h[x] <= 3) { seen.add(n); q.push(n); }
    }
    return Math.max(0, top - 3 - best);
  }
  // how far a stack is from the stairs it wants (lower is better)
  function badness(g, s, ccol) {
    const { h } = s;
    let bad = s.holes * 1.5;
    for (let x = g.x0; x <= g.x1; x++) {
      const w = g.want[x], d = h[x] - w;
      if (d < 0) bad -= d * 10;                                   // blocks still missing
      else if (d > 0) bad += d * (w > 0 ? 3 : g.tower ? 6 : 1);   // blocks where they aren't needed
      // (Brick by Brick: a column up near the ceiling becomes a wall nobody can get past, and nothing breaks it)
      if (!g.tower && h[x] > g.ledgeH + 2) bad += (h[x] - g.ledgeH - 2) * 10;
      // (Sky Tower: a column right up to the top of the screen is a wall too: head-butts only break blocks from below)
      else if (g.tower && h[x] >= g.floor - 2) bad += 30;
      if (x < g.x1) {
        const r = (h[x + 1] - h[x]) * (g.right ? 1 : -1);          // a step up on the way to the ledge
        if (r > 3) bad += 3 + (r - 3) * 12; else if (r === 3) bad += 3;
        if (r < -3) bad += (-r - 3) * 2;
      }
      // a pit the climber could fall into and not get out of
      if (x > g.x0 && x < g.x1 && h[x - 1] - h[x] >= 3 && h[x + 1] - h[x] >= 3) bad += 6;
    }
    // walls that shut the climber in where they stand
    if (ccol != null) { const n = shutIn(g, h, ccol); if (n) bad += 150 + n * 25; }
    return bad;
  }
  // the climber's body, a little bigger (they move about), as a rectangle test for a tile
  // (lead: also where they'll be that many seconds from now if they keep running)
  function onClimber(cl, tx, ty, padX, padY, lead = 0) {
    const ahead = cl.vx * lead, x0 = cl.x + Math.min(0, ahead) - padX, x1 = cl.x + cl.w + Math.max(0, ahead) + padX;
    return cl.alive && tx * T < x1 && tx * T + T > x0 && ty * T < cl.y + cl.h + 2 && ty * T + T > cl.y - padY;
  }
  // would the piece touch the climber anywhere on its way down from where it is to row `toY` (tower: it falls through)?
  function sweepHits(cl, pc, toY, padX, lead) {
    for (let y = pc.y; y <= toY; y++) if (pc.cells.some(([cx, cy]) => onClimber(cl, pc.x + cx, y + cy, padX, 0, lead))) return true;
    return false;
  }
  // is the cell (tx, ty) a roof beside the climber: in their column or the next, above their head, with open space
  // under it at their height?
  function roof(g, fill, cl, tx, ty) {
    if (!cl.alive) return false;
    const cc = Math.floor(cpuCx(cl) / T), head = Math.floor(cl.y / T), feet = Math.floor((cl.y + cl.h - 1) / T);
    if (Math.abs(tx - cc) > 1 || ty >= head + 1) return false;
    for (let y = ty + 1; y <= feet; y++) {
      const open = !fill.has(y * COLS + tx) && !solidAt(G.level, tx, y);
      if (open && y >= head) return true;
      if (!open) return false;
    }
    return false;
  }
  // can a piece sit here (the game's pieceFits, ignoring the climber, with extra cells in `fill`)?
  function canPlace(g, fill, cells, px, py) {
    const L = G.level;
    for (const [cx, cy] of cells) {
      const gx = px + cx, gy = py + cy;
      if (gx < g.x0 || gx > g.x1 || gy >= ROWS) return false;
      if (gy < 0) continue;
      if (L.grid[gy][gx] !== '.' || fill.has(gy * COLS + gx)) return false;
    }
    return true;
  }
  // every place a piece can be dropped from (px, py): each turn, each column it can slide to from there
  function places(g, fill, cells, n, type, px, py) {
    const list = [];
    for (let r = 0; r < (type === 'O' ? 1 : 4); r++) {
      if (r) cells = rotate(cells, n);
      const fits = x => canPlace(g, fill, cells, x, py) || canPlace(g, fill, cells, x, py + 1);
      if (!fits(px)) continue;
      let lo = px, hi = px;
      while (fits(lo - 1)) lo--;
      while (fits(hi + 1)) hi++;
      for (let x = lo; x <= hi; x++) {
        let y = canPlace(g, fill, cells, x, py) ? py : py + 1;
        while (canPlace(g, fill, cells, x, y + 1)) y++;
        list.push({ cells, x, y, r, abs: cells.map(([cx, cy]) => [x + cx, y + cy]) });
      }
    }
    return list;
  }
  const withCells = (fill, abs) => { const f = new Set(fill); for (const [x, y] of abs) f.add(y * COLS + x); return f; };
  // where the piece goes: the best stack after this piece and the next one (the HUD shows the next piece to everyone)
  function choose(g, pc, cl) {
    const tw = g.tower, B = G.build, none = new Set();
    const ccol = cl.alive ? clamp(Math.floor(cpuCx(cl) / T), g.x0, g.x1) : null;
    // (a climber standing still near the edge of a column doesn't rule out the next column: that would leave a
    // climber waiting in a pit with no steps ever built beside them; a running one rules out where they're about to be)
    const pad = cl.grounded && Math.abs(cl.vx) < 30 ? 1 : 4;
    const opts = places(g, none, pc.cells, pc.n, pc.type, pc.x, pc.y);
    for (const o of opts) {
      o.fill = withCells(none, o.abs);
      o.score = badness(g, survey(g, o.fill), ccol);
      // never on the climber or anywhere over their head (a squash in the tower, or a roof that boxes them in;
      // in Brick by Brick it would stop on their head)
      if (o.abs.some(([tx, ty]) => onClimber(cl, tx, ty, pad, 600, 0.3))) o.score += 1000;
      // no roof next to them either: a block hanging over an open gap beside them (they could walk in under it
      // and be shut in; in Brick by Brick nothing can break it)
      else if (o.abs.some(([tx, ty]) => roof(g, o.fill, cl, tx, ty))) o.score += 500;
      // in the tower, not right beside them either (they might step under it)
      else if (tw && o.abs.some(([tx, ty]) => onClimber(cl, tx, ty, T, 60))) o.score += 15;
      o.score += Math.abs(o.x - pc.x) * 0.05 + o.r * 0.1;
    }
    opts.sort((a, b) => a.score - b.score);
    // look one piece ahead for the most promising few
    const nx = B.next && TETRO[B.next];
    if (nx) {
      for (const o of opts.slice(0, 8)) {
        if (o.score >= 1000) break;
        let b2 = Infinity;
        const cells = nx.cells.map(c => c.slice());
        for (const q of places(g, o.fill, cells, nx.n, B.next, G.level.def.build.spawnCol - Math.floor(nx.n / 2), 1)) {
          b2 = Math.min(b2, badness(g, survey(g, withCells(o.fill, q.abs)), ccol));
        }
        if (b2 < Infinity) o.score = o.score * 0.35 + b2 * 0.65;
      }
      opts.sort((a, b) => a.score - b.score);
    }
    const best = opts[0];
    return best ? { cells: best.cells.map(c => c.slice()), x: best.x, y: best.y, score: best.score } : null;
  }

  function builder(st, p, o, dt, info) {
    const out = {}, B = G.build, pc = B.piece, g = geo(st), cl = G.players[B.climber];
    if (!pc) { st.pc = null; return out; }
    // a new piece: how many blocks the stairs still miss, and for how many pieces that hasn't changed; then think for
    // a moment (longer on easy) before moving it
    if (st.pc !== pc) {
      // (Sky Tower, Gavyn: it used to place blocks far faster than a person could. It now plays at a person's pace:
      // a proper look at each new piece, one press per turn or column, and a short check before it drops it. It
      // hurries up only when the piece would land before it got there: then a slow builder would just be a bad one.)
      const room = ghostY(pc) - pc.y, calm = g.tower ? clamp((room * BUILD.fall - 1.2) / 3, 0, 1) : 0;
      st.pace = calm;
      st.pc = pc; st.plan = null; st.wait = 0.15 + 0.6 * (1 - info.skill) + Math.random() * 0.2 + calm * (0.25 + Math.random() * 0.2);
      st.tapT = 0; st.stuckT = 0; st.lastX = pc.x; st.settleT = calm * (0.3 + Math.random() * 0.2);
      const h = survey(g, new Set()).h;
      let miss = 0;
      for (let x = g.x0; x <= g.x1; x++) miss += Math.max(0, g.want[x] - h[x]);
      st.stall = miss && miss === st.miss ? (st.stall || 0) + 1 : 0; st.miss = miss;
      // can the climber get to the flag now? (only known while they stand)
      const gx = G.level.def.build.goalX + T, gfeet = G.level.goal.y + T;
      st.way = cl.alive && cl.grounded && noPiece(() => cpuNavReach(cl, gx, gfeet)) < Infinity;
      // with a person climbing, tell them what helps (in 1-player mode the HUD shows it)
      if (!cpuOn(cl.id) && cl.alive && cl.grounded) {
        const cc = Math.floor(cpuCx(cl) / T), need = x => x >= g.x0 && x <= g.x1 && h[x] < g.want[x];
        // there's a way up now: go! (again after a while if they wait)
        if ((!st.toldT || G.time - st.toldT > 15) && st.way) { st.toldT = G.time; cpuSay(p, 'Climb up!', 4); }
        // they stand where the stairs still need blocks and the last few pieces couldn't go there: ask them to move
        else if (st.stall >= 3 && (need(cc) || need(cc - 1) || need(cc + 1)) && (!st.movedT || G.time - st.movedT > 12)) { st.movedT = G.time; cpuSay(p, 'Move over, please!', 4); }
      }
    }
    // (the climber is in the way of the piece, or about to be: no more dawdling, it gets the piece out of the way at
    // full speed for the rest of this piece, as a person would hurry)
    if (st.pace > 0 && g.tower && sweepHits(cl, pc, pc.y + 6, 8, 0.4)) { st.pace = 0; st.settleT = 0; st.wait = Math.min(st.wait, 0.1); }
    if (st.wait > 0) { st.wait -= dt; return out; }
    st.replanT = (st.replanT || 0) - dt;
    if (!st.plan || st.replanT <= 0) { st.plan = choose(g, pc, cl); st.replanT = 0.25; }
    const P = st.plan;
    if (!P) return out;
    st.tapT -= dt;
    const same = JSON.stringify(pc.cells) === JSON.stringify(P.cells);
    // turn it (one press at a time, at a person's pace)
    if (!same) {
      if (st.tapT <= 0 && !CPU.last[p.id].jump) { out.jump = true; st.tapT = 0.07 + 0.12 * (1 - info.skill) + st.pace * (0.15 + Math.random() * 0.1); }
      return out;
    }
    // slide it over: hold for a long way, tap for the last column
    const dx = P.x - pc.x;
    if (dx) {
      const dir = Math.sign(dx), held = dir > 0 ? CPU.last[p.id].right : CPU.last[p.id].left;
      st.stuckT = pc.x === st.lastX ? st.stuckT + dt : 0; st.lastX = pc.x;
      if (st.stuckT > 0.4 + st.pace * 0.3) { st.plan = null; st.stuckT = 0; return out; } // blocked: pick again from here
      // (at a person's pace: one tap a column, with a little gap between taps)
      if (st.pace > 0) {
        if (st.tapT <= 0 && !held) { out.left = dir < 0; out.right = dir > 0; st.tapT = 0.1 + st.pace * (0.08 + Math.random() * 0.08); }
        return out;
      }
      if (Math.abs(dx) >= 2 || !held) { out.left = dir < 0; out.right = dir > 0; }
      return out;
    }
    // in place: drop it fast, unless that would now land on the climber
    // (in the tower the piece falls through where the climber is, so every row on the way down counts)
    const gy = ghostY(pc), hit = g.tower ? sweepHits(cl, pc, gy, 2, 0.3) : pc.cells.some(([cx, cy]) => onClimber(cl, pc.x + cx, gy + cy, 2, 400, 0.3));
    if (hit) { st.replanT = Math.min(st.replanT, 0.05); return out; }
    // a last look before dropping it (a person checks the shadow before pressing down)
    if (st.settleT > 0) { st.settleT -= dt; return out; }
    // (the climber has a way up, or the last pieces couldn't help: no hurry, a spare piece only gets in the way, so it
    // lets it fall by itself and the climber has time to go)
    out.down = !(st.way || st.stall >= 3);
    return out;
  }

  // ---- climber ----
  // cpuNav with the falling piece left out of the map (it moves; the map would go stale)
  function noPiece(fn) {
    const a = G.activeSet;
    G.activeSet = null;
    try { return fn(); } finally { G.activeSet = a; }
  }
  // the columns the falling piece is over, and one more on each side (it might slide, and a block landing beside
  // the climber can make a roof over them)
  function pieceCols(g) {
    const pc = G.build.piece, set = new Set();
    if (!pc) return set;
    for (const [cx] of pc.cells) for (let k = -1; k <= 1; k++) set.add(pc.x + cx + k);
    return set;
  }
  // where to wait while there's no way up yet (recomputed now and then)
  function waitSpot(st, p, g) {
    // (it only steps aside from a piece that has stopped sliding or is about to land: a piece passing over on its way
    // somewhere else would send it running to where the piece is going, and in the tower, where pieces always come in
    // over the middle, it would only ever wait at the sides, right where the stairs have to go)
    const pc = G.build.piece, near = pc && (st.pcStill > 0.2 || ghostY(pc) - pc.y <= (g.tower ? 6 : 4));
    const s = survey(g, new Set()), danger = near ? pieceCols(g) : new Set(), L = G.level, here = Math.floor(cpuCx(p) / T);
    const was = st.spot && Math.floor(st.spot.x / T);
    let best = null, bs = -Infinity, top = 0;
    for (let x = g.x0; x <= g.x1; x++) top = Math.max(top, s.h[x]);
    for (let x = g.x0; x <= g.x1; x++) {
      const feet = (g.floor - s.h[x]) * T;
      if (solidAt(L, x, g.floor - s.h[x] - 1)) continue; // no room to stand
      // the highest safe spot: not in a pit, not under the piece, and not on or next to a column the stairs still
      // need (blocks are coming there: standing there would leave the builder no room to finish the stairs). Up high
      // it rides up with the stack instead of being walled in down below. It doesn't wander about for a block's
      // difference: every move is a chance to walk under a piece.
      // (a pit: both sides 2 or more higher; past the edge of the area is the ledge on one side, a wall on the other)
      const side = n => (n >= g.x0 && n <= g.x1 ? s.h[n] : (n > g.x1) === g.right ? g.ledgeH : 99);
      const deep = Math.min(side(x - 1), side(x + 1)) - s.h[x], pit = deep >= 2 ? 8 + (deep - 2) * 8 : 0;
      const need = n => n >= g.x0 && n <= g.x1 && s.h[n] < g.want[n];
      // blocks 2 or more higher than here on the way to the ledge that aren't the planned stairs: one more piece there
      // and it could be cut off (say a person is building a flat floor beside it), so it gets on top of them first
      let rise = 0;
      for (let n = x + (g.right ? 1 : -1); n >= g.x0 && n <= g.x1; n += g.right ? 1 : -1) if (s.h[n] > g.want[n]) rise = Math.max(rise, s.h[n] - s.h[x]);
      const v = s.h[x] * 3 - (danger.has(x) ? 100 : 0) - pit - (need(x) ? (g.tower ? 10 : 25) : 0) - (rise >= 2 ? (rise - 1) * 15 : 0)
        - (need(x - 1) || need(x + 1) ? 12 : 0) - Math.abs(x - here) * (g.tower ? 1.5 : 0.3)
        // (Sky Tower: it doesn't hop down into a column the stairs still need to get out of a piece's way: the builder
        // can't put blocks there while it stands in it, the columns beside it grow into walls, and it ends up shut in
        // a shaft right where the top steps have to go)
        - (g.tower && need(x) && s.h[x] < s.h[clamp(here, g.x0, g.x1)] - 1 ? 80 : 0)
        + (x === was ? 4 : 0) + (x === here ? 2 : 0);
      if (v <= bs) continue;
      const reach = noPiece(() => cpuNavReach(p, x * T + T / 2, feet));
      if (reach === Infinity) continue;
      bs = v; best = { x: x * T + T / 2, feet };
    }
    return best;
  }

  function climber(st, p, o, dt, info) {
    const out = {}, B = G.build, L = G.level, g = geo(st);
    if (!p.alive) return out;
    const gx = L.def.build.goalX + T, gfeet = L.goal.y + T;
    // boxed in (tower): jump into the block over its head until it breaks
    if (B.trapped) {
      const tx = Math.floor(cpuCx(p) / T);
      let best = null;
      for (const x of [tx, tx - 1, tx + 1]) {
        for (let y = Math.floor(p.y / T); y >= 0; y--) if (solidAt(L, x, y)) { if (L.grid[y][x] === 'P' && !solidAt(L, x, Math.floor((p.y + p.h - 1) / T))) { if (!best || y > best.y) best = { x, y }; } break; }
      }
      if (best) { cpuSteer(out, p, best.x * T + T / 2, 4); out.jump = p.grounded ? 'tap' : p.vy < 0; return out; }
    }
    st.reachT = (st.reachT || 0) - dt;
    // how long the falling piece has stayed in the same column since the builder last slid it (a piece still where
    // it came in doesn't count: the builder hasn't aimed it yet)
    const same = B.piece && B.piece === st.pcRef;
    st.pcMoved = same && (st.pcMoved || B.piece.x !== st.pcX);
    st.pcStill = same && st.pcMoved && B.piece.x === st.pcX ? st.pcStill + dt : 0;
    st.pcRef = B.piece; st.pcX = B.piece && B.piece.x;
    // the piece moved or turned: look again soon (after a person's reaction time)
    const pk = B.piece ? B.piece.x + ':' + B.piece.cells.join(',') : '';
    if (pk !== st.pk) { st.pk = pk; st.reachT = Math.min(st.reachT, 0.15); }
    if (st.reachT <= 0 && p.grounded) { // (cpuNavReach needs it standing)
      st.reachT = 0.3;
      st.way = noPiece(() => cpuNavReach(p, gx, gfeet)) < Infinity;
      if (!st.way) st.spot = waitSpot(st, p, g);
    }
    // don't walk in under the falling piece (in the tower it squashes; in Brick by Brick it stops on your head and
    // roofs you in, so there only a piece that has stopped sliding or is about to land): wait until it lands
    const pc = B.piece, danger = pc && (g.tower || st.pcStill > 0.2 || ghostY(pc) - pc.y <= 4) && pieceCols(g);
    const underPiece = x => danger && danger.has(Math.floor(x / T)) && pc && (pc.y + 2) * T < p.y + 10;
    if (st.way) {
      st.waitT = 0;
      // (once per way found, and not again within 10 s if the way comes and goes)
      if (!st.said && !(G.time - st.saidT < 10)) { st.said = 1; st.saidT = G.time; if (!cpuOn(o.id)) cpuSay(p, 'Here I go!'); }
      const r = noPiece(() => cpuNav(st, p, gx, gfeet, { tol: 8 }));
      const nx = cpuCx(p) + (r.right ? T : r.left ? -T : 0);
      if (underPiece(nx) && !underPiece(cpuCx(p)) && p.grounded) return out; // let it land first
      return r;
    }
    st.said = 0;
    // the stack is up to the top and no piece can come (tower): a way along the very top needs jumps cpuNav doesn't
    // take (the top of the screen is a ceiling: a 3-block jump up to the top row only just fits), so it just heads
    // for the ledge, hopping onto each block in the way (from wherever it waits: nothing will change the stack now)
    if (g.tower && B.noSpawnT > 2) {
      cpuSteer(out, p, gx, 4);
      const pushing = cpuFor(st, 'push', p.grounded && Math.abs(p.vx) < 5 && (out.left || out.right), dt);
      if (pushing > 0.1) out.jump = true;
      else out.jump = !p.grounded && p.vy < 0;
      return out;
    }
    // no way up yet: ask a person for steps now and then
    st.waitT = (st.waitT || 0) + dt;
    if (!cpuOn(o.id) && st.waitT > 15) { st.waitT = 0; cpuSay(p, 'Build me steps!'); }
    if (!st.spot) {
      // nowhere to wait: probably in a pocket the path finder can't see out of (the game's jumps are a bit more forgiving
      // than its copy of them). Every few seconds try a jump out, to the other side each time.
      if (cpuFor(st, 'boxed', p.grounded && !(st.escT > 0), dt) > 3) { st._for_boxed = 0; st.escDir = -(st.escDir || 1); st.escT = 0.7; }
      if (st.escT > 0) { st.escT -= dt; out.left = st.escDir < 0; out.right = st.escDir > 0; out.jump = st.escT > 0.3; }
      return out;
    }
    // (it stands in the middle of the column: a body poking into the next column would block blocks there too)
    const r = noPiece(() => cpuNav(st, p, st.spot.x, st.spot.feet, { tol: 3 }));
    const nx = cpuCx(p) + (r.right ? T : r.left ? -T : 0);
    if (underPiece(nx) && !underPiece(cpuCx(p)) && p.grounded) return out; // let it land first
    return r;
  }

  cpuBrain('build', {
    reset(st) { st.round = -1; },
    // the builder has no body: its words go over the falling piece (or the top of the build area)
    bubblePos(p) {
      const B = G.build;
      if (!B || p.id !== B.builder) return { x: cpuCx(p), y: p.y };
      return null; // the builder's words show on the HUD line at the bottom (drawBuildHUD)
    },
    think(st, p, o, dt, info) {
      const B = G.build;
      if (!B || B.phase !== 'play' || info.intro) return {};
      // a new round (the roles swap): start fresh
      if (st.round !== B.round) { for (const k in st) delete st[k]; st.round = B.round; }
      return p.id === B.builder ? builder(st, p, o, dt, info) : climber(st, p, o, dt, info);
    },
  });
})();
