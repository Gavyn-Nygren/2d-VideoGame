/* Pip & Bo - Computer partner: sumo bounce. */
'use strict';

(() => {
  /* The computer rolls its ball like a person on the keys, seeing the other ball a moment late (cpuLag). The mat is a
     line (left / right), so the game is about who is nearer the middle: from there a push sends the other ball outward.
     Each step, the first that fits:
       out / rescue           nothing to steer
       ghost, other ball gone roll back to the middle (a ghost passes through the other ball)
       hop over               finishing a jump over the other ball: steer to land on its middle side (air hop if short)
       defend                 the other ball boings (or charges) at us up close: squat heavy so it bounces off, or, with
                              our back to the rim, jump over it
       squeeze                the mat is shrinking: sit on the middle, squat when the other ball comes, shove it away
                              when it is touching us and further out
       attack                 we are nearer the middle: roll in, charge the boing on the way and let it go at close range;
                              tap boings when touching; sometimes a slam (jump, squat on the way down over it)
       get inside             it is nearer the middle on our side: near our rim, jump over it; with room behind, barge
     Easy reacts slowly, forgets to defend, sometimes boings at nothing (which tires it) or rolls about aimlessly, and only
     slowly notices the squeeze; hard reacts fast, defends almost always and picks its moments. */
  const SK = { // reaction lag (s), aim error (px), defend chance, hop-over chance, slams per s, mistakes per s,
    //            charge chance, re-think time (s), squeeze sense (per s), careful boings
    easy: { lag: 0.4, err: 30, defend: 0.15, hop: 0.2, slam: 0, oops: 0.35, charge: 0.45, think: 0.35, center: 0.5, careful: false },
    normal: { lag: 0.2, err: 12, defend: 0.55, hop: 0.55, slam: 0.2, oops: 0.06, charge: 0.8, think: 0.18, center: 2.5, careful: false },
    hard: { lag: 0.08, err: 3, defend: 0.92, hop: 0.85, slam: 0.5, oops: 0, charge: 1, think: 0.08, center: 50, careful: true },
  };
  const skOf = s => (s <= 0.4 ? SK.easy : s < 0.9 ? SK.normal : SK.hard);

  // left / right toward x for the ball (the player object itself stays hidden at its spawn)
  function steer(out, b, x, dead) { const d = x - b.x; out.left = d < -dead; out.right = d > dead; return Math.abs(d) <= dead; }
  const push = (out, dir) => { out.left = dir < 0; out.right = dir > 0; };
  const roundKey = m => m.round + ':' + m.history.length;
  function newRound(S, m) { S.round = roundKey(m); S.plan = null; S.planT = 0; S.wander = 0; S.defKey = null; S.slam = false; S.sq = false; S.hopT = 0; S.aimErr = 0; }

  cpuBrain('sumo', {
    noIdleStop: true, // the level has no idle pause: a match against nobody plays out and ends (the computer wins)
    bubblePos(p) {
      const st = G.mst, b = st && st.b && st.b[p.id];
      return b ? { x: b.x, y: b.y - b.r } : { x: cpuCx(p), y: p.y };
    },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst, m = G.match;
      if (!st || !st.b || !m || m.phase !== 'live') { S.round = null; return out; }
      if (S.round !== roundKey(m)) newRound(S, m);
      const P = st.P, sk = skOf(info.skill), me = st.b[p.id], op = st.b[1 - p.id], cx = st.geo.cx;
      if (me.out || me.rescue) return out;
      // what we see of the other ball (a moment late)
      const ox = cpuLag(S, 'ox', op.x, sk.lag), ovx = cpuLag(S, 'ovx', op.vx, sk.lag);
      const oDash = cpuLag(S, 'od', op.dashT > 0, sk.lag), oCharge = cpuLag(S, 'oc', op.charging && op.holdT > P.tapT, sk.lag);
      const gone = op.out || op.rescue;
      const hw = st.hw, myD = me.x - cx, oD = ox - cx, myEdge = hw - Math.abs(myD), dir = Math.sign(ox - me.x) || me.face;
      const close = Math.max(0, Math.abs(ox - me.x) - me.r - op.r), relV = (me.vx - ovx) * dir, oCome = -ovx * dir;   // gap, closing speed, its speed at us
      const inside = Math.sign(oD || dir) === dir && Math.abs(myD) <= Math.abs(oD) + 6;
      const can = me.onMat && !me.heavy && me.dizzy <= 0;

      // ghosts pass through each other: take the middle and wait for it to land
      if (gone || me.ghost > 0 || op.ghost > 0) {
        steer(out, me, cx, 6);
        if (me.charging) out.act = true;
        return out;
      }
      // finishing a jump over the other ball: land on its middle side
      if (S.hopT > 0) {
        S.hopT -= dt;
        if (me.onMat && S.hopT < 0.5) S.hopT = 0;
        else {
          const side = Math.sign(cx - ox) || -dir, land = ox + side * (me.r + op.r + 8);
          steer(out, me, land, 4);
          if (!me.onMat && me.vy > 50 && me.hop && (me.x - ox) * side < me.r && Math.abs(me.y - op.y) < me.r + op.r + 10) out.jump = 'tap';
          // coming down onto it: squat for a slam
          if (!me.onMat && me.vy > 200 && Math.abs(me.x - ox) < 50 && me.heavyCD <= 0 && Math.random() < sk.slam * 2) out.down = true;
          return out;
        }
      }
      // easy: now and then a pointless boing or an aimless roll (what a young kid does)
      if (S.wander > 0) { S.wander -= dt; if (Math.abs(me.x + S.wDir * 40 - cx) < hw - 50) push(out, S.wDir); return out; }
      if (cpuChance(sk.oops, dt)) {
        if (Math.random() < 0.5 && me.cool <= 0) out.act = 'tap';
        else { S.wander = 0.3 + Math.random() * 0.5; S.wDir = Math.random() < 0.5 ? -1 : 1; }
        return out;
      }

      // ---- defend: it boings at us up close (or charges right next to us)
      const coming = (oDash && Math.sign(ovx) === -dir && close < 90) || (oCharge && close < 30) || (oCome > 250 && close < 25 && myEdge < 90);
      if (coming) {
        const key = op.lastCharge + ':' + (op.cool > 0 ? 'c' : 'n') + ':' + (oDash ? 1 : 0);
        if (S.defKey !== key) { S.defKey = key; S.def = Math.random() < sk.defend; S.defHop = Math.random() < sk.hop; }
        if (S.def) {
          if (myEdge < 70 && me.onMat && S.defHop && !st.shrink) { out.jump = 'tap'; push(out, dir); S.hopT = 0.9; return out; }
          if (me.onMat && ((me.heavyCD <= 0 && !me.heavyLatch) || me.heavy)) { out.down = true; return out; }
        }
      }
      if (me.heavy && me.onMat && close < 40 && (op.dashT > 0 || oCome > 150)) { out.down = true; return out; }

      // ---- the squeeze: the middle is all that counts
      const squeeze = st.squeeze > 0 || m.roundT > P.squeezeAt - 1.5;
      if (!squeeze) S.sq = false;
      else if (!S.sq && cpuChance(sk.center, dt)) { S.sq = true; S.sqErr = (Math.random() - 0.5) * sk.err * 0.6; }
      if (S.sq && !me.onMat) { steer(out, me, cx + S.sqErr, 3); return out; }
      if (S.sq) {
        const tol = Math.max(5, Math.min(30, hw * 0.25));
        if (close < 22 && Math.abs(oD) >= Math.abs(myD) - 3) {
          // touching, and we have the middle: shove outward
          push(out, dir);
          if (me.cool <= 0 && can && cpuChance(3, dt)) out.act = 'tap';
        } else if (close < 22 && me.onMat && Math.sign(oD) === Math.sign(myD) && myEdge < 120 && S.sqHop !== m.roundT >> 1 && Math.random() < sk.hop) {
          // it has the middle and pushes us out: jump over it
          S.sqHop = m.roundT >> 1; out.jump = 'tap'; push(out, -Math.sign(myD)); S.hopT = 0.9;
        } else if (close < 22 && oCome > 60 && me.onMat && me.heavyCD <= 0 && Math.random() < sk.defend) out.down = true;   // it barges at us
        else steer(out, me, cx + S.sqErr, Math.abs(myD) > tol ? 3 : 2);
        return out;
      }

      // ---- the plan, re-thought a few times a second (easy more slowly)
      S.planT -= dt;
      if (S.planT <= 0 || (S.plan === 'attack') !== inside) {
        S.planT = sk.think * (0.7 + Math.random() * 0.6);
        S.plan = inside ? 'attack' : (myEdge < 100 && Math.random() < sk.hop) ? 'hop' : 'barge';
        S.aimErr = (Math.random() - 0.5) * 2 * sk.err;
      }
      if (S.plan === 'hop') {
        // roll up to it and jump over toward the middle
        if (close < 40 && me.onMat) { out.jump = 'tap'; push(out, dir); S.hopT = 0.9; return out; }
        push(out, dir);
        return out;
      }
      // attack (or barge head-on): close in, charge on the way, let go at close range
      if (me.charging && p.input.act) {
        // let go (boing!) at close range. Careful (hard): only when a miss can't carry us off our own rim
        const sp = me.holdT < P.tapT ? P.dashTap : P.dashTap + (P.dashMax - P.dashTap) * me.charge;
        const carry = sp * (P.dashTapT + (P.dashFullT - P.dashTapT) * me.charge) + sp * sp / (2 * P.rollFric);
        const room = dir === Math.sign(myD) ? hw - Math.abs(myD) : hw + Math.abs(myD);
        const reach = (sk.careful ? 22 + 55 * me.charge : 35 + 100 * me.charge) + S.aimErr;
        const safe = !sk.careful || (close < 10 && op.onMat && Math.abs(op.y - me.y) < me.r) || carry < room - 10;
        if ((close <= reach && safe) || (!sk.careful && me.charge >= 1 && close < 140)) { push(out, dir); return out; }
        // held too long (it would go off by itself): let it go toward the middle
        if (me.holdT > P.tapT + P.chargeT + P.autoFire - 0.15) { push(out, -Math.sign(myD) || dir); return out; }
        out.act = true;
        // a planted ball (not rolling) is heavier: stand still while it comes at us
        if (oCome > 100 || close < 25) return out;
        push(out, dir);
        return out;
      }
      if (can && me.cool <= 0 && close < 170 && close > 30 && Math.random() < sk.charge * dt * 8) { out.act = true; push(out, dir); return out; }
      if (close <= 30 && can && me.cool <= 0 && cpuChance(3, dt)) { out.act = 'tap'; push(out, dir); return out; }
      // slam: up close, jump and come down on it squatting
      if (inside && close < 45 && me.onMat && op.onMat && cpuChance(sk.slam, dt)) { out.jump = 'tap'; S.hopT = 0.8; return out; }
      // roll toward it (never off our own rim)
      const tx = ox - dir * (me.r + op.r) + S.aimErr;
      steer(out, me, tx, 2);
      if (myEdge < 30 && Math.sign(tx - me.x) === Math.sign(myD)) out.left = out.right = false;
      return out;
    },
  });
})();
