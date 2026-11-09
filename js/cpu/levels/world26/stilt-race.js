/* Pip & Bo - Computer opponent brain for 26-4 Stilt Race (mode 'stiltrace'). */
'use strict';

(() => {
  /* 26-4 Stilt Race (MODES.stiltrace): balances like a person would, with a lean it aims for and a reaction delay.
     It reads its own racer (lean, wobble speed) through cpuLag (what it saw a moment ago), pushes ▶ or ◀ to steer the
     lean toward its target (Easy 0.26, Normal 0.36, Hard 0.44 of a 0.5 green zone), and windmills its arms (the action)
     when the wobble gets fast or on a slippery spill. It hops (▲) popcorn boxes and ducks and ducks (▼) under bunting,
     reading the course ahead like a person sees it. Easy reacts slowly, sometimes misses a hop or a duck, and now and
     then wobbles its push; Hard reacts in about 0.12 s and rarely misses. */
  cpuBrain('stiltrace', {
    reset(S) { S.miss = {}; S.wob = 0; S.wobT = 0; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.pl || !G.match || G.match.phase !== 'live') return out;
      const D = st.pl[p.id], sk = info.skill;
      if (D.st !== 'walk' || D.done) return out;
      const lag = 0.12 + (1 - sk) * 0.35;
      const a = cpuLag(S, 'a', D.a, lag), av = cpuLag(S, 'av', D.av, lag);
      const target = 0.26 + (sk - 0.35) / 0.65 * 0.18 - (D.slip ? 0.1 : 0);
      // Easy and Normal sometimes push a little wrong for a moment
      S.wobT -= dt;
      if (S.wobT <= 0) { S.wobT = 1 + Math.random() * 3; S.wob = Math.random() < (1 - sk) * 0.6 ? (Math.random() < 0.5 ? -1 : 1) : 0; }
      const u = 3.2 * (target - a) - 0.9 * av + (S.wob && S.wobT > 0.6 + Math.random() * 0 ? S.wob * 0.2 : 0);
      if (u > 0.05) out.right = true; else if (u < -0.05) out.left = true;
      if ((Math.abs(av) > 1.1 || D.slip || a > 0.58) && D.cd <= 0 && Math.random() < 0.3 + sk * 0.7) out.act = 'tap';
      // hop and duck
      for (const ob of st.course.obs) {
        if (ob.k === 's' || D.hit[ob.x]) continue;
        const d = ob.x - D.x;
        if (d < -10) continue;
        if (d > 300) break;
        if (!(ob.x in S.miss)) S.miss[ob.x] = Math.random() < (1 - sk) * 0.4;
        if (S.miss[ob.x]) break;
        const v = Math.max(60, D.v);
        if ((ob.k === 'p' || ob.k === 'd') && d / v < 0.1) out.jump = 'tap';
        if (ob.k === 'b' && d / v < 0.4) out.down = true;
        break;
      }
      return out;
    },
  });
})();
