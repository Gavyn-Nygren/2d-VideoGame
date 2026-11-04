/* Pip & Bo - Level 4-4 Paint the Floor (versus). */
'use strict';

/* ===== 4-4 Paint the Floor (mode 'paint') =====
   Run to paint every floor and plank top your colour. act = SPLAT: in the air you dive straight down, on the ground you
   hop first; the higher the dive, the bigger the splash. A dive onto the other player's head is a head-splat (dizzy +
   your paint around them). 45 s rounds, best of 5: whoever owns more paint cells at the bell wins the round.
   Catch-up: behind by 6 % of the cells for 0.5 s -> Super Paint (your splashes get bigger and become shiny paint that
   walking can't cover); a golden bucket
   (MEGA SPLASH) drops near whoever is behind with 12 s left. Twists by round: Classic, Speedy Paint, Splat Party. */
const PAINT = {
  cell: 10,                  // px per paint cell (3 per tile top)
  feetInset: 2,              // the brush is the feet: [x + 2, x + w - 2]
  // SPLAT (act)
  hopV: 430,                 // ground press: hop at this speed, dive at the top (vy >= hopTop)
  hopTop: -40,
  diveVx: 0.35,              // horizontal speed kept when a dive starts
  diveHang: 0.08,            // s with no gravity at the start of a dive (the wind-up pose)
  diveV: 900,                // dive speed (= PHYS.maxFall)
  cool: 0.95,                // s after a splat lands before the next press works (Splat Party: 0.5)
  bonkCool: 0.4,             // a dive that bounced off a protected head
  rSmall: 30, rMed: 60, rBig: 90,   // splash reach past each side of the body (half-width = 11 + r)
  hMed: 70, hBig: 150,       // fall height (landing y - highest y of this airtime) for a medium / big splash
  rowTol: 1,                 // a splash also paints surfaces up to 1 tile row above / below the landing row
  splatR: 60, splatStun: 1.0, // head-splat: patch reach around the victim, victim stun
  shoveV: 300, shoveVy: -220, shoveStun: 0.3, shoveSlide: 0.3, shoveSafe: 1.0, shoveDy: 36,
  // comeback = Super Paint
  cbOn: 0.06,                // behind by >= 6 % of all cells ...
  cbArm: 0.5,                // ... for 0.5 s in a row -> on (fewer on/off flips; 1.5 s measured: kid 17 %, sandbag 55 %)
  cbOff: 0.03,               // behind by < 3 % -> off
  cbSplash: 150,             // extra splash reach while on (only splashes lay Super Paint, so they are big)
  cbRows: 1,                 // extra rows (+-2 instead of +-1) while on
  // golden bucket
  bucketAt: 12, bucketFall: 1.2, megaR: 135, megaRows: 2,
  // twists
  twists: ['classic', 'speedy', 'party'],
  speedy: { ownSpeed: 0.30 },
  party: { cool: 0.5, hopV: 520, rSmall: 45 },
  ownSpeed: 0,
  // feedback
  tinkGap: 1.0,              // s between "tink" sounds when walking over Super Paint you can't cover
  hintAt: 8, hints: 2,       // "Press F to SPLAT!" bubble: s into a round, for a player who never splatted (max per match)
};
const PAINT_CARDS = {
  classic: { name: 'Classic', hint: 'Run to paint. Splat in the air!' },
  speedy: { name: 'Speedy Paint', hint: 'Your own colour is a fast lane!' },
  party: { name: 'Splat Party', hint: 'Splats recharge fast. Splat, splat, splat!' },
};
const paintRow = p => Math.floor((p.y + p.h + 1) / T);
// both players, in the engine's alternating versus order (same-tick ties are a fair coin flip)
const paintOrder = () => (G.tickN & 1 ? [G.players[1], G.players[0]] : [G.players[0], G.players[1]]);
// 1-player mode: no "press this key" tips over the computer's character (the computer doesn't need them)
const paintTips = k => !(typeof cpuSolo === 'function' && cpuSolo() && cpuOn(k));
const paintPct = (c, n, dec) => (dec ? (Math.round(1000 * c / n) / 10).toFixed(1) : String(Math.round(100 * c / n)));

