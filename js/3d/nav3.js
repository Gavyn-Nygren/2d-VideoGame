/* Pip & Bo - 3D levels: path finding for computer brains (cpuNav3). Pure maths, loaded with the game.

   A* over walkable floor cells (0.5 units) of a MOVER3 world, with straightened paths, drops, simple jumps, and
   moving platforms as timed links.
     const nav = cpuNav3.build(world, { x0, z0, x1, z1, cell: 0.5, r: MOVER3.r, yMax: 30 })
         samples every cell's floor (the highest top a body fits on) and which neighbours it can walk to
     cpuNav3.path(nav, from, to, { links, t, noJump }) -> [{ x, y, z, how }] or null
         from / to are { x, y, z }; how is 'walk', 'drop' (step off a ledge up to 4 high: the body teeters 0.3 s at
         the lip first, unless the level turned the teeter off), 'jump' (a hop up onto a block up to 1.1
         higher, or over a gap of up to 4 cells, never over anything taller than the higher end) or a
         link's own name. links = [{ a: {x,y,z}, b: {x,y,z}, cost, open(t) -> bool, how }] are extra one-way moves
         (a moving platform: open only while it is docked at a). The path is straightened where a body fits.
     cpuNav3.stick(dx, dz) -> { ax, ay }    a world direction as stick input for the current K3D.heading (the inverse
         of K3D.moveDir), so a brain can steer like a stick instead of zig-zagging in 8 directions
     cpuNav3.follow(p, path, out) -> out    steers p (its p.b3) along a path: drops reached points, adds ax / ay and
         jump (true: held from the take-off while rising) where the path says so. Returns out with .done at the end.
   Rebuild a nav when the world changes (a door, a pop-up appearing): it is cheap (a page is a few thousand cells).
*/
'use strict';

