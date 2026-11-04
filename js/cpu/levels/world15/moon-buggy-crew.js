/* Pip & Bo - Computer partner brain for 15-3 Moon Buggy Crew. */
'use strict';

(() => {
  /* 15-3 Moon Buggy Crew (MODES.buggy): the level says who drives (G.mst.drv) and who works the arm (G.mst.armId); the
     computer does the job it has and reads what that job needs from MODES.buggy.needs (the same thing the prompts read).
     DRIVER: picks a speed from what is ahead and goes gas / coast / brake toward it: stops short of a boulder (and
     waits for the claw), honks a sleepy critter awake and waits for it to hop off, full speed at a hop crater and a hop
     right at the edge, full speed up a jump ramp and a hop at the lip, stops at the edge of a crater that needs
     filling, slows down beside moon rocks so the claw can grab them (more for a person on the claw), parks in the box
     at the rocket and honks the hatch open. In the air it tilts the buggy level. Too slow near a crater it backs up for
     a run-up; stuck for a long time it calls Tow-Bot.
     ARM: moves the claw (offsets from the arm's pivot, braking early so it stops on target) to what the job needs:
     grabs a boulder in front and swings it back behind the buggy before letting go, grabs boulders from the rock pile
     and drops them into the crater, grabs moon rocks in reach (holding the action while touching one), and at the
     rocket lifts the crate from the hopper into the open hatch. With nothing to do it holds the claw up ahead, ready
     for the next rock.
     With a person partner: the computer driver waits for the person's claw at a boulder, a crater to fill or the crate
     and says what to do; the computer claw waits for the person to drive and says so. A person who drives off, backs
     up or grabs the rock first is simply followed (the needs change and the computer does what the new ones say).
     A person who does nothing: nothing moves past the first boulder (computer driver) or at all (computer claw).
     Skill sets reaction times and how exact the hops are. */
  const M = () => MODES.buggy;
  const B = () => MODES.buggy.BUGGY;

  /* ---------- the driver ---------- */
  function drive(st, S, p, o, dt, info) {
    const out = {}, b = st.bg, BG = B(), nd = M().needs(st), human = !info.partnerCpu, A = o.id;
    const front = b.x + BG.half, pad = st.c.pad;
    // in the air: tilt level (a little ahead of the spin)
    if (nd.drv === 'level' || nd.drv === 'air') {
      const e = b.a + 0.3 * b.w;
      if (e > 0.05) out.left = true; else if (e < -0.05) out.right = true;
      return out;
    }
    // stuck somewhere for a long time (nothing to wait for): call Tow-Bot
    const waiting = nd.drv === 'waitArm' || nd.drv === 'wait' || nd.drv === 'honkHatch' || st.parked || (nd.block && nd.blockD < 80) || st.arm.hold;
    if (b.x > (S.bestX == null ? -1e9 : S.bestX) + 30) { S.bestX = b.x; S.progT = 0; }
    else if (!waiting) S.progT = (S.progT || 0) + dt;
    if (S.progT > 14 || S.towing) {
      S.towing = (S.towing || 0) + dt;
      if (S.towing > 2.5 || st.state !== 'drive') { S.towing = 0; S.progT = 0; S.bestX = null; }
      out.down = true;
      return out;
    }
    let vWant = BG.vMax, hop = false;
    // a run-up: too slow too close to a crater or ramp, back up first (never backwards into an open crater)
    const pitBehind = st.c.pits.some(q => q.x1 < b.x && q.x1 > b.x - BG.half - 90 && (!q.bridge && !(q.kind === 'fill' && q.filled >= q.need)));
    if (S.backup) {
      const far = nd.pit ? (nd.pit.kind === 'ramp' ? 420 : 230) : 0;
      if (!nd.pit || nd.pitD > far || pitBehind || b.contacts === 0) S.backup = false;
      else { if (b.vf > -BG.vRev + 10) out.left = true; return out; }
    }
    if (nd.pit && !S.backup && b.contacts) {
      const ramp = nd.pit.kind === 'ramp', need = ramp ? 215 : 175, near = ramp ? 160 : 90;
      if (nd.pitD < near && nd.pitD > -10 && b.vf < need - 40 && !(ramp && front > nd.pit.rampX0 + 10) && !pitBehind && !(nd.pit.gold >= 2)) { S.backup = true; out.left = true; return out; }
    }
    if (nd.drv === 'hop') {
      // hop right at the edge (easy is a little early or late)
      if (S.hopPit !== nd.pit) { S.hopPit = nd.pit; S.hopErr = (Math.random() - 0.5) * (1 - info.skill) * 26; }
      hop = nd.pit.kind === 'ramp' ? front > nd.pit.x0 - 12 + S.hopErr * 0.5 : nd.pitD < 2 + S.hopErr;
    }
    // a boulder ahead: stop short of it and wait for the claw
    if (nd.block && nd.block.kind === 'boulder') vWant = Math.min(vWant, Math.sqrt(2 * 420 * Math.max(0, nd.blockD - 22)));
    // a sleepy critter: honk, and wait for it to hop away
    if (nd.block && nd.block.kind === 'critter') {
      vWant = Math.min(vWant, Math.sqrt(2 * 420 * Math.max(0, nd.blockD - 24)));
      if (nd.honkD < 250) {
        S.honkT = (S.honkT || 0) - dt;
        if (S.honkT <= 0 && cpuFor(S, 'seeCritter', true, dt) > 0.15 + (1 - info.skill) * 0.4) { out.act = 'tap'; S.honkT = 1.4; }
      }
    } else cpuFor(S, 'seeCritter', false, dt);
    // a crater to fill: stop at the edge
    if (nd.fill && (!nd.pit || nd.fillD < nd.pitD)) vWant = Math.min(vWant, Math.sqrt(2 * 420 * Math.max(0, nd.fillD - 16)));
    // moon rocks beside the track: slow down so the claw gets them (not near a crater: speed matters there)
    const pitNear = nd.pit && nd.pitD < (nd.pit.kind === 'ramp' ? 520 : 300);
    if (!pitNear && !st.arm.hold) {
      const pv = M().pivot(st);
      for (const r of st.c.rocks) {
        if (r.got) continue;
        const rp = M().rockPos(st, r), ahead = rp.x - pv.x;
        if (ahead < -50 || ahead > 260) continue;
        if (buggyPitAt(st, r.x)) continue;     // (a rock over a crater: caught in the hop)
        const slow = human ? (ahead < 140 ? 40 : 90) : (ahead < 150 ? 120 : 170);
        vWant = Math.min(vWant, slow);
        if (human && ahead < 140 && info.partnerIdle < 8) cpuSay(p, 'Grab the moon rock! ' + M().key(A, 'act'));
      }
    }
    // the rocket pad: park in the box (a little forward, closer to the hatch), honk the hatch open
    if (pad && b.x > pad.x0 - 250) {
      if (st.parked) {
        if (!pad.open) { if (cpuFor(S, 'parked', true, dt) > 0.3 + (1 - info.skill) * 0.4) { S.honkT = (S.honkT || 0) - dt; if (S.honkT <= 0) { out.act = 'tap'; S.honkT = 1.2; } } }
        else if (human && st.crate.where !== 'in') cpuSay(p, st.arm.hold ? 'Into the hatch! Let go ' + M().key(A, 'act') : 'Lift the rock crate into the hatch!', 2.2);
        return out;
      }
      const d = pad.box + 8 - b.x;
      if (d < -12) { if (b.vf > -60) out.left = true; return out; }
      vWant = Math.min(vWant, Math.sqrt(2 * 380 * Math.max(0, d)));
      if (Math.abs(d) < 14) vWant = 0;
    }
    // gas / coast / brake toward the speed (brake only while still rolling forward: pressing back when stopped reverses)
    if (b.vf < vWant - 12) out.right = true;
    else if (b.vf > vWant + 20 && b.vf > 12) out.left = true;
    else if (vWant < 5 && b.vf > 12) out.left = true;
    if (hop) out.jump = 'tap';
    // with a person on the claw: say what the claw has to do
    if (human && info.partnerIdle < 20) {
      if (nd.arm === 'boulder' && nd.blockD < 60 && cpuFor(S, 'waitB', true, dt) > 1.5) cpuSay(p, 'Grab the boulder with the claw!', 2.2);
      else if (nd.arm === 'toss') cpuSay(p, 'Swing it back behind us, then let go!', 2.2);
      else if (nd.arm === 'pile' && nd.fillD < 40) cpuSay(p, 'Grab a boulder from the rock pile!', 2.2);
      else if (nd.arm === 'drop') cpuSay(p, 'Drop it in the crater!', 2.2);
      if (nd.arm !== 'boulder') cpuFor(S, 'waitB', false, dt);
    }
    return out;
  }

  /* ---------- the arm ---------- */
  // press toward a claw position (world px), braking early to stop on it; returns how far off it is
  function clawTo(out, st, tx, ty, dz) {
    const BG = B(), pv = M().pivot(st), arm = st.arm;
    let ox = tx - pv.x, oy = ty - pv.y;
    const d = Math.hypot(ox, oy), mx = BG.clawMax - 2;
    if (d > mx) { ox *= mx / d; oy *= mx / d; }
    const ex = ox - arm.ox, ey = oy - arm.oy, acc = BG.clawAcc;
    const stopX = Math.sign(arm.vx) === Math.sign(ex) ? arm.vx * arm.vx / (2 * acc) : 0;
    const stopY = Math.sign(arm.vy) === Math.sign(ey) ? arm.vy * arm.vy / (2 * acc) : 0;
    if (Math.abs(ex) > dz + stopX) { out.right = ex > 0; out.left = ex < 0; }
    if (Math.abs(ey) > dz + stopY) { out.down = ey > 0; out.up = ey < 0; }
    return Math.hypot(tx - arm.wx, ty - arm.wy);
  }
  function work(st, S, p, o, dt, info) {
    const out = {}, BG = B(), nd = M().needs(st), arm = st.arm, b = st.bg, human = !info.partnerCpu, D = o.id;
    const react = 0.06 + (1 - info.skill) * 0.3;
    const settle = (key, cond) => cpuFor(S, key, cond, dt) > react;
    const t = nd.target;
    switch (nd.arm) {
      case 'boulder': {
        const ob = nd.block.o, d = clawTo(out, st, ob.x, ob.y - 4, 4);
        if (settle('gB', d < ob.r + 8)) out.act = 'tap';
        break;
      }
      case 'toss': {
        clawTo(out, st, b.x - 150, M().pivot(st).y - 50, 6);
        out.left = true; out.right = false;
        if (settle('gT', arm.wx < b.x - 92)) out.act = 'tap';
        break;
      }
      case 'pile': {
        if (!t) break;
        const d = clawTo(out, st, t.x, t.y, 4);
        if (settle('gP', d < 26)) out.act = 'tap';
        break;
      }
      case 'drop': {
        const fp = nd.fill, tx = fp ? (fp.x0 + fp.x1) / 2 - 20 : t.x, d = clawTo(out, st, tx, t.y, 5);
        const over = fp && arm.wx > fp.x0 + 30 && arm.wx < fp.x1 - 40;
        if (settle('gD', over && (d < 20 || Math.abs(arm.vx) < 60) && Math.abs(arm.vx) < 120)) out.act = 'tap';
        break;
      }
      case 'crate': {
        const d = clawTo(out, st, t.x, t.y, 3);
        if (settle('gC', d < 30)) out.act = 'tap';
        break;
      }
      case 'hatch': {
        const pad = st.c.pad, d = clawTo(out, st, t.x, t.y, 4);
        const R = (st.hatchMag ? BG.hatchRGold : BG.hatchR) - 12;
        if (pad && pad.open && settle('gH', d < R && Math.abs(arm.vx) < 80 && Math.abs(arm.vy) < 80)) out.act = 'tap';
        if (pad && !pad.open && human && d < 60) cpuSay(p, 'Honk to open the hatch! ' + M().key(D, 'act'), 2.2);
        break;
      }
      case 'rock': {
        const d = clawTo(out, st, t.x, t.y, 3);
        if (d < BG.grabR - 6) out.act = true;
        break;
      }
      default: {
        // ready: up ahead, at the height of the next moon rock coming
        const pv = M().pivot(st);
        let ty = pv.y - 60, tx = pv.x + 110;
        let best = null;
        for (const r of st.c.rocks) if (!r.got && r.x > pv.x && r.x < pv.x + 520 && (!best || r.x < best.x)) best = r;
        if (best) { const rp = M().rockPos(st, best); ty = clamp(rp.y, pv.y - 140, pv.y + 20); tx = pv.x + 130; }
        clawTo(out, st, tx, ty, 8);
      }
    }
    // with a person driving: say what the driver has to do
    if (human && info.partnerIdle < 20 && st.state === 'drive' && !b.air) {
      const idle = cpuFor(S, 'still', Math.abs(b.vf) < 8, dt);
      if (nd.drv === 'honk') cpuSay(p, 'Honk at the critter! ' + M().key(D, 'act'), 2.2);
      else if (nd.drv === 'honkHatch') cpuSay(p, 'Honk the hatch open! ' + M().key(D, 'act'), 2.2);
      else if (nd.drv === 'park' || nd.drv === 'back') cpuSay(p, 'Park in the box!', 2.2);
      else if (nd.drv === 'stopEdge' && nd.fillD < 140) cpuSay(p, 'Stop at the edge! I\'ll fill it', 2.2);
      else if ((nd.drv === 'go' || nd.drv === 'speed' || nd.drv === 'full') && idle > 2.5 && !arm.hold && nd.arm !== 'rock') cpuSay(p, 'All clear! Drive on ' + M().key(D, 'right'), 2.2);
    }
    return out;
  }

  cpuBrain('buggy', {
    reset(S) { S.bestX = null; S.progT = 0; },
    think(S, p, o, dt, info) {
      const st = info.mst;
      if (!st || !st.bg || info.intro || st.state !== 'drive') return {};
      return p.id === st.drv ? drive(st, S, p, o, dt, info) : work(st, S, p, o, dt, info);
    },
  });
})();
