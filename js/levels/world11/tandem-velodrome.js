/* Pip & Bo - Level 11-2 Tandem Velodrome (team, World 11 Summer Games). */
'use strict';

/* ===== 11-2 Tandem Velodrome (mode 'tandem', team) =====
   Pip and Bo ride ONE tandem bike round a banked wooden velodrome, seen from above (the whole oval fits on screen, so
   the rival bikes are always in view). The mode owns the tick, the picture and the HUD (def.ownStep + def.ownHUD); the
   engine grid is empty apart from the two spawns.
   The PEDALER (back seat, the stoker) presses ◀ and ▶ in turn on the drum beat: a press on the beat pushes hard
   ("Perfect!" / "Good"), an off-beat press much less, the same foot twice half, and extra presses in one beat nothing
   (so mashing is slow). The LEANER (front seat, the captain) holds ▲ to lean in and ▼ to straighten: the bank needs a
   lean that grows in the turns and with speed (the gold wedge on the lean gauge and the dashed line in the Tandem
   Cam). Too little lean slides the bike up the bank to the rail, where it wobbles to a stop and leans there until the
   leaner leans in; too much slides it down onto the blue apron, which is slow (and slower still while the lean stays
   far too deep, so holding ▲ all race is no shortcut). Nobody gets hurt: a wobble is a
   cartoon "Wobble!". So an idle pedaler means no speed and an idle leaner means a stop at the first turn's rail.
   Four races, roles swap every race (Pip pedals races 1 and 3, Bo races 2 and 4):
     1 Warm-up Laps (2 rivals)   2 Draft Line (ride behind a bike: less drag)   3 Sprint Finish (bell lap: the drum
     speeds up)   4 Keirin Final (a pace bike leads, nobody may pass it; it pulls off, then sprint).
   Scored by place, not time (noTime): 1st 3 points, 2nd 2, 3rd 1. A medal per race and one for the level.
   Gold help (announced): Steady wheels (a wider lean wedge and a slower slide after 2 rail wobbles or 6 trips onto the
   apron in a race),
   Big drum (wider beat windows, and one missed beat is forgiven, after 12 off-beat pedals), Tailwind (25% more speed
   for the rest of the race once the bike is 0.12 lap behind every rival, after the first lap).
   Room def: { title, tip, ped: 0|1, laps, rivals: [{ team, v, pos, p }], us: { pos, p }, sprint, pacer: { pullAt } }.
   Every global is prefixed tandem / TANDEM (and Sfx.extra.tandem*); all state lives in G.mst. */
const TANDEM = {
  XA: 250, XB: 710, CY: 285, R: 140, TW: 66, apron: 12, railPad: 6,   // the oval: straights x XA..XB, turn radius R
  FIN: 330,                                    // the finish line (s along the lap, on the home straight at the bottom)
  vRef: 320, vMax: 430, tau: 1.4, kick: 6,     // pedal power 1 at the normal beat rides at vRef px/s (reached with time constant tau)
  powerK: 0.35, missAfter: 1.6, missAfterHelp: 2.2, missFade: 0.7, // each press moves the power toward its grade; after 1.6 beats with no press it fades
  scrub: 0.15, scrubAt: 0.5,                   // leaning outside the wedge scrubs off up to 15% of the speed (fully 0.5 outside)
  P: 0.55, Psprint: 0.43, count: 4,            // drum beat (s), the bell-lap sprint beat; beats in the start count
  perfect: 0.07, good: 0.15, bigDrum: 1.45,    // beat windows (s) for Perfect and Good; the Big drum widens them
  qPerfect: 1, qGood: 0.85, qOff: 0.3, qFoot: 0.55,
  leanRate: 2.6, leanMax: 1.4, needMin: 0.3, needCap: 1.3,           // lean units: 1 = the lean the turns need at 320 px/s
  tol: 0.18, tolHelp: 0.29, drift: 2.8, driftHelp: 0.6, home: 0.6, line: 0.32,       // within tol: back to the racing line, else drift
  rampIn: 80, rampLen: 220,                    // the bank's lean ramps in from 80 px before a turn, over 220 px
  railDecel: 520, railExit: 0.3, apronMul: 0.62, apronHome: 1.8, apronScrub: 0.45, wobT: 0.6,
  draftMul: 1.18, draftNear: 16, draftFar: 120, draftLat: 0.3,
  finishWait: 3.2, podiumT: 3.6, helpRails: 2, helpAprons: 6, helpOff: 12, windBehind: 0.12, windMul: 1.25,
  pts: [3, 2, 1, 0],
};
TANDEM.S1 = TANDEM.XB - TANDEM.XA; TANDEM.S2 = TANDEM.S1 + Math.PI * TANDEM.R; TANDEM.S3 = TANDEM.S2 + TANDEM.S1;
TANDEM.LAP = TANDEM.S3 + Math.PI * TANDEM.R;
TANDEM.rIn = TANDEM.R - TANDEM.TW / 2; TANDEM.rOut = TANDEM.R + TANDEM.TW / 2;
// the made-up rival teams (and the keirin pace bike's rider)
const TANDEM_TEAMS = [
  { name: 'Teal Toucans', short: 'Toucans', col: '#19b3a6', dark: '#0b6b63', kind: 'toucan', skin: '#2a2f4f' },
  { name: 'Lime Lizards', short: 'Lizards', col: '#8fd14f', dark: '#4f8a22', kind: 'lizard', skin: '#7cc94a' },
  { name: 'Plum Pandas', short: 'Pandas', col: '#9b6fd6', dark: '#5d3d96', kind: 'panda', skin: '#ffffff' },
  { name: 'Rose Rabbits', short: 'Rabbits', col: '#ff7fb0', dark: '#b8406e', kind: 'rabbit', skin: '#ffd9e6' },
];
const TANDEM_MEDAL = [['Gold', '#ffc53d', '#b9850f'], ['Silver', '#d9dde8', '#8a90a6'], ['Bronze', '#e09a5a', '#8f5426'], ['Ribbon', '#7fd0ff', '#2f7fb8']];
const tandemOrd = n => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
const tandemSmooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const tandemWrap = s => ((s % TANDEM.LAP) + TANDEM.LAP) % TANDEM.LAP;

/* ---------- the track ---------- */
// lateral position on the boards: 0 = just above the apron, 1 = at the rail (below 0 = on the blue apron)
const tandemRad = pos => TANDEM.rIn + TANDEM.apron + pos * (TANDEM.TW - TANDEM.apron - TANDEM.railPad);
// a point on the track (s along the lap, pos across it) and the heading there; counter-clockwise on screen
function tandemXY(s, pos) {
  const K = TANDEM, r = tandemRad(pos);
  s = tandemWrap(s);
  if (s < K.S1) return { x: K.XA + s, y: K.CY + r, a: 0 };
  if (s < K.S2) { const th = Math.PI / 2 - (s - K.S1) / K.R; return { x: K.XB + r * Math.cos(th), y: K.CY + r * Math.sin(th), a: th - Math.PI / 2 }; }
  if (s < K.S3) return { x: K.XB - (s - K.S2), y: K.CY - r, a: Math.PI };
  const th = -Math.PI / 2 - (s - K.S3) / K.R;
  return { x: K.XA + r * Math.cos(th), y: K.CY + r * Math.sin(th), a: th - Math.PI / 2 };
}
// how much of a turn's bank is under s (0 on the straights, 1 in the middle of a turn)
function tandemShape(s) {
  const K = TANDEM;
  s = tandemWrap(s);
  let best = 0;
  for (const [a, b] of [[K.S1, K.S2], [K.S3, K.LAP]]) for (const x of [s, s + K.LAP, s - K.LAP]) {
    const up = tandemSmooth((x - (a - K.rampIn)) / K.rampLen), down = tandemSmooth(((b + K.rampIn) - x) / K.rampLen);
    best = Math.max(best, Math.min(up, down));
  }
  return best;
}
// the lean the bank needs at s at speed v (the gold wedge)
function tandemNeed(s, v) {
  const K = TANDEM, u = v / K.vRef;
  return tandemShape(s) * Math.min(K.needCap, K.needMin + (1 - K.needMin) * u * u);
}
function tandemStadium(r) {
  const K = TANDEM;
  ctx.moveTo(K.XA, K.CY + r); ctx.lineTo(K.XB, K.CY + r);
  ctx.arc(K.XB, K.CY, r, Math.PI / 2, -Math.PI / 2, true);
  ctx.lineTo(K.XA, K.CY - r);
  ctx.arc(K.XA, K.CY, r, -Math.PI / 2, -Math.PI * 1.5, true);
  ctx.closePath();
}

/* ---------- keys (each player's own device) ---------- */
function tandemKey(id, what) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad';
  if (what === 'left') return pad || touch ? '◀' : id === 0 ? 'A' : '←';
  if (what === 'right') return pad || touch ? '▶' : id === 0 ? 'D' : '→';
  if (what === 'pedal') return pad ? 'stick ◀ ▶' : touch ? '◀ ▶' : id === 0 ? 'A D' : '← →';
  if (what === 'in') return pad ? glyph('a') : touch ? '▲' : id === 0 ? 'W' : '↑';
  if (what === 'out') return pad ? 'stick ▼' : touch ? '▼' : id === 0 ? 'S' : '↓';
  return pad ? glyph('a') + ' / stick ▼' : touch ? '▲ ▼' : id === 0 ? 'W S' : '↑ ↓';
}
// 1-player mode: the computer's seat gets no key hints or prompts (it knows its job; the person might think the keys
// were meant for them)
const tandemQuiet = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);

/* ---------- a race (one room) ---------- */
function tandemRoom(st, L, k) {
  const K = TANDEM, def = L.def;
  st.k = k; st.n = def.roomCount || 1; st.def = def;
  st.ped = def.ped || 0; st.lean = 1 - st.ped;
  st.laps = def.laps || 3; st.goal = st.laps; st.title = def.title || '';   // (goal: the laps we ride; see tandemRaceChecks)
  const us = def.us || { pos: K.line, p: -6 };
  st.bike = { s0: K.FIN + us.p, d: 0, v: 0, pos: us.pos, lean: 0, power: 0, rail: false, railT: 0, wob: 0, down: 0,
    crank: 0, crankTo: 0, lastFoot: -1, draft: false, apron: false, done: false, finT: 0, place: 0, shake: 0, swapT: 1.1 };
  st.rivals = (def.rivals || []).map((r, i) => ({ i, team: TANDEM_TEAMS[r.team], s0: K.FIN + (r.p || 0), d: 0, v: 0, vBase: r.v,
    pos: r.pos == null ? K.line : r.pos, pref: r.pos == null ? K.line : r.pos, done: false, place: 0, ph: i * 1.7 + k, crank: 0 }));
  st.pacer = def.pacer ? { s0: K.FIN + 50, d: 0, v: 0, pos: K.line, on: true, gone: 0, pullAt: def.pacer.pullAt * K.LAP, crank: 0 } : null;
  st.order = [];                 // finishers: 'us' or a rival index
  st.phase = 'wait'; st.rt = 0; st.phT = 0;
  st.beat = { P: K.P, base: 0.35, n: 0, judged: -1, hitT: 9, flash: 0 };
  st.sprint = false; st.bell = false;
  st.raceRails = 0; st.raceAprons = 0; st.raceOff = 0; st.helpLean = false; st.helpDrum = false; st.helpWind = false;
  st.prevLR = [[true, true], [true, true]]; st.prevUD = [[true, true], [true, true]];
  st.lastStroke = -99; st.grade = null; st.streak = 0;
  st.pops = []; st.parts = []; st.hints = [null, null]; st.hinted = {}; st.hintPend = null; st.msg = null; st.big = null;
  st.wrongT = [0, 0];
  tandemTip(st, def);
  tandemMirror(st);
}
// the room card tip; in 1-player mode the computer's job is named without its keys
function tandemTip(st, def) {
  const P = NAMES[st.ped], Ln = NAMES[st.lean];
  const solo = typeof cpuSolo === 'function' && cpuSolo();
  const pedTxt = solo && cpuOn(st.ped) ? P + ' (computer) pedals' : P + ' pedals ◀ ▶ on the drum beat';
  const leanTxt = solo && cpuOn(st.lean) ? Ln + ' (computer) leans' : Ln + ' leans ▲ ▼ to match the bank';
  def.tip = pedTxt + '. ' + leanTxt + '. ' + (def.twist || '');
  st.tipKey = solo + ':' + cpuOn(0) + cpuOn(1);
}

