/* Pip & Bo - Level 17-3 Waterfall Climb (team, World 17 Jungle Jamboree). */
'use strict';

/* ===== 17-3 Waterfall Climb (mode 'waterfall', team) — Gavyn's pick =====
   "A scrolling climb up a waterfall, helping each other up the ledges." One tall climb (def.climb, 103 rows) beside a
   big jungle waterfall. The camera scrolls up with the pair and always keeps the lower player on screen; the higher one
   can't climb more than WFALL.maxSep above the partner ("Wait for me!").
   - Lift walls (a vine post V on a ledge 5-6 tiles high): too high for a jump (about 3.6 tiles) or a jump off a standing
     partner's head (4.5 tiles). At the foot is a BAMBOO LIFT (Gavyn, 2026-11-15: it replaced the braced-hands boost): a
     bamboo deck by the wall face, hung from a pulley on the ledge, with a bamboo lever 58 px out from the wall. One stands
     on the deck, the other presses the action at the lever: the deck hauls the rider up and they step onto the ledge
     (nobody can ride it alone). Then the one on top presses the action at the post:
     the vine unrolls down the wall. The one below grabs it (▲, or jump into it) and climbs holding ▲ or jump (keyboard
     and touch have no ▲ of their own: W, ↑ and touch ▲ are jump); jump + ◀/▶ away from the wall hops off. Holding the action at
     the post meanwhile heaves them up faster. A vine stays down once dropped (so a fallen friend can climb back alone).
   - Someone standing on your head is carried when you walk, and you can't jump while carrying them ("Oof!"), so stacked
     jumps are no shortcut. Partners walk through each other.
   - Wet rocks (s) are slippery. Springy moss (m) throws a jump about 5.3 tiles. Friendly frogs (r)
     bounce you about 6 tiles ("Ribbit!"). Mist geysers (g) bubble, then puff and lift you about 8.5 tiles. A stream (w)
     pushes you down and kills jumps while it flows; a log jams its top now and then and the water stops for a while. A
     drifting log (L) carries you over a pool.
   - Falling into water (~), or falling more than WFALL.splashBelow tiles below the team checkpoint, is a "Splash!": a
     bubble floats you back to the team checkpoint (C). A checkpoint counts for the team once BOTH players have reached
     it, so falling never puts you above your partner's last checkpoint and never skips a wall.
   - Help, always gold and announced: Big log
     jam (after 3 washes in a stream), Gold raft (after 2 splashes in a log pool). Tico the toucan flies over with a hint
     after a while with no progress.
   - The climb ends when both stand by the toucan nest at the top: Tico shows the treasure. Medal by time and splashes
     (MODES.waterfall.medals, js/medals.js), plus optional gems.
   World coordinates: during the mode's step the players are in climb coordinates (y grows down the whole climb); outside
   it p.y is on screen (p.y - camY), so the engine draws them, their name tags and the computer's bubbles in the right
   place. Particles made during the step are moved onto the screen the same way.
   Every top-level name starts with wfall / WFALL (Sfx.extra.waterfall* too); level state lives in G.mst. */
const WFALL = {
  liftW: 30, leverOff: 58, leverR: 18, liftV: 170, sinkV: 140, stepT: 0.35, frogV: 860, mossV: 800, mossSoft: 0.45,
  climbV: 125, heave: 1.9, vineRoll: 0.7, postReach: 28, vineReach: 15,
  slipFric: 420, slipAcc: 1000,
  streamDown: 2600, streamKill: 5200, streamSlow: 0.55, warn: 0.9,
  geyH: 8.6, geyLift: 430, geyIdle: 2.4, geyWarn: 0.8, geyPuff: 2.2,
  logW: 3, raftW: 4, logPause: 1.0,
  splashBelow: 2.5, float: 1.15,
  maxSep: 13.5, camTopMargin: 96, camBotMargin: 40,
  cpReach: 3.6, nestReach: 3.4,
  jamWash: 3, raftSplash: 2, ticoAfter: 22,
  introHold: 0.4, winHold: 3.4, newsLife: 3.8, chipT: 9, chipAgain: 16,
};
const WFALL_SOLID = '#smg';
const wfallBig = () => (typeof hudBig === 'function' && hudBig());
const wfallCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);   // 1-player mode: the computer's character

/* ---------- each player's own keys (keyboard, controller or touch) for the hint chips ---------- */
function wfallDev(id) { try { return actKey(id); } catch (e) { return 'kb'; } }
const wfallSolo = () => typeof cpuSolo === 'function' && cpuSolo();
function wfallKey(id, what) {
  const d = wfallDev(id), solo = wfallSolo();
  if (what === 'act') return d === 'pad' ? glyph('act') : d === 'touch' ? 'the use button' : solo ? 'F' : id === 0 ? 'F' : '/';
  if (what === 'down') return d === 'pad' ? 'stick down' : d === 'touch' ? '▼' : solo ? 'S' : id === 0 ? 'S' : '↓';
  if (what === 'up') return d === 'pad' ? 'stick up' : d === 'touch' ? '▲' : solo ? 'W' : id === 0 ? 'W' : '↑';
  return '';
}

/* ---------- building the climb from def.climb ---------- */
function wfallBuild(st, def) {
  const rows = def.climb || [];
  st.N = rows.length; st.WH = st.N * T;
  st.grid = rows.map(r => r.split(''));
  const g = st.grid, N = st.N;
  const isS = (c, r) => c < 0 || c >= COLS || r >= N || (r >= 0 && WFALL_SOLID.includes(g[r][c]));
  st.feetOf = h => (N - 1 - h) * T;
  st.spawns = [{ x: 3 * T, y: 0 }, { x: 5 * T, y: 0 }];
  const posts = [], cps = [], lanes = {};
  st.gems = []; st.frogs = []; st.nest = null;
  for (let r = 0; r < N; r++) for (let c = 0; c < COLS; c++) {
    const ch = g[r][c];
    if (!'12VC*rNL'.includes(ch)) continue;
    const x = c * T + T / 2, feet = (r + 1) * T;
    if (ch === '1' || ch === '2') st.spawns[ch === '1' ? 0 : 1] = { x: x - PW / 2, y: feet - PH };
    else if (ch === 'V') posts.push({ c, r });
    else if (ch === 'C') cps.push({ x, feet });
    else if (ch === '*') st.gems.push({ x, y: r * T + T / 2, got: false, ph: (hash(c, r) % 100) / 16, pop: 0 });
    else if (ch === 'r') st.frogs.push({ x, feet, top: feet - 18, sq: 0, blink: 0, look: 1, ph: (hash(r, c) % 100) / 20 });
    else if (ch === 'N') st.nest = { x, feet };
    else if (ch === 'L') (lanes[r] = lanes[r] || []).push(c);
    // (a marker inside a stream is still stream water)
    g[r][c] = (c > 0 && g[r][c - 1] === 'w') || (c < COLS - 1 && g[r][c + 1] === 'w') ? 'w' : '.';
  }
  // lift walls, from the vine posts: the post stands on the ledge's top edge, the wall face drops beside it
  st.walls = posts.map(({ c, r }) => {
    const leftOpen = !isS(c - 1, r + 1), side = leftOpen ? 1 : -1;      // side: +1 the ledge is to the right of the face
    const faceX = leftOpen ? c * T : (c + 1) * T, bc = leftOpen ? c - 1 : c + 1;
    let br = r + 1; while (br < N && !isS(bc, br)) br++;
    const topFeet = (r + 1) * T, baseFeet = br * T;
    return { c, r, side, faceX, topFeet, baseFeet, tall: Math.round((baseFeet - topFeet) / T), postX: c * T + T / 2,
      vineX: faceX - side * 10, boostX: faceX - side * (PW / 2 + 1), down: false, roll: 0, sway: 0,
      done: false, up: [false, false], heave: 0, flash: 0,
      // the bamboo lift: its deck beside the wall face, the lever further out
      lift: { x0: side > 0 ? faceX - WFALL.liftW : faceX, x1: side > 0 ? faceX : faceX + WFALL.liftW, leverX: faceX - side * WFALL.leverOff,
        h: 0, phase: 'down', rider: -1, puller: -1, t: 0, pullT: 0 } };
  }).sort((a, b) => b.baseFeet - a.baseFeet).map((w, i) => Object.assign(w, { i }));
  // checkpoints (the starts count as the first), bottom first
  st.cps = [{ x: (st.spawns[0].x + st.spawns[1].x) / 2 + PW / 2, feet: st.spawns[0].y + PH, start: true }]
    .concat(cps.sort((a, b) => b.feet - a.feet)).map((cp, i) => Object.assign(cp, { i, by: [!!cp.start, !!cp.start], lit: !!cp.start, wave: 0 }));
  for (const cp of st.cps) cp.spots = cp.start ? st.spawns.map(s => ({ x: s.x, y: s.y })) : [-16, 16].map(d => wfallSpot(st, cp.x + d, cp.feet));
  // streams: connected 'w' cells
  st.streams = [];
  const seen = new Uint8Array(N * COLS);
  for (let r = 0; r < N; r++) for (let c = 0; c < COLS; c++) {
    if (g[r][c] !== 'w' || seen[r * COLS + c]) continue;
    let c0 = c, c1 = c, r0 = r, r1 = r; const q = [[c, r]]; seen[r * COLS + c] = 1;
    while (q.length) {
      const [qc, qr] = q.pop();
      c0 = Math.min(c0, qc); c1 = Math.max(c1, qc); r0 = Math.min(r0, qr); r1 = Math.max(r1, qr);
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = qc + dc, nr = qr + dr;
        if (nc >= 0 && nc < COLS && nr >= 0 && nr < N && g[nr][nc] === 'w' && !seen[nr * COLS + nc]) { seen[nr * COLS + nc] = 1; q.push([nc, nr]); }
      }
    }
    st.streams.push({ x0: c0 * T, x1: (c1 + 1) * T, y0: r0 * T, y1: (r1 + 1) * T });
  }
  st.streams.sort((a, b) => b.y1 - a.y1);
  st.streams.forEach((s, i) => {
    const cfg = (def.streams || [])[i] || {};
    Object.assign(s, { i, flow: cfg.flow || 3.2, off: cfg.off || 3.4, t: 0, on: true, k: 1, washes: 0, jam: false, logX: 0 });
  });
  // log lanes over pools
  st.lanes = Object.keys(lanes).map(Number).sort((a, b) => b - a).map((r, i) => {
    const cs = lanes[r], cfg = (def.lanes || [])[i] || {};
    const x0 = Math.min(...cs) * T, x1 = (Math.max(...cs) + 1) * T;
    return { i, x0, x1, top: (r + 1) * T, speed: cfg.speed || 55, w: WFALL.logW * T, x: x0, dir: 1, pause: WFALL.logPause, splashes: 0, gold: false, dx: 0, bob: 0 };
  });
  // geysers: groups of vents in a row
  st.geysers = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < COLS; c++) {
    if (g[r][c] !== 'g' || (c > 0 && g[r][c - 1] === 'g')) continue;
    let c1 = c; while (c1 + 1 < COLS && g[r][c1 + 1] === 'g') c1++;
    st.geysers.push({ x0: c * T, x1: (c1 + 1) * T, feet: r * T, top: r * T - WFALL.geyH * T, t: 0, phase: 'idle', k: 0 });
  }
  st.geysers.sort((a, b) => b.feet - a.feet).forEach((gy, i) => { gy.i = i; gy.t = i * 1.3; });
  st.frogs.sort((a, b) => b.feet - a.feet);   // bottom first, like the route numbers them
  // the route (hints and the computer): ledges in climb coordinates
  st.route = (def.route || []).map((s, i) => Object.assign({}, s, { i, x0: s.at[0] * T - 12, x1: (s.at[1] + 1) * T + 12, feet: st.feetOf(s.at[2]) }));
  st.sections = (def.sections || [{ name: '', h: 0 }]).map(s => ({ name: s.name, feet: st.feetOf(s.h) }));
}
// a standing spot near x on the ledge at feet: rock under both feet, no water
function wfallSpot(st, x, feet) {
  const r = Math.round(feet / T);
  const ok = cx => {
    const x0 = cx - PW / 2, c1 = Math.floor((x0 + 1) / T), c2 = Math.floor((x0 + PW - 1) / T);
    for (let c = c1; c <= c2; c++) if (!wfallSolidAt(st, c, r) || wfallSolidAt(st, c, r - 1)) return false;
    return true;
  };
  for (let k = 0; k <= 90; k += 2) for (const d of [1, -1]) if (ok(x + d * k)) return { x: x + d * k - PW / 2, y: feet - PH };
  return { x: x - PW / 2, y: feet - PH };
}
function wfallCell(st, c, r) {
  if (c < 0 || c >= COLS) return '#';
  if (r < 0) return '.';
  if (r >= st.N) return '#';
  return st.grid[r][c];
}
const wfallSolidAt = (st, c, r) => WFALL_SOLID.includes(wfallCell(st, c, r));

