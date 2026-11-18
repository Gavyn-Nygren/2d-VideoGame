/* Pip & Bo - World 41 Pop-Up Storybook, 41-1 Carry It Together: the four pages' plans (global POPCARRY).
   Pure data and maths, loaded with the game (no three.js), so the rules and the bots run with drawing switched off.
   The 3D scenery for each plan is built by js/levels/world41/popup-scenes.js (loaded on demand with the 3D kit).

   Units are K3D units (1 = one 2D tile), Y up, the open book's pages at y = 0. A spread is two pages side by side:
   x from -PW to PW (the fold at x = 0), z from -PD/2 (far edge) to PD/2 (near edge, toward the viewer).

   A page plan:
     name, tip, worm (the Bookworm's line on the intro card)
     solids    MOVER3 solids. Each may carry: kind (what the scene builds: 'page', 'hedge', 'post', 'gate', 'bank', ...),
               wall: true (the pencil is stopped by it, along its whole length; floors, ramps and banks never stop it),
               id (lines and mechanisms switch solids on and off by id: ghost when off)
     route     the authored line the pencil's middle follows from start to exit: [[x, z], ...] (the computer partner, the
               camera's look-ahead, the ink and respawns all measure progress along it)
     start     { pencil: [x, z, angle], players: [[x, z], [x, z]] }
     marks     bookmarks: route distances (s) where a drop restarts; the first is the start
     lines     dotted lines: { id, pts: [[x, z], ...], y, done: { off: [ids], on: [ids] }, what } (what pops up)
     exit      { x, z, r }: the pencil's middle carried within r (both holding) turns the page
     water     [[x0, z0, x1, z1], ...]: landing here (on the river, the page far below) is a Splash
     cam       { heading, pitch }
*/
'use strict';

