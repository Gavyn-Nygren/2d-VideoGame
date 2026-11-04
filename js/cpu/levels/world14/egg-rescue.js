/* Pip & Bo - Computer partner brain for 14-1 Egg Rescue (mode 'eggrescue'). */
'use strict';

/* 14-1 Egg Rescue. Both carry one leaf stretcher with the egg on it; the room def says who is at the front (m.front),
   and the ends swap every room, so the brain plays the end it has. It reads what the prompts and panels show
   (MODES.eggrescue.needs: whose feet are at a log, gap or ledge, which end is lower, the next steam vent) and the egg on
   the leaf, and presses keys like a person.
   - Level: every step it picks lift (the action), low (▼) or neither for its own end, whichever makes the leaf tilt the
     egg back toward the middle best, given where the partner's hands are right now (so it lifts when its end is low,
     carries low when its end is high, and helps a partner who doesn't).
   - Walk: the front walks on while the back keeps up; the back follows the front at the leaf's length. Both stop while
     the egg is wobbling far off the middle or in the air (a vent popped it), and before a steam vent that would puff
     on any of them (it looks a couple of seconds ahead at the vent's bubbling and its rest ring, the same a person
     sees), and go right after it puffs.
   - Hop: at a log, gap or ledge it holds ▲ (ready) once the egg has settled and waits for the partner; when the partner
     gets ready first (even a random tap) it joins in quickly if a hop is safe there, so a stray tap is a together hop,
     not a solo one. It never hops alone on purpose.
   Waiting for a slow person: it never walks off alone (the leaf stops it anyway) and it holds ready for as long as it
   takes. With a person it says what it needs in a short bubble ("Hop with me!", "Lift your end!"), not too often.
   Skill only changes how quickly it reacts. */
