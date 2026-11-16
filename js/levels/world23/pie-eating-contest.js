/* Pip & Bo - Level 23-4 Pie-Eating Contest (versus, World 23 Barnyard Fair). */
'use strict';

/* ===== 23-4 Pie-Eating Contest (mode 'pieeat', versus, best of 5, one screen) =====
   Gavyn's pick: "Mash to eat and time your gulps, but don't eat too fast or you get the hiccups. Best of 5."
   def.ownStep: the mode runs the whole live tick and the picture. The platformer bodies are hidden (alive false) and the
   mode draws Pip and Bo sitting side by side at the judges' table on the fair stage, hands behind their backs (contest
   rules!), a paper bib each, a pie on a plate in front and their stack of pies beside it. Farmer Fern (straw hat with a
   sunflower, a whistle and a clipboard) judges from behind the table, with the blue ribbon on its stand; the crowd
   claps along at the front; the fair (tents, a red barn, the Ferris wheel) is behind the stage.
   A round (after the framework's Round N card and 3-2-1; Farmer Fern blows her whistle at "GO!"):
     bite   the action (F or E / / . , Enter / X Y RB RT / the round touch button "bite") takes a bite: one bite of pie
            goes off the plate (the pie gets visibly smaller) into your cheeks, which puff up. The cheeks hold 6 bites
            (PIEEAT.cap): the 6 segments of your cheek ring above your head fill up.
     gulp   ▲ (W / Space / ↑ / A or B / stick up / touch ▲) swallows. The crowd claps a steady beat (every 1.3-1.5 s,
            per round) and your cheek ring shows it: a circle shrinks onto the ring and lands on it at each clap.
            A gulp on the clap (0.13 s early to 0.2 s late; the ring glows green) is a GULP!: everything in your cheeks
            goes down, plus two extra bites straight off the plate (the bonus), and it calms your tummy a little.
            A gulp off the beat is a "Glug!": only a third of your cheeks (rounded up) go down, you swallow air (the
            hiccup jar fills 32%) and you cough (0.5 s instead of 0.22 s, no biting meanwhile). A gulp with
            empty cheeks off the beat is air too (15%). One bonus per clap.
     hiccups  eating too fast fills your hiccup jar (on the table beside you): a bite sooner than 0.17 s after your last
            one adds 32%, sooner than 0.25 s 16%, sooner than 0.32 s 5%; a bite with full cheeks ("Too full!") adds
            38% and eats nothing; air gulps add 15-32%. The jar empties by itself (26% a second). Full: "HIC!": you
            bounce in your seat for 1.6 s and can't bite or gulp (the jar empties). So mashing loses: a steady fast
            munch (about 3-4 bites a second) with a gulp on every clap is the way to win.
     pies   each round has its own pies (PIEEAT_ROUNDS): when a plate is empty the next pie slides over from your stack
            (0.55 s, no biting). The last pie of every round has whipped cream on top (just for fun: it leaves a cream
            moustache). The first to swallow every bite of every pie wins the round ("Pip ate 3 pies!", or "Bo had the
            hiccups!" when the other was hiccuping at the end, "...just a nibble ahead!" when it was close). Both in
            the same tick: a tie (replayed).
     time   the round clock is 60 s (def.match.roundTime; rounds usually end by pies in 17-45 s): whoever swallowed more
            wins ("Time! Pip ate the most!"); within half a bite it's a tie.
   Rounds: 1 Cherry Pie (3 pies of 26 bites, claps every 1.5 s), 2 Blueberry Pie (3, 1.45 s), 3 Apple Pie (3, 1.3 s: the band
     plays faster), 4 Giant Pumpkin Pie (2 big pies of 38 bites, 1.45 s), 5 Triple Berry Final (3 pies, the claps
     speed up from 1.45 to 1.25 s over 25 s). Sudden death (2nd tie in a row) is a Sudden Slurp: one pie.
     tiebreak(): more GULP!s (perfect gulps) this match, else replay.
   Catch-up help, gold and announced (round card chip, a gold panel border, the panel line, a gold cheek ring): 1 round
   behind = gold gulps (the GULP! window is wider: 0.18 s early to 0.28 s late); 2+ behind = gold gulps and a gold
   tummy (the hiccup jar fills 30% slower). Off in sudden death. Crowd cheers for every 3 GULP!s in a row.
   Soft fails only: hiccups are a comic bounce, nobody gets hurt. Every top-level name is prefixed pieeat / PIEEAT, every
   sound Sfx.extra.pieeat*. Rule randomness: none (the rules are fixed); looks use their own pieeatVR. */
const PIEEAT = {
  cap: 6,                                   // cheeks hold this many bites
  early: 0.13, late: 0.2,                   // the GULP! window around each clap (s)
  earlyGold: 0.18, lateGold: 0.28,          // ... with gold gulps
  fast: [[0.17, 0.32], [0.25, 0.16], [0.32, 0.05]],   // a bite sooner than [0] s after the last adds [1] to the hiccup jar
  full: 0.38, air: 0.32, airEmpty: 0.15, calm: 0.12, drain: 0.26, goldTummy: 0.7,
  hicT: 1.6, gulpT: 0.22, glugT: 0.5, glugPart: 3, swapT: 0.55, bonus: 2,
  roundTime: 60, timeTie: 0.5,
};
// each round's pies: name, flavour key (looks), pies, bites a pie, clap period (per0 -> per1 over rampT s), the hint
const PIEEAT_ROUNDS = [
  { name: 'Cherry Pie', key: 'cherry', pies: 3, bites: 26, per0: 1.5, hint: 'Bite, bite, bite... then GULP when the crowd claps!' },
  { name: 'Blueberry Pie', key: 'blueberry', pies: 3, bites: 26, per0: 1.45, hint: 'Not too fast, or you get the hiccups! Watch your jar.' },
  { name: 'Apple Pie', key: 'apple', pies: 3, bites: 26, per0: 1.3, hint: 'The band plays faster: gulp on every clap!' },
  { name: 'Giant Pumpkin Pie', key: 'pumpkin', pies: 2, bites: 38, per0: 1.45, hint: 'Two giant pumpkin pies! Keep a steady munch.' },
  { name: 'Triple Berry Final', key: 'berry', pies: 3, bites: 26, per0: 1.45, per1: 1.25, rampT: 25, hint: 'The final! The claps speed up as you go.' },
];
const PIEEAT_SUDDEN = { name: 'Sudden Slurp', key: 'cherry', pies: 1, bites: 30, per0: 1.4, hint: 'Sudden Slurp! One big pie: first to finish wins!' };
// pie looks: filling, its darker shade, crust, crust edge
const PIEEAT_LOOK = {
  cherry: { fill: '#d8324a', dark: '#9c1f34', dot: '#ff6b7f', crust: '#f2c27a', edge: '#d6974c', lattice: true },
  blueberry: { fill: '#4a4fb8', dark: '#2e3180', dot: '#8a90ff', crust: '#f0c07a', edge: '#d0924a', lattice: true },
  apple: { fill: '#f2c46a', dark: '#c99a3a', dot: '#fff0b0', crust: '#e9b46a', edge: '#c88a44', lattice: false, vents: true },
  pumpkin: { fill: '#f08a2c', dark: '#bf5f14', dot: '#ffb46a', crust: '#e9b46a', edge: '#c88a44', lattice: false },
  berry: { fill: '#b83a8c', dark: '#7e2260', dot: '#ff8fd0', crust: '#f2c27a', edge: '#d6974c', lattice: true },
};
// where things are on the stage
const PIEEAT_X = [290, 670];          // each eater's middle
const PIEEAT_BASE = 370;              // the eaters sit just behind the table top (their bottom edge)
const PIEEAT_TABLE = 358;             // table top: back edge (seen from a little above)
const PIEEAT_FRONT = 404;             // table top: front edge (the checked cloth hangs from here to y 470)
const PIEEAT_PLATE_Y = 384;           // the middle of the plate in front of each eater
const PIEEAT_RING_Y = 214;            // the cheek ring over each head
const PIEEAT_S = 4;                   // eater scale (a hero is 21 x 24 units)
// looks-only randomness (crumbs, bubbles, confetti): never part of the rules
let pieeatVS = 20261123;
const pieeatVR = () => { pieeatVS = (Math.imul(pieeatVS, 1664525) + 1013904223) >>> 0; return pieeatVS / 4294967296; };
const pieeatHash = (a, b) => { let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };
// 1-player mode: the computer eats for this player (no key reminders for it)
const pieeatCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);

