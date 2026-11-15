/* Pip & Bo - Level 31-3 Bird Attack Dash (team, World 31 Shrunk in the Backyard). */
'use strict';

/* ===== 31-3 Bird Attack Dash (mode 'birddash', team, scrolls right, Gavyn's pick) =====
   Gavyn's pick: "a hungry robin hunts you across the lawn. Dive between hiding spots while one player watches the sky
   and warns when the bird swoops."
   Side view of the open lawn at bug size; the camera follows Pip and Bo to the right. The mode owns the tick, the camera
   and the picture (def.ownStep + ownHUD + noFalls); the engine grid is only spawns.
   A ROBIN as big as a house circles high above, off the top of the screen. Every few seconds it picks out whoever is
     out in the open, stares, tucks its wings and DIVES. It steers after its target for most of the dive, so you can't
     outrun it: get under cover. Under a hiding spot (a leaf, a flowerpot, a toadstool, a cup, a clover; a closed-eye
     badge marks each) you are safe: the robin pecks the cover ("THUNK!") and flies off. Caught in the open:
     "SNATCHED!" The robin carries you up and drops you back at the last hiding spot you both reached (counted, soft fail).
   THE WATCHER lies down and HOLDS ▼ to look up at the sky: the spyglass circle at the top of the screen then shows the
     robin (you can't move while looking, so look from under cover). When the robin stares down at someone, press the
     action ('warn'): "LOOK OUT!" and its strike spot shows on the ground at once (about 2 s of warning). A warn while it
     is only circling is a "False alarm" (no warning for 1.2 s). With no warn, the strike spot shows only when the dive
     starts (about 0.9 s), and that is usually too late.
   THE DASHER runs ahead from cover to cover. The action ('dive') is a quick dive-roll (0.32 s at 1.7x speed, 1 s rest).
   BOTH run ◀ ▶ and jump ▲ over twigs and little stones. Sunflower seeds lie in the open (49 in all): worth the risk?
   If both are hidden when it stares, the robin can't see anyone and climbs back up (you can see it go: that's the
     moment to run). STRETCHES (jobs swap each stretch): Open Lawn (Pip watches), Clover Patch (Bo), The Flower Bed (Pip;
     quicker robin), The Bird Bath (Bo; quickest robin, and it sometimes stares then looks away). Each ends at a safe spot.
   GOLD HELP (only while both are playing, announced, counted): snatched twice in one stretch = the gold pinwheel: every
     strike spot shows the moment the robin stares, without a warn, for the rest of the stretch.
   IDLE: no person presses anything for 12 s: "Taking a break", the robin waits and the clock stops.
   MEDAL goals (MODES.birddash.medals, js/medals.js): Gold <= S.goldT, snatched <= 1, >= 70% of the seeds;
   Silver <= S.silverT, snatched <= 5.
   MODES.birddash.plan(st) says what each job should do now; the prompts, HUD chips and computer brain read it.
   Everything lives inside this block; sounds are Sfx.extra.birddash*. */