(() => {
  const E = () => MODES.eggrescue, P = () => EGG;
  function say(st, p, text, gap = 6) {
    const n = st.sayN && st.sayN.text === text ? st.sayN.n : 0, all = st.sayAll || 0;
    if (G.time - (st.saidT == null ? -99 : st.saidT) < gap * (1 + Math.floor(n / 3) + Math.floor(all / 10))) return;
    st.saidT = G.time; st.sayN = { text, n: n + 1 }; st.sayAll = all + 1; cpuSay(p, text, 1.8);
  }
  // my end: lift (+1), carry low (-1) or neither (0), whichever tilts the egg back to the middle best
  function level(st, m, me, pa, isF) {
    const Pc = P(), e = m.egg, hy = (c, lp) => c.y - Pc.handY - lp;
    const target = e.air ? 0 : clamp(-(e.s * 0.32 + e.v * 0.1), -12, 12);   // the drop (front hand lower = +) that rolls it home
    let best = 0, bestErr = Infinity;
    for (const k of [0, 1, -1]) {
      const lp = k > 0 ? Pc.liftY : k < 0 ? -Pc.lowY : 0;
      const hF = isF ? hy(me, lp) : hy(pa, pa.liftPx), hB = isF ? hy(pa, pa.liftPx) : hy(me, lp);
      const err = Math.abs((hF - hB) - target) + (k === st.lvl ? -2.5 : 0) + (k ? 0.5 : 0);
      if (err < bestErr) { bestErr = err; best = k; }
    }
    st.lvl = best;
    return best;
  }
  // would any of us (the back, the egg, the front) be over a steam vent while it puffs, walking on (or standing still)
  // for the next T seconds?
  function ventRisk(m, walking, T) {
    const Em = E(), Pc = P(), F = m.cr[m.front], B = m.cr[m.back], h = Em.hands(m), ex = m.egg.air ? m.egg.wx : (h.bx + h.fx) / 2 + m.egg.s;
    const xs = [B.x, ex, F.x], v = walking ? Pc.walk * 0.97 : 0;
    for (const vt of m.c.vents) {
      if (vt.x < B.x - 60 || vt.x > F.x + 320) continue;
      const info = Em.ventInfo(m, vt), V = Em.ventT(vt), reach = info.r + 14;
      const puffs = info.state === 'puff' ? [[0, info.puffLeft + 0.1], [info.puffLeft + V.quiet + V.warn - 0.15, info.puffLeft + V.per + 0.1]]
        : [[info.toPuff - 0.15, info.toPuff + V.puff + 0.1]];
      for (let t = 0; t <= T; t += 0.05) {
        if (!puffs.some(([a, b]) => t >= a && t <= b)) continue;
        for (const x of xs) if (Math.abs(x + v * t - vt.x) < reach) return true;
      }
    }
    return false;
  }

  cpuBrain('eggrescue', {
    reset(st) { st.lvl = 0; st.join = 0; st.settle = 0; st.noDxT = 0; st.backT = 0; st.wasAir = false; },
    think(st, p, o, dt, info) {
      const m = info.mst, Em = E(), Pc = P();
      if (!m || !m.cr || info.intro || m.state !== 'walk' || m.lock > 0) { if (m && m.lock > 0) st.wasAir = true; return {}; }
      const nd = Em.needs(m), me = m.cr[p.id], pa = m.cr[o.id], isF = p.id === m.front, e = m.egg, out = {};
      const person = !info.partnerCpu, react = 0.05 + (1 - info.skill) * 0.09;
      // keep the leaf level (also in the air, also while waiting)
      const lv = level(st, m, me, pa, isF);
      out.act = lv > 0; out.down = lv < 0;
      if (me.air) { st.wasAir = true; return out; }
      if (st.wasAir) { st.wasAir = false; out.jump = false; return out; }   // (let go of ▲ after a hop, so the next press is a fresh one)
      const settled = !e.air && Math.abs(e.s) < 20 && Math.abs(e.v) < 45;
      // the partner is getting ready to hop: join in (quickly, if a hop is safe here). Away from a log or gap it only
      // joins a partner who holds ▲ on purpose, not a stray tap
      const meant = pa.ready && (nd.hop || (pa.ready.held && pa.ready.t > 0.15));
      if (meant && !me.ready && !pa.air) {
        st.join += dt;
        if (st.join >= react && !e.air && Em.hopDx(m) != null) { out.jump = true; st.join = 0; return out; }
        return out;
      }
      st.join = 0;
      // a log, gap or ledge at someone's feet: get ready once the egg has settled, and wait for the partner
      if (nd.hop) {
        st.settle += dt;
        const ok = settled || (st.settle > 2.5 && !e.air && Math.abs(e.s) < 32);
        const vent = ventRisk(m, false, 1.2);
        if (ok && !vent) {
          out.jump = true;
          if (person && me.ready && me.ready.t > 0.8) say(st, p, 'Ready! Hop with me!');
        }
        return out;
      }
      st.settle = 0;
      if (me.ready) { out.jump = false; return out; }
      if (nd.noDx) {
        // someone is at an edge but there's nowhere safe to land yet: the other end walks on a bit (or both back up)
        st.noDxT += dt;
        if (st.noDxT > 2) st.backT = 0.5;
        if (st.backT > 0) { st.backT -= dt; out.left = true; if (st.backT <= 0) st.noDxT = 0; return out; }
        if (nd.hopEdge !== p.id) out.right = true;
        return out;
      }
      st.noDxT = 0;
      // walking: stop while the egg is in the air or wobbling far off the middle; stop before a vent that would puff on us
      if (e.air) { if (person) say(st, p, 'Stop! Let it land!', 5); return out; }
      if (Math.abs(e.s) > 28 || Math.abs(e.v) > 90) return out;
      const risky = ventRisk(m, true, 2.3);
      if (risky && !ventRisk(m, false, 2.3)) {
        if (person && isF) say(st, p, 'Wait... it\'s about to puff!', 7);
        return out;
      }
      const d = m.cr[m.front].x - m.cr[m.back].x;
      if (isF) {
        if (d < Pc.D0 + 8 || nd.eggAir) out.right = true;
        else if (person && Math.abs(pa.vx) < 5 && pa.heldT === undefined) say(st, p, 'Walk with me!');
        if (person && d >= Pc.Dmax - 1 && Math.abs(pa.vx) < 5) say(st, p, 'Walk with me!', 7);
      } else {
        if (d > Pc.D0 - 8) out.right = true;
        if (person && d <= Pc.Dmin + 1 && Math.abs(pa.vx) < 5 && !nd.hop) say(st, p, 'Lead the way! I\'ll follow', 8);
      }
      // a person who isn't levelling: say which way
      if (person && nd.level[o.id] && Math.abs(nd.diff) > 16) {
        const want = nd.level[o.id];
        if (want === 'lift' && pa.liftPx < 8) say(st, p, 'Lift your end!', 7);
        else if (want === 'low' && pa.liftPx > -6) say(st, p, 'Carry it low!', 7);
      }
      if (person && risky && !isF) say(st, p, 'Go go go!', 8);
      return out;
    },
  });
})();
