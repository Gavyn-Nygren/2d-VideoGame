/* Pip & Bo - Level 40-1 The Iron Colossus: Part 8 'thumbs' (Thumb War). */
'use strict';

/* ===== 40-1 Part 8: Thumb War (IRON_PHASES.thumbs) =================================================================
   Versus, best of 3, inside the team level (the level clock is stopped; knocks are not Clangs). The Colossus's two
   giant hands lie clasped in Sunny Meadow, still wound up. Pip sits in the left wrist cab, Bo in the right; each
   drives a thumb the size of a bus. Tick referees from a daisy with a tiny flag. One screen, no camera.
   A THUMB (ph.th[id]) is in one state:
     up      the rest pose: action -> rear, ▲ (jump) -> juke, ▼ held -> tuck; ◀ ▶ lean in or back (range)
     rear    the wind-up (0.25 s, "hup"): ▼ cancels it into a tuck (a feint); then strike
     strike  0.12 s, then it lands (ironThumbHit): on a juking or tucked thumb, or out of reach: a WHIFF (the slammer
             lies flat 0.7 s); on a flat or cramped thumb, or one with an empty bar: a PIN; on an upright thumb: a
             KNOCK (one bolt off the bar of 5; two with the gold thimble); two strikes at once: CLONK, both bounce
     flat    after a whiff (or thrown off by an escape): open to a pin
     back    bouncing back after a knock or a clonk (0.35 s)
     tuck    hidden behind the knuckles: safe, but after 1.2 s (tuck time builds up, drains when up) it CRAMPS
     cramp   0.6 s stuck up and shaking: open to a pin
     juke    a quick lean back (0.2 s, then 0.6 s before the next): a slam aimed at it whiffs
     pinned / pinning   during a pin count
   THE PIN: Tick counts ONE! TWO! THREE! (1.8 s; each escape in the round makes the next 0.3 s shorter, never under
   0.9 s). The flag bounces between the words: three action taps each on a bounce (inside tapWin) escape (the pinner is
   thrown off, flat 0.5 s); a tap off the beat starts the three over. THREE! takes the round.
   A ROUND is capped at 40 s: the fuller bar wins; equal bars go to a SLAM-OFF (the next knock or pin wins; after 20 s
   of slam-off the round is played again). The loser of a round wears the gold thimble for the first 10 s of the next.
   First to 2 rounds is the Thumb champ: the part (and the level) ends with the ending (IRON_END.draw, below).
   =================================================================================================================== */

const IRONTHUMB = {
  pivot: [404, 556], pivY: 334, len: 150,
  rear: 0.25, strike: 0.12, whiff: 0.7, back: 0.35, tuckMax: 1.2, cramp: 0.6, juke: 0.2, jukeCd: 0.6, popFlat: 0.5,
  stam: 5, lean: 16, leanV: 80, dist: 110, reach: 118,
  count: 1.8, countMin: 0.9, escStep: 0.3, tapWin: 0.17,
  cap: 40, slamOff: 20, thimble: 10, ready: 1.6, between: 2.8, wins: 2,
  cab: [[150, 438], [810, 438]], tick: [480, 503],
};