/* ---------- the round ---------- */
function pieeatMakeEater(k, R) {
  return { k, pie: 0, left: R.bites, cheeks: 0, eaten: 0, H: 0, hicT: 0, hicN: 0, gulpT: 0, swapT: 0, lastBite: -9,
    usedClap: -1, streak: 0, gold: 0, done: false, prevUp: true, bites: 0,
    // looks only
    pop: '', popT: 9, popCol: '#fff', popBig: false, biteA: 0, gulpA: 0, glug: false, cheer: 0, cream: 0, hicBob: 0,
    smudge: 0, fullT: 9, nudge: '', blinkT: 2 + pieeatVR() * 3 };
}
function pieeatPop(E, text, col, big) { E.pop = text; E.popCol = col || '#ffffff'; E.popT = 0; E.popBig = !!big; }
function pieeatNewRound(st, n, info) {
  const R = info.suddenDeath ? PIEEAT_SUDDEN : st.forceRound ? PIEEAT_ROUNDS[st.forceRound - 1] : PIEEAT_ROUNDS[Math.min(n, PIEEAT_ROUNDS.length) - 1];
  st.R = R; st.round = n; st.sudden = !!info.suddenDeath;
  st.goal = R.pies * R.bites;
  st.pl = [0, 1].map(k => pieeatMakeEater(k, R));
  for (const E of st.pl) E.gold = info.suddenDeath || st.noHelp ? 0 : Math.max(0, info.wins[1 - E.k] - info.wins[E.k]);
  st.ph = 'set'; st.rt = 0; st.bph = 0; st.clapN = 0; st.clapT = 9; st.res = null; st.ended = false;
  st.whistleT = 9; st.cheerT = 9; st.cheerFor = -1;
  st.vis.fx = []; st.vis.pops = [];
}
// the clap period right now
function pieeatPer(st) {
  const R = st.R;
  if (!R.per1) return R.per0;
  return R.per0 + (R.per1 - R.per0) * clamp(st.rt / (R.rampT || 25), 0, 1);
}
// how far from the nearest clap a gulp now would be (s, negative = early) and that clap's number (claps are 1, 2, 3...
// at whole beats after GO; GO itself is not a clap)
function pieeatClapOff(st) {
  const per = pieeatPer(st), ph = st.bph;
  if (ph < 0.5) return { off: -(1 - ph) * per, n: 1 };
  const n = Math.round(ph);
  return { off: (ph - n) * per, n };
}
// the GULP! window for this eater
function pieeatWin(E) { return E.gold >= 1 ? [PIEEAT.earlyGold, PIEEAT.lateGold] : [PIEEAT.early, PIEEAT.late]; }
function pieeatOnBeat(st, E) { const c = pieeatClapOff(st), w = pieeatWin(E); return c.off >= -w[0] && c.off <= w[1]; }
function pieeatAddHic(st, E, a) {
  if (a > 0 && E.gold >= 2) a *= PIEEAT.goldTummy;
  E.H = clamp(E.H + a, 0, 1);
  if (E.H >= 1 && E.hicT <= 0) {
    E.hicT = PIEEAT.hicT; E.hicN++; st.stat.hics[E.k]++; E.streak = 0; E.H = 1;
    pieeatPop(E, 'HIC!', '#bfe9ff', true); Sfx.play('pieeatHic', E.k); rumble(E.k, 0.12, 0.35, 120);
    for (let i = 0; i < 8; i++) pieeatFx(st, PIEEAT_X[E.k] + (pieeatVR() - 0.5) * 60, PIEEAT_BASE - 70, (pieeatVR() - 0.5) * 80, -90 - pieeatVR() * 80, 1.1, 'rgba(200,240,255,0.9)', 4 + pieeatVR() * 5, -30, 'bubble');
  }
}
function pieeatBite(st, E) {
  const q = PIEEAT;
  if (E.done || E.hicT > 0 || E.gulpT > 0 || E.swapT > 0) return;
  if (E.left <= 0) { if (E.cheeks > 0) pieeatPop(E, 'Gulp it down!', C.gold, false); return; }
  const gap = st.rt - E.lastBite;
  E.lastBite = st.rt;
  let add = 0;
  for (const [g, a] of q.fast) if (gap < g) { add = a; break; }
  if (E.cheeks >= q.cap) {
    // too full: nothing goes in, the jar fills
    E.fullT = 0; st.stat.full[E.k]++;
    pieeatPop(E, 'Too full! Gulp!', '#ffd0a0', false); Sfx.play('pieeatFull', E.k);
    pieeatAddHic(st, E, add + q.full);
    return;
  }
  E.cheeks++; E.left--; E.bites++; st.stat.bites[E.k]++;
  E.biteA = 1;
  Sfx.play('pieeatBite', E.k);
  const lk = PIEEAT_LOOK[st.R.key] || PIEEAT_LOOK.cherry;
  for (let i = 0; i < 5; i++) pieeatFx(st, PIEEAT_X[E.k] + (pieeatVR() - 0.5) * 50, PIEEAT_PLATE_Y - 18, (pieeatVR() - 0.5) * 160, -60 - pieeatVR() * 140, 0.7, i % 2 ? lk.crust : lk.fill, 2.5 + pieeatVR() * 2.5, 600, 'crumb');
  if (pieeatHash(E.bites, E.k + 7) < 0.25) E.smudge = Math.min(14, E.smudge + 1);
  if (add > 0) pieeatAddHic(st, E, add);
  // the plate is empty: the next pie slides over from the stack
  if (E.left <= 0 && E.pie < st.R.pies - 1) { E.swapT = q.swapT; }
}
function pieeatSwallow(st, E, n) {
  n = Math.min(n, E.cheeks);
  E.cheeks -= n; E.eaten += n;
}
function pieeatGulp(st, E) {
  const q = PIEEAT;
  if (E.done || E.hicT > 0 || E.gulpT > 0) return;
  const c = pieeatClapOff(st), on = pieeatOnBeat(st, E);
  E.gulpA = 1;
  if (E.cheeks <= 0) {
    E.gulpT = 0.2; E.glug = !on;
    if (on) pieeatPop(E, 'Nothing to gulp!', '#ffffff', false);
    else { pieeatPop(E, 'Gulp... air!', '#bfe9ff', false); pieeatAddHic(st, E, q.airEmpty); }
    Sfx.play('pieeatAir', E.k);
    return;
  }
  if (on) {
    const first = E.usedClap !== c.n;
    E.usedClap = c.n;
    pieeatSwallow(st, E, E.cheeks);
    if (first) {
      // the bonus: two more bites straight off the plate (never more than is left)
      if (E.left > 0 && E.swapT <= 0) {
        const b = Math.min(q.bonus, E.left);
        E.left -= b; E.eaten += b; st.stat.bonus[E.k] += b;
        if (E.left <= 0 && E.pie < st.R.pies - 1) E.swapT = q.swapT;
      }
      E.streak++; st.stat.perfect[E.k]++;
      st.stat.bestStreak[E.k] = Math.max(st.stat.bestStreak[E.k], E.streak);
      E.H = Math.max(0, E.H - q.calm);
      pieeatPop(E, E.streak >= 3 ? 'GULP! x' + E.streak : 'GULP!', C.gold, true);
      Sfx.play('pieeatGulp', E.k);
      for (let i = 0; i < 9; i++) pieeatFx(st, PIEEAT_X[E.k] + (pieeatVR() - 0.5) * 40, PIEEAT_RING_Y + (pieeatVR() - 0.5) * 40, (pieeatVR() - 0.5) * 180, (pieeatVR() - 0.5) * 180, 0.6, i % 2 ? C.gold : '#ffffff', 3.5, 0, 'spark');
      if (E.streak % 3 === 0) { st.cheerT = 0; st.cheerFor = E.k; Sfx.play('pieeatCheer'); pieeatWorldPop(st, 'Hooray, ' + NAMES[E.k] + '!', PIEEAT_X[E.k] + (E.k ? 170 : -170), 450, PCOL[E.k]); }
    } else pieeatPop(E, 'Gulp!', C.gold, false);
    E.gulpT = q.gulpT; E.glug = false;
  } else {
    pieeatSwallow(st, E, Math.ceil(E.cheeks / q.glugPart));
    E.streak = 0; st.stat.glugs[E.k]++;
    E.gulpT = q.glugT; E.glug = true;
    pieeatPop(E, c.off < 0 ? 'Glug! Too soon' : 'Glug! Too late', '#ffe6a8', false);
    Sfx.play('pieeatGlug', E.k);
    pieeatAddHic(st, E, q.air);
  }
}
function pieeatEnd(st, winner, reason) {
  if (st.ended) return;
  st.ended = true; st.ph = 'done';
  st.res = { winner, reason };
  if (winner >= 0) {
    st.stat.wins[winner]++; st.pl[winner].cheer = 1; st.cheerT = 0; st.cheerFor = winner;
    for (let k = 0; k < 40; k++) confetti(PIEEAT_X[winner] + (pieeatVR() - 0.5) * 60, PIEEAT_BASE - 110);
  }
  matchRoundEnd(winner, reason);
}
function pieeatReason(st, w) {
  const l = 1 - w, L = st.pl[l], R = st.R;
  const pies = R.pies === 1 ? 'the pie' : R.pies + (R.key === 'pumpkin' ? ' giant pies' : ' pies');
  if (L.hicT > 0) return NAMES[l] + ' had the hiccups!';
  if (st.goal - L.eaten <= 4) return NAMES[w] + ' ate ' + pies + ', just a nibble ahead!';
  return NAMES[w] + ' ate ' + pies + '!';
}
function pieeatTick(dt, live) {
  const st = G.mst, q = PIEEAT;
  st.t += dt;
  if (live) {
    st.rt += dt;
    if (st.ph === 'set') st.ph = 'eat';
    const was = Math.floor(st.bph);
    st.bph += dt / pieeatPer(st);
    if (Math.floor(st.bph) > was) { st.clapN = Math.floor(st.bph); st.clapT = 0; Sfx.play('pieeatClap'); }
  }
  for (const E of st.pl) {
    const p = G.players[E.k];
    const up = !!(p.input.jump || p.input.up);
    const gulp = up && !E.prevUp;
    E.prevUp = up;
    const bite = !!p.pendingAct;
    p.pendingAct = false; p.pendingJump = false;
    if (live && !E.done && !st.ended) {
      // timers
      if (E.hicT > 0) { E.hicT -= dt; if (E.hicT <= 0) { E.hicT = 0; E.H = 0; } }
      else E.H = Math.max(0, E.H - q.drain * dt);
      E.gulpT = Math.max(0, E.gulpT - dt);
      if (E.swapT > 0) {
        E.swapT -= dt;
        if (E.swapT <= 0) {
          E.swapT = 0; E.pie++; E.left = st.R.bites;
          if (E.pie === st.R.pies - 1) pieeatPop(E, st.R.pies > 1 ? 'Last pie! Whipped cream!' : 'Whipped cream!', '#ffffff', false);
          else pieeatPop(E, 'Next pie!', '#ffffff', false);
          Sfx.play('pieeatSlide', E.k);
        }
      }
      if (bite) pieeatBite(st, E);
      if (gulp) pieeatGulp(st, E);
      if (E.left <= 0 && E.cheeks <= 0 && E.pie >= st.R.pies - 1 && E.eaten >= st.goal) E.done = true;
    }
  }
  // who finished?
  if (live && !st.ended) {
    const done = st.pl.filter(E => E.done);
    if (done.length === 2) pieeatEnd(st, -1, 'Both at once! What a finish!');
    else if (done.length === 1) {
      const w = done[0].k;
      st.stat.fast[w] = Math.min(st.stat.fast[w], st.rt);
      Sfx.play('pieeatWin', w);
      pieeatEnd(st, w, pieeatReason(st, w));
    }
  }
  pieeatVisTick(st, dt);
  pieeatMirror(st);
}
// the platformer bodies stay hidden, but p.x / p.y follow the picture (speech bubbles, confetti fall-backs)
function pieeatMirror(st) {
  for (const p of G.players) { p.x = PIEEAT_X[p.id] - p.w / 2; p.y = PIEEAT_BASE - 110 - p.h; }
}
// how much of the round this eater has swallowed (0..1) and the pies done (with a fraction)
const pieeatFrac = (st, E) => clamp(E.eaten / st.goal, 0, 1);
const pieeatPiesDone = (st, E) => E.eaten / st.R.bites;

/* ---------- looks: effects that never touch the rules ---------- */
function pieeatFx(st, x, y, vx, vy, life, col, size, grav, kind) {
  const v = st.vis; if (!v) return;
  v.fx.push({ x, y, vx, vy, life, max: life, col, size, grav, kind: kind || 'dot', rot: pieeatVR() * 6.28 });
  if (v.fx.length > 300) v.fx.splice(0, v.fx.length - 300);
}
function pieeatWorldPop(st, text, x, y, col) { st.vis.pops.push({ text, x, y, t: 0, col: col || '#ffffff' }); }
function pieeatVisNew() { return { fx: [], pops: [], t: 0 }; }
function pieeatVisTick(st, dt) {
  const v = st.vis; if (!v) return;
  v.t += dt;
  let n = 0;
  for (const f of v.fx) {
    f.life -= dt; f.vx *= Math.exp(-1.4 * dt); f.vy += f.grav * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += dt * 6;
    if (f.kind === 'crumb' && f.y > PIEEAT_PLATE_Y + 4 && f.vy > 0) { f.y = PIEEAT_PLATE_Y + 4; f.vy = 0; f.vx = 0; f.grav = 0; }
    if (f.life > 0) v.fx[n++] = f;
  }
  v.fx.length = n;
  v.pops = v.pops.filter(p => (p.t += dt) < 1.4);
  st.clapT += dt; st.whistleT += dt; st.cheerT += dt;
  for (const E of st.pl || []) {
    E.popT += dt; E.fullT += dt;
    E.biteA = Math.max(0, E.biteA - dt * 7); E.gulpA = Math.max(0, E.gulpA - dt * 3.5);
    E.cheer = Math.max(0, E.cheer - dt * 0.35);
    E.blinkT -= dt; if (E.blinkT < -0.12) E.blinkT = 2 + pieeatVR() * 3;
    E.hicBob = E.hicT > 0 ? E.hicBob + dt : 0;
    if (E.pie === st.R.pies - 1 && E.biteA > 0.9) E.cream = Math.min(1, E.cream + 0.08);
    // the hiccup jar fizzes when it is nearly full
    if (E.H > 0.6 && E.hicT <= 0 && pieeatVR() < dt * 10 * E.H) pieeatFx(st, PIEEAT_X[E.k] + (E.k ? -104 : 104) + (pieeatVR() - 0.5) * 14, PIEEAT_TABLE - 50, (pieeatVR() - 0.5) * 20, -40 - pieeatVR() * 30, 0.8, 'rgba(210,245,255,0.9)', 2 + pieeatVR() * 2.5, -20, 'bubble');
    if (E.hicT > 0 && pieeatVR() < dt * 6) pieeatFx(st, PIEEAT_X[E.k] + (pieeatVR() - 0.5) * 50, PIEEAT_BASE - 96, (pieeatVR() - 0.5) * 40, -60 - pieeatVR() * 40, 1.2, 'rgba(210,245,255,0.95)', 3 + pieeatVR() * 4, -20, 'bubble');
  }
}

