/* Pip & Bo - Computer partner: paint the floor. */
'use strict';

(() => {
  /* Paint the Floor is head-to-head: the computer plays against you, painting as much floor as it can.
     - Where to go: every so often it times the way to every spot it can stand on (over cpuNav's map) and scores three
       kinds of plan by paint per second: a run along the floor or plank from there (walking paints; your shiny Super
       Paint doesn't count, walking can't cover it), a jump-splat right there, or a drop through a plank with a dive (a
       big splash below). It walks to the best one (one of the best few on easy) and does it.
     - Splats on the way: in the air it dives when the splash below would cover enough cells not its colour, at the top
       of the jump so the splash is bigger (never in the middle of a jump up to a plank). Running over your colour it
       jumps and dives, and it hops on your shiny paint to splat it. Taking a cell from you counts twice (one more for
       it, one less for you).
     - Super Paint (when it is behind): normal and hard know their splashes are huge then and splat much more.
     - The bell: normal and hard only count what lands before it, and a few seconds before it they save one big splat
       that lands just before the bell (too late for Super Paint to answer).
     - The golden bucket: it races for it when it can get there about as fast as you. A head-splat when it happens to
       be right above you. In the way of each other: it hops over you (two computers take turns).
     - Floor helpers: cpuNav's map knows the bounce pads (a pad throws you up and you steer the fall) and the portals
       (stepping in takes you to the twin), so its times to every spot, and so its plans, use them (mst.navOpts). Runs
       stop short of a pad or portal, and it never plans a splat standing on one. A paint roller: it goes for it when it
       can get there about as fast as you (like the bucket); while it pushes one, runs over your shiny paint count too.
     Skill: easy decides slowly, picks a so-so plan, runs off anywhere now and then, stops now and then, rarely splats on
     purpose, often just lands from a jump, sometimes dives too early and hardly uses its Super Paint (so a young kid
     who splats can win); hard decides quickly, picks the best plan, splats a lot, plays the bell
     and goes for your head and the bucket whenever it can. */
  const SK = s => ({
    think: 1.2 - 0.9 * s,                // seconds between choosing where to go (easy 0.89, normal 0.57, hard 0.3)
    pick: s > 0.9 ? 1 : s > 0.6 ? 2 : 6, // chooses among this many of the best plans
    stray: s < 0.5 ? 0.3 : 0,            // easy: chance it goes off to any spot worth painting at all (like a kid)
    wander: s < 0.5 ? 0.2 : 0,           // easy: chance it just runs off somewhere (anywhere) when it chooses again
    dawdle: 1.6 * Math.pow(1 - s, 1.5),  // a short stop this often per second (easy 0.84, normal 0.26, none on hard)
    jumpSplat: 0.1 + 0.9 * s * s,        // chance it thinks of splats when choosing where to go, or jump-splats a good
                                         // patch on the way (easy 21 %, normal 54 %, hard 100 %)
    early: 0.5 * (1 - s),                // chance a dive goes off too early (on the way up)
    airDive: s < 0.5 ? 0.4 : s < 0.9 ? 0.85 : 1, // chance it thinks of diving at all in a jump (easy often just lands;
                                         // with Super Paint on, easy only a third as often: the catch-up is for you)
    head: s < 0.5 ? 0.1 : s * s,         // chance it dives onto your head when it is right above you
    bucket: 0.3 + 0.7 * s,               // chance it goes for the golden bucket
    roller: 0.35 + 0.65 * s,             // chance it goes for a paint roller
    steal: s * s,                        // how much more it values painting over your colour than fresh floor
    bell: s >= 0.6,                      // plans for the bell (what is painted after it doesn't count)
    final: s > 0.9 ? 1 : s > 0.6 ? 0.7 : 0, // chance it saves a last splat for the bell in a round
    super: s >= 0.6,                     // makes the most of its Super Paint (splats much more while it has it)
    bucketT: s > 0.9 ? 1.5 : 0.8,        // goes for the bucket when it is at most this much farther than you
  });
  const PK = () => G.mst.K || MODES.paint.K;
  const surf = ch => ch === '#' || ch === '=';
  // the nav options for this floor (pads and portals); always the same object, so cpuNav's map stays cached
  const NO = () => (G.mst && G.mst.navOpts) || {};
  // a pad or a portal stands in this cell (walking into it throws you or warps you)
  const busy = (tx, ty) => { const o = NO(), c = ty * COLS + tx; return !!((o.pads && o.pads.has(c)) || (o.portals && o.portals.has(c))); };

  // cells of row ty with [x0, x0 + 10) overlapping [xa, xb) that a splash (or walking) would turn its colour
  function gainSpan(mst, k, ty, xa, xb, splat, steal = 1) {
    if (ty < 0 || ty >= ROWS) return 0;
    const c0 = Math.max(0, Math.floor(xa / 10)), c1 = Math.min(COLS * 3 - 1, Math.floor((xb - 0.001) / 10));
    let n = 0;
    for (let c = c0; c <= c1; c++) {
      const ci = mst.idx[ty * COLS * 3 + c];
      if (ci < 0) continue;
      const own = mst.own[ci];
      if (own === k) { if (splat === true && mst.cb[k] && !mst.thick[ci]) n += 0.3; continue; } // Super Paint makes its own shiny
      if (own >= 0 && mst.thick[ci] && !splat) continue;     // shiny paint: only a splash (or a roller: splat 'roll') covers it
      // taking a cell from you counts up to twice (one more for it, one less for you): hard sees that best
      n += own < 0 ? 1 : (1 + steal) * (mst.thick[ci] ? 1.2 : 1);
    }
    return n;
  }
  function splashGain(mst, k, cx, ty, half, rows, steal) {
    let n = 0;
    for (let d = -rows; d <= rows; d++) n += gainSpan(mst, k, ty + d, cx - half, cx + half, true, steal);
    return n;
  }
  // the row of the first floor or plank top at or below feet height y under the player's feet
  function groundBelow(p, feetY) {
    const xa = Math.floor((p.x + 3) / T), xb = Math.floor((p.x + p.w - 3) / T);
    for (let ty = Math.max(0, Math.ceil(feetY / T - 0.001)); ty < ROWS; ty++) {
      if (surf(tile(xa, ty)) || surf(tile(xb, ty))) return ty;
    }
    return -1;
  }
  // splash half-width for a fall of h px
  // (cb: it counts on its Super Paint; easy doesn't think of it)
  function splashHalf(mst, k, h, cb) {
    const K = PK(), big = h >= K.hBig ? 2 : h >= K.hMed ? 1 : 0;
    return { big, half: PW / 2 + [K.rSmall, K.rMed, K.rBig][big] + (cb ? K.cbSplash : 0), rows: K.rowTol + (cb ? K.cbRows : 0) };
  }

  // seconds from p's map cell to every cell (Dijkstra over cpuNav's map)
  function times(g, from) {
    const n = g.cells.length, d = new Float64Array(n).fill(Infinity), done = new Uint8Array(n);
    d[from] = 0;
    for (;;) {
      let u = -1, best = Infinity;
      for (let i = 0; i < n; i++) if (!done[i] && d[i] < best) { best = d[i]; u = i; }
      if (u < 0) break;
      done[u] = 1;
      for (const e of g.cells[u].edges) { const nd = d[u] + e.t; if (nd < d[e.to]) d[e.to] = nd; }
    }
    return d;
  }
  /* the best plan: for every spot it can get to (timed over cpuNav's map), a run both ways along the floor ahead
     (walking paints), a jump-splat right there, or (on a plank) a drop through it with a dive (a big splash below).
     Each is scored by how much it paints per second; it picks one of the best few (the best on hard). */
  function choosePlan(st, p, o, mst, sk, tl, ready) {
    const g = navGraph(p, NO()), here = navFrom(g, p);
    if (!here) return null;
    const k = p.id, roll = mst.rollHeld && mst.rollHeld[k] > 0, K = PK();
    const d = times(g, here.i), plans = [], walkT = T / PHYS.maxRun / (roll ? 1 + K.rollSpeed : 1), cool = mst.cool[k], cbK = sk.super && mst.cb[k];
    const splats = ready || Math.random() < sk.jumpSplat, jumpH = (PHYS.jumpV * PHYS.jumpV) / (2 * PHYS.g);
    // near the bell (normal and hard): only what can be painted before it counts, and in the last seconds the most paint
    // wins, not the quickest
    const bell = sk.bell ? tl : Infinity, last = bell < 2.5;
    // the last splat: the most paint for one splat that lands before the bell (taking paint from you counts twice)
    const score = (gain, t) => (t > bell - (ready ? 0.3 : 0) ? -1 : ready ? gain - t : last ? gain : gain / t);
    const stealS = ready ? 1 : sk.steal;
    // the other player's feet block a run along their row (walking into them just bumps)
    const og = o.alive ? groundBelow(o, cpuFeet(o)) : -9, oty = og >= 0 && og * T - cpuFeet(o) < 40 ? og - 1 : -9, otx0 = Math.floor((o.x - 4) / T), otx1 = Math.floor((o.x + o.w + 4) / T);
    for (const c of g.cells) {
      if (d[c.i] === Infinity || busy(c.tx, c.ty)) continue; // (nobody stays on a pad or in a portal)
      const row = c.ty + 1, x0 = navCellX(c.tx), feet = navFeet(c.ty);
      for (const dir of [-1, 1]) {
        let gain = 0, best = null;
        for (let n = 0, tx = c.tx; n < 14; n++, tx += dir) {
          if (n > 0 && (!g.at.get(c.ty * COLS + tx) || busy(tx, c.ty))) break;
          if (c.ty === oty && tx >= otx0 && tx <= otx1) break;
          gain += gainSpan(mst, k, row, tx * T, tx * T + T, roll ? 'roll' : false, sk.steal);
          const rate = score(gain, d[c.i] + (n + 1) * walkT + 0.35);
          if (gain > 0 && rate > 0 && (!best || rate > best.rate)) best = { rate, kind: 'run', c, dir, endTx: tx };
        }
        if (best && !ready) plans.push(best);
      }
      if (!splats || busy(c.tx, c.ty) || (c.ty === oty && c.tx >= otx0 && c.tx <= otx1)) continue;
      const wait = Math.max(d[c.i], cool);
      // a jump-splat here: straight up, dive at the top (lands back here, or on a plank above)
      const lj = groundBelow({ x: x0 - PW / 2, w: PW }, feet - jumpH);
      if (lj >= 0 && !busy(c.tx, lj - 1)) {
        const sp = splashHalf(mst, k, lj * T - (feet - jumpH), cbK), gain = splashGain(mst, k, x0, lj, sp.half, sp.rows, stealS);
        plans.push({ rate: score(gain, wait + (ready ? 0.55 : 0.75)), kind: 'jump', c, t: wait + 0.55, exec: 0.55 });
      }
      // on a plank: drop through it and dive (a big splash on the floor or plank below)
      if (tile(c.tx, row) === '=') {
        const ld = groundBelow({ x: x0 - PW / 2, w: PW }, feet + 1);
        if (ld >= 0 && !busy(c.tx, ld - 1)) {
          const h = ld * T - feet, sp = splashHalf(mst, k, h, cbK), gain = splashGain(mst, k, x0, ld, sp.half, sp.rows, stealS), ex = 0.25 + h / K.diveV;
          plans.push({ rate: score(gain, wait + ex + (ready ? 0 : 0.1)), kind: 'drop', c, t: wait + ex, exec: ex });
        }
      }
    }
    plans.sort((a, b) => b.rate - a.rate);
    if (!plans.length || plans[0].rate <= 0) return null;
    const pool = !ready && Math.random() < sk.stray ? plans.filter(q => q.rate > 0).length : Math.min(sk.pick, plans.length);
    const r = ready ? plans[0] : plans[Math.floor(Math.random() * pool)];
    const pl = { kind: r.kind, x0: navCellX(r.c.tx), feet: navFeet(r.c.ty), ty: r.c.ty, rate: r.rate, phase: 'go', t: r.t, exec: r.exec };
    if (r.kind === 'run') { pl.dir = r.dir; pl.x1 = r.dir > 0 ? (r.endTx + 1) * T - PW / 2 - 2 : r.endTx * T + PW / 2 + 2; }
    return pl;
  }

  // cpuNav, remembering where it was going (so a jump keeps steering there in the air)
  function go(st, p, x, feet, tol, info) {
    st.airNav = { x, feet, tol };
    // standing on the other player's head: step off toward the goal
    if (p.onPartner && !p.tileGround) return { left: x < cpuCx(p), right: x >= cpuCx(p) };
    const mv = cpuNav(st, p, x, feet, Object.assign({ tol, noHop: true }, NO())) || {};
    const dir = mv.right ? 1 : mv.left ? -1 : 0;
    if (dir && navPartnerAhead(p, dir)) {
      mv.jump = hopOver(st, p, dir, info);
      if (!mv.jump && info.partnerCpu && p.id === 1) mv.left = mv.right = false;
    }
    return mv;
  }
  // the other player stands right in the way: hop over them. Walking into each other head-on, two computers would hop
  // at the same moment forever, so then Bo waits a moment instead; against a person it hops at a random moment.
  function hopOver(st, p, dir, info) {
    const o = other(p), headOn = o.vx * dir < -30;
    if (headOn && info.partnerCpu && p.id === 1) return false;
    if (headOn && !cpuChance(4, DT)) return false;
    if (CPU.last[p.id].jump) return false;
    st.jumpHold = 0.35; // a full jump (held in the air)
    return true;
  }
  // in the middle of a jump up to a higher spot (a dive now would spoil it)?
  function goingUp(st, p) {
    const e = st.nav && st.nav.cur;
    if (!e || e.kind === 'walk' || e.kind === 'off' || e.kind === 'drop') return false;
    const g = navGraph(p, NO()), a = g.cells[e.from], b = g.cells[e.via != null ? e.via : e.to];
    return !!(a && b && b.ty < a.ty);
  }

  cpuBrain('paint', {
    noIdleStop: true, // the level has no idle pause: rounds end at the 45 s bell, so a match against nobody plays out
    reset(st) { st.round = -1; },
    think(st, p, o, dt, info) {
      const out = {}, M = G.match, mst = info.mst;
      if (!M || !mst || !mst.own) return out;
      const sk = SK(info.skill), K = PK(), k = p.id;
      if (st.round !== M.round || st.own !== mst.own || M.phase !== 'live') {
        st.run = null; st.thinkT = 0; st.dawT = 0; st.jumpHold = 0; st.bucketFor = null; st.bucketGo = false;
        st.fin = null; st.finRoll = undefined; st.forceDive = false;
        st.round = M.round; st.own = mst.own;
        if (M.phase !== 'live') return out;
      }
      if (!p.alive || p.stun > 0) return out;
      const cx = cpuCx(p), feet = cpuFeet(p), canSplat = mst.cool[k] <= 0 && mst.dive[k] === 0, cbOn = mst.cb[k], cbK = sk.super && cbOn;

      /* ---- in the air: dive when the splash below is worth it ---- */
      if (!p.grounded) {
        if (st.jumpHold > 0) { st.jumpHold -= dt; out.jump = true; }
        // a planned splat: dive at the top of the jump, or as soon as it falls through the plank
        if (st.forceDive && canSplat && p.vy > -60) { out.act = 'tap'; st.forceDive = false; return out; }
        if (canSplat && !st.fin && !goingUp(st, p)) {
          const ty = groundBelow(p, feet);
          // right above your head: a head-splat
          const ocx = cpuCx(o), above = o.alive && Math.abs(ocx - cx) < 14 && o.y > feet - 4 && o.y - feet < 160 && o.stun <= 0;
          if (above) { if (st.headFor !== o.y >> 4) { st.headFor = o.y >> 4; st.headGo = Math.random() < sk.head; } if (st.headGo) out.act = 'tap'; }
          if (!out.act && ty >= 0) {
            const peak = Math.min(mst.peak[k], p.y), h = ty * T - PH - peak, sp = splashHalf(mst, k, h, cbK);
            const gain = splashGain(mst, k, cx, ty, sp.half, sp.rows, sk.steal);
            const need = (cbK ? 4 : 7) + sp.big * 2;
            // wait for the top of the jump (a bigger splash), unless it decided to dive early (easy)
            if (st.earlyFor !== st.airN) { st.earlyFor = st.airN; st.early = Math.random() < sk.early; st.airGo = Math.random() < sk.airDive * (cbOn && !sk.super ? 0.3 : 1); }
            const top = p.vy > -60 || (st.early && p.vy > -260);
            if (gain >= need && top && st.airGo) out.act = 'tap';
          }
        }
        // keep steering along the run while in the air (unless diving), or the way it was walking to
        if (mst.dive[k] === 2) return out;
        if (st.run && st.run.phase === 'run' && !st.airNav) { out.left = st.run.dir < 0; out.right = st.run.dir > 0; }
        else if (st.airNav) {
          const mv = cpuNav(st, p, st.airNav.x, st.airNav.feet, Object.assign({ tol: st.airNav.tol }, NO())) || {};
          out.left = mv.left; out.right = mv.right; out.jump = out.jump || mv.jump;
        }
        return out;
      }
      st.airN = (st.airN || 0) + 1; st.jumpHold = 0; st.airNav = null;
      if (st.forceDive && !CPU.last[k].jump && !CPU.last[k].down) st.forceDive = false; // landed without diving

      // easy and normal stop for a moment now and then
      if (st.fin) st.dawT = 0;
      if (st.dawT > 0) { st.dawT -= dt; return out; }
      if (cpuChance(sk.dawdle, dt)) { st.dawT = 0.2 + Math.random() * 0.4; return out; }

      /* ---- the golden bucket ---- */
      const b = mst.bucket;
      if (b) {
        if (st.bucketFor !== b) {
          st.bucketFor = b;
          const mine = cpuNavReach(p, b.x, b.y, NO()), theirs = Math.hypot(cpuCx(o) - b.x, cpuFeet(o) - b.y) / PHYS.maxRun * 1.2;
          st.bucketGo = Math.random() < sk.bucket && mine < theirs + sk.bucketT && mine < 6;
        }
        if (st.bucketGo) {
          const mv = go(st, p, b.x, b.y, 5, info);
          return { left: mv.left, right: mv.right, jump: mv.jump, down: mv.down };
        }
      }

      /* ---- a paint roller ---- */
      const rl = mst.roll;
      if (rl && !st.fin) {
        if (st.rollFor !== rl) {
          st.rollFor = rl;
          const mine = cpuNavReach(p, rl.x, rl.y, NO()), theirs = Math.hypot(cpuCx(o) - rl.x, cpuFeet(o) - rl.y) / PHYS.maxRun * 1.2;
          st.rollGo = Math.random() < sk.roller && mine < theirs + sk.bucketT && mine < 5 && !(mst.rollHeld[k] > 0);
        }
        if (st.rollGo) {
          const mv = go(st, p, rl.x, rl.y, 5, info);
          return { left: mv.left, right: mv.right, jump: mv.jump, down: mv.down };
        }
      }

      /* ---- the last splat (hard; normal in some rounds) ----
         The bell decides, and a splat that lands in the last half second can't be answered (Super Paint takes half a
         second to switch on). A few seconds before the bell it picks the spot where one splat paints most that it can
         still reach, goes there with its splat charged and jumps (or drops) so the splash lands just before the bell. */
      if (st.finRoll === undefined) st.finRoll = Math.random() < sk.final;
      if (st.finRoll && M.timeLeft < 5 && !st.fin) {
        st.finT = (st.finT || 0) - dt;
        if (st.finT <= 0) {
          st.finT = 0.2;
          const F = choosePlan(st, p, o, mst, sk, M.timeLeft, true);
          if (F && M.timeLeft <= F.t + 0.6) { st.fin = F; st.run = F; }
        }
      }
      if (st.fin) {
        const F = st.fin;
        if (st.run !== F) { st.fin = null; return out; }      // done (or knocked off it)
        if (F.phase === 'go') {
          const mv = go(st, p, F.x0, F.feet, 5, info);
          if ((Math.abs(feet - F.feet) < 2 && Math.abs(cx - F.x0) < 10) || (st.nav && st.nav.status === 'arrived')) F.phase = 'do';
          else return { left: mv.left, right: mv.right, jump: mv.jump, down: mv.down };
        }
        if (M.timeLeft > F.exec + 0.3) { cpuSeek(out, p, F.x0, 4); return out; } // wait for the moment
      }

      /* ---- where to paint ---- */
      st.thinkT -= dt;
      const r0 = st.run;
      // stuck (bumping into the other player, say): no progress toward the goal for a while, so choose again
      const goal = r0 ? (r0.phase === 'run' ? r0.x1 : r0.x0) : cx;
      if (!r0 || st.progFor !== r0 || Math.abs(cx - goal) < st.progD - 4) { st.progFor = r0; st.progD = Math.abs(cx - goal); st.progT = 0; }
      st.progT += dt;
      const stuck = r0 && st.progT > (r0.phase === 'run' ? 0.6 : 1.4);
      const done = r0 && r0.phase === 'run' && (Math.abs(cx - r0.x1) < 6 || (cx - r0.x1) * r0.dir > 0);
      if (!st.fin && (!r0 || stuck || done || (st.thinkT <= 0 && r0.kind !== 'wander'))) {
        st.thinkT = sk.think * (0.7 + Math.random() * 0.6) * (sk.bell && M.timeLeft < 4 ? 0.5 : 1);
        let nr;
        // easy: now and then it just runs off somewhere, like a kid (it still paints on the way)
        if (Math.random() < sk.wander) {
          const cs = navGraph(p, NO()).cells, c = cs[Math.floor(Math.random() * cs.length)];
          if (c) nr = { kind: 'wander', x0: navCellX(c.tx), feet: navFeet(c.ty), ty: c.ty, rate: 0, phase: 'go' };
        }
        if (!nr) nr = choosePlan(st, p, o, mst, sk, M.timeLeft);
        // keep the run under way unless what is left of it is poor next to the new one
        let left = 0;
        if (r0 && r0.kind === 'run' && r0.phase === 'run' && !stuck && !done) {
          left = gainSpan(mst, k, r0.ty + 1, Math.min(cx, r0.x1), Math.max(cx, r0.x1), false, sk.steal) / (Math.abs(r0.x1 - cx) / PHYS.maxRun + 0.35);
        }
        if (nr && (!left || nr.rate > left * 1.3)) st.run = nr;
        else if (!nr) st.run = null;
      }
      const run = st.run;
      if (!run) return out;
      if (run.phase === 'go') {
        const mv = go(st, p, run.x0, run.feet, run.kind === 'run' ? 8 : 5, info);
        out.left = mv.left; out.right = mv.right; out.jump = mv.jump; out.down = mv.down;
        const there = Math.abs(feet - run.feet) < 2 && Math.abs(cx - run.x0) < 10;
        if (there || (st.nav && st.nav.status === 'arrived')) {
          if (run.kind === 'wander') { st.run = null; return out; }
          run.phase = run.kind === 'run' ? 'run' : 'do';
        }
      }
      if (run.phase === 'do') {
        // a splat plan: wait for the splat to recharge, then jump (or drop through the plank) and dive
        if (Math.abs(feet - run.feet) > 2) { st.run = null; return out; }
        const mv = {}; cpuSeek(mv, p, run.x0, 4); out.left = mv.left; out.right = mv.right;
        if (canSplat && Math.abs(p.vx) < 60 && !CPU.last[k].jump && !CPU.last[k].down) {
          if (run.kind === 'jump') { out.jump = true; st.jumpHold = 0.4; } else out.down = true;
          out.left = out.right = false; st.forceDive = true; st.run = null;
        }
        return out;
      }
      if (run.phase === 'run') {
        if (Math.abs(feet - run.feet) > 2) { st.run = null; return out; } // knocked off the row
        out.left = run.dir < 0; out.right = run.dir > 0;
        // the other player right in the way: hop over
        if (navPartnerAhead(p, run.dir)) { out.jump = hopOver(st, p, run.dir, info); if (!out.jump && info.partnerCpu && k === 1) out.left = out.right = false; }
      }
      /* ---- splats from the ground ---- */
      if (canSplat && !out.jump && !st.fin) {
        const ty = Math.floor((feet + 1) / T), dir = out.right ? 1 : out.left ? -1 : p.face;
        // your shiny paint right here: walking can't cover it, so splat it (a hop)
        const shiny = splashGain(mst, k, cx, ty, PW / 2 + K.rSmall, 0) - gainSpan(mst, k, ty, cx - PW / 2 - K.rSmall, cx + PW / 2 + K.rSmall, false);
        if (shiny >= 3) out.act = 'tap';
        else {
          // a patch worth a jump-splat: jump, then dive at the top (about 75 px on, from 109 px up)
          const lx = cx + dir * 75, apex = feet - (PHYS.jumpV * PHYS.jumpV) / (2 * PHYS.g);
          const lty = groundBelow({ x: lx - PW / 2, w: PW }, apex);
          if (lty >= 0) {
            const sp = splashHalf(mst, k, lty * T - PH - (apex - PH), cbK), gain = splashGain(mst, k, lx, lty, sp.half, sp.rows, sk.steal);
            const walk = gainSpan(mst, k, ty, Math.min(cx, lx) - 11, Math.max(cx, lx) + 11, false, sk.steal);
            if (st.jsFor !== Math.floor(G.time * 2)) { st.jsFor = Math.floor(G.time * 2); st.jsGo = Math.random() < sk.jumpSplat; }
            if (st.jsGo && gain >= (cbK ? 4 : 7) + sp.big * 2 && gain - walk >= (cbK ? 1 : 3) && !CPU.last[k].jump) { out.jump = true; st.jumpHold = 0.4; }
          }
        }
      }
      return out;
    },
  });
})();
