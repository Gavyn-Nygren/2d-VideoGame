/* Pip & Bo - Level 27-2 Runaway Assembly Line (team, World 27 Robot Factory). */
'use strict';

/* ===== 27-2 Runaway Assembly Line (mode 'runbelt', team) — Gavyn's pick =====
   "The belt speeds up. One jumps gaps and dodges the stampers, the other hits switches to fix broken belt pieces ahead."
   Side view; the screen scrolls right with the belt (four stretches, def.roomWord 'Stretch'). The mode owns the tick,
   the camera, the picture and the HUD (ownStep, ownHUD, noFalls, noTime). Pip and Bo move with the engine's own
   control() through the mode's own platforms, in world coordinates during the tick (p.x is on screen between ticks).
   - THE RUNNER rides the conveyor belt down on the factory floor. The belt carries them right at the line's speed (the
     same speed the screen scrolls, so standing still keeps them in place); ◀ ▶ run, ▲ jumps. Broken belt pieces are
     gaps: small ones can be jumped, wide ones (red lights) can't. Stampers slam down on the belt: a light blinks red,
     then the press comes down. Under it you get a "Squish!" (a flat, dizzy moment, counted as a bump). Falling into a
     gap is a "Boing!": a net pops you back onto the belt before the gap, and the line waits until you jump it.
   - THE FIXER runs along the catwalk above (one-way grates with small gaps to jump; a fall is a "Boing!" back up). Each
     broken piece has a switch box on the catwalk just before it: the action ('fix') at the box sends a robot arm down
     with a new belt piece. A wide gap that reaches the runner unfixed stops the whole line ("Line stop!") until it's
     fixed, so the fixer has to keep ahead. Fixing small gaps too makes the runner's life easy (and counts as a fix).
   - The belt speeds up through each stretch, and each stretch starts faster: Bolt Line, Paint Shop, Spring Press,
     Final Inspection. Gears on the belt and on the catwalk are for collecting. The stretch ends when both reach the
     packing bay at the end. Roles swap every stretch; Pip runs first.
   - Gold help (announced, while both play): 2 Boings at one gap fix it in gold; 2 Squishes by one stamper put it to
     sleep in gold; a line stopped 12 s at a wide gap makes its switch gold (the fixer's action fixes it from anywhere).
   - Idle: 12 s with no person pressing anything: "Taking a break", the line stops and the clock stops.
   Medal (BELT.medal): Gold with <= 3 bumps (Boings + Squishes) and >= 55% of the gears; Silver with <= 10 bumps.
   Results tiles: Gears, Belt fixes, Bumps, Line stops, Medal (no time: the belt sets the pace).
   Room def: { title, runner: 0|1, look, tip, speed: [start, end], course, walk }.
     course (the belt, left to right): ['belt', len], ['gap', w] (w > 120 is wide), ['stamp', period, phase] (a stamper
       over the cursor), ['gears', n] (a row of gears over the belt from the cursor)
     walk (the catwalk): numbers, a positive length is a grate, a negative one is a gap; [len, dy] is a grate dy px up
       (negative) or down; ['gears', n] puts gears on the next grate.
   MODES.runbelt exposes plan(st), BELT and helpers for the brain. Every top-level name starts with belt / BELT. */
const BELT = {
  BY: 440, CY: 250, edgeL: 6, edgeR: 34, wide: 120, switchBack: 150, switchR: 36, fixT: 0.6,
  warn: 0.8, slam: 0.12, down: 0.42, rise: 0.55, headW: 84, stunT: 0.9,
  jamAt: 420, goldGap: 2, goldStamp: 2, goldJam: 12, idleBreak: 12, gearR: 10, clearT: 1.8,
  medal: { gold: [3, 0.55], silver: 10 },
};