/* ---------- the tick (def.ownStep: this is all of it) ---------- */
function tandemStep(st, dt) {
  if (!st.bike) return;
  const K = TANDEM, ps = G.players, b = st.bike;
  const key = (typeof cpuSolo === 'function' && cpuSolo()) + ':' + cpuOn(0) + cpuOn(1);
  if (key !== st.tipKey) tandemTip(st, G.level.def);
  // presses: the pedaler's ◀ ▶ edges, the leaner's ▲ ▼ held
  const P = ps[st.ped], Ln = ps[st.lean];
  const lr = ps.map(p => [p.input.left, p.input.right]);
  const edge = lr.map((v, id) => [v[0] && !st.prevLR[id][0], v[1] && !st.prevLR[id][1]]);
  st.prevLR = lr;
  for (const p of ps) p.pendingJump = false;
  const leanIn = Ln.input.jump || Ln.input.up, leanOut = Ln.input.down;
  b.swapT = Math.max(0, b.swapT - dt);
  if (st.phase === 'wait') {
    if (G.introT <= 0) { st.phase = 'count'; st.rt = 0; st.phT = 0; Sfx.play('tandemSwap'); }
  } else {
    st.rt += dt; st.phT += dt;
  }
  if (st.phase === 'count' || st.phase === 'race' || st.phase === 'done') tandemBeat(st, dt);
  // pedal presses (judged against the drum from the first count beat; they only push from GO)
  if (st.phase === 'count' || st.phase === 'race') {
    const e = edge[st.ped];
    if (e[0] || e[1]) {
      const foot = e[0] && e[1] ? 1 - b.lastFoot : e[0] ? 0 : 1;
      tandemPedal(st, foot === 0 ? 0 : 1);
    }
    // the leaner's lean (it stays where it is when let go)
    b.lean = clamp(b.lean + ((leanIn ? 1 : 0) - (leanOut ? 1 : 0)) * K.leanRate * dt, 0, K.leanMax);
    // the other job's buttons: a friendly nudge now and then
    if ((P.input.jump || P.input.up || P.input.down) && st.phase === 'race') { st.wrongT[P.id] += dt; if (st.wrongT[P.id] > 0.7) tandemWrong(st, P.id); } else st.wrongT[P.id] = 0;
    if ((edge[Ln.id][0] || edge[Ln.id][1]) && st.phase === 'race') { st.wrongT[Ln.id] += 0.35; if (st.wrongT[Ln.id] > 0.9) tandemWrong(st, Ln.id); }
    else st.wrongT[Ln.id] = Math.max(0, st.wrongT[Ln.id] - dt * 0.2);
  }
  if (st.phase === 'race' || st.phase === 'done') { tandemRide(st, dt); tandemRivals(st, dt); }
  if (st.phase === 'race') tandemRaceChecks(st);
  if (st.phase === 'done') {
    const rivalsLeft = st.rivals.some(r => !r.done);
    if (st.phT >= K.finishWait || (!rivalsLeft && st.phT >= 1.6)) tandemPodium(st);
  } else if (st.phase === 'podium') {
    tandemRide(st, dt); tandemRivals(st, dt);
    if (st.phT >= K.podiumT) {
      const L = G.level;
      if (L.def.rooms && L.def.roomIndex < L.def.roomCount - 1) { nextRoom(); return; }
      G.level.goal = { x: 480, y: 250 };
      levelClear();
      return;
    }
  }
  if (st.hintPend && st.rt >= st.hintPend.at) { const q = st.hintPend; st.hintPend = null; tandemHintOnce(st, q.key, q.id, q.text, q.life); }
  tandemFx(st, dt);
  tandemMirror(st);
}
// the drum: a beat every P seconds; the first `count` beats are the start count (3, 2, 1, GO!)
function tandemBeat(st, dt) {
  const K = TANDEM, bt = st.beat;
  bt.hitT += dt; bt.flash = Math.max(0, bt.flash - dt);
  while (st.rt >= bt.base + bt.n * bt.P) {
    const n = bt.n;
    bt.n++; bt.hitT = 0;
    if (st.phase === 'count' && n < K.count) {
      if (n < K.count - 1) { Sfx.play('tandemLight'); st.big = { text: String(K.count - 1 - n), col: C.gold, t: 0, life: bt.P * 0.95, size: 74 }; }
      else tandemGo(st);
    }
    if (st.phase === 'race' || st.phase === 'count') Sfx.play(n % 4 === 0 ? 'tandemDrumBig' : 'tandemDrum');
  }
}
function tandemGo(st) {
  st.phase = 'race'; st.phT = 0; st.goT = st.rt;
  st.big = { text: 'GO!', col: C.gold, t: 0, life: 0.8, size: 84 };
  Sfx.play('tandemGun'); Sfx.play('tandemCheer');
  rumble(0, 0.15, 0.35, 90); rumble(1, 0.15, 0.35, 90);
  for (const p of G.players) { p.sx = 0.8; p.sy = 1.25; }
}
// one pedal press, judged against the nearest beat
function tandemPedal(st, foot) {
  const K = TANDEM, b = st.bike, bt = st.beat, S = st.stats, wide = st.helpDrum ? K.bigDrum : 1;
  const k = Math.round((st.rt - bt.base) / bt.P), off = st.rt - (bt.base + k * bt.P), live = k >= K.count - 1;   // (a press just before GO counts for the GO beat)
  if (k === bt.judged) {   // an extra press in the same beat: nothing (mashing is slow)
    st.mash = (st.mash || 0) + 1;
    if (st.mash >= 3 && G.time - (st.mashSaid || -9) > 4) { st.mashSaid = G.time; tandemPopUI(st, 'Easy! One press a beat', '#ffd2a8'); }
    return;
  }
  st.mash = 0; bt.judged = k;
  const a = Math.abs(off);
  let q, word, col;
  if (a <= K.perfect * wide) { q = K.qPerfect; word = 'Perfect!'; col = C.gold; }
  else if (a <= K.good * wide) { q = K.qGood; word = 'Good'; col = '#8fe3b0'; }
  else { q = K.qOff; word = off < 0 ? 'Early' : 'Late'; col = '#ffb3a0'; }
  const same = foot === b.lastFoot;
  if (same) { q *= K.qFoot; word = 'Other foot!'; col = '#ffd2a8'; }
  b.lastFoot = foot;
  b.crankTo += Math.PI;
  st.lastStroke = st.rt;
  st.grade = { word, col, t: 0, q };
  if (!live) { if (st.phase === 'count') st.grade.word = q >= K.qGood ? 'Ready!' : word; Sfx.play('tandemTick', st.ped); return; }
  S.strokes[st.ped]++;
  if (q >= K.qGood && !same) S.onBeat[st.ped]++;
  if (q >= K.qGood && !same) { st.streak++; S.bestStreak = Math.max(S.bestStreak, st.streak); } else st.streak = 0;
  if (word === 'Early' || word === 'Late' || same) {
    st.raceOff++;
    if (!st.helpDrum && st.raceOff >= K.helpOff) {
      st.helpDrum = true; S.helps++;
      tandemMsg(st, 'Big drum! The beat is easier to hit now', C.gold, 3.4);
      Sfx.play('tandemHelp');
    }
  }
  if (b.rail) { st.grade.word = 'Stuck!'; st.grade.col = '#ffd2a8'; return; }
  b.power += (q * (b.wob > 0 ? 0.6 : 1) - b.power) * K.powerK;
  b.v = Math.min(K.vMax, b.v + K.kick * q);   // (a little kick you can feel on every press)
  Sfx.play(q >= K.qPerfect ? 'tandemPerfect' : q >= K.qGood ? 'tandemGood' : 'tandemOff', st.ped);
  if (q >= K.qPerfect && st.streak > 0 && st.streak % 8 === 0) tandemPopUI(st, st.streak + ' in a row!', C.gold);
}
// the bike: speed, lean against the bank, the rail and the apron, drafting, laps
function tandemRide(st, dt) {
  const K = TANDEM, b = st.bike, S = st.stats;
  const s = tandemWrap(b.s0 + b.d);
  b.wob = Math.max(0, b.wob - dt); b.shake = Math.max(0, b.shake - dt);
  b.crank = approach(b.crank, b.crankTo, dt * 14 * Math.max(0.4, b.v / 200));
  if (b.done) {
    // the cool-down roll after the line: easy speed, sitting up, back on the line
    b.v = approach(b.v, 110, 160 * dt); b.power = 0; b.rail = false;
    b.lean = approach(b.lean, tandemNeed(s, b.v), dt * 2);
    b.pos = approach(b.pos, K.line + 0.25, dt * 0.5);
    b.d += b.v * dt;
    b.crankTo += b.v * dt / 22; b.crank = b.crankTo;
    return;
  }
  // speed: the pedal power (faster on the sprint beat) sets the speed the bike rides up (or coasts down) to
  // (with the Big drum one missed beat is forgiven too)
  if (st.rt - st.lastStroke > st.beat.P * (st.helpDrum ? K.missAfterHelp : K.missAfter)) b.power *= Math.exp(-dt / K.missFade);
  b.draft = tandemDraft(st);
  if (b.draft) S.draftT += dt;
  b.apron = b.pos < 0;
  const need = tandemNeed(s, b.v), e = need - b.lean, tol = st.helpLean ? K.tolHelp : K.tol, drift = K.drift * (st.helpLean ? K.driftHelp : 1);
  b.scrub = K.scrub * clamp((Math.abs(e) - tol) / K.scrubAt, 0, 1);   // (a lean off the bank scrubs speed: "Wobbly!")
  // down on the apron and still leaning far too much: the bike wallows (so holding ▲ all race is no shortcut)
  if (b.apron && e < -tol) b.scrub += K.apronScrub * clamp((-e - tol) / 0.6, 0, 1);
  const vEq = K.vRef * b.power * (K.P / st.beat.P) * (b.draft ? K.draftMul : 1) * (b.apron ? K.apronMul : 1) * (1 - b.scrub) * (st.helpWind ? K.windMul : 1);
  b.v += (vEq - b.v) * Math.min(1, dt / K.tau * (vEq < b.v && b.apron ? 3 : 1));
  if (b.rail) { b.v = approach(b.v, 0, K.railDecel * dt); b.power = 0; }
  b.v = clamp(b.v, 0, K.vMax);
  // the keirin pace bike: nobody passes it before it pulls off
  const pc = st.pacer, p = b.s0 + b.d - K.FIN;
  // far behind every rival after the first lap: a gold tailwind for the rest of the race (announced)
  if (!st.helpWind && p > K.LAP && st.rivals.length && st.rivals.every(r => r.s0 + r.d - K.FIN - p > K.windBehind * K.LAP)) {
    st.helpWind = true; S.helps++;
    tandemMsg(st, 'Tailwind! A gold breeze helps you catch up', C.gold, 3.4);
    Sfx.play('tandemHelp');
  }
  if (pc && pc.on) {
    const pp = pc.s0 + pc.d - K.FIN;
    if (p > pp - 34) b.v = Math.min(b.v, pc.v);
    if (p > pp - 30) b.d = pp - 30 - (b.s0 - K.FIN);
  }
  // the bank: within the wedge the bike rides back to the racing line, outside it drifts up (too little lean) or down
  S.leanT[st.lean] += dt;
  if (Math.abs(e) <= tol && !b.rail) S.grooveT[st.lean] += dt;
  if (b.rail) {
    b.railT += dt;
    if (b.lean >= Math.max(K.railExit, need)) {
      b.rail = false; b.wob = K.wobT; b.down = 0.45; b.pos = 0.97;
      tandemPop(st, 'Phew!', '#8fe3b0', 20);
      Sfx.play('tandemPhew');
    } else if (b.railT > 1.4 && !st.hintPend && !st.hints[st.lean]) tandemHintOnce(st, 'rail' + st.k, st.lean, 'Lean in ' + tandemKey(st.lean, 'in') + ' to get off the rail!', 3);
  } else if (b.down > 0) {
    b.down -= dt; b.pos -= 0.8 * dt;
  } else if (e > tol) b.pos += drift * (e - tol) * dt;
  else if (e < -tol) b.pos += drift * (e + tol) * dt;
  else b.pos = approach(b.pos, K.line, (b.pos < 0 ? K.apronHome : K.home) * dt);   // (off the apron quickly once the lean is right)
  if (b.pos >= 1 && !b.rail) {
    b.pos = 1;
    if (e > tol) tandemRail(st);
  }
  b.pos = clamp(b.pos, -0.26, 1);
  if (b.pos < 0 && !st.apronSaid) {
    st.apronSaid = true; S.aprons++; st.raceAprons++;
    tandemPop(st, 'Off the boards!', '#bfeaff', 20);
    Sfx.play('tandemBump');
    tandemHintOnce(st, 'apron', st.lean, 'Too much lean! ' + tandemKey(st.lean, 'out') + ' to straighten', 3);
    if (st.raceAprons >= K.helpAprons) tandemSteady(st);
  }
  if (b.pos > 0.1) st.apronSaid = false;
  b.d += b.v * dt;
  // the pedals keep turning with the wheels between presses (the cam's legs)
  b.crankTo += b.v * dt / 60;
}
// too little lean at the rail: a cartoon wobble, then the bike leans on the rail until the leaner leans in
function tandemRail(st) {
  const K = TANDEM, b = st.bike, S = st.stats;
  b.rail = true; b.railT = 0; b.shake = 0.5;
  S.rails++; st.raceRails++;
  const at = tandemXY(b.s0 + b.d, 1);
  tandemPop(st, 'Wobble!', '#ffffff', 24, at.x, at.y - 24);
  Sfx.play('tandemWobble'); Sfx.play('tandemRail');
  rumble(0, 0.5, 0.5, 220); rumble(1, 0.5, 0.5, 220);
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.15);
  for (const p of G.players) { p.sx = 1.3; p.sy = 0.7; }
  for (let i = 0; i < 12; i++) tandemPart(st, at.x, at.y, (Math.random() - 0.5) * 160, (Math.random() - 0.5) * 160, 0.5, i % 2 ? '#ffffff' : '#f3d9a8', 2 + Math.random() * 2.5);
  // (the hint pill waits until the big "Wobble!" has faded, so only one message is up at a time)
  if (!st.hinted['railA' + st.k]) st.hintPend = { at: st.rt + 1.05, key: 'railA' + st.k, id: st.lean, text: 'Turns: hold ' + tandemKey(st.lean, 'in') + ' to lean in!', life: 3 };
  if (st.raceRails >= K.helpRails) tandemSteady(st);
}
// gold help after 2 rail wobbles or 6 trips onto the apron in a race: a wider lean wedge, and the bike slides more slowly
function tandemSteady(st) {
  if (st.helpLean) return;
  st.helpLean = true; st.stats.helps++;
  tandemMsg(st, 'Steady wheels! The lean wedge is wider now', C.gold, 3.4);
  Sfx.play('tandemHelp');
}
// riding close behind another bike on about the same line: less drag
function tandemDraft(st) {
  const K = TANDEM, b = st.bike, p = b.s0 + b.d - K.FIN;
  const bikes = st.rivals.filter(r => !r.done).map(r => ({ p: r.s0 + r.d - K.FIN, pos: r.pos }));
  if (st.pacer && st.pacer.on) bikes.push({ p: st.pacer.s0 + st.pacer.d - K.FIN, pos: st.pacer.pos });
  return !b.rail && b.v > 60 && bikes.some(o => tandemWrap(o.p - p) > K.draftNear && tandemWrap(o.p - p) < K.draftFar &&   // (wrapped: a lapped bike right ahead on the track counts)
    Math.abs(o.pos - b.pos) < K.draftLat);
}
// the rival tandems (and the pace bike): steady riders on their own lines, who ride round you rather than into you
function tandemRivals(st, dt) {
  const K = TANDEM, b = st.bike, us = b.s0 + b.d - K.FIN, pc = st.pacer, racing = st.phase !== 'wait' && st.phase !== 'count';
  if (pc && racing) {
    const pp = pc.s0 + pc.d - K.FIN;
    if (pc.on) {
      const want = 205 + 65 * clamp(pp / pc.pullAt, 0, 1);
      pc.v = approach(pc.v, want, 140 * dt);
      if (pp >= pc.pullAt) {
        pc.on = false; pc.gone = 0;
        Sfx.play('tandemWhistle');
        st.big = { text: 'GO GO GO!', col: C.gold, t: 0, life: 1.2, size: 54 };
        tandemMsg(st, 'The pace bike pulls off: race for the line!', '#ffe28a', 2.6);
      }
    } else { pc.gone += dt; pc.pos = approach(pc.pos, -0.9, dt * 0.9); pc.v = approach(pc.v, 150, 120 * dt); }
    pc.d += pc.v * dt; pc.crank += pc.v * dt / 30;
  }
  const order = st.rivals.slice().sort((a, c) => (c.s0 + c.d) - (a.s0 + a.d));
  for (const r of st.rivals) {
    const rp = r.s0 + r.d - K.FIN;
    if (racing) {
      let vt = r.vBase * (1 + 0.035 * Math.sin(st.rt * 0.7 + r.ph));
      if (st.def.sprint && rp >= (st.laps - 1) * K.LAP) vt *= st.def.sprint;
      if (pc && pc.on) {
        const slot = (pc.s0 + pc.d - K.FIN) - 44 * (order.indexOf(r) + 1);
        vt = pc.v + clamp((slot - rp) * 1.2, -60, 60);
      }
      if (r.done) vt = 110;
      r.v = approach(r.v, Math.max(0, vt), (r.v < vt ? 115 : 160) * dt);
      if (pc && pc.on) { const pp = pc.s0 + pc.d - K.FIN; if (rp + r.v * dt > pp - 30) r.v = Math.min(r.v, pc.v); }
      r.d += r.v * dt; r.crank += r.v * dt / 30;
    }
    // lanes: ride round our bike and round each other (the one behind goes high, or low near the rail)
    let want = r.done ? K.line + 0.4 : r.pref;
    const dz = tandemWrap(rp - us + K.LAP / 2) - K.LAP / 2;   // (on the track, so a lapped bike rides round us too)
    if (!b.done && Math.abs(dz) < 62 && Math.abs(r.pos - b.pos) < 0.36) want = b.pos + (b.pos < 0.56 ? 0.42 : -0.42);
    else if (!b.done && Math.abs(dz) < 62) want = r.pos;   // already beside us: hold the line
    for (const o of st.rivals) {
      if (o === r) continue;
      const od = (o.s0 + o.d) - (r.s0 + r.d);
      if (od > 0 && od < 56 && Math.abs(o.pos - want) < 0.3) want = o.pos + (o.pos < 0.56 ? 0.34 : -0.34);
    }
    r.pos = approach(r.pos, clamp(want, 0.04, 0.96), dt * 1.4);
    if (!r.done && rp >= st.laps * K.LAP && racing) {
      r.done = true; st.order.push(r.i); r.place = st.order.length;
      if (!b.done) Sfx.play('tandemBeep');
    }
  }
}
// laps, the bell, the finish
function tandemRaceChecks(st) {
  const K = TANDEM, b = st.bike, p = b.s0 + b.d - K.FIN;
  // every rival is home already: our place can't change, so the lap we are on is the last one (a slow race stays short)
  if (st.goal === st.laps && st.rivals.length && st.rivals.every(r => r.done)) {
    const cut = Math.floor(Math.max(0, p) / K.LAP) + 1;
    if (cut < st.laps) {
      st.goal = cut;
      if (!st.bell) { st.bell = true; Sfx.play('tandemBell'); }
      st.big = { text: 'Last lap!', col: '#ffffff', t: 0, life: 1.2, size: 46 };
      tandemMsg(st, 'Everyone else is home: this is your last lap!', '#ffe28a', 3);
    }
  }
  if (!st.bell && p >= (st.goal - 1) * K.LAP) {
    st.bell = true;
    Sfx.play('tandemBell');
    if (st.def.sprint) {
      st.sprint = true;
      const bt = st.beat, next = bt.base + bt.n * bt.P;
      bt.P = K.Psprint; bt.base = next - bt.n * bt.P;
      st.big = { text: 'BELL LAP! SPRINT!', col: C.gold, t: 0, life: 1.4, size: 46 };
      tandemMsg(st, 'Sprint! The drum is faster now', '#ffe28a', 2.6);
    } else st.big = { text: 'Last lap!', col: '#ffffff', t: 0, life: 1.2, size: 46 };
  }
  if (p >= st.goal * K.LAP) {
    b.done = true; st.order.push('us'); b.place = st.order.length;
    st.phase = 'done'; st.phT = 0;
    const S = st.stats, pl = b.place;
    S.places[st.k] = pl; S.pts += K.pts[Math.min(pl, 4) - 1] || 0;
    const m = TANDEM_MEDAL[Math.min(pl, 4) - 1];
    st.big = { text: tandemOrd(pl) + ' place!', col: m[1], t: 0, life: 2.4, size: 58 };
    Sfx.play(pl === 1 ? 'tandemWin' : 'tandemCheer');
    rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250);
    const at = tandemXY(K.FIN, b.pos);
    for (let i = 0; i < (pl === 1 ? 60 : 24); i++) confetti(at.x, at.y - 10);
  }
}
function tandemPodium(st) {
  st.phase = 'podium'; st.phT = 0;
  Sfx.play('tandemFanfare');
  const pl = st.bike.place;
  for (let i = 0; i < (pl <= 3 ? 50 : 16); i++) confetti(480, 230);
}
// pressing the other job's buttons: a friendly nudge (at most once every 9 s)
function tandemWrong(st, id) {
  st.wrongT[id] = 0;
  const key = 'wrong' + id;
  if (st.hinted[key] && G.time - st.hinted[key] < 9) return;
  st.hinted[key] = G.time;
  if (id === st.ped) tandemHint(st, id, NAMES[st.lean] + ' leans! You pedal ' + tandemKey(id, 'pedal'));
  else tandemHint(st, id, NAMES[st.ped] + ' pedals! You lean ' + tandemKey(id, 'lean'));
}
function tandemHint(st, id, text, life) { if (tandemQuiet(id)) return; st.hints[id] = { text, t: 0, life: life || 2.8 }; }
function tandemHintOnce(st, key, id, text, life) { if (st.hinted[key]) return; st.hinted[key] = true; tandemHint(st, id, text, life); }
function tandemMsg(st, text, col, life) { st.msg = { text, col, t: 0, life }; }
function tandemPop(st, s, col, size, x, y) {
  if (x == null) { const at = tandemXY(st.bike.s0 + st.bike.d, st.bike.pos); x = at.x; y = at.y - 22; }
  st.pops.push({ x, y, s, col: col || '#ffffff', size: size || 18, t: 0 });
  if (st.pops.length > 12) st.pops.shift();
}
// a short word by the pedaler's panel (streaks, "Easy!")
function tandemPopUI(st, s, col) { st.uiPop = { s, col, t: 0 }; }
function tandemPart(st, x, y, vx, vy, life, col, size) {
  if (st.parts.length > 220) st.parts.shift();
  st.parts.push({ x, y, vx, vy, life, max: life, col, size });
}
function tandemFx(st, dt) {
  const b = st.bike;
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const q = st.parts[i];
    if ((q.life -= dt) <= 0) { st.parts.splice(i, 1); continue; }
    q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.96; q.vy *= 0.96;
  }
  for (const q of st.pops) q.t += dt;
  st.pops = st.pops.filter(q => q.t < 1.1);
  for (const k of [0, 1]) { const h = st.hints[k]; if (h && (h.t += dt) >= h.life) st.hints[k] = null; }
  if (st.msg && (st.msg.t += dt) >= st.msg.life) st.msg = null;
  if (st.big && (st.big.t += dt) >= st.big.life) st.big = null;
  if (st.grade) st.grade.t += dt;
  if (st.uiPop && (st.uiPop.t += dt) > 1.4) st.uiPop = null;
  // wind streaks while drafting, wood dust at the rail and on the apron
  if (st.phase === 'race' && b.v > 80) {
    st.fxT = (st.fxT || 0) - dt;
    if (st.fxT <= 0) {
      st.fxT = 0.05;
      const at = tandemXY(b.s0 + b.d - 18, b.pos), ux = Math.cos(at.a), uy = Math.sin(at.a);
      if (b.draft) tandemPart(st, at.x + (Math.random() - 0.5) * 10, at.y + (Math.random() - 0.5) * 10, -ux * 90, -uy * 90, 0.35, 'rgba(255,255,255,0.9)', 1.6);
      if (st.helpWind && Math.random() < 0.6) tandemPart(st, at.x - ux * 14 + (Math.random() - 0.5) * 14, at.y - uy * 14 + (Math.random() - 0.5) * 14, ux * 60, uy * 60, 0.4, C.gold, 1.8);
      if (b.apron || b.rail) tandemPart(st, at.x, at.y, -ux * 40 + (Math.random() - 0.5) * 50, -uy * 40 + (Math.random() - 0.5) * 50, 0.45, '#f6e2b8', 2 + Math.random() * 2);
    }
  }
}
// the engine players sit where the riders are drawn (name tags, bubbles): the leaner in front, the pedaler behind
function tandemMirror(st) {
  const b = st.bike, at = tandemXY(b.s0 + b.d, b.pos), ux = Math.cos(at.a), uy = Math.sin(at.a);
  for (const p of G.players) {
    const front = p.id === st.lean, k = front ? 1 : -1;
    // (spread out along the bike so the two name tags on the room card don't overlap)
    p.x = at.x + ux * k * 20 - PW / 2; p.y = at.y + uy * k * 20 - PH + 6;
    p.vx = b.v; p.vy = 0; p.alive = true; p.grounded = true; p.face = 1; p.stompSafe = 0;
    p.stun = b.rail ? 0.4 : 0;
  }
}

