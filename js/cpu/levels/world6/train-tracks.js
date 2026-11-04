/* Pip & Bo - Computer partner: train tracks. */
'use strict';

(() => {
  /* The level gives each room a builder and a switcher (st.builder / st.switcher), so there is no job to pick:
     the computer does the one it has, with what a person sees on screen (the dotted route preview, the red and green
     lamps, the next stop, the squirrel).
     Builder: works out the way the train should go (every junction set right for each stop, stops in trip order) and lays
     the first dotted cell on it. Empty hands, or few pieces and the wagon closer than the next dot: top up at the wagon.
     Nothing left to lay: top up to full hands and stand by.
     Switcher: shoos a squirrel first, then fixes the first red lamp on the preview (walk to its lever, tap the action),
     else waits by the lever of the next junction the train will reach.
     Walking: a breadth-first walk map from the target over the room's cells (redone when the target or the map changes,
     at most a few times a second), steering to the centre of the next cell downhill. */
  const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };

  /* ---------- walking ---------- */
  // walk map from cell (tx, ty): d[i] = steps to the target, -1 = can't get there. block(x, y) keeps extra cells out.
  function flood(S, tx, ty, block) {
    const st = G.mst, n = COLS * ROWS, d = S.d || (S.d = new Int16Array(n)), q = S.q || (S.q = new Int16Array(n));
    d.fill(-1);
    let h = 0, m = 0;
    d[ty * COLS + tx] = 0; q[m++] = ty * COLS + tx;
    while (h < m) {
      const i = q[h++], x = i % COLS, y = (i / COLS) | 0;
      for (const [dx, dy] of STEPS) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        const k = ny * COLS + nx;
        if (d[k] >= 0 || trainSolid(st, nx, ny) || (block && block(nx, ny))) continue;
        d[k] = d[i] + 1; q[m++] = k;
      }
    }
    return d;
  }
  // a cheap key for "the walkable map changed" (bridges laid or fallen)
  function mapKey(st) { let k = 0; for (const c of st.cells) if (c.water && c.track && !c.ghost) k += c.i + 1; return k; }

  // one step toward point (x, y) inside cell (tx, ty); returns the steps left (Infinity: no way there)
  function walkTo(S, p, out, tx, ty, x, y, block, dead = 3) {
    const st = G.mst, key = tx + ',' + ty + ',' + mapKey(st) + (block ? 'b' : '');
    S.mapT = (S.mapT || 0) - 1;
    if (S.mapKey !== key || S.mapT <= 0) {
      S.mapKey = key; S.mapT = 30;
      flood(S, tx, ty, block);
      // the way is blocked by the cells we keep out of: allow them after all
      if (block && cellD(S, p) < 0) { flood(S, tx, ty, null); }
    }
    const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2, cx = Math.floor(pcx / T), cy = Math.floor(pcy / T);
    let gx = x, gy = y, left = cellD(S, p);
    if (left > 0) {
      // the neighbour one step nearer (prefer the one in the direction we already face)
      let best = null;
      for (const [dx, dy] of STEPS) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        const v = S.d[ny * COLS + nx];
        if (v >= 0 && v < left && (!best || v < best.v)) best = { x: nx, y: ny, v };
      }
      if (best) { gx = best.x * T + 15; gy = best.y * T + 15; }
    } else if (left < 0) left = Infinity;
    // stuck against something: wiggle sideways for a moment
    const moved = Math.hypot(pcx - (S.lx || 0), pcy - (S.ly || 0));
    S.lx = pcx; S.ly = pcy;
    S.stuck = moved < 0.2 && (Math.abs(gx - pcx) > dead || Math.abs(gy - pcy) > dead) ? (S.stuck || 0) + 1 : 0;
    if (S.stuck > 40) { S.wig = 30; S.wigD = Math.random() < 0.5 ? 1 : -1; S.stuck = 0; }
    if (S.wig > 0) {
      S.wig--;
      if (Math.abs(gx - pcx) > Math.abs(gy - pcy)) gy = pcy + S.wigD * 20; else gx = pcx + S.wigD * 20;
    }
    out.right = gx - pcx > dead; out.left = gx - pcx < -dead;
    out.down = gy - pcy > dead; out.up = gy - pcy < -dead;
    return left;
  }
  function cellD(S, p) {
    const cx = Math.floor((p.x + p.w / 2) / T), cy = Math.floor((p.y + p.h / 2) / T);
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return -1;
    return S.d[cy * COLS + cx];
  }
  const near = (p, x, y) => Math.hypot(p.x + p.w / 2 - x, p.y + p.h / 2 - y);

  /* ---------- the way the train should go ---------- */
  // cells ahead of the engine, every junction set the best way for each stop in trip order (stops after the current one
  // too, so the builder can work ahead). Cached per tick.
  function plan(st) {
    if (st._cpuPlanT === G.tickN && st._cpuPlan) return st._cpuPlan;
    const fn = MODES.train.fn, cells = [];
    let idx = st.phase === 'dwell' ? st.trip + 1 : st.trip;
    if (st.phase !== 'done' && st.tr) {
      let cur = st.tr.hist[0], extra = 1; // the engine stops one cell past the last stop: that cell is needed too
      for (let k = 0; k < 160 && (idx < st.trips.length || extra-- > 0); k++) {
        const nc = cur.outS && fn.next(cur.c, cur.outS);
        if (!nc) break;
        const letter = st.trips[Math.min(idx, st.trips.length - 1)], inS = OPP[cur.outS], j = nc.junction;
        let outS;
        if (j && inS === j.stem) {
          const b = st.best[j.i] && st.best[j.i][letter];
          outS = j.exits[b !== undefined ? b : j.set];
        } else outS = fn.out(nc, inS);
        cur = { c: nc, inS, outS, idx };
        cells.push(cur);
        if (nc === st.stops[letter]) idx++;
      }
    }
    st._cpuPlanT = G.tickN; st._cpuPlan = cells;
    return cells;
  }

  /* ---------- builder ---------- */
  function builder(S, st, p, o, dt, info, out) {
    const route = plan(st), ghosts = [];
    for (const r of route) if (r.c.ghost && !ghosts.includes(r.c)) ghosts.push(r.c);
    const onRoute = new Set(ghosts);
    const w = st.boxes[2], wx = w.x + w.w / 2, wy = w.y + w.h / 2;
    const g = ghosts[0], dG = g ? near(p, g.x * T + 15, g.y * T + 15) : Infinity, dW = near(p, wx, wy);
    let goWagon = st.carry === 0 || (!g && st.carry < TRAIN.carry) || (st.carry < Math.min(TRAIN.carry, ghosts.length) && dW < dG * 0.6);
    // keep out of dotted cells that aren't on the way (walking over one lays a piece there)
    const block = (x, y) => { const c = trainCell(x, y); return !!c && c.ghost && !onRoute.has(c); };
    if (goWagon) {
      walkTo(S, p, out, clamp(Math.floor(wx / T), 0, COLS - 1), clamp(Math.floor(wy / T), 0, ROWS - 1), wx, wy, block, 2);
      return;
    }
    if (g) { walkTo(S, p, out, g.x, g.y, g.x * T + 15, g.y * T + 15, block, 2); return; }
  }

  /* ---------- switcher ---------- */
  function switcher(S, st, p, o, dt, info, out) {
    const sq = st.sq, tr = st.tr;
    // 1) a squirrel: walk up to it (it runs off when we're within reach)
    if (sq.mode === 'run' || sq.mode === 'sit') {
      if (react(S, 'sq', info, dt)) walkTo(S, p, out, clamp(Math.floor(sq.tx / T), 0, COLS - 1), clamp(Math.floor(sq.ty / T), 0, ROWS - 1), sq.tx, sq.ty, null, 2);
      return;
    }
    S._react_sq = 0;
    // 2) the first red lamp on the preview: go and flip its lever
    let red = null, rk = Infinity;
    for (const [j, lamp] of st.pv.lamps) if (lamp === 'red' && st.pv.lampK.get(j) < rk) { red = j; rk = st.pv.lampK.get(j); }
    if (red) {
      if (!react(S, 'red', info, dt)) return;
      const lx = red.lx * T + 15, ly = red.ly * T + 15;
      walkTo(S, p, out, red.lx, red.ly, lx, ly, null, 2);
      const onIt = tr.hist.some(h => h.c.junction === red);
      if (near(p, lx, ly) < TRAIN.leverReach - 8 && !onIt && st.cool[p.id] <= 0) out.act = 'tap';
      return;
    }
    S._react_red = 0;
    // 3) wait by the lever of the next junction the train will reach
    const route = plan(st);
    let nextJ = null;
    for (const r of route) { const j = r.c.junction; if (j && r.inS === j.stem && !tr.hist.some(h => h.c.junction === j)) { nextJ = j; break; } }
    if (nextJ) walkTo(S, p, out, nextJ.lx, nextJ.ly, nextJ.lx * T + 15, nextJ.ly * T + 15, null, 4);
  }
  // a short human pause before going for something new (longer at lower skill)
  function react(S, key, info, dt) {
    const k = '_react_' + key;
    S[k] = (S[k] || 0) + dt;
    return S[k] >= 0.1 + (1 - info.skill) * 0.4;
  }

  /* ---------- a word for the person now and then ---------- */
  function talk(S, st, p, o, dt, info) {
    if (!cpuSolo() || info.partnerIdle > CPU.idleStop) return; // (a person who walked away gets no chatter)
    S.sayT = Math.max(0, (S.sayT || 0) - dt);
    if (S.sayT > 0) return;
    const tr = st.tr, mine = p.id === st.builder ? 'build' : 'switch';
    let line = null;
    if (mine === 'switch' && tr.waiting && tr.kind === 'gap' && tr.waitGap > 3 && info.partnerIdle > 2) line = st.carry === 0 ? 'Grab track!' : 'Walk on the dots!';
    if (mine === 'build') {
      const sq = st.sq;
      if (sq.mode === 'sit' && sq.t > 2 && info.partnerIdle > 1.5) line = 'Shoo the squirrel!';
      else if (tr.waiting && tr.kind === 'red' && tr.redT > 0.8) line = 'Flip the lever!';
    }
    if (line) { cpuSay(p, line, 2); S.sayT = 6; }
  }

  /* ---------- a person who walked away ----------
     A good partner often has nothing to press for half a minute (all track laid, levers already right), so the core's
     plain 30 s idle stop would freeze the computer mid-room. Instead it stops (until the person presses again) only when
     the person has been idle that long AND their own job is waiting: dots on the route for a builder, a red lamp or a
     squirrel for a switcher. */
  const AWAY = [null, null]; // per computer player: the level state it stopped in for a person who walked away
  function partnerNeeded(st, o) {
    const tr = st.tr;
    if (o.id === st.builder) return !!st.pv.firstGhost || (tr.waiting && tr.kind === 'gap');
    if (st.sq.mode === 'run' || st.sq.mode === 'sit' || (tr.waiting && tr.kind === 'red')) return true;
    for (const lamp of st.pv.lamps.values()) if (lamp === 'red') return true;
    return false;
  }

  cpuBrain('train', {
    noIdleStop: true, // (its own rule above)
    reset(S) { S.d = null; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.cells || !st.tr || !st.pv || st.phase === 'done') return out;
      // (kept in AWAY, not S, so a new room does not wake it: the level's mode state lives across rooms)
      if (info.partnerIdle < 0.5) AWAY[p.id] = null;
      else if (info.partnerIdle > CPU.idleStop && partnerNeeded(st, o)) AWAY[p.id] = st;
      if (AWAY[p.id] === st) return out;
      if (p.id === st.builder) builder(S, st, p, o, dt, info, out); else switcher(S, st, p, o, dt, info, out);
      talk(S, st, p, o, dt, info);
      return out;
    },
  });
})();
