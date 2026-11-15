/* Pip & Bo - Level 27-3 Magnet Crane Crew (team, World 27 Robot Factory). */
'use strict';

/* ===== 27-3 Magnet Crane Crew (mode 'magcrane', team) — Gavyn's pick =====
   "One runs a magnet crane, the other rides the magnet and grabs metal crates to build a path to the exit."
   One screen per bay (four bays, def.roomWord 'Bay'). The mode owns the tick, the picture and the HUD (ownStep,
   ownHUD, noFalls). The bay is a row of 16 columns, 60 px wide; the ground (and the crates on it) is written into the
   engine's tile grid each time it changes, so the rider walks and jumps with the engine's own moveX / moveY.
   - THE OPERATOR sits in the crane cab on the rail at the top: ◀ ▶ drive the trolley along the rail, ▲ ▼ wind the
     magnet's cable up and down. The action ('crate') drops a fresh metal crate from the chute at the top left (at most
     one every 2 s, and only while fewer than 12 crates are about).
   - THE RIDER stands on the magnet (a moving platform: it carries them) and walks, jumps and hops on and off like
     anywhere else. The action ('grab') turns the magnet on while it is down on a crate: the top crate of that column
     sticks under the magnet ("Clunk!"). The action again drops it: it falls straight down into the column under the
     magnet (a ghost shows where). The rider can only grab and drop while riding.
   - The path: pits are 2 crates deep and 3 columns wide (too wide to jump, so they need stepping crates); the exit door
     is often up high (a jump climbs one crate, so the path needs steps). The bay is done when the rider walks through
     the exit door, having WALKED there from the START pad (riding the magnet over doesn't count: "Walk it from the
     START pad!"). Falling into a pit is a soft "Boing!": the foam pops the rider back to the start.
   - Roles swap every bay: Pip runs the crane in bays 1 and 3. Bays: Pit Stop, Stair Climb, Double Pit, Tower Top.
   - Gold help (announced, only while both play): 2 Boings in one pit lay a gold plank over it; 30 s without placing a
     crate shows gold ghost crates where the path needs them.
   - Idle: 12 s with no person pressing anything: "Taking a break", the clock stops.
   Medal goals (CRANE.medal, MODES.magcrane.medals, js/medals.js; the crane clock, st.stats.time): Gold <= 3:30 and
   <= 2 Boings; Silver <= 6:00 and <= 8. Results tiles: Crates placed, Grabs, Boings.
   Room def: { title, op: 0|1, look, tip, ground: 16 chars ('0'-'5' ground height in crates, 'p' a pit), crates:
   [[col, n]], exit: col, plan: [[col, height]] (the path the computer builds, in order) }.
   MODES.magcrane exposes CRANE, plan helpers and the magnet for the brain. Every top-level name starts with crane /
   CRANE. */
const CRANE = {
  GY: 420, CW: 60, cols: 16, railY: 46, trolleyV: 190, cableV: 170, cableMin: 50, magW: 56, magH: 18,
  grabReach: 14, chuteCD: 2, maxCrates: 12, dropG: 1400, pitBottom: 540, fallY: 520,
  goldPit: 2, goldGuide: 30, idleBreak: 12, clearT: 1.6,
  medal: { gold: [210, 2], silver: [360, 8] },
};

