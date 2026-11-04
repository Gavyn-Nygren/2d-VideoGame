/* Pip & Bo - Computer partner: krakatoa ash run. */
'use strict';

/* 9-4 Krakatoa Ash Run. The room def says who leads (m.leader) and who fans (m.fanner); the jobs swap every room.
   Both read the next job the way the parrot shows it on screen (ashNextJob: a drift, a gust gap, a lever, the climb
   or the exit) and do their half of it:
   - Leader: walks to the job (cpuNav, keeping out of lava and the sea). At a drift it waits right up against it so
     the fanner has room behind; at a gust gap it waits on the edge (or behind a fanner who stands there) until the
     windsock streams (the fan reaches the gap), then jumps and holds on so the wind carries it over; at a lever it
     pulls; then it heads for the far side of the exit and calls "This way!" (the level's own call) if the fanner
     dawdles. With an ash hat of 2 or more it waits for the fanner to come and blow it off (it can't see much either).
   - Fanner: follows a little way behind the leader, facing them, fanning while they are in reach (the ash clears for
     them and an ash hat blows off). At a drift it stands within the fan's reach and blows it away; at a gust gap it
     stands behind the windsock, faces the gap and holds the fan until the leader is over; while the leader works the
     bridge lever on the far side it waits at the edge; then it crosses and follows to the exit.
   Nothing here is a free choice (the level hands out the jobs), so two computers never wait for each other. With a
   person it waits where it is useful and says so now and then ("Fan the drift!", "Fan me over!", "Pull the lever!").
   Moving round each other: it never hops onto the partner's head, waits for a partner standing in the way (or hops
   over when the ground beyond is safe), steps back for a partner who pushes its way, and moves on out of the
   leader's way. It never goes where the map has no way (a gap with no bridge yet): it waits instead. */
