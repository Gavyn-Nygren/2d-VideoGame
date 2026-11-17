/* Pip & Bo - Level 11-1 Synchro Diving (team, World 11 Summer Games). */
'use strict';

/* ===== 11-1 Synchro Diving (mode 'dive', team) =====
   Pip and Bo dive off a twin tower together: Pip's boards stick out to the left, Bo's to the right, so the two divers are
   mirror images of each other. Six dives climb from the 3 m springboard to the 10 m platform (def.dives).
   Every dive: a call card shows what to do ("2 flips", or a Mirror dive where one picks the moves and the other copies).
   Both press ▲ to say ready (nothing happens until BOTH are ready, so nobody can dive alone), then a shared count
   3-2-1-GO! On the springboard each count is a bounce: ▲ right on the beat bounces higher (up to 3) for more air time;
   a press off the beat (or a second one on the same beat) wobbles the board and the next beat gives no bounce.
   ▲ on GO takes off. In the air: ▲ flip, ◀ or ▶ twist, hold ▼ to tuck (flips spin faster). Moves run one at a time
   (one more press is remembered). Before the water you must be straight: still spinning is a cartoon SPLOOSH belly flop,
   still tucked is a CANNONBALL; both are soft (big splash, a giggle, fewer points).
   Three judges hold up cards: Pip's judge and Bo's judge score each diver (the call matched, the entry), the gold sync
   judge (counts double) compares the two divers: takeoff together, each move of the dive together (only moves that
   match the call, or the lead's first max moves, count), entry together (worth less when the moves did not match or
   the entries differ). So a partner who only jumps, or two mashers, get little sync.
   Dive points = (Pip card + Bo card + 2 x sync card) x the dive's difficulty. Gold, silver or bronze by the total (MODES.dive.medals); the
   level is scored by points, not time (noTime). Help, gold and announced: after a messy dive, "Gold air time" (+0.3 s).
   The mode owns the tick, the whole picture and the HUD (def.ownStep + def.ownHUD); the grid is empty apart from the
   spawns. Players are mirrored into p.x / p.y every step for name tags and speech bubbles.
   Every global is prefixed dive / DIVE (and Sfx.extra.dive*); all state lives in G.mst. */
const DIVE = {
  waterY: 448, pxM: 25.8, S: 1.3,                 // S: the divers are drawn this much bigger than in other levels
  towerX: [440, 520], ladderX: [459, 501],
  boardLen: { 3: 122, 5: 92, 7.5: 102, 10: 112 },
  heights: [3, 5, 7.5, 10],
  flipOpen: 0.5, flipTuck: 0.3, twistT: 0.42, tuckRate: 8, tuckOn: 0.5,
  lateT: 0.1, nearDone: 0.88,                    // a move this far through at the water is "late", not a belly flop
  beat: 0.6, bounceWin: 0.14, goWin: 0.14, slipT: 1.3, maxBounce: 3, bounceAir: 0.12,
  hopA: 26, bounceA: [30, 46, 62, 78], slipA: 6, travel: 125,
  cardT: 1.0, readyGap: 0.35, splashT: 1.2, judgeT: 3.9, podiumT: 4.6,
  swimT: 1.0, walkT: 0.5, climbPerM: 0.09,
  helpAir: 0.3,
  entryPts: { rip: 4, late: 2.5, cannon: 1.5, flop: 0.5 },
  entryWord: { rip: 'Clean!', late: 'Close!', cannon: 'CANNONBALL!', flop: 'SPLOOSH!' },
  medals: [['Gold', 290, '#ffc53d', '#b9850f'], ['Silver', 210, '#dfe6f0', '#8f9bb0'], ['Bronze', 0, '#e0a068', '#97582a']],
};
const diveLerp = (a, b, u) => a + (b - a) * u;
const diveEase = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const diveLin = (x, a, b) => clamp(1 - (x - a) / (b - a), 0, 1);
const diveHalf = v => Math.round(v * 2) / 2;
const diveBoardY = h => DIVE.waterY - h * DIVE.pxM;
const diveTipX = (h, id) => (id === 0 ? DIVE.towerX[0] - DIVE.boardLen[h] : DIVE.towerX[1] + DIVE.boardLen[h]);
const diveStandX = (h, id) => diveTipX(h, id) + (id === 0 ? 14 : -14);
const diveHalfH = () => PH / 2 * DIVE.S;   // from a diver's centre to its feet
const diveFlipDur = tuck => diveLerp(DIVE.flipOpen, DIVE.flipTuck, clamp(tuck, 0, 1));
const diveMoveDur = (type, tuck) => (type === 'flip' ? diveFlipDur(tuck) : DIVE.twistT);
const diveGo = st => (st.c0 == null ? Infinity : st.c0 + 3 * DIVE.beat);
// 1-player mode: the computer's diver gets no key hints (it knows its job; the person might think the keys were theirs)
const diveQuiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
// each player's own keys (the engine's actKey picks the device: a player with a controller sees its buttons)
function diveKey(id, what) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
  if (what === 'jump') return pad ? glyph('a') : touch ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'down') return pad || touch ? '▼' : id === 0 ? 'S' : '↓';
  return pad || touch ? '◀▶' : id === 0 ? 'A D' : '←→';
}
// the longest common run of moves (in order) between two move lists
function diveLcs(a, b) {
  const m = a.length, n = b.length, t = [];
  for (let i = 0; i <= m; i++) { t.push(new Array(n + 1).fill(0)); }
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) t[i][j] = a[i - 1] === b[j - 1] ? t[i - 1][j - 1] + 1 : Math.max(t[i - 1][j], t[i][j - 1]);
  return t[m][n];
}

/* ---------- a dive ---------- */
function diveSetup(st, L) {
  st.dives = L.def.dives || [];
  st.k = -1; st.total = 0; st.shown = 0; st.hist = []; st.help = 0; st.d = null;
  st.stats = { rips: [0, 0], flops: [0, 0], cannons: [0, 0], lates: [0, 0], slips: [0, 0], bounces: [0, 0], moves: [0, 0], syncSum: 0, helps: 0 };
  st.parts = []; st.pops = []; st.rings = []; st.msg = null; st.hinted = {};
  st.prevL = [true, true]; st.prevR = [true, true];
  st.cheer = 0; st.ooh = 0; st.flex = [{ y: 0, v: 0 }, { y: 0, v: 0 }];
  st.crowd = diveCrowd();
  diveNext(st, true);
  diveMirror(st);
}
function diveNext(st, first) {
  st.k++;
  st.dv = st.dives[st.k];
  st.phase = first ? 'ready' : 'climb'; st.t = 0;
  st.ready = [false, false]; st.readyT = [null, null]; st.c0 = null; st.beatN = -1;
  st.helped = st.help > 0; st.air = st.dv.air + (st.helped ? DIVE.helpAir : 0); st.help = 0;
  st.cards = null; st.added = false; st.waitT = 0;
  const h = st.dv.h;
  st.d = [0, 1].map(id => {
    const prev = st.d ? st.d[id] : null;
    const d = { id, dir: id === 0 ? -1 : 1, state: first ? 'board' : 'climb', standX: diveStandX(h, id), feetY: diveBoardY(h),
      x: diveStandX(h, id), y: diveBoardY(h) - diveHalfH(), from: prev ? { x: prev.x, y: DIVE.waterY } : null,
      t0: null, T: 0, g: 0, vy0: 0, vx: 0, x0: 0, y0: 0, A: 0, bounce: 0, bounced: [false, false, false], wob: [false, false, false], slip: false, early: 0,
      moves: [], cur: null, queue: null, tuck: 0, lastEnd: -9, tEntry: null, kind: null, ex: 0, wt: 0,
      flipN: 0, twistN: 0, flipA: 0, twistA: 0, ang: 0, hop: 0, pressed: false };
    return d;
  });
  st.climbDur = DIVE.swimT + 0.3 + DIVE.climbPerM * h + DIVE.walkT;
  if (!first) Sfx.play('diveCard');
}
function diveStep(st, dt) {
  if (!st.d) return;
  const ps = G.players, now = G.time, intro = G.introT > 0;
  const jp = ps.map(p => p.pendingJump && !intro);
  ps.forEach(p => { p.pendingJump = false; });
  const tw = ps.map(p => ((p.input.left && !st.prevL[p.id]) ? -1 : (p.input.right && !st.prevR[p.id]) ? 1 : 0) * (intro ? 0 : 1));
  st.prevL = ps.map(p => p.input.left); st.prevR = ps.map(p => p.input.right);
  for (const p of ps) if (jp[p.id] || tw[p.id] || p.input.down) st.d[p.id].pressed = true;
  if (!intro) st.t += dt;
  if (st.phase === 'climb') {
    if (st.t >= st.climbDur) { st.phase = 'ready'; st.t = 0; for (const d of st.d) { d.state = 'board'; d.x = d.standX; d.y = d.feetY - diveHalfH(); } }
  } else if (st.phase === 'ready') diveReady(st, jp, dt);
  else if (st.phase === 'count') diveCount(st, dt, jp, tw);
  else if (st.phase === 'splash') { if (st.t >= DIVE.splashT) { st.phase = 'judge'; st.t = 0; } }
  else if (st.phase === 'judge') diveJudge(st);
  else if (st.phase === 'podium') { if (divePodiumStep(st)) return; }
  for (const d of st.d) diveMoveDiver(st, d, dt, now);
  diveFx(st, dt);
  diveMirror(st);
}
function diveReady(st, jp, dt) {
  if (st.t < DIVE.cardT) return;
  st.waitT += dt;
  for (const id of [0, 1]) {
    if (!jp[id] || st.ready[id]) continue;
    st.ready[id] = true; st.readyT[id] = G.time;
    Sfx.play('diveReady', id);
    divePop(st, st.d[id].x, st.d[id].y - 44, 'Ready!', '#8fe3b0', 18);
  }
  if (st.ready[0] && st.ready[1]) {
    st.phase = 'count'; st.t = 0; st.c0 = G.time + DIVE.readyGap + DIVE.beat; st.beatN = -1;
  }
}
// the count, the takeoff and the flight (until both divers are in the water)
function diveCount(st, dt, jp, tw) {
  const now = G.time, go = diveGo(st), B = DIVE.beat, spring = !!st.dv.spring;
  // the beat: 3, 2, 1, GO!
  const n = Math.floor((now - st.c0) / B + 1e-6);
  if (n > st.beatN && n >= 0 && n <= 3) {
    st.beatN = n;
    Sfx.play(n === 3 ? 'diveGo' : 'diveBeep');
    if (spring) for (const d of st.d) if (d.state === 'board') { st.flex[d.id].v += 70 + 18 * d.bounce; }
  }
  for (const d of st.d) {
    const p = G.players[d.id];
    if (d.state === 'board') {
      if (jp[d.id]) {
        if (now >= go - DIVE.goWin) diveTakeoff(st, d, now, false);
        else if (spring) {
          const k = Math.round((now - st.c0) / B), lk = st.c0 + k * B, onBeat = k >= 0 && k <= 2 && Math.abs(now - lk) <= DIVE.bounceWin;
          if (onBeat && !d.bounced[k] && !d.wob[k]) {
            d.bounced[k] = true; d.bounce = Math.min(DIVE.maxBounce, d.bounce + 1); st.stats.bounces[d.id]++;
            divePop(st, d.x - d.dir * 50, d.y - 6, d.bounce >= 3 ? 'MEGA boing!' : 'Boing!', d.bounce >= 3 ? C.gold : '#ffffff', 16 + d.bounce * 2);
            Sfx.play('diveBoing', d.id); st.flex[d.id].v += 60;
          } else {
            // a press off the beat (or a second one on the same beat) wobbles the board: the next beat gives no bounce,
            // so mashing ▲ never bounces (one press on each beat does)
            const nk = onBeat ? k + 1 : Math.ceil((now - st.c0) / B - 1e-6);
            if (nk >= 0 && nk <= 2) d.wob[nk] = true;
            diveEarly(st, d, 'On the beat!');
          }
        } else diveEarly(st, d, 'Wait for GO!');
      }
      if (d.state === 'board' && now > go + DIVE.slipT) diveTakeoff(st, d, now, true);
    } else if (d.state === 'air') {
      if (jp[d.id]) diveMove(st, d, 'flip', now, 1);
      if (tw[d.id]) diveMove(st, d, 'twist', now, tw[d.id] * d.dir);
      d.tuck = approach(d.tuck, p.input.down ? 1 : 0, dt * DIVE.tuckRate);
      if (d.cur) {
        d.cur.p += dt / diveMoveDur(d.cur.type, d.cur.type === 'flip' ? d.tuck : 0);
        if (d.cur.p >= 1) diveEndMove(st, d, now);
      }
      if (now - d.t0 >= d.T) diveEnter(st, d, now);
    }
  }
  if (st.d.every(d => d.state === 'water') && st.d.every(d => d.wt >= 0.35)) {
    st.cards = diveCards(st);
    st.phase = 'splash'; st.t = 0;
  }
}
function diveEarly(st, d, text) {
  if (d.early > G.time) return;
  d.early = G.time + 0.9;
  divePop(st, d.x, d.y - 46, text, '#d9d3ef', 14);
}
function diveTakeoff(st, d, now, slip) {
  const spring = !!st.dv.spring;
  const A = slip ? DIVE.slipA : spring ? DIVE.bounceA[d.bounce] : DIVE.hopA;
  const T = st.air + (spring && !slip ? d.bounce * DIVE.bounceAir : 0);
  const y0 = d.feetY - diveHalfH(), D = DIVE.waterY - y0 + A;
  d.state = 'air'; d.t0 = now; d.slip = slip; d.A = A; d.T = T;
  d.g = Math.pow((Math.sqrt(2 * A) + Math.sqrt(2 * D)) / T, 2); d.vy0 = Math.sqrt(2 * d.g * A);
  d.x0 = d.standX; d.y0 = y0;
  d.vx = d.dir * (DIVE.travel + (spring && !slip ? 10 * d.bounce : 0)) / T * (slip ? 0.5 : 1);
  st.flex[d.id].v += spring ? 160 + 30 * d.bounce : 40;
  if (slip) { st.stats.slips[d.id]++; divePop(st, d.x, d.y - 46, 'Whoops!', '#ffd0d0', 18); Sfx.play('diveSlip', d.id); }
  else Sfx.play('diveJump', d.id);
  rumble(d.id, 0.1, 0.3, 80);
}
function diveMove(st, d, type, now, sgn) {
  if (d.cur) { if (!d.queue) d.queue = { type, sgn }; return; }
  d.cur = { type, s: now, e: null, p: 0, sgn };
  d.moves.push(d.cur); st.stats.moves[d.id]++;
  Sfx.play(type === 'flip' ? 'diveFlip' : 'diveTwist', d.id);
}
function diveEndMove(st, d, now) {
  const c = d.cur;
  c.p = 1; c.e = now;
  if (c.type === 'flip') d.flipN++; else d.twistN += c.sgn;
  d.cur = null; d.lastEnd = now;
  if (d.queue) { const q = d.queue; d.queue = null; diveMove(st, d, q.type, now, q.sgn); }
}
function diveEnter(st, d, now) {
  const c = d.cur;
  let kind;
  if (c && c.p < DIVE.nearDone) kind = 'flop';
  else if (d.tuck > DIVE.tuckOn) kind = 'cannon';
  else if (c || now - d.lastEnd < DIVE.lateT) kind = 'late';
  else kind = 'rip';
  if (c) { d.queue = null; if (kind !== 'flop') diveEndMove(st, d, now); else { c.e = now; d.flopAng = d.ang; } }
  d.queue = null;
  d.state = 'water'; d.tEntry = now; d.kind = kind; d.wt = 0; d.ex = d.x;
  const S = st.stats;
  if (kind === 'rip') S.rips[d.id]++; else if (kind === 'flop') S.flops[d.id]++; else if (kind === 'cannon') S.cannons[d.id]++; else S.lates[d.id]++;
  const x = d.x, y = DIVE.waterY;
  if (kind === 'rip') {
    for (let i = 0; i < 12; i++) divePart(st, x + (Math.random() - 0.5) * 10, y, (Math.random() - 0.5) * 50, -160 - Math.random() * 140, 0.7, '#e9f8ff', 2 + Math.random() * 2.5, 700);
    diveRing(st, x, 26); Sfx.play('diveRip');
  } else if (kind === 'late') {
    for (let i = 0; i < 20; i++) divePart(st, x + (Math.random() - 0.5) * 18, y, (Math.random() - 0.5) * 120, -150 - Math.random() * 180, 0.8, '#e9f8ff', 2.5 + Math.random() * 3, 700);
    diveRing(st, x, 40); Sfx.play('diveRip'); Sfx.play('diveSplash');
  } else if (kind === 'cannon') {
    for (let i = 0; i < 34; i++) divePart(st, x + (Math.random() - 0.5) * 26, y, (Math.random() - 0.5) * 110, -260 - Math.random() * 260, 1.0, i % 3 ? '#e9f8ff' : '#9fdcff', 3 + Math.random() * 4, 650);
    diveRing(st, x, 60); diveRing(st, x, 90); Sfx.play('diveCannon'); G.shake = Math.max(G.shake, 0.12);
  } else {
    for (let i = 0; i < 44; i++) { const a = -Math.PI * (0.08 + 0.84 * Math.random()); const s = 160 + Math.random() * 260; divePart(st, x + (Math.random() - 0.5) * 40, y, Math.cos(a) * s, Math.sin(a) * s, 1.0, i % 3 ? '#e9f8ff' : '#9fdcff', 3 + Math.random() * 4, 600); }
    diveRing(st, x, 70); diveRing(st, x, 110); Sfx.play('diveSploosh'); G.shake = Math.max(G.shake, 0.18); st.ooh = 1;
  }
  divePop(st, x, y - 70, DIVE.entryWord[kind], kind === 'rip' ? '#c8f1ff' : kind === 'late' ? '#ffffff' : '#ffe28a', kind === 'rip' ? 20 : 24);
  rumble(d.id, kind === 'flop' || kind === 'cannon' ? 0.5 : 0.15, 0.4, kind === 'flop' ? 220 : 110);
}