MODES.paint = {
  K: PAINT,
  rand: Math.random,
  setup(st, L) {
    // 'B' = golden-bucket spot (right edge of its tile, on the surface under it): remember it, clear the tile
    st.spots = [];
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) if (L.grid[ty][tx] === 'B') {
      st.spots.push({ x: (tx + 1) * T, y: (ty + 1) * T }); L.grid[ty][tx] = '.';
    }
    // paint cells: every exposed top of a stone or plank tile, 3 cells per tile
    const idx = new Int32Array(ROWS * COLS * 3).fill(-1), cells = [];
    for (let ty = 1; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
      const ch = L.grid[ty][tx];
      if ((ch === '#' || ch === '=') && L.grid[ty - 1][tx] === '.') for (let i = 0; i < 3; i++) {
        idx[(ty * COLS + tx) * 3 + i] = cells.length;
        cells.push({ tx, ty, i, x0: tx * T + i * PAINT.cell, top: ty * T, plank: ch === '=', drip: !(hash(tx * 3 + i, ty) % 4) ? 5 + hash(ty, tx * 3 + i) % 7 : 0 });
      }
    }
    st.idx = idx; st.cells = cells; st.n = cells.length;
    st.stats = { splats: [0, 0], bigSplats: [0, 0], headSplats: [0, 0], buckets: [0, 0], comebacks: [0, 0], flips: [0, 0], best: [0, 0] };
    st.pressed = [false, false];   // has this player ever splatted this match (for the "Press F to SPLAT!" hint)
    st.hintSplat = [0, 0]; st.hintRd = [0, 0]; // splat hints shown this match, and the round of the last one
    st.hintTink = [false, false];  // the one-time "Shiny paint: SPLAT it!" bubble
  },
  resetRound(n) {
    const st = G.mst, N = st.n;
    st.own = new Int8Array(N).fill(-1); st.thick = new Uint8Array(N); st.wet = new Float32Array(N).fill(-99);
    st.count = [0, 0]; st.cb = [false, false]; st.cbShown = [false, false]; st.cbArm = [0, 0];
    st.dive = [0, 0]; st.diveT = [0, 0]; st.diveFrom = [-1, -1]; st.cool = [0, 0];
    st.peak = G.players.map(p => p.y); st.safeT = [0, 0]; st.lead = [0, 0]; st.lastLead = -1; st.leadT = -99;
    st.bucket = null; st.bucketDone = false; st.bucketGot = -1;
    st.twist = PAINT.twists[(n - 1) % PAINT.twists.length];
    st.K = Object.assign({}, PAINT, PAINT[st.twist] || {});
    st.fx = []; st.pops = []; st.bub = [null, null]; st.blob = [null, null];
    st.tinkT = [0, 0]; st.sparkT = [0, 0]; st.trailT = [0, 0]; st.blk = false;
  },
  // ----- painting -----
  // returns 1 if the cell changed hands, 0 if not, -1 if walking was blocked by someone else's Super Paint.
  // Only a splash lays Super Paint (walking never does: no "shiny carpet" by sandbagging behind and walking about)
  paintCell(ci, k, splat) {
    const st = G.mst, prev = st.own[ci], sup = st.cb[k] && splat ? 1 : 0;
    if (prev === k) { if (sup && !st.thick[ci]) { st.thick[ci] = 1; st.wet[ci] = G.time; } return 0; }
    if (prev >= 0 && st.thick[ci] && !splat) return -1;
    st.thick[ci] = sup;
    if (prev >= 0) { st.count[prev]--; st.stats.flips[k]++; }
    st.own[ci] = k; st.count[k]++; st.wet[ci] = G.time;
    return 1;
  },
  // paint every cell of row ty whose [x0, x0 + 10) overlaps [xa, xb)
  paintSpan(ty, xa, xb, k, splat) {
    const st = G.mst;
    if (ty < 0 || ty >= ROWS) return 0;
    const c0 = Math.max(0, Math.floor(xa / PAINT.cell)), c1 = Math.min(COLS * 3 - 1, Math.floor((xb - 0.001) / PAINT.cell));
    let got = 0;
    for (let c = c0; c <= c1; c++) {
      const ci = st.idx[ty * COLS * 3 + c];
      if (ci < 0) continue;
      const r = this.paintCell(ci, k, splat);
      if (r > 0) got++; else if (r < 0) st.blk = true;
    }
    return got;
  },
  splash(cx, ty, half, k, rows) {
    let got = 0;
    for (let d = -rows; d <= rows; d++) got += this.paintSpan(ty + d, cx - half, cx + half, k, true);
    return got;
  },
  // ----- the splat -----
  hop(p) {
    const st = G.mst, k = p.id;
    p.vy = -st.K.hopV; p.grounded = false; p.jumping = false; p.offT = 0.05;
    st.dive[k] = 1; st.peak[k] = p.y;
    p.sx = 0.85; p.sy = 1.18;
    Sfx.play('paintHop', k);
    puff(p.x + p.w / 2, p.y + p.h, 4, 'rgba(255,255,255,0.8)');
  },
  startDive(p) {
    const st = G.mst, k = p.id;
    st.dive[k] = 2; st.diveT[k] = 0; p.vx *= st.K.diveVx; p.vy = 0; p.jumping = false;
    st.diveFrom[k] = p.dropT > 0 ? Math.floor((p.y + p.h) / T) * T : -1; // dropping through a plank: catch on the next one
    p.sx = 0.75; p.sy = 1.3;
    Sfx.play('paintDive', k);
  },
  pre(dt) {
    const st = G.mst, K = st.K;
    if (!st.own) return;
    for (const p of G.players) {
      const k = p.id;
      st.cool[k] = Math.max(0, st.cool[k] - dt);
      // act is a tap: a fresh press starts a splat (consumed every tick, never buffered)
      if (p.pendingAct) {
        p.pendingAct = false;
        if (p.alive && p.stun <= 0 && st.cool[k] <= 0 && st.dive[k] === 0) {
          st.pressed[k] = true;
          const b = st.bub[k];
          if (b && b.kind === 'splat') b.life = Math.min(b.life, G.time - b.t0 + 0.25);
          if (p.grounded) this.hop(p); else this.startDive(p);
        }
      }
      if (!p.alive || p.stun > 0) { st.dive[k] = 0; continue; }
      if (st.dive[k] === 1 && p.vy >= K.hopTop) this.startDive(p);
      if (st.dive[k] === 2) {
        if (p.vy < -1) { st.dive[k] = 0; st.cool[k] = K.bonkCool; continue; } // bounced off a protected head: the dive is over
        if (p.dropT > 0 && st.diveFrom[k] >= 0 && p.y + p.h > st.diveFrom[k] + 1) p.dropT = 0;
        st.diveT[k] += dt;
        p.vy = st.diveT[k] < K.diveHang ? -PHYS.g * dt : K.diveV; // control() adds gravity: a short hang, then straight down
      }
    }
  },
  land(p) {
    const st = G.mst, K = st.K, k = p.id, ty = paintRow(p);
    const h = p.y - st.peak[k], big = h >= K.hBig ? 2 : h >= K.hMed ? 1 : 0;
    const half = p.w / 2 + [K.rSmall, K.rMed, K.rBig][big] + (st.cb[k] ? K.cbSplash : 0), cx = p.x + p.w / 2;
    this.splash(cx, ty, half, k, K.rowTol + (st.cb[k] ? K.cbRows : 0));
    st.dive[k] = 0; st.cool[k] = K.cool;
    st.stats.splats[k]++; if (big === 2) st.stats.bigSplats[k]++;
    const top = ty * T;
    st.fx.push({ x: cx, y: top, half, k, t0: G.time });
    if (big) st.fx.push({ x: cx, y: top, half: half * 1.15, k, t0: G.time + 0.08 });
    p.sx = 1.4; p.sy = 0.6;
    Sfx.play(big === 2 ? 'paintSplatBig' : 'paintSplat', k);
    rumble(k, [0.15, 0.25, 0.45][big], [0.35, 0.45, 0.6][big], [80, 110, 150][big]);
    burst(cx, top, PCOL[k], [6, 9, 12][big]);
    if (big === 2 && !reduceMotion) G.shake = Math.max(G.shake, 0.08);
    // the other player inside the splash gets shoved out of it
    const o = other(p), dx = o.x + o.w / 2 - cx;
    if (o.alive && o.stun <= 0 && G.time >= st.safeT[o.id] && Math.abs(dx) <= half + o.w / 2 && Math.abs(o.y + o.h - (p.y + p.h)) <= K.shoveDy) {
      const s = [0.75, 1, 1.25][big], dir = dx > 0 ? 1 : dx < 0 ? -1 : p.face;
      knock(o, dir * K.shoveV * s, K.shoveVy * s, K.shoveStun, K.shoveSlide);
      st.safeT[o.id] = G.time + K.shoveSafe; st.dive[o.id] = 0;
      Sfx.play('paintShove', k);
      rumble(o.id, 0.5, 0.3, 120);
      puff(o.x + o.w / 2, o.y + o.h, 5, 'rgba(255,255,255,0.85)');
    }
  },
  // the engine's stomp landed: a diving stomp is a head-splat
  onStomp(p, o) {
    const st = G.mst, K = st.K;
    if (!st.own || st.dive[p.id] !== 2) return;
    o.stun = Math.max(o.stun, K.splatStun);
    const ty = paintRow(o), cx = o.x + o.w / 2, half = o.w / 2 + K.splatR;
    this.splash(cx, ty, half, p.id, K.rowTol);
    st.stats.headSplats[p.id]++; st.stats.splats[p.id]++;
    st.dive[p.id] = 0; st.cool[p.id] = K.cool; st.dive[o.id] = 0;
    st.blob[o.id] = { k: p.id, t0: G.time, life: K.splatStun };
    st.fx.push({ x: cx, y: ty * T, half, k: p.id, t0: G.time });
    st.pops.push({ txt: 'SPLAT!', x: cx, y: o.y - 8, t0: G.time, life: 0.8, size: 20, col: PCOL[p.id], rise: 26 });
    Sfx.play('paintHeadSplat', p.id);
    rumble(o.id, 0.9, 0.5, 220);
    burst(cx, o.y + 4, PCOL[p.id], 14);
  },
  // ----- the golden bucket -----
  dropBucket() {
    const st = G.mst, ps = G.players;
    st.bucketDone = true;
    if (!st.spots.length) return;
    const c = st.count, behind = c[0] < c[1] ? 0 : c[1] < c[0] ? 1 : -1;
    let spot = st.spots[3] || st.spots[0]; // even paint: the stage centre
    if (behind >= 0) {
      const lead = ps[1 - behind], tr = ps[behind];
      const d = (p, s) => Math.hypot(p.x + p.w / 2 - s.x, p.y + p.h - s.y);
      let best = -Infinity;
      for (const s of st.spots) { const v = d(lead, s) - d(tr, s); if (v > best) { best = v; spot = s; } }
    }
    st.bucket = { x: spot.x, y: spot.y, t: 0, t0: G.time };
    Sfx.play('paintBucket');
  },
  grabBucket(p, b) {
    const st = G.mst, K = st.K, k = p.id;
    this.splash(b.x, Math.floor(b.y / T), K.megaR, k, K.megaRows);
    st.stats.buckets[k]++; st.bucketGot = k; st.bucket = null;
    for (let i = 0; i < 3; i++) st.fx.push({ x: b.x, y: b.y, half: K.megaR * (0.7 + 0.25 * i), k, t0: G.time + i * 0.09, gold: true });
    st.fx.push({ kind: 'tip', x: b.x, y: b.y, k, t0: G.time });
    st.pops.push({ txt: 'MEGA SPLASH!', x: b.x, y: b.y - 40, t0: G.time, life: 1.1, size: 22, col: C.gold, rise: 30 });
    Sfx.play('paintMega', k);
    rumble(k, 0.6, 0.8, 300);
    burst(b.x, b.y - 13, PCOL[k], 24);
    for (let i = 0; i < 12; i++) { const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 160; G.particles.push({ x: b.x, y: b.y - 16, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, life: 0.8, max: 0.8, col: C.gold, size: 3 + Math.random() * 2, grav: 300, kind: 'conf', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12 }); }
    if (!reduceMotion) G.shake = Math.max(G.shake, 0.15);
  },
  tink(p) {
    const st = G.mst, k = p.id;
    if (st.tinkT[k] > 0) return;
    st.tinkT[k] = st.K.tinkGap;
    Sfx.play('paintTink', k);
    puff(p.x + p.w / 2 - p.face * 6, p.y + p.h, 2, 'rgba(255,255,255,0.9)');
    if (!st.hintTink[k] && paintTips(k)) { st.hintTink[k] = true; st.bub[k] = { txt: 'Shiny paint: SPLAT it!', t0: G.time, life: 1.6, kind: 'tink' }; }
  },
  actHint(k) {
    const how = actKey(k);
    return how === 'pad' ? 'Press ' + glyph('act') + ' to SPLAT!' : how === 'touch' ? 'Tap the splat button!' : 'Press ' + (k === 0 ? 'F' : '/') + ' to SPLAT!';
  },
  step(dt) {
    const st = G.mst, K = st.K, N = st.n, ps = G.players, m = G.match;
    if (!st.own) return;
    const ord = paintOrder();
    // 1. comeback (Super Paint) for whoever is behind: on after 0.5 s at >= 6 % behind, off under 3 %
    for (const p of ps) {
      const k = p.id, def = (st.count[1 - k] - st.count[k]) / N;
      st.cbArm[k] = def >= K.cbOn ? st.cbArm[k] + dt : 0;
      const on = st.cb[k] ? def >= K.cbOff : def >= K.cbOn && st.cbArm[k] >= K.cbArm;
      if (on && !st.cb[k]) {
        st.stats.comebacks[k]++;
        // the chime, buzz and gold pop: once a round (later switch-ons only glow and sparkle)
        if (!st.cbShown[k]) {
          st.cbShown[k] = true; Sfx.play('paintSuper', k); rumble(k, 0.1, 0.4, 120);
          st.pops.push({ txt: 'SUPER PAINT!', k, dy: -34, t0: G.time, life: 0.9, size: 18, col: C.gold, rise: 30 });
          // never splatted yet? Super Paint only comes from splats, so show how right now (uses one of the 2 hints)
          if (m && !st.pressed[k] && st.hintSplat[k] < K.hints && !st.bub[k] && p.alive && paintTips(k)) {
            st.hintSplat[k]++; st.hintRd[k] = m.round;
            st.bub[k] = { txt: this.actHint(k), t0: G.time, life: 2.6, kind: 'splat' };
          }
        }
      }
      st.cb[k] = on;
    }
    // 2. Speedy Paint: 30 % faster on your own colour
    if (K.ownSpeed > 0) for (const p of ord) if (p.alive && p.tileGround && p.stun <= 0) {
      const ci = st.idx[paintRow(p) * COLS * 3 + Math.floor((p.x + p.w / 2) / K.cell)];
      if (ci >= 0 && st.own[ci] === p.id) {
        moveX(p, p.vx * dt * K.ownSpeed);
        // a little speed trail behind the feet while the fast lane carries you
        if (Math.abs(p.vx) > 150 && (st.trailT[p.id] -= dt) <= 0) {
          st.trailT[p.id] = 0.07;
          G.particles.push({ x: p.x + p.w / 2 - Math.sign(p.vx) * 12, y: p.y + p.h - 4 - Math.random() * 8, vx: -Math.sign(p.vx) * (60 + Math.random() * 40), vy: -10, life: 0.22, max: 0.22, col: 'rgba(255,255,255,0.75)', size: 2.5, grav: 0, kind: 'dot' });
        }
      }
    }
    // 3. landings (splash + shove)
    for (const p of ord) {
      const k = p.id;
      if (!p.alive) continue;
      if (!p.grounded) { st.peak[k] = Math.min(st.peak[k], p.y); continue; }
      if (st.dive[k] === 2 && p.tileGround) this.land(p);
      st.peak[k] = p.y;
    }
    // 4. feet paint
    for (const p of ord) if (p.alive && p.tileGround) {
      st.blk = false;
      this.paintSpan(paintRow(p), p.x + K.feetInset, p.x + p.w - K.feetInset, p.id, false);
      if (st.blk && Math.abs(p.vx) > 30) this.tink(p);
    }
    // 5. who leads (decides an exact tie)
    if (st.count[0] !== st.count[1]) {
      const ld = st.count[0] > st.count[1] ? 0 : 1;
      st.lead[ld] += dt;
      if (ld !== st.lastLead) { st.lastLead = ld; st.leadT = G.time; }
    }
    // 6. the golden bucket
    if (!st.bucketDone && m && m.roundTime > 0 && m.timeLeft <= K.bucketAt) this.dropBucket();
    const b = st.bucket;
    if (b) {
      b.t += dt;
      if (b.t >= K.bucketFall) for (const p of ord) if (p.alive && rectHit(p, b.x - 13, b.y - 26, 26, 26)) { this.grabBucket(p, b); break; }
    }
    // timers, sparkles, hints
    for (const p of ps) {
      const k = p.id;
      st.tinkT[k] -= dt;
      if (st.cb[k] && p.alive) {
        st.sparkT[k] -= dt;
        if (st.sparkT[k] <= 0) {
          st.sparkT[k] = 0.12;
          G.particles.push({ x: p.x + 3 + Math.random() * (p.w - 6), y: p.y + p.h - 2, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 50, life: 0.4, max: 0.4, col: C.gold, size: 2 + Math.random(), grav: 40, kind: 'dot' });
        }
      }
      // never splatted yet, 8 s into a round: show how (at most once a round, twice a match)
      if (m && !st.pressed[k] && st.hintSplat[k] < K.hints && st.hintRd[k] !== m.round && m.roundT >= K.hintAt && !st.bub[k] && p.alive && paintTips(k)) {
        st.hintSplat[k]++; st.hintRd[k] = m.round;
        st.bub[k] = { txt: this.actHint(k), t0: G.time, life: 2.6, kind: 'splat' };
      }
    }
    this.prune();
  },
  idle() {
    const st = G.mst;
    if (!st.own) return;
    for (const p of G.players) if (p.grounded) st.dive[p.id] = 0; // the bell rang mid-dive: no dive left over in the banner
    this.prune();
  },
  prune() {
    const st = G.mst, now = G.time;
    if (st.fx.length) st.fx = st.fx.filter(f => now - f.t0 < 0.45);
    if (st.pops.length) st.pops = st.pops.filter(q => now - q.t0 < q.life);
    for (let k = 0; k < 2; k++) {
      if (st.bub[k] && now - st.bub[k].t0 >= st.bub[k].life) st.bub[k] = null;
      if (st.blob[k] && now - st.blob[k].t0 >= st.blob[k].life) st.blob[k] = null;
    }
  },
  timeUp() {
    const st = G.mst, c = st.count, N = st.n;
    for (let k = 0; k < 2; k++) st.stats.best[k] = Math.max(st.stats.best[k], c[k] / N);
    if (c[0] === c[1]) {
      if (Math.abs(st.lead[0] - st.lead[1]) >= 1) {
        const w = st.lead[0] > st.lead[1] ? 0 : 1;
        return { winner: w, reason: 'Dead even! ' + NAMES[w] + ' led for longer!' };
      }
      return { winner: -1, reason: 'Exactly the same paint!' };
    }
    const w = c[0] > c[1] ? 0 : 1, margin = c[w] - c[1 - w];
    if (margin <= 2) return { winner: w, reason: 'By a drip! ' + paintPct(c[w], N, true) + '% to ' + paintPct(c[1 - w], N, true) + '%!' };
    if (margin >= Math.ceil(0.25 * N)) return { winner: w, reason: 'Landslide! ' + paintPct(c[w], N) + '% of the floor!' };
    return { winner: w, reason: 'Painted ' + paintPct(c[w], N) + '% of the floor!' };
  },
  tiebreak() {
    const l = G.mst.lead;
    if (l[0] !== l[1]) return { winner: l[0] > l[1] ? 0 : 1, reason: 'Led for longer!' };
    return -1;
  },
  stats() {
    const s = G.mst.stats, out = [
      { label: 'Best round %', values: s.best.map(v => Math.round(100 * v)) },  // (no '%' on the values: '47% – 54%' wraps in a tile)
      { label: 'Splats', values: s.splats.slice() },
    ];
    if (s.headSplats[0] || s.headSplats[1]) out.push({ label: 'Head splats', values: s.headSplats.slice() });
    if (s.buckets[0] || s.buckets[1]) out.push({ label: 'Golden buckets', values: s.buckets.slice() });
    if (s.bigSplats[0] || s.bigSplats[1]) out.push('Big splats: ' + NAMES[0] + ' ' + s.bigSplats[0] + ' · ' + NAMES[1] + ' ' + s.bigSplats[1]);
    return out;
  },
  // ----- drawing -----
  draw() {
    const st = G.mst;
    if (!st.own) return;
    const now = G.time, live = G.match && (G.match.phase === 'live' || G.match.phase === 'end');
    // Super Paint glow behind its player
    for (const p of G.players) if (st.cb[p.id] && p.alive && live) {
      ctx.fillStyle = 'rgba(255,205,80,' + (0.25 + 0.1 * Math.sin(now * 8)).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(p.x + p.w / 2, p.y + p.h / 2 + 1, 21, 22, 0, 0, Math.PI * 2); ctx.fill();
    }
    paintDrawCells(st, now);
    // splash rings
    for (const f of st.fx) {
      const a = now - f.t0;
      if (a < 0) continue;
      if (f.kind === 'tip') { // the bucket tips over and fades
        const u = clamp(a / 0.35, 0, 1);
        ctx.save(); ctx.globalAlpha = 1 - u; paintDrawBucket(f.x + 6 * u, f.y - 4 - 10 * u, 1, 1.1 * u); ctx.restore();
        continue;
      }
      if (a > 0.25) continue;
      const u = a / 0.25, r = f.half * (0.4 + 0.6 * u);
      ctx.globalAlpha = 1 - u;
      if (f.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(f.x, f.y, r, 7, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.strokeStyle = PCOL[f.k]; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(f.x, f.y, r, 6, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // the golden bucket: falling (a growing shadow), then resting on its spot
    const b = st.bucket;
    if (b) {
      const K = st.K, u = clamp(b.t / K.bucketFall, 0, 1);
      ctx.fillStyle = 'rgba(28,26,54,' + (0.15 + 0.15 * u).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(b.x, b.y + 1, 2 + 9 * u, 2 + u, 0, 0, Math.PI * 2); ctx.fill();
      if (u < 1) {
        const y = b.y - 26 - (1 - u * u) * (b.y - 46);
        paintDrawBucket(b.x, y, 1, 0);
      } else {
        const pulse = Math.sin(now * 5);
        ctx.fillStyle = 'rgba(255,215,90,0.28)'; circle(b.x, b.y - 14, 21 + 3 * pulse); ctx.fill();
        ctx.strokeStyle = 'rgba(255,230,140,' + (0.45 + 0.3 * pulse).toFixed(3) + ')'; ctx.lineWidth = 2; circle(b.x, b.y - 14, 25 + 3 * pulse); ctx.stroke();
        paintDrawBucket(b.x, b.y - 26 + 2 * pulse - 2, 1, 0);
      }
    }
  },
  drawTop() {
    const st = G.mst;
    if (!st.own) return;
    const now = G.time, live = G.match && G.match.phase === 'live';
    for (const p of G.players) {
      if (!p.alive) continue;
      const k = p.id, cx = p.x + p.w / 2;
      // head-splatted: blobs of the other colour on the body
      const bl = st.blob[k];
      if (bl) {
        const w = p.w * p.sx, h = p.h * p.sy, by = p.y + p.h, top = by - h;
        ctx.globalAlpha = clamp((bl.life - (now - bl.t0)) / 0.2, 0, 1);
        ctx.fillStyle = PCOL[bl.k]; ctx.strokeStyle = PDARK[bl.k]; ctx.lineWidth = 1.5;
        for (const [bx, byy, r] of [[cx + 2, top + 3, 5], [cx - w * 0.36, top + h * 0.55, 3.6], [cx + w * 0.3, top + h * 0.8, 3.2]]) { circle(bx, byy, r); ctx.fill(); ctx.stroke(); }
        rr(cx + 0.5, top + 4, 3, 8, 1.5); ctx.fill();
        ctx.globalAlpha = 1;
      }
      // diving: speed streaks above the head (live play only, in the air)
      if (live && !p.grounded && st.dive[k] === 2 && st.diveT[k] >= st.K.diveHang) {
        ctx.strokeStyle = PCOL[k]; ctx.globalAlpha = 0.6; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        for (const dx of [-6, 0, 6]) { const len = dx ? 10 : 16; ctx.beginPath(); ctx.moveTo(cx + dx, p.y - 6 - len); ctx.lineTo(cx + dx, p.y - 5); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      // splat recharging: a paint drop over the head that fills up
      if (live && st.cool[k] > 0 && !st.bub[k]) paintDrawDrop(cx, p.y - 19, 1 - st.cool[k] / st.K.cool, PCOL[k]);
    }
  },
  hud() {
    const st = G.mst, m = G.match;
    if (!st.own || !m) return;
    const big = hudBig(), now = G.time, card = PAINT_CARDS[st.twist] || PAINT_CARDS.classic;
    // twist pill under the level pill (twist rounds only)
    if (st.twist !== 'classic') {
      const fs = big ? 18 : 13, ph = big ? 34 : 26;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      pill(14, 46, ctx.measureText(card.name).width + 28, ph);
      text(card.name, 28, 46 + ph / 2 + 0.5, fs, C.gold, 'left', 'body');
    }
    // top right: the golden bucket alert
    if (st.bucket && (m.phase === 'live' || m.phase === 'end')) {
      const s = 'Golden bucket!', fs = big ? 19 : 14, ph = big ? 36 : 28, a = now - st.bucket.t0;
      const flash = a < 1 && Math.floor(a * 8) % 2 === 0;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const sw = ctx.measureText(s).width + 28 + ph * 0.75, px = pill(W - 14, 12, sw, ph, 'right');
      if (flash) { ctx.fillStyle = 'rgba(255,197,61,0.35)'; rr(px, 12, sw, ph, ph / 2); ctx.fill(); }
      paintDrawBucket(px + 6 + ph * 0.4, 12 + ph * 0.2, ph / 46, 0);
      text(s, W - 28, 12 + ph / 2 + 0.5, fs, flash ? '#ffffff' : C.gold, 'right', 'body');
    }
    paintDrawBar(st, big, now);
    // the twist card under "Round N" / the 3-2-1 (every round)
    if (m.phase === 'ready' || m.phase === 'count') {
      const fn = big ? 34 : 26, fh = big ? 19 : 14, ph = big ? 78 : 60;
      ctx.font = '700 ' + fh + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w = Math.min(W - 40, Math.max(300, ctx.measureText(card.hint).width + 48));
      ctx.save(); ctx.globalAlpha = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1;
      ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(W / 2 - w / 2, 284, w, ph, 16); ctx.fill();
      text(card.name, W / 2, 284 + ph * 0.35, fn, C.gold, 'center');
      text(card.hint, W / 2, 284 + ph * 0.77, fh, C.paper, 'center', 'body');
      ctx.restore();
    }
    // C4: nothing over the framework's match pill and clock (top centre). A hint bubble or a player's pop that would
    // reach them (a player on the summit, or jumping over it) goes under the feet; other pops are held just below them.
    const S = big ? 1.4 : 1, bubs = [null, null];
    ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
    for (const p of G.players) {
      const bb = st.bub[p.id];
      if (!bb || !p.alive || m.phase !== 'live') continue;
      const w = ctx.measureText(bb.txt).width + 22, cx = p.x + p.w / 2, x = clamp(cx, S * w / 2 + 6, W - S * w / 2 - 6);
      bubs[p.id] = { bb, w, cx, x, under: paintInTop(cx + S * (x - w / 2 - cx), cx + S * (x + w / 2 - cx), p.y - 20 - 30 * S, big) };
    }
    // pops: SUPER PAINT!, SPLAT!, MEGA SPLASH!
    for (const q of st.pops) {
      const a = now - q.t0, u = clamp(a / q.life, 0, 1);
      const sc = (a < 0.12 ? 0.5 + 0.5 * (a / 0.12) * 1.2 : 1 + 0.1 * Math.max(0, 1 - (a - 0.12) / 0.1)) * (big ? 1.3 : 1);
      ctx.font = q.size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
      const hH = 0.6 * q.size * sc, hw = 0.5 * sc * ctx.measureText(q.txt).width;
      let x = q.x, y = q.y - q.rise * u;
      if (q.k != null) {
        const p = G.players[q.k], bu = bubs[q.k], lift = bu && !bu.under ? 30 * S + 2 : 0;
        x = clamp(p.x + p.w / 2, 70, W - 70);
        // which side is decided once, on its first frame, from where it would end up (so it never jumps mid-pop)
        if (q.under == null) q.under = paintInTop(x - hw * 1.1, x + hw * 1.1, p.y + q.dy - lift - q.rise - hH * 1.1, big);
        y = q.under ? p.y + p.h + 12 + hH + (bu && bu.under ? 30 * S + 6 : 0) + 0.3 * q.rise * u : p.y + q.dy - lift - q.rise * u;
      }
      x = clamp(x, 70, W - 70);
      if (paintInTop(x - hw, x + hw, y - hH, big)) y = PAINT_TOP[big ? 1 : 0].y + hH;
      ctx.save(); ctx.globalAlpha = clamp((q.life - a) / 0.25, 0, 1);
      bigText(q.txt, x, y, q.size, q.col, sc);
      ctx.restore();
    }
    // hint bubbles over a player (or under the feet, see above)
    for (const p of G.players) {
      const B = bubs[p.id];
      if (!B) continue;
      const { bb, w, cx, x, under } = B, a = now - bb.t0, ay = under ? p.y + p.h + 10 : p.y - 20; // ay = the tail's tip
      ctx.save(); ctx.globalAlpha = clamp(Math.min(a / 0.15, (bb.life - a) / 0.25), 0, 1);
      ctx.translate(cx, ay); ctx.scale(S, S); ctx.translate(-cx, -ay);
      const y = under ? ay + 6 : ay - 30;
      ctx.fillStyle = C.paper; rr(x - w / 2, y, w, 24, 12); ctx.fill();
      ctx.strokeStyle = 'rgba(28,26,54,0.55)'; ctx.lineWidth = 1.5; rr(x - w / 2, y, w, 24, 12); ctx.stroke();
      ctx.fillStyle = C.paper; ctx.beginPath();
      if (under) { ctx.moveTo(cx - 5, y + 1); ctx.lineTo(cx + 5, y + 1); } else { ctx.moveTo(cx - 5, y + 23); ctx.lineTo(cx + 5, y + 23); }
      ctx.lineTo(cx, ay); ctx.closePath(); ctx.fill();
      text(bb.txt, x, y + 12.5, 13, C.ink, 'center', 'body');
      ctx.restore();
    }
  },
};

/* ----- Paint the Floor drawing helpers ----- */
// the framework's top-centre zone (match pill + clock), desktop / phone (hudBig): x within W/2 +- x, y above y
const PAINT_TOP = [{ x: 178, y: 76 }, { x: 152, y: 94 }];
function paintInTop(xl, xr, yt, big) { const z = PAINT_TOP[big ? 1 : 0]; return yt < z.y && xr > W / 2 - z.x && xl < W / 2 + z.x; }
// the paint. Runs of same-owner, same-kind cells on one surface are found first; then every layer is ONE path per
// colour (a few fills a frame however patchy the floor is), and the Super Paint stripes are a repeating pattern
const paintRuns = [], paintExt = { c: null, w: 0, h: 0 };
function paintDrawCells(st, now) {
  const cells = st.cells, own = st.own, thick = st.thick, N = st.n, runs = paintRuns, CW = PAINT.cell;
  runs.length = 0;
  let i = 0, sup = 0;
  while (i < N) {
    const o = own[i];
    if (o < 0) { i++; continue; }
    const th = thick[i], ty = cells[i].ty;
    let j = i + 1;
    while (j < N && own[j] === o && thick[j] === th && cells[j].ty === ty && cells[j].x0 === cells[j - 1].x0 + CW) j++;
    runs.push(i, j); sup += th;
    i = j;
  }
  const R = runs.length;
  // normal paint: a dark under-stripe, the colour (+ drips on stone) and a faint gloss line
  for (let o = 0; o < 2; o++) {
    ctx.fillStyle = PDARK[o]; ctx.beginPath();
    for (let r = 0; r < R; r += 2) {
      const a = runs[r]; if (own[a] !== o || thick[a]) continue;
      const c = cells[a], w = cells[runs[r + 1] - 1].x0 + CW - c.x0;
      if (c.plank) ctx.rect(c.x0, c.top + 4, w, 3); else ctx.rect(c.x0, c.top, w, 10); // (stone: covers the cream strip and its bumps)
    }
    ctx.fill();
    ctx.fillStyle = PCOL[o]; ctx.beginPath();
    for (let r = 0; r < R; r += 2) {
      const a = runs[r]; if (own[a] !== o || thick[a]) continue;
      const c = cells[a], e = runs[r + 1], w = cells[e - 1].x0 + CW - c.x0;
      ctx.rect(c.x0, c.top, w, c.plank ? 5 : 7);
      if (!c.plank) for (let q = a; q < e; q++) { const d = cells[q]; if (d.drip) paintDripP(d.x0 + 3, c.top + 7, 4, d.drip + 2); }
    }
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath();
  for (let r = 0; r < R; r += 2) { const a = runs[r]; if (thick[a]) continue; const c = cells[a]; ctx.rect(c.x0, c.top + 1, cells[runs[r + 1] - 1].x0 + CW - c.x0, 1.5); }
  ctx.fill();
  // Super Paint: a raised, outlined slab with a gloss line, white stripes and sparkles, so it reads without colour.
  // Only the rim has cut corners; everything inside it is plain rectangles (cheap to fill, also on phones)
  if (sup) {
    const ext = r => { const a = runs[r], c = cells[a]; paintExt.c = c; paintExt.w = cells[runs[r + 1] - 1].x0 + CW - c.x0; paintExt.h = c.plank ? 10 : 13; return paintExt; };
    for (let o = 0; o < 2; o++) {
      let any = false;
      ctx.beginPath();
      for (let r = 0; r < R; r += 2) if (thick[runs[r]] && own[runs[r]] === o) { const e = ext(r); paintRRp(e.c.x0, e.c.top - 3, e.w, e.h, 3); any = true; }
      if (!any) continue;
      ctx.fillStyle = PDARK[o]; ctx.fill();
      ctx.fillStyle = 'rgba(28,26,54,0.6)'; ctx.fill();   // the ink rim (the same path, filled again)
      ctx.fillStyle = PDARK[o]; ctx.beginPath();
      for (let r = 0; r < R; r += 2) if (thick[runs[r]] && own[runs[r]] === o) { const e = ext(r); ctx.rect(e.c.x0 + 1.5, e.c.top - 1.5, e.w - 3, e.h - 3); }
      ctx.fill();
      ctx.fillStyle = PCOL[o]; ctx.beginPath();
      for (let r = 0; r < R; r += 2) {
        const a = runs[r]; if (!thick[a] || own[a] !== o) continue;
        const e = ext(r), c = e.c;
        ctx.rect(c.x0 + 1.5, c.top - 1.5, e.w - 3, e.h - 4.5);
        if (!c.plank) for (let q = a; q < runs[r + 1]; q++) { const d = cells[q]; if (d.drip) paintDripP(d.x0 + 3, c.top + 8, 4, d.drip + 2); }
      }
      ctx.fill();
    }
    const pat = paintStripes();
    ctx.fillStyle = pat || 'rgba(255,255,255,0.18)'; ctx.beginPath();
    for (let r = 0; r < R; r += 2) if (thick[runs[r]]) { const e = ext(r); ctx.rect(e.c.x0 + 1.5, e.c.top - 1.5, e.w - 3, e.h - 4.5); }
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath();
    for (let r = 0; r < R; r += 2) if (thick[runs[r]]) { const e = ext(r); ctx.rect(e.c.x0 + 2, e.c.top - 1.5, e.w - 4, 1.5); }
    ctx.fill();
    // sparkles on every third cell, twinkling; alpha in 4 steps so each step is one fill
    for (let s = 1; s <= 4; s++) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.15 * s).toFixed(2) + ')'; ctx.beginPath();
      let any = false;
      for (let r = 0; r < R; r += 2) {
        const a = runs[r]; if (!thick[a]) continue;
        for (let q = a; q < runs[r + 1]; q++) {
          const c = cells[q];
          if ((c.tx * 3 + c.i) % 3 || Math.round(2 + 2 * Math.sin(now * 6 + q)) !== s) continue;
          paintStarP(c.x0 + 5, c.top + 0.5, 2.6); any = true;
        }
      }
      if (any) ctx.fill();
    }
  }
  // fresh paint: a wet shine for 0.25 s
  for (let q = 0; q < N; q++) {
    const a = now - st.wet[q];
    if (a >= 0.25 || a < 0 || own[q] < 0) continue;
    const c = cells[q], f = 1 - a / 0.25, h0 = thick[q] ? -3 : 0;
    ctx.fillStyle = PCOL[own[q]]; ctx.fillRect(c.x0, c.top + (c.plank ? 7 : 10), CW, 2 * f);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.3 * f).toFixed(3) + ')'; ctx.fillRect(c.x0, c.top + h0 + 1, CW, 3);
  }
}
// a rectangle with cut corners (reads as rounded at this size), ADDED to the current path (rr() starts a new path).
// Straight edges only: hundreds of arcs in one path made the Super Paint layers 5x slower to draw
function paintRRp(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.lineTo(x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.lineTo(x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.lineTo(x, y + h - r); ctx.lineTo(x, y + r); ctx.closePath();
}
// a drip under the paint (square top, round bottom), ADDED to the current path
function paintDripP(x, y, w, h) {
  ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - w / 2); ctx.arc(x + w / 2, y + h - w / 2, w / 2, 0, Math.PI); ctx.closePath();
}
// the Super Paint stripes: white diagonals every 6 px, drawn once into a 6 x 12 tile (at 4x for sharp edges)
let paintStripePat = null;
function paintStripes() {
  if (paintStripePat !== null) return paintStripePat;
  paintStripePat = false;
  try {
    const R = typeof DOMMatrix !== 'undefined' && window.CanvasPattern && CanvasPattern.prototype.setTransform ? 4 : 1;
    const c = document.createElement('canvas'); c.width = 6 * R; c.height = 12 * R;
    const g = c.getContext('2d'); g.scale(R, R);
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 2; g.beginPath();
    for (let ox = -12; ox <= 12; ox += 6) { g.moveTo(ox - 6, 24); g.lineTo(ox + 12, -12); }
    g.stroke();
    const pat = ctx.createPattern(c, 'repeat');
    if (pat && R > 1) pat.setTransform(new DOMMatrix([1 / R, 0, 0, 1 / R, 0, 0]));
    paintStripePat = pat || false;
  } catch (e) { paintStripePat = false; }
  return paintStripePat;
}
// a 4-point sparkle (paintStarP adds it to the current path)
function paintStar(x, y, r) { ctx.beginPath(); paintStarP(x, y, r); }
function paintStarP(x, y, r) {
  ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.closePath();
}
// a gold paint bucket; (x, y) = top centre of the body, s = scale, tip = rotation (rad)
function paintDrawBucket(x, y, s, tip) {
  ctx.save(); ctx.translate(x, y + 12 * s); ctx.scale(s, s); ctx.rotate(tip);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = C.goldDark; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, -11, 10, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); // handle
  ctx.fillStyle = C.gold;
  ctx.beginPath(); ctx.moveTo(-11, -10); ctx.lineTo(11, -10); ctx.lineTo(9, 12); ctx.lineTo(-9, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(185,133,15,0.55)'; ctx.fillRect(-10, 1, 20, 2.5);
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; rr(-8, -6, 4, 14, 2); ctx.fill();
  // the paint inside, a gold-white wave over the lip
  ctx.fillStyle = '#fff4c8';
  ctx.beginPath(); ctx.moveTo(-11, -11); ctx.quadraticCurveTo(-6, -17, -1, -12); ctx.quadraticCurveTo(4, -8, 7, -14); ctx.quadraticCurveTo(10, -15, 11, -11); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDark; rr(-13, -12, 26, 4, 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff'; paintStar(6, -16, 2.6); ctx.fill();
  ctx.restore();
}
// the splat cooldown: a paint drop over the head, filled from the bottom by f (0..1)
function paintDrawDrop(x, y, f, col) {
  const path = () => {
    ctx.beginPath(); ctx.moveTo(x, y - 7);
    ctx.bezierCurveTo(x + 2, y - 4, x + 5, y - 1, x + 5, y + 2); ctx.arc(x, y + 2, 5, 0, Math.PI);
    ctx.bezierCurveTo(x - 5, y - 1, x - 2, y - 4, x, y - 7); ctx.closePath();
  };
  path(); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
  ctx.save(); path(); ctx.clip();
  const t = y + 7 - 14 * clamp(f, 0, 1); ctx.fillStyle = col; ctx.fillRect(x - 6, t, 12, y + 8 - t);
  ctx.restore();
  path(); ctx.strokeStyle = 'rgba(28,26,54,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
}
// the score: a paint bar over the stone floor, bottom centre
function paintDrawBar(st, big, now) {
  const N = st.n, c = st.count;
  const S = big ? { w: 620, h: 42, y: 494, fs: 24, bw: 330, bh: 16 } : { w: 430, h: 30, y: 503, fs: 16, bw: 240, bh: 12 };
  const x0 = pill(W / 2, S.y, S.w, S.h, 'center'), cy = S.y + S.h / 2, bx = W / 2 - S.bw / 2, by = cy - S.bh / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(bx, by, S.bw, S.bh, S.bh / 2); ctx.fill();
  ctx.save(); rr(bx, by, S.bw, S.bh, S.bh / 2); ctx.clip();
  const f0 = S.bw * c[0] / N, f1 = S.bw * c[1] / N;
  ctx.fillStyle = PCOL[0]; ctx.fillRect(bx, by, f0, S.bh);
  ctx.fillStyle = PCOL[1]; ctx.fillRect(bx + S.bw - f1, by, f1, S.bh);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(bx, by + 1, S.bw, S.bh * 0.3);
  ctx.restore();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(W / 2 - 1, by - 3, 2, S.bh + 6);
  const r0 = Math.round(100 * c[0] / N), r1 = Math.round(100 * c[1] / N), dec = r0 === r1 && c[0] !== c[1];
  const lead = c[0] === c[1] ? -1 : c[0] > c[1] ? 0 : 1, pulse = Math.max(0, 1 - (now - st.leadT) / 0.25);
  for (let k = 0; k < 2; k++) {
    const s = k === 0 ? NAMES[0] + ' ' + paintPct(c[0], N, dec) + '%' : paintPct(c[1], N, dec) + '% ' + NAMES[1];
    const tx = k === 0 ? x0 + 16 : x0 + S.w - 16, sc = k === lead ? 1 + 0.25 * pulse : 1;
    ctx.save(); ctx.translate(tx, cy + 0.5); ctx.scale(sc, sc);
    text(s, 0, 0, S.fs, PCOL[k], k === 0 ? 'left' : 'right');
    ctx.restore();
    if (st.cb[k]) { // Super Paint on: a gold sparkle next to the number
      const sx = k === 0 ? bx - (big ? 13 : 9) : bx + S.bw + (big ? 13 : 9);
      ctx.fillStyle = C.gold; paintStar(sx, cy, (big ? 8 : 6) * (0.85 + 0.15 * Math.sin(now * 8))); ctx.fill();
    }
  }
}
Sfx.extra.paintHop = function (p) { this.tone(420 * p, 0.07, 'triangle', 0.04, 620 * p); };
Sfx.extra.paintDive = function (p) { this.tone(700 * p, 0.12, 'sawtooth', 0.02, 260 * p); };
Sfx.extra.paintSplat = function (p) { this.tone(180 * p, 0.12, 'triangle', 0.08, 70); this.tone(900 * p, 0.06, 'square', 0.02, 300, 0.01); };
Sfx.extra.paintSplatBig = function (p) { this.tone(140 * p, 0.22, 'triangle', 0.1, 50); this.tone(700 * p, 0.12, 'sawtooth', 0.025, 160, 0.02); };
Sfx.extra.paintHeadSplat = function (p) { this.tone(500 * p, 0.1, 'square', 0.05, 900 * p); this.tone(160, 0.25, 'triangle', 0.08, 60, 0.05); };
Sfx.extra.paintShove = function (p) { this.tone(260 * p, 0.08, 'square', 0.04, 140 * p); };
Sfx.extra.paintTink = function () { this.tone(1400, 0.03, 'square', 0.015); };
Sfx.extra.paintSuper = function (p) { [660, 880, 1100].forEach((f, i) => this.tone(f * p, 0.08, 'triangle', 0.04, null, i * 0.05)); };
Sfx.extra.paintBucket = function () { this.tone(1200, 1.1, 'sine', 0.025, 500); };
Sfx.extra.paintMega = function (p) { [523, 784, 1047].forEach((f, i) => this.tone(f * p, 0.12, 'triangle', 0.06, null, i * 0.05)); this.tone(120, 0.4, 'triangle', 0.1, 45, 0.12); };

