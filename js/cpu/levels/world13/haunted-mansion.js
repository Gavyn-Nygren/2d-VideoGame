/* Pip & Bo - Computer partner brain for 13-3 Haunted Mansion (mode 'mansion'). */
'use strict';

(() => {
  /* Each room names the flashlight HOLDER (st.holder) and the MOVER (st.mover), so the computer does the job it has.
     What it knows: where the sleepy ghosts lie (their faint outlines show on screen) and how long a lit one stays awake
     (its little ring), the ghost book's drift, the paintings and the door. Both brains work out the same next stop:
       the door once the holder can walk there, else the next painting in the room's plan (where the light goes next).
     Mover: follows the tile-map way (cpuNav) with every ghost counted as a plank, but before each hop onto a ghost it
       waits until that ghost is awake with time to spare and the light is off (a person holder: until the beam is clear
       of the hop). With no tile way up (the Library) it rides the ghost book: steps on while it rests lit at the bottom,
       stands still, steps off at the top. At a painting it swaps once the holder is standing (on the plan's spot, if
       the plan names one). In 1-player mode it calls "Light, please!" when it waits for a long time.
     Holder: reads the mover's way and picks the ghosts it needs next (the one under the mover and the next one ahead,
       or the book). For the most urgent one it tries standing spots it can walk to, faces and beam angles, keeps the
       ones whose centre ray reaches that ghost, checks the whole beam against the mover (an Eep costs a lot) and goes
       for the cheapest. There it turns the light on, tilts to the angle and holds it until the ghosts are charged, then
       turns it off so the mover can hop. It never turns the light on while the mover is in the air. Nothing to light:
       it walks to the plan's waiting spot or, once the mover's way there is all stone, to the door. It aims from where
       the game puts the lamp (MODES.mansion.test.mansionHand: leaning out over an edge when aiming down).
     Its notes (which ghosts it found no way to light, the last map cells) live in this file, so they are wiped when the
     level loads again (a fresh G.mst) or the room changes. It keeps quiet while the room's role chips are up. */
  const M = () => MODES.mansion.test;
  // no chatter while the room's role chips are up (a bubble would cover them), except on a race retry (no chips then)
  const say = (st, p, text) => { if (st.roomT >= MANSION.badgeT || (st.race && st.race.misses > 0)) cpuSay(p, text); };
  const AHEAD = 2.0, UNDER = 0.9, RELIGHT = 1.0;   // awake seconds the holder charges to, and re-lights below

  /* ---------- the tile map with the ghosts as planks (mover) or as air (holder) ---------- */
  // (for the mover, a ghost the holder found no way to light for a while counts as air: it goes another way)
  function withGrid(st, solid, fn) {
    const g = G.level.grid, saved = [];
    for (const pl of st.plats) if (!pl.book) for (let c = pl.c0; c <= pl.c1; c++) { saved.push(g[pl.r][c]); g[pl.r][c] = solid && !unlit(pl.id) ? '=' : '.'; }
    try { return fn(); } finally {
      let k = 0;
      for (const pl of st.plats) if (!pl.book) for (let c = pl.c0; c <= pl.c1; c++) g[pl.r][c] = saved[k++];
    }
  }
  const OPTS_H = { key: 'mansionH', noHop: true };
  const NOLIGHT = new Map();   // ghost id -> until when the holder found no way to light it
  const unlit = id => (NOLIGHT.get(id) || 0) > G.time;
  const optsM = (extra) => Object.assign({ key: 'mansionM' + [...NOLIGHT.keys()].filter(unlit).sort().join('.'), noHop: true }, extra || {});
  // the ghost under a nav cell (-1: stone or nothing)
  const ghostUnder = (st, tx, ty) => (ty + 1 < ROWS ? st.ghostAt[(ty + 1) * COLS + tx] : -1);
  // a path between two map cells (indexes), or null
  function pathBetween(g, a, b) { if (!a || !b) return null; if (a === b) return { path: [], t: 0 }; return navPath(g, a.i, b.i); }
  // the cell a player stands in, or the last one they stood in
  function cellOf(S, g, p) {
    const n = navFrom(g, p);
    if (n) { S.lastCell = S.lastCell || {}; S.lastCell[p.id] = { tx: n.tx, ty: n.ty }; return n; }
    const lc = S.lastCell && S.lastCell[p.id];
    return lc ? g.at.get(lc.ty * COLS + lc.tx) || null : null;
  }

  /* ---------- the shared plan: where the mover is going, and what it needs lit ---------- */
  // (module state, so it is wiped whenever the level loads again (R restart, quit and come back: G.mst is a fresh
  // object then) or the room changes; its times are G.time, which loadLevel sets back to 0)
  const SH = { t: -1, k: -1, mst: null };
  function shared(st) {
    if (SH.t === G.time && SH.k === st.k && SH.mst === st) return SH;
    if (SH.k !== st.k || SH.mst !== st) { SH.lastCell = null; SH.desperate = 0; NOLIGHT.clear(); }
    SH.t = G.time; SH.k = st.k; SH.mst = st;
    const h = G.players[st.holder], m = G.players[st.mover];
    const d = st.exit, doorX = d.x + d.w / 2, doorFeet = d.y + d.h;
    // can the holder walk (stone only) to the door?
    const hg = withGrid(st, false, () => navGraph(h, OPTS_H));
    SH.hg = hg;
    const hc = cellOf(SH, hg, h), doorH = navGoal(hg, doorX, doorFeet);
    SH.holderDoor = !!(hc && doorH && Math.abs(navCellX(doorH.tx) - doorX) < 40 && Math.abs(navFeet(doorH.ty) - doorFeet) < 10 && pathBetween(hg, hc, doorH));
    // the mover's stop
    let stop = null;
    if (SH.holderDoor) stop = { kind: 'door', x: doorX, feet: doorFeet };
    else {
      // the first painting in the plan the holder can't walk to yet (that's where the light has to go next)
      for (const step of st.plan) {
        const pt = step.portrait != null && st.portraits[step.portrait];
        if (!pt) continue;
        const c = navGoal(hg, pt.x, pt.y), near = c && Math.abs(navCellX(c.tx) - pt.x) < 40 && Math.abs(navFeet(c.ty) - pt.y) < 10;
        if (!(near && hc && pathBetween(hg, hc, c))) { stop = { kind: 'portrait', pt, x: pt.x, feet: pt.y, step }; break; }
      }
      if (!stop && st.portraits.length) { const pt = st.portraits[st.portraits.length - 1]; stop = { kind: 'portrait', pt, x: pt.x, feet: pt.y, step: null }; }
    }
    SH.stop = stop;
    // the mover's way there (every ghost counted as a plank)
    let mg = withGrid(st, true, () => navGraph(m, optsM()));
    SH.mg = mg;
    let mc = cellOf(SH, mg, m), goal = stop ? navGoal(mg, stop.x, stop.feet) : null;
    let r = mc && goal ? pathBetween(mg, mc, goal) : null;
    // no way left without the ghosts the holder can't light from up there: the holder may come down to help
    if (!r && mc && goal && [...NOLIGHT.keys()].some(unlit)) {
      NOLIGHT.clear(); SH.desperate = G.time + 20;
      mg = SH.mg = withGrid(st, true, () => navGraph(m, optsM()));
      mc = cellOf(SH, mg, m);
      r = pathBetween(mg, mc, navGoal(mg, stop.x, stop.feet));
    }
    SH.mPath = r; SH.mCell = mc;
    SH.book = !r && st.books.length && stop ? st.books[0] : null;
    // what needs light: the ghost under the mover, the next ghost on the way (or the book)
    const needs = [];
    if (r && mc) {
      const under = ghostUnder(st, mc.tx, mc.ty);
      if (under >= 0 && m.grounded) needs.push({ id: under, want: UNDER, under: true });
      let cum = 0;
      for (const e of r.path) {
        const b = mg.cells[e.to], gi = ghostUnder(st, b.tx, b.ty);
        if (gi >= 0 && gi !== under) { if (cum < 2.2) needs.push({ id: gi, want: AHEAD }); break; }
        cum += e.kind === 'walk' ? 0.14 : 0.6;
        if (gi < 0 && under >= 0) break;   // a stone landing first: one hop at a time
      }
    } else if (SH.book) {
      const b = SH.book, bx = b.x + b.w / 2;
      // riding: kept lit all the way (an Eep on the book is harmless); waiting: charged while it rests at the bottom
      if (st.ride === b) needs.push({ id: b.id, want: 9, book: true, ride: true });
      else if (Math.abs(cpuCx(m) - bx) < 110 && Math.abs(cpuFeet(m) - b.y0) < 40) {
        // (only while it rests at the bottom, or soon will: time to aim; lighting it anywhere else is no use)
        const k = b.s % b.period;
        if (k < b.pause - 0.5 || b.period - k < 1.8) needs.push({ id: b.id, want: 2.0, book: true });
      }
    }
    SH.needs = needs;
    // the mover's way has no ghost left: the holder may head for the door
    SH.allStone = !!r && !r.path.some(e => ghostUnder(st, mg.cells[e.to].tx, mg.cells[e.to].ty) >= 0) && (!mc || ghostUnder(st, mc.tx, mc.ty) < 0);
    return SH;
  }

  /* ---------- the beam: one centre ray (the same stops as the game's cast) ---------- */
  function ray(st, ox, oy, face, tilt) {
    const R = MANSION.range, S = 3, dx = face * Math.cos(tilt), dy = -Math.sin(tilt), grid = G.level.grid;
    for (let d = 3; d <= R; d += S) {
      const x = ox + dx * d, y = oy + dy * d, tx = Math.floor(x / T), ty = Math.floor(y / T);
      if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return -1;
      const gi = st.ghostAt[ty * COLS + tx];
      if (gi >= 0 && y - ty * T <= MANSION.slab) return gi;
      if (grid[ty][tx] === '#') return -1;
      for (const b of st.books) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id;
    }
    return -1;
  }
  // the cells the holder can come back from to where it stands now (so it never drops off a floor it needs)
  function backTo(g, from) {
    const n = g.cells.length, ok = new Uint8Array(n);
    if (!from) return ok;
    if (!g.rev) { g.rev = g.cells.map(() => []); for (const c of g.cells) for (const e of c.edges) g.rev[e.to].push(c.i); }
    const q = [from.i]; ok[from.i] = 1;
    while (q.length) { const u = q.pop(); for (const v of g.rev[u]) if (!ok[v]) { ok[v] = 1; q.push(v); } }
    return ok;
  }
  // all cells the holder can walk to, with the seconds it takes
  function reachable(g, from) {
    const n = g.cells.length, dist = new Float64Array(n).fill(Infinity), done = new Uint8Array(n);
    if (!from) return dist;
    dist[from.i] = 0;
    for (;;) {
      let u = -1, best = Infinity;
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
      if (u < 0 || best > 9) break;
      done[u] = 1;
      for (const e of g.cells[u].edges) { const nd = dist[u] + e.t; if (nd < dist[e.to]) dist[e.to] = nd; }
    }
    return dist;
  }
  // where to stand and how to aim so the beam lights ghost `need` (ghosts can't be lit through other ghosts or stone)
  function findAim(st, S, h, m, sh, need) {
    const pl = st.plats[need.id], g = sh.hg;
    const hc = cellOf(S, g, h);
    const dist = reachable(g, hc), back = (SH.desperate || 0) > G.time ? null : backTo(g, hc);
    const bad = (S.bad || []).filter(q => q.until > G.time);
    const lead = pl.book ? 0.35 : 0;
    const by = pl.book ? M().mansionBookY(pl, pl.s + lead) : pl.y;
    const aims = [];
    for (let k = 0; k < 4; k++) aims.push(pl.x + 8 + (pl.w - 16) * k / 3);
    const cands = [];
    const tryAt = (cx, feet, cost, cellI) => {
      if (Math.abs(cx - cpuCx(m)) < 34 && Math.abs(feet - cpuFeet(m)) < 30) return;   // (not on top of the mover)
      if (bad.some(q => Math.abs(q.x - cx) < 20 && Math.abs(q.feet - feet) < 6)) return;
      for (const face of [-1, 1]) {
        const hand0 = M().mansionHand(cx, feet, face, null, true);
        for (const ax of aims) for (const ay of [by + 4, by + 9]) {
          // (aiming down near an edge the holder leans out, which moves the lamp: aim again from there)
          let ox = hand0.x, oy = hand0.y, tilt = Math.atan2(oy - ay, (ax - ox) * face);
          for (let k = 0; k < 2; k++) { const o = M().mansionHand(cx, feet, face, tilt, true); ox = o.x; oy = o.y; tilt = Math.atan2(oy - ay, (ax - ox) * face); }
          const dx = (ax - ox) * face;
          if (dx < 8) continue;
          if (Math.abs(tilt) > MANSION.tiltMax - 0.02 || Math.hypot(ax - ox, ay - oy) > MANSION.range - 8) continue;
          if (!pl.book && ray(st, ox, oy, face, tilt) !== pl.id) continue;
          if (pl.book) { // the book moves: check the ray against where it will be
            const y0 = pl.y; pl.y = by; const hit = ray(st, ox, oy, face, tilt); pl.y = y0; if (hit !== pl.id) continue;
          }
          const turn = face !== h.face ? 0.12 : 0;
          cands.push({ cx, feet, face, tilt, ox, oy, cellI, cost: cost + turn + Math.abs(tilt - st.tilt) / MANSION.tiltV * 0.6 });
        }
      }
    };
    if (h.grounded) tryAt(cpuCx(h), cpuFeet(h), 0, hc ? hc.i : -1);
    for (const c of g.cells) if (dist[c.i] < 8 && (!back || back[c.i])) {
      tryAt(navCellX(c.tx), navFeet(c.ty), dist[c.i] + 0.1, c.i);
      // at a floor's edge, also right at the lip (the beam can look down past the floor)
      for (const d of [-1, 1]) if (!g.at.get(c.ty * COLS + c.tx + d)) tryAt(navCellX(c.tx) + d * 9, navFeet(c.ty), dist[c.i] + 0.15, c.i);
    }
    if (!cands.length) return null;
    cands.sort((a, b) => a.cost - b.cost);
    // the best few: the whole beam against the mover (and a bonus for lighting the other needs too)
    const mr = { x: m.x - 5, y: m.y - 6, w: m.w + 10, h: m.h + 8 };
    let best = null;
    for (const c of cands.slice(0, 40)) {
      const cs = M().mansionCast(st, c.ox, c.oy, c.face, c.tilt, M().mansionHalf(st), m.alive ? mr : null);
      let score = c.cost + (cs.hit ? 3 : 0);
      for (const n of sh.needs) if (n.id !== need.id && cs.plats.has(n.id)) score -= 0.6;
      if (!best || score < best.score) best = Object.assign({ score }, c);
    }
    return best;
  }

  /* ---------- the holder ---------- */
  function holderThink(st, S, h, m, sh, info) {
    const out = { left: false, right: false, jump: false, down: false, up: false, act: false };
    const light = on => { if (st.light !== on) out.act = 'tap'; };
    if (!h.alive) return out;
    // a swap (or a fall) moved the holder: any aim worked out before is stale
    if (S.swaps !== st.stats.swaps || !S.lastPos || Math.abs(S.lastPos.x - h.x) > 40 || Math.abs(S.lastPos.y - h.y) > 60) { S.aim = null; S.nav = null; S.swaps = st.stats.swaps; }
    S.lastPos = { x: h.x, y: h.y };
    // the most urgent ghost: the lowest charge against what it needs
    let need = null;
    for (const n of sh.needs) { const pl = st.plats[n.id]; if (pl.t < n.want && (!need || pl.t - n.want < st.plats[need.id].t - need.want)) need = n; }
    // satisfied (and the light off): wait for the mover to go; re-light only when a need runs low
    if (S.hush && need && !need.book) { const pl = st.plats[need.id]; if (pl.t > (need.under ? 0.6 : RELIGHT) && G.time - S.hushT < 3) need = null; }
    if (!need && sh.needs.length) { if (st.light) { S.hush = true; S.hushT = G.time; if (st.plats[sh.needs[sh.needs.length - 1].id].t > 1) say(st, h, 'Go! Hop on!'); } light(false); return out; }
    if (need) S.hush = false;
    if (!need) S.aim = null;
    const mAir = !m.grounded;
    if (need && !mAir) {
      S.aimT = (S.aimT || 0) - DT;
      if (!S.aim || S.aim.id !== need.id || S.aimT <= 0) { S.aim = findAim(st, S, h, m, sh, need); if (S.aim) S.aim.id = need.id; S.aimT = st.plats[need.id].book ? 0.2 : 0.5; }
      const a = S.aim;
      if (!a) {
        light(false);
        if (!need.book && !need.under) { NOLIGHT.set(need.id, G.time + 8); say(st, h, 'I can’t light that one from here!'); }
        return out;
      }
      const atX = Math.abs(cpuCx(h) - a.cx) <= 5 && Math.abs(cpuFeet(h) - a.feet) < 4 && h.grounded;
      if (!atX) {
        // walk there with the light off (no jumping with it on)
        if (Math.abs(cpuCx(h) - a.cx) > T || Math.abs(cpuFeet(h) - a.feet) > 4) light(false);
        const o = withGrid(st, false, () => cpuNav(S, h, a.cx, a.feet, OPTS_H));
        Object.assign(out, o, { act: out.act });
        if (st.light) out.jump = false;
        return out;
      }
      // the beam comes on at the angle it had: if that would spook the mover, tilt it facing the other way first
      const tiltOK = Math.abs(st.tilt - a.tilt) <= 0.04;
      if (!st.light && !tiltOK && !S.away) {
        const mr = m.alive ? m : null, hit = f => M().mansionCastFor(st, h, f, st.tilt, mr).hit;
        if (hit(a.face) && !hit(-a.face)) S.away = true;
      }
      if (tiltOK) S.away = false;
      const wantFace = S.away ? -a.face : a.face;
      if (h.face !== wantFace) { out.left = wantFace < 0; out.right = wantFace > 0; return out; }
      light(true);
      // lit but the ghost isn't (the mover or something in the way): try another spot
      const lit = st.cast && st.cast.plats.has(need.id);
      S.missT = st.light && !lit && !S.away && Math.abs(st.tilt - a.tilt) < 0.05 ? (S.missT || 0) + DT : 0;
      if (S.missT > 1.0) { (S.bad = S.bad || []).push({ x: a.cx, feet: a.feet, until: G.time + 5 }); S.missT = 0; S.aimT = 0; }
      if (st.light) {
        if (st.tilt < a.tilt - 0.02) out.up = true;
        else if (st.tilt > a.tilt + 0.02) out.down = true;
      }
      // the mover got spooked by this aim: look again soon
      if (st.frz.on) S.aimT = Math.min(S.aimT, 0.15);
      return out;
    }
    if (mAir) { light(false); return out; }
    // nothing to light: the plan's waiting spot, or the door once the mover's way is all stone
    light(false);
    const stop = sh.stop;
    let gx = null, gf = null;
    if (sh.holderDoor && (sh.allStone || (stop && stop.kind === 'door' && !sh.needs.length && sh.mPath && sh.mPath.path.length === 0))) { gx = st.exit.x + st.exit.w / 2; gf = st.exit.y + st.exit.h; }
    else if (stop && stop.kind === 'portrait' && stop.step && stop.step.hold) { gx = navCellX(stop.step.hold[0]); gf = navFeet(stop.step.hold[1]); }
    if (gx != null) {
      const o = withGrid(st, false, () => cpuNav(S, h, gx, gf, Object.assign({ tol: 8 }, OPTS_H)));
      Object.assign(out, o, { act: out.act });
      if (stop && stop.kind === 'door' && gx === st.exit.x + st.exit.w / 2) say(st, h, 'To the door!');
    }
    return out;
  }

  /* ---------- the mover ---------- */
  // is the box a hop sweeps through lit right now?
  function hopLit(st, x0, x1, top, bottom) {
    if (!st.light || !st.cast) return false;
    for (let y = top; y <= bottom; y += 10) for (let x = Math.min(x0, x1) - 12; x <= Math.max(x0, x1) + 12; x += 10) if (M().mansionLitAt(st.cast, x, y)) return true;
    return false;
  }
  function moverThink(st, S, m, h, sh, info) {
    const out = { left: false, right: false, jump: false, down: false, up: false, act: false };
    if (!m.alive) return out;
    const stop = sh.stop;
    if (!stop) return out;
    const holderCpu = cpuOn(h.id);
    const lightOK = (x0, x1, top, bottom) => !st.frz.on && (!st.light || (!holderCpu && !hopLit(st, x0, x1, top, bottom)));
    // at the painting: swap when the holder stands ready
    if (stop.kind === 'portrait') {
      const at = M().mansionPortraitAt(st, m);
      if (at === stop.pt && m.grounded) {
        cpuSeek(out, m, stop.pt.x, 6);
        S.portT = (S.portT || 0) + DT;
        const hold = stop.step && stop.step.hold;
        const placed = !hold || (Math.abs(cpuCx(h) - navCellX(hold[0])) < 20 && Math.abs(cpuFeet(h) - navFeet(hold[1])) < 6) || S.portT > (holderCpu ? 25 : 6);
        if (h.alive && h.grounded && Math.abs(h.vx) < 30 && placed && S.portT > 0.4 && stop.pt.cd <= 0) { out.act = 'tap'; say(st, m, 'Swap!'); }
        else if (hold && !placed) say(st, m, 'Climb up the steps first!');
        return out;
      }
      S.portT = 0;
    }
    // the ghost book (no tile way up)
    if (sh.book) return bookThink(st, S, m, h, sh, out, lightOK);
    const mg = sh.mg;
    const o = withGrid(st, true, () => cpuNav(S, m, stop.x, stop.feet, optsM({ tol: stop.kind === 'portrait' ? 6 : 10 })));
    Object.assign(out, o);
    if (!m.grounded) return out;
    // gate the move about to start: onto a ghost only when it is awake with time to spare, and never into the light
    const e = S.nav && S.nav.cur;
    if (e) {
      const a = mg.cells[e.from], b = mg.cells[e.to];
      const gi = b ? ghostUnder(st, b.tx, b.ty) : -1, here = a ? ghostUnder(st, a.tx, a.ty) : -1;
      const need = e.kind === 'walk' ? 0.35 : 1.0;
      const ready = gi < 0 || (M().mansionSolid(st.plats[gi]) && st.plats[gi].t >= need);
      const top = Math.min(navFeet(a.ty), navFeet(b.ty)) - PH - 100;
      const clear = lightOK(navCellX(a.tx), navCellX(b.tx), top, Math.max(navFeet(a.ty), navFeet(b.ty)));
      const risky = e.kind !== 'walk' || gi >= 0 || here >= 0;
      if (risky && !(ready && clear)) {
        // wait at the take-off point (no jump, no step onto the sleeping ghost)
        out.jump = false; out.down = false;
        if (e.kind === 'walk' || e.kind === 'off') { cpuSeek(out, m, navCellX(a.tx), 4); }
        else if (Math.abs(cpuCx(m) - navCellX(a.tx)) <= 3) out.left = out.right = false;
        S.waitT = (S.waitT || 0) + DT;
        if (!ready) { if (S.waitT > 1.2) say(st, m, gi >= 0 ? 'Light that ghost!' : 'Light, please!'); if (!holderCpu && S.waitT > 3 && !M().mansionPortraitAt(st, m) && st.callCD <= 0) out.act = 'tap'; }
        return out;
      }
    }
    S.waitT = 0;
    return out;
  }
  function bookThink(st, S, m, h, sh, out, lightOK) {
    const b = sh.book, bx = b.x + b.w / 2, atBottom = Math.abs(b.y - b.y0) < 1, atTop = Math.abs(b.y - b.y1) < 1;
    const k = b.s % b.period, restLeft = b.pause - k;   // seconds of rest left at the bottom (when k < pause)
    if (st.ride === b) {
      // riding: stand in the middle; at the top, step off toward the stop
      if (atTop && b.y1 < b.y0) { const dir = Math.sign(sh.stop.x - bx) || 1; out.left = dir < 0; out.right = dir > 0; return out; }
      cpuSeek(out, m, bx, 6);
      return out;
    }
    // on the floor: wait beside the book's nook, step on while it rests awake at the bottom
    const hSame = Math.abs(cpuFeet(h) - b.y0) < 4;
    const side = hSame ? (cpuCx(h) < bx ? 1 : -1) : (cpuCx(m) < bx ? -1 : 1), waitX = side < 0 ? b.x - 16 : b.x + b.w + 16;
    const onFloor = Math.abs(cpuFeet(m) - b.y0) < 3;
    if (!onFloor) {
      // (in the nook under the book, or somewhere else: walk back to the waiting spot)
      const o = withGrid(st, true, () => cpuNav(S, m, waitX, b.y0, optsM({ tol: 6 })));
      return Object.assign(out, o);
    }
    const ready = atBottom && k < b.pause && restLeft > 0.55 && M().mansionSolid(b) && b.t > 1.2 && !st.frz.on;
    if (ready || (Math.abs(cpuCx(m) - bx) < b.w / 2 && M().mansionSolid(b) && atBottom)) { cpuSeek(out, m, bx, 6); S.waitT = 0; return out; }
    cpuSeek(out, m, waitX, 5);
    S.waitT = (S.waitT || 0) + DT;
    if (S.waitT > 2) say(st, m, 'Wake the book up!');
    return out;
  }

  cpuBrain('mansion', {
    reset(st) { st.lastCell = null; },
    think(S, p, o, dt, info) {
      const st = info.mst;
      if (!st || !st.plats || !st.exit) return {};
      if (info.intro || st.phase !== 'play' || G.introT > MANSION.introHold) { S.nav = null; return {}; }
      if (st.race && st.race.phase === 'lost') { S.nav = null; return {}; }
      const sh = shared(st);
      return p.id === st.holder ? holderThink(st, S, p, o, sh, info) : moverThink(st, S, p, o, sh, info);
    },
  });
})();