/* ---------- moving (climb coordinates) ---------- */
function wfallMoveX(st, p, dx) {
  if (!dx) return 0;
  const x0 = p.x;
  p.x += dx;
  const r1 = Math.floor((p.y + 0.01) / T), r2 = Math.floor((p.y + p.h - 0.01) / T);
  if (dx > 0) {
    const c = Math.floor((p.x + p.w - 0.001) / T);
    for (let r = r1; r <= r2; r++) if (wfallSolidAt(st, c, r)) { p.x = c * T - p.w; p.vx = Math.min(p.vx, 0); break; }
  } else {
    const c = Math.floor((p.x + 0.001) / T);
    for (let r = r1; r <= r2; r++) if (wfallSolidAt(st, c, r)) { p.x = (c + 1) * T; p.vx = Math.max(p.vx, 0); break; }
  }
  return p.x - x0;
}
// moves p down or up; lands on rock, on the partner's head, on a log, or bounces off a frog
function wfallMoveY(st, p, dy) {
  if (!dy) return 0;
  const P = st.pl[p.id], y0 = p.y, prevBottom = p.y + p.h;
  p.y += dy;
  const c1 = Math.floor((p.x + 0.01) / T), c2 = Math.floor((p.x + p.w - 0.01) / T);
  if (dy > 0) {
    const r = Math.floor((p.y + p.h - 0.001) / T), top = r * T;
    for (let c = c1; c <= c2; c++) if (wfallSolidAt(st, c, r)) { p.y = top - p.h; P.landV = p.vy; P.landOn = wfallCell(st, c, r); p.vy = 0; return p.y - y0; }
    // the partner's head
    const o = other(p), O = st.pl[o.id];
    if (o.alive && o.grounded && O.vine < 0 && !O.splash && p.x < o.x + o.w - 4 && p.x + p.w > o.x + 4 && prevBottom <= o.y + 1 && p.y + p.h >= o.y) {   // (a partner in mid-jump is no ground: that gave a second full jump)
      p.y = o.y - p.h; P.landV = p.vy; P.landOn = 'head'; p.vy = 0; return p.y - y0;
    }
    for (const ln of st.lanes) {
      if (p.x < ln.x + ln.w - 3 && p.x + p.w > ln.x + 3 && prevBottom <= ln.top + 1 && p.y + p.h >= ln.top) {
        p.y = ln.top - p.h; P.landV = p.vy; P.landOn = 'log'; p.vy = 0; return p.y - y0;
      }
    }
    for (const f of st.frogs) {
      if (Math.abs(p.x + p.w / 2 - f.x) < 18 && prevBottom <= f.top + 2 && p.y + p.h >= f.top) {
        p.y = f.top - p.h; wfallFrogBounce(st, p, f); return p.y - y0;
      }
    }
  } else {
    const r = Math.floor((p.y + 0.001) / T);
    for (let c = c1; c <= c2; c++) if (wfallSolidAt(st, c, r)) { p.y = (r + 1) * T; p.vy = Math.max(0, p.vy); p.jumping = false; break; }
  }
  return p.y - y0;
}
// what p stands on right now: 'rock' 's' 'm' 'g' (tiles), 'head', 'log', or ''
function wfallGround(st, p) {
  const by = p.y + p.h, r = Math.floor((by + 1) / T), top = r * T;
  if (Math.abs(by - top) < 1.5) {
    let best = '';
    const c1 = Math.floor((p.x + 0.01) / T), c2 = Math.floor((p.x + p.w - 0.01) / T);
    for (let c = c1; c <= c2; c++) { const ch = wfallCell(st, c, r); if (WFALL_SOLID.includes(ch)) { if (ch === '#' || ch === 'g' || !best) best = ch; } }
    if (best) return best;
  }
  const o = other(p), O = st.pl[o.id];
  if (o.alive && o.grounded && O.vine < 0 && !O.splash && Math.abs(by - o.y) <= 1.5 && p.x < o.x + o.w - 4 && p.x + p.w > o.x + 4) return 'head';
  for (const ln of st.lanes) if (Math.abs(by - ln.top) <= 1.5 && p.x < ln.x + ln.w - 3 && p.x + p.w > ln.x + 3) return 'log';
  return '';
}
function wfallFrogBounce(st, p, f) {
  const P = st.pl[p.id];
  p.vy = -WFALL.frogV; p.jumping = false; p.grounded = false; p.coyote = 0; p.jumpBuf = 0;
  p.sx = 0.75; p.sy = 1.3; f.sq = 1; P.landOn = 'frog';
  st.stats.frogs++;
  wfallPop(st, f.x, f.top - 20, 'Ribbit!', '#9cf06a', 17);
  Sfx.play('waterfallRibbit', p.id); rumble(p.id, 0.2, 0.4, 80);
}
// a stream or a geyser column at a box?
function wfallStreamAt(st, p) {
  const cx = p.x + p.w / 2;
  for (const s of st.streams) if (cx > s.x0 + 2 && cx < s.x1 - 2 && p.y + p.h > s.y0 && p.y < s.y1) return s;
  return null;
}
function wfallGeyserAt(st, p) {
  const cx = p.x + p.w / 2;
  for (const gy of st.geysers) if (cx > gy.x0 - 14 && cx < gy.x1 + 14 && p.y + p.h <= gy.feet + 1 && p.y + p.h > gy.top - 30) return gy;
  return null;
}
// is p standing at a vine post (on the wall's top)?
function wfallPostAt(st, p) {
  if (!p.grounded) return null;
  for (const w of st.walls) if (Math.abs(p.y + p.h - w.topFeet) < 2 && Math.abs(p.x + p.w / 2 - w.postX) < WFALL.postReach) return w;
  return null;
}

/* ---------- one player's tick ---------- */
function wfallPlayer(st, p, dt) {
  const P = st.pl[p.id], o = other(p), O = st.pl[o.id], inp = p.input;
  if (P.splash) { wfallFloatStep(st, p, dt); return; }
  if (!p.alive) return;
  if (P.vine >= 0) { wfallClimb(st, p, dt); return; }
  if (P.ride >= 0) return;   // (on a rising lift: wfallLifts moves them)
  const was = p.grounded, ground = was ? wfallGround(st, p) : '';
  const post = wfallPostAt(st, p);
  P.post = post ? post.i : -1;
  const carrying = O.onHead && o.alive;
  // a jump that can't happen: carrying someone ("Oof!")
  if (carrying && (p.pendingJump || p.jumpBuf > 0)) {
    if (P.oofCD <= 0) { P.oofCD = 2.5; wfallPop(st, p.x + p.w / 2, p.y - 18, 'Oof! Too heavy to jump', PCOL[p.id], 14); }
    p.pendingJump = false; p.jumpBuf = 0;
  }
  // physics tweaks for this player's control step
  const S = { g: PHYS.g, jumpV: PHYS.jumpV, fricG: PHYS.fricG, accG: PHYS.accG, maxFall: PHYS.maxFall };
  if (ground === 's') { PHYS.fricG = WFALL.slipFric; PHYS.accG = WFALL.slipAcc; }
  if (ground === 'm') PHYS.jumpV = WFALL.mossV;
  const vy0 = p.vy;
  try { control(p, dt); } finally { Object.assign(PHYS, S); }
  P.oofCD -= dt;
  const jumped = was && p.vy < Math.min(vy0, 0) - 50;
  if (jumped) {
    if (ground === 'm') { p.vy = -WFALL.mossV; p.jumping = false; P.mossJump = true; wfallPop(st, p.x + p.w / 2, p.y + p.h + 4, 'Boing!', '#b6f07a', 15); Sfx.play('waterfallBoing', p.id); st.stats.moss++; }
    else if (ground === 'head') P.headHop = true;
  }
  // the stream pushes down and slows you while it flows; a geyser puff lifts you
  const sm = wfallStreamAt(st, p);
  if (sm && sm.on) {
    if (p.vy < 0) p.vy = Math.min(0, p.vy + WFALL.streamKill * dt); else p.vy = Math.min(p.vy + WFALL.streamDown * dt, 1100);
    p.vx *= Math.max(0, 1 - 6 * dt);
    p.jumping = false;
    if (!p.grounded && P.washS !== sm.i) {
      P.washS = sm.i; sm.washes++; st.stats.washes++;
      wfallPop(st, p.x + p.w / 2, p.y - 10, 'Whoosh!', '#bfe9ff', 16); Sfx.play('waterfallWash', p.id);
      if (!sm.jam && sm.washes >= WFALL.jamWash) wfallGold(st, 'jam', sm);
    }
  }
  if (!sm || !sm.on || p.grounded) P.washS = -1;
  P.inStream = !!sm;
  const gy = wfallGeyserAt(st, p);
  if (gy && gy.phase === 'puff') {
    const feet = p.y + p.h, want = clamp((feet - gy.top) * 5, -160, WFALL.geyLift);
    p.vy = approach(p.vy, -want, 3200 * dt);
    p.jumping = false;
    if (!P.lifted) { P.lifted = true; wfallPop(st, p.x + p.w / 2, feet + 6, 'Whoosh!', '#e8fbff', 16); Sfx.play('waterfallGeyser', p.id); st.stats.geysers++; }
  } else P.lifted = false;
  // move: the carrier first (step() orders them), riders come along
  if (ground === 'head' && o.alive) { wfallMoveX(st, p, O.dx); }
  const xBefore = p.x;
  wfallMoveX(st, p, p.vx * dt);
  P.dx = p.x - xBefore + (ground === 'head' ? O.dx : 0);
  P.landOn = null;
  const yBefore = p.y;
  wfallMoveY(st, p, p.vy * dt);
  // the partner's head moved up or down under a rider who stays on it
  if (ground === 'head' && !jumped && o.alive && Math.abs(yBefore + p.h - o.y) > 0.01 && p.vy >= 0 && p.x < o.x + o.w - 4 && p.x + p.w > o.x + 4) {
    p.y = o.y - p.h; p.vy = 0; P.landOn = 'head';
  }
  // soft landings and moss
  const gNow = wfallGround(st, p);
  p.grounded = !!gNow; p.tileGround = !!gNow && gNow !== 'head'; p.onPartner = gNow === 'head'; p.onOneWay = false;
  P.onHead = gNow === 'head';
  P.onLog = gNow === 'log' ? wfallLaneUnder(st, p) : -1;
  if (p.grounded && !was) {
    if (gNow === 'm' && (P.landV || 0) > 260) {
      p.vy = -Math.min((P.landV || 0) * WFALL.mossSoft, 360); p.grounded = false; p.onPartner = false; P.onHead = false;
      Sfx.play('waterfallBoing', p.id);
    } else if ((P.landV || 0) > 260) { p.sx = 1.25; p.sy = 0.78; puff(p.x + p.w / 2, p.y + p.h, 5, 'rgba(255,255,255,0.75)'); Sfx.play('land'); }
    P.mossJump = false; P.headHop = false;
  }
  P.landV = 0;
}
const wfallLaneUnder = (st, p) => { for (const ln of st.lanes) if (Math.abs(p.y + p.h - ln.top) <= 1.5 && p.x < ln.x + ln.w - 3 && p.x + p.w > ln.x + 3) return ln.i; return -1; };

/* ---------- the bamboo lift, vines ---------- */
// p's feet in climb coordinates (inside the mode's step p.y already is; outside it, p.y is on screen)
const wfallFeet = (st, p) => p.y + p.h + (st.ticking ? 0 : st.camY);
// p stands on the lift's deck at the foot of wall w (ready to be hauled up)
function wfallOnDeck(st, p, w) {
  const L = w.lift, cx = p.x + p.w / 2, P = st.pl[p.id];
  return p.alive && !P.splash && P.vine < 0 && P.ride < 0 && p.grounded && Math.abs(wfallFeet(st, p) - w.baseFeet) < 2 && cx > L.x0 - 6 && cx < L.x1 + 6;
}
// p stands at wall w's lever
function wfallAtLever(st, p, w) {
  const P = st.pl[p.id];
  return p.alive && !P.splash && P.vine < 0 && p.grounded && Math.abs(wfallFeet(st, p) - w.baseFeet) < 2 && Math.abs(p.x + p.w / 2 - w.lift.leverX) < WFALL.leverR;
}
function wfallLiftGo(st, p, w) {
  const L = w.lift, o = other(p), O = st.pl[o.id];
  if (L.phase !== 'down') return;
  L.phase = 'up'; L.t = 0; L.pullT = 0.5; L.rider = -1; L.puller = p.id;
  Sfx.play('waterfallLever', p.id);
  if (wfallOnDeck(st, o, w)) {
    L.rider = o.id; O.ride = w.i; o.vx = 0; o.vy = 0; O.onHead = false;
    wfallPop(st, o.x + o.w / 2, o.y - 16, 'Going up!', PCOL[p.id], 16);
    rumble(o.id, 0.2, 0.4, 90);
  }
}
// the lifts: up with the rider, a step onto the ledge at the top, then back down
function wfallLifts(st, dt) {
  for (const w of st.walls) {
    const L = w.lift;
    L.pullT = Math.max(0, L.pullT - dt);
    if (L.phase === 'down') continue;
    const full = w.baseFeet - w.topFeet;
    L.t += dt;
    if (L.phase === 'up') {
      L.h = Math.min(full, L.h + WFALL.liftV * dt);
      if (L.h >= full) { L.phase = 'top'; L.t = 0; Sfx.play('waterfallThunk'); }
    } else if (L.phase === 'top') {
      if (L.rider < 0 && L.t >= 0.6) { L.phase = 'sink'; L.t = 0; }
    } else if (L.phase === 'sink') {
      L.h = Math.max(0, L.h - WFALL.sinkV * dt);
      if (L.h <= 0) { L.phase = 'down'; L.t = 0; }
    }
    if (L.rider < 0) continue;
    const q = G.players[L.rider], Q = st.pl[q.id], sx = (L.x0 + L.x1) / 2 - q.w / 2;
    if (!q.alive || Q.splash) { L.rider = -1; Q.ride = -1; continue; }
    q.vx = 0; q.vy = 0; q.grounded = true; q.jumping = false; q.face = w.side;
    if (L.phase === 'up' || (L.phase === 'top' && L.t <= 0)) { q.x = sx; q.y = w.baseFeet - L.h - q.h; continue; }
    const lx = w.side > 0 ? w.faceX + 4 : w.faceX - 4 - q.w, k = clamp(L.t / WFALL.stepT, 0, 1), e = k * k * (3 - 2 * k);
    q.x = sx + (lx - sx) * e; q.y = w.topFeet - q.h - Math.sin(Math.PI * k) * 10;
    if (k >= 1) {
      q.x = lx; q.y = w.topFeet - q.h; q.sx = 0.8; q.sy = 1.2; Q.ride = -1; L.rider = -1;
      st.stats.lifts[L.puller]++;
      wfallPop(st, q.x + q.w / 2, q.y - 16, 'Up!', C.gold, 20); Sfx.play('waterfallUp', q.id);
      L.phase = 'sink'; L.t = 0;
    }
  }
}
function wfallAct(st, p) {
  const P = st.pl[p.id];
  if (!p.pendingAct) return;
  p.pendingAct = false;
  if (!p.alive || P.splash || st.phase !== 'play') return;
  const w = P.post >= 0 ? st.walls[P.post] : null;
  if (!w) {
    // at a lever: send the lift up
    for (const lw of st.walls) if (wfallAtLever(st, p, lw)) { wfallLiftGo(st, p, lw); return; }
    return;
  }
  if (w) {
    if (!w.down) {
      w.down = true; w.flash = 1;
      st.stats.vines[p.id]++;
      wfallPop(st, w.postX, w.topFeet - 52, 'Vine down!', '#9be86a', 18);
      Sfx.play('waterfallVine', p.id);
    } else wfallPop(st, w.postX, w.topFeet - 52, 'Heave!', PCOL[p.id], 15);
  }
}
// grab a lowered vine: ▲, or jump into it
function wfallGrab(st, p) {
  const P = st.pl[p.id];
  if (!p.alive || P.splash || P.vine >= 0 || P.ride >= 0) return;
  if (!(p.input.up || (!p.grounded && p.input.jump) || p.pendingJump && !p.grounded)) return;
  if (P.grabCD > 0) return;
  const cx = p.x + p.w / 2, feet = p.y + p.h;
  for (const w of st.walls) {
    if (!w.down || w.roll < 0.95) continue;
    if (Math.abs(cx - w.vineX) > WFALL.vineReach || feet > w.baseFeet + 1 || p.y > w.baseFeet - 4 || feet < w.topFeet + 8) continue;
    P.vine = w.i; p.vx = 0; p.vy = 0; p.jumping = false; p.pendingJump = false; p.jumpBuf = 0; p.grounded = false;
    p.x = w.vineX - p.w / 2;
    Sfx.play('waterfallGrab', p.id);
    return;
  }
}
function wfallClimb(st, p, dt) {
  const P = st.pl[p.id], w = st.walls[P.vine], inp = p.input, o = other(p), O = st.pl[o.id];
  const heave = o.alive && !O.splash && O.post === w.i && o.input.act;
  w.heave = approach(w.heave, heave ? 1 : 0, dt * 6);
  const v = WFALL.climbV * (heave ? WFALL.heave : 1);
  // ▲ climbs: the stick (controller), or the jump key / button held (keyboard W and ↑ and touch ▲ are jump keys)
  const upHeld = inp.up || (inp.jump && !inp.down);
  const dir = (upHeld ? -1 : 0) + (inp.down ? 1 : 0) + (heave && !inp.down ? -0.6 : 0);
  p.x = w.vineX - p.w / 2; p.vx = 0;
  P.climbDir = dir;
  if (dir) { p.y += clamp(dir, -1.6, 1) * v * dt; P.climbT += dt; }
  // hop off: jump while holding ◀ or ▶ away from the wall (a plain jump press just climbs)
  const away = w.side > 0 ? inp.left : inp.right;
  if (p.pendingJump && !away) p.pendingJump = false;
  if (p.pendingJump) {
    p.pendingJump = false; P.vine = -1; P.grabCD = 0.35;
    p.vy = -380; p.vx = -w.side * 150; p.grounded = false; p.jumping = false;
    Sfx.play('jump', p.id);
    return;
  }
  const feet = p.y + p.h;
  if (feet >= w.baseFeet) { p.y = w.baseFeet - p.h; p.x = w.boostX - p.w / 2; P.vine = -1; P.grabCD = 0.3; p.grounded = true; return; }   // (clear of the wall face: 1 px of overlap let jump taps climb the bare wall)
  if (feet <= w.topFeet + 6) {
    // over the top: step onto the ledge
    P.vine = -1; P.grabCD = 0.4;
    p.y = w.topFeet - p.h; p.vy = 0; p.grounded = true;
    p.x = w.side > 0 ? w.faceX + 4 : w.faceX - 4 - p.w;
    p.sx = 1.2; p.sy = 0.8;
    wfallPop(st, p.x + p.w / 2, p.y - 16, 'Up!', C.gold, 18); Sfx.play('waterfallUp', p.id);
    st.stats.climbs[p.id]++;
  }
}

