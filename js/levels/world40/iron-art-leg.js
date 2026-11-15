/* Pip & Bo - World 40 Colossus March: Part 2 art (the leg shell, catwalks, greased plates, ballast, pistons, the
   knee gate, the hip gear, oil crows, Tumbleweed Gulch far below). */
'use strict';

/* Sheets (made a few at a time while the part card shows):
     IRON_ART.gulch(l)          l 0: the sky and far mesas, l 1: the gulch floor far below (960 x 540, flat)
     IRON_ART.legChunk(k)       one 540 px tall band of the leg's riveted shell, 660 wide (anchor top left at x -330)
     IRON_ART.legLedge(w, i)    a catwalk w long (anchor: the walking surface's left end)
     IRON_ART.legPlate(k)       a greased ramp plate, 126 x 150 rise at 50 deg (anchor: its bottom left on the ledge)
     IRON_ART.ballast()         a ballast block 60 x 75 on rail wheels (anchor bottom left)
     IRON_ART.piston()          a piston head with its shaft (anchor: the head's top left)
     IRON_ART.legLever()        a lever arm (anchor: the pivot; turned by the blit)
     IRON_ART.kneeGate()        the knee hinge's gate panel (anchor bottom middle)
     IRON_ART.hipGear()         the hip ring gear, 340 across (anchor at the hub)
     IRON_ART.legVent()         a steam vent grille in a plate (anchor middle)
     IRON_ART.crow(pose)        an iron-grey oil crow, 'sit' or 'flap' (anchor between the feet)
   Light: the low sun at the right; the shell is a cylinder, lit on its right, cool shade on its left. */
