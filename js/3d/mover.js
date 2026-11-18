/* Pip & Bo - 3D levels: the mover. Pure maths (no three.js), loaded with the game so a level's step() can run with
   drawing switched off (K3D.noRender) and in the bot tests.

   Players are upright cylinders (radius MOVER3.r, height MOVER3.h, feet at y). The world is a list of solids:
     { x, z, w, d, y0, y1, rot }                 a box, turned rot radians about Y round its middle (x, z)
     { ..., ramp: { h0, h1 } }                    a ramp: its top rises from y0 + h0 at local -w/2 to y0 + h1 at +w/2
                                                  (local x is along w after the turn); its bottom is y0
     { ..., vx, vy, vz }                          a moving platform: the level moves it each step (MOVER3.movePlat)
     { ..., pass: true }                          low things the pencil passes over but feet do not (a level's own use)
   const w = MOVER3.world(solids)                 prepares a world (solids can be added later with MOVER3.add(w, s))
   MOVER3.spawn(p, x, y, z)                       puts a player's body (p.b3) there, standing
   MOVER3.step(p, w, dt, o)                       one fixed step for one player:
       o = { speed: 1 (of a normal run), jump: true (may jump), teeter: true, dir: K3D.moveDir(p),
             guard: false (true: the teeter never tips over, the edge just holds them: a level's catch-up help) }
       reads only p.input, p.pendingJump (and clears it); writes p.b3:
       { x, y, z, vx, vy, vz, ground, on (the solid stood on), coyote, buf, teeter, whoa (true on the tick a teeter
         starts), land (true on the tick it lands), fell (true on the tick it walks or slides off a ledge), heading }
   MOVER3.separate(a, b)                          pushes two bodies apart (call after both steps)
   MOVER3.floorAt(w, x, z, yMax)                  the highest walkable top under (x, z) at or below yMax (or -Infinity)
   MOVER3.push(w, b, r)                           pushes a circle (b.x, b.z, radius r) out of every wall at its height
   Speeds come from PHYS (px) divided by K3D.U, so a jump feels like the 2D one: gravity, run speed, jump speed,
   coyote time, jump buffer and jump cut. It never tunnels: movement is split into pieces under half a radius.
   Edge teeter: walking off a ledge more than 0.3 deep hangs the player at the edge for 0.3 s ("Whoa!") while they
   keep pushing out; pulling back (or letting go) saves it; still pushing after 0.3 s steps them off. A push mostly
   along the edge (within 60 degrees) slides along it instead.
*/
'use strict';

