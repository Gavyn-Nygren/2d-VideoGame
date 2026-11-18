/* Pip & Bo - Computer partner brain for 41-2 Page Turner Chase (mode 'popchase', 3D). It always plays its best.

   THE PLAN. The route is a corridor, so the brain steers like a stick toward a point a little ahead on the corridor's
   middle line (Pip a touch to the far side of it, Bo to the near side), never zig-zagging. With a person it keeps level
   with them or a step behind (never more than 3 ahead) unless a piece of machinery needs it somewhere.
   On the way: it jumps logs, waits out a sliding figure's run (it only hits while moving), steps out of a finger's
   shadow as soon as one grows near it and never walks into one, and stands on the dog-ear to wait.
   THE MACHINERY, whoever reaches a tab first works it:
     Bridge, flap, wheel (one holds, one crosses, then the one across holds the far tab): if the person holds the near
       tab it crosses at once and goes straight to the far tab; if it is first, it holds ("I'll hold it!", then "Go!")
       and never lets go while the person is on the bridge, under the flap or on the plank; a person standing at the
       near tab for 2 s without pulling has the computer take it. A wheel is turned by pushing right while holding.
       Once across it holds the far tab until the person is across too. Left behind with nobody pulling for it, it says
       "Pull the tab for me!" (again every few seconds) and waits (the Roll will carry it over).
     Twin tabs: it takes the free tab (Pip the first, Bo the second when both are free) and holds until both pull.
     The ship: if the person boards, it walks the long tab back; if the person takes the long tab, it boards and stands
       still in the middle; across, it holds the far tab until the person has sailed over too.
     Wave crests: it waits on the bank (or a crest) until the next crest lines up, then jumps, never onto the
       partner's crest.
   It never finishes or turns the page without the person (the dog-ear needs both, The End needs both). */
'use strict';

