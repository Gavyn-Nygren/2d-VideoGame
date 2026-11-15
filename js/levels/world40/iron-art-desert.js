/* Pip & Bo - World 40 Colossus March: the Pyramid Sands backdrop (Part 1), four parallax layers in the sketch kit. */
'use strict';

/* Part 1 runs across Pyramid Sands (World 28), drawn new in this world's style. Four layers, each a full illustration
   on transparent paper (the page itself is SKETCH.paper 'sand'), made in 960 px wide chunks so the march can be long:
     IRON_ART.desert(layer, chunk) -> the sheet key ('iron:desert:<layer>:<chunk>'), made on first use.
     layer 0 sky and far horizon (parallax 0.08): sun, clouds, far mesas, the crystal golem's silhouette (a hidden friend)
     layer 1 far (0.25): the pyramid the Colossus stepped over (chunk 0), toppled obelisk rows, a far caravan
     layer 2 mid (0.55): dunes with contour hatching, palm groves, a half-buried statue head
     layer 3 near (1.0, the ground): rippled sand, stones, dry grass, old giant footprints. The ground top is y 450.
   Chunks differ by seed; the landmarks sit in set chunks. */

IRON_ART.GROUND_Y = 450;
IRON_ART.desert = (layer, chunk = 0) => {
  const key = 'iron:desert:' + layer + ':' + chunk;
  if (SKETCH.has(key) && !IRON_ART.redraw) return key;
  SKETCH.sheet(key, 960, 540, d => IRON_ART.desertDraw[layer](d, chunk), { flat: true, seed: 4000 + layer * 101 + chunk * 7, res: layer === 0 ? Math.min(SKETCH.res, 1.25) : SKETCH.res });
  return key;
};
IRON_ART.desertDraw = [];

// a dune ridge as points along x (a sum of slow bumps), seeded
function ironDuneLine(d, y0, amp, x0, x1, step, seed) {
  const pts = [];
  for (let x = x0; x <= x1; x += step) pts.push([x, y0 - amp * (0.55 * Math.sin(x / 170 + seed) + 0.3 * Math.sin(x / 61 + seed * 2.3) + 0.15 * Math.sin(x / 23 + seed * 5))]);
  return pts;
}