(() => {
  const K = CRANE, CW = K.CW;
  const key = rf27Key, isCpu = rf27IsCpu;

  /* ---------- the bay ---------- */
  const colTop = (st, c) => { const g = st.ground[c]; return (g === 'p' ? K.pitBottom : K.GY - g * CW) - st.stacks[c] * CW; };
  const baseTop = (st, c) => { const g = st.ground[c]; return g === 'p' ? K.pitBottom : K.GY - g * CW; };
  const colOf = x => clamp(Math.floor(x / CW), 0, K.cols - 1);
  function writeGrid(st) {
    const grid = G.level.grid;
    for (let r = 0; r < ROWS; r++) for (let x = 0; x < COLS; x++) grid[r][x] = '.';
    for (let c = 0; c < K.cols; c++) {
      const bt = baseTop(st, c), top = colTop(st, c);
      for (let r = Math.max(0, Math.floor(top / T)); r < ROWS; r++) for (const x of [c * 2, c * 2 + 1]) grid[r][x] = r * T >= bt ? '#' : 'P';
      if (st.planks[c]) for (const x of [c * 2, c * 2 + 1]) grid[Math.floor(K.GY / T)][x] = '#';
    }
  }
  const pits = st => {
    const out = [];
    for (let c = 0; c < K.cols; c++) if (st.ground[c] === 'p' && (c === 0 || st.ground[c - 1] !== 'p')) { let e = c; while (e + 1 < K.cols && st.ground[e + 1] === 'p') e++; out.push({ c0: c, c1: e }); }
    return out;
  };
  // the magnet's box (bottom edge = mag.y + magH)
  const magBox = st => ({ x: st.mag.x - K.magW / 2, y: st.mag.y, w: K.magW, h: K.magH });
  const magCol = st => colOf(st.mag.x);
  // can the rider grab now: the magnet is down on the top crate of the column under it
  function canGrab(st) {
    if (st.carry) return false;
    const c = magCol(st);
    if (!st.stacks[c]) return false;
    return Math.abs(st.mag.y + K.magH - colTop(st, c)) <= K.grabReach;
  }
  // the column a drop would land in, and how much more the plan wants in each column
  function deficit(st, c) { const q = st.plan.find(p => p[0] === c); return q ? Math.max(0, q[1] - (st.stacks[c] + (st.ground[c] === 'p' ? -2 : +st.ground[c]))) : 0; }
  const planDone = st => st.plan.every(q => deficit(st, q[0]) === 0);
  const curHeight = (st, c) => st.stacks[c] + (st.ground[c] === 'p' ? -2 : +st.ground[c]);

  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.room = def; st.final = k === (def.roomCount || 1) - 1;
    st.op = def.op || 0; st.rider = 1 - st.op; st.look = def.look || 'bolts';
    st.ground = (def.ground || '0000000000000000').split('').map(ch => (ch === 'p' ? 'p' : +ch));
    st.stacks = new Array(K.cols).fill(0); st.planks = new Array(K.cols).fill(false);
    for (const [c, n] of def.crates || []) st.stacks[c] += n;
    st.plan = (def.plan || []).map(q => q.slice());
    st.exit = def.exit != null ? def.exit : 15;
    st.start = def.start != null ? def.start : 1; st.walked = false; st.walkCD = 0;
    st.pitFalls = {};
    st.mag = { x: (def.magX || 2) * CW + CW / 2, y: 0, vx: 0, vy: 0, on: false };
    st.mag.y = baseTop(st, colOf(st.mag.x)) - 70;
    st.carry = false; st.falling = []; st.chuteT = 0; st.lastPlace = 0; st.guide = false;
    st.pops = []; st.sparks = []; st.news = null;
    st.state = 'play'; st.clearT = 0; st.goNext = false; st.started = false; st.away = 0; st.press = [0, 0]; st.roomT = 0;
    writeGrid(st);
    const R = G.players[st.rider], O = G.players[st.op];
    G.players.forEach((p, i) => { const input = p.input; Object.assign(p, makePlayer(i), { input, prevJump: true, prevAct: true, face: 1 }); });
    R.x = st.mag.x - PW / 2; R.y = st.mag.y - PH; R.grounded = true; st.riding = true;
    seatOp(st); void O;
    G.spawnPts = [{ x: R.x, y: R.y }, { x: R.x, y: R.y }];
    actLabels(st);
  }
  function seatOp(st) {
    const O = G.players[st.op];
    O.x = st.mag.x - PW / 2 - 2; O.y = K.railY + 30 - PH; O.vx = 0; O.vy = 0; O.alive = true; O.grounded = true;
    O.face = st.mag.vx > 1 ? 1 : st.mag.vx < -1 ? -1 : O.face;
  }

  /* ---------- the tick ---------- */
  function craneStep(st, dt) {
    const O = G.players[st.op], R = G.players[st.rider], m = st.mag;
    const i = O.input, mv = (i.right ? 1 : 0) - (i.left ? 1 : 0), ud = (i.down ? 1 : 0) - (i.up || i.jump ? 1 : 0);
    O.pendingJump = false;
    const x0 = m.x, y0 = m.y;
    m.vx = approach(m.vx, mv * K.trolleyV, 900 * dt);
    // the cable: down stops on whatever is under the magnet (or the hanging crate)
    const bottom = st.carry ? K.magH + CW : K.magH;
    const lowAt = x => Math.min(...[colOf(x - K.magW / 2 + 1), colOf(x + K.magW / 2 - 1)].map(c => colTop(st, c))) - bottom;
    // a lowered magnet driven at a taller column waits there and winds itself up until it clears (no snap up)
    let nx = clamp(m.x + m.vx * dt, 34, W - 34), wind = false;
    if (nx !== m.x && m.y > K.railY + K.cableMin + 0.5 && lowAt(nx) < m.y - 0.5 && lowAt(nx) < lowAt(m.x)) { nx = m.x; m.vx = 0; wind = true; }
    m.x = nx;
    if (m.x === 34 || m.x === W - 34) m.vx = 0;
    const lowest = lowAt(m.x);
    m.vy = (wind ? -1 : ud) * K.cableV;
    m.y = clamp(m.y + m.vy * dt, K.railY + K.cableMin, lowest);
    m.vy = dt > 0 ? (m.y - y0) / dt : 0; // (what it really did: 0 when the cable is at a stop)
    // a rider standing on the magnet goes with it (and is never squashed into the ceiling)
    if (st.riding && !st.boing) {
      const dx = m.x - x0, dy = m.y - y0;
      if (dx) moveX(R, dx, true);
      R.y = m.y - PH;
      if (dy > 0 && R.y + PH > m.y + 0.5) R.y = m.y - PH;
    }
    if (O.pendingAct) {
      O.pendingAct = false;
      const n = st.stacks.reduce((a, b) => a + b, 0) + (st.carry ? 1 : 0) + st.falling.length;
      if (st.chuteT > 0) rf27Pop(st, 50, 120, 'Wait a moment!', '#d9d3ef', 15);
      else if (n >= K.maxCrates) rf27Pop(st, 50, 120, 'Enough crates!', '#d9d3ef', 15);
      else { st.chuteT = K.chuteCD; st.falling.push({ c: 0, x: 0 + CW / 2, y: 70, vy: 0, chute: true }); Sfx.play('rf27Clank', 1.2); st.stats.called++; }
    }
    st.chuteT -= dt;
    void bottom;
  }
  function riderStep(st, dt) {
    const R = G.players[st.rider], m = st.mag;
    if (st.boing) {
      const b = st.boing; b.t += dt; R.alive = b.t > 0.6;
      if (b.t > 0.6 && !b.up) { b.up = true; R.x = b.x; R.y = b.y - 140; R.vy = 0; rf27Pop(st, b.x + 11, b.y - 40, 'Boing!', '#ff9fd6', 22); Sfx.play('rf27Boing'); }
      if (b.up) { R.vy += 1600 * dt; R.y += R.vy * dt; if (R.y >= b.y) { R.y = b.y; R.vy = 0; R.grounded = true; st.boing = null; R.alive = true; } }
      R.pendingAct = false; R.pendingJump = false;
      return;
    }
    // the magnet: grab and drop (only while riding)
    if (R.pendingAct) {
      R.pendingAct = false;
      if (!st.riding) rf27Pop(st, R.x + 11, R.y - 20, 'Ride the magnet!', '#d9d3ef', 15);
      else if (st.carry) {
        const c = magCol(st);
        st.carry = false; st.falling.push({ c, x: m.x, y: m.y + K.magH, vy: 0 });
        Sfx.play('rf27Drop'); st.stats.drops[st.rider]++;
      } else if (canGrab(st)) {
        const c = magCol(st);
        st.stacks[c]--; st.carry = true; writeGrid(st);
        rf27Pop(st, m.x, m.y - 30, 'Clunk!', '#bff6ff', 18); Sfx.play('rf27Magnet'); st.stats.grabs[st.rider]++;
        rf27Sparks(st, m.x, m.y + K.magH, 6, '#7affff');
      } else { rf27Pop(st, m.x, m.y - 30, st.stacks[magCol(st)] ? 'Lower!' : 'No crate here', '#d9d3ef', 15); Sfx.play('rf27Zap', 1.4); }
    }
    // walking and jumping (the engine's platformer, through the tile grid)
    const was = R.grounded;
    control(R, dt);
    moveX(R, R.vx * dt, true); // (ignorePartner: the operator up in the cab is scenery)
    const vy = R.vy, ry0 = R.y;
    moveY(R, R.vy * dt, true);
    // landing on the magnet (a one-way platform)
    const mb = magBox(st);
    if (!st.riding && vy >= 0 && ry0 + PH <= mb.y + 1 && R.y + PH >= mb.y && R.x + R.w > mb.x + 2 && R.x < mb.x + mb.w - 2) { R.y = mb.y - PH; R.vy = 0; st.riding = true; }
    if (st.riding) {
      const on = R.x + R.w > mb.x + 2 && R.x < mb.x + mb.w - 2 && Math.abs(R.y + PH - mb.y) < 2 && !(R.vy < 0);
      if (!on) st.riding = false; else { R.y = mb.y - PH; R.vy = 0; R.grounded = true; R.jumping = false; R.coyote = PHYS.coyote; }
    }
    if (!st.riding) {
      const pr = probe(R);
      R.grounded = pr.tile; R.tileGround = pr.tile; R.onPartner = false; R.onOneWay = pr.oneway;
    }
    if (R.grounded && !was && vy > 260) { R.sx = 1.25; R.sy = 0.78; puff(R.x + R.w / 2, R.y + R.h, 5, 'rgba(255,255,255,0.75)'); Sfx.play('land'); }
    R.lastVy = R.grounded ? 0 : R.vy;
    R.x = clamp(R.x, 0, W - R.w);
    if (R.y > K.fallY) startBoing(st, R);
    // the path has to be walked: standing on the ground by the START pad counts, riding the magnet un-counts it
    if (st.riding) st.walked = false;
    else if (R.grounded && Math.abs(colOf(R.x + R.w / 2) - st.start) <= 1) st.walked = true;
  }
  function startBoing(st, R) {
    const c = colOf(R.x + R.w / 2), pit = pits(st).find(q => c >= q.c0 - 1 && c <= q.c1 + 1);
    // back to the start: the first column, on whatever stands there
    const sc = st.start;
    st.boing = { t: 0, x: sc * CW + CW / 2 - PW / 2, y: colTop(st, sc) - PH, up: false };
    st.riding = false; st.stats.boings++;
    Sfx.play('rf27Drop');
    if (pit) {
      const k = pit.c0; st.pitFalls[k] = (st.pitFalls[k] || 0) + 1;
      if (st.pitFalls[k] >= K.goldPit && !st.planks[pit.c0] && rf27BothPlaying(st, 8)) {
        for (let q = pit.c0; q <= pit.c1; q++) st.planks[q] = true;
        writeGrid(st); st.goldUsed.push('plank');
        rf27News(st, 'Gold plank! A bridge over that pit', true, 4); Sfx.play('rf27Ding');
      }
    }
  }
  function cratesStep(st, dt) {
    const R = G.players[st.rider];
    for (const f of st.falling) {
      f.vy += K.dropG * dt; f.y += f.vy * dt;
      const top = colTop(st, f.c);
      if (f.y + CW >= top) {
        f.done = true; st.stacks[f.c]++; writeGrid(st);
        Sfx.play('rf27Clank', 0.9); rf27Sparks(st, f.c * CW + CW / 2, top, 6, '#c4cee6');
        if (!f.chute) { st.stats.placed++; st.lastPlace = st.roomT; if (st.guide) st.guide = false; }
        // a crate landing on the rider lifts them on top
        const ct = colTop(st, f.c);
        if (R.x + R.w > f.c * CW && R.x < f.c * CW + CW && R.y + PH > ct && R.y < ct + CW) { R.y = ct - PH; R.vy = 0; st.riding = false; }
      }
    }
    st.falling = st.falling.filter(f => !f.done);
  }
  function tick(st, dt) {
    st.tick++;
    rf27Fx(st, dt);
    rf27People(st, dt);
    if (st.state === 'clear') {
      st.clearT += dt;
      for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
      if (st.clearT >= K.clearT) st.goNext = true;
      seatOp(st);
      return;
    }
    if (G.introT > 0.4) { for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; } seatOp(st); return; }
    if (!st.started) { st.started = true; if (st.room.news) rf27News(st, st.room.news, false, 4.5); }
    if (st.away > K.idleBreak) { st.onBreak = true; G.time -= dt; for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; } return; }
    st.onBreak = false;
    st.stats.time += dt; st.roomT += dt;
    craneStep(st, dt);
    riderStep(st, dt);
    cratesStep(st, dt);
    seatOp(st);
    if (!st.guide && st.roomT - st.lastPlace > K.goldGuide && !planDone(st) && rf27BothPlaying(st, 6)) {
      st.guide = true; st.goldUsed.push('guide'); rf27News(st, 'Gold guide! The gold ghosts show where crates go', true, 4.5); Sfx.play('rf27Ding');
    }
    // the exit
    const R = G.players[st.rider], ex = st.exit * CW, et = colTop(st, st.exit);
    st.walkCD -= dt;
    if (!st.boing && !st.walked && R.grounded && !st.riding && colOf(R.x + R.w / 2) === st.exit && st.walkCD <= 0) {
      st.walkCD = 3; rf27Pop(st, ex + 30, et - 70, 'Walk it from the START pad!', '#ffffff', 16); Sfx.play('rf27Zap', 1.3);
    }
    if (!st.boing && st.walked && R.x + R.w / 2 > ex + 8 && R.x + R.w / 2 < ex + CW - 8 && Math.abs(R.y + PH - et) < 4) {
      st.state = 'clear'; st.clearT = 0; Sfx.play('rf27Cheer');
      rf27Pop(st, ex + 30, et - 90, st.final ? 'Top of the tower!' : 'Bay clear!', C.gold, 28);
    }
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
      for (const o of labelEls) { const want = o.id < 0 ? 'grab / crate' : o.id === st.op ? 'crate' : 'grab'; if (o.el.textContent !== want) { o.el.textContent = want; changed = true; } }
      if (changed && typeof fitActLabels === 'function') fitActLabels();
    } catch (e) { /* labels stay */ }
  }
  function jobs(st) {
    const R = st.rider, O = st.op, nR = NAMES[R], nO = NAMES[O];
    const ra = key(R, 'act', 'grab');
    let op = ['Drive ' + key(O, 'left') + ' ' + key(O, 'right') + ', cable ' + key(O, 'up') + ' ' + key(O, 'down'), 'Lower ' + nR + ' onto a crate'];
    let rd = ['Ride the magnet!', 'Press ' + ra + ' on a crate: grab'];
    if (!st.riding) {
      rd = st.walked ? ['Walk your path to the exit!', 'Build more if it\'s too steep'] : ['Hop back on the magnet', 'Or walk from the START pad'];
      op = st.walked ? [nR + ' is walking the path', 'Help with more crates?'] : ['Bring the magnet to ' + nR, 'Lower it beside them'];
    } else if (st.carry) {
      rd = ['Press ' + ra + ' to drop the crate', 'It falls where the ghost is'];
      op = ['Carry it to the path', 'Build steps and fill the pits'];
    } else if (canGrab(st)) {
      rd = ['Grab it! Press ' + ra, ''];
      op = ['Hold still: ' + nR + ' grabs it', ''];
    }
    return { op, rd, nO };
  }

  MODES.magcrane = {
    CRANE: K, colTop, baseTop, colOf, canGrab, deficit, planDone, curHeight, pits, magCol,
    medals: { bronze: 'Build your way out of every bay', goals: [
      { key: 'time', gold: K.medal.gold[0], silver: K.medal.silver[0] },
      { key: 'boings', gold: K.medal.gold[1], silver: K.medal.silver[1], word: 'Boing' },
    ] },
    medalValues() { const s = G.mst.stats; return s ? { time: s.time, boings: s.boings } : {}; },
    setup(st, L) {
      st.stats = { placed: 0, grabs: [0, 0], drops: [0, 0], boings: 0, called: 0, time: 0 };
      st.goldUsed = []; st.tick = 0;
      room(st, L, 0);
    },
    room(k, L) { room(G.mst, L, k); },
    step(dt) {
      const st = G.mst;
      if (!st.stacks) return;
      tick(st, dt);
      if (st.goNext) {
        st.goNext = false;
        const L = G.level;
        if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) nextRoom();
        else { G.level.goal = { x: st.exit * CW + 30, y: colTop(st, st.exit) - 60 }; levelClear(); }
        return;
      }
      if (st.tick % 20 === 0) actLabels(st);
    },
    draw() { const st = G.mst; if (st.stacks) drawWorld(st); },
    drawTop() { const st = G.mst; if (st.stacks) drawTop(st); },
    hud() { const st = G.mst; if (st.stacks) drawHud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const words = s.boings === 0 ? 'Not one Boing! Crane experts!' : s.boings <= 2 ? 'Lift, swing, drop: lovely teamwork!' : 'A few Boings, and you built your way out!';
      const gold = st.goldUsed.length ? ' · Gold help: ' + [...new Set(st.goldUsed)].map(k => ({ plank: 'gold plank', guide: 'gold guide' }[k])).join(', ') : '';
      return [
        { label: 'Crates placed', value: s.placed },
        { label: 'Grabs', values: s.grabs.slice() },
        { label: 'Boings', value: s.boings },
        words + (s.called ? ' New crates called: ' + s.called + '.' : '') + gold,
      ];
    },
  };

  /* ===================================== drawing ===================================== */
  function drawWorld(st) {
    const t = G.clock;
    rf27Backdrop(0, 0, st.look, t);
    // the rail
    ctx.fillStyle = '#4a5270'; ctx.fillRect(0, K.railY - 8, W, 16);
    rf27Stripes(0, K.railY + 8, W, 6);
    for (let x = 30; x < W; x += 120) { ctx.fillStyle = '#3c4468'; ctx.fillRect(x, 0, 10, K.railY - 8); }
    // the chute at the top left
    ctx.fillStyle = '#5a6488'; ctx.fillRect(6, K.railY + 34, 48, 40); rf27Stripes(6, K.railY + 74, 48, 6);
    text('NEW', 30, K.railY + 56, 12, '#ffffff', 'center');
    for (let c = 0; c < K.cols; c++) {
      const x = c * CW, bt = baseTop(st, c);
      if (st.ground[c] === 'p') {
        ctx.fillStyle = '#1c1a36'; ctx.fillRect(x, K.GY, CW, H - K.GY);
        ctx.fillStyle = '#ff9fd6'; for (let k = 0; k < 4; k++) { circle(x + 8 + k * 15, H - 6 + Math.sin(t * 3 + k + c) * 2, 9); ctx.fill(); }
        if (st.planks[c]) { ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 3; ctx.fillRect(x, K.GY, CW, 14); ctx.strokeRect(x, K.GY, CW, 14); }
      } else rf27Floor(x, bt, CW, H - bt, st.look);
      for (let k = 0; k < st.stacks[c]; k++) rf27Crate(x, bt - (k + 1) * CW, CW, CW, 'metal', t);
    }
    // the START pad
    { const sx = st.start * CW, sy = colTop(st, st.start);
      ctx.fillStyle = st.walked ? '#7aff9a' : '#4fb276'; rr(sx + 6, sy - 6, CW - 12, 8, 4); ctx.fill();
      text('START', sx + 30, sy + 14, 12, '#ffffff', 'center'); }
    // the exit door
    const ex = st.exit * CW, et = colTop(st, st.exit);
    ctx.fillStyle = '#2a2f4f'; ctx.fillRect(ex + 4, et - 92, 52, 92);
    ctx.fillStyle = st.state === 'clear' ? '#ffe9a8' : '#7aff9a'; ctx.fillRect(ex + 10, et - 84, 40, 84);
    text('EXIT', ex + 30, et - 104, 16, C.gold, 'center');
    // the gold ghosts (gold guide) and the drop ghost
    if (st.guide) for (const [c] of st.plan) { const d = deficit(st, c); for (let k = 0; k < d; k++) { ctx.strokeStyle = 'rgba(255,197,61,0.8)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 3; ctx.strokeRect(c * CW + 4, colTop(st, c) - (k + 1) * CW + 4, CW - 8, CW - 8); ctx.setLineDash([]); } }
    if (st.carry) {
      const c = magCol(st), top = colTop(st, c);
      ctx.fillStyle = 'rgba(191,246,255,0.22)'; ctx.fillRect(c * CW + 2, top - CW + 2, CW - 4, CW - 4);
      ctx.strokeStyle = 'rgba(191,246,255,0.7)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2; ctx.strokeRect(c * CW + 2, top - CW + 2, CW - 4, CW - 4); ctx.setLineDash([]);
    }
    for (const f of st.falling) rf27Crate(f.c * CW, f.y, CW, CW, 'metal', t);
    drawCrane(st, t);
  }
  function drawCrane(st, t) {
    const m = st.mag, mb = magBox(st);
    // trolley and cab
    ctx.fillStyle = '#ffc53d'; ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 3;
    rr(m.x - 40, K.railY - 14, 80, 22, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a2f4f'; circle(m.x - 26, K.railY - 12, 6); ctx.fill(); circle(m.x + 26, K.railY - 12, 6); ctx.fill();
    ctx.fillStyle = PCOL[st.op]; rr(m.x - 24, K.railY + 4, 48, 34, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(20,30,60,0.75)'; rr(m.x - 18, K.railY + 6, 36, 28, 6); ctx.fill();
    // cable
    ctx.strokeStyle = '#2a2f4f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(m.x, K.railY + 38); ctx.lineTo(m.x, mb.y); ctx.stroke();
    // the magnet (with a hanging crate)
    if (st.carry) rf27Crate(m.x - CW / 2, mb.y + K.magH, CW, CW, 'metal', t);
    ctx.fillStyle = '#e8574a'; ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 3; rr(mb.x, mb.y, mb.w, mb.h, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d9dbe8'; ctx.fillRect(mb.x + 4, mb.y + mb.h - 6, 12, 6); ctx.fillRect(mb.x + mb.w - 16, mb.y + mb.h - 6, 12, 6);
    if (st.carry || canGrab(st)) {
      ctx.strokeStyle = st.carry ? 'rgba(122,255,255,0.9)' : 'rgba(122,255,255,' + (0.4 + 0.4 * Math.sin(t * 10)) + ')'; ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) { const x = mb.x + 14 + k * 18; ctx.beginPath(); ctx.moveTo(x, mb.y + mb.h); ctx.lineTo(x + 4, mb.y + mb.h + 6); ctx.lineTo(x - 2, mb.y + mb.h + 10); ctx.stroke(); }
    }
  }
  function drawTop(st) {
    // cab glass over the operator
    const m = st.mag;
    ctx.fillStyle = 'rgba(190,240,255,0.2)'; rr(m.x - 18, K.railY + 6, 36, 28, 6); ctx.fill();
    rf27DrawPops(st);
  }
  function drawHud(st) {
    const s = st.stats, big = rf27Big();
    rf27TopPill([fmtTime(G.time), 'Crates ' + s.placed, 'Boings ' + s.boings]);
    rf27DrawNews(st, big ? 104 : 86);
    const j = jobs(st), cO = isCpu(st.op), cR = isCpu(st.rider);
    rf27Panel(st.op, NAMES[st.op] + ': CRANE' + (cO ? ' (computer)' : ''), cO ? 'Drives the crane' : j.op[0], cO ? '' : j.op[1], st.op === 0 ? 'left' : 'right');
    rf27Panel(st.rider, NAMES[st.rider] + ': MAGNET' + (cR ? ' (computer)' : ''), cR ? 'Grabs and drops crates' : j.rd[0], cR ? '' : j.rd[1], st.rider === 0 ? 'left' : 'right');
    if (st.onBreak) rf27Break();
  }
})();