function ironThumbSetup(st) {
  const ph = st.ph, K = IRONTHUMB;
  st.cam = { x: 0, y: 0 };
  ph.t = 0; ph.wins = [0, 0]; ph.round = 1; ph.thimble = -1; ph.words = [];
  ironThumbRound(st, true);
  G.players.forEach((p, k) => Object.assign(p, { x: K.cab[k][0] - p.w / 2, y: K.cab[k][1] - p.h, vx: 0, vy: 0, face: k ? -1 : 1, grounded: true, alive: true }));
  const T = st.tick; T.ride = -1; T.hidden = false; T.x = K.tick[0]; T.y = K.tick[1]; T.pose = 'referee'; T.face = 1;
  ph.prep = [() => IRON_ART.thumbClasp(), () => IRON_ART.thumb(0), () => IRON_ART.thumb(1), () => IRON_ART.thumbDaisy(), () => IRON_ART.thumbLift(0), () => IRON_ART.thumbLift(1)];
  for (let l = 0; l < 3; l++) for (let c = 0; c < 2; c++) ph.prep.push(() => IRON_ART.meadow(l, c));
  ph.prep.push(() => IRON_ART.fallKey());
}
function ironThumbRound(st, first) {
  const ph = st.ph, K = IRONTHUMB;
  ph.th = [0, 1].map(id => ({ id, s: 'up', t: 0, lean: 0, tuckT: 0, jukeCd: 0, stam: K.stam, ang: 0, sink: 0, knocks: 0 }));
  ph.mode = 'ready'; ph.mt = 0; ph.rt = 0; ph.slamOff = false; ph.sT = 0; ph.pin = null; ph.escN = 0; ph.winner = -1;
  if (!first) ironNews(st, 'Round ' + ph.round + '!' + (ph.thimble >= 0 ? ' ' + NAMES[ph.thimble] + ' wears the gold thimble: knocks count double for 10 s.' : ''), ph.thimble >= 0, 3.4);
}
// where a thumb's pivot is now (it leans in or back a little)
const ironThumbPivot = (ph, id) => IRONTHUMB.pivot[id] + (id ? -1 : 1) * ph.th[id].lean * 0.8;
// the gap the slam must cross (smaller when either leans in)
const ironThumbGap = ph => IRONTHUMB.dist - ph.th[0].lean - ph.th[1].lean;
function ironThumbSay(st, text, x, y, size = 30, col) { ironWord(st, text, x, y, size, { life: 1.1, rise: 16, col }); }

