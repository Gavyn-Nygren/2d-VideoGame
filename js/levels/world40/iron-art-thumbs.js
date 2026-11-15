/* Pip & Bo - World 40 Colossus March: Thumb War (Part 8). The two great hands clasped in Sunny Meadow. */
'use strict';

/* The best drawing in the level: one close screen of the Colossus's two hands clasped in the grass at sunrise, the
   forearms running in from the bottom corners with a little cab in each wrist, the thumbs standing up from the grip.
     IRON_ART.thumbClasp()    'iron:thumb:clasp'   the forearms, the cabs and the clasped hands (960 x 540, the screen)
     IRON_ART.thumb(id)       'iron:thumb:<id>'    one thumb, upright (anchor: its pivot, low in the grip); Pip's has an
                                                   orange stripe on the knuckle band, Bo's blue; the nail faces the other
     IRON_ART.thumbCabLip(id) the front lip of a wrist cab, drawn over the hero's lap (anchor: its middle)
     IRON_ART.thumbDaisy()    Tick's daisy (anchor: the stem's foot)
     IRON_ART.thumbLift(id)   the winner's hand palm-up, side on, for the ending (anchor: the middle of the palm's top) */

const THUMB_LIGHT = (x0, x1) => (x, y) => 0.12 + (x - x0) / (x1 - x0) * 0.55;
// a band round a cylinder (from axis point a to b, radius ra..rb) as a plate: its outline and its plan
function ironThumbBand(a, b, ra, rb) {
  const ux = b[0] - a[0], uy = b[1] - a[1], L = Math.hypot(ux, uy), nx = -uy / L, ny = ux / L;
  return [[a[0] + nx * ra, a[1] + ny * ra], [b[0] + nx * rb, b[1] + ny * rb], [b[0] - nx * rb, b[1] - ny * rb], [a[0] - nx * ra, a[1] - ny * ra]];
}
IRON_ART.thumbClasp = () => {
  const key = 'iron:thumb:clasp';
  if (SKETCH.has(key) && !IRON_ART.redraw) return key;
  SKETCH.sheet(key, 960, 540, d => {
    const P = IRON_P, H = IRON_ART.helpers;
    const plate = (pts, o = {}) => { d.solid(pts); H.ironPlate(d, pts, Object.assign({ fill: P.iron, fillAlpha: 0.72, w: 2.3 }, o)); };
    // the grass the hands lie in: a shadow under them
    d.wash(SKETCH.ell(480, 522, 470, 26, 40), P.greenDark, { alpha: 0.5, off: 0, spread: 1.6, edge: false });
    // the forearms: banded iron cylinders from the bottom corners up to the wrists (mirrored), lit from the top left
    for (const s of [-1, 1]) {
      const mx = x => 480 + s * (x - 480);
      const A = [mx(-60), 600], B = [mx(318), 404];
      const at = k => [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k], r = k => 92 - k * 26;
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]), ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L, nx = -uy, ny = ux;
      const along = (k, v) => { const c = at(k), rr = r(k); return [c[0] + nx * rr * v, c[1] + ny * rr * v]; };   // v -1 top .. 1 bottom (s=1)
      const vt = -s, vb = s;   // which side of the axis is the top, for each arm
      const arm = ironThumbBand(A, B, r(0), r(1));
      plate(arm, { fill: P.iron, tone: (x, y) => { const k = ((x - A[0]) * ux + (y - A[1]) * uy) / L, c = at(k), v = ((x - c[0]) * nx + (y - c[1]) * ny) / r(k) * vb; return 0.08 + Math.max(0, v + 0.3) * 0.55; }, rustPatches: 4, scratch: 4 });
      // the round of the cylinder: a lit stripe along the top third, a deeper glaze along the underside
      d.washIn(arm, () => {
        d.wash([along(0, vt * 0.75), along(1, vt * 0.75), along(1, vt * 0.25), along(0, vt * 0.25)], '#fbf3df', { alpha: 0.28, off: 0, edge: false });
        d.wash([along(0, vb * 0.45), along(1, vb * 0.45), along(1, vb * 1.1), along(0, vb * 1.1)], P.shadowInk, { alpha: 0.22, off: 0, edge: false });
      });
      d.stroke([along(0.03, vt * 0.55), along(0.97, vt * 0.55)], { w: 1.5, col: '#fbf3df', alpha: 0.7, sh: 0, layer: 'white', brk: 1.6 });
      // the seams round it: curved bands (the cylinder's cross-section) with a row of rivets
      for (const k of [0.18, 0.38, 0.58, 0.78, 0.94]) {
        const arc = [], arc2 = [], rr = r(k);
        for (let i = 0; i <= 14; i++) {
          const th = -Math.PI / 2 + i / 14 * Math.PI, c = at(k), bul = Math.cos(th) * rr * 0.3;
          arc.push([c[0] + nx * rr * Math.sin(th) + ux * bul, c[1] + ny * rr * Math.sin(th) + uy * bul]);
          arc2.push([c[0] + nx * rr * Math.sin(th) + ux * (bul + 10), c[1] + ny * rr * Math.sin(th) + uy * (bul + 10)]);
        }
        d.washIn(arm, () => d.wash(arc.concat(arc2.slice().reverse()), P.ironLight, { alpha: 0.55, off: 0, edge: false }));
        d.stroke(arc, { w: 2.2, curve: true }); d.stroke(arc2, { w: 1.2, curve: true, alpha: 0.7 });
        for (let i = 2; i <= 12; i += 2) d.rivet((arc[i][0] + arc2[i][0]) / 2, (arc[i][1] + arc2[i][1]) / 2, 1.8);
      }
      // a fat cable and a pipe along the top of the arm
      H.ironPipe(d, [[mx(30), 470], [mx(150), 412], [mx(270), 372]], 6, { col: P.verd });
      // the wrist cab: a hatch opened in the top of the arm, a seat, a little dash with two levers (the hero sits in it)
      const cx = mx(150), cy = 438;
      d.wash(SKETCH.ell(cx, cy - 4, 40, 15, 20), P.shadowInk, { alpha: 0.85, off: 0 });
      d.ellipse(cx, cy - 4, 41, 16, { w: 2.2 });
      plate([[cx - s * 38, cy - 6], [cx - s * 40, cy - 44], [cx - s * 28, cy - 50], [cx - s * 26, cy - 6]], { fill: P.rustLight, tone: () => 0.3, rustWash: false, glint: false });
      for (const lx of [16, 28]) { d.stroke([[cx + s * lx, cy - 2], [cx + s * (lx + 6), cy - 26]], { w: 2 }); d.ellipse(cx + s * (lx + 6), cy - 28, 3.4, 3.4, { fill: s < 0 ? PCOL[1] : PCOL[0], w: 1 }); }
      // a stencil on the arm
      H.ironStencil(d, s < 0 ? 'R' : 'L', mx(96), 512, 22, { rot: -s * 0.55 });
    }
    // the grip: Bo's hand (right) behind, Pip's hand (left) in front, its four fingers hooked over Bo's knuckles
    const boBack = [[660, 352], [600, 330], [520, 318], [478, 330], [470, 470], [560, 488], [640, 486], [668, 462]];
    plate(boBack, { fill: P.ironLight, tone: THUMB_LIGHT(470, 668), rivetEdges: [1, 2], spacing: 18, rustPatches: 2, scratch: 3 });
    const pipBack = [[300, 352], [360, 330], [440, 318], [482, 330], [492, 470], [400, 490], [320, 486], [292, 462]];
    plate(pipBack, { fill: P.iron, tone: THUMB_LIGHT(292, 492), rivetEdges: [1, 2, 5], spacing: 18, rustPatches: 2, scratch: 4 });
    // the knuckle ridge of each hand: a row of domed caps
    for (const [x0, x1, y0, y1] of [[318, 470, 344, 326], [490, 642, 326, 344]]) for (let k = 0; k < 4; k++) {
      const x = x0 + (x1 - x0) * (k + 0.5) / 4, y = y0 + (y1 - y0) * (k + 0.5) / 4;
      d.ellipse(x, y + 4, 16, 9, { fill: P.ironLight, w: 1.8, hatch: { a: 60, gap: 2.8, w: 0.5, alpha: 0.4 } });
      d.rivet(x, y + 4, 1.8);
    }
    // Pip's four fingers, curled over Bo's hand: stacked hooks, each three plates, tips tucked under
    for (let k = 0; k < 4; k++) {
      const y = 344 + k * 34, x0 = 486, bend = 6 + k * 2;
      const seg1 = [[x0 - 6, y], [x0 + 52, y - 4 + bend * 0.3], [x0 + 56, y + 28], [x0 - 6, y + 30]];
      const seg2 = [[x0 + 56, y - 3], [x0 + 92, y + 4], [x0 + 96, y + 30], [x0 + 58, y + 29]];
      const seg3 = [[x0 + 94, y + 5], [x0 + 112, y + 14], [x0 + 116, y + 26], [x0 + 104, y + 34], [x0 + 96, y + 31]];
      plate(seg1, { fill: P.iron, tone: () => 0.25 + k * 0.08, rivetEdges: [0], spacing: 14, rustPatches: k === 1 ? 1 : 0, w: 2 });
      plate(seg2, { fill: P.ironLight, tone: () => 0.3 + k * 0.08, rustPatches: 0, w: 2 });
      plate(seg3, { fill: P.ironLight, tone: () => 0.5, rustWash: false, w: 1.8, curve: true });
      d.ellipse(x0 + 56, y + 13, 5, 13, { fill: P.ironLight, w: 1.5 }); d.rivet(x0 + 56, y + 13, 1.6);
    }
    // under the grip: a deep shadow where the palms meet the grass
    d.spot([[300, 482], [660, 482], [640, 496], [320, 496]], { alpha: 0.5 });
    // grass blades in front of everything, and clover
    for (let i = 0; i < 90; i++) { const gx = i * 11 + d.r() * 8, gy = 520 + d.r() * 22; d.stroke([[gx, gy + 6], [gx + 2 - d.r() * 5, gy - 8 - d.r() * 10]], { w: 1.1, sh: 0, col: i % 3 ? P.greenDark : P.green }); }
    for (let i = 0; i < 8; i++) { const fx = 30 + i * 120 + d.r() * 60, fy = 528 + d.r() * 8; d.ellipse(fx, fy, 3, 3, { fill: i % 2 ? '#f6ecd4' : P.core, w: 0.7 }); }
  }, { seed: 9800, versions: 3 });
  return key;
};
// one thumb, upright, its pivot low in the grip (it rotates there): a big knuckle plate, a band in the player's colour,
// the end plate with the nail (a brass plate) on the side facing the other thumb
IRON_ART.THUMB = { w: 130, h: 250, ox: 65, oy: 222 };
IRON_ART.thumb = id => {
  const key = 'iron:thumb:' + id, K = IRON_ART.THUMB;
  if (SKETCH.has(key) && !IRON_ART.redraw) return key;
  SKETCH.sheet(key, K.w, K.h, d => {
    const P = IRON_P, H = IRON_ART.helpers, x = K.ox, b = K.oy, f = id ? -1 : 1;
    const plate = (pts, o = {}) => { d.solid(pts); H.ironPlate(d, pts, Object.assign({ fill: P.iron, fillAlpha: 0.72, w: 2.4 }, o)); };
    // the base: a broad plate down into the grip
    plate([[x - 32, b + 26], [x - 31, b - 78], [x + 31, b - 80], [x + 32, b + 26]], { fill: P.iron, tone: THUMB_LIGHT(x - 32, x + 32), rivetEdges: [0, 2], spacing: 16, rustPatches: 2, scratch: 2 });
    // the knuckle band, with the player's stripe
    plate([[x - 35, b - 74], [x - 35, b - 96], [x + 35, b - 96], [x + 35, b - 74]], { fill: P.ironLight, tone: () => 0.3, rivetEdges: [1], spacing: 11, rustWash: false });
    d.wash([[x - 34, b - 80], [x + 34, b - 80], [x + 34, b - 89], [x - 34, b - 89]], PCOL[id], { alpha: 0.9, off: 0.6 });
    d.stroke([[x - 34, b - 80], [x + 34, b - 80]], { w: 1, alpha: 0.6 }); d.stroke([[x - 34, b - 89], [x + 34, b - 89]], { w: 1, alpha: 0.6 });
    // the end: rounded top
    const tip = [[x - 29, b - 96]];
    for (let i = 0; i <= 12; i++) { const a = Math.PI + i / 12 * Math.PI; tip.push([x + Math.cos(a) * 29, b - 128 + Math.sin(a) * 30]); }
    tip.push([x + 29, b - 96]);
    plate(tip, { fill: P.ironLight, tone: THUMB_LIGHT(x - 29, x + 29), rustPatches: 1, curve: false });
    // the nail: a brass plate on the side toward the other thumb, riveted
    const nx = x + f * 6, nail = [[nx - f * 2, b - 104], [nx + f * 24, b - 108], [nx + f * 26, b - 140], [nx + f * 14, b - 152], [nx - f * 4, b - 146]];
    d.solid(nail); H.ironPlate(d, f > 0 ? nail : nail.slice().reverse(), { fill: P.ochre, fillAlpha: 0.75, tone: () => 0.2, rustWash: false, w: 1.9 });
    d.stroke([[nx + f * 4, b - 140], [nx + f * 18, b - 146]], { w: 1.6, col: '#fff6d8', sh: 0, layer: 'white' });
    d.rivet(nx + f * 4, b - 110, 1.8); d.rivet(nx + f * 20, b - 112, 1.8);
    // a stencilled number on the base
    H.ironStencil(d, id ? '2' : '1', x - f * 4, b - 30, 18, {});
  }, { ox: K.ox, oy: K.oy, seed: 9810 + id, versions: 3 });
  return key;
};
IRON_ART.thumbCabLip = id => {
  const key = 'iron:thumb:lip:' + id;
  if (SKETCH.has(key) && !IRON_ART.redraw) return key;
  SKETCH.sheet(key, 110, 40, d => {
    const P = IRON_P, outer = [], inner = [];
    for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI; outer.push([55 + Math.cos(a) * 44, 8 + Math.sin(a) * 18]); inner.push([55 + Math.cos(a) * 38, 8 + Math.sin(a) * 12]); }
    const rim = outer.concat(inner.slice().reverse());
    d.solid(rim);
    d.wash(rim, P.ironLight, { alpha: 0.7, off: 0.4 });
    d.hatch(rim, { a: 70, gap: 2.6, w: 0.5, alpha: 0.4, force: true });
    d.stroke(outer, { w: 2.2, curve: true }); d.stroke(inner, { w: 1.2, curve: true, alpha: 0.8 });
    for (let i = 2; i <= 14; i += 3) d.rivet((outer[i][0] + inner[i][0]) / 2, (outer[i][1] + inner[i][1]) / 2, 1.5);
  }, { ox: 55, oy: 8, seed: 9820 + id, versions: 3 });
  return key;
};
IRON_ART.thumbDaisy = () => {
  const key = 'iron:thumb:daisy';
  if (SKETCH.has(key) && !IRON_ART.redraw) return key;
  SKETCH.sheet(key, 100, 70, d => {
    const P = IRON_P, cx = 50, fy = 36;
    d.stroke([[cx, 70], [cx - 2, 56], [cx, fy + 4]], { w: 2.4, col: P.greenDark, curve: true });
    d.wash([[cx - 2, 58], [cx - 16, 50], [cx - 20, 56], [cx - 4, 62]], P.green, { alpha: 0.9, off: 0.4 });
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, px = cx + Math.cos(a) * 22, py = fy + Math.sin(a) * 7; d.ellipse(px, py, 9, 3.6, { rot: a, fill: '#fbf6ea', w: 1 }); }
    d.ellipse(cx, fy, 9, 4.5, { fill: P.core, w: 1.4, hatch: { a: 30, gap: 2, w: 0.4, alpha: 0.5 } });
  }, { ox: 50, oy: 36, seed: 9830, versions: 3 });
  return key;
};
// the winner's hand, palm up, side on: a broad palm, the fingers curling up at one end, the thumb at the other, the
// wrist going down out of the picture with the winner's stripe on its cuff
IRON_ART.thumbLift = id => {
  const key = 'iron:thumb:lift:' + id;
  if (SKETCH.has(key) && !IRON_ART.redraw) return key;
  SKETCH.sheet(key, 460, 420, d => {
    const P = IRON_P, H = IRON_ART.helpers, top = 110;
    const plate = (pts, o = {}) => { d.solid(pts); H.ironPlate(d, pts, Object.assign({ fill: P.iron, fillAlpha: 0.72, w: 2.4 }, o)); };
    // the forearm, down and out of the picture
    plate([[160, top + 56], [300, top + 56], [318, 420], [140, 420]], { fill: P.iron, tone: THUMB_LIGHT(140, 318), rivetEdges: [0, 2], spacing: 18, rustPatches: 3, scratch: 3 });
    plate([[150, top + 74], [310, top + 74], [312, top + 104], [148, top + 104]], { fill: P.ironLight, tone: () => 0.3, rivetEdges: [0], spacing: 14, rustWash: false });
    d.wash([[150, top + 84], [311, top + 84], [311, top + 94], [149, top + 94]], PCOL[id], { alpha: 0.9, off: 0.5 });
    // the palm: a thick plate, its top flat where they stand
    plate([[64, top], [372, top - 2], [380, top + 26], [350, top + 62], [100, top + 62], [60, top + 30]], { fill: P.ironLight, tone: (x, y) => 0.1 + (y - top) / 70 * 0.6, rivetEdges: [0], spacing: 22, rustPatches: 2, scratch: 3 });
    // the fingers curling up at the right (two seen, the far one behind)
    for (const [dx, dy, fill] of [[-14, -10, P.ironLight], [0, 0, P.iron]]) {
      plate([[350 + dx, top + 4 + dy], [394 + dx, top - 6 + dy], [410 + dx, top - 54 + dy], [372 + dx, top - 50 + dy]], { fill, tone: () => 0.35, rustPatches: 1 });
      plate([[372 + dx, top - 50 + dy], [410 + dx, top - 54 + dy], [404 + dx, top - 96 + dy], [374 + dx, top - 90 + dy]], { fill, tone: () => 0.3, rustWash: false });
      plate([[374 + dx, top - 90 + dy], [404 + dx, top - 96 + dy], [392 + dx, top - 122 + dy], [370 + dx, top - 118 + dy], [362 + dx, top - 104 + dy]], { fill, tone: () => 0.25, rustWash: false });
      d.rivet(391 + dx, top - 52 + dy, 1.8); d.rivet(389 + dx, top - 93 + dy, 1.8);
    }
    // the thumb, standing up at the left end, with its stripe
    plate([[66, top + 4], [100, top + 2], [92, top - 50], [56, top - 46]], { fill: P.iron, tone: THUMB_LIGHT(56, 100), rivetEdges: [1], spacing: 10 });
    d.wash([[59, top - 30], [96, top - 33], [94, top - 42], [58, top - 38]], PCOL[id], { alpha: 0.9, off: 0.4 });
    plate([[56, top - 46], [92, top - 50], [86, top - 84], [70, top - 92], [54, top - 80]], { fill: P.ironLight, tone: () => 0.25, rustWash: false });
  }, { ox: 220, oy: 110, seed: 9840 + id, versions: 3 });
  return key;
};