const MOVER3 = {
  r: 0.33, h: 26 / 30, stepUp: 0.2, edge: 0.06, teeterT: 0.3, teeterDrop: 0.3,
  world(solids) { const w = { solids: [] }; for (const s of solids || []) this.add(w, s); return w; },
  add(w, s) {
    s.c = Math.cos(s.rot || 0); s.s = Math.sin(s.rot || 0);
    w.solids.push(s); return s;
  },
  // a point in a solid's own frame (local x along w, local z along d)
  local(s, x, z) { const dx = x - s.x, dz = z - s.z; return [dx * s.c - dz * s.s, dx * s.s + dz * s.c]; },
  world2(s, lx, lz) { return [s.x + lx * s.c + lz * s.s, s.z - lx * s.s + lz * s.c]; },
  topAt(s, lx) { if (!s.ramp) return s.y1; const t = clamp((lx + s.w / 2) / s.w, 0, 1); return s.y0 + s.ramp.h0 + (s.ramp.h1 - s.ramp.h0) * t; },
  // the highest top under (x, z) at or below yMax; m widens each solid a little (standing on the lip of an edge)
  floorAt(w, x, z, yMax, m = this.edge) {
    let best = -Infinity, on = null;
    for (const s of w.solids) {
      if (s.ghost) continue;
      const [lx, lz] = this.local(s, x, z);
      if (Math.abs(lx) > s.w / 2 + m || Math.abs(lz) > s.d / 2 + m) continue;
      const top = this.topAt(s, clamp(lx, -s.w / 2, s.w / 2));
      if (top <= yMax + 1e-6 && top > best) { best = top; on = s; }
    }
    this._on = on;
    return best;
  },
  // walls: every solid whose top is above feet + stepUp and whose bottom is below the head pushes the circle out
  push(w, b, r = this.r, y = b.y, h = this.h) {
    let hit = null;
    for (let it = 0; it < 3; it++) {
      let moved = false;
      for (const s of w.solids) {
        if (s.ghost) continue;
        const [lx, lz] = this.local(s, b.x, b.z);
        const hw = s.w / 2, hd = s.d / 2;
        if (Math.abs(lx) > hw + r || Math.abs(lz) > hd + r) continue;
        const cx = clamp(lx, -hw, hw), cz = clamp(lz, -hd, hd);
        const top = this.topAt(s, cx);
        if (top <= y + this.stepUp || s.y0 >= y + h) continue;
        let nx = lx - cx, nz = lz - cz, d = Math.hypot(nx, nz);
        if (d >= r) continue;
        if (d < 1e-6) { // the middle is inside: out through the nearest side
          const ex = hw - Math.abs(lx), ez = hd - Math.abs(lz);
          if (ex < ez) { nx = Math.sign(lx) || 1; nz = 0; d = -ex; } else { nx = 0; nz = Math.sign(lz) || 1; d = -ez; }
        } else { nx /= d; nz /= d; }
        const k = r - d, [wx, wz] = [nx * s.c + nz * s.s, -nx * s.s + nz * s.c];
        b.x += wx * k; b.z += wz * k;
        // stop the speed going into the wall (slide along it)
        const vn = (b.vx || 0) * wx + (b.vz || 0) * wz;
        if (vn < 0) { b.vx -= vn * wx; b.vz -= vn * wz; }
        moved = true; hit = s;
      }
      if (!moved) break;
    }
    return hit;
  },
  spawn(p, x, y, z) {
    p.b3 = { x, y, z, vx: 0, vy: 0, vz: 0, ground: true, on: null, coyote: 0, buf: 0, teeter: 0, whoa: false, land: false, fell: false, heading: 0, jumping: false };
    return p.b3;
  },
  movePlat(w, s, dx, dy, dz, bodies) {
    for (const b of bodies) if (b && b.on === s && b.ground) { b.x += dx; b.y += dy; b.z += dz; }
    s.x += dx; s.y0 += dy; s.y1 += dy; s.z += dz;
  },
  step(p, w, dt, o = {}) {
    const b = p.b3, i = p.input || {}, U = K3D.U;
    const run = PHYS.maxRun / U * (o.speed == null ? 1 : o.speed);
    const d = o.dir || K3D.moveDir(p);
    b.whoa = false; b.land = false; b.fell = false;
    // horizontal: accelerate toward the push, brake when let go (the 2D game's acceleration and friction)
    const acc = (b.ground ? PHYS.accG : PHYS.accA) / U, fr = (b.ground ? PHYS.fricG : PHYS.fricA) / U;
    const tx = d.x * run * d.s, tz = d.z * run * d.s;
    const ax = tx - b.vx, az = tz - b.vz, al = Math.hypot(ax, az), lim = (d.s > 0.05 ? acc : fr) * dt;
    if (al <= lim) { b.vx = tx; b.vz = tz; } else { b.vx += ax / al * lim; b.vz += az / al * lim; }
    if (d.s > 0.1) b.heading = Math.atan2(d.x, d.z);
    // jump: buffer, coyote time, cut when let go early
    if (p.pendingJump) { b.buf = PHYS.buffer; p.pendingJump = false; } else b.buf = Math.max(0, b.buf - dt);
    b.coyote = b.ground ? PHYS.coyote : Math.max(0, b.coyote - dt);
    if (b.buf > 0 && b.coyote > 0 && o.jump !== false) {
      b.vy = PHYS.jumpV / U; b.ground = false; b.coyote = 0; b.buf = 0; b.jumping = true; b.teeter = 0; b.on = null;
    }
    if (b.jumping && !i.jump && b.vy > 0) { b.vy *= PHYS.cut; b.jumping = false; }
    // move across in pieces under half a radius
    // (a speed that is not a finite number would never finish the pieces below: stop instead, and say so once)
    if (!Number.isFinite(b.vx) || !Number.isFinite(b.vz)) { if (!this._warned) { this._warned = true; console.warn('MOVER3: speed was not a number', b.vx, b.vz); } b.vx = b.vz = 0; }
    const mx = b.vx * dt, mz = b.vz * dt, n = Math.min(64, Math.max(1, Math.ceil(Math.hypot(mx, mz) / (this.r * 0.45))));
    for (let k = 0; k < n; k++) {
      const ox = b.x, oz = b.z;
      b.x += mx / n; b.z += mz / n;
      this.push(w, b);
      // the edge teeter: a grounded player about to walk off a drop is held at the lip while they push out
      if (b.ground && o.teeter !== false) {
        const f = this.floorAt(w, b.x, b.z, b.y + this.stepUp);
        if (f < b.y - this.teeterDrop) {
          // pushing mostly along an edge (within 60 degrees of it) slides along it; more outward than that is a teeter
          const sx = ox + mx / n, sz = oz + mz / n, ml = Math.hypot(mx, mz) * 0.5;
          const ok = (x, z, m) => m >= ml && this.floorAt(w, x, z, b.y + this.stepUp) >= b.y - this.teeterDrop;
          const xs = () => ok(sx, oz, Math.abs(mx)) ? [sx, oz] : null, zs = () => ok(ox, sz, Math.abs(mz)) ? [ox, sz] : null;
          const along = Math.abs(mx) >= Math.abs(mz) ? xs() || zs() : zs() || xs();
          if (along) { b.x = along[0]; b.z = along[1]; this.push(w, b); continue; }
          if (b.teeter < this.teeterT || o.guard) {
            if (b.teeter === 0) b.whoa = true;
            b.teeter = Math.min(this.teeterT, b.teeter + dt / n); b.x = ox; b.z = oz; b.vx = 0; b.vz = 0;
          }
        }
      }
    }
    if (b.teeter > 0) {
      // still pushing out over the drop? (else saved)
      const f = this.floorAt(w, b.x + d.x * this.r * 0.9, b.z + d.z * this.r * 0.9, b.y + this.stepUp);
      if (!(d.s > 0.2 && f < b.y - this.teeterDrop)) b.teeter = 0;
      else if (b.teeter >= this.teeterT && !o.guard) { b.x += d.x * this.r * 0.6; b.z += d.z * this.r * 0.6; b.teeter = 0; b.vx = d.x * 1.5; b.vz = d.z * 1.5; }
    }
    // vertical
    const wasGround = b.ground;
    b.vy = Math.max(b.vy - PHYS.g / U * dt, -PHYS.maxFall / U);
    const my = b.vy * dt, ny = Math.max(1, Math.ceil(Math.abs(my) / 0.15));
    b.ground = false;
    for (let k = 0; k < ny; k++) {
      const y0 = b.y; b.y += my / ny;
      const f = this.floorAt(w, b.x, b.z, Math.max(y0, b.y) + (b.vy <= 0 ? this.stepUp : 0));
      if (b.vy <= 0 && b.y <= f + 1e-6 && f >= y0 - 0.3 - Math.abs(my)) { b.y = f; b.vy = 0; b.ground = true; b.on = this._on; break; }
      // a ceiling: a solid above whose bottom the head reaches
      if (b.vy > 0) for (const s of w.solids) {
        const [lx, lz] = this.local(s, b.x, b.z);
        if (Math.abs(lx) < s.w / 2 && Math.abs(lz) < s.d / 2 && s.y0 > y0 + this.h - 1e-6 && s.y0 < b.y + this.h) { b.y = s.y0 - this.h; b.vy = 0; b.jumping = false; }
      }
    }
    // standing still on the ground: stick to it (ramps going down, step-downs)
    if (!b.ground && wasGround && b.vy <= 0) {
      const f = this.floorAt(w, b.x, b.z, b.y + this.stepUp);
      if (f > b.y - this.stepUp - 0.05) { b.y = f; b.vy = 0; b.ground = true; b.on = this._on; }
      else b.fell = true;
    }
    if (!b.ground) b.on = null;
    if (b.ground && !wasGround) { b.land = true; b.jumping = false; }
    return b;
  },
  separate(a, c, r = this.r) {
    if (!a || !c || Math.abs(a.y - c.y) > this.h) return;
    const dx = c.x - a.x, dz = c.z - a.z, d = Math.hypot(dx, dz);
    if (d >= r * 2 || d < 1e-6) return;
    const k = (r * 2 - d) / 2;
    a.x -= dx / d * k; a.z -= dz / d * k; c.x += dx / d * k; c.z += dz / d * k;
  },
};