function ironThumbStep(st, dt) {
  const ph = st.ph, K = IRONTHUMB, ps = G.players;
  if (ph.prep && ph.prep.length) ph.prep.shift()();
  ph.t += dt;
  const T = st.tick; T.x = K.tick[0]; T.y = K.tick[1];
  for (const p of ps) { p.x = K.cab[p.id][0] - p.w / 2; p.y = K.cab[p.id][1] - p.h; p.vx = 0; p.vy = 0; p.grounded = true; }
  if (st.idle) { for (const p of ps) { p.pendingAct = false; p.pendingJump = false; } return; }
  if (ph.mode === 'ready') {
    ph.mt += dt;
    T.pose = ph.mt < K.ready - 0.4 ? 'referee' : 'cheer';
    if (ph.mt >= K.ready) { ph.mode = 'fight'; ironThumbSay(st, 'WAR!', 480, 200, 40, '#c0402a'); Sfx.play('ironthumbGo'); }
    for (const p of ps) { p.pendingAct = false; p.pendingJump = false; }
    ironThumbAnim(st, dt);
    return;
  }
  if (ph.mode === 'over') {
    ph.mt += dt;
    for (const p of ps) { p.pendingAct = false; p.pendingJump = false; }
    T.pose = 'point'; T.face = ph.winner ? 1 : -1;
    ironThumbAnim(st, dt);
    if (ph.mt >= K.between) {
      if (ph.wins[ph.winner] >= K.wins) {
        const s = ironStats(st); s.wins = ph.wins.slice(); s.champ = ph.winner;
        ironPhaseDone(st, { say: NAMES[ph.winner] + ' is the Thumb champ! ' + ph.wins[ph.winner] + ' to ' + ph.wins[1 - ph.winner] + '.' });
        ph.mode = 'done';
      } else { ph.round++; ironThumbRound(st, false); }
    }
    return;
  }
  if (ph.mode !== 'fight') { ironThumbAnim(st, dt); return; }
  ph.rt += dt;
  if (ph.pin) ironThumbPin(st, dt);
  else {
    T.pose = 'referee'; T.face = 1;
    for (const p of ps) ironThumbControl(st, p, dt);
  }
  for (const p of ps) { p.pendingAct = false; p.pendingJump = false; }
  // the clock: at 40 s the fuller bar wins; equal bars go to a slam-off
  if (!ph.pin && ph.mode === 'fight') {
    if (!ph.slamOff && ph.rt >= K.cap) {
      const a = ph.th[0].stam, b = ph.th[1].stam;
      if (a !== b) { ironThumbSay(st, 'TIME!', 480, 180, 34); ironThumbRoundWon(st, a > b ? 0 : 1, 'on time'); }
      else { ph.slamOff = true; ph.sT = 0; ironNews(st, 'SLAM-OFF! The next knock wins the round.', true, 3); ironThumbSay(st, 'SLAM-OFF!', 480, 180, 34, '#c0402a'); Sfx.play('ironthumbGo'); }
    } else if (ph.slamOff && (ph.sT += dt) >= K.slamOff) { ironNews(st, 'Nobody landed one! Round ' + ph.round + ' again.', false, 3); ironThumbRound(st, false); }
  }
  ironThumbAnim(st, dt);
}
// one thumb's controls and timers (not during a pin)
function ironThumbControl(st, p, dt) {
  const ph = st.ph, K = IRONTHUMB, h = ph.th[p.id], i = p.input, toward = p.id ? i.left : i.right, away = p.id ? i.right : i.left;
  h.t += dt; h.jukeCd = Math.max(0, h.jukeCd - dt);
  if (h.s !== 'tuck') h.tuckT = Math.max(0, h.tuckT - dt);
  if (h.s === 'up' || h.s === 'rear' || h.s === 'tuck') h.lean = clamp(h.lean + ((toward ? 1 : 0) - (away ? 1 : 0)) * K.leanV * dt, -K.lean, K.lean);
  const act = p.pendingAct, juke = p.pendingJump || (i.up && !h.upWas);
  h.upWas = !!i.up;
  const go = (s) => { h.s = s; h.t = 0; };
  switch (h.s) {
    case 'up':
      if (act) { go('rear'); Sfx.play('ironthumbRear'); ironThumbSay(st, 'HUP!', ironThumbPivot(ph, p.id), K.pivY - 175, 14); }
      else if (juke && h.jukeCd <= 0) { go('juke'); Sfx.play('ironthumbJuke'); }
      else if (i.down) { go('tuck'); Sfx.play('ironthumbTuck'); }
      break;
    case 'rear':
      if (i.down) { go('tuck'); Sfx.play('ironthumbTuck'); }
      else if (h.t >= K.rear) { go('strike'); Sfx.play('ironthumbSwing'); }
      break;
    case 'strike': if (h.t >= K.strike) ironThumbHit(st, p.id); break;
    case 'flat': if (h.t >= (h.flatT || K.whiff)) go('up'); break;
    case 'back': if (h.t >= K.back) go('up'); break;
    case 'tuck':
      h.tuckT += dt;
      if (h.tuckT >= K.tuckMax) { go('cramp'); h.tuckT = 0; Sfx.play('ironthumbCramp'); ironThumbSay(st, 'CRAMP!', ironThumbPivot(ph, p.id), K.pivY - 170, 16, '#c0402a'); }
      else if (!i.down) go('up');
      break;
    case 'cramp': if (h.t >= K.cramp) go('up'); break;
    case 'juke': if (h.t >= K.juke) { go('up'); h.jukeCd = K.jukeCd; } break;
  }
}
// a slam lands
function ironThumbHit(st, a) {
  const ph = st.ph, K = IRONTHUMB, A = ph.th[a], b = 1 - a, B = ph.th[b], bx = ironThumbPivot(ph, b);
  const go = (h, s, flatT) => { h.s = s; h.t = 0; h.flatT = flatT; };
  if (B.s === 'strike') { go(A, 'back'); go(B, 'back'); ironThumbSay(st, 'CLONK!', 480, K.pivY - 150, 26); Sfx.play('ironthumbClonk'); return; }
  if (B.s === 'juke' || B.s === 'tuck' || ironThumbGap(ph) > K.reach) {
    go(A, 'flat', K.whiff); ironThumbSay(st, 'WHIFF!', bx, K.pivY - 40, 20); Sfx.play('ironthumbWhiff');
    if (B.s === 'juke') ironStats(st).jukes = (ironStats(st).jukes || 0) + 1;
    return;
  }
  if (B.s === 'flat' || B.s === 'cramp' || B.stam <= 0) { ironThumbPinStart(st, a); return; }
  const dmg = ph.thimble === a && ph.rt < K.thimble ? 2 : 1;
  B.stam = Math.max(0, B.stam - dmg); A.knocks++;
  go(A, 'back'); go(B, 'back');
  ironThumbSay(st, dmg > 1 ? 'DOUBLE KNOCK!' : 'KNOCK!', bx, K.pivY - 160, 22);
  Sfx.play('ironthumbKnock');
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.12);
  if (ph.slamOff) ironThumbRoundWon(st, a, 'slam-off');
  else if (B.stam <= 0) ironNews(st, NAMES[b] + '\'s bar is empty: the next knock is a pin!', false, 2.4);
}
function ironThumbPinStart(st, a) {
  const ph = st.ph, K = IRONTHUMB, b = 1 - a, T = Math.max(K.countMin, K.count - ph.escN * K.escStep);
  ph.pin = { a, b, t: 0, T, n: 0, good: 0, hit: [false, false, false], beats: [0.5, 1.5, 2.5].map(k => k * T / 3) };
  ph.th[a].s = 'pinning'; ph.th[b].s = 'pinned'; ph.th[a].t = ph.th[b].t = 0;
  Sfx.play('ironthumbSlam'); if (!reduceMotion) G.shake = Math.max(G.shake, 0.3);
  ironThumbSay(st, 'PIN!', ironThumbPivot(ph, b), K.pivY - 120, 30, '#c0402a');
  ironHint(st, b, 'Wriggle! Tap ' + ironKey(b, 'act') + ' when the flag bounces!', { life: 2.2 });
}
// the count: ONE! TWO! THREE!, the flag bouncing between; three taps on the bounces escape
function ironThumbPin(st, dt) {
  const ph = st.ph, K = IRONTHUMB, P = ph.pin, pb = G.players[P.b], T = st.tick;
  P.t += dt; T.pose = 'referee'; T.face = P.a ? 1 : -1;
  if (pb.pendingAct) {
    const i = P.beats.findIndex((bt, k) => !P.hit[k] && Math.abs(P.t - bt) <= K.tapWin);
    if (i >= 0) { P.hit[i] = true; P.good++; Sfx.play('ironthumbWriggle', 1 + P.good * 0.15); }
    else { P.good = 0; P.hit = [false, false, false]; P.miss = 0.3; Sfx.play('ironthumbWriggle', 0.7); }
  }
  pb.pendingAct = false;
  if (P.miss > 0) P.miss -= dt;
  if (P.good >= 3) {
    // escape: the pinner is thrown off
    const A = ph.th[P.a], B = ph.th[P.b];
    B.s = 'back'; B.t = 0; B.stam = Math.max(B.stam, 1);
    A.s = 'flat'; A.t = 0; A.flatT = K.popFlat;
    ph.escN++; ph.pin = null;
    ironThumbSay(st, 'POP!', ironThumbPivot(ph, P.b), K.pivY - 150, 28, PCOL[P.b]);
    Sfx.play('ironthumbEscape');
    ironStats(st).escapes = (ironStats(st).escapes || 0) + 1;
    return;
  }
  const words = ['ONE!', 'TWO!', 'THREE!'];
  while (P.n < 3 && P.t >= (P.n + 1) * P.T / 3) {
    ironThumbSay(st, words[P.n], K.tick[0], K.tick[1] - 70 - P.n * 6, 30 + P.n * 6, P.n === 2 ? '#c0402a' : null);
    Sfx.play('ironthumbCount', P.n);
    P.n++;
  }
  if (P.n >= 3) { ph.pin = null; ironThumbRoundWon(st, P.a, 'pin'); }
}
function ironThumbRoundWon(st, w, how) {
  const ph = st.ph;
  if (ph.mode !== 'fight') return;
  ph.mode = 'over'; ph.mt = 0; ph.winner = w; ph.wins[w]++; ph.thimble = 1 - w; ph.pin = null;
  for (const h of ph.th) if (h.s !== 'pinned' && h.s !== 'pinning') { h.s = 'up'; h.t = 0; }
  const champ = ph.wins[w] >= IRONTHUMB.wins;
  ironNews(st, champ ? NAMES[w] + ' wins the Thumb War!' : NAMES[w] + ' takes round ' + ph.round + '! (' + ph.wins[0] + ' - ' + ph.wins[1] + ')', true, 2.6);
  Sfx.play(champ ? 'ironthumbChamp' : 'ironthumbRound');
  ironCelebrate(st, 0.6);
  (ironStats(st).how || (ironStats(st).how = [])).push(how);
}
// the thumbs' angles (radians; 0 upright, + toward the opponent) and sink (px, a tuck), eased toward each state's pose
function ironThumbAnim(st, dt) {
  const ph = st.ph;
  for (const h of ph.th) {
    let a = 0, sink = 0, k = 14;
    switch (h.s) {
      case 'rear': a = -0.42 * Math.min(1, h.t / 0.12) + Math.sin(ph.t * 60) * 0.02; k = 22; break;
      case 'strike': a = 1.2; k = 40; break;
      case 'flat': a = h.flatT === IRONTHUMB.popFlat ? -1.1 : 1.42; k = 18; break;
      case 'back': a = h.t < 0.12 ? -0.25 : 0; k = 16; break;
      case 'tuck': sink = 118; k = 18; break;
      case 'cramp': a = Math.sin(ph.t * 40) * 0.07; break;
      case 'juke': a = -0.62; k = 34; break;
      case 'pinning': a = 1.26 + Math.sin(ph.t * 18) * 0.015; k = 30; break;
      case 'pinned': a = -1.18 + Math.sin(ph.t * 24) * 0.04 * (ph.pin && ph.pin.miss > 0 ? 3 : 1); k = 30; break;
    }
    h.ang += (a - h.ang) * Math.min(1, dt * k);
    h.sink += (sink - h.sink) * Math.min(1, dt * 16);
  }
}

