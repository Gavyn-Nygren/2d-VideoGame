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
     crests: [{ gap, rows: [{ x, period, phase }] }]   stepping-stone wave crests sliding across the corridor in a gap
     fingerEvery: [min, max]        seconds between the reading finger's visits (none without fingers)
   Pieces (every one takes two; tabs are { x, z }, worked by holding the action button within TAB_R):
     bridge { gap, tabs: [near, far] }        a card bridge slides out of a slot over gap `gap` while a tab is held
     flap { x, look, tabs: [near, far] }      a tall flap standing across the corridor at x; held open from either side
     twin { does, tabs: [a, b], gap | x }     two tabs that work only held together; once popped it stays up:
                                              does 'drawbridge' (over gap), 'stair' (over a wall at x), 'end' (the finish)
     wheel { gap, look, tabs: [near, far] }   a plank / beam over gap: a tab with wheel: true is turned (hold the button and
                                              push right) until it is laid; a plain tab raises it by itself while held.
                                              It stays while held and drops 0.4 s after letting go (riders carried off)
     ship { gap, strip: [x0, x1, z], tabs: [far] }   a galleon on a slot over gap: holding the strip tab and walking it
                                              from x0 back to x1 sails the ship across; empty and unheld it sails home;
                                              the far tab pulls it across from the far bank
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
    /* ---------- Page 2: The Castle ---------- */
    {
      title: 'The Castle', decor: 'castle', pw: 44, pd: 24,
      roll: { speed: 0.42, head: 6 },
      route: [[-41, 6], [-30, 6], [-30, -2], [-10, -2], [-10, 6], [10, 6], [10, -4], [38, -4], [38, 11.2]],
      gaps: [[-26, -19.5], [-7, -1]],
      logs: [-36.5],
      pieces: [
        { kind: 'twin', does: 'drawbridge', gap: 0, tabs: [{ x: -27.6, z: -3.8 }, { x: -27.6, z: -0.2 }], tip: 'A castle! Two tabs, two of you. Pull together!' },
        { kind: 'flap', x: -14.5, look: 'portcullis', tabs: [{ x: -16.7, z: -3.8 }, { x: -12.3, z: -3.8 }], tip: 'One holds the gate up, one runs under.' },
        { kind: 'wheel', gap: 1, look: 'turntable', tabs: [{ x: -8.6, z: 7.6, wheel: true }, { x: 0.6, z: 7.6 }], tip: 'Turn the wheel: hold it and push right.' },
      ],
      sliders: [
        { x: 15.5, kind: 'guard', period: 4.8, phase: 0.6 },
        { x: 20.5, kind: 'guard', period: 4.4, phase: 2.4 },
      ],
      marks: [{ x: -39.5, z: 4.6 }, { x: 2.4, z: 4.6 }, { x: 12.6, z: -5.4 }],
      swing: [24, 37],
      dogEar: { x: 38.5, z: 10.1 },
      fingers: [{ x: -10, z: 1.2 }, { x: -9.6, z: 4.4 }, { x: 10, z: 1.5 }, { x: 18, z: -3.6 }, { x: 22.6, z: -4.4 }],
      fingerEvery: [9, 13],
    },
    /* ---------- Page 3: The Stormy Sea ---------- */
    {
      title: 'The Stormy Sea', decor: 'sea', pw: 44, pd: 24,
      roll: { speed: 0.4, head: 10 },
      route: [[-41, 4], [-17, 4], [-17, -4], [2, -4], [2, 4], [14, 4], [14, -5], [38, -5], [38, 11.2]],
      gaps: [[-33, -21], [-14.4, -3.6], [19.5, 26]],
      logs: [34.5],
      pieces: [
        { kind: 'ship', gap: 0, strip: [-35, -39, 5.6], tabs: [{ x: -19.4, z: 5.6 }], tip: 'One rides the ship, one walks the long tab back to sail it.' },
        { kind: 'flap', x: 8, look: 'wave', tabs: [{ x: 5.9, z: 5.6 }, { x: 10.1, z: 5.6 }], tip: 'Hold the great wave open like a tunnel!' },
        { kind: 'wheel', gap: 2, look: 'beam', tabs: [{ x: 17.4, z: -6.6, wheel: true }, { x: 28, z: -6.6, wheel: true }], tip: 'Turn the lighthouse wheel: its light makes a bridge.' },
      ],
      // one swell rolling through the rows (each an eighth of a turn behind the last), so neighbours line up often
      crests: [{ gap: 1, rows: [{ x: -12.6, period: 3.6, phase: 0.9 }, { x: -9, period: 3.6, phase: 0.45 }, { x: -5.4, period: 3.6, phase: 0 }] }],
      sliders: [
        { x: 11.8, kind: 'shark', period: 4.6, phase: 1.2 },
        { x: 32, kind: 'shark', period: 4.2, phase: 0.4 },
      ],
      marks: [{ x: -39.5, z: 2.6 }, { x: 1, z: 0 }, { x: 14.6, z: -6.2 }],
      swing: [28.5, 37],
      dogEar: { x: 38.5, z: 10.1 },
      fingers: [{ x: -17, z: 1.2 }, { x: -16.6, z: -2 }, { x: 2.4, z: -1.8 }, { x: 2.6, z: 2.4 }, { x: 5.2, z: 3.6 }, { x: 14, z: 1 }, { x: 14.4, z: -2.4 }],
      fingerEvery: [6, 9],
    },
    /* ---------- Page 4: The End ---------- */
    {
      title: 'The End', decor: 'end', pw: 44, pd: 24,
      roll: { speed: 0.55, head: 9 },
      route: [[-41, 0], [-12, 0], [-12, 5], [14, 5], [14, -3], [40, -3]],
      gaps: [[-31, -24.5]],
      logs: [-37.5, 10.5],
      pieces: [
        { kind: 'bridge', gap: 0, tabs: [{ x: -33, z: -1.6 }, { x: -22.5, z: -1.6 }] },
        { kind: 'flap', x: -3, look: 'door', tabs: [{ x: -5.1, z: 6.6 }, { x: -0.9, z: 6.6 }] },
        { kind: 'twin', does: 'stair', x: 24, tabs: [{ x: 17, z: -4.7 }, { x: 18.4, z: -1.3 }] },
        { kind: 'twin', does: 'end', tabs: [{ x: 35.4, z: -4.6 }, { x: 35.4, z: -1.4 }], tip: 'Pull The End together!' },
      ],
      sliders: [
        { x: -18.5, kind: 'wolf', period: 4.0, phase: 0.3 },
        { x: -15, kind: 'guard', period: 4.2, phase: 2.0 },
        { x: 7, kind: 'shark', period: 3.8, phase: 1.0 },
      ],
      marks: [{ x: -39.5, z: -1.4 }, { x: 2.5, z: 3.6 }],
      swing: [-46, 46],
      dogEar: null,
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
  // the point on the middle line of the straight run along x that covers x (routes never go back in x, so there is
  // one; at a bend the run ending there). Pieces, logs, sliders and crests stand across such runs.
  PC.runAt = function (L3, x) {
    let g = L3.segs.find(q => Math.abs(q.dx) > 0.5 && x >= Math.min(q.ax, q.bx) - 1e-6 && x <= Math.max(q.ax, q.bx) + 1e-6);
    if (!g) g = L3.segs.reduce((a, q) => (Math.abs(q.dx) > 0.5 && Math.min(Math.abs(x - q.ax), Math.abs(x - q.bx)) < Math.min(Math.abs(x - a.ax), Math.abs(x - a.bx)) ? q : a), L3.segs[0]);
    const t = clamp((x - g.ax) * g.dx, 0, g.len);
    return { x: g.ax + g.dx * t, z: g.az + g.dz * t, dx: g.dx, dz: g.dz, s: g.s0 + t };
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
      // (only a hair longer than the side line: at an inside corner a longer wall would poke into the next run)
      solids.push({ x: cx, z: cz, w: along ? Math.abs(bx - ax) + 0.05 : t, d: along ? t : Math.abs(bz - az) + 0.05, y0: -3, y1: PC.WALL_TOP, wall: true });
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
      const p = PC.runAt(L3, lx);
      const sol = { x: lx, z: p.z, w: 0.62, d: HALF * 2, y0: 0, y1: 0.5, log: true };
      solids.push(sol); return { x: lx, z: p.z, sol };
    });
    // pieces
    L3.pieces = def.pieces.map((d, i) => {
      const pc = Object.assign({ i, e: 0, wait: 0, held: [false, false] }, d);
      d = Object.assign({}, d);
      if (d.kind === 'bridge') {
        const [x0, x1] = def.gaps[d.gap], p = PC.runAt(L3, (x0 + x1) / 2);
        Object.assign(pc, { x0, x1, z: p.z, len: x1 - x0 });
        pc.sol = { x: x0, z: p.z, w: 0.01, d: HALF * 2 - 0.1, y0: -0.16, y1: 0, ghost: true, bridge: true };
        solids.push(pc.sol);
        pc.sIn = PC.progress(L3, x0 - 0.6, p.z); pc.sOut = PC.progress(L3, x1 + 0.6, p.z);
      }
      // a wall across the corridor at x (a flap, or the wall a stair goes over)
      const across = (x, y1) => { const p = PC.runAt(L3, x); return { x, z: p.z, w: 0.5, d: HALF * 2 + 0.6, y0: -0.2, y1, wall: true, piece: true }; };
      // a plank over a gap (bridge-like), solid only when laid
      const plank = (gi, full) => {
        const [x0, x1] = def.gaps[gi], p = PC.runAt(L3, (x0 + x1) / 2);
        Object.assign(pc, { x0, x1, z: p.z, len: x1 - x0 });
        pc.sol = { x: full ? (x0 + x1) / 2 : x0, z: p.z, w: full ? x1 - x0 + 0.8 : 0.01, d: HALF * 2 - 0.1, y0: -0.16, y1: 0, ghost: true, bridge: true };
        solids.push(pc.sol);
        pc.sIn = PC.progress(L3, x0 - 0.6, p.z); pc.sOut = PC.progress(L3, x1 + 0.6, p.z);
      };
      if (d.kind === 'flap') {
        pc.sol = across(d.x, PC.WALL_TOP); solids.push(pc.sol); pc.z = pc.sol.z;
      } else if (d.kind === 'twin') {
        pc.popped = false; pc.both = 0;
        if (d.does === 'drawbridge') plank(d.gap, true);
        else if (d.does === 'stair') {
          // a wall too tall to jump (4.2); popped, it is a paper stair: a ramp up, a step over the wall's top, a ramp down
          const wl = across(d.x, 4.2); pc.wall = wl; pc.z = wl.z; solids.push(wl);
          // (the ramps end a lip above the top step, so a body on the slope never meets the step's edge as a wall)
          const run = 4.2, top = 4.2, lip = 0.15, z = wl.z, dd = HALF * 2 - 0.1;
          pc.stair = [
            { x: d.x - 0.6 - run / 2, z, w: run, d: dd, y0: 0, y1: top + lip, ramp: { h0: 0, h1: top + lip }, ghost: true, stair: true },
            { x: d.x, z, w: 1.2, d: dd, y0: 0, y1: top, ghost: true, stair: true },
            { x: d.x + 0.6 + run / 2, z, w: run, d: dd, y0: 0, y1: top + lip, ramp: { h0: top + lip, h1: 0 }, ghost: true, stair: true },
          ];
          solids.push(...pc.stair);
        }
      } else if (d.kind === 'wheel') {
        plank(d.gap, true);
      } else if (d.kind === 'ship') {
        const [x0, x1] = def.gaps[d.gap], p = PC.runAt(L3, (x0 + x1) / 2), half = 2.1;
        Object.assign(pc, { x0, x1, z: p.z, half, u: 0, home: x0 + half, far: x1 - half, sx0: d.strip[0], sx1: d.strip[1], sz: d.strip[2] });
        pc.sol = { x: pc.home, z: p.z, w: half * 2, d: HALF * 2 - 0.2, y0: -0.3, y1: 0, ship: true };
        solids.push(pc.sol);
        // the strip's tab (it moves with the ship: walked back from x0 toward x1) and the far bank's tab
        d = Object.assign({}, d, { tabs: [{ x: d.strip[0], z: d.strip[2], strip: true }].concat(d.tabs) });
      }
      pc.tabs = d.tabs.map((t, j) => ({ x: t.x, z: t.z, side: j, s: PC.progress(L3, t.x, t.z), wheel: !!t.wheel, strip: !!t.strip }));
      return pc;
    });
    // wave crests: stepping stones (1.4 square, their tops at the page) sliding across the corridor in a gap
    L3.crests = [];
    for (const cr of def.crests || []) {
      const [x0, x1] = def.gaps[cr.gap], p = PC.runAt(L3, (x0 + x1) / 2);
      for (const row of cr.rows) {
        const sol = { x: row.x, z: p.z, w: 1.4, d: 1.4, y0: -0.6, y1: 0, crest: true };
        solids.push(sol);
        L3.crests.push(Object.assign({ sol, zc: p.z, amp: HALF - 0.75 }, row));
      }
    }
    L3.fingerSpots = (def.fingers || []).slice();
    L3.sliders = def.sliders.map(d => {
      const p = PC.runAt(L3, d.x), s = p.s;
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
