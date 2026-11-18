/* Pip & Bo - Level 41-2 Page Turner Chase: the four spreads' layouts (POPCHASE.pages) and the pure maths that turns
   one into a playable place (POPCHASE.build). No three.js here: the rules (page-turner-chase.js), the computer
   partner and the bot tests use it with drawing switched off. The pictures (popchase-art.js) read the same layout.

   Units are K3D units (1 = one 2D tile). A spread is two pages side by side: x from -pw to +pw (the gutter at x = 0),
   z from -pd/2 (the far edge) to +pd/2 (the near edge, toward the camera), the page at y = 0.
   Every route runs left to right (x never goes back) and weaves in depth. It is a corridor 2 * HALF wide with tall
   unseen walls along both sides (the pop-ups along them are the picture of those walls; a jump is 3.6 high, so the
   walls are much taller than anything drawn). Gaps cut the page across its whole depth (only the corridor can reach
   them). The Roll comes from the left.

   A spread's layout:
     title, pw, pd                  the page's name, half width, depth
     roll: { speed, head }          the Roll's speed (share of a run) and its head start (s)
     route: [[x, z], ...]           the corridor's middle line (straight runs along x or z)
     gaps: [[x0, x1], ...]          cuts across the page (a stream, a moat, the sea): falling in is a Flat
     logs: [x, ...]                 a fallen log across the corridor (0.5 high: jump it)
     pieces: [...]                  the paper machinery (kinds below), each with tabs { x, z }
     sliders: [{ x, kind, period, phase }]   paper figures sliding in a slot across the corridor at x
     marks: [{ x, z }]              bookmarks (the first is the spread's start)
     swing: [x0, x1]                the straight dash where the camera swings round behind (by the lead's x)
     dogEar: { x, z }               the folded corner that turns the page (not on the last spread)
     fingers: [{ x, z }]            where the reading finger may land (printed text, darker); none on spread 1
     decor                          the art file's name for the page's look ('wood', 'castle', 'sea', 'end')
   Pieces:
     bridge { gap, tabs: [near, far] }        a card bridge slides out of a slot over gap `gap` while a tab is held
*/
'use strict';

