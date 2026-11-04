/* Pip & Bo - Computer partner: two seat car. */
'use strict';

(() => {
  /* 5-1 Two-Seat Car: the level says who steers (G.mst.steer); the other does gas and brake. The computer plays the
     seat it has, and after a seat swap it lets go of everything first (the level locks a seat until its keys are up).
     The route: each room's def.path (the road a person sees), ending in the middle of the parking box, cut into 10 px
     steps and nudged away from cones.
     Steering: follows the route with a look-ahead point (further at speed) and points the nose at it, pressing the one
     of the 8 directions a person can point that turns the nose the right way.
     Pedals: picks a speed from what is ahead on the road and goes gas / coast / brake toward it: slow for corners,
     full gas toward a ramp, a stop in the box, a stop before a hedge, water or closed gate on the car's nose, and a
     stop for ducks on the road (honking so they hurry, or keep waiting at the side). A car pushing into a hedge backs
     up (brake held = reverse). When a person steers somewhere else, the pedals just drive where the nose points, slow
     enough to turn, and stop before anything; rolled past the box, they back into it. With a person on the pedals,
     the wheel honks at the ducks. With a person who does nothing, the computer waits (at the wheel nothing moves; on
     the pedals it rolls on only while the road ahead is clear): one seat alone can't drive the car to the box. */
  const VMAX = 210;
  const wrap = a => carWrap(a);
  const DIRS = [];
  for (let k = 0; k < 8; k++) DIRS.push({ a: wrap(k * Math.PI / 4), x: Math.round(Math.cos(k * Math.PI / 4)), y: Math.round(Math.sin(k * Math.PI / 4)) });

  /* ---------- the route (one per room, shared by both seats) ---------- */
  const routes = new WeakMap();
  function route(m) {
    let R = routes.get(m.path);
    if (R) return R;
    const P = m.park, bx = (P.x0 + P.x1) / 2, by = (P.y0 + P.y1) / 2;
    const v = m.path.map(q => q.slice());
    if (!v.length) v.push([m.start.x, m.start.y]);
    // end in the middle of the box (the path's last point is only somewhere inside it)
    const last = v[v.length - 1];
    if (last[0] > P.x0 - T && last[0] < P.x1 + T && last[1] > P.y0 - T && last[1] < P.y1 + T) v[v.length - 1] = [bx, by];
    else v.push([bx, by]);
    // 10 px steps, each pushed sideways away from cones it passes too close to
    const pts = [], corners = [];
    let s = 0;
    for (let i = 0; i < v.length - 1; i++) {
      const [ax, ay] = v[i], [qx, qy] = v[i + 1], L = Math.hypot(qx - ax, qy - ay), n = Math.max(1, Math.round(L / 10));
      const nx = -(qy - ay) / (L || 1), ny = (qx - ax) / (L || 1);
      for (let j = 0; j < n; j++) {
        let x = ax + (qx - ax) * j / n, y = ay + (qy - ay) * j / n, off = 0;
        for (const cn of m.cones) {
          const lat = (cn.x - x) * nx + (cn.y - y) * ny, along = Math.abs((cn.x - x) * -ny + (cn.y - y) * nx);
          if (along < 40 && Math.abs(lat) < 30) off += (Math.abs(lat) - 30) * Math.sign(lat || 1) * (1 - along / 40);
        }
        pts.push({ x: x + nx * off, y: y + ny * off, s: s + L * j / n });
      }
      s += L;
      if (i + 1 < v.length - 1) {
        const [cx, cy] = v[i + 2], turn = Math.abs(wrap(Math.atan2(cy - qy, cx - qx) - Math.atan2(qy - ay, qx - ax)));
        corners.push({ s, turn });
      }
    }
    pts.push({ x: bx, y: by, s });
    // where the route first runs onto each ramp (full gas from a way back)
    const ramps = [];
    let onRamp = false;
    for (const q of pts) {
      const r = !!CAR_RAMP[carAt(m, q.x, q.y)];
      if (r && !onRamp) ramps.push(q.s);
      onRamp = r;
    }
    R = { pts, corners, ramps, end: s };
    routes.set(m.path, R);
    return R;
  }
  // where the car is on the route: the nearest step, kept near the last one (roads run side by side in some rooms)
  function track(S, m, c) {
    const R = route(m), pts = R.pts;
    if (S.cx != null && Math.hypot(c.x - S.cx, c.y - S.cy) > 40) S.i = null; // towed or back at a flag
    S.cx = c.x; S.cy = c.y;
    let best = 0, bd = 1e9;
    for (let i = 0; i < pts.length; i++) {
      const d = Math.hypot(pts[i].x - c.x, pts[i].y - c.y) + (S.i != null && Math.abs(i - S.i) > 25 ? 70 : 0);
      if (d < bd) { bd = d; best = i; }
    }
    S.i = best;
    const q = pts[best];
    return { R, i: best, s: q.s, d: Math.hypot(q.x - c.x, q.y - c.y), toEnd: R.end - q.s };
  }
  // the point `ahead` px further along the route
  function ahead(R, i, ahead) {
    const pts = R.pts, s = pts[i].s + ahead;
    let j = i;
    while (j < pts.length - 1 && pts[j].s < s) j++;
    return pts[j];
  }
  const carSpeed = c => Math.max(0, c.v);

  /* ---------- what is in front of the car ---------- */
  // px along the nose (or tail, dir -1) to the first hedge, railing, water or closed gate; a ramp that faces the same
  // way ends the look (the car flies over the water behind it)
  // (side: the same along the car's sides; a side hit is only a scrape, the hedge pushes the car aside)
  function castHaz(m, c, dir = 1) {
    const ux = Math.cos(c.a) * dir, uy = Math.sin(c.a) * dir;
    let side = 1e9;
    for (let d = 0; d < 300; d += 5) for (const off of [0, -11, 11]) {
      const x = c.x + ux * d - uy * off, y = c.y + uy * d + ux * off, ch = carAt(m, x, y), r = CAR_RAMP[ch];
      if (r && dir > 0 && ux * r[0] + uy * r[1] > 0.5) return { d: 1e9, side, ramp: d };
      if (carSolid(m, ch) || ch === 'w') {
        if (!off) return { d, side: Math.min(side, d), ramp: -1 };
        side = Math.min(side, d);
      }
    }
    return { d: 1e9, side, ramp: -1 };
  }
  // the nearest duck in the car's path (px along the nose), and ducks near the route ahead
  function duckAhead(m, c, R, i) {
    let best = 1e9;
    const ux = Math.cos(c.a), uy = Math.sin(c.a), pts = R && R.pts;
    for (const d of m.ducks) for (let k = 0; k < d.n; k++) {
      const q = carDuckPos(d, k), rx = q.x - c.x, ry = q.y - c.y, al = rx * ux + ry * uy;
      if (al > 0 && Math.abs(-rx * uy + ry * ux) < 30) best = Math.min(best, al);
      // on the route ahead (it may cross the road before the nose points at it)
      if (R) for (let j = i; j < pts.length && pts[j].s - pts[i].s < 220; j += 2) {
        if (Math.hypot(pts[j].x - q.x, pts[j].y - q.y) < 42) { best = Math.min(best, pts[j].s - pts[i].s); break; }
      }
    }
    return best;
  }
  // pointing the nose: the 8 directions a person can press
  function pointAt(out, c, want, dead) {
    const err = wrap(want - c.a);
    if (Math.abs(err) < dead) return;
    let best = null, bd = 9;
    for (const D of DIRS) {
      const rel = wrap(D.a - c.a);
      if (Math.sign(rel) !== Math.sign(err) || Math.abs(rel) < 0.02) continue;
      const dd = Math.abs(wrap(D.a - want));
      if (dd < bd) { bd = dd; best = D; }
    }
    if (!best) return;
    out.right = best.x > 0; out.left = best.x < 0; out.down = best.y > 0; out.up = best.y < 0;
  }
  // the direction a person at the wheel is pointing (null = nothing pressed)
  function steerDir(i) {
    const sx = (i.right ? 1 : 0) - (i.left ? 1 : 0), sy = (i.down ? 1 : 0) - (i.up || i.jump ? 1 : 0);
    return sx || sy ? Math.atan2(sy, sx) : null;
  }

  // a reminder for a person who is waiting: 2 s, then quiet for a while (the level's own nudge stays up meanwhile)
  function say(S, p, text) {
    if (G.time - (S.sayAt == null ? -99 : S.sayAt) < 8) return;
    S.sayAt = G.time; cpuSay(p, text, 2);
  }

  /* ---------- the wheel ---------- */
  function steer(S, p, m, c, info, out) {
    const t = track(S, m, c), R = t.R;
    const look = 34 + 0.3 * Math.abs(c.v);
    const q = ahead(R, t.i, look), end = R.pts[R.pts.length - 1];
    // near the box: just keep the nose straight unless it's well off
    if (Math.hypot(end.x - c.x, end.y - c.y) < 26) return;
    let want = Math.atan2(q.y - c.y, q.x - c.x);
    // backing up toward something behind (the box after rolling past it): point the nose away so the tail goes there
    if (c.v < -5 && Math.abs(wrap(want - c.a)) > Math.PI / 2) want = wrap(want + Math.PI);
    // a little slower to react on easy (still a steady driver)
    want = cpuLag(S, 'want', want, 0.12 * (1 - info.skill));
    pointAt(out, c, want, 0.03);
    // a person on the pedals: the wheel honks at the ducks for them
    if (!info.partnerCpu) honk(S, p, m, c, out, duckAhead(m, c, R, t.i));
    // a person on the pedals who does nothing: wait (the level's hint tells them which key)
    if (!info.partnerCpu && Math.abs(c.v) < 3 && info.partnerIdle > 4 && !carWaitReason(m)) say(S, p, 'Hit the gas!');
  }

  /* ---------- the pedals ---------- */
  function pedals(S, p, o, m, c, info, out, dt) {
    const t = track(S, m, c), R = t.R;
    const oi = o.input, partnerSteers = !info.partnerCpu, sd = partnerSteers ? steerDir(oi) : null;
    const look = 34 + 0.3 * Math.abs(c.v), q = ahead(R, t.i, look);
    const want = Math.atan2(q.y - c.y, q.x - c.x), hErr = Math.abs(wrap(want - c.a));
    // a person at the wheel who left the road (or points well away from it) is driving: follow the nose
    S.offT = (t.d > 60 || (partnerSteers && sd != null && Math.abs(wrap(sd - want)) > 1.3)) ? (S.offT || 0) + dt : 0;
    const free = partnerSteers && S.offT > 0.4;
    const hz = castHaz(m, c), inBox = carInBox(m, c.x, c.y);
    let vT = VMAX * (0.88 + 0.12 * info.skill);
    if (!free) {
      for (const k of R.corners) {
        const d = k.s - t.s, vc = clamp(215 - 80 * k.turn, 60, VMAX);
        if (d > -25 && d < 400) vT = Math.min(vT, Math.sqrt(vc * vc + 2 * 380 * Math.max(0, d - 12)));
      }
      // stop in the box; rolled past it: back up into it
      // (beside the box rather than in line with it: roll on slowly so the wheel can turn the car to it)
      const end = R.pts[R.pts.length - 1], ex = end.x - c.x, ey = end.y - c.y;
      const along = ex * Math.cos(c.a) + ey * Math.sin(c.a), lat = Math.abs(ey * Math.cos(c.a) - ex * Math.sin(c.a));
      const dEnd = t.toEnd >= 40 ? t.toEnd : lat < 25 ? along : Math.hypot(ex, ey);
      vT = Math.min(vT, inBox ? 0 : Math.max(dEnd > 6 ? 30 : 0, Math.sqrt(2 * 300 * Math.max(0, dEnd - 4))));
      if (!inBox && t.toEnd < 40 && along < -8 && lat < 25) S.back = true;
      else if (inBox || t.toEnd >= 40 || lat >= 25) S.back = false;
      if (hErr > 0.45) vT = Math.min(vT, Math.max(50, 110 - 50 * (hErr - 0.45)));
      // a ramp coming up and the nose lined up: full gas
      if (hErr < 0.4 && R.ramps.some(s => s - t.s > -20 && s - t.s < 320)) vT = VMAX;
    } else {
      vT = 130;
      if (sd != null && Math.abs(wrap(sd - c.a)) > 0.3) vT = 70;          // turning: slow enough to make it
      if (sd == null && hz.d < 60) vT = 0;                                // nose at a wall and nobody steering
      const P = m.park, bx = (P.x0 + P.x1) / 2, by = (P.y0 + P.y1) / 2, rx = bx - c.x, ry = by - c.y;
      const al = rx * Math.cos(c.a) + ry * Math.sin(c.a);
      if (Math.hypot(rx, ry) < 90 && al > -10) vT = Math.min(vT, Math.sqrt(2 * 300 * Math.max(0, al - 4)));
    }
    if (hz.ramp < 0) vT = Math.min(vT, Math.sqrt(2 * 420 * Math.max(0, hz.d - 30)));
    // a hedge or railing corner along one side: slow, and scrape past it (stopping there would wait forever for a
    // person at the wheel who thinks the road is straight)
    if (hz.ramp < 0 && hz.side < hz.d) vT = Math.min(vT, Math.max(45, Math.sqrt(2 * 420 * Math.max(0, hz.side - 30))));
    // ducks near the road ahead stop the car. But the car can block a duck line itself (they turn round at the car
    // and shuttle between it and the end of their walk): stopped a while, it backs up a moment if they are right in
    // front of the nose (the car can't turn standing still), else only ducks in front of the nose count for a moment
    let dk = duckAhead(m, c, free ? null : R, t.i);
    S.duckT = dk < 120 && Math.abs(c.v) < 5 && !(S.duckGo > 0) && !(S.rev > 0) ? (S.duckT || 0) + dt : 0;
    if (S.duckT > 3) {
      S.duckT = 0;
      if (duckAhead(m, c, null, t.i) < 75 && castHaz(m, c, -1).d > 60) S.rev = 1.2; else S.duckGo = 2;
    }
    if (S.duckGo > 0) { S.duckGo -= dt; dk = duckAhead(m, c, null, t.i); }
    if (dk < 1e9) vT = Math.min(vT, Math.sqrt(2 * 380 * Math.max(0, dk - 46)));
    if (inBox && Math.abs(c.v) < 60) vT = 0;
    if (c.v < -4 && !S.back && !(S.rev > 0)) vT = 0; // rolling backward after backing up: stop first
    // stuck on a hedge with the gas down: back up a moment (the steerer turns the nose meanwhile)
    const pushing = S.gas && c.vReal < 6;
    S.stuckT = pushing ? (S.stuckT || 0) + dt : 0;
    const blocked = hz.d < 34 && Math.abs(c.v) < 10 && !inBox && (free ? sd != null && Math.abs(wrap(sd - c.a)) > 0.3 : hErr > 0.3);
    // nobody at the wheel (a person who presses nothing): roll on only while the road ahead is clear
    const nobody = partnerSteers && info.partnerIdle > 3;
    if (nobody) {
      S.stuckT = 0; S.rev = 0; S.pivot = 0;
      if (hz.d < 70) { vT = 0; if (Math.abs(c.v) < 3) say(S, p, 'Point the way!'); }
    } else if ((S.stuckT > 0.7 || blocked) && !(S.rev > 0) && !(S.pivot > 0) && dk > 80) {
      // a person pointing somewhere open: hold a little gas so the nose swings round to it on the spot (backing up
      // makes many people steer the other way, and the car ends up shuttling across the road); a couple of tries,
      // then back up after all
      if (partnerSteers && sd != null && Math.abs(wrap(sd - c.a)) > 0.3 && (S.pivN || 0) < 3 && castHaz(m, { x: c.x, y: c.y, a: sd }).d > 40) {
        S.pivot = 0.7; S.pivN = (S.pivN || 0) + 1;
      } else { S.rev = 1.4; S.pivN = 0; }
      S.stuckT = 0;
    }
    if (Math.abs(c.v) > 40) S.pivN = 0;
    // standing still with nothing to wait for (the car can't turn standing still): back up a moment
    S.stallT = !nobody && !inBox && vT < 1 && Math.abs(c.v) < 3 && !(S.rev > 0) && !(S.pivot > 0) && !carWaitReason(m) ? (S.stallT || 0) + dt : 0;
    if (S.stallT > 2.5) { S.stallT = 0; S.rev = 1.2; }
    out.up = out.down = false;
    if (S.back && !free) out.down = true;
    else if (S.rev > 0) {
      S.rev -= dt;
      const back = castHaz(m, c, -1);
      if (back.d > 30) out.down = true;
      else { S.rev = 0; S.pivot = 0.5; } // no room behind either (sideways on the bridge): a little gas lets the nose turn
    } else if (S.pivot > 0) { S.pivot -= dt; out.up = true; }
    else if (vT < 1) { out.down = c.v > 4; out.up = c.v < -4; }
    else if (c.v < vT) out.up = true;
    else if (c.v > vT + 25) out.down = true;
    S.gas = out.up && c.v >= 0;
    honk(S, p, m, c, out, dk);
  }

  // ducks: a honk makes ducks on the road hurry, and ducks waiting at the side wait a bit longer for the car
  function honk(S, p, m, c, out, dk) {
    S.honkT = (S.honkT || 0) - DT;
    if (S.honkT > 0) return;
    for (const d of m.ducks) {
      let near = 1e9;
      for (let k = 0; k < d.n; k++) { const q = carDuckPos(d, k); near = Math.min(near, Math.hypot(q.x - c.x, q.y - c.y)); }
      if (near > 190) continue;
      const waiting = d.pause > 0 && d.pause < 2.5 && d.ext < CAR.duckWaitMax - 1;
      const inWay = dk < 150 && d.pause <= 0 && d.hurry <= 0;
      if (waiting || inWay) { out.act = 'tap'; S.honkT = 1.2; if (inWay) cpuSay(p, 'Ducks!', 1.4); return; }
    }
  }

  cpuBrain('car', {
    reset(S) { S.i = null; S.rev = 0; },
    bubbleHidden: true,
    bubblePos() { const c = G.mst && G.mst.car; return c ? { x: c.x, y: c.y - 14 } : { x: W / 2, y: H / 2 }; },
    think(S, p, o, dt, info) {
      const m = info.mst, out = {};
      if (!m || !m.car || !m.path) return out;
      if (S.k !== m.k) { S.k = m.k; S.i = null; S.rev = 0; S.pivot = 0; S.gas = false; }
      // room card, a seat swap (let go first), parked, or splashing: hands off
      if (G.introT > CAR.introLock || m.lock[p.id] || m.phase !== 'drive' || m.car.sink > 0) { S.gas = false; S.rev = 0; return out; }
      const c = m.car;
      if (m.steer === p.id) steer(S, p, m, c, info, out);
      else pedals(S, p, o, m, c, info, out, dt);
      return out;
    },
  });
})();
