/* Pip & Bo - Level 33-4 Twister Tag (versus, World 33 Storm Chasers). */
'use strict';

/* ===== 33-4 Twister Tag (mode 'twistertag', versus, best of 5, Gavyn's pick) =====
   Each player IS a small tornado on a farm field (seen from above at a slant, so the funnels stand up). Suck up stuff
   to grow, then swallow the other twister.
   def.ownStep: the mode runs the whole live tick and draws everything itself (the engine bodies are hidden and only
   follow along for name tags and speech bubbles). Field px: x 60..900 across, y 170..505 is depth (far to near).
   MOVING: all four directions (and diagonals) with momentum: a twister drifts and turns wide. Bigger is slower:
     230 px/s at size 1 down to 150 at size 10.
   GROWING: anything inside your pull ring spirals in and orbits your funnel (so size is easy to read). Hay bale,
     scarecrow, mailbox and fence +1, cow +2, tractor +3, shed +4 (tractor and shed need size 4: a smaller twister just
     rattles them). Size = 1 + what you carry (10 at most). New things blow in from the edges every 5-7.5 s until the wall cloud comes.
   GUST DASH (the action): a fast lunge the way you face (0.35 s, then 3 s to recharge) that spits out your biggest
     thing as a missile. A hit knocks 2 size off the other twister and scatters what it loses back onto the field.
   SWALLOW: a twister 3 or more sizes bigger that keeps the other's core inside its own for 0.6 s swallows it and wins
     the round (not in the first 6 s of a round: the twisters are still spinning up). The smaller one sees a red
     warning ring and can dash away.
   HAZARDS: the pond (crossing it you're a waterspout: 1.4x fast, but you lose 1 size a second), the power lines
     (touching them zaps you: stunned 0.8 s and 2 size lost), and from 25 s a wall cloud closes in from the edges.
   ROUNDS (def.match: best of 5, 45 s): a swallow wins the round. TIME UP: the bigger twister wins; same size: more
     things sucked up this round; still level: a tie. tiebreak(): more things sucked up this match.
   CATCH-UP HELP (gold, announced at GO, counted, off in sudden death): 1 round behind = start at size 3.
   MODES.twistertag.plan(st, id) feeds the prompts and the computer brain. Sounds are Sfx.extra.twistertag*. */
