/* Pip & Bo - Level 6-2 Tug of War (versus). */
'use strict';

/* ===== 6-2 Tug of War (mode 'tug', versus, World 6 Backyard Bash) =====
   A rope over a mud puddle and a frog with a drum. Every pull press tugs the rope a little (mash); a press on the drum's
   BOOM is a big heave, and Perfects in a row pull harder (the beat track in the sky shows when). The beat speeds up and
   its windows tighten through each round, and each round starts a bit faster. Big drum: your next 3 BOOMs are yours
   (any press in the window is a double Perfect) and the other one gets no heave on them. Jump = let go of the rope (to grab a goodie from the sky); pull at your rope end = grab it again.
   Whoever's toes are pulled into the mud loses the round. Best of 5, 60 s round clock (the mud spreads from 20 s).
   Spec: w6/tug/SPEC.md + the orchestrator's mash override (every press is a real tug, see TUG.tug / postTug). */
const TUG = {
  half: 180, body: 14, floorY: 420, mid: 480,          // hands at mid + ro -/+ half (y floorY - 12); body centre `body` px behind
  mud0: 60, spreadAt: 20, spreadV: 3.2, mudMax: 183,   // mud half-width; it spreads from spreadAt s (px/s per side) until it reaches both
                                                       //   players' toes (lim 0 at 58.4 s): even two mashers can't stall a round
  // THE BEAT (Gavyn, Nov 2026: the rhythm is the real strength, and it speeds up and tightens as the round goes on)
  // drum period P0 -> P1 over Pramp s of round time; every round starts roundStep s faster (never past P1); first BOOM 0.8 s after GO.
  // The windows follow the tempo: at P0 they are the "0" values, at P1 the "1" values (linear in the period in between).
  P0: 0.85, P1: 0.50, Pramp: 45, roundStep: 0.04, firstBeat: 0.8,
  winE0: 0.25, winL0: 0.20, perfect0: 0.075, good0: 0.16,   // heave window [beat - winE, beat + winL]; grade half-widths (slow beat)
  winE1: 0.16, winL1: 0.13, perfect1: 0.045, good1: 0.10,   //   ... and at the fastest beat
  hP: 22, hG: 12, hW: 1.5,                             // heave px: Perfect, Good, Too early / Late (= a tug: mashing into the beat isn't punished)
  streakStep: 3, streakMax: 12,                        // Perfects in a row: each one after the first pulls streakStep px more (up to +streakMax)
  // MASH (orchestrator override: mashing is a real force): every press tugs `tug` px. Hand over hand: a press sooner than
  // tugCap after your last one pulls (dt / tugCap) ^ tugGamma of that, so 9 presses/s pull ~35 % more than 5/s (not 80 %).
  // mashMin: the mash ceiling: presses closer together than mashMin pull pro rata, so pull per second stops growing past
  // 1 / mashMin = 10 presses/s (a turbo button or two-finger drumming gains nothing over a fast thumb).
  // postTug: presses after your heave in the same window tug too.
  // DIG IN (the last stand, within digGap px of your mud): tugs pull x digTug with a linear share min(1, dt / digCap),
  // so the dug-in pull plateaus at 3.5 x 2 / 0.25 = 28 px/s from 4 presses/s up: a kid's 4.5 presses/s pulls as hard
  // as an adult's 10 or a turbo button (outside a last stand a fast thumb still pulls more, up to the 10/s ceiling).
  // digBase: the multiplier zone is the base digGap for both players (Big boots' wider zone gives only the Good heaves),
  // so two equal mashers don't see-saw on the boots when the mud closes in. digMash false: a dug-in early/late press in
  // the window counts Good unless it is part of a fast mash (closer than digMashGap to your last press: > ~6 presses/s).
  // (digLinear false, digTugHelp > 0 and digBase false were measured too and rejected: turbo mashers / a Big-boots see-saw.)
  // (Nov 2026 rebalance: tug 3.5 -> 1.5, so a fast mash is ~11 px/s and a Perfect on every BOOM is ~30-60 px/s:
  // all Perfects beats any amount of mashing, and mashing still helps between beats)
  tug: 1.5, tugCap: 0.2, tugGamma: 0.5, mashMin: 0.1, postTug: true,
  digTug: 2.0, digCap: 0.25, digLinear: true, digBase: true, digTugHelp: 0, digMash: true, digMashGap: 0.17,
  tau: 0.10, freeMul: 0.75,                            // rope speed decay (a pull of D px moves the rope ~D px); pulls on a rope nobody holds
  crateFirst: 5, crateEvery: 7, crateGap: 1.5,         // goodies: first at 5 s, then every 7 s (never sooner than 1.5 s after the last one is gone)
  crateY0: 100, crateVy: 120, crateR: 12, swayA: 28, swayW: 2.2, crateBias: 45, crateFloat: 3,
  spinMul: 1.6, spinT: 5, tickleT: 3.5, drumN: 3, drumMul: 2,   // Big drum: the next drumN BOOMs are yours (see heave / press)
  digGap: 40, digActive: 3, helpMax: 2, helpDig: 25,   // Dig in: gap < digGap + helpDig * help; auto-heave needs a press in the last digActive s
  grabR: 26, mudRun: 0.55, slipT: 0.2, comeback: 10, earlyGap: 2,
  twists: ['classic', 'party', 'bigmud', 'tickle', 'classic'],
  tw: {
    classic: {},
    party: { crateFirst: 3, crateEvery: 3.5 },
    bigmud: { mud0: 90, spreadAt: 15 },
    tickle: { crateFirst: 3, crateEvery: 3.5, only: 'feather' },
    sudden: { mud0: 140, spreadAt: 10 },
  },
};
const TUG_TYPES = ['spinach', 'feather', 'drum'];
const TUG_CARDS = {
  classic: ['Classic', 'Pull when your note hits the drum! Perfects in a row pull harder!'],
  party: ['Crate Party!', 'Lots of goodies: jump off and grab them!'],
  bigmud: ['Big Mud!', 'The mud is big: every pull counts!'],
  tickle: ['Tickle Fight!', 'Only feathers! Grab one to tickle the other!'],
  sudden: ['Sudden Mud!', 'One good heave wins it!'],
};
const TUG_MUD = '#7a4f2a', TUG_MUD_HI = '#94643a';
// fans on the bench below the field: [x, animal]; Pip's fans wear orange scarves (left), Bo's blue (right)
const TUG_FANS = [[64, 'bunny', 0], [146, 'duck', 0], [228, 'bear', 0], [732, 'cat', 1], [814, 'pig', 1], [896, 'sheep', 1]];
const tugLim = st => TUG.half + TUG.body - PW / 2 - st.mud;                       // |ro| at which the loser's toes touch the mud
const tugHand = (st, k) => TUG.mid + st.ro + (k === 0 ? -TUG.half : TUG.half);    // hand x
const tugBodyX = (st, k) => tugHand(st, k) + (k === 0 ? -TUG.body : TUG.body);    // body centre x while holding
const tugGap = (st, k) => tugLim(st) - (k === 0 ? st.ro : -st.ro);               // px left before k's toes are in the mud
const tugPer = (K, t) => K.P0 + (K.P1 - K.P0) * Math.min(1, t / K.Pramp);   // (K.P0 is this round's start: TUG.P0 - roundStep x round)
// the beat at time tb: its windows from how fast the drum is going (u 0 at TUG.P0, 1 at TUG.P1)
function tugWin(K, b) {
  const u = clamp((TUG.P0 - tugPer(K, b.next)) / (TUG.P0 - TUG.P1), 0, 1), L = (a, c) => a + (c - a) * u;
  b.wE = L(K.winE0, K.winE1); b.wL = L(K.winL0, K.winL1); b.wP = L(K.perfect0, K.perfect1); b.wG = L(K.good0, K.good1); b.u = u;
}
// the let-go hint with the player's real keys: push toward the middle and jump (the anti-slip guard ignores a plain jump mid-mash)
function tugLetGoKeys(k) {
  const how = actKey(k), dir = k === 0 ? '▶' : '◀';
  return (how === 'pad' ? dir + ' + ' + glyph('a') : how === 'touch' ? dir + ' + ▲' : k === 0 ? 'D + W' : '← + ↑') + ' to let go!';
}
// a floating text pop; slot: a pop with the same slot replaces the old one (one grade pop per player at a time)
function tugPop(st, x, y, str, col, size, life, slot) {
  if (slot) st.pops = st.pops.filter(q => q.slot !== slot);
  st.pops.push({ x, y, str, col, size, t: 0, life, slot, rise: 30 });
}

