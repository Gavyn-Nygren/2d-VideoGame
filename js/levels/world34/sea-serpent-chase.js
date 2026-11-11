/* Pip & Bo - Level 34-1 Sea Serpent Chase (team, World 34 Viking Voyage). */
'use strict';

/* ===== 34-1 Sea Serpent Chase (mode 'serpentchase', team, scrolls right over open sea, Gavyn's pick) =====
   A sea serpent as long as the screen hunts the longship. One hero steers through its coils, the other mans the harpoon
   ballista on the stern and makes it flinch before it bites. Jobs swap every stretch.
   Side view; the sea scrolls right to left past the ship (everything is in screen px; st.dist is how far we've sailed).
   The ship sits left of centre and moves inside a window (S.winL..S.winR) and up/down across three wave rows (depth
   bands S.rowY, 0 = far, 2 = near). The mode owns the tick, the picture and the HUD (ownStep + ownHUD + noFalls).
   THE HELM (G.mst.helm): ▲ / ▼ change row (0.2 s), ◀ ▶ ease back or surge inside the window. Action = "Row!": a 1.2 s
     burst (every oar digs in) on a 6 s cooldown; it shoots the ship through a closing coil and wins a little gap.
   THE HARPOONER: ◀ ▶ swing the stern ballista through 7 aims, from low-behind (0) through straight up (3) to low-ahead
     (6). HOLD the action to crank (0.5 s to full), let go to fire. A full crank flies flat and fast; a short crank lobs
     and falls short. 0.5 s reload. A dotted line shows where the bolt will fly.
   THE SERPENT (threats, each with a tell):
     LUNGE: the head rises behind the stern, eyes glow, jaws open for S.tellT (the tell): a bolt in the open mouth makes it
       flinch and sink (gap +). Otherwise it snaps along its row: the helm must have the ship in another row, or be
       mid-Row!. A bite costs gap and a chunk of the stern rail.
     COIL: a foam line shows 1.2 s before body coils rise across one or two rows ahead. Pick an open row.
     ARCH (stretch 3 on): a loop of body rises across every row; you can pass under while it's open, but it closes
       slowly: Row! through it.
     TAIL: the tail lifts ahead with its tip high, a shadow on the water marks the row it will slam 0.9 s later. Shoot
       the tail tip and it misses; otherwise the helm dodges.
     SPIT (stretch 2 on): the head, ahead to the side, spits a water glob at the deck (a ring shows where): shoot it out
       of the air (any crank) or the deck is swamped (the helm is sluggish for 2 s).
     DIVE (stretch 3 on): bubbles show where it will burst up 1.4 s later. Steer off them. As it rears, its throat
       glows for 1 s: a bolt there is worth double.
     ROCKS (Skerries and the Maelstrom): steer round them.
   WEAK SPOTS: glowing scales on the humps rolling past far out: 20 in the level ("Scales"), something for the harpooner
     to aim at between attacks. Only mouth, throat, tail tip, globs and scales count; bolts clang off the hide.
   GAP METER (st.gap, 0..100): bites, crashes, slaps and bursts cost gap and show on the ship (shields knocked off, a
     torn sail, a bitten rail). Clean sailing wins it back slowly; a mouth shot wins a chunk. Gap 0: CHOMP! the serpent
     wraps the ship, lifts it and drops it back at the start of the stretch (a Swallowed). No game over.
   STRETCHES (rooms, about 40 s each): Open Water, The Skerries, Fog Bank (short sight: foam lines and glowing eyes are
     the warnings), The Maelstrom (a whirlpool drags the ship a row nearer every few seconds; ends with a full-crank shot down the
     throat that sends the serpent under for good, and the ship sails into a fjord).
   GOLD HELP (only while both are playing, announced, counted): 3 hits in a stretch = a gold harpoon: the next 3 bolts
     fly at full crank the instant the action is pressed, and lunge tells last 0.4 s longer for the rest of the stretch.
   IDLE: no person presses anything for 12 s: "Taking a break", the sea and the serpent wait and the clock stops.
   MEDAL: by time. Gold <= 180 s, Silver <= 310 s.
   MODES.serpentchase.plan(st) says what each job should do now (the prompts, HUD chips and the computer brain read it).
   Everything lives inside this block; sounds are Sfx.extra.serpentchase*. */
