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
  // is there room to stand at (x, z)? (not in a letter, a crumb, a card wall; inside the page and the camera's view)
  const probe = { x: 0, y: 0, z: 0 };
  function roomAt(st, x, z) {
    if (Math.abs(x) > PA.sideX - 0.2 || z > st.cz + PA.backWall - 0.2 || z < st.cz - PA.topLimit + 0.2) return false;
    probe.x = x; probe.z = z; probe.y = 0;
    MOVER3.push(st.w, probe, MOVER3.r + 0.05, 0, MOVER3.h);
    return Math.hypot(probe.x - x, probe.z - z) < 0.02;
  }
  // the way to run from (fx, fz): straight away from it if there is room, else the nearest free way round to a side
  function awayFrom(st, b, fx, fz, side, also) {
    let ex = b.x - fx, ez = b.z - fz; let ed = Math.hypot(ex, ez);
    if (ed < 0.05) { ex = side || 1; ez = 0; } else { ex /= ed; ez /= ed; }
    // (also: a second spot to draw away from, weaker: the flattened partner it is guarding)
    if (also) { const ax = b.x - also.x, az = b.z - also.z, ad = Math.hypot(ax, az) || 1; ex += ax / ad * 0.7; ez += az / ad * 0.7; ed = Math.hypot(ex, ez) || 1; ex /= ed; ez /= ed; }
    for (const turn of [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1]) {
      const c = Math.cos(turn), sn = Math.sin(turn), x = ex * c - ez * sn, z = ex * sn + ez * c;
      if (roomAt(st, b.x + x * 0.9, b.z + z * 0.9) && roomAt(st, b.x + x * 1.8, b.z + z * 1.8)) return { x, z, ex, ez };
    }
    return { x: ex, z: ez, ex, ez };
  }
  // something about to land on it: a zap ring winding up, a Stamper's or the Walker's shadow. Returns where to run.
  function danger(st, b, W, side) {
    for (const a of st.aliens) {
      if (a.st !== 'live') continue;
      if (a.zap && Math.hypot(a.x - b.x, a.z - b.z) < a.zap.r + 0.8 && !paBlocked(st, a.x, a.z, b.x, b.z)) return awayFrom(st, b, a.x, a.z, side);
      if (a.k === 'stamper' && a.jump && Math.hypot(a.jump.tx - b.x, a.jump.tz - b.z) < 2.6) return awayFrom(st, b, a.jump.tx, a.jump.tz, side);
    }
    if (W && W.stamp && Math.hypot(W.stamp.x - b.x, W.stamp.z - b.z) < 3) return awayFrom(st, b, W.stamp.x, W.stamp.z, side);
    return null;
  }
  // just out of a ring that is still winding up: no stepping back into it (it ran out, its plan pulled it back in,
  // and it shook on the rim). The part of the push that heads for the ring's middle is dropped, so it slides round.
  function rim(st, b, out, live) {
    for (const a of live) {
      if (!a.zap) continue;
      const zx = a.x - b.x, zz = a.z - b.z, zd = Math.hypot(zx, zz);
      if (zd > a.zap.r + 1.8 || zd < 0.01 || paBlocked(st, a.x, a.z, b.x, b.z)) continue;
      const t = cpuNav3.stick(zx, zz), tm = Math.hypot(t.ax, t.ay) || 1, tx = t.ax / tm, ty = t.ay / tm;
      const dot = (out.ax || 0) * tx + (out.ay || 0) * ty;
      if (dot > 0) { out.ax = (out.ax || 0) - dot * tx; out.ay = (out.ay || 0) - dot * ty; if (Math.hypot(out.ax, out.ay) < 0.3) { out.ax = 0; out.ay = 0; } }
    }
  }
  cpuBrain('popaliens', {
    noIdleStop: false,
    reset(s) { s.tgt = null; s.tgtT = 0; s.side = null; s.dodge = 0; s.dodgeT = 0; s.throwT = 0; s.sayT = 0; s.slipT = 0; s.slip = 1; s.stuckT = 0; s.at = null; s.back = false; s.flank = null; s.close = false; s.lastA = null; s.turnT = 0; s.runD = null; s.runT = 9; s.roundT = 0; s.roundId = null; s.peelGo = null; s.peelT = 0; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst, k = p.id;
      if (!st || !st.h || info.intro) return out;
      if (st.phase === 'shrink') { if (st.t > 1.2) out.jump = 'tap'; return out; }
      if (st.phase !== 'march') return out;
      const h = st.h[k], oh = st.h[1 - k], b = p.b3, ob = o.b3;
      if (!b || h.flat) return out;
      if (s.side == null) s.side = b.x < ob.x ? -1 : 1;
      const W = st.walker && st.walker.state !== 'gone' && st.walker.state !== 'fold' ? st.walker : null;
      let run = danger(st, b, W, s.side);
      // one way out: while it runs it keeps the way it chose (as long as that still has room and still leads away),
      // or at the page's edge "straight out" and "round to the side" swap every few steps and it shakes on the spot
      if (run) {
        const kd = s.runD;
        if (kd && s.runT < 0.3 && kd.x * run.ex + kd.z * run.ez > 0 && roomAt(st, b.x + kd.x * 0.9, b.z + kd.z * 0.9)) run = { x: kd.x, z: kd.z, ex: run.ex, ez: run.ez };
        s.runD = { x: run.x, z: run.z }; s.runT = 0;
      } else s.runT = (s.runT || 0) + dt;
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
      // 1. a flattened partner: clear what stands next to them (aliens leave a sticker alone and come for it instead),
      // then go and peel them up
      let guard = false, turning = false;
      if (oh.flat) {
        const dx = ob.x - b.x, dz = ob.z - b.z, d = Math.hypot(dx, dz);
        // Would a zap land on it while it kneels there? It works out when each alien that zaps could next go off (it
        // must hop to within reach, wait out its rest, then wind up for 0.8 s) against the run over plus the 1 s peel.
        const arrive = Math.max(0, d - 1) / (PHYS.maxRun / K3D.U), T = arrive + PA.peelT + 0.15;
        const crowd = live.some(a => {
          const K = PA_KINDS[a.k]; if (!K.zap) return false;
          // (they hop: moving half the time at twice their speed. What counts is how far they are from the sticker,
          // which is where it will be kneeling: it leads them away first, then runs back round them)
          const da = Math.hypot(a.x - ob.x, a.z - ob.z);
          if (a.zap) return da < a.zap.r + 0.6 && a.zap.wind - a.zap.t >= arrive - 0.05;
          return Math.max(Math.max(0, da - (K.zapStart || PA.zapStart)) / (K.speed * 1.25), Math.max(0, a.zapCd)) + (K.zapWind || PA.zapWind) < T;
        });
        if (s.sayT <= 0) { cpuSay(p, 'Hang on!', 1.4); s.sayT = 6; }
        // (it keeps its mind for half a second: "go and peel" and "stay and fight" must not swap every few steps
        // when the sums come out close)
        s.peelT = (s.peelT || 0) - dt;
        if (s.peelT <= 0 || s.peelGo == null) { const go = !crowd; if (go !== s.peelGo) { s.peelGo = go; s.peelT = 0.5; } }
        if (s.peelGo || h.peel > 0.55) {
          if (run) stickTo(out, run.x, run.z, 1);          // (a ring or a shadow over the sticker: step out, then back in)
          else if (d > 0.9) { const gt = paGate(b.x, b.z, ob.x, ob.z); stickTo(out, (gt ? gt.x : ob.x) - b.x, (gt ? gt.z : ob.z) - b.z, 1); rim(st, b, out, live); }
          if (d < 1.2) out.act3 = true;
          paJumps(st, b, out);
          s.sayT -= dt;
          return out;
        }
        guard = true;
      } else s.peelGo = null;
      s.sayT -= dt;
      // 2. where it wants to stand: beside the partner, a little ahead of the camera's line
      let wx = ob.x + s.side * 4, wz = Math.max(st.cz - 4, Math.min(ob.z + 1, st.cz - 2));
      if (st.block) wz = Math.max(wz, st.block.stop + 3);
      // guarding a flattened partner: fight from a few steps on the near side of them
      if (guard) { wx = clamp(ob.x + s.side * 2.5, -13, 13); wz = Math.min(ob.z + 4, st.cz + PA.backWall - 0.8); }
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
      // 4. a target. What the partner is shooting at comes first (beams that cross hit three times as hard, knock a
      // Shield alien's cap off, and an Edger turned edge-on to the partner is wide open from here): for a person,
      // that is the alien their last bolts hit, or the first one along the way they are firing
      let theirs = (CPU.st[1 - k] || {}).tgt;
      if (!cpuOn(1 - k)) {
        theirs = null; let bt = 0.7;
        for (const a of live) { const t = G.time - a.lastHit[1 - k]; if (t < bt) { bt = t; theirs = a.id; } }
        if (theirs == null && oh.sinceShot < 0.5) {
          let bd = PA.boltRange;
          for (const a of live) {
            const dx = a.x - ob.x, dz = a.z - ob.z, d = Math.hypot(dx, dz);
            if (d < bd && Math.abs(ang(Math.atan2(dx, dz) - oh.aim)) < 0.22) { bd = d; theirs = a.id; }
          }
        }
      }
      let tgt = s.tgt && live.find(a => a.id === s.tgt);
      if (!tgt || s.tgtT <= 0 || Math.hypot(tgt.x - b.x, tgt.z - b.z) > PA.boltRange - 1) {
        let best = null, bs = 1e9;
        for (const a of live) {
          const dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz);
          // (behind it: only one that is at the partner's heels, or a Carrier with its grenade)
          if (d > PA.boltRange - 1.5 || (a.z > b.z + 3 && a.k !== 'carrier' && Math.hypot(a.x - ob.x, a.z - ob.z) > 5)) continue;
          if (a.perch && a.st2 === 'back') continue;
          if (paBlocked(st, b.x, b.z, a.x, a.z)) continue;
          let sc = d;
          if (a.k === 'folder' && a.st2 !== 'back') sc -= 6;
          if (a.k === 'carrier') sc -= 4;
          if (a.k === 'lesson') sc -= 2;
          if (theirs === a.id) sc -= a.cap || a.k === 'edger' || a.k === 'stamper' ? 7 : 3;
          // an Edger turned edge-on to it cannot be hit from here: one it can hit (edge-on to the partner, or
          // wobbling) comes first, and so does any other alien
          if (a.k === 'edger') sc += paCanHit(a, dx / (d || 1), dz / (d || 1)) ? -3 : 5;
          // a Shield alien whose cap faces it, with no partner to cross beams with, shrugs its bolts off: it comes last
          if (a.cap && theirs !== a.id && Math.abs(ang(Math.atan2(-dx, -dz) - a.capA)) < 1.1) sc += oh.flat ? 9 : 4;
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
      // a target near the end of the gun's reach: close in to about 10 units (its usual spot may be out of range)
      // (it keeps closing until it is within 10, so it never dithers at the line)
      const dT = tgt ? Math.hypot(tgt.x - b.x, tgt.z - b.z) : 0;
      if (!tgt || dT < 10) s.close = false; else if (dT > 11.5) s.close = true;
      if (tgt && s.close) {
        const dx = b.x - tgt.x, dz = b.z - tgt.z, d = Math.hypot(dx, dz) || 1;
        wx = tgt.x + dx / d * 9.5; wz = Math.max(tgt.z + dz / d * 9.5, st.cz - PA.topLimit + 0.6);
      }
      // a Shield alien whose bottle cap faces it, with no partner shooting it too (beams that cross knock the cap
      // off): walk round to its side, the side with room, while the cap follows whoever is nearer
      if (tgt && tgt.k === 'shield' && tgt.cap && G.time - tgt.lastHit[1 - k] > 1.2) {
        const to = Math.atan2(b.x - tgt.x, b.z - tgt.z);
        if (Math.abs(ang(to - tgt.capA)) < 1.25) {
          if (s.flank == null || s.flankId !== tgt.id) { s.flankId = tgt.id; s.flank = ang(to - tgt.capA) >= 0 ? 1 : -1; s.flankT = 0; }
          // (the cap turns faster than it can run round: after two seconds of trying it stands and hammers the cap,
          // which comes off after a dozen pings)
          s.flankT = (s.flankT || 0) + dt;
          for (let n = 0; n < 2 && s.flankT < 2; n++) {
            const a2 = tgt.capA + s.flank * 1.6, fx = tgt.x + Math.sin(a2) * 4.2, fz = tgt.z + Math.cos(a2) * 4.2;
            if (roomAt(st, fx, fz)) { wx = fx; wz = fz; break; }
            s.flank = -s.flank;
          }
        }
      }
      // a capped Shield alien and nobody to cross beams with (the partner is flattened): a grenade knocks the cap off
      if (tgt && tgt.k === 'shield' && tgt.cap && oh.flat && h.gren > 0 && s.throwT <= 0) {
        const dS = Math.hypot(tgt.x - b.x, tgt.z - b.z);
        if (dS > 4.5 && dS < 9 && Math.abs(ang(Math.atan2(tgt.x - b.x, tgt.z - b.z) - h.aim)) < 0.3) { out.act2 = 'tap'; s.throwT = 2.5; }
      }
      // an Edger turned edge-on to it: walk round it to a spot well off the partner's line (about 75 degrees round)
      // (once it sets off it keeps going round for a second: the Edger turns as its own aim swings, and "go round"
      // and "stay" would swap several times a second)
      s.roundT = (s.roundT || 0) - dt;
      if (tgt && tgt.k === 'edger' && !paCanHit(tgt, Math.sin(Math.atan2(tgt.x - b.x, tgt.z - b.z)), Math.cos(Math.atan2(tgt.x - b.x, tgt.z - b.z)))) { s.roundT = 1; s.roundId = tgt.id; }
      if (tgt && tgt.k === 'edger' && s.roundT > 0 && s.roundId === tgt.id) {
        const pa = Math.atan2(ob.x - tgt.x, ob.z - tgt.z), a2 = pa + s.side * 1.3;
        wx = clamp(tgt.x + Math.sin(a2) * 6, -13, 13); wz = Math.max(tgt.z + Math.cos(a2) * 6, st.cz - PA.topLimit + 1);
        if (s.sayT <= 0) { cpuSay(p, "I'll go round!", 1.4); s.sayT = 8; }
      }
      // the "!" in Letter City: knock it over when nothing is close
      const BG = PA_ROUTE.bang;
      if (!tgt && st.bang && st.bang.up && b.z > BG.z && b.z - BG.z < 14) tgt = { x: BG.x, z: BG.z + 0.6, id: 'bang', k: 'bang' };
      // the Walker: shoot it when no alien is close
      // (while it hides over the hatch bolts do nothing to it: aliens stay the target, a Carrier above all)
      if (W && (W.state === 'crouch' || !tgt || Math.hypot(tgt.x - b.x, tgt.z - b.z) > 5)) {
        if (W.state !== 'crouch') tgt = { x: W.x, z: W.z, id: 'walker', k: 'walker' };
        // hiding over the hatch: throw a grenade under it (from 5 to 8.5 units)
        if (W.state === 'crouch' && h.gren > 0 && s.throwT <= 0) {
          const dW = Math.hypot(W.x - b.x, W.z - b.z), want = Math.atan2(W.x - b.x, W.z - b.z);
          if (dW > 8.5) {
            wx = W.x; wz = W.z + 7;
            // held back by a partner who stays at the bottom of the screen (the two can only be 9 apart): it says so
            if (ob.z - b.z > PA.sepZ - 0.6 && s.sayT <= 0) { cpuSay(p, 'Come up here with me!', 1.8); s.sayT = 5; }
          }
          else if (dW < 4.5) { wx = b.x; wz = W.z + 7; }
          else if (Math.abs(ang(want - h.aim)) < 0.25) { out.act2 = 'tap'; s.throwT = 2; }
          else { stickTo(out, W.x - b.x, W.z - b.z, 0.35); turning = true; }   // (turning to face it: no walking back to its spot meanwhile)
          if (s.sayT <= 0) { cpuSay(p, 'Grenade!', 1.2); s.sayT = 6; }
        } else if (W.state === 'crouch' && h.gren === 0) {
          // no grenade: fetch one lying about (Carriers drop them)
          const g = st.pickups.find(q => q.live && paReach(st, q));
          if (g) { wx = g.x; wz = g.z; }
        }
      }
      // nothing in reach but aliens left (a blockade's last few, a Folder hanging back): go to the nearest
      if (!tgt && live.length && (st.block || live.length)) {
        let near = null, nd = 1e9;
        for (const a of live) { const d = Math.hypot(a.x - b.x, a.z - b.z); if (d < nd) { nd = d; near = a; } }
        // (one hidden behind a letter or a card: right up to it, until it comes into view)
        const hid = near && nd > 3.5 && paBlocked(st, b.x, b.z, near.x, near.z), keep = hid ? 3 : 8;
        if (near && (nd > 8.5 || hid) && nd < 40) { wx = near.x + (b.x - near.x) / nd * keep; wz = Math.max(near.z + (b.z - near.z) / nd * keep, st.cz - PA.topLimit + 0.6); }
      }
      // never aim to stand inside a line of print or card: the spot moves out the far side of it
      for (const L of PA_ROUTE.lines) if (Math.abs(wz - L.z) < L.hd + 0.8) wz = L.z - L.hd - 1.3;
      // a spot with no room to stand (inside a crumb, the capital letter, the bunker): the nearest free spot beside it
      if (!roomAt(st, wx, wz) && Math.abs(wx) < PA.sideX - 0.3) {
        for (const off of [1.5, -1.5, 3, -3, 4.5, -4.5, 6, -6]) { const x2 = wx + off * (wx > 0 ? -1 : 1); if (Math.abs(x2) < 13.5 && roomAt(st, x2, wz)) { wx = x2; break; } }
      }
      // 6. move and aim (through the gap in a line of print or card first)
      const gt = paGate(b.x, b.z, wx, wz); if (gt) { wx = gt.x; wz = gt.z; }
      // step out of a zap ring or a stamp's shadow (run out of it at full speed, round a wall if one is in the way)
      const flee = !!run;
      if (run) { wx = b.x + run.x * 3; wz = b.z + run.z * 3; }
      let mx = wx - b.x, mz = wz - b.z;
      if (s.dodgeT > 0 && s.dodgeN) { mx = s.dodgeN.x * s.dodge * 3; mz = s.dodgeN.z * s.dodge * 3; }
      const md = Math.hypot(mx, mz);
      const canFire = h.reload <= 0 && h.charge > 0;
      // keep out of zapping distance: once an alien that zaps is within 3 units it backs off (firing) until it is 4 away
      let nz = null, dn = 1e9;
      for (const a of live) { if (!PA_KINDS[a.k].zap) continue; const d = Math.hypot(a.x - b.x, a.z - b.z); if (d < dn && !paBlocked(st, a.x, a.z, b.x, b.z)) { dn = d; nz = a; } }
      if (s.back) { if (!nz || dn > 4) s.back = false; } else if (nz && dn < 3) s.back = true;
      const aw = s.back && nz ? awayFrom(st, b, nz.x, nz.z, s.side, guard ? ob : null) : null;
      if (tgt) {
        const dx = tgt.x - b.x, dz = tgt.z - b.z, d = Math.hypot(dx, dz), want = Math.atan2(dx, dz);
        const off = Math.abs(ang(want - h.aim));
        if (flee) { stickTo(out, mx, mz, 1); out.act = canFire && off < 0.2; }
        else if (!canFire) {
          // winding the crank: no aiming (the aim would follow every step and it would dither)
          if (aw) stickTo(out, aw.x, aw.z, 1);
          else if (md > 0.6) stickTo(out, mx, mz, Math.min(1, md / 3));
        } else if (off > 0.17 && s.dodgeT <= 0) {
          // turn: a nudge toward it for a step or two (fire let go, so the aim follows the stick)
          stickTo(out, dx, dz, 0.25);
        } else {
          out.act = true;
          if (aw) stickTo(out, aw.x, aw.z, 1);                 // back away firing
          else if (md > 0.6) stickTo(out, mx, mz, Math.min(1, md / 3));
        }
      } else {
        if (aw) stickTo(out, aw.x, aw.z, 1);
        else if (flee) stickTo(out, mx, mz, 1);
        else if (md > 0.6 && !turning) stickTo(out, mx, mz, Math.min(1, md / 3));
        // a quiet moment: reload by hand
        if (h.charge < 10 && h.reload <= 0 && !live.some(a => Math.hypot(a.x - b.x, a.z - b.z) < 12)) out.act3 = 'tap';
      }
      if (!flee) rim(st, b, out, live);
      // between backing off (inside 3 units) and walking back in: once the nearest zapper is within 4.6 it holds its
      // ground and fires instead of stepping closer (or it weaves in and out about once a second)
      if (!flee && !s.back && nz && dn < 4.6 && dn > 0.01) {
        const t = cpuNav3.stick(nz.x - b.x, nz.z - b.z), tm = Math.hypot(t.ax, t.ay) || 1, tx = t.ax / tm, ty = t.ay / tm;
        const dot = (out.ax || 0) * tx + (out.ay || 0) * ty;
        if (dot > 0.3) { out.ax = (out.ax || 0) - dot * tx; out.ay = (out.ay || 0) - dot * ty; if (Math.hypot(out.ax, out.ay) < 0.3) { out.ax = 0; out.ay = 0; } }
      }
      // pushing at something and getting nowhere for 0.7 s (a crumb, the corner of a word): slip round it sideways
      const push = Math.hypot(out.ax || 0, out.ay || 0);
      if (!s.at) s.at = { x: b.x, z: b.z };
      if (push > 0.3 && b.ground && Math.hypot(b.x - s.at.x, b.z - s.at.z) < 0.25) s.stuckT += dt; else { s.stuckT = 0; s.at.x = b.x; s.at.z = b.z; }
      if (s.stuckT > 0.7) { s.stuckT = 0; s.slipT = 0.6; s.slip = -s.slip; s.slipD = { ax: -(out.ay || 0) * s.slip, ay: (out.ax || 0) * s.slip }; }
      if (s.slipT > 0 && !flee) { s.slipT -= dt; const m = Math.hypot(s.slipD.ax, s.slipD.ay) || 1; out.ax = s.slipD.ax / m; out.ay = s.slipD.ay / m; out.act = false; }
      // one mind: a full push is not thrown into reverse within a fifth of a second of the last change of heart
      // (two plans that both look good must not make it shake); running from a ring or a shadow is never held up
      const pm = Math.hypot(out.ax || 0, out.ay || 0);
      s.turnT = (s.turnT || 0) + dt;
      if (pm > 0.3) {
        const a1 = Math.atan2(out.ay, out.ax);
        if (s.lastA != null && Math.abs(ang(a1 - s.lastA)) > 1.7 && s.turnT < 0.2 && !flee) { out.ax = Math.cos(s.lastA) * pm; out.ay = Math.sin(s.lastA) * pm; }
        else { if (s.lastA == null || Math.abs(ang(a1 - s.lastA)) > 1.7) s.turnT = 0; s.lastA = a1; }
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
