/* Pip & Bo - Level 34-4 Longship Race (versus, World 34 Viking Voyage). */
'use strict';

/* ===== 34-4 Longship Race (mode 'longshiprace', versus, best of 5, Gavyn's pick) =====
   Two longships side by side on a scrolling sea. Row hard, catch the wave crests, and ram the other ship onto the rocks.
   ONE SHARED SCREEN, side-on with depth: the course scrolls right and has 4 lanes drawn as depth bands (lane 0 far, lane
   3 near). Both ships are on the same water, so they can collide. The camera follows the midpoint; a ship that falls a
   full screen behind is caught up to the left edge (the rubber band) and takes a 1 s PENALTY (no rowing) instead of
   leaving the screen. A progress strip at the top shows both ships and the finish. def.ownStep: the mode runs the
   live tick and draws everything (the engine bodies only follow for name tags and bubbles).
   ROWING: each action press is an oar stroke, and the skill is timing, not mashing. A drum beats every LR.beat s (the
     HUD drum and each player's beat bar). Only the first stroke in each beat interval counts: on the beat (within
     LR.onBeat s) +LR.on px/s ("HEAVE!"), off it +LR.off. Three strokes in under LR.crabT s CATCH A CRAB (the oars tangle:
     LR.crabStop s of no rowing). Speed fades by itself (LR.decay).
   STEER ▲ ▼ between lanes (LR.laneT s; a jump press also steers up). Hold ◀ to back-water (slow down behind a hazard).
   WAVE CRESTS roll across the course from behind. A stroke landed in the LR.surgeWin s window as a crest lifts your
     stern is a SURGE: +LR.surge px/s (Storm Run +LR.stormSurge) and a spray plume (the ship tilts up as it arrives).
   RAMMING: steering into the other ship's lane while alongside shoves it one lane over (the rammer bounces back and
     loses LR.ramLoss of its speed); a ship that can't be shoved (an edge lane) is pinned and loses speed instead. Hitting
     the other ship's stern from behind spins its steering for LR.spinT s. SHIELD WALL: HOLD the action (after the
     stroke) to brace for up to LR.braceMax s (LR.braceCD s cooldown, no rowing while braced): un-shovable, and the
     rammer bounces off. (The spec says "hold down" for the shield wall; down steers here, so it's a held action.)
   HAZARDS in lanes, each with a marker at the right edge LR.markT s ahead: ROCKS (crash: stop dead for 1 s and lose a
     shield off the rail), ICE FLOES (slow to half while in them), WHIRLPOOLS (pull you a lane toward them; sit in one
     and you spin), a WHALE that surfaces (a ramp: hit it fast and you jump; slow and it's a bump), FOG (the markers are
     hidden), and GATES between sea stacks where only the two middle lanes are open (that's where ramming pays).
   ROUNDS (def.match: best of 5, 60 s cap): Fjord Sprint, Skerry Slalom, Iceberg Alley, Whirlpool Sound, Storm Run.
     First across the line wins the round. TIME UP: further along by more than 20 px wins, else a tie. tiebreak(): more
     Surges this match.
   CATCH-UP HELP (gold, announced at GO, counted, off in sudden death, for whoever is a round behind, the computer too):
     a GOLD SAIL: top speed +8% and a wider beat window.
   CONTROLS (p.input / p.pendingAct only, so keyboard, controller and touch all work): action = row (hold = shield
     wall), ▲ ▼ steer, ◀ back-water.
   MODES.longshiprace.plan(st, id) (speed, the beat timing, what is ahead in each lane, crests, the other ship) feeds
     the prompts and the computer brain. Everything lives inside this block; sounds are Sfx.extra.longshiprace*. */
