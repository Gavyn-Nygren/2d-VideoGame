/* Pip & Bo - Computer partner brain for 28-3 Sliding Stone Puzzle (mode 'stonepuzzle'). */
'use strict';

/* How the computer plays Sliding Stone Puzzle
   Planning: it looks at the stones as they are now and makes a plan with a simple planner: for each stone that isn't on
   its socket it searches for a way to push that one stone home (the other stones stay put, the pusher must be able
   to walk to the cell behind it, and for a heavy stone the cell behind that must be free for the partner too). It
   picks the first stone (in glyph order) whose push-home leaves every other stone still able to get home, does it,
   and plans again. Every puzzle was checked with this planner. If no plan works (a person pushed a stone into a
   corner), it walks to the reset tile and holds the action.
   Doing a push: a small stone -> walk to the cell behind it and press toward it (with a person: the computer does it,
   unless the person is already there). A heavy stone -> one stands against it and the other right behind; with a
   person it takes whichever of the two spots the person isn't on ("Line up behind me!"), then both press the same way.
   Not needed for a push: it steps out of the way. Once the door is open it walks into the doorway.
   It never moves stones by itself in a way a person couldn't, and it can't move a heavy stone alone. */
(() => {
  const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const key = (x, y) => x + ',' + y;
  // the cells a player at (sx, sy) can walk to, with stones (a Set of 'x,y') in the way
  function reach(b, stones, sx, sy, blocked) {
    const seen = new Set([key(sx, sy)]), q = [[sx, sy]];
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy] of D) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (seen.has(k) || stones.has(k) || (blocked && blocked.has(k)) || MODES.stonepuzzle.test.wall(b, nx, ny)) continue;
        seen.add(k); q.push([nx, ny]);
      }
    }
    return seen;
  }
  const minKey = set => { let m = null; for (const k of set) if (m === null || k < m) m = k; return m; };
  // push one stone (index i in list) home; returns { path: [[x, y, dx, dy]...], end: [px, py] } or null
  function one(b, list, i, gx, gy, px, py) {
    const s = list[i], others = new Set(list.filter((_, k) => k !== i).map(o => key(o.x, o.y)));
    const start = { x: s.x, y: s.y, px, py, path: [] };
    const sk = (x, y, px2, py2) => x + ',' + y + '|' + minKey(reach(b, new Set([...others, key(x, y)]), px2, py2));
    const seen = new Set([sk(s.x, s.y, px, py)]), q = [start];
    for (let n = 0; q.length && n < 4000; n++) {
      const c = q.shift();
      if (c.x === gx && c.y === gy) return { path: c.path, end: [c.px, c.py] };
      const reg = reach(b, new Set([...others, key(c.x, c.y)]), c.px, c.py);
      for (const [dx, dy] of D) {
        const bx = c.x - dx, by = c.y - dy, tx = c.x + dx, ty = c.y + dy;
        if (!reg.has(key(bx, by)) || MODES.stonepuzzle.test.wall(b, tx, ty) || others.has(key(tx, ty))) continue;
        if (s.heavy && !reg.has(key(c.x - 2 * dx, c.y - 2 * dy))) continue;
        const k2 = sk(tx, ty, c.x, c.y);
        if (seen.has(k2)) continue;
        seen.add(k2);
        q.push({ x: tx, y: ty, px: c.x, py: c.y, path: c.path.concat([[c.x, c.y, dx, dy]]) });
      }
    }
    return null;
  }
  // the next push: { x, y, dx, dy, heavy } or null (nothing to do) or false (stuck)
  function plan(b, px, py) {
    const list = b.stones.map(s => ({ x: s.x, y: s.y, g: s.g, heavy: s.heavy }));
    const home = s => b.slots.find(o => o.g === s.g);
    const mis = list.map((s, i) => i).filter(i => { const h = home(list[i]); return h.x !== list[i].x || h.y !== list[i].y; });
    if (!mis.length) return null;
    mis.sort((a, c) => (list[a].g < list[c].g ? -1 : 1));
    for (const i of mis) {
      const h = home(list[i]), r = one(b, list, i, h.x, h.y, px, py);
      if (!r || !r.path.length) continue;
      const after = list.map((s, k) => (k === i ? Object.assign({}, s, { x: h.x, y: h.y }) : s));
      const ok = mis.every(j => j === i || one(b, after, j, home(after[j]).x, home(after[j]).y, r.end[0], r.end[1]));
      if (ok) { const [x, y, dx, dy] = r.path[0]; return { x, y, dx, dy, heavy: list[i].heavy }; }
    }
    return false;
  }
  // the first step on the way from (x, y) to (tx, ty), avoiding stones and the partner; [dx, dy] or null
  function step(b, x, y, tx, ty, block) {
    if (x === tx && y === ty) return null;
    const stones = new Set(b.sunk ? [] : b.stones.map(s => key(s.x, s.y)));
    const prev = new Map([[key(x, y), null]]), q = [[x, y]];
    while (q.length) {
      const [cx, cy] = q.shift();
      if (cx === tx && cy === ty) break;
      for (const [dx, dy] of D) {
        const nx = cx + dx, ny = cy + dy, k = key(nx, ny);
        if (prev.has(k) || stones.has(k) || block.has(k) || MODES.stonepuzzle.test.wall(b, nx, ny)) continue;
        prev.set(k, [cx, cy, dx, dy]); q.push([nx, ny]);
      }
    }
    let k = key(tx, ty);
    if (!prev.has(k)) return null;
    let last = null;
    while (prev.get(k)) { const [cx, cy, dx, dy] = prev.get(k); last = [dx, dy]; k = key(cx, cy); }
    return last;
  }
  const press = (out, d) => { if (!d) return out; out.right = d[0] > 0; out.left = d[0] < 0; out.down = d[1] > 0; out.up = d[1] < 0; return out; };
  function think(st, p, o, dt, info) {
    const out = {}, ms = info.mst;
    if (!ms || !ms.b || info.intro) return out;
    const b = ms.b, P = ms.pl[p.id], Q = ms.pl[o.id];
    if (P.t < 1) return out;
    const block = new Set([key(Q.x, Q.y)]);
    const goTo = (x, y) => press(out, step(b, P.x, P.y, x, y, block));
    if (ms.state === 'exit' || ms.state === 'open') {
      const spots = [[b.door.x, b.door.y], [b.door.x, b.door.y + 1]];
      // the one nearer the door takes the door cell, the other the cell in front of it
      const dd = A => Math.abs(A.x - b.door.x) + Math.abs(A.y - b.door.y);
      const mine = dd(P) < dd(Q) || (dd(P) === dd(Q) && p.id === 0) ? spots[0] : spots[1];
      if (ms.state === 'exit') return goTo(mine[0], mine[1]);
      return goTo(b.door.x, b.door.y + 2);
    }
    if (ms.state !== 'play') return out;
    // plan again when the stones moved (or every 2 s)
    const sk = b.stones.map(s => s.x + ',' + s.y).join(';');
    st.age = (st.age || 0) + dt;
    if (st.sk !== sk || st.age > 2) { st.sk = sk; st.age = 0; st.next = plan(b, P.x, P.y); }
    const n = st.next;
    if (n === false) {
      if (!b.reset) return out;
      if (P.x === b.reset.x && P.y === b.reset.y) { out.act = true; cpuSay(p, 'Let\'s start again!'); return out; }
      return goTo(b.reset.x, b.reset.y);
    }
    if (!n) return out;
    const fx = n.x - n.dx, fy = n.y - n.dy, bx = n.x - 2 * n.dx, by = n.y - 2 * n.dy, d = [n.dx, n.dy];
    const at = (A, x, y) => A.x === x && A.y === y;
    let role;
    if (!n.heavy) {
      if (info.partnerCpu) {
        const dist = A => Math.abs(A.x - fx) + Math.abs(A.y - fy);
        role = dist(P) < dist(Q) || (dist(P) === dist(Q) && p.id === 0) ? 'front' : 'aside';
      } else role = at(Q, fx, fy) ? 'aside' : 'front';
    } else if (info.partnerCpu) role = p.id === 0 ? 'front' : 'back';
    else role = at(Q, fx, fy) ? 'back' : at(Q, bx, by) ? 'front' : 'front';
    if (role === 'aside') {
      // out of the way of the push
      if (at(P, fx, fy) || at(P, n.x + n.dx, n.y + n.dy) || (n.heavy && at(P, bx, by))) {
        for (const [dx, dy] of D) if (MODES.stonepuzzle.test.free(ms, P.x + dx, P.y + dy) && !(P.x + dx === fx && P.y + dy === fy)) return press(out, [dx, dy]);
      }
      return out;
    }
    const tx = role === 'front' ? fx : bx, ty = role === 'front' ? fy : by;
    if (!at(P, tx, ty)) {
      // the heavy stone's back spot is through the front spot: let the front player get there first
      return goTo(tx, ty);
    }
    // with a person: give them a moment to try a small stone themselves first
    if (!n.heavy && !info.partnerCpu) {
      const k2 = n.x + ',' + n.y + ',' + n.dx + ',' + n.dy;
      if (st.waitK !== k2) { st.waitK = k2; st.waitT = 0; }
      st.waitT += dt;
      if (st.waitT < 3) { if (st.waitT > 1) cpuSay(p, 'This one goes ' + ['right', 'left', 'down', 'up'][D.findIndex(q => q[0] === n.dx && q[1] === n.dy)] + '!'); return out; }
    }
    if (n.heavy) {
      const partnerSpot = role === 'front' ? [bx, by] : [fx, fy];
      if (!at(Q, partnerSpot[0], partnerSpot[1])) { if (role === 'front' && !info.partnerCpu) cpuSay(p, 'Line up behind me and push!'); return out; }
      if (!info.partnerCpu) cpuSay(p, 'Push together!');
    }
    return press(out, d);
  }
  cpuBrain('stonepuzzle', { think });
})();
