/* Pip & Bo - Computer partner brain for 15-2 Gravity Flip Station. */
'use strict';

/* How the computer plays Gravity Flip Station
   It reads the room's plan (gravflipPlan) and its own job in the step (gravflipJob):
   - 'flipper': walk to one of its own switches it can stand on (the way up it is), wait there, and press flip when a
     copy of the physics says the partner lands where the step wants them (on a jump step: in mid-air, near the middle
     of the landing zone). A person partner gets a calm moment first.
   - 'flip': go where a flip lands it in the right place, and wait. On a jump step: go to the take-off spot from the
     plan (step.jump), wait until the partner stands at a switch, then run and jump.
   - 'move': walk (on the floor or, flipped, on the ceiling) to the zone, the button or the exit; the keycard first
     when the step needs it and it can reach it.
   A flipped computer finds its way in the station seen upside down (the same mirror trick the level moves it with).
   Last resort: no way to where it must go for a long time (and no closed field to wait for): hold ▼ to go back. */
const GRAVFLIP_BOT = { dt: 1 / 60, look: 0.08, retarget: 0.5, stuckBack: 9, calm: 0.45, runUp: 70, holdJump: 0.35 };

// run fn with the station as player p sees it (upside down when flipped) and low gravity
function gravflipBotIn(st, p, fn) {
  const L = G.level, flip = st.grav[p.id] === 1;
  if (flip) { L.grid = st.mgrid; gravflipMirror(p); }
  try { return gravflipPhys(st, fn); } finally { if (flip) { gravflipMirror(p); L.grid = st.grid; } }
}
// the map options for p's view: keep off the goo on the surface p walks on
function gravflipBotOpts(st, p) {
  const flip = st.grav[p.id] === 1, want = flip ? 2 : 1;
  return {
    noHop: true, tol: 5, key: 'gf' + (flip ? 1 : 0) + (st.float ? 'f' : ''),
    avoid: (tx, ty) => { const r = flip ? ROWS - 1 - ty : ty; return r >= 0 && r < ROWS && tx >= 0 && tx < COLS && st.goo[gravflipIx(tx, r)] === want; },
  };
}
// a map cell (in p's view) as a real standing box
function gravflipBotBox(st, flip, c) {
  const r = flip ? ROWS - 1 - c.ty : c.ty;
  return { x: c.tx * T + T / 2 - PW / 2, y: flip ? r * T : (r + 1) * T - PH, w: PW, h: PH, c: c.tx, r };
}
// seconds from p's cell to every cell of the map
function gravflipBotDists(g, from) {
  const n = g.cells.length, dist = new Float64Array(n).fill(Infinity), done = new Uint8Array(n);
  if (!from) return dist;
  dist[from.i] = 0;
  for (;;) {
    let u = -1, b = Infinity;
    for (let i = 0; i < n; i++) if (!done[i] && dist[i] < b) { b = dist[i]; u = i; }
    if (u < 0) break;
    done[u] = 1;
    for (const e of g.cells[u].edges) { const d = dist[u] + e.t; if (d < dist[e.to]) dist[e.to] = d; }
  }
  return dist;
}