(() => {
  const K = SHRUNK, TAU = Math.PI * 2, FONT = K.FONT;
  const S = {
    ground: 440, runV: 240, acc: 2200, jumpV: 470, g: 1700, bw: 22, bh: 26, diveT: 0.32, diveV: 1.7, diveCd: 1.0,
    leash: 620, eyeT: 1.0, tuckT: 0.6, riseT: 1.3, strikeR: 46, homing: 0.6, homeV: 320, falseT: 1.2, snatchT: 1.6,
    seedR: 20, idleWait: 12, goldT: 180, silverT: 360,
  };
  const GY = S.ground;
  const ROOMS = [
    { circle: [3.4, 4.8], dive: 1.0, feint: 0 },
    { circle: [3.0, 4.4], dive: 0.95, feint: 0 },
    { circle: [2.6, 4.0], dive: 0.9, feint: 0 },
    { circle: [2.3, 3.6], dive: 0.85, feint: 0.25 },
  ];

  /* ---------- the course ----------
     tokens: 'r200' open lawn; 'H100:leaf' a hiding spot 100 wide (leaf | pot | mush | cup | clover); 's' a seed here,
     'S' three seeds; 'l34:44' a twig or stone to jump (34 tall, 44 wide). */
  function compile(def) {
    const c = { covers: [], lows: [], seeds: [], endX: 0 };
    let x = 120;
    c.covers.push({ x: 40, w: 150, kind: 'leaf', i: 0 });
    x = 190;
    for (const tok of def.course) {
      const k = tok[0], a = tok.slice(1).split(':');
      if (k === 'r') x += +a[0];
      else if (k === 'H') { c.covers.push({ x, w: +a[0], kind: a[1] || 'leaf', i: c.covers.length, pecked: 0 }); x += +a[0]; }
      else if (k === 's') c.seeds.push({ x, got: false, t: 0 });
      else if (k === 'S') for (let i = 0; i < 3; i++) c.seeds.push({ x: x + i * 30, got: false, t: 0 });
      else if (k === 'l') { c.lows.push({ x, w: +a[1] || 44, h: +a[0] || 34, seed: x }); x += +a[1] || 44; }
    }
    c.endX = x + 120;
    c.covers.push({ x: c.endX, w: 600, kind: 'end', i: c.covers.length });
    return c;
  }
  const coverAt = (st, x) => st.c.covers.find(q => x > q.x + 8 && x < q.x + q.w - 8) || null;
  const hidden = (st, r) => r.st !== 'snatched' && !!coverAt(st, r.x);

  /* ---------- a stretch (one room) ---------- */
  const newRunner = (id, x) => ({ id, x, y: GY, vx: 0, vy: 0, face: 1, grounded: true, on: null, st: 'run', t: 0, dive: 0, diveCd: 0, sq: 0, look: false, cov: 0 });
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.wat = def.watcher || 0; st.dash = 1 - st.wat; st.title = def.title || '';
    st.c = compile(def); st.rp = ROOMS[k] || ROOMS[0];
    st.run = [0, 1].map(id => newRunner(id, 80 + (id === st.dash ? 60 : 0)));
    st.cp = 0; st.seenSky = -9;
    st.bird = { ph: 'circle', t: 0, dur: 3.5, tg: -1, x: 0, sx: 0, warned: false, shown: false, falseT: 0, seen: 0, feint: false, carry: -1, bx: 0, by: -200, flap: 0 };
    st.rc = { snatched: 0 }; st.gold = false;
    st.state = 'go'; st.endT = 0; st.party = false; st.cleared = false; st.lastRoom = false;
    st.segStart = G.time; st.clock = st.clock || 0;
    st.cam = { x: 0 };
    K.fx(st); labels(st); mirror(st);
  }
  function labels(st) { const w = []; w[st.wat] = 'warn'; w[st.dash] = 'dive'; K.actLabels(w, 'warn'); }

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.c) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    if (!st.waiting) st.clock += dt;
    for (const r of st.run) runner(st, r, dt, live);
    if (st.run[st.wat].look) st.seenSky = st.clock;
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    if (live) { leash(st); seeds(st); checkpoint(st); goal(st); }
    if (!st.waiting && st.state === 'go' && G.introT <= 0) bird(st, dt);
    else if (st.state === 'end') st.bird.by -= dt * 300;
    if (st.state === 'end') endStep(st, dt);
    for (const q of st.c.covers) if (q.pecked > 0) q.pecked -= dt;
    cam(st, dt);
    K.tickFx(st, dt);
    mirror(st);
  }
  function runner(st, r, dt, live) {
    r.t += dt;
    if (r.sq > 0) r.sq = Math.max(0, r.sq - dt * 4);
    if (r.diveCd > 0) r.diveCd -= dt;
    if (r.st === 'snatched') return;
    const p = G.players[r.id], i = live ? p.input : NO_INPUT, jump = live && p.pendingJump, act = live && p.pendingAct;
    const job = r.id === st.wat ? 'watch' : 'dash', b = st.bird;
    // the watcher lies back and looks at the sky
    r.look = job === 'watch' && !!i.down && r.grounded;
    if (r.look) {
      r.vx = 0;
      if (act) warn(st, r);
      return;
    }
    if (job === 'watch' && act) K.hint(st, r.id, 'Hold ' + K.key(r.id, 'down') + ' to look up first');
    if (job === 'dash' && i.down) K.hintOnce(st, 'dashDown', r.id, NAMES[st.wat] + ' watches the sky. You run!');
    // the dasher's dive-roll
    if (job === 'dash' && act && r.dive <= 0 && r.diveCd <= 0 && r.grounded) {
      const want = (i.right ? 1 : 0) - (i.left ? 1 : 0) || r.face;
      r.face = want; r.dive = S.diveT; r.diveCd = S.diveCd; Sfx.play('birddashRoll'); K.dust(st, r.x, GY, null, 6); st.stats.rolls++;
    }
    const want = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    if (r.dive > 0) { r.dive -= dt; r.vx = r.face * S.runV * S.diveV; }
    else {
      if (want) r.face = want;
      if (r.grounded || want) r.vx = approach(r.vx, want * S.runV, (r.grounded ? S.acc : S.acc * 0.6) * dt);
    }
    if (jump && r.grounded && r.dive <= 0) { r.vy = -S.jumpV; r.grounded = false; r.on = null; Sfx.play('birddashJump', r.id); }
    // move against the little things (they are boxes)
    const hw = S.bw / 2;
    let nx = r.x + r.vx * dt;
    for (const q of st.c.lows) {
      if (r.y <= GY - q.h + 0.5) continue;
      if (nx + hw > q.x && nx - hw < q.x + q.w) { nx = r.x <= q.x + q.w / 2 ? Math.min(nx, q.x - hw) : Math.max(nx, q.x + q.w + hw); r.vx = 0; r.dive = 0; }
    }
    r.x = Math.max(20, nx);
    if (r.grounded) { if (r.on && (r.x - hw > r.on.x + r.on.w || r.x + hw < r.on.x)) { r.grounded = false; r.on = null; } else return; }
    r.vy += S.g * dt;
    const ny = r.y + r.vy * dt;
    if (r.vy >= 0) {
      for (const q of st.c.lows) {
        const ty = GY - q.h;
        if (r.y <= ty + 0.5 && ny >= ty && r.x + hw > q.x + 2 && r.x - hw < q.x + q.w - 2) { r.y = ty; r.vy = 0; r.grounded = true; r.on = q; return; }
      }
      if (ny >= GY) { r.y = GY; r.vy = 0; r.grounded = true; r.on = null; r.sq = 0.6; return; }
    }
    r.y = ny;
  }
  function warn(st, r) {
    const b = st.bird;
    if (b.falseT > 0) return;
    if ((b.ph === 'eye' || b.ph === 'tuck') && !b.feint) {
      if (!b.warned) {
        b.warned = true; b.shown = true; st.stats.warns++;
        Sfx.play('birddashWarn'); K.pop(st, r.x, r.y - 70, 'LOOK OUT!', '#ffd84a', 26);
        const T = st.run[b.tg];
        if (T && T.id !== r.id && !hidden(st, T)) K.hint(st, T.id, 'Hide! Under cover!', 1.6);
      }
    } else if (b.ph === 'eye' && b.feint) {
      b.warned = true; Sfx.play('birddashWarn'); K.pop(st, r.x, r.y - 70, 'LOOK OUT!', '#ffd84a', 24);
    } else if (b.ph === 'circle' || b.ph === 'rise') {
      b.falseT = S.falseT; Sfx.play('birddashFalse'); K.pop(st, r.x, r.y - 70, 'False alarm!', '#ffffff', 20); st.stats.falses++;
    }
  }
  function leash(st) {
    const [a, b] = st.run, front = a.x > b.x ? a : b, back = front === a ? b : a;
    if (back.st === 'snatched' || front.st === 'snatched') return;
    if (front.x - back.x > S.leash) { front.x = back.x + S.leash; front.vx = Math.min(front.vx, 0); front.dive = 0; K.hintOnce(st, 'leash' + front.id + st.k, front.id, 'Wait for ' + NAMES[back.id] + '!'); }
  }
  function seeds(st) {
    for (const r of st.run) {
      if (r.st === 'snatched' || r.y < GY - 40) continue;
      for (const q of st.c.seeds) {
        if (q.got || Math.abs(q.x - r.x) > S.seedR) continue;
        q.got = true; q.t = 0.4; st.seeds++;
        Sfx.play('shrunkPop', 1 + (st.seeds % 5) * 0.06); K.spark(st, q.x, GY - 10, 5, ['#ffffff', '#ffe680']);
      }
    }
  }
  // the last hiding spot both have reached (where a snatched player is dropped)
  function checkpoint(st) {
    for (const r of st.run) { const q = coverAt(st, r.x); if (q) r.cov = Math.max(r.cov, q.i); }
    st.cp = Math.min(st.run[0].cov, st.run[1].cov);
  }
  function goal(st) {
    const c = st.c;
    if (!st.run.every(r => r.st === 'run' && r.grounded && r.x >= c.endX + 20)) return;
    const last = !(G.level.def.rooms && G.level.def.roomIndex < G.level.def.roomCount - 1);
    st.state = 'end'; st.endT = 0; st.lastRoom = last;
    st.stats.roomT[st.k] = G.time - st.segStart;
    Sfx.play('shrunkCheer');
    K.pop(st, c.endX + 120, GY - 200, last ? 'Safe under the hedge! The robin gives up!' : (G.level.def.safe || 'Safe!') + ' Swap jobs!', '#ffffff', 26);
    for (const r of st.run) { r.vx = 0; r.look = false; }
  }
  function endStep(st, dt) {
    st.endT += dt;
    if (st.lastRoom) {
      if (st.endT > 0.7 && !st.party) { st.party = true; Sfx.play('birddashFanfare'); K.confetti(st, st.c.endX + 100, GY - 200, 50); }
      if (st.endT > 2.6 && !st.cleared) { st.cleared = true; G.level.goal = { x: st.c.endX + 100 - st.cam.x, y: GY - 80 }; levelClear(); }
    } else if (st.endT > 2.0) nextRoom();
  }

  /* ---------- the robin ----------
     circle (2.3-4.8 s) -> eye (1.0 s: it stares at whoever is most in the open; if nobody is, it climbs back: rise) ->
     tuck (0.6 s) -> dive (0.85-1.0 s, steering after its target for the first 60%) -> strike -> rise (1.3 s) -> circle */
  function bird(st, dt) {
    const b = st.bird;
    b.t += dt; b.flap += dt;
    if (b.falseT > 0) b.falseT -= dt;
    const exposed = st.run.filter(r => r.st === 'run' && !hidden(st, r) && r.x < st.c.endX);
    if (b.ph === 'circle') {
      if (b.t >= b.dur) { b.ph = 'eye'; b.t = 0; b.warned = false; b.shown = st.gold; b.feint = Math.random() < st.rp.feint; Sfx.play('shrunkChirp'); }
    } else if (b.ph === 'eye') {
      // it picks whoever is farthest from cover (a person who just ducked in still counts as hidden)
      let tg = -1, best = -1;
      for (const r of exposed) { const d = distToCover(st, r.x); if (d > best) { best = d; tg = r.id; } }
      if (tg >= 0) b.tg = tg;
      if (b.t >= S.eyeT) {
        if (b.feint) { b.ph = 'rise'; b.t = 0; K.msg(st, 'The robin looks away... phew!', '#ffffff', 2.2); }
        else if (b.tg < 0 || !exposed.length) { b.ph = 'rise'; b.t = 0; b.tg = -1; Sfx.play('birddashHuff'); }
        else { b.ph = 'tuck'; b.t = 0; const T = st.run[b.tg]; b.x = T.x; }
      }
    } else if (b.ph === 'tuck') {
      if (b.tg >= 0 && st.run[b.tg].st === 'run') b.x = st.run[b.tg].x;
      if (b.t >= S.tuckT) {
        b.ph = 'dive'; b.t = 0; b.shown = true; Sfx.play('birddashScreech');
        b.sx = b.x - 420; b.dur = st.rp.dive;
      }
    } else if (b.ph === 'dive') {
      const u = b.t / b.dur, T = b.tg >= 0 ? st.run[b.tg] : null;
      if (u < S.homing && T && T.st === 'run') b.x = approach(b.x, T.x, S.homeV * dt);
      b.bx = K.lerp(b.sx, b.x, u); b.by = K.lerp(-260, GY - 40, u * u);
      if (b.t >= b.dur) strike(st);
    } else if (b.ph === 'snatch') {
      b.bx += 140 * dt; b.by -= 420 * dt;
      const T = st.run[b.carry];
      if (T) { T.x = b.bx; T.y = b.by + 70; }
      if (b.t >= S.snatchT) drop(st);
    } else if (b.ph === 'rise') {
      b.bx += 160 * dt; b.by -= 360 * dt;
      if (b.t >= S.riseT) { b.ph = 'circle'; b.t = 0; b.dur = st.rp.circle[0] + Math.random() * (st.rp.circle[1] - st.rp.circle[0]); b.seen = st.clock; b.tg = -1; }
    }
  }
  function distToCover(st, x) {
    let best = 1e9;
    for (const q of st.c.covers) best = Math.min(best, Math.abs(x - clamp(x, q.x + 10, q.x + q.w - 10)));
    return best;
  }
  function strike(st) {
    const b = st.bird;
    const hit = st.run.find(r => r.st === 'run' && Math.abs(r.x - b.x) < S.strikeR && !hidden(st, r));
    G.shake = Math.max(G.shake || 0, 0.25);
    if (hit) {
      b.ph = 'snatch'; b.t = 0; b.carry = hit.id; hit.st = 'snatched'; hit.look = false; hit.vx = 0;
      st.stats.snatched++; st.rc.snatched++;
      Sfx.play('birddashSnatch'); Sfx.play('shrunkSquee');
      K.pop(st, b.x, GY - 180, 'SNATCHED!', '#ff7a5a', 34);
      for (let k = 0; k < 10; k++) K.part(st, b.x, GY - 30, (Math.random() - 0.5) * 300, -100 - Math.random() * 200, 1.2, k % 2 ? '#a0603a' : '#e8803a', 5, 300, 'leaf');
    } else {
      const q = coverAt(st, b.x);
      if (q) { q.pecked = 0.5; Sfx.play('birddashThunk'); K.pop(st, b.x, GY - 120, 'THUNK!', '#ffffff', 28); st.stats.dodged++; }
      else { Sfx.play('birddashThunk'); K.pop(st, b.x, GY - 100, 'Missed!', '#ffffff', 24); st.stats.dodged++; }
      K.dust(st, b.x, GY, null, 12);
      b.ph = 'rise'; b.t = 0;
    }
  }
  function drop(st) {
    const b = st.bird, r = st.run[b.carry], q = st.c.covers[st.cp] || st.c.covers[0];
    r.st = 'run'; r.x = q.x + q.w / 2 + (r.id === st.dash ? 14 : -14); r.y = GY - 160; r.vy = 0; r.grounded = false; r.on = null; r.sq = 1;
    b.carry = -1; b.ph = 'circle'; b.t = 0; b.dur = st.rp.circle[1] + 1; b.seen = st.clock; b.by = -300;
    Sfx.play('shrunkThud');
    K.msg(st, NAMES[r.id] + ' was dropped back at the last hiding spot!', '#ffffff', 3);
    if (st.rc.snatched >= 2 && !st.gold && K.both(st)) { st.gold = true; K.goldHelp(st, 'Gold pinwheel! Strike spots show as soon as the robin stares'); }
  }

  /* ---------- the camera ---------- */
  function cam(st, dt) {
    const rs = st.run.filter(r => r.st === 'run'), xs = rs.length ? rs.map(r => r.x) : st.run.map(r => r.x);
    const mid = (Math.min(...xs) + Math.max(...xs)) / 2, lead = Math.max(...xs);
    const want = clamp(Math.max(mid - W * 0.42, lead - W + 140), 0, st.c.endX + 360 - W);
    st.cam.x = K.lerp(st.cam.x, want, Math.min(1, dt * 5));
  }
  function mirror(st) { for (const r of st.run) K.place(r.id, r.x - st.cam.x, clamp(r.y, 60, GY)); }

  /* ---------- what to do next ----------
     plan(st): { phase (the robin's), danger (a strike spot is showing), strikeX, cut (seconds to impact, or Infinity),
       wat: { x, look, warn, why }, dash: { x, dive, why } }. "Safe to run" means the robin just climbed away (seen within
       0.8 s and its circling has just started) or the watcher is looking and it is still circling. */
  function nextCover(st, r) {
    const here = coverAt(st, r.x);
    return st.c.covers.find(q => q.x > r.x + 8 && (!here || q.i > here.i)) || st.c.covers[st.c.covers.length - 1];
  }
  function plan(st) {
    const b = st.bird, W0 = st.run[st.wat], D = st.run[st.dash];
    const watching = W0.look, visible = watching || b.ph === 'rise' || b.ph === 'dive' || b.ph === 'snatch';
    const danger = b.shown && (b.ph === 'eye' || b.ph === 'tuck' || b.ph === 'dive');
    const left = b.ph === 'eye' ? S.eyeT - b.t + S.tuckT + st.rp.dive : b.ph === 'tuck' ? S.tuckT - b.t + st.rp.dive : b.ph === 'dive' ? b.dur - b.t : Infinity;
    const fresh = b.ph === 'circle' && st.clock - b.seen < 0.8;
    // what the spyglass showed stays known for a moment after the watcher gets up (otherwise the plan flips between
    // "the sky is clear, go" and "nobody is looking, wait" on every step and the watcher twitches instead of running)
    const knows = watching || st.clock - (st.seenSky == null ? -9 : st.seenSky) < 1.5;
    const clearSky = (knows && b.ph === 'circle') || fresh || b.ph === 'rise' || b.ph === 'snatch';
    const out = { phase: b.ph, danger, strikeX: b.x, left, watching, visible, clearSky, wat: {}, dash: {} };
    const plan1 = (r, mate) => {
      const o = { x: r.x, why: 'wait' }, here = coverAt(st, r.x), nc = nextCover(st, r);
      if (r.st !== 'run') return o;
      if (danger && !here) {
        // run for the nearest cover we can reach in time
        let best = null, bt = 1e9;
        for (const q of st.c.covers) { const tx = clamp(r.x, q.x + 18, q.x + q.w - 18), d = Math.abs(tx - r.x); if (d < bt) { bt = d; best = tx; } }
        o.x = best; o.why = 'hide'; o.dive = bt > 70 && bt < S.runV * S.diveV * S.diveT + 40; return o;
      }
      if (danger && here) { o.x = clamp(r.x, here.x + 18, here.x + here.w - 18); o.why = 'stay'; return o; }
      // between covers in the open (no warning): keep going to the next cover
      if (!here) { o.x = nc.x + Math.min(nc.w / 2, 40); o.why = 'run'; return o; }
      // in cover: go when the sky is clear and the next cover is close enough to make it
      const dist = nc.x + Math.min(nc.w / 2, 40) - r.x, need = dist / S.runV + 0.4;
      const timeLeft = b.ph === 'circle' ? (fresh ? b.dur - b.t : knows ? Math.max(0, b.dur - b.t) : 0) + S.eyeT + S.tuckT + st.rp.dive : b.ph === 'rise' ? S.riseT - b.t + 2 + S.eyeT : 0;
      if (clearSky && need < timeLeft) { o.x = nc.x + Math.min(nc.w / 2, 40); o.why = 'go'; }
      else o.why = 'wait';
      return o;
    };
    out.dash = plan1(D, W0);
    out.wat = plan1(W0, D);
    // the watcher: look from cover whenever not moving on; warn as soon as the robin stares
    const wHere = coverAt(st, W0.x);
    out.wat.look = W0.st === 'run' && (out.wat.why === 'wait' || out.wat.why === 'stay') && !!wHere && W0.x < st.c.endX;
    out.wat.warn = watching && (b.ph === 'eye' || b.ph === 'tuck') && !b.warned && !b.feint && b.falseT <= 0;
    // the watcher doesn't run on ahead of the dasher
    if (out.wat.why === 'go' && W0.x > D.x - 40 && D.x < st.c.endX) { out.wat.why = 'wait'; out.wat.x = W0.x; out.wat.look = !!wHere; }
    // the dasher waits for the watcher if it is far ahead
    if (out.dash.why === 'go' && D.x - W0.x > 420) { out.dash.why = 'wait'; out.dash.x = D.x; }
    return out;
  }

  /* ---------- drawing ---------- */
  function draw(st) {
    const cx = st.cam.x, t = st.clock, c = st.c, b = st.bird;
    K.sky(cx, t, { dim: b.ph === 'dive' ? 0.25 : 0 });
    K.farGrass(cx, { y: 420, n: 18 });
    // the lawn here is short (just mowed): stubby blades and clover heads behind
    const par = 0.6, step = 120, sx = cx * par;
    for (let i = Math.floor(sx / step) - 2; i <= Math.ceil((sx + W) / step) + 2; i++) {
      const x = i * step - sx + (K.hash(i + 50) - 0.5) * 60;
      if (K.hash(i + 51) < 0.3) K.clover(x, GY + 6, 1.1 + K.hash(i) * 0.4, t);
      else K.blade(x, GY + 6, 90 + K.hash(i + 52) * 60, (K.hash(i + 53) - 0.5) * 40, { w: 18, col: 'rgba(100,176,80,0.85)', dark: false });
    }
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, 0);
    K.soil(cx - 20, cx + W + 20, GY);
    // the robin's shadow and strike spot
    if (b.shown && (b.ph === 'eye' || b.ph === 'tuck' || b.ph === 'dive')) {
      const u = b.ph === 'dive' ? b.t / b.dur : 0, a = 0.35 + 0.4 * u;
      ctx.fillStyle = 'rgba(30,20,20,' + a * 0.5 + ')'; ctx.beginPath(); ctx.ellipse(b.x, GY + 2, S.strikeR + 30 * (1 - u), 9, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,60,40,' + (0.6 + 0.4 * Math.sin(t * 18)) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(b.x, GY + 2, S.strikeR, 8, 0, 0, TAU); ctx.stroke();
      text('▼', b.x, GY - 30 - Math.abs(Math.sin(t * 8)) * 8, 22, '#ff5a4a', 'center');
    }
    for (const q of c.lows) { if (q.x > cx + W + 60 || q.x + q.w < cx - 60) continue; if (K.hash(q.seed) < 0.5) K.twig(q.x, GY + 1, q.w, q.h); else K.pebble(q.x + q.w / 2, GY + 1, q.w, q.h, { seed: q.seed }); }
    for (const q of c.seeds) if (!q.got && q.x > cx - 40 && q.x < cx + W + 40) K.seed(q.x, GY - 6, 8, 0.2 + K.hash(q.x) * 0.5);
    for (const q of c.covers) if (q.x < cx + W + 200 && q.x + q.w > cx - 200) drawCoverBack(q, t);
    ctx.restore();
  }
  // the back half of a hiding spot (drawn before the players), and its roof (after)
  function drawCoverBack(q, t) {
    if (q.kind === 'pot') { ctx.fillStyle = '#7a3a1e'; rr(q.x + 6, GY - 92, q.w - 12, 92, 8); ctx.fill(); }
    else if (q.kind === 'cup') { ctx.fillStyle = '#c8d8e8'; rr(q.x + 6, GY - 80, q.w - 12, 80, 6); ctx.fill(); }
    else if (q.kind === 'end') {
      // the hedge: a dark green wall of leaves
      ctx.fillStyle = '#2e6a2a'; rr(q.x, GY - 420, q.w + 400, 430, 60); ctx.fill();
      for (let k = 0; k < 30; k++) { ctx.fillStyle = k % 2 ? '#3a8034' : '#29602a'; ctx.beginPath(); ctx.ellipse(q.x + 30 + K.hash(k) * (q.w + 300), GY - 40 - K.hash(k + 9) * 360, 40, 22, K.hash(k + 4) * 3, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#152e14'; ctx.beginPath(); ctx.ellipse(q.x + 140, GY, 110, 120, 0, Math.PI, 0); ctx.fill();
    }
  }
  function drawCoverFront(st, q, t) {
    const pk = q.pecked > 0 ? Math.sin(q.pecked * 40) * 3 : 0, x = q.x + pk, w = q.w;
    if (q.kind === 'leaf') {
      ctx.fillStyle = '#c8a040'; ctx.strokeStyle = '#8a6420'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x - 6, GY + 2); ctx.quadraticCurveTo(x + w * 0.2, GY - 96, x + w * 0.55, GY - 84); ctx.quadraticCurveTo(x + w + 10, GY - 60, x + w + 6, GY + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,80,20,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 4, GY); ctx.quadraticCurveTo(x + w * 0.4, GY - 70, x + w - 4, GY - 40); ctx.stroke();
      ctx.fillStyle = 'rgba(40,24,8,0.55)'; ctx.beginPath(); ctx.ellipse(x + w / 2, GY - 6, w * 0.34, 28, 0, Math.PI, 0); ctx.fill();
    } else if (q.kind === 'pot') {
      ctx.fillStyle = '#c8643a'; ctx.beginPath(); ctx.moveTo(x, GY + 2); ctx.lineTo(x + 12, GY - 100); ctx.lineTo(x + w - 12, GY - 100); ctx.lineTo(x + w, GY + 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e07a4a'; ctx.fillRect(x - 4, GY - 18, w + 8, 20);
      ctx.fillStyle = 'rgba(40,20,10,0.6)'; ctx.beginPath(); ctx.ellipse(x + w / 2, GY - 2, w * 0.28, 30, 0, Math.PI, 0); ctx.fill();
    } else if (q.kind === 'mush') {
      ctx.fillStyle = '#f2e8d0'; rr(x + w / 2 - 12, GY - 60, 24, 62, 8); ctx.fill();
      ctx.fillStyle = '#e0473a'; ctx.beginPath(); ctx.moveTo(x - 8, GY - 56); ctx.quadraticCurveTo(x + w / 2, GY - 150, x + w + 8, GY - 56); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; for (const [dx, dy, r] of [[0.25, -80, 8], [0.55, -104, 10], [0.78, -74, 7]]) { circle(x + w * dx, GY + dy, r); ctx.fill(); }
      ctx.fillStyle = 'rgba(30,20,10,0.25)'; ctx.fillRect(x, GY - 56, w, 6);
    } else if (q.kind === 'cup') {
      ctx.fillStyle = '#f0f6ff'; ctx.strokeStyle = '#a8b8c8'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x, GY + 2); ctx.lineTo(x + 10, GY - 90); ctx.lineTo(x + w - 10, GY - 90); ctx.lineTo(x + w, GY + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5b95ff'; ctx.fillRect(x + 6, GY - 60, w - 12, 10);
      ctx.fillStyle = 'rgba(30,40,60,0.5)'; ctx.beginPath(); ctx.ellipse(x + w / 2, GY - 2, w * 0.26, 26, 0, Math.PI, 0); ctx.fill();
    } else if (q.kind === 'clover') {
      for (let k = 0; k < 3; k++) K.clover(x + w * (0.2 + k * 0.3), GY + 4, 1.25, t);
      ctx.fillStyle = 'rgba(40,120,40,0.75)'; ctx.beginPath(); ctx.ellipse(x + w / 2, GY - 40, w * 0.55, 44, 0, 0, TAU); ctx.fill();
    } else return;
    // the "hidden here" badge: a closed eye
    const bx = x + w / 2, by = GY - (q.kind === 'mush' ? 160 : 118);
    ctx.fillStyle = 'rgba(28,26,54,0.7)'; circle(bx, by, 11); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by - 3, 7, 0.3, Math.PI - 0.3); ctx.stroke();
  }
  function drawRobin(x, y, s, o = {}) {
    const flap = o.tuck ? -0.9 : Math.sin(o.t * (o.fast ? 18 : 9)) * 0.7, f = o.face || 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(s * f, s); if (o.rot) ctx.rotate(o.rot);
    // far wing
    ctx.fillStyle = '#5a3a28'; ctx.save(); ctx.rotate(-0.4 - flap * 0.6); ctx.beginPath(); ctx.ellipse(-10, -30, 26, 60, -0.6, 0, TAU); ctx.fill(); ctx.restore();
    // tail
    ctx.fillStyle = '#4a3020'; ctx.beginPath(); ctx.moveTo(-50, 0); ctx.lineTo(-110, -20); ctx.lineTo(-110, 20); ctx.closePath(); ctx.fill();
    // body and red breast
    ctx.fillStyle = '#6a4a34'; ctx.beginPath(); ctx.ellipse(0, 0, 66, 46, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8702a'; ctx.beginPath(); ctx.ellipse(18, 14, 46, 34, 0.2, 0, TAU); ctx.fill();
    // head, eye, beak
    ctx.fillStyle = '#5a3a28'; circle(62, -30, 34); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(74, -38, 9); ctx.fill();
    ctx.fillStyle = '#100808'; circle(76, -38, 6); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(78, -40, 2); ctx.fill();
    ctx.strokeStyle = '#100808'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(64, -50); ctx.lineTo(84, -46); ctx.stroke();
    const open = o.open || 0;
    ctx.fillStyle = '#f2c03a'; ctx.beginPath(); ctx.moveTo(90, -34); ctx.lineTo(132, -26 - open * 6); ctx.lineTo(92, -20); ctx.closePath(); ctx.fill();
    if (open) { ctx.beginPath(); ctx.moveTo(90, -22); ctx.lineTo(126, -10 + open * 10); ctx.lineTo(90, -14); ctx.closePath(); ctx.fill(); }
    // near wing
    ctx.fillStyle = '#7a5038'; ctx.save(); ctx.translate(0, -6); ctx.rotate(0.2 + flap); ctx.beginPath(); ctx.ellipse(-16, -26, 24, 62, -0.5, 0, TAU); ctx.fill(); ctx.restore();
    // feet (claws out when diving)
    ctx.strokeStyle = '#c89a3a'; ctx.lineWidth = 5;
    for (const dx of [-6, 16]) { ctx.beginPath(); ctx.moveTo(dx, 40); ctx.lineTo(dx + 8, 66); ctx.lineTo(dx + 20, 70); ctx.moveTo(dx + 8, 66); ctx.lineTo(dx + 2, 76); ctx.stroke(); }
    ctx.restore();
  }
  function drawTop(st) {
    const cx = st.cam.x, t = st.clock, c = st.c, b = st.bird;
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, 0);
    for (const q of c.covers) if (q.x < cx + W + 200 && q.x + q.w > cx - 200) drawCoverFront(st, q, t);
    // players under cover show through it a little, so you can see where you are
    for (const r of st.run) { const hid = hidden(st, r); if (hid) ctx.globalAlpha = 0.55; drawRunner(st, r); ctx.globalAlpha = 1; }
    // the robin when it is low enough to see
    if (b.ph === 'dive' || b.ph === 'snatch' || b.ph === 'rise') {
      const ang = b.ph === 'dive' ? 0.5 : -0.5;
      drawRobin(b.bx, b.by, 0.95, { t, tuck: b.ph === 'dive', rot: ang, open: b.ph === 'dive' ? 1 : 0 });
      if (b.ph === 'snatch' && b.carry >= 0) { /* the carried player is drawn in drawRunner at its x / y */ }
    }
    K.drawParts(st, cx);
    ctx.restore();
    drawLens(st);
    K.drawPops(st, cx, 0);
  }
  function drawRunner(st, r) {
    const job = r.id === st.wat ? 'watch' : 'dash';
    let sy = 1 - r.sq * 0.18, rot = 0;
    if (r.st === 'snatched') rot = Math.sin(st.clock * 10) * 0.4;
    else if (r.look) { rot = -r.face * 1.35; sy = 1; }
    else if (r.dive > 0) rot = r.face * (1 - r.dive / S.diveT) * TAU;
    else if (!r.grounded) rot = r.face * clamp(r.vy / 2000, -0.15, 0.15);
    else if (Math.abs(r.vx) > 20) rot = r.face * 0.1;
    if (r.st !== 'snatched') { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(r.x, r.on ? GY - r.on.h : GY, 13, 4, 0, 0, TAU); ctx.fill(); }
    const y = r.look ? r.y - 4 : r.y;
    K.hero(r.id, r.x, y, { face: r.face, rot, sy, sx: 2 - sy, vy: r.grounded ? 0 : r.vy, stun: r.st === 'snatched' });
    if (job === 'watch' && r.look) {
      // a bottle-cap spyglass held up to the eye
      const hx = r.x + r.face * 4, hy = r.y - 24;
      ctx.fillStyle = '#c8c8d0'; ctx.strokeStyle = '#6a6a78'; ctx.lineWidth = 2; rr(hx - 4, hy - 16, 8, 16, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9fe8ff'; circle(hx, hy - 17, 4); ctx.fill();
    }
  }
  // the spyglass circle at the top: the sky, seen only while the watcher looks up
  function drawLens(st) {
    if (st.state !== 'go') return;
    const b = st.bird, Wr = st.run[st.wat], look = Wr.look, x = W / 2, y = hudBig() ? 128 : 96, r = hudBig() ? 56 : 46, t = st.clock;
    ctx.save();
    ctx.fillStyle = 'rgba(28,26,54,0.85)'; circle(x, y, r + 6); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    if (look) {
      const g = ctx.createLinearGradient(0, y - r, 0, y + r); g.addColorStop(0, '#5ab0e8'); g.addColorStop(1, '#bfe6f6'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; circle(x - 20 + Math.sin(t * 0.3) * 10, y + 20, 14); ctx.fill(); circle(x - 6 + Math.sin(t * 0.3) * 10, y + 16, 12); ctx.fill();
      if (b.ph === 'circle') { const a = t * 1.3; drawRobin(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.25, 0.16, { t, face: Math.sin(a) > 0 ? -1 : 1 }); }
      else if (b.ph === 'eye') { drawRobin(x, y, 0.24, { t, face: b.tg === 1 ? 1 : -1 }); if (!b.feint || b.t > 0.6) text(b.feint && b.t > 0.6 ? '?' : '!', x + 26, y - 22, 22, b.feint && b.t > 0.6 ? '#ffffff' : '#ff4a3a', 'center'); }
      else if (b.ph === 'tuck') drawRobin(x, y + b.t * 30, 0.26, { t, tuck: true, rot: 0.6, face: 1 });
      else if (b.ph === 'rise') drawRobin(x + b.t * 20, y + r - b.t * 50, 0.2, { t, fast: true });
    } else {
      ctx.fillStyle = 'rgba(120,150,170,0.6)'; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
      text('?', x, y + 2, 34, 'rgba(255,255,255,0.75)', 'center');
    }
    ctx.restore();
    const danger = (b.ph === 'eye' || b.ph === 'tuck') && look && !b.feint;
    ctx.strokeStyle = danger ? (Math.sin(t * 16) > 0 ? '#ff4a3a' : C.gold) : PCOL[st.wat]; ctx.lineWidth = 3.5; circle(x, y, r + 3); ctx.stroke();
    const lab = look ? (danger ? (b.warned ? 'Warned!' : 'It\'s staring! WARN!') : b.ph === 'circle' ? 'Circling...' : b.ph === 'rise' ? 'Flying off' : '') : NAMES[st.wat] + ': ' + (K.quiet(st.wat) ? 'not looking' : 'hold ' + K.key(st.wat, 'down') + ' to look up');
    ctx.font = FONT(13);
    const w = ctx.measureText(lab).width + 20;
    if (lab) { pill(x, y + r + 8, w, 22, 'center'); text(lab, x, y + r + 19.5, 13, danger ? C.gold : '#ffffff', 'center', 'body'); }
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = 'Seeds ' + st.seeds + ' / ' + st.totalSeeds;
      ctx.font = FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, cy, fs, '#ffe680', 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play) return;
    const pl = plan(st), Wn = st.wat, Dn = st.dash, Wr = st.run[Wn], Dr = st.run[Dn];
    const kk = (id, what) => (K.quiet(id) ? '' : K.key(id, what) + ' ');
    {
      const bx = K.panel(Wn, 'sky watcher', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(Wn, 'down') + 'LOOK', !!pl.wat.look && !Wr.look, Wr.look, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(Wn, 'act') + 'WARN', !!pl.wat.warn, st.bird.warned && st.bird.ph !== 'circle', z);
    }
    {
      const bx = K.panel(Dn, 'dasher', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(Dn, 'right') + 'RUN', pl.dash.why === 'go' && Dr.vx <= 10, Math.abs(Dr.vx) > 10, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(Dn, 'act') + 'DIVE', !!pl.dash.dive, Dr.dive > 0, z);
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
    const P = K.prompter(st), cx = st.cam.x;
    const sx = r => clamp(r.x - cx, 70, W - 70), sy = r => clamp(r.y, 120, GY) - 52;
    for (const [id, job] of [[Wn, pl.wat], [Dn, pl.dash]]) {
      const r = st.run[id];
      if (r.st !== 'run') continue;
      let s = null, col = C.gold, pulse = false;
      if (job.why === 'hide') { s = 'HIDE! ' + K.key(id, job.x > r.x ? 'right' : 'left'); pulse = true; }
      else if (id === Wn && job.warn) { s = 'WARN! ' + K.key(id, 'act'); pulse = true; }
      else if (id === Wn && job.look && !r.look) { s = 'Look up ' + K.key(id, 'down'); }
      else if (job.why === 'go') { s = 'Go! ' + K.key(id, 'right'); col = '#d9ffd0'; }
      else if (job.why === 'run') { s = 'To cover ' + K.key(id, 'right'); }
      else if (id === Dn && job.why === 'wait' && !pl.watching && !K.quiet(Wn)) { s = 'Wait for ' + NAMES[Wn] + ' to look'; col = '#ffe7a8'; }
      P.say(id, s, sx(r), sy(r), col, pulse);
    }
  }

  MODES.birddash = {
    S, compile, plan, coverAt, hidden,
    medals: { bronze: 'Dash across the lawn past the robin', goals: [
      { key: 'time', gold: S.goldT, silver: S.silverT },
      { key: 'snatched', gold: 1, silver: 5, text: n => (!n ? 'Never snatched' : n === 1 ? 'Snatched at most once' : `Snatched at most ${n} times`), gap: (v, n) => { const d = Math.max(1, Math.ceil(v - n)); return `snatched ${d} fewer time${d === 1 ? '' : 's'}`; } },
      { key: 'seeds', gold: 0.7, more: true, pct: true, word: 'the seeds' },
    ] },
    medalValues() { const st = G.mst, s = st.stats; return s ? { snatched: s.snatched, seeds: st.seeds / (st.totalSeeds || 1) } : {}; },
    setup(st, L) {
      st.stats = { snatched: 0, warns: 0, falses: 0, dodged: 0, rolls: 0, helps: 0, roomT: [] };
      st.seeds = 0; st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0;
      const def = LEVELS[G.levelIndex];
      st.totalSeeds = (def.rooms || [def]).reduce((n, r) => n + compile(Object.assign({}, def, r)).seeds.length, 0);
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; for (const row of L.grid) row.fill('.'); room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.c) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.c) drawTop(st); },
    hud() { const st = G.mst; if (st.c) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Seeds', value: st.seeds + ' of ' + st.totalSeeds },
        { label: 'Snatched', value: String(s.snatched) },
        { label: 'Warnings', value: String(s.warns) },
      ];
      out.push('Swoops dodged: ' + s.dodged + '. Dive-rolls: ' + s.rolls + (s.falses ? '. False alarms: ' + s.falses : '') + '.');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  const acts = wat => ({ label: 'warn', labels: wat === 0 ? ['warn', 'dive'] : ['dive', 'warn'] });
  SHRUNK.defs.birddash = {
    name: 'Bird Attack Dash', world: 30, kind: 'team', mode: 'birddash', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> run <kbd>W</kbd> jump <kbd>S</kbd> look up',
      bo: '<kbd>←</kbd><kbd>→</kbd> run <kbd>↑</kbd> jump <kbd>↓</kbd> look up',
      pad: 'stick runs, down looks up, <span data-glyph="a"></span> jumps,',
    },
    tip: 'A hungry robin! The watcher holds ▼ to watch the sky and warns when it stares. Run from cover to cover!',
    act: acts(0),
    map: K.stubMap(),
    rooms: [
      { title: 'Open Lawn', watcher: 0, safe: 'Under the garden bench!', act: acts(0),
        tip: 'Pip lies down and holds ▼ to watch the sky, and warns when the robin stares. Bo dashes from cover to cover.',
        course: ['r160', 's', 'r100', 'H110:leaf', 'r120', 'S', 'r120', 'H100:mush', 'r180', 'l34:44', 'r100', 's', 'r60', 'H120:pot', 'r140', 'S', 'r120', 'H110:leaf', 'r220', 's',
          'r80', 'H100:cup', 'r160', 'S', 'r120', 'H120:clover', 'r200', 'l36:46', 'r80', 'H110:leaf', 'r160', 's', 'r160'] },
      { title: 'Clover Patch', watcher: 1, safe: 'Under the watering can!', act: acts(1),
        tip: 'Swap! Bo watches the sky, Pip dashes. The robin is quicker now: watch for it to climb away, then run!',
        course: ['r160', 'S', 'r120', 'H140:clover', 'r200', 's', 'r100', 'H100:mush', 'r140', 'l34:44', 'r140', 'H120:clover', 'r240', 'S', 'r60', 'H110:pot', 'r180', 's', 'r100',
          'H130:clover', 'r200', 'S', 'r120', 'H100:cup', 'r260', 's', 'r80', 'H120:leaf', 'r200'] },
      { title: 'The Flower Bed', watcher: 0, safe: 'Under the big sunflower!', act: acts(0),
        tip: 'Pip watches again. Longer runs between hiding spots: warn early, and dive-roll the last bit!',
        course: ['r160', 's', 'r120', 'H100:pot', 'r240', 'S', 'r80', 'H110:mush', 'r260', 'l36:46', 'r80', 's', 'r40', 'H100:leaf', 'r200', 'S', 'r120', 'H120:pot', 'r280', 's',
          'r60', 'H100:cup', 'r220', 'S', 'r120', 'H110:mush', 'r300', 'l34:44', 'r60', 'H120:leaf', 'r200'] },
      { title: 'The Bird Bath', watcher: 1, safe: 'Under the hedge!', act: acts(1),
        tip: 'The last dash to the hedge! Bo watches. The robin is fast and tricky: sometimes it stares and looks away.',
        course: ['r160', 'S', 'r120', 'H110:leaf', 'r260', 's', 'r100', 'H100:cup', 'r280', 'l36:46', 'r60', 'H110:pot', 'r240', 'S', 'r100', 'H100:mush', 'r300', 's', 'r60',
          'H120:clover', 'r260', 'S', 'r100', 'H110:leaf', 'r280', 's', 'r80', 'H100:pot', 'r240'] },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.birddashJump = function (p) { this.tone(p ? 330 : 392, 0.1, 'triangle', 0.035, p ? 520 : 620); };
  Sfx.extra.birddashRoll = function () { this.tone(500, 0.14, 'sawtooth', 0.02, 200); };
  Sfx.extra.birddashWarn = function () { [880, 660, 880, 660].forEach((f, i) => this.tone(f, 0.08, 'square', 0.035, null, i * 0.09)); };
  Sfx.extra.birddashFalse = function () { this.tone(400, 0.12, 'triangle', 0.03, 300); };
  Sfx.extra.birddashScreech = function () { this.tone(2400, 0.5, 'sawtooth', 0.035, 1300); this.tone(1800, 0.4, 'square', 0.015, 900, 0.05); };
  Sfx.extra.birddashThunk = function () { this.tone(140, 0.14, 'sine', 0.08, 70); this.tone(420, 0.06, 'square', 0.02, 260, 0.01); };
  Sfx.extra.birddashSnatch = function () { this.tone(1600, 0.2, 'sawtooth', 0.03, 2400); [500, 420, 360].forEach((f, i) => this.tone(f, 0.12, 'square', 0.03, null, 0.2 + i * 0.1)); };
  Sfx.extra.birddashHuff = function () { [1800, 1500].forEach((f, i) => this.tone(f, 0.06, 'sine', 0.025, f * 0.8, i * 0.08)); };
  Sfx.extra.birddashFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.055, null, i * 0.11)); };
})();