/* ---------- the mode ---------- */
MODES.pieeat = {
  setup(st, L) {
    for (const row of L.grid) row.fill('.');
    st.stat = { wins: [0, 0], perfect: [0, 0], glugs: [0, 0], hics: [0, 0], full: [0, 0], bites: [0, 0], bonus: [0, 0],
      eaten: [0, 0], bestStreak: [0, 0], fast: [Infinity, Infinity] };
    st.forceRound = this.testRound || 0;   // bot tests: always this round's pies
    st.noHelp = !!this.testNoHelp;         // bot tests: no gold help (to measure raw skill)
    st.vis = pieeatVisNew();
    st.t = 0; st.rt = 0;
    st.R = PIEEAT_ROUNDS[0]; st.goal = 60; st.pl = null;
  },
  resetRound(n, info) {
    const st = G.mst;
    // (a round that just ended adds what each ate to the match's pie count)
    if (st.pl && !st.counted) for (const E of st.pl) st.stat.eaten[E.k] += E.eaten / st.R.bites;
    st.vis = pieeatVisNew();
    pieeatNewRound(st, n, info);
    st.counted = false;
    // the eaters are the players: hide the platformer bodies every round (matchResetPlayers revives them)
    for (const p of G.players) Object.assign(p, { alive: false, respawnT: Infinity });
    G.particles.length = 0;
    pieeatMirror(st);
  },
  go() {
    const st = G.mst;
    if (G.match) G.match.goT = 0.45;
    st.ph = 'eat'; st.rt = 0; st.bph = 0; st.whistleT = 0;
    Sfx.play('pieeatWhistle');
    for (const E of st.pl) {
      E.prevUp = true; // (a ▲ held through the countdown is not a gulp)
      if (E.gold) pieeatPop(E, E.gold >= 2 ? 'Gold gulps + gold tummy!' : 'Gold gulps!', C.gold, true);
    }
  },
  step(dt) { pieeatTick(dt, true); },
  idle(dt) {
    const st = G.mst, m = G.match; if (!st.pl) return;
    for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
    for (const E of st.pl) { const p = G.players[E.k]; E.prevUp = !!(p.input.jump || p.input.up); }
    st.t += dt;
    pieeatVisTick(st, dt);
    pieeatMirror(st);
    if (m && m.phase === 'count' && !st.goldSaid) { st.goldSaid = true; if (st.pl.some(E => E.gold)) Sfx.play('pieeatGold'); }
    if (m && m.phase === 'ready') st.goldSaid = false;
  },
  timeUp() {
    const st = G.mst, [A, B] = st.pl, d = A.eaten - B.eaten;
    st.ended = true; st.ph = 'done';
    if (Math.abs(d) < PIEEAT.timeTie) { st.res = { winner: -1 }; return { winner: -1, reason: 'Time! Exactly the same!' }; }
    const w = d > 0 ? 0 : 1;
    st.res = { winner: w }; st.stat.wins[w]++; st.pl[w].cheer = 1; st.cheerT = 0; st.cheerFor = w;
    for (let k = 0; k < 40; k++) confetti(PIEEAT_X[w], PIEEAT_BASE - 110);
    return { winner: w, reason: 'Time! ' + NAMES[w] + ' ate the most!' };
  },
  tiebreak() {
    const r = G.mst.stat.perfect;
    if (r[0] !== r[1]) return { winner: r[0] > r[1] ? 0 : 1, reason: 'More GULP!s this match!' };
    return -1;
  },
  draw() { pieeatDrawWorld(); },
  drawTop() { pieeatDrawTop(); },
  hud() { pieeatHud(); },
  stats() {
    const st = G.mst, s = st.stat;
    // pies eaten: every finished round plus the one on the table now
    const eaten = [0, 1].map(k => s.eaten[k] + (st.pl && !st.counted ? st.pl[k].eaten / st.R.bites : 0));
    const out = [
      // (the match's own count: a round won on the tiebreak counts too)
      { label: 'Rounds won', values: (G.match ? G.match.wins : s.wins).slice() },
      { label: 'Pies eaten', values: eaten.map(v => (Math.round(v * 10) / 10).toFixed(1)) },
      { label: 'GULP!s', values: s.perfect.slice() },
      { label: 'Hiccups', values: s.hics.slice() },
    ];
    const b = s.bestStreak;
    if (b[0] + b[1] > 0) out.push(b[0] === b[1] ? '★ Gulp streak: Pip and Bo, ' + b[0] + ' in a row each!' : '★ Best gulp streak: ' + NAMES[b[0] > b[1] ? 0 : 1] + ', ' + Math.max(b[0], b[1]) + ' in a row!');
    const h = s.hics;
    if (h[0] !== h[1]) out.push('Calmest tummy: ' + NAMES[h[0] < h[1] ? 0 : 1] + ' (' + Math.min(h[0], h[1]) + (Math.min(h[0], h[1]) === 1 ? ' hiccup)' : ' hiccups)'));
    else if (h[0] === 0) out.push('Calmest tummies: no hiccups at all!');
    return out;
  },
  // test access for the bot harness and the computer brain (read-only)
  test: { PIEEAT, PIEEAT_ROUNDS, clapOff: pieeatClapOff, per: pieeatPer, win: pieeatWin, onBeat: pieeatOnBeat },
};

