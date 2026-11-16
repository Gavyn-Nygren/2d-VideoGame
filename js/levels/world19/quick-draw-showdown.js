/* Pip & Bo - Level 19-4 Quick-Draw Showdown (versus, World 19 Tumbleweed Gulch). */
'use strict';

/* ===== 19-4 Quick-Draw Showdown (mode 'quickdraw', versus, best of 7) =====
   Gavyn's pick: "Stand back to back, then wait for 'DRAW!' and fire your cork popgun first. Fakeouts like a crow cawing
   or 'DRAWER!' make you shoot too early, and that's a foul. In later rounds, cardboard bandits pop up and you have to
   hit the right one."
   A dusty main street at high noon: the General Store, the Root Beer Saloon (Mayor Mosey calls the duel from its
   balcony, with the big brass DRAW bell beside him) and the Hats & Boots shop (a crow on its sign, a cowbell on its
   porch post), a water trough, barrels and cactus, red mesas behind. def.ownStep: the mode runs the whole live tick,
   the camera and the picture; the platformer bodies are hidden (alive false) and the mode draws Pip and Bo itself, in
   little cowboy hats with toy cork popguns (a cork on a springy string and a POP! flag: clearly toys).
   A round (after the framework's Round N card and 3-2-1, where they stand back to back):
     pace   the Mayor counts "1... 2... 3..." and they pace apart by themselves (1.5 s), then turn to face each other.
            A press here is only "Not yet!" (no foul).
     wait   a random 1.5-5 s with little ambient things (tumbleweeds, dust, a blinking crow). From round 2 there are
            fakeouts: the Mayor says "DRAWER!", "DRAGON!", "DRUMSTICK!"..., the crow caws "CAW!", a tumbleweed
            CLONKs the cowbell, the saloon doors go WHAP!, the Mayor sneezes "ACHOO!". A press in the wait is a FOUL:
            the popgun goes fzzt and the other player wins the round ("Too early, Pip!"). Both in the same moment:
            "Both too early!", replayed.
     DRAW!  always the huge gold DRAW! banner, a white flash and the big brass bell (its own ding-ding sound), never a
            speech bubble alone. The first fresh action press wins: the cork pops the other's hat off. Presses within
            15 ms of each other (effective times) are a tie and the framework replays the round. Each reaction time
            shows in ms on the panels, over the heads and on the round banner.
     target (rounds 4, 6 and 7): at DRAW! three cardboard cutouts pop up across the street: one silly bandit (the
            target, at a random spot) and two friends (Granny with a pie, the Sheriff, Daisy the cow). ◀ ▶ move your
            aim marker (it always starts in the middle) one spot per press (holding repeats), then fire. Hitting the
            bandit first wins; hitting a friend is a foul ("Oops! Sorry, Granny!").
     guard  nobody fires within 6 s of DRAW!: a tie, replayed.
   Rounds: 1 First Draw (no fakeouts), 2 Tricky Words (Mayor's words), 3 Noisy Noon (1-2 of anything), 4 Bandit Pop-up,
   5 Fakeout Frenzy (2-3), 6 Bandit Shuffle, 7 Final Showdown; a tied round replays with fresh fakeouts; sudden death
   (2nd tie in a row with no tiebreak) is a Sudden Draw. tiebreak(): the fastest best reaction this match.
   Catch-up help, gold and announced (round card, panel border, "Gold" line on the readout): 1 round behind = a 40 ms
   gold head start (your reaction counts 40 ms faster); 2+ behind = 70 ms and gold patience (your first early press in
   the round is forgiven: "Phew! Gold patience!"). Off in sudden death.
   Soft fails only: a foul is a fizzle and a puff of smoke, a popped hat is a giggle. Nobody gets hurt.
   Every top-level name is prefixed qd / QD, every sound Sfx.extra.quickdraw*. Rule randomness only from
   MODES.quickdraw.rand; looks use their own qdVR. */
const QD = {
  feetY: 468, cx: 480,
  backX: [459, 501], paceX: [232, 728],      // back to back, and where the three paces end
  paceT: 0.5, paces: 3, turnT: 0.45,         // seconds per pace, and the turn to face each other
  waitMin: 1.5, waitMax: 5,                  // the tense wait before DRAW!
  tie: 0.015, guard: 6, showT: 1.0,          // tie window (s), no-fire guard after DRAW (s), the pop before the banner
  cutX: [362, 480, 598], cutY: 432, cutW: 62, cutH: 104, popT: 0.16,
  rep0: 0.32, rep: 0.17,                     // holding ◀ ▶ repeats the aim after rep0, then every rep
  gold1: 0.04, gold2: 0.07,                  // gold head starts (s)
  refX: 480, refY: 262, bellX: 548, bellY: 214, crowX: 822, crowY: 152, cowbellX: 772, cowbellY: 318,
  s: 1.8,                                    // heroes' drawing scale
  corkT: 0.17,
};
const QD_TWISTS = {
  plain: { name: 'First Draw', hint: 'Wait for the gold DRAW! and the bell, then fire!', fakes: [0, 0], kinds: [], target: false },
  words: { name: 'Tricky Words', hint: 'Mayor Mosey may say DRAWER! or DRAGON! Only the gold DRAW! counts.', fakes: [1, 1], kinds: ['word'], target: false },
  noisy: { name: 'Noisy Noon', hint: 'Crows, doors and sneezes! Wait for the gold DRAW!', fakes: [1, 2], kinds: ['word', 'caw', 'clonk', 'doors', 'achoo'], target: false },
  bandit: { name: 'Bandit Pop-up', hint: 'After DRAW!, aim ◀ ▶ at the bandit cutout, then fire!', fakes: [0, 1], kinds: ['word', 'caw', 'doors'], target: true },
  frenzy: { name: 'Fakeout Frenzy', hint: 'Lots of tricks this time! Keep your cool.', fakes: [2, 3], kinds: ['word', 'caw', 'clonk', 'doors', 'achoo'], target: false },
  shuffle: { name: 'Bandit Shuffle', hint: 'Bandit cutouts again! Aim ◀ ▶, then fire. Not at Granny!', fakes: [1, 2], kinds: ['word', 'caw', 'clonk', 'doors', 'achoo'], target: true },
  final: { name: 'Final Showdown', hint: 'Tricks AND bandits. Steady now!', fakes: [1, 2], kinds: ['word', 'caw', 'clonk', 'doors', 'achoo'], target: true },
  sudden: { name: 'Sudden Draw', hint: 'Tied again! One draw decides it.', fakes: [1, 1], kinds: ['word', 'caw', 'achoo'], target: false },
};
const QD_ORDER = ['plain', 'words', 'noisy', 'bandit', 'frenzy', 'shuffle', 'final'];
const QD_WORDS = ['DRAWER!', 'DRAGON!', 'DRUMSTICK!', 'DRAWBRIDGE!', 'DRAMA!', 'DRIZZLE!', 'DRAWING!'];
const QD_FRIENDS = ['granny', 'sheriff', 'cow'];
const QD_FRIEND_SORRY = { granny: 'Oops! Sorry, Granny!', sheriff: 'Oops! Sorry, Sheriff!', cow: 'Oops! Sorry, Daisy!' };
const QD_FRIEND_NAME = { granny: 'Granny', sheriff: 'the Sheriff', cow: 'Daisy the cow' };
const QD_FAKE_POP = { caw: 'CAW!', clonk: 'CLONK!', doors: 'WHAP!', achoo: 'ACHOO!' };
// looks-only randomness (dust, sparkles, ambient tumbleweeds): never MODES.quickdraw.rand
let qdVS = 20261119;
const qdVR = () => { qdVS = (Math.imul(qdVS, 1664525) + 1013904223) >>> 0; return qdVS / 4294967296; };
// 1-player mode: the computer plays this duelist (no key reminders or hints for it)
const qdCpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
const qdBig = () => (typeof stageScale === 'number' ? stageScale < 0.72 : hudBig());
const qdMs = s => Math.round(s * 1000) + ' ms';
const qdEase = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };

/* ---------- the duelists ---------- */
function qdMakeDuelist(k) {
  return { k, gold: 0, bonus: 0, patience: false, raw: null, eff: null, foul: '', aim: 1, prevL: false, prevR: false, holdT: 0, holdD: 0,
    nopeT: 0, drawn: false,
    // looks only
    pop: '', popT: 9, popCol: '#fff', popBig: false, gunT: -1, fzztT: -1, cork: null, hat: null, mood: 'happy', cheer: 0 };
}
function qdPop(P, text, col, big) { P.pop = text; P.popCol = col || '#ffffff'; P.popT = 0; P.popBig = !!big; }
// where a duelist stands (world x) and which way they face, from the round's clock
function qdStance(st, k) {
  const q = QD, sgn = k ? 1 : -1;
  if (st.ph === 'set') return { x: q.backX[k], face: sgn, walk: 0 };
  const rt = st.rt, paceEnd = q.paces * q.paceT;
  if (rt < paceEnd) {
    const i = Math.floor(rt / q.paceT), f = (rt - i * q.paceT) / q.paceT;
    const u = (i + qdEase(f * 1.25)) / q.paces;
    return { x: q.backX[k] + (q.paceX[k] - q.backX[k]) * u, face: sgn, walk: f < 0.8 ? Math.sin(f / 0.8 * Math.PI) : 0 };
  }
  // the turn: the facing flips through 0 (a quick spin)
  const tf = clamp((rt - paceEnd) / q.turnT, 0, 1);
  return { x: q.paceX[k], face: tf >= 1 ? -sgn : sgn * Math.cos(tf * Math.PI), walk: 0 };
}

