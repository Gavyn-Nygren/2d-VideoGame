/* Pip & Bo - Level 32-4 Power Punch Showdown (versus, World 32 Superhero City). */
'use strict';

/* ===== 32-4 Power Punch Showdown (mode 'punchout', versus, best of 5, Gavyn's pick) =====
   Gavyn's pick: "a rooftop brawl with random power-ups (speed, flight, shield, giant fists)".
   def.ownStep: the mode runs the whole live tick and draws everything itself (the engine bodies are hidden and only
   follow along for name tags and speech bubbles).
   THE ARENA: one rooftop (x 120..840, roof at y 440) high over the city, with two steel catwalks (y 330) and a neon sign
     on top (y 240) to jump onto from below (you can jump up through them, and walk off their ends). Past the roof's
     ends is the street, far below: fall off and it's a RING OUT.
   CONTROLS (p.input / pendingJump / pendingAct only, so keyboard, controller and touch all work): move, jump (a second
     jump in the air: a double jump), tap the action to PUNCH, hold ▼ on the ground to BLOCK (a blocked punch does a
     fifth of the damage and barely pushes you; you can't move while blocking).
   DAMAGE: every punch adds to the other hero's damage % (9, giant fists 14) and knocks them away; the more damage
     they have, the further they fly (180 + 5.5 px/s per %). Getting hit gives back your double jump, so you can always
     try to jump back to the roof.
   POWER-UPS: every 7-10 s a glowing power drops on a little parachute somewhere on the roof (one at a time, it fades
     after 9 s). Touch it to take it:
     SPEED (7 s): run much faster and punch quicker.  FLIGHT (7 s): hold jump to fly; you fall slowly.
     SHIELD (10 s or one hit): a bubble that stops the next punch completely.  GIANT FISTS (7 s): longer reach, harder hits.
   ROUNDS (def.match: best of 5, 45 s each): the first to knock the other off the roof wins the round. TIME UP: the one
     with less damage wins (by more than 5 %), else a tie. tiebreak(): more punches landed this match. Sudden death:
     the next win takes it.
   CATCH-UP HELP (gold, announced at GO, counted, off in sudden death, for whoever is behind, the computer too): 1 round
     behind = start the round with a gold shield bubble.
   MODES.punchout.plan(st, id) (where the other hero is, reach, the edges, the power on the field) feeds the prompts and
     the computer brain. Sounds are Sfx.extra.punchout*. */