/* ---------- the judges ---------- */
function diveCards(st) {
  const dv = st.dv, d = st.d, types = d.map(x => x.moves.map(m => m.type));
  const q = [0, 0];
  if (dv.mirror != null) {
    const lead = dv.mirror, fol = 1 - lead, lt = types[lead];
    q[lead] = Math.max(0, Math.min(lt.length, dv.max) - Math.max(0, lt.length - dv.max)) / dv.max;   // (moves past the max count against)
    q[fol] = lt.length === 0 ? (types[fol].length === 0 ? 0.3 : 0) : diveLcs(types[fol], lt) / Math.max(types[fol].length, lt.length);
  } else for (const id of [0, 1]) q[id] = diveLcs(types[id], dv.call) / Math.max(types[id].length, dv.call.length);
  const D = d.map((x, id) => clamp(diveHalf(6 * q[id] + DIVE.entryPts[x.kind] - (x.slip ? 1 : 0)), 0, 10));
  // sync: takeoff together, each move together, the entry together. Only moves of the dive count as moves together
  // (the call, or the lead's first max moves), so two divers mashing the same button, or a partner copying a masher,
  // are not "in sync"; the entry part counts fully only when the moves matched too (a partner who only jumps on GO
  // and drops in straight is not much of a synchro dive)
  const mirror = dv.mirror != null, [a, b] = d;
  const target = mirror ? types[dv.mirror].slice(0, dv.max) : dv.call;
  const tk = 2.5 * diveLin(Math.abs(a.t0 - b.t0), 0.04, 0.3);
  const nMax = Math.max(a.moves.length, b.moves.length, target.length, 1);
  let ms = 0;
  for (let i = 0; i < Math.min(a.moves.length, b.moves.length, target.length); i++) {
    const ma = a.moves[i], mb = b.moves[i];
    if (ma.type !== target[i] || mb.type !== target[i]) continue;
    ms += mirror ? diveLin(Math.abs(ma.s - mb.s), 0.25, 0.6) : diveLin(Math.abs(ma.s - mb.s), 0.08, 0.4);
  }
  const mv = 4.5 * ms / nMax;
  const de = Math.abs(a.tEntry - b.tEntry);
  const same = a.kind === b.kind, en = (2 * diveLin(de, 0.04, 0.3) * (same ? 1 : 0.6) + (de < 0.5 && same ? (a.kind === 'rip' ? 1 : 0.5) : 0)) * (0.35 + 0.65 * ms / nMax);
  const S = clamp(diveHalf(tk + mv + en), 0, 10);
  const score = Math.round((D[0] + D[1] + 2 * S) * dv.dd * 10) / 10;
  return { D, S, score, kinds: d.map(x => x.kind), parts: { tk, mv, en } };
}
function diveJudge(st) {
  const c = st.cards;
  const at = [0.35, 0.8, 1.3];
  for (let i = 0; i < 3; i++) if (st.t >= at[i] && !(st.cardUp || [])[i]) { (st.cardUp = st.cardUp || [])[i] = true; Sfx.play('diveCard'); }
  if (st.t >= 1.9 && !st.added) {
    st.added = true;
    st.total = Math.round((st.total + c.score) * 10) / 10;
    st.stats.syncSum += c.S;
    st.hist.push({ k: st.k, h: st.dv.h, title: st.dv.title, score: c.score, S: c.S, D: c.D.slice(), kinds: c.kinds.slice() });
    const good = c.S >= 8 && c.kinds.every(k => k === 'rip');
    if (good) { st.cheer = 1; Sfx.play('diveCheer'); divePop(st, 480, 330, c.S >= 9.5 ? 'PERFECT SYNC!' : 'In sync!', C.gold, 26); }
    else if (c.S >= 6) { st.cheer = 0.6; Sfx.play('diveClap'); }
    else { st.cheer = 0.35; Sfx.play('diveClap'); }
    // gold help, announced: a messy dive gives the next one more time in the air
    const messy = c.kinds.some(k => k === 'flop' || k === 'cannon') || c.S < 5 || st.d.some(x => x.slip);
    if (messy && st.k < st.dives.length - 1) {
      st.help = 1; st.stats.helps++;
      diveMsg(st, 'Gold air time! The next dive floats +' + DIVE.helpAir + ' s longer', C.gold, 3.6);
      Sfx.play('diveHelp');
    }
  }
  if (st.t >= DIVE.judgeT) {
    st.cardUp = null;
    if (st.k >= st.dives.length - 1) diveStartPodium(st);
    else diveNext(st, false);
  }
}
function diveMedal(total) { return DIVE.medals.find(m => total >= m[1]) || DIVE.medals[2]; }
function diveStartPodium(st) {
  st.phase = 'podium'; st.t = 0; st.podiumDone = false;
  for (const d of st.d) { d.state = 'podium'; d.from = { x: d.x, y: d.y }; }
  Sfx.play('diveMedal');
}
function divePodiumStep(st) {
  if (st.t > 0.9 && !st.conf) { st.conf = true; for (let k = 0; k < 60; k++) confetti(480, 300); rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250); }
  if (st.t >= DIVE.podiumT && !st.podiumDone) {
    st.podiumDone = true;
    G.level.goal = { x: 480, y: 300 };
    levelClear();
    return true;
  }
  return false;
}

