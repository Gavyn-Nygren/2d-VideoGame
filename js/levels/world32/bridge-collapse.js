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
   MEDAL: Gold <= S.goldT with <= 2 slips+zaps and >= 70% of the badges; Silver <= S.silverT with <= 8.
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
    K.tickFx(st, dt);
    mirror(st);
  }
  function wires(st, dt) {
    for (const w of st.c.wires) {
      w.t += dt;
      if (w.ph === 'idle' && w.t >= S.wireIdle) { w.ph = 'warn'; w.t = 0; Sfx.play('bridgeCrackle'); }
      else if (w.ph === 'warn' && w.t >= S.wireWarn) { w.ph = 'hit'; w.t = 0; Sfx.play('cityZap'); }
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
      if (on && s.t === 0) { Sfx.play('bridgeCrack'); }
      if (on || s.t > 0) s.t += dt;
      if (s.t > 0 && Math.random() < 0.3) K.part(st, s.x0 + Math.random() * (s.x1 - s.x0), GY + 4, 0, 30 + Math.random() * 60, 0.8, 'rgba(160,150,140,0.8)', 3, 400, 'dust');
      if (s.t >= S.crumbleT) {
        s.gone = true; s.fall = 0;
        Sfx.play('bridgeCollapse'); G.shake = Math.max(G.shake || 0, 0.3);
        K.pop(st, (s.x0 + s.x1) / 2, GY - 90, 'It\'s falling!', '#ffd0c8', 24);
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

  /* ---------- drawing ---------- */
  const TOWER = 900;
  function draw(st) {
    const cx = st.cam.x, t = st.clock, storm = G.level.def.storm || 0.3;
    K.sky(cx, t, { mode: 'dusk', moonX: 700, moonY: 100, storm });
    // the far shore: the city across the river
    K.skyline(cx, t, { mode: 'dusk', base: 330, n: 2 });
    // the river, far below the deck: swells and spray
    const rg = ctx.createLinearGradient(0, 330, 0, H);
    rg.addColorStop(0, '#5a3a62'); rg.addColorStop(0.4, '#2a3a5e'); rg.addColorStop(1, '#14203e');
    ctx.fillStyle = rg; ctx.fillRect(0, 330, W, H - 330);
    ctx.strokeStyle = 'rgba(255,190,150,0.35)'; ctx.lineWidth = 2;
    for (let k = 0; k < 9; k++) {
      const y = 340 + k * 22, off = (t * (20 + k * 6) - cx * (0.2 + k * 0.05)) % 80;
      ctx.beginPath(); for (let x = -80 + off; x < W + 80; x += 80) { ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 20, y - 4, x + 40, y); } ctx.stroke();
    }
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, 0);
    // towers and main cables (behind the deck)
    const i0 = Math.floor((cx - 200) / TOWER), i1 = Math.ceil((cx + W + 200) / TOWER);
    for (let i = i0; i <= i1; i++) {
      const tx = i * TOWER + 300;
      // main cable from this tower to the next, sagging to the deck
      ctx.strokeStyle = '#a8343a'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(tx, 60); ctx.quadraticCurveTo(tx + TOWER / 2, GY + 60, tx + TOWER, 60); ctx.stroke();
      ctx.strokeStyle = '#d8545a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx, 58); ctx.quadraticCurveTo(tx + TOWER / 2, GY + 58, tx + TOWER, 58); ctx.stroke();
      // hangers (some snapped and dangling)
      for (let k = 1; k < 15; k++) {
        const hx = tx + k * TOWER / 15, u = k / 15, cy = 60 + (GY + 60 - 60) * 2 * u * (1 - u) * 2 * 0.5 + 0 * u;
        const cyy = (1 - u) * (1 - u) * 60 + 2 * u * (1 - u) * (GY + 60) + u * u * 60;
        void cy;
        const snapped = K.hash(i * 31 + k) < 0.3;
        ctx.strokeStyle = '#8a2a30'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(hx, cyy); ctx.lineTo(hx + (snapped ? Math.sin(t * 2 + k) * 8 : 0), snapped ? cyy + (GY - cyy) * 0.5 : GY - 4); ctx.stroke();
      }
      // the tower: two red legs with cross braces
      for (const lx of [tx - 22, tx + 22]) { ctx.fillStyle = '#a8343a'; ctx.fillRect(lx - 9, 40, 18, GY + 160); ctx.fillStyle = '#d8545a'; ctx.fillRect(lx - 9, 40, 5, GY + 160); }
      ctx.fillStyle = '#8a2a30'; for (const y of [70, 170, 280]) ctx.fillRect(tx - 31, y, 62, 12);
      ctx.fillStyle = Math.sin(t * 3 + i) > 0 ? '#ff4a4a' : '#7a1a1a'; circle(tx, 34, 5); ctx.fill();
    }
    // the deck: girders under the road, the road on top
    for (const s of st.c.segs) {
      if (s.x1 < cx - 60 || s.x0 > cx + W + 60) continue;
      if (s.gone) { if (s.fall < 1) { ctx.globalAlpha = 1 - s.fall; drawSlab(st, s, s.fall * 220, s.fall * 0.3, t); ctx.globalAlpha = 1; } continue; }
      drawSlab(st, s, 0, 0, t);
    }
    // the safe tower base at the end
    const ex = st.c.endX;
    ctx.fillStyle = '#5a5e6e'; ctx.fillRect(ex + 30, GY - 160, 200, 160);
    ctx.fillStyle = '#6e7284'; ctx.fillRect(ex + 30, GY - 160, 200, 12);
    ctx.fillStyle = '#2a8a4a'; rr(ex + 60, GY - 140, 140, 40, 6); ctx.fill();
    text(G.level.def.safe || 'SAFE', ex + 130, GY - 120, 18, '#ffffff', 'center');
    ctx.restore();
  }
  function drawSlab(st, s, dy, rot, t) {
    const w = s.x1 - s.x0;
    ctx.save(); ctx.translate((s.x0 + s.x1) / 2, GY + dy); ctx.rotate(rot);
    const x = -w / 2;
    // girder truss under the road
    ctx.fillStyle = '#4a4e5e'; ctx.fillRect(x, 10, w, 46);
    ctx.strokeStyle = '#33364a'; ctx.lineWidth = 4;
    ctx.beginPath(); for (let k = 0; k < w; k += 40) { ctx.moveTo(x + k, 12); ctx.lineTo(x + Math.min(w, k + 40), 54); ctx.moveTo(x + Math.min(w, k + 40), 12); ctx.lineTo(x + k, 54); } ctx.stroke();
    ctx.fillStyle = '#5c6072'; ctx.fillRect(x, 50, w, 8);
    // the road
    ctx.fillStyle = '#3a3c48'; ctx.fillRect(x, 0, w, 12);
    ctx.fillStyle = '#5a5c6a'; ctx.fillRect(x, -2, w, 4);
    ctx.fillStyle = '#ffd23a'; for (let k = 10; k < w - 20; k += 50) ctx.fillRect(x + k, 4, 24, 3);
    // railing at the back
    ctx.strokeStyle = '#8a8ea0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, -24); ctx.lineTo(x + w, -24); for (let k = 0; k <= w; k += 24) { ctx.moveTo(x + k, -24); ctx.lineTo(x + k, -2); } ctx.stroke();
    // broken ends: jagged rebar sticking out
    ctx.strokeStyle = '#7a6a5a'; ctx.lineWidth = 2;
    for (const [ex, d] of [[x, -1], [x + w, 1]]) { for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(ex, 4 + k * 12); ctx.lineTo(ex + d * (6 + K.hash(s.x0 + k + d) * 12), 2 + k * 12 + 4); ctx.stroke(); } }
    if (s.crack) {
      // a cracked slab: zig-zag cracks, worse as it goes
      const u = clamp(s.t / S.crumbleT, 0, 1), shake = u > 0 ? Math.sin(t * 50) * u * 2 : 0;
      ctx.translate(shake, 0);
      ctx.strokeStyle = 'rgba(20,16,20,0.85)'; ctx.lineWidth = 2;
      for (let k = 0; k < 3 + Math.floor(u * 4); k++) { const cx = x + (k + 0.5) * w / (3 + Math.floor(u * 4)); ctx.beginPath(); ctx.moveTo(cx, -1); ctx.lineTo(cx + 8, 10); ctx.lineTo(cx - 4, 22); ctx.lineTo(cx + 6, 40); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,90,60,' + (0.25 + 0.25 * Math.sin(t * 10)) + ')'; ctx.fillRect(x, -3, w, 3);
    }
    ctx.restore();
  }
  function drawWire(st, w, t) {
    const x = w.x + S.wireW / 2;
    // the snapped cable hangs from above, coiling; it lashes down when it hits
    const hit = w.ph === 'hit', warn = w.ph === 'warn', u = hit ? 1 : warn ? w.t / S.wireWarn : 0;
    const endY = hit ? GY - 6 : K.lerp(GY - 180, GY - 140, u) + Math.sin(t * 4 + x) * 8;
    ctx.strokeStyle = '#1c1c24'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x - 30, 40); ctx.quadraticCurveTo(x + 40 * Math.sin(t * 2 + x), (endY + 40) / 2, x, endY); ctx.stroke();
    if (warn || hit) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 22);
      ctx.fillStyle = 'rgba(160,230,255,' + (0.4 + 0.5 * pulse) + ')'; circle(x, endY, 8 + pulse * 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,60,50,' + (0.25 + 0.35 * u) + ')'; ctx.beginPath(); ctx.ellipse(x, GY + 1, S.wireW / 2 + 8, 6, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#bff6ff'; ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) { const a = t * 30 + k * 1.6; ctx.beginPath(); ctx.moveTo(x, endY); ctx.lineTo(x + Math.cos(a) * 18, endY + Math.sin(a) * 18); ctx.lineTo(x + Math.cos(a + 0.5) * 28, endY + Math.sin(a + 0.5) * 26); ctx.stroke(); }
    }
    if (hit) { ctx.fillStyle = 'rgba(190,240,255,0.5)'; ctx.fillRect(x - S.wireW / 2, GY - 60, S.wireW, 60); }
  }
  function drawBus(st, t) {
    const b = st.bus, held = b.held, x = b.x, y = b.y, w = S.busW, h = S.busH, sq = 1 - b.sq * 0.1;
    ctx.save(); ctx.translate(x, y); ctx.scale(1 + b.sq * 0.06, sq);
    if (held) ctx.rotate(Math.sin(t * 3) * 0.03);
    if (!held) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.55, 6, 0, 0, TAU); ctx.fill(); }
    const bot = held ? -6 : -10;
    ctx.fillStyle = '#ffb42a'; rr(-w / 2, bot - h, w, h, 10); ctx.fill();
    ctx.fillStyle = '#e8322a'; ctx.fillRect(-w / 2, bot - 18, w, 8);
    ctx.strokeStyle = '#b8761a'; ctx.lineWidth = 2; rr(-w / 2, bot - h, w, h, 10); ctx.stroke();
    // windows and passengers
    for (let k = 0; k < 5; k++) {
      const wx = -w / 2 + 8 + k * 22, wy = bot - h + 8;
      ctx.fillStyle = '#9fd8ff'; rr(wx, wy, 18, 20, 3); ctx.fill();
      const scared = held || st.span;
      ctx.fillStyle = ['#f2c8a0', '#c89070', '#f2d8b0', '#a87050', '#f2c8a0'][k];
      circle(wx + 9, wy + 14, 5.5); ctx.fill();
      ctx.fillStyle = '#1c1a1a'; circle(wx + 7, wy + 13, 1); ctx.fill(); circle(wx + 11, wy + 13, 1); ctx.fill();
      if (scared) { ctx.beginPath(); ctx.ellipse(wx + 9, wy + 17, 1.6, 2, 0, 0, TAU); ctx.fill(); }
      if (b.cheer > 0 && k % 2 === 0) { ctx.strokeStyle = '#f2c8a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx + 14, wy + 16); ctx.lineTo(wx + 16, wy + 4 + Math.sin(t * 14 + k) * 2); ctx.stroke(); }
    }
    ctx.fillStyle = '#1c2a4a'; ctx.fillRect(w / 2 - 8, bot - h + 8, 6, 24);
    text('CITY BUS', -10, bot - 14, 8, '#ffffff', 'center', 'body');
    ctx.fillStyle = '#fff6c0'; circle(w / 2 - 4, bot - 8, 3); ctx.fill();
    // wheels (dangling when lifted)
    for (const wx of [-w / 2 + 24, w / 2 - 24]) { ctx.fillStyle = '#1c1c22'; circle(wx, bot + (held ? 2 : 0), 9); ctx.fill(); ctx.fillStyle = '#8a8ea0'; circle(wx, bot + (held ? 2 : 0), 3.5); ctx.fill(); }
    ctx.restore();
    if (held && Math.sin(t * 2.2) > 0.6) { ctx.fillStyle = '#ffffff'; text(['Wheee!', 'Aaah!', 'Hold tight!', 'Go hero!'][Math.floor(t / 2.85) % 4], x - 30, y - h - 34, 13, '#ffffff', 'center', 'body'); }
  }
  function drawSpan(st, t) {
    const sp = st.span, Y = st.run[st.str];
    if (!sp) return;
    const id = Y.id, a = sp.a - 4, b = sp.b + 4, n = 20;
    const pts = [];
    for (let k = 0; k <= n; k++) { const x = K.lerp(a, b, k / n); pts.push([x, GY - 10 + sag(st, x) + Math.sin(t * 8 + k * 0.6) * (st.strain > 0.7 ? 1.5 : 0)]); }
    // a band in the hero's colour, darker outline, stretch marks
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = PDARK[id]; ctx.lineWidth = 20; ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    ctx.strokeStyle = st.gold ? C.gold : PCOL[id]; ctx.lineWidth = 15; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y - 4) : ctx.moveTo(x, y - 4))); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5;
    for (let k = 2; k < n - 1; k += 3) { const [x, y] = pts[k]; ctx.beginPath(); ctx.moveTo(x - 3, y - 6); ctx.lineTo(x + 3, y + 6); ctx.stroke(); }
    // boots at the near end, the head and hands at the far end
    const feetA = sp.feet === 'a', fx = feetA ? a : b, hx = feetA ? b : a, d = feetA ? 1 : -1;
    ctx.fillStyle = '#2a2040'; rr(fx - 8 - d * 4, GY - 12, 16, 10, 4); ctx.fill();
    ctx.fillStyle = PCOL[id]; ctx.strokeStyle = PDARK[id]; ctx.lineWidth = 2.5;
    circle(hx - d * 6, GY - 16, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = id === 0 ? '#2a1a3a' : '#1a2a4a'; ctx.fillRect(hx - d * 6 - 12, GY - 22, 24, 6);
    for (const ex of [-4, 4]) { ctx.fillStyle = '#ffffff'; circle(hx - d * 6 + ex + d * 2, GY - 19, 3); ctx.fill(); ctx.fillStyle = C.ink; circle(hx - d * 6 + ex + d * 3, GY - 19, 1.5); ctx.fill(); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx - d * 6 - 4, GY - 10); ctx.lineTo(hx - d * 6 + 4, GY - 10); ctx.stroke();
    ctx.fillStyle = PCOL[id]; circle(hx + d * 4, GY - 4, 5); ctx.fill(); circle(hx + d * 2, GY - 2, 5); ctx.fill();
    // the cape flutters from the middle
    const [mx, my] = pts[Math.floor(n / 2)];
    ctx.fillStyle = id === 0 ? '#d8283a' : '#ffd23a';
    ctx.beginPath(); ctx.moveTo(mx - 10, my - 6); ctx.quadraticCurveTo(mx - 20, my - 30 + Math.sin(t * 9) * 6, mx - 40, my - 26 + Math.sin(t * 9) * 8); ctx.lineTo(mx + 8, my - 6); ctx.fill();
    // strain shown on the span itself
    if (st.strain > 0.6 && !st.gold) { ctx.fillStyle = 'rgba(255,60,50,' + (st.strain - 0.6) * 1.5 * (0.6 + 0.4 * Math.sin(t * 20)) + ')'; for (const [x, y] of pts) { circle(x, y, 4); ctx.fill(); } }
  }
  function drawTop(st) {
    const cx = st.cam.x, t = st.clock;
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, 0);
    for (const w of st.c.wires) if (w.x > cx - 120 && w.x < cx + W + 120) drawWire(st, w, t);
    for (const q of st.c.badges) {
      if (q.got || q.x < cx - 40 || q.x > cx + W + 40) continue;
      const yy = q.y + Math.sin(t * 3 + q.x) * 4;
      ctx.fillStyle = 'rgba(255,224,138,0.3)'; circle(q.x, yy, 15); ctx.fill();
      ctx.fillStyle = '#ffd23a'; K.star(q.x, yy, 12, 5.5, Math.sin(t * 2 + q.x) * 0.2); ctx.fill();
      ctx.strokeStyle = '#b8862a'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    drawSpan(st, t);
    if (!st.bus.held) drawBus(st, t);
    for (const r of st.run) drawRunner(st, r, t);
    if (st.bus.held) drawBus(st, t);
    K.drawParts(st, cx);
    ctx.restore();
    // rain in a storm
    const storm = G.level.def.storm || 0.3;
    ctx.strokeStyle = 'rgba(200,210,255,' + 0.25 * storm + ')'; ctx.lineWidth = 1.2;
    ctx.beginPath(); for (let k = 0; k < 60 * storm; k++) { const x = (K.hash(k) * W + t * 300 + k * 37) % (W + 60) - 30, y = (K.hash(k + 9) * H + t * 900) % H; ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 16); } ctx.stroke();
    K.drawPops(st, cx, 0);
  }
  function drawRunner(st, r, t) {
    if (r.st === 'span') return;
    let sy = 1 - r.sq * 0.18, rot = 0;
    if (r.st === 'rescue') rot = Math.sin(r.rt * 20) * 0.4;
    else if (r.st === 'boing') rot = (r.rx1 > r.rx0 ? 1 : -1) * r.rt * 14;
    else if (!r.grounded) rot = r.face * clamp(r.vy / 2000, -0.15, 0.15);
    else if (Math.abs(r.vx) > 20) rot = r.face * 0.08;
    if (r.grounded) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(r.x, r.y, 13, 4, 0, 0, TAU); ctx.fill(); }
    const carrying = r.job === 'lift' && st.bus.held;
    if (r.st === 'rescue') {
      // the rubber arm reaching down to catch them
      const Y = st.run[st.str];
      ctx.strokeStyle = PDARK[Y.id]; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(r.rx1, GY - 6); ctx.quadraticCurveTo((r.x + r.rx1) / 2, r.y + 40, r.x, r.y - 20); ctx.stroke();
      ctx.strokeStyle = PCOL[Y.id]; ctx.lineWidth = 5; ctx.stroke();
    }
    K.suit(r.id, r.x, r.y, { face: r.face, rot, sy: carrying ? 0.86 : sy, sx: carrying ? 1.12 : 2 - sy, vy: r.grounded ? 0 : r.vy, stun: r.stun > 0, capeV: clamp(Math.abs(r.vx) / 300 + 0.25, 0, 1), arms: carrying ? 'up' : null, glow: carrying ? 'rgba(255,210,90,0.4)' : null });
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = '★ ' + st.badge + ' / ' + st.totalBadge;
      ctx.font = FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, cy, fs, '#ffe08a', 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play) return;
    const pl = plan(st), Tn = st.lift, Yn = st.str, T = st.run[Tn], Y = st.run[Yn];
    const kk = (id, what) => (K.quiet(id) ? '' : K.key(id, what) + ' ');
    {
      const bx = K.panel(Yn, 'stretchy', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = bx.w - 24 * z, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(Yn, 'act') + 'STRETCH', !!pl.str.act && Y.st !== 'span', Y.st === 'span', z);
    }
    {
      const bx = K.panel(Tn, 'strong hero', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = bx.w - 24 * z, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(Tn, 'act') + (st.bus.held ? 'SET DOWN' : 'LIFT BUS'), !!pl.lift.act, st.bus.held, z);
    }
    // the strain meter
    {
      const w = 160 * z, h = 10 * z, x = W / 2 - w / 2, y = H - 24 * z;
      text(st.gold ? 'Gold cable' : 'Strain', x - 8, y + h / 2, 12 * z, st.gold ? C.gold : '#ffd0c8', 'right', 'body');
      K.meter(x, y, w, h, st.gold ? 0 : st.strain, st.strain > 0.75 ? '#ff5a4a' : st.strain > 0.45 ? '#ffb04a' : '#8fe3b0');
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
  const medal = (t, bad, frac) => K.medal(t <= S.goldT && bad <= 2 && frac >= 0.7, t <= S.silverT && bad <= 8);

  MODES.bridge = {
    S, compile, plan, medal, gaps,
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
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const bad = s.slips + s.zaps, frac = st.badge / (st.totalBadge || 1);
      const out = [
        { label: 'Hero badges', value: st.badge + ' of ' + st.totalBadge },
        { label: 'Stretches', value: String(s.spans) },
        { label: 'Slips and zaps', value: String(bad) },
        { label: 'Medal', value: medal(G.time, bad, frac) },
      ];
      out.push('Bus lifts: ' + s.lifts + '. Every passenger made it off the bridge!');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  const acts = y => ({ label: 'lift', labels: y === 0 ? ['stretch', 'lift'] : ['lift', 'stretch'] });
  HEROCITY.defs.bridge = {
    name: 'Bridge Collapse', world: 31, kind: 'team', mode: 'bridge', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> run <kbd>W</kbd> jump',
      bo: '<kbd>←</kbd><kbd>→</kbd> run <kbd>↑</kbd> jump',
      pad: 'stick runs, <span data-glyph="a"></span> jumps,',
    },
    tip: 'Save the bus! The stretchy hero holds the action at a gap to become a bridge; the strong hero lifts the bus and walks it over.',
    act: acts(0),
    map: K.stubMap(),
    rooms: [
      { title: 'Rush Hour', stretchy: 0, storm: 0.2, safe: 'TOWER 1', act: acts(0),
        tip: 'Pip stretches: hold the action at the edge of a gap. Bo taps the action at the bus to lift it, then walks over Pip!',
        course: ['r520', 'b', 'd', 'r200', 'd120', 'r120', 'G', 'g170', 'r260', 'd', 'r200', 'G', 'g200', 'r300', 'd140', 'r180', 'G', 'g150', 'r420'] },
      { title: 'The Middle Span', stretchy: 1, storm: 0.35, safe: 'TOWER 2', act: acts(1),
        tip: 'Swap powers! Bo stretches, Pip carries. Cracked slabs fall soon after you step on them: keep moving!',
        course: ['r520', 'b', 'd', 'r180', 'G', 'g210', 'r220', 'c170', 'r200', 'd130', 'r140', 'G', 'g240', 'r260', 'd', 'r160', 'c160', 'r220', 'G', 'g190', 'r180', 'd140', 'r420'] },
      { title: 'Live Wires', stretchy: 0, storm: 0.5, safe: 'TOWER 3', act: acts(0),
        tip: 'Snapped power wires lash down! Wait for the zap, then go. Pip stretches, Bo carries.',
        course: ['r520', 'b', 'd', 'r160', 'w', 'r200', 'G', 'g220', 'r260', 'w', 'r180', 'd140', 'r120', 'G', 'g260', 'r200', 'c170', 'r180', 'w', 'r200', 'G', 'g200', 'r160', 'w', 'r200', 'r420'] },
      { title: 'The Last Tower', stretchy: 1, storm: 0.8, safe: 'SAFE!', act: acts(1),
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
