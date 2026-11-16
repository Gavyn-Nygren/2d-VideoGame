/* Pip & Bo - Computer partner: graveyard bone hunt. */
'use strict';

/* 13-2 Graveyard Bone Hunt. Each room's def.plan lists its jobs in order ('boost:0', 'tower:0', 'ladder:0', 'gate:1',
   'big:1', 'cross', 'bell', 'exit', 'finale', 'seesaw:0'; the number is the mound). The brain does the first job not done yet:
   - a bone in my hands: take it to Mr. Bones (beside him when he is the stool; trapped behind the shut crypt gate it
     waits, then holds down to hop back out). Holding a big bone's end: wait still for the partner to grab the other
     end, then carry it together toward Mr. Bones, keeping about the bone's length apart (the front one waits, the back
     one follows) and jumping at a headstone or pumpkin in the way (a jump is shared).
   - tower: one is the step (up on Mr. Bones the stool, called first), one hops on
     the step's head and jumps up to dig. Default: the computer is the step; with a person it adapts like a person
     would (someone on my head makes me the step, a person waiting at the foot makes me the climber, a person who
     waits elsewhere gets me taking the step job). Once the partner is up, the step moves off and helps with the next
     job if it can be done at the same time (a big bone, the crank).
   - jack (rooms 2 and 4, Gavyn 2026-11-16: no head stacks): one rides Mr. Bones the stool, the other holds dig at his
     arm lever on the ground beside him; his neck grows and the rider jumps from the top onto the roof and digs. Two
     computers: Bo rides. With a person: the computer pulls the lever, unless the person goes to the lever first (then
     it rides). The puller only holds while someone stands on the stool, and lets go once the rider is up.
   - seesaw (room 1): one stands still on the low end, the other stands at the high end and jumps straight up (coming
     down onto it slams it and flings the partner up to the roof; the flung one steers onto the roof and digs). Two
     computers: Bo is flung. With a person: the computer takes the low end unless the person is standing on it.
   - gate: one holds dig at the crank, the other runs into the crypt, digs, and carries the bone out. The computer
     holds the crank unless the person goes to it first. The holder lets go once the bone is out.
   - ladder: calls Mr. Bones to his chalk X and climbs him (hold jump). A partner already on the way up does it.
   - big: dig the mound (the giant ribcage: dig right after the partner's shovel, or lead a slow rhythm the partner can
     join), then grab the end on my side.
   - cross: call the bridge and walk over. bell: call the ladder, climb, hold dig at the rope the partner isn't at.
   - exit: call Mr. Bones to the room's exit shape, then into the arch side by side.
   With a person, before the plan it first helps with whatever job the person has started (follow()): the person holds
   a big bone's end -> grab the other end; the person is on the giant ribcage -> dig with them; the person cranks, waits
   at the crypt gate or is inside -> the other part of the crypt job; the person climbs to the belfry -> the other bell
   rope. It hops off Mr. Bones the stool when the person stands on another chalk X, and doesn't call him away from a
   spot the person just called him to while they are near it or using him (watchCalls). Shut in the crypt with nothing
   to do, it holds down to hop back out.
   Walking uses cpuNav (Mr. Bones the stool and the bridge are tiles; the ladder isn't, so climbing is done here). It
   reads only what is on screen: positions, Mr. Bones' shape, the mounds, the bones, the gate and the ropes. */