/* ---------- a copy of the station's movement, in real coordinates (tiles only) ---------- */
function gravflipBotGoo(st, x, y, pad) {
  const c1 = Math.max(0, Math.floor((x - pad) / T)), c2 = Math.min(COLS - 1, Math.floor((x + PW + pad) / T));
  const r1 = Math.max(0, Math.floor(y / T)), r2 = Math.min(ROWS - 1, Math.floor((y + PH) / T));
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
    const gz = st.goo[gravflipIx(c, r)];
    if (!gz) continue;
    const y0 = gz === 2 ? r * T : (r + 1) * T - 12;
    if (x - pad < c * T + T - 3 && x + PW + pad > c * T + 3 && y < y0 + 12 && y + PH > y0) return true;
  }
  return false;
}
// s: { x, y, vx, vy } (box top-left), grav 0 floor / 1 ceiling, mv: held -1/0/1. Returns where it lands
// { ok: true, x, y, col, grav } or { ok: false } (goo, space, or still flying at maxT: then also its state)
function gravflipBotSim(st, p, s, grav, mv, maxT) {
  const k = st.float ? GRAVFLIP.floatG : 1, g = GRAVFLIP.g * k * (grav ? -1 : 1), mf = GRAVFLIP.maxFall * (st.float ? GRAVFLIP.floatFall : 1);
  const dt = GRAVFLIP_BOT.dt, solid = (c, r) => (c < 0 || c >= COLS ? true : r < 0 || r >= ROWS ? false : solidFor(st.grid[r][c], p));
  let x = s.x, y = s.y, vx = s.vx, vy = s.vy;
  for (let t = 0; t < maxT; t += dt) {
    vx = mv ? approach(vx, mv * PHYS.maxRun, PHYS.accA * dt) : approach(vx, 0, PHYS.fricA * dt);
    vy = clamp(vy + g * dt, -mf, mf);
    x += vx * dt;
    const r1 = Math.floor((y + 0.01) / T), r2 = Math.floor((y + PH - 0.01) / T);
    if (vx > 0) { const c = Math.floor((x + PW - 0.001) / T); for (let r = r1; r <= r2; r++) if (solid(c, r)) { x = c * T - PW; vx = 0; break; } }
    else if (vx < 0) { const c = Math.floor((x + 0.001) / T); for (let r = r1; r <= r2; r++) if (solid(c, r)) { x = (c + 1) * T; vx = 0; break; } }
    y += vy * dt;
    const c1 = Math.floor((x + 0.01) / T), c2 = Math.floor((x + PW - 0.01) / T);
    let landed = false;
    if (vy > 0) { const r = Math.floor((y + PH - 0.001) / T); for (let c = c1; c <= c2; c++) if (solid(c, r)) { y = r * T - PH; vy = 0; landed = !grav; break; } }
    else if (vy < 0) { const r = Math.floor((y + 0.001) / T); for (let c = c1; c <= c2; c++) if (solid(c, r)) { y = (r + 1) * T; vy = 0; landed = !!grav; break; } }
    if (y > H + GRAVFLIP.space || y + PH < -GRAVFLIP.space) return { ok: false };
    if (gravflipBotGoo(st, x, y, landed ? 4 : 0)) return { ok: false };
    if (landed) return { ok: true, x, y, col: Math.floor((x + PW / 2) / T), grav };
  }
  return { ok: false, flying: true, x, y, vx, vy };
}
// does a landing meet the cond (gravity, zone, button, exit)?
function gravflipBotFits(st, c, land) {
  if (!land || !land.ok) return false;
  return gravflipCondAt(st, c, { x: land.x, y: land.y, w: PW, h: PH }, land.grav, true);
}
// where a flip right now sends player q ({ x, y, vx, vy } now, held mv)
function gravflipBotFlipLand(st, q, s, mv) {
  const ng = st.grav[q.id] ^ 1;
  return gravflipBotSim(st, q, { x: s.x, y: s.y, vx: s.vx, vy: s.vy + (ng ? -1 : 1) * GRAVFLIP.flipKick }, ng, mv, 3.5);
}
const gravflipBotMid = c => (c && c.zone ? (c.zone[0] + c.zone[1] + 1) * T / 2 : null);