/* ---------- where each diver is (and how it is posed) ---------- */
function diveMoveDiver(st, d, dt, now) {
  const Dv = DIVE, h = st.dv.h;
  d.hop = 0;
  if (d.state === 'climb') {
    const t = st.t, fr = d.from || { x: d.standX, y: d.feetY - diveHalfH() }, lx = Dv.ladderX[d.id];
    const cd = 0.3 + Dv.climbPerM * h, by = d.feetY - diveHalfH();
    if (t < Dv.swimT) { const u = diveEase(t / Dv.swimT); d.x = diveLerp(fr.x, lx, u); d.y = Dv.waterY + 1 + Math.sin(t * 9) * 1.5; d.pose = 'swim'; }
    else if (t < Dv.swimT + cd) { const u = (t - Dv.swimT) / cd; d.x = lx; d.y = diveLerp(Dv.waterY + 1, by, diveEase(u)); d.pose = 'climb'; }
    else { const u = diveEase((t - Dv.swimT - cd) / Dv.walkT); d.x = diveLerp(lx, d.standX, u); d.y = by - Math.abs(Math.sin(u * Math.PI * 3)) * 3; d.pose = 'walk'; }
    return;
  }
  if (d.state === 'board') {
    d.x = d.standX;
    let y = d.feetY - diveHalfH() + Math.max(0, st.flex[d.id].y) * 0.6;
    if (st.phase === 'count' && st.dv.spring && now >= st.c0 - Dv.beat) {
      const u = ((now - (st.c0 - Dv.beat)) / Dv.beat) % 1, H0 = 10 + 9 * d.bounce;
      d.hop = H0 * 4 * u * (1 - u); y -= d.hop;
    }
    d.y = y;
    return;
  }
  if (d.state === 'air') {
    const tau = now - d.t0;
    d.x = d.x0 + d.vx * tau; d.y = d.y0 - d.vy0 * tau + 0.5 * d.g * tau * tau;
    const base = Math.PI * diveEase(tau / d.T);
    d.flipA = (d.flipN + (d.cur && d.cur.type === 'flip' ? diveEase(d.cur.p) : 0)) * Math.PI * 2;
    d.twistA = (d.twistN + (d.cur && d.cur.type === 'twist' ? diveEase(d.cur.p) * d.cur.sgn : 0)) * Math.PI * 2;
    d.ang = base + d.flipA;
    return;
  }
  if (d.state === 'water') {
    d.wt += dt;
    const w = d.wt;
    if (d.kind === 'flop' && w < 0.55) { d.x = d.ex; d.y = Dv.waterY - 2; }
    else if (w < 0.6) { d.x = d.ex - d.dir * 6 * w; d.y = Dv.waterY + 44 * Math.sin(Math.PI * w / 0.6); }
    else {
      if (!d.popped) { d.popped = true; for (let i = 0; i < 8; i++) divePart(st, d.x, Dv.waterY, (Math.random() - 0.5) * 80, -60 - Math.random() * 80, 0.5, '#e9f8ff', 2 + Math.random() * 2, 500); Sfx.play('divePop', d.id); }
      // swim a little toward the tower; on phones the corner panels are bigger, so swim out from under them
      const big = hudBig(), to = big ? (d.id === 0 ? Math.max(d.ex + 18, 356) : Math.min(d.ex - 18, W - 356)) : d.ex - d.dir * 18;
      d.x = approach(d.x, to, dt * (big ? 80 : 12)); d.y = Dv.waterY + 1 + Math.sin(w * 3 + d.id) * 1.6;
    }
    return;
  }
  if (d.state === 'podium') {
    const u = clamp(st.t / 0.8, 0, 1), to = { x: 480 + (d.id === 0 ? -24 : 24), y: 412 - diveHalfH() };
    const e = diveEase(u);
    d.x = diveLerp(d.from.x, to.x, e); d.y = diveLerp(d.from.y, to.y, u) - 150 * 4 * u * (1 - u);
    if (u >= 1) d.y = to.y - Math.abs(Math.sin((st.t - 0.8) * 6 + d.id * 1.4)) * 10;
  }
}
// copy the divers into the engine players: name tags, bubbles and the core's helpers read p.x / p.y
function diveMirror(st) {
  for (const d of st.d) {
    const p = G.players[d.id];
    p.x = d.x - PW / 2; p.y = d.y - diveHalfH(); p.vx = d.state === 'air' ? d.vx : 0; p.vy = 0;
    p.alive = true; p.grounded = d.state !== 'air'; p.face = d.dir; p.stompSafe = 0; p.stun = 0;
  }
}

/* ---------- effects ---------- */
function divePop(st, x, y, s, col, size) { st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 }); if (st.pops.length > 12) st.pops.shift(); }
function diveMsg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
function divePart(st, x, y, vx, vy, life, col, size, grav) {
  if (st.parts.length > 300) st.parts.shift();
  st.parts.push({ x, y, vx, vy, life, max: life, col, size, grav: grav || 0 });
}
function diveRing(st, x, r) { st.rings.push({ x, r, t: 0 }); }
function diveFx(st, dt) {
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const q = st.parts[i];
    if ((q.life -= dt) <= 0 || (q.vy > 0 && q.y > DIVE.waterY + 4)) { st.parts.splice(i, 1); continue; }
    q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt;
  }
  for (const r of st.rings) r.t += dt;
  st.rings = st.rings.filter(r => r.t < 1.2);
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.2);
  if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
  st.cheer = Math.max(0, st.cheer - dt * 0.3); st.ooh = Math.max(0, st.ooh - dt * 0.6);
  for (const f of st.flex) { f.v += (-260 * f.y - 9 * f.v) * dt; f.y += f.v * dt; }
  st.shown = approach(st.shown, st.total, dt * Math.max(30, Math.abs(st.total - st.shown) * 3));
  // gold air time: sparkles around the divers
  if (st.helped && st.phase === 'count') for (const d of st.d) if (d.state === 'air' && Math.random() < dt * 30) divePart(st, d.x + (Math.random() - 0.5) * 30, d.y + (Math.random() - 0.5) * 30, 0, 20, 0.5, C.gold, 2 + Math.random() * 2, 0);
}

MODES.dive = {
  // medal goals (js/medals.js): the points total, from DIVE.medals (the podium medal uses the same lines, diveMedal)
  medals: { bronze: 'Finish every dive', goals: [
    { key: 'points', gold: DIVE.medals[0][1], silver: DIVE.medals[1][1], more: true, word: 'point' },
  ] },
  medalValues() { const st = G.mst; return { points: Math.round((st.total || 0) * 10) / 10 }; },
  DIVE,
  key: diveKey, cards: diveCards, flipDur: diveFlipDur, moveDur: diveMoveDur, go: diveGo,
  setup(st, L) { diveSetup(st, L); },
  step(dt) { diveStep(G.mst, dt); },
  // the engine draws the players between draw() and drawTop(): they are hidden then and drawn by the mode instead
  draw() {
    const st = G.mst;
    if (!st.d) return;
    diveDrawWorld(st);
    st.hid = G.players.map(p => p.alive);
    for (const p of G.players) p.alive = false;
  },
  drawTop() {
    const st = G.mst;
    if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; }
    if (!st.d) return;
    diveDrawFront(st);
  },
  hud() { const st = G.mst; if (st.d) diveHud(st); },
  stats() {
    const st = G.mst, s = st.stats;
    if (!s) return [];
    const n = Math.max(1, st.hist.length), m = diveMedal(st.total);
    const out = [
      { label: 'Points', value: st.total.toFixed(1) },
      { label: 'Sync', value: (s.syncSum / n).toFixed(1) + ' / 10' },
      { label: 'Clean dives', values: [s.rips[0], s.rips[1]] },
    ];
    let best = null;
    for (const hh of st.hist) if (!best || hh.score > best.score) best = hh;
    if (best) out.push('Best dive: ' + best.title + ' (' + best.h + ' m), ' + best.score.toFixed(1) + ' points, sync ' + best.S.toFixed(1));
    const flops = s.flops[0] + s.flops[1] + s.cannons[0] + s.cannons[1];
    const words = m[0] === 'Gold' ? (s.syncSum / n >= 8.5 ? 'Perfectly in sync!' : 'What a team!') : m[0] === 'Silver' ? 'Lovely diving together!' : flops >= 4 ? 'The biggest splashes in town!' : 'Splashing good fun!';
    out.push(words);
    return out;
  },
};

/* ---------- drawing: the stadium ---------- */
const DIVE_FLAGS = [['#ff9fd0', '#ffffff', '#8e6cff'], ['#8e6cff', '#ffd23f', '#8e6cff'], ['#ff9f1c', '#2ec4b6'], ['#5bd16f', '#ffd23f', '#5bd16f'],
  ['#ff5fa2', '#ffe28a'], ['#3d7cff', '#ffd23f', '#ff6b4a']];