(() => {
  const K = STORMCHASE, TAU = Math.PI * 2, FONT = K.FONT;
  const TT = {
    X0: 60, X1: 900, Y0: 170, Y1: 505, acc: 700, v1: 230, v10: 150, spoutK: 1.4, dashV: 520, dashT: 0.35, dashCd: 3, shotV: 640, shotMax: 520,
    hitLoss: 2, zapLoss: 2, safeT: 6, zapStun: 0.8, swallowBy: 3, swallowT: 0.6, roundTime: 45, wallAt: 25, wallMax: 220, spawnEvery: [5, 7.5], maxObjs: 7,
  };
  const KINDS = {
    hay: { v: 1, min: 1, s: 0.7, h: 22 }, scarecrow: { v: 1, min: 1, s: 0.75, h: 40 }, mailbox: { v: 1, min: 1, s: 0.75, h: 30 },
    fence: { v: 1, min: 1, s: 0.7, h: 22 }, cow: { v: 2, min: 1, s: 0.7, h: 30 }, tractor: { v: 3, min: 4, s: 0.7, h: 34 }, shed: { v: 4, min: 4, s: 0.7, h: 56 },
  };
  const BAG = ['hay', 'hay', 'hay', 'scarecrow', 'mailbox', 'fence', 'fence', 'cow', 'tractor'];
  const POND = { x: 480, y: 360, rx: 92, ry: 40 };
  const LINES = [[{ x: 92, y: 262 }, { x: 236, y: 184 }], [{ x: 868, y: 262 }, { x: 724, y: 184 }]];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const speedOf = T => TT.v1 - (T.size - 1) * (TT.v1 - TT.v10) / 9;
  const coreR = T => 12 + T.size * 3.2;
  const pullR = T => 40 + T.size * 7;
  const inPond = (x, y) => ((x - POND.x) / POND.rx) ** 2 + ((y - POND.y) / POND.ry) ** 2 < 1;
  function segDist(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, u = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy), 0, 1);
    return Math.hypot(p.x - (a.x + dx * u), p.y - (a.y + dy * u));
  }
  // the wall cloud: how far in from each edge (x; y is half of it)
  const wallM = st => (st.t < TT.wallAt ? 0 : Math.min(TT.wallMax, (st.t - TT.wallAt) / (TT.roundTime - TT.wallAt) * TT.wallMax));
  const bounds = st => { const m = wallM(st); return { x0: TT.X0 + m, x1: TT.X1 - m, y0: TT.Y0 + m * 0.4, y1: TT.Y1 - m * 0.4 }; };

  function newRound(st, n, info) {
    st.round = n; st.t = 0; st.res = null; st.wallSaid = false;
    const w = info.wins || [0, 0];
    st.tw = [0, 1].map(id => ({
      id, x: id ? 700 : 260, y: 340, vx: 0, vy: 0, fx: id ? -1 : 1, fy: 0, base: 1, size: 1, held: [], dash: 0, dashCd: 0.8, stun: 0, zapSafe: 0,
      swallow: 0, eaten: 0, spout: false, spoutT: 0, got: 0, sq: 0,
      gold: info.suddenDeath || st.noHelp ? false : w[1 - id] - w[id] >= 1,
    }));
    for (const T of st.tw) if (T.gold) { T.base = 3; T.size = 3; }
    // the field: a few of everything, mirrored so both sides are fair
    st.objs = [];
    const put = (kind, x, y) => st.objs.push(obj(kind, x, y));
    const half = [['hay', 170, 430], ['scarecrow', 320, 240]];
    for (const [k, x, y] of half) { put(k, x, y); put(k, 960 - x, y); }
    put('cow', 480, 260); put('tractor', 480, 470); put('shed', 480, 196);
    st.spawnT = rnd(...TT.spawnEvery);
    st.shots = []; st.shake = 0;
    K.fx(st);
    mirror(st);
  }
  function obj(kind, x, y) { const k = KINDS[kind]; return { kind, v: k.v, min: k.min, x, y, rot: 0, st: 'field', wob: 0, a: 0, r: 0, hh: 0, owner: -1, vx: 0, vy: 0, z: 0, vz: 0 }; }

  /* ---------- the tick ---------- */
  function tick(st, dt, live) {
    if (!st.tw) return;
    if (live) st.t += dt;
    st.clock = (st.clock || 0) + dt;
    if (st.shake > 0) st.shake = Math.max(0, st.shake - dt * 2);
    for (const T of st.tw) twister(st, T, dt, live);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    objects(st, dt, live);
    if (live) {
      shots(st, dt);
      spawn(st, dt);
      bump(st);
      if (!st.wallSaid && st.t >= TT.wallAt) { st.wallSaid = true; Sfx.play('stormThunder'); K.msg(st, 'The wall cloud is closing in!', '#ffd0c8', 2.4); st.shake = 0.4; }
      if (!st.res) swallowCheck(st, dt);
    }
    for (const T of st.tw) T.size = clamp(T.base + T.held.reduce((n, o) => n + o.v, 0), 1, 10);
    for (const T of st.tw) { st.stat.biggest[T.id] = Math.max(st.stat.biggest[T.id], T.size); }
    K.tickFx(st, dt);
    mirror(st);
  }
  const NOIN = { left: false, right: false, jump: false, down: false, up: false, act: false };
  function twister(st, T, dt, live) {
    const p = G.players[T.id], ok = live && T.stun <= 0 && !T.eaten, i = ok ? p.input : NOIN, act = ok && p.pendingAct;
    if (T.eaten) { T.eaten += dt; return; }
    if (T.stun > 0) T.stun -= dt;
    if (T.zapSafe > 0) T.zapSafe -= dt;
    if (T.dashCd > 0 && live) T.dashCd -= dt;
    if (T.sq > 0) T.sq = Math.max(0, T.sq - dt * 3);
    let ix = (i.right ? 1 : 0) - (i.left ? 1 : 0), iy = (i.down ? 1 : 0) - (i.up || i.jump ? 1 : 0);
    const n = Math.hypot(ix, iy);
    if (n) { ix /= n; iy /= n; T.fx = ix; T.fy = iy; }
    // the gust dash
    if (act && T.dashCd <= 0) dash(st, T);
    if (T.dash > 0) {
      T.dash -= dt;
      if (Math.random() < dt * 30) K.part(st, T.x - T.fx * 20, T.y - 10, -T.fx * 80 + (Math.random() - 0.5) * 60, -40, 0.4, 'rgba(220,220,210,0.8)', 4, 0, 'dot');
    } else {
      const vmax = speedOf(T) * (T.spout ? TT.spoutK : 1);
      T.vx = approach(T.vx, ix * vmax, TT.acc * dt);
      T.vy = approach(T.vy, iy * vmax, TT.acc * dt);
    }
    T.x += T.vx * dt; T.y += T.vy * dt;
    const B = bounds(st);
    if (T.x < B.x0 + 20) { T.x = B.x0 + 20; T.vx = Math.max(T.vx, 0); }
    if (T.x > B.x1 - 20) { T.x = B.x1 - 20; T.vx = Math.min(T.vx, 0); }
    if (T.y < B.y0 + 10) { T.y = B.y0 + 10; T.vy = Math.max(T.vy, 0); }
    if (T.y > B.y1 - 6) { T.y = B.y1 - 6; T.vy = Math.min(T.vy, 0); }
    if (!live) return;
    // the pond: a waterspout that shrinks
    const wet = inPond(T.x, T.y);
    if (wet && !T.spout) { Sfx.play('stormSplash'); K.hintOnce(st, 'pond' + T.id, T.id, 'Waterspout! Fast, but you shrink. Get out!'); }
    T.spout = wet;
    if (wet) {
      T.spoutT += dt;
      if (Math.random() < dt * 20) K.part(st, T.x + (Math.random() - 0.5) * 40, T.y, (Math.random() - 0.5) * 120, -120 - Math.random() * 100, 0.6, 'rgba(190,230,250,0.9)', 3, 500, 'dot');
      if (T.spoutT >= 1) { T.spoutT = 0; if (T.size > 1) { lose(st, T, 1, 'pond'); K.pop(st, T.x, T.y - 80, '-1', '#bfe6ff', 18); } }
    } else T.spoutT = 0;
    // the power lines
    if (T.zapSafe <= 0) for (const [a, b] of LINES) if (segDist(T, a, b) < coreR(T) * 0.7 + 6) {
      T.stun = TT.zapStun; T.zapSafe = 1.6; T.vx *= -0.5; T.vy *= -0.5; T.dash = 0;
      lose(st, T, TT.zapLoss, 'zap'); st.stat.zaps[T.id]++;
      Sfx.play('twistertagZap'); K.pop(st, T.x, T.y - 90, 'ZAP! -2', '#ffe14a', 22); st.shake = 0.4;
      for (let k = 0; k < 14; k++) K.part(st, T.x, T.y - 30, (Math.random() - 0.5) * 300, (Math.random() - 0.5) * 300, 0.4, k % 2 ? '#ffe14a' : '#ffffff', 3, 0, 'star');
      K.hintOnce(st, 'lines' + T.id, T.id, 'Keep away from the power lines!');
      break;
    }
  }
  function dash(st, T) {
    T.dash = TT.dashT; T.dashCd = TT.dashCd; T.vx = T.fx * TT.dashV; T.vy = T.fy * TT.dashV; T.sq = 1;
    st.stat.dashes[T.id]++;
    Sfx.play('twistertagDash');
    // spit the biggest thing out as a missile
    if (!T.held.length) return;
    const o = T.held.slice().sort((a, b) => b.v - a.v || a.r - b.r)[0];
    T.held.splice(T.held.indexOf(o), 1);
    o.st = 'shot'; o.owner = T.id; o.x = T.x + T.fx * (coreR(T) + 12); o.y = T.y + T.fy * (coreR(T) + 12); o.vx = T.fx * TT.shotV; o.vy = T.fy * TT.shotV; o.z = 30; o.dist = 0;
    st.shots.push(o);
  }
  // lose n size: what you carry flies off (smallest first) back onto the field (into the pond: gone)
  function lose(st, T, n, why) {
    let left = n;
    const list = T.held.slice().sort((a, b) => a.v - b.v);
    for (const o of list) {
      if (left <= 0) break;
      T.held.splice(T.held.indexOf(o), 1); left -= o.v;
      if (why === 'pond') { o.st = 'gone'; continue; }
      const a = Math.random() * TAU, sp = 160 + Math.random() * 120;
      o.st = 'drop'; o.x = T.x + Math.cos(a) * coreR(T); o.y = T.y + Math.sin(a) * coreR(T) * 0.6; o.vx = Math.cos(a) * sp; o.vy = Math.sin(a) * sp * 0.6; o.z = 40; o.vz = 260; o.owner = -1;
    }
    if (left > 0) T.base = Math.max(1, T.base - left);
  }
  function objects(st, dt, live) {
    const B = bounds(st);
    for (const o of st.objs) {
      if (o.st === 'held') {
        o.a += dt * (3.2 - o.r * 0.008); o.rot += dt * 4;
        continue;
      }
      if (o.st === 'drop') {
        o.x += o.vx * dt; o.y += o.vy * dt; o.vz -= 900 * dt; o.z += o.vz * dt; o.rot += dt * 8;
        if (o.z <= 0) { o.z = 0; o.st = 'field'; o.vx = o.vy = 0; if (inPond(o.x, o.y)) { o.st = 'gone'; Sfx.play('stormSplash'); } }
        continue;
      }
      if (o.st !== 'field') continue;
      o.wob = Math.max(0, o.wob - dt * 2);
      if (!live) continue;
      // the wall cloud takes whatever it reaches
      if (o.x < B.x0 || o.x > B.x1 || o.y < B.y0 || o.y > B.y1) { o.st = 'gone'; K.poof(st, o.x, o.y - 10, 6); continue; }
      // pulled toward the nearest twister that can lift it
      let best = null, bd = 1e9;
      for (const T of st.tw) {
        if (T.eaten) continue;
        const d = Math.hypot(o.x - T.x, (o.y - T.y) * 1.3);
        if (d < pullR(T) && d < bd) { best = T; bd = d; }
      }
      if (!best) continue;
      if (o.min > best.size || best.size >= 10) { o.wob = Math.min(1, o.wob + dt * 4); o.tipX = Math.sign(best.x - o.x); continue; }
      // spiral in
      const dx = best.x - o.x, dy = best.y - o.y, d = Math.hypot(dx, dy) || 1, sp = 120 + (pullR(best) - bd) * 4;
      o.x += (dx / d * sp - dy / d * sp * 0.6) * dt; o.y += (dy / d * sp + dx / d * sp * 0.6) * dt * 0.8; o.rot += dt * 6;
      if (bd < coreR(best) + 8) absorb(st, best, o);
    }
    st.objs = st.objs.filter(o => o.st !== 'gone');
  }
  function absorb(st, T, o) {
    o.st = 'held'; o.owner = T.id; o.a = Math.random() * TAU; o.r = 0.6 + Math.random() * 0.35; o.hh = 0.15 + Math.random() * 0.6;
    T.held.push(o); T.got++; st.stat.got[T.id]++;
    if (o.kind === 'cow') { st.stat.cows[T.id]++; Sfx.play('stormMoo'); }
    Sfx.play('twistertagSuck', o.v);
    K.pop(st, T.x, T.y - 70 - T.size * 6, '+' + o.v, PCOL[T.id], 16 + o.v * 2);
  }
  function shots(st, dt) {
    for (const o of st.shots) {
      o.x += o.vx * dt; o.y += o.vy * dt; o.dist += TT.shotV * dt; o.rot += dt * 12;
      const tgt = st.tw[1 - o.owner];
      if (!tgt.eaten && Math.hypot(o.x - tgt.x, (o.y - tgt.y) * 1.2) < coreR(tgt) + 16) {
        // a hit: -2 size, scattered
        lose(st, tgt, TT.hitLoss, 'hit'); tgt.stun = 0.35; tgt.vx = o.vx * 0.4; tgt.vy = o.vy * 0.4;
        st.stat.hits[o.owner]++;
        Sfx.play('twistertagHit'); K.pop(st, tgt.x, tgt.y - 90, 'WHAM! -2', '#ffffff', 24); st.shake = 0.35;
        K.spark(st, o.x, o.y - 20, 10, ['#ffffff', PCOL[o.owner]]);
        o.st = 'drop'; o.vx *= -0.2; o.vy *= -0.2; o.vz = 200; o.z = 30;
        continue;
      }
      const B = bounds(st);
      if (o.dist > TT.shotMax || o.x < B.x0 || o.x > B.x1 || o.y < B.y0 || o.y > B.y1) {
        o.st = 'drop'; o.vx *= 0.2; o.vy *= 0.2; o.vz = 120; o.z = 30; o.x = clamp(o.x, B.x0 + 10, B.x1 - 10); o.y = clamp(o.y, B.y0 + 10, B.y1 - 10);
      }
    }
    st.shots = st.shots.filter(o => o.st === 'shot');
  }
  function spawn(st, dt) {
    st.spawnT -= dt;
    // (nothing new blows in once the wall cloud is closing)
    if (st.spawnT > 0 || st.t > TT.wallAt) return;
    st.spawnT = rnd(...TT.spawnEvery);
    if (st.objs.filter(o => o.st === 'field').length >= TT.maxObjs) return;
    const B = bounds(st), kind = BAG[Math.floor(Math.random() * BAG.length)];
    // blown in from an edge
    const side = Math.floor(Math.random() * 4), o = obj(kind, 0, 0);
    if (side === 0) { o.x = B.x0 + 30; o.y = rnd(B.y0 + 30, B.y1 - 30); o.vx = 140; o.vy = 0; }
    else if (side === 1) { o.x = B.x1 - 30; o.y = rnd(B.y0 + 30, B.y1 - 30); o.vx = -140; o.vy = 0; }
    else if (side === 2) { o.x = rnd(B.x0 + 40, B.x1 - 40); o.y = B.y0 + 20; o.vx = 0; o.vy = 90; }
    else { o.x = rnd(B.x0 + 40, B.x1 - 40); o.y = B.y1 - 20; o.vx = 0; o.vy = -90; }
    if (inPond(o.x + o.vx * 0.6, o.y + o.vy * 0.6)) { o.vx = -o.vx; o.vy = -o.vy; }
    o.st = 'drop'; o.z = 60; o.vz = 120;
    st.objs.push(o);
    Sfx.play('stormWhoosh');
  }
  // two twisters the same size bounce off each other
  function bump(st) {
    const [A, B] = st.tw;
    if (A.eaten || B.eaten) return;
    const dx = B.x - A.x, dy = (B.y - A.y) * 1.3, d = Math.hypot(dx, dy) || 1, need = (coreR(A) + coreR(B)) * 0.7;
    if (Math.abs(A.size - B.size) >= TT.swallowBy || d >= need) return;
    const push = (need - d) / 2, nx = dx / d, ny = dy / d;
    A.x -= nx * push; A.y -= ny * push / 1.3; B.x += nx * push; B.y += ny * push / 1.3;
    const rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
    if (rv < 0) { A.vx += nx * rv * 0.8; A.vy += ny * rv * 0.8; B.vx -= nx * rv * 0.8; B.vy -= ny * rv * 0.8; if (rv < -120) Sfx.play('stormThud'); }
  }
  function swallowCheck(st, dt) {
    for (const A of st.tw) {
      const B = st.tw[1 - A.id];
      const d = Math.hypot(B.x - A.x, (B.y - A.y) * 1.3);
      if (A.size >= B.size + TT.swallowBy && d < coreR(A) + 8 && !A.eaten && !B.eaten && st.t >= TT.safeT) {
        A.swallow += dt;
        if (A.swallow >= TT.swallowT) {
          B.eaten = 0.001; st.res = true;
          st.stat.swallows[A.id]++; st.stat.wins[A.id]++;
          Sfx.play('twistertagGulp'); st.shake = 1; G.shake = Math.max(G.shake || 0, 0.6);
          K.pop(st, A.x, A.y - 140, 'GULP!', PCOL[A.id], 36);
          for (const o of B.held) { o.st = 'held'; o.owner = A.id; A.held.push(o); }
          B.held = [];
          rumble(B.id, 0.5, 0.9, 300);
          matchRoundEnd(A.id, NAMES[A.id] + ' swallowed ' + NAMES[B.id] + '!');
          return;
        }
      } else A.swallow = Math.max(0, A.swallow - dt * 2);
    }
  }
  function mirror(st) { for (const T of st.tw) K.place(T.id, clamp(T.x, 30, W - 30), clamp(T.y - funnelH(T) + 10, 60, H - 30)); }
  const funnelH = T => 96 + T.size * 17;

  /* ---------- what's going on ----------
     plan(st, id): { me, them, dx, dy, dist, threat (they are 3+ bigger), prey (I am 3+ bigger), warn (they could
       swallow me soon), objs (things on the field I can lift: { o, d }), pond, lines, bounds, dashReady, aimed (a dash
       now would fly at them), speedOf, coreR, pullR } */
  function plan(st, id) {
    const A = st.tw[id], B = st.tw[1 - id], dx = B.x - A.x, dy = B.y - A.y, dist = Math.hypot(dx, dy * 1.3);
    const early = st.t < TT.safeT - 1, threat = !early && B.size >= A.size + TT.swallowBy, prey = !early && A.size >= B.size + TT.swallowBy;
    const objs = st.objs.filter(o => o.st === 'field').map(o => ({ o, d: Math.hypot(o.x - A.x, (o.y - A.y) * 1.3), lift: o.min <= A.size }));
    const dn = Math.hypot(A.fx, A.fy) || 1, ca = (dx * A.fx + dy * A.fy) / (dn * (Math.hypot(dx, dy) || 1));
    const aimed = A.held.length > 0 && ca > 0.96 && dist < 360;
    return { me: A, them: B, dx, dy, dist, threat, prey, warn: threat && dist < pullR(B) * 1.3, objs, pond: POND, lines: LINES, bounds: bounds(st),
      dashReady: A.dashCd <= 0 && A.stun <= 0, aimed, speedOf, coreR, pullR, inPond, segDist, TT };
  }

  MODES.twistertag = {
    plan, TT, KINDS,
    setup(st, L) {
      for (const row of L.grid) row.fill('.');
      st.stat = { wins: [0, 0], biggest: [1, 1], cows: [0, 0], swallows: [0, 0], got: [0, 0], hits: [0, 0], dashes: [0, 0], zaps: [0, 0] };
      st.stats = { helps: 0 };
      st.noHelp = !!this.testNoHelp;
      st.t = 0; st.clock = 0;
      K.fx(st);
    },
    resetRound(n, info) { newRound(G.mst, n, info); G.particles.length = 0; },
    go() {
      const st = G.mst;
      Sfx.play('stormSiren');
      const g = st.tw.filter(T => T.gold);
      if (g.length) K.goldHelp(st, 'Gold head start for ' + NAMES[g[0].id] + ': starting at size 3!');
      else if (st.round === 1) K.msg(st, 'Suck up stuff to grow! The action is a gust dash. 3 sizes bigger? Swallow the other twister!', '#ffffff', 4.4);
      else K.msg(st, 'Round ' + st.round + '! SPIN!', '#ffffff', 2.2);
    },
    step(dt) { tick(G.mst, dt, true); },
    idle(dt) { const st = G.mst; if (st.tw) tick(st, dt, false); },
    timeUp() {
      const st = G.mst, [A, B] = st.tw;
      let w = A.size !== B.size ? (A.size > B.size ? 0 : 1) : A.got !== B.got ? (A.got > B.got ? 0 : 1) : -1;
      if (w >= 0) st.stat.wins[w]++;
      st.res = true;
      const why = w < 0 ? 'Time! Same size, same haul!' : A.size !== B.size ? 'Time! ' + NAMES[w] + ' is the bigger twister!' : 'Time! Same size, but ' + NAMES[w] + ' sucked up more!';
      return { winner: w, reason: why };
    },
    tiebreak() {
      const s = G.mst.stat;
      if (s.got[0] !== s.got[1]) return { winner: s.got[0] > s.got[1] ? 0 : 1, reason: 'Most things sucked up this match wins the tiebreak!' };
      return -1;
    },
    draw() { const st = G.mst; if (!st.tw) return; drawWorld(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.tw) drawTop(st); },
    hud() { const st = G.mst; if (st.tw && G.match) hud(st); },
    stats() {
      const st = G.mst, s = st.stat;
      if (!s) return [];
      const out = [
        { label: 'Rounds won', values: (G.match ? G.match.wins : s.wins).slice() },
        { label: 'Biggest size', values: s.biggest.slice() },
        { label: 'Cows collected', values: s.cows.slice() },
        { label: 'Swallows', values: s.swallows.slice() },
      ];
      const g = s.got;
      out.push('★ Things sucked up: ' + NAMES[0] + ' ' + g[0] + ', ' + NAMES[1] + ' ' + g[1] + '. Missile hits: ' + s.hits[0] + ' / ' + s.hits[1] + '.');
      const hl = K.helpLine(st.stats ? st.stats.helps : 0);
      if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- drawing ---------- */
  // things further away (smaller y) are drawn a little smaller
  const depth = y => 0.8 + 0.2 * clamp((y - TT.Y0) / (TT.Y1 - TT.Y0), 0, 1);
  function drawWorld(st) {
    const t = st.clock, sh = st.shake > 0 ? (Math.random() - 0.5) * st.shake * 12 : 0, fl = K.flashA(st);
    K.sky(0, t, { mood: 'storm', dark: 0.1 + wallM(st) / TT.wallMax * 0.35 });
    K.farm(t * 8, t, { horizon: 128 });
    ctx.save(); ctx.translate(sh, sh * 0.5);
    // the field: a slanted rectangle of crop rows with a fence round it
    ctx.fillStyle = '#6e8c46';
    ctx.beginPath(); ctx.moveTo(TT.X0 - 10, TT.Y0 - 34); ctx.lineTo(TT.X1 + 10, TT.Y0 - 34); ctx.lineTo(W + 30, H); ctx.lineTo(-30, H); ctx.closePath(); ctx.fill();
    for (let k = 0; k < 15; k++) {
      const u = k / 14, xTop = K.lerp(TT.X0, TT.X1, u), xBot = K.lerp(-10, W + 10, u);
      ctx.strokeStyle = k % 2 ? 'rgba(90,120,52,0.6)' : 'rgba(130,160,80,0.5)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(xTop, TT.Y0 - 30); ctx.lineTo(xBot, H); ctx.stroke();
    }
    for (let y = TT.Y0; y < H; y += 46) { ctx.fillStyle = 'rgba(60,80,36,0.12)'; ctx.fillRect(0, y, W, 3); }
    // tufts of grass, little clover patches and the odd wildflower, nearer ones bigger (fixed spots, so they never jump)
    for (let k = 0; k < 70; k++) {
      const v = K.hash(k * 3 + 1), y = TT.Y0 + K.hash(k * 3 + 2) * (H - TT.Y0), sc = 0.6 + (y - TT.Y0) / (H - TT.Y0) * 0.8;
      const x = K.lerp(K.lerp(TT.X0, -10, (y - TT.Y0 + 30) / (H - TT.Y0 + 30)), K.lerp(TT.X1, W + 10, (y - TT.Y0 + 30) / (H - TT.Y0 + 30)), K.hash(k * 3 + 3));
      if (v < 0.6) {
        ctx.strokeStyle = 'rgba(60,84,36,0.7)'; ctx.lineWidth = 1.5 * sc; ctx.beginPath();
        for (let j = -1; j <= 1; j++) { ctx.moveTo(x + j * 3 * sc, y); ctx.lineTo(x + j * 5 * sc + Math.sin(t * 3 + k) * 1.5, y - 7 * sc); }
        ctx.stroke();
      } else if (v < 0.85) { ctx.fillStyle = 'rgba(80,110,50,0.55)'; ctx.beginPath(); ctx.ellipse(x, y, 10 * sc, 4 * sc, 0, 0, TAU); ctx.fill(); }
      else { ctx.fillStyle = v < 0.93 ? '#f2e66a' : '#f4f0f8'; circle(x, y - 3 * sc, 2.2 * sc); ctx.fill(); ctx.fillStyle = 'rgba(60,84,36,0.7)'; ctx.fillRect(x - 0.5, y - 2 * sc, 1, 3 * sc); }
    }
    // the fence on the far side
    ctx.strokeStyle = '#7a5434'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(TT.X0 - 10, TT.Y0 - 46); ctx.lineTo(TT.X1 + 10, TT.Y0 - 46); ctx.moveTo(TT.X0 - 10, TT.Y0 - 38); ctx.lineTo(TT.X1 + 10, TT.Y0 - 38); ctx.stroke();
    for (let x = TT.X0 - 10; x <= TT.X1 + 10; x += 40) { ctx.fillStyle = '#5e3e20'; ctx.fillRect(x - 2, TT.Y0 - 54, 4, 22); ctx.fillStyle = 'rgba(255,230,190,0.25)'; ctx.fillRect(x - 2, TT.Y0 - 54, 1.2, 22); }
    ctx.strokeStyle = 'rgba(255,230,190,0.2)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(TT.X0 - 10, TT.Y0 - 47.5); ctx.lineTo(TT.X1 + 10, TT.Y0 - 47.5); ctx.moveTo(TT.X0 - 10, TT.Y0 - 39.5); ctx.lineTo(TT.X1 + 10, TT.Y0 - 39.5); ctx.stroke();
    drawPond(st, t);
    // the wall cloud: dark churning cloud closing in
    const m = wallM(st);
    if (m > 0) drawWall(st, t, m);
    // shadows of everything, then everything from far to near
    const items = [];
    for (const o of st.objs) if (o.st === 'field' || o.st === 'drop') items.push({ y: o.y, f: () => drawObj(st, o, t) });
    for (const o of st.shots) items.push({ y: o.y, f: () => drawObj(st, o, t) });
    for (const T of st.tw) items.push({ y: T.y, f: () => drawTwister(st, T, t) });
    for (const L of LINES) for (const p of L) items.push({ y: p.y, f: () => pole(p.x, p.y) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.f();
    // the wires on top
    for (const [a, b] of LINES) wire(a, b, t);
    ctx.restore();
    K.flashTop(fl * 0.4);
  }
  function drawPond(st, t) {
    const P = POND;
    ctx.fillStyle = '#5a7a3a'; ctx.beginPath(); ctx.ellipse(P.x, P.y + 4, P.rx + 10, P.ry + 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8a7a5a'; ctx.beginPath(); ctx.ellipse(P.x, P.y + 2, P.rx + 4, P.ry + 4, 0, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(P.x - 20, P.y - 10, 4, P.x, P.y, P.rx);
    g.addColorStop(0, '#7ab4d0'); g.addColorStop(1, '#3a6a8a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(P.x, P.y, P.rx, P.ry, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) { const u = (t * 0.4 + k / 3) % 1; ctx.globalAlpha = 1 - u; ctx.beginPath(); ctx.ellipse(P.x + (k - 1) * 30, P.y + (k % 2) * 8, 8 + u * 30, 3 + u * 10, 0, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // the sky's reflection and a dark rim where the bank overhangs
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.ellipse(P.x - P.rx * 0.3, P.y - P.ry * 0.35, P.rx * 0.45, P.ry * 0.25, -0.1, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(20,40,50,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(P.x, P.y, P.rx - 1, P.ry - 1, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    // lily pads
    for (let k = 0; k < 3; k++) { const lx = P.x + P.rx * (0.3 + k * 0.18), ly = P.y + P.ry * (0.2 - k * 0.15); ctx.fillStyle = '#4e8a3e'; ctx.beginPath(); ctx.ellipse(lx, ly, 8, 3.5, 0, 0.3, TAU - 0.3); ctx.lineTo(lx, ly); ctx.fill(); }
    // reeds
    ctx.strokeStyle = '#3e5a2a'; ctx.lineWidth = 2;
    for (let k = 0; k < 9; k++) { const a = Math.PI * (0.9 + k * 0.05), x = P.x + Math.cos(a) * P.rx, y = P.y + Math.sin(a) * P.ry; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(t * 2 + k) * 3, y - 18 - (k % 3) * 5); ctx.stroke(); }
  }
  function drawWall(st, t, m) {
    const B = bounds(st);
    ctx.save();
    ctx.fillStyle = 'rgba(30,36,34,0.85)';
    ctx.beginPath(); ctx.rect(-40, -40, W + 80, H + 80);
    ctx.moveTo(B.x0, B.y0); ctx.lineTo(B.x0, B.y1); ctx.lineTo(B.x1, B.y1); ctx.lineTo(B.x1, B.y0); ctx.closePath();
    ctx.fill('evenodd');
    // a churning lip along the edge
    // a churning lip of cloud along the edge: dark puffs, lighter tops, rolling the way the wind goes
    const edge = (x0, y0, x1, y1, seed) => {
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 34);
      for (const [col, r0, dy] of [['rgba(40,48,46,0.95)', 22, 4], ['rgba(78,88,84,0.9)', 16, -3], ['rgba(120,130,124,0.55)', 9, -9]]) {
        ctx.fillStyle = col;
        for (let k = 0; k <= n; k++) {
          const u = (k + (t * 0.6) % 1) / n, x = K.lerp(x0, x1, u), y = K.lerp(y0, y1, u), r = r0 + K.hash(k + seed) * 10 + Math.sin(t * 3 + k * 1.7) * 4;
          circle(x + Math.sin(t * 2 + k) * 4, y + dy, r); ctx.fill();
        }
      }
    };
    edge(B.x0, B.y0, B.x1, B.y0, 1); edge(B.x0, B.y0, B.x0, B.y1, 3); edge(B.x1, B.y0, B.x1, B.y1, 5); edge(B.x0, B.y1, B.x1, B.y1, 7);
    // lightning flickers inside it
    if (Math.sin(t * 5.3) > 0.97) { ctx.fillStyle = 'rgba(220,230,255,0.25)'; ctx.beginPath(); ctx.rect(-40, -40, W + 80, H + 80); ctx.moveTo(B.x0, B.y0); ctx.lineTo(B.x0, B.y1); ctx.lineTo(B.x1, B.y1); ctx.lineTo(B.x1, B.y0); ctx.closePath(); ctx.fill('evenodd'); }
    ctx.restore();
    K.windStreaks(t, { n: 8, a: 0.25, dir: 1, y0: B.y0, y1: B.y1 });
  }
  function pole(x, y) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x, y, 10, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6a4a2a'; ctx.fillRect(x - 3, y - 90, 6, 90);
    ctx.fillRect(x - 18, y - 84, 36, 4);
    ctx.fillStyle = '#c8ccd4'; for (const dx of [-14, 0, 14]) { ctx.fillRect(x + dx - 2, y - 88, 4, 4); }
  }
  function wire(a, b, t) {
    for (const dx of [-14, 0, 14]) {
      ctx.strokeStyle = '#1e1e22'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(a.x + dx, a.y - 86); ctx.quadraticCurveTo((a.x + b.x) / 2 + dx, (a.y + b.y) / 2 - 64, b.x + dx, b.y - 86); ctx.stroke();
    }
    // the danger strip on the ground under the wires, and a crackle now and then
    ctx.strokeStyle = 'rgba(255,225,74,0.35)'; ctx.lineWidth = 10; ctx.setLineDash([12, 10]);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
    if (Math.sin(t * 7 + a.x) > 0.93) {
      const u = (t * 3) % 1, x = K.lerp(a.x, b.x, u), y = K.lerp(a.y, b.y, u) - 70 - Math.sin(u * Math.PI) * 14;
      ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 6, y - 4); ctx.lineTo(x, y + 2); ctx.lineTo(x - 3, y + 4); ctx.lineTo(x + 6, y + 10); ctx.stroke();
    }
  }
  function drawObj(st, o, t) {
    const k = KINDS[o.kind], s = k.s * depth(o.y), z = o.z || 0;
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(o.x, o.y, 22 * s * (o.kind === 'shed' ? 2 : 1), 7 * s, 0, 0, TAU); ctx.fill();
    const tip = o.wob ? Math.sin(t * 30) * 0.12 * o.wob + (o.tipX || 0) * 0.15 * o.wob : 0;
    const rot = o.st === 'field' ? tip : o.rot;
    K.debris(o.kind === 'fence' ? 'fence' : o.kind, o.x, o.y - k.h * s - z, rot, s * (o.kind === 'shed' ? 1.2 : 1));
    if (o.kind === 'cow' && o.st === 'field' && Math.sin(t * 0.7 + o.x) > 0.995) Sfx.play('stormMoo');
  }
  function drawTwister(st, T, t) {
    const sc = depth(T.y), h = funnelH(T) * sc, eatenU = T.eaten ? clamp(T.eaten / 0.6, 0, 1) : 0;
    if (eatenU >= 1) return;
    const B = st.tw[1 - T.id];
    // the red warning ring: the other one could swallow me
    if (B.size >= T.size + TT.swallowBy && st.t >= TT.safeT - 2 && Math.hypot(B.x - T.x, (B.y - T.y) * 1.3) < pullR(B) * 1.4 && !T.eaten) {
      ctx.strokeStyle = 'rgba(255,74,58,' + (0.55 + 0.4 * Math.sin(t * 14)) + ')'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(T.x, T.y, coreR(T) + 14, (coreR(T) + 14) * 0.45, 0, 0, TAU); ctx.stroke();
    }
    // the pull ring on the ground in the player's colour
    ctx.strokeStyle = PCOL[T.id]; ctx.globalAlpha = 0.45; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.lineDashOffset = -t * 30;
    ctx.beginPath(); ctx.ellipse(T.x, T.y, pullR(T), pullR(T) * 0.45, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    // a swallow in progress: the bigger twister's core glows
    if (T.swallow > 0) { ctx.fillStyle = 'rgba(255,74,58,' + T.swallow / TT.swallowT * 0.5 + ')'; ctx.beginPath(); ctx.ellipse(T.x, T.y, coreR(T) + 10, (coreR(T) + 10) * 0.45, 0, 0, TAU); ctx.fill(); }
    // things orbiting behind the funnel
    const orbit = front => {
      for (const o of T.held) {
        const s2 = Math.sin(o.a);
        if ((s2 > 0) !== front) continue;
        const u = o.hh, rr2 = (12 + T.size * 3 + u * (20 + T.size * 6)) * o.r * sc * 1.4;
        const x = T.x + Math.cos(o.a) * rr2, y = T.y - u * h + s2 * rr2 * 0.3;
        ctx.globalAlpha = front ? 1 : 0.6;
        K.debris(o.kind, x, y, o.rot, KINDS[o.kind].s * 0.7 * sc);
      }
      ctx.globalAlpha = 1;
    };
    ctx.save();
    if (eatenU > 0) { ctx.globalAlpha = 1 - eatenU; ctx.translate(T.x, T.y); ctx.scale(1 - eatenU * 0.8, 1 - eatenU * 0.8); ctx.translate(-T.x, -T.y); }
    orbit(false);
    const tint = T.spout ? '#7aa8c8' : T.id === 0 ? '#8a8a6a' : '#8a7462';
    K.funnel(T.x, T.y, h, t * (1.2 + T.size * 0.05) + T.id * 3, {
      w: (56 + T.size * 17) * sc, foot: (12 + T.size * 3) * sc, lean: clamp(T.vx * 0.14, -50, 50) * sc, col: tint, alpha: 0.9,
      debris: false, dust: !T.spout, s: (0.55 + T.size * 0.06) * sc,
    });
    // a band of the player's colour round the funnel so you can tell them apart
    ctx.strokeStyle = PCOL[T.id]; ctx.lineWidth = 4; ctx.globalAlpha = 0.85;
    const by = T.y - h * 0.55, bw = K.lerp(12 + T.size * 3, 56 + T.size * 17, Math.pow(0.55, 1.7)) * sc / 2;
    ctx.beginPath(); ctx.ellipse(T.x + clamp(T.vx * 0.14, -50, 50) * sc * 0.3, by, bw, bw * 0.3, 0, 0, Math.PI); ctx.stroke(); ctx.globalAlpha = 1;
    orbit(true);
    // a waterspout's spray, a stunned twister's sparks
    if (T.spout) { ctx.fillStyle = 'rgba(200,236,255,0.7)'; for (let k = 0; k < 6; k++) { const a = t * 6 + k; circle(T.x + Math.cos(a) * 24, T.y - 6 + Math.sin(a) * 4, 4); ctx.fill(); } }
    if (T.stun > 0) { ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { const a = t * 9 + k * 2; ctx.beginPath(); ctx.arc(T.x + Math.cos(a) * 18, T.y - h + 10 + Math.sin(a) * 6, 4, 0, TAU); ctx.stroke(); } }
    if (T.dash > 0) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3; for (let k = 0; k < 4; k++) { const yy = T.y - h * (0.2 + k * 0.2); ctx.beginPath(); ctx.moveTo(T.x - T.fx * 30, yy); ctx.lineTo(T.x - T.fx * 80, yy); ctx.stroke(); } }
    if (T.gold && st.t < 3) { ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(T.x, T.y, coreR(T) + 6, (coreR(T) + 6) * 0.45, 0, 0, TAU); ctx.stroke(); }
    ctx.restore();
    // the size, under the funnel
    text(String(T.size), T.x, T.y + 14, 14, PCOL[T.id], 'center');
  }
  function drawTop(st) {
    K.drawParts(st, 0);
    K.rain(st.clock, { wind: 160, n: 90, a: 0.25 });
    K.drawPops(st, 0, 0);
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.25 : 1, live = G.match && G.match.phase === 'live';
    K.drawMsg(st, st.msg, W - 14);
    for (const T of st.tw) {
      const w = 190 * z, h = 54 * z, x = T.id ? W - 16 - w : 16, y = H - 14 - h;
      ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(x, y, w, h, 12); ctx.fill();
      ctx.strokeStyle = PCOL[T.id]; ctx.lineWidth = 2; rr(x, y, w, h, 12); ctx.stroke();
      text(NAMES[T.id] + (K.quiet(T.id) ? ' (computer)' : ''), x + 12, y + 14 * z, 13 * z, PCOL[T.id], 'left', 'body');
      text('size ' + T.size, x + 12, y + 37 * z, 20 * z, T.size >= 7 ? '#ffd84a' : '#ffffff', 'left');
      // the size pips and the dash charge
      for (let k = 0; k < 10; k++) { ctx.fillStyle = k < T.size ? PCOL[T.id] : 'rgba(255,255,255,0.15)'; rr(x + 92 * z + k * 9 * z, y + 30 * z, 7 * z, 12 * z, 2); ctx.fill(); }
      const c = T.dashCd <= 0 ? 1 : 1 - T.dashCd / TT.dashCd;
      text(c >= 1 ? 'dash ready' : 'dash', x + w - 12, y + 14 * z, 10 * z, c >= 1 ? C.gold : '#aab', 'right', 'body');
      // a prompt over the head of a person in the first rounds
      if (live && !K.quiet(T.id) && !T.eaten && (st.round <= 2 || T.gold)) {
        const pl = plan(st, T.id);
        let s = null, col = '#ffe7a8';
        if (pl.warn) { s = 'RUN! Dash away: ' + K.key(T.id, 'act'); col = '#ff8a7a'; }
        else if (pl.prey && pl.dist < 260) { s = 'Swallow ' + NAMES[1 - T.id] + '!'; col = C.gold; }
        else if (T.spout) { s = 'Out of the pond!'; col = '#bfe6ff'; }
        else if (pl.aimed && pl.dashReady) { s = 'Fire! ' + K.key(T.id, 'act'); col = C.gold; }
        if (s) {
          ctx.font = FONT(12 * z); const tw = ctx.measureText(s).width + 16, sx = clamp(T.x, tw / 2 + 8, W - tw / 2 - 8), sy = clamp(T.y - funnelH(T) - 26, 80, H - 90);
          ctx.fillStyle = 'rgba(28,26,54,0.85)'; rr(sx - tw / 2, sy - 11 * z, tw, 22 * z, 11 * z); ctx.fill();
          text(s, sx, sy, 12 * z, col, 'center', 'body');
        }
      }
    }
  }

  /* ---------- sounds ---------- */
  Sfx.extra.twistertagSuck = function (v) { this.tone(300 + (v || 1) * 60, 0.18, 'sine', 0.035, 900 + (v || 1) * 120); };
  Sfx.extra.twistertagDash = function () { this.tone(200, 0.3, 'sawtooth', 0.025, 900); };
  Sfx.extra.twistertagHit = function () { this.tone(160, 0.18, 'square', 0.05, 60); this.tone(900, 0.06, 'triangle', 0.03, 300); };
  Sfx.extra.twistertagZap = function () { for (let k = 0; k < 4; k++) this.tone(1200 + k * 300, 0.05, 'square', 0.025, 400, k * 0.05); };
  Sfx.extra.twistertagGulp = function () { this.tone(400, 0.5, 'sawtooth', 0.05, 60); this.tone(90, 0.6, 'sine', 0.06, 40, 0.2); };

  /* ---------- the level ---------- */
  STORMCHASE.defs.twistertag = {
    name: 'Twister Tag', world: 32, kind: 'versus', mode: 'twistertag', ownStep: true,
    match: { bestOf: 5, roundTime: TT.roundTime },
    act: { label: 'dash' },
    tagLift: 10,
    legend: {
      pip: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> spin around',
      bo: '<kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> spin around',
      pad: 'stick spins around,',
    },
    tip: 'You ARE a tornado! Suck up hay, cows and tractors to grow. The action is a gust dash that fires your biggest thing. Get 3 sizes bigger and swallow the other twister!',
    switches: {}, signs: [],
    map: K.stubMap(),
  };
})();
