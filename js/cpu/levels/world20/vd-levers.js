/* Pip & Bo - Computer partner: 20-1 Volcano Dragon, phase 'levers' (Hopping Pillars). */
'use strict';

/* The game gives the jobs (badges, swapped after every dunk; in 1-player mode a person with the shield who reaches the
   lit lever first while the computer is far takes the pull job), so the brain reads its job every step and plays it:
     puller    heads for the lever under his pillar (or the one he is about to hop to) with cpuNav, but waits just
               outside its fire zone until the partner stands at the lever with the shield up, then steps in under the
               shield and holds the action. It never pulls uncovered, so it can't win a dunk alone ("Shield me!").
     shielder  walks there with the shield down (it can't jump high with it up), then stands beside the lever (or
               beside the puller) and holds the shield up, and waits there for a slow puller ("Come pull!").
   Both: when he crouches to hop, they head for the next lever (unless the pull is nearly done); a flame zone they
   stand in sends them under a raised shield nearby, or a step out of it; they hop over the partner when blocked.
   The core brain stops it while the person is away (10 s), like Cinder. */
(() => {
  const spotOk = (x, feet) => {
    const tx = Math.floor(x / T), ty = Math.round(feet / T), ch = tile(tx, ty);
    return x > 12 && x < W - 12 && (ch === '#' || ch === '=') && !solidFor(tile(tx, ty - 1), G.players[0]);
  };
  // the lever the team should go for now
  function goalOf(S) {
    const ph = S.ph, n = ph.cin;
    if (ph.dunk) return -1;
    if (n.state === 'crouch' && n.to >= 0) {
      const lv = ph.levers[n.on], pu = G.players[ph.pull];
      if (!(lv.prog > 0.2 && vdlAt(pu, lv) && vdUnderShield(S, pu) >= 0)) return n.to;
    }
    return vdlGoal(ph);
  }
  // where to wait for the shield: a spot near the lever, outside its fire zone, quickest to get to from where I am
  // (from above, on the ledge above; from below, on the rim below - never a way that crosses the zone)
  function waitSpot(p, lv) {
    const G2 = VDL.guard, zx0 = lv.x - G2.w / 2 - p.w / 2 - 8, zx1 = lv.x + G2.w / 2 + p.w / 2 + 8, zy0 = lv.feet - G2.h, zy1 = lv.feet + 8 + p.h;
    // the lever's ledge: below it (and the run-up beside it) is where the shielder jumps up, so don't wait there
    const lt = Math.floor(lv.x / T), lr = Math.round(lv.feet / T), solidAt = tx => '#='.includes(tile(tx, lr));
    let a = lt, b = lt;
    while (a > 0 && solidAt(a - 1)) a--;
    while (b < COLS - 1 && solidAt(b + 1)) b++;
    const ex0 = a * T - 40, ex1 = (b + 1) * T + 40;
    let best = null, bs = Infinity;
    for (let ty = 1; ty < ROWS - 1; ty++) for (let tx = 0; tx < COLS; tx++) {
      const x = tx * T + T / 2, feet = (ty + 1) * T;
      if (Math.abs(x - lv.x) > 210 || Math.abs(feet - lv.feet) > 120 || !spotOk(x, feet)) continue;
      if (x > zx0 && x < zx1 && feet > zy0 && feet - p.h < zy1) continue;
      if (feet > lv.feet + 10 && x > ex0 && x < ex1) continue;
      const sc = vdlEst(p, { x, feet }) + Math.hypot(x - lv.x, feet - lv.feet) / 110;
      if (sc < bs) { bs = sc; best = { x, feet }; }
    }
    return best || { x: lv.x, feet: lv.feet };
  }
  // a flame zone p stands in, not under a shield
  function threat(S, p) {
    if (vdUnderShield(S, p) >= 0) return null;
    return vdBrainFire(S, p);
  }
  function dodgeX(p, f) {
    const z = vdFireZone(f), feet = cpuFeet(p), cx = cpuCx(p);
    const a = z.x0 - p.w / 2 - 6, b = z.x1 + p.w / 2 + 6;
    const ok = x => spotOk(x, feet);
    const xs = [a, b].filter(ok).sort((u, v) => Math.abs(u - cx) - Math.abs(v - cx));
    return xs.length ? xs[0] : null;
  }
  // the same floor between two x (no gap): walk straight there
  function sameFloor(ax, bx, feet) {
    const ty = Math.round(feet / T);
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx) + 0.1; x += 10) { const ch = tile(Math.floor(x / T), ty); if (ch !== '#' && ch !== '=') return false; }
    return true;
  }
  // go to (x, feet): straight along the floor when it is the same floor, else with cpuNav. True when there.
  function go(bst, out, p, x, feet, tol = 6) {
    if (p.grounded) bst.lastFeet = cpuFeet(p);
    const pf = p.grounded ? cpuFeet(p) : bst.lastFeet != null ? bst.lastFeet : cpuFeet(p);
    if (Math.abs(pf - feet) < 3 && sameFloor(cpuCx(p), x, feet)) {
      bst.nav = null;
      const ok = cpuSeek(out, p, x, tol);
      return p.grounded && (ok || Math.abs(cpuCx(p) - x) <= tol);
    }
    // standing on the partner's head: cpuNav has no cell there, so step off onto their floor first
    const o = G.players[1 - p.id];
    if (p.grounded && p.onPartner && !p.tileGround) {
      const of = cpuFeet(o), oc = cpuCx(o), dir = Math.sign(x - oc) || 1;
      // (a side with rock well past the landing: stepping off at a walk carries you on about 40 px)
      const side = [dir, -dir].find(d => spotOk(oc + d * 30, of) && spotOk(oc + d * 62, of));
      if (side) { out.left = side < 0; out.right = side > 0; }
      return false;
    }
    Object.assign(out, cpuNav(bst, p, x, feet, { tol }));
    // never drop through the bridge where nothing but lava is under it
    if (out.down && p.grounded) {
      const ty0 = Math.round(cpuFeet(p) / T) + 1, under = x0 => { for (let ty = ty0; ty < ROWS; ty++) if ('#='.includes(tile(Math.floor(x0 / T), ty))) return ty * T < VDL.lavaY; return false; };
      if (!under(p.x + 4) || !under(p.x + p.w - 4)) out.down = false;
    }
    // in the air with no planned move (a hop, a knock): never steer out over the lava, steer back to the rock
    const cx = cpuCx(p);
    if (!p.grounded && !(bst.nav && bst.nav.cur) && cpuFeet(p) > VDL.bridgeY + 40 && cx > VDL.lavaX0 - 14 && cx < VDL.lavaX1 + 14) {
      const back = cx - VDL.lavaX0 < VDL.lavaX1 - cx ? -1 : 1;
      out.left = back < 0; out.right = back > 0;
    }
    return false;
  }
  const guardFire = S => S.fires.find(f => f.guard && f.phase !== 'out');
  function puller(bst, out, p, o, S, lv, info) {
    const shId = o.id, oc = cpuCx(o);
    // (a shielder's small hop at the lever still counts: the dome stays over the lever, so don't bail out mid-pull)
    const of = cpuFeet(o), ready = vdShieldUp(S, shId) && of <= lv.feet + 3 && lv.feet - of < (o.grounded ? 3 : 48) && Math.abs(oc - lv.x) < 44;
    if (!ready) bst.commit = 0;
    // under the shield at the lever: pull (stand still)
    if (vdlAt(p, lv) && vdUnderShield(S, p) >= 0 && ready) { out.act = true; return; }
    if (ready) {
      // my slot: beside the shielder, within reach of the lever (on my side when they stand on the lever)
      let x;
      if (Math.abs(oc - lv.x) < 8) {
        const side = Math.sign(cpuCx(p) - oc) || 1;
        x = [oc + side * 23, oc - side * 23].find(v => spotOk(v, lv.feet)) ?? lv.x;
      } else x = clamp(oc - Math.sign(oc - lv.x) * 24, lv.x - 22, lv.x + 22);
      // go in when the next flame is far enough off (or after waiting a while anyway)
      const f = guardFire(S), inside = vdlNear(p, lv);
      const next = !f ? VDL.guard.inhale : f.phase === 'inhale' ? f.inhale - f.t : -1;
      const dy = cpuFeet(p) - lv.feet, need = Math.max(0, Math.abs(cpuCx(p) - oc) - 38) / 200 + (dy > 3 ? 0.45 : dy < -3 ? 0.25 : 0) + 0.05;
      bst.readyT = (bst.readyT || 0) + 1 / 120;
      if (!bst.commit && (inside || next >= need || bst.readyT > 2.2)) bst.commit = G.time;
      if (bst.commit && G.time - bst.commit > 3) { bst.commit = 0; bst.readyT = 0; }
      if (bst.commit) { go(bst, out, p, x, lv.feet, 3); return; }
    } else bst.readyT = 0;
    // no shield there yet (or a flame is about to land): wait outside the fire zone
    const th = threat(S, p);
    if (th && th.phase !== 'out') {
      const sx = vdBrainShelter(S, p);
      const dx = sx != null ? sx : dodgeX(p, th);
      if (dx != null) { go(bst, out, p, dx, cpuFeet(p), 4); return; }
    }
    if (!bst.wait || bst.waitG !== bst.g || (p.grounded && bst.waitT-- <= 0)) { bst.wait = waitSpot(p, lv); bst.waitG = bst.g; bst.waitT = 240; }
    const w = bst.wait;
    const at = go(bst, out, p, w.x, w.feet, 8);
    if (at && info.partnerCpu === false) {
      if (vdlNear(o, lv) && !vdShieldUp(S, shId)) vdBrainSay(bst, p, 'up', 'Shield up!', 8);
      else vdBrainSay(bst, p, 'shield', 'Shield me!', 9);
    }
  }
  function shielder(bst, out, p, o, S, lv, info) {
    const feet = lv.feet, oAt = vdlAt(o, lv, 30), pc = cpuCx(p), oc = cpuCx(o);
    // beside the puller if they are at the lever (on my side), else on the lever
    // (on the lever itself, the dome covers a puller on either side of it)
    let x = lv.x;
    if (oAt) {
      const side = pc <= oc ? -1 : 1;
      x = [oc + side * 23, oc - side * 23].find(v => spotOk(v, feet)) ?? lv.x;
    }
    const close = p.grounded && Math.abs(cpuFeet(p) - feet) < 3 && Math.abs(pc - x) < 46;
    const fire = vdBrainFire(S, p);   // (whether or not my shield is up: no flicker)
    if (close || (fire && p.grounded && Math.abs(cpuFeet(p) - feet) < 3)) {
      go(bst, out, p, x, feet, 3);
      out.act = true;
      if (info.partnerCpu === false) {
        if (!vdlNear(o, lv)) vdBrainSay(bst, p, 'come', 'Come pull!', 9);
        else if (oAt && !o.input.act) vdBrainSay(bst, p, 'pull', 'Pull it now!', 7);
      }
      return;
    }
    // on the way: a flame about to land on me while I stand -> shield up and wait it out
    if (fire && p.grounded) { out.act = true; return; }
    go(bst, out, p, x, feet, 6);
  }

  VD_BRAINS.levers = {
    reset(bst) { bst.nav = null; bst.job = null; },
    think(bst, p, o, dt, info, S) {
      const out = {}, ph = S.ph;
      if (!ph || !ph.levers || !p.alive) return out;
      // the person walked away: the core brain throws our output away, so don't let a map plan run on unplayed (it
      // would come back mid-jump and drop us in the lava): stand, and plan afresh on their return
      if (info.away) { bst.nav = null; bst.commit = 0; bst.wait = null; return out; }
      const job = ph.pull === p.id ? 'pull' : 'shield';
      if (bst.job !== job) {
        if (bst.job && info.partnerCpu === false) vdBrainSay(bst, p, 'job' + job, job === 'pull' ? 'I\'ll pull!' : 'I\'ll shield!', 4);
        bst.job = job; bst.replan = true;
      }
      if (ph.dunk) {
        if (ph.dunk.t > 0.4 && ph.dunk.t < 0.5 && info.partnerCpu === false) vdBrainSay(bst, p, 'got', ['Splash!', 'Got him!', 'Woohoo!'][ph.dunks % 3], 6);
        return out;
      }
      const g = goalOf(S);
      if (g < 0) return out;
      const lv = ph.levers[g];
      // a new goal: a new map plan, but not in mid-air (a plan dropped mid-jump steers straight at the goal: lava)
      if (g !== bst.g) { bst.g = g; bst.replan = true; }
      if (bst.replan && p.grounded) { bst.replan = false; bst.nav = null; bst.commit = 0; }
      if (job === 'pull') puller(bst, out, p, o, S, lv, info);
      else shielder(bst, out, p, o, S, lv, info);
      // hop when pushing into the partner or a wall without moving (never while holding the shield up)
      if (!out.act && !out.jump) vdBrainHop(bst, out, p);
      return out;
    },
  };
})();