const DIVE_SKIN = ['#f6d3b3', '#e8b48a', '#c98d5e', '#8d5a3b', '#ffe0c2', '#b07a52'];
const DIVE_SHIRT = ['#ff6b6b', '#2ec4b6', '#ffd23f', '#8e6cff', '#5bd16f', '#ff9f1c', '#3d7cff', '#ff5fa2', '#ffffff'];
function diveCrowd() {
  const out = [];
  for (let r = 0; r < 5; r++) for (let i = 0; i < 46; i++) {
    const h = hash(i * 7 + 3, r * 13 + 5);
    const x = 8 + i * 21 + (r % 2) * 10 + (h % 7) - 3;
    out.push({ x, r, skin: DIVE_SKIN[h % DIVE_SKIN.length], shirt: DIVE_SHIRT[(h >> 3) % DIVE_SHIRT.length], hair: (h >> 7) % 5,
      hairCol: ['#3a2a20', '#7a4a22', '#e8c36a', '#1c1a36', '#b8402a'][(h >> 10) % 5], flag: (h >> 13) % 9 === 0 ? DIVE_FLAGS[(h >> 16) % DIVE_FLAGS.length] : null,
      foam: (h >> 13) % 9 === 4, ph: (h % 100) / 16 });
  }
  return out;
}
function diveDrawWorld(st) {
  diveDrawSky(st);
  diveDrawStands(st);
  diveDrawPoolBack(st);
  diveDrawTower(st);
}
function diveDrawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, 260);
  g.addColorStop(0, '#45aef0'); g.addColorStop(1, '#bfe9ff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 260);
  // the sun with soft rays
  ctx.save(); ctx.translate(845, 92);
  ctx.fillStyle = 'rgba(255,246,190,0.35)';
  for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(0, -48); ctx.lineTo(9, -80 - (i % 2) * 14); ctx.lineTo(-9, -80 - (i % 2) * 14); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,240,170,0.45)'; circle(845, 92, 56); ctx.fill();
  ctx.fillStyle = '#fff3b0'; circle(845, 92, 40); ctx.fill();
  for (let i = 0; i < 4; i++) {
    const x = ((i * 271 + G.clock * (5 + i * 2)) % (W + 260)) - 130, y = 46 + ((i * 53) % 90);
    drawCloud(x, y, 0.65 + (i % 2) * 0.35);
  }
  // the stadium roof edges far away, and bunting
  for (const [x0, x1, sag, y0] of [[-20, 470, 30, 18], [490, 980, 30, 18]]) {
    ctx.strokeStyle = 'rgba(28,26,54,0.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, y0 + sag * 2, x1, y0); ctx.stroke();
    const n = 15;
    for (let k = 1; k < n; k++) {
      const u = k / n, x = diveLerp(x0, x1, u), y = y0 + sag * 4 * u * (1 - u);
      const sw = Math.sin(G.clock * 2.4 + k) * 0.12;
      ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
      ctx.fillStyle = DIVE_SHIRT[(k * 3 + (x0 > 0 ? 2 : 0)) % 8];
      ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.lineTo(0, 15); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
}
function diveDrawStands(st) {
  const top = 238, rh = 40, cheer = st.cheer, t = G.clock;
  // the back wall and the roof shade
  ctx.fillStyle = '#5a6fa8'; ctx.fillRect(0, top - 22, W, 448 - top + 22);
  ctx.fillStyle = '#4a5c92'; ctx.fillRect(0, top - 22, W, 6);
  ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, top - 16, W, 3);
  ctx.fillStyle = '#44568a'; for (let x = 60; x < W; x += 180) ctx.fillRect(x - 4, top - 13, 8, 448 - top + 13);
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; for (let x = 60; x < W; x += 180) ctx.fillRect(x - 4, top - 13, 2, 448 - top + 13);
  for (let r = 0; r < 5; r++) {
    const y = top + r * rh;
    // the crowd in this row (heads first, then the seat row in front hides their bodies)
    for (const c of st.crowd) {
      if (c.r !== r) continue;
      if (c.x > DIVE.towerX[0] + 4 && c.x < DIVE.towerX[1] - 4) continue;   // (hidden by the tower anyway)
      const bounce = 1.2 * Math.sin(t * 2 + c.ph) + cheer * 6 * Math.abs(Math.sin(t * 9 + c.ph));
      const hx = c.x, hy = y + 14 - bounce;
      ctx.fillStyle = c.shirt; rr(hx - 9, hy + 6, 18, 20, 7); ctx.fill();
      const armsUp = cheer > 0.25 && Math.sin(c.ph * 3) > -0.3;
      if (armsUp || c.flag || c.foam) {
        ctx.strokeStyle = c.skin; ctx.lineWidth = 3; ctx.lineCap = 'round';
        const wv = Math.sin(t * 8 + c.ph) * 3;
        ctx.beginPath(); ctx.moveTo(hx - 7, hy + 9); ctx.lineTo(hx - 11 + wv, hy - 8); ctx.stroke();
        if (armsUp) { ctx.beginPath(); ctx.moveTo(hx + 7, hy + 9); ctx.lineTo(hx + 11 - wv, hy - 8); ctx.stroke(); }
        ctx.lineCap = 'butt';
        if (c.flag) {
          const fx = hx - 11 + wv, fy = hy - 10, wav = Math.sin(t * 6 + c.ph) * (2 + cheer * 3);
          ctx.strokeStyle = '#6b4630'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(fx, fy + 4); ctx.lineTo(fx, fy - 18); ctx.stroke();
          const bandH = 12 / c.flag.length;
          c.flag.forEach((col, k) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(fx, fy - 18 + k * bandH); ctx.lineTo(fx - 18, fy - 18 + k * bandH + wav * 0.5); ctx.lineTo(fx - 18, fy - 18 + (k + 1) * bandH + wav * 0.5); ctx.lineTo(fx, fy - 18 + (k + 1) * bandH); ctx.closePath(); ctx.fill(); });
        } else if (c.foam) {
          ctx.fillStyle = '#ffd23f'; rr(hx - 16 + wv, hy - 22, 10, 14, 4); ctx.fill(); ctx.fillRect(hx - 13 + wv, hy - 30, 4, 10);
        }
      }
      ctx.fillStyle = c.skin; circle(hx, hy, 7); ctx.fill();
      ctx.fillStyle = c.hairCol;
      if (c.hair === 0) { ctx.beginPath(); ctx.arc(hx, hy - 1, 7.4, Math.PI, 0); ctx.fill(); }
      else if (c.hair === 1) { circle(hx - 4, hy - 6, 3.5); ctx.fill(); circle(hx + 1, hy - 7.5, 3.8); ctx.fill(); circle(hx + 5, hy - 5, 3.2); ctx.fill(); }
      else if (c.hair === 2) { ctx.fillStyle = c.shirt; ctx.beginPath(); ctx.arc(hx, hy - 2, 7.6, Math.PI, 0); ctx.fill(); ctx.fillRect(hx - 2, hy - 4, 11, 2.5); }
      else if (c.hair === 3) { ctx.beginPath(); ctx.arc(hx, hy - 2, 7, Math.PI * 1.1, -0.1); ctx.fill(); circle(hx + 7, hy - 3, 3); ctx.fill(); }
      ctx.fillStyle = C.ink; circle(hx - 2.4, hy + 0.5, 1.1); ctx.fill(); circle(hx + 2.4, hy + 0.5, 1.1); ctx.fill();
      if (st.ooh > 0.2) { circle(hx, hy + 4, 1.6); ctx.fill(); }
    }
    // the seat row
    ctx.fillStyle = r % 2 ? '#3f8fd6' : '#2f78c0'; ctx.fillRect(0, y + 26, W, rh - 26);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(0, y + 26, W, 2);
  }
  // a light haze: the crowd sits back, so the divers stand out
  ctx.fillStyle = 'rgba(200,232,255,0.28)'; ctx.fillRect(0, top - 22, W, 448 - top + 22);
  // the banner along the front of the stands
  const by = 430;
  ctx.fillStyle = 'rgba(30,50,90,0.2)'; ctx.fillRect(0, by + 8, W, 3);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, by - 8, W, 16);
  ctx.fillStyle = '#2ec4b6'; ctx.fillRect(0, by - 8, W, 3); ctx.fillStyle = '#ff6b6b'; ctx.fillRect(0, by + 5, W, 3);
  ctx.font = '12px "Lilita One", "Arial Rounded MT Bold", sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  for (const x of [215, 745]) { ctx.fillStyle = '#2b3f63'; ctx.fillText('SUMMER GAMES  ★  SYNCHRO DIVING', x, by + 0.5); }
  // the torch, high on a column at the right end of the stands
  const tx = 912, ty = 168;
  ctx.fillStyle = '#c9d3e1'; ctx.fillRect(tx - 7, ty + 16, 14, top - 22 - ty - 16 + 4);
  ctx.fillStyle = '#9aa7bd'; ctx.fillRect(tx - 7, ty + 16, 4, top - 22 - ty - 12);
  ctx.fillStyle = '#ffc53d'; ctx.beginPath(); ctx.moveTo(tx - 22, ty); ctx.lineTo(tx + 22, ty); ctx.lineTo(tx + 10, ty + 18); ctx.lineTo(tx - 10, ty + 18); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#b9850f'; ctx.fillRect(tx - 22, ty, 44, 4);
  for (let i = 0; i < 3; i++) {
    const f = Math.sin(t * (7 + i * 2) + i) * 3, hgt = 30 - i * 8 + Math.sin(t * 11 + i) * 4;
    ctx.fillStyle = ['#ff6b4a', '#ff9f1c', '#ffe28a'][i];
    ctx.beginPath(); ctx.moveTo(tx - 16 + i * 5, ty); ctx.quadraticCurveTo(tx - 12 + f, ty - hgt * 0.6, tx + f * 0.6, ty - hgt); ctx.quadraticCurveTo(tx + 12 - f, ty - hgt * 0.5, tx + 16 - i * 5, ty); ctx.closePath(); ctx.fill();
  }
}
function diveDrawPoolBack() {
  const y = DIVE.waterY;
  // the far pool edge (white tiles) and the water behind everything
  ctx.fillStyle = '#f3f7fb'; ctx.fillRect(0, y - 10, W, 10);
  ctx.fillStyle = '#c9d8e8'; for (let x = 0; x < W; x += 16) ctx.fillRect(x, y - 10, 1, 10);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, y - 10, W, 2);
  ctx.fillStyle = '#2b6fb0'; for (let x = 8; x < W; x += 32) ctx.fillRect(x, y - 6, 16, 3);   // a band of blue edge tiles
  const g = ctx.createLinearGradient(0, y, 0, H);
  g.addColorStop(0, '#3fb4e8'); g.addColorStop(1, '#1d6fb8');
  ctx.fillStyle = g; ctx.fillRect(0, y, W, H - y);
  // pool floor tiles and wobbly light lines
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
  for (let x = -20; x < W + 20; x += 40) { ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x - 30, H); ctx.stroke(); }
  // dappled light on the pool floor
  ctx.strokeStyle = 'rgba(220,250,255,0.12)'; ctx.lineWidth = 1.5;
  for (let k = 0; k < 14; k++) {
    const cx = (k * 71 + G.clock * 8) % (W + 60) - 30, cy = y + 40 + (k * 37) % Math.max(10, H - y - 50);
    ctx.beginPath(); ctx.ellipse(cx, cy, 16 + (k % 3) * 5, 5, Math.sin(G.clock * 0.7 + k) * 0.3, 0, Math.PI * 2); ctx.stroke();
  }
  // the water darker right under the far edge (its shadow)
  ctx.fillStyle = 'rgba(16,60,120,0.18)'; ctx.fillRect(0, y, W, 5);
  ctx.strokeStyle = 'rgba(200,240,255,0.3)'; ctx.lineWidth = 2;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    for (let x = 0; x <= W; x += 24) { const yy = y + 26 + k * 24 + Math.sin(x * 0.03 + G.clock * 1.6 + k * 2) * 4; if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
    ctx.stroke();
  }
}
// the tower's pillar and ladders, painted once: cast concrete panels with seams, form-tie dots, a lit left face and a
// shaded right face, water stains low down, and chrome ladders with lit rails and treads
function divePaintTower(g, top, yW) {
  const [x0, x1] = DIVE.towerX, w = x1 - x0, h = H - top;
  const c = '#e6ecf4';
  g.fillStyle = c; g.fillRect(x0, top, w, h);
  g.fillStyle = '#f6f9fc'; g.fillRect(x0, top, w * 0.42, h);
  g.fillStyle = '#d3dce8'; g.fillRect(x0 + w * 0.72, top, w * 0.28, h);
  g.fillStyle = '#bfcadb'; g.fillRect(x1 - 6, top, 6, h);
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(x0 + 2, top, 2, h);
  // panel seams and form-tie dots
  g.strokeStyle = 'rgba(80,100,140,0.22)'; g.lineWidth = 1.5; g.beginPath();
  for (let y = top + 30; y < H; y += 34) { g.moveTo(x0 + 2, y); g.lineTo(x1 - 2, y); }
  g.moveTo(x0 + w / 2, top + 4); g.lineTo(x0 + w / 2, H); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1; g.beginPath();
  for (let y = top + 31.5; y < H; y += 34) { g.moveTo(x0 + 2, y); g.lineTo(x1 - 2, y); } g.stroke();
  for (let y = top + 13; y < H; y += 34) for (const fx of [x0 + 10, x0 + w / 2 - 8, x0 + w / 2 + 8, x1 - 10]) { g.fillStyle = 'rgba(80,100,140,0.28)'; g.beginPath(); g.arc(fx, y, 1.4, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(fx - 1.5, y - 1.8, 1.2, 1); }
  // concrete speckle and a few drip stains
  for (let k = 0; k < 90; k++) { const hx = hash(k, 401), hy = hash(k, 402); g.fillStyle = k % 3 ? 'rgba(90,110,150,0.16)' : 'rgba(255,255,255,0.5)'; g.fillRect(x0 + 3 + hx % (w - 6), top + 4 + hy % (h - 8), 1.2, 1.2); }
  for (let k = 0; k < 5; k++) { const sx = x0 + 8 + hash(k, 403) % (w - 16), sy = top + 40 + hash(k, 404) % (yW - top - 80); const gr = g.createLinearGradient(0, sy, 0, sy + 40); gr.addColorStop(0, 'rgba(110,130,160,0.14)'); gr.addColorStop(1, 'rgba(110,130,160,0)'); g.fillStyle = gr; g.fillRect(sx, sy, 3 + k % 3, 40); }
  // wet and darker near the waterline
  const wg = g.createLinearGradient(0, yW - 50, 0, yW); wg.addColorStop(0, 'rgba(60,110,170,0)'); wg.addColorStop(1, 'rgba(60,110,170,0.22)'); g.fillStyle = wg; g.fillRect(x0, yW - 50, w, 50);
  g.fillStyle = 'rgba(40,100,160,0.25)'; g.fillRect(x0, yW, w, H - yW);
  g.strokeStyle = '#8f9bb0'; g.lineWidth = 2; g.strokeRect(x0, top, w, h);
  // the ladders up the front: chrome rails with a lit stripe, flat treads with grip lines, wall brackets
  for (const lx of DIVE.ladderX) {
    for (let y = top + 30; y < yW + 30; y += 68) { g.fillStyle = '#9aa7bd'; g.fillRect(lx - 10, y - 1.5, 3, 4); g.fillRect(lx + 7, y - 1.5, 3, 4); }
    for (let y = top + 16; y < yW + 30; y += 11) {
      g.fillStyle = '#7f8ba3'; g.fillRect(lx - 7, y - 0.5, 14, 3);
      g.fillStyle = '#c3ccda'; g.fillRect(lx - 7, y - 1.5, 14, 2.2);
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(lx - 6, y - 1.5, 12, 0.8);
    }
    for (const rx of [lx - 7, lx + 7]) {
      g.strokeStyle = '#6f7b93'; g.lineWidth = 3.6; g.beginPath(); g.moveTo(rx, top + 8); g.lineTo(rx, yW + 30); g.stroke();
      g.strokeStyle = '#c3ccda'; g.lineWidth = 2.2; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(rx - 0.6, top + 8); g.lineTo(rx - 0.6, yW + 30); g.stroke();
    }
    // curled grab-bar tops
    g.strokeStyle = '#8f9bb0'; g.lineWidth = 2.4; g.beginPath(); g.arc(lx - 7, top + 4, 4, Math.PI * 0.5, Math.PI * 1.5, false); g.stroke(); g.beginPath(); g.arc(lx + 7, top + 4, 4, -Math.PI * 0.5, Math.PI * 0.5, false); g.stroke();
  }
}
// a platform (5, 7.5, 10 m): a concrete slab with a blue non-slip top, a lit nose, a shaded underside, a braced steel
// strut with bolts, and a railing with posts and lit chrome
function divePaintPlatform(g, h, id) {
  const y = 0, tip = diveTipX(h, id), face = id === 0 ? DIVE.towerX[0] : DIVE.towerX[1], s = id === 0 ? -1 : 1;
  const x0 = Math.min(tip, face) - face, w = Math.abs(face - tip);
  // strut and brace
  g.lineCap = 'round';
  for (const [lw, col] of [[6, '#8f9bb0'], [4, '#c9d2e0']]) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(0, y + 40); g.lineTo(s * w * 0.55, y + 12); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, y + 38.5); g.lineTo(s * w * 0.55, y + 10.5); g.stroke();
  g.lineCap = 'butt';
  rkMetal(g, -3, y + 34, 6, 10, 1.5, '#9aa7bd', 3, { rivets: false, lw: 1 });
  rkRivet(g, 0, y + 39, 1.4, '#c3ccda'); rkRivet(g, s * w * 0.55, y + 13, 1.4, '#c3ccda');
  // the slab
  g.fillStyle = 'rgba(20,40,80,0.18)'; g.fillRect(x0 + 2, y + 12, w, 4);
  g.fillStyle = '#e9eef5'; g.fillRect(x0, y, w, 12);
  g.fillStyle = '#d1dae6'; g.fillRect(x0, y + 7, w, 5);
  g.fillStyle = '#9aa7bd'; g.fillRect(x0, y + 10, w, 2);
  g.fillStyle = 'rgba(80,100,140,0.25)'; for (let x = x0 + 14; x < x0 + w - 4; x += 18) g.fillRect(x, y + 4, 1, 7);
  // the blue grip mat on top, with a textured weave and a lit edge
  g.fillStyle = '#2f7cc4'; g.fillRect(x0, y, w, 3.5);
  g.fillStyle = '#3f8fd6'; g.fillRect(x0, y, w, 2.4);
  g.fillStyle = 'rgba(255,255,255,0.35)'; for (let x = x0 + 1; x < x0 + w; x += 3) g.fillRect(x, y + 0.4, 1, 1);
  g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(x0, y, w, 0.8);
  // the nose (diving end) a bit brighter
  g.fillStyle = '#ffffff'; g.fillRect(s < 0 ? x0 : x0 + w - 3, y + 2.5, 3, 9);
  g.strokeStyle = '#8f9bb0'; g.lineWidth = 1; g.strokeRect(x0 + 0.5, y + 0.5, w - 1, 11);
  // the railing at the back half
  const rx = s * w * 0.45, mx = s * w * 0.22;
  for (const [lw, col] of [[3, '#6f7b93'], [1.8, '#c3ccda']]) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(0, y - 20); g.lineTo(rx, y - 20); g.lineTo(rx, y); g.moveTo(mx, y - 20); g.lineTo(mx, y); g.moveTo(0, y - 10); g.lineTo(rx, y - 10); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(0, y - 20.6); g.lineTo(rx, y - 20.6); g.stroke();
  for (const px of [rx, mx]) { g.fillStyle = '#8f9bb0'; g.fillRect(px - 2.5, y - 2, 5, 2); }
}
function diveDrawTower(st) {
  const [x0, x1] = DIVE.towerX, top = diveBoardY(10) - 6, yW = DIVE.waterY, t = G.clock, act = st.dv.h;
  // the pillar and ladders (one picture)
  rkPut('dvTower|' + Math.round(top) + '|' + yW, x0, top, x1 - x0 + 40, H - top + 10, 20, 10, g => { g.translate(-x0, -top); divePaintTower(g, top, yW); });
  // the height signs
  for (const h of DIVE.heights) {
    if (st.phase === 'podium') break;   // (hidden on the podium: the 3 m sign would peek out between Pip and Bo)
    const y = diveBoardY(h) + 18;
    const lab = (h === 7.5 ? '7.5' : String(h)) + ' m';
    ctx.font = '700 11px "Atkinson Hyperlegible", system-ui, sans-serif';
    const pw = Math.max(34, ctx.measureText(lab).width + 16);
    ctx.fillStyle = 'rgba(20,30,60,0.22)'; rr(480 - pw / 2 + 1, y - 6.5, pw, 16, 8); ctx.fill();
    ctx.fillStyle = h === act ? '#ffc53d' : '#2b3f63'; rr(480 - pw / 2, y - 8, pw, 16, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(480 - pw / 2 + 6, y - 7, pw - 12, 1.5);
    text(lab, 480, y + 0.5, 11, h === act ? C.ink : '#ffffff', 'center', 'body');
  }
  // the boards on both sides
  for (const h of DIVE.heights) for (const id of [0, 1]) diveDrawBoard(st, h, id, h === act);
  // the pennant on top: a made-up purple pennant with a yellow star (a shape and colours no real flag uses)
  const fx = 480, fy = top - 4;
  ctx.fillStyle = '#8f9bb0'; ctx.fillRect(fx - 1.5, fy - 44, 3, 44); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(fx - 1.5, fy - 44, 1, 44);
  const pen = i => { const u = i / 8; return { x: fx + 1.5 + i * 5.5, y: fy - 34 + Math.sin(t * 5 - i * 0.6) * (i * 0.4), hh: 9.5 * (1 - u) + 0.6 }; };
  ctx.fillStyle = '#8e6cff'; ctx.strokeStyle = '#5a3fc0'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = 0; i <= 8; i++) { const q = pen(i); if (i === 0) ctx.moveTo(q.x, q.y - q.hh); else ctx.lineTo(q.x, q.y - q.hh); }
  for (let i = 8; i >= 0; i--) { const q = pen(i); ctx.lineTo(q.x, q.y + q.hh); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  const sq = pen(2.6);
  ctx.fillStyle = '#ffd23f'; diveStarPath(sq.x, sq.y, 5.5, 2.4); ctx.fill();
  ctx.fillStyle = '#ffd23f'; circle(fx, fy - 46, 3); ctx.fill();
}
function diveDrawBoard(st, h, id, active) {
  const y = diveBoardY(h), tip = diveTipX(h, id), face = id === 0 ? DIVE.towerX[0] : DIVE.towerX[1], s = id === 0 ? -1 : 1;
  ctx.globalAlpha = active ? 1 : 0.82;
  if (h === 3) {
    // a springboard: a white board on a yellow roller (fulcrum) and a steel pedestal, bending at the tip
    const dip = active ? st.flex[id].y : 0;
    rkPut('dvSpringBase|' + id, face + s * 30, y + 4, 34, 30, 17, 10, g => {
      rkMetal(g, -5, 0, 10, 18, 1.5, '#5a6fa8', 2, { rivets: false, lw: 1.2 });
      rkMetal(g, -9, 15, 18, 5, 1.5, '#4a5d92', 3, { rivets: false, lw: 1 });
      rkRivet(g, -6, 17.5, 1, '#8f9bb0'); rkRivet(g, 6, 17.5, 1, '#8f9bb0');
      // the roller on its track
      g.fillStyle = '#3d4f80'; g.fillRect(s * 10 - 7, -1, 14, 3);
      g.fillStyle = '#c99a1e'; g.beginPath(); g.arc(s * 10, 1, 5.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffc53d'; g.beginPath(); g.arc(s * 10 - 0.6, 0.4, 4.4, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(s * 10 - 2, -1, 1.4, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#8a6a10'; g.lineWidth = 1; g.beginPath(); g.arc(s * 10, 1, 5.5, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#8a6a10'; g.beginPath(); g.arc(s * 10, 1, 1.4, 0, Math.PI * 2); g.fill();
    });
    ctx.lineCap = 'round';
    const bend = (dy, a, b) => { ctx.beginPath(); ctx.moveTo(face + s * a, y + dy); ctx.quadraticCurveTo(face + s * 60, y + dy, tip - s * b, y + dy + dip); };
    ctx.strokeStyle = '#8f9bb0'; ctx.lineWidth = 9; bend(1.4, 0, 0); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 7; bend(1, 0, 0); ctx.stroke();
    ctx.strokeStyle = '#d6dee9'; ctx.lineWidth = 2.6; bend(3.2, 2, 2); ctx.stroke();
    ctx.strokeStyle = '#2f7cc4'; ctx.lineWidth = 3; bend(-1.5, 6, 4); ctx.stroke();
    ctx.strokeStyle = '#5aa6e8'; ctx.lineWidth = 1.2; bend(-2.2, 7, 5); ctx.stroke();
    ctx.lineCap = 'butt';
    // the grip texture on the mat (dots)
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let k = 1; k < 9; k++) { const u = k / 9, a = 6 + (Math.abs(tip - face) - 10) * u; const bx = face + s * a, by = y - 1.5 + dip * u * u; ctx.fillRect(bx - 0.5, by - 0.5, 1, 1); }
  } else {
    rkPut('dvPlat|' + h + '|' + id, face, diveBoardY(h), 260, 70, 130, 26, g => divePaintPlatform(g, h, id));
  }
  ctx.globalAlpha = 1;
}
/* ---------- drawing: the divers, the water in front, the judges ---------- */
function diveDrawFront(st) {
  for (const d of st.d) diveDrawDiverAt(st, d);
  diveDrawWaterFront(st);
  diveDrawSplash(st);
  if (st.phase === 'podium') diveDrawPodium(st);
  else diveDrawJudges(st);
  for (const q of st.pops) {
    const a = clamp(Math.min(q.t / 0.12, (1.2 - q.t) / 0.3), 0, 1);
    ctx.save(); ctx.globalAlpha = a;
    bigText(q.s, q.x, q.y - q.t * 30, q.size * (hudBig() ? 1.3 : 1), q.col, 1 + 0.25 * Math.max(0, 1 - q.t / 0.15));   // (bigger on phones)
    ctx.restore();
  }
}
// a diver's pose from its state
function divePose(st, d) {
  const o = { ang: 0, twist: 0, tuck: 0, stretch: 0, arms: 'down', eyes: 'open', mouth: 'smile', armT: 0 };
  const t = G.clock;
  if (d.state === 'board') {
    if (st.phase === 'count') {
      if (st.dv.spring) { o.arms = d.hop > 4 ? 'up' : 'down'; o.tuck = d.hop < 2 && G.time > st.c0 - DIVE.beat ? 0.25 : 0; }
      else { o.arms = 'up'; o.armT = Math.sin(t * 6) * 0.1; }
    } else if (st.phase === 'ready' && st.ready[d.id]) { o.arms = 'up'; o.eyes = 'happy'; }
    else if (st.phase === 'judge' || st.phase === 'splash') o.arms = 'down';
    else { o.arms = 'down'; o.armT = Math.sin(t * 2 + d.id) * 0.15; }
  } else if (d.state === 'climb') {
    // (climb and swim use armT as a phase inside sin/cos; the walk's arms only swing a little)
    o.arms = d.pose === 'climb' ? 'climb' : d.pose === 'swim' ? 'swim' : 'down'; o.armT = o.arms === 'down' ? Math.sin(t * 9) * 0.3 : t * 9;
  } else if (d.state === 'air') {
    const c = d.cur;
    o.ang = d.ang; o.twist = d.twistA; o.tuck = d.tuck;
    if (c && c.type === 'twist') { o.arms = 'cross'; o.eyes = 'shut'; }
    else if (d.tuck > 0.4) { o.arms = 'hug'; o.eyes = 'shut'; }
    else if (c && c.type === 'flip') { o.arms = 'forward'; o.eyes = 'shut'; }
    else { o.arms = 'up'; o.stretch = clamp((G.time - d.lastEnd) / 0.25, 0, 1) * clamp((G.time - d.t0) / 0.3, 0, 1); }
  } else if (d.state === 'water') {
    if (d.kind === 'flop' && d.wt < 0.55) { o.ang = Math.PI / 2; o.arms = 'wide'; o.eyes = 'dizzy'; o.mouth = 'o'; }
    else if (d.wt < 0.6) { o.ang = d.kind === 'flop' ? d.flopAng || Math.PI : Math.PI; o.arms = d.kind === 'cannon' ? 'hug' : 'up'; o.tuck = d.kind === 'cannon' ? 1 : 0; }
    else {
      o.arms = 'swim'; o.armT = t * 6;
      o.eyes = d.kind === 'rip' ? 'happy' : d.kind === 'flop' ? (d.wt < 1.4 ? 'dizzy' : 'happy') : 'open';
      o.mouth = d.kind === 'flop' && d.wt < 1.4 ? 'o' : 'grin';
      if (st.phase === 'judge' && st.t > 1.9) { o.arms = 'wave'; o.eyes = 'happy'; }
    }
  } else if (d.state === 'podium') { o.arms = st.t > 0.8 ? 'wave' : 'up'; o.armT = st.t > 0.8 ? t * 8 : 0; o.eyes = 'happy'; o.mouth = 'grin'; o.medal = diveMedal(st.total); }
  return o;
}
function diveDrawDiverAt(st, d) {
  const o = divePose(st, d);
  ctx.save(); ctx.translate(d.x, d.y);
  if (d.id === 0) ctx.scale(-1, 1);   // Pip faces left: her diver is drawn mirrored
  // the lead's star in mirror dives (on the board)
  if (st.dv.mirror === d.id && (d.state === 'board' || d.state === 'climb') && st.phase !== 'judge') {
    ctx.save(); ctx.translate(0, -38 - Math.sin(G.clock * 4) * 2); ctx.rotate(G.clock); ctx.fillStyle = C.gold;
    diveStarPath(0, 0, 7, 3); ctx.fill(); ctx.restore();
  }
  if (st.helped && d.state === 'air') { ctx.fillStyle = 'rgba(255,197,61,0.25)'; circle(0, 0, 28); ctx.fill(); }
  ctx.scale(DIVE.S, DIVE.S);
  diveDrawDiver(d.id, o, true);
  ctx.restore();
}
function diveStarPath(x, y, ro, ri) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
// one diver at the origin (body centre), facing +x. o: ang (forward somersault), twist, tuck 0..1, stretch 0..1, arms, eyes, mouth
function diveDrawDiver(id, o, glow) {
  const col = PCOL[id], dark = PDARK[id];
  const w = PW * (1 + 0.14 * o.tuck - 0.12 * o.stretch), h = PH * (1 - 0.26 * o.tuck + 0.2 * o.stretch);
  ctx.save();
  ctx.rotate(o.ang || 0);
  const c = Math.cos(o.twist || 0), back = c < 0;
  ctx.scale(Math.sign(c || 1) * Math.max(0.18, Math.abs(c)), 1);
  const sh = { x: w * 0.36, y: -h * 0.1 };
  const arm = (sx, hx, hy) => {
    ctx.strokeStyle = dark; ctx.lineWidth = 4.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sh.y); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, sh.y); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = col; circle(hx, hy, 3.3); ctx.fill(); ctx.strokeStyle = dark; ctx.lineWidth = 1.5; circle(hx, hy, 3.3); ctx.stroke();
    ctx.lineCap = 'butt';
  };
  const a = o.armT || 0, hands = [];
  switch (o.arms) {
    case 'up': { const u = clamp(a, -0.5, 0.5); hands.push([-sh.x, -w * 0.26 + u * 6, -h / 2 - 12], [sh.x, w * 0.26 - u * 6, -h / 2 - 12]); break; }
    case 'forward': hands.push([-sh.x, w * 0.5 + 9, -2], [sh.x, w * 0.5 + 11, 3]); break;
    case 'wide': hands.push([-sh.x, -w / 2 - 13, -h * 0.3], [sh.x, w / 2 + 13, -h * 0.3]); break;
    case 'swim': hands.push([-sh.x, -w / 2 - 8 + Math.sin(a) * 4, -2 + Math.cos(a) * 3], [sh.x, w / 2 + 8 - Math.sin(a) * 4, -2 - Math.cos(a) * 3]); break;
    case 'climb': hands.push([-sh.x, -w * 0.3, -h / 2 - 8 + Math.sin(a) * 5], [sh.x, w * 0.3, -h / 2 - 8 - Math.sin(a) * 5]); break;
    case 'wave': hands.push([-sh.x, -w * 0.4, -h / 2 - 12], [sh.x, w * 0.42 + Math.sin(a) * 6, -h / 2 - 13]); break;
    default: break;
  }
  // ('up' and 'down' use armT as a small swing, never a phase: clamped so no pose can stretch the arms)
  if (o.arms === 'down') { const u = clamp(a, -0.5, 0.5); hands.push([-sh.x, -w / 2 - 3 + u * 3, h * 0.3], [sh.x, w / 2 + 3 - u * 3, h * 0.3]); }
  // arms behind the body for up / wave / climb, in front for the rest
  const behind = ['up', 'wave', 'climb'].includes(o.arms);
  if (behind) for (const [sx, hx, hy] of hands) arm(sx, hx, hy);
  // ears (Bo) behind the head
  if (id === 1) { ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 2; for (const ex of [-w / 2 + 4, w / 2 - 4]) { circle(ex, -h / 2 + 1, 5); ctx.fill(); ctx.stroke(); } }
  ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 2.5;
  // a soft white glow keeps the diver easy to see against the busy crowd
  if (glow) { ctx.save(); ctx.shadowColor = 'rgba(255,255,255,0.95)'; ctx.shadowBlur = 7; rr(-w / 2, -h / 2, w, h, 8); ctx.fill(); ctx.restore(); }
  rr(-w / 2, -h / 2, w, h, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(-w / 2 + 3, -h / 2 + 3, w * 0.35, h * 0.4, 5); ctx.fill();
  // swimsuit stripe
  ctx.fillStyle = id === 0 ? '#2ec4b6' : '#ffd23f'; ctx.fillRect(-w / 2 + 1.5, h * 0.2, w - 3, 4);
  if (id === 0) {
    ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.lineTo(1, -h / 2 - 6); ctx.stroke();
    ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(5, -h / 2 - 8, 6, 3, -0.5, 0, Math.PI * 2); ctx.fill();
  }
  // goggles pushed up on the forehead
  const gy = -h / 2 + 3.2;
  ctx.strokeStyle = 'rgba(28,26,54,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-w / 2 + 1, gy); ctx.lineTo(w / 2 - 1, gy); ctx.stroke();
  if (!back) {
    ctx.fillStyle = '#b8f0ff'; ctx.strokeStyle = 'rgba(28,26,54,0.75)'; ctx.lineWidth = 1;
    for (const gx of [-3, 5]) { ctx.beginPath(); ctx.ellipse(gx + 1, gy, 2.6, 1.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    // face
    const look = 2.5, ey = -h * 0.06;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    for (const ex of [-5, 5]) {
      const x = ex + look;
      if (o.eyes === 'shut') { ctx.beginPath(); ctx.moveTo(x - 3, ey - 2); ctx.lineTo(x, ey); ctx.lineTo(x - 3, ey + 2); ctx.stroke(); }
      else if (o.eyes === 'happy') { ctx.beginPath(); ctx.arc(x, ey + 1.5, 3, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      else if (o.eyes === 'dizzy') { ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, ey, 3, 0, Math.PI * 1.6); ctx.stroke(); ctx.lineWidth = 2; }
      else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x, ey, 3.4, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = C.ink; circle(x + 1.2, ey + 0.6, 1.9); ctx.fill(); }
    }
    ctx.fillStyle = 'rgba(255,120,140,0.45)'; circle(-8 + look * 0.5, ey + 6, 2.3); ctx.fill(); circle(8 + look * 0.5, ey + 6, 2.3); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6;
    if (o.mouth === 'o') { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(look, ey + 7, 2, 2.6, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (o.mouth === 'grin') { ctx.fillStyle = '#7a2238'; ctx.beginPath(); ctx.arc(look, ey + 5, 3.6, 0, Math.PI); ctx.closePath(); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(look, ey + 5, 2.6, 0.2, Math.PI - 0.2); ctx.stroke(); }
  }
  if (o.medal) {
    ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -h / 2 + 9); ctx.lineTo(0, h * 0.12); ctx.lineTo(6, -h / 2 + 9); ctx.stroke();
    ctx.fillStyle = o.medal[2]; ctx.strokeStyle = o.medal[3]; ctx.lineWidth = 1.5; circle(0, h * 0.2, 5); ctx.fill(); ctx.stroke();
  }
  if (!behind) for (const [sx, hx, hy] of hands) arm(sx, hx, hy);
  if (o.arms === 'hug') { arm(-sh.x, w * 0.18, h * 0.32); arm(sh.x, w * 0.36, h * 0.26); }
  if (o.arms === 'cross') { arm(-sh.x, w * 0.18, h * 0.16); arm(sh.x, -w * 0.14, h * 0.22); }
  ctx.restore();
}
function diveDrawWaterFront(st) {
  const y = DIVE.waterY, t = G.clock;
  ctx.fillStyle = 'rgba(40,150,215,0.62)'; ctx.fillRect(0, y + 2, W, H - y - 2);
  // the wavy surface
  ctx.fillStyle = 'rgba(210,245,255,0.85)';
  ctx.beginPath(); ctx.moveTo(0, y + 4);
  for (let x = 0; x <= W; x += 12) ctx.lineTo(x, y + Math.sin(x * 0.045 + t * 2.2) * 1.6);
  ctx.lineTo(W, y + 5); ctx.lineTo(0, y + 5); ctx.closePath(); ctx.fill();
  // ripples where somebody went in
  for (const r of st.rings) {
    const u = r.t / 1.2;
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - u)).toFixed(3) + ')'; ctx.lineWidth = 2.5 * (1 - u) + 0.5;
    ctx.beginPath(); ctx.ellipse(r.x, y + 2, r.r * (0.3 + u), 4 + 4 * u, 0, 0, Math.PI * 2); ctx.stroke();
  }
}
function diveDrawSplash(st) {
  for (const q of st.parts) {
    ctx.globalAlpha = clamp(q.life / q.max * 1.4, 0, 1);
    ctx.fillStyle = q.col; circle(q.x, q.y, q.size); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
// the judges' desk on the deck at the front: Pip's judge (an owl), the sync judge (a penguin), Bo's judge (a frog)
function diveDrawJudges(st) {
  const y0 = 500, t = G.clock, c = st.phase === 'judge' ? st.cards : null, up = st.cardUp || [];
  // the deck: wet white tiles with grout, a rounded lip, glints and a shadow on the water
  rkPut('dvDeck|' + y0, 352, y0 - 2, 264, H - y0 + 12, 4, 4, g => {
    const w = 256, h = H - y0 + 6;
    g.fillStyle = 'rgba(16,60,120,0.25)'; rkRR(g, -3, 3, w + 6, h, 10); g.fill();
    g.fillStyle = '#e9eef5'; rkRR(g, 0, 0, w, h, 8); g.fill();
    g.save(); rkRR(g, 0, 0, w, h, 8); g.clip();
    for (let x = 8, i = 0; x < w; x += 18, i++) for (let y = 4, j = 0; y < h; y += 18, j++) { g.fillStyle = (hash(i, j + 50) % 4) ? '#eef2f8' : '#e2e8f1'; g.fillRect(x, y, 17, 17); }
    g.fillStyle = '#c9d3e1'; for (let x = 8; x < w; x += 18) g.fillRect(x - 1, 2, 1, h); for (let y = 4; y < h; y += 18) g.fillRect(0, y - 1, w, 1);
    g.fillStyle = 'rgba(255,255,255,0.75)'; for (let k = 0; k < 10; k++) g.fillRect(10 + hash(k, 51) % (w - 20), 6 + hash(k, 52) % Math.max(4, h - 12), 3, 1.2);
    g.fillStyle = 'rgba(80,140,200,0.12)'; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(20 + hash(k, 53) % (w - 40), 10 + hash(k, 54) % Math.max(4, h - 20), 10, 3, 0, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, 3); g.fillStyle = '#b9c4d4'; g.fillRect(0, 3, w, 1);
    g.restore();
    g.strokeStyle = '#a9b6c9'; g.lineWidth = 1.5; rkRR(g, 0.75, 0.75, w - 1.5, h, 8); g.stroke();
  });
  const js = [{ x: 418, kind: 'owl', col: C.pip, card: c && up[0] ? c.D[0] : null }, { x: 480, kind: 'penguin', col: C.gold, card: c && up[2] ? c.S : null, big: true },
    { x: 542, kind: 'frog', col: C.bo, card: c && up[1] ? c.D[1] : null }];
  for (const j of js) {
    const bob = Math.sin(t * 2 + j.x) * 1, hy = y0 - 4 + bob;
    diveDrawJudge(j.kind, j.x, hy, j.col, t);
    if (j.card != null) {
      const cw = j.big ? 40 : 34, ch = j.big ? 30 : 26, cy = hy - 46;
      ctx.strokeStyle = '#6b4630'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(j.x + 10, hy - 6); ctx.lineTo(j.x + 4, cy + ch / 2); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = j.col; ctx.lineWidth = j.big ? 3 : 2.5; rr(j.x - cw / 2, cy - ch / 2, cw, ch, 5); ctx.fill(); ctx.stroke();
      text(j.card % 1 ? j.card.toFixed(1) : String(j.card), j.x, cy + 1, j.big ? 18 : 15, C.ink, 'center');
    }
  }
  // the desk: a navy top with a lit edge and screws, a white skirted front with folds, the three judges' colours and
  // a little brass plaque
  rkPut('dvDesk|' + y0, 372, y0 + 6, 224, H - y0, 4, 2, g => {
    g.fillStyle = 'rgba(20,30,60,0.2)'; g.fillRect(10, 12, 200, H - y0 - 14);
    g.fillStyle = '#ffffff'; g.fillRect(8, 12, 200, H - y0 - 18);
    g.save(); g.beginPath(); g.rect(8, 12, 200, H - y0 - 18); g.clip();
    for (let x = 8; x < 208; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, 'rgba(140,160,200,0.18)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(140,160,200,0.1)'); g.fillStyle = gr; g.fillRect(x, 12, 16, H); }
    const stripes = ['#ff6b4a', '#ffc53d', '#5b95ff'];
    stripes.forEach((s, k) => { g.fillStyle = s; g.fillRect(8 + k * 66.7, 12, 66.7, 5); g.fillStyle = shade(s, 0.2); g.fillRect(8 + k * 66.7, 16, 66.7, 1.2); });
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(8, 12, 200, 1);
    g.restore();
    g.strokeStyle = '#b9c4d4'; g.lineWidth = 1; g.strokeRect(8.5, 12.5, 199, H - y0);
    rkMetal(g, 0, 0, 216, 12, 4, '#2b3f63', 7, { rivets: false, lw: 1.5 });
    for (const sx of [10, 108, 206]) rkRivet(g, sx, 6, 1.4, '#8f9bb0');
  });
  text('JUDGES', 480, y0 + 31, 11, '#2b3f63', 'center');
  if (c && st.added) {
    ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
    const s = 'Dive ' + (st.k + 1) + ': ' + c.score.toFixed(1) + ' points', w = ctx.measureText(s).width + 26;
    ctx.globalAlpha = clamp((st.t - 1.9) / 0.2, 0, 1);
    pill(480, 402, w, 24, 'center'); text(s, 480, 414.5, 13, C.gold, 'center', 'body');
    ctx.globalAlpha = 1;
  }
}
function diveDrawJudge(kind, x, y, col, t) {
  ctx.save(); ctx.translate(x, y);
  if (kind === 'owl') {
    ctx.fillStyle = '#9a6a3e'; rr(-14, -26, 28, 32, 12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-12, -24); ctx.lineTo(-9, -34); ctx.lineTo(-4, -25); ctx.fill(); ctx.beginPath(); ctx.moveTo(12, -24); ctx.lineTo(9, -34); ctx.lineTo(4, -25); ctx.fill();
    ctx.fillStyle = '#e8c9a0'; ctx.beginPath(); ctx.ellipse(0, -2, 9, 8, 0, 0, Math.PI * 2); ctx.fill();
    for (const ex of [-6, 6]) { ctx.fillStyle = '#fff'; circle(ex, -16, 5.5); ctx.fill(); ctx.fillStyle = C.ink; circle(ex, -16, 2.4); ctx.fill(); }
    ctx.fillStyle = '#ffc53d'; ctx.beginPath(); ctx.moveTo(-2.5, -11); ctx.lineTo(2.5, -11); ctx.lineTo(0, -7); ctx.closePath(); ctx.fill();
  } else if (kind === 'penguin') {
    ctx.fillStyle = '#26304d'; rr(-15, -30, 30, 36, 14); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, -8, 10, 13, 0, 0, Math.PI * 2); ctx.fill();
    for (const ex of [-5, 5]) { ctx.fillStyle = '#fff'; circle(ex, -20, 3.6); ctx.fill(); ctx.fillStyle = C.ink; circle(ex + 0.5, -20, 1.8); ctx.fill(); }
    ctx.fillStyle = '#ff9f1c'; ctx.beginPath(); ctx.moveTo(-3, -16); ctx.lineTo(3, -16); ctx.lineTo(0, -12); ctx.closePath(); ctx.fill();
    // a little top hat for the head judge
    ctx.fillStyle = C.ink; ctx.fillRect(-9, -33, 18, 3); ctx.fillRect(-6, -43, 12, 11); ctx.fillStyle = C.gold; ctx.fillRect(-6, -36, 12, 2.5);
  } else {
    ctx.fillStyle = '#5bd16f'; rr(-15, -22, 30, 28, 12); ctx.fill();
    for (const ex of [-7, 7]) { ctx.fillStyle = '#5bd16f'; circle(ex, -22, 6.5); ctx.fill(); ctx.fillStyle = '#fff'; circle(ex, -22, 4.5); ctx.fill(); ctx.fillStyle = C.ink; circle(ex, -21.5, 2.2); ctx.fill(); }
    ctx.strokeStyle = '#2f7a3e'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, -12, 6, 0.2, Math.PI - 0.2); ctx.stroke();
    // round glasses
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; circle(-7, -22, 5); ctx.stroke(); circle(7, -22, 5); ctx.stroke();
  }
  // the scarf in the colour of the diver this judge watches (gold: the sync judge)
  ctx.fillStyle = col; rr(-13, 0, 26, 6, 3); ctx.fill();
  ctx.restore();
}
function diveDrawPodium(st) {
  const u = clamp(st.t / 0.6, 0, 1), top = diveLerp(H + 10, 412, diveEase(u)), m = diveMedal(st.total);
  ctx.fillStyle = '#e9eef5'; rr(352, 498, 256, 50, 8); ctx.fill();
  ctx.fillStyle = m[2]; rr(430, top, 100, H - top + 10, 8); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(436, top + 6, 88, 5);
  ctx.strokeStyle = m[3]; ctx.lineWidth = 3; rr(430, top, 100, H - top + 10, 8); ctx.stroke();
  text('1', 480, top + 50, 34, '#ffffff', 'center');
  if (st.t > 0.8) {
    const a = clamp((st.t - 0.8) / 0.3, 0, 1), sc = 0.7 + 0.3 * diveEase(a) + 0.04 * Math.sin(G.clock * 5);
    ctx.save(); ctx.globalAlpha = a;
    // a soft dark glow behind the medal and the words, so they read over the busy stands
    const gl = ctx.createRadialGradient(480, 270, 20, 480, 270, 230);
    gl.addColorStop(0, 'rgba(28,26,54,0.55)'); gl.addColorStop(1, 'rgba(28,26,54,0)');
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    // a big medal and the words
    ctx.translate(480, 250); ctx.scale(sc, sc);
    ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-26, -78); ctx.lineTo(0, -30); ctx.lineTo(26, -78); ctx.stroke();
    ctx.fillStyle = m[2]; ctx.strokeStyle = m[3]; ctx.lineWidth = 4; circle(0, -6, 30); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; diveStarPath(0, -6, 16, 7); ctx.fill();
    bigText(m[0].toUpperCase() + ' MEDAL!', 0, 56, 40, m[2]);
    bigText(st.total.toFixed(1) + ' points', 0, 92, 22, '#ffffff');
    ctx.restore();
  }
}

