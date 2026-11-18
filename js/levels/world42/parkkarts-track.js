/* Pip & Bo - 42-4 Go-Kart Grand Prix: the circuit. Plain JavaScript, always loaded, no three.js: the rules, the computer
   opponent and the bot tests use it with drawing switched off.

   The circuit is one closed loop through Starlight Park (x east, z south, the sea to the north at -z), joined by a
   centripetal Catmull-Rom curve through the control points below and sampled every T.STEP units into T.tab. Six parts:
     0 The Kart Track      the start grid under the gantry, two easy bends and the hairpin, inside the old kart fence
     1 The Midway          out through the broken fence onto the avenue of stalls; boost pads; the ring-toss shortcut
     2 Under the Comet     between the coaster's trestle legs; the ramp over the log flume
     3 The Funhouse        in through the laughing moon's mouth, the barrel, the black-light floor, the mirrors, the slide
     4 The Pier            out over the sea and round the ferris wheel at the pier head
     5 Spook Manor Lane    the dark edge of the park past the graveyard, the fountain fork, the last straight
   The road: half width hw (tarmac), then a verge of T.VERGE (grass, sand, wet boards: slower), then the wall (tyre
   stacks and hay bales). A shortcut is a branch: its own narrow road that leaves the main road and joins it again;
   a kart may be anywhere in the union of the roads, and its progress along a branch is mapped onto the main road.

   T.at(s)              the road at distance s (wraps): { s, x, z, y, tx, tz, rx, rz, yaw, turn, part, hw }
   T.pos(s, lat)        [x, z] at s, lat units to the right of the middle
   T.near(x, z, hint)   the nearest main-road row (searched round the hint s): { s, lat }
   T.where(x, z, hint, on)   which road a point is on: { on: -1 main | branch index, s (main), lat, bs, w (wall half
                        width there), nx, nz (the outward normal of the nearer wall) }
   T.parts, T.partAt(s), T.boxes (prize box rows), T.pads (boost pads), T.GRID (the start), T.L (one lap)
*/
'use strict';

