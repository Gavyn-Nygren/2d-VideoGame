/* Pip & Bo - computer brain for 18-4 Plank Duel (mode 'plankduel'). */
'use strict';

(() => {
  /* The computer is the other duellist and presses the same keys a person does: ◀ ▶ to step, ▼ held for the low guard
     (and low swings), the action to swing (held on to charge a lunge), jump to hop.
     What it reads, all of it on the screen for a person too: where both stand, how much plank is behind each, the
     other's stance (high or crouched), whether their sword is winding up and at which height, charging, lunging,
     wobbling after a block, hopping or teetering. It sees the other as they were a reaction time ago (cpuLag): Easy
     about 0.5 s (slower than a wind-up, so it mostly guesses), Normal about 0.27 s, Hard about 0.15 s. Nothing else
     about the other player's keys or the level's random numbers.
     Defending: when it sees a swing coming it guards that height, now and then misreads it (Easy often) or hops over a
     low one. It doesn't start a swing of its own into a wind-up it can see, but it attacks a charger (they can't block).
     Attacking: in reach and not threatened, it swings at the height the other ISN'T guarding (Easy often just picks
     one), punishes a wobble or a hop (a high swing), answers a block with a quick riposte, and on Normal and Hard can
     feint (start at one height, switch once the other has matched it) or charge a lunge when the other is near their
     end or wobbling. It steps in to just inside reach, and teeters back to safety ("Phew!") after its reaction time.
     Easy also dawdles. Bubbles only in 1-player mode. */
  const SK = {
    easy: { react: 0.5, jit: 0.12, misread: 0.3, smart: 0.45, feint: 0, lunge: 0.04, hop: 0.15, punish: 0.3, riposte: 0.25, aggro: 0.7, dawdle: 0.35, aimAir: 0.2 },
    normal: { react: 0.27, jit: 0.05, misread: 0.12, smart: 0.75, feint: 0.15, lunge: 0.1, hop: 0.2, punish: 0.7, riposte: 0.6, aggro: 1.1, dawdle: 0.05, aimAir: 0.6 },
    hard: { react: 0.15, jit: 0.025, misread: 0.06, smart: 0.88, feint: 0.28, lunge: 0.14, hop: 0.22, punish: 0.92, riposte: 0.9, aggro: 1.4, dawdle: 0, aimAir: 0.9 },
  };
  const skOf = s => (s <= 0.4 ? SK.easy : s < 0.9 ? SK.normal : SK.hard);
  const T = () => MODES.plankduel.test;
  const other = h => (h === 'hi' ? 'lo' : 'hi');
  // what a person can see of a duellist
  const look = D => {
    const sw = D.sw, coming = !!sw && (sw.state === 'wind' || sw.state === 'charge' || sw.state === 'lunge');
    return { x: D.x, stance: D.stance, air: D.air && D.y > 4, swH: coming ? sw.h : null, swId: sw ? sw.id : 0, charging: !!sw && sw.state === 'charge',
      lunging: !!sw && sw.state === 'lunge', wobble: D.rattle > 0, stun: D.stun > 0, teeter: D.teeter > 0, fall: !!D.fall };
  };

  cpuBrain('plankduel', {
    // a versus opponent plays on by itself (an idle person just gets bonked off)
    noIdleStop: true,
    bubbleHidden: true,
    bubblePos(p) {
      const st = G.mst, D = st && st.d && st.d[p.id];
      if (!D || D.fall) return null;
      return { x: D.x, y: PLANKDUEL.PY - D.y - 128 };
    },
    reset(S) { S.round = -1; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst, m = G.match;
      if (!st || !st.d || !m) return out;
      const me = st.d[p.id], op = st.d[o.id], sk = skOf(info.skill), P = T().PLANKDUEL;
      if (info.frozen) {
        if (m.phase === 'end' && m.end && !S.saidEnd) {
          S.saidEnd = true;
          if (me.fall) cpuSay(p, 'Whoopsie! Splash!');
          else if (m.end.winner === p.id) cpuSay(p, m.end.final ? 'Arr! I win the match!' : 'Arr! That round\'s mine!');
          else if (m.end.winner === o.id) cpuSay(p, 'Nice sword work!');
        }
        if (m.phase === 'count' && !S.saidGo && st.round === 1) { S.saidGo = true; cpuSay(p, 'En garde!'); }
        return out;
      }
      // a new round: fresh plans
      if (S.round !== st.round || S.lt > st.lt) {
        S.round = st.round; S.saidEnd = false; S.saidGo = false;
        S.react = Math.max(0.08, sk.react + (Math.random() - 0.5) * 2 * sk.jit);
        S.resp = null; S.cool = 0.4 + Math.random() * 0.6; S.plan = null; S.dawdle = 0; S.charge = 0; S.lastSwId = 0;
        cpuLagReset(S, 'op');
      }
      S.lt = st.lt;
      if (me.fall) return out;
      const seen = cpuLag(S, 'op', look(op), S.react);
      const dist = Math.abs(op.x - me.x), dirIn = me.k ? -1 : 1;   // the way to the other (and to the middle)
      const myRoom = T().room(st, me), opRoom = T().room(st, op);
      S.cool -= dt; S.dawdle -= dt;
      const step = d => { out.right = d * dirIn > 0; out.left = d * dirIn < 0; };   // +1 = toward the other, -1 = away
      // teetering at the end: step back toward the middle (once it has noticed)
      if (me.teeter > 0) { S.teeterT = (S.teeterT || 0) + dt; if (S.teeterT >= S.react * 0.8) step(1); return out; }
      S.teeterT = 0;
      let guard = S.guard || 'hi';
      // --- my own swing in progress: keep the plan (feint switch, charge, release)
      if (me.sw && me.sw.state !== 'rec') {
        const sw = me.sw, pl = S.plan || {};
        let h = sw.h;
        if (sw.state === 'wind') {
          // a feint: once the other has matched my height, switch (while there is still time to)
          if (pl.feint && !pl.switched && seen.stance === h && !seen.air && sw.t > 0.1 && sw.t < sw.wind - 0.04) { h = other(h); pl.switched = true; }
          out.act = !!pl.lunge;
        } else if (sw.state === 'charge') {
          out.act = true;
          // let go once charged; early if a swing is coming at it (a charger can't block)
          if (sw.ct >= P.chargeT + 0.04 || (seen.swH && !seen.charging && Math.random() < sk.punish)) out.act = false;
          if (sw.ct >= P.chargeT + 0.04 && dist > P.lungeReach + P.lungeDash + 10) out.act = true; // (wait until they come closer)
          if (sw.ct > 1.6) out.act = false;
        }
        out.down = h === 'lo';
        S.guard = h;
        return out;
      }
      // --- defending: a swing it can see coming
      if (seen.swH && !seen.fall) {
        if (!S.resp || S.resp.id !== seen.swId || S.resp.h !== seen.swH) {
          const mis = Math.random() < sk.misread;
          S.resp = { id: seen.swId, h: seen.swH, want: mis ? other(seen.swH) : seen.swH, hop: seen.swH === 'lo' && !seen.charging && Math.random() < sk.hop };
        }
        // a charger can't block: bonk it first if it's in reach
        if (seen.charging && dist <= P.reach - 4 && T().free(me) && Math.random() < sk.punish * dt * 8) {
          const h = other(seen.stance);
          out.down = h === 'lo'; out.act = 'tap'; S.guard = h; S.plan = { h }; S.cool = 0.5;
          return out;
        }
        guard = S.resp.want;
        if (S.resp.hop && T().free(me) && seen.swH === 'lo' && dist < P.lungeReach + 40) { out.jump = 'tap'; S.resp.hop = false; }
        out.down = guard === 'lo';
        S.guard = guard;
        // keep out of reach a little when there is room behind
        if (dist > P.reach - 6 && dist < P.reach + 12 && myRoom > 60 && !seen.lunging) step(-1);
        return out;
      }
      S.resp = null;
      // --- between swings: guard where the other stands (a swing comes at their stance height)
      if (!S.guessT || S.guessT <= 0) {
        S.guessT = 0.5 + Math.random() * 0.8;
        // Easy holds one guard for a while; better players mirror the other's stance
        S.guessG = Math.random() < (sk.smart - 0.1) ? null : (Math.random() < 0.6 ? 'hi' : 'lo');
      }
      S.guessT -= dt;
      guard = S.guessG || seen.stance;
      if (seen.air) guard = 'hi';
      // --- attacking
      const free = T().free(me) && !me.air;
      if (free && dist <= P.reach - 6) {
        let go = false, h = null, lunge = false, feint = false;
        if (me.riposte > 0 && Math.random() < sk.riposte * dt * 30) go = true;                         // a quick riposte after a block
        else if ((seen.wobble || seen.stun) && Math.random() < sk.punish * dt * 12) go = true;            // punish a wobble
        else if (seen.air && Math.random() < sk.aimAir * dt * 14) { go = true; h = 'hi'; }                // a hop: swing high
        else if (S.cool <= 0 && S.dawdle <= 0 && Math.random() < sk.aggro * dt * 2.5) go = true;
        if (go) {
          if (!h) h = Math.random() < sk.smart ? other(seen.stance) : (Math.random() < 0.5 ? 'hi' : 'lo');
          if (!seen.wobble && !seen.air && me.riposte <= 0 && Math.random() < sk.feint) { feint = true; h = other(seen.stance); }
          if (!feint && (opRoom < 70 || seen.wobble) && me.riposte <= 0 && Math.random() < sk.lunge * 3) lunge = true;
          S.plan = { h, lunge, feint, switched: false };
          S.cool = (0.5 + Math.random() * 1.2) / Math.max(0.4, sk.aggro);
          if (Math.random() < sk.dawdle) S.dawdle = 0.6 + Math.random() * 1.2;
          out.down = h === 'lo'; out.act = lunge ? true : 'tap'; S.guard = h;
          return out;
        }
      } else if (free && dist > P.reach - 6 && dist < P.lungeReach + 20 && S.cool <= 0 && opRoom < 90 && Math.random() < sk.lunge * dt * 2) {
        // a lunge from just outside reach, to finish them off near their end
        const h = Math.random() < sk.smart ? other(seen.stance) : 'hi';
        S.plan = { h, lunge: true }; S.cool = 1.2;
        out.down = h === 'lo'; out.act = true; S.guard = h;
        return out;
      }
      // --- stepping: just inside reach, never backing off the end
      if (!me.sw && me.stun <= 0 && S.dawdle <= 0) {
        const want = S.cool <= 0.15 ? P.reach - 18 : P.reach - 4;
        if (dist > want + 6) step(1);
        else if (dist < P.minGap + 10 && myRoom > 100) step(-1);
        if (myRoom < 45 && dist > P.minGap + 4) step(1);
      }
      out.down = guard === 'lo';
      S.guard = guard;
      return out;
    },
  });
})();
