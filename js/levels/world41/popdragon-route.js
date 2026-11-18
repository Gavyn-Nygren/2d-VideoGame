/* Pip & Bo - 41-3 Paper Dragon Flight: the one flight path (the rail), what stands along it, and the maths that turns
   "how far along, how far left, how far up" into a place in the room. Plain JavaScript: no three.js here, so the rules
   (js/levels/world41/paper-dragon-flight.js), the computer brain and the bot tests use it with drawing switched off.
   The scenery that draws these things is built from the same lists (POPDRAGON_ART in popdragon-scenery.js), so what
   you see is exactly what you can hit.

   Units are K3D units (1 = one 2D tile, Pip and Bo are 0.87 tall: thumb-sized), Y is up. The desk top is y = 0; the
   attic floor is y = -34. The book lies open in the middle of the desk (pages 14 x 18 each).

   THE RAIL. POPDRAGON_ROUTE.pts is a list of control points { p: [x, y, z], v: speed (units/s) }. They are joined by a
   centripetal Catmull-Rom curve and sampled every 0.25 units into a table of position, tangent, right and up
   (POPDRAGON_ROUTE.at(s)), where s is the distance flown along the rail. The dragon flies inside a window round the
   rail point: ox across (-6 to 6, + is right) and oy up (-3.5 to 3.5). local(s, ox, oy) -> world [x, y, z].

   WHAT STANDS ALONG IT (POPDRAGON_ROUTE.solids, world shapes; anything the dragon can Crumple on):
     { k: 'cyl', x, z, r, y0, y1 }                  an upright post (pencils, lamp stem, a jar)
     { k: 'sph', x, y, z, r }                       a ball (the lamp shade's bulb, an ink bottle's body)
     { k: 'box', x, y, z, hx, hy, hz, yaw }         a box turned by yaw about Y (books, the ruler)
     { k: 'cap', a: [x, y, z], b: [x, y, z], r }    a rod (a slanted pencil, the lamp arm)
     any shape may carry burn: 'id' (paper that confetti fire burns away: cobwebs, tissue) and part: n (the stretch).
   Things placed by rail position (s, ox, oy), so they sit where the line is taught:
     stars   [{ s, ox, oy }]                        paper stars (lines and arcs)
     hoops   [{ s }]                                bookmark hoops (restart points), always on the rail's middle
     signs   [{ s, kind: 'swoop'|'tuck'|'fire', dir: 'left'|'right'|'up'|'down', ox, oy }]   gold signs ahead of a place
     says    [{ s, who: 'worm', text }]             the Bookworm's lines (bubbles from the dragon's mouth)
     parts   [{ s, name }]                          where each stretch begins (for the stats line; never shown as cards)
*/
'use strict';

