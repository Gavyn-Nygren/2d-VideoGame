/* Pip & Bo - Computer partner brain for 17-4 Vine Swing (mode 'vine'). */
'use strict';

(() => {
  /* The computer is the other swinger. It presses the same keys a person does: ◀ ▶ to pump, jump to let go, the action
     for the leaf glide, ▼ to tuck and ◀ ▶ to nudge in the air.
     Swinging: it presses the way it sees itself swinging (as it was a reaction time ago), so its pumping drifts out of
     time a little on Easy, which also presses the wrong way now and then and stops for a moment. It keeps pumping until
     its swing is about as high as it wants (Easy is happy lower, and is sometimes impatient), or until the swing clock
     leaves time for just one more forward swing. Then, on that forward swing, it works out the best moment to let go
     with the same swing and flight rules everybody uses (like a person who has practised the arc) and lets go there,
     off by its aim (Easy about ±17°, Normal ±6°, Hard ±2°). (The level works out that same sweet spot at the start of
     each forward swing; the computer uses it rather than working it out twice in one tick.)
     Flying: every reaction time it tries ◀, ▶ or nothing held (and ▼ tucked or not, on Normal and Hard) on the same
     flight rules, keeps the best, and opens the leaf when the best moment to open it has come (Easy guesses that
     moment with a big error, Hard almost none). Bounces, toucans, fireflies and the wind are in those flights.
     What it reads: the field (mushrooms, river, toucans, wind), its own swing and flight, the swing clock. Nothing about
     the other player's keys. */
  const SK = {
    easy: { react: 0.34, wrong: 0.5, lazy: 0.4, aim: 17, impatient: 0.6, wantA: 44, glideErr: 0.4, glide: 0.4, nudge: 0.35, tuck: false, think: 0.2 },
    normal: { react: 0.14, wrong: 0.08, lazy: 0.06, aim: 6, impatient: 0.1, wantA: 76, glideErr: 0.12, glide: 0.95, nudge: 0.9, tuck: true, think: 0.12 },
    hard: { react: 0.06, wrong: 0, lazy: 0, aim: 2, impatient: 0, wantA: 82, glideErr: 0.03, glide: 1, nudge: 1, tuck: true, think: 0.08 },
  };
  const skOf = s => (s <= 0.4 ? SK.easy : s < 0.9 ? SK.normal : SK.hard);
  const T = () => MODES.vine.test;
  const D = Math.PI / 180;
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.75;

  // a flight from body b at round time t with the keys held all the way (and the leaf opened at flight time gAt)
  function tryFlight(f, b, t, hold, gAt) {
    return T().flySim(f, b, t, q => ({ left: hold.left, right: hold.right, down: hold.down && q.glide <= 0, glide: gAt != null && q.ft >= gAt && !q.glideUsed }));
  }
  function planFlight(S, f, b, t, sk) {
    const holds = [{ right: true }, {}];
    if (sk.nudge > 0.6) holds.push({ left: true });
    if (sk.tuck && (f.bouncers.length || f.wind < 0)) { holds.push({ right: true, down: true }); holds.push({ down: true }); }
    // the leaf: the best time to open it, for the best way to hold the keys
    let best = null;
    for (const h of holds) {
      const r = tryFlight(f, b, t, h, b.glideUsed ? null : b.ft + 0.25);
      if (!best || r.d > best.r.d) best = { h, r };
    }
    let gBest = null;
    if (!b.glideUsed && !b.carry) {
      // (every 0.2 s, then 0.1 s either side of the best: 11 flights instead of 17)
      const tryAt = dt => { if (dt < 0) return; const r = tryFlight(f, b, t, best.h, b.ft + dt); if (!gBest || r.d > gBest.d + 0.05) gBest = { d: r.d, at: dt }; };
      for (let dt = 0; dt <= 1.61; dt += 0.2) tryAt(dt);
      const c = gBest.at; tryAt(c - 0.1); tryAt(c + 0.1);
      const none = tryFlight(f, b, t, best.h, null);
      if (none.d >= gBest.d) gBest = null; // (a headwind: better never to open it)
    }
    S.hold = best.h;
    S.glideAt = gBest ? b.ft + gBest.at + S.gErr : null;
  }

  cpuBrain('vine', {
    // the match goes on by itself: a person who walked away still finishes it, so the computer keeps swinging
    noIdleStop: true,
    bubbleHidden: true,
    bubblePos(p) {
      const st = G.mst, P = st && st.pl && st.pl[p.id];
      if (!P || !st.cam) return null;
      let q;
      if (P.status === 'ready' || P.status === 'swing') q = T().swingBody(P.s);
      else if (P.b && P.status === 'fly') q = P.b;
      else q = { x: P.landX, y: -30 };
      const s = { x: (q.x - st.cam.x) * st.cam.z + W / 2, y: (q.y - 26 - st.cam.y) * st.cam.z + H / 2 };
      return s.x < 0 || s.x > W || s.y < 0 || s.y > H ? null : s;
    },
    reset(S) { S.round = -1; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst, m = G.match;
      if (!st || !st.pl || !st.f || !m) return out;
      const me = st.pl[p.id], op = st.pl[o.id], f = st.f, sk = skOf(info.skill), V = T().VINE;
      if (info.frozen) {
        if (m.phase === 'end' && m.end && !S.saidEnd) { S.saidEnd = true; if (m.end.winner === p.id) cpuSay(p, 'Wheee! I flew farther!'); else if (m.end.winner === o.id) cpuSay(p, 'Wow, great swing!'); }
        return out;
      }
      // a new round: fresh plans
      if (S.round !== st.round || S.att !== st.att || S.lt > st.lt) {
        S.round = st.round; S.att = st.att; S.saidEnd = false; S.mode = 'pump'; S.target = null; S.fwd = false; S.lastFwd = null; S.wrongT = 0; S.lazyT = 0; S.planT = 0; S.hold = null;
        S.glideAt = null; S.gErr = 0; S.flew = false; S.impatient = Math.random() < sk.impatient; S.wantA = (sk.wantA + gauss() * 3) * D;
        S.said = {};
      }
      S.lt = st.lt;
      if (me.status === 'swing') {
        const w = cpuLag(S, 'w', me.s.w, sk.react), A = T().amp(me.s), period = 2 * Math.PI * Math.sqrt(V.R / V.gs);
        // pumping: the way it saw itself swing; Easy sometimes the wrong way, or not at all for a moment
        if (cpuChance(sk.wrong, dt)) S.wrongT = 0.15 + Math.random() * 0.25;
        if (cpuChance(sk.lazy, dt)) S.lazyT = 0.3 + Math.random() * 0.5;
        S.wrongT -= dt; S.lazyT -= dt;
        let d = w > 0.05 ? 1 : w < -0.05 ? -1 : 0;
        if (S.wrongT > 0) d = -d;
        if (S.lazyT > 0) d = 0;
        out.right = d > 0; out.left = d < 0;
        // at the start of each forward swing: is this the one to let go on? (high enough, impatient, or the next
        // forward swing's best moment would come after the bell)
        if (me.s.w > 0.2 && !S.fwd) {
          S.fwd = true;
          // (a big swing takes longer than a small one: it goes by how long the last one took)
          const per = S.lastFwd != null ? Math.max(period, st.at - S.lastFwd) * 1.04 : period * 1.12;
          S.lastFwd = st.at;
          // (the level already worked out this forward swing's sweet spot from the same rules a moment ago: use it
          // rather than working it out again in the same tick)
          const fresh = me.best && !me.bestDue && me.bestAt != null && st.t - me.bestAt < 0.5;
          const best = fresh ? { a: me.best.a, d: me.best.d, dt: Math.max(0, me.best.dt - (st.t - me.bestAt)) } : T().bestRelease(f, me.s, st.t, me.gold > 0);
          const lastOne = st.clock - (per + best.dt) < 0.25;
          if (A >= S.wantA || lastOne || (S.impatient && A > 52 * D && st.lt > 3.5)) { S.mode = 'aim'; S.target = best.a + gauss() * sk.aim * D; }
        }
        if (me.s.w < -0.2) { S.fwd = false; if (S.mode === 'aim') S.mode = 'pump'; }
        if (S.mode === 'aim' && me.s.w > 0.2 && me.s.a >= S.target) { out.jump = 'tap'; if (!S.said.go) { S.said.go = 1; cpuSay(p, 'Wheee!'); } }
        if (me.s.w <= 0.2) out.jump = false;
        return out;
      }
      if (me.status === 'fly') {
        const b = me.b;
        if (b.carry) { if (!S.said.taxi) { S.said.taxi = 1; cpuSay(p, 'Toucan taxi!'); } return out; }
        if (!S.flew) { S.flew = true; S.gErr = gauss() * sk.glideErr; S.planT = 0; S.useGlide = Math.random() < sk.glide; S.useNudge = Math.random() < sk.nudge; }
        S.planT -= dt;
        // (Pip's computer plans on even ticks and Bo's on odd ones, so two computers never plan in the same tick)
        if (S.planT <= 0 && (Math.round(st.t / DT) & 1) === p.id) { S.planT = sk.think; planFlight(S, f, b, st.t, sk); }
        const h = S.hold || {};
        out.left = !!h.left && S.useNudge; out.right = !!h.right && S.useNudge; out.down = !!h.down;
        if (S.useGlide && S.glideAt != null && !b.glideUsed && b.ft >= S.glideAt) { out.act = 'tap'; out.down = false; }
        // a lazy Easy flight with no plan for the leaf: open it some time after the top
        if (!S.useGlide && !b.glideUsed && b.vy > 120 && cpuChance(1.5, dt)) out.act = 'tap';
        return out;
      }
      if (me.status === 'done' && op.status === 'swing' && !S.said.wait && me.d > 20) { S.said.wait = 1; cpuSay(p, 'Beat ' + me.d.toFixed(0) + ' m!'); }
      return out;
    },
  });
})();