(() => {
  const K = VIKING, TAU = Math.PI * 2;
  const S = {
    rowY: [318, 368, 418], rowSc: [0.8, 0.9, 1], winL: 230, winR: 470, burstR: 600, v: 170, rowT: 0.2, swampRowT: 0.5,
    helmV: 170, burstT: 1.2, burstV: 300, rowCd: 6, aimN: 7, crankT: 0.5, reload: 0.5, tellT: 1.1, goldTell: 0.4,
    riseT: 0.55, snapT: 0.3, foamT: 1.2, tailT: 0.9, diveT: 1.4, rearT: 1.0, spitAim: 0.6, spitFly: 1.35, swampT: 2,
    gap0: 72, regen: 1.3, pace: 0.9, hullHalf: 104, idleWait: 12, goldT: 180, silverT: 310,
    cost: { bite: 24, coil: 14, slap: 16, dive: 18, rock: 12 }, gain: { mouth: 10, throat: 20, tail: 4, row: 4, glob: 2 },
  };
  // aim angles in degrees (0 = straight ahead, 90 = straight up; 180 = straight back)
  const AIMS = [196, 160, 124, 90, 56, 22, -8];
  const rowY = r => K.lerp(S.rowY[0], S.rowY[2], r / 2);
  const rowSc = r => K.lerp(S.rowSc[0], S.rowSc[2], r / 2);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  /* ---------- the ship and the ballista ---------- */
  function geom(st) {
    const sh = st.ship, y = rowY(sh.ry), sc = rowSc(sh.ry);
    return { x: sh.x, y, sc, deck: y - 22 * sc, bx: sh.x - 80 * sc, by: y - 40 * sc, half: S.hullHalf * sc };
  }
  const boltSpeed = c => 380 + 640 * c;
  const boltGrav = c => 120 + 820 * (1 - c) * (1 - c);
  function aimDir(k) { const a = AIMS[k] * Math.PI / 180; return { x: Math.cos(a), y: -Math.sin(a) }; }

  /* ---------- a stretch (one room) ---------- */
  function room(st, L, k) {
    const def = L.def;
    st.k = k; st.helm = def.helm || 0; st.harp = 1 - st.helm; st.title = def.title || '';
    st.fog = !!def.fog; st.whirl = !!def.whirl; st.skerries = !!def.rocks;
    st.dur = (def.dur || 38) * S.pace;
    st.goldUsed = false; st.goldBolts = 0; st.tellBonus = 0;
    labels(st);
    startStretch(st);
    K.fx(st);
  }
  function startStretch(st) {
    st.ship = { x: 300, ry: 1, row: 1, vx: 0, burst: 0, cd: 0, swamp: 0, hitT: 0, bob: 0, shields: K.SHIELD_COLS.concat(K.SHIELD_COLS).slice(0, 7), torn: 0, bitten: 0, lift: 0 };
    st.aim = 3; st.crank = 0; st.reload = 0; st.cranking = false; st.aimRep = 0;
    st.bolts = []; st.threats = []; st.T = 0; st.dist = st.dist || 0;
    st.gap = S.gap0; st.lastHit = -9; st.state = 'go'; st.endT = 0; st.chompT = 0;
    st.rc = { bad: 0 }; st.segStart = G.time;
    st.events = script(st.k);
    st.ev = 0; st.prevDown = [false, false];
    st.whirlT = 3.5;
    st.boss = null; st.party = false; st.cleared = false;
  }
  function labels(st) { const w = []; w[st.helm] = 'row'; w[st.harp] = 'fire'; K.actLabels(w, 'fire'); }

  /* the stretch's script: [time, kind, options] in seconds from the start of the stretch */
  function script(k) {
    const ev = [];
    const add = (t, kind, o) => ev.push(Object.assign({ t, kind }, o || {}));
    const rows = n => { const a = [0, 1, 2].sort(() => Math.random() - 0.5); return a.slice(0, n).sort(); };
    if (k === 0) {
      for (const t of [4, 11, 18, 25, 32]) add(t, 'lunge');
      for (const t of [7.5, 14.5, 21.5, 28.5, 35]) add(t, 'coil', { rows: rows(1) });
      for (const t of [2, 9, 16, 23, 29.5]) add(t, 'hump');
    } else if (k === 1) {
      for (const t of [5.5, 15, 24, 33]) add(t, 'tail');
      for (const t of [10, 19.5, 29]) add(t, 'spit');
      for (const t of [12.5, 27]) add(t, 'lunge');
      for (const t of [18, 31]) add(t, 'coil', { rows: rows(1) });
      for (const t of [3, 11, 17.5, 25.5, 34]) add(t, 'hump');
      for (let t = 2; t < 36; t += rnd(2.6, 3.4)) add(t, 'rock', { row: Math.floor(Math.random() * 3) });
    } else if (k === 2) {
      for (const t of [5, 13, 22, 31]) add(t, 'dive');
      for (const t of [9, 26]) add(t, 'lunge');
      for (const t of [17, 35]) add(t, 'arch', { rows: [0, 1, 2] });
      for (const t of [11, 29]) add(t, 'coil', { rows: rows(2) });
      add(20, 'tail'); for (const t of [15, 33]) add(t, 'spit');
      for (const t of [3, 10, 18.5, 24.5, 32]) add(t, 'hump');
    } else {
      for (const t of [4, 14, 24]) add(t, 'lunge');
      for (const t of [7, 19, 30]) add(t, 'coil', { rows: rows(Math.random() < 0.5 ? 1 : 2) });
      for (const t of [11, 27]) add(t, 'arch', { rows: [0, 1, 2] });
      for (const t of [9, 21]) add(t, 'tail');
      for (const t of [16, 28]) add(t, 'spit');
      for (const t of [12.5, 33]) add(t, 'dive');
      for (const t of [2.5, 17.5, 34.5]) add(t, 'rock', { row: Math.floor(Math.random() * 3) });
      for (const t of [2, 9.5, 18, 25, 31]) add(t, 'hump');
      add(38, 'boss');
    }
    // (the stretch runs a little quicker than the numbers above: Gold 180 s leaves time for a slip)
    for (const e of ev) e.t *= S.pace;
    return ev.sort((a, b) => a.t - b.t);
  }

  /* ---------- spawning threats ---------- */
  function spawn(st, e) {
    const g = geom(st), v = S.v, sh = st.ship;
    // a dive or a tail never lands while a coil blocks two rows nearby (there would be nowhere to steer): it waits
    if ((e.kind === 'dive' || e.kind === 'tail') && st.threats.some(q => (q.kind === 'coil' || q.kind === 'arch') && !q.hit && (q.rows.length >= 2) && q.x + q.w > sh.x - g.half - 40 && q.x < sh.x + 760)) { e.t += 0.6; return false; }
    const ahead = (sec, extra) => sh.x + S.hullHalf + v * sec + (extra || 0);
    if (e.kind === 'lunge') st.threats.push({ kind: 'lunge', state: 'rise', t: 0, row: sh.row, x: sh.x - 190, y: rowY(sh.row) + 40 });
    else if (e.kind === 'coil') {
      // keep a row free of rocks in the way
      st.threats.push({ kind: 'coil', state: 'foam', t: 0, rows: e.rows, x: ahead(S.foamT + 0.8, 40), w: 74 });
      for (const r of st.threats) if (r.kind === 'rock' && Math.abs(r.x - ahead(S.foamT + 0.8, 40)) < 300 && e.rows.length === 2 && !e.rows.includes(r.row) && !r.hit) r.gone = true;
    } else if (e.kind === 'arch') st.threats.push({ kind: 'arch', state: 'foam', t: 0, rows: e.rows, x: ahead(S.foamT + 0.45, 30), w: 46, open: 1 });
    else if (e.kind === 'rock') {
      // never a rock on top of a coil row block that leaves no row free
      const x = W + 80, near = st.threats.filter(q => (q.kind === 'coil' || q.kind === 'arch') && Math.abs(q.x - x) < 320);
      let row = e.row;
      for (const q of near) if (q.rows.length >= 2) { const free = [0, 1, 2].find(r => !q.rows.includes(r)); if (row === free) row = (row + 1) % 3; }
      if (near.some(q => q.rows.length === 3)) return;
      st.threats.push({ kind: 'rock', x, row, w: 64, seed: Math.random() });
    } else if (e.kind === 'tail') st.threats.push({ kind: 'tail', state: 'shadow', t: 0, row: sh.row, x: sh.x + v * S.tailT + 10 });
    else if (e.kind === 'spit') st.threats.push({ kind: 'spit', state: 'aim', t: 0, hx: Math.min(W - 60, sh.x + 400), hy: rowY(0) - 30 });
    else if (e.kind === 'dive') st.threats.push({ kind: 'dive', state: 'bubbles', t: 0, row: sh.row, x: sh.x + v * S.diveT + 20 });
    else if (e.kind === 'hump') st.threats.push({ kind: 'hump', x: W + 120, y: 268, scale: true, sx: 0, sy: 0 });
    else if (e.kind === 'boss') { st.boss = { state: 'rise', t: 0, x: W + 40, hit: false }; Sfx.play('vikingRoar'); K.msg(st, 'The serpent rears up ahead! Crank a FULL bolt down its throat!', '#ffe7a8', 4); }
    if (e.kind === 'lunge') Sfx.play('vikingHiss');
  }

  /* ---------- the tick ---------- */
  const NOIN = NO_INPUT;
  function tick(st, dt) {
    if (!st.ship) return;
    K.track(st);
    st.waiting = st.state === 'go' && K.idle(st, dt, S.idleWait);
    const live = G.introT <= 0 && !st.waiting && st.state === 'go';
    st.clock += dt;
    if (live) {
      st.T += dt; st.dist += S.v * dt;
      while (st.ev < st.events.length && st.events[st.ev].t <= st.T) {
        const e = st.events[st.ev];
        if (spawn(st, e) === false) { st.events.sort((a, b) => a.t - b.t); break; }
        st.ev++;
      }
      helm(st, dt); harpoon(st, dt);
      threats(st, dt); bolts(st, dt);
      if (st.whirl) whirl(st, dt);
      // the gap slowly comes back while sailing clean
      if (G.time - st.lastHit > 3) st.gap = Math.min(100, st.gap + S.regen * dt);
      if (st.gap <= 0) chomp(st);
      // end of the stretch: past the script and nothing left to dodge
      if (st.k < 3 && st.ev >= st.events.length && st.T >= st.dur && !st.threats.some(q => q.kind !== 'hump' && q.kind !== 'rock' && !q.gone)) endStretch(st);
    } else if (st.state === 'chomp') chompStep(st, dt);
    else if (st.state === 'end') endStep(st, dt);
    if (!st.waiting && G.introT <= 0 && st.state !== 'chomp') { for (const q of st.threats) if (q.kind === 'hump' || q.kind === 'rock') { if (st.state !== 'go') q.x -= S.v * dt; } }
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    st.ship.bob += dt;
    K.tickFx(st, dt);
    mirror(st);
  }
  function helm(st, dt) {
    const sh = st.ship, p = G.players[st.helm], i = p.input;
    if (sh.cd > 0) sh.cd -= dt;
    if (sh.swamp > 0) sh.swamp -= dt;
    if (sh.hitT > 0) sh.hitT -= dt;
    const downEdge = i.down && !st.prevDown[st.helm];
    st.prevDown[st.helm] = i.down;
    if (p.pendingJump && sh.row > 0) { sh.row--; Sfx.play('vikingOar', 1.2); }
    if (downEdge && sh.row < 2) { sh.row++; Sfx.play('vikingOar', 0.9); }
    const rs = 1 / (sh.swamp > 0 ? S.swampRowT : S.rowT);
    sh.ry = approach(sh.ry, sh.row, rs * dt);
    if (p.pendingAct) {
      if (sh.cd <= 0) {
        sh.burst = S.burstT; sh.cd = S.rowCd; st.gap = Math.min(100, st.gap + S.gain.row); st.stats.rows++;
        Sfx.play('serpentchaseRow'); K.pop(st, sh.x, rowY(sh.ry) - 120, 'ROW!', PCOL[st.helm], 26);
      } else K.hint(st, st.helm, 'Oars still resting... ' + Math.ceil(sh.cd) + ' s', 1.2);
    }
    const want = (i.right ? 1 : 0) - (i.left ? 1 : 0), top = sh.swamp > 0 ? S.helmV * 0.5 : S.helmV;
    if (sh.burst > 0) {
      sh.burst -= dt;
      sh.vx = S.burstV;
      if (Math.random() < 0.5) K.splash(st, sh.x - 60 + Math.random() * 120, rowY(sh.ry) + 6, 1);
    } else {
      let tv = want * top;
      if (sh.x > S.winR && want >= 0) tv = -120; // drifting back into the window after a burst
      sh.vx = approach(sh.vx, tv, 900 * dt);
    }
    sh.x = clamp(sh.x + sh.vx * dt, S.winL, sh.burst > 0 ? S.burstR : Math.max(S.winR, sh.x));
  }
  function harpoon(st, dt) {
    const p = G.players[st.harp], i = p.input;
    if (st.reload > 0) st.reload -= dt;
    // ◀ ▶ step the aim (holding repeats)
    const want = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    if (want) {
      if (st.aimRep <= 0) { st.aim = clamp(st.aim + want, 0, S.aimN - 1); st.aimRep = st.aimHeld ? 0.16 : 0.3; Sfx.play('serpentchaseCreak'); }
      st.aimRep -= dt; st.aimHeld = true;
    } else { st.aimRep = 0; st.aimHeld = false; }
    if (st.goldBolts > 0 && p.pendingAct && st.reload <= 0) { fire(st, 1, true); st.goldBolts--; st.cranking = false; st.crank = 0; return; }
    if (i.act && st.reload <= 0 && st.goldBolts <= 0) {
      if (!st.cranking) { st.cranking = true; st.crank = 0; }
      st.crank = Math.min(1, st.crank + dt / S.crankT);
      if (Math.random() < 0.08) Sfx.play('serpentchaseCreak');
    } else if (st.cranking) {
      st.cranking = false;
      fire(st, Math.max(0.12, st.crank), false);
      st.crank = 0;
    }
  }
  function fire(st, c, gold) {
    const g = geom(st), d = aimDir(st.aim), sp = boltSpeed(c);
    st.bolts.push({ x: g.bx + d.x * 22, y: g.by + d.y * 22, vx: d.x * sp, vy: d.y * sp, g: boltGrav(c), c, t: 0, gold });
    st.reload = S.reload; st.stats.shots++; st.shotMemo = null;
    Sfx.play('serpentchaseFire', c);
  }
  function hitShip(st, kind, x) {
    const sh = st.ship;
    if (sh.hitT > 0) return false;
    sh.hitT = 1.0;
    (st.hitLog = st.hitLog || []).push([st.k, +st.T.toFixed(1), kind, sh.row, +sh.ry.toFixed(2), Math.round(sh.x), Math.round(x || 0)]);
    st.gap = Math.max(0, st.gap - S.cost[kind]); st.lastHit = G.time; st.rc.bad++;
    st.stats[kind === 'bite' ? 'bites' : kind === 'slap' ? 'slaps' : kind === 'dive' ? 'bursts' : 'crashes']++;
    // the damage shows: a shield knocked off, a rip in the sail, a bite out of the rail
    const left = sh.shields.map((s, k) => s ? k : -1).filter(k => k >= 0);
    if (left.length) sh.shields[pick(left)] = null;
    if (kind === 'bite') sh.bitten = Math.min(1, sh.bitten + 0.5);
    else sh.torn = Math.min(1, sh.torn + 0.35);
    G.shake = Math.max(G.shake || 0, 0.4);
    const g = geom(st);
    K.pop(st, x || sh.x, g.y - 120, kind === 'bite' ? 'CHOMP!' : kind === 'slap' ? 'WHAM!' : kind === 'dive' ? 'SPLOOSH!' : 'CRUNCH!', '#ffb0a0', 28);
    K.splash(st, x || sh.x, g.y, 14);
    Sfx.play(kind === 'bite' ? 'vikingRoar' : 'vikingClang'); Sfx.play('vikingSplash');
    if (st.rc.bad === 1) K.msg(st, kind === 'bite' ? 'A bite! Shoot into the open mouth, or steer out of its row.' : kind === 'slap' ? 'Tail slap! Watch the shadow on the water and steer off it.' : 'Ouch! Every hit lets the serpent catch up.', '#ffd0c8', 3);
    if (st.rc.bad >= 3 && !st.goldUsed && K.both(st)) {
      st.goldUsed = true; st.goldBolts = 3; st.tellBonus = S.goldTell;
      K.goldHelp(st, 'Gold harpoon! The next 3 bolts fly at full crank in a flash, and the serpent shows its jaws longer');
    }
    return true;
  }
  const shipRow = st => Math.round(st.ship.ry);
  const overlaps = (st, x, w) => Math.abs(x - st.ship.x) < geom(st).half + w / 2 - 8;
  function threats(st, dt) {
    const sh = st.ship, v = S.v;
    for (const q of st.threats) {
      if (q.gone) continue;
      q.t = (q.t || 0) + dt;
      if (q.kind === 'lunge') {
        const tell = S.tellT + st.tellBonus;
        // the head trails the ship's stern, in the row it rose in
        const want = sh.x - 190 * rowSc(q.row);
        if (q.state !== 'snap') q.x = K.lerp(q.x, want, Math.min(1, dt * 4));
        if (q.state === 'rise') { q.y = K.lerp(rowY(q.row) + 40, rowY(q.row) - 52, K.smooth(q.t / S.riseT)); if (q.t >= S.riseT) { q.state = 'tell'; q.t = 0; Sfx.play('vikingHiss'); } }
        else if (q.state === 'tell') { q.y = rowY(q.row) - 52 + Math.sin(q.t * 7) * 3; if (q.t >= tell) { q.state = 'snap'; q.t = 0; q.x0 = q.x; } }
        else if (q.state === 'snap') {
          q.x = q.x0 + K.smooth(q.t / S.snapT) * 230;
          if (!q.checked && q.t >= S.snapT * 0.6) {
            q.checked = true;
            if (shipRow(st) === q.row && sh.burst <= 0) hitShip(st, 'bite', sh.x - 90);
            else { K.pop(st, q.x + 60, rowY(q.row) - 80, sh.burst > 0 ? 'Rowed clear!' : 'Missed us!', '#d9ffd0', 20); Sfx.play('serpentchaseSnap'); }
          }
          if (q.t >= S.snapT + 0.3) { q.state = 'sink'; q.t = 0; }
        } else if (q.state === 'flinch' || q.state === 'sink') { q.y += 140 * dt; if (q.t > 0.9) q.gone = true; }
      } else if (q.kind === 'coil' || q.kind === 'arch') {
        q.x -= v * dt;
        if (q.state === 'foam' && q.t >= S.foamT) { q.state = 'up'; q.t = 0; Sfx.play('vikingWave'); K.splash(st, q.x, rowY(q.rows[0]), 8); }
        if (q.kind === 'arch' && q.state === 'up') q.open = q.t < 0.4 ? 1 : Math.max(0, 1 - (q.t - 0.4) / 1.4);
        const solid = q.state === 'up' && (q.kind === 'coil' || q.open < 0.35);
        if (solid && !q.hit && q.rows.includes(shipRow(st)) && overlaps(st, q.x, q.w)) {
          q.hit = true;
          if (hitShip(st, 'coil', q.x - 40)) { sh.x = Math.max(S.winL, sh.x - 50); sh.vx = 0; sh.burst = 0; }
        }
        if (q.x < -160) q.gone = true;
      } else if (q.kind === 'rock') {
        q.x -= v * dt;
        if (!q.hit && q.row === shipRow(st) && overlaps(st, q.x, q.w)) { q.hit = true; if (hitShip(st, 'rock', q.x - 30)) { sh.x = Math.max(S.winL, sh.x - 40); sh.vx = 0; } }
        if (q.x < -120) q.gone = true;
      } else if (q.kind === 'tail') {
        q.x -= v * dt;
        if (q.state === 'shadow' && q.t >= S.tailT) { q.state = 'slam'; q.t = 0; Sfx.play('serpentchaseSlam'); K.splash(st, q.x, rowY(q.row), 16); if (q.row === shipRow(st) && overlaps(st, q.x, 60)) hitShip(st, 'slap', q.x); }
        else if ((q.state === 'slam' || q.state === 'miss') && q.t > 0.6) q.gone = true;
      } else if (q.kind === 'spit') {
        if (q.state === 'aim' && q.t >= S.spitAim) { q.state = 'fly'; q.t = 0; q.gx = q.hx - 30; q.gy = q.hy; Sfx.play('serpentchaseSpit'); }
        if (q.state === 'fly') {
          const g = geom(st), u = clamp(q.t / S.spitFly, 0, 1), tx = sh.x + 10, ty = g.deck - 8;
          q.gx = K.lerp(q.hx - 30, tx, u); q.gy = K.lerp(q.hy, ty, u) - Math.sin(u * Math.PI) * 150;
          q.tx = tx; q.ty = ty;
          if (u >= 1) {
            q.state = 'splat'; q.t = 0; sh.swamp = S.swampT; st.stats.swamps++;
            K.pop(st, sh.x, g.y - 110, 'Splosh! Swamped!', '#bfe6ff', 22); Sfx.play('vikingSplash'); K.splash(st, sh.x, g.deck, 16);
            K.hintOnce(st, 'globs', st.harp, 'Shoot the water globs out of the air!');
          }
        }
        if ((q.state === 'splat' || q.state === 'pop') && q.t > 0.5) q.gone = true;
        if (q.state !== 'fly' && q.state !== 'aim' && q.t > 0.5) q.gone = true;
      } else if (q.kind === 'dive') {
        q.x -= v * dt;
        if (q.state === 'bubbles' && q.t >= S.diveT) {
          q.state = 'burst'; q.t = 0; Sfx.play('vikingRoar'); K.splash(st, q.x, rowY(q.row), 24);
          if (q.row === shipRow(st) && overlaps(st, q.x, 80)) hitShip(st, 'dive', q.x);
        } else if (q.state === 'burst' && q.t >= 0.35) { q.state = 'rear'; q.t = 0; }
        else if (q.state === 'rear' && q.t >= S.rearT) { q.state = 'sink'; q.t = 0; }
        else if (q.state === 'sink' && q.t > 0.8) q.gone = true;
      } else if (q.kind === 'hump') {
        q.x -= v * dt * 0.85;
        q.sx = q.x; q.sy = q.y - 34 + Math.sin(st.clock * 2 + q.x * 0.01) * 3;
        if (q.x < -120) q.gone = true;
      }
    }
    st.threats = st.threats.filter(q => !q.gone);
    if (st.boss) bossStep(st, dt);
  }
  function bossStep(st, dt) {
    const b = st.boss, sh = st.ship;
    b.t += dt;
    if (b.state === 'rise') { b.x = K.lerp(W + 40, Math.min(W - 120, sh.x + 380), K.smooth(b.t / 1.4)); if (b.t >= 1.4) { b.state = 'rear'; b.t = 0; } }
    else if (b.state === 'rear') { b.x = K.lerp(b.x, Math.min(W - 120, sh.x + 380), Math.min(1, dt * 2)); }
    else if (b.state === 'down') {
      if (b.t > 2.2 && st.state === 'go') { st.state = 'end'; st.endT = 0; st.lastRoom = true; st.stats.roomT[st.k] = G.time - st.segStart; Sfx.play('vikingCheer'); }
    }
  }
  // the throat sways up and down across the line of a full-crank shot at the second-lowest forward aim, so a full bolt
  // fired as it crosses the dotted line goes in
  const bossThroat = (st) => {
    const b = st.boss, g = geom(st), x = b.x - 26, a = AIMS[5] * Math.PI / 180, dx = Math.max(60, x - g.bx), ft = dx / (boltSpeed(1) * Math.cos(a));
    const line = g.by - Math.tan(a) * dx + 0.5 * boltGrav(1) * ft * ft;
    return { x, y: clamp(line, 90, 330) + Math.sin(st.clock * 1.6) * 24, r: 24 };
  };
  // where each bolt target is right now, and how fast it moves (screen px/s)
  function targets(st) {
    const out = [], sh = st.ship;
    for (const q of st.threats) {
      if (q.kind === 'lunge' && q.state === 'tell') out.push({ kind: 'mouth', q, x: q.x + 34 * rowSc(q.row), y: q.y + 2, r: 30, vx: sh.vx, vy: 0, left: S.tellT + st.tellBonus - q.t });
      else if (q.kind === 'tail' && q.state === 'shadow') out.push({ kind: 'tail', q, x: q.x + 26, y: rowY(q.row) - 176 + Math.sin(q.t * 5) * 6, r: 26, vx: -S.v, vy: 0, left: S.tailT - q.t });
      else if (q.kind === 'spit' && q.state === 'fly') {
        const u = q.t / S.spitFly, du = 1 / S.spitFly;
        out.push({ kind: 'glob', q, x: q.gx, y: q.gy, r: 22, vx: (q.tx - (q.hx - 30)) * du, vy: (q.ty - q.hy) * du - Math.cos(u * Math.PI) * Math.PI * 150 * du, left: S.spitFly - q.t });
      } else if (q.kind === 'dive' && q.state === 'rear') out.push({ kind: 'throat', q, x: q.x - 6, y: rowY(q.row) - 104, r: 24, vx: -S.v, vy: 0, left: S.rearT - q.t });
      else if (q.kind === 'hump' && q.scale && q.x > -20 && q.x < W + 20) out.push({ kind: 'scale', q, x: q.sx, y: q.sy, r: 18, vx: -S.v * 0.85, vy: 0, left: (q.x + 20) / (S.v * 0.85) });
    }
    if (st.boss && st.boss.state === 'rear') { const T = bossThroat(st); out.push({ kind: 'boss', x: T.x, y: T.y, r: T.r, vx: 0, vy: 0, left: 99 }); }
    return out;
  }
  function bolts(st, dt) {
    const tg = targets(st);
    for (const b of st.bolts) {
      b.t += dt; b.vy += b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.done) continue;
      for (const T of tg) {
        if (Math.hypot(b.x - T.x, b.y - T.y) > T.r) continue;
        if (T.kind === 'boss' && b.c < 0.85 && !b.gold) { b.done = true; Sfx.play('vikingClang'); K.hint(st, st.harp, 'Crank it ALL the way, then let go!', 2); K.pop(st, T.x, T.y - 30, 'Not hard enough!', '#ffffff', 18); break; }
        b.done = true; score(st, T, b); break;
      }
      // a bolt that hits the hide clangs off
      if (!b.done) for (const q of st.threats) {
        if ((q.kind === 'coil' || q.kind === 'arch') && q.state === 'up' && Math.abs(b.x - q.x) < q.w / 2 && b.y > rowY(q.rows[0]) - 70) { b.done = true; b.vx *= -0.3; b.vy = -200; Sfx.play('vikingClang'); K.spark(st, b.x, b.y, 4, ['#ffffff', '#c8d6e0']); break; }
        if (q.kind === 'lunge' && (q.state === 'rise' || q.state === 'tell') && Math.hypot(b.x - q.x, b.y - (q.y + 30)) < 30) { b.done = true; b.vx *= -0.3; b.vy = -200; Sfx.play('vikingClang'); if (q.state === 'rise') K.hint(st, st.harp, 'Wait for the jaws to open!', 1.4); break; }
      }
      if (b.y > rowY(2) + 30 && !b.splashed) { b.splashed = true; b.done = true; K.splash(st, b.x, rowY(2) + 10, 4); }
    }
    st.bolts = st.bolts.filter(b => b.t < 2 && b.y < H + 40 && b.x > -60 && b.x < W + 60 && !(b.done && b.t > 0.15 && b.splashed));
    st.bolts = st.bolts.filter(b => !(b.done && b.vy > 0 && b.y > rowY(2)));
  }
  function score(st, T, b) {
    const q = T.q;
    K.spark(st, T.x, T.y, 10, ['#ffe08a', '#ffffff']);
    if (T.kind === 'mouth') {
      q.state = 'flinch'; q.t = 0; st.stats.mouth++;
      st.gap = Math.min(100, st.gap + S.gain.mouth);
      Sfx.play('serpentchaseYelp'); K.pop(st, T.x, T.y - 40, 'Right in the mouth!', '#d9ffd0', 24);
    } else if (T.kind === 'tail') {
      q.state = 'miss'; q.t = 0; st.stats.tails++; st.gap = Math.min(100, st.gap + S.gain.tail);
      Sfx.play('serpentchaseYelp'); K.pop(st, T.x, T.y - 30, 'It flinched!', '#d9ffd0', 20);
    } else if (T.kind === 'glob') {
      q.state = 'pop'; q.t = 0; st.stats.globs++; st.gap = Math.min(100, st.gap + S.gain.glob);
      Sfx.play('vikingSplash'); K.splash(st, T.x, T.y, 10); K.pop(st, T.x, T.y - 24, 'Pop!', '#bfe6ff', 18);
    } else if (T.kind === 'throat') {
      q.state = 'sink'; q.t = 0; st.stats.throat++; st.gap = Math.min(100, st.gap + S.gain.throat);
      Sfx.play('serpentchaseYelp'); K.pop(st, T.x, T.y - 30, 'THROAT SHOT! Double!', C.gold, 26);
    } else if (T.kind === 'scale') {
      q.scale = false; st.scales++; st.stats.scales = st.scales;
      Sfx.play('vikingPop', 1 + (st.scales % 5) * 0.08); K.pop(st, T.x, T.y - 24, 'Scale ' + st.scales + '!', '#9fffd8', 18);
    } else if (T.kind === 'boss') {
      const B = st.boss; B.state = 'down'; B.t = 0; B.hit = true; st.stats.throat++;
      Sfx.play('vikingRoar'); Sfx.play('serpentchaseYelp');
      K.pop(st, T.x, T.y - 30, 'DOWN IT GOES!', C.gold, 32); K.confetti(st, T.x, T.y, 40);
      st.threats = st.threats.filter(qq => qq.kind === 'hump');
    }
  }
  function whirl(st, dt) {
    const sh = st.ship;
    st.whirlT -= dt;
    if (st.whirlT <= 0) {
      st.whirlT = 3.2 + Math.random();
      // (never drags the ship into something that's about to arrive in the next row)
      if (sh.row < 2 && sh.ry === sh.row && rowDanger(st, sh.row + 1, 3) > 1.6) { sh.row++; K.pop(st, sh.x, rowY(sh.ry) - 100, 'The whirlpool pulls!', '#bfe6ff', 18); Sfx.play('vikingWave'); }
    }
  }
  function chomp(st) {
    st.state = 'chomp'; st.chompT = 0; st.stats.swallowed++;
    Sfx.play('vikingRoar'); G.shake = 0.6;
    K.msg(st, 'CHOMP! Swallowed! Back to the start of the stretch.', '#ffd0c8', 3);
  }
  function chompStep(st, dt) {
    st.chompT += dt;
    st.ship.lift = st.chompT < 1.2 ? K.smooth(st.chompT / 1.2) : Math.max(0, 1 - (st.chompT - 1.2) / 0.5);
    if (st.chompT >= 2.2) {
      const d = st.dist;
      startStretch(st); st.dist = d;
      K.msg(st, 'Spat out! Try again: ' + st.title, '#ffffff', 2.5);
    }
  }
  function endStretch(st) {
    st.state = 'end'; st.endT = 0;
    st.lastRoom = false;
    st.stats.roomT[st.k] = G.time - st.segStart;
    Sfx.play('vikingHorn');
    K.pop(st, W / 2, 160, (G.level.def.done || 'Stretch done!') + ' Swap jobs!', '#ffffff', 24);
  }
  function endStep(st, dt) {
    st.endT += dt;
    st.dist += S.v * dt;
    for (const b of st.bolts) { b.t += dt; b.vy += b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt; }
    if (st.boss) st.boss.t += dt;
    if (st.lastRoom) {
      if (st.endT > 0.6 && !st.party) { st.party = true; Sfx.play('serpentchaseFanfare'); K.confetti(st, W / 2, 160, 50); K.pop(st, W / 2, 140, 'The serpent is gone for good! Into the fjord!', '#ffffff', 26); }
      if (st.endT > 3.2 && !st.cleared) { st.cleared = true; G.level.goal = { x: W / 2, y: 300 }; levelClear(); }
    } else if (st.endT > 2.2) nextRoom();
  }
  function mirror(st) {
    const g = geom(st), lift = st.ship.lift * 160;
    K.place(st.helm, g.x + 20 * g.sc, g.deck - lift);
    K.place(st.harp, g.bx - 2, g.deck - lift);
    // positions for the stuck test (how far along the sea each hero has come)
    st.run = [0, 1].map(id => ({ x: st.dist + (id === st.helm ? g.x : g.bx), y: g.deck }));
  }

  /* ---------- what to do next ----------
     plan(st): { helm: { row, x, act, why }, harp: { aim, crank, fire, target, why }, threats: [...] }
     helm: the row with the longest clear run (moving at least 0.5 s early), the x to sit at, act = use Row! now.
     harp: the aim to swing to, how far to crank (0..1), fire = let go now. The harpooner goes for the threat that lands
     soonest (mouth, then tail, then glob, then throat), else a scale. */
  function simShot(st, aim, c, T, maxT) {
    const g = geom(st), d = aimDir(aim), sp = boltSpeed(c), gr = boltGrav(c);
    let x = g.bx + d.x * 22, y = g.by + d.y * 22, vx = d.x * sp, vy = d.y * sp, tx = T.x, ty = T.y;
    const ct = Math.max(0, c - (st.cranking ? st.crank : 0)) * S.crankT + Math.abs(aim - st.aim) * 0.17; // the target moves while we swing and crank
    tx += T.vx * ct; ty += T.vy * ct;
    const h = 1 / 120;
    for (let t = 0; t < Math.min(1.4, maxT); t += h) {
      vy += gr * h; x += vx * h; y += vy * h; tx += T.vx * h; ty += T.vy * h;
      if (Math.abs(x - tx) < T.r && Math.abs(y - ty) < T.r && Math.hypot(x - tx, y - ty) < T.r * 0.66) return t + ct;
      if (y > rowY(2) + 30) return null;
    }
    return null;
  }
  function solve(st, T) {
    let best = null;
    const cs = T.kind === 'boss' ? [1] : [1, 0.85, 0.7, 0.55, 0.4, 0.28];
    for (let a = 0; a < S.aimN; a++) for (const c of cs) {
      const tt = simShot(st, a, c, T, T.left + 0.05);
      if (tt === null || tt > T.left - 0.02) continue;
      if (st.cranking && c < st.crank - 0.02) continue; // (a crank can't go back down)
      const cost = tt + (st.cranking && a !== st.aim ? 0.3 : 0);
      if (!best || cost < best.cost) best = { aim: a, crank: c, cost, t: tt };
    }
    return best;
  }
  function rowDanger(st, r, horizon) {
    // seconds until something in row r reaches the ship (99 = clear)
    const sh = st.ship, half = geom(st).half, v = S.v + Math.max(0, sh.vx);
    let soon = 99;
    for (const q of st.threats) {
      let x = null, w = 0, when = 0;
      if ((q.kind === 'coil' || q.kind === 'arch') && q.rows.includes(r)) {
        if (q.kind === 'arch' && q.state === 'foam') continue; // an arch blocks every row: Row! handles it
        if (q.kind === 'arch' && q.open >= 0.35) continue;
        x = q.x; w = q.w; if (q.hit) continue;
      } else if (q.kind === 'rock' && q.row === r && !q.hit) { x = q.x; w = q.w; }
      else if (q.kind === 'tail' && q.state === 'shadow' && q.row === r) { if (Math.abs(q.x - v * (S.tailT - q.t) - sh.x) < half + 60) soon = Math.min(soon, Math.max(0, S.tailT - q.t)); continue; }
      else if (q.kind === 'dive' && q.state === 'bubbles' && q.row === r) { if (Math.abs(q.x - S.v * (S.diveT - q.t) - sh.x) < half + 90) soon = Math.min(soon, Math.max(0, S.diveT - q.t)); continue; }
      else if (q.kind === 'lunge' && q.row === r && (q.state === 'rise' || q.state === 'tell')) { soon = Math.min(soon, (q.state === 'rise' ? S.riseT - q.t + S.tellT + st.tellBonus : S.tellT + st.tellBonus - q.t) + S.snapT * 0.6); continue; }
      if (x === null) continue;
      const gap = x - w / 2 - (sh.x + half);
      if (gap < -(w + 2 * half)) continue;
      const t = Math.max(0, gap) / Math.max(40, v);
      if (t < horizon) soon = Math.min(soon, t);
    }
    return soon;
  }
  function plan(st) {
    // (worked out once per physics step: the HUD, the prompts and both brains all ask)
    if (st.planMemo && st.planMemo.n === G.tickN && st.planMemo.room === st.k) return st.planMemo.p;
    const p = planNow(st);
    st.planMemo = { n: G.tickN, room: st.k, p };
    return p;
  }
  function planNow(st) {
    const sh = st.ship, g = geom(st), out = { helm: { row: sh.row, x: 300, act: false, why: 'cruise' }, harp: { aim: st.aim, crank: 0, fire: false, why: 'wait' } };
    if (st.state !== 'go') return out;
    // ---- the harpooner: the threat that lands soonest, then a scale
    const order = { mouth: 0, tail: 1, glob: 2, throat: 3, boss: 4, scale: 5 };
    const tg = targets(st).filter(T => !st.bolts.some(b => !b.done && b.aimed === T.q && T.q)).sort((a, b) => (order[a.kind] - order[b.kind]) || (a.left - b.left));
    let shot = null, target = null;
    // keep the shot we lined up while it still works and nothing more urgent turned up (no flicking between aims)
    const memo = st.shotMemo;
    if (memo) {
      const T = tg.find(T => T.kind === memo.kind && T.q === memo.q);
      const urgent = tg.find(U => order[U.kind] < order[memo.kind]);
      if (T && !urgent && (!st.cranking || st.crank <= memo.crank + 0.02)) { const tt = simShot(st, memo.aim, memo.crank, T, T.left + 0.05); if (tt !== null && tt <= T.left) { shot = memo; target = T; } }
    }
    if (!shot) for (const T of tg) { const s = solve(st, T); if (s) { shot = s; target = T; st.shotMemo = { kind: T.kind, q: T.q, aim: s.aim, crank: s.crank }; break; } }
    if (!shot) st.shotMemo = null;
    if (shot) {
      out.harp = { aim: shot.aim, crank: shot.crank, why: target.kind, target: target.kind };
      // swing first; crank when lined up; let go when the crank is right
      out.harp.fire = st.cranking && st.aim === shot.aim && st.crank >= shot.crank - 0.03;
    } else if (tg.length) out.harp = { aim: tg[0].kind === 'mouth' ? 1 : tg[0].x > g.bx ? 5 : 2, crank: 0, why: 'line up ' + tg[0].kind, target: tg[0].kind };
    // ---- the helm: the clearest row, early
    const lungeHere = st.threats.find(q => q.kind === 'lunge' && q.row === sh.row && (q.state === 'rise' || q.state === 'tell'));
    const harpOnMouth = lungeHere && (st.cranking || st.bolts.some(b => !b.done && b.vx < 0)) && target && target.kind === 'mouth';
    const dang = [0, 1, 2].map(r => rowDanger(st, r, 3));
    // a lunge the harpooner is busy with: stay put while there's time (don't spoil the shot)
    if (lungeHere) {
      const left = (lungeHere.state === 'rise' ? S.riseT - lungeHere.t : 0) + S.tellT + st.tellBonus - (lungeHere.state === 'tell' ? lungeHere.t : 0);
      const dodgeAt = harpOnMouth ? 0.32 : 0.55;
      if (left > dodgeAt) dang[sh.row] = 99;
    }
    let best = sh.row;
    const cost = r => -Math.min(dang[r], 3) + Math.abs(r - sh.row) * 0.35 + (st.whirl ? (2 - r) * 0.05 : 0);
    for (const r of [0, 1, 2]) if (cost(r) < cost(best) - 0.01) best = r;
    // only move rows when the current one gets dangerous within 1.3 s, and commit for a moment
    if (dang[sh.row] < 1.3 && best !== sh.row) out.helm.row = best;
    else out.helm.row = sh.row;
    // a row in between that's about to be hit: wait if passing through it is worse
    if (Math.abs(out.helm.row - sh.row) === 2 && dang[1] < 0.35) out.helm.row = sh.row;
    out.helm.why = out.helm.row !== sh.row ? 'dodge' : 'cruise';
    // Row!: through a closing arch, out of a snap with no way out, or when the gap is low
    const arch = st.threats.find(q => q.kind === 'arch' && !q.hit && q.x - q.w / 2 > sh.x - g.half - 20 && (q.state === 'foam' || q.open > 0.3) && (q.x - (sh.x + g.half)) / (S.v + Math.max(0, sh.vx)) < (q.state === 'foam' ? S.foamT - q.t + 0.55 : 0.4));
    if (sh.cd <= 0 && sh.burst <= 0) {
      if (arch) { out.helm.act = true; out.helm.why = 'arch'; }
      else if (lungeHere && lungeHere.state === 'tell' && S.tellT + st.tellBonus - lungeHere.t < 0.25 && dang[sh.row] < 0.5 && out.helm.row === sh.row) { out.helm.act = true; out.helm.why = 'snap'; }
      else if (st.gap < 35 && dang[sh.row] > 2) { out.helm.act = true; out.helm.why = 'gap'; }
    }
    // the x: sit in the middle, ease back from things just ahead in our row when an arch is not involved
    out.helm.x = arch ? S.winR : 320;
    out.danger = dang;
    return out;
  }

  /* ---------- drawing ---------- */
  function draw(st) {
    const t = st.clock, g = geom(st), sh = st.ship;
    const night = st.k === 2, dusk = st.k === 3;
    K.sky(st.dist, t, { night: st.k === 2, dusk: st.k === 3, storm: st.k === 3 ? 0.4 : st.k === 1 ? 0.15 : 0, sleet: st.k === 1 ? 0.5 : 0 });
    if (!st.fog) K.fjords(st.dist, t, { base: 292, dim: night ? 0.5 : 0 });
    if (st.lastRoom && st.state === 'end') {
      // the fjord mouth opens ahead: two great cliffs slide in
      const u = K.smooth(st.endT / 2.5);
      ctx.fillStyle = '#3e4a58';
      ctx.beginPath(); ctx.moveTo(W + 300 - u * 420, 300); ctx.lineTo(W + 360 - u * 420, 40); ctx.lineTo(W + 520, 40); ctx.lineTo(W + 520, 300); ctx.closePath(); ctx.fill();
    }
    // far-out humps with glowing scales (behind the sea's first band)
    ctx.save();
    for (const q of st.threats) if (q.kind === 'hump') drawHump(q.x, q.y, 1, t, q.scale ? { x: q.sx, y: q.sy } : null);
    ctx.restore();
    K.sea(st.dist, t, 296, { rows: [S.rowY[0] - 8, S.rowY[1] - 8, S.rowY[2] - 8], rough: st.k === 3 ? 0.8 : st.k === 1 ? 0.4 : 0.1, col: night ? '#1c3a52' : undefined, dark: night ? '#0c2034' : undefined });
    if (st.whirl) drawWhirl(st, t);
    // depth layers: far row first, the ship in its own row
    const shipLayer = Math.round(sh.ry);
    for (let r = 0; r < 3; r++) {
      for (const q of st.threats) if (inRow(q, r)) drawThreat(st, q, t);
      if (r === shipLayer) drawShip(st, t);
    }
    if (st.boss) drawBoss(st, t);
    // bolts
    for (const b of st.bolts) {
      const a = Math.atan2(b.vy, b.vx);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
      ctx.fillStyle = b.gold ? C.gold : '#6a4a2a'; ctx.fillRect(-18, -1.5, 30, 3);
      ctx.fillStyle = '#c8ccd6'; ctx.beginPath(); ctx.moveTo(12, -4); ctx.lineTo(20, 0); ctx.lineTo(12, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8e8e8'; ctx.fillRect(-20, -4, 5, 2); ctx.fillRect(-20, 2, 5, 2);
      ctx.restore();
    }
    // globs in the air and their landing rings on the deck
    for (const q of st.threats) if (q.kind === 'spit' && q.state === 'fly') {
      ctx.strokeStyle = 'rgba(191,230,255,' + (0.5 + 0.4 * Math.sin(t * 14)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(q.tx, q.ty + 6, 26, 7, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(150,220,255,0.9)'; circle(q.gx, q.gy, 13); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(q.gx - 4, q.gy - 4, 4); ctx.fill();
    }
    K.drawParts(st, 0);
    if (st.fog) {
      // fog bank: you can only see a little way ahead; foam lines and eyes still show through
      const fx = g.x + 230;
      K.fog(fx, W + 40, t, 0.92);
      for (const q of st.threats) {
        if ((q.kind === 'coil' || q.kind === 'arch') && q.state === 'foam' && q.x > fx) drawFoam(q, t);
        if (q.kind === 'dive' && q.state === 'bubbles' && q.x > fx) drawBubbles(q, t);
        if (q.kind === 'tail' && q.state === 'shadow' && q.x > fx) drawShadow(q, t);
      }
    }
  }
  function inRow(q, r) {
    if (q.kind === 'coil' || q.kind === 'arch') return q.rows[0] === r;
    if (q.kind === 'rock' || q.kind === 'tail' || q.kind === 'dive' || q.kind === 'lunge') return q.row === r;
    if (q.kind === 'spit') return r === 0;
    return false;
  }
  const SKIN = '#2e6a5a', SKIN2 = '#1e4a40', BELLY = '#c8d890';
  function drawHump(x, y, s, t, scale) {
    ctx.fillStyle = SKIN2;
    ctx.beginPath(); ctx.moveTo(x - 60 * s, y + 10); ctx.quadraticCurveTo(x, y - 70 * s, x + 60 * s, y + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = SKIN; ctx.beginPath(); ctx.moveTo(x - 52 * s, y + 10); ctx.quadraticCurveTo(x, y - 60 * s, x + 52 * s, y + 10); ctx.closePath(); ctx.fill();
    // fin spikes
    ctx.fillStyle = '#5a2a3a';
    for (let k = -2; k <= 2; k++) { const fx = x + k * 16 * s, fy = y - 50 * s * (1 - (k * k) / 9); ctx.beginPath(); ctx.moveTo(fx - 5, fy + 4); ctx.lineTo(fx, fy - 12 * s); ctx.lineTo(fx + 5, fy + 4); ctx.closePath(); ctx.fill(); }
    if (scale) {
      const pulse = 0.6 + 0.4 * Math.sin(t * 6);
      const gg = ctx.createRadialGradient(scale.x, scale.y, 1, scale.x, scale.y, 24);
      gg.addColorStop(0, 'rgba(160,255,220,' + 0.8 * pulse + ')'); gg.addColorStop(1, 'rgba(160,255,220,0)');
      ctx.fillStyle = gg; circle(scale.x, scale.y, 24); ctx.fill();
      ctx.fillStyle = '#9fffd8'; ctx.beginPath(); ctx.moveTo(scale.x, scale.y - 9); ctx.lineTo(scale.x + 7, scale.y); ctx.lineTo(scale.x, scale.y + 9); ctx.lineTo(scale.x - 7, scale.y); ctx.closePath(); ctx.fill();
    }
  }
  function drawFoam(q, t) {
    for (const r of q.rows) {
      const y = rowY(r) + 4;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.4 * Math.sin(t * 12)) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(q.x, y, q.w * 0.8, 6, 0, 0, TAU); ctx.stroke();
      for (let k = 0; k < 4; k++) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(q.x - 30 + k * 20 + Math.sin(t * 8 + k) * 3, y - 2 - Math.abs(Math.sin(t * 6 + k)) * 6, 3); ctx.fill(); }
    }
  }
  function drawBubbles(q, t) {
    const y = rowY(q.row) + 2, u = q.t / S.diveT;
    ctx.fillStyle = 'rgba(10,20,30,' + (0.25 + 0.3 * u) + ')'; ctx.beginPath(); ctx.ellipse(q.x, y + 6, 70, 12, 0, 0, TAU); ctx.fill();
    for (let k = 0; k < 10; k++) { const bx = q.x + (K.hash(k + q.x * 0.01) - 0.5) * 120, by = y - ((t * 60 + k * 13) % 26); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; circle(bx, by, 2 + (k % 3)); ctx.stroke(); }
  }
  function drawShadow(q, t) {
    const y = rowY(q.row) + 4, u = clamp(q.t / S.tailT, 0, 1);
    ctx.fillStyle = 'rgba(10,20,30,' + (0.2 + 0.45 * u) + ')'; ctx.beginPath(); ctx.ellipse(q.x, y, 40 + u * 40, 8 + u * 4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,90,70,' + (0.4 + 0.5 * Math.sin(t * 16)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(q.x, y, 70, 12, 0, 0, TAU); ctx.stroke();
  }
  function drawThreat(st, q, t) {
    if (q.kind === 'coil' || q.kind === 'arch') {
      if (q.state === 'foam') { drawFoam(q, t); return; }
      const rise = K.smooth(q.t / 0.35);
      for (const r of q.rows) {
        const y = rowY(r) + 6, s = rowSc(r), h = (q.kind === 'arch' ? 120 : 80) * s * rise;
        const open = q.kind === 'arch' ? q.open : 0;
        ctx.fillStyle = SKIN2; ctx.strokeStyle = '#123028'; ctx.lineWidth = 2;
        if (q.kind === 'arch' && open > 0.05) {
          // a loop of body with a gap underneath that closes
          const gapH = h * 0.75 * open, gw = q.w * 1.6;
          ctx.beginPath(); ctx.moveTo(q.x - gw, y); ctx.quadraticCurveTo(q.x - gw, y - h, q.x, y - h); ctx.quadraticCurveTo(q.x + gw, y - h, q.x + gw, y);
          ctx.lineTo(q.x + gw - 22, y); ctx.quadraticCurveTo(q.x + gw - 22, y - gapH, q.x, y - gapH); ctx.quadraticCurveTo(q.x - gw + 22, y - gapH, q.x - gw + 22, y); ctx.closePath(); ctx.fill(); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.moveTo(q.x - q.w * 0.9, y); ctx.quadraticCurveTo(q.x - q.w * 0.6, y - h, q.x, y - h); ctx.quadraticCurveTo(q.x + q.w * 0.6, y - h, q.x + q.w * 0.9, y); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        ctx.fillStyle = SKIN; ctx.beginPath(); ctx.ellipse(q.x, y - h * 0.8, q.w * 0.35, h * 0.12 + 1, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#5a2a3a'; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(q.x + k * 14 - 5, y - h + 4); ctx.lineTo(q.x + k * 14, y - h - 12 * s); ctx.lineTo(q.x + k * 14 + 5, y - h + 4); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle = 'rgba(232,244,246,0.8)'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(q.x + d * q.w * 0.9, y + 2, 14, 4, 0, 0, TAU); ctx.fill(); }
      }
    } else if (q.kind === 'rock') {
      const y = rowY(q.row) + 8, s = rowSc(q.row);
      ctx.fillStyle = '#5a5e66'; ctx.strokeStyle = '#2e3036'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(q.x - 34 * s, y); ctx.lineTo(q.x - 24 * s, y - 40 * s); ctx.lineTo(q.x - 4 * s, y - 56 * s); ctx.lineTo(q.x + 18 * s, y - 38 * s); ctx.lineTo(q.x + 34 * s, y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f2f6f8'; ctx.beginPath(); ctx.moveTo(q.x - 14 * s, y - 50 * s); ctx.lineTo(q.x - 4 * s, y - 56 * s); ctx.lineTo(q.x + 10 * s, y - 46 * s); ctx.lineTo(q.x, y - 44 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(232,244,246,0.7)'; ctx.beginPath(); ctx.ellipse(q.x, y + 2, 42 * s, 5, 0, 0, TAU); ctx.fill();
    } else if (q.kind === 'tail') {
      drawShadow(q, t);
      if (q.state === 'shadow' || q.state === 'miss' || q.state === 'slam') {
        const y = rowY(q.row), u = q.state === 'shadow' ? K.smooth(q.t / 0.4) : 1;
        const tipY = q.state === 'slam' ? y - 20 : q.state === 'miss' ? y - 176 - q.t * 200 : y - 176 * u + Math.sin(q.t * 5) * 6;
        const tipX = q.state === 'miss' ? q.x + 26 + q.t * 240 : q.x + 26;
        ctx.strokeStyle = SKIN2; ctx.lineWidth = 22; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(q.x + 120, y + 20); ctx.quadraticCurveTo(q.x + 110, (y + tipY) / 2, tipX, tipY); ctx.stroke();
        ctx.strokeStyle = SKIN; ctx.lineWidth = 12; ctx.stroke(); ctx.lineCap = 'butt';
        // the fluke at the tip, glowing as a target
        ctx.fillStyle = q.state === 'shadow' ? (Math.sin(t * 12) > 0 ? '#ff8a6a' : '#5a2a3a') : '#5a2a3a';
        ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(tipX - 22, tipY - 16); ctx.lineTo(tipX + 4, tipY - 8); ctx.lineTo(tipX + 22, tipY - 18); ctx.closePath(); ctx.fill();
      }
    } else if (q.kind === 'dive') {
      if (q.state === 'bubbles') drawBubbles(q, t);
      else {
        const y = rowY(q.row), up = q.state === 'burst' ? K.smooth(q.t / 0.35) : q.state === 'rear' ? 1 : Math.max(0, 1 - q.t / 0.8);
        drawNeck(q.x, y + 20, q.x - 6, y - 70 * up - 30, up, t, q.state === 'rear');
      }
    } else if (q.kind === 'lunge') {
      const s = rowSc(q.row), open = q.state === 'tell' ? 1 : q.state === 'snap' ? 1 - q.t / S.snapT : q.state === 'flinch' ? 0.2 : 0;
      drawHead(q.x, q.y, s, open, q.state === 'tell' || q.state === 'snap', t, q.state === 'flinch', 1);
    } else if (q.kind === 'spit') {
      const y = q.hy + (q.state === 'aim' ? 30 * (1 - K.smooth(q.t / 0.4)) : q.state === 'fly' ? 0 : q.t * 60);
      drawHead(q.hx, y, 0.8, q.state === 'aim' ? K.smooth(q.t / S.spitAim) : 0.3, true, t, false, -1);
    }
  }
  // a neck rising out of the water with a head on top facing left (the dive)
  function drawNeck(x0, y0, x1, y1, up, t, throatGlow) {
    ctx.strokeStyle = SKIN2; ctx.lineWidth = 34; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0 + 20, y0); ctx.quadraticCurveTo(x0 + 30, (y0 + y1) / 2, x1, y1); ctx.stroke();
    ctx.strokeStyle = SKIN; ctx.lineWidth = 24; ctx.stroke();
    ctx.strokeStyle = BELLY; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x0 + 6, y0); ctx.quadraticCurveTo(x0 + 14, (y0 + y1) / 2, x1 - 10, y1 + 6); ctx.stroke(); ctx.lineCap = 'butt';
    if (throatGlow) { const pulse = 0.5 + 0.5 * Math.sin(t * 14); const gg = ctx.createRadialGradient(x1 - 6, y1 - 4, 1, x1 - 6, y1 - 4, 30); gg.addColorStop(0, 'rgba(255,190,90,' + (0.6 + 0.4 * pulse) + ')'); gg.addColorStop(1, 'rgba(255,150,60,0)'); ctx.fillStyle = gg; circle(x1 - 6, y1 - 4, 30); ctx.fill(); }
    drawHead(x1 - 4, y1 - 30, 0.9, throatGlow ? 0.6 : 0.3, true, t, false, -1);
  }
  // the serpent's head, facing dir (1 right, -1 left), mouth open 0..1, centre of the head at (x, y)
  function drawHead(x, y, s, open, eyes, t, flinch, dir) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
    if (flinch) ctx.rotate(-0.4);
    // neck down into the water
    ctx.fillStyle = SKIN2; ctx.beginPath(); ctx.moveTo(-30, 10); ctx.quadraticCurveTo(-40, 60, -20, 120); ctx.lineTo(14, 120); ctx.quadraticCurveTo(0, 50, 10, 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = BELLY; ctx.beginPath(); ctx.moveTo(4, 20); ctx.quadraticCurveTo(-4, 60, 8, 120); ctx.lineTo(14, 120); ctx.quadraticCurveTo(2, 60, 10, 18); ctx.closePath(); ctx.fill();
    const jaw = open * 0.55;
    // lower jaw
    ctx.save(); ctx.rotate(jaw * 0.6);
    ctx.fillStyle = SKIN2; ctx.beginPath(); ctx.moveTo(-14, 6); ctx.lineTo(44, 8); ctx.quadraticCurveTo(48, 16, 40, 18); ctx.lineTo(-10, 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(6 + k * 9, 9); ctx.lineTo(9 + k * 9, 1); ctx.lineTo(12 + k * 9, 9); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    if (open > 0.1) { ctx.fillStyle = '#7a1a2a'; ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(42, 0); ctx.lineTo(40, 10 + open * 20); ctx.lineTo(-6, 14); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ff6a7a'; ctx.beginPath(); ctx.ellipse(16, 8 + open * 6, 10, 4, 0.2, 0, TAU); ctx.fill(); }
    // upper jaw and skull
    ctx.save(); ctx.rotate(-jaw * 0.5);
    ctx.fillStyle = SKIN; ctx.strokeStyle = '#123028'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-30, 8); ctx.quadraticCurveTo(-30, -26, 0, -24); ctx.quadraticCurveTo(30, -20, 50, -2); ctx.quadraticCurveTo(52, 6, 44, 6); ctx.lineTo(-14, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(4 + k * 8, 5); ctx.lineTo(7 + k * 8, 14); ctx.lineTo(10 + k * 8, 5); ctx.closePath(); ctx.fill(); }
    // horns and frill
    ctx.fillStyle = '#5a2a3a'; ctx.beginPath(); ctx.moveTo(-22, -16); ctx.lineTo(-40, -36); ctx.lineTo(-14, -22); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-10, -22); ctx.lineTo(-20, -44); ctx.lineTo(-2, -24); ctx.closePath(); ctx.fill();
    // the eye
    const glow = eyes ? 0.6 + 0.4 * Math.sin(t * 16) : 0;
    if (glow) { const gg = ctx.createRadialGradient(4, -10, 1, 4, -10, 16); gg.addColorStop(0, 'rgba(255,230,90,' + glow + ')'); gg.addColorStop(1, 'rgba(255,200,60,0)'); ctx.fillStyle = gg; circle(4, -10, 16); ctx.fill(); }
    ctx.fillStyle = eyes ? '#ffe14a' : '#d8e090'; ctx.beginPath(); ctx.ellipse(4, -10, 6, 4, -0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(3, -14, 2.4, 8);
    ctx.fillStyle = '#123028'; circle(40, -6, 1.6); ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  function drawBoss(st, t) {
    const b = st.boss, y0 = rowY(0) + 10;
    const sink = b.state === 'down' ? K.smooth(b.t / 1.6) * 260 : 0;
    const T = bossThroat(st);
    ctx.save(); ctx.translate(0, sink);
    drawNeck(b.x + 40, y0 + 30, T.x + 6, T.y + 30, 1, t, b.state === 'rear');
    ctx.restore();
    if (b.state === 'rear') {
      ctx.strokeStyle = 'rgba(255,224,138,' + (0.5 + 0.5 * Math.sin(t * 10)) + ')'; ctx.lineWidth = 3; circle(T.x, T.y, T.r + 6); ctx.stroke();
    }
  }
  function drawWhirl(st, t) {
    const cx = W * 0.62, cy = rowY(2) + 60;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.22);
    for (let k = 0; k < 6; k++) { ctx.strokeStyle = 'rgba(232,244,246,' + (0.12 + k * 0.04) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 80 + k * 70, t * (1.5 - k * 0.15) + k, t * (1.5 - k * 0.15) + k + 4); ctx.stroke(); }
    ctx.restore();
  }
  function drawShip(st, t) {
    const sh = st.ship, g = geom(st), lift = sh.lift * 160;
    const bob = Math.sin(sh.bob * 2.2) * 2.5, tilt = Math.sin(sh.bob * 1.7) * 0.02 + (sh.burst > 0 ? 0.03 : 0);
    const oarRate = sh.burst > 0 ? 2.6 : 0.9;
    st.oarPh = (st.oarPh || 0) + oarRate / 60;
    ctx.save(); ctx.translate(0, -lift + bob);
    if (sh.lift > 0) { ctx.translate(g.x, g.y); ctx.rotate(Math.sin(st.chompT * 8) * 0.2 * sh.lift); ctx.translate(-g.x, -g.y); }
    // the ballista on the stern (behind the rail), with its aim and crank
    const d = aimDir(st.aim), a = Math.atan2(d.y, d.x);
    ctx.fillStyle = K.COL.woodDark; ctx.fillRect(g.bx - 8 * g.sc, g.by, 16 * g.sc, 18 * g.sc);
    ctx.save(); ctx.translate(g.bx, g.by); ctx.rotate(a);
    ctx.fillStyle = '#7a4a22'; ctx.fillRect(-10, -4, 40, 8);
    ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(18, -18); ctx.quadraticCurveTo(26 - st.crank * 10, 0, 18, 18); ctx.stroke();
    ctx.strokeStyle = '#e8e0c8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(18, -18); ctx.lineTo(4 - st.crank * 14, 0); ctx.lineTo(18, 18); ctx.stroke();
    if (st.reload <= 0) { ctx.fillStyle = st.goldBolts > 0 ? C.gold : '#c8ccd6'; ctx.fillRect(4 - st.crank * 14, -1.5, 32, 3); }
    ctx.restore();
    K.longship(g.x, g.y, { s: g.sc, sail: sh.burst > 0 ? 1 : 0.7, oars: st.oarPh, oarSpread: sh.burst > 0 ? 1.3 : 0.8, tilt, shields: sh.shields, torn: sh.torn, bitten: sh.bitten });
    // the crew: the helm by the mast (with a drum), the harpooner at the ballista
    const helmX = g.x + 20 * g.sc, harpX = g.bx - 2;
    ctx.fillStyle = '#8a5a32'; ctx.beginPath(); ctx.ellipse(helmX + 16 * g.sc, g.deck - 6 * g.sc, 8 * g.sc, 6 * g.sc, 0, 0, TAU); ctx.fill();
    K.viking(st.helm, helmX, g.deck, { s: g.sc, face: 1, arms: sh.burst > 0 && Math.sin(t * 20) > 0 ? 'up' : null, cloakV: 0.4 });
    K.viking(st.harp, harpX, g.deck, { s: g.sc, face: d.x < 0 ? -1 : 1, arms: st.cranking ? 'fwd' : null, cloakV: 0.3 });
    if (sh.swamp > 0) { ctx.fillStyle = 'rgba(150,210,240,0.5)'; ctx.fillRect(g.x - g.half + 10, g.deck - 6 * g.sc, g.half * 2 - 20, 8 * g.sc); }
    // the bolt's path: a dotted guide (current crank, or full if not cranking)
    if (st.state === 'go' && !K.quiet(st.harp) && st.reload <= 0) {
      const c = st.cranking ? Math.max(0.12, st.crank) : st.goldBolts > 0 ? 1 : 0.6, sp = boltSpeed(c), gr = boltGrav(c);
      let x = g.bx + d.x * 22, y = g.by + d.y * 22, vx = d.x * sp, vy = d.y * sp;
      ctx.fillStyle = 'rgba(255,240,180,0.75)';
      for (let k = 0; k < 14; k++) { const h = 0.035; for (let j = 0; j < 2; j++) { vy += gr * h / 2; x += vx * h / 2; y += vy * h / 2; } circle(x, y, 2.2 - k * 0.1); ctx.fill(); }
    }
    ctx.restore();
  }
  function drawTop(st) {
    K.drawPops(st, 0, 0);
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.35 : 1, play = G.mode === 'play' || G.mode === 'paused';
    let timeX0;
    {
      const fs = big ? 20 : 14, h = big ? 40 : 28, tm = fmtTime(G.time), n = '◆ ' + st.scales + ' / 20';
      ctx.font = K.FONT(fs);
      const w = ctx.measureText(tm).width + ctx.measureText(n).width + fs + 30, x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
      text(tm, x0 + 15, cy, fs, st.waiting ? '#aab' : C.paper, 'left', 'body');
      text(n, x0 + w - 15, cy, fs, '#9fffd8', 'right', 'body');
      timeX0 = x0;
    }
    K.drawMsg(st, st.waiting ? { text: K.BREAK, col: '#ffffff', t: 1, life: 2 } : st.msg, timeX0);
    if (!play || !st.ship) return;
    // the gap meter: how far behind the serpent is
    {
      const w = 260 * z, h = 14 * z, x = W / 2 - w / 2, y = H - 40 * z;
      ctx.fillStyle = 'rgba(16,26,40,0.85)'; rr(x - 10 * z, y - 20 * z, w + 20 * z, h + 30 * z, 10 * z); ctx.fill();
      text('Gap to the serpent', x + w / 2, y - 9 * z, 11 * z, '#ffffff', 'center', 'body');
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(x, y, w, h, h / 2); ctx.fill();
      const u = clamp(st.gap / 100, 0, 1), col = u < 0.3 ? '#ff5a4a' : u < 0.55 ? '#ffb04a' : '#8fe3b0';
      K.meter(x, y, w, h, u, col);
      if (st.goldBolts > 0) text('gold bolts x' + st.goldBolts, x + w + 16 * z, y + h / 2, 12 * z, C.gold, 'left', 'body');
    }
    const pl = plan(st), sh = st.ship, Hn = st.helm, Rn = st.harp;
    const kk = (id, what) => (K.quiet(id) ? '' : K.key(id, what) + ' ');
    {
      const bx = K.panel(Hn, 'helm', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(Hn, 'up') + kk(Hn, 'down') + 'ROW ' + (sh.row + 1), pl.helm.row !== sh.row, sh.ry !== sh.row, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, sh.cd > 0 ? 'Row! ' + Math.ceil(sh.cd) + 's' : kk(Hn, 'act') + 'ROW!', !!pl.helm.act, sh.burst > 0, z);
    }
    {
      const bx = K.panel(Rn, 'harpooner', 236, 58, z), cy = bx.y + 27 * z, chh = 23 * z, cw = (bx.w - 24 * z - 6 * z) / 2, x0 = bx.x + 12 * z;
      K.chip(x0, cy, cw, chh, kk(Rn, 'lr') + 'AIM', pl.harp.aim !== st.aim && !!pl.harp.target, false, z);
      K.chip(x0 + cw + 6 * z, cy, cw, chh, st.reload > 0 ? 'reload' : kk(Rn, 'act') + (st.goldBolts > 0 ? 'FIRE' : 'CRANK'), !!pl.harp.target && pl.harp.aim === st.aim && !st.cranking, st.cranking, z);
      if (st.cranking) { const u = st.crank; ctx.fillStyle = u >= 1 ? C.gold : '#ffffff'; rr(x0, cy + chh + 3 * z, (bx.w - 24 * z) * u, 3 * z, 1.5 * z); ctx.fill(); }
    }
    if (G.introT > 0 || st.state !== 'go' || st.waiting) return;
    const P = K.prompter(st), g = geom(st);
    {
      let s = null, col = C.gold, pulse = false;
      if (pl.helm.act) { s = 'ROW! ' + K.key(Hn, 'act'); pulse = true; }
      else if (pl.helm.row < sh.row) { s = 'Steer up! ' + K.key(Hn, 'up'); pulse = true; }
      else if (pl.helm.row > sh.row) { s = 'Steer down! ' + K.key(Hn, 'down'); pulse = true; }
      else if (sh.swamp > 0) { s = 'Swamped! Heavy steering'; col = '#bfe6ff'; }
      P.say(Hn, s, clamp(g.x + 40, 70, W - 70), g.deck - 110, col, pulse);
    }
    {
      let s = null, col = C.gold, pulse = false;
      const words = { mouth: 'the open mouth', tail: 'the tail tip', glob: 'the glob', throat: 'the glowing throat', boss: 'the throat (full crank!)', scale: 'the glowing scale' };
      if (pl.harp.target && pl.harp.target !== 'scale') {
        if (st.aim !== pl.harp.aim) { s = 'Aim at ' + words[pl.harp.target] + ' ' + K.key(Rn, pl.harp.aim > st.aim ? 'right' : 'left'); pulse = true; }
        else if (st.cranking && pl.harp.fire) { s = 'Let go!'; pulse = true; col = '#d9ffd0'; }
        else if (!st.cranking) { s = 'Hold ' + K.key(Rn, 'act') + ' to crank, let go to fire'; }
      }
      P.say(Rn, s, clamp(g.bx - 20, 70, W - 70), g.deck - 76, col, pulse);
    }
  }
  const medal = t => K.medal(t <= S.goldT, t <= S.silverT);

  MODES.serpentchase = {
    S, AIMS, plan, medal, geom, targets, solve,
    setup(st, L) {
      st.stats = { bites: 0, crashes: 0, slaps: 0, bursts: 0, mouth: 0, throat: 0, tails: 0, globs: 0, scales: 0, swallowed: 0, swamps: 0, rows: 0, shots: 0, helps: 0, roomT: [] };
      st.scales = 0; st.inT = [G.time, G.time]; st.personT = G.time; st.clock = 0; st.dist = 0;
      for (const row of L.grid) row.fill('.');
      room(st, L, 0);
    },
    room(k, L) { const st = G.mst; st.inT = [G.time, G.time]; st.personT = G.time; for (const row of L.grid) row.fill('.'); room(st, L, k); },
    step(dt) { tick(G.mst, dt); },
    draw() { const st = G.mst; if (!st.ship) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.ship) drawTop(st); },
    hud() { const st = G.mst; if (st.ship) hud(st); },
    stats() {
      const st = G.mst, s = st.stats;
      if (!s) return [];
      const out = [
        { label: 'Bites taken', value: String(s.bites) },
        { label: 'Mouth shots', value: String(s.mouth) },
        { label: 'Scales', value: st.scales + ' of 20' },
        { label: 'Medal', value: medal(G.time) },
      ];
      out.push('Swallowed: ' + s.swallowed + '. Crashes: ' + (s.crashes + s.slaps + s.bursts) + '. Throat shots: ' + s.throat + '. The longship made it to the fjord!');
      const hl = K.helpLine(s.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  const acts = h => ({ label: 'fire', labels: h === 0 ? ['row', 'fire'] : ['fire', 'row'] });
  VIKING.defs.serpentchase = {
    name: 'Sea Serpent Chase', world: 33, kind: 'team', mode: 'serpentchase', ownStep: true, ownHUD: true, noFalls: true, roomWord: 'Stretch',
    legend: {
      pip: '<kbd>W</kbd><kbd>S</kbd> steer / <kbd>A</kbd><kbd>D</kbd> aim',
      bo: '<kbd>↑</kbd><kbd>↓</kbd> steer / <kbd>←</kbd><kbd>→</kbd> aim',
      pad: 'stick steers or aims,',
    },
    tip: 'Outrun the sea serpent! The helm steers between the coils and rows; the harpooner cranks the ballista and shoots the open mouth.',
    act: acts(0),
    map: K.stubMap(),
    rooms: [
      { title: 'Open Water', helm: 0, dur: 38, done: 'Open water crossed!', act: acts(0),
        tip: 'Pip steers (▲ ▼ change row, action = Row!). Bo aims with ◀ ▶, holds the action to crank and lets go to fire at the open jaws!' },
      { title: 'The Skerries', helm: 1, dur: 38, rocks: true, done: 'Through the skerries!', act: acts(1),
        tip: 'Swap jobs! Bo steers round the rocks and the tail\'s shadow. Pip shoots the water globs out of the air.' },
      { title: 'Fog Bank', helm: 0, dur: 38, fog: true, done: 'Out of the fog!', act: acts(0),
        tip: 'You can only see a little way ahead: watch for foam and bubbles. Row! through the closing loops!' },
      { title: 'The Maelstrom', helm: 1, dur: 40, whirl: true, done: 'The Maelstrom!', act: acts(1),
        tip: 'The whirlpool keeps dragging the ship toward the near row: steer back! At the end, crank a FULL bolt down the serpent\'s throat!' },
    ],
  };

  /* ---------- sounds ---------- */
  Sfx.extra.serpentchaseRow = function () { [0, 0.12, 0.24].forEach(d => { this.tone(120, 0.1, 'sine', 0.07, 60, d); this.tone(240, 0.05, 'triangle', 0.02, 160, d); }); };
  Sfx.extra.serpentchaseCreak = function () { this.tone(260, 0.05, 'sawtooth', 0.01, 200); };
  Sfx.extra.serpentchaseFire = function (c) { c = c || 0.5; this.tone(700 + c * 500, 0.08, 'square', 0.03, 200); this.tone(160, 0.12, 'triangle', 0.04, 90, 0.02); };
  Sfx.extra.serpentchaseSnap = function () { this.tone(220, 0.08, 'square', 0.04, 90); this.tone(160, 0.1, 'square', 0.04, 70, 0.05); };
  Sfx.extra.serpentchaseSlam = function () { this.tone(90, 0.3, 'sine', 0.09, 40); this.tone(600, 0.3, 'sawtooth', 0.01, 120); };
  Sfx.extra.serpentchaseSpit = function () { this.tone(400, 0.2, 'sawtooth', 0.02, 900); };
  Sfx.extra.serpentchaseYelp = function () { this.tone(700, 0.15, 'sawtooth', 0.03, 1200); this.tone(500, 0.2, 'square', 0.02, 300, 0.1); };
  Sfx.extra.serpentchaseFanfare = function () { [294, 392, 494, 587, 494, 587, 784].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.055, null, i * 0.12)); };
})();
