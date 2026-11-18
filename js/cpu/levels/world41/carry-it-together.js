/* Pip & Bo - Computer partner brain for 41-1 Carry It Together (mode 'popcarry', 3D). */
'use strict';

(() => {
  /* 41-1 Carry It Together (MODES.popcarry): the two carry the Bookworm's pencil, one at each end, through four pages.
     The brain reads MODES.popcarry.plan(st): the pencil, who holds which end, the page's route (the line the pencil's
     middle follows), where each player is along it, the doors, the train, the seesaw, the ink and the dotted lines.
     PICKING AN END: it gives the person 2 s to choose, then takes the other end; if the person has not moved, it walks
       to the nearer end and waits there holding it. It never takes the end the person is walking toward. It walks there
       with cpuNav3 (round hedges, up stairs), and grabs within reach.
     CARRYING: each holder steers like a stick toward a point a little ahead of itself on the route, moved out to the
       outside of each corner near it (whoever is outside a corner swings wide: both ends hug the outer walls and the
       pencil sweeps over the inner corner). The holder further along leads; the leader stops when the pencil is pulled
       long (the person is not keeping up: it never tows them), the follower eases off when it is pushed short (it
       stays behind). A person who goes another way is followed; after 6 s off the route it says where to go.
     LINES: holding the point, it runs the point over the next dots of the line ahead (its body one hand ahead of them).
       Holding the eraser, it just keeps to the route, which keeps its end out of the point's way.
     DOORS AND THE TRAIN: it works out how long the pair needs to be fully through (from where the back holder is, at
       carrying speed) and stops short ("Wait…") unless the door stays open (or the train stays away) that long;
       then "Now!". THE SEESAW needs nothing: carried at the pencil's length, the follower steps on while the leader is
       still near the middle.
     AFTER A DROP: it walks back to an end and grabs it again. It never finishes without the person (it stands holding
       its end), never walks off an edge on purpose (paths and the route keep to floors), never shakes: the steering
       target moves smoothly along the route and is never closer than a step, so it does not reverse each tick. */
  const M = () => MODES.popcarry;
  const hyp = Math.hypot;
  function corners(R) {
    // every bend of the route: where it is (s), how sharp (0..1 of a right angle) and its inner side for each leg
    if (R._bends) return R._bends;
    const out = [];
    for (let i = 1; i < R.pts.length - 1; i++) {
      const a = R.pts[i - 1], b = R.pts[i], c = R.pts[i + 1];
      const d1 = [b[0] - a[0], b[1] - a[1]], d2 = [c[0] - b[0], c[1] - b[1]], l1 = hyp(...d1) || 1, l2 = hyp(...d2) || 1;
      const n1 = [-d1[1] / l1, d1[0] / l1], n2 = [-d2[1] / l2, d2[0] / l2];
      const turn = (d2[0] * n1[0] + d2[1] * n1[1]) / l2, ang = Math.acos(Math.max(-1, Math.min(1, (d1[0] * d2[0] + d1[1] * d2[1]) / (l1 * l2))));
      if (ang < 0.05) continue;
      const sg = Math.sign(turn) || 1;
      out.push({ s: R.cum[i], k: Math.min(1.3, ang / (Math.PI / 2)), out1: [-n1[0] * sg, -n1[1] * sg], out2: [-n2[0] * sg, -n2[1] * sg] });
    }
    return (R._bends = out);
  }
  // the steering point at route distance s: on the route, moved toward the outside of nearby bends
  // is there floor all along a straight walk from b to (x, z), with half a body to each side? (from half a body
  // out: a player standing right at a lip, half over it, still finds the way back in)
  function floorLine(w, b, x, z) {
    const dx = x - b.x, dz = z - b.z, l = hyp(dx, dz) || 1, nx = -dz / l * 0.3, nz = dx / l * 0.3;
    for (let t = Math.min(0.4, l); t <= l + 0.01; t += 0.25) {
      const px = b.x + dx / l * Math.min(t, l), pz = b.z + dz / l * Math.min(t, l);
      for (const [ox, oz] of [[0, 0], [nx, nz], [-nx, -nz]]) if (MOVER3.floorAt(w, px + ox, pz + oz, b.y + 0.3, 0) < b.y - 0.3) return false;
    }
    return true;
  }
  // can a body walk straight from b to (x, z)? (no drop over teeterDrop, no rise over a step, following ramps
  // gently up and down: the pocket beside a ramp's high side fails, the ramp's own foot passes)
  function walkLine(w, b, x, z) {
    const dx = x - b.x, dz = z - b.z, l = hyp(dx, dz) || 1;
    let y = b.y;
    for (let t = Math.min(0.4, l); t <= l + 0.01; t += 0.2) {
      const px = b.x + dx / l * Math.min(t, l), pz = b.z + dz / l * Math.min(t, l);
      const f = MOVER3.floorAt(w, px, pz, y + MOVER3.stepUp + 0.05, 0), top = MOVER3.floorAt(w, px, pz, y + 3, 0);
      if (f < y - MOVER3.teeterDrop || top > y + MOVER3.stepUp + 0.05) return false;
      y = f;
    }
    return true;
  }
  function target(R, s, wide, w) {
    const q = R.at(s);
    let ox = 0, oz = 0;
    for (const c of corners(R)) {
      const d = s - c.s;
      if (Math.abs(d) > 4.5) continue;
      const w = c.k * Math.max(0, 1 - Math.abs(d) / 4.5) * wide, o = d < 0 ? c.out1 : c.out2;
      ox += o[0] * w; oz += o[1] * w;
    }
    const ol = hyp(ox, oz), cap = wide;
    if (ol > cap) { ox *= cap / ol; oz *= cap / ol; }
    // never out over an edge: shrink the swing until there is floor all round a body there
    if (w && (ox || oz)) {
      const f0 = MOVER3.floorAt(w, q.x, q.z, 40, 0);
      const ok = (x, z) => [[0, 0], [0.55, 0], [-0.55, 0], [0, 0.55], [0, -0.55]].every(([dx, dz]) => MOVER3.floorAt(w, x + dx, z + dz, f0 + 0.3, 0) > f0 - 0.3);
      for (let k = 0; k < 10 && !ok(q.x + ox, q.z + oz); k++) { ox *= 0.75; oz *= 0.75; }
    }
    return { x: q.x + ox, z: q.z + oz, tx: q.tx, tz: q.tz };
  }
  // which way a player is pushing (world x, z, strength), as K3D.moveDir reads it, without touching its state
  function pushOf(p) {
    const i = p.input || {};
    let ax = i.ax || 0, ay = i.ay || 0;
    if (!ax && !ay) { ax = (i.right ? 1 : 0) - (i.left ? 1 : 0); ay = (i.down ? 1 : 0) - (i.up ? 1 : 0); }
    const l = hyp(ax, ay); if (l < 0.2) return { x: 0, z: 0, s: 0 };
    const c = Math.cos(K3D.heading), sn = Math.sin(K3D.heading), nx = ax / l, ny = ay / l;
    return { x: nx * c + ny * sn, z: -nx * sn + ny * c, s: Math.min(1, l) };
  }
  const steer = (out, b, x, z, sp = 1) => { const st = cpuNav3.stick(x - b.x, z - b.z); out.ax = st.ax * sp; out.ay = st.ay * sp; };
  // a door or the train: may the pair start through it now? (t: seconds the way stays clear from now on)
  function clearFor(pl, gate) {
    const pg = pl.pg;
    if (gate.kind === 'door') {
      const DT = pg.doorT, cyc = DT.open + DT.tick + DT.shut, D = pl.doors[gate.id];
      const t = (M().now() + gate.phase) % cyc;
      if (!D.open) return 0;
      return Math.max(0, DT.open + DT.tick - t) + (D.hold > 0 ? D.hold : 0);
    }
    // the train: clear until its front reaches the street's near side
    const T = pg.train, t = (M().now() + T.offset) % T.period, run = (T.x1 - T.x0 + T.len) / T.speed;
    const arrive = T.warn + Math.max(0, (gate.x - 2.2 - T.x0) / T.speed), gone = T.warn + Math.min(run, (gate.x + 2.2 + T.len - T.x0) / T.speed);
    if (t < arrive) return arrive - t;
    if (t < gone) return 0;
    return T.period - t + arrive;
  }
  function gates(pl) {
    if (pl._gates) return pl._gates;
    const pg = pl.pg, R = pl.R, out = [];
    for (const d of pg.doors || []) out.push({ kind: 'door', id: d.id, phase: d.phase, x: d.x, z: d.z, s: R.project(d.x, d.z) });
    if (pg.train) { const x = -6; out.push({ kind: 'train', x, z: pg.train.z, s: R.project(x, pg.train.z) }); }
    return (pl._gates = out);
  }

  cpuBrain('popcarry', {
    idleStop: 30,
    reset(s) { s.t = 0; s.nav = null; s.navSig = ''; s.path = null; s.pathT = 0; s.off = 0; s.wait = null; s.said = {}; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst;
      p.mvHold = null; // (steers for this moment's camera heading; see cpuNav3.stick)
      if (!st || !st.pg || info.intro) return out;
      const pl = M().plan(st);
      if (!pl || pl.busy) return out;
      s.t += dt;
      const id = p.id, b = p.b3, ob = o.b3, mine = pl.hold[id], theirs = pl.hold[o.id], solo = !info.partnerCpu;
      if (pl.away[id] || pl.sit[id] > 0) return out;
      const E = pl.ends;
      /* ---- not holding: go and take an end ---- */
      if (mine < 0) {
        if (pl.penAway) return out;
        let want = -1;
        if (theirs >= 0) want = 1 - theirs;
        else if (info.partnerCpu) want = (() => { const d0 = hyp(E[0].x - b.x, E[0].z - b.z), d1 = hyp(E[1].x - b.x, E[1].z - b.z), o0 = hyp(E[0].x - ob.x, E[0].z - ob.z), o1 = hyp(E[1].x - ob.x, E[1].z - ob.z); return d0 + o1 <= d1 + o0 ? (id === 0 || d0 + o1 < d1 + o0 ? 0 : 1) : 1; })();
        else {
          // the person's choice first: 2 s to pick, and never the end they are walking toward
          const moving = hyp(ob.vx, ob.vz) > 0.8;
          if (s.t < 2 && (moving || info.partnerIdle < 0.5)) return out;
          if (moving) {
            const toward = e => ((E[e].x - ob.x) * ob.vx + (E[e].z - ob.z) * ob.vz) / (hyp(E[e].x - ob.x, E[e].z - ob.z) || 1);
            want = toward(0) > toward(1) ? 1 : 0;
          } else want = hyp(E[0].x - b.x, E[0].z - b.z) <= hyp(E[1].x - b.x, E[1].z - b.z) ? 0 : 1;
        }
        // where to stand: just outside that end, in line with the pencil
        const e = E[want], ux = e.x - pl.pen.x, uz = e.z - pl.pen.z, ul = hyp(ux, uz) || 1;
        const gx = e.x + ux / ul * pl.endIn, gz = e.z + uz / ul * pl.endIn;
        const dEnd = hyp(e.x - b.x, e.z - b.z);
        // (one press, then a pause: a press that lands late must not be followed by a second that lets go again)
        // (pressed from just outside the end, where a holder stands: the pencil does not have to slide to the hand)
        if (dEnd < pl.grab + pl.endIn - 0.1 && hyp(gx - b.x, gz - b.z) < 0.7 && b.ground) { if (!(s.tapT > s.t)) { out.act = 'tap'; s.tapT = s.t + 1.4; } return out; }
        this.walkTo(s, p, st, gx, gz, out, dt);
        return out;
      }
      /* ---- holding, the partner not: wait at this end ---- */
      if (theirs < 0) {
        if (solo && s.t > 3 && !pl.away[o.id]) cpuSay(p, 'Grab the other end!', 2);
        return out;
      }
      /* ---- carrying ---- */
      const R = pl.R, sMe = pl.ps[id], sO = pl.ps[o.id], lead = sMe > sO || (sMe === sO && mine === 1);
      const dist = hyp(ob.x - b.x, ob.z - b.z);
      const onTower = pl.pg.tower && pl.s > pl.towerS - 3;
      const narrowO = ob.on && /bridge|plank|seesaw/.test(ob.on.kind);
      // (single file: only the follower swings wide; the leader keeps to the middle of a narrow way)
      const wide = onTower ? 0.75 : pl.pg.single && lead ? 0 : pl.pg.wide != null ? pl.pg.wide : 0.95;
      // (the leader steers for a pencil's length past the follower along the route: after it has walked on past a bend,
      // that turns it toward the way on instead of back)
      // (near the route's start the follower aims a pencil's length behind the leader, so it swings round behind them
      // when the pencil was picked up crosswise in the plaza)
      const fs = (sO - pl.gap < 0 ? Math.min(sMe, sO - pl.gap) : sMe) + 1.3, q0 = R.at(0);
      let tg = lead ? target(R, Math.max(sMe, sO + pl.gap - 0.3) + 1.3, wide, st.w) : fs >= 0 ? target(R, fs, wide, st.w) : { x: q0.x + q0.tx * fs, z: q0.z + q0.tz * fs }, sp = 1;
      if (onTower) {
        // round the tower: keep to the outer part of the ramp at one radius (the pencil's middle stays off the wall)
        const T = pl.pg.tower, a = Math.atan2(b.z - T.z, b.x - T.x), da = T.dir * 0.28, r = T.rMid + 0.62;
        tg = { x: T.x + Math.cos(a + da) * r, z: T.z + Math.sin(a + da) * r };
        // (on the ground outside the railing, gone round past the ramp's foot: back to the foot first)
        if (b.y < 0.4 && hyp(b.x - T.x, b.z - T.z) > T.rOut) { const q = R.at(Math.max(0, pl.towerS - 1.5)); tg = { x: q.x, z: q.z }; }
      }
      // a dotted line ahead and I have the point: run it over the dots
      if (mine === 1) {
        const next = l => l.dots[Math.min(l.n, l.dots.length - 1)];
        const L = pl.lines.find(l => !l.done && hyp(next(l)[0] - E[1].x, next(l)[1] - E[1].z) < 8 && Math.abs(R.project(next(l)[0], next(l)[1], sMe, 12) - sMe) < 9);
        if (L && lead && !(pl.pg.single && narrowO)) {
          // put the point on the next dot but one: my hand is half a unit past the point, along the pencil
          const d = L.dots[Math.min(L.n + 1, L.dots.length - 1)], ux = Math.cos(pl.pen.a), uz = Math.sin(pl.pen.a);
          tg = { x: d[0] + ux * pl.endIn, z: d[1] + uz * pl.endIn };
          s.tracing = true;
          // (drawing carefully: slower near the dot, so even slow hands stay on the line)
          sp = Math.max(0.22, Math.min(1, hyp(tg.x - b.x, tg.z - b.z) / 5));
          if (solo && L.n === 0) cpuSay(p, 'I\'ll draw it!', 1.6);
        } else s.tracing = false;
      }
      // single file (bridges with open edges): at a bend the leader walks on straight past it, as far as the floor
      // goes, until the follower has come off the bridge behind; then turns
      if (lead && pl.pg.single && !s.tracing) {
        for (const c of corners(R)) {
          if (sMe < c.s - 0.6 || sMe > c.s + 7 || !(narrowO || sO < c.s - 6.5)) continue;
          const v = R.at(c.s - 0.01), y = b.y;
          let reach = 0;
          for (let k = 0.25; k <= 6; k += 0.25) { const x = v.x + v.tx * k, z = v.z + v.tz * k; let ok = true; for (const [ox, oz] of [[0, 0], [v.tx * 0.75, v.tz * 0.75], [v.tz * 0.6, -v.tx * 0.6], [-v.tz * 0.6, v.tx * 0.6]]) if (MOVER3.floorAt(st.w, x + ox, z + oz, y + 0.3, 0) < y - 0.3) ok = false; if (!ok) break; reach = k; }
          if (reach > 0.3) tg = { x: v.x + v.tx * reach, z: v.z + v.tz * reach };
          break;
        }
      }
      // single file: never cut a corner over the water (the furthest point ahead on the route that a straight walk
      // reaches on floor all the way)
      if (lead && pl.pg.single && !s.tracing && !onTower && hyp(tg.x - b.x, tg.z - b.z) > 0.3 && !floorLine(st.w, b, tg.x, tg.z)) {
        let found = false;
        for (let k = 1.3; k >= 0; k -= 0.1) { const q = R.at(sMe + k); if (floorLine(st.w, b, q.x, q.z)) { tg = q; found = true; break; } }
        // (nothing straight ahead on floor: back to the route's middle line first)
        if (!found) tg = R.at(Math.max(0, sMe - 0.5));
      }
      if (lead) {
        // never tow: a pencil pulled long means the partner is not keeping up
        if (dist > pl.gap + 0.14) sp = 0;
        // the partner held up 2 s behind me off the route (caught beside a ramp, on the wrong side of a rise): come back down the
        // route toward them for a moment, so they have room to go round
        const oOff = (() => { const q = R.at(sO); return hyp(q.x - ob.x, q.z - ob.z); })();
        if (s.oS == null || sO > s.oS + 0.3 || oOff < 1.3 || s.waited) { s.oS = sO; s.oT = 0; } else s.oT += dt;
        if (s.oT > 2 && !s.tracing && !onTower) { s.backUp = s.t + 2; s.oT = 0; }
        if (s.backUp > s.t && !onTower) { tg = target(R, Math.max(0, sO + pl.gap * 0.6), wide, st.w); sp = 0.7; }
        // doors and the train
        for (const g of gates(pl)) {
          const back = Math.min(sMe, sO), front = Math.max(sMe, sO);
          if (back > g.s + 0.7 || front < g.s - 4) continue;
          const committed = front > g.s - 0.9;
          // (time for the back holder to clear it, at the pair's real pace round the corners, plus a margin)
          const need = (g.s + 1.0 - back) / 4.4 + 0.5;
          const left = clearFor(pl, g);
          if (!committed && left < need) {
            sp = Math.min(sp, front < g.s - 1.4 ? 1 : 0);
            if (front >= g.s - 1.6) { sp = 0; if (solo) cpuSay(p, 'Wait…', 1.2); s.waited = true; }
          } else if (committed && left <= 0.05 && back < g.s - 0.9 && !s.waited) { /* (caught: keep going, through is closest) */ }
          else if (s.waited && solo) { cpuSay(p, 'Now!', 1.2); s.waited = false; }
        }
      } else {
        // follow: step back when pushed short (the leader is backing up to a line), ease off near the length
        // (keeps about a pencil's length behind the leader along the route: when the leader backs up to a line, it backs up)
        const behind = sO - sMe, od = pushOf(o), back = (od.x * (b.x - ob.x) + od.z * (b.z - ob.z)) / (dist || 1);
        if (back > 0.8 && od.s > 0 && floorLine(st.w, b, b.x + od.x * 1.2, b.z + od.z * 1.2)) {
          // the leader is backing up into me (to a line it went past): back up the same way, as one
          tg = { x: b.x + od.x * 2, z: b.z + od.z * 2 }; sp = Math.min(1, Math.max(0.3, od.s + (pl.gap - dist) * 2));
        } else if (dist < pl.gap - 0.07 || back > 0.8) { tg = target(R, sMe - 1.6, wide, st.w); sp = Math.min(1, Math.max(0.35, (pl.gap - dist) * 3 + back * 0.6)); }
        else if (dist < pl.gap + 0.05 && !od.s) sp = 0; // (the leader stands still on purpose: never shove them on)
        // (the leader has the point on a dotted line and is working back toward me: let them draw; only come along
        // when the pencil pulls)
        else if (mine === 0 && back > 0.2 && pl.lines.some(l => !l.done && hyp(l.dots[l.n][0] - E[1].x, l.dots[l.n][1] - E[1].z) < 2.5)) sp = dist > pl.gap + 0.02 ? 0.5 : 0;
        else if (behind < pl.gap + 0.25 && dist < pl.gap + 0.02) sp = 0.6;
        // the leader is a person going another way: follow them; after 6 s off the route, say where to go
        const off = Math.abs(sO - sMe) > 9 || (dist > 3 && (() => { const q = R.at(sO); return hyp(q.x - ob.x, q.z - ob.z) > 4.5; })());
        s.off = off ? s.off + dt : 0;
        if (off) { tg = { x: ob.x, z: ob.z }; if (s.off > 6 && solo) cpuSay(p, sO < sMe ? 'This way!' : 'Along the path!', 1.8); }
      }
      // corners: who swings wide (once, in 1-player)
      if (solo && !onTower) for (const c of corners(R)) if (c.k > 0.8 && sMe > c.s - 5 && sMe < c.s - 3 && !s.said[c.s]) { s.said[c.s] = 1; cpuSay(p, lead ? 'I\'ll swing wide!' : 'Swing wide!', 1.5); }
      // the follower: never steer into the high side of a ramp or rise (back along the route to a point it can walk
      // straight to)
      if (!lead && !onTower && sp > 0 && !walkLine(st.w, b, tg.x, tg.z)) {
        let found = false;
        for (let k = 1.0; k >= -3; k -= 0.25) { const q = R.at(Math.max(0, sMe + k)); if (walkLine(st.w, b, q.x, q.z)) { tg = q; found = true; break; } }
        // (none: a floor-grid path round to the route ahead)
        if (!found) { const q = R.at(sMe + 1.3); this.walkTo(s, p, st, q.x, q.z, out, dt); return out; }
      }
      // wedged (pushing, not moving, the pencil not pulling: in a pocket beside a ramp or a rise): find the way on
      // round it (a floor-grid path to the route a little ahead) for a moment, then steer as usual again
      // (by how far the body really went: a wall or the pencil can cancel a move that the speed still shows)
      const moving = s.px != null && hyp(b.x - s.px, b.z - s.pz) > 0.35 * dt; s.px = b.x; s.pz = b.z;
      s.wedgeT = sp > 0.3 && !moving && !s.tracing && !(lead && s.backUp > s.t) ? (s.wedgeT || 0) + dt : 0;
      if (s.wedgeT > 0.7) { s.unwedge = s.t + 1.6; s.wedgeT = 0; s.path = null; }
      if (s.unwedge > s.t && !onTower && !(lead && s.backUp > s.t)) { const q = R.at(sMe + 1.3); this.walkTo(s, p, st, q.x, q.z, out, dt); return out; }
      if (sp > 0) steer(out, b, tg.x, tg.z, sp);
      return out;
    },
    // walking somewhere hands-free: straight when clear, else a cpuNav3 path (rebuilt when the page changes shape; a
    // search that found nothing waits its 1.5 s like any other before it is tried again: searches are not cheap)
    walkTo(s, p, st, x, z, out, dt) {
      const b = p.b3;
      const sig = st.k + '|' + st.solids.map(q => (q.ghost ? 0 : 1)).join('');
      if (!s.nav || s.navSig !== sig) { s.nav = cpuNav3.build(st.w, { x0: -34, z0: -21, x1: 34, z1: 21, cell: 0.5, yMax: 12 }); s.navSig = sig; s.path = null; }
      const goal = { x, z, y: MOVER3.floorAt(st.w, x, z, b.y + 1.5, 0) };
      if (goal.y < b.y - 0.9) return; // (nothing to stand on there: wait)
      const direct = hyp(x - b.x, z - b.z) < 1.2 || cpuNav3.clear(s.nav, { x: b.x, z: b.z, y: b.y }, goal);
      // (slowing in over the last few steps: arrives without overshooting, even with slow hands)
      // (pushing into a ledge the map thinks is flat, e.g. off the tipped seesaw: hop up it)
      const low = goal.y > b.y + MOVER3.stepUp + 0.1 && b.ground && hyp(b.vx, b.vz) < 0.4;
      s.ledgeT = low ? (s.ledgeT || 0) + dt : 0;
      if (s.ledgeT > 0.4) { out.jump = true; if (s.ledgeT > 0.9) s.ledgeT = 0; }
      if (direct) { steer(out, b, x, z, Math.max(0.22, Math.min(1, hyp(x - b.x, z - b.z) / 8))); s.path = null; return; }
      s.pathT -= dt;
      if ((!s.path && !(s.pathT > 0)) || s.pathT <= 0 || !s.goal || hyp(s.goal.x - x, s.goal.z - z) > 0.8) { s.path = cpuNav3.path(s.nav, { x: b.x, y: b.y, z: b.z }, goal); s.pathT = 1.5; s.goal = { x, z }; }
      if (s.path) cpuNav3.follow(p, s.path, out); else steer(out, b, x, z);
      // (slow over the last steps on a path too)
      const dd = hyp(x - b.x, z - b.z); if (dd < 4 && !out.jump) { const k = Math.max(0.3, dd / 6); out.ax = (out.ax || 0) * k; out.ay = (out.ay || 0) * k; }
    },
  });
})();
