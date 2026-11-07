/* Pip & Bo - Computer partner brain for 19-3 Gold Mine Cart. */
'use strict';

(() => {
  /* 19-3 Gold Mine Cart (MODES.minecart): the stretch says who rides (G.mst.rider, the front seat) and who works the
     lever (G.mst.sw, the back seat); the computer does the job it has, reading what is ahead from MODES.minecart.needs
     (the same thing the prompts and panels read).
     RIDER: for the next thing on the cart's own track it works out the hop: a gap is jumped where the hop lands past the
     far rail (halfway through the window that works at the cart's speed, holding the jump for a bigger hop when the
     window is too small); a rock is jumped so the cart is up while the rock passes under it; a low beam or a waterfall
     is ducked (▼ held) from just before until the back of the cart is past. With nothing in the way it hops for gold
     hanging up high and grabs dangling gold lanterns with the action.
     SWITCHER: it reads a fork's sign once the sign can be seen (in the dark stretch only inside the lantern's beam; a
     pair of count signs once both are in view; a lantern fork at the track mouths), waits a short reaction time, and
     taps ▲ or ▼ to put the lever on the good track. It holds the brake from just before a steep slope down to the bend
     whenever the cart is going fast. It reads only what the signs show (the good track a sign points to), nothing else.
     With a person partner (1-player): the computer does only its own job. As rider it tells a person on the lever which
     way late in the approach if the lever is still wrong ("Gold is up top!") and to brake on a steep slope; as switcher it
     says "Jump!" / "Duck!" / "Grab the lantern!" just before. A person who does nothing never gets the level done: a
     lever nobody moves meets a dead end on its side in every stretch (the computer rider can't move the lever), and a
     gap nobody jumps sends the cart back every time (the computer switcher can't jump). Team brains always play at full
     skill; the reaction time is short but human-like. */
  const M = () => MODES.minecart;
  const K = () => MODES.minecart.MINECART;

  /* ---------- the rider ---------- */
  function ride(st, S, p, o, dt, info) {
    const out = {}, cart = st.cart, KK = K(), nd = M().needs(st), human = !info.partnerCpu, Sw = o.id;
    const v = Math.max(60, cart.v), x = cart.x, onRail = cart.h <= 0 && cart.hv <= 0;
    const T = 2 * KK.hopV / KK.g;   // a plain hop's time in the air
    let jump = false, hold = false, duck = false;
    const hz = nd.hz;
    if (hz && hz.kind === 'gap') {
      const g = hz.o;
      if (g.spring) jump = x > g.x0 - KK.springZone + 30;
      else {
        const lo = g.x1 + 34 - v * T, hi = g.x0 + KK.coyote - 6;
        if (lo <= hi) jump = x >= (lo + hi) / 2 - v * dt;
        else { jump = x >= hi - 8; hold = true; }
      }
    } else if (hz && hz.kind === 'rock') {
      const r = hz.o, tUp = 0.07, tDown = 0.8;
      const hi = r.x - 34 - tUp * v, lo = r.x + 34 - tDown * v;
      jump = x >= (lo <= hi ? (lo + hi) / 2 : hi) - v * dt;
    } else if (hz && (hz.kind === 'beam' || hz.kind === 'curtain')) {
      duck = hz.o.x - x < 64 + v * 0.14;
    }
    // nothing in the way soon: hop for gold up high (the hop must land before the next hazard)
    if (!jump && !duck && nd.high && onRail) {
      const gx = nd.high.x, reach = x + v * T + 70;
      const clear = !hz || hz.o.x0 > reach || (hz.o.x != null && hz.o.x > reach);
      if (clear && gx - x <= v * (KK.hopV / KK.g) && gx - x > 0) jump = true;
    }
    if (jump && onRail && cart.duck < 0.3) out.jump = 'tap';
    if (hold || (cart.hv > 0 && S.holding)) { out.jump = true; S.holding = true; }
    if (onRail && !jump) S.holding = false;
    if (duck) out.down = true;
    // a dangling gold lantern: grab it as it goes by
    if (nd.lantern && Math.abs(nd.lantern.x - x) < 46 && !duck) out.act = 'tap';
    // with a person on the lever: which way, late in the approach if the lever is still wrong; the brake
    if (human && info.partnerIdle < 20) {
      if (nd.fork && nd.want && nd.want !== st.lever && nd.forkD / v < 1.5 && nd.forkD > 40) cpuSay(p, nd.want === 'up' ? 'Gold is up top! ' + M().key(Sw, 'up') : 'Gold is down below! ' + M().key(Sw, 'down'), 1.6);
      else if (nd.brake && !cart.braking) cpuSay(p, 'Steep! Brake! ' + M().key(Sw, 'act'), 1.6);
    }
    return out;
  }

  /* ---------- the switcher ---------- */
  function lever(st, S, p, o, dt, info) {
    const out = {}, cart = st.cart, nd = M().needs(st), human = !info.partnerCpu, Rd = o.id, v = Math.max(60, cart.v);
    const fk = nd.fork;
    // read the sign once it can be seen, then a short reaction before the hand moves
    const react = 0.32 + (1 - info.skill) * 0.4;
    const seen = fk && nd.seen ? cpuFor(S, 'see' + fk.i, true, dt) : 0;
    if (fk && seen > react && nd.want && nd.want !== st.lever) {
      if (nd.want === 'up') out.jump = 'tap';
      else { out.down = !S.downWas; }
    }
    S.downWas = !!out.down;
    // the brake: from just before a steep slope down to the bend
    if (nd.brake) out.act = true;
    // with a person riding: a word just before each thing
    if (human && info.partnerIdle < 20) {
      const hz = nd.hz, s = hz ? nd.hzD / v : 99;
      if (hz && s < 0.8 && s > 0.15) {
        if (hz.kind === 'gap' || hz.kind === 'rock') cpuSay(p, 'Jump! ' + M().key(Rd, 'up'), 1.2);
        else cpuSay(p, 'Duck! ' + M().key(Rd, 'down'), 1.2);
      } else if (nd.lantern && Math.abs(nd.lantern.x - cart.x) < 140) cpuSay(p, 'Grab the lantern! ' + M().key(Rd, 'act'), 1.4);
      else if (fk && seen > react && nd.forkD < 380 && nd.forkD > 60) cpuSay(p, nd.want === 'up' ? 'Up we go!' : 'Down we go!', 1.2);
    }
    return out;
  }

  cpuBrain('minecart', {
    think(S, p, o, dt, info) {
      const st = info.mst;
      if (!st || !st.cart || info.intro || st.state !== 'ride') return {};
      return p.id === st.rider ? ride(st, S, p, o, dt, info) : lever(st, S, p, o, dt, info);
    },
  });
})();