const POPCARRY = (function () {
  const PW = 34, PD = 42, U = {};
  /* ---------- small 2D helpers ---------- */
  U.norm = (a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [-dz / l, dx / l]; };
  // a polyline moved sideways by d (left of travel for d > 0), with mitred corners
  U.offset = function (pts, d) {
    return pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const n1 = i > 0 ? U.norm(pts[i - 1], p) : U.norm(p, b), n2 = i < pts.length - 1 ? U.norm(p, pts[i + 1]) : U.norm(a, p);
      let mx = n1[0] + n2[0], mz = n1[1] + n2[1]; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
      const k = d / Math.max(0.3, mx * n1[0] + mz * n1[1]);
      return [p[0] + mx * k, p[1] + mz * k];
    });
  };
  U.segDist = function (x, z, a, b) {
    const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2));
    return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
  };
  U.lineDist = function (x, z, pts) { let d = 1e9; for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, U.segDist(x, z, pts[i], pts[i + 1])); return d; };
  // a route with lengths: at(s) -> { x, z, tx, tz } and project(x, z, near) -> s
  U.route = function (pts) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const R = { pts, cum, len: cum[cum.length - 1] };
    R.at = function (s) {
      s = Math.max(0, Math.min(R.len, s));
      let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
      const a = pts[i - 1], b = pts[i], l = cum[i] - cum[i - 1] || 1, t = (s - cum[i - 1]) / l;
      return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, tx: (b[0] - a[0]) / l, tz: (b[1] - a[1]) / l, i };
    };
    // the nearest point's s; with near given, only within +-win of it (so a route that doubles back never jumps)
    R.project = function (x, z, near, win = 6) {
      let best = 0, bd = 1e9;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)), s = cum[i] + t * Math.sqrt(l2);
        if (near != null && Math.abs(s - near) > win) continue;
        const d = Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
        if (d < bd) { bd = d; best = s; }
      }
      return bd < 1e9 ? best : (near || 0);
    };
    return R;
  };
  // a dotted line's dots: a smooth curve through pts (Catmull-Rom), spaced every gap along it (the art draws these same
  // dots, so the rules and the picture always agree)
  U.dots = function (pts, gap = 0.32) {
    const P = [pts[0]].concat(pts, [pts[pts.length - 1]]), dense = [];
    for (let i = 1; i < P.length - 2; i++) for (let k = 0; k < 24; k++) {
      const t = k / 24, t2 = t * t, t3 = t2 * t, a = P[i - 1], b = P[i], c = P[i + 1], d = P[i + 2];
      const f = (j) => 0.5 * (2 * b[j] + (-a[j] + c[j]) * t + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t2 + (-a[j] + 3 * b[j] - 3 * c[j] + d[j]) * t3);
      dense.push([f(0), f(1)]);
    }
    dense.push(pts[pts.length - 1]);
    const R = U.route(dense), n = Math.max(2, Math.round(R.len / gap)), out = [];
    for (let k = 0; k <= n; k++) { const q = R.at(R.len * k / n); out.push([q.x, q.z]); }
    out.len = R.len;
    return out;
  };
  // a wall box along a segment (for hedges, fences, railings)
  U.wallSeg = function (a, b, t, h, o = {}) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return Object.assign({ x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, w: len + (o.ext || 0), d: t, y0: o.y0 || 0, y1: (o.y0 || 0) + h, rot: -Math.atan2(b[1] - a[1], b[0] - a[0]), wall: true }, o.extra || {});
  };

  /* ---------- Page 1: The Hedge Garden ----------
     One hedge-lined path (2.8 wide) from the round start plaza on the left page to the locked gate at the far right of
     the right page. Where it crosses the book's fold, a paper ridge pops up across it: its dotted line draws a stile
     over the fold. At the gate the dotted arch draws the archway open. Nothing here can be dropped. */
  const P1 = (function () {
    const PLAZA = { x: -27, z: 14.5, r: 3.75 };
    const ROUTE = [
      // (2026-11-18: the last two legs moved 3 west so the pencil can lie along the stile's dotted line before the fold)
      [[-27, 11.1], [-27, 2], [-20, 2], [-20, -6], [-29, -6], [-29, -14], [-15, -14], [-15, -4], [-9, -4], [-9, 8], [-1.2, 8]],
      [[1.2, 8], [6, 8], [6, -2], [14, -2], [14, 10], [24, 10], [24, -8], [14, -8], [14, -15], [27.1, -15]],
    ];
    const HALF = 1.71, TALL = 1.15, LOW = 0.62, T = 0.62;
    const GATE = { x: 27.4, z: -15 }, FOUNTAIN = { x: -14, z: 11 }, SUNDIAL = { x: 19, z: 1 }, POND = { x0: 16.5, z0: 14.6, x1: 30.5, z1: 19.8 };
    // the hedge runs of one route part: both walls, split where the height changes (low on the viewer's side of a
    // crosswise run, so the path is always in view)
    function hedgeRuns(pts) {
      const runs = [];
      for (const d of [HALF, -HALF]) {
        const w = U.offset(pts, d);
        let cur = null;
        for (let i = 0; i < w.length - 1; i++) {
          const horiz = Math.abs(pts[i + 1][1] - pts[i][1]) < 0.01, sideZ = w[i][1] - pts[i][1];
          const h = horiz && sideZ > 0 ? LOW : TALL;
          if (!cur || cur.h !== h) { cur = { h, pts: [w[i]] }; runs.push(cur); }
          cur.pts.push(w[i + 1]);
        }
      }
      return runs;
    }
    const runs = [].concat(...ROUTE.map(hedgeRuns));
    const ring = [], gap = Math.asin((HALF + 0.31) / PLAZA.r) + 0.02;
    for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + gap + i / 16 * (Math.PI * 2 - gap * 2); ring.push([PLAZA.x + Math.cos(a) * PLAZA.r, PLAZA.z + Math.sin(a) * PLAZA.r]); }
    const solids = [{ kind: 'page', x: 0, z: 0, w: PW * 2, d: PD, y0: -1.3, y1: 0 }];
    for (const run of runs) {
      for (let i = 0; i < run.pts.length - 1; i++) solids.push(U.wallSeg(run.pts[i], run.pts[i + 1], T, run.h, { ext: T, extra: { kind: 'hedge' } }));
      for (const p of run.pts) solids.push({ kind: 'post', x: p[0], z: p[1], w: T + 0.16, d: T + 0.16, y0: 0, y1: run.h < 0.8 ? run.h + 0.1 : run.h * 1.14, wall: true });
    }
    for (let i = 0; i < ring.length - 1; i++) solids.push(U.wallSeg(ring[i], ring[i + 1], 0.4, 0.45, { ext: 0.1, extra: { kind: 'hedge' } }));
    // the gate: two brick pillars and the locked iron gate between them (the arch's line opens it)
    for (const s of [-1, 1]) solids.push({ kind: 'pillar', x: GATE.x, z: GATE.z + s * 1.7, w: 0.6, d: 0.6, y0: 0, y1: 1.9, wall: true });
    solids.push({ kind: 'gate', id: 'gate', x: GATE.x, z: GATE.z, w: 0.3, d: 2.8, y0: 0, y1: 1.6, wall: true });
    // the fold: a paper ridge across the path (and low card flaps along the fold either side, so the path stays a path)
    solids.push({ kind: 'ridge', id: 'ridge', x: 0, z: 8, w: 0.5, d: 3.4, y0: 0, y1: 0.75, wall: true });
    for (const s of [-1, 1]) solids.push({ kind: 'flap', x: 0, z: 8 + s * (HALF + 0.05), w: 2.6, d: 0.12, y0: 0, y1: 0.75, wall: true });
    // the stile the line draws: up, over, down, as wide as the path between the flaps (walkable, never stops the
    // pencil); off until drawn
    solids.push({ kind: 'stile', id: 'stileA', ghost: true, x: -0.95, z: 8, w: 1.3, d: 3.4, y0: 0, y1: 0.75, ramp: { h0: 0, h1: 0.75 } });
    solids.push({ kind: 'stile', id: 'stileT', ghost: true, x: 0, z: 8, w: 0.62, d: 3.4, y0: 0, y1: 0.75 });
    solids.push({ kind: 'stile', id: 'stileB', ghost: true, x: 0.95, z: 8, w: 1.3, d: 3.4, y0: 0, y1: 0.75, ramp: { h0: 0.75, h1: 0 } });
    const route = [[PLAZA.x, PLAZA.z]].concat(ROUTE[0].slice(0, -1), ROUTE[1].slice(1), [[32.6, -15]]);
    return {
      name: 'The Hedge Garden', tip: 'Each grab one end. Walls stop the pencil, so swing it round the corners.',
      worm: 'My pencil! Oh, do be careful round the corners. It is a very long pencil.',
      solids, route, cam: { heading: 0, pitch: 50 },
      // the pencil lies in the plaza pointing up the way out (the point leads), a glowing prompt at each end
      start: { pencil: [PLAZA.x, PLAZA.z, -Math.PI / 2], players: [[PLAZA.x + 1.0, PLAZA.z + 2.9], [PLAZA.x + 1.0, PLAZA.z - 2.9]] },
      marks: [0, 40, 85],
      lines: [
        { id: 'stile', what: 'a stile over the fold', pts: [[-4.5, 8.45], [-3.7, 7.75], [-2.8, 7.65], [-1.9, 8.15], [-1.1, 8.35]], done: { off: ['ridge'], on: ['stileA', 'stileT', 'stileB'] } },
        // (a shallow bow across the path right at the gate, curved the way the point swings when its holder steps
        // sideways: a pair pushed up against the gate can still draw it, with nobody having to back up)
        { id: 'arch', what: 'the garden gate', pts: [[26.0, -16.0], [26.25, -15.5], [26.35, -15], [26.25, -14.5], [26.0, -14.0]], done: { off: ['gate'], on: [] } },
      ],
      exit: { x: 29.4, z: -15, r: 1.4 },
      water: [],
      // for the scenery (popup-scenes.js) and the look proof
      art: { PLAZA, ROUTE, HALF, TALL, LOW, GATE, FOUNTAIN, SUNDIAL, POND, runs, ring, hedgeRuns },
    };
  })();

  /* ---------- Page 2: The Folded Bridges ----------
     A gorge: card cliffs (banks, top at BANK) over a river of blue tissue on the page far below. Accordion-fold bridges
     1.6 wide with no rails; an island where the way turns a right angle; a broken bridge drawn by a dotted line along the
     near bank; a seesaw on a fold. Stepping off anything is a Splash. */
  const P2 = (function () {
    const B = 2.2, solids = [{ kind: 'river', x: 0, z: 0, w: PW * 2, d: PD, y0: -1.3, y1: 0 }];
    const bank = (x0, z0, x1, z1, o) => solids.push(Object.assign({ kind: 'bank', x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0, y0: 0, y1: B }, o || {}));
    const bridge = (x0, z0, x1, z1, o) => solids.push(Object.assign({ kind: 'bridge', x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0, y0: B - 0.14, y1: B }, o || {}));
    bank(-33, -8, -22, 8);                 // A: the start
    bridge(-22.1, -0.8, -12.9, 0.8);       // 1: to the island
    bank(-13, -3.5, -6, 3.5, { kind: 'island' });
    bridge(-10.3, -12.1, -8.7, -3.4);      // 2: the island to the far bank
    bank(-13, -19, 4, -12);                // B: the far bank, where the broken bridge is drawn
    for (let k = 0; k < 6; k++) bridge(4 + k - 0.04, -16.3, 5.04 + k, -14.7, { kind: 'plank', id: 'plank' + k, ghost: true, n: k });
    bank(10, -19, 20, -6);                 // C: before the seesaw
    // the seesaw: a plank 10 long on a fold at its middle, along z (local x runs south, +z); its ends' heights are
    // set every step (MODES.popcarry, seesaw rules): level at the banks' height
    solids.push({ kind: 'seesaw', id: 'seesaw', x: 15, z: -1, w: 10.2, d: 1.6, rot: -Math.PI / 2, y0: B - 1.6, y1: B, ramp: { h0: 1.6, h1: 1.6 } });
    bank(10, 4, 33, 19);                   // D: the landing and the way on
    const route = [[-28, 0], [-9.5, 0], [-9.5, -15.5], [15, -15.5], [15, 10], [32.2, 10]];
    return {
      name: 'The Folded Bridges', tip: 'Single file on the bridges. Whoever is outside a corner swings wide.',
      worm: 'Single file, please. One in front, one behind. And don\'t look down.',
      solids, route, cam: { heading: 0, pitch: 52 }, floorY: B, single: true, wide: 2.4,
      start: { pencil: [-28, 0.6, 0], players: [[-31.4, 1.3], [-24.6, 1.3]] },
      marks: [0, 18.5, 62],
      lines: [
        // (a gentle wave along the middle of the way to the gap, never further from it than the point may be from
        // a dot: a pair that came round the corner too wide and walked past it only has to back straight up and walk
        // on again, with no turning. A line that started back by the bridge and curved in could not be reached by the
        // point once the one behind had walked on along the path.)
        { id: 'bridge', what: 'the broken bridge', pts: [[-4.5, -15.5], [-2.6, -15.25], [-0.7, -15.5], [1.2, -15.75], [3.0, -15.5]], y: B,
          done: { off: [], on: ['plank0', 'plank1', 'plank2', 'plank3', 'plank4', 'plank5'], stagger: 0.1 } },
      ],
      seesaw: { id: 'seesaw', x: 15, z: -1, half: 5.1, axis: 'z', y: B, calm: 1.5, tip: 1.0 },
      exit: { x: 28.5, z: 10, r: 1.8 },
      splash: true, fallY: B - 0.9,
      art: { B, mill: [-1, 3.5], boats: [[-18, 9], [4, -6], [-24, -14], [26, -2]] },
    };
  })();

  /* ---------- Page 3: Clockwork Town ----------
     A street of pop-up shop fronts (walls, 3.4 apart) with two pull-tab doors, a paper train crossing, then the clock
     tower: a spiral ramp 2.6 wide winding 1.25 turns up its outside, rising 6, with a card railing that has two torn
     gaps. The camera circles with the players on the tower. */
  const P3 = (function () {
    const HALF3 = 1.7, SH = 2.6, solids = [{ kind: 'page', x: 0, z: 0, w: PW * 2, d: PD, y0: -1.3, y1: 0 }];
    const STREET = [[-31, -10], [-6, -10], [-6, 6.6], [17.2, 6.6]];
    const TOWER = { x: 21, z: 2, rIn: 3.2, rOut: 5.8, rise: 6, turns: 1.25, a0: Math.PI / 2, dir: -1, gaps: [[0.36, 0.42], [0.7, 0.76]] };
    // shop fronts both sides of the street (low on the viewer's side of a crosswise run, as page 1's hedges)
    const walls = [];
    for (const d of [HALF3, -HALF3]) {
      const w = U.offset(STREET, d);
      for (let i = 0; i < w.length - 1; i++) {
        const horiz = Math.abs(STREET[i + 1][1] - STREET[i][1]) < 0.01, near = horiz && w[i][1] - STREET[i][1] > 0;
        const h = near ? 0.9 : SH;
        walls.push({ a: w[i], b: w[i + 1], h, near });
        solids.push(U.wallSeg(w[i], w[i + 1], 0.5, h, { ext: 0.5, extra: { kind: 'shop', near } }));
      }
    }
    // the start square's back wall (behind the start) and the pull-tab doors across the street
    solids.push({ kind: 'shop', x: -31.6, z: -10, w: 0.5, d: 3.9, y0: 0, y1: SH, wall: true });
    const doors = [{ id: 'door1', x: -21, z: -10, phase: 0 }, { id: 'door2', x: -14, z: -10, phase: 2.2 }];
    for (const d of doors) solids.push({ kind: 'door', id: d.id, x: d.x, z: d.z, w: 0.3, d: HALF3 * 2, y0: 0, y1: 2.2, wall: true, door: true });
    // the train: a little engine and two carriages on a track along x crossing the second street at z = -1
    const train = { id: 'train', z: -1, x0: -15, x1: 4, len: 4.6, speed: 6.6, period: 7, warn: 1.5, offset: 3.0 };
    solids.push({ kind: 'train', id: 'train', x: train.x0 - 5, z: train.z, w: train.len, d: 1.3, y0: 0, y1: 1.5, wall: true, ghost: true });
    // the tower (an octagon of four crossed bars, each as wide as the octagon and one side thick: their corners are
    // the octagon's corners, so nothing sticks out onto the ramp) and its spiral ramp, made of short ramp pieces with
    // a railing outside
    const tw = TOWER.rIn * Math.cos(Math.PI / 8) * 2, tside = tw * Math.tan(Math.PI / 8);
    for (let k = 0; k < 4; k++) solids.push({ kind: 'tower', x: TOWER.x, z: TOWER.z, w: tw, d: tside, rot: k * Math.PI / 4, y0: 0, y1: TOWER.rise, wall: true });
    const N = 34, rMid = (TOWER.rIn + TOWER.rOut) / 2, wR = TOWER.rOut - TOWER.rIn;
    const angAt = u => TOWER.a0 + TOWER.dir * u * TOWER.turns * Math.PI * 2;
    TOWER.at = (u, r = rMid) => { const a = angAt(u); return [TOWER.x + Math.cos(a) * r, TOWER.z + Math.sin(a) * r]; };
    TOWER.angAt = angAt; TOWER.rMid = rMid;
    // the landing at the top runs on a little past u = 1, flat
    const UEND = 1.1, uOf = k => k / N * UEND, hOf = u => Math.min(1, u) * TOWER.rise;
    for (let k = 0; k < N; k++) {
      const u0 = uOf(k), u1 = uOf(k + 1), a = TOWER.at(u0), b = TOWER.at(u1);
      const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const h0 = hOf(u0), h1 = hOf(u1), y0 = Math.min(h0, h1) - 0.35;
      solids.push({ kind: 'ramp', x: mx, z: mz, w: len * 1.18, d: wR, rot: -Math.atan2(b[1] - a[1], b[0] - a[0]), y0, y1: Math.max(h0, h1), ramp: { h0: h0 - y0, h1: h1 - y0 }, u: (u0 + u1) / 2 });
      const um = (u0 + u1) / 2, gap = TOWER.gaps.some(([g0, g1]) => um > g0 && um < g1);
      if (!gap) {
        const ra = TOWER.at(u0, TOWER.rOut + 0.12), rb = TOWER.at(u1, TOWER.rOut + 0.12);
        solids.push(U.wallSeg(ra, rb, 0.18, 0.95, { ext: 0.2, y0: Math.min(h0, h1) - 0.05, extra: { kind: 'rail', u: um } }));
      }
    }
    TOWER.uEnd = UEND; TOWER.N = N;
    // the route: the street, then round the ramp at its middle line (sampled), then the landing
    const route = [[-29, -10], [-6, -10], [-6, 6.6], [TOWER.x - 1.5, 6.6]];
    for (let k = 1; k <= 40; k++) route.push(TOWER.at(k / 40 * 1.06));
    return {
      name: 'Clockwork Town', tip: 'Wait for the doors and the train, then go together. Up the tower, stay along the ramp.',
      worm: 'The doors mind their own time. Wait for them, then go, go, go!',
      solids, route, cam: { heading: 0, pitch: 50 },
      start: { pencil: [-27.4, -10, 0], players: [[-30.6, -9.2], [-24.2, -9.2]] },
      marks: [0, 20, 58],
      lines: [],
      doors, doorT: { open: 3.0, tick: 0.6, shut: 1.6 }, train, tower: TOWER,
      // (r: the leader standing at the end of the landing is enough; nobody has to squeeze on past the route's end)
      exit: { x: TOWER.at(1.06)[0], z: TOWER.at(1.06)[1], r: 3.2, y: TOWER.rise - 0.5 },
      fallY: -0.5, fallH: 0.9,
      art: { STREET, HALF3, SH, walls },
    };
  })();

  /* ---------- Page 4: The Last Page ----------
     A blank white page with three dotted lines that draw the way: stairs up onto a card rise, a bridge over a torn
     hole, a ramp up to the Bookworm's desk with the pencil pot. The ink spills from behind. */
  const P4 = (function () {
    const R1 = 1.2, R3 = 2.6, solids = [];
    // the page, in four pieces round the torn hole (x 2..8, z -6..4)
    const HOLE = { x0: 2, z0: -6, x1: 8, z1: 4 };
    const box = (kind, x0, z0, x1, z1, y0, y1, o) => solids.push(Object.assign({ kind, x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0, y0, y1 }, o || {}));
    box('page', -PW, -PD / 2, HOLE.x0, PD / 2, -1.3, 0);
    box('page', HOLE.x1, -PD / 2, PW, PD / 2, -1.3, 0);
    box('page', HOLE.x0, -PD / 2, HOLE.x1, HOLE.z0, -1.3, 0);
    box('page', HOLE.x0, HOLE.z1, HOLE.x1, PD / 2, -1.3, 0);
    box('rise', -12, -6, 2, 20, 0, R1);             // rise 1, up the stairs
    box('rise', 8, -20, 33, 4, 0, R1);              // rise 2, past the hole
    box('rise', 22, -20, 33, -8, 0, R3);            // the desk's rise
    // what the lines draw: the stairs, the bridge (plank by plank), the ramp
    solids.push({ kind: 'stairs', id: 'stairs', ghost: true, x: -15, z: 12, w: 6.1, d: 2.8, y0: 0, y1: R1, ramp: { h0: 0, h1: R1 } });
    for (let k = 0; k < 6; k++) box('plank', HOLE.x0 - 0.05 + k, -3.2, HOLE.x0 + 1.05 + k, -0.8, R1 - 0.14, R1, { id: 'plank' + k, ghost: true, n: k });
    solids.push({ kind: 'deskramp', id: 'ramp', ghost: true, x: 18.5, z: -14, w: 7.1, d: 2.8, y0: R1 - 0.3, y1: R3, ramp: { h0: 0.3, h1: R3 - R1 + 0.3 } });
    const route = [[-28, 12], [-3, 12], [-3, -2], [14, -2], [14, -14], [31.6, -14]];
    return {
      name: 'The Last Page', tip: 'Draw the way with the point, and keep moving. The ink is coming!',
      worm: 'Blank! I never finished this page. You will have to draw the way yourselves. And mind the ink!',
      solids, route, cam: { heading: 0, pitch: 50 }, wide: 0,
      start: { pencil: [-27.4, 12, 0], players: [[-30.6, 12.8], [-24.2, 12.8]] },
      marks: [0, 20, 55],
      lines: [
        { id: 'stairs', what: 'a flight of stairs', pts: [[-18, 12], [-16.8, 12.15], [-15.6, 12], [-14.4, 11.85], [-13.2, 12]], done: { off: [], on: ['stairs'] } },
        { id: 'bridge', what: 'a bridge over the hole', pts: [[-3, 4.5], [-2.8, 1.6], [-1.8, -0.6], [-0.4, -1.75], [0.9, -2]], y: R1,
          done: { off: [], on: ['plank0', 'plank1', 'plank2', 'plank3', 'plank4', 'plank5'], stagger: 0.1 } },
        { id: 'ramp', what: 'the ramp up to the desk', pts: [[14.6, -12.8], [16, -13.8], [18, -14.1], [19.6, -14], [20.9, -14]], y: R1, done: { off: [], on: ['ramp'] } },
      ],
      ink: { delay: 10, speed: 1.1, from: -5, width: 3.2, back: 8, slow: 0.75, slowAfter: 2, bottle: [-32.6, 13.4] },
      pot: { x: 28, z: -16.6, mark: [28, -14], r: 1 },
      exit: null,
      fallY: -0.5, fallH: 0.9,
      art: { HOLE, R1, R3 },
    };
  })();

  return { PW, PD, U, pages: [P1, P2, P3, P4] };
})();
