/* Pip & Bo - Computer opponent brain for 34-4 Longship Race (mode 'longshiprace'). */
'use strict';

(() => {
  /* 34-4 Longship Race (MODES.longshiprace): the computer rows its own ship, reading MODES.longshiprace.plan(st, id)
     (its speed, the drum beat, crests, what is ahead in each lane and where the other ship is). Versus brains use the
     Opponent setting (info.skill).
     ROWING: once a beat it picks a moment to stroke: on the beat (within 0.04 s) with chance Easy 55%, Normal 78%,
       Hard 93%, else 0.14-0.22 s off. Easy now and then gets excited and bursts three quick strokes (often a crab).
     CRESTS: when a crest is about to lift its stern it saves the stroke for the Surge window: Easy 20% of crests,
       Normal 50%, Hard 85%.
     STEERING: looks ahead Easy 160 px, Normal 240, Hard 320 and moves to the nearest clear lane; it decides once per
       hazard whether it noticed it (misses Easy 30%, Normal 10%, Hard 3%). A lane is kept for at least 0.3 s.
     RAMMING: Easy never rams. Normal rams when alongside in a gate; Hard rams whenever alongside, best toward a rock or
       whirlpool on the far side. BRACING: when the other ship is alongside and steering in, Normal braces half the
       time and Hard on time (hold the action). */
  const M = () => MODES.longshiprace;
  cpuBrain('longshiprace', {
    reset(S) { S.at = null; S.atN = -9; S.seen = {}; S.lane = null; S.laneT = 0; S.burst = 0; S.burstT = 5 + Math.random() * 5; S.tapCD = 0; S.brace = 0; S.ramT = 0; S.crestPick = {}; S.braceSeen = {}; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.pl || info.frozen || !st.c) return out;
      const sk = info.skill, easy = sk < 0.5, hard = sk > 0.9;
      const look = easy ? 160 : hard ? 320 : 240, pl = M().plan(st, p.id, look), P = st.pl[p.id], LR = M().LR;
      const recent = P.strokes.filter(t => st.t - t < LR.crabT).length;
      S.laneT -= dt; S.tapCD -= dt; S.burstT -= dt; S.ramT -= dt;
      // ---- bracing: hold the action while the shield wall is wanted
      const O = pl.other, along = Math.abs(O.dx) < LR.len * 0.8, inbound = along && Math.abs(O.ly - O.lane) > 0.05 && Math.abs(O.lane - P.lane) === 0;
      if (inbound && !easy && pl.braceCD <= 0) {
        const key = st.round + ':' + Math.round(st.t * 2);
        if (S.braceSeen[key] === undefined) S.braceSeen[key] = hard || Math.random() < 0.5;
        if (S.braceSeen[key]) S.brace = 0.6;
      }
      if (S.brace > 0) { S.brace -= dt; out.act = true; return out; }
      // ---- steering
      const notice = a => { if (!a || !a.q) return false; const id = st.round + ':' + a.q.i; if (S.seen[id] === undefined) S.seen[id] = Math.random() > (easy ? 0.3 : hard ? 0.03 : 0.1); return S.seen[id]; };
      const bad = l => {
        const a = pl.ahead[l];
        if (!a || a.d > look) return false;
        if (a.kind === 'whale') return P.v < 150 && notice(a);
        return notice(a);
      };
      let want = P.lane;
      if (bad(P.lane) || !pl.safe.includes(P.lane) && pl.safe.length && pl.ahead[P.lane] && notice(pl.ahead[P.lane])) {
        const opts = [0, 1, 2, 3].filter(l => !bad(l) && (pl.safe.includes(l) || !pl.safe.length)).sort((a, b) => (Math.abs(a - P.lane) - Math.abs(b - P.lane)) || (Math.abs(a - 1.5) - Math.abs(b - 1.5))); // nearest first; a tie goes to the middle (not always "up", which sent Pip's ship to the edge and Bo's to the middle)
        if (opts.length) want = opts[0];
      }
      // ---- ramming
      if (!easy && S.ramT <= 0 && want === P.lane && Math.abs(O.dx) < LR.len * 0.5 && Math.abs(O.lane - P.lane) === 1 && Math.abs(O.ly - O.lane) < 0.1 && !O.brace) {
        const push = O.lane - P.lane, beyond = O.lane + push;
        const goodSpot = beyond < 0 || beyond > 3 || pl.ahead[beyond] && (pl.ahead[beyond].kind === 'rock' || pl.ahead[beyond].kind === 'whirl' || pl.ahead[beyond].kind === 'stack');
        if (hard ? true : !!pl.gate && Math.random() < 0.5) { if (hard || goodSpot || pl.gate) { want = O.lane; S.ramT = 2.5; } }
        else S.ramT = 1.5;
      }
      if (S.lane === null || S.laneT <= 0) { if (want !== S.lane) S.laneT = 0.3; S.lane = want; }
      // (steering is locked while spun, crashed or braced: no key flicker then)
      const canSteer = P.spin <= 0 && P.stop <= 0 && P.brace <= 0 && Math.abs(P.ly - P.lane) < 0.2;
      if (canSteer && S.lane < P.lane) out.up = !(CPU.last[p.id] || {}).up;
      else if (canSteer && S.lane > P.lane) out.down = !(CPU.last[p.id] || {}).down;
      // ease off behind a hazard it can't steer round
      if (!pl.safe.length && pl.ahead[P.lane] && pl.ahead[P.lane].d < 120 && pl.ahead[P.lane].kind !== 'floe' && !easy) out.left = true;
      // ---- rowing
      if (pl.crab > 0 || pl.stop > 0 || pl.pen > 0) return out;
      if (S.burst > 0) { if (S.tapCD <= 0) { out.act = 'tap'; S.tapCD = 0.08; S.burst--; } return out; }
      if (easy && S.burstT <= 0) { S.burst = 3; S.burstT = 5 + Math.random() * 6; return out; }
      if (!easy && !hard && S.burstT <= 0) { if (Math.random() < 0.12) S.burst = 3; S.burstT = 9 + Math.random() * 6; }
      // a crest: save the stroke for the surge
      if (pl.crest) {
        const go = S.crestPick[st.round + ':' + Math.floor(st.t)] !== undefined ? S.crestPick[st.round + ':' + Math.floor(st.t)] : (S.crestPick[st.round + ':' + Math.floor(st.t)] = Math.random() < (easy ? 0.2 : hard ? 0.85 : 0.5));
        if (go && S.tapCD <= 0 && recent < 2) { out.act = 'tap'; S.tapCD = 0.2; return out; }
      }
      // once a beat: plan the moment, then stroke when it comes
      const b = pl.beat;
      const nextN = b.counted ? b.n + 1 : b.n;
      if (S.atN !== nextN) {
        S.atN = nextN;
        const hit = Math.random() < (easy ? 0.55 : hard ? 0.93 : 0.78);
        S.at = hit ? (Math.random() - 0.5) * 0.08 : (Math.random() < 0.5 ? -1 : 1) * (0.14 + Math.random() * 0.08);
      }
      const tNow = st.t - nextN * LR.beat; // s from that beat
      if (!b.counted && tNow >= S.at && S.tapCD <= 0 && recent < 2) { out.act = 'tap'; S.tapCD = 0.3; }
      return out;
    },
  });
})();