/* ---------- drawing: the fair behind the stage ---------- */
function pieeatCloud(x, y, s) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  circle(x, y, 18 * s); ctx.fill(); circle(x + 20 * s, y - 9 * s, 22 * s); ctx.fill(); circle(x + 42 * s, y, 16 * s); ctx.fill();
  rr(x - 12 * s, y - 2 * s, 66 * s, 18 * s, 9 * s); ctx.fill();
}
function pieeatTent(x, y, w, h, a, b) {
  // a striped fair tent with a little flag
  const n = 6;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? b : a;
    ctx.beginPath(); ctx.moveTo(x, y - h);
    ctx.lineTo(x - w / 2 + (w / n) * i, y - h * 0.42); ctx.lineTo(x - w / 2 + (w / n) * (i + 1), y - h * 0.42); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - w / 2 + (w / n) * i, y - h * 0.42, w / n + 0.5, h * 0.42);
  }
  // the right side of the tent in shade
  ctx.fillStyle = 'rgba(60,30,40,0.14)'; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + w / 2, y - h * 0.42); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w * 0.12, y); ctx.lineTo(x + w * 0.12, y - h * 0.42); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(60,30,30,0.35)'; rr(x - w * 0.1, y - h * 0.3, w * 0.2, h * 0.3, 4); ctx.fill();
  // the scalloped edge
  ctx.fillStyle = a;
  for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(x - w / 2 + (w / n) * (i + 0.5), y - h * 0.42, w / n / 2, 0, Math.PI); ctx.fill(); }
  ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x, y - h - 16); ctx.stroke();
  ctx.fillStyle = b === '#ffffff' ? a : b; ctx.beginPath(); ctx.moveTo(x, y - h - 16); ctx.lineTo(x + 14, y - h - 12); ctx.lineTo(x, y - h - 8); ctx.closePath(); ctx.fill();
}
function pieeatBarn(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#c8483c'; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(-40, -44); ctx.lineTo(-24, -64); ctx.lineTo(24, -64); ctx.lineTo(40, -44); ctx.lineTo(40, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7e2a22'; ctx.beginPath(); ctx.moveTo(-46, -42); ctx.lineTo(-26, -68); ctx.lineTo(26, -68); ctx.lineTo(46, -42); ctx.lineTo(40, -42); ctx.lineTo(22, -62); ctx.lineTo(-22, -62); ctx.lineTo(-40, -42); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
  ctx.strokeRect(-14, -30, 28, 30); ctx.beginPath(); ctx.moveTo(-14, -30); ctx.lineTo(14, 0); ctx.moveTo(14, -30); ctx.lineTo(-14, 0); ctx.stroke();
  ctx.fillStyle = '#fff3c4'; rr(-7, -54, 14, 10, 2); ctx.fill();
  // the silo
  ctx.fillStyle = '#d9dde6'; ctx.fillRect(44, -74, 22, 74); ctx.fillStyle = '#a9b0c0'; ctx.beginPath(); ctx.arc(55, -74, 11, Math.PI, 0); ctx.fill();
  ctx.restore();
}
function pieeatFerris(x, y, r, t) {
  ctx.strokeStyle = '#8a6a9a'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x - r * 0.55, y + r + 34); ctx.lineTo(x, y); ctx.lineTo(x + r * 0.55, y + r + 34); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3; circle(x, y, r); ctx.stroke();
  ctx.lineWidth = 1.5; circle(x, y, r * 0.86); ctx.stroke();
  const a0 = t * 0.12, cols = ['#ff6b8a', '#ffc53d', '#5b95ff', '#7fd05a', '#ff9f43', '#b28dff', '#ff6b8a', '#4fd0d8'];
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 8; i++) { const a = a0 + i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); }
  for (let i = 0; i < 8; i++) {
    const a = a0 + i * Math.PI / 4, gx = x + Math.cos(a) * r, gy = y + Math.sin(a) * r;
    ctx.fillStyle = cols[i]; rr(gx - 9, gy + 2, 18, 13, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + 3); ctx.stroke();
  }
  ctx.fillStyle = '#ffc53d'; circle(x, y, 7); ctx.fill();
}
function pieeatDrawBack(st) {
  const t = st.t;
  // the sky
  let g = ctx.createLinearGradient(0, 0, 0, PIEEAT_TABLE);
  g.addColorStop(0, C.skyTop); g.addColorStop(1, C.skyBot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, PIEEAT_TABLE + 4);
  ctx.fillStyle = C.sunGlow; circle(760, 150, 64); ctx.fill();
  ctx.fillStyle = C.sun; circle(760, 150, 38); ctx.fill();
  for (let i = 0; i < 4; i++) pieeatCloud(((i * 290 + t * 6) % 1260) - 150, 150 + (i % 2) * 38, 0.75 + (i % 3) * 0.15);
  // far hills, the hay field, the barn, the Ferris wheel and the fair tents
  ctx.fillStyle = C.hillFar;
  ctx.beginPath(); ctx.moveTo(0, 300);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 262 - Math.sin(x / 150 + 0.6) * 22 - Math.sin(x / 63) * 6);
  ctx.lineTo(W, 330); ctx.lineTo(0, 330); ctx.closePath(); ctx.fill();
  pieeatFerris(842, 196, 74, t);
  pieeatBarn(110, 286, 1.05);
  ctx.fillStyle = C.hillNear; ctx.fillRect(0, 286, W, 90);
  ctx.fillStyle = '#e9cf6a';
  for (let i = 0; i < 7; i++) { const x = 30 + i * 140 + (i % 2) * 40; rr(x, 300 + (i % 3) * 6, 40, 22, 6); ctx.fill(); }
  ctx.fillStyle = '#c9a845';
  for (let i = 0; i < 7; i++) { const x = 30 + i * 140 + (i % 2) * 40; ctx.fillRect(x + 4, 308 + (i % 3) * 6, 32, 2); ctx.fillRect(x + 4, 314 + (i % 3) * 6, 32, 2); }
  // the bales get a shaded lower half and a shadow on the grass
  for (let i = 0; i < 7; i++) { const x = 30 + i * 140 + (i % 2) * 40, y = 300 + (i % 3) * 6; ctx.fillStyle = 'rgba(150,110,30,0.22)'; rr(x, y + 13, 40, 9, 5); ctx.fill(); ctx.fillStyle = 'rgba(40,80,20,0.18)'; ctx.beginPath(); ctx.ellipse(x + 22, y + 23, 24, 3.5, 0, 0, Math.PI * 2); ctx.fill(); }
  pieeatTent(250, 312, 120, 92, '#e2483c', '#ffffff');
  pieeatTent(700, 316, 104, 80, '#ffc53d', '#ffffff');
  pieeatTent(470, 300, 84, 64, '#5b95ff', '#ffffff');
  // the stage: a wooden back rail, the posts and the striped awning with bunting
  ctx.fillStyle = '#a06c44'; ctx.fillRect(0, 330, W, 40);
  ctx.fillStyle = 'rgba(70,40,20,0.22)'; ctx.fillRect(0, 352, W, 18);
  ctx.fillStyle = 'rgba(90,55,25,0.35)'; for (let x = 0; x < W; x += 48) { const h = hash(x, 3); ctx.fillRect(x + 8 + h % 10, 338 + h % 6, 18 + h % 14, 1.5); ctx.fillRect(x + 20 + h % 8, 346 + h % 5, 14 + h % 10, 1.5); }
  ctx.fillStyle = '#8a5a36'; for (let x = 0; x < W; x += 48) ctx.fillRect(x, 330, 3, 40);
  ctx.fillStyle = '#5e3c22'; ctx.beginPath(); for (let x = 0; x < W; x += 48) for (const ny of [336, 362]) { ctx.moveTo(x + 8.5, ny); ctx.arc(x + 7, ny, 1.5, 0, Math.PI * 2); } ctx.fill();
  ctx.fillStyle = '#c08a5a'; ctx.fillRect(0, 326, W, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, 326, W, 1.5);
  for (const px of [22, W - 22]) {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 8, 92, 16, 280);
    ctx.fillStyle = '#e2483c'; for (let y = 100; y < 370; y += 34) { ctx.beginPath(); ctx.moveTo(px - 8, y); ctx.lineTo(px + 8, y - 10); ctx.lineTo(px + 8, y + 6); ctx.lineTo(px - 8, y + 16); ctx.closePath(); ctx.fill(); }
  }
  // the awning (red and white stripes, scalloped)
  const aw = 34;
  for (let x = 0, i = 0; x < W; x += aw, i++) { ctx.fillStyle = i % 2 ? '#ffffff' : '#e2483c'; ctx.fillRect(x, 78, aw, 22); ctx.beginPath(); ctx.arc(x + aw / 2, 100, aw / 2, 0, Math.PI); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(0, 78, W, 4);
  // bunting
  const cols = ['#ffc53d', '#5b95ff', '#7fd05a', '#ff6b8a', '#ff9f43'];
  for (const [x0, x1] of [[30, 300], [300, 660], [660, W - 30]]) {
    ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, 122); ctx.quadraticCurveTo((x0 + x1) / 2, 150, x1, 122); ctx.stroke();
    for (let k = 1; k < 9; k++) {
      const u = k / 9, x = x0 + (x1 - x0) * u, y = 122 + 4 * 14 * u * (1 - u) * 1.0;
      ctx.fillStyle = cols[(k + x0) % 5]; ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y); ctx.lineTo(x, y + 18); ctx.closePath(); ctx.fill();
    }
  }
}
// the hanging sign under the awning
function pieeatDrawSign(st) {
  const x = W / 2, y = 104;
  ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 120, 96); ctx.lineTo(x - 116, y + 4); ctx.moveTo(x + 120, 96); ctx.lineTo(x + 116, y + 4); ctx.stroke();
  ctx.fillStyle = '#8a5a36'; rr(x - 150, y, 300, 40, 10); ctx.fill();
  ctx.fillStyle = '#c99a62'; rr(x - 145, y + 4, 290, 32, 8); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(x - 140, y + 6, 280, 4, 2); ctx.fill();
  ctx.fillStyle = 'rgba(120,70,30,0.25)'; for (const gy of [y + 14, y + 27]) ctx.fillRect(x - 138, gy, 276, 1.2);
  ctx.fillStyle = '#5e3c22'; circle(x - 140, y + 9, 1.6); ctx.fill(); circle(x + 140, y + 9, 1.6); ctx.fill();
  text('PIE-EATING CONTEST', x, y + 21, 22, '#7e2a22', 'center');
  ctx.fillStyle = C.gold; pieeatStar(x - 128, y + 20, 7); pieeatStar(x + 128, y + 20, 7);
}
function pieeatStar(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r0 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); }
  ctx.closePath(); ctx.fill();
}

/* ---------- drawing: Farmer Fern the judge, the blue ribbon ---------- */
function pieeatDrawJudge(st) {
  const m = G.match, x = W / 2, base = PIEEAT_TABLE + 4;
  // she looks at whoever is ahead, points at a round's winner, toots at GO
  let look = 0;
  if (st.pl) { const d = st.pl[1].eaten - st.pl[0].eaten; look = clamp(d / 6, -1, 1); }
  const win = st.res && st.res.winner >= 0 ? st.res.winner : -1;
  if (win >= 0) look = win ? 1 : -1;
  const bob = Math.sin(st.t * 2.2) * 2, clap = st.clapT < 0.15 ? 1 - st.clapT / 0.15 : 0;
  ctx.save(); ctx.translate(x, base + bob);
  // overalls and checked shirt
  ctx.fillStyle = '#d24a3c'; rr(-42, -112, 84, 112, 22); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = -36; i < 40; i += 14) ctx.fillRect(i, -110, 5, 110);
  for (let j = -104; j < 0; j += 14) ctx.fillRect(-40, j, 80, 5);
  ctx.fillStyle = '#4f7ac9'; rr(-30, -76, 60, 76, 10); ctx.fill();
  ctx.fillRect(-30, -96, 10, 24); ctx.fillRect(20, -96, 10, 24);
  ctx.fillStyle = '#ffc53d'; circle(-25, -80, 3.5); ctx.fill(); circle(25, -80, 3.5); ctx.fill();
  ctx.fillStyle = '#3d63a8'; rr(-14, -62, 28, 18, 4); ctx.fill();
  // the clipboard arm (or pointing at the winner)
  ctx.strokeStyle = '#d24a3c'; ctx.lineWidth = 14; ctx.lineCap = 'round';
  if (win >= 0) {
    const s = win ? 1 : -1;
    ctx.beginPath(); ctx.moveTo(s * 34, -90); ctx.lineTo(s * 70, -120); ctx.stroke();
    ctx.fillStyle = '#f2c49a'; circle(s * 74, -124, 9); ctx.fill();
  } else {
    ctx.beginPath(); ctx.moveTo(-34, -86); ctx.lineTo(-24, -54); ctx.stroke();
    ctx.fillStyle = '#c99a62'; rr(-34, -72, 30, 38, 4); ctx.fill(); ctx.fillStyle = '#fffaf0'; rr(-30, -66, 22, 28, 2); ctx.fill();
    ctx.strokeStyle = '#9aa0b8'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-27, -60 + i * 6); ctx.lineTo(-12, -60 + i * 6); ctx.stroke(); }
    ctx.strokeStyle = '#d24a3c'; ctx.lineWidth = 14;
    // the other arm claps along with the crowd (a little wave)
    ctx.beginPath(); ctx.moveTo(34, -86); ctx.lineTo(44 - clap * 6, -60 - clap * 12); ctx.stroke();
    ctx.fillStyle = '#f2c49a'; circle(44 - clap * 6, -58 - clap * 12, 8); ctx.fill();
  }
  ctx.lineCap = 'butt';
  // the head
  ctx.fillStyle = '#f2c49a'; circle(0, -134, 30); ctx.fill();
  // braids
  ctx.fillStyle = '#b8743a';
  for (const s of [-1, 1]) { rr(s * 26 - 6, -136, 12, 34, 6); ctx.fill(); ctx.fillStyle = '#5b95ff'; circle(s * 26, -100, 5); ctx.fill(); ctx.fillStyle = '#b8743a'; }
  // the face: eyes look at the leader
  const lx = look * 4;
  ctx.fillStyle = C.ink; circle(-10 + lx, -138, 3.4); ctx.fill(); circle(10 + lx, -138, 3.4); ctx.fill();
  ctx.fillStyle = 'rgba(255,120,120,0.45)'; circle(-18, -126, 5); ctx.fill(); circle(18, -126, 5); ctx.fill();
  ctx.fillStyle = '#b07a4a'; for (const [fx, fy] of [[-14, -130], [-8, -128], [10, -128], [15, -130]]) { circle(fx + lx * 0.5, fy, 1.2); ctx.fill(); }
  // the whistle at GO, else a big smile
  if (st.whistleT < 0.9) {
    ctx.fillStyle = '#c0c8d8'; rr(-4 + lx, -126, 18, 9, 4); ctx.fill(); ctx.fillStyle = '#8a92a8'; circle(14 + lx, -121, 4); ctx.fill();
  } else {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(lx, -126, 9, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    ctx.strokeStyle = '#c0c8d8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-14, -108); ctx.quadraticCurveTo(0, -96, 14, -108); ctx.stroke();
    ctx.fillStyle = '#c0c8d8'; rr(-5, -100, 10, 6, 3); ctx.fill();
  }
  // the straw hat with a sunflower
  ctx.fillStyle = '#e9c46a'; ctx.beginPath(); ctx.ellipse(0, -158, 50, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2d27a'; rr(-26, -186, 52, 30, 14); ctx.fill();
  ctx.fillStyle = '#e2483c'; ctx.fillRect(-26, -166, 52, 7);
  ctx.fillStyle = '#ffc53d'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; circle(18 + Math.cos(a) * 7, -170 + Math.sin(a) * 7, 4.5); ctx.fill(); }
  ctx.fillStyle = '#7a4a22'; circle(18, -170, 5); ctx.fill();
  ctx.restore();
  // "Tweet!" at GO
  if (st.whistleT < 0.8) { ctx.globalAlpha = 1 - st.whistleT / 0.8; bigText('Tweet!', x + 64, base - 168 - st.whistleT * 24, 24, '#ffffff', 1); ctx.globalAlpha = 1; }
}
function pieeatDrawRibbon(st) {
  const x = W / 2, y = PIEEAT_TABLE - 26, sp = Math.sin(st.t * 1.6) * 0.06;
  // the stand
  ctx.fillStyle = '#8a5a36'; ctx.fillRect(x - 3, y, 6, 44); ctx.fillRect(x - 16, PIEEAT_TABLE + 16, 32, 5);
  ctx.save(); ctx.translate(x, y); ctx.rotate(sp);
  // the tails
  ctx.fillStyle = '#2f5fc4';
  ctx.beginPath(); ctx.moveTo(-12, 6); ctx.lineTo(-20, 44); ctx.lineTo(-12, 38); ctx.lineTo(-6, 46); ctx.lineTo(-2, 8); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(12, 6); ctx.lineTo(20, 44); ctx.lineTo(12, 38); ctx.lineTo(6, 46); ctx.lineTo(2, 8); ctx.closePath(); ctx.fill();
  // the rosette
  ctx.fillStyle = '#5b95ff';
  for (let i = 0; i < 14; i++) { const a = i * Math.PI / 7; circle(Math.cos(a) * 17, Math.sin(a) * 17, 7); ctx.fill(); }
  ctx.fillStyle = '#2f5fc4'; circle(0, 0, 16); ctx.fill();
  ctx.fillStyle = C.gold; circle(0, 0, 11); ctx.fill();
  text('1st', 0, 1, 12, '#7a4a10', 'center');
  ctx.restore();
}

