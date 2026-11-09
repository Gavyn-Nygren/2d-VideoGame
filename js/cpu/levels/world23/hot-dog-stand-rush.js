/* Pip & Bo - Computer partner brain for 23-3 Hot Dog Stand Rush (mode 'hotdog'). */
'use strict';

(() => {
  /* 23-3 Hot Dog Stand Rush (MODES.hotdog): G.mst.cook says who cooks this shift; the other serves. Both jobs read
     MODES.hotdog.job(st, id), the same "what's next" the arrows and hint chips show, so the computer plays by the
     rules a person sees on screen (the order tickets, the grill rings, the bubbles, the pour meter).
     COOK: keeps as many sausages on the grill as the order board still needs (plus one ready for a fairgoer whose
     order isn't taken yet), picks up the golden one closest to burning, puts it in a bun, adds the toppings of the
     most urgent ticket it can still become (nearest bottle first) and puts it on the pass shelf; burnt sausages and
     wrong hot dogs go to Biscuit. While a sausage is cooking and nothing else is to do it waits by the grill.
     SERVER: hands over held items that an order wants, takes new orders (the least patient fairgoer first), picks up
     a hot dog an order needs from the shelf, pours lemonade (holds the action at the jug and lets go in the middle of
     the green band), puts back a hot dog nobody wants (or swaps it for a wanted one on a full shelf) and pours a spare
     lemonade back in the jug when its hands are full. With nothing to do it waits in front of the window.
     Moving: steer to the station's x (each station is about 40-70 px wide), then one press ('tap') with a short rest
     after it, so a press is never counted twice (a second press at the shelf would put a hot dog back).
     It can't do the level alone: one player can't both cook and serve, and when the person rests for 15 s the stand
     itself waits (the clock, patience and the grill stop), and in 1-player mode it also waits for a person who has
     had a job for 30 s and done none of it; after CPU.idleStop the computer stops too.
     Speech (1-player mode only, cpuSay): "Order up!", "New order on the board!", tips when the person's own job has
     waited a while ("Grill a sausage!", "Pick it up, it's golden!", "Take their order!"...).
     Team brains always play at full skill. */
  const M = () => MODES.hotdog;

  cpuBrain('hotdog', {
    reset(S) { S.cd = 0; S.pour = false; S.wait = 0; S.tipFor = ''; S.tipT = 0; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.grill || info.intro || (st.state !== 'play' && st.state !== 'last')) { S.pour = false; return out; }
      const HD = M().HD, j = M().job(st, p.id), x = p.x + p.w / 2, human = !info.partnerCpu;
      S.cd -= dt;
      // tips for a person whose own job has waited a while
      if (human) {
        const oj = M().job(st, o.id);
        if (oj.k !== S.tipFor) { S.tipFor = oj.k; S.tipT = 0; } else S.tipT += dt;
        if (S.tipT > 7 && info.partnerIdle < 6) {
          const say = { grill: 'Grill a sausage!', pick: 'Pick it up, it’s golden!', pickBurnt: 'Biscuit wants that one!', bun: 'Into a bun!',
            top: 'Check the ticket!', shelf: o.id === st.cook ? 'Put it on the shelf!' : 'Grab it from the shelf!', biscuit: 'Give it to Biscuit!',
            take: 'Take their order!', give: 'Hand it over!', jug: 'Lemonade, please!', jugBack: 'Pour that one back!' }[oj.k];
          if (say) cpuSay(p, say);
        }
      }
      // lemonade: hold at the jug until the cup is in the middle of the green band
      if (j.k === 'jug' || S.pour) {
        const s = M().stationAt(st, p.id, x);
        if (s && s.k === 'jug') {
          const want = (HD.greenLo + HD.greenHi) / 2;
          if (!st.pouring && !S.pour) { if (S.cd <= 0) { out.act = true; S.pour = true; } return out; }
          if (st.pouring && st.cup < want) { out.act = true; return out; }
          S.pour = false; S.cd = 0.25; out.act = false; return out;
        }
        S.pour = false;
      }
      if (j.k === 'none') return out;
      if (j.k === 'wait') {
        // stand ready by the grill / in front of the window
        if (Math.abs(j.x - x) > 30) cpuSteer(out, p, j.x, 8);
        return out;
      }
      const there = M().atJob(st, p.id, j);
      if (!there) {
        // a station is narrow: aim for its middle and slow down near it
        const d = j.x - x;
        if (Math.abs(d) > 6) { out.left = d < 0; out.right = d > 0; }
        if (Math.abs(d) < 26 && Math.abs(p.vx) > 120 && Math.sign(p.vx) === Math.sign(d)) { out.left = out.right = false; }
        return out;
      }
      if (Math.abs(p.vx) > 60) { out.left = p.vx > 0; out.right = p.vx < 0; }
      if (S.cd <= 0 && !CPU.last[p.id].act) { out.act = 'tap'; S.cd = 0.3; }
      return out;
    },
  });
})();