/* ---- layer 0: the sky and the far horizon ---- */
IRON_ART.desertDraw[0] = (d, chunk) => {
  const P = IRON_P;
  // pencil construction: the horizon and a vanishing line or two
  d.pencil([[0, 296], [960, 298]], { alpha: 0.3 });
  d.pencil([[0, 210], [960, 252]], { alpha: 0.12 }); d.pencil([[480, 296], [960, 120]], { alpha: 0.1 });
  // sky washes: loose horizontal glazes, warmer near the ground, paper left at the top for the glare
  // the haze over the sand: loose overlapping glazes with ragged tops (never a band with a straight edge)
  for (let i = 0; i < 9; i++) {
    const x = -80 + i * 120 + d.r() * 40, top = 150 + d.r() * 70, w2 = 160 + d.r() * 80;
    const blob = []; for (let k = 0; k <= 10; k++) { const t = k / 10; blob.push([x + w2 * t, top + Math.sin(t * Math.PI * 2 + i) * 14 - Math.sin(t * Math.PI) * 30 + (1 - Math.sin(t * Math.PI)) * 60]); }
    d.wash(blob.concat([[x + w2 + 20, 302], [x - 20, 302]]), i % 3 ? P.dust : P.ochre, { alpha: 0.16 + d.r() * 0.1, off: 0, spread: 2, layers: 2, edge: false, curve: true });
  }
  d.wash([[0, 0], [380, 0], [300, 60], [0, 90]], P.greyBlue, { alpha: 0.22, off: 0, spread: 2, layers: 3, edge: false, blooms: 1 });
  // the sun (top right): left as paper, a ring of wash round it, short pencil rays
  if (chunk === 0) {
    const sx = 790, sy = 90;
    d.wash(SKETCH.ell(sx, sy, 62, 58, 30), P.core, { alpha: 0.3, off: 0, spread: 1.5, layers: 3 });
    d.lift(SKETCH.ell(sx, sy, 34, 33, 16), 1);
    d.stroke(SKETCH.ell(sx, sy, 34, 33, 28, 0, -0.6, Math.PI * 1.7), { w: 1.2, curve: true, alpha: 0.6 });
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + 0.1, r0 = 44 + d.r() * 6, r1 = r0 + 10 + d.r() * 14; d.pencil([[sx + Math.cos(a) * r0, sy + Math.sin(a) * r0], [sx + Math.cos(a) * r1, sy + Math.sin(a) * r1]], { alpha: 0.45, w: 0.9 }); }
  }
  // clouds: long flat ones, inked lightly on their undersides, grey-blue glaze
  const clouds = chunk === 0 ? [[150, 70, 120], [470, 120, 90], [640, 40, 70]] : [[200 + d.r() * 200, 60 + d.r() * 60, 100], [600 + d.r() * 200, 40 + d.r() * 80, 80]];
  for (const [cx, cy, r] of clouds) {
    const pts = [];
    for (let i = 0; i <= 18; i++) { const t = i / 18, x = cx - r + 2 * r * t; pts.push([x, cy - Math.sin(t * Math.PI) * r * 0.22 - Math.abs(Math.sin(t * 9)) * 6]); }
    const under = [[cx + r, cy], [cx + r * 0.3, cy + 5], [cx - r * 0.4, cy + 4], [cx - r, cy]];
    d.wash(pts.concat(under), P.greyBlue, { alpha: 0.28, off: 2, spread: 1.4 });
    d.stroke(under, { w: 1.3, curve: true, alpha: 0.55, p: [0.1, 1, 0.1] });
    d.stroke(pts.slice(2, 10), { w: 0.8, curve: true, alpha: 0.35, p: [0.1, 1, 0.1] });
    d.hatch(under.concat([[cx - r * 0.6, cy - 4], [cx + r * 0.6, cy - 5]]).slice(0, 4), { a: 5, gap: 2.4, w: 0.5, alpha: 0.35 });
  }
  // far mesas and dunes: pale grey-blue, light line only on top
  const far = ironDuneLine(d, 286, 14, -10, 970, 20, 1.3 + chunk);
  if (chunk % 2 === 0) { far.splice(10, 6, [190, 262], [204, 240], [262, 238], [276, 262], [300, 270], [330, 276]); }
  d.wash(far.concat([[970, 300], [-10, 300]]), P.greyBlue, { alpha: 0.42, off: 1.5, spread: 1.2 });
  d.stroke(far, { w: 1.1, alpha: 0.5, p: [0.2, 1, 0.2], sh: 0 });
  d.hatch(far.concat([[970, 300], [-10, 300]]), { a: 0, gap: 3.2, w: 0.45, alpha: 0.35, tone: (x, y) => (y - 270) / 30 });
  // the crystal golem's silhouette sitting on the horizon (World 39): a hunched shape with crystal spikes
  if (chunk === 0) {
    const gx = 880, gy = 292;
    const body = [[gx - 18, gy], [gx - 16, gy - 14], [gx - 8, gy - 22], [gx + 4, gy - 23], [gx + 14, gy - 16], [gx + 18, gy], [gx + 6, gy + 1]];
    d.wash(body, P.greyBlueDark, { alpha: 0.6, off: 0.5 });
    d.outline(body, { w: 0.9, corner: 40, alpha: 0.7 });
    for (const [x, y, h] of [[-8, -21, 8], [-1, -23, 11], [7, -21, 7], [13, -16, 6]]) { d.stroke([[gx + x - 2, gy + y + 2], [gx + x, gy + y - h], [gx + x + 2, gy + y + 2]], { w: 0.8, alpha: 0.75 }); d.wash([[gx + x - 2, gy + y + 2], [gx + x, gy + y - h], [gx + x + 2, gy + y + 2]], P.verdLight, { alpha: 0.5, off: 0.3, layers: 1, edge: false }); }
  }
};