/* ---------- splashes and the team checkpoint ---------- */
function wfallSplash(st, p, why) {
  const P = st.pl[p.id];
  if (!p.alive || P.splash) return;
  const cp = st.cps[st.cp], spot = cp.spots[p.id], cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  P.splash = { t: 0, x0: cx, y0: cy, x1: spot.x + PW / 2, y1: spot.y + PH / 2 };
  P.vine = -1; P.ride = -1; P.onHead = false; P.onLog = -1;
  for (const w of st.walls) if (w.lift.rider === p.id) w.lift.rider = -1;
  p.alive = false;
  st.stats.splash[p.id]++; st.roomSplash++;
  wfallPop(st, cx, cy - 18, 'Splash!', '#bfe9ff', 22);
  for (let i = 0; i < 18; i++) G.particles.push({ x: cx, y: cy, vx: (Math.random() - 0.5) * 260, vy: -80 - Math.random() * 260, life: 0.8, max: 0.8, col: i % 3 ? '#bfe9ff' : '#ffffff', size: 3 + Math.random() * 4, grav: 700, kind: 'dot' });
  Sfx.play('waterfallSplash', p.id); rumble(p.id, 0.5, 0.5, 160);
  if (why === 'pool') {
    const ln = st.lanes.find(l => cx > l.x0 - 10 && cx < l.x1 + 10 && Math.abs(p.y + p.h - l.top) < 60);
    if (ln) { ln.splashes++; if (!ln.gold && ln.splashes >= WFALL.raftSplash) wfallGold(st, 'raft', ln); }
  }
}
// a mist bubble floats the splashed player back to the team checkpoint
function wfallFloatStep(st, p, dt) {
  const P = st.pl[p.id], s = P.splash;
  s.t += dt;
  p.pendingJump = false; p.pendingAct = false;
  if (s.t < WFALL.float) return;
  const cp = st.cps[st.cp], spot = cp.spots[p.id], input = p.input;
  Object.assign(p, { x: spot.x, y: spot.y, vx: 0, vy: 0, alive: true, grounded: false, jumping: false, jumpBuf: 0, pendingJump: false, coyote: 0, stun: 0, sx: 0.6, sy: 1.4, carryVx: 0, offT: 0, knockT: 0, input });
  p.pendingAct = false; p.downLatch = true;
  P.splash = null; P.washS = -1; P.actLatch = true;
  wfallPop(st, spot.x + PW / 2, spot.y - 14, 'Pop!', '#bfe9ff', 16);
  for (let i = 0; i < 10; i++) G.particles.push({ x: spot.x + PW / 2, y: spot.y + PH / 2, vx: (Math.random() - 0.5) * 140, vy: (Math.random() - 0.5) * 140, life: 0.5, max: 0.5, col: '#e8fbff', size: 3 + Math.random() * 3, grav: 0, kind: 'dot' });
  Sfx.play('waterfallPop', p.id);
}
function wfallHazards(st, p) {
  if (!p.alive) return;
  const P = st.pl[p.id];
  // water (~) round the feet
  const c1 = Math.floor((p.x + 3) / T), c2 = Math.floor((p.x + p.w - 3) / T), r = Math.floor((p.y + p.h - 6) / T);
  for (let c = c1; c <= c2; c++) if (wfallCell(st, c, r) === '~') { wfallSplash(st, p, 'pool'); return; }
  // too far below the team checkpoint
  if (P.vine < 0 && p.y + p.h > st.cps[st.cp].feet + WFALL.splashBelow * T && p.vy > 0) wfallSplash(st, p, 'fall');
}
function wfallCheckpoints(st) {
  for (const p of G.players) {
    if (!p.alive || !p.grounded) continue;
    const feet = p.y + p.h, cx = p.x + p.w / 2;
    st.cps.forEach((cp, i) => {
      if (i <= st.cp || cp.by[p.id]) return;
      if (Math.abs(feet - cp.feet) < 3 && Math.abs(cx - cp.x) < WFALL.cpReach * T) { cp.by[p.id] = true; cp.wave = 1; Sfx.play('waterfallTouch', p.id); }
    });
  }
  for (let i = st.cps.length - 1; i > st.cp; i--) {
    const cp = st.cps[i];
    if (!cp.by[0] || !cp.by[1]) continue;
    st.cp = i; cp.lit = true; cp.wave = 1;
    st.progressT = 0;
    wfallPop(st, cp.x, cp.feet - 70, 'Checkpoint!', C.grass, 18);
    Sfx.play('waterfallCp'); burst(cp.x, cp.feet - 50, C.grass, 14);
    for (const w of st.walls) if (w.topFeet >= cp.feet - 2 && !w.done) w.done = true;
    break;
  }
}
// walls both players have stood on top of are done (and roll their vine back up a bit later? no: vines stay)
function wfallWalls(st, dt) {
  for (const w of st.walls) {
    w.roll = approach(w.roll, w.down ? 1 : 0, dt / WFALL.vineRoll);
    w.flash = Math.max(0, w.flash - dt * 2);
    w.sway += dt;
    for (const p of G.players) if (p.alive && p.grounded && Math.abs(p.y + p.h - w.topFeet) < 2 && (w.side > 0 ? p.x + p.w / 2 > w.faceX : p.x + p.w / 2 < w.faceX)) {
      if (!w.up[p.id]) { w.up[p.id] = true; st.progressT = 0; }
    }
    if (!w.done && w.up[0] && w.up[1]) w.done = true;
  }
}

/* ---------- streams, logs, geysers, frogs ---------- */
function wfallWorld(st, dt) {
  for (const s of st.streams) {
    const off = s.off * (s.jam ? 1.6 : 1), cyc = s.flow + off;
    s.t = (s.t + dt) % cyc;
    s.on = s.t < s.flow;
    // k: how much water (1 full, 0 none): it thins while the log rolls in and comes back in the warning before it flows
    s.k = s.on ? Math.min(1, 0.25 + s.t / 0.3) : s.t < s.flow + 0.3 ? 1 - (s.t - s.flow) / 0.3 : s.t > cyc - WFALL.warn ? 0.18 * (1 - (cyc - s.t) / WFALL.warn) : 0;
    s.left = s.on ? s.flow - s.t : 0;             // seconds of water left
    s.dryLeft = s.on ? 0 : cyc - s.t;             // seconds of dry left
  }
  for (const ln of st.lanes) {
    const w = (ln.gold ? WFALL.raftW : WFALL.logW) * T, sp = ln.speed * (ln.gold ? 0.7 : 1);
    ln.w = w; ln.bob += dt;
    let dx = 0;
    if (ln.pause > 0) ln.pause -= dt;
    else {
      dx = ln.dir * sp * dt;
      const nx = clamp(ln.x + dx, ln.x0, ln.x1 - w);
      dx = nx - ln.x; ln.x = nx;
      if (ln.x <= ln.x0 + 0.01 || ln.x >= ln.x1 - w - 0.01) { ln.dir *= -1; ln.pause = WFALL.logPause * (ln.gold ? 1.6 : 1); }
    }
    ln.dx = dx;
    // riders come along
    if (dx) for (const p of G.players) if (p.alive && st.pl[p.id].onLog === ln.i && p.grounded) {
      const q = other(p), onHead = q.alive && q.grounded && st.pl[q.id].onLog !== ln.i && wfallGround(st, q) === 'head';
      wfallMoveX(st, p, dx);
      if (onHead) wfallMoveX(st, q, dx);   // (a rider on this one's head comes too)
    }
  }
  for (const gy of st.geysers) {
    const idle = WFALL.geyIdle * (st.goldMist ? 0.7 : 1), puffT = WFALL.geyPuff, cyc = idle + WFALL.geyWarn + puffT;
    gy.t = (gy.t + dt) % cyc;
    const was = gy.phase;
    gy.phase = gy.t < idle ? 'idle' : gy.t < idle + WFALL.geyWarn ? 'warn' : 'puff';
    gy.left = gy.phase === 'puff' ? cyc - gy.t : 0;
    gy.untilPuff = gy.phase === 'puff' ? 0 : idle + WFALL.geyWarn - gy.t;
    gy.k = approach(gy.k, gy.phase === 'puff' ? 1 : 0, dt * (gy.phase === 'puff' ? 6 : 2));
    if (gy.phase === 'puff' && was !== 'puff' && wfallOnScreen(st, gy.feet)) Sfx.play('waterfallPuff');
  }
  for (const f of st.frogs) { f.sq = Math.max(0, f.sq - dt * 3); f.blink -= dt; if (f.blink < -3 - (f.ph % 2)) f.blink = 0.15; }
}
const wfallOnScreen = (st, y) => y > st.camY - 60 && y < st.camY + H + 60;

/* ---------- help: gold, Tico the toucan, news ---------- */
function wfallGold(st, kind, thing) {
  if (kind === 'jam') { thing.jam = true; wfallNews(st, 'Big log jam! The water stays off longer', true); }
  else if (kind === 'raft') { thing.gold = true; wfallNews(st, 'Gold raft! A bigger, slower log', true); }
  st.goldUsed.push(kind);
  Sfx.play('waterfallGold');
  st.tico.say = { jam: 'I jammed the log!', raft: 'Big raft for you!' }[kind]; st.tico.sayT = 2.6;
}
function wfallNews(st, s, gold, life) { st.news = { s, gold: !!gold, t: 0, life: life || WFALL.newsLife }; }
function wfallPop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || C.gold, size: size || 18, t: 0 }); }

/* ---------- the route: where each player is and what comes next (hints, Tico and the computer read it) ---------- */
// the route step whose ledge p stands on (or -1)
function wfallStepAt(st, p) {
  const feet = p.y + p.h, cx = p.x + p.w / 2;
  for (const s of st.route) if (Math.abs(feet - s.feet) < 3 && cx > s.x0 && cx < s.x1) return s.i;
  return -1;
}
// each player's route step, kept while they are in the air or on the vine
function wfallTrack(st) {
  for (const p of G.players) {
    const P = st.pl[p.id];
    if (!p.alive) continue;
    if (P.vine >= 0 || P.ride >= 0) { const w = st.walls[P.vine >= 0 ? P.vine : P.ride]; const s = st.route.findIndex(r => r.go === 'wall' && r.wall === w.i); if (s >= 0) P.step = s; continue; }
    if (!p.grounded || P.onHead) { if (P.onHead) { const o = other(p); const so = st.pl[o.id].step; if (so >= 0) P.step = so; } continue; }
    const s = wfallStepAt(st, p);
    if (s >= 0) { if (s > P.best) { P.best = s; st.progressT = 0; } P.step = s; }
  }
}
// the job of player id at the route step: what the hint chip says
function wfallJob(st, id) {
  const p = G.players[id], o = G.players[1 - id], P = st.pl[id], O = st.pl[1 - id];
  if (!p.alive) return null;
  const s = st.route[P.step];
  if (P.vine >= 0) return { k: 'climb' };
  if (!s) return null;
  const nm = NAMES[1 - id];
  if (P.ride >= 0) return { k: 'riding' };
  // stacked up away from a wall: the carrier can't jump, so the one on top steps off
  if (s.go !== 'wall' && P.onHead) return { k: 'hopOff' };
  if (s.go !== 'wall' && O.onHead && o.alive) return { k: 'carry' };
  if (s.go === 'wall') {
    const w = st.walls[s.wall];
    const oStep = O.step, oUp = o.alive && oStep > P.step;
    if (oUp) return w.down ? { k: 'grab', w } : { k: 'waitVine', w };
    if (O.vine >= 0 || O.ride >= 0 || w.lift.phase !== 'down') return { k: 'none' };
    if (oStep !== P.step) return { k: 'waitFriend', w };
    // who pulls the lever: the computer by default in 1-player mode; with two people, Pip on even walls. Whoever is
    // already in a spot keeps it.
    if (wfallOnDeck(st, o, w)) return wfallAtLever(st, p, w) ? { k: 'pull', w } : { k: 'lever', w };
    if (wfallAtLever(st, o, w)) return wfallOnDeck(st, p, w) ? { k: 'onDeck', w } : { k: 'deck', w };
    const puller = wfallSolo() ? (cpuOn(id) ? id : 1 - id) : (w.i % 2 === 0 ? 0 : 1);
    if (puller === id) return { k: 'lever', w };
    return wfallOnDeck(st, p, w) ? { k: 'onDeck', w } : { k: 'deck', w };
  }
  // on top of a wall the partner hasn't climbed yet
  const prevWall = st.route.slice(0, P.step).reverse().find(r => r.go === 'wall');
  if (prevWall) {
    const w = st.walls[prevWall.wall];
    if (!w.done && O.step === prevWall.i && o.alive) return w.down ? (O.vine >= 0 ? { k: 'heave', w } : { k: 'waitClimb', w }) : { k: 'lower', w };
  }
  if (s.go === 'jump') return { k: s.stream != null ? 'stream' : s.say || 'jump', s };
  return { k: s.go, s };
}
function wfallJobText(st, id, j) {
  const nm = NAMES[1 - id], cpu = wfallCpu(1 - id), act = wfallKey(id, 'act'), dn = wfallKey(id, 'down'), up = wfallKey(id, 'up');
  const d = wfallDev(id), hold = k => (d === 'pad' ? 'hold the ' + k : 'hold ' + k);
  switch (j.k) {
    case 'lever': return ['Go to the bamboo lever', nm + ' rides the lift up'];
    case 'pull': return ['Pull the lever: press ' + act, nm + ' is on the lift'];
    case 'deck': return ['Stand on the bamboo lift', cpu ? nm + ' pulls the lever' : nm + ' pulls the lever'];
    case 'onDeck': return [cpu ? 'Hold on: ' + nm + ' pulls the lever' : 'Wait for ' + nm + ' to pull the lever', ''];
    case 'riding': return ['Going up!', ''];
    case 'waitFriend': return ['Wait here for ' + nm, ''];
    case 'hopOff': return ['Hop off ' + nm + '’s head', nm + ' can’t jump with you up there'];
    case 'carry': return [nm + ' is riding on your head', 'You can’t jump while carrying'];
    case 'lower': return ['Drop the vine: press ' + act + ' at the post', nm + ' is waiting below'];
    case 'waitClimb': return [nm + ' climbs the vine', 'Hold ' + act + ' at the post to heave'];
    case 'heave': return ['Hold ' + act + ': heave ' + nm + ' up!', ''];
    case 'waitVine': return [cpu ? nm + ' drops the vine' : 'Wait: ' + nm + ' drops the vine', ''];
    case 'grab': return ['Grab the vine: press ' + up, 'Hold ' + up + ' to climb'];
    case 'climb': return ['Hold ' + up + ' to climb', ''];
    case 'stream': return ['Wait till the log stops the water', 'then hop up the stones'];
    case 'log': return ['Ride the log across!', 'Hop on when it comes close'];
    case 'geyser': return ['Stand on the geyser: whoosh!', 'Steer onto the ledge at the top'];
    case 'frog': return ['Bounce on the frog!', 'Ribbit! Steer onto the ledge'];
    case 'moss': return ['Jump on the springy moss!', 'It throws you extra high'];
    case 'slip': return ['Wet rocks: slippery!', 'Small steps, then hop up'];
    case 'nest': return ['Both to the toucan nest!', ''];
    default: return null;
  }
}

