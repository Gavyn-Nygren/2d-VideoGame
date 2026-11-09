/* Pip & Bo - Computer partner brain for 23-4 Pie-Eating Contest (mode 'pieeat'). */
'use strict';

(() => {
  /* The computer is the other eater. It presses the same buttons a person does: a fresh action press bites, a fresh
     ▲ (jump) gulps.
     What it reads: what is on screen for its own eater: the cheek ring (how full its cheeks are and the clap circle,
     so when the next clap comes), its hiccup jar, its plate. It never reads the other player's buttons.
     Biting: it keeps a steady munch with a gap between bites (Hard about 0.26 s, Normal 0.31 s, Easy 0.56 s, each
       with a little wobble) and never bites with full cheeks or while it is swallowing. Hard and Normal also watch
       the hiccup jar and wait when one more bite could fill it.
     Gulping: it plans a gulp for the next clap once its cheeks hold enough (Hard 1 bite, Normal 2, Easy 3) and presses
       ▲ at the clap plus a timing error (Hard about ±0.045 s, Normal ±0.08 s, Easy ±0.18 s and a bit late), so Hard
       nearly always gets the GULP!, Easy often gets a "Glug!".
     Mistakes (Easy, a little Normal): over-excited bursts of fast bites (Easy about once every 7 s: 3-5 bites
       0.12-0.17 s apart, which often brings the hiccups), forgetting a clap (Easy one in four, Normal one in twenty)
       and short lapses with hands off. Easy is tuned so a calm kid beats it most rounds and a slow or random-pressing
       young kid still takes about a quarter of the rounds (tools/w23/pieeat-break.js).
     It keeps playing if the person walks away (noIdleStop: the person just loses those rounds).
     It talks (1-player mode only) in short bubbles: "Nom nom!", "Hic!", "Yum!", "Good munching!". */
  const SK = {
    easy: { gap: 0.56, gapSd: 0.09, need: 3, jit: 0.18, bias: 0.04, burst: 0.15, burstN: [3, 5], burstGap: [0.12, 0.17], forget: 0.25, lapse: 0.1, lapseT: 0.9, watch: false },
    normal: { gap: 0.31, gapSd: 0.035, need: 2, jit: 0.08, bias: 0.02, burst: 0.035, burstN: [2, 4], burstGap: [0.15, 0.2], forget: 0.05, lapse: 0.03, lapseT: 0.6, watch: true },
    hard: { gap: 0.26, gapSd: 0.01, need: 1, jit: 0.045, bias: 0.01, burst: 0, burstN: [0, 0], burstGap: [0.2, 0.2], forget: 0.03, lapse: 0, lapseT: 0, watch: true },
  };
  const skOf = s => (s <= 0.4 ? SK.easy : s < 0.9 ? SK.normal : SK.hard);
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.5;
  const T = () => MODES.pieeat.test;

  cpuBrain('pieeat', {
    // the computer eats on by itself; a person who walked away just loses the rounds (nothing gets stuck)
    noIdleStop: true,
    bubbleHidden: true,
    bubblePos(p) { return { x: p.x + p.w / 2, y: 196 }; },
    reset(S) { S.pl = null; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst, m = G.match;
      if (!st || !st.pl || !m) return out;
      const sk = skOf(info.skill), me = st.pl[p.id], q = T().PIEEAT;
      if (S.pl !== st.pl) {
        S.pl = st.pl; S.nextBite = sk.gap * (0.6 + Math.random() * 0.8); S.gulpAt = null; S.planClap = -1; S.burst = 0;
        S.lapse = 0; S.saidEnd = false; S.lastHic = me.hicN; S.lastStreak = 0; S.biteT = 9;
      }
      if (info.frozen) {
        if (m.phase === 'end' && m.end && !S.saidEnd) {
          S.saidEnd = true;
          if (m.end.winner === p.id) cpuSay(p, 'Yum! I win!');
          else if (m.end.winner === o.id) cpuSay(p, 'Good munching!');
        }
        return out;
      }
      if (me.done || st.ph !== 'eat') return out;
      if (me.hicN > S.lastHic) { S.lastHic = me.hicN; cpuSay(p, 'Hic! Oops!'); }
      if (me.streak >= 3 && me.streak > S.lastStreak && Math.random() < 0.4) cpuSay(p, 'Nom nom!');
      S.lastStreak = me.streak;
      S.biteT += dt;
      // a lapse: hands off for a moment (Easy, a little Normal)
      if (S.lapse > 0) { S.lapse -= dt; return out; }
      if (sk.lapse && Math.random() < sk.lapse * dt) { S.lapse = sk.lapseT * (0.6 + Math.random() * 0.8); return out; }
      const per = T().per(st), ph = st.bph;
      // the next clap: how soon (s) and its number
      const nextN = Math.max(1, Math.floor(ph) + 1), toClap = (nextN - ph) * per;
      const busy = me.hicT > 0 || me.gulpT > 0;
      // the gulp: plan one for the next clap once the cheeks hold enough (or will by then)
      if (S.planClap !== nextN && S.gulpAt == null) {
        const willHave = me.cheeks + Math.max(0, Math.floor((toClap - 0.05) / Math.max(0.12, sk.gap)));
        const enough = me.cheeks >= sk.need || Math.min(q.cap, willHave) >= sk.need || (me.left <= 0 && me.cheeks > 0);
        if (enough && toClap < 0.6) {
          S.planClap = nextN;
          if (Math.random() < sk.forget) S.gulpAt = null;
          else S.gulpAt = st.rt + toClap + sk.bias + gauss() * sk.jit;
        }
      }
      if (S.gulpAt != null && st.rt >= S.gulpAt) {
        S.gulpAt = null;
        if (!busy && me.cheeks > 0) out.jump = 'tap';
      }
      // a burst of over-excited bites (Easy, a little Normal)
      if (S.burst <= 0 && sk.burst && Math.random() < sk.burst * dt && me.cheeks < q.cap) {
        S.burst = sk.burstN[0] + Math.floor(Math.random() * (sk.burstN[1] - sk.burstN[0] + 1));
      }
      // biting
      if (!busy && me.left > 0 && me.swapT <= 0 && !out.jump) {
        const gap = S.burst > 0 ? sk.burstGap[0] + Math.random() * (sk.burstGap[1] - sk.burstGap[0]) : S.nextGap || sk.gap;
        let ok = S.biteT >= gap && (me.cheeks < q.cap || (S.burst > 0 && !sk.watch));
        // careful eaters: don't bite when a gulp is due right now, or when the jar could fill
        if (ok && sk.watch) {
          let add = 0;
          for (const [g, a] of q.fast) if (S.biteT < g) { add = a; break; }
          if (me.H + add > 0.88) ok = false;
          if (me.cheeks >= q.cap) ok = false;
          if (S.gulpAt != null && S.gulpAt - st.rt < 0.04) ok = false;
        }
        if (ok) {
          out.act = 'tap'; S.biteT = 0; S.nextGap = Math.max(0.1, sk.gap + gauss() * sk.gapSd);
          if (S.burst > 0) S.burst--;
        }
      }
      return out;
    },
  });
})();
