/* Pip & Bo - Computer partner brain for 43-3 Claw Machine Rescue (mode 'arcadeclaw', 3D). */
'use strict';

(() => {
  /* 43-3 Claw Machine Rescue. A team level, so it always plays its best, and it plays its own job all level: Pip
     drives the claw on the rail, Bo climbs the toy pile on foot. It reads the map (ARCADECLAW_MAP) and the rules'
     helpers (ARCADECLAW: ringAt, ghostAt, nextOb, obDone...) the way a person reads the screen: the next thing in
     the way, the ring, the ghost's colour.
     PIP (the claw), for the next obstacle in route order:
       lift / bridge / weight   picks the toy up and sets it down where the map says (lift: on the wall top out of the
                    way; bridge: across the gap, where it snaps; weight: on the floor button). If the ghost there is
                    grey (Bo standing in the way, say) it tries spots close by, then waits.
       carry        waits by the duck while Bo takes the ribbon, then lifts Bo with it; if Bo has not come, it picks
                    the duck up and lowers the ribbon to Bo (an offer). Bo on: carries the pair over the ledge and sets
                    the duck down where Bo can step off.
       dig          lifts the toys off the buried capsule one at a time (the top one first) and sets each aside.
       sink         a Bo sinking in the beans: picks up the ring, lowers its ribbon to Bo and lifts Bo out and across.
       otherwise    parks the claw a little ahead of Bo and to the side (never right over Bo's head), so the ring is
                    ready for the next thing.
     BO (the climber), for the next obstacle:
       cap          walks to the capsule and holds the button until it pops (waits while toys still cover it).
       lever        walks to it and presses.
       lift / bridge / gate   waits at the map's waiting spot until a path opens (the toy moved, the bridge down,
                    the lid up), then walks on through.
       carry / sink takes a handle the claw holds out or the duck's ribbon on the ground and holds on until set down;
                    a sink with nobody helping, it wades across.
       weight       waits; the toy box's gold capsule once the lid is up.
     Paths are cpuNav3 over the pile (rebuilt when a toy, a lid or the gate moves). Talk (1-player only): short asks
     for the person's half of each job. */
  const hyp = Math.hypot;
  const MP = ARCADECLAW_MAP;
  const CO = () => ARCADECLAW;
  const B = { x0: -15.5, x1: 15.5, z0: -88, z1: 19 };
  const toy = (st, id) => st.toyById[id];
  // a short ask in a speech bubble (1-player only; each one rests a while once said)
  const say = (s, k, text, again = 9) => { if (s.solo && !(s.said[k] > s.t)) { s.said[k] = s.t + again; cpuSay(s.me, text, 1.8); } };

  /* ---------- Bo's legs ---------- */
  function navFor(s, st) {
    // (the toys and lids that are solid now: a moved toy or an opened lid changes the paths)
    const sig = st.solids.map(q => (q.ghost ? '0' : q.look === 'toy' ? Math.round(q.x * 2) + ',' + Math.round(q.z * 2) + ',' + Math.round(q.y1 * 2) : '1')).join('|');
    if (!s.nav || s.navSig !== sig) { s.nav = cpuNav3.build(st.w, Object.assign({ cell: 0.5, r: MOVER3.r, yMax: 30 }, B)); s.navSig = sig; s.path = null; }
    return s.nav;
  }
  const steer = (out, b, x, z, sp = 1) => { const k = cpuNav3.stick(x - b.x, z - b.z); out.ax = k.ax * sp; out.ay = k.ay * sp; };
  const floorY = (st, x, z, from) => MOVER3.floorAt(st.w, x, z, from, 0);
  // can Bo get there from here? (a path, or null)
  function pathTo(s, st, b, x, z, y) {
    const nav = navFor(s, st);
    const goal = { x, z, y: y != null ? y : floorY(st, x, z, b.y + 6) };
    return cpuNav3.path(nav, { x: b.x, y: b.y, z: b.z }, goal);
  }
  function walkTo(s, p, st, x, z, out, dt, sp = 1, y) {
    const b = p.b3, d = hyp(x - b.x, z - b.z);
    if (d < 0.3) return true;
    s.pathT = (s.pathT || 0) - dt;
    if (!s.path || s.pathT <= 0 || !s.goal || hyp(s.goal.x - x, s.goal.z - z) > 0.6) { s.path = pathTo(s, st, b, x, z, y); s.pathT = 1.0; s.goal = { x, z }; }
    if (s.path) cpuNav3.follow(p, s.path, out);
    // (the path is used up a little short of the goal: the last bit is a straight push)
    if (!s.path || out.done || !(out.ax || out.ay)) { out.done = false; steer(out, b, x, z, Math.max(0.5, Math.min(1, d / 1.2))); }
    out.ax *= sp; out.ay *= sp;
    // (stuck against something: a hop now and then)
    s.stuckT = hyp(b.vx || 0, b.vz || 0) < 0.25 ? (s.stuckT || 0) + dt : 0;
    if (s.stuckT > 0.9 && st.sink < 0.15) { out.jump = true; s.stuckT = 0; s.path = null; }
    return false;
  }

  /* ---------- Pip's claw ---------- */
  // push the stick toward rail spot (u, s); true once there and still
  function clawTo(out, C, u, s) {
    const dx = u - C.u, dz = C.s - s, d = hyp(dx, dz);
    if (d < 0.2 && hyp(C.vu, C.vs) < 0.8) return true;
    // (the stick has a dead zone of 0.2: never push softer than that)
    const k = cpuNav3.stick(dx, dz), sp = Math.max(0.3, Math.min(1, d / 1.6));
    out.ax = k.ax * sp; out.ay = k.ay * sp;
    return false;
  }
  // a ghost at another rail spot (the rules read the claw where it is, so the spot is tried and put back)
  function ghostIf(st, u, s) {
    const C = st.claw, ou = C.u, os = C.s;
    C.u = u; C.s = s; const g = CO().ghostAt(st); C.u = ou; C.s = os;
    return g;
  }
  // the spot near (u, s) where the held toy may be set down (the spot itself first, then rings round it)
  function setSpot(st, u, s) {
    const lim = (a, lo, hi) => Math.max(lo, Math.min(hi, a));
    const g0 = ghostIf(st, u, s); if (g0 && g0.ok) return [u, s];
    for (const r of [0.6, 1.2, 1.8]) for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2, uu = lim(u + Math.cos(a) * r, MP.rail.u0, MP.rail.u1), ss = s + Math.sin(a) * r;
      if (ss > st.lit - 0.4) continue;
      const g = ghostIf(st, uu, ss); if (g && g.ok) return [uu, ss];
    }
    return null;
  }
  // grab toy t: over it, then press
  function grabToy(s, out, st, t) {
    const C = st.claw;
    if (C.mode !== 'free') return;
    const there = clawTo(out, C, t.x, -t.z) || (hyp(C.u - t.x, C.s + t.z) < 0.5 && hyp(C.vu, C.vs) < 1.2);
    if (there && s.pressCd <= 0) {
      const hit = CO().toyAtRing(st);
      if (hit && hit.id === t.id) { out.act = 'tap'; s.pressCd = 0.5; }
    }
  }
  // set the held toy down near (u, s)
  function putToy(s, out, st, u, s0) {
    const C = st.claw;
    if (C.mode !== 'free') return;
    s.spotT = (s.spotT || 0) - 1 / 60;
    if (!s.spot || s.spotT <= 0 || hyp(s.spotFor[0] - u, s.spotFor[1] - s0) > 0.3) { s.spot = setSpot(st, u, s0); s.spotFor = [u, s0]; s.spotT = 0.5; }
    const [tu, ts] = s.spot || [u, s0];
    if (clawTo(out, C, tu, ts) && s.pressCd <= 0) {
      const g = st.ghost || CO().ghostAt(st);
      if (g && g.ok) { out.act = 'tap'; s.pressCd = 0.6; s.spot = null; }
      else if (g && g.why === 'bo') say(s, 'aside', 'Step aside so I can put it down!');
    }
  }
  // the claw's resting spot: a little ahead of Bo and off to one side, inside the lit rail
  function park(out, st, b) {
    const C = st.claw, side = b.x > 2 ? -1 : 1;
    const u = Math.max(MP.rail.u0, Math.min(MP.rail.u1, b.x + side * 2.4)), sv = Math.min(st.lit - 0.6, -b.z + 2.5);
    clawTo(out, C, u, sv);
  }

  function pipThink(s, p, st, out, dt, solo) {
    const C = st.claw, b = G.players[1].b3, next = CO().nextOb(st);
    // the claw's next job: the first one not done (Bo's own jobs, a capsule or a lever, it leaves to Bo and looks past,
    // so a person who skips a capsule never leaves the claw waiting on it)
    const PIPJOB = { lift: 1, bridge: 1, carry: 1, dig: 1, sink: 1, weight: 1 };
    const ob = MP.obstacles.find(o => PIPJOB[o.kind] && !CO().obDone(st, o) && o.s < -b.z + 18) || null;
    const sayIt = (k, text, again) => say(s, k, text, again);
    const held = C.toy && toy(st, C.toy);
    if (next && next.kind === 'lever') sayIt('lever', 'Pull the lever! It lights the rail.', 12);
    if (next && next.kind === 'cap') sayIt('cap', 'Open the capsule!', 14);
    if (!ob) { if (held) putToy(s, out, st, C.u, C.s); else park(out, st, b); return; }
    const k = ob.kind;
    // a toy held that this obstacle does not want: put it down here (out of the way)
    const wantIds = ob.toy ? [ob.toy] : ob.toys || [];
    if (held && !wantIds.includes(held.id) && !(k === 'sink' && held.id === 'ring1')) { putToy(s, out, st, C.u, C.s); return; }
    if (k === 'lift' || k === 'bridge' || k === 'weight') {
      const t = toy(st, ob.toy), [px, pz] = ob.put;
      const atPut = !t.held && hyp(t.x - px, t.z - pz) < 0.9;
      if (atPut) { if (k === 'weight') sayIt('box', 'The lid is up!'); park(out, st, b); return; }
      if (!t.held) { if (-t.z > st.lit - 0.35) { park(out, st, b); return; } grabToy(s, out, st, t); return; }
      putToy(s, out, st, px, -pz);
      return;
    }
    if (k === 'carry') {
      const t = toy(st, ob.toy), h = CO().handleAt(t), [px, pz] = ob.put;
      if (st.hang === t.id && t.held) {
        // Bo on: over the ledge, and down where Bo can step off
        if (C.mode === 'free') putToy(s, out, st, px, -pz);
        return;
      }
      if (!t.held) {
        if (-t.z > st.lit - 0.35) { park(out, st, b); return; }
        // Bo holding the ribbon: up we go
        if (st.hang === t.id) { grabToy(s, out, st, t); return; }
        // Bo coming: wait over the duck a moment
        s.duckWait = hyp(h.x - b.x, h.z - b.z) < 3.5 ? (s.duckWait || 0) + dt : 0;
        if (s.duckWait < 3.5 && hyp(h.x - b.x, h.z - b.z) < 3.5) { clawTo(out, C, t.x, -t.z); sayIt('ribbon', 'Hold the ribbon!'); return; }
        grabToy(s, out, st, t); return;
      }
      // the duck in the claw, Bo not on: hold the ribbon out to Bo
      if (C.mode === 'free' && clawTo(out, C, b.x, -b.z) && s.pressCd <= 0) { out.act = 'tap'; s.pressCd = 1.2; sayIt('ribbon', 'Hold the ribbon!'); }
      return;
    }
    if (k === 'dig') {
      const cap = st.caps.find(c => c.id === ob.cap);
      if (!CO().capCovered(st, cap)) { park(out, st, b); return; }
      // the top toy on the capsule first
      const on = ob.toys.map(id => toy(st, id)).filter(t => !t.held && CO().inFoot(t, cap.x, cap.z, 0.6)).sort((p1, p2) => p2.y + CO().dims(p2).h - p1.y - CO().dims(p1).h);
      if (held) {
        const i = ob.toys.indexOf(held.id), pt = ob.puts[i] || ob.puts[0];
        putToy(s, out, st, pt[0], -pt[1]); return;
      }
      if (on.length) grabToy(s, out, st, on[0]); else park(out, st, b);
      return;
    }
    if (k === 'sink') {
      const sk = MP.sinks.find(q => q.id === ob.sink), t = toy(st, ob.toy);
      const inSink = st.sink > 0.25 || (b.x > sk.x0 && b.x < sk.x1 && b.z < sk.z0 && b.z > sk.z1);
      if (st.hang === t.id && t.held) { if (C.mode === 'free') putToy(s, out, st, Math.max(sk.x0 + 1, Math.min(sk.x1 - 1, b.x)), -(sk.z1 - 2.2)); return; }
      if (!inSink && !held) { park(out, st, b); return; }
      if (!t.held) { if (st.hang === t.id) grabToy(s, out, st, t); else grabToy(s, out, st, t); return; }
      if (C.mode === 'free' && clawTo(out, C, b.x, -b.z) && s.pressCd <= 0) { out.act = 'tap'; s.pressCd = 1.2; sayIt('ring', 'Grab the ring!'); }
      return;
    }
    park(out, st, b);
  }

  /* ---------- Bo ---------- */
  function boThink(s, p, st, out, dt, solo) {
    const b = p.b3, C = st.claw, ob = CO().nextOb(st);
    const sayIt = (k, text, again) => say(s, k, text, again);
    // hanging on: hold on while it is carried, or while it waits on the ground for the claw to take us up; once it is
    // set down past the job, let go (holding on there would only take the ribbon again)
    if (st.hang) {
      const t = toy(st, st.hang);
      if (t.held || (ob && ob.toy === t.id)) { out.act = true; return; }
    }
    // a handle held out right here: take it
    if (C.toy && C.mode === 'offer') {
      const t = toy(st, C.toy), h = CO().handleAt(t);
      if (hyp(h.x - b.x, h.z - b.z) < 1.2) { out.act = true; return; }
    }
    // standing where the claw wants to set its toy down: step aside
    if (C.toy && st.ghost && !st.ghost.ok && st.ghost.why === 'bo' && C.mode === 'free') {
      const g = st.ghost, away = b.x >= g.x ? 1 : -1;
      walkTo(s, p, st, g.x + away * 3.2, b.z, out, dt);
      return;
    }
    // inside the toy box with nothing left to do in it: out through the front first (the map of the pile sees the box's
    // roof, not its floor, so paths from inside are not found)
    const lid = MP.solids.find(q => q.id === 'tb-lid');
    const inBox = lid && b.y < 6 && Math.abs(b.x - lid.x) < 1.7 && b.z < lid.z && b.z > lid.z - 3.4;
    const gold = st.caps.find(c => c.def.gold && c.def.part === 0);
    if (inBox && (!ob || ob.kind !== 'cap' || ob.cap !== gold.id)) { steer(out, b, lid.x, lid.z + 1.3); return; }
    if (!ob) { walkTo(s, p, st, 0, -75.5, out, dt); return; }
    const k = ob.kind;
    // the capsules (a covered one waits for the claw)
    if (k === 'cap' || k === 'dig') {
      const cap = st.caps.find(c => c.id === ob.cap);
      if (CO().capCovered(st, cap)) { const w = ob.wait || [cap.x + 1.4, cap.z + 1.4]; walkTo(s, p, st, w[0], w[1], out, dt); sayIt('dig', 'Lift the toys off it!'); return; }
      if (k === 'cap' && cap.def.gold && st.btn.btn1 && !st.btn.btn1.down && !cap.open) { walkTo(s, p, st, 1.0, -60.5, out, dt); return; }
      const d = hyp(cap.x - b.x, cap.z - b.z);
      if (d < CO().S.CAP_R + MOVER3.r - 0.1 && b.y > cap.y - 0.5 && b.y < cap.y + 1.2) { out.act = true; return; }
      // stand just on our side of it
      const sx = cap.x + (b.x - cap.x) / Math.max(0.01, d) * 1.15, sz = cap.z + (b.z - cap.z) / Math.max(0.01, d) * 1.15;
      walkTo(s, p, st, sx, sz, out, dt, 1, cap.y);
      return;
    }
    if (k === 'lever') {
      const lv = MP.levers.find(l => l.id === ob.lever), d = hyp(lv.x - b.x, lv.z - b.z);
      if (d < CO().S.LEVER_R - 0.25 && Math.abs(lv.y - b.y) < 1.0) { out.act = 'tap'; return; }
      walkTo(s, p, st, lv.x + 0.8, lv.z + 0.4, out, dt, 1, lv.y);
      return;
    }
    if (k === 'carry' || k === 'sink') {
      const t = toy(st, ob.toy), h = CO().handleAt(t);
      if (k === 'sink') {
        // wade on across unless the ring is coming down for us
        const sk = MP.sinks.find(q => q.id === ob.sink);
        if (t.held && C.mode === 'offer') { walkTo(s, p, st, h.x, h.z, out, dt, 0.6); return; }
        walkTo(s, p, st, Math.max(sk.x0 + 1, Math.min(sk.x1 - 1, b.x)), sk.z1 - 1.6, out, dt);
        return;
      }
      if (!t.held) {
        // the duck's ribbon: stand at it and hold on
        const d = hyp(h.x - b.x, h.z - b.z);
        if (d < CO().S.HANG_R + MOVER3.r - 0.3 && b.y > h.y - 2.0 && b.y < h.y + 0.4) { out.act = true; return; }
        const ax = h.x + (h.x - t.x) * 0.35, az = h.z + (h.z - t.z) * 0.35;
        walkTo(s, p, st, ax, az, out, dt, 0.8);
        return;
      }
      // the duck is in the claw: wait where the ribbon can reach us
      walkTo(s, p, st, ob.wait[0] + 1.2, ob.wait[1], out, dt);
      return;
    }
    if (k === 'weight') { walkTo(s, p, st, ob.wait[0], ob.wait[1], out, dt); sayIt('robot', 'Put the robot on the button!'); return; }
    // lift, bridge, gate: on through once there is a way
    const goZ = (ob.pass != null ? ob.pass : -(ob.s + 2)) - 1.2;
    s.wayT = (s.wayT || 0) - dt;
    if (s.wayT <= 0) { s.way = !!pathTo(s, st, b, ob.wait ? ob.wait[0] : 0, goZ); s.wayT = 0.5; }
    if (s.way) { walkTo(s, p, st, ob.wait ? ob.wait[0] : 0, goZ, out, dt); return; }
    if (ob.wait) {
      walkTo(s, p, st, ob.wait[0], ob.wait[1], out, dt);
      if (k === 'lift') sayIt('lift', 'Lift that toy out of the way!');
      if (k === 'bridge') sayIt('bridge', 'Lay the snake across the gap!');
    } else walkTo(s, p, st, 0, -(ob.s - 3), out, dt);
  }

  cpuBrain('arcadeclaw', {
    reset(s) { s.said = {}; s.t = 0; s.pressCd = 0; s.nav = null; s.path = null; s.spot = null; s.spotFor = [0, 0]; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || st.phase !== 'play' || info.intro) return out;
      s.t = (s.t || 0) + dt; s.pressCd = (s.pressCd || 0) - dt; s.said = s.said || {};
      const solo = !info.partnerCpu;
      s.me = p; s.solo = solo;
      if (p.id === 0) pipThink(s, p, st, out, dt, solo); else boThink(s, p, st, out, dt, solo);
      return out;
    },
  });
})();
