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
   MEDAL: Gold <= S.goldT with <= 3 bumps+bonks+dents and >= 70% of the tokens; Silver <= S.silverT with <= 9.
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

  /* ---------- drawing ---------- */
  const TUN = [
    { wall: '#2a2f44', wall2: '#22263a', tile: '#3a4060', band: '#c84a3a', lamp: '#ffe6a0' },
    { wall: '#1f3a44', wall2: '#183038', tile: '#2a5a66', band: '#3ac8b0', lamp: '#bff6ff' },
    { wall: '#2e2a44', wall2: '#242038', tile: '#463c66', band: '#ffc53d', lamp: '#fff0c0' },
    { wall: '#3a2a2a', wall2: '#2c2020', tile: '#5a3a36', band: '#ff7a3a', lamp: '#ffd8a0' },
  ];
  function draw(st) {
    const cx = st.cam.x, t = st.clock, P = TUN[st.k % TUN.length], sh = st.shake * 3 * Math.sin(t * 60);
    // the tunnel wall: it streams past (far wall, a little slower than the walkway)
    ctx.fillStyle = P.wall; ctx.fillRect(0, 0, W, H);
    const wx = st.dist * 0.85 + cx * 0.85;
    ctx.fillStyle = P.wall2; for (let x = -((wx * 0.5) % 120) - 120; x < W + 120; x += 120) ctx.fillRect(x, 90, 4, 260);
    // tiled band, lamps, cables
    ctx.fillStyle = P.tile; ctx.fillRect(0, 120, W, 90);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let x = -((wx) % 30); x < W; x += 30) ctx.fillRect(x, 120, 2, 90);
    for (let y = 120; y < 210; y += 22) ctx.fillRect(0, y, W, 2);
    ctx.fillStyle = P.band; ctx.fillRect(0, 158, W, 10);
    ctx.strokeStyle = '#11131c'; ctx.lineWidth = 3;
    for (const y of [222, 230]) { ctx.beginPath(); for (let x = -40; x < W + 40; x += 40) ctx.lineTo(x, y + Math.sin((x + wx) * 0.02) * 4); ctx.stroke(); }
    const lampStep = 360;
    for (let x = -((wx) % lampStep) - lampStep; x < W + lampStep; x += lampStep) {
      ctx.fillStyle = 'rgba(255,240,190,0.12)'; ctx.beginPath(); ctx.moveTo(x + 10, 100); ctx.lineTo(x - 50, 260); ctx.lineTo(x + 70, 260); ctx.fill();
      ctx.fillStyle = '#1a1c26'; rr(x - 6, 92, 32, 12, 3); ctx.fill();
      ctx.fillStyle = P.lamp; rr(x - 2, 96, 24, 6, 3); ctx.fill();
      // station-style name plates now and then
      if (K.hash(Math.round((x + wx) / lampStep)) < 0.25) { ctx.fillStyle = '#f2f2f2'; rr(x + 90, 128, 120, 26, 4); ctx.fill(); text('EXIT ➜', x + 150, 141, 14, '#1c1a36', 'center', 'body'); }
    }
    // station: when stopping, a lit platform slides into view behind the train
    if (st.state !== 'go') {
      const u = st.state === 'end' ? 1 : K.smooth(st.stopT / S.stopT);
      ctx.globalAlpha = u;
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(0, 100, W, 140);
      ctx.fillStyle = '#c8b898'; for (let x = -((wx) % 40); x < W; x += 40) ctx.fillRect(x, 100, 2, 140);
      ctx.fillStyle = P.band; ctx.fillRect(0, 168, W, 14);
      ctx.fillStyle = '#1c2a5a'; rr(W / 2 - 140, 112, 280, 44, 8); ctx.fill();
      text(G.level.def.stationName || 'CITY HALL', W / 2, 135, 24, '#ffffff', 'center');
      ctx.globalAlpha = 1;
    }
    // the ceiling: a dark vault with conduits
    const cg = ctx.createLinearGradient(0, 0, 0, 90);
    cg.addColorStop(0, '#0c0e16'); cg.addColorStop(1, '#1a1d2a');
    ctx.fillStyle = cg; ctx.fillRect(0, 0, W, 90);
    ctx.fillStyle = '#2a2e3c'; ctx.fillRect(0, 70, W, 10);
    const cx2 = st.dist + cx;
    ctx.fillStyle = '#3a3f50'; for (let x = -((cx2) % 200) - 200; x < W + 200; x += 200) { ctx.fillRect(x, 0, 18, 82); ctx.fillStyle = '#4c5266'; ctx.fillRect(x + 2, 0, 4, 82); ctx.fillStyle = '#3a3f50'; }
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, sh * 0.3);
    // the girder warning: cracks and a red ! in the ceiling, and a shadow on the roof
    const b = st.beam;
    if (b && b.state !== 'held') {
      const pulse = 0.6 + 0.4 * Math.sin(t * 18);
      ctx.strokeStyle = '#0a0a10'; ctx.lineWidth = 2;
      ctx.beginPath(); for (const [a1, a2] of [[-50, 20], [-20, 40], [10, 30], [40, 18]]) { ctx.moveTo(b.x + a1 * 0.4, 70); ctx.lineTo(b.x + a1, 80 + a2 * 0.3); ctx.lineTo(b.x + a1 * 1.3, 90 + a2 * 0.2); } ctx.stroke();
      ctx.fillStyle = 'rgba(255,60,50,' + 0.3 * pulse + ')'; ctx.beginPath(); ctx.ellipse(b.x, ROOF + 2, 70 * (b.state === 'fall' ? 1 : 0.6 + 0.4 * b.t / S.warnT), 8, 0, 0, TAU); ctx.fill();
      if (b.state === 'warn') { ctx.fillStyle = '#ff4a3a'; circle(b.x, 112, 18 * pulse + 6); ctx.fill(); text('!', b.x, 113, 26, '#ffffff', 'center'); }
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
      ctx.fillStyle = '#2a2c34'; ctx.fillRect(x - 2, ROOF + 18, S.gapW + 4, 170);
      ctx.fillStyle = '#3c3e48'; for (let j = 0; j < 5; j++) ctx.fillRect(x + 3 + j * 6, ROOF + 22, 3, 162);
      ctx.fillStyle = '#5c616e'; ctx.fillRect(x - 4, ROOF - 2, S.gapW + 8, 8);
    }
    // dents from girders that crashed
    for (const d of st.dents) { ctx.fillStyle = 'rgba(30,30,40,0.6)'; ctx.beginPath(); ctx.ellipse(d.x, ROOF + 4, 26, 6, 0, 0, Math.PI); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(d.x - 20, ROOF + 2); ctx.lineTo(d.x - 6, ROOF + 7); ctx.lineTo(d.x + 18, ROOF + 3); ctx.stroke(); }
  }
  function drawCar(st, k, x, t, braking) {
    const w = S.carW, top = ROOF, bot = GY - 20, cab = k === st.n - 1, L = st.levers[k];
    // body: silver with a coloured stripe
    const g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, '#d8dee8'); g.addColorStop(0.5, '#b4bcca'); g.addColorStop(1, '#8a92a2');
    ctx.fillStyle = g;
    if (cab) { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + w - 30, top); ctx.quadraticCurveTo(x + w + 50, top + 10, x + w + 50, top + 120); ctx.lineTo(x + w + 50, bot); ctx.lineTo(x, bot); ctx.closePath(); ctx.fill(); }
    else { rr(x, top, w, bot - top, 10); ctx.fill(); }
    ctx.fillStyle = TUN[st.k % TUN.length].band; ctx.fillRect(x, top + 120, w + (cab ? 50 : 0), 12);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x + 6, top + 6, w - 12, 3);
    // roof ridges and a vent pod
    ctx.fillStyle = '#8a92a2'; ctx.fillRect(x + 4, top - 4, w - 8, 6);
    ctx.fillStyle = '#9ca4b4'; rr(x + w * 0.42, top - 12, 70, 10, 4); ctx.fill();
    ctx.fillStyle = '#6a7282'; for (let j = 0; j < 6; j++) ctx.fillRect(x + w * 0.42 + 6 + j * 10, top - 10, 5, 6);
    // windows with passengers
    for (let j = 0; j < 4; j++) {
      const wx = x + 30 + j * 92, wy = top + 30, ww = 70, wh = 74;
      if (cab && j === 3) break;
      ctx.fillStyle = '#26304a'; rr(wx, wy, ww, wh, 8); ctx.fill();
      ctx.fillStyle = '#ffe6a6'; rr(wx + 3, wy + 3, ww - 6, wh - 6, 6); ctx.fill();
      // a passenger or two, holding on and wobbling
      const seed = k * 10 + j, n = 1 + Math.floor(K.hash(seed) * 2);
      for (let q = 0; q < n; q++) {
        const px = wx + 20 + q * 30, wob = Math.sin(t * 9 + seed + q) * (2 + braking), hue = ['#d06a4a', '#4a7ad0', '#5aa65a', '#a05ad0', '#d0a04a'][Math.floor(K.hash(seed + q * 3) * 5)];
        ctx.fillStyle = hue; rr(px - 9 + wob, wy + 40, 18, 34, 6); ctx.fill();
        ctx.fillStyle = '#f2c8a0'; circle(px + wob, wy + 32, 8); ctx.fill();
        ctx.fillStyle = '#3a2a24'; ctx.beginPath(); ctx.arc(px + wob, wy + 30, 8, Math.PI, 0); ctx.fill();
        // scared or waving
        if (K.hash(seed + q) < 0.4) { ctx.strokeStyle = '#f2c8a0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px + 7 + wob, wy + 44); ctx.lineTo(px + 14 + wob + Math.sin(t * 12 + q) * 4, wy + 24); ctx.stroke(); }
        ctx.fillStyle = '#1c1a1a'; circle(px - 3 + wob, wy + 31, 1.4); ctx.fill(); circle(px + 3 + wob, wy + 31, 1.4); ctx.fill();
        ctx.beginPath(); ctx.ellipse(px + wob, wy + 36, 2, 2.6, 0, 0, TAU); ctx.fill();
      }
      // the grab rail
      ctx.fillStyle = 'rgba(80,80,90,0.6)'; ctx.fillRect(wx + 3, wy + 12, ww - 6, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(wx + 8, wy + 8); ctx.lineTo(wx + 22, wy + 8); ctx.lineTo(wx + 8, wy + 30); ctx.fill();
    }
    // doors and the car number
    ctx.strokeStyle = '#7a8292'; ctx.lineWidth = 2;
    ctx.strokeRect(x + w - 64, top + 26, 44, bot - top - 32);
    ctx.beginPath(); ctx.moveTo(x + w - 42, top + 26); ctx.lineTo(x + w - 42, bot - 6); ctx.stroke();
    text(String(k + 1), x + 24, top + 116, 14, '#2a3046', 'center', 'body');
    if (cab) {
      // the cab: a driver's window and a headlight beam into the dark
      ctx.fillStyle = '#1a2440'; ctx.beginPath(); ctx.moveTo(x + w - 10, top + 30); ctx.lineTo(x + w + 30, top + 40); ctx.lineTo(x + w + 40, top + 100); ctx.lineTo(x + w - 10, top + 100); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,248,200,0.16)'; ctx.beginPath(); ctx.moveTo(x + w + 44, top + 150); ctx.lineTo(x + w + 600, top + 40); ctx.lineTo(x + w + 600, top + 260); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff6c0'; circle(x + w + 42, top + 150, 9); ctx.fill();
      text('NO BRAKES!', x + w - 140, top + 150, 14, st.state === 'go' && Math.sin(t * 8) > 0 ? '#ff4a3a' : '#5a2a2a', 'center', 'body');
    }
    // the brake lever on the side, low down, where the speedster can reach it
    const lx = L.x, ly = bot - 6, a = K.lerp(-1.1, 0.9, L.p), next = L === nextLever(st);
    ctx.fillStyle = next ? 'rgba(255,80,60,' + (0.25 + 0.2 * Math.sin(t * 10)) + ')' : 'rgba(0,0,0,0)';
    if (next) { circle(lx, ly - 18, 34); ctx.fill(); }
    ctx.fillStyle = '#3a3e4a'; rr(lx - 18, ly - 14, 36, 22, 4); ctx.fill();
    text('BRAKE', lx, ly + 16, 10, '#ffffff', 'center', 'body');
    ctx.save(); ctx.translate(lx, ly - 4); ctx.rotate(a);
    ctx.fillStyle = '#d8dce4'; ctx.fillRect(-3, -40, 6, 40);
    ctx.fillStyle = L.done ? '#5ac85a' : '#e8322a'; rr(-9, -50, 18, 14, 5); ctx.fill();
    ctx.restore();
    if (L.p > 0 && !L.done) { ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(lx, ly - 70, 15, -Math.PI / 2, -Math.PI / 2 + TAU * L.p); ctx.stroke(); }
    if (L.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + L.flash + ')'; circle(lx, ly - 30, 40); ctx.fill(); }
    // under the car: bogies and spinning wheels, sparks while braking
    for (const bx of [x + 70, x + w - 70]) {
      ctx.fillStyle = '#2a2c34'; rr(bx - 52, bot - 4, 104, 16, 4); ctx.fill();
      for (const wx of [bx - 30, bx + 30]) {
        ctx.fillStyle = '#1a1b20'; circle(wx, bot + 14, 14); ctx.fill();
        ctx.strokeStyle = '#6a6e7a'; ctx.lineWidth = 2;
        const rot = -(st.dist + 0) / 14;
        for (let j = 0; j < 3; j++) { const aa = rot + j * TAU / 3; ctx.beginPath(); ctx.moveTo(wx, bot + 14); ctx.lineTo(wx + Math.cos(aa) * 12, bot + 14 + Math.sin(aa) * 12); ctx.stroke(); }
        if (L.done && st.v > 10 && Math.sin(t * 40 + wx) > 0.2) { ctx.fillStyle = '#ffd27a'; for (let j = 0; j < 3; j++) { ctx.fillRect(wx - 16 - j * 8 - Math.random() * 6, bot + 22 - j * 3 - Math.random() * 6, 6, 2); } }
      }
    }
  }
  function drawWalkway(st, t) {
    const cx = st.cam.x, wx = st.dist + cx;
    // the rail and the walkway edge in front of the wheels
    ctx.fillStyle = '#5a5e68'; ctx.fillRect(0, GY - 6, W, 6);
    ctx.fillStyle = '#9aa0ac'; ctx.fillRect(0, GY - 6, W, 2);
    const g = ctx.createLinearGradient(0, GY, 0, H);
    g.addColorStop(0, '#6a6e78'); g.addColorStop(1, '#3a3d46');
    ctx.fillStyle = g; ctx.fillRect(0, GY, W, H - GY);
    ctx.fillStyle = '#ffc53d'; ctx.fillRect(0, GY + 2, W, 6);
    ctx.fillStyle = '#1c1a20'; for (let x = -((wx) % 24); x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, GY + 2); ctx.lineTo(x + 8, GY + 2); ctx.lineTo(x + 2, GY + 8); ctx.lineTo(x - 6, GY + 8); ctx.fill(); }
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = -((wx) % 140); x < W; x += 140) ctx.fillRect(x, GY + 10, 3, H - GY);
    // streaks on the ground at speed
    if (st.v > 60) { ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2; for (let k = 0; k < 6; k++) { const y = GY + 20 + k * 11, x = W - ((wx * 1.3 + k * 211) % (W + 300)); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 120, y); ctx.stroke(); } }
  }
  function drawHaz(st, t) {
    for (const h of st.haz) {
      if (h.x < st.cam.x - 80 || h.x > st.cam.x + W + 80) continue;
      if (h.kind === 'crate') {
        const x = h.x - h.w / 2;
        if (h.look === 0) { // a wooden crate
          ctx.fillStyle = '#b07a3a'; ctx.fillRect(x, GY - h.h, h.w, h.h);
          ctx.strokeStyle = '#6a4420'; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, GY - h.h + 1.5, h.w - 3, h.h - 3);
          ctx.beginPath(); ctx.moveTo(x + 3, GY - h.h + 3); ctx.lineTo(x + h.w - 3, GY - 3); ctx.stroke();
        } else if (h.look === 1) { // a signal box with a red light
          ctx.fillStyle = '#3a4a3a'; rr(x, GY - h.h, h.w, h.h, 4); ctx.fill();
          ctx.fillStyle = Math.sin(t * 12) > 0 ? '#ff3a3a' : '#7a1a1a'; circle(x + h.w / 2, GY - h.h + 10, 6); ctx.fill();
          ctx.fillStyle = '#ffc53d'; ctx.fillRect(x, GY - 10, h.w, 4);
        } else { // a cable drum
          ctx.fillStyle = '#8a5a2a'; circle(x + h.w / 2, GY - h.h / 2, h.h / 2); ctx.fill();
          ctx.fillStyle = '#3a3a46'; circle(x + h.w / 2, GY - h.h / 2, h.h / 2 - 5); ctx.fill();
          ctx.strokeStyle = '#d0a040'; ctx.lineWidth = 2; for (let r = 4; r < h.h / 2 - 5; r += 4) { circle(x + h.w / 2, GY - h.h / 2, r); ctx.stroke(); }
        }
      } else {
        // a low pipe hanging from the ceiling, with a warning light at its tip
        const x = h.x - h.w / 2, bot = ROOF - S.pipeBot;
        ctx.fillStyle = '#4a5060'; ctx.fillRect(x + 6, 78, h.w - 12, bot - 90);
        ctx.fillStyle = '#6a7284'; rr(x, bot - 16, h.w, 18, 6); ctx.fill();
        ctx.fillStyle = '#ffc53d'; for (let y = 90; y < bot - 20; y += 22) ctx.fillRect(x + 6, y, h.w - 12, 8);
        ctx.fillStyle = Math.sin(t * 14) > 0 ? '#ff4a3a' : '#7a1a1a'; circle(h.x, bot + 3, 4); ctx.fill();
      }
    }
  }
  function drawBeam(x, y, rot, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.fillStyle = '#b8462e'; ctx.fillRect(-64, -9, 128, 18);
    ctx.fillStyle = '#d8643e'; ctx.fillRect(-64, -9, 128, 4); ctx.fillRect(-64, 5, 128, 4);
    ctx.fillStyle = '#7a2a1c'; ctx.fillRect(-64, -2, 128, 4);
    ctx.fillStyle = '#4a1a10'; for (let k = -56; k <= 56; k += 16) { circle(k, -6, 1.8); ctx.fill(); circle(k, 6, 1.8); ctx.fill(); }
    ctx.restore();
  }
  function drawTop(st) {
    const cx = st.cam.x, t = st.clock, sh = st.shake * 3 * Math.sin(t * 60);
    ctx.save(); ctx.translate(-Math.round(cx * 10) / 10, sh * 0.3);
    drawHaz(st, t);
    // tokens
    for (const q of st.toks) {
      if (q.got || q.x < cx - 40 || q.x > cx + W + 40) continue;
      const b = Math.sin(t * 4 + q.x) * 3;
      ctx.fillStyle = 'rgba(255,224,138,0.3)'; circle(q.x, q.y + b, 13); ctx.fill();
      ctx.fillStyle = '#ffd04a'; circle(q.x, q.y + b, 9); ctx.fill();
      ctx.strokeStyle = '#b8862a'; ctx.lineWidth = 2; circle(q.x, q.y + b, 9); ctx.stroke();
      text('T', q.x, q.y + b + 0.5, 11, '#8a5a1a', 'center');
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
    // a dark vignette at the edges, faster and redder when the train is going fast
    const sp = clamp(st.v / 500, 0, 1);
    const vg = ctx.createLinearGradient(0, 0, W, 0);
    vg.addColorStop(0, 'rgba(0,0,0,' + (0.35 + 0.2 * sp) + ')'); vg.addColorStop(0.15, 'rgba(0,0,0,0)'); vg.addColorStop(0.85, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,' + (0.35 + 0.2 * sp) + ')');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    K.drawPops(st, cx, 0);
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
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(r.x, floor, 13, 4, 0, 0, TAU); ctx.fill();
    if (zoom && st.v > 20 && r.stun <= 0) {
      // super speed: afterimages and streaks behind (the walkway rushes past even when standing still)
      for (let k = 3; k >= 1; k--) { ctx.globalAlpha = 0.12 * (4 - k); K.hero(r.id, r.x - k * 9, r.y, { face: 1, rot: 0.12 }); }
      ctx.globalAlpha = 1;
      K.speedLines(r.x - 6, r.y - 2, 1, t, { n: 5, len: 50 + st.v * 0.08, col: PCOL[r.id] });
    }
    K.suit(r.id, r.x, r.y, { face: r.pulling ? 1 : r.face, rot, sy, sx: 2 - sy, vy: r.grounded ? 0 : r.vy, stun: r.stun > 0, capeV: zoom ? clamp(0.6 + st.v / 600, 0, 1) : 0.3 + st.v / 1200, arms: lift && r.st === 'hold' ? 'up' : lift && !r.duck && r.stun <= 0 ? 'ready' : null, hands: lift, glow: r.st === 'hold' ? 'rgba(255,210,90,0.45)' : null });
    if (zoom && r.stun <= 0) {
      // blurred running legs
      ctx.strokeStyle = PDARK[r.id]; ctx.lineWidth = 3;
      for (let k = 0; k < 2; k++) { const a = t * 40 + k * Math.PI; ctx.beginPath(); ctx.moveTo(r.x - 3 + k * 6, r.y - 4); ctx.lineTo(r.x - 3 + k * 6 + Math.cos(a) * 7, r.y + 1); ctx.stroke(); }
    }
    if (r.pulling) {
      ctx.strokeStyle = PCOL[r.id]; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(r.x + 6, r.y - 16); ctx.lineTo(r.x + 16, r.y - 34); ctx.stroke();
    }
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = '🪙 ' + st.tok + ' / ' + st.totalTok;
      ctx.font = FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, cy, fs, '#ffe08a', 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play) return;
    const pl = plan(st), Zn = st.zoom, Rn = st.lift, Z = st.run[Zn], R = st.run[Rn];
    const kk = (id, what) => (K.quiet(id) ? '' : K.key(id, what) + ' ');
    {
      const bx = K.panel(Zn, 'speedster', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(Zn, 'act') + 'PULL', !!pl.zoom.act && !Z.pulling, Z.pulling, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(Zn, 'up') + 'JUMP', pl.crateT < 0.5, !Z.grounded, z);
    }
    {
      const bx = K.panel(Rn, 'strong hero', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(Rn, 'act') + 'HOLD', !!st.beam && st.beam.state !== 'held', R.st === 'hold', z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, kk(Rn, 'down') + 'DUCK', pl.pipeT < 0.6 && !st.beam, R.duck, z);
    }
    // the speed dial and the levers
    {
      const x = W / 2, y = H - 30 * z, r = 26 * z, mph = Math.round(st.v / 5.5), u = clamp(st.v / 520, 0, 1);
      ctx.fillStyle = 'rgba(20,22,52,0.88)'; rr(x - 94 * z, y - 30 * z, 188 * z, 48 * z, 14 * z); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 5 * z; ctx.beginPath(); ctx.arc(x - 52 * z, y + 4 * z, r * 0.8, Math.PI, 0); ctx.stroke();
      ctx.strokeStyle = u > 0.6 ? '#ff5a4a' : u > 0.3 ? '#ffb04a' : '#8fe3b0'; ctx.beginPath(); ctx.arc(x - 52 * z, y + 4 * z, r * 0.8, Math.PI, Math.PI + Math.PI * u); ctx.stroke();
      text(mph + '', x - 52 * z, y - 2 * z, 14 * z, '#ffffff', 'center', 'body');
      text('mph', x - 52 * z, y + 10 * z, 9 * z, '#aab', 'center', 'body');
      const done = st.levers.filter(l => l.done).length;
      text('Brakes ' + done + '/' + st.n, x + 30 * z, y - 10 * z, 13 * z, '#ffffff', 'center', 'body');
      for (let k = 0; k < st.n; k++) { ctx.fillStyle = st.levers[k].done ? '#5ac85a' : k === done ? '#ff5a4a' : 'rgba(255,255,255,0.25)'; rr(x - 8 * z + k * 14 * z - (st.n - 5) * 7 * z, y + 3 * z, 10 * z, 10 * z, 3 * z); ctx.fill(); }
      if (st.gold > 0) text('gold brakes x' + st.gold, x + 100 * z, y - 4 * z, 12 * z, C.gold, 'left', 'body');
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
  const medal = (t, bad, frac) => K.medal(t <= S.goldT && bad <= 3 && frac >= 0.7, t <= S.silverT && bad <= 9);

  MODES.subway = {
    S, plan, medal, nextLever,
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
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const bad = s.bumps + s.bonks + s.dents, frac = st.tok / (st.totalTok || 1);
      const out = [
        { label: 'Brakes pulled', value: String(s.levers) },
        { label: 'Girders caught', value: s.caught + '' },
        { label: 'Tokens', value: st.tok + ' of ' + st.totalTok },
        { label: 'Medal', value: medal(G.time, bad, frac) },
      ];
      out.push('Bumps: ' + s.bumps + '. Pipe bonks: ' + s.bonks + '. Dents: ' + s.dents + '. Every passenger got home safe!');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  const acts = z => ({ label: 'pull', labels: z === 0 ? ['pull', 'hold'] : ['hold', 'pull'] });
  HEROCITY.defs.subway = {
    name: 'Runaway Subway', world: 31, kind: 'team', mode: 'subway', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> run <kbd>W</kbd> jump <kbd>S</kbd> duck',
      bo: '<kbd>←</kbd><kbd>→</kbd> run <kbd>↑</kbd> jump <kbd>↓</kbd> duck',
      pad: 'stick runs, <span data-glyph="a"></span> jumps,',
    },
    tip: 'Stop the runaway train! The speedster holds the action at each red brake lever; the strong hero catches the falling girders.',
    act: acts(0),
    map: K.stubMap(),
    rooms: [
      { title: 'Downtown Line', zoom: 0, cars: 4, speed: 380, crateGap: 1500, pipeGap: 2300, station: 'Main Street station!', stationName: 'MAIN STREET', act: acts(0),
        tip: 'Pip runs beside the train and holds the action at each red lever. Bo, on the roof, holds the action under the girder!' },
      { title: 'Under the River', zoom: 1, cars: 5, speed: 410, crateGap: 1350, pipeGap: 2000, station: 'River Park station!', stationName: 'RIVER PARK', act: acts(1),
        tip: 'Swap powers! Bo pulls the brakes, Pip catches girders. Jump the crates, duck the pipes!' },
      { title: 'Express Uptown', zoom: 0, cars: 6, speed: 440, crateGap: 1250, pipeGap: 1800, station: 'Uptown station!', stationName: 'UPTOWN', act: acts(0),
        tip: 'Six cars and an express! Pull a brake right after a crate goes by.' },
      { title: 'The Last Stop', zoom: 1, cars: 6, speed: 470, crateGap: 1150, pipeGap: 1650, station: 'City Hall!', stationName: 'CITY HALL', act: acts(1),
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
