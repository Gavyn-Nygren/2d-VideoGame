/* Pip & Bo - World 40 Colossus March: Coming Apart (Part 7). Sunny Meadow at dawn behind, the Colossus in pencil. */
'use strict';

/* The first full, bright colour of the level: a dawn sky over Sunny Meadow (three parallax layers, two chunks each),
   while the Colossus the heroes run down is only a pencil drawing now, being rubbed out.
     IRON_ART.meadow(l, c)        'iron:meadow:<l>:<c>'  l 0 sky and sun, 1 far hills (friends from old worlds, small),
                                                         2 near hills, trees, the cottage (960 x 540, screen layers)
     IRON_ART.fallBody(k)         'iron:fall:body:<k>'   the Colossus in pencil behind the course, world x 1000k - 200
                                                         .. +1100, y -300 .. 1400 (low res, one version)
     IRON_ART.fallPlate(w, wall)  'iron:fall:plate:...'  a pencil iron plate w wide (anchor: its top-left); wall: deep
     IRON_ART.fallPump()  fallSpring()  fallPost()       the foot pump, the spring plate, the chain post (anchor: bottom middle)
     IRON_ART.fallHands()  fallKey()                     the two hands and the great key in the grass (anchor: bottom middle) */

const F_INK = () => SKETCH.INK;
IRON_ART.MEADOW_H = [620, 680, 800];   // sheet heights: each layer runs on down, so its vertical parallax never shows paper
IRON_ART.meadow = (l, c = 0) => {
  const key = 'iron:meadow:' + l + ':' + c;
  if (SKETCH.has(key) && !IRON_ART.redraw) return key;
  SKETCH.sheet(key, 960, IRON_ART.MEADOW_H[l], d => IRON_ART.meadowDraw[l](d, c), { flat: true, seed: 9500 + l * 31 + c * 7, res: l === 0 ? Math.min(SKETCH.res, 1.25) : SKETCH.res });
  return key;
};
IRON_ART.meadowDraw = [];
// a ridge across a chunk: slow bumps, flattened to y0 at both edges so the two chunks tile with no seam
function ironMeadowLine(y0, amp, seed, step = 12, x0 = -20, x1 = 980) {
  const pts = [];
  for (let x = x0; x <= x1; x += step) {
    const e = Math.max(0, Math.min(1, x / 160, (960 - x) / 160)), k = e * e * (3 - 2 * e);
    pts.push([x, y0 - k * amp * (0.6 * Math.sin(x / 150 + seed) + 0.28 * Math.sin(x / 57 + seed * 2.3) + 0.12 * Math.sin(x / 19 + seed * 5))]);
  }
  return pts;
}
// layer 0: the dawn sky. Long horizontal glazes, rose at the top warming to gold at the horizon, each a full-width
// sheet of wash with a slow ragged top (so it reads as one graded wash, never blobs); thin pink-bellied cloud streaks;
// the sun rising behind the far hills (chunk 0)
IRON_ART.meadowDraw[0] = (d, c) => {
  const P = IRON_P;
  d.pencil([[0, 384], [960, 386]], { alpha: 0.25 });
  const glaze = [[-10, '#d7a3b0', 0.16], [40, '#d9a3b0', 0.14], [110, '#e6aa94', 0.16], [170, '#eab08e', 0.15], [230, '#efbd82', 0.17],
    [290, '#f2c77c', 0.2], [340, '#f5d488', 0.22], [380, '#f7df98', 0.2]];
  glaze.forEach(([y, col, a], i) => {
    const top = ironMeadowLine(y, 10, i * 1.7 + c * 0.9, 16);
    d.wash(top.concat([[980, 620], [-20, 620]]), col, { alpha: a, off: 0, spread: 1.6, layers: 2, edge: false, curve: true });
  });
  // a cool glaze high up: the night going (blue-grey, very light, top only)
  d.wash(ironMeadowLine(-30, 8, 3 + c, 16).concat([[980, 70 + 10 * c], [600, 90], [300, 60], [-20, 80]]), P.greyBlue, { alpha: 0.12, off: 0, spread: 2, edge: false, curve: true });
  if (c === 0) {
    const sx = 690, sy = 372;
    for (let i = 0; i < 5; i++) { const rr = 90 + i * 34; d.wash(SKETCH.ell(sx, sy, rr * 1.25, rr * 0.8, 24, 0), i % 2 ? P.coreHot : '#f6c48a', { alpha: 0.09, off: 0, spread: 2.4, edge: false }); }
    d.lift(SKETCH.ell(sx, sy, 54, 52, 20), 1);
    d.wash(SKETCH.ell(sx, sy, 52, 50, 20), P.coreHot, { alpha: 0.5, off: 0, spread: 1.2, edge: false });
    d.stroke(SKETCH.ell(sx, sy, 54, 52, 24, 0, Math.PI * 0.9, Math.PI * 2.1), { w: 1.3, curve: true, alpha: 0.55, p: [0.05, 1, 0.05] });
    for (let i = 0; i < 30; i++) {
      const a = Math.PI + i / 29 * Math.PI, r0 = 66 + d.r() * 10, r1 = r0 + 14 + d.r() * (i % 2 ? 18 : 54);
      d.stroke([[sx + Math.cos(a) * r0, sy + Math.sin(a) * r0], [sx + Math.cos(a) * r1, sy + Math.sin(a) * r1]], { w: i % 2 ? 0.6 : 1, alpha: 0.32, sh: 0, p: [1, 0.8, 0.05] });
    }
  }
  // cloud streaks: long thin lenses, lit gold underneath, rose on top, an ink line only under the belly
  const streaks = c === 0 ? [[60, 96, 240], [330, 168, 300], [740, 70, 180], [520, 250, 200], [790, 214, 150]] : [[120, 130, 280], [520, 62, 220], [640, 200, 300], [300, 240, 140]];
  for (const [x, y, w] of streaks) {
    const top = [], bel = [];
    for (let k = 0; k <= 16; k++) { const t = k / 16, h = Math.sin(t * Math.PI); top.push([x + w * t, y - h * (8 + 6 * Math.sin(t * 7 + x))]); bel.push([x + w * (1 - t), y + Math.sin((1 - t) * Math.PI) * 4]); }
    d.wash(top.concat(bel), '#f3e1d6', { alpha: 0.55, off: 1, spread: 1.2, edge: false, curve: true });
    d.wash(bel.concat([[x + w * 0.2, y - 3], [x + w * 0.8, y - 3]]).reverse(), '#e9a08e', { alpha: 0.35, off: 0, spread: 1.4, edge: false });
    d.wash(bel.map(([px, py]) => [px, py + 1]).concat([[x + w * 0.15, y + 6], [x + w * 0.85, y + 6]]), P.core, { alpha: 0.3, off: 0, spread: 1, edge: false });
    d.stroke(bel.slice(2, 14), { w: 1, curve: true, alpha: 0.4, p: [0.05, 1, 0.05] });
  }
  for (let i = 0; i < 5; i++) { const bx = 240 + i * 110 + d.r() * 60, by = 120 + d.r() * 90, s = 0.7 + d.r() * 0.6; d.stroke([[bx - 7 * s, by - 2 * s], [bx - 2 * s, by - 3 * s], [bx, by + 1], [bx + 2 * s, by - 3 * s], [bx + 7 * s, by - 3 * s]], { w: 1, curve: true, alpha: 0.65, sh: 0 }); }
};
// layer 1: the far hills, blue-green in the morning haze, fields in stripes, old friends standing small on the skyline
IRON_ART.meadowDraw[1] = (d, c) => {
  const P = IRON_P, H = IRON_ART.MEADOW_H[1], ridge = ironMeadowLine(392, 34, 1.3 + c * 2.1, 10);
  const yAt = x => { const i = Math.max(0, Math.min(ridge.length - 1, Math.round((x + 20) / 10))); return ridge[i][1]; };
  const body = ridge.concat([[980, H], [-20, H]]);
  d.wash(body, '#a9bba2', { alpha: 0.6, off: 0, spread: 1.4, layers: 2, edge: false, curve: true });
  d.wash(body, '#cdd8cf', { alpha: 0.25, off: 0, spread: 2, edge: false, curve: true });
  // the haze lying in the valleys: a light glaze low on the hills
  d.wash(ironMeadowLine(430, 8, 4 + c, 16).concat([[980, 480], [-20, 480]]), '#e9e2cf', { alpha: 0.3, off: 0, spread: 2, edge: false, curve: true });
  d.stroke(ridge, { w: 1.1, curve: true, alpha: 0.4, p: [0.2, 1, 0.2], col: P.greyBlueDark });
  // field stripes and hedgerows running down the slopes (blue pencil), lower fields warmer
  for (let j = 0; j < 5; j++) {
    const y = 440 + j * 52, line = ironMeadowLine(y, 12 + j * 3, j * 2.2 + c, 20);
    d.wash(line.concat(ironMeadowLine(y + 24, 12 + j * 3, j * 2.2 + c + 0.3, 20).reverse()), j % 2 ? '#b6c48e' : '#c9c98e', { alpha: 0.28, off: 0, spread: 1.4, edge: false, curve: true });
    d.stroke(line, { w: 0.9, curve: true, alpha: 0.35, sh: 0, col: P.greyBlueDark });
    for (let x = 20 + j * 30; x < 960; x += 70 + d.r() * 60) { const yy = line[Math.round((x + 20) / 20)][1]; d.wash(SKETCH.ell(x, yy - 4, 7, 5, 10), '#6f8a6a', { alpha: 0.4, off: 0.4, edge: false }); }
  }
  const friends = c === 0 ? [['dino', 170], ['snow', 520], ['tree', 840]] : [['robot', 250], ['rocket', 650], ['tree', 900]];
  for (const [kind, x] of friends) {
    const y = yAt(x) + 2, ink = { col: P.greyBlueDark };
    if (kind === 'dino') d.shape([[x - 16, y], [x - 10, y - 10], [x + 4, y - 12], [x + 12, y - 22], [x + 18, y - 20], [x + 12, y - 10], [x + 14, y], [x + 8, y], [x + 4, y - 6], [x - 6, y - 6], [x - 8, y]], { fill: '#6f8592', w: 0.9, corner: 40, alpha: 0.7, col: P.greyBlueDark });
    else if (kind === 'snow') { d.ellipse(x, y - 7, 7, 7, Object.assign({ fill: '#f6ecd4', w: 0.9 }, ink)); d.ellipse(x, y - 18, 5, 5, Object.assign({ fill: '#f6ecd4', w: 0.9 }, ink)); d.line(x + 4, y - 18, x + 9, y - 17, { w: 1.4, col: P.ember, ov: 0 }); }
    else if (kind === 'robot') { d.shape(SKETCH.box(x - 6, y - 18, 12, 12), Object.assign({ fill: '#8fa3ad', w: 0.9 }, ink)); d.shape(SKETCH.box(x - 4, y - 26, 8, 7), Object.assign({ fill: '#8fa3ad', w: 0.9 }, ink)); d.line(x, y - 26, x, y - 31, { w: 0.8, ov: 0, col: P.greyBlueDark }); }
    else if (kind === 'rocket') { d.shape([[x, y - 30], [x + 5, y - 18], [x + 5, y - 4], [x - 5, y - 4], [x - 5, y - 18]], Object.assign({ fill: '#e8e0d0', w: 0.9 }, ink)); d.shape([[x - 5, y - 8], [x - 9, y], [x - 5, y - 4]], { fill: P.rustLight, w: 0.7, col: P.greyBlueDark }); d.shape([[x + 5, y - 8], [x + 9, y], [x + 5, y - 4]], { fill: P.rustLight, w: 0.7, col: P.greyBlueDark }); }
    else { d.stroke([[x, y], [x, y - 14]], { w: 1.2, col: P.greyBlueDark }); d.wash(SKETCH.ell(x, y - 20, 9, 8, 12), '#6f8f6a', { alpha: 0.6, off: 0.4 }); }
  }
};
// layer 2: the near meadow. A green ridge with hedges, trees and a fence; fields below in glazed stripes running on
// down (the camera sinks into them at the end); wildflowers; on chunk 1 the cottage, their front door
IRON_ART.meadowDraw[2] = (d, c) => {
  const P = IRON_P, H = IRON_ART.MEADOW_H[2], ridge = ironMeadowLine(452, 26, 0.7 + c * 1.9, 8);
  const yAt = x => { const i = Math.max(0, Math.min(ridge.length - 1, Math.round((x + 20) / 8))); return ridge[i][1]; };
  const body = ridge.concat([[980, H], [-20, H]]);
  d.wash(body, P.green, { alpha: 0.62, off: 0, spread: 1.3, layers: 2, edge: false, curve: true });
  d.wash(body, '#c8d27a', { alpha: 0.26, off: 0, spread: 2, edge: false, curve: true });
  // the dawn light along the crest: a gold glaze just under the ridge
  d.wash(ridge.concat(ridge.map(([x, y]) => [x, y + 26]).reverse()), P.core, { alpha: 0.22, off: 0, spread: 1.4, edge: false, curve: true });
  d.stroke(ridge, { w: 1.5, curve: true, alpha: 0.6 });
  // fields: gently curving bands, alternately sunlit and in shade, divided by hedgerows; hatching in the shaded ones
  for (let j = 0; j < 5; j++) {
    const y = 520 + j * 60, a = ironMeadowLine(y, 16, j * 1.3 + c * 0.7, 16), b = ironMeadowLine(y + 60, 16, (j + 1) * 1.3 + c * 0.7, 16);
    const band = a.concat(b.slice().reverse());
    if (j % 2) { d.wash(band, P.greenDark, { alpha: 0.2, off: 0, spread: 1.4, edge: false, curve: true }); d.hatch(band, { a: 75, gap: 5, w: 0.5, alpha: 0.18, force: true }); }
    else d.wash(band, '#d8d98a', { alpha: 0.22, off: 0, spread: 1.4, edge: false, curve: true });
    d.stroke(a, { w: 1, curve: true, alpha: 0.4, sh: 0 });
    // a hedgerow on every other line: a few runs of bushes with gaps (gates, gaps, a lone tree)
    if (j % 2 === 0) for (let run = 0; run < 3; run++) {
      const r0 = 40 + run * 300 + d.r() * 120, len = 60 + d.r() * 140;
      for (let x = r0; x < Math.min(940, r0 + len); x += 9 + d.r() * 7) {
        const yy = a[Math.max(0, Math.min(a.length - 1, Math.round((x + 20) / 16)))][1], rr = 5 + d.r() * 5;
        d.wash(SKETCH.ell(x, yy - rr * 0.5, rr, rr * 0.7, 10), P.greenDark, { alpha: 0.5, off: 0.6, edge: false });
      }
      const xa = r0, xb = Math.min(940, r0 + len), pts = [];
      for (let x = xa; x <= xb; x += 6) { const yy = a[Math.max(0, Math.min(a.length - 1, Math.round((x + 20) / 16)))][1]; pts.push([x, yy - 6 - Math.abs(Math.sin(x * 0.4)) * 4]); }
      if (pts.length > 2) d.stroke(pts, { w: 0.8, alpha: 0.45, sh: 0, curve: true });
    }
  }
  // grass tufts and flowers along the ridge
  for (let x = 10; x < 960; x += 18 + d.r() * 14) { const y = yAt(x) + 6 + d.r() * 40; d.stroke([[x - 3, y], [x - 1, y - 7]], { w: 0.8, sh: 0, alpha: 0.55 }); d.stroke([[x + 2, y], [x + 3, y - 6]], { w: 0.8, sh: 0, alpha: 0.55 }); if (d.r() < 0.45) d.ellipse(x, y - 8, 2, 2, { fill: d.r() < 0.5 ? '#f6ecd4' : P.core, w: 0.6 }); }
  // trees: a trunk, a crown of glazes (dark below, lit gold on the sun side), a scalloped ink edge on the shade side
  const trees = c === 0 ? [[120, 1], [300, 0.8], [860, 1.1]] : [[80, 1], [760, 0.9]];
  for (const [x, s] of trees) {
    const y = yAt(x) + 2;
    d.stroke([[x, y], [x - 1, y - 20 * s], [x + 1, y - 40 * s]], { w: 3.2 * s, curve: true });
    d.stroke([[x, y - 26 * s], [x + 12 * s, y - 38 * s]], { w: 1.4 });
    d.wash(SKETCH.ell(x, y - 58 * s, 32 * s, 27 * s, 18), P.greenDark, { alpha: 0.85, off: 1 });
    d.wash(SKETCH.ell(x + 8 * s, y - 64 * s, 20 * s, 14 * s, 14), '#a3b85a', { alpha: 0.6, off: 0, edge: false });
    d.wash(SKETCH.ell(x + 14 * s, y - 70 * s, 9 * s, 6 * s, 10), P.core, { alpha: 0.35, off: 0, edge: false });
    d.cloud(x, y - 58 * s, 31 * s, { puffs: 8, w: 1.1, curls: 1, fill: null });
    d.hatch(SKETCH.ell(x - 10 * s, y - 50 * s, 18 * s, 14 * s, 12), { a: 60, gap: 3, w: 0.5, alpha: 0.35, force: true });
    d.wash(SKETCH.ell(x + 10, y + 1, 34 * s, 4, 12), P.greenDark, { alpha: 0.35, off: 0, edge: false });
  }
  // a fence along the ridge
  const fx = c === 0 ? [420, 690] : [180, 420];
  for (let x = fx[0]; x <= fx[1]; x += 30) { const y = yAt(x); d.stroke([[x, y + 4], [x + 1, y - 22]], { w: 1.6 }); }
  for (const dy of [-16, -8]) { const pts = []; for (let x = fx[0]; x <= fx[1]; x += 30) pts.push([x, yAt(x) + dy]); d.stroke(pts, { w: 1.1, curve: true }); }
  if (c === 1) {
    // the cottage: their front door, a lit window, smoke from the chimney, a path down the hill
    const hx = 560, hy = yAt(560) + 8;
    d.wash([[hx - 10, hy], [hx + 10, hy], [hx + 60, H], [hx - 30, H]], '#e8d8a8', { alpha: 0.5, off: 0.6, spread: 1.4 });
    d.stroke([[hx - 10, hy], [hx - 6, hy + 80], [hx - 24, hy + 200], [hx - 30, H]], { w: 1, curve: true, alpha: 0.4 });
    const wall = [[hx - 60, hy], [hx + 60, hy], [hx + 60, hy - 62], [hx - 60, hy - 62]];
    d.wash(wall, '#f2e6cc', { alpha: 0.95, off: 0.6 });
    d.hatch([[hx + 20, hy], [hx + 60, hy], [hx + 60, hy - 62], [hx + 20, hy - 62]], { a: 70, gap: 3, w: 0.5, alpha: 0.3, force: true });
    d.outline(wall, { w: 1.8, corner: 30 });
    const roof = [[hx - 76, hy - 58], [hx - 4, hy - 114], [hx + 76, hy - 58]];
    d.wash(roof, P.rust, { alpha: 0.85, off: 0.8 }); d.outline(roof, { w: 2, corner: 30 });
    for (let k = 1; k < 4; k++) d.stroke([[hx - 76 + k * 16, hy - 58 - k * 12.5], [hx + 76 - k * 16, hy - 58 - k * 12.5]], { w: 0.8, alpha: 0.5, sh: 0 });
    d.hatch(roof, { a: 30, gap: 3, w: 0.6, alpha: 0.35, force: true });
    const door = [[hx - 12, hy], [hx + 12, hy], [hx + 12, hy - 34], [hx - 12, hy - 34]];
    d.wash(door, '#c0402a', { alpha: 0.95, off: 0.4 }); d.outline(door, { w: 1.6, corner: 30 }); d.ellipse(hx + 7, hy - 16, 1.6, 1.6, { fill: P.core, w: 0.6 });
    d.stroke([[hx - 16, hy + 1], [hx + 16, hy + 1]], { w: 2.2 });
    for (const sx of [-38, 38]) { const win = SKETCH.box(hx + sx - 10, hy - 48, 20, 18); d.wash(win, P.coreHot, { alpha: 0.85, off: 0 }); d.outline(win, { w: 1.3, corner: 30 }); d.line(hx + sx, hy - 48, hx + sx, hy - 30, { w: 0.8, ov: 0 }); d.line(hx + sx - 10, hy - 39, hx + sx + 10, hy - 39, { w: 0.8, ov: 0 }); }
    d.shape([[hx + 34, hy - 78], [hx + 34, hy - 104], [hx + 50, hy - 104], [hx + 50, hy - 70]], { fill: P.rustDark, w: 1.5, corner: 30 });
    for (let i = 0; i < 4; i++) d.cloud(hx + 46 + i * 9, hy - 116 - i * 15, 5 + i * 2.4, { puffs: 5, w: 0.7, curls: 0, fill: '#f6ecd4', fillAlpha: 0.6 });
    // flowers by the door
    for (let i = 0; i < 7; i++) { const x = hx - 56 + i * 8 + (i > 3 ? 60 : 0); d.ellipse(x, hy - 3, 2.2, 2.2, { fill: i % 2 ? P.core : '#e98a8a', w: 0.6 }); }
  }
};

