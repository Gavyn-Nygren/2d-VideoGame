/* Pip & Bo - Level 32-2 Bridge Collapse (team, World 32 Superhero City). */
'use strict';

/* ===== 32-2 Bridge Collapse (mode 'bridge', team, scrolls right, Gavyn's pick) =====
   Gavyn's pick: "one hero stretches like rubber to hold the gaps closed while the other carries buses across."
   Side view of a big suspension bridge in a storm at sunset, breaking apart over the river. A bus full of people is
   stuck on it; the camera follows Pip and Bo to the right. The mode owns the tick, the camera and the picture
   (def.ownStep + ownHUD + noFalls); the engine grid is only spawns. World px, the deck is at S.deck.
   THE STRONG HERO (power: super strength) walks to the bus and taps the action ('lift') to lift it overhead, and taps
     again to set it down. With the bus up they walk slowly and can't jump. Without it they run and jump like anyone.
   THE STRETCHY HERO (power: rubber body) stands at the edge of a gap and HOLDS the action ('stretch'): their body
     stretches across and grabs the far side, making a rubbery bridge the strong hero can walk over (it sags under the
     bus). Let go when nobody is on it and they snap across to the side the strong hero is on ("Boing!"). A stretch
     STRAINS (a meter fills, faster for wide gaps and much faster with the bus on it): full = "SNAP!", the stretchy hero
     springs back and anyone on it falls. Letting go with someone on it gives half a second to grab again before it snaps.
   FALLING: the stretchy hero's arm shoots down and catches them ("Gotcha!"), back to the last safe deck (a Slip).
   CRACKED SLABS crumble 2.2 s after someone steps on them: keep moving (they leave a gap the stretchy hero can hold).
   LIVE WIRES: snapped power cables lash down on the deck every few seconds (they crackle and a red mark glows first).
     A zap stuns you, and the strong hero drops the bus.
   HERO BADGES hang over the gaps and up high (catch them as you cross or with a jump).
   A stretch ends when the bus is set down (or carried) past the tower at its end, with both heroes there.
   STRETCHES (jobs swap each stretch): Rush Hour (Pip stretches), The Middle Span (Bo), Live Wires (Pip), The Last
     Tower (Bo; storm, everything).
   GOLD HELP (only while both are playing, announced, counted): 3 slips or zaps in a stretch = a gold steel cable: the
     stretch never strains or snaps for the rest of the stretch.
   IDLE: no person presses anything for 12 s: "Taking a break", the bridge waits and the clock stops.
   MEDAL goals (MODES.bridge.medals, js/medals.js): Gold <= S.goldT with <= 2 slips+zaps and >= 70% of the badges;
   Silver <= S.silverT with <= 8.
   MODES.bridge.plan(st) says what each job should do now (the prompts, the HUD chips and the computer brain read it).
   Everything lives inside this block; sounds are Sfx.extra.bridge*. */