(() => {
  const K = VIKING, TAU = Math.PI * 2;
  const LR = {
    beat: 0.5, onBeat: 0.12, goldBeat: 0.18, on: 26, off: 12, decay: 0.3, drag0: 4, vMax: 230, goldMax: 248, vCap: 320,
    crabT: 0.3, crabStop: 0.5, laneT: 0.25, back: 160, surge: 90, stormSurge: 110, surgeWin: 0.4, crestV: 330,
    ramLoss: 0.15, spinT: 0.6, braceAfter: 0.22, braceMax: 1.5, braceCD: 4, rockStop: 1.0, markT: 1.2,
    len: 124, laneY: [262, 312, 362, 412], startX: 80, roundTime: 60, finishPad: 20, band: 760, penT: 1.0,
  };
  const COURSES = [
    { title: 'Fjord Sprint', len: 7400, crest: [3.2, 4.0], items: ['r1800:1', 'r3300:2', 'r4700:0', 'r5600:3', 'r6400:1'] },
    { title: 'Skerry Slalom', len: 7600, crest: [3.6, 4.6], items: ['r1200:0', 'r1300:3', 'r1900:1', 'r2500:2', 'g3000:500', 'r3900:0', 'r4100:2', 'r4600:1', 'r4700:3', 'g5300:500', 'r6300:2', 'r6500:0', 'r6900:1'] },
    { title: 'Iceberg Alley', len: 7600, crest: [3.6, 4.6], items: ['f1300:1', 'f1700:3', 'r2200:0', 'h2700:2', 'f3200:0', 'f3300:1', 'g3900:600', 'r4800:3', 'f5300:2', 'h5800:1', 'f6300:0', 'r6700:2'] },
    { title: 'Whirlpool Sound', len: 7600, crest: [3.4, 4.4], items: ['w1500:1', 'r2100:3', 'F2400:1100', 'w2800:2', 'r3200:0', 'w3900:0', 'r4300:2', 'w5000:3', 'F5300:900', 'r5700:1', 'w6300:2', 'r6800:0'] },
    { title: 'Storm Run', len: 8000, crest: [2.4, 3.0], storm: true, items: ['r1300:2', 'f1800:0', 'w2300:3', 'g2900:500', 'h3800:1', 'r4300:3', 'F4600:800', 'w5000:1', 'f5500:2', 'r5900:0', 'g6300:500', 'r7300:1', 'w7500:3'] },
  ];
  function compile(C, k) {
    const items = [], gates = [], fogs = [];
    C.items.forEach((tok, i) => {
      const ch = tok[0], [a, b] = tok.slice(1).split(':').map(Number);
      if (ch === 'g') { gates.push({ x: a, w: b }); for (const lane of [0, 3]) items.push({ kind: 'stack', x: a, w: b, lane, i: items.length }); return; }
      if (ch === 'F') { fogs.push({ x: a, w: b }); return; }
      const kind = { r: 'rock', f: 'floe', w: 'whirl', h: 'whale' }[ch];
      items.push({ kind, x: a, lane: b, w: kind === 'floe' ? 170 : kind === 'whirl' ? 110 : kind === 'whale' ? 90 : 46, i: items.length, ph: K.hash(a + k) * 6 });
    });
    return { title: C.title, len: C.len, crest: C.crest, storm: !!C.storm, items, gates, fogs };
  }

  function newRound(st, n, info) {
    const k = st.forceRound != null ? st.forceRound : Math.min(n - 1, COURSES.length - 1);
    st.c = compile(COURSES[k], k); st.round = n; st.t = 0; st.beatN = 0;
    const w = info.wins || [0, 0];
    st.pl = [0, 1].map(id => ({
      id, x: LR.startX, v: 0, lane: id === 0 ? 1 : 2, ly: id === 0 ? 1 : 2, laneT: 0, crab: 0, strokes: [], lastBeat: -1, spin: 0,
      stop: 0, brace: 0, braceCD: 0, held: 0, pen: 0, air: 0, slow: 0, hit: {}, crestDone: {}, streak: 0, tilt: 0, oar: 0, flash: 0, word: null,
      shields: [0, 1, 2, 3, 0, 1, 2].map(q => K.SHIELD_COLS[(q + id * 2) % K.SHIELD_COLS.length]), sail: 0.6,
      gold: info.suddenDeath || st.noHelp ? 0 : (w[1 - id] - w[id] >= 1 ? 1 : 0), upHeld: false, downHeld: false, ram: 0,
    }));
    st.crests = []; st.crestT = 1.5; st.cam = 0; st.res = null; st.shake = 0;
    K.fx(st);
    mirror(st);
  }
  const vMaxOf = P => (P.gold ? LR.goldMax : LR.vMax);
  const winOf = P => (P.gold ? LR.goldBeat : LR.onBeat);
  // seconds from the nearest beat (negative = early), and that beat's number
  function beatOff(st, t = st.t) { const n = Math.round(t / LR.beat); return { n, d: t - n * LR.beat }; }

  /* ---------- the tick ---------- */
  function tick(st, dt, live) {
    if (!st.pl) return;
    st.t += dt;
    const bn = Math.floor(st.t / LR.beat + 0.5);
    if (live && bn !== st.beatN) { st.beatN = bn; Sfx.play('vikingDrum'); }
    if (live) crests(st, dt);
    for (const P of st.pl) ship(st, P, dt, live);
    if (live) { ram(st); band(st); }
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
    if (live && !st.res) {
      const fin = st.pl.filter(P => P.x >= st.c.len);
      if (fin.length) {
        st.res = true;
        const w = fin.length === 2 ? (Math.abs(st.pl[0].x - st.pl[1].x) < 1 ? -1 : st.pl[0].x > st.pl[1].x ? 0 : 1) : fin[0].id;
        if (w >= 0) st.stat.wins[w]++;
        Sfx.play('vikingHorn'); Sfx.play('vikingCheer');
        matchRoundEnd(w, w < 0 ? 'Bow to bow: a dead heat!' : NAMES[w] + '\'s longship crossed the line first!');
      }
    }
    const mid = (st.pl[0].x + st.pl[1].x) / 2;
    st.cam = K.lerp(st.cam, Math.max(0, mid - W * 0.45), Math.min(1, dt * 5));
    if (st.shake > 0) st.shake -= dt;
    K.tickFx(st, dt);
    mirror(st);
  }
  function crests(st, dt) {
    st.crestT -= dt;
    if (st.crestT <= 0) {
      const [a, b] = st.c.crest;
      st.crestT = a + Math.random() * (b - a);
      st.crests.push({ x: st.cam - 120, n: (st.crestN = (st.crestN || 0) + 1) });
    }
    for (const q of st.crests) q.x += LR.crestV * dt;
    st.crests = st.crests.filter(q => q.x < st.cam + W + 200 && q.x < st.c.len + 400);
  }
  // the crest lifting this ship's stern right now (its window is open), or null
  function crestAt(st, P) {
    const stern = P.x - LR.len / 2, rel = LR.crestV - P.v;
    for (const q of st.crests) { if (P.crestDone[q.n]) continue; const d = q.x - stern; if (d >= 0 && d <= Math.max(30, rel * LR.surgeWin)) return q; }
    return null;
  }
  function ship(st, P, dt, live) {
    const p = G.players[P.id], i = live ? p.input : NO_INPUT, act = live && p.pendingAct;
    if (P.flash > 0) P.flash -= dt;
    if (P.braceCD > 0) P.braceCD -= dt;
    if (P.spin > 0) P.spin -= dt;
    if (P.crab > 0) P.crab -= dt;
    if (P.stop > 0) P.stop -= dt;
    if (P.pen > 0) P.pen -= dt;
    if (P.air > 0) P.air -= dt;
    if (P.ram > 0) P.ram -= dt;
    // steering (not while spun, crashed or braced)
    if (live && P.spin <= 0 && P.stop <= 0 && P.brace <= 0) {
      if (((i.up && !P.upHeld) || p.pendingJump) && P.lane > 0) { P.lane--; P.laneT = LR.laneT; Sfx.play('longshipraceSteer', P.id); }
      if (i.down && !P.downHeld && P.lane < 3) { P.lane++; P.laneT = LR.laneT; Sfx.play('longshipraceSteer', P.id); }
    }
    P.upHeld = !!i.up; P.downHeld = !!i.down;
    P.ly = approach(P.ly, P.lane, dt / LR.laneT);
    if (P.spin > 0) P.ly = P.lane + Math.sin(P.spin * 30) * 0.08;
    // the shield wall: the action held after a stroke
    if (live && i.act && P.braceCD <= 0) { P.held += dt; if (P.held >= LR.braceAfter && P.brace <= 0 && P.held < LR.braceAfter + dt * 1.5) { P.brace = LR.braceMax; Sfx.play('vikingClang'); } }
    else { if (P.brace > 0) { P.brace = 0; P.braceCD = LR.braceCD; } P.held = 0; }
    if (P.brace > 0) { P.brace -= dt; if (P.brace <= 0) { P.braceCD = LR.braceCD; } }
    // a stroke
    if (act && P.stop <= 0 && P.pen <= 0 && P.air <= 0) stroke(st, P);
    // speed
    if (live && i.left && !i.right) P.v -= LR.back * dt;
    P.v -= (P.v * LR.decay + LR.drag0) * dt;
    if (P.slow > 0) { P.slow -= dt; P.v = Math.min(P.v, 90); }
    if (P.stop > 0) P.v = 0;
    P.v = clamp(P.v, 0, LR.vCap);
    if (!live) { P.v = Math.max(0, P.v - 200 * dt); }
    P.oar += dt * (0.3 + P.v / 180);
    P.sail = K.lerp(P.sail, clamp(0.3 + P.v / 260, 0, 1), dt * 3);
    P.tilt = K.lerp(P.tilt, crestAt(st, P) ? 0.12 : P.air > 0 ? 0.2 : 0, dt * 8);
    const nx = P.x + P.v * dt;
    if (live) hazards(st, P, nx, dt);
    P.x += P.v * dt;
  }
  function stroke(st, P) {
    const now = st.t;
    P.strokes = P.strokes.filter(t => now - t < LR.crabT); P.strokes.push(now);
    if (P.crab > 0) return;
    if (P.strokes.length >= 3) { P.crab = LR.crabStop; P.strokes = []; P.streak = 0; st.stat.crabs[P.id]++; say(st, P, 'Crab! Oars tangled!', '#ffb0a0'); Sfx.play('longshipraceCrab'); return; }
    Sfx.play('vikingOar');
    // a crest under the stern: a Surge
    const q = crestAt(st, P);
    if (q) {
      P.crestDone[q.n] = true;
      P.v = Math.min(LR.vCap, P.v + (st.c.storm ? LR.stormSurge : LR.surge));
      st.stat.surges[P.id]++; P.flash = 0.5; say(st, P, 'SURGE!', '#bfeaff'); Sfx.play('longshipraceSurge');
      K.splash(st, P.x - st.cam - LR.len / 2, laneY(P.ly), 14);
    }
    const b = beatOff(st, now);
    if (b.n === P.lastBeat) return; // one stroke a beat counts
    P.lastBeat = b.n;
    const on = Math.abs(b.d) <= winOf(P);
    if (!q) P.v = Math.min(vMaxOf(P), P.v + (on ? LR.on : LR.off));
    if (on) { P.streak++; st.stat.best[P.id] = Math.max(st.stat.best[P.id], P.streak); if (P.streak % 8 === 0) say(st, P, 'HEAVE! x' + P.streak, '#d9ffd0'); }
    else P.streak = 0;
    P.lastOn = on; P.lastD = b.d;
  }
  function say(st, P, s, col) { K.pop(st, P.x - st.cam, laneY(P.ly) - 90, s, col || '#ffffff', 18); }
  function laneOf(P) { return Math.round(P.ly); }
  function hazards(st, P, nx, dt) {
    if (P.air > 0) return;
    const lane = laneOf(P), front = nx + LR.len / 2, back = nx - LR.len / 2;
    for (const q of st.c.items) {
      if (front < q.x || back > q.x + q.w) continue;
      if (q.kind === 'whirl') {
        if (P.hit[q.i]) continue;
        if (Math.abs(q.lane - lane) === 1 && P.brace <= 0) { P.hit[q.i] = true; P.lane = q.lane; P.laneT = LR.laneT; say(st, P, 'Pulled in!', '#bfeaff'); }
        else if (q.lane === lane) { P.hit[q.i] = true; P.spin = 0.8; P.v *= 0.6; st.stat.spins[P.id]++; say(st, P, 'Whirlpool! Spin!', '#bfeaff'); Sfx.play('longshipraceWhirl'); }
        continue;
      }
      if (q.lane !== lane || P.hit[q.i]) continue;
      if (q.kind === 'floe') { P.v = Math.min(P.v, Math.max(60, P.v - 260 * dt)); if (P.v > 95) P.v = 95; continue; }
      P.hit[q.i] = true;
      if (q.kind === 'whale') {
        if (P.v >= 150) { P.air = 0.9; P.v += 30; say(st, P, 'Whale jump!', '#d9ffd0'); Sfx.play('longshipraceWhale'); st.stat.whales[P.id]++; }
        else { P.v *= 0.5; say(st, P, 'Bump!', '#ffe7a8'); Sfx.play('vikingThunk'); }
        continue;
      }
      // a rock or a sea stack
      crash(st, P);
    }
  }
  function crash(st, P) {
    P.stop = LR.rockStop; P.v = 0; P.streak = 0; st.stat.crashes[P.id]++; st.shake = 0.35;
    const k = P.shields.findIndex(c => c); if (k >= 0) P.shields[k] = null;
    say(st, P, 'CRASH!', '#ffb0a0'); Sfx.play('longshipraceCrash'); rumble(P.id, 0.5, 0.6, 250);
    K.dust(st, P.x - st.cam + LR.len / 2, laneY(P.ly) - 10, '#e8f4f6', 10);
  }
  // ramming: steering into the other ship's lane alongside, or hitting its stern from behind
  function ram(st) {
    const [A, B] = st.pl;
    for (const [R, T] of [[A, B], [B, A]]) {
      if (R.ram > 0 || R.air > 0 || T.air > 0) continue;
      const dx = R.x - T.x, al = Math.abs(dx) < LR.len * 0.7;
      // side ram: R is moving into T's lane while alongside
      if (al && R.lane === T.lane && Math.abs(R.ly - T.ly) < 0.65 && Math.abs(R.ly - R.lane) > 0.05) {
        const dir = Math.sign(R.lane - R.ly) || 1; // which way R is moving
        R.ram = 0.6; R.lane = R.lane - dir; R.laneT = LR.laneT;
        if (T.brace > 0) { R.v *= 0.75; say(st, R, 'Bounced off the shields!', '#ffe7a8'); Sfx.play('vikingClang'); st.stat.blocks[T.id]++; continue; }
        R.v *= 1 - LR.ramLoss;
        const nl = T.lane + dir;
        if (nl >= 0 && nl <= 3) { T.lane = nl; T.laneT = LR.laneT; say(st, T, 'RAMMED!', '#ffb0a0'); }
        else { T.v *= 0.8; say(st, T, 'Pinned!', '#ffb0a0'); }
        st.stat.rams[R.id]++; Sfx.play('longshipraceRam'); st.shake = 0.2;
        const k = T.shields.findIndex(c => c); if (k >= 0 && Math.random() < 0.5) T.shields[k] = null;
        continue;
      }
      // from behind: R's bow into T's stern in the same lane
      if (laneOf(R) === laneOf(T) && dx < 0 && -dx < LR.len && R.v > T.v + 20) {
        R.ram = 0.6; R.x = T.x - LR.len - 1;
        if (T.brace > 0) { R.v = T.v * 0.6; say(st, R, 'Bounced off the shields!', '#ffe7a8'); Sfx.play('vikingClang'); st.stat.blocks[T.id]++; continue; }
        R.v = T.v * 0.85; T.spin = LR.spinT; st.stat.rams[R.id]++; say(st, T, 'Rammed from behind!', '#ffb0a0'); Sfx.play('longshipraceRam');
      }
    }
  }
  // the rubber band: a ship a full screen behind is caught up to the left edge, with a 1 s penalty
  function band(st) {
    const [A, B] = st.pl, lead = A.x >= B.x ? A : B, tr = lead === A ? B : A;
    if (lead.x - tr.x > LR.band && tr.pen <= 0) {
      tr.x = lead.x - LR.band + 40; tr.v = lead.v * 0.6; tr.pen = LR.penT; st.stat.bands[tr.id]++;
      say(st, tr, 'Catch up! 1 s penalty', '#ffe7a8'); Sfx.play('longshipraceBand');
    }
  }
  const laneY = ly => LR.laneY[0] + ly * (LR.laneY[1] - LR.laneY[0]);
  function mirror(st) { for (const P of st.pl) K.place(P.id, clamp(P.x - st.cam, 40, W - 40), laneY(P.ly) - 74); }

  /* ---------- what's ahead ----------
     plan(st, id, look): { v, vMax, lane, beat: { d (s from the nearest beat), next (s to the next beat), counted (this
       beat already rowed), win }, crest (a crest under the stern now) / crestIn (s until the next crest reaches the
       stern), ahead: [per lane: { kind, d } the nearest thing within `look` px], safe: [lanes clear within look],
       gate (the gate ahead within look), other: { dx, lane, ly, brace } } */
  function plan(st, id, look = 240) {
    const P = st.pl[id], O = st.pl[1 - id], b = beatOff(st);
    const ahead = [null, null, null, null];
    for (const q of st.c.items) {
      if (P.hit[q.i] && q.kind !== 'floe' && q.kind !== 'stack') continue;
      const d = q.x - (P.x + LR.len / 2);
      if (d + q.w < -LR.len || d > look) continue;
      const lanes = q.kind === 'whirl' ? [q.lane] : [q.lane];
      for (const l of lanes) if (!ahead[l] || ahead[l].d > d) ahead[l] = { kind: q.kind, d, q };
    }
    const bad = l => ahead[l] && (ahead[l].kind === 'rock' || ahead[l].kind === 'stack' || ahead[l].kind === 'whirl' || ahead[l].kind === 'floe' || ahead[l].kind === 'whale' && P.v < 150);
    const safe = [0, 1, 2, 3].filter(l => !bad(l) && !(st.c.items.some(q => q.kind === 'whirl' && Math.abs(q.lane - l) === 1 && q.x - (P.x + LR.len / 2) < look && q.x + q.w > P.x - LR.len / 2 && !P.hit[q.i])));
    let crestIn = 99;
    const stern = P.x - LR.len / 2;
    for (const q of st.crests) { if (P.crestDone[q.n]) continue; const d = stern - q.x; if (d > 0) crestIn = Math.min(crestIn, d / Math.max(30, LR.crestV - P.v)); }
    const fog = st.c.fogs.some(f => P.x > f.x - 200 && P.x < f.x + f.w);
    return {
      v: P.v, vMax: vMaxOf(P), lane: P.lane, ly: P.ly, crab: P.crab, stop: P.stop, pen: P.pen,
      beat: { d: b.d, n: b.n, next: LR.beat - ((st.t + LR.beat / 2) % LR.beat) - LR.beat / 2, counted: P.lastBeat === b.n, win: winOf(P) },
      crest: !!crestAt(st, P), crestIn, ahead, safe, fog,
      gate: st.c.gates.find(g => g.x + g.w > P.x - LR.len / 2 && g.x - (P.x + LR.len / 2) < look) || null,
      other: { dx: O.x - P.x, lane: O.lane, ly: O.ly, brace: O.brace > 0, v: O.v },
      brace: P.brace, braceCD: P.braceCD,
    };
  }

  MODES.longshiprace = {
    plan, LR, COURSES,
    setup(st, L) {
      for (const row of L.grid) row.fill('.');
      st.stat = { wins: [0, 0], surges: [0, 0], rams: [0, 0], crashes: [0, 0], best: [0, 0], crabs: [0, 0], spins: [0, 0], blocks: [0, 0], whales: [0, 0], bands: [0, 0] };
      st.stats = { helps: 0 };
      st.forceRound = this.testRound != null ? this.testRound : null;
      st.noHelp = !!this.testNoHelp;
      st.t = 0;
      K.fx(st);
    },
    resetRound(n, info) { const st = G.mst; newRound(st, n, info); G.particles.length = 0; },
    go() {
      const st = G.mst;
      Sfx.play('vikingHorn');
      const g = st.pl.filter(P => P.gold);
      if (g.length) K.goldHelp(st, 'Gold sail for ' + NAMES[g[0].id] + ': a faster ship and an easier drum beat!');
      else if (st.round === 1) K.msg(st, 'Row on the drum beat! Tapping too fast tangles the oars', '#ffffff', 4);
      else K.msg(st, 'Round ' + st.round + ': ' + st.c.title, '#ffffff', 2.6);
    },
    step(dt) { tick(G.mst, dt, true); },
    idle(dt) { const st = G.mst; if (st.pl) tick(st, dt, false); },
    timeUp() {
      const st = G.mst, [A, B] = st.pl;
      const w = Math.abs(A.x - B.x) <= LR.finishPad ? -1 : A.x > B.x ? 0 : 1;
      if (w >= 0) st.stat.wins[w]++;
      st.res = true;
      return { winner: w, reason: w < 0 ? 'Time! Side by side!' : 'Time! ' + NAMES[w] + '\'s longship got further!' };
    },
    tiebreak() {
      const s = G.mst.stat;
      if (s.surges[0] !== s.surges[1]) return { winner: s.surges[0] > s.surges[1] ? 0 : 1, reason: 'More Surges wins the tiebreak!' };
      return -1;
    },
    draw() { const st = G.mst; if (!st.pl) return; drawWorld(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.pl) K.drawPops(st); },
    hud() { const st = G.mst; if (st.pl && G.match) hud(st); },
    stats() {
      const st = G.mst, s = st.stat;
      if (!s) return [];
      const out = [
        { label: 'Rounds won', values: (G.match ? G.match.wins : s.wins).slice() },
        { label: 'Surges', values: s.surges.slice() },
        { label: 'Rams landed', values: s.rams.slice() },
        { label: 'Crashes', values: s.crashes.slice() },
        { label: 'Best beat streak', values: s.best.map(v => String(v)) },
      ];
      const b = s.best;
      out.push('★ Best drummer: ' + (b[0] === b[1] ? 'a tie at ' + b[0] + ' beats in a row' : NAMES[b[0] > b[1] ? 0 : 1] + ' (' + Math.max(b[0], b[1]) + ' beats in a row)'));
      const hl = K.helpLine(st.stats ? st.stats.helps : 0);
      if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- drawing ---------- */
  function drawWorld(st) {
    const t = st.t, c = st.c, cam = st.cam, sx = x => x - cam;
    ctx.save();
    if (st.shake > 0) ctx.translate((Math.random() - 0.5) * 8 * st.shake / 0.35, (Math.random() - 0.5) * 6 * st.shake / 0.35);
    K.sky(cam * 0.05, t, { storm: c.storm ? 0.8 : 0, sleet: c.storm ? 0.7 : 0, dusk: st.round === 4 });
    K.fjords(cam, t, { base: 232, dim: c.storm ? 0.5 : 0 });
    K.sea(cam, t, 228, { rough: c.storm ? 1 : 0.3, rows: [228, 290, 345, 398] });
    // the finish line: two carved posts and a banner
    const fx = sx(c.len);
    if (fx > -40 && fx < W + 40) {
      ctx.fillStyle = '#5a3418'; ctx.fillRect(fx - 4, 200, 8, 260);
      for (let k = 0; k < 12; k++) { ctx.fillStyle = k % 2 ? '#ffffff' : '#1a1a2a'; ctx.fillRect(fx - 4, 210 + k * 20, 8, 10); }
      ctx.fillStyle = '#c8323a'; rr(fx - 50, 186, 100, 22, 6); ctx.fill(); text('FINISH', fx, 198, 13, '#ffffff', 'center', 'body');
    }
    // gates: sea stacks over the outer lanes
    for (const g of c.gates) {
      const x0 = sx(g.x); if (x0 > W + 40 || x0 + g.w < -40) continue;
      for (const lane of [0, 3]) for (let x = g.x; x < g.x + g.w; x += 70) stack(sx(x) + 30, laneY(lane), lane === 0 ? 0.8 : 1);
    }
    // crests (behind the ships): a white-capped hump rolling across every lane
    for (const q of st.crests) {
      const x = sx(q.x); if (x < -90 || x > W + 90) continue;
      for (let lane = 0; lane < 4; lane++) {
        const y = laneY(lane) + 6, s = 0.8 + lane * 0.08;
        ctx.fillStyle = 'rgba(95,147,168,0.85)';
        ctx.beginPath(); ctx.moveTo(x - 80 * s, y + 6); ctx.quadraticCurveTo(x - 30 * s, y - 26 * s, x + 6 * s, y - 22 * s);
        ctx.quadraticCurveTo(x + 20 * s, y - 18 * s, x + 14 * s, y - 8 * s); ctx.quadraticCurveTo(x + 24 * s, y, x + 30 * s, y + 6); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - 40 * s, y - 14 * s); ctx.quadraticCurveTo(x - 12 * s, y - 26 * s, x + 6 * s, y - 22 * s); ctx.quadraticCurveTo(x + 20 * s, y - 18 * s, x + 12 * s, y - 9 * s); ctx.stroke(); ctx.lineCap = 'butt';
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; for (let k = 0; k < 3; k++) { circle(x + (4 + k * 6) * s + Math.sin(t * 9 + k) * 2, y - (20 - k * 5) * s, 2.2); ctx.fill(); }
      }
    }
    // the lanes from far to near: hazards and ships in each
    for (let lane = 0; lane < 4; lane++) {
      const y = laneY(lane), s = 0.78 + lane * 0.07;
      for (const q of c.items) {
        if (q.lane !== lane || q.kind === 'stack') continue;
        const x = sx(q.x); if (x < -200 || x > W + 60) continue;
        if (q.kind === 'rock') rock(x + q.w / 2, y, s);
        else if (q.kind === 'floe') floe(x, y, q.w, s);
        else if (q.kind === 'whirl') whirl(x + q.w / 2, y, s, t);
        else if (q.kind === 'whale') whale(st, q, x + q.w / 2, y, s, t);
      }
      for (const P of st.pl) if (Math.round(P.ly) === lane || (lane === 3 && P.ly > 3)) drawShip(st, P, sx(P.x), laneY(P.ly), 0.5 + P.ly * 0.045, t);
    }
    // fog banks
    for (const f of c.fogs) { const x0 = sx(f.x), x1 = sx(f.x + f.w); if (x1 > 0 && x0 < W) K.fog(Math.max(0, x0), Math.min(W, x1), t, 0.55); }
    // markers at the right edge for hazards coming up
    const edge = cam + W, look = Math.max(st.pl[0].v, st.pl[1].v, 160) * LR.markT;
    const fogged = c.fogs.some(f => edge > f.x - 100 && edge < f.x + f.w + 100);
    if (!fogged) for (const q of c.items) {
      const d = q.x - edge; if (d < -20 || d > look) continue;
      const y = laneY(q.lane) - 20, col = q.kind === 'rock' || q.kind === 'stack' ? '#ff5a4a' : q.kind === 'whale' ? '#8fe3b0' : '#bfeaff';
      ctx.fillStyle = 'rgba(20,22,52,0.8)'; rr(W - 44, y - 14, 38, 28, 8); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(W - 40, y); ctx.lineTo(W - 28, y - 9); ctx.lineTo(W - 28, y + 9); ctx.closePath(); ctx.fill();
      text(q.kind === 'rock' || q.kind === 'stack' ? '!' : q.kind === 'whirl' ? '@' : q.kind === 'floe' ? '❄' : '~', W - 17, y + 1, 14, col, 'center', 'body');
    }
    K.drawParts(st);
    ctx.restore();
  }
  function rock(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#5a5e66'; ctx.beginPath(); ctx.moveTo(-30, 4); ctx.lineTo(-22, -26); ctx.lineTo(-4, -40); ctx.lineTo(16, -30); ctx.lineTo(30, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a8e96'; ctx.beginPath(); ctx.moveTo(-22, -26); ctx.lineTo(-4, -40); ctx.lineTo(0, -20); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(232,244,246,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-34, 4); ctx.quadraticCurveTo(0, -4, 34, 4); ctx.stroke();
    ctx.restore();
  }
  function stack(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#4a4e56'; ctx.beginPath(); ctx.moveTo(-26, 6); ctx.lineTo(-18, -80); ctx.lineTo(0, -96); ctx.lineTo(18, -78); ctx.lineTo(26, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4f8fb'; ctx.beginPath(); ctx.moveTo(-18, -80); ctx.lineTo(0, -96); ctx.lineTo(18, -78); ctx.lineTo(0, -84); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function floe(x, y, w, s) {
    ctx.fillStyle = 'rgba(234,248,255,0.95)'; ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x + 14, y - 10 * s); ctx.lineTo(x + w * 0.5, y - 14 * s); ctx.lineTo(x + w - 10, y - 8 * s); ctx.lineTo(x + w, y + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(127,180,204,0.6)'; ctx.fillRect(x + 6, y - 2, w - 12, 4);
  }
  function whirl(x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s * 0.35);
    for (let k = 0; k < 4; k++) { ctx.strokeStyle = k % 2 ? 'rgba(232,244,246,0.8)' : 'rgba(26,58,80,0.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 50 - k * 11, t * 4 + k, t * 4 + k + 4.4); ctx.stroke(); }
    ctx.fillStyle = '#0e2030'; circle(0, 0, 8); ctx.fill();
    ctx.restore();
  }
  function whale(st, q, x, y, s, t) {
    const near = st.pl.some(P => q.x - P.x < 500 && q.x - P.x > -200);
    if (!near) { ctx.fillStyle = 'rgba(26,58,80,0.6)'; ctx.beginPath(); ctx.ellipse(x, y, 40 * s, 6 * s, 0, 0, TAU); ctx.fill(); return; }
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#3a4a62'; ctx.beginPath(); ctx.moveTo(-50, 4); ctx.quadraticCurveTo(-30, -30, 20, -26); ctx.quadraticCurveTo(48, -20, 52, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c8d4e0'; ctx.beginPath(); ctx.moveTo(-40, 4); ctx.quadraticCurveTo(0, -6, 46, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1a1a2a'; circle(32, -12, 2.5); ctx.fill();
    ctx.strokeStyle = 'rgba(232,244,246,0.9)'; ctx.lineWidth = 2; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(k * 10, -46 - Math.abs(Math.sin(t * 6)) * 6); ctx.stroke(); }
    ctx.restore();
  }
  function drawShip(st, P, x, y, s, t) {
    const lift = P.air > 0 ? Math.sin((1 - P.air / 0.9) * Math.PI) * 50 : 0;
    ctx.save();
    if (P.spin > 0) { ctx.translate(x, y); ctx.scale(Math.cos(P.spin * 20) > 0 ? 1 : -1, 1); ctx.translate(-x, -y); }
    K.longship(x, y - lift, { s, sail: P.sail, oars: P.crab > 0 ? null : P.oar, oarSpread: P.crab > 0 ? 0 : 1, tilt: P.tilt, shields: P.shields, gold: P.gold, sailCols: P.id === 0 ? ['#e8622a', '#f2e6c8'] : ['#3a7ad8', '#f2e6c8'] });
    ctx.restore();
    // the crew: Pip or Bo at the stern, steering
    K.viking(P.id, x - 44 * s, y - lift - 16 * s, { s: s * 1.2, face: 1, arms: P.brace > 0 ? 'up' : null, cloakV: P.v / 300 });
    if (P.brace > 0) for (let k = 0; k < 5; k++) K.shield(x - 40 * s + k * 22 * s, y - lift - 30 * s, 11 * s, { col: '#c8323a' });
    if (P.crab > 0) text('tangled!', x, y - lift - 100 * s, 13, '#ffb0a0', 'center', 'body');
    if (P.flash > 0) { ctx.fillStyle = 'rgba(232,244,246,' + P.flash + ')'; ctx.beginPath(); ctx.ellipse(x - 60 * s, y - 10, 30, 40 * P.flash, 0, 0, TAU); ctx.fill(); }
    if (P.pen > 0) text('penalty', x, y - lift - 110 * s, 12, '#ffe7a8', 'center', 'body');
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const big = hudBig(), z = big ? 1.3 : 1, live = G.match && G.match.phase === 'live';
    K.drawMsg(st, st.msg, W - 14);
    // the progress strip and the drum
    const sx = 200, sw = W - 400, sy = 98 * z;
    ctx.fillStyle = 'rgba(28,26,54,0.85)'; rr(sx - 12, sy - 9, sw + 24, 18, 9); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(sx + sw - 2, sy - 9, 4, 18);
    for (const P of st.pl) { const u = clamp((P.x - LR.startX) / (st.c.len - LR.startX), 0, 1); ctx.fillStyle = P.gold ? C.gold : PCOL[P.id]; circle(sx + u * sw, sy + (P.id ? 3 : -3), 7); ctx.fill(); }
    const b = beatOff(st), pulse = Math.max(0, 1 - Math.abs(b.d) / 0.1);
    const dx = W / 2 + sw / 2 + 60 * z, dy = sy + 2 * z;
    ctx.fillStyle = '#8a5a32'; ctx.beginPath(); ctx.ellipse(dx, dy, (18 + pulse * 4) * z, (12 + pulse * 3) * z, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f2e6c8'; ctx.beginPath(); ctx.ellipse(dx, dy - 4 * z, (16 + pulse * 4) * z, (7 + pulse * 2) * z, 0, 0, TAU); ctx.fill();
    if (pulse > 0.5) text('BOOM', dx, dy - 22 * z, 11 * z, '#ffe7a8', 'center', 'body');
    // each player's beat bar (bottom corners)
    for (const P of st.pl) {
      const bw = 210 * z, bh = 54 * z, bx = P.id === 0 ? 12 : W - 12 - bw, by = H - bh - 10;
      ctx.fillStyle = 'rgba(20,22,52,0.86)'; rr(bx, by, bw, bh, 14 * z); ctx.fill();
      ctx.strokeStyle = PCOL[P.id]; ctx.lineWidth = 2.5; rr(bx, by, bw, bh, 14 * z); ctx.stroke();
      text(NAMES[P.id] + (K.quiet(P.id) ? ' (computer)' : '') + '  ' + Math.round(P.v) + ' speed', bx + 12 * z, by + 14 * z, 12 * z, PCOL[P.id], 'left', 'body');
      const mx = bx + 12 * z, my = by + 28 * z, mw = bw - 24 * z, mh = 14 * z, win = winOf(P) / LR.beat;
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(mx, my, mw, mh, mh / 2); ctx.fill();
      ctx.fillStyle = P.gold ? 'rgba(255,197,61,0.6)' : 'rgba(143,227,176,0.55)'; ctx.fillRect(mx + mw * (0.5 - win), my, mw * win * 2, mh);
      const u = 0.5 + b.d / LR.beat;
      ctx.fillStyle = P.lastBeat === b.n ? (P.lastOn ? '#8fe3b0' : '#aab') : '#ffffff'; rr(mx + mw * u - 3, my - 3, 6, mh + 6, 3); ctx.fill();
      if (P.streak >= 3) text('x' + P.streak, mx + mw, by + 14 * z, 12 * z, '#d9ffd0', 'right', 'body');
      if (P.brace > 0) text('SHIELD WALL', mx + mw / 2, my + mh + 6 * z, 10 * z, C.gold, 'center', 'body');
      else if (P.braceCD > 0) text('shields ' + P.braceCD.toFixed(1), mx + mw / 2, my + mh + 6 * z, 10 * z, '#aab', 'center', 'body');
    }
    if (!live) return;
    // prompts for people
    const Pr = K.prompter(st);
    for (const P of st.pl) {
      if (K.quiet(P.id)) continue;
      const pl = plan(st, P.id, 280);
      let s = null, col = '#ffe7a8', pulseOn = false;
      if (P.crab > 0) { s = 'Crab! Tap on the beat, not faster'; col = '#ffb0a0'; }
      else if (pl.crest) { s = 'CREST! Row now! ' + K.key(P.id, 'act'); col = C.gold; pulseOn = true; }
      else if (!pl.safe.includes(P.lane) && pl.safe.length) { const r = pl.safe.reduce((a, c2) => (Math.abs(c2 - P.lane) < Math.abs(a - P.lane) ? c2 : a)); s = 'Steer ' + K.key(P.id, r < P.lane ? 'up' : 'down'); col = C.gold; pulseOn = true; }
      else if (st.round <= 2 && P.streak < 4) s = 'Tap ' + K.key(P.id, 'act') + ' on the drum BOOM';
      Pr.say(P.id, s, P.x - st.cam, laneY(P.ly) - 100, col, pulseOn);
    }
  }

  /* ---------- the level ---------- */
  VIKING.defs.longshiprace = {
    name: 'Longship Race', world: 33, kind: 'versus', mode: 'longshiprace', ownStep: true,
    match: { bestOf: 5, roundTime: LR.roundTime },
    act: { label: 'row' },
    tagLift: 30,
    legend: {
      pip: '<kbd>W</kbd><kbd>S</kbd> steer <kbd>A</kbd> slow',
      bo: '<kbd>↑</kbd><kbd>↓</kbd> steer <kbd>←</kbd> slow',
      pad: 'stick steers,',
    },
    tip: 'Row on the drum beat (tap the action on each BOOM), catch the white wave crests for a Surge, steer ▲ ▼ round rocks and ram the other ship! Hold the action for a shield wall.',
    switches: {}, signs: [],
    map: K.stubMap(),
  };

  /* ---------- sounds ---------- */
  Sfx.extra.longshipraceSteer = function (id) { this.tone(id ? 420 : 480, 0.05, 'triangle', 0.02, id ? 520 : 580); };
  Sfx.extra.longshipraceCrab = function () { this.tone(300, 0.2, 'square', 0.03, 140); this.tone(220, 0.2, 'square', 0.03, 100, 0.1); };
  Sfx.extra.longshipraceSurge = function () { this.tone(200, 0.4, 'sawtooth', 0.02, 600); this.tone(1200, 0.3, 'triangle', 0.02, 1800, 0.05); };
  Sfx.extra.longshipraceCrash = function () { this.tone(90, 0.3, 'square', 0.06, 40); [800, 1100].forEach((f, i) => this.tone(f, 0.08, 'square', 0.02, f * 0.4, i * 0.05)); };
  Sfx.extra.longshipraceRam = function () { this.tone(140, 0.18, 'square', 0.05, 70); this.tone(900, 0.1, 'triangle', 0.02, 500, 0.05); };
  Sfx.extra.longshipraceWhirl = function () { this.tone(500, 0.6, 'sine', 0.03, 120); };
  Sfx.extra.longshipraceWhale = function () { this.tone(120, 0.5, 'sine', 0.05, 300); };
  Sfx.extra.longshipraceBand = function () { this.tone(600, 0.15, 'triangle', 0.03, 300); };
})();
