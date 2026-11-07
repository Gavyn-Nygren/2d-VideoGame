/* Pip & Bo - Computer partner brain for 19-4 Quick-Draw Showdown (mode 'quickdraw'). */
'use strict';

(() => {
  /* The computer is the other duelist. It presses the same keys a person does: the action to fire, ◀ ▶ to move the aim
     marker in bandit rounds.
     Waiting: it never presses during the pacing. Each fakeout it notices (the Mayor's DRAWER!, a CAW!, a CLONK!...) may
     fool it: Easy falls for about 16% of them, Normal 6%, Hard 2%. A fooled computer presses a reaction time after the
     fakeout, which is a foul like anybody's.
     DRAW!: it fires one reaction time after the gold DRAW! (drawn fresh each round from a bell curve: Easy about
     0.55 s ± 0.08, Normal 0.30 s ± 0.045, Hard 0.21 s ± 0.025, never below its floor), so even a young kid (about 0.4-0.5 s)
     beats Easy more often than not.
     Bandit rounds: after that reaction time, plus a moment to spot which cutout is the bandit, it taps ◀ or ▶ one spot
     at a time like a person (Easy about 0.24 s a step, Hard 0.10 s), then fires after a short check. Easy sometimes
     picks a friend by mistake (about 10%, Normal 4%, Hard never), which is a foul.
     What it reads: the round's phase, the fakeouts once they have happened, the DRAW! moment once it has happened, and in
     bandit rounds where the bandit stands once the cutouts are up (what a person sees on screen). Never the future
     DRAW! time or the other player's keys.
     It talks (1-player mode only) in short bubbles: a nervous word after a fakeout, a cheer or a "Nice draw!". */
  const SK = {
    easy: { react: 0.55, sd: 0.08, min: 0.40, fall: 0.16, spot: 0.16, stepT: 0.24, confirm: 0.14, wrong: 0.12 },
    normal: { react: 0.30, sd: 0.045, min: 0.22, fall: 0.06, spot: 0.08, stepT: 0.15, confirm: 0.07, wrong: 0.04 },
    hard: { react: 0.21, sd: 0.025, min: 0.17, fall: 0.02, spot: 0.05, stepT: 0.10, confirm: 0.04, wrong: 0 },
  };
  const skOf = s => (s <= 0.4 ? SK.easy : s < 0.9 ? SK.normal : SK.hard);
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.5;   // about -3..3, sd 1
  const T = () => MODES.quickdraw.test;
  const reactOf = sk => Math.max(sk.min, sk.react + gauss() * sk.sd);

  cpuBrain('quickdraw', {
    // the computer duels on by itself; a person who walked away just loses the rounds (nothing gets stuck)
    noIdleStop: true,
    bubbleHidden: true,
    bubblePos(p) {
      const st = G.mst;
      if (!st || !st.cam || !st.pl) return null;
      const s = T().toScreen(st.cam, T().stance(st, p.id).x, T().QD.feetY - 84);
      return s.x < 0 || s.x > W || s.y < 0 || s.y > H ? null : s;
    },
    reset(S) { S.pl = null; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst, m = G.match;
      if (!st || !st.pl || !m) return out;
      const sk = skOf(info.skill), me = st.pl[p.id];
      // a new round (the level makes fresh duelists every round)
      if (S.pl !== st.pl) {
        S.pl = st.pl; S.seen = {}; S.pressAt = null; S.plan = null; S.hold = 0; S.dir = 0; S.saidEnd = false; S.said = {};
      }
      if (info.frozen) {
        if (m.phase === 'end' && m.end && !S.saidEnd) {
          S.saidEnd = true;
          if (m.end.winner === p.id) cpuSay(p, me.foul ? 'Phew!' : 'Yee-haw!');
          else if (m.end.winner === o.id) cpuSay(p, me.foul ? 'Oops! Too quick!' : 'Nice draw!');
        }
        return out;
      }
      if (me.foul || me.raw != null) return out;
      // the round is decided: in a plain draw it still fires on time (a slow time on the board), nothing else
      if (st.res) {
        if (st.ph === 'done' && !st.target && S.plan && S.plan.fireAt != null && st.rt >= S.plan.fireAt) out.act = 'tap';
        return out;
      }
      // the wait: fakeouts may fool it (decided once per fakeout, when it happens)
      if (st.ph === 'wait') {
        for (const f of st.fakes) {
          if (!f.done || S.seen[f.id]) continue;
          S.seen[f.id] = true;
          if (Math.random() < sk.fall && S.pressAt == null) S.pressAt = st.rt + reactOf(sk) * 0.85;
          else if (!S.said.calm && Math.random() < 0.5) { S.said.calm = 1; cpuSay(p, f.kind === 'word' ? 'Not DRAW!' : 'Steady...'); }
        }
        if (S.pressAt != null && st.rt >= S.pressAt) out.act = 'tap';
        return out;
      }
      if (st.ph !== 'draw') return out;
      // DRAW!: plan the shot once
      if (!S.plan) {
        const r = reactOf(sk), plan = { fireAt: null, stepAt: null, goal: 1 };
        if (st.target) {
          plan.goal = st.bandit;
          if (Math.random() < sk.wrong) { const others = [0, 1, 2].filter(i => i !== st.bandit); plan.goal = others[Math.floor(Math.random() * 2)]; }
          plan.stepAt = st.drawAt + r + sk.spot;
        } else plan.fireAt = st.drawAt + r;
        S.plan = plan;
      }
      const plan = S.plan;
      if (st.target) {
        if (S.hold > 0) { S.hold -= dt; out.left = S.dir < 0; out.right = S.dir > 0; return out; }
        if (me.aim !== plan.goal) {
          if (st.rt >= plan.stepAt) { S.dir = plan.goal < me.aim ? -1 : 1; S.hold = 0.035; plan.stepAt = st.rt + sk.stepT * (0.8 + Math.random() * 0.4); out.left = S.dir < 0; out.right = S.dir > 0; }
          return out;
        }
        if (plan.fireAt == null) plan.fireAt = Math.max(st.rt, plan.stepAt) + sk.confirm * (0.7 + Math.random() * 0.6);
      }
      if (plan.fireAt != null && st.rt >= plan.fireAt) out.act = 'tap';
      return out;
    },
  });
})();
