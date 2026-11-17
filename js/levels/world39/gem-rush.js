/* Pip & Bo - Level 39-4 Gem Rush (versus, World 39 Crystal Caverns). */
'use strict';

/* ===== 39-4 Gem Rush (mode 'gemrush', versus, best of 5, Gavyn's pick) =====
   The worm is gone, the cavern glows again, and the grateful golem claps its hands over a chamber of soft earth and
   fills it with gems. Pip and Bo, being Pip and Bo, race each other for them.
   ONE SCREEN WIDE, a side cut-away of a dirt chamber taller than the screen (GR.rows cells of GR.cell px). It scrolls
   down as the round goes on: the camera follows the lower of a slow creep (GR.creep px/s) and the midpoint of the two
   diggers. The top edge is a soft ceiling: a digger left above it is carried down in the golem's fingers (2 s lost).
   The golem's face watches from the top; its hand shows the round timer as a row of crystals going dark.
   THE EARTH: soft dirt, packed dirt, rock (no digging), crumble dirt (light, cracked: a row of it falls into the
   tunnels below when any cell under it is dug), gas pockets (green: digging one puffs a cloud that drifts up through
   the tunnels; anyone in it coughs and digs at half speed for 2 s), water pockets (blue: a flood down the open tunnel
   below washes anyone in it to the bottom), boulders (fall when the cell under them is dug and keep falling down any
   open shaft; a faint shadow line shows where), crystal pillars (no digging; touching one lights up every gem within 5
   cells for both for 2 s), and hollows with geysers (every 5 s: launches anyone standing on the vent up 6 cells).
   The layout is mirrored left to right every round, so it is fair; Pip starts top left and Bo top right.
   MOVING: ◀ ▶ walk, ▲ jump (one cell up), gravity: you fall down your own shafts. DIGGING: hold the action and a
   direction: ▼ down, ◀ ▶ sideways, ▼ with ◀ or ▶ the lower diagonal (it digs the side cell and the one under it: a
   staircase you can walk back up). No direction digs the way you face. You can't dig straight up. Soft 0.18 s, packed
   0.45 s; holding keeps digging.
   GEMS: touch to collect: small 1, big 3, the round's STAR GEM 8 (deep, on the centre line, in a rock-walled pocket with
   one entrance each side). Twice a round the golem sprinkles 5 new small gems into the upper tunnels.
   SABOTAGE: a boulder that lands on a digger BURIES them (1.5 s) and they drop 3 gem points as small gems nearby for
   anyone to grab. Both digging the same cell from opposite sides: CLANG, both bounce back. In a tunnel, the action
   facing the other digger SHOVES them a cell (0.8 s cooldown).
   A ROUND: 50 s, or early once the star gem and 80% of the gem points are taken. Most points wins it. Level: 10 s of
   sudden death, a star gem drops in the middle and the first to touch it wins. First to 3 rounds wins the match.
   TWISTS (the golem holds up a sign): 1 Plain Dig, 2 Boulder Field, 3 Wet Dig (lots of water and a stream across the
   middle that carries diggers outward), 4 Lights Low (only gems, the headlamps and pillar flashes show), 5 Motherlode
   (a rock vault at the bottom with three star gems, a narrow soft seam into it each side, and a door in its roof that
   opens when both stand on the two plates at once).
   CATCH-UP HELP (gold, announced at GO, counted, off in sudden death): a GOLD SHOVEL for whoever is a round behind:
   digs 20% faster and Buried lasts 1 s.
   CONTROLS: p.input / p.pendingAct only, so keyboard, controller and touch all work.
   MODES.gemrush.plan(st, id, o) (the computer's route to the best gems per second over the grid) feeds the brain.
   Sounds are Sfx.extra.gemrush*. */