IRON_ART.LEG = { rowH: 135, seams: [40, 185, 330, 475, 620] };
IRON_ART.gulch = (l) => {
  const key = 'iron:gulch:' + l;
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 960, 540, d => {
    const P = IRON_P;
    if (l === 0) {
      // high sky: loose warm glazes, a few long clouds, the far mesas on a pale horizon
      for (let i = 0; i < 7; i++) { const x = -60 + i * 160 + d.r() * 40, y = 30 + d.r() * 120, w2 = 140 + d.r() * 120; d.wash(SKETCH.ell(x + w2 / 2, y, w2 / 2, 18 + d.r() * 10, 16, d.r()), i % 2 ? P.dust : P.paper, { alpha: 0.18, off: 0, spread: 2.2, layers: 2, edge: false }); }
      for (const [x, y, w2] of [[180, 90, 140], [520, 60, 110], [760, 170, 90], [330, 210, 70]]) {
        const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push([x - w2 / 2 + w2 * t, y - Math.sin(t * Math.PI) * (12 + d.r() * 5) - (k % 2) * 4]); }
        const under = [[x + w2 / 2, y], [x - w2 / 2, y]];
        d.wash(pts.concat(under), P.greyBlue, { alpha: 0.24, off: 1.5, spread: 1.4 });
        d.stroke(pts, { w: 1.1, curve: true, alpha: 0.5, p: [0.1, 1, 0.1] }); d.stroke(under, { w: 0.8, alpha: 0.35 });
      }
      const far = ironDuneLine(d, 400, 26, -10, 970, 22, 4.1, true);
      far.splice(8, 5, [150, 396], [160, 362], [236, 360], [246, 398]); far.splice(26, 5, [560, 398], [572, 350], [690, 348], [702, 398]);
      d.wash(far.concat([[970, 470], [-10, 470]]), P.greyBlue, { alpha: 0.4, off: 1.2, spread: 1.2 });
      d.stroke(far, { w: 1.1, alpha: 0.5, p: [0.2, 1, 0.2], sh: 0 });
      d.hatch(far.concat([[970, 470], [-10, 470]]), { a: 0, gap: 3.4, w: 0.45, alpha: 0.3, tone: (x, y) => (y - 380) / 60 });
    } else {
      // the gulch floor, seen from high up: red mesas with banded cliffs, a dry river, the railway on a trestle
      const P2 = P, top = 300;
      d.wash([[-10, top + 20], [970, top + 10], [970, 545], [-10, 545]], P2.sand, { alpha: 0.6, off: 0, spread: 1, layers: 3 });
      const mesas = [[60, 120, 70], [300, 160, 90], [610, 110, 60], [820, 150, 80]];
      for (const [x, w2, h] of mesas) {
        const y0 = top + 60 + d.r() * 30, body = [[x, y0], [x + 10, y0 - h], [x + w2 - 8, y0 - h - 4], [x + w2, y0], [x + w2 + 20, y0 + 16], [x - 18, y0 + 16]];
        d.shape(body, { fill: P2.rustLight, w: 1.6, corner: 30, hatch: { a: 70, gap: 2.4, w: 0.5, tone: (px) => (x + w2 - px) / w2 * 0.9 } });
        for (let b = 1; b < 4; b++) d.stroke([[x + 6, y0 - h + b * h / 4], [x + w2 - 4, y0 - h + b * h / 4 + (d.r() - 0.5) * 3]], { w: 0.6, sh: 0, alpha: 0.6 });
        d.wash([[x + 10, y0 - h], [x + w2 - 8, y0 - h - 4], [x + w2 - 14, y0 - h + 6], [x + 14, y0 - h + 8]], P2.ochre, { alpha: 0.6, off: 0.4 });
      }
      // the dry river bed winding toward us
      const river = [[0, 470], [160, 452], [330, 470], [520, 448], [700, 462], [960, 440]];
      d.wash(river.concat(river.slice().reverse().map(([x, y]) => [x, y + 16])), P2.dust, { alpha: 0.8, off: 0.6 });
      d.stroke(river, { w: 1, curve: true, alpha: 0.6, sh: 0 });
      // the railway on a trestle, a little water tower, a train's smoke
      d.stroke([[0, 420], [960, 404]], { w: 1.6, sh: 0 }); d.stroke([[0, 424], [960, 408]], { w: 1, sh: 0, alpha: 0.7 });
      for (let x = 380; x < 560; x += 14) { const y = 420 - x / 60; d.stroke([[x, y + 4], [x - 6, y + 40]], { w: 0.7, sh: 0 }); d.stroke([[x, y + 4], [x + 6, y + 40]], { w: 0.7, sh: 0 }); }
      d.shape([[700, 398], [716, 398], [714, 380], [702, 380]], { fill: P2.iron, w: 1.1 }); d.shape([[698, 380], [718, 380], [712, 370], [704, 370]], { fill: P2.rust, w: 1 });
      d.stroke([[704, 398], [700, 414]], { w: 0.8, sh: 0 }); d.stroke([[712, 398], [716, 414]], { w: 0.8, sh: 0 });
      d.shape([[230, 410], [262, 409], [262, 401], [234, 402]], { fill: P2.soot, w: 1 });
      for (let i = 0; i < 4; i++) d.cloud(222 - i * 16, 396 - i * 6, 5 + i * 2, { fill: '#efe8d8', puffs: 4, w: 0.8, curls: 0, alpha: 0.7 });
      // tumbleweeds and a fence
      for (let i = 0; i < 5; i++) { const x = 80 + i * 190 + d.r() * 50, y = 490 + d.r() * 30; d.stroke(SKETCH.ell(x, y, 5, 4, 10, d.r()), { w: 0.8, sh: 0, curve: true }); d.stroke(SKETCH.ell(x + 1, y - 1, 3, 2.5, 8, d.r()), { w: 0.6, sh: 0, curve: true }); }
      for (let x = 600; x < 900; x += 26) d.stroke([[x, 500 - (x - 600) * 0.05], [x, 510 - (x - 600) * 0.05]], { w: 0.7, sh: 0 });
      d.stipple([[0, 470], [960, 450], [960, 540], [0, 540]], { n: 300, r: 0.5, alpha: 0.5 });
      // the haze between us and it
      d.wash([[-10, top - 10], [970, top - 20], [970, top + 40], [-10, top + 50]], P2.paper, { alpha: 0.4, off: 0, spread: 2.2, layers: 2, edge: false });
    }
  }, { flat: true, seed: 4700 + l, versions: 2 });
  return key;
};
// one band of the shell: plates seam to seam (the seams line up across bands), a cylinder lit from the right
IRON_ART.legChunk = (k) => {
  const key = 'iron:legchunk:' + k;
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 660, 540, d => {
    const P = IRON_P, H = IRON_ART.helpers, L = IRON_ART.LEG, x0 = 40, x1 = 620, mid = 330;
    // the shade of the cylinder: dark at the left edge, a lit band at the right third, a cool rim at the far right
    const shade = x => { const u = (x - x0) / (x1 - x0); return 1.05 - u * 1.45 + Math.max(0, u - 0.86) * 4; };
    d.solid([[x0, 0], [x1, 0], [x1, 540], [x0, 540]]);   // the shell is solid iron: the sky never shows through it
    for (let r = 0; r < 4; r++) {
      const gr = k * 4 + r, ya = r * L.rowH, yb = ya + L.rowH, off = gr % 2 ? 72 : 0;
      const xs = [x0, ...L.seams.slice(1, -1).map(x => x + off - (off && x + off > x1 - 30 ? 145 : 0)), x1].sort((a, b) => a - b);
      for (let i = 0; i < xs.length - 1; i++) {
        const a = xs[i], b = xs[i + 1]; if (b - a < 20) continue;
        const pts = [[a, ya], [b, ya], [b, yb], [a, yb]];
        const patch = d.r() < 0.12;
        H.ironPlate(d, pts, { fill: patch ? P.ironLight : P.iron, rivetEdges: [0, 1, 2, 3], spacing: 16, inset: 7, rust: 0.15, tone: (x, y) => shade(x) - 0.1 + (y - ya) / L.rowH * 0.15, hatchA: 80, gap: 3, cross: true, crossTone: x => shade(x) - 0.45, scratch: 3, patch, leave: 0.12, rustPatches: d.r() < 0.4 ? 1 : 0 });
      }
      // a stencil or a hatch now and then
      if (gr % 5 === 2) H.ironStencil(d, ['L-2', 'NO STEP', '07', 'KEEP OFF', 'OIL'][gr % 5 === 2 ? (gr / 5 | 0) % 5 : 0], 420, ya + 70, 18, {});
      if (gr % 7 === 3) { const hx = 120, hy = ya + 40; d.shape([[hx, hy], [hx + 54, hy], [hx + 54, hy + 60], [hx, hy + 60]], { fill: P.ironLight, w: 2, corner: 30 }); d.rivets(hx + 6, hy + 6, hx + 48, hy + 6, 5, { r: 1.6 }); d.stroke([[hx + 44, hy + 30], [hx + 50, hy + 30]], { w: 3 }); }
    }
    // a big vertical pipe down the shaded side, clamped at each row; a ladder up the lit side (scenery)
    H.ironPipe(d, [[78, -4], [78, 135], [78, 270], [78, 405], [78, 544]], 9, { flanges: [0.12, 0.37, 0.62, 0.87] });
    if (k % 2 === 0) H.ironLadder(d, 560, 20, 300, 22, {});
    // a big feature or two per band (so the shell reads as a machine, not a wall): a round inspection hatch, a louvred
    // vent, a green hose looping between clamps
    const feat = [['hatch', 210, 230], ['grille', 330, 120], [], ['hatch', 470, 330], ['grille', 250, 260]][k] || [];
    if (feat[0] === 'hatch') {
      const [, ax, ay] = feat, ar = 62;
      d.solid(SKETCH.ell(ax, ay, ar, ar * 0.97, 28));
      const cap = d.ellipse(ax, ay, ar, ar * 0.97, { fill: '#8a6e60', w: 2.8 });
      d.arcHatch(cap, ax - 6, ay - 8, { r0: ar * 0.4, r1: ar * 1.02, n: 16, mid: 0.85, span: 2.6, w: 0.7 });
      d.hatch(cap, { a: 40, gap: 2.2, w: 0.55, alpha: 0.6, tone: (x, y) => ((x - ax) * -0.6 + (y - ay) * 0.8) / ar * 1.3 - 0.2 });
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.2; H.ironBolt(d, ax + Math.cos(a) * ar * 0.68, ay + Math.sin(a) * ar * 0.66, 3.8); }
      d.ellipse(ax, ay, ar * 0.3, ar * 0.3, { fill: P.soot, w: 2.2, hatch: { a: -30, gap: 1.9, w: 0.6, tone: () => 0.7 } });
      d.line(ax - ar * 0.16, ay, ax + ar * 0.16, ay, { w: 3, ov: 0.6 }); d.line(ax, ay - ar * 0.16, ax, ay + ar * 0.16, { w: 3, ov: 0.6 });
      d.stroke(SKETCH.ell(ax, ay, ar * 0.9, ar * 0.88, 20, 0, -1.2, -0.1), { w: 2.4, col: '#fbf3df', layer: 'white', alpha: 0.8, curve: true, sh: 0 });
    } else if (feat[0] === 'grille') {
      const [, gx, gy] = feat;
      H.ironGrille(d, gx, gy, 110, 54, 7, {});
      H.ironPipe(d, [[gx + 150, -4], [gx + 170, gy + 20], [gx + 120, gy + 120], [gx + 40, gy + 170], [gx - 30, gy + 230], [gx - 60, 544]], 7, { fill: P.verd, flanges: [0.2, 0.55, 0.85] });
    }
    // cylinder light: a cool glaze down the left, a warm lit band on the right, the far-right rim cool again
    d.wash([[x0, 0], [x0 + 150, 0], [x0 + 110, 540], [x0, 540]], '#4f5f86', { alpha: 0.22, off: 0, spread: 2, layers: 2, edge: false });
    d.wash([[430, 0], [570, 0], [570, 540], [430, 540]], '#f0c070', { alpha: 0.18, off: 0, spread: 2, layers: 2, edge: false });
    d.wash([[596, 0], [x1, 0], [x1, 540], [596, 540]], '#4f5f86', { alpha: 0.18, off: 0, spread: 1, layers: 1, edge: false });
    // the silhouette: heavy outer lines both sides
    d.stroke([[x0, -2], [x0, 542]], { w: 3.2, sh: 0.6 }); d.stroke([[x1, -2], [x1, 542]], { w: 2.6, sh: 0.4 });
    void mid;
  }, { seed: 4800 + k, versions: 2, ox: 0, oy: 0 });
  return key;
};
// a catwalk: a riveted beam with a grated top and brackets down to the shell
IRON_ART.legLedge = (w, i) => {
  const key = 'iron:legledge:' + i;
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, w + 12, 58, d => {
    const P = IRON_P, x0 = 6, x1 = w + 6, top = 4;
    // brackets: triangles from under the beam back to the shell
    for (let x = x0 + 30; x < x1 - 20; x += 90) { const q = [[x - 3, top + 22], [x + 26, top + 22], [x - 3, top + 50]]; d.solid(q); d.shape(q, { fill: P.iron, w: 1.6, corner: 30, hatch: { a: 70, gap: 2.2, w: 0.5, tone: () => 0.7 } }); d.rivets(x + 2, top + 28, x + 2, top + 42, 2, { r: 1.4 }); }
    // the beam's front face and the grated walking top (lit)
    const face = [[x0, top + 5], [x1, top + 5], [x1, top + 22], [x0, top + 22]];
    d.solid(face);
    IRON_ART.helpers.ironPlate(d, face, { fill: P.iron, rivetEdges: [0], spacing: 14, inset: 4, r: 1.5, tone: (x, y) => 0.3 + (y - top) / 22, hatchA: 0, gap: 2.4, rustPatches: 1, leave: 0 });
    const deck = [[x0 - 2, top], [x1 + 2, top], [x1, top + 5], [x0, top + 5]];
    d.solid(deck); d.shape(deck, { fill: P.dust, w: 1.6, corner: 20 });
    d.stroke([[x0, top + 22], [x1, top + 22]], { w: 2.6, sh: 0.5 }); d.stroke([[x0, top], [x0, top + 22]], { w: 2.2, sh: 0.3 }); d.stroke([[x1, top], [x1, top + 22]], { w: 2.2, sh: 0.3 });
    for (let x = x0 + 4; x < x1 - 2; x += 5) d.stroke([[x, top + 0.5], [x + 1, top + 4.5]], { w: 0.5, sh: 0, alpha: 0.7, bend: 0 });
    // a drip or two of oil off the edge, a scuff of light along the deck
    for (let j = 0; j < Math.max(1, w / 160); j++) { const x = x0 + 20 + d.r() * (w - 40); d.stroke([[x, top + 22], [x + 0.5, top + 30 + d.r() * 8]], { w: 1.6, p: [1, 0.6, 0.1], sh: 0, col: P.soot }); }
    d.stroke([[x0 + 6, top + 0.8], [x1 - 6, top + 0.8]], { w: 1, col: '#fbf3df', alpha: 0.7, layer: 'white', sh: 0, brk: 1.4 });
  }, { seed: 4900 + i, ox: 6, oy: 4, versions: 2 });
  return key;
};
// a greased ramp plate: a thick slab from (0, 0) up to (126, -150), shiny with oil, drips under it
IRON_ART.legPlate = (k) => {
  const key = 'iron:legplate:' + k;
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 170, 200, d => {
    const P = IRON_P, ox = 14, oy = 176, dx = IRONLEG.plateDX, dy = -IRONLEG.storey, th = 22;
    const ax = ox, ay = oy, bx = ox + dx, by = oy + dy, nx = 0.766 * th, ny = 0.643 * th;   // the slab's thickness, down-right
    const top = [[ax, ay], [bx, by], [bx + nx, by + ny], [ax + nx, ay + ny]];
    // a strut under it back to the ledge
    d.solid([[ax + 50, ay - 50], [ax + 60, ay - 58], [ax + 62, ay + 2], [ax + 52, ay + 2]]);
    d.shape([[ax + 50, ay - 50], [ax + 60, ay - 58], [ax + 62, ay + 2], [ax + 52, ay + 2]], { fill: P.iron, w: 1.6, corner: 30, hatch: { a: 80, gap: 2, w: 0.5, tone: () => 0.75 } });
    d.solid(top);
    IRON_ART.helpers.ironPlate(d, top, { fill: P.soot, fillAlpha: 0.65, rivetEdges: [1, 3], spacing: 14, inset: 4, r: 1.6, tone: () => 0.4, hatchA: 40, gap: 2.6, rustPatches: 0, leave: 0, glint: false });
    // the oil sheen: long white highlights along the slab, a gold-brown glaze
    d.wash(top, '#8a6a2c', { alpha: 0.35, off: 0.4, layers: 1 });
    for (let j = 0; j < 3; j++) { const t0 = 0.12 + j * 0.25 + d.r() * 0.05, t1 = t0 + 0.18 + d.r() * 0.1; d.stroke([[ax + (bx - ax) * t0 + 3, ay + (by - ay) * t0 + 3], [ax + (bx - ax) * t1 + 3, ay + (by - ay) * t1 + 3]], { w: 1.8 - j * 0.3, col: '#fbf3df', alpha: 0.85, layer: 'white', sh: 0, p: [0.1, 1, 0.1] }); }
    // drips hanging from the underside
    for (let j = 0; j < 4; j++) { const t = 0.15 + j * 0.22, x = ax + nx + (bx - ax) * t, y = ay + ny + (by - ay) * t; const L2 = 6 + d.r() * 12; d.stroke([[x, y], [x + 0.5, y + L2]], { w: 2, p: [1, 0.7, 0.2], sh: 0, col: P.soot }); d.spot(SKETCH.ell(x + 0.5, y + L2 + 1.5, 1.8, 2.2, 6), { spread: 0.1 }); }
    d.stroke([[ax, ay], [bx, by]], { w: 2.6, sh: 0.4 });
  }, { seed: 4950 + k, ox: 14, oy: 176, versions: 2 });
  return key;
};
IRON_ART.ballast = () => {
  const key = 'iron:ballast';
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 72, 90, d => {
    const P = IRON_P, x0 = 6, x1 = 66, y1 = 80, y0 = 5;
    const body = [[x0, y0 + 6], [x0 + 6, y0], [x1 - 6, y0], [x1, y0 + 6], [x1, y1 - 8], [x0, y1 - 8]];
    d.solid(body);
    IRON_ART.helpers.ironPlate(d, body, { fill: P.ironLight, rivetEdges: [1, 3, 5], spacing: 12, inset: 5, r: 1.8, tone: (x, y) => 0.95 - (x - x0) / 60 * 0.9 + (y - y0) / 300, hatchA: 70, gap: 2.4, cross: true, crossTone: x => 0.6 - (x - x0) / 60, rustPatches: 2, scratch: 3 });
    IRON_ART.helpers.ironStencil(d, '5T', 36, 40, 16, {});
    d.stroke([[x0 + 14, y0 + 2], [x0 + 14, y0 - 4], [x1 - 14, y0 - 4], [x1 - 14, y0 + 2]], { w: 2.4, sh: 0 });
    // rail wheels
    for (const x of [x0 + 12, x1 - 12]) { d.solid(SKETCH.ell(x, y1 - 5, 6, 6, 12)); d.shape(SKETCH.ell(x, y1 - 5, 6, 6, 12), { fill: P.soot, w: 1.6, corner: 30 }); d.spot(SKETCH.ell(x, y1 - 5, 1.6, 1.6, 6), {}); }
  }, { seed: 4980, ox: 6, oy: 80 });
  return key;
};
IRON_ART.piston = () => {
  const key = 'iron:piston';
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 72, 230, d => {
    const P = IRON_P, x0 = 6, x1 = 66, cx = 36;
    // the polished shaft (lit stripe), then the head plate on it
    d.solid([[cx - 13, 18], [cx + 13, 18], [cx + 13, 226], [cx - 13, 226]]);
    d.shape([[cx - 13, 18], [cx + 13, 18], [cx + 13, 226], [cx - 13, 226]], { fill: P.greyBlue, w: 2, corner: 20, hatch: { a: 90, gap: 2.2, w: 0.5, tone: x => (cx + 13 - x) / 26 * 0.9 - 0.2 } });
    d.stroke([[cx + 6, 22], [cx + 6, 222]], { w: 2, col: '#fbf3df', alpha: 0.8, layer: 'white', sh: 0, brk: 1.2 });
    for (let y = 60; y < 226; y += 50) d.stroke([[cx - 13, y], [cx + 13, y]], { w: 0.8, sh: 0, alpha: 0.6 });
    const head = [[x0, 2], [x1, 2], [x1 - 4, 18], [x0 + 4, 18]];
    d.solid(head);
    IRON_ART.helpers.ironPlate(d, head, { fill: P.iron, rivetEdges: [0], spacing: 10, inset: 4, r: 1.6, tone: (x, y) => 0.2 + y / 30, hatchA: 0, gap: 2.2, rustPatches: 1, leave: 0 });
    d.stroke([[x0 + 4, 2.5], [x1 - 4, 2.5]], { w: 1.2, col: '#fbf3df', alpha: 0.8, layer: 'white', sh: 0 });
  }, { seed: 4990, ox: 6, oy: 2 });
  return key;
};
IRON_ART.legLever = () => {
  const key = 'iron:leglever';
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 60, 70, d => {
    const P = IRON_P, px = 30, py = 60;
    // base block (turns with the arm a little: drawn small), arm, red knob
    d.solid([[px - 12, py + 8], [px + 12, py + 8], [px + 9, py - 4], [px - 9, py - 4]]);
    d.shape([[px - 12, py + 8], [px + 12, py + 8], [px + 9, py - 4], [px - 9, py - 4]], { fill: P.soot, w: 1.8, corner: 30 });
    d.stroke([[px, py], [px, py - 48]], { w: 4.2, sh: 0.3 }); d.stroke([[px + 1, py - 4], [px + 1, py - 44]], { w: 1, col: '#fbf3df', alpha: 0.7, layer: 'white', sh: 0 });
    d.solid(SKETCH.ell(px, py - 52, 7, 7, 12)); d.shape(SKETCH.ell(px, py - 52, 7, 7, 12), { fill: P.rust, w: 1.8, corner: 30 }); d.stroke(SKETCH.ell(px - 2, py - 54, 2, 2, 6), { w: 1, col: '#fbf3df', layer: 'white', sh: 0 });
    d.spot(SKETCH.ell(px, py, 3, 3, 8), {});
  }, { seed: 4995, ox: 30, oy: 60 });
  return key;
};
IRON_ART.kneeGate = () => {
  const key = 'iron:kneegate';
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 40, 130, d => {
    const P = IRON_P, x0 = 12, x1 = 28, y1 = 122;
    const panel = [[x0, 6], [x1, 6], [x1, y1], [x0, y1]];
    d.solid(panel);
    IRON_ART.helpers.ironPlate(d, panel, { fill: P.rust, rivetEdges: [1, 3], spacing: 12, inset: 3, r: 1.4, tone: x => (x1 - x) / 16 * 0.8, hatchA: 80, gap: 2, rustPatches: 1, leave: 0 });
    // teeth at the bottom (it bites shut), hazard stripes
    for (let x = x0; x < x1; x += 5) d.shape([[x, y1], [x + 5, y1], [x + 2.5, y1 + 6]], { fill: P.iron, w: 1, corner: 10 });
    for (let y = 16; y < y1 - 10; y += 22) d.wash([[x0, y], [x1, y + 8], [x1, y + 14], [x0, y + 6]], P.core, { alpha: 0.7, off: 0.3 });
  }, { seed: 4996, ox: 20, oy: 122 });
  return key;
};
IRON_ART.hipGear = () => {
  const key = 'iron:hipgear';
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 380, 380, d => {
    const P = IRON_P, c = 190, R = 160, n = 22;
    const out = [];
    for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = a0 + Math.PI / n * 0.5, a2 = a0 + Math.PI / n * 1.1, a3 = a0 + Math.PI / n * 1.6; out.push([c + Math.cos(a0) * R, c + Math.sin(a0) * R], [c + Math.cos(a1) * (R + 16), c + Math.sin(a1) * (R + 16)], [c + Math.cos(a2) * (R + 16), c + Math.sin(a2) * (R + 16)], [c + Math.cos(a3) * R, c + Math.sin(a3) * R]); }
    d.solid(out, { lw: 2 });
    IRON_ART.helpers.ironPlate(d, out, { fill: P.iron, tone: (x, y) => (Math.hypot(x - c + 60, y - c + 60) / 260), hatchA: 60, gap: 2.8, rustPatches: 3, glint: false, w: 2.4 });
    // spokes and the hub
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.2, q = [[c + Math.cos(a - 0.12) * 40, c + Math.sin(a - 0.12) * 40], [c + Math.cos(a - 0.08) * (R - 26), c + Math.sin(a - 0.08) * (R - 26)], [c + Math.cos(a + 0.08) * (R - 26), c + Math.sin(a + 0.08) * (R - 26)], [c + Math.cos(a + 0.12) * 40, c + Math.sin(a + 0.12) * 40]]; d.shape(q, { fill: P.ironLight, w: 1.6, corner: 30 }); }
    for (let i = 0; i < 6; i++) { const a0 = i / 6 * Math.PI * 2 + 0.2 + 0.2, a1 = a0 + Math.PI / 3 - 0.4, hole = []; for (let t = 0; t <= 8; t++) { const a = a0 + (a1 - a0) * t / 8; hole.push([c + Math.cos(a) * (R - 32), c + Math.sin(a) * (R - 32)]); } for (let t = 8; t >= 0; t--) { const a = a0 + (a1 - a0) * t / 8; hole.push([c + Math.cos(a) * 52, c + Math.sin(a) * 52]); } d.shape(hole, { fill: P.soot, w: 1.6, corner: 30, hatch: { a: 45, gap: 1.8, w: 0.5, tone: () => 0.9 } }); }
    d.shape(SKETCH.ell(c, c, 40, 40, 20), { fill: P.ironLight, w: 2.2, corner: 30 }); d.rivets(c - 26, c, c + 26, c, 5, { r: 2 });
    d.shape(SKETCH.ell(c, c, 12, 12, 12), { fill: P.soot, w: 1.8 });
    d.stroke(SKETCH.ell(c, c, R - 8, R - 8, 60, 0, -2.6, -1.2), { w: 1.4, col: '#fbf3df', alpha: 0.7, layer: 'white', sh: 0, curve: true });
  }, { seed: 4997, ox: 190, oy: 190 });
  return key;
};
IRON_ART.legVent = () => {
  const key = 'iron:legvent';
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 50, 30, d => {
    const P = IRON_P;
    d.shape([[6, 6], [44, 6], [44, 22], [6, 22]], { fill: P.soot, w: 1.8, corner: 30 });
    for (let x = 11; x < 42; x += 6) d.stroke([[x, 8], [x, 20]], { w: 1.3, col: P.ironLight, sh: 0 });
    d.wash(SKETCH.ell(25, 6, 20, 5, 12), P.soot, { alpha: 0.4, off: 0, spread: 2, edge: false });
  }, { seed: 4998, ox: 25, oy: 14 });
  return key;
};
IRON_ART.crow = (pose) => {
  const key = 'iron:crow:' + pose;
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 60, 50, d => {
    const P = IRON_P, x = 30, y = 46;
    const ink = '#4a4a52';
    if (pose === 'sit') {
      const body = [[x - 12, y - 10], [x - 4, y - 18], [x + 6, y - 18], [x + 12, y - 24], [x + 18, y - 22], [x + 16, y - 16], [x + 8, y - 8], [x - 2, y - 4], [x - 14, y - 4]];
      d.solid(body); d.shape(body, { fill: '#6b6e78', w: 1.6, corner: 30, hatch: { a: 60, gap: 1.8, w: 0.5, tone: () => 0.75 } });
      d.shape([[x + 18, y - 22], [x + 25, y - 20], [x + 17, y - 18]], { fill: P.ochreDeep, w: 1, corner: 20 });
      d.spot(SKETCH.ell(x + 13, y - 21, 1.4, 1.4, 6), {});
      d.stroke([[x - 2, y - 4], [x - 4, y]], { w: 1, col: ink, sh: 0 }); d.stroke([[x + 3, y - 5], [x + 3, y]], { w: 1, col: ink, sh: 0 });
      d.stroke([[x - 14, y - 7], [x - 22, y - 4]], { w: 1.4, sh: 0 });
      d.stroke([[x - 8, y - 12], [x + 6, y - 12]], { w: 0.8, sh: 0, col: '#fbf3df', alpha: 0.6, layer: 'white' });
    } else {
      const body = SKETCH.ell(x, y - 18, 10, 6, 12, -0.2);
      d.solid(body); d.shape(body, { fill: '#6b6e78', w: 1.6, corner: 30 });
      for (const s of [-1, 1]) d.shape([[x - 2, y - 20], [x + s * 26, y - 38], [x + s * 22, y - 30], [x + s * 18, y - 32], [x + s * 14, y - 24]], { fill: '#6b6e78', w: 1.4, corner: 20, hatch: { a: 60, gap: 1.8, w: 0.5, tone: () => 0.7 } });
      d.shape([[x + 10, y - 20], [x + 17, y - 19], [x + 10, y - 16]], { fill: P.ochreDeep, w: 1, corner: 20 });
      for (let i = 0; i < 3; i++) d.stroke([[x - 20 + i * 6, y - 4], [x - 22 + i * 6, y + 2]], { w: 0.8, sh: 0, alpha: 0.6 });
    }
  }, { seed: 4999 + (pose === 'sit' ? 0 : 1), ox: 30, oy: 46 });
  return key;
};