MODES.tandem = {
  TANDEM, xy: tandemXY, need: tandemNeed, shape: tandemShape, key: tandemKey,
  setup(st, L) {
    st.stats = { places: [], pts: 0, strokes: [0, 0], onBeat: [0, 0], leanT: [0, 0], grooveT: [0, 0], rails: 0, aprons: 0,
      draftT: 0, helps: 0, bestStreak: 0 };
    tandemRoom(st, L, 0);
  },
  room(k, L) { tandemRoom(G.mst, L, k); },
  step(dt) { tandemStep(G.mst, dt); },
  // the engine draws the players between draw() and drawTop(): they ride the tandem instead (drawn by the mode)
  draw() {
    const st = G.mst;
    if (!st.bike) return;
    tandemDrawWorld(st);
    st.hid = G.players.map(p => p.alive);
    for (const p of G.players) p.alive = false;
  },
  drawTop() {
    const st = G.mst;
    if (st.hid) { G.players.forEach((p, i) => { p.alive = st.hid[i]; }); st.hid = null; }
    if (!st.bike) return;
    tandemDrawFront(st);
  },
  hud() { const st = G.mst; if (st.bike) tandemHud(st); },
  stats() {
    const s = G.mst.stats;
    if (!s) return [];
    // (compact values so each tile fits on one line on a phone: whole percentages, places as 1-1-2-1)
    const pct = (a, b) => (b > 0 ? String(Math.round(100 * a / b)) : '–');
    const max = TANDEM.pts[0] * (G.mst.n || 4);
    const out = [
      { label: 'Podium points', value: s.pts + ' of ' + max },
      { label: 'Places', value: s.places.map(n => (n ? String(n) : '·')).join('-') || '–' },
      { label: 'Pedals on the beat %', values: [pct(s.onBeat[0], s.strokes[0]), pct(s.onBeat[1], s.strokes[1])] },
      { label: 'Leaning in the groove %', values: [pct(s.grooveT[0], s.leanT[0]), pct(s.grooveT[1], s.leanT[1])] },
    ];
    const medal = s.pts >= 10 ? 'Gold' : s.pts >= 6 ? 'Silver' : 'Bronze';
    const words = medal === 'Gold' ? 'Champions of the boards!' : medal === 'Silver' ? 'A super team ride!' : 'You rode it together!';
    out.push(medal + ' medal · ' + words);
    const bits = [];
    bits.push(s.rails === 0 ? 'No rail wobbles' : s.rails === 1 ? '1 rail wobble' : s.rails + ' rail wobbles');
    if (s.bestStreak >= 8) bits.push(s.bestStreak + ' perfect pedals in a row');
    if (s.draftT >= 3) bits.push(Math.round(s.draftT) + ' s of drafting');
    out.push(bits.join(' · '));
    return out;
  },
};

