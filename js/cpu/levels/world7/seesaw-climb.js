/* Pip & Bo - Computer partner: seesaw climb. */
'use strict';

(() => {
  /* Every floor is a few "launches" in a row: one player sits on the low end of a seesaw, the other jumps from a high
     ledge onto the raised end, and the sitter flies to a lever (or a bell, or over the moat). Levers bring lifts down,
     and the lifts take the other player up to the door. Each floor below lists its launches; the brain looks at what
     is done (levers pulled, bells rung, the drawbridge) and where both players are, and picks its job:
       sit     walk onto the seesaw and stand on its low end (the end its rests on; a beam tipped the wrong way is hopped
               back), then wait for the drop
       drop    climb to the ledge, wait there until the partner sits, then jump onto the raised end (steering in the air)
       fly     launched: a quick extra jump for a SUPER launch when the flight would fall short, then steer to the lever
               (bell, perch); a catapult throw keeps its push while rising
       lift    walk onto a lift that is down (or coming down), wait on it until it is up
       door    go to the door and wait
     Who sits and who drops is free. The partner's choice decides: a partner on the seesaw makes the computer drop, a
     partner on the ledge makes it sit. A partner who stands still gets a moment, then the computer picks by where the
     partner is (near the seesaw: the computer drops) and says what it waits for. Two computers split the jobs by
     distance (Pip on a tie). */
  const SW = () => SEESAW;
  const TEST = { force: [null, null] }; // bot tests: force a player's job ('sit' / 'drop')
  const cx = cpuCx, feet = cpuFeet;

  // the low end's position for sitting (side: -1 left, +1 right)
  const lowX = (s, side, off) => s.cx + side * (off || 45);
  const surfAt = (s, x) => seesawSurf(s, x);
  function onBeam(st, q, s) { return st.pl[q.id].on === s; }
  // q stands on the low end of s, where a drop on the other end launches them
  function seated(st, q, s) {
    if (!q.alive || !onBeam(st, q, s) || !q.grounded) return false;
    const d = cx(q) - s.cx;
    return Math.sign(d) === s.target && Math.abs(d) >= SW().zone + 2 && Math.abs(d) <= SW().half + 4;
  }
  // q is down in the seesaw's pit (on the beam or below the floor beside it)
  function inPit(s, q) { return q.alive && Math.abs(cx(q) - s.cx) <= SW().half + 4 && feet(q) > s.py - SW().rise - 4; }
  const settled = s => Math.abs(s.tilt - s.target) < 0.01;
  const near = (q, x, f, dx, df) => Math.abs(cx(q) - x) <= dx && Math.abs(feet(q) - f) <= df;
  // q stands on (or at) the drop ledge; standing on the partner's head up there counts too
  const onLedge = (q, L) => q.alive && q.grounded && Math.abs(cx(q) - L.x) <= 75 && feet(q) <= L.feet + 10 && feet(q) >= L.feet - 40;
  function say(S, p, text, every) {
    if ((S.sayT || 0) > G.time) return;
    S.sayT = G.time + (every || 6);
    cpuSay(p, text, 2.4);
  }

  /* ---------- moving about ---------- */
  function go(S, p, x, f, tol) { return cpuNav(S, p, x, f, { tol: tol || 6 }) || {}; }
  // walk to a point on a beam (cpuNav can't see beams: once on it, steer straight)
  function toBeamX(S, st, p, s, x) {
    if (onBeam(st, p, s)) { const out = {}; cpuSeek(out, p, x, 4); return out; }
    if (inPit(s, p) && p.grounded) { const out = {}; cpuSeek(out, p, x, 4); return out; }
    return go(S, p, x, surfAt(s, x) + 2, 8);
  }
  // ride a lift up: get on it at the bottom (or wait there for it), stand still on the way up
  function rideLift(S, st, p, l) {
    const out = {}, P = st.pl[p.id], mid = (l.x0 + l.x1) / 2;
    if (P.on === l) { if (l.state !== 'top') { cpuSeek(out, p, clamp(cx(p), l.x0 + 14, l.x1 - 14), 2); return out; } return null; }
    if (l.state === 'locked') return out;
    return go(S, p, mid, l.yBot, 8);
  }
  function toDoor(S, st, p) {
    const d = G.level.door, x = d.x + d.w / 2, f = d.y + d.h;
    if (Math.abs(feet(p) - f) < 4 && p.grounded) { const out = {}; cpuSeek(out, p, x, 5); return out; }
    return go(S, p, x, f, 5);
  }

  /* ---------- the launch jobs ---------- */
  // who sits and who drops for this launch (null: wait a moment to see what the partner does)
  function chooseRole(S, st, p, o, J, dt, info) {
    const s = J.s, key = J.key;
    if (S.roleKey !== key) { S.roleKey = key; S.role = null; S.roleWait = 0; S.oPitT = 0; }
    const O = st.pl[o.id];
    if (O.flying) return S.role || 'sit';
    const oSeat = seated(st, o, s), oLedge = onLedge(o, J.ledge);
    S.oPitT = inPit(s, o) && !oSeat ? (S.oPitT || 0) + dt : 0;
    const force = J.free !== false && TEST.force[p.id];
    if (force) return (S.role = force);
    // a partner already on one job: take the other (a person always gets their pick; two computers keep theirs)
    if (oSeat && (!info.partnerCpu || !seated(st, p, s))) return (S.role = 'drop');
    if (oLedge && (!info.partnerCpu || !onLedge(p, J.ledge))) return (S.role = 'sit');
    if (S.oPitT > 1.5 && !onBeam(st, p, s)) return (S.role = 'drop');
    if (S.role) return S.role;
    const seat = { x: J.seatX, f: surfAt(s, J.seatX) }, cost = (q, x, f) => Math.abs(cx(q) - x) + Math.abs(feet(q) - f) * 1.5;
    if (info.partnerCpu) {
      const mine = cost(p, seat.x, seat.f) - cost(p, J.ledge.x, J.ledge.feet), theirs = cost(o, seat.x, seat.f) - cost(o, J.ledge.x, J.ledge.feet);
      return (S.role = mine < theirs - 1 || (Math.abs(mine - theirs) <= 1 && p.id === 0) ? 'sit' : 'drop');
    }
    // a person: give them a moment, then take the job they are not near
    S.roleWait += dt;
    if (S.roleWait < 1.2) return null;
    return (S.role = cost(o, seat.x, seat.f) < cost(o, J.ledge.x, J.ledge.feet) ? 'drop' : 'sit');
  }
  function sit(S, st, p, o, J, info) {
    const s = J.s, side = Math.sign(J.seatX - s.cx);
    // the beam is tipped the wrong way and nobody is flying: hop on its raised end to tip it back
    if (s.target !== side && !st.pl[o.id].flying && !st.pl[p.id].flying) {
      if (onBeam(st, p, s) && p.grounded && Math.sign(cx(p) - s.cx) === side && Math.abs(cx(p) - s.cx) >= 22 && settled(s)) {
        const out = {}; out.jump = !CPU.last[p.id].jump; return out;
      }
      return toBeamX(S, st, p, s, J.seatX);
    }
    const out = toBeamX(S, st, p, s, J.seatX);
    if (seated(st, p, s) && Math.abs(cx(p) - J.seatX) < 10) {
      out.left = out.right = false; out.jump = false;
      if (!info.partnerCpu && info.partnerIdle > 4 && !st.pl[o.id].flying) say(S, p, 'Jump on the end!', 8);
    }
    return out;
  }
  function drop(S, st, p, o, J, info) {
    const s = J.s, up = -s.target, tx = s.cx + up * (J.landOff || 42);
    if (S.dropping) {
      if (!p.grounded) { const out = {}; cpuSeek(out, p, tx, 3); out.jump = p.vy < 0; return out; }
      S.dropping = false;
    }
    const L = J.ledge, there = p.grounded && near(p, L.x, L.feet, 7, 3);
    if (!there) return go(S, p, L.x, L.feet, 5);
    const out = {};
    cpuSeek(out, p, L.x, 4);
    const ready = seated(st, o, s) && settled(s) && !st.pl[o.id].flying && Math.abs(p.vx) < 30;
    if (!ready) {
      if (!info.partnerCpu && info.partnerIdle > 4) say(S, p, 'Sit on the low end!', 8);
      S.readyT = 0;
      return out;
    }
    // a short look before jumping (a person checks the sitter is there)
    S.readyT = (S.readyT || 0) + DT;
    if (S.readyT < 0.12 + 0.25 * (1 - info.skill)) return out;
    if (CPU.last[p.id].jump) { out.jump = false; return out; }
    out.jump = true; out.left = tx < cx(p); out.right = tx > cx(p);
    S.dropping = true; S.readyT = 0;
    return out;
  }
  // in the air after a launch: the extra jump for a SUPER launch when it is needed, then steer to the target
  function fly(S, st, p, o, J, info) {
    const out = {}, P = st.pl[p.id], f = P.flight;
    if (P.pump && G.time <= P.pump.until && p.vy < 0) {
      // only when it is short, and only when the extra height gets there (a bounce chain that can't reach dies out)
      const apex = P.pump.endTop - P.pump.H, need = J.needApex(st, p), after = P.pump.endTop - Math.min(P.pump.H + SW().pump, seesawHmax());
      if (apex > need && after <= need + 20) {
        if (S.pumpFor !== P.pump) { S.pumpFor = P.pump; S.pumpAt = G.time + (info.skill >= 0.9 ? 0.03 : info.skill >= 0.6 ? 0.06 : 0.1); S.pumpGo = Math.random() < 0.7 + 0.3 * info.skill; }
        if (S.pumpGo && G.time >= S.pumpAt && !CPU.last[p.id].jump) out.jump = true;
      }
    }
    if (f && f.thrown && p.vy < 0) { out.right = f.s.kick > 0; out.left = f.s.kick < 0; return out; }
    const tx = J.flyX(st, p);
    if (tx != null) cpuSeek(out, p, tx, 4);
    return out;
  }
  function launch(S, st, p, o, dt, info, J) {
    const P = st.pl[p.id], oFly = !!st.pl[o.id].flying;
    // a person's flight that came back down into the pit: after two, say where to steer
    if (S.missKey !== J.key) { S.missKey = J.key; S.miss = 0; }
    if (S.oFly && !oFly && J.miss && !info.partnerCpu && inPit(J.s, o) && ++S.miss >= 2) say(S, p, J.miss, 8);
    S.oFly = oFly;
    if (P.flying && P.flight) return fly(S, st, p, o, J, info);
    if (S.dropping && !p.grounded) return drop(S, st, p, o, J, info);
    S.dropping = false;
    const role = chooseRole(S, st, p, o, J, dt, info);
    if (!role) return {};
    return role === 'sit' ? sit(S, st, p, o, J, info) : drop(S, st, p, o, J, info);
  }

  /* ---------- the floors ---------- */
  const sawAt = (st, c, r) => st.saws.find(s => s.c === c && s.r === r);
  const leverAt = (st, c, r) => st.levers.find(l => l.c === c && l.r === r);
  const liftAt = (st, key) => st.lifts.find(l => l.key === key);
  // the lever's point (for walking to it after landing on its ledge)
  function toLever(S, st, p, lv) { const out = {}; cpuSeek(out, p, lv.x, 4); return out; }
  const FLOORS = [
    // 1 Castle Gate: launch to the lever over the door ledge; the lift brings the dropper up
    (S, st, p, o, dt, info) => {
      const s = sawAt(st, 12, 16), lv = leverAt(st, 8, 5), l = liftAt(st, '1,6');
      const up = q => feet(q) <= 186 && cx(q) < 290;
      if (!lv.pulled) {
        if (up(p) && p.grounded) return toLever(S, st, p, lv);
        return launch(S, st, p, o, dt, info, { key: 'g1', miss: 'Steer to the lever!', s, seatX: lowX(s, -1), ledge: { x: 467, feet: 270 }, flyX: () => lv.x, needApex: () => 172 });
      }
      if (up(p)) return toDoor(S, st, p);
      return rideLift(S, st, p, l) || toDoor(S, st, p);
    },
    // 2 Leapfrog Hall: launch A to the middle lever (its lift goes to the second seesaw), then launch B to the top lever
    (S, st, p, o, dt, info) => {
      const A = sawAt(st, 19, 16), B = sawAt(st, 9, 11), lvA = leverAt(st, 13, 5), lvB = leverAt(st, 5, 4), lA = liftAt(st, '13,10'), lB = liftAt(st, '1,5');
      const perch = q => feet(q) <= 246 && cx(q) > 370 && cx(q) < 470;   // the planks over the middle lift
      const low = q => feet(q) > 400;                                    // the hall floor (and seesaw A's pit)
      const top = q => feet(q) <= 156 && cx(q) < 200;
      if (!lvA.pulled) {
        if (perch(p) && p.grounded) return toLever(S, st, p, lvA);
        return launch(S, st, p, o, dt, info, { key: 'g2a', miss: 'Steer to the lever!', s: A, seatX: lowX(A, -1), ledge: { x: 675, feet: 270 }, flyX: () => lvA.x, needApex: () => 172 });
      }
      if (!lvB.pulled) {
        if (top(p) && p.grounded) return toLever(S, st, p, lvB);
        const J = { key: 'g2b', miss: 'Steer to the lever!', free: false, s: B, seatX: lowX(B, -1), ledge: { x: 400, feet: 180 }, flyX: (st2, q) => (feet(q) < 296 ? lvB.x : null), needApex: () => 140 };
        if (st.pl[p.id].flying && st.pl[p.id].flight && st.pl[p.id].flight.s === B) return fly(S, st, p, o, J, info);
        // both jobs start up the middle lift: from the hall floor, ride it first
        if (low(p) && !S.dropping) {
          const r = rideLift(S, st, p, lA);
          if (r) return r;
        }
        if (st.pl[p.id].on === lA && lA.state !== 'top') return {};
        return launch(S, st, p, o, dt, info, J);
      }
      if (top(p)) return toDoor(S, st, p);
      if (low(p)) { const r = rideLift(S, st, p, lA); if (r) return r; }
      return rideLift(S, st, p, lB) || toDoor(S, st, p);
    },
    // 3 Bell Tower: ring both bells (the sitter flies straight up; the bounce back launches the dropper to the other bell)
    (S, st, p, o, dt, info) => {
      const s = sawAt(st, 16, 16), un = st.bells.filter(b => !b.rung);
      if (!un.length) return toDoor(S, st, p);
      const seatX = un.some(b => b.x < s.cx) ? lowX(s, -1, 40) : s.cx - SW().zone - 4;
      const J = { key: 'g3', s, seatX, ledge: { x: 585, feet: 270 }, landOff: 45,
        // rising: under the nearest unrung bell; falling: back onto the end we flew from (that launches the partner)
        flyX: (st2, q) => {
          const P = st2.pl[q.id], f = P.flight, list = st2.bells.filter(b => !b.rung);
          if (q.vy < 0 && list.length) { const b = list.reduce((a, c) => (Math.abs(c.x - cx(q)) < Math.abs(a.x - cx(q)) ? c : a)); return b.x; }
          const side = f && f.side ? f.side : Math.sign(cx(q) - s.cx) || -1;
          return s.cx + side * 45;
        },
        needApex: (st2, q) => { const list = st2.bells.filter(b => !b.rung); return list.length ? Math.max(...list.map(b => b.y)) + SW().bellH / 2 + PH - 8 : -1e9; } };
      const P = st.pl[p.id];
      if (P.flying && P.flight) { if (!P.flight.side) P.flight.side = Math.sign(cx(p) - s.cx) || -1; return fly(S, st, p, o, J, info); }
      // in a bounce chain (the partner is flying), stay on the low end and get ready to be launched
      if (st.pl[o.id].flying && onBeam(st, p, s)) { const out = {}; cpuSeek(out, p, clamp(cx(p), s.cx - 70, s.cx + 70), 6); return out; }
      return launch(S, st, p, o, dt, info, J);
    },
    // 4 Battlements: the catapult throws the sitter over the moat to the bridge lever; then launch B to the top lever
    (S, st, p, o, dt, info) => {
      const A = sawAt(st, 9, 12), Bs = sawAt(st, 21, 10), lvL = leverAt(st, 28, 3), lv = leverAt(st, 16, 8), l = liftAt(st, '26,4');
      const tower = q => cx(q) >= 470 && feet(q) <= 346;
      const top = q => feet(q) <= 126 && cx(q) > 770;
      if (st.bridge.state !== 'down') {
        // thrown over (or fallen off the perch): up onto the tower top, then along to the lever
        if (tower(p) && !lv.pulled) return p.grounded && feet(p) <= 272 && Math.abs(cx(p) - lv.x) < 100 ? toLever(S, st, p, lv) : go(S, p, 525, 270, 8);
        if (tower(p)) return {};
        return launch(S, st, p, o, dt, info, { key: 'g4a', miss: 'Steer to the lever!', s: A, seatX: lowX(A, 1), ledge: { x: 100, feet: 210 }, landOff: 45, flyX: () => lv.x, needApex: () => -1e9 });
      }
      if (!lvL.pulled) {
        if (top(p) && p.grounded) return toLever(S, st, p, lvL);
        const J = { key: 'g4b', miss: 'Steer to the lever!', s: Bs, seatX: lowX(Bs, 1), ledge: { x: 552, feet: 210 }, flyX: () => lvL.x, needApex: () => 112 };
        if (st.pl[p.id].flying && st.pl[p.id].flight) return fly(S, st, p, o, J, info);
        if (!tower(p)) return go(S, p, 530, 270, 8);   // over the bridge first
        if (!tower(o) && !info.partnerCpu) {
          // wait on the tower for the partner (the jobs start from here)
          return go(S, p, 520, 270, 8);
        }
        return launch(S, st, p, o, dt, info, J);
      }
      if (top(p)) return toDoor(S, st, p);
      return rideLift(S, st, p, l) || toDoor(S, st, p);
    },
  ];

  cpuBrain('seesaw', {
    test: TEST,
    think(S, p, o, dt, info) {
      const st = info.mst;
      if (!st || !st.saws || !st.pl || !p.alive) { if (p && !p.alive) S.dropping = false; return {}; }
      const f = FLOORS[info.room];
      return f ? f(S, st, p, o, dt, info) || {} : {};
    },
  });
})();