const cpuNav3 = {
  build(w, o) {
    const cell = o.cell || 0.5, r = o.r || MOVER3.r, x0 = o.x0, z0 = o.z0;
    const nx = Math.ceil((o.x1 - x0) / cell), nz = Math.ceil((o.z1 - z0) / cell);
    const fy = new Float32Array(nx * nz).fill(-Infinity), ok = new Uint8Array(nx * nz);
    const b = { x: 0, z: 0, vx: 0, vz: 0 };
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = x0 + (i + 0.5) * cell, z = z0 + (j + 0.5) * cell;
      const f = MOVER3.floorAt(w, x, z, o.yMax || 30, 0);
      if (f === -Infinity) continue;
      // a body fits here when no wall pushes it (a little extra room so paths keep off the hedges)
      b.x = x; b.z = z;
      const hit = MOVER3.push(w, b, r + (o.pad != null ? o.pad : 0.08), f);
      if (hit && Math.hypot(b.x - x, b.z - z) > 1e-4) continue;
      fy[j * nx + i] = f; ok[j * nx + i] = 1;
    }
    return { w, cell, r, x0, z0, nx, nz, fy, ok, o };
  },
  cellOf(n, x, z) { return [Math.floor((x - n.x0) / n.cell), Math.floor((z - n.z0) / n.cell)]; },
  center(n, i, j) { return { x: n.x0 + (i + 0.5) * n.cell, z: n.z0 + (j + 0.5) * n.cell, y: n.fy[j * n.nx + i] }; },
  // the nearest walkable cell to a point (spiral search)
  nearest(n, x, z, y) {
    const [ci, cj] = this.cellOf(n, x, z);
    for (let rad = 0; rad < 12; rad++) {
      let best = -1, bd = 1e9;
      for (let j = cj - rad; j <= cj + rad; j++) for (let i = ci - rad; i <= ci + rad; i++) {
        if (i < 0 || j < 0 || i >= n.nx || j >= n.nz || !n.ok[j * n.nx + i]) continue;
        if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== rad) continue;
        const c = this.center(n, i, j), d = Math.hypot(c.x - x, c.z - z) + (y != null ? Math.abs(c.y - y) * 2 : 0);
        if (d < bd) { bd = d; best = j * n.nx + i; }
      }
      if (best >= 0) return best;
    }
    return -1;
  },
  // can a body walk straight from a to b (same floor, within a step, nothing in the way)?
  clear(n, a, b) {
    const d = Math.hypot(b.x - a.x, b.z - a.z), k = Math.max(1, Math.ceil(d / (n.cell * 0.5)));
    let y = a.y;
    for (let s = 1; s <= k; s++) {
      const x = a.x + (b.x - a.x) * s / k, z = a.z + (b.z - a.z) * s / k;
      const [i, j] = this.cellOf(n, x, z);
      if (i < 0 || j < 0 || i >= n.nx || j >= n.nz || !n.ok[j * n.nx + i]) return false;
      const f = n.fy[j * n.nx + i];
      if (Math.abs(f - y) > MOVER3.stepUp + 0.01) return false;
      y = f;
    }
    return true;
  },
  // is the way from cell (i, j) to (ii, jj) clear of anything whose top is above hi? (sampled every quarter cell)
  over(n, i, j, ii, jj, hi) {
    const a = this.center(n, i, j), b = this.center(n, ii, jj), k = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (n.cell * 0.25));
    for (let s = 1; s < k; s++) {
      const x = a.x + (b.x - a.x) * s / k, z = a.z + (b.z - a.z) * s / k;
      if (MOVER3.floorAt(n.w, x, z, 1e9, 0) > hi) return false;
    }
    return true;
  },
  // is the way from cell (i, j) down to (ii, jj) a plain step off a ledge: first the ledge itself (top y), then only
  // the floor being dropped to (lo), with no pit and nothing sticking up in between?
  dropClear(n, i, j, ii, jj, y, lo) {
    const a = this.center(n, i, j), b = this.center(n, ii, jj), k = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (n.cell * 0.25));
    for (let s = 1; s < k; s++) {
      const f = MOVER3.floorAt(n.w, a.x + (b.x - a.x) * s / k, a.z + (b.z - a.z) * s / k, 1e9, 0);
      if (f > y + MOVER3.stepUp || f < lo - MOVER3.stepUp) return false;
    }
    return true;
  },
  path(n, from, to, o = {}) {
    const s = this.nearest(n, from.x, from.z, from.y), g = this.nearest(n, to.x, to.z, to.y);
    if (s < 0 || g < 0) return null;
    const N = n.nx * n.nz, gs = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), how = new Array(N);
    const gc = this.center(n, g % n.nx, Math.floor(g / n.nx));
    const h = k => { const c = this.center(n, k % n.nx, Math.floor(k / n.nx)); return Math.hypot(c.x - gc.x, c.z - gc.z) + Math.abs(c.y - gc.y); };
    // a small binary heap
    const heap = [], push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const pa = (i - 1) >> 1; if (heap[pa][0] <= heap[i][0]) break; [heap[pa], heap[i]] = [heap[i], heap[pa]]; i = pa; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top[1]; };
    const linkFrom = new Map();
    for (const L of o.links || []) {
      const a = this.nearest(n, L.a.x, L.a.z, L.a.y), b = this.nearest(n, L.b.x, L.b.z, L.b.y);
      if (a < 0 || b < 0 || (L.open && !L.open(o.t || 0))) continue;
      if (!linkFrom.has(a)) linkFrom.set(a, []);
      linkFrom.get(a).push({ to: b, cost: L.cost || Math.hypot(L.b.x - L.a.x, L.b.z - L.a.z) + 1, how: L.how || 'link' });
    }
    gs[s] = 0; push(s, h(s));
    const seen = new Uint8Array(N);
    let found = false, guard = 0;
    while (heap.length && guard++ < 200000) {
      const k = pop();
      if (seen[k]) continue; seen[k] = 1;
      if (k === g) { found = true; break; }
      const i = k % n.nx, j = Math.floor(k / n.nx), y = n.fy[k];
      const relax = (m, cost, hw) => { const ng = gs[k] + cost; if (ng < gs[m]) { gs[m] = ng; came[m] = k; how[m] = hw; push(m, ng + h(m)); } };
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= n.nx || jj >= n.nz) continue;
        const m = jj * n.nx + ii;
        if (!n.ok[m]) continue;
        // no cutting corners past a wall
        if (di && dj && (!n.ok[j * n.nx + ii] || !n.ok[jj * n.nx + i])) continue;
        const dy = n.fy[m] - y, dist = Math.hypot(di, dj) * n.cell;
        if (Math.abs(dy) <= MOVER3.stepUp + 0.01) relax(m, dist, 'walk');
        else if (dy < 0 && dy > -4) relax(m, dist + 0.5 - dy * 0.2, 'drop');
        else if (dy > 0 && dy < 1.1 && !o.noJump) relax(m, dist + 1.5, 'jump');
      }
      // hops: 2 to 4 cells straight across a gap, or up onto a block whose rim a body cannot stand on (a box's top up
      // to 1.1 higher). Nothing on the way may stick up above the higher end (a hop never goes over a wall).
      if (!o.noJump) for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const i1 = i + di, j1 = j + dj; if (i1 < 0 || j1 < 0 || i1 >= n.nx || j1 >= n.nz) continue; // (the grid's edge: nothing to hop to)
        if (n.ok[(j + dj) * n.nx + (i + di)] && Math.abs(n.fy[(j + dj) * n.nx + (i + di)] - y) <= MOVER3.stepUp) continue; // no gap
        // a drop off an ordinary ledge: the floor right below a ledge's face is too close to that face for a body to
        // stand on, so the landing cell is the first free one, 2 or 3 cells out (nothing but the lower floor between)
        for (let t = 2; t <= 3; t++) {
          const ii = i + di * t, jj = j + dj * t; if (ii < 0 || jj < 0 || ii >= n.nx || jj >= n.nz) break;
          const m = jj * n.nx + ii;
          if (!n.ok[m]) continue;
          const dy = n.fy[m] - y;
          if (dy < -MOVER3.stepUp && dy > -4 && this.dropClear(n, i, j, ii, jj, y, n.fy[m])) relax(m, t * n.cell + 0.5 - dy * 0.2, 'drop');
          break;
        }
        for (let t = 2; t <= 4; t++) {
          const ii = i + di * t, jj = j + dj * t; if (ii < 0 || jj < 0 || ii >= n.nx || jj >= n.nz) break;
          const m = jj * n.nx + ii;
          if (!n.ok[m] || n.fy[m] > y + 1.1 || n.fy[m] < y - 2) continue;
          if (this.over(n, i, j, ii, jj, Math.max(y, n.fy[m]) + MOVER3.stepUp)) relax(m, t * n.cell + 2.5, 'jump');
          break;
        }
      }
      for (const L of linkFrom.get(k) || []) relax(L.to, L.cost, L.how);
    }
    if (!found) return null;
    const out = [];
    for (let k = g; k !== s && k >= 0; k = came[k]) { const c = this.center(n, k % n.nx, Math.floor(k / n.nx)); c.how = how[k];
      // a jump leg remembers where it takes off from (follow() jumps there, before the edge)
      if (c.how === 'jump' && came[k] >= 0) { const f = this.center(n, came[k] % n.nx, Math.floor(came[k] / n.nx)); c.from = { x: f.x, z: f.z }; }
      out.push(c); }
    out.reverse();
    // straighten: skip walking points while a body can go straight to a later one
    const st = [], start = { x: from.x, z: from.z, y: n.fy[s] };
    let a = start;
    for (let k = 0; k < out.length; k++) {
      if (out[k].how !== 'walk') { st.push(out[k]); a = out[k]; continue; }
      let far = k;
      while (far + 1 < out.length && out[far + 1].how === 'walk' && this.clear(n, a, out[far + 1])) far++;
      st.push(out[far]); a = out[far]; k = far;
    }
    if (st.length) { const last = st[st.length - 1]; if (Math.hypot(last.x - to.x, last.z - to.z) < n.cell * 1.5 && this.clear(n, last, { x: to.x, z: to.z, y: last.y })) st.push({ x: to.x, y: last.y, z: to.z, how: 'walk' }); }
    return st;
  },
  stick(dx, dz) {
    const l = Math.hypot(dx, dz);
    if (l < 1e-6) return { ax: 0, ay: 0 };
    const x = dx / l, z = dz / l, c = Math.cos(K3D.heading), s = Math.sin(K3D.heading);
    // inverse of K3D.moveDir: world (x, z) = (ax c + ay s, -ax s + ay c)
    return { ax: x * c - z * s, ay: x * s + z * c };
  },
  follow(p, path, out = {}) {
    const b = p.b3;
    // a point is reached within 0.22 across at its height, or in the air when passing over or beyond it (so a hop
    // flies on to the next point instead of turning back over the gap)
    const reached = q => { const dx = q.x - b.x, dz = q.z - b.z, d = Math.hypot(dx, dz);
      return b.ground ? d < 0.22 && Math.abs(q.y - b.y) < 0.6 : d < 0.22 || (d < 0.8 && dx * b.vx + dz * b.vz < 0); };
    // (the last point is only reached on the ground: a hop that ends the path lands before it says done)
    while (path && path.length && reached(path[0]) && (b.ground || path.length > 1)) path.shift();
    if (!path || !path.length) { out.done = true; return out; }
    const t = path[0], st = this.stick(t.x - b.x, t.z - b.z), d = Math.hypot(t.x - b.x, t.z - b.z);
    // in the air it eases off as it nears the point (a full-height jump carries a long way: land on it, not past it)
    const k = b.ground ? 1 : clamp(d / 0.9, 0.25, 1);
    out.ax = st.ax * k; out.ay = st.ay * k;
    // a jump leg: press at the take-off (the path's point before the gap or the block, so always before the edge: a
    // body that walked on to the lip would teeter and then step off) and keep holding while rising (letting go early
    // cuts the jump short). Once it has landed past half way it walks the rest.
    let go = d < 1.4;
    if (t.from) { const fx = t.x - t.from.x, fz = t.z - t.from.z; go = (b.x - t.from.x) * fx + (b.z - t.from.z) * fz < 0.5 * (fx * fx + fz * fz); }
    out.jump = t.how === 'jump' && (b.ground ? go : b.vy > 0);
    return out;
  },
};