(() => {
  const B = BELT;
  const key = rf27Key, isCpu = rf27IsCpu;

  /* ---------- building a stretch ---------- */
  function compile(st, def) {
    const belts = [], gaps = [], stamps = [], gears = [], grates = [];
    let x = 0;
    for (const it of def.course || []) {
      const k = it[0];
      if (k === 'belt') { belts.push({ x0: x, x1: x + it[1] }); x += it[1]; }
      else if (k === 'gap') { gaps.push({ x0: x, x1: x + it[1], wide: it[1] > B.wide, fixed: false, fixT: 0, falls: 0, gold: false, goldSw: false, jamT: 0, stopped: false, i: gaps.length }); x += it[1]; }
      else if (k === 'stamp') stamps.push({ x: x + 60, period: it[1] || 2.4, t: it[2] || 0, squish: 0, gold: false, y: 0 });
      else if (k === 'gears') for (let n = 0; n < it[1]; n++) gears.push({ x: x + 40 + n * 44, y: B.BY - (n % 3 === 2 ? 72 : 20), got: false, top: false });
    }
    belts.push({ x0: x, x1: x + 900 }); // the run-out into the packing bay
    st.len = x + 900; st.endX = x + 500;
    let cx = -200, pendGears = 0;
    for (const it of def.walk || []) {
      if (Array.isArray(it) && it[0] === 'gears') { pendGears = it[1]; continue; }
      const len = Array.isArray(it) ? it[0] : it, dy = Array.isArray(it) ? it[1] : 0;
      if (len < 0) { cx += -len; continue; }
      const g = { x0: cx, x1: cx + len, y: B.CY + dy };
      grates.push(g);
      for (let n = 0; n < pendGears; n++) gears.push({ x: cx + 60 + n * 44, y: g.y - 16, got: false, top: true });
      pendGears = 0; cx += len;
    }
    if (cx < st.len) grates.push({ x0: cx, x1: st.len, y: B.CY });
    // each gap's switch box: on the catwalk, a little before the gap
    for (const g of gaps) {
      let sx = g.x0 - B.switchBack;
      const on = q => sx > q.x0 + 20 && sx < q.x1 - 20;
      if (!grates.some(on)) {
        const q = grates.filter(q => q.x1 - 40 < g.x0).sort((a, b) => b.x1 - a.x1)[0] || grates[0];
        sx = clamp(sx, q.x0 + 30, q.x1 - 30);
      }
      const q = grates.find(q => sx >= q.x0 && sx <= q.x1) || grates[0];
      g.sw = { x: sx, y: q.y };
    }
    Object.assign(st, { belts, gaps, stamps, gears, grates });
    st.stats.gearsTotal += gears.length;
  }
  const runnerSolids = st => {
    const out = st.belts.map(b => ({ x: b.x0, y: B.BY, w: b.x1 - b.x0, h: 60, belt: true }));
    for (const g of st.gaps) if (g.fixed || g.gold) out.push({ x: g.x0, y: B.BY, w: g.x1 - g.x0, h: 60, belt: true });
    return out;
  };
  const fixerSolids = st => st.grates.map(g => ({ x: g.x0, y: g.y, w: g.x1 - g.x0, h: 12, oneWay: true, grate: g }));
  const open = g => !g.fixed && !g.gold;
  // a stamper's head bottom (y) and phase: 'up' | 'warn' | 'slam' | 'down' | 'rise'
  function stampState(s) {
    if (s.gold) return { ph: 'sleep', y: B.BY - 120, danger: false };
    const P = s.period, u = ((s.t % P) + P) % P, upT = P - (B.warn + B.slam + B.down + B.rise);
    const top = B.BY - 190, low = B.BY - 6;
    if (u < upT) return { ph: 'up', y: top, danger: false, until: upT - u };
    if (u < upT + B.warn) return { ph: 'warn', y: top, danger: false, until: upT + B.warn - u };
    if (u < upT + B.warn + B.slam) { const k = (u - upT - B.warn) / B.slam; return { ph: 'slam', y: top + (low - top) * k, danger: true }; }
    if (u < upT + B.warn + B.slam + B.down) return { ph: 'down', y: low, danger: true };
    const k = (u - upT - B.warn - B.slam - B.down) / B.rise;
    return { ph: 'rise', y: low + (top - low) * k, danger: k < 0.5 };
  }

  /* ---------- the plan (job panels and the brain read it) ---------- */
  function plan(st) {
    const R = G.players[st.runner], F = G.players[st.fixer];
    const off = st.inTick ? 0 : st.camX; // (between ticks p.x is on screen)
    const rx = R.x + R.w / 2 + off, fx = F.x + F.w / 2 + off, fy = F.y + F.h;
    const gapR = st.gaps.find(g => open(g) && g.x1 > rx - 10) || null;
    const gapF = st.gaps.find(g => open(g) && g.sw.x > fx - 50 && g.x1 > rx - 10) || st.gaps.find(g => open(g) && g.x1 > rx - 10) || null;
    const stamp = st.stamps.find(s => s.x + B.headW / 2 > rx - 20 && s.x - rx < 260) || null;
    const nextGrateGap = (() => { for (let k = 0; k < st.grates.length - 1; k++) { const a = st.grates[k]; if (a.x1 > fx - 5) return { x0: a.x1, x1: st.grates[k + 1].x0, dy: st.grates[k + 1].y - a.y }; } return null; })();
    return { gapR, gapF, stamp, ss: stamp ? stampState(stamp) : null, cgap: nextGrateGap, rx, fx, fy, off, v: st.v, jam: st.jam };
  }
  function jobs(st) {
    const pl = plan(st), R = st.runner, F = st.fixer, nF = NAMES[F];
    const ru = key(R, 'up'), fa = key(F, 'act', 'fix');
    let run = ['Ride the belt! ' + ru + ' jumps', 'Dodge the stampers'], fix = ['Run ahead on the catwalk', 'Hit the switch boxes: ' + fa];
    if (st.jam && st.jam.kind === 'wide') run = ['Line stop! Wait for ' + nF, 'The gap is too wide to jump'];
    else if (st.jam && st.jam.kind === 'fall') run = ['Jump the gap! ' + ru, 'The line waits for you'];
    else if (pl.gapR && pl.gapR.x0 - pl.rx < 260) run = pl.gapR.wide ? ['Wide gap ahead!', nF + ' has to fix it'] : ['Jump the gap! ' + ru, nF + ' can fix it too'];
    else if (pl.ss && (pl.ss.ph === 'warn' || pl.ss.danger)) run = ['Stamper! Wait, then run under', 'Go when it lifts'];
    if (pl.gapF) {
      const d = pl.gapF.sw.x - pl.fx;
      fix = pl.gapF.goldSw ? ['Gold switch! Press ' + fa, 'It works from anywhere'] : Math.abs(d) < B.switchR ? ['Press ' + fa + ': fix the belt!', pl.gapF.wide ? 'A wide one!' : ''] : [d > 0 ? 'To the switch box ▶' : '◀ Back to the switch box', pl.gapF.wide ? 'A wide gap: the line stops!' : 'A small gap'];
    }
    return { run, fix, pl };
  }

  /* ---------- the tick ---------- */
  function lineStep(st, dt) {
    st.prog = clamp(st.camX / Math.max(1, st.len - W), 0, 1);
    const sp = st.room.speed || [80, 120];
    st.v = sp[0] + (sp[1] - sp[0]) * st.prog;
    // the line stops for a runner who fell in a gap, or for a wide gap coming up unfixed
    if (st.jam && st.jam.kind === 'fall' && (!open(st.jam.g) || G.players[st.runner].x > st.jam.g.x1 + 4)) st.jam = null;
    if (!st.jam || st.jam.kind === 'wide') {
      const w = st.gaps.find(g => g.wide && open(g) && g.x0 < st.camX + B.jamAt);
      if (w) {
        if (!st.jam) { st.jam = { kind: 'wide', g: w }; if (!w.stopped) { w.stopped = true; st.stats.stops++; rf27News(st, 'Line stop! ' + NAMES[st.fixer] + ', fix the belt!', false, 3.5); Sfx.play('rf27Zap', 0.6); } }
      } else st.jam = null;
    }
    const end = st.camX >= st.len - W - 1;
    // (a fall jam only stops the line once the far side of that gap is inside the runner's reach)
    const far = st.jam && st.jam.kind === 'fall' && st.jam.g.x1 + 30 > st.camX + W - B.edgeR;
    st.running = (!st.jam || far) && !end;
    if (st.jam && st.jam.kind === 'wide') {
      const g = st.jam.g;
      if (rf27BothPlaying(st, 6) && st.away < 6) g.jamT += dt;
      if (!g.goldSw && g.jamT > B.goldJam) { g.goldSw = true; st.goldUsed.push('switch'); rf27News(st, 'Gold switch! ' + NAMES[st.fixer] + ' can fix it from anywhere', true, 4.5); Sfx.play('rf27Ding'); }
    }
    if (st.running) { st.camX = Math.min(st.len - W, st.camX + st.v * dt); st.beltPhase += st.v * dt; }
  }
  function stampsStep(st, dt) {
    const R = G.players[st.runner];
    for (const s of st.stamps) {
      if (s.x < st.camX - 200 || s.x > st.camX + W + 300) { s.t += dt; continue; }
      const before = stampState(s);
      s.t += dt;
      const now = stampState(s);
      if (now.ph === 'slam' && before.ph === 'warn') Sfx.play('rf27Stamp');
      if (now.ph === 'warn' && before.ph === 'up' && s.x > st.camX && s.x < st.camX + W) Sfx.play('rf27Beep', 0.7);
      s.y = now.y;
      if (now.danger && R.alive && st.squishT <= 0 && R.x + R.w > s.x - B.headW / 2 + 4 && R.x < s.x + B.headW / 2 - 4 && R.y < now.y) {
        st.squishT = B.stunT; R.stun = B.stunT; R.sy = 0.35; R.sx = 1.7; R.vy = 0;
        s.squish++; st.stats.squish++;
        rf27Pop(st, s.x, B.BY - 60, 'Squish!', '#ffb0a0', 24); Sfx.play('rf27Bonk', 0.6);
        if (!s.gold && s.squish >= B.goldStamp && rf27BothPlaying(st, 8)) { s.gold = true; st.goldUsed.push('stamper'); rf27News(st, 'Gold nap! That stamper is asleep now', true, 4); Sfx.play('rf27Ding'); }
      }
    }
  }
  function fixStep(st, dt) {
    const F = G.players[st.fixer];
    for (const g of st.gaps) if (g.fixT > 0 && !g.fixed) {
      g.fixT -= dt;
      if (g.fixT <= 0) { g.fixed = true; rf27Pop(st, (g.x0 + g.x1) / 2, B.BY - 40, 'Fixed!', '#7aff9a', 22); Sfx.play('rf27Fix'); rf27Sparks(st, (g.x0 + g.x1) / 2, B.BY, 10, '#7affff'); }
    }
    if (!F.pendingAct) return;
    F.pendingAct = false;
    const fx = F.x + F.w / 2;
    const g = st.gaps.find(q => open(q) && q.fixT <= 0 && (q.goldSw || (Math.abs(q.sw.x - fx) < B.switchR && Math.abs(q.sw.y - (F.y + F.h)) < 60)));
    if (g) {
      g.fixT = B.fixT; st.stats.fixes[st.fixer]++;
      rf27Pop(st, g.sw.x, g.sw.y - 60, 'Click!', C.gold, 18); Sfx.play('rf27Beep', 1.4); Sfx.play('rf27Whirr', 1);
    } else {
      const near = st.gaps.find(q => q.fixed && Math.abs(q.sw.x - fx) < B.switchR);
      if (near) rf27Pop(st, fx, F.y - 20, 'Already fixed!', '#d9d3ef', 15);
    }
  }
  function playersStep(st, dt) {
    const R = G.players[st.runner], F = G.players[st.fixer];
    st.squishT -= dt;
    if (st.squishT <= 0 && R.sy < 0.9) { R.sy = 1; R.sx = 1; }
    // the runner
    if (st.boing[st.runner]) boingStep(st, R, dt);
    else {
      if (R.pendingAct) { R.pendingAct = false; R.pendingJump = true; } // (the runner's action jumps too)
      const sol = runnerSolids(st), g = rf27PlayerMove(R, dt, sol);
      if (g && g.belt && st.running) rf27Move(R, st.v * dt, 0, sol);
      edges(st, R);
      if (R.y > B.BY + 140) startBoing(st, R);
    }
    // the fixer
    if (st.boing[st.fixer]) boingStep(st, F, dt);
    else {
      const sol = fixerSolids(st);
      rf27PlayerMove(F, dt, sol);
      edges(st, F);
      if (F.y > B.CY + 110) startBoing(st, F);
    }
    // gears
    for (const q of st.gears) {
      if (q.got) continue;
      const p = q.top ? F : R;
      if (rectHit(p, q.x - B.gearR, q.y - B.gearR, B.gearR * 2, B.gearR * 2)) { q.got = true; st.stats.gears[p.id]++; Sfx.play('rf27Ding', 1 + (st.stats.gears[p.id] % 5) * 0.06); rf27Sparks(st, q.x, q.y, 5, C.gold, 120); }
    }
  }
  function edges(st, p) {
    const lo = st.camX + B.edgeL, hi = st.camX + W - B.edgeR;
    if (p.x < lo) { p.x = lo; if (p.vx < 0) p.vx = 0; }
    if (p.x > hi) { p.x = hi; if (p.vx > 0) p.vx = 0; }
  }
  function startBoing(st, p) {
    const cx = p.x + p.w / 2;
    if (p.id === st.runner) {
      const g = st.gaps.find(q => cx > q.x0 - 30 && cx < q.x1 + 30) || st.gaps.find(q => q.x0 < cx && q.x1 > cx - 200);
      const sx = g ? g.x0 - 70 : cx - 80;
      st.boing[p.id] = { t: 0, sx: clamp(sx, st.camX + 20, st.camX + W - 80), sy: B.BY - PH };
      st.stats.boings++;
      if (g) {
        g.falls++;
        if (!g.wide) st.jam = { kind: 'fall', g };
        if (!g.gold && g.falls >= B.goldGap && rf27BothPlaying(st, 8)) { g.gold = true; st.goldUsed.push('gap'); rf27News(st, 'Gold belt piece! That gap is fixed for you', true, 4); Sfx.play('rf27Ding'); }
      }
    } else {
      const q = st.grates.filter(q => q.x0 < cx).sort((a, b) => b.x0 - a.x0)[0] || st.grates[0];
      st.boing[p.id] = { t: 0, sx: Math.max(st.camX + 20, Math.min(cx, q.x1 - 40)), sy: q.y - PH };
      st.stats.fixerBoings++;
    }
    p.vx = 0; p.vy = 0;
    Sfx.play('rf27Drop');
  }
  function boingStep(st, p, dt) {
    const b = st.boing[p.id];
    b.t += dt;
    p.alive = b.t > 0.5;
    if (b.t > 0.5 && !b.up) {
      b.up = true; p.x = Math.max(b.sx, st.camX + 20); p.y = b.sy - 120; p.vy = 0;
      rf27Pop(st, p.x + p.w / 2, b.sy - 40, 'Boing!', '#ff9fd6', 22); Sfx.play('rf27Boing');
    }
    if (b.up) {
      p.vy += 1600 * dt; p.y += p.vy * dt;
      if (p.y >= b.sy) { p.y = b.sy; p.vy = 0; p.grounded = true; st.boing[p.id] = null; p.alive = true; }
    }
    p.pendingJump = false;
  }
  function camera(st) { /* the camera only moves with the line (lineStep) */ void st; }
  function tick(st, dt) {
    st.tick++;
    rf27Fx(st, dt);
    rf27People(st, dt);
    if (st.state === 'clear') {
      st.clearT += dt;
      for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; const real = p.input; p.input = NO_INPUT; try { if (!st.boing[p.id]) rf27PlayerMove(p, dt, p.id === st.runner ? runnerSolids(st) : fixerSolids(st)); } finally { p.input = real; } }
      if (st.clearT >= B.clearT) st.goNext = true;
      return;
    }
    if (G.introT > 0.4) { for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; } return; }
    if (!st.started) { st.started = true; if (st.room.news) rf27News(st, st.room.news, false, 4.5); }
    if (st.away > B.idleBreak) { st.onBreak = true; G.time -= dt; for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; } return; }
    st.onBreak = false;
    st.stats.time += dt;
    lineStep(st, dt);
    stampsStep(st, dt);
    fixStep(st, dt);
    playersStep(st, dt);
    // both at the packing bay: the stretch is done
    if (G.players.every(p => p.x > st.endX && !st.boing[p.id])) {
      st.state = 'clear'; st.clearT = 0; Sfx.play('rf27Cheer');
      rf27Pop(st, st.endX + 160, B.BY - 200, st.final ? 'All packed up!' : 'Stretch clear!', C.gold, 28);
    }
    camera(st);
  }
  function stepAll(st, dt) {
    const ps = G.players;
    for (const p of ps) p.x += st.camX;
    st.inTick = true;
    const n0 = G.particles.length;
    try { tick(st, dt); } finally {
      st.inTick = false;
      for (const p of ps) p.x -= st.camX;
      for (let i = n0; i < G.particles.length; i++) G.particles[i].x -= st.camX;
    }
  }

  /* ---------- a stretch (room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.room = def; st.final = k === (def.roomCount || 1) - 1;
    st.runner = def.runner || 0; st.fixer = 1 - st.runner; st.look = def.look || 'bolts';
    compile(st, def);
    st.pops = []; st.sparks = []; st.news = null; st.jam = null; st.boing = [null, null]; st.squishT = 0;
    st.state = 'play'; st.clearT = 0; st.goNext = false; st.started = false; st.away = 0; st.press = [0, 0];
    st.camX = 0; st.v = (def.speed || [80])[0]; st.beltPhase = 0; st.running = true; st.prog = 0;
    const sx = []; sx[st.runner] = 260; sx[st.fixer] = 330;
    G.players.forEach((p, i) => {
      const input = p.input;
      Object.assign(p, makePlayer(i), { x: sx[i], y: (i === st.runner ? B.BY : B.CY) - PH, grounded: true, face: 1, input, prevJump: true, prevAct: true });
    });
    actLabels(st);
  }
  let labelEls = null;
  function actLabels(st) {
    try {
      if (!labelEls || !labelEls.every(o => document.contains(o.el))) labelEls = Array.from(document.querySelectorAll('[data-actlabel]')).map(el => {
        const box = el.closest('[data-p]') || el.closest('[data-legp]');
        const id = box && box.dataset.p !== undefined ? +box.dataset.p : box && box.dataset.legp !== undefined ? +box.dataset.legp : -1;
        return { el, id };
      });
      let changed = false;
      for (const o of labelEls) { const want = o.id < 0 ? 'jump / fix' : o.id === st.fixer ? 'fix' : 'jump'; if (o.el.textContent !== want) { o.el.textContent = want; changed = true; } }
      if (changed && typeof fitActLabels === 'function') fitActLabels();
    } catch (e) { /* labels stay */ }
  }
  function medal(st) {
    const s = st.stats, bumps = s.boings + s.squish, frac = s.gearsTotal ? (s.gears[0] + s.gears[1]) / s.gearsTotal : 0;
    return bumps <= B.medal.gold[0] && frac >= B.medal.gold[1] ? 'Gold' : bumps <= B.medal.silver ? 'Silver' : 'Bronze';
  }

  MODES.runbelt = {
    BELT: B, plan, jobs, stampState, runnerSolids, fixerSolids, open, medal,
    setup(st, L) {
      st.stats = { gears: [0, 0], gearsTotal: 0, fixes: [0, 0], boings: 0, squish: 0, stops: 0, fixerBoings: 0, time: 0 };
      st.goldUsed = []; st.tick = 0;
      room(st, L, 0);
    },
    room(k, L) { room(G.mst, L, k); },
    step(dt) {
      const st = G.mst;
      if (!st.belts) return;
      stepAll(st, dt);
      if (st.goNext) {
        st.goNext = false;
        const L = G.level;
        if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) nextRoom();
        else { G.level.goal = { x: st.endX + 160 - st.camX, y: B.BY - 160 }; levelClear(); }
        return;
      }
      if (st.tick % 20 === 0) actLabels(st);
    },
    draw() { const st = G.mst; if (st.belts) drawWorld(st); },
    drawTop() { const st = G.mst; if (st.belts) drawTop(st); },
    hud() { const st = G.mst; if (st.belts) drawHud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const bumps = s.boings + s.squish;
      const words = bumps === 0 ? 'Not a single bump! The line never stood a chance!' : bumps <= 3 ? 'Jump, fix, jump, fix: smooth running!' : 'A bumpy shift, and every robot got packed!';
      const gold = st.goldUsed.length ? ' · Gold help: ' + [...new Set(st.goldUsed)].map(k => ({ gap: 'gold belt piece', stamper: 'gold nap', switch: 'gold switch' }[k])).join(', ') : '';
      return [
        { label: 'Gears', value: (s.gears[0] + s.gears[1]) + ' / ' + s.gearsTotal },
        { label: 'Belt fixes', values: s.fixes.slice() },
        { label: 'Bumps', value: bumps },
        { label: 'Line stops', value: s.stops },
        { label: 'Medal', value: medal(st) },
        words + ' (' + s.boings + ' Boings, ' + s.squish + ' Squishes)' + gold,
      ];
    },
  };

  /* ===================================== drawing ===================================== */
  function drawWorld(st) {
    const t = G.clock;
    rf27Backdrop(st.camX, 0, st.look, t);
    ctx.save(); ctx.translate(-Math.round(st.camX), 0);
    const vx0 = st.camX - 120, vx1 = st.camX + W + 120;
    // background: half-built robots on a side line (scenery)
    for (let x = Math.floor(vx0 / 260) * 260; x < vx1; x += 260) { const k = Math.abs(Math.round(x / 260)) % 4; rf27Bot(x + 120, B.CY - 40, 0.8, ['#ffb0a0', '#b0d0ff', '#c8f2da', '#ffe08a'][k], t + k, 1); }
    // catwalk poles and grates
    for (const g of st.grates) if (g.x1 > vx0 && g.x0 < vx1) drawGrate(g);
    // the floor under the belt
    ctx.fillStyle = '#3c4468'; ctx.fillRect(vx0, B.BY + 40, vx1 - vx0, H - B.BY);
    for (const b of st.belts) if (b.x1 > vx0 && b.x0 < vx1) drawBelt(st, b.x0, b.x1, t);
    for (const g of st.gaps) if (g.x1 > vx0 && g.x0 < vx1) drawGap(st, g, t);
    for (const g of st.gaps) if (g.sw.x > vx0 && g.sw.x < vx1) drawSwitch(st, g, t);
    // the packing bay
    drawBay(st, t);
    for (const q of st.gears) if (!q.got && q.x > vx0 && q.x < vx1) drawGear(q.x, q.y, t);
    for (const s of st.stamps) if (s.x > vx0 - 60 && s.x < vx1 + 60) drawStamp(st, s, t);
    ctx.restore();
  }
  function drawGrate(g) {
    ctx.fillStyle = '#5a6488';
    for (let x = g.x0 + 30; x < g.x1; x += 160) ctx.fillRect(x, g.y + 10, 8, B.BY - g.y - 10);
    ctx.fillStyle = '#8a96b4'; ctx.fillRect(g.x0, g.y, g.x1 - g.x0, 10);
    ctx.fillStyle = 'rgba(28,26,54,0.35)'; for (let x = g.x0 + 6; x < g.x1 - 4; x += 12) ctx.fillRect(x, g.y + 2, 6, 6);
    ctx.strokeStyle = '#c4cee6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.x0 + 4, g.y - 26); ctx.lineTo(g.x1 - 4, g.y - 26); ctx.stroke();
    ctx.lineWidth = 2; for (let x = g.x0 + 4; x <= g.x1 - 4; x += 40) { ctx.beginPath(); ctx.moveTo(x, g.y - 26); ctx.lineTo(x, g.y); ctx.stroke(); }
    // the net under the grate (catches a falling fixer)
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
  }
  function drawBelt(st, x0, x1, t, gold) {
    const y = B.BY;
    ctx.fillStyle = gold ? '#b9850f' : '#2a2f4f'; rr(x0, y, x1 - x0, 26, 10); ctx.fill();
    // rollers
    ctx.fillStyle = '#6a7296';
    for (let x = x0 + 13; x < x1 - 6; x += 26) { circle(x, y + 13, 9); ctx.fill(); }
    ctx.fillStyle = gold ? C.gold : '#3c4060'; ctx.fillRect(x0 + 2, y, x1 - x0 - 4, 7);
    // moving chevrons
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y, x1 - x0, 7); ctx.clip();
    ctx.strokeStyle = gold ? '#fff0b0' : '#ffc53d'; ctx.lineWidth = 2;
    const off = st.beltPhase % 40;
    for (let x = Math.floor(x0 / 40) * 40 + off - 40; x < x1 + 40; x += 40) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 6, y + 3.5); ctx.lineTo(x, y + 7); ctx.stroke(); }
    ctx.restore();
    void t;
  }
  function drawGap(st, g, t) {
    if (g.fixed || g.gold) { drawBelt(st, g.x0, g.x1, t, g.gold); return; }
    const y = B.BY;
    ctx.fillStyle = 'rgba(10,10,30,0.6)'; ctx.fillRect(g.x0, y, g.x1 - g.x0, 200);
    // the safety net
    ctx.strokeStyle = 'rgba(255,159,214,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let k = 0; k <= 8; k++) ctx.lineTo(g.x0 + (g.x1 - g.x0) * k / 8, y + 90 + (k % 2) * 8); ctx.stroke();
    // torn belt ends and warning lights
    ctx.fillStyle = '#2a2f4f'; ctx.beginPath(); ctx.moveTo(g.x0, y); ctx.lineTo(g.x0 + 12, y + 18); ctx.lineTo(g.x0, y + 26); ctx.fill();
    ctx.beginPath(); ctx.moveTo(g.x1, y); ctx.lineTo(g.x1 - 12, y + 18); ctx.lineTo(g.x1, y + 26); ctx.fill();
    const on = Math.sin(t * 8) > 0;
    ctx.fillStyle = g.wide ? (on ? '#ff5a5a' : '#7a2a2a') : (on ? '#ffc53d' : '#7a5a1a');
    circle(g.x0 + 8, y - 10, 6); ctx.fill(); circle(g.x1 - 8, y - 10, 6); ctx.fill();
    if (g.wide) text('WIDE', (g.x0 + g.x1) / 2, y + 50, 16, '#ff8a8a', 'center');
    // the robot arm bringing a new piece
    if (g.fixT > 0) {
      const k = 1 - g.fixT / B.fixT, ay = 60 + (B.BY - 70) * k, cx = (g.x0 + g.x1) / 2;
      ctx.strokeStyle = '#6f86b6'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(cx, 40); ctx.lineTo(cx, ay); ctx.stroke();
      ctx.fillStyle = '#2a2f4f'; rr(g.x0 + 2, ay, g.x1 - g.x0 - 4, 20, 8); ctx.fill();
      ctx.fillStyle = '#ffc53d'; ctx.fillRect(g.x0 + 4, ay, g.x1 - g.x0 - 8, 5);
    }
  }
  function drawSwitch(st, g, t) {
    const x = g.sw.x, y = g.sw.y, gold = g.goldSw, done = g.fixed || g.gold;
    ctx.fillStyle = '#4a5270'; ctx.fillRect(x - 3, y - 50, 6, 50);
    ctx.fillStyle = gold ? C.gold : '#ffc53d'; ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 2.5;
    rr(x - 18, y - 74, 36, 30, 6); ctx.fill(); ctx.stroke();
    const on = !done && Math.sin(t * 7) > 0;
    ctx.fillStyle = done ? '#7aff9a' : on ? '#ff5a5a' : '#b03a3a'; circle(x, y - 59, 9); ctx.fill(); ctx.stroke();
    // a dashed line down to its gap
    if (!done) {
      ctx.strokeStyle = gold ? 'rgba(255,197,61,0.6)' : 'rgba(255,255,255,0.25)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 18, y - 60); ctx.lineTo((g.x0 + g.x1) / 2, B.BY - 20); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  function drawStamp(st, s, t) {
    const ss = stampState(s), y = ss.y, x = s.x, hw = B.headW / 2;
    ctx.fillStyle = '#5a6488'; ctx.fillRect(x - 10, 50, 20, y - 70);
    ctx.fillStyle = '#4a5270'; rr(x - 40, 40, 80, 30, 6); ctx.fill();
    ctx.fillStyle = s.gold ? C.gold : '#9aa8c8'; ctx.strokeStyle = '#2a2f4f'; ctx.lineWidth = 3;
    rr(x - hw, y - 30, hw * 2, 30, 4); ctx.fill(); ctx.stroke();
    rf27Stripes(x - hw + 3, y - 8, hw * 2 - 6, 6);
    const warn = ss.ph === 'warn' && Math.sin(t * 22) > 0;
    ctx.fillStyle = s.gold ? '#fff0b0' : warn ? '#ff5a5a' : ss.danger ? '#ff8a5a' : '#3a5a3a'; circle(x, 56, 7); ctx.fill();
    if (s.gold) text('Zzz', x + 30, y - 46 + Math.sin(t * 2) * 4, 16, C.gold, 'center');
    if (ss.ph === 'down') { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x - hw - 10, B.BY - 4, 10, 4); ctx.fillRect(x + hw, B.BY - 4, 10, 4); }
  }
  function drawBay(st, t) {
    const x = st.endX, y = B.BY;
    ctx.fillStyle = '#8e5a2e'; ctx.fillRect(x + 80, y - 140, 220, 140);
    ctx.fillStyle = '#d39a5c'; ctx.fillRect(x + 90, y - 130, 200, 120);
    text('PACKING', x + 190, y - 100, 24, '#5a3a1a', 'center');
    text(st.final ? 'ALL DONE!' : 'NEXT LINE ▶', x + 190, y - 66, 16, '#5a3a1a', 'center');
    ctx.fillStyle = Math.sin(t * 4) > 0 ? '#7aff9a' : '#2f6a3f'; circle(x + 190, y - 156, 8); ctx.fill();
    // a flag on the catwalk end
    ctx.fillStyle = '#4a5270'; ctx.fillRect(x + 40, B.CY - 70, 5, 70);
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(x + 45, B.CY - 70); ctx.lineTo(x + 80, B.CY - 60 + Math.sin(t * 4) * 3); ctx.lineTo(x + 45, B.CY - 50); ctx.fill();
  }
  function drawGear(x, y, t) {
    rf27Gear(x, y + Math.sin(t * 3 + x) * 2, B.gearR + 2, 8, t * 2, C.gold, '#b9850f');
  }
  function drawTop(st) {
    ctx.save(); ctx.translate(-Math.round(st.camX), 0);
    rf27DrawPops(st);
    ctx.restore();
  }
  function drawHud(st) {
    const s = st.stats, big = rf27Big();
    const pct = Math.round(st.prog * 100);
    rf27TopPill(['Gears ' + (s.gears[0] + s.gears[1]) + '/' + s.gearsTotal, 'Bumps ' + (s.boings + s.squish), 'Line ' + pct + '%']);
    // the speed gauge
    const sp = st.room.speed || [80, 120], k = clamp((st.v - 60) / 140, 0, 1), gx = W - 160, gy = big ? 58 : 50;
    ctx.fillStyle = 'rgba(28,26,54,0.78)'; rr(gx, gy, 146, big ? 26 : 22, 11); ctx.fill();
    ctx.fillStyle = st.running ? (k > 0.6 ? '#ff8a5a' : '#7aff9a') : '#ff5a5a'; rr(gx + 4, gy + 4, 138 * Math.max(0.05, st.running ? k : 0.05), (big ? 26 : 22) - 8, 7); ctx.fill();
    text(st.running ? 'Belt speed' : 'LINE STOP', gx + 73, gy + (big ? 13.5 : 11.5), big ? 14 : 11, '#ffffff', 'center', 'body');
    void sp;
    rf27DrawNews(st, big ? 104 : 86);
    const j = jobs(st), cR = isCpu(st.runner), cF = isCpu(st.fixer);
    rf27Panel(st.runner, NAMES[st.runner] + ': RUNNER' + (cR ? ' (computer)' : ''), cR ? 'Jumps gaps, dodges stampers' : j.run[0], cR ? '' : j.run[1], st.runner === 0 ? 'left' : 'right');
    rf27Panel(st.fixer, NAMES[st.fixer] + ': FIXER' + (cF ? ' (computer)' : ''), cF ? 'Fixes the belt ahead' : j.fix[0], cF ? '' : j.fix[1], st.fixer === 0 ? 'left' : 'right');
    if (st.onBreak) rf27Break();
  }
})();