/* --- drawing --- */
// the meadow behind: o.y1 / o.y2 shift the far and near hills (the ending raises the view a little)
function ironThumbDrawSky(st, o = {}) {
  const y1 = o.y1 != null ? o.y1 : 26, y2 = o.y2 != null ? o.y2 : 70;
  SKETCH.paper(ctx, 'dawn');
  SKETCH.blit(ctx, IRON_ART.meadow(0, 0), -210, -10); SKETCH.blit(ctx, IRON_ART.meadow(0, 1), 750, -10);
  SKETCH.glow(ctx, 480, 362, 420, '255,196,120', 0.28);
  SKETCH.blit(ctx, IRON_ART.meadow(1, 1), -120, y1); SKETCH.blit(ctx, IRON_ART.meadow(1, 0), 840, y1);
  SKETCH.blit(ctx, IRON_ART.meadow(2, 1), -340, y2); SKETCH.blit(ctx, IRON_ART.meadow(2, 0), 620, y2);
}
function ironThumbDrawThumb(st, id) {
  const ph = st.ph, K = IRONTHUMB, h = ph.th[id], s = id ? -1 : 1, x = ironThumbPivot(ph, id);
  SKETCH.blit(ctx, IRON_ART.thumb(id), x, K.pivY + h.sink, { rot: h.ang * s });
  const gold = ph.thimble === id && ph.mode === 'fight' && ph.rt < K.thimble;
  if (gold || h.s === 'cramp') {
    const tx = x + Math.sin(h.ang * s) * (K.len - 14), ty = K.pivY + h.sink - Math.cos(h.ang * s) * (K.len - 14), d = SKETCH.live(ctx, 7100 + id, SKETCH.boil());
    if (gold) {
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(h.ang * s);
      d.shape([[-26, 14], [-22, -16], [-12, -26], [12, -26], [22, -16], [26, 14]], { fill: IRON_P.core, w: 2, corner: 30 });
      for (let k = 0; k < 4; k++) for (let j = 0; j < 5; j++) d.ellipse(-16 + j * 8, -16 + k * 8, 1.4, 1.4, { fill: IRON_P.ochreDeep, w: 0.4 });
      ctx.restore();
    }
    if (h.s === 'cramp') for (let k = 0; k < 3; k++) d.stroke([[tx - 30 + k * 30, ty - 40], [tx - 26 + k * 30, ty - 48], [tx - 32 + k * 30, ty - 54], [tx - 27 + k * 30, ty - 62]], { w: 1.6, col: '#c0402a', sh: 0 });
  }
}
function ironThumbDrawBack(st) {
  const ph = st.ph;
  // the pinned (or tucked) thumb goes under the other one
  const order = ph.th[0].s === 'pinned' || ph.th[0].sink > 20 ? [0, 1] : ph.th[1].s === 'pinned' || ph.th[1].sink > 20 ? [1, 0] : ph.th[0].s === 'strike' || ph.th[0].s === 'flat' ? [1, 0] : [0, 1];
  for (const id of order) ironThumbDrawThumb(st, id);
  SKETCH.blit(ctx, IRON_ART.thumbClasp(), 0, 0);
}
function ironThumbDraw(st) {
  const ph = st.ph, K = IRONTHUMB;
  SKETCH.blit(ctx, IRON_ART.thumbDaisy(), K.tick[0], K.tick[1] + 4);
  // Tick's flag bounces between the words of a count
  const P = ph.pin, T = st.tick;
  if (P) { const near = P.beats.reduce((m, bt) => Math.min(m, Math.abs(P.t - bt)), 9); T.y = K.tick[1] - Math.max(0, 1 - near / 0.14) * 7; }
  ironTickDrawAt(st);
  if (P) {
    // the beat marks: three bolts over the pinned thumb, lit as each good tap lands
    const d = SKETCH.live(ctx, 7120, SKETCH.boil()), bx = ironThumbPivot(ph, P.b) + (P.b ? 70 : -70);
    for (let k = 0; k < 3; k++) {
      const on = P.hit[k], due = Math.abs(P.t - P.beats[k]) <= K.tapWin;
      d.ellipse(bx - 24 + k * 24, K.pivY - 116, due ? 10 : 8, due ? 10 : 8, { fill: on ? PCOL[P.b] : due ? IRON_P.coreHot : '#e8dcc0', w: due ? 2.4 : 1.6 });
    }
  }
}
function ironThumbDrawTop(st) {
  const ph = st.ph, K = IRONTHUMB, d = SKETCH.live(ctx, 7130, SKETCH.boil());
  // the cab lips in front of the heroes' laps
  for (const id of [0, 1]) SKETCH.blit(ctx, IRON_ART.thumbCabLip(id), K.cab[id][0], K.cab[id][1] + 2);
  // each player's bar: five bolts, and their round wins as champion bolts
  for (const id of [0, 1]) {
    const h = ph.th[id], x0 = id ? W - 250 : 34, y = 128;
    d.word(NAMES[id].toUpperCase(), id ? x0 + 216 : x0, y, 16, { align: id ? 'right' : 'left', col: PCOL[id], w: 2.2 });
    for (let k = 0; k < K.stam; k++) {
      const x = id ? x0 + 196 - k * 30 - 64 : x0 + 64 + k * 30, on = k < h.stam;
      d.ellipse(x, y - 6, 10, 10, { fill: on ? IRON_P.iron : '#ece2cc', w: on ? 1.8 : 1.1, alpha: on ? 1 : 0.6 });
      if (on) d.ellipse(x - 2, y - 8, 3, 3, { fill: '#fbf3df', w: 0, ink: false });
    }
    for (let k = 0; k < ph.wins[id]; k++) { const x = id ? x0 + 210 - k * 26 : x0 + 6 + k * 26; d.shape([[x, y + 12], [x + 8, y + 20], [x, y + 30], [x - 8, y + 20]], { fill: IRON_P.core, w: 1.6, corner: 30 }); }
  }
  if (ph.mode === 'ready') d.word(ph.mt < K.ready - 0.4 ? 'ROUND ' + ph.round : 'THUMBS UP...', 480, 196, 30, { align: 'center', col: SKETCH.INK, w: 3 });
  if (ph.mode === 'fight' && !ph.slamOff && ph.rt > K.cap - 10) d.word(String(Math.ceil(K.cap - ph.rt)), 480, 172, 26, { align: 'center', col: '#c0402a', w: 2.6 });
}
// the ending: the winner's hand lifts both heroes and Tick up over Sunny Meadow at sunrise; friends wave on the hill;
// the great key turns in the grass while Tick winds his own; flecks of ink fall as confetti (the core draws those)
IRON_END.draw = st => {
  const c = st.cut, t = c.t, e = Math.min(1, t / 3.2), ease = e * e * (3 - 2 * e), lift = ease * 50;
  const s = st.stats.thumbs || {}, w = s.champ != null && s.champ >= 0 ? s.champ : 0;
  ironThumbDrawSky(st, { y1: -30 + lift * 0.4, y2: -70 + lift });
  // friends on the near hill, small, waving
  const d = SKETCH.live(ctx, 7140, SKETCH.boil()), gy = 452 - 70 + lift - 2;
  const friends = [[90, 'dino'], [190, 'snow'], [300, 'robot'], [660, 'rocket'], [760, 'pumpkin'], [880, 'penguin']];
  for (const [x, kind] of friends) ironThumbFriend(d, x, gy + Math.sin(x) * 6, kind, t);
  // the great key in the grass, its wings turning
  SKETCH.blit(ctx, IRON_ART.fallKey(), 830, gy + 64, { sx: 0.55 * Math.cos(t * 2.4), sy: 0.55 });
  // the hand, rising with them on its palm
  const hy = 640 - ease * 300;
  SKETCH.blit(ctx, IRON_ART.thumbLift(w), 480, hy);
  G.players.forEach((p, k) => SKETCH.hero(ctx, p, { force: true, x: 480 + (k ? 58 : -58), y: hy - 2, face: k ? -1 : 1, mood: 'joy' }));
  ironTickDraw(ctx, 480, hy - 2, { pose: 'cheer', face: 1, s: 1.1, t, key: t * 6, mood: 'happy' });
  if (t > 1.2) d.word('THUMB CHAMP: ' + NAMES[w].toUpperCase(), 480, 140, 26, { align: 'center', col: PCOL[w], w: 3, alpha: Math.min(1, (t - 1.2) * 2) });
};
// a tiny friend from an old world on the hill, one arm waving
function ironThumbFriend(d, x, y, kind, t) {
  const P = IRON_P, wv = Math.sin(t * 7 + x) * 4;
  if (kind === 'dino') { d.shape([[x - 16, y], [x - 10, y - 10], [x + 4, y - 12], [x + 12, y - 22], [x + 18, y - 20], [x + 12, y - 10], [x + 14, y], [x + 8, y], [x + 4, y - 6], [x - 6, y - 6], [x - 8, y]], { fill: P.greyBlue, w: 1, corner: 40 }); d.stroke([[x + 10, y - 12], [x + 18, y - 18 + wv]], { w: 1.4 }); }
  else if (kind === 'snow') { d.ellipse(x, y - 8, 8, 8, { fill: '#f6ecd4', w: 1 }); d.ellipse(x, y - 21, 6, 6, { fill: '#f6ecd4', w: 1 }); d.stroke([[x + 6, y - 11], [x + 15, y - 20 + wv]], { w: 1.2 }); d.line(x + 4, y - 21, x + 9, y - 20, { w: 1.4, col: P.ember, ov: 0 }); }
  else if (kind === 'robot') { d.shape(SKETCH.box(x - 7, y - 20, 14, 14), { fill: P.greyBlue, w: 1 }); d.shape(SKETCH.box(x - 5, y - 29, 10, 8), { fill: P.greyBlue, w: 1 }); d.stroke([[x + 7, y - 16], [x + 15, y - 24 + wv]], { w: 1.4 }); d.line(x - 3, y - 6, x - 3, y, { w: 1.2, ov: 0 }); d.line(x + 3, y - 6, x + 3, y, { w: 1.2, ov: 0 }); }
  else if (kind === 'rocket') { d.shape([[x, y - 34], [x + 6, y - 20], [x + 6, y - 4], [x - 6, y - 4], [x - 6, y - 20]], { fill: '#e8e0d0', w: 1 }); d.shape([[x - 6, y - 9], [x - 10, y], [x - 6, y - 4]], { fill: P.rustLight, w: 0.8 }); d.shape([[x + 6, y - 9], [x + 10, y], [x + 6, y - 4]], { fill: P.rustLight, w: 0.8 }); }
  else if (kind === 'pumpkin') { d.ellipse(x, y - 8, 10, 8, { fill: P.ember, w: 1 }); d.stroke([[x, y - 16], [x + 2, y - 21]], { w: 1.4, col: P.greenDark }); d.stroke([[x + 9, y - 10], [x + 16, y - 18 + wv]], { w: 1.2 }); }
  else { d.ellipse(x, y - 10, 7, 10, { fill: P.soot, w: 1 }); d.ellipse(x, y - 8, 4, 7, { fill: '#f6ecd4', w: 0.6 }); d.stroke([[x + 6, y - 12], [x + 13, y - 18 + wv]], { w: 1.6, col: P.soot }); }
}