const PARKKARTS_TRACK = (function () {
  const T = { STEP: 0.5, VERGE: 1.7 };
  // control points [x, z, part, hw]
  const P = [
    [0, 0, 0, 4.6], [30, 0, 0], [54, -3, 0], [66, -14, 0], [68, -32, 0], [60, -46, 0], [46, -52, 0], [26, -52, 0, 4.4], [12, -58, 0, 4.6], [10, -72, 0], [22, -80, 0], [42, -80, 0, 4.8],
    // the Midway: wide; it bulges south round the ring-toss stall (the shortcut runs straight through it)
    [64, -82, 1, 5.2], [86, -80, 1], [104, -88, 1], [118, -100, 1], [136, -100, 1], [150, -90, 1], [166, -88, 1], [186, -92, 1],
    [202, -104, 2, 4.6], [206, -120, 2], [198, -134, 2], [206, -150, 2], [216, -166, 2],
    [222, -184, 3, 4.2], [224, -202, 3], [216, -218, 3], [196, -226, 3], [176, -224, 3], [160, -218, 3],
    [148, -232, 4, 4.2], [144, -256, 4], [144, -280, 4], [152, -300, 4], [142, -320, 4], [122, -322, 4], [110, -306, 4], [116, -282, 4], [120, -258, 4], [116, -238, 4],
    [102, -218, 5, 4.6], [82, -206, 5], [62, -196, 5], [44, -176, 5], [24, -154, 5], [8, -130, 5], [-8, -104, 5], [-18, -76, 5], [-20, -48, 5], [-16, -22, 5], [-8, -6, 5],
  ];
  T.PARTS = ['The Kart Track', 'The Midway', 'Under the Comet', 'The Funhouse', 'The Pier', 'Spook Manor Lane'];

  function cr(p0, p1, p2, p3, t) {
    const d = (a, b) => Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-6, 0.5);
    const t1 = d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3), u = t1 + (t2 - t1) * t;
    const L = (a, b, ta, tb) => [(tb - u) / (tb - ta) * a[0] + (u - ta) / (tb - ta) * b[0], (tb - u) / (tb - ta) * a[1] + (u - ta) / (tb - ta) * b[1]];
    const A1 = L(p0, p1, 0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
    return L(L(A1, A2, 0, t2), L(A2, A3, t1, t3), t1, t2);
  }
  // a road (closed loop or open branch) through points -> its table
  function road(pts, closed, step) {
    const n = pts.length, dense = [];
    let hw = pts[0][3] || 4.4;
    const hws = pts.map(p => (hw = p[3] || hw));
    const segN = closed ? n : n - 1;
    for (let i = 0; i < segN; i++) {
      const g = k => (closed ? pts[(k + n) % n] : pts[Math.max(0, Math.min(n - 1, k))]);
      const p0 = !closed && i === 0 ? [2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1]] : g(i - 1);
      const p3 = !closed && i + 2 >= n ? [2 * pts[n - 1][0] - pts[n - 2][0], 2 * pts[n - 1][1] - pts[n - 2][1]] : g(i + 2);
      const h0 = hws[i], h1 = hws[(i + 1) % n];
      for (let k = 0; k < 48; k++) { const u = k / 48, e = u * u * (3 - 2 * u), q = cr(p0, g(i), g(i + 1), p3, u); dense.push([q[0], q[1], pts[i][2], h0 + (h1 - h0) * e]); }
    }
    if (!closed) dense.push([pts[n - 1][0], pts[n - 1][1], pts[n - 1][2], hws[n - 1]]);
    const cum = [0];
    const m = dense.length;
    for (let i = 1; i < m + (closed ? 1 : 0); i++) { const a = dense[i - 1], b = dense[i % m]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const len = cum[cum.length - 1], tab = [];
    let j = 0;
    const N = closed ? Math.round(len / step) : Math.floor(len / step) + 1, st = closed ? len / N : step;
    for (let i = 0; i < N; i++) {
      const s = i * st;
      while (j < cum.length - 2 && cum[j + 1] < s) j++;
      const a = dense[j % m], b = dense[(j + 1) % m], u = Math.max(0, Math.min(1, (s - cum[j]) / ((cum[j + 1] - cum[j]) || 1)));
      tab.push({ s, x: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u, part: a[2], hw: a[3] + (b[3] - a[3]) * u, y: 0 });
    }
    const at = i => tab[closed ? ((i % N) + N) % N : Math.max(0, Math.min(N - 1, i))];
    for (let i = 0; i < N; i++) {
      const a = at(i - 2), b = at(i + 2), dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1, r = tab[i];
      r.tx = dx / l; r.tz = dz / l; r.rx = -r.tz; r.rz = r.tx; r.yaw = Math.atan2(r.tx, r.tz);
    }
    for (let i = 0; i < N; i++) { const a = at(i - 4), b = at(i + 4); let d = b.yaw - a.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); tab[i].turn = d / (8 * st); }
    return { tab, len, N, st, closed };
  }
  const main = road(P, true, T.STEP);
  T.tab = main.tab; T.L = main.len; T.N = main.N; T.st = main.st;
  const wrap = s => ((s % T.L) + T.L) % T.L;
  T.wrap = wrap;
  function rowAt(R, s) {
    if (R.closed) s = wrap(s); else s = Math.max(0, Math.min(R.len, s));
    const f = s / R.st, i = Math.floor(f), u = f - i, a = R.tab[R.closed ? i % R.N : Math.min(R.N - 1, i)], b = R.tab[R.closed ? (i + 1) % R.N : Math.min(R.N - 1, i + 1)];
    const tx = a.tx + (b.tx - a.tx) * u, tz = a.tz + (b.tz - a.tz) * u, l = Math.hypot(tx, tz) || 1;
    return { s, x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, y: a.y + (b.y - a.y) * u, tx: tx / l, tz: tz / l, rx: -tz / l, rz: tx / l,
      yaw: Math.atan2(tx, tz), turn: a.turn + (b.turn - a.turn) * u, part: a.part, hw: a.hw + (b.hw - a.hw) * u };
  }
  T.at = s => rowAt(main, s);
  T.pos = (s, lat) => { const f = T.at(s); return [f.x + f.rx * lat, f.z + f.rz * lat]; };
  // nearest row of a road round a hint (or everywhere when the hint is null)
  function nearOn(R, x, z, hint, span) {
    let best = -1, bd = 1e18;
    const scan = (i0, i1) => { for (let i = i0; i <= i1; i++) { const k = R.closed ? ((i % R.N) + R.N) % R.N : i; if (k < 0 || k >= R.N) continue; const r = R.tab[k], d = (r.x - x) ** 2 + (r.z - z) ** 2; if (d < bd) { bd = d; best = k; } } };
    if (hint == null) scan(0, R.N - 1);
    else { const c = Math.round(hint / R.st), w = Math.round((span || 24) / R.st); scan(c - w, c + w); }
    // refine between the best row and its neighbours (a projection onto the two segments)
    const r = R.tab[best];
    let s = r.s, lat = (x - r.x) * r.rx + (z - r.z) * r.rz;
    const along = (x - r.x) * r.tx + (z - r.z) * r.tz;
    s += Math.max(-R.st, Math.min(R.st, along));
    if (R.closed) s = wrap(s); else s = Math.max(0, Math.min(R.len, s));
    const f = rowAt(R, s);
    lat = (x - f.x) * f.rx + (z - f.z) * f.rz;
    return { s, lat, f };
  }
  T.near = (x, z, hint) => { const n = nearOn(main, x, z, hint); return { s: n.s, lat: n.lat }; };

  /* ---------- shortcuts (branches) ---------- */
  // pts as the main road's; s0 / s1 where it leaves and joins the main road (found from its end points); wall: its own
  // half width (no verge: it is narrow on purpose)
  T.branches = [];
  function branch(name, pts, hw, o = {}) {
    const R = road(pts.map(p => [p[0], p[1], p[2] != null ? p[2] : 0, hw]), false, T.STEP);
    const a = nearOn(main, pts[0][0], pts[0][1], null), b = nearOn(main, pts[pts.length - 1][0], pts[pts.length - 1][1], null);
    let s1 = b.s; if (s1 < a.s) s1 += T.L;
    const B = Object.assign({ name, R, s0: a.s, s1, hw, len: R.len }, o);
    B.mainS = bs => wrap(B.s0 + (bs / R.len) * (B.s1 - B.s0));
    B.at = bs => rowAt(R, bs);
    T.branches.push(B);
    return B;
  }
  // the ring-toss shortcut: straight through the stall where the Midway bulges south (in one side and out the other)
  T.ringToss = branch('ring toss', [[92, -81], [104, -82.5], [118, -84], [130, -84], [142, -83.5], [154, -86]], 1.5, { stall: [124, -84], kind: 'ringtoss' });

  // which road a point is on (prefers the main road), and the wall that holds it
  T.where = function (x, z, hint, on) {
    const m = nearOn(main, x, z, hint), Wm = m.f.hw + T.VERGE;
    const res = { on: -1, s: m.s, lat: m.lat, w: Wm, hw: m.f.hw, f: m.f, bs: 0 };
    if (Math.abs(m.lat) <= Wm) return res;
    // a branch that holds the point (or the nearest one, if it was on it last)
    let best = null;
    for (let i = 0; i < T.branches.length; i++) {
      const B = T.branches[i];
      let ds = m.s - B.s0; if (ds < -T.L / 2) ds += T.L; if (ds > T.L / 2) ds -= T.L;
      if (ds < -6 || ds > B.s1 - B.s0 + 6) continue;
      const n = nearOn(B.R, x, z, null);
      const over = Math.abs(n.lat) - B.hw;
      if (n.s <= 0.01 || n.s >= B.len - 0.01) continue;
      if (!best || over < best.over) best = { i, n, over };
    }
    const mOver = Math.abs(m.lat) - Wm;
    if (best && (best.over <= 0 || (on === best.i && best.over < mOver))) {
      const B = T.branches[best.i];
      return { on: best.i, s: B.mainS(best.n.s), lat: best.n.lat, w: B.hw, hw: B.hw, f: best.n.f, bs: best.n.s, branch: B };
    }
    return res;
  };

  /* ---------- parts, the start, and what is on the road ---------- */
  T.partS = T.PARTS.map((_, k) => { const i = T.tab.findIndex(r => r.part === k); return i < 0 ? 0 : T.tab[i].s; });
  T.partAt = s => T.at(s).part;
  T.GRID = 5;            // the karts' start line (just past the gantry at s 0)
  T.GANTRY = 0;
  // prize box rows: { s, lats } (a row across the road; each box comes back 4 s after it is taken)
  T.boxes = [];
  const row = (s, n = 4) => { const f = T.at(s), w = f.hw - 0.9, lats = []; for (let i = 0; i < n; i++) lats.push(-w + (2 * w) * i / (n - 1)); T.boxes.push({ s, lats }); };
  // boost pads: { s0, s1, lat, w } strips of chasing bulbs set in the road
  T.pads = [];
  // ramps and other things the scenery and the rules share are added per part below
  T.say = [];
  function setup() {
    const ps = T.partS;
    row(ps[0] + 46);                    // the kart track: before the first bend
    row(ps[0] + 128);                   // after the hairpin (out of the corner)
    row(ps[1] + 10, 5);                 // the Midway gate
    row(ps[1] + 90, 5);                 // the far end of the avenue
    row(ps[2] + 30);
    row(ps[3] + 40);
    row(ps[4] + 20);
    row(ps[4] + 130);
    row(ps[5] + 60);
    // the Midway's boost pads: a row down the middle of the avenue (and a second line on the last straight)
    for (let k = 0; k < 3; k++) T.pads.push({ s0: ps[1] + 28 + k * 9, s1: ps[1] + 32 + k * 9, lat: 0, w: 1.4 });
    for (let k = 0; k < 4; k++) T.pads.push({ s0: T.L - 70 + k * 12, s1: T.L - 66 + k * 12, lat: (k % 2 ? 1.6 : -1.6), w: 1.4 });
    T.say.push({ s: ps[1] + 2, text: 'Out onto the Midway!' });
  }
  setup();
  return T;
})();
