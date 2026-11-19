/* Pip & Bo - Computer partner brain for 42-3 Spook Manor (mode 'parkmanor', 3D, on foot). */
'use strict';

(() => {
  /* 42-3 Spook Manor. It always plays its best (a team level) and plays its own job all level: Pip the lantern, Bo the
     key. It reads the house (PARKMANOR_HOUSE), the spooks' states and the light the way a person sees them on screen.
     The plan, first that applies each step:
       STIFF        it can do nothing (the person has to bring it round).
       PARTNER STIFF  it goes to stand beside them (bringing them round), unless a moving spook is a step away.
       BUTLER       on a hunting visit it says "Hide!" and goes to the visit's hiding place, waits inside for the
                    person, comes back out for them once if they do not come, then hides; it leaves the hiding place
                    only once he has gone.
       PIP (lantern)  any spook awake within sight: it turns the beam on the one nearest Bo, and once Bo is unwinding
                    it holds the beam on that spook and never sweeps away mid-hold. Turning only (a gentle push) while
                    it shines, so it never walks off. It aims at most about twice a second. Nothing awake: it walks the
                    tour (H.route below) a step ahead of Bo, waits for Bo when more than a few steps apart, and sweeps
                    the beam over hidden wisps it passes.
       BO (key)     a frozen spook in reach of a lit route: it walks to it and holds the key until it sags. A moving one
                    it keeps away from (stays in the circle). The tour's locked doors and winders as the pair arrive.
                    Otherwise it walks beside Pip in the light. It says "Shine it here!" when a spook is close and
                    unlit, and "Hold it still!" if the light leaves the spook it is unwinding.
     With a person partner it never walks into the dark alone (it waits for the lantern), never blocks a doorway (it
     steps out of the line between the person and the next room), and stops helping after CPU.idleStop s with no
     presses from the person. Steering is cpuNav3 paths over the house (rebuilt when a door opens or shuts). */
  const hyp = Math.hypot;
  const H = PARKMANOR_HOUSE;
  /* The tour, floor by floor (the rides join the floors). A point may carry a job, and the pair do not pass it until
     the job is done:
       door   (with wait: where Pip waits, key: where Bo stands) a key door Bo opens, or a door that opens by itself
       wind   Bo winds that winder (key: where Bo stands); a ride's winder is done once the ride is ready
       ride   both step in together (the rules start the ride)
       boss   Grimsby at the exit
       pick   the porch: the lantern and the key */
  const ROUTE = [
    { x: 0, z: 27 }, { x: 0, z: 19 }, { x: 0, z: 10.5 },
    { x: 0, z: 7.3, pick: true },
    { x: 0, z: 4.6 }, { x: -1.5, z: 1.4 }, { x: 0, z: -1.5, hall: true },
    { x: 5.8, z: -4.5, door: 'hallLock', wait: [4.3, -3.3], key: [7.3, -4.5] }, { x: 10.6, z: -4.5 }, { x: 15, z: -4.5 }, { x: 20, z: -4.5 }, { x: 25.5, z: -4.5 },
    { x: 28.6, z: -4.5, door: 'corEndDoor', wait: [27.6, -3.6] },
    // stretch 2: the passage, round the table's east end, west along the north lane (the chairs), the kitchen
    { x: 31.8, z: -4.6 }, { x: 31.8, z: -9.5 }, { x: 31.8, z: -14.6 }, { x: 31.8, z: -17.8 }, { x: 37.5, z: -19.6 }, { x: 37.5, z: -23 },
    { x: 37.3, z: -27.1 }, { x: 33.2, z: -27.3 }, { x: 28.4, z: -27.3 }, { x: 24.4, z: -27.3 }, { x: 19.6, z: -27.3 }, { x: 16.6, z: -27.5 },
    { x: 15.6, z: -27.5, door: 'kitDoor', wait: [17.2, -26.8] },
    { x: 12.4, z: -27.2 }, { x: 11.6, z: -20.4 }, { x: 6, z: -19.4 }, { x: 0, z: -19.6 }, { x: -3.6, z: -21.6 },
    { x: -3.4, z: -23.4, wind: 'dumbCrank', key: [-4.1, -24.6] },
    { x: -5.0, z: -22.6, ride: 'dumb' },
    // stretch 3: the gallery, the library (round the shelves), the nursery (the music box), the bedroom
    { x: -3.4, z: -45.0 }, { x: 2, z: -44.8 }, { x: 7.5, z: -44.6 }, { x: 12.6, z: -44.8 },
    { x: 14.8, z: -45, door: 'libDoor', wait: [13.6, -44.2] },
    { x: 17.8, z: -45 }, { x: 22, z: -45.6 }, { x: 28.8, z: -46.4 }, { x: 29.6, z: -52.2 }, { x: 31.2, z: -55 },
    { x: 32.4, z: -55, door: 'nurDoor', wait: [31, -53.8], key: [32.8, -55] },
    { x: 35.8, z: -55 }, { x: 40.4, z: -56.4, wind: 'musicbox', key: [41.6, -57.5] },
    { x: 44, z: -50.6, door: 'bedDoor', wait: [43, -51.4] },
    { x: 44, z: -46.6 }, { x: 45.4, z: -41.2 },
    { x: 46.6, z: -41, door: 'wardDoor', wait: [45.2, -42.2], key: [47, -41] },
    { x: 49.6, z: -41 }, { x: 53.2, z: -41 },
    // stretch 4: the attic (the great clock, the trapdoor), the ballroom, Grimsby, out
    { x: 56.6, z: -41 }, { x: 59.8, z: -44.4 }, { x: 64.2, z: -48.2 }, { x: 68.6, z: -56.2, wind: 'greatClock', key: [70.6, -58.0] },
    { x: 64, z: -52, ride: 'slide' },
    { x: 1.4, z: -77.4 }, { x: 6.4, z: -81.6 }, { x: 12, z: -86 }, { x: 19.6, z: -89.6 }, { x: 25.8, z: -93.6 }, { x: 27.4, z: -95.6 },
    { x: 20, z: -97.4, boss: true },
    { x: 12, z: -103.6 }, { x: 12, z: -108 }, { x: 12, z: -112 },
  ];
  const regOf = (x, z) => { for (const id in H.regions) { const r = H.regions[id]; if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return id; } return 'ground'; };
  ROUTE.forEach(r => { r.reg = regOf(r.x, r.z); });
  const winder = id => H.winders.find(w => w.id === id);
  PARKMANOR.tour = ROUTE; // (read by tools/w42/manor-stuck.js: its scripted people walk the same tour with their own rules)
  // is a route point's job done?
  function jobDone(st, r) {
    if (r.door) return st.doors[r.door].open;
    if (r.wind) {
      const w = winder(r.wind);
      if (w.ride) return !!st.rideReady[w.ride];
      if (w.kind === 'musicbox') return !!st.fired.musicDone || st.wound.some(x => x.def === w);
      return st.wound.some(x => x.def === w);
    }
    if (r.ride) return false;
    if (r.boss) return !!st.fired.bossDone;
    return true;
  }
  const steer = (out, b, x, z, sp = 1) => { const s = cpuNav3.stick(x - b.x, z - b.z); out.ax = s.ax * sp; out.ay = s.ay * sp; };
  // one map per floor, rebuilt when a door opens or shuts (the dining chairs are left out: the light moves them)
  function navFor(s, st, reg) {
    const sig = st.solids.map(q => (q.kind === 'chair' ? '' : q.ghost ? 0 : 1)).join('');
    s.navs = s.navs || {};
    let n = s.navs[reg];
    if (!n || n.sig !== sig) {
      const R = H.regions[reg], keep = st.chairs.map(c => c.s.ghost);
      st.chairs.forEach(c => { c.s.ghost = true; });
      n = cpuNav3.build(st.w, { x0: R.x0, z0: R.z0, x1: R.x1, z1: R.z1, cell: 0.5, yMax: 6 });
      st.chairs.forEach((c, i) => { c.s.ghost = keep[i]; });
      n.sig = sig; s.navs[reg] = n; s.path = null;
    }
    return n;
  }
  function walkTo(s, p, st, x, z, out, dt, sp = 1) {
    const b = p.b3;
    const nav = navFor(s, st, regOf(b.x, b.z));
    const d = hyp(x - b.x, z - b.z);
    if (d < 0.35) return true;
    // (a goal beside the partner is on the partner's floor. Guessing it from Pip's own height put a Bo standing stiff up
    // in the attic "under" the attic floor: no path, and Pip pushed at the nursery wall below for ever.)
    const o3 = G.players[1 - p.id].b3, byO = o3 && Math.abs(x - o3.x) < 1.5 && Math.abs(z - o3.z) < 1.5;
    const goal = { x, z, y: byO ? o3.y : MOVER3.floorAt(st.w, x, z, b.y + 1.5, 0) };
    const direct = d < 1.2 || cpuNav3.clear(nav, { x: b.x, z: b.z, y: b.y }, goal);
    if (direct) { steer(out, b, x, z, Math.max(0.55, Math.min(sp, d / 2))); s.path = null; }
    else {
      s.pathT = (s.pathT || 0) - dt;
      if (!s.path || s.pathT <= 0 || !s.goal || hyp(s.goal.x - x, s.goal.z - z) > 0.8) { s.path = cpuNav3.path(nav, { x: b.x, y: b.y, z: b.z }, goal); s.pathT = 1.2; s.goal = { x, z }; }
      if (s.path) { cpuNav3.follow(p, s.path, out); out.ax *= sp; out.ay *= sp; } else steer(out, b, x, z, sp);
    }
    // (stuck against something: a hop now and then)
    s.stuckT = hyp(b.vx, b.vz) < 0.3 ? (s.stuckT || 0) + dt : 0;
    if (s.stuckT > 0.8) { out.jump = true; s.stuckT = 0; s.path = null; }
    return false;
  }
  // how far along the tour a point is (the nearest route point on its floor, or the next one once past it)
  function routeAt(x, z) {
    const reg = regOf(x, z);
    let best = 0, bd = 1e9;
    ROUTE.forEach((r, i) => { if (r.reg !== reg) return; const d = hyp(r.x - x, r.z - z); if (d < bd) { bd = d; best = i; } });
    const n = ROUTE[best + 1];
    if (n && n.reg === reg) { const a = ROUTE[best], vx = n.x - a.x, vz = n.z - a.z, t = ((x - a.x) * vx + (z - a.z) * vz) / (vx * vx + vz * vz); if (t > 0.05) best++; }
    return best;
  }
  const awake = sp => sp.state === 'move' || sp.state === 'wake' || sp.state === 'frozen' || sp.state === 'back';
  const bossOn = st => st.boss && (st.boss.state === 'fight' || st.boss.state === 'shrug' || st.boss.state === 'talk');
  // a point in the ballroom, kept off its walls
  const inBall = (x, z) => [Math.max(-4.6, Math.min(28.6, x)), Math.max(-102.6, Math.min(-73.4, z))];

  cpuBrain('parkmanor', {
    // (its own idle stop, below: a person who is stiff, hidden or riding cannot press anything, and must not count as
    // having walked away. The shared stop left a person stiff for 30 s with nobody coming.)
    noIdleStop: true,
    reset(s) { s.skip = {}; s.holdT = 0; s.holdAt = null; s.ri = null; s.lowT = 0; s.said = {}; s.aimAt = null; s.aimT = 0; s.r = 0; s.fetch = 0; s.hideWait = 0; s.aims = []; s.navs = null; s.path = null; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst;
      s.skip = s.skip || {};
      if (!st || st.phase !== 'play' || info.intro || st.ride) return out;
      s.t = (s.t || 0) + dt;
      const me = p.b3, pb = o.b3, id = p.id, solo = !info.partnerCpu;
      const say = (k, text, again = 8) => { if (solo && !(s.said[k] > s.t)) { s.said[k] = s.t + again; cpuSay(p, text, 1.8); } };
      if (st.stiff[id] > 0) return out;
      if (!solo || !(info.partnerIdle > 0)) s.idleT = 0; else if (st.stiff[1 - id] <= 0 && !st.hidden) s.idleT = (s.idleT || 0) + dt;
      if (s.idleT > CPU.idleStop && st.stiff[1 - id] <= 0) return out;
      // hidden: stay put until the Butler's visit is over
      if (st.hidden) {
        if (st.butler.state === 'off') { s.hideWait += dt; if (s.hideWait > 0.8) { const hd = H.hides.find(h => h.id === st.hidden); steer(out, me, me.x + Math.sin(hd.face) * 3, me.z + Math.cos(hd.face) * 3); } }
        else s.hideWait = 0;
        return out;
      }
      // the partner is stiff: go and bring them round
      if (st.stiff[1 - id] > 0) {
        const danger = st.spooks.some(sp => sp.state === 'move' && hyp(sp.x - me.x, sp.z - me.z) < 1.2);
        if (!danger) { walkTo(s, p, st, pb.x, pb.z, out, dt); if (hyp(pb.x - me.x, pb.z - me.z) < 0.9) { out.ax = 0; out.ay = 0; } if (id === 0 && st.hasLantern) out.act = false; return out; }
      }
      // the Butler hunting: hide (the hiding place nearest the pair, the same one for both)
      const B = st.butler, v = B.visit >= 0 ? H.butler[B.visit] : null;
      if (v && v.kind === 'hunt' && B.state !== 'off') {
        const mx = (me.x + pb.x) / 2, mz = (me.z + pb.z) / 2;
        let hd = null, hdD = 1e9;
        for (const hid of [].concat(v.hide)) { const h = H.hides.find(q => q.id === hid), c = h.enter || [h.x, h.z], d = hyp(c[0] - mx, c[1] - mz); if (d < hdD) { hdD = d; hd = h; } }
        const c = hd.enter || [hd.x, hd.z];
        say('hide' + B.visit, 'Hide!', 30);
        // (well inside, and it stays "inside" until well out again: on the rim of the hiding place it used to flip
        // between going in and coming out for the person many times a second)
        const dC = hyp(c[0] - me.x, c[1] - me.z);
        if (dC < hd.r * 0.75) s.inHide = true; else if (dC > hd.r + 0.5) s.inHide = false;
        const sx = Math.cos(hd.face) * (id ? 0.3 : -0.3), sz = -Math.sin(hd.face) * (id ? 0.3 : -0.3);
        // out once to fetch a person who has not come (a few steps toward them, calling), then back in
        if (s.fetch > 0) { s.fetch -= dt; say('come', 'In here, quick!', 6); if (hyp(pb.x - me.x, pb.z - me.z) > 1.3 && dC < hd.r + 2.2) walkTo(s, p, st, pb.x, pb.z, out, dt); return out; }
        if (!s.inHide || !solo) { walkTo(s, p, st, c[0] + sx, c[1] + sz, out, dt); return out; }
        // inside, the person not yet: wait, then fetch once
        s.hideWait += dt;
        if (s.hideWait > 2 && !s.fetched) { s.fetched = true; s.fetch = 2.2; }
        return out;
      }
      s.hideWait = 0; s.fetched = false; s.fetch = 0; s.inHide = false;
      const lit = (x, z) => PARKMANOR_LIGHT.lit(st, x, z);
      const BO = st.boss, boss = bossOn(st) ? BO : null;
      // where the tour is: the furthest point either has reached, and the next job on it
      let ri = Math.min(routeAt(me.x, me.z), routeAt(pb.x, pb.z) + 1);
      // (a step back by one only once it has held for 1.5 s: standing between two route points must not flip the
      // target every step, which walked Pip east and west on the spot after Grimsby)
      if (s.ri != null && ri === s.ri - 1 && (s.lowT = (s.lowT || 0) + dt) < 1.5) ri = s.ri; else if (ri >= (s.ri ?? -1)) s.lowT = 0;
      s.ri = ri;
      if (ri < ROUTE.length - 1 && hyp(ROUTE[ri].x - me.x, ROUTE[ri].z - me.z) < 1.2 && jobDone(st, ROUTE[ri]) && ROUTE[ri + 1].reg === ROUTE[ri].reg) ri++;
      const r = ROUTE[Math.min(ri, ROUTE.length - 1)];
      // ---------- Pip: the lantern ----------
      if (id === 0) {
        if (!st.hasLantern) { walkTo(s, p, st, H.hooks.lantern.x, H.hooks.lantern.z + 0.6, out, dt); return out; }
        // Grimsby: keep him in the light (it slows him and turns his back to Bo); step back when he gets close
        if (boss) {
          const dx = boss.x - me.x, dz = boss.z - me.z, d = hyp(dx, dz);
          if (d < 2.4 || s.backT > 0) {
            if (d < 2.4 && !(s.backT > 0)) { s.backT = 1.1; const a = Math.atan2(-dx, -dz) + (s.backSide = (s.backSide || 1) * -1) * 0.5; s.backTo = inBall(me.x + Math.sin(a) * 4, me.z + Math.cos(a) * 4); }
            s.backT -= dt;
            walkTo(s, p, st, s.backTo[0], s.backTo[1], out, dt, 1);
            return out;
          }
          out.act = boss.state !== 'talk';
          const want = Math.atan2(dx, dz); let da = want - me.heading; da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.abs(da) > 0.06) steer(out, me, me.x + dx, me.z + dz, 0.38);
          if (solo && boss.state === 'fight') say('boss', 'His key, Bo! Round the back!', 9);
          return out;
        }
        // what to light: Bo's target while unwinding, else the awake spook nearest Bo (in sight)
        let tgt = null;
        if (st.keyWhat === 'spook' && st.keyTgt) tgt = st.keyTgt;
        else {
          let bd = 14;
          for (const sp of st.spooks) {
            if (!awake(sp)) continue;
            const d = hyp(sp.x - pb.x, sp.z - pb.z), dm = hyp(sp.x - me.x, sp.z - me.z);
            const zn = H.zoneAt(sp.x, sp.z);
            if (regOf(sp.x, sp.z) !== regOf(me.x, me.z)) continue;
            // a portrait cannot leave its frame: it only matters once somebody is about to walk under it
            const nr = Math.min(d, dm);
            if (sp.kind === 'portrait' && nr > 3.6) continue;
            // one Bo would not unwind: left alone for a while, unless it is coming at somebody now
            if (s.skip[sp.id] > s.t && !(sp.state === 'move' && nr < 3)) continue;
            if ((dm < 11 || (zn && zn.id === st.zone && dm < 16)) && d < bd + (sp.state === 'move' ? 2 : 0)) { bd = d; tgt = sp; }
          }
        }
        // keep an aim at least 0.6 s (no sweeping about); switch sooner only for Bo's unwinding target
        if (tgt !== s.aimAt && (s.t - s.aimT > 0.6 || (st.keyTgt && tgt === st.keyTgt))) { s.aimAt = tgt; s.aimT = s.t; }
        tgt = s.aimAt && awake(s.aimAt) ? s.aimAt : null;
        if (tgt) {
          const dx = tgt.x - me.x, dz = tgt.z - me.z, d = hyp(dx, dz);
          // already inside the lantern's own circle: no beam. The beam shrinks the circle, and anything else standing
          // in it (the second stair Sheet, beside the one Bo is unwinding) would wake and touch Bo at once.
          const L0 = st.lan || { x: me.x, z: me.z };
          const inCircle = hyp(tgt.x - L0.x, tgt.z - L0.z) < (st.gold > 0 ? PARKMANOR_LIGHT.S.R_GOLD : PARKMANOR_LIGHT.S.R) - (st.beam ? 0.5 : 0.25) && PARKMANOR_LIGHT.los(st, L0.x, L0.z, tgt.x, tgt.z);
          out.act = !inCircle;
          // too far for the beam, or round a corner: walk closer (shining)
          const want = Math.atan2(dx, dz);
          let da = want - me.heading; da = Math.atan2(Math.sin(da), Math.cos(da));
          // (facing it and still not lit: the beam is clipped by a corner; step closer for a moment)
          s.unlitT = Math.abs(da) < 0.12 && !tgt.lit && tgt.state !== 'frozen' ? (s.unlitT || 0) + dt : 0;
          if (s.unlitT > 0.7) { s.closeT = 1.2; s.unlitT = 0; }
          if (s.closeT > 0) s.closeT -= dt;
          // Bo is not coming for it (a person who stays by the lantern, or does not know yet): after a few seconds it
          // brings the light, and Bo with it, right up to the spook; if it is still not unwound a while later it
          // leaves that one and walks on with the tour (standing there for ever only stalls the pair)
          const boD = hyp(pb.x - tgt.x, pb.z - tgt.z), closing = s.holdAt === tgt && boD < s.holdBo - 0.6 * dt;
          if (s.holdAt !== tgt || st.keyHold > 0 || tgt.state !== 'frozen') s.holdT = 0; else if (!closing) s.holdT += dt;
          s.holdAt = tgt; s.holdBo = boD;
          if (solo && s.holdT > 11) { s.skip[tgt.id] = s.t + 15; s.holdT = 0; s.aimAt = null; tgt = null; out.act = false; }
          else if (s.holdT > 4 && d > 2.0) { walkTo(s, p, st, tgt.x, tgt.z, out, dt, 1); return out; }
        }
        if (tgt) {
          const dx = tgt.x - me.x, dz = tgt.z - me.z, d = hyp(dx, dz);
          const want = Math.atan2(dx, dz);
          let da = want - me.heading; da = Math.atan2(Math.sin(da), Math.cos(da));
          if (out.act === false && tgt.state === 'frozen') { if (solo && st.keyHold <= 0 && hyp(pb.x - tgt.x, pb.z - tgt.z) > 1.4) say('unwind', 'Unwind it, Bo!', 7); return out; }
          // (round a corner: walk closer, and keep walking for half a second. The lantern is held out to one side, so
          // on the spot the sight line flickered on and off past the banister and Pip's stick flipped with it.)
          if (!PARKMANOR_LIGHT.los(st, st.lan ? st.lan.x : me.x, st.lan ? st.lan.z : me.z, tgt.x, tgt.z)) s.closeT = Math.max(s.closeT || 0, 0.5);
          if (d > 11 || s.closeT > 0) { walkTo(s, p, st, tgt.x, tgt.z, out, dt, 1); return out; }
          if (Math.abs(da) > 0.06) steer(out, me, me.x + dx, me.z + dz, 0.38);
          if (tgt.state === 'frozen' && solo && st.keyHold <= 0 && hyp(pb.x - tgt.x, pb.z - tgt.z) > 1.4) say('unwind', 'Unwind it, Bo!', 7);
          return out;
        }
        // the dining chairs edging out into the way ahead: light them back in
        if (st.zone === 'dining' && me.z < -24.6) {
          // (only the ones ahead along the lane: the way runs west)
          let ch = null, cd = 5.5;
          for (const c of st.chairs) { if (c.u < 0.3 || c.s.x > me.x + 0.4) continue; const d = hyp(c.s.x - me.x, c.s.z - me.z); if (d < cd && d > 1.0) { cd = d; ch = c; } }
          if (ch) {
            out.act = true;
            const want = Math.atan2(ch.s.x - me.x, ch.s.z - me.z); let da = want - me.heading; da = Math.atan2(Math.sin(da), Math.cos(da));
            if (Math.abs(da) > 0.08) steer(out, me, ch.s.x, ch.s.z, 0.38);
            return out;
          }
        }
        // hidden wisps near: sweep the beam over them (only when nothing threatens)
        const H2 = H.wisps;
        for (let i = 0; i < H2.length; i++) {
          if (st.got[i] || st.wispAt[i].shown) continue;
          const w = st.wispAt[i], d = hyp(w.x - me.x, w.z - me.z);
          if (d < 5.5 && d > 0.6 && Math.abs(w.y - me.y) < 3 && PARKMANOR_LIGHT.los(st, me.x, me.z, w.x, w.z)) {
            if (!(s.wispAim === i)) { s.wispAim = i; s.wispT = s.t; }
            if (s.t - s.wispT > 2.5) continue; // (gave it a go)
            out.act = true;
            const want = Math.atan2(w.x - me.x, w.z - me.z); let da = want - me.heading; da = Math.atan2(Math.sin(da), Math.cos(da));
            if (Math.abs(da) > 0.08) steer(out, me, w.x, w.z, 0.38);
            return out;
          }
        }
        // shown wisps near: go and get them
        for (let i = 0; i < H2.length; i++) { if (st.got[i] || !st.wispAt[i].shown) continue; const w = st.wispAt[i]; if (hyp(w.x - me.x, w.z - me.z) < 3.5 && hyp(w.x - pb.x, w.z - pb.z) < 6 && Math.abs(w.y - me.y - 0.9) < 1.6) { walkTo(s, p, st, w.x, w.z, out, dt, 0.8); return out; } }
        // walk the tour, waiting for Bo
        const gap = hyp(pb.x - me.x, pb.z - me.z);
        if (r.pick && !st.hasKey) { walkTo(s, p, st, -1.2, 7.4, out, dt); return out; }
        if (!jobDone(st, r)) {
          if (r.ride) { walkTo(s, p, st, H.rides[r.ride].board.x - 0.3, H.rides[r.ride].board.z, out, dt); return out; }
          const w = r.wait || [r.x, r.z];
          walkTo(s, p, st, w[0], w[1], out, dt);
          if (r.door && H.doors.find(d => d.id === r.door).lock === true) say('door', 'Bo, the key!', 9);
          if (r.wind) say('wind', 'Wind it up, Bo!', 9);
          return out;
        }
        // (waiting is for a Bo who is behind. A Bo standing a few steps AHEAD, at the lift say, used to leave Pip
        // rooted between "too far to walk on" and "not far enough to go back")
        if (gap > 3.2 && routeAt(pb.x, pb.z) < routeAt(me.x, me.z) + (gap > 6 ? 1 : 0)) { if (gap > 4.5) walkTo(s, p, st, pb.x, pb.z, out, dt, 0.7); return out; }
        walkTo(s, p, st, r.x, r.z, out, dt, gap > 2.2 ? 0.6 : 1);
        return out;
      }
      // ---------- Bo: the key ----------
      if (!st.hasKey) { walkTo(s, p, st, H.hooks.key.x, H.hooks.key.z + 0.6, out, dt); return out; }
      // Grimsby: round to his back while the light holds him, a turn of the key, then clear of him
      if (boss) {
        if (st.keyWhat === 'boss') { out.act = true; return out; }
        const dx = me.x - boss.x, dz = me.z - boss.z, d = hyp(dx, dz);
        if (boss.state !== 'fight' || boss.target === 1 || !boss.lit) {
          // keep away: on the far side of the lantern from him
          if (d < 4.5) { const [x, z] = inBall(boss.x + dx / (d || 1) * 5.5, boss.z + dz / (d || 1) * 5.5); walkTo(s, p, st, x, z, out, dt); }
          return out;
        }
        if (SP_back(st, me) && hyp(me.x - (boss.x - Math.sin(boss.face) * 0.35), me.z - (boss.z - Math.cos(boss.face) * 0.35)) < 1.05) { out.act = true; return out; }
        let da = Math.atan2(dx, dz) - boss.face; da = Math.atan2(Math.sin(da), Math.cos(da));
        const bx = boss.x - Math.sin(boss.face) * 0.9, bz = boss.z - Math.cos(boss.face) * 0.9;
        if (Math.abs(da) < 1.9 && d < 3.4) {
          // in front or beside: round the side, wide
          const side = da > 0 ? 1 : -1, a = boss.face + side * 2.0;
          walkTo(s, p, st, boss.x + Math.sin(a) * 2.4, boss.z + Math.cos(a) * 2.4, out, dt);
        } else walkTo(s, p, st, bx, bz, out, dt);
        return out;
      }
      // unwinding now: hold on (the brain stands still while it holds)
      if (st.keyWhat === 'spook' && st.keyTgt) {
        out.act = true;
        // the light has left it: key out and a step back toward the lantern (standing beside it, it touched Bo at once)
        if (st.keyTgt.state !== 'frozen') { out.act = false; s.keyOff = 0.6; say('still', 'Hold it still!', 6); if (hyp(pb.x - me.x, pb.z - me.z) > 1.0) walkTo(s, p, st, pb.x, pb.z, out, dt); }
        return out;
      }
      // (just let go of one that woke: half a second by the lantern before trying a key again. Among the dolls it
      // used to press, let go and press again on every step.)
      if (s.keyOff > 0) { s.keyOff -= dt; if (hyp(pb.x - me.x, pb.z - me.z) > 1.0) walkTo(s, p, st, pb.x, pb.z, out, dt); return out; }
      // is a frozen spook being held still for Bo? In the beam or under a wound lamp, yes; in the lantern's circle only
      // while Pip stands (a Pip walking on takes the circle away, and the spook wakes with Bo's key in it); the
      // lightning lasts no time at all
      const held = sp => {
        const why = {};
        if (!PARKMANOR_LIGHT.lit(st, sp.x, sp.z, why)) return sp.kind === 'doll' && st.wound.some(w => w.def.kind === 'musicbox' && w.t > 1.5);
        return why.by === 'beam' || why.by === 'lamp' || (why.by === 'circle' && hyp(pb.vx || 0, pb.vz || 0) < 0.8);
      };
      // a job on the tour ahead (a key door, a winder): Bo's
      const pi = routeAt(pb.x, pb.z);
      for (let i = Math.max(0, pi - 1); i < Math.min(ROUTE.length, pi + 2); i++) {
        const q = ROUTE[i];
        if (!q.key || jobDone(st, q) || q.reg !== regOf(me.x, me.z)) continue;
        if (q.wind === 'musicbox' && st.zone !== 'nursery') continue;
        // the music box first, before the dolls are unwound
        const tx = q.door ? H.doors.find(d => d.id === q.door) : winder(q.wind), reach = q.door ? 1.6 : 1.33; // (the rules' reach is 1.35)
        if (hyp(tx.x - me.x, tx.z - me.z) < reach && hyp(q.key[0] - me.x, q.key[1] - me.z) < 0.9) { out.act = true; return out; }
        if (!st.spooks.some(sp => sp.state === 'frozen' && hyp(sp.x - me.x, sp.z - me.z) < 2.5) || q.wind === 'musicbox') { walkTo(s, p, st, q.key[0], q.key[1], out, dt); return out; }
      }
      // a frozen spook in reach of a lit way: go and unwind it
      let best = null, bd = 14;
      for (const sp of st.spooks) {
        if (sp.state !== 'frozen' || regOf(sp.x, sp.z) !== regOf(me.x, me.z) || !held(sp)) continue;
        const d = hyp(sp.x - me.x, sp.z - me.z);
        if (d < bd) { bd = d; best = sp; }
      }
      const moving = st.spooks.filter(sp => sp.state === 'move' && !lit(sp.x, sp.z));
      const close = moving.find(sp => hyp(sp.x - me.x, sp.z - me.z) < 3.2);
      if (close && solo) say('shine', 'Shine it here!', 6);
      if (best) {
        const d = hyp(best.x - me.x, best.z - me.z);
        if (d < 1.0) { out.act = true; return out; }
        walkTo(s, p, st, best.x, best.z, out, dt, 0.9);
        return out;
      }
      // keep clear of a moving spook: stay by the lantern
      if (close) { walkTo(s, p, st, pb.x, pb.z, out, dt); return out; }
      // the chandelier when the stair Sheets are awake and not yet unwound
      const ch = winder('chand');
      const stairs = st.spooks.filter(sp => /^stair/.test(sp.id) && (sp.state === 'move' || sp.state === 'wake'));
      if (ch && stairs.length && !st.wound.some(w => w.def === ch) && st.zone === 'hall') {
        const d = hyp(ch.x + 0.6 - me.x, ch.z - me.z);
        if (d < 0.9) { out.act = true; return out; }
        walkTo(s, p, st, ch.x + 0.6, ch.z, out, dt); return out;
      }
      // a ride ready: step in beside Pip
      if (r.ride && st.rideReady[r.ride] && hyp(r.x - pb.x, r.z - pb.z) < 2.5) { walkTo(s, p, st, H.rides[r.ride].board.x + 0.3, H.rides[r.ride].board.z, out, dt); return out; }
      // walk beside Pip in the light (a step behind and to the side)
      const gap = hyp(pb.x - me.x, pb.z - me.z);
      if (gap > 1.6) walkTo(s, p, st, pb.x - Math.sin(pb.heading) * 0.9, pb.z - Math.cos(pb.heading) * 0.9, out, dt, gap > 3 ? 1 : 0.7);
      // shown wisps very near
      for (let i = 0; i < H.wisps.length; i++) { if (st.got[i] || !st.wispAt[i].shown) continue; const w = st.wispAt[i]; if (hyp(w.x - me.x, w.z - me.z) < 2 && hyp(w.x - pb.x, w.z - pb.z) < 3 && Math.abs(w.y - me.y - 0.9) < 1.6) { walkTo(s, p, st, w.x, w.z, out, dt, 0.8); break; } }
      return out;
    },
  });
  const SP_back = (st, b) => PARKMANOR_SPOOKS.bossBack(st, b);
})();
