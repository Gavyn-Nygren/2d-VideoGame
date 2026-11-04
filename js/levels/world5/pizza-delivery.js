/* Pip & Bo - Level 5-2 Pizza Delivery (team). */
'use strict';

/* ===== 5-2 Pizza Delivery (mode 'pizza', World 5 "Road Trip", teamwork) =====================================
   Pip and Bo carry ONE tray with a wobbly stack of pizza boxes down a bumpy street (team/pizza/SPEC.md).
   def.ownStep: the mode runs its own physics: a rigid 90 px tray between the two, a heightfield street
   (tiles n m p x r f - D are parsed and drawn here, the engine ignores them), and a damped-spring "lean" for
   the stack. Walk together, hop together (crates), duck together (awnings), and BOTH hold steady to save a
   teetering box. Fewer boxes than the order = the room restarts with a smaller order.
   Everything lives in this block: only MODES.pizza and Sfx.extra.pz* are visible outside it. */
{
  const PZ = {
    span: 90,                                   // tray: centre-to-centre distance between the holders (rigid)
    walk: 150, duckWalk: 90, push: 0,           // pair target speeds (px/s); push = speed when only one walks
    acc: 320, dec: 420, accAir: 300, decSteady: 1100,
    stepUp: 12, snapDown: 9,                    // walk up steps <= 12 px, stick to ground dropping <= 9 px
    airUp: 2.5,                                 // (build) in the air you can still drift up a bump's slope (<= 1.3 px a tick) instead of bonking
    hop: 490, soloHop: 322, teamWin: 0.2, windMax: 0.6, jumpBuf: 0.12,
    handUp: 10, trayTh: 6, duck: 16, duckRate: 10, readyDip: 4, duckHold: 0.6,
    boxH: 10, boxW: 40, leanPx: 9,
    K: 64, D: 4, Ksteady: 40, Dsteady: 14, steadyMaxV: 30,
    hf0: 0.55, hf1: 0.09,                       // height factor hf(n) = hf0 + hf1*n
    cAcc: 12, cTilt: 110, cPush: 38, cTug: 26, strainRise: 1.2, strainFall: 0.3,
    jBump: 5.5, jCobble: 2.4, jSplash: 6, jLand: 2.5, jLandTeam: 1.5, jSolo: 5, jBonk: 7, jAwning: 4,
    teeter: 0.8, steadySave: 0.15, grace: 0.35, settleMul: 0.3, fallMul: 0.5, awningGrace: 0.6,
    bumpH: 10, cobbleH: 3, puddleD: 8,
    deliverR: 45, deliverV: 40, deliverHold: 0.3,
    // (rev2) the gust cycle starts when the pair first comes within trig px of the zone (not by room time, so it
    // can't blow during the room card); calm*: after calmAfter retries in a room the wind gets weaker each retry
    wind: { first: 0, trig: 60, period: 3.6, warn: 1.0, gust: 1.1, rampIn: 0.15, rampOut: 0.25, force: 90,
      calmAfter: 3, calmMul: 0.8, calmMin: 0.5 },
    failT: 1.4, reliefMax: 2, reliefLate: 3, reliefLateAt: 4,   // relief: need -1 per retry up to 2, up to 3 after 4 retries
    afkSave: 3,                                 // (rev2) a partner idle this long (no keys) counts as steadying for the save
    carryWin: 0.3,                              // (lead review) hop carry for one-finger touch play
    g: 2000, maxFall: 900, afkT: 8,
  };
  const PZ_NOIN = Object.freeze({ left: false, right: false, jump: false, down: false, act: false });
  const PZ_FACADES = ['#f2c9b6', '#cfe3c8', '#f4e2ad', '#cbd7ec', '#ebcadf', '#ddd0bd', '#c3e2dc', '#f0d3c0'];
  const PZ_ROOFS = ['#b8664e', '#8f6f9e', '#5f8a8b', '#a5694f'];
  const pzHf = n => PZ.hf0 + PZ.hf1 * n;
  const pzRand = () => MODES.pizza.rand();
  const pzSum = a => a.reduce((s, v) => s + (v || 0), 0);
  // particles only while the frame loop can age them (bots step thousands of ticks without frames)
  const pzPuff = (x, y, n, col) => { if (G.particles.length < 500) puff(x, y, n, col); };
  const pzBurst = (x, y, col, n) => { if (G.particles.length < 500) burst(x, y, col, n); };
  const pzRumble = (s, w, ms, id) => { if (id === undefined) { rumble(0, s, w, ms); rumble(1, s, w, ms); } else rumble(id, s, w, ms); };
  const pzShake = v => { if (!reduceMotion) G.shake = Math.max(G.shake, v); };
  // 1-player mode: the computer's holder gets no key hints (it says what it needs in its own bubbles)
  const pzCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);

  // the player's real keys, for hint bubbles (like golfKeys)
  function pzKey(id, what) {
    const touch = document.documentElement.classList.contains('has-touch') && Pads.kind === 'touch';
    const pad = Pads.kind === 'pad' && padFor(padSlots(), id);
    if (what === 'hop') return pad ? glyph('a') : touch ? '▲' : id === 0 ? 'W' : '↑';
    if (what === 'duck') return pad ? 'stick ↓' : touch ? '▼' : id === 0 ? 'S' : '↓';
    if (what === 'steady') return pad ? glyph('act') : touch ? 'steady' : id === 0 ? 'F' : '/';
    if (what === 'right') return pad ? 'stick →' : touch ? '▶' : id === 0 ? 'D' : '→';
    if (what === 'left') return pad ? 'stick ←' : touch ? '◀' : id === 0 ? 'A' : '←';
    return pad ? 'stick' : touch ? '◀ ▶' : id === 0 ? 'A D' : '← →';
  }

  /* ---------- the room: a heightfield (ground[x]) and ceilings (awnings) for the stack ---------- */
  function pzParseRoom(def) {
    const map = def.map;
    const R = { ground: new Float32Array(W), ceil: new Float32Array(W).fill(-1e9), bumps: [], crests: [], cobbles: [],
      puddles: [], crates: [], awnings: [], raised: [], spawns: [], door: null, wind: null, roadY: 450 };
    const at = (ty, tx) => (map[ty] && map[ty][tx]) || '.';
    const runOf = (ty, tx, ch) => { let a = tx, b = tx; while (a > 0 && at(ty, a - 1) === ch) a--; while (b < COLS - 1 && at(ty, b + 1) === ch) b++; return [a, b]; };
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
      const ch = at(ty, tx);
      if (ch === '1' || ch === '2') R.spawns[ch === '1' ? 0 : 1] = { tx, ty };
      else if (ch === 'D') R.door = { x: tx * T, y: (ty - 1) * T, w: 2 * T, h: 2 * T, cx: tx * T + T, tx, ty };
      else if (ch === 'n') R.bumps.push({ cx: tx * T + T / 2, x0: tx * T, ty });
      else if (ch === 'm') { R.cobbles.push({ tx, ty }); for (let k = 0; k < 3; k++) R.crests.push(tx * T + 5 + 10 * k); }
      else if (ch === 'p') R.puddles.push({ x0: tx * T, x1: tx * T + T, ty });
      else if (ch === 'x') R.crates.push({ x0: tx * T, x1: tx * T + T, top: ty * T, tx, ty });
      else if (ch === '-') { const [a, b] = runOf(ty, tx, '-'); if (a === tx) R.awnings.push({ x0: a * T, x1: (b + 1) * T, y0: ty * T, bottom: (ty + 1) * T }); }
      if ('rfm'.includes(ch) && at(ty + 1, tx) === '#' && (tx === 0 || !'rfm'.includes(at(ty, tx - 1)))) {
        let b = tx; while (b < COLS - 1 && 'rfm'.includes(at(ty, b + 1))) b++;
        R.raised.push({ x0: tx * T, x1: (b + 1) * T, ty });
      }
    }
    for (let x = 0; x < W; x++) {
      const tx = Math.floor(x / T), u = x + 0.5 - tx * T;
      let g = H + 100;
      for (let ty = 0; ty < ROWS; ty++) {
        const ch = at(ty, tx);
        if (ch === '-') { R.ceil[x] = Math.max(R.ceil[x], (ty + 1) * T); continue; }
        if (ch === '#' || ch === 'x') { g = ty * T; break; }
        if (ch === 'm') { g = ty * T - PZ.cobbleH * Math.abs(Math.sin(Math.PI * u / 10)); break; }
        if (ch === 'p') { g = ty * T + PZ.puddleD; break; }
        if (ch === 'n') { g = (ty + 1) * T - PZ.bumpH * Math.sin(Math.PI * u / T); break; }
        if (ch === 'r' || ch === 'f') {
          const [a, b] = runOf(ty, tx, ch), f = (x + 0.5 - a * T) / ((b - a + 1) * T);
          g = ch === 'r' ? (ty + 1) * T - T * f : ty * T + T * f; break;
        }
      }
      R.ground[x] = g;
    }
    R.puddles.sort((a, b) => a.x0 - b.x0);
    const pr = [];
    for (const p of R.puddles) { const l = pr[pr.length - 1]; if (l && l.x1 === p.x0) l.x1 = p.x1; else pr.push(Object.assign({}, p)); }
    R.puddles = pr;
    R.crests.sort((a, b) => a - b);
    if (def.wind) R.wind = { x0: def.wind.x0 * T, x1: (def.wind.x1 + 1) * T, dir: def.wind.dir || -1 };
    if (R.spawns[0]) R.roadY = (R.spawns[0].ty + 1) * T;
    return R;
  }
  const pzGAt = (R, x) => (x < 0 || x >= W ? -1e9 : R.ground[Math.floor(x)]);
  const pzSupport = (R, xc) => Math.min(pzGAt(R, xc - 8), pzGAt(R, xc), pzGAt(R, xc + 8));
  function pzCeilOver(R, x0, x1) { let c = -1e9; for (let x = Math.floor(x0); x <= x1; x += 2) if (x >= 0 && x < W) c = Math.max(c, R.ceil[x]); return c; }
  const pzHand = pc => pc.feet - PH - PZ.handUp + pc.duck * PZ.duck + (pc.ready >= 0 ? PZ.readyDip : 0);
  const pzStackBase = st => (pzHand(st.pc[st.left]) + pzHand(st.pc[st.right])) / 2 - PZ.trayTh;
  const pzStackHits = st => pzStackBase(st) - st.n * PZ.boxH < pzCeilOver(st.R, st.X - PZ.boxW / 2, st.X + PZ.boxW / 2);
  function pzHitsWithDuck(st, pc, duck) { const d = pc.duck; pc.duck = duck; const h = pzStackHits(st); pc.duck = d; return h; }
  const pzImpulse = (st, j) => { st.leanV += pzHf(st.n) * j; };

  const pzPc = id => ({ id, xc: 0, feet: 0, vy: 0, grounded: true, ready: -1, jumpBuf: 0, duck: 0, duckT: 0,
    steadyHeld: false, steady: false, squeezed: false, landT: -9, landV: 0, idleT: 0, hops: 0, lastDir: 0, relT: 9, carry: 0, carryAir: false });

  function pzInitRoom(k, L, relief) {
    const st = G.mst, def = L.def, R = pzParseRoom(def);
    st.room = k; st.R = R; st.def = def; st.relief = relief;
    const sx = R.spawns.map(s => s.tx * T + T / 2);
    st.left = sx[0] < sx[1] ? 0 : 1; st.right = 1 - st.left;
    st.X = (sx[0] + sx[1]) / 2; st.V = 0; st.aPair = 0; st.mode = 'idle'; st.pushDir = 0; st.strain = 0; st.phi = 0;
    st.pc = [pzPc(0), pzPc(1)];
    st.pc[st.left].xc = st.X - PZ.span / 2; st.pc[st.right].xc = st.X + PZ.span / 2;
    for (const pc of st.pc) pc.feet = pzSupport(R, pc.xc);
    st.n = def.stack; st.start = st.n; st.need = Math.max(1, def.order - relief);
    st.lean = 0; st.leanV = 0; st.teeter = null; st.grace = 0; st.awnT = 0; st.nSteady = 0;
    st.phase = 'play'; st.phaseT = 0; st.deliverT = 0; st.roomT = 0; st.failWhy = '';
    st.windState = 'calm'; st.windG = 0; st.windF = 0; st.windIn = false; st.gustHeld = false; st.windT0 = null;
    const tries = st.stats.retries[k] || 0, Wd = PZ.wind;
    st.windMul = R.wind && tries >= Wd.calmAfter ? Math.max(Wd.calmMin, Math.pow(Wd.calmMul, tries - Wd.calmAfter + 1)) : 1;
    st.crateT = 0; st.pushT = 0; st.tugT = 0; st.pusher = -1; st.awnBonkT = 0;
    st.fx = { boxes: [], flyers: [], leaves: [], floats: [], birds: [], bake: 0, freshT: 0, reliefT: relief > 0 ? 3 : 0, del: null,
      cobbleT: 0, creakT: 0, gruntT: 0, dustT: 0, leafAcc: 0, pop: 0, bakeN: 0, bumpT: [-9, -9] };
    if (st.stats.retries[k] === undefined) st.stats.retries[k] = 0;
    if (!st.deco || st.deco.room !== k) st.deco = pzDeco(k, R);
    pzMirror(st);
  }

  // mirror the carry into the engine players (drawPlayer, name tags)
  function pzMirror(st) {
    for (const pc of st.pc) {
      const p = G.players[pc.id];
      p.x = pc.xc - PW / 2; p.y = pc.feet - PH; p.vx = st.V; p.vy = pc.vy; p.grounded = pc.grounded; p.alive = true;
      p.stun = 0; p.stompSafe = 0;
      if (Math.abs(st.V) > 10) p.face = Math.sign(st.V);
    }
  }

  /* ---------- one tick of the carry (a port of physics() in sim/pizza.js, with the lead review's hop carry) ---------- */
  function pzPhysics(st, dt, frozen) {
    const R = st.R, ps = st.pc, L = ps[st.left], Rp = ps[st.right];
    const mv = [0, 0];
    // 1. each player's intent
    for (const pc of ps) {
      const p = G.players[pc.id], inp = frozen ? PZ_NOIN : p.input, press = !frozen && p.pendingJump;
      p.pendingJump = false; p.pendingAct = false;
      pc.steadyHeld = !!inp.act;
      const m = pc.steadyHeld ? 0 : (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      if (!frozen) { if (inp.left || inp.right || inp.jump || inp.down || inp.act) pc.idleT = 0; else pc.idleT += dt; }
      // hop carry: a hop pressed just after letting go of a direction keeps walking that way until landing
      if (m !== 0) { pc.lastDir = m; pc.relT = 0; pc.carry = 0; } else pc.relT += dt;
      if (inp.down || pc.steadyHeld || frozen) pc.carry = 0;
      // duck: a tap keeps you down a moment; you can't stand up into an awning
      pc.duckT = inp.down ? PZ.duckHold : Math.max(0, pc.duckT - dt);
      const wantDuck = (inp.down || pc.duckT > 0) && pc.grounded && pc.ready < 0 && !pc.steadyHeld;
      const d0 = pc.duck;
      pc.duck = approach(pc.duck, wantDuck ? 1 : 0, PZ.duckRate * dt);
      if (pc.duck < d0 && !pzHitsWithDuck(st, pc, d0) && pzStackHits(st)) pc.duck = d0;
      pc.squeezed = pc.duck === d0 && !wantDuck && d0 > 0;
      if (press && !pc.steadyHeld) {
        const sets = (pc.grounded && pc.ready < 0) || !pc.grounded;
        if (sets && m === 0 && pc.relT <= PZ.carryWin && pc.lastDir) { pc.carry = pc.lastDir; pc.carryAir = false; st.stats.carries++; }
        if (pc.grounded && pc.ready < 0) { pc.ready = 0; Sfx.play('pzReady', pc.id); } else if (!pc.grounded) pc.jumpBuf = PZ.jumpBuf;
      }
      if (pc.jumpBuf > 0) { pc.jumpBuf -= dt; if (pc.grounded && pc.ready < 0) { pc.ready = 0; pc.jumpBuf = 0; } }
      // (rev2) a carry only lives while you wind up, fly, or have a buffered hop: on the ground with none, it ends
      // (an in-air re-press or a ready lost off a crate's edge used to leave it on forever: a "ghost" walker)
      if (pc.carry && pc.grounded && pc.ready < 0 && !(pc.jumpBuf > 0)) { pc.carry = 0; pc.carryAir = false; }
      mv[pc.id] = m !== 0 ? m : pc.carry;
    }
    // 2. hops: both ready on the ground = a team hop; a lone ready player hops low after the window
    if (L.ready >= 0 && Rp.ready >= 0 && L.grounded && Rp.grounded) {
      for (const pc of ps) { pc.vy = -PZ.hop; pc.grounded = false; pc.ready = -1; pc.hops++; if (pc.carry) pc.carryAir = true; }
      st.stats.teamHops++;
      Sfx.play('pzHop'); pzRumble(0, 0.35, 70);
      for (const pc of ps) pzPuff(pc.xc, pc.feet, 6, 'rgba(255,255,255,0.8)');
    } else for (const pc of ps) {
      if (pc.ready < 0) continue;
      if (!pc.grounded) { pc.ready = -1; continue; }
      pc.ready += dt;
      const holding = !frozen && G.players[pc.id].input.jump;
      if ((pc.ready >= PZ.teamWin && !holding) || pc.ready >= PZ.windMax) {
        pc.vy = -PZ.soloHop; pc.grounded = false; pc.ready = -1; pc.hops++; st.stats.soloHops++; if (pc.carry) pc.carryAir = true;
        pzImpulse(st, (pc === L ? 1 : -1) * PZ.jSolo);
        Sfx.play('jump', pc.id); pzPuff(pc.xc, pc.feet, 3, 'rgba(255,255,255,0.75)');
      }
    }
    // 3. pair speed: it only moves when both push the same way
    const mL = mv[L.id], mR = mv[Rp.id], anyDuck = L.duck > 0.5 || Rp.duck > 0.5;
    let Vt = 0, mode = 'idle', dir = 0;
    if (mL === mR) { Vt = mL * (anyDuck ? PZ.duckWalk : PZ.walk); mode = mL ? 'walk' : 'idle'; }
    else if (mL === 0 || mR === 0) { dir = mL || mR; Vt = dir * PZ.push; mode = 'push'; st.pusher = mL ? L.id : Rp.id; }
    else mode = 'tug';
    const nG = (L.grounded ? 1 : 0) + (Rp.grounded ? 1 : 0), anySteady = L.steadyHeld || Rp.steadyHeld;
    let acc;
    if (nG === 0) acc = PZ.accAir;
    else {
      const speeding = Vt !== 0 && (st.V === 0 || Math.sign(Vt) === Math.sign(st.V)) && Math.abs(Vt) > Math.abs(st.V);
      acc = speeding ? PZ.acc : (anySteady && Vt === 0 ? PZ.decSteady : PZ.dec);
      if (nG === 1) acc *= 0.5;
    }
    const V0 = st.V;
    st.V = approach(st.V, Vt, acc * dt);
    st.mode = mode; st.pushDir = dir;
    // 4. horizontal move (rigid pair): ground walls, room edges, then the awning stack-wall
    let bonked = false;
    const dX = st.V * dt;
    if (dX !== 0) {
      const nx = st.X + dX;
      const blocked = pc => {
        const xc = nx + (pc === L ? -PZ.span / 2 : PZ.span / 2);
        if (xc - PW / 2 < 0 || xc + PW / 2 > W) return true;
        const sup = pzSupport(R, xc);
        // in the air you drift up a slope, or out of a puddle dip, instead of bonking on it (crates stay solid walls)
        const dip = !pc.grounded && pzSupport(R, pc.xc) > R.roadY + 0.5;
        return sup < pc.feet - (pc.grounded ? PZ.stepUp : dip ? PZ.puddleD + 0.5 : PZ.airUp);
      };
      let stop = blocked(L) || blocked(Rp), awn = false;
      if (!stop) { const was = pzStackHits(st), X0 = st.X; st.X = nx; if (!was && pzStackHits(st)) { stop = true; awn = true; } st.X = X0; }
      if (stop) {
        if (Math.abs(st.V) > 60) {
          pzImpulse(st, Math.sign(st.V) * PZ.jBonk * Math.abs(st.V) / PZ.walk);
          st.stats.bonks++; Sfx.play('bonk'); pzRumble(0.2, 0.4, 90);
          const front = st.V > 0 ? Rp : L;
          pzPuff(front.xc + Math.sign(st.V) * 12, front.feet - 12, 4, 'rgba(255,255,255,0.8)');
        }
        if (awn) pzAwningKnock(st, Math.sign(st.V));
        st.V = 0; bonked = true;
      } else st.X = nx;
    }
    st.aPair = bonked ? 0 : (st.V - V0) / dt;
    const prevXc = [L.xc, Rp.xc];
    L.xc = st.X - PZ.span / 2; Rp.xc = st.X + PZ.span / 2;
    // 5. vertical, per player
    for (const pc of ps) {
      if (pc.grounded) {
        const sup = pzSupport(R, pc.xc);
        if (sup <= pc.feet + PZ.snapDown) pc.feet = sup; else { pc.grounded = false; pc.vy = 0; }
      }
      if (!pc.grounded) {
        pc.vy = Math.min(pc.vy + PZ.g * dt, PZ.maxFall);
        pc.feet += pc.vy * dt;
        const s2 = pzSupport(R, pc.xc);
        if (pc.vy < 0 && pc.feet > s2) pc.feet = s2;   // rising over a bump's slope: the slope lifts your feet
        if (pc.vy >= 0 && pc.feet >= s2) {
          const vy = pc.vy; pc.feet = s2; pc.vy = 0; pc.grounded = true;
          if (pc.carryAir) { pc.carry = 0; pc.carryAir = false; }
          const o = pc === L ? Rp : L, team = !o.grounded || st.clock - o.landT < 0.08;
          pc.landT = st.clock; pc.landV = vy;
          if (vy > 150) {
            if (team) pzImpulse(st, Math.sign(st.lean) * PZ.jLandTeam * vy / PZ.hop);
            else pzImpulse(st, (pc === L ? -1 : 1) * PZ.jLand * vy / PZ.hop);
            pzPuff(pc.xc, pc.feet, 5, 'rgba(255,255,255,0.75)');
            if (vy > 300) { Sfx.play('land'); pzRumble(0.25, 0.3, 80, pc.id); }
          }
        }
      }
    }
    // the stack bumps its head on an awning: rising stops, and a box is knocked off
    if (pzStackHits(st)) {
      for (const pc of ps) if (pc.vy < 0) pc.vy = 0;
      pzAwningKnock(st, Math.sign(st.V) || 1);
    }
    // 6. surface events: bumps, cobbles, puddles
    const spd = Math.abs(st.V) / PZ.walk;
    [L, Rp].forEach((pc, i) => {
      if (!pc.grounded) return;
      const a = Math.min(prevXc[i], pc.xc), b = Math.max(prevXc[i], pc.xc);
      if (a === b) return;
      const away = pc === L ? 1 : -1;
      for (const bp of R.bumps) if (bp.cx > a && bp.cx <= b) {
        pzImpulse(st, away * PZ.jBump * spd * spd);
        if (!frozen) {
          Sfx.tone(110, 0.07, 'square', 0.02 + 0.03 * spd, 70); pzRumble(0.2 * spd, 0.45 * spd, 70, pc.id);
          pzPuff(bp.cx, R.roadY - 10, 3, 'rgba(255,255,255,0.7)'); st.fx.bumpT[pc.id] = st.clock;
        }
      }
      for (let ci = 0; ci < R.crests.length; ci++) {
        const c = R.crests[ci];
        if (c > a && c <= b) {
          const sg = hash(Math.round(c), pc.id + st.room * 7) & 1 ? 1 : -1;
          pzImpulse(st, sg * PZ.jCobble * spd * spd);
          if (!frozen && st.clock - st.fx.cobbleT > 0.045) {
            st.fx.cobbleT = st.clock;
            Sfx.tone(600 + 100 * (ci % 3), 0.025, 'square', 0.006 + 0.012 * spd);
            if (ci % 2) pzPuff(c, pzGAt(R, c), 1, 'rgba(255,255,255,0.6)');
            if (ci % 3 === 0) pzRumble(0, 0.15 * spd, 60);
          }
        }
      }
      for (const pd of R.puddles) {
        const was = prevXc[i] > pd.x0 && prevXc[i] < pd.x1, now = pc.xc > pd.x0 && pc.xc < pd.x1;
        if (now && !was) {
          pzImpulse(st, -away * PZ.jSplash * spd);
          if (spd > 0.15) {
            Sfx.play('pzSplash'); pzBurst(pc.xc, R.roadY + 2, '#7fc8ff', 4 + Math.round(8 * spd)); pzBurst(pc.xc, R.roadY + 2, '#ffffff', 3);
            pzRumble(0.1, 0.3 * spd, 80, pc.id);
          }
        }
      }
    });
    // 7. wind gusts
    pzWindStep(st, dt);
    // 8. steady: needs the pair nearly stopped and you on the ground
    for (const pc of ps) pc.steady = pc.steadyHeld && pc.grounded && Math.abs(st.V) <= PZ.steadyMaxV;
    const nS = (L.steady ? 1 : 0) + (Rp.steady ? 1 : 0);
    st.nSteady = nS;
    // (rev2) an AFK partner (no keys for afkSave s) can't cost a box: one steadier is enough to save it then
    const nSave = nS === 1 && ps.some(pc => !pc.steady && pc.idleT >= PZ.afkSave) ? 2 : nS;
    // 9. the lean: a damped spring pushed by acceleration, tilt, strain, wind and jolts
    const hl = pzHand(L), hr = pzHand(Rp), phi = clamp((hr - hl) / PZ.span, -0.8, 0.8);
    st.phi = phi;
    if (mode === 'push' || mode === 'tug') st.strain = Math.min(1, st.strain + dt / PZ.strainRise);
    else st.strain = Math.max(0, st.strain - dt / PZ.strainFall);
    let F = -PZ.cAcc * clamp(st.aPair, -1500, 1500) / 300 + PZ.cTilt * phi + st.windF;
    if (mode === 'push') F += -PZ.cPush * st.strain * dir;
    if (mode === 'tug') F += PZ.cTug * st.strain * Math.sin(8 * st.roomT);
    F *= pzHf(st.n);
    const Ke = PZ.K + PZ.Ksteady * nS, De = PZ.D + PZ.Dsteady * nS;
    st.leanV += (F - Ke * st.lean - De * st.leanV) * dt;
    st.lean += st.leanV * dt;
    if (st.grace > 0) st.grace -= dt;
    if (st.awnT > 0) st.awnT -= dt;
    if (frozen) return;
    // 10. teeter: the top box slides to the edge; both steadying saves it, otherwise it falls
    if (!st.teeter && st.grace <= 0 && Math.abs(st.lean) >= 1 && st.n > 0) {
      st.teeter = { side: Math.sign(st.lean), t: 0, st: 0 };
      st.stats.teeters++; st.fx.creakT = 0.27;
      Sfx.play('pzTeeter'); pzRumble(0.25, 0.5, 180);
    }
    if (st.teeter) {
      const te = st.teeter;
      te.t += dt;
      if (nSave === 2) te.st += dt;
      if (te.st >= PZ.steadySave) {
        st.teeter = null; st.lean *= PZ.settleMul; st.leanV *= PZ.settleMul; st.grace = PZ.grace; st.stats.saves++;
        Sfx.play('pzSave'); pzRumble(0, 0.4, 90);
        const tp = pzTopPos(st);
        pzBurst(tp.x, tp.y, '#ffffff', 8); pzFloat(st, tp.x, tp.y - 26, 'Phew!', C.gold, 18);
      } else if (te.t >= PZ.teeter) {
        st.teeter = null; pzLoseBox(st, 'fell', te.side); st.lean *= PZ.fallMul; st.leanV *= PZ.fallMul; st.grace = PZ.grace;
      } else {
        st.fx.creakT -= dt;
        if (st.fx.creakT <= 0) { st.fx.creakT = 0.27; Sfx.play('pzCreak'); pzRumble(0, 0.3, 60); }
      }
    }
    // 11. fail and delivery
    if (st.n < st.need || ps.some(pc => pc.feet > H + 40)) { pzFail(st, st.n < st.need ? 'boxes' : 'pit'); return; }
    const d = R.door;
    if (d && Math.abs(st.X - d.cx) <= PZ.deliverR && L.grounded && Rp.grounded && Math.abs(st.V) <= PZ.deliverV && !st.teeter) {
      st.deliverT += dt;
      if (st.deliverT >= PZ.deliverHold) pzDeliver(st);
    } else st.deliverT = 0;
  }

  function pzWindStep(st, dt) {
    const R = st.R;
    st.windF = 0;
    if (!R.wind) return;
    const Wd = PZ.wind;
    if (st.windT0 == null && st.X > R.wind.x0 - Wd.trig) st.windT0 = st.roomT;
    const t = st.windT0 == null ? -1 : st.roomT - st.windT0 - Wd.first;
    let state = 'calm', g = 0;
    if (t >= 0) {
      const c = t % Wd.period;
      if (c < Wd.warn) state = 'warn';
      else if (c < Wd.warn + Wd.gust) { state = 'gust'; const u = c - Wd.warn; g = Math.min(1, u / Wd.rampIn, (Wd.gust - u) / Wd.rampOut); }
    }
    const near = st.X > R.wind.x0 - 150 && st.X < R.wind.x1 + 40;
    if (state !== st.windState) {
      if (st.windState === 'gust' && st.gustHeld) st.stats.windStops++;
      st.gustHeld = false;
      if (state === 'warn' && near && st.phase === 'play') Sfx.play('pzWhistle');
      if (state === 'gust' && near && st.phase === 'play') { Sfx.play('pzGust'); if (st.X > R.wind.x0 && st.X < R.wind.x1) pzRumble(0.15, 0.35, 900); }
      st.windState = state;
    }
    st.windIn = st.X > R.wind.x0 && st.X < R.wind.x1;
    if (st.windIn) st.windF = R.wind.dir * Wd.force * st.windMul * Math.max(0, g);
    st.windG = Math.max(0, g);
  }

  function pzAwningKnock(st, dir) {
    if (st.awnT > 0 || st.n <= 0) return;
    st.awnT = PZ.awningGrace; st.awnBonkT = 2.5;
    if (st.teeter) st.teeter = null;
    pzImpulse(st, -dir * PZ.jAwning);
    Sfx.play('pzThunk'); pzRumble(0.5, 0.5, 160);
    const tp = pzTopPos(st);
    pzBurst(tp.x, tp.y - 4, C.paper, 6);
    pzLoseBox(st, 'awning', -dir);
  }

  function pzLoseBox(st, why, side) {
    if (st.n <= 0) return;
    const tp = pzTopPos(st);
    st.n--; st.stats.dropped++; G.falls++;
    const fx = st.fx.boxes;
    const knocked = why === 'awning';
    fx.push({ x: tp.x, y: tp.y, rot: tp.rot, vx: knocked ? side * 160 : side * (90 + pzRand() * 50) + st.V * 0.5, vy: knocked ? -80 : -120,
      vr: (pzRand() < 0.5 ? -1 : 1) * (4 + pzRand() * 2), open: false, bounced: false, rest: false, t: 0 });
    if (fx.length > 10) fx.shift();
    Sfx.play('pzSlip'); pzRumble(0.6, 0.7, 260); pzShake(0.12);
    st.fx.pop = 0.25;
  }

  function pzFail(st, why) {
    st.phase = 'fail'; st.phaseT = PZ.failT; st.failWhy = why; st.teeter = null; st.deliverT = 0;
    st.stats.fails++;
    if (why === 'pit') G.falls++;
    Sfx.play('pzOops'); pzRumble(0.7, 0.7, 350); pzShake(0.12);
  }

  function pzDeliver(st) {
    const def = st.def, lost = st.start - st.n, spares = def.stack - def.order;
    const stars = lost === 0 ? 3 : lost <= Math.ceil(spares / 2) ? 2 : 1;
    st.phase = 'deliver'; st.phaseT = 0.15 * st.n + 0.9;
    st.stats.lost[st.room] = lost; st.stats.delivered[st.room] = st.n; st.stats.stars[st.room] = stars;
    st.fx.del = { t: 0, n: st.n, launched: 0, arrived: 0, stars, shown: 0 };
    Sfx.play('pzDing');
  }

  // where the top box is (for fx)
  function pzTopPos(st) {
    const g = pzGeom(st), i = Math.max(0, st.n - 1);
    return pzBoxAt(st, g, i, Math.max(1, st.n));
  }
  function pzGeom(st) {
    const hl = pzHand(st.pc[st.left]), hr = pzHand(st.pc[st.right]);
    const a = Math.atan2(hr - hl, PZ.span);
    return { hl, hr, a, bx: st.X, by: (hl + hr) / 2 - PZ.trayTh, ux: Math.sin(a), uy: -Math.cos(a) };
  }
  function pzBoxAt(st, g, i, n) {
    const f = (i + 1) / n, h = PZ.boxH * (i + 0.5);
    const jit = (hash(st.room + 1, i) % 3) - 1;
    return { x: g.bx + g.ux * h + st.lean * PZ.leanPx * Math.pow(f, 1.5) + jit, y: g.by + g.uy * h, rot: g.a + st.lean * 0.18 * f };
  }

  function pzFloat(st, x, y, str, col, size) {
    const f = st.fx.floats;
    f.push({ x, y, str, col, size: size || 16, t: 0, max: 1.1 });
    if (f.length > 12) f.shift();
  }

  /* ---------- cosmetic effects (ticked with the game, so a pause freezes them) ---------- */
  function pzFxStep(st, dt) {
    const fx = st.fx, R = st.R;
    fx.bake += dt;
    while (fx.bakeN < st.start && fx.bake >= 0.08 * fx.bakeN + 0.12) { Sfx.tone(500 + 60 * fx.bakeN, 0.04, 'triangle', 0.03); fx.bakeN++; }
    if (fx.freshT > 0) fx.freshT -= dt;
    if (fx.reliefT > 0) fx.reliefT -= dt;
    if (fx.pop > 0) fx.pop -= dt;
    if (st.awnBonkT > 0) st.awnBonkT -= dt;
    for (let i = fx.boxes.length - 1; i >= 0; i--) {
      const b = fx.boxes[i];
      b.t += dt;
      if (!b.rest) {
        b.vy += 1800 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt;
        const gy = pzGAt(R, clamp(b.x, 0, W - 1)) - 4;
        if (b.vy > 0 && b.y >= gy) {
          b.y = gy;
          if (!b.bounced) {
            b.bounced = true; b.open = true; b.hitT = b.t; b.vy *= -0.35; b.vx *= 0.5; b.vr *= 0.4;
            pzBurst(b.x, b.y, '#ffcf5a', 6); pzBurst(b.x, b.y, '#e2452b', 4); pzPuff(b.x, b.y, 4, 'rgba(255,255,255,0.8)');
            Sfx.play('pzPlop');
          } else {
            b.rest = true; b.vy = 0; b.vx = 0; b.vr = 0; b.rot = 0;
            // a hungry pigeon swoops in for the pizza (from the side away from the carry)
            if (b.x > 24 && b.x < W - 24 && fx.birds.length < 4) {
              const side = b.x < st.X ? -1 : 1;
              fx.birds.push({ box: b, side, t: -0.15, x: b.x + side * 200, y: 120, x1: b.x + side * 17, y1: b.y + 4, cooed: false });
            }
          }
        }
      }
      if ((b.hitT !== undefined && b.t - b.hitT > 2.4) || b.x < -60 || b.x > W + 60 || b.y > H + 60) fx.boxes.splice(i, 1);
    }
    for (let i = fx.birds.length - 1; i >= 0; i--) {
      const bd = fx.birds[i];
      bd.t += dt;
      if (bd.t >= 0.45 && !bd.cooed) { bd.cooed = true; Sfx.play('pzCoo'); }
      if (bd.t >= 0.95 && !bd.box.eaten) { bd.box.eaten = true; pzBurst(bd.x1 - bd.side * 10, bd.y1 - 6, '#ffcf5a', 3); }
      if (bd.t > 1.7) fx.birds.splice(i, 1);
    }
    for (let i = fx.floats.length - 1; i >= 0; i--) { const f = fx.floats[i]; f.t += dt; f.y -= 34 * dt; if (f.t >= f.max) fx.floats.splice(i, 1); }
    // wind leaves
    if (R.wind) {
      const rate = st.windState === 'gust' ? 35 : st.windState === 'warn' ? 5 : 0;
      fx.leafAcc += rate * dt;
      while (fx.leafAcc >= 1) {
        fx.leafAcc -= 1;
        if (fx.leaves.length < 80) fx.leaves.push({ x: R.wind.x1 + pzRand() * (W - R.wind.x1), y: 250 + pzRand() * 190, vx: -(260 + pzRand() * 200), ph: pzRand() * 6, col: ['#8fe3b0', '#ffb347', '#e4572e'][(pzRand() * 3) | 0], r: pzRand() * 6 });
      }
      for (let i = fx.leaves.length - 1; i >= 0; i--) {
        const l = fx.leaves[i];
        l.x += l.vx * dt; l.ph += dt * 6; l.y += Math.sin(l.ph) * 20 * dt; l.r += dt * 8;
        if (l.x < -10) fx.leaves.splice(i, 1);
      }
    }
    // delivery: the boxes fly into the door one by one, then the stars pop
    const del = fx.del;
    if (del && st.phase === 'deliver') {
      del.t += dt;
      while (del.launched < del.n && del.t >= 0.15 * del.launched) {
        const g = pzGeom(st), b = pzBoxAt(st, g, del.n - 1 - del.launched, del.n);
        fx.flyers.push({ k: del.launched, x0: b.x, y0: b.y, x1: R.door.cx, y1: R.door.y + 34, t: 0 });
        del.launched++;
      }
      for (let i = fx.flyers.length - 1; i >= 0; i--) {
        const f = fx.flyers[i];
        f.t += dt;
        if (f.t >= 0.35) {
          fx.flyers.splice(i, 1); del.arrived++;
          const k = f.k;
          Sfx.tone(1046 * (1 + 0.06 * k), 0.05, 'square', 0.035); Sfx.tone(1046 * 1.5 * (1 + 0.06 * k), 0.09, 'square', 0.035, null, 0.045);
          pzBurst(f.x1, f.y1, C.gold, 6); pzFloat(st, f.x1 + (k % 2 ? 24 : -24), f.y1 - 14, '+1', C.gold, 18); pzRumble(0, 0.15, 40);
          if (del.arrived === del.n) { for (let c = 0; c < 10; c++) confetti(f.x1, f.y1 - 10); pzFloat(st, R.door.cx, R.door.y - 44, 'Thanks!', '#ffffff', 22); }
        }
      }
      const starT = 0.15 * (del.n - 1) + 0.4;
      while (del.shown < del.stars && del.t >= starT + 0.15 * del.shown) { del.shown++; Sfx.play('pzStar'); }
    }
  }

  /* ---------- the street scene (drawn behind the players) ---------- */
  function pzDeco(k, R) {
    const out = { room: k, bld: [], trees: [], stalls: [] };
    const hx0 = R.door ? R.door.x - 52 : W;
    let x = k === 0 ? 156 : -12, i = 0;
    while (x < hx0 - 40) {
      const h = hash(k * 13 + 5, i * 7 + 1);
      let w = 92 + (h % 5) * 13;
      if (x + w > hx0 - 4) w = hx0 - 4 - x;
      if (w < 56) break;
      out.bld.push({ x, w, top: 256 + ((h >> 5) % 4) * 12, col: PZ_FACADES[(h >> 9) % PZ_FACADES.length], roof: (h >> 13) % 3,
        rcol: PZ_ROOFS[(h >> 16) % PZ_ROOFS.length], shop: (h >> 19) % 3 === 0, chim: (h >> 21) % 2 === 0 });
      x += w + 6 + ((h >> 23) % 3) * 8; i++;
    }
    if (k === 3) for (const tx of [130, 300, 470, 650]) out.trees.push({ x: tx + (hash(tx, 3) % 20), h: 70 + hash(tx, 9) % 20 });
    if (k === 2) for (const sx of [70, 230, 400]) out.stalls.push({ x: sx, col: ['#ffb347', '#8fe3b0', '#ff8fc7'][out.stalls.length] });
    return out;
  }

  function pzDrawBuilding(b, roadY) {
    const { x, w, top } = b;
    ctx.fillStyle = b.col; ctx.fillRect(x, top, w, roadY - top);
    ctx.fillStyle = 'rgba(28,26,54,0.12)'; ctx.fillRect(x + w - 5, top, 5, roadY - top);
    if (b.roof === 0) { ctx.fillStyle = b.rcol; ctx.fillRect(x - 4, top - 8, w + 8, 10); }
    else if (b.roof === 1) { ctx.fillStyle = b.rcol; ctx.beginPath(); ctx.moveTo(x - 6, top + 2); ctx.lineTo(x + w / 2, top - 30); ctx.lineTo(x + w + 6, top + 2); ctx.closePath(); ctx.fill(); }
    else { ctx.fillStyle = b.rcol; ctx.beginPath(); ctx.moveTo(x - 4, top + 2); ctx.lineTo(x + 12, top - 18); ctx.lineTo(x + w - 12, top - 18); ctx.lineTo(x + w + 4, top + 2); ctx.closePath(); ctx.fill(); }
    if (b.chim) { ctx.fillStyle = b.rcol; ctx.fillRect(x + w * 0.72, top - (b.roof === 1 ? 26 : 22), 10, 18); }
    const cols = Math.max(1, Math.floor((w - 16) / 32)), gap = (w - cols * 18) / (cols + 1);
    for (let r = 0, wy = top + 16; wy + 26 < roadY - 54; r++, wy += 44) for (let c = 0; c < cols; c++) {
      const wx = x + gap + c * (18 + gap);
      ctx.fillStyle = 'rgba(28,26,54,0.22)'; ctx.fillRect(wx - 2, wy - 2, 22, 28);
      ctx.fillStyle = '#e8f3fa'; ctx.fillRect(wx, wy, 18, 24);
      ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.fillRect(wx + 8, wy, 2, 24); ctx.fillRect(wx, wy + 11, 18, 2);
    }
    // ground floor: a shop window or a front door
    if (b.shop) {
      ctx.fillStyle = 'rgba(28,26,54,0.22)'; ctx.fillRect(x + 8, roadY - 46, w - 16, 46);
      ctx.fillStyle = '#fff3d6'; ctx.fillRect(x + 11, roadY - 43, w - 22, 30);
    } else {
      ctx.fillStyle = 'rgba(28,26,54,0.28)'; rr(x + w / 2 - 11, roadY - 40, 22, 40, 4); ctx.fill();
    }
    // haze over the whole silhouette: the backdrop stays softer than the carry in front of it
    ctx.beginPath();
    ctx.rect(x, top, w, roadY - top);
    if (b.roof === 0) ctx.rect(x - 4, top - 8, w + 8, 10);
    else if (b.roof === 1) { ctx.moveTo(x - 6, top + 2); ctx.lineTo(x + w / 2, top - 30); ctx.lineTo(x + w + 6, top + 2); ctx.closePath(); }
    else { ctx.moveTo(x - 4, top + 2); ctx.lineTo(x + 12, top - 18); ctx.lineTo(x + w - 12, top - 18); ctx.lineTo(x + w + 4, top + 2); ctx.closePath(); }
    if (b.chim) ctx.rect(x + w * 0.72, top - (b.roof === 1 ? 26 : 22), 10, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.24)'; ctx.fill();
  }

  function pzDrawBackdrop(st) {
    const R = st.R, roadY = R.roadY, d = st.deco, k = st.room;
    if (k === 1) {
      // after the rain: a faint rainbow and grey clouds
      ctx.save(); ctx.globalAlpha = 0.28; ctx.lineWidth = 9;
      ['#ff6b6b', '#ffb347', '#ffe66b', '#8fe3b0', '#7fc8ff', '#b28dff'].forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(330, 470, 330 - i * 9, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); });
      ctx.restore();
      for (let i = 0; i < 3; i++) {
        const cx = ((i * 330 + G.clock * 5) % (W + 260)) - 130, cy = 70 + i * 22;
        ctx.fillStyle = 'rgba(150,160,180,0.55)';
        ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.arc(cx + 30, cy - 12, 30, 0, Math.PI * 2); ctx.arc(cx + 62, cy, 22, 0, Math.PI * 2); ctx.rect(cx, cy, 62, 20); ctx.fill();
      }
    }
    for (const b of d.bld) pzDrawBuilding(b, roadY);
    if (k === 0) pzDrawPizzeria(roadY);
    if (k === 2) {
      // market: bunting between the rooftops and little stalls
      const pts = d.bld.map(b => [b.x + b.w / 2, b.top + 14]);
      const cols = ['#e4572e', '#ffc53d', '#5b95ff', '#8fe3b0', '#ff8fc7'];
      for (let i = 0; i + 1 < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1], sag = 22;
        ctx.strokeStyle = 'rgba(28,26,54,0.45)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + sag * 2, bx, by); ctx.stroke();
        const n = Math.max(2, Math.floor((bx - ax) / 18));
        for (let j = 1; j < n; j++) {
          const t = j / n, px = (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * (ax + bx) / 2 + t * t * bx;
          const py = (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * ((ay + by) / 2 + sag * 2) + t * t * by;
          ctx.fillStyle = cols[(i * 3 + j) % cols.length];
          ctx.beginPath(); ctx.moveTo(px - 5, py); ctx.lineTo(px + 5, py); ctx.lineTo(px, py + 10); ctx.closePath(); ctx.fill();
        }
      }
      for (const s of d.stalls) pzDrawStall(s, roadY);
    }
    if (k === 3) {
      const bend = -st.windG * 12, sway = Math.sin(G.clock * 1.6) * 1.5 + (st.windState === 'gust' ? Math.sin(G.clock * 22) * 2 * st.windG : 0);
      for (const t of d.trees) {
        const top = roadY - t.h;
        ctx.strokeStyle = '#8a5833'; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(t.x, roadY); ctx.quadraticCurveTo(t.x, top + 20, t.x + bend * 0.6 + sway, top); ctx.stroke();
        const cx = t.x + bend + sway;
        ctx.fillStyle = '#5fab55'; circle(cx, top - 6, 24); ctx.fill(); circle(cx - 18, top + 6, 17); ctx.fill(); circle(cx + 18, top + 4, 18); ctx.fill();
        ctx.fillStyle = '#7fcf6a'; circle(cx - 6, top - 14, 13); ctx.fill();
      }
    }
  }

  function pzDrawPizzeria(roadY) {
    const x0 = 0, x1 = 150, top = 246;
    ctx.fillStyle = '#e4572e'; ctx.fillRect(x0, top, x1 - x0, roadY - top);
    ctx.fillStyle = '#fff4e0'; ctx.fillRect(x0, top, x1 - x0, 6); ctx.fillRect(x0, top + 44, x1 - x0, 4);
    ctx.fillStyle = '#b8402a'; ctx.fillRect(x1 - 6, top, 6, roadY - top);
    // plaque
    ctx.fillStyle = '#fff4e0'; rr(22, top + 12, 100, 26, 8); ctx.fill();
    text('PIZZA', 72, top + 26, 18, '#e4572e', 'center');
    // striped canopy (cosmetic)
    for (let i = 0; i < 15; i++) { ctx.fillStyle = i % 2 ? '#fff4e0' : '#e4572e'; ctx.fillRect(x0 + i * 10, 300, 10, 14); }
    ctx.fillStyle = '#fff4e0';
    for (let i = 0; i < 15; i++) { ctx.fillStyle = i % 2 ? '#fff4e0' : '#e4572e'; ctx.beginPath(); ctx.arc(x0 + i * 10 + 5, 314, 5, 0, Math.PI); ctx.fill(); }
    ctx.fillStyle = C.ink; ctx.fillRect(x0, 298, x1 - x0, 3);
    // warm window with an oven glow, and the shop door
    ctx.fillStyle = '#7a2c1c'; rr(8, 330, 62, 64, 8); ctx.fill();
    const glow = 0.85 + 0.15 * Math.sin(G.clock * 3);
    ctx.fillStyle = '#ffd77a'; ctx.globalAlpha = glow; rr(12, 334, 54, 56, 6); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#e4572e'; circle(39, 362, 17); ctx.fill();
    ctx.fillStyle = '#ffcf5a'; circle(39, 362, 13.5); ctx.fill();
    ctx.fillStyle = '#e2452b'; for (const [dx, dy] of [[-5, -4], [5, -3], [0, 6], [-7, 4], [7, 5]]) { circle(39 + dx, 362 + dy, 2.2); ctx.fill(); }
    ctx.fillStyle = '#5a2a1a'; rr(86, 336, 52, roadY - 336 + 2, 6); ctx.fill();
    ctx.fillStyle = '#7a3a24'; rr(91, 341, 42, roadY - 341, 4); ctx.fill();
    ctx.fillStyle = C.gold; circle(126, 400, 2.6); ctx.fill();
  }

  function pzDrawStall(s, roadY) {
    const x = s.x, y = roadY - 64;
    ctx.save(); ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#8a5833'; ctx.fillRect(x + 4, y + 14, 4, 50); ctx.fillRect(x + 72, y + 14, 4, 50);
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#fff4e0' : s.col; ctx.fillRect(x + i * 10, y, 10, 14); }
    ctx.fillStyle = '#c98b5a'; ctx.fillRect(x, y + 40, 80, 24);
    ctx.fillStyle = 'rgba(28,26,54,0.2)'; ctx.fillRect(x, y + 40, 80, 3);
    const fruit = ['#e4572e', '#ffc53d', '#8fe3b0'];
    for (let i = 0; i < 7; i++) { ctx.fillStyle = fruit[(i + (s.x / 10 | 0)) % 3]; circle(x + 8 + i * 10.5, y + 36, 5); ctx.fill(); }
    ctx.restore();
  }

  function pzDrawHouse(st) {
    const d = st.R.door, h = st.def.house || { num: '1', col: '#ffd6a5' };
    if (!d) return;
    const x0 = d.x - 45, x1 = d.x + 105, top = 262, roadY = st.R.roadY;
    ctx.fillStyle = h.col; ctx.fillRect(x0, top, x1 - x0, roadY - top);
    ctx.fillStyle = 'rgba(28,26,54,0.12)'; ctx.fillRect(x1 - 6, top, 6, roadY - top);
    ctx.fillStyle = '#c0583c'; ctx.beginPath(); ctx.moveTo(x0 - 10, top + 2); ctx.lineTo((x0 + x1) / 2, 218); ctx.lineTo(x1 + 10, top + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a3462e'; ctx.fillRect(x0 + 108, 222, 12, 26);
    // lit upper window with the customer peeking out
    const wx = d.cx - 18, wy = 282;
    ctx.fillStyle = '#7a4a22'; rr(wx - 3, wy - 3, 42, 36, 4); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; rr(wx, wy, 36, 30, 3); ctx.fill();
    const delivered = st.phase === 'deliver';
    const bob = delivered ? Math.sin(G.clock * 10) * 2 : Math.sin(G.clock * 2) * 1;
    ctx.fillStyle = '#b48cff'; circle(d.cx, wy + 22 + bob, 10); ctx.fill();
    ctx.fillStyle = C.ink; circle(d.cx - 4, wy + 20 + bob, 1.6); ctx.fill(); circle(d.cx + 4, wy + 20 + bob, 1.6); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(d.cx, wy + 23 + bob, 3.5, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = '#7a4a22'; ctx.fillRect(wx + 17, wy, 2, 30);
    // door: opens on delivery
    ctx.fillStyle = '#5a3a20'; rr(d.x + 4, d.y + 2, 52, 58, 7); ctx.fill();
    if (delivered) {
      ctx.fillStyle = C.doorIn; rr(d.x + 6, d.y + 4, 48, 56, 6); ctx.fill();
      ctx.fillStyle = '#8a5833'; ctx.beginPath(); ctx.moveTo(d.x + 6, d.y + 4); ctx.lineTo(d.x + 18, d.y + 10); ctx.lineTo(d.x + 18, d.y + 56); ctx.lineTo(d.x + 6, d.y + 60); ctx.closePath(); ctx.fill();
      const wave = Math.sin(G.clock * 14) * 0.5;
      ctx.save(); ctx.translate(d.cx + 10, d.y + 30); ctx.rotate(wave);
      ctx.fillStyle = '#f2c29b'; circle(0, -8, 6); ctx.fill(); ctx.fillRect(-2, -4, 4, 12);
      ctx.restore();
    } else {
      ctx.fillStyle = '#8a5833'; rr(d.x + 6, d.y + 4, 48, 56, 6); ctx.fill();
      ctx.fillStyle = 'rgba(28,26,54,0.18)'; rr(d.x + 12, d.y + 10, 16, 20, 3); ctx.fill(); rr(d.x + 32, d.y + 10, 16, 20, 3); ctx.fill();
      rr(d.x + 12, d.y + 36, 16, 18, 3); ctx.fill(); rr(d.x + 32, d.y + 36, 16, 18, 3); ctx.fill();
      ctx.fillStyle = C.gold; circle(d.x + 47, d.y + 34, 2.6); ctx.fill();
    }
    // house number
    ctx.fillStyle = '#fff8ea'; rr(d.cx - 14, d.y - 15, 28, 16, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(28,26,54,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    text(h.num, d.cx, d.y - 6.5, 13, C.ink, 'center', 'body');
    // doormat
    ctx.fillStyle = '#b84a3a'; rr(d.cx - 35, roadY - 5, 70, 5, 2); ctx.fill();
  }

  // the order bubble over the door: "4 × [box]" (after a retry: "3 is fine!")
  function pzDrawOrder(st) {
    const d = st.R.door;
    if (!d || st.phase === 'deliver') return;
    const sc = hudBig() ? 1.35 : 1;
    const relief = st.fx.reliefT > 0;
    const label = relief ? st.need + ' is fine!' : st.need + ' ×';
    ctx.font = Math.round(17 * sc) + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const tw = ctx.measureText(label).width, w = tw + (relief ? 20 : 48) * sc, h = 28 * sc;
    const cx = Math.min(W - w / 2 - 4, d.cx), cy = d.y - 38 - (sc - 1) * 14;
    ctx.save(); ctx.translate(cx, cy);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = relief ? C.gold : C.ink; ctx.lineWidth = 2;
    rr(-w / 2, -h / 2, w, h, 9); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, h / 2 - 1); ctx.lineTo(6, h / 2 - 1); ctx.lineTo(d.cx - cx, h / 2 + 8); ctx.closePath(); ctx.fill();
    if (relief) text(label, 0, 1, Math.round(17 * sc), '#e4572e', 'center');
    else {
      text(label, -w / 2 + 10 * sc, 1, Math.round(17 * sc), C.ink, 'left');
      ctx.save(); ctx.translate(w / 2 - 20 * sc, 0); ctx.scale(0.55 * sc, 0.55 * sc); pzBoxShape(false); ctx.restore();
    }
    ctx.restore();
  }

  function pzDrawStreet(st) {
    const R = st.R, map = st.def.map, ry = R.roadY, row = ry / T;
    // asphalt band, a pale kerb on top, lane dashes
    ctx.fillStyle = C.stone; ctx.fillRect(0, ry, W, H - ry);
    ctx.fillStyle = C.stoneLight; ctx.fillRect(0, ry + 8, W, 20);
    ctx.fillStyle = 'rgba(28,26,54,0.18)'; for (let x = 15; x < W; x += 30) ctx.fillRect(x, ry + 8, 2, 20);
    ctx.fillStyle = C.stoneEdge; ctx.fillRect(0, ry + 28, W, 4);
    ctx.fillStyle = 'rgba(255,240,200,0.55)'; for (let x = 10; x < W; x += 64) ctx.fillRect(x, ry + 58, 30, 4);
    for (let tx = 0; tx < COLS; tx++) {
      const ch = (map[row] || '')[tx] || '#', x = tx * T;
      if (ch === 'p' || ch === 'm') continue;
      ctx.fillStyle = C.grassDark; ctx.fillRect(x - 0.5, ry, T + 1, 9);
      ctx.fillStyle = C.grass; ctx.fillRect(x - 0.5, ry, T + 1, 6);
    }
    if (st.room === 1) { // wet road shine
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      for (let i = 0; i < 9; i++) { const x = (hash(i, 77) % 900) + 20; ctx.fillRect(x, ry + 38 + (i % 3) * 12, 26 + (i % 4) * 8, 2); }
    }
    // puddles (one per run of p tiles)
    for (const pd of R.puddles) {
      const w = pd.x1 - pd.x0, y = pd.ty * T;
      ctx.fillStyle = C.stoneEdge; rr(pd.x0 - 1, y - 1, w + 2, 13, 5); ctx.fill();
      ctx.fillStyle = 'rgba(127,200,255,0.9)'; rr(pd.x0 + 1, y + 2, w - 2, 9, 4); ctx.fill();
      ctx.strokeStyle = '#d6f0ff'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let x = pd.x0 + 4; x <= pd.x1 - 4; x += 3) { const yy = y + 5 + Math.sin(G.clock * 3 + x * 0.25) * 1.2; if (x === pd.x0 + 4) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
      ctx.stroke();
    }
    // raised parts: ramps and the cobbled plateau
    for (const rs of R.raised) {
      const path = dy => {
        ctx.beginPath(); ctx.moveTo(rs.x0, ry + 2);
        for (let x = rs.x0; x <= rs.x1; x += 3) ctx.lineTo(x, Math.min(ry + 2, pzGAt(R, Math.min(x, W - 1)) + dy));
        ctx.lineTo(rs.x1, ry + 2); ctx.closePath();
      };
      path(0); ctx.fillStyle = C.grass; ctx.fill();
      path(6); ctx.fillStyle = C.grassDark; ctx.fill();
      path(8); ctx.fillStyle = C.stone; ctx.fill();
    }
    // cobbles
    for (const cb of R.cobbles) {
      const x = cb.tx * T, y = cb.ty * T;
      if (cb.ty === row) { ctx.fillStyle = C.stone; ctx.fillRect(x, y, T, 12); }
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = '#9a97a8'; ctx.strokeStyle = '#6f6c80'; ctx.lineWidth = 1.2;
        rr(x + 10 * k + 0.6, y - 3, 8.8, 10, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 10 * k + 3, y - 1, 4, 2);
      }
    }
    // speed bumps
    for (const bp of R.bumps) {
      const x0 = bp.x0, y1 = (bp.ty + 1) * T;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(x0, y1);
      for (let u = 0; u <= 30; u += 2) ctx.lineTo(x0 + u, y1 - PZ.bumpH * Math.sin(Math.PI * u / 30));
      ctx.closePath();
      ctx.fillStyle = C.gold; ctx.fill(); ctx.clip();
      ctx.fillStyle = C.ink; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x0 + 3 + i * 9, y1); ctx.lineTo(x0 + 8 + i * 9, y1 - 11); ctx.lineTo(x0 + 11 + i * 9, y1 - 11); ctx.lineTo(x0 + 6 + i * 9, y1); ctx.fill(); }
      ctx.restore();
      ctx.beginPath(); ctx.moveTo(x0, y1);
      for (let u = 0; u <= 30; u += 2) ctx.lineTo(x0 + u, y1 - PZ.bumpH * Math.sin(Math.PI * u / 30));
      ctx.strokeStyle = C.goldDark; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // crates
    for (const c of R.crates) {
      const x = c.x0, y = c.top;
      ctx.fillStyle = C.plankDark; rr(x, y, T, T, 3); ctx.fill();
      ctx.fillStyle = C.plank; ctx.fillRect(x + 3, y + 3, T - 6, T - 6);
      ctx.strokeStyle = C.plankDark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + T - 4, y + T - 4); ctx.moveTo(x + T - 4, y + 4); ctx.lineTo(x + 4, y + T - 4); ctx.stroke();
      ctx.fillStyle = '#e4572e'; circle(x + 9, y + 21, 3.4); ctx.fill();
      ctx.fillStyle = '#5fab55'; ctx.fillRect(x + 8, y + 16, 2, 2.5);
    }
  }

  function pzDrawAwnings(st) {
    const R = st.R, hx0 = R.door ? R.door.x - 45 : W;
    for (const a of R.awnings) {
      const { x0, x1, y0 } = a, onHouse = x1 > hx0;
      // poles down to the road (behind the players); a porch roof hangs on the house at its right end
      ctx.fillStyle = '#6b4630';
      ctx.fillRect(x0 + 2, y0 + 20, 5, R.roadY - y0 - 20);
      if (!onHouse) ctx.fillRect(x1 - 7, y0 + 20, 5, R.roadY - y0 - 20);
      // sloped top and striped valance; the scallops end exactly at the collision line (y0 + 30)
      ctx.fillStyle = '#c0583c';
      ctx.beginPath(); ctx.moveTo(x0 - 6, y0 + 6); ctx.lineTo(x0 + 10, y0 - 10); ctx.lineTo(x1 - 10, y0 - 10); ctx.lineTo(x1 + 6, y0 + 6); ctx.closePath(); ctx.fill();
      for (let x = x0 - 5, i = 0; x < x1 + 5; x += 10, i++) {
        ctx.fillStyle = i % 2 ? '#fff4e0' : '#e4572e';
        ctx.fillRect(x, y0 + 6, 10, 19);
        ctx.beginPath(); ctx.arc(x + 5, y0 + 25, 5, 0, Math.PI); ctx.fill();
      }
      ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.fillRect(x0 - 5, y0 + 6, x1 - x0 + 10, 3);
      ctx.fillStyle = C.ink; rr(x0 - 7, y0 + 3, x1 - x0 + 14, 4, 2); ctx.fill();
    }
  }

  function pzDrawWindsock(st) {
    const R = st.R;
    if (!R.wind) return;
    const px = R.wind.x1 + 12, base = R.roadY, top = base - 90;
    ctx.fillStyle = C.ink; ctx.fillRect(px - 2, top, 4, 90);
    circle(px, top, 4); ctx.fill();
    let ang;
    if (st.windState === 'gust') ang = Math.PI + Math.sin(G.clock * 75) * 0.06 * st.windG + (1 - st.windG) * -1.1;
    else if (st.windState === 'warn') ang = Math.PI - 0.52 + Math.sin(G.clock * 38) * 0.26;
    else ang = Math.PI / 2 + 0.1 + Math.sin(G.clock * 1.5) * 0.05;
    ctx.save(); ctx.translate(px, top + 4); ctx.rotate(ang);
    for (let i = 0; i < 3; i++) {
      const x = i * 11.5, hw = 7 - i * 1.6, hw2 = 7 - (i + 1) * 1.6;
      const wob = st.windState === 'calm' ? 0 : Math.sin(G.clock * 30 + i) * 1.5;
      ctx.fillStyle = i % 2 ? '#ffffff' : '#ff8a3d';
      ctx.beginPath(); ctx.moveTo(x, -hw + wob); ctx.lineTo(x + 11.5, -hw2 + wob); ctx.lineTo(x + 11.5, hw2 + wob); ctx.lineTo(x, hw + wob); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    if (st.windState === 'gust') {
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * st.windG).toFixed(2) + ')'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const y = 270 + i * 26 + Math.sin(i * 2.3) * 8, len = 40 + (i % 3) * 20;
        const x = R.wind.x1 - (((G.clock * 520 + i * 137) % (R.wind.x1 - R.wind.x0 + 120)));
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
      }
    }
  }

  /* ---------- the carry: arms, tray and the stack (drawn in front of the players) ---------- */
  function pzDrawBird(x, y, f, flap, peck, slice) { // a pigeon (f: 1 faces right), feet at (x, y)
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    ctx.fillStyle = '#9aa3b5';
    ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(-15, -12); ctx.lineTo(-14, -5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -8, 9, 6, -0.15, 0, Math.PI * 2); ctx.fill();
    const hx = 7 + peck * 3, hy = -15 + peck * 8;
    ctx.fillStyle = '#7fc8a8'; circle(hx - 2.5, hy + 4.5, 3); ctx.fill();
    ctx.fillStyle = '#7d879b'; circle(hx, hy, 4.6); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(hx + 1.6, hy - 1, 1.7); ctx.fill();
    ctx.fillStyle = C.ink; circle(hx + 2, hy - 1, 0.9); ctx.fill();
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(hx + 4, hy - 0.6); ctx.lineTo(hx + 8.5, hy + 0.8); ctx.lineTo(hx + 4, hy + 1.8); ctx.closePath(); ctx.fill();
    if (slice) {
      ctx.fillStyle = '#ffcf5a'; ctx.beginPath(); ctx.moveTo(hx + 6, hy + 1); ctx.lineTo(hx + 15, hy - 2); ctx.lineTo(hx + 14, hy + 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e2452b'; circle(hx + 11.5, hy + 1.5, 1.3); ctx.fill();
    }
    ctx.fillStyle = '#b8c0cf';
    if (flap) { ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(5, -10); ctx.lineTo(-1, -10 - flap * 13); ctx.closePath(); ctx.fill(); }
    else {
      ctx.beginPath(); ctx.ellipse(-1, -8, 6, 3.4, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ff8a6b'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-1, -2.5); ctx.lineTo(-1, 0); ctx.moveTo(2.5, -2.5); ctx.lineTo(2.5, 0); ctx.stroke();
    }
    ctx.restore();
  }

  function pzBoxShape(open, eaten) {
    if (open) {
      ctx.fillStyle = '#f4e4c1'; rr(-20, -3, 40, 8, 2); ctx.fill();
      ctx.strokeStyle = '#c49a5a'; ctx.lineWidth = 1.5; ctx.stroke();
      if (eaten) { ctx.fillStyle = '#e8a24a'; for (const dx of [-9, -2, 5, 11]) { circle(dx, -3.5, 1.2); ctx.fill(); } }
      else {
        ctx.fillStyle = '#e8a24a'; ctx.beginPath(); ctx.ellipse(0, -4, 17, 4.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffcf5a'; ctx.beginPath(); ctx.ellipse(0, -4.5, 14, 3.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e2452b'; for (const dx of [-8, -1, 6, 10]) { circle(dx, -4.5 + (dx % 3) * 0.3, 1.8); ctx.fill(); }
      }
      ctx.save(); ctx.translate(-20, -3); ctx.rotate(-2.1);
      ctx.fillStyle = '#efdcb4'; rr(0, -2, 40, 4, 1.5); ctx.fill(); ctx.strokeStyle = '#c49a5a'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.fillStyle = '#f4e4c1'; rr(-20, -5, 40, 10, 2); ctx.fill();
    ctx.strokeStyle = '#c49a5a'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#e4572e'; ctx.fillRect(-18.5, -1, 37, 3);
    ctx.fillStyle = '#ffcf5a'; ctx.beginPath(); ctx.moveTo(-4, -3.5); ctx.lineTo(4, -3.5); ctx.lineTo(0, 3.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e2452b'; circle(0, -1.5, 1.2); ctx.fill();
  }

  function pzSquash(st) {
    for (const pc of st.pc) {
      const p = G.players[pc.id];
      let sx = 1 + 0.18 * pc.duck, sy = 1 - 0.38 * pc.duck;
      if (pc.ready >= 0) { sx = Math.max(sx, 1.1); sy = Math.min(sy, 0.86); }
      if (pc.steady) { sx = Math.max(sx, 1.06); sy = Math.min(sy, 0.95); }
      const lt = st.clock - pc.landT;
      if (pc.grounded && lt < 0.14 && pc.landV > 200) sy = Math.min(sy, 0.8 + 0.2 * lt / 0.14);
      if (!pc.grounded && pc.vy < 0) { sy = Math.max(sy, 1.08); sx = Math.min(sx, 0.94); }
      p.sx = sx; p.sy = sy;
      // pushing alone: the pusher leans forward
      const lean = st.phase === 'play' && st.mode === 'push' && st.pusher === pc.id ? st.pushDir * 3 * Math.min(1, st.strain * 3) : 0;
      p.x = pc.xc - PW / 2 + lean;
    }
  }

  function pzDrawCarry(st) {
    const g = pzGeom(st), del = st.fx.del;
    const shown = st.phase === 'deliver' && del ? Math.max(0, del.n - del.launched) : st.n;
    const n = st.phase === 'deliver' && del ? del.n : st.n;
    // arms
    for (const pc of st.pc) {
      const p = G.players[pc.id], top = pc.feet - PH * p.sy, hand = pzHand(pc), xc = p.x + PW / 2;
      let tx = [xc - 4, xc + 4], ty = [hand, hand];
      if (pc.steady && shown > 0) {
        const b0 = pzBoxAt(st, g, 0, n), side = pc.id === st.left ? -1 : 1;
        tx = [b0.x + side * 23, b0.x + side * 21]; ty = [b0.y + 3, b0.y - 3];
      }
      ctx.strokeStyle = PDARK[pc.id]; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(xc - 7, top + 7); ctx.lineTo(tx[0], ty[0]); ctx.moveTo(xc + 7, top + 7); ctx.lineTo(tx[1], ty[1]); ctx.stroke();
      ctx.fillStyle = PCOL[pc.id]; circle(tx[0], ty[0], 3); ctx.fill(); circle(tx[1], ty[1], 3); ctx.fill();
      if (pc.squeezed) { // sweat drops under an awning
        ctx.fillStyle = '#7fc8ff';
        for (const s of [-1, 1]) { const f = (G.clock * 2 + (s > 0 ? 0.5 : 0)) % 1; ctx.beginPath(); ctx.ellipse(xc + s * 13, top + 4 + f * 8, 2, 3, 0, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    // tray
    const xl = st.pc[st.left], xr = st.pc[st.right];
    ctx.save(); ctx.translate(st.X, (g.hl + g.hr) / 2); ctx.rotate(g.a);
    const half = PZ.span / 2 + 8;
    ctx.fillStyle = C.plankDark; rr(-half, -PZ.trayTh, half * 2, PZ.trayTh, 2); ctx.fill();
    ctx.fillStyle = C.plank; rr(-half, -PZ.trayTh, half * 2, PZ.trayTh - 2, 2); ctx.fill();
    ctx.fillStyle = C.plankDark; circle(-half + 5, -3.5, 1.2); ctx.fill(); circle(half - 5, -3.5, 1.2); ctx.fill();
    ctx.restore();
    // boxes (the bake-in drops them on one by one at room start)
    const warn = Math.abs(st.lean) > 0.6 && st.phase === 'play';
    for (let i = 0; i < shown; i++) {
      const b = pzBoxAt(st, g, i, n);
      let x = b.x, y = b.y, rot = b.rot;
      const bakeT = st.fx.bake - 0.08 * i;
      if (bakeT < 0) continue;
      if (bakeT < 0.12) y -= 40 * (1 - bakeT / 0.12) * (1 - bakeT / 0.12);
      const isTop = i === shown - 1;
      if (isTop && st.teeter) {
        const f = st.teeter.t / PZ.teeter, side = st.teeter.side;
        x += side * (6 + 22 * f) * Math.cos(rot); y += side * (6 + 22 * f) * Math.sin(rot); rot += side * 0.35 * f;
      }
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      pzBoxShape(false);
      if (warn && i >= shown - 2) {
        ctx.globalAlpha = 0.55 + 0.45 * Math.sin(G.clock * 16);
        ctx.strokeStyle = '#e4572e'; ctx.lineWidth = 2; rr(-21, -6, 42, 12, 3); ctx.stroke();
      }
      ctx.restore();
      if (isTop && st.teeter && st.phase === 'play') {
        const bx = x + st.teeter.side * 36, by = y - 8 + Math.sin(G.clock * 14) * 1.5;
        ctx.fillStyle = '#e4572e'; circle(bx, by, 10); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        text('!', bx, by + 1, 16, '#ffffff', 'center');
      }
    }
    // flyers: delivered boxes on their way into the door
    for (const f of st.fx.flyers) {
      const t = clamp(f.t / 0.35, 0, 1), x = f.x0 + (f.x1 - f.x0) * t, y = f.y0 + (f.y1 - f.y0) * t - 60 * Math.sin(Math.PI * t);
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2.4); ctx.scale(1 - 0.4 * t, 1 - 0.4 * t); pzBoxShape(false); ctx.restore();
    }
  }

  function pzDrawFx(st) {
    for (const b of st.fx.boxes) {
      const a = b.hitT === undefined ? 1 : clamp(1 - (b.t - b.hitT - 1.6) / 0.8, 0, 1);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(b.x, b.y); ctx.rotate(b.rot); pzBoxShape(b.open, b.eaten); ctx.restore();
    }
    for (const bd of st.fx.birds) {
      if (bd.t < 0) continue;
      let x, y, flap = 0, peck = 0, slice = false;
      if (bd.t < 0.45) { const u = bd.t / 0.45, e = 1 - (1 - u) * (1 - u); x = bd.x + (bd.x1 - bd.x) * e; y = bd.y + (bd.y1 - bd.y) * e - 30 * Math.sin(Math.PI * u); flap = Math.sin(bd.t * 40); }
      else if (bd.t < 1.0) { x = bd.x1; y = bd.y1; peck = Math.max(0, Math.sin((bd.t - 0.45) * 22)); slice = bd.t > 0.95; }
      else { const u = (bd.t - 1.0) / 0.7; x = bd.x1 + bd.side * 240 * u * u; y = bd.y1 - 260 * u; flap = Math.sin(bd.t * 40); slice = true; }
      pzDrawBird(x, y, -bd.side, flap, peck, slice);
    }
    for (const l of st.fx.leaves) {
      ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.r); ctx.fillStyle = l.col; ctx.beginPath(); ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    for (const f of st.fx.floats) {
      ctx.save(); ctx.globalAlpha = clamp((f.max - f.t) / 0.3, 0, 1);
      bigText(f.str, f.x, f.y, f.size, f.col, 1 + 0.3 * Math.max(0, 1 - f.t / 0.15));
      ctx.restore();
    }
    // delivered: banner and stars over the door
    const del = st.fx.del, d = st.R.door;
    if (del && st.phase === 'deliver' && d) {
      const sc = hudBig() ? 1.3 : 1, cx = W / 2, cy = hudBig() ? 128 : 104;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(-72, -22, 144, 64, 14); ctx.fill();
      text('Delivered!', 0, -6, 20, C.paper, 'center');
      for (let s = 0; s < 3; s++) {
        const on = s < del.shown, pop = on ? 1 : 0.85;
        pzStar(-30 + s * 30, 22, 11 * pop, on ? C.gold : 'rgba(255,255,255,0.22)');
      }
      ctx.restore();
    }
  }

  function pzStar(x, y, r, col) {
    ctx.fillStyle = col; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    ctx.closePath(); ctx.fill();
  }

  /* ---------- prompts (world space; at most 2 at once) ---------- */
  function pzBubble(x, y, label, col, sc, outline) {
    ctx.font = Math.round(18 * sc) + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const w = ctx.measureText(label).width + 26 * sc, h = 30 * sc;
    const cx = clamp(x, w / 2 + 6, W - w / 2 - 6), s = 1 + 0.06 * Math.sin(G.clock * 9);
    ctx.save(); ctx.translate(cx, y); ctx.scale(s, s);
    ctx.fillStyle = '#ffffff'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = outline || col; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - cx - 6, h / 2 - 1.5); ctx.lineTo(x - cx + 6, h / 2 - 1.5); ctx.lineTo(x - cx, h / 2 + 7); ctx.closePath(); ctx.fillStyle = '#ffffff'; ctx.fill();
    text(label, 0, 1, Math.round(18 * sc), col, 'center');
    ctx.restore();
  }
  // a key bubble on the road under a player's feet; the back player's grows to the left, the front one's to the
  // right, so the two never overlap (they stand only 90 px apart)
  function pzKeyBubble(st, pc, label, sc, word) {
    const x = pc.xc, y = pc.feet + 25 * sc;
    const str = word ? word + ' ' + label : label;
    ctx.font = '700 ' + Math.round(14 * sc) + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = Math.max(26 * sc, ctx.measureText(str).width + 16 * sc), h = 24 * sc;
    const out = pc.id === st.left ? -1 : 1, lim = PZ.span / 2 - 4;
    const cx0 = w / 2 <= lim ? x : x + out * (w / 2 - lim);
    const cx = clamp(cx0, w / 2 + 4, W - w / 2 - 4), s = 1 + 0.08 * Math.max(0, Math.sin(G.clock * 10));
    ctx.save(); ctx.translate(cx, y); ctx.scale(s, s);
    ctx.fillStyle = PCOL[pc.id]; ctx.beginPath(); ctx.moveTo(x - cx - 5 * sc, -h / 2 + 1); ctx.lineTo(x - cx + 5 * sc, -h / 2 + 1); ctx.lineTo(x - cx, -h / 2 - 7 * sc); ctx.closePath(); ctx.fill();
    rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    text(str, 0, 1, Math.round(14 * sc), '#ffffff', 'center', 'body');
    ctx.restore();
  }
  function pzArrow(x, y, dir, col, len) { // a fat arrow shape (dir: 1 right, -1 left, 2 up)
    ctx.save(); ctx.translate(x, y);
    if (dir === 2) ctx.rotate(-Math.PI / 2); else if (dir < 0) ctx.scale(-1, 1);
    ctx.fillStyle = col; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-len / 2, -4); ctx.lineTo(len / 2 - 9, -4); ctx.lineTo(len / 2 - 9, -10); ctx.lineTo(len / 2, 0); ctx.lineTo(len / 2 - 9, 10); ctx.lineTo(len / 2 - 9, 4); ctx.lineTo(-len / 2, 4); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore();
  }

  function pzPrompts(st) {
    const R = st.R, ps = st.pc, L = ps[st.left], Rp = ps[st.right], out = [];
    if (st.phase !== 'play') return out;
    // (rev2) the teaching prompts show during the room card too (players can already move then); only the
    // "walk with your partner" nudges wait for it to go
    const intro = G.introT > 0.2;
    if (st.teeter) out.push('teeter');
    if (R.wind && (st.windState === 'warn' || st.windState === 'gust') && st.X > R.wind.x0 - 60 && st.X < R.wind.x1 + 60) out.push('wind');
    const top = pzStackBase(st) - st.n * PZ.boxH;
    // look ahead in the walking direction (~0.7 s at walking speed), so there is time to react
    const ahead = st.n > 0 && top < pzCeilOver(R, st.X - 50 + Math.min(0, st.V) * 0.7, st.X + 50 + Math.max(0, st.V) * 0.7);
    if (st.awnBonkT > 0 || ahead) out.push('duck');
    if (st.crateT > 0.8) out.push('crate');
    const rL = L.ready >= 0 && L.grounded, rR = Rp.ready >= 0 && Rp.grounded;
    if (rL !== rR && L.grounded && Rp.grounded) out.push('ready');
    if (!intro) {
      // never tell a steadier to walk while the stack needs steadying (teeter, wind, or a big wobble)
      const steadyTime = out.includes('teeter') || out.includes('wind');
      const steadying = ps.some(pc => pc.steadyHeld) && Math.abs(st.lean) > 0.3;
      if (st.mode === 'push' && st.pushT > 0.5 && !steadyTime && !steadying) out.push('push');
      if (st.mode === 'tug' && st.tugT > 0.6 && !steadyTime) out.push('tug');
      const afk = ps.find(pc => pc.idleT >= PZ.afkT && ps[1 - pc.id].idleT < 3 && !pzCpu(pc.id));
      if (afk) out.push('afk');
      if (R.door && Math.abs(st.X - R.door.cx) < 160) out.push('door');
    }
    return out.slice(0, 2);
  }

  function pzDrawPrompts(st) {
    const list = pzPrompts(st);
    if (!list.length) return;
    const sc = hudBig() ? 1.5 : 1, ps = st.pc, R = st.R;
    let top = Math.max(96, pzStackBase(st) - st.n * PZ.boxH - 26 * sc);
    // (rev2) while the room card (y 168-288) is up, slide the big bubbles down below it (over the stack top)
    const nMain = list.filter(p => p === 'teeter' || (p === 'wind' && !list.includes('teeter')) || p === 'duck' || p === 'afk').length;
    if (G.introT > 0 && nMain) {
      const under = 288 + 15 * sc + 4 + (nMain - 1) * 38 * sc;
      if (top < under) top += (under - top) * clamp(G.introT / 0.5, 0, 1);
    }
    let slot = 0;
    const main = (label, col) => { pzBubble(st.X, top - slot * 38 * sc, label, col, sc); slot++; };
    const keyed = new Set();
    const key = (pc, what, word) => { if (keyed.has(pc.id) || pzCpu(pc.id)) return; keyed.add(pc.id); pzKeyBubble(st, pc, pzKey(pc.id, what), sc, word); };
    for (const pr of list) {
      if (pr === 'teeter') {
        main(Math.abs(st.V) > PZ.steadyMaxV ? 'STOP!' : 'STEADY!', '#e4572e');
        for (const pc of ps) if (!pc.steady) key(pc, 'steady', 'hold');
      } else if (pr === 'wind') {
        if (list.includes('teeter')) continue;   // STEADY!/STOP! already says it (one big bubble, not two)
        main(st.windState === 'warn' ? 'Wind! Stop + steady' : 'Hold steady!', '#2f6fd6');
        for (const pc of ps) if (!pc.steady) key(pc, 'steady', 'hold');
      } else if (pr === 'duck') {
        main('DUCK!', '#b9850f');
        for (const pc of ps) if (pc.duck < 0.9) key(pc, 'duck');
      } else if (pr === 'crate') {
        const c = R.crates.reduce((b, c) => (Math.abs(c.x0 - st.X) < Math.abs(b.x0 - st.X) ? c : b));
        pzBubble(c.x0 + 15, c.top - 22 * sc - (sc - 1) * 10, '1-2-3 HOP!', '#2f9a5a', sc);
        for (const pc of ps) key(pc, 'hop');
      } else if (pr === 'ready') {
        for (const pc of ps) if (pc.ready < 0) key(pc, 'hop', 'HOP!');
      } else if (pr === 'push') {
        const idle = ps.find(pc => pc.id !== st.pusher);
        if (idle && !pzCpu(idle.id)) {
          pzArrow(idle.xc, idle.feet + 52 * sc, st.pushDir, PCOL[st.pusher], 34 * sc);
          key(idle, st.pushDir > 0 ? 'right' : 'left');
        }
      } else if (pr === 'tug') {
        // pulling apart: the arrow (toward the door) goes under the one walking away from it
        const d = R.door, dir = d && st.X > d.cx + PZ.deliverR ? -1 : 1;
        const away = ps.find(pc => pc.lastDir === -dir && pc.relT === 0) || ps.find(pc => pc.lastDir === -dir);
        const other = away && ps[1 - away.id];
        if (away) {
          pzArrow(away.xc, away.feet + 52 * sc, dir, PCOL[other.id], 34 * sc);
          key(away, dir > 0 ? 'right' : 'left');
        }
      } else if (pr === 'afk') {
        const idle = ps.find(pc => pc.idleT >= PZ.afkT);
        if (idle) { main(NAMES[idle.id] + '! Grab your end!', PCOL[idle.id]); key(idle, 'walk'); }
      } else if (pr === 'door') {
        const d = R.door, ry = R.roadY, pulse = 0.5 + 0.5 * Math.sin(G.clock * 6);
        ctx.fillStyle = 'rgba(255,215,90,' + (0.35 + 0.35 * pulse).toFixed(2) + ')'; rr(d.cx - PZ.deliverR, ry - 3, PZ.deliverR * 2, 10, 5); ctx.fill();
        const bob = Math.sin(G.clock * 7) * 4;
        ctx.font = '700 ' + Math.round(15 * sc) + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
        // (rev2) keep the label on screen with the big phone HUD (sc 1.5 put it at y 546)
        const lw = ctx.measureText('Stop here!').width + 24 * sc, ly = Math.min(ry + 64 * sc, H - 14 * sc);
        pzArrow(d.cx, Math.min(ry + 30 * sc, ly - 30 * sc) + bob, 2, C.gold, 26 * sc);
        const lx = Math.min(W - lw / 2 - 4, d.cx);
        ctx.fillStyle = 'rgba(28,26,54,0.85)'; rr(lx - lw / 2, ly - 12 * sc, lw, 24 * sc, 12 * sc); ctx.fill();
        text('Stop here!', lx, ly + 1, Math.round(15 * sc), C.gold, 'center', 'body');
      }
    }
  }

  // timers that drive prompts (crate blocked, pushing alone)
  function pzTimers(st, dt) {
    const R = st.R, ps = st.pc;
    const atCrate = R.crates.some(c => ps.some(pc => pc.grounded && pc.feet > c.top + 1 && c.x0 - pc.xc > 0 && c.x0 - pc.xc < 18));
    st.crateT = atCrate && Math.abs(st.V) < 5 ? st.crateT + dt : 0;
    if (st.mode === 'push') {
      st.pushT += dt;
      const pc = ps[st.pusher];
      if (pc && pc.grounded) {
        st.fx.dustT -= dt; st.fx.gruntT -= dt;
        if (st.fx.dustT <= 0) { st.fx.dustT = 0.15; pzPuff(pc.xc - st.pushDir * 10, pc.feet, 1, 'rgba(255,255,255,0.7)'); }
        if (st.fx.gruntT <= 0) { st.fx.gruntT = 0.45; Sfx.play('pzGrunt', pc.id); pzRumble(0, 0.2, 60, pc.id); }
      }
    } else { st.pushT = 0; st.fx.gruntT = 0.2; }
    st.tugT = st.mode === 'tug' ? st.tugT + dt : 0;
    if (st.windState === 'gust' && st.nSteady === 2 && st.X > R.wind.x0 - 60 && st.X < R.wind.x1 + 10) st.gustHeld = true;
  }

  /* ---------- HUD ---------- */
  function pzHud(st) {
    const big = hudBig(), s = big ? 1.5 : 1;
    const n = st.phase === 'deliver' && st.fx.del ? st.fx.del.n : st.n;
    const ncol = n > st.need + 1 ? C.paper : n === st.need + 1 ? C.gold : '#ff8a6b';
    const fs = Math.round(16 * s), fb = Math.round(12 * s), ft = Math.round(14 * s);
    ctx.font = fs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const nw = ctx.measureText(String(n)).width;
    ctx.font = '700 ' + fb + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const needS = 'need ' + st.need, rw = ctx.measureText(needS).width;
    ctx.font = '700 ' + ft + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const tS = fmtTime(G.time), tw = ctx.measureText(tS).width;
    const h = 28 * s, w = 14 * s + 26 * s + nw + 8 * s + rw + 18 * s + tw + 14 * s;
    const px = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2;
    let x = px + 14 * s;
    ctx.save(); ctx.translate(x + 12 * s, cy + 0.5); ctx.scale(0.55 * s, 0.55 * s); pzBoxShape(false); ctx.restore();
    x += 26 * s;
    const pop = st.fx.pop > 0 ? 1 + 0.3 * st.fx.pop / 0.25 : 1;
    ctx.save(); ctx.translate(x + nw / 2, cy + 1); ctx.scale(pop, pop); text(String(n), 0, 0, fs, ncol, 'center'); ctx.restore();
    x += nw + 8 * s;
    text(needS, x, cy + 1, fb, '#d9d3ef', 'left', 'body');
    x += rw + 9 * s;
    ctx.fillStyle = 'rgba(246,239,223,0.25)'; ctx.fillRect(x, cy - 8 * s, 1.5, 16 * s);
    x += 9 * s;
    text(tS, x, cy + 1, ft, C.paper, 'left', 'body');
    // fail banner
    if (st.phase === 'fail') {
      const a = clamp((PZ.failT - st.phaseT) / 0.2, 0, 1);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, 205); const k = big ? 1.25 : 1; ctx.scale(k, k);
      ctx.fillStyle = 'rgba(28,26,54,0.9)'; rr(-215, -52, 430, 104, 20); ctx.fill();
      ctx.strokeStyle = '#ff8a6b'; ctx.lineWidth = 3; ctx.stroke();
      bigText(st.failWhy === 'pit' ? 'Oops!' : 'Oh no!', 0, -16, 44, C.paper);
      text(st.failWhy === 'pit' ? 'Down the hole! Fresh stack coming!' : 'Not enough pizzas. Fresh stack coming!', 0, 26, 16, C.paper, 'center', 'body');
      ctx.restore();
    }
    // after a retry: a reminder pill at the top
    if (st.fx.freshT > 0 && st.phase === 'play') {
      const msg = st.windMul < 1 ? 'Fresh stack! Only ' + st.need + ' needed now, and the wind calmed down a bit'
        : st.relief > 0 ? 'Fresh stack! The customer only needs ' + st.need + ' now' : 'Fresh stack!';
      ctx.save(); ctx.globalAlpha = clamp(st.fx.freshT / 0.3, 0, 1);
      ctx.font = '700 ' + Math.round(14 * s) + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const mw = ctx.measureText(msg).width + 28 * s, my = big ? 66 : 50;
      pill(W / 2, my, mw, 26 * s, 'center');
      text(msg, W / 2, my + 13 * s + 0.5, Math.round(14 * s), C.gold, 'center', 'body');
      ctx.restore();
    }
  }

  MODES.pizza = {
    rand: Math.random,
    PZ,  // tuning knobs, readable by tests
    hand: pzHand, stackHits: pzStackHits, support: pzSupport, parseRoom: pzParseRoom, key: pzKey, prompts: pzPrompts,
    setup(st, L) {
      st.stats = { delivered: [], lost: [], stars: [], retries: [], saves: 0, teamHops: 0, soloHops: 0, roomTimes: [], dropped: 0,
        teeters: 0, carries: 0, windStops: 0, fails: 0, bonks: 0 };
      st.clock = 0;
      pzInitRoom(0, L, 0);
    },
    room(k, L) { pzInitRoom(k, L, 0); },
    step(dt) {
      const st = G.mst;
      if (!st.pc) return;
      st.clock += dt; st.roomT += dt;
      if (st.phase === 'fail') {
        st.phaseT -= dt; pzPhysics(st, dt, true); pzFxStep(st, dt); pzMirror(st);
        if (st.phaseT <= 0) {
          st.stats.retries[st.room]++;
          const tries = st.stats.retries[st.room];
          pzInitRoom(st.room, G.level, Math.min(tries >= PZ.reliefLateAt ? PZ.reliefLate : PZ.reliefMax, tries));
          st.fx.freshT = st.windMul < 1 ? 2.6 : 1.8; Sfx.play('pzFresh');
        }
        return;
      }
      if (st.phase === 'deliver') {
        st.phaseT -= dt; pzPhysics(st, dt, true); pzFxStep(st, dt); pzMirror(st);
        if (st.phaseT <= 0) {
          st.stats.roomTimes[st.room] = st.roomT;
          if (st.room >= (G.level.def.roomCount || 1) - 1) { G.level.goal = { x: st.R.door.cx, y: st.R.door.y }; levelClear(); }
          else nextRoom();
        }
        return;
      }
      pzPhysics(st, dt, false);
      if (!isFinite(st.lean) || !isFinite(st.leanV) || !isFinite(st.X) || !isFinite(st.V) || st.pc.some(pc => !isFinite(pc.feet) || !isFinite(pc.vy))) {
        console.warn('Pizza Delivery: bad numbers, restarting the room');
        pzInitRoom(st.room, G.level, st.relief);
        return;
      }
      if (st.phase === 'play') pzTimers(st, dt);
      pzFxStep(st, dt);
      pzMirror(st);
    },
    draw() {
      const st = G.mst;
      if (!st.pc) return;
      pzDrawBackdrop(st);
      pzDrawHouse(st);
      pzDrawWindsock(st);
      pzDrawStreet(st);
      pzDrawAwnings(st);
      pzDrawOrder(st);
      pzSquash(st);
    },
    drawTop() {
      const st = G.mst;
      if (!st.pc) return;
      pzDrawCarry(st);
      pzDrawFx(st);
      pzDrawPrompts(st);
    },
    hud() { const st = G.mst; if (st.pc) pzHud(st); },
    stats() {
      const s = G.mst.stats;
      if (!s) return [];
      const stars = pzSum(s.stars), lost = s.dropped, retries = pzSum(s.retries);
      let line = lost === 0 && retries === 0 ? 'Perfect delivery: not one pizza hit the road!'
        : lost <= 3 ? 'Only ' + lost + (lost === 1 ? ' pizza' : ' pizzas') + ' hit the road. Smooth carrying!'
        : lost + ' pizzas hit the road… the pigeons say thanks!';
      if (retries) line += ' Do-overs: ' + retries + '.';
      return [{ label: 'Stars', value: stars + ' / 12' }, { label: 'Pizzas delivered', value: String(pzSum(s.delivered)) },
        { label: 'Wobbles saved', value: String(s.saves) }, line];
    },
  };

  Sfx.extra.pzHop = function () { this.tone(330, 0.08, 'square', 0.04, 520); this.tone(495, 0.12, 'triangle', 0.05, 780, 0.05); };
  Sfx.extra.pzReady = function (p) { this.tone(440 * p, 0.05, 'triangle', 0.03); };
  Sfx.extra.pzTeeter = function () { this.tone(260, 0.18, 'sawtooth', 0.025, 360); this.tone(360, 0.22, 'sawtooth', 0.02, 240, 0.16); };
  Sfx.extra.pzCreak = function () { this.tone(320, 0.06, 'triangle', 0.025); };
  Sfx.extra.pzSave = function () { [523, 784, 1047].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
  Sfx.extra.pzSlip = function () { this.tone(700, 0.25, 'sine', 0.04, 200); };
  Sfx.extra.pzPlop = function () { this.tone(160, 0.12, 'triangle', 0.08, 80); this.tone(420, 0.05, 'square', 0.025, 260, 0.02); };
  Sfx.extra.pzThunk = function () { this.tone(240, 0.07, 'square', 0.05, 150); this.tone(90, 0.12, 'triangle', 0.06, 60, 0.02); };
  Sfx.extra.pzSplash = function () { this.tone(1200, 0.12, 'sawtooth', 0.012, 300); this.tone(260, 0.15, 'sine', 0.04, 120); };
  Sfx.extra.pzGrunt = function (p) { this.tone(150 * p, 0.09, 'square', 0.025, 120 * p); };
  Sfx.extra.pzWhistle = function () { this.tone(520, 0.9, 'sine', 0.025, 980); this.tone(780, 0.6, 'sine', 0.012, 1170, 0.3); };
  Sfx.extra.pzGust = function () { this.tone(320, 1.0, 'sawtooth', 0.018, 140); this.tone(1400, 0.8, 'sine', 0.01, 700, 0.1); };
  Sfx.extra.pzDing = function () { this.tone(988, 0.35, 'triangle', 0.07); this.tone(784, 0.5, 'triangle', 0.07, null, 0.3); };
  Sfx.extra.pzStar = function () { this.tone(1319, 0.12, 'triangle', 0.06); };
  Sfx.extra.pzOops = function () { this.tone(392, 0.18, 'square', 0.04, 330); this.tone(311, 0.35, 'square', 0.04, 196, 0.18); };
  Sfx.extra.pzCoo = function () { this.tone(330, 0.12, 'sine', 0.035, 290); this.tone(300, 0.18, 'sine', 0.03, 250, 0.14); };
  Sfx.extra.pzFresh = function () { [523, 659, 784].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.045, null, i * 0.05)); };
}

