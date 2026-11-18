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
  const ROUTE = [
    { x: 0, z: 27 }, { x: 0, z: 19 }, { x: 0, z: 10.5 },
    { x: 0, z: 7.3, pick: true },
    { x: 0, z: 4.6 }, { x: -1.5, z: 1.4 }, { x: 0, z: -1.5, hall: true },
    { x: 5.8, z: -4.5, door: 'hallLock' }, { x: 10.6, z: -4.5 }, { x: 15, z: -4.5 }, { x: 20, z: -4.5 }, { x: 25.5, z: -4.5 }, { x: 31.2, z: -4.5 },
  ];
  const steer = (out, b, x, z, sp = 1) => { const s = cpuNav3.stick(x - b.x, z - b.z); out.ax = s.ax * sp; out.ay = s.ay * sp; };
  function walkTo(s, p, st, x, z, out, dt, sp = 1) {
    const b = p.b3;
    const sig = st.solids.map(q => (q.ghost ? 0 : 1)).join('');
    if (!s.nav || s.navSig !== sig) { const B = PARKMANOR_HOUSE.bounds; s.nav = cpuNav3.build(st.w, { x0: B.x0, z0: B.z0, x1: B.x1, z1: B.z1, cell: 0.5, yMax: 6 }); s.navSig = sig; s.path = null; }
    const d = hyp(x - b.x, z - b.z);
    if (d < 0.35) return true;
    const goal = { x, z, y: MOVER3.floorAt(st.w, x, z, b.y + 1.5, 0) };
    const direct = d < 1.2 || cpuNav3.clear(s.nav, { x: b.x, z: b.z, y: b.y }, goal);
    if (direct) { steer(out, b, x, z, Math.max(0.55, Math.min(sp, d / 2))); s.path = null; return false; }
    s.pathT = (s.pathT || 0) - dt;
    if (!s.path || s.pathT <= 0 || !s.goal || hyp(s.goal.x - x, s.goal.z - z) > 0.8) { s.path = cpuNav3.path(s.nav, { x: b.x, y: b.y, z: b.z }, goal); s.pathT = 1.2; s.goal = { x, z }; }
    if (s.path) { cpuNav3.follow(p, s.path, out); out.ax *= sp; out.ay *= sp; } else steer(out, b, x, z, sp);
    // (stuck against something: a hop now and then)
    s.stuckT = hyp(b.vx, b.vz) < 0.3 ? (s.stuckT || 0) + dt : 0;
    if (s.stuckT > 0.8) { out.jump = true; s.stuckT = 0; s.path = null; }
    return false;
  }
  // how far along the tour a point is (index of the nearest route point ahead)
  function routeAt(x, z) {
    let best = 0, bd = 1e9;
    ROUTE.forEach((r, i) => { const d = hyp(r.x - x, r.z - z); if (d < bd) { bd = d; best = i; } });
    // past it already? (closer to the next one along the segment)
    const n = ROUTE[best + 1];
    if (n) { const a = ROUTE[best], vx = n.x - a.x, vz = n.z - a.z, t = ((x - a.x) * vx + (z - a.z) * vz) / (vx * vx + vz * vz); if (t > 0.05) best++; }
    return best;
  }
  const awake = sp => sp.state === 'move' || sp.state === 'wake' || sp.state === 'frozen' || sp.state === 'back';

  cpuBrain('parkmanor', {
    idleStop: 30,
    reset(s) { s.said = {}; s.aimAt = null; s.aimT = 0; s.r = 0; s.fetch = 0; s.hideWait = 0; s.aims = []; },
    think(s, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.lan && st.phase !== 'play') return out;
      if (st.phase !== 'play' || info.intro) return out;
      s.t = (s.t || 0) + dt;
      const H = PARKMANOR_HOUSE, me = p.b3, pb = o.b3, id = p.id, solo = !info.partnerCpu;
      const say = (k, text, again = 8) => { if (solo && !(s.said[k] > s.t)) { s.said[k] = s.t + again; cpuSay(p, text, 1.8); } };
      if (st.stiff[id] > 0) return out;
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
      // the Butler hunting: hide
      const B = st.butler, v = B.visit >= 0 ? H.butler[B.visit] : null;
      if (v && v.kind === 'hunt' && B.state !== 'off') {
        const hd = H.hides.find(h => h.id === v.hide);
        say('hide' + B.visit, 'Hide!', 30);
        const inside = hyp(hd.x - me.x, hd.z - me.z) < hd.r;
        if (!inside || !solo) { walkTo(s, p, st, hd.x + (id ? 0.25 : -0.25), hd.z, out, dt); return out; }
        // inside, the person not yet: wait, then fetch once
        s.hideWait += dt;
        if (s.hideWait > 5 && !s.fetched) { s.fetched = true; s.fetch = 3; }
        if (s.fetch > 0) { s.fetch -= dt; walkTo(s, p, st, pb.x, pb.z, out, dt); say('come', 'In here, quick!', 6); }
        return out;
      }
      s.hideWait = 0; s.fetched = false;
      const lit = (x, z) => PARKMANOR_LIGHT.lit(st, x, z);
      // ---------- Pip: the lantern ----------
      if (id === 0) {
        if (!st.hasLantern) { walkTo(s, p, st, H.hooks.lantern.x, H.hooks.lantern.z + 0.6, out, dt); return out; }
        // what to light: Bo's target while unwinding, else the awake spook nearest Bo (in sight)
        let tgt = null;
        if (st.keyWhat === 'spook' && st.keyTgt) tgt = st.keyTgt;
        else {
          let bd = 14;
          for (const sp of st.spooks) {
            if (!awake(sp)) continue;
            const d = hyp(sp.x - pb.x, sp.z - pb.z), dm = hyp(sp.x - me.x, sp.z - me.z);
            const zn = PARKMANOR_HOUSE.zoneAt(sp.x, sp.z);
            if ((dm < 11 || (zn && zn.id === st.zone && dm < 16)) && d < bd + (sp.state === 'move' ? 2 : 0)) { bd = d; tgt = sp; }
          }
        }
        // keep an aim at least 0.6 s (no sweeping about); switch sooner only for Bo's unwinding target
        if (tgt !== s.aimAt && (s.t - s.aimT > 0.6 || (st.keyTgt && tgt === st.keyTgt))) { s.aimAt = tgt; s.aimT = s.t; }
        tgt = s.aimAt && awake(s.aimAt) ? s.aimAt : null;
        if (tgt) {
          const dx = tgt.x - me.x, dz = tgt.z - me.z, d = hyp(dx, dz);
          out.act = true;
          // too far for the beam, or round a corner: walk closer (shining)
          if (d > 11 || !PARKMANOR_LIGHT.los(st, me.x, me.z, tgt.x, tgt.z)) { walkTo(s, p, st, tgt.x, tgt.z, out, dt, 1); return out; }
          // turn on the spot toward it (a gentle push), unless already facing it
          const want = Math.atan2(dx, dz);
          let da = want - me.heading; da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.abs(da) > 0.06) steer(out, me, me.x + dx, me.z + dz, 0.38);
          if (tgt.state === 'frozen' && solo && st.keyHold <= 0 && hyp(pb.x - tgt.x, pb.z - tgt.z) > 1.4) say('unwind', 'Unwind it, Bo!', 7);
          if (tgt.state === 'move' && hyp(tgt.x - me.x, tgt.z - me.z) < 1.6 && !lit(tgt.x, tgt.z)) out.act = true;
          return out;
        }
        // hidden wisps near: sweep the beam over them (only when nothing threatens)
        const H2 = H.wisps;
        for (let i = 0; i < H2.length; i++) {
          if (st.got[i] || st.wispAt[i].shown) continue;
          const w = st.wispAt[i], d = hyp(w.x - me.x, w.z - me.z);
          if (d < 5.5 && d > 0.6 && PARKMANOR_LIGHT.los(st, me.x, me.z, w.x, w.z)) {
            if (!(s.wispAim === i)) { s.wispAim = i; s.wispT = s.t; }
            if (s.t - s.wispT > 2.5) continue; // (gave it a go)
            out.act = true;
            const want = Math.atan2(w.x - me.x, w.z - me.z); let da = want - me.heading; da = Math.atan2(Math.sin(da), Math.cos(da));
            if (Math.abs(da) > 0.08) steer(out, me, w.x, w.z, 0.38);
            return out;
          }
        }
        // shown wisps near: go and get them
        for (let i = 0; i < H2.length; i++) { if (st.got[i] || !st.wispAt[i].shown) continue; const w = st.wispAt[i]; if (hyp(w.x - me.x, w.z - me.z) < 3.5 && hyp(w.x - pb.x, w.z - pb.z) < 6) { walkTo(s, p, st, w.x, w.z, out, dt, 0.8); return out; } }
        // walk the tour, waiting for Bo
        const gap = hyp(pb.x - me.x, pb.z - me.z);
        let ri = Math.min(routeAt(me.x, me.z), routeAt(pb.x, pb.z) + 1);
        if (ri < ROUTE.length - 1 && hyp(ROUTE[ri].x - me.x, ROUTE[ri].z - me.z) < 1.2 && !(ROUTE[ri].door && !st.doors[ROUTE[ri].door].open)) ri++;
        const r = ROUTE[Math.min(ri, ROUTE.length - 1)];
        if (r.door && !st.doors[r.door].open) { walkTo(s, p, st, r.x - 1.5, r.z + 1.2, out, dt); if (solo) say('door', 'Bo, the key!', 9); return out; }
        if (r.pick && !st.hasKey) { walkTo(s, p, st, -1.2, 7.4, out, dt); return out; }
        if (gap > 3.2) { if (gap > 4.5) walkTo(s, p, st, pb.x, pb.z, out, dt, 0.7); return out; }
        walkTo(s, p, st, r.x, r.z, out, dt, gap > 2.2 ? 0.6 : 1);
        return out;
      }
      // ---------- Bo: the key ----------
      if (!st.hasKey) { walkTo(s, p, st, H.hooks.key.x, H.hooks.key.z + 0.6, out, dt); return out; }
      // unwinding now: hold on (the brain stands still while it holds)
      if (st.keyWhat === 'spook' && st.keyTgt) {
        out.act = true;
        if (st.keyTgt.state !== 'frozen') { out.act = false; say('still', 'Hold it still!', 6); }
        return out;
      }
      // a frozen spook in reach of a lit way: go and unwind it
      let best = null, bd = 14;
      for (const sp of st.spooks) {
        if (sp.state !== 'frozen') continue;
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
      const ch = H.winders.find(w => w.id === 'chand');
      const stairs = st.spooks.filter(sp => /^stair/.test(sp.id) && (sp.state === 'move' || sp.state === 'wake'));
      if (ch && stairs.length && !st.wound.some(w => w.def === ch) && st.zone === 'hall') {
        const d = hyp(ch.x + 0.6 - me.x, ch.z - me.z);
        if (d < 0.9) { out.act = true; return out; }
        walkTo(s, p, st, ch.x + 0.6, ch.z, out, dt); return out;
      }
      // a locked door on the tour ahead
      const ri = routeAt(pb.x, pb.z);
      for (let i = Math.max(0, ri - 1); i < Math.min(ROUTE.length, ri + 2); i++) {
        const r = ROUTE[i];
        if (!r.door || st.doors[r.door].open) continue;
        const D = H.doors.find(d => d.id === r.door), x = D.x - 0.7, z = D.z;
        if (hyp(x - me.x, z - me.z) < 0.7) { out.act = true; return out; }
        walkTo(s, p, st, x, z, out, dt); return out;
      }
      // walk beside Pip in the light (a step behind and to the side)
      const gap = hyp(pb.x - me.x, pb.z - me.z);
      if (gap > 1.6) walkTo(s, p, st, pb.x - Math.sin(pb.heading) * 0.9, pb.z - Math.cos(pb.heading) * 0.9, out, dt, gap > 3 ? 1 : 0.7);
      // shown wisps very near
      for (let i = 0; i < H.wisps.length; i++) { if (st.got[i] || !st.wispAt[i].shown) continue; const w = st.wispAt[i]; if (hyp(w.x - me.x, w.z - me.z) < 2 && hyp(w.x - pb.x, w.z - pb.z) < 3) { walkTo(s, p, st, w.x, w.z, out, dt, 0.8); break; } }
      return out;
    },
  });
})();