/* ---------- picking where to go ---------- */
// the best cell (shortest way) in p's view that passes test(box), or null
// (no way, but there would be one with the force field open: { wait: true })
function gravflipBotPick(S, st, p, test) {
  return gravflipBotIn(st, p, () => {
    const opts = gravflipBotOpts(st, p), flip = st.grav[p.id] === 1, f = G.level.sw.f;
    const best = gravflipBotBest(st, p, navGraph(p, opts), flip, test);
    if (best !== undefined || !f || f.on) return best || null;
    // the same with the field open, on a map of its own (the nav keeps one map per player)
    const keep = NAV.cache[p.id];
    NAV.cache[p.id] = S.alt || null; f.on = true;
    try { S.alt = navGraph(p, Object.assign({}, opts, { key: opts.key + 'open' })); return gravflipBotBest(st, p, S.alt, flip, test) ? { wait: true } : null; }
    finally { f.on = false; NAV.cache[p.id] = keep; }
  });
}
// undefined: no cell passes; null: not standing on the map
function gravflipBotBest(st, p, g, flip, test) {
  const from = navFrom(g, p);
  if (!from) return null;
  const dist = gravflipBotDists(g, from);
  let best, bd = Infinity;
  for (const c of g.cells) {
    if (dist[c.i] === Infinity) continue;
    const box = gravflipBotBox(st, flip, c), extra = test(box);
    if (extra === false || extra == null) continue;
    const d = dist[c.i] + (typeof extra === 'number' ? extra : 0);
    if (d < bd) { bd = d; best = { tx: c.tx, ty: c.ty, x: box.x + PW / 2, box, d }; }
  }
  return best;
}
// walk toward a picked cell (in p's view); returns the presses
function gravflipBotGo(S, st, p, tgt, x) {
  const out = gravflipBotIn(st, p, () => cpuNav(S, p, x != null ? x : tgt.x, navFeet(tgt.ty), gravflipBotOpts(st, p)));
  out.down = false;
  return out;
}

