/* Pip & Bo - Level 27-4 Robot Rumble (versus, World 27 Robot Factory). */
'use strict';

/* ===== 27-4 Robot Rumble (mode 'robotrumble', versus, best of 5) — Gavyn's pick =====
   "Grab parts off a belt to build your own robot fast, then the robots wrestle to push each other off the platform."
   Every round has two parts. The mode owns the tick, the picture and the HUD (ownStep, ownHUD).
   1. BUILD (up to 22 s): the factory floor. A hopper in the middle drops two copies of the same part onto the belt
      every 1.4 s: one rides left toward Pip's pad, the other right toward Bo's (so it's fair). Parts that reach a belt end
      drop to the floor and wait there 7 s. Walk into a part to pick it up (one at a time; ▼ on the floor drops it), walk
      onto your own pad (Pip's is on the left, Bo's on the right) and it goes on your robot. A robot has four slots,
      and each slot has two kinds of part:
        legs:  Treads (heavy, hard to push, a bit slower) or Springs (big jumps)
        body:  Tank (heavy) or Turbo (fast)
        arms:  Boxers (strong shoves) or Bumpers (shoves hit you softer)
        head:  Antenna (charges a shove fast) or Visor (longer reach)
      A new part on a full slot swaps it. You can take parts from your opponent's side too. The build ends when both
      robots are done, 4 s after the first one is done ("Hurry!"), or after 22 s. Empty slots get a Rusty spare (weaker).
      The first to finish gets a Turbo Start (a quicker first 3 s of the rumble).
   2. RUMBLE: the robots stand on a steel platform over a big foam pit. ◀ ▶ walk, ▲ jumps, hold the action to charge a
      shove and let go to lunge (a quick tap is a small jab; a full charge glows gold), hold ▼ to brace (you can't move,
      shoves hit you less; at most 1.5 s, then a 1 s rest). Robots bump into each other: the heavier one pushes harder.
      Off the edge into the foam is a ring-out ("Sploosh!"): that round goes to the other robot. After 25 s the platform
      edges start to fold in. At 45 s the round goes to whoever is nearer the middle (a tie within 12 px is replayed).
   Catch-up (gold, announced on the round card): a player 1+ round behind gets a gold Mega Fist waiting on their pad
   (+ shove power) in the next build.
   Results tiles: Rounds won, Parts grabbed, Shoves landed, Ring-outs. The brain: js/cpu/levels/world27/robot-rumble.js.
   Every top-level name starts with rumble / RUMBLE. */
const RUMBLE = {
  buildMax: 22, hurry: 4, hopEvery: 1.4, beltY: 360, beltX0: 300, beltX1: 660, beltV: 70, floorY: 450, partLife: 7,
  padW: 120, pads: [[20, 140], [820, 940]],
  AY: 400, AX0: 170, AX1: 790, minW: 260, shrinkAt: 25, shrinkV: 7, roundMax: 45,
  rw: 46, rh: 62, g: 1800, acc: 1400, fric: 1500, chargeMax: 0.9, lungeT: 0.18, lungeV: 380, braceMax: 1.5, braceRest: 1,
  KINDS: {
    legs: [{ k: 'treads', name: 'Treads' }, { k: 'springs', name: 'Springs' }],
    body: [{ k: 'tank', name: 'Tank' }, { k: 'turbo', name: 'Turbo' }],
    arms: [{ k: 'boxers', name: 'Boxers' }, { k: 'bumpers', name: 'Bumpers' }],
    head: [{ k: 'antenna', name: 'Antenna' }, { k: 'visor', name: 'Visor' }],
  },
  SLOTS: ['legs', 'body', 'arms', 'head'],
};