(() => {
  const near = (a, b, d) => Math.abs(a - b) <= d;
  // a short bubble for the person, at most one every few seconds (less and less often for the same words, and
  // for many bubbles in one room)
  function say(st, p, text, gap = 6) {
    const n = st.sayN && st.sayN.text === text ? st.sayN.n : 0, all = st.sayAll || 0;
    if (G.time - (st.saidT == null ? -99 : st.saidT) < gap * (1 + Math.floor(n / 3) + Math.floor(all / 6))) return;
    st.saidT = G.time; st.sayN = { text, n: n + 1 }; st.sayAll = all + 1; cpuSay(p, text, 2);
  }
  // lava and sea cells to keep out of (the map is per room)
  function navOpts(st, m) {
    if (!st.avoid || st.avoidRoom !== G.room) {
      const set = new Set();
      for (let i = 0; i < m.hazard.length; i++) if (m.hazard[i]) set.add(i);
      st.avoid = set; st.avoidRoom = G.room;
    }
    const set = st.avoid;
    return { avoid: (tx, ty) => set.has(ty * COLS + tx) || set.has((ty + 1) * COLS + tx), key: 'ash' + G.room };
  }
  // can p walk there? (cached for a moment per target cell, the map changes when drifts, gates and bridges do)
  function reach(st, p, m, x, feet) {
    const k = Math.floor(x / T) + ',' + Math.floor(feet / T);
    const c = st.reach;
    if (c && c.k === k && G.time - c.t < 0.4 && p.grounded === c.g) return c.ok;
    const ok = !p.grounded || cpuNavReach(p, x, feet, navOpts(st, m)) < Infinity;
    st.reach = { k, t: G.time, ok, g: p.grounded };
    return ok;
  }
  // is the ground clear for a hop over the partner: ground under every column from just past them to a jump's
  // length on, no lava or sea, no wall in the way
  function safeHop(m, p, o, dir) {
    const feetRow = Math.floor((cpuFeet(p) - 1) / T), x0 = cpuCx(o) + dir * 20;
    for (let k = 0; k <= 5; k++) {
      const tx = Math.floor((x0 + dir * k * T) / T);
      if (tx < 0 || tx >= COLS) return false;
      for (let ty = feetRow - 3; ty <= feetRow; ty++) if (ty >= 0 && solidFor(tile(tx, ty), p)) return false;
      if (feetRow + 1 >= ROWS || !solidFor(tile(tx, feetRow + 1), p) || m.hazard[feetRow * COLS + tx]) return false;
    }
    return true;
  }
  // safe ground to step onto at x (same height or a short drop, no lava or sea)
  function groundAt(m, p, x) {
    const tx = Math.floor(x / T), base = Math.floor((cpuFeet(p) - 1) / T);
    if (tx < 0 || tx >= COLS) return false;
    for (let ty = base; ty <= base + 2 && ty < ROWS - 1; ty++) {
      if (solidFor(tile(tx, ty), p)) return ty === base ? false : true;
      if (m.hazard[ty * COLS + tx]) return false;
      if (solidFor(tile(tx, ty + 1), p)) return !m.hazard[(ty + 1) * COLS + tx];
    }
    return false;
  }
  // walk to (x, feet); a target with no way there means: stay put
  function go(st, p, m, x, feet, tol = 5) {
    const o = other(p), dir = Math.sign(x - cpuCx(p));
    // hopping over the partner (see below): hold on until landed
    if (st.hopDir) {
      if (!p.grounded) return { left: st.hopDir < 0, right: st.hopDir > 0, jump: p.vy < 0 };
      if (cpuFor(st, 'hopLand', true, DT) > 0.05) st.hopDir = 0;
    }
    // the partner right next to me pushes my way (backing up for a run-up, say): step back out of their way
    const side = Math.sign(cpuCx(o) - cpuCx(p)) || 1, touch = (side > 0 ? o.x - (p.x + p.w) : p.x - (o.x + o.w)) < 6;
    const pushing = o.alive && o.grounded && p.grounded && touch && near(cpuFeet(o), cpuFeet(p), 8) && (side > 0 ? o.input.left : o.input.right);
    if (cpuFor(st, 'yield', pushing, DT) > 0.25 && groundAt(m, p, cpuCx(p) - side * (p.w / 2 + 16))) st.yieldT = 0.5;
    if (st.yieldT > 0 && !groundAt(m, p, cpuCx(p) - side * (p.w / 2 + 4))) st.yieldT = 0;
    if (st.yieldT > 0) { st.yieldT -= DT; return { left: side > 0, right: side < 0 }; }
    // the partner stands still right in the way: wait a moment for them, then hop over if the ground beyond is safe
    const gapTo = dir > 0 ? o.x - (p.x + p.w) : p.x - (o.x + o.w), oStill = Math.abs(o.x - cpuLag(st, 'ox', o.x, 0.3)) < 4;
    const blocked = dir && p.grounded && o.alive && o.grounded && oStill && near(cpuFeet(o), cpuFeet(p), 8) && gapTo > -2 && gapTo < 10 && Math.abs(x - cpuCx(p)) > 24;
    if (cpuFor(st, 'blocked', blocked, DT) > 0) {
      if (st._for_blocked > 1.5 && safeHop(m, p, o, dir) && !CPU.last[p.id].jump) { st.hopDir = dir; st._for_hopLand = 0; return { left: dir < 0, right: dir > 0, jump: true }; }
      // no safe hop: lean on them now and then ("excuse me"), so they see I want to get by
      if (st._for_blocked > 1.5 && st._for_blocked % 1.2 < 0.4) return { left: dir < 0, right: dir > 0 };
      return {};
    }
    if (!reach(st, p, m, x, feet)) { st.noWay = true; return {}; }
    st.noWay = false;
    const no = navOpts(st, m);
    no.tol = tol; no.noHop = true;   // never hop onto the partner's head (a ride over a pit ends badly)
    // a point over a gap or a wall: aim for the standing spot nearest to it instead (never walk off an edge for it)
    // (navGoal / navGraph / NAV.cache are cpu-nav internals: without them, skip the snapping and the landing check)
    const gc = typeof navGoal === 'function' && typeof navGraph === 'function' ? navGoal(navGraph(p, no), x, feet) : null;
    if (gc) x = clamp(x, gc.tx * T + 11, gc.tx * T + T - 11);
    const out = cpuNav(st, p, x, feet, no) || {};
    // no way on the map after all: stand still (cpuNav would walk straight at it, jumping at gaps)
    if (st.nav && st.nav.status === 'noPath' && p.grounded) return {};
    const cur = st.nav && st.nav.cur, gph = typeof NAV === 'object' && NAV.cache ? NAV.cache[p.id] : null;
    // lining up for a jump steps back to the take-off point (a run-up backs up a tile): with the partner standing
    // right behind me there is no room, so take off from here (I'm already nearer the edge; a standing jump still
    // clears these gaps) instead of pushing into them for ever
    if (cur && cur.kind !== 'walk' && cur.kind !== 'off' && cur.kind !== 'drop' && p.grounded && gph && gph.cells[cur.from] && gph.cells[cur.to]) {
      const mdir = Math.sign(gph.cells[cur.to].tx - gph.cells[cur.from].tx), back = out.left ? -1 : out.right ? 1 : 0;
      const behind = back && back === -mdir && o.alive && near(cpuFeet(o), cpuFeet(p), 8) && (back > 0 ? o.x - (p.x + p.w) : p.x - (o.x + o.w)) < 4 && Math.abs(cpuCx(o) - cpuCx(p)) < p.w + 6;
      if (cpuFor(st, 'backBlk', !!behind, DT) > 0.3) {
        if (cur.kind === 'run') { st.nav.phase = 'go'; return { left: mdir < 0, right: mdir > 0 }; }
        if (mdir && !CPU.last[p.id].jump) return { left: mdir < 0, right: mdir > 0, jump: true };
        return {};
      }
    } else cpuFor(st, 'backBlk', false, DT);
    // a jump that would land where the partner stands (on their head): wait for them to move
    if (out.jump && !CPU.last[p.id].jump && p.grounded && cur && cur.kind !== 'walk' && gph && gph.cells[cur.to] && o.alive) {
      const c = gph.cells[cur.to];
      // (only when we would overlap: the fanner picks spots at least 28 px from the leader, so a looser test here waits for ever)
      if (Math.abs(cpuCx(o) - (c.tx * T + T / 2)) < (p.w + o.w) / 2 + 2 && Math.abs(cpuFeet(o) - (c.ty + 1) * T) < 8) return {};
    }
    return out;
  }
  const arrived = st => st.nav && st.nav.status === 'arrived';
  const groundFeet = (st, q) => { if (q.grounded) st['feet' + q.id] = cpuFeet(q); return st['feet' + q.id] != null ? st['feet' + q.id] : cpuFeet(q); };
  // face dir without walking off: one short press now and then
  function face(out, p, dir) {
    if (p.face === dir || !p.grounded) return;
    out.left = dir < 0; out.right = dir > 0;
  }
  // the gust gap a lever lowers the bridge over (null for a gate lever)
  const gapOf = (m, lv) => m.gaps.find(g => g.lever === lv.id) || null;
  // the job as the parrot shows it, except that a bridge lever with the leader back on the near side of its gap
  // (back at camp after crossing) means crossing that gap again first
  function curJob(m) {
    const j = ashNextJob(m);
    if (!j || j.kind !== 'lever' || j.ref.on) return j;
    const gp = gapOf(m, j.ref), ld = G.players[m.leader];
    return gp && ld.alive && cpuCx(ld) < gp.x0 ? { kind: 'gap', ref: gp, x: (gp.x0 + gp.x1) / 2, y: gp.r * T - 60 } : j;
  }

  /* ---------- the leader ---------- */
  function leader(st, p, f, m, dt, info) {
    const job = curJob(m);
    if (!job || !p.alive) return {};
    const fx = cpuCx(f), cx = cpuCx(p);
    // over a gust gap in the air: hold on toward the far side (the wind does the rest)
    const inAir = !p.grounded && m.gaps.some(g => cx > g.x0 - 40 && cx < g.x1 + 20 && !m.levers.some(l => l.id === g.lever && l.on));
    if (inAir || st.gusting) {
      if (p.grounded) st.gusting = false;
      else return { right: true, jump: p.vy < 0 };
    }
    // a thick ash hat: wait for the fanner to come and blow it off (not forever)
    if (m.hat >= 2 && p.grounded && Math.abs(fx - cx) > 200) {
      const t = cpuFor(st, 'hat', true, dt);
      if (t < 4) { if (!info.partnerCpu && t > 1) say(st, p, 'Fan my ash hat!'); return {}; }
    } else cpuFor(st, 'hat', false, dt);
    if (job.kind === 'drift') {
      const d = job.ref, side = cx < d.x ? -1 : 1;
      // right up at the drift, so the fanner has room to stand behind
      const x = side < 0 ? d.c0 * T - 13 : (d.c1 + 1) * T + 13, feet = (d.r1 + 1) * T;
      const out = go(st, p, m, x, feet);
      if (arrived(st) && !info.partnerCpu && cpuFor(st, 'drift', !m.fan.on, dt) > 3) say(st, p, 'Fan the drift!');
      return out;
    }
    if (job.kind === 'gap') {
      const gp = job.ref, feet = gp.r * T;
      // already over (landed right on the far rim, so the level hasn't counted the crossing yet): step on onto the
      // far side; the job there is the bridge lever
      if (p.grounded && cx > (gp.x0 + gp.x1) / 2 && near(cpuFeet(p), feet, 70)) return go(st, p, m, gp.x1 + 40, cpuFeet(p), 6);
      // the edge, or (when the fanner stands right at the edge) just behind the fanner: jump over them into the wind
      let x = gp.x0 - 14;
      if (f.alive && f.grounded && near(cpuFeet(f), feet, 4) && fx > gp.x0 - 62 && fx < gp.x0 + 4 && cx < fx) x = fx - 32;
      // up on the fanner's head right by the edge (a jump over them landed there): that is a fine place to go from
      const onHead = p.grounded && f.alive && near(cpuFeet(p), f.y, 3) && p.x + p.w > f.x + 2 && p.x < f.x + f.w - 2 && cx > gp.x0 - 75;
      if (!onHead && (!near(cx, x, 10) || !near(cpuFeet(p), feet, 3) || !p.grounded)) { cpuFor(st, 'gust', false, dt); return go(st, p, m, x, feet, 3); }
      const out = {};
      if (!onHead) cpuSeek(out, p, x, 3);
      // the windsock streams: jump into the wind (after a moment, to be sure the fan keeps blowing; longer after a
      // fall here, so a fanner who blows in short puffs gets told to hold it rather than watching me fall again)
      const on = ashGustReach(m, gp, f), t = cpuFor(st, 'gust', on, dt);
      if (st.gustWas && !on) st.puffs = (st.puffs || 0) + 1;
      st.gustWas = on;
      // (a fanner who keeps puffing anyway: after 3 puffs, go at the very start of the next one, to make the most of it)
      const wait = (st.puffs || 0) >= 3 ? 0.1 : 0.2 + (1 - info.skill) * 0.35 + Math.min(0.6, (gp.falls || 0) * 0.3);
      if (t > wait && !CPU.last[p.id].jump) {
        st.gusting = true; st.puffs = 0;
        return { right: true, jump: true };
      }
      if (!info.partnerCpu && st.puffs >= 2 && t > 0) say(st, p, 'Hold the fan!');
      else if (!info.partnerCpu && cpuFor(st, 'edge', t === 0, dt) > 2.5) say(st, p, 'Fan me over!');
      return out;
    }
    if (job.kind === 'lever') {
      const lv = job.ref;
      if (ashLeverNear(m, p) === lv && p.grounded) {
        // a moment to get there properly, then pull
        if (cpuFor(st, 'pull', true, dt) > 0.12 + (1 - info.skill) * 0.25) return { act: 'tap' };
        return {};
      }
      cpuFor(st, 'pull', false, dt);
      return go(st, p, m, lv.x, lv.y, 4);
    }
    if (job.kind === 'climb') return go(st, p, m, m.climb.x, m.climb.y + 40, 6);
    // the exit: the far side of it, so there is room for the fanner
    const e = m.exit;
    if (!e) return {};
    const ecx = e.x + e.w / 2, dir = Math.sign(ecx - fx) || 1;
    const out = go(st, p, m, ecx + dir * 14, e.y + e.h, 5);
    // waiting in the exit for a person: the level's own "This way!" call (an arrow for them), now and then
    const wait = arrived(st) && !info.partnerCpu && Math.abs(fx - cx) > 60 ? cpuFor(st, 'exit', true, dt) : cpuFor(st, 'exit', false, dt);
    if (wait > 4 && !ashLeverNear(m, p)) { st._for_exit = -2; out.act = 'tap'; }
    return out;
  }

  // standing on the leader's head: keep still while they move; once they stand still, walk off the side that has
  // safe ground under it (the side toward the job first)
  function offHead(st, p, ld, m, job, dt) {
    if (cpuFor(st, 'ride', ld.grounded && Math.abs(ld.vx) < 10, dt) < 0.3) return {};
    const want = job ? Math.sign(job.x - cpuCx(p)) || 1 : 1, base = Math.floor((cpuFeet(ld) - 1) / T);
    const safe = dir => {
      const tx = Math.floor((cpuCx(ld) + dir * (ld.w / 2 + p.w / 2 + 4)) / T);
      for (let ty = base; ty <= base + 2 && ty < ROWS - 1; ty++) {
        if (solidFor(tile(tx, ty), p)) return false;
        if (solidFor(tile(tx, ty + 1), p)) return !m.hazard[ty * COLS + tx] && !m.hazard[(ty + 1) * COLS + tx];
      }
      return false;
    };
    const dir = safe(want) ? want : safe(-want) ? -want : 0;
    return dir ? { left: dir < 0, right: dir > 0 } : {};
  }

  /* ---------- the fanner ---------- */
  function fanner(st, p, ld, m, dt, info) {
    const job = curJob(m);
    if (!job || !p.alive) return {};
    const cx = cpuCx(p), lx = cpuCx(ld), lFeet = groundFeet(st, ld);
    let out, fan = false, dir = 0;
    // on the leader's head after all: ride while they move, then step down to a side with ground (toward the job)
    if (p.grounded && ld.alive && near(cpuFeet(p), ld.y, 3) && Math.abs(cx - lx) < (p.w + ld.w) / 2) return offHead(st, p, ld, m, job, dt);
    cpuFor(st, 'ride', false, dt);
    if (job.kind === 'drift') {
      // the side the trail comes from (left to right, but right to left up on a climbing room's higher path),
      // unless I already stand next to the drift on its floor (from below, the far side is no way at all)
      const feet = (job.ref.r1 + 1) * T, d = job.ref;
      const side = p.grounded && near(cpuFeet(p), feet, 8) && Math.abs(cx - d.x) < 250 ? (cx < d.x ? -1 : 1) : m.turnY != null && feet < m.turnY ? 1 : -1;
      const faceX = side < 0 ? d.c0 * T : (d.c1 + 1) * T;
      // a spot in the fan's reach with ground under it, clear of the leader
      let x = faceX + side * 60;
      for (let k = 45; k <= 150; k += 15) {
        const sx = faceX + side * k, tx = Math.floor(sx / T), ty = Math.floor((feet - 1) / T);
        if (ld.alive && near(lx, sx, 28) && near(lFeet, feet, 4)) continue;
        if (solidFor(tile(tx, ty), p) || !solidFor(tile(tx, ty + 1), p) || m.hazard[ty * COLS + tx]) continue;
        x = sx; break;
      }
      // close enough: the fan would reach the drift from here (the level's own cone test)
      const fo = { x: cx - side * 10, y: p.y + p.h * 0.45, dir: -side };
      const close = p.grounded && (faceX - cx) * -side > 0 && d.cells.some(e => ashInCone(fo, e.c * T + 15, e.r * T + 15, ASH.driftRange - 10, ASH.half + 0.1) > 0);
      out = close && p.grounded ? {} : go(st, p, m, x, feet, 6);
      if (close) { fan = true; dir = -side; }
    } else if (job.kind === 'gap') {
      const gp = job.ref, feet = gp.r * T;
      // behind the windsock, a little way back from the edge (the leader's take-off spot); but with the leader still
      // behind me, up near the edge, so they can jump over me into the wind
      const behind = ld.alive && near(lFeet, feet, 4) && lx < cx - 10 && lx > gp.x0 - 300;
      let x = behind ? gp.x0 - 38 : gp.x0 - 80;
      if (!behind && ld.alive && near(lx, x, 26) && near(lFeet, feet, 4)) x = lx - 36;
      const atSpot = near(cpuFeet(p), feet, 4) && cx < gp.x0 - 20 && gp.x0 - (cx + 10) < ASH.gustR - 30;
      out = atSpot && p.grounded && near(cx, x, behind ? 8 : 40) ? {} : go(st, p, m, x, feet, behind ? 4 : 8);
      if (atSpot) {
        fan = true; dir = 1;
        if (!info.partnerCpu && ashGustReach(m, gp, p) && near(lx, gp.x0 - 14, 50) && ld.grounded && cpuFor(st, 'hopOver', true, dt) > 2.5) say(st, p, 'Jump! I’ll blow!');
      }
    } else if (job.kind === 'lever' && gapOf(m, job.ref) && lx > gapOf(m, job.ref).x1 - 10 && cx < gapOf(m, job.ref).x0) {
      // the leader is over the gap working the bridge lever: wait at the edge, fanning the ash off them
      const gp = gapOf(m, job.ref);
      out = go(st, p, m, gp.x0 - 30, gp.r * T, 8);
      fan = Math.abs(lx - cx) < ASH.range; dir = 1;
      if (!info.partnerCpu && arrived(st) && cpuFor(st, 'lever', true, dt) > 4) say(st, p, 'Pull the lever!');
    } else if (job.kind === 'exit' && m.exit) {
      const e = m.exit, ecx = e.x + e.w / 2, dirIn = Math.sign(ecx - cx) || 1;
      let x = ecx - dirIn * 12;
      if (ld.alive && near(lx, x, 18) && near(lFeet, e.y + e.h, 4)) x = clamp(lx - dirIn * 24, e.x + 6, e.x + e.w - 6);
      out = go(st, p, m, x, e.y + e.h, 4);
    } else {
      // follow: a little way behind the leader (on my side of them); standing between them and the job, move on
      // ahead out of their way
      const tdir = Math.sign(job.x - lx) || 1, ahead = (cx - lx) * tdir > 0;
      const side = cx <= lx ? -1 : 1, x = ahead && Math.abs(cx - lx) < 80 ? lx + tdir * 90 : lx + side * 54;
      const dx = Math.abs(lx - cx) + (ahead && Math.abs(cx - lx) < 80 ? 100 : 0);
      // the leader is jumping something just ahead: wait until they have landed (no jumping into them)
      if (!ld.grounded && dx < 110 && p.grounded) out = {};
      else out = dx > 74 || !near(cpuFeet(p), lFeet, 40) ? go(st, p, m, x, lFeet, 10) : {};
    }
    // a person leader who stands still far away: a nudge (the way is theirs to find)
    if (!info.partnerCpu && info.partnerIdle > 6 && ld.alive && (Math.abs(lx - cx) > 150 || st._for_blocked > 2)) say(st, p, job.kind === 'exit' ? 'Over here!' : 'Lead the way!');
    // fan the leader while they are in reach (the cloud clears for them, an ash hat blows off)
    if (!fan && ld.alive && Math.abs(lx - cx) < ASH.range - 30 && Math.abs(cpuCy(ld) - cpuCy(p)) < 90) { fan = true; dir = Math.sign(lx - cx) || p.face; }
    if (fan && dir && p.grounded && !out.left && !out.right) face(out, p, dir);
    // only fan the way that's wanted (don't blow while turning round)
    out.act = fan && (!dir || p.face === dir);
    return out;
  }

  cpuBrain('ash', {
    think(st, p, o, dt, info) {
      const m = info.mst;
      if (!m || !m.dens || m.done || info.intro) return {};
      // the person walked away: wait quietly too (the core would stop the presses, this also stops the bubbles)
      if (!info.partnerCpu && info.partnerIdle > CPU.idleStop) return {};
      return p.id === m.leader ? leader(st, p, o, m, dt, info) : fanner(st, p, o, m, dt, info);
    },
  });
})();