/* ---------- the round ---------- */
function qdNewRound(st, n, info, R) {
  const key = info.suddenDeath ? 'sudden' : (st.forceTwist || QD_ORDER[Math.min(n, QD_ORDER.length) - 1]);
  const tw = QD_TWISTS[key];
  st.twist = key; st.round = n;
  const nf = tw.fakes[0] + Math.floor(R() * (tw.fakes[1] - tw.fakes[0] + 1));
  let wait = QD.waitMin + R() * (QD.waitMax - QD.waitMin);
  wait = Math.max(wait, Math.min(QD.waitMax + 0.6, 1.25 + nf * 1.05));
  const turnEnd = QD.paces * QD.paceT + QD.turnT;
  st.turnEnd = turnEnd; st.drawAt = turnEnd + wait; st.wait = wait;
  // fakeouts: spread over the wait, at least 0.8 s apart, never in the last 0.5 s before DRAW!
  st.fakes = [];
  const lo = 0.6, hi = wait - 0.5;
  for (let i = 0; i < nf; i++) {
    const a = lo + (hi - lo) * i / nf, b = lo + (hi - lo) * (i + 1) / nf - 0.25;
    const t = turnEnd + a + R() * Math.max(0.05, b - a);
    const kind = tw.kinds[Math.floor(R() * tw.kinds.length)];
    st.fakes.push({ id: i, t, kind, word: QD_WORDS[Math.floor(R() * QD_WORDS.length)], done: false });
  }
  // target rounds: where the bandit stands and which friends stand by it
  st.target = tw.target;
  const fr = QD_FRIENDS.slice();
  for (let i = fr.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [fr[i], fr[j]] = [fr[j], fr[i]]; }
  st.bandit = Math.floor(R() * 3);
  st.cuts = [0, 1, 2].map(i => ({ kind: i === st.bandit ? 'bandit' : fr.pop(), hitBy: -1, hitT: 0 }));
  st.pl = [0, 1].map(qdMakeDuelist);
  for (const P of st.pl) {
    P.gold = info.suddenDeath ? 0 : Math.max(0, info.wins[1 - P.k] - info.wins[P.k]);
    P.bonus = P.gold >= 2 ? QD.gold2 : P.gold >= 1 ? QD.gold1 : 0;
    P.patience = P.gold >= 2;
  }
  st.ph = 'set'; st.rt = 0; st.res = null; st.resT = 0; st.count = 0; st.drawSeen = false; st.fakeN = 0;
  st.ref = { say: '', sayT: 9, sayGold: false, arm: 0, sneeze: -9 };
  st.vis.doorsT = -9; st.vis.crowT = -9; st.vis.cowbellT = -9; st.vis.bellT = -9; st.vis.flash = 0; st.vis.drawT = -9;
  st.vis.fakeTw = null; st.vis.pops = [];
}
function qdRefSay(st, text, gold) { st.ref.say = text; st.ref.sayT = 0; st.ref.sayGold = !!gold; }
function qdWorldPop(st, text, x, y, col) { st.vis.pops.push({ text, x, y, t: 0, col: col || '#ffffff' }); }
// a fakeout happens (rules: it only tempts; the presses are what count)
function qdFake(st, f) {
  f.done = true; st.fakeN++;
  st.lastFake = { id: f.id, kind: f.kind, t: st.rt };
  const v = st.vis;
  if (f.kind === 'word') { qdRefSay(st, f.word, false); st.ref.arm = 1; Sfx.play('quickdrawWord'); }
  else if (f.kind === 'caw') { v.crowT = 0; qdWorldPop(st, 'CAW!', QD.crowX - 4, QD.crowY - 44, '#f0eadf'); Sfx.play('quickdrawCaw'); }
  else if (f.kind === 'clonk') { v.cowbellT = 0; qdWorldPop(st, 'CLONK!', QD.cowbellX, QD.cowbellY - 40, '#ffe6a8'); Sfx.play('quickdrawClonk'); }
  else if (f.kind === 'doors') { v.doorsT = 0; qdWorldPop(st, 'WHAP!', QD.cx, 300, '#ffe6a8'); Sfx.play('quickdrawDoors'); }
  else if (f.kind === 'achoo') { st.ref.sneeze = 0; qdRefSay(st, 'ACHOO!', false); Sfx.play('quickdrawAchoo'); }
}
function qdDraw(st) {
  st.ph = 'draw'; st.drawSeen = true; st.drawT0 = st.rt;
  const v = st.vis;
  v.bellT = 0; v.flash = 1; v.drawT = 0;
  qdRefSay(st, 'DRAW!', true); st.ref.arm = 1;
  Sfx.play('quickdrawBell');
  rumble(0, 0.2, 0.4, 90); rumble(1, 0.2, 0.4, 90);
  if (st.target) Sfx.play('quickdrawPopup');
  for (const P of st.pl) P.aim = 1;
}
// a round is decided: the pop plays for QD.showT, then the framework's banner
function qdResolve(st, winner, reason, how) {
  if (st.res) return;
  st.res = { winner, reason, how }; st.resT = 0; st.ph = 'done';
  const s = st.stat;
  if (winner >= 0) {
    const W0 = st.pl[winner], L0 = st.pl[1 - winner];
    if (how === 'fast' || how === 'bandit') {
      W0.cheer = 1;
      // the winner's cork flies: at the bandit, or at the other's hat
      if (how === 'bandit') {
        W0.cork = { t: 0, tx: QD.cutX[st.bandit], ty: QD.cutY - QD.cutH * 0.78, hit: 'cut', i: st.bandit };
      } else {
        W0.cork = { t: 0, tx: qdStance(st, L0.k).x, ty: QD.feetY - 58 * QD.s / 1.8, hit: 'hat', who: L0.k };
      }
      W0.gunT = 0;
      Sfx.play('quickdrawPop', winner);
      qdPop(W0, how === 'bandit' ? 'Got the bandit!' : 'POP!', how === 'bandit' ? C.gold : '#ffffff', true);
    }
  }
}
function qdKeyEdges(P, p, dt) {
  const L = !!p.input.left && !p.input.right, Rr = !!p.input.right && !p.input.left;
  let move = 0;
  if (L && !P.prevL) { move = -1; P.holdT = 0; }
  else if (Rr && !P.prevR) { move = 1; P.holdT = 0; }
  else if (L || Rr) {
    P.holdT += dt;
    if (P.holdT >= QD.rep0) { P.holdT -= QD.rep; move = L ? -1 : 1; }
  } else P.holdT = 0;
  P.prevL = L; P.prevR = Rr;
  return move;
}
function qdTick(dt, live) {
  const st = G.mst;
  st.t += dt;
  if (live) {
    st.rt += dt;
    const q = QD;
    // phases from the round clock
    if (st.ph === 'set') st.ph = 'pace';
    if (st.ph === 'pace') {
      const n = Math.min(q.paces, Math.floor(st.rt / q.paceT) + 1);
      if (n > st.count) { st.count = n; qdRefSay(st, n + '...', false); Sfx.play('quickdrawStep', 0); Sfx.play('quickdrawStep', 1); for (const k of [0, 1]) qdDust(st, qdStance(st, k).x, q.feetY, 5); }
      if (st.rt >= q.paces * q.paceT) { st.ph = 'turn'; qdRefSay(st, 'Turn!', false); Sfx.play('quickdrawTurn'); }
    }
    if (st.ph === 'turn' && st.rt >= st.turnEnd) { st.ph = 'wait'; qdRefSay(st, 'Steady...', false); }
    if (st.ph === 'wait') {
      for (const f of st.fakes) if (!f.done && st.rt >= f.t) qdFake(st, f);
    }
    // presses
    const presses = [false, false];
    for (const P of st.pl) {
      const p = G.players[P.k];
      presses[P.k] = !!p.pendingAct;
      P.nopeT -= dt;
      const mv = qdKeyEdges(P, p, dt);
      if (st.ph === 'draw' && st.target && P.raw == null && !P.foul && mv) {
        const a = clamp(P.aim + mv, 0, 2);
        if (a !== P.aim) { P.aim = a; Sfx.play('quickdrawAim', P.k); }
      }
    }
    if (st.ph === 'pace' || st.ph === 'turn') {
      for (const P of st.pl) if (presses[P.k] && P.nopeT <= 0) { P.nopeT = 0.7; qdPop(P, 'Not yet! Wait for DRAW!', '#d9d3ef'); Sfx.play('quickdrawNope', P.k); }
    } else if (st.ph === 'wait') {
      const fouls = [];
      for (const P of st.pl) {
        if (!presses[P.k]) continue;
        if (P.patience) { P.patience = false; P.usedPatience = true; qdPop(P, 'Phew! Gold patience!', C.gold, true); Sfx.play('quickdrawGold'); continue; }
        fouls.push(P);
      }
      for (const P of fouls) { P.foul = 'early'; P.fzztT = 0; P.gunT = 0; st.stat.fouls[P.k]++; Sfx.play('quickdrawFzzt', P.k); qdPop(P, 'Too early!', '#ffd2c4', true); qdSmoke(st, P.k); }
      if (fouls.length === 2) qdResolve(st, -1, 'Both too early!', 'foul2');
      else if (fouls.length === 1) {
        const o = st.pl[1 - fouls[0].k]; o.cheer = 1;
        const why = st.lastFake && st.rt - st.lastFake.t < 1.2 ? qdFakeName(st.lastFake.kind) : '';
        qdResolve(st, o.k, 'Too early, ' + NAMES[fouls[0].k] + '!' + why, 'foul');
      }
    } else if (st.ph === 'draw') {
      const tNow = st.rt - st.drawAt;
      for (const P of st.pl) {
        if (!presses[P.k] || P.raw != null || P.foul) continue;
        P.raw = tNow; P.eff = tNow - P.bonus; P.gunT = 0; P.drawn = true;
        if (st.target && P.aim !== st.bandit) {
          // a friend! a foul (unless the round is already decided)
          P.foul = 'wrong'; st.stat.fouls[P.k]++;
          const cut = st.cuts[P.aim];
          P.cork = { t: 0, tx: QD.cutX[P.aim], ty: QD.cutY - QD.cutH * 0.78, hit: 'cut', i: P.aim };
          Sfx.play('quickdrawPop', P.k); Sfx.play('quickdrawOops', P.k);
          qdPop(P, QD_FRIEND_SORRY[cut.kind] || 'Oops!', '#ffd2c4', true);
        } else { Sfx.play('quickdrawCock', P.k); st.stat.react[P.k].push(tNow); st.stat.best[P.k] = Math.min(st.stat.best[P.k], tNow); }
      }
      // a wrong cutout: the other player takes the round (if it isn't decided yet)
      const wrong = st.pl.filter(P => P.foul === 'wrong');
      if (wrong.length && !st.res) {
        const good = st.pl.find(P => P.raw != null && !P.foul);
        if (wrong.length === 2 && !good) qdResolve(st, -1, 'Both hit a friend!', 'foul2');
        else {
          const W0 = st.pl[1 - wrong[0].k];
          if (good && good.k === W0.k) { st.stat.bandits[W0.k]++; qdResolve(st, W0.k, 'Got the bandit: ' + qdMs(W0.raw) + '!', 'bandit'); }
          else { W0.cheer = 1; qdResolve(st, W0.k, 'Oops! ' + NAMES[wrong[0].k] + ' popped ' + (QD_FRIEND_NAME[st.cuts[wrong[0].aim].kind] || 'a friend') + '!', 'wrongcut'); }
        }
      }
      // who drew first (effective times, gold head start counted); waits until the other can't beat or tie it
      if (!st.res) {
        const [A, B] = st.pl;
        const ready = P => P.eff != null && !P.foul;
        const cutoff = P => tNow - P.bonus; // the best the other could still do if they pressed now
        let w = -2;
        if (ready(A) && ready(B)) w = Math.abs(A.eff - B.eff) <= QD.tie ? -1 : A.eff < B.eff ? 0 : 1;
        else if (ready(A) && cutoff(B) > A.eff + QD.tie) w = 0;
        else if (ready(B) && cutoff(A) > B.eff + QD.tie) w = 1;
        if (w === -1) qdResolve(st, -1, A.bonus !== B.bonus ? 'Neck and neck, with the gold head start!' : 'Neck and neck: ' + Math.round(A.raw * 1000) + ' and ' + qdMs(B.raw) + '!', 'tie');
        else if (w >= 0) {
          const P = st.pl[w], o = st.pl[1 - w], goldWin = P.bonus > 0 && o.raw != null && o.raw <= P.raw;
          if (st.target) { st.stat.bandits[w]++; qdResolve(st, w, (goldWin ? 'Gold head start! ' : '') + 'Got the bandit: ' + qdMs(P.raw) + '!', 'bandit'); }
          else qdResolve(st, w, goldWin ? 'The gold head start wins it: ' + qdMs(P.raw) + '!' : (o.raw != null && o.raw - P.raw < 0.06 ? 'By a whisker: ' : 'Quickest draw: ') + qdMs(P.raw) + '!', 'fast');
        }
      }
      if (!st.res && tNow > QD.guard) qdResolve(st, -1, 'Nobody drew!', 'guard');
    }
    // DRAW! (after this tick's presses: a press made before DRAW! could be seen is still early)
    if (st.ph === 'wait' && !st.res && st.rt >= st.drawAt) qdDraw(st);
    else if (st.ph === 'done') {
      // late presses after the round is decided: the slower one still gets a time on the board
      const tNow = st.rt - (st.drawAt || 0);
      for (const P of st.pl) if (presses[P.k] && st.drawSeen && !st.target && P.raw == null && !P.foul && st.res && st.res.how !== 'foul' && tNow < 2) {
        P.raw = tNow; P.gunT = 0; P.late = true; Sfx.play('quickdrawCock', P.k);
        st.stat.react[P.k].push(tNow); st.stat.best[P.k] = Math.min(st.stat.best[P.k], tNow);
      }
    }
    if (st.res) {
      st.resT += dt;
      if (st.resT >= QD.showT) { const r = st.res; qdEndRound(st, r); }
    }
  }
  for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
  qdVisTick(st, dt);
  qdCamera(st, dt, false);
  qdMirror(st);
}
function qdFakeName(kind) {
  return { word: ' (only DRAW! counts)', caw: ' (that was the crow)', clonk: ' (that was the cowbell)', doors: ' (that was the door)', achoo: ' (that was a sneeze)' }[kind] || '';
}
function qdEndRound(st, r) {
  if (st.ended) return;
  st.ended = true;
  if (r.winner >= 0) st.stat.wins[r.winner]++;
  if (st.target && r.how !== 'foul' && r.how !== 'foul2') st.stat.seenTarget = true;
  matchRoundEnd(r.winner, r.reason);
}
// the platformer bodies stay hidden, but p.x / p.y follow the picture (name tags, bubbles, confetti fall-backs)
function qdMirror(st) {
  if (!st.pl || !st.cam) return;
  for (const p of G.players) {
    const s = qdToScreen(st.cam, qdStance(st, p.id).x, QD.feetY);
    p.x = s.x - p.w / 2; p.y = s.y - p.h;
  }
}

/* ---------- camera ---------- */
function qdCamera(st, dt, snap) {
  const cam = st.cam, m = G.match;
  let z = 1, x = QD.cx, y = 270;
  const frozenStart = !m || m.phase === 'intro' || m.phase === 'ready' || m.phase === 'count' || st.ph === 'set';
  if (frozenStart) { z = 1.25; x = QD.cx; y = 340; }
  else if (st.ph === 'pace') { const k = qdEase(st.rt / (QD.paces * QD.paceT)); z = 1.25 - 0.25 * k; y = 340 - 70 * k; }
  else if (st.ph === 'turn' || st.ph === 'wait') { const k = clamp((st.rt - QD.paces * QD.paceT) / 4, 0, 1); z = 1 + 0.07 * k; y = 270 + 40 * k; }
  else if (st.ph === 'done' && st.res && st.res.how === 'fast') { z = 1.03; y = 285; }
  const rate = st.ph === 'draw' ? 14 : 2.6, a = snap ? 1 : 1 - Math.exp(-rate * dt);
  cam.z += (z - cam.z) * a; cam.x += (x - cam.x) * a; cam.y += (y - cam.y) * a;
  // never show past the edges of the street picture
  const hw = W / 2 / cam.z, hh = H / 2 / cam.z;
  cam.x = clamp(cam.x, hw, W - hw); cam.y = clamp(cam.y, hh, H - hh);
}
const qdToScreen = (cam, x, y) => ({ x: (x - cam.x) * cam.z + W / 2, y: (y - cam.y) * cam.z + H / 2 });
function qdCamXform(cam) { ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y); }