/* ---- layer 1: the far middle: the stepped-over pyramid, toppled obelisks ---- */
IRON_ART.desertDraw[1] = (d, chunk) => {
  const P = IRON_P;
  const base = 336;
  // a low dune band underneath everything
  const band = ironDuneLine(d, 326, 10, -10, 970, 16, 3.1 + chunk);
  d.wash(band.concat([[970, 360], [-10, 360]]), P.sand, { alpha: 0.6, off: 1, spread: 1.3 });
  d.stroke(band, { w: 1.2, alpha: 0.6, sh: 0, p: [0.3, 1, 0.3] });
  if (chunk === 0) {
    // the pyramid: the Colossus stepped over it and kicked its top off; left face lit, right face hatched
    const ax = 250, ay = 130, L = [80, base], R = [430, base], M = [292, base + 6];
    const lit = [[ax - 12, ay + 8], [ax + 14, ay + 4], M, L], shd = [[ax + 14, ay + 4], R, M];
    d.pencil([[ax, 100], L], { alpha: 0.3 }); d.pencil([[ax, 100], R], { alpha: 0.3 }); d.pencil([[ax, 100], [ax, base]], { alpha: 0.18 });
    d.wash(lit, P.dust, { alpha: 0.5, off: 2, spread: 1.2, blooms: 1 });
    d.wash(shd, P.ochreDeep, { alpha: 0.55, off: 2, spread: 1.2 });
    d.hatch(shd, { a: 68, gap: 2.6, w: 0.65, alpha: 0.75, tone: (x, y) => 0.6 + (x - 300) / 300, cross: true, crossTone: (x, y) => (y - 220) / 120 + (x - 330) / 200 - 0.2 });
    // stone courses: horizontal lines with staggered joints, sloping with the faces
    for (let k = 0; k < 22; k++) {
      const y = ay + 12 + k * 9.3; if (y > base - 3) break;
      const t = (y - ay) / (base - ay), xl = ax - 12 + (L[0] - ax + 12) * t, xm = ax + 14 + (M[0] - ax - 14) * t, xr = ax + 14 + (R[0] - ax - 14) * t;
      d.stroke([[xl, y], [xm, y + t * 6]], { w: 0.75, sh: 0, alpha: 0.6, p: [0.3, 1, 0.3], brk: 0.4 });
      d.stroke([[xm, y + t * 6], [xr, y]], { w: 0.65, sh: 0, alpha: 0.6, p: [0.3, 1, 0.3] });
      for (let x = xl + 6 + (k % 2) * 7; x < xm - 4; x += 14 + d.r() * 4) d.stroke([[x, y], [x + 0.4, y + 8.5]], { w: 0.5, sh: 0, alpha: 0.45, bend: 0 });
    }
    // the broken top: rubble and a cracked edge, a few blocks tumbling down the lit face
    const top = [[ax - 22, ay + 18], [ax - 10, ay + 2], [ax + 2, ay + 10], [ax + 12, ay - 2], [ax + 26, ay + 16]];
    d.stroke(top, { w: 1.6, sh: 0.5 });
    for (const [x, y, s] of [[ax - 30, ay + 46, 7], [ax - 52, ay + 92, 6], [ax - 70, ay + 140, 8], [ax + 38, ay + 60, 6]]) {
      const b = [[x - s, y - s * 0.6], [x + s, y - s * 0.7], [x + s * 0.9, y + s * 0.6], [x - s * 0.8, y + s * 0.7]];
      d.shape(b, { fill: P.ochre, w: 1, corner: 30 }); d.hatch([[x, y - s * 0.6], [x + s, y - s * 0.7], [x + s * 0.9, y + s * 0.6], [x, y + s * 0.7]], { a: 60, gap: 1.6, w: 0.45 });
    }
    // the silhouette, inked heavier on the shadow side
    d.stroke([[ax + 14, ay + 4], [R[0] + 3, R[1] + 1]], { w: 2.2, c: [ax, 260], sh: 1 });
    d.stroke([[L[0] - 2, L[1] + 1], [ax - 12, ay + 8]], { w: 1.4, c: [ax, 260], sh: 1 });
    d.stroke([[ax + 14, ay + 4], [M[0], M[1] - 4]], { w: 0.9, sh: 0, alpha: 0.7 });
    // a dark doorway and a giant toe-scrape across the lit face
    d.spot([[ax - 6, base - 34], [ax + 6, base - 34], [ax + 7, base - 2], [ax - 7, base - 2]], { spread: 0.3 });
    d.stroke([[150, 300], [200, 286], [250, 280]], { w: 1.1, curve: true, alpha: 0.7, brk: 0.6 });
    d.stroke([[156, 306], [206, 293], [254, 288]], { w: 0.7, curve: true, alpha: 0.6 });
  }
  // a row of toppled obelisks, falling like dominoes (each one leaning a bit further)
  const ox0 = chunk === 0 ? 530 : 120 + d.r() * 300, n = 5;
  for (let i = 0; i < n; i++) {
    const x = ox0 + i * 52, lean = 0.12 + i * 0.32, h = 92 - i * 4, w = 14, by = base - 2;
    const c = Math.cos(lean), s = Math.sin(lean);
    const corners = [[-w / 2, 0], [w / 2, 0], [w / 2 - 2, -h], [0, -h - 9], [-w / 2 + 2, -h]].map(([u, v]) => [x + u * c - v * s, by + u * s + v * c]);
    d.wash(corners, i % 2 ? P.dust : P.ochre, { alpha: 0.55, off: 1.2 });
    d.hatch([[x, by], corners[1], corners[2], [x + (h + 9) * s, by - (h + 9) * c]], { a: 70, gap: 2, w: 0.5, alpha: 0.7 });
    d.outline(corners, { w: 1.3, corner: 30 });
    // carved marks
    for (let k = 1; k < 5; k++) { const v = -h * k / 5.5; const a = [x + (-2) * c - v * s, by + (-2) * s + v * c], b = [x + 3 * c - v * s, by + 3 * s + v * c]; d.stroke([a, b], { w: 0.6, sh: 0, alpha: 0.6, bend: 0 }); }
  }
  // a far caravan of tiny camels (the Camel Race, World 28), on the band
  if (chunk !== 0) for (let i = 0; i < 4; i++) { const x = 600 + i * 18, y = 322; d.stroke([[x - 5, y], [x - 4, y - 5], [x, y - 7], [x + 3, y - 5], [x + 5, y - 9], [x + 7, y - 9]], { w: 0.8, sh: 0, curve: true }); d.stroke([[x - 4, y], [x - 4, y + 4]], { w: 0.6 }); d.stroke([[x + 3, y], [x + 3, y + 4]], { w: 0.6 }); }
};