/* ---------- HUD: the call card, the score, each diver's panel, prompts over the heads ---------- */
function diveIcon(type, x, y, r, col, fill) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = fill || 'rgba(255,255,255,0.12)'; circle(0, 0, r); ctx.fill();
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(2, r * 0.18); ctx.lineCap = 'round';
  if (type === 'flip') {
    ctx.beginPath(); ctx.arc(0, 0, r * 0.55, -Math.PI * 0.35, Math.PI * 1.35); ctx.stroke();
    const a = -Math.PI * 0.35, ax = Math.cos(a) * r * 0.55, ay = Math.sin(a) * r * 0.55;
    ctx.beginPath(); ctx.moveTo(ax + r * 0.32, ay - r * 0.02); ctx.lineTo(ax - r * 0.06, ay - r * 0.3); ctx.lineTo(ax - r * 0.08, ay + r * 0.22); ctx.closePath(); ctx.fill();
  } else if (type === 'twist') {
    ctx.beginPath(); ctx.moveTo(0, -r * 0.62); ctx.lineTo(0, r * 0.62); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.6, r * 0.26, 0, Math.PI * 0.15, Math.PI * 1.85); ctx.stroke();
    const ax = Math.cos(Math.PI * 0.15) * r * 0.6, ay = Math.sin(Math.PI * 0.15) * r * 0.26;
    ctx.beginPath(); ctx.moveTo(ax + r * 0.1, ay - r * 0.24); ctx.lineTo(ax + r * 0.18, ay + r * 0.2); ctx.lineTo(ax - r * 0.24, ay + r * 0.06); ctx.closePath(); ctx.fill();
  } else {
    text('?', 0, 1, r * 1.1, col, 'center');
  }
  ctx.lineCap = 'butt';
  ctx.restore();
}
// text in several colours on one line: parts = [[text, colour], ...]
function diveRich(parts, x, y, size, align, font) {
  const f = (font === 'display' ? '' : '700 ') + size + 'px ' + (font === 'display' ? '"Lilita One", "Arial Rounded MT Bold", sans-serif' : '"Atkinson Hyperlegible", system-ui, sans-serif');
  ctx.font = f;
  const w = parts.reduce((s, p) => s + ctx.measureText(p[0]).width, 0);
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for (const [s, col] of parts) { ctx.fillStyle = col; ctx.fillText(s, cx, y); cx += ctx.measureText(s).width; }
  return w;
}
function diveBoardName(dv) { return (dv.h === 7.5 ? '7.5' : dv.h) + ' m ' + (dv.spring ? 'springboard' : 'platform'); }
function diveHud(st) {
  const big = hudBig(), z = big ? 1.4 : 1, dv = st.dv, t = G.clock, play = G.mode === 'play' || G.mode === 'paused';
  // top right: the score
  {
    const fs = big ? 20 : 15, h = big ? 40 : 28, s = st.shown.toFixed(1);
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(s).width + fs * 1.6 + 30, x0 = pill(W - 14, 12, w, h, 'right');
    ctx.fillStyle = C.gold; diveStarPath(x0 + 15 + fs * 0.5, 12 + h / 2, fs * 0.55, fs * 0.24); ctx.fill();
    text(s, x0 + 15 + fs * 1.3, 12 + h / 2 + 0.5, fs, C.paper, 'left', 'body');
  }
  if (st.phase === 'podium') return;
  // the call card (top centre): in full while you get ready, small while you dive and the judges score
  const compact = st.phase === 'count' || st.phase === 'splash' || st.phase === 'judge';
  {
    const zc = big ? 1.25 : 1, cw = Math.round((compact ? 250 : 296) * zc), ch = Math.round((compact ? 40 : 76) * zc), cx = W / 2, cy = big ? 50 : 48;
    st.cardBox = { x0: cx - cw / 2, x1: cx + cw / 2, y0: cy, y1: cy + ch };
    const pop = st.phase === 'climb' ? diveEase(clamp(st.t / 0.35, 0, 1)) : 1;
    ctx.save(); ctx.translate(cx, cy + ch / 2); ctx.scale(0.85 + 0.15 * pop, 0.85 + 0.15 * pop); ctx.globalAlpha = 0.4 + 0.6 * pop;
    ctx.fillStyle = '#1c1a36'; rr(-cw / 2, -ch / 2, cw, ch, 14 * zc); ctx.fill();
    ctx.strokeStyle = st.helped ? C.gold : 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2.5; rr(-cw / 2, -ch / 2, cw, ch, 14 * zc); ctx.stroke();
    if (compact) {
      const n = dv.mirror != null ? dv.max : dv.call.length, gap = 27 * zc, x0 = -cw / 2 + 22 * zc;
      if (dv.mirror != null) {
        text('MIRROR', x0 - 10 * zc, 0.5, 14 * zc, C.paper, 'left');
        for (let i = 0; i < n; i++) diveIcon('?', x0 + 62 * zc + i * gap, 0, 10 * zc, C.gold);
      } else dv.call.forEach((m, i) => diveIcon(m, x0 + i * gap, 0, 11 * zc, C.paper, 'rgba(255,255,255,0.14)'));
      text('Dive ' + (st.k + 1) + '/' + st.dives.length + ' · ×' + dv.dd.toFixed(1), cw / 2 - 12 * zc, 0.5, 12 * zc, C.gold, 'right', 'body');
    } else {
      text('Dive ' + (st.k + 1) + ' of ' + st.dives.length + ' · ' + diveBoardName(dv), -cw / 2 + 14 * zc, -ch / 2 + 14 * zc, 12 * zc, C.gold, 'left', 'body');
      text('×' + dv.dd.toFixed(1), cw / 2 - 14 * zc, -ch / 2 + 14 * zc, 12 * zc, '#d9d3ef', 'right', 'body');
      const ry = -ch / 2 + 46 * zc;
      if (dv.mirror != null) {
        const L = dv.mirror, F = 1 - L;
        text('MIRROR DIVE', -cw / 2 + 14 * zc, ry - 8 * zc, 17 * zc, C.paper, 'left');
        diveRich([[NAMES[L], PCOL[L]], [' picks up to ' + dv.max + ', ', '#d9d3ef'], [NAMES[F], PCOL[F]], [' copies!', '#d9d3ef']], -cw / 2 + 14 * zc, ry + 13 * zc, 12 * zc, 'left');
        for (let i = 0; i < dv.max; i++) diveIcon('?', cw / 2 - 22 * zc - (dv.max - 1 - i) * 30 * zc, ry - 2 * zc, 12 * zc, C.gold);
      } else {
        const gap = 32 * zc, x0 = -cw / 2 + 28 * zc;
        dv.call.forEach((m, i) => diveIcon(m, x0 + i * gap, ry - 4 * zc, 13 * zc, C.paper, 'rgba(255,255,255,0.14)'));
        text(dv.title, cw / 2 - 14 * zc, ry - 4 * zc, 15 * zc, C.paper, 'right');
        const counts = { flip: 0, twist: 0 }; dv.call.forEach(m => counts[m]++);
        const words = [counts.flip ? counts.flip + (counts.flip > 1 ? ' flips' : ' flip') : '', counts.twist ? counts.twist + (counts.twist > 1 ? ' twists' : ' twist') : ''].filter(Boolean).join(' + ');
        text(words + ', then straight in!', -cw / 2 + 14 * zc, ry + 19 * zc, 11 * zc, '#d9d3ef', 'left', 'body');
      }
    }
    if (st.helped && !compact) {
      // a gold badge on the card's bottom edge: this dive has the help
      const s = '★ Gold air time +' + DIVE.helpAir + ' s', fs = 11 * zc;
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const bw = ctx.measureText(s).width + 20 * zc, bh = 18 * zc;
      ctx.fillStyle = '#1c1a36'; rr(-bw / 2, ch / 2 - bh / 2, bw, bh, bh / 2); ctx.fill();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(-bw / 2, ch / 2 - bh / 2, bw, bh, bh / 2); ctx.stroke();
      text(s, 0, ch / 2 + 0.5, fs, C.gold, 'center', 'body');
    }
    ctx.restore();
  }
  // the message line (gold help), under the card
  if (st.msg) {
    const fs = big ? 17 : 13, hgt = big ? 30 : 24;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(st.msg.text).width + 28, y = st.cardBox.y1 + (st.helped && !compact ? 22 : 10);
    ctx.globalAlpha = clamp((st.msg.life - st.msg.t) / 0.3, 0, 1);
    pill(W / 2, y, w, hgt, 'center'); text(st.msg.text, W / 2, y + hgt / 2 + 0.5, fs, st.msg.col, 'center', 'body'); ctx.globalAlpha = 1;
  }
  if (!play) return;
  // the count: 3, 2, 1, GO! over the tower
  if (st.phase === 'count' && st.c0 != null) {
    const now = G.time, n = Math.floor((now - st.c0) / DIVE.beat), f = ((now - st.c0) / DIVE.beat) - n, by0 = diveBoardY(dv.h), by = by0 - 64 > 160 * z ? by0 - 64 : by0 + 70;
    if (now < st.c0) { ctx.globalAlpha = 0.9; bigText('Ready…', W / 2, by, 26 * z, C.paper); ctx.globalAlpha = 1; }
    else if (n <= 2) bigText(String(3 - n), W / 2, by, 52 * z, C.paper, 1 + 0.4 * Math.pow(1 - Math.min(1, f * 3), 2));
    else if (n <= 4) { ctx.globalAlpha = clamp(1 - (now - diveGo(st) - 0.5) / 0.4, 0, 1); bigText('GO!', W / 2, by, 58 * z, C.gold, 1 + 0.3 * Math.pow(1 - Math.min(1, f * 3), 2)); ctx.globalAlpha = 1; }
  }
  // each diver's panel, bottom corners: Pip's on the left, Bo's on the right
  for (const id of [0, 1]) diveDrawPanel(st, id, z);
  if (G.introT > 0) return;
  diveDrawPrompts(st, z);
}
// body text that shrinks to fit maxW (the panel's small text is bigger on phones, where room is tight)
function diveFit(str, x, y, size, maxW, col, align) {
  ctx.font = '700 ' + size + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(str).width;
  text(str, x, y, w > maxW ? Math.max(8, size * maxW / w) : size, col, align, 'body');
}
function diveDrawPanel(st, id, z) {
  const d = st.d[id], dv = st.dv, t = G.clock, quiet = diveQuiet(id), big = z > 1;
  // small text: bigger on phones (fitted to the room it has, so nothing overlaps)
  const fz = big ? z * 1.3 : z;
  const pw = Math.round((big ? 232 : 226) * z), ph = Math.round(58 * z), py = H - ph - 10, px = id === 0 ? 12 : W - 12 - pw;
  ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
  ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
  const lead = dv.mirror === id, copy = dv.mirror === 1 - id;
  const name = NAMES[id] + (quiet ? ' (computer)' : '');
  text(name, px + 12 * z, py + 14 * z, 15 * z, PCOL[id], 'left');
  const topRoom = pw - 24 * z - ctx.measureText(name).width - (big ? 14 : 10) * z;   // (text() left ctx.font set to the name's font)
  // the right side of the top row: the job or the keys
  const job = lead ? ['★ You lead', C.gold] : copy ? ['Copy ' + NAMES[1 - id] + '!', PCOL[1 - id]] : null;
  if (!quiet) diveFit(diveKey(id, 'jump') + ' flip · ' + diveKey(id, 'lr') + ' twist · ' + diveKey(id, 'down') + ' tuck', px + pw - 12 * z, py + 14 * z, 11 * fz, topRoom, '#d9d3ef', 'right');
  else if (job) diveFit(job[0], px + pw - 12 * z, py + 14 * z, 12 * fz, topRoom, job[1], 'right');
  // the bottom row: the moves (done against the call), or what to do now
  const ry = py + 38 * z, r = 10 * z;
  if (st.phase === 'judge' && st.cards) {
    const kind = st.cards.kinds[id];
    text(DIVE.entryWord[kind] + (st.cardUp && st.cardUp[id] ? '  ' + st.cards.D[id].toFixed(1) : ''), px + 12 * z, ry, 15 * z, kind === 'rip' ? '#8fe3b0' : '#ffe28a', 'left');
    return;
  }
  if (st.phase === 'ready' || st.phase === 'climb') {
    if (st.ready[id]) text('Ready! ✓', px + 12 * z, ry, 15 * z, '#8fe3b0', 'left');
    else if (st.phase === 'ready' && st.t >= DIVE.cardT) {
      const s = quiet ? 'Getting ready…' : 'Press ' + diveKey(id, 'jump') + ' when ready';
      text(s, px + 12 * z, ry, 15 * z, Math.sin(t * 6) > -0.2 || quiet ? C.gold : '#d9a52a', 'left');
    } else text(st.phase === 'climb' ? 'Climbing up…' : 'Read the card!', px + 12 * z, ry, 14 * z, '#d9d3ef', 'left');
    return;
  }
  // count / air / splash: the target moves as icons, each lit when done right
  const target = dv.mirror != null ? (lead ? null : st.d[1 - id].moves.map(m => m.type)) : dv.call;
  const done = d.moves;
  let x = px + 12 * z + r;
  const n = target ? Math.max(target.length, done.length) : Math.max(done.length, dv.max);
  for (let i = 0; i < Math.min(n, 6); i++) {
    const want = target ? target[i] : null, got = done[i];
    let col = 'rgba(246,239,223,0.55)', fill = 'rgba(255,255,255,0.08)', type = want || (got ? got.type : '?');
    if (got) {
      type = got.type;
      const ok = target ? want === got.type : i < dv.max;
      col = ok ? C.ink : '#ffffff'; fill = ok ? (got.e != null || d.state !== 'air' ? '#8fe3b0' : C.gold) : '#ff8a8a';
    }
    diveIcon(type, x, ry, r, col, fill);
    x += r * 2 + 6 * z;
  }
  const botRoom = px + pw - 12 * z - (x - r) - 4 * z;   // (right of the last icon)
  if (d.state === 'board' && st.phase === 'count') {
    const now = G.time, go = diveGo(st);
    const s = now >= go - DIVE.goWin ? (quiet ? 'GO!' : diveKey(id, 'jump') + ' GO!') : dv.spring && !quiet ? diveKey(id, 'jump') + ' bounce on the beat' : 'Wait for GO…';
    diveFit(s, px + pw - 12 * z, ry, 13 * fz, botRoom, now >= go - DIVE.goWin ? C.gold : '#d9d3ef', 'right');
  } else if (job && !quiet) diveFit(job[0], px + pw - 12 * z, ry, 13 * fz, botRoom, job[1], 'right');
  else if (dv.spring && d.bounce > 0) diveFit('Bounce ' + '●'.repeat(d.bounce) + '○'.repeat(DIVE.maxBounce - d.bounce), px + pw - 12 * z, ry, 12 * fz, botRoom, C.gold, 'right');
}
// prompts over the heads: Pip's open to the left, Bo's to the right, so they never cover each other or the card
function diveDrawPrompts(st, z) {
  const fs = 14 * z, t = G.clock;
  const say = (d, str, col, pulse) => {
    if (diveQuiet(d.id)) return;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 20 * z, h = fs + 12 * z, hx = d.x, y = clamp(d.y - diveHalfH() - 18 * z - h, 4, H - h - 80);
    let x = d.id === 0 ? hx + 16 * z - w : hx - 16 * z;
    // (never over the call card: slide outward, away from it)
    const cb = st.cardBox;
    if (cb && y < cb.y1 + 4 && y + h > cb.y0 - 4) x = d.id === 0 ? Math.min(x, cb.x0 - w - 6) : Math.max(x, cb.x1 + 6);
    x = clamp(x, 4, W - w - 4);
    const s = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
    text(str, 0, 0.5, fs, col, 'center', 'body');
    ctx.restore();
  };
  for (const d of st.d) {
    if (st.phase === 'ready' && st.t >= DIVE.cardT && !st.ready[d.id]) say(d, diveKey(d.id, 'jump') + ' Ready?', C.gold, true);
    else if (st.phase === 'ready' && st.ready[d.id] && !st.ready[1 - d.id] && st.waitT > 2.5) say(d, 'Waiting for ' + NAMES[1 - d.id] + '…', '#d9d3ef', false);
    else if (st.phase === 'count' && d.state === 'board' && G.time >= diveGo(st) - DIVE.goWin) say(d, diveKey(d.id, 'jump') + ' GO!', C.gold, true);
    else if (st.phase === 'count' && d.state === 'board' && st.dv.spring && st.k === 0 && d.bounce === 0) say(d, diveKey(d.id, 'jump') + ' on the beat: bounce!', '#ffffff', false);
    else if (st.phase === 'count' && d.state === 'air' && d.tuck > 0.4 && G.time > d.t0 + d.T - 0.45 && !(d.cur && d.cur.type === 'flip')) say(d, 'Let go of ' + diveKey(d.id, 'down') + '!', '#ff9a9a', true);
  }
}