/* ---------- the camera ---------- */
function wfallCamera(st, dt, snap) {
  const ys = G.players.map(p => { const P = st.pl[p.id]; return P.splash ? { top: P.splash.y0 - 20, feet: P.splash.y0 + 20 } : { top: p.y, feet: p.y + p.h }; });
  const lowFeet = Math.max(ys[0].feet, ys[1].feet), highTop = Math.min(ys[0].top, ys[1].top);
  let ty = (lowFeet + highTop) / 2 - H * 0.5 - 20;
  ty = Math.min(ty, highTop - WFALL.camTopMargin);              // the higher one below the HUD...
  ty = Math.max(ty, lowFeet + WFALL.camBotMargin - H);         // ...but the lower one always on screen
  ty = clamp(ty, 0, st.WH - H);
  if (st.phase === 'won') ty = clamp(st.nest.feet - H * 0.62, 0, st.WH - H);
  st.camY = snap ? ty : st.camY + (ty - st.camY) * Math.min(1, dt * 4.5);
}

/* ---------- "Wait for me!": nobody climbs further than maxSep above the partner ---------- */
function wfallLeash(st, yb) {
  const [a, b] = G.players;
  if (!a.alive || !b.alive) return;
  const fa = a.y + a.h, fb = b.y + b.h, up = fa < fb ? a : b, lo = up === a ? b : a, lim = WFALL.maxSep * T;
  if ((lo.y + lo.h) - (up.y + up.h) <= lim) return;
  const U = st.pl[up.id];
  if (up.y < yb[up.id]) { up.y = Math.max(up.y, yb[up.id]); if (up.vy < 0) up.vy = 0; U.climbDir = 0; }
  if (U.waitCD <= 0) {
    U.waitCD = 3.5;
    wfallPop(st, up.x + up.w / 2, up.y - 22, 'Wait for me!', PCOL[lo.id], 16);
    if (typeof cpuSay === 'function' && cpuOn(lo.id)) cpuSay(lo, 'Wait for me!');
  }
}

/* ---------- the tick (ownStep) ---------- */
function wfallStep(st, dt) {
  const ps = G.players;
  // climb coordinates for the step
  for (const p of ps) p.y += st.camY;
  const n0 = G.particles.length;
  st.ticking = true;
  try { wfallTick(st, dt); } finally {
    st.ticking = false;
    for (const p of ps) p.y -= st.camY;
    for (let i = n0; i < G.particles.length; i++) G.particles[i].y -= st.camY;
  }
}
function wfallTick(st, dt) {
  const ps = G.players;
  st.tick++;
  if (st.phase === 'won') {
    st.winT += dt;
    for (const p of ps) { p.pendingAct = false; p.pendingJump = false; }
    if (st.winT < 2.2 && st.tick % 12 === 0) confetti(st.nest.x, st.nest.feet - 40);
    wfallCamera(st, dt);
    st.pops = st.pops.filter(q => (q.t += dt) < 1.4);
    if (st.winT >= WFALL.winHold) levelClear();
    return;
  }
  if (G.introT > WFALL.introHold) { for (const p of ps) { p.pendingAct = false; p.pendingJump = false; } wfallCamera(st, dt); return; }
  st.time += dt; st.progressT += dt;
  wfallWorld(st, dt);
  for (const p of ps) { const P = st.pl[p.id]; P.grabCD -= dt; P.waitCD -= dt; P.pushT = Math.max(0, P.pushT - dt); }
  for (const p of ps) wfallGrab(st, p);
  wfallLifts(st, dt);
  const yb = ps.map(p => p.y);
  // the carrier moves first, then whoever stands on them
  const order = st.pl[0].onHead ? [ps[1], ps[0]] : [ps[0], ps[1]];
  for (const p of order) { st.pl[p.id].dx = 0; wfallPlayer(st, p, dt); }
  wfallLeash(st, yb);
  for (const p of ps) wfallAct(st, p);
  // the action's word: the vine (then heave on it) at a vine post up top, else the lift lever
  setActWords(ps.map(p => { const P = st.pl[p.id], w = P.post >= 0 ? st.walls[P.post] : null; return w ? (w.down ? 'heave' : 'vine') : 'lever'; }));
  for (const p of ps) wfallHazards(st, p);
  wfallWalls(st, dt);
  wfallCheckpoints(st);
  wfallTrack(st);
  wfallItems(st);
  wfallSection(st);
  wfallHelp(st, dt);
  wfallCamera(st, dt);
  st.pops = st.pops.filter(q => (q.t += dt) < 1.4);
  if (st.news) { st.news.t += dt; if (st.news.t > st.news.life) st.news = null; }
  // the top: both by the nest
  const n = st.nest;
  if (n && ps.every(p => p.alive && p.grounded && Math.abs(p.y + p.h - n.feet) < 3 && Math.abs(p.x + p.w / 2 - n.x) < WFALL.nestReach * T)) wfallWin(st);
}
function wfallItems(st) {
  for (const p of G.players) {
    if (!p.alive) continue;
    for (const gm of st.gems) if (!gm.got && rectHit(p, gm.x - 12, gm.y - 12, 24, 24)) {
      gm.got = true; gm.pop = 1; st.stats.gems++;
      Sfx.play('waterfallGem'); burst(gm.x, gm.y, '#9ff3ff', 10);
      wfallPop(st, gm.x, gm.y - 16, 'Gem!', '#9ff3ff', 15);
    }
  }
  for (const gm of st.gems) gm.pop = Math.max(0, gm.pop - 1 / 60);
  for (const cp of st.cps) cp.wave = Math.max(0, cp.wave - 1 / 90);
}
function wfallSection(st) {
  const f = st.cps[st.cp].feet;
  let k = 0;
  st.sections.forEach((s, i) => { if (f <= s.feet + 2) k = i; });
  if (k !== st.section) {
    st.section = k;
    wfallNews(st, 'Section ' + (k + 1) + ' of ' + st.sections.length + ': ' + st.sections[k].name + '!', false, 3.2);
    Sfx.play('waterfallSection');
  }
}
function wfallHelp(st, dt) {
  const tc = st.tico;
  tc.t += dt; if (tc.sayT > 0) tc.sayT -= dt;
  // Tico flies over to whoever is behind, with a hint, after a while with no progress
  let focus = null;
  if (st.progressT > WFALL.ticoAfter) {
    const lag = [0, 1].sort((a, b) => st.pl[a].best - st.pl[b].best)[0], p = G.players[lag];
    const j = wfallJob(st, lag) || wfallJob(st, 1 - lag);
    if (p.alive && j) focus = { x: p.x + p.w / 2 + (p.x > W / 2 ? -70 : 70), y: p.y - 70, id: lag, j };
  }
  tc.on = !!focus;
  if (focus) {
    tc.hint = wfallCpu(focus.id) ? '' : (wfallJobText(st, focus.id, focus.j) || [''])[0];
    tc.face = focus.x > tc.x ? 1 : -1;
    tc.x += (focus.x - tc.x) * Math.min(1, dt * 1.6); tc.y += (focus.y + Math.sin(tc.t * 3) * 6 - tc.y) * Math.min(1, dt * 1.6);
    if (Math.floor(tc.t / 5) !== Math.floor((tc.t - dt) / 5)) Sfx.play('waterfallTico');
  } else if (tc.sayT <= 0) { tc.x += (W + 80 - tc.x) * Math.min(1, dt); tc.y += (st.camY + 60 - tc.y) * Math.min(1, dt); }
  else { tc.x += (W - 140 - tc.x) * Math.min(1, dt * 2); tc.y += (st.camY + 150 - tc.y) * Math.min(1, dt * 2); }
}
function wfallWin(st) {
  st.phase = 'won'; st.winT = 0;
  st.stats.time = G.time;
  Sfx.play('waterfallWin'); rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250);
  wfallPop(st, st.nest.x, st.nest.feet - 90, 'Treasure!', C.gold, 26);
  for (let i = 0; i < 50; i++) confetti(st.nest.x, st.nest.feet - 40);
  st.tico.say = 'You made it! Thank you!'; st.tico.sayT = 3.4;
}

