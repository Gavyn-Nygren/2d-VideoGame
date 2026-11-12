/* Pip & Bo - Level 36-4 Stunt Show Showdown (versus, World 36 Movie Studio). */
'use strict';

/* ===== 36-4 Stunt Show Showdown (mode 'stuntshow', versus, best of 5, Gavyn's pick) =====
   The studio's live stunt show needs one new star. Five stunts, one a round, three judges, a full grandstand. The arena
   is split down the middle by a low tyre wall: Pip's half on the left, Bo's on the right, the same course in each, and
   both perform at once. Both halves run left to right (not mirrored, so ◀ ▶ mean the same for both players). ownStep.
   Half-local px: lx 0..480 (st.pl[id].ox is the half's left edge), the ground at SS.ground.
   SCORING: each stunt gives a number and three judges hold up 1-10: judge 1 the number (metres, turns, walls, hoops,
     time), judge 2 the Style, judge 3 the finish (the landing or entry; a Bail gets 1). Highest total of 30 wins; level
     on points: the better finish wins; still level: a tie, replayed as the same stunt once, then counted as a tie (the
     match moves on to the next stunt). Judges: Stern (left), Sleepy (middle), Very Excited (right).
   THE STUNTS (stunt k = st.si; a round is one stunt; the Grand Finale repeats if ties run the list out):
     0 Ramp Jump      HOLD the action to rev: the needle climbs, a green band drifts; let go to launch (nearer the
                      middle of the green = faster; past it, a wheelie loses speed). In the air ◀ ▶ spin the bike (each
                      full turn a flip); land within SS.landTol degrees of level or it's a Bail into the foam blocks.
                      Number = metres (past the FAKE prop buses; landing on them crushes cardboard and scores low).
     1 High Dive      ▲ climbs the tower while a 5 s clock runs (higher = more air, less time); the action jumps. In
                      the air hold ◀ or ▶ to somersault (▼ tucks: faster), then ▲ straightens for the entry: within
                      SS.entryTol degrees is a clean entry; anything else is a belly flop. Number = turns x height.
     2 Wall Smash     A sprint through 8 walls; one panel of three in each is FAKE foam (PROP tag, wobble), shown only
                      within SS.focus s of the wall at full speed. ▲ jump (high), nothing (middle), ▼ slide (low); the
                      action charges within SS.chargeWin s of the wall. ▶ faster, ◀ slower to look. A REAL panel is a
                      bonk (SS.bonkT s, the streak resets). Number = walls smashed; Style = the best streak; finish = time.
     3 Fire Hoop Leap Trampoline: press the action as you hit the bed (SS.bounceWin s window) to bounce higher, ◀ ▶
                      drift; through a hoop lights it, clipping one wobbles you down. Hold ▼ at the top for a pike
                      (Style; the next window is tighter). All five lit (or SS.hoopT s): land on the centre cross. Style = the
                      longest run of good bounces and the pikes.
     4 Grand Finale   Rev and jump a short ramp, land level, smash 3 walls, climb and dive through a flaming hoop into
                      the tank (▲ straightens). One clock; Number = the time; Style = the clean parts; finish = the entry.
   GOLD HELP (a round behind): a gold helmet for the next stunt, every window 30% wider (the rev band, the landing and
     entry angles, the charge and bounce windows). Announced and counted.
   THE CROWD: a huge trick on one side sends a camera-flash wave across the arena (only a distraction, on purpose).
   ROUND CAP SS.roundTime s: anyone not done is scored as a Bail.
   MODES.stuntshow.plan(st, id) gives the stunt's state for the prompts and the computer brain.
   Everything lives inside this block; sounds are Sfx.extra.stuntshow*. */
