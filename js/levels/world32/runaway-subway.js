/* Pip & Bo - Level 32-1 Runaway Subway (team, World 32 Superhero City). */
'use strict';

/* ===== 32-1 Runaway Subway (mode 'subway', team, scrolls along the train, Gavyn's pick) =====
   Gavyn's pick: "a train with no brakes. One hero runs alongside at super speed pulling the brake levers on each car
   while the other holds up falling beams."
   Side view of a subway train racing through a tunnel. Everything is in the TRAIN's frame: x = 0 is the back of the last
   car and the cab is on the right; the tunnel, its pipes and the track-side junk stream past right to left at the
   train's speed. The camera follows Pip and Bo along the train toward the cab. The mode owns the tick, the camera and the
   picture (def.ownStep + ownHUD + noFalls); the engine grid is only spawns.
   THE SPEEDSTER (power: super speed) runs on the walkway beside the train (◀ ▶ move along it, ▲ jumps). Every car has a
     red brake lever on its side, low down. Stand at the next one (it glows) and HOLD the action ('pull') to haul it
     down: a ring fills (S.pullT). Track-side crates and signal boxes rush at the speedster: jump them, or "Oof!" (a bump:
     the speedster tumbles back and lets go of the lever, which creeps back up while nobody pulls).
   THE STRONG HERO (power: super strength) rides on the roof (◀ ▶, ▲). Pulling a brake makes the whole train shriek and
     shake, and a steel girder shakes loose from the tunnel ceiling over that car: cracks and a red "!" show where, about a
     second before it drops. Stand under it and HOLD the action ('hold') to catch it overhead, and keep holding until the
     lever clunks home: then the hero heaves it off the train. A girder nobody catches (or one let go too soon) crashes
     onto the roof: a Dent, the jolt knocks the lever back up and the speedster loses their grip. The lever can't finish
     until the girder is held. Low pipes hanging from the tunnel ceiling sweep along the roof: hold ▼ to duck under them,
     or "Bonk!" (a pipe glances off a held girder harmlessly). No pipes start coming while a girder is up.
   Each lever slows the train a notch (the speed dial drops); after the last one (the cab) the train squeals into the
     station and the stretch ends. Jobs swap each stretch.
   STRETCHES: Downtown Line (4 cars, Pip runs), Under the River (5 cars, Bo), Express Uptown (6 cars, Pip),
     The Last Stop (6 cars, Bo; faster, more junk).
   SUBWAY TOKENS: on the roof and over the walkway, some up where only a jump reaches.
   GOLD HELP (only while both are playing, announced, counted): 3 bumps, bonks or dents in a stretch = gold brakes: the
     next 2 levers pull in 0.45 s with no girder.
   IDLE: no person presses anything for 12 s: "Taking a break", the train and the tunnel wait and the clock stops.
   MEDAL goals (MODES.subway.medals, js/medals.js): Gold <= S.goldT with <= 3 bumps+bonks+dents and >= 70% of the tokens;
   Silver <= S.silverT with <= 9.
   MODES.subway.plan(st) says what each job should do now (the prompts, the HUD chips and the computer brain read it).
   Everything lives inside this block; sounds are Sfx.extra.subway*. */