/* ---------- looks: effects that never touch the rules ---------- */
function qdFx(st, x, y, vx, vy, life, col, size, grav, kind) {
  const v = st.vis; if (!v) return;
  v.fx.push({ x, y, vx, vy, life, max: life, col, size, grav, kind: kind || 'dot', rot: qdVR() * 6.28 });
  if (v.fx.length > 300) v.fx.splice(0, v.fx.length - 300);
}
function qdDust(st, x, y, n) { for (let i = 0; i < n; i++) qdFx(st, x + (qdVR() - 0.5) * 20, y - 2, (qdVR() - 0.5) * 70, -20 - qdVR() * 40, 0.6, i % 2 ? 'rgba(222,190,140,0.8)' : 'rgba(240,214,170,0.8)', 4 + qdVR() * 4, 60, 'dust'); }
function qdSmoke(st, k) {
  const x = qdStance(st, k).x + (k ? -1 : 1) * 30, y = QD.feetY - 40;
  for (let i = 0; i < 9; i++) qdFx(st, x, y, (qdVR() - 0.5) * 40, -30 - qdVR() * 40, 1.1, i % 2 ? 'rgba(170,170,180,0.75)' : 'rgba(210,210,215,0.7)', 6 + qdVR() * 5, -10, 'dust');
}
function qdVisNew() {
  const tw = [];
  return { fx: [], t: 0, tws: tw, nextTw: 2 + qdVR() * 3, doorsT: -9, crowT: -9, cowbellT: -9, bellT: -9, flash: 0, drawT: -9, pops: [], blink: 0 };
}
function qdVisTick(st, dt) {
  const v = st.vis; if (!v) return;
  v.t += dt;
  let n = 0;
  for (const q of v.fx) { q.life -= dt; q.vx *= Math.exp(-1.5 * dt); q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += dt * 4; if (q.life > 0) v.fx[n++] = q; }
  v.fx.length = n;
  v.doorsT += dt; v.crowT += dt; v.cowbellT += dt; v.bellT += dt; v.drawT += dt; v.flash = Math.max(0, v.flash - dt * 3.2);
  v.pops = v.pops.filter(p => (p.t += dt) < 1.3);
  // ambient tumbleweeds rolling down the street now and then (looks only)
  v.nextTw -= dt;
  if (v.nextTw <= 0) { v.nextTw = 5 + qdVR() * 6; const dir = qdVR() < 0.5 ? 1 : -1; v.tws.push({ x: dir > 0 ? -40 : W + 40, y: 500 + qdVR() * 26, dir, r: 11 + qdVR() * 6, sp: 70 + qdVR() * 50, a: 0, hop: qdVR() * 6 }); }
  v.tws = v.tws.filter(w => { w.x += w.dir * w.sp * dt; w.a += w.dir * w.sp / w.r * dt; w.hop += dt * 5; return w.x > -60 && w.x < W + 60; });
  v.blink = (v.t % 3.7) < 0.12 ? 1 : 0;
  const ref = st.ref;
  if (ref) { ref.sayT += dt; ref.arm = Math.max(0, ref.arm - dt * 1.2); ref.sneeze += dt; }
  for (const P of st.pl || []) {
    P.popT += dt; P.cheer = Math.max(0, P.cheer - dt * 0.5);
    if (P.gunT >= 0) P.gunT += dt;
    if (P.fzztT >= 0) { P.fzztT += dt; if (P.fzztT < 0.6 && qdVR() < dt * 20) qdFx(st, qdStance(st, P.k).x + (P.k ? -34 : 34), QD.feetY - 44, (qdVR() - 0.5) * 30, -40, 0.6, 'rgba(200,200,205,0.7)', 4, -10, 'dust'); }
    const c = P.cork;
    if (c) {
      c.t += dt;
      if (c.t >= QD.corkT && !c.landed) {
        c.landed = true;
        if (c.hit === 'hat') {
          const L0 = st.pl[c.who];
          if (!L0.hat) {
            L0.hat = { x: c.tx, y: c.ty, vx: (c.who ? 1 : -1) * 160, vy: -360, rot: 0, w: (c.who ? 1 : -1) * 9, t: 0 };
            Sfx.play('quickdrawHat', c.who); qdPop(L0, 'Hat popped!', '#ffe6a8', false); L0.mood = 'wow';
            for (let i = 0; i < 8; i++) qdFx(st, c.tx, c.ty, (qdVR() - 0.5) * 220, -qdVR() * 160, 0.6, i % 2 ? '#fff3a0' : '#ffffff', 3, 200, 'spark');
          }
        } else {
          const cut = st.cuts[c.i];
          if (cut.hitBy < 0) cut.hitBy = P.k;
          cut.hitT = 0;
          Sfx.play('quickdrawBonk', P.k);
          for (let i = 0; i < 10; i++) qdFx(st, c.tx, c.ty, (qdVR() - 0.5) * 220, -qdVR() * 160, 0.6, cut.kind === 'bandit' ? (i % 2 ? C.gold : '#ffffff') : (i % 2 ? '#ffd2c4' : '#ffffff'), 3, 200, 'spark');
        }
      }
    }
    const h = P.hat;
    if (h) {
      h.t += dt;
      if (!h.rest) {
        h.vy += 900 * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.w * dt;
        if (h.y > QD.feetY - 4 && h.vy > 0) { h.y = QD.feetY - 4; h.rest = true; h.rot = 0.18 * Math.sign(h.w); qdDust(st, h.x, QD.feetY, 4); }
      }
      if (h.t > 0.6 && P.mood === 'wow') P.mood = 'joy';
    }
  }
  if (st.cuts) for (const c of st.cuts) c.hitT += dt;
}

/* ---------- the mode ---------- */
MODES.quickdraw = {
  rand: Math.random,
  setup(st, L) {
    for (const row of L.grid) row.fill('.');
    st.stat = { best: [Infinity, Infinity], react: [[], []], fouls: [0, 0], bandits: [0, 0], wins: [0, 0] };
    st.forceTwist = this.testTwist || null;
    let rec = null; try { rec = store.get('quickdrawbest:' + L.def.name); } catch (e) { rec = null; }
    st.record = rec && typeof rec.ms === 'number' ? rec : null; st.newRecord = null;
    st.vis = qdVisNew();
    st.cam = { x: QD.cx, y: 340, z: 1.25 };
    st.t = 0;
  },
  resetRound(n, info) {
    const st = G.mst;
    st.vis = st.vis || qdVisNew();
    const keepTw = st.vis.tws;
    st.vis = qdVisNew(); st.vis.tws = keepTw;
    qdNewRound(st, n, info, () => this.rand());
    st.ended = false; st.goldSaid = false; st.lastFake = null;
    qdCamera(st, 0, true);
    // the duelists are the players: hide the platformer bodies every round (matchResetPlayers revives them)
    for (const p of G.players) Object.assign(p, { alive: false, respawnT: Infinity });
    G.particles.length = 0;
    qdMirror(st);
  },
  go() {
    const st = G.mst;
    // (no big GO!: the Mayor's count starts the pacing, and the only big word in this level is DRAW!)
    if (G.match) G.match.goT = 0;
    st.ph = 'pace'; st.rt = 0;
    qdRefSay(st, 'Back to back...', false);
    for (const P of st.pl) if (P.gold) qdPop(P, P.gold >= 2 ? 'Gold head start + patience!' : 'Gold head start!', C.gold, true);
  },
  step(dt) {
    qdTick(dt, true);
    // the fastest draw ever here (kept in the browser by level name)
    // (any fair draw counts: a plain DRAW! round, no foul)
    const st = G.mst;
    for (const P of st.pl) {
      if (P.raw == null || P.foul || st.target || P.recDone) continue;
      P.recDone = true;
      const ms = Math.round(P.raw * 1000);
      if (!st.record || ms < st.record.ms) {
        st.record = { ms, who: P.k }; st.newRecord = { k: P.k, ms };
        try { store.set('quickdrawbest:' + LEVELS[G.levelIndex].name, st.record); } catch (e) { /* storage off */ }
      }
    }
  },
  idle(dt) {
    const st = G.mst, m = G.match; if (!st.pl) return;
    for (const p of G.players) { p.pendingAct = false; p.pendingJump = false; }
    if (m && (m.phase === 'end' || m.phase === 'over')) { qdTick(dt, false); return; }
    st.t += dt;
    qdVisTick(st, dt);
    qdCamera(st, dt, false);
    qdMirror(st);
    if (m && m.phase === 'count' && !st.goldSaid) { st.goldSaid = true; if (st.pl.some(P => P.gold)) Sfx.play('quickdrawGold'); }
  },
  tiebreak() {
    const b = G.mst.stat.best;
    if (isFinite(b[0]) || isFinite(b[1])) {
      if (Math.abs(b[0] - b[1]) > 0.0005) return { winner: b[0] < b[1] ? 0 : 1, reason: 'Fastest draw this match!' };
    }
    return -1;
  },
  timeUp() { return -1; },
  draw() { qdDrawWorld(); },
  drawTop() { qdDrawTop(); },
  hud() { qdHud(); },
  stats() {
    const st = G.mst, s = st.stat, ms = v => (isFinite(v) ? String(Math.round(v * 1000)) : '–');
    const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : Infinity);
    const out = [
      { label: 'Best draw (ms)', values: s.best.map(ms) },
      { label: 'Average draw (ms)', values: s.react.map(a => ms(avg(a))) },
      { label: 'Fouls', values: s.fouls.slice() },
      { label: 'Bandits hit', values: s.bandits.slice() },
    ];
    const b = s.best, w = !isFinite(b[0]) && !isFinite(b[1]) ? -1 : Math.round(b[0] * 1000) === Math.round(b[1] * 1000) ? 2 : b[0] < b[1] ? 0 : 1;
    if (w === 2) out.push('Fastest draw of the match: Pip and Bo, both ' + qdMs(b[0]) + '!');
    else if (w >= 0) out.push('Fastest draw of the match: ' + NAMES[w] + ', ' + qdMs(b[w]) + '!');
    if (st.newRecord) out.push('New Gulch record: ' + st.newRecord.ms + ' ms by ' + NAMES[st.newRecord.k] + '!');
    else if (st.record) out.push('Gulch record: ' + st.record.ms + ' ms.');
    return out;
  },
  // test access for the bot harness and the computer brain (read-only)
  test: { QD, QD_TWISTS, stance: qdStance, toScreen: qdToScreen },
};

