/* Pip & Bo - Computer partner brain for 11-3 Hurdle Dash (mode 'hurdles'). */
'use strict';

(() => {
  /* The computer races like a person: it holds ▶ and taps jump when its feet reach the gold zone painted before the
     next hurdle (the zone a person sees; it is worked out from the runner's own speed, MODES.hurdles.win). It never
     reads anything a person can't see: its own spot and speed, the hurdles, the zone, the finish line.
       timing     each hurdle it aims for the middle of the gold with a human-like error: a habit this race (a little
                  early or a little late every time) plus a fresh wobble per hurdle. Easy wobbles most (about half its
                  jumps are speed bursts, a few clip) and now and then forgets to jump at all; Hard is nearly always on
                  the gold.
       start      Normal and Hard already hold ▶ in the 3-2-1 (as a person who knows can); Easy starts a moment after GO.
       lapses     Easy sometimes lets go of ▶ for a moment (a kid looking at the crowd).
       dip        near the line it presses dip so the lean peaks as the chest reaches the tape (Easy only sometimes, and
                  loosely timed).
     The same code drives Pip and Bo, so there is no side bias. Golden spikes help the computer the same way as a person
     (a wider gold zone). It keeps racing when the person stops pressing (noIdleStop): a race against nobody ends.
     Tuning (QA, scripted people): a kid-like player (timing spread 0.09 s, a few forgotten jumps and lapses) beats Easy
     about 4 times in 5; a steady adult (0.045 s) beats Normal about 3 in 4 and Hard about 1 in 16; a good player
     (0.035 s) beats Hard about 1 in 3. */
  const SK = { // timing spread and habit (s), forget chance per hurdle, start delay (s), holds ▶ in the countdown,
    //            lapses per s, dip chance per race, dip timing spread (s)
    easy: { sig: 0.1, bias: 0.04, miss: 0.08, react: 0.45, preHold: false, lapse: 0.06, dipP: 0.3, dipSig: 0.1 },
    normal: { sig: 0.05, bias: 0.015, miss: 0.012, react: 0.2, preHold: true, lapse: 0, dipP: 0.75, dipSig: 0.05 },
    hard: { sig: 0.034, bias: 0.01, miss: 0, react: 0.14, preHold: true, lapse: 0, dipP: 0.95, dipSig: 0.025 },
  };
  const skOf = s => (s <= 0.4 ? SK.easy : s < 0.9 ? SK.normal : SK.hard);
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 2;   // about N(0, 1), cheap

  function newRace(S, sk) {
    S.bias = gauss() * sk.bias; S.plan = null; S.lapse = 0; S.dipWant = Math.random() < sk.dipP; S.dipAt = gauss() * sk.dipSig; S.dipped = false;
    S.goT = null;
  }

  cpuBrain('hurdles', {
    noIdleStop: true,
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst, m = G.match, LM = MODES.hurdles;
      if (!st || !st.run || !m) return out;
      const k = p.id, r = st.run[k], sk = skOf(info.skill);
      // a new race (resetRound made fresh runners)
      if (S.r !== r) { S.r = r; newRace(S, sk); }
      if (m.phase === 'count' || m.phase === 'ready') { out.right = sk.preHold && m.phase === 'count'; return out; }
      if (m.phase !== 'live') return out;
      if (S.goT == null) S.goT = st.t;
      // run (Easy: a moment late off the blocks, and a short lapse now and then)
      if (!sk.preHold && st.t - S.goT < sk.react) return out;
      if (S.lapse > 0) { S.lapse -= dt; return out; }
      if (sk.lapse && r.fin == null && st.t > 2 && cpuChance(sk.lapse, dt)) { S.lapse = 0.25 + Math.random() * 0.3; return out; }
      out.right = true;
      if (r.fin != null) return out;
      const w = LM.wind(st, r.x), g = r.air ? r.vAir : LM.gsp(r.v, w);
      // the next hurdle: plan the press once (a habit plus a wobble), then tap when the feet reach that spot
      const ob = st.obs[r.next];
      if (ob && !r.air && g > 30) {
        if (!S.plan || S.plan.i !== r.next) S.plan = { i: r.next, err: S.bias + gauss() * sk.sig, miss: Math.random() < sk.miss, done: false };
        const z = LM.win(st, ob, g, k), tt = (ob.x - r.x - z.c) / g;   // seconds until the middle of the gold
        if (!S.plan.miss && !S.plan.done && tt <= S.plan.err && ob.x - r.x > 0) { out.jump = 'tap'; S.plan.done = true; }
      }
      // the dip: after the last hurdle, timed so the lean peaks at the line
      if (!ob && S.dipWant && !S.dipped && r.dipCD <= 0) {
        const tl = (st.len - LM.chest(r) - LM.K.dipLean) / Math.max(60, g);
        if (tl <= LM.K.dipT / 2 + S.dipAt) { out.act = 'tap'; S.dipped = true; }
      }
      // a few words in 1-player mode
      const lg = st.lastGrade[k];
      if (lg && lg.t !== S.saidT) {
        S.saidT = lg.t;
        if (lg.grade === 'P' && r.streak === 3) cpuSay(p, 'Zoom!', 1.2);
        else if (lg.grade === 'K' && Math.random() < 0.5) cpuSay(p, 'Oopsie!', 1.2);
      }
      return out;
    },
  });
})();