(() => {
  const near = (a, b, d) => Math.abs(a - b) <= d;
  const still = q => q.grounded && Math.abs(q.vx) < 10;
  // a short bubble for the person: at most one every 6 s, the same words again only after twice as long each time,
  // and nothing while the person is away from the keys
  function say(st, p, info, text) {
    if (info.partnerCpu || info.partnerIdle > 20 || G.time - (st.saidT == null ? -99 : st.saidT) < 6) return;
    const S = st.said || (st.said = {}), k = S[text] || { n: 0, t: -99 };
    if (G.time - k.t < Math.min(30, 6 * Math.pow(2, k.n))) return;
    S[text] = { n: k.n + 1, t: G.time }; st.saidT = G.time; cpuSay(p, text, 2);
  }
  function navOpts(st, m) {
    if (!st.avoid || st.avoidRoom !== G.room) {
      const set = new Set();
      for (const c of m.pitCells) set.add(c.c + ',' + c.r);
      st.avoid = set; st.avoidRoom = G.room;
    }
    const set = st.avoid;
    return { avoid: (tx, ty) => set.has(tx + ',' + ty), key: 'bonehunt' + G.room };
  }
  function nav(st, p, m, x, feet, tol = 5, noHop) {
    const o = navOpts(st, m);
    o.tol = tol; o.noHop = !!noHop;
    const out = cpuNav(st, p, x, feet, o);
    if (st.nav && st.nav.status === 'noPath' && p.grounded) {
      // no way on the map: walk straight on, jumping only at a wall
      const d = x - cpuCx(p);
      out.left = d < -tol; out.right = d > tol; out.jump = false;
      const dir = d < 0 ? -1 : 1, fx = Math.floor((cpuCx(p) + dir * (p.w / 2 + 6)) / T), fy = Math.floor((cpuFeet(p) - 2) / T);
      if (Math.abs(d) > tol && solidFor(tile(fx, fy), p)) out.jump = !CPU.last[p.id].jump;
    }
    return out;
  }
  // go somewhere; up to the top of Mr. Bones the ladder by climbing him
  function go(st, p, m, x, feet, tol = 5, noHop) {
    const L = bonehuntLadder(m), P = m.pl[p.id];
    if (L && feet <= L.top + 4 && (cpuFeet(p) > L.top + 6 || (P.climb && cpuFeet(p) > L.top + 0.5))) return climb(st, p, m, L);   // (up to the very top: it steps off there)
    if (P.climb) { const out = {}; out.left = x < cpuCx(p); out.right = !out.left; return out; }   // (let go of the ladder)
    return nav(st, p, m, x, feet, tol, noHop);
  }
  function climb(st, p, m, L) {
    const out = {}, P = m.pl[p.id], o = other(p), O = m.pl[o.id];
    if (P.climb) { out.jump = true; return out; }
    // in the air on the ladder: grab on
    if (!p.grounded && bonehuntOnLadderCol(L, p)) { out.jump = true; return out; }
    // the partner is on the ladder: wait beside its foot
    if (O.climb) return nav(st, p, m, L.x - L.side * 40, L.feet, 6, true);
    if (!p.grounded || !near(cpuCx(p), L.x, 6) || !near(cpuFeet(p), L.feet, 3)) return nav(st, p, m, L.x, L.feet, 3, true);
    out.jump = true;
    return out;
  }
  // stand on a mound and dig it
  function dig(st, p, m, mound, x = mound.x) {
    if (bonehuntMoundAt(m, p) === mound && near(cpuCx(p), x, mound.span - 4)) {
      const out = {};
      cpuSeek(out, p, x, 6);
      out.act = 'tap';
      return out;
    }
    return go(st, p, m, x, mound.feet, 5);
  }
  // is q standing on Mr. Bones (the stool, the bridge) or climbing him?
  function onMr(m, q) {
    const mr = m.mr, s = m.spots[mr.spot];
    if (!s || !q.alive) return false;
    if (mr.form === 'ladder') return m.pl[q.id].climb;
    if (mr.form === 'stool') return q.grounded && near(cpuFeet(q), (s.r - bonehuntJackLift(m)) * T, 3) && q.x + q.w > s.c * T && q.x < (s.c + 1) * T;
    if (mr.form === 'bridge') return near(cpuFeet(q), s.y0, 3) && q.x + q.w > s.x0 && q.x < s.x1;
    return false;
  }
  // Mr. Bones as this spot's shape (null when he is), else go to the chalk X and call him
  function call(st, p, o, m, k, info) {
    const s = m.spots[k], mr = m.mr;
    if (mr.spot === k && mr.form === s.type) return null;
    const out = {};
    if (mr.form === 'hop' && mr.hop && mr.hop.to === k) return out;   // on his way
    // the person just called him somewhere else and is still using him there: don't call him away, wait near them
    const kp = st.keep;
    if (kp && kp.k !== k && (mr.spot === kp.k || (mr.form === 'hop' && mr.hop && mr.hop.to === kp.k))) {
      const ks = m.spots[kp.k];
      return go(st, p, m, ks.x + (cpuCx(p) < ks.x ? -46 : 46), ks.feet, 10, true);
    }
    if (bonehuntSpotAt(m, p) === k) {
      cpuSeek(out, p, s.x, 8);
      if (onMr(m, o)) { say(st, p, info, 'Hop off Mr. Bones!'); return out; }
      if (mr.form === 'hop' || mr.form === 'dance') return out;
      out.act = 'tap';
      return out;
    }
    return go(st, p, m, s.x, s.feet, 6);
  }
  const spotOf = (m, type) => m.spots.findIndex(s => s.type === type);
  // where to touch Mr. Bones with a bone
  function mrTarget(m, p) {
    const mr = m.mr, s = m.spots[mr.spot];
    if (mr.form === 'hop') return mr.hop ? { x: mr.hop.x1, feet: mr.hop.f1 } : null;
    if (mr.form === 'stool' && s) {
      const side = solidFor(tile(s.c - 1, s.r), p) ? 1 : solidFor(tile(s.c + 1, s.r), p) ? -1 : cpuCx(p) >= s.x ? 1 : -1;
      return { x: s.x + side * 26, feet: s.feet, tol: 6 };
    }
    if (mr.form === 'ladder' && s) return { x: s.x, feet: s.feet, tol: 10 };
    if (mr.form === 'bridge' && s) return { x: (s.x0 + s.x1) / 2, feet: s.y0, tol: 20 };
    return { x: mr.x, feet: mr.feet, tol: 10 };
  }

  /* ---------- a small bone in my hands: to Mr. Bones ---------- */
  function deliver(st, p, o, m, dt, info) {
    const gt = m.gate, out = {};
    if (gt && bonehuntInCrypt(m, p) && !gt.pass) {
      // shut in the crypt with the bone: wait at the gate, then hop back out
      const t = cpuFor(st, 'trapped', p.grounded, dt);
      if (t > 1.5) say(st, p, info, 'Open the gate!');
      if (t > 6 || (t > 2.5 && info.partnerCpu)) { out.down = true; return out; }
      return nav(st, p, m, gt.x + gt.dir * 44, gt.y1, 6, true);
    }
    cpuFor(st, 'trapped', false, dt);
    const tg = mrTarget(m, p);
    if (!tg) return out;
    // landed on the partner (the step on the stool): walk off toward him
    return go(st, p, m, tg.x, tg.feet, tg.tol || 6);
  }

  /* ---------- a big bone's end in my hands ---------- */
  function carry(st, p, o, m, dt, info) {
    const P = m.pl[p.id], b = P.hold, out = {}, end = b.holds[p.id];
    if (b.state !== 'carried') {
      // waiting for the partner to grab the other end: keep still
      if (cpuFor(st, 'holdWait', true, dt) > 2) say(st, p, info, 'Grab the other end!');
      if (cpuFor(st, 'holdLong', !info.partnerCpu && info.partnerIdle > 8, dt) > 4) out.act = 'tap';   // (put it down; the person is away)
      return out;
    }
    cpuFor(st, 'holdWait', false, dt);
    const tg = mrTarget(m, p);
    if (!tg) return out;
    const r = bonehuntMrRect(m), gx = r ? r.x + r.w / 2 : tg.x;
    const dir = Math.sign(gx - b.x) || -1, front = end === dir, dist = Math.abs(cpuCx(p) - cpuCx(o));
    let mv = 0;
    if (front) { if (dist > b.len + 24) mv = -dir; else if (dist < b.len + 12) mv = dir; }
    else if (dist > b.len - 6) mv = dir;
    out.left = mv < 0; out.right = mv > 0;
    // a headstone or pumpkin in the way: jump (it's a jump for both)
    const wd = mv || dir, fx = Math.floor((cpuCx(p) + wd * (p.w / 2 + 12)) / T), fy = Math.floor((cpuFeet(p) - 2) / T);
    if (p.grounded) {
      if (mv && solidFor(tile(fx, fy), p) && o.grounded) out.jump = !CPU.last[p.id].jump;
    } else out.jump = p.vy < 0 && CPU.last[p.id].jump;
    if (!info.partnerCpu && cpuFor(st, 'carryWait', !mv && Math.abs(o.vx) < 5, dt) > 2.5) say(st, p, info, 'Carry it to Mr. Bones!');
    return out;
  }

  /* ---------- boost / tower: a step and a climber ---------- */
  const headOn = (a, b) => a.alive && b.alive && a.onPartner && near(cpuFeet(a), b.y, 3) && Math.abs(cpuCx(a) - cpuCx(b)) < 24;
  function stackGeo(m, mound) {
    let k = -1, footX, base, ground;
    if (mound.how === 'tower') { k = spotOf(m, 'stool'); const s = m.spots[k]; footX = s.x; base = s.r * T; ground = s.feet; }
    else { footX = mound.cfg.foot.x; base = mound.cfg.foot.feet; ground = base; }
    const land = mound.cfg.land != null ? mound.cfg.land : mound.x, wdir = Math.sign(footX - land) || 1;
    return { k, footX, base, ground, land, wdir, waitX: footX + wdir * 44 };
  }
  function stack(st, p, o, m, mound, dt, info) {
    const g = stackGeo(m, mound);
    const up = q => q.alive && q.grounded && !q.onPartner && near(cpuFeet(q), mound.feet, 3) && near(cpuCx(q), mound.x, 140);
    if (up(p)) return dig(st, p, m, mound);
    if (up(o)) {
      // the partner is up there: off Mr. Bones' top (or from the foot), then the next job
      if (onMr(m, p) || (near(cpuCx(p), g.footX, 16) && near(cpuFeet(p), g.base, 3))) return nav(st, p, m, g.footX + g.wdir * 56, g.ground, 6, true);
      return null;
    }
    const stoolOk = g.k < 0 || (m.mr.form === 'stool' && m.mr.spot === g.k);
    const r = role(st, p, o, m, mound, g, dt, info);
    if (r === 'off') { const out = {}; out.left = g.wdir > 0; out.right = g.wdir < 0; return out; }
    if (r === 'step') {
      if (!stoolOk) return call(st, p, o, m, g.k, info) || {};
      return step(st, p, o, m, g, dt, info);
    }
    return lead(st, p, o, m, mound, g, stoolOk, dt, info);
  }
  const atFoot = (q, g) => q.alive && q.grounded && near(cpuCx(q), g.footX, 12) && near(cpuFeet(q), g.base, 3);
  function role(st, p, o, m, mound, g, dt, info) {
    if (st.roleFor !== mound) { st.roleFor = mound; st.role = info.partnerCpu ? (p.id === 1 ? 'step' : 'lead') : 'step'; st.roleT = 9; }
    st.roleT += dt;
    if (st.offHead > 0) { st.offHead -= dt; if (headOn(p, o)) return 'off'; }
    if (headOn(o, p)) st.role = 'step';
    else if (headOn(p, o)) st.role = 'lead';
    else if (!info.partnerCpu && st.roleT > 2.5) {
      const oFoot = atFoot(o, g) || (g.k >= 0 && onMr(m, o));
      if (st.role === 'step' && oFoot && !atFoot(p, g) && cpuFor(st, 'oFoot', still(o), dt) > 0.8) { st.role = 'lead'; st.roleT = 0; }
      else if (st.role === 'lead' && !oFoot && info.partnerIdle > 3 && cpuFor(st, 'oAway', true, dt) > 3) { st.role = 'step'; st.roleT = 0; }
    }
    if (st.role !== 'lead') cpuFor(st, 'oAway', false, dt);
    return st.role;
  }
  function step(st, p, o, m, g, dt, info) {
    if (!atFoot(p, g)) return go(st, p, m, g.footX, g.base, 3, true);
    const out = {};
    cpuSeek(out, p, g.footX, 3);
    if (headOn(o, p)) {
      out.left = out.right = false;
      if (cpuFor(st, 'carryHead', true, dt) > 2.2) say(st, p, info, 'Now jump up!');
      return out;
    }
    cpuFor(st, 'carryHead', false, dt);
    if (cpuFor(st, 'askHop', still(p), dt) > 2.5) say(st, p, info, 'Hop on my head!');
    return out;
  }
  function lead(st, p, o, m, mound, g, stoolOk, dt, info) {
    const out = {};
    if (!p.grounded) {
      if (st.air === 'boost') cpuSteer(out, p, g.land, 3);
      else if (st.air === 'hop') cpuSeek(out, p, cpuCx(o), 2);
      else return go(st, p, m, g.waitX, g.ground, 6, true);
      out.jump = p.vy < 0;
      return out;
    }
    if (headOn(p, o)) {
      st.air = null;
      const ready = o.grounded && !m.pl[o.id].lock && atFoot(o, g);
      st.headT = (st.headT || 0) + dt;
      if (ready && cpuFor(st, 'settle', still(o), dt) > 0.12 + (1 - info.skill) * 0.3) {
        if (CPU.last[p.id].jump) return out;   // let go first so the press counts
        st.air = 'boost'; st.headT = 0; st.landX = g.land;
        out.jump = true; cpuSteer(out, p, g.land, 3);
        return out;
      }
      if (!ready && st.headT > 2.2 && still(o)) { st.role = 'step'; st.roleT = 0; st.headT = 0; st.offHead = 1; }
      return out;
    }
    st.headT = 0; st.air = null;
    if (!stoolOk) {
      // the stool isn't there yet: wait (and after a while, call him myself and be the step)
      if (cpuFor(st, 'noStool', true, dt) > 4 && !info.partnerCpu) { st.role = 'step'; st.roleT = 0; }
      return go(st, p, m, g.waitX, g.ground, 8, true);
    }
    cpuFor(st, 'noStool', false, dt);
    const stepReady = atFoot(o, g) && still(o) && !m.pl[o.id].lock;
    if (stepReady) {
      if (!near(cpuCx(p), g.waitX, 16) || !near(cpuFeet(p), g.ground, 3)) return go(st, p, m, g.waitX, g.ground, 6, true);
      if (cpuFor(st, 'hopWait', true, dt) < 0.1 + (1 - info.skill) * 0.35) return out;
      if (CPU.last[p.id].jump) return out;
      st.air = 'hop'; out.jump = true; cpuSeek(out, p, cpuCx(o), 2);
      return out;
    }
    cpuFor(st, 'hopWait', false, dt);
    const at = near(cpuCx(p), g.waitX, 10);
    if (at && cpuFor(st, 'askStep', true, dt) > 3) say(st, p, info, g.k >= 0 ? 'Stand on Mr. Bones!' : 'Be my step!');
    return go(st, p, m, g.waitX, g.ground, 6, true);
  }

  /* ---------- jack: one rides Mr. Bones the stool, the other holds his arm lever ---------- */
  function jack(st, p, o, m, mound, dt, info) {
    const j = m.jack;
    if (!j) return null;
    const up = q => q.alive && q.grounded && near(cpuFeet(q), mound.feet, 3) && near(cpuCx(q), mound.x, 140);
    if (up(p)) return dig(st, p, m, mound);
    if (up(o)) {
      // the partner is up there: step off the stool or the lever, then the next job
      if (onMr(m, p)) return nav(st, p, m, j.x + j.dir * 30, j.feet, 6, true);
      return null;
    }
    const s = m.spots[j.spot];
    if (!(m.mr.form === 'stool' && m.mr.spot === j.spot)) return call(st, p, o, m, j.spot, info) || {};
    if (st.jackFor !== mound) { st.jackFor = mound; st.jackRole = info.partnerCpu ? (p.id === 1 ? 'ride' : 'pull') : 'pull'; }
    if (!info.partnerCpu) {
      // a person on the stool gets me on the lever; a person at the lever gets me riding
      if (cpuFor(st, 'oJackRide', bonehuntOnJack(m, o), dt) > 0.3) st.jackRole = 'pull';
      else if (cpuFor(st, 'oJackLever', bonehuntAtLever(m, o) && !bonehuntOnJack(m, p), dt) > 0.6) st.jackRole = 'ride';
    }
    const out = {};
    if (st.jackRole === 'pull') {
      if (!bonehuntAtLever(m, p) || !near(cpuCx(p), j.x, 8)) { if (onMr(m, p)) return nav(st, p, m, j.x, j.feet, 6, true); return go(st, p, m, j.x, j.feet, 6, true); }
      cpuSeek(out, p, j.x, 6);
      if (bonehuntOnJack(m, o) || (j.lift > 0 && !o.grounded && cpuFeet(o) < s.r * T)) out.act = true;
      else if (cpuFor(st, 'askRide', still(p), dt) > 3) say(st, p, info, 'Stand on Mr. Bones!');
      return out;
    }
    // ride: up onto the stool, wait for the neck to grow, then jump onto the roof
    if (!bonehuntOnJack(m, p)) return go(st, p, m, s.x, (s.r - j.lift) * T, 3, true);
    cpuSeek(out, p, s.x, 3);
    if (j.lift >= j.max) {
      if (CPU.last[p.id].jump) return out;
      const land = mound.cfg.land != null ? mound.cfg.land : mound.x;
      st.air = 'boost'; st.landX = land;
      out.jump = true; cpuSteer(out, p, land, 3);
      return out;
    }
    if (cpuFor(st, 'askPull', j.held < 0 && still(p), dt) > 2.5) say(st, p, info, 'Pull Mr. Bones’ arm!');
    return out;
  }

  /* ---------- the seesaw: one on the low end, the other jumps onto the high end ---------- */
  function seesaw(st, p, o, m, mound, dt, info) {
    const ss = m.seesaw;
    if (!ss) return null;
    const up = q => q.alive && q.grounded && near(cpuFeet(q), mound.feet, 3) && near(cpuCx(q), mound.x, 140);
    if (up(p)) return dig(st, p, m, mound);
    if (up(o)) return null;
    const e = bonehuntSeesawEnds(ss), launchX = (e.l0 + e.l1) / 2, slamX = (e.r0 + e.r1) / 2, out = {};
    if (st.ssFor !== mound) { st.ssFor = mound; st.ssRole = info.partnerCpu ? (p.id === 1 ? 'fly' : 'slam') : 'fly'; }
    // a person already standing on the low end gets flung; a person who stays at the high end gets me on the low end
    if (!info.partnerCpu) {
      if (st.ssRole === 'fly' && cpuFor(st, 'oLaunch', bonehuntOnLaunch(m, o) && !bonehuntOnLaunch(m, p), dt) > 0.6) st.ssRole = 'slam';
      else if (st.ssRole === 'slam' && !bonehuntOnLaunch(m, o) && cpuFor(st, 'oOff', true, dt) > 3) st.ssRole = 'fly';
      if (st.ssRole !== 'slam' || bonehuntOnLaunch(m, o)) cpuFor(st, 'oOff', false, dt);
    }
    if (st.ssRole === 'fly') {
      if (!p.grounded) { if (p.vy < -500) { st.air = 'boost'; st.landX = mound.cfg.land != null ? mound.cfg.land : mound.x; } return go(st, p, m, launchX, ss.feet, 6, true); }
      if (!near(cpuCx(p), launchX, 6) || !near(cpuFeet(p), ss.feet, 3)) return go(st, p, m, launchX, ss.feet, 4, true);
      if (cpuFor(st, 'askSlam', still(p), dt) > 3) say(st, p, info, 'Jump on the high end!');
      return out;
    }
    // the slammer: under the high end, then a full jump straight up once the partner stands still on the low end
    if (!p.grounded) { out.jump = p.vy < 0; return out; }
    if (ss.down !== -1) return go(st, p, m, e.r1 + 34, ss.feet, 6, true);   // off it, so it tips back
    if (!near(cpuCx(p), slamX, 6)) return go(st, p, m, slamX, ss.feet, 4, true);
    if (bonehuntOnLaunch(m, o) && cpuFor(st, 'oReady', still(o), dt) > 0.25 + (1 - info.skill) * 0.3) {
      if (CPU.last[p.id].jump) return out;
      out.jump = true;
      return out;
    }
    if (!bonehuntOnLaunch(m, o)) cpuFor(st, 'oReady', false, dt);
    if (cpuFor(st, 'askLow', still(p) && !bonehuntOnLaunch(m, o), dt) > 3) say(st, p, info, 'Stand on the low end!');
    return out;
  }

  /* ---------- the crank and the crypt ---------- */
  function gate(st, p, o, m, mound, dt, info) {
    const gt = m.gate, out = {};
    if (!gt) return null;
    const carrier = G.players.find(q => m.pl[q.id].carry && m.pl[q.id].carry.piece === mound.piece);
    const out1 = q => (cpuCx(q) - gt.x) * gt.dir < -8;
    // who does what (a person already at the crank or in the crypt keeps that part)
    const oCrank = o.alive && near(cpuCx(o), gt.crank.x, 34) && near(cpuFeet(o), gt.crank.feet, 4) && o.grounded;
    if (st.gateFor !== mound) { st.gateFor = mound; st.gate = info.partnerCpu ? (p.id === 0 ? 'run' : 'hold') : (oCrank || gt.held === o.id) && !bonehuntInCrypt(m, p) ? 'run' : 'hold'; }
    if (!info.partnerCpu) {
      // (the person at the crank too: they want it, so I run; both standing at it a while, I give way)
      if (st.gate === 'hold' && oCrank && cpuFor(st, 'oCrank', true, dt) > (bonehuntAtCrank(m, p) ? 2 : 0.6)) st.gate = 'run';
      else if (st.gate === 'hold' && cpuFor(st, 'oOnMe', headOn(o, p) && !mound.done, dt) > 3) st.gate = 'run';   // (stood on my head at the crank: they want it)
      else if (st.gate === 'run' && !oCrank && (bonehuntInCrypt(m, o) || (info.partnerIdle > 4 && !bonehuntInCrypt(m, p)))) st.gate = 'hold';
      if (!oCrank) cpuFor(st, 'oCrank', false, dt);
    }
    if (st.gate === 'hold') {
      // done once the bone is out of the crypt
      if (mound.done && (!carrier || out1(carrier)) && !G.players.some(q => bonehuntInCrypt(m, q))) return null;
      if (!bonehuntAtCrank(m, p) || !near(cpuCx(p), gt.crank.x, 10)) return go(st, p, m, gt.crank.x, gt.crank.feet, 4, true);
      cpuSeek(out, p, gt.crank.x, 6);
      out.act = true;
      if (gt.pass && !mound.done && !bonehuntInCrypt(m, o) && cpuFor(st, 'askIn', true, dt) > 3) say(st, p, info, 'Go in and dig!');
      return out;
    }
    // the runner
    if (mound.done) return carrier && carrier !== p ? null : {};
    if (bonehuntInCrypt(m, p)) return dig(st, p, m, mound);
    if (gt.pass) return go(st, p, m, mound.x, mound.feet, 5);
    if (cpuFor(st, 'askCrank', true, dt) > 3) say(st, p, info, 'Hold dig at the crank!');
    return go(st, p, m, gt.x - gt.dir * 40, gt.y1, 8, true);
  }

  /* ---------- a big bone: dig it up, grab an end ---------- */
  function big(st, p, o, m, mound, dt, info) {
    if (!mound.done) return mound.together ? together(st, p, o, m, mound, dt, info) : dig(st, p, m, mound, mound.x);
    const b = m.bones.find(q => q.kind === 'big' && q.piece === mound.piece && q.state !== 'done');
    if (!b || b.state !== 'ground') return {};
    const oEnd = b.holds[o.id];
    let end;
    if (oEnd) end = -oEnd;
    else if (o.alive && Math.abs(cpuCx(p) - cpuCx(o)) > 1) end = cpuCx(p) < cpuCx(o) ? -1 : 1;
    else end = p.id === 0 ? -1 : 1;
    const ex = b.x + end * b.len / 2;
    if (p.grounded && near(cpuCx(p), ex, 12) && near(cpuFeet(p), b.feet, 5)) {
      const out = {};
      cpuSeek(out, p, ex, 4);
      const e = bonehuntEndAt(m, p);
      if (e && e.end === end) out.act = 'tap';
      return out;
    }
    return go(st, p, m, ex, b.feet, 5, true);
  }
  // the giant ribcage: both shovels at once
  function together(st, p, o, m, mound, dt, info) {
    const side = o.alive && Math.abs(cpuCx(p) - cpuCx(o)) > 1 ? (cpuCx(p) < cpuCx(o) ? -1 : 1) : (p.id ? 1 : -1);
    const x = mound.x + side * Math.min(34, mound.span - 18);
    if (!(bonehuntMoundAt(m, p) === mound && near(cpuCx(p), x, 14))) return go(st, p, m, x, mound.feet, 5, true);
    const out = {}, O = m.pl[o.id], oOn = bonehuntMoundAt(m, o) === mound;
    cpuSeek(out, p, x, 5);
    if (mound.gold) { out.act = 'tap'; return out; }
    const L = O.lastDig, fresh = L && L.m === mound && !L.used && G.time - L.t < BONEHUNT.togetherWin - 0.06;
    // the partner's shovel just went in: mine too
    if (fresh && G.time - L.t >= 0.06 + (1 - info.skill) * 0.16) { out.act = !CPU.last[p.id].act; return out; }
    // lead a slow rhythm the partner can join
    const lead = info.partnerCpu ? p.id === 0 : cpuFor(st, 'oQuiet', oOn && O.digT > 1.4, dt) > 1;
    if (lead && oOn && G.time - (st.leadT == null ? -9 : st.leadT) > 0.9 && !CPU.last[p.id].act) { out.act = true; st.leadT = G.time; }
    if (oOn && O.digT > 2) say(st, p, info, 'Dig with me, at the same time!');
    else if (!oOn && cpuFor(st, 'askDig', true, dt) > 3) say(st, p, info, 'Dig here with me!');
    return out;
  }

  /* ---------- Mr. Bones the ladder, up a tree for a bone ---------- */
  function ladderJob(st, p, o, m, mound, dt, info) {
    const k = spotOf(m, 'ladder'), s = m.spots[k];
    if (!s) return null;
    const upHere = q => q.alive && q.grounded && near(cpuFeet(q), mound.feet, 3) && near(cpuCx(q), mound.x, 120);
    if (upHere(p)) return dig(st, p, m, mound);
    if (m.pl[o.id].climb || upHere(o)) return null;
    if (info.partnerCpu && p.id === 1) return null;
    const c = call(st, p, o, m, k, info);
    if (c) return c;
    return go(st, p, m, mound.x, mound.feet, 5);
  }

  /* ---------- Room 4: the bridge, the bell ---------- */
  function bridgeSpot(m) { const k = spotOf(m, 'bridge'); return { k, s: m.spots[k] }; }
  const over = (s, q) => q.alive && (cpuCx(q) - (s.side > 0 ? s.x1 : s.x0)) * s.side > 6;
  function cross(st, p, o, m, dt, info) {
    const { k, s } = bridgeSpot(m);
    if (!s) return null;
    const farX = (s.side > 0 ? s.x1 : s.x0) + s.side * 26;
    if (over(s, p)) {
      if (!over(s, o) && cpuFor(st, 'askCross', true, dt) > 4) say(st, p, info, 'Come across!');
      return go(st, p, m, farX, s.feet, 10, true);
    }
    const c = call(st, p, o, m, k, info);
    if (c) return c;
    return go(st, p, m, farX, s.feet, 10);
  }
  function bell(st, p, o, m, dt, info) {
    const k = spotOf(m, 'ladder'), s = m.spots[k];
    if (!s || !m.ropes.length) return {};
    const topQ = q => q.alive && cpuFeet(q) <= s.top + 4 && (cpuCx(q) - s.x) * s.side > 0;
    if (!topQ(p)) { const c = call(st, p, o, m, k, info); if (c) return c; }
    // my rope: the one the partner isn't at (the first one up takes the far one)
    const oAt = bonehuntRopeAt(m, o), far = m.ropes.length - 1;
    if (st.rope == null) st.rope = topQ(o) ? 0 : far;
    if (oAt >= 0 && oAt === st.rope) st.rope = st.rope === far ? 0 : far;
    else if (oAt < 0 && topQ(o) && topQ(p) && bonehuntRopeAt(m, p) < 0 && st.rope === far && (cpuCx(o) - cpuCx(p)) * s.side > 0) st.rope = 0;
    const r = m.ropes[st.rope];
    if (bonehuntRopeAt(m, p) === st.rope) {
      const out = {};
      cpuSeek(out, p, r.x, 8);
      out.act = true;
      if (oAt < 0 && cpuFor(st, 'askRope', true, dt) > 2.5) say(st, p, info, 'Pull the other rope!');
      return out;
    }
    return go(st, p, m, r.x, r.feet, 5);
  }

  /* ---------- the exit ---------- */
  function doorX(p, o, d) {
    const dx = cpuCx(p) - cpuCx(o);
    return d.x + d.w / 2 + (!o.alive || Math.abs(dx) < 1 ? (p.id ? 1 : -1) : Math.sign(dx)) * 13;
  }
  function exit(st, p, o, m, dt, info) {
    if (!m.roomDone) return null;
    const d = m.exit;
    if (!d) return {};
    const k = spotOf(m, m.cfg.exitVia);
    const upThere = cpuFeet(p) <= d.y + d.h + 2;
    if (k >= 0 && !upThere) { const c = call(st, p, o, m, k, info); if (c) return c; }
    if (upThere && !(m.inExit && m.inExit[o.id]) && cpuFor(st, 'askExit', true, dt) > 4) say(st, p, info, 'This way!');
    return go(st, p, m, doorX(p, o, d), d.y + d.h, 4);
  }

  /* ---------- adapting to the person: help with the job they have started, whatever the plan says ---------- */
  // remember when the person calls Mr. Bones somewhere (seen: he hops to the chalk X they stand on), and keep out of
  // the way of that choice while they are near it or using him there
  function watchCalls(st, p, o, m, dt) {
    const mr = m.mr;
    if (mr.form === 'hop' && mr.hop && typeof mr.hop.to === 'number' && bonehuntSpotAt(m, o) === mr.hop.to && bonehuntSpotAt(m, p) !== mr.hop.to) st.keep = { k: mr.hop.to, idle: 0 };
    const kp = st.keep;
    if (!kp) return;
    const ks = m.spots[kp.k], O = m.pl[o.id];
    const using = O.climb || onMr(m, o) || (o.alive && near(cpuCx(o), ks.x, 150) && near(cpuFeet(o), ks.feet, 60)) || (mr.form === 'ladder' && mr.spot === kp.k && cpuFeet(o) <= ks.top + 4);
    // (given up once they wander off, or after a good while near him without using him)
    kp.idle = O.climb || onMr(m, o) || mr.form === 'hop' ? 0 : kp.idle + dt;
    if (cpuFor(st, 'keepGone', !using, dt) > 2.5 || kp.idle > 9 || (mr.spot !== kp.k && mr.form !== 'hop')) st.keep = null;
  }
  function follow(st, p, o, m, dt, info) {
    if (info.partnerCpu || !o.alive || !p.alive) return null;
    const P = m.pl[p.id], O = m.pl[o.id];
    watchCalls(st, p, o, m, dt);
    if (O.lock) return null;
    // the person stands on another chalk X while I'm on Mr. Bones: hop off so they can call him
    const ko = bonehuntSpotAt(m, o);
    if (onMr(m, p) && m.mr.form !== 'ladder' && ko >= 0 && ko !== m.mr.spot && cpuFor(st, 'oOnX', still(o), dt) > 0.3) st.yieldT = 3;
    else if (ko < 0) cpuFor(st, 'oOnX', false, dt);
    if (st.yieldT > 0) {
      st.yieldT -= dt;
      if (m.mr.form === 'hop' || !onMr(m, p) && !near(cpuCx(p), m.mr.x, 40)) { if (m.mr.form === 'hop') st.yieldT = 0; return {}; }
      const out = {}, d = cpuCx(o) < cpuCx(p) ? -1 : 1;
      out.left = d < 0; out.right = d > 0;
      return out;
    }
    // the person climbs to the belfry before the arm bone: ring the bell with them first
    const lad = bonehuntLadder(m);
    if (m.bell && !m.bell.rung && lad && (O.climb || cpuFeet(o) <= lad.top + 4)) return bell(st, p, o, m, dt, info);
    // in the middle of my own part of a job (climbing, stacked, digging up high): finish it first
    if (P.climb || headOn(o, p) || headOn(p, o)) return null;
    const mine = bonehuntMoundAt(m, p);
    if (mine && !mine.big && cpuFeet(p) < H - 2 * T - 4) return null;
    // the person cranks the gate, waits at it or is inside the crypt: the crypt job (theirs is the other part)
    const gt = m.gate, gm = gt && m.mounds.find(q => q.how === 'gate' && !m.pieces[q.piece]);
    if (gm) {
      const atGate = gt.held === o.id || bonehuntAtCrank(m, o) || bonehuntInCrypt(m, o) || (!gm.done && still(o) && near(cpuFeet(o), gt.y1, 4) && near(cpuCx(o), gt.x - gt.dir * 40, 50));
      if (cpuFor(st, 'oGate', atGate, dt) > 0.6) st.gateT = G.time;
      const carried = G.players.some(q => m.pl[q.id].carry && m.pl[q.id].carry.piece === gm.piece);
      if (st.gateT != null && G.time - st.gateT < 3 && (!gm.done || carried)) { const g = gate(st, p, o, m, gm, dt, info); if (g) return g; }
    }
    if (gt && bonehuntInCrypt(m, p)) {
      // inside the crypt anyway: dig its bone; with nothing to do in here and the gate shut, hop back out
      if (gm && !gm.done) return dig(st, p, m, gm);
      if (gt.pass) return go(st, p, m, gt.x - gt.dir * 50, gt.y1, 8, true);
      const t = cpuFor(st, 'shutIn', true, dt);
      if (t > 1.5) say(st, p, info, 'Open the gate!');
      return t > 4 ? { down: true } : nav(st, p, m, gt.x + gt.dir * 44, gt.y1, 6, true);
    }
    cpuFor(st, 'shutIn', false, dt);
    // the person holds one end of a big bone: grab the other end
    if (O.hold && O.hold.state === 'ground' && O.hold.m) return big(st, p, o, m, O.hold.m, dt, info);
    // the person is on the giant ribcage: dig it with them
    const om = bonehuntMoundAt(m, o);
    if (om && om.together && !om.done && !m.pieces[om.piece] && cpuFor(st, 'oRibs', true, dt) > 0.5) return together(st, p, o, m, om, dt, info);
    if (!om || !om.together) cpuFor(st, 'oRibs', false, dt);
    return null;
  }

  // the first job not done yet; while the partner does one, only a job that can be done at the same time
  function jobs(st, p, o, m, dt, info) {
    const f = follow(st, p, o, m, dt, info);
    if (f) return f;
    let busy = false;
    for (const it of m.cfg.plan || []) {
      const [kind, ix] = it.split(':'), mound = ix != null ? m.mounds[+ix] : null;
      if (mound && m.pieces[mound.piece]) continue;
      if (kind === 'cross') { const { s } = bridgeSpot(m); if (!s || (over(s, p) && over(s, o))) continue; }
      if (kind === 'bell' && (!m.bell || m.bell.rung)) continue;
      if (kind === 'finale') return {};
      if (busy && kind !== 'big' && kind !== 'gate') return {};
      // a small bone already dug: carried by the partner (they take it), or lying on the ground (pick it up)
      if (mound && mound.done && !mound.big) {
        const b = m.bones.find(q => q.piece === mound.piece && q.state === 'ground');
        if (b) return go(st, p, m, b.x, b.feet, 6);
        if (kind !== 'gate') { busy = true; continue; }
      }
      let out = null;
      if (kind === 'tower') out = stack(st, p, o, m, mound, dt, info);
      else if (kind === 'jack') out = jack(st, p, o, m, mound, dt, info);
      else if (kind === 'seesaw') out = seesaw(st, p, o, m, mound, dt, info);
      else if (kind === 'gate') out = gate(st, p, o, m, mound, dt, info);
      else if (kind === 'big') out = big(st, p, o, m, mound, dt, info);
      else if (kind === 'ladder') out = ladderJob(st, p, o, m, mound, dt, info);
      else if (kind === 'cross') out = cross(st, p, o, m, dt, info);
      else if (kind === 'bell') out = bell(st, p, o, m, dt, info);
      else if (kind === 'exit') out = exit(st, p, o, m, dt, info);
      if (out) return out;
      busy = true;
    }
    return {};
  }

  cpuBrain('bonehunt', {
    think(st, p, o, dt, info) {
      const m = info.mst, out = {};
      if (!m || !m.pl || !p.alive || info.intro || m.leaving || m.finale) return out;
      const P = m.pl[p.id];
      if (P.lock) return out;
      // flying off a head: steer for the top until landing
      if (st.air === 'boost') {
        if (!p.grounded) { cpuSteer(out, p, st.landX != null ? st.landX : cpuCx(p), 3); out.jump = p.vy < 0; return out; }
        st.air = null;
      }
      if (P.hold) return carry(st, p, o, m, dt, info);
      if (P.carry) return deliver(st, p, o, m, dt, info);
      return jobs(st, p, o, m, dt, info);
    },
  });
})();
