/* Pip & Bo - Computer partner: bumper cars. */
'use strict';

(() => {
  /* The computer drives its car like a person on the keyboard: 8 directions (normal and hard tap between two of them to
     aim finer) and the boost button. Each step it picks a plan:
       teetering        drive back to land (hard boosts back if the other car is coming)
       other car gone   (sinking, dropping in, ghost) wait near the middle
       danger           the other car charging: close to open water, turn inward and out of its line; with water
                        not far behind (normal, hard), turn and meet it nose first (a car facing you blocks the
                        nose kick; hard boosts back)
       attack           pick the push line: straight through the other car if that line ends in open water soon, else
                        circle round behind it, on the far side from the water nearest to it; once lined up, ram it nose
                        first and boost when close and aimed (hard waits for the super boost when there is time)
     It sees the other car a little late (cpuLag): easy reacts slowly, aims loosely, sometimes wanders or boosts at
     nothing, and lets a bumped car go instead of following up. With the Tyre Wall only the open corners count as water. */
  const SK = { // per skill: reaction lag (s), aim noise (px), wander chance per s, boost care, defend, fine aim
    easy: { lag: 0.42, noise: 55, wander: 0.12, boostAim: 0.75, boostP: 0.35, defend: 0.25, fine: false, follow: 1.1 },
    normal: { lag: 0.2, noise: 22, wander: 0.03, boostAim: 0.42, boostP: 0.75, defend: 0.7, fine: true, follow: 0.35 },
    hard: { lag: 0.14, noise: 6, wander: 0, boostAim: 0.3, boostP: 1, defend: 1, fine: true, follow: 0 },
  };
  const skOf = s => (s <= 0.4 ? SK.easy : s < 0.9 ? SK.normal : SK.hard);
  const ang = (x, y) => Math.atan2(y, x);

  // open water tiles (where a car's centre can splash): any non-floor tile next to a floor tile that has no tyres.
  // Cracking flagstones (floor 2) count as half water for the car's own safety.
  function waterMap(st) {
    const key = st.roundVer + ':' + st.floorVer;
    if (st._cpuWater && st._cpuWater.key === key) return st._cpuWater;
    const fl = st.floor, fence = st.fenceOn, list = [], crack = [];
    const isF = (tx, ty) => fl[ty] && fl[ty][tx] > 0;
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
      if (fl[ty][tx] === 2) crack.push([tx, ty]);
      if (isF(tx, ty)) continue;
      let open = false;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const x = tx + ox, y = ty + oy;
        if (isF(x, y) && !(fence && fence[y] && fence[y][x])) { open = true; break; }
      }
      if (open) list.push([tx, ty]);
    }
    return (st._cpuWater = { key, list, crack });
  }
  // distance from (x, y) to the nearest open water, and the unit direction toward it
  function water(st, x, y, crackToo) {
    const M = waterMap(st);
    let bd = 1e9, bx = 0, by = 0;
    const scan = arr => {
      for (const [tx, ty] of arr) {
        const qx = clamp(x, tx * T, tx * T + T), qy = clamp(y, ty * T, ty * T + T), d = Math.hypot(qx - x, qy - y);
        if (d < bd) { bd = d; bx = qx; by = qy; }
      }
    };
    scan(M.list);
    if (crackToo) scan(M.crack);
    const d = Math.max(bd, 1e-3);
    return { d: bd, nx: (bx - x) / d, ny: (by - y) / d };
  }
  // how far a push from (x, y) along (ux, uy) travels over floor before it reaches open water (capped)
  function runOut(st, x, y, ux, uy, max) {
    for (let s = 0; s <= max; s += 12) {
      const px = x + ux * s, py = y + uy * s;
      if (!bumperFloorAt(px, py)) {
        const fence = st.fenceOn;
        // a tyre wall in the way: the push bounces, it never reaches the water
        const bx = Math.floor((px - ux * 12) / T), by = Math.floor((py - uy * 12) / T);
        if (fence && fence[by] && fence[by][bx]) return max;
        return s;
      }
    }
    return max;
  }
  // a direction (unit vector) to held keys: 8-way, or a tap between the two nearest 8-way keys for finer aim
  function keysFor(S, out, vx, vy, fine) {
    if (Math.abs(vx) < 1e-6 && Math.abs(vy) < 1e-6) return out;
    const a = ang(vx, vy), k = a / (Math.PI / 4), lo = Math.floor(k), f = k - lo;
    let pick = Math.round(k);
    if (fine) { S.dith = (S.dith || 0) + f; if (S.dith >= 1) { S.dith -= 1; pick = lo + 1; } else pick = lo; }
    const aa = pick * Math.PI / 4, dx = Math.round(Math.cos(aa)), dy = Math.round(Math.sin(aa));
    out.left = dx < 0; out.right = dx > 0; out.up = dy < 0; out.down = dy > 0;
    return out;
  }
  // push a wanted direction away from props (well, towers) and from open water near the car
  function shape(st, me, vx, vy, P, edgeCare) {
    const props = [[BUMPER_WELL[0], BUMPER_WELL[1], P.wellR]].concat(P.towers ? BUMPER_TOWERS.map(t => [t[0], t[1], P.towerR]) : []);
    for (const [px, py, pr] of props) {
      const dx = me.x - px, dy = me.y - py, d = Math.hypot(dx, dy), near = pr + me.r + 34;
      if (d < near && d > 1e-3) {
        const toward = -(vx * dx + vy * dy) / d;
        if (toward > 0) { const k = (near - d) / near * 2.2; vx += dx / d * k; vy += dy / d * k; }
      }
    }
    if (edgeCare > 0) {
      // sliding toward open water (ice keeps sliding much longer): steer against the slide
      const look = P.ice ? 0.75 : 0.35, fx = me.x + me.vx * look, fy = me.y + me.vy * look;
      if (!bumperFloorAt(fx, fy) && water(st, fx, fy, false).d < 40) {
        const sp = Math.hypot(me.vx, me.vy) || 1;
        vx = vx * 0.3 - me.vx / sp * 1.5; vy = vy * 0.3 - me.vy / sp * 1.5;
      }
      const w = water(st, me.x, me.y, true), lim = (P.ice ? 110 : 70) * edgeCare;
      if (w.d < lim) {
        const out = vx * w.nx + vy * w.ny;
        if (out > 0) { vx -= w.nx * out * 1.6; vy -= w.ny * out * 1.6; }
        const k = (lim - w.d) / lim; vx -= w.nx * k; vy -= w.ny * k;
      }
    }
    const l = Math.hypot(vx, vy) || 1;
    return [vx / l, vy / l];
  }

  cpuBrain('bumper', {
    // no idle stop: a still car stays where it is and the floor crumbles away under it, so a person who walked away would
    // see a stalled match of ties; the computer keeps playing and the match ends normally
    noIdleStop: true,
    reset(S) { S.goal = null; },
    bubblePos(p) { const st = G.mst, c = st && st.cars && st.cars[p.id]; return c ? { x: c.x, y: c.y - 14 } : { x: cpuCx(p), y: p.y }; },
    think(S, p, o, dt, info) {
      const out = {}, st = info.mst;
      if (!st || !st.cars || !st.P) return out;
      if (info.frozen) { S.wasFrozen = true; return out; }
      if (S.wasFrozen) { S.wasFrozen = false; S.dith = 0; S.pauseT = 0.15 + (1 - info.skill) * 0.35; } // a person's start is not instant
      if ((S.pauseT = (S.pauseT || 0) - dt) > 0) return out;
      const sk = skOf(info.skill), P = st.P, me = st.cars[p.id], op = st.cars[o.id];
      if (!bumperSolid(me)) return out;
      const lag = sk.lag;
      const ox = cpuLag(S, 'ox', op.x, lag), oy = cpuLag(S, 'oy', op.y, lag), ovx = cpuLag(S, 'ovx', op.vx, lag), ovy = cpuLag(S, 'ovy', op.vy, lag);
      const hx = Math.cos(me.a), hy = Math.sin(me.a);
      const opLive = bumperSolid(op) && op.ghost <= 0;
      // aim noise: a slowly changing offset (easy aims loosely)
      if ((S.noiseT = (S.noiseT || 0) - dt) <= 0) { S.noiseT = 0.6 + Math.random() * 0.8; S.nx = (Math.random() * 2 - 1) * sk.noise; S.ny = (Math.random() * 2 - 1) * sk.noise; }

      // 1. teetering: back to land
      if (me.state === 'teeter') {
        const d = bumperLandDir(me);
        if (d) {
          keysFor(S, out, d[0], d[1], false);
          const near = Math.hypot(op.x - me.x, op.y - me.y) < 150;
          if (info.skill >= 0.9 && near && me.cd <= 0 && hx * d[0] + hy * d[1] > 0.7) out.act = 'tap';
        }
        return out;
      }
      // easy: sometimes drives off somewhere for a moment
      if ((S.wanderT || 0) > 0) {
        S.wanderT -= dt;
        const [vx, vy] = shape(st, me, S.wx - me.x, S.wy - me.y, P, 1.2);
        return keysFor(S, out, vx, vy, false);
      }
      if (cpuChance(sk.wander, dt)) { S.wanderT = 0.5 + Math.random() * 0.9; S.wx = 300 + Math.random() * 360; S.wy = 160 + Math.random() * 190; }
      // easy and normal let a car they just bumped go for a moment (no follow-up combo)
      if (op.lastHitBy === me.id && op.lastHitT < 0.05 && sk.follow > 0) S.holdT = sk.follow * (0.6 + Math.random() * 0.8);
      if ((S.holdT = (S.holdT || 0) - dt) > 0) {
        const [vx, vy] = shape(st, me, 480 - me.x, 255 - me.y, P, 1.2);
        if (Math.hypot(me.x - 480, me.y - 255) > 90) keysFor(S, out, vx, vy, false);
        return out;
      }

      // 2. the other car is gone (sinking, dropping in, ghost): wait near the middle, off the well
      if (!opLive) {
        const home = st.home[o.id], tx = 480 + (home.x - 480) * 0.35, ty = 255 + (p.id ? 60 : -60);
        if (Math.hypot(me.x - tx, me.y - ty) > 40) { const [vx, vy] = shape(st, me, tx - me.x, ty - me.y, P, 1.2); keysFor(S, out, vx, vy, sk.fine); }
        return out;
      }

      const mw = water(st, me.x, me.y, true);
      const rx = ox - me.x, ry = oy - me.y, dist = Math.hypot(rx, ry) || 1;
      const ux0 = rx / dist, uy0 = ry / dist;
      // 3. danger: the other car coming fast at us, nose first, and water near us or not far behind us (where its push
      //    would send us). Far from the edge, normal and hard turn and meet it nose first (a car facing you blocks the
      //    nose kick; hard boosts back as it hits). Near the edge: turn inward and out of its line.
      const coming = -(ovx * ux0 + ovy * uy0); // speed of the other car toward us
      const oa = cpuLag(S, 'oa', op.a, lag), opNose = -(Math.cos(oa) * ux0 + Math.sin(oa) * uy0);
      const threat = dist < 170 && (coming > 140 || op.boostT > 0);
      const behind = threat && info.skill >= 0.6 && mw.d >= 85 && opNose > 0.6 ? runOut(st, me.x, me.y, -ux0, -uy0, 300) : 999;
      if (behind < 260 && Math.random() < sk.defend + 0.5 * dt) {
        const [sx, sy] = shape(st, me, ux0, uy0, P, 0.6);
        keysFor(S, out, sx, sy, sk.fine);
        const face = hx * ux0 + hy * uy0 > 0.8;
        if (me.cd <= 0 && dist < 80 && face && (info.skill >= 0.9 || (op.boostT > 0 && Math.random() < 0.3))) out.act = 'tap';
        return out;
      }
      if (mw.d < 85 && threat && Math.random() < sk.defend + 0.5 * dt) {
        // inward, and sideways out of its line; turn the nose toward it when it is about to hit
        let vx = -mw.nx, vy = -mw.ny;
        const side = (-uy0 * vx + ux0 * vy) >= 0 ? 1 : -1;
        vx += -uy0 * side * 0.8; vy += ux0 * side * 0.8;
        if (dist < 75 && info.skill >= 0.6) { vx = ux0; vy = uy0; }
        const [sx, sy] = shape(st, me, vx, vy, P, 0.6);
        keysFor(S, out, sx, sy, sk.fine);
        if (info.skill >= 0.9 && me.cd <= 0 && dist < 70 && hx * ux0 + hy * uy0 > 0.85) out.act = 'tap'; // meet it with a boost
        return out;
      }

      // 4. attack: choose the push line
      const ow = water(st, ox, oy, false);
      const lineRun = runOut(st, ox, oy, ux0, uy0, 400);
      let ux = ux0, uy = uy0, direct = true;
      // (circling round a car that comes nose first at us only shows it our back: normal and hard meet it instead)
      if (lineRun > ow.d * 1.5 + 70 && ow.d < 260 && !(info.skill >= 0.6 && opNose > 0.7 && dist < 120)) { ux = ow.nx; uy = ow.ny; direct = false; }
      // predicted spot of the other car when we get there
      const tau = clamp(dist / 320, 0, 0.6) * (info.skill >= 0.6 ? 1 : 0.4);
      const px = ox + ovx * tau + S.nx * (dist > 120 ? 1 : 0.3), py = oy + ovy * tau + S.ny * (dist > 120 ? 1 : 0.3);
      const relx = me.x - px, rely = me.y - py, along = relx * ux + rely * uy, perp = -relx * uy + rely * ux;
      let gx, gy, charge = false;
      if (direct || (along < -15 && Math.abs(perp) < Math.max(26, -along * 0.6))) { gx = px - me.x; gy = py - me.y; charge = true; }
      else {
        // circle round to the point behind it (on the far side from the water), passing beside it, not through it
        const bx = px - ux * 70, by = py - uy * 70;
        gx = bx - me.x; gy = by - me.y;
        const t = clamp(((px - me.x) * gx + (py - me.y) * gy) / (gx * gx + gy * gy || 1), 0, 1);
        const cx = me.x + gx * t - px, cy = me.y + gy * t - py;
        if (Math.hypot(cx, cy) < 62) { const s = perp >= 0 ? 1 : -1; gx = px + (-uy) * s * 80 - ux * 10 - me.x; gy = py + ux * s * 80 - uy * 10 - me.y; }
      }
      const [vx, vy] = shape(st, me, gx, gy, P, charge ? 0.55 : 1.1);
      keysFor(S, out, vx, vy, sk.fine);
      // boost: close, nose on target, and a miss would not throw us in (easy is careless about that)
      if (charge && me.cd <= 0 && me.dizzy <= 0) {
        const aim = Math.acos(clamp(hx * ux0 + hy * uy0, -1, 1));
        const range = info.skill >= 0.9 ? 135 : 120;
        const beyond = runOut(st, me.x, me.y, hx, hy, dist + 160);
        const safe = info.skill < 0.4 || (P.ice ? beyond >= dist + 150 : beyond >= dist + 110 || ow.d < 40);
        const superWait = info.skill >= 0.9 && me.readyT < P.superT && me.readyT > P.superT - 0.6 && dist > 90;
        if (dist < range && aim < sk.boostAim && safe && !superWait) {
          if (S.boostRoll === undefined) S.boostRoll = Math.random() < sk.boostP;
          if (S.boostRoll) out.act = 'tap';
        } else S.boostRoll = undefined;
      }
      // easy now and then boosts at nothing
      if (info.skill < 0.4 && me.cd <= 0 && cpuChance(0.08, dt)) out.act = 'tap';
      return out;
    },
  });
})();
