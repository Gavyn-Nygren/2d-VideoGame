/* Pip & Bo - Computer opponent brain for 27-4 Robot Rumble (mode 'robotrumble'). */
'use strict';

(() => {
  /* The computer builds its own robot, then wrestles. It presses the same keys a person does.
     BUILD: it looks at the parts lying about on its own side and goes for one its robot still needs (a part on the
       floor: walk to it; a part on the belt: wait under the end of its half of the belt, where the part drops off;
       Hard and Normal hop up onto the belt to meet a needed part halfway). Carrying a part: walk to its own pad.
       Carrying a part it already has (one fell on it): ▼ + the action puts it down. Easy grabs whatever comes,
       wanders now and then and walks a bit slower to decide.
     RUMBLE: walk at the other robot and hold the action to charge; let go when it is in reach (Hard waits for a full
       charge, Easy lets go early or too far away). Hard and Normal brace (▼) when the other robot is about to lunge
       close by, and step back toward the middle when near an edge. Easy forgets to brace and sometimes dithers.
     What it reads: the parts, the robots and the platform (all on screen). Never the other player's keys. */
  const SK = {
    easy: { react: 0.55, picky: false, belt: false, brace: 0.15, early: 0.55, far: 40, lapse: 0.25, lapseT: 1.0, edge: 0 },
    normal: { react: 0.25, picky: true, belt: true, brace: 0.55, early: 0.85, far: 10, lapse: 0.05, lapseT: 0.6, edge: 60, smart: false },
    hard: { react: 0.1, picky: true, belt: true, brace: 0.9, early: 1, far: 0, lapse: 0, lapseT: 0, edge: 80, smart: true },
  };
  const skOf = s => (s <= 0.4 ? SK.easy : s < 0.9 ? SK.normal : SK.hard);
  const RR = () => MODES.robotrumble;
  const walkTo = (out, cx, x, tol = 6) => { if (x > cx + tol) out.right = true; else if (x < cx - tol) out.left = true; return Math.abs(x - cx) <= tol; };

  function build(S, p, st, sk, dt) {
    const R = RR().RUMBLE, out = {}, rb = st.robots[p.id], cx = p.x + p.w / 2, pad = R.pads[p.id], padX = (pad[0] + pad[1]) / 2;
    const need = s => !rb.parts[s];
    const onBelt = p.grounded && p.y + p.h <= R.beltY + 1;
    if (rb.carry) {
      const slot = RR().PART_SLOT[rb.carry];
      // a spare it already has: put it down (unless the robot is done anyway, then swap it on)
      const megaArms = slot === 'arms' && rb.parts.arms === 'mega'; // (never swap the gold Mega Fist off)
      if ((megaArms || (sk.picky && !rb.done && !need(slot))) && rb.carry !== 'mega') { if (S.dropT <= 0) { out.down = true; out.act = 'tap'; S.dropT = 0.5; } return out; }
      walkTo(out, cx, padX, 20);
      return out;
    }
    if (rb.done && !st.mega[p.id]) { walkTo(out, cx, padX, 30); return out; }
    if (st.mega[p.id]) { walkTo(out, cx, padX, 20); return out; }
    // pick a part to go for
    S.think -= dt;
    if (S.think <= 0 || !S.goal) {
      S.think = sk.react;
      const mine = q => (p.id === 0 ? q.x < 480 : q.x > 480);
      let best = null;
      for (const q of st.parts) {
        if (q.gone || (q.skip === p.id && q.skipT > 0)) continue;
        if (!mine(q) && q.on !== 'floor') continue;
        const want = need(RR().PART_SLOT[q.k]);
        if (!want && sk.picky) continue;
        let x = q.x, how = 'floor';
        if (q.on === 'belt' || q.on === 'drop') {
          how = 'end'; x = p.id === 0 ? R.beltX0 - 24 : R.beltX1 + 24;
          // meet it on the belt (it rides toward us)
          if (sk.belt && Math.abs(q.x - x) > 120) { how = 'belt'; }
        } else if (q.on === 'fall') how = 'fall';
        const cost = Math.abs(x - cx) + (how === 'end' ? Math.abs(q.x - x) * 0.6 : 0) + (want ? 0 : 400) + (mine(q) ? 0 : 250);
        if (!best || cost < best.cost) best = { q, x, how, cost };
      }
      S.goal = best;
    }
    const g = S.goal;
    if (!g || !st.parts.includes(g.q) || g.q.gone) { S.goal = null; walkTo(out, cx, p.id === 0 ? R.beltX0 - 24 : R.beltX1 + 24, 10); return out; }
    const q = g.q;
    if (g.how === 'belt' && (q.on === 'belt' || q.on === 'drop')) {
      // up onto the belt, then walk at the part
      if (!onBelt) {
        const ux = clamp(q.x + (p.id === 0 ? -70 : 70), R.beltX0 + 20, R.beltX1 - 20);
        walkTo(out, cx, ux, 30);
        if (Math.abs(ux - cx) < 40 && p.grounded) out.jump = true;
        if (!p.grounded && p.vy < 0) out.jump = true;
        return out;
      }
      walkTo(out, cx, q.x, 4);
      return out;
    }
    if (q.on === 'belt' || q.on === 'drop') {
      // wait under the belt end where it will drop off
      walkTo(out, cx, p.id === 0 ? R.beltX0 - 28 : R.beltX1 + 28, 4);
      return out;
    }
    if (onBelt) { walkTo(out, cx, p.id === 0 ? R.beltX0 - 40 : R.beltX1 + 40, 4); return out; }
    walkTo(out, cx, q.x, 4);
    return out;
  }

  function rumble(S, p, st, sk, dt) {
    const R = RR().RUMBLE, out = {}, me = st.bots[p.id], o = st.bots[1 - p.id];
    if (me.fall) return out;
    const mc = me.x + me.w / 2, oc = o.x + o.w / 2, dir = oc > mc ? 1 : -1;
    const gap = Math.abs(oc - mc) - me.w;                      // space between the two robots
    const mid = (st.edge[0] + st.edge[1]) / 2;
    const behind = dir > 0 ? mc - st.edge[0] : st.edge[1] - mc; // room behind me before the edge
    // decide every react seconds: release point and whether to brace
    S.think -= dt;
    if (S.think <= 0) {
      S.think = sk.react;
      S.release = sk.early >= 1 ? 1 : sk.early + Math.random() * (1 - sk.early);
      S.reachExtra = 40 + Math.random() * sk.far;
      S.braceNow = o.charging && gap < 110 && Math.random() < sk.brace && behind < 260;
      if (Math.random() < sk.lapse) S.lapse = sk.lapseT;
    }
    if (S.lapse > 0) { S.lapse -= dt; return out; }
    // the other robot lunging at us right now: brace
    if ((S.braceNow || (o.lunge > 0 && gap < 60 && Math.random() < sk.brace)) && me.rest <= 0 && !me.charging && me.braceT < R.braceMax - 0.1) {
      if (o.charging || o.lunge > 0) { out.down = true; return out; }
    }
    // near the edge with the other robot in front: get round toward the middle (springs jump over)
    if (sk.edge && behind < sk.edge && gap < 80 && me.S.jump > 650 && me.grounded) { out.jump = true; if (dir > 0) out.right = true; else out.left = true; return out; }
    if (me.charging) {
      const f = me.charge / me.S.charge;
      // stay facing them; creep closer while charging
      if (gap > 10) { if (dir > 0 && me.face > 0) out.right = true; else if (dir < 0 && me.face < 0) out.left = true; }
      const inReach = gap < me.S.reach + S.reachExtra;
      if (me.face !== dir) return out; // (let go below to turn round)
      if (f >= S.release && inReach) return out; // let go: shove
      if (sk.smart) {
        // they're charging or lunging and we're in reach: shove first once half charged (whoever lands first wins the
        // exchange), harder the nearer the edge they are
        const oBehind = dir > 0 ? st.edge[1] - oc : oc - st.edge[0];
        if (inReach && (o.charging || o.lunge > 0) && f > (oBehind < 120 ? 0.35 : 0.5)) return out;
        if (inReach && oBehind < 90 && f > 0.4) return out;
      }
      out.act = true;
      return out;
    }
    // facing the wrong way: turn
    if (me.face !== dir) { if (dir > 0) out.right = true; else out.left = true; return out; }
    // walk in and start charging when getting close
    if (gap > 160) { if (dir > 0) out.right = true; else out.left = true; }
    else {
      if (gap > 20) { if (dir > 0) out.right = true; else out.left = true; }
      if (me.lunge <= 0 && !me.brace) out.act = true;
    }
    // too near the edge behind: Hard and Normal step toward the middle rather than charge in place
    if (sk.edge && behind < 40 && !o.charging) { out.act = false; if (mid > mc) out.right = true; else out.left = true; }
    return out;
  }

  cpuBrain('robotrumble', {
    reset(S) { S.think = 0; S.goal = null; S.dropT = 0; S.lapse = 0; S.release = 1; S.reachExtra = 40; },
    think(S, p, o, dt, info) {
      const st = info.mst;
      if (!st || !st.robots || info.frozen || info.intro) return {};
      const sk = skOf(info.skill);
      S.dropT = Math.max(0, (S.dropT || 0) - dt);
      if (st.phase === 'build') { S.wasRumble = false; return build(S, p, st, sk, dt); }
      if (st.phase === 'rumble' && st.bots) {
        if (!S.wasRumble) { S.wasRumble = true; S.think = 0; S.goal = null; if (!info.partnerCpu) cpuSay(p, 'Beep boop! Rumble!', 1.4); }
        return rumble(S, p, st, sk, dt);
      }
      return {};
    },
  });
})();