/* ---------- drawing: the table, pies, plates, stacks, hiccup jars ---------- */
function pieeatDrawTableTop() {
  // the table top (seen a little from above) and the checked cloth hanging down the front
  const y0 = PIEEAT_TABLE, y1 = PIEEAT_FRONT;
  ctx.fillStyle = '#fff8ef'; ctx.fillRect(40, y0, W - 80, y1 - y0);
  // checks seen from above: rows get a little taller toward the front
  ctx.fillStyle = 'rgba(226,72,60,0.28)';
  for (let x = 40; x < W - 40; x += 28) ctx.fillRect(x, y0, 14, y1 - y0);
  for (let y = y0, h = 8; y < y1; y += h * 2, h += 1.5) { ctx.fillStyle = 'rgba(226,72,60,0.24)'; ctx.fillRect(40, y, W - 80, Math.min(h, y1 - y)); }
  ctx.fillStyle = 'rgba(28,26,54,0.12)'; ctx.fillRect(40, y0, W - 80, 3);
}
function pieeatDrawCloth(st) {
  const y0 = PIEEAT_FRONT, y1 = 470;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(40, y0, W - 80, y1 - y0);
  for (let x = 40; x < W - 40; x += 26) { ctx.fillStyle = 'rgba(226,72,60,0.55)'; ctx.fillRect(x, y0, 13, y1 - y0); }
  for (let y = y0; y < y1; y += 26) { ctx.fillStyle = 'rgba(226,72,60,0.45)'; ctx.fillRect(40, y, W - 80, 13); }
  // the scalloped hem
  ctx.fillStyle = '#e2483c';
  for (let x = 40; x < W - 40; x += 30) { ctx.beginPath(); ctx.arc(x + 15, y1, 15, 0, Math.PI); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(40, y0, W - 80, 4);
  // name cards on the front of the table
  for (const k of [0, 1]) {
    const x = PIEEAT_X[k], y = y0 + 16;
    ctx.fillStyle = '#fffaf0'; rr(x - 54, y, 108, 34, 8); ctx.fill();
    ctx.strokeStyle = PCOL[k]; ctx.lineWidth = 3; rr(x - 54, y, 108, 34, 8); ctx.stroke();
    text(NAMES[k], x, y + 18, 22, PCOL[k], 'center');
  }
}
// a pie on its plate: f = how much is left (0..1), the bitten-away wedge faces the eater (the back)
function pieeatDrawPie(x, y, rx, ry, f, key, cream, plate) {
  const lk = PIEEAT_LOOK[key] || PIEEAT_LOOK.cherry, dep = ry * 0.55;
  if (plate) {
    ctx.fillStyle = 'rgba(28,26,54,0.15)'; ctx.beginPath(); ctx.ellipse(x, y + dep + 6, rx * 1.28, ry * 1.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x, y + dep * 0.6, rx * 1.25, ry * 1.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8fb8e8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, y + dep * 0.6, rx * 1.12, ry * 1.1, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (f <= 0.001) return;
  // the remaining sector: from the back (angle -PI/2) round both sides
  const gap = Math.PI * 2 * (1 - f), a0 = -Math.PI / 2 + gap / 2, a1 = -Math.PI / 2 - gap / 2 + Math.PI * 2;
  const sector = (oy, sx, sy) => {
    ctx.beginPath();
    if (f < 0.999) ctx.moveTo(x, y + oy);
    ctx.ellipse(x, y + oy, rx * sx, ry * sy, 0, a0, a1);
    ctx.closePath();
  };
  // the tin side (darker), then the cut face showing the filling, then the top
  ctx.fillStyle = '#b8b8c8'; sector(dep, 1, 1); ctx.fill();
  ctx.fillStyle = lk.edge; sector(dep * 0.55, 0.98, 1); ctx.fill();
  if (f < 0.999) {
    // the cut faces: two filling-coloured quads from the centre to the rim
    ctx.fillStyle = lk.dark;
    for (const a of [a0, a1]) {
      const ex = x + Math.cos(a) * rx, ey = y + Math.sin(a) * ry;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.lineTo(ex, ey + dep); ctx.lineTo(x, y + dep); ctx.closePath(); ctx.fill();
    }
  }
  // the top: crust rim and filling (or a full crust with vents for apple)
  ctx.fillStyle = lk.crust; sector(0, 1, 1); ctx.fill();
  ctx.fillStyle = lk.vents ? '#f0c27a' : lk.fill; sector(0, 0.8, 0.74); ctx.fill();
  ctx.save(); sector(0, 0.8, 0.74); ctx.clip();
  if (lk.lattice) {
    ctx.fillStyle = lk.dot; for (let i = 0; i < 10; i++) { circle(x + (pieeatHash(i, 3) - 0.5) * rx * 1.4, y + (pieeatHash(i, 4) - 0.5) * ry * 1.2, Math.max(1.5, rx * 0.045)); ctx.fill(); }
    // (drawn round, then squashed into the plate's perspective)
    ctx.translate(x, y); ctx.scale(1, ry / rx);
    ctx.strokeStyle = lk.crust; ctx.lineWidth = rx * 0.1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(i * rx * 0.32, -rx); ctx.lineTo(i * rx * 0.32, rx); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-rx, i * rx * 0.32); ctx.lineTo(rx, i * rx * 0.32); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(120,60,20,0.18)'; ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * rx * 0.32 + rx * 0.05, -rx); ctx.lineTo(i * rx * 0.32 + rx * 0.05, rx); ctx.stroke(); }
  } else if (lk.vents) {
    ctx.strokeStyle = lk.edge; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (const [dx, dy] of [[-0.3, -0.2], [0.3, -0.2], [0, 0.25], [-0.32, 0.3], [0.32, 0.3]]) { ctx.beginPath(); ctx.moveTo(x + dx * rx - 5, y + dy * ry); ctx.lineTo(x + dx * rx + 5, y + dy * ry); ctx.stroke(); }
    ctx.lineCap = 'butt';
  } else {
    ctx.fillStyle = lk.dot; ctx.beginPath(); ctx.ellipse(x - rx * 0.25, y - ry * 0.2, rx * 0.2, ry * 0.15, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // whipped cream swirls on the last pie
  if (cream) {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i + 0.5) / n * Math.PI * 2;
      if (f < 0.999 && (a < a0 + 0.15 || a > a1 - 0.15) && !(a + Math.PI * 2 >= a0 + 0.15 && a + Math.PI * 2 <= a1 - 0.15)) continue;
      const cx = x + Math.cos(a) * rx * 0.55, cy = y + Math.sin(a) * ry * 0.5;
      ctx.fillStyle = '#ffffff'; circle(cx, cy - 4, rx * 0.12); ctx.fill(); circle(cx, cy - 9, rx * 0.08); ctx.fill();
      ctx.fillStyle = '#ff4f6a'; circle(cx + 1, cy - 14, 2.6); ctx.fill();
    }
    if (f > 0.3) { ctx.fillStyle = '#ffffff'; circle(x, y - 6, rx * 0.16); ctx.fill(); circle(x, y - 13, rx * 0.1); ctx.fill(); ctx.fillStyle = '#ff4f6a'; circle(x + 1, y - 20, 3.4); ctx.fill(); }
  }
}
// the stack of pies still to eat, beside the plate (outer side), with a little "pies left" tag
function pieeatDrawStack(st, E) {
  const R = st.R, x = PIEEAT_X[E.k] + (E.k ? 172 : -172), base = PIEEAT_TABLE + 24;
  const n = R.pies - E.pie - 1, slide = E.swapT > 0 ? 1 - E.swapT / PIEEAT.swapT : 0;
  for (let i = 0; i < n; i++) {
    const y = base - i * 16;
    // (the bottom of the stack is the round's last pie: it has the whipped cream)
    const isLast = i === 0;
    let px = x, py = y;
    if (i === n - 1 && slide > 0) { px = x + (PIEEAT_X[E.k] - x) * slide; py = y + (PIEEAT_PLATE_Y - 8 - y) * slide; }
    ctx.fillStyle = '#a8a8ba'; ctx.beginPath(); ctx.ellipse(px, py + 7, 46, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8c8d8'; ctx.fillRect(px - 46, py - 1, 92, 8);
    pieeatDrawPie(px, py - 2, 44, 12, 1, R.key, isLast, false);
  }
}
// the hiccup jar on the table (inner side): fills with fizzy bubbles; full = HIC!
function pieeatDrawJar(st, E) {
  const x = PIEEAT_X[E.k] + (E.k ? -104 : 104), y1 = PIEEAT_TABLE + 20, h = 64, w = 34, y0 = y1 - h;
  const f = E.hicT > 0 ? E.hicT / PIEEAT.hicT : E.H, warn = f > 0.7 && E.hicT <= 0;
  const shake = warn ? Math.sin(st.t * 40) * 1.5 : E.hicT > 0 ? Math.sin(st.t * 30) * 2.5 : 0;
  ctx.save(); ctx.translate(x + shake, 0);
  // glass
  ctx.fillStyle = 'rgba(220,240,255,0.55)'; rr(-w / 2, y0, w, h, 8); ctx.fill();
  // the fizz
  if (f > 0.01) {
    ctx.save(); rr(-w / 2, y0, w, h, 8); ctx.clip();
    const top = y1 - (h - 4) * f;
    ctx.fillStyle = warn || E.hicT > 0 ? '#9fe0ff' : '#c4ecff'; ctx.fillRect(-w / 2, top, w, y1 - top);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 6; i++) { const by = y1 - ((st.t * 30 + i * 13) % Math.max(4, y1 - top)); circle(-w / 2 + 7 + (i * 7) % (w - 12), by, 1.8 + (i % 3)); ctx.fill(); }
    ctx.restore();
  }
  ctx.strokeStyle = warn ? C.gold : 'rgba(255,255,255,0.95)'; ctx.lineWidth = warn ? 3 : 2; rr(-w / 2, y0, w, h, 8); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; rr(-w / 2 + 4, y0 + 6, 5, h - 14, 3); ctx.fill();
  // the lid and the label
  ctx.fillStyle = E.gold >= 2 ? C.gold : '#e2483c'; rr(-w / 2 - 3, y0 - 8, w + 6, 10, 4); ctx.fill();
  ctx.fillStyle = '#fffaf0'; rr(-w / 2 + 3, y0 + 18, w - 6, 16, 4); ctx.fill();
  text('HIC', 0, y0 + 26.5, 11, '#2f5fc4', 'center', 'body');
  ctx.restore();
}

/* ---------- drawing: Pip and Bo ---------- */
// one eater: a big Pip or Bo behind the table with puffable cheeks, a bib, hands behind the back
function pieeatDrawEater(st, E) {
  const k = E.k, col = PCOL[k], dk = PDARK[k], s = PIEEAT_S, q = PIEEAT;
  const bw = 21, bh = 24;
  let dy = 0, sx = 1, sy = 1, rot = 0;
  // a bite: a dip toward the pie; a gulp: a tall stretch; hiccups: a bounce
  dy += 12 * Math.sin(E.biteA * Math.PI) * (E.biteA > 0 ? 1 : 0);
  if (E.gulpA > 0) { const g = Math.sin((1 - E.gulpA) * Math.PI); sy += 0.07 * g; sx -= 0.05 * g; }
  if (E.hicT > 0) { const b = Math.abs(Math.sin(E.hicBob * 7.5)); dy -= 22 * b; sy += 0.06 * b; rot = Math.sin(E.hicBob * 15) * 0.05; }
  if (E.cheer > 0 || (st.res && st.res.winner === k)) dy -= 8 * Math.abs(Math.sin(st.t * 6));
  const x = PIEEAT_X[k], y = PIEEAT_BASE + dy;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * sx, s * sy);
  // the arms, hands behind the back (contest rules!)
  ctx.strokeStyle = dk; ctx.lineWidth = 4.2; ctx.lineCap = 'round';
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * (bw / 2 - 2), -9); ctx.quadraticCurveTo(d * (bw / 2 + 3), -6, d * (bw / 2 - 1), -1); ctx.stroke(); }
  ctx.lineCap = 'butt';
  if (k === 1) { ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 0.55; for (const ex of [-bw / 2 + 3.5, bw / 2 - 3.5]) { circle(ex, -bh + 1, 4.4); ctx.fill(); ctx.stroke(); } }
  ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 0.6;
  rr(-bw / 2, -bh, bw, bh, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(-bw / 2 + 3, -bh + 3, bw * 0.32, bh * 0.36, 3.5); ctx.fill();
  const sprout = lift => { ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.moveTo(0, -bh - lift); ctx.lineTo(1, -bh - lift - 5); ctx.stroke(); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(4.5, -bh - lift - 7, 5.2, 2.6, -0.5, 0, Math.PI * 2); ctx.fill(); };
  const lift = outfitSproutLift(k) * bh / PH;
  if (k === 0 && !lift) sprout(0);
  // the paper bib with a little pie on it
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-7, -7.5); ctx.quadraticCurveTo(0, -5.5, 7, -7.5); ctx.lineTo(6, 0); ctx.lineTo(-6, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(28,26,54,0.25)'; ctx.lineWidth = 0.3; ctx.stroke();
  ctx.fillStyle = '#f2c27a'; ctx.beginPath(); ctx.ellipse(0, -3, 2.6, 1.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d8324a'; ctx.beginPath(); ctx.ellipse(0, -3.2, 1.7, 0.8, 0, 0, Math.PI * 2); ctx.fill();
  // the face
  const ey = -bh * 0.64, puff = E.cheeks / q.cap, cr = 2 + puff * 4.6, full = E.cheeks >= q.cap;
  const down = E.biteA > 0.1 ? 1.2 : 0;
  let mood = 'happy';
  if (E.hicT > 0) mood = 'hic';
  else if (st.res && st.res.winner === k) mood = 'joy';
  else if (st.res && st.res.winner === 1 - k) mood = 'oops';
  else if (E.gulpA > 0.3 && !E.glug) mood = 'yum';
  else if (E.H > 0.7 || full) mood = 'worry';
  // puffed cheeks (behind the eyes, round the mouth)
  if (E.cheeks > 0) {
    for (const d of [-1, 1]) {
      ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 0.5;
      circle(d * (5.2 + puff * 2.2), ey + 6.4, cr); ctx.fill(); ctx.stroke();
      ctx.fillStyle = full ? 'rgba(255,90,110,0.55)' : 'rgba(255,120,140,0.45)'; circle(d * (5.6 + puff * 2.4), ey + 6, cr * 0.5); ctx.fill();
    }
  } else { ctx.fillStyle = 'rgba(255,120,140,0.45)'; circle(-6.5, ey + 5, 1.9); ctx.fill(); circle(6.5, ey + 5, 1.9); ctx.fill(); }
  // eyes
  ctx.strokeStyle = C.ink; ctx.fillStyle = C.ink; ctx.lineWidth = 0.75; ctx.lineCap = 'round';
  for (const ex of [-4.2, 4.2]) {
    if (mood === 'hic') { ctx.beginPath(); ctx.moveTo(ex - 2.2, ey - 1.6); ctx.lineTo(ex + 1.8, ey); ctx.lineTo(ex - 2.2, ey + 1.6); if (ex > 0) { ctx.moveTo(ex + 2.2, ey - 1.6); ctx.lineTo(ex - 1.8, ey); ctx.lineTo(ex + 2.2, ey + 1.6); } ctx.stroke(); }
    else if (mood === 'joy' || mood === 'yum') { ctx.beginPath(); ctx.arc(ex, ey + 1, 2.4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    else if (E.blinkT < 0) { ctx.beginPath(); ctx.moveTo(ex - 2.4, ey); ctx.lineTo(ex + 2.4, ey); ctx.stroke(); }
    else {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, 2.9, mood === 'worry' ? 3.8 : 3.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink; circle(ex + (k ? -0.6 : 0.6), ey + 0.6 + down, 1.6); ctx.fill();
      if (mood === 'worry') { ctx.beginPath(); ctx.moveTo(ex - 2.6, ey - 4.6 + (ex < 0 ? 0.8 : -0.8) * -1); ctx.lineTo(ex + 2.6, ey - 4.6 + (ex < 0 ? -0.8 : 0.8) * -1); ctx.stroke(); }
    }
  }
  // the mouth: open wide for a bite, puckered when the cheeks are full, a happy grin otherwise
  const my = ey + 6.8;
  if (E.biteA > 0.25) {
    ctx.fillStyle = '#5a1e2a'; ctx.beginPath(); ctx.ellipse(0, my, 3.4, 2.8 * E.biteA + 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-2.2, my - 2.6 * E.biteA - 0.2, 1.6, 1.2); ctx.fillRect(0.6, my - 2.6 * E.biteA - 0.2, 1.6, 1.2);
  } else if (E.cheeks > 0 || mood === 'hic') {
    ctx.fillStyle = '#7a2a3a'; ctx.beginPath(); ctx.ellipse(0, my, 1.4, 1.2, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mood === 'oops') {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-2.4, my + 0.5); ctx.quadraticCurveTo(0, my - 0.8, 2.4, my + 0.5); ctx.stroke();
  } else {
    ctx.fillStyle = '#7a2a3a'; ctx.beginPath(); ctx.arc(0, my - 0.6, 2.6, 0.1, Math.PI - 0.1); ctx.fill();
  }
  // pie on the face: smudges of filling, and a cream moustache from the whipped-cream pie
  const lk = PIEEAT_LOOK[st.R.key] || PIEEAT_LOOK.cherry;
  for (let i = 0; i < E.smudge; i++) {
    ctx.fillStyle = i % 3 === 0 ? lk.crust : lk.fill;
    circle((pieeatHash(i, k + 11) - 0.5) * 14, my + 1 + (pieeatHash(i, k + 13) - 0.3) * 6, 0.7 + pieeatHash(i, k + 17) * 0.8); ctx.fill();
  }
  if (E.cream > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * E.cream).toFixed(2) + ')';
    for (let i = -2; i <= 2; i++) { circle(i * 1.6, my - 1.6 - Math.abs(i) * 0.2, 1.1 + E.cream * 0.7); ctx.fill(); }
    if (E.cream > 0.5) { circle(-5, ey - 6, 1.2); ctx.fill(); }
  }
  // the contest hats (js/outfits.js), Pip's sprout out of the top
  drawOutfit(k, 'head', 0, 0, bw, bh, { face: k ? -1 : 1 });
  if (k === 0 && lift) sprout(lift);
  ctx.lineCap = 'butt';
  ctx.restore();
  // a gold glow round an eater with gold help
  if (E.gold && st.ph !== 'done') {
    ctx.strokeStyle = 'rgba(255,197,61,' + (0.35 + 0.25 * Math.sin(st.t * 4)).toFixed(2) + ')'; ctx.lineWidth = 3;
    rr(x - bw * s / 2 - 8, y - bh * s - 8, bw * s + 16, bh * s + 8, 30); ctx.stroke();
  }
}
// the cheek ring over each head: 6 segments (bites in the cheeks) and the clap circle that lands on it at each clap
function pieeatDrawRing(st, E, big) {
  const q = PIEEAT, m = G.match, x = PIEEAT_X[E.k], y = PIEEAT_RING_Y, sc = big ? 1.25 : 1, r = 26 * sc;
  const live = m && m.phase === 'live' && st.ph === 'eat';
  const w = pieeatWin(E), c = pieeatClapOff(st);
  const on = live && c.off >= -w[0] && c.off <= w[1] && !E.done;
  const gold = E.gold >= 1;
  // the dark disc
  ctx.fillStyle = 'rgba(28,26,54,0.78)'; circle(x, y, r + 12 * sc); ctx.fill();
  // the green (or gold) glow while a gulp now would be a GULP!
  if (on) { ctx.fillStyle = gold ? 'rgba(255,197,61,0.45)' : 'rgba(110,230,120,0.5)'; circle(x, y, r + 12 * sc); ctx.fill(); }
  if (gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 3 * sc; circle(x, y, r + 12 * sc); ctx.stroke(); }
  // the 6 cheek segments
  const n = q.cap, full = E.cheeks >= n, flash = full && Math.sin(st.t * 18) > 0;
  ctx.lineWidth = 8 * sc; ctx.lineCap = 'butt';
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + i * (Math.PI * 2 / n) + 0.09, a1 = a0 + Math.PI * 2 / n - 0.18;
    ctx.strokeStyle = i < E.cheeks ? (full ? (flash ? '#ff6b6b' : '#ffd0a0') : PCOL[E.k]) : 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.arc(x, y, r, a0, a1); ctx.stroke();
  }
  // the clap circle: shrinks onto the ring, landing exactly at the clap
  if (live && !E.done) {
    const u = st.bph - Math.floor(st.bph), rr0 = r + (52 * sc - r) * (1 - u);
    ctx.strokeStyle = on ? (gold ? C.gold : '#7dff8a') : 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3 * sc;
    circle(x, y, rr0); ctx.stroke();
  }
  // the middle: GULP! in the window, else the cheeks count or a mouth icon
  if (on && E.cheeks > 0) text('GULP!', x, y + 1, 15 * sc, gold ? C.gold : '#7dff8a', 'center');
  else if (E.hicT > 0) text('Hic!', x, y + 1, 16 * sc, '#bfe9ff', 'center');
  else text(String(E.cheeks), x, y + 1, 22 * sc, full ? '#ffd0a0' : C.paper, 'center');
  // a quick white flash on each clap
  if (live && st.clapT < 0.12) { ctx.strokeStyle = 'rgba(255,255,255,' + (1 - st.clapT / 0.12).toFixed(2) + ')'; ctx.lineWidth = 4 * sc; circle(x, y, r + 12 * sc); ctx.stroke(); }
}

/* ---------- drawing: the crowd (from behind, at the front of the stage) ---------- */
function pieeatDrawCrowd(st) {
  const m = G.match, live = m && m.phase === 'live';
  const clap = live && st.clapT < 0.18 ? 1 - st.clapT / 0.18 : 0, cheer = st.cheerT < 1.6 ? 1 - st.cheerT / 1.6 : 0;
  const end = m && (m.phase === 'end' || m.phase === 'over');
  const skins = ['#f2c49a', '#c98a5a', '#8a5a3a', '#f6d2b0', '#e0a878'];
  const hairs = ['#5a3a22', '#2a2030', '#b8743a', '#e9c46a', '#7a4a2a'];
  const tops = ['#5b95ff', '#7fd05a', '#ff9f43', '#b28dff', '#ff6b8a', '#4fd0d8', '#ffc53d'];
  for (let row = 0; row < 2; row++) {
    const yb = row === 0 ? 506 : 540, n = row === 0 ? 15 : 13, step = W / n;
    for (let i = 0; i < n; i++) {
      const id = row * 40 + i, x = step * (i + 0.5) + (row ? step * 0.25 : 0) + (pieeatHash(id, 1) - 0.5) * 16;
      const hop = (end || cheer > 0) ? Math.abs(Math.sin(st.t * 8 + id)) * 8 * Math.max(cheer, end ? 1 : 0) : clap * (pieeatHash(id, 9) < 0.6 ? 3 : 0);
      const y = yb - hop, kind = pieeatHash(id, 2);
      const hands = (cheer > 0 || end) ? true : clap > 0 && pieeatHash(id, 3) < 0.55;
      if (kind < 0.07) { pieeatCrowdCow(x, y, hands); continue; }
      if (kind < 0.14) { pieeatCrowdPig(x, y, hands, st.t + id); continue; }
      const skin = skins[Math.floor(pieeatHash(id, 4) * skins.length)], hair = hairs[Math.floor(pieeatHash(id, 5) * hairs.length)];
      const top = tops[Math.floor(pieeatHash(id, 6) * tops.length)], r = 17 + pieeatHash(id, 7) * 5;
      // shoulders
      ctx.fillStyle = top; rr(x - r * 1.5, y - r * 0.6, r * 3, r * 2, r); ctx.fill();
      // hands up
      if (hands) { ctx.fillStyle = skin; circle(x - r * 1.3, y - r * 1.9 - clap * 4, r * 0.38); ctx.fill(); circle(x + r * 1.3, y - r * 1.9 - clap * 4, r * 0.38); ctx.fill(); ctx.fillStyle = top; ctx.fillRect(x - r * 1.45, y - r * 1.7, r * 0.3, r * 1.3); ctx.fillRect(x + r * 1.15, y - r * 1.7, r * 0.3, r * 1.3); }
      // the back of the head, hair, maybe a hat
      ctx.fillStyle = skin; circle(x, y - r * 1.15, r); ctx.fill();
      ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(x, y - r * 1.15, r, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); circle(x, y - r * 0.9, r * 0.78); ctx.fill();
      const hat = pieeatHash(id, 8);
      if (hat < 0.25) { ctx.fillStyle = '#e9c46a'; ctx.beginPath(); ctx.ellipse(x, y - r * 1.75, r * 1.45, r * 0.32, 0, 0, Math.PI * 2); ctx.fill(); rr(x - r * 0.7, y - r * 2.4, r * 1.4, r * 0.75, r * 0.3); ctx.fill(); ctx.fillStyle = '#e2483c'; ctx.fillRect(x - r * 0.7, y - r * 1.9, r * 1.4, r * 0.18); }
      else if (hat < 0.42) { ctx.fillStyle = tops[(Math.floor(hat * 50)) % tops.length]; ctx.beginPath(); ctx.arc(x, y - r * 1.4, r * 0.95, Math.PI, Math.PI * 2); ctx.fill(); }
      else if (hat < 0.5) { ctx.fillStyle = '#ff6b8a'; circle(x - r * 0.4, y - r * 2.05, r * 0.3); ctx.fill(); circle(x + r * 0.4, y - r * 2.05, r * 0.3); ctx.fill(); }
    }
  }
}
function pieeatCrowdCow(x, y, hands) {
  ctx.fillStyle = '#ffffff'; rr(x - 26, y - 12, 52, 34, 16); ctx.fill();
  ctx.fillStyle = '#ffffff'; circle(x, y - 22, 20); ctx.fill();
  ctx.fillStyle = '#2a2030'; circle(x - 8, y - 28, 7); ctx.fill(); circle(x + 12, y - 14, 5); ctx.fill(); circle(x - 14, y + 2, 6); ctx.fill();
  ctx.fillStyle = '#f2e6c8'; ctx.beginPath(); ctx.moveTo(x - 14, y - 38); ctx.lineTo(x - 22, y - 50); ctx.lineTo(x - 8, y - 40); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 14, y - 38); ctx.lineTo(x + 22, y - 50); ctx.lineTo(x + 8, y - 40); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x - 22, y - 30, 9, 5, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + 22, y - 30, 9, 5, 0.4, 0, Math.PI * 2); ctx.fill();
  if (hands) { ctx.fillStyle = '#ffd36b'; circle(x + 30, y - 40, 6); ctx.fill(); } // (a little bell flag)
}
function pieeatCrowdPig(x, y, hands, t) {
  ctx.fillStyle = '#ffb3c6'; rr(x - 24, y - 12, 48, 34, 16); ctx.fill();
  circle(x, y - 22, 19); ctx.fill();
  ctx.fillStyle = '#ff8fab'; ctx.beginPath(); ctx.moveTo(x - 14, y - 36); ctx.lineTo(x - 18, y - 48); ctx.lineTo(x - 4, y - 40); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 14, y - 36); ctx.lineTo(x + 18, y - 48); ctx.lineTo(x + 4, y - 40); ctx.fill();
  // the curly tail
  ctx.strokeStyle = '#ff8fab'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + 22, y + 4, 5, 0, Math.PI * 1.6 + Math.sin(t * 3) * 0.3); ctx.stroke();
  if (hands) { ctx.fillStyle = '#ff8fab'; circle(x - 26, y - 30, 6); ctx.fill(); circle(x + 26, y - 30, 6); ctx.fill(); }
}

