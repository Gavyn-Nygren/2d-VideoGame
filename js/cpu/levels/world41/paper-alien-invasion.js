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
   Letter City and the hill: it walks through the gaps in the lines of print and card (paGate, as the aliens do), never
   shoots at an alien hidden behind a letter, steps round an Edger that is edge-on to it, and knocks the "!" over.
   It jumps slits and holes and the Walker's crayon line, and steps out of stamp shadows and the searchlight.
   In the Ink Crater it keeps to the dry path. At the Scribble Walker it stands on the far side from its partner (so
   the beams cross), throws a grenade under it when it hides over the hatch, and on the hatch it stands and holds.
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
      const W = st.walker && st.walker.state !== 'gone' && st.walker.state !== 'fold' ? st.walker : null;
      // the finish: stand on the hatch beside the partner and hold reload
      if (st.hatch) {
        const hx = st.hatch.x + (k ? 0.6 : -0.6), hz = st.hatch.z, d = Math.hypot(hx - b.x, hz - b.z);
        const gt = paGate(b.x, b.z, hx, hz);
        if (d > 0.3) stickTo(out, (gt ? gt.x : hx) - b.x, (gt ? gt.z : hz) - b.z, d > 0.8 ? 1 : 0.5);
        if (paOnHatch(st, k)) out.act3 = true;
        paJumps(st, b, out);
        return out;
      }
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
      // the Ink Crater: keep to the dry path (wet ink is slow)
      if (st.inkAt && st.inkAt(wx, wz)) { const I = PA_ROUTE.ink; wx = I.pathX(wz) + s.side * 1.3; }
      // the Walker: one of two spots in front of it, about 110 degrees apart (so the beams cross); it keeps the one
      // farther from its partner, and only changes when the partner comes near its spot
      if (W) {
        const pa = Math.atan2(ob.x - W.x, ob.z - W.z);
        if (s.slot == null) s.slot = Math.abs(ang(0.95 - pa)) > Math.abs(ang(-0.95 - pa)) ? 0.95 : -0.95;
        if (Math.abs(ang(s.slot - pa)) < 0.6) s.slot = -s.slot;
        wx = clamp(W.x + Math.sin(s.slot) * 6.5, -13.5, 13.5); wz = W.z + Math.cos(s.slot) * 6.5;
        wz = Math.min(wz, st.cz + PA.backWall - 1); wz = Math.max(wz, st.cz - PA.topLimit + 0.8);
        if (W.state === 'crouch' || W.state === 'rear') { wx = W.x + Math.sin(s.slot) * 5; wz = Math.max(W.z + 5, st.cz - PA.topLimit + 1); }
      } else s.slot = null;
      // the searchlight: do not stand in it
      if (st.cone && st.cone.mode === 'rest' && Math.hypot(wx - st.cone.x, wz - st.cone.z) < 2.6) wx += (wx >= st.cone.x ? 1 : -1) * 3;
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
          if (a.perch && a.st2 === 'back') continue;
          if (paBlocked(st, b.x, b.z, a.x, a.z)) continue;
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
      // an Edger turned edge-on to it: walk round it to a spot well off the partner's line (about 75 degrees round)
      if (tgt && tgt.k === 'edger' && !paCanHit(tgt, Math.sin(Math.atan2(tgt.x - b.x, tgt.z - b.z)), Math.cos(Math.atan2(tgt.x - b.x, tgt.z - b.z)))) {
        const pa = Math.atan2(ob.x - tgt.x, ob.z - tgt.z), a2 = pa + s.side * 1.3;
        wx = clamp(tgt.x + Math.sin(a2) * 6, -13, 13); wz = Math.max(tgt.z + Math.cos(a2) * 6, st.cz - PA.topLimit + 1);
        if (s.sayT <= 0) { cpuSay(p, "I'll go round!", 1.4); s.sayT = 8; }
      }
      // the "!" in Letter City: knock it over when nothing is close
      const BG = PA_ROUTE.bang;
      if (!tgt && st.bang && st.bang.up && b.z > BG.z && b.z - BG.z < 14) tgt = { x: BG.x, z: BG.z + 0.6, id: 'bang', k: 'bang' };
      // the Walker: shoot it when no alien is close
      if (W && (!tgt || Math.hypot(tgt.x - b.x, tgt.z - b.z) > 5)) {
        if (W.state === 'crouch') tgt = null; else tgt = { x: W.x, z: W.z, id: 'walker', k: 'walker' };
        // hiding over the hatch: throw a grenade under it (from 5 to 8.5 units)
        if (W.state === 'crouch' && h.gren > 0 && s.throwT <= 0) {
          const dW = Math.hypot(W.x - b.x, W.z - b.z), want = Math.atan2(W.x - b.x, W.z - b.z);
          if (dW > 8.5) { wx = W.x; wz = W.z + 7; }
          else if (dW < 4.5) { wx = b.x; wz = W.z + 7; }
          else if (Math.abs(ang(want - h.aim)) < 0.25) { out.act2 = 'tap'; s.throwT = 2; }
          else stickTo(out, W.x - b.x, W.z - b.z, 0.35);
          if (s.sayT <= 0) { cpuSay(p, 'Grenade!', 1.2); s.sayT = 6; }
        } else if (W.state === 'crouch' && h.gren === 0) {
          // no grenade: fetch one lying about (Carriers drop them)
          const g = st.pickups.find(q => q.live);
          if (g) { wx = g.x; wz = g.z; }
        }
      }
      // nothing in reach but aliens left (a blockade's last few, a Folder hanging back): go to the nearest
      if (!tgt && live.length && (st.block || live.length)) {
        let near = null, nd = 1e9;
        for (const a of live) { const d = Math.hypot(a.x - b.x, a.z - b.z); if (d < nd) { nd = d; near = a; } }
        if (near && nd > 10 && nd < 40) { wx = near.x; wz = Math.max(near.z + 8, st.cz - 10); }
      }
      // never aim to stand inside a line of print or card: the spot moves out the far side of it
      for (const L of PA_ROUTE.lines) if (Math.abs(wz - L.z) < L.hd + 0.8) wz = L.z - L.hd - 1.3;
      // 6. move and aim (through the gap in a line of print or card first)
      const gt = paGate(b.x, b.z, wx, wz); if (gt) { wx = gt.x; wz = gt.z; }
      // step out of a stamp's shadow
      // (the shadow lands where you stood, so run out sideways from the stamper, the full width of it, at full speed)
      let flee = false;
      const out3 = (sx, sz, fromX, fromZ, r) => {
        let ex = b.x - sx, ez = b.z - sz, ed = Math.hypot(ex, ez);
        if (ed < 0.4) { const fx = b.x - fromX, fz = b.z - fromZ, fd = Math.hypot(fx, fz) || 1; ex = -fz / fd; ez = fx / fd; if (b.x * ex < 0) { ex = -ex; ez = -ez; } ed = 1; }
        wx = sx + ex / ed * (r + 1.2); wz = sz + ez / ed * (r + 1.2); flee = true;
      };
      for (const a of live) if (a.k === 'stamper' && a.jump && Math.hypot(a.jump.tx - b.x, a.jump.tz - b.z) < 2.4) out3(a.jump.tx, a.jump.tz, a.x, a.z, 1.8);
      if (W && W.stamp && Math.hypot(W.stamp.x - b.x, W.stamp.z - b.z) < 3) out3(W.stamp.x, W.stamp.z, W.x, W.z, 2.2);
      let mx = wx - b.x, mz = wz - b.z;
      if (s.dodgeT > 0 && s.dodgeN) { mx = s.dodgeN.x * s.dodge * 3; mz = s.dodgeN.z * s.dodge * 3; }
      const md = Math.hypot(mx, mz);
      if (tgt) {
        const dx = tgt.x - b.x, dz = tgt.z - b.z, d = Math.hypot(dx, dz), want = Math.atan2(dx, dz);
        const off = Math.abs(ang(want - h.aim));
        if (flee) stickTo(out, mx, mz, 1);
        else if (off > 0.12 && s.dodgeT <= 0) {
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
      paJumps(st, b, out);
      return out;
    },
  });
  // jump an open (or opening) slit or hole just ahead in the way it is going, and the Walker's crayon line
  function paJumps(st, b, out) {
    if (!b.ground) {
      if (b.vy > 0) out.jump = true;
      // in the air: carry on at full stride the way it was going (so a jump clears what it was for)
      const v = Math.hypot(b.vx, b.vz); if (v > 0.5) { const st2 = cpuNav3.stick(b.vx, b.vz); out.ax = st2.ax; out.ay = st2.ay; }
      return;
    }
    const vx = out.ax || 0, vz = out.ay || 0, sp = Math.hypot(vx, vz);
    for (const ho of st.holes) {
      if (G.time > ho.gone || G.time < ho.open - 0.6) continue;
      if (b.x < ho.x0 - 0.5 || b.x > ho.x1 + 0.5) continue;
      const dz = ho.z - b.z;
      if (Math.abs(dz) < ho.hw + 1.5 && sp > 0.2 && Math.sign(dz) === Math.sign(vz) && Math.abs(dz) > ho.hw + 0.2) { out.jump = true; if (sp < 0.9) { const k = 1 / sp; out.ax *= k; out.ay *= k; } return; }
    }
    const W = st.walker;
    if (W && W.line && W.line.t >= 0.85) { const dz = b.z - W.line.z; if (dz > -0.1 && dz < 1.2) out.jump = true; }
  }
})();
