/* Pip & Bo - Level 8-1 Plinko Drop (team). */
'use strict';

/* ===== 8-1 Plinko Drop (mode 'plinko', World 8 "Lucky Casino", teamwork) ==================================
   One player IS the chip dropping through a carnival peg board; the other slides the paddles that kick it toward
   the JACKPOT slot. Roles swap every drop, 4 drops per board, 3 boards (rooms). Pretend tickets only.
   def.ownStep: the mode runs its own chip physics and draws the whole cabinet (the core grid is blanked).
   The act keys (F/E, / . , Enter, pad X/Y/RB/RT) work like ▲ (no def.act, so no touch act button).
   Everything lives in this block: only MODES.plinko and Sfx.extra.plinko* are visible outside it.
   Internal names keep the word "ball" (st.ball = the chip player, st.b = the chip). Spec: w8/plinko/SPEC.md. */
{
  const PLINKO = {
    // the ball (the "dropper")
    r: 11, g: 600, gDive: 1700, vMax: 300, vMaxDive: 620, airDrag: 0.25,
    leanAcc: 260, leanMax: 60, hopLean: 90, hopLeanMax: 200,   // (review) the chip steers for real: lean 60 px/s, a hop goes the way you lean
    pegR: 5, pegE: 0.45, pegEDive: 0.15, pegJitter: 45, wallE: 0.4, postE: 0.4,
    hopV: 300, hops: 2,
    chuteSpeed: 260, autoDrop: 8, autoWarn: 5,
    // the paddles (the "kicker")
    padW: 96, padH: 12, padSpeed: 340, padAcc: 3400,
    padBounce: 250, kickVx: 240, bumpMul: 1.45, zoneEdge: 1 / 3, midKeep: 0.2, padSwipe: 0.3, padMaxVx: 360,
    bumpWin: 0.2, bumpCD: 0.45, padNaps: 2,
    // board things
    bumperR: 15, bumperOut: 360, bumperUpMax: 180,
    stallV: 30, stallT: 0.5, stallKick: 90, heavyT: 20, catchDepth: 22,
    stuckDX: 4, stuckDY: 60, stuckT: 1.5, popPay: 10,   // (review) bouncing in place 1.5 s -> sideways nudge; tickets for 10 pops per drop at most
    luckyAfter: 2, luckyDamp: 0.85, luckyMid: true, lightStep: 0.7,   // luckyMid: on a lucky drop the middle third aims too
    values: [500, 150, 50, 20], chip: 10, bumperTix: 5, lightsBonus: 50,
    // flow
    swapT: 1.1, scoreT: 1.7, tallyT: 3.0, introLock: 0.6,
  };
  const PENTA = [523, 587, 659, 784, 880];   // peg notes by column (a little xylophone)
  const PLINKO_SAY = ['Wheee!', 'Here I go!', 'Woo-hoo!', 'Wheee!', 'Yahoo!', 'Boing boing!'];   // the chip's drop shout (cosmetic, no rand)
  // the results line: what the pretend tickets would buy at the prize desk (a joke, nothing is spent)
  const PLINKO_PRIZES = [[1000, 'a shiny sticker'], [2000, 'a bouncy ball'], [3000, 'a yo-yo'], [4000, 'a rubber duck'], [5000, 'a giant teddy'], [Infinity, 'the golden plinko chip']];
  const PL_GOLD = '#ffc53d', PL_FELT = '#2c1f5e', PL_FELT2 = '#3a2a78', PL_PINK = '#ff5fa2', PL_TEAL = '#3fd6c4';
  const fmtN = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // ---------- board parsing (raw map strings; the core grid is blanked so the core draws nothing) ----------
  function plinkoParse(def) {
    const map = def.map, B = { pegs: [], rails: [], posts: [], bumpers: [], chips: [], rings: [], chute: null, def };
    const grid = map.map(r => r.split(''));
    let c1 = null, c2 = null;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const ch = grid[y][x], cx = x * T + T / 2, cy = y * T + T / 2;
      if (ch === 'p') B.pegs.push({ x: cx, y: cy, col: x, t: 0 });
      else if (ch === 'B') B.bumpers.push({ x: cx, y: cy, t: 0, lit: false });
      else if (ch === '$') B.chips.push({ x: cx, y: cy, got: false, t: 0 });
      else if (ch === 'x') B.rings.push({ x: cx, y: cy, used: false, t: 0 });
      else if (ch === '1') c1 = { x, y };
      else if (ch === '2') c2 = { x, y };
    }
    for (let y = 0; y < ROWS; y++) {
      let x = 0;
      while (x < COLS) {
        if (grid[y][x] !== '-') { x++; continue; }
        let e = x; while (e + 1 < COLS && grid[y][e + 1] === '-') e++;
        B.rails.push({ y: y * T + T / 2, x0: x * T, x1: (e + 1) * T });
        x = e + 1;
      }
    }
    B.rails.sort((a, b) => a.y - b.y);
    // laneTop: below this chip y nothing (peg / bumper) is left between the chip and the rail: the landing marker shows
    for (const rl of B.rails) {
      rl.laneTop = 0;
      for (const pg of B.pegs) if (pg.y < rl.y) rl.laneTop = Math.max(rl.laneTop, pg.y + PLINKO.pegR + PLINKO.r);
      for (const bp of B.bumpers) if (bp.y < rl.y) rl.laneTop = Math.max(rl.laneTop, bp.y + PLINKO.bumperR + PLINKO.r);
    }
    const seen = {};
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (grid[y][x] !== '|' || seen[y * COLS + x]) continue;
      let e = y; while (e + 1 < ROWS && grid[e + 1][x] === '|') { e++; seen[e * COLS + x] = 1; }
      B.posts.push({ x: x * T, y0: y * T, y1: (e + 1) * T });
    }
    B.posts.sort((a, b) => a.x - b.x);
    B.slotTop = B.posts.length ? Math.min(...B.posts.map(p => p.y0)) : 450;
    B.slotBot = B.posts.length ? Math.max(...B.posts.map(p => p.y1)) : 510;
    const xs = [T].concat(B.posts.map(p => p.x)).concat([W - T]);
    B.slots = [];
    for (let k = 0; k + 1 < xs.length; k++) B.slots.push({ x0: xs[k], x1: xs[k + 1], cx: (xs[k] + xs[k + 1]) / 2, glow: 0 });
    B.chute = { y: c1.y * T + T / 2, x0: Math.min(c1.x, c2.x) * T + T / 2, x1: Math.max(c1.x, c2.x) * T + T / 2 };
    B.solid = (tx, ty) => tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS || grid[ty][tx] === '#';
    B.grid = grid;
    return B;
  }

  function plinkoRoom(st, L, k) {
    const B = plinkoParse(L.def);
    st.k = k; st.B = B; st.d = 0; st.boardTix = 0; st.pads = null; st.tallyStars = 0;
    // the core's tile pass draws nothing in this level: the mode paints the whole cabinet
    L.grid = L.grid.map(r => r.map(() => '.'));
    for (const p of G.players) { p.alive = false; p.respawnT = Infinity; p.pendingJump = false; }
    plinkoNewDrop(st, false);
  }

  function plinkoNewDrop(st, swap) {
    const P = PLINKO, B = st.B;
    st.ball = (st.d + st.k) % 2; st.steer = 1 - st.ball;
    if (typeof setJobs === 'function') setJobs(st.ball === 0 ? ['chip', 'paddles'] : ['paddles', 'chip']);   // (the cards show each player their own job)
    st.b = { x: B.chute.x0 + (0.2 + 0.6 * MODES.plinko.rand()) * (B.chute.x1 - B.chute.x0), y: B.chute.y, vx: 0, vy: 0, hops: P.hops, stallT: 0, pegT: 0, lastPeg: -1,
      spin: 0, heavy: false, mult: 1, diveLatch: true, sq: 0, fallT: 0, settle: 0, pop: swap ? 0 : 1, squint: 0, diving: false,
      pops: 0, sx: 0, sy: 0, sxT: 0 };
    st.pads = B.rails.map((r, i) => {
      const w = Math.min(P.padW, r.x1 - r.x0), prev = st.pads && st.pads[i];
      return { i, y: r.y, x0: r.x0 + w / 2, x1: r.x1 - w / 2, w, x: prev ? prev.x : (r.x0 + r.x1) / 2, vx: 0,
        bounces: 0, nap: false, bumpT: 0, bumpCD: 0, hitT: 0, wake: 0 };
    });
    for (const c of B.chips) c.got = false;
    for (const rg of B.rings) rg.used = false;
    for (const bp of B.bumpers) bp.lit = false;
    st.live = 0; st.steerActive = false; st.chipActive = false; st.phase = swap ? 'swap' : 'aim'; st.t = 0; st.slot = -1; st.payout = 0; st.dropTix = 0; st.lightsGot = false;
    st.aimT = 0; st.say = null; st.cue = null; st.cuePow = false; st.shadow = null; st.chipDir = 0;
    // a board may ask for earlier help (board 1, the world's opener: after 1 miss)
    st.lucky = st.misses >= (B.def.luckyAfter !== undefined ? B.def.luckyAfter : P.luckyAfter);
    st.prevDown = [true, true]; st.prevAct = [true, true];   // (lead review) a held ▼ / act over a swap is not fresh
    // the jackpot slot for this drop
    const J = B.def.jackpot || { fixed: 0 };
    st.light = null; st.locked = true;
    if (J.fixed !== undefined) st.jp = J.fixed;
    else if (J.perDrop) st.jp = J.perDrop[st.d % J.perDrop.length];
    else if (J.move) { const n = J.move.to - J.move.from + 1; st.jp = J.move.from + (st.d * 3) % n; st.light = { t: 0, dir: 1, step: J.move.step || P.lightStep }; st.locked = false; }
    st.luckyPop = st.lucky;   // announced once the chip is on the chute and no card is up (C9 gold pop)
    if (swap) Sfx.play('plinkoSwap');
  }

  // the paddle the kicker moves: the highest awake paddle whose top is below the ball
  function plinkoLive(st) {
    const P = PLINKO, b = st.b;
    if (st.phase === 'aim' || st.phase === 'swap') { const i = st.pads.findIndex(p => !p.nap); return i; }
    for (const p of st.pads) if (!p.nap && p.y - P.padH / 2 >= b.y + P.r - 2) return p.i;
    for (let k = st.pads.length - 1; k >= 0; k--) if (!st.pads[k].nap) return k;
    return -1;
  }
  const plinkoValue = (st, k) => PLINKO.values[Math.min(Math.abs(k - st.jp), PLINKO.values.length - 1)];
  function plinkoFlightT(B, y0, v0) { const g = PLINKO.g, dy = B.slotTop + PLINKO.catchDepth - y0; return (v0 + Math.sqrt(v0 * v0 + 2 * g * Math.max(0, dy))) / g; }
  function plinkoCircle(b, cx, cy, rr) {
    const dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy);
    if (d >= rr) return null;
    if (d < 1e-6) return { nx: 0, ny: -1, pen: rr };
    return { nx: dx / d, ny: dy / d, pen: rr - d };
  }
  function plinkoTiles(b, B) {
    const P = PLINKO, r = P.r;
    const x0 = Math.floor((b.x - r) / T), x1 = Math.floor((b.x + r) / T), y0 = Math.floor((b.y - r) / T), y1 = Math.floor((b.y + r) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (!B.solid(tx, ty)) continue;
      const qx = clamp(b.x, tx * T, tx * T + T), qy = clamp(b.y, ty * T, ty * T + T);
      const dx = b.x - qx, dy = b.y - qy, d = Math.hypot(dx, dy);
      if (d >= r) continue;
      let nx, ny;
      if (d > 1e-6) { nx = dx / d; ny = dy / d; } else { nx = b.x < W / 2 ? 1 : -1; ny = 0; }
      b.x += nx * (r - d); b.y += ny * (r - d);
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) { b.vx -= (1 + P.wallE) * vn * nx; b.vy -= (1 + P.wallE) * vn * ny; if (-vn > 120) Sfx.play('bonk'); }
    }
  }
  function plinkoFx(st, x, y, text, col, size, dur) { st.fx.push({ x, y, text, col, size: size || 16, t: dur || 0.9 }); }

  // ---------- inputs: role-based; everything is off while the intro card or the swap banner is up ----------
  function plinkoInputs(st) {
    const out = [];
    for (let k = 0; k < 2; k++) {
      const p = G.players[k], inp = p.input;
      // (lead review) the raw act input (F/E, / . , Enter, pad X/Y/RB/RT; no def.act, so no touch button) is a fresh ▲
      const actPress = !!inp.act && !st.prevAct[k]; st.prevAct[k] = !!inp.act;
      const jumpPress = p.pendingJump || actPress; p.pendingJump = false;
      const downPress = inp.down && !st.prevDown[k]; st.prevDown[k] = inp.down;
      const anyHeld = inp.left || inp.right || inp.jump || inp.down || inp.up || inp.act;
      // no release lock: drop, hop and kick need a FRESH press, and the dive needs ▼ let go after the drop,
      // so a button held through a swap can only roll / lean / slide, which is harmless
      const off = G.introT > PLINKO.introLock || st.phase === 'swap';
      // (review) on a controller a hard diagonal stick push (down-left / down-right) reads as ▼ too: there a ▼ with a
      // side held is not a drop or a power kick. Keyboard and touch are unchanged (S + A still drops).
      const padSide = (inp.left || inp.right) && Pads.kind === 'pad' && !!padFor(padSlots(), k);
      out.push(off ? { left: false, right: false, down: false, jumpPress: false, downPress: false, any: false }
        : { left: inp.left, right: inp.right, down: inp.down, jumpPress, downPress: downPress && !padSide, any: anyHeld || jumpPress });
      if (!off && (anyHeld || jumpPress)) st.idle[k] = 0; else st.idle[k] += DT;
    }
    return out;
  }

  function plinkoPads(st, I, dt) {
    const P = PLINKO;
    const prev = st.live;
    st.live = plinkoLive(st);
    if (st.live !== prev && st.live >= 0 && prev >= 0) { st.pads[st.live].wake = 0.35; Sfx.play('plinkoWake', st.steer); }
    for (const p of st.pads) {
      p.bumpT -= dt; p.bumpCD -= dt; p.hitT -= dt; p.wake -= dt;
      if (p.i !== st.live) { p.vx = 0; continue; }
      const want = ((I.right ? 1 : 0) - (I.left ? 1 : 0)) * P.padSpeed;
      p.vx = approach(p.vx, want, P.padAcc * dt);
      const nx = clamp(p.x + p.vx * dt, p.x0, p.x1);
      if (nx !== p.x + p.vx * dt) p.vx = 0;
      p.x = nx;
    }
    if (I.left || I.right || I.jumpPress || I.downPress) st.steerActive = true;
    if ((I.jumpPress || I.downPress) && st.live >= 0) {
      const p = st.pads[st.live];
      if (p.bumpCD <= 0) { p.bumpT = P.bumpWin; p.bumpCD = P.bumpCD; Sfx.play('plinkoBump', st.steer); }
    }
  }

  function plinkoFall(st, I, dt) {
    const P = PLINKO, B = st.B, b = st.b, S = st.stats;
    b.fallT += dt;
    if (b.fallT > P.heavyT && !b.heavy) { b.heavy = true; st.msg = { text: 'Heavy chip!', t: 1.2, col: C.paper }; }
    if (!I.down) b.diveLatch = false;
    const dive = b.heavy || (I.down && !b.diveLatch);
    b.diving = dive;   // for the landing marker and the chip's "zoom" face
    const lean = (I.right ? 1 : 0) - (I.left ? 1 : 0);
    if (I.jumpPress && b.hops > 0 && !b.heavy) {
      b.hops--; b.vy = Math.min(b.vy, -P.hopV); b.sq = 0.15; S.hops[st.ball]++;
      if (lean) b.vx = clamp(b.vx + lean * P.hopLean, -P.hopLeanMax, P.hopLeanMax);   // (review) hop that way: a hop over a paddle steers
      Sfx.play('plinkoHop', st.ball); puff(b.x, b.y + P.r, 5, 'rgba(255,255,255,0.85)'); rumble(st.ball, 0, 0.25, 50);
    }
    if (lean && lean * b.vx < P.leanMax) b.vx = lean > 0 ? Math.min(P.leanMax, b.vx + P.leanAcc * dt) : Math.max(-P.leanMax, b.vx - P.leanAcc * dt);
    b.vy = Math.min(b.vy + (dive ? P.gDive : P.g) * dt, dive ? P.vMaxDive : P.vMax);
    b.vx *= 1 - P.airDrag * dt;
    b.pegT -= dt;
    // the moving jackpot light locks once the ball is below rail J.lockRail (default 0, the top paddle)
    const J = B.def.jackpot.move;
    if (st.light && !st.locked && b.y > B.rails[J && J.lockRail !== undefined ? J.lockRail : 0].y) {
      st.locked = true; Sfx.play('plinkoLock'); st.msg = { text: 'Light locked!', t: 1.0, col: PL_GOLD };
    }
    const n = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 3));
    for (let s = 0; s < n; s++) {
      const pyBot = b.y + P.r;
      b.x += b.vx * dt / n; b.y += b.vy * dt / n;
      for (let k = 0; k < B.pegs.length; k++) {
        const pg = B.pegs[k], h = plinkoCircle(b, pg.x, pg.y, P.r + P.pegR);
        if (!h) continue;
        b.x += h.nx * h.pen; b.y += h.ny * h.pen;
        const vn = b.vx * h.nx + b.vy * h.ny;
        if (vn < 0) {
          const e = dive ? P.pegEDive : P.pegE;
          b.vx -= (1 + e) * vn * h.nx; b.vy -= (1 + e) * vn * h.ny;
          if (b.lastPeg !== k || b.pegT <= 0) {
            if (!lean && Math.abs(h.nx) < 0.12 && h.ny < 0) b.vx += (MODES.plinko.rand() < 0.5 ? -1 : 1) * P.pegJitter * (0.5 + MODES.plinko.rand() * 0.5);
            if (-vn > 50 && st.plinkCD <= 0) { const f = PENTA[pg.col % 5] * (pg.col >= 15 ? 2 : 1); Sfx.tone(f, 0.06, 'triangle', 0.025); st.plinkCD = 0.05; rumble(st.ball, 0, 0.1, 25); }
            pg.t = 0.18; S.pegs++; if (-vn > 50) b.squint = 0.1;
          }
          b.lastPeg = k; b.pegT = 0.12;
        }
      }
      for (const bp of B.bumpers) {
        const h = plinkoCircle(b, bp.x, bp.y, P.r + P.bumperR);
        if (!h) continue;
        b.x += h.nx * h.pen; b.y += h.ny * h.pen;
        const vn = b.vx * h.nx + b.vy * h.ny;
        if (vn < 30) {
          const out = Math.max(P.bumperOut, -vn * 0.9);
          b.vx += (out - vn) * h.nx; b.vy += (out - vn) * h.ny;
          if (b.vy < -P.bumperUpMax) b.vy = -P.bumperUpMax; // never pops the ball up over the pegs
          // (review) a dead-centre top hit gets the pegs' little sideways jitter, so a chip can't bounce straight up
          // and down on a bumper forever (board 2: the chute's left end and the middle are right over a bumper)
          if (Math.abs(h.nx) < 0.12 && h.ny < 0) b.vx += (MODES.plinko.rand() < 0.5 ? -1 : 1) * P.pegJitter * (0.5 + MODES.plinko.rand() * 0.5);
          bp.t = 0.25; S.pops++; b.squint = 0.16; b.pops++;
          if (b.pops <= P.popPay) { plinkoAdd(st, P.bumperTix); plinkoFx(st, bp.x, bp.y - 24, '+' + P.bumperTix, PL_PINK, 14); }
          Sfx.play('bumper'); rumble(st.ball, 0.2, 0.4, 60); burst(bp.x, bp.y, PL_PINK, 6);
          if (!bp.lit) {
            bp.lit = true;
            if (!st.lightsGot && B.bumpers.every(q => q.lit)) {
              st.lightsGot = true; S.lights++; plinkoAdd(st, P.lightsBonus);
              st.msg = { text: 'All lights! +' + P.lightsBonus, t: 1.4, col: PL_GOLD }; Sfx.play('plinkoLights');
            }
          }
        }
      }
      for (const p of st.pads) {
        if (p.nap) continue;
        const top = p.y - P.padH / 2 - (p.bumpT > 0 ? 4 : 0);
        if (b.vy > 0 && pyBot <= p.y - P.padH / 2 + 2 && b.y + P.r >= top && Math.abs(b.x - p.x) <= p.w / 2 + 5) {
          const off = clamp((b.x - p.x) / (p.w / 2), -1, 1), bump = p.bumpT > 0;
          const zone = off < -P.zoneEdge ? -1 : off > P.zoneEdge ? 1 : 0;
          b.y = top - P.r; b.vy = -P.padBounce;
          b.vx = clamp((zone ? zone * P.kickVx * (bump ? P.bumpMul : 1) : b.vx * P.midKeep) + p.vx * P.padSwipe, -P.padMaxVx, P.padMaxVx);
          // lucky kicks aim only when both players are there this drop (the kicker pressed something, and (review) the
          // chip did too: a roll, the drop, a lean, a hop or a dive). A kid who just drops the chip counts.
          if (st.lucky && (zone !== 0 || P.luckyMid) && st.steerActive && st.chipActive) {
            const lim = P.kickVx * P.bumpMul, jx = B.slots[plinkoAimSlot(st)].cx;
            b.vx = clamp((jx - b.x) / plinkoFlightT(B, b.y, P.padBounce) / P.luckyDamp, -lim, lim);
          }
          p.bounces++; p.hitT = 0.2; b.sq = 0.12; b.squint = 0.14; S.kicks[st.steer]++; if (bump) S.power[st.steer]++;
          b.sxT = 0; b.sx = b.x; b.sy = b.y;   // a middle-third catch bounces in place on purpose: not "stuck"
          if (p.bounces >= P.padNaps) { p.nap = true; Sfx.play('plinkoNap'); }
          Sfx.play(bump ? 'plinkoPower' : 'plinkoKick', st.steer);
          rumble(st.steer, bump ? 0.45 : 0.25, 0.4, 80); rumble(st.ball, 0.15, 0.4, 60);
          puff(b.x, top, bump ? 9 : 5, bump ? PL_GOLD : 'rgba(255,255,255,0.9)');
          if (bump) plinkoFx(st, p.x, p.y - 26, 'POWER!', PL_GOLD, 15);
        }
      }
      for (const po of B.posts) {
        const qy = clamp(b.y, po.y0, po.y1), h = plinkoCircle(b, po.x, qy, P.r + 4);
        if (!h) continue;
        b.x += h.nx * h.pen; b.y += h.ny * h.pen;
        const vn = b.vx * h.nx + b.vy * h.ny;
        if (vn < 0) { b.vx -= (1 + P.postE) * vn * h.nx; b.vy -= (1 + P.postE) * vn * h.ny; if (Math.abs(h.nx) < 0.15 && h.ny < 0) b.vx += (MODES.plinko.rand() < 0.5 ? -1 : 1) * 60; }
      }
      plinkoTiles(b, B);
      for (const c of B.chips) if (!c.got && Math.hypot(b.x - c.x, b.y - c.y) < P.r + 10) {
        c.got = true; c.t = 0.4; S.chips++; plinkoAdd(st, P.chip); plinkoFx(st, c.x, c.y - 18, '+' + P.chip, PL_PINK, 15);
        Sfx.play('plinkoChip'); burst(c.x, c.y, PL_GOLD, 8);
      }
      for (const rg of B.rings) if (!rg.used && Math.hypot(b.x - rg.x, b.y - rg.y) < 20) {
        rg.used = true; rg.t = 0.5; b.mult = 2; S.rings++; Sfx.play('ring'); st.msg = { text: 'Double tickets!', t: 1.2, col: PL_GOLD };
        for (let q = 0; q < 10; q++) burst(rg.x, rg.y, PL_GOLD, 1);
      }
      // out of the board (should never happen): put it back inside
      if (b.x < T + P.r) { b.x = T + P.r; b.vx = Math.abs(b.vx); }
      if (b.x > W - T - P.r) { b.x = W - T - P.r; b.vx = -Math.abs(b.vx); }
      if (b.y < 2 * T + P.r) { b.y = 2 * T + P.r; b.vy = Math.abs(b.vy); }
      if (b.y > B.slotTop + P.catchDepth) { plinkoCatch(st); return; }
    }
    b.spin += b.vx * dt / P.r;
    if (Math.hypot(b.vx, b.vy) < P.stallV) b.stallT += dt; else b.stallT = 0;
    if (b.stallT > P.stallT) { b.stallT = 0; b.vx += (b.x < W / 2 ? 1 : -1) * P.stallKick; b.vy = -120; st.stats.nudges++; }
    // (review) belt and braces: a chip that bounces in place (x within 4 px, y within 60 px for 1.5 s) gets a sideways nudge
    if (Math.abs(b.x - b.sx) > P.stuckDX || Math.abs(b.y - b.sy) > P.stuckDY) { b.sx = b.x; b.sy = b.y; b.sxT = 0; }
    else if ((b.sxT += dt) > P.stuckT) { b.sxT = 0; b.vx += (b.x < W / 2 ? 1 : -1) * P.stallKick; st.stats.nudges++; }
  }
  // the slot the kicks and bots aim for: the jackpot (on a moving light, where it is now)
  const plinkoAimSlot = st => st.jp;

  // what the kicker needs to see (draw-only help, no physics): where the chip will land on the live paddle once
  // nothing is left between them (st.shadow, the landing marker), and which third of that paddle sends it nearest
  // the jackpot (st.cue: -1 / 0 / +1, glowing on the paddle). Same sums as the kick itself (§5.10).
  function plinkoPredict(st) {
    const P = PLINKO, B = st.B, b = st.b, li = st.live, p = li >= 0 ? st.pads[li] : null;
    st.shadow = null;
    if (!p) { st.cue = null; st.cuePow = false; plinkoChipCue(st); return; }
    const top = p.y - P.padH / 2;
    let hitX = b.x, vx = 0;
    if (st.phase === 'fall' && b.y > B.rails[li].laneTop && b.y + P.r < top && b.vy > -60) {
      let x = b.x, y = b.y, vxx = b.vx, vy = b.vy;
      const g = b.diving ? P.gDive : P.g, vm = b.diving ? P.vMaxDive : P.vMax, h = 1 / 60;
      for (let i = 0; i < 90 && y + P.r < top; i++) {
        vy = Math.min(vy + g * h, vm); vxx *= 1 - P.airDrag * h; x += vxx * h; y += vy * h;
        if (x < T + P.r) { x = 2 * (T + P.r) - x; vxx = -vxx * P.wallE; }
        if (x > W - T - P.r) { x = 2 * (W - T - P.r) - x; vxx = -vxx * P.wallE; }
      }
      if (y + P.r >= top && x > B.rails[li].x0 - 20 && x < B.rails[li].x1 + 20) { st.shadow = x; hitX = x; vx = vxx; }
    } else if (st.phase === 'fall') vx = b.vx;
    if (st.lucky) { st.cue = 2; st.cuePow = false; plinkoChipCue(st); return; }   // lucky: the whole gold paddle aims at the jackpot
    const jx = B.slots[st.jp].cx, tF = plinkoFlightT(B, top - P.r, P.padBounce) * P.luckyDamp;
    // (review) the five kicks: left / stop / right, and left / right with a power kick (x1.45). The cue says which
    // third and, in st.cuePow, when the POWER kick is the better kick (a power kick has to win by 10 px)
    const land = (z, pw) => hitX + (z ? z * P.kickVx * (pw ? P.bumpMul : 1) : vx * P.midKeep) * tF;
    let best = st.cue === -1 || st.cue === 0 || st.cue === 1 ? st.cue : 0, bp = !!st.cuePow && best !== 0;
    let bd = Math.abs(jx - land(best, bp)) + (bp ? 10 : 0) - 14;   // a little hysteresis
    for (const [z, pw] of PLINKO_KICKS) { const d = Math.abs(jx - land(z, pw)) + (pw ? 10 : 0); if (d < bd) { best = z; bp = pw; bd = d; } }
    st.cue = best; st.cuePow = bp;
    plinkoChipCue(st);
  }
  const PLINKO_KICKS = [[-1, false], [0, false], [1, false], [-1, true], [1, true]];

  // (review) the chip's own cue, st.chipDir (-1 / 0 / +1): which way to lean (or hop) so the landing ring sits on the
  // shine of the paddle below; under the last paddle, so the chip lands in the JACKPOT. Drawn as a gold arrow by the chip.
  function plinkoChipCue(st) {
    const P = PLINKO, B = st.B, b = st.b;
    if (st.phase !== 'fall') { st.chipDir = 0; return; }
    const under = st.pads.some(q => !q.nap && q.y - P.padH / 2 >= b.y + P.r - 2);
    let err = null, on = 14, off = 6;
    if (under && st.shadow !== null && st.live >= 0 && !st.lucky && st.cue !== null) {
      const p = st.pads[st.live], z = st.cue === 2 ? 0 : st.cue;
      err = p.x + z * p.w / 3 - st.shadow;
    } else if (!under) {
      const t = plinkoFlightT(B, b.y, -b.vy);
      err = B.slots[st.jp].cx - (b.x + b.vx * t); on = 36; off = 18;
    }
    if (err === null || Math.abs(err) < off) st.chipDir = 0;
    else if (Math.abs(err) > on) st.chipDir = Math.sign(err);
  }

  function plinkoAdd(st, n) { st.boardTix += n; st.total += n; st.dropTix += n; st.tixPop = 0.3; }

  function plinkoCatch(st) {
    const P = PLINKO, B = st.B, b = st.b, S = st.stats;
    let k = 0; while (k < B.slots.length - 1 && b.x >= B.slots[k].x1) k++;
    st.slot = k; st.phase = 'score'; st.t = 0;
    if (st.light) st.locked = true;
    const jack = k === st.jp, v = plinkoValue(st, k) * b.mult;
    st.payout = v; plinkoAdd(st, v);
    B.slots[k].glow = 1;
    if (jack) {
      st.misses = 0; S.jackpots[st.ball]++; b.happy = true;
      Sfx.play('plinkoJackpot'); rumble(0, 0.5, 0.8, 300); rumble(1, 0.5, 0.8, 300);
      for (let q = 0; q < 45; q++) confetti(B.slots[k].cx, B.slotTop);
      if (!reduceMotion) G.shake = 0.12;
    } else {
      st.misses++; Sfx.play(v >= 150 ? 'plinkoNear' : 'plinkoSlot'); rumble(st.ball, 0.2, 0.3, 90);
      burst(B.slots[k].cx, B.slotTop + 20, C.paper, 8);
    }
    if (st.dropTix > S.best.v) S.best = { who: st.ball, v: st.dropTix };
  }

  function plinkoStars(st) {
    const th = st.B.def.stars || [300, 800, 1400];
    return th.filter(x => st.boardTix >= x).length;
  }

  function plinkoStep(st, dt) {
    const P = PLINKO, B = st.B;
    st.t += dt; st.plinkCD -= dt; st.tixPop -= dt;
    for (const pg of B.pegs) pg.t -= dt;
    for (const bp of B.bumpers) bp.t -= dt;
    for (const c of B.chips) c.t -= dt;
    for (const rg of B.rings) rg.t -= dt;
    for (const sl of B.slots) sl.glow = Math.max(0, sl.glow - dt * 0.6);
    if (st.msg) { st.msg.t -= dt; if (st.msg.t <= 0) st.msg = null; }
    for (const f of st.fx) { f.t -= dt; f.y -= 32 * dt; }
    st.fx = st.fx.filter(f => f.t > 0);
    if (st.b.sq > 0) st.b.sq -= dt;
    if (st.b.squint > 0) st.b.squint -= dt;
    if (st.say) { st.say.t -= dt; if (st.say.t <= 0) st.say = null; }
    if (st.b.pop < 1) st.b.pop = Math.min(1, st.b.pop + dt * 4);
    const I = plinkoInputs(st), Ib = I[st.ball], Is = I[st.steer];
    if (Ib.any && (st.phase === 'aim' || st.phase === 'fall')) st.chipActive = true;
    // the moving lucky light
    if (st.light && !st.locked && (st.phase === 'aim' || st.phase === 'fall')) {
      const J = B.def.jackpot.move;
      st.light.t += dt;
      if (st.light.t >= st.light.step) {
        st.light.t = 0;
        if (st.jp + st.light.dir > J.to || st.jp + st.light.dir < J.from) st.light.dir = -st.light.dir;
        st.jp += st.light.dir; Sfx.play('plinkoLight');
      }
    }
    if (st.phase === 'swap') {
      if (st.t >= P.swapT) { st.phase = 'aim'; st.t = 0; }
      plinkoPads(st, { left: false, right: false, jumpPress: false, downPress: false }, dt);
      return;
    }
    if (st.phase === 'aim' || st.phase === 'fall') { plinkoPads(st, Is, dt); st.stats.steerT[st.steer] += dt; }
    if (st.phase === 'aim') {
      const b = st.b, mv = (Ib.right ? 1 : 0) - (Ib.left ? 1 : 0);
      const nx = clamp(b.x + mv * P.chuteSpeed * dt, B.chute.x0, B.chute.x1);
      b.spin += (nx - b.x) / P.r; b.x = nx;
      if (G.introT <= P.introLock) st.aimT = (st.aimT || 0) + dt;
      if (st.luckyPop && G.introT <= P.introLock) {
        st.luckyPop = false; const lp = st.pads[0];
        plinkoFx(st, lp.x, lp.y - 44, 'Lucky paddles!', PL_GOLD, 18, 1.5); plinkoFx(st, lp.x, lp.y - 25, 'Just catch the chip!', PL_GOLD, 13, 1.5);
        Sfx.play('plinkoLucky');
      }
      const aimT = st.aimT || 0;
      if (aimT >= P.autoWarn && Math.floor(aimT) !== Math.floor(aimT - dt)) Sfx.play('plinkoTick');
      if (Ib.jumpPress || Ib.downPress || aimT >= P.autoDrop) {
        st.phase = 'fall'; st.t = 0; st.aimT = 0; b.vx = mv * 40; b.vy = 40; b.diveLatch = true;
        if (aimT >= P.autoDrop) st.stats.autoDrops++;
        Sfx.play('plinkoDrop', st.ball); rumble(st.ball, 0.2, 0.3, 70);
        st.say = { text: PLINKO_SAY[(st.k * 4 + st.d) % PLINKO_SAY.length], t: 1.0 };
      }
      plinkoPredict(st);
      return;
    }
    if (st.phase === 'fall') { plinkoFall(st, Ib, dt); if (st.phase === 'fall') plinkoPredict(st); else { st.shadow = null; st.cue = null; st.cuePow = false; st.chipDir = 0; } return; }
    if (st.phase === 'score') {
      const b = st.b, sl = B.slots[st.slot];
      b.x = approach(b.x, sl.cx, 120 * dt); b.y = approach(b.y, B.slotBot - P.r, 260 * dt); b.vx = b.vy = 0;
      if (st.t >= P.scoreT) {
        st.d++;
        if (st.d < 4) plinkoNewDrop(st, true);
        else { st.phase = 'tally'; st.t = 0; st.tallyStars = 0; st.starsEarned[st.k] = plinkoStars(st); }
      }
      return;
    }
    if (st.phase === 'tally') {
      const want = st.starsEarned[st.k];
      const shown = Math.min(want, Math.floor(Math.max(0, st.t - 0.6) / 0.45) + 1);
      if (st.t > 0.6 && shown > st.tallyStars) { st.tallyStars = shown; Sfx.play('plinkoStar'); }
      if (st.t >= P.tallyT) {
        if (st.k < (G.level.def.roomCount || 1) - 1) nextRoom();
        else { G.level.goal = { x: B.slots[st.jp].cx, y: B.slotTop }; levelClear(); }
      }
    }
  }

  // ---------- key names for hints (like golfKeys) ----------
  function plinkoKeys(id, what) {
    // 1 player + computer: the computer's part of the hint says what it does instead of which keys to press
    if (typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id)) return what === 'aim' ? 'rolls and drops' : what === 'fall' ? 'leans to the shine' : 'slides the paddles';
    const how = actKey(id), touch = how === 'touch', pad = how === 'pad'; // (each player's own device: js/controls.js)
    const A = pad ? glyph('a') : '';
    if (what === 'aim') return pad ? 'stick roll · ' + A + ' drop' : touch ? '◀ ▶ roll · ▲ or ▼ drop' : id === 0 ? 'A D roll · S drop' : '← → roll · ↓ drop';
    if (what === 'fall') return pad ? 'stick lean · ' + A + ' hop · down = fast' : touch ? '◀ ▶ lean · ▲ hop · ▼ fast' : id === 0 ? 'A D lean · W hop · S fast' : '← → lean · ↑ hop · ↓ fast';
    // (review) the kicker's hint names the cue; the power kick only when the cue asks for it (st.cuePow)
    if (what === 'pow') return pad ? 'stick slide · ' + A + ' POWER kick!' : touch ? '◀ ▶ slide · ▲ POWER kick!' : id === 0 ? 'A D slide · W POWER kick!' : '← → slide · ↑ POWER kick!';
    return pad ? 'stick slides the shine under the chip' : touch ? '◀ ▶ shine under the chip' : id === 0 ? 'A D shine under the chip' : '← → shine under the chip';
  }

  // ---------- drawing ----------
  function plinkoCabinet(st) {
    const B = st.B;
    // felt
    // felt and frame are static: painted once into a cached layer (quilted felt, sparkles, bevelled frame, rivets)
    ctx.drawImage(paLayer('plinko|' + PL_FELT + PL_FELT2, W, H, g => {
      const gr = g.createLinearGradient(0, 60, 0, 510);
      gr.addColorStop(0, PL_FELT2); gr.addColorStop(1, PL_FELT);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,0.035)'; g.lineWidth = 1; g.beginPath();
      for (let k = -H; k < W; k += 40) { g.moveTo(k, 60); g.lineTo(k + 450, 510); g.moveTo(k + 450, 60); g.lineTo(k, 510); }
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.06)';
      for (let k = 0; k < 60; k++) { const x = (hash(k, 3) % 900) + 30, y = (hash(k, 7) % 420) + 70; paCirc(g, x, y, 1.2 + (k % 3) * 0.5); g.fill(); }
      const vg = g.createRadialGradient(W / 2, 290, 180, W / 2, 290, 560); vg.addColorStop(0, 'rgba(10,8,30,0)'); vg.addColorStop(1, 'rgba(10,8,30,0.28)');
      g.fillStyle = vg; g.fillRect(0, 60, W, 450);
      // the frame, with a lit top edge, a shaded foot and brass rivets
      g.fillStyle = '#7a2a6e'; g.fillRect(0, 0, W, 60); g.fillRect(0, 0, T, H); g.fillRect(W - T, 0, T, H); g.fillRect(0, 510, W, 30);
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 0, W, 3); g.fillRect(0, 0, 3, H); g.fillRect(W - T, 0, 3, H);
      g.fillStyle = 'rgba(20,8,30,0.25)'; g.fillRect(0, 44, W, 10); g.fillRect(0, 528, W, 12);
      g.fillStyle = '#a63c8f'; g.fillRect(0, 54, W, 6); g.fillRect(T - 6, 60, 6, 450); g.fillRect(W - T, 60, 6, 450);
      g.fillStyle = PL_GOLD; g.fillRect(0, 58, W, 3); g.fillRect(T - 2, 60, 3, 450); g.fillRect(W - T - 1, 60, 3, 450); g.fillRect(0, 509, W, 3);
      for (let x = 60; x < W - 40; x += 60) { g.fillStyle = '#5a1c50'; paCirc(g, x, 524, 2.6); g.fill(); g.fillStyle = '#ffd77a'; paCirc(g, x - 0.6, 523.4, 1.5); g.fill(); }
      // lacquered cabinet: a soft sheen down the side columns, inset panels with a lit and a shaded bevel, gold piping
      for (const sx of [0, W - T]) {
        const sg = g.createLinearGradient(sx, 0, sx + T - 6, 0); sg.addColorStop(0, 'rgba(255,255,255,0.10)'); sg.addColorStop(0.45, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(20,8,30,0.22)');
        g.fillStyle = sg; g.fillRect(sx + (sx ? 6 : 0), 60, T - 6, 450);
        for (let py = 68; py < 500; py += 72) {
          const px = sx + (sx ? 10 : 4), pw = T - 14, ph = 62;
          g.fillStyle = 'rgba(20,8,30,0.22)'; g.fillRect(px, py, pw, ph);
          g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(px, py + ph - 1.5, pw, 1.5); g.fillRect(px + pw - 1.5, py, 1.5, ph);
          g.fillStyle = 'rgba(20,8,30,0.3)'; g.fillRect(px, py, pw, 1.5); g.fillRect(px, py, 1.5, ph);
          g.strokeStyle = 'rgba(255,197,61,0.35)'; g.lineWidth = 0.8; g.strokeRect(px + 3, py + 3, pw - 6, ph - 6);
        }
      }
      // the top band: a raised header with a moulded lip and a row of small gold studs
      g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(0, 6, W, 16);
      g.fillStyle = 'rgba(20,8,30,0.2)'; g.fillRect(0, 22, W, 2); g.fillRect(0, 40, W, 2);
      g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(0, 24, W, 1);
      for (let x = 15; x < W; x += 30) paStud(g, x, 49, 1.8, '#d9a03a', { collar: false });
      // the foot: a lit rail under the gold piping and a shaded kick plate
      g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(0, 512, W, 2);
      g.fillStyle = 'rgba(20,8,30,0.18)'; g.fillRect(0, 534, W, 6);
      g.strokeStyle = 'rgba(20,8,30,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(T, 60); g.lineTo(T, 510); g.moveTo(W - T, 60); g.lineTo(W - T, 510); g.stroke();
    }), 0, 0, W, H);
    // the lanes (peg-free bands above each rail) get a soft stripe, so kids see "the paddle's lane"
    for (const r of B.rails) { ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(T, r.y - 75, W - 2 * T, 90); }
    // chasing bulbs on the sides
    const ph = Math.floor(G.clock * 6);
    for (let k = 0; k < 15; k++) for (const x of [12, W - 12]) {
      const on = (k + ph) % 3 === 0;
      ctx.fillStyle = on ? '#fff3b0' : 'rgba(255,214,120,0.45)'; circle(x, 75 + k * 30, on ? 4.5 : 3.5); ctx.fill();
    }
    // marquee sign in the top band (between the level pill and the tickets pill)
    ctx.fillStyle = 'rgba(28,26,54,0.55)'; rr(W / 2 - 110, 6, 220, 32, 16); ctx.fill();
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, on = (k + ph) % 2 === 0; ctx.fillStyle = on ? '#fff3b0' : 'rgba(255,214,120,0.4)'; circle(W / 2 + Math.cos(a) * 118, 22 + Math.sin(a) * 18, 2.2); ctx.fill(); }
    text('PLINKO', W / 2, 23, 22, PL_GOLD, 'center');
  }

  function plinkoDrawBoard(st) {
    const P = PLINKO, B = st.B;
    plinkoCabinet(st);
    // chute: a rail the ball rolls along
    const ch = B.chute;
    // a brass rod on little brackets, with knobbed end caps (cached: it never moves)
    paStamp('plinkochute', ch.x0 - 24, ch.y + P.r - 2, ch.x1 - ch.x0 + 48, 14, 3, g => {
      const L = ch.x1 - ch.x0 + 48;
      g.fillStyle = 'rgba(10,8,30,0.35)'; paRR(g, 6, 6, L - 10, 5, 2.5); g.fill();
      for (let bx = 26; bx < L - 20; bx += 48) { g.fillStyle = '#7a5a20'; g.fillRect(bx - 1.5, 5, 3, 7); g.fillStyle = '#b8913f'; g.fillRect(bx - 1.5, 5, 1.2, 7); }
      paRod(g, 6, 1.5, L - 12, 5, '#e2a92c');
      for (const x of [6, L - 6]) paStud(g, x, 4, 4, PL_GOLD);
    });
    if (st.phase === 'aim' || st.phase === 'swap') { ctx.fillStyle = 'rgba(255,197,61,0.12)'; rr(ch.x0 - 24, ch.y - 18, ch.x1 - ch.x0 + 48, 36, 18); ctx.fill(); }
    // rails
    for (const r of B.rails) {
      // a slotted track: a dark groove with brass lips, tie marks every few steps and bolted end blocks (cached)
      const L = r.x1 - r.x0;
      paStamp('plinkorail', r.x0, r.y - 5, L, 10, 3, g => {
        g.fillStyle = 'rgba(10,8,30,0.6)'; paRR(g, 6, 2.5, L - 12, 5, 2.5); g.fill();
        g.fillStyle = 'rgba(184,145,63,0.55)'; g.fillRect(6, 1.5, L - 12, 1.2);
        g.fillStyle = 'rgba(255,214,140,0.35)'; g.fillRect(6, 7.3, L - 12, 1);
        g.fillStyle = 'rgba(255,214,140,0.4)'; for (let tx = 12; tx < L - 10; tx += 10) g.fillRect(tx, 4, 4, 2);
        for (const x of [0, L - 9]) { paMetal(g, x, 0, 9, 10, '#b8913f', { r: 2, lw: 1, rivets: false }); paStud(g, x + 4.5, 5, 1.6, '#e8c46a', { collar: false }); }
      });
    }
    // pegs
    for (const pg of B.pegs) {
      const hit = pg.t > 0;
      // a brass stud: shadow, dark rim, shaded body, a bright glint
      // (cached sprite) a soft shadow on the felt, a dark collar, a shaded dome and a glint
      paStamp('plinkopeg', pg.x - P.pegR, pg.y - P.pegR, 2 * P.pegR, 2 * P.pegR, 4, g => {
        g.fillStyle = 'rgba(10,8,30,0.35)'; paCirc(g, P.pegR + 1.2, P.pegR + 2.2, P.pegR + 0.8); g.fill();
        paStud(g, P.pegR, P.pegR, P.pegR - 0.3, '#f0d894');
      });
      if (hit) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; circle(pg.x, pg.y, P.pegR + 1); ctx.fill(); }
      if (hit) { ctx.strokeStyle = 'rgba(255,240,180,' + (pg.t / 0.18) + ')'; ctx.lineWidth = 2; circle(pg.x, pg.y, P.pegR + 5 * (1 - pg.t / 0.18) + 2); ctx.stroke(); }
    }
    // pop bumpers
    for (const bp of B.bumpers) {
      const s = 1 + (bp.t > 0 ? 0.15 * bp.t / 0.25 : 0), lit = bp.lit;
      // (cached per lit state, scaled on a hit) a chrome skirt with bolts, a shaded cap with a ring and a star
      const R = P.bumperR, bs = paSprite('plinkobump|' + (lit ? 1 : 0), 2 * R, 2 * R, 5, g => {
        const base = lit ? PL_PINK : '#8a4a9e';
        g.fillStyle = 'rgba(10,8,30,0.4)'; paCirc(g, R + 2, R + 3, R); g.fill();
        paStud(g, R, R, R, '#c9c4d8', { collar: false });
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + 0.3; paStud(g, R + Math.cos(a) * (R - 2), R + Math.sin(a) * (R - 2), 1.1, '#8e88a3', { collar: false }); }
        const gr = g.createRadialGradient(R - 3, R - 4, 1, R, R, R - 3.5);
        gr.addColorStop(0, paLt(base, 0.4)); gr.addColorStop(0.6, base); gr.addColorStop(1, paDk(base, 0.3));
        g.fillStyle = gr; paCirc(g, R, R, R - 3.5); g.fill();
        g.strokeStyle = paDk(base, 0.5); g.lineWidth = 1.2; g.stroke();
        g.strokeStyle = lit ? '#fff3b0' : '#c58fd8'; g.lineWidth = 1.8; paCirc(g, R, R, R - 6); g.stroke();
        g.fillStyle = lit ? '#fff3b0' : 'rgba(255,255,255,0.55)'; g.beginPath();
        for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r2 = k % 2 ? 6.5 * 0.45 : 6.5; g.lineTo(R + Math.cos(a) * r2, R + Math.sin(a) * r2); }
        g.closePath(); g.fill(); g.strokeStyle = paDk(base, 0.35); g.lineWidth = 0.8; g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(R - 5, R - 6, 3.5, 2, -0.6, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#5c5670'; g.lineWidth = 1.2; paCirc(g, R, R, R); g.stroke();
      });
      { const w2 = bs.c.width / bs.sc * s, h2 = bs.c.height / bs.sc * s; ctx.drawImage(bs.c, bp.x - w2 / 2, bp.y - h2 / 2, w2, h2); }
      if (lit) { ctx.fillStyle = 'rgba(255,95,162,0.18)'; circle(bp.x, bp.y, P.bumperR * 1.9); ctx.fill(); }
    }
    // ticket stubs worth 10 tickets (lead review: the world's pink ticket, never a gold coin with a number)
    for (const c of B.chips) {
      if (c.got) continue;
      const bob = Math.sin(G.clock * 3 + c.x) * 2, y = c.y + bob;
      ctx.fillStyle = 'rgba(10,8,30,0.35)'; ctx.beginPath(); ctx.ellipse(c.x, c.y + 11, 10, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(c.x, y); ctx.rotate(-0.12);
      // (cached) a paper stub: lit top, shaded foot, notched ends, a perforated tear line and an outline
      paStamp('plinkostub', -13, -8, 26, 16, 3, g => {
        g.save(); paRR(g, 0, 0, 26, 16, 3); g.clip();
        g.fillStyle = '#ff8fc7'; g.fillRect(0, 0, 26, 16);
        g.fillStyle = '#ffb3d9'; g.fillRect(0, 0, 26, 3);
        g.fillStyle = '#e6639f'; g.fillRect(0, 12, 26, 4);
        g.strokeStyle = 'rgba(122,31,74,0.35)'; g.lineWidth = 0.7; g.strokeRect(3, 2.5, 20, 11);
        g.restore();
        g.globalCompositeOperation = 'destination-out'; paCirc(g, 0, 8, 3.2); g.fill(); paCirc(g, 26, 8, 3.2); g.fill(); g.globalCompositeOperation = 'source-over';
        g.strokeStyle = '#a8326b'; g.lineWidth = 1.1; paRR(g, 0, 0, 26, 16, 3); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.85)'; for (let py = 2; py < 15; py += 3) g.fillRect(6.2, py, 1.5, 1.6);
      });
      ctx.restore();
      text('10', c.x + 3, y + 0.5, 10, '#7a1f4a', 'center', 'body');
    }
    // x2 ring
    for (const rg of B.rings) {
      const a = rg.used ? 0.25 : 1, pulse = 1 + 0.06 * Math.sin(G.clock * 5);
      ctx.save(); ctx.globalAlpha = a;
      ctx.strokeStyle = PL_GOLD; ctx.lineWidth = 4; circle(rg.x, rg.y, 16 * pulse); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,243,176,0.7)'; ctx.lineWidth = 1.5; circle(rg.x, rg.y, 20 * pulse); ctx.stroke();
      text('×2', rg.x, rg.y + 0.5, 13, PL_GOLD, 'center');
      ctx.restore();
    }
    // coach texts (board 1, drops 1-2): not under the intro card, out of the way of the score pop, and not on a
    // lucky drop (its gold pop says "Just catch the chip!" there)
    // (review) and not under the swap banner: they fade in once the chip is on the chute
    if (B.def.coach && st.d < 2 && st.k === 0 && !st.lucky && G.introT <= PLINKO.introLock && st.phase !== 'score' && st.phase !== 'swap') {
      const a = st.phase === 'aim' ? clamp((st.aimT || 0) / 0.4, 0, 1) : 1, cs = hudBig() ? 1.35 : 1;
      for (const c of B.def.coach) text(c.text, c.x, c.y, 15 * cs, 'rgba(255,255,255,' + (0.45 * a).toFixed(3) + ')', 'center');
    }
    plinkoDrawSlots(st);
    for (const p of st.pads) plinkoDrawPad(st, p);
    plinkoDrawSpot(st);
  }
  function plinkoStar(x, y, r) {
    ctx.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr2 = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    ctx.closePath();
  }
  function plinkoDrawSlots(st) {
    const P = PLINKO, B = st.B;
    const ph = Math.floor(G.clock * 8);
    B.slots.forEach((sl, k) => {
      const jack = k === st.jp, v = plinkoValue(st, k), w = sl.x1 - sl.x0;
      // (cached per kind and width) a recessed bin: tint, shaded inner walls, a dark mouth under the rim, a felt floor
      // with a brass kick strip and a lit lip on the walls
      const kind = jack ? 2 : v >= 150 ? 1 : 0, bh = B.slotBot - B.slotTop;
      paStamp('plinkobin|' + kind, sl.x0 + 4, B.slotTop, w - 8, bh, 2, g => {
        const bw = w - 8;
        g.fillStyle = kind === 2 ? 'rgba(255,197,61,0.28)' : kind === 1 ? 'rgba(255,95,162,0.16)' : 'rgba(255,255,255,0.05)'; g.fillRect(0, 0, bw, bh);
        const ig = g.createLinearGradient(0, 0, 0, 16); ig.addColorStop(0, 'rgba(10,8,30,0.4)'); ig.addColorStop(1, 'rgba(10,8,30,0)');
        g.fillStyle = ig; g.fillRect(0, 0, bw, 16);
        const lg = g.createLinearGradient(0, 0, 10, 0); lg.addColorStop(0, 'rgba(10,8,30,0.28)'); lg.addColorStop(1, 'rgba(10,8,30,0)');
        g.fillStyle = lg; g.fillRect(0, 0, 10, bh);
        const rg2 = g.createLinearGradient(bw - 8, 0, bw, 0); rg2.addColorStop(0, 'rgba(255,255,255,0)'); rg2.addColorStop(1, 'rgba(255,255,255,0.08)');
        g.fillStyle = rg2; g.fillRect(bw - 8, 0, 8, bh);
        g.strokeStyle = 'rgba(255,255,255,0.04)'; g.lineWidth = 1; g.beginPath();
        for (let k = -bh; k < bw; k += 8) { g.moveTo(k, bh); g.lineTo(k + bh, 0); }
        g.stroke();
        paMetal(g, 0, bh - 7, bw, 7, kind === 2 ? '#e8b23a' : '#9c7c3c', { r: 1, lw: 1, step: 16, ins: 3.5 });
      });
      if (sl.glow > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (0.35 * sl.glow) + ')'; ctx.fillRect(sl.x0 + 4, B.slotTop, w - 8, B.slotBot - B.slotTop); }
      if (jack) {
        // a gold light column and chasing bulbs around the jackpot slot
        const g2 = ctx.createLinearGradient(0, B.slotTop - 60, 0, B.slotTop);
        g2.addColorStop(0, 'rgba(255,197,61,0)'); g2.addColorStop(1, 'rgba(255,197,61,0.22)');
        ctx.fillStyle = g2; ctx.fillRect(sl.x0 + 4, B.slotTop - 60, w - 8, 60);
        for (let q = 0; q < 6; q++) for (const x of [sl.x0 + 8, sl.x1 - 8]) { const on = (q + ph) % 2 === 0; ctx.fillStyle = on ? '#fff3b0' : 'rgba(255,214,120,0.35)'; circle(x, B.slotTop + 6 + q * 10, 2.4); ctx.fill(); }
        text('JACKPOT', sl.cx, B.slotTop + 13, 10, '#fff3b0', 'center', 'body');
        text(String(v), sl.cx, B.slotTop + 36, 22, PL_GOLD, 'center');
      } else text(String(v), sl.cx, B.slotTop + 32, v >= 150 ? 19 : 17, v >= 150 ? '#ffd0e6' : 'rgba(246,239,223,0.8)', 'center');
    });
    // posts
    for (const po of B.posts) {
      // (cached) a turned brass post: a shaded tube, collars at the foot and the middle, a ball finial with a glint
      const ph2 = po.y1 - po.y0;
      paStamp('plinkopost', po.x - 4, po.y0, 8, ph2, 6, g => {
        g.fillStyle = 'rgba(10,8,30,0.3)'; paRR(g, 2, 3, 8, ph2, 4); g.fill();
        paRod(g, 0, 0, 8, ph2, '#d9c38a');
        for (const cy of [ph2 * 0.5, ph2 - 6]) { paRod(g, -1.5, cy - 2, 11, 4, '#c9a85a'); }
        g.strokeStyle = 'rgba(122,92,32,0.45)'; g.lineWidth = 0.7; g.beginPath();
        for (let yy = 10; yy < ph2 - 8; yy += 6) { if (Math.abs(yy - ph2 * 0.5) < 4) continue; g.moveTo(1.5, yy); g.lineTo(6.5, yy); }
        g.stroke();
        paStud(g, 4, 1, 4.6, '#f3d98a', { collar: false });
      });
    }
    // the lucky light marker on a moving board: a little gold arrow over the lit slot
    if (st.light) {
      const sl = B.slots[st.jp], bob = st.locked ? 0 : Math.sin(G.clock * 8) * 2;
      ctx.fillStyle = st.locked ? '#ffffff' : PL_GOLD;
      ctx.beginPath(); ctx.moveTo(sl.cx - 7, B.slotTop - 14 + bob); ctx.lineTo(sl.cx + 7, B.slotTop - 14 + bob); ctx.lineTo(sl.cx, B.slotTop - 5 + bob); ctx.fill();
    }
  }
  function plinkoDrawPad(st, p) {
    const P = PLINKO, live = p.i === st.live && st.phase !== 'score' && st.phase !== 'tally', id = st.steer;
    const col = PCOL[id], dark = PDARK[id], hit = p.hitT > 0 ? p.hitT / 0.2 : 0, gold = st.lucky && !p.nap;
    const y = p.y - P.padH / 2 - (p.bumpT > 0 ? 4 : 0) - (p.wake > 0 ? Math.sin(p.wake / 0.35 * Math.PI) * 5 : 0) + hit * 2, x = p.x - p.w / 2;
    const cheer = st.phase === 'score' && st.slot === st.jp && !p.nap;   // every awake paddle cheers a jackpot
    ctx.save();
    ctx.globalAlpha = p.nap ? 0.38 : live ? 1 : 0.72;
    if (gold) { ctx.fillStyle = 'rgba(255,197,61,0.25)'; rr(x - 6, y - 6, p.w + 12, P.padH + 12, 10); ctx.fill(); }
    ctx.fillStyle = 'rgba(10,8,30,0.35)'; rr(x + 2, y + 3, p.w, P.padH, 6); ctx.fill();
    // the kick cue: the third that sends the chip nearest the JACKPOT shines (both ends on a lucky drop)
    const cue = live && !p.nap && st.cue !== null && (st.phase === 'aim' || st.phase === 'fall') ? (st.cue === 2 ? (PLINKO.luckyMid ? [-1, 0, 1] : [-1, 1]) : [st.cue]) : [];
    const shine = 0.5 + 0.5 * Math.sin(G.clock * 8);
    if (cue.length) {
      ctx.fillStyle = gold ? 'rgba(255,236,160,' + (0.3 + 0.35 * shine).toFixed(3) + ')' : 'rgba(255,197,61,' + (0.45 + 0.4 * shine).toFixed(3) + ')';
      for (const z of cue) { rr(x + (z + 1) * p.w / 3 - 3, y - 4, p.w / 3 + 6, P.padH + 8, 9); ctx.fill(); }
    }
    // ears / sprout so you know whose paddles these are
    if (id === 1) { ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 1.5; for (const ex of [p.x - 9, p.x + 9]) { circle(ex, y, 4); ctx.fill(); ctx.stroke(); } }
    else { ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x + 1, y - 5); ctx.stroke(); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(p.x + 5, y - 7, 5, 2.4, -0.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = gold ? PL_GOLD : col; ctx.strokeStyle = dark; ctx.lineWidth = 2;
    rr(x, y, p.w, P.padH, 6); ctx.fill(); ctx.stroke();
    if (cue.length) {
      ctx.fillStyle = 'rgba(255,246,196,' + (0.7 + 0.25 * shine).toFixed(3) + ')';
      for (const z of cue) { rr(x + (z + 1) * p.w / 3 + 2, y + 1.5, p.w / 3 - 4, P.padH - 3, 4.5); ctx.fill(); }
    }
    // (review) a power kick is the better kick here: a gold ▲ POWER over the shine (press ▲ just before the chip lands)
    if (cue.length === 1 && cue[0] !== 0 && st.cuePow && st.phase === 'fall') {
      const cx = x + (cue[0] + 1) * p.w / 3 + p.w / 6, ps = hudBig() ? 1.3 : 1, by = y - 4 - shine * 2;
      ctx.fillStyle = PL_GOLD; ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx - 6 * ps, by); ctx.lineTo(cx + 6 * ps, by); ctx.lineTo(cx, by - 9 * ps); ctx.closePath(); ctx.fill(); ctx.stroke();
      text('POWER', cx, by - 16 * ps, 11 * ps, PL_GOLD, 'center');
    }
    // the three zones: ◀ kick left | stop | kick right ▶ (a glowing end gets a dark arrow)
    const ay = y + P.padH / 2;
    for (const z of [-1, 1]) {
      const ex = z < 0 ? x + 8 : x + p.w - 8, on = cue.includes(z);
      ctx.fillStyle = on ? dark : 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.moveTo(ex, ay); ctx.lineTo(ex - z * 7, ay - 4); ctx.lineTo(ex - z * 7, ay + 4); ctx.fill();
      if (on) { ctx.beginPath(); ctx.moveTo(ex - z * 9, ay); ctx.lineTo(ex - z * 15, ay - 3.5); ctx.lineTo(ex - z * 15, ay + 3.5); ctx.fill(); }
    }
    ctx.strokeStyle = 'rgba(28,26,54,0.35)'; ctx.lineWidth = 1.5;
    for (const fx of [x + p.w / 3, x + 2 * p.w / 3]) { ctx.beginPath(); ctx.moveTo(fx, y + 2); ctx.lineTo(fx, y + P.padH - 2); ctx.stroke(); }
    // face in the middle: awake on the live paddle (squeezed on a kick), sleepy on the others, happy on a jackpot
    const b = st.b, lx = clamp((b.x - p.x) / 200, -1, 1) * 1.6, ly = clamp((b.y - p.y) / 200, -1, 1) * 1.2;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    if (cheer) {
      for (const ex of [p.x - 4, p.x + 4]) { ctx.beginPath(); ctx.moveTo(ex - 2.3, ay + 1.2); ctx.lineTo(ex, ay - 1.6); ctx.lineTo(ex + 2.3, ay + 1.2); ctx.stroke(); }
    } else if (live && !p.nap && hit > 0) {
      for (const z of [-1, 1]) { const ex = p.x + z * 4; ctx.beginPath(); ctx.moveTo(ex + z * 2.2, ay - 2.2); ctx.lineTo(ex - z * 1.4, ay); ctx.lineTo(ex + z * 2.2, ay + 2.2); ctx.stroke(); }
    } else if (live && !p.nap) {
      for (const ex of [p.x - 4, p.x + 4]) { ctx.fillStyle = '#fff'; circle(ex + lx * 0.4, ay, 2.6); ctx.fill(); ctx.fillStyle = C.ink; circle(ex + lx, ay + ly, 1.4); ctx.fill(); }
    } else {
      for (const ex of [p.x - 4, p.x + 4]) { ctx.beginPath(); ctx.moveTo(ex - 2.2, ay); ctx.lineTo(ex + 2.2, ay); ctx.stroke(); }
    }
    ctx.restore();
    if (p.nap) { ctx.save(); ctx.globalAlpha = 0.8; text('z', p.x + 18, y - 8 - Math.sin(G.clock * 3) * 3, 12, '#d9d3ef', 'center'); text('z', p.x + 26, y - 16 - Math.sin(G.clock * 3 + 1) * 3, 9, '#d9d3ef', 'center'); ctx.restore(); }
    // the live paddle: a gold bracket under it
    if (live && !p.nap) {
      ctx.strokeStyle = 'rgba(255,197,61,0.9)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x - 6, y + P.padH + 6); ctx.lineTo(x + p.w + 6, y + P.padH + 6); ctx.stroke();
    }
  }
  // the landing spot: where the falling chip will meet the live paddle's line (shown once nothing is in between)
  function plinkoDrawSpot(st) {
    if (st.shadow === null || st.phase !== 'fall' || st.live < 0) return;
    const P = PLINKO, p = st.pads[st.live], b = st.b, y = p.y - P.padH / 2 - 1;
    const near = clamp(1 - (y - b.y) / 90, 0, 1), on = Math.abs(st.shadow - p.x) <= p.w / 2 + 5, sc = hudBig() ? 1.35 : 1;
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.35 * near;
    ctx.strokeStyle = on ? '#ffffff' : '#ffe08a'; ctx.lineWidth = 2 * sc;
    ctx.setLineDash([2 * sc, 4 * sc]); ctx.beginPath(); ctx.moveTo(b.x, b.y + P.r + 3); ctx.lineTo(st.shadow, y - 6); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.ellipse(st.shadow, y, (7 + 4 * near) * sc, (2.6 + 1.2 * near) * sc, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = on ? '#ffffff' : '#ffe08a'; circle(st.shadow, y, 1.8 * sc); ctx.fill();
    ctx.restore();
  }
  function plinkoDrawBall(st) {
    const P = PLINKO, b = st.b, id = st.ball, col = PCOL[id], dark = PDARK[id], r = P.r;
    const sq = b.sq > 0 ? 1 - b.sq * 1.2 : 1, s = 0.3 + 0.7 * b.pop;
    const happy = st.phase === 'score' && b.happy, hop = happy ? Math.abs(Math.sin(st.t * 8)) * 7 * Math.max(0, 1 - st.t / P.scoreT) : 0;
    ctx.save(); ctx.translate(b.x, b.y - hop); ctx.scale(s / Math.sqrt(sq), s * sq);
    if (b.mult > 1) { ctx.fillStyle = 'rgba(255,197,61,0.3)'; circle(0, 0, r + 7); ctx.fill(); }
    if (id === 1) { ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 1.5; for (const ex of [-6, 6]) { circle(ex, -r + 1, 3.6); ctx.fill(); ctx.stroke(); } }
    else { ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(1, -r - 4); ctx.stroke(); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(4, -r - 5, 4.5, 2.2, -0.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = col; circle(0, 0, r); ctx.fill();
    ctx.save(); ctx.rotate(b.spin); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.setLineDash([3.5, 5.4]); circle(0, 0, P.r - 2); ctx.stroke(); ctx.setLineDash([]); ctx.restore();   // (lead review) dashed chip edge
    ctx.strokeStyle = dark; ctx.lineWidth = 2.2; circle(0, 0, r); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; circle(-3.5, -4, 3.2); ctx.fill();
    // the face: looks where it goes, squints on a plink, "ooh" when fast, blinks while it waits, beams on a jackpot
    const sp = Math.hypot(b.vx, b.vy), lx = sp > 30 ? b.vx / sp * 1.6 : 0, ly = sp > 30 ? b.vy / sp * 1.6 : 1;
    const zoom = st.phase === 'fall' && (b.diving || sp > 330), blink = st.phase === 'aim' && (G.clock + id * 1.3) % 2.6 < 0.13;
    ctx.strokeStyle = C.ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (happy) {
      ctx.lineWidth = 1.7;
      for (const ex of [-3.8, 3.8]) { ctx.beginPath(); ctx.moveTo(ex - 2.4, -0.6); ctx.lineTo(ex, -3.2); ctx.lineTo(ex + 2.4, -0.6); ctx.stroke(); }
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0, 2.2, 3.8, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#ff8fa8'; ctx.beginPath(); ctx.arc(0, 4.4, 2, 0, Math.PI); ctx.fill();
    } else {
      if (b.squint > 0) {
        ctx.lineWidth = 1.7;
        for (const z of [-1, 1]) { const ex = z * 3.8; ctx.beginPath(); ctx.moveTo(ex + z * 2.2, -3.4); ctx.lineTo(ex - z * 1.6, -1.2); ctx.lineTo(ex + z * 2.2, 1); ctx.stroke(); }
      } else if (blink) {
        ctx.lineWidth = 1.6;
        for (const ex of [-3.6, 3.6]) { ctx.beginPath(); ctx.moveTo(ex - 2.3, -0.8); ctx.lineTo(ex + 2.3, -0.8); ctx.stroke(); }
      } else {
        for (const ex of [-3.6, 3.6]) { ctx.fillStyle = '#fff'; circle(ex + lx * 0.5, -1.6 + ly * 0.4, 2.8); ctx.fill(); ctx.fillStyle = C.ink; circle(ex + lx, -1.2 + ly * 0.6, 1.5); ctx.fill(); }
      }
      if (zoom || b.squint > 0.06) { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(0, 4.6, 1.8, 2.3, 0, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 3, 2.7, 0.18 * Math.PI, 0.82 * Math.PI); ctx.stroke(); }
    }
    ctx.restore();
    // hops left: little dots over the ball while it falls
    if (st.phase === 'fall' && !b.heavy) for (let k = 0; k < P.hops; k++) {
      ctx.fillStyle = k < b.hops ? '#ffffff' : 'rgba(255,255,255,0.22)'; circle(b.x - 4 + k * 8, b.y - r - 9, 2.5); ctx.fill();
    }
    // (review) the chip's own cue: a gold double arrow on the side to lean (or hop) toward the shine / the JACKPOT
    if (st.phase === 'fall' && st.chipDir) {
      const d = st.chipDir, as = hudBig() ? 1.6 : 1.15, ax = b.x + d * (r + 4 * as);
      ctx.save(); ctx.globalAlpha = 0.82 + 0.18 * Math.sin(G.clock * 10);
      ctx.fillStyle = PL_GOLD; ctx.strokeStyle = 'rgba(28,26,54,0.85)'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
      for (const o of [0, 7 * as]) {
        ctx.beginPath(); ctx.moveTo(ax + d * o, b.y - 6 * as); ctx.lineTo(ax + d * (o + 7 * as), b.y); ctx.lineTo(ax + d * o, b.y + 6 * as); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }
    // the drop line while aiming
    if (st.phase === 'aim') {
      ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(b.x, b.y + r + 6); ctx.lineTo(b.x, b.y + r + 30); ctx.stroke(); ctx.setLineDash([]);
      const aimT = st.aimT || 0;
      if (aimT > PLINKO.autoWarn) { // auto-drop ring
        const f = clamp((aimT - PLINKO.autoWarn) / (PLINKO.autoDrop - PLINKO.autoWarn), 0, 1);
        ctx.strokeStyle = 'rgba(28,26,54,0.35)'; ctx.lineWidth = 3; circle(b.x, b.y, 18); ctx.stroke();
        ctx.strokeStyle = PL_GOLD; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(b.x, b.y, 18, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.stroke();
      }
    }
  }
  function plinkoTag(x, y, id, a, below, side) {
    ctx.save(); ctx.globalAlpha = a;
    if (hudBig()) { ctx.translate(x, y); ctx.scale(1.35, 1.35); x = 0; y = 0; }   // (review) phone size
    ctx.fillStyle = PCOL[id]; rr(x - 18, y - 11, 36, 18, 9); ctx.fill();
    ctx.beginPath();
    if (side === 'left') { ctx.moveTo(x - 18, y - 6); ctx.lineTo(x - 18, y + 2); ctx.lineTo(x - 23, y - 2); }
    else if (side === 'right') { ctx.moveTo(x + 18, y - 6); ctx.lineTo(x + 18, y + 2); ctx.lineTo(x + 23, y - 2); }
    else if (below) { ctx.moveTo(x - 4, y - 11); ctx.lineTo(x + 4, y - 11); ctx.lineTo(x, y - 15); } else { ctx.moveTo(x - 4, y + 7); ctx.lineTo(x + 4, y + 7); ctx.lineTo(x, y + 11); }
    ctx.fill();
    text(NAMES[id], x, y - 1.5, 12, '#fff', 'center', 'body');
    ctx.restore();
  }
  function plinkoHud(st) {
    const P = PLINKO, big = hudBig(), sc = big ? 1.3 : 1;
    // top right: this board's tickets and stars, with a bar to the next star
    const th = st.B.def.stars || [300, 800, 1400], got = th.filter(x => st.boardTix >= x).length;
    const num = fmtN(st.boardTix);
    ctx.font = (18 * sc) + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const nw = ctx.measureText(num).width, pw = (34 + nw + 14 + 3 * 18 + 16) * sc / (big ? 1.08 : 1);
    const px = pill(W - 14, 12, pw, 28 * sc, 'right');
    // ticket icon
    ctx.save(); ctx.translate(px + 18 * sc, 26 * sc); ctx.scale(sc, sc);
    ctx.fillStyle = st.tixPop > 0 ? '#ffffff' : PL_PINK; rr(-9, -6, 18, 12, 2); ctx.fill();
    ctx.fillStyle = 'rgba(28,26,54,0.78)'; circle(-9, 0, 2.5); ctx.fill(); circle(9, 0, 2.5); ctx.fill();
    ctx.restore();
    text(num, px + 32 * sc, 26.5 * sc, 18 * sc, C.paper, 'left');
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = k < got ? PL_GOLD : 'rgba(246,239,223,0.25)';
      plinkoStar(px + (32 + nw / sc + 18 + k * 18) * sc, 26 * sc, 7 * sc); ctx.fill();
    }
    if (got < 3) {
      const lo = got ? th[got - 1] : 0, f = clamp((st.boardTix - lo) / (th[got] - lo), 0, 1), bw = 60 * sc;
      ctx.fillStyle = 'rgba(28,26,54,0.6)'; rr(W - 14 - bw - 10, 12 + 28 * sc + 4, bw, 5, 2.5); ctx.fill();
      ctx.fillStyle = PL_GOLD; rr(W - 14 - bw - 10, 12 + 28 * sc + 4, Math.max(5, bw * f), 5, 2.5); ctx.fill();
    }
    // top centre: who does what right now (device key names)
    let hint = null, hc = C.paper;
    if (G.introT <= 0 && st.phase === 'aim') { hint = NAMES[st.ball] + ': ' + plinkoKeys(st.ball, 'aim') + '   ' + NAMES[st.steer] + ': ' + plinkoKeys(st.steer, 'pad'); hc = PCOL[st.ball]; }
    else if (st.phase === 'fall') {
      // 1 player + computer: while the chip falls the hint is always the person's own line, never the computer's
      const solo = typeof cpuSolo === 'function' && cpuSolo(), cpuB = solo && cpuOn(st.ball), cpuS = solo && cpuOn(st.steer);
      if (st.cuePow && st.shadow !== null && !cpuS) { hint = NAMES[st.steer] + ': ' + plinkoKeys(st.steer, 'pow'); hc = PCOL[st.steer]; }
      else if ((st.b.fallT < 2.5 || st.idle[st.ball] > 4 || cpuS) && !cpuB) { hint = NAMES[st.ball] + ': ' + plinkoKeys(st.ball, 'fall'); hc = PCOL[st.ball]; }
      else { hint = NAMES[st.steer] + ': ' + plinkoKeys(st.steer, 'pad'); hc = PCOL[st.steer]; }
    }
    if (hint) {
      // keep clear of the framework's room pill (x 14 .. 14 + its text + 44, y 46..72) and of the tickets pill
      const D = G.level.def;
      ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
      const roomR = 14 + ctx.measureText('Room ' + ((D.roomIndex || 0) + 1) + ' of ' + (D.roomCount || 1) + ': ' + (D.title || '')).width + 44;
      ctx.font = '700 ' + (13 * sc) + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const sw = ctx.measureText(hint).width + 32;
      const hx = clamp(W / 2, roomR + 8 + sw / 2, W - (big ? 120 : 14) - sw / 2);
      pill(hx, 48, sw, 24 * sc, 'center');
      ctx.fillStyle = hc; circle(hx - sw / 2 + 12, 48 + 12 * sc, 4); ctx.fill();
      text(hint, hx + 4, 48 + 12.5 * sc, 13 * sc, C.paper, 'center', 'body');
    }
    // name tags: the ball and the live paddle, during the card and the swap
    const tagA = G.introT > 0 ? clamp(G.introT / 0.5, 0, 1) : st.phase === 'swap' ? 1 : (st.phase === 'aim' && (st.aimT || 0) < 1.2 ? 1 - (st.aimT || 0) / 1.2 : 0);
    if (tagA > 0) {
      const ts = big ? 1.35 : 1;
      plinkoTag(st.b.x + (st.b.x < W / 2 ? 40 : -40) * ts, st.b.y - 1, st.ball, tagA, false, st.b.x < W / 2 ? 'left' : 'right');
      const lp = st.pads[Math.max(0, st.live)];
      if (lp) plinkoTag(lp.x, lp.y + 30 * ts, st.steer, tagA, true);
    }
    // the chip's little speech bubble ("Wheee!" on the drop), beside it, toward the board centre
    if (st.say && st.phase === 'fall') {
      const b = st.b, side = b.x < W / 2 ? 1 : -1, pop = clamp((1.0 - st.say.t) / 0.12, 0, 1), a = clamp(st.say.t / 0.25, 0, 1), sc = hudBig() ? 1.3 : 1;
      ctx.font = '15px "Lilita One", "Arial Rounded MT Bold", sans-serif';
      const bw = ctx.measureText(st.say.text).width + 16, bx = b.x + side * (18 + bw * sc / 2), by = b.y - 14;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(bx, by); ctx.scale((0.6 + 0.4 * pop) * sc, (0.6 + 0.4 * pop) * sc);
      ctx.fillStyle = 'rgba(255,255,255,0.94)'; rr(-bw / 2, -11, bw, 22, 11); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-side * (bw / 2 - 8), 5); ctx.lineTo(-side * (bw / 2 + 4), 12); ctx.lineTo(-side * (bw / 2 - 14), 9); ctx.fill();
      text(st.say.text, 0, 0.5, 15, PDARK[st.ball], 'center');
      ctx.restore();
    }
    // swap banner
    if (st.phase === 'swap') {
      const a = clamp(st.t / 0.2, 0, 1) * clamp((PLINKO.swapT - st.t) / 0.2, 0, 1);
      ctx.save(); ctx.globalAlpha = a;
      if (big) { ctx.translate(W / 2, 232); ctx.scale(1.35, 1.35); ctx.translate(-W / 2, -232); }   // (review) phone size: 540 x 86
      ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(W / 2 - 200, 200, 400, 64, 18); ctx.fill();
      text('Swap!', W / 2, 222, 24, PL_GOLD, 'center');
      ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
      const l1 = NAMES[st.ball] + ' is the chip', l2 = '  ·  ', l3 = NAMES[st.steer] + ' kicks';
      const w1 = ctx.measureText(l1).width, w2 = ctx.measureText(l2).width, w3 = ctx.measureText(l3).width;
      let x0 = W / 2 - (w1 + w2 + w3) / 2;
      text(l1, x0, 248, 15, PCOL[st.ball], 'left', 'body'); text(l2, x0 + w1, 248, 15, C.paper, 'left', 'body'); text(l3, x0 + w1 + w2, 248, 15, PCOL[st.steer], 'left', 'body');
      ctx.restore();
    }
    // score pop
    if (st.phase === 'score') {
      const jack = st.slot === st.jp, sl = st.B.slots[st.slot], rise = Math.min(1, st.t / 0.5);
      const label = (jack ? 'JACKPOT! ' : '') + '+' + fmtN(st.payout) + (st.b.mult > 1 ? ' (×2)' : '');
      const ss = big ? 1.25 : 1;
      bigText(label, clamp(sl.cx, 150 * ss, W - 150 * ss), st.B.slotTop - 30 - rise * 30, (jack ? 34 : 24) * ss, jack ? PL_GOLD : C.paper, jack ? 1 + 0.08 * Math.sin(st.t * 12) : 1);
    }
    // floating texts and messages
    const fs = big ? 1.3 : 1;   // (review) phone size
    for (const f of st.fx) { ctx.save(); ctx.globalAlpha = clamp(f.t / 0.3, 0, 1); bigText(f.text, f.x, f.y, f.size * fs, f.col); ctx.restore(); }
    if (st.msg) { ctx.save(); ctx.globalAlpha = clamp(st.msg.t / 0.3, 0, 1); bigText(st.msg.text, W / 2, 150, 22 * fs, st.msg.col); ctx.restore(); }
    // board tally card
    if (st.phase === 'tally') {
      const a = clamp(st.t / 0.25, 0, 1), last = st.k >= (G.level.def.roomCount || 1) - 1;
      const zero = st.starsEarned[st.k] === 0 && st.t > 0.9, ny = zero ? 307 : 285;   // (review) a warm word on a 0-star board
      ctx.save(); ctx.globalAlpha = a;
      if (big) { ctx.translate(W / 2, 225); ctx.scale(1.3, 1.3); ctx.translate(-W / 2, -225); }   // (review) phone size
      ctx.fillStyle = 'rgba(28,26,54,0.9)'; rr(W / 2 - 220, 150, 440, zero ? 172 : 150, 20); ctx.fill();
      if (zero) text('Great plinking! Try the shiny end!', W / 2, 283, 16, PL_GOLD, 'center', 'body');
      text(st.B.def.title + ' done!', W / 2, 180, 26, C.paper, 'center');
      text(fmtN(st.boardTix) + ' tickets', W / 2, 212, 18, '#d9d3ef', 'center', 'body');
      for (let k = 0; k < 3; k++) {
        const on = k < st.tallyStars, x = W / 2 - 50 + k * 50;
        ctx.fillStyle = on ? PL_GOLD : 'rgba(246,239,223,0.2)'; plinkoStar(x, 250, on ? 17 : 15); ctx.fill();
      }
      text(last ? 'Total: ' + fmtN(st.total) + ' tickets!' : 'Next: ' + G.level.def.rooms[st.k + 1].title, W / 2, ny, 14, '#d9d3ef', 'center', 'body');
      ctx.restore();
    }
  }

  MODES.plinko = {
    medals: { bronze: 'Drop every chip', goals: [{ key: 'stars', gold: 8, silver: 5, more: true, text: n => `${n} of 9 stars or more`, gap: (v, n) => `${n - v} more star${n - v === 1 ? '' : 's'}` }] },
    medalValues() { const st = G.mst; return st && st.starsEarned ? { stars: st.starsEarned.reduce((a, b) => a + b, 0) } : {}; },
    CFG: PLINKO, rand: Math.random,
    setup(st, L) {
      Object.assign(st, { total: 0, misses: 0, fx: [], msg: null, plinkCD: 0, tixPop: 0, idle: [0, 0], starsEarned: [0, 0, 0],
        stats: { jackpots: [0, 0], kicks: [0, 0], power: [0, 0], hops: [0, 0], steerT: [0, 0], chips: 0, pops: 0, lights: 0, rings: 0, pegs: 0, nudges: 0, autoDrops: 0, best: { who: 0, v: 0 } } });
      plinkoRoom(st, L, 0);
    },
    room(k, L) { plinkoRoom(G.mst, L, k); },
    step(dt) { plinkoStep(G.mst, dt); },
    draw() { if (G.mst.B) plinkoDrawBoard(G.mst); },
    drawTop() { if (G.mst.B && G.mst.phase !== 'tally') plinkoDrawBall(G.mst); },
    hud() { if (G.mst.B) plinkoHud(G.mst); },
    stats() {
      const st = G.mst, s = st.stats, stars = st.starsEarned.reduce((a, b) => a + b, 0);
      const prize = PLINKO_PRIZES.find(p => st.total < p[0])[1];
      return [
        { label: 'Stars', value: stars + ' of 9' },   // (review) the score of a Plinko run leads the card
        { label: 'Tickets', value: fmtN(st.total) },
        { label: 'Jackpots', value: String(s.jackpots[0] + s.jackpots[1]) },
        { label: 'Paddle kicks', values: s.kicks.slice() },
        'Prize desk: ' + prize + '!',
      ];
    },
    test: { plinkoLive, plinkoValue, plinkoStars, plinkoFlightT, plinkoKeys, plinkoChipCue },
  };
  Sfx.extra.plinkoDrop = function (p) { this.tone(700 * p, 0.12, 'triangle', 0.05, 350 * p); };
  Sfx.extra.plinkoHop = function (p) { this.tone(330 * p, 0.12, 'square', 0.035, 700 * p); };
  Sfx.extra.plinkoKick = function (p) { this.tone(440 * p, 0.06, 'square', 0.05, 660 * p); this.tone(220, 0.08, 'triangle', 0.06, 160); };
  Sfx.extra.plinkoPower = function (p) { this.tone(520 * p, 0.08, 'square', 0.06, 1040 * p); this.tone(1320, 0.1, 'triangle', 0.04, null, 0.04); };
  Sfx.extra.plinkoBump = function (p) { this.tone(300 * p, 0.05, 'triangle', 0.03, 380 * p); };
  Sfx.extra.plinkoWake = function (p) { this.tone(660 * p, 0.05, 'triangle', 0.03); this.tone(880 * p, 0.05, 'triangle', 0.03, null, 0.05); };
  Sfx.extra.plinkoNap = function () { this.tone(500, 0.25, 'sine', 0.04, 250); };
  Sfx.extra.plinkoChip = function () { this.tone(1319, 0.06, 'square', 0.035); this.tone(1760, 0.1, 'triangle', 0.04, null, 0.05); };
  Sfx.extra.plinkoLights = function () { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
  Sfx.extra.plinkoSlot = function () { this.tone(523, 0.12, 'triangle', 0.05); this.tone(659, 0.14, 'triangle', 0.045, null, 0.08); };
  Sfx.extra.plinkoNear = function () { [523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
  Sfx.extra.plinkoJackpot = function () {
    [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, 'square', 0.04, null, i * 0.08));
    [0.4, 0.55, 0.7].forEach(d => { this.tone(2093, 0.12, 'triangle', 0.05, null, d); this.tone(1568, 0.12, 'triangle', 0.04, null, d + 0.02); });
  };
  Sfx.extra.plinkoStar = function () { this.tone(1175, 0.09, 'triangle', 0.05); this.tone(1568, 0.14, 'triangle', 0.05, null, 0.06); };
  Sfx.extra.plinkoLight = function () { this.tone(1760, 0.025, 'square', 0.012); };
  Sfx.extra.plinkoLock = function () { this.tone(330, 0.06, 'square', 0.05); this.tone(1320, 0.12, 'triangle', 0.05, null, 0.05); };
  Sfx.extra.plinkoLucky = function () { [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.035, null, i * 0.05)); };
  Sfx.extra.plinkoSwap = function () { [523, 784].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.045, null, i * 0.08)); };
  Sfx.extra.plinkoTick = function () { this.tone(880, 0.04, 'square', 0.025); };
}
/* ===== end of 8-1 Plinko Drop ===== */