const POPCHASE = (function () {
  const PC = {};
  const HALF = PC.HALF = 2.2;                       // the corridor's half width
  const RUN = PC.RUN = PHYS.maxRun / K3D.U;         // a normal run, units/s (7.33)
  PC.TAB_R = 1.0;                                   // a free player within this of a tab can work it
  PC.WALL_TOP = 9;

  PC.pages = [
    /* ---------- Page 1: The Deep Dark Wood ---------- */
    {
      title: 'The Deep Dark Wood', decor: 'wood', pw: 44, pd: 24,
      roll: { speed: 0.35, head: 8 },
      route: [[-41, 5], [-24, 5], [-24, -3], [-4, -3], [-4, 5], [4, 5], [4, -3], [38, -3], [38, 11.2]],
      gaps: [[-17.5, -11], [9, 16.5]],
      logs: [-35, -29.5],
      pieces: [
        { kind: 'bridge', gap: 0, tabs: [{ x: -19, z: -4.3 }, { x: -9.4, z: -4.3 }], tip: 'One pulls the tab, one crosses. Then swap.' },
        { kind: 'bridge', gap: 1, tabs: [{ x: 7.4, z: -4.3 }, { x: 18.1, z: -4.3 }] },
      ],
      sliders: [
        { x: -7.5, kind: 'wolf', period: 5.2, phase: 0 },
        { x: 1.6, kind: 'wolf', period: 5.6, phase: 2.2 },
        { x: 12.75, kind: 'wolf', period: 4.6, phase: 1.1 },
      ],
      marks: [{ x: -39.5, z: 3.6 }, { x: -2.2, z: 3.6 }],
      swing: [19.5, 37],
      dogEar: { x: 38.5, z: 10.1 },
      fingers: [],
    },
  ];

  /* ---------- route maths ---------- */
  // the corridor's middle line as segments with their running length
  function segs(route) {
    const out = []; let s = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const [ax, az] = route[i], [bx, bz] = route[i + 1], len = Math.hypot(bx - ax, bz - az);
      out.push({ ax, az, bx, bz, len, s0: s, dx: (bx - ax) / len, dz: (bz - az) / len }); s += len;
    }
    return out;
  }
  // how far along the route a point is (the nearest point on the corridor's middle line)
  PC.progress = function (L3, x, z) {
    let best = 1e9, s = 0;
    for (const g of L3.segs) {
      const t = clamp(((x - g.ax) * g.dx + (z - g.az) * g.dz), 0, g.len);
      const px = g.ax + g.dx * t, pz = g.az + g.dz * t, d = Math.hypot(x - px, z - pz);
      if (d < best - 1e-6) { best = d; s = g.s0 + t; }
    }
    return s;
  };
  // the point on the middle line at progress s (and the way it runs there)
  PC.pointAt = function (L3, s) {
    const g = L3.segs.find(q => s <= q.s0 + q.len) || L3.segs[L3.segs.length - 1];
    const t = clamp(s - g.s0, 0, g.len);
    return { x: g.ax + g.dx * t, z: g.az + g.dz * t, dx: g.dx, dz: g.dz };
  };
  // the corridor's two side lines (mitred at the corners), for the walls and the scenery along them
  function offset(pts, d) {
    const norm = (a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [-dz / l, dx / l]; };
    return pts.map((p, i) => {
      const n1 = i > 0 ? norm(pts[i - 1], p) : norm(p, pts[i + 1]), n2 = i < pts.length - 1 ? norm(p, pts[i + 1]) : n1;
      let mx = n1[0] + n2[0], mz = n1[1] + n2[1]; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
      const k = d / Math.max(0.3, mx * n1[0] + mz * n1[1]);
      return [p[0] + mx * k, p[1] + mz * k];
    });
  }
  PC.offset = offset;

  /* ---------- building a spread ---------- */
  // -> L3: { k, def, world, segs, len, walls: [{ pts, side }], floor, gapsAt, pieces, sliders, logs, marks, ... }
  PC.build = function (k) {
    const def = PC.pages[k], pw = def.pw, pd = def.pd, solids = [];
    const L3 = { k, def, pw, pd, segs: segs(def.route), route: def.route };
    L3.len = L3.segs.reduce((a, g) => a + g.len, 0);
    // the page: slabs across the whole depth, cut at each gap
    const cuts = def.gaps.slice().sort((a, b) => a[0] - b[0]);
    let x = -pw - 2;
    for (const [g0, g1] of cuts) { solids.push({ x: (x + g0) / 2, z: 0, w: g0 - x, d: pd, y0: -1.3, y1: 0, page: true }); x = g1; }
    solids.push({ x: (x + pw + 2) / 2, z: 0, w: pw + 2 - x, d: pd, y0: -1.3, y1: 0, page: true });
    // the corridor's walls: both side lines, and caps at the start and the end
    L3.sides = [offset(def.route, HALF), offset(def.route, -HALF)];
    const wall = (ax, az, bx, bz, ox, oz) => {
      const t = 0.6, cx = (ax + bx) / 2 + ox * t / 2, cz = (az + bz) / 2 + oz * t / 2;
      const along = Math.abs(bx - ax) > Math.abs(bz - az);
      solids.push({ x: cx, z: cz, w: along ? Math.abs(bx - ax) + t * 2 : t, d: along ? t : Math.abs(bz - az) + t * 2, y0: -3, y1: PC.WALL_TOP, wall: true });
    };
    for (const side of L3.sides) for (let i = 0; i < side.length - 1; i++) {
      const g = L3.segs[i], [ax, az] = side[i], [bx, bz] = side[i + 1];
      // outward: from the middle line toward this side
      const mx = (ax + bx) / 2 - (g.ax + g.bx) / 2, mz = (az + bz) / 2 - (g.az + g.bz) / 2, ml = Math.hypot(mx, mz) || 1;
      wall(ax, az, bx, bz, mx / ml, mz / ml);
    }
    const r0 = def.route[0], r1 = def.route[1], g0 = L3.segs[0], gl = L3.segs[L3.segs.length - 1], rl = def.route[def.route.length - 1];
    solids.push({ x: r0[0] - g0.dx * 0.3, z: r0[1] - g0.dz * 0.3, w: g0.dx ? 0.6 : HALF * 2 + 1.2, d: g0.dx ? HALF * 2 + 1.2 : 0.6, y0: -3, y1: PC.WALL_TOP, wall: true, cap: true });
    solids.push({ x: rl[0] + gl.dx * 0.3, z: rl[1] + gl.dz * 0.3, w: gl.dx ? 0.6 : HALF * 2 + 1.2, d: gl.dx ? HALF * 2 + 1.2 : 0.6, y0: -3, y1: PC.WALL_TOP, wall: true, cap: true });
    void r1;
    // logs (a fallen log lies across the corridor's run at x)
    L3.logs = def.logs.map(lx => {
      const s = PC.progress(L3, lx, 0), p = PC.pointAt(L3, s);
      const sol = { x: lx, z: p.z, w: 0.62, d: HALF * 2, y0: 0, y1: 0.5, log: true };
      solids.push(sol); return { x: lx, z: p.z, sol };
    });
    // pieces
    L3.pieces = def.pieces.map((d, i) => {
      const pc = Object.assign({ i, e: 0, wait: 0, held: [false, false] }, d);
      if (d.kind === 'bridge') {
        const [x0, x1] = def.gaps[d.gap], s = PC.progress(L3, (x0 + x1) / 2, 0), p = PC.pointAt(L3, s);
        Object.assign(pc, { x0, x1, z: p.z, len: x1 - x0 });
        pc.sol = { x: x0, z: p.z, w: 0.01, d: HALF * 2 - 0.1, y0: -0.16, y1: 0, ghost: true, bridge: true };
        solids.push(pc.sol);
        pc.sIn = PC.progress(L3, x0 - 0.6, p.z); pc.sOut = PC.progress(L3, x1 + 0.6, p.z);
      }
      pc.tabs = d.tabs.map((t, j) => ({ x: t.x, z: t.z, side: j, s: PC.progress(L3, t.x, t.z) }));
      return pc;
    });
    L3.sliders = def.sliders.map(d => {
      const s = PC.progress(L3, d.x, 0), p = PC.pointAt(L3, s);
      return Object.assign({ z0: p.z - HALF + 0.45, z1: p.z + HALF - 0.45, zc: p.z, s, pos: 0, tell: 0 }, d);
    });
    L3.marks = def.marks.map(m => Object.assign({ s: PC.progress(L3, m.x, m.z), on: false }, m));
    L3.dogEar = def.dogEar ? Object.assign({ s: PC.progress(L3, def.dogEar.x, def.dogEar.z) }, def.dogEar) : null;
    L3.swing = def.swing;
    L3.fingers = def.fingers.slice();
    L3.world = MOVER3.world(solids);
    // where a player stands at the start (the first bookmark), facing right
    L3.start = def.marks[0];
    return L3;
  };

  // is there walkable floor (at about height y) under (x, z), clear of walls? (flutter landings, bumps)
  PC.standable = function (L3, x, z, y = 0) {
    const f = MOVER3.floorAt(L3.world, x, z, y + 0.3, 0);
    if (!(f > y - 0.3)) return false;
    const b = { x, z, vx: 0, vz: 0 };
    MOVER3.push(L3.world, b, MOVER3.r + 0.05, f);
    return Math.hypot(b.x - x, b.z - z) < 1e-4;
  };
  // is the straight way from a to b on floor the whole way (no gap, no wall)?
  PC.walkable = function (L3, a, b, y = 0) {
    const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.25));
    for (let i = 0; i <= n; i++) if (!PC.standable(L3, a.x + (b.x - a.x) * i / n, a.z + (b.z - a.z) * i / n, y)) return false;
    return true;
  };
  return PC;
})();
