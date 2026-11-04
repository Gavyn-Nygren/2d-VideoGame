/* Pip & Bo - Computer partner brain for 15-4 Planet Hop Race (mode 'planethop'). */
'use strict';

(() => {
  /* The computer is the other racer. It presses the same keys a person does: ◀ ▶ to run round the planet, ▲ to jump,
     ▼ to dive and the action for a jet puff.
     On a planet: it knows where a running jump from each spot lands (the mode works this out once per course from the
     same flight rules everybody uses, like a person who has learned the planets), and runs the way that reaches a good
     jump soonest, counting the run on the next planet too. It jumps when it gets there. Its timing has some wobble
     (Easy a lot, Hard almost none), and Easy sometimes jumps late or early and has to fix it in the air or go round.
     Normal and Hard check a jump just before pressing it, so they don't take a jump that would fall short.
     In the air: every reaction time it guesses where the flight ends; if that is back where it came from or out into
     space (Tow-bot), it tries a jet puff in each of the 8 screen directions (and with none held), a dive and an air
     nudge either way, and uses whichever lands it farthest along. Hard does this almost every time, Normal most times, Easy now and then.
     Wormhole rounds: it may stop on top of the wormhole planet and jump straight up into the swirl (Hard always, Normal
     often, Easy sometimes). On a moving moon it jumps when a jump from right there would land farther along.
     What it reads: the course (planets, wells, the wormhole), its own runner, and nothing about the other player's keys.
     Moons and comets are left out of its plans, so they can surprise it like they surprise a person. */
  const SK = {
    easy: { react: 0.45, aim: 0.3, miss: 0.18, airTry: 0.3, worm: 0.25, check: false, lazy: 0.25 },
    normal: { react: 0.22, aim: 0.12, miss: 0.05, airTry: 0.7, worm: 0.6, check: true, lazy: 0.05 },
    hard: { react: 0.1, aim: 0.035, miss: 0, airTry: 1, worm: 1, check: true, lazy: 0 },
  };
  const skOf = s => (s <= 0.4 ? SK.easy : s < 0.9 ? SK.normal : SK.hard);
  const T = () => MODES.planethop.test;
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.75;

  // a flight from body state b with keys inp held all the way: { ci, T } (ci -1: Tow-bot)
  function fly(c, b, inp, maxT = 3) {
    const t = T(), P = t.PLANETHOP, w = c.worm, body = { x: b.x, y: b.y, vx: b.vx, vy: b.vy, from: b.from, well: -1, dizzy: 0 };
    let drift = 0;
    for (let s = 0; s < maxT; s += DT) {
      const hit = t.air(c, body, inp, DT, c.stat);
      if (w && Math.hypot(body.x - w.x, body.y - w.y) < P.wormR + P.R) return { ci: c.pl[w.exit].ci, T: s + 0.9 };
      if (hit >= 0) return { ci: c.pl[hit].ci, T: s, la: Math.atan2(body.y - c.pl[hit].cy, body.x - c.pl[hit].cx), land: hit };
      if (body.well < 0) { if ((drift += DT) > P.driftTow) break; } else drift = 0;
    }
    return { ci: -1, T: maxT };
  }
  // the puff a runner would get with these keys (same rule as the mode's planethopPuff)
  function puffV(c, me, ku, kr) {
    const P = T().PLANETHOP, q = c.pl[me.well >= 0 ? me.well : me.from], dx = me.x - q.cx;
    let ux = kr, uy = -ku;
    if (!ku && !kr) { ux = Math.sign(me.vx) || (dx >= 0 ? 1 : -1); uy = -0.6; }
    const L = Math.hypot(ux, uy) || 1, V = P.puffV * me.puffK;
    let vx = me.vx + ux / L * V, vy = me.vy + uy / L * V;
    const sp = Math.hypot(vx, vy); if (sp > P.vAir) { vx *= P.vAir / sp; vy *= P.vAir / sp; }
    return { vx, vy };
  }
  const better = (a, b) => !b || a.ci > b.ci || (a.ci === b.ci && a.T < b.T - 0.05);

  // in the air: fix a flight that would fall back or drift off
  function airFix(S, me, c, sk, curCi) {
    const now = fly(c, me, null);
    if (now.ci > curCi) { S.hold = null; return null; }
    let best = null, pick = null;
    const tryOne = (res, what) => { if (res.ci > curCi && better(res, best)) { best = res; pick = what; } };
    tryOne(fly(c, me, { right: true }), { hold: { right: true } });
    tryOne(fly(c, me, { left: true }), { hold: { left: true } });
    tryOne(fly(c, me, { down: true }), { hold: { down: true } });
    if (me.puffs > 0) for (const [ku, kr] of [[0, 0], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]) {
      const v = puffV(c, me, ku, kr);
      tryOne(fly(c, { x: me.x, y: me.y, vx: v.vx, vy: v.vy, from: me.from }, null), { puff: [ku, kr] });
    }
    return pick;
  }
  // on a planet: choose the jump to go for, from where we are now
  function choose(S, me, c, plan, q) {
    const t = T(), tab = plan.tab[q.i];
    let best = null, bc = 1e9;
    for (const dir of [1, -1]) for (const e of tab[dir]) {
      if (e.cost == null) continue;
      let cc = t.arcT(q, me.a, e.a, dir) + e.cost;
      if (me.s * dir < -60) cc += 0.25; // turning round costs a little
      if (cc < bc) { bc = cc; best = e; }
    }
    return best;
  }

  cpuBrain('planethop', {
    // the race goes on by itself: a person who walked away still finishes the match, so the computer keeps racing
    noIdleStop: true,
    bubbleHidden: true,
    bubblePos(p) {
      const st = G.mst, r = st && st.run && st.run[p.id];
      if (!r || !st.cam || r.hidden) return null;
      const s = { x: (r.x - st.cam.x) * st.cam.z + W / 2, y: (r.y - st.cam.y) * st.cam.z + H / 2 };
      return s.x < 0 || s.x > W || s.y < 0 || s.y > H ? null : { x: s.x, y: s.y - 20 };
    },
    reset(S) { S.e = null; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.run || !st.c) return out;
      const me = st.run[p.id], op = st.run[o.id], m = G.match, c = st.c, sk = skOf(info.skill), P = T().PLANETHOP;
      if (info.frozen) {
        if (!c.plan) T().plan(c); // (worked out during the countdown, not mid-race)
        if (m && m.phase === 'end' && m.end && !S.saidEnd) { S.saidEnd = true; if (m.end.winner === p.id) cpuSay(p, 'Rocket time! I win!'); else if (m.end.winner === o.id) cpuSay(p, 'Good race!'); }
        if (!S.wasFrozen) { S.wasFrozen = true; S.worm = undefined; }
        return out;
      }
      if (S.wasFrozen) { S.wasFrozen = false; S.saidEnd = false; S.e = null; S.pi = -1; S.thinkT = 0; S.hold = null; S.pauseT = 0.06 + (1 - info.skill) * 0.25; }
      if ((S.pauseT = (S.pauseT || 0) - dt) > 0) return out;
      const plan = T().plan(c);
      if (me.mode === 'fin' || me.mode === 'tow' || me.dizzy > 0) { S.hold = null; S.e = null; S.pi = -1; return out; }
      // things a person would say (1-player mode only; cpuSay checks)
      if (me.prog - op.prog > 900 && cpuChance(0.12, dt)) cpuSay(p, 'Catch me!');
      if (me.popT < 0.05 && me.pop === 'Whoopsie!') cpuSay(p, 'Whoopsie! Thanks, Tow-bot!');
      if (me.popT < 0.05 && me.pop === 'Wheee!') cpuSay(p, 'Wheee! Shortcut!');
      if (S.worm === undefined) S.worm = !!c.worm && Math.random() < sk.worm;
      S.thinkT = (S.thinkT || 0) - dt;
      const think = S.thinkT <= 0;
      if (think) S.thinkT = sk.react * (0.7 + Math.random() * 0.6);
      if (me.mode === 'air') {
        S.e = null; S.pi = -1;
        const from = c.pl[me.from], curCi = from.ci;
        if (think && me.airT > 0.12 && Math.random() < sk.airTry) {
          const fix = airFix(S, me, c, sk, curCi);
          if (fix && fix.puff) {
            const [ku, kr] = fix.puff;
            out.act = 'tap'; out.up = ku > 0; out.down = ku < 0; out.right = kr > 0; out.left = kr < 0;
            S.hold = null; cpuSay(p, 'Boost!');
            return out;
          }
          S.hold = fix ? fix.hold : null;
        }
        if (S.hold) Object.assign(out, S.hold);
        return out;
      }
      // on a planet
      S.hold = null;
      const q = c.pl[me.pi];
      if (q.host >= 0) {
        // a moving moon: jump when a jump from right here would land farther along
        out.right = true;
        if (think) {
          const v = T().launch(q, me.a, me.s, 1), res = fly(c, { x: me.x, y: me.y, vx: v.vx, vy: v.vy, from: q.i }, null);
          if (res.ci > q.ci) out.jump = 'tap';
        }
        return out;
      }
      if (q.ci >= c.n) { // the finish planet: run to the rocket
        const d = T().wrap(c.rocketA - me.a);
        out.right = d > 0; out.left = d < 0;
        return out;
      }
      // Wormhole: stop on top and jump straight up
      if (S.worm && c.worm && c.worm.from === q.i) {
        const tgt = -Math.PI / 2, dpx = T().wrap(tgt - me.a) * (q.r + P.R), stop = me.s * me.s / (2 * P.fric);
        if (Math.abs(dpx) < 5 && Math.abs(me.s) < 35) { out.jump = 'tap'; return out; }
        if (me.s * dpx > 0 && stop >= Math.abs(dpx) - 2) return out; // let go and slide to a stop
        out.right = dpx > 0; out.left = dpx < 0;
        return out;
      }
      if (S.pi !== q.i || !S.e || think) {
        if (S.pi !== q.i) { S.pi = q.i; S.aim = gauss() * sk.aim; S.missed = Math.random() < sk.miss; }
        S.e = choose(S, me, c, plan, q);
      }
      const e = S.e;
      if (!e) { out.right = true; return out; }
      out.right = e.dir > 0; out.left = e.dir < 0;
      // Easy now and then lets go for a moment (a kid looking at the other runner)
      if (sk.lazy && cpuChance(sk.lazy, dt)) S.lazyT = 0.2 + Math.random() * 0.4;
      if ((S.lazyT = (S.lazyT || 0) - dt) > 0) { out.right = out.left = false; return out; }
      const target = e.a + S.aim + (S.missed ? 0.35 * e.dir : 0);
      const left = T().wrap((target - me.a) * e.dir);
      if (left <= 0.02 && left > -0.3) {
        if (sk.check) {
          const v = T().launch(q, me.a, me.s, q.kind === 'jelly' ? P.jellyJump : 1), res = fly(c, { x: me.x, y: me.y, vx: v.vx, vy: v.vy, from: q.i }, null);
          if (res.ci <= q.ci) { if (think) S.e = null; return out; }
        }
        out.jump = 'tap';
      }
      return out;
    },
  });
})();