(() => {
  const K = HEROCITY, TAU = Math.PI * 2, FONT = K.FONT;
  const PO = {
    GY: 440, L: 120, R: 840, g: 1700, jumpV: 640, airV: 540, runV: 230, fastV: 350, acc: 1900, accAir: 1100,
    maxFall: 820, flyUp: 1500, flyMax: 260, flyFall: 150, hw: 11, bh: 26,
    windT: 0.07, hitT: 0.17, punchT: 0.32, fastPunch: 0.22, reach: 44, giantReach: 70, dmg: 9, giantDmg: 14,
    kb0: 120, kbK: 3.4, kbMax: 920, up0: 170, upK: 2.4, stun0: 0.18, stunK: 0.004, blockK: 0.2, safeT: 0.3,
    powT: 7, shieldT: 10, powLife: 9, powFirst: [5, 7], powNext: [7, 10], outY: 640, roundTime: 45, winBy: 5,
  };
  // one-way floors (jump up through them), the roof itself is solid
  const PLATS = [{ x0: 190, x1: 320, y: 330 }, { x0: 640, x1: 770, y: 330 }, { x0: 420, x1: 540, y: 240 }];
  const POWERS = {
    speed: { name: 'SPEED', col: '#ffe14a', glow: 'rgba(255,225,74,0.45)' },
    fly: { name: 'FLIGHT', col: '#8fdcff', glow: 'rgba(143,220,255,0.45)' },
    shield: { name: 'SHIELD', col: '#7affd8', glow: 'rgba(122,255,216,0.4)' },
    giant: { name: 'GIANT FISTS', col: '#ff6a5a', glow: 'rgba(255,106,90,0.4)' },
  };
  const PKEYS = Object.keys(POWERS);
  const rnd = (a, b) => a + Math.random() * (b - a);

  function newRound(st, n, info) {
    st.round = n; st.t = 0; st.res = null;
    const w = info.wins || [0, 0];
    st.f = [0, 1].map(id => ({
      id, x: id ? 640 : 320, y: PO.GY, vx: 0, vy: 0, face: id ? -1 : 1, grounded: true, jumps: 1, dmg: 0, hurt: 0,
      punch: -1, hitDone: false, safe: 0, block: false, pow: null, powT: 0, shield: 0, sq: 0, flash: 0, out: false, fx: 0,
      gold: info.suddenDeath || st.noHelp ? false : w[1 - id] - w[id] >= 1,
    }));
    for (const F of st.f) if (F.gold) F.shield = 2; // (2 = the gold shield: it lasts until it is hit)
    st.orb = null; st.orbT = rnd(...PO.powFirst);
    st.shake = 0;
    K.fx(st);
    mirror(st);
  }

  /* ---------- the tick ---------- */
  function tick(st, dt, live) {
    if (!st.f) return;
    st.t += dt;
    if (st.shake > 0) st.shake = Math.max(0, st.shake - dt * 2);
    for (const b of st.bursts) b.t += dt;
    for (const F of st.f) fighter(st, F, dt, live);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    // (both punches are checked before either lands, so a trade hits both)
    if (live) { const hits = st.f.map(F => connects(st, F)); st.f.forEach((F, k) => { if (hits[k]) punchHit(st, F); }); orbStep(st, dt); }
    if (live && !st.res) {
      const outs = st.f.filter(F => F.out);
      if (outs.length) {
        st.res = true;
        const w = outs.length === 2 ? -1 : 1 - outs[0].id;
        if (w >= 0) st.stat.wins[w]++;
        for (const F of outs) st.stat.outs[F.id]++;
        Sfx.play('punchoutKO');
        matchRoundEnd(w, w < 0 ? 'Both off the roof: a double ring out!' : 'RING OUT! ' + NAMES[w] + ' knocked ' + NAMES[1 - w] + ' off the roof!');
      }
    }
    K.tickFx(st, dt);
    mirror(st);
  }
  const NOIN = { left: false, right: false, jump: false, down: false, up: false, act: false };
  function fighter(st, F, dt, live) {
    const p = G.players[F.id], ok = live && !F.out && F.hurt <= 0, i = ok ? p.input : NOIN;
    const jump = ok && p.pendingJump, act = ok && p.pendingAct;
    if (F.sq > 0) F.sq = Math.max(0, F.sq - dt * 4);
    if (F.flash > 0) F.flash -= dt;
    if (F.hurt > 0) F.hurt -= dt;
    if (F.safe > 0) F.safe -= dt;
    if (F.pow) { F.powT -= dt; if (F.powT <= 0) { if (F.pow === 'shield' && F.shield === 1) F.shield = 0; F.pow = null; Sfx.play('punchoutFade', F.id); } }
    if (F.out) { F.vy = Math.min(PO.maxFall, F.vy + PO.g * dt); F.y += F.vy * dt; F.x += F.vx * dt; return; }
    // punching
    if (F.punch >= 0) { F.punch += dt; if (F.punch >= (F.pow === 'speed' ? PO.fastPunch : PO.punchT)) F.punch = -1; }
    F.block = ok && F.grounded && i.down && F.punch < 0;
    if (act && F.punch < 0 && !F.block) { F.punch = 0; F.hitDone = false; Sfx.play('punchoutSwing', F.id); st.stat.swings[F.id]++; }
    // moving
    const want = F.block ? 0 : (i.right ? 1 : 0) - (i.left ? 1 : 0);
    if (want && F.punch < 0) F.face = want;
    const vmax = F.pow === 'speed' ? PO.fastV : PO.runV;
    if (F.hurt > 0) F.vx = approach(F.vx, 0, (F.grounded ? 900 : 380) * dt);
    else F.vx = approach(F.vx, want * vmax * (F.punch >= 0 && F.grounded ? 0.35 : 1), (F.grounded ? PO.acc : PO.accAir) * dt);
    if (jump) {
      if (F.grounded) { F.vy = -PO.jumpV; F.grounded = false; F.sq = 0.4; Sfx.play('punchoutJump', F.id); }
      else if (F.jumps > 0 && F.pow !== 'fly') { F.jumps--; F.vy = -PO.airV; Sfx.play('punchoutJump2', F.id); K.poof(st, F.x, F.y, 5); }
    }
    // flight: hold jump to rise, fall slowly
    const flying = F.pow === 'fly' && i.jump && !F.grounded;
    if (F.pow === 'fly' && i.jump && F.grounded && ok) { F.grounded = false; F.vy = -200; }
    if (flying) F.vy = Math.max(-PO.flyMax, F.vy - PO.flyUp * dt);
    F.vy = Math.min(F.pow === 'fly' ? PO.flyFall : PO.maxFall, F.vy + PO.g * dt);
    if (F.pow === 'fly' && F.y < 60 && F.vy < 0) F.vy = 0;
    const ox = F.x, oy = F.y;
    F.x += F.vx * dt;
    let ny = F.y + F.vy * dt;
    // standing on something
    const onRoof = F.x > PO.L && F.x < PO.R;
    F.grounded = false;
    if (F.vy >= 0) {
      if (onRoof && oy <= PO.GY + 0.5 && ny >= PO.GY) { ny = PO.GY; land(st, F); }
      else for (const q of PLATS) if (oy <= q.y + 0.5 && ny >= q.y && F.x > q.x0 - 4 && F.x < q.x1 + 4) { ny = q.y; land(st, F); break; }
    }
    // the roof's sides are walls below the roof line (you can't walk back through the building)
    if (ny > PO.GY + 2) {
      if (ox <= PO.L && F.x > PO.L - PO.hw) { F.x = PO.L - PO.hw; F.vx = Math.min(0, F.vx); }
      if (ox >= PO.R && F.x < PO.R + PO.hw) { F.x = PO.R + PO.hw; F.vx = Math.max(0, F.vx); }
    }
    // a hero's grip: falling just past an end of the roof, they grab the edge and pull themselves up
    // (not while still reeling from a punch)
    if (F.vy > 0 && F.hurt <= 0 && ny > PO.GY && ny < PO.GY + 70 && (Math.abs(F.x - PO.L) < 30 || Math.abs(F.x - PO.R) < 30)) {
      F.x = F.x < W / 2 ? PO.L + PO.hw : PO.R - PO.hw; ny = PO.GY; land(st, F); F.sq = 1;
      Sfx.play('punchoutGrab', F.id); K.pop(st, F.x, F.y - 50, 'Grab!', '#ffffff', 16);
    }
    F.y = ny;
    F.x = clamp(F.x, -60, W + 60);
    if (F.y > PO.outY && !st.res) ringOut(st, F);
  }
  function land(st, F) {
    if (F.vy > 300) { F.sq = 0.7; K.dust(st, F.x, F.y, null, 4); }
    F.vy = 0; F.grounded = true; F.jumps = 1;
  }
  function ringOut(st, F) {
    F.out = true; F.vy = 200;
    st.shake = 0.5; G.shake = Math.max(G.shake || 0, 0.4);
    K.pop(st, clamp(F.x, 120, W - 120), 420, 'RING OUT!', PCOL[1 - F.id], 34);
    rumble(F.id, 0.5, 0.8, 300);
  }
  // a punch's fist: where it is and how far it reaches
  const reachOf = F => (F.pow === 'giant' ? PO.giantReach : PO.reach);
  function connects(st, A) {
    if (A.punch < PO.windT || A.punch > PO.hitT || A.hitDone || A.out) return false;
    const B = st.f[1 - A.id];
    if (B.out || B.safe > 0) return false;
    const dx = (B.x - A.x) * A.face, dy = (B.y - 13) - (A.y - 13);
    return !(dx < -4 || dx > reachOf(A) + PO.hw || Math.abs(dy) > (A.pow === 'giant' ? 46 : 34));
  }
  function punchHit(st, A) {
    const B = st.f[1 - A.id];
    A.hitDone = true;
    const giant = A.pow === 'giant', fx = A.x + A.face * (reachOf(A) - 6), fy = A.y - 15;
    if (B.shield > 0) {
      B.shield = 0; if (B.pow === 'shield') B.pow = null;
      Sfx.play('punchoutShield'); K.pop(st, B.x, B.y - 60, 'SHIELD!', '#7affd8', 22);
      K.spark(st, fx, fy, 10, ['#7affd8', '#ffffff']);
      B.vx = A.face * 140; A.vx = -A.face * 120; A.punch = Math.max(A.punch, PO.hitT);
      return;
    }
    if (B.block && (B.x - A.x) * B.face < 0) {
      const d = (giant ? PO.giantDmg : PO.dmg) * PO.blockK;
      B.dmg += d; B.vx = A.face * 120; A.vx = -A.face * 90; B.flash = 0.1;
      st.stat.blocks[B.id]++;
      Sfx.play('punchoutBlock'); K.spark(st, fx, fy, 6, ['#bfe6ff', '#ffffff']);
      K.pop(st, B.x, B.y - 60, 'BLOCK!', '#bfe6ff', 18);
      return;
    }
    B.dmg += giant ? PO.giantDmg : PO.dmg;
    const kb = Math.min(PO.kbMax, (PO.kb0 + B.dmg * PO.kbK) * (giant ? 1.25 : 1));
    B.vx = A.face * kb; B.vy = -(PO.up0 + B.dmg * PO.upK) * (giant ? 1.15 : 1); B.grounded = false;
    B.hurt = PO.stun0 + B.dmg * PO.stunK; B.safe = B.hurt + PO.safeT; B.jumps = 1; B.punch = -1; B.block = false; B.flash = 0.18; B.face = -A.face;
    st.stat.hits[A.id]++;
    st.bursts.push({ x: fx, y: fy, s: giant ? 'KA-POW!' : ['POW!', 'BAM!', 'WHAM!', 'BIFF!'][st.stat.hits[A.id] % 4], t: 0, big: giant, rot: (Math.random() - 0.5) * 0.5 });
    if (st.bursts.length > 4) st.bursts.shift();
    Sfx.play(giant ? 'punchoutGiant' : 'punchoutHit');
    K.spark(st, fx, fy, giant ? 14 : 8, ['#ffe14a', '#ffffff', PCOL[A.id]]);
    st.shake = Math.max(st.shake, giant ? 0.35 : 0.18);
    rumble(B.id, 0.3, 0.6, 140);
  }
  /* ---------- power-ups ---------- */
  function orbStep(st, dt) {
    const o = st.orb;
    if (!o) {
      st.orbT -= dt;
      if (st.orbT <= 0) {
        // somewhere to land: the roof or a catwalk, not right under someone
        const spots = [{ x0: PO.L + 40, x1: PO.R - 40, y: PO.GY }, ...PLATS.map(q => ({ x0: q.x0 + 20, x1: q.x1 - 20, y: q.y }))];
        let s = spots[Math.floor(Math.random() * spots.length)], x = rnd(s.x0, s.x1);
        for (let k = 0; k < 6 && st.f.some(F => Math.abs(F.x - x) < 60); k++) { s = spots[Math.floor(Math.random() * spots.length)]; x = rnd(s.x0, s.x1); }
        const kind = PKEYS[Math.floor(Math.random() * PKEYS.length)];
        st.orb = { kind, x, y: -30, floor: s.y, t: 0, landed: false };
        Sfx.play('punchoutDrop');
      }
      return;
    }
    o.t += dt;
    if (!o.landed) { o.y += 90 * dt; if (o.y >= o.floor - 16) { o.y = o.floor - 16; o.landed = true; o.lt = 0; } }
    else { o.lt += dt; if (o.lt > PO.powLife) { K.poof(st, o.x, o.y, 8); st.orb = null; st.orbT = rnd(...PO.powNext); return; } }
    for (const F of st.f) {
      if (F.out || Math.abs(F.x - o.x) > 24 || Math.abs((F.y - 13) - o.y) > 30) continue;
      take(st, F, o.kind);
      st.orb = null; st.orbT = rnd(...PO.powNext);
      return;
    }
  }
  function take(st, F, kind) {
    F.pow = kind; F.powT = kind === 'shield' ? PO.shieldT : PO.powT;
    if (kind === 'shield') F.shield = Math.max(F.shield, 1);
    st.stat.pows[F.id]++;
    Sfx.play('punchoutPower');
    K.pop(st, F.x, F.y - 70, POWERS[kind].name + '!', POWERS[kind].col, 24);
    K.spark(st, F.x, F.y - 14, 12, [POWERS[kind].col, '#ffffff']);
  }
  function mirror(st) { for (const F of st.f) K.place(F.id, clamp(F.x, 30, W - 30), Math.min(F.y, H - 30) - (F.pow === 'giant' ? 6 : 0)); }

  /* ---------- what's going on ----------
     plan(st, id): { me, them, dx (them - me), dy, reach, inReach (a punch now would land), facing, theyWind (the other
       hero is starting a punch that would land on me), edge (my distance to the nearest roof end), off (I'm past an end
       of the roof), orb ({ kind, x, y, landed } or null), orbMine (I'm closer to it), danger (my damage is high) } */
  function plan(st, id) {
    const A = st.f[id], B = st.f[1 - id];
    const dx = B.x - A.x, dy = B.y - A.y, reach = reachOf(A) + PO.hw;
    const facing = Math.sign(dx || A.face) === A.face;
    const inReach = !B.out && Math.abs(dx) <= reach - 4 && Math.abs(dy) < 30;
    const bReach = reachOf(B) + PO.hw;
    const theyWind = B.punch >= 0 && B.punch < PO.hitT && !B.hitDone && Math.abs(dx) <= bReach + 8 && Math.abs(dy) < 34 && Math.sign(-dx || 1) === B.face;
    const edge = Math.min(A.x - PO.L, PO.R - A.x), off = A.x < PO.L + 2 || A.x > PO.R - 2;
    const o = st.orb;
    const orbMine = !!o && Math.abs(o.x - A.x) + Math.abs(o.y - A.y) * 0.6 < Math.abs(o.x - B.x) + Math.abs(o.y - B.y) * 0.6 + 40;
    return { me: A, them: B, dx, dy, reach, inReach, facing, theyWind, edge, off, orb: o, orbMine, danger: A.dmg > 70, plats: PLATS, PO };
  }

  MODES.punchout = {
    plan, PO, PLATS, POWERS,
    setup(st, L) {
      for (const row of L.grid) row.fill('.');
      st.stat = { wins: [0, 0], hits: [0, 0], swings: [0, 0], outs: [0, 0], blocks: [0, 0], pows: [0, 0] };
      st.stats = { helps: 0 };
      st.noHelp = !!this.testNoHelp;
      st.t = 0; st.bursts = [];
      K.fx(st);
    },
    resetRound(n, info) { const st = G.mst; newRound(st, n, info); st.bursts = []; G.particles.length = 0; },
    go() {
      const st = G.mst;
      Sfx.play('punchoutBell');
      const g = st.f.filter(F => F.gold);
      if (g.length) K.goldHelp(st, 'Gold shield for ' + NAMES[g[0].id] + ': the first punch on them just bounces off!');
      else if (st.round === 1) K.msg(st, 'Punch with the action, hold ▼ to block. Knock your rival off the roof!', '#ffffff', 4.2);
      else K.msg(st, 'Round ' + st.round + '! FIGHT!', '#ffffff', 2.2);
    },
    step(dt) { tick(G.mst, dt, true); },
    idle(dt) { const st = G.mst; if (st.f) tick(st, dt, false); },
    timeUp() {
      const st = G.mst, [A, B] = st.f;
      const w = Math.abs(A.dmg - B.dmg) <= PO.winBy ? -1 : A.dmg < B.dmg ? 0 : 1;
      if (w >= 0) st.stat.wins[w]++;
      st.res = true;
      return { winner: w, reason: w < 0 ? 'Time! Both just as battered!' : 'Time! ' + NAMES[w] + ' took less damage!' };
    },
    tiebreak() {
      const s = G.mst.stat;
      if (s.hits[0] !== s.hits[1]) return { winner: s.hits[0] > s.hits[1] ? 0 : 1, reason: 'Most punches landed wins the tiebreak!' };
      return -1;
    },
    draw() { const st = G.mst; if (!st.f) return; drawWorld(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.f) drawTop(st); },
    hud() { const st = G.mst; if (st.f && G.match) hud(st); },
    stats() {
      const st = G.mst, s = st.stat;
      if (!s) return [];
      const out = [
        { label: 'Rounds won', values: (G.match ? G.match.wins : s.wins).slice() },
        { label: 'Punches landed', values: s.hits.slice() },
        { label: 'Punches blocked', values: s.blocks.slice() },
        { label: 'Power-ups grabbed', values: s.pows.slice() },
      ];
      const h = s.hits;
      out.push(h[0] === h[1] ? '★ ' + (h[0] + h[1]) + ' punches landed. What a brawl!' : '★ Hardest hitter: ' + NAMES[h[0] > h[1] ? 0 : 1] + ' (' + Math.max(h[0], h[1]) + ' punches landed)');
      const hl = K.helpLine(st.stats ? st.stats.helps : 0);
      if (hl) out.push(hl);
      return out;
    },
    test: { take },
  };

  /* ---------- drawing ---------- */
  function drawWorld(st) {
    const t = st.t, sh = st.shake > 0 ? (Math.random() - 0.5) * st.shake * 14 : 0;
    K.sky(0, G.clock || t, { mode: 'night', moonX: 800, moonY: 90, beams: true });
    K.skyline(0, G.clock || t, { base: 470 });
    ctx.save(); ctx.translate(sh, sh * 0.5);
    // the street far below on both sides
    ctx.fillStyle = '#10142c'; ctx.fillRect(0, 500, W, H - 500);
    // far below: street lamps and cars on both sides (a long way down)
    const tt = G.clock || t;
    for (const x of [30, 70, 890, 930]) { ctx.fillStyle = 'rgba(255,224,138,0.55)'; circle(x, 512, 2.5); ctx.fill(); }
    for (let k = 0; k < 4; k++) {
      const u = (tt * (0.08 + k * 0.03) + k * 0.27) % 1, x = k % 2 ? W * (1 - u) : W * u;
      if (x > PO.L - 10 && x < PO.R + 10) continue;
      ctx.fillStyle = k % 2 ? 'rgba(255,90,74,0.8)' : 'rgba(255,240,200,0.9)'; ctx.fillRect(x, 526 + k % 2 * 6, 5, 2);
    }
    // the building
    K.facade(PO.L, PO.GY, PO.R - PO.L, { seed: 32, col: '#5b4a7a' });
    // the roof deck: tar paper with a lip
    ctx.fillStyle = K.COL.tar; ctx.fillRect(PO.L - 6, PO.GY, PO.R - PO.L + 12, 10);
    ctx.fillStyle = K.COL.tarHi; ctx.fillRect(PO.L - 6, PO.GY, PO.R - PO.L + 12, 3);
    // the roof's ends: hazard stripes and a blinking red warning light (past here is a long drop)
    for (const [x0, dir] of [[PO.L - 6, 1], [PO.R + 6, -1]]) {
      for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? '#2a2a34' : '#ffc53d'; ctx.fillRect(x0 + dir * k * 8 - (dir < 0 ? 8 : 0), PO.GY, 8, 10); }
      const on = Math.sin(tt * 5 + (dir > 0 ? 0 : 1.6)) > 0;
      ctx.fillStyle = K.COL.steelDark; ctx.fillRect(x0 + dir * 6 - 2, PO.GY - 14, 4, 14);
      ctx.fillStyle = on ? '#ff4a3a' : '#6a2a2a'; circle(x0 + dir * 6, PO.GY - 16, 4); ctx.fill();
      if (on) { const g = ctx.createRadialGradient(x0 + dir * 6, PO.GY - 16, 1, x0 + dir * 6, PO.GY - 16, 18); g.addColorStop(0, 'rgba(255,74,58,0.5)'); g.addColorStop(1, 'rgba(255,74,58,0)'); ctx.fillStyle = g; circle(x0 + dir * 6, PO.GY - 16, 18); ctx.fill(); }
    }
    // rooftop props (behind the fighters, no collisions)
    K.vent(470, PO.GY, 26, 20);
    K.antenna(820, PO.GY, 80, G.clock || t);
    // the catwalks: steel grating on legs, with a box under each one
    K.ac(PLATS[0].x0 + 20, PO.GY, 70, 44, G.clock || t);
    K.waterTower(PLATS[1].x0 + 70, PO.GY - 2, 0.8);
    for (const q of PLATS.slice(0, 2)) drawWalk(q, PO.GY);
    // the neon sign on top: a catwalk on two poles
    const s = PLATS[2];
    ctx.fillStyle = K.COL.steelDark; ctx.fillRect(s.x0 + 14, s.y, 6, PO.GY - s.y); ctx.fillRect(s.x1 - 20, s.y, 6, PO.GY - s.y);
    const blink = Math.sin((G.clock || t) * 3) > -0.8;
    ctx.fillStyle = 'rgba(28,26,54,0.92)'; rr(s.x0 - 6, s.y + 12, s.x1 - s.x0 + 12, 52, 8); ctx.fill();
    ctx.strokeStyle = blink ? '#ff4ad8' : '#6a2a5a'; ctx.lineWidth = 3; rr(s.x0 - 6, s.y + 12, s.x1 - s.x0 + 12, 52, 8); ctx.stroke();
    if (blink) { ctx.shadowColor = '#ff4ad8'; ctx.shadowBlur = 14; }
    text('HERO', (s.x0 + s.x1) / 2, s.y + 30, 18, blink ? '#ffd0f4' : '#7a4a6a', 'center');
    text('CITY', (s.x0 + s.x1) / 2, s.y + 50, 16, blink ? '#8fdcff' : '#3a5a6a', 'center');
    ctx.shadowBlur = 0;
    drawWalk(s, null);
    // the power-up
    if (st.orb) drawOrb(st.orb, G.clock || t);
    // the fighters
    for (const F of st.f) drawFighter(st, F, G.clock || t);
    K.drawParts(st, 0);
    // comic bursts
    for (const b of st.bursts) {
      const u = b.t / 0.6;
      if (u >= 1) continue;
      ctx.globalAlpha = clamp((1 - u) / 0.3, 0, 1);
      K.comic(b.x, b.y - 30 - u * 16, b.s, (b.big ? 1.15 : 0.85) * (1 + 0.3 * Math.max(0, 1 - b.t / 0.08)), b.rot);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  function drawWalk(q, legsTo) {
    const w = q.x1 - q.x0;
    if (legsTo) {
      ctx.strokeStyle = K.COL.steelDark; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(q.x0 + 8, q.y + 6); ctx.lineTo(q.x0 + 8, legsTo); ctx.moveTo(q.x1 - 8, q.y + 6); ctx.lineTo(q.x1 - 8, legsTo); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q.x0 + 8, q.y + 14); ctx.lineTo(q.x1 - 8, legsTo - 10); ctx.moveTo(q.x1 - 8, q.y + 14); ctx.lineTo(q.x0 + 8, legsTo - 10); ctx.stroke();
    }
    ctx.fillStyle = K.COL.steel; ctx.fillRect(q.x0, q.y, w, 8);
    ctx.fillStyle = K.COL.steelHi; ctx.fillRect(q.x0, q.y, w, 2);
    ctx.strokeStyle = K.COL.steelDark; ctx.lineWidth = 1;
    for (let x = q.x0 + 6; x < q.x1; x += 8) { ctx.beginPath(); ctx.moveTo(x, q.y + 2); ctx.lineTo(x, q.y + 8); ctx.stroke(); }
    // a yellow-black safety edge
    for (let x = q.x0; x < q.x1; x += 12) { ctx.fillStyle = (x - q.x0) % 24 ? '#2a2a34' : '#ffc53d'; ctx.fillRect(x, q.y + 8, 12, 3); }
  }
  function drawOrb(o, t) {
    const P = POWERS[o.kind], fade = o.landed && o.lt > PO.powLife - 2 ? (Math.sin(t * 20) > 0 ? 1 : 0.35) : 1, bob = o.landed ? Math.sin(t * 4) * 3 : 0;
    const x = o.x, y = o.y + bob;
    ctx.globalAlpha = fade;
    if (!o.landed) {
      // a little parachute
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y - 34, 20, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = P.col; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.arc(x, y - 34, 20, Math.PI + k * Math.PI / 4, Math.PI + (k + 0.5) * Math.PI / 4); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 20, y - 34); ctx.lineTo(x - 6, y - 10); ctx.moveTo(x + 20, y - 34); ctx.lineTo(x + 6, y - 10); ctx.stroke();
    }
    const g = ctx.createRadialGradient(x, y, 2, x, y, 30);
    g.addColorStop(0, P.glow); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; circle(x, y, 30); ctx.fill();
    ctx.fillStyle = '#1c1a36'; circle(x, y, 14); ctx.fill();
    ctx.strokeStyle = P.col; ctx.lineWidth = 3; circle(x, y, 14); ctx.stroke();
    powIcon(o.kind, x, y, 1, t);
    ctx.globalAlpha = 1;
  }
  // a small picture of each power, centred at x, y
  function powIcon(kind, x, y, s, t) {
    const P = POWERS[kind];
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = P.col; ctx.strokeStyle = P.col; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    if (kind === 'speed') { ctx.beginPath(); ctx.moveTo(2, -9); ctx.lineTo(-5, 1); ctx.lineTo(0, 1); ctx.lineTo(-2, 9); ctx.lineTo(5, -1); ctx.lineTo(0, -1); ctx.closePath(); ctx.fill(); }
    else if (kind === 'fly') { const f = Math.sin(t * 10) * 2; ctx.beginPath(); ctx.moveTo(0, 2); ctx.quadraticCurveTo(-6, -8 - f, -10, -2); ctx.quadraticCurveTo(-6, 0, 0, 4); ctx.quadraticCurveTo(6, 0, 10, -2); ctx.quadraticCurveTo(6, -8 - f, 0, 2); ctx.fill(); }
    else if (kind === 'shield') { ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(7, -6); ctx.lineTo(6, 3); ctx.lineTo(0, 9); ctx.lineTo(-6, 3); ctx.lineTo(-7, -6); ctx.closePath(); ctx.stroke(); }
    else { rr(-7, -6, 13, 12, 4); ctx.fill(); ctx.fillStyle = '#1c1a36'; for (let k = 0; k < 3; k++) ctx.fillRect(-4 + k * 4, -6, 1, 5); }
    ctx.restore();
  }
  function drawFighter(st, F, t) {
    const P = F.pow ? POWERS[F.pow] : null;
    // after-images at speed
    if (F.pow === 'speed' && Math.abs(F.vx) > 120 && !F.out) K.speedLines(F.x, F.y - 6, Math.sign(F.vx), t, { col: 'rgba(255,225,74,0.7)' });
    if (F.pow === 'fly' && !F.grounded && !F.out) {
      for (let k = 0; k < 4; k++) { ctx.globalAlpha = 0.5 - k * 0.1; ctx.fillStyle = '#8fdcff'; circle(F.x + (Math.random() - 0.5) * 6, F.y + 4 + k * 7, 5 - k); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    const pv = F.punch >= 0 ? F.punch : -1;
    const lean = pv >= 0 && pv < PO.hitT ? F.face * 0.12 : 0;
    const rot = F.hurt > 0 ? F.face * -0.35 * Math.min(1, F.hurt * 4) : lean;
    const sy = F.block ? 0.86 : F.sq > 0 ? 1 - F.sq * 0.18 : 1;
    if ((F.flash > 0 && Math.sin(t * 60) > 0) || (F.safe > 0 && F.hurt <= 0 && Math.sin(t * 40) > 0)) ctx.globalAlpha = 0.55;
    K.suit(F.id, F.x, F.y, { face: F.face, rot, sy, capeV: clamp(Math.abs(F.vx) / 300 + (F.grounded ? 0 : 0.4), 0, 1), vy: F.vy, stun: F.hurt > 0.12, glow: P ? P.glow : F.gold && F.shield ? 'rgba(255,197,61,0.35)' : null });
    ctx.globalAlpha = 1;
    // fists: the punching one shoots out
    const giant = F.pow === 'giant', fr = giant ? 11 : 6;
    let ext = 0;
    if (pv >= 0) ext = pv < PO.windT ? -0.3 * (pv / PO.windT) : pv < PO.hitT ? 1 : Math.max(0, 1 - (pv - PO.hitT) / 0.12);
    const fx = F.x + F.face * (8 + Math.max(0, ext) * (reachOf(F) - 14)), fy = F.y - 14 - (F.block ? 6 : 0);
    if (ext > 0.1) {
      ctx.strokeStyle = PDARK[F.id]; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(F.x + F.face * 6, F.y - 14); ctx.lineTo(fx - F.face * fr * 0.6, fy); ctx.stroke();
      if (ext >= 1) { ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; for (const o of [-5, 0, 5]) { ctx.beginPath(); ctx.moveTo(fx - F.face * (fr + 6), fy + o); ctx.lineTo(fx - F.face * (fr + 22), fy + o); ctx.stroke(); } }
    }
    fist(F, fx, fy, fr);
    if (!F.block && ext <= 0.1) fist(F, F.x - F.face * 7, F.y - 12, fr * 0.85);
    // blocking: arms crossed and a blue guard in front
    if (F.block) {
      ctx.strokeStyle = 'rgba(191,230,255,0.85)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(F.x, F.y - 14, 24, F.face > 0 ? -0.9 : Math.PI - 0.9, F.face > 0 ? 0.9 : Math.PI + 0.9); ctx.stroke();
      fist(F, F.x + F.face * 9, F.y - 20, fr * 0.9);
    }
    // the shield bubble
    if (F.shield > 0) {
      const gold = F.shield === 2 && !(F.pow === 'shield');
      ctx.strokeStyle = gold ? 'rgba(255,197,61,0.9)' : 'rgba(122,255,216,0.85)'; ctx.lineWidth = 2.5;
      ctx.fillStyle = gold ? 'rgba(255,197,61,0.12)' : 'rgba(122,255,216,0.12)';
      circle(F.x, F.y - 14, 26 + Math.sin(t * 6) * 1.5); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(F.x - 8, F.y - 24, 9, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke();
    }
  }
  function fist(F, x, y, r) {
    ctx.fillStyle = PCOL[F.id]; circle(x, y, r); ctx.fill();
    ctx.strokeStyle = PDARK[F.id]; ctx.lineWidth = r > 8 ? 2.5 : 1.5; circle(x, y, r); ctx.stroke();
    // knuckles
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + F.face * r * 0.4, y + k * r * 0.4); ctx.lineTo(x + F.face * r * 0.85, y + k * r * 0.4); ctx.stroke(); }
  }
  function drawTop(st) {
    K.drawPops(st, 0, 0);
    // off-screen arrows for anyone above the top of the screen
    for (const F of st.f) if (F.y < 10 && !F.out) { ctx.fillStyle = PCOL[F.id]; ctx.beginPath(); ctx.moveTo(F.x, 8); ctx.lineTo(F.x - 8, 22); ctx.lineTo(F.x + 8, 22); ctx.closePath(); ctx.fill(); }
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.25 : 1, live = G.match && G.match.phase === 'live';
    K.drawMsg(st, st.msg, W - 14);
    // a damage card for each hero along the bottom
    for (const F of st.f) {
      const w = 180 * z, h = 54 * z, x = F.id ? W - 16 - w : 16, y = H - 14 - h;
      ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(x, y, w, h, 12); ctx.fill();
      ctx.strokeStyle = PCOL[F.id]; ctx.lineWidth = 2; rr(x, y, w, h, 12); ctx.stroke();
      text(NAMES[F.id] + (K.quiet(F.id) ? ' (computer)' : ''), x + 12, y + 14 * z, 13 * z, PCOL[F.id], 'left', 'body');
      const d = Math.round(F.dmg), col = d < 40 ? '#ffffff' : d < 80 ? '#ffd84a' : '#ff5a4a';
      const shake = F.flash > 0 ? (Math.random() - 0.5) * 4 : 0;
      text(d + '%', x + 12 + shake, y + 38 * z, 24 * z, col, 'left');
      if (F.pow) {
        const P = POWERS[F.pow], px = x + w - 30 * z, py = y + h / 2 + 2;
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; circle(px, py, 16 * z); ctx.fill();
        ctx.strokeStyle = P.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, 16 * z, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(F.powT / (F.pow === 'shield' ? PO.shieldT : PO.powT), 0, 1)); ctx.stroke();
        powIcon(F.pow, px, py, z, G.clock || 0);
        text(P.name, px - 22 * z, py + 2, 11 * z, P.col, 'right', 'body');
      } else if (F.shield === 2) text('Gold shield', x + w - 12, y + h / 2 + 2, 12 * z, C.gold, 'right', 'body');
      // a prompt over the head of a person in the first rounds
      if (live && !K.quiet(F.id) && !F.out && (st.round <= 2 || F.gold)) {
        const pl = plan(st, F.id);
        let s = null, c = '#ffe7a8';
        if (pl.off && !F.grounded) { s = 'Jump back! ' + K.key(F.id, 'jump') + ' ' + K.key(F.id, 'jump'); c = C.gold; }
        else if (pl.theyWind && !F.block) { s = 'Block! Hold ' + K.key(F.id, 'down'); c = '#bfe6ff'; }
        else if (pl.inReach && pl.facing && F.punch < 0) { s = 'Punch! ' + K.key(F.id, 'act'); c = C.gold; }
        else if (st.orb && st.orb.landed && pl.orbMine) s = 'Grab the power!';
        if (s) {
          ctx.font = FONT(12 * z); const tw = ctx.measureText(s).width + 16, sx = clamp(F.x, tw / 2 + 8, W - tw / 2 - 8), sy = clamp(F.y - 62, 70, H - 90);
          ctx.fillStyle = 'rgba(28,26,54,0.85)'; rr(sx - tw / 2, sy - 11 * z, tw, 22 * z, 11 * z); ctx.fill();
          text(s, sx, sy, 12 * z, c, 'center', 'body');
        }
      }
    }
  }

  /* ---------- sounds ---------- */
  Sfx.extra.punchoutSwing = function (id) { this.tone(id ? 260 : 300, 0.06, 'triangle', 0.015, id ? 520 : 600); };
  Sfx.extra.punchoutHit = function () { this.tone(180, 0.12, 'square', 0.05, 60); this.tone(900, 0.04, 'triangle', 0.03, 400); };
  Sfx.extra.punchoutGiant = function () { this.tone(120, 0.22, 'square', 0.06, 40); this.tone(700, 0.08, 'triangle', 0.04, 200); };
  Sfx.extra.punchoutBlock = function () { this.tone(1200, 0.06, 'triangle', 0.03, 900); this.tone(600, 0.05, 'square', 0.015); };
  Sfx.extra.punchoutShield = function () { this.tone(1600, 0.1, 'sine', 0.04, 2400); this.tone(800, 0.15, 'triangle', 0.03, 400, 0.05); };
  Sfx.extra.punchoutJump = function (id) { this.tone(id ? 420 : 470, 0.07, 'sine', 0.02, id ? 640 : 700); };
  Sfx.extra.punchoutJump2 = function (id) { this.tone(id ? 560 : 620, 0.07, 'sine', 0.02, id ? 840 : 900); };
  Sfx.extra.punchoutDrop = function () { this.tone(880, 0.1, 'sine', 0.025, 660); this.tone(660, 0.12, 'sine', 0.02, 880, 0.1); };
  Sfx.extra.punchoutPower = function () { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.04, null, i * 0.05)); };
  Sfx.extra.punchoutGrab = function (id) { this.tone(id ? 300 : 340, 0.08, 'square', 0.02, id ? 500 : 560); };
  Sfx.extra.punchoutFade = function () { this.tone(700, 0.12, 'sine', 0.02, 350); };
  Sfx.extra.punchoutKO = function () { this.tone(500, 0.5, 'sawtooth', 0.04, 80); [784, 1047, 1319].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.04, null, 0.35 + i * 0.09)); };
  Sfx.extra.punchoutBell = function () { [0, 0.14].forEach(d => { this.tone(1320, 0.3, 'sine', 0.05, 1300, d); this.tone(1980, 0.2, 'sine', 0.02, null, d); }); };

  /* ---------- the level ---------- */
  HEROCITY.defs.punchout = {
    name: 'Power Punch Showdown', world: 31, kind: 'versus', mode: 'punchout', ownStep: true,
    match: { bestOf: 5, roundTime: PO.roundTime },
    act: { label: 'punch' },
    tagLift: 30,
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> run <kbd>W</kbd> jump <kbd>S</kbd> block',
      bo: '<kbd>←</kbd><kbd>→</kbd> run <kbd>↑</kbd> jump <kbd>↓</kbd> block',
      pad: 'stick runs, down blocks, <span data-glyph="a"></span> jumps,',
    },
    tip: 'Punch with the action, hold ▼ to block, jump twice to get back on the roof. Grab the power-ups! Knock your rival off the roof to win the round.',
    switches: {}, signs: [],
    map: K.stubMap(),
  };
})();