IRON_PHASES.thumbs = {
  setup(st) { ironThumbSetup(st); },
  wait(st, dt) { const ph = st.ph; if (ph.prep && ph.prep.length) ph.prep.shift()(); ironThumbAnim(st, dt); for (const p of G.players) { p.x = IRONTHUMB.cab[p.id][0] - p.w / 2; p.y = IRONTHUMB.cab[p.id][1] - p.h; } },
  step(st, dt) { ironThumbStep(st, dt); },
  busy() { return true; },
  plan(st) { return [{ why: 'thumb' }, { why: 'thumb' }]; },
  labels() { return ['slam', 'slam']; },
  heroO(st, p) { return { face: p.id ? -1 : 1, mood: st.ph.th && st.ph.th[p.id].s === 'pinned' ? 'dizzy' : st.ph.winner === p.id && st.ph.mode === 'over' ? 'joy' : null }; },
  hudText(st) { const ph = st.ph; return 'Thumb War  ·  Round ' + ph.round + '  ·  Pip ' + ph.wins[0] + ' - ' + ph.wins[1] + ' Bo'; },
  drawSky(st) { ironThumbDrawSky(st); },
  drawBack(st) { ironThumbDrawBack(st); },
  draw(st) { ironThumbDraw(st); },
  drawTop(st) { ironThumbDrawTop(st); },
  music(st) { const ph = st.ph; return { song: 'ironthumb', amb: 'ironMeadow', fast: !!(ph && ph.mode === 'fight' && (ph.slamOff || ph.rt > IRONTHUMB.cap - 10)) }; },
  stat() { return null; },
  statLine(st) { const s = st.stats.thumbs; return s && s.champ != null && s.champ >= 0 ? 'Thumb champ: ' + NAMES[s.champ] + ' (' + s.wins[s.champ] + '-' + s.wins[1 - s.champ] + ')' : ''; },
  leave() { },
};
ironRoom('thumbs', {
  act: { label: 'slam', labels: ['slam', 'slam'] },
  tip: IRON_PARTS.thumbs.tip,
});