(() => {
  const R = RUMBLE;
  const isCpu = rf27IsCpu, key = rf27Key;
  const PART_SLOT = {};
  for (const s of R.SLOTS) for (const q of R.KINDS[s]) PART_SLOT[q.k] = s;
  const PART_NAME = { treads: 'Treads', springs: 'Springs', tank: 'Tank', turbo: 'Turbo', boxers: 'Boxers', bumpers: 'Bumpers', antenna: 'Antenna', visor: 'Visor', mega: 'Mega Fist' };

  // a robot's numbers from its parts
  function statsOf(parts) {
    const s = { speed: 200, jump: 560, weight: 1, push: 360, guard: 0, reach: 46, charge: 0.55 };
    const legs = parts.legs, body = parts.body, arms = parts.arms, head = parts.head;
    if (legs === 'treads') { s.weight += 0.35; s.speed -= 25; } else if (legs === 'springs') { s.jump += 180; s.weight -= 0.05; } else { s.weight -= 0.12; s.speed -= 20; }
    if (body === 'tank') { s.weight += 0.3; s.speed -= 15; } else if (body === 'turbo') s.speed += 55; else s.weight -= 0.1;
    if (arms === 'boxers') s.push += 120; else if (arms === 'bumpers') s.guard += 0.35; else if (arms === 'mega') s.push += 220; else s.push -= 80;
    if (head === 'antenna') s.charge = 0.32; else if (head === 'visor') s.reach += 26; else s.charge = 0.7;
    return s;
  }
  const done = parts => R.SLOTS.every(s => parts[s]);

  /* ---------- a round ---------- */
  function resetRound(st, n, info) {
    st.phase = 'build'; st.t = 0; st.hurryT = null; st.firstDone = -1; st.parts = []; st.hopT = 0.6; st.bag = [];
    st.robots = [0, 1].map(k => ({ parts: {}, carry: null, done: false }));
    st.bots = null; st.edge = [R.AX0, R.AX1]; st.rumbleT = 0; st.ringOut = null;
    st.pops = []; st.sparks = []; st.news = null;
    // catch-up: a gold Mega Fist waits on the pad of whoever is behind
    st.mega = [false, false];
    const w = info.wins || [0, 0];
    for (const k of [0, 1]) if (w[1 - k] > w[k] && !info.suddenDeath) st.mega[k] = true;
    st.catchup = st.mega.slice();
  }
  function nextKind(st) {
    if (!st.bag.length) {
      const all = []; for (const s of R.SLOTS) for (const q of R.KINDS[s]) all.push(q.k);
      for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
      st.bag = all;
    }
    return st.bag.shift();
  }
  function buildStep(st, dt) {
    st.t += dt;
    st.hopT -= dt;
    if (st.hopT <= 0) {
      st.hopT = R.hopEvery;
      const k = nextKind(st), mid = (R.beltX0 + R.beltX1) / 2;
      for (const dir of [-1, 1]) st.parts.push({ k, x: mid + dir * 8, y: R.beltY - 60, vy: 0, dir, on: 'drop', life: R.partLife, id: Math.random() });
      Sfx.play('rf27Clank', 1.3);
    }
    for (const q of st.parts) {
      if (q.skipT > 0) q.skipT -= dt;
      if (q.on === 'drop') { q.vy += 1400 * dt; q.y += q.vy * dt; if (q.y >= R.beltY - 14) { q.y = R.beltY - 14; q.vy = 0; q.on = 'belt'; } }
      else if (q.on === 'belt') { q.x += q.dir * R.beltV * dt; if (q.x < R.beltX0 - 6 || q.x > R.beltX1 + 6) { q.on = 'fall'; q.vx = q.dir * 60; } }
      else if (q.on === 'fall') { q.vy += 1400 * dt; q.y += q.vy * dt; q.x += q.vx * dt; if (q.y >= R.floorY - 14) { q.y = R.floorY - 14; q.on = 'floor'; } }
      else if (q.on === 'floor') { q.life -= dt; }
    }
    st.parts = st.parts.filter(q => !(q.on === 'floor' && q.life <= 0) && !q.gone);
    for (const p of G.players) {
      const rb = st.robots[p.id];
      // drop what you carry: press ▼ on the floor (Gavyn, 2026-11-16, controls audit: ▼ alone, like the card says; on
      // the belt ▼ drops you through it instead), or ▼ + the action anywhere (the old way, kept)
      const downNow = !!p.input.down, downPress = downNow && !rb.downWas;
      rb.downWas = downNow;
      let drop = false;
      if (p.pendingAct) { p.pendingAct = false; if (p.input.down) drop = true; }
      if (downPress && p.y + p.h > R.floorY - 10) drop = true;   // (near the floor, not up on the belt)
      if (drop && rb.carry) { st.parts.push({ k: rb.carry, x: p.x + p.w / 2, y: p.y, vy: -200, vx: p.face * 120, on: 'fall', life: R.partLife, id: Math.random(), skip: p.id, skipT: 0.8 }); rb.carry = null; Sfx.play('rf27Drop'); }
      // pick up a part you touch
      if (!rb.carry) {
        const q = st.parts.find(q => !(q.skip === p.id && q.skipT > 0) && (q.on === 'belt' || q.on === 'floor' || q.on === 'fall') && Math.abs(q.x - (p.x + p.w / 2)) < 24 && Math.abs(q.y - (p.y + p.h / 2)) < 30);
        if (q) { q.gone = true; rb.carry = q.k; st.stats.grabs[p.id]++; Sfx.play('rf27Beep', 1.3); rf27Pop(st, p.x + p.w / 2, p.y - 20, PART_NAME[q.k] + '!', '#ffffff', 15); }
      }
      // the mega fist on your pad
      const pad = R.pads[p.id], onPad = p.x + p.w / 2 > pad[0] && p.x + p.w / 2 < pad[1] && p.grounded;
      if (onPad && st.mega[p.id] && !rb.carry) { st.mega[p.id] = false; rb.parts.arms = 'mega'; rf27Pop(st, (pad[0] + pad[1]) / 2, 300, 'Mega Fist!', C.gold, 20); Sfx.play('rf27Ding'); }
      if (onPad && rb.carry) {
        const s = PART_SLOT[rb.carry];
        rb.parts[s] = rb.carry; rb.carry = null; st.stats.built[p.id]++;
        rf27Pop(st, (pad[0] + pad[1]) / 2, 300, 'Clink!', PCOL[p.id], 18); Sfx.play('rf27Fix', p.id ? 1.1 : 1);
        rf27Sparks(st, (pad[0] + pad[1]) / 2, 360, 8, PCOL[p.id]);
        if (done(rb.parts) && !rb.done) {
          rb.done = true;
          if (st.firstDone < 0) { st.firstDone = p.id; st.hurryT = R.hurry; rf27News(st, NAMES[p.id] + '\'s robot is ready! Hurry!', false, 3); Sfx.play('rf27Cheer'); }
        }
      }
    }
    if (st.hurryT != null) st.hurryT -= dt;
    if ((st.robots[0].done && st.robots[1].done) || (st.hurryT != null && st.hurryT <= 0) || st.t >= R.buildMax) startRumble(st);
  }
  function startRumble(st) {
    st.phase = 'rumble'; st.rumbleT = 0;
    st.bots = [0, 1].map(k => {
      const parts = Object.assign({}, st.robots[k].parts);
      for (const s of R.SLOTS) if (!parts[s]) parts[s] = 'rusty';
      const S = statsOf(parts);
      return { id: k, parts, S, x: k ? 660 - R.rw / 2 : 300 - R.rw / 2, y: R.AY - R.rh, w: R.rw, h: R.rh, vx: 0, vy: 0, grounded: true, face: k ? -1 : 1,
        charge: 0, charging: false, lunge: 0, hit: false, brace: false, braceT: 0, rest: 0, stun: 0, slide: 0, turbo: st.firstDone === k ? 3 : 0, fall: false };
    });
    rf27News(st, 'RUMBLE! Push the other robot off!', false, 2.5);
    Sfx.play('rf27Whirr', 0.6); Sfx.play('rf27Cheer');
    for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
  }
  function rumbleStep(st, dt) {
    st.rumbleT += dt;
    if (st.rumbleT > R.shrinkAt) {
      const mid = (R.AX0 + R.AX1) / 2;
      st.edge[0] = Math.min(mid - R.minW / 2, st.edge[0] + R.shrinkV * dt);
      st.edge[1] = Math.max(mid + R.minW / 2, st.edge[1] - R.shrinkV * dt);
      if (!st.toldShrink) { st.toldShrink = true; rf27News(st, 'The platform is folding in!', false, 2.5); Sfx.play('rf27Zap', 0.5); }
    }
    for (const b of st.bots) botStep(st, b, G.players[b.id], dt);
    collide(st);
    // shoves landing
    // (both checked first, so two shoves landing at once hit both robots the same way)
    const hits = st.bots.filter(b => {
      if (!(b.lunge > 0) || b.hit) return false;
      const o = st.bots[1 - b.id], front = b.face > 0 ? b.x + b.w : b.x, ofront = b.face > 0 ? o.x : o.x + o.w;
      const gap = (ofront - front) * b.face, vert = Math.abs((o.y + o.h / 2) - (b.y + b.h / 2)) < 50;
      return gap < b.S.reach && gap > -o.w && vert;
    });
    for (const b of hits) {
      const o = st.bots[1 - b.id];
      {
        b.hit = true; o.lunge = 0;
        const k = b.power * (o.brace ? 0.4 : 1) * (1 - o.S.guard * 0.5) / o.S.weight;
        o.vx = b.face * k; o.vy = -140 - k * 0.15; o.grounded = false; o.stun = 0.3; o.slide = 0.5; o.charge = 0; o.charging = false;
        if (!hits.includes(o)) b.vx *= 0.2;
        st.stats.shoves[b.id]++;
        const big = b.full;
        rf27Pop(st, (b.x + o.x) / 2 + b.w / 2, b.y - 10, big ? 'KA-POW!' : o.brace ? 'Thunk!' : 'Pow!', big ? C.gold : '#ffffff', big ? 26 : 20);
        Sfx.play('rf27Punch', big ? 0.7 : 1); rf27Sparks(st, (b.x + o.x) / 2 + b.w / 2, b.y + 20, big ? 14 : 8, big ? C.gold : '#ffffff');
        rumble(o.id, 0.4, 0.6, 140);
      }
    }
    // ring-outs
    for (const b of st.bots) {
      if (!b.fall && b.y > R.AY + 30) { b.fall = true; Sfx.play('rf27Boing', 0.6); rf27Pop(st, b.x + b.w / 2, R.AY + 60, 'Sploosh!', '#ff9fd6', 26); }
    }
    const fell = st.bots.filter(b => b.fall);
    if (fell.length && st.bots.some(b => b.y > R.AY + 90)) {
      if (fell.length === 2) matchRoundEnd(-1, 'Both in the foam!');
      else { st.stats.ringOuts[1 - fell[0].id]++; matchRoundEnd(1 - fell[0].id, NAMES[fell[0].id] + ' got pushed off!'); }
      return;
    }
    if (st.rumbleT >= R.roundMax) {
      const mid = (R.AX0 + R.AX1) / 2, d = st.bots.map(b => Math.abs(b.x + b.w / 2 - mid));
      if (Math.abs(d[0] - d[1]) < 12) matchRoundEnd(-1, 'Too close to call!');
      else { const w = d[0] < d[1] ? 0 : 1; matchRoundEnd(w, NAMES[w] + ' held the middle!'); }
    }
  }
  function botStep(st, b, p, dt) {
    const S = b.S, inp = p.input;
    b.stun = Math.max(0, b.stun - dt); b.slide = Math.max(0, b.slide - dt); b.rest = Math.max(0, b.rest - dt); b.turbo = Math.max(0, b.turbo - dt);
    const can = b.stun <= 0 && !b.fall;
    // brace
    const wantBrace = can && inp.down && b.grounded && b.rest <= 0 && !b.charging;
    if (wantBrace) { b.brace = true; b.braceT += dt; if (b.braceT > R.braceMax) { b.brace = false; b.rest = R.braceRest; b.braceT = 0; rf27Pop(st, b.x + b.w / 2, b.y - 16, 'Phew!', '#d9d3ef', 14); } }
    else { if (b.brace) b.rest = Math.max(b.rest, 0.25); b.brace = false; b.braceT = 0; }
    // walking
    const mv = can && !b.brace && b.lunge <= 0 ? (inp.right ? 1 : 0) - (inp.left ? 1 : 0) : 0;
    const sp = S.speed * (b.turbo > 0 ? 1.35 : 1) * (b.charging ? 0.55 : 1);
    if (mv) { b.vx = approach(b.vx, mv * sp, R.acc * dt); if (!b.charging) b.face = mv; }
    else if (b.lunge <= 0) b.vx = approach(b.vx, 0, (b.grounded ? R.fric : 400) * dt * (b.slide > 0 ? 0.6 : 1) * (b.brace ? 3 : 1));
    // jump
    if (p.pendingJump) { p.pendingJump = false; if (can && b.grounded && !b.brace) { b.vy = -S.jump; b.grounded = false; Sfx.play('jump', b.id); } }
    // charge and shove
    if (can && inp.act && !b.brace && b.lunge <= 0) { if (!b.charging) { b.charging = true; b.charge = 0; } b.charge += dt; if (b.charge >= S.charge && !b.fullTold) { b.fullTold = true; Sfx.play('rf27Ding', 1.4); } }
    else if (b.charging && !inp.act) {
      const f = clamp(b.charge / S.charge, 0, 1);
      b.charging = false; b.fullTold = false; b.full = f >= 1;
      b.power = S.push * (0.42 + 0.58 * f);
      b.lunge = R.lungeT; b.hit = false; b.vx = b.face * R.lungeV * (0.7 + 0.3 * f);
      Sfx.play('rf27Whirr', 1.4);
    } else if (!can) { b.charging = false; b.fullTold = false; }
    p.pendingAct = false;
    if (b.lunge > 0) b.lunge -= dt;
    // gravity and the platform
    b.vy = Math.min(b.vy + R.g * dt, 1000);
    b.x += b.vx * dt;
    const y0 = b.y; b.y += b.vy * dt;
    const onX = b.x + b.w > st.edge[0] + 4 && b.x < st.edge[1] - 4;
    if (!b.fall && onX && y0 + b.h <= R.AY + 1 && b.y + b.h >= R.AY) { b.y = R.AY - b.h; if (b.vy > 300) Sfx.play('rf27Clank', 0.6); b.vy = 0; b.grounded = true; }
    else if (b.y + b.h < R.AY - 0.5 || !onX) b.grounded = false;
    b.x = clamp(b.x, -80, W + 30);
    if (b.y > H + 200) b.y = H + 200;
  }
  // robots don't overlap: the lighter one gets pushed more
  function collide(st) {
    const [a, b] = st.bots;
    if (a.fall || b.fall) return;
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox <= 0 || oy <= 0) return;
    if (oy < ox && oy < 20) {
      // one landed on the other's head: slide off
      const top = a.y < b.y ? a : b, bot = top === a ? b : a;
      top.y = bot.y - top.h; top.vy = Math.min(0, top.vy);
      // (a slide at about walking pace: it speeds up to 150 px/s and no more)
      const sd = top.x < bot.x ? -1 : 1, sv = top.vx * sd;
      if (sv < 150) top.vx = sd * Math.min(150, sv + 60);
      return;
    }
    const wa = a.S.weight * (a.brace ? 2.5 : 1), wb = b.S.weight * (b.brace ? 2.5 : 1), sa = wb / (wa + wb), dir = a.x < b.x ? -1 : 1;
    a.x += dir * ox * sa; b.x -= dir * ox * (1 - sa);
    const va = a.vx, vb = b.vx;
    if ((vb - va) * dir > 0) { const v = (va * wa + vb * wb) / (wa + wb); a.vx = v; b.vx = v; }
  }

  /* ---------- seats: the players ride in their robots (screen coordinates for the engine's drawing) ---------- */
  function seats(st) {
    if (st.phase !== 'rumble' || !st.bots) return;
    for (const b of st.bots) {
      const p = G.players[b.id];
      p.x = b.x + b.w / 2 - PW / 2; p.y = b.y + 38 - PH; p.vx = 0; p.vy = 0; p.face = b.face; p.alive = !b.fall || b.y < R.AY + 80;
      p.stun = b.stun > 0 ? 0.05 : 0; p.grounded = true;
    }
  }
  function buildPlayers(st, dt) {
    for (const p of G.players) {
      control(p, dt);
    }
    separate();
    for (const p of G.players) { moveX(p, p.vx * dt); }
    const [up, lo] = G.players[1].y < G.players[0].y ? [G.players[1], G.players[0]] : [G.players[0], G.players[1]];
    moveY(up, up.vy * dt); moveY(lo, lo.vy * dt);
    for (const p of G.players) postStep(p);
  }

  MODES.robotrumble = {
    RUMBLE: R, statsOf, PART_SLOT, done,
    setup(st) { st.stats = { grabs: [0, 0], built: [0, 0], shoves: [0, 0], ringOuts: [0, 0] }; st.tick = 0; st.phase = 'build'; st.robots = [{ parts: {} }, { parts: {} }]; st.parts = []; },
    resetRound(n, info) { resetRound(G.mst, n, info); },
    go() { const st = G.mst; if (st.catchup && st.catchup.some(Boolean)) rf27News(st, 'Catch-up: a gold Mega Fist waits on ' + NAMES[st.catchup[0] ? 0 : 1] + '\'s pad!', true, 3.5); },
    step(dt) {
      const st = G.mst;
      st.tick++;
      rf27Fx(st, dt);
      if (st.phase === 'build') { buildPlayers(st, dt); buildStep(st, dt); }
      else if (st.phase === 'rumble') rumbleStep(st, dt);
      seats(st);
    },
    idle(dt) {
      const st = G.mst;
      rf27Fx(st, dt);
      if (st.phase === 'rumble' && st.bots) {
        for (const b of st.bots) { b.vy = Math.min(b.vy + R.g * dt, 1000); b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 0.96; const onX = b.x + b.w > st.edge[0] && b.x < st.edge[1]; if (!b.fall && onX && b.y + b.h >= R.AY && b.y + b.h - b.vy * dt <= R.AY + 1) { b.y = R.AY - b.h; b.vy = 0; } }
        seats(st);
      }
    },
    draw() { const st = G.mst; if (st.robots) drawWorld(st); },
    drawTop() { const st = G.mst; if (st.robots) drawTop(st); },
    hud() { const st = G.mst; if (st.robots) drawHud(st); },
    stats() {
      const s = G.mst.stats;
      if (!s) return [];
      return [
        { label: 'Parts grabbed', values: s.grabs.slice() },
        { label: 'Shoves landed', values: s.shoves.slice() },
        { label: 'Ring-outs', values: s.ringOuts.slice() },
        'Robots built: ' + s.built[0] + ' parts by Pip, ' + s.built[1] + ' by Bo.',
      ];
    },
  };

  /* ===================================== drawing ===================================== */
  function drawWorld(st) {
    const t = G.clock;
    rf27Backdrop(0, 0, 'test', t);
    if (st.phase === 'build') drawBuild(st, t);
    else drawArena(st, t);
  }
  function drawBuild(st, t) {
    // floor
    rf27Floor(0, R.floorY, W, H - R.floorY, 'test');
    // the hopper and the belt
    const mid = (R.beltX0 + R.beltX1) / 2;
    ctx.fillStyle = '#5a6488'; ctx.beginPath(); ctx.moveTo(mid - 50, 150); ctx.lineTo(mid + 50, 150); ctx.lineTo(mid + 20, 220); ctx.lineTo(mid - 20, 220); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(10,10,30,0.25)'; ctx.beginPath(); ctx.moveTo(mid + 10, 150); ctx.lineTo(mid + 50, 150); ctx.lineTo(mid + 20, 220); ctx.lineTo(mid + 5, 220); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3a4260'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mid - 50, 150); ctx.lineTo(mid - 20, 220); ctx.lineTo(mid + 20, 220); ctx.lineTo(mid + 50, 150); ctx.stroke();
    // the hopper's panel seams, rivet rows, a little window showing parts inside and a rolled rim
    ctx.strokeStyle = 'rgba(10,10,30,0.3)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(mid - 17, 150); ctx.lineTo(mid - 7, 220); ctx.moveTo(mid + 17, 150); ctx.lineTo(mid + 7, 220); ctx.stroke();
    ctx.fillStyle = '#2a2f4f'; for (let k = 0; k < 5; k++) { const u = k / 4, y = 158 + u * 54; for (const sd of [-1, 1]) { circle(mid + sd * (46 - u * 28), y, 1.4); ctx.fill(); } }
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.moveTo(mid - 48, 150); ctx.lineTo(mid - 44, 150); ctx.lineTo(mid - 16, 218); ctx.lineTo(mid - 19, 218); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1c2038'; rr(mid - 14, 166, 28, 16, 4); ctx.fill();
    ctx.fillStyle = '#ffc53d'; circle(mid - 6, 176, 3); ctx.fill(); ctx.fillStyle = '#9aa8c8'; ctx.fillRect(mid + 1, 172, 8, 6); ctx.fillStyle = '#ff7ab8'; circle(mid + 3, 180, 2.5); ctx.fill();
    ctx.fillStyle = 'rgba(190,240,255,0.25)'; ctx.beginPath(); ctx.moveTo(mid - 12, 180); ctx.lineTo(mid - 4, 168); ctx.lineTo(mid, 168); ctx.lineTo(mid - 8, 180); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3a4260'; ctx.lineWidth = 1.5; rr(mid - 14, 166, 28, 16, 4); ctx.stroke();
    rf27Stripes(mid - 50, 140, 100, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(mid - 50, 140, 100, 1.5); ctx.fillStyle = 'rgba(10,10,30,0.3)'; ctx.fillRect(mid - 50, 148, 100, 2);
    ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 1.5; ctx.strokeRect(mid - 50, 140, 100, 10);
    ctx.fillStyle = '#4a5270'; ctx.fillRect(mid - 6, 220, 12, R.beltY - 220);
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(mid - 6, 220, 2.5, R.beltY - 220); ctx.fillStyle = 'rgba(10,10,30,0.3)'; ctx.fillRect(mid + 3, 220, 3, R.beltY - 220);
    ctx.fillStyle = '#3a4262'; for (let y = 240; y < R.beltY - 8; y += 40) { ctx.fillRect(mid - 8, y, 16, 5); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(mid - 8, y, 16, 1); ctx.fillStyle = '#3a4262'; }
    ctx.fillStyle = 'rgba(10,10,30,0.2)'; ctx.beginPath(); ctx.ellipse(mid, R.floorY, (R.beltX1 - R.beltX0) / 2 + 10, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a2f4f'; rr(R.beltX0 - 10, R.beltY - 2, R.beltX1 - R.beltX0 + 20, 22, 10); ctx.fill();
    ctx.fillStyle = '#6a7296'; for (let x = R.beltX0; x <= R.beltX1; x += 24) { circle(x, R.beltY + 12, 6); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; for (let x = R.beltX0; x <= R.beltX1; x += 24) { circle(x - 1.5, R.beltY + 10.5, 2); ctx.fill(); }
    ctx.save(); ctx.beginPath(); ctx.rect(R.beltX0, R.beltY - 2, R.beltX1 - R.beltX0, 8); ctx.clip();
    ctx.strokeStyle = '#ffc53d'; ctx.lineWidth = 2;
    const off = (t * R.beltV) % 30;
    for (let x = mid; x < R.beltX1 + 30; x += 30) { ctx.beginPath(); ctx.moveTo(x + off, R.beltY - 2); ctx.lineTo(x + off + 5, R.beltY + 2); ctx.lineTo(x + off, R.beltY + 6); ctx.stroke(); }
    for (let x = mid; x > R.beltX0 - 30; x -= 30) { ctx.beginPath(); ctx.moveTo(x - off, R.beltY - 2); ctx.lineTo(x - off - 5, R.beltY + 2); ctx.lineTo(x - off, R.beltY + 6); ctx.stroke(); }
    ctx.restore();
    // the belt legs: steel posts with a lit edge, a cross brace, bolts and feet
    for (const lx of [R.beltX0 + 20, R.beltX1 - 30]) {
      ctx.fillStyle = '#4a5270'; ctx.fillRect(lx, R.beltY + 20, 10, R.floorY - R.beltY - 20);
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(lx, R.beltY + 20, 2.5, R.floorY - R.beltY - 20);
      ctx.fillStyle = 'rgba(10,10,30,0.3)'; ctx.fillRect(lx + 7.5, R.beltY + 20, 2.5, R.floorY - R.beltY - 20);
      ctx.fillStyle = '#3a4262'; ctx.fillRect(lx - 5, R.floorY - 6, 20, 6); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(lx - 5, R.floorY - 6, 20, 1.2);
      ctx.fillStyle = '#20243c'; circle(lx - 1.5, R.floorY - 3, 1.2); ctx.fill(); circle(lx + 11.5, R.floorY - 3, 1.2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(74,82,112,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(R.beltX0 + 30, R.beltY + 30); ctx.lineTo(R.beltX1 - 30, R.floorY - 14); ctx.moveTo(R.beltX1 - 30, R.beltY + 30); ctx.lineTo(R.beltX0 + 30, R.floorY - 14); ctx.stroke();
    // pads and the robots being built
    for (const k of [0, 1]) {
      const pad = R.pads[k], cx = (pad[0] + pad[1]) / 2;
      ctx.fillStyle = 'rgba(10,10,30,0.25)'; ctx.beginPath(); ctx.ellipse(cx, R.floorY + 2, (pad[1] - pad[0]) / 2 + 6, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PDARK[k]; rr(pad[0], R.floorY - 6, pad[1] - pad[0], 10, 5); ctx.fill();
      ctx.fillStyle = PCOL[k]; rr(pad[0], R.floorY - 8, pad[1] - pad[0], 10, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(pad[0] + 6, R.floorY - 6, pad[1] - pad[0] - 12, 3);
      // grip bars and bolts on the pad, and lit chevrons pointing in
      ctx.fillStyle = 'rgba(10,10,30,0.25)'; for (let x = pad[0] + 14; x < pad[1] - 14; x += 10) ctx.fillRect(x, R.floorY - 3, 5, 2.5);
      ctx.fillStyle = PDARK[k]; circle(pad[0] + 7, R.floorY - 3, 1.6); ctx.fill(); circle(pad[1] - 7, R.floorY - 3, 1.6); ctx.fill();
      drawRobot(cx, R.floorY - 8, st.robots[k].parts, k, 1, t, { ghost: true, face: k ? -1 : 1 });
      if (st.mega && st.mega[k]) { ctx.fillStyle = C.gold; circle(cx + (k ? 40 : -40), R.floorY - 30 + Math.sin(t * 4) * 3, 12); ctx.fill(); text('!', cx + (k ? 40 : -40), R.floorY - 30, 14, '#5a3a00', 'center'); }
      if (st.robots[k].done) text('READY!', cx, R.floorY - 150, 18, C.gold, 'center');
    }
    for (const q of st.parts) drawPart(q.k, q.x, q.y, q.on === 'floor' && q.life < 2 ? (Math.sin(t * 20) > 0 ? 0.4 : 1) : 1, t);
  }
  // the lift column (112 x 84 from (mid - 56, AY + 18)), painted once: a round steel housing shaded like a cylinder,
  // reinforcing rings with bolts, a hydraulic ram, a hose and a warning plate
  function liftPic() {
    return rf27Pic('w27lift', 112, 84, c => {
      c.translate(56, -18); const mx = 0, AY = 0;
      const cg = c.createLinearGradient(mx - 40, 0, mx + 40, 0);
      cg.addColorStop(0, '#3a4262'); cg.addColorStop(0.22, '#6a7398'); cg.addColorStop(0.4, '#566088'); cg.addColorStop(0.85, '#343b5a'); cg.addColorStop(1, '#262c48');
      c.fillStyle = cg; c.fillRect(mx - 40, AY + 20, 80, 80);
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(mx - 26, AY + 34, 2, 66);
      c.fillStyle = '#9aa4c6'; c.fillRect(mx - 7, AY + 32, 14, 30); c.fillStyle = '#e6ecff'; c.fillRect(mx - 4, AY + 32, 2.5, 30); c.fillStyle = 'rgba(10,10,30,0.35)'; c.fillRect(mx + 3, AY + 32, 4, 30);
      c.fillStyle = '#2a2f4f'; c.fillRect(mx - 12, AY + 60, 24, 5);
      for (const ry of [AY + 42, AY + 66]) {
        const rg = c.createLinearGradient(mx - 43, 0, mx + 43, 0); rg.addColorStop(0, '#4a5274'); rg.addColorStop(0.25, '#8a94b8'); rg.addColorStop(1, '#2a3050');
        c.fillStyle = rg; c.fillRect(mx - 43, ry, 86, 7);
        c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(mx - 43, ry, 86, 1.2); c.fillStyle = 'rgba(10,10,30,0.4)'; c.fillRect(mx - 43, ry + 6, 86, 1);
        c.fillStyle = '#20243c'; for (const dx of [-34, -17, 17, 34]) { circleOn(c, mx + dx, ry + 3.5, 1.6); c.fill(); }
        c.fillStyle = 'rgba(255,255,255,0.5)'; for (const dx of [-34, -17, 17, 34]) c.fillRect(mx + dx - 1, ry + 2.2, 1, 1);
      }
      const hose = () => { c.beginPath(); c.moveTo(mx + 30, AY + 34); c.bezierCurveTo(mx + 54, AY + 40, mx + 50, AY + 70, mx + 34, AY + 80); };
      c.lineCap = 'round'; c.strokeStyle = '#20243c'; c.lineWidth = 4; hose(); c.stroke();
      c.strokeStyle = '#ff6b5a'; c.lineWidth = 2.5; hose(); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(mx + 31, AY + 33); c.bezierCurveTo(mx + 53, AY + 38, mx + 49, AY + 66, mx + 36, AY + 77); c.stroke();
      c.fillStyle = '#ffc53d'; c.beginPath(); c.moveTo(mx - 30, AY + 62); c.lineTo(mx - 21, AY + 52); c.lineTo(mx - 12, AY + 62); c.closePath(); c.fill();
      c.strokeStyle = '#2a2a3a'; c.lineWidth = 1.2; c.stroke(); c.fillStyle = '#2a2a3a'; c.fillRect(mx - 21.6, AY + 55.5, 1.4, 3.5); c.fillRect(mx - 21.6, AY + 59.8, 1.4, 1.2);
      c.strokeStyle = '#20243c'; c.lineWidth = 1.5; c.strokeRect(mx - 39.25, AY + 20, 78.5, 80);
    });
  }
  // a row of bobbing foam cubes, copied onto whole device pixels with one transform for the row
  function foamRow(back, x0, y0, amp, freq, t) {
    const pics = back ? [0, 1, 2].map(v => foamPic(1, v)) : [0, 1, 2, 3].map(v => foamPic(0, v)), n = pics.length;
    const m = ctx.getTransform(), sc = pics[0].width / 40;
    const fast = !m.b && !m.c && Math.abs(m.a - sc) < 0.02 && Math.abs(m.d - sc) < 0.02;
    if (fast) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); }
    for (let x = x0, k = 0; x < W + 37; x += 34, k++) {
      const xx = x - 20, yy = y0 + Math.sin(t * 2 + (back ? (x - 17) * freq : x)) * amp;
      if (fast) ctx.drawImage(pics[k % n], Math.round(m.a * xx + m.e), Math.round(m.d * yy + m.f));
      else ctx.drawImage(pics[k % n], xx, yy, 40, 40);
    }
    if (fast) ctx.restore();
  }
  // a foam cube for the pit, 40 x 40, centred: back (1) is in shade; v picks the tilt and tone
  function foamPic(back, v) {
    return rf27Pic('w27foam|' + back + '|' + v, 40, 40, c => {
      const base = back ? ['#e07ab8', '#d870b0', '#e486c0'][v % 3] : ['#ffc3e6', '#ffb8e0', '#ffd0ec', '#ffbadf'][v % 4];
      c.translate(20, 20); c.rotate([-0.12, 0.08, -0.04, 0.14][v % 4]);
      const r = 15;
      c.fillStyle = rf27Dk(base, 0.25); rrOn(c, -r, -r + 2, r * 2, r * 2, 7); c.fill();
      const g = c.createLinearGradient(-r, -r, r, r); g.addColorStop(0, rf27Lt(base, 0.35)); g.addColorStop(0.5, base); g.addColorStop(1, rf27Dk(base, 0.12));
      c.fillStyle = g; rrOn(c, -r, -r, r * 2, r * 2 - 1, 7); c.fill();
      c.fillStyle = rf27Dk(base, 0.18); for (let k = 0; k < 9; k++) { const q = hash(k + v * 13, 40 + back); circleOn(c, -10 + q % 21, -9 + (q >>> 6) % 19, 0.9 + (q >>> 12) % 2 * 0.4); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,' + (back ? 0.25 : 0.6) + ')'; c.beginPath(); c.ellipse(-6, -8, 5, 3, -0.5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = rf27Dk(base, 0.4); c.lineWidth = 1.2; rrOn(c, -r, -r, r * 2, r * 2 + 1, 7); c.stroke();
    });
  }
  function drawArena(st, t) {
    // the foam pit: (art pass 2) soft foam cubes, each a cached picture (rounded, tilted, a lit top-left, a shaded
    // underside, pores and a glossy spot); a back row in shade, a front row lit that the lift column sinks into
    { const pg = ctx.createLinearGradient(0, R.AY + 80, 0, H); pg.addColorStop(0, '#f08cc8'); pg.addColorStop(1, '#ffa8da'); ctx.fillStyle = pg; ctx.fillRect(0, R.AY + 80, W, H - R.AY - 80); }
    foamRow(1, -7 + 17, R.AY + 100 - 20, 2, 0.7, t);
    const e0 = st.edge[0], e1 = st.edge[1], mx = (e0 + e1) / 2;
    // the lift column under the platform: a round steel housing (shaded like a cylinder), reinforcing rings with
    // bolts, a hydraulic ram, hoses and a warning plate
    rf27Blit(liftPic(), mx - 56, R.AY + 18, 112, 84);
    rf27Stripes(mx - 40, R.AY + 26, 80, 8);
    // the platform (with its folding edges), a row of lamps and panel seams on its side face
    rf27Floor(e0, R.AY, e1 - e0, 26, 'test');
    ctx.fillStyle = 'rgba(10,10,30,0.22)'; for (let x = Math.ceil((e0 + 10) / 62) * 62; x < e1 - 10; x += 62) ctx.fillRect(x, R.AY + 15, 1.5, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; for (let x = Math.ceil((e0 + 10) / 62) * 62; x < e1 - 10; x += 62) ctx.fillRect(x + 1.5, R.AY + 15, 1, 10);
    for (let x = Math.ceil((e0 + 26) / 31) * 31, k = 0; x < e1 - 20; x += 31, k++) {
      if (Math.round(x / 31) % 2) { ctx.fillStyle = '#2a2a3a'; circle(x, R.AY + 20, 2.6); ctx.fill(); ctx.fillStyle = (Math.floor(t * 3) + Math.round(x / 62)) % 4 ? '#ffd84d' : '#ff9a3d'; circle(x, R.AY + 20, 1.7); ctx.fill(); }
      else { ctx.fillStyle = '#3e3038'; circle(x, R.AY + 20, 1.5); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x - 1, R.AY + 18.8, 1, 1); }
    }
    ctx.fillStyle = 'rgba(10,10,30,0.3)'; ctx.fillRect(e0, R.AY + 26, e1 - e0, 6);
    rf27Stripes(e0, R.AY, 10, 26); rf27Stripes(e1 - 10, R.AY, 10, 26);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect((R.AX0 + R.AX1) / 2 - 2, R.AY + 3, 4, 10);
    foamRow(0, 10, R.AY + 84 - 18, 3, 1, t);
    for (const b of st.bots || []) drawBot(st, b, t);
  }
  function drawBot(st, b, t) {
    const cx = b.x + b.w / 2, feet = b.y + b.h;
    if (feet <= R.AY + 2 && cx > st.edge[0] && cx < st.edge[1]) { const up = clamp((R.AY - feet) / 120, 0, 1); ctx.fillStyle = 'rgba(10,10,30,' + (0.28 * (1 - up)) + ')'; ctx.beginPath(); ctx.ellipse(cx, R.AY + 1, 30 * (1 - up * 0.4), 5, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.save();
    if (b.stun > 0) { ctx.translate(cx, feet); ctx.rotate(Math.sin(G.clock * 40) * 0.06); ctx.translate(-cx, -feet); }
    drawRobot(cx, feet, b.parts, b.id, 1, t, { face: b.face, charge: b.charging ? clamp(b.charge / b.S.charge, 0, 1) : 0, lunge: b.lunge > 0, brace: b.brace, turbo: b.turbo > 0 });
    ctx.restore();
  }
  // a robot from its parts, feet at (cx, feet); missing parts are dashed ghosts when o.ghost
  function drawRobot(cx, feet, parts, id, s, t, o = {}) {
    const col = PCOL[id], dark = PDARK[id], face = o.face || 1;
    ctx.save(); ctx.translate(cx, feet); ctx.scale(s, s);
    const ghost = (x, y, w, h) => { ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; rr(x, y, w, h, 6); ctx.stroke(); ctx.setLineDash([]); };
    const brace = o.brace ? 6 : 0;
    // legs
    const L = parts.legs;
    if (!L) { if (o.ghost) ghost(-20, -20, 40, 20); }
    else if (L === 'treads') { ctx.fillStyle = '#2a2f4f'; rr(-24, -18 + brace, 48, 18, 9); ctx.fill(); ctx.fillStyle = '#6a7296'; for (let k = -16; k <= 16; k += 10) { circle(k, -9 + brace, 4); ctx.fill(); } }
    else if (L === 'springs') { ctx.strokeStyle = '#c4cee6'; ctx.lineWidth = 3; for (const lx of [-12, 12]) { ctx.beginPath(); for (let k = 0; k <= 6; k++) ctx.lineTo(lx + (k % 2 ? 6 : -6), -k * 3.3 + brace * (k / 6)); ctx.stroke(); ctx.fillStyle = dark; rr(lx - 9, -4, 18, 5, 2); ctx.fill(); } }
    else { ctx.fillStyle = '#9a6a4a'; ctx.fillRect(-16, -18 + brace, 8, 18 - brace); ctx.fillRect(8, -18 + brace, 8, 18 - brace); }
    // body
    const B = parts.body, by = -20 + brace;
    if (!B) { if (o.ghost) ghost(-22, by - 34, 44, 34); }
    else {
      ctx.fillStyle = B === 'rusty' ? '#a07a5a' : B === 'tank' ? '#8a96b4' : '#c4cee6'; ctx.strokeStyle = '#2a2f4f'; ctx.lineWidth = 3;
      const bx0 = B === 'tank' ? -25 : -21, bw0 = B === 'tank' ? 50 : 42;
      rr(bx0, by - 34, bw0, 34, B === 'turbo' ? 14 : 6); ctx.fill();
      ctx.fillStyle = 'rgba(20,20,50,0.18)'; rr(bx0 + bw0 - 12, by - 32, 10, 30, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(bx0 + 4, by - 31, 3, 24);
      if (B === 'rusty') { ctx.fillStyle = 'rgba(120,60,30,0.35)'; circle(bx0 + 30, by - 6, 4); ctx.fill(); circle(bx0 + 8, by - 26, 3); ctx.fill(); }
      ctx.fillStyle = '#5a6488'; for (const [a, b] of [[bx0 + 5, by - 5], [bx0 + bw0 - 5, by - 5]]) { circle(a, b, 1.8); ctx.fill(); }
      rr(bx0, by - 34, bw0, 34, B === 'turbo' ? 14 : 6); ctx.stroke();
      ctx.fillStyle = col; ctx.fillRect(-18, by - 10, 36, 5);
      ctx.fillStyle = 'rgba(20,30,60,0.7)'; rr(-12, by - 30, 24, 18, 6); ctx.fill();
      if (B === 'turbo') { ctx.fillStyle = o.turbo ? '#ffb84d' : '#ff8a5a'; ctx.beginPath(); ctx.moveTo(-face * 22, by - 22); ctx.lineTo(-face * (34 + Math.sin(t * 30) * 4), by - 17); ctx.lineTo(-face * 22, by - 12); ctx.fill(); }
    }
    // arms (the front one reaches out on a lunge)
    const A = parts.arms, ay = by - 22;
    if (!A) { if (o.ghost) ghost(face * 22, ay - 6, face * 22, 14); }
    else {
      const reach = o.lunge ? 34 : o.charge ? -6 * o.charge : 0, fx = face * (30 + reach);
      ctx.strokeStyle = '#5a6488'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(face * 18, ay); ctx.lineTo(fx, ay + 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-face * 18, ay); ctx.lineTo(-face * 26, ay + 14); ctx.stroke();
      const r = A === 'mega' ? 13 : A === 'boxers' ? 10 : 9;
      ctx.fillStyle = A === 'mega' ? C.gold : A === 'boxers' ? '#e8574a' : A === 'bumpers' ? '#7aff9a' : '#9a6a4a';
      if (A === 'bumpers') { rr(fx - 5, ay - 8, 10, 24, 5); ctx.fill(); } else { circle(fx, ay + 4, r); ctx.fill(); }
      if (o.charge) { ctx.strokeStyle = o.charge >= 1 ? C.gold : 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; circle(fx, ay + 4, r + 4 + o.charge * 4); ctx.stroke(); }
    }
    // head
    const Hh = parts.head, hy = by - 34;
    if (!Hh) { if (o.ghost) ghost(-14, hy - 22, 28, 22); }
    else {
      ctx.fillStyle = Hh === 'rusty' ? '#a07a5a' : '#c4cee6'; ctx.strokeStyle = '#2a2f4f'; ctx.lineWidth = 3;
      rr(-14, hy - 22, 28, 22, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(-11, hy - 20, 22, 2.5);
      ctx.fillStyle = 'rgba(20,20,50,0.15)'; ctx.fillRect(-12, hy - 6, 24, 4);
      rr(-14, hy - 22, 28, 22, 6); ctx.stroke();
      if (Hh === 'visor') { ctx.fillStyle = '#7affff'; rr(-11 + face * 2, hy - 16, 22, 8, 4); ctx.fill(); }
      else { ctx.fillStyle = '#1c1a36'; circle(-5 + face * 2, hy - 12, 2.5); ctx.fill(); circle(5 + face * 2, hy - 12, 2.5); ctx.fill(); }
      if (Hh === 'antenna') { ctx.strokeStyle = '#2a2f4f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, hy - 22); ctx.lineTo(0, hy - 34); ctx.stroke(); ctx.fillStyle = Math.sin(t * 8) > 0 ? '#ff6b6b' : '#ffd36b'; circle(0, hy - 36, 4); ctx.fill(); }
    }
    if (o.brace) { ctx.strokeStyle = 'rgba(191,246,255,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -30, 42, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    ctx.restore();
  }
  function drawPart(k, x, y, alpha, t) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
    ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(-19, -17, 38, 34, 9); ctx.fill();
    ctx.strokeStyle = k === 'mega' ? C.gold : '#c4cee6'; ctx.lineWidth = 2; rr(-19, -17, 38, 34, 9); ctx.stroke();
    ctx.scale(0.8, 0.8);
    const slot = PART_SLOT[k] || 'arms', parts = { [slot]: k };
    const off = { legs: 10, body: 37, arms: 30, head: 64 }[slot];
    if (slot === 'arms') ctx.translate(-16, 0);
    ctx.translate(0, off);
    drawRobot(0, 0, parts, 0, 1, t, { face: 1 });
    ctx.restore();
  }
  function drawTop(st) {
    // what each player carries
    if (st.phase === 'build') for (const p of G.players) { const c = st.robots[p.id].carry; if (c) drawPart(c, p.x + p.w / 2, p.y - 22, 1, G.clock); }
    if (st.phase === 'rumble' && st.bots) for (const b of st.bots) {
      // cockpit glass
      ctx.fillStyle = 'rgba(190,240,255,0.18)'; rr(b.x + b.w / 2 - 12, b.y + b.h - 50 + (b.brace ? 6 : 0), 24, 18, 6); ctx.fill();
    }
    rf27DrawPops(st);
  }
  function drawHud(st) {
    const big = rf27Big();
    // the news line sits under the timer pill (it used to sit on top of it)
    rf27DrawNews(st, big ? 132 : 108);
    if (st.phase === 'build') {
      const left = Math.max(0, st.hurryT != null ? Math.min(st.hurryT, R.buildMax - st.t) : R.buildMax - st.t);
      const s = st.hurryT != null ? 'Hurry! ' + Math.ceil(left) : 'Build your robot! ' + Math.ceil(left);
      ctx.font = '700 ' + (big ? 18 : 14) + 'px ' + RF27.FONT;
      const w = ctx.measureText(s).width + 30;
      pill(W / 2, big ? 96 : 78, w, big ? 30 : 24, 'center');
      text(s, W / 2, (big ? 96 : 78) + (big ? 15.5 : 12.5), big ? 18 : 14, st.hurryT != null ? C.gold : C.paper, 'center', 'body');
      // slot checklists by each pad
      for (const k of [0, 1]) {
        const rb = st.robots[k], x = k ? W - 150 : 14, y = big ? 130 : 110;
        ctx.fillStyle = 'rgba(28,26,54,0.75)'; rr(x, y, 136, 88, 10); ctx.fill();
        R.SLOTS.forEach((s, i) => {
          const have = rb.parts[s];
          text((have ? '✓ ' : '○ ') + s + (have ? ': ' + PART_NAME[have] : ''), x + 10, y + 13 + i * 20, 12, have ? PCOL[k] : '#d9d3ef', 'left', 'body');
        });
      }
      if (!isCpu(0) || !isCpu(1)) {
        const tipY = H - 24;
        const s2 = 'Walk into parts, carry them to your own pad';
        ctx.font = '700 13px ' + RF27.FONT; const w2 = ctx.measureText(s2).width + 26;
        pill(W / 2, tipY - 12, w2, 24, 'center'); text(s2, W / 2, tipY + 0.5, 13, '#d9d3ef', 'center', 'body');
      }
    } else if (st.bots) {
      const left = Math.max(0, R.roundMax - st.rumbleT);
      const s = 'RUMBLE  ' + Math.ceil(left);
      ctx.font = '700 ' + (big ? 18 : 14) + 'px ' + RF27.FONT;
      const w = ctx.measureText(s).width + 30;
      pill(W / 2, big ? 96 : 78, w, big ? 30 : 24, 'center');
      text(s, W / 2, (big ? 96 : 78) + (big ? 15.5 : 12.5), big ? 18 : 14, left < 10 ? C.gold : C.paper, 'center', 'body');
      // each robot's parts, small, in the corners
      for (const b of st.bots) {
        const s3 = NAMES[b.id] + ': ' + R.SLOTS.map(s => (PART_NAME[b.parts[s]] || 'Rusty')).join(' · '), fs = big ? 13 : 11;
        ctx.font = '700 ' + fs + 'px ' + RF27.FONT;
        const w3 = ctx.measureText(s3).width + 20, x = b.id ? W - 14 - w3 : 14, y = H - (big ? 46 : 36);
        ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(x, y, w3, big ? 32 : 26, 10); ctx.fill();
        text(s3, x + 10, y + (big ? 16.5 : 13.5), fs, PCOL[b.id], 'left', 'body');
      }
      if (!isCpu(0) || !isCpu(1)) {
        const h = G.players.find(p => !isCpu(p.id)) || G.players[0];
        if (st.rumbleT < 6) {
          const s2 = 'Hold ' + key(h.id, 'act') + ' to charge, let go to shove! Hold ' + key(h.id, 'down') + ' to brace';
          ctx.font = '700 13px ' + RF27.FONT; const w2 = ctx.measureText(s2).width + 26;
          pill(W / 2, big ? 176 : 146, w2, 24, 'center'); text(s2, W / 2, (big ? 176 : 146) + 12.5, 13, '#d9d3ef', 'center', 'body');
        }
      }
    }
  }
})();