(() => {
  const K = STUDIO, TAU = Math.PI * 2, DEG = Math.PI / 180;
  const SS = {
    ground: 470, roundTime: 45, gold: 1.3,
    revRate: 0.55, band: 0.08, landTol: 20, spinRate: 600,
    climbRate: 0.42, climbT: 5, turnRate: 480, tuckRate: 900, straighten: 260, entryTol: 15,
    run: 240, runFast: 320, runSlow: 140, wallGap: 300, focus: 0.9, chargeWin: 0.3, bonkT: 1.2,
    bed: 440, grav: 1400, bounceWin: 0.2, pikeWin: 0.14, hoopR: 22, hoopClip: 36, hoopT: 15,
  };
  const STUNTS = [
    { key: 'ramp', name: 'Ramp Jump', tip: 'HOLD to rev, let go in the green. ◀ ▶ flip, land level!' },
    { key: 'dive', name: 'High Dive', tip: '▲ climb (5 s), action jumps. Hold ◀ ▶ to turn, ▼ tuck, ▲ straighten!' },
    { key: 'walls', name: 'Wall Smash', tip: 'Find the FAKE panel: ▲ high, nothing middle, ▼ low. Action to charge!' },
    { key: 'hoops', name: 'Fire Hoop Leap', tip: 'Press the action as you land on the bed to go higher. Through the hoops!' },
    { key: 'finale', name: 'The Grand Finale', tip: 'Rev, jump, smash 3 walls, dive through the hoop. One clock!' },
  ];
  const HOOPX = [-110, 110, -60, 90, 0];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const angErr = a => { const m = ((a % 360) + 360) % 360; return Math.min(m, 360 - m); };
  const win = (P, w) => w * (P.gold ? SS.gold : 1);

  /* ---------- a round ---------- */
  function newRound(st, n, info) {
    if (info.first) { st.si = 0; st.ties = 0; }
    else if (info.replay) { st.ties++; if (st.ties >= 2) { st.si = Math.min(4, st.si + 1); st.ties = 0; st.tieNote = true; } }
    else { st.si = Math.min(4, st.si + 1); st.ties = 0; }
    st.round = n; st.c = STUNTS[st.si]; st.t = 0; st.judgeT = -1; st.res = false; st.flash = 0;
    const behind = id => info.wins[1 - id] > info.wins[id];
    st.pl = [0, 1].map(id => makeP(st, id, behind(id) && !st.noHelp));
    K.fx(st);
  }
  function makeP(st, id, gold) {
    const P = { id, ox: id * 480, ph: 'start', t: 0, done: false, sc: null, gold, bail: false, x: 60, y: SS.ground, rot: 0, face: 1 };
    const k = st.si;
    if (k === 0 || k === 4) Object.assign(P, { ph: 'rev', needle: 0, held: false, bandPh: rnd(0, TAU), speed: 0, flips: 0, dist: 0, air: 0, airT: 1, onBus: false, revT: 0 });
    if (k === 1) Object.assign(P, { ph: 'climb', h: 0, clock: SS.climbT, turns: 0, tuck: false, err: 0 });
    if (k === 2) Object.assign(P, wallState(8, 0));
    if (k === 3) Object.assign(P, { ph: 'bounce', L: 1, x: 240, y: SS.bed, vy: -Math.sqrt(2 * SS.grav * 80), vx: 0, lit: [false, false, false, false, false], pikes: 0, pike: false, lastPress: -9, pend: null, win: SS.bounceWin, wob: 0, hoopsT: 0, clips: 0 });
    if (k === 4) Object.assign(P, { clock: 0, parts: 0 });
    return P;
  }
  function wallState(n, startX) {
    const walls = [];
    for (let i = 0; i < n; i++) walls.push({ x: 400 + startX + i * SS.wallGap, fake: Math.floor(Math.random() * 3), res: null });
    return { ph: 'run', rx: 0, walls, smashed: 0, streak: 0, best: 0, stance: 1, chargeAt: -9, stop: 0, finishX: walls[n - 1].x + 260, runT: 0 };
  }

  /* ---------- the tick ---------- */
  function tick(st, dt, live) {
    if (!st.pl) return;
    st.t += dt;
    if (st.flash > 0) st.flash -= dt;
    if (live) {
      for (const P of st.pl) if (!P.done) { P.t += dt; STEP[st.si](st, P, G.players[P.id], dt); }
      for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
      if (st.pl.every(P => P.done)) {
        if (st.judgeT < 0) { st.judgeT = 0; Sfx.play('studioDrum'); }
        st.judgeT += dt;
        const q = Math.floor(st.judgeT / 0.45);
        if (q !== st.lastQ) { st.lastQ = q; if (q >= 1 && q <= 3) Sfx.play(q === 3 ? 'stuntshowDing' : 'stuntshowTick'); }
        if (st.judgeT > 2.2 && !st.res) decide(st);
      }
    } else if (st.judgeT >= 0) st.judgeT += dt;
    K.tickFx(st, dt);
    for (const P of st.pl) K.place(P.id, P.ox + clamp(P.x, 20, 460), Math.min(SS.ground, P.y));
  }
  function decide(st) {
    st.res = true;
    const [A, B] = st.pl.map(P => P.sc);
    let w = A.tot > B.tot ? 0 : B.tot > A.tot ? 1 : A.f > B.f ? 0 : B.f > A.f ? 1 : -1;
    const reason = w < 0 ? 'Dead level! The judges can\'t split them' : NAMES[w] + ' wins the ' + st.c.name + ', ' + st.pl[w].sc.tot + ' to ' + st.pl[1 - w].sc.tot + (A.tot === B.tot ? ' on the finish!' : '!');
    if (w >= 0) st.stat.wins[w]++;
    matchRoundEnd(w, reason);
  }
  // a finished stunt: three judges' scores
  function score(st, P, n, s, f, label) {
    n = clamp(Math.round(n), 1, 10); s = clamp(Math.round(s), 1, 10); f = clamp(Math.round(f), 1, 10);
    P.sc = { n, s, f, tot: n + s + f, label };
    P.done = true; P.ph = 'done';
    if (P.sc.tot === 30) { st.stat.perfect[P.id]++; roar(st, P, 'PERFECT 30!'); }
    if (P.bail) st.stat.bails[P.id]++;
  }
  function roar(st, P, text) {
    st.flash = 0.5; Sfx.play('studioCheer'); Sfx.play('stuntshowFlash');
    K.pop(st, P.ox + 240, 170, text, C.gold, 24);
  }
  function bailPop(st, P, text) { Sfx.play('studioCrash'); Sfx.play('studioGroan'); K.foamBurst(st, P.ox + P.x, P.y - 20, 14); K.pop(st, P.ox + 240, 200, text || 'BAIL!', '#ffb0a0', 22); }

  /* ---------- stunt 0: Ramp Jump (and the start of the Grand Finale) ---------- */
  const bandC = (st, P) => 0.62 + 0.14 * Math.sin(st.t * 1.3 + P.bandPh);
  function rev(st, P, p, dt, short) {
    const i = p.input;
    if (i.act) { P.held = true; P.needle = Math.min(1, P.needle + SS.revRate * dt); if (Math.random() < 0.2) Sfx.play('stuntshowRev', 0.8 + P.needle * 0.8); }
    if ((P.held && !i.act) || P.needle >= 1) {
      const g = bandC(st, P), w = win(P, SS.band), off = Math.abs(P.needle - g);
      let s = clamp(1 - Math.max(0, off - w * 0.3) * 2.5, 0.25, 1);
      if (P.needle > g + w) { s *= 0.85; P.wheelie = 0.6; }
      P.speed = s; P.revOff = off; P.ph = 'go'; P.t = 0;
      P.airT = short ? 0.6 + 0.5 * s : 0.9 + 0.9 * s;
      P.dist = short ? 4 + 8 * s : 6 + 30 * s;
      Sfx.play('stuntshowLaunch');
    }
  }
  function rampStep(st, P, p, dt) {
    if (P.ph === 'rev') { rev(st, P, p, dt, false); P.x = 40; P.y = SS.ground; return; }
    if (P.ph === 'go') { P.x = 40 + P.t / 0.5 * 80; P.y = SS.ground - (P.x > 90 ? (P.x - 90) * 1.2 : 0); if (P.wheelie > 0) P.wheelie -= dt; if (P.t >= 0.5) { P.ph = 'air'; P.t = 0; } return; }
    if (P.ph === 'air') {
      airSpin(P, p, dt);
      const u = Math.min(1, P.t / P.airT), x0 = 120, x1 = 120 + P.dist * 9.4, peak = 60 + 100 * P.speed;
      P.x = K.lerp(x0, x1, u); P.y = K.lerp(SS.ground - 50, SS.ground - 20, u) - Math.sin(u * Math.PI) * peak;
      if (u > 0.45 && u < 0.55 && !P.slow) { P.slow = true; }
      if (u >= 1) land(st, P);
      return;
    }
    if (P.ph === 'landed') { P.t > 1.0 && scoreRamp(st, P); return; }
  }
  function airSpin(P, p, dt) {
    const i = p.input, d = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    P.rot += d * SS.spinRate * dt;
    const f = Math.floor(Math.abs(P.rot) / 360);
    if (f > P.flips) { P.flips = f; Sfx.play('stuntshowWhoosh'); }
  }
  function land(st, P) {
    const err = angErr(P.rot);
    P.err = err; P.onBus = P.dist < 27 && P.dist > 9; P.ph = 'landed'; P.t = 0; P.y = SS.ground - 20;
    if (err > win(P, SS.landTol)) { P.bail = true; bailPop(st, P, 'BAIL! Into the foam blocks!'); }
    else if (P.onBus) { Sfx.play('studioRip'); K.scraps(st, P.ox + P.x, P.y - 10, 12, '#f6eedc'); K.pop(st, P.ox + 240, 200, 'Crunch! Cardboard bus!', '#ffffff', 20); }
    else { Sfx.play('stuntshowLand'); if (P.flips >= 3) roar(st, P, P.flips + ' FLIPS!'); }
    P.rot = 0;
  }
  function scoreRamp(st, P) {
    st.stat.dist[P.id] = Math.max(st.stat.dist[P.id], Math.round(P.dist));
    if (!P.bail) st.stat.flips[P.id] = Math.max(st.stat.flips[P.id], P.flips);
    const n = (P.dist - 6) / 3, s = P.bail ? 1 + P.flips : 1 + P.flips * 3, f = P.bail ? 1 : P.onBus ? 3 : 10 - P.err / 4;
    score(st, P, n, s, f, Math.round(P.dist) + ' m' + (P.flips ? ', ' + P.flips + ' flip' + (P.flips > 1 ? 's' : '') : ''));
  }

  /* ---------- stunt 1: High Dive ---------- */
  const towerY = h => SS.ground - 80 - 200 * h;
  function diveStep(st, P, p, dt) {
    const i = p.input;
    if (P.ph === 'climb') {
      P.clock -= dt;
      if (i.up) P.h = Math.min(1, P.h + SS.climbRate * dt);
      P.x = 70; P.y = towerY(P.h);
      if (p.pendingAct || P.clock <= 0) { P.ph = 'air'; P.t = 0; P.airT = 0.8 + 1.0 * P.h; P.y0 = P.y; Sfx.play('stuntshowWhoosh'); }
      return;
    }
    if (P.ph === 'air') {
      const d = (i.right ? 1 : 0) - (i.left ? 1 : 0);
      P.tuck = !!i.down && d !== 0;
      if (d) { P.rot += d * (i.down ? SS.tuckRate : SS.turnRate) * dt; if (i.down) P.usedTuck = true; }
      else if (i.up) { const tgt = Math.round(P.rot / 360) * 360; P.rot = approach(P.rot, tgt, SS.straighten * dt); P.straight = true; }
      const t = Math.floor(Math.abs(P.rot + (P.rot > 0 ? 60 : -60)) / 360);
      if (t > P.turns) { P.turns = t; Sfx.play('stuntshowWhoosh'); }
      const u = Math.min(1, P.t / P.airT);
      P.x = K.lerp(80, 350, u); P.y = K.lerp(P.y0, SS.ground - 40, u) - Math.sin(u * Math.PI) * 50;
      if (u >= 1) {
        P.err = angErr(P.rot); P.turns = Math.round(Math.abs(P.rot) / 360 - (P.err < 90 ? 0 : 0.5));
        P.turns = Math.max(0, Math.floor((Math.abs(P.rot) + 45) / 360));
        P.clean = P.err <= win(P, SS.entryTol); P.ph = 'splash'; P.t = 0;
        if (P.clean) { Sfx.play('stuntshowSplash'); for (let q = 0; q < 8; q++) K.part(st, P.ox + P.x, SS.ground - 50, rnd(-60, 60), rnd(-200, -80), 0.6, '#bfe8ff', 4, 500, 'conf'); if (P.turns >= 4) roar(st, P, P.turns + ' TURNS!'); }
        else { P.bail = true; Sfx.play('stuntshowFlop'); for (let q = 0; q < 26; q++) K.part(st, P.ox + P.x, SS.ground - 50, rnd(-260, 260), rnd(-420, -120), 0.9, '#bfe8ff', 5, 700, 'conf'); K.pop(st, P.ox + 240, 200, 'BELLY FLOP!', '#ffb0a0', 22); Sfx.play('studioGroan'); }
      }
      return;
    }
    if (P.ph === 'splash' && P.t > 1.0) {
      st.stat.turns[P.id] = Math.max(st.stat.turns[P.id], P.turns);
      const n = P.turns * (1 + P.h) * 1.25 + P.h * 2, s = 2 + P.turns * 2 + (P.usedTuck ? 1 : 0), f = P.clean ? 10 - P.err / 3 : 2;
      score(st, P, n, P.clean ? s : s - 2, f, P.turns + ' turn' + (P.turns === 1 ? '' : 's') + ' from ' + Math.round(10 + 20 * P.h) + ' m');
    }
  }

  /* ---------- stunt 2: Wall Smash (and the middle of the Grand Finale) ---------- */
  const PANEL = ['high', 'middle', 'low'];
  function wallsStep(st, P, p, dt) {
    const i = p.input;
    P.runT += dt;
    if (P.stop > 0) { P.stop -= dt; P.x = 120; P.y = SS.ground; return false; }
    const v = i.right ? SS.runFast : i.left ? SS.runSlow : SS.run;
    P.v = v;
    P.stance = i.up && !i.down ? 0 : i.down && !i.up ? 2 : 1;
    if (p.pendingAct) { P.chargeAt = P.runT; Sfx.play('stuntshowCharge'); }
    P.rx += v * dt; P.x = 120; P.y = SS.ground - (P.stance === 0 ? 50 : 0);
    for (const w of P.walls) {
      if (w.res || P.rx < w.x - 10) continue;
      const charged = P.runT - P.chargeAt <= win(P, SS.chargeWin);
      if (charged && P.stance === w.fake) {
        w.res = 'smash'; P.smashed++; P.streak++; P.best = Math.max(P.best, P.streak);
        Sfx.play('studioFoam'); K.foamBurst(st, P.ox + 150, SS.ground - 60 + (w.fake - 1) * 40, 10);
        if (P.streak === 8) roar(st, P, 'EIGHT IN A ROW!');
      } else {
        w.res = 'bonk'; P.streak = 0; P.stop = SS.bonkT;
        Sfx.play('studioCrash'); K.pop(st, P.ox + 150, SS.ground - 120, charged ? 'BONK! That was REAL!' : 'BONK! Charge it!', '#ffb0a0', 18);
        for (let q = 0; q < 6; q++) K.part(st, P.ox + 140, SS.ground - 60, rnd(-200, 0), rnd(-200, -60), 0.6, '#ffe58a', 3, 400, 'star');
      }
      P.chargeAt = -9;
    }
    return P.rx >= P.finishX;
  }
  function wallStep(st, P, p, dt) {
    if (wallsStep(st, P, p, dt)) {
      st.stat.streak[P.id] = Math.max(st.stat.streak[P.id], P.best);
      const n = P.smashed * 1.25, s = P.best * 1.25, f = 10 - (P.runT - 8.6) / 0.9;
      score(st, P, n, s, f, P.smashed + ' of 8 walls, ' + P.runT.toFixed(1) + ' s');
    }
  }
  // the panel this hero can see (null: not in focus yet)
  const seen = (P, w) => (w.x - P.rx <= SS.runFast * SS.focus * (P.gold ? SS.gold : 1) ? w.fake : null);

  /* ---------- stunt 3: Fire Hoop Leap ---------- */
  const apexH = L => 80 + 60 * L;
  const hoopPos = (st, i) => ({ x: 240 + HOOPX[i] + Math.sin(st.t * 0.9 + i * 1.7) * 25, h: 130 + i * 55 });
  function hoopStep(st, P, p, dt) {
    const i = p.input;
    P.hoopsT += dt;
    if (P.wob > 0) P.wob -= dt;
    const d = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    P.vx = approach(P.vx, d * 140, 900 * dt);
    if (p.pendingAct) {
      P.lastPress = st.t;
      if (P.pend && st.t - P.pend.t <= P.pend.w / 2) { goodBounce(st, P, st.t - P.pend.t); P.pend = null; }
    }
    if (P.pend && st.t - P.pend.t > P.pend.w / 2) { P.L = Math.max(1, P.L - 1); P.chain = 0; P.vy = -Math.sqrt(2 * SS.grav * apexH(P.L)) + SS.grav * (st.t - P.pend.t); P.pend = null; }
    // the pike: hold ▼ near the top
    if (i.down && Math.abs(P.vy) < 140 && !P.pike && P.y < SS.bed - 60) { P.pike = true; P.pikes++; Sfx.play('stuntshowWhoosh'); }
    const y0 = P.y;
    P.vy += SS.grav * dt; P.y += P.vy * dt; P.x = clamp(P.x + P.vx * dt, 50, 430);
    // hoops (crossing their height)
    for (let k = 0; k < 5; k++) {
      const H = hoopPos(st, k), hy = SS.bed - H.h;
      if ((y0 - hy) * (P.y - hy) > 0) continue;
      const dx = Math.abs(P.x - H.x);
      if (dx < SS.hoopR && !P.lit[k]) { P.lit[k] = true; Sfx.play('stuntshowHoop'); K.spark(st, P.ox + H.x, hy, 12, ['#ff9a3a', '#ffe58a']); if (P.lit.every(Boolean)) roar(st, P, 'ALL FIVE HOOPS!'); }
      else if (dx >= SS.hoopR && dx < SS.hoopClip && P.wob <= 0) { P.wob = 0.5; P.clips++; P.L = Math.max(1, P.L - 1); if (P.vy < 0) P.vy *= 0.75; Sfx.play('stuntshowClip'); }
    }
    if (P.y >= SS.bed && P.vy > 0) {
      P.y = SS.bed;
      if (P.x < 172 || P.x > 308) {
        // off the bed: a tumble onto the mat, back on at the start height
        P.L = 1; P.x = 240; P.vx = 0; P.wob = 0.8; P.pend = null; P.pike = false; P.clips++;
        P.vy = -Math.sqrt(2 * SS.grav * apexH(1)); Sfx.play('studioCrash'); K.pop(st, P.ox + 240, 200, 'Off the trampoline!', '#ffb0a0', 18);
        if (P.ph === 'finish') { finishHoops(st, P, 90); }
        return;
      }
      if (P.ph === 'finish') { const dx = Math.abs(P.x - 240); finishHoops(st, P, dx); return; }
      const w = P.pike ? win(P, SS.pikeWin) : win(P, SS.bounceWin);
      P.pike = false;
      P.vy = -Math.sqrt(2 * SS.grav * apexH(P.L));
      Sfx.play('stuntshowBoing');
      if (st.t - P.lastPress <= w / 2) goodBounce(st, P, 0);
      else P.pend = { t: st.t, w };
      if (P.lit.every(Boolean) || P.hoopsT > SS.hoopT) { P.ph = 'finish'; P.pend = null; K.pop(st, P.ox + 240, 160, 'Land on the cross!', '#ffffff', 18); }
    }
  }
  function goodBounce(st, P, late) {
    P.L = Math.min(5, P.L + 1); P.chain = (P.chain || 0) + 1; P.bestChain = Math.max(P.bestChain || 0, P.chain);
    P.vy = -Math.sqrt(2 * SS.grav * apexH(P.L)) + SS.grav * late;
    Sfx.play('stuntshowUp', 1 + P.L * 0.06);
  }
  function finishHoops(st, P, dx) {
    const hoops = P.lit.filter(Boolean).length;
    st.stat.hoops[P.id] = Math.max(st.stat.hoops[P.id], hoops);
    Sfx.play('stuntshowLand');
    score(st, P, hoops * 2, 1 + (P.bestChain || 0) + P.pikes * 2 - P.clips, 10 - dx / 9, hoops + ' hoop' + (hoops === 1 ? '' : 's') + (P.pikes ? ', ' + P.pikes + ' pike' + (P.pikes > 1 ? 's' : '') : ''));
  }

  /* ---------- stunt 4: The Grand Finale ---------- */
  function finaleStep(st, P, p, dt) {
    P.clock += dt;
    if (P.ph === 'rev') { rev(st, P, p, dt, true); P.x = 40; P.y = SS.ground; return; }
    if (P.ph === 'go') { P.x = 40 + P.t / 0.3 * 50; P.y = SS.ground; if (P.t >= 0.3) { P.ph = 'air'; P.t = 0; } return; }
    if (P.ph === 'air') {
      airSpin(P, p, dt);
      const u = Math.min(1, P.t / P.airT);
      P.x = K.lerp(90, 90 + P.dist * 12, u); P.y = SS.ground - 30 - Math.sin(u * Math.PI) * (40 + 60 * P.speed);
      if (u >= 1) {
        const err = angErr(P.rot); P.rot = 0;
        if (err > win(P, SS.landTol)) { P.bail = true; P.penalty = 1.5; bailPop(st, P, 'Tumble! +1.5 s'); }
        else { P.parts++; Sfx.play('stuntshowLand'); }
        // a short jump means a longer run
        Object.assign(P, wallState(3, Math.round((1 - P.speed) * 300)), { ph: 'walls', jumpOK: !P.bail });
      }
      return;
    }
    if (P.ph === 'walls') {
      if (P.penalty > 0) { P.penalty -= dt; return; }
      if (wallsStep(st, P, p, dt)) { P.parts += P.smashed; P.ph = 'climb'; P.t = 0; }
      return;
    }
    if (P.ph === 'climb') { P.x = 300; P.y = SS.ground - P.t / 0.8 * 220; if (P.t >= 0.8) { P.ph = 'dive'; P.t = 0; P.rot = 0; P.y0 = P.y; Sfx.play('stuntshowWhoosh'); } return; }
    if (P.ph === 'dive') {
      const i = p.input, d = (i.right ? 1 : 0) - (i.left ? 1 : 0);
      if (d) P.rot += d * SS.turnRate * dt;
      else if (i.up) P.rot = approach(P.rot, Math.round(P.rot / 360) * 360, SS.straighten * dt);
      const u = Math.min(1, P.t / 1.1);
      P.x = K.lerp(300, 400, u); P.y = K.lerp(P.y0, SS.ground - 40, u) - Math.sin(u * Math.PI) * 30;
      if (u >= 0.5 && !P.hoopDone) {
        P.hoopDone = true;
        if (angErr(P.rot) <= 40 * (P.gold ? SS.gold : 1)) { P.parts++; Sfx.play('stuntshowHoop'); K.spark(st, P.ox + P.x, P.y, 12, ['#ff9a3a', '#ffe58a']); }
        else { P.clock += 0.5; Sfx.play('stuntshowClip'); K.pop(st, P.ox + 240, 200, 'Clipped the hoop! +0.5 s', '#ffb0a0', 18); }
      }
      if (u >= 1) {
        P.err = angErr(P.rot); P.clean = P.err <= win(P, SS.entryTol);
        if (P.clean) { P.parts++; Sfx.play('stuntshowSplash'); } else { P.bail = true; Sfx.play('stuntshowFlop'); K.pop(st, P.ox + 240, 200, 'BELLY FLOP!', '#ffb0a0', 22); }
        P.ph = 'splash'; P.t = 0; P.total = P.clock;
        for (let q = 0; q < (P.clean ? 8 : 24); q++) K.part(st, P.ox + P.x, SS.ground - 50, rnd(-220, 220), rnd(-400, -100), 0.8, '#bfe8ff', 4, 600, 'conf');
      }
      return;
    }
    if (P.ph === 'splash' && P.t > 1.0) {
      const n = 10 - (P.total - 8.5) / 1.0, s = 1 + P.parts * 1.5, f = P.clean ? 10 - P.err / 3 : 2;
      if (P.parts >= 6) roar(st, P, 'A CLEAN FINALE!');
      score(st, P, n, s, f, P.total.toFixed(1) + ' s, ' + P.parts + ' of 6 clean');
    }
  }
  const STEP = [rampStep, diveStep, wallStep, hoopStep, finaleStep];

  /* ---------- what to do now (prompts and the computer) ---------- */
  function plan(st, id) {
    const P = st.pl && st.pl[id];
    if (!P) return null;
    const out = { si: st.si, ph: P.ph, P, band: null, wall: null, hoop: null };
    if (P.ph === 'rev') out.band = { c: bandC(st, P), w: win(P, SS.band) };
    if (P.walls) { const w = P.walls.find(q => !q.res); if (w) out.wall = { w, d: w.x - P.rx, eta: (w.x - P.rx) / Math.max(60, P.v || SS.run), fake: seen(P, w) }; }
    if (st.si === 3) { const k = P.lit.findIndex(l => !l); out.hoop = k < 0 ? null : Object.assign({ k }, hoopPos(st, k)); }
    return out;
  }

  /* ---------- drawing ---------- */
  function drawArena(st) {
    const t = st.t;
    // grandstand, crowd and the judges' desk
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1a1438'); g.addColorStop(1, '#3a2a5a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 40; c++) {
      const x = c * 25 + (r % 2) * 12, y = 120 + r * 26, bob = Math.sin(t * 6 + c * 1.3 + r) * (st.flash > 0 ? 6 : 2);
      ctx.fillStyle = ['#e86a6a', '#6ab0e8', '#e8d26a', '#8ae86a', '#c88ae8'][(c * 7 + r * 3) % 5];
      circle(x, y + bob, 7); ctx.fill(); ctx.fillRect(x - 7, y + 6 + bob, 14, 12);
    }
    ctx.fillStyle = '#2a2040'; ctx.fillRect(0, 210, W, 16);
    // floor of the arena
    ctx.fillStyle = '#5a4a3a'; ctx.fillRect(0, SS.ground, W, H - SS.ground);
    ctx.fillStyle = '#6a5a4a'; for (let x = 0; x < W; x += 40) ctx.fillRect(x, SS.ground, 20, 6);
    // the big screen (the stunt's name) and the judges
    // (below the round pill at the top)
    ctx.fillStyle = '#101018'; rr(W / 2 - 130, 74, 260, 42, 8); ctx.fill();
    ctx.strokeStyle = '#ffd86a'; ctx.lineWidth = 3; ctx.stroke();
    text(st.c ? st.c.name.toUpperCase() : '', W / 2, 91, 20, '#ffe58a', 'center', 'display');
    text('STUNT ' + (st.si + 1) + ' OF 5', W / 2, 108, 11, '#c8c0e8', 'center', 'body');
    judges(st, t);
  }
  function judges(st, t) {
    const x0 = W / 2 - 90, y = 120;
    ctx.fillStyle = '#6a3a1a'; rr(x0, y + 40, 180, 30, 6); ctx.fill();
    ctx.fillStyle = '#ffe58a'; text('JUDGES', W / 2, y + 56, 12, '#ffe58a', 'center', 'display');
    for (let k = 0; k < 3; k++) {
      const jx = x0 + 30 + k * 60, bob = k === 2 ? Math.sin(t * 9) * 3 : 0, sleepy = k === 1;
      ctx.fillStyle = ['#c8a07a', '#e8c0a0', '#a07a5a'][k]; circle(jx, y + 22 + bob, 13); ctx.fill();
      ctx.fillStyle = '#2a2a34';
      if (sleepy) { ctx.fillRect(jx - 7, y + 20, 5, 2); ctx.fillRect(jx + 2, y + 20, 5, 2); if (st.judgeT < 0) text('z', jx + 16, y + 6 + Math.sin(t * 2) * 3, 12, '#ffffff', 'center', 'body'); }
      else { circle(jx - 4, y + 19 + bob, 2); ctx.fill(); circle(jx + 4, y + 19 + bob, 2); ctx.fill(); }
      if (k === 0) { ctx.fillRect(jx - 8, y + 14, 6, 2); ctx.fillRect(jx + 2, y + 14, 6, 2); }
      ctx.fillStyle = ['#3a3a5a', '#5a3a3a', '#3a5a3a'][k]; ctx.fillRect(jx - 12, y + 34 + bob, 24, 8);
    }
  }
  function drawHalf(st, P) {
    const t = st.t;
    ctx.save(); ctx.translate(P.ox, 0);
    ctx.beginPath(); ctx.rect(0, 0, 480, H); ctx.clip();
    const k = st.si;
    if (k === 0) drawRamp(st, P, t);
    else if (k === 1) drawDive(st, P, t);
    else if (k === 2) drawWalls(st, P, t, 0);
    else if (k === 3) drawHoops(st, P, t);
    else drawFinale(st, P, t);
    ctx.restore();
    // the judges' paddles for this hero
    if (P.sc && st.judgeT >= 0) paddles(st, P);
  }
  function hero(P, x, y, o) { K.stunt(P.id, x, y, Object.assign({ look: 'show', face: 1, cape: 0.5 }, o)); if (P.gold) { ctx.fillStyle = C.gold; circle(x, y - PH - 6, 4); ctx.fill(); } }
  function bike(x, y, rot, id) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot * DEG);
    ctx.strokeStyle = '#2a2a34'; ctx.lineWidth = 4;
    for (const wx of [-18, 18]) { ctx.beginPath(); ctx.arc(wx, 0, 9, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = id === 0 ? '#e8322a' : '#2a6ae8'; ctx.beginPath(); ctx.moveTo(-18, -2); ctx.lineTo(0, -14); ctx.lineTo(18, -2); ctx.lineTo(6, -2); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawRamp(st, P, t) {
    // runway and launch ramp, the prop buses, the landing deck and foam blocks
    ctx.fillStyle = '#8a7a6a'; ctx.beginPath(); ctx.moveTo(90, SS.ground); ctx.lineTo(120, SS.ground - 50); ctx.lineTo(126, SS.ground); ctx.closePath(); ctx.fill();
    for (let b = 0; b < 4; b++) {
      const bx = 170 + b * 44, crushed = P.onBus && Math.abs(P.x - bx - 20) < 30;
      ctx.save(); ctx.translate(bx, SS.ground); ctx.rotate(K.wobble(b, t, 0.02));
      K.flat(0, 0, 40, crushed ? 12 : 30, { paper: true, paint: (x, y, w, h) => { ctx.fillStyle = '#e8b83a'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#5a7aa8'; for (let q = 0; q < 3; q++) ctx.fillRect(x + 4 + q * 12, y + 4, 8, Math.max(2, h * 0.3)); } });
      ctx.restore();
    }
    ctx.fillStyle = '#7a6a5a'; ctx.fillRect(340, SS.ground - 20, 140, 20);
    text('PROP BUSES', 258, SS.ground + 18, 11, '#ffe7a8', 'center', 'body');
    for (let m = 10; m <= 35; m += 5) { const mx = 120 + m * 9.4; ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(mx, SS.ground + 2, 2, 8); text(m + 'm', mx, SS.ground + 30, 10, '#d8d0e8', 'center', 'body'); }
    // the rev dial
    if (P.ph === 'rev') revDial(st, P, 60, 300);
    const air = P.ph === 'air', y = P.y - 10;
    bike(P.x, y, air ? P.rot : P.wheelie > 0 ? -25 : 0, P.id);
    hero(P, P.x + (air ? 0 : -2), y - 4, { rot: (air ? P.rot : 0) * DEG, arms: 'fwd', s: 0.9, stun: P.bail && P.ph === 'landed' });
    if (air) text('Flips: ' + P.flips, 240, 260, 16, '#ffffff', 'center', 'display');
  }
  function revDial(st, P, x, y) {
    const b = { c: bandC(st, P), w: win(P, SS.band) };
    ctx.fillStyle = 'rgba(10,10,20,0.8)'; ctx.beginPath(); ctx.arc(x, y, 46, Math.PI, 0); ctx.fill();
    const ang = u => Math.PI + u * Math.PI;
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#5a5a6a'; ctx.beginPath(); ctx.arc(x, y, 36, Math.PI, 0); ctx.stroke();
    ctx.strokeStyle = '#e8322a'; ctx.beginPath(); ctx.arc(x, y, 36, ang(b.c + b.w), 0); ctx.stroke();
    ctx.strokeStyle = P.gold ? C.gold : '#5ae86a'; ctx.beginPath(); ctx.arc(x, y, 36, ang(b.c - b.w), ang(b.c + b.w)); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang(P.needle)) * 40, y + Math.sin(ang(P.needle)) * 40); ctx.stroke();
    text('REV', x, y + 12, 12, '#ffffff', 'center', 'display');
  }
  function drawDive(st, P, t) {
    // the tower with its ladder and height marks, the tank
    ctx.fillStyle = '#7a6a5a'; ctx.fillRect(40, towerY(1) - 6, 12, SS.ground - towerY(1) + 6);
    ctx.fillStyle = '#9a8a7a'; for (let y = towerY(1); y < SS.ground; y += 16) ctx.fillRect(52, y, 22, 3);
    for (const h of [0, 0.5, 1]) text(Math.round(10 + 20 * h) + 'm', 26, towerY(h), 10, '#d8d0e8', 'center', 'body');
    const py = P.ph === 'climb' ? P.y : P.y0 || towerY(P.h);
    ctx.fillStyle = '#a89a8a'; ctx.fillRect(52, py, 46, 6);
    ctx.fillStyle = '#3a6aa8'; ctx.fillRect(290, SS.ground - 60, 130, 60);
    ctx.fillStyle = '#6ab0e8'; ctx.fillRect(294, SS.ground - 56, 122, 10 + Math.sin(t * 3) * 2);
    ctx.strokeStyle = '#d8d8e0'; ctx.lineWidth = 4; ctx.strokeRect(290, SS.ground - 60, 130, 60);
    if (P.ph === 'climb') {
      text(Math.max(0, P.clock).toFixed(1) + ' s', 240, 270, 22, P.clock < 1.5 ? '#ffb0a0' : '#ffffff', 'center', 'display');
      hero(P, P.x, P.y, { arms: 'up' });
    } else if (P.ph === 'air') {
      hero(P, P.x, P.y + 12, { rot: P.rot * DEG, sy: P.tuck ? 0.7 : 1, arms: 'up', cape: 1 });
      text('Turns: ' + P.turns, 240, 270, 16, '#ffffff', 'center', 'display');
    } else if (P.ph === 'splash' || P.ph === 'done') { ctx.fillStyle = '#ffffff'; circle(P.x, SS.ground - 56, P.clean ? 8 : 16); ctx.fill(); }
  }
  function drawWalls(st, P, t, startX) {
    // the lane scrolls: the hero is at lx 120
    const off = P.rx - 120;
    ctx.fillStyle = '#6a5a4a'; for (let x = -((off % 60) + 60) % 60; x < 480; x += 60) ctx.fillRect(x, SS.ground + 10, 30, 4);
    for (const w of P.walls) {
      const x = w.x - off;
      if (x < -40 || x > 520) continue;
      const vis = seen(P, w);
      for (let k = 0; k < 3; k++) {
        const y = SS.ground - 120 + k * 40;
        if (w.res === 'smash' && k === w.fake) continue;
        if (vis === null) { ctx.fillStyle = '#7a7a8a'; ctx.fillRect(x, y, 24, 38); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(x + 4, y + 4, 16, 30); }
        else if (k === w.fake) { ctx.save(); ctx.translate(x + 12, y + 19); ctx.rotate(K.wobble(k + w.x, t, 0.05)); K.foam(-12, -19, 24, 38, { col: '#e8a0c8' }); ctx.restore(); }
        else K.brick(x, y, 24, 38);
      }
      if (vis !== null && !w.res) K.realTag(x + 12, SS.ground - 128, 40, 0.6);
    }
    const fx = P.finishX - off;
    if (fx < 500) { ctx.fillStyle = '#ffffff'; for (let y = SS.ground - 120; y < SS.ground; y += 20) { ctx.fillRect(fx, y, 10, 10); ctx.fillRect(fx + 10, y + 10, 10, 10); } }
    const pose = P.stance === 0 ? { arms: 'up' } : P.stance === 2 ? { sy: 0.6, arms: 'fwd' } : { arms: 'fwd' };
    hero(P, 120, P.y, Object.assign({ stun: P.stop > 0, cape: 0.8 }, pose));
    if (st.si === 2) text('Walls: ' + P.smashed + ' / 8   Streak ' + P.streak, 240, 260, 15, '#ffffff', 'center', 'display');
  }
  function drawHoops(st, P, t) {
    // the trampoline, the hoops of (silk) fire, the centre cross
    ctx.fillStyle = '#2a2a34'; ctx.fillRect(170, SS.bed, 140, 8); ctx.fillRect(176, SS.bed + 8, 6, SS.ground - SS.bed - 8); ctx.fillRect(298, SS.bed + 8, 6, SS.ground - SS.bed - 8);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(236, SS.bed - 2, 8, 4);
    for (let k = 0; k < 5; k++) {
      const h = hoopPos(st, k), y = SS.bed - h.h;
      ctx.strokeStyle = P.lit[k] ? '#ffd86a' : '#8a8a9a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(h.x, y, SS.hoopR + 6, 8, 0, 0, TAU); ctx.stroke();
      for (let q = 0; q < 6; q++) { const a = q / 6 * TAU + t * 2; ctx.fillStyle = q % 2 ? '#ff9a3a' : '#ffd86a'; ctx.beginPath(); ctx.ellipse(h.x + Math.cos(a) * (SS.hoopR + 6), y + Math.sin(a) * 8 - 6, 4, 8 + Math.sin(t * 12 + q) * 3, 0, 0, TAU); ctx.fill(); }
      if (P.lit[k]) text('★', h.x, y - 22, 14, C.gold, 'center', 'display');
    }
    hero(P, P.x, P.y, { rot: P.wob > 0 ? Math.sin(t * 30) * 0.3 : 0, sy: P.pike ? 0.75 : 1, arms: P.pike ? 'fwd' : 'up', cape: Math.min(1, Math.abs(P.vy) / 600) });
    text('Hoops: ' + P.lit.filter(Boolean).length + ' / 5' + (P.ph === 'finish' ? '   Land on the cross!' : ''), 240, 260, 15, '#ffffff', 'center', 'display');
  }
  function drawFinale(st, P, t) {
    if (P.ph === 'rev' || P.ph === 'go' || P.ph === 'air') {
      ctx.fillStyle = '#8a7a6a'; ctx.beginPath(); ctx.moveTo(70, SS.ground); ctx.lineTo(90, SS.ground - 30); ctx.lineTo(96, SS.ground); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7a6a5a'; ctx.fillRect(150, SS.ground - 30, 330, 30);
      if (P.ph === 'rev') revDial(st, P, 60, 300);
      bike(P.x, P.y - 10, P.ph === 'air' ? P.rot : 0, P.id);
      hero(P, P.x, P.y - 14, { rot: (P.ph === 'air' ? P.rot : 0) * DEG, arms: 'fwd', s: 0.9 });
    } else if (P.ph === 'walls') drawWalls(st, P, t, 0);
    else {
      ctx.fillStyle = '#7a6a5a'; ctx.fillRect(290, SS.ground - 230, 10, 230);
      ctx.fillStyle = '#3a6aa8'; ctx.fillRect(360, SS.ground - 60, 110, 60); ctx.strokeStyle = '#d8d8e0'; ctx.lineWidth = 4; ctx.strokeRect(360, SS.ground - 60, 110, 60);
      const hy = SS.ground - 170;
      ctx.strokeStyle = '#ffd86a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(350, hy, 10, 30, 0, 0, TAU); ctx.stroke();
      for (let q = 0; q < 5; q++) { ctx.fillStyle = q % 2 ? '#ff9a3a' : '#ffd86a'; circle(350 + Math.sin(t * 10 + q) * 4, hy - 30 + q * 15, 5); ctx.fill(); }
      if (P.ph !== 'splash' && P.ph !== 'done') hero(P, P.x, P.y, { rot: P.rot * DEG, arms: 'up', cape: 1 });
    }
    text('Clock: ' + P.clock.toFixed(1) + ' s', 240, 260, 15, '#ffffff', 'center', 'display');
  }
  function paddles(st, P) {
    const x0 = P.ox + 240 - 90, y = 300;
    ctx.fillStyle = 'rgba(10,10,20,0.75)'; rr(x0 - 10, y - 58, 200, 128, 12); ctx.fill();
    text(P.sc.label, x0 + 90, y - 40, 14, '#ffffff', 'center', 'body');
    const vals = [P.sc.n, P.sc.s, P.sc.f], names = ['NUMBER', 'STYLE', 'FINISH'];
    for (let k = 0; k < 3; k++) {
      const up = st.judgeT > 0.45 * (k + 1), x = x0 + 30 + k * 60;
      ctx.fillStyle = up ? '#ffffff' : '#5a5a6a'; rr(x - 22, y - 26, 44, 40, 6); ctx.fill();
      ctx.fillStyle = '#8a6a3a'; ctx.fillRect(x - 3, y + 14, 6, 18);
      if (up) text(String(vals[k]), x, y - 6, 24, vals[k] >= 9 ? '#d8a020' : '#2a2a34', 'center', 'display');
      text(names[k], x, y + 42, 9, '#d8d0e8', 'center', 'body');
    }
    if (st.judgeT > 1.6) text('TOTAL ' + P.sc.tot, x0 + 90, y + 60, 18, P.sc.tot === 30 ? C.gold : '#ffe58a', 'center', 'display');
  }
  function draw(st) {
    drawArena(st);
    for (const P of st.pl) drawHalf(st, P);
    // the tyre wall down the middle
    for (let y = 240; y < SS.ground + 10; y += 22) { ctx.fillStyle = '#1a1a20'; ctx.beginPath(); ctx.ellipse(W / 2, y, 14, 11, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#3a3a44'; ctx.beginPath(); ctx.ellipse(W / 2, y, 6, 4, 0, 0, TAU); ctx.fill(); }
    // the camera-flash wave
    if (st.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (st.flash * 0.7).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
    K.drawParts(st, 0);
  }

  /* ---------- HUD ---------- */
  function hud(st) {
    const Pr = K.prompter(st);
    // the announcer's line, under the big screen (the round pill has the top)
    const m = st.msg;
    if (m && m.t < m.life) {
      const str = (m.gold ? '★ ' : '') + m.text;
      ctx.font = K.FONT(14); const w = Math.min(W - 40, ctx.measureText(str).width + 30);
      ctx.globalAlpha = clamp((m.life - m.t) * 3, 0, 1);
      ctx.fillStyle = 'rgba(10,10,20,0.85)'; rr(W / 2 - w / 2, 192, w, 26, 13); ctx.fill();
      if (m.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.stroke(); }
      text(str, W / 2, 205, 14, m.gold ? C.gold : m.col || '#ffffff', 'center', 'body');
      ctx.globalAlpha = 1;
    }
    if (!G.match || G.match.phase !== 'live') {
      if (st.c && (G.match.phase === 'ready' || G.match.phase === 'count')) {
        ctx.fillStyle = 'rgba(10,10,20,0.8)'; rr(W / 2 - 300, 372, 600, 34, 10); ctx.fill();
        text(st.c.tip, W / 2, 389, 14, '#ffffff', 'center', 'body');
      }
      return;
    }
    for (const P of st.pl) {
      if (P.done) continue;
      const id = P.id, pl = plan(st, id), x = P.ox + 240;
      let s = null, col = C.gold, pulse = false;
      if (P.ph === 'rev') { s = P.held ? 'Let go in the green!' : 'HOLD ' + K.key(id, 'act') + ' to rev'; pulse = P.held && Math.abs(P.needle - pl.band.c) < pl.band.w; }
      else if (P.ph === 'air' && st.si !== 1) { s = 'Spin ' + K.key(id, 'left') + K.key(id, 'right') + ', land level!'; col = '#ffffff'; }
      else if (P.ph === 'climb' && st.si === 1) s = 'Climb ' + K.key(id, 'up') + ', jump ' + K.key(id, 'act');
      else if (P.ph === 'air' && st.si === 1) { s = angErr(P.rot) < 15 ? 'Straight! Hold ' + K.key(id, 'up') : 'Turn ' + K.key(id, 'left') + K.key(id, 'right') + ', straighten ' + K.key(id, 'up'); col = '#ffffff'; }
      else if (pl.wall && pl.wall.fake !== null && pl.wall.d < 200) { s = 'Go ' + PANEL[pl.wall.fake] + '! ' + (pl.wall.fake === 0 ? K.key(id, 'up') : pl.wall.fake === 2 ? K.key(id, 'down') : '') + ' + ' + K.key(id, 'act'); pulse = pl.wall.eta < win(P, SS.chargeWin); }
      else if (P.ph === 'bounce' || P.ph === 'finish') { s = P.ph === 'finish' ? 'Land on the cross!' : 'Press ' + K.key(id, 'act') + ' as you land'; pulse = P.y > SS.bed - 40 && P.vy > 0; col = P.ph === 'finish' ? '#ffffff' : C.gold; }
      else if (P.ph === 'dive') { s = 'Straighten ' + K.key(id, 'up') + ' for the hoop and the tank!'; col = '#ffffff'; }
      Pr.say(id, s, x, 300, col, pulse);
    }
  }

  MODES.stuntshow = {
    SS, STUNTS, plan, angErr, bandC, seen, hoopPos, apexH, towerY,
    setup(st) {
      st.stat = { wins: [0, 0], dist: [0, 0], flips: [0, 0], turns: [0, 0], streak: [0, 0], hoops: [0, 0], bails: [0, 0], perfect: [0, 0] };
      st.stats = { helps: 0 };
      st.noHelp = !!this.testNoHelp; st.forceStunt = this.testStunt != null ? this.testStunt : null;
      st.t = 0; st.si = 0; st.ties = 0;
      for (const row of G.level.grid) row.fill('.');
      K.fx(st);
    },
    resetRound(n, info) {
      const st = G.mst;
      newRound(st, n, info);
      if (st.forceStunt !== null) { st.si = st.forceStunt; st.c = STUNTS[st.si]; st.pl = [0, 1].map(id => makeP(st, id, false)); }
      G.particles.length = 0;
      K.actLabels(['stunt', 'stunt'], 'stunt');
    },
    go() {
      const st = G.mst;
      Sfx.play('studioAction');
      const g = st.pl.filter(P => P.gold);
      if (g.length) K.goldHelp(st, 'Gold helmet for ' + NAMES[g[0].id] + ': every timing window is wider this stunt!');
      else if (st.tieNote) { st.tieNote = false; K.msg(st, 'That one counts as a tie. On to the ' + st.c.name + '!', '#ffffff', 3); }
      else K.msg(st, st.c.name + '! ' + st.c.tip, '#ffffff', 3.2);
    },
    step(dt) { tick(G.mst, dt, true); },
    idle(dt) { const st = G.mst; if (st.pl) tick(st, dt, false); },
    timeUp() {
      const st = G.mst;
      for (const P of st.pl) if (!P.done) { P.bail = true; score(st, P, 1, 1, 1, 'Out of time!'); }
      st.res = true; st.judgeT = 0;
      const [A, B] = st.pl.map(P => P.sc);
      const w = A.tot > B.tot ? 0 : B.tot > A.tot ? 1 : A.f > B.f ? 0 : B.f > A.f ? 1 : -1;
      if (w >= 0) st.stat.wins[w]++;
      return { winner: w, reason: w < 0 ? 'Time! Nobody finished' : 'Time! ' + NAMES[w] + ' wins the ' + st.c.name + '!' };
    },
    tiebreak() { return -1; },
    draw() { const st = G.mst; if (!st.pl) return; draw(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.pl) K.drawPops(st, 0, 0); },
    hud() { const st = G.mst; if (st.pl && G.match) hud(st); },
    stats() {
      const st = G.mst, s = st.stat;
      if (!s) return [];
      const out = [
        { label: 'Rounds won', values: (G.match ? G.match.wins : s.wins).slice() },
        { label: 'Best jump (m)', values: s.dist.slice() },
        { label: 'Most flips', values: s.flips.slice() },
        { label: 'Most dive turns', values: s.turns.slice() },
        { label: 'Longest wall streak', values: s.streak.slice() },
        { label: 'Most hoops', values: s.hoops.slice() },
        { label: 'Bails', values: s.bails.slice() },
        { label: 'Perfect 30s', values: s.perfect.slice() },
      ];
      const hl = K.helpLine(st.stats.helps); if (hl) out.push(hl);
      return out;
    },
  };

  /* ---------- the level ---------- */
  STUDIO.defs.stuntshow = {
    name: 'Stunt Show Showdown', world: 35, kind: 'versus', mode: 'stuntshow', ownStep: true, outfit: 'none',
    match: { bestOf: 5, roundTime: SS.roundTime, maxTies: 8 },
    act: { label: 'stunt' },
    tagLift: 30,
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> spin / <kbd>W</kbd><kbd>S</kbd> climb, tuck, pick',
      bo: '<kbd>←</kbd><kbd>→</kbd> spin / <kbd>↑</kbd><kbd>↓</kbd> climb, tuck, pick',
      pad: 'stick spins and picks,',
    },
    tip: 'Five stunts, three judges! Rev and jump, dive, smash the fake walls, bounce through fire hoops, then the Grand Finale.',
    switches: {}, signs: [],
    map: K.stubMap(),
  };

  /* ---------- sounds ---------- */
  Sfx.extra.stuntshowRev = function (p) { p = p || 1; this.tone(90 * p, 0.08, 'sawtooth', 0.02, 110 * p); };
  Sfx.extra.stuntshowLaunch = function () { this.tone(120, 0.5, 'sawtooth', 0.03, 400); };
  Sfx.extra.stuntshowWhoosh = function () { this.tone(800, 0.15, 'triangle', 0.02, 300); };
  Sfx.extra.stuntshowLand = function () { this.tone(140, 0.12, 'triangle', 0.05, 80); };
  Sfx.extra.stuntshowSplash = function () { this.tone(1200, 0.2, 'sine', 0.02, 400); };
  Sfx.extra.stuntshowFlop = function () { this.tone(90, 0.4, 'square', 0.05, 50); this.tone(1500, 0.3, 'sawtooth', 0.01, 200, 0.05); };
  Sfx.extra.stuntshowCharge = function () { this.tone(300, 0.08, 'square', 0.03, 600); };
  Sfx.extra.stuntshowBoing = function () { this.tone(160, 0.18, 'sine', 0.05, 420); };
  Sfx.extra.stuntshowUp = function (p) { p = p || 1; this.tone(520 * p, 0.1, 'triangle', 0.03, 780 * p); };
  Sfx.extra.stuntshowHoop = function () { this.tone(900, 0.15, 'triangle', 0.03, 1400); };
  Sfx.extra.stuntshowClip = function () { this.tone(300, 0.15, 'square', 0.03, 180); };
  Sfx.extra.stuntshowTick = function () { this.tone(1000, 0.04, 'square', 0.02); };
  Sfx.extra.stuntshowDing = function () { this.tone(1320, 0.3, 'triangle', 0.05); };
  Sfx.extra.stuntshowFlash = function () { this.tone(2400, 0.05, 'square', 0.01, 3000); };
})();
