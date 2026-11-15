/* Pip & Bo - World 40 Colossus March: Part 1's props (Pyramid Sands): obelisks, temple ruins, the heel chain's ring. */
'use strict';

/* Sheets (drawn once, three boil versions, blitted). Each returns its key. Anchors are noted per prop.
     IRON_ART.obelisk()    a toppled obelisk lying as a ramp. 300 x 110, anchor (0, 100) = the buried tip on the
                           ground; its top face runs from (14, 92) up to (262, 26) (IRON_ART.OBELISK.ramp).
     IRON_ART.ruinWall(k)  a broken temple wall, WALL_W + 24 x 180 (anchor bottom middle), k varies the break and the carving.
     IRON_ART.pillar()     a standing column with a lotus capital, 56 x 230 (anchor bottom middle); blitted rotated
                           when it topples.
     IRON_ART.paving(k)    the temple floor: worn paving slabs in the sand, 960 x 70 (anchor top left at the ground).
     IRON_ART.ring()       the heel chain's end: a big iron ring with a shackle, 64 x 64 (anchor at its middle).
     IRON_ART.rock(k) IRON_ART.cactus(k) IRON_ART.boneArch()   what the chain drags them through (bottom middle). */
IRON_ART.OBELISK = { w: 300, h: 110, ox: 0, oy: 100, ramp: [[14, 92], [262, 26]] };
IRON_ART.obelisk = (k = 0) => {
  const key = 'iron:obelisk:' + k;
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 300, 110, d => {
    const P = IRON_P, H = IRON_ART.helpers;
    // the shaft: a long tapering stone lying on a slant, its square base block on the right, the point buried at left
    const top = [[8, 96], [262, 26]], bot = [[16, 104], [270, 46]];
    const face = [[6, 94], [258, 22], [270, 32], [276, 50], [22, 106]];
    const end = [[258, 22], [292, 30], [298, 60], [276, 50], [270, 32]];
    d.solid(face.concat([[300, 62], [300, 30]]), { lw: 2 });
    d.pencil([[0, 100], [300, 18]], { alpha: 0.25 });
    // the lit top face, the shadowed side face below it
    const side = [[22, 106], [276, 50], [298, 60], [296, 74], [30, 110]];
    d.shape(side, { fill: P.ochreDeep, w: 2, corner: 30, hatch: { a: 64, gap: 2.2, w: 0.6, tone: (x, y) => 0.55 + (y - 60) / 80 } });
    d.shape(face, { fill: P.dust, w: 2.2, corner: 30, hatch: { a: 20, gap: 3.4, w: 0.55, tone: (x, y) => (y - 40) / 90 - 0.1 } });
    d.shape(end, { fill: P.ochre, w: 2, corner: 30, hatch: { a: 80, gap: 2, w: 0.55, tone: (x) => (x - 270) / 30 + 0.2 } });
    // carved signs down the face: eyes, birds, wavy water, a sun disc, cut in with a little shadow
    for (let i = 0; i < 9; i++) {
      const t = 0.12 + i * 0.095, x = 6 + (258 - 6) * t + 10, y = 94 + (22 - 94) * t + 8;
      const kind = (i + k) % 4;
      if (kind === 0) { d.stroke(SKETCH.ell(x, y, 5, 2.6, 10, -0.27), { w: 0.9, curve: true, sh: 0 }); d.spot(SKETCH.ell(x + 0.6, y, 1.5, 1.5, 6), { spread: 0.1 }); }
      else if (kind === 1) { d.stroke([[x - 5, y + 2], [x - 1, y - 2], [x + 3, y - 1], [x + 6, y - 5]], { w: 0.9, curve: true, sh: 0 }); d.stroke([[x - 2, y], [x - 3, y + 4]], { w: 0.7, sh: 0 }); }
      else if (kind === 2) { for (let r = 0; r < 2; r++) d.stroke([[x - 6, y + r * 3], [x - 3, y - 1.5 + r * 3], [x, y + r * 3], [x + 3, y - 1.5 + r * 3], [x + 6, y + r * 3]], { w: 0.7, curve: true, sh: 0 }); }
      else { d.stroke(SKETCH.ell(x, y, 3.2, 3.2, 10), { w: 0.9, curve: true, sh: 0 }); d.stroke([[x - 6, y + 4], [x + 6, y + 0.8]], { w: 0.7, sh: 0 }); }
    }
    // cracks, a chipped corner, sand drifted against the low end
    H.ironScratches(d, 140, 62, 4, { s: 1.2 });
    d.stroke([[150, 52], [160, 60], [158, 72], [168, 84]], { w: 1, sh: 0, curve: false });
    d.spot([[272, 30], [282, 28], [278, 36]], { spread: 0.2 });
    d.wash([[0, 110], [0, 92], [30, 88], [70, 98], [96, 110]], P.sand, { alpha: 0.95, off: 0, op: 'source-over', layer: 'ink' });
    d.stroke([[0, 92], [30, 88], [70, 98], [96, 110]], { w: 1.4, curve: true, sh: 0.2, layer: 'ink' });
    d.stipple([[4, 96], [60, 96], [90, 110], [4, 110]], { n: 40, r: 0.5, alpha: 0.6 });
    d.lift([[30, 92], [200, 44], [206, 50], [36, 98]], 0.35);
  }, { ox: 0, oy: 100, seed: 4400 + k });
  return key;
};
IRON_ART.WALL_W = 110;
IRON_ART.ruinWall = (k = 0) => {
  const key = 'iron:ruinwall:' + k;
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, IRON_ART.WALL_W + 24, 184, d => {
    const P = IRON_P, x0 = 8, x1 = IRON_ART.WALL_W + 16, y1 = 180, mx = (x0 + x1) / 2, sx = (x1 - x0) / 68;
    const top = (k % 2 ? [[0, 34], [16, 22], [30, 30], [44, 16], [56, 26], [68, 20]] : [[0, 22], [14, 30], [28, 14], [42, 24], [58, 18], [68, 28]]).map(([x, y]) => [x0 + x * sx, y]);
    const body = top.concat([[x1 + 1, y1], [x0 - 1, y1]]);
    d.solid(body, { lw: 2 });
    d.wash(body, P.dust, { alpha: 0.65, off: 1.4, blooms: 1 });
    // courses of cut stone, joints staggered, each block shaded on its right and bottom
    for (let r = 0; r < 9; r++) {
      const y = 36 + r * 16; if (y > y1 - 4) break;
      d.line(x0, y, x1, y + (d.r() - 0.5) * 1.5, { w: 1, ov: 0.5, alpha: 0.85 });
      const off = r % 2 ? 0 : 17;
      for (let x = x0 + off + 17; x < x1 - 4; x += 34) {
        d.line(x, y, x + (d.r() - 0.5), y + 16, { w: 0.9, ov: 0.2, alpha: 0.8 });
        d.hatch([[x - 6, y + 1], [x - 1, y + 1], [x - 1, y + 15], [x - 6, y + 15]], { a: 70, gap: 1.6, w: 0.45, alpha: 0.55 });
      }
    }
    // a carved band: a row of figures in profile and a winged sun
    const by = 60 + (k % 3) * 16;
    d.wash([[x0 + 2, by - 7], [x1 - 2, by - 7], [x1 - 2, by + 7], [x0 + 2, by + 7]], P.ochre, { alpha: 0.4, off: 0.5 });
    for (let i = 0; i < Math.floor((x1 - x0 - 8) / 16); i++) { const fx = x0 + 10 + i * 16; d.stroke([[fx, by + 5], [fx, by - 2], [fx + 2, by - 5]], { w: 0.8, sh: 0 }); d.stroke(SKETCH.ell(fx + 2, by - 6, 1.6, 1.6, 6), { w: 0.7, sh: 0, curve: true }); d.stroke([[fx, by], [fx + 4, by - 1]], { w: 0.6, sh: 0 }); }
    // the shadow side and the base
    d.hatch([[x1 - 14, 24], [x1, 20], [x1, y1], [x1 - 12, y1]], { a: 80, gap: 2, w: 0.6, tone: () => 0.8, cross: true, crossTone: (x, y) => (y - 100) / 80 });
    d.spot([[x1 - 3, 60], [x1 + 1, 60], [x1 + 1, y1], [x1 - 4, y1]], { spread: 0.2 });
    d.outline(body, { w: 2.4, corner: 25, c: [mx, 100] });
    // cracks and a missing chunk
    d.stroke([[30, 40], [34, 58], [28, 72], [33, 90]], { w: 1.1, sh: 0 });
    d.stroke([[x1 - 20, 120], [x1 - 24, 134], [x1 - 18, 150]], { w: 0.9, sh: 0 });
    d.stroke([[mx + 6, 96], [mx + 2, 108], [mx + 8, 118], [mx + 4, 128]], { w: 0.9, sh: 0 });
    d.lift([[x0 + 4, 26], [30, 24], [26, 50], [x0 + 4, 54]], 0.4);
    // sand drifted against its foot, both sides
    d.wash([[0, y1], [0, 166], [14, 160], [30, 170], [44, y1]], P.sand, { alpha: 0.95, off: 0, op: 'source-over', layer: 'ink' });
    d.stroke([[0, 166], [14, 160], [30, 170], [44, y1]], { w: 1.2, curve: true, layer: 'ink', sh: 0 });
    d.wash([[x1 + 8, y1], [x1 + 8, 170], [x1 - 6, 168], [x1 - 20, y1]], P.sand, { alpha: 0.95, off: 0, op: 'source-over', layer: 'ink' });
    d.stroke([[x1 + 8, 170], [x1 - 6, 168], [x1 - 20, y1]], { w: 1.1, curve: true, layer: 'ink', sh: 0 });
  }, { ox: (IRON_ART.WALL_W + 24) / 2, oy: 180, seed: 4500 + k });
  return key;
};
// fallen blocks heaped against a wall's far side, 64 x 80 (anchor bottom left at the wall's right face): a way back up
IRON_ART.RUBBLE = { w: 46, h: 72 };
IRON_ART.rubble = (k = 0) => {
  const key = 'iron:rubble:' + k;
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 64, 80, d => {
    const P = IRON_P, y1 = 78;
    // three cut blocks: a big one on the ground, a tipped one on it against the wall, a small one at the foot
    const big = [[0, y1], [0, 40], [40, 38], [44, y1]];
    const tip = [[0, 40], [2, 8], [30, 6], [36, 38]];
    const small = [[40, y1], [42, 60], [58, 58], [62, y1]];
    for (const q of [big, tip, small]) d.solid(q, { lw: 2 });
    d.shape(big, { fill: P.dust, w: 2.2, corner: 30, hatch: { a: 70, gap: 2.2, w: 0.55, tone: (x, y) => (x - 18) / 30 + (y - 50) / 60 } });
    d.shape(tip, { fill: P.ochre, w: 2.2, corner: 30, hatch: { a: 20, gap: 2.6, w: 0.55, tone: (x, y) => (x - 14) / 26 } });
    d.shape(small, { fill: P.ochreDeep, w: 2, corner: 30, hatch: { a: 64, gap: 2, w: 0.55, tone: () => 0.5 } });
    // the carving that was on them, now sideways; chips, a crack
    d.stroke([[8, 50], [12, 46], [16, 50], [20, 46]], { w: 0.8, curve: true, sh: 0 });
    d.stroke(SKETCH.ell(16, 22, 4, 4, 10), { w: 0.8, curve: true, sh: 0 });
    d.stroke([[26, 44], [24, 56], [29, 66]], { w: 0.9, sh: 0 });
    d.lift([[4, 12], [26, 10], [24, 16], [6, 18]], 0.4);
    d.wash([[0, y1], [0, 70], [20, 66], [50, 72], [64, y1]], P.sand, { alpha: 0.95, off: 0, op: 'source-over', layer: 'ink' });
    d.stroke([[0, 70], [20, 66], [50, 72], [64, y1]], { w: 1.2, curve: true, layer: 'ink', sh: 0 });
    d.stipple([[2, 72], [60, 72], [62, 78], [2, 78]], { n: 30, r: 0.5, alpha: 0.6 });
  }, { ox: 0, oy: 78, seed: 4560 + k });
  return key;
};
IRON_ART.pillar = () => {
  const key = 'iron:pillar';
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 56, 232, d => {
    const P = IRON_P, cx = 28, y1 = 228, rw = 15;
    const shaft = [[cx - rw, 40], [cx + rw, 40], [cx + rw + 1, y1 - 14], [cx - rw - 1, y1 - 14]];
    const cap = [[cx - 24, 14], [cx - 18, 4], [cx + 18, 4], [cx + 24, 14], [cx + 18, 28], [cx + 16, 40], [cx - 16, 40], [cx - 18, 28]];
    const base = [[cx - 22, y1 - 14], [cx + 22, y1 - 14], [cx + 24, y1], [cx - 24, y1]];
    for (const q of [shaft, cap, base]) d.solid(q, { lw: 2 });
    d.shape(shaft, { fill: P.dust, w: 2.2, corner: 30, c: [cx, 120] });
    // fluting: contour lines down the shaft, crowding toward the shadow side; drums (joints) across it
    for (let i = -3; i <= 3; i++) { const x = cx + i * 4.2 * (1 - Math.abs(i) * 0.04); d.stroke([[x, 42], [x + 0.4, y1 - 16]], { w: 0.55 + Math.max(0, i) * 0.12, sh: 0, alpha: 0.75, layer: 'hatch' }); }
    d.hatch([[cx + 4, 40], [cx + rw, 40], [cx + rw + 1, y1 - 14], [cx + 4, y1 - 14]], { a: 86, gap: 1.6, w: 0.5, tone: (x) => (x - cx) / rw + 0.1, cross: true, crossTone: (x) => (x - cx - 8) / 8 });
    for (const y of [86, 132, 176]) d.line(cx - rw, y, cx + rw, y + 1, { w: 1, ov: 0.2 });
    // the lotus capital: petals, a band
    d.shape(cap, { fill: P.ochre, w: 2, corner: 40, c: [cx, 22] });
    for (let i = -2; i <= 2; i++) d.stroke([[cx + i * 7, 38], [cx + i * 8.5, 18], [cx + i * 9.5, 8]], { w: 0.8, curve: true, sh: 0 });
    d.hatch([[cx + 6, 6], [cx + 18, 4], [cx + 24, 14], [cx + 16, 40], [cx + 6, 40]], { a: 70, gap: 1.8, w: 0.5, tone: x => (x - cx) / 20 + 0.2 });
    d.shape(base, { fill: P.ochreDeep, w: 2, corner: 30, hatch: { a: 10, gap: 1.8, w: 0.5, tone: (x) => (x - cx) / 24 + 0.4 } });
    // wear: a chipped edge, a crack, a bird's nest on the capital
    d.spot([[cx - rw, 100], [cx - rw + 4, 104], [cx - rw, 110]], { spread: 0.2 });
    d.stroke([[cx - 4, 140], [cx, 150], [cx - 3, 162]], { w: 0.9, sh: 0 });
    IRON_ART.helpers.ironNest(d, cx - 6, 4, { s: 0.6 });
    d.lift([[cx - rw + 2, 46], [cx - rw + 7, 46], [cx - rw + 7, y1 - 20], [cx - rw + 2, y1 - 20]], 0.4);
  }, { ox: 28, oy: 228, seed: 4600 });
  return key;
};
IRON_ART.paving = (k = 0) => {
  const key = 'iron:paving:' + k;
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 960, 72, d => {
    const P = IRON_P;
    // big worn slabs set into the sand, some tipped, some cracked, sand blown over the joints
    let x = -20 + d.r() * 20;
    while (x < 980) {
      const w = 70 + d.r() * 60, tip = (d.r() - 0.5) * 3, y0 = 2 + d.r() * 2, h = 20 + d.r() * 10;
      const slab = [[x, y0 + tip], [x + w, y0 - tip], [x + w - 3, y0 + h], [x + 3, y0 + h + tip * 0.5]];
      d.wash(slab, d.r() < 0.5 ? P.dust : P.bone, { alpha: 0.85, off: 1, blooms: d.r() < 0.4 ? 1 : 0 });
      d.outline(slab, { w: 1.3, corner: 30, ov: 1.2, alpha: 0.85 });
      d.hatch([[x + w - 14, y0], [x + w, y0 - tip], [x + w - 3, y0 + h], [x + w - 16, y0 + h]], { a: 76, gap: 1.8, w: 0.45, alpha: 0.6 });
      if (d.r() < 0.35) d.stroke([[x + w * 0.3, y0 + 2], [x + w * 0.4, y0 + h * 0.5], [x + w * 0.36, y0 + h]], { w: 0.8, sh: 0 });
      if (d.r() < 0.5) d.wash([[x + w - 10, y0 + h + 2], [x + w + 14, y0 + h + 1], [x + w + 8, y0 - 2], [x + w - 4, y0 + 4]], P.sand, { alpha: 0.9, off: 0, op: 'source-over', layer: 'ink' });
      x += w + 2 + d.r() * 4;
    }
    d.stipple([[0, 26], [960, 26], [960, 70], [0, 70]], { n: 260, r: 0.55, alpha: 0.45 });
  }, { flat: true, seed: 4700 + k });
  return key;
};
IRON_ART.ring = () => {
  const key = 'iron:ring';
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 72, 72, d => {
    const P = IRON_P, c = 36;
    // a shackle (a U of iron with a pin) holding a big ring
    const sh = [[c - 9, 8], [c + 9, 8], [c + 10, 24], [c + 4, 26], [c + 4, 14], [c - 4, 14], [c - 4, 26], [c - 10, 24]];
    d.solid(sh, { lw: 2 });
    d.shape(sh, { fill: P.iron, w: 1.8, corner: 40, hatch: { a: 70, gap: 1.6, w: 0.45, tone: x => (x - c) / 10 + 0.4 } });
    d.ellipse(c, 10, 12, 3.6, { fill: P.soot, w: 1.6 });
    const ringO = SKETCH.ell(c, 44, 22, 22, 32), ringI = SKETCH.ell(c, 44, 13, 13, 24);
    d.solid(ringO, { lw: 2 });
    d.washIn(ringO, () => { d.wash(ringO, P.iron, { alpha: 0.7, off: 0 }); d.wash(SKETCH.ell(c + 9, 52, 18, 16, 14), P.shadowInk, { alpha: 0.25, off: 0, edge: false }); });
    d.arcHatch(ringO, c, 44, { n: 6, r0: 14, r1: 21, mid: 0.8, span: 2.2, w: 0.6 });
    d.stroke(SKETCH.ell(c, 44, 22, 22, 32, 0, -0.5, Math.PI * 2 - 0.8), { w: 2.6, curve: true, c: [c, 44] });
    d.stroke(SKETCH.ell(c, 44, 13, 13, 24, 0, 0.6, Math.PI * 2 - 0.2), { w: 1.6, curve: true, c: [c, 44] });
    // the paper inside the ring (it is a hole)
    const g = d.ctx('ink'); g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); SKETCH.ell(c, 44, 12, 12, 20).forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.fill(); g.restore();
    d.stroke(SKETCH.ell(c, 44, 18, 18, 16, 0, Math.PI * 1.05, Math.PI * 1.45), { w: 1.2, col: '#fbf3df', layer: 'white', curve: true, sh: 0 });
    d.spot(SKETCH.ell(c + 12, 56, 6, 3, 8, 0.8), { spread: 0.2 });
    d.stroke([[c + 18, 52], [c + 19, 60]], { w: 1.1, col: P.rust, sh: 0, layer: 'hatch' });
  }, { ox: 36, oy: 44, seed: 4800 });
  return key;
};
IRON_ART.rock = (k = 0) => {
  const key = 'iron:rock:' + k;
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 70, 44, d => {
    const P = IRON_P;
    const r = [[4, 42], [8, 22], [22, 8], [40, 6], [56, 14], [66, 30], [66, 42]];
    d.solid(r, { lw: 2 });
    d.shape(r, { fill: k % 2 ? P.ironLight : P.ochreDeep, w: 2.2, corner: 30, c: [36, 28], hatch: { a: 50, gap: 2, w: 0.6, tone: (x, y) => (x - 30) / 40 + (y - 20) / 40, cross: true, crossTone: (x, y) => (x - 50) / 20 } });
    d.stroke([[22, 8], [28, 20], [26, 30]], { w: 1, sh: 0 }); d.stroke([[40, 6], [44, 18], [58, 22]], { w: 0.9, sh: 0 });
    d.lift([[12, 24], [22, 12], [30, 12], [18, 28]], 0.4);
    d.hatch([[0, 42], [70, 42], [66, 44], [2, 44]], { a: 0, gap: 1, w: 0.5, force: true });
  }, { ox: 35, oy: 42, seed: 4810 + k });
  return key;
};
IRON_ART.cactus = (k = 0) => {
  const key = 'iron:cactus:' + k;
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 50, 70, d => {
    const P = IRON_P, c = 25;
    const trunk = [[c - 7, 68], [c - 7, 14], [c - 4, 6], [c + 4, 6], [c + 7, 14], [c + 7, 68]];
    const arm = k % 2 ? [[c + 7, 40], [c + 16, 40], [c + 18, 22], [c + 22, 20], [c + 24, 24], [c + 22, 46], [c + 7, 48]] : [[c - 7, 36], [c - 16, 36], [c - 18, 24], [c - 22, 22], [c - 24, 26], [c - 22, 42], [c - 7, 44]];
    for (const q of [trunk, arm]) { d.solid(q, { lw: 2 }); d.shape(q, { fill: P.verd, w: 1.8, corner: 50, c: [c, 40], hatch: { a: 88, gap: 1.8, w: 0.5, tone: x => (x - c) / 10 + 0.3 } }); }
    for (let i = -1; i <= 1; i++) d.stroke([[c + i * 3.4, 10], [c + i * 3.6, 66]], { w: 0.6, sh: 0, alpha: 0.7 });
    for (let y = 14; y < 64; y += 7) for (const sx of [-1, 1]) d.stroke([[c + sx * 7, y], [c + sx * 10, y - 2]], { w: 0.5, sh: 0 });
    d.wash(SKETCH.ell(c, 4, 4, 3, 8), '#e98a9a', { alpha: 0.9, off: 0 });
  }, { ox: 25, oy: 68, seed: 4820 + k });
  return key;
};
IRON_ART.boneArch = () => {
  const key = 'iron:bonearch';
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 150, 110, d => {
    const P = IRON_P;
    // the ribs of something very old and very big, arching over the path; a duck-under gap of 20 px under the lowest
    for (let i = 0; i < 4; i++) {
      const x = 22 + i * 32, h = 70 - Math.abs(i - 1.5) * 6;
      const rib = [[x - 14, 108], [x - 16, 108 - h * 0.6], [x - 4, 108 - h], [x + 18, 108 - h * 0.92], [x + 30, 108 - h * 0.6]];
      d.stroke(rib, { w: 7, curve: true, col: P.bone, sh: 0, p: [0.8, 1, 0.5] });
      d.stroke(rib, { w: 1.8, curve: true, c: [x, 108] });
      d.stroke(rib.map(([px, py]) => [px + 1.5, py + 3.6]), { w: 1, curve: true, sh: 0, alpha: 0.7 });
    }
    // the spine across the top
    const sp = []; for (let x = 4; x <= 146; x += 8) sp.push([x, 44 + Math.sin(x / 20) * 3]);
    d.stroke(sp, { w: 9, curve: true, col: P.bone, sh: 0 });
    d.stroke(sp, { w: 2, curve: true, c: [75, 80] });
    for (let x = 8; x < 146; x += 9) d.stroke([[x, 40], [x + 1, 48]], { w: 0.9, sh: 0 });
    d.hatch([[4, 48], [146, 48], [146, 52], [4, 52]], { a: 0, gap: 1.2, w: 0.5, force: true, alpha: 0.6 });
  }, { ox: 75, oy: 108, seed: 4830 });
  return key;
};