/* ---------- drawing ---------- */
const WFALL_ROCK = { top: '#7fd65a', topDark: '#3f9a3c' };
function wfallDrawBack(st, t) {
  const cy = st.camY, k = cy / Math.max(1, st.WH - H);   // 0 at the top of the climb, 1 at the bottom
  // sky: warmer gold-green at the top of the climb, deeper green lower down
  const gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, k < 0.3 ? '#a8e0b8' : C.skyTop); gr.addColorStop(1, k < 0.3 ? '#fff6c8' : '#cfe8b0');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  // the sun peeks over the top near the end
  if (cy < 900) { ctx.globalAlpha = 1 - cy / 900; ctx.fillStyle = C.sunGlow; circle(780, 80 - cy * 0.2, 70); ctx.fill(); ctx.fillStyle = C.sun; circle(780, 80 - cy * 0.2, 44); ctx.fill(); ctx.globalAlpha = 1; }
  // far jungle cliffs (slow parallax)
  const par = cy * 0.25;
  ctx.fillStyle = '#5fae6e';
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let y = H; y >= -20; y -= 30) { const u = y + par; ctx.lineTo(170 + Math.sin(u / 90) * 30 + Math.sin(u / 37) * 10, y); }
  ctx.lineTo(0, -20); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W, H);
  for (let y = H; y >= -20; y -= 30) { const u = y + par + 300; ctx.lineTo(W - 170 - Math.sin(u / 85) * 30 - Math.sin(u / 41) * 12, y); }
  ctx.lineTo(W, -20); ctx.closePath(); ctx.fill();
  // a lit rim along each far cliff, rock ledges and round tree crowns clinging to them
  ctx.strokeStyle = 'rgba(220,255,200,0.35)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); for (let y = H; y >= -20; y -= 30) { const u = y + par; ctx.lineTo(170 + Math.sin(u / 90) * 30 + Math.sin(u / 37) * 10 - 1.5, y); } ctx.stroke();
  ctx.beginPath(); for (let y = H; y >= -20; y -= 30) { const u = y + par + 300; ctx.lineTo(W - 170 - Math.sin(u / 85) * 30 - Math.sin(u / 41) * 12 + 1.5, y); } ctx.stroke();
  for (let i = -1; i < 8; i++) {
    const row = Math.floor(par / 110) + i, y = row * 110 - par, h = hash(row, 17);
    if (y < -60 || y > H + 60) continue;
    for (const side of [0, 1]) {
      const u = y + par + (side ? 300 : 0), ex = side ? W - 170 - Math.sin(u / 85) * 30 - Math.sin(u / 41) * 12 : 170 + Math.sin(u / 90) * 30 + Math.sin(u / 37) * 10;
      const tx = side ? ex + 20 + (h % 50) : ex - 20 - (h % 50);
      ctx.fillStyle = '#4f9e60'; circle(tx, y, 18 + (h % 8)); ctx.fill(); circle(tx + 16, y + 6, 13); ctx.fill(); circle(tx - 15, y + 7, 12); ctx.fill();
      ctx.fillStyle = 'rgba(200,255,190,0.25)'; circle(tx - 5, y - 8, 7); ctx.fill();
    }
  }
  // the big waterfall behind it all
  const x0 = 330, x1 = 640;
  const wg = ctx.createLinearGradient(x0, 0, x1, 0);
  wg.addColorStop(0, 'rgba(160,220,240,0.55)'); wg.addColorStop(0.5, 'rgba(210,244,255,0.7)'); wg.addColorStop(1, 'rgba(160,220,240,0.55)');
  ctx.fillStyle = wg; ctx.fillRect(x0, 0, x1 - x0, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  const fall = reduceMotion ? 0 : t * 260;
  for (let i = 0; i < 16; i++) {
    const x = x0 + 12 + i * 19 + Math.sin(i * 2.3) * 4, len = 40 + (hash(i, 3) % 50), gap = 90 + (hash(i, 7) % 60);
    for (let y = ((fall + hash(i, 1) % 200 - cy * 0.5) % (len + gap)) - len - gap; y < H; y += len + gap) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len); ctx.stroke(); }
  }
  ctx.lineCap = 'butt';
  // mist at the very bottom of the climb
  const by = st.WH - cy;
  if (by < H + 80) { const mg = ctx.createLinearGradient(0, by - 120, 0, by); mg.addColorStop(0, 'rgba(255,255,255,0)'); mg.addColorStop(1, 'rgba(255,255,255,0.6)'); ctx.fillStyle = mg; ctx.fillRect(0, by - 120, W, 120); }
  // hanging jungle vines and leaves on the sides (parallax)
  for (let i = 0; i < 7; i++) {
    const vx = i < 4 ? 40 + i * 28 : W - 40 - (i - 4) * 30, len = 80 + (hash(i, 9) % 90);
    const vy = ((i * 211 - cy * 0.6) % 700 + 700) % 700 - 120;
    ctx.strokeStyle = '#3f8f55'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(vx, vy); ctx.quadraticCurveTo(vx + 8, vy + len / 2, vx, vy + len); ctx.stroke();
    ctx.fillStyle = '#4fae5e'; for (let k2 = 0; k2 < 4; k2++) { ctx.beginPath(); ctx.ellipse(vx + (k2 % 2 ? 6 : -6), vy + 16 + k2 * len / 4, 7, 3.5, k2 % 2 ? 0.5 : -0.5, 0, Math.PI * 2); ctx.fill(); }
  }
}
// (rich props pass, Nov 2026) the still rock is painted once per band of 6 rows into a cached picture (with all the
// new detail); only the drips on wet rock and the pools are drawn live
let wfallRichN = 0;
const WFALL_BAND = 6;
function wfallDrawTiles(st, t) {
  const r0 = Math.max(0, Math.floor(st.camY / T) - 1), r1 = Math.min(st.N - 1, Math.floor((st.camY + H) / T) + 1);
  const key = st.wfRich || (st.wfRich = 'wfb' + (++wfallRichN) + '|');
  for (let b = Math.floor(r0 / WFALL_BAND); b * WFALL_BAND <= r1; b++) {
    const ra = b * WFALL_BAND, rb = Math.min(st.N - 1, ra + WFALL_BAND - 1);
    CK.pic(key + b, W, (rb - ra + 1) * T + 28, 0, 14, () => {
      ctx.translate(0, -ra * T);
      for (let r = ra; r <= rb; r++) for (let c = 0; c < COLS; c++) {
        const ch = st.grid[r][c];
        if (ch === '#' || ch === 's' || ch === 'g' || ch === 'm') { wfallDrawRock(st, ch, c, r, c * T, r * T, 0, true); wfallRockRich(st, ch, c, r, c * T, r * T); }
      }
    }, 0, ra * T);
  }
  for (let r = r0; r <= r1; r++) for (let c = 0; c < COLS; c++) {
    const ch = st.grid[r][c], x = c * T, y = r * T;
    if (ch === 's') { if (!reduceMotion) { const h = hash(c, r), d = ((t * 0.9 + h % 10 / 10) % 1); ctx.fillStyle = 'rgba(190,235,255,' + (0.7 * (1 - d)).toFixed(2) + ')'; circle(x + 8 + (h % 14), y + T + d * 14, 2); ctx.fill(); } }
    else if (ch === '~') wfallDrawPool(st, c, r, x, y, t);
  }
}
// the cliff's extra detail: layered strata with a lit lip, pits, pebbles set in the rock, roots and ferns hanging
// from overhangs, blades and clover along grassy tops, a dark outline where rock meets air, and wet streaks on the
// slippery stone
function wfallRockRich(st, ch, c, r, x, y) {
  const open = (dc, dr) => !wfallSolidAt(st, c + dc, r + dr), h = CK.r(c * 7, r + 3), h2 = CK.r(r * 3, c + 9);
  const up = open(0, -1) && wfallCell(st, c, r - 1) !== '~', dn = open(0, 1), lf = c > 0 && open(-1, 0), rt = c < COLS - 1 && open(1, 0);
  if (ch === 's') {
    // wet stone: a bevel, wet streaks and a dark outline
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x + 1, y + 1, T - 2, 1.5); ctx.fillRect(x + 1, y + 1, 1.5, T - 2);
    ctx.fillStyle = 'rgba(20,30,40,0.25)'; ctx.fillRect(x + 1, y + T - 2.5, T - 2, 1.5); ctx.fillRect(x + T - 2.5, y + 1, 1.5, T - 2);
    ctx.fillStyle = 'rgba(190,235,255,0.25)'; for (let k = 0; k < 3; k++) ctx.fillRect(x + 5 + k * 9 + h * 3, y + 10, 1.5, 8 + (k * 5 + h * 10) % 10);
    ctx.fillStyle = 'rgba(30,40,50,0.3)'; for (let k = 0; k < 3; k++) { circle(x + 6 + CK.r(k, c) * 18, y + 12 + CK.r(r, k) * 12, 1); ctx.fill(); }
    // (art director pass) chisel marks, a darker wet lower half with a dark algae stain at the foot, glossy glints, a
    // hairline crack and a chipped corner, so each block reads as a cut, soaked stone
    ctx.fillStyle = 'rgba(20,40,60,0.16)'; ctx.fillRect(x + 2, y + T * 0.55, T - 4, T * 0.45 - 2.5);
    ctx.fillStyle = 'rgba(30,70,60,0.28)'; ctx.beginPath(); ctx.moveTo(x + 2, y + T - 2.5);
    for (let k = 0; k <= 6; k++) ctx.lineTo(x + 2 + k * (T - 4) / 6, y + T - 5 - CK.r(c + k, r) * 4);
    ctx.lineTo(x + T - 2, y + T - 2.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(30,45,55,0.28)'; ctx.lineWidth = 0.9; ctx.beginPath();
    for (let k = 0; k < 4; k++) { const cy = y + 7 + k * 5 + CK.r(k + c, r) * 2, cx = x + 4 + CK.r(r, k + c) * (T - 14); ctx.moveTo(cx, cy); ctx.lineTo(cx + 4 + CK.r(k, c) * 4, cy - 0.6); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x + T * 0.3, y + T * 0.42, 4, Math.PI * 1.1, Math.PI * 1.55); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; circle(x + T * 0.68, y + T * 0.32, 0.9); ctx.fill(); ctx.lineCap = 'butt';
    if (h < 0.5) { ctx.strokeStyle = 'rgba(25,35,45,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + T - 2, y + 9 + h * 10); ctx.lineTo(x + T - 7, y + 13 + h * 10); ctx.lineTo(x + T - 9, y + 19 + h * 8); ctx.stroke(); }
    if (h2 < 0.45) { const cx = h2 < 0.22 ? x + 1 : x + T - 1, sd = h2 < 0.22 ? 1 : -1; ctx.fillStyle = '#4a5860'; ctx.beginPath(); ctx.moveTo(cx, y + 1); ctx.lineTo(cx + sd * 5, y + 1); ctx.lineTo(cx, y + 5); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = '#4a5860'; ctx.lineWidth = 1.2; ctx.strokeRect(x + 0.6, y + 0.6, T - 1.2, T - 1.2);
    return;
  }
  // strata: a sedimentary layer line or two across the cliff face, lit just under it
  for (let k = 0; k < 2; k++) {
    const ly = y + 9 + k * 11 + Math.round(CK.r(Math.floor(c / 3), r * 2 + k) * 3);
    if (up && ly < y + 10) continue;
    ctx.fillStyle = 'rgba(20,24,10,0.18)'; ctx.fillRect(x, ly, T, 1.2);
    ctx.fillStyle = 'rgba(255,250,220,0.09)'; ctx.fillRect(x, ly + 1.2, T, 1);
  }
  // pits
  for (let k = 0; k < 3; k++) {
    const px = x + 4 + CK.r(c + k, r * 5) * (T - 8), py = y + (up ? 11 : 4) + CK.r(r + k * 3, c) * (T - (up ? 15 : 8)), pr = 0.7 + CK.r(k, c + r) * 1.1;
    ctx.fillStyle = 'rgba(20,24,10,0.3)'; circle(px, py, pr); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,220,0.14)'; ctx.fillRect(px - pr, py + pr - 0.3, pr * 2, 0.7);
  }
  // a pebble set in the rock
  if (h < 0.3 && ch === '#') CK.pebble(x + 6 + h2 * 18, y + 16 + h * 20, 2.2 + h2 * 1.5, '#9a8f7a', c * 31 + r);
  if (ch === 'g') {
    // the geyser stone: cracks round the vent and mineral crust
    ctx.strokeStyle = 'rgba(20,24,10,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 8, y + 7); ctx.lineTo(x + 5, y + 14); ctx.lineTo(x + 7, y + 20); ctx.moveTo(x + T - 8, y + 7); ctx.lineTo(x + T - 4, y + 13); ctx.stroke();
    ctx.fillStyle = 'rgba(240,235,200,0.35)'; for (let k = 0; k < 4; k++) { circle(x + 6 + k * 6, y + 8 + (k % 2), 1.4); ctx.fill(); }
  }
  // the outline where rock meets the air
  ctx.fillStyle = 'rgba(30,26,12,0.35)';
  if (lf) ctx.fillRect(x, y, 1.2, T);
  if (rt) ctx.fillRect(x + T - 1.2, y, 1.2, T);
  if (dn) ctx.fillRect(x, y + T - 1.2, T, 1.2);
  // roots and a fern under an overhang
  if (dn && ch === '#') {
    if (h > 0.74) {
      ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 1.3; ctx.lineCap = 'round'; ctx.beginPath();
      const rx = x + 6 + h2 * 16, rl = 6 + h * 10; ctx.moveTo(rx, y + T - 1); ctx.quadraticCurveTo(rx + 3, y + T + rl * 0.5, rx - 1, y + T + rl); ctx.moveTo(rx + 1, y + T + rl * 0.4); ctx.lineTo(rx + 5, y + T + rl * 0.7); ctx.stroke(); ctx.lineCap = 'butt';
    } else if (h > 0.58) {
      const fx = x + 8 + h2 * 14;
      ctx.strokeStyle = '#3f9a3c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(fx, y + T - 1); ctx.quadraticCurveTo(fx + 4, y + T + 6, fx + 2, y + T + 12); ctx.stroke();
      ctx.fillStyle = '#5fbf4a'; for (let k = 0; k < 4; k++) { const fy = y + T + 2 + k * 2.6; ctx.beginPath(); ctx.ellipse(fx + 3 + k * 0.3, fy, 3.2 - k * 0.5, 1.2, 0.5, 0, Math.PI * 2); ctx.ellipse(fx - 1 + k * 0.6, fy + 0.5, 3 - k * 0.5, 1.1, -0.5, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  // blades, clover and a lit lip along a grassy top
  if (up && ch === '#') {
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(x, y, T, 1.2);
    ctx.fillStyle = 'rgba(20,40,10,0.22)'; ctx.fillRect(x, y + 8, T, 1.5);
    ctx.fillStyle = WFALL_ROCK.topDark; for (let k = 0; k < 3; k++) { const bx = x + 3 + k * 10 + CK.r(k, c) * 4; ctx.beginPath(); ctx.moveTo(bx - 2, y + 1); ctx.lineTo(bx + 0.5, y - 4 - CK.r(c, k + r) * 3); ctx.lineTo(bx + 2, y + 1); ctx.fill(); }
    ctx.fillStyle = WFALL_ROCK.top; for (let k = 0; k < 3; k++) { const bx = x + 8 + k * 9 + CK.r(k + 5, c) * 3; ctx.beginPath(); ctx.moveTo(bx - 1.5, y + 1); ctx.lineTo(bx + 1, y - 3 - CK.r(c + 2, k) * 2); ctx.lineTo(bx + 2, y + 1); ctx.fill(); }
    if (h2 > 0.8) { const cx = x + 6 + h * 18; ctx.fillStyle = '#4faa3c'; for (let k = 0; k < 3; k++) { const a = k * 2.09 - 1.57; circle(cx + Math.cos(a) * 2, y - 1 + Math.sin(a) * 2, 1.8); ctx.fill(); } }
  }
  if (up && ch === 'm') {
    ctx.fillStyle = 'rgba(30,90,30,0.3)'; ctx.fillRect(x, y + 6, T, 2);
    ctx.fillStyle = '#ffffff'; for (let k = 0; k < 2; k++) { const sx = x + 6 + k * 14 + h * 4; ctx.fillRect(sx, y - 9, 0.8, 4); circle(sx + 0.4, y - 9.5, 1.1); ctx.fill(); }
  }
}
function wfallDrawRock(st, ch, c, r, x, y, t, still) {
  const open = (dc, dr) => !wfallSolidAt(st, c + dc, r + dr);
  const edge = c === 0 || c === COLS - 1;
  ctx.fillStyle = ch === 's' ? '#6f7f8a' : edge ? C.stoneEdge : C.stone; ctx.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
  const h = hash(c, r);
  if (ch !== 's') {
    // rock gets darker deeper inside a cliff, and has rounded slabs with a lit top and a shaded foot, and the odd crack
    let d = 0; for (let k2 = 1; k2 <= 3 && wfallSolidAt(st, c, r - k2); k2++) d++;
    if (d) { ctx.fillStyle = 'rgba(20,24,10,' + (0.05 * d) + ')'; ctx.fillRect(x - 0.5, y - 0.5, T + 1, T + 1); }
    const w2 = 10 + (h % 9), h2 = 6 + ((h >> 3) % 5), sx = x + 3 + ((h >> 5) % Math.max(1, T - w2 - 6)), sy = y + 11 + ((h >> 7) % Math.max(1, T - h2 - 14));
    if (h % 2) { ctx.fillStyle = 'rgba(20,24,10,0.16)'; ctx.fillRect(sx, sy + 1.5, w2, h2); ctx.fillStyle = 'rgba(255,250,220,0.10)'; ctx.fillRect(sx, sy, w2, h2); }
    if (h % 5 === 2) { ctx.strokeStyle = 'rgba(20,24,10,0.25)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 6 + (h % 10), y + 12); ctx.lineTo(x + 10 + (h % 10), y + 19); ctx.lineTo(x + 7 + (h % 10), y + 26); ctx.stroke(); }
  }
  if (ch === 's') {
    // wet slippery rock: blue-grey with a shine and drips
    ctx.fillStyle = 'rgba(190,235,255,0.35)'; rr(x + 3, y + 5, T - 10, 4, 2); ctx.fill();
    if (!reduceMotion && !still) { const d = ((t * 0.9 + h % 10 / 10) % 1); ctx.fillStyle = 'rgba(190,235,255,' + (0.7 * (1 - d)).toFixed(2) + ')'; circle(x + 8 + (h % 14), y + T + d * 14, 2); ctx.fill(); }
  } else if (h % 3 === 0) { ctx.fillStyle = C.stoneLight; rr(x + 4 + (h % 15), y + 10 + ((h >> 4) % 12), 7, 4, 2); ctx.fill(); }
  ctx.fillStyle = C.stoneEdge;
  if (open(-1, 0) && c > 0) { ctx.fillRect(x, y, 2, T); ctx.fillStyle = 'rgba(255,250,220,0.14)'; ctx.fillRect(x + 2, y, 2, T); ctx.fillStyle = C.stoneEdge; }
  if (open(1, 0) && c < COLS - 1) { ctx.fillRect(x + T - 2, y, 2, T); ctx.fillStyle = 'rgba(20,24,10,0.16)'; ctx.fillRect(x + T - 6, y, 4, T); ctx.fillStyle = C.stoneEdge; }
  if (open(0, 1)) { ctx.fillRect(x, y + T - 3, T, 3); ctx.fillStyle = 'rgba(20,24,10,0.12)'; ctx.fillRect(x, y + T - 7, T, 4); ctx.fillStyle = C.stoneEdge; }
  if (open(0, -1) && wfallCell(st, c, r - 1) !== '~') {
    if (ch === 'm') {
      // springy moss: a fat bright cushion
      ctx.fillStyle = '#4fbf3f'; rr(x - 1, y - 6, T + 2, 14, 7); ctx.fill();
      ctx.fillStyle = '#9cf06a'; for (let i = 0; i < 4; i++) { circle(x + 4 + i * 7.5, y - 3 + (i % 2), 5); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; circle(x + 9, y - 5, 1.6); ctx.fill(); circle(x + 21, y - 4, 1.3); ctx.fill();
    } else if (ch === 's') {
      ctx.fillStyle = '#8fb6c4'; ctx.fillRect(x, y, T, 5); ctx.fillStyle = 'rgba(230,250,255,0.7)'; ctx.fillRect(x + 2, y + 1, T - 4, 1.5);
    } else if (ch === 'g') {
      ctx.fillStyle = '#8a7a6a'; ctx.fillRect(x, y, T, 7);
      ctx.fillStyle = '#3a2f28'; rr(x + 6, y + 1, T - 12, 4, 2); ctx.fill();
    } else {
      ctx.fillStyle = WFALL_ROCK.topDark; ctx.fillRect(x, y, T, 8);
      ctx.fillStyle = WFALL_ROCK.top; ctx.fillRect(x, y, T, 6);
      for (let i = 0; i < 3; i++) { circle(x + 5 + i * 10, y + 6, 3); ctx.fill(); }
      if (h % 5 === 0) { ctx.fillStyle = '#3f9a3c'; ctx.beginPath(); ctx.ellipse(x + 10, y - 3, 6, 3, -0.6, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + 17, y - 4, 6, 3, 0.6, 0, Math.PI * 2); ctx.fill(); }
      if (h % 7 === 1) { ctx.fillStyle = '#ff8fc7'; circle(x + 22, y - 2, 3); ctx.fill(); ctx.fillStyle = '#ffe36b'; circle(x + 22, y - 2, 1.2); ctx.fill(); }
    }
  }
  // a little moss creeping down the sides of the cliffs
  if (ch === '#' && open(0, 1) && h % 4 === 0) { ctx.fillStyle = 'rgba(63,154,60,0.8)'; for (let i = 0; i < 3; i++) { rr(x + 4 + i * 9, y + T - 2, 3, 6 + (h >> i) % 8, 1.5); ctx.fill(); } }
}
function wfallDrawPool(st, c, r, x, y, t) {
  ctx.fillStyle = '#3f8fc0'; ctx.fillRect(x - 0.5, y + 4, T + 1, T - 4);
  ctx.fillStyle = '#6fc3e8'; ctx.fillRect(x - 0.5, y + 4, T + 1, 7);
  const w = reduceMotion ? 0 : Math.sin(t * 3 + c) * 1.5;
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; rr(x + 4 + w, y + 6, 10, 2.5, 1.2); ctx.fill();
  if (c % 3 === 0) { ctx.fillStyle = '#4fae5e'; ctx.beginPath(); ctx.ellipse(x + 18, y + 7, 7, 3, 0, 0, Math.PI * 2); ctx.fill(); }
}
function wfallDrawStream(st, s, t) {
  const k = s.k, x0 = s.x0, x1 = s.x1, y0 = s.y0, y1 = s.y1;
  // the rock lip the water pours from, and the log that jams it
  if (k > 0.01) {
    const w = (x1 - x0) * (0.25 + 0.75 * k), cx = (x0 + x1) / 2;
    ctx.save(); ctx.globalAlpha = 0.25 + 0.6 * k;
    const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    g.addColorStop(0, 'rgba(120,200,240,0.8)'); g.addColorStop(0.5, 'rgba(200,240,255,0.95)'); g.addColorStop(1, 'rgba(120,200,240,0.8)');
    ctx.fillStyle = g; ctx.fillRect(cx - w / 2, y0, w, y1 - y0);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5;
    const fall = reduceMotion ? 0 : t * 420;
    for (let i = 0; i < 7; i++) {
      const x = cx - w / 2 + 6 + i * (w - 12) / 6;
      for (let y = y0 + ((fall + i * 37) % 70) - 70; y < y1; y += 70) { ctx.beginPath(); ctx.moveTo(x, Math.max(y0, y)); ctx.lineTo(x, Math.min(y1, y + 30)); ctx.stroke(); }
    }
    ctx.restore();
    // foam where it lands
    ctx.fillStyle = 'rgba(255,255,255,' + (0.8 * k).toFixed(2) + ')';
    for (let i = 0; i < 6; i++) { circle(x0 + 8 + i * (x1 - x0 - 16) / 5, y1 - 2 + (reduceMotion ? 0 : Math.sin(t * 9 + i) * 2), 6 + (i % 2) * 2); ctx.fill(); }
  } else {
    // dry: a few drips
    ctx.fillStyle = 'rgba(190,235,255,0.6)';
    for (let i = 0; i < 4; i++) { const d = reduceMotion ? 0.5 : (t * 0.8 + i * 0.27) % 1; circle(x0 + 12 + i * (x1 - x0 - 24) / 3, y0 + d * (y1 - y0), 2); ctx.fill(); }
  }
  // the log jam at the top: rolls in when the water stops
  const jam = s.on ? Math.max(0, 1 - s.t / 0.3) : Math.min(1, (s.t - s.flow) / 0.3);
  const lx = (x0 + x1) / 2 + (1 - jam) * (x1 - x0) * 0.9, ly = y0 + 4;
  if (jam > 0.02) {
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(reduceMotion ? 0 : (1 - jam) * 2);
    ctx.fillStyle = s.jam ? C.gold : '#8a5a32'; rr(-(x1 - x0) / 2 - 8, -9, x1 - x0 + 16, 18, 9); ctx.fill();
    if (!s.jam) {
      ctx.fillStyle = '#6a4424'; ctx.fillRect(-(x1 - x0) / 2, 3, x1 - x0, 4); ctx.fillStyle = 'rgba(255,225,180,0.3)'; ctx.fillRect(-(x1 - x0) / 2, -7, x1 - x0, 2.5);
      ctx.strokeStyle = '#5e3a1e'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let k = -(x1 - x0) / 2 + 6; k < (x1 - x0) / 2 - 10; k += 14) { ctx.moveTo(k, -3); ctx.lineTo(k + 9, -3); ctx.moveTo(k + 5, 2); ctx.lineTo(k + 13, 2); } ctx.stroke();
      ctx.strokeStyle = '#4a2e14'; ctx.lineWidth = 1.3; rr(-(x1 - x0) / 2 - 8, -9, x1 - x0 + 16, 18, 9); ctx.stroke();
    }
    ctx.fillStyle = s.jam ? '#ffe9a0' : '#c08a4e'; circle((x1 - x0) / 2 + 2, 0, 8); ctx.fill();
    ctx.strokeStyle = s.jam ? C.goldDark : '#7a5228'; ctx.lineWidth = 1.5; circle((x1 - x0) / 2 + 2, 0, 4.5); ctx.stroke();
    ctx.restore();
  }
  // warning: a trickle before the water comes back
  if (!s.on && s.dryLeft < WFALL.warn) wfallDrawSign(x0 + (x1 - x0) / 2, y0 + 30, '!', '#bfe9ff', t);
}
function wfallDrawSign(x, y, s, col, t) {
  const b = reduceMotion ? 0 : Math.sin(t * 10) * 2;
  ctx.fillStyle = 'rgba(28,26,54,0.75)'; circle(x, y + b, 11); ctx.fill();
  text(s, x, y + b + 1, 15, col, 'center');
}
function wfallDrawLog(st, ln, t) {
  const bob = reduceMotion ? 0 : Math.sin(ln.bob * 2.4) * 1.5, x = ln.x, y = ln.top + bob, w = ln.w;
  ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.beginPath(); ctx.ellipse(x + w / 2, ln.top + 14, w / 2, 4, 0, 0, Math.PI * 2); ctx.fill();
  if (ln.gold) {
    ctx.fillStyle = C.gold; rr(x, y, w, 15, 7); ctx.fill();
    ctx.fillStyle = '#ffe9a0'; ctx.fillRect(x + 6, y + 3, w - 12, 3);
    ctx.fillStyle = '#ffe9a0'; circle(x + w - 4, y + 7.5, 6.5); ctx.fill();
    ctx.strokeStyle = C.goldDark; ctx.lineWidth = 1.2; circle(x + w - 4, y + 7.5, 3.5); ctx.stroke();
  } else CK.pic('wflog' + Math.round(w), w + 6, 22, 2, 4, () => CK.log(0, 0, w, 15, { stub: false, seed: Math.round(w), right: true, moss: '#5fae4e', shadow: false }), x, y);
  // a little sprout and ripples
  ctx.fillStyle = '#4fae5e'; ctx.beginPath(); ctx.ellipse(x + 14, y - 3, 5, 2.5, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5;
  for (const sx of [x - 6, x + w + 6]) { ctx.beginPath(); ctx.arc(sx, ln.top + 9, 4 + (reduceMotion ? 0 : (ln.bob * 3) % 4), Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
}
function wfallDrawGeyser(st, gy, t) {
  const cx = (gy.x0 + gy.x1) / 2, k = gy.k;
  if (gy.phase === 'warn' && !reduceMotion) {
    ctx.fillStyle = 'rgba(232,251,255,0.8)';
    for (let i = 0; i < 4; i++) { const d = (t * 2 + i * 0.25) % 1; circle(cx - 18 + i * 12, gy.feet - 4 - d * 22, 3 + d * 3); ctx.fill(); }
  }
  if (k > 0.02) {
    const top = gy.top - 20, g = ctx.createLinearGradient(0, gy.feet, 0, top);
    g.addColorStop(0, 'rgba(240,252,255,' + (0.75 * k).toFixed(2) + ')'); g.addColorStop(1, 'rgba(240,252,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(gy.x0 - 6, gy.feet); ctx.lineTo(gy.x0 - 22, top); ctx.lineTo(gy.x1 + 22, top); ctx.lineTo(gy.x1 + 6, gy.feet); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,' + (0.55 * k).toFixed(2) + ')';
    for (let i = 0; i < 9; i++) { const d = reduceMotion ? i / 9 : (t * 1.4 + i / 9) % 1; circle(cx + Math.sin(i * 2.1 + t * 2) * (8 + d * 16), gy.feet - d * (gy.feet - top), 6 + d * 8); ctx.fill(); }
  }
  // a mossy ring round the vent
  ctx.fillStyle = '#6a5a4a'; rr(gy.x0 - 4, gy.feet - 6, gy.x1 - gy.x0 + 8, 8, 4); ctx.fill();
  ctx.fillStyle = '#2a221d'; rr(gy.x0 + 6, gy.feet - 5, gy.x1 - gy.x0 - 12, 4, 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(gy.x0 - 2, gy.feet - 6, gy.x1 - gy.x0 + 4, 1.2);
  for (let k = 0; k < 4; k++) { const sx = k < 2 ? gy.x0 - 2 + k * 5 : gy.x1 - 8 + (k - 2) * 5; ctx.fillStyle = '#7d6d5c'; ctx.beginPath(); ctx.ellipse(sx + 2, gy.feet - 4, 2.6, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(sx + 0.8, gy.feet - 5.5, 2, 0.8); }
  if (st.goldMist) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(gy.x0 - 5, gy.feet - 7, gy.x1 - gy.x0 + 10, 10, 5); ctx.stroke(); }
}
function wfallDrawFrog(f, t) {
  const sq = f.sq, x = f.x, by = f.feet, s = 1 + sq * 0.25;
  ctx.save(); ctx.translate(x, by); ctx.scale(s, 1 / s);
  ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.beginPath(); ctx.ellipse(0, 0, 16, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3f9a3c'; ctx.beginPath(); ctx.ellipse(-10, -3, 7, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(10, -3, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5fcf4f'; ctx.beginPath(); ctx.ellipse(0, -9, 15, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c9f59a'; ctx.beginPath(); ctx.ellipse(0, -6, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
  for (const ex of [-7, 7]) {
    ctx.fillStyle = '#5fcf4f'; circle(ex, -18, 5.5); ctx.fill();
    if (f.blink > 0) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ex - 3, -18); ctx.lineTo(ex + 3, -18); ctx.stroke(); }
    else { ctx.fillStyle = '#fff'; circle(ex, -18, 3.8); ctx.fill(); ctx.fillStyle = C.ink; circle(ex + f.look, -17.5, 2); ctx.fill(); }
  }
  ctx.strokeStyle = '#2f7a2c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -10, 5, 0.3, Math.PI - 0.3); ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,140,0.5)'; circle(-10, -10, 2); ctx.fill(); circle(10, -10, 2); ctx.fill();
  ctx.restore();
}
function wfallDrawPost(st, w, t) {
  const x = w.postX, y = w.topFeet, lit = w.flash;
  ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.beginPath(); ctx.ellipse(x + 1, y, 9, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7a5228'; rr(x - 4, y - 34, 8, 34, 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,225,180,0.3)'; ctx.fillRect(x - 3.5, y - 32, 1.5, 31); ctx.fillStyle = '#5a3a18'; ctx.fillRect(x + 2, y - 32, 1.8, 31);
  ctx.strokeStyle = 'rgba(60,36,14,0.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x - 1, y - 30); ctx.lineTo(x - 0.5, y - 4); ctx.moveTo(x + 1, y - 26); ctx.lineTo(x + 1.2, y - 10); ctx.stroke();
  ctx.fillStyle = '#c08a4e'; rr(x - 6, y - 38, 12, 8, 3); ctx.fill();
  ctx.strokeStyle = '#8a5a2c'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(x, y - 36.5, 3.5, 1.5, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#5a3a18'; ctx.lineWidth = 1.2; rr(x - 6, y - 38, 12, 8, 3); ctx.stroke();
  // the coil of vine on the post (it gets smaller as the vine unrolls)
  const coil = 1 - w.roll;
  if (coil > 0.05) { ctx.strokeStyle = '#4fae3c'; ctx.lineWidth = 3.5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x, y - 20 + i * 5, 9 * coil + 2, 3, 0, 0, Math.PI * 2); ctx.stroke(); } }
  if (lit > 0) { ctx.save(); ctx.globalAlpha = lit; ctx.strokeStyle = '#9be86a'; ctx.lineWidth = 3; circle(x, y - 26, 14 + (1 - lit) * 20); ctx.stroke(); ctx.restore(); }
  // a glow when someone up here should drop it
  if (!w.down && w.up.some(Boolean) && !w.done) { ctx.save(); ctx.globalAlpha = 0.35 + 0.25 * (reduceMotion ? 1 : Math.sin(t * 5)); ctx.fillStyle = C.gold; circle(x, y - 30, 14); ctx.fill(); ctx.restore(); }
}
function wfallDrawVine(st, w, t) {
  if (w.roll <= 0.01) return;
  const top = w.topFeet - 22, len = (w.baseFeet - w.topFeet + 22) * w.roll, x = w.vineX;
  const sway = reduceMotion ? 0 : Math.sin(w.sway * 1.8) * 3 * (1 - w.heave * 0.5);
  ctx.strokeStyle = '#3f8f2c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(w.postX, top); ctx.quadraticCurveTo((w.postX + x) / 2, top - 6, x, top + 6);
  ctx.quadraticCurveTo(x + sway, top + len / 2, x + sway * 0.5, top + len); ctx.stroke();
  ctx.strokeStyle = '#6fd65a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 1, top + 6); ctx.quadraticCurveTo(x + sway + 1, top + len / 2, x + sway * 0.5 + 1, top + len); ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#4fbf3f';
  for (let yy = top + 20; yy < top + len - 4; yy += 22) { const s = yy % 44 < 22 ? 1 : -1; ctx.beginPath(); ctx.ellipse(x + s * 6 + sway * 0.6, yy, 6, 3, s * 0.5, 0, Math.PI * 2); ctx.fill(); }
}
// the bamboo lift: a pulley on a bamboo frame on the ledge, two vine ropes to a bamboo deck, and the lever at the foot
function wfallDrawLift(st, w, t) {
  const L = w.lift, cx = (L.x0 + L.x1) / 2, dy = w.baseFeet - L.h, top = w.topFeet, armY = top - 46;
  const cane = '#c9b25a', caneD = '#7d6a2a', knot = '#8f7a34';
  ctx.lineCap = 'round';
  const px = w.faceX + w.side * 10;
  ctx.strokeStyle = caneD; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px, armY); ctx.lineTo(cx, armY); ctx.stroke();
  ctx.strokeStyle = cane; ctx.lineWidth = 3.5; ctx.stroke();
  ctx.fillStyle = knot; for (const yy of [top - 14, top - 30]) { ctx.fillRect(px - 3.5, yy, 7, 2); }
  ctx.fillStyle = '#6b4a2a'; ctx.strokeStyle = '#3a2614'; ctx.lineWidth = 1.5; circle(cx, armY + 3, 4.5); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#3f8f2c'; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(cx - 1, armY + 6); ctx.lineTo(L.x0 + 3, dy - 1); ctx.moveTo(cx + 1, armY + 6); ctx.lineTo(L.x1 - 3, dy - 1); ctx.stroke();
  // the deck: three canes lashed together
  for (let k = 0; k < 2; k++) { ctx.fillStyle = k ? cane : caneD; rr(L.x0 - 1, dy - 1 + k * 3, L.x1 - L.x0 + 2, 4, 2); ctx.fill(); }
  ctx.strokeStyle = '#3f8f2c'; ctx.lineWidth = 1.5; for (const xx of [L.x0 + 5, L.x1 - 5]) { ctx.beginPath(); ctx.moveTo(xx, dy - 1); ctx.lineTo(xx, dy + 6); ctx.moveTo(xx + 2.5, dy - 1); ctx.lineTo(xx + 2.5, dy + 6); ctx.stroke(); }
  ctx.fillStyle = knot; for (let xx = L.x0 + 14; xx < L.x1 - 10; xx += 16) ctx.fillRect(xx, dy - 1, 1.5, 7);
  ctx.fillStyle = 'rgba(255,255,220,0.45)'; ctx.fillRect(L.x0 + 2, dy - 0.5, L.x1 - L.x0 - 4, 1);
  const live = !w.done && !w.up[0] && !w.up[1] && L.phase === 'down';
  if (live) { ctx.fillStyle = 'rgba(255,197,61,' + (0.18 + 0.12 * (reduceMotion ? 1 : Math.sin(t * 4))).toFixed(3) + ')'; rr(L.x0 - 2, w.baseFeet - 4, L.x1 - L.x0 + 4, 6, 3); ctx.fill(); }
  // the lever: a stone block with a bamboo handle that swings toward the wall when pulled
  const lx = L.leverX, lg = w.baseFeet, lean = (L.pullT > 0 ? 0.5 : -0.5) * w.side;
  ctx.fillStyle = '#8c8f86'; ctx.strokeStyle = '#4a4c45'; ctx.lineWidth = 1.5; rr(lx - 8, lg - 8, 16, 8, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(lx - 6, lg - 7, 12, 1.2); ctx.fillStyle = 'rgba(40,40,30,0.3)'; ctx.fillRect(lx - 6, lg - 2.5, 12, 1.2);
  ctx.fillStyle = '#6e7068'; ctx.beginPath(); ctx.moveTo(lx + 8, lg - 8); ctx.lineTo(lx + 4, lg - 8); ctx.lineTo(lx + 8, lg - 5); ctx.closePath(); ctx.fill();
  const hx = lx + Math.sin(lean) * 24, hy = lg - 6 - Math.cos(lean) * 24;
  ctx.strokeStyle = caneD; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(lx, lg - 6); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.strokeStyle = cane; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = live ? '#ff7a3c' : '#c0602e'; ctx.strokeStyle = '#3a2614'; ctx.lineWidth = 1.5; circle(hx, hy, 4.5); ctx.fill(); ctx.stroke();
  ctx.lineCap = 'butt';
}
function wfallDrawCp(cp, t) {
  if (cp.start) return;
  const x = cp.x, y = cp.feet, wave = reduceMotion ? 0 : Math.sin(t * 5) * 2;
  ctx.fillStyle = '#7a5228'; ctx.fillRect(x - 2, y - 50, 4, 50);
  ctx.fillStyle = cp.lit ? '#7fd65a' : '#cfd8c0';
  const top = cp.lit ? y - 50 : y - 30;
  ctx.beginPath(); ctx.moveTo(x + 2, top); ctx.quadraticCurveTo(x + 16, top + 2 + wave, x + 26, top + 9); ctx.quadraticCurveTo(x + 14, top + 14 + wave, x + 2, top + 18); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = cp.lit ? '#3f9a3c' : '#9aa48c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 3, top + 9); ctx.lineTo(x + 22, top + 9); ctx.stroke();
  // who has reached it
  for (let i = 0; i < 2; i++) {
    const cx = x - 8 + i * 16, cy = y - 58;
    circle(cx, cy, 4.5);
    if (cp.by[i]) { ctx.fillStyle = PCOL[i]; ctx.fill(); } else { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill(); ctx.strokeStyle = PCOL[i]; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  if (cp.wave > 0) { ctx.save(); ctx.globalAlpha = cp.wave; ctx.strokeStyle = '#9cf06a'; ctx.lineWidth = 3; circle(x + 10, y - 42, 12 + (1 - cp.wave) * 26); ctx.stroke(); ctx.restore(); }
}
function wfallGemShape(x, y, r) {
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.8, y - r * 0.2); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.8, y - r * 0.2); ctx.closePath();
}
function wfallDrawGems(st, t) {
  for (const gm of st.gems) {
    if (gm.got) { if (gm.pop > 0) { ctx.save(); ctx.globalAlpha = gm.pop; ctx.strokeStyle = '#9ff3ff'; ctx.lineWidth = 2; circle(gm.x, gm.y, 8 + (1 - gm.pop) * 20); ctx.stroke(); ctx.restore(); } continue; }
    const bob = reduceMotion ? 0 : Math.sin(t * 2.5 + gm.ph) * 3, tw = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 5 + gm.ph);
    ctx.fillStyle = 'rgba(160,240,255,0.3)'; circle(gm.x, gm.y + bob, 13 * tw); ctx.fill();
    ctx.fillStyle = gm.ph % 2 < 1 ? '#5fe0ff' : '#ff8fd8'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
    wfallGemShape(gm.x, gm.y + bob, 9 * tw); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.moveTo(gm.x - 3, gm.y + bob - 5); ctx.lineTo(gm.x, gm.y + bob - 7); ctx.lineTo(gm.x + 1, gm.y + bob - 2); ctx.closePath(); ctx.fill();
  }
}
// Tico the toucan (also used for the nest): a black body, a big rainbow beak
function wfallDrawToucan(x, y, face, t, s = 1, flap = true) {
  ctx.save(); ctx.translate(x, y); ctx.scale(face * s, s);
  const wing = flap && !reduceMotion ? Math.sin(t * 14) * 0.6 : 0.2;
  ctx.fillStyle = '#26243a'; ctx.beginPath(); ctx.ellipse(-3, 2, 13, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.rotate(-wing); ctx.fillStyle = '#3a3656'; ctx.beginPath(); ctx.ellipse(-8, -2, 10, 5, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.ellipse(4, 2, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff9a3c'; ctx.beginPath(); ctx.moveTo(7, -6); ctx.quadraticCurveTo(26, -8, 28, 0); ctx.quadraticCurveTo(18, 2, 7, 1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.moveTo(7, -6); ctx.quadraticCurveTo(16, -8, 18, -3); ctx.lineTo(7, -1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff5f6d'; circle(27, -1, 2); ctx.fill();
  ctx.fillStyle = '#7fe36b'; circle(4, -6, 4); ctx.fill();
  ctx.fillStyle = C.ink; circle(5, -6, 2); ctx.fill(); ctx.fillStyle = '#fff'; circle(5.6, -6.6, 0.7); ctx.fill();
  ctx.fillStyle = '#ff9a3c'; ctx.fillRect(-2, 11, 2, 4); ctx.fillRect(3, 11, 2, 4);
  ctx.restore();
}
function wfallDrawNest(st, t) {
  const n = st.nest;
  if (!n) return;
  const x = n.x, y = n.feet, won = st.phase === 'won';
  // a big woven nest with the treasure
  ctx.fillStyle = '#a8743f'; ctx.beginPath(); ctx.ellipse(x, y - 12, 34, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7a5228'; ctx.lineWidth = 2;
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * 9 - 6, y - 4); ctx.lineTo(x + i * 9 + 6, y - 22); ctx.stroke(); }
  const shine = reduceMotion ? 0.8 : 0.6 + 0.4 * Math.sin(t * 4);
  ctx.fillStyle = 'rgba(255,215,90,' + (0.35 * shine).toFixed(2) + ')'; circle(x, y - 26, 26 + (won ? 10 : 0)); ctx.fill();
  // golden mango treasure + gems
  ctx.fillStyle = C.gold; ctx.beginPath(); ctx.ellipse(x - 6, y - 24, 10, 12, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.ellipse(x - 9, y - 28, 3, 5, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4fae5e'; ctx.beginPath(); ctx.ellipse(x - 2, y - 36, 6, 3, 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5fe0ff'; wfallGemShape(x + 10, y - 22, 6); ctx.fill(); ctx.fillStyle = '#ff8fd8'; wfallGemShape(x + 20, y - 18, 5); ctx.fill();
  // Tico sits on the nest's rim until the end, then hops about
  if (!won) wfallDrawToucan(x + 22, y - 30 + (reduceMotion ? 0 : Math.sin(t * 2) * 1.5), -1, t, 1, false);
}
// a splashed player floating back in a mist bubble
function wfallDrawFloat(st, p, t) {
  const s = st.pl[p.id].splash;
  if (!s) return;
  const k = clamp((s.t - 0.25) / (WFALL.float - 0.25), 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const x = s.x0 + (s.x1 - s.x0) * e, y = s.y0 + (s.y1 - s.y0) * e + (reduceMotion ? 0 : Math.sin(s.t * 8) * 3);
  const grow = Math.min(1, s.t / 0.25);
  ctx.save(); ctx.globalAlpha = 0.9;
  drawPlayer(Object.assign({}, p, { alive: true, x: x - p.w / 2, y: y - p.h / 2 + 4, vx: 0, vy: 0, sx: 0.9, sy: 0.9, stun: 0 }));
  ctx.restore();
  ctx.fillStyle = 'rgba(200,240,255,0.3)'; circle(x, y, 22 * grow); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; circle(x, y, 22 * grow); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(x - 8, y - 10, 5, 2.5, -0.6, 0, Math.PI * 2); ctx.fill();
}
// arms on a vine
function wfallDrawExtras(st, p, t) {
  const P = st.pl[p.id], x = p.x + p.w / 2, dark = PDARK[p.id];
  if (P.vine >= 0) {
    const reach = (Math.floor(P.climbT * 6) % 2) * 6;
    ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 6, p.y + 10); ctx.lineTo(x - 1, p.y - 2 - reach); ctx.moveTo(x + 6, p.y + 10); ctx.lineTo(x + 1, p.y + 4 + reach - 6); ctx.stroke();
    ctx.lineCap = 'butt';
  }
}
function wfallDraw() {
  const st = G.mst;
  if (!st.grid) return;
  const t = G.clock;
  wfallDrawBack(st, t);
  ctx.save(); ctx.translate(0, -st.camY);
  for (const s of st.streams) if (wfallOnScreen(st, s.y0) || wfallOnScreen(st, s.y1) || (s.y0 < st.camY && s.y1 > st.camY + H)) wfallDrawStream(st, s, t);
  wfallDrawTiles(st, t);
  for (const gy of st.geysers) if (wfallOnScreen(st, gy.feet) || wfallOnScreen(st, gy.top)) wfallDrawGeyser(st, gy, t);
  for (const ln of st.lanes) if (wfallOnScreen(st, ln.top)) wfallDrawLog(st, ln, t);
  for (const cp of st.cps) if (wfallOnScreen(st, cp.feet)) wfallDrawCp(cp, t);
  for (const w of st.walls) if (wfallOnScreen(st, w.topFeet) || wfallOnScreen(st, w.baseFeet)) { wfallDrawLift(st, w, t); wfallDrawVine(st, w, t); wfallDrawPost(st, w, t); }
  for (const f of st.frogs) if (wfallOnScreen(st, f.feet)) wfallDrawFrog(f, t);
  wfallDrawGems(st, t);
  wfallDrawNest(st, t);
  ctx.restore();
}
// (the engine draws the players between draw() and drawTop(), on screen)
function wfallDrawTop() {
  const st = G.mst;
  if (!st.grid) return;
  const t = G.clock, big = wfallBig();
  for (const p of G.players) if (p.alive) wfallDrawExtras(st, p, t);
  ctx.save(); ctx.translate(0, -st.camY);
  for (const p of G.players) {
    if (st.pl[p.id].splash) { const q = Object.assign({}, p, { y: p.y + st.camY }); wfallDrawFloat(st, q, t); }
  }
  ctx.restore();
  // someone off the top of the screen: an arrow at the edge
  for (const p of G.players) if (p.alive && p.y + p.h < 70) {
    const x = clamp(p.x + p.w / 2, 30, W - 30);
    ctx.fillStyle = PCOL[p.id]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, 78); ctx.lineTo(x - 10, 94); ctx.lineTo(x + 10, 94); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  const boxes = [];
  // Tico
  const tc = st.tico, tsy = tc.y - st.camY;
  if (tc.x < W + 40 && tsy > -40 && tsy < H + 40) {
    wfallDrawToucan(tc.x, tsy, tc.face, t, big ? 1.35 : 1.1, true);
    boxes.push({ x0: tc.x - 24, y0: tsy - 20, x1: tc.x + 30, y1: tsy + 18 });
    const say = tc.sayT > 0 ? tc.say : tc.on ? tc.hint : '';
    if (say) boxes.push(wfallBubble(say, tc.x, tsy - 24, big));
  }
  // hint chips over each person
  if (st.phase === 'play' && G.introT <= WFALL.introHold) {
    for (const p of G.players) {
      if (!p.alive || wfallCpu(p.id)) continue;
      const P = st.pl[p.id], j = wfallJob(st, p.id);
      const key = j ? j.k + ':' + P.step : '';
      if (key !== P.chipKey) { P.chipKey = key; P.chipT = 0; }
      P.chipT += 1 / 60;
      const lines = j && wfallJobText(st, p.id, j);
      if (!lines || !lines[0]) continue;
      const showT = P.chipT < WFALL.chipT || P.chipT > WFALL.chipAgain || (st.cp === 0 && st.pl[p.id].best <= 0);
      if (!showT && j.k !== 'pull' && j.k !== 'lower' && j.k !== 'grab') continue;
      ctx.save(); if (P.chipT > WFALL.chipAgain) ctx.globalAlpha = 0.8 + 0.2 * Math.sin(t * 5);
      boxes.push(wfallChip(NAMES[p.id] + ': ' + lines[0], lines[1], p.x + p.w / 2, p.y - 24, PCOL[p.id], boxes));
      ctx.restore();
    }
  }
  // pops
  ctx.save(); ctx.translate(0, -st.camY);
  for (const q of st.pops) {
    const size = q.size * (big ? 1.3 : 1);
    ctx.font = size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const w = ctx.measureText(q.s).width + size * 0.3, x = clamp(q.x, w / 2 + 6, W - w / 2 - 6), y = q.y - q.t * 26;
    if (y - st.camY < 80 || y - st.camY > H - 10) continue;
    ctx.save(); ctx.globalAlpha = clamp(Math.min(q.t / 0.1, (1.4 - q.t) / 0.4), 0, 1);
    bigText(q.s, x, y, Math.round(size), q.col);
    ctx.restore();
  }
  ctx.restore();
  if (st.phase === 'won') {
    const k = Math.min(1, st.winT / 0.3);
    bigText('Top of the falls!', W / 2, 200, 46, C.gold, 0.6 + 0.4 * k);
    if (st.winT > 0.6) { pill(W / 2, 228, big ? 300 : 250, 32, 'center'); text('Tico found the treasure!', W / 2, 244, big ? 22 : 18, C.paper, 'center'); }
    const tx = st.nest.x - 10 + Math.sin(st.winT * 3) * 30, ty = st.nest.feet - st.camY - 70 - Math.abs(Math.sin(st.winT * 5)) * 30;
    wfallDrawToucan(tx, ty, Math.cos(st.winT * 3) > 0 ? 1 : -1, t, big ? 1.5 : 1.3, true);
  }
}
function wfallBubble(s, x, y, big) {
  const fs = big ? 17 : 13;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(s).width + 18, h = fs + 10, bx = clamp(x - w / 2, 6, W - w - 6), by = clamp(y - h, 80, H - h - 6);
  ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(bx, by, w, h, 9); ctx.fill(); ctx.stroke();
  text(s, bx + w / 2, by + h / 2 + 0.5, fs, '#3a3070', 'center', 'body');
  return { x0: bx, y0: by, x1: bx + w, y1: by + h };
}
// a dark chip with a coloured title and an optional second line (hints)
function wfallChip(t1, t2, x, y, col, avoid) {
  const z = wfallBig() ? 1.45 : 1, f1 = Math.round(13 * z), f2 = Math.round(12 * z);
  ctx.font = '700 ' + f1 + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  let w = ctx.measureText(t1).width;
  if (t2) { ctx.font = '700 ' + f2 + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; w = Math.max(w, ctx.measureText(t2).width); }
  w = Math.min(W - 16, w + 22 * z); const h = (t2 ? 38 : 22) * z;
  const x0 = clamp(x - w / 2, 8, W - 8 - w);
  let y0 = clamp(y - h, 80, H - 8 - h);
  for (const b of avoid || []) if (x0 < b.x1 + 4 && x0 + w > b.x0 - 4 && y0 < b.y1 + 4 && y0 + h > b.y0 - 4) y0 = b.y0 - h - 6 >= 80 ? b.y0 - h - 6 : b.y1 + 6;
  ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(x0, y0, w, h, 10 * z); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; rr(x0, y0, w, h, 10 * z); ctx.stroke();
  text(t1, x0 + w / 2, y0 + 11 * z, f1, col, 'center', 'body');
  if (t2) text(t2, x0 + w / 2, y0 + 28 * z, f2, C.paper, 'center', 'body');
  return { x0, y0, x1: x0 + w, y1: y0 + h };
}
function wfallHud() {
  const st = G.mst;
  if (!st.stats) return;
  const big = wfallBig(), fs = big ? 20 : 14, h = big ? 40 : 28;
  const sp = st.stats.splash[0] + st.stats.splash[1];
  const parts = [[fmtTime(G.time), C.paper], ['◆ ' + st.stats.gems + '/' + st.gems.length, '#9ff3ff'], ['Splashes ' + sp, sp ? '#bfe9ff' : C.paper]];
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const ws = parts.map(q => ctx.measureText(q[0]).width), gap = fs;
  const w = ws.reduce((a, b) => a + b, 0) + gap * 2 + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
  let x = x0 + 15;
  parts.forEach((q, i) => { text(q[0], x, cy, fs, q[1], 'left', 'body'); x += ws[i] + gap; });
  // the section, under the level name
  const sec = st.sections[st.section], sl = big ? 'Section ' + (st.section + 1) + '/' + st.sections.length + ': ' + sec.name : 'Section ' + (st.section + 1) + ' of ' + st.sections.length + ': ' + sec.name;
  const sfs = big ? 18 : 13, sh = big ? 32 : 26;
  ctx.font = '700 ' + sfs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  pill(14, big ? 54 : 46, ctx.measureText(sl).width + 28, sh);
  text(sl, 28, (big ? 54 : 46) + sh / 2 + 0.5, sfs, C.gold, 'left', 'body');
  // the climb meter on the right edge: checkpoints, and how high Pip and Bo are
  const mx = W - 22, my0 = big ? 100 : 76, my1 = H - 40, yOf = feet => my0 + (my1 - my0) * clamp(feet / st.WH, 0, 1);
  ctx.fillStyle = 'rgba(28,26,54,0.55)'; rr(mx - 6, my0 - 8, 12, my1 - my0 + 16, 6); ctx.fill();
  for (const cp of st.cps) { ctx.fillStyle = cp.lit ? '#7fd65a' : 'rgba(255,255,255,0.4)'; ctx.fillRect(mx - 5, yOf(cp.feet) - 1, 10, 2); }
  if (st.nest) { ctx.fillStyle = C.gold; circle(mx, yOf(st.nest.feet) - 4, 4); ctx.fill(); }
  G.players.forEach((p, i) => {
    const P = st.pl[i], feet = P.splash ? P.splash.y0 : p.y + st.camY + p.h;
    ctx.fillStyle = PCOL[i]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; circle(mx + (i ? 3 : -3), yOf(feet), big ? 6 : 4.5); ctx.fill(); ctx.stroke();
  });
  // news (section names, gold help)
  const n = st.news;
  if (n && G.mode === 'play') {
    const a = clamp(Math.min(n.t / 0.2, (n.life - n.t) / 0.3), 0, 1), nfs = big ? 19 : 14, nh = big ? 34 : 26, ny = big ? 96 : 80;
    ctx.font = '700 ' + nfs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const nw = Math.min(W - 40, ctx.measureText(n.s).width + 32);
    ctx.save(); ctx.globalAlpha = a;
    const px = pill(W / 2, ny, nw, nh, 'center');
    if (n.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(px, ny, nw, nh, nh / 2); ctx.stroke(); }
    text(n.s, W / 2, ny + nh / 2 + 0.5, nfs, n.gold ? C.gold : C.paper, 'center', 'body');
    ctx.restore();
  }
  // gold help chips under the time pill
  const chips = [];
  if (st.streams.some(s => s.jam)) chips.push('BIG LOG JAM');
  if (st.lanes.some(l => l.gold)) chips.push('GOLD RAFT');
  let cy2 = 12 + h + 6;
  for (const s of chips) {
    const fs2 = big ? 15 : 11;
    ctx.font = '700 ' + fs2 + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w2 = ctx.measureText(s).width + 20;
    pill(W - 40, cy2, w2, fs2 + 10, 'right');
    text(s, W - 50, cy2 + (fs2 + 10) / 2 + 0.5, fs2, C.gold, 'right', 'body');
    cy2 += fs2 + 14;
  }
}

/* ---------- setup ---------- */
function wfallSetup(st, L) {
  wfallBuild(st, L.def);
  st.pl = [0, 1].map(() => ({ ride: -1, onHead: false, vine: -1, climbDir: 0, climbT: 0, splash: null, post: -1, pushT: 0,
    dx: 0, landV: 0, landOn: null, grabCD: 0, waitCD: 0, oofCD: 0, washS: -1, inStream: false, lifted: false, onLog: -1,
    actLatch: false, step: 0, best: 0, chipKey: '', chipT: 0, mossJump: false, headHop: false }));
  st.stats = { splash: [0, 0], lifts: [0, 0], vines: [0, 0], climbs: [0, 0], gems: 0, washes: 0, frogs: 0, moss: 0, geysers: 0, time: 0 };
  st.cp = 0; st.section = 0; st.phase = 'play'; st.winT = 0; st.tick = 0; st.time = 0; st.progressT = 0; st.roomSplash = 0;
  st.goldMist = false; st.goldUsed = [];
  st.pops = []; st.news = null;
  st.tico = { x: W + 60, y: 0, on: false, t: 0, say: '', sayT: 0, hint: '', face: -1 };
  G.players.forEach((p, k) => { const s = st.spawns[k]; Object.assign(p, { x: s.x, y: s.y, vx: 0, vy: 0, grounded: true, face: 1, downLatch: true }); });
  st.camY = 0;
  wfallCamera(st, 0, true);
  st.tico.y = st.camY + 60;
  for (const p of G.players) p.y -= st.camY;    // (on screen between steps)
}

MODES.waterfall = {
  // medal (js/medals.js): two computers 72 s with no splashes; one clumsy computer 95-255 s; a scripted kid with the
  // computer 130-290 s and 1-20 splashes, most of them cheap ones in the pools by the stream and the log
  medals: { bronze: 'Reach the toucan nest', goals: [{ key: 'time', gold: 240, silver: 450 }, { key: 'splashes', gold: 5, silver: 14, word: 'splash' }] },
  medalValues() { const s = G.mst.stats; return s ? { time: s.time || G.time, splashes: s.splash[0] + s.splash[1] } : {}; },
  setup(st, L) { wfallSetup(st, L); },
  step(dt) { const st = G.mst; if (st.grid) wfallStep(st, dt); },
  draw() { wfallDraw(); },
  drawTop() { wfallDrawTop(); },
  hud() { wfallHud(); },
  stats() {
    const st = G.mst, s = st.stats, sp = s.splash[0] + s.splash[1];
    const words = sp === 0 ? 'Not one splash! Super climbers!' : sp <= 5 ? 'Great teamwork up the falls!' : 'Lots of splashes, and you made it together!';
    const gold = st.goldUsed.length ? ' · Gold help: ' + st.goldUsed.map(k => ({ jam: 'Big log jam', raft: 'Gold raft' }[k])).join(', ') : '';
    return [
      { label: 'Splashes', values: s.splash.slice() },
      { label: 'Lifts given', values: s.lifts.slice() },
      { label: 'Gems', value: s.gems + ' of ' + st.gems.length },
      words,
      'Vines dropped: Pip ' + s.vines[0] + ', Bo ' + s.vines[1] + ' · Frog bounces ' + s.frogs + ' · Geyser rides ' + s.geysers + gold,
    ];
  },
};

/* ---------- sounds ---------- */
Sfx.extra.waterfallLever = function (p) { this.tone(200 * p, 0.08, 'square', 0.035, 130 * p); this.tone(340 * p, 0.12, 'triangle', 0.04, 560 * p, 0.06); };
Sfx.extra.waterfallThunk = function () { this.tone(150, 0.12, 'triangle', 0.06, 95); this.noise(0.05, { f: 900, vol: 0.02 }); };
Sfx.extra.waterfallUp = function (p) { [523 * p, 784 * p].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.waterfallVine = function (p) { this.tone(900 * p, 0.3, 'sine', 0.04, 300 * p); this.tone(300 * p, 0.12, 'triangle', 0.04, null, 0.25); };
Sfx.extra.waterfallGrab = function (p) { this.tone(400 * p, 0.06, 'triangle', 0.04, 500 * p); };
Sfx.extra.waterfallSplash = function (p) { this.tone(500 * p, 0.3, 'sine', 0.05, 140 * p); this.tone(1400, 0.08, 'triangle', 0.015, 600, 0.02); this.tone(900, 0.1, 'sine', 0.02, 300, 0.12); };
Sfx.extra.waterfallPop = function (p) { this.tone(600 * p, 0.08, 'sine', 0.05, 1200 * p); };
Sfx.extra.waterfallRibbit = function (p) { this.tone(180, 0.07, 'square', 0.035, 140); this.tone(220, 0.08, 'square', 0.035, 160, 0.09); this.tone(500 * p, 0.2, 'sine', 0.04, 1000 * p, 0.02); };
Sfx.extra.waterfallBoing = function (p) { this.tone(240 * p, 0.2, 'sine', 0.06, 620 * p); };
Sfx.extra.waterfallWash = function (p) { this.tone(700 * p, 0.25, 'triangle', 0.03, 250 * p); };
Sfx.extra.waterfallGeyser = function (p) { this.tone(160 * p, 0.35, 'sine', 0.05, 480 * p); };
Sfx.extra.waterfallPuff = function () { this.tone(120, 0.3, 'triangle', 0.025, 260); };
Sfx.extra.waterfallGem = function () { this.tone(1320, 0.08, 'triangle', 0.045, 1760); this.tone(1980, 0.1, 'sine', 0.03, null, 0.06); };
Sfx.extra.waterfallTouch = function (p) { this.tone(660 * p, 0.08, 'sine', 0.04); };
Sfx.extra.waterfallCp = function () { [523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.06, null, i * 0.08)); };
Sfx.extra.waterfallGold = function () { [784, 988, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.waterfallSection = function () { [392, 523, 659].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.05, null, i * 0.1)); };
Sfx.extra.waterfallTico = function () { this.tone(1500, 0.05, 'square', 0.012); this.tone(1900, 0.07, 'square', 0.01, null, 0.07); };
Sfx.extra.waterfallWin = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.06, null, i * 0.1)); };
MODES.waterfall.test = { WFALL, wfallJob, wfallJobText, wfallStepAt, wfallPostAt, wfallOnDeck, wfallAtLever, wfallGround, wfallStreamAt, wfallGeyserAt };