/* ---------- the jobs ---------- */
function gravflipBotFlipper(S, st, p, o, c, step, dt, info, mine) {
  const out = {};
  // my switch: one I can stand on the way up I am, best one where standing also meets my own part of the step
  const sw = gravflipSwitchAt(st, p);
  const onMine = sw && sw.owner === p.id;
  if (!onMine) {
    S.ready = 0;
    if (!S.tgt || S.tgtKind !== 'switch') {
      const mineSw = st.switches.filter(q => q.owner === p.id && q.ceil === (st.grav[p.id] === 1));
      S.tgt = gravflipBotPick(S, st, p, box => {
        const q = mineSw.find(s2 => s2.c === box.c && s2.r === box.r);
        if (!q) return null;
        return gravflipCondAt(st, mine, box, st.grav[p.id], true) ? 0 : 3;
      });
      S.tgtKind = 'switch';
    }
    if (!S.tgt || S.tgt.wait) return gravflipBotStuck(S, st, p, dt, !!(S.tgt && S.tgt.wait));
    return gravflipBotGo(S, st, p, S.tgt);
  }
  S.stuckT = 0;
  // standing on my switch: stop, and flip at the right moment
  if (Math.abs(p.vx) > 30) { out.left = p.vx > 0; out.right = p.vx < 0; }
  if (!o.alive || st.pl[p.id].cd > 0) { S.ready = 0; return out; }
  const mv = (o.input.right ? 1 : 0) - (o.input.left ? 1 : 0);
  const now = gravflipBotFlipLand(st, o, o, mv);
  let good = gravflipBotFits(st, c, now);
  const mid = gravflipBotMid(c);
  if (good && !o.grounded && mid != null) {
    // in mid-air: a moment later may land nearer the middle of the zone
    const later = gravflipBotSim(st, o, { x: o.x, y: o.y, vx: o.vx, vy: o.vy }, st.grav[o.id], mv, GRAVFLIP_BOT.look);
    if (later.flying) {
      const l2 = gravflipBotFlipLand(st, o, later, mv);
      if (gravflipBotFits(st, c, l2) && Math.abs(l2.x + PW / 2 - mid) + 6 < Math.abs(now.x + PW / 2 - mid)) good = false;
    }
  }
  // a person standing about gets a calm moment before the flip (they read "Wait here")
  const calm = !info.partnerCpu && o.grounded && !step.jump ? GRAVFLIP_BOT.calm : 0;
  const still = cpuFor(S, 'still', o.grounded && Math.abs(o.vx) < 40, dt);
  S.ready = good ? S.ready + dt : 0;
  const react = step.jump ? 0.02 + (1 - info.skill) * 0.05 : 0.08 + (1 - info.skill) * 0.25;
  if (good && S.ready >= react && (o.grounded ? still >= calm : true)) {
    if (!CPU.last[p.id].act) out.act = true;
    S.ready = 0;
  } else if (!info.partnerCpu) {
    if (step.jump && !o.grounded) { /* (watching the jump) */ }
    else if (cpuFor(S, 'wait', true, dt) > 3) {
      const route = step.jump ? gravflipRoute(st, gravflipPlan(st), o.id) : '';
      cpuSay(p, route === 'back' ? 'Hold down to go back, then jump!' : step.jump && route !== 'plain' ? 'Run and jump, I’ll flip you!' : 'Ready to flip you!');
    }
  }
  return out;
}
// be flipped: go to a spot where a flip lands me right, and wait; on a jump step, take off from the plan's spot
function gravflipBotFlipMe(S, st, p, o, c, step, dt, info) {
  // (a jump step that a plain flip from where I can stand already does, like coming back after a slip, is a plain one)
  if (S.tgtKind === 'jump' || S.tgtKind === 'takeoff') return gravflipBotJumper(S, st, p, o, c, step, dt, info);
  if (!S.tgt || S.tgtKind !== 'spot') {
    S.tgt = gravflipBotPick(S, st, p, box => {
      const land = gravflipBotFlipLand(st, p, { x: box.x, y: box.y, vx: 0, vy: 0 }, 0);
      if (!gravflipBotFits(st, c, land)) return null;
      const mid = gravflipBotMid(c);
      return mid != null ? Math.abs(land.x + PW / 2 - mid) / 400 : 0;
    });
    S.tgtKind = 'spot';
    if (!S.tgt && step.jump && step.jump.length) { S.tgtKind = 'jump'; return gravflipBotJumper(S, st, p, o, c, step, dt, info); }
  }
  if (!S.tgt || S.tgt.wait) return gravflipBotStuck(S, st, p, dt, !!(S.tgt && S.tgt.wait));
  const out = gravflipBotGo(S, st, p, S.tgt);
  const there = S.nav && S.nav.status === 'arrived';
  if (there) { S.stuckT = 0; if (!info.partnerCpu && cpuFor(S, 'waitflip', true, dt) > 2.5) cpuSay(p, 'Flip me at your ' + gravflipColWord(o.id) + ' switch!'); }
  return out;
}
function gravflipBotJumper(S, st, p, o, c, step, dt, info) {
  const J = S.jmp || (S.jmp = { phase: 'go', t: 0, air: false, j: null });
  if (J.phase === 'go' || !J.j) {
    // the nearest take-off spot I can walk to
    if (!S.tgt || S.tgtKind !== 'takeoff') {
      let best = null;
      J.wait = false;
      for (const j of step.jump) {
        const x0 = j.x - j.dir * GRAVFLIP_BOT.runUp, col = Math.floor(x0 / T);
        const t = gravflipBotPick(S, st, p, box => (box.c === col ? 0 : null));
        if (t && t.wait) J.wait = true;
        else if (t && (!best || t.d < best.d)) { best = t; best.j = j; best.x0 = x0; }
      }
      S.tgt = best; S.tgtKind = 'takeoff'; J.j = best && best.j;
    }
    if (!S.tgt) return gravflipBotStuck(S, st, p, dt, J.wait);
    const out = gravflipBotGo(S, st, p, S.tgt, S.tgt.x0);
    if (p.grounded && Math.abs(cpuCx(p) - S.tgt.x0) <= 12 && Math.abs(p.vx) < 40) { J.phase = 'wait'; J.t = 0; S.stuckT = 0; }
    return out;
  }
  const j = J.j, cx = cpuCx(p);
  if (J.phase === 'wait') {
    const sw = gravflipSwitchAt(st, o), ready = sw && sw.owner === o.id && st.pl[o.id].cd <= 0;
    J.t = ready ? J.t + dt : 0;
    if (!info.partnerCpu) cpuSay(p, ready ? 'Here I go: flip me in the air!' : 'Go to your ' + gravflipColWord(o.id) + ' switch!');
    if (Math.abs(cx - (j.x - j.dir * GRAVFLIP_BOT.runUp)) > 14) { J.phase = 'go'; S.tgt = null; return {}; }
    if (J.t >= (info.partnerCpu ? 0.2 : 1.0)) { J.phase = 'run'; J.t = 0; J.air = false; J.jumped = false; }
    return {};
  }
  return gravflipBotRun(S, p, dt) || {};
}
// the run-up and the jump; it keeps going (the same way) until landing, flip or not. null once it is over
function gravflipBotRun(S, p, dt) {
  const J = S.jmp, j = J && J.j;
  if (!j || J.phase !== 'run') return null;
  const out = { left: j.dir < 0, right: j.dir > 0 };
  J.t += dt;
  if (!J.jumped && (cpuCx(p) - j.x) * j.dir >= 0 && p.grounded) { J.jumped = true; J.jt = 0; out.jump = true; }
  if (J.jumped) { J.jt += dt; out.jump = J.jt < GRAVFLIP_BOT.holdJump; }
  if (!p.grounded) J.air = true;
  if ((J.air && p.grounded) || J.t > 4 || !p.alive) { J.phase = 'go'; S.tgt = null; return null; }
  return out;
}
// go to my part of the step (zone, button, exit), the keycard first when the step needs it and I can get it
function gravflipBotMove(S, st, p, o, c, step, dt, info, pl) {
  const needKey = step.key && !st.keyGot && st.key;
  if (!S.tgt || (S.tgtKind !== 'key' && S.tgtKind !== 'goal')) {
    S.tgt = null;
    if (needKey) { const k = st.key; S.tgt = gravflipBotPick(S, st, p, box => (rectHit(box, k.x - 12, k.y - 12, 24, 24) ? Math.abs(box.x + PW / 2 - k.x) / 400 : null)); S.tgtKind = 'key'; if (S.tgt && S.tgt.wait) S.tgt = null; }
    if (!S.tgt && c) {
      const d = st.exit, side = d ? d.x + d.w / 2 + (p.id === 0 ? -9 : 9) : 0, mid = gravflipBotMid(c);
      S.tgt = gravflipBotPick(S, st, p, box => {
        if (!gravflipCondAt(st, c, box, st.grav[p.id], true)) return null;
        if (c.door) return Math.abs(box.x + PW / 2 - side) / 300;
        return mid != null ? Math.abs(box.x + PW / 2 - mid) / 2000 : 0;
      });
      S.tgtKind = 'goal';
    }
  }
  if (!S.tgt || S.tgt.wait) {
    // nothing to do here, or no way there yet: a closed field (a partner will open it) means wait
    if (!c || gravflipCondOk(st, p, c)) return {};
    return gravflipBotStuck(S, st, p, dt, !!(S.tgt && S.tgt.wait));
  }
  let x = S.tgt.x;
  if (c && c.door && st.exit) x = clamp(st.exit.x + st.exit.w / 2 + (p.id === 0 ? -9 : 9), st.exit.x + 6, st.exit.x + st.exit.w - 6);
  const out = gravflipBotGo(S, st, p, S.tgt, x);
  if (S.nav && S.nav.status === 'noPath') return gravflipBotStuck(S, st, p, dt, false, out);
  S.stuckT = 0;
  return out;
}
// no way: wait for a closed field, or after a long time hold ▼ to go back to my beacon
function gravflipBotStuck(S, st, p, dt, wait, out) {
  S.stuckT = wait ? 0 : (S.stuckT || 0) + dt;
  if (S.stuckT > GRAVFLIP_BOT.stuckBack && p.grounded) { S.stuckT = 0; S.backT = GRAVFLIP.backHold + 0.15; S.tgt = null; }
  if (wait && !cpuOn(1 - p.id) && cpuFor(S, 'field', true, dt) > 2) cpuSay(p, 'Can you open the field?');
  return wait ? {} : out || {};
}