(() => {
  const K = CAVE, TAU = Math.PI * 2;
  const GR = {
    cell: 26, cols: 34, rows: 46, ox: 38, oy: 58, creep: 14, walk: 110, grav: 1500, jumpV: 335, maxFall: 700,
    soft: 0.18, packed: 0.45, gasT: 0.3, waterT: 0.3, gold: 0.8, roundT: 50, sdT: 10, buryT: 1.5, goldBury: 1,
    coughT: 2, floodT: 3, geyserEvery: 5, geyserV: 520, shoveCD: 0.8, pillarT: 2, liftT: 2, w: 18, h: 22,
    sprinkle: [16, 33],
  };
  const C_ = GR.cell, NC = GR.cols, NR = GR.rows;
  // cell kinds
  const E = 0, SOFT = 1, PACK = 2, ROCK = 3, CRUM = 4, GAS = 5, WAT = 6, PIL = 7, BOUL = 8, VENT = 9, PLATE = 10, DOOR = 11;
  const DIGT = { [SOFT]: GR.soft, [PACK]: GR.packed, [CRUM]: GR.soft, [GAS]: GR.gasT, [WAT]: GR.waterT };
  const solid = k => k !== E;
  const diggable = k => DIGT[k] !== undefined;
  const TWISTS = [
    { title: 'Plain Dig', sign: 'PLAIN DIG' },
    { title: 'Boulder Field', sign: 'BOULDERS!' },
    { title: 'Wet Dig', sign: 'WET DIG' },
    { title: 'Lights Low', sign: 'LIGHTS LOW' },
    { title: 'Motherlode', sign: 'MOTHERLODE' },
  ];

  /* ---------- the chamber: built mirrored for each round ---------- */
  function build(st, k) {
    const g = [], R = Math.random;
    for (let r = 0; r < NR; r++) g.push(new Array(NC).fill(E));
    const set = (r, c, v) => { if (r >= 0 && r < NR && c >= 0 && c < NC) { g[r][c] = v; g[r][NC - 1 - c] = v; } };
    const gems = [];
    const gem = (r, c, v) => { gems.push({ r, c, v, x: (c + 0.5) * C_, y: (r + 0.5) * C_, got: false }); if (c !== NC - 1 - c) gems.push({ r, c: NC - 1 - c, v, x: (NC - 1 - c + 0.5) * C_, y: (r + 0.5) * C_, got: false }); };
    const half = NC / 2;
    // the earth, softer near the top
    for (let r = 3; r < NR; r++) for (let c = 0; c < half; c++) {
      const d = r / NR, u = R();
      set(r, c, u < 0.75 - d * 0.45 ? SOFT : u < 0.97 - d * 0.1 ? PACK : ROCK);
    }
    // the side walls and the floor: rock
    for (let r = 0; r < NR; r++) set(r, 0, ROCK);
    for (let c = 0; c < half; c++) set(NR - 1, c, ROCK);
    // rock blobs
    const blobs = 5 + Math.floor(R() * 3);
    for (let n = 0; n < blobs; n++) { const r = 8 + Math.floor(R() * (NR - 12)), c = 2 + Math.floor(R() * (half - 4)), w = 1 + Math.floor(R() * 3); for (let a = 0; a < w; a++) for (let b = 0; b < 2; b++) set(r + b, c + a, ROCK); }
    // hollows with geysers
    for (let n = 0; n < 2; n++) { const r = 10 + n * 12 + Math.floor(R() * 5), c = 3 + Math.floor(R() * (half - 7)); for (let a = 0; a < 3; a++) { set(r, c + a, E); set(r - 1, c + a, E); set(r + 1, c + a, ROCK); } set(r + 1, c + 1, VENT); }
    // crystal pillars
    for (let n = 0; n < 2; n++) { const r = 9 + Math.floor(R() * (NR - 16)), c = 3 + Math.floor(R() * (half - 5)); set(r, c, PIL); set(r + 1, c, PIL); }
    // crumble seams
    for (let n = 0; n < 2; n++) { const r = 7 + Math.floor(R() * (NR - 14)), c = 2 + Math.floor(R() * (half - 7)); for (let a = 0; a < 4; a++) set(r, c + a, CRUM); }
    // gas and water pockets, boulders
    const nb = k === 1 ? 13 : 4, nw = k === 2 ? 9 : 2, ng = 3;
    const spot = (r0, r1) => { for (let tries = 0; tries < 40; tries++) { const r = r0 + Math.floor(R() * (r1 - r0)), c = 2 + Math.floor(R() * (half - 3)); if (g[r][c] === SOFT || g[r][c] === PACK) return [r, c]; } return null; };
    for (let n = 0; n < ng; n++) { const s = spot(6, NR - 4); if (s) set(s[0], s[1], GAS); }
    for (let n = 0; n < nw; n++) { const s = spot(5, NR - 6); if (s) set(s[0], s[1], WAT); }
    for (let n = 0; n < nb; n++) { const s = spot(4, NR - 6); if (s && solid(g[s[0] + 1][s[1]])) set(s[0], s[1], BOUL); }
    // Wet Dig: an underground stream across the middle
    if (k === 2) { const r = 20; for (let c = 2; c < half; c++) { set(r, c, E); set(r + 1, c, c % 5 === 0 ? PACK : ROCK); } st.stream = r; } else st.stream = -1;
    // gems: small and big, more and bigger deeper
    for (let n = 0; n < 15; n++) { const s = spot(4, NR - 4); if (s) gem(s[0], s[1], s[0] > 22 && R() < 0.45 ? 3 : 1); }
    for (let n = 0; n < 3; n++) { const s = spot(16, NR - 4); if (s) gem(s[0], s[1], 3); }
    // the star gem: deep on the centre line in a rock-walled pocket, one entrance each side
    const sr = 33 + Math.floor(R() * 4);
    st.stars = [];
    if (k !== 4) {
      for (const c of [half - 3, half - 2, half - 1]) { set(sr - 1, c, ROCK); set(sr + 1, c, ROCK); }
      set(sr, half - 1, E); set(sr, half - 2, SOFT);
      st.stars.push({ x: half * C_, y: (sr + 0.5) * C_, r: sr, c: half - 1, cs: [half - 1, half], v: 8, got: false, star: true });
    } else {
      // Motherlode: the vault at the bottom (rows vr-1..vr+3), three star gems, a seam each side, a door in its roof
      const vr = NR - 7;
      for (let r = vr - 1; r <= vr + 3; r++) for (let c = half - 6; c < half; c++) set(r, c, ROCK);
      for (let r = vr; r <= vr + 2; r++) for (let c = half - 5; c < half; c++) set(r, c, E);
      // the narrow soft seam down the side into the vault
      for (let r = vr - 9; r <= vr + 1; r++) set(r, half - 7, SOFT);
      set(vr + 1, half - 6, SOFT);
      set(vr - 1, half - 1, DOOR);
      // the plates on the vault roof (stand on both at once)
      set(vr - 1, half - 4, PLATE);
      st.vault = { r: vr, open: false, plates: [[vr - 1, half - 4], [vr - 1, NC - 1 - (half - 4)]] };
      st.stars.push({ x: (half - 3.5) * C_, y: (vr + 2.5) * C_, r: vr + 2, c: half - 4, v: 8, got: false, star: true });
      st.stars.push({ x: half * C_, y: (vr + 2.5) * C_, r: vr + 2, c: half - 1, cs: [half - 1, half], v: 8, got: false, star: true });
      st.stars.push({ x: (NC - 1 - (half - 4) + 0.5) * C_, y: (vr + 2.5) * C_, r: vr + 2, c: NC - 1 - (half - 4), v: 8, got: false, star: true });
    }
    // the surface: open air in rows 0-2, a ledge to start on
    for (let r = 0; r < 3; r++) for (let c = 1; c < half; c++) set(r, c, E);
    // never a boulder or a hazard right under the start
    for (let c = 1; c < 6; c++) for (let r = 3; r < 6; r++) if (g[r][c] !== SOFT && g[r][c] !== PACK) set(r, c, SOFT);
    st.g = g; st.gems = gems.concat(st.stars);
    st.total = st.gems.reduce((a, q) => a + q.v, 0);
  }
  const cellAt = (st, r, c) => (r < 0 ? E : r >= NR || c < 0 || c >= NC ? ROCK : st.g[r][c]);
  const colOf = x => Math.floor(x / C_), rowOf = y => Math.floor(y / C_);
  const cellOf = P => ({ r: rowOf(P.y - 4), c: colOf(P.x) });

  /* ---------- a round ---------- */
  function newRound(st, n, info) {
    const k = st.forceRound != null ? st.forceRound : Math.min(n - 1, TWISTS.length - 1);
    st.k = k; st.round = n; st.tw = TWISTS[k]; st.lastPick = 0;
    build(st, k);
    const w = info.wins || [0, 0];
    st.pl = [0, 1].map(id => ({
      id, x: id === 0 ? 3.5 * C_ : (NC - 3.5) * C_, y: 3 * C_, vx: 0, vy: 0, ground: true, face: id === 0 ? 1 : -1, ph: 0,
      dig: null, digAnim: 0, buried: 0, cough: 0, lift: 0, liftTo: null, knock: 0, shoveCD: 0, pts: 0, gold: info.suddenDeath || st.noHelp ? 0 : (w[1 - id] - w[id] >= 1 ? 1 : 0),
      streak: 0, streakT: 0, plate: false, geyT: 0,
    }));
    st.t = 0; st.cam = 0; st.falling = []; st.clouds = []; st.floods = []; st.res = null; st.sd = info.suddenDeath ? 0 : -1; st.sdStar = null;
    st.flash = []; st.sprinkled = 0; st.sprinkle = []; st.geyT = 0; st.lit = 0; st.endT = -1; st.chuckle = 0; st.clap = 0;
    st.known = [0, 1].map(() => st.g.map(row => row.map(() => false)));
    K.fx(st);
    for (let id = 0; id < 2; id++) { const o = K.ofx(st, id); o.hatDown = 0; o.sack = 0; }
    mirror(st);
  }

  /* ---------- the tick ---------- */
  function tick(st, dt, live) {
    if (!st.pl) return;
    st.clock += dt;
    if (live) {
      st.t += dt;
      for (const P of st.pl) digger(st, P, dt);
      shoves(st);
      fallStep(st, dt); cloudStep(st, dt); floodStep(st, dt); geysers(st, dt); sprinkle(st, dt); vault(st);
      pickups(st);
      roundEnd(st, dt);
      if (st.chuckle > 0) st.chuckle -= dt;
    }
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    camera(st, dt);
    lightLearn(st);
    K.tickOfx(st, dt);
    K.tickFx(st, dt);
    mirror(st);
  }

  function digger(st, P, dt) {
    const p = G.players[P.id], i = p.input;
    if (P.shoveCD > 0) P.shoveCD -= dt;
    if (P.cough > 0) P.cough -= dt;
    if (P.knock > 0) P.knock -= dt;
    if (P.buried > 0) { P.buried -= dt; P.dig = null; return; }
    if (P.lift > 0) { P.lift -= dt; P.dig = null; if (P.lift <= 0 && P.liftTo) { P.x = P.liftTo.x; P.y = P.liftTo.y; P.vx = P.vy = 0; } return; }
    const lr = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    if (lr) P.face = lr;
    // digging: hold the action (and a direction)
    const cc = cellOf(P);
    if (i.act && P.ground && P.knock <= 0) {
      const dr = i.down ? 1 : 0, dc = lr || (i.down ? 0 : P.face);
      let tgt = null;
      if (dr && dc) {
        // the lower diagonal: the side cell first, then the one under it
        const side = cellAt(st, cc.r, cc.c + dc), low = cellAt(st, cc.r + 1, cc.c + dc);
        if (solid(side)) tgt = { r: cc.r, c: cc.c + dc };
        else if (solid(low)) tgt = { r: cc.r + 1, c: cc.c + dc };
      } else if (dr) tgt = { r: cc.r + 1, c: cc.c };
      else tgt = { r: cc.r, c: cc.c + dc };
      if (tgt) {
        const k = cellAt(st, tgt.r, tgt.c);
        if (k === E) { P.dig = null; if (!dr && lr) walk(st, P, lr, dt); }
        else if (!diggable(k)) { if (!P.dig || P.dig.r !== tgt.r || P.dig.c !== tgt.c) { Sfx.play('gemrushDigBlocked'); K.spark(st, scrX(st, (tgt.c + 0.5) * C_), scrY(st, (tgt.r + 0.5) * C_), 3, ['#ffffff']); if (k === PIL) ring(st, tgt.r, tgt.c); } P.dig = { r: tgt.r, c: tgt.c, t: 0, need: 99, blocked: true }; }
        else {
          if (!P.dig || P.dig.r !== tgt.r || P.dig.c !== tgt.c) P.dig = { r: tgt.r, c: tgt.c, t: 0, need: DIGT[k], start: st.t };
          // (sp is the time factor: the gold shovel takes 0.8 of the time, a cough twice the time. It used to be 1 / 0.8, which
          // made the gold shovel 25% SLOWER, so whoever lost a round usually lost the next ones too)
          const sp = (P.gold ? GR.gold : 1) * (P.cough > 0 ? 2 : 1);
          P.dig.t += dt / sp;
          P.digAnim += dt;
          if (Math.floor(P.digAnim * 9) !== Math.floor((P.digAnim - dt) * 9)) K.dust(st, scrX(st, (tgt.c + 0.5) * C_), scrY(st, (tgt.r + 0.5) * C_), '#9a7250', 2);
          if (P.dig.t >= P.dig.need) { dug(st, P, tgt.r, tgt.c, k); P.dig = null; }
        }
      }
      P.vx = 0;
    } else {
      P.dig = null;
      walk(st, P, P.knock > 0 ? 0 : lr, dt);
    }
    // jump (one cell)
    if (p.pendingJump && P.ground && P.knock <= 0) { P.vy = -GR.jumpV; P.ground = false; Sfx.play('gemrushJump'); }
    // the stream (Wet Dig) carries anyone in it outward
    if (st.stream >= 0 && cc.r === st.stream && P.ground && !i.act) { const dir = P.x < NC * C_ / 2 ? -1 : 1; move(st, P, dir * 70 * dt, 0); }
    // gravity
    P.vy = Math.min(GR.maxFall, P.vy + GR.grav * dt);
    const was = P.ground;
    P.ground = false;
    move(st, P, 0, P.vy * dt);
    if (P.ground && !was && P.vy >= 0) { /* landed */ }
    if (P.ground) P.vy = 0;
    // pillars ring when touched
    for (const dc of [-1, 1]) if (cellAt(st, cc.r, cc.c + dc) === PIL && Math.abs(P.x - (cc.c + dc + 0.5) * C_) < C_ * 0.5 + GR.w / 2 + 2) ring(st, cc.r, cc.c + dc);
    // the golem's fingers: a digger left above the top of the screen
    if (P.y - GR.h < st.cam - 6 && st.res === null) lift(st, P);
    // plates (Motherlode)
    P.plate = !!(st.vault && !st.vault.open && st.vault.plates.some(([r, c]) => cc.r + 1 === r && cc.c === c && P.ground));
    // sealed in by rock (no way to dig, walk or jump out): after 1.5 s the golem taps the rock beside you and it cracks to soft earth
    if (P.ground) {
      const open = k => k === E || diggable(k), side = dc => open(cellAt(st, cc.r, cc.c + dc));
      const up = dc => cellAt(st, cc.r - 1, cc.c) === E && cellAt(st, cc.r - 1, cc.c + dc) === E;
      const way = side(-1) || side(1) || diggable(cellAt(st, cc.r + 1, cc.c)) || up(-1) || up(1);
      P.sealed = way ? 0 : (P.sealed || 0) + dt;
      if (P.sealed > 1.5) {
        P.sealed = 0;
        const dc = cc.c < NC / 2 ? 1 : -1, tc = cellAt(st, cc.r, cc.c + dc) === ROCK || cellAt(st, cc.r, cc.c + dc) === PIL ? cc.c + dc : cc.c - dc;
        if (tc > 0 && tc < NC - 1) { st.g[cc.r][tc] = SOFT; Sfx.play('gemrushDigBlocked'); K.spark(st, scrX(st, (tc + 0.5) * C_), scrY(st, (cc.r + 0.5) * C_), 8, ['#ffffff', '#bfeef2']); K.pop(st, scrX(st, (tc + 0.5) * C_), scrY(st, cc.r * C_) - 8, 'Crack!', '#bfeef2', 15); }
      }
    }
  }
  function walk(st, P, lr, dt) {
    const target = lr * GR.walk;
    P.vx = P.knock > 0 ? P.vx * (1 - dt * 3) : target;
    if (P.vx) { move(st, P, P.vx * dt, 0); if (P.ground) P.ph += dt * 12; }
  }
  // move with collision against solid cells (box GR.w x GR.h, feet at P.y)
  function move(st, P, dx, dy) {
    const hw = GR.w / 2, hh = GR.h;
    if (dx) {
      let nx = P.x + dx;
      const top = rowOf(P.y - hh + 1), bot = rowOf(P.y - 1);
      const edge = dx > 0 ? colOf(nx + hw) : colOf(nx - hw);
      for (let r = top; r <= bot; r++) if (solid(cellAt(st, r, edge))) { nx = dx > 0 ? edge * C_ - hw - 0.01 : (edge + 1) * C_ + hw + 0.01; break; }
      P.x = nx;
    }
    if (dy) {
      let ny = P.y + dy;
      const l = colOf(P.x - hw + 1), rr2 = colOf(P.x + hw - 1);
      if (dy > 0) { const row = rowOf(ny); for (let c = l; c <= rr2; c++) if (solid(cellAt(st, row, c))) { ny = row * C_; P.ground = true; break; } }
      else { const row = rowOf(ny - hh); for (let c = l; c <= rr2; c++) if (solid(cellAt(st, row, c))) { ny = (row + 1) * C_ + hh + 0.01; P.vy = 0; break; } }
      P.y = ny;
    }
  }
  // a cell dug out: hazards wake up
  function dug(st, P, r, c, k) {
    st.g[r][c] = E;
    st.stat.dug[P.id]++;
    K.ofx(st, P.id).dirt = Math.min(1, K.ofx(st, P.id).dirt + 0.006);
    Sfx.play(k === PACK ? 'gemrushDigPacked' : 'gemrushDigSoft');
    // the other digger on the same cell from the other side: CLANG
    const O = st.pl[1 - P.id];
    if (O.dig && O.dig.r === r && O.dig.c === c && O.dig.start !== undefined && Math.abs(O.dig.start - P.dig.start) < 0.3) {
      Sfx.play('gemrushShovelClang');
      for (const Q of [P, O]) { Q.knock = 0.25; Q.vx = (Q.x < (c + 0.5) * C_ ? -1 : 1) * 220; Q.dig = null; }
      st.stat.clangs++;
      K.pop(st, scrX(st, (c + 0.5) * C_), scrY(st, r * C_) - 10, 'CLANG!', '#ffffff', 18);
    }
    if (k === GAS) { st.clouds.push({ x: (c + 0.5) * C_, y: (r + 0.5) * C_, t: 0 }); Sfx.play('gemrushGasPuff'); }
    if (k === WAT) flood(st, r, c);
    wake(st, r, c, P.id);
  }
  // look above a cell that just opened: a boulder falls, a crumble row drops
  function wake(st, r, c, by) {
    const up = cellAt(st, r - 1, c);
    if (up === BOUL) { st.g[r - 1][c] = E; st.falling.push({ c, y: (r - 1) * C_, vy: 0, wob: 0.25, by }); Sfx.play('gemrushBoulderRumble'); }
    if (up === CRUM) crumble(st, r - 1, c);
  }
  function crumble(st, r, c) {
    let a = c, b = c;
    while (cellAt(st, r, a - 1) === CRUM) a--;
    while (cellAt(st, r, b + 1) === CRUM) b++;
    for (let x = a; x <= b; x++) {
      st.g[r][x] = E;
      // the dirt falls into the tunnel below it
      let y = r + 1;
      while (y < NR - 1 && cellAt(st, y + 1, x) === E) y++;
      if (cellAt(st, y, x) === E && !st.pl.some(P => { const q = cellOf(P); return q.c === x && Math.abs(q.r - y) <= 0; })) st.g[y][x] = SOFT;
      K.dust(st, scrX(st, (x + 0.5) * C_), scrY(st, (r + 0.5) * C_), '#c8a878', 3);
    }
    for (let x = a; x <= b; x++) wake(st, r, x);
    Sfx.play('gemrushCrumbleRow');
  }
  function fallStep(st, dt) {
    for (const f of st.falling) {
      if (f.wob > 0) { f.wob -= dt; continue; }
      f.vy = Math.min(600, f.vy + GR.grav * dt);
      const ny = f.y + f.vy * dt, below = rowOf(ny + C_);
      // a digger under it: buried
      for (const P of st.pl) {
        if (P.lift > 0) continue;
        // the boulder breaks up on the digger it buries (left sitting on their head it floated in mid-air once they
        // walked off, and a digger who dug straight on down would be buried by the same boulder again and again)
        if (Math.abs(P.x - (f.c + 0.5) * C_) < C_ * 0.5 + GR.w / 2 - 4 && ny + C_ > P.y - GR.h && ny < P.y) {
          if (P.buried <= 0) bury(st, P, f.by);
          f.done = true; Sfx.play('gemrushBoulderThud'); G.shake = Math.max(G.shake || 0, 0.15);
          for (let n = 0; n < 3; n++) K.dust(st, scrX(st, (f.c + 0.5) * C_) + (n - 1) * 8, scrY(st, P.y - GR.h), '#8a8480', 4);
          break;
        }
      }
      if (f.done) continue;
      if (solid(cellAt(st, below, f.c))) { f.y = (below - 1) * C_; settle(st, f); f.done = true; }
      else f.y = ny;
    }
    st.falling = st.falling.filter(f => !f.done);
    // nothing floats: a boulder left with nothing under it (the one below it fell, a digger it buried walked away, a
    // geyser or a crumbled row opened the cell) falls too, unless a digger is standing right under it
    st.scanT = (st.scanT || 0) - dt;
    if (st.scanT <= 0) {
      st.scanT = 0.1;
      for (let r = NR - 3; r >= 0; r--) for (let c = 1; c < NC - 1; c++) {
        if (st.g[r][c] !== BOUL || st.g[r + 1][c] !== E) continue;
        if (st.pl.some(P => { const q = cellOf(P); return P.lift <= 0 && q.c === c && (q.r === r + 1 || q.r === r); })) continue;
        st.g[r][c] = E; st.falling.push({ c, y: r * C_, vy: 0, wob: 0.25 }); Sfx.play('gemrushBoulderRumble');
      }
    }
  }
  function settle(st, f) {
    let r = Math.round(f.y / C_);
    while (r > 0 && cellAt(st, r, f.c) !== E) r--;
    if (r >= 0 && r < NR) st.g[r][f.c] = BOUL;
    Sfx.play('gemrushBoulderThud'); G.shake = Math.max(G.shake || 0, 0.15);
  }
  function bury(st, P, by) {
    P.buried = P.gold ? GR.goldBury : GR.buryT; P.dig = null; P.vx = 0;
    st.stat.buried[P.id]++;
    if (by !== undefined && by !== null) st.stat.caveins[by]++;
    Sfx.play('gemrushBuried'); st.chuckle = 1.4; Sfx.play('gemrushGolemChuckle');
    K.pop(st, scrX(st, P.x), scrY(st, P.y) - 40, 'Buried!', '#ffd0a0', 18);
    // drops 3 gem points nearby, for anyone to grab
    const n = Math.min(3, P.pts);
    if (n > 0) {
      P.pts -= n; Sfx.play('gemrushGemScatter');
      const cc = cellOf(P), spots = [];
      for (let d = 1; d <= 3 && spots.length < n; d++) for (let a = -d; a <= d && spots.length < n; a++) for (const b of [-d, d, 0]) { const r = cc.r + b, c = cc.c + a; if (cellAt(st, r, c) === E && solid(cellAt(st, r + 1, c)) && !spots.some(s => s[0] === r && s[1] === c) && spots.length < n) spots.push([r, c]); }
      while (spots.length < n) spots.push([cc.r, cc.c + (spots.length % 2 ? 1 : -1)]);
      for (const [r, c] of spots) st.gems.push({ r, c, v: 1, x: (c + 0.5) * C_, y: (r + 0.5) * C_, got: false, drop: 0.4 });
    }
  }
  function cloudStep(st, dt) {
    for (const q of st.clouds) {
      q.t += dt;
      const r = rowOf(q.y), c = colOf(q.x);
      if (cellAt(st, r - 1, c) === E && q.t > 0.3) q.y -= 40 * dt;
      for (const P of st.pl) if (Math.hypot(P.x - q.x, P.y - 12 - q.y) < 30 && P.cough <= 0.2) { if (P.cough <= 0) Sfx.play('gemrushCough'); P.cough = GR.coughT; }
    }
    st.clouds = st.clouds.filter(q => q.t < 2.6);
  }
  // water: down the open tunnel under the pocket; anyone in it is washed to the bottom
  function flood(st, r, c) {
    let y = r; while (y < NR - 1 && cellAt(st, y + 1, c) === E) y++;
    st.floods.push({ c, r0: r, r1: y, t: 0 });
    Sfx.play('gemrushWaterGush');
    for (const P of st.pl) { const q = cellOf(P); if (q.c === c && q.r >= r && q.r <= y && y > q.r) { P.x = (c + 0.5) * C_; P.y = (y + 1) * C_ - 0.01; P.vy = 0; Sfx.play('gemrushWashAway'); K.pop(st, scrX(st, P.x), scrY(st, P.y) - 40, 'Whoosh!', '#bfe6ff', 16); } }
  }
  function floodStep(st, dt) { for (const f of st.floods) f.t += dt; st.floods = st.floods.filter(f => f.t < GR.floodT); }
  function geysers(st, dt) {
    const prev = st.geyT; st.geyT += dt;
    const fire = Math.floor(st.geyT / GR.geyserEvery) !== Math.floor(prev / GR.geyserEvery);
    st.geyOn = (st.geyT % GR.geyserEvery) < 0.5;
    if (!fire) return;
    let any = false;
    for (const P of st.pl) {
      const q = cellOf(P);
      if (cellAt(st, q.r + 1, q.c) !== VENT || !P.ground || P.buried > 0 || P.lift > 0) continue;
      // the jet blasts the earth above the vent open (up to 6 cells, not through rock) and a nook each side at the top,
      // so it really is a way back up: steer ◀ ▶ at the top to step off. (The hollow is only 2 cells high and nobody
      // can dig upward, so before this the jet only bumped the digger's head on the roof.)
      let top = q.r;
      for (let r = q.r - 1; r >= Math.max(3, q.r - 6); r--) { const k = cellAt(st, r, q.c); if (k !== E && !diggable(k)) break; st.g[r][q.c] = E; top = r; }
      if (top < q.r - 1) for (const dc of [-1, 1]) { const k = cellAt(st, top, q.c + dc); if (diggable(k)) st.g[top][q.c + dc] = E; }
      K.dust(st, scrX(st, P.x), scrY(st, top * C_), '#9a7250', 8);
      P.vy = -Math.max(GR.geyserV, Math.sqrt(2 * GR.grav * ((q.r - top) * C_ + 10))); P.ground = false; P.dig = null; any = true; st.stat.geysers[P.id]++;
      if (!K.quiet(P.id)) K.pop(st, scrX(st, P.x), scrY(st, P.y) - 44, 'Whoosh! Steer off at the top', '#bfe6ff', 15);
    }
    Sfx.play(any ? 'gemrushGeyserLaunch' : 'gemrushGeyserPuff');
  }
  function ring(st, r, c) {
    const key = r + ':' + c;
    if (st.flash.some(f => f.key === key && f.t > 0)) return;
    st.flash = st.flash.filter(f => f.t > 0);
    st.flash.push({ key, r, c, t: GR.pillarT });
    Sfx.play('gemrushPillarRing');
  }
  function sprinkle(st, dt) {
    for (const f of st.flash) f.t -= dt;
    if (st.sprinkled < GR.sprinkle.length && st.t > GR.sprinkle[st.sprinkled]) {
      st.sprinkled++;
      Sfx.play('gemrushSprinkle');
      // 5 small gems into the upper tunnels (open cells with a floor), mirrored pairs where it can
      const top = rowOf(st.cam) + 1, spots = [];
      for (let r = top; r < top + 14 && r < NR - 1; r++) for (let c = 1; c < NC / 2; c++) if (cellAt(st, r, c) === E && solid(cellAt(st, r + 1, c)) && cellAt(st, r, NC - 1 - c) === E && solid(cellAt(st, r + 1, NC - 1 - c))) spots.push([r, c]);
      for (let n = 0; n < 3 && spots.length; n++) {
        const [r, c] = spots.splice(Math.floor(Math.random() * spots.length), 1)[0];
        for (const cc of n < 2 ? [c, NC - 1 - c] : [Math.random() < 0.5 ? c : NC - 1 - c]) if (st.gems.filter(q => q.sprk === st.sprinkled).length < 5) { st.gems.push({ r, c: cc, v: 1, x: (cc + 0.5) * C_, y: (r + 0.5) * C_, got: false, sprk: st.sprinkled, drop: 0.8 }); st.total++; }
      }
      st.sprinkle.push({ t: 0 });
      K.msg(st, 'The golem sprinkles more gems!', '#bff8ef', 2);
    }
    for (const s of st.sprinkle) s.t += dt;
    st.sprinkle = st.sprinkle.filter(s => s.t < 1.4);
  }
  function vault(st) {
    const v = st.vault; if (!v || v.open) return;
    if (st.pl[0].plate && st.pl[1].plate) {
      v.open = true;
      const half = NC / 2;
      for (const c of [half - 1, half]) st.g[v.r - 1][c] = E;
      Sfx.play('gemrushVaultOpen'); G.shake = 0.3;
      K.msg(st, 'The vault door is open! Race for the star gems!', C.gold, 2.4);
    }
  }
  function lift(st, P) {
    // carried down in the golem's fingers to an open spot on screen (2 s)
    P.lift = GR.liftT; P.dig = null;
    let best = null;
    const want = st.cam + 180;
    for (let r = rowOf(st.cam) + 2; r < NR - 1; r++) for (let c = 1; c < NC - 1; c++) {
      if (cellAt(st, r, c) !== E || !solid(cellAt(st, r + 1, c))) continue;
      const d = Math.abs(r * C_ - want) + Math.abs((c + 0.5) * C_ - P.x) * 0.5;
      if (!best || d < best.d) best = { d, r, c };
    }
    if (!best) { const r = rowOf(want), c = colOf(P.x); st.g[r][c] = E; best = { r, c }; }
    P.liftTo = { x: (best.c + 0.5) * C_, y: (best.r + 1) * C_ - 0.01 };
    Sfx.play('gemrushGolemLift');
    K.pop(st, scrX(st, P.x), 90, 'Lifted down!', '#ffffff', 16);
  }
  function shoves(st) {
    for (const P of st.pl) {
      const p = G.players[P.id], O = st.pl[1 - P.id];
      if (!p.pendingAct || P.shoveCD > 0 || P.buried > 0 || O.buried > 0 || P.lift > 0 || O.lift > 0) continue;
      const dir = Math.sign(O.x - P.x);
      if (Math.abs(O.x - P.x) < C_ + 6 && Math.abs(O.y - P.y) < 10 && dir === P.face) {
        P.shoveCD = GR.shoveCD; O.knock = 0.3; O.vx = dir * 260; O.dig = null;
        st.stat.shoves[P.id]++;
        Sfx.play('gemrushShove');
        K.pop(st, scrX(st, O.x), scrY(st, O.y) - 40, 'Shove!', '#ffffff', 16);
      }
    }
  }
  function pickups(st) {
    const order = Math.random() < 0.5 ? st.pl : [st.pl[1], st.pl[0]];
    for (const q of st.gems) {
      if (q.got) continue;
      if (q.drop > 0) { q.drop -= 1 / 120; continue; }
      if (st.g[q.r] && solid(cellAt(st, q.r, q.c)) && !q.star) continue;
      // a loose gem (its cell dug open) tumbles down to the next floor
      if (!q.star && !q.sd && q.r < NR - 1 && cellAt(st, q.r + 1, q.c) === E) { q.vy = Math.min(500, (q.vy || 0) + GR.grav / 120); q.y += q.vy / 120; if (q.y > (q.r + 1.5) * C_) q.r++; }
      else if (q.vy) { q.vy = 0; q.y = (q.r + 0.5) * C_; }
      for (const P of order) {
        if (P.buried > 0 || P.lift > 0) continue;
        if (Math.abs(P.x - q.x) < 17 && Math.abs((P.y - GR.h / 2) - q.y) < 18) {
          q.got = true; P.pts += q.v; st.stat.gems[P.id] += q.v; st.lastPick = st.t;
          if (q.star) { st.stat.stars[P.id]++; Sfx.play('gemrushStarGem'); K.pop(st, scrX(st, q.x), scrY(st, q.y) - 30, 'STAR GEM! +8', C.gold, 22); K.spark(st, scrX(st, q.x), scrY(st, q.y), 20, [C.gold, '#ffffff']); }
          else {
            P.streak = st.t - P.streakT < 1.5 ? P.streak + 1 : 0; P.streakT = st.t;
            Sfx.play(q.v >= 3 ? 'gemrushBigGem' : 'gemrushGemTing', 1 + Math.min(P.streak, 8) * 0.06);
            K.pop(st, scrX(st, q.x), scrY(st, q.y) - 20, '+' + q.v, q.v >= 3 ? C.gold : '#bff8ef', 15);
          }
          K.ofx(st, P.id).sack = Math.min(1, P.pts / 30);
          if (st.sdStar === q) { st.res = true; matchRoundEnd(P.id, NAMES[P.id] + ' grabbed the sudden-death star!'); }
          break;
        }
      }
    }
  }
  function roundEnd(st, dt) {
    if (st.res) return;
    const left = GR.roundT - st.t;
    if (st.sd < 0 && left <= 10 && left + dt > 10) Music.cue({ song: 'cavedigFast' });
    if (st.sd < 0 && left <= 5 && Math.ceil(left) !== Math.ceil(left + dt)) Sfx.play('gemrushTimerTick');
    const starsLeft = st.gems.some(q => q.star && !q.got), taken = st.gems.reduce((a, q) => a + (q.got ? q.v : 0), 0);
    const [A, B] = st.pl;
    // also over early when every gem left is above both diggers (you cannot dig up) and nobody has found one for 6 s
    const below = P => cellOf(P).r, dry = st.t > 20 && st.t - (st.lastPick || 0) > 6 && st.gems.every(q => q.got || (q.r < below(A) - 1 && q.r < below(B) - 1));
    if (st.sd < 0 && (st.t >= GR.roundT || (!starsLeft && taken >= st.total * 0.8) || dry)) {
      if (A.pts !== B.pts) { finishRound(st, A.pts > B.pts ? 0 : 1, (A.pts > B.pts ? 'Pip' : 'Bo') + ' dug up more gems! ' + Math.max(A.pts, B.pts) + ' to ' + Math.min(A.pts, B.pts)); return; }
      // level: sudden death
      st.sd = 0; startSD(st);
    } else if (st.sd >= 0) {
      st.sd += dt;
      if (st.sd > GR.sdT) { st.res = true; matchRoundEnd(-1, 'Nobody reached the star. A tie!'); }
    }
  }
  function startSD(st) {
    const c = NC / 2, mid = Math.max(...st.pl.map(P => cellOf(P).r));
    let r = clamp(mid, 4, NR - 3);
    // carve a little hollow in the middle and drop a star into it
    for (const cc of [c - 1, c]) { if (diggable(cellAt(st, r, cc)) || cellAt(st, r, cc) === ROCK || cellAt(st, r, cc) === BOUL) st.g[r][cc] = E; if (!solid(cellAt(st, r + 1, cc))) st.g[r + 1][cc] = ROCK; }
    // make sure both can get there: soft earth (not rock) down the middle and along the row to each digger
    const top = Math.min(...st.pl.map(P => cellOf(P).r));
    const soften = (rr, cc) => { const k = cellAt(st, rr, cc); if (rr > 2 && rr < NR - 1 && cc > 0 && cc < NC - 1 && (k === ROCK || k === BOUL || k === PIL || k === DOOR || k === VENT)) st.g[rr][cc] = SOFT; };
    for (let rr = top; rr < r; rr++) { soften(rr, c - 1); soften(rr, c); }
    for (const P of st.pl) { const pc = cellOf(P); if (pc.r !== r) continue; const d = Math.sign(c - 0.5 - pc.c); for (let cc = pc.c; cc !== c - 1 && cc !== c; cc += d) { soften(r, cc); if (!solid(cellAt(st, r + 1, cc))) st.g[r + 1][cc] = PACK; } }
    st.sdStar = { r, c, cs: [c - 1, c], v: 8, x: c * C_, y: (r + 0.5) * C_, got: false, star: true, sd: true, drop: 0.6 };
    st.gems.push(st.sdStar);
    Sfx.play('gemrushStarGem');
    K.msg(st, 'Level! Sudden death: first to the star gem in the middle wins!', C.gold, 3);
  }
  function finishRound(st, w, reason) {
    st.res = true;
    st.stat.wins[w]++;
    K.ofx(st, 1 - w).hatDown = 1.4;
    Sfx.play('gemrushGolemClap'); Sfx.play('gemrushRoundWin');
    const fin = G.match && G.match.wins[w] + 1 >= G.match.need;
    if (fin) { K.ofx(st, w).crown = 1; Sfx.play('gemrushCrowning'); }
    matchRoundEnd(w, reason);
  }

  /* ---------- the camera and the players' bodies ---------- */
  const viewH = () => H - GR.oy;
  function camera(st, dt) {
    const live = st.pl.filter(P => P.lift <= 0), mid = live.length ? live.reduce((a, P) => a + P.y, 0) / live.length : st.cam + 200;
    const maxCam = NR * C_ - viewH() + 10;
    const want = clamp(Math.max(st.t * GR.creep, mid - viewH() * 0.5), 0, maxCam);
    st.cam = want > st.cam ? approach(st.cam, want, Math.max(30, (want - st.cam) * 3) * dt) : st.cam;
  }
  const scrX = (st, x) => GR.ox + x;
  const scrY = (st, y) => GR.oy + y - st.cam;
  function mirror(st) {
    for (const P of st.pl) {
      if (P.lift > 0) { const p = G.players[P.id]; p.x = -200; p.y = -200; continue; }
      K.place(P.id, scrX(st, P.x), scrY(st, P.y));
    }
  }
  // what each player has seen (for the computer in Lights Low: it only knows what its own lamp and the pillars showed)
  function lightLearn(st) {
    for (let id = 0; id < 2; id++) {
      const P = st.pl[id], cc = cellOf(P), kn = st.known[id];
      for (let r = cc.r - 3; r <= cc.r + 3; r++) for (let c = cc.c - 3; c <= cc.c + 3; c++) if (r >= 0 && r < NR && c >= 0 && c < NC) kn[r][c] = true;
      for (const f of st.flash) if (f.t > 0) for (let r = f.r - 5; r <= f.r + 5; r++) for (let c = f.c - 5; c <= f.c + 5; c++) if (r >= 0 && r < NR && c >= 0 && c < NC) kn[r][c] = true;
    }
  }

  /* ---------- the plan: a route to the best gems per second (the computer reads it) ----------
     Dijkstra over standing spots (cells with something solid under them). Moves: walk or dig sideways, dig down (and fall),
     the lower diagonal (side cell and the one under it), and a jump up one step. o: { star (how much the star counts),
     avoid (boulder lines and gas cost extra), seen (only what the lamp showed, Lights Low), look (also counts gems near
     the target) }. Returns { goal, path: [{r, c, how}], value } or null. */
  function plan(st, id, o = {}) {
    const P = st.pl[id], start = cellOf(P);
    const seen = o.seen ? st.known[id] : null;
    const kind = (r, c) => { const k = cellAt(st, r, c); if (!seen || (r >= 0 && r < NR && c >= 0 && c < NC && seen[r][c])) return k; return k === ROCK || k === PIL ? k : SOFT; };
    const dig = (r, c) => { const k = kind(r, c); if (k === E) return 0; if (!diggable(k)) return Infinity; let t = DIGT[k] * (P.gold ? GR.gold : 1) * (P.cough > 0 ? 2 : 1); if (o.avoid) { if (kind(r - 1, c) === BOUL) t += 3; if (k === GAS) t += 1.5; if (k === WAT) t += 0.6; } return t + (o.pause || 0); };
    const fallTo = (r, c) => { let y = r; while (y < NR - 1 && kind(y + 1, c) === E) y++; return y; };
    const N = NR * NC, dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), how = new Array(N);
    const idx = (r, c) => r * NC + c;
    const s0 = fallTo(start.r, start.c);
    dist[idx(s0, start.c)] = 0;
    const open = [[0, s0, start.c]];
    const push = (d, r, c, from, h) => { const i = idx(r, c); if (d < dist[i]) { dist[i] = d; prev[i] = from; how[i] = h; open.push([d, r, c]); } };
    const step = C_ / GR.walk, DCS = id === 0 ? [-1, 1] : [1, -1];   // mirrored, so ties break the same way for both
    let guard = 0;
    while (open.length && guard++ < 20000) {
      let bi = 0; for (let n = 1; n < open.length; n++) if (open[n][0] < open[bi][0]) bi = n;
      const [d, r, c] = open[bi]; open[bi] = open[open.length - 1]; open.pop();
      if (d > dist[idx(r, c)]) continue;
      const from = idx(r, c);
      for (const dc of DCS) {
        if (c + dc < 1 || c + dc > NC - 2) continue;
        // sideways (dig if needed), then fall
        const t = dig(r, c + dc);
        if (t < Infinity) { const y = fallTo(r, c + dc); push(d + t + step + (y - r) * 0.08 + Math.max(0, y - r - 1) * (o.fall || 0), y, c + dc, from, { k: 'side', dc, dug: t > 0 }); }
        // the lower diagonal
        const t2 = dig(r, c + dc), t3 = dig(r + 1, c + dc);
        if (t2 < Infinity && t3 < Infinity && r + 1 < NR - 1) { const y = fallTo(r + 1, c + dc); push(d + t2 + t3 + step * 1.2, y, c + dc, from, { k: 'diag', dc }); }
        // a jump up one step
        if (r > 0 && kind(r - 1, c) === E && kind(r - 1, c + dc) === E && solid(kind(r, c + dc))) push(d + step * 1.6, r - 1, c + dc, from, { k: 'jump', dc });
      }
      // dig down
      const td = dig(r + 1, c);
      if (td < Infinity && td > 0 && r + 1 < NR - 1) { const y = fallTo(r + 1, c); push(d + td + 0.1 + (o.shaft || 0) + (y - r) * 0.08 + Math.max(0, y - r - 1) * (o.fall || 0), y, c, from, { k: 'down' }); }
    }
    // the best gem per second
    let best = null;
    const targets = st.gems.filter(q => !q.got && (q.drop || 0) <= 0.3);
    if (o.extra) for (const x of o.extra) targets.push(x);
    const gemAt = new Map();
    if (o.route) for (const z of st.gems) if (!z.got && !z.star) { gemAt.set(idx(z.r, z.c), z); gemAt.set(idx(fallTo(z.r, z.c), z.c), z); }
    // going deep cuts off what is left above (you can't dig up): sweep the shallow gems first
    let minR = NR;
    for (const q of targets) if (!q.star && !q.plate && !q.sab && q.r < minR && isFinite(dist[idx(fallTo(q.r, q.c), q.c)])) minR = q.r;
    for (const q of targets) {
      // the spot to stand on to grab it: its own cell (or the one under it)
      let r = q.r, c = q.c;
      if (q.star && q.cs) { const a = dist[idx(fallTo(q.r, q.cs[0]), q.cs[0])], b = dist[idx(fallTo(q.r, q.cs[1]), q.cs[1])]; c = a <= b ? q.cs[0] : q.cs[1]; }
      if (q.sd) c = (P.x < NC * C_ / 2) ? q.c - 1 : q.c;
      const fr = fallTo(r, c);
      let t = dist[idx(fr, c)], end = idx(fr, c), last = null;
      if (solid(kind(r, c)) && !q.star && !q.plate && !q.sab) {
        // a gem still in the dirt: dig into its cell from beside it or from on top of it (it then tumbles down)
        t = Infinity; const tg = dig(r, c);
        if (tg === Infinity) continue;
        for (const dc of DCS) { const sc = c + dc; if (sc < 1 || sc > NC - 2 || fallTo(r, sc) !== r) continue; const d = dist[idx(r, sc)] + tg + step; if (d < t) { t = d; end = idx(r, sc); last = { r: fr, c, how: { k: 'side', dc: -dc } }; } }
        if (r > 0 && fallTo(r - 1, c) === r - 1) { const d = dist[idx(r - 1, c)] + tg + 0.1; if (d < t) { t = d; end = idx(r - 1, c); last = { r: fr, c, how: { k: 'down' } }; } }
      }
      if (!isFinite(t)) continue;
      let v = q.v * (q.star ? (o.star === undefined ? 1 : o.star) : 1) + (q.plate ? q.v : 0);
      if (o.look) for (const z of st.gems) if (!z.got && z !== q && Math.abs(z.r - q.r) + Math.abs(z.c - q.c) <= 3) v += z.v * 0.35;
      // Hard: also counts the gems it digs through on the way
      if (o.route) { let j = end, n = 0; while (j >= 0 && n++ < 80) { const g2 = gemAt.get(j); if (g2 && g2 !== q) v += g2.v * 0.8; j = prev[j]; } }
      // don't race the other digger for a gem it will get first
      const O = st.pl[1 - id], oc = cellOf(O), od = (Math.abs(oc.r - r) + Math.abs(oc.c - c)) * 0.3;
      if (o.contest !== false && od < t * 0.6 && !q.star) v *= 0.5;
      const ideal = Math.max(st.cam / C_ + 11, minR + 3, start.r + 3);
      const deep = Math.max(0, fr - ideal) * (o.sweep === undefined ? 0.15 : o.sweep) * (q.star ? 0.5 : 1);
      const score = (o.near ? Math.sqrt(v) : v) / (t + 0.6) / (1 + deep);
      if (!best || score > best.score) best = { score, q, end, last, t };
    }
    if (!best) return null;
    const path = [];
    let i = best.end;
    while (prev[i] >= 0) { path.unshift({ r: Math.floor(i / NC), c: i % NC, how: how[i] }); i = prev[i]; }
    if (best.last) path.push(best.last);
    return { goal: best.q, path, t: best.t, start: { r: s0, c: start.c } };
  }

  /* ---------- drawing ---------- */
  const KCOL = { [SOFT]: '#8a6040', [PACK]: '#6a4a30', [ROCK]: '#5a5e66', [CRUM]: '#b08a62', [GAS]: '#6a8a4a', [WAT]: '#4a6a8a', [PIL]: '#bfeef2', [BOUL]: '#7a7470', [VENT]: '#4a4e56', [PLATE]: '#d8a84a', [DOOR]: '#6a6e76' };
  // one dirt cell of a seamless 7 x 5 cell block of earth (rm, cm: the cell's place in the block)
  const DIRT_PEB = ['#9a8a7a', '#a89480', '#7e7468', '#b0a090', '#8a6a50', '#6e6660'];
  function dirtBits(k, R, Cc) {
    // what sits in one cell of the block: placement from the shared hash, never Math.random
    const s = 900 + (k === PACK ? 50 : 0) + R * 7 + Cc * 53, out = [];
    const np = RICH.r(s, 1) < 0.55 ? 1 + (RICH.r(s, 2) < 0.3 ? 1 : 0) : 0;
    for (let i = 0; i < np; i++) out.push({ kind: 'peb', x: RICH.r(s, 10 + i) * C_, y: RICH.r(s, 20 + i) * C_, r: 1.8 + RICH.r(s, 30 + i) * 2.2, col: DIRT_PEB[Math.floor(RICH.r(s, 40 + i) * 6)], seed: s + i });
    if (RICH.r(s, 3) < 0.12) out.push({ kind: 'root', x: RICH.r(s, 50) * C_, y: RICH.r(s, 51) * C_ * 0.6, a: RICH.r(s, 52) * 2 - 1, l: 16 + RICH.r(s, 53) * 16, seed: s });
    if (RICH.r(s, 4) < 0.12) out.push({ kind: 'hole', x: 5 + RICH.r(s, 60) * (C_ - 10), y: 5 + RICH.r(s, 61) * (C_ - 10) });
    return out;
  }
  function paintDirtCell(q, k, rm, cm) {
    const col = KCOL[k], X0 = cm * C_, Y0 = rm * C_, BW = 7 * C_, BH = 5 * C_, TAU2 = Math.PI * 2;
    q.fillStyle = col; q.fillRect(0, 0, C_ + 1, C_ + 1);
    // strata: two wavy bands through the block, darker and lighter, seamless across cells and blocks
    const wave = (X, ph) => Math.sin(X / BW * TAU2 * 2 + ph) * 3 + Math.sin(X / BW * TAU2 * 3 + ph * 2) * 1.6;
    for (const [by, th, dark] of [[BH * 0.28, 6, true], [BH * 0.72, 4, false], [BH * 0.5, 2, true]]) {
      for (const wrap of [-BH, 0, BH]) {
        const yc = by + wrap - Y0; if (yc < -14 || yc > C_ + 14) continue;
        q.fillStyle = dark ? RICH.rgba(RICH.dk(col, 0.35), 0.35) : RICH.rgba(RICH.lit(col, 0.2), 0.3);
        q.beginPath(); for (let x = 0; x <= C_ + 1; x += 3) q.lineTo(x, yc + wave(X0 + x, by) - th / 2); for (let x = C_ + 1; x >= 0; x -= 3) q.lineTo(x, yc + wave(X0 + x, by + 1) * 0.7 + th / 2); q.closePath(); q.fill();
      }
    }
    if (k === PACK) {
      // packed earth: fine pressed layers all the way across
      q.strokeStyle = 'rgba(0,0,0,0.2)'; q.lineWidth = 0.9;
      for (let L = 0; L < 10; L++) { const yc = (L + 0.5) * BH / 10 - Y0; if (yc < -4 || yc > C_ + 4) continue; q.beginPath(); for (let x = 0; x <= C_ + 1; x += 3) q.lineTo(x, yc + wave(X0 + x, L * 1.7) * 0.4); q.stroke(); }
      q.strokeStyle = 'rgba(255,230,190,0.1)'; for (let L = 0; L < 10; L++) { const yc = (L + 0.5) * BH / 10 - Y0 + 1.2; if (yc < -4 || yc > C_ + 4) continue; q.beginPath(); for (let x = 0; x <= C_ + 1; x += 3) q.lineTo(x, yc + wave(X0 + x, L * 1.7) * 0.4); q.stroke(); }
    }
    // grains: own to the cell, seeded by its place in the block
    const gs = 700 + k * 31 + rm * 7 + cm * 13;
    q.fillStyle = RICH.rgba(RICH.dk(col, 0.45), 0.5); for (let n = 0; n < 24; n++) q.fillRect(RICH.r(gs, n) * C_, RICH.r(gs + 1, n) * C_, 1.3, 1.3);
    q.fillStyle = RICH.rgba(RICH.lit(col, 0.35), 0.55); for (let n = 0; n < 12; n++) q.fillRect(RICH.r(gs + 2, n) * C_, RICH.r(gs + 3, n) * C_, 1, 1);
    // things that may reach in from the neighbouring cells too
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const bits = dirtBits(k, (rm + dr + 5) % 5, (cm + dc + 7) % 7), ox = dc * C_, oy = dr * C_;
      for (const b of bits) {
        const bx = b.x + ox, by = b.y + oy;
        if (b.kind === 'peb') { if (bx > -b.r - 2 && bx < C_ + b.r + 2 && by > -b.r - 2 && by < C_ + b.r + 2) RICH.pebble(q, bx, by, b.r, k === CRUM ? RICH.lit(b.col, 0.15) : b.col, b.seed); }
        else if (b.kind === 'root') {
          if (bx < -b.l || bx > C_ + b.l || by < -b.l || by > C_ + b.l) continue;
          const ex = bx + Math.cos(b.a) * b.l, ey = by + Math.abs(Math.sin(b.a)) * b.l * 0.6 + b.l * 0.5;
          q.strokeStyle = 'rgba(40,24,12,0.35)'; q.lineWidth = 1.8; q.beginPath(); q.moveTo(bx, by + 0.8); q.quadraticCurveTo((bx + ex) / 2 + 4, (by + ey) / 2 + 0.8, ex, ey + 0.8); q.stroke();
          q.strokeStyle = 'rgba(214,184,136,0.7)'; q.lineWidth = 1.1; q.beginPath(); q.moveTo(bx, by); q.quadraticCurveTo((bx + ex) / 2 + 4, (by + ey) / 2, ex, ey); q.stroke();
          q.lineWidth = 0.7; q.beginPath(); const mx = (bx + ex) / 2 + 2, my = (by + ey) / 2; q.moveTo(mx, my); q.lineTo(mx + 5, my + 4); q.moveTo(ex, ey); q.lineTo(ex - 2, ey + 4); q.stroke();
        } else if (b.kind === 'hole' && dr === 0 && dc === 0) {
          q.fillStyle = RICH.dk(col, 0.6); q.beginPath(); q.ellipse(bx, by, 2.6, 1.8, 0, 0, TAU2); q.fill();
          q.strokeStyle = RICH.rgba(RICH.lit(col, 0.3), 0.6); q.lineWidth = 0.8; q.beginPath(); q.ellipse(bx, by, 2.6, 1.8, 0, 0.2, Math.PI - 0.2); q.stroke();
        }
      }
    }
    if (k === CRUM) {
      // crumbly dirt: a net of cracks with lit lips, different in every cell of the block, and a light dusty top
      const cs = 800 + rm * 11 + cm * 17;
      let px = 2 + RICH.r(cs, 1) * 6, py = 4 + RICH.r(cs, 2) * (C_ - 8);
      const pts = [[px, py]]; while (px < C_ - 2) { px += 4 + RICH.r(cs, pts.length + 3) * 6; py = Math.max(2, Math.min(C_ - 2, py + (RICH.r(cs, pts.length + 9) - 0.5) * 10)); pts.push([px, py]); }
      q.strokeStyle = 'rgba(60,40,20,0.6)'; q.lineWidth = 1.4; q.beginPath(); pts.forEach((p, i) => (i ? q.lineTo(p[0], p[1]) : q.moveTo(p[0], p[1]))); q.stroke();
      q.strokeStyle = 'rgba(255,235,200,0.28)'; q.lineWidth = 0.8; q.beginPath(); pts.forEach((p, i) => (i ? q.lineTo(p[0], p[1] + 1.2) : q.moveTo(p[0], p[1] + 1.2))); q.stroke();
      const j = pts[1 + Math.floor(RICH.r(cs, 40) * (pts.length - 2))] || pts[0]; q.strokeStyle = 'rgba(60,40,20,0.5)'; q.lineWidth = 1; q.beginPath(); q.moveTo(j[0], j[1]); q.lineTo(j[0] + 3, j[1] + (RICH.r(cs, 41) < 0.5 ? -7 : 7)); q.stroke();
      q.fillStyle = 'rgba(255,230,190,0.2)'; q.fillRect(2, 2, C_ - 4, 2);
    }
  }
  // a rare find in the dirt: 0 a fossil shell, 1 a little bone, 2 an old coin, 3 a root ball
  function paintFind(q, n) {
    const TAU2 = Math.PI * 2;
    if (n === 0) {
      q.fillStyle = '#d8c8a8'; q.beginPath(); q.arc(7, 6, 5, 0, TAU2); q.fill();
      q.strokeStyle = '#8a7656'; q.lineWidth = 0.9; q.beginPath(); for (let a = 0; a < 12; a += 0.4) { const rr2 = 0.4 * a; q.lineTo(7 + Math.cos(a) * rr2, 6 + Math.sin(a) * rr2); } q.stroke();
      q.beginPath(); q.arc(7, 6, 5, 0, TAU2); q.stroke(); q.fillStyle = 'rgba(255,255,255,0.4)'; q.fillRect(4, 3, 2, 1);
    } else if (n === 1) {
      q.save(); q.translate(7, 6); q.rotate(-0.4); q.fillStyle = '#e8dcc4';
      q.fillRect(-4, -1.2, 8, 2.4); for (const ex of [-4.5, 4.5]) { q.beginPath(); q.arc(ex, -1.3, 1.7, 0, TAU2); q.arc(ex, 1.3, 1.7, 0, TAU2); q.fill(); }
      q.strokeStyle = '#9a8a6a'; q.lineWidth = 0.6; q.beginPath(); q.moveTo(-3, 1.2); q.lineTo(3, 1.2); q.stroke(); q.restore();
    } else if (n === 2) {
      q.fillStyle = '#8a6a2a'; q.beginPath(); q.ellipse(7.5, 6.5, 4.5, 3.6, 0.2, 0, TAU2); q.fill();
      q.fillStyle = '#c8a040'; q.beginPath(); q.ellipse(7, 6, 4.2, 3.3, 0.2, 0, TAU2); q.fill();
      q.strokeStyle = '#7a5a1a'; q.lineWidth = 0.7; q.beginPath(); q.ellipse(7, 6, 2.6, 2, 0.2, 0, TAU2); q.stroke();
      q.fillStyle = 'rgba(80,140,100,0.5)'; q.fillRect(8, 7, 2, 1.2); q.fillStyle = 'rgba(255,240,180,0.7)'; q.fillRect(5, 4, 1.6, 0.9);
    } else {
      q.strokeStyle = 'rgba(214,184,136,0.8)'; q.lineWidth = 0.8; q.beginPath();
      for (let i = 0; i < 7; i++) { const a = i * 0.9; q.moveTo(7, 5); q.quadraticCurveTo(7 + Math.cos(a) * 3, 5 + Math.sin(a) * 3 + 2, 7 + Math.cos(a) * 6, 5 + Math.abs(Math.sin(a)) * 5 + 1); } q.stroke();
      q.fillStyle = '#a07a52'; q.beginPath(); q.ellipse(7, 5, 2.4, 2, 0, 0, TAU2); q.fill();
    }
  }
  function draw(st) {
    const t = st.clock, cam = st.cam;
    K.back(0, cam * 0.5, t, { zone: 'chamber', par: 0.3, bright: st.k === 3 ? 0.4 : 0.9 });
    // the chamber's frame and its open cells (tunnels)
    ctx.save();
    ctx.beginPath(); ctx.rect(GR.ox, GR.oy, NC * C_, viewH()); ctx.clip();
    const r0 = Math.max(0, rowOf(cam) - 1), r1 = Math.min(NR - 1, rowOf(cam + viewH()) + 1);
    ctx.fillStyle = '#2a1e16'; ctx.fillRect(GR.ox, GR.oy, NC * C_, viewH());
    for (let r = r0; r <= r1; r++) for (let c = 0; c < NC; c++) {
      const k = st.g[r][c], x = scrX(st, c * C_), y = scrY(st, r * C_);
      if (r < 3 && k === E) { ctx.fillStyle = 'rgba(79,232,214,0.07)'; ctx.fillRect(x, y, C_, C_); continue; }
      const emp = (rr2, cc) => rr2 >= 0 && rr2 < NR && cc >= 0 && cc < NC && st.g[rr2][cc] === E;
      if (k === E) {
        // a dug tunnel: dark, with the shadow of the dirt above it and a faint floor
        RICH.pic('w39tunnel' + ((r * 3 + c) % 4), C_, C_, q => { q.fillStyle = '#1e140e'; q.fillRect(0, 0, C_, C_); q.fillStyle = 'rgba(120,80,50,0.12)'; for (let n = 0; n < 8; n++) q.fillRect(RICH.r(611 + (r * 3 + c) % 4, n) * C_, RICH.r(612 + (r * 3 + c) % 4, n) * C_, 1.5, 1.5); q.fillStyle = 'rgba(0,0,0,0.25)'; q.fillRect(0, C_ * 0.6, C_, C_ * 0.4); }, x, y);
        if (!emp(r - 1, c)) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, y, C_, 5); }
        if (!emp(r + 1, c)) { ctx.fillStyle = 'rgba(120,80,50,0.25)'; ctx.fillRect(x, y + C_ - 3, C_, 3); }
        continue;
      }
      const h = K.hash(r * 97 + c * 13 + st.round * 7);
      if (k === SOFT || k === PACK || k === CRUM || k === ROCK || k === DOOR) {
        // (art pass) each dirt and rock cell is a cached picture (6 looks per kind): grains, strata, pebbles, roots for
        // dirt; a rounded slab of real rock texture for stone
        // (rich props) dirt cells tile a 7 x 5 cell block of earth painted in world coordinates, so the strata run on
        // from cell to cell and pebbles, roots and worm holes sit at their own place in every cell (and may cross into
        // the next one); a rare find (a shell, a bone, an old coin, a root ball) is placed by the real cell's hash
        if (k === ROCK || k === DOOR) RICH.pic('w39cell|' + k, C_ + 1, C_ + 1, q => { q.fillStyle = KCOL[k]; q.fillRect(0, 0, C_ + 1, C_ + 1); }, x, y);
        else {
          const rm = ((r + st.round * 2) % 5 + 5) % 5, cm = (c + st.round * 3) % 7;
          RICH.pic('w39dirt|' + k + '|' + rm + '|' + cm, C_ + 1, C_ + 1, q => paintDirtCell(q, k, rm, cm), x, y);
          const h2 = K.hash(r * 211 + c * 37 + st.round * 13 + 5);
          if (h2 < 0.04 && k !== CRUM) { const n = Math.floor(h2 / 0.01); RICH.pic('w39find|' + n, 14, 12, q => paintFind(q, n), x + 3 + K.hash(r * 7 + c) * (C_ - 18), y + 4 + K.hash(r + c * 5) * (C_ - 16)); }
        }
      } else { ctx.fillStyle = KCOL[k]; ctx.fillRect(x, y, C_ + 0.5, C_ + 0.5); }
      if (k === SOFT || k === PACK || k === CRUM) {
        // a lit lip where the dirt faces a tunnel above, a darker underside over a tunnel below, crumbs and a pebble
        if (emp(r - 1, c)) { ctx.fillStyle = 'rgba(255,220,170,0.22)'; ctx.fillRect(x, y, C_, 3); ctx.fillStyle = 'rgba(80,120,40,0.35)'; if (h > 0.6) { ctx.fillRect(x + 4 + h * 8, y - 2, 2, 4); ctx.fillRect(x + 8 + h * 8, y - 3, 2, 5); } }
        if (emp(r + 1, c)) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(x, y + C_ - 4, C_, 4); if (h < 0.3) { ctx.strokeStyle = 'rgba(200,170,120,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 6 + h * 20, y + C_); ctx.quadraticCurveTo(x + 9 + h * 20, y + C_ + 5, x + 5 + h * 20, y + C_ + 8); ctx.stroke(); } }
        if (emp(r, c - 1)) { ctx.fillStyle = 'rgba(255,220,170,0.1)'; ctx.fillRect(x, y, 2, C_); }
        if (emp(r, c + 1)) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x + C_ - 3, y, 3, C_); }

      } else if (k === ROCK || k === DOOR) {
        RICH.pic('w39slab2|' + Math.floor(h * 4), C_, C_, q => {
          // (art pass, 2nd look) a chunky dressed stone: a dark rim, bevelled faces (lit top and left, shaded right and
          // foot) round a face of real rock texture, chips on the corners, specks, a crack and the odd lichen spot
          const v = Math.floor(h * 4), b = 5, m = 1.5, e = C_ - m;
          q.fillStyle = '#2e3138'; RICH.rr(q, m, m, C_ - m * 2, C_ - m * 2, 5); q.fill();
          const face = (pts, col) => { q.fillStyle = col; q.beginPath(); pts.forEach((p, i) => i ? q.lineTo(p[0], p[1]) : q.moveTo(p[0], p[1])); q.closePath(); q.fill(); };
          face([[m + 1, m + 1], [e - 1, m + 1], [e - b, m + b], [m + b, m + b]], '#9aa0aa');
          face([[m + 1, m + 1], [m + b, m + b], [m + b, e - b], [m + 1, e - 1]], '#7e848e');
          face([[e - 1, m + 1], [e - 1, e - 1], [e - b, e - b], [e - b, m + b]], '#4a4e57');
          face([[m + 1, e - 1], [e - 1, e - 1], [e - b, e - b], [m + b, e - b]], '#3e424a');
          q.save(); q.beginPath(); q.rect(m + b, m + b, C_ - (m + b) * 2, C_ - (m + b) * 2); q.clip();
          RICH.rock(q, 0, 0, C_, C_, { col: '#666b74', seed: 40 + v });
          q.fillStyle = 'rgba(255,255,255,0.12)'; q.fillRect(m + b, m + b, C_ - (m + b) * 2, 2);
          q.restore();
          q.strokeStyle = 'rgba(255,255,255,0.35)'; q.lineWidth = 1; q.beginPath(); q.moveTo(m + 2, e - 3); q.lineTo(m + 2, m + 2); q.lineTo(e - 3, m + 2); q.stroke();
          q.strokeStyle = 'rgba(20,22,26,0.5)'; q.lineWidth = 0.8; q.beginPath(); q.moveTo(m + 1, m + 1); q.lineTo(m + b, m + b); q.moveTo(e - 1, m + 1); q.lineTo(e - b, m + b); q.moveTo(m + 1, e - 1); q.lineTo(m + b, e - b); q.moveTo(e - 1, e - 1); q.lineTo(e - b, e - b); q.stroke();
          // chips knocked out of two corners
          q.fillStyle = '#2e3138'; if (v % 2) { q.beginPath(); q.moveTo(e, m + 6); q.lineTo(e - 5, m + 1); q.lineTo(e, m); q.closePath(); q.fill(); } else { q.beginPath(); q.moveTo(m, e - 6); q.lineTo(m + 5, e); q.lineTo(m, e); q.closePath(); q.fill(); }
          q.strokeStyle = 'rgba(30,32,38,0.75)'; q.lineWidth = 1.1; q.beginPath(); q.moveTo(C_ * 0.55, m + b); q.lineTo(C_ * 0.45 + v, C_ * 0.5); q.lineTo(C_ * 0.6, e - b); if (v > 1) { q.moveTo(C_ * 0.45 + v, C_ * 0.5); q.lineTo(C_ * 0.3, C_ * 0.62); } q.stroke();
          q.strokeStyle = 'rgba(255,255,255,0.18)'; q.lineWidth = 0.8; q.beginPath(); q.moveTo(C_ * 0.55 + 1, m + b + 1); q.lineTo(C_ * 0.45 + v + 1, C_ * 0.5 + 1); q.stroke();
          if (v === 3) { q.fillStyle = 'rgba(150,190,120,0.55)'; q.beginPath(); q.ellipse(m + b + 4, e - b - 3, 3, 2, 0, 0, TAU); q.fill(); q.fillStyle = 'rgba(200,230,170,0.5)'; q.fillRect(m + b + 2, e - b - 4, 1.2, 1.2); }
        }, x, y);
        if (k === DOOR) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.strokeRect(x + 3, y + 3, C_ - 6, C_ - 6); }
      } else if (k === GAS || k === WAT) {
        // (art pass, 2nd look) a pocket in the dirt: a cached cell of earth with a rounded hollow full of swamp gas
        // (green, with a glow) or seep water (a lit surface line, a deeper bottom, glints), then the live bubbles
        const gas = k === GAS, v = Math.floor(h * 3);
        RICH.pic('w39pocket|' + k + '|' + v, C_ + 1, C_ + 1, q => {
          q.fillStyle = KCOL[PACK]; q.fillRect(0, 0, C_ + 1, C_ + 1);
          q.fillStyle = RICH.rgba(RICH.dk(KCOL[PACK], 0.45), 0.5); for (let n = 0; n < 16; n++) q.fillRect(RICH.r(640 + k + v, n) * C_, RICH.r(641 + k + v, n) * C_, 1.3, 1.3);
          const cx = C_ / 2, cy = C_ / 2 + 1, rx = C_ * 0.42, ry = C_ * 0.38;
          q.fillStyle = RICH.dk(KCOL[PACK], 0.5); q.beginPath(); q.ellipse(cx, cy, rx + 1.5, ry + 1.5, 0, 0, TAU); q.fill();
          const g = q.createRadialGradient(cx - 2, cy - 3, 1, cx, cy, rx);
          if (gas) { g.addColorStop(0, '#b8f08a'); g.addColorStop(0.6, '#6a9a4a'); g.addColorStop(1, '#3a5a2a'); }
          else { g.addColorStop(0, '#8ac8f2'); g.addColorStop(0.6, '#4a7aa8'); g.addColorStop(1, '#2a4a6a'); }
          q.fillStyle = g; q.beginPath(); q.ellipse(cx, cy, rx, ry, 0, 0, TAU); q.fill();
          if (!gas) { q.fillStyle = 'rgba(220,240,255,0.55)'; q.fillRect(cx - rx * 0.7, cy - ry * 0.45, rx * 1.4, 1.4); q.fillStyle = 'rgba(20,40,70,0.35)'; q.beginPath(); q.ellipse(cx, cy + ry * 0.45, rx * 0.8, ry * 0.4, 0, 0, TAU); q.fill(); }
          else { q.fillStyle = 'rgba(40,70,20,0.35)'; for (let n = 0; n < 5; n++) q.fillRect(cx - rx * 0.6 + n * rx * 0.3, cy + ry * 0.2 + (n % 2) * 2, 2, 2); }
          q.strokeStyle = 'rgba(255,230,190,0.3)'; q.lineWidth = 1; q.beginPath(); q.ellipse(cx, cy, rx + 1.5, ry + 1.5, 0, Math.PI * 0.15, Math.PI * 0.85); q.stroke();
          q.strokeStyle = 'rgba(0,0,0,0.35)'; q.beginPath(); q.ellipse(cx, cy, rx + 1.5, ry + 1.5, 0, Math.PI * 1.1, Math.PI * 1.9); q.stroke();
        }, x, y);
        for (let n = 0; n < 3; n++) {
          const bx = x + 7 + n * 7, by = gas ? y + 9 + (n % 2) * 8 : y + 12 + Math.sin(t * 2 + n) * 2, br = gas ? 3 + Math.sin(t * 3 + n) * 0.8 : 3;
          ctx.fillStyle = gas ? 'rgba(190,250,140,0.55)' : 'rgba(170,220,255,0.55)'; ctx.beginPath(); ctx.ellipse(bx, by, br, gas ? br : 4, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(bx - br * 0.35, by - br * 0.4, br * 0.3); ctx.fill();
        }
      }
      else if (k === PIL) { ctx.fillStyle = '#2a1e16'; ctx.fillRect(x, y, C_, C_); K.crystal(x + C_ / 2, y + C_ + 2, C_ + 6, 0, { col: K.GLOW.ice, w: 14, glow: st.flash.some(f => f.r <= r + 1 && f.r >= r - 1 && f.c === c && f.t > 0) ? 1 : 0.5, t, seed: r }); }
      else if (k === BOUL) RICH.pic('w39boulder', C_, C_, q => {
        // a round boulder in its hollow: rock texture, a shaded lower side, a glint, a dark rim
        q.fillStyle = '#1e140e'; q.fillRect(0, 0, C_, C_);
        q.beginPath(); q.arc(C_ / 2, C_ / 2, C_ * 0.48, 0, TAU); q.save(); q.clip(); RICH.rock(q, 0, 0, C_, C_, { col: '#8a847e', seed: 77 });
        q.fillStyle = 'rgba(50,44,40,0.45)'; q.beginPath(); q.arc(C_ / 2, C_ / 2, C_ * 0.48, -0.2, Math.PI * 0.85); q.lineTo(C_ / 2, C_ / 2); q.fill(); q.restore();
        q.strokeStyle = '#4a4440'; q.lineWidth = 2; q.beginPath(); q.arc(C_ / 2, C_ / 2, C_ * 0.48, 0, TAU); q.stroke();
        q.fillStyle = 'rgba(255,255,255,0.3)'; q.beginPath(); q.arc(C_ * 0.38, C_ * 0.36, 3.5, 0, TAU); q.fill();
      }, x, y);
      else if (k === VENT) {
        // (art pass, 2nd look) a steaming vent: a cracked rock cell with a crusted, mineral-stained mouth
        RICH.pic('w39vent', C_ + 1, C_ + 1, q => {
          RICH.rock(q, 0, 0, C_ + 1, C_ + 1, { col: '#4a4e56', seed: 91 });
          q.fillStyle = 'rgba(255,255,255,0.14)'; q.fillRect(0, 0, C_ + 1, 1.5); q.fillStyle = 'rgba(0,0,0,0.3)'; q.fillRect(0, C_ - 2, C_ + 1, 3);
          q.fillStyle = 'rgba(220,200,120,0.4)'; q.beginPath(); q.ellipse(13, 3, 9, 4, 0, 0, Math.PI); q.fill();
          q.fillStyle = '#1a1c20'; q.beginPath(); q.moveTo(7, 0); q.lineTo(19, 0); q.lineTo(16, 7); q.lineTo(14, 13); q.lineTo(11, 7); q.closePath(); q.fill();
          q.strokeStyle = 'rgba(160,230,230,0.35)'; q.lineWidth = 1; q.beginPath(); q.moveTo(7, 0); q.lineTo(11, 7); q.lineTo(14, 13); q.stroke();
        }, x, y);
        ctx.fillStyle = st.geyOn ? '#dff6ff' : '#2a8a90'; ctx.fillRect(x + 8, y, 10, 6); ctx.fillStyle = st.geyOn ? 'rgba(255,255,255,0.8)' : 'rgba(150,240,240,0.5)'; ctx.fillRect(x + 9, y, 3, 1.5);
      }
      else if (k === PLATE) {
        // (art pass, 2nd look) a brass pressure plate on a stone footing: lit rim, bolts, a darker pressed face
        const on = st.pl.some(P => P.plate && cellOf(P).c === c);
        ctx.fillStyle = '#3a3e46'; ctx.fillRect(x + 1, y + 6, C_ - 2, 4); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(x + 1, y + 6, C_ - 2, 1);
        ctx.fillStyle = on ? '#ffe28a' : '#b8862a'; rr(x + 2, y, C_ - 4, 8, 3); ctx.fill();
        ctx.fillStyle = on ? 'rgba(255,255,255,0.6)' : 'rgba(255,240,190,0.5)'; ctx.fillRect(x + 4, y + 1, C_ - 8, 1.5);
        ctx.fillStyle = on ? 'rgba(150,100,20,0.3)' : 'rgba(90,60,10,0.4)'; ctx.fillRect(x + 4, y + 5, C_ - 8, 2);
        ctx.strokeStyle = '#6a4a10'; ctx.lineWidth = 1; rr(x + 2.5, y + 0.5, C_ - 5, 7, 3); ctx.stroke();
        ctx.fillStyle = '#6a4a10'; circle(x + 6, y + 4, 1); ctx.fill(); circle(x + C_ - 6, y + 4, 1); ctx.fill();
      }
      // a boulder's shadow line: where it would fall
      if (k === BOUL && (st.k !== 3 || near(st, r, c, 3))) { ctx.strokeStyle = 'rgba(255,220,180,0.25)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 2; let y2 = r + 1; while (y2 < NR - 1 && st.g[y2][c] === E) y2++; if (y2 > r + 1) { ctx.beginPath(); ctx.moveTo(x + C_ / 2, y + C_); ctx.lineTo(x + C_ / 2, scrY(st, y2 * C_)); ctx.stroke(); } ctx.setLineDash([]); }
    }
    // the stream (Wet Dig)
    if (st.stream >= 0) { const y = scrY(st, st.stream * C_); ctx.fillStyle = 'rgba(80,170,255,0.35)'; ctx.fillRect(GR.ox + C_, y + C_ * 0.4, NC * C_ - 2 * C_, C_ * 0.6); ctx.strokeStyle = 'rgba(220,240,255,0.6)'; ctx.lineWidth = 1.5; for (let n = 0; n < 12; n++) { const xx = ((n * 70 + t * 70) % (NC * C_ / 2)); ctx.beginPath(); ctx.moveTo(GR.ox + NC * C_ / 2 - xx, y + C_ * 0.7); ctx.lineTo(GR.ox + NC * C_ / 2 - xx - 10, y + C_ * 0.7); ctx.moveTo(GR.ox + NC * C_ / 2 + xx, y + C_ * 0.7); ctx.lineTo(GR.ox + NC * C_ / 2 + xx + 10, y + C_ * 0.7); ctx.stroke(); } }
    // floods, clouds, falling boulders, geyser jets
    for (const f of st.floods) { const a = 1 - f.t / GR.floodT; ctx.fillStyle = 'rgba(80,170,255,' + 0.5 * a + ')'; ctx.fillRect(scrX(st, f.c * C_) + 4, scrY(st, f.r0 * C_), C_ - 8, (f.r1 - f.r0 + 1) * C_); }
    for (const q of st.clouds) { const a = 1 - q.t / 2.6; ctx.fillStyle = 'rgba(150,230,100,' + 0.4 * a + ')'; for (let n = 0; n < 4; n++) { circle(scrX(st, q.x) + Math.cos(n * 1.6 + t) * 12, scrY(st, q.y) + Math.sin(n * 2.1 + t) * 8, 12 + n * 2); ctx.fill(); } }
    for (const f of st.falling) {
      // (art pass, 2nd look) a falling boulder looks like the resting one: rock texture, a shaded side, a glint
      const x = scrX(st, (f.c + 0.5) * C_) + (f.wob > 0 ? Math.sin(t * 60) * 2 : 0), y = scrY(st, f.y + C_ / 2);
      RICH.pic('w39boulderF', C_, C_, q => {
        q.beginPath(); q.arc(C_ / 2, C_ / 2, C_ * 0.48, 0, TAU); q.save(); q.clip(); RICH.rock(q, 0, 0, C_, C_, { col: '#8a847e', seed: 77 });
        q.fillStyle = 'rgba(50,44,40,0.45)'; q.beginPath(); q.arc(C_ / 2, C_ / 2, C_ * 0.48, -0.2, Math.PI * 0.85); q.lineTo(C_ / 2, C_ / 2); q.fill(); q.restore();
        q.strokeStyle = '#4a4440'; q.lineWidth = 2; q.beginPath(); q.arc(C_ / 2, C_ / 2, C_ * 0.48, 0, TAU); q.stroke();
        q.fillStyle = 'rgba(255,255,255,0.3)'; q.beginPath(); q.arc(C_ * 0.38, C_ * 0.36, 3.5, 0, TAU); q.fill();
      }, x - C_ / 2, y - C_ / 2);
    }
    if (st.geyOn) for (let r = r0; r <= r1; r++) for (let c = 0; c < NC; c++) if (st.g[r][c] === VENT) { const x = scrX(st, (c + 0.5) * C_), y = scrY(st, r * C_); const g2 = ctx.createLinearGradient(0, y - 150, 0, y); g2.addColorStop(0, 'rgba(223,246,255,0)'); g2.addColorStop(1, 'rgba(223,246,255,0.7)'); ctx.fillStyle = g2; ctx.fillRect(x - 7, y - 150, 14, 150); }
    // the diggers
    drawDiggers(st, t);
    ctx.restore();
    // Lights Low: the dark, with holes for the headlamps and the pillar flashes
    if (st.k === 3) drawDark(st);
    // gems show through everything
    ctx.save(); ctx.beginPath(); ctx.rect(GR.ox, GR.oy, NC * C_, viewH()); ctx.clip();
    for (const q of st.gems) {
      if (q.got) continue;
      const x = scrX(st, q.x), y = scrY(st, q.y) - (q.drop > 0 ? q.drop * 60 : 0);
      if (y < GR.oy - 20 || y > H + 20) continue;
      const lit = st.flash.some(f => f.t > 0 && Math.abs(f.r - q.r) <= 5 && Math.abs(f.c - q.c) <= 5);
      const inDirt = solid(cellAt(st, q.r, q.c)) && !q.star;
      if (lit) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; circle(x, y, 16); ctx.fill(); }
      K.gem(x, y, q.star ? 12 : q.v >= 3 ? 9 : 6, t, { col: q.star ? C.gold : q.v >= 3 ? K.GLOW.gold : K.GLOWS[(q.r + q.c) % 5], big: q.v >= 3, star: q.star, dim: inDirt && !lit ? 0.4 : 0 });
    }
    ctx.restore();
    // the chamber frame
    ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 6; ctx.strokeRect(GR.ox - 3, GR.oy - 3, NC * C_ + 6, viewH() + 10);
    // the golem's face watching from the top, its hand with the timer crystals
    drawGolem(st, t);
    K.drawGlitter(st, 0, cam);
  }
  const near = (st, r, c, d) => st.pl.some(P => { const q = cellOf(P); return Math.abs(q.r - r) <= d && Math.abs(q.c - c) <= d; }) || st.flash.some(f => f.t > 0 && Math.abs(f.r - r) <= 5 && Math.abs(f.c - c) <= 5);
  let darkCv = null;
  function drawDark(st) {
    if (typeof document === 'undefined') return;
    if (!darkCv) { darkCv = document.createElement('canvas'); }
    if (darkCv.width !== W || darkCv.height !== H) { darkCv.width = W; darkCv.height = H; }
    const d = darkCv.getContext('2d');
    d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H);
    d.fillStyle = 'rgba(6,4,10,0.86)'; d.fillRect(GR.ox, GR.oy, NC * C_, viewH());
    d.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r) => { const g2 = d.createRadialGradient(x, y, r * 0.3, x, y, r); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g2; d.fillRect(x - r, y - r, r * 2, r * 2); };
    for (const P of st.pl) if (P.lift <= 0) hole(scrX(st, P.x) + P.face * 10, scrY(st, P.y) - 14, C_ * 3.4);
    for (const f of st.flash) if (f.t > 0) hole(scrX(st, (f.c + 0.5) * C_), scrY(st, (f.r + 0.5) * C_), C_ * 5.5 * Math.min(1, f.t));
    ctx.drawImage(darkCv, 0, 0);
  }
  function drawDiggers(st, t) {
    for (const P of st.pl) {
      if (P.lift > 0) continue;
      const x = scrX(st, P.x), y = scrY(st, P.y);
      if (P.buried > 0) {
        // a heap of dirt with the digger shaking it off
        K.hero(P.id, x, y, { face: P.face, s: 0.86, stun: true, sy: 0.7 });
        ctx.fillStyle = '#9a7250'; ctx.beginPath(); ctx.ellipse(x, y - 6, 16 + Math.sin(t * 30) * 1.5, 12, 0, Math.PI, TAU); ctx.fill();
        continue;
      }
      const dig = P.dig && !P.dig.blocked, rot = dig ? Math.sin(t * 24) * 0.12 : 0;
      K.hero(P.id, x, y, { face: P.face, s: 0.86, rot, vy: P.ground ? 0 : P.vy, stun: P.knock > 0 || P.cough > 0 });
      // the shovel, in their own colour
      const sx = x + P.face * 9, sy = y - 12, a = dig ? (P.dig.r > cellOf(P).r ? Math.PI * 0.55 : 0.25) + Math.sin(t * 24) * 0.35 : -0.5;
      ctx.save(); ctx.translate(sx, sy); ctx.scale(P.face, 1); ctx.rotate(a);
      ctx.strokeStyle = P.gold ? C.gold : P.id === 0 ? '#ff8a3a' : '#3a7aff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(12, 0); ctx.stroke();
      ctx.fillStyle = P.gold ? '#ffe28a' : '#c8d0d8'; ctx.beginPath(); ctx.moveTo(12, -4); ctx.lineTo(19, -3); ctx.lineTo(20, 0); ctx.lineTo(19, 3); ctx.lineTo(12, 4); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (P.cough > 0) text('*cough*', x, y - 34, 10, '#c8f0a0', 'center', 'body');
      if (P.dig && !P.dig.blocked) { const u = clamp(P.dig.t / P.dig.need, 0, 1); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - 12, y - 32, 24, 4); ctx.fillStyle = P.gold ? C.gold : PCOL[P.id]; ctx.fillRect(x - 12, y - 32, 24 * u, 4); }
    }
  }
  function drawGolem(st, t) {
    const gx = W / 2, top = GR.oy - st.cam;
    if (top > -60) {
      K.golemFace(gx, top + 36, 0.6, t, { calm: 1, chuckle: st.chuckle > 0 ? 1 : 0, look: clamp((st.pl[0].x + st.pl[1].x) / (NC * C_) - 1, -1, 1) });
      // the twist sign, held up at the start of a round
      if (st.t < 3 && st.tw) { const a = clamp(3 - st.t, 0, 1); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(191,238,242,0.95)'; rr(gx + 70, top + 18, 150, 34, 8); ctx.fill(); ctx.strokeStyle = '#3a8a90'; ctx.lineWidth = 2; ctx.stroke(); text(st.tw.sign, gx + 145, top + 35, 15, '#1c3a40', 'center', 'title'); ctx.globalAlpha = 1; }
    }
    // the timer: a row of crystals in the golem's hand going dark one by one (bottom middle)
    const left = st.sd >= 0 ? GR.sdT - st.sd : GR.roundT - st.t, n = 10, lit = Math.ceil(clamp(left / (st.sd >= 0 ? GR.sdT : GR.roundT), 0, 1) * n);
    const hx = W / 2 - (n - 1) * 7.5, hy = H - 24;
    K.golemHand(W / 2, hy + 14, 0.32, t, { open: 1 });
    ctx.fillStyle = 'rgba(23,25,29,0.7)'; rr(hx - 14, hy - 18, n * 15 + 13, 30, 10); ctx.fill();
    for (let k = 0; k < n; k++) K.crystal(hx + k * 15, hy + 8, 20, 0, { col: k < lit ? (left < 10 ? K.GLOW.rose : K.GLOW.teal) : '#3a4048', glow: k < lit ? 0.8 : 0, t, seed: k });
    if (st.sprinkle.length) for (let k = 0; k < 20; k++) { const x = GR.ox + K.hash(k * 3) * NC * C_, y = GR.oy + ((st.sprinkle[0].t * 300 + k * 40) % 200); ctx.fillStyle = K.GLOWS[k % K.GLOWS.length]; ctx.fillRect(x, y, 2, 2); }
  }
  function drawTop(st) { K.drawParts(st, 0); K.drawPops(st, 0, 0); }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.3 : 1, live = G.match && G.match.phase === 'live';
    // the message goes in its own pill above the golem's timer, clear of the score boxes and the round pill at the top
    if (st.msg) {
      const m = st.msg, hgt = big ? 32 : 26, str = m.gold ? '★ ' + m.text : m.text;
      let fs = big ? 18 : 14; text('', 0, 0, fs, '#ffffff', 'center', 'body');
      let w = ctx.measureText(str).width + 32;
      while (w > W - 60 && fs > 11) { fs--; text('', 0, 0, fs, '#ffffff', 'center', 'body'); w = ctx.measureText(str).width + 32; }
      const y = H - 66 - hgt;
      ctx.globalAlpha = clamp((m.life - m.t) / 0.3, 0, 1);
      const px = pill(W / 2, y, w, hgt, 'center');
      if (m.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(px, y, w, hgt, hgt / 2); ctx.stroke(); }
      text(str, W / 2, y + hgt / 2 + 0.5, fs, m.col, 'center', 'body'); ctx.globalAlpha = 1;
    }
    // each digger's points (top corners)
    for (const P of st.pl) {
      const bw = 150 * z, bh = 40 * z, bx = P.id === 0 ? W / 2 - 250 * z - bw / 2 : W / 2 + 250 * z - bw / 2, by = 8;
      ctx.fillStyle = 'rgba(23,25,29,0.86)'; rr(bx, by, bw, bh, 12 * z); ctx.fill();
      ctx.strokeStyle = P.gold ? C.gold : PCOL[P.id]; ctx.lineWidth = 2.5; rr(bx, by, bw, bh, 12 * z); ctx.stroke();
      text(NAMES[P.id] + (K.quiet(P.id) ? ' (cpu)' : ''), bx + 10 * z, by + bh / 2, 13 * z, PCOL[P.id], 'left', 'body');
      text('◆ ' + P.pts, bx + bw - 10 * z, by + bh / 2, 18 * z, '#bff8ef', 'right', 'title');
    }
    if (st.sd >= 0) text('SUDDEN DEATH', W / 2, GR.oy + 24, 18 * z, C.gold, 'center', 'title');
    if (!live) return;
    const Pr = K.prompter(st);
    for (const P of st.pl) {
      if (K.quiet(P.id) || P.lift > 0) continue;
      let s = null, col = '#ffe7a8', pulse = false;
      if (P.buried > 0) { s = 'Buried! Shake it off...'; col = '#ffb0a0'; }
      else if (st.t < 6 && st.round === 1) s = 'Hold ' + K.key(P.id, 'act') + ' + ' + K.key(P.id, 'down') + ' to dig';
      else if (st.vault && !st.vault.open && P.plate) { s = 'On the plate! Wait for ' + NAMES[1 - P.id]; col = C.gold; }
      else if (P.dig && P.dig.blocked) s = 'Rock! Dig another way';
      Pr.say(P.id, s, scrX(st, P.x), scrY(st, P.y) - 40, col, pulse);
    }
  }

  MODES.gemrush = {
    GR, plan, cellOf, cellAt, TWISTS, kinds: { E, SOFT, PACK, ROCK, CRUM, GAS, WAT, PIL, BOUL, VENT, PLATE, DOOR }, diggable, solid,
    setup(st, L) {
      for (const row of L.grid) row.fill('.');
      st.stat = { wins: [0, 0], gems: [0, 0], stars: [0, 0], caveins: [0, 0], buried: [0, 0], dug: [0, 0], shoves: [0, 0], geysers: [0, 0], clangs: 0 };
      st.stats = { helps: 0 };
      st.forceRound = this.testRound != null ? this.testRound : null;
      st.noHelp = !!this.testNoHelp;
      st.t = 0; st.clock = 0;
      K.fx(st);
      K.mabel(st, 'Well I never. It likes you. Go on, dig in!');
    },
    resetRound(n, info) { const st = G.mst; newRound(st, n, info); G.particles.length = 0; },
    go() {
      const st = G.mst;
      Sfx.play('gemrushGolemClap');
      Music.cue({ song: 'cavedig' });
      const g = st.pl.filter(P => P.gold);
      if (g.length) K.goldHelp(st, 'Gold shovel for ' + NAMES[g[0].id] + ': faster digging, and buried for less time!');
      else K.msg(st, 'Round ' + st.round + ': ' + st.tw.title + (st.k === 4 ? '. Stand on both gold plates to open the vault!' : st.k === 3 ? '. Only the gems and your lamps show!' : ''), '#ffffff', 3);
    },
    step(dt) { tick(G.mst, dt, true); K.tickMabel(G.mst, dt); },
    idle(dt) { const st = G.mst; K.tickMabel(st, dt); if (st.pl) tick(st, dt, false); },
    timeUp() { return -1; },
    tiebreak() {
      const s = G.mst.stat;
      if (s.gems[0] !== s.gems[1]) return { winner: s.gems[0] > s.gems[1] ? 0 : 1, reason: 'More gems this match wins the tiebreak!' };
      return -1;
    },
    draw() { const st = G.mst; if (!st.pl) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.pl) drawTop(st); K.drawMabel(st); },
    hud() { const st = G.mst; if (st.pl && G.match) hud(st); },
    stats() {
      const st = G.mst, s = st.stat;
      if (!s) return [];
      const out = [
        { label: 'Rounds won', values: (G.match ? G.match.wins : s.wins).slice() },
        { label: 'Gem points', values: s.gems.slice() },
        { label: 'Star gems', values: s.stars.slice() },
        { label: 'Cave-ins caused', values: s.caveins.slice() },
        { label: 'Times buried', values: s.buried.slice() },
        { label: 'Cells dug', values: s.dug.slice() },
      ];
      out.push('The lamps of Glimmer Gulch are glowing again.');
      const hl = K.helpLine(st.stats ? st.stats.helps : 0);
      if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  CAVE.defs.gemrush = {
    name: 'Gem Rush', world: 38, kind: 'versus', mode: 'gemrush', outfit: 'gemrush', music: 'cavedig', amb: 'caveChamber', ownStep: true,
    match: { bestOf: 5, roundTime: 0 },
    act: { label: 'dig' },
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> walk <kbd>W</kbd> jump',
      bo: '<kbd>←</kbd><kbd>→</kbd> walk <kbd>↑</kbd> jump',
    },
    tip: 'Dig down for gems. The star gem is deep in the middle. Watch what\'s above you!',
    howTo: [
      'Hold the action and a direction to dig that way. You can\'t dig straight up.',
      'Dig under a boulder and it falls down the shaft below. Getting buried drops your gems.',
      'Most gem points wins the round. First to win 3 rounds wins.',
    ],
    switches: {}, signs: [],
    map: K.stubMap(),
  };

  /* ---------- sounds ---------- */
  Sfx.extra.gemrushDigSoft = function () { this.noise(0.08, { type: 'lowpass', f: 900, vol: 0.04 }); };
  Sfx.extra.gemrushDigPacked = function () { this.noise(0.1, { type: 'bandpass', f: 700, q: 1.5, vol: 0.05 }); this.tone(180, 0.06, 'square', 0.015, 120); };
  Sfx.extra.gemrushDigBlocked = function () { this.tone(900, 0.12, 'square', 0.02, 700); this.tone(1400, 0.08, 'triangle', 0.012); };
  Sfx.extra.gemrushGemTing = function (p) { p = p || 1; this.tone(1568 * p, 0.12, 'triangle', 0.03); this.tone(2349 * p, 0.14, 'sine', 0.015, null, 0.04); };
  Sfx.extra.gemrushBigGem = function (p) { p = p || 1; [1047, 1319, 1568].forEach((f, i) => this.tone(f * p, 0.18, 'triangle', 0.03, null, i * 0.05)); };
  Sfx.extra.gemrushStarGem = function () { [784, 988, 1175, 1568, 1976].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.035, null, i * 0.07)); this.tone(2637, 0.6, 'sine', 0.015, null, 0.35); };
  Sfx.extra.gemrushBoulderRumble = function () { this.noise(0.5, { type: 'lowpass', f: 200, vol: 0.06, a: 0.15 }); };
  Sfx.extra.gemrushBoulderThud = function () { this.tone(60, 0.3, 'sine', 0.1, 35); this.noise(0.2, { type: 'lowpass', f: 400, vol: 0.07 }); };
  Sfx.extra.gemrushBuried = function () { this.tone(500, 0.15, 'triangle', 0.03, 300); this.noise(0.4, { type: 'lowpass', f: 600, vol: 0.06 }); };
  Sfx.extra.gemrushGemScatter = function () { for (let k = 0; k < 3; k++) this.tone(1800 + k * 300, 0.1, 'triangle', 0.015, null, k * 0.06); };
  Sfx.extra.gemrushCrumbleRow = function () { this.noise(0.6, { type: 'lowpass', f: 700, to: 200, vol: 0.08 }); };
  Sfx.extra.gemrushGasPuff = function () { this.noise(0.4, { type: 'bandpass', f: 1200, q: 0.8, vol: 0.05 }); };
  Sfx.extra.gemrushCough = function () { this.noise(0.1, { type: 'lowpass', f: 1000, vol: 0.05 }); this.noise(0.1, { type: 'lowpass', f: 800, vol: 0.04, delay: 0.16 }); };
  Sfx.extra.gemrushWaterGush = function () { this.noise(0.8, { type: 'bandpass', f: 900, to: 400, q: 0.7, vol: 0.07 }); };
  Sfx.extra.gemrushWashAway = function () { this.noise(0.4, { f: 1500, to: 500, q: 1, vol: 0.05 }); this.tone(500, 0.3, 'triangle', 0.02, 250); };
  Sfx.extra.gemrushGeyserLaunch = function () { this.noise(0.6, { type: 'highpass', f: 1800, vol: 0.07 }); this.tone(300, 0.4, 'triangle', 0.03, 900); };
  Sfx.extra.gemrushGeyserPuff = function () { this.noise(0.3, { type: 'highpass', f: 2500, vol: 0.012 }); };
  Sfx.extra.gemrushPillarRing = function () { this.tone(1760, 0.8, 'sine', 0.03); this.tone(2637, 0.6, 'sine', 0.012, null, 0.02); };
  Sfx.extra.gemrushShovelClang = function () { this.tone(1200, 0.25, 'square', 0.03, 1100); this.tone(1800, 0.3, 'triangle', 0.02); };
  Sfx.extra.gemrushShove = function () { this.noise(0.08, { type: 'lowpass', f: 800, vol: 0.05 }); this.tone(220, 0.08, 'triangle', 0.03, 160); };
  Sfx.extra.gemrushSprinkle = function () { for (let k = 0; k < 8; k++) this.tone(2400 + Math.random() * 1600, 0.12, 'sine', 0.01, null, k * 0.07); };
  Sfx.extra.gemrushTimerTick = function () { this.tone(1975, 0.06, 'triangle', 0.03); };
  Sfx.extra.gemrushGolemChuckle = function () { [0, 0.18, 0.36].forEach(d => this.tone(110, 0.14, 'sawtooth', 0.025, 90, d)); };
  Sfx.extra.gemrushGolemClap = function () { this.noise(0.12, { type: 'lowpass', f: 900, vol: 0.12 }); this.noise(0.12, { type: 'lowpass', f: 900, vol: 0.1, delay: 0.35 }); };
  Sfx.extra.gemrushGolemLift = function () { this.tone(140, 0.3, 'triangle', 0.03, 220); };
  Sfx.extra.gemrushRoundWin = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.03, null, i * 0.08)); };
  Sfx.extra.gemrushCrowning = function () { [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.4, 'sine', 0.025, null, 0.3 + i * 0.12)); };
  Sfx.extra.gemrushVaultOpen = function () { this.tone(70, 0.6, 'sine', 0.1, 50); this.noise(0.5, { type: 'lowpass', f: 500, vol: 0.08 }); [784, 988, 1175].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.025, null, 0.3 + i * 0.08)); };
  Sfx.extra.gemrushJump = function () { this.tone(360, 0.08, 'triangle', 0.018, 560); };
})();
