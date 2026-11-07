/* Pip & Bo - Computer partner brain for 18-3 Tide Pool Dig (mode 'tidedig'). */
'use strict';

/* 18-3 Tide Pool Dig. The room says who digs (def.digger); the other bails and shoos crabs. The brain plays the job
   that the mode's own plan gives it (tidedigPlan: the same jobs the hint chips show), so it never does the person's job:
   - digger: walk to the X (hopping over open holes, which it would fall into), hold the action to dig while the water
     is low, stand still while it's flooded ("Glub!"), hold jump to climb out once the chest is open, pick up coins,
     and hold the action on its rope post for the big chest.
   - bailer: shoo a crab that carries or grabs a coin (tap the action next to it), dump a full bucket at the nearest
     dump spot (the sea, or a rock pool), scoop the hole when it has water (standing at its edge), pat the sand wall
     between waves, pick up coins, and otherwise wait by the hole on the sea side.
   It reads the level state only through the plan and the mode's small test helpers (where the holes, water, crabs
   and coins are), which are all drawn on screen. A short pause after each job change stands in for reaction time.
   With a person partner (1-player mode) it says short things now and then: "Glub! Bail me out, please!",
   "Dig at the X!", "Shoo that crab!", "Hold the rope with me!". */
(() => {
  function say(st, p, text, gap = 8) {
    if (G.time - (st.saidT == null ? -99 : st.saidT) < gap) return;
    st.saidT = G.time; cpuSay(p, text, 2);
  }
  const TD = () => MODES.tidedig.test;
  // walk toward x on the beach; the digger climbs out of a hole first and hops over open holes on the way
  function walk(st, p, m, x, dead = 4) {
    const t = TD(), out = {}, cx = cpuCx(p);
    const inH = p.id === m.digger ? t.tidedigIn(m, p) : null;
    if (inH && Math.abs(x - inH.cx) > 14) {
      out.jump = true;
      const dir = x > cx ? 1 : -1; out.right = dir > 0; out.left = dir < 0;
      // (centred in the column while climbing, so it doesn't rub the walls)
      if (Math.abs(cx - inH.cx) > 3 && cpuFeet(p) > t.TIDEDIG.S * T + 14) { out.right = cx < inH.cx; out.left = cx > inH.cx; }
      return out;
    }
    cpuSeek(out, p, x, dead);
    if (p.id === m.digger) {
      const dir = x > cx ? 1 : -1, surf = t.TIDEDIG.S * T;
      if (p.grounded && Math.abs(cpuFeet(p) - surf) < 3) {
        st.hopT = 0;
        for (const h of m.holes) {
          if (h.depth <= 0 || Math.abs(x - h.cx) < 16) continue;
          const d = (h.cx - cx) * dir;
          if (d > 0 && d < 46 && (Math.abs(p.vx) > 120 || d < 32)) { out.jump = !CPU.last[p.id].jump; st.hopT = 0.01; break; }
        }
      } else if (st.hopT > 0) { st.hopT += DT; out.jump = st.hopT < 0.2; }
    }
    // a step up in the way (out of the sea or a rock pool, onto a rock): jump it, holding for height
    if (Math.abs(x - cx) > dead + 4) {
      const dir = x > cx ? 1 : -1, col = Math.floor((cx + dir * (p.w / 2 + 6)) / T), row = Math.floor((cpuFeet(p) - 2) / T);
      if (p.grounded && solidFor(tile(col, row), p)) { out.jump = !CPU.last[p.id].jump || st.stepT > 0; st.stepT = 0.01; }
      else if (st.stepT > 0) { st.stepT += DT; out.jump = st.stepT < 0.25; if (st.stepT >= 0.25) st.stepT = 0; }
    }
    return out;
  }
  // stand exactly over a spot (for digging: the X column)
  const near = (p, x, d) => Math.abs(cpuCx(p) - x) <= d;

  cpuBrain('tidedig', {
    reset(st) { st.saidT = null; st.lastK = ''; st.lagT = 0; st.hopT = 0; st.scoopSide = 0; },
    think(st, p, o, dt, info) {
      const m = info.mst, t = TD();
      if (!m || !m.holes || info.intro || m.phase === 'won' || !p.alive) return {};
      const plan = t.tidedigPlan(m), j = plan.jobs[p.id], oj = plan.jobs[o.id];
      if (!j) return {};
      const key = j.k + ':' + (j.hole ? j.hole.c : '') + (j.crab ? j.crab.id : '');
      if (key !== st.lastK) { st.lastK = key; st.lagT = 0.08 + (1 - info.skill) * 0.3; }
      if (st.lagT > 0) { st.lagT -= dt; if (j.k !== 'shoo' && j.k !== 'climb') return {}; }
      const person = !info.partnerCpu && o.alive;
      // ----- talking to a person who isn't doing their part (1-player only: cpuSay is quiet otherwise) -----
      if (person && oj) {
        if (cpuFor(st, 'waitWet', j.k === 'wait' && oj.k === 'scoop', dt) > 4) say(st, p, 'Glub! Bail me out, please!', 10);
        if (cpuFor(st, 'goX', oj.k === 'goX' && p.id === m.bailer, dt) > 7) say(st, p, 'Dig at the X, ' + NAMES[o.id] + '!', 12);
        if (cpuFor(st, 'pDig', oj.k === 'dig' && p.id === m.bailer && (m.stats.strokes[o.id] === st.lastStrokes), dt) > 5) say(st, p, 'Dig, dig, ' + NAMES[o.id] + '!', 12);
        st.lastStrokes = m.stats.strokes[o.id];
        if (cpuFor(st, 'pShoo', oj.k === 'shoo' && oj.crab && oj.crab.coin, dt) > 1.5) say(st, p, 'Shoo that crab!', 9);
        if (cpuFor(st, 'pDump', oj.k === 'dump', dt) > 8) say(st, p, 'Dump the bucket in the sea!', 12);
        if (cpuFor(st, 'pHaul', j.k === 'haul' && m.haul && !m.haul.held[o.id], dt) > 2.5) say(st, p, 'Hold the rope with me!', 8);
      }
      switch (j.k) {
        case 'dig': {
          const h = j.hole;
          if (t.tidedigAtSpot(m, p, h)) return { act: true };
          // centre over the X (or settle on the hole's floor)
          const out = walk(st, p, m, h.cx, 2);
          if (t.tidedigIn(m, p) === h) { out.jump = false; }
          // standing on the partner over the hole's mouth: ask them to step aside
          if (person && p.onPartner && Math.abs(cpuCx(p) - h.cx) < 20) say(st, p, 'Scoot over, please!', 6);
          return out;
        }
        case 'wait': {
          const h = j.hole, out = {};
          if (Math.abs(cpuCx(p) - h.cx) > 3) cpuSeek(out, p, h.cx, 2);
          return out;
        }
        case 'climb': case 'goX': case 'idle': {
          if (j.k === 'idle') return {};
          return walk(st, p, m, j.x, 3);
        }
        case 'coins': {
          const q = j.coin, out = walk(st, p, m, q.x, 3);
          // a coin up on a rock: jump for it when close
          if (q.y < cpuFeet(p) - 24 && Math.abs(q.x - cpuCx(p)) < 50 && p.grounded) out.jump = !CPU.last[p.id].jump;
          return out;
        }
        case 'haul': {
          if (near(p, j.x, 9) && p.grounded) return { act: true };
          return walk(st, p, m, j.x, 4);
        }
        case 'shoo': {
          const cr = j.crab, d = cr.x - cpuCx(p);
          const out = walk(st, p, m, cr.x - Math.sign(d || 1) * 20, 8);
          if (Math.abs(d) < t.TIDEDIG.shooR * 0.75) out.act = 'tap';
          if (info.skill >= 0.7 && cr.coin && Math.abs(d) < 40) say(st, p, 'Shoo, crab!', 14);
          return out;
        }
        case 'dump': {
          if (t.tidedigDumpAt(m, p)) return { act: 'tap' };
          return walk(st, p, m, j.x, 6);
        }
        case 'scoop': {
          const h = j.hole;
          // stand at the edge on our own side (not right over the digger's head)
          const side = st.scoopSide || (cpuCx(p) >= h.cx ? 1 : -1); st.scoopSide = side;
          const at = t.tidedigScoopHole(m, p);
          if (at === h && t.tidedigOnSurface(p) && Math.abs(cpuCx(p) - h.cx) > 10) return { act: 'tap' };
          return walk(st, p, m, h.cx + side * 32, 5);
        }
        case 'wall': {
          if (near(p, j.x, 14) && t.tidedigOnSurface(p)) return { act: true };
          return walk(st, p, m, j.x, 4);
        }
        case 'ready': {
          st.scoopSide = 0;
          const out = walk(st, p, m, j.x, 10);
          return near(p, j.x, 12) ? {} : out;
        }
      }
      return {};
    },
  });
})();
