/* Pip & Bo - World 40 Colossus March: the Colossus drawn in the sketch kit (shared iron helpers, foot, shin). */
'use strict';

/* The Iron Colossus's body pieces are SKETCH sheets, made once (three boil versions each) and blitted. Every piece can
   be drawn at an undo level (SKETCH.blit o.undo) for the undoing. Iron is old: rivet rows, seams, patched panels,
   rust drips under rivets, scratches, soot above vents, chains, ladders, hatches, stencilled numbers, nests.
   Helpers here take a drawer d (see sketch-kit.js) and draw in its coordinates:
     ironPlate(d, pts, o)        a riveted iron plate: wash, outline, rivet rows along chosen edges, wear
     ironScratches(d, x, y, n, o), ironStencil(d, text, x, y, size, o), ironChain(d, pts, o), ironPipe(d, pts, r, o),
     ironGrille(d, x, y, w, h, n, o), ironLadder(d, x, y0, y1, w, o), ironNest(d, x, y, o), ironBolt(d, x, y, r, o)
   Sheets: IRON_ART.foot() (key 'iron:foot'), IRON_ART.shin() ('iron:shin'). */

const IRON_ART = {};
const IRON_P = SKETCH.PAL;

function ironScratches(d, x, y, n, o = {}) {
  if (d.round < 3) return;
  const a0 = o.a == null ? -0.35 : o.a, s = o.s || 1;
  for (let i = 0; i < n; i++) {
    const a = a0 + (d.r() - 0.5) * 0.5, l = (6 + d.r() * 16) * s, sx = x + (d.r() - 0.5) * 22 * s, sy = y + (d.r() - 0.5) * 12 * s;
    const ex = sx + Math.cos(a) * l, ey = sy + Math.sin(a) * l;
    d.stroke([[sx, sy], [(sx + ex) / 2 + (d.r() - 0.5), (sy + ey) / 2 + (d.r() - 0.5)], [ex, ey]], { w: 0.55 + d.r() * 0.35, p: [0.1, 1, 0.05], sh: 0, curve: true, alpha: 0.6, layer: 'hatch' });
    if (d.round >= 4 && !d.dark && d.r() < 0.6) d.stroke([[sx + 0.8, sy - 0.8], [ex + 0.8, ey - 0.8]], { w: 0.7, col: '#fbf3df', alpha: 0.55, layer: 'white', sh: 0, bend: 0 });
  }
}
// stencilled letters: broken strokes and a pale paint wash
function ironStencil(d, text, x, y, size, o = {}) {
  if (d.round < 3) return;
  const col = o.col || (d.dark ? '#e7ddc4' : '#ede0bd');
  d.word(text, x, y, size, { w: size * 0.2, col, alpha: 0.8, align: o.align || 'center', rot: o.rot || 0, layer: 'white', jit: 0.25, bounce: 0.02 });
  d.word(text, x + 0.8, y + 0.8, size, { w: size * 0.06, alpha: 0.5, align: o.align || 'center', rot: o.rot || 0, layer: 'hatch', jit: 0.3, bounce: 0.02 });
}
function ironBolt(d, x, y, r, o = {}) {
  // a hex-ish bolt head: a domed ring with flats
  const pts = []; const a0 = d.r() * 1.2;
  for (let i = 0; i < 6; i++) { const a = a0 + i * Math.PI / 3; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  if (d.round >= 4) d.wash(pts, o.col || IRON_P.ironLight, { alpha: 0.4, off: 0.6, layers: 1, edge: false });
  if (d.round >= 3) {
    d.outline(pts, { w: Math.max(0.8, r * 0.28), corner: 30, ov: 0.6, jit: 0.3 });
    if (d.round >= 4) d.hatch([[x, y], pts[0], pts[1], pts[2]], { a: 20, gap: 1.4, w: 0.45, alpha: 0.7 });
  }
}
function ironChain(d, pts, o = {}) {
  // links along a path: one seen face on (an oval ring), the next edge on (a bar), alternating
  const sp = SKETCH.spline(pts, false, 1.5), L = o.link || 13, wl = o.wl || L * 0.55;
  let acc = 0, k = 0;
  for (let i = 1; i < sp.length; i++) {
    acc += Math.hypot(sp[i][0] - sp[i - 1][0], sp[i][1] - sp[i - 1][1]);
    if (acc < L * 0.78) continue;
    acc = 0; k++;
    const a = sp[Math.max(0, i - 6)], b = sp[i], cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2, ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    if (k % 2) {
      if (d.round >= 4) d.wash(SKETCH.ell(cx, cy, L * 0.62, wl * 0.62, 12, ang), o.col || IRON_P.iron, { alpha: 0.5, off: 0.7, layers: 1, edge: false });
      d.stroke(SKETCH.ell(cx, cy, L * 0.62, wl * 0.62, 14, ang, -0.3, Math.PI * 2 - 0.6), { w: o.w || 1.7, curve: true, c: [cx, cy], sh: 1, jit: 0.35 });
      d.stroke(SKETCH.ell(cx, cy, L * 0.36, wl * 0.22, 10, ang, 0.2, Math.PI * 2 - 0.3), { w: (o.w || 1.7) * 0.55, curve: true, c: [cx, cy], sh: 0.4, jit: 0.3 });
      if (d.round >= 4) d.stroke(SKETCH.ell(cx, cy, L * 0.5, wl * 0.45, 8, ang, Math.PI * 1.1, Math.PI * 1.45), { w: 0.9, col: '#fbf3df', alpha: 0.7, layer: 'white', curve: true, sh: 0 });
    } else {
      const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux, hw = (o.w || 1.7) * 1.4;
      const q = [[cx - ux * L * 0.6 + nx * hw, cy - uy * L * 0.6 + ny * hw], [cx + ux * L * 0.6 + nx * hw, cy + uy * L * 0.6 + ny * hw], [cx + ux * L * 0.6 - nx * hw, cy + uy * L * 0.6 - ny * hw], [cx - ux * L * 0.6 - nx * hw, cy - uy * L * 0.6 - ny * hw]];
      if (d.round >= 4) d.spot(q, { spread: 0.3 });
      else d.outline(q, { w: 1, corner: 30 });
    }
  }
}
// a pipe along a path: two outlines, contour hatching round it, flanges and brackets
function ironPipe(d, pts, r, o = {}) {
  const sp = SKETCH.spline(pts, false, 2), n = sp.length;
  const side = s => sp.map((p, i) => { const a = sp[Math.max(0, i - 1)], b = sp[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [p[0] - (b[1] - a[1]) / l * r * s, p[1] + (b[0] - a[0]) / l * r * s]; });
  const A = side(1), B = side(-1), poly = A.concat(B.slice().reverse());
  if (d.round >= 4) d.wash(poly, o.col || IRON_P.verd, { alpha: o.alpha || 0.55, off: 1.2, blooms: o.blooms || 1 });
  // the lower side heavier: draw it thicker
  const lowerFirst = (A[Math.floor(n / 2)][1] > B[Math.floor(n / 2)][1]);
  d.stroke(A, { w: lowerFirst ? 2.2 : 1.3, curve: false, p: [0.4, 1, 0.4], sh: 0.2 });
  d.stroke(B, { w: lowerFirst ? 1.3 : 2.2, curve: false, p: [0.4, 1, 0.4], sh: 0.2 });
  if (d.round >= 4) {
    // contour hatching on the shadow half: little arcs across the pipe
    const lines = [];
    for (let i = 3; i < n - 3; i += 3) {
      const a = sp[i - 1], b = sp[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
      const s = lowerFirst ? 1 : -1, p = sp[i];
      lines.push([[p[0] + nx * r * s * 0.15, p[1] + ny * r * s * 0.15], [p[0] + nx * r * s * 0.6 + (b[0] - a[0]) / l * 1.2, p[1] + ny * r * s * 0.6 + (b[1] - a[1]) / l * 1.2], [p[0] + nx * r * s * 0.98, p[1] + ny * r * s * 0.98]]);
    }
    d.contour(lines, { w: 0.6, alpha: 0.7 });
    // a paper highlight along the lit side
    const hl = sp.map((p, i) => { const a = sp[Math.max(0, i - 1)], b = sp[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, s = lowerFirst ? -1 : 1; return [p[0] - (b[1] - a[1]) / l * r * 0.55 * s, p[1] + (b[0] - a[0]) / l * r * 0.55 * s]; });
    d.stroke(hl.slice(2, -2), { w: r * 0.28, col: d.dark ? '#e9e2d2' : '#fbf3df', alpha: 0.55, layer: 'white', sh: 0, brk: 1 });
  }
  // flanges
  if (d.round >= 3) for (const f of o.flanges || []) {
    const i = Math.max(1, Math.min(n - 2, Math.round(f * (n - 1)))), a = sp[i - 1], b = sp[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ux = (b[0] - a[0]) / l, uy = (b[1] - a[1]) / l, nx = -uy, ny = ux, p = sp[i], R = r * 1.45, t = 3.2;
    const q = [[p[0] - ux * t + nx * R, p[1] - uy * t + ny * R], [p[0] + ux * t + nx * R, p[1] + uy * t + ny * R], [p[0] + ux * t - nx * R, p[1] + uy * t - ny * R], [p[0] - ux * t - nx * R, p[1] - uy * t - ny * R]];
    d.shape(q, { fill: o.col || IRON_P.verd, w: 1.4, corner: 30 });
    d.rivet(p[0] + nx * R * 0.7, p[1] + ny * R * 0.7, 1.2); d.rivet(p[0] - nx * R * 0.7, p[1] - ny * R * 0.7, 1.2);
  }
  return poly;
}
function ironGrille(d, x, y, w, h, n, o = {}) {
  const box = SKETCH.box(x, y, w, h);
  d.shape(box, { fill: o.fill || IRON_P.soot, w: 1.6, corner: 30 });
  for (let i = 0; i < n; i++) {
    const yy = y + (i + 0.6) * h / (n + 0.2);
    if (d.round >= 4) d.spot([[x + 3, yy - h / n * 0.32], [x + w - 3, yy - h / n * 0.32], [x + w - 3, yy + h / n * 0.12], [x + 3, yy + h / n * 0.12]], { spread: 0.3 });
    d.line(x + 2, yy + h / n * 0.2, x + w - 2, yy + h / n * 0.2, { w: 1.1, ov: 0.4 });
  }
  // soot above the vent
  if (d.round >= 4) {
    // soot: wavy smudges of hatching rising from the slats, fading out
    for (let i = 0; i < 5; i++) {
      const sx = x + w * (0.1 + i * 0.2), pts = [];
      for (let k = 0; k <= 8; k++) pts.push([sx + Math.sin(k * 0.9 + i) * 3 + k * 0.6, y - 2 - k * h * 0.2]);
      d.stroke(pts, { w: 2.2 - i * 0.1, curve: true, p: [1, 0.7, 0.05], sh: 0, alpha: 0.35, layer: 'hatch', brk: 0.6 });
    }
  }
}
function ironLadder(d, x, y0, y1, w, o = {}) {
  d.line(x, y0, x - 0.5, y1, { w: 1.6, ov: 1 }); d.line(x + w, y0, x + w + 0.5, y1, { w: 1.8, ov: 1 });
  const step = o.step || 11;
  for (let y = y0 + step * 0.6; y < y1 - 2; y += step) {
    d.line(x, y, x + w, y + 0.4, { w: 1.2, ov: 0.4 });
    if (d.round >= 4) d.stroke([[x + 1, y + 1.8], [x + w - 1, y + 2.2]], { w: 0.9, alpha: 0.45, layer: 'hatch', sh: 0 });
  }
  // brackets into the plate
  if (d.round >= 3) for (let y = y0 + 8; y < y1; y += step * 3.2) { d.rivet(x - 2.5, y, 1.4); d.rivet(x + w + 2.5, y, 1.4); }
}
function ironNest(d, x, y, o = {}) {
  if (d.round < 3) return;
  const s = o.s || 1;
  const bowl = SKETCH.ell(x, y, 14 * s, 6 * s, 16);
  if (d.round >= 4) d.wash(bowl, IRON_P.ochreDeep, { alpha: 0.55, off: 0.8 });
  for (let i = 0; i < 26; i++) {
    const a = d.r() * Math.PI, l = (8 + d.r() * 12) * s, cx = x + (d.r() - 0.5) * 22 * s, cy = y + (d.r() - 0.3) * 8 * s;
    d.stroke([[cx - Math.cos(a) * l / 2, cy - Math.sin(a) * l * 0.2], [cx, cy + (d.r() - 0.5) * 2], [cx + Math.cos(a) * l / 2, cy + Math.sin(a) * l * 0.2]], { w: 0.6 + d.r() * 0.4, p: [0.2, 1, 0.1], sh: 0, curve: true, alpha: 0.8 });
  }
  // two eggs peeking (paper) and a twig sticking out
  if (d.round >= 4) {
    for (const ex of [-4, 4]) { d.wash(SKETCH.ell(x + ex * s, y - 5 * s, 3.4 * s, 4 * s, 10), '#e8e4d8', { alpha: 0.7, off: 0.3, layers: 1 }); d.stroke(SKETCH.ell(x + ex * s, y - 5 * s, 3.4 * s, 4 * s, 10, 0, -0.5, 3.6), { w: 0.8, curve: true, sh: 0.5, c: [x + ex * s, y - 5 * s] }); }
    d.stipple(SKETCH.ell(x + 4 * s, y - 5 * s, 3 * s, 3.6 * s, 10), { n: 6, r: 0.4 });
  }
  d.stroke([[x + 10 * s, y - 2 * s], [x + 18 * s, y - 8 * s], [x + 24 * s, y - 9 * s]], { w: 0.8, curve: true, sh: 0 });
}
// a riveted plate: o.fill (iron colour), o.rivetEdges ([edge indices]), o.inset (rivet row inset), o.rust (drip chance),
// o.tone (hatch tone fn) o.hatchA, o.scratch (count), o.soot (top soot), o.patch (true: a patched panel: different rivets, weld bead)
function ironPlate(d, pts, o = {}) {
  const c = SKETCH.centroid(pts);
  if (d.round >= 4) {
    // a glaze over the plate, paper lifted out on the lit top-left, darker glazes pooled on the shadow side
    const [bx0, by0, bx1, by1] = SKETCH.bbox(pts), bw = bx1 - bx0, bh = by1 - by0;
    d.washIn(pts, () => {
      d.wash(pts, o.fill || IRON_P.iron, { alpha: o.fillAlpha || 0.5, off: 1.6, blooms: o.blooms == null ? 1 : o.blooms, spread: 1.2 });
      for (let i = 0; i < 4; i++) {
        const cx = bx0 + bw * (0.55 + d.r() * 0.5), cy = by0 + bh * (0.55 + d.r() * 0.5), r = Math.max(bw, bh) * (0.25 + d.r() * 0.2);
        d.wash(SKETCH.ell(cx, cy, r * (bw / Math.max(bw, bh) + 0.2), r * (bh / Math.max(bw, bh) + 0.2), 14, d.r()), o.shade || IRON_P.shadowInk, { alpha: (o.shadeAlpha || 0.13) * (0.7 + d.r() * 0.5), off: 0, spread: 2, layers: 2, edge: i === 0 });
      }
    });
    if (o.leave !== 0) d.lift(SKETCH.ell(bx0 + bw * 0.12, by0 + bh * 0.14, bw * (o.leave || 0.22) + 6, bh * (o.leave || 0.22) * 0.8 + 5, 12, -0.6), 0.32);
    if (o.rustWash !== false) {
      // rust runs down from the seams: tall ragged streaks, darker at the top
      const [x0, y0, x1, y1] = SKETCH.bbox(pts);
      for (let i = 0; i < (o.rustPatches == null ? 2 : o.rustPatches); i++) {
        const rx = x0 + (x1 - x0) * (0.1 + d.r() * 0.8), ry = y0 + (y1 - y0) * (0.05 + d.r() * 0.3), w2 = 2 + d.r() * 5, len = (y1 - ry) * (0.25 + d.r() * 0.45);
        if (!SKETCH.inside(pts, rx, ry + 2)) continue;
        const st = [[rx - w2 * 0.5, ry], [rx + w2 * 0.6, ry - 1], [rx + w2, ry + len * 0.3], [rx + w2 * 0.5, ry + len * 0.7], [rx + 0.5, ry + len], [rx - w2 * 0.4, ry + len * 0.65], [rx - w2 * 0.8, ry + len * 0.3]];
        d.washIn(pts, () => d.wash(st, d.r() < 0.5 ? IRON_P.rust : IRON_P.rustDark, { alpha: 0.42, off: 0.4, spread: 1.6, layers: 2, curve: true }));
      }
    }
  }
  if (o.tone && d.round >= 4) d.hatch(pts, { a: o.hatchA == null ? 55 : o.hatchA, gap: o.gap || 3.2, w: 0.7, tone: o.tone, cross: o.cross, crossTone: o.crossTone, alpha: 0.78 });
  if (d.round >= 2) d.outline(pts, { w: o.w || 2.2, c: o.c || c, corner: o.corner == null ? 34 : o.corner, ov: o.ov == null ? 2.8 : o.ov, curve: !!o.curve, smooth: !!o.smooth });
  else d.pencil(pts, { closed: true });
  if (d.round >= 4 && o.glint !== false) {
    // worn edges catch the light: a broken paper line just inside every edge that faces the light
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n], len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 14) continue;
      let nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len; const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if ((mx - c[0]) * nx + (my - c[1]) * ny < 0) { nx = -nx; ny = -ny; }
      if (nx * 0.6 + ny * 0.8 > -0.35) continue;
      const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len, ins = 2.6;
      d.stroke([[a[0] - nx * ins + ux * 4, a[1] - ny * ins + uy * 4], [b[0] - nx * ins - ux * 4, b[1] - ny * ins - uy * 4]], { w: 1.4, col: d.dark ? '#f3ecdc' : '#fbf3df', alpha: 0.8, layer: 'white', sh: 0, brk: 1.4, p: [0.1, 1, 0.1] });
    }
  }
  if (d.round >= 3) {
    const n = pts.length, inset = o.inset || 6;
    for (const ei of o.rivetEdges || []) {
      const a = pts[ei % n], b = pts[(ei + 1) % n], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len; let nx = -uy, ny = ux;
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; if ((c[0] - mx) * nx + (c[1] - my) * ny < 0) { nx = -nx; ny = -ny; }
      const k = Math.max(2, Math.round(len / (o.spacing || 15)));
      d.rivets(a[0] + nx * inset + ux * inset, a[1] + ny * inset + uy * inset, b[0] + nx * inset - ux * inset, b[1] + ny * inset - uy * inset, k, { r: o.r || (o.patch ? 1.6 : 2.1), rust: o.rust == null ? 0.28 : o.rust });
    }
    if (o.scratch) ironScratches(d, c[0] + (d.r() - 0.5) * 30, c[1] + (d.r() - 0.5) * 20, o.scratch, { s: o.scratchS || 1 });
    if (o.patch) {
      // a weld bead round the patch: little overlapping crescents
      const n2 = pts.length;
      for (let i = 0; i < n2; i++) {
        const a = pts[i], b = pts[(i + 1) % n2], len = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.floor(len / 3.2);
        for (let j = 0; j < k; j++) { const x = a[0] + (b[0] - a[0]) * j / k, y = a[1] + (b[1] - a[1]) * j / k; d.stroke(SKETCH.ell(x, y, 1.8, 1.4, 6, Math.atan2(b[1] - a[1], b[0] - a[0]), 0, Math.PI), { w: 0.55, curve: true, sh: 0, alpha: 0.7, layer: 'hatch', jit: 0.2, bend: 0 }); }
      }
    }
  }
}
IRON_ART.helpers = { ironPlate, ironScratches, ironStencil, ironChain, ironPipe, ironGrille, ironLadder, ironNest, ironBolt };

/* ---------- the foot (seen from the side, walking right) ----------
   Sheet 760 x 330, anchor at the middle of the sole's bottom (ox 380, oy 320). Three round iron toes like an
   elephant's, each with a rust-red nail plate and a knuckle band; the ankle hinge; a heel block with the chain's eye
   bolt and a hatch; an instep vent, a ladder, a patched panel, a pipe, stencil "L-2", a crow's nest. */
IRON_ART.FOOT = { w: 760, h: 330, ox: 380, oy: 320, toeX: 748, heelX: 6 };
IRON_ART.foot = () => SKETCH.sheet('iron:foot', IRON_ART.FOOT.w, IRON_ART.FOOT.h, (d) => {
  const H = IRON_ART.helpers, plate = H.ironPlate;
  // darker toward the bottom right of each form (light from the top left)
  const tn = (bx, by, sx, sy, m = 1) => (x, y) => ((x - bx) / sx * 0.45 + (y - by) / sy * 0.95) * m - 0.32;
  // ---- round 1: construction (pencil) ----
  d.pcircle(205, 100, 76); d.pcircle(205, 100, 30); d.pcircle(518, 170, 80, { ry: 0.95 }); d.pcircle(612, 196, 70); d.pcircle(690, 218, 56);
  d.pencil([[0, 320], [760, 320]], { alpha: 0.25 }); d.pencil([[205, 0], [205, 330]], { alpha: 0.15 });
  d.pencil([[40, 236], [748, 258]], { alpha: 0.2 });
  const back = [[90, -4], [70, 50], [48, 120], [36, 190], [34, 240], [124, 242], [118, 170], [116, 100], [122, 40], [130, -4]];
  const main = [[130, -4], [122, 40], [116, 100], [118, 170], [124, 242], [352, 248], [360, 170], [356, 110], [330, 40], [300, -4]];
  const instep = [[330, 40], [356, 110], [360, 170], [352, 248], [470, 252], [462, 160], [452, 100], [390, 78]];
  const toes = [
    [[440, 252], [436, 170], [446, 124], [476, 100], [520, 94], [560, 106], [584, 138], [594, 200], [592, 254]],
    [[540, 256], [536, 192], [546, 152], [576, 128], [618, 124], [654, 140], [676, 176], [684, 220], [682, 258]],
    [[632, 258], [628, 216], [640, 186], [668, 168], [704, 166], [730, 182], [746, 212], [750, 244], [742, 262]],
  ];
  const nails = [
    [[506, 92], [538, 97], [564, 112], [582, 138], [568, 142], [552, 124], [532, 111], [504, 106]],
    [[604, 122], [636, 127], [662, 146], [678, 176], [664, 180], [650, 158], [628, 142], [602, 137]],
    [[690, 164], [716, 171], [738, 191], [749, 220], [736, 223], [725, 199], [707, 184], [688, 179]],
  ];
  const sole = [[30, 236], [250, 242], [470, 250], [742, 258], [754, 276], [744, 300], [714, 318], [470, 322], [250, 322], [66, 318], [40, 302], [28, 270]];
  const heel = [[34, 244], [14, 252], [4, 278], [10, 304], [30, 318], [62, 316], [60, 276], [52, 248]];
  for (const q of [back, main, instep, sole, heel, nails[0], nails[1], nails[2]]) d.solid(q, { lw: 3 });
  for (const q of toes) d.solid(q, { curve: true, lw: 3 });
  if (d.round < 2) { for (const q of [back, main, instep, sole, heel].concat(toes)) d.pencil(q, { closed: true, alpha: 0.6, w: 1.1, curve: toes.includes(q) }); return; }
  // ---- the boot body: three plates ----
  plate(d, back, { fill: IRON_P.iron, rivetEdges: [1, 2, 3, 6, 7], tone: tn(40, 0, 120, 240, 1.1), hatchA: 72, rust: 0.4, scratch: 4, blooms: 1, rustPatches: 2 });
  plate(d, main, { fill: '#8e604a', rivetEdges: [4], tone: tn(130, 20, 260, 240), hatchA: 62, rust: 0.3, scratch: 7, rustPatches: 3 });
  plate(d, instep, { fill: IRON_P.ironLight, rivetEdges: [3, 4, 6, 7], tone: tn(340, 60, 140, 200, 1.1), hatchA: 50, rust: 0.35, scratch: 3 });
  const patch = [[140, 168], [204, 164], [208, 222], [144, 226]];
  plate(d, patch, { fill: '#857560', rivetEdges: [0, 1, 2, 3], patch: true, inset: 4, spacing: 10, tone: tn(140, 150, 70, 80, 0.9), hatchA: 35, rust: 0.15, rustPatches: 1 });
  // ---- the toes, back to front; each overlap throws a black crease ----
  toes.forEach((tp, i) => {
    plate(d, tp, { fill: i === 1 ? '#946450' : IRON_P.iron, rivetEdges: [], rust: 0, scratch: 3, curve: true, w: 2.6, rustPatches: 1 });
    // contour hatching that wraps round the dome of the toe, and a few straight strokes in the deepest shadow
    const tcx = (tp[1][0] + tp[7][0]) / 2 - 14, tcy = tp[4][1] + 40;
    d.arcHatch(tp, tcx, tcy, { r0: 30, r1: (tp[7][0] - tp[1][0]) * 0.62, n: 13, mid: 0.55, span: 2.1, w: 0.75, sq: 1.05 });
    d.hatch(tp, { a: 62, gap: 2.4, w: 0.6, alpha: 0.7, tone: (x, y) => (x - tcx) / 70 + (y - tcy) / 90 - 0.25 });
    // the knuckle band: two curved lines with rivets between
    const bx = tp[1][0] + (tp[7][0] - tp[1][0]) * 0.32, top = tp[3][1] + 8 + i * 2;
    d.stroke([[bx, top + 2], [bx - 4, (top + 250) / 2], [bx - 2, 250]], { curve: true, w: 1.5 });
    d.stroke([[bx + 14, top - 2], [bx + 11, (top + 250) / 2], [bx + 13, 252]], { curve: true, w: 1.3 });
    d.rivets(bx + 6, top + 10, bx + 4, 240, 6, { r: 1.9, rust: 0.4 });
    // the nail plate
    d.shape(nails[i], { fill: IRON_P.rust, w: 1.9, corner: 70, curve: true, hatch: { a: 20, gap: 2.2, w: 0.55, tone: (x, y) => 0.25 + (y - nails[i][0][1]) / 50 } });
    if (d.round >= 4) d.stroke(nails[i].slice(0, 3), { w: 1.5, col: '#fbf3df', layer: 'white', alpha: 0.7, curve: true, sh: 0 });
    // the crease behind the next toe
    if (i < 2 && d.round >= 4) { const e = toes[i + 1].slice(0, 4); d.spot(e.concat(e.slice().reverse().map(([x, y], k) => [x - 8 + k, y + 2])), { spread: 0.4 }); }
  });
  // ---- the ankle hinge cap ----
  const ax = 205, ay = 100, ar = 74;
  const capPts = d.ellipse(ax, ay, ar, ar * 0.97, { fill: '#8a6e60', w: 2.8 });
  d.arcHatch(capPts, ax - 6, ay - 8, { r0: ar * 0.4, r1: ar * 1.02, n: 16, mid: 0.85, span: 2.6, w: 0.7 });
  d.hatch(capPts, { a: 40, gap: 2.2, w: 0.55, alpha: 0.6, tone: (x, y) => ((x - ax) * 0.6 + (y - ay) * 0.8) / ar * 1.3 - 0.2 });
  d.stroke(SKETCH.ell(ax, ay, ar * 0.8, ar * 0.78, 40, 0, 0.3, Math.PI * 2 + 0.2), { w: 1.4, curve: true, c: [ax, ay], sh: 1.2 });
  if (d.round >= 4) d.spot(SKETCH.crescent(ax, ay, ar * 0.8, 7, -0.5, 2.3), { spread: 0.2 });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.2, x = ax + Math.cos(a) * ar * 0.66, y = ay + Math.sin(a) * ar * 0.64; H.ironBolt(d, x, y, 4.2); if (d.r() < 0.45) d.drip(x, y + 4, 8 + d.r() * 12); }
  d.ellipse(ax, ay, ar * 0.32, ar * 0.31, { fill: IRON_P.soot, w: 2.2, hatch: { a: -30, gap: 1.9, w: 0.6, tone: (x, y) => ((x - ax) + (y - ay)) / (ar * 0.3) * 0.8 + 0.45 } });
  d.line(ax - ar * 0.18, ay - ar * 0.04, ax + ar * 0.18, ay + ar * 0.04, { w: 3.2, ov: 0.6 });
  d.line(ax - ar * 0.04, ay - ar * 0.18, ax + ar * 0.04, ay + ar * 0.18, { w: 3.2, ov: 0.6 });
  d.ellipse(ax + ar * 0.48, ay - ar * 0.48, 3.6, 3.6, { fill: IRON_P.core, w: 1.2 });
  if (d.round >= 4) d.stroke(SKETCH.ell(ax, ay, ar * 0.9, ar * 0.88, 20, 0, Math.PI * 1.05, Math.PI * 1.45), { w: 2.6, col: '#fbf3df', layer: 'white', alpha: 0.85, curve: true, sh: 0 });
  // ---- the sole, and the heel block ----
  plate(d, sole, { fill: IRON_P.soot, fillAlpha: 0.6, tone: (x, y) => 0.3 + (y - 236) / 80, hatchA: 6, gap: 2.4, cross: true, crossTone: (x, y) => (y - 270) / 50, rustPatches: 0, blooms: 0, w: 3, leave: 0.02 });
  plate(d, heel, { fill: IRON_P.iron, tone: (x, y) => 0.2 + (y - 244) / 70, hatchA: 80, gap: 2.2, rustPatches: 1, w: 2.6, corner: 50, smooth: true });
  // the chain's eye bolt (the chain itself is drawn live so it can sway)
  d.ellipse(28, 286, 11, 10, { fill: IRON_P.iron, w: 2.3, hatch: { a: 30, gap: 1.7, w: 0.5, tone: () => 0.7 } });
  d.ellipse(28, 286, 4.5, 4.2, { fill: IRON_P.soot, w: 1.3 });
  if (d.round >= 3) {
    d.stroke([[34, 246], [250, 252], [470, 260], [744, 268]], { w: 1.5, curve: true });
    for (let i = 0; i < 15; i++) { const x = 64 + i * 46, y = 249 + (x / 760) * 18; H.ironBolt(d, x, y, 3.8); if (d.r() < 0.45) d.drip(x, y + 4, 10 + d.r() * 16); }
    for (let i = 0; i < 26; i++) {
      const x = 74 + i * 25.6;
      d.shape([[x - 8, 314], [x + 8, 314], [x + 6, 327], [x - 6, 327]], { w: 1.2, corner: 30 });
      if (d.round >= 4) d.spot([[x - 6, 319], [x + 6, 319], [x + 5, 326], [x - 5, 326]], { spread: 0.3 });
    }
    // the sole is built of slabs: seams with bolt heads; the bottom edge is scuffed bright; caked sand and a stone
    for (const sx of [150, 290, 430, 580, 690]) {
      const y0 = 250 + sx / 760 * 16;
      d.stroke([[sx, y0 + 4], [sx - 1, (y0 + 312) / 2], [sx + 1, 312]], { w: 1.5, curve: true });
      d.stroke([[sx + 3, y0 + 6], [sx + 2, 310]], { w: 0.9, col: '#fbf3df', layer: 'white', alpha: 0.45, sh: 0, brk: 1 });
      H.ironBolt(d, sx + 8, y0 + 22, 3.2); H.ironBolt(d, sx + 8, 296, 3.2);
    }
    if (d.round >= 4) {
      for (let i = 0; i < 18; i++) { const x = 70 + d.r() * 640; d.stroke([[x, 311.5], [x + 6 + d.r() * 12, 311]], { w: 1.2, col: '#fbf3df', layer: 'white', alpha: 0.7, sh: 0 }); }
      for (const [mx, mw] of [[330, 60], [520, 40], [120, 30]]) { const m = [[mx, 313], [mx + mw * 0.4, 309], [mx + mw, 313], [mx + mw * 0.8, 322], [mx + 6, 322]]; d.wash(m, IRON_P.sand, { alpha: 0.9, off: 0.4 }); d.stipple(m, { n: 16, r: 0.5 }); d.stroke(m.slice(0, 3), { w: 0.8, curve: true, sh: 0 }); }
      d.shape([[612, 316], [624, 312], [632, 318], [626, 325], [614, 324]], { fill: IRON_P.ochreDeep, w: 1, corner: 40 });
    }
    // the heel hatch
    const hb = [[54, 140], [102, 138], [106, 198], [56, 200]];
    d.shape(hb, { fill: IRON_P.rustLight, w: 1.8, corner: 30, hatch: { a: 70, gap: 2.3, w: 0.55, tone: (x, y) => (x - 54) / 52 * 0.7 + 0.15 } });
    d.rivets(60, 146, 98, 145, 4, { r: 1.4 }); d.rivets(61, 193, 100, 193, 4, { r: 1.4 });
    d.shape([[48, 150], [56, 150], [56, 162], [48, 162]], { fill: IRON_P.soot, w: 1.1, corner: 30 });
    d.shape([[48, 178], [56, 178], [56, 190], [48, 190]], { fill: IRON_P.soot, w: 1.1, corner: 30 });
    d.stroke([[92, 162], [97, 164], [97, 174], [92, 176]], { w: 1.8, curve: true });
    H.ironStencil(d, '07', 79, 170, 12);
    // ladder, vent, stencils, pipe, nest, dents, top rivets
    H.ironLadder(d, 300, 96, 236, 14, { step: 9 });
    H.ironGrille(d, 378, 124, 50, 38, 5);
    H.ironStencil(d, 'L-2', 250, 214, 22, { rot: -0.03 });
    H.ironStencil(d, 'NO SKIP', 412, 222, 8, { rot: 0.02 });
    H.ironPipe(d, [[268, 34], [330, 56], [400, 50], [452, 72], [486, 102]], 4.6, { flanges: [0.2, 0.62, 0.95] });
    H.ironNest(d, 572, 112, { s: 0.85 });
    for (const [x, y] of [[170, 236], [420, 200], [330, 228], [508, 220], [600, 236], [700, 240]]) {
      d.stroke(SKETCH.ell(x, y, 7, 3.4, 8, 0.2, 0.2, Math.PI - 0.2), { w: 1, curve: true, sh: 0 });
      if (d.round >= 4) d.hatch(SKETCH.ell(x + 1, y + 1, 6, 2.6, 8, 0.2), { a: 20, gap: 1.3, w: 0.5, alpha: 0.6 });
    }
    d.rivets(96, 6, 296, 6, 11, { r: 2, rust: 0.5 });
  }
  if (d.round >= 4) {
    // painter's light: a cool blue-violet glaze pooled in the shadow side of every form (the sky in the shadows),
    // and warm sand-bounce light glazed up into the undersides
    for (const q of [back, main, instep].concat(toes)) {
      const [x0, y0, x1, y1] = SKETCH.bbox(q);
      d.washIn(q, () => {
        d.wash(SKETCH.ell(x1 - (x1 - x0) * 0.1, y1 - (y1 - y0) * 0.05, (x1 - x0) * 0.75, (y1 - y0) * 0.7, 18, d.r()), '#4f5f86', { alpha: 0.22, off: 0, spread: 2.2, layers: 3, edge: false });
        d.wash([[x0 - 10, y1 - 26], [x1 + 10, y1 - 30], [x1 + 10, y1 + 10], [x0 - 10, y1 + 10]], '#e0a85a', { alpha: 0.2, off: 0, spread: 2, layers: 2, edge: false });
      });
    }
    d.washIn(sole, () => d.wash([[0, 296], [760, 300], [760, 330], [0, 330]], '#d89a50', { alpha: 0.28, off: 0, spread: 2, layers: 2, edge: false }));
    // sunlit top-left faces: a warm glaze where the light lands
    d.washIn(back, () => d.wash(SKETCH.ell(60, 60, 90, 120, 16, 0.2), '#f0c070', { alpha: 0.14, off: 0, spread: 2, layers: 2, edge: false }));
    d.washIn(main, () => d.wash(SKETCH.ell(170, 40, 120, 90, 16, 0.2), '#f0c070', { alpha: 0.12, off: 0, spread: 2, layers: 2, edge: false }));
  }
  // the silhouette again, heavy: the outer line of a big form is the boldest line in it
  d.stroke([[90, -4], [70, 50], [48, 120], [36, 190], [34, 244]], { w: 4.2, curve: true, c: [380, 200], sh: 1.2 });
  d.stroke([[4, 278], [10, 304], [30, 318], [66, 320], [250, 324], [470, 324], [714, 320], [744, 302], [756, 276], [748, 250]], { w: 4.6, curve: true, c: [380, 200], sh: 1.3 });
  d.stroke([[628, 216], [640, 186], [668, 168], [704, 166], [730, 182], [746, 212], [751, 244]], { w: 3.4, curve: true, c: [690, 230], sh: 1.2 });
}, { ox: IRON_ART.FOOT.ox, oy: IRON_ART.FOOT.oy });

/* ---------- the shin (seen from the side): a tall riveted cylinder with a cuff and a piston ----------
   Sheet 300 x 520, anchor at the bottom middle of the cuff (ox 150, oy 520): it sits on the top of the foot. */
IRON_ART.SHIN = { w: 300, h: 520, ox: 150, oy: 512 };
IRON_ART.shin = () => SKETCH.sheet('iron:shin', IRON_ART.SHIN.w, IRON_ART.SHIN.h, (d) => {
  const { ironPlate: plate, ironPipe: pipe } = IRON_ART.helpers;
  const x0 = 40, x1 = 250, cx = (x0 + x1) / 2;
  d.solid([[x0, 0], [x1, 0], [x1 + 18, 512], [x0 - 18, 512]], { lw: 3 }); d.solid([[x1 + 2, 40], [x1 + 22, 40], [x1 + 22, 450], [x1 + 2, 450]]);
  d.pencil([[cx, 0], [cx, 520]], { alpha: 0.2 });
  // the cylinder seen from below: every ring bows down in the middle (we look up at the near half of each circle)
  const bowY = (x, y, k = 10) => y + Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * k;
  const ringPts = (y, k, xa = x0, xb = x1) => { const p = []; for (let i = 0; i <= 12; i++) { const x = xa + (xb - xa) * i / 12; p.push([x, bowY(x, y, k)]); } return p; };
  const bands = [[0, 130], [130, 270], [270, 410], [410, 466]];
  bands.forEach(([a, b], i) => {
    const pts = ringPts(a, 8).concat(ringPts(b, 9).reverse());
    plate(d, pts, { fill: i % 2 ? '#8e604a' : IRON_P.iron, rivetEdges: [], rust: 0.35, scratch: 3, corner: 60, glint: false });
    // contour hatching: vertical strokes that crowd together toward the shadow side of the cylinder
    if (d.round >= 4) {
      const lines = [];
      for (let k = 0; k < 26; k++) { const u = Math.pow(k / 25, 0.6), x = x0 + 6 + (x1 - x0 - 10) * (0.35 + 0.65 * u); if (d.r() < 0.15) continue; lines.push([[x, bowY(x, a, 8) + 3], [x + 0.6, (a + b) / 2 + 4], [x, bowY(x, b, 9) - 3]]); }
      d.contour(lines, { w: 0.7, alpha: 0.7 });
      d.hatch(pts, { a: 8, gap: 2.6, w: 0.55, alpha: 0.55, tone: (x) => (x - x0) / (x1 - x0) * 1.6 - 0.75 });
      d.stroke(ringPts(a + 4, 8, x0 + 12, x0 + 90), { w: 1.3, col: '#fbf3df', layer: 'white', alpha: 0.6, curve: true, sh: 0, brk: 1 });
    }
    const rr = ringPts(b - 7, 9); for (let k = 1; k < rr.length - 1; k++) d.rivet(rr[k][0], rr[k][1], 2.1);
  });
  // the cuff: a thick ring where the shin meets the foot, with big bolts and a black shadow under its lip
  const cuff = ringPts(462, 10, x0 - 14, x1 + 14).concat(ringPts(510, 12, x0 - 18, x1 + 18).reverse());
  plate(d, cuff, { fill: IRON_P.rust, rivetEdges: [], tone: (x, y) => (x - x0) / (x1 - x0) * 1.3 - 0.3, hatchA: 80, gap: 2.4, rust: 0.2, w: 2.8, corner: 60 });
  { const rr = ringPts(486, 11, x0 - 10, x1 + 10); for (let k = 1; k < rr.length - 1; k++) IRON_ART.helpers.ironBolt(d, rr[k][0], rr[k][1], 4.6); }
  if (d.round >= 4) d.spot(ringPts(510, 12, x0 - 18, x1 + 18).concat(ringPts(518, 12, x0 - 12, x1 + 12).reverse()), { spread: 0.3 });
  // the front piston: a polished rod in a housing
  const px = x1 + 8;
  d.shape([[px - 6, 40], [px + 14, 40], [px + 14, 300], [px - 6, 300]], { fill: IRON_P.soot, w: 2, corner: 30, hatch: { a: 90, gap: 2, w: 0.6, tone: (x) => (x - px + 6) / 20 } });
  d.shape([[px - 2, 300], [px + 10, 300], [px + 10, 450], [px - 2, 450]], { fill: '#b8b2a6', w: 1.6, corner: 30, hatch: { a: 90, gap: 1.6, w: 0.5, tone: (x) => (x - px) / 12 - 0.2 } });
  if (d.round >= 4) d.stroke([[px + 1.5, 304], [px + 1.5, 446]], { w: 2, col: '#fbf3df', layer: 'white', alpha: 0.8, sh: 0 });
  // a ladder up the back and a pipe
  if (d.round >= 3) {
    IRON_ART.helpers.ironLadder(d, x0 + 18, 20, 440, 18, { step: 12 });
    pipe(d, [[x0 + 70, 0], [x0 + 74, 150], [x0 + 64, 300], [x0 + 80, 455]], 4.5, { flanges: [0.3, 0.7] });
    IRON_ART.helpers.ironStencil(d, '2', cx + 40, 200, 40);
    ironScratches(d, cx + 10, 330, 6);
  }
}, { ox: IRON_ART.SHIN.ox, oy: IRON_ART.SHIN.oy });