cpuBrain('gravflip', {
  reset(S) { S.tgt = null; S.tgtKind = ''; S.tkey = ''; S.tT = 0; S.nav = null; S.jmp = null; S.ready = 0; S.stuckT = 0; S.backT = 0; },
  think(S, p, o, dt, info) {
    const st = info.mst;
    if (!st || !st.switches || st.phase !== 'play' || info.intro || G.introT > GRAVFLIP.introHold) return {};
    if (!p.alive) { S.tgt = null; S.jmp = null; S.nav = null; return {}; }
    // going back (hold ▼)
    if (S.backT > 0) { S.backT -= dt; return { down: true }; }
    // a jump under way goes on until it lands
    const run = gravflipBotRun(S, p, dt);
    if (run) return run;
    const pl = gravflipPlan(st), job = gravflipJob(st, pl, p.id), R = pl.role(p.id), step = pl.step;
    const mine = step[R], theirs = step[R === 'A' ? 'B' : 'A'];
    // a fresh choice of where to go when the job changes, and now and then (only on the ground)
    const fld = G.level.sw.f ? (G.level.sw.f.on ? 1 : 0) : 2;
    const key = [pl.si, pl.A, st.grav[p.id], job, st.keyGot ? 1 : 0, fld, st.float ? 1 : 0].join(',');
    S.tT -= dt;
    if (key !== S.tkey) { S.tkey = key; S.tgt = null; S.tgtKind = ''; S.jmp = null; S.ready = 0; }
    else if (S.tT <= 0 && p.grounded && !(S.jmp && S.jmp.phase !== 'go')) { S.tT = GRAVFLIP_BOT.retarget; S.tgt = null; S.tgtKind = ''; }
    if (!p.grounded && !S.tgt && job !== 'flipper') return {};
    // a jumper with no take-off spot it can walk to (under the island): straight back to the beacon
    const noway = job === 'flip' && gravflipRoute(st, pl, p.id) === 'back';
    if (cpuFor(S, 'noway', noway, dt) > 0.6) { S.backT = GRAVFLIP.backHold + 0.15; S.tgt = null; return { down: true }; }
    if (noway) return {};
    if (job === 'flipper') return gravflipBotFlipper(S, st, p, o, theirs, step, dt, info, mine);
    if (job === 'flip') return gravflipBotFlipMe(S, st, p, o, mine, step, dt, info);
    if (job === 'move' || (step.key && !st.keyGot)) return gravflipBotMove(S, st, p, o, mine, step, dt, info, pl);
    S.stuckT = 0;
    // my part is done: stand still (off any switch prompt bother), stop sliding
    const out = {};
    if (Math.abs(p.vx) > 30 && p.grounded) { out.left = p.vx > 0; out.right = p.vx < 0; }
    // in the exit: my own half of it, so nobody hides behind the other
    if (step.exit && st.exit && p.grounded) {
      const dx = st.exit.x + st.exit.w / 2 + (p.id === 0 ? -10 : 10) - cpuCx(p);
      if (Math.abs(dx) > 3) { out.left = dx < 0; out.right = dx > 0; }
    }
    return out;
  },
  // the speech bubble goes under a flipped player (their feet are up)
  bubblePos(p) {
    const st = G.mst;
    if (st && st.grav && st.grav[p.id] === 1) return { x: cpuCx(p), y: p.y + p.h + 64 };
    return { x: cpuCx(p), y: p.y };
  },
});