/* --- the big picture (art pass 2): the other leg far off in the haze, cloud banks at our height, the knee drum,
   the ankle cuff. Light: low sun at the right, the shell a cylinder (cool shade left, warm band right). --- */
// the Colossus's other leg, far off in the haze: one cool tone, hatched, seams faint (anchor: the hip, top middle)
IRON_ART.farLeg = () => {
  const key = 'iron:farleg';
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 520, 1360, d => {
    const P = IRON_P, c = 260, ink = '#5f7581';
    const thigh = [[c - 190, 0], [c + 190, 0], [c + 165, 560], [c - 165, 560]];
    const shin = [[c - 150, 700], [c + 150, 700], [c + 130, 1190], [c - 130, 1190]];
    const foot = [[c - 150, 1190], [c + 120, 1190], [c + 250, 1290], [c + 250, 1340], [c - 170, 1340], [c - 175, 1260]];
    const tone = (x, y) => 0.25 + (x - (c - 200)) / 400 * -0.05 + Math.max(0, (c - 60 - x) / 200) * 0.6;
    for (const pts of [thigh, shin, foot]) {
      d.wash(pts, P.greyBlue, { alpha: 0.75, off: 1, spread: 1.4, layers: 2 });
      d.hatch(pts, { a: 80, gap: 3.2, w: 0.5, alpha: 0.5, col: ink, tone });
      d.stroke(pts.concat([pts[0]]), { w: 1.3, col: ink, alpha: 0.7, sh: 0, p: [0.3, 1, 0.3] });
    }
    // the knee drum and its bolts
    const knee = SKETCH.ell(c, 630, 175, 120, 40);
    d.wash(knee, P.greyBlue, { alpha: 0.85, off: 1, spread: 1.4, layers: 2 });
    d.hatch(knee, { a: 70, gap: 3, w: 0.5, alpha: 0.5, col: ink, tone: (x) => 0.2 + Math.max(0, (c - x) / 175) * 0.7 });
    d.stroke(knee.concat([knee[0]]), { w: 1.4, col: ink, alpha: 0.75, sh: 0, curve: true });
    d.stroke(SKETCH.ell(c, 630, 60, 42, 24), { w: 1.1, col: ink, alpha: 0.6, sh: 0, curve: true });
    // plate seams and rivet rows, faint
    for (let y = 120; y < 560; y += 130) d.stroke([[c - 185 + y * 0.045, y], [c + 185 - y * 0.045, y]], { w: 0.8, col: ink, alpha: 0.45, sh: 0 });
    for (let y = 820; y < 1190; y += 120) d.stroke([[c - 146 + (y - 700) * 0.04, y], [c + 146 - (y - 700) * 0.04, y]], { w: 0.8, col: ink, alpha: 0.45, sh: 0 });
    // the lit rim on the sun side
    d.stroke([[c + 186, 10], [c + 163, 550]], { w: 2.2, col: '#fbf3df', alpha: 0.6, layer: 'white', sh: 0 });
    d.stroke([[c + 147, 710], [c + 128, 1180]], { w: 2, col: '#fbf3df', alpha: 0.6, layer: 'white', sh: 0 });
  }, { flat: true, seed: 5101, ox: 260, oy: 0 });
  return key;
};
// long cloud banks drifting at our height (cool undersides, lit tops)
IRON_ART.cloudBank = (k) => {
  const key = 'iron:cloudbank:' + k;
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 980, 160, d => {
    const P = IRON_P;
    const n = 5 + k * 2;
    for (let i = 0; i < n; i++) {
      const x = 40 + i * (900 / n) + d.r() * 40, y = 96 + d.r() * 20, r = 22 + d.r() * 22 - k * 4;
      d.wash(SKETCH.ell(x, y + 10, r * 2.2, r * 0.55, 18, d.r()), P.greyBlue, { alpha: 0.32, off: 0.6, spread: 1.6, layers: 2, edge: false });
      d.cloud(x, y, r, { fill: '#f4ead4', puffs: 7, w: 1.1, curls: 2, alpha: 0.95 });
    }
    d.wash([[10, 118], [970, 112], [970, 140], [10, 146]], P.greyBlue, { alpha: 0.2, off: 0, spread: 2, layers: 2, edge: false });
  }, { flat: true, seed: 5110 + k });
  return key;
};
// the knee: a great hinge drum through the leg, its end caps bulging out past the shell (anchor: drum centre)
IRON_ART.kneeDrum = () => {
  const key = 'iron:kneedrum';
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 860, 300, d => {
    const P = IRON_P, H = IRON_ART.helpers, cx = 430, cy = 150;
    // the drum's band across the shell
    const band = [[cx - 330, cy - 58], [cx + 330, cy - 58], [cx + 330, cy + 58], [cx - 330, cy + 58]];
    d.solid(band);
    H.ironPlate(d, band, { fill: P.iron, rivetEdges: [0, 2], spacing: 15, inset: 6, r: 2, tone: (x, y) => 0.95 - (x - 100) / 660 * 0.9 + Math.abs(y - cy) / 120, hatchA: 0, gap: 2.6, cross: true, crossTone: x => 0.7 - (x - 100) / 500, rustPatches: 3, scratch: 4 });
    d.stroke([[cx - 330, cy], [cx + 330, cy]], { w: 1.2, sh: 0, alpha: 0.5 });
    // the end caps, left (in shade) and right (lit)
    for (const s of [-1, 1]) {
      const ex = cx + s * 320;
      const cap = SKETCH.ell(ex, cy, 96, 120, 36);
      d.solid(cap);
      H.ironPlate(d, cap, { fill: s > 0 ? P.ironLight : P.iron, tone: (x, y) => (s > 0 ? 0.25 : 0.75) + (x - ex) / 200 * -0.6 * s + (y - cy) / 260, hatchA: 60, gap: 2.6, rustPatches: 2, glint: s > 0, w: 3 });
      d.stroke(SKETCH.ell(ex, cy, 70, 88, 30), { w: 1.6, sh: 0.3, curve: true });
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; d.spot(SKETCH.ell(ex + Math.cos(a) * 80, cy + Math.sin(a) * 100, 3, 3, 8), {}); }
      // the hub: a hex nut and a cotter pin
      const hex = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; hex.push([ex + Math.cos(a) * 28, cy + Math.sin(a) * 32]); }
      d.solid(hex); d.shape(hex, { fill: P.soot, w: 2.2, corner: 20, hatch: { a: 45, gap: 1.8, w: 0.5, tone: () => 0.6 } });
      d.shape(SKETCH.ell(ex, cy, 10, 11, 12), { fill: P.ironLight, w: 1.6 });
      if (s > 0) d.stroke(SKETCH.ell(ex, cy, 86, 108, 40, 0, -1.3, -0.1), { w: 2, col: '#fbf3df', alpha: 0.75, layer: 'white', sh: 0, curve: true });
      // oil weeping from the joint
      for (let j = 0; j < 3; j++) { const x = ex - 30 + j * 26 + d.r() * 8, y = cy + 100 + d.r() * 10; d.stroke([[x, y], [x + 0.5, y + 14 + d.r() * 18]], { w: 2.2, p: [1, 0.6, 0.1], sh: 0, col: P.soot }); }
    }
    H.ironStencil(d, 'KNEE  B', cx + 120, cy + 4, 20, {});
  }, { seed: 5120, ox: 430, oy: 150 });
  return key;
};
// the ankle cuff: a thick riveted collar round the bottom of the leg (anchor: its top middle)
IRON_ART.legCuff = () => {
  const key = 'iron:legcuff';
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 720, 120, d => {
    const P = IRON_P, H = IRON_ART.helpers, c = 360;
    const cuff = [[c - 330, 18], [c + 330, 18], [c + 346, 44], [c + 346, 104], [c - 346, 104], [c - 346, 44]];
    d.solid(cuff);
    H.ironPlate(d, cuff, { fill: P.rust, rivetEdges: [0, 3], spacing: 16, inset: 7, r: 2.2, tone: (x, y) => 0.9 - (x - 20) / 680 * 0.85 + (y - 18) / 200, hatchA: 0, gap: 2.6, cross: true, crossTone: x => 0.6 - (x - 20) / 600, rustPatches: 4, scratch: 4 });
    for (let x = c - 300; x < c + 330; x += 110) d.stroke([[x, 46], [x, 102]], { w: 1.4, sh: 0.2 });
    d.stroke([[c - 330, 18], [c + 330, 18]], { w: 3, sh: 0.5 });
    d.stroke([[c + 120, 22], [c + 320, 22]], { w: 1.6, col: '#fbf3df', alpha: 0.75, layer: 'white', sh: 0 });
    H.ironStencil(d, 'L-2  ANKLE', c - 120, 76, 18, {});
  }, { seed: 5130, ox: 360, oy: 18 });
  return key;
};