/* ---- layer 2: dunes, palms, a statue head ---- */
IRON_ART.desertDraw[2] = (d, chunk) => {
  const P = IRON_P;
  const taper = (c, a, b) => c.map(([x, y]) => { const k = Math.min(1, (x - a) / 90, (b - x) / 90); return [x, k >= 1 ? y : 466 + (y - 466) * Math.max(0, k) * (2 - Math.max(0, k))]; });
  const crest1 = taper(ironDuneLine(d, 382, 26, -100, 560, 12, 0.7 + chunk * 1.9), -1e9, 560), crest2 = taper(ironDuneLine(d, 394, 30, 380, 1060, 12, 2.2 + chunk * 1.3), 380, 1e9);
  for (const [crest, col] of [[crest1, P.sand], [crest2, P.dust]]) {
    const poly = crest.concat([[crest[crest.length - 1][0], 470], [crest[0][0], 470]]);
    d.wash(poly, col, { alpha: 0.7, off: 1.5, spread: 1.2, blooms: 1 });
    // the lee side of the dune: a darker glaze and contour hatching that follows the slope
    const top = crest.reduce((a, b) => (b[1] < a[1] ? b : a));
    const lee = crest.filter(p => p[0] >= top[0]);
    if (lee.length > 2) {
      const leePoly = lee.concat(lee.slice().reverse().map(([x, y], k) => [x + 18, y + 30 + 14 * Math.sin(k)]));
      d.wash(leePoly, P.ochre, { alpha: 0.4, off: 1, spread: 1.4 });
      const lines = [];
      for (let k = 1; k < lee.length - 1; k += 2) { const p = lee[k]; lines.push([[p[0], p[1] + 2], [p[0] + 10, p[1] + 18], [p[0] + 14, p[1] + 34 + d.r() * 10]]); }
      d.contour(lines, { w: 0.7, alpha: 0.6 });
    }
    d.stroke(crest, { w: 1.6, alpha: 0.85, p: [0.2, 1, 0.2], c: [480, 500], sh: 0.6 });
    // wind ripples on the lit face
    for (let i = 0; i < 9; i++) { const x = crest[0][0] + d.r() * (crest[crest.length - 1][0] - crest[0][0]), y = 420 + d.r() * 26; d.stroke([[x - 14, y], [x - 4, y - 2], [x + 8, y], [x + 16, y - 1]], { w: 0.6, curve: true, sh: 0, alpha: 0.5 }); }
  }
  // a palm grove (chunk 0 at the right)
  const palms = chunk === 0 ? [[700, 392, 1], [728, 398, 0.8], [668, 400, 0.7]] : [[200 + d.r() * 500, 396, 0.9]];
  for (const [px, py, s] of palms) {
    const top = [px + 14 * s, py - 90 * s];
    const trunk = [[px, py], [px + 4 * s, py - 30 * s], [px + 10 * s, py - 62 * s], top];
    d.stroke(trunk, { w: 4.6 * s, curve: true, col: '#6b5236', alpha: 0.6, layer: 'wash', p: [1, 1, 0.8], sh: 0 });
    d.stroke(trunk.map(([x, y]) => [x - 2.4 * s, y]), { w: 1.2, curve: true, sh: 0 });
    d.stroke(trunk.map(([x, y]) => [x + 2.4 * s, y]), { w: 1.6, curve: true, sh: 0 });
    for (let k = 1; k < 12; k++) { const t = k / 12, p = SKETCH.spline(trunk, false, 4); const q = p[Math.floor(t * (p.length - 1))]; d.stroke([[q[0] - 2.5 * s, q[1] + 1], [q[0], q[1] - 1.5], [q[0] + 2.6 * s, q[1] + 1]], { w: 0.6, curve: true, sh: 0 }); }
    for (let f = 0; f < 7; f++) {
      const a = -Math.PI / 2 + (f - 3) * 0.48 + (d.r() - 0.5) * 0.2, len = (36 + d.r() * 12) * s;
      const tip = [top[0] + Math.cos(a) * len, top[1] + Math.sin(a) * len * 0.6 + len * 0.42];
      const mid = [top[0] + Math.cos(a) * len * 0.55, top[1] + Math.sin(a) * len * 0.55 - 6 * s];
      d.stroke([top, mid, tip], { w: 1.4 * s, curve: true, sh: 0, p: [0.6, 1, 0.05] });
      // leaflets
      const sp = SKETCH.spline([top, mid, tip], false, 3);
      for (let k = 3; k < sp.length - 1; k += 2) { const q = sp[k]; d.stroke([q, [q[0] + 2 * s, q[1] + 7 * s]], { w: 0.7, sh: 0, alpha: 0.8 }); }
      d.wash([top, mid, tip, [mid[0], mid[1] + 9 * s]], P.green, { alpha: 0.5, off: 1 });
    }
  }
  // a half-buried statue head (chunk 0, left): a calm stone face with a broken nose, sand to the chin
  if (chunk === 2) {
    const hx = 300, hy = 404;
    const head = [[hx - 30, hy + 22], [hx - 34, hy - 10], [hx - 26, hy - 40], [hx, hy - 50], [hx + 26, hy - 40], [hx + 34, hy - 8], [hx + 30, hy + 22]];
    d.shape(head, { fill: P.dust, w: 1.8, curve: true, hatch: { a: 70, gap: 2.2, w: 0.55, tone: (x, y) => (x - hx) / 40 + 0.3, cross: true, crossTone: (x, y) => (x - hx) / 40 - 0.4 } });
    // a headdress band, closed eyes, broken nose, a crack
    d.stroke([[hx - 30, hy - 24], [hx, hy - 30], [hx + 30, hy - 24]], { w: 1.2, curve: true });
    for (const ex of [-11, 11]) d.stroke([[hx + ex - 7, hy - 9], [hx + ex, hy - 6], [hx + ex + 7, hy - 9]], { w: 1.3, curve: true });
    d.spot([[hx - 3, hy - 4], [hx + 4, hy - 6], [hx + 5, hy + 4], [hx - 2, hy + 5]], { spread: 0.5 });
    d.stroke([[hx + 12, hy - 46], [hx + 8, hy - 30], [hx + 14, hy - 20], [hx + 9, hy - 8]], { w: 0.9 });
    d.stroke([[hx - 8, hy + 14], [hx + 8, hy + 14]], { w: 1, curve: true });
    const drift = [[hx - 60, hy + 30], [hx - 30, hy + 12], [hx, hy + 18], [hx + 34, hy + 10], [hx + 70, hy + 30], [hx + 70, hy + 60], [hx - 60, hy + 60]];
    d.wash(drift, P.sand, { alpha: 0.85, off: 0.6 });
    d.stroke(drift.slice(0, 5), { w: 1.3, curve: true, sh: 0 });
  }
};

