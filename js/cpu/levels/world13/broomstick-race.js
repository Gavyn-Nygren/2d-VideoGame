/* Pip & Bo - Computer partner brain for 13-4 Broomstick Race (mode 'broom'). */
'use strict';

(() => {
  /* The computer is the other racer. It flies like a person with the keys: ▲ / ▼ to climb and dive, ▶ to fly fast, ◀ to
     fly slow, and the action to zoom. A few times a second (its reaction time) it looks at what is on the screen ahead of
     its broom and picks a height to fly at:
       rings        the next ring it hasn't taken yet that it can still reach in time (where a bobbing train ring will be
                    when it gets there); a ring it can only reach flying slow makes Normal and Hard hold ◀ for it
       stars        a speed star off the racing line, when its hand is empty (Hard always goes for one it can reach)
       bats         where each bat will be when the broom gets to it (bats flutter in fixed patterns a person can watch,
                    and in the fog their glowing eyes still show); a bat in the way moves the height above or below it
       rooftops     never lower than the roofs and chimneys just ahead
     Then it steers up and down toward that height, against any gust. It zooms when the way ahead is clear or a bat wall
     is coming (Hard), after a short wait (Normal), or whenever it remembers (Easy).
     What it reads: the course's rings, stars, bats' flight paths and gusts, only as far ahead as the screen shows. It
     never reads the other player's keys. Easy reacts slowly, aims loosely, misses some bats, holds ▶ only part of the
     time and sometimes daydreams; Hard reacts in about 0.1 s and plans every bat. Normal (the default) sits in between
     on purpose: about 0.3 s to react, ▶ about two thirds of the time, sees most bats, so a kid still wins some rounds
     (a scripted kid won about 1 round in 4 against it, and a sharp grown-up beats it most matches). */
  const SK = {
    easy: { react: 0.5, noise: 40, look: 320, batSee: 0.4, margin: 34, fastP: 0.42, slowSmart: false, starGreed: 0.35, zoomMin: 2.5, zoomMax: 6, wander: 0.08 },
    normal: { react: 0.32, noise: 24, look: 420, batSee: 0.6, margin: 40, fastP: 0.64, slowSmart: true, starGreed: 0.6, zoomMin: 1, zoomMax: 3, wander: 0.04 },
    hard: { react: 0.1, noise: 4, look: 600, batSee: 1, margin: 50, fastP: 1, slowSmart: true, starGreed: 1, zoomMin: 0.15, zoomMax: 0.6, wander: 0 },
  };
  const skOf = s => (s <= 0.4 ? SK.easy : s < 0.9 ? SK.normal : SK.hard);

  // can a broom at speed v, now at height y, reach height gy by x (a ring's or star's x)? (with a little start-up time)
  function reach(me, v, x, gy, slack) {
    const tA = (x - me.x) / Math.max(120, v), need = Math.abs(gy - me.y) - slack;
    return need <= broomVyMax(v) * Math.max(0, tA - 0.16);
  }
  function plan(S, me, op, st, sk, info) {
    const P = BROOM, c = st.c, t = st.t, hard = info.skill >= 0.9;
    const v = Math.max(150, me.v), look = Math.min(sk.look, st.cam.x + W - me.x + 30);
    let goal = null;
    // a. the next ring not taken yet that can still be reached (flying slow, for Normal and Hard)
    for (const g of c.rings) {
      if (g.got[me.id] || g.x <= me.x + 6) continue;
      if (g.x > me.x + look) break;
      const tA = (g.x - me.x) / v, gy = broomRingY(g, t + tA);
      if (reach(me, v, g.x, gy, P.ringIn * 0.5)) { goal = { x: g.x, y: gy, kind: 'ring' }; break; }
      if (sk.slowSmart) {
        const vs = P.slow + me.burst * 0.6, tS = (g.x - me.x) / vs, gs = broomRingY(g, t + tS);
        if (reach(me, vs, g.x, gs, P.ringIn * 0.5) && (hard || Math.random() < 0.6)) { goal = { x: g.x, y: gs, kind: 'ring', slow: true }; break; }
      }
    }
    // b. a speed star, when the hand is empty (decided once per star: Easy and Normal sometimes don't bother)
    if (!me.star && me.zoomT <= 0) for (const s of c.stars) {
      if (s.taken >= 0 || s.x <= me.x + 10 || s.x > me.x + look) continue;
      const key = 'st' + s.x;
      if (S[key] === undefined) S[key] = Math.random() < sk.starGreed;
      if (!S[key] || !reach(me, v, s.x, s.y, 10)) continue;
      // a star is worth more than a ring: go for it unless the ring comes well before it
      if (!goal || s.x < goal.x + 140) goal = { x: s.x, y: s.y, kind: 'star' };
      break;
    }
    let ty = goal ? goal.y : clamp(me.y + (255 - me.y) * 0.3, P.top + 30, 400);
    // c. bats: where each one will be when we get there; one in the way moves the height above or below it
    if (me.zoomT <= 0.25) for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < c.bats.length; i++) {
        const b = c.bats[i];
        if (b.x < me.x - 10) continue;
        if (b.x > me.x + Math.min(look, 420)) break;
        const key = 'b' + i;
        if (S[key] === undefined) S[key] = Math.random() < sk.batSee;
        if (!S[key]) continue;
        const tb = Math.max(0, (b.x - me.x) / v);
        if (b.hitT > tb + 0.05) continue; // it will still be fluttering out of the way
        const q = broomBatPos(b, t + tb);
        // our height when we get there: on the way to ty (closer bats: nearer where we are now)
        const k = goal ? clamp((b.x - me.x) / Math.max(1, goal.x - me.x), 0, 1) : 1;
        const yAt = me.y + (ty - me.y) * Math.min(1, k * 1.3);
        if (Math.abs(q.y - yAt) >= sk.margin) continue;
        let side = Math.sign(yAt - q.y) || (q.y > 260 ? -1 : 1);
        const alt = q.y + side * sk.margin * 1.2;
        if (alt < P.top + 14 || alt > broomFloorAt(c, b.x) - 10) side = -side;
        ty = q.y + side * sk.margin * 1.2;
      }
    }
    // d. never into the roofs just ahead (or over the top of the sky)
    let fl = 999;
    for (let dx = 0; dx <= 220; dx += 20) fl = Math.min(fl, broomFloorAt(c, me.x + dx));
    ty = clamp(ty, P.top + 8, fl - 12);
    // aim noise: a slowly changing offset (Easy aims loosely)
    if ((S.noiseT = (S.noiseT || 0) - sk.react) <= 0) { S.noiseT = 0.8 + Math.random(); S.noise = (Math.random() * 2 - 1) * sk.noise; }
    S.ty = ty + (S.noise || 0) * (goal && goal.kind === 'ring' ? 1 : 0.5);
    S.slow = !!(goal && goal.slow);
    S.goal = goal;
    if (S.fastRoll === undefined || Math.random() < 0.15) S.fastRoll = Math.random() < sk.fastP;
  }

  cpuBrain('broom', {
    // brooms fly on by themselves: a person who walked away still finishes the match, so the computer keeps racing
    noIdleStop: true,
    bubbleHidden: true,
    bubblePos(p) { const st = G.mst, r = st && st.riders && st.riders[p.id]; return r && st.cam ? { x: r.x - st.cam.x, y: r.y - (r.star ? 58 : 40) } : null; },
    reset(S) { S.ty = null; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.riders || !st.c || !st.cam) return out;
      const me = st.riders[p.id], op = st.riders[o.id], m = G.match;
      if (info.frozen) {
        if (m && m.phase === 'end' && m.end && !S.saidEnd) { S.saidEnd = true; if (m.end.winner === p.id) cpuSay(p, 'Wheee! I win!'); else if (m.end.winner === o.id) cpuSay(p, 'Good race!'); }
        if (!S.wasFrozen) { for (const k in S) if (/^(b|st)\d/.test(k)) delete S[k]; } // a new course next round
        S.wasFrozen = true; return out;
      }
      if (S.wasFrozen) { S.wasFrozen = false; S.saidEnd = false; S.planT = 0; S.ty = null; S.pauseT = 0.08 + (1 - info.skill) * 0.3; S.zoomAt = null; }
      if ((S.pauseT = (S.pauseT || 0) - dt) > 0) return out;
      if (me.finT != null) return out;
      const sk = skOf(info.skill), P = BROOM, c = st.c;
      // things a person would say (1-player mode only; cpuSay checks)
      if (me.spin > P.spinT - 0.02) cpuSay(p, 'Squeak! Sorry, bat!');
      if (me.tail > P.tailShow && !S.saidTail) { S.saidTail = true; cpuSay(p, 'Tailwind!'); }
      if (me.tail <= 0) S.saidTail = false;
      if (me.x - op.x > 320 && cpuChance(0.15, dt)) cpuSay(p, 'Catch me!');
      // Easy daydreams now and then: drifts a little off its line
      if ((S.wanderT || 0) > 0) { S.wanderT -= dt; }
      else if (cpuChance(sk.wander, dt)) { S.wanderT = 0.5 + Math.random() * 0.8; S.wy = (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 40); }
      // replan a few times a second (reaction time)
      S.planT = (S.planT || 0) - dt;
      if (S.planT <= 0 || S.ty == null) { S.planT = sk.react * (0.7 + Math.random() * 0.6); plan(S, me, op, st, sk, info); }
      let ty = S.ty + ((S.wanderT || 0) > 0 ? S.wy : 0);
      // up and down toward the height (against the gust)
      const wind = broomGustAt(c, me.x), dy = ty - me.y, vyMax = broomVyMax(me.v);
      const want = Math.abs(dy) < 5 ? -wind : clamp(dy * 5, -vyMax, vyMax) - wind;
      if (want < me.vy - 28) out.up = true; else if (want > me.vy + 28) out.down = true;
      // speed: fast, or slow for a ring that needs it
      if (S.slow) out.left = true;
      else if (S.fastRoll && me.spin <= 0) out.right = true;
      // zoom: Hard when the way ahead is clear (or a bat wall is coming), Normal after a moment, Easy whenever it remembers
      if (me.star && me.zoomT <= 0) {
        if (S.zoomAt == null) S.zoomAt = me.holdT + sk.zoomMin + Math.random() * (sk.zoomMax - sk.zoomMin);
        const g = S.goal, wallNear = c.walls.some(wl => wl.x > me.x && wl.x - me.x < 260);
        const lined = !g || Math.abs(g.y - me.y) < 40 || g.x - me.x > 400;
        const endRun = c.len - me.x < 1400;
        let go = me.holdT >= S.zoomAt && (info.skill < 0.4 || lined);
        if (info.skill >= 0.6 && wallNear) go = true;
        if (info.skill >= 0.9 && me.holdT >= S.zoomAt && endRun) go = true;
        if (go) { out.act = 'tap'; S.zoomAt = null; cpuSay(p, 'Zoom!'); }
      } else if (!me.star) S.zoomAt = null;
      if (S.trainN !== st.stat.trains[me.id]) { if (S.trainN != null) cpuSay(p, 'Wheee!'); S.trainN = st.stat.trains[me.id]; }
      return out;
    },
  });
})();
