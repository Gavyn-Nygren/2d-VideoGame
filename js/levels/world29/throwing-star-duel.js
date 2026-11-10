/* Pip & Bo - Level 29-4 Throwing Star Duel (versus, World 29 Ninja Dojo). */
'use strict';

/* ===== 29-4 Throwing Star Duel (mode 'starduel', versus, best of 5, one screen, Gavyn's pick) =====
   Gavyn's pick: "face off in a dojo, throw stars, duck, and deflect them back with good timing."
   def.ownStep: the mode runs the whole live tick and draws ninja Pip and Bo itself (the engine bodies are hidden and
   only follow along for name tags and speech bubbles). One screen, no scrolling: a moonlit dojo with tatami mats, paper
   screens and a gong. Pip duels from the left half, Bo from the right half; the two halves are exact mirrors and every
   rule below is the same for both. Foam stars only: a hit is a soft "Bonk!" and a dizzy spin, nobody gets hurt.

   THE DUEL
     STARS fly in two lanes: HIGH (head height) and LOW (ankle height). The action throws one from where you stand: a
       HIGH star when you are standing (or in the air), a LOW star when you are ducking. Each star comes out of your
       pouch: 3 stars, and one grows back every 1.0 s while you are on your feet (never while ducking, so camping
       in a duck runs dry), so wild mashing just empties the pouch.
     DODGE: ▼ ducks under a HIGH star (you can't walk while ducking). ▲ hops over a LOW star (a small hop: it never
       clears a high one).
     DEFLECT: when a star is about to reach you (less than 0.42 s away), the action swings your sword instead of
       throwing. A standing swing bats back a HIGH star, a ducking swing a LOW star. The swing has to come in the last
       0.16 s ("Clang!"): the star flies back 18% faster and is now yours. In the last 0.065 s it is "Perfect!" (36%
       faster). A star rings white while it is in your window. Too early, or the wrong height, is a whiff: no throwing
       or swinging for 0.55 s (you can still duck and hop). Every bounce of a rally makes the star faster (up to 880
       px/s) and the window a little shorter (0.012 s a bounce, never under 0.1 s), so a long rally always ends.
     BONK: a star that reaches you undodged is a bonk: you spin dizzy for 0.8 s and no star can bonk you for 1.5 s.
       Three bonks (the three lanterns on your side of the wall go out one by one) and the other ninja wins the round.
       Both out in the same tick is a tied round.
     MOVING: ◀ ▶ step along your own half (never past the middle mat). Closer means less time to react, for both.
     THE MIDDLE LANTERN (rounds 2, 4 and 5): a big paper lantern bobs up and down on a rope in the middle. A star that
       runs into it goes "Paf!" and is gone, so watch where it will be: low stars slip under it while it is in the high
       lane, high stars pass over it while it is down, and both lanes are open while it is up near the ceiling.
   ROUNDS (def.match: best of 5, 45 s each): 1 First Bow (open floor), 2 Lantern Bob (slow lantern), 3 Swift Stars
     (open floor, stars 18% faster), 4 Quick Lantern (fast lantern), 5 Grand Duel (lantern and swift stars).
   TIME UP: fewer bonks taken wins the round; the same: more deflects this round; still the same: a tied round (replayed).
     tiebreak() (a second tie in a row): more bonks landed this match, then more deflects, else replay. After two ties
     the framework's sudden death is on: the first bonk wins.
   CONTROLS (p.input / p.pendingJump / p.pendingAct only, so keyboard, controller and touch all work):
     ◀ ▶ step, ▲ hop, ▼ duck (hold), action = throw (label 'throw'), or swing when a star is close.
   CATCH-UP HELP (gold, announced by the gold banner at GO, counted on the results card, off in sudden death):
     1 round behind = a gold sword (deflect window 0.25 s instead of 0.16 s); 2 or more behind = also a gold pouch
     (4 stars, one back every 0.75 s).
   MODES.starduel.plan(st, id) says what a duelist faces right now (the nearest star flying at them, its lane, the
     seconds until it arrives, whether a swing would connect, which lanes the lantern will block): the prompts, the HUD
     panels and the computer brain all read it.
   LOOKS: the ninjas are drawn at S = 2 (twice the engine body) so they read on a phone; every height (lanes, hop,
     lantern bob) is scaled by Z = 2 / 1.5 from the first tuning, so all timings are unchanged.
   Results card: rounds won, bonks landed, deflects, perfect deflects, and a line for the longest rally.
   Everything lives inside this block; sounds are Sfx.extra.starduel*. Level state lives in G.mst, per-round state is
   rebuilt in resetRound. */