/* --- sounds --- */
Sfx.extra.ironthumbGo = function () { [523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'square', 0.03, null, i * 0.06)); this.noise(0.15, { f: 2400, vol: 0.02, delay: 0.18 }); };
Sfx.extra.ironthumbRear = function () { this.tone(330, 0.14, 'triangle', 0.035, 220); this.tone(180, 0.1, 'square', 0.012, 150, 0.04); };
Sfx.extra.ironthumbSwing = function () { this.noise(0.14, { f: 900, to: 2600, q: 0.8, vol: 0.03 }); };
Sfx.extra.ironthumbKnock = function () { this.tone(150, 0.22, 'sine', 0.09, 70); this.tone(620, 0.18, 'triangle', 0.03, 480); this.noise(0.12, { type: 'lowpass', f: 900, vol: 0.05 }); };
Sfx.extra.ironthumbSlam = function () { this.tone(90, 0.4, 'sine', 0.12, 40); this.noise(0.35, { type: 'lowpass', f: 600, to: 120, vol: 0.08 }); this.tone(420, 0.3, 'triangle', 0.03, 300, 0.04); };
Sfx.extra.ironthumbWhiff = function () { this.noise(0.2, { f: 1800, to: 500, q: 0.7, vol: 0.03 }); this.tone(110, 0.25, 'sine', 0.06, 60, 0.12); };
Sfx.extra.ironthumbClonk = function () { this.tone(300, 0.2, 'square', 0.03, 260); this.tone(450, 0.25, 'triangle', 0.035, 400); };
Sfx.extra.ironthumbTuck = function () { this.tone(260, 0.08, 'triangle', 0.025, 160); };
Sfx.extra.ironthumbCramp = function () { for (let k = 0; k < 4; k++) this.tone(700 - k * 60, 0.05, 'square', 0.015, null, k * 0.05); };
Sfx.extra.ironthumbJuke = function () { this.noise(0.1, { f: 3000, to: 1200, q: 1, vol: 0.025 }); };
Sfx.extra.ironthumbCount = function (n) { const f = [440, 554, 659][n || 0]; this.tone(f, 0.22, 'square', 0.035, null); this.tone(f * 2, 0.12, 'triangle', 0.015, null, 0.02); };
Sfx.extra.ironthumbWriggle = function (p) { this.tone(500 * (p || 1), 0.06, 'triangle', 0.03, 650 * (p || 1)); };
Sfx.extra.ironthumbEscape = function () { this.tone(300, 0.15, 'sine', 0.05, 900); this.noise(0.08, { f: 2600, vol: 0.02, delay: 0.05 }); };
Sfx.extra.ironthumbRound = function () { [659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.045, null, i * 0.1)); };
Sfx.extra.ironthumbChamp = function () { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.05, null, i * 0.09)); };