MODES.tug = {
  rand: Math.random,
  K: TUG,
  testTwist: null, testHelp: null,
  setup(st) {
    st.stats = { perfect: [0, 0], tugs: [0, 0], goodies: [0, 0], streak: [0, 0], heaves: [0, 0], close: null };
  },
  resetRound(n, info) {
    const st = G.mst;
    st.twist = this.testTwist || (info.suddenDeath ? 'sudden' : TUG.twists[(n - 1) % TUG.twists.length]);
    const K = st.K = Object.assign({}, TUG, TUG.tw[st.twist] || {});
    K.P0 = Math.max(TUG.P1 + 0.1, TUG.P0 - TUG.roundStep * (Math.min(n, 6) - 1));   // every round's beat starts a bit faster
    st.help = this.testHelp ? this.testHelp.slice() : [0, 1].map(k => clamp(info.wins[1 - k] - info.wins[k], 0, K.helpMax));
    st.t = 0; st.ro = 0; st.rv = 0; st.mud = K.mud0; st.spreading = false;
    st.beat = { next: K.firstBeat, id: 0, drum: -1, half: -1, hitT: 9 };
    tugWin(K, st.beat); st.faster = Math.floor(st.beat.u * 3);
    st.hitFx = [null, null]; st.denyPop = [-1, -1];                      // the beat track: the last graded press per player
    st.hold = [true, true]; st.used = [-1, -1]; st.last = [-9, -9]; st.anyPress = [-99, -99]; st.earlyT = [-99, -99];
    st.run = [0, 0]; st.spin = [0, 0]; st.tickle = [0, 0]; st.tickleBuzz = [0, 0]; st.drum = [0, 0];
    st.crate = null; st.crateNext = K.crateFirst; st.lastType = null;
    st.pops = []; st.leadT = [0, 0]; st.minGap = [999, 999]; st.lastBig = null;
    st.dugPop = [false, false]; st.dust = [0, 0]; st.splash = null; st.muddy = -1;
    st.slipAt = [-99, -99]; st.slipHint = [false, false]; st.reachAt = [-99, -99];   // the let-go hint and the out-of-reach feedback
    // cosmetic timers (never read by the rules)
    st.fx = { mitt: [9, 9], twang: 9, swing: 0, swingV: 0, feather: null, hee: [0, 0], cheer: [0, 0], blink: 2, blinkT: 0, idleT: 0, reach: [9, 9] };
    for (const k of [0, 1]) this.snap(k);
  },
  snap(k) {
    const st = G.mst, p = G.players[k];
    p.x = tugBodyX(st, k) - p.w / 2; p.vx = 0; p.face = k === 0 ? 1 : -1;
  },
  // the other player has Big drum beats left (and holds the rope): this BOOM is theirs, k gets no heave on it
  denied(k) { const st = G.mst; return st.drum[1 - k] > 0 && st.hold[1 - k] && st.drum[k] <= 0; },
  digging(k) { const st = G.mst, K = st.K; return st.hold[k] && tugGap(st, k) < K.digGap + K.helpDig * st.help[k]; },
  // ---- before the players move: the beat, presses, let go / re-grab ----
  pre(dt) {
    const st = G.mst, K = st.K, b = st.beat;
    st.t += dt;
    this.age(dt);
    while (st.t > b.next + b.wL) {
      for (const k of [0, 1]) {
        if (st.used[k] === b.id) continue;
        // Dig in: a holder close to their mud who let this beat go by heaves Good by itself (if they pressed pull lately)
        if (st.tickle[k] <= 0 && !this.denied(k) && this.digging(k) && st.t - st.anyPress[k] < K.digActive) this.heave(k, 'G', false, true);
        else if (!this.denied(k)) st.run[k] = 0;                           // a BOOM let go by ends the Perfect streak
      }
      for (const k of [0, 1]) if (st.drum[k] > 0 && st.hold[k]) st.drum[k]--;   // each BOOM held through uses one Big drum beat
      b.next += tugPer(K, b.next); b.id++; tugWin(K, b);
      const fz = Math.floor(b.u * 3);
      if (fz > st.faster) { st.faster = fz; tugPop(st, TUG.mid, 240, 'Faster!', C.gold, 18, 1.1, 'faster'); Sfx.play('tugFaster'); }
    }
    if (st.t >= b.next && b.drum !== b.id) { b.drum = b.id; b.hitT = 0; Sfx.play('tugDrum'); }
    const per = tugPer(K, b.next);
    if (st.t >= b.next - per / 2 && st.t < b.next - b.wE && b.half !== b.id) { b.half = b.id; Sfx.play('tugTock'); }
    for (const p of G.players) {
      const k = p.id;
      if (st.hold[k]) st.spin[k] = Math.max(0, st.spin[k] - dt);          // spinach only wears off while you hold the rope
      if (st.tickle[k] > 0) {
        st.tickle[k] = Math.max(0, st.tickle[k] - dt);
        st.tickleBuzz[k] -= dt;
        if (st.tickleBuzz[k] <= 0 && st.tickle[k] > 0.3) { st.tickleBuzz[k] = 0.6; rumble(k, 0, 0.4, 300); }
        if (!st.hold[k]) { p.pendingJump = false; p.jumpBuf = 0; p.input.left = p.input.right = p.input.jump = false; }   // giggling on the spot
      }
      if (st.hold[k] && p.pendingJump) {
        const toMid = k === 0 ? p.input.right : p.input.left;
        const slip = (st.t - st.anyPress[k] < K.slipT || p.input.act) && !toMid;     // a thumb rolling off pull onto jump
        if (st.tickle[k] > 0 || slip) {
          p.pendingJump = false; p.jumpBuf = 0;
          // the guard ate a 2nd jump within 1.5 s: they really want off, so say how (once per round, their real keys)
          if (slip && st.tickle[k] <= 0) {
            if (st.t - st.slipAt[k] < 1.5 && !st.slipHint[k]) { st.slipHint[k] = true; tugPop(st, p.x + p.w / 2, p.y - 42, tugLetGoKeys(k), C.paper, 14, 1.6, 'h' + k); }
            st.slipAt[k] = st.t;
          }
        }
        else { st.hold[k] = false; Sfx.play('tugLetGo', k); }               // jump = let go (the engine does the hop)
      }
      if (p.pendingAct) {
        p.pendingAct = false;                                              // consumed on every live tick (C1)
        if (st.tickle[k] > 0 || !p.alive) { /* giggling: nothing */ }
        else if (st.hold[k]) this.press(k);
        else if (Math.abs(p.x + p.w / 2 - tugBodyX(st, k)) <= K.grabR && p.y + p.h >= TUG.floorY - 40) {
          st.hold[k] = true; Sfx.play('tugGrab', k); rumble(k, 0.1, 0.3, 50);
          puff(tugHand(st, k), TUG.floorY - 12, 4, 'rgba(255,255,255,0.85)');
        } else if (st.t - st.reachAt[k] >= 0.5) {                          // out of reach: the rope end pulses, an arrow points to it (C1)
          st.reachAt[k] = st.t; st.fx.reach[k] = 0; Sfx.play('tugReach', k);
        }
        st.anyPress[k] = st.t;
      }
      if (st.hold[k]) p.vx = 0;
      else if (p.grounded && Math.abs(p.x + p.w / 2 - TUG.mid) < st.mud) p.vx = clamp(p.vx, -PHYS.maxRun * K.mudRun, PHYS.maxRun * K.mudRun);
    }
  },
  // a pull press while holding: the first press in a beat's window is the heave, every other press is a tug
  press(k) {
    const st = G.mst, K = st.K, b = st.beat, t = st.t;
    const since = t - st.last[k];
    // hand over hand: a press sooner than tugCap after the last one pulls less (tugGamma > 0) or not at all (tugGamma 0);
    // below mashMin it pulls pro rata (the mash ceiling: no gain past 10 presses/s)
    const shareOf = d => K.tugGamma > 0 ? Math.pow(Math.min(1, d / K.tugCap), K.tugGamma) : d >= K.tugCap ? 1 : 0;
    const share = since >= K.mashMin ? shareOf(since) : shareOf(K.mashMin) * Math.max(0, since) / K.mashMin;
    if (t >= b.next - b.wE && st.used[k] !== b.id && this.denied(k)) {
      // the other one's Big drum BOOM: no heave for k on it, the press is a plain tug (below)
      st.used[k] = b.id; st.hitFx[k] = { g: 'X', t: st.t, id: b.id };
      if (st.denyPop[k] !== b.id) { st.denyPop[k] = b.id; const p = G.players[k]; tugPop(st, p.x + p.w / 2, p.y - 12, 'Their drum!', '#ff9b9b', 14, 0.7, 'g' + k); }
    } else if (t >= b.next - b.wE && st.used[k] !== b.id) {
      st.used[k] = b.id; st.last[k] = t;
      const d = t - b.next, ad = Math.abs(d);
      let g = ad <= b.wP ? 'P' : ad <= b.wG ? 'G' : d < 0 ? 'E' : 'L', drum = false, dug = false;
      // dug in: a press in the window counts at least Good (not a press in the middle of a fast mash, unless digMash)
      if ((g === 'E' || g === 'L') && this.digging(k) && (K.digMash || since >= K.digMashGap)) { g = 'G'; dug = true; }
      if (st.drum[k] > 0) { g = 'P'; drum = true; }                      // Big drum: any press in the window is a double Perfect
      st.hitFx[k] = { g: drum ? 'D' : g, t: st.t, id: b.id, d };
      this.heave(k, g, drum, dug, (g === 'E' || g === 'L') && K.tugGamma > 0 ? share : 1);
      return;
    }
    if (t >= b.next - b.wE && !K.postTug) return;                        // (postTug off: the hands are busy until the window ends)
    if (share <= 0) return;
    st.last[k] = t;
    // dug in (base zone): x digTug on a linear share, so the pull plateaus at 4 presses/s (never less than a plain tug)
    const digMul = K.digTug + K.digTugHelp * st.help[k], dugT = K.digBase ? st.hold[k] && tugGap(st, k) < K.digGap : this.digging(k);
    const sh = dugT && K.digLinear ? Math.max(share, digMul * Math.min(1, Math.max(0, since) / K.digCap)) : dugT ? share * digMul : share;
    const D = K.tug * sh * (st.spin[k] > 0 ? K.spinMul : 1);
    this.pull(k, D);
    st.stats.tugs[k]++;
    st.fx.mitt[k] = 0;
    Sfx.play('tugTug', k);
    rumble(k, 0, 0.15, 25);
    puff(tugHand(st, k), TUG.floorY - 12, 2, 'rgba(255,255,255,0.8)');
  },
  // a heave: g = 'P' Perfect, 'G' Good, 'E' Too early, 'L' Late; gold = a Good that Dig in gave (auto-heave or an early press)
  heave(k, g, drum, gold, share = 1) {
    const st = G.mst, K = st.K, p = G.players[k], o = G.players[1 - k];
    if (g === 'P') { st.stats.perfect[k]++; st.run[k]++; st.stats.streak[k] = Math.max(st.stats.streak[k], st.run[k]); } else if (!gold) st.run[k] = 0;
    const bonus = g === 'P' ? Math.min(K.streakMax, K.streakStep * (st.run[k] - 1)) : 0;   // Perfects in a row pull harder
    const D = (g === 'P' ? K.hP + bonus : g === 'G' ? K.hG : K.hW * share) * (st.spin[k] > 0 ? K.spinMul : 1) * (drum ? K.drumMul : 1);
    this.pull(k, D);
    st.stats.heaves[k]++;
    if (D >= 20) st.lastBig = { k, t: st.t, why: drum ? 'drum' : st.spin[k] > 0 ? 'spin' : 'heave' };
    const hx = tugHand(st, k), hy = TUG.floorY - 12, px = p.x + p.w / 2;
    st.fx.mitt[k] = 0; st.fx.twang = 0; st.fx.swingV += (k === 0 ? -1 : 1) * Math.min(6, D * 0.25);
    if (drum) {
      tugPop(st, px, p.y - 12, 'BIG DRUM!', '#ff6b6b', 20, 0.8, 'g' + k);
      Sfx.play('tugBigDrum', k); burst(px, p.y - 36, '#ff6b6b', 8);
      if (!reduceMotion) G.shake = Math.max(G.shake, 0.12);
    } else if (g === 'P') {
      tugPop(st, px, p.y - 12, st.run[k] > 1 ? 'Perfect x' + st.run[k] + '!' : 'Perfect!', PCOL[k], 18, 0.7, 'g' + k); Sfx.play('tugPerfect', k);
    } else if (g === 'G') {
      tugPop(st, px, p.y - 12, 'Good!', gold ? C.gold : '#ffffff', 14, 0.7, 'g' + k); Sfx.play('tugGood', k);
    } else if (st.t - st.earlyT[k] >= K.earlyGap) {                       // no scolding of mashers: at most one pop + buzz per 2 s
      st.earlyT[k] = st.t;
      tugPop(st, px, p.y - 12, g === 'E' ? 'Too early!' : 'Late!', '#c9c3df', 14, 0.7, 'g' + k); Sfx.play('tugEarly', k);
    } else Sfx.play('tugTug', k);
    if (g === 'P') { rumble(k, 0.25, 0.5, 70); burst(hx, hy, PCOL[k], 6); p.sx = 0.92; p.sy = 1.08; st.fx.cheer[k] = Math.max(st.fx.cheer[k], 0.45); }
    else if (g === 'G') rumble(k, 0.1, 0.35, 50);
    else rumble(k, 0, 0.15, 25);
    if (D >= 10) { rumble(o.id, 0.3, 0.2, 60); if (st.hold[o.id]) { o.sx = 1.1; o.sy = 0.92; } }
  },
  pull(k, D) { const st = G.mst; st.rv += (k === 0 ? -1 : 1) * D * (st.hold[1 - k] ? 1 : st.K.freeMul) / TUG.tau; },
  // ---- after the players moved: rope, mud, crates, the loss check ----
  step(dt) {
    const st = G.mst, K = st.K;
    st.ro += st.rv * dt; st.rv *= Math.exp(-dt / TUG.tau);
    if (st.t > K.spreadAt) {
      if (!st.spreading) { st.spreading = true; Sfx.play('tugSpread'); }
      st.mud = Math.min(K.mudMax, K.mud0 + (st.t - K.spreadAt) * K.spreadV);
    }
    for (const p of G.players) {                                           // holders ride the rope; free players keep to their half
      const k = p.id;
      if (st.hold[k]) this.snap(k);
      else if (k === 0 && p.x + p.w > TUG.mid - 2) { p.x = TUG.mid - 2 - p.w; p.vx = Math.min(0, p.vx); }
      else if (k === 1 && p.x < TUG.mid + 2) { p.x = TUG.mid + 2; p.vx = Math.max(0, p.vx); }
    }
    this.crates(dt);
    if (st.ro < -2) st.leadT[0] += dt; else if (st.ro > 2) st.leadT[1] += dt;
    for (const k of [0, 1]) {
      if (tugLim(st) >= 30) st.minGap[k] = Math.min(st.minGap[k], tugGap(st, k));   // the squeeze (mud closing on both) is no comeback
      if (this.digging(k)) {
        const p = G.players[k];
        if (!st.dugPop[k]) {                                               // first Dig in of the round: a gold pop (C9)
          st.dugPop[k] = true;
          tugPop(st, p.x + p.w / 2, p.y - 42, 'Dig in!', C.gold, 16, 0.9, 'd' + k);
          Sfx.play('tugDig', k); rumble(k, 0.2, 0.4, 80);
        }
        st.dust[k] -= dt;
        if (st.dust[k] <= 0) { st.dust[k] = 0.15; puff(p.x + p.w / 2 + (k === 0 ? -8 : 8), TUG.floorY - 2, 2, C.gold); }
      }
    }
    const lim = tugLim(st);                                                // (when the mud has closed in, lim is 0: any lead decides)
    if (st.ro >= lim && st.ro > 0.25) this.end(0); else if (st.ro <= -lim && st.ro < -0.25) this.end(1);
  },
  crates(dt) {
    const st = G.mst, K = st.K, ps = G.players;
    let c = st.crate;
    if (!c && st.t >= st.crateNext) {
      const lead = clamp(st.ro / Math.max(1, tugLim(st)), -1, 1);          // > 0: Bo is ahead, so the crate leans to Pip's side
      const xc = TUG.mid - K.crateBias * lead, r = MODES.tug.rand(), ph = MODES.tug.rand() * Math.PI * 2;
      const type = K.only ? K.only : st.lastType ? TUG_TYPES.filter(x => x !== st.lastType)[Math.floor(r * 2)] : TUG_TYPES[Math.floor(r * 3)];
      c = st.crate = { xc, x: xc, y: K.crateY0, ph, t: 0, landed: false, lt: 0, type, born: st.t, sway: K.swayA, inMud: false };
      st.lastType = type;
      st.crateNext = st.t + K.crateEvery;
      Sfx.play('tugCrate');
    }
    if (!c) return;
    c.t += dt;
    if (!c.landed) {
      c.y += K.crateVy * dt;
      c.x = c.xc + c.sway * Math.sin(K.swayW * c.t + c.ph);
      if (c.y + K.crateR >= TUG.floorY) {
        c.y = TUG.floorY - K.crateR; c.landed = true; c.lt = 0; c.inMud = Math.abs(c.x - TUG.mid) < st.mud;
        if (c.inMud) { Sfx.play('tugPlop'); puff(c.x, TUG.floorY - 2, 6, 'rgba(122,79,42,0.9)'); } else Sfx.play('land');
      }
    } else {
      c.lt += dt;
      if (c.lt > K.crateFloat) {
        puff(c.x, c.y, 6, c.inMud ? 'rgba(122,79,42,0.85)' : 'rgba(255,255,255,0.85)');
        st.crate = null; st.crateNext = Math.max(st.crateNext, st.t + K.crateGap); return;
      }
    }
    const R = K.crateR, got = ps.filter(p => p.alive && rectHit(p, c.x - R, c.y - R, 2 * R, 2 * R));
    if (!got.length) return;
    let p = got[0];
    if (got.length === 2) { const g0 = tugGap(st, 0), g1 = tugGap(st, 1); p = g0 < g1 ? ps[0] : g1 < g0 ? ps[1] : ps[MODES.tug.rand() < 0.5 ? 0 : 1]; }
    this.collect(p, c);
    st.crate = null; st.crateNext = Math.max(st.crateNext, st.t + K.crateGap);
  },
  collect(p, c) {
    const st = G.mst, K = st.K, k = p.id, px = p.x + p.w / 2;
    st.stats.goodies[k]++;
    burst(c.x, c.y, '#ffffff', 10);
    Sfx.play('tugGet', k); rumble(k, 0.2, 0.5, 90);
    st.fx.cheer[k] = Math.max(st.fx.cheer[k], 0.8);
    if (c.type === 'spinach') { st.spin[k] = K.spinT; tugPop(st, px, p.y - 44, 'Spinach!', '#7be37b', 18, 1.0, 'i' + k); Sfx.play('tugSpinach', k); }
    else if (c.type === 'drum') { st.drum[k] = K.drumN; tugPop(st, px, p.y - 44, 'Big drum! Next 3 BOOMs are yours!', '#ff6b6b', 16, 1.4, 'i' + k); }
    else {
      const q = G.players[1 - k];
      st.tickle[q.id] = K.tickleT; st.tickleBuzz[q.id] = 0.6;
      st.fx.feather = { from: k, x0: c.x, y0: c.y, t: 0 };
      tugPop(st, q.x + q.w / 2, q.y - 44, 'Tickle!', '#ffffff', 18, 1.0, 'i' + q.id);
      Sfx.play('tugTickle', q.id); rumble(q.id, 0, 0.4, 300);
    }
  },
  // a round is decided: loser's toes are in the mud (or the bell)
  end(loser, reason) {
    const st = G.mst, w = 1 - loser, ln = NAMES[loser];
    let why = 'Pulled ' + ln + ' into the mud!';                          // later lines override earlier ones; they name the
    if (st.spin[w] > 0) why = 'Spinach power!';                           //   loser, so the results' list "R2 Bo ..." reads right
    if (!st.hold[loser]) why = ln + '’s rope slid into the mud!';
    if (st.tickle[loser] > 0) why = 'Tickled ' + ln + ' into the mud!';
    if (st.lastBig && st.lastBig.k === w && st.lastBig.why === 'drum' && st.t - st.lastBig.t < 0.5) why = 'A big drum heave!';
    if (st.minGap[w] <= st.K.comeback) why = 'What a comeback!';
    if (reason) why = reason;
    if (!matchRoundEnd(w, why)) return false;
    const gap = st.minGap[w];
    if (!st.stats.close || gap < st.stats.close.gap) st.stats.close = { k: w, gap: Math.max(1, Math.round(gap)) };   // (">= 1 px": "won 0 px" reads like a bug)
    this.endFx(loser);
    return true;
  },
  endFx(loser) {
    const st = G.mst;
    st.hold = [false, false];
    if (st.crate) { puff(st.crate.x, st.crate.y, 6, 'rgba(255,255,255,0.85)'); st.crate = null; }
    st.fx.feather = null;
    if (loser < 0) {                                                       // dead even: both flop back on their bottoms
      for (const p of G.players) knock(p, (p.id === 0 ? -1 : 1) * 90, -160, 0, 0.3);   // stun 0: no dizzy eyes
      return;
    }
    const p = G.players[loser], dir = loser === 0 ? 1 : -1;
    knock(p, dir * 210, -380, 1.2, 0.5);                                    // yanked into the mud
    knock(G.players[1 - loser], -dir * 90, -160, 0, 0.3);                  // the winner flops back as the rope gives (stun 0: no dizzy eyes)
    st.splash = { k: loser, done: false };
    st.fx.cheer[1 - loser] = 2.2;
    Sfx.play('tugWhoosh', loser);
  },
  idle(dt) {
    const st = G.mst;
    if (!st.beat) return;
    this.age(dt);
    const m = G.match;
    if (m && (m.phase === 'ready' || m.phase === 'count')) st.beat.hitT = 9;   // the drum is silent before GO
    if (st.splash && !st.splash.done) {
      const p = G.players[st.splash.k];
      if (p.alive && p.grounded) {
        st.splash.done = true;
        if (Math.abs(p.x + p.w / 2 - TUG.mid) < st.mud + 12) {             // landed in the mud: SPLASH
          st.muddy = p.id; Sfx.play('tugSplash'); rumble(p.id, 1, 0.8, 450);
          burst(p.x + p.w / 2, TUG.floorY - 4, '#7a5230', 24); burst(p.x + p.w / 2, TUG.floorY - 4, '#a8794a', 14);
          if (!reduceMotion) G.shake = 0.3;
        } else rumble(p.id, 0.5, 0.4, 200);
      }
    }
  },
  // cosmetic timers and pops, aged per tick (live and frozen), never per frame
  age(dt) {
    const st = G.mst, f = st.fx;
    st.pops = st.pops.filter(q => (q.t += dt) < q.life);
    st.beat.hitT += dt;
    f.twang += dt; f.mitt[0] += dt; f.mitt[1] += dt; f.reach[0] += dt; f.reach[1] += dt;
    f.swingV += (-f.swing * 60 - f.swingV * 5) * dt; f.swing += f.swingV * dt;   // the ribbon swings back
    f.cheer[0] = Math.max(0, f.cheer[0] - dt); f.cheer[1] = Math.max(0, f.cheer[1] - dt);
    f.idleT += dt; f.blinkT -= dt;
    if (f.blinkT <= -0.14) f.blinkT = 1.6 + ((f.idleT * 7.3) % 1.7);
    if (f.feather) f.feather.t += dt;
    for (const k of [0, 1]) {
      if (st.tickle[k] > 0 && G.match.phase === 'live') {
        f.hee[k] -= dt;
        if (f.hee[k] <= 0) {
          f.hee[k] = 0.28;
          const p = G.players[k];
          const hh = hash(Math.floor(st.t * 120), k + 3);                  // cosmetic: hashed, never the seeded rand
          st.pops.push({ x: p.x + p.w / 2 + ((hh % 1000) / 1000 - 0.5) * 22, y: p.y - 4, str: (hh >> 10) & 1 ? 'hee' : 'hi', col: '#ffffff', size: 11, t: 0, life: 0.5, rise: 22 });
        }
      }
    }
  },
  timeUp() {
    const st = G.mst, ro = st.ro;
    if (Math.abs(ro) < 2) { this.endFx(-1); return { winner: -1, reason: 'Dead even!' }; }
    const w = ro < 0 ? 0 : 1;
    this.end(1 - w, 'Pulled further at the bell!');                        // the yank and splash, then the framework's call is a no-op
    return { winner: w, reason: 'Pulled further at the bell!' };
  },
  tiebreak() {
    const l = G.mst.leadT;
    if (Math.abs(l[0] - l[1]) < 0.1) return -1;
    return { winner: l[0] > l[1] ? 0 : 1, reason: 'Led for longer!' };
  },
  stats() {
    const s = G.mst.stats, out = [{ label: 'Perfect heaves', values: s.perfect.slice() }, { label: 'Tugs', values: s.tugs.slice() }];
    if (s.goodies[0] + s.goodies[1] > 0) out.push({ label: 'Goodies', values: s.goodies.slice() });
    if (s.streak[0] + s.streak[1] > 0) out.push({ label: 'Best streak', values: s.streak.slice() });
    // one line: a sweep gets the easing tip (a parent who only heaves on the BOOM lets a kid win), else the closest call
    const wn = G.match ? G.match.wins : [0, 0], sweep = Math.min(wn[0], wn[1]) === 0 && Math.max(wn[0], wn[1]) >= 3;
    const sw = wn[0] > wn[1] ? 0 : 1, solo = typeof cpuSolo === 'function' && cpuSolo();
    // (1-player mode: no easing tip for the computer; a person who swept it gets a cheer instead)
    if (sweep && solo) out.push(cpuOn(sw) ? 'Too tough? Try the computer on Easy!' : 'Clean sweep, ' + NAMES[sw] + '!');
    else if (sweep) out.push(NAMES[sw] + ', go easy: just mash, skip the BOOMs!');
    else if (s.close && s.close.gap <= 60) out.push('Closest call: ' + NAMES[s.close.k] + ' won ' + s.close.gap + ' px from the mud');
    return out;
  },

  // ---------------------------------------------------------------- drawing ----
  draw() {
    const st = G.mst;
    if (!st.beat) return;
    const F = TUG.floorY, m = st.mud, ph = G.match ? G.match.phase : 'live';
    this.drawFans(st);
    // dig-in lines: a gold dash on the grass where each player's toes start digging in
    for (const k of [0, 1]) {
      const dz = st.K.digGap + st.K.helpDig * st.help[k], x = TUG.mid + (k === 0 ? -1 : 1) * (m + dz);
      ctx.fillStyle = C.gold; rr(x - 7, F - 3, 14, 3, 1.5); ctx.fill();
    }
    // crate shadow on the ground
    const c = st.crate;
    if (c && !c.landed) {
      const f = clamp((c.y - st.K.crateY0) / (F - st.K.crateY0), 0, 1);
      ctx.fillStyle = 'rgba(28,26,54,' + (0.08 + 0.17 * f) + ')';
      ctx.beginPath(); ctx.ellipse(c.x, F - 1, 5 + 8 * f, 2 + f, 0, 0, Math.PI * 2); ctx.fill();
    }
    // the mud puddle (back part)
    this.drawMud(st, false);
    // bubbles (cosmetic, from the clock)
    for (let i = 0; i < 4; i++) {
      const cyc = G.clock / 0.7 + i * 0.37, n = Math.floor(cyc), fr = cyc - n, hh = hash(n, i * 31 + 7);
      const bx = TUG.mid + ((hh % 1000) / 1000 * 2 - 1) * (m - 10);
      if (Math.abs(bx - TUG.mid) < 22) continue;
      ctx.strokeStyle = TUG_MUD_HI; ctx.lineWidth = 1.5; circle(bx, F - 1, 1 + 3 * fr); ctx.stroke();
    }
    // ripple on the beat
    const hit = st.beat.hitT;
    if (hit < 0.35) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 * (1 - hit / 0.35)) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(TUG.mid, F, 22 + hit * 120, 3 + hit * 6, 0, 0, Math.PI * 2); ctx.stroke(); }
    // mud-edge stakes with a pennant in that side's colour: the "don't cross" lines
    for (const k of [0, 1]) {
      const sx = TUG.mid + (k === 0 ? -1 : 1) * m;
      ctx.fillStyle = C.plankDark; rr(sx - 2.5, F - 25, 5, 27, 2); ctx.fill();
      ctx.fillStyle = C.plank; rr(sx - 1.5, F - 24, 3, 24, 1.5); ctx.fill();
      ctx.fillStyle = PCOL[k]; ctx.beginPath();
      const d = k === 0 ? -1 : 1, wv = Math.sin(G.clock * 5 + k) * 2;
      ctx.moveTo(sx, F - 25); ctx.lineTo(sx + d * 13, F - 21 + wv * 0.5); ctx.lineTo(sx, F - 16); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = PDARK[k]; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // middle line (free players can't cross it)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.setLineDash([6, 8]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(TUG.mid, F - 74); ctx.lineTo(TUG.mid, 120); ctx.stroke(); ctx.setLineDash([]);
    this.drawFrog(st, ph);
    // front of the mud: the frog sits IN the puddle
    this.drawMud(st, true);
    this.drawRope(st);
  },
  // the mud puddle: a sunken lens of glossy mud cut into the grass. front = the part in front of the frog's tummy
  drawMud(st, front) {
    const F = TUG.floorY, m = st.mud, cx = TUG.mid, rx = m + 5, top = F - 3, dep = 13 + Math.min(6, m / 30);
    ctx.save();
    if (front) { ctx.beginPath(); ctx.rect(cx - rx - 2, F, 2 * rx + 4, dep + 12); ctx.clip(); }
    const g = ctx.createLinearGradient(0, top - 2, 0, top + dep);
    g.addColorStop(0, '#9a6636'); g.addColorStop(0.3, TUG_MUD); g.addColorStop(1, '#4a2b14');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - rx, top);
    for (let x = cx - rx + 6; x < cx + rx - 2; x += 6) ctx.lineTo(x, top + Math.sin(x * 0.11 + G.clock * 1.6) * 0.9);
    ctx.lineTo(cx + rx, top); ctx.ellipse(cx, top, rx, dep, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(46,26,12,0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, top, rx, dep, 0, 0.08, Math.PI - 0.08); ctx.stroke();
    if (front) {
      // the water line around the frog's tummy
      ctx.strokeStyle = 'rgba(255,238,210,0.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx, F + 1, 20, 2.5, 0, 0.1, Math.PI - 0.1); ctx.stroke();
      ctx.restore(); return;
    }
    // soggy lips spilling onto the grass at each end, and a few splats beyond
    for (const d of [-1, 1]) {
      const ex = cx + d * (rx - 3);
      ctx.fillStyle = TUG_MUD; ctx.beginPath(); ctx.ellipse(ex, top + 1, 8, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6a4120';
      for (let i = 0; i < 3; i++) { const hh = hash(i, d + 5); circle(ex + d * (9 + (hh % 13)), F - 1 - (hh % 3), 1.4 + (hh % 2)); ctx.fill(); }
      if (st.spreading && m < st.K.mudMax) {
        const a = 0.25 + 0.2 * Math.sin(G.clock * 6);
        ctx.fillStyle = 'rgba(74,43,20,' + a + ')'; ctx.beginPath(); ctx.ellipse(ex + d * 8, top + 1.5, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    // the wet top of the puddle, then gloss
    ctx.fillStyle = 'rgba(178,124,72,0.55)'; ctx.beginPath(); ctx.ellipse(cx, top + 1.5, rx - 5, 2.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,215,0.38)';
    ctx.beginPath(); ctx.ellipse(cx - rx * 0.56, top + 2.5, Math.min(24, rx * 0.22), 1.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + rx * 0.5, top + 4, Math.min(15, rx * 0.15), 1.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,215,0.16)'; ctx.beginPath(); ctx.ellipse(cx - rx * 0.2, top + 7, Math.min(30, rx * 0.3), 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },
  drawFrog(st, ph) {
    const F = TUG.floorY, hit = st.beat.hitT, live = ph === 'live';
    const sq = live && hit < 0.15 ? 1 - hit / 0.15 : 0;                   // the drum squashes down on the BOOM
    const bob = live ? 0 : Math.sin(G.clock * 2.2) * 1.5;
    ctx.save(); ctx.translate(TUG.mid, F + bob);
    // arms up to the drum
    ctx.strokeStyle = '#3f8a3c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-13, -16); ctx.lineTo(-15, -38 + sq * 5); ctx.moveTo(13, -16); ctx.lineTo(15, -38 + sq * 5); ctx.stroke();
    // body + belly
    ctx.fillStyle = '#5fb45a'; ctx.strokeStyle = '#2f6e33'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(0, -10 + sq * 2, 18, 15 - sq * 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9be08e'; ctx.beginPath(); ctx.ellipse(0, -5 + sq * 2, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
    // eyes on top
    const ey = -26 + sq * 3, blink = live ? hit < 0.1 : st.fx.blinkT < 0;
    for (const ex of [-8, 8]) {
      ctx.fillStyle = '#5fb45a'; ctx.strokeStyle = '#2f6e33'; ctx.lineWidth = 2; circle(ex, ey, 6); ctx.fill(); ctx.stroke();
      if (blink) { ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex - 3, ey); ctx.lineTo(ex + 3, ey); ctx.stroke(); }
      else { ctx.fillStyle = '#fff'; circle(ex, ey, 4); ctx.fill(); ctx.fillStyle = C.ink; circle(ex, ey + 0.5, 2); ctx.fill(); }
    }
    ctx.strokeStyle = '#2f6e33'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -14 + sq * 2, 6, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    // the drum over its head
    const dy = -60 + sq * 6;
    ctx.fillStyle = '#d24b4b'; ctx.strokeStyle = '#7c2424'; ctx.lineWidth = 2;
    rr(-14, dy, 28, 17, 5); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#f6efdf'; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(-10, dy + 6); ctx.lineTo(-4, dy + 15); ctx.lineTo(2, dy + 6); ctx.lineTo(8, dy + 15); ctx.stroke();
    ctx.fillStyle = '#f6efdf'; ctx.beginPath(); ctx.ellipse(0, dy + 1, 14, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7c2424'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    // the BOOM: a shockwave ring and a little word
    if (live && hit < 0.3) {
      const a = 1 - hit / 0.3, cy = F + dy + 1;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 * a) + ')'; ctx.lineWidth = 3; circle(TUG.mid, cy, 8 + hit / 0.3 * 24); ctx.stroke();
      ctx.globalAlpha = a; bigText('BOOM', TUG.mid, cy - 16 - hit * 30, hudBig() ? 17 : 13, '#fff1c9'); ctx.globalAlpha = 1;
    }
  },
  drawRope(st) {
    const F = TUG.floorY, hy = F - 12, hx = [tugHand(st, 0), tugHand(st, 1)], f = st.fx;
    const end = k => st.hold[k] ? [hx[k], hy] : [hx[k], F - 3];
    const [ax, ay] = end(0), [bx, by] = end(1);
    const sag = (st.hold[0] && st.hold[1] ? 4 : 10) - (f.twang < 0.1 ? 2 : 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const path = () => { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + sag, bx, by); };
    // tails behind each holder (the rope runs on past the hands and lies on the grass)
    const tail = k => { const d = k === 0 ? -1 : 1; ctx.beginPath(); ctx.moveTo(hx[k], hy); ctx.quadraticCurveTo(hx[k] + d * 26, hy + 2, hx[k] + d * 44, F - 3); ctx.lineTo(hx[k] + d * 58, F - 3); };
    for (const k of [0, 1]) if (st.hold[k]) { ctx.strokeStyle = C.ropeDark; ctx.lineWidth = 6; tail(k); ctx.stroke(); ctx.strokeStyle = C.rope; ctx.lineWidth = 3.5; tail(k); ctx.stroke(); }
    ctx.strokeStyle = C.ropeDark; ctx.lineWidth = 6; path(); ctx.stroke();
    ctx.strokeStyle = C.rope; ctx.lineWidth = 3.5; path(); ctx.stroke();
    ctx.strokeStyle = 'rgba(107,70,48,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); path(); ctx.stroke(); ctx.setLineDash([]);
    for (const k of [0, 1]) if (!st.hold[k]) {                             // a free rope end: a knotted loop on the grass
      ctx.strokeStyle = C.ropeDark; ctx.lineWidth = 3; circle(hx[k] + (k ? 6 : -6), F - 5, 5); ctx.stroke();
      ctx.strokeStyle = C.rope; ctx.lineWidth = 1.5; circle(hx[k] + (k ? 6 : -6), F - 5, 5); ctx.stroke();
    }
    // the red ribbon on the middle of the rope
    const rx = TUG.mid + st.ro, ry = (ay + by) / 2 + sag / 2;
    ctx.save(); ctx.translate(rx, ry); ctx.rotate(clamp(f.swing, -0.8, 0.8));
    ctx.fillStyle = '#e8443a'; ctx.strokeStyle = '#8c1f1a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-6, 14); ctx.lineTo(-1, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(6, 14); ctx.lineTo(1, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-8, -5); ctx.lineTo(-8, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8, -5); ctx.lineTo(8, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    circle(0, 0, 3); ctx.fill(); ctx.stroke();
    ctx.restore();
  },
  // the animal fans on a bench below the field: they bob on the beat and cheer for their player
  drawFans(st) {
    const F = TUG.floorY, by = F + 66, hit = st.beat.hitT, live = G.match && G.match.phase === 'live';
    const beatBob = live && hit < 0.2 ? Math.sin(hit / 0.2 * Math.PI) * 3 : 0;
    for (const side of [0, 1]) {
      const xs = TUG_FANS.filter(f => f[2] === side).map(f => f[0]);
      const bx0 = Math.min(...xs) - 38, bx1 = Math.max(...xs) + 38;
      ctx.fillStyle = C.plankDark; ctx.fillRect(bx0 + 10, by + 4, 6, 20); ctx.fillRect(bx1 - 16, by + 4, 6, 20);
      ctx.fillStyle = C.plank; rr(bx0, by - 4, bx1 - bx0, 10, 4); ctx.fill();
      ctx.strokeStyle = C.plankDark; ctx.lineWidth = 2; ctx.stroke();
    }
    TUG_FANS.forEach(([x, kind, side], i) => {
      const ch = st.fx.cheer[side], hop = ch > 0 ? Math.abs(Math.sin((ch * 9) + i)) * 8 : 0;
      this.drawFan(x, by - 3 - hop - (i % 2 ? beatBob : beatBob * 0.6), kind, side, ch > 0);
    });
  },
  drawFan(x, y, kind, side, cheer) {
    const col = { bunny: '#f1ece6', duck: '#ffd84a', bear: '#b07a4a', cat: '#9aa1b4', pig: '#f7a8b8', sheep: '#f6f4ee' }[kind];
    const dk = { bunny: '#9b8f86', duck: '#c99a12', bear: '#6e4626', cat: '#5c637a', pig: '#c46a80', sheep: '#8d877c' }[kind];
    ctx.save(); ctx.translate(x, y);
    ctx.lineWidth = 2; ctx.strokeStyle = dk; ctx.fillStyle = col;
    // arms (up when cheering)
    ctx.strokeStyle = dk; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath();
    if (cheer) { ctx.moveTo(-10, -12); ctx.lineTo(-17, -30); ctx.moveTo(10, -12); ctx.lineTo(17, -30); }
    else { ctx.moveTo(-10, -10); ctx.lineTo(-14, -2); ctx.moveTo(10, -10); ctx.lineTo(14, -2); }
    ctx.stroke();
    // body + scarf in the team colour
    ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 2; rr(-12, -18, 24, 20, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PCOL[side]; rr(-12, -19, 24, 6, 3); ctx.fill();
    // head
    const hy = -31;
    if (kind === 'bunny') { for (const ex of [-5, 5]) { ctx.fillStyle = col; rr(ex - 3.5, hy - 25, 7, 18, 3.5); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f7b9c6'; rr(ex - 1.5, hy - 22, 3, 12, 1.5); ctx.fill(); } }
    if (kind === 'bear') { ctx.fillStyle = col; for (const ex of [-9, 9]) { circle(ex, hy - 9, 5); ctx.fill(); ctx.stroke(); } }
    if (kind === 'cat') { ctx.fillStyle = col; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 11, hy - 4); ctx.lineTo(d * 9, hy - 16); ctx.lineTo(d * 3, hy - 10); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
    if (kind === 'pig') { ctx.fillStyle = col; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 11, hy - 6); ctx.lineTo(d * 11, hy - 15); ctx.lineTo(d * 4, hy - 11); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
    ctx.fillStyle = col; circle(0, hy, 12); ctx.fill(); ctx.stroke();
    if (kind === 'sheep') { ctx.fillStyle = '#ffffff'; for (const [ox, oy] of [[-9, -8], [0, -12], [9, -8], [-12, 0], [12, 0]]) { circle(ox, hy + oy, 5); ctx.fill(); } ctx.fillStyle = '#5b5148'; rr(-7, hy - 5, 14, 13, 6); ctx.fill(); }
    // face
    const eyeCol = kind === 'sheep' ? '#ffffff' : C.ink;
    if (cheer) { ctx.strokeStyle = eyeCol; ctx.lineWidth = 2; for (const ex of [-4.5, 4.5]) { ctx.beginPath(); ctx.arc(ex, hy - 1, 2.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); } }
    else { ctx.fillStyle = eyeCol; circle(-4.5, hy - 2, 1.8); ctx.fill(); circle(4.5, hy - 2, 1.8); ctx.fill(); }
    if (kind === 'duck') { ctx.fillStyle = '#ff9a3d'; ctx.strokeStyle = '#c4621a'; ctx.lineWidth = 1.5; rr(-6, hy + 2, 12, cheer ? 7 : 5, 3); ctx.fill(); ctx.stroke(); }
    else if (kind === 'pig') { ctx.fillStyle = '#f58ea4'; ctx.strokeStyle = dk; ctx.lineWidth = 1.5; rr(-5, hy + 2, 10, 7, 3.5); ctx.fill(); ctx.stroke(); ctx.fillStyle = dk; circle(-2, hy + 5.5, 1); ctx.fill(); circle(2, hy + 5.5, 1); ctx.fill(); }
    else if (kind !== 'sheep') {
      ctx.fillStyle = kind === 'bear' ? '#e0b98e' : '#ffffff'; if (kind === 'bear') { circle(0, hy + 5, 5); ctx.fill(); }
      ctx.fillStyle = C.ink; circle(0, hy + 3, 1.6); ctx.fill();
      if (cheer) { ctx.fillStyle = '#c0394b'; circle(0, hy + 7, 2.2); ctx.fill(); }
    }
    ctx.restore();
  },
  drawTop() {
    const st = G.mst;
    if (!st.beat) return;
    const K = st.K, b = st.beat, F = TUG.floorY, live = G.match.phase === 'live';
    const big = hudBig(), rs = big ? 1.4 : 1, ms = big ? 1.3 : 1;      // phones: a bigger, thicker ring and bigger mitts
    for (const p of G.players) {
      const k = p.id, px = p.x + p.w / 2;
      if (!p.alive) continue;
      // a pull press out of reach of the rope end: the knotted loop pulses and an arrow points at it
      const ra = st.fx.reach[k];
      if (!st.hold[k] && ra < 0.4) {
        const lx = tugHand(st, k) + (k ? 6 : -6), ly = F - 5, a = 1 - ra / 0.4, d = lx > px ? 1 : -1;
        ctx.strokeStyle = PCOL[k]; ctx.globalAlpha = a; ctx.lineWidth = 2.5 * ms; circle(lx, ly, 6 + 12 * (ra / 0.4)); ctx.stroke();
        const ax = px + d * (p.w / 2 + 6 + 4 * Math.sin(ra * 30)), ay = p.y + p.h / 2, s2 = 6 * ms;
        ctx.fillStyle = C.paper; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(ax + d * s2 * 1.4, ay); ctx.lineTo(ax, ay - s2); ctx.lineTo(ax, ay + s2); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // boots: filled gold with Big boots, a gold rim while dug in
      const dug = this.digging(k);
      if (st.help[k] > 0 || dug) {
        for (const ex of [-6, 6]) {
          ctx.fillStyle = st.help[k] > 0 ? C.gold : PDARK[k]; rr(px + ex - 4.5, p.y + p.h - 5, 9, 5, 2.5); ctx.fill();
          ctx.strokeStyle = dug ? (st.help[k] > 0 ? '#fff3b0' : C.gold) : C.goldDark; ctx.lineWidth = 2; ctx.stroke();
        }
      }
      if (st.muddy === k) this.drawMuddy(p);
      if (st.tickle[k] > 0) this.drawGiggle(p);
      if (st.hold[k]) {
        const hx = tugHand(st, k), hy = F - 12, j = Math.max(0, 1 - st.fx.mitt[k] / 0.15);
        const mx = hx + (k === 0 ? -4 : 4) * j, r = (st.spin[k] > 0 ? 7 : 5.5) * ms;
        ctx.fillStyle = st.spin[k] > 0 ? '#7be37b' : C.paper; ctx.strokeStyle = st.drum[k] > 0 ? '#d24b4b' : C.ink; ctx.lineWidth = 2;
        circle(mx, hy, r); ctx.fill(); ctx.stroke();
        // the approach ring: shrinks onto the hands and touches them on the BOOM
        if (live && st.tickle[k] <= 0) {
          const dtb = b.next - st.t;
          ctx.strokeStyle = big ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)'; ctx.lineWidth = big ? 2.5 : 1.5; circle(hx, hy, 9 * rs); ctx.stroke();
          if (dtb < 0.6 && dtb > -b.wL && st.used[k] !== b.id && !this.denied(k)) {
            const rad = (9 + 25 * clamp(dtb / 0.6, 0, 1)) * rs, inWin = dtb <= b.wE;
            ctx.strokeStyle = st.drum[k] > 0 ? '#ff6b6b' : dug ? C.gold : inWin ? PCOL[k] : 'rgba(255,255,255,0.75)';
            ctx.lineWidth = big ? 5 : 3.5; circle(hx, hy, rad); ctx.stroke();
          }
          if (b.hitT < 0.12) { ctx.strokeStyle = 'rgba(255,255,255,' + (1 - b.hitT / 0.12) + ')'; ctx.lineWidth = big ? 4 : 3; circle(hx, hy, 9 * rs); ctx.stroke(); }
        }
      }
      if (st.spin[k] > 0) {                                                // spinach: a green ring and a timer that drains while holding
        ctx.strokeStyle = 'rgba(123,227,123,0.85)'; ctx.lineWidth = 2; circle(px, p.y + p.h / 2, 20 + Math.sin(G.clock * 12) * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(28,26,54,0.6)'; rr(px - 13, p.y - 35, 26, 6, 3); ctx.fill();
        ctx.fillStyle = '#7be37b'; rr(px - 12, p.y - 34, 24 * st.spin[k] / K.spinT, 4, 2); ctx.fill();
      }
      if (st.drum[k] > 0) {                                                // Big Drum charges: little red drums over the head
        const y = p.y - (st.spin[k] > 0 ? 48 : 40), n = st.drum[k];
        for (let i = 0; i < n; i++) {
          const x = px - (n - 1) * 5.5 + i * 11 - 4.5;
          ctx.fillStyle = '#d24b4b'; ctx.strokeStyle = '#7c2424'; ctx.lineWidth = 1.5; rr(x, y, 9, 7, 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#f6efdf'; ctx.fillRect(x + 1, y + 1, 7, 2);
        }
      }
    }
    // the feather flies from the collector to the tickled player, then wiggles at their belly
    const fe = st.fx.feather;
    if (fe && live) {
      const q = G.players[1 - fe.from];
      if (st.tickle[q.id] > 0 && q.alive) {
        const tx = q.x + q.w / 2 + (q.id === 0 ? 12 : -12), ty = q.y + q.h * 0.62, a = clamp(fe.t / 0.3, 0, 1);
        const x = fe.x0 + (tx - fe.x0) * a, y = fe.y0 + (ty - fe.y0) * a - Math.sin(a * Math.PI) * 40;
        this.drawFeather(x, y, a < 1 ? 0.3 : Math.sin(G.clock * 22) * 0.6, 1);
      }
    }
    const c = st.crate;
    if (c) this.drawCrate(st, c);
    const ps = hudBig() ? 1.25 : 1;                                       // bigger words on a small screen
    for (const q of st.pops) {
      const a = 1 - q.t / q.life;
      ctx.globalAlpha = clamp(a * 3, 0, 1);
      bigText(q.str, q.x, q.y - q.rise * (q.t / q.life), q.size * ps, q.col);
    }
    ctx.globalAlpha = 1;
  },
  drawFeather(x, y, rot, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#8f88aa'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-9, 4); ctx.quadraticCurveTo(-4, -8, 9, -5); ctx.quadraticCurveTo(2, 4, -9, 4); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#c9c3df'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-11, 6); ctx.quadraticCurveTo(-2, -1, 8, -4); ctx.stroke();
    ctx.restore();
  },
  drawCrate(st, c) {
    const F = TUG.floorY, a = c.landed ? 1 : clamp(c.t / 0.35, 0, 1);
    let bob = 0, alpha = a;
    if (c.landed && c.inMud) bob = Math.sin(c.lt * 6) * 1.5 + Math.min(8, c.lt * 3);
    if (c.landed && !c.inMud && c.lt > st.K.crateFloat - 1) alpha = Math.sin(c.lt * 24) > 0 ? 1 : 0.35;
    ctx.globalAlpha = alpha;
    const x = c.x, y = c.y + bob;
    if (!c.landed) {                                                       // the parachute
      const cy = y - 30;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 10, y - 10); ctx.lineTo(x - 17, cy); ctx.moveTo(x + 10, y - 10); ctx.lineTo(x + 17, cy); ctx.moveTo(x, y - 12); ctx.lineTo(x, cy); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#c9c3df'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, cy, 18, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff8fb1'; ctx.beginPath(); ctx.arc(x, cy, 18, Math.PI * 1.33, Math.PI * 1.67); ctx.lineTo(x, cy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#c9c3df'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 6, cy); ctx.lineTo(x - 9, cy - 16); ctx.moveTo(x + 6, cy); ctx.lineTo(x + 9, cy - 16); ctx.stroke();
    }
    if (c.landed && c.inMud) { ctx.save(); ctx.beginPath(); ctx.rect(x - 20, y - 30, 40, F + 1 - (y - 30)); ctx.clip(); }
    ctx.fillStyle = C.plank; ctx.strokeStyle = C.plankDark; ctx.lineWidth = 2;
    rr(x - 12, y - 12, 24, 24, 4); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(138,88,51,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 9, y - 9); ctx.lineTo(x + 9, y + 9); ctx.stroke();
    ctx.fillStyle = '#fff6e2'; circle(x, y, 8.5); ctx.fill();
    if (c.type === 'spinach') {                                            // a green can with a leaf
      ctx.fillStyle = '#3fae4a'; ctx.strokeStyle = '#1f6e2a'; ctx.lineWidth = 1.2; rr(x - 4.5, y - 4, 9, 10, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9be08e'; ctx.fillRect(x - 4.5, y - 1, 9, 3);
      ctx.fillStyle = '#5fd36a'; ctx.beginPath(); ctx.ellipse(x + 2, y - 6.5, 4, 2, -0.6, 0, Math.PI * 2); ctx.fill();
    } else if (c.type === 'feather') this.drawFeather(x, y, -0.3, 0.75);
    else {                                                                 // a tiny red drum
      ctx.fillStyle = '#d24b4b'; ctx.strokeStyle = '#7c2424'; ctx.lineWidth = 1.2; rr(x - 5.5, y - 3, 11, 8, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f6efdf'; ctx.beginPath(); ctx.ellipse(x, y - 3, 5.5, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (c.landed && c.inMud) ctx.restore();
    ctx.globalAlpha = 1;
  },
  // a tickled player giggles: happy closed eyes and an open mouth (drawn over the engine's face)
  drawGiggle(p) {
    const w = p.w * p.sx, h = p.h * p.sy, cx = p.x + p.w / 2, by = p.y + p.h;
    const look = p.face * 2.5, ey = -h * 0.6 + clamp(p.vy / 300, -1.5, 1.5), j = reduceMotion ? 0 : Math.sin(G.clock * 70) * 1;
    ctx.save(); ctx.translate(cx + j, by);
    ctx.fillStyle = PCOL[p.id];
    for (const ex of [-5, 5]) { ctx.beginPath(); ctx.ellipse(ex + look - j, ey, 4.8, 5.4, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const ex of [-5, 5]) { ctx.beginPath(); ctx.arc(ex + look, ey + 1.5, 3, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(look * 0.6, ey + 7, 3.2, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff8fa3'; ctx.beginPath(); ctx.ellipse(look * 0.6, ey + 8.2, 2, 1.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    void w;
  },
  // the loser after the splash: mud up to the belly, two drips, muddy cheeks
  drawMuddy(p) {
    const w = p.w * p.sx, h = p.h * p.sy, cx = p.x + p.w / 2, by = p.y + p.h;
    ctx.save(); ctx.translate(cx, by);
    rr(-w / 2 - 1, -h - 1, w + 2, h + 2, 8); ctx.clip();
    ctx.fillStyle = 'rgba(110,72,38,0.8)';
    ctx.beginPath(); ctx.moveTo(-w / 2 - 2, -h * 0.6);
    for (let i = 0; i <= 6; i++) ctx.lineTo(-w / 2 + (w / 6) * i, -h * 0.6 + (i % 2 ? 3 : -1));
    ctx.lineTo(w / 2 + 2, 2); ctx.lineTo(-w / 2 - 2, 2); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(cx, by);
    ctx.fillStyle = 'rgba(110,72,38,0.85)';
    ctx.beginPath(); ctx.ellipse(-4, -h * 0.6 + 6, 1.8, 3.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5, -h * 0.6 + 8, 1.6, 2.8, 0, 0, Math.PI * 2); ctx.fill();
    const look = p.face * 2.5, ey = -h * 0.6;
    ctx.fillStyle = 'rgba(110,72,38,0.7)'; circle(-8 + look * 0.5, ey + 6, 2.6); ctx.fill(); circle(8 + look * 0.5, ey + 6, 2.6); ctx.fill();
    ctx.restore();
  },

  // ---------------------------------------------------------------- HUD ----
  hud() {
    const st = G.mst, m = G.match;
    if (!st.beat || !m) return;
    const big = hudBig(), card = TUG_CARDS[st.twist] || TUG_CARDS.classic;
    // twist pill (top left, under the level pill) in twist rounds only
    if (st.twist !== 'classic') {
      ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
      pill(14, 46, ctx.measureText(card[0]).width + 28, 26); text(card[0], 28, 59.5, 13, C.gold, 'left', 'body');
    }
    // one live-alert chip (top right)
    if (st.spreading && m.phase === 'live') {
      const fs = big ? 20 : 14, ch = big ? 38 : 28, label = 'Mud spreading!';
      ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const tw = ctx.measureText(label).width, r = big ? 6 : 4.5, cw = tw + 2 * r + 34;
      pill(W - 14, 12, cw, ch, 'right');
      const pulse = st.spreading && st.mud < st.K.mudMax ? 0.75 + 0.25 * Math.sin(G.clock * 6) : 1;
      ctx.fillStyle = TUG_MUD; circle(W - 14 - cw + 14 + r, 12 + ch / 2, r * pulse); ctx.fill();
      text(label, W - 28, 12 + ch / 2 + 0.5, fs, '#e2b07a', 'right', 'body');
    }
    this.drawMeter(st, big);
    this.drawTrack(st, big, m.phase);
    // twist card (C4) during "Round N" and 3-2-1, every round
    if (m.phase === 'ready' || m.phase === 'count') {
      // phones: name 30 / hint 17 px on a 74 px panel (284..358, still above the name tags at y 367)
      const cs = big ? { h: 74, n: 30, ny: 309, hs: 17, hy: 341, wm: 360 } : { h: 60, n: 26, ny: 305, hs: 14, hy: 330, wm: 300 };
      ctx.font = '700 ' + cs.hs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w = Math.max(cs.wm, ctx.measureText(card[1]).width + 48);
      ctx.globalAlpha = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1;
      ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(W / 2 - w / 2, 284, w, cs.h, 16); ctx.fill();
      text(card[0], W / 2, cs.ny, cs.n, C.gold, 'center'); text(card[1], W / 2, cs.hy, cs.hs, C.paper, 'center', 'body');
      ctx.globalAlpha = 1;
      for (const p of G.players) if (st.help[p.id] > 0) {
        const bob = Math.sin(Math.min(1, m.t / 0.3) * Math.PI) * 3;
        if (big) bigText('Big boots!', p.x + p.w / 2 + (p.id === 0 ? -64 : 64), p.y + p.h - 10 - bob, 20, C.gold);   // beside the gold boots (the card is above)
        else bigText('Big boots!', p.x + p.w / 2, p.y - 42 - bob, 16, C.gold);
      }
    }
  },
  // THE BEAT TRACK (Nov 2026, Gavyn: the pull timing must be much clearer): a lane in the sky over the frog. Each BOOM is a
  // note: Pip's slide in from the left, Bo's from the right, and they meet the drum in the middle on the BOOM: press pull
  // when your note is in the gold ring (Perfect) or the white band (Good). The bands shrink as the beat speeds up, and the
  // notes bunch up, so the speed-up is plain to see. A Big drum makes your notes red drums and the other one's notes grey.
  drawTrack(st, big, ph) {
    const b = st.beat, K = st.K, s = big ? 1.3 : 1, cx = TUG.mid, y = big ? 176 : 168, L = big ? 290 : 250, LT = 1.15, v = L / LT;
    const live = ph === 'live', t = st.t;
    // the lane: two halves in the players' colours
    ctx.fillStyle = 'rgba(28,26,54,0.6)'; rr(cx - L - 18 * s, y - 20 * s, 2 * L + 36 * s, 40 * s, 20 * s); ctx.fill();
    rr(cx - 16 * s, y - 38 * s, 32 * s, 22 * s, 8 * s); ctx.fill();          // a tab for the little drum
    for (const k of [0, 1]) {
      ctx.fillStyle = PCOL[k]; ctx.globalAlpha = 0.22;
      if (k === 0) rr(cx - L, y - 5 * s, L, 10 * s, 5 * s); else rr(cx, y - 5 * s, L, 10 * s, 5 * s);
      ctx.fill(); ctx.globalAlpha = 1;
    }
    // the hit zone: Good band (white) and Perfect band (gold), as wide as the timing windows at this speed
    const gw = Math.max(b.wG, b.wP + 0.01) * v, pw = b.wP * v, pulse = live && b.hitT < 0.15 ? 1 - b.hitT / 0.15 : 0;
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; rr(cx - gw, y - 15 * s, 2 * gw, 30 * s, 8 * s); ctx.fill();
    ctx.fillStyle = 'rgba(255,197,61,' + (0.55 + 0.4 * pulse) + ')'; rr(cx - pw, y - 17 * s, 2 * pw, 34 * s, 6 * s); ctx.fill();
    // the target in the middle: a note inside this ring on the BOOM is dead on (it thumps on the BOOM); a little drum over it
    const dr = (11 + 3 * pulse) * s;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * s; circle(cx, y, dr); ctx.stroke();
    ctx.fillStyle = '#d24b4b'; ctx.strokeStyle = '#7c2424'; ctx.lineWidth = 1.5 * s;
    rr(cx - 9 * s, y - 33 * s - 2 * pulse, 18 * s, 11 * s, 3 * s); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f6efdf'; rr(cx - 8 * s, y - 33 * s - 2 * pulse, 16 * s, 3 * s, 1.5 * s); ctx.fill();
    if (!live) return;
    // the notes: this BOOM and the ones after it, while they are within LT s
    let tb = b.next, id = b.id;
    for (let j = 0; j < 8 && tb - t < LT; j++) {
      const off = (tb - t) * v;
      for (const k of [0, 1]) {
        if (j === 0 && st.used[k] === id) continue;                          // already pressed: the hit flash shows instead
        const x = cx + (k === 0 ? -1 : 1) * off, held = st.hold[k] && st.tickle[k] <= 0;
        const mine = st.drum[k] > 0 && st.hold[k] && j < st.drum[k], theirs = st.drum[1 - k] > 0 && st.hold[1 - k] && j < st.drum[1 - k] && !mine;
        const fade = off < 0 ? clamp(1 + off / (b.wL * v), 0, 1) : 1;        // a missed note fades out past the drum
        ctx.globalAlpha = (held ? 1 : 0.35) * fade;
        if (mine) {                                                        // a Big drum beat: a red drum note
          ctx.fillStyle = '#d24b4b'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5 * s;
          rr(x - 11 * s, y - 9 * s, 22 * s, 18 * s, 5 * s); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#f6efdf'; rr(x - 9 * s, y - 7 * s, 18 * s, 4 * s, 2 * s); ctx.fill();
        } else if (theirs) {                                               // the other one's Big drum beat: grey with a cross
          ctx.fillStyle = '#8a8698'; circle(x, y, 7 * s); ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * s; ctx.beginPath();
          ctx.moveTo(x - 4 * s, y - 4 * s); ctx.lineTo(x + 4 * s, y + 4 * s); ctx.moveTo(x + 4 * s, y - 4 * s); ctx.lineTo(x - 4 * s, y + 4 * s); ctx.stroke();
        } else {
          ctx.fillStyle = PCOL[k]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5 * s; circle(x, y, 9 * s); ctx.fill(); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      tb += tugPer(K, tb); id++;
    }
    // hit flashes: a ring on your side of the drum in the grade's colour, and the grade word under the lane
    const GR = { P: ['PERFECT', C.gold], D: ['BIG DRUM', '#ff6b6b'], G: ['GOOD', '#ffffff'], E: ['EARLY', '#c9c3df'], L: ['LATE', '#c9c3df'], X: ['THEIR DRUM', '#c9c3df'] };
    for (const k of [0, 1]) {
      const h = st.hitFx[k];
      if (!h || t - h.t > 0.45) continue;
      const a = 1 - (t - h.t) / 0.45, gr = GR[h.g] || GR.G, x = cx + (k === 0 ? -1 : 1) * (dr + 14 * s);
      ctx.globalAlpha = a; ctx.strokeStyle = gr[1]; ctx.lineWidth = 3 * s; circle(x, y, (9 + 10 * (1 - a)) * s); ctx.stroke();
      const word = h.g === 'P' && st.run[k] > 1 ? gr[0] + ' x' + st.run[k] : gr[0];
      text(word, cx + (k === 0 ? -1 : 1) * (dr + 60 * s), y + 34 * s, Math.round(14 * s), gr[1], 'center', 'body');
      ctx.globalAlpha = 1;
    }
  },
  // the tug meter (bottom band): the red bow slides toward whoever is winning; reach your own end to win
  drawMeter(st, big) {
    const s = big ? 1.4 : 1, hw = 150 * s, cx = W / 2, y = big ? 513 : 512;
    const lim = Math.max(1, tugLim(st)), f = clamp(st.ro / lim, -1, 1), mx = cx + f * hw;
    ctx.fillStyle = 'rgba(28,26,54,0.62)'; rr(cx - hw - 26 * s, y - 12 * s, 2 * hw + 52 * s, 24 * s, 12 * s); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(cx - hw, y - 3 * s, 2 * hw, 6 * s, 3 * s); ctx.fill();
    // dig-in zones: the last stretch before each end glows gold (the player about to lose digs in there)
    for (const k of [0, 1]) {
      const dz = clamp((st.K.digGap + st.K.helpDig * st.help[k]) / lim, 0, 1) * hw;
      ctx.fillStyle = 'rgba(255,197,61,0.45)'; ctx.fillRect(k === 0 ? cx + hw - dz : cx - hw, y - 3 * s, dz, 6 * s);
    }
    // fill from the middle to the bow in the leader's colour
    if (Math.abs(f) > 0.002) { ctx.fillStyle = PCOL[f < 0 ? 0 : 1]; ctx.fillRect(Math.min(cx, mx), y - 3 * s, Math.abs(mx - cx), 6 * s); }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 1, y - 6 * s, 2, 12 * s);
    // the ends: each player's little face (you win when the bow reaches yours)
    for (const k of [0, 1]) {
      const ex = cx + (k === 0 ? -1 : 1) * (hw + 13 * s), r = 8 * s;
      ctx.fillStyle = PCOL[k]; ctx.strokeStyle = PDARK[k]; ctx.lineWidth = 2; circle(ex, y, r); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; circle(ex - 2.6 * s, y - 1, 2 * s); ctx.fill(); circle(ex + 2.6 * s, y - 1, 2 * s); ctx.fill();
      ctx.fillStyle = C.ink; circle(ex - 2.6 * s, y - 0.6, 1 * s); ctx.fill(); circle(ex + 2.6 * s, y - 0.6, 1 * s); ctx.fill();
    }
    // the bow marker
    ctx.fillStyle = '#e8443a'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    circle(mx, y, 7 * s); ctx.fill(); ctx.stroke();
  },
};
// Tug of War sounds (prefix tug; pitch 1 Pip / 0.84 Bo for player sounds)
Sfx.extra.tugDrum = function () { this.tone(110, 0.14, 'sine', 0.045, 55); this.tone(220, 0.05, 'triangle', 0.025, 140); };   // every BOOM: the metronome (lead exception: 0.045)
Sfx.extra.tugFaster = function () { [523, 659, 784].forEach((f, i) => this.tone(f, 0.06, 'triangle', 0.035, null, i * 0.06)); };   // the beat steps up
Sfx.extra.tugTock = function () { this.tone(760, 0.03, 'square', 0.015); };                                              // half-way between beats
Sfx.extra.tugPerfect = function (p) { this.tone(880 * p, 0.08, 'triangle', 0.06); this.tone(1320 * p, 0.1, 'triangle', 0.05, null, 0.04); };
Sfx.extra.tugGood = function (p) { this.tone(660 * p, 0.08, 'triangle', 0.05); };
Sfx.extra.tugEarly = function (p) { this.tone(220 * p, 0.09, 'sawtooth', 0.03, 150 * p); };                                 // "Too early!" / "Late!" (at most 1 per 2 s per player)
Sfx.extra.tugTug = function (p) { this.tone(330 * p, 0.035, 'square', 0.02, 260 * p); };                                  // every tug (repeating: quiet)
Sfx.extra.tugLetGo = function (p) { this.tone(500 * p, 0.08, 'triangle', 0.04, 300 * p); };
Sfx.extra.tugGrab = function (p) { this.tone(300 * p, 0.06, 'triangle', 0.05, 520 * p); };
Sfx.extra.tugReach = function (p) { this.tone(300 * p, 0.06, 'triangle', 0.03, 520 * p); };                               // pull out of reach of the rope end (a soft grab)
Sfx.extra.tugCrate = function () { this.tone(1200, 0.12, 'sine', 0.035, 700); this.tone(900, 0.1, 'sine', 0.03, 600, 0.08); };
Sfx.extra.tugPlop = function () { this.tone(180, 0.12, 'sine', 0.05, 90); };
Sfx.extra.tugGet = function (p) { [660, 880, 1100].forEach((f, i) => this.tone(f * p, 0.07, 'triangle', 0.05, null, i * 0.05)); };
Sfx.extra.tugSpinach = function (p) { this.tone(260 * p, 0.25, 'square', 0.04, 520 * p); };
Sfx.extra.tugTickle = function (p) { for (let i = 0; i < 6; i++) this.tone((i % 2 ? 900 : 1200) * p, 0.05, 'triangle', 0.035, null, i * 0.07); };   // pitch of the TICKLED player
Sfx.extra.tugBigDrum = function (p) { this.tone(90, 0.2, 'sine', 0.08, 45); this.tone(700 * p, 0.08, 'square', 0.04, 350 * p); };
Sfx.extra.tugDig = function (p) { this.tone(392 * p, 0.08, 'triangle', 0.05); this.tone(523 * p, 0.12, 'triangle', 0.05, null, 0.07); };
Sfx.extra.tugSpread = function () { this.tone(140, 0.4, 'sawtooth', 0.03, 90); };
Sfx.extra.tugWhoosh = function () { this.tone(900, 0.25, 'sawtooth', 0.025, 200); };
Sfx.extra.tugSplash = function () { this.tone(220, 0.3, 'sawtooth', 0.06, 60); this.tone(120, 0.35, 'triangle', 0.08, 50, 0.03); };