// the Colossus in pencil: big, light, construction-line drawing behind the course (it is being rubbed out)
IRON_ART.fallBody = (k = 0) => {
  const key = 'iron:fall:body:' + k;
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 1100, 1700, d => {
    const X = x => x - (1000 * k - 200), Y = y => y + 300, P = IRON_P;
    const pen = (pts, o = {}) => d.stroke(pts.map(([x, y]) => [X(x), Y(y)]), Object.assign({ w: 1.6, col: '#5a5450', alpha: 0.75, curve: true, p: [0.3, 1, 0.3] }, o));
    const shade = (pts, a = 0.18) => d.hatch(pts.map(([x, y]) => [X(x), Y(y)]), { a: 55, gap: 4.2, w: 0.6, alpha: a, force: true });
    // bare page where the colour has gone: a paper wash with a faint grey glaze, hatching, a loose pencil outline
    // drawn twice (the construction line under the firm one) and a row of rivets along the top edge
    const fill = (pts, a = 0.62) => { const q = pts.map(([x, y]) => [X(x), Y(y)]); d.solid(q, { kind: 'dawn' }); d.wash(q, '#d9d2c4', { alpha: 0.35, off: 0, spread: 1.2, edge: false }); d.wash(q, '#bdb5a6', { alpha: 0.12, off: 2, spread: 1.6, edge: true }); };
    const plate = pts => {
      fill(pts, 0.8); shade(pts);
      const q = pts.map(([x, y]) => [X(x), Y(y)]);
      const xs = q.map(p2 => p2[0]), ys = q.map(p2 => p2[1]), bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys);
      // inside the plate: panel seams with rivets beside them, a second, cooler shading low down, the construction
      // lines the artist left in (the two diagonals, a centre line, a circle where a hatch or a joint will go)
      d.within(q, () => {
        const sx = 120 + d.r() * 40, sy = 110 + d.r() * 30, lean = (d.r() - 0.5) * 0.2;
        for (let x = bx0 + sx * (0.4 + d.r() * 0.4); x < bx1; x += sx) {
          d.stroke([[x, by0 - 4], [x + (by1 - by0) * lean, by1 + 4]], { w: 1.1, col: '#5a5450', alpha: 0.5, p: [0.5, 1, 0.5] });
          d.rivets(x + 7, by0 + 10, x + 7 + (by1 - by0) * lean, by1 - 10, Math.max(2, Math.round((by1 - by0) / 34)), { r: 1.3, rust: 0 });
        }
        for (let y = by0 + sy * (0.5 + d.r() * 0.4); y < by1; y += sy) {
          d.stroke([[bx0 - 4, y], [bx1 + 4, y + (bx1 - bx0) * 0.02]], { w: 1, col: '#5a5450', alpha: 0.45, p: [0.5, 1, 0.5] });
          d.rivets(bx0 + 10, y + 7, bx1 - 10, y + 7 + (bx1 - bx0) * 0.02, Math.max(2, Math.round((bx1 - bx0) / 34)), { r: 1.3, rust: 0 });
        }
        d.hatch([[bx0, (by0 + by1) / 2], [bx1, (by0 + by1) / 2], [bx1, by1], [bx0, by1]], { a: -35, gap: 5, w: 0.55, alpha: 0.16, force: true });
        d.pencil([[bx0, by0], [bx1, by1]], { alpha: 0.2 }); d.pencil([[bx0, by1], [bx1, by0]], { alpha: 0.2 });
        d.pencil([[(bx0 + bx1) / 2, by0], [(bx0 + bx1) / 2, by1]], { alpha: 0.22 });
        const cr = Math.min(bx1 - bx0, by1 - by0) * (0.16 + d.r() * 0.08), ccx = bx0 + (bx1 - bx0) * (0.3 + d.r() * 0.4), ccy = by0 + (by1 - by0) * (0.35 + d.r() * 0.3);
        d.pcircle(ccx, ccy, cr * 1.15, { alpha: 0.3 });
        d.stroke(SKETCH.ell(ccx, ccy, cr, cr * 0.95, 28), { w: 1.3, col: '#5a5450', alpha: 0.6, curve: true });
        d.stroke(SKETCH.ell(ccx, ccy, cr * 0.4, cr * 0.38, 16), { w: 1, col: '#5a5450', alpha: 0.5, curve: true });
        for (let i = 0; i < 10; i++) { const an = i / 10 * Math.PI * 2; d.rivet(ccx + Math.cos(an) * cr * 0.72, ccy + Math.sin(an) * cr * 0.7, 1.4); }
      }, ['ink', 'hatch', 'pencil', 'wash', 'white']);
      d.pencil(pts.map(([x, y]) => [X(x) + 3, Y(y) - 2]), { closed: true, alpha: 0.35 });
      pen(pts.concat([pts[0]]), { curve: false, w: 2 });
      const [a, b] = pts; const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 60));
      d.rivets(X(a[0]) + 14, Y(a[1]) + 12, X(b[0]) - 14, Y(b[1]) + 12, n, { r: 1.6, rust: 0 });
    };
    // the head (under the start), the neck going down to the shoulder
    plate([[-200, 0], [420, 0], [460, 140], [400, 330], [200, 420], [-60, 400], [-200, 300]]);
    pen([[0, 140], [380, 140]], { alpha: 0.4 }); pen([[40, 260], [320, 260]], { alpha: 0.4 });
    d.stroke(SKETCH.ell(X(190), Y(200), 64, 58, 30), { w: 2, col: '#5a5450', alpha: 0.7, curve: true });
    for (let x = 90; x < 300; x += 18) pen([[x, 320], [x + 2, 380]], { alpha: 0.5 });
    plate([[420, 60], [870, 140], [960, 300], [600, 380], [420, 300]]);
    // the shoulder dome, the chest below, the upper arm out to the elbow
    plate([[900, 180], [1200, 180], [1300, 300], [1250, 520], [900, 560], [820, 400]]);
    plate([[700, 500], [1300, 500], [1360, 1000], [1000, 1250], [640, 1100]]);
    for (let y = 600; y < 1100; y += 80) pen([[720, y], [1320, y + 10]], { alpha: 0.35 });
    plate([[1200, 200], [1640, 190], [1660, 300], [1260, 330]]);
    // the forearm under the slide, the hand (open fingers) at its end
    plate([[1640, 200], [2440, 640], [2420, 720], [1620, 290]]);
    plate([[2440, 640], [2700, 640], [2760, 760], [2500, 800], [2400, 720]]);
    for (let i = 0; i < 4; i++) pen([[2470 + i * 60, 760], [2480 + i * 64, 900], [2500 + i * 66, 960]], { w: 2.4, alpha: 0.6 });
    // the hip, the thigh, the knee joint, the shin down to the foot in the meadow
    plate([[2900, 640], [3220, 640], [3300, 900], [2980, 1000]]);
    plate([[3220, 560], [4240, 500], [4300, 720], [3300, 900]]);
    for (let x = 3300; x < 4200; x += 100) pen([[x, 560 - (x - 3300) * 0.06], [x + 30, 860 - (x - 3300) * 0.15]], { alpha: 0.35 });
    d.stroke(SKETCH.ell(X(4420), Y(640), 120, 110, 30), { w: 2.4, col: '#5a5450', alpha: 0.7, curve: true });
    plate([[4320, 700], [4560, 690], [4720, 1240], [4480, 1260]]);
    plate([[4440, 1220], [4880, 1200], [4900, 1300], [4420, 1300]]);
    for (let i = 0; i < 6; i++) d.rivet(X(4300 + i * 50), Y(520 - i * 3), 1.4);
  }, { flat: true, seed: 9600 + k, res: 0.75, versions: 1, ox: 0, oy: 0 });
  return key;
};
IRON_ART.fallPlate = (w, wall) => {
  const key = 'iron:fall:plate:' + Math.round(w) + ':' + (wall ? 1 : 0);
  if (SKETCH.has(key)) return key;
  const h = wall ? 240 : 46;
  SKETCH.sheet(key, w + 20, h + 44, d => {
    // a plate of the Colossus with its colour gone: bare page, a pencil drawing with the artist's construction lines
    // left in (guide lines that overshoot, panel diagonals, a centre mark), soft graphite shading, a firm walking edge
    const x0 = 10, x1 = w + 10, top = 10, bot = wall ? 10 + 230 : 10 + 30, lip = 8, PEN = '#4c4743', seed = Math.round(w);
    const pts = [[x0, top], [x1, top], [x1 - 4, bot], [x0 + 4, bot]];
    // brackets under a ledge (behind it): pencil triangles back to the body
    if (!wall) for (let x = x0 + 26; x < x1 - 30; x += 96) {
      const q = [[x, bot - 2], [x + 30, bot - 2], [x + 2, bot + 22]];
      d.solid(q); d.wash(q, '#c9c1b2', { alpha: 0.5, off: 0.4 });
      d.hatch(q, { a: 70, gap: 2.4, w: 0.5, alpha: 0.5, force: true, col: PEN });
      d.stroke(q.concat([q[0]]), { w: 1.1, col: PEN, alpha: 0.85 });
    }
    d.solid(pts);
    d.wash(pts, '#d6cfc1', { alpha: 0.55, off: 0.6, spread: 1.2 });
    // the ghost of the rust that was here: one pale bloom, nearly rubbed away
    d.washIn(pts, () => {
      d.wash(SKETCH.ell(x0 + w * (0.25 + d.r() * 0.5), (top + bot) / 2 + 6, Math.min(60, w * 0.3), wall ? 46 : 12, 14, d.r()), '#c9a08c', { alpha: 0.16, off: 0, spread: 2.4, edge: false });
      d.wash([[x0, top + lip], [x1, top + lip], [x1, top + lip + 11], [x0, top + lip + 11]], '#77726c', { alpha: 0.3, off: 0, spread: 2, edge: false });
    });
    // panels: seams, graphite shading that changes angle panel to panel, a construction diagonal, rivets by each seam
    const n = Math.max(1, Math.round(w / 74)), pw = (w - 8) / n;
    for (let i = 0; i < n; i++) {
      const a = x0 + 4 + i * pw, b = a + pw, box = [[a + 2, top + lip + 1], [b - 2, top + lip + 1], [b - 2, bot - 2], [a + 2, bot - 2]];
      d.hatch(box, { a: i % 2 ? 64 : 50, gap: 2.9, w: 0.55, alpha: 0.46, force: true, col: PEN, tone: (x, y) => 0.2 + (y - top) / (bot - top) * 0.55 + (x - a) / pw * 0.25 });
      if (wall) d.hatch([[a + 2, bot - 70], [b - 2, bot - 70], [b - 2, bot - 2], [a + 2, bot - 2]], { a: i % 2 ? -30 : -42, gap: 3.4, w: 0.5, alpha: 0.3, force: true, col: PEN });
      d.pencil([[a + 3, bot - 3], [b - 3, top + lip + 3]], { alpha: 0.2 });
      if (i) {
        d.stroke([[a, top + lip], [a + (d.r() - 0.5) * 2.4, bot]], { w: 1.2, col: PEN, alpha: 0.8, p: [0.5, 1, 0.3] });
        const m = wall ? 8 : 2; d.rivets(a - 5, top + lip + 8, a - 5, bot - 7, m, { r: 1.3, rust: 0 }); d.rivets(a + 5, top + lip + 8, a + 5, bot - 7, m, { r: 1.3, rust: 0 });
      }
    }
    if (wall) {
      // a tall plate: cross seams with rivet rows, a round inspection cover sketched with its centre lines, a number
      for (let y = top + 62; y < bot - 20; y += 58) { d.stroke([[x0 + 3, y], [x1 - 3, y + (d.r() - 0.5) * 3]], { w: 1.1, col: PEN, alpha: 0.7, p: [0.4, 1, 0.4] }); d.rivets(x0 + 12, y + 6, x1 - 12, y + 6, Math.max(2, Math.round(w / 30)), { r: 1.2, rust: 0 }); }
      const cx = x0 + w * 0.5, cy = top + 120, r = Math.min(34, w * 0.2);
      if (r > 14) {
        d.pcircle(cx, cy, r + 6, { alpha: 0.3 }); d.pencil([[cx - r - 14, cy], [cx + r + 14, cy]], { alpha: 0.3 }); d.pencil([[cx, cy - r - 14], [cx, cy + r + 14]], { alpha: 0.3 });
        d.stroke(SKETCH.ell(cx, cy, r, r * 0.96, 26), { w: 1.4, col: PEN, alpha: 0.85, curve: true });
        d.stroke(SKETCH.ell(cx, cy, r * 0.45, r * 0.43, 16), { w: 1, col: PEN, alpha: 0.7, curve: true });
        for (let k = 0; k < 8; k++) { const an = k / 8 * Math.PI * 2 + 0.3; d.rivet(cx + Math.cos(an) * r * 0.74, cy + Math.sin(an) * r * 0.72, 1.3); }
        d.hatch(SKETCH.ell(cx, cy, r, r * 0.96, 20), { a: 40, gap: 2.4, w: 0.5, alpha: 0.4, force: true, col: PEN, tone: (x, y) => ((x - cx) + (y - cy)) / r * 0.5 + 0.3 });
      }
      d.word(['L-2', '07', 'K-4', 'R-9'][seed % 4], x0 + 26, top + 44, 13, { w: 1.5, col: PEN, alpha: 0.45, align: 'center' });
    }
    // the artist's guide lines, left in: they run past the corners
    d.pencil([[x0 - 9, top - 2.5], [x1 + 9, top - 3.5]], { alpha: 0.45 });
    d.pencil([[x0 - 7, bot + 2.5], [x1 + 7, bot + 3]], { alpha: 0.35 });
    d.pencil([[x0 - 1.5, top - 8], [x0 + 3, bot + 9]], { alpha: 0.35 }); d.pencil([[x1 + 1.5, top - 8], [x1 - 3, bot + 9]], { alpha: 0.35 });
    // the walking edge: a lip plate left as clean paper, a firm top line (heavier toward the shadow end), ticks
    const lp = [[x0 - 2, top], [x1 + 2, top], [x1, top + lip], [x0, top + lip]];
    d.solid(lp); d.wash(lp, '#efe7d6', { alpha: 0.8, off: 0.3, layers: 1 });
    for (let x = x0 + 5; x < x1 - 3; x += 7) d.stroke([[x, top + 1.5], [x + 1.6, top + lip - 1.5]], { w: 0.5, col: PEN, alpha: 0.55, sh: 0 });
    d.stroke([[x0 - 2, top + lip], [x1 + 2, top + lip]], { w: 1.4, col: PEN, alpha: 0.9 });
    d.stroke([[x0 - 3, top], [x1 + 3, top]], { w: 2.8, col: F_INK(), p: [0.7, 1, 0.9] });
    d.stroke([[x1, top], [x1 - 4, bot], [x0 + 4, bot], [x0, top]], { w: 1.7, col: PEN, alpha: 0.9 });
    d.rivets(x0 + 9, top + lip + 5, x1 - 9, top + lip + 5, Math.max(2, Math.round(w / 30)), { r: 1.4, rust: 0 });
  }, { ox: 10, oy: 10, seed: 9700 + Math.round(w) + (wall ? 1 : 0) });
  return key;
};
IRON_ART.fallPump = () => {
  const key = 'iron:fall:pump';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 70, 50, d => {
    const cx = 35, fy = 44;
    d.shape([[cx - 22, fy], [cx + 22, fy], [cx + 18, fy - 12], [cx - 18, fy - 12]], { fill: '#c9724c', w: 1.8, col: F_INK(), corner: 30 });
    d.shape([[cx - 14, fy - 12], [cx + 14, fy - 12], [cx + 10, fy - 18], [cx - 10, fy - 18]], { fill: '#e8d8b8', w: 1.4, col: F_INK(), corner: 30 });
    d.word('PUMP', cx, fy - 3, 8, { align: 'center', col: '#fff', w: 1.2 });
  }, { ox: 35, oy: 44, seed: 9710 });
  return key;
};
IRON_ART.fallSpring = () => {
  const key = 'iron:fall:spring';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 90, 60, d => {
    const cx = 45, fy = 54;
    const coil = []; for (let i = 0; i <= 12; i++) coil.push([cx + (i % 2 ? 16 : -16), fy - 2 - i * 3]);
    d.stroke(coil, { w: 2, col: F_INK() });
    d.shape([[cx - 32, fy - 44], [cx + 32, fy - 44], [cx + 30, fy - 38], [cx - 30, fy - 38]], { fill: IRON_P.core, w: 1.8, col: F_INK(), corner: 30 });
    d.word('SPRING', cx, fy - 48, 8, { align: 'center', col: F_INK(), w: 1.2 });
  }, { ox: 45, oy: 54, seed: 9720 });
  return key;
};
IRON_ART.fallPost = () => {
  const key = 'iron:fall:post';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 50, 90, d => {
    const cx = 25, fy = 84;
    d.shape([[cx - 5, fy], [cx + 5, fy], [cx + 4, fy - 60], [cx - 4, fy - 60]], { fill: '#9a735e', w: 1.6, col: F_INK(), corner: 30 });
    d.ellipse(cx, fy - 64, 8, 8, { fill: IRON_P.core, w: 1.6, col: F_INK() });
    IRON_ART.helpers.ironChain(d, [[cx + 4, fy - 60], [cx + 14, fy - 40], [cx + 10, fy - 6]], { link: 9 });
  }, { ox: 25, oy: 84, seed: 9730 });
  return key;
};
// the great hand, thumped down upright in the grass with its wrist buried: the open iron palm held up a step from
// their door (it reached for the cottage and stopped). Front view: a palm plate, four fingers of three plates each
// fanning up, the thumb out to the left, knuckle bands and rivets; dirt thrown up round the wrist.
IRON_ART.FALL_HANDS = { w: 320, h: 320, ox: 160, oy: 304 };
IRON_ART.fallHands = () => {
  const key = 'iron:fall:hands', K = IRON_ART.FALL_HANDS;
  if (SKETCH.has(key) && !IRON_ART.redraw) return key;
  SKETCH.sheet(key, K.w, K.h, d => {
    const P = IRON_P, H = IRON_ART.helpers, g = K.oy;
    const plate = (pts, o = {}) => { d.solid(pts); H.ironPlate(d, pts, Object.assign({ fill: P.ironLight, rustPatches: 0, w: 2.1, inset: 5 }, o)); };
    // one plate along a direction (ang 0 = straight up): from (x, y), len long, w0 wide at the base, w1 at the end
    const seg = (x, y, ang, len, w0, w1, round) => {
      const ux = Math.sin(ang), uy = -Math.cos(ang), nx = -uy, ny = ux, ex = x + ux * len, ey = y + uy * len;
      const pts = [[x - nx * w0 / 2, y - ny * w0 / 2], [x + nx * w0 / 2, y + ny * w0 / 2]];
      if (round) for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI; pts.push([ex + nx * Math.cos(a) * w1 / 2 + ux * Math.sin(a) * w1 * 0.45, ey + ny * Math.cos(a) * w1 / 2 + uy * Math.sin(a) * w1 * 0.45]); }
      else pts.push([ex + nx * w1 / 2, ey + ny * w1 / 2], [ex - nx * w1 / 2, ey - ny * w1 / 2]);
      return { pts, ex, ey };
    };
    const cx = 160, top = g - 150;
    d.wash(SKETCH.ell(cx, g + 2, 110, 9, 24), P.greenDark, { alpha: 0.45, off: 0, spread: 1.6, edge: false });
    // fingers (behind the palm's top edge): x at the knuckle, angle, length, width
    const fingers = [[cx - 51, -0.2, 96, 28], [cx - 17, -0.06, 114, 30], [cx + 17, 0.07, 108, 30], [cx + 50, 0.22, 84, 26]];
    for (const [fx, ang, L, w] of fingers) {
      let x = fx, y = top + 14;
      const parts = [0.42, 0.32, 0.26];
      parts.forEach((k, i) => {
        const w0 = w - i * 3, w1 = w - (i + 1) * 3, sg = seg(x, y, ang, L * k, w0, w1, i === 2);
        plate(sg.pts, { tone: (px, py) => 0.12 + (px - (x - w / 2)) / w * 0.45, rivetEdges: i === 0 ? [] : [], glint: true });
        // the knuckle band where the plates meet
        if (i < 2) { const kb = seg(sg.ex - Math.sin(ang) * 5, sg.ey + Math.cos(ang) * 5, ang, 10, w1 + 4, w1 + 4, false); plate(kb.pts, { fill: P.iron, tone: () => 0.45, glint: false, rustWash: false }); d.rivet(sg.ex, sg.ey, 1.8); }
        x = sg.ex; y = sg.ey;
      });
    }
    // the thumb, out to the left
    let tx = cx - 64, ty = g - 96;
    [[-1.05, 46, 34, 30, false], [-0.75, 40, 30, 26, true]].forEach(([ang, len, w0, w1, r]) => {
      const sg = seg(tx, ty, ang, len, w0, w1, r);
      plate(sg.pts, { tone: () => 0.3, rustPatches: r ? 0 : 1 }); if (!r) d.rivet(sg.ex, sg.ey, 1.9);
      tx = sg.ex; ty = sg.ey;
    });
    // the palm: a broad plate, a raised rim, a round boss in the middle, rivets round it, rust run down from it
    const palm = [[cx - 64, g - 40], [cx + 64, g - 40], [cx + 70, top + 34], [cx + 64, top + 8], [cx - 64, top + 8], [cx - 72, top + 36]];
    plate(palm, { fill: P.iron, tone: (px, py) => 0.15 + (px - cx + 70) / 140 * 0.5, rivetEdges: [1, 2, 4, 5], spacing: 15, rustPatches: 3, scratch: 4 });
    d.ellipse(cx + 2, g - 92, 22, 20, { fill: P.ironLight, w: 2.2, hatch: { a: 50, gap: 2.8, w: 0.5, alpha: 0.5 } });
    H.ironBolt(d, cx + 2, g - 92, 7);
    for (const [ax, ay, bx, by] of [[cx - 52, top + 20, cx - 20, g - 104], [cx + 52, top + 22, cx + 22, g - 104]]) d.stroke([[ax, ay], [bx, by]], { w: 1.3, alpha: 0.55 });
    // the wrist cuff, sunk in the grass, and the dirt thrown up round it
    plate([[cx - 58, g + 4], [cx - 60, g - 42], [cx + 60, g - 42], [cx + 58, g + 4]], { fill: P.rust, fillAlpha: 0.6, rivetEdges: [1], spacing: 14, tone: () => 0.35 });
    for (let i = 0; i < 14; i++) { const dx = (i - 6.5) * 10 + d.r() * 5; d.shape(SKETCH.ell(cx + dx, g - 2 - d.r() * 8, 6 + d.r() * 5, 3.5 + d.r() * 2.5, 8), { fill: '#8a6a48', w: 0.9 }); }
    for (let i = 0; i < 20; i++) { const gx = cx - 96 + i * 10; d.stroke([[gx, g + 3], [gx + 2 - d.r() * 4, g - 6 - d.r() * 9]], { w: 1, sh: 0, col: P.greenDark }); }
  }, { ox: K.ox, oy: K.oy, seed: 9740, versions: 3 });
  return key;
};
// the great winding key from the Colossus's back, fallen and stuck in the grass at a tilt: two flat wings either side
// of a hub (like a wind-up toy's key, iron with brass edges), a banded shaft
IRON_ART.FALL_KEY = { w: 280, h: 280, ox: 140, oy: 268 };
IRON_ART.fallKey = () => {
  const key = 'iron:fall:key', K = IRON_ART.FALL_KEY;
  if (SKETCH.has(key) && !IRON_ART.redraw) return key;
  SKETCH.sheet(key, K.w, K.h, d => {
    const P = IRON_P, H = IRON_ART.helpers, cx = 140, g = K.oy, hy = g - 176;
    // the shaft, into the ground; two collar bands
    d.solid([[cx - 12, g + 4], [cx - 11, hy + 20], [cx + 11, hy + 20], [cx + 12, g + 4]]);
    H.ironPlate(d, [[cx - 12, g + 4], [cx - 11, hy + 20], [cx + 11, hy + 20], [cx + 12, g + 4]], { fill: P.iron, tone: (x, y) => (x - (cx - 12)) / 24, hatchA: 90, rustPatches: 2, w: 2.2 });
    for (const y of [hy + 24, hy + 56]) H.ironPlate(d, [[cx - 18, y + 12], [cx - 18, y], [cx + 18, y], [cx + 18, y + 12]], { fill: P.ochreDeep, fillAlpha: 0.75, rivetEdges: [1], spacing: 9, r: 1.6, rustWash: false, w: 2 });
    // the wings: flat iron plates widening outward with a rounded end, a brass rim line inset, three rivets
    for (const sgn of [-1, 1]) {
      const wing = [];
      for (let i = 0; i <= 20; i++) { const a = -Math.PI / 2 + i / 20 * Math.PI; wing.push([cx + sgn * (78 + Math.cos(a) * 46), hy + Math.sin(a) * 52]); }
      wing.push([cx + sgn * 22, hy + 20]); wing.push([cx + sgn * 22, hy - 20]);
      const pts = sgn < 0 ? wing : wing.slice().reverse();
      d.solid(pts);
      H.ironPlate(d, pts, { fill: P.ironLight, tone: (x, y) => 0.15 + (y - (hy - 52)) / 104 * 0.6, curve: true, rustPatches: 1, w: 2.6 });
      const rim = []; for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + 0.15 + i / 16 * (Math.PI - 0.3); rim.push([cx + sgn * (78 + Math.cos(a) * 36), hy + Math.sin(a) * 42]); }
      d.stroke(rim, { w: 2.2, col: P.ochre, curve: true, sh: 0 });
      d.stroke(rim, { w: 0.9, curve: true, alpha: 0.6 });
      for (const [rx, ry] of [[92, -26], [110, 0], [92, 26]]) d.rivet(cx + sgn * rx, hy + ry, 2.2);
    }
    // the hub, a brass cap with a bolt
    d.ellipse(cx, hy, 26, 26, { fill: P.ochreDeep, w: 2.6, hatch: { a: 45, gap: 2.6, w: 0.5, alpha: 0.5 } });
    d.wash(SKETCH.ell(cx - 7, hy - 8, 10, 7, 10), P.coreHot, { alpha: 0.6, off: 0, edge: false });
    H.ironBolt(d, cx, hy, 8);
    d.stroke([[cx - 112, hy - 30], [cx - 96, hy - 44]], { w: 2, col: '#fff6d8', layer: 'white', sh: 0, alpha: 0.9 });
    // dirt kicked up at the foot, grass round it
    for (let i = 0; i < 9; i++) { const dx = (i - 4) * 9 + d.r() * 4; d.shape(SKETCH.ell(cx + dx, g - 2 - d.r() * 6, 5 + d.r() * 4, 3 + d.r() * 2, 8), { fill: '#8a6a48', w: 0.9 }); }
    for (let i = 0; i < 12; i++) { const gx = cx - 50 + i * 9; d.stroke([[gx, g + 2], [gx + 2 - d.r() * 4, g - 6 - d.r() * 8]], { w: 1, sh: 0, col: P.greenDark }); }
  }, { ox: K.ox, oy: K.oy, seed: 9750, versions: 3 });
  return key;
};
// their cottage, the front door one step from the Colossus's fingertips: the same cottage as on the hill, close up
IRON_ART.FALL_HOME = { w: 260, h: 250, ox: 130, oy: 240 };
IRON_ART.fallHome = () => {
  const key = 'iron:fall:home', K = IRON_ART.FALL_HOME;
  if (SKETCH.has(key) && !IRON_ART.redraw) return key;
  SKETCH.sheet(key, K.w, K.h, d => {
    const P = IRON_P, g = K.oy, x0 = 30, x1 = 236, top = g - 112;
    d.wash(SKETCH.ell(140, g + 2, 120, 7, 20), P.greenDark, { alpha: 0.4, off: 0, edge: false });
    const wall = [[x0, g], [x1, g], [x1, top], [x0, top]];
    d.wash(wall, '#f2e6cc', { alpha: 0.95, off: 0.8 });
    d.washIn(wall, () => { d.wash([[x1 - 70, g], [x1, g], [x1, top], [x1 - 50, top]], P.ochre, { alpha: 0.28, off: 0, edge: false }); });
    d.hatch([[x1 - 60, g], [x1, g], [x1, top], [x1 - 46, top]], { a: 70, gap: 3, w: 0.55, alpha: 0.35, force: true });
    // stone footing, a few stones drawn in the wall
    d.wash([[x0, g], [x1, g], [x1, g - 14], [x0, g - 14]], '#b9b2a4', { alpha: 0.6, off: 0.6 });
    for (let x = x0 + 6; x < x1 - 10; x += 22 + d.r() * 10) d.ellipse(x + 8, g - 7, 9, 5, { w: 0.8, alpha: 0.6 });
    for (let i = 0; i < 6; i++) { const sx = x0 + 20 + d.r() * 170, sy = top + 20 + d.r() * 60; d.stroke(SKETCH.ell(sx, sy, 7, 4, 10, 0, 0, Math.PI), { w: 0.7, alpha: 0.4, sh: 0 }); }
    d.outline(wall, { w: 2, corner: 30 });
    // the roof: rust tiles in rows, a chimney with smoke
    const roof = [[x0 - 18, top + 4], [133, top - 92], [x1 + 18, top + 4]];
    d.shape([[x1 - 50, top - 46], [x1 - 50, top - 86], [x1 - 26, top - 86], [x1 - 26, top - 26]], { fill: P.rustDark, w: 1.8, corner: 30 });
    d.wash(roof, P.rust, { alpha: 0.88, off: 0.8 });
    d.washIn(roof, () => d.wash([[133, top - 92], [x1 + 18, top + 4], [133, top + 4]], P.rustDark, { alpha: 0.25, off: 0, edge: false }));
    for (let k = 1; k < 5; k++) { const yy = top + 4 - k * 18, hw = (x1 - x0 + 36) / 2 * (1 - k * 18 / 96); const row = []; for (let x = 133 - hw; x <= 133 + hw; x += 12) row.push([x, yy + Math.sin(x * 0.5) * 1.2]); d.stroke(row, { w: 0.8, alpha: 0.55, sh: 0 }); }
    d.outline(roof, { w: 2.4, corner: 30 });
    for (let i = 0; i < 5; i++) d.cloud(x1 - 36 + i * 8, top - 100 - i * 18, 6 + i * 3, { puffs: 5, w: 0.8, curls: 0, fill: '#f6ecd4', fillAlpha: 0.7 });
    // the front door (left, toward the hands): red, a brass knob, a step, a lamp lit beside it
    const dx = 66, door = [[dx - 18, g - 14], [dx + 18, g - 14], [dx + 18, g - 74], [dx - 18, g - 74]];
    d.wash(door, '#c0402a', { alpha: 0.95, off: 0.5 }); d.hatch(door, { a: 90, gap: 6, w: 0.6, alpha: 0.4, force: true }); d.outline(door, { w: 2, corner: 30 });
    d.ellipse(dx + 11, g - 42, 2.4, 2.4, { fill: P.core, w: 0.8 });
    d.shape([[dx - 26, g], [dx + 26, g], [dx + 24, g - 14], [dx - 24, g - 14]], { fill: '#d8cfbd', w: 1.6, corner: 30 });
    d.ellipse(dx + 30, g - 82, 5, 7, { fill: P.coreHot, w: 1.2 }); SKETCH.glow && d.wash(SKETCH.ell(dx + 30, g - 82, 16, 16, 12), P.coreHot, { alpha: 0.25, off: 0, edge: false });
    // windows: warm light, cross bars, a flower box under each
    for (const wx of [134, 196]) {
      const win = SKETCH.box(wx - 18, top + 26, 36, 32);
      d.wash(win, P.coreHot, { alpha: 0.9, off: 0 }); d.outline(win, { w: 1.6, corner: 30 });
      d.line(wx, top + 26, wx, top + 58, { w: 1, ov: 0 }); d.line(wx - 18, top + 42, wx + 18, top + 42, { w: 1, ov: 0 });
      d.shape(SKETCH.box(wx - 22, top + 58, 44, 9), { fill: P.rustLight, w: 1.2, corner: 30 });
      for (let i = 0; i < 6; i++) d.ellipse(wx - 18 + i * 7, top + 56, 2.6, 2.6, { fill: i % 2 ? '#e98a8a' : P.core, w: 0.6 });
    }
    // a little sign by the door
    d.stroke([[dx - 40, g], [dx - 40, g - 30]], { w: 2 });
    d.shape(SKETCH.box(dx - 62, g - 44, 44, 16), { fill: '#e8d8b8', w: 1.4, corner: 30 });
    d.word('HOME', dx - 40, g - 32, 8, { align: 'center', w: 1.2 });
  }, { ox: K.ox, oy: K.oy, seed: 9760, versions: 3 });
  return key;
};
