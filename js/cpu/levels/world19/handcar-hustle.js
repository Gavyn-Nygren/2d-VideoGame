/* Pip & Bo - Computer partner brain for 19-2 Handcar Hustle. */
'use strict';

(() => {
  /* 19-2 Handcar Hustle (MODES.handcar): the computer grips one end of the seesaw pump handle (G.mst.back says who has
     the back end) and reads what the crew needs from MODES.handcar.needs (the same thing the prompts and panels read),
     planned with only its OWN brake (half the full brake), so it stops in time even when the person never brakes.
     PUMPING: it can only push while its end is up, which needs the partner's push first, so it can never pump the
     handcar along alone: with a person who does nothing it makes at most one push and then waits (and says "Your
     turn!"). It pushes a steady beat after the partner's push: with another computer about 0.34 s (a little quicker up
     hills); with a person it copies the person's own tempo (how long they took after its last push), so the gaps stay
     even and the rhythm streak builds. It never pushes within 0.2 s of the partner (no jams).
     BRAKING: it holds ▲ when the speed is over what its brake can still stop (or slow to the curve limit) before the
     next stop point: the flagman at broken track, the cows, a mail station's box, the town station's box; and it stops
     pumping a little before that (coast). In a box it keeps braking so the handcar holds still. Stopped short of a box,
     it gives one small push (if its end is up) and brakes again.
     With a person it says short things: "Your turn!", "Brake!", "Wait for the cows!", "Got the mail!". Bubbles only
     show in 1-player mode (cpuSay). Team brains always play at full skill. */
  const M = () => MODES.handcar;
  const HC = () => MODES.handcar.HANDCAR;

  cpuBrain('handcar', {
    reset(S) { S.myPush = -9; S.gapP = 0.45; S.seenPush = -9; S.said = {}; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst, H = HC();
      if (!st || !st.c || info.intro || st.state !== 'ride') return out;
      const human = !info.partnerCpu, now = G.time;
      const myEnd = M().end(st, p.id), myUp = st.down !== myEnd;
      // the partner's tempo: how long they took after my last push
      if (st.lastPushT !== S.seenPush) {
        S.seenPush = st.lastPushT;
        if (st.lastPusher === p.id) S.myPush = st.lastPushT;
        else if (st.lastPusher === o.id && S.myPush > 0) {
          const g = st.lastPushT - S.myPush;
          if (g > 0.15 && g < 1.4) S.gapP = S.gapP * 0.4 + g * 0.6;
        }
      }
      const nd = M().needs(st, H.brake * 0.5), v = st.v;
      let brake = false, pump = false;
      switch (nd.what) {
        case 'brake': case 'hold': brake = true; break;
        case 'pump': pump = true; break;
        case 'creep': pump = v + nd.dv < nd.vAllow; break;
        default: break;
      }
      // (inside a box, still moving: brake)
      if (nd.what === 'hold' && Math.abs(v) < 0.5) brake = true;
      if (brake) out.jump = true;
      // the push: only with my end up, never on top of the partner's push, on a steady beat
      if (pump && myUp && st.jamT <= 0 && !st.held) {
        const since = now - st.lastPushT, hill = st.c.hills.some(h => st.x > h.x0 - 100 && st.x < h.x1 && h.steep);
        let wait = human ? clamp(S.gapP, 0.26, 0.95) : hill ? 0.3 : 0.34;
        if (st.lastPushT < 0 || st.lastPusher < 0) wait = 0.4;
        if (since >= Math.max(0.2, wait)) out.act = 'tap';
      }
      // talk to a person (1-player mode only)
      if (human) {
        const partnerTurn = !myUp && (nd.what === 'pump' || nd.what === 'creep') && st.jamT <= 0;
        if (partnerTurn && now - st.lastPushT > 1.6) cpuSay(p, 'Your turn! Pump!');
        else if (nd.what === 'brake' && !st.braking[o.id] && v > 60) cpuSay(p, 'Brake! Brake!', 1.2);
        else if (nd.what === 'waitCows') cpuSay(p, 'Wait for the cows!');
        else if (nd.what === 'waitFix') cpuSay(p, 'The crew is fixing it!');
        else if (nd.what === 'coast' && now - st.lastPushT < 0.6 && st.lastPusher === o.id) cpuSay(p, 'Easy! Stop pumping!');
        else if (nd.what === 'hold' && nd.kind === 'mail') cpuSay(p, 'Hold still!');
        const got = st.sacks;
        if (S.sacks != null && got > S.sacks) cpuSay(p, 'Got the mail!', 2);
        S.sacks = got;
      }
      return out;
    },
  });
})();
