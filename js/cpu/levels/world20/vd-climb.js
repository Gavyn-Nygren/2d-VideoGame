/* Pip & Bo - Computer partner: 20-1 Volcano Dragon, phase 'climb' (Slope Climb). */
'use strict';

/* The plan (a helpful teammate at full skill; the course is one line of ground, so no path finding is needed):
   - The job comes from the game (S.ph.sh is the shielder; jobs swap at each flag). In stretch 1 the person may grab
     the shield first: as the default shielder the computer waits VDCL.claimWait s before raising it, and if the
     person takes it, the computer simply climbs.
   - SHIELDER: raises the shield whenever a fire is coming near either of them or a rock is on its way, and steps
     toward the climber when the climber stands in the fire zone close by. Walks to the foot of the next wall and
     waits there (shield ready) until the ladder is down, then climbs it. Lowers the shield to jump a 60 px step.
   - CLIMBER: walks ahead to the next wall, climbs the grips, walks to the hook and drops the ladder, then waits on
     top near the edge until the shielder is up. In a fire zone it hides under the shielder's shield when that is
     close, else steps out of the zone. It jumps rocks that roll at it when it isn't under the shield.
   - Both: hop small steps, wait for a slow partner (never more than about 260 px ahead, never past a flag alone),
     and walk away from the lava. It never clears anything alone: walls need both on top, flags need both there.
   - Talk (1-player only, short): asks for the shield, says when the ladder is down, nudges a person who waits
     at a wall or a ladder, "Rock!". */