(() => {
  const K = NINJA, Z = 2 / 1.5;
  const SD = {
    // Z: the ninjas are drawn twice the engine size (S = 2); heights scale by Z = S / 1.5 so every timing stays the same
    floor: 440, mid: 480, side: [[70, 392], [568, 890]], start: [250, 710], S: 2,
    walk: 170, jumpV: 290 * Z, grav: 1400 * Z,
    laneY: [40 * Z, 8 * Z], starR: 11, v0: 380, vMax: 880, bounce: 1.18, perfBounce: 1.36,
    hitR: 13, reach: 42, zone: 0.42, win: 0.16, winGold: 0.25, winShrink: 0.012, winMin: 0.1, perf: 0.065,
    swingT: 0.22, whiffT: 0.55, throwT: 0.2, release: 0.07, throwCd: 0.3,
    pouch: 3, refill: 1.0, goldPouch: 4, goldRefill: 0.75,
    need: 3, dizzy: 0.8, inv: 1.5, duckIn: 0.55, hopClear: 10 * Z,
    lanMid: 56 * Z, lanAmp: 52 * Z, lanBlock: 18 * Z, roundTime: 45,
  };
  const ROUNDS = [
    { name: 'First Bow', lantern: 0, fast: 1 },
    { name: 'Lantern Bob', lantern: 4.2, fast: 1 },
    { name: 'Swift Stars', lantern: 0, fast: 1.18 },
    { name: 'Quick Lantern', lantern: 2.8, fast: 1 },
    { name: 'Grand Duel', lantern: 3.4, fast: 1.18 },
  ];
  const DIR = [1, -1];
  const grounded = P => P.h <= 0 && P.vy <= 0;

  /* ---------- a round ---------- */
  function newDuelist(k, gold) {
    return { k, x: SD.start[k], h: 0, vy: 0, duck: false, duckA: 0, duckT: 0, walk: 0, moving: false,
      pouch: gold >= 2 ? SD.goldPouch : SD.pouch, cap: gold >= 2 ? SD.goldPouch : SD.pouch, refill: gold >= 2 ? SD.goldRefill : SD.refill, refT: 0,
      win: gold >= 1 ? SD.winGold : SD.win, gold,
      throwT: 0, released: true, lowThrow: false, thrCd: 0, swing: null, lock: 0, whiff: 0, glint: 0,
      bonks: 0, dizzy: 0, inv: 0, cheer: 0 };
  }
  function newRound(st, n, info) {
    const k = st.forceRound != null ? st.forceRound : Math.min(n - 1, ROUNDS.length - 1);
    st.course = ROUNDS[k];
    st.round = n; st.res = null; st.rt = 0; st.lanT = 0; st.lanJig = 0; st.gongT = 0; st.starN = 0;
    st.need = info.suddenDeath ? 1 : SD.need;
    const w = info.wins || [0, 0];
    st.pl = [0, 1].map(id => {
      const behind = w[1 - id] - w[id];
      return newDuelist(id, info.suddenDeath || st.noHelp ? 0 : behind >= 2 ? 2 : behind >= 1 ? 1 : 0);
    });
    st.stars = [];
    K.fx(st);
  }
  // the lantern's height above the floor, `ahead` seconds from now (it starts up by the ceiling)
  const lanH = (st, ahead = 0) => SD.lanMid + SD.lanAmp * Math.cos((st.lanT + ahead) / st.course.lantern * Math.PI * 2);
  const lanBlocks = (h, lane) => Math.abs(h - SD.laneY[lane]) < SD.lanBlock;
  // seconds until star s reaches duelist P's body
  const tti = (s, P) => (Math.abs(s.x - P.x) - SD.hitR) / s.v;
  // the nearest star flying at duelist k that can still reach them
  function threat(st, k) {
    const P = st.pl[k];
    let best = null, bt = Infinity;
    for (const s of st.stars) {
      if (s.dead || s.passed || s.dir !== -DIR[k]) continue;
      const t = tti(s, P);
      if (t < bt) { bt = t; best = s; }
    }
    return best;
  }
  const winFor = (P, s) => Math.max(SD.winMin, P.win - SD.winShrink * s.bounces);
  const feet = P => SD.floor - P.h;
  const sayPop = (st, P, word, col, size) => K.pop(st, P.x, feet(P) - 86 * Z - 4, word, col, size);

  /* ---------- the rules ---------- */
  function throwStar(st, P) {
    const dir = DIR[P.k], lane = P.lowThrow ? 1 : 0;
    st.stars.push({ id: ++st.starN, x: P.x + dir * 26, lane, dir, v: SD.v0 * st.course.fast, owner: P.k, bounces: 0, passed: false, under: false, dead: false, spin: 0, age: 0 });
    st.stat.throws[P.k]++;
    Sfx.play('ninjaWhoosh', lane ? 0.85 : 1.1);
  }
  function deflect(st, T, s, perfect) {
    s.dir = -s.dir; s.owner = T.k; s.bounces++; s.passed = false; s.under = false;
    s.v = Math.min(SD.vMax, s.v * (perfect ? SD.perfBounce : SD.bounce));
    s.x = T.x + s.dir * SD.reach;
    T.glint = 1; T.lock = Math.min(T.lock, 0.08);
    st.stat.deflects[T.k]++; st.roundDef[T.k]++;
    if (perfect) st.stat.perfects[T.k]++;
    st.stat.rally = Math.max(st.stat.rally, s.bounces);
    const y = SD.floor - SD.laneY[s.lane];
    K.spark(st, s.x, y, perfect ? 12 : 7, perfect ? ['#ffffff', '#bfe8ff', '#ffe9f0'] : ['#ffffff', PCOL[T.k]]);
    sayPop(st, T, s.bounces >= 3 ? 'Rally x' + s.bounces + '!' : perfect ? 'Perfect!' : 'Clang!', perfect || s.bounces >= 3 ? '#bfe8ff' : '#ffffff', perfect ? 24 : 20);
    Sfx.play('ninjaShing', Math.min(1.6, 0.85 + s.bounces * 0.12));
    if (perfect) Sfx.play('starduelPerfect');
    rumble(T.k, 0.15, 0.3, 70);
  }
  function bonk(st, T, s) {
    T.bonks++; T.dizzy = SD.dizzy; T.inv = SD.inv; T.swing = null; T.throwT = 0; T.released = true; T.lock = 0; T.duck = false;
    st.stat.bonks[s.owner]++;
    s.dead = true;
    const y = SD.floor - SD.laneY[s.lane];
    K.spark(st, s.x, y, 10, ['#ffffff', '#fff3a0', PCOL[s.owner]]);
    K.part(st, s.x, y, -s.dir * 120, -260, 0.9, s.owner ? '#b9d4ff' : '#ffc0ab', 5, 700, 'star');
    sayPop(st, T, 'Bonk!', '#ffffff', 26);
    Sfx.play('ninjaBonk', 1 + 0.08 * T.bonks); Sfx.play('ninjaDizzy');
    if (!reduceMotion) G.shake = 0.06;
    rumble(T.k, 0.3, 0.6, 160);
  }
  function tickDuelist(st, P, dt, live) {
    const p = G.players[P.k], i = p.input, [lo, hi] = SD.side[P.k];
    const wantJump = p.pendingJump, wantAct = p.pendingAct;
    p.pendingJump = false; p.pendingAct = false;
    if (P.thrCd > 0) P.thrCd -= dt;
    if (P.lock > 0) P.lock -= dt;
    if (P.whiff > 0) P.whiff -= dt;
    if (P.inv > 0) P.inv -= dt;
    if (P.dizzy > 0) P.dizzy -= dt;
    if (P.glint > 0) P.glint = Math.max(0, P.glint - dt * 3);
    if (P.swing && (P.swing.t += dt) > SD.swingT + 0.06) P.swing = null;
    // the hop
    if (!grounded(P)) {
      P.h += P.vy * dt; P.vy -= SD.grav * dt;
      if (P.h <= 0) { P.h = 0; P.vy = 0; K.dust(st, P.x, SD.floor, 'rgba(226,214,170,0.6)', 3); }
    }
    P.moving = false;
    const can = live && !st.res && P.dizzy <= 0;
    if (!can) { P.duck = false; P.duckA = approach(P.duckA, 0, dt * 12); if (P.throwT > 0) P.throwT -= dt; return; }
    // the pouch grows a star back
    // (only while you are up on your feet: a ninja curled up in a duck can't reach the pouch, so camping in a duck runs dry)
    if (P.pouch < P.cap) { if (!P.duck) { P.refT += dt; if (P.refT >= P.refill) { P.refT = 0; P.pouch++; Sfx.play('starduelRefill', P.k); } } } else P.refT = 0;
    // stance and steps (locked for the moment of a swing)
    const swinging = P.swing && P.swing.t < SD.swingT;
    if (!swinging) {
      const g = grounded(P);
      P.duck = g && !!i.down;
      if (wantJump && g) { P.duck = false; P.vy = SD.jumpV; P.h = 0.01; Sfx.play('starduelHop', P.k); }
      const mv = (i.right ? 1 : 0) - (i.left ? 1 : 0);
      if (mv && !P.duck) { P.x = clamp(P.x + mv * SD.walk * (g ? 1 : 0.8) * dt, lo, hi); P.walk += dt * 13; P.moving = g; }
    }
    P.duckA = approach(P.duckA, P.duck ? 1 : 0, dt * 12);
    P.duckT = P.duck ? P.duckT + dt : 0;
    // a throw lets go of its star a moment after the press
    if (P.throwT > 0) {
      P.throwT -= dt;
      if (!P.released && SD.throwT - P.throwT >= SD.release) { P.released = true; throwStar(st, P); }
    }
    if (!wantAct) return;
    if (P.lock > 0 || P.throwT > 0) return;
    const s = threat(st, P.k), t = s ? tti(s, P) : Infinity;
    if (s && grounded(P) && t <= SD.zone) {
      // close enough to swing at: in time and at the right height, or a whiff
      const low = P.duck, right = s.lane === (low ? 1 : 0), ok = right && t <= winFor(P, s);
      P.swing = { t: 0, low, ok, star: ok ? s : null, perfect: ok && t <= SD.perf };
      if (ok) P.lock = SD.swingT;
      else {
        P.lock = SD.whiffT; P.whiff = SD.whiffT; st.stat.whiffs[P.k]++;
        sayPop(st, P, right ? 'Too early!' : low ? 'Too low!' : 'Too high!', '#ffd9d0', 17);
        Sfx.play('starduelWhiff', P.k);
      }
      return;
    }
    if (P.thrCd > 0) return;
    if (P.pouch <= 0) { sayPop(st, P, 'Empty!', '#d9d3ef', 16); Sfx.play('starduelEmpty'); P.thrCd = 0.25; return; }
    P.pouch--; P.throwT = SD.throwT; P.released = false; P.lowThrow = P.duck; P.thrCd = SD.throwCd;
  }
  function tickStars(st, dt, live) {
    const F = SD.floor;
    for (const s of st.stars) {
      if (s.dead) continue;
      const x0 = s.x;
      s.x += s.dir * s.v * dt; s.spin += s.dir * dt * (10 + s.v / 60); s.age += dt;
      const y = F - SD.laneY[s.lane];
      // the middle lantern swallows a star that runs into it
      if (st.course.lantern && (x0 - SD.mid) * (s.x - SD.mid) <= 0 && lanBlocks(lanH(st), s.lane)) {
        s.dead = true; st.lanJig = 1; st.stat.pafs++;
        K.poof(st, SD.mid, y, 8); K.pop(st, SD.mid, y - 30, 'Paf!', '#ffe7a8', 18);
        Sfx.play('starduelPaf');
        continue;
      }
      const T = st.pl[s.dir > 0 ? 1 : 0], dx = Math.abs(s.x - T.x), ahead = (T.x - s.x) * s.dir;
      if (!s.passed && live && !st.res) {
        if (T.swing && T.swing.ok && T.swing.star === s && dx <= SD.reach) { T.swing.star = null; deflect(st, T, s, T.swing.perfect); continue; }
        if (dx < SD.hitR) {
          if (T.inv > 0) s.passed = true;
          else if (s.lane === 0 ? T.duckA > SD.duckIn : T.h > SD.hopClear) s.under = true;
          else { bonk(st, T, s); continue; }
        } else if (ahead < -SD.hitR) {
          s.passed = true;
          if (s.under) { st.stat.dodges[T.k]++; K.pop(st, clamp(T.x - DIR[T.k] * 46 * Z, 46, W - 46), feet(T) - 24 * Z, s.lane ? 'Hop!' : 'Ducked!', '#d9ffd0', 16); }   // (behind the back and low: clear of the prompt over the head)
        }
      }
      // off the floor: it sticks in the wall with a soft "tok"
      if (s.x < 16 || s.x > W - 16) { s.dead = true; K.dust(st, clamp(s.x, 16, W - 16), y, 'rgba(240,230,200,0.7)', 4); Sfx.play('starduelTok'); }
    }
    if (st.stars.some(s => s.dead)) st.stars = st.stars.filter(s => !s.dead);
  }
  function tick(st, dt, live) {
    st.t += dt;
    if (live) { st.rt += dt; st.lanT += dt; }
    if (st.lanJig > 0) st.lanJig = Math.max(0, st.lanJig - dt * 2.2);
    if (st.gongT > 0) st.gongT = Math.max(0, st.gongT - dt * 1.1);
    for (const P of st.pl) tickDuelist(st, P, dt, live);
    tickStars(st, dt, live);
    if (live && !st.res) {
      const out = st.pl.filter(P => P.bonks >= st.need);
      if (out.length) {
        const w = out.length === 2 ? -1 : 1 - out[0].k;
        endRound(st, w);
        matchRoundEnd(w, w < 0 ? 'Double bonk!' : st.need === 1 ? 'The first bonk wins!' : 'Three bonks on ' + NAMES[1 - w] + '!');
      }
    }
    K.tickFx(st, dt);
    mirror(st);
  }
  function endRound(st, w) {
    st.res = { winner: w };
    st.gongT = 1; Sfx.play('ninjaGong');
    for (const s of st.stars) K.poof(st, s.x, SD.floor - SD.laneY[s.lane], 4);
    st.stars = [];
    if (w >= 0) { st.stat.wins[w]++; st.pl[w].cheer = 1; st.pl[w].dizzy = 0; K.confetti(st, st.pl[w].x, feet(st.pl[w]) - 60 * Z, 26); }
  }
  // the engine players follow the ninjas (name tags, speech bubbles)
  function mirror(st) { for (const P of st.pl) K.place(P.k, P.x, feet(P)); }

  /* ---------- what a duelist faces right now (prompts, HUD and the computer brain read this) ---------- */
  function plan(st, id) {
    const P = st.pl && st.pl[id];
    if (!P) return null;
    const s = threat(st, id), t = s ? tti(s, P) : Infinity, g = grounded(P);
    const free = P.dizzy <= 0 && !st.res;
    // which lanes the lantern would swallow for a star thrown now (it reaches the middle after this long)
    const blocked = [false, false];
    if (st.course.lantern) {
      const ta = SD.release + Math.abs(SD.mid - P.x - DIR[id] * 26) / (SD.v0 * st.course.fast), h = lanH(st, ta);
      blocked[0] = lanBlocks(h, 0); blocked[1] = lanBlocks(h, 1);
    }
    return {
      star: s, lane: s ? s.lane : -1, tti: t, win: s ? winFor(P, s) : P.win,
      inZone: !!s && t <= SD.zone, inWin: !!s && t <= winFor(P, s),
      need: !s ? null : s.lane === 0 ? 'duck' : 'hop',
      grounded: g, free, canAct: free && P.lock <= 0 && P.throwT <= 0,
      canThrow: free && P.lock <= 0 && P.throwT <= 0 && P.thrCd <= 0 && P.pouch > 0,
      pouch: P.pouch, lowStance: P.duck, blocked,
    };
  }

  MODES.starduel = {
    plan,
    setup(st, L) {
      for (const row of L.grid) row.fill('.');
      st.stat = { wins: [0, 0], bonks: [0, 0], deflects: [0, 0], perfects: [0, 0], dodges: [0, 0], whiffs: [0, 0], throws: [0, 0], rally: 0, pafs: 0 };
      st.stats = { helps: 0 };   // (K.goldHelp counts into st.stats.helps)
      st.forceRound = this.testRound != null ? this.testRound : null;
      st.noHelp = !!this.testNoHelp;
      st.t = 0; st.rt = 0; st.roundDef = [0, 0];
      K.fx(st);
    },
    resetRound(n, info) {
      const st = G.mst;
      newRound(st, n, info);
      st.roundDef = [0, 0];
      G.particles.length = 0;
      mirror(st);
    },
    go() {
      const st = G.mst;
      st.rt = 0; st.gongT = 1; Sfx.play('ninjaGong');
      const g = st.pl.filter(P => P.gold);
      if (g.length) {
        const P = g[0];
        K.goldHelp(st, g.length === 2 ? 'Gold swords: easier deflects for both!' : P.gold >= 2 ? 'Gold sword and gold pouch for ' + NAMES[P.k] + '!' : 'Gold sword for ' + NAMES[P.k] + ': easier deflects!');
      } else if (st.need === 1) K.msg(st, 'Sudden death: the first bonk wins!', '#ffffff', 3.5);
      else if (st.course.lantern && !st.saidLan) { st.saidLan = true; K.msg(st, 'The lantern swallows stars: throw past it!', '#ffffff', 4); }
    },
    step(dt) { tick(G.mst, dt, true); },
    idle(dt) {
      const st = G.mst; if (!st.pl) return;
      tick(st, dt, false);
    },
    timeUp() {
      const st = G.mst, [A, B] = st.pl;
      let w = A.bonks !== B.bonks ? (A.bonks < B.bonks ? 0 : 1) : -1, reason = 'Time! Fewer bonks!';
      if (w < 0 && st.roundDef[0] !== st.roundDef[1]) { w = st.roundDef[0] > st.roundDef[1] ? 0 : 1; reason = 'Time! More deflects!'; }
      endRound(st, w);
      return { winner: w, reason: w < 0 ? 'Time! Dead even!' : reason };
    },
    tiebreak() {
      const s = G.mst.stat;
      if (s.bonks[0] !== s.bonks[1]) return { winner: s.bonks[0] > s.bonks[1] ? 0 : 1, reason: 'More bonks landed this match!' };
      if (s.deflects[0] !== s.deflects[1]) return { winner: s.deflects[0] > s.deflects[1] ? 0 : 1, reason: 'More deflects this match!' };
      return -1;
    },
    draw() { const st = G.mst; if (!st.pl) return; drawWorld(st); K.hide(st); },
    drawTop() { const st = G.mst; K.unhide(st); if (st.pl) drawTop(st); },
    hud() { const st = G.mst; if (st.pl && G.match) hud(st); },
    stats() {
      const st = G.mst, s = st.stat;
      if (!s) return [];
      const out = [
        { label: 'Rounds won', values: (G.match ? G.match.wins : s.wins).slice() },
        { label: 'Bonks landed', values: s.bonks.slice() },
        { label: 'Deflects', values: s.deflects.slice() },
        { label: 'Perfect deflects', values: s.perfects.slice() },
      ];
      const d = s.deflects;
      if (s.rally >= 2) out.push('★ Longest rally: one star batted back ' + s.rally + ' times in a row!');
      else out.push(d[0] === d[1] ? '★ Quick ducks and high hops: ' + (s.dodges[0] + s.dodges[1]) + ' stars dodged!' : '★ Sharpest sword: ' + NAMES[d[0] > d[1] ? 0 : 1] + ' (' + Math.max(d[0], d[1]) + ' deflects)');
      const hl = K.helpLine(st.stats ? st.stats.helps : 0);
      if (hl) out.push(hl);
      return out;
    },
    test: { SD, ROUNDS, lanH, tti, threat },
  };

  /* ---------- drawing ---------- */
  const lifeX = (k, n) => (k ? W - 236 - n * 46 : 236 + n * 46);
  function drawWorld(st) {
    const t = G.clock, F = SD.floor;
    K.dojo(t, { floor: F });
    // each duelist's three lanterns on the beam: one goes out with every bonk
    for (const P of st.pl) for (let n = 0; n < st.need; n++) {
      const on = n < st.need - P.bonks;
      K.lantern(lifeX(P.k, n), 78, t, { s: 1.15, col: P.k ? '#5b95ff' : '#ff9a3d', off: !on, sway: 0.6 });
    }
    // the gong at the back
    K.gong(SD.mid, F - 74, 26, { hit: st.gongT, ground: F - 18 });
    // the middle mat: nobody steps past it
    ctx.fillStyle = 'rgba(200,71,74,0.5)'; ctx.fillRect(SD.mid - 82, F + 6, 164, 5);
    ctx.fillStyle = 'rgba(28,26,54,0.16)'; ctx.fillRect(SD.mid - 82, F + 11, 164, H - F);
    for (const k of [0, 1]) { ctx.fillStyle = k ? 'rgba(91,149,255,0.13)' : 'rgba(255,154,61,0.13)'; ctx.fillRect(k ? SD.mid + 82 : 0, F + 6, W / 2 - 82, 5); }
  }
  function drawLantern(st) {
    if (!st.course.lantern) return;
    const t = G.clock, F = SD.floor, s = 1.35 * Z, h = lanH(st), jx = Math.sin(t * 40) * 4 * st.lanJig;
    const cy = F - h, top = cy - 21 * s;
    K.rope(SD.mid, 96, SD.mid + jx, top, 0, { w: 2.5 });
    K.lantern(SD.mid + jx, top, t, { s, col: '#63d6a4', sway: 0.25 + st.lanJig * 2 });   // jade: neither side's colour, and not gold
    // the lane it is in right now, marked on the lantern's sides
    for (const lane of [0, 1]) if (lanBlocks(h, lane)) {
      const y = F - SD.laneY[lane];
      ctx.strokeStyle = 'rgba(255,236,170,0.75)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(SD.mid + d * 24, y - 7); ctx.lineTo(SD.mid + d * 30, y); ctx.lineTo(SD.mid + d * 24, y + 7); ctx.stroke(); }
    }
  }
  function drawDuelist(st, P) {
    const t = G.clock, F = SD.floor, id = P.k, f = DIR[id], x = P.x, y = F - P.h, s = SD.S;
    // shadow
    ctx.fillStyle = 'rgba(14,16,40,0.3)'; ctx.beginPath(); ctx.ellipse(x, F + 2, 26 - Math.min(10, P.h * 0.2), 5.5, 0, 0, Math.PI * 2); ctx.fill();
    const won = st.res && st.res.winner === id;
    const alpha = P.inv > 0 && P.dizzy <= 0 && !st.res ? 0.55 + 0.35 * Math.sin(t * 30) : 1;
    const flip = a => (f > 0 ? a : Math.PI - a);
    if (won) { K.ninja(id, x, y, { pose: 'cheer', face: f, s }); return; }
    if (P.dizzy > 0 || (st.res && st.res.winner === 1 - id)) {
      K.ninja(id, x, y, { pose: 'dizzy', face: f, s });
      for (let n = 0; n < 3; n++) { const a = t * 5 + n * 2.1; ctx.fillStyle = n % 2 ? '#fff3a0' : '#ffffff'; K.star(x + Math.cos(a) * 30, y - 66 + Math.sin(a) * 9, 7.5, 3.2, a); ctx.fill(); }
      return;
    }
    if (P.swing) {
      const u = clamp(P.swing.t / (SD.swingT * 0.6), 0, 1), e = K.smooth(u), fade = clamp(1 - (P.swing.t - SD.swingT * 0.5) / (SD.swingT * 0.5 + 0.06), 0, 1);
      if (P.swing.low) {
        K.ninja(id, x, y, { pose: 'sneak', face: f, s, alpha });
        const hx = x + f * 21 * Z, hy = y - 13 * Z, a = K.lerp(-1.5, 0.55, e);
        K.sword(hx, hy, flip(a), 38 * Z, { id, glint: P.glint });
        K.slash(hx, hy, 44 * Z, flip(-1.5), flip(a), 0.75 * fade, P.swing.ok ? '#ffffff' : 'rgba(255,255,255,0.6)');
      } else {
        const a = K.lerp(-2.25, 0.3, e);
        const hd = K.ninja(id, x, y, { pose: 'sword', face: f, s, alpha, aim: flip(a), glint: P.glint });
        K.slash(hd.x, hd.y, 50 * Z, flip(-2.25), flip(a), 0.75 * fade, P.swing.ok ? '#ffffff' : 'rgba(255,255,255,0.6)');
      }
      return;
    }
    if (P.throwT > 0) {
      K.ninja(id, x, y, { pose: P.lowThrow ? 'sneak' : 'throw', face: f, s, alpha, item: P.released ? undefined : 'star', rot: P.lowThrow ? 0 : f * 0.1 });
      if (P.lowThrow && P.released) { ctx.fillStyle = PCOL[id]; ctx.strokeStyle = PDARK[id]; ctx.lineWidth = 2; circle(x + f * 26 * Z, y - 12 * Z, 6); ctx.fill(); ctx.stroke(); }
      return;
    }
    if (P.duckA > 0.5) {
      K.ninja(id, x, y, { pose: 'sneak', face: f, s, alpha, t: P.moving ? t : 0 });
      K.sword(x + f * 21 * Z, y - 13 * Z, flip(-0.55), 38 * Z, { id });
      ctx.fillStyle = PCOL[id]; ctx.strokeStyle = PDARK[id]; ctx.lineWidth = 2; circle(x + f * 21 * Z, y - 13 * Z, 6); ctx.fill(); ctx.stroke();
      return;
    }
    const bob = P.moving ? Math.abs(Math.sin(P.walk)) * 3 : 0;
    K.ninja(id, x, y - bob, { pose: 'sword', face: f, s, alpha, vy: P.h > 0 ? -P.vy : 0, wind: P.moving || P.h > 0 ? 0.8 : 0.35, aim: flip(-1.15 + (P.whiff > 0 ? 1.2 : 0) + Math.sin(t * 2.4 + id) * 0.05) });
  }
  function drawStars(st) {
    const F = SD.floor;
    for (const s of st.stars) {
      const y = F - SD.laneY[s.lane], T = st.pl[s.dir > 0 ? 1 : 0];
      // a soft shadow on the mats, so high and low are easy to tell apart
      ctx.fillStyle = 'rgba(14,16,40,0.25)'; ctx.beginPath(); ctx.ellipse(s.x, F + 3, s.lane ? 9 : 6, s.lane ? 3 : 2, 0, 0, Math.PI * 2); ctx.fill();
      if (s.bounces >= 2) { ctx.fillStyle = 'rgba(191,232,255,0.3)'; circle(s.x, y, SD.starR + 7); ctx.fill(); }
      K.shuriken(s.x, y, SD.starR + (s.bounces ? 1 : 0), s.spin, { id: s.owner, trail: s.dir > 0 ? 0 : Math.PI });
      // "swing now": a white ring while it is inside the window of the duelist it flies at
      if (!s.passed && T.dizzy <= 0 && tti(s, T) <= winFor(T, s) && (T.x - s.x) * s.dir > 0) {
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; circle(s.x, y, SD.starR + 6 + Math.sin(G.clock * 40) * 1.5); ctx.stroke();
      }
    }
  }
  function drawTop(st) {
    drawLantern(st);
    // the far duelist's stars are behind nobody: stars, then the ninjas, then sparks and words
    for (const P of st.pl) drawDuelist(st, P);
    drawStars(st);
    K.drawParts(st, 0);
    K.drawPops(st, 0, 0);
  }

  /* ---------- HUD ---------- */
  function keysLine(id) {
    const how = actKey(id);
    if (how === 'pad') return glyph('act') + ' throw / swing · ' + glyph('a') + ' hop · ▼ duck';
    if (how === 'touch') return '● throw / swing · ▲ hop · ▼ duck';
    return id === 0 ? 'F throw / swing · W hop · S duck' : '/ throw / swing · ↑ hop · ↓ duck';
  }
  function hud(st) {
    const m = G.match, big = hudBig(), z = big ? 1.35 : 1, F = SD.floor, live = m.phase === 'live';
    // the round's name, under the level pill
    {
      const fs = big ? 17 : 13, h = big ? 32 : 26, lab = st.need === 1 ? 'Sudden death' : st.course.name;
      ctx.font = K.FONT(fs);
      const w = ctx.measureText(lab).width + (big ? 34 : 28);
      pill(14, 46, w, h); text(lab, 14 + (big ? 17 : 14), 46 + h / 2 + 0.5, fs, '#ffe7a8', 'left', 'body');
    }
    // the message line (gold help, the lantern rule) under the round clock
    if (st.msg) {
      const mm = st.msg, fs = big ? 19 : 14, h = big ? 32 : 26, y = big ? 96 : 78, str = mm.gold ? '★ ' + mm.text : mm.text;
      ctx.font = K.FONT(fs);
      const w = ctx.measureText(str).width + 30;
      ctx.globalAlpha = clamp((mm.life - mm.t) / 0.3, 0, 1);
      const px = pill(W / 2, y, w, h, 'center');
      if (mm.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(px, y, w, h, h / 2); ctx.stroke(); }
      text(str, W / 2, y + h / 2 + 0.5, fs, mm.col, 'center', 'body');
      ctx.globalAlpha = 1;
    }
    // each duelist's panel: name, the pouch, and one line about right now
    for (const P of st.pl) {
      const id = P.k, left = id === 0, pw = Math.round(250 * z), ph = Math.round(46 * z), y = H - ph - 8, x = left ? 10 : W - 10 - pw;
      const pl = plan(st, id);
      ctx.fillStyle = 'rgba(20,22,52,0.88)'; rr(x, y, pw, ph, ph / 2); ctx.fill();
      ctx.strokeStyle = P.gold ? C.gold : PCOL[id]; ctx.lineWidth = 2.5; rr(x, y, pw, ph, ph / 2); ctx.stroke();
      const nx = left ? x + 18 * z : x + pw - 18 * z;
      text(NAMES[id], nx, y + ph / 2 + 0.5, 19 * z, PCOL[id], left ? 'left' : 'right');
      // the pouch: a star per throw you have, the next one filling in
      const sx0 = left ? x + 64 * z : x + pw - 64 * z, sy = y + ph * 0.34, gap = 21 * z;
      for (let n = 0; n < P.cap; n++) {
        const sx = sx0 + (left ? 1 : -1) * n * gap, have = n < P.pouch;
        if (have) K.shuriken(sx, sy, 7.5 * z, 0.4, { id });
        else {
          ctx.globalAlpha = 0.28; K.shuriken(sx, sy, 7.5 * z, 0.4, { col: '#8a86b0' }); ctx.globalAlpha = 1;
          if (n === P.pouch && P.refT > 0) { ctx.strokeStyle = P.gold >= 2 ? C.gold : '#ffffff'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(sx, sy, 9.5 * z, -Math.PI / 2, -Math.PI / 2 + P.refT / P.refill * Math.PI * 2); ctx.stroke(); }
        }
      }
      let lab = 'En garde!', col = 'rgba(246,239,223,0.85)';
      if (!live && !st.res) lab = 'Ready...';
      else if (st.res) lab = st.res.winner === id ? 'Winner!' : st.res.winner < 0 ? 'Dead even!' : 'Good duel!';
      else if (P.dizzy > 0) { lab = 'Bonked! Dizzy...'; col = '#ffd9d0'; }
      else if (P.whiff > 0) { lab = 'Whiff! Wait...'; col = '#ffd9d0'; }
      else if (pl.star && pl.tti < 1.2) { lab = pl.lane ? 'Low star!' : 'High star!'; col = '#ffffff'; }
      else if (P.duck && P.duckT > 1 && P.pouch < P.cap) { lab = 'Stand up to refill!'; col = '#d9d3ef'; }
      else if (P.pouch <= 0) { lab = 'Pouch is empty...'; col = '#d9d3ef'; }
      else if (P.gold) { lab = P.gold >= 2 ? 'Gold sword + pouch' : 'Gold sword'; col = C.gold; }
      else if (pl.blocked[0] || pl.blocked[1]) { lab = pl.blocked[0] && pl.blocked[1] ? 'Lantern in the way' : pl.blocked[0] ? 'Lantern high: go low' : 'Lantern low: go high'; col = '#ffe7a8'; }
      const lx = left ? x + 55 * z : x + pw - 55 * z;
      text(lab + (K.quiet(id) && lab === 'En garde!' ? ' (computer)' : ''), lx, y + ph * 0.74, 11.5 * z, col, left ? 'left' : 'right', 'body');
      // bonks taken, as dots at the panel's far end (the wall lanterns show the same)
      for (let n = 0; n < st.need; n++) {
        const bx = (left ? x + pw - 20 * z - n * 15 * z : x + 20 * z + n * 15 * z), by = y + ph * 0.34, on = n < st.need - P.bonks;
        ctx.fillStyle = on ? (id ? '#5b95ff' : '#ff9a3d') : 'rgba(255,255,255,0.16)'; ctx.beginPath(); ctx.ellipse(bx, by, 5 * z, 6.2 * z, 0, 0, Math.PI * 2); ctx.fill();
        if (on) { ctx.fillStyle = 'rgba(255,236,170,0.8)'; ctx.beginPath(); ctx.ellipse(bx, by + 0.5 * z, 2.2 * z, 3.4 * z, 0, 0, Math.PI * 2); ctx.fill(); }
      }
      // each person's keys early in rounds 1 and 2
      if (live && st.round <= 2 && st.rt < 8 && !K.quiet(id)) {
        const str = keysLine(id), fs = 12 * z, cxp = left ? x + pw / 2 : x + pw / 2, yy = y - 16 * z;
        ctx.font = K.FONT(fs);
        const w = ctx.measureText(str).width + 22, bx = clamp(cxp - w / 2, 8, W - w - 8);
        ctx.fillStyle = 'rgba(20,22,52,0.88)'; rr(bx, yy - 12 * z, w, 24 * z, 12 * z); ctx.fill();
        text(str, bx + w / 2, yy + 0.5, fs, PCOL[id], 'center', 'body');
      }
    }
    // prompts over a learner's head: rounds 1 and 2, and anyone with gold help
    if (live && !st.res) {
      const Pr = K.prompter(st);
      for (const P of st.pl) {
        if (!(st.round <= 2 || P.gold) || P.dizzy > 0) continue;
        const pl = plan(st, P.k), y = F - P.h - 62 * Z;
        if (pl.star && pl.tti < 0.95) {
          if (pl.inWin && pl.grounded && pl.canAct && (pl.lane === 1) === pl.lowStance) Pr.say(P.k, K.key(P.k, 'act') + ' swing!', P.x, y, '#ffffff', true);
          else Pr.say(P.k, pl.lane ? K.key(P.k, 'up') + ' hop!' : K.key(P.k, 'down') + ' duck!', P.x, y, pl.lane ? '#9fe8ff' : '#ffe7a8', true);
        } else if (st.round === 1 && st.rt > 8 && st.stat.throws[P.k] === 0 && P.pouch > 0) Pr.say(P.k, K.key(P.k, 'act') + ' throw a star!', P.x, y, '#ffffff', false);
      }
    }
  }

  /* ---------- sounds ---------- */
  Sfx.extra.starduelRefill = function (id) { this.tone(id ? 880 : 990, 0.04, 'triangle', 0.018, id ? 1100 : 1240); };
  Sfx.extra.starduelHop = function (id) { this.tone(id ? 300 : 340, 0.12, 'sine', 0.035, id ? 520 : 600); };
  Sfx.extra.starduelWhiff = function () { this.tone(520, 0.16, 'sawtooth', 0.018, 180); };
  Sfx.extra.starduelEmpty = function () { this.tone(180, 0.05, 'square', 0.025, 150); };
  Sfx.extra.starduelPaf = function () { this.tone(240, 0.12, 'triangle', 0.05, 110); this.tone(900, 0.08, 'sine', 0.015, 400, 0.02); };
  Sfx.extra.starduelTok = function () { this.tone(150, 0.05, 'triangle', 0.03, 100); };
  Sfx.extra.starduelPerfect = function () { [1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.03, null, 0.04 + i * 0.05)); };

  /* ---------- the level ---------- */
  NINJA.defs.starduel = {
    name: 'Throwing Star Duel', world: 28, kind: 'versus', mode: 'starduel', ownStep: true,
    match: { bestOf: 5, roundTime: SD.roundTime },
    act: { label: 'throw' },
    tagLift: 30,
    legend: {
      pip: '<kbd>A</kbd><kbd>D</kbd> step <kbd>W</kbd> hop <kbd>S</kbd> duck',
      bo: '<kbd>←</kbd><kbd>→</kbd> step <kbd>↑</kbd> hop <kbd>↓</kbd> duck',
      pad: 'stick steps and ducks, <span data-glyph="a"></span> hops,',
    },
    tip: 'Throw foam stars! Duck ▼ high ones, hop ▲ low ones, or swing at the last moment to bat one back. 3 bonks wins.',
    switches: {}, signs: [],
    map: K.stubMap(),
  };
})();