function pieeatDrawWorld() {
  const st = G.mst; if (!st.pl) return;
  pieeatDrawBack(st);
  pieeatDrawSign(st);
  pieeatDrawJudge(st);
  for (const E of st.pl) pieeatDrawEater(st, E);
  pieeatDrawTableTop();
  pieeatDrawRibbon(st);
  for (const E of st.pl) {
    pieeatDrawStack(st, E);
    const f = E.left / st.R.bites, last = E.pie === st.R.pies - 1;
    pieeatDrawPie(PIEEAT_X[E.k], PIEEAT_PLATE_Y - 6, 66, 22, E.swapT > 0 ? 0 : f, st.R.key, last, true);
    pieeatDrawJar(st, E);
  }
  pieeatDrawCloth(st);
}
function pieeatDrawTop() {
  const st = G.mst, m = G.match; if (!st.pl) return;
  const big = hudBig();
  // (the cheek rings stay hidden behind the framework's "Round N" card: they'd only peek out round its edges)
  if (!(m && m.phase === 'ready')) for (const E of st.pl) pieeatDrawRing(st, E, big);
  // crumbs, sparkles and bubbles
  for (const f of st.vis.fx) {
    const a = clamp(f.life / f.max, 0, 1);
    ctx.globalAlpha = a;
    if (f.kind === 'bubble') { ctx.strokeStyle = f.col; ctx.lineWidth = 1.5; circle(f.x, f.y, f.size); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; circle(f.x - f.size * 0.3, f.y - f.size * 0.3, f.size * 0.3); ctx.fill(); }
    else if (f.kind === 'spark') { ctx.fillStyle = f.col; pieeatStar(f.x, f.y, f.size * (0.8 + 0.6 * a)); }
    else { ctx.fillStyle = f.col; circle(f.x, f.y, f.size); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  pieeatDrawCrowd(st);
  // world pops (the crowd's hooray)
  for (const p of st.vis.pops) { const k = p.t / 1.4; ctx.globalAlpha = 1 - k * k; bigText(p.text, clamp(p.x, 120, W - 120), p.y - 30 * k, big ? 30 : 24, p.col, 1 + 0.3 * Math.max(0, 1 - p.t * 6)); ctx.globalAlpha = 1; }
  // pops over each eater (beside the head, on the outer side, clear of the ring)
  for (const E of st.pl) if (E.popT < 1.2 && E.pop) {
    const k = E.popT / 1.2, fs = E.popBig ? (big ? 34 : 28) : (big ? 26 : 19);
    ctx.font = fs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const w = ctx.measureText(E.pop).width * 1.1 + 8;
    const x = clamp(PIEEAT_X[E.k] + (E.k ? 1 : -1) * ((big ? 52 : 66) + w / 2), w / 2 + 8, W - w / 2 - 8); // out past the hat brim
    ctx.globalAlpha = 1 - k * k;
    bigText(E.pop, x, 300 - 26 * k, fs, E.popCol, 1 + 0.25 * Math.max(0, 1 - k * 5));
    ctx.globalAlpha = 1;
  }
  // name tags through the intro card, "Round N" and 3-2-1
  const tagA = G.introT > 0 ? 1 - clamp(G.introT / 0.5, 0, 1) : m && (m.phase === 'ready' || m.phase === 'count') ? 1 : 0;
  if (tagA > 0) for (const E of st.pl) {
    const cpu = pieeatCpu(E.k), hw = cpu ? 34 : 22, x = PIEEAT_X[E.k], y = PIEEAT_BASE - 100;
    ctx.globalAlpha = tagA; ctx.fillStyle = PCOL[E.k]; rr(x - hw, y - 11, hw * 2, 22, 11); ctx.fill();
    text(cpu ? NAMES[E.k] + ' · CPU' : NAMES[E.k], x, y + 0.5, 14, '#fff', 'center', 'body'); ctx.globalAlpha = 1;
  }
}

/* ---------- HUD ---------- */
// each player's own keys (none for the computer)
function pieeatKeys(id) {
  let k = 'kb'; try { k = actKey(id); } catch (e) { k = 'kb'; }
  if (k === 'pad') return { bite: glyph('act'), gulp: glyph('a') };
  if (k === 'touch') return { bite: 'bite', gulp: '▲', touch: true };
  if (typeof cpuSolo === 'function' && cpuSolo()) return { bite: 'F or /', gulp: 'W or ↑' };
  return id === 0 ? { bite: 'F', gulp: 'W' } : { bite: '/', gulp: '↑' };
}
function pieeatChip(label, x, y, big, col, gold) {
  const fs = big ? 21 : 14, h = big ? 36 : 24;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(label).width + (big ? 26 : 22), cx = clamp(x, w / 2 + 6, W - w / 2 - 6), cy = clamp(y, h / 2 + 4, H - h / 2 - 4);
  ctx.fillStyle = 'rgba(28,26,54,0.9)'; rr(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; rr(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.stroke();
  text(label, cx, cy + 0.5, fs, gold ? C.gold : C.paper, 'center', 'body');
}
// a tiny pie icon (the panels): f = how much of it is eaten
function pieeatIcon(x, y, r, f, key) {
  const lk = PIEEAT_LOOK[key] || PIEEAT_LOOK.cherry;
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; circle(x, y, r); ctx.fill();
  if (f > 0) {
    ctx.fillStyle = lk.crust; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(f, 0, 1)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = lk.fill; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r * 0.66, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(f, 0, 1)); ctx.closePath(); ctx.fill();
  }
  if (f >= 1) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; circle(x, y, r + 1); ctx.stroke(); }
}
// what a person should do next (null when nothing needs saying)
function pieeatAdvice(st, E, kk) {
  if (E.done) return null;
  if (E.hicT > 0) return { t: 'Hic! Hic! Wait a moment...', col: '#bfe9ff' };
  if (E.cheeks >= PIEEAT.cap) return { t: 'Cheeks full! Gulp (' + kk.gulp + ') on the clap!', col: '#ffd0a0', warn: true };
  if (E.H > 0.62) return { t: 'Slow down! Your hiccup jar is nearly full!', col: '#bfe9ff', warn: true };
  if (E.left <= 0 && E.cheeks > 0) return { t: 'Last bite! Gulp (' + kk.gulp + ') on the clap!', col: C.gold };
  return null;
}
function pieeatHud() {
  const st = G.mst, m = G.match; if (!st.pl || !m) return;
  const big = hudBig(), sz = big ? 1.45 : 1, R = st.R;
  // bottom corners: each eater's panel: name, a pie icon per pie, what is happening
  for (const E of st.pl) {
    const left = E.k === 0, pw = 286 * sz, ph = 40 * sz, y = H - 6 - ph, x = left ? 10 : W - 10 - pw;
    ctx.fillStyle = 'rgba(28,26,54,0.88)'; rr(x, y, pw, ph, ph / 2); ctx.fill();
    if (E.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; rr(x, y, pw, ph, ph / 2); ctx.stroke(); }
    const nx = left ? x + 16 * sz : x + pw - 16 * sz;
    text(NAMES[E.k], nx, y + ph / 2 + 0.5, 18 * sz, PCOL[E.k], left ? 'left' : 'right');
    // the pies: each fills as it is swallowed
    const ir = 11 * sz, gapI = 27 * sz, done = pieeatPiesDone(st, E);
    for (let i = 0; i < R.pies; i++) {
      const ix = left ? x + 64 * sz + i * gapI : x + pw - 64 * sz - i * gapI;
      pieeatIcon(ix, y + ph / 2, ir, clamp(done - i, 0, 1), R.key);
    }
    // the status line
    let lab = '', col = 'rgba(246,239,223,0.85)';
    if (m.phase === 'ready' || m.phase === 'count' || m.phase === 'intro') { lab = E.gold ? (E.gold >= 2 ? 'Gold gulps + tummy' : 'Gold gulps') : 'Ready...'; if (E.gold) col = C.gold; }
    else if (E.done || st.res) {
      const w = m.end ? m.end.winner : st.res ? st.res.winner : -2;
      lab = w === E.k ? 'Winner! Yum!' : 'Good munching!';
    }
    else if (E.hicT > 0) { lab = 'Hic! Hic!'; col = '#bfe9ff'; }
    else if (E.swapT > 0) lab = 'Next pie...';
    else if (E.cheeks >= PIEEAT.cap) { lab = 'Cheeks full!'; col = '#ffd0a0'; }
    else if (E.popT < 0.6 && E.pop.startsWith('GULP')) { lab = E.streak >= 2 ? E.streak + ' GULP!s in a row!' : 'GULP!'; col = C.gold; }
    else if (E.H > 0.62) { lab = 'Tummy fizzing...'; col = '#bfe9ff'; }
    else if (E.gold) { lab = E.gold >= 2 ? 'Gold gulps + tummy' : 'Gold gulps'; col = C.gold; }
    else lab = E.cheeks > 0 ? 'Munch munch...' : 'Bite!';
    const sx = left ? x + pw - 14 * sz : x + 14 * sz;
    text(lab, sx, y + ph / 2 + 0.5, 13 * sz, col, left ? 'right' : 'left', 'body');
  }
  // the pie name, top left under the level pill
  {
    const fs = big ? 17 : 13, h = big ? 32 : 26, y0 = 46;
    const lab = R.name + (st.sudden ? '' : '  ·  ' + R.pies + ' pies' + (st.round >= 5 ? '  ·  the final!' : ''));
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(lab).width + (big ? 34 : 28); pill(14, y0, w, h); text(lab, 14 + (big ? 17 : 14), y0 + h / 2 + 0.5, fs, C.gold, 'left', 'body');
  }
  const chipY = (k) => H - 6 - 40 * sz - (big ? 28 : 20);
  const cxp = k => (k === 0 ? 10 + 286 * sz / 2 : W - 10 - 286 * sz / 2);
  if (m.phase === 'live') {
    // each person: the keys early in rounds 1-2 (never the computer's), and a warning when the cheeks are full or the jar fizzes
    for (const E of st.pl) {
      if (pieeatCpu(E.k) || E.done || st.res) continue;
      const kk = pieeatKeys(E.k), adv = pieeatAdvice(st, E, kk);
      if (adv && (adv.warn || st.round <= 2 || E.left <= 0)) pieeatChip(adv.t, cxp(E.k), chipY(E.k), big, adv.warn ? C.gold : PCOL[E.k], !!adv.warn);
      else if (st.round <= 2 && st.rt < 9) pieeatChip(kk.touch ? 'tap bite to eat  ·  ▲ gulp on the clap' : kk.bite + ' bite  ·  ' + kk.gulp + ' gulp on the clap', cxp(E.k), chipY(E.k), big, PCOL[E.k], false);
    }
  }
  if (m.phase === 'ready' || m.phase === 'count') {
    // the round card, below the framework's 3-2-1 circle (which ends at y 274)
    const nf = big ? 30 : 22, hf = big ? 20 : 14;
    ctx.font = '700 ' + hf + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const lines = [R.hint];
    const w = Math.min(W - 20, Math.max(big ? 380 : 320, ...lines.map(l => ctx.measureText(l).width + 44)));
    const ch = big ? 72 : 52, gold = st.pl.some(E => E.gold), yy = big ? 282 : 286;
    const a = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1, cx = W / 2;
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(28,26,54,0.88)'; rr(cx - w / 2, yy, w, ch, 14); ctx.fill();
    ctx.strokeStyle = gold ? C.gold : 'rgba(246,239,223,0.25)'; ctx.lineWidth = 2; rr(cx - w / 2, yy, w, ch, 14); ctx.stroke();
    text(R.name, cx, yy + ch * 0.32, nf, C.gold, 'center');
    text(R.hint, cx, yy + ch * 0.73, hf, C.paper, 'center', 'body');
    for (const E of st.pl) {
      let y = chipY(E.k);
      if (!pieeatCpu(E.k) && m.round <= 2) {
        const kk = pieeatKeys(E.k);
        pieeatChip(kk.touch ? NAMES[E.k] + ': tap bite · ▲ gulp' : NAMES[E.k] + ': ' + kk.bite + ' bite · ' + kk.gulp + ' gulp', cxp(E.k), y, big, PCOL[E.k], false);
        y -= big ? 44 : 30;
      }
      if (E.gold) pieeatChip(E.gold >= 2 ? 'Gold for ' + NAMES[E.k] + ': easier GULP!s + a calm tummy!' : 'Gold for ' + NAMES[E.k] + ': easier GULP!s!', cxp(E.k), y, big, C.gold, true);
    }
    ctx.globalAlpha = 1;
  }
}

/* ---------- sounds ---------- */
Sfx.extra.pieeatBite = function (p) { this.tone(520 * p, 0.05, 'square', 0.025, 300 * p); this.tone(180 * p, 0.06, 'triangle', 0.04, 120 * p, 0.02); };
Sfx.extra.pieeatGulp = function (p) { this.tone(300 * p, 0.12, 'sine', 0.07, 140 * p); [784, 1047, 1319].forEach((f, i) => this.tone(f * p, 0.08, 'triangle', 0.04, null, 0.08 + i * 0.05)); };
Sfx.extra.pieeatGlug = function (p) { this.tone(260 * p, 0.1, 'sine', 0.06, 160 * p); this.tone(220 * p, 0.12, 'sine', 0.05, 130 * p, 0.12); };
Sfx.extra.pieeatAir = function (p) { this.tone(400 * p, 0.08, 'sine', 0.03, 250 * p); };
Sfx.extra.pieeatFull = function (p) { this.tone(200 * p, 0.12, 'triangle', 0.05, 150 * p); this.tone(160 * p, 0.12, 'triangle', 0.04, 120 * p, 0.08); };
Sfx.extra.pieeatHic = function (p) { this.tone(700 * p, 0.06, 'square', 0.04, 1300 * p); this.tone(1200 * p, 0.05, 'sine', 0.03, 700 * p, 0.06); };
Sfx.extra.pieeatClap = function () { this.tone(1900, 0.025, 'square', 0.012, 900); this.tone(240, 0.04, 'triangle', 0.03, 150); };
Sfx.extra.pieeatSlide = function (p) { this.tone(420 * p, 0.1, 'triangle', 0.03, 640 * p); };
Sfx.extra.pieeatCheer = function () { [523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.04, null, i * 0.06)); this.tone(1400, 0.2, 'sawtooth', 0.008, 1800, 0.05); };
Sfx.extra.pieeatWhistle = function () { this.tone(2200, 0.12, 'sine', 0.05, 2500); this.tone(2400, 0.25, 'sine', 0.05, 2200, 0.13); };
Sfx.extra.pieeatGold = function () { this.tone(784, 0.1, 'triangle', 0.05); this.tone(1046, 0.12, 'triangle', 0.045, null, 0.08); this.tone(1318, 0.16, 'triangle', 0.04, null, 0.16); };
Sfx.extra.pieeatWin = function (p) { [523, 659, 784, 1047].forEach((f, i) => this.tone(f * p, 0.14, 'triangle', 0.05, null, i * 0.07)); };