const POPDRAGON_ROUTE = (function () {
  const R = {};
  R.WX = 6; R.WY = 3.5;                  // the window's half width and half height
  R.FLOOR = -34; R.DESK = 0;
  R.BOOK = { x: -6, z: 4, pw: 14, pd: 18 }; // the open book on the desk (its middle; pages along x)
  R.DESKBOX = { x0: -72, x1: 72, z0: -34, z1: 34 };

  /* ---------- the flight, as control points ----------
     Stretch 1 the desk (slow): off the dragon page (the right page), out round the brass lamp, up through the teacup's
     steam rings, through the pencil pot's forest, over the stack of books, a swoop round the ink bottle, the cobweb
     between the ruler and the jar, and off the desk's far edge after the page. (Stretches 2-4 come after the look gate.) */
  const P = (x, y, z, v) => ({ p: [x, y, z], v });
  R.pts = [
    P(1, 2.45, 9, 3.2),       // the dragon stands on the right-hand page (take-off run)
    P(1, 2.7, 1, 3.6),
    P(1, 4.4, -8, 4.6),      // lift-off over the book's far edge
    P(-4, 5.6, -19, 5.2),
    P(-16, 7.2, -26, 5.4),   // round the brass lamp's foot
    P(-30, 8.2, -24, 5.4),
    P(-41, 8.8, -15, 5.4),
    P(-46, 11.5, -5, 5.2),   // up through the teacup's steam rings
    P(-46, 13.0, 4, 5.2),
    P(-43, 11.6, 13, 5.4),
    P(-34, 9.6, 20, 5.6),    // into the pencil pot's forest
    P(-24, 9.0, 24, 5.6),
    P(-14, 9.4, 26, 5.6),
    P(-4, 12.5, 26, 5.8),    // over the stack of books
    P(6, 9.0, 24, 6.0),
    P(16, 6.6, 20, 6.0),     // the ink bottle (swoop round it)
    P(26, 6.2, 18, 6.0),
    P(36, 6.4, 11, 6.0),     // the cobweb between the ruler and the jar
    P(46, 6.6, 3, 6.2),
    P(58, 6.2, -6, 6.4),
    P(70, 4.0, -12, 6.8),    // the desk's far edge: the page slips off, the dragon dives after it
    // Stretch 2: the bookshelf (an open shelving unit against the back wall, x 104..194): along the bottom shelf, up round
    // its right end, back along the second, up round the left end, along the third, then a spiral up and over the top
    P(84, -8, -15, 7.8),
    P(96, -16, -17, 7.8),
    P(112, -18, -17, 7.8),   // shelf 1 (+x): tipping books, the fat volumes' slot
    P(132, -18, -17, 7.8),
    P(152, -18, -17, 7.8),
    P(172, -18, -17, 7.8),
    P(188, -17, -16, 8),
    P(202, -13, -8, 8.2),    // up round the right end
    P(211, -5, 3, 8.2),
    P(207, 3, 10, 8.2),
    P(195, 7, 3, 8),
    P(184, 8, -14, 7.8),
    P(166, 8, -17, 7.8),     // shelf 2 (-x): the paper moths, the toy train, the paperback tunnel
    P(146, 8, -17, 7.8),
    P(126, 8, -17, 7.8),
    P(110, 9, -16, 8),
    P(97, 14, -8, 8.2),      // up round the left end
    P(89, 21, 3, 8.2),
    P(92, 29, 9, 8.2),
    P(103, 35, 2, 8),
    P(114, 38, -14, 7.8),
    P(132, 38, -17, 7.8),    // shelf 3 (+x): the candle, the snow globe, the ship in a bottle, the chess pieces
    P(152, 38, -17, 7.8),
    P(172, 38, -17, 7.8),
    P(186, 39, -16, 8),
    P(200, 44, -10, 8.4),    // the page blows up: a spiral round the right end and over the top
    P(212, 52, 2, 8.6),
    P(214, 62, 18, 8.9),
    P(202, 72, 24, 9.1),
    P(188, 80, 14, 9.3),
    P(184, 88, -2, 9.5),
    P(176, 95, -14, 9.7),
    P(156, 97, -19, 9.9),    // over the top (-x)
    P(136, 97, -20, 10.2),
    // Stretch 3: the bedroom (out into the big dark room)
    P(116, 96, -8, 10.2),
    P(108, 95, 14, 10.4),
    P(122, 96, 34, 10.6),
    P(150, 98, 46, 10.6),
    P(182, 99, 50, 10.6),      // the planet mobile
    P(212, 99, 50, 10.6),
    P(240, 94, 56, 10.8),
    P(262, 84, 72, 11),
    P(268, 72, 96, 11),    // the ceiling lamp (swoop round it)
    P(262, 66, 120, 11),
    P(270, 58, 142, 11.2),
    P(300, 46, 150, 11.2),
    P(338, 32, 136, 11),
    P(358, 22, 110, 10.6),     // down over the Reader's pillow (the snore)
    P(350, 16, 86, 10.2),
    P(334, 15, 80, 10),
    P(314, 15, 80, 9.8),     // along the quilt toward the cat
    P(296, 16, 80, 9.8),
    P(280, 20, 82, 9.8),
    P(264, 22, 86, 10),     // past the cat
    P(246, 10, 96, 10.4),
    P(240, -6, 112, 10.6),     // down after the cat: the rug, the pounce
    P(238, -20, 130, 10.6),
    P(246, -24, 146, 10.6),
    P(266, -26, 156, 10.6),
    P(294, -26, 150, 10.2),
    P(309, -26, 134, 9.8),
    P(311, -26, 118, 9.5),   // under the bed (dark, dust bunnies, the marble, the slots)
    P(311, -26, 96, 9.5),
    P(311, -26, 74, 9.5),
    P(311, -26, 52, 9.5),
    P(312, -24, 30, 9.8),
    // Stretch 4: the window (up the curtain, out through the gap, round the rooftop in the rain, and home)
    P(318, -16, 6, 10),
    P(334, -8, -6, 10),
    P(348, -1, -16, 9.8),     // up the curtain: one and a bit turns of a spiral in front of it (tissue sheers, the cords, the cat below)
    P(349, 3, -24, 9.8),
    P(343, 6, -31, 9.8),
    P(335, 10, -32, 9.8),
    P(329, 14, -27, 9.8),
    P(327, 18, -19, 9.8),
    P(331, 21, -12, 9.8),
    P(339, 25, -10, 9.8),
    P(346, 29, -14, 9.8),
    P(349, 33, -22, 9.8),
    P(346, 36, -29, 9.8),
    P(338, 40, -32, 9.8),
    P(322, 40, -31, 10),
    P(309, 37, -29, 10.2),
    P(301, 35, -34, 10.2),
    P(300, 33, -39, 10.4),
    P(300, 32, -44, 10.6),     // through the gap in the window
    P(300, 30, -58, 11.1),
    P(314, 32, -76, 11.7),     // outside: the rooftop in the rain
    P(334, 36, -96, 11.7),     // the weather vane (swoop round it)
    P(328, 38, -118, 11.7),
    P(302, 38, -130, 11.7),
    P(276, 35, -120, 11.7),
    P(266, 33, -98, 11.7),     // round the chimney
    P(280, 31, -74, 11.1),
    P(297, 30, -58, 10.6),
    P(300, 31, -44, 10.6),     // back in through the window
    P(298, 30, -28, 12.7),
    // the dive home: across the whole room to the lamp-lit desk
    P(286, 28, -4, 15),
    P(256, 26, 28, 17),
    P(210, 24, 56, 18),
    P(150, 20, 66, 18),
    P(96, 15, 52, 17),
    P(56, 12, 40, 14),
    P(30, 9, 36, 11),
    P(14, 6.4, 20, 8),
    P(6, 4.4, 6, 5.5),       // the catch, over the right-hand page
    P(1, 4.2, 4.5, 4.5),
  ];
  R.TAKEOFF = 9.5;           // s at which the players get control (the take-off run before it is not playing)

  /* ---------- the rail table ---------- */
  const STEP = 0.25;
  function cr(p0, p1, p2, p3, t) {
    // centripetal Catmull-Rom (alpha 0.5): no loops or cusps on uneven spacing
    const d = (a, b) => Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1e-6, 0.5);
    const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3), u = t1 + (t2 - t1) * t;
    const L = (a, b, ta, tb) => a.map((v, i) => (tb - u) / (tb - ta) * v + (u - ta) / (tb - ta) * b[i]);
    const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
    const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
    return L(B1, B2, t1, t2);
  }
  function build() {
    const pts = R.pts, n = pts.length, dense = [];
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)].p, p1 = pts[i].p, p2 = pts[i + 1].p, p3 = pts[Math.min(n - 1, i + 2)].p;
      const ext0 = i === 0 ? p1.map((v, k) => 2 * v - p2[k]) : p0, ext3 = i + 2 >= n ? p2.map((v, k) => 2 * v - p1[k]) : p3;
      const segs = 64;
      for (let k = 0; k < segs; k++) dense.push({ p: cr(ext0, p1, p2, ext3, k / segs), v: pts[i].v + (pts[i + 1].v - pts[i].v) * (k / segs) });
    }
    dense.push({ p: pts[n - 1].p.slice(), v: pts[n - 1].v });
    // resample at even STEP spacing
    const tab = [];
    let acc = 0, j = 0;
    const len = [0];
    for (let i = 1; i < dense.length; i++) len.push(len[i - 1] + Math.hypot(dense[i].p[0] - dense[i - 1].p[0], dense[i].p[1] - dense[i - 1].p[1], dense[i].p[2] - dense[i - 1].p[2]));
    const total = len[len.length - 1];
    for (let s = 0; s <= total; s += STEP) {
      while (j < len.length - 2 && len[j + 1] < s) j++;
      const u = (s - len[j]) / ((len[j + 1] - len[j]) || 1), a = dense[j], b = dense[j + 1];
      tab.push({ s, p: a.p.map((v, k) => v + (b.p[k] - v) * u), v: a.v + (b.v - a.v) * u });
    }
    // frames: tangent, right (level, never rolled), up
    for (let i = 0; i < tab.length; i++) {
      const a = tab[Math.max(0, i - 2)].p, b = tab[Math.min(tab.length - 1, i + 2)].p;
      let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      // right = t x Y
      let rx = -tz, rz = tx; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
      // up = right x t
      const ux = 0 * tz - rz * ty, uy = rz * tx - rx * tz, uz = rx * ty - 0 * tx;
      Object.assign(tab[i], { t: [tx, ty, tz], r: [rx, 0, rz], u: [ux, uy, uz], yaw: Math.atan2(tx, tz) });
    }
    // turn rate (radians per unit) for the ride's bank
    for (let i = 0; i < tab.length; i++) {
      const a = tab[Math.max(0, i - 8)], b = tab[Math.min(tab.length - 1, i + 8)];
      tab[i].turn = Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw)) / ((b.s - a.s) || 1);
    }
    R.tab = tab; R.len = total;
  }
  build();

  // the rail at distance s: { s, p, t, r, u, v, yaw, turn } (between table rows, interpolated)
  R.at = function (s) {
    const tab = R.tab, f = Math.max(0, Math.min(tab.length - 1.001, s / STEP)), i = Math.floor(f), u = f - i, a = tab[i], b = tab[i + 1] || a;
    const mix = (x, y) => x.map((v, k) => v + (y[k] - v) * u);
    return { s, p: mix(a.p, b.p), t: mix(a.t, b.t), r: mix(a.r, b.r), u: mix(a.u, b.u), v: a.v + (b.v - a.v) * u, yaw: a.yaw + Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw)) * u, turn: a.turn + (b.turn - a.turn) * u };
  };
  // a place in the window -> world
  R.local = function (s, ox, oy, fr) {
    const f = fr || R.at(s);
    return [f.p[0] + f.r[0] * ox + f.u[0] * oy, f.p[1] + f.r[1] * ox + f.u[1] * oy, f.p[2] + f.r[2] * ox + f.u[2] * oy];
  };
  // world -> the window (nearest rail row within [s0, s1]): { s, ox, oy, d } (d: distance off the window's plane)
  R.toLocal = function (x, y, z, s0 = 0, s1 = R.len) {
    let best = null;
    for (let i = Math.max(0, Math.floor(s0 / STEP)); i <= Math.min(R.tab.length - 1, Math.ceil(s1 / STEP)); i++) {
      const f = R.tab[i], dx = x - f.p[0], dy = y - f.p[1], dz = z - f.p[2];
      const along = dx * f.t[0] + dy * f.t[1] + dz * f.t[2];
      if (!best || Math.abs(along) < Math.abs(best.d)) best = { s: f.s + along, ox: dx * f.r[0] + dz * f.r[2], oy: dx * f.u[0] + dy * f.u[1] + dz * f.u[2], d: along };
    }
    return best;
  };

  /* ---------- the desk stretch: what stands there ---------- */
  const S = R.solids = [];
  const art = R.art = {};          // where the scenery draws the big things (popdragon-scenery.js reads it)
  const B = R.BOOK;
  // the brass lamp (stands behind the book, its arm reaching over it; the dragon flies round its foot)
  art.lamp = { x: -22, z: -34, base: 6, stem: 26, arm: 22 };
  S.push({ k: 'cyl', x: art.lamp.x, z: art.lamp.z, r: 6.2, y0: 0, y1: 2.6, part: 1 });
  S.push({ k: 'cyl', x: art.lamp.x, z: art.lamp.z, r: 0.7, y0: 0, y1: 26, part: 1 });
  // the teacup and saucer, steam rising in rings
  art.cup = { x: -48, z: 0, r: 4.6 };
  S.push({ k: 'cyl', x: art.cup.x, z: art.cup.z, r: 5.0, y0: 0, y1: 5.4, part: 1 });
  art.steam = [{ s: 0, ox: 0.4, oy: 0.2 }, { s: 0, ox: -0.6, oy: 0.6 }, { s: 0, ox: 0.5, oy: -0.4 }];
  // the pencil pot: a wide jar of pencils, brushes and a ruler standing up like a forest of trunks
  art.pot = { x: -26, z: 24, r: 7.5, h: 6.5 };
  art.potSticks = [];
  {
    // Three tall trunks stand in the pot, placed against the rail so the good line weaves round them (right of the
    // first, left of the second, right of the third) and a straight flight down the middle just squeezes by. The rest
    // of the pot's pencils lean out over the rim to either side like a bunch of flowers, clear of the flying window
    // except its low outside corners (where the pot itself already is). Each is { x, z, r, h, col } standing at (x, z),
    // or leaning: base [x, y, z] and dir (a unit vector along the pencil).
    const sp = R.toLocal(art.pot.x, 9, art.pot.z, 60, 160).s, fr = R.at(sp), rt = fr.r, al = [fr.t[0], 0, fr.t[2]], an = Math.hypot(al[0], al[2]) || 1;
    al[0] /= an; al[2] /= an;
    art.potWeave = [];
    for (const [ds, ox, r, h, col] of [[-5, -3.4, 0.42, 16, '#d8483a'], [0, 4.2, 0.5, 15.5, 'brush'], [5, -3.4, 0.42, 17, '#f2c14e']]) {
      const c = R.local(sp + ds, ox, 0);
      art.potSticks.push({ x: c[0], z: c[2], r, h, col }); art.potWeave.push({ s: sp + ds, ox });
      S.push({ k: 'cyl', x: c[0], z: c[2], r: r + 0.08, y0: 0, y1: h + 1.4, part: 1 });
    }
    // the leaners: each rests on the rim at angle phi round the pot (0 is straight out to the right of the flight, PI
    // to the left) and leans outward by `lean` from upright
    const rimR = art.pot.r - 0.9;
    for (const [phi, lean, r, h, col] of [[0.18, 0.92, 0.42, 16, '#3b7fc4'], [-0.36, 0.98, 0.42, 14.5, '#7a4fa8'], [0.5, 1.02, 0.42, 13.5, '#f08a3c'],
      [Math.PI - 0.2, 1.0, 0.42, 16.5, '#5aa04a'], [Math.PI + 0.3, 1.04, 0.42, 15, '#e86a9a'], [Math.PI - 0.52, 1.06, 0.42, 13.8, '#2f9a8a'], [Math.PI + 0.06, 0.86, 0.42, 12.5, '#c9973a']]) {
      const out = [rt[0] * Math.cos(phi) + al[0] * Math.sin(phi), 0, rt[2] * Math.cos(phi) + al[2] * Math.sin(phi)];
      const dir = [out[0] * Math.sin(lean), Math.cos(lean), out[2] * Math.sin(lean)];
      const rim = [art.pot.x + out[0] * rimR, art.pot.h, art.pot.z + out[2] * rimR], k = (art.pot.h - 0.6) / dir[1];
      const base = [rim[0] - dir[0] * k, 0.6, rim[2] - dir[2] * k], tip = base.map((v, i) => v + dir[i] * (h + 1.4));
      art.potSticks.push({ x: base[0], z: base[2], r, h, col, base, dir });
      S.push({ k: 'cap', a: base, b: tip, r: r + 0.08, part: 1 });
    }
  }
  S.push({ k: 'cyl', x: art.pot.x, z: art.pot.z, r: art.pot.r, y0: 0, y1: art.pot.h, part: 1 });
  // a stack of old books to hop over
  art.stack = [
    { x: -4, z: 28, w: 12, h: 2.4, d: 16, yaw: 0.06, col: '#7a2f2f', title: 'ATLAS' },
    { x: -3.4, z: 27.4, w: 11, h: 2.0, d: 15, yaw: -0.08, col: '#2f4f7a', title: 'Birds' },
    { x: -4.4, z: 28.2, w: 11.6, h: 2.6, d: 15.6, yaw: 0.14, col: '#6b5a2a', title: 'Poems' },
    { x: -3.8, z: 27.8, w: 10, h: 1.8, d: 14, yaw: -0.02, col: '#3f6b4a', title: 'Maps' },
  ];
  { let y = 0; for (const b of art.stack) { b.y = y; S.push({ k: 'box', x: b.x, y: y + b.h / 2, z: b.z, hx: b.w / 2, hy: b.h / 2, hz: b.d / 2, yaw: b.yaw, part: 1 }); y += b.h; } art.stackTop = y; }
  // the ink bottle, with a quill: the first swoop (the rail runs straight at it; swoop round its left)
  art.ink = { x: 21, z: 19.2, r: 3.2, h: 6.5 };
  S.push({ k: 'cyl', x: art.ink.x, z: art.ink.z, r: art.ink.r, y0: 0, y1: 4.4, part: 1 });
  S.push({ k: 'cyl', x: art.ink.x, z: art.ink.z, r: 1.6, y0: 4.4, y1: 6.6, part: 1 });
  S.push({ k: 'cap', a: [art.ink.x, 5.5, art.ink.z], b: [art.ink.x + 5.5, 16, art.ink.z + 2.2], r: 0.9, part: 1 }); // the quill
  // the cobweb between a ruler (stood in a jar of buttons) and a jam jar
  art.jar = { x: 38.5, z: 15.5, r: 3.4, h: 8.5 };
  art.ruler = { x: 34.5, z: 5.0, h: 15, yaw: 0.9 };
  S.push({ k: 'cyl', x: art.jar.x, z: art.jar.z, r: art.jar.r, y0: 0, y1: art.jar.h, part: 1 });
  S.push({ k: 'box', x: art.ruler.x, y: art.ruler.h / 2, z: art.ruler.z, hx: 1.4, hy: art.ruler.h / 2, hz: 0.2, yaw: art.ruler.yaw, part: 1 });
  art.web = { s: 0, burn: 'web1' };

  /* ---------- stars, hoops, signs, lines ---------- */
  R.stars = []; R.hoops = []; R.signs = []; R.says = []; R.parts = [{ s: 0, name: 'the desk' }];
  const star = (s, ox, oy) => R.stars.push({ s, ox, oy });
  const line = (s0, s1, n, ox0, oy0, ox1 = ox0, oy1 = oy0) => { for (let i = 0; i < n; i++) { const u = n > 1 ? i / (n - 1) : 0; star(s0 + (s1 - s0) * u, ox0 + (ox1 - ox0) * u, oy0 + (oy1 - oy0) * u); } };
  const arc = (s0, s1, n, ox0, oy0, ox1, oy1, bow, axis) => { for (let i = 0; i < n; i++) { const u = i / (n - 1), b = Math.sin(u * Math.PI) * bow; star(s0 + (s1 - s0) * u, ox0 + (ox1 - ox0) * u + (axis === 'x' ? b : 0), oy0 + (oy1 - oy0) * u + (axis === 'y' ? b : 0)); } };
  // places along the rail, found by the nearest rail row to a world spot (so the lists follow the scenery)
  const sAt = (x, y, z, s0, s1) => R.toLocal(x, y, z, s0, s1).s;
  R.place = {};
  R.place.lamp = sAt(art.lamp.x, 6, art.lamp.z, 10, 80);
  R.place.cup = sAt(art.cup.x, 11, art.cup.z, 30, 110);
  R.place.pot = sAt(art.pot.x, 9, art.pot.z, 60, 160);
  R.place.stack = sAt(art.stack[0].x, 10, art.stack[0].z, 100, 200);
  R.place.ink = sAt(art.ink.x, 6, art.ink.z, 120, 230);
  R.place.web = sAt((art.jar.x + art.ruler.x) / 2, 6, (art.jar.z + art.ruler.z) / 2, 140, 260);
  R.place.edge = sAt(70, 4, -12, 180, 320);
  // the steam rings sit on the rail just after the cup (three rings, each a little off the middle)
  art.steam.forEach((r, i) => { r.s = R.place.cup - 7 + i * 6; });
  art.web.s = R.place.web;
  // the take-off: a line of stars up off the page
  line(R.TAKEOFF + 2, R.TAKEOFF + 14, 6, 0, -0.5, 0, 1.2);
  // round the lamp: an arc out to the left
  arc(R.place.lamp - 10, R.place.lamp + 8, 7, -1, 0.5, 1, 0.5, -3, 'x');
  // through each steam ring (three stars in each)
  for (const r of art.steam) line(r.s - 1, r.s + 1, 3, r.ox, r.oy);
  // the pencil forest: stars on the weave (round the far side of each trunk)
  for (const w of art.potWeave) star(w.s, w.ox < 0 ? 2.0 : -1.2, 0.6);
  star(art.potWeave[0].s - 5, 1.0, 0.6); star(art.potWeave[2].s + 5, 0.8, 0.2);
  R.webs = [{ s: R.place.web, r: 7.6, oy: 0.4, burn: 'web1' }];
  // over the book stack: a high arc (height)
  arc(R.place.stack - 9, R.place.stack + 7, 7, 0, -0.5, 0, -1.5, 3.4, 'y');
  // the ink bottle: a sign, then a swoop arc out to the left of the bottle
  R.signs.push({ s: R.place.ink - 26, kind: 'swoop', dir: 'left', ox: 3.2, oy: 1.8 });
  arc(R.place.ink - 12, R.place.ink + 6, 8, 0, 0, 0, 0, -5, 'x');
  // the cobweb: the tip names fire; a row of stars behind it
  R.signs.push({ s: R.place.web - 22, kind: 'fire', dir: 'ahead', ox: -3.4, oy: 1.8 });
  line(R.place.web + 1, R.place.web + 9, 5, 0, 0);
  // the dive off the desk edge
  line(R.place.edge + 2, R.place.edge + 24, 7, 0, 0.8, 0, -0.6);
  // the bookmark hoops: one at the start of the flight, one before the pencil pot, one after the stack of books and one
  // at the desk's end (the first things to learn each get their own restart)
  R.hoops.push({ s: R.TAKEOFF + 12 }, { s: R.place.pot - 19 }, { s: R.place.stack + 11 }, { s: R.place.web + 16 });
  // the Bookworm
  R.says.push({ s: R.TAKEOFF + 1, who: 'worm', text: 'After that page! One of you steer, one of you fly!' });
  R.says.push({ s: R.place.ink - 28, who: 'worm', text: 'Both lean left together to swoop!' });
  R.says.push({ s: R.place.web - 24, who: 'worm', text: 'A cobweb! Pip, breathe fire on it!' });
  R.stars.sort((a, b) => a.s - b.s);
  R.end = R.len - 2;
  return R;
})();