/* ---------- drawing: the street ---------- */
const QD_COL = {
  sky: ['#f7a85a', '#ffcf7e', '#fff0c9'], mesaFar: '#e3936a', mesaFarTop: '#eba57c', mesa: '#c3653f', mesaDk: '#9c4a2e', mesaTop: '#d9824f',
  wood: '#b77a45', woodDk: '#7a4a24', woodLt: '#d39a5e', board: '#c48a52', boardDk: '#8a5a30', street: '#e6c486', streetDk: '#cfa766', streetLt: '#f2d9a3',
  saloon: '#c9744a', saloonDk: '#8f4a2a', store: '#8fae9a', storeDk: '#5e7c69', hats: '#d9a85a', hatsDk: '#9a7030', glass: '#3b3552', cactus: '#5fa556', cactusDk: '#3e7c3c',
};
function qdSky() {
  const g = ctx.createLinearGradient(0, 0, 0, 300);
  g.addColorStop(0, QD_COL.sky[0]); g.addColorStop(0.5, QD_COL.sky[1]); g.addColorStop(1, QD_COL.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, 360);
  // the noon sun, high and bright
  ctx.fillStyle = 'rgba(255,244,196,0.35)'; circle(706, 64, 62); ctx.fill();
  ctx.fillStyle = 'rgba(255,246,206,0.6)'; circle(706, 64, 44); ctx.fill();
  const t = G.clock;
  ctx.save(); ctx.translate(706, 64); ctx.rotate(t * 0.05); ctx.fillStyle = 'rgba(255,246,206,0.25)';
  ctx.beginPath(); for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.moveTo(-5, 36); ctx.lineTo(0, 74 + (i % 2) * 12); ctx.lineTo(5, 36); ctx.closePath(); } ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fff7d6'; circle(706, 64, 30); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(700, 58, 16); ctx.fill();
  ctx.strokeStyle = 'rgba(255,214,140,0.7)'; ctx.lineWidth = 2; circle(706, 64, 30); ctx.stroke();
  // lazy clouds: a warm shaded underside, the puffs, a bright top
  for (let i = 0; i < 4; i++) {
    const x = ((i * 271 + t * (5 + i * 2)) % (W + 240)) - 120, y = 40 + ((i * 53) % 70);
    ctx.fillStyle = 'rgba(220,150,110,0.25)'; ctx.beginPath(); ctx.arc(x + 2, y + 3, 14, 0, Math.PI * 2); ctx.arc(x + 18, y - 3, 17, 0, Math.PI * 2); ctx.arc(x + 36, y + 3, 13, 0, Math.PI * 2); ctx.rect(x + 2, y + 3, 34, 12); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,236,0.85)';
    ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.arc(x + 16, y - 6, 17, 0, Math.PI * 2); ctx.arc(x + 34, y, 13, 0, Math.PI * 2); ctx.rect(x, y, 34, 12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; circle(x + 12, y - 12, 7); ctx.fill(); circle(x - 3, y - 4, 5); ctx.fill();
  }
}
function qdMesa(x0, x1, top, base, col, topCol) {
  // a flat-topped mesa with sloped sides and a lighter rim
  const w = x1 - x0;
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x0 - w * 0.16, base); ctx.lineTo(x0, top + 8); ctx.lineTo(x0 + w * 0.06, top); ctx.lineTo(x1 - w * 0.05, top); ctx.lineTo(x1, top + 10); ctx.lineTo(x1 + w * 0.18, base); ctx.closePath(); ctx.fill();
  // a shaded right cliff, gullies, then the sunlit rim and a soft outline
  ctx.fillStyle = 'rgba(110,40,25,0.18)'; ctx.beginPath(); ctx.moveTo(x1 - w * 0.12, top); ctx.lineTo(x1 - w * 0.05, top); ctx.lineTo(x1, top + 10); ctx.lineTo(x1 + w * 0.18, base); ctx.lineTo(x1 + w * 0.02, base); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(110,40,25,0.16)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let g = 1; g < 5; g++) { const gx = x0 + w * g / 5; ctx.moveTo(gx, top + 6); ctx.lineTo(gx + 3, top + (base - top) * 0.6); } ctx.stroke();
  ctx.fillStyle = topCol; ctx.fillRect(x0 + w * 0.06, top, w * 0.89, 5);
  ctx.fillStyle = 'rgba(255,240,210,0.45)'; ctx.fillRect(x0 + w * 0.06, top, w * 0.89, 1.5);
  ctx.strokeStyle = 'rgba(110,40,25,0.22)'; ctx.lineWidth = 1.5; ctx.beginPath();
  ctx.moveTo(x0 - w * 0.16, base); ctx.lineTo(x0, top + 8); ctx.lineTo(x0 + w * 0.06, top); ctx.lineTo(x1 - w * 0.05, top); ctx.lineTo(x1, top + 10); ctx.lineTo(x1 + w * 0.18, base); ctx.stroke();
  // rock stripes
  ctx.strokeStyle = 'rgba(120,50,30,0.25)'; ctx.lineWidth = 2;
  ctx.beginPath(); for (let k = 1; k <= 3; k++) { const y = top + (base - top) * k / 4.5; ctx.moveTo(x0 - w * 0.03 * k, y); ctx.lineTo(x1 + w * 0.04 * k, y); } ctx.stroke();
}
function qdCactus(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = QD_COL.cactus; ctx.strokeStyle = QD_COL.cactusDk; ctx.lineWidth = 2;
  rr(-6, -46, 12, 46, 6); ctx.fill(); ctx.stroke();
  rr(-18, -32, 8, 18, 4); ctx.fill(); ctx.stroke(); rr(-18, -18, 14, 7, 3.5); ctx.fill();
  rr(10, -38, 8, 20, 4); ctx.fill(); ctx.stroke(); rr(4, -24, 14, 7, 3.5); ctx.fill();
  ctx.fillStyle = '#ff9ec4'; circle(0, -47, 3.5); ctx.fill(); // a little flower
  ctx.restore();
}
function qdBoards(x, y, w, h, col, dk, vertical) {
  ctx.fillStyle = col; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = dk; ctx.lineWidth = 1.5;
  if (vertical) { ctx.beginPath(); for (let bx = x + 14; bx < x + w; bx += 14) { ctx.moveTo(bx, y); ctx.lineTo(bx, y + h); } ctx.stroke(); }
  else { ctx.beginPath(); for (let by = y + 10; by < y + h; by += 10) { ctx.moveTo(x, by); ctx.lineTo(x + w, by); } ctx.stroke(); }
}
function qdSign(str, x, y, w, h, bg, fg, fs) {
  ctx.fillStyle = 'rgba(60,30,10,0.35)'; rr(x - w / 2 + 3, y - h / 2 + 3, w, h, 4); ctx.fill();
  ctx.fillStyle = bg; rr(x - w / 2, y - h / 2, w, h, 4); ctx.fill();
  ctx.strokeStyle = QD_COL.woodDk; ctx.lineWidth = 2.5; rr(x - w / 2, y - h / 2, w, h, 4); ctx.stroke();
  text(str, x, y + 1, fs, fg, 'center');
}
function qdWindow(x, y, w, h) {
  ctx.fillStyle = QD_COL.woodDk; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = QD_COL.glass; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,240,200,0.25)'; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w * 0.4, y); ctx.lineTo(x + w * 0.6, y); ctx.lineTo(x + w * 0.2, y + h); ctx.fill();
  ctx.strokeStyle = QD_COL.woodDk; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
}
function qdDrawBuildings(st) {
  const v = st.vis, porchY = 372;
  // ---- General Store (left)
  qdBoards(-10, 196, 312, porchY - 196, QD_COL.store, QD_COL.storeDk, true);
  ctx.fillStyle = QD_COL.store; ctx.fillRect(-10, 170, 300, 30); // the false front
  ctx.fillStyle = QD_COL.storeDk; ctx.fillRect(-10, 166, 304, 6);
  qdSign('GENERAL STORE', 142, 214, 220, 30, '#f3e2b8', '#7a3a26', 19);
  qdWindow(28, 262, 60, 54); qdWindow(196, 262, 60, 54);
  ctx.fillStyle = QD_COL.woodDk; ctx.fillRect(112, 256, 58, 116); ctx.fillStyle = '#a86a3a'; ctx.fillRect(117, 261, 48, 111);
  ctx.fillStyle = '#ffd36b'; circle(156, 318, 3); ctx.fill();
  // the porch roof and posts
  ctx.fillStyle = QD_COL.woodDk; ctx.fillRect(-10, 244, 312, 8);
  for (const px of [6, 100, 182, 284]) { ctx.fillStyle = QD_COL.wood; ctx.fillRect(px, 252, 8, porchY - 252); }
  // ---- Root Beer Saloon (middle) with the balcony
  qdBoards(318, 150, 324, porchY - 150, QD_COL.saloon, QD_COL.saloonDk, true);
  ctx.fillStyle = QD_COL.saloon; ctx.beginPath(); ctx.moveTo(318, 150); ctx.lineTo(318, 128); ctx.lineTo(400, 128); ctx.lineTo(420, 108); ctx.lineTo(540, 108); ctx.lineTo(560, 128); ctx.lineTo(642, 128); ctx.lineTo(642, 150); ctx.fill();
  ctx.fillStyle = QD_COL.saloonDk; ctx.fillRect(316, 146, 328, 5);
  qdSign('ROOT BEER SALOON', 480, 132, 236, 32, '#ffe9b8', '#8f2f1a', 21);
  // the root beer mug on the sign
  ctx.fillStyle = '#7a3a1a'; rr(588, 120, 16, 20, 3); ctx.fill(); ctx.fillStyle = '#fff6e0'; rr(586, 116, 20, 7, 3.5); ctx.fill();
  qdWindow(344, 168, 44, 40); qdWindow(572, 168, 44, 40);
  // the balcony (Mayor Mosey stands on it)
  ctx.fillStyle = QD_COL.woodDk; ctx.fillRect(330, QD.refY, 300, 10);
  ctx.strokeStyle = QD_COL.woodDk; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(330, QD.refY - 26); ctx.lineTo(630, QD.refY - 26); ctx.stroke();
  ctx.lineWidth = 2; ctx.beginPath(); for (let x = 340; x <= 620; x += 16) { ctx.moveTo(x, QD.refY - 26); ctx.lineTo(x, QD.refY); } ctx.stroke();
  // the bell frame on the balcony
  ctx.fillStyle = QD_COL.woodDk; ctx.fillRect(QD.bellX - 22, QD.bellY - 30, 44, 5); ctx.fillRect(QD.bellX - 22, QD.bellY - 30, 5, QD.refY - QD.bellY + 30); ctx.fillRect(QD.bellX + 17, QD.bellY - 30, 5, QD.refY - QD.bellY + 30);
  // downstairs: windows and the swinging doors
  qdWindow(344, 296, 52, 44); qdWindow(564, 296, 52, 44);
  ctx.fillStyle = '#3a2232'; ctx.fillRect(446, 286, 68, porchY - 286);
  const dk = v.doorsT >= 0 && v.doorsT < 1.2 ? Math.sin(v.doorsT * 26) * Math.exp(-v.doorsT * 3.5) : 0;
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(480 + side * 33, 300);
    ctx.scale(1 - Math.abs(dk) * 0.75, 1);
    ctx.fillStyle = QD_COL.woodLt; ctx.strokeStyle = QD_COL.woodDk; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-side * 31, 4); ctx.lineTo(-side * 31, 50); ctx.lineTo(0, 50); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); for (let y = 12; y < 48; y += 8) { ctx.moveTo(-side * 4, y); ctx.lineTo(-side * 27, y); } ctx.stroke();
    ctx.restore();
  }
  // ---- Hats & Boots (right)
  qdBoards(658, 196, 312, porchY - 196, QD_COL.hats, QD_COL.hatsDk, true);
  ctx.fillStyle = QD_COL.hats; ctx.fillRect(670, 178, 290, 22);
  ctx.fillStyle = QD_COL.hatsDk; ctx.fillRect(668, 174, 300, 6);
  qdSign('HATS & BOOTS', 812, 188, 200, 30, '#fff1cc', '#3f4a8a', 19);
  // a big hat on the sign
  ctx.fillStyle = '#7a4a24'; ctx.beginPath(); ctx.ellipse(724, 186, 14, 4, 0, 0, Math.PI * 2); ctx.fill(); rr(716, 172, 16, 14, 5); ctx.fill();
  qdWindow(686, 262, 64, 54); qdWindow(872, 262, 64, 54);
  // hats in the window
  for (const [x, c] of [[700, '#d08a4a'], [722, '#5a6ab8'], [886, '#a0522d'], [910, '#e0b85a']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x + 8, 300, 10, 3, 0, 0, Math.PI * 2); ctx.fill(); rr(x + 2, 290, 12, 10, 4); ctx.fill(); }
  ctx.fillStyle = QD_COL.woodDk; ctx.fillRect(780, 256, 58, 116); ctx.fillStyle = '#8a5a30'; ctx.fillRect(785, 261, 48, 111);
  ctx.fillStyle = QD_COL.woodDk; ctx.fillRect(658, 244, 312, 8);
  for (const px of [664, 756, 856, 952]) { ctx.fillStyle = QD_COL.wood; ctx.fillRect(px, 252, 8, porchY - 252); }
  // the cowbell on the porch post
  const cb = v.cowbellT >= 0 && v.cowbellT < 1.4 ? Math.sin(v.cowbellT * 18) * Math.exp(-v.cowbellT * 2.5) * 0.7 : 0;
  ctx.save(); ctx.translate(QD.cowbellX, QD.cowbellY - 22); ctx.rotate(cb);
  ctx.strokeStyle = QD_COL.woodDk; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 4); ctx.stroke();
  ctx.fillStyle = '#9a8a6a'; ctx.beginPath(); ctx.moveTo(-7, 4); ctx.lineTo(7, 4); ctx.lineTo(10, 22); ctx.lineTo(-10, 22); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6a5a40'; circle(0, 23, 3); ctx.fill();
  ctx.restore();
  ctx.fillStyle = QD_COL.wood; ctx.fillRect(QD.cowbellX - 14, QD.cowbellY - 30, 18, 5);
  // soft shade under the porch roofs
  ctx.fillStyle = 'rgba(60,30,10,0.14)'; ctx.fillRect(-10, 252, 312, 14); ctx.fillRect(658, 252, 312, 14); ctx.fillRect(318, QD.refY + 10, 324, 10);
  // the boardwalk in front of every shop
  qdBoards(-10, porchY, W + 20, 18, QD_COL.board, QD_COL.boardDk, true);
  ctx.fillStyle = QD_COL.boardDk; ctx.fillRect(-10, porchY + 18, W + 20, 6);
}
// the crow on the Hats & Boots sign (it caws in fakeouts and just blinks the rest of the time)
function qdDrawCrow(st) {
  const v = st.vis, caw = v.crowT >= 0 && v.crowT < 0.8, fl = caw ? Math.sin(v.crowT * 40) : 0;
  ctx.save(); ctx.translate(QD.crowX, QD.crowY + 22);
  ctx.fillStyle = '#2d2a3e';
  ctx.beginPath(); ctx.ellipse(0, -10, 12, 9, -0.2, 0, Math.PI * 2); ctx.fill();
  circle(-10, -20, 7); ctx.fill();
  // wings
  ctx.save(); ctx.translate(2, -14); ctx.rotate(caw ? -0.6 - fl * 0.5 : 0.1); ctx.beginPath(); ctx.ellipse(6, 0, 12, 5, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.moveTo(10, -10); ctx.lineTo(22, -6); ctx.lineTo(10, -4); ctx.fill(); // tail
  // beak, open on a caw
  ctx.fillStyle = '#f2b23a';
  ctx.beginPath(); ctx.moveTo(-16, -22); ctx.lineTo(-24, caw ? -26 : -21); ctx.lineTo(-16, -19); ctx.fill();
  if (caw) { ctx.beginPath(); ctx.moveTo(-16, -19); ctx.lineTo(-23, -15); ctx.lineTo(-16, -17); ctx.fill(); }
  ctx.fillStyle = '#fff'; circle(-11, -22, 2.4); ctx.fill(); ctx.fillStyle = C.ink;
  if (v.blink && !caw) ctx.fillRect(-13, -22.5, 4, 1.2); else { circle(-11.5, -22, 1.2); ctx.fill(); }
  ctx.strokeStyle = '#f2b23a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-3, -2); ctx.lineTo(-3, 3); ctx.moveTo(3, -2); ctx.lineTo(3, 3); ctx.stroke();
  ctx.restore();
}
// Mayor Mosey: a friendly old mayor with a big white mustache and a tall hat, on the saloon balcony
function qdDrawMayor(st) {
  const r = st.ref || { arm: 0, sneeze: -9 }, x = QD.refX, y = QD.refY;
  const sn = r.sneeze >= 0 && r.sneeze < 0.9 ? r.sneeze : -1;
  const lean = sn >= 0 ? Math.sin(sn * 9) * Math.exp(-sn * 3) * 0.15 : 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(lean);
  // legs and boots
  ctx.fillStyle = '#4a3a5a'; ctx.fillRect(-9, -22, 7, 20); ctx.fillRect(2, -22, 7, 20);
  ctx.fillStyle = '#5a3418'; rr(-12, -4, 11, 5, 2); ctx.fill(); rr(1, -4, 11, 5, 2); ctx.fill();
  // coat
  ctx.fillStyle = '#5a4a8a'; rr(-15, -56, 30, 38, 8); ctx.fill();
  ctx.fillStyle = '#f6efdf'; ctx.beginPath(); ctx.moveTo(-5, -56); ctx.lineTo(0, -40); ctx.lineTo(5, -56); ctx.fill();
  ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(-5, -54); ctx.lineTo(0, -50); ctx.lineTo(5, -54); ctx.lineTo(0, -48); ctx.fill();
  // the mayor's gold sash
  ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-13, -54); ctx.lineTo(12, -22); ctx.stroke();
  // arms: one waves the little flag up when he calls (arm), the other holds the bell rope
  const up = r.arm;
  ctx.strokeStyle = '#5a4a8a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-13, -50); ctx.lineTo(-24, -40 - up * 26); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(13, -50); ctx.lineTo(26, -44); ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#f2c9a0'; circle(-24, -40 - up * 26, 4); ctx.fill(); circle(26, -44, 4); ctx.fill();
  // his little red flag
  ctx.strokeStyle = '#5a3418'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-24, -40 - up * 26); ctx.lineTo(-24, -62 - up * 26); ctx.stroke();
  ctx.fillStyle = '#e8483a'; ctx.beginPath(); ctx.moveTo(-24, -62 - up * 26); ctx.lineTo(-40, -57 - up * 26); ctx.lineTo(-24, -52 - up * 26); ctx.fill();
  // head
  ctx.fillStyle = '#f2c9a0'; circle(0, -70, 14); ctx.fill();
  ctx.fillStyle = '#ff9a8a'; circle(1, -66, 3.5); ctx.fill(); // nose
  ctx.fillStyle = '#ffffff'; // the big mustache and sideburns
  ctx.beginPath(); ctx.ellipse(-7, -61, 9, 4, 0.25, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(8, -61, 9, 4, -0.25, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-15, -76, 4, 12); ctx.fillRect(11, -76, 4, 12);
  const said = r.sayT < 0.5;
  if (said) { ctx.fillStyle = '#7a2a2a'; ctx.beginPath(); ctx.ellipse(0.5, -56, 3.5, 2.6, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = C.ink;
  if (sn >= 0 && sn < 0.4) { ctx.fillRect(-7, -73, 5, 1.5); ctx.fillRect(3, -73, 5, 1.5); }
  else { circle(-4.5, -72, 1.8); ctx.fill(); circle(5.5, -72, 1.8); ctx.fill(); }
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, -77); ctx.lineTo(-2, -76); ctx.moveTo(3, -76); ctx.lineTo(9, -77); ctx.stroke();
  // tall hat (it hops on a sneeze)
  const hop = sn >= 0 && sn < 0.6 ? -Math.sin(sn / 0.6 * Math.PI) * 16 : 0;
  ctx.fillStyle = '#2d2a3e'; ctx.fillRect(-16, -86 + hop, 32, 5); rr(-11, -110 + hop, 22, 26, 3); ctx.fill();
  ctx.fillStyle = C.gold; ctx.fillRect(-11, -91 + hop, 22, 4);
  ctx.restore();
}
// the big brass DRAW bell (it only rings for the real DRAW!)
function qdDrawBell(st) {
  const v = st.vis, k = v.bellT >= 0 && v.bellT < 1.6 ? v.bellT : -1;
  const sw = k >= 0 ? Math.sin(k * 16) * Math.exp(-k * 2.2) * 0.6 : 0;
  ctx.save(); ctx.translate(QD.bellX, QD.bellY - 25); ctx.rotate(sw);
  ctx.fillStyle = '#b9850f'; ctx.fillRect(-2, 0, 4, 6);
  ctx.fillStyle = C.gold; ctx.strokeStyle = '#b9850f'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-8, 6); ctx.quadraticCurveTo(-10, 22, -16, 30); ctx.lineTo(16, 30); ctx.quadraticCurveTo(10, 22, 8, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-5, 10, 3, 14);
  ctx.fillStyle = '#b9850f'; circle(0, 32, 4); ctx.fill();
  ctx.restore();
  // the rope down to the Mayor's hand
  ctx.strokeStyle = '#e9d29a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(QD.bellX - 6, QD.bellY + 6); ctx.quadraticCurveTo(QD.bellX - 12, QD.bellY + 22, QD.refX + 26, QD.refY - 44); ctx.stroke();
  if (k >= 0 && k < 0.8) {
    // ring waves
    ctx.strokeStyle = 'rgba(255,197,61,' + (0.8 - k).toFixed(2) + ')'; ctx.lineWidth = 3;
    for (const r of [26, 42]) { ctx.beginPath(); ctx.arc(QD.bellX, QD.bellY - 6, r + k * 50, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(QD.bellX, QD.bellY - 6, r + k * 50, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke(); }
  }
}
function qdDrawStreet(st) {
  const g = ctx.createLinearGradient(0, 390, 0, 560);
  g.addColorStop(0, QD_COL.streetDk); g.addColorStop(0.35, QD_COL.street); g.addColorStop(1, QD_COL.streetLt);
  ctx.fillStyle = g; ctx.fillRect(-20, 396, W + 40, 170);
  // wagon ruts and little stones
  ctx.strokeStyle = 'rgba(160,110,60,0.25)'; ctx.lineWidth = 3;
  for (const y of [446, 452, 508, 514]) { ctx.beginPath(); ctx.moveTo(-20, y); for (let x = 0; x <= W + 20; x += 40) ctx.lineTo(x, y + Math.sin(x * 0.02 + y) * 1.5); ctx.stroke(); }
  for (let i = 0; i < 26; i++) {
    const x = (i * 137) % W, y = 404 + ((i * 59) % 130), r = 1.5 + (i % 3);
    ctx.fillStyle = i % 2 ? 'rgba(170,120,70,0.45)' : 'rgba(255,240,210,0.5)'; ctx.beginPath(); ctx.ellipse(x, y, r * 1.6, r, 0, 0, Math.PI * 2); ctx.fill();
  }
  // hoof prints
  ctx.fillStyle = 'rgba(150,100,55,0.28)';
  for (let i = 0; i < 9; i++) { const x = 60 + i * 104, y = 488 + (i % 2) * 12; ctx.beginPath(); ctx.arc(x, y, 4, Math.PI * 0.1, Math.PI * 1.9); ctx.fill(); }
}
function qdDrawProps(st) {
  // the water trough (left, by the store) and a hitching post
  ctx.fillStyle = QD_COL.woodDk; ctx.fillRect(40, 404, 8, 22); ctx.fillRect(148, 404, 8, 22);
  ctx.fillStyle = QD_COL.wood; rr(30, 382, 136, 28, 4); ctx.fill();
  ctx.fillStyle = '#6fc6e0'; ctx.fillRect(36, 384, 124, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(56 + Math.sin(G.clock * 2) * 6, 386, 18, 2); ctx.fillRect(110 + Math.sin(G.clock * 2 + 1) * 6, 386, 12, 2);
  ctx.strokeStyle = QD_COL.woodDk; ctx.lineWidth = 2; rr(30, 382, 136, 28, 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(30, 396); ctx.lineTo(166, 396); ctx.stroke();
  // barrels (right)
  for (const [x, y] of [[858, 398], [892, 404]]) {
    ctx.fillStyle = 'rgba(120,70,30,0.25)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 2, 19, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a0622e'; rr(x - 15, y - 34, 30, 36, 8); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x + 5, y - 32, 9, 32); ctx.fillStyle = 'rgba(255,230,190,0.25)'; ctx.fillRect(x - 12, y - 32, 3, 32);
    ctx.strokeStyle = '#5a3418'; ctx.lineWidth = 1.5; rr(x - 15, y - 34, 30, 36, 8); ctx.stroke();
    ctx.fillStyle = '#6a4020'; ctx.fillRect(x - 15, y - 26, 30, 4); ctx.fillRect(x - 15, y - 10, 30, 4);
    ctx.fillStyle = '#c47a3a'; ctx.beginPath(); ctx.ellipse(x, y - 34, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  // cactus pots and a desert cactus at the street ends
  qdCactus(296, 386, 0.62); qdCactus(664, 386, 0.62);
  qdCactus(20, 520, 1.05); qdCactus(938, 528, 1.1);
  // the gold sign in the middle of the street: where they stand back to back
  ctx.fillStyle = 'rgba(160,110,60,0.32)'; ctx.beginPath(); ctx.ellipse(QD.cx, QD.feetY + 2, 40, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,248,224,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.moveTo(QD.paceX[0], QD.feetY + 4); ctx.lineTo(QD.paceX[1], QD.feetY + 4); ctx.stroke(); ctx.setLineDash([]);
  for (const x of QD.paceX) { ctx.fillStyle = 'rgba(255,248,224,0.6)'; ctx.fillRect(x - 10, QD.feetY + 2, 20, 4); }
}
function qdDrawTumbleweed(x, y, r, a) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.strokeStyle = '#b08848'; ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.55, i * 0.45, 0, Math.PI * 2); ctx.stroke(); }
  ctx.strokeStyle = '#d4ad66'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.7, r * 0.35, i * 0.7 + 0.3, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}
// the fakeout tumbleweed: it rolls in along the boardwalk and bonks the cowbell at the fakeout moment
function qdFakeTumbleweed(st) {
  const f = st.fakes && st.fakes.find(q => q.kind === 'clonk' && st.rt > q.t - 1.0 && st.rt < q.t + 1.6);
  if (!f) return;
  const k = st.rt - f.t, bx = QD.cowbellX + 24;
  let x, y;
  if (k < 0) { x = bx + (-k) * 210; y = 364 - Math.abs(Math.sin(k * 7)) * 10; }
  else { x = bx - k * 60; y = 364 - Math.max(0, Math.sin(Math.min(1, k * 2) * Math.PI)) * 46; }
  qdDrawTumbleweed(x, y, 12, -st.rt * 7);
}
function qdDrawCutout(st, i) {
  const c = st.cuts[i], x = QD.cutX[i], by = QD.cutY, v = st.vis;
  // pop up after DRAW! (flat before), flop back after a hit
  let up = st.target && st.drawSeen ? clamp(v.drawT / QD.popT, 0, 1) : 0;
  if (!st.drawSeen) up = 0;
  if (c.hitBy >= 0) up = clamp(1 - Math.max(0, c.hitT - 0.12) / 0.3, 0.12, 1);
  ctx.fillStyle = 'rgba(150,100,55,0.3)'; ctx.beginPath(); ctx.ellipse(x, by, 30, 5, 0, 0, Math.PI * 2); ctx.fill();
  if (up <= 0) { ctx.fillStyle = QD_COL.wood; ctx.fillRect(x - 28, by - 4, 56, 5); return; }
  ctx.save(); ctx.translate(x, by); ctx.scale(1, up);
  // the stake, with the cutout's name on a little plank
  ctx.fillStyle = QD_COL.woodDk; ctx.fillRect(-3, -24, 6, 24);
  const nm = { bandit: 'BANDIT', granny: 'GRANNY', sheriff: 'SHERIFF', cow: 'DAISY' }[c.kind];
  ctx.fillStyle = c.kind === 'bandit' ? '#3a3552' : '#f3e2b8'; rr(-27, -17, 54, 14, 3); ctx.fill();
  text(nm, 0, -9.5, 10, c.kind === 'bandit' ? '#ffd36b' : '#7a4a24', 'center');
  // cardboard with a darker edge
  const w = QD.cutW, h = QD.cutH, wob = c.hitBy >= 0 ? Math.sin(c.hitT * 30) * Math.exp(-c.hitT * 5) * 0.2 : 0;
  ctx.rotate(wob);
  ctx.fillStyle = '#a07a4a'; rr(-w / 2 - 3, -h - 3, w + 6, h - 18, 10); ctx.fill();
  ctx.fillStyle = '#e8cfa0'; rr(-w / 2, -h, w, h - 24, 8); ctx.fill();
  const hy = -h + 32;
  if (c.kind === 'bandit') {
    // a silly bandit: a striped shirt, a black eye mask, a huge curly mustache and a little hat
    ctx.fillStyle = '#e8e2d0'; rr(-20, hy + 16, 40, 34, 8); ctx.fill();
    ctx.fillStyle = '#3a3552'; for (let k = 0; k < 4; k++) ctx.fillRect(-20, hy + 20 + k * 8, 40, 4);
    ctx.fillStyle = '#f2c9a0'; circle(0, hy, 15); ctx.fill();
    ctx.fillStyle = '#1c1a36'; rr(-15, hy - 7, 30, 9, 4); ctx.fill();
    ctx.fillStyle = '#fff'; circle(-6, hy - 3, 2.6); ctx.fill(); circle(6, hy - 3, 2.6); ctx.fill();
    ctx.fillStyle = '#5a3418'; ctx.beginPath(); ctx.ellipse(-6, hy + 7, 8, 3, 0.4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(6, hy + 7, 8, 3, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a3552'; ctx.fillRect(-16, hy - 16, 32, 4); rr(-10, hy - 26, 20, 12, 4); ctx.fill();
    ctx.fillStyle = '#c0392b'; ctx.fillRect(-20, hy + 14, 40, 5); // red bandana
  } else if (c.kind === 'granny') {
    ctx.fillStyle = '#c38ad8'; rr(-18, hy + 15, 36, 36, 9); ctx.fill();
    ctx.fillStyle = '#f2c9a0'; circle(0, hy, 14); ctx.fill();
    ctx.fillStyle = '#ece8f2'; circle(0, hy - 13, 9); ctx.fill(); circle(-12, hy - 4, 6); ctx.fill(); circle(12, hy - 4, 6); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; circle(-5, hy, 4); ctx.stroke(); circle(5, hy, 4); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, hy + 6, 4, 0.2, Math.PI - 0.2); ctx.stroke();
    // the pie
    ctx.fillStyle = '#d99a4e'; ctx.beginPath(); ctx.ellipse(0, hy + 32, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2d08a'; ctx.beginPath(); ctx.ellipse(0, hy + 29, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c0392b'; circle(-5, hy + 29, 2); ctx.fill(); circle(5, hy + 28, 2); ctx.fill();
  } else if (c.kind === 'sheriff') {
    ctx.fillStyle = '#6a8ab8'; rr(-18, hy + 15, 36, 36, 9); ctx.fill();
    ctx.fillStyle = C.gold; qdStar(8, hy + 26, 6);
    ctx.fillStyle = '#f2c9a0'; circle(0, hy, 14); ctx.fill();
    ctx.fillStyle = C.ink; circle(-5, hy - 1, 2); ctx.fill(); circle(5, hy - 1, 2); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, hy + 5, 5, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = '#e9d29a'; ctx.beginPath(); ctx.ellipse(0, hy - 12, 22, 5, 0, 0, Math.PI * 2); ctx.fill(); rr(-11, hy - 26, 22, 15, 6); ctx.fill();
  } else {
    // Daisy the cow
    ctx.fillStyle = '#ffffff'; rr(-22, hy - 6, 44, 40, 14); ctx.fill();
    ctx.fillStyle = '#3a3552'; circle(-10, hy + 4, 6); ctx.fill(); circle(11, hy + 18, 7); ctx.fill();
    ctx.fillStyle = '#ffb3c8'; rr(-14, hy + 20, 28, 14, 7); ctx.fill();
    ctx.fillStyle = C.ink; circle(-6, hy + 26, 1.6); ctx.fill(); circle(6, hy + 26, 1.6); ctx.fill();
    circle(-9, hy + 6, 2); ctx.fill(); circle(9, hy + 6, 2); ctx.fill();
    ctx.fillStyle = '#e9d29a'; ctx.beginPath(); ctx.moveTo(-18, hy - 4); ctx.lineTo(-26, hy - 14); ctx.lineTo(-14, hy - 8); ctx.fill(); ctx.beginPath(); ctx.moveTo(18, hy - 4); ctx.lineTo(26, hy - 14); ctx.lineTo(14, hy - 8); ctx.fill();
    ctx.fillStyle = '#ffd36b'; circle(16, hy - 8, 3); ctx.fill(); // a flower
  }
  ctx.restore();
}
// a small 5-point star (named for this file: draws only with ctx)
function qdStar(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr0 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr0, y + Math.sin(a) * rr0); }
  ctx.closePath(); ctx.fill();
}
function qdDrawWorld() {
  const st = G.mst; if (!st.cam || !st.vis) return;
  ctx.save(); qdCamXform(st.cam);
  qdSky();
  // far mesas, then the near red ones
  qdMesa(70, 250, 128, 330, QD_COL.mesaFar, QD_COL.mesaFarTop);
  qdMesa(560, 700, 118, 330, QD_COL.mesaFar, QD_COL.mesaFarTop);
  qdMesa(250, 340, 92, 330, QD_COL.mesa, QD_COL.mesaTop);
  qdMesa(820, 960, 84, 330, QD_COL.mesa, QD_COL.mesaTop);
  qdMesa(-60, 70, 100, 330, QD_COL.mesaDk, QD_COL.mesaTop);
  qdDrawBuildings(st);
  qdDrawMayor(st);
  qdDrawBell(st);
  qdDrawCrow(st);
  qdDrawStreet(st);
  qdDrawProps(st);
  qdFakeTumbleweed(st);
  for (const w of st.vis.tws) qdDrawTumbleweed(w.x, w.y - Math.abs(Math.sin(w.hop)) * 8, w.r, w.a);
  if (st.cuts && st.target) for (let i = 0; i < 3; i++) qdDrawCutout(st, i);
  else if (st.cuts) for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(150,100,55,0.18)'; ctx.fillRect(QD.cutX[i] - 22, QD.cutY - 3, 44, 4); }
  ctx.restore();
}

/* ---------- drawing: Pip and Bo ---------- */
// Pip and Bo in their own look (as in render.js drawPlayer) with a little cowboy hat and a toy cork popgun.
// o: x, y (feet), face (1 right / -1 left, may be between while turning), s, pose ('stand' 'walk' 'ready' 'aim' 'fire'
// 'cheer' 'fzzt'), walk (0..1), mood, hat (true = on the head), gold
function qdDrawHero(k, o) {
  const col = PCOL[k], dk = PDARK[k], s = o.s || QD.s, face = o.face || 1, fs = Math.sign(face) || 1;
  ctx.save(); ctx.translate(o.x, o.y);
  ctx.fillStyle = 'rgba(120,80,40,0.28)'; ctx.beginPath(); ctx.ellipse(0, 0, 16 * s, 3.5 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.scale(s * Math.max(0.15, Math.abs(face)) * fs, s);
  const bob = o.pose === 'walk' ? -Math.sin(o.walk * Math.PI) * 3 : o.pose === 'cheer' ? -Math.abs(Math.sin(G.clock * 9)) * 4 : 0;
  ctx.translate(0, -13 + bob);
  ctx.lineCap = 'round';
  // feet (cowboy boots)
  const st = o.pose === 'walk' ? Math.sin(o.walk * Math.PI * 2) * 4 : 0;
  ctx.fillStyle = '#6a3a1a';
  rr(-9 + st, 8, 9, 6, 2); ctx.fill(); rr(1 - st, 8, 9, 6, 2); ctx.fill();
  // the holster on the hip (the gun sits in it until drawn)
  const drawn = o.pose === 'aim' || o.pose === 'fire' || o.pose === 'fzzt' || (o.pose === 'cheer' && o.drawn);
  ctx.fillStyle = '#7a4a24'; rr(6, 0, 7, 10, 2); ctx.fill();
  if (!drawn) { ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 1.2; rr(7, -4, 5, 6, 1.5); ctx.fill(); ctx.stroke(); }
  // ears (Bo)
  if (k === 1) { ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 2; for (const ex of [-8, 8]) { circle(ex, -12, 4.6); ctx.fill(); ctx.stroke(); } }
  // body
  ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 2.4;
  rr(-11, -13, 22, 26, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(-8, -10, 8, 9, 4); ctx.fill();
  // a little neckerchief
  ctx.fillStyle = k ? '#ffd36b' : '#e8483a'; ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(8, 4); ctx.lineTo(0, 11); ctx.closePath(); ctx.fill();
  // face
  const ey = -3, mood = o.mood || 'happy';
  if (mood === 'joy') {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8;
    for (const ex of [-4, 5]) { ctx.beginPath(); ctx.arc(ex, ey + 1, 2.6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    ctx.fillStyle = 'rgba(90,30,40,0.85)'; ctx.beginPath(); ctx.arc(0.5, ey + 5, 3.8, 0, Math.PI); ctx.fill();
  } else {
    const squint = mood === 'focus';
    for (const ex of [-4, 5]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, 3, squint ? 1.8 : 3.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink; circle(ex + 1, ey + 0.4, squint ? 1.3 : 1.6); ctx.fill();
    }
    if (squint) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-7, ey - 4); ctx.lineTo(-1, ey - 3); ctx.moveTo(2, ey - 3); ctx.lineTo(8, ey - 4); ctx.stroke(); }
    if (mood === 'wow') { ctx.fillStyle = 'rgba(90,30,40,0.85)'; ctx.beginPath(); ctx.ellipse(0.5, ey + 6, 2.4, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (mood === 'oops') { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-2, ey + 6); ctx.quadraticCurveTo(0.5, ey + 4, 3, ey + 7); ctx.stroke(); }
    else if (mood === 'focus') { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-2, ey + 6); ctx.lineTo(3, ey + 6); ctx.stroke(); }
    else { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0.5, ey + 4, 2.8, 0.2, Math.PI - 0.2); ctx.stroke(); }
  }
  ctx.fillStyle = 'rgba(255,120,140,0.45)'; circle(-7, ey + 5, 1.9); ctx.fill(); circle(9, ey + 5, 1.9); ctx.fill();
  // the cowboy hat (unless it was popped off)
  if (o.hat !== false) {
    // Bo's ears peek out beside the hat's crown
    if (k === 1) { ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 2; for (const ex of [-11, 11]) { circle(ex, -21, 4.4); ctx.fill(); ctx.stroke(); } }
    qdHat(k, 0, -13, 0);
  }
  else if (k === 0) { ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(1, -18); ctx.stroke(); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(5, -19, 5, 2.5, -0.5, 0, Math.PI * 2); ctx.fill(); }
  // arms and the popgun
  ctx.strokeStyle = dk; ctx.lineWidth = 3.5;
  if (drawn) {
    // the arm out front holding the popgun level
    ctx.beginPath(); ctx.moveTo(8, -2); ctx.lineTo(17, -3); ctx.stroke();
    qdGun(k, 17, -3, o);
    ctx.strokeStyle = dk; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(-13, 6); ctx.stroke();
  } else if (o.pose === 'ready') {
    // the hand hovers over the holster, fingers wiggling
    const wg = Math.sin(G.clock * 12 + k) * 1.2;
    ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(13, 2 + wg); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-13, 5); ctx.stroke();
  } else if (o.pose === 'cheer') {
    const wv = Math.sin(G.clock * 14) * 3;
    ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-14, -20 + wv); ctx.moveTo(8, -6); ctx.lineTo(14, -20 - wv); ctx.stroke();
  } else {
    const sw = o.pose === 'walk' ? Math.sin(o.walk * Math.PI * 2) * 4 : 0;
    ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-13 - sw, 6); ctx.moveTo(9, -4); ctx.lineTo(13 + sw, 6); ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.restore();
}
// a cowboy hat centred at (x, y) on the head top; Pip's is tan with an orange band and her sprout pokes out of it,
// Bo's is brown with a blue band
function qdHat(k, x, y, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const crown = k ? '#8a5a30' : '#d6a35e', brim = k ? '#6e4422' : '#b98545', band = PCOL[k];
  ctx.fillStyle = brim; ctx.beginPath(); ctx.ellipse(0, 1, 17, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-17, 0); ctx.quadraticCurveTo(-19, -5, -20, -7); ctx.quadraticCurveTo(-15, -1, -12, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(17, 0); ctx.quadraticCurveTo(19, -5, 20, -7); ctx.quadraticCurveTo(15, -1, 12, 0); ctx.fill();
  ctx.fillStyle = crown; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.quadraticCurveTo(-11, -13, -5, -14); ctx.quadraticCurveTo(0, -11, 5, -14); ctx.quadraticCurveTo(11, -13, 10, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = band; ctx.fillRect(-10, -4, 20, 3.5);
  if (k === 0) { ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(1, -12); ctx.lineTo(2, -18); ctx.stroke(); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(6, -19, 5, 2.5, -0.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
// the toy cork popgun: a chunky stripy barrel in the player's colour; a cork on a string; POP! flag or a fzzt
function qdGun(k, x, y, o) {
  ctx.save(); ctx.translate(x, y);
  const droop = o.pose === 'fzzt' ? 0.5 : 0;
  ctx.rotate(droop);
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = PDARK[k]; ctx.lineWidth = 1.4;
  rr(-2, -4, 20, 8, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PCOL[k]; ctx.fillRect(3, -4, 3, 8); ctx.fillRect(10, -4, 3, 8);
  ctx.fillStyle = PDARK[k]; rr(-3, 0, 6, 9, 2); ctx.fill(); // the handle
  // the cork in the muzzle (unless it is out on its string)
  if (!o.corkOut) { ctx.fillStyle = '#c9925a'; rr(18, -3, 6, 6, 2); ctx.fill(); ctx.fillStyle = '#e2b07a'; ctx.fillRect(19, -2, 2, 4); }
  // the POP! flag pops out of the barrel when it fires
  if (o.pose === 'fire' && o.flag > 0) {
    const f = Math.min(1, o.flag * 6);
    ctx.strokeStyle = '#6a3a1a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(14, -4); ctx.lineTo(14, -4 - 14 * f); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(14, -18 * f - 4, 18 * f, 9 * f);
    ctx.strokeStyle = '#e8483a'; ctx.lineWidth = 1; ctx.strokeRect(14, -18 * f - 4, 18 * f, 9 * f);
    if (f >= 1) { ctx.save(); ctx.translate(23, -17.5); ctx.scale(o.face < 0 ? -1 : 1, 1); text('POP!', 0, 0, 6.5, '#e8483a', 'center'); ctx.restore(); }
  }
  ctx.restore();
}
// where a duelist's popgun muzzle is (world), for the cork and its string
function qdMuzzle(st, k) {
  const s = qdStance(st, k), sc = QD.s, f = Math.sign(s.face) || 1;
  return { x: s.x + f * 41 * sc, y: QD.feetY - 16 * sc };
}
function qdHeroPose(st, P) {
  const m = G.match, k = P.k, s = qdStance(st, k);
  const live = m && m.phase === 'live', ended = m && (m.phase === 'end' || m.phase === 'over');
  let pose = 'stand', mood = 'happy';
  if (st.ph === 'pace' && live) pose = 'walk';
  else if (st.ph === 'turn' || st.ph === 'wait') { pose = 'ready'; mood = 'focus'; }
  else if (st.ph === 'draw') { pose = P.raw != null ? 'fire' : 'ready'; mood = P.raw != null ? 'happy' : 'focus'; }
  if (st.ph === 'done' || ended) {
    const r = st.res;
    if (P.foul) { pose = P.foul === 'wrong' ? 'fire' : 'fzzt'; mood = 'oops'; }
    else if (r && r.winner === k) { pose = P.cheer > 0.4 || ended ? 'cheer' : (P.raw != null ? 'fire' : 'stand'); mood = 'joy'; }
    else if (r && r.winner === 1 - k) { pose = P.raw != null ? 'fire' : 'stand'; mood = P.hat ? P.mood : 'wow'; }
    else { pose = P.raw != null ? 'fire' : 'stand'; mood = 'oops'; }
  }
  if (st.ph === 'wait' && P.foul) { pose = 'fzzt'; mood = 'oops'; }
  return { x: s.x, y: QD.feetY, face: s.face, walk: s.walk, pose, mood, drawn: P.raw != null || !!P.foul };
}
function qdDrawDuelist(st, P) {
  const o = qdHeroPose(st, P);
  o.hat = !P.hat; o.flag = P.gunT >= 0 ? P.gunT : 0; o.corkOut = !!P.cork && P.cork.t < QD.corkT + 0.35;
  if (P.gold) {
    // a gold glow under a duelist with catch-up help
    ctx.fillStyle = 'rgba(255,197,61,0.32)'; ctx.beginPath(); ctx.ellipse(o.x, o.y, 34, 7, 0, 0, Math.PI * 2); ctx.fill();
  }
  qdDrawHero(P.k, o);
  // the cork on its springy string
  const c = P.cork;
  if (c) {
    const mz = qdMuzzle(st, P.k);
    let k = clamp(c.t / QD.corkT, 0, 1);
    if (c.t > QD.corkT + 0.25) k = clamp(1 - (c.t - QD.corkT - 0.25) / 0.25, 0, 1);
    if (k > 0) {
      const ex = mz.x + (c.tx - mz.x) * k, ey = mz.y + (c.ty - mz.y) * k - Math.sin(k * Math.PI) * 14;
      ctx.strokeStyle = 'rgba(250,245,230,0.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(mz.x, mz.y);
      const n = 14;
      for (let i = 1; i <= n; i++) { const u = i / n; ctx.lineTo(mz.x + (ex - mz.x) * u, mz.y + (ey - mz.y) * u + Math.sin(u * 20 + G.clock * 30) * 3 * (1 - k * 0.5)); }
      ctx.stroke();
      ctx.fillStyle = '#c9925a'; rr(ex - 5, ey - 4, 10, 8, 3); ctx.fill(); ctx.fillStyle = '#e2b07a'; ctx.fillRect(ex - 3, ey - 3, 2, 6);
    }
  }
  // a popped hat, tumbling and then lying in the dust
  if (P.hat) { ctx.save(); ctx.translate(P.hat.x, P.hat.y); ctx.scale(QD.s, QD.s); qdHat(P.k, 0, 0, P.hat.rot); ctx.restore(); }
}
function qdDrawTop() {
  const st = G.mst, m = G.match; if (!st.cam || !st.pl) return;
  const cam = st.cam, big = qdBig();
  ctx.save(); qdCamXform(cam);
  // the aim markers over the cutouts (each player's own colour; Pip's on the left half, Bo's on the right)
  if (st.target && (st.ph === 'draw' || st.ph === 'done')) {
    for (const P of st.pl) {
      if (P.foul === 'early') continue;
      const x = QD.cutX[P.aim] + (P.k ? 12 : -12), y = QD.cutY - QD.cutH - 16, bob = Math.sin(G.clock * 8 + P.k) * 2;
      ctx.fillStyle = PCOL[P.k]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 9, y - 12 + bob); ctx.lineTo(x + 9, y - 12 + bob); ctx.lineTo(x, y + 2 + bob); ctx.closePath(); ctx.fill(); ctx.stroke();
      text(NAMES[P.k][0], x, y - 18 + bob, 12, PCOL[P.k], 'center');
      ctx.strokeStyle = PCOL[P.k]; ctx.lineWidth = 3; ctx.setLineDash([5, 4]);
      circle(QD.cutX[P.aim], QD.cutY - QD.cutH * 0.72, 30 + P.k * 4); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  for (const P of st.pl) qdDrawDuelist(st, P);
  for (const q of st.vis.fx) {
    const a = clamp(q.life / q.max, 0, 1); ctx.globalAlpha = a; ctx.fillStyle = q.col;
    if (q.kind === 'spark') qdStar(q.x, q.y, q.size * (0.8 + 0.6 * a));
    else { circle(q.x, q.y, q.size * (0.6 + 0.6 * (1 - a))); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  // the Mayor's speech bubble (screen space so it reads at any zoom); the real DRAW! is never only a bubble
  const r = st.ref;
  if (r && r.say && r.sayT < (r.sayGold ? 0.9 : 1.15)) {
    const s = qdToScreen(cam, QD.refX - 54, QD.refY - 98), fs = big ? 24 : 18;
    ctx.font = fs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const w = ctx.measureText(r.say).width + 26, h = fs + 16, x = clamp(s.x - w, 8, W - w - 8), y = clamp(s.y - h / 2, (G.matchHudBox ? G.matchHudBox.y1 : 44) + (big ? 40 : 32), H - h);
    const a = clamp(Math.min(r.sayT / 0.08, ((r.sayGold ? 0.9 : 1.15) - r.sayT) / 0.2), 0, 1), pop = 1 + 0.15 * Math.max(0, 1 - r.sayT * 8);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x + w / 2, y + h / 2); ctx.scale(pop, pop);
    ctx.fillStyle = r.sayGold ? '#fff3c4' : '#fffaf0'; ctx.strokeStyle = '#5a4a8a'; ctx.lineWidth = 2.5;
    rr(-w / 2, -h / 2, w, h, 12); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w / 2 - 18, h / 2 - 1); ctx.lineTo(w / 2 - 4, h / 2 + 12); ctx.lineTo(w / 2 - 6, h / 2 - 1); ctx.fill();
    text(r.say, 0, 1, fs, C.ink, 'center');
    ctx.restore();
  }
  // fakeout pops (CAW!, CLONK!, WHAP!): plain white words, never gold
  for (const p of st.vis.pops) {
    const s = qdToScreen(cam, p.x, p.y), k = p.t / 1.3, fs = big ? 30 : 24;
    ctx.globalAlpha = 1 - k * k;
    bigText(p.text, clamp(s.x, 60, W - 60), Math.max(64, s.y - 20 * k), fs, p.col, 1 + 0.3 * Math.max(0, 1 - p.t * 6));
    ctx.globalAlpha = 1;
  }
  // pops over each duelist's head (Bo's first, then Pip's; nudged apart if they would overlap)
  for (const P of [st.pl[1], st.pl[0]]) if (P.popT < 1.3 && P.pop) {
    const sp = qdToScreen(cam, qdStance(st, P.k).x, QD.feetY - 92), k = P.popT / 1.3;
    const fs = P.popBig ? (big ? 26 : 21) : (big ? 21 : 16);
    ctx.font = fs + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const w = ctx.measureText(P.pop).width * 1.1 + 8;
    let x = clamp(sp.x, w / 2 + 8, W - w / 2 - 8);
    if (st.ph === 'set' || st.ph === 'pace') x = clamp(x + (P.k ? 60 : -60), w / 2 + 8, W - w / 2 - 8);
    ctx.globalAlpha = 1 - k * k;
    bigText(P.pop, x, Math.max(70, sp.y - 18 * k - (P.k ? 0 : 0)), fs, P.popCol, 1 + 0.25 * Math.max(0, 1 - k * 5));
    ctx.globalAlpha = 1;
  }
  // reaction times over the heads once the round is decided
  if (st.res && st.drawSeen) for (const P of st.pl) {
    if (P.raw == null) continue;
    const sp = qdToScreen(cam, qdStance(st, P.k).x, QD.feetY - 128), fs = big ? 20 : 16, lab = qdMs(P.raw);
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(lab).width + 20, x = clamp(sp.x, w / 2 + 6, W - w / 2 - 6), y = Math.max(62, sp.y);
    ctx.fillStyle = 'rgba(28,26,54,0.88)'; rr(x - w / 2, y - fs / 2 - 5, w, fs + 10, 10); ctx.fill();
    ctx.strokeStyle = st.res.winner === P.k ? C.gold : PCOL[P.k]; ctx.lineWidth = 2; rr(x - w / 2, y - fs / 2 - 5, w, fs + 10, 10); ctx.stroke();
    text(lab, x, y + 0.5, fs, st.res.winner === P.k ? C.gold : '#fff', 'center', 'body');
  }
  // name tags beside the duelists through the intro card, "Round N" and 3-2-1
  const tagA = G.introT > 0 ? 1 - clamp(G.introT / 0.5, 0, 1) : m && (m.phase === 'ready' || m.phase === 'count') ? 1 : 0;
  if (tagA > 0) for (const P of st.pl) {
    const sp = qdToScreen(cam, qdStance(st, P.k).x, QD.feetY - 34), cpu = qdCpu(P.k), hw = cpu ? 32 : 20;
    const x = sp.x + (P.k ? 78 : -78), y = sp.y;
    ctx.globalAlpha = tagA; ctx.fillStyle = PCOL[P.k]; rr(x - hw, y - 11, hw * 2, 20, 10); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + (P.k ? -hw + 2 : hw - 2), y - 5); ctx.lineTo(x + (P.k ? -hw - 8 : hw + 8), y); ctx.lineTo(x + (P.k ? -hw + 2 : hw - 2), y + 5); ctx.fill();
    text(cpu ? NAMES[P.k] + ' · CPU' : NAMES[P.k], x, y - 0.5, 13, '#fff', 'center', 'body'); ctx.globalAlpha = 1;
  }
  // the real DRAW!: a white flash, then the huge gold word with a sunburst (the only big gold word in this level)
  const v = st.vis;
  if (v.flash > 0) { ctx.fillStyle = 'rgba(255,250,230,' + (v.flash * 0.45).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
  if (v.drawT >= 0 && v.drawT < 0.95 && st.drawSeen) {
    const k = v.drawT, a = clamp((0.95 - k) / 0.3, 0, 1), sc = k < 0.12 ? 0.6 + k / 0.12 * 0.6 : 1.2 - Math.min(0.2, (k - 0.12) * 0.6);
    const cy = big ? 150 : 136;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, cy);
    ctx.rotate(G.clock * 0.6);
    ctx.fillStyle = 'rgba(255,197,61,0.35)';
    ctx.beginPath(); for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.moveTo(0, 0); ctx.lineTo(-18, -150); ctx.lineTo(18, -150); ctx.closePath(); } ctx.fill();
    ctx.restore();
    ctx.save(); ctx.globalAlpha = a;
    bigText('DRAW!', W / 2, cy, big ? 120 : 104, C.gold, sc);
    ctx.restore();
  }
}

/* ---------- HUD ---------- */
// each player's own keys (none for the computer)
function qdKeys(id) {
  let k = 'kb'; try { k = actKey(id); } catch (e) { k = 'kb'; }
  if (k === 'pad') return { fire: glyph('act'), aim: 'stick ◀ ▶' };
  if (k === 'touch') return { fire: 'tap', aim: '◀ ▶' };
  if (typeof cpuSolo === 'function' && cpuSolo()) return { fire: 'F or /', aim: 'A D or ← →' };
  return id === 0 ? { fire: 'F', aim: 'A D' } : { fire: '/', aim: '← →' };
}
function qdChip(label, x, y, big, col, gold) {
  const fs = big ? 18 : 13, h = big ? 30 : 22;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(label).width + (big ? 26 : 20), cx = clamp(x, w / 2 + 6, W - w / 2 - 6), cy = clamp(y, h / 2 + 4, H - h / 2 - 4);
  ctx.fillStyle = 'rgba(28,26,54,0.88)'; rr(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; rr(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.stroke();
  text(label, cx, cy + 0.5, fs, gold ? C.gold : C.paper, 'center', 'body');
  return { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 };
}
// the little popgun icon on a panel
function qdGunIcon(x, y, s, k, out) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (k ? -1 : 1), s);
  ctx.fillStyle = '#fff'; rr(-10, -4, 20, 8, 3); ctx.fill();
  ctx.fillStyle = PCOL[k]; ctx.fillRect(-5, -4, 3, 8); ctx.fillRect(2, -4, 3, 8);
  ctx.fillStyle = PDARK[k]; rr(-11, 0, 6, 9, 2); ctx.fill();
  if (!out) { ctx.fillStyle = '#c9925a'; rr(10, -3, 6, 6, 2); ctx.fill(); }
  ctx.restore();
}
function qdHud() {
  const st = G.mst, m = G.match; if (!st.pl || !st.cam || !m) return;
  const big = qdBig(), sz = big ? 1.4 : 1, tw = QD_TWISTS[st.twist] || QD_TWISTS.plain;
  // bottom corners: each duelist's panel: name, what is happening, the reaction time, the best this match
  for (const P of st.pl) {
    const left = P.k === 0, pw = 214 * sz, ph = 44 * sz, y = H - 8 - ph, x = left ? 10 : W - 10 - pw;
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(x, y, pw, ph, ph / 2); ctx.fill();
    if (P.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; rr(x, y, pw, ph, ph / 2); ctx.stroke(); }
    const nx = left ? x + 16 * sz : x + pw - 16 * sz;
    text(NAMES[P.k], nx, y + ph / 2 + 0.5, 18 * sz, PCOL[P.k], left ? 'left' : 'right');
    const mid = left ? x + 118 * sz : x + pw - 118 * sz;
    let lab, col = C.paper;
    if (P.foul === 'early') { lab = 'Too early!'; col = '#ffd2c4'; }
    else if (P.foul === 'wrong') { lab = 'Oops! A friend'; col = '#ffd2c4'; }
    else if (P.raw != null) { lab = qdMs(P.raw); col = st.res && st.res.winner === P.k ? C.gold : C.paper; }
    else if (st.ph === 'draw') { lab = st.target ? 'Aim & fire!' : 'FIRE!'; col = C.gold; }
    else if (st.ph === 'done' || m.phase === 'end') lab = '–';
    else if (st.ph === 'wait' || st.ph === 'turn') lab = 'Wait for it...';
    else lab = 'Ready';
    text(lab, mid, y + ph / 2 - (P.gold || isFinite(st.stat.best[P.k]) ? 6 * sz : 0) + 0.5, 15 * sz, col, 'center', 'body');
    const sub = [];
    if (isFinite(st.stat.best[P.k]) && !P.gold) sub.push('best ' + Math.round(st.stat.best[P.k] * 1000));
    if (P.gold) sub.push('gold −' + Math.round(P.bonus * 1000) + ' ms' + (P.patience ? ' · patience' : ''));
    if (sub.length) text(sub.join('  ·  '), mid, y + ph / 2 + 9 * sz, 10.5 * sz, P.gold ? C.gold : 'rgba(246,239,223,0.7)', 'center', 'body');
    qdGunIcon(left ? x + pw - 22 * sz : x + 22 * sz, y + ph / 2 - 1, 1.1 * sz, P.k, P.raw != null || !!P.foul);
  }
  // the round's twist, top left under the level pill
  {
    const fs = big ? 18 : 13, h = big ? 34 : 26, y0 = 46;
    const lab = tw.name + (st.target ? ':  bandit cutouts' : '');
    ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(lab).width + (big ? 34 : 28); pill(14, y0, w, h); text(lab, 14 + (big ? 17 : 14), y0 + h / 2 + 0.5, fs, C.gold, 'left', 'body');
  }
  const box = G.matchHudBox, below = (box ? box.y1 : 44) + (big ? 20 : 16);
  if (m.phase === 'live') {
    // the reminder under the match pill until DRAW!
    if (st.ph === 'pace' || st.ph === 'turn' || st.ph === 'wait') qdChip(st.ph === 'pace' ? 'Three paces... then wait for the gold DRAW!' : 'Wait for the gold DRAW!', W / 2, below, big, 'rgba(255,197,61,0.7)', true);
    // each person's keys over their panel (rounds 1-2, the first bandit round, and with gold help); never the computer's
    const firstTarget = st.target && !st.stat.seenTarget;
    for (const P of st.pl) {
      if (qdCpu(P.k)) continue;
      if (!(st.round <= 2 || firstTarget || P.gold || st.twist === 'sudden')) continue;
      if (P.raw != null || P.foul || st.ph === 'done') continue;
      const kk = qdKeys(P.k), left = P.k === 0, ph = 44 * sz;
      const lab = st.ph === 'draw' ? (st.target ? kk.aim + ' aim · ' + kk.fire + ' fire!' : kk.fire + ' fire!') : (st.target ? kk.fire + ' fire (after DRAW!)' : kk.fire + ' fire, after DRAW!');
      if (big) { const hp = qdToScreen(st.cam, qdStance(st, P.k).x, QD.feetY - 150); qdChip(lab, hp.x, hp.y, big, PCOL[P.k], st.ph === 'draw'); }
      else qdChip(lab, left ? 10 + 214 * sz / 2 : W - 10 - 214 * sz / 2, H - 8 - ph - 18, big, PCOL[P.k], st.ph === 'draw');
    }
  }
  if (m.phase === 'ready' || m.phase === 'count') {
    // the round card, between the match pill and the framework's Round banner and 3-2-1 pill (y 113): the twist
    const nf = big ? 23 : 22, hf = big ? 15 : 14;
    ctx.font = hf + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = Math.min(W - 20, Math.max(big ? 380 : 320, ctx.measureText(tw.hint).width + 44));
    const cy = (box ? box.y1 : 44) + 5, ch = Math.min(big ? 52 : 50, 108 - cy), gold = st.pl.some(P => P.gold);
    const a = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1, cx = W / 2;
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(cx - w / 2, cy, w, ch, 14); ctx.fill();
    ctx.strokeStyle = gold ? C.gold : 'rgba(246,239,223,0.25)'; ctx.lineWidth = 2; rr(cx - w / 2, cy, w, ch, 14); ctx.stroke();
    text(tw.name, cx, cy + ch * 0.33, nf, C.gold, 'center'); text(tw.hint, cx, cy + ch * 0.74, hf, C.paper, 'center', 'body');
    ctx.globalAlpha = 1;
    // over the bottom corners: any gold help (announced to everyone), then each person's keys before rounds 1-2 and
    // the first bandit round (their own device; never the computer's)
    const keysToo = m.round <= 2 || (st.target && !st.stat.seenTarget);
    ctx.globalAlpha = a;
    for (const P of st.pl) {
      const left = P.k === 0, ph = 44 * sz, cxp = left ? 10 + 214 * sz / 2 : W - 10 - 214 * sz / 2;
      let y = H - 8 - ph - (big ? 24 : 18);
      if (keysToo && !qdCpu(P.k)) {
        const kk = qdKeys(P.k);
        qdChip(NAMES[P.k] + ': ' + (st.target ? kk.aim + ' aim · ' : '') + kk.fire + ' fire', cxp, y, big, PCOL[P.k], false);
        y -= big ? 38 : 28;
      }
      if (P.gold) qdChip(P.gold >= 2 ? 'Gold for ' + NAMES[P.k] + ': 70 ms head start + one early press forgiven!' : 'Gold for ' + NAMES[P.k] + ': a 40 ms head start!', cxp, y, big, C.gold, true);
    }
    ctx.globalAlpha = 1;
  }
}

/* ---------- sounds ---------- */
// the real DRAW bell: a bright brass ding-ding (no fakeout sounds like it)
Sfx.extra.quickdrawBell = function () { [1568, 1568].forEach((f, i) => { this.tone(f, 0.5, 'sine', 0.07, null, i * 0.16); this.tone(f * 2.01, 0.3, 'triangle', 0.025, null, i * 0.16); this.tone(f * 0.5, 0.6, 'sine', 0.03, null, i * 0.16); }); };
Sfx.extra.quickdrawPop = function (p) { this.tone(900 * p, 0.05, 'square', 0.05, 300 * p); this.tone(1400 * p, 0.08, 'triangle', 0.04, 2200 * p, 0.02); };
Sfx.extra.quickdrawCock = function (p) { this.tone(600 * p, 0.04, 'square', 0.03, 400 * p); };
Sfx.extra.quickdrawFzzt = function (p) { this.tone(220 * p, 0.35, 'sawtooth', 0.03, 90 * p); this.tone(2600 * p, 0.25, 'square', 0.008, 1800 * p, 0.03); };
Sfx.extra.quickdrawNope = function (p) { this.tone(300 * p, 0.08, 'triangle', 0.03, 240 * p); };
Sfx.extra.quickdrawStep = function (p) { this.tone(120 * (p === 1 ? 0.9 : 1), 0.07, 'triangle', 0.05, 80); };
Sfx.extra.quickdrawTurn = function () { this.tone(330, 0.12, 'triangle', 0.03, 440); this.tone(110, 0.9, 'sine', 0.025, 104, 0.1); };
Sfx.extra.quickdrawWord = function () { this.tone(520, 0.08, 'sawtooth', 0.025, 640); this.tone(700, 0.12, 'sawtooth', 0.022, 380, 0.09); };
Sfx.extra.quickdrawCaw = function () { this.tone(820, 0.16, 'square', 0.03, 520); this.tone(760, 0.18, 'square', 0.025, 460, 0.2); };
Sfx.extra.quickdrawClonk = function () { this.tone(330, 0.18, 'square', 0.035, 300); this.tone(250, 0.22, 'triangle', 0.04, 220, 0.01); };
Sfx.extra.quickdrawDoors = function () { this.tone(160, 0.08, 'square', 0.05, 90); this.tone(140, 0.08, 'square', 0.04, 80, 0.12); };
Sfx.extra.quickdrawAchoo = function () { this.tone(500, 0.18, 'sawtooth', 0.02, 900); this.tone(1000, 0.25, 'sawtooth', 0.03, 200, 0.2); };
Sfx.extra.quickdrawHat = function (p) { this.tone(500 * p, 0.25, 'sine', 0.035, 1200 * p); };
Sfx.extra.quickdrawBonk = function (p) { this.tone(260 * p, 0.12, 'triangle', 0.05, 150 * p); };
Sfx.extra.quickdrawOops = function (p) { this.tone(400 * p, 0.12, 'triangle', 0.035, 300 * p, 0.1); this.tone(300 * p, 0.2, 'triangle', 0.035, 200 * p, 0.22); };
Sfx.extra.quickdrawAim = function (p) { this.tone(700 * p, 0.04, 'triangle', 0.03); };
Sfx.extra.quickdrawPopup = function () { [392, 523, 659].forEach((f, i) => this.tone(f, 0.06, 'square', 0.02, null, 0.05 + i * 0.03)); };
Sfx.extra.quickdrawGold = function () { this.tone(784, 0.1, 'triangle', 0.05); this.tone(1046, 0.12, 'triangle', 0.045, null, 0.08); this.tone(1318, 0.16, 'triangle', 0.04, null, 0.16); };
