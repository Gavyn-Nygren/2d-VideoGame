/* Pip & Bo - Computer partner brain for 17-1 Temple Doors (mode 'temple'). */
'use strict';

/* 17-1 Temple Doors. Stone doors open while a pressure plate is held and slide down slowly when it's let go. The brain
   plays the job the mode's own plan gives it (templePlan: the same jobs the hint chips and Mango show), worked out
   from where both players stand, so roles swap naturally and it never cares who started:
   - hold:  walk onto the plate and stand still on it (bubble "Go! I've got the plate!" when the person waits).
   - wait:  stand by the door until the plan says it's open enough to run.
   - cross: run through (the map treats a door that is too low to pass as stone, so it never runs into a shut one).
   - via:   stand on a plate until its door is fully up, then run, but only while the door's time left beats the run
            (Room 3's far star plate); otherwise back onto the plate.
   - press: walk onto the next glyph plate of the Sun Door and stand there until it counts.
   - back:  hold ▼ to go back up to the balcony (Room 4: one on each side).  drop: walk off the balcony.  exit: in.
   Room 2 with a person running: it waits a second on the first plate ("Ready...") before hopping ("GO! Dash!").
   In the exit it stands still (never hops about on a partner who is in it too). If the level says its job can't be
   reached from where it fell (m.pl[id].lost), it holds ▼ back to its torch.
   With a person partner who doesn't do their part (not on the plate), it says what to do now and then. It needs the
   partner for every door, so it can't clear a room alone. Skill only changes how soon it reacts. */
