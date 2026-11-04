/* Pip & Bo - Computer partner: coin pusher. */
'use strict';

(() => {
  /* Coin Pusher is head-to-head: the computer plays against you.
     - Grabbing: every moment or so it picks the loose coin worth going for: quick to reach (cpuNav over the planks),
       not one you'll get first, near other coins, gold Lucky coins first. Hard and normal also run to where a coin in the
       air will land (a person sees it flying); easy only goes for coins lying still.
     - Putting in: with a full load (fewer on easy), or with some coins and nothing good left to grab, or near the bell,
       it walks to the glass at the far end of its own color (a spot that is always on its side of the pusher) and holds
       the button, so a coin goes in every 0.2 s. On the way it already drops coins wherever the glass is on its side.
       It only presses when the coin would go to its side (what the pusher's position shows), so it never gets "Bo's side!".
     - Bonus Cup: when the cup opens, it often goes to the end of the stroke on its side and keeps one coin back until the
       pusher's top slides under it, then drops it in the cup (Big Shove). Easy rarely tries and times it late.
     - Stomps: hard and normal sometimes hop onto you when you carry a few coins and stand close (you spill 2), and step
       away when you come down at them. Easy never stomps on purpose.
     - When you walk away it keeps playing long enough to finish a match against nobody (WALK_AWAY s), then stops, so the
       level's own pause (40 s with nobody pressing) still comes (noIdleStop: its own stop replaces the core's 30 s one). */
  const SK = s => ({
    replan: 0.5 - 0.35 * s,         // how often it rethinks which coin to grab (s)
    load: s > 0.5 ? 5 : 3,          // coins it collects before putting them in
    air: s > 0.5,                   // runs for coins still in the air
    noise: 1.2 * (1 - s),           // random wobble in its choice of coin (s)
    climb: s > 0.5 ? 0 : 0.8,       // easy would rather not climb: extra cost per plank up (s)
    cup: s > 0.5 ? 0.3 + 0.7 * s : 0.1,   // chance it goes for an open Bonus Cup
    lag: Math.max(0.15, 0.4 - 0.3 * s),   // sees the pusher / you this late (hard 0.15 s, a quick person)
    stomp: s > 0.5 ? 2.5 * s : 0,   // how eagerly it hops onto you (per second, when it's a good moment)
    dodge: s > 0.5,                 // steps away from a stomp coming down
    dawdle: 0.9 * (1 - s),          // short stops per second
    duty: s > 0.8 ? 1 : s > 0.5 ? 0.93 : 0.5,   // share of the time it keeps walking (easy walks in fits and starts)
  });
  const CT = () => MODES.coin.test;
  const WALK_AWAY = 200;            // s with you pressing nothing before it stops too (a match against nobody takes ~150 s)
  const SAFE = [292, 668];          // glass spots that are always on Pip's / Bo's side of the pusher
  const CUP = [360, 600];           // the end of the pusher's stroke on each side (its top stays there a moment)

  // seconds until the pusher's top is next at player k's end of the stroke (the plain swing, as a person sees it)
  function cupWait(mst, k) {
    const w = 2 * Math.PI / mst.period, target = k === 0 ? 1.5 * Math.PI : 0.5 * Math.PI, fall = 0.29;
    const t0 = mst.t + fall - 0.35, n = Math.ceil((w * t0 + mst.phase - target) / (2 * Math.PI));
    return (target - mst.phase + 2 * Math.PI * n) / w - fall - mst.t;
  }
  // the coin worth grabbing: { x, feet, o } or null
  function pickCoin(st, p, o, mst, sk, k) {
    const K = CT().COIN, oc = cpuCx(o);
    let best = null, bs = 1e9;
    for (const c of mst.toks) {
      if (c.gone || (c.owner >= 0 && c.owner !== k)) continue;
      let x = c.x, y = c.y;
      if (!c.rest) { if (!sk.air) continue; const l = CT().land(c); x = l.x; y = l.y; }
      const feet = y + K.tokR;
      const myT = cpuNavReach(p, x, feet);
      if (!isFinite(myT)) continue;
      const oT = o.alive && o.grounded ? cpuNavReach(o, x, feet) : Math.abs(x - oc) / 220 + Math.abs(feet - cpuFeet(o)) / 300;
      let s = myT + sk.climb * Math.max(0, Math.round((cpuFeet(p) - feet) / 90)) + (oT < myT - 0.2 ? 1.5 : 0) - (c.kind === 'lucky' ? 0.8 : 0) + (c.rest ? 0 : 0.15);
      for (const q of mst.toks) if (q !== c && q.rest && Math.abs(q.x - x) < 50 && Math.abs(q.y - y) < 20) s -= 0.2;
      // its own taste in coins (the same each time it looks), and it sticks with the coin it is already after
      if (!st.nz) st.nz = new WeakMap();
      if (!st.nz.has(c)) st.nz.set(c, Math.random() * sk.noise);
      s += st.nz.get(c) - (st.grab && st.grab.c === c ? 0.45 : 0);
      if (s < bs) { bs = s; best = { x, feet, c, s, t: myT }; }
    }
    return best;
  }

  cpuBrain('coin', {
    noIdleStop: true,
    reset(st) { st.round = -1; },
    think(st, p, o, dt, info) {
      const out = {}, M = G.match, mst = info.mst;
      if (!M || !mst || !mst.carry || !mst.toks) return out;
      if (M.phase !== 'live') {
        st.grab = null; st.replanT = 0; st.cupFor = -1; st.stomp = null; st.dawT = 0; st.stompCD = 1; st.putting = false;
        st._lag_o = null; st._lag_cup = null;
        return out;
      }
      const sk = SK(info.skill), k = p.id, K = CT().COIN;
      st.idleLive = info.partnerCpu || info.partnerIdle <= 0.02 ? 0 : (st.idleLive || 0) + dt;
      if (!p.alive || (!info.partnerCpu && info.partnerIdle > WALK_AWAY)) return out;
      const carry = mst.carry[k].length, cap = mst.magnet[k] > 0 ? K.capMagnet : K.cap;
      const cx = cpuCx(p), feet = cpuFeet(p);
      const ov = cpuLag(st, 'o', { cx: cpuCx(o), feet: cpuFeet(o), vy: o.vy, g: o.grounded, alive: o.alive, stun: o.stun, safe: o.stompSafe }, sk.lag);
      st.stompCD = (st.stompCD || 0) - dt;

      /* ---- a stomp under way: jump at you and come down on your head ---- */
      if (st.stomp) {
        st.stomp.t -= dt;
        if (st.stomp.t <= 0 || (p.grounded && st.stomp.t < 0.55)) st.stomp = null;
        else {
          cpuSeek(out, p, ov.cx, 3);
          out.jump = p.grounded ? st.stomp.t > 0.6 : p.vy < 0;
          if (st.stomp.t > 0.6 && !p.grounded) st.stomp.t = 0.6;   // took off
          return out;
        }
      }

      // easy and normal stop for a moment now and then
      if (st.dawT > 0) { st.dawT -= dt; return out; }
      if (cpuChance(sk.dawdle, dt)) { st.dawT = 0.2 + Math.random() * 0.4; return out; }

      /* ---- the plan: grab, or put in ---- */
      const cupOpen = mst.cupOpen;
      if (cupOpen && st.cupFor !== mst.stats.cups[0] + mst.stats.cups[1]) {   // once per cup opening: try it?
        st.cupFor = mst.stats.cups[0] + mst.stats.cups[1]; st.cupGo = Math.random() < sk.cup;
      }
      // the cup: it heads there only when the pusher's top will reach its end of the stroke soon (it sees the pusher
      // swing); until then it keeps grabbing, with at least one coin kept for the cup
      const wantCup = cupOpen && st.cupGo && carry > 0;
      const trip = Math.abs(cx - CUP[k]) / 200 + (feet < K.roofY - 20 ? 0.7 : 0) + 0.4;
      const goCup = wantCup && (cupWait(mst, k) < trip || (Math.abs(cx - CUP[k]) < 30 && CT().onGlass(p)));
      st.replanT = (st.replanT || 0) - dt;
      if (st.replanT <= 0 && p.grounded) {
        st.replanT = sk.replan;
        st.grab = carry < cap ? pickCoin(st, p, o, mst, sk, k) : null;
      }
      if (st.grab && (st.grab.c.gone || carry >= cap) && p.grounded) { st.grab = carry < cap ? pickCoin(st, p, o, mst, sk, k) : null; st.replanT = sk.replan; }
      const grab = st.grab && !st.grab.c.gone && carry < cap ? st.grab : null;
      const late = M.roundTime > 0 && M.timeLeft < 7;
      const keep = wantCup && !late ? 1 : 0;   // a coin kept back for the cup
      // once it starts putting coins in it keeps going until its hands are empty (only a coin right next to it is picked
      // up on the way), so it never runs back and forth for one coin at a time
      if (carry <= keep) st.putting = false;
      else if (late || carry >= Math.min(sk.load, cap) || !grab || grab.s > 2.4) st.putting = true;
      const detour = st.putting && !goCup && grab && grab.t < 0.4;
      const put = goCup || (st.putting && carry > keep && !detour);
      let tx, tf;
      if (put) { tx = goCup ? CUP[k] : SAFE[k]; tf = K.roofY; }
      else if (grab) { tx = grab.x; tf = grab.feet; }
      else if (wantCup) { tx = CUP[k]; tf = K.roofY; }                     // nothing to grab: wait for the cup
      else { tx = SAFE[k] + (k === 0 ? -60 : 60); tf = K.roofY; }   // nothing to do: wait by its own glass

      /* ---- move ---- */
      st.fitT = (st.fitT || 0) - dt;
      if (st.fitT <= 0) { st.fitT = 0.15; st.fit = Math.random() < sk.duty; }
      const mv = cpuNav(st, p, tx, tf, { tol: put ? 8 : 5 }) || {};
      if (st.fit || !p.grounded) { out.left = mv.left; out.right = mv.right; out.jump = mv.jump; out.down = mv.down; }

      /* ---- put coins in: only when this coin would go to its own side (or into the cup) ---- */
      // (on the glass with a little room to spare: it moves a bit before the press is read)
      const glass = CT().onGlass(p) && cx > K.stripX0 + 12 && cx < K.stripX1 - 12 && feet > K.roofY - K.hopMax + 12;
      if (carry > 0 && put && glass) {
        const pr0 = CT().predict(cx, feet), mine = k === 0 ? cx < pr0.c : cx > pr0.c;
        // (a cup coin right at the cup's edge on the other side could slip to the other side by the time it is let go)
        const pr = { side: pr0.side, cup: pr0.cup && (mine || Math.abs(cx - pr0.c) < 11) };
        if (pr0.cup && !pr.cup) pr.side = 1 - k;
        const cupNow = cpuLag(st, 'cup', pr.cup, sk.lag * 0.6);
        if (goCup) {
          if (cupNow && pr.cup) out.act = true;                          // into the cup
          else if (carry > 1 && pr.side === k) out.act = true;           // the rest go in, one is kept for the cup
          else if (cupNow && !pr.cup && pr.side === k) out.act = true;   // easy: pressed a moment late (a plain coin)
        } else if ((pr.side === k || pr.cup) && carry > keep) out.act = true;
        if (out.act && (out.left || out.right) && Math.abs(cx - tx) < 40) { out.left = out.right = false; }
      }

      /* ---- stomps ---- */
      const dx = ov.cx - cx;
      if (sk.stomp && st.stompCD <= 0 && p.grounded && p.stun <= 0 && ov.alive && ov.g && ov.stun <= 0 && ov.safe <= 0 &&
          Math.abs(ov.feet - feet) < 4 && Math.abs(dx) > 14 && Math.abs(dx) < 80 && mst.carry[o.id].length >= (info.skill > 0.8 ? 2 : 3) &&
          !CPU.last[k].jump && cpuChance(sk.stomp, dt)) {
        st.stomp = { t: 1.2 }; st.stompCD = 2.5 + Math.random() * 2;
        out.jump = true; out.left = dx < 0; out.right = dx > 0; out.act = false;
        return out;
      }
      // step away from a stomp coming down
      if (sk.dodge && !ov.g && ov.vy > 0 && ov.feet < p.y + 6 && ov.feet > p.y - 90 && Math.abs(dx) < 40 && p.grounded) {
        out.left = dx > 0; out.right = dx <= 0; out.act = false;
      }
      // you pressed nothing for 10 s of live play (not counting the intro and banners): once it says what to do
      if (st.idleLive > 10 && !st.said) { st.said = true; cpuSay(p, 'Grab coins!'); }
      return out;
    },
  });
})();
