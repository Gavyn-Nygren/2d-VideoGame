/* Pip & Bo - Computer partner brain for 41-4 Paper Alien Invasion (mode 'popaliens').

   The march: it keeps a place beside its partner (to the side the level started it on, about 4 units across and level
   with them), a little ahead of the camera's line so the march keeps moving, and never more than the pair's leash apart.
   Shooting: facing is aiming (the way it last walked, held while fire is held). It picks the nearest live alien in
   front of it within range (a Folder that is folding at it, a Carrier, and an alien its partner is already shooting
   come first, so beams cross), turns to it with a short push of the stick, then holds fire and steers on with the aim
   held. It backs away while firing when an alien gets within 2.5 units.
   Dodging: a Folder folding toward it (its dive line runs through here) makes it step sideways off the line.
   Grenades: it throws one into four or more live aliens bunched within 2.6 units of each other, 5 to 9 units ahead.
   Reload: the gun reloads itself at empty; with no alien within 12 units and fewer than 10 bolts it reloads by hand.
   Peel: a flattened partner comes first: it walks over and holds reload beside them until they are up.
   Pickups: a grenade lying within 5 units (and nothing within 4) is fetched when it has fewer than three.
   It only presses its own buttons. */
'use strict';

(() => {
  const ang = a => Math.atan2(Math.sin(a), Math.cos(a));
  function stickTo(out, dx, dz, k = 1) { const s = cpuNav3.stick(dx, dz); out.ax = s.ax * k; out.ay = s.ay * k; }
  cpuBrain('popaliens', {
    noIdleStop: false,
    reset(s) { s.tgt = null; s.tgtT = 0; s.side = null; s.dodge = 0; s.dodgeT = 0; s.throwT = 0; s.sayT = 0; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst, k = p.id;
      if (!st || !st.h || info.intro) return out;
      if (st.phase === 'shrink') { if (st.t > 1.2) out.jump = 'tap'; return out; }
      if (st.phase !== 'march') return out;
      const h = st.h[k], oh = st.h[1 - k], b = p.b3, ob = o.b3;
      if (!b || h.flat) return out;
      if (s.side == null) s.side = b.x < ob.x ? -1 : 1;
      s.throwT -= dt; s.tgtT -= dt; s.dodgeT -= dt;
      const live = st.aliens.filter(a => a.st === 'live');
      // 1. a flattened partner: go and peel them up
      if (oh.flat) {
        const dx = ob.x - b.x, dz = ob.z - b.z, d = Math.hypot(dx, dz);
        if (d > 0.9) stickTo(out, dx, dz, 1);
        if (d < 1.2) out.act3 = true;
        if (s.sayT <= 0) { cpuSay(p, 'Hang on!', 1.4); s.sayT = 6; }
        s.sayT -= dt;
        return out;
      }
      s.sayT -= dt;
      // 2. where it wants to stand: beside the partner, a little ahead of the camera's line
      let wx = ob.x + s.side * 4, wz = Math.max(st.cz - 4, Math.min(ob.z + 1, st.cz - 2));
      if (st.block) wz = Math.max(wz, st.block.stop + 3);
      // the end of the route (the camera stops there): walk on to it
      if (!st.block && st.cz <= PA_ROUTE.end + 4.5) wz = PA_ROUTE.end - 2;
      if (st.hatch) { wx = st.hatch.x + (k ? 0.6 : -0.6); wz = st.hatch.z; }
      if (Math.abs(wx) > 13) { s.side = -s.side; wx = ob.x + s.side * 4; }
      wx = clamp(wx, -13, 13);
      // a grenade lying near with nothing close
      const near4 = live.some(a => Math.hypot(a.x - b.x, a.z - b.z) < 4.5);
      if (h.gren < 3 && !near4) {
        const g = st.pickups.find(q => q.live && Math.hypot(q.x - b.x, q.z - b.z) < 9 && q.z < st.cz + 4);
        if (g) { wx = g.x; wz = g.z; }
      }
      // 3. dodge a Folder's dive line
      for (const a of live) {
        if (a.k !== 'folder' || a.st2 !== 'fold' || !a.to) continue;
        const lx = a.to.x - a.from.x, lz = a.to.z - a.from.z, L = Math.hypot(lx, lz) || 1;
        const t = ((b.x - a.from.x) * lx + (b.z - a.from.z) * lz) / (L * L);
        const off = ((b.x - a.from.x) * lz - (b.z - a.from.z) * lx) / L;
        if (t > 0 && t < 1.1 && Math.abs(off) < 1.6) { s.dodge = off >= 0 ? 1 : -1; s.dodgeT = 0.6; s.dodgeN = { x: lz / L, z: -lx / L }; }
      }
      // 4. a target
      let tgt = s.tgt && live.find(a => a.id === s.tgt);
      if (!tgt || s.tgtT <= 0 || Math.hypot(tgt.x - b.x, tgt.z - b.z) > PA.boltRange - 1) {
        let best = null, bs = 1e9;
        for (const a of live) {
          const dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz);
          if (d > PA.boltRange - 1.5 || a.z > b.z + 3) continue;
          let sc = d;
          if (a.k === 'folder' && a.st2 !== 'back') sc -= 6;
          if (a.k === 'carrier') sc -= 4;
          if (a.k === 'lesson') sc -= 2;
          if ((CPU.st[1 - k] || {}).tgt === a.id) sc -= 3;
          if (a.hold && d > a.hold + 4) sc += 6;
          if (sc < bs) { bs = sc; best = a; }
        }
        tgt = best; s.tgt = best ? best.id : null; s.tgtT = 0.6;
      }
      // 5. grenade into a bunch: turn to the middle of four or more, and throw once facing it
      if (h.gren > 0 && s.throwT <= 0) {
        let bestA = null, bestN = 3;
        for (const a of live) {
          const d = Math.hypot(a.x - b.x, a.z - b.z);
          if (d < 4.5 || d > 16) continue;
          const n = live.filter(q => Math.hypot(q.x - a.x, q.z - a.z) < PA.burstR + 0.4).length;
          if (n > bestN) { bestN = n; bestA = a; }
        }
        if (bestA) {
          tgt = bestA; s.tgt = bestA.id; s.tgtT = 0.4;
          const dB = Math.hypot(bestA.x - b.x, bestA.z - b.z);
          // too far for a throw (it flies about 7 units, 9 with the aim help): walk up to it first
          if (dB > 9) { wx = bestA.x; wz = bestA.z + 7; }
          else if (Math.abs(ang(Math.atan2(bestA.x - b.x, bestA.z - b.z) - h.aim)) < 0.3) { out.act2 = 'tap'; s.throwT = 2.5; }
        }
      }
      // nothing in reach but aliens left (a blockade's last few, a Folder hanging back): go to the nearest
      if (!tgt && live.length && (st.block || live.length)) {
        let near = null, nd = 1e9;
        for (const a of live) { const d = Math.hypot(a.x - b.x, a.z - b.z); if (d < nd) { nd = d; near = a; } }
        if (near && nd > 10 && nd < 40) { wx = near.x; wz = Math.max(near.z + 8, st.cz - 10); }
      }
      // 6. move and aim
      let mx = wx - b.x, mz = wz - b.z;
      if (s.dodgeT > 0 && s.dodgeN) { mx = s.dodgeN.x * s.dodge * 3; mz = s.dodgeN.z * s.dodge * 3; }
      const md = Math.hypot(mx, mz);
      if (tgt) {
        const dx = tgt.x - b.x, dz = tgt.z - b.z, d = Math.hypot(dx, dz), want = Math.atan2(dx, dz);
        const off = Math.abs(ang(want - h.aim));
        if (off > 0.12 && s.dodgeT <= 0) {
          // turn: a short push toward it (let go of fire so the aim follows the stick)
          stickTo(out, dx, dz, 0.35);
        } else {
          out.act = h.reload <= 0 && h.charge > 0;
          if (d < 2.5) stickTo(out, -dx, -dz, 1);            // back away firing
          else if (md > 0.6) stickTo(out, mx, mz, Math.min(1, md / 3));
        }
      } else {
        if (md > 0.6) stickTo(out, mx, mz, Math.min(1, md / 3));
        // a quiet moment: reload by hand
        if (h.charge < 10 && h.reload <= 0 && !live.some(a => Math.hypot(a.x - b.x, a.z - b.z) < 12)) out.act3 = 'tap';
      }
      return out;
    },
  });
})();