(() => {
  function say(st, p, text, gap = 7) {
    if (G.time - (st.saidT == null ? -99 : st.saidT) < gap) return;
    st.saidT = G.time; cpuSay(p, text, 2);
  }
  // the map for walking (the level's own: a door too low to get under is stone)
  const navOpts = (m, tol) => Object.assign({ tol: tol || 5 }, templeNavOpts(m));
  const go = (st, p, m, x, feet, tol) => cpuNav(st, p, x, feet, navOpts(m, tol));
  // a 1-tile moat between two door columns: run at it and tap jump at the edge (no high jump into a door's slab)
  function hop(st, p, m, j) {
    const A = m.doorBy.A, B = m.doorBy.B, cx = templeCx(p), dir = j.x > cx ? 1 : -1;
    if (!A || !B || !p.grounded && !st.hopT) return null;
    const x0 = Math.min(A.x, B.x) - 50, x1 = Math.max(A.x, B.x) + T + 50;
    if (cx < x0 || cx > x1 || Math.abs(p.y + p.h - (A.top + A.h)) > 40) { st.hopT = 0; return null; }
    const mx = (A.cx + B.cx) / 2, edge = (mx - cx) * dir;   // distance to the moat's middle, ahead
    if (edge < -T) return null;                            // over it already: walk on
    const out = { left: dir < 0, right: dir > 0 };
    if (p.grounded) {
      st.hopT = 0;
      if (edge < 30 && edge > 2 && (Math.abs(p.vx) > 120 || edge < 14)) { out.jump = !CPU.last[p.id].jump; st.hopT = 0.01; }
    } else { st.hopT += DT; out.jump = st.hopT < 0.09; }
    return out;
  }

  cpuBrain('temple', {
    reset(st) { st.viaGo = null; st.saidT = null; st.lastId = ''; st.hopWait = null; },
    think(st, p, o, dt, info) {
      const m = info.mst;
      if (!m || !m.doors || info.intro || m.phase !== 'play' || !p.alive) return {};
      const plan = templePlan(m), j = plan.jobs[p.id], oj = plan.jobs[o.id];
      if (!j) return {};
      // a short pause when the job changes (a person's reaction time; less on hard)
      if (plan.id !== st.lastId) { st.lastId = plan.id; st.lagT = 0.1 + (1 - info.skill) * 0.35; st.viaGo = null; }
      if (st.lagT > 0) { st.lagT -= dt; if (j.k !== 'cross') return {}; }
      // nagging a person who isn't doing their part (1-player only: cpuSay is quiet otherwise)
      if (!info.partnerCpu && o.alive && oj) {
        const late = cpuFor(st, 'pLate', oj.k === 'hold' && oj.plate && !oj.plate.by[o.id] && (j.k === 'wait' || j.k === 'via'), dt);
        if (late > 4) say(st, p, oj.plate.seq ? 'Stand on the ' + TEMPLE_GLYPH[oj.plate.seq].word + ' plate!' : 'Stand on the plate, ' + NAMES[o.id] + '!', 9);
        const pOk = cpuFor(st, 'pOk', j.k === 'hold' && j.plate && j.plate.by[p.id] && oj.k === 'wait', dt);
        if (pOk > 2.5) say(st, p, 'Go! I\'ve got the plate!', 10);
        const pr = cpuFor(st, 'pPress', oj.k === 'press' && j.k !== 'press', dt);
        if (pr > 6) say(st, p, 'Your turn: the ' + TEMPLE_GLYPH[oj.plate.seq].word + ' plate!', 10);
        if (m.shout && m.shout.id === o.id && G.time - (st.shoutSeen || -9) > 3 && m.roomT - m.shout.t < 0.3) { st.shoutSeen = G.time; say(st, p, j.k === 'hold' ? 'I\'m holding it!' : 'On my way!', 3); }
      }
      // fell somewhere it can't get back from to its job: hold ▼ back to the torch
      if (m.pl[p.id].lost) return { down: true };
      switch (j.k) {
        case 'hold': case 'press': {
          const pl = j.plate;
          if (pl.by[p.id]) { st.hopWait = null; return {}; }
          // Room 2, with a person running: before hopping to the second plate (which starts the first door closing),
          // a short "Ready... GO!" so they know when to dash
          if (m.logic === 'relay' && m.relay === 'second' && !info.partnerCpu && m.plates.some(q => q.by[p.id] && q !== pl)) {
            if (st.hopWait == null) st.hopWait = 1.0;
            if (st.hopWait > 0) { st.hopWait -= dt; say(st, p, 'Ready...', 0); return {}; }
            say(st, p, 'GO! Dash!', 0);
          } else st.hopWait = null;
          return go(st, p, m, pl.x, pl.feet, 4);
        }
        case 'wait': case 'idle': {
          const out = go(st, p, m, j.x, j.feet, 8);
          return st.nav && st.nav.status === 'arrived' ? {} : out;
        }
        case 'via': {
          const d = j.door, pl = j.plate;
          const need = Math.abs(templeCx(p) - d.cx) / 190 + 0.5;
          if (st.viaGo !== plan.id) {
            if (pl.by[p.id] && d.cover <= 4) st.viaGo = plan.id;
            else if (!pl.by[p.id] && !d.want && templePassable(d) && templeTimeLeft(m, d) > need + (j.minLeft ? 0.3 : 0)) st.viaGo = plan.id;
          } else if (!d.want && templeTimeLeft(m, d) < need - 0.6 && Math.abs(templeCx(p) - d.cx) > 50) st.viaGo = null;
          if (st.viaGo === plan.id) return go(st, p, m, j.x, j.feet, 8);
          if (pl.by[p.id]) return {};
          return go(st, p, m, pl.x, pl.feet, 4);
        }
        case 'cross': case 'exit': case 'drop': {
          // already standing in the exit: stay put (never hop about on a partner who is in it too)
          if (j.k === 'exit' && m.exit && p.grounded && templeCx(p) > m.exit.x + 5 && templeCx(p) < m.exit.x + m.exit.w - 5) return {};
          // Room 2's moat inside the low tunnel (a door slab may be coming down over it): run and hop it with a short tap
          const moat = m.logic === 'relay' && hop(st, p, m, j);
          if (moat) return moat;
          return go(st, p, m, j.x, j.feet, j.k === 'exit' ? 4 : 10);
        }
        case 'back': return { down: true };
      }
      return {};
    },
  });
})();