/* ---------- sounds ---------- */
Sfx.extra.diveReady = function (p) { this.tone(660 * p, 0.08, 'triangle', 0.05); this.tone(990 * p, 0.1, 'triangle', 0.045, null, 0.06); };
Sfx.extra.diveBeep = function () { this.tone(740, 0.09, 'square', 0.035); };
Sfx.extra.diveGo = function () { this.tone(2100, 0.28, 'sine', 0.06, 2350); this.tone(1050, 0.2, 'square', 0.025, null, 0.02); };
Sfx.extra.diveBoing = function (p) { this.tone(140 * p, 0.24, 'sine', 0.09, 430 * p); };
Sfx.extra.diveJump = function (p) { this.tone(260 * p, 0.2, 'sine', 0.07, 700 * p); this.tone(520 * p, 0.08, 'triangle', 0.025, null, 0.03); };
Sfx.extra.diveSlip = function (p) { this.tone(600 * p, 0.35, 'sine', 0.05, 200 * p); };
Sfx.extra.diveFlip = function (p) { this.tone(360 * p, 0.14, 'sawtooth', 0.016, 760 * p); this.tone(900 * p, 0.05, 'triangle', 0.02, null, 0.08); };
Sfx.extra.diveTwist = function (p) { this.tone(1000 * p, 0.16, 'triangle', 0.03, 520 * p); this.tone(1400 * p, 0.06, 'sine', 0.015, null, 0.06); };
Sfx.extra.diveRip = function () { this.tone(1700, 0.07, 'sine', 0.04, 500); this.tone(420, 0.12, 'triangle', 0.035, 160, 0.02); };
Sfx.extra.diveSplash = function () { this.tone(900, 0.25, 'sawtooth', 0.018, 160); };
Sfx.extra.diveSploosh = function () { this.play('splash'); this.tone(180, 0.45, 'sawtooth', 0.04, 60, 0.02); this.tone(700, 0.3, 'square', 0.012, 90, 0.05); };
Sfx.extra.diveCannon = function () { this.tone(110, 0.5, 'sine', 0.11, 40); this.tone(820, 0.32, 'sawtooth', 0.02, 120, 0.03); };
Sfx.extra.divePop = function (p) { this.tone(240 * p, 0.1, 'sine', 0.06, 720 * p); };
Sfx.extra.diveCard = function () { this.tone(1250, 0.04, 'square', 0.03); this.tone(1870, 0.06, 'triangle', 0.03, null, 0.03); };
Sfx.extra.diveClap = function () { for (let i = 0; i < 8; i++) this.tone(1800 + (i % 3) * 300, 0.03, 'square', 0.014, 900, i * 0.07); };
Sfx.extra.diveCheer = function () { this.play('diveClap'); [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.05, null, 0.05 + i * 0.07)); this.tone(300, 0.6, 'sawtooth', 0.012, 420, 0.05); };
Sfx.extra.diveHelp = function () { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.045, null, i * 0.06)); };
Sfx.extra.diveMedal = function () { [523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.2, 'square', 0.04, null, i * 0.13)); this.tone(1319, 0.6, 'triangle', 0.05, null, 0.8); };
/* ===== end of MODES.dive ===== */