(() => {
  const K = HEROCITY, TAU = Math.PI * 2, FONT = K.FONT;
  const S = {
    roof: 228, ground: 448, carW: 420, gapW: 34, x0: 40, runV: 300, roofV: 230, acc: 2600, jumpV: 540, g: 1800, maxFall: 1000,
    bw: 22, bh: 26, duckH: 14, leverR: 24, beamR: 34, pullT: 1.1, goldPullT: 0.45, decay: 0.6, warnT: 0.85, fallT: 0.32,
    crateW: 44, crateH: 34, pipeW: 30, pipeBot: 20, bumpT: 0.7, bonkT: 0.8, leash: 600, tokR: 20, idleWait: 12,
    stopT: 2.6, goldT: 170, silverT: 300,
  };
  const ROOF = S.roof, GY = S.ground;
  const pitch = S.carW + S.gapW;
  const carX = k => S.x0 + k * pitch;
  const leverX = k => carX(k) + 70;
  const trainLen = n => carX(n - 1) + S.carW + 60;

  /* ---------- a stretch (one room) ---------- */
  const newRunner = (id, job, x) => ({ id, job, x, y: job === 'zoom' ? GY : ROOF, vx: 0, vy: 0, face: 1, grounded: true, st: 'run', t: 0, stun: 0, sq: 0, duck: false });
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.zoom = def.zoom || 0; st.lift = 1 - st.zoom; st.title = def.title || '';
    st.n = def.cars; st.len = trainLen(st.n);
    st.levers = [];
    for (let i = 0; i < st.n; i++) st.levers.push({ i, x: leverX(i), p: 0, done: false, flash: 0 });
    st.run = [0, 1].map(id => newRunner(id, id === st.zoom ? 'zoom' : 'lift', id === st.zoom ? 60 : 110));
    st.v0 = def.speed; st.v = def.speed; st.dist = 0; st.haz = []; st.crNext = 260; st.piNext = 700; st.hazN = 0;
    st.crateGap = def.crateGap; st.pipeGap = def.pipeGap;
    st.beam = null; st.dents = []; st.gold = 0;
    st.toks = [];
    for (let i = 0; i < st.n; i++) {
      const cx = carX(i);
      for (const [dx, hi] of [[140, 0], [230, 1], [320, 0]]) st.toks.push({ x: cx + dx, y: ROOF - (hi ? 96 : 30), roof: true, got: false });
      for (const [dx, hi] of [[180, 0], [300, 1]]) st.toks.push({ x: cx + dx, y: GY - (hi ? 100 : 30), roof: false, got: false });
    }
    st.state = 'go'; st.endT = 0; st.stopT = 0; st.party = false; st.cleared = false; st.lastRoom = false;
    st.rc = { bad: 0 }; st.segStart = G.time; st.clock = st.clock || 0; st.shake = 0; st.rumT = 0;
    st.cam = { x: 0 };
    K.fx(st); labels(st); mirror(st);
  }
  function labels(st) { const w = []; w[st.zoom] = 'pull'; w[st.lift] = 'hold'; K.actLabels(w, 'pull'); }
  const nextLever = st => st.levers.find(l => !l.done) || null;

  /* ---------- the tick ---------- */
  function tick(st, dt) {
    if (!st.levers) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    st.clock += dt;
    if (st.shake > 0) st.shake = Math.max(0, st.shake - dt * 2);
    for (const l of st.levers) if (l.flash > 0) l.flash -= dt;
    // the train moves (in the tunnel's frame); everything track-side streams past
    if (!st.waiting && G.introT <= 0) {
      st.dist += st.v * dt;
      for (const h of st.haz) h.x -= st.v * dt;
      st.haz = st.haz.filter(h => h.x > -120 && !h.gone);
      if (st.state === 'go') spawn(st);
      st.rumT -= dt;
      if (st.rumT <= 0 && st.v > 20) { st.rumT = clamp(14000 / st.v / 60, 0.12, 0.6); Sfx.play('subwayClack', 0.7 + st.v / 900); }
    }
    for (const r of st.run) runner(st, r, dt, live);
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    if (live) { beamStep(st, dt); hazards(st); tokens(st); leash(st); }
    if (st.state === 'stop') stopStep(st, dt);
    if (st.state === 'end') endStep(st, dt);
    cam(st, dt);
    K.tickFx(st, dt);
    mirror(st);
  }
  // new junk comes in from beyond the cab, spaced by tunnel distance (so a slower train meets it less often)
  function spawn(st) {
    if (st.dist >= st.crNext) {
      st.hazN++;
      st.haz.push({ kind: 'crate', x: st.len + 160, w: S.crateW, h: S.crateH, look: Math.floor(K.hash(st.hazN + st.k * 50) * 3), hit: false });
      st.crNext += st.crateGap * (0.8 + 0.45 * K.hash(st.hazN * 3 + st.k));
    }
    if (st.dist >= st.piNext) {
      st.hazN++;
      // no new pipe while a girder is coming down or held: the strong hero can't duck with a girder overhead
      if (st.beam) st.piNext += st.pipeGap * 0.35;
      else {
        st.haz.push({ kind: 'pipe', x: st.len + 200, w: S.pipeW, hit: false });
        st.piNext += st.pipeGap * (0.8 + 0.45 * K.hash(st.hazN * 5 + st.k));
      }
    }
  }
  function runner(st, r, dt, live) {
    r.t += dt;
    if (r.sq > 0) r.sq = Math.max(0, r.sq - dt * 4);
    if (r.stun > 0) { r.stun -= dt; r.vx = approach(r.vx, 0, 900 * dt); }
    const p = G.players[r.id], i = live && r.stun <= 0 ? p.input : NO_INPUT, jump = live && r.stun <= 0 && p.pendingJump;
    const floor = r.job === 'zoom' ? GY : ROOF;
    if (r.job === 'zoom') {
      const L = nextLever(st);
      const at = L && Math.abs(r.x - L.x) < S.leverR && r.grounded;
      r.pulling = !!(live && r.stun <= 0 && i.act && at && st.state === 'go');
      if (live && p.pendingAct && !at && st.state === 'go') {
        const near = st.levers.find(l => !l.done && Math.abs(r.x - l.x) < S.leverR);
        if (near && L && near !== L) K.hint(st, r.id, 'Back car first! Its lever glows');
        else if (!L || Math.abs(r.x - L.x) > S.leverR) K.hintOnce(st, 'pullWhere', r.id, 'Pull at the glowing red lever');
      }
      if (r.pulling) { r.vx = 0; r.face = 1; pull(st, r, L, dt); }
    } else {
      r.duck = !!(live && r.stun <= 0 && i.down && r.grounded && r.st !== 'hold');
      if (r.st === 'hold' && !(st.beam && st.beam.state === 'held')) r.st = 'run';
    }
    // lever creep: nobody pulling -> it springs back up slowly
    for (const l of st.levers) if (!l.done && !(r.job === 'zoom' && r.pulling && l === nextLever(st)) && r.job === 'zoom') l.p = Math.max(0, l.p - S.decay * dt);
    if (r.st === 'hold' || r.pulling || r.duck) { r.vx = 0; gravity(st, r, dt, floor); return; }
    const want = (i.right ? 1 : 0) - (i.left ? 1 : 0), top = r.job === 'zoom' ? S.runV : S.roofV;
    if (want) r.face = want;
    if (r.stun <= 0) r.vx = approach(r.vx, want * top, (r.grounded ? S.acc : S.acc * 0.6) * dt);
    if (jump && r.grounded) { r.vy = -S.jumpV; r.grounded = false; Sfx.play('subwayJump', r.id); }
    r.x = clamp(r.x + r.vx * dt, 24, st.len - (r.job === 'zoom' ? 30 : 70));
    gravity(st, r, dt, floor);
  }
  function gravity(st, r, dt, floor) {
    if (r.grounded) return;
    r.vy = Math.min(S.maxFall, r.vy + S.g * dt);
    r.y += r.vy * dt;
    if (r.y >= floor) { r.y = floor; r.vy = 0; r.grounded = true; r.sq = 0.6; }
  }
  function pull(st, r, L, dt) {
    const gold = st.gold > 0, T = gold ? S.goldPullT : S.pullT;
    if (L.p === 0) Sfx.play('subwayGrab');
    // the first pull on a lever shakes a girder loose (not with gold brakes)
    if (!gold && !L.beamDone && !st.beam) {
      st.beam = { x: L.x, L, state: 'warn', t: 0, y: 60 };
      Sfx.play('subwayCreak'); st.shake = Math.max(st.shake, 0.4);
      K.sound(st, L.x + 170, 74, 'CRRACK!', { size: 28 });
      K.hintOnce(st, 'girder' + st.k, st.lift, 'A girder is coming down! Stand under it and hold ' + K.key(st.lift, 'act'));
    }
    const cap = gold || L.beamDone || (st.beam && st.beam.state === 'held') ? 1 : 0.92;
    L.p = Math.min(cap, L.p + dt / T);
    if (Math.random() < 0.4) K.part(st, L.x + (Math.random() - 0.5) * 20, GY - 14, (Math.random() - 0.5) * 160, -60 - Math.random() * 120, 0.5, Math.random() < 0.5 ? '#ffd27a' : '#ffffff', 2.5, 500, 'star');
    if (L.p >= 1) leverDone(st, L);
  }
  function leverDone(st, L) {
    L.done = true; L.p = 1; L.flash = 0.6; st.stats.levers++;
    if (st.gold > 0) st.gold--;
    Sfx.play('subwayClunk'); Sfx.play('subwayScreech');
    K.sound(st, L.x + 190, GY + 24, 'SCREEEECH!', { size: 20, c1: '#ffffff', c2: '#6fd0ff', rot: -0.03 });
    const done = st.levers.filter(l => l.done).length;
    st.v = st.v0 * (1 - 0.72 * done / st.n);
    st.shake = Math.max(st.shake, 0.5);
    for (let k = 0; k < 18; k++) K.part(st, L.x + 120 + Math.random() * 240, GY - 8, -200 - Math.random() * 300, -80 - Math.random() * 160, 0.6, k % 2 ? '#ffb43a' : '#fff2a0', 2.5, 600, 'star');
    if (st.beam && st.beam.state === 'held') heave(st);
    L.beamDone = true;
    if (done >= st.n) {
      st.state = 'stop'; st.stopT = 0;
      K.pop(st, L.x, ROOF - 90, 'All brakes on!', '#ffffff', 26);
      Sfx.play('subwayScreech');
    } else K.pop(st, L.x, GY - 90, 'CLUNK! ' + done + ' of ' + st.n, '#ffe08a', 22);
  }
  function heave(st) {
    const b = st.beam, R = st.run[st.lift];
    st.beam = null; st.stats.caught++;
    R.st = 'run'; R.sq = 1;
    Sfx.play('subwayHeave');
    K.pop(st, b.x, ROOF - 110, 'Heave!', PCOL[st.lift], 24);
    st.flying = { x: b.x, y: ROOF - 44, vx: -260, vy: -420, r: 0, t: 0 };
  }
  function beamStep(st, dt) {
    if (st.flying) { const f = st.flying; f.t += dt; f.vy += 1400 * dt; f.x += (f.vx - st.v) * dt; f.y += f.vy * dt; f.r += dt * 5; if (f.t > 1.4) st.flying = null; }
    const b = st.beam;
    if (!b) return;
    const R = st.run[st.lift], i = G.players[st.lift].input;
    b.t += dt;
    if (b.state === 'warn') {
      if (Math.random() < 0.3) K.part(st, b.x + (Math.random() - 0.5) * 90, 64, 0, 40 + Math.random() * 60, 0.9, 'rgba(200,190,170,0.8)', 3, 300, 'dust');
      if (b.t >= S.warnT) { b.state = 'fall'; b.t = 0; Sfx.play('subwayDrop'); }
    } else if (b.state === 'fall') {
      const u = clamp(b.t / S.fallT, 0, 1);
      b.y = K.lerp(60, ROOF - 44, u * u);
      if (u >= 1) {
        const under = Math.abs(R.x - b.x) < S.beamR && R.grounded && R.stun <= 0 && i.act && !R.duck;
        if (under) {
          b.state = 'held'; b.y = ROOF - 44; R.st = 'hold'; R.x = clamp(R.x, b.x - 14, b.x + 14); R.sq = 1;
          Sfx.play('cityClang'); K.pop(st, b.x, ROOF - 120, 'Caught it!', '#ffffff', 22);
          K.sound(st, b.x + 150, ROOF - 70, 'CLANG!', { size: 26 }); K.focusAt(st, b.x, ROOF - 44);
          K.hintOnce(st, 'keepHold' + st.k, st.lift, 'Keep holding until the lever clunks!');
        } else crash(st, b);
      }
    } else if (b.state === 'held') {
      R.x = clamp(R.x, b.x - 14, b.x + 14);
      if (!i.act || R.stun > 0) crash(st, b);
    }
  }
  function crash(st, b) {
    st.beam = null; st.stats.dents++; st.rc.bad++;
    st.dents.push({ x: b.x, s: K.hash(b.x) });
    Sfx.play('cityClang'); Sfx.play('cityThud');
    G.shake = Math.max(G.shake || 0, 0.45); st.shake = 1;
    K.pop(st, b.x, ROOF - 100, 'CRASH!', '#ffb0a0', 30);
    K.sound(st, b.x + 160, ROOF - 40, 'KRUNCH!', { size: 28 });
    for (let k = 0; k < 16; k++) K.part(st, b.x + (Math.random() - 0.5) * 100, ROOF - 10, (Math.random() - 0.5) * 360, -120 - Math.random() * 240, 0.8, k % 2 ? '#c8ccd6' : '#ffd27a', 3, 700, 'star');
    // the jolt knocks the lever back up and shakes the speedster loose
    if (b.L && !b.L.done) b.L.p = 0;
    const Z = st.run[st.zoom];
    if (Z.pulling) { Z.stun = 0.5; Z.pulling = false; }
    const R = st.run[st.lift];
    if (R.st === 'hold') R.st = 'run';
    if (Math.abs(R.x - b.x) < 50 && R.stun <= 0) { R.stun = 0.5; }
    st.flying = { x: b.x, y: ROOF - 20, vx: -200, vy: -300, r: 0, t: 0 };
    K.msg(st, st.rc.bad === 1 ? 'The girder crashed and knocked the lever up! Catch it next time.' : 'CRASH! Hold the girder up until the lever clunks.', '#ffd0c8', 3);
    goldCheck(st);
  }
  function hazards(st) {
    const Z = st.run[st.zoom], R = st.run[st.lift], hw = S.bw / 2;
    for (const h of st.haz) {
      if (h.hit) continue;
      if (h.kind === 'crate') {
        if (Math.abs(h.x - Z.x) < h.w / 2 + hw - 3 && Z.y > GY - h.h + 2 && Z.stun <= 0) {
          h.hit = true; h.gone = true; st.stats.bumps++; st.rc.bad++;
          Z.stun = S.bumpT; Z.pulling = false; Z.x = Math.max(24, Z.x - 50); Z.vx = 0; Z.sq = 1;
          Sfx.play('cityThud'); Sfx.play('subwaySmash');
          K.pop(st, Z.x, GY - 70, 'Oof!', '#ffffff', 24);
          for (let k = 0; k < 12; k++) K.part(st, h.x, GY - 20, -100 - Math.random() * 260, -100 - Math.random() * 220, 0.8, k % 2 ? '#c88a4a' : '#8a5a2a', 4, 700, 'conf');
          goldCheck(st);
        }
      } else if (h.kind === 'pipe') {
        if (Math.abs(h.x - R.x) < h.w / 2 + hw - 3) {
          const top = R.y - (R.duck ? S.duckH : S.bh);
          // a girder overhead (held, or still coming down): the pipe clangs off it. The strong hero can't duck and
          // catch at once, so a pipe that was already on its way when the lever was pulled must not cost a dent
          if (R.st === 'hold' || (st.beam && Math.abs(h.x - st.beam.x) < S.beamR + 60)) { h.hit = true; Sfx.play('cityClang'); K.spark(st, h.x, ROOF - 50, 6, ['#ffd27a', '#ffffff']); continue; }
          if (top < ROOF - S.pipeBot - 1 && R.stun <= 0) {
            h.hit = true; st.stats.bonks++; st.rc.bad++;
            R.stun = S.bonkT; R.x = Math.max(24, R.x - 40); R.vx = 0; R.sq = 1;
            Sfx.play('cityClang'); K.pop(st, R.x, ROOF - 70, 'Bonk!', '#ffffff', 24);
            K.sound(st, R.x + 110, ROOF - 110, 'BONK!', { size: 24, c1: '#ffffff', c2: '#ffb02e' });
            K.hintOnce(st, 'duck' + st.k, R.id, 'Duck under the pipes: hold ' + K.key(R.id, 'down'));
            goldCheck(st);
          }
        }
      }
    }
  }
  function goldCheck(st) {
    if (st.rc.bad >= 3 && !st.goldUsed && K.both(st)) {
      st.goldUsed = true; st.gold = 2;
      if (st.beam && st.beam.state !== 'held') st.beam = null;
      K.goldHelp(st, 'Gold brakes! The next 2 levers pull in a flash, no girders');
    }
  }
  function tokens(st) {
    for (const r of st.run) {
      for (const q of st.toks) {
        if (q.got || q.roof !== (r.job === 'lift')) continue;
        if (Math.abs(q.x - r.x) > S.tokR || Math.abs(q.y - (r.y - 13)) > S.tokR + 6) continue;
        q.got = true; st.tok++;
        Sfx.play('cityPop', 1 + (st.tok % 5) * 0.06); K.spark(st, q.x, q.y, 5, ['#ffe08a', '#ffffff']);
      }
    }
  }
  function leash(st) {
    const [a, b] = st.run, front = a.x > b.x ? a : b, back = front === a ? b : a;
    if (front.x - back.x > S.leash) { front.x = back.x + S.leash; front.vx = Math.min(front.vx, 0); K.hintOnce(st, 'leash' + front.id + st.k, front.id, 'Wait for ' + NAMES[back.id] + '!'); }
  }
  function stopStep(st, dt) {
    st.stopT += dt;
    st.v = Math.max(0, st.v0 * 0.28 * (1 - st.stopT / S.stopT));
    if (Math.random() < 0.6 && st.v > 5) K.part(st, 120 + Math.random() * (st.len - 200), GY - 6, -120 - Math.random() * 200, -60 - Math.random() * 100, 0.5, '#ffd27a', 2.5, 600, 'star');
    if (st.stopT >= S.stopT && st.run.every(r => r.grounded)) {
      st.v = 0; st.state = 'end'; st.endT = 0;
      const last = !(G.level.def.rooms && G.level.def.roomIndex < G.level.def.roomCount - 1);
      st.lastRoom = last;
      st.stats.roomT[st.k] = G.time - st.segStart;
      Sfx.play('cityCheer');
      K.pop(st, st.cam.x + W / 2, ROOF - 120, last ? 'The runaway train is stopped! City saved!' : (G.level.def.station || 'Station!') + ' Swap powers!', '#ffffff', 26);
      for (const r of st.run) { r.vx = 0; r.st = 'run'; r.duck = false; r.pulling = false; }
    }
  }
  function endStep(st, dt) {
    st.endT += dt;
    if (st.lastRoom) {
      if (st.endT > 0.7 && !st.party) { st.party = true; Sfx.play('subwayFanfare'); K.confetti(st, st.cam.x + W / 2, ROOF - 120, 50); }
      if (st.endT > 2.6 && !st.cleared) { st.cleared = true; G.level.goal = { x: W / 2, y: ROOF - 60 }; levelClear(); }
    } else if (st.endT > 2.0) nextRoom();
  }

  /* ---------- the camera ---------- */
  function cam(st, dt) {
    const mid = (st.run[0].x + st.run[1].x) / 2;
    const want = clamp(mid - W * 0.45, 0, Math.max(0, st.len + 40 - W));
    st.cam.x = K.lerp(st.cam.x, want, Math.min(1, dt * 5));
  }
  function mirror(st) {
    for (const r of st.run) K.place(r.id, r.x - st.cam.x, r.y);
  }

  /* ---------- what to do next ----------
     plan(st): { L (the next lever), stage ('go' | 'pull' | 'stop'), zoom: { x, act (true = hold), jump, why },
       lift: { x, act, down, why }, crateT (s until the next crate reaches the speedster), pipeT (s until the next pipe
       reaches the strong hero), ready (the strong hero is under the girder spot) } */
  function timeTo(st, kind, r) {
    let best = 99;
    for (const h of st.haz) {
      if (h.kind !== kind || h.hit) continue;
      const gap = h.x - h.w / 2 - (r.x + S.bw / 2);
      if (gap < -h.w - S.bw) continue;
      const rel = st.v + Math.max(0, r.vx);
      best = Math.min(best, Math.max(0, gap) / Math.max(30, rel));
    }
    return best;
  }
  function plan(st) {
    const Z = st.run[st.zoom], R = st.run[st.lift], L = nextLever(st);
    const crateT = timeTo(st, 'crate', Z), pipeT = timeTo(st, 'pipe', R);
    const out = { L, stage: st.state === 'go' ? 'go' : 'stop', zoom: { x: Z.x }, lift: { x: R.x }, crateT, pipeT, ready: false };
    if (!L || st.state !== 'go') return out;
    const b = st.beam, gold = st.gold > 0;
    const ready = gold || L.beamDone || (b && b.state === 'held') || (Math.abs(R.x - L.x) < S.beamR - 8 && R.grounded && R.stun <= 0);
    out.ready = ready;
    const atL = Math.abs(Z.x - L.x) < S.leverR - 6 && Z.grounded;
    const needT = (1 - L.p) * (gold ? S.goldPullT : S.pullT) + (b && b.state !== 'held' && !L.beamDone && !gold ? 0.3 : 0.1);
    out.zoom = { x: L.x, why: 'go' };
    if (atL) {
      out.stage = 'pull';
      if (Z.pulling) out.zoom.act = crateT > 0.22, out.zoom.why = 'pull';
      else if (ready && crateT > needT + 0.15) out.zoom.act = true, out.zoom.why = 'pull';
      else out.zoom.why = ready ? 'crate' : 'wait';
    }
    if (crateT < 0.13 && Z.grounded) { out.zoom.jump = true; out.zoom.act = false; }
    // in the air over a crate: carry on past it (hanging back over the lever can land on a slow crate)
    if (!Z.grounded) {
      const under = st.haz.find(h => h.kind === 'crate' && !h.hit && h.x > Z.x - 40 && h.x - Z.x < 90);
      if (under) { out.zoom.x = Math.max(out.zoom.x, under.x + 70); out.zoom.act = false; }
    }
    // the strong hero: under the girder spot, holding when one is coming or up
    out.lift = { x: L.x, why: 'go' };
    if (b) { out.lift.x = b.x; out.lift.act = Math.abs(R.x - b.x) < S.beamR + 30 || b.state === 'held'; out.lift.why = b.state === 'held' ? 'keep' : 'catch'; }
    // duck a pipe (not under a girder: there the pipe clangs off it), and stay down until it has gone over
    if ((pipeT < 0.24 || (R.duck && pipeT < 0.6)) && R.grounded && (!b || Math.abs(R.x - b.x) >= S.beamR + 60)) { out.lift.down = true; out.lift.act = false; out.lift.why = 'duck'; }
    return out;
  }

  /* ---------- drawing (comic-book look: ink, flat colour, printed dots) ---------- */
  // each stretch keeps its own colour family; the roof hero's background never matches their own colour
  const TUN = [
    { brick: '#c2542a', brickLn: '#7a2a10', tile: '#fbe7a8', tileLn: 'rgba(20,18,28,0.5)', band: '#e8222e', lamp: '#fff3a0', mosaic: ['#19a89a', '#ffe14a', '#e8222e', '#2e7bff'], plate: '#1c3fa8' },
    { brick: '#0e5a52', brickLn: '#063a34', tile: '#a8f0d8', tileLn: 'rgba(8,60,52,0.55)', band: '#19a89a', lamp: '#bff6ff', mosaic: ['#ffe14a', '#ffffff', '#2e7bff', '#19a89a'], plate: '#0c5c56', drips: true },
    { brick: '#2a7a3a', brickLn: '#124a1c', tile: '#ffe680', tileLn: 'rgba(120,80,0,0.45)', band: '#ffb02e', lamp: '#fff8d0', mosaic: ['#2e7bff', '#e8222e', '#2fc45a', '#ffffff'], plate: '#e8222e' },
    { brick: '#3a2a8a', brickLn: '#1c1250', tile: '#ffffff', tileLn: 'rgba(20,18,28,0.4)', band: '#ff7a3a', lamp: '#ffe0b0', mosaic: ['#ff7a3a', '#ffe14a', '#19a89a', '#e8222e'], plate: '#ff7a3a' },
  ];
  const INK = K.INK, TAU2 = TAU, POSTERS = [['#ffe14a', 'ZAP COLA', '#e8222e'], ['#2e7bff', 'HERO CON', '#ffe14a'], ['#ff5ab4', 'POW! GUM', '#ffffff'], ['#19a89a', 'CAT SHOW', '#fff3a0'],
    ['#e8222e', 'BIFF BARS', '#ffe14a'], ['#7af0ff', 'ZOOM FIZZ', '#e8222e'], ['#ffb02e', 'ROBO RAMA', '#14121c'], ['#2fc45a', 'MEGA MOVIE', '#ffffff']];
  function tunnelWall(st, P, wx, t) {
    // brick courses above and below the tile band
    ctx.fillStyle = P.brick; ctx.fillRect(0, 86, W, 190);
    ctx.strokeStyle = P.brickLn; ctx.lineWidth = 1.5; ctx.beginPath();
    for (const [ya, yb] of [[90, 120], [210, 272]]) for (let y = ya + 7, r = 0; y < yb; y += 9, r++) { ctx.moveTo(0, y); ctx.lineTo(W, y); for (let x = -((wx + (r % 2) * 13) % 26); x < W; x += 26) { ctx.moveTo(x, y); ctx.lineTo(x, y - 9); } }
    ctx.stroke();
    // the tile band: an ink grid, a mosaic trim of coloured tiles, the stretch's colour band
    ctx.fillStyle = P.tile; ctx.fillRect(0, 120, W, 90);
    K.dotFade(0, W, 160, 210, P.tileLn.replace(/[\d.]+\)$/, '0.22)'), 8, 0.5, wx);
    ctx.strokeStyle = P.tileLn; ctx.lineWidth = 1.2; ctx.beginPath(); for (let x = -(wx % 30); x < W; x += 30) { ctx.moveTo(x, 120); ctx.lineTo(x, 210); } for (let y = 120; y <= 210; y += 22.5) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke();
    for (let x = -(wx % 30) - 30, k = Math.floor(wx / 30); x < W; x += 30, k++) { ctx.fillStyle = P.mosaic[((k % 4) + 4) % 4]; ctx.fillRect(x + 2, 122, 26, 8); ctx.fillRect(x + 2, 200, 26, 8); }
    ctx.fillStyle = P.band; ctx.fillRect(0, 158, W, 10);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); for (const y of [120, 131, 158, 168, 199, 210]) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke();
    if (P.drips) { // under the river: water drips down the tiles
      ctx.fillStyle = '#2e7bff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
      for (let x = -(wx % 97), k = Math.floor(wx / 97); x < W; x += 97, k++) { const len = 14 + K.hash(k) * 30, u = (t * 0.8 + K.hash(k + 3)) % 1; ctx.beginPath(); ctx.moveTo(x + 40, 131); ctx.lineTo(x + 43, 131 + len); ctx.lineTo(x + 37, 131 + len); ctx.closePath(); ctx.fill(); ctx.stroke(); circle(x + 40, 131 + len + 4 + u * 30, 2.5); ctx.fill(); ctx.stroke(); }
    }
    // things along the wall, every 150 px: posters, graffiti, a side arch with a signal, a station plate, an exit sign, portholes
    const step = 150;
    for (let i = Math.floor(wx / step) - 1; i <= Math.ceil((wx + W) / step); i++) {
      const x = i * step - wx, kind = Math.floor(K.hash(i * 7 + 3) * 8);
      if (kind <= 2) { // a framed comic poster
        const [bg, word, fg] = POSTERS[Math.floor(K.hash(i * 11) * POSTERS.length)];
        ctx.fillStyle = INK; ctx.fillRect(x + 4, 138, 56, 60); K.inkRect(x, 134, 56, 60, bg, 1.25);
        ctx.save(); ctx.beginPath(); ctx.rect(x, 134, 56, 60); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath();
        for (let k = 0; k < 10; k++) { const a = k / 10 * TAU2; ctx.moveTo(x + 28, 172); ctx.lineTo(x + 28 + Math.cos(a - 0.12) * 70, 172 + Math.sin(a - 0.12) * 70); ctx.lineTo(x + 28 + Math.cos(a + 0.12) * 70, 172 + Math.sin(a + 0.12) * 70); }
        ctx.fill(); ctx.restore();
        K.star(x + 28, 176, 12, 5.5, 0.2); K.inkFill(fg, 0.8);
        word.split(' ').forEach((wd, q) => K.word(wd, x + 28, 144 + q * 12, 13, fg, { lw: 3 }));
      } else if (kind === 3) { // graffiti
        const wd = ['BAM!', 'ZOOM', 'P+B', 'WOW', 'KAPOW'][Math.floor(K.hash(i * 13) * 5)];
        K.word(wd, x + 40, 240, 30, ['#7af0ff', '#ffe14a', '#ff7ac0', '#5fe08a'][Math.floor(K.hash(i * 17) * 4)], { rot: -0.08, lw: 7, shadow: 2 });
      } else if (kind === 4) { // a dark side arch with a red / green signal lamp
        ctx.beginPath(); ctx.moveTo(x, 272); ctx.lineTo(x, 150); ctx.arc(x + 34, 150, 34, Math.PI, 0); ctx.lineTo(x + 68, 272); K.inkFill('#3a1408', 1.5);
        ctx.save(); ctx.clip(); K.dotFade(x, x + 68, 110, 200, INK, 6, 0.75); ctx.fillStyle = INK; ctx.fillRect(x, 200, 68, 72); ctx.restore();
        ctx.strokeStyle = '#ffb02e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + 34, 150, 39, Math.PI, 0); ctx.stroke();
        const on = Math.sin(t * 6 + i) > 0;
        K.inkRect(x + 76, 138, 16, 34, INK, 0.75);
        ctx.fillStyle = on ? '#ff3b30' : '#5a1410'; circle(x + 84, 147, 5); ctx.fill(); ctx.fillStyle = on ? '#1a4a24' : '#3fe06a'; circle(x + 84, 162, 5); ctx.fill();
      } else if (kind === 5) { // a mosaic station plate
        ctx.fillStyle = INK; ctx.fillRect(x + 3, 141, 118, 34); K.inkRect(x, 138, 118, 34, P.plate, 1.25);
        ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 2; ctx.strokeRect(x + 4, 142, 110, 26);
        K.word(['DOWNTOWN', 'HERO SQ.', 'CITY HALL', 'RIVER PK', 'UPTOWN'][Math.floor(K.hash(i * 19) * 5)], x + 59, 156, 19, '#ffffff', { lw: 3 });
      } else if (kind === 6) { // an EXIT sign, or a porthole under the river
        if (P.drips) { circle(x + 40, 165, 22); K.inkFill('#ffb02e', 2); circle(x + 40, 165, 15); K.inkFill('#2e7bff', 1.2); ctx.save(); circle(x + 40, 165, 15); ctx.clip(); K.dotFade(x + 20, x + 60, 150, 182, '#0f1650', 5, 0.7); ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.ellipse(x + 36 + Math.sin(t + i) * 6, 166, 6, 3, 0, 0, TAU2); ctx.fill(); ctx.restore(); }
        else { ctx.fillStyle = INK; ctx.fillRect(x + 33, 141, 90, 28); K.inkRect(x + 30, 138, 90, 28, '#2fc45a', 1.25); K.word('EXIT ➜', x + 75, 152, 17, '#ffffff', { lw: 3 }); }
      }
      if (i % 3 === 0) { // a riveted teal steel rib up the wall
        K.inkRect(x + 128, 86, 16, 186, '#19a89a', 1); ctx.fillStyle = '#5fe0cc'; ctx.fillRect(x + 130, 86, 4, 186);
        ctx.fillStyle = INK; for (let y = 98; y < 268; y += 16) { circle(x + 139, y, 1.8); ctx.fill(); }
      }
    }
    // two fat pipes with flanges and a turning valve wheel (not red: the roof hero stands just above them)
    for (const [y, col, hi] of [[214, '#ffb02e', '#ffe08a'], [226, '#19a89a', '#7af0e0']]) {
      ctx.fillStyle = col; ctx.fillRect(0, y, W, 9); ctx.fillStyle = hi; ctx.fillRect(0, y + 1.5, W, 2.5);
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.moveTo(0, y + 9); ctx.lineTo(W, y + 9); ctx.stroke();
      for (let x = -((wx + y * 3) % 210); x < W; x += 210) { ctx.beginPath(); ctx.rect(x, y - 2.5, 8, 14); K.inkFill(col, 0.75); }
    }
    for (let x = -((wx + 90) % 630); x < W + 20; x += 630) {
      ctx.strokeStyle = INK; ctx.lineWidth = 6; circle(x, 218, 13); ctx.stroke(); ctx.strokeStyle = '#2e7bff'; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); for (let k = 0; k < 3; k++) { const a = k * TAU2 / 6 + t; ctx.moveTo(x - Math.cos(a) * 13, 218 - Math.sin(a) * 13); ctx.lineTo(x + Math.cos(a) * 13, 218 + Math.sin(a) * 13); } ctx.stroke();
    }
  }
  // speed streaks: ink black with every third one white
  function streaks(y0, y1, n, t, speed) {
    if (speed < 30) return;
    ctx.lineCap = 'round';
    for (let k = 0; k < n; k++) {
      const y = y0 + K.hash(k + 11) * (y1 - y0), l = 90 + K.hash(k + 5) * 260, x = W + 300 - ((t * speed * 2 * (0.7 + K.hash(k) * 0.6) + K.hash(k + 2) * 1600) % 1700);
      ctx.strokeStyle = k % 3 ? INK : '#ffffff'; ctx.lineWidth = 1.5 + K.hash(k + 8) * 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y); ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  function draw(st) {
    const cx = st.cam.x, t = st.clock, P = TUN[st.k % TUN.length], sh = st.shake * 3 * Math.sin(t * 60);
    const wx = st.dist * 0.85 + cx * 0.85;
    // the tunnel wall: it streams past (far wall, a little slower than the walkway)
    ctx.fillStyle = '#0f1650'; ctx.fillRect(0, 0, W, H);
    tunnelWall(st, P, wx, t);
    // lamps with flat light cones
    const lampStep = 360;
    for (let x = -((wx) % lampStep) - lampStep; x < W + lampStep; x += lampStep) {
      ctx.fillStyle = 'rgba(255,244,170,0.3)'; ctx.beginPath(); ctx.moveTo(x + 4, 102); ctx.lineTo(x - 50, 262); ctx.lineTo(x + 70, 262); ctx.lineTo(x + 16, 102); ctx.fill();
      K.inkRect(x - 6, 92, 32, 12, '#14121c', 1); K.inkRect(x - 2, 96, 24, 6, P.lamp, 0);
    }
    // station: when stopping, a lit platform slides into view behind the train (cream platform, mosaic plate, cheering people)
    if (st.state !== 'go') {
      const u = st.state === 'end' ? 1 : K.smooth(st.stopT / S.stopT);
      ctx.globalAlpha = u;
      ctx.fillStyle = '#fff3d6'; ctx.fillRect(0, 96, W, 150);
      ctx.strokeStyle = 'rgba(20,18,28,0.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let x = -((wx) % 40); x < W; x += 40) { ctx.moveTo(x, 96); ctx.lineTo(x, 246); } ctx.stroke();
      K.dotFade(0, W, 180, 246, '#ffb02e', 8, 0.6, wx);
      ctx.fillStyle = P.band; ctx.fillRect(0, 168, W, 14); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.strokeRect(-4, 168, W + 8, 14);
      for (let k = 0; k < 10; k++) { // waiting people, cheering
        const px = ((k * 101 + K.hash(k) * 60 - wx * 0.3) % (W + 80) + W + 80) % (W + 80) - 40, wob = Math.sin(t * 8 + k) * 2;
        if (Math.abs(px - W / 2) < 160) continue;
        ctx.beginPath(); rr(px - 9, 200 + wob, 18, 30, 6); K.inkFill(['#ff5a2e', '#2e7bff', '#2fc45a', '#ff5ab4', '#ffb81e'][k % 5], 1);
        circle(px, 192 + wob, 8); K.inkFill('#f2c8a0', 1);
        ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px + 6, 206 + wob); ctx.lineTo(px + 13, 186 + wob + Math.sin(t * 12 + k) * 4); ctx.stroke(); ctx.strokeStyle = '#f2c8a0'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineCap = 'butt';
        ctx.fillStyle = INK; circle(px - 3, 191 + wob, 1.3); ctx.fill(); circle(px + 3, 191 + wob, 1.3); ctx.fill();
      }
      ctx.fillStyle = INK; ctx.fillRect(W / 2 - 136, 116, 280, 44);
      K.inkRect(W / 2 - 140, 112, 280, 44, P.plate, 1.5);
      for (let k = 0; k < 14; k++) { ctx.fillStyle = P.mosaic[k % 4]; ctx.fillRect(W / 2 - 136 + k * 20, 113, 16, 5); ctx.fillRect(W / 2 - 136 + k * 20, 150, 16, 5); }
      K.word(G.level.def.stationName || 'CITY HALL', W / 2, 135, 26, '#ffffff', { lw: 4, shadow: 2 });
      ctx.globalAlpha = 1;
    }
    // the ceiling: a navy vault with teal riveted roof girders
    ctx.fillStyle = '#0f1650'; ctx.fillRect(0, 0, W, 90);
    K.dotFade(0, W, 20, 90, '#2647b8', 9, 0.7, wx * 0.5);
    K.inkRect(-4, 70, W + 8, 10, '#19a89a', 1.25); ctx.fillStyle = '#5fe0cc'; ctx.fillRect(0, 71, W, 2.5);
    const cx2 = st.dist + cx;
    for (let x = -((cx2) % 200) - 200; x < W + 200; x += 200) { K.inkRect(x, -4, 18, 86, '#19a89a', 1.25); ctx.fillStyle = '#5fe0cc'; ctx.fillRect(x + 2, 0, 4, 82); ctx.fillStyle = INK; for (let y = 10; y < 70; y += 14) { circle(x + 12, y, 1.6); ctx.fill(); } }
    streaks(96, 118, 5, t, st.v); streaks(236, 268, 6, t, st.v);
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, sh * 0.3);
    // the girder warning: inked cracks and a red "!" burst in the ceiling, and a shadow on the roof
    const b = st.beam;
    if (b && b.state !== 'held') {
      const pulse = 0.6 + 0.4 * Math.sin(t * 18);
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); for (const [a1, a2] of [[-50, 20], [-20, 40], [10, 30], [40, 18]]) { ctx.moveTo(b.x + a1 * 0.4, 70); ctx.lineTo(b.x + a1, 80 + a2 * 0.3); ctx.lineTo(b.x + a1 * 1.3, 90 + a2 * 0.2); } ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.ellipse(b.x, ROOF + 2, 70 * (b.state === 'fall' ? 1 : 0.6 + 0.4 * b.t / S.warnT), 8, 0, 0, TAU2); ctx.clip(); K.dotScreen(b.x - 72, ROOF - 8, b.x + 72, ROOF + 12, '#e8222e', 6, 1.4 + pulse); ctx.restore();
      if (b.state === 'warn') {
        const r = 18 * pulse + 8;
        ctx.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * TAU2, rr2 = k % 2 ? r * 0.72 : r * 1.12; ctx.lineTo(b.x + Math.cos(a) * rr2, 112 + Math.sin(a) * rr2); } ctx.closePath(); K.inkFill('#e8222e', 1.5);
        K.word('!', b.x, 114, 26, '#ffe14a', { lw: 4 });
      }
    }
    drawTrain(st, t);
    ctx.restore();
  }
  function drawTrain(st, t) {
    const cx = st.cam.x, braking = st.levers.filter(l => l.done).length;
    for (let k = 0; k < st.n; k++) {
      const x = carX(k);
      if (x > cx + W + 60 || x + S.carW < cx - 60) continue;
      drawCar(st, k, x, t, braking);
    }
    // gangway bellows between cars
    for (let k = 0; k < st.n - 1; k++) {
      const x = carX(k) + S.carW;
      if (x > cx + W + 40 || x < cx - 80) continue;
      K.inkRect(x - 2, ROOF + 18, S.gapW + 4, 170, '#1c2a6a', 1.25);
      ctx.fillStyle = INK; for (let j = 0; j < 5; j++) ctx.fillRect(x + 3 + j * 6, ROOF + 22, 3, 162);
      K.inkRect(x - 4, ROOF - 2, S.gapW + 8, 8, '#ffb02e', 1.25);
    }
    // dents from girders that crashed
    for (const d of st.dents) { ctx.beginPath(); ctx.ellipse(d.x, ROOF + 4, 26, 6, 0, 0, Math.PI); K.inkFill('#1c3fa8', 1); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(d.x - 20, ROOF + 2); ctx.lineTo(d.x - 6, ROOF + 7); ctx.lineTo(d.x + 18, ROOF + 3); ctx.stroke(); }
  }
  function drawCar(st, k, x, t, braking) {
    const w = S.carW, top = ROOF, bot = GY - 20, cab = k === st.n - 1, L = st.levers[k], band = TUN[st.k % TUN.length].band;
    // body: bright blue above the stripe, a cream skirt below it (so a blue hero running in front still reads)
    const shape = () => { if (cab) { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + w - 30, top); ctx.quadraticCurveTo(x + w + 50, top + 10, x + w + 50, top + 120); ctx.lineTo(x + w + 50, bot); ctx.lineTo(x, bot); ctx.closePath(); } else { ctx.beginPath(); rr(x, top, w, bot - top, 10); } };
    shape(); ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.stroke(); ctx.lineJoin = 'miter'; ctx.fillStyle = '#35b5e8'; ctx.fill();
    ctx.save(); shape(); ctx.clip();
    K.dotFade(x, x + w + 60, top + 60, top + 120, '#1877b8', 8, 0.6);
    ctx.fillStyle = '#ffe9a0'; ctx.fillRect(x - 4, top + 132, w + 60, bot - top);
    K.dotFade(x, x + w + 60, top + 150, bot, '#ffb02e', 7, 0.66);
    ctx.fillStyle = band; ctx.fillRect(x, top + 120, w + (cab ? 50 : 0), 12);
    ctx.fillStyle = INK; ctx.fillRect(x, top + 118, w + 60, 2.5); ctx.fillRect(x, top + 131, w + 60, 2.5);
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(x + 6, top + 6, w - 12, 3);
    ctx.restore();
    // roof ridge and a vent pod
    K.inkRect(x + 4, top - 4, w - 8, 6, '#1877b8', 1.25);
    ctx.beginPath(); rr(x + w * 0.42, top - 12, 70, 10, 4); K.inkFill('#bfeafc', 1.25);
    ctx.fillStyle = INK; for (let j = 0; j < 6; j++) ctx.fillRect(x + w * 0.42 + 6 + j * 10, top - 10, 5, 6);
    // windows with passengers (faces kept readable: no outline on eyes)
    for (let j = 0; j < 4; j++) {
      const wx = x + 30 + j * 92, wy = top + 30, ww = 70, wh = 74;
      if (cab && j === 3) break;
      ctx.fillStyle = INK; rr(wx - 1, wy - 1, ww + 2, wh + 2, 9); ctx.fill();
      ctx.fillStyle = '#fff3a0'; rr(wx + 4, wy + 4, ww - 8, wh - 8, 6); ctx.fill();
      const seed = k * 10 + j, n = 1 + Math.floor(K.hash(seed) * 2);
      for (let q = 0; q < n; q++) {
        const px = wx + 20 + q * 30, wob = Math.sin(t * 9 + seed + q) * (2 + braking), hue = ['#ff5a2e', '#2e7bff', '#2fc45a', '#ff5ab4', '#ffb81e'][Math.floor(K.hash(seed + q * 3) * 5)];
        ctx.beginPath(); rr(px - 9 + wob, wy + 40, 18, 34, 6); K.inkFill(hue, 1);
        circle(px + wob, wy + 32, 8); K.inkFill('#f2c8a0', 1);
        ctx.fillStyle = '#3a2a24'; ctx.beginPath(); ctx.arc(px + wob, wy + 30, 8, Math.PI, 0); ctx.fill();
        if (K.hash(seed + q) < 0.4) { ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(px + 7 + wob, wy + 44); ctx.lineTo(px + 14 + wob + Math.sin(t * 12 + q) * 4, wy + 24); ctx.stroke(); ctx.strokeStyle = '#f2c8a0'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.lineCap = 'butt'; }
        ctx.fillStyle = '#1c1a1a'; circle(px - 3 + wob, wy + 31, 1.4); ctx.fill(); circle(px + 3 + wob, wy + 31, 1.4); ctx.fill();
        ctx.beginPath(); ctx.ellipse(px + wob, wy + 36, 2, 2.6, 0, 0, TAU2); ctx.fill();
      }
      ctx.fillStyle = INK; ctx.fillRect(wx + 3, wy + 12, ww - 6, 2);
      K.dotFade(wx + 4, wx + ww - 4, wy + wh - 30, wy + wh - 4, 'rgba(255,176,46,0.7)', 6, 0.6);
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.moveTo(wx + 8, wy + 8); ctx.lineTo(wx + 22, wy + 8); ctx.lineTo(wx + 8, wy + 30); ctx.fill();
    }
    // doors and the car number
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    ctx.strokeRect(x + w - 64, top + 26, 44, bot - top - 32);
    ctx.beginPath(); ctx.moveTo(x + w - 42, top + 26); ctx.lineTo(x + w - 42, bot - 6); ctx.stroke();
    K.word(String(k + 1), x + 24, top + 108, 18, '#ffffff', { lw: 4 });
    if (cab) {
      // the cab: a driver's window and a flat headlight beam into the dark
      ctx.beginPath(); ctx.moveTo(x + w - 10, top + 30); ctx.lineTo(x + w + 30, top + 40); ctx.lineTo(x + w + 40, top + 100); ctx.lineTo(x + w - 10, top + 100); ctx.closePath(); K.inkFill('#16307a', 1.5);
      ctx.fillStyle = 'rgba(255,248,170,0.3)'; ctx.beginPath(); ctx.moveTo(x + w + 44, top + 150); ctx.lineTo(x + w + 600, top + 40); ctx.lineTo(x + w + 600, top + 260); ctx.closePath(); ctx.fill();
      circle(x + w + 42, top + 150, 9); K.inkFill('#fff6c0', 1.5);
      const on = st.state === 'go' && Math.sin(t * 8) > 0;
      K.word('NO BRAKES!', x + w - 140, top + 150, 18, on ? '#e8222e' : '#7a2a2a', { lw: 3.5, rot: -0.04 });
    }
    // the brake lever on the side, low down, where the speedster can reach it
    const lx = L.x, ly = bot - 6, a = K.lerp(-1.1, 0.9, L.p), next = L === nextLever(st);
    if (next) { // a comic burst behind the next lever instead of a soft glow
      const r = 30 + 4 * Math.sin(t * 10);
      ctx.beginPath(); for (let q = 0; q < 18; q++) { const an = q / 18 * TAU2 + t, r2 = q % 2 ? r * 0.7 : r; ctx.lineTo(lx + Math.cos(an) * r2, ly - 18 + Math.sin(an) * r2); } ctx.closePath(); K.inkFill('#ffe14a', 1.5);
    }
    ctx.beginPath(); rr(lx - 18, ly - 14, 36, 22, 4); K.inkFill('#14121c', 1);
    K.word('BRAKE', lx, ly + 17, 12, '#ffe14a', { lw: 3 });
    ctx.save(); ctx.translate(lx, ly - 4); ctx.rotate(a);
    K.inkRect(-3, -40, 6, 40, '#ffffff', 1.25);
    ctx.beginPath(); rr(-9, -50, 18, 14, 5); K.inkFill(L.done ? '#2fc45a' : '#e8222e', 1.5);
    ctx.restore();
    if (L.p > 0 && !L.done) { ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(lx, ly - 70, 15, -Math.PI / 2, -Math.PI / 2 + TAU2 * L.p); ctx.stroke(); ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 5; ctx.stroke(); ctx.lineCap = 'butt'; }
    if (L.flash > 0) { ctx.globalAlpha = clamp(L.flash * 1.6, 0, 1); ctx.beginPath(); for (let q = 0; q < 16; q++) { const an = q / 16 * TAU2, r2 = q % 2 ? 22 : 44; ctx.lineTo(lx + Math.cos(an) * r2, ly - 30 + Math.sin(an) * r2); } ctx.closePath(); K.inkFill('#ffffff', 1.5); ctx.globalAlpha = 1; }
    // under the car: bogies and spinning wheels, sparks while braking
    for (const bx of [x + 70, x + w - 70]) {
      ctx.beginPath(); rr(bx - 52, bot - 4, 104, 16, 4); K.inkFill('#1c2a6a', 1.25);
      for (const wx of [bx - 30, bx + 30]) {
        circle(wx, bot + 14, 14); K.inkFill('#2a3a8a', 1.5);
        circle(wx, bot + 14, 5); K.inkFill('#ffb02e', 1);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        const rot = -(st.dist + 0) / 14;
        for (let j = 0; j < 3; j++) { const aa = rot + j * TAU2 / 3; ctx.beginPath(); ctx.moveTo(wx + Math.cos(aa) * 6, bot + 14 + Math.sin(aa) * 6); ctx.lineTo(wx + Math.cos(aa) * 12, bot + 14 + Math.sin(aa) * 12); ctx.stroke(); }
        if (L.done && st.v > 10 && Math.sin(t * 40 + wx) > 0.2) { ctx.fillStyle = '#ffe14a'; for (let j = 0; j < 3; j++) { const sx = wx - 16 - j * 8 - K.hash(t * 60 + j + wx) * 6, sy = bot + 22 - j * 3 - K.hash(t * 70 + j) * 6; K.inkRect(sx, sy, 6, 2, '#ffe14a', 0.6); } }
      }
    }
  }
  function drawWalkway(st, t) {
    const cx = st.cam.x, wx = st.dist + cx;
    // the rails and the track bed in front of the wheels: inked sleepers and rails
    K.inkRect(-4, GY - 6, W + 8, 6, '#ffffff', 1.25);
    ctx.fillStyle = '#2a3a8a'; ctx.fillRect(0, GY, W, H - GY);
    K.dotFade(0, W, GY + 20, H, '#0f1650', 8, 0.7, wx);
    ctx.fillStyle = '#ffe14a'; ctx.fillRect(0, GY + 2, W, 6);
    ctx.fillStyle = INK; for (let x = -((wx) % 24); x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, GY + 2); ctx.lineTo(x + 8, GY + 2); ctx.lineTo(x + 2, GY + 8); ctx.lineTo(x - 6, GY + 8); ctx.fill(); }
    ctx.fillRect(0, GY + 8, W, 2.5); ctx.fillRect(0, GY, W, 2.5);
    for (let x = -((wx) % 70); x < W; x += 70) K.inkRect(x, GY + 16, 40, 8, '#c2542a', 1);
    K.inkRect(-4, GY + 30, W + 8, 5, '#5fe0cc', 1.25);
    // streaks on the ground at speed
    streaks(GY + 40, H - 40, 8, t, st.v * 1.3);
  }
  function drawHaz(st, t) {
    for (const h of st.haz) {
      if (h.x < st.cam.x - 80 || h.x > st.cam.x + W + 80) continue;
      if (h.kind === 'crate') {
        const x = h.x - h.w / 2;
        if (h.look === 0) { // a wooden crate
          ctx.fillStyle = INK; ctx.fillRect(x + 4, GY - h.h + 4, h.w, h.h - 4);
          K.inkRect(x, GY - h.h, h.w, h.h, '#ff9a3a', 1.5);
          ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.strokeRect(x + 4, GY - h.h + 4, h.w - 8, h.h - 8);
          ctx.beginPath(); ctx.moveTo(x + 4, GY - h.h + 4); ctx.lineTo(x + h.w - 4, GY - 4); ctx.stroke();
          K.dotFade(x, x + h.w, GY - h.h * 0.5, GY, '#b8501a', 6, 0.6);
        } else if (h.look === 1) { // a signal box with a red light
          ctx.beginPath(); rr(x, GY - h.h, h.w, h.h, 4); K.inkFill('#2fc45a', 1.5);
          circle(x + h.w / 2, GY - h.h + 10, 6); K.inkFill(Math.sin(t * 12) > 0 ? '#ff3a3a' : '#7a1a1a', 1);
          K.inkRect(x, GY - 10, h.w, 4, '#ffe14a', 0.75);
        } else { // a cable drum
          circle(x + h.w / 2, GY - h.h / 2, h.h / 2); K.inkFill('#ff9a3a', 1.5);
          circle(x + h.w / 2, GY - h.h / 2, h.h / 2 - 5); K.inkFill('#2e7bff', 1);
          ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 2; for (let r = 4; r < h.h / 2 - 5; r += 4) { circle(x + h.w / 2, GY - h.h / 2, r); ctx.stroke(); }
        }
      } else {
        // a low pipe hanging from the ceiling, with a warning light at its tip
        const x = h.x - h.w / 2, bot = ROOF - S.pipeBot;
        K.inkRect(x + 6, 78, h.w - 12, bot - 90, '#19a89a', 1.25);
        ctx.fillStyle = '#ffe14a'; for (let y = 90; y < bot - 20; y += 22) ctx.fillRect(x + 6, y, h.w - 12, 8);
        ctx.fillStyle = INK; for (let y = 90; y < bot - 20; y += 22) { ctx.fillRect(x + 6, y, h.w - 12, 1.5); ctx.fillRect(x + 6, y + 7, h.w - 12, 1.5); }
        ctx.beginPath(); rr(x, bot - 16, h.w, 18, 6); K.inkFill('#5fe0cc', 1.5);
        circle(h.x, bot + 3, 4.5); K.inkFill(Math.sin(t * 14) > 0 ? '#ff3a3a' : '#7a1a1a', 1);
      }
    }
  }
  function drawBeam(x, y, rot, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    K.inkRect(-64, -9, 128, 18, '#e8401e', 2);
    ctx.fillStyle = '#ff7a4a'; ctx.fillRect(-64, -9, 128, 4); ctx.fillRect(-64, 5, 128, 4);
    ctx.fillStyle = '#8e1a10'; ctx.fillRect(-64, -2, 128, 4);
    ctx.fillStyle = INK; for (let k = -56; k <= 56; k += 16) { circle(k, -6, 2); ctx.fill(); circle(k, 6, 2); ctx.fill(); }
    ctx.restore();
  }
  function drawTop(st) {
    const cx = st.cam.x, t = st.clock, sh = st.shake * 3 * Math.sin(t * 60);
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, sh * 0.3);
    drawHaz(st, t);
    // tokens: flat gold, ink outline, a white glint
    for (const q of st.toks) {
      if (q.got || q.x < cx - 40 || q.x > cx + W + 40) continue;
      const b = Math.sin(t * 4 + q.x) * 3;
      circle(q.x, q.y + b, 9.5); K.inkFill('#ffd04a', 1.25);
      ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.arc(q.x, q.y + b, 9.5, 0.3, Math.PI - 0.3); ctx.fill();
      K.word('T', q.x, q.y + b + 0.5, 12, '#8a3a0a', { lw: 0 });
      ctx.fillStyle = '#ffffff'; circle(q.x - 4, q.y + b - 4, 1.8); ctx.fill();
    }
    // the roof hero and the girder
    const R = st.run[st.lift], Z = st.run[st.zoom];
    drawHero(st, R, t);
    const b = st.beam;
    if (b) { if (b.state === 'held') drawBeam(R.x, R.y - S.bh - 18 + Math.sin(t * 20) * 1.2, 0); else drawBeam(b.x, b.y, Math.sin(b.t * 9) * 0.06); }
    if (st.flying) drawBeam(st.flying.x, st.flying.y, st.flying.r, clamp(1.4 - st.flying.t, 0, 1));
    ctx.restore();
    // the walkway is nearest of all: the speedster and the crates on it
    drawWalkway(st, t);
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, 0);
    drawCrateFront(st, t);
    drawHero(st, Z, t);
    K.drawParts(st, cx);
    ctx.restore();
    K.drawPops(st, cx, 0);
    K.drawWords(st, cx, 0, st.run);
  }
  // crates are on the walkway, so they are drawn again in front (the roof pass drew pipes)
  function drawCrateFront(st, t) { const keep = st.haz; st.haz = keep.filter(h => h.kind === 'crate'); drawHaz(st, t); st.haz = keep; }
  function drawHero(st, r, t) {
    const zoom = r.job === 'zoom', lift = r.job === 'lift';
    // the roof hero keeps both hands up, braced to catch the next girder; straight up while holding one
    if (zoom && r !== st.run[st.zoom]) return;
    let sy = 1 - r.sq * 0.18, rot = 0;
    if (r.duck) sy = 0.55;
    else if (!r.grounded) rot = r.face * clamp(r.vy / 2000, -0.15, 0.15);
    else if (zoom) rot = 0.12;
    const floor = zoom ? GY : ROOF;
    ctx.fillStyle = 'rgba(20,18,28,0.45)'; ctx.beginPath(); ctx.ellipse(r.x, floor, 13, 4, 0, 0, TAU2); ctx.fill();
    if (zoom && st.v > 20 && r.stun <= 0) {
      // super speed: inked afterimages and streaks behind (the walkway rushes past even when standing still)
      for (let k = 3; k >= 1; k--) { ctx.globalAlpha = 0.14 * (4 - k); K.hero(r.id, r.x - k * 9, r.y, { face: 1, rot: 0.12 }); }
      ctx.globalAlpha = 1;
      K.speedLines(r.x - 6, r.y - 2, 1, t, { n: 5, len: 50 + st.v * 0.08 });
    }
    K.suit(r.id, r.x, r.y, { face: r.pulling ? 1 : r.face, rot, sy, sx: 2 - sy, vy: r.grounded ? 0 : r.vy, stun: r.stun > 0, capeV: zoom ? clamp(0.6 + st.v / 600, 0, 1) : 0.3 + st.v / 1200, arms: lift && r.st === 'hold' ? 'up' : lift && !r.duck && r.stun <= 0 ? 'ready' : null, hands: lift, glow: r.st === 'hold' ? '#ffd25a' : null, kit: zoom ? 'speed' : 'strong' });
    if (zoom && r.stun <= 0) {
      // blurred running legs
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let k = 0; k < 2; k++) { const a = t * 40 + k * Math.PI; ctx.beginPath(); ctx.moveTo(r.x - 3 + k * 6, r.y - 4); ctx.lineTo(r.x - 3 + k * 6 + Math.cos(a) * 7, r.y + 1); ctx.stroke(); }
      ctx.lineCap = 'butt';
    }
    if (r.pulling) K.edge(() => { ctx.beginPath(); ctx.moveTo(r.x + 6, r.y - 16); ctx.lineTo(r.x + 16, r.y - 34); }, PCOL[r.id], 4);
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    K.pills(st);
    const timeX0 = K.counter(st, fmtTime(G.time), '🪙 ' + st.tok + ' / ' + st.totalTok);
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play) return;
    const pl = plan(st), Zn = st.zoom, Rn = st.lift, Z = st.run[Zn], R = st.run[Rn];
    const kk = (id, what) => (K.quiet(id) ? '' : K.key(id, what) + ' ');
    {
      const bx = K.panel(Zn, 'speedster', 236, 58, z), cy = bx.y + 29 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(Zn, 'act') + 'PULL', !!pl.zoom.act && !Z.pulling, Z.pulling, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(Zn, 'up') + 'JUMP', pl.crateT < 0.5, !Z.grounded, z);
    }
    {
      const bx = K.panel(Rn, 'strong hero', 236, 58, z), cy = bx.y + 29 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(Rn, 'act') + 'HOLD', !!st.beam && st.beam.state !== 'held', R.st === 'hold', z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(Rn, 'down') + 'DUCK', pl.pipeT < 0.6 && !st.beam, R.duck, z);
    }
    // the speed dial and the levers, on a cream card
    {
      const x = W / 2, y = H - 32 * z, r = 26 * z, mph = Math.round(st.v / 5.5), u = clamp(st.v / 520, 0, 1);
      K.card(x - 94 * z, y - 30 * z, 188 * z, 48 * z);
      ctx.lineCap = 'butt';
      ctx.strokeStyle = INK; ctx.lineWidth = 8 * z; ctx.beginPath(); ctx.arc(x - 52 * z, y + 4 * z, r * 0.8, Math.PI, 0); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5 * z; ctx.stroke();
      ctx.strokeStyle = u > 0.6 ? '#e8222e' : u > 0.3 ? '#ffb02e' : '#2fc45a'; ctx.beginPath(); ctx.arc(x - 52 * z, y + 4 * z, r * 0.8, Math.PI, Math.PI + Math.PI * u); ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK;
      ctx.font = K.body(15 * z); ctx.fillText(mph + '', x - 52 * z, y - 2 * z);
      ctx.font = K.body(9 * z); ctx.fillText('MPH', x - 52 * z, y + 10 * z);
      const done = st.levers.filter(l => l.done).length;
      ctx.font = K.body(13 * z); ctx.fillText('BRAKES ' + done + '/' + st.n, x + 30 * z, y - 10 * z);
      for (let k = 0; k < st.n; k++) { ctx.fillStyle = st.levers[k].done ? '#2fc45a' : k === done ? '#e8222e' : '#ffffff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; rr(x - 8 * z + k * 14 * z - (st.n - 5) * 7 * z, y + 3 * z, 10 * z, 10 * z, 2 * z); ctx.fill(); ctx.stroke(); }
      if (st.gold > 0) { ctx.font = K.body(12 * z); const gw = ctx.measureText('GOLD BRAKES x' + st.gold).width + 16; K.box(x + 100 * z, y - 14 * z, gw, 20 * z, '#ffe14a', { sh: 2, lw: 2 }); ctx.textAlign = 'left'; ctx.fillStyle = INK; ctx.fillText('GOLD BRAKES x' + st.gold, x + 100 * z + 8, y - 4 * z); }
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
    const P = K.prompter(st), cx = st.cam.x;
    const sx = r => clamp(r.x - cx, 70, W - 70), sy = r => r.y - 46;
    {
      let s = null, col = C.gold, pulse = false;
      if (pl.zoom.jump || pl.crateT < 0.45) { s = 'Jump! ' + K.key(Zn, 'up'); pulse = true; }
      else if (Z.pulling) { s = st.beam && st.beam.state !== 'held' ? 'Keep pulling!' : 'Pull! Keep holding ' + K.key(Zn, 'act'); col = '#d9ffd0'; }
      else if (pl.stage === 'pull' && pl.zoom.act) { s = 'Hold ' + K.key(Zn, 'act') + ' to pull the brake'; pulse = true; }
      else if (pl.stage === 'pull' && !pl.ready) { s = 'Wait for ' + NAMES[Rn] + ' above you'; col = '#ffe7a8'; }
      else if (pl.L && Math.abs(Z.x - pl.L.x) > 40) { s = 'To the red lever ' + K.key(Zn, pl.L.x > Z.x ? 'right' : 'left'); col = '#ffe7a8'; }
      P.say(Zn, s, sx(Z), sy(Z), col, pulse);
    }
    {
      let s = null, col = C.gold, pulse = false;
      const b = st.beam;
      if (b && b.state === 'held') { s = 'Hold it up! ' + K.key(Rn, 'act'); col = '#d9ffd0'; }
      else if (b) { s = Math.abs(R.x - b.x) < S.beamR ? 'Hold ' + K.key(Rn, 'act') + ' to catch!' : 'Under the girder! ' + K.key(Rn, b.x > R.x ? 'right' : 'left'); pulse = true; }
      else if (pl.lift.down || pl.pipeT < 0.5) { s = 'Duck! ' + K.key(Rn, 'down'); pulse = true; }
      else if (pl.L && Math.abs(R.x - pl.L.x) > 40) { s = 'Over the next lever ' + K.key(Rn, pl.L.x > R.x ? 'right' : 'left'); col = '#ffe7a8'; }
      P.say(Rn, s, sx(R), sy(R), col, pulse);
    }
  }

  MODES.subway = {
    S, plan, nextLever,
    medals: { bronze: 'Stop the runaway train', goals: [
      { key: 'time', gold: S.goldT, silver: S.silverT },
      { key: 'bad', gold: 3, silver: 9, text: n => (n ? `${n} or fewer bumps, bonks and dents` : 'No bumps, bonks and dents'), gap: (v, n) => `${Math.max(1, Math.ceil(v - n))} fewer bumps, bonks and dents` },
      { key: 'tokens', gold: 0.7, more: true, pct: true, word: 'the tokens' },
    ] },
    medalValues() { const st = G.mst, s = st.stats; return s ? { bad: s.bumps + s.bonks + s.dents, tokens: st.tok / (st.totalTok || 1) } : {}; },
    setup(st, L) {
      st.stats = { levers: 0, caught: 0, bumps: 0, bonks: 0, dents: 0, helps: 0, roomT: [] };
      st.tok = 0; st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0;
      const def = LEVELS[G.levelIndex];
      st.totalTok = (def.rooms || [def]).reduce((n, r) => n + (r.cars || 0) * 5, 0);
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; st.goldUsed = false; for (const row of L.grid) row.fill('.'); room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.levers) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.levers) drawTop(st); },
    hud() { const st = G.mst; if (st.levers) hud(st); },
    printPage() { if (G.mst.levers) K.page(); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Brakes pulled', value: String(s.levers) },
        { label: 'Girders caught', value: s.caught + '' },
        { label: 'Tokens', value: st.tok + ' of ' + st.totalTok },
      ];
      out.push('Bumps: ' + s.bumps + '. Pipe bonks: ' + s.bonks + '. Dents: ' + s.dents + '. Every passenger got home safe!');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  const acts = z => ({ label: 'pull', labels: z === 0 ? ['pull', 'hold'] : ['hold', 'pull'] });
  HEROCITY.defs.subway = {
    name: 'Runaway Subway', world: 31, kind: 'team', mode: 'subway', ownStep: true, ownHUD: true, ownPills: true, noFalls: true, roomWord: 'Stretch',
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> run <kbd>W</kbd> jump <kbd>S</kbd> duck',
      bo: '<kbd>←</kbd><kbd>→</kbd> run <kbd>↑</kbd> jump <kbd>↓</kbd> duck',
      pad: 'stick runs, <span data-glyph="a"></span> jumps,',
    },
    tip: 'Stop the runaway train! The speedster holds the action at each red brake lever; the strong hero catches the falling girders.',
    act: acts(0),
    map: K.stubMap(),
    rooms: [
      { title: 'Downtown Line', narr: 'A TRAIN WITH NO BRAKES!', zoom: 0, cars: 4, speed: 380, crateGap: 1500, pipeGap: 2300, station: 'Main Street station!', stationName: 'MAIN STREET', act: acts(0),
        tip: 'Pip runs beside the train and holds the action at each red lever. Bo, on the roof, holds the action under the girder!' },
      { title: 'Under the River', narr: 'FASTER, UNDER THE RIVER!', zoom: 1, cars: 5, speed: 410, crateGap: 1350, pipeGap: 2000, station: 'River Park station!', stationName: 'RIVER PARK', act: acts(1),
        tip: 'Swap powers! Bo pulls the brakes, Pip catches girders. Jump the crates, duck the pipes!' },
      { title: 'Express Uptown', narr: 'SIX CARS AND NO BRAKES!', zoom: 0, cars: 6, speed: 440, crateGap: 1250, pipeGap: 1800, station: 'Uptown station!', stationName: 'UPTOWN', act: acts(0),
        tip: 'Six cars and an express! Pull a brake right after a crate goes by.' },
      { title: 'The Last Stop', narr: 'STOP IT BEFORE CITY HALL!', zoom: 1, cars: 6, speed: 470, crateGap: 1150, pipeGap: 1650, station: 'City Hall!', stationName: 'CITY HALL', act: acts(1),
        tip: 'The fastest run yet! Bo on the brakes, Pip holding up the tunnel. Stop it before City Hall!' },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.subwayJump = function (p) { this.tone(p ? 330 : 392, 0.1, 'triangle', 0.035, p ? 520 : 620); };
  Sfx.extra.subwayClack = function (p) { p = p || 1; this.tone(90 * p, 0.05, 'square', 0.012, 70 * p); this.tone(140 * p, 0.04, 'square', 0.01, 100 * p, 0.07); };
  Sfx.extra.subwayGrab = function () { this.tone(300, 0.06, 'square', 0.02, 260); };
  Sfx.extra.subwayClunk = function () { this.tone(140, 0.12, 'square', 0.05, 90); this.tone(70, 0.2, 'sine', 0.06, 50, 0.04); };
  Sfx.extra.subwayScreech = function () { this.tone(2400, 0.5, 'sawtooth', 0.012, 1800); this.tone(2900, 0.4, 'square', 0.006, 2200, 0.05); };
  Sfx.extra.subwayCreak = function () { this.tone(180, 0.4, 'sawtooth', 0.02, 120); this.tone(260, 0.3, 'triangle', 0.02, 200, 0.2); };
  Sfx.extra.subwayDrop = function () { this.tone(800, 0.3, 'sine', 0.025, 200); };
  Sfx.extra.subwayHeave = function () { this.tone(200, 0.16, 'sawtooth', 0.03, 400); this.tone(500, 0.12, 'triangle', 0.03, 760, 0.12); };
  Sfx.extra.subwaySmash = function () { this.tone(400, 0.08, 'square', 0.03, 120); this.tone(220, 0.1, 'triangle', 0.03, 90, 0.04); };
  Sfx.extra.subwayFanfare = function () { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.055, null, i * 0.11)); };
})();