(() => {
  const PC = () => POPCHASE;
  const live = p => p && p.pc && p.pc.mode === 'run' && p.b3;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

  // a piece's way through: where it starts and ends along the route, and whether it is passable now
  function exitS(L3, pc) {
    if (pc._exit != null) return pc._exit;
    const P = PC();
    if (pc.kind === 'flap') pc._exit = P.progress(L3, pc.x + 0.9, pc.z);
    else if (pc.kind === 'twin' && pc.does === 'stair') pc._exit = P.progress(L3, pc.x + 5.8, pc.z);
    else if (pc.kind === 'twin' && pc.does === 'end') pc._exit = 1e9;
    else if (pc.kind === 'ship') pc._exit = P.progress(L3, pc.x1 + 0.05, pc.z);
    else pc._exit = pc.sOut;
    return pc._exit;
  }
  function entryS(L3, pc) {
    if (pc._entry != null) return pc._entry;
    const P = PC();
    if (pc.kind === 'flap') pc._entry = P.progress(L3, pc.x - 0.9, pc.z);
    else if (pc.kind === 'twin' && pc.does === 'stair') pc._entry = P.progress(L3, pc.x - 5.6, pc.z);
    else if (pc.kind === 'ship') pc._entry = P.progress(L3, pc.x0 - 0.6, pc.z);
    else if (pc.kind === 'twin' && pc.does === 'end') pc._entry = pc.tabs[0].s;
    else pc._entry = pc.sIn;
    return pc._entry;
  }
  const isOpen = pc => (pc.kind === 'flap' ? pc.sol.ghost : pc.kind === 'twin' ? pc.popped : pc.kind === 'bridge' ? !pc.sol.ghost && pc.e >= 0.999 : !pc.sol.ghost);

  cpuBrain('popchase', {
    reset(s) { s.roleP = null; s.L3 = null; s.wait = 0; s.jumpT = 0; s.saidPull = {}; s.lone = 0; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst, P = PC();
      if (!st || !st.L3 || info.intro || st.turn || st.ending || !live(p)) return out;
      const L3 = st.L3, me = p.b3, id = p.id, solo = !info.partnerCpu;
      if (s.L3 !== L3) { s.roleP = null; s.L3 = L3; s.lone = 0; s.saidPull = {}; s.held = null; }
      const myS = P.progress(L3, me.x, me.z);
      const oLive = live(o), theirS = oLive ? P.progress(L3, o.b3.x, o.b3.z) : null;
      const lat = id ? 0.55 : -0.55;

      // ---------- steering ----------
      let jump = false, act = false, push = null;
      const goTo = (x, z, dead = 0.12) => {
        const dx = x - me.x, dz = z - me.z, d = Math.hypot(dx, dz);
        if (d < dead) { const v = Math.hypot(me.vx, me.vz); if (v > 1.5) { const k = cpuNav3.stick(-me.vx, -me.vz); out.ax = k.ax * 0.6; out.ay = k.ay * 0.6; } return true; }
        const k = cpuNav3.stick(dx, dz), m = Math.min(1, 0.25 + d / 0.9);
        out.ax = k.ax * m; out.ay = k.ay * m;
        return false;
      };
      // a point on the corridor at progress t, offset sideways
      const onRoute = (t, side = lat) => { const q = P.pointAt(L3, t); return { x: q.x - q.dz * side, z: q.z + q.dx * side, q }; };
      const runTo = t => { const a = onRoute(Math.min(t, myS + 2.2)); return goTo(a.x, a.z, 0.2); };

      // ---------- the next piece of machinery the pair has not both got past ----------
      const pieces = L3.pieces.slice().sort((a, b) => entryS(L3, a) - entryS(L3, b));
      const theirPast = pc => (oLive ? theirS > exitS(L3, pc) : myS > exitS(L3, pc));
      let cur = null;
      for (const pc of pieces) { if (myS > exitS(L3, pc) && theirPast(pc)) continue; cur = pc; break; }
      // the furthest I may run on my own: up to the next piece's start (or past it when it is open)
      let limit = 1e9;
      if (cur && myS < exitS(L3, cur) && !(isOpen(cur) && cur.kind !== 'ship')) limit = entryS(L3, cur) - 0.2;
      if (solo && oLive) limit = Math.min(limit, theirS + 3);

      // ---------- what to do ----------
      let goal = null; // { x, z } to stand on, or null to run on along the route
      let job = false; // the goal is a place the machinery needs me at: a tab, the ship's deck (the "3 ahead of the person" rule
      // does not hold me back from it: held back, it once stood in the gateway a person held open, and walked off the ship's stern)
      if (cur && myS < exitS(L3, cur) + 3) {
        const r = pieceGoal(s, p, o, cur, { L3, st, P, myS, theirS, oLive, solo, me, dt, info });
        if (r) { goal = r.at || null; job = !!r.at; act = !!r.act; push = r.push || null; if (r.limit != null) limit = r.limit; if (r.say && solo) cpuSay(p, r.say, 1.6); if (r.jump) jump = true; if (r.hold) s.held = r.hold; }
      }
      // the dog-ear at the end of the spread: stand on it and wait
      const de = L3.dogEar;
      if (!goal && de && (!cur || myS > exitS(L3, cur)) && myS > P.progress(L3, de.x, de.z) - 6) goal = { x: de.x + (id ? 0.5 : -0.5), z: de.z + (id ? 0.4 : -0.4) };

      // ---------- hazards while moving (also on the way to a goal further along the route) ----------
      const farGoal = () => goal && P.progress(L3, goal.x, goal.z) > myS + 1.5;
      if (farGoal()) { limit = P.progress(L3, goal.x, goal.z); if (solo && oLive && !job) limit = Math.min(limit, theirS + 3); goal = null; }
      const f = st.finger;
      if (f && f.ph !== 'lift') {
        const d = dist(me, f), R = P.S.fingerR + 0.55;
        if (d < R) {
          // step out: forward along the route if that is clear of it, else back, else sideways
          const fw = onRoute(myS + 1.6, lat), bk = onRoute(myS - 1.6, lat);
          const pick = [fw, bk].find(q => Math.hypot(q.x - f.x, q.z - f.z) > R + 0.3) || { x: me.x + (me.x - f.x) * 3, z: me.z + (me.z - f.z) * 3 };
          goal = { x: pick.x, z: pick.z }; act = false; push = null;
          if (solo) cpuSay(p, 'Mind the finger!', 1.4);
        } else if (!goal) {
          // never walk into one: stop short of it along the route
          const fs = P.progress(L3, f.x, f.z);
          if (fs > myS && fs - myS < R + 1.5) {
            const side = onRoute(fs, 0);
            const off = Math.hypot(side.x - f.x, side.z - f.z);
            limit = Math.min(limit, fs - R - 0.4 + (off > 2.2 ? 9 : 0));
          }
        }
      }
      // sliding figures: wait out a run near my line
      if (!goal) for (const sl of L3.sliders) {
        const ss = sl.s, ahead = ss - myS;
        if (ahead < 0.2 || ahead > 2.4) continue;
        let danger = false;
        for (let k = 0; k <= 12; k++) { const a = P.sliderAt(sl, st.T + k * 0.06); if (a.moving || (k < 4 && a.tell > 0.5)) { const z = sl.z0 + (sl.z1 - sl.z0) * a.pos; if (Math.abs(z - me.z) < 1.6) danger = true; } }
        if (danger) limit = Math.min(limit, ss - 1.25);
      }
      // wave crests
      if (!goal) { const r = crestGoal(s, p, o, { L3, st, P, myS, me, hold: solo && oLive && theirS < myS - 3 }); if (r) { if (r.at) { goal = r.at; job = true; } if (r.jump) jump = true; if (r.limit != null) limit = Math.min(limit, r.limit); } }

      // ---------- move ----------
      // logs: hop them (either way along the route)
      const hopLogs = dir => { for (const lg of L3.logs) { const d = (lg.x - me.x) * dir, q = onRoute(myS, 0).q; if (Math.abs(q.dx) > 0.5 && d * q.dx > 0.45 && d * q.dx < 1.3 && me.ground) jump = true; } };
      if (goal) {
        // a far goal is reached along the corridor (round its bends), a near one straight
        const gS = P.progress(L3, goal.x, goal.z);
        if (gS > myS + 1.5) { runTo(Math.min(gS, myS + 2.2)); hopLogs(1); }
        else if (gS < myS - 1.5 && p.pc.hold && p.pc.hold.t.strip) goTo(goal.x, goal.z, 0.2); // (walking the ship's long tab back: straight along it, or the hand slips off)
        else if (gS < myS - 1.5) { const a = onRoute(Math.max(gS, myS - 2.2)); goTo(a.x, a.z, 0.2); hopLogs(-1); }
        else goTo(goal.x, goal.z, act ? 0.25 : 0.15);
      } else {
        const t = Math.min(myS + 2.2, limit);
        if (t > myS + 0.05) runTo(t);
        else { const a = onRoute(Math.max(t, myS - 0.4)); goTo(a.x, a.z, 0.3); }
        hopLogs(1);
      }
      if (push) { const k = cpuNav3.stick(push.x, push.z); out.ax = k.ax; out.ay = k.ay; }
      // jumping: a fresh press, then held while rising (a full jump)
      if (jump && me.ground && s.jumpT <= 0) s.jumpT = 0.32;
      if (s.jumpT > 0) { s.jumpT -= dt; out.jump = true; }
      out.act = act;
      return out;
    },
  });

  // where to stand and what to press for the current piece
  function pieceGoal(s, p, o, pc, c) {
    const { L3, st, P, myS, theirS, oLive, solo, me } = c, id = p.id;
    // (standing on the far bank or just through the flap counts as across: never turn back onto a piece that is closing)
    const over = b => b.ground && b.on !== pc.sol && (pc.kind === 'flap' ? b.x > pc.x + 0.75 : pc.x1 != null && b.x > pc.x1 - 0.05);
    const mePast = myS > exitS(L3, pc) || over(me), themPast = oLive ? theirS > exitS(L3, pc) || over(o.b3) : mePast;
    const mine = h => h && h.pc === pc;
    const iHold = mine(p.pc.hold), theyHold = oLive && mine(o.pc.hold);
    const holdTab = t => { const at = { x: t.x, z: t.z }; const there = dist(me, t) < P.TAB_R * 0.7; return { at, act: there, push: there && t.wheel ? fwdAt(P, L3, t) : null, hold: t }; };
    const nearBank = () => { const a = P.pointAt(L3, entryS(L3, pc) - 0.5); const side = id ? 0.7 : -0.7; return { x: a.x - a.dz * side, z: a.z + a.dx * side }; };

    if (pc.kind === 'twin') {
      if (pc.popped) return null;
      // my tab: the one the partner is not at (Pip the first, Bo the second when it does not matter)
      const t0 = pc.tabs[0], t1 = pc.tabs[1];
      let my = id ? t1 : t0;
      if (oLive) {
        const theirs = theyHold ? o.pc.hold.t : (dist(o.b3, t0) < dist(o.b3, t1) - 0.3 ? t0 : dist(o.b3, t1) < dist(o.b3, t0) - 0.3 ? t1 : null);
        if (theirs && dist(o.b3, theirs) < 3) my = theirs === t0 ? t1 : t0;
      }
      if (myS < my.s - 6) return null; // still on the way
      const r = holdTab(my);
      if (r.act && solo && !theyHold) r.say = 'Pull with me!';
      return r;
    }

    if (pc.kind === 'ship') return shipGoal(s, p, o, pc, c, holdTab);

    // bridge, flap, wheel
    const N = pc.tabs[0], F = pc.tabs[1], open = isOpen(pc);
    if (mePast && themPast) return null;
    if (mePast && !themPast) {
      // across: hold the far tab until the partner is across too
      if (!oLive) return { at: { x: F.x, z: F.z } };
      const r = holdTab(F);
      if (r.act && solo) r.say = theirS > exitS(L3, pc) - 2 ? null : 'Go!';
      return r;
    }
    if (!mePast && themPast) {
      // the holder keeps holding until the partner has the far tab (a person gets 3 s), then lets go and crosses
      if (iHold) {
        const theyF = oLive && o.pc.hold && o.pc.hold.t === F;
        s.waitF = theyF ? 0 : (s.waitF || 0) + c.dt;
        if (!theyF && (s.waitF < 3 || !solo)) return holdTab(N);
      }
      // (only while the partner holds it: one let go of is closing, and carries anybody on it back)
      if (open && theyHold) return { at: { x: F.x, z: F.z }, limit: exitS(L3, pc) + 1.5 };
      s.lone += c.dt;
      if (solo && s.lone > 3 && !(s.saidPull[pc.i] > c.st.T)) { s.saidPull[pc.i] = c.st.T + 7; return { at: nearBank(), say: 'Pull the tab for me!' }; }
      return { at: nearBank() };
    }
    s.lone = 0; s.waitF = 0;
    // both before it: who holds?
    let holder;
    if (theyHold && o.pc.hold.t === N) holder = false;
    else if (iHold) holder = true;
    else if (theyHold) holder = false;
    else if (!oLive) holder = false;
    else if (!solo) {
      // two computers: the one there first holds (decided once, so the two never swap round as they move)
      if (s.roleP !== pc) { s.roleP = pc; s.role = myS > theirS + 0.3 ? true : theirS > myS + 0.3 ? false : id === 0; }
      holder = s.role;
    } else {
      // with a person: the computer holds unless the person is already at the tab ready to pull; a person who stands at
      // the near tab for 2 s without pulling has the computer take it
      // (and anyone hanging about at it, fidgeting or not, for 2 s)
      const atN = dist(o.b3, N) < P.TAB_R + 0.3;
      s.personAtN = atN ? (s.personAtN || 0) + c.dt : 0;
      holder = !atN || s.personAtN > 2;
    }
    if (holder) {
      // hold until the partner is across and has the far tab (or the piece is otherwise open behind them)
      const crossing = oLive && theirS > entryS(L3, pc) - 0.3;
      const r = holdTab(N);
      if (r.act && solo) r.say = crossing ? null : open ? 'Go!' : "I'll hold it!";
      return r;
    }
    // the crosser: wait at the bank until it is open, then go straight to the far tab
    if (open) return { at: { x: F.x, z: F.z }, limit: exitS(L3, pc) + 1.5 };
    return { at: nearBank() };
  }
  // the way that turns a wheel: forward along the route at the tab
  function fwdAt(P, L3, t) { const q = P.pointAt(L3, t.s); return { x: q.dx, z: q.dz }; }

  // the ship: one rides, one walks the long tab back; across, the rider pulls it over again from the far tab
  function shipGoal(s, p, o, pc, c, holdTab) {
    const { L3, P, myS, theirS, oLive, solo, me } = c, id = p.id;
    const strip = pc.tabs[0], far = pc.tabs[1], deck = pc.sol;
    const onDeck = b => b && b.ground && b.on === deck;
    // stepped off onto the far bank counts as across
    const ashore = b => b && b.ground && b.on !== deck && b.x > pc.x1 - 0.1;
    const exit = exitS(L3, pc), mePast = myS > exit || ashore(me), themPast = oLive ? theirS > exit || ashore(o.b3) : mePast;
    const docked = u => Math.abs(pc.u - u) < 0.02;
    const deckSpot = () => ({ x: deck.x + (id ? 0.6 : -0.6), z: pc.z });
    if (mePast && themPast) return null;
    if (mePast) {
      // across: pull it over for the partner once they are aboard (and stand by the far tab till then)
      if (!oLive) return { at: { x: far.x, z: far.z } };
      if (onDeck(o.b3) || (s.held === far && !docked(1))) { const r = holdTab(far); if (r.act && solo) r.say = 'Hold on!'; return r; }
      if (docked(1) && onDeck(o.b3)) return { at: { x: far.x, z: far.z } };
      return { at: { x: far.x, z: far.z } };
    }
    if (onDeck(me)) {
      // riding: stand still in the middle; get off at the far bank
      if (docked(1)) return { limit: exit + 1.5 };
      // both aboard and nobody to pull: hop off to the nearer bank if it is a short jump
      if (oLive && onDeck(o.b3)) {
        const toFar = pc.x1 - (deck.x + pc.half), toNear = (deck.x - pc.half) - pc.x0;
        if (toFar < 2.4) return { at: { x: pc.x1 + 1.2, z: pc.z }, jump: Math.abs(me.x - (deck.x + pc.half - 0.4)) < 0.4 };
        if (id === 1 && toNear < 2.4) return { at: { x: pc.x0 - 1.2, z: pc.z }, jump: Math.abs(me.x - (deck.x - pc.half + 0.4)) < 0.4 };
      }
      if (solo && !(oLive && o.pc.hold && o.pc.hold.pc === pc)) cpuSay(p, 'Pull the long tab!', 1.6);
      return { at: deckSpot(), limit: myS };
    }
    // before it: am I the rider or the walker?
    const theyRide = oLive && onDeck(o.b3), theyWalk = oLive && o.pc.hold && o.pc.hold.t === strip;
    let rider;
    if (theyWalk) rider = true;
    else if (theyRide) rider = false;
    else if (themPast) rider = true; // they are across: board and let them pull
    else if (!oLive) rider = false;
    else if (!solo) { if (s.roleP !== pc) { s.roleP = pc; s.role = myS > theirS + 0.3 ? true : theirS > myS + 0.3 ? false : id === 0; } rider = s.role; }
    else { const atStrip = dist(o.b3, strip) < P.TAB_R + 0.3; s.personAtStrip = atStrip ? (s.personAtStrip || 0) + c.dt : 0; rider = atStrip && s.personAtStrip < 2; }
    if (rider) {
      // board when it is home (or wait on the bank)
      if (pc.u < 0.1) return { at: deckSpot() };
      return { at: P.pointAt(L3, entryS(L3, pc) - 0.4) };
    }
    // the walker: take the long tab; once the partner is aboard walk it back to the far end and hold there
    if (!(p.pc.hold && p.pc.hold.t === strip)) { const r = holdTab(strip); if (r.act && solo && !theyRide) r.say = 'Hop on the ship!'; return r; }
    if (theyRide || (oLive && !o.b3.ground && Math.abs(o.b3.x - deck.x) < pc.half + 0.5)) {
      if (docked(1) && !theyRide) return { at: { x: strip.x, z: strip.z }, act: false };
      return { at: { x: pc.sx1 - 0.3, z: strip.z }, act: true };
    }
    if (themPast) return { at: { x: strip.x, z: strip.z }, act: false };
    return { at: { x: strip.x, z: strip.z }, act: true };
  }

  // stepping-stone crests: from the bank or a crest, jump when the next one lines up
  function crestGoal(s, p, o, c) {
    const { L3, st, P, me } = c;
    if (!L3.crests.length) return null;
    const rows = L3.crests.slice().sort((a, b) => a.x - b.x);
    // which gap of crests am I at (the first whose far bank I have not reached)
    const g = L3.def.crests[0], [gx0, gx1] = L3.def.gaps[g.gap];
    if (me.x > gx1 + 0.3 || me.x < gx0 - 5) return null;
    const onCrest = rows.findIndex(r => me.ground && me.on === r.sol);
    const zNow = r => r.sol.z, zAt = (r, dt) => P.crestZ(r, st.T + dt);
    const partnerOn = r => o.b3 && o.b3.ground && o.b3.on === r.sol;
    // in the air: steer for the crest (or bank) being jumped to
    if (!me.ground && s.crestJump) return s.crestJump.to ? { at: { x: s.crestJump.to.x, z: zAt(s.crestJump.to, 0.15) } } : { at: { x: gx1 + 1.2, z: me.z } };
    if (onCrest < 0) {
      if (me.x > gx0) return null; // in the air over the sea: steer by the jump below
      // on the near bank: stand at the edge in line with the first crest's middle
      // (lined up for a while, so a jump a moment late still lands)
      // (c.hold: the person is still well behind: wait on the bank, never out on the stones)
      const r = rows[0], ready = !c.hold && Math.abs(zAt(r, 0.42) - me.z) < 0.32 && Math.abs(zAt(r, 0.62) - me.z) < 0.55 && !partnerOn(r) && Math.abs(me.x - (gx0 - 0.45)) < 0.35;
      const at = { x: gx0 - 0.45, z: clamp(zAt(r, 0.5), r.zc - r.amp + 0.1, r.zc + r.amp - 0.1) };
      if (ready) { s.crestJump = { to: r }; return { jump: true, at: { x: r.x, z: zAt(r, 0.4) } }; }
      return { at };
    }
    // on a crest: stay on its middle; jump to the next when it lines up (or to the far bank)
    const cur = rows[onCrest], next = rows[onCrest + 1];
    s.crestJump = null;
    if (!next) {
      const zEdge = clamp(me.z, cur.zc - 1.2, cur.zc + 1.2);
      if (Math.abs(me.x - cur.x) < 0.3) { s.crestJump = { to: null }; return { jump: true, at: { x: gx1 + 1.2, z: zEdge } }; }
      return { at: { x: cur.x + 0.3, z: zNow(cur) } };
    }
    const ready = Math.abs(zAt(next, 0.42) - zAt(cur, 0.0)) < 0.35 && Math.abs(zAt(next, 0.62) - zAt(cur, 0.2)) < 0.55 && !partnerOn(next) && Math.abs(me.x - cur.x) < 0.35;
    if (ready) { s.crestJump = { to: next }; return { jump: true, at: { x: next.x, z: zAt(next, 0.4) } }; }
    return { at: { x: cur.x, z: zNow(cur) } };
  }
})();