/* ---- layer 3: the ground the heroes run on (top y 450) ---- */
IRON_ART.desertDraw[3] = (d, chunk) => {
  const P = IRON_P, gy = IRON_ART.GROUND_Y;
  const top = []; for (let x = -10; x <= 970; x += 14) top.push([x, gy + Math.sin(x / 90 + chunk) * 1.2 + (d.r() - 0.5) * 0.8]);
  const poly = top.concat([[970, 545], [-10, 545]]);
  d.wash(poly, P.sand, { alpha: 0.75, off: 0, spread: 0.8, layers: 4 });
  d.wash(top.map(([x, y]) => [x, y + 30]).concat([[970, 545], [-10, 545]]), P.ochre, { alpha: 0.3, off: 0, spread: 1.6, layers: 3, edge: false });
  // strata and ripples under the surface: rows of short wavy strokes, denser lower down
  for (let row = 0; row < 7; row++) {
    const y = gy + 14 + row * 12 + row * row * 0.8;
    for (let x = -10 + (row % 2) * 25; x < 970; x += 34 + d.r() * 30) {
      const l = 14 + d.r() * 22;
      d.stroke([[x, y], [x + l * 0.33, y - 1.6], [x + l * 0.66, y + 0.5], [x + l, y - 0.8]], { w: 0.55 + row * 0.06, curve: true, sh: 0, alpha: 0.45 + row * 0.04 });
    }
  }
  d.hatch(top.map(([x, y]) => [x, y + 56]).concat([[970, 545], [-10, 545]]), { a: 12, gap: 3, w: 0.55, alpha: 0.55, tone: (x, y) => (y - gy - 50) / 40 });
  // stones with a hatched shadow
  for (let i = 0; i < 11; i++) {
    const x = d.r() * 960, y = gy + 6 + d.r() * 60, s = 3 + d.r() * 6;
    const st = [[x - s, y], [x - s * 0.6, y - s * 0.8], [x + s * 0.5, y - s * 0.9], [x + s, y - s * 0.1], [x + s * 0.4, y + s * 0.3]];
    d.hatch([[x - s * 0.5, y + 0.5], [x + s * 2.2, y + 0.8], [x + s * 1.6, y + s * 0.6], [x - s * 0.2, y + s * 0.5]], { a: 0, gap: 1.2, w: 0.5, alpha: 0.7 });
    d.shape(st, { fill: i % 3 ? P.ironLight : P.ochreDeep, w: 1, corner: 40 });
  }
  // tufts of dry grass
  for (let i = 0; i < 6; i++) {
    const x = d.r() * 960, y = gy + 2;
    for (let b = 0; b < 6; b++) { const a = -Math.PI / 2 + (b - 2.5) * 0.28, l = 7 + d.r() * 8; d.stroke([[x + b * 1.3, y], [x + b * 1.3 + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5], [x + b * 1.3 + Math.cos(a) * l + (d.r() - 0.5) * 3, y + Math.sin(a) * l]], { w: 0.8, curve: true, sh: 0, p: [1, 0.8, 0.05] }); }
    d.wash([[x - 3, y], [x + 10, y], [x + 6, y - 10]], P.ochreDeep, { alpha: 0.4, off: 1, layers: 1 });
  }
  // the ground line itself, inked
  d.stroke(top, { w: 1.7, sh: 0.3, p: [0.6, 1, 0.6], brk: 0.3 });
  // an old giant footprint (a long crater with a raised lip) in some chunks
  if (chunk % 2 === 1) {
    const fx = 200 + d.r() * 500, fw = 260;
    d.wash([[fx, gy + 2], [fx + fw, gy + 2], [fx + fw - 20, gy + 24], [fx + 20, gy + 26]], P.ochreDeep, { alpha: 0.5, off: 1 });
    d.hatch([[fx, gy + 2], [fx + fw, gy + 2], [fx + fw - 20, gy + 24], [fx + 20, gy + 26]], { a: 8, gap: 2, w: 0.55, tone: (x, y) => 1 - (y - gy) / 30 });
    d.stroke([[fx - 10, gy], [fx + 8, gy - 5], [fx + 30, gy]], { w: 1.2, curve: true }); d.stroke([[fx + fw - 30, gy], [fx + fw - 8, gy - 5], [fx + fw + 10, gy]], { w: 1.2, curve: true });
  }
};