(() => {
  const K = HEROCITY, TAU = Math.PI * 2, FONT = K.FONT;
  const S = {
    deck: 400, runV: 235, carryV: 145, acc: 2300, jumpV: 520, g: 1800, maxFall: 1000, bw: 22, bh: 26,
    edgeR: 32, maxSpan: 300, strainT: 7, liftR: 56, busW: 124, busH: 54, crumbleT: 2.2, wireIdle: 2.3, wireWarn: 1.05,
    wireHit: 0.4, wireW: 46, zapT: 0.9, graceT: 0.5, rescueT: 1.0, leash: 560, badgeR: 22, idleWait: 12, goldT: 180, silverT: 320,
  };
  const GY = S.deck;

  /* ---------- the course ----------
     tokens (left to right): 'r300' solid deck; 'g180' a gap; 'c160' a cracked slab (crumbles); 'w' a live wire over the
     next 46 px of deck (it needs solid deck under it); 'b' the bus starts here; 'd' a badge just above the deck here,
     'd100' one 100 px up (the most a jump reaches); 'G' a badge in the middle of the next gap (only reachable by crossing it). */
  function compile(def) {
    const c = { segs: [], wires: [], badges: [], busX: 160, endX: 0 };
    let x = 0, pendG = 0;
    for (const tok of def.course) {
      const k = tok[0], a = tok.slice(1).split(':').map(Number);
      if (k === 'r') { c.segs.push({ x0: x, x1: x + a[0], crack: false }); x += a[0]; }
      else if (k === 'c') { c.segs.push({ x0: x, x1: x + a[0], crack: true, t: 0, gone: false, fall: 0 }); x += a[0]; }
      else if (k === 'g') { if (pendG) { c.badges.push({ x: x + a[0] / 2, y: GY - 40, got: false }); pendG = 0; } x += a[0]; }
      else if (k === 'w') c.wires.push({ x: x - 23 - 40, t: K.hash(x) * 3, ph: 'idle' });
      else if (k === 'b') c.busX = x - 120;
      // (a high badge is never higher than a plain jump reaches: 100 px)
      else if (k === 'd') c.badges.push({ x: x - 20, y: GY - Math.min(a[0] || 40, 100), got: false });
      else if (k === 'G') pendG = 1;
    }
    c.endX = x - 160;
    return c;
  }
  const solidSegs = st => st.c.segs.filter(s => !s.gone);
  const segAt = (st, x) => st.c.segs.find(s => !s.gone && x >= s.x0 - 6 && x <= s.x1 + 6) || null;
  // the gaps between solid deck, as { a, b } (a = right end of the deck before it)
  function gaps(st) {
    const s = solidSegs(st), out = [];
    for (let i = 0; i < s.length - 1; i++) if (s[i + 1].x0 - s[i].x1 > 1) out.push({ a: s[i].x1, b: s[i + 1].x0 });
    return out;
  }

  /* ---------- a stretch (one room) ---------- */
  const newRunner = (id, job, x) => ({ id, job, x, y: GY, vx: 0, vy: 0, face: 1, grounded: true, st: 'run', t: 0, stun: 0, sq: 0, safeX: x, onSpan: false, rx0: 0, ry0: 0, rt: 0 });
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.str = def.stretchy || 0; st.lift = 1 - st.str; st.title = def.title || '';
    st.c = compile(def);
    st.run = [0, 1].map(id => newRunner(id, id === st.str ? 'str' : 'lift', id === st.str ? 230 : 120));
    st.bus = { x: st.c.busX, y: GY, held: false, sq: 0, wob: 0 };
    st.span = null; st.strain = 0; st.gold = false;
    st.state = 'go'; st.endT = 0; st.party = false; st.cleared = false; st.lastRoom = false;
    st.rc = { bad: 0 }; st.segStart = G.time; st.clock = st.clock || 0;
    st.cam = { x: 0 };
    K.fx(st); labels(st); mirror(st);
  }
  function labels(st) { const w = []; w[st.str] = 'stretch'; w[st.lift] = 'lift'; K.actLabels(w, 'lift'); }

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.c) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    st.clock += dt;
    if (live) { wires(st, dt); crumble(st, dt); }
    for (const r of st.run) runner(st, r, dt, live);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    if (live) { spanStep(st, dt); badges(st); leash(st); goal(st); }
    else if (st.span && st.state !== 'go') st.span = null;
    busStep(st, dt);
    if (st.state === 'end') endStep(st, dt);
    cam(st, dt);
    // low thunder in the last stretch, just after each lightning bolt in the sky (K.sky: rate 0.3 + storm * 0.4)
    const storm = G.level.def.storm || 0;
    if (storm > 0.6) { const rate = 0.3 + storm * 0.4; if (Math.floor(st.clock * rate - 0.18) !== Math.floor((st.clock - dt) * rate - 0.18)) K.sound(st, st.cam.x + W * 0.7, 130, 'RRRUMBLE', { size: 22, c1: '#ffffff', c2: '#6fd0ff', rot: 0.05, life: 1 }); }
    K.tickFx(st, dt);
    mirror(st);
  }
  function wires(st, dt) {
    for (const w of st.c.wires) {
      w.t += dt;
      if (w.ph === 'idle' && w.t >= S.wireIdle) { w.ph = 'warn'; w.t = 0; Sfx.play('bridgeCrackle'); }
      else if (w.ph === 'warn' && w.t >= S.wireWarn) { w.ph = 'hit'; w.t = 0; Sfx.play('cityZap'); K.sound(st, w.x + 140, GY - 120, 'ZZZAP!', { size: 24, c1: '#ffffff', c2: '#6fd0ff' }); }
      else if (w.ph === 'hit' && w.t >= S.wireHit) { w.ph = 'idle'; w.t = 0; }
      if (w.ph === 'hit') {
        for (const r of st.run) {
          if (r.stun > 0 || r.st === 'rescue' || r.st === 'span' || Math.abs(r.x - (w.x + S.wireW / 2)) > S.wireW / 2 + S.bw / 2 || r.y < GY - 70) continue;
          zap(st, r, w);
        }
      }
    }
  }
  function zap(st, r, w) {
    r.stun = S.zapT; r.vx = 0; r.sq = 1; st.stats.zaps++; st.rc.bad++;
    r.x += r.x < w.x + S.wireW / 2 ? -26 : 26;
    Sfx.play('cityZap'); Sfx.play('cityThud');
    K.pop(st, r.x, GY - 80, 'ZAP!', '#bff6ff', 26);
    K.spark(st, r.x, GY - 16, 10, ['#bff6ff', '#ffffff', '#ffe08a']);
    if (r.job === 'lift' && st.bus.held) dropBus(st, r, 'The bus thumps down! Lift it again.');
    goldCheck(st);
  }
  function crumble(st, dt) {
    for (const s of st.c.segs) {
      if (!s.crack || s.gone) { if (s.gone && s.fall < 1) s.fall = Math.min(1, s.fall + dt * 1.5); continue; }
      const on = st.run.some(r => r.grounded && !r.onSpan && r.x >= s.x0 - 6 && r.x <= s.x1 + 6 && r.st !== 'rescue') ||
        (!st.bus.held && st.bus.x >= s.x0 && st.bus.x <= s.x1);
      if (on && s.t === 0) { Sfx.play('bridgeCrack'); K.sound(st, (s.x0 + s.x1) / 2 - 140, GY - 150, 'CREEEAK!', { size: 26, c1: '#ffe14a', c2: '#ff8a1e', rot: -0.2 }); }
      if (on || s.t > 0) s.t += dt;
      if (s.t > 0 && Math.random() < 0.3) K.part(st, s.x0 + Math.random() * (s.x1 - s.x0), GY + 4, 0, 30 + Math.random() * 60, 0.8, 'rgba(160,150,140,0.8)', 3, 400, 'dust');
      if (s.t >= S.crumbleT) {
        s.gone = true; s.fall = 0;
        Sfx.play('bridgeCollapse'); G.shake = Math.max(G.shake || 0, 0.3);
        K.pop(st, (s.x0 + s.x1) / 2, GY - 90, 'It\'s falling!', '#ffd0c8', 24);
        K.sound(st, (s.x0 + s.x1) / 2 + 120, GY + 60, 'CRASH!', { size: 28 });
        for (let k = 0; k < 14; k++) K.part(st, s.x0 + Math.random() * (s.x1 - s.x0), GY + 10, (Math.random() - 0.5) * 80, 40 + Math.random() * 100, 1.2, k % 2 ? '#6a6a74' : '#8a8a94', 6, 600, 'conf');
      }
    }
  }
  function runner(st, r, dt, live) {
    r.t += dt;
    if (r.sq > 0) r.sq = Math.max(0, r.sq - dt * 4);
    if (r.stun > 0) { r.stun -= dt; r.vx = approach(r.vx, 0, 900 * dt); }
    if (r.st === 'rescue') { rescueStep(st, r, dt); return; }
    if (r.st === 'span' || r.st === 'boing') { if (r.st === 'boing') boingStep(st, r, dt); return; }
    const p = G.players[r.id], ok = live && r.stun <= 0, i = ok ? p.input : NO_INPUT, jump = ok && p.pendingJump, act = ok && p.pendingAct;
    const carrying = r.job === 'lift' && st.bus.held;
    // the strong hero lifts or sets down the bus
    if (act && r.job === 'lift' && r.grounded) {
      if (carrying) {
        const bx = r.x;
        if (segAt(st, bx - S.busW / 2 + 16) && segAt(st, bx + S.busW / 2 - 16) && !r.onSpan) setBusDown(st, r);
        else K.hint(st, r.id, 'Not here! Set the bus down on solid road');
      } else if (Math.abs(r.x - st.bus.x) < S.liftR) liftBus(st, r);
      else K.hintOnce(st, 'liftWhere' + st.k, r.id, 'Walk to the bus to lift it');
    }
    // the stretchy hero starts a stretch at a gap edge
    if (r.job === 'str' && ok && i.act && r.grounded && !r.onSpan && !st.span) startSpan(st, r);
    if (r.job === 'str' && act && !st.span && r.grounded) {
      if (!edgeFor(st, r)) K.hintOnce(st, 'strWhere' + st.k, r.id, 'Stand at the edge of a gap and hold ' + K.key(r.id, 'act'));
    }
    if (st.span && r.st === 'span') return;
    const want = (i.right ? 1 : 0) - (i.left ? 1 : 0), top = carrying ? S.carryV : S.runV;
    if (want) r.face = want;
    if (r.stun <= 0) r.vx = approach(r.vx, want * top, (r.grounded ? S.acc : S.acc * 0.6) * dt);
    if (jump && r.grounded) {
      if (carrying) K.hintOnce(st, 'noJump' + st.k, r.id, 'Too heavy to jump! ' + NAMES[st.str] + ' stretches over the gaps');
      else { r.vy = -S.jumpV; r.grounded = false; r.onSpan = false; Sfx.play('bridgeJump', r.id); }
    }
    r.x = clamp(r.x + r.vx * dt, 20, st.c.endX + 300);
    support(st, r, dt);
  }
  // what holds a runner up: solid deck, or the stretchy bridge
  function support(st, r, dt) {
    const sp = st.span, onSpanX = sp && r.x > sp.a - 2 && r.x < sp.b + 2;
    const deck = segAt(st, r.x);
    const surf = deck ? GY : onSpanX ? GY + sag(st, r.x) : null;
    if (r.grounded) {
      if (surf === null) { r.grounded = false; r.onSpan = false; }
      else { r.y = surf; r.onSpan = !deck && !!onSpanX; if (deck && !deck.crack) r.safeX = clamp(r.x, deck.x0 + 20, deck.x1 - 20); return; }
    }
    r.vy = Math.min(S.maxFall, r.vy + S.g * dt);
    const ny = r.y + r.vy * dt;
    if (r.vy >= 0 && surf !== null && r.y <= surf + 2 && ny >= surf) { r.y = surf; r.vy = 0; r.grounded = true; r.onSpan = !deck; r.sq = 0.6; return; }
    r.y = ny;
    if (r.y > GY + 90) fell(st, r);
  }
  const sag = (st, x) => { const sp = st.span; if (!sp) return 0; const u = clamp((x - sp.a) / (sp.b - sp.a), 0, 1); return Math.sin(u * Math.PI) * sp.sagNow; };
  function edgeFor(st, r) {
    const s = segAt(st, r.x);
    if (!s) return null;
    const gs = gaps(st);
    const right = gs.find(g => Math.abs(g.a - s.x1) < 1), left = gs.find(g => Math.abs(g.b - s.x0) < 1);
    const okR = right && s.x1 - r.x <= S.edgeR && right.b - right.a <= S.maxSpan;
    const okL = left && r.x - s.x0 <= S.edgeR && left.b - left.a <= S.maxSpan;
    if (okR && (!okL || r.face > 0)) return { a: right.a, b: right.b, feet: 'a' };
    if (okL) return { a: left.a, b: left.b, feet: 'b' };
    if (right && s.x1 - r.x <= S.edgeR) return { tooWide: true };
    return null;
  }
  function startSpan(st, r) {
    const e = edgeFor(st, r);
    if (!e) return;
    if (e.tooWide) { K.hintOnce(st, 'tooWide' + st.k, r.id, 'Too wide even for rubber!'); return; }
    st.span = { a: e.a, b: e.b, feet: e.feet, t: 0, grace: 0, sagNow: 6, w: e.b - e.a };
    r.st = 'span'; r.vx = 0; r.x = e.feet === 'a' ? e.a - 4 : e.b + 4; r.face = e.feet === 'a' ? 1 : -1;
    Sfx.play('bridgeStretch'); K.pop(st, (e.a + e.b) / 2, GY - 70, 'Stretch!', PCOL[r.id], 22);
  }
  function spanStep(st, dt) {
    const sp = st.span;
    if (!sp) { st.strain = Math.max(0, st.strain - dt * 0.5); return; }
    const Y = st.run[st.str], i = G.players[st.str].input, held = i.act && Y.stun <= 0;
    sp.t += dt;
    const loaded = st.run.filter(r => r !== Y && r.onSpan && r.st !== 'rescue');
    const bus = st.bus.held && loaded.some(r => r.job === 'lift');
    sp.sagNow = approach(sp.sagNow, 6 + loaded.length * 8 + (bus ? 16 : 0), 80 * dt);
    if (!st.gold) st.strain += dt * (0.45 + 0.55 * sp.w / S.maxSpan) * (1 + (bus ? 1 : 0) + (loaded.length ? 0.3 : 0)) / S.strainT;
    if (st.strain >= 1) { snap(st, 'SNAP!'); return; }
    if (held) { sp.grace = 0; return; }
    if (!loaded.length) { release(st); return; }
    if (sp.grace === 0) K.hint(st, Y.id, 'Hold on! ' + NAMES[loaded[0].id] + ' is on you!', 1.2);
    sp.grace += dt;
    if (sp.grace >= S.graceT) snap(st, 'Let go!');
  }
  // let go with nobody on: boing across to the strong hero's side
  function release(st) {
    const sp = st.span, Y = st.run[st.str], T = st.run[st.lift];
    st.span = null;
    const toB = T.x > (sp.a + sp.b) / 2 ? true : T.x < sp.a ? false : sp.feet === 'a';
    Y.st = 'boing'; Y.rt = 0; Y.rx0 = Y.x; Y.rx1 = toB ? sp.b + 20 : sp.a - 20; Y.grounded = false;
    K.sound(st, (sp.a + sp.b) / 2, GY - 130, 'BOING!', { size: 26, c1: '#ffffff', c2: '#ff7ac0' });
    Sfx.play('cityBoing'); st.stats.spans++;
  }
  function boingStep(st, r, dt) {
    r.rt += dt;
    const u = clamp(r.rt / 0.45, 0, 1);
    r.x = K.lerp(r.rx0, r.rx1, K.smooth(u)); r.y = GY - Math.sin(u * Math.PI) * 70;
    if (u >= 1) { r.st = 'run'; r.y = GY; r.grounded = true; r.vy = 0; r.sq = 1; r.face = r.rx1 > r.rx0 ? 1 : -1; Sfx.play('cityThud'); }
  }
  // the stretch gives way: the stretchy hero springs back and anyone on it falls
  function snap(st, word) {
    const sp = st.span, Y = st.run[st.str];
    st.span = null; st.strain = 0.35;
    Y.st = 'boing'; Y.rt = 0; Y.rx0 = Y.x; Y.rx1 = sp.feet === 'a' ? sp.a - 20 : sp.b + 20; Y.grounded = false;
    K.sound(st, (sp.a + sp.b) / 2, GY - 130, 'BOING!', { size: 26, c1: '#ffffff', c2: '#ff7ac0' });
    Sfx.play('bridgeSnap'); K.pop(st, (sp.a + sp.b) / 2, GY - 90, word, '#ffd0c8', 28);
    for (const r of st.run) if (r !== Y && r.onSpan) { r.grounded = false; r.onSpan = false; r.vy = 60; }
  }
  function fell(st, r) {
    st.stats.slips++; st.rc.bad++;
    r.st = 'rescue'; r.rt = 0; r.rx0 = r.x; r.ry0 = r.y; r.vx = 0; r.vy = 0; r.onSpan = false;
    r.rx1 = r.safeX;
    Sfx.play('shrunkSquee'); Sfx.play('cityBoing', 0.8);
    K.pop(st, r.x, GY + 40, 'Gotcha!', PCOL[st.str], 26);
    goldCheck(st);
  }
  function rescueStep(st, r, dt) {
    r.rt += dt;
    const u = clamp(r.rt / S.rescueT, 0, 1);
    r.x = K.lerp(r.rx0, r.rx1, K.smooth(u)); r.y = K.lerp(r.ry0, GY, K.smooth(u)) - Math.sin(u * Math.PI) * 120;
    if (u >= 1) { r.st = 'run'; r.y = GY; r.grounded = true; r.sq = 1; r.stun = 0.3; if (st.rc.bad === 1) K.msg(st, 'Caught by a rubber arm! Back to safe road.', '#ffffff', 3); }
  }
  function goldCheck(st) {
    if (st.rc.bad >= 3 && !st.goldUsed && K.both(st)) {
      st.goldUsed = true; st.gold = true; st.strain = 0;
      K.goldHelp(st, 'Gold steel cable! ' + NAMES[st.str] + '\'s stretch never snaps this stretch');
    }
  }
  function liftBus(st, r) {
    st.bus.held = true; st.bus.sq = 1; r.sq = 1; r.x = st.bus.x; st.stats.lifts++;
    Sfx.play('bridgeLift'); K.pop(st, r.x, GY - 130, 'Up it goes!', '#ffffff', 22);
    st.bus.cheer = 1.2;
  }
  function setBusDown(st, r) {
    st.bus.held = false; st.bus.x = r.x; st.bus.y = GY; st.bus.sq = 1;
    Sfx.play('cityThud');
  }
  function dropBus(st, r, why) {
    st.bus.held = false; st.bus.y = GY;
    // it lands on solid road next to them (nudged off a gap or a cracked slab)
    let x = r.x;
    const ok = bx => { const a = segAt(st, bx - S.busW / 2 + 16), b = segAt(st, bx + S.busW / 2 - 16); return a && b && !a.crack && !b.crack; };
    for (let d = 0; d < 600 && !ok(x); d += 10) { if (ok(r.x - d)) { x = r.x - d; break; } if (ok(r.x + d)) { x = r.x + d; break; } }
    st.bus.x = x; st.bus.sq = 1;
    Sfx.play('cityThud'); K.msg(st, why, '#ffffff', 2.6);
  }
  function busStep(st, dt) {
    const b = st.bus, T = st.run[st.lift];
    if (b.sq > 0) b.sq = Math.max(0, b.sq - dt * 3);
    if (b.cheer > 0) b.cheer -= dt;
    if (b.held) { b.x = T.x; b.y = T.y - S.bh - 6 + (T.st === 'rescue' ? 0 : Math.sin(G.clock * 7) * 1.2); }
    else {
      // a bus left on a slab that crumbles falls: the rubber arm drags it back
      if (!segAt(st, b.x)) { b.x = T.safeX; st.stats.slips++; K.pop(st, b.x, GY - 90, 'Saved the bus!', PCOL[st.str], 22); }
    }
  }
  function badges(st) {
    for (const r of st.run) {
      for (const q of st.c.badges) {
        // (crossing the rubber bridge collects the badge over the gap, however far it sags under the bus)
        if (q.got || Math.abs(q.x - r.x) > S.badgeR || Math.abs(q.y - (r.y - 13)) > S.badgeR + (r.onSpan ? 42 : 8)) continue;
        q.got = true; st.badge++;
        Sfx.play('cityPop', 1 + (st.badge % 5) * 0.06); K.spark(st, q.x, q.y, 6, ['#ffe08a', '#ffffff']);
      }
    }
  }
  function leash(st) {
    const [a, b] = st.run;
    if (a.st !== 'run' || b.st !== 'run') return;
    const front = a.x > b.x ? a : b, back = front === a ? b : a;
    if (front.x - back.x > S.leash) { front.x = back.x + S.leash; front.vx = Math.min(front.vx, 0); K.hintOnce(st, 'leash' + front.id + st.k, front.id, 'Wait for ' + NAMES[back.id] + '!'); }
  }
  function goal(st) {
    const c = st.c, b = st.bus;
    if (b.x < c.endX + 20 || !st.run.every(r => r.grounded && r.st === 'run' && r.x >= c.endX - 40)) return;
    if (b.held) setBusDown(st, st.run[st.lift]);
    const last = !(G.level.def.rooms && G.level.def.roomIndex < G.level.def.roomCount - 1);
    st.state = 'end'; st.endT = 0; st.lastRoom = last; st.span = null;
    st.stats.roomT[st.k] = G.time - st.segStart;
    Sfx.play('cityCheer');
    K.pop(st, c.endX + 60, GY - 200, last ? 'Everyone is off the bridge! Heroes!' : 'Bus safe at the tower! Swap powers!', '#ffffff', 26);
    for (const r of st.run) r.vx = 0;
  }
  function endStep(st, dt) {
    st.endT += dt;
    if (st.lastRoom) {
      if (st.endT > 0.7 && !st.party) { st.party = true; Sfx.play('bridgeFanfare'); K.confetti(st, st.c.endX + 60, GY - 200, 50); }
      if (st.endT > 2.6 && !st.cleared) { st.cleared = true; G.level.goal = { x: st.c.endX + 60 - st.cam.x, y: GY - 80 }; levelClear(); }
    } else if (st.endT > 2.0) nextRoom();
  }

  /* ---------- the camera ---------- */
  function cam(st, dt) {
    const xs = st.run.map(r => r.x), mid = (xs[0] + xs[1]) / 2, lead = Math.max(...xs), back = Math.min(...xs);
    let want = Math.max(mid - W * 0.42, lead - W + 160);
    want = Math.min(want, back - 120);
    want = clamp(want, 0, st.c.endX + 360 - W);
    st.cam.x = K.lerp(st.cam.x, want, Math.min(1, dt * 5));
  }
  function mirror(st) {
    for (const r of st.run) K.place(r.id, r.x - st.cam.x, Math.min(r.y, GY + 60));
  }

  /* ---------- what to do next ----------
     plan(st): { G (the next gap the bus must cross, { a, b }) or null, stage ('get' | 'walk' | 'span' | 'cross' |
       'end'), lift: { x, act ('tap'), why }, str: { x, act (true = hold), why }, wireWait: a wire x both should wait
       before, or null } */
  // seconds until a wire next lashes down (0 while it is lashing)
  const wireIn = w => (w.ph === 'hit' ? 0 : w.ph === 'warn' ? S.wireWarn - w.t : S.wireIdle - w.t + S.wireWarn);
  function wireBlock(st, r, tx, v) {
    // the first wire between r and tx that would catch r crossing it now
    const dir = tx > r.x ? 1 : -1;
    for (const w of st.c.wires) {
      const wc = w.x + S.wireW / 2, d = (wc - r.x) * dir;
      if (d < -S.wireW / 2 - 14 || (tx - wc) * dir < -S.wireW / 2 - 14) continue;
      const tIn = Math.max(0, (d - S.wireW / 2 - 14) / v), tOut = (d + S.wireW / 2 + 14) / v, n = wireIn(w);
      const hitNow = w.ph === 'hit' && d < S.wireW / 2 + 14 && d > -S.wireW / 2 - 14;
      if (hitNow) return null;
      if (n < tOut + 0.1 && n + S.wireHit > tIn - 0.05) return wc - dir * (S.wireW / 2 + 30);
    }
    return null;
  }
  function plan(st) {
    const c = st.c, T = st.run[st.lift], Y = st.run[st.str], b = st.bus, sp = st.span;
    const out = { G: null, stage: 'end', lift: { x: c.endX + 60 }, str: { x: c.endX + 20 }, wireWait: null };
    const gs = gaps(st);
    const ref = b.held ? T.x : b.x;
    const Gp = gs.find(g => g.b > ref + 4) || null;
    out.G = Gp;
    if (!b.held) {
      out.stage = 'get';
      out.lift = { x: b.x, act: Math.abs(T.x - b.x) < S.liftR - 16 && T.grounded ? 'tap' : false, why: 'lift' };
      out.str = Gp ? { x: Gp.a - 8, why: 'wait' } : { x: Math.max(Y.x, b.x + 90), why: 'wait' };
      if (Gp && Y.x > Gp.b) out.str = { x: Gp.b + 8, why: 'wait' };
    } else if (!Gp) {
      out.stage = 'end';
      out.lift = { x: c.endX + 60, why: 'go' };
      out.str = { x: c.endX + 20, why: 'go' };
    } else {
      const yFar = Y.x > Gp.b - 2 && Y.st !== 'span';
      const anchor = yFar ? Gp.b + 6 : Gp.a - 6;
      const spanHere = sp && Math.abs(sp.a - Gp.a) < 2;
      const Tpast = T.x - S.bw / 2 > Gp.b + 2 && !T.onSpan;
      if (spanHere) {
        out.stage = 'cross';
        out.lift = { x: Gp.b + 60, why: 'cross' };
        out.str = { x: Y.x, act: !Tpast, why: 'hold' };
      } else {
        out.stage = Math.abs(Y.x - anchor) < S.edgeR - 10 && Y.grounded ? 'span' : 'walk';
        out.lift = { x: Gp.a - 34, why: 'walk' };
        // the stretchy hero holds when the strong hero is close enough to cross straight away
        const near = Math.abs(T.x - (Gp.a - 34)) < 110 && T.grounded;
        out.str = { x: anchor, act: out.stage === 'span' && near, why: 'edge' };
      }
    }
    // the stretchy hero left behind a slab that crumbled: stretch over it and let go at once to boing across
    const behind = gs.find(g => Y.x < g.a + 2 && T.x > g.b + 2 && g.b - g.a <= S.maxSpan);
    if (behind && Y.st === 'run') {
      const ex = behind.a - 6;
      out.str = { x: ex, act: Math.abs(Y.x - ex) < S.edgeR - 10 && Y.grounded ? 'tap' : false, why: 'over' };
    }
    // a cracked slab ahead: the stretchy hero waits for the strong hero so they cross it together (it starts to crumble
    // at the first step, and the bus is slow)
    if (!out.str.act && Y.st === 'run' && out.str.why !== 'over') {
      const cr = c.segs.find(s => s.crack && !s.gone && s.t === 0 && s.x0 > Y.x - 4 && s.x0 < out.str.x);
      if (cr && T.x < cr.x0 - 60) { out.str.x = Math.min(out.str.x, cr.x0 - 26); out.str.why = 'crack'; }
    }
    // live wires: wait before one that is about to lash down
    for (const [job, r, v] of [['lift', T, b.held ? S.carryV : S.runV], ['str', Y, S.runV]]) {
      if (out[job].act && job === 'str') continue;
      const wx = wireBlock(st, r, out[job].x, v);
      if (wx !== null) { out[job].x = wx; out[job].why = 'wire'; out.wireWait = wx; }
    }
    return out;
  }

  /* ---------- drawing (comic-book look: ink, flat colour, printed dots) ---------- */
  const TOWER = 900, INK = K.INK;
  // the river under the bridge: reflected city lights, inked wave crests, boats, a buoy and gulls (screen px)
  function river(st, cx, t, y0, storm) {
    ctx.fillStyle = '#1f56c0'; ctx.fillRect(0, y0, W, H - y0);
    K.dotFade(0, W, y0 + 40, H, '#0f2a7a', 10, 0.72, cx * 0.2);
    // city lights reflected in wobbly streaks
    for (let k = 0; k < 46; k++) {
      const x = ((k * 53 + K.hash(k) * 30 - cx * 0.14) % (W + 60) + W + 60) % (W + 60) - 30, col = ['#ffe14a', '#ff7ac0', '#ff8a2a', '#7af0ff'][k % 4], n = 3 + Math.floor(K.hash(k + 4) * 4);
      ctx.fillStyle = col; for (let q = 0; q < n; q++) { const w = 12 - q * 1.6; ctx.fillRect(x - w / 2 + Math.sin(t * 2 + k + q) * 3, y0 + 6 + q * 9, w, 4); }
    }
    // a far ferry with lit windows, a buoy with a blinking light, a sailboat, a red tugboat puffing inked smoke
    const fx = ((t * 12 - cx * 0.16 + 300) % 1500 + 1500) % 1500 - 200, fy = y0 + 22;
    ctx.beginPath(); ctx.moveTo(fx - 70, fy - 16); ctx.lineTo(fx + 70, fy - 16); ctx.lineTo(fx + 58, fy); ctx.lineTo(fx - 58, fy); ctx.closePath(); ctx.rect(fx - 48, fy - 34, 96, 18); ctx.rect(fx - 10, fy - 48, 20, 14); K.inkFill('#fff8e0', 2);
    ctx.fillStyle = '#e8222e'; ctx.fillRect(fx - 64, fy - 8, 128, 4); ctx.fillStyle = '#ffe14a'; for (let k = 0; k < 8; k++) ctx.fillRect(fx - 43 + k * 11, fy - 30, 7, 8);
    const bx = ((620 - cx * 0.24) % 1400 + 1400) % 1400 - 100, by = y0 + 64 + Math.sin(t * 2.2) * 3;
    ctx.beginPath(); ctx.moveTo(bx - 12, by); ctx.lineTo(bx - 7, by - 26); ctx.lineTo(bx + 7, by - 26); ctx.lineTo(bx + 12, by); ctx.closePath(); K.inkFill('#e8222e', 1.5);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - 9, by - 16, 18, 5);
    circle(bx, by - 31, 4.5); K.inkFill(Math.sin(t * 4) > 0 ? '#ffe14a' : '#7a5a10', 1);
    const sx = ((t * 8 - cx * 0.22 + 980) % 1500 + 1500) % 1500 - 150, sy = y0 + 52 + Math.sin(t * 1.6 + 2) * 2;
    ctx.beginPath(); ctx.moveTo(sx, sy - 58); ctx.lineTo(sx + 30, sy - 8); ctx.lineTo(sx, sy - 8); ctx.closePath(); K.inkFill('#ffffff', 2);
    ctx.beginPath(); ctx.moveTo(sx - 3, sy - 48); ctx.lineTo(sx - 22, sy - 8); ctx.lineTo(sx - 3, sy - 8); ctx.closePath(); K.inkFill('#ffe14a', 2);
    ctx.beginPath(); ctx.moveTo(sx - 28, sy - 6); ctx.lineTo(sx + 34, sy - 6); ctx.lineTo(sx + 24, sy + 6); ctx.lineTo(sx - 20, sy + 6); ctx.closePath(); K.inkFill('#19a89a', 2);
    const tx = ((900 - t * 20 - cx * 0.3) % 1600 + 1600) % 1600 - 200, ty = y0 + 92 + Math.sin(t * 2) * 2;
    for (let k = 0; k < 4; k++) { const u = ((t * 0.5 + k * 0.25) % 1); ctx.globalAlpha = 1 - u * 0.6; circle(tx + 8 + u * 46, ty - 54 - u * 40, 7 + u * 12); K.inkFill('#f2f2f2', 1.5); } ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.rect(tx + 2, ty - 50, 12, 26); K.inkFill(INK, 1); ctx.fillStyle = '#e8222e'; ctx.fillRect(tx + 2, ty - 46, 12, 5);
    ctx.beginPath(); ctx.rect(tx - 22, ty - 30, 34, 20); K.inkFill('#fff3a0', 2); ctx.fillStyle = '#7af0ff'; ctx.fillRect(tx - 17, ty - 26, 9, 8); ctx.fillRect(tx - 4, ty - 26, 9, 8);
    ctx.beginPath(); ctx.moveTo(tx - 46, ty - 12); ctx.lineTo(tx + 44, ty - 12); ctx.lineTo(tx + 32, ty + 6); ctx.lineTo(tx - 36, ty + 6); ctx.closePath(); K.inkFill('#e8222e', 2.5);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(tx - 40, ty - 7, 78, 3);
    // rows of inked white wave crests, bigger toward the front
    for (let r = 0; r < 7; r++) {
      const y = y0 + 50 + r * 34, sc = 0.7 + r * 0.16, step = 96 * sc, off = ((t * (14 + r * 7) + cx * (0.2 + r * 0.06) + r * 37) % step + step) % step;
      ctx.beginPath();
      for (let x = -step - off; x < W + step; x += step) { ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 14 * sc, y - 12 * sc, x + 30 * sc, y - 9 * sc); ctx.quadraticCurveTo(x + 40 * sc, y - 15 * sc, x + 50 * sc, y - 4 * sc); ctx.quadraticCurveTo(x + 36 * sc, y - 6 * sc, x + 30 * sc, y); ctx.closePath(); }
      K.inkFill('#ffffff', 1.3);
      ctx.strokeStyle = '#0e3a8a'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = -step - off; x < W + step; x += step) { ctx.moveTo(x - 30 * sc, y + 5); ctx.quadraticCurveTo(x - 10 * sc, y - 2, x, y + 1); } ctx.stroke();
    }
    // gulls over the water
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
    for (let k = 0; k < 4; k++) { const x = ((t * 40 + k * 150 - cx * 0.3) % (W + 200) + W + 200) % (W + 200) - 100, y = y0 - 20 + (k % 2) * 30 + Math.sin(t * 2 + k) * 6, f = 4 + Math.sin(t * 10 + k) * 3; ctx.moveTo(x - 9, y - f); ctx.quadraticCurveTo(x - 4, y - f - 3, x, y); ctx.quadraticCurveTo(x + 4, y - f - 3, x + 9, y - f); }
    ctx.stroke(); ctx.lineCap = 'butt';
  }
  function draw(st) {
    const cx = st.cam.x, t = st.clock, storm = G.level.def.storm || 0.3;
    K.sky(cx, t, { mode: 'dusk', moonX: 700, moonY: 100, storm });
    // the far shore: the city across the river, in dusk colours
    K.skyline(cx, t, { mode: 'dusk', base: 330, n: 2 });
    river(st, cx, t, 330, storm);
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, 0);
    // towers and main cables (behind the deck): red with highlights and ink edges
    const i0 = Math.floor((cx - 200) / TOWER), i1 = Math.ceil((cx + W + 200) / TOWER);
    for (let i = i0; i <= i1; i++) {
      const tx = i * TOWER + 300;
      // hangers (some snapped and dangling)
      for (let k = 1; k < 15; k++) {
        const hx = tx + k * TOWER / 15, u = k / 15;
        const cyy = (1 - u) * (1 - u) * 60 + 2 * u * (1 - u) * (GY + 60) + u * u * 60;
        const snapped = K.hash(i * 31 + k) < 0.3;
        K.edge(() => { ctx.beginPath(); ctx.moveTo(hx, cyy); ctx.lineTo(hx + (snapped ? Math.sin(t * 2 + k) * 8 : 0), snapped ? cyy + (GY - cyy) * 0.5 : GY - 4); }, '#ff5a4a', 1.5);
      }
      // main cable from this tower to the next, sagging to the deck
      K.edge(() => { ctx.beginPath(); ctx.moveTo(tx, 60); ctx.quadraticCurveTo(tx + TOWER / 2, GY + 60, tx + TOWER, 60); }, '#e8222e', 7);
      ctx.strokeStyle = '#ff9a8a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx, 57); ctx.quadraticCurveTo(tx + TOWER / 2, GY + 57, tx + TOWER, 57); ctx.stroke();
      // the tower: two red legs with cross braces
      for (const lx of [tx - 22, tx + 22]) { K.inkRect(lx - 9, 40, 18, GY + 160, '#e8222e', 2); ctx.fillStyle = '#ff9a8a'; ctx.fillRect(lx - 9, 40, 5, GY + 160); ctx.fillStyle = '#a81420'; ctx.fillRect(lx + 4, 40, 5, GY + 160); }
      for (const y of [70, 170, 280]) K.inkRect(tx - 31, y, 62, 12, '#a81420', 1.5);
      ctx.beginPath(); ctx.moveTo(tx - 31, 40); ctx.lineTo(tx, 22); ctx.lineTo(tx + 31, 40); ctx.closePath(); K.inkFill('#e8222e', 1.5);
      circle(tx, 18, 5); K.inkFill(Math.sin(t * 3 + i) > 0 ? '#ff3b30' : '#7a1a1a', 1.2);
    }
    // the deck: teal girders under the road, the road on top
    for (const s of st.c.segs) {
      if (s.x1 < cx - 60 || s.x0 > cx + W + 60) continue;
      if (s.gone) { if (s.fall < 1) { ctx.globalAlpha = 1 - s.fall; drawSlab(st, s, s.fall * 220, s.fall * 0.3, t); ctx.globalAlpha = 1; } continue; }
      drawSlab(st, s, 0, 0, t);
    }
    // the safe tower base at the end
    const ex = st.c.endX;
    K.inkRect(ex + 30, GY - 160, 200, 160, '#2e7bff', 2);
    K.dotFade(ex + 30, ex + 230, GY - 80, GY, '#1c3fa8', 8, 0.66);
    K.inkRect(ex + 30, GY - 160, 200, 12, '#fff3a8', 2);
    ctx.fillStyle = INK; ctx.fillRect(ex + 64, GY - 136, 140, 40);
    K.inkRect(ex + 60, GY - 140, 140, 40, '#2fc45a', 1.5);
    K.word(G.level.def.safe || 'SAFE', ex + 130, GY - 120, 22, '#ffffff', { lw: 4 });
    ctx.restore();
  }
  function drawSlab(st, s, dy, rot, t) {
    const w = s.x1 - s.x0;
    ctx.save(); ctx.translate((s.x0 + s.x1) / 2, GY + dy); ctx.rotate(rot);
    const x = -w / 2;
    // the teal truss under the road, with cross-bracing
    K.inkRect(x, 10, w, 46, '#18a892', 2);
    ctx.save(); ctx.beginPath(); ctx.rect(x, 10, w, 46); ctx.clip(); K.dotFade(x, x + w, 26, 56, '#0b5a4e', 7, 0.6);
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.beginPath(); for (let k = 0; k < w; k += 40) { ctx.moveTo(x + k, 12); ctx.lineTo(x + Math.min(w, k + 40), 54); ctx.moveTo(x + Math.min(w, k + 40), 12); ctx.lineTo(x + k, 54); } ctx.stroke();
    ctx.strokeStyle = '#5fe0c0'; ctx.lineWidth = 3; ctx.stroke(); ctx.lineCap = 'butt';
    ctx.restore();
    K.inkRect(x, 50, w, 8, '#5fe0c0', 1.25);
    // the road: pale, a bright top edge (the surface you run on), yellow dashes
    K.inkRect(x, 0, w, 12, '#4c4a9a', 2);
    ctx.fillStyle = '#fff3a8'; ctx.fillRect(x, -2, w, 4); ctx.fillStyle = INK; ctx.fillRect(x, 2, w, 1.5);
    ctx.fillStyle = '#ffe14a'; for (let k = 10; k < w - 20; k += 50) ctx.fillRect(x + k, 5, 24, 3);
    // white railing at the back, black-edged
    K.edge(() => { ctx.beginPath(); ctx.moveTo(x + 1, -24); ctx.lineTo(x + w - 1, -24); for (let k = 0; k <= w; k += 24) { ctx.moveTo(x + k, -24); ctx.lineTo(x + k, -2); } }, '#ffffff', 2);
    // broken ends: jagged rebar sticking out
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    for (const [ex, d] of [[x, -1], [x + w, 1]]) { for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(ex, 4 + k * 12); ctx.lineTo(ex + d * (6 + K.hash(s.x0 + k + d) * 12), 2 + k * 12 + 4); ctx.stroke(); } }
    if (s.crack) {
      // a cracked slab: inked zig-zag cracks, worse as it goes
      const u = clamp(s.t / S.crumbleT, 0, 1), shake = u > 0 ? Math.sin(t * 50) * u * 2 : 0;
      ctx.translate(shake, 0);
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      for (let k = 0; k < 3 + Math.floor(u * 4); k++) { const cx = x + (k + 0.5) * w / (3 + Math.floor(u * 4)); ctx.beginPath(); ctx.moveTo(cx, -1); ctx.lineTo(cx + 8, 10); ctx.lineTo(cx - 4, 22); ctx.lineTo(cx + 6, 40); ctx.stroke(); }
      ctx.fillStyle = Math.sin(t * 10) > 0 ? '#e8222e' : '#ff8a2a'; ctx.fillRect(x, -3, w, 3);
    }
    ctx.restore();
  }
  function bolt(x0, y0, x1, y1, seed, t) {
    // a jagged yellow lightning bolt with an ink outline
    ctx.beginPath(); ctx.moveTo(x0, y0);
    const n = 5;
    for (let k = 1; k < n; k++) { const u = k / n; ctx.lineTo(K.lerp(x0, x1, u) + (K.hash(seed + k + Math.floor(t * 20)) - 0.5) * 22, K.lerp(y0, y1, u)); }
    ctx.lineTo(x1, y1);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = '#fff36a'; ctx.lineWidth = 3; ctx.stroke();
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
  }
  function drawWire(st, w, t) {
    const x = w.x + S.wireW / 2;
    // the snapped cable hangs from above, coiling; it lashes down when it hits
    const hit = w.ph === 'hit', warn = w.ph === 'warn', u = hit ? 1 : warn ? w.t / S.wireWarn : 0;
    const endY = hit ? GY - 6 : K.lerp(GY - 180, GY - 140, u) + Math.sin(t * 4 + x) * 8;
    K.edge(() => { ctx.beginPath(); ctx.moveTo(x - 30, 40); ctx.quadraticCurveTo(x + 40 * Math.sin(t * 2 + x), (endY + 40) / 2, x, endY); }, '#2a3a8a', 5);
    if (warn || hit) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 22);
      ctx.save(); ctx.beginPath(); ctx.ellipse(x, GY + 1, S.wireW / 2 + 8, 6, 0, 0, TAU); ctx.clip(); K.dotScreen(x - 40, GY - 8, x + 40, GY + 8, '#e8222e', 5, 1 + 1.2 * u); ctx.restore();
      for (let k = 0; k < 4; k++) { const a = t * 30 + k * 1.6; bolt(x, endY, x + Math.cos(a + 0.5) * 30, endY + Math.sin(a + 0.5) * 26, k * 7 + x, t); }
      circle(x, endY, 6 + pulse * 4); K.inkFill('#ffffff', 1.5);
    }
    if (hit) { bolt(x, endY - 60, x - 6, GY - 2, x, t); bolt(x + 8, endY - 50, x + 14, GY - 2, x + 3, t); }
  }
  function drawBus(st, t) {
    const b = st.bus, held = b.held, x = b.x, y = b.y, w = S.busW, h = S.busH, sq = 1 - b.sq * 0.1;
    ctx.save(); ctx.translate(x, y); ctx.scale(1 + b.sq * 0.06, sq);
    if (held) ctx.rotate(Math.sin(t * 3) * 0.03);
    if (!held) { ctx.fillStyle = 'rgba(20,18,28,0.45)'; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.55, 6, 0, 0, TAU); ctx.fill(); }
    const bot = held ? -6 : -10;
    ctx.fillStyle = INK; rr(-w / 2 + 4, bot - h + 4, w, h, 10); ctx.fill();
    ctx.beginPath(); rr(-w / 2, bot - h, w, h, 10); K.inkFill('#ffd02a', 2);
    ctx.save(); ctx.beginPath(); rr(-w / 2, bot - h, w, h, 10); ctx.clip(); K.dotFade(-w / 2, w / 2, bot - h * 0.4, bot, '#ff9a1e', 6, 0.6); ctx.fillStyle = '#e8222e'; ctx.fillRect(-w / 2, bot - 18, w, 8); ctx.fillStyle = INK; ctx.fillRect(-w / 2, bot - 19, w, 1.5); ctx.fillRect(-w / 2, bot - 10, w, 1.5); ctx.restore();
    // windows and passengers (faces readable: no outline on eyes)
    for (let k = 0; k < 5; k++) {
      const wx = -w / 2 + 8 + k * 22, wy = bot - h + 8;
      ctx.beginPath(); rr(wx, wy, 18, 20, 3); K.inkFill('#bff0ff', 1);
      const scared = held || st.span;
      ctx.fillStyle = ['#f2c8a0', '#c89070', '#f2d8b0', '#a87050', '#f2c8a0'][k];
      circle(wx + 9, wy + 14, 5.5); ctx.fill();
      ctx.fillStyle = '#1c1a1a'; circle(wx + 7, wy + 13, 1); ctx.fill(); circle(wx + 11, wy + 13, 1); ctx.fill();
      if (scared) { ctx.beginPath(); ctx.ellipse(wx + 9, wy + 17, 1.6, 2, 0, 0, TAU); ctx.fill(); }
      if (b.cheer > 0 && k % 2 === 0) { ctx.strokeStyle = '#f2c8a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx + 14, wy + 16); ctx.lineTo(wx + 16, wy + 4 + Math.sin(t * 14 + k) * 2); ctx.stroke(); }
    }
    K.inkRect(w / 2 - 8, bot - h + 8, 6, 24, '#16307a', 0.75);
    K.word('CITY BUS', -10, bot - 14, 9, '#ffffff', { lw: 2.5 });
    circle(w / 2 - 4, bot - 8, 3); K.inkFill('#fff6c0', 0.75);
    // wheels (dangling when lifted)
    for (const wx of [-w / 2 + 24, w / 2 - 24]) { circle(wx, bot + (held ? 2 : 0), 9); K.inkFill('#2a3a8a', 1); circle(wx, bot + (held ? 2 : 0), 3.5); K.inkFill('#ffffff', 0.6); }
    ctx.restore();
    if (held && Math.sin(t * 2.2) > 0.6) K.word(['Wheee!', 'Aaah!', 'Hold tight!', 'Go hero!'][Math.floor(t / 2.85) % 4], x - 30, y - h - 34, 15, '#ffffff', { lw: 4, rot: -0.06 });
  }
  function drawSpan(st, t) {
    const sp = st.span, Y = st.run[st.str];
    if (!sp) return;
    const id = Y.id, a = sp.a - 4, b = sp.b + 4, n = 20;
    const pts = [];
    for (let k = 0; k <= n; k++) { const x = K.lerp(a, b, k / n); pts.push([x, GY - 10 + sag(st, x) + Math.sin(t * 8 + k * 0.6) * (st.strain > 0.7 ? 1.5 : 0)]); }
    // a rubber band in the hero's colour: ink outline, stripes of the stretchy suit, stretch marks
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const line = () => { ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); };
    line(); ctx.strokeStyle = INK; ctx.lineWidth = 21; ctx.stroke();
    ctx.strokeStyle = st.gold ? C.gold : PCOL[id]; ctx.lineWidth = 15; ctx.stroke();
    ctx.strokeStyle = id === 0 ? '#ffe14a' : '#ffffff'; ctx.lineWidth = 4; ctx.setLineDash([8, 14]); line(); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2.5; ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y - 5) : ctx.moveTo(x, y - 5))); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    for (let k = 2; k < n - 1; k += 3) { const [x, y] = pts[k]; ctx.beginPath(); ctx.moveTo(x - 3, y + 1); ctx.lineTo(x + 3, y + 6); ctx.stroke(); }
    // boots at the near end, the head and hands at the far end
    const feetA = sp.feet === 'a', fx = feetA ? a : b, hx = feetA ? b : a, d = feetA ? 1 : -1;
    ctx.beginPath(); rr(fx - 8 - d * 4, GY - 12, 16, 10, 4); K.inkFill('#2a2040', 1);
    circle(hx - d * 6, GY - 16, 14); K.inkFill(PCOL[id], 1.25);
    ctx.fillStyle = id === 0 ? '#2a1a3a' : '#1a2a4a'; ctx.fillRect(hx - d * 6 - 12, GY - 22, 24, 6);
    for (const ex of [-4, 4]) { ctx.fillStyle = '#ffffff'; circle(hx - d * 6 + ex + d * 2, GY - 19, 3); ctx.fill(); ctx.fillStyle = C.ink; circle(hx - d * 6 + ex + d * 3, GY - 19, 1.5); ctx.fill(); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx - d * 6 - 4, GY - 10); ctx.lineTo(hx - d * 6 + 4, GY - 10); ctx.stroke();
    circle(hx + d * 4, GY - 4, 5); K.inkFill(PCOL[id], 0.75); circle(hx + d * 2, GY - 2, 5); K.inkFill(PCOL[id], 0.75);
    // the cape flutters from the middle
    const [mx, my] = pts[Math.floor(n / 2)];
    ctx.beginPath(); ctx.moveTo(mx - 10, my - 6); ctx.quadraticCurveTo(mx - 20, my - 30 + Math.sin(t * 9) * 6, mx - 40, my - 26 + Math.sin(t * 9) * 8); ctx.lineTo(mx + 8, my - 6); ctx.closePath(); K.inkFill(id === 0 ? '#e8222e' : '#ffd23a', 0.9);
    // strain shown on the span itself: red printed dots
    if (st.strain > 0.6 && !st.gold) { ctx.globalAlpha = clamp((st.strain - 0.6) * 2.5 * (0.6 + 0.4 * Math.sin(t * 20)), 0, 1); ctx.fillStyle = '#e8222e'; for (const [x, y] of pts) { circle(x, y, 4); ctx.fill(); } ctx.globalAlpha = 1; }
  }
  function drawTop(st) {
    const cx = st.cam.x, t = st.clock;
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, 0);
    for (const w of st.c.wires) if (w.x > cx - 120 && w.x < cx + W + 120) drawWire(st, w, t);
    for (const q of st.c.badges) {
      // hero badges: flat gold stars, ink outline, a white glint, no soft halo
      if (q.got || q.x < cx - 40 || q.x > cx + W + 40) continue;
      const yy = q.y + Math.sin(t * 3 + q.x) * 4;
      K.star(q.x, yy, 12.5, 5.8, Math.sin(t * 2 + q.x) * 0.2); K.inkFill('#ffe14a', 1.25);
      ctx.fillStyle = '#ffb02e'; K.star(q.x + 1, yy + 2, 6, 2.8, Math.sin(t * 2 + q.x) * 0.2); ctx.fill();
      ctx.fillStyle = '#ffffff'; circle(q.x - 3, yy - 4, 1.8); ctx.fill();
    }
    drawSpan(st, t);
    if (!st.bus.held) drawBus(st, t);
    for (const r of st.run) drawRunner(st, r, t);
    if (st.bus.held) drawBus(st, t);
    K.drawParts(st, cx);
    ctx.restore();
    // storm rain: slanted white and ink strokes, thicker as the storm grows
    const storm = G.level.def.storm || 0.3;
    ctx.lineCap = 'round'; ctx.lineWidth = 1.6;
    for (const [ink, a] of [[false, 0.75], [true, 0.55]]) {
      ctx.strokeStyle = ink ? 'rgba(20,18,28,' + a + ')' : 'rgba(255,255,255,' + a + ')'; ctx.beginPath();
      for (let k = ink ? 1 : 0; k < 90 * storm; k += 2) { const u = (t * (1.4 + K.hash(k) * 0.8) + K.hash(k + 3)) % 1, x = K.hash(k + 7) * (W + 200) - u * 120, y = u * H; ctx.moveTo(x, y); ctx.lineTo(x - 9, y + 26); }
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    K.drawPops(st, cx, 0);
    K.drawWords(st, cx, 0, st.run);
  }
  function drawRunner(st, r, t) {
    if (r.st === 'span') return;
    let sy = 1 - r.sq * 0.18, rot = 0;
    if (r.st === 'rescue') rot = Math.sin(r.rt * 20) * 0.4;
    else if (r.st === 'boing') rot = (r.rx1 > r.rx0 ? 1 : -1) * r.rt * 14;
    else if (!r.grounded) rot = r.face * clamp(r.vy / 2000, -0.15, 0.15);
    else if (Math.abs(r.vx) > 20) rot = r.face * 0.08;
    if (r.grounded) { ctx.fillStyle = 'rgba(20,18,28,0.45)'; ctx.beginPath(); ctx.ellipse(r.x, r.y, 13, 4, 0, 0, TAU); ctx.fill(); }
    const carrying = r.job === 'lift' && st.bus.held;
    if (r.st === 'rescue') {
      // the rubber arm reaching down to catch them
      const Y = st.run[st.str];
      const arm = () => { ctx.beginPath(); ctx.moveTo(r.rx1, GY - 6); ctx.quadraticCurveTo((r.x + r.rx1) / 2, r.y + 40, r.x, r.y - 20); };
      K.edge(arm, PCOL[Y.id], 6);
    }
    K.suit(r.id, r.x, r.y, { face: r.face, rot, sy: carrying ? 0.86 : sy, sx: carrying ? 1.12 : 2 - sy, vy: r.grounded ? 0 : r.vy, stun: r.stun > 0, capeV: clamp(Math.abs(r.vx) / 300 + 0.25, 0, 1), arms: carrying ? 'up' : null, glow: carrying ? '#ffd25a' : null, kit: r.job === 'lift' ? 'strong' : 'stretch' });
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    K.pills(st);
    const timeX0 = K.counter(st, fmtTime(G.time), '★ ' + st.badge + ' / ' + st.totalBadge);
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play) return;
    const pl = plan(st), Tn = st.lift, Yn = st.str, T = st.run[Tn], Y = st.run[Yn];
    const kk = (id, what) => (K.quiet(id) ? '' : K.key(id, what) + ' ');
    {
      const bx = K.panel(Yn, 'stretchy', 236, 58, z), cy = bx.y + 29 * z, chh = 23 * z, cw = bx.w - 24 * z, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(Yn, 'act') + 'STRETCH', !!pl.str.act && Y.st !== 'span', Y.st === 'span', z);
    }
    {
      const bx = K.panel(Tn, 'strong hero', 236, 58, z), cy = bx.y + 29 * z, chh = 23 * z, cw = bx.w - 24 * z, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(Tn, 'act') + (st.bus.held ? 'SET DOWN' : 'LIFT BUS'), !!pl.lift.act, st.bus.held, z);
    }
    // the strain meter, on a cream card
    {
      const w = 160 * z, h = 10 * z, x = W / 2 - w / 2 + 30 * z, y = H - 30 * z, word = st.gold ? 'GOLD CABLE' : 'STRAIN';
      K.card(x - 84 * z, y - 10 * z, w + 96 * z, h + 20 * z, st.gold ? '#ffe14a' : K.PAPER);
      ctx.font = K.body(12 * z); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = K.INK; ctx.fillText(word, x - 8, y + h / 2 + 1);
      K.meter(x, y, w, h, st.gold ? 0 : st.strain, st.strain > 0.75 ? '#e8222e' : st.strain > 0.45 ? '#ffb02e' : '#2fc45a');
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
    const P = K.prompter(st), cx = st.cam.x;
    const sx = r => clamp(r.x - cx, 70, W - 70), sy = r => Math.min(r.y, GY) - (r.job === 'lift' && st.bus.held ? 112 : 46);
    {
      let s = null, col = C.gold, pulse = false;
      if (pl.stage === 'get') { s = pl.lift.act ? 'Lift the bus! ' + K.key(Tn, 'act') : 'To the bus ' + K.key(Tn, st.bus.x > T.x ? 'right' : 'left'); pulse = !!pl.lift.act; }
      else if (pl.lift.why === 'wire') { s = 'Wait for the wire!'; col = '#bff6ff'; }
      else if (pl.stage === 'cross') { s = 'Walk across ' + NAMES[Yn] + '! ' + K.key(Tn, 'right'); pulse = true; }
      else if (pl.stage === 'walk' || pl.stage === 'span') { s = Y.st === 'span' ? 'Cross now ' + K.key(Tn, 'right') : 'Wait for ' + NAMES[Yn] + ' to stretch'; col = Y.st === 'span' ? C.gold : '#ffe7a8'; }
      else if (pl.stage === 'end') { s = 'To the tower ' + K.key(Tn, 'right'); col = '#ffe7a8'; }
      if (T.st === 'run') P.say(Tn, s, sx(T), sy(T), col, pulse);
    }
    {
      let s = null, col = C.gold, pulse = false;
      if (Y.st === 'span') { s = pl.str.act ? 'Hold on! ' + K.key(Yn, 'act') : 'Let go to boing over!'; col = pl.str.act ? '#d9ffd0' : C.gold; pulse = !pl.str.act; }
      else if (pl.str.why === 'wire') { s = 'Wait for the wire!'; col = '#bff6ff'; }
      else if (pl.str.why === 'over') { s = pl.str.act ? 'Tap ' + K.key(Yn, 'act') + ' to boing over!' : 'To the edge ' + K.key(Yn, pl.str.x > Y.x ? 'right' : 'left'); pulse = !!pl.str.act; }
      else if (pl.stage === 'span') { s = 'Hold ' + K.key(Yn, 'act') + ' to stretch!'; pulse = true; }
      else if (pl.G && pl.stage !== 'end') { s = 'To the gap\'s edge ' + K.key(Yn, pl.str.x > Y.x ? 'right' : 'left'); col = '#ffe7a8'; }
      if (Y.st === 'run' || Y.st === 'span') P.say(Yn, s, Y.st === 'span' ? clamp((st.span.a + st.span.b) / 2 - cx, 70, W - 70) : sx(Y), Y.st === 'span' ? GY - 50 : sy(Y), col, pulse);
    }
  }

  MODES.bridge = {
    S, compile, plan, gaps,
    medals: { bronze: 'Get the buses across the bridge', goals: [
      { key: 'time', gold: S.goldT, silver: S.silverT },
      { key: 'bad', gold: 2, silver: 8, text: n => (n ? `${n} or fewer slips and zaps` : 'No slips and zaps'), gap: (v, n) => `${Math.max(1, Math.ceil(v - n))} fewer slips and zaps` },
      { key: 'badges', gold: 0.7, more: true, pct: true, word: 'the hero badges' },
    ] },
    medalValues() { const st = G.mst, s = st.stats; return s ? { bad: s.slips + s.zaps, badges: st.badge / (st.totalBadge || 1) } : {}; },
    setup(st, L) {
      st.stats = { lifts: 0, spans: 0, slips: 0, zaps: 0, helps: 0, roomT: [] };
      st.badge = 0; st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0;
      const def = LEVELS[G.levelIndex];
      st.totalBadge = (def.rooms || [def]).reduce((n, r) => n + compile(Object.assign({}, def, r)).badges.length, 0);
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; st.goldUsed = false; for (const row of L.grid) row.fill('.'); room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.c) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.c) drawTop(st); },
    hud() { const st = G.mst; if (st.c) hud(st); },
    printPage() { if (G.mst.c) K.page(); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const bad = s.slips + s.zaps;
      const out = [
        { label: 'Hero badges', value: st.badge + ' of ' + st.totalBadge },
        { label: 'Stretches', value: String(s.spans) },
        { label: 'Slips and zaps', value: String(bad) },
      ];
      out.push('Bus lifts: ' + s.lifts + '. Every passenger made it off the bridge!');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  const acts = y => ({ label: 'lift', labels: y === 0 ? ['stretch', 'lift'] : ['lift', 'stretch'] });
  HEROCITY.defs.bridge = {
    name: 'Bridge Collapse', world: 31, kind: 'team', mode: 'bridge', ownStep: true, ownHUD: true, ownPills: true, noFalls: true, roomWord: 'Stretch',
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> run <kbd>W</kbd> jump',
      bo: '<kbd>←</kbd><kbd>→</kbd> run <kbd>↑</kbd> jump',
      pad: 'stick runs, <span data-glyph="a"></span> jumps,',
    },
    tip: 'Save the bus! The stretchy hero holds the action at a gap to become a bridge; the strong hero lifts the bus and walks it over.',
    act: acts(0),
    map: K.stubMap(),
    rooms: [
      { title: 'Rush Hour', narr: 'THE BRIDGE IS BREAKING!', stretchy: 0, storm: 0.2, safe: 'TOWER 1', act: acts(0),
        tip: 'Pip stretches: hold the action at the edge of a gap. Bo taps the action at the bus to lift it, then walks over Pip!',
        course: ['r520', 'b', 'd', 'r200', 'd120', 'r120', 'G', 'g170', 'r260', 'd', 'r200', 'G', 'g200', 'r300', 'd140', 'r180', 'G', 'g150', 'r420'] },
      { title: 'The Middle Span', narr: 'HOLD IT TOGETHER!', stretchy: 1, storm: 0.35, safe: 'TOWER 2', act: acts(1),
        tip: 'Swap powers! Bo stretches, Pip carries. Cracked slabs fall soon after you step on them: keep moving!',
        course: ['r520', 'b', 'd', 'r180', 'G', 'g210', 'r220', 'c170', 'r200', 'd130', 'r140', 'G', 'g240', 'r260', 'd', 'r160', 'c160', 'r220', 'G', 'g190', 'r180', 'd140', 'r420'] },
      { title: 'Live Wires', narr: 'LOOK OUT, LIVE WIRES!', stretchy: 0, storm: 0.5, safe: 'TOWER 3', act: acts(0),
        tip: 'Snapped power wires lash down! Wait for the zap, then go. Pip stretches, Bo carries.',
        course: ['r520', 'b', 'd', 'r160', 'w', 'r200', 'G', 'g220', 'r260', 'w', 'r180', 'd140', 'r120', 'G', 'g260', 'r200', 'c170', 'r180', 'w', 'r200', 'G', 'g200', 'r160', 'w', 'r200', 'r420'] },
      { title: 'The Last Tower', narr: 'THE STORM HITS!', stretchy: 1, storm: 0.8, safe: 'SAFE!', act: acts(1),
        tip: 'The storm is here! Everything at once: gaps, cracks and wires. Bo stretches, Pip carries the bus home!',
        course: ['r520', 'b', 'd', 'r160', 'G', 'g230', 'r200', 'w', 'r160', 'c170', 'r200', 'd140', 'r120', 'G', 'g280', 'r220', 'w', 'r180', 'G', 'g210', 'r180', 'c160', 'r200', 'd', 'r140', 'w', 'r200', 'G', 'g250', 'r440'] },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.bridgeJump = function (p) { this.tone(p ? 330 : 392, 0.1, 'triangle', 0.035, p ? 520 : 620); };
  Sfx.extra.bridgeStretch = function () { this.tone(220, 0.3, 'sine', 0.04, 660); this.tone(330, 0.2, 'triangle', 0.02, 880, 0.1); };
  Sfx.extra.bridgeSnap = function () { this.tone(900, 0.06, 'square', 0.04, 200); this.tone(160, 0.3, 'sine', 0.05, 60, 0.04); };
  Sfx.extra.bridgeLift = function () { this.tone(140, 0.2, 'sawtooth', 0.03, 300); this.tone(400, 0.12, 'triangle', 0.03, 600, 0.15); };
  Sfx.extra.bridgeCrack = function () { this.tone(300, 0.05, 'square', 0.025, 120); this.tone(200, 0.06, 'square', 0.02, 90, 0.08); };
  Sfx.extra.bridgeCollapse = function () { this.tone(120, 0.6, 'sawtooth', 0.04, 40); this.tone(80, 0.5, 'square', 0.02, 40, 0.1); };
  Sfx.extra.bridgeCrackle = function () { for (let k = 0; k < 4; k++) this.tone(1400 + k * 300, 0.03, 'square', 0.012, 900, k * 0.07); };
  Sfx.extra.bridgeFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.055, null, i * 0.11)); };
})();