VD_BRAINS.climb = {
  reset(b) { b.t = 0; b.jumpHold = 0; b.waitWall = 0; b.waitHook = 0; b.waitLadder = 0; },
  think(b, p, o, dt, info, S) {
    const ph = S.ph;
    if (!ph || !ph.c || !p.alive) return {};
    b.t += dt;
    const out = {}, me = ph.P[p.id], sh = ph.sh === p.id, solo = !info.partnerCpu;
    // (brains run between ticks, when players are on SCREEN: P and O are world-coord copies for the course maths)
    const cam = S.cam, wp = q => ({ id: q.id, x: q.x + cam.x, y: q.y + cam.y, w: q.w, h: q.h, vx: q.vx, vy: q.vy, grounded: q.grounded, alive: q.alive });
    const P = wp(p), O = wp(o);
    const cx = cpuCx(P), ocx = cpuCx(O), feet = cpuFeet(P), ofeet = cpuFeet(O);
    const say = (k, txt, again) => vdBrainSay(b, p, k, txt, again);
    // ---- threats ----
    const fires = (S.fires || []).filter(f => f.phase !== 'out');
    const level = f => vdClimbSup(ph, P.x, P.w) >= f.gy - 12;                 // a flame on the ground I stand on
    const fz = fires.map(f => ({ f, z: vdFireZone(f) }));
    const inZone = (q, o2) => q.x + q.w > o2.z.x0 && q.x < o2.z.x1 && cpuFeet(q) > o2.z.y0 && cpuFeet(q) < o2.z.y1 + 4;
    const myF = fz.find(o2 => level(o2.f) && inZone(P, o2)), oF = fz.find(o2 => inZone(O, o2) && vdClimbSup(ph, O.x, O.w) >= o2.f.gy - 12);
    const fireNear = fz.some(o2 => cx > o2.z.x0 - 220 && cx < o2.z.x1 + 220 && Math.abs(o2.f.gy - feet) < 200);
    const rocks = ph.rocks.filter(r => !r.gone && r.x + r.r > P.x - 6 && r.y < feet + 20 && r.x - cx < (r.warn > 0 ? 1000 : 420)).sort((a, c) => a.x - c.x);
    const rock = rocks[0] || null, rockNear = !!rock;
    const together = Math.abs(ocx - cx) < 150 && Math.abs(ofeet - feet) < 30 && !ph.P[o.id].climb;
    const myUnder = vdUnderShield(S, p) >= 0;
    // on a wall: keep going up, but hang on just below the top while a flame covers the ledge
    if (me.climb) {
      const w = me.climb.w, hot = fz.some(o2 => o2.z.x0 < w.face + 50 && o2.z.x1 > w.face - 10 && Math.abs(o2.f.gy - w.top) < 24);
      if (hot && feet - w.top < 46) return { keep: true };
      return { jump: true, up: true };
    }
    if (b.jumpHold > 0) { b.jumpHold -= dt; out.jump = true; }

    // ---- where to go ----
    const walls = ph.c.walls, flag = ph.c.flags[ph.k];
    const myTop = walls.find(w => vdClimbTopped(P, w) && !w.cleared);      // I'm up, the partner isn't yet
    const next = walls.find(w => w.k === ph.k && !vdClimbTopped(P, w) && w.face > cx - 30);
    let goal = flag.x + 26 + (p.id ? 22 : -8), task = 'flag';
    if (myTop) {
      if (!sh && !myTop.down) { goal = myTop.hookX; task = 'hook'; }
      else { goal = myTop.face + 34; task = 'top'; }
    } else if (next) {
      goal = next.face - 11; task = sh ? (next.down && next.unroll >= 0.8 ? 'ladder' : 'foot') : (next.down ? 'ladder' : 'grip');
    }
    // don't run off ahead of a slow partner (the leash would stop us anyway)
    const ahead = cx - ocx;
    if (task !== 'hook' && task !== 'grip' && task !== 'ladder' && ahead > 240 && !ph.P[o.id].climb && goal > cx) { goal = cx; if (solo && ahead > 300) say('come', 'Come on! This way!', 14); }
    if (task === 'grip' && ahead > 330 && !ph.P[o.id].climb) goal = Math.min(goal, cx);
    // a slow person at a flag: wait there
    if (task === 'flag' && cx > flag.x - 10 && solo) say('flag', 'To the flag!', 16);

    // ---- the shield (shielder) ----
    if (sh) {
      const early = !ph.locked && solo && S.phT < VDCL.claimWait;   // let the person grab the shield first
      const threat = fireNear || rockNear;
      out.act = !early && threat;
      if (out.act && oF && together && vdUnderShield(S, o) < 0) goal = ocx;                   // cover the climber
      else if (out.act && (myF || (rock && rock.warn <= 0)) && task !== 'ladder') goal = cx;  // plant and block
      if (solo && oF && !together && oF.f.phase === 'inhale') say('dodge', 'Look out!', 8);
    } else {
      // ---- the climber: fire ----
      const shp = wp(G.players[ph.sh]), shCx = cpuCx(shp), shUp = vdShieldUp(S, ph.sh);
      const shNear = Math.abs(shCx - cx) < 150 && Math.abs(cpuFeet(shp) - feet) < 30 && !ph.P[shp.id].climb;
      if (myF && !myUnder) {
        const f = myF.f, z = myF.z;
        if (shNear && (shUp || (f.phase === 'inhale' && f.t < f.inhale - 0.35))) { goal = shCx; if (solo && !shUp) say('shieldMe', 'Shield up, please!', 7); }
        else {
          const l = z.x0 - 16 - P.w / 2, r = z.x1 + 16 + P.w / 2;
          const okR = vdClimbG(ph, r) >= feet - VDCL.stepUp;
          goal = okR && (r - cx < cx - l) ? r : l;
        }
      } else if (myF && myUnder) goal = shCx;
      else if (!myUnder) {
        // don't walk into a flame on my level
        for (const o2 of fz) {
          if (!level(o2.f) || Math.abs(o2.f.gy - feet) > 30) continue;
          if (goal > cx && o2.z.x0 > cx && o2.z.x0 < goal + 14) goal = Math.min(goal, o2.z.x0 - 14 - P.w / 2);
          if (goal < cx && o2.z.x1 < cx && o2.z.x1 > goal - 14) goal = Math.max(goal, o2.z.x1 + 14 + P.w / 2);
        }
      }
      // ---- the climber: rocks (hide under a raised shield close by, or jump at the right moment) ----
      if (rock && rock.warn <= 0 && !myUnder) {
        const gap = rock.x - rock.r - (P.x + P.w), v = Math.max(60, -rock.vx + Math.max(0, P.vx)), tt = gap / v;
        const reach = Math.max(0, Math.abs(shCx - cx) - 28) / 200 + 0.08;          // time to get under the dome
        if (shNear && shUp && reach < gap / Math.max(60, -rock.vx) - 0.1) goal = shCx;
        else if (p.grounded) {
          const low = rock.y + rock.r > feet - 34;
          if (low && tt < 0.2 && tt > -0.08) { out.jump = b.jumpHeld ? false : 'tap'; b.jumpHold = 0.3; }
          else if (low && tt < 0.6) goal = cx;                                        // stand and get ready to jump
        }
      }
      if (solo && rock && rock.warn > 0) say('rock', 'Rock!', 10);
    }

    // ---- walking, steps, walls ----
    const dir = goal > cx + 4 ? 1 : goal < cx - 4 ? -1 : 0;
    vdBrainSeek(out, p, goal - cam.x, 4);
    if (dir && p.grounded) {
      const front = dir > 0 ? P.x + P.w : P.x, ahead2 = vdClimbG(ph, front + dir * 14), rise = feet - ahead2;
      const wallHere = walls.some(w => Math.abs(w.face - (front + dir * 14)) < 20 && w.base - w.top > 100 && feet > w.top + 8);
      if (rise > VDCL.stepUp && !wallHere) {
        if (sh && vdShieldUp(S, p.id) && rise > 36) { if (!out.act) out.act = false; else { out.left = out.right = false; } }   // a big step: drop the shield to jump it, but not while something is coming
        else if (Math.abs(p.vx) > 40 || rise <= 36) { out.jump = 'tap'; b.jumpHold = rise > 36 ? 0.3 : 0.12; }
      }
    }
    // at a wall's foot: climb the grips (climber) or the ladder (anyone, once it's down)
    if (task === 'grip' || task === 'ladder') {
      const w = next, atFace = P.x + P.w >= w.face - VDCL.reach + 1;
      if (atFace) {
        out.left = out.right = false;
        const r = vdClimbReach(S, P);
        if (r && r.kind !== 'none') { out.jump = true; out.up = true; }
        else out.right = true;
      }
    }
    if (task === 'foot' && Math.abs(goal - cx) < 30) {
      b.waitWall += dt;
      const cl = O;
      if (solo && b.waitWall > 5 && !vdClimbTopped(cl, next) && !ph.P[cl.id].climb) say('climbIt', 'Climb the grips! I\'ll shield you!', 12);
    } else b.waitWall = 0;
    if (task === 'top' && myTop && myTop.down) {
      // waiting on top for the partner to come up the ladder
      if (solo && Math.abs(ocx - myTop.face) < 60 && !ph.P[o.id].climb && ofeet > myTop.top + 20) { b.waitLadder += dt; if (b.waitLadder > 4) say('ladder', 'Climb the ladder!', 10); }
      else b.waitLadder = 0;
    }
    if (task === 'ladder' && !sh && solo) say('ladderMe', 'Thanks for the ladder!', 30);
    if (task === 'hook') {
      if (Math.abs(goal - cx) < 26 && p.grounded) out.act = true;   // hold it: the ladder unrolls
    }
    if (sh && task === 'ladder' && next && solo && Math.abs(goal - cx) < 20) say('upLadder', 'Coming up!', 12);
    // the person is the climber, up on a wall, and hasn't dropped the ladder
    if (sh && solo && next) {
      const cl = O;
      if (vdClimbTopped(cl, next) && !next.down) { b.waitHook += dt; if (b.waitHook > 4) say('hookIt', 'Drop the ladder for me!', 10); }
      else b.waitHook = 0;
    }
    // lava close behind: hurry
    if (ph.lava.front > cx - 90 && !me.climb) { out.right = true; out.left = false; }
    b.jumpHeld = !!out.jump && out.jump !== 'tap';

    return vdBrainHop(b, out, P);
  },
};
