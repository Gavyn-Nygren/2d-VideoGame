/* Pip & Bo - Computer opponent brain for 31-4 Snail Race (mode 'snailrace'). */
'use strict';

(() => {
  /* 31-4 Snail Race (MODES.snailrace): the computer races its own lane, reading MODES.snailrace.plan(st, id) (its
     speed, the line, its nerves, and what lies on each of its 3 paths). It sees only its own lane, like a person.
     SPEED: it taps toward a target just under the line: Easy 80%, Normal 88%, Hard 94% of it, no faster than one tap
       every 0.2 / 0.14 / 0.1 s, and it re-decides after a reaction lag (Easy 0.3 s, Normal 0.18 s, Hard 0.1 s). Normal
       and Hard ease off before a downhill or a puddle; Easy doesn't, and now and then gets excited and mashes a burst
       (Easy about every 7 s, Normal rarely), which often ends in the shell.
     STEERING: it looks ahead (Easy 160 px, Normal 240, Hard 320) and moves to the nearest clear path. It decides once
       per thing whether it noticed it: Easy misses 35% of pebbles and bugs, Normal 12%, Hard 3%. Hard also steers round
       leaves; Easy never does.
     Versus brains use the Opponent setting (info.skill). */
  const M = () => MODES.snailrace;
  cpuBrain('snailrace', {
    reset(S) { S.tapT = 0; S.think = 0; S.want = 0; S.row = -1; S.burst = 0; S.burstT = 4 + Math.random() * 6; S.seen = {}; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.pl || info.frozen) return out;
      const sk = info.skill, easy = sk < 0.5, hard = sk > 0.9;
      const P = st.pl[p.id], look = easy ? 160 : hard ? 320 : 240, pl = M().plan(st, p.id, look);
      S.tapT -= dt; S.think -= dt; S.burstT -= dt;
      const lag = easy ? 0.3 : hard ? 0.1 : 0.18, gap = easy ? 0.2 : hard ? 0.1 : 0.14;
      if (S.think <= 0) {
        S.think = lag * (0.7 + Math.random() * 0.6);
        let target = pl.line * (easy ? 0.8 : hard ? 0.94 : 0.88);
        if (!easy && pl.slope < -0.2) target -= hard ? 34 : 22;
        const pud = pl.ahead[P.row];
        if (!easy && pud && pud.kind === 'puddle' && pud.d < 160) target = Math.min(target, pl.line - 60);
        S.want = target;
        // steering: the nearest path that's clear of the things it noticed
        const notice = q => { if (!q) return false; const id = q.q.i; if (S.seen[id] === undefined) S.seen[id] = Math.random() > (easy ? 0.35 : hard ? 0.03 : 0.12); return S.seen[id]; };
        const bad = r => { const a = pl.ahead[r]; if (!a || a.d > look || a.d < -40) return false; if (a.kind === 'leaf') return !easy && (hard || Math.random() < 0.5); if (a.kind === 'puddle') return hard && P.v > pl.line - 50; return notice(a); };
        if (bad(P.row)) {
          const opts = [0, 1, 2].filter(r => !bad(r)).sort((a, b) => Math.abs(a - P.row) - Math.abs(b - P.row));
          S.row = opts.length ? opts[0] : P.row;
        } else S.row = P.row;
        if (easy && S.burstT <= 0) { S.burst = 5 + Math.floor(Math.random() * 4); S.burstT = 5 + Math.random() * 5; }
        if (!easy && !hard && S.burstT <= 0) { if (Math.random() < 0.15) S.burst = 4; S.burstT = 8 + Math.random() * 6; }
      }
      if (S.row >= 0 && S.row !== P.row && P.hide <= 0) { if (S.row < P.row) out.up = !(CPU.last[p.id] || {}).up; else out.down = !(CPU.last[p.id] || {}).down; }
      if (P.hide <= 0 && P.munch <= 0 && S.tapT <= 0) {
        if (S.burst > 0) { out.act = 'tap'; S.tapT = 0.07; S.burst--; }
        else if (P.v < S.want - 6 && !(P.nerve > 0.4)) { out.act = 'tap'; S.tapT = gap * (0.85 + Math.random() * 0.3); }
      }
      return out;
    },
  });
})();