/* ---------- drawing ---------- */
let tandemBg = null;
// the static picture (stands, track, infield), drawn once at twice the size into an offscreen canvas
function tandemBuildBg() {
  const cv = document.createElement('canvas');
  cv.width = W * 2; cv.height = H * 2;
  const g = cv.getContext('2d');
  g.scale(2, 2);
  tandemPaintBg(g);
  return cv;
}
function tandemPaintBg(g) {
  const K = TANDEM;
  const path = r => { g.beginPath(); stadiumOn(g, r); };
  const stadiumOn = (c, r) => {
    c.moveTo(K.XA, K.CY + r); c.lineTo(K.XB, K.CY + r);
    c.arc(K.XB, K.CY, r, Math.PI / 2, -Math.PI / 2, true);
    c.lineTo(K.XA, K.CY - r);
    c.arc(K.XA, K.CY, r, -Math.PI / 2, -Math.PI * 1.5, true);
    c.closePath();
  };
  const rr2 = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  // the arena: stands all round
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#3b4f8a'); sky.addColorStop(0.5, '#4a5f9c'); sky.addColorStop(1, '#3b4f8a');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  // seat rows: rings around the track, alternating colours
  for (let i = 9; i >= 0; i--) {
    const r = K.rOut + 14 + i * 13;
    path(r + 6);
    g.fillStyle = i % 2 ? '#56689f' : '#6476ad'; g.fill();
  }
  // a walkway ring and the wall round the track
  path(K.rOut + 14); g.fillStyle = '#d8d2c4'; g.fill();
  path(K.rOut + 6); g.fillStyle = '#2b3f63'; g.fill();
  // the boards
  path(K.rOut); g.fillStyle = '#e4b273'; g.fill();
  // the bank: darker as it climbs to the rail in the turns, a gentle slope on the straights
  for (const [cx, side] of [[K.XB, 1], [K.XA, -1]]) {
    g.save();
    g.beginPath(); g.rect(side > 0 ? cx : 0, 0, side > 0 ? W - cx : cx, H); g.clip();
    const rg = g.createRadialGradient(cx, K.CY, K.rIn + K.apron, cx, K.CY, K.rOut);
    rg.addColorStop(0, 'rgba(255,240,205,0.35)'); rg.addColorStop(0.55, 'rgba(160,95,40,0.0)'); rg.addColorStop(1, 'rgba(110,60,25,0.42)');
    path(K.rOut); g.fillStyle = rg; g.fill();
    g.restore();
  }
  for (const sgn of [1, -1]) {
    const y0 = K.CY + sgn * (K.rIn + K.apron), y1 = K.CY + sgn * K.rOut;
    const lg = g.createLinearGradient(0, y0, 0, y1);
    lg.addColorStop(0, 'rgba(255,240,205,0.25)'); lg.addColorStop(1, 'rgba(110,60,25,0.22)');
    g.fillStyle = lg; g.fillRect(K.XA, Math.min(y0, y1), K.XB - K.XA, Math.abs(y1 - y0));
  }
  // planks: thin lines along the track, with staggered joints
  g.lineWidth = 0.7;
  for (let r = K.rIn + K.apron + 4; r < K.rOut - 1; r += 4.4) { path(r); g.strokeStyle = 'rgba(120,70,30,0.2)'; g.stroke(); }
  g.strokeStyle = 'rgba(120,70,30,0.28)'; g.lineWidth = 0.8;
  for (let lane = 0, r = K.rIn + K.apron + 4; r < K.rOut - 5; r += 4.4, lane++) {
    const pos0 = (r - K.rIn - K.apron) / (K.TW - K.apron - K.railPad), pos1 = (r + 4.4 - K.rIn - K.apron) / (K.TW - K.apron - K.railPad);
    for (let s = (lane * 37) % 90; s < K.LAP; s += 90) {
      const a = tandemXY(s, pos0), c = tandemXY(s, Math.min(pos1, 1.1));
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(c.x, c.y); g.stroke();
    }
  }
  // the blue apron, the black measurement line, the red sprinter's line and the blue stayer's line
  g.beginPath(); stadiumOn(g, K.rIn + K.apron); stadiumOn(g, K.rIn); g.fillStyle = '#62b6ea'; g.fill('evenodd');
  g.lineWidth = 2; path(K.rIn + K.apron + 1.5); g.strokeStyle = '#26243f'; g.stroke();
  g.lineWidth = 1.6; path(tandemRad(0.24)); g.strokeStyle = '#e8483d'; g.stroke();
  g.lineWidth = 1.6; path(tandemRad(0.66)); g.strokeStyle = '#3a7fd6'; g.stroke();
  // the rail
  g.lineWidth = 4; path(K.rOut - 2); g.strokeStyle = '#ffffff'; g.stroke();
  g.lineWidth = 1.2; path(K.rOut - 4.5); g.strokeStyle = 'rgba(43,63,99,0.5)'; g.stroke();
  // the finish line on the home straight, and the pursuit marks
  const fx = K.XA + K.FIN;
  g.fillStyle = '#ffffff'; g.fillRect(fx - 4, K.CY + K.rIn, 8, K.TW);
  g.fillStyle = '#26243f'; g.fillRect(fx - 1, K.CY + K.rIn, 2, K.TW);
  for (const [x, y0] of [[480, K.CY + K.rIn], [480, K.CY - K.rOut]]) { g.fillStyle = '#e8483d'; g.fillRect(x - 1.5, y0, 3, K.TW); }
  // the infield: mown grass in stripes
  g.save(); path(K.rIn); g.clip();
  g.fillStyle = '#7cc66a'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.08)';
  for (let x = 0; x < W; x += 56) g.fillRect(x, 0, 28, H);
  g.restore();
  path(K.rIn); g.lineWidth = 3; g.strokeStyle = '#4c9a48'; g.stroke();
  // little benches and rollers in the infield bends
  for (const [x, y] of [[170, 350], [790, 220]]) {
    g.fillStyle = 'rgba(28,26,54,0.18)'; rr2(x - 22, y - 5, 44, 12, 4); g.fill();
    g.fillStyle = '#c98b5a'; rr2(x - 22, y - 8, 44, 10, 4); g.fill();
    g.fillStyle = '#8a5833'; g.fillRect(x - 18, y + 2, 4, 6); g.fillRect(x + 14, y + 2, 4, 6);
  }
  // banner boards on the wall along the straights (made-up colours, no words but "SUMMER GAMES")
  const boards = ['#ff6b4a', '#19b3a6', '#ffc53d', '#9b6fd6', '#8fd14f', '#5b95ff'];
  for (const [y, k0] of [[K.CY - K.rOut - 12, 0], [K.CY + K.rOut + 4, 3]]) {
    for (let i = 0; i < 6; i++) {
      const x = K.XA + 12 + i * 74;
      g.fillStyle = boards[(i + k0) % 6]; rr2(x, y, 66, 8, 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.font = '700 6.5px "Atkinson Hyperlegible", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText((i + k0) % 2 ? 'SUMMER GAMES' : '★ TANDEM ★', x + 33, y + 4.4);
    }
  }
  // the judges' stand by the finish line
  g.fillStyle = '#ffffff'; rr2(fx - 26, K.CY + K.rOut + 16, 52, 18, 4); g.fill();
  g.fillStyle = '#26243f'; g.font = '700 9px "Atkinson Hyperlegible", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('FINISH', fx, K.CY + K.rOut + 25.5);
}
function tandemDrawWorld(st) {
  if (!tandemBg) tandemBg = tandemBuildBg();
  ctx.drawImage(tandemBg, 0, 0, W, H);
  tandemDrawCrowd(st);
  tandemDrawScoreboard(st);
  tandemDrawDrummer(st);
  tandemDrawInfield(st);
}
// the crowd in the stands: bobbing on the drum beat, jumping up at the finish, waving made-up flags
let tandemFans = null;
function tandemDrawCrowd(st) {
  const K = TANDEM;
  if (!tandemFans) {
    tandemFans = [];
    const cols = ['#ff6b4a', '#5b95ff', '#ffc53d', '#19b3a6', '#9b6fd6', '#8fd14f', '#ff7fb0', '#f6efdf', '#c98b5a'];
    for (let ring = 0; ring < 9; ring++) {
      const r = K.rOut + 22 + ring * 13, n = Math.floor((2 * (K.XB - K.XA) + 2 * Math.PI * r) / 15);
      for (let i = 0; i < n; i++) {
        const h = hash(i, ring + 40), u = (i + (ring % 2) * 0.5) / n;
        // a point on the stadium ring at fraction u
        const per = 2 * (K.XB - K.XA) + 2 * Math.PI * r;
        let d = u * per, x, y;
        const S1 = K.XB - K.XA, S2 = S1 + Math.PI * r, S3 = S2 + S1;
        if (d < S1) { x = K.XA + d; y = K.CY + r; }
        else if (d < S2) { const th = Math.PI / 2 - (d - S1) / r; x = K.XB + r * Math.cos(th); y = K.CY + r * Math.sin(th); }
        else if (d < S3) { x = K.XB - (d - S2); y = K.CY - r; }
        else { const th = -Math.PI / 2 - (d - S3) / r; x = K.XA + r * Math.cos(th); y = K.CY + r * Math.sin(th); }
        if (x < -8 || x > W + 8 || y < -8 || y > H + 8) continue;
        if (h % 7 === 0) continue;   // an empty seat
        if ((x > 428 && x < 536 && y > 478) || (x > 546 && x < 614 && y > 470 && y < 506)) continue;   // Bongo's drum, the judges
        tandemFans.push({ x: x + ((h >> 3) % 5) - 2, y: y + ((h >> 6) % 3) - 1, col: cols[h % cols.length], skin: ['#f3c9a0', '#c98b5a', '#8a5833', '#ffe0c2'][(h >> 9) % 4],
          flag: h % 11 === 0 ? cols[(h >> 4) % cols.length] : null, ph: (h % 100) / 16 });
      }
    }
  }
  const hit = st.beat.hitT, beatBob = st.phase !== 'wait' && hit < 0.18 ? Math.sin(hit / 0.18 * Math.PI) : 0;
  const cheer = (st.phase === 'done' || st.phase === 'podium') ? Math.abs(Math.sin(G.clock * 9)) : st.phase === 'race' && st.phT < 1 ? Math.abs(Math.sin(G.clock * 9)) * (1 - st.phT) : 0;
  for (const f of tandemFans) {
    const jump = cheer * (2 + (f.ph % 1) * 3) + beatBob * 1.5 * ((f.ph * 3) % 1 > 0.5 ? 1 : 0);
    const y = f.y - jump;
    ctx.fillStyle = f.col; rr(f.x - 4, y - 1, 8, 6, 3); ctx.fill();
    ctx.fillStyle = f.skin; circle(f.x, y - 3.5, 3); ctx.fill();
    if (f.flag) {
      const wv = Math.sin(G.clock * 6 + f.ph) * 2;
      ctx.strokeStyle = '#26243f'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(f.x + 3, y); ctx.lineTo(f.x + 3, y - 12); ctx.stroke();
      ctx.fillStyle = f.flag; ctx.beginPath(); ctx.moveTo(f.x + 3, y - 12); ctx.lineTo(f.x + 11, y - 10 + wv * 0.4); ctx.lineTo(f.x + 3, y - 7); ctx.closePath(); ctx.fill();
    }
  }
}
// the scoreboard over the top straight, with a torch bowl either side
function tandemDrawScoreboard(st) {
  const x = 480, y = 8, w = 210, h = 52;
  ctx.fillStyle = 'rgba(28,26,54,0.25)'; rr(x - w / 2 + 3, y + 3, w, h, 10); ctx.fill();
  ctx.fillStyle = '#26243f'; rr(x - w / 2, y, w, h, 10); ctx.fill();
  ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(x - w / 2, y, w, h, 10); ctx.stroke();
  text('SUMMER GAMES', x, y + 14, 15, C.gold, 'center');
  const sub = 'Race ' + (st.k + 1) + ' of ' + st.n + ' · ' + st.title;
  text(sub, x, y + 35, 12, '#ffe8b0', 'center', 'body');
  for (const tx of [x - w / 2 - 20, x + w / 2 + 20]) {
    ctx.fillStyle = '#8a90a6'; ctx.fillRect(tx - 2.5, y + 22, 5, 26);
    ctx.fillStyle = '#d9dde8'; ctx.beginPath(); ctx.moveTo(tx - 12, y + 14); ctx.lineTo(tx + 12, y + 14); ctx.lineTo(tx + 7, y + 24); ctx.lineTo(tx - 7, y + 24); ctx.closePath(); ctx.fill();
    const f = G.clock * 7 + tx;
    ctx.fillStyle = '#ff8a3d';
    ctx.beginPath(); ctx.moveTo(tx - 10, y + 14); ctx.quadraticCurveTo(tx - 9 + Math.sin(f) * 2, y - 2, tx + Math.sin(f * 1.3) * 3, y - 10); ctx.quadraticCurveTo(tx + 9 + Math.sin(f * 0.8) * 2, y - 2, tx + 10, y + 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath(); ctx.moveTo(tx - 5, y + 14); ctx.quadraticCurveTo(tx - 4, y + 4, tx + Math.sin(f * 1.7) * 2, y - 1); ctx.quadraticCurveTo(tx + 4, y + 4, tx + 5, y + 14); ctx.closePath(); ctx.fill();
  }
}
// Bongo the bear bangs the big drum on every beat (bottom centre, between the job panels)
function tandemDrawDrummer(st) {
  const x = 480, y = 520, hit = st.phase === 'wait' ? 9 : st.beat.hitT, k = hit < 0.12 ? 1 - hit / 0.12 : 0;
  ctx.fillStyle = 'rgba(28,26,54,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 14, 44, 6, 0, 0, Math.PI * 2); ctx.fill();
  // bear
  const bx = x - 24, by = y - 18 - k * 2;
  ctx.fillStyle = '#9b6a4a'; circle(bx - 9, by - 13, 5); ctx.fill(); circle(bx + 9, by - 13, 5); ctx.fill();
  ctx.fillStyle = '#b07a55'; rr(bx - 13, by - 12, 26, 30, 11); ctx.fill();
  ctx.fillStyle = '#e8c9a8'; ctx.beginPath(); ctx.ellipse(bx, by - 2, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.ink; circle(bx - 5, by - 7, 1.8); ctx.fill(); circle(bx + 5, by - 7, 1.8); ctx.fill(); circle(bx, by - 3, 1.8); ctx.fill();
  ctx.fillStyle = '#ff6b4a'; ctx.fillRect(bx - 13, by + 8, 26, 5);   // a sash
  // the drum (side on), glowing on the beat
  ctx.fillStyle = '#e8483d'; rr(x - 8, y - 22, 46, 34, 6); ctx.fill();
  ctx.fillStyle = k > 0 ? `rgba(255,236,170,${(0.55 + 0.45 * k).toFixed(3)})` : '#f6efdf';
  ctx.beginPath(); ctx.ellipse(x + 15, y - 5, 17 + k * 2, 14 + k * 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffc53d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x + 15, y - 5, 17, 14, 0, 0, Math.PI * 2); ctx.stroke();
  // the mallet: up between beats, down on the beat
  ctx.save(); ctx.translate(bx + 10, by + 2); ctx.rotate(hit < 0.1 ? 0.25 : -0.75);
  ctx.strokeStyle = '#8a5833'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(22, 0); ctx.stroke();
  ctx.fillStyle = '#f6efdf'; circle(24, 0, 5); ctx.fill();
  ctx.restore();
  if (k > 0) {
    ctx.strokeStyle = `rgba(255,236,170,${k.toFixed(3)})`; ctx.lineWidth = 2.5;
    for (const r of [26, 34]) { ctx.beginPath(); ctx.arc(x + 15, y - 5, r + (1 - k) * 8, -0.9, 0.9); ctx.stroke(); }
  }
}
// the infield: laps-to-go board (left), the Tandem Cam (middle), the standings (right)
function tandemDrawInfield(st) {
  const K = TANDEM, b = st.bike, z = hudBig() ? 1.12 : 1;
  // laps to go
  {
    const p = b.s0 + b.d - K.FIN, togo = b.done ? 0 : Math.max(1, st.goal - Math.max(0, Math.floor(p / K.LAP)));
    const x = 250, y = 285, w = 104 * z, h = 112 * z;
    ctx.fillStyle = 'rgba(28,26,54,0.22)'; rr(x - w / 2 + 3, y - h / 2 + 4, w, h, 12); ctx.fill();
    ctx.fillStyle = '#26243f'; rr(x - w / 2, y - h / 2, w, h, 12); ctx.fill();
    ctx.strokeStyle = '#f6efdf'; ctx.lineWidth = 2; rr(x - w / 2, y - h / 2, w, h, 12); ctx.stroke();
    text(b.done ? 'FINISHED' : 'LAPS TO GO', x, y - h / 2 + 14 * z, 11 * z, '#d9d3ef', 'center', 'body');
    if (b.done) text('✓', x, y + 6 * z, 52 * z, '#8fe3b0', 'center');
    else text(String(togo), x, y + 8 * z, 56 * z, togo === 1 ? C.gold : '#ffffff', 'center');
    if (togo === 1 && !b.done) {
      // the bell
      const sw = Math.sin(G.clock * 10) * 0.4, bx = x + w / 2 - 18 * z, by = y - h / 2 + 34 * z;
      ctx.save(); ctx.translate(bx, by); ctx.rotate(sw); ctx.scale(z, z);
      ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(-8, 6); ctx.quadraticCurveTo(-8, -9, 0, -9); ctx.quadraticCurveTo(8, -9, 8, 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.goldDark; circle(0, 8, 2.6); ctx.fill();
      ctx.restore();
    }
    text(st.laps + (st.laps === 1 ? ' lap' : ' laps') + ' race', x, y + h / 2 - 12 * z, 11 * z, '#d9d3ef', 'center', 'body');
  }
  // the standings
  {
    const rows = tandemStandings(st), x = 712, y = 285, rh = 19 * z, w = 120 * z, h = 22 * z + rows.length * rh;
    ctx.fillStyle = 'rgba(28,26,54,0.22)'; rr(x - w / 2 + 3, y - h / 2 + 4, w, h, 12); ctx.fill();
    ctx.fillStyle = '#26243f'; rr(x - w / 2, y - h / 2, w, h, 12); ctx.fill();
    ctx.strokeStyle = '#f6efdf'; ctx.lineWidth = 2; rr(x - w / 2, y - h / 2, w, h, 12); ctx.stroke();
    text('PLACES', x, y - h / 2 + 12 * z, 11 * z, '#d9d3ef', 'center', 'body');
    rows.forEach((r, i) => {
      const ry = y - h / 2 + 22 * z + i * rh + rh / 2;
      if (r.us) { ctx.fillStyle = 'rgba(255,197,61,0.22)'; rr(x - w / 2 + 5, ry - rh / 2 + 1, w - 10, rh - 2, 6); ctx.fill(); }
      text(String(i + 1), x - w / 2 + 14 * z, ry + 0.5, 12 * z, r.us ? C.gold : '#ffffff', 'center');
      if (r.us) {
        ctx.fillStyle = PCOL[0]; circle(x - w / 2 + 30 * z, ry, 5 * z); ctx.fill();
        ctx.fillStyle = PCOL[1]; circle(x - w / 2 + 40 * z, ry, 5 * z); ctx.fill();
        text('Pip & Bo', x - w / 2 + 50 * z, ry + 0.5, 12 * z, '#ffffff', 'left', 'body');
      } else {
        ctx.fillStyle = r.team.col; circle(x - w / 2 + 35 * z, ry, 5.5 * z); ctx.fill();
        text(r.team.short, x - w / 2 + 50 * z, ry + 0.5, 12 * z, '#d9d3ef', 'left', 'body');
      }
      if (r.done) text('✓', x + w / 2 - 10 * z, ry + 0.5, 11 * z, '#8fe3b0', 'center', 'body');
    });
  }
  if (st.phase === 'podium') tandemDrawPodium(st);
  else tandemDrawCam(st);
}
function tandemStandings(st) {
  const K = TANDEM, b = st.bike;
  const rows = [{ us: true, p: b.s0 + b.d - K.FIN, done: b.done, place: b.place }].concat(st.rivals.map(r => ({ us: false, team: r.team, p: r.s0 + r.d - K.FIN, done: r.done, place: r.place })));
  return rows.sort((a, c) => (a.done && c.done ? a.place - c.place : a.done ? -1 : c.done ? 1 : c.p - a.p));
}
// a rider seen from the front (the house style: a round-cornered body with a face), at x, y = the seat
function tandemRiderFront(id, x, y, s, mood, look) {
  const col = PCOL[id], dark = PDARK[id], w = 22 * s, h = 26 * s;
  ctx.save(); ctx.translate(x, y);
  if (id === 1) {
    ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 2 * s;
    for (const ex of [-w / 2 + 4 * s, w / 2 - 4 * s]) { circle(ex, -h + 1 * s, 5 * s); ctx.fill(); ctx.stroke(); }
  }
  ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 2.5 * s;
  rr(-w / 2, -h, w, h, 8 * s); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(-w / 2 + 3 * s, -h + 3 * s, w * 0.35, h * 0.4, 5 * s); ctx.fill();
  if (id === 0) {
    ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(1 * s, -h - 6 * s); ctx.stroke();
    ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(5 * s, -h - 8 * s, 6 * s, 3 * s, -0.5, 0, Math.PI * 2); ctx.fill();
  }
  // a race number on the tummy
  ctx.fillStyle = '#ffffff'; rr(-6 * s, -h * 0.34, 12 * s, 8 * s, 2 * s); ctx.fill();
  text(String(id + 1), 0, -h * 0.34 + 4.3 * s, 7 * s, C.ink, 'center', 'body');
  const ey = -h * 0.62, lk = (look || 0) * 1.5 * s;
  if (mood === 'dizzy') {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2 * s;
    for (const ex of [-5 * s, 5 * s]) { ctx.beginPath(); ctx.moveTo(ex - 3 * s, ey - 3 * s); ctx.lineTo(ex + 3 * s, ey + 3 * s); ctx.moveTo(ex + 3 * s, ey - 3 * s); ctx.lineTo(ex - 3 * s, ey + 3 * s); ctx.stroke(); }
  } else if (mood === 'happy') {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2 * s;
    for (const ex of [-5 * s, 5 * s]) { ctx.beginPath(); ctx.arc(ex, ey + 1 * s, 3 * s, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  } else {
    for (const ex of [-5 * s, 5 * s]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex + lk, ey, 3.6 * s, 4.4 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink; circle(ex + lk * 1.3, ey + (mood === 'push' ? -0.5 : 0.8) * s, 2 * s); ctx.fill();
    }
    if (mood === 'push') { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6 * s; for (const ex of [-5 * s, 5 * s]) { ctx.beginPath(); ctx.moveTo(ex - 3.5 * s, ey - 6 * s + (ex < 0 ? -1 : 1) * s); ctx.lineTo(ex + 3.5 * s, ey - 6 * s + (ex < 0 ? 1 : -1) * s); ctx.stroke(); } }
  }
  ctx.fillStyle = 'rgba(255,120,140,0.45)'; circle(-8 * s, ey + 6 * s, 2.4 * s); ctx.fill(); circle(8 * s, ey + 6 * s, 2.4 * s); ctx.fill();
  // mouth
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6 * s; ctx.beginPath();
  if (mood === 'dizzy') { ctx.ellipse(0, ey + 8 * s, 2.5 * s, 2 * s, 0, 0, Math.PI * 2); }
  else ctx.arc(0, ey + 6.5 * s, (mood === 'happy' ? 3.5 : 2.5) * s, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();
}
// the Tandem Cam: a front view of the bike on the bank, so the lean is easy to see (square to the boards = good)
function tandemDrawCam(st) {
  const K = TANDEM, b = st.bike, x0 = 330, y0 = 196, w = 300, h = 178;
  const s = tandemWrap(b.s0 + b.d), need = tandemNeed(s, b.v), tol = st.helpLean ? K.tolHelp : K.tol;
  const e = need - b.lean, ok = Math.abs(e) <= tol && !b.rail;
  const ang = l => l * 0.62;   // lean units -> radians shown (1 = about 35°)
  ctx.fillStyle = 'rgba(28,26,54,0.25)'; rr(x0 + 4, y0 + 5, w, h, 14); ctx.fill();
  ctx.fillStyle = '#26243f'; rr(x0, y0, w, h, 14); ctx.fill();
  ctx.save(); rr(x0 + 6, y0 + 6, w - 12, h - 12, 10); ctx.clip();
  // the arena behind: blurry crowd stripes, speeding by
  const bg = ctx.createLinearGradient(0, y0, 0, y0 + h);
  bg.addColorStop(0, '#56689f'); bg.addColorStop(1, '#8090c2');
  ctx.fillStyle = bg; ctx.fillRect(x0, y0, w, h);
  const run = (b.d * 0.6) % 40;
  for (let i = -1; i < 9; i++) {
    const yy = y0 + 18 + ((i * 17 + run * 0.5) % 120);
    ctx.fillStyle = ['rgba(255,107,74,0.25)', 'rgba(255,197,61,0.25)', 'rgba(91,149,255,0.25)', 'rgba(143,209,79,0.25)'][(i + 4) % 4];
    for (let j = 0; j < 9; j++) { circle(x0 + ((j * 41 + i * 23) % (w + 20)) - 10, yy, 4); ctx.fill(); }
  }
  // the boards: a slope through the wheel (higher toward the rail, on our left)
  const cx = x0 + w / 2 + 6, cy = y0 + h - 38, beta = ang(need) * (b.done ? 0.6 : 1);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(beta);
  ctx.fillStyle = '#e4b273'; ctx.fillRect(-w, 0, w * 2, h);
  ctx.fillStyle = '#c98b5a';
  for (let i = 0; i < 6; i++) { const yy = 6 + ((i * 11 + b.d * 0.35) % 66); ctx.fillRect(-w, yy, w * 2, 1.3); }
  ctx.fillStyle = '#62b6ea'; ctx.fillRect(w * 0.42, 0, w, h);          // the blue apron, low on the right
  ctx.fillStyle = '#26243f'; ctx.fillRect(w * 0.42 - 3, 0, 3, h);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(-w * 0.62, -26, 5, 26);       // the rail, high on the left
  ctx.fillRect(-w, -28, w * 0.4 + 2, 4);
  // where the bike should point: square to the boards (dashed, gold when you are there)
  ctx.setLineDash([5, 5]); ctx.strokeStyle = ok ? '#8fe3b0' : C.gold; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -138); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
  // speed lines
  if (b.v > 150 && !b.rail) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const yy = y0 + 24 + ((i * 29 + G.clock * 420) % (h - 50)), xx = i % 2 ? x0 + 22 : x0 + w - 22, len = 10 + (b.v - 150) / 12;
      ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + len); ctx.stroke();
    }
  }
  // the bike, leaning by the leaner's lean, wobbling at the rail
  const wob = b.rail || b.wob > 0 ? Math.sin(G.clock * 28) * 0.12 * (b.rail ? 1 : b.wob / K.wobT) : 0;
  const lam = ang(b.lean) + wob + (b.shake > 0 ? Math.sin(G.clock * 50) * 0.05 : 0);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(lam); ctx.scale(1.3, 1.3);
  const cr = b.crank, mood = b.rail ? 'dizzy' : st.phase === 'done' || st.phase === 'podium' ? 'happy' : st.sprint ? 'push' : null;
  const bob = st.phase === 'race' && !b.rail ? Math.abs(Math.sin(cr)) * 1.6 : 0;
  // the stoker (pedaler) peeks over the captain's shoulder, a little behind, bobbing with every push
  // (offset up and out past the captain's shoulder and handlebar grip, so both riders and their colours show)
  ctx.fillStyle = '#26243f'; rr(19, -58, 14, 5, 2.5); ctx.fill();   // the back saddle
  tandemRiderFront(st.ped, 27, -56 - bob, 0.86, mood, -0.6);
  // wheel (head on): a fat tyre and the hub, the fork
  ctx.fillStyle = '#26243f'; rr(-5.5, -40, 11, 40, 5.5); ctx.fill();
  ctx.fillStyle = '#4a4766'; rr(-2.5, -36, 5, 32, 2.5); ctx.fill();
  ctx.strokeStyle = C.gold; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-5, -22); ctx.lineTo(-3, -56); ctx.moveTo(5, -22); ctx.lineTo(3, -56); ctx.stroke();
  // the captain (leaner) in front: body, short legs going round, arms on the handlebar
  const cy0 = -50 - bob * 0.4;
  tandemRiderFront(st.lean, 0, cy0, 1, mood, 0);
  for (const side of [-1, 1]) {
    const k = Math.sin(cr + (side > 0 ? 0 : Math.PI));
    const hx = side * 6, hy = cy0 - 2, kx = side * 13, ky = cy0 + 9 - k * 6, fx = side * 10, fy = cy0 + 22 - k * 5;
    ctx.strokeStyle = PDARK[st.lean]; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(fx, fy + 1.5, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
  }
  ctx.strokeStyle = '#26243f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-18, -57); ctx.lineTo(18, -57); ctx.stroke();
  ctx.strokeStyle = PDARK[st.lean]; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-9, cy0 - 13); ctx.lineTo(-19, -57); ctx.moveTo(9, cy0 - 13); ctx.lineTo(19, -57); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = C.ink; rr(-24, -59.5, 7, 5, 2.5); ctx.fill(); rr(17, -59.5, 7, 5, 2.5); ctx.fill();
  ctx.restore();
  // a green glow when the lean is just right
  if (ok && st.phase === 'race') { ctx.fillStyle = 'rgba(143,227,176,0.16)'; ctx.fillRect(x0, y0, w, h); }
  ctx.restore();
  ctx.strokeStyle = ok && st.phase === 'race' ? '#8fe3b0' : '#f6efdf'; ctx.lineWidth = 3; rr(x0, y0, w, h, 14); ctx.stroke();
  // labels: TANDEM CAM with a blinking REC dot, the speed, and the lean word
  ctx.fillStyle = Math.sin(G.clock * 5) > 0 ? '#ff4d4d' : 'rgba(255,77,77,0.35)'; circle(x0 + 18, y0 + 18, 4.5); ctx.fill();
  text('TANDEM CAM', x0 + 28, y0 + 18.5, 11, '#ffffff', 'left', 'body');
  const kmh = Math.round(b.v * 0.14);
  text(kmh + ' km/h', x0 + w - 14, y0 + 18.5, 14, b.draft ? '#bfeaff' : '#ffffff', 'right');
  let chipY = y0 + 30;
  if (b.draft && st.phase === 'race') {
    ctx.fillStyle = 'rgba(191,234,255,0.92)'; rr(x0 + w - 74, chipY, 60, 18, 9); ctx.fill();
    text('DRAFT!', x0 + w - 44, chipY + 9.5, 11, C.ink, 'center', 'body'); chipY += 22;
  }
  if (st.helpWind && st.phase === 'race') {
    ctx.fillStyle = C.gold; rr(x0 + w - 90, chipY, 76, 18, 9); ctx.fill();
    text('TAILWIND', x0 + w - 52, chipY + 9.5, 11, C.ink, 'center', 'body');
  }
  if (st.phase === 'race' || st.phase === 'count') {
    let word = null, col = '#ffffff';
    if (b.rail) { word = 'On the rail! Lean in!'; col = '#ffd2a8'; }
    else if (b.apron) { word = 'On the apron! Sit up!'; col = '#bfeaff'; }
    else if (st.phase === 'race' && ok && need > 0.2) { word = 'In the groove!'; col = '#8fe3b0'; }
    else if (st.phase === 'race' && e > tol) { word = 'Lean in more!'; col = C.gold; }
    else if (st.phase === 'race' && e < -tol) { word = 'Too much lean!'; col = '#bfeaff'; }
    if (word) {
      ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
      const tw = ctx.measureText(word).width + 20;
      ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(x0 + 12, y0 + h - 30, tw, 20, 10); ctx.fill();
      text(word, x0 + 12 + tw / 2, y0 + h - 19.5, 13, col, 'center', 'body');
    }
  }
}
// after each race: the podium in the infield (Pip and Bo on it when they placed, or a ribbon for 4th)
function tandemDrawPodium(st) {
  const x0 = 330, y0 = 196, w = 300, h = 178, pl = st.bike.place, t = st.phT;
  ctx.fillStyle = 'rgba(28,26,54,0.25)'; rr(x0 + 4, y0 + 5, w, h, 14); ctx.fill();
  ctx.fillStyle = '#26243f'; rr(x0, y0, w, h, 14); ctx.fill();
  ctx.strokeStyle = C.gold; ctx.lineWidth = 3; rr(x0, y0, w, h, 14); ctx.stroke();
  const m = TANDEM_MEDAL[Math.min(pl, 4) - 1];
  text(pl <= 3 ? m[0] + ' medal!' : tandemOrd(pl) + ' place: nice try!', x0 + w / 2, y0 + 22, 20, m[1], 'center');
  const order = tandemStandings(st);
  const blocks = [[1, x0 + w / 2 - 76, 42], [0, x0 + w / 2, 62], [2, x0 + w / 2 + 76, 30]];
  const base = y0 + h - 14;
  for (const [i, bx, bh] of blocks) {
    const r = order[i];
    ctx.fillStyle = ['#ffc53d', '#d9dde8', '#e09a5a'][i]; rr(bx - 34, base - bh, 68, bh, 6); ctx.fill();
    text(String(i + 1), bx, base - bh / 2 + 2, 22, C.ink, 'center');
    if (!r) continue;
    const hop = Math.max(0, Math.sin((t * 5 + i) * 1.2)) * (r.us ? 8 : 3);
    if (r.us) {
      tandemRiderFront(0, bx - 12, base - bh - hop, 0.78, 'happy');
      tandemRiderFront(1, bx + 12, base - bh - hop * 0.8, 0.78, 'happy');
      // medals round their necks
      for (const dx of [-12, 12]) { ctx.fillStyle = ['#ffc53d', '#d9dde8', '#e09a5a'][i]; circle(bx + dx, base - bh - hop - 6, 3.5); ctx.fill(); }
    } else tandemRivalHead(r.team, bx, base - bh - 12 - hop, 1.6);
  }
  if (pl > 3) {
    // a ribbon rosette for trying
    const rx = x0 + w - 36, ry = y0 + 58;
    ctx.fillStyle = '#2f7fb8'; ctx.beginPath(); ctx.moveTo(rx - 8, ry); ctx.lineTo(rx - 14, ry + 26); ctx.lineTo(rx - 4, ry + 20); ctx.lineTo(rx, ry); ctx.fill();
    ctx.beginPath(); ctx.moveTo(rx + 8, ry); ctx.lineTo(rx + 14, ry + 26); ctx.lineTo(rx + 4, ry + 20); ctx.lineTo(rx, ry); ctx.fill();
    ctx.fillStyle = '#7fd0ff'; circle(rx, ry, 13); ctx.fill(); ctx.fillStyle = '#ffffff'; circle(rx, ry, 6); ctx.fill();
  }
}
// a rival team's rider, seen from above (heading +x): body and head in the team's style
function tandemRivalHead(team, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (team.kind === 'rabbit') { ctx.fillStyle = team.skin; ctx.beginPath(); ctx.ellipse(-3, -8, 2, 6, -0.2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(3, -8, 2, 6, 0.2, 0, Math.PI * 2); ctx.fill(); }
  if (team.kind === 'panda') { ctx.fillStyle = '#26243f'; circle(-4.5, -4.5, 2.6); ctx.fill(); circle(4.5, -4.5, 2.6); ctx.fill(); }
  ctx.fillStyle = team.skin; circle(0, 0, 6); ctx.fill();
  ctx.strokeStyle = team.dark; ctx.lineWidth = 1.2; circle(0, 0, 6); ctx.stroke();
  if (team.kind === 'toucan') { ctx.fillStyle = '#ff9a2e'; ctx.beginPath(); ctx.moveTo(2, -1); ctx.lineTo(11, 1.5); ctx.lineTo(2, 3); ctx.closePath(); ctx.fill(); }
  if (team.kind === 'panda') { ctx.fillStyle = '#26243f'; ctx.beginPath(); ctx.ellipse(-2.4, 0, 1.6, 2.2, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(2.4, 0, 1.6, 2.2, -0.3, 0, Math.PI * 2); ctx.fill(); }
  if (team.kind === 'lizard') { ctx.fillStyle = '#4f8a22'; circle(-3, -4.5, 2); ctx.fill(); circle(3, -4.5, 2); ctx.fill(); }
  ctx.fillStyle = '#ffffff'; circle(-2.2, -0.5, 1.5); ctx.fill(); circle(2.2, -0.5, 1.5); ctx.fill();
  ctx.fillStyle = C.ink; circle(-2.2, -0.2, 0.8); ctx.fill(); circle(2.2, -0.2, 0.8); ctx.fill();
  ctx.restore();
}
// a tandem seen from above at s, pos: two wheels, the frame, two riders (heading along the track)
function tandemDrawBike(at, frame, riders, crank, opts) {
  opts = opts || {};
  const sc = opts.scale || 1.12;
  ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(at.a); ctx.scale(sc, sc);
  if (opts.shake) ctx.translate(0, Math.sin(G.clock * 40) * 1.6);
  ctx.fillStyle = 'rgba(28,26,54,0.25)'; ctx.beginPath(); ctx.ellipse(1.5, 3, 20, 6.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#26243f'; rr(9, -1.6, 13, 3.2, 1.6); ctx.fill(); rr(-22, -1.6, 13, 3.2, 1.6); ctx.fill();
  ctx.strokeStyle = frame; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(15, 0); ctx.stroke();
  ctx.strokeStyle = '#26243f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(12, -5.5); ctx.lineTo(12, 5.5); ctx.stroke();
  // feet going round on the pedals
  for (const [rx, ph] of [[-7, 0], [6, 0.5]]) for (const side of [-1, 1]) {
    const k = Math.cos(crank + ph + (side > 0 ? 0 : Math.PI));
    ctx.fillStyle = C.ink; circle(rx + k * 3, side * 5, 1.6); ctx.fill();
  }
  riders.forEach(([rx, draw]) => { ctx.save(); ctx.translate(rx, -(opts.lean || 0) * 2.6); draw(); ctx.restore(); });
  ctx.restore();
}
function tandemDrawFront(st) {
  const K = TANDEM, b = st.bike;
  // rivals and the pace bike
  for (const r of st.rivals) {
    const at = tandemXY(r.s0 + r.d, r.pos);
    tandemDrawBike(at, r.team.col, [[-6, () => tandemBody(r.team.col, r.team.dark, () => tandemRivalHead(r.team, 1.5, 0, 0.72))],
      [6, () => tandemBody(r.team.col, r.team.dark, () => tandemRivalHead(r.team, 1.5, 0, 0.72))]], r.crank, {});
  }
  if (st.pacer && st.pacer.gone < 4) {
    const pc = st.pacer, at = tandemXY(pc.s0 + pc.d, pc.pos);
    ctx.save(); ctx.globalAlpha = clamp(1 - (pc.gone - 2.5) / 1.5, 0, 1);
    ctx.translate(at.x, at.y); ctx.rotate(at.a);
    ctx.fillStyle = 'rgba(28,26,54,0.25)'; ctx.beginPath(); ctx.ellipse(1, 3, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#26243f'; rr(7, -1.8, 11, 3.6, 1.8); ctx.fill(); rr(-17, -1.8, 11, 3.6, 1.8); ctx.fill();
    ctx.fillStyle = C.gold; rr(-12, -5.5, 24, 11, 5); ctx.fill(); ctx.strokeStyle = C.goldDark; ctx.lineWidth = 1.5; rr(-12, -5.5, 24, 11, 5); ctx.stroke();
    // the owl coach in a striped judge's shirt
    ctx.fillStyle = '#ffffff'; rr(-7, -6, 10, 12, 4); ctx.fill();
    ctx.fillStyle = '#26243f'; for (let i = 0; i < 3; i++) ctx.fillRect(-6 + i * 3.4, -6, 1.4, 12);
    ctx.fillStyle = '#9b6a4a'; circle(0, 0, 5.5); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(1.5, -2, 2.1); ctx.fill(); circle(1.5, 2, 2.1); ctx.fill();
    ctx.fillStyle = C.ink; circle(2.2, -2, 1); ctx.fill(); circle(2.2, 2, 1); ctx.fill();
    ctx.fillStyle = '#ffc53d'; ctx.beginPath(); ctx.moveTo(4.5, -1); ctx.lineTo(7.5, 0); ctx.lineTo(4.5, 1); ctx.fill();
    if (pc.on && Math.sin(G.clock * 8) > 0) { ctx.fillStyle = '#ff4d4d'; circle(-13, 0, 2.4); ctx.fill(); }
    ctx.restore();
  }
  // our tandem: the leaner (captain) in front, the pedaler (stoker) behind; a gold frame
  const at = tandemXY(b.s0 + b.d, b.pos);
  if (st.phase === 'race' && b.draft) {
    ctx.strokeStyle = 'rgba(191,234,255,0.7)'; ctx.lineWidth = 2;
    for (const off of [-7, 7]) {
      const p0 = tandemXY(b.s0 + b.d + 22, b.pos + off / 60), p1 = tandemXY(b.s0 + b.d + 42, b.pos + off / 60);
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    }
  }
  const sw = b.swapT > 0 ? Math.sin(Math.min(1, b.swapT / 1.1) * Math.PI) : 0;
  const lift = id => sw * 5 * (id === st.lean ? 1 : -1);
  // (a bit bigger than the rivals' bikes, and bigger still on a small stage such as a phone)
  const small = typeof stageScale === 'number' && stageScale < 0.8;
  tandemDrawBike(at, C.gold, [[-7, () => tandemOurRider(st.ped, b, lift(st.ped))], [6, () => tandemOurRider(st.lean, b, lift(st.lean))]], b.crank,
    { lean: Math.min(1.3, b.lean), shake: b.rail || b.shake > 0, scale: small ? 1.55 : 1.32 });
  // a bright ring round our bike so it is easy to spot (a dark edge so it shows on the boards and on the crowd)
  const ringR = small ? 35 : 31, ringA = 0.75 + 0.25 * Math.sin(G.clock * 4);
  ctx.strokeStyle = 'rgba(28,26,54,0.55)'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(at.x, at.y, ringR, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,214,92,' + ringA.toFixed(3) + ')'; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.arc(at.x, at.y, ringR, 0, Math.PI * 2); ctx.stroke();
  // particles and pops
  for (const q of st.parts) {
    ctx.globalAlpha = clamp(q.life / q.max, 0, 1); ctx.fillStyle = q.col;
    circle(q.x, q.y, q.size); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const big = hudBig();
  for (const q of st.pops) {
    const x = clamp(q.x, 70, W - 70), y = q.y - q.t * 30;
    ctx.globalAlpha = clamp((1.1 - q.t) / 0.3, 0, 1);
    bigText(q.s, x, y, q.size * (big ? 1.25 : 1), q.col, 1 + 0.25 * Math.max(0, 1 - q.t / 0.15));
    ctx.globalAlpha = 1;
  }
}
function tandemBody(col, dark, head) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(-2, 0, 5.5, 6.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();
  head();
}
// Pip or Bo from above: an orange or blue body, the sprout leaf or the ears
function tandemOurRider(id, b, lift) {
  const col = PCOL[id], dark = PDARK[id], s = 1 + (lift > 0 ? lift / 18 : 0);
  ctx.save(); ctx.scale(s, s);
  if (id === 1) { ctx.fillStyle = dark; circle(-1, -5.6, 2.6); ctx.fill(); circle(-1, 5.6, 2.6); ctx.fill(); }
  ctx.fillStyle = col; rr(-6.5, -6, 12, 12, 4.5); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 1.3; rr(-6.5, -6, 12, 12, 4.5); ctx.stroke();
  if (id === 0) { ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(-6, -2, 3.6, 1.8, -0.4, 0, Math.PI * 2); ctx.fill(); }
  if (b.rail) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.1; ctx.beginPath();
    for (const ey of [-2.4, 2.4]) { ctx.moveTo(1.5, ey - 1.3); ctx.lineTo(4, ey + 1.3); ctx.moveTo(4, ey - 1.3); ctx.lineTo(1.5, ey + 1.3); }
    ctx.stroke();
  } else {
    ctx.fillStyle = '#fff'; circle(2.8, -2.4, 1.9); ctx.fill(); circle(2.8, 2.4, 1.9); ctx.fill();
    ctx.fillStyle = C.ink; circle(3.6, -2.4, 1); ctx.fill(); circle(3.6, 2.4, 1); ctx.fill();
  }
  ctx.restore();
}

/* ---------- HUD ---------- */
function tandemHud(st) {
  const K = TANDEM, b = st.bike, big = hudBig(), ps = G.players, play = G.mode === 'play' || G.mode === 'paused', t = G.clock;
  const z = big ? 1.4 : 1;
  // top right: the medals so far (one slot per race)
  {
    const fs = big ? 20 : 14, h = big ? 40 : 28, r = (big ? 9 : 6.5), gap = r * 2 + 6;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const lab = 'Medals', lw = ctx.measureText(lab).width, w = 30 + lw + 10 + st.n * gap;
    const x0 = pill(W - 14, 12, w, h, 'right'), cy = 12 + h / 2 + 0.5;
    text(lab, x0 + 15, cy, fs, C.paper, 'left', 'body');
    for (let i = 0; i < st.n; i++) {
      const pl = st.stats.places[i], x = x0 + 15 + lw + 10 + r + i * gap;
      if (pl) {
        const m = TANDEM_MEDAL[Math.min(pl, 4) - 1];
        ctx.fillStyle = m[1]; circle(x, cy, r); ctx.fill(); ctx.strokeStyle = m[2]; ctx.lineWidth = 1.5; circle(x, cy, r); ctx.stroke();
        text(String(pl), x, cy + 0.5, r * 1.3, C.ink, 'center', 'body');
      } else { ctx.strokeStyle = i === st.k ? C.gold : 'rgba(246,239,223,0.45)'; ctx.lineWidth = 2; circle(x, cy, r - 1); ctx.stroke(); }
    }
  }
  if (!play) return;
  // the job panels, bottom corners: Pip's on the left, Bo's on the right
  const s = tandemWrap(b.s0 + b.d), need = tandemNeed(s, b.v), tol = st.helpLean ? K.tolHelp : K.tol;
  for (const id of [0, 1]) {
    const ped = id === st.ped, pw = Math.round(262 * z), ph = Math.round(58 * z), py = H - ph - 10, px = id === 0 ? 12 : W - 12 - pw;
    const quiet = tandemQuiet(id);
    ctx.fillStyle = 'rgba(28,26,54,0.84)'; rr(px, py, pw, ph, 14 * z); ctx.fill();
    ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(px, py, pw, ph, 14 * z); ctx.stroke();
    text(NAMES[id] + (ped ? ' pedals' : ' leans') + (quiet ? ' (computer)' : ''), px + 12 * z, py + 14 * z, 14 * z, PCOL[id], 'left');
    if (ped) {
      tandemPedalWord(st, id, px + pw - 12 * z, py + 14 * z, z, quiet);
      tandemBeatLane(st, id, px + 10 * z, py + 26 * z, pw - 20 * z, 24 * z, z, quiet);
    } else {
      if (!quiet) text(tandemKey(id, 'in') + ' lean in · ' + tandemKey(id, 'out') + ' sit up', px + pw - 12 * z, py + 14 * z, 11 * z, '#d9d3ef', 'right', 'body');
      tandemLeanBar(st, px + 12 * z, py + 30 * z, pw - 24 * z, 16 * z, z, need, tol);
    }
  }
  // the message line (gold help, the pace bike): centred over the Tandem Cam
  if (st.msg) {
    const fs = big ? 18 : 14, h = big ? 30 : 26;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = Math.min(W - 40, ctx.measureText(st.msg.text).width + 30), y = big ? 150 : 158;
    ctx.globalAlpha = clamp((st.msg.life - st.msg.t) / 0.3, 0, 1);
    pill(W / 2, y, w, h, 'center'); text(st.msg.text, W / 2, y + h / 2 + 0.5, fs, st.msg.col, 'center', 'body'); ctx.globalAlpha = 1;
  }
  // big words: the count, GO!, the bell, the place
  if (st.big) {
    const q = st.big, a = clamp((q.life - q.t) / 0.25, 0, 1), sc = 1 + 0.35 * Math.max(0, 1 - q.t / 0.15);
    ctx.globalAlpha = a; bigText(q.text, W / 2, 285, q.size * (big ? 1.1 : 1), q.col, sc); ctx.globalAlpha = 1;
  }
  if (G.introT > 0) return;
  // prompts over the riders' heads (only for a person's seat)
  const say = (p, str, col, pulse, lift) => {
    if (tandemQuiet(p.id)) return 0;
    const fs = 13 * z;
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(str).width + 20 * z, h = fs + 11 * z, hx = p.x + PW / 2;
    const y = clamp(p.y - 12 * z - lift - h, 12, H - Math.round(58 * z) - 20 - h);
    const x = clamp(hx - w / 2, 18, W - w - 18), sc = pulse ? 1 + 0.06 * Math.sin(t * 14) : 1;
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(28,26,54,0.88)'; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(-w / 2, -h / 2, w, h, h / 2); ctx.stroke();
    text(str, 0, 0.5, fs, col, 'center', 'body');
    ctx.restore();
    return h + 5;
  };
  const P = ps[st.ped], Ln = ps[st.lean];
  let liftP = 0, liftL = 0;
  // 1-player mode: while the computer's speech bubble is up, the person's own prompt waits (one message at a time)
  const talking = id => typeof CPU !== 'undefined' && CPU.bubbles && CPU.bubbles[id] && CPU.bubbles[id].t > 0;
  // (the bike's two riders are close together, so the prompts stack: the leaner's first, the pedaler's above it)
  const hp = st.hints[Ln.id], hpp = st.hints[P.id];
  if (hp) liftL += say(Ln, hp.text, '#ffffff', false, liftL);
  else if (talking(P.id)) { /* (the computer pedaler is saying it) */ }
  else if (st.phase === 'race' && !b.rail) {
    const ahead = tandemNeed(s + b.v * 0.45, b.v);
    if (need - b.lean > tol * 0.7 || ahead - b.lean > tol + 0.12) liftL += say(Ln, 'Lean in! ' + tandemKey(Ln.id, 'in'), C.gold, need - b.lean > tol, liftL);
    else if (b.lean - need > tol * 0.7 && b.lean - ahead > tol * 0.5) liftL += say(Ln, 'Sit up! ' + tandemKey(Ln.id, 'out'), '#bfeaff', b.lean - need > tol, liftL);
  } else if (b.rail && b.railT > 0.9 && !st.hintPend) liftL += say(Ln, 'Lean in! ' + tandemKey(Ln.id, 'in'), C.gold, true, liftL);
  const liftBase = liftL + (liftL ? 2 : 0);
  if (hpp) say(P, hpp.text, '#ffffff', false, liftBase);
  else if (talking(Ln.id)) { /* (the computer leaner is saying it) */ }
  else if (st.phase === 'count' && st.phT > 0.2) say(P, 'Pedal on the beat! ' + tandemKey(P.id, 'pedal'), C.gold, true, liftBase);
  else if (st.phase === 'race' && !b.rail && st.rt - st.lastStroke > 1.8) say(P, 'Pedal! ' + tandemKey(P.id, 'pedal'), C.gold, true, liftBase);
}
// the pedaler's beat lane: beats come in from the right to the ring; each shows the foot to press
function tandemBeatLane(st, id, x, y, w, h, z, quiet) {
  const K = TANDEM, bt = st.beat, b = st.bike, help = st.helpDrum;
  ctx.fillStyle = help ? 'rgba(255,197,61,0.18)' : 'rgba(255,255,255,0.08)'; rr(x, y, w, h, h / 2); ctx.fill();
  if (help) { ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5; rr(x, y, w, h, h / 2); ctx.stroke(); }
  const hx = x + h * 0.7, cy = y + h / 2, px = 58 * z;   // px per beat
  const now = st.phase === 'wait' ? 0 : st.rt;
  // the hit ring (pulses on the beat)
  const pulse = st.phase !== 'wait' && bt.hitT < 0.12 ? 1 - bt.hitT / 0.12 : 0;
  ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5 + 2 * pulse; circle(hx, cy, h * 0.42 + pulse * 2); ctx.stroke();
  // the notes: the next few beats (the judged one is gone)
  let foot = 1 - b.lastFoot;
  if (b.lastFoot < 0) foot = 0;
  const k0 = Math.max(bt.judged + 1, Math.ceil((now - bt.base) / bt.P - 0.5));
  ctx.save(); rr(x, y, w, h, h / 2); ctx.clip();
  for (let k = k0, n = 0; n < 6; k++, n++) {
    const tt = bt.base + k * bt.P - now, nx = hx + tt / bt.P * px;
    if (nx > x + w + 20) break;
    const f = (foot + n) % 2, lab = quiet ? (f ? '▶' : '◀') : tandemKey(id, f ? 'right' : 'left');
    // (neutral colours, not Pip's orange or Bo's blue, so nobody reads a key as the other player's job: the left foot is
    // a white circle, the right foot a mint rounded square)
    const r = h * 0.36, near = Math.abs(tt) < K.good * (help ? K.bigDrum : 1);
    ctx.fillStyle = near ? C.gold : f ? '#7fe0c8' : '#f6efdf';
    if (k < K.count - 1 && st.phase !== 'race') ctx.fillStyle = 'rgba(217,211,239,0.55)';
    if (f) rr(nx - r, cy - r, r * 2, r * 2, r * 0.45); else circle(nx, cy, r);
    ctx.fill();
    text(lab, nx, cy + 0.5, 11 * z, C.ink, 'center', 'body');
  }
  ctx.restore();
  // the last press flashes in the ring: gold for Perfect, green for Good, pink for off the beat
  const gr = st.grade;
  if (gr && gr.t < 0.35) {
    ctx.globalAlpha = clamp((0.35 - gr.t) / 0.2, 0, 1);
    ctx.fillStyle = gr.col; circle(hx, cy, h * 0.42 * (1 + gr.t)); ctx.fill();
    ctx.globalAlpha = 1;
  }
}
// the word on the pedaler's panel, top right: a streak, the last press's grade, or the keys
function tandemPedalWord(st, id, x, y, z, quiet) {
  const gr = st.grade;
  if (st.uiPop) { ctx.globalAlpha = clamp((1.4 - st.uiPop.t) / 0.3, 0, 1); text(st.uiPop.s, x, y, 12 * z, st.uiPop.col, 'right', 'body'); ctx.globalAlpha = 1; return; }
  if (gr && gr.t < 0.7) { text(gr.word, x, y, 13 * z, gr.col, 'right', 'body'); return; }
  if (!quiet) text(tandemKey(id, 'pedal') + ' on the beat', x, y, 11 * z, '#d9d3ef', 'right', 'body');
}
// the leaner's gauge: the gold wedge is the lean the bank needs, the needle is the lean
function tandemLeanBar(st, x, y, w, h, z, need, tol) {
  const K = TANDEM, b = st.bike, X = v => x + w * clamp(v / K.leanMax, 0, 1), t = G.clock;
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(x, y, w, h, h / 2); ctx.fill();
  // labels at the ends
  const lo = Math.max(0, need - tol), hi = Math.min(K.leanMax, need + tol), ok = Math.abs(need - b.lean) <= tol && !b.rail;
  ctx.fillStyle = st.helpLean ? C.gold : ok ? '#8fe3b0' : 'rgba(255,197,61,0.85)';
  rr(X(lo), y + 1, Math.max(6, X(hi) - X(lo)), h - 2, (h - 2) / 2); ctx.fill();
  text('up', x + 5 * z, y + h / 2 + 0.5, 9 * z, '#d9d3ef', 'left', 'body');
  text('in', x + w - 5 * z, y + h / 2 + 0.5, 9 * z, '#d9d3ef', 'right', 'body');
  const mx = X(b.lean), id = st.lean;
  ctx.fillStyle = PCOL[id]; ctx.fillRect(mx - 1.5, y - 3, 3, h + 6);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(mx, y + h + 1); ctx.lineTo(mx - 6 * z, y + h + 8 * z); ctx.lineTo(mx + 6 * z, y + h + 8 * z); ctx.closePath(); ctx.fillStyle = PCOL[id]; ctx.fill(); ctx.stroke();
  if (b.rail) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2 + 1.5 * Math.abs(Math.sin(t * 8)); rr(x - 2, y - 2, w + 4, h + 4, h / 2 + 2); ctx.stroke(); }
}

/* ---------- sounds ---------- */
Sfx.extra.tandemDrum = function () { this.tone(110, 0.12, 'sine', 0.05, 60); this.tone(220, 0.04, 'triangle', 0.02, 140); };
Sfx.extra.tandemDrumBig = function () { this.tone(90, 0.18, 'sine', 0.07, 45); this.tone(180, 0.06, 'triangle', 0.03, 110); };
Sfx.extra.tandemTick = function (p) { this.tone(700 * p, 0.04, 'square', 0.02); };
Sfx.extra.tandemPerfect = function (p) { this.tone(880 * p, 0.06, 'triangle', 0.045); this.tone(1320 * p, 0.08, 'triangle', 0.035, null, 0.03); };
Sfx.extra.tandemGood = function (p) { this.tone(660 * p, 0.06, 'triangle', 0.04); };
Sfx.extra.tandemOff = function (p) { this.tone(260 * p, 0.07, 'sawtooth', 0.02, 190 * p); };
Sfx.extra.tandemLight = function () { this.tone(520, 0.14, 'square', 0.04); };
Sfx.extra.tandemGun = function () { this.tone(1200, 0.05, 'square', 0.05, 300); this.tone(160, 0.2, 'triangle', 0.08, 60); };
Sfx.extra.tandemWobble = function () { for (let i = 0; i < 4; i++) this.tone(i % 2 ? 340 : 420, 0.07, 'triangle', 0.045, null, i * 0.07); };
Sfx.extra.tandemRail = function () { this.tone(1400, 0.16, 'sawtooth', 0.012, 700); };
Sfx.extra.tandemPhew = function () { this.tone(500, 0.16, 'sine', 0.05, 820); };
Sfx.extra.tandemBump = function () { this.tone(180, 0.1, 'triangle', 0.06, 110); };
Sfx.extra.tandemBell = function () { [1568, 1568, 1568].forEach((f, i) => { this.tone(f, 0.25, 'sine', 0.05, null, i * 0.16); this.tone(f * 2.4, 0.12, 'sine', 0.015, null, i * 0.16); }); };
Sfx.extra.tandemWhistle = function () { this.tone(2200, 0.12, 'square', 0.025); this.tone(2400, 0.3, 'square', 0.025, null, 0.14); };
Sfx.extra.tandemBeep = function () { this.tone(880, 0.08, 'triangle', 0.03); };
Sfx.extra.tandemCheer = function () { for (let i = 0; i < 8; i++) this.tone(500 + Math.random() * 500, 0.18, 'sawtooth', 0.008, 300 + Math.random() * 400, i * 0.03); };
Sfx.extra.tandemWin = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.06, null, i * 0.08)); Sfx.extra.tandemCheer.call(this); };
Sfx.extra.tandemFanfare = function () { [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.2, 'square', 0.035, null, i * 0.12)); this.tone(1047, 0.4, 'triangle', 0.05, null, 0.5); };
Sfx.extra.tandemSwap = function () { [523, 659, 784].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.tandemHelp = function () { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.05, null, i * 0.07)); };
