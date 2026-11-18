/* Pip & Bo - 42-3 Spook Manor: light and dark, as rules (PARKMANOR_LIGHT). No three.js; loaded with the game, so the
   level plays the same with drawing off. The 3D scenery draws what this file decides (parkmanor-scenery.js).

   Pip carries the lantern all level. It always throws a warm circle (S.R across... radius S.R) round it; holding Pip's
   button narrows it into a beam S.BEAM long the way Pip faces, and the circle round Pip shrinks to S.R_BEAM. Walls
   stop light: a point is lit only if the lantern can see it (PML.los). Other strong light: a wound chandelier (its
   room), a wound lamp (a circle), the lightning flash (everything, for a beat). Spooks freeze in any of it.
     PML.lantern(st)          -> { x, y, z, on, r, beam: null | { x, z, dx, dz, len } } where the light comes from now
     PML.lit(st, x, z, why)   is (x, z) in strong light? why (optional object) gets .by = 'circle'|'beam'|'lamp'|'flash'
     PML.inLantern(st, x, z)  in the lantern's own circle or beam (the Butler sees further into it, and is slowed by it)
     PML.los(st, x0, z0, x1, z1)  no wall or tall furniture between the two points */
'use strict';

const PARKMANOR_LIGHT = (function () {
  const L = {};
  const S = L.S = { R: 2.5, R_BEAM: 1.0, R_GOLD: 3.5, BEAM: 14, BEAM_W0: 0.45, BEAM_SPREAD: 0.2, HAND: 0.32, SIDE: 0.26, Y: 0.95, TALL: 1.35 };
  // does a segment cross a box solid (in its own frame, slab test)?
  function hitsBox(s, x0, z0, x1, z1) {
    const [ax, az] = MOVER3.local(s, x0, z0), [bx, bz] = MOVER3.local(s, x1, z1);
    const hw = s.w / 2, hd = s.d / 2;
    let t0 = 0, t1 = 1;
    const dx = bx - ax, dz = bz - az;
    for (const [p, d, h] of [[ax, dx, hw], [az, dz, hd]]) {
      if (Math.abs(d) < 1e-9) { if (p < -h || p > h) return false; continue; }
      let ta = (-h - p) / d, tb = (h - p) / d;
      if (ta > tb) { const q = ta; ta = tb; tb = q; }
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
      if (t0 > t1) return false;
    }
    return t1 > 0.001 && t0 < 0.999;
  }
  // where along a segment the first blocker is (0..1), or 1 when clear
  function firstHit(st, x0, z0, x1, z1) {
    let best = 1;
    for (const s of st.w.solids) {
      if (s.ghost || s.y1 < S.TALL || s.y0 > 2 || s.kind === 'stair' || s.kind === 'landing' || s.kind === 'porch' || s.kind === 'edge') continue;
      if (!hitsBox(s, x0, z0, x1, z1)) continue;
      // bisect for the entry point (cheap enough: a handful of blockers at most)
      let lo = 0, hi = best;
      for (let k = 0; k < 10; k++) { const m = (lo + hi) / 2; if (hitsBox(s, x0, z0, x0 + (x1 - x0) * m, z0 + (z1 - z0) * m)) hi = m; else lo = m; }
      best = Math.min(best, hi);
    }
    return best;
  }
  L.los = (st, x0, z0, x1, z1) => firstHit(st, x0, z0, x1, z1) >= 0.999;
  L.firstHit = firstHit;

  // the lantern's place and state (st.pip = Pip's body; st.stiff, st.hidden, st.beam from the rules)
  L.lantern = function (st) {
    const p = G.players[0], b = p && p.b3;
    if (!b || !st.hasLantern) {
      const h = PARKMANOR_HOUSE.hooks.lantern;
      return { x: h.x, y: h.y, z: h.z, on: true, r: 1.6, beam: null, hung: true };
    }
    const stiff = st.stiff[0] > 0;
    const hd = b.heading || 0, hx = Math.sin(hd), hz = Math.cos(hd);
    const side = stiff ? 0 : S.SIDE; // held out a little to one side, so it lights Pip's face rather than hiding it
    const x = b.x + hx * (stiff ? 0.6 : S.HAND) + hz * side, z = b.z + hz * (stiff ? 0.6 : S.HAND) - hx * side;
    const on = !st.hidden;
    const gold = st.gold > 0;
    let beam = null;
    if (on && st.beam && !stiff) {
      const far = firstHit(st, x, z, x + hx * S.BEAM, z + hz * S.BEAM);
      beam = { x, z, dx: hx, dz: hz, len: Math.max(0.6, far * S.BEAM) };
    }
    return { x, y: stiff ? 0.2 : b.y + S.Y, z, on, r: !on ? 0 : beam ? S.R_BEAM * (gold ? 1.4 : 1) : gold ? S.R_GOLD : S.R, beam, gold };
  };
  // in the lantern's circle or beam?
  L.inLantern = function (st, x, z, lan) {
    const l = lan || st.lan || L.lantern(st);
    if (!l.on) return null;
    const d = Math.hypot(x - l.x, z - l.z);
    if (d <= l.r && L.los(st, l.x, l.z, x, z)) return 'circle';
    if (l.beam) {
      const B = l.beam, rx = x - B.x, rz = z - B.z, t = rx * B.dx + rz * B.dz;
      if (t > 0 && t <= B.len) {
        const off = Math.abs(rx * B.dz - rz * B.dx);
        if (off <= S.BEAM_W0 + t * S.BEAM_SPREAD) return 'beam';
      }
    }
    return null;
  };
  // in any strong light?
  L.lit = function (st, x, z, why) {
    let by = L.inLantern(st, x, z);
    if (!by && st.flash > 0.25) by = 'flash';
    if (!by) for (const w of st.wound) {
      if (w.t <= 0) continue;
      const def = w.def;
      if (def.light.rect) { const [x0, x1, z0, z1] = def.light.rect; if (x >= x0 && x <= x1 && z >= z0 && z <= z1) { by = 'lamp'; break; } }
      else if (Math.hypot(x - def.light.x, z - def.light.z) <= def.light.r) { by = 'lamp'; break; }
    }
    if (why) why.by = by;
    return !!by;
  };
  return L;
})();
