/* Pip & Bo - Computer partner: laser vault. */
'use strict';

(() => {
  /* Each room names the runner and the lookout (st.runner / st.look), so the computer does the job it has.
     Both brains only use what the screen shows: a beam counts once the lantern lit it (or it is known: ghosted after a
     zap, magic dust), and a stretch of the vault counts as "looked at" once the light passed over it (cells within
     R - 22 px of the spot centre, so any beam crossing them was lit then). A moving beam (blinker, mover, spinner) is
     timed only while it shows or for 4 s after; later its whole sweep counts as dark until the light finds it again.
     Lookout: works out the runner's way to the treasure (or the exit) on the tile map and sweeps the light along it,
       a few cells ahead of the runner. Everything ahead seen: it parks the light on the next beam in the runner's way
       (blinkers and movers need watching). When the runner waits at a laser wall (or the box calls, or the runner
       shouts "Flip it!"), it takes the light to that wall's fuse box and flips it, then comes back.
     Runner: follows the tile map way (cpuNav) toward the treasure, but before each move it plays the next second or so
       on a copy of the movement against every beam it has seen (blinkers, movers and spinners where they will be) and
       the flipped walls coming back. A move that would touch a beam is swapped for a duck-walk, a hop (now or after a
       few steps) or a wait; a move into a stretch the light has not shown yet waits for the light and shouts "Light!".
       At a laser wall it waits and shouts "Flip it!". After a long wait it takes its chance (a zap is soft). */
  const OPTS = { noHop: true, key: 'laser' };
  const DUCK = 12; // PH - LASER.duckH

  /* ---------- what the screen has shown: looked-at cells and seen beams ---------- */
  function look(S, st) {
    if (!S.scan || S.scanK !== st.k) { S.scan = new Uint8Array(COLS * ROWS); S.seen = new Set(); S.vis = new Map(); S.scanK = st.k; }
    const sp = st.spot, r = laserSpotR(st) - 22;
    const c0 = Math.max(0, Math.floor((sp.x - r) / T)), c1 = Math.min(COLS - 1, Math.floor((sp.x + r) / T));
    const r0 = Math.max(0, Math.floor((sp.y - r) / T)), r1 = Math.min(ROWS - 1, Math.floor((sp.y + r) / T));
    for (let ty = r0; ty <= r1; ty++) for (let tx = c0; tx <= c1; tx++) if (Math.hypot(tx * T + 15 - sp.x, ty * T + 15 - sp.y) <= r) S.scan[ty * COLS + tx] = 1;
    for (const b of st.beams) if (b.glow > 0.2 || b.known || st.dust) { S.seen.add(b); S.vis.set(b, G.time); }
  }
  // a moving beam (blinker, mover, spinner) out of sight for a while: a person remembers where it sweeps, not where it
  // is now, so its whole sweep counts as dark until the light shows it again
  const MEMORY = 4;
  const moving = b => b.blink || b.mover || b.spin;
  function staleHit(b, hb) {
    if (b.mover) { const m = b.mover; return hb.x < b.x1 && hb.x + hb.w > b.x0 && hb.y < Math.max(m.y0, m.y1) + 3 && hb.y + hb.h > Math.min(m.y0, m.y1) - 3; }
    if (b.spin) { const sp = b.spin, cx = clamp(sp.x, hb.x, hb.x + hb.w), cy = clamp(sp.y, hb.y, hb.y + hb.h); return Math.hypot(cx - sp.x, cy - sp.y) < sp.len + 3; }
    return laserSegRect(b, hb);
  }
  const scanned = (S, tx, ty) => tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS || S.scan[ty * COLS + tx] === 1;

  /* ---------- where a beam will be in tau seconds (the same rules laserBeams uses) ---------- */
  function spinLen(S, sp, a) {
    const key = sp.x + ',' + sp.y, k = ((Math.round(a / (Math.PI * 2) * 128) % 128) + 128) % 128;
    const tab = S.spin || (S.spin = {}), arr = tab[key] || (tab[key] = new Float32Array(128).fill(-1));
    if (arr[k] < 0) {
      const aa = k / 128 * Math.PI * 2, ca = Math.cos(aa), sa = Math.sin(aa);
      let l = sp.len;
      for (let d = 3; d <= sp.len; d += 3) if (tile(Math.floor((sp.x + ca * d) / T), Math.floor((sp.y + sa * d) / T)) === '#') { l = d - 3; break; }
      arr[k] = l;
    }
    return arr[k];
  }
  const Q = { x0: 0, y0: 0, x1: 0, y1: 0 };
  function beamAt(S, st, b, tau) {
    const esc = st.phase === 'escape', mul = esc ? ((G.level.def.alarm && G.level.def.alarm.blinkMul) || 1) : 1;
    if (st.phase === 'won' || (b.alarm && !esc)) return null;
    if (b.blink) { const on = b.blink[0], off = b.blink[1]; if ((b.bt + tau * mul) % (on + off) >= on) return null; }
    if (b.bank && st.banks[b.bank].offT > tau) return null;
    const sT = st.spinT + tau * mul;
    if (b.mover) {
      const m = b.mover, ph = (sT / m.period + (m.phase || 0)) % 1, y = m.y0 + (m.y1 - m.y0) * (0.5 - 0.5 * Math.cos(ph * Math.PI * 2));
      Q.x0 = b.x0; Q.x1 = b.x1; Q.y0 = Q.y1 = y; return Q;
    }
    if (b.spin) {
      const sp = b.spin, a = (sp.phase || 0) + sT * sp.speed + b.arm * Math.PI * 2 / (sp.arms || 1), l = spinLen(S, sp, a);
      Q.x0 = sp.x; Q.y0 = sp.y; Q.x1 = sp.x + Math.cos(a) * l; Q.y1 = sp.y + Math.sin(a) * l; return Q;
    }
    return b;
  }

  /* ---------- a copy of the runner's movement (control + laserRunner's duck + tiles) ---------- */
  function solidAt(p, tx, ty) { return solidFor(tile(tx, ty), p); }
  function headroom(p, s, need) {
    const y = s.y - need, c1 = Math.floor((s.x + 0.01) / T), c2 = Math.floor((s.x + PW - 0.01) / T);
    for (let r = Math.floor(y / T); r <= Math.floor((s.y - 0.01) / T); r++) for (let c = c1; c <= c2; c++) if (solidAt(p, c, r)) return false;
    return true;
  }
  function physStep(p, s, mv, press, held, duck, dt) {
    const want = duck && s.g;
    if (want && !s.duck) { s.y += DUCK; s.h = PH - DUCK; s.duck = true; }
    else if (s.duck && (!want || press)) { if (headroom(p, s, DUCK)) { s.y -= DUCK; s.h = PH; s.duck = false; } else press = false; }
    if (mv) s.vx = approach(s.vx, mv * PHYS.maxRun, (s.g ? PHYS.accG : PHYS.accA) * dt);
    else s.vx = approach(s.vx, 0, (s.g ? PHYS.fricG : PHYS.fricA) * dt);
    s.coy = s.g ? PHYS.coyote : s.coy - dt;
    if (press && s.coy > 0) { s.vy = -PHYS.jumpV; s.jumping = true; s.g = false; s.coy = 0; }
    if (s.jumping && !held && s.vy < 0) { s.vy *= PHYS.cut; s.jumping = false; }
    if (s.vy >= 0) s.jumping = false;
    s.vy = Math.min(s.vy + PHYS.g * dt, PHYS.maxFall);
    if (s.duck) s.vx = clamp(s.vx, -PHYS.maxRun * LASER.duckMul, PHYS.maxRun * LASER.duckMul);
    // x
    s.x += s.vx * dt;
    const ty1 = Math.floor((s.y + 0.01) / T), ty2 = Math.floor((s.y + s.h - 0.01) / T);
    if (s.vx > 0) { const tx = Math.floor((s.x + PW - 0.001) / T); for (let ty = ty1; ty <= ty2; ty++) if (solidAt(p, tx, ty)) { s.x = tx * T - PW; s.vx = 0; break; } }
    else if (s.vx < 0) { const tx = Math.floor((s.x + 0.001) / T); for (let ty = ty1; ty <= ty2; ty++) if (solidAt(p, tx, ty)) { s.x = (tx + 1) * T; s.vx = 0; break; } }
    // y
    const prevB = s.y + s.h;
    s.y += s.vy * dt;
    const tx1 = Math.floor((s.x + 0.01) / T), tx2 = Math.floor((s.x + PW - 0.01) / T);
    if (s.vy > 0) {
      const ty = Math.floor((s.y + s.h - 0.001) / T), top = ty * T;
      for (let tx = tx1; tx <= tx2; tx++) { const ch = tile(tx, ty); if (solidFor(ch, p) || (ch === '=' && prevB <= top + 0.5)) { s.y = top - s.h; s.vy = 0; break; } }
    } else if (s.vy < 0) {
      const ty = Math.floor((s.y + 0.001) / T);
      for (let tx = tx1; tx <= tx2; tx++) if (solidAt(p, tx, ty)) { s.y = (ty + 1) * T; s.vy = 0; s.jumping = false; break; }
    }
    const by = s.y + s.h, gy = Math.floor((by + 1) / T), gtop = gy * T;
    s.g = false;
    for (let tx = tx1; tx <= tx2; tx++) { const ch = tile(tx, gy); if (solidFor(ch, p) || (ch === '=' && by <= gtop + 0.5)) { s.g = true; break; } }
  }
  // play a plan: { dir, duck, jump (press at t = 0, or at t = walk), hold (s), walk (s before the jump), nav (steer like
  // cpuNav: { tx, kind }), dur (s), tail (s standing still after), tailDuck }. Returns { hit, unknown, x, feet, win }.
  function sim(S, st, p, pl, goal) {
    const s = { x: p.x, y: p.y, vx: p.vx, vy: p.vy, h: p.h, g: p.grounded, coy: p.grounded ? PHYS.coyote : 0, jumping: p.jumping, duck: st.ducked };
    const dt = DT, m = 1, list = S.seenList, res = { hit: false, unknown: false, x: 0, feet: 0, win: false, fell: false };
    let t = 0, jumped = false, tJ = 0, landed = false, tEnd = pl.jump ? Infinity : pl.dur;
    const maxA = pl.jump ? (pl.walk || 0) + 1.3 : pl.dur;
    for (let k = 0; k < 400; k++, t += dt) {
      let mv = 0, press = false, held = false, duck = false;
      if (t < tEnd) {
        if (t >= maxA) break; // a jump that never landed
        mv = pl.dir || 0; duck = !!pl.duck;
        if (pl.jump && !jumped && t >= (pl.walk || 0) - 1e-9) { press = true; jumped = true; tJ = t; }
        if (jumped) {
          held = t - tJ < pl.hold;
          if (pl.nav && !s.g) mv = navSteer(pl.nav.kind, { x: s.x, vy: s.vy }, pl.nav.tx, true);
        }
      } else {
        if (t >= tEnd + (pl.tail || 0)) break;
        duck = !!pl.tailDuck;
      }
      const wasAir = !s.g;
      physStep(p, s, mv, press, held, duck, dt);
      if (pl.jump && jumped && !landed && wasAir && s.g && t - tJ > 0.05) { landed = true; tEnd = t; }
      if (s.y > H + 20) { res.fell = true; res.hit = true; break; }
      // the treasure (or the exit) touched first wins
      if (goal.rect && s.x < goal.rect[0] + goal.rect[2] && s.x + PW > goal.rect[0] && s.y < goal.rect[1] + goal.rect[3] && s.y + s.h > goal.rect[1]) { res.win = true; break; }
      const cx = s.x + PW / 2, cy = s.y + s.h / 2;
      if (!scanned(S, Math.floor(cx / T), Math.floor(cy / T))) res.unknown = true;
      if (k % 2 === 0) {
        const hb = { x: s.x + LASER.insetX - m, y: s.y + LASER.insetY - m, w: PW - 2 * LASER.insetX + 2 * m, h: s.h - 2 * LASER.insetY + 2 * m };
        for (const b of list) {
          if (S.stale && S.stale.has(b)) { if (!res.unknown && staleHit(b, hb)) res.unknown = true; continue; }
          const q = beamAt(S, st, b, t + dt); if (q && laserSegRect(q, hb)) { res.hit = true; break; }
        }
        if (res.hit) break;
      }
    }
    res.x = s.x + PW / 2; res.feet = s.y + s.h; res.g = s.g;
    // a jump plan that never landed (still in the air) is not a plan
    if (pl.jump && !landed && !res.win) res.hit = true;
    return res;
  }

  /* ---------- the runner ---------- */
  function goalOf(st) {
    if (st.phase === 'escape' && st.exits[0]) { const e = st.exits[0]; return { x: e.x + T / 2, feet: (e.r + 1) * T, rect: [e.x, e.y - T, T, 2 * T] }; }
    const g = st.gem;
    return g ? { x: g.x, feet: (g.r + 1) * T, rect: [g.x - 12, g.y - 12, 24, 30] } : { x: cpuCx(G.players[st.runner]), feet: 450, rect: null };
  }
  // the runner's own shout (the level draws it as "Flip it!" or "Light!" over the runner, so no bubble of ours on top);
  // after three calls in a row it calls less often
  function shout(S, p, st, out, every) {
    if ((S.shoutT || 0) > 0) return;
    if (G.time - (S.shoutAt || -99) > 15) S.shoutN = 0;
    S.shoutN = (S.shoutN || 0) + 1; S.shoutAt = G.time;
    S.shoutT = every * (S.shoutN > 3 ? 2.5 : 1); out.act = 'tap';
  }
  function runner(S, st, p, o, dt, info) {
    const out = {};
    S.shoutT = (S.shoutT || 0) - dt;
    if (st.zap || !p.alive || st.phase === 'won') { S.air = null; S.risk = null; S.navOK = false; return out; }
    const goal = goalOf(st);
    S.seenList = [...S.seen];
    S.stale = new Set(S.seenList.filter(b => moving(b) && G.time - (S.vis.get(b) || -99) > MEMORY && !(b.alarm && st.phase !== 'escape')));
    const nav = cpuNav(S, p, goal.x, goal.feet, OPTS);
    nav.down = false; // ▼ is a duck here, never a drop
    // in the air: our own hop holds its keys; a map jump is steered by cpuNav
    if (!p.grounded) {
      if (S.risk && S.risk.pl === 'nav') S.risk = null;
      if (S.air) {
        const mv = S.air.nav ? navSteer(S.air.nav.kind, { x: p.x, vy: p.vy }, S.air.nav.tx, true) : S.air.dir;
        out.left = mv < 0; out.right = mv > 0; out.jump = G.time - S.air.t0 < S.air.hold; return out;
      }
      return Object.assign(out, nav, { down: false });
    }
    S.air = null;
    // a chance taken after a long wait (below) is followed through: the map way until it jumps (0.8 s at most), or the
    // plan's walk and then its jump
    if (S.risk) {
      const k = G.time - S.risk.t0, pl = S.risk.pl;
      if (pl === 'nav') { if (k < 0.8) return Object.assign(out, nav, { down: false }); S.risk = null; }
      else if (pl.jump && k >= (pl.walk || 0)) { S.risk = null; return act(S, p, out, Object.assign({}, pl, { walk: 0 })); }
      else if (!pl.jump && k >= pl.dur) S.risk = null;
      else { out.left = pl.dir < 0; out.right = pl.dir > 0; out.down = !!pl.duck; return out; }
    }
    const gdir = goal.x >= cpuCx(p) ? 1 : -1;
    const dir = nav.right ? 1 : nav.left ? -1 : 0;
    const fresh = nav.jump && !CPU.last[p.id].jump;
    const ok = r => !r.hit && (!r.unknown || r.win);
    // the map move under way: a jump (or a jump from a stand) to the cell tc
    const N = S.nav, gph = NAV.cache[p.id], e = N && N.cur, tc = e && gph && gph.cells[e.to];
    const tgt = tc && e.kind !== 'walk' && e.kind !== 'off' && e.kind !== 'drop' ? { tx: tc.tx, kind: e.kind } : null;
    // standing near the take-off of a jump: judge the jump itself, not the small steps that line it up
    const atTakeoff = tgt && e.kind !== 'run' && Math.abs(cpuCx(p) - (gph.cells[e.from].tx * T + T / 2)) < 14;
    // 1. what the map way wants, if it is safe
    let first;
    if (fresh) first = sim(S, st, p, { jump: true, hold: 9, dir, nav: tgt, tail: 0.2 }, goal);
    else if (atTakeoff) first = sim(S, st, p, { jump: true, hold: 9, dir: 0, nav: tgt, tail: 0.2 }, goal);
    else if (dir) first = sim(S, st, p, { dir, dur: 0.4, tail: 0.25 }, goal);
    else first = sim(S, st, p, { dur: 0.4 }, goal);
    if (ok(first)) { S.blockT = 0; return Object.assign(out, nav, { down: false }); }
    // 2. something else that still gets on (2a for a jump move, 2b for a walk). While waiting, the choice is kept 0.1 s.
    const d = dir || gdir;
    if (S.wait && G.time < S.wait.until) { S.blockT = (S.blockT || 0) + dt; return act(S, p, out, S.wait.pl, true); }
    let unknownWait = first.unknown && !first.hit, risky = !first.hit ? 'nav' : null;
    // 2a. a jump that is not safe from its take-off: the same jump from a few steps either way (ducked if ducking:
    //     out from under a beam first), landing on the same cell
    if (tgt && e.kind !== 'run' && (fresh || atTakeoff)) {
      const land = (tc.ty + 1) * T, toB = Math.sign(tc.tx * T + T / 2 - cpuCx(p)) || gdir;
      for (const s of [toB, -toB]) for (let w = 0; w < 0.62; w += 0.05) {
        const pl = { dir: s, duck: st.ducked, walk: w, jump: true, hold: 9, nav: tgt, tail: 0.2 }, r = sim(S, st, p, pl, goal);
        const there = r.win || (r.g && Math.abs(r.feet - land) < 4);
        if (!r.hit && r.unknown && there) { unknownWait = true; if (!risky) risky = pl; }
        if (!(ok(r) && there)) continue;
        S.blockT = 0;
        if (w > 0) { out.left = s < 0; out.right = s > 0; out.down = st.ducked; return out; }
        if (CPU.last[p.id].jump) return out;
        out.jump = true; out.left = s < 0; out.right = s > 0; S.air = { dir: s, hold: 9, t0: G.time, nav: tgt };
        return out;
      }
    }
    const tryPlan = (pl, min) => {
      const r = sim(S, st, p, pl, goal), prog = (r.x - cpuCx(p)) * d > (min || 8) || r.win;
      if (!r.hit && r.unknown) unknownWait = true;
      if (!r.hit && prog && !risky) risky = pl;
      return ok(r) && prog;
    };
    // 2b. a walk: a duck-walk or a hop now; or keep walking if a hop a few steps on works; or creep a step (the light may
    //     only show a little ahead). Not at a jump's take-off: there these only shuffle back and forth.
    if (!(atTakeoff || (fresh && tgt))) {
      const duckWalk = { dir: d, duck: true, dur: 0.45, tail: 0.25, tailDuck: true };
      if (tryPlan(duckWalk)) { S.blockT = 0; return act(S, p, out, duckWalk); }
      for (const hold of [0.08, 0.14, 9]) {
        const hop = { dir: d, jump: true, hold, tail: 0.2 };
        if (tryPlan(hop)) { S.blockT = 0; return act(S, p, out, hop); }
      }
      if (dir) for (let w = 0.035; w < 0.42; w += 0.035) {
        if (tryPlan({ dir: d, walk: w, jump: true, hold: 0.08, tail: 0.2 }) || tryPlan({ dir: d, walk: w, jump: true, hold: 0.14, tail: 0.2 })) {
          S.blockT = 0; out.left = d < 0; out.right = d > 0; return out;
        }
      }
      for (const creep of [{ dir: d, dur: 0.1, tail: 0.3 }, { dir: d, duck: true, dur: 0.12, tail: 0.3, tailDuck: true }]) {
        if (tryPlan(creep, 5)) { S.blockT = 0; return act(S, p, out, creep); }
      }
    }
    // 3. wait somewhere safe: stand, duck, or step back
    S.blockT = (S.blockT || 0) + dt;
    const wallAhead = st.beams.some(b => b.bank && b.on && b.kind === 'v' && S.seen.has(b) && Math.abs(b.x0 - cpuCx(p)) < 90 && (b.x0 - cpuCx(p)) * gdir > 0
      && b.y1 > p.y && b.y0 < p.y + p.h);
    if (wallAhead) shout(S, p, st, out, 3.5);
    else if (unknownWait && S.blockT > 1.8) shout(S, p, st, out, 4.5);
    // waited a long time: take a chance into the dark (a zap only sends us back to the rug), never into a beam we know
    if (S.blockT > 8 && !wallAhead && risky) {
      S.blockT = 0; S.risk = { pl: risky, t0: G.time };
      return risky === 'nav' ? Object.assign(out, nav, { down: false }) : act(S, p, out, risky);
    }
    const waits = [{ dur: 0.45, duck: st.ducked, tailDuck: st.ducked }, { dur: 0.45, duck: true, tailDuck: true }, { dir: -d, dur: 0.3, tail: 0.3 }, { dir: -d, duck: true, dur: 0.35, tail: 0.3, tailDuck: true }];
    for (const pl of waits) {
      const r = sim(S, st, p, pl, goal);
      if (!r.hit) { S.wait = { pl, until: G.time + 0.1 }; return act(S, p, out, pl, true); }
    }
    return out;
  }
  // press the first step of a plan
  function act(S, p, out, pl, still) {
    if (pl.jump && !(pl.walk > 0)) {
      if (CPU.last[p.id].jump) return out; // let go first so the press counts
      out.jump = true; S.air = { dir: pl.dir, hold: pl.hold, t0: G.time, nav: pl.nav };
    }
    out.left = pl.dir < 0; out.right = pl.dir > 0; out.down = !!pl.duck;
    if (still && !pl.dir) out.left = out.right = false;
    return out;
  }

  /* ---------- the lookout ---------- */
  // the runner's way on the tile map (refreshed a few times a second): points to sweep, in order
  function wayPoints(S, st) {
    const r = G.players[st.runner];
    if (S.wayT > 0 && S.way) return S.way;
    S.wayT = 0.25;
    const goal = goalOf(st), g = navGraph(r, OPTS);
    let from = r.alive && r.grounded ? navFrom(g, r) : null;
    if (!from) { let bd = 1e9; for (const c of g.cells) { const dd = Math.abs(c.tx * T + 15 - cpuCx(r)) + Math.abs((c.ty + 1) * T - cpuFeet(r)) * 2; if (dd < bd) { bd = dd; from = c; } } }
    const to = navGoal(g, goal.x, goal.feet), pts = [];
    if (!from || !to) return (S.way = pts);
    pts.push({ tx: from.tx, ty: from.ty });
    if (from !== to) {
      const path = navPath(g, from.i, to.i);
      if (path) for (const e of path.path) {
        const a = g.cells[e.from], b = g.cells[e.to];
        if (e.kind !== 'walk') { // the arc of a jump or a fall: the cells between, a row higher
          const n = Math.abs(b.tx - a.tx);
          for (let k = 1; k < n; k++) pts.push({ tx: a.tx + Math.sign(b.tx - a.tx) * k, ty: Math.min(a.ty, b.ty) - 1 });
        }
        pts.push({ tx: b.tx, ty: b.ty });
      }
    }
    return (S.way = pts);
  }
  const bandSeen = (S, pt) => scanned(S, pt.tx, pt.ty) && scanned(S, pt.tx, pt.ty - 1) && scanned(S, pt.tx, pt.ty - 2);
  // the light's target: the first stretch of the way not looked at yet, else the next beam in the runner's way
  function sweepTarget(S, st) {
    const r = G.players[st.runner], pts = wayPoints(S, st), rx = cpuCx(r);
    let n = 0;
    for (const pt of pts) {
      if (++n > 16) break;
      if (!bandSeen(S, pt)) return [pt.tx * T + 15, pt.ty * T - 12];
    }
    // the nearest beam we have seen that crosses the next part of the way (moving ones first)
    let best = null, bd = 1e9;
    const near = pts.slice(0, 9);
    for (const b of S.seen) {
      if (st.phase === 'won') break;
      const q = beamAt(S, st, b, 0) || b;
      for (const pt of near) {
        const px = pt.tx * T + 15, py = (pt.ty + 1) * T - 15;
        const dd = laserSegDist(px, py, q);
        if (dd > 40) continue;
        const score = Math.abs(px - rx) + (b.mover || b.spin || b.blink ? -60 : 0) + (b.bank ? 40 : 0);
        if (score < bd) { bd = score; best = [px, Math.min(py, Math.max(q.y0, q.y1) - 4)]; }
        break;
      }
    }
    if (best) return best;
    const gdir = goalOf(st).x >= rx ? 1 : -1;
    return [rx + gdir * 60, cpuCy(r) - 10];
  }
  // a laser wall in the runner's way that needs flipping now: its fuse box
  function flipBox(S, st, info, dt) {
    const r = G.players[st.runner], rx = cpuCx(r), gdir = goalOf(st).x >= rx ? 1 : -1;
    let want = null;
    for (const bk of Object.values(st.banks)) {
      if (!bk.box || bk.offT > 0.4) continue;
      const wall = st.beams.find(b => b.bank === bk.id && b.kind === 'v' && (b.x0 - rx) * gdir > -4 && Math.abs(b.x0 - rx) < 120 && b.y1 > r.y && b.y0 < r.y + r.h + 4);
      if (!wall || !(S.seen.has(wall) || bk.box.call > 0)) continue;   // a wall nobody has seen yet: wait for the call
      const waiting = Math.abs(r.vx) < 25 && r.grounded;
      if (waiting || bk.box.call > 0 || Math.abs(wall.x0 - rx) < 70) want = bk;
    }
    if (!want || !r.alive || st.zap) { S.flipT = 0; return null; }
    // a moment to react (more on easy), and first look past the wall so the runner can go as soon as it opens
    S.flipT = (S.flipT || 0) + dt;
    const ahead = wayPoints(S, st).slice(0, 12).every(pt => bandSeen(S, pt));
    if (S.flipT < 0.15 + 0.6 * (1 - info.skill) || (!ahead && S.flipT < 4)) return null;
    return want.box;
  }
  // per axis: push toward the target, let go early enough for the light to stop on it
  function seekAxis(x, v, t) {
    const d = t - x;
    if (Math.abs(d) < 3) return 0;
    if (Math.sign(v) === Math.sign(d) && v * v / (2 * LASER.spotFric) >= Math.abs(d) - 2) return 0;
    return Math.sign(d);
  }
  function lookout(S, st, p, o, dt, info) {
    const out = {}, s = st.spot;
    S.wayT = (S.wayT || 0) - dt;
    if (st.phase === 'won') return out;
    const box = flipBox(S, st, info, dt);
    let tx, ty;
    if (box) {
      tx = box.x; ty = box.y;
      const R = laserSpotR(st);
      if (Math.hypot(s.x - tx, s.y - ty) < R * LASER.flipReach * 0.6 && !CPU.last[p.id].act) { out.act = true; S.flipT = 0; if (cpuSolo() && cpuOn(p.id)) cpuSay(p, 'Flipped!', 1.5); }
    } else [tx, ty] = sweepTarget(S, st);
    const V = LASER.vault;
    tx = clamp(tx, V.x0, V.x1); ty = clamp(ty, V.y0, V.y1);
    const mx = seekAxis(s.x, s.vx, tx), my = seekAxis(s.y, s.vy, ty);
    out.right = mx > 0; out.left = mx < 0; out.down = my > 0; out.up = my < 0;
    if (!S.said && G.introT <= 0 && st.k <= 1) { S.said = true; cpuSay(p, 'I’ll light the way!', 2.2); }
    return out;
  }

  cpuBrain('laser', {
    test: { sim, beamAt, goalOf, wayPoints }, // for scratch bot tests
    think(S, p, o, dt, info) {
      const st = info.mst;
      if (!st || !st.beams || !st.spot) return {};
      if (G.introT > LASER.introHold) return {};
      look(S, st);
      if (st.lock[p.id]) return {}; // let go of everything once at the start of a room
      return p.id === st.runner ? runner(S, st, p, o, dt, info) : lookout(S, st, p, o, dt, info);
    },
  });
})();
