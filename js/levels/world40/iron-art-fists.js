/* Pip & Bo - World 40 Colossus March: Part 3 art (Superhero City at dusk, the chest's rib cage and belt, the head
   with the lantern eye, the fists and forearms, the chest locks, wind-up mice, the chest hatch). */
'use strict';

/* Sheets (made a few at a time while the part card shows):
     IRON_ART.city(l)           Superhero City at dusk, 960 wide (flat): l 0 the far towers in the haze, l 1 the glass
                                towers (the giant mirrored in them), l 2 the near rooftops (water tanks, a billboard)
     IRON_ART.chestWall(k)      a 480 x 460 piece of the chest (world x 480 k, y -380 .. 80): the rib cage (open, the
                                city shows between the ribs), the spine column, the belt of plates at the bottom
     IRON_ART.colossusHead()    the lower half of the head leaning in: jaw grille, cheek plates, the lantern eye
                                (anchor: the eye's middle)
     IRON_ART.fist(side)        a closed iron fist, its wrist toward side (anchor: the middle of its bottom)
     IRON_ART.forearm()         a forearm 240 long (anchor: its top edge at the left end; stretched and turned)
     IRON_ART.elbow()           the elbow joint with its pin (anchor: the top middle, the ledge)
     IRON_ART.padlock(s)        a chest lock, s 0 whole, 1 dented, 2 broken open (anchor: bottom middle)
     IRON_ART.chestLedge(k)     the chest ledge, left (k 0) or right (k 1) of the breastbone (anchor: top left)
     IRON_ART.sternum()         the sternum plate on its pillar (anchor: the plate's top left)
     IRON_ART.windMouse(f)      a tin wind-up mouse, frame f (anchor: bottom middle, facing right)
     IRON_ART.chestHatch()      the chest hatch fallen open (anchor: the plate's surface, the middle)
   Light: the low sun far off at the right (warm), the eye's light from above; the dusk paper is grey-cream. */
IRON_ART.CHEST = { spine: 960, top: -380 };
// the rib cage: each rib is a band from the spine out and down to the side (in world coords)
function ironRibPath(side, r) {
  const sx = 960 + side * 70, y0 = -350 + r * 78, pts = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14, x = sx + side * t * 1000, y = y0 + Math.sin(t * Math.PI * 0.9) * -40 + t * t * (150 - r * 20);
    pts.push([x, y]);
  }
  return pts;
}
IRON_ART.city = (l) => {
  const key = 'iron:city:' + l;
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 960, 320, d => {
    const P = IRON_P;
    if (l === 0) {
      // far towers: grey-blue in the haze, a few spires, the aerial mast with a red light
      for (let i = 0; i < 26; i++) {
        const x = -20 + i * 38 + d.r() * 20, w2 = 22 + d.r() * 30, h = 70 + d.r() * 150, y = 320 - h;
        const top = d.r() < 0.25 ? [[x + w2 * 0.5, y - 20 - d.r() * 20]] : [];
        const body = [[x, 320], [x, y], ...top, [x + w2, y], [x + w2, 320]];
        d.wash(body, i % 3 ? P.greyBlue : P.greyBlueDark, { alpha: 0.32, off: 0.6, spread: 1, layers: 2 });
        d.stroke(body.slice(0, -1), { w: 0.7, alpha: 0.42, sh: 0 });
      }
      d.wash([[-10, 230], [970, 220], [970, 325], [-10, 325]], P.paper, { alpha: 0.5, off: 0, spread: 2, layers: 2, edge: false });
    } else if (l === 1) {
      // the glass towers: tall slabs with window grids, one curved tower, and in the big glass the giant reflected
      const towers = [[40, 70, 210, 'slab'], [150, 60, 150, 'step'], [260, 90, 250, 'glass'], [400, 64, 170, 'slab'], [500, 80, 230, 'curve'], [630, 70, 160, 'step'], [740, 96, 260, 'glass'], [880, 66, 190, 'slab']];
      for (const [x, w2, h, kind] of towers) {
        const y = 320 - h;
        let body = [[x, 320], [x, y], [x + w2, y], [x + w2, 320]];
        if (kind === 'step') body = [[x, 320], [x, y + 30], [x + 12, y + 30], [x + 12, y], [x + w2 - 12, y], [x + w2 - 12, y + 30], [x + w2, y + 30], [x + w2, 320]];
        if (kind === 'curve') body = [[x, 320], [x, y + 20], [x + w2 * 0.2, y + 4], [x + w2 * 0.5, y], [x + w2 * 0.8, y + 4], [x + w2, y + 20], [x + w2, 320]];
        d.solid(body, { kind: 'dusk' });
        d.wash(body, kind === 'glass' ? '#9fb4bf' : P.greyBlueDark, { alpha: kind === 'glass' ? 0.55 : 0.5, off: 0.8, spread: 1 });
        d.hatch(body, { a: 90, gap: 3, w: 0.5, alpha: 0.45, tone: px => (px - x) / w2 * 0.9 + 0.1 });
        d.outline(body, { w: 1.3, corner: 30 });
        // lit windows (warm dusk lights) in a grid, a few left dark
        for (let wy = y + 14; wy < 312; wy += 12) for (let wx = x + 6; wx < x + w2 - 6; wx += 9) {
          if (kind === 'glass') continue;
          if (d.r() < 0.42) d.wash([[wx, wy], [wx + 4, wy], [wx + 4, wy + 6], [wx, wy + 6]], d.r() < 0.8 ? P.ochre : P.coreHot, { alpha: 0.85, off: 0.2, layers: 1, edge: false });
        }
        if (kind === 'glass') {
          // mullions, and the Colossus mirrored in the glass: dark iron shoulders, the lantern eye one warm dot
          for (let wx = x + 12; wx < x + w2; wx += 12) d.stroke([[wx, y + 2], [wx, 318]], { w: 0.5, alpha: 0.5, sh: 0 });
          for (let wy = y + 16; wy < 318; wy += 16) d.stroke([[x + 1, wy], [x + w2 - 1, wy]], { w: 0.4, alpha: 0.4, sh: 0 });
          const mx = x + w2 * 0.5, my = y + 50;
          const gi = [[mx - 34, 320], [mx - 30, my + 60], [mx - 40, my + 40], [mx - 26, my + 22], [mx - 12, my + 20], [mx - 14, my + 4], [mx - 8, my - 10], [mx + 8, my - 10], [mx + 14, my + 4], [mx + 12, my + 20], [mx + 26, my + 22], [mx + 40, my + 40], [mx + 30, my + 60], [mx + 34, 320]];
          d.washIn(body, () => d.wash(gi, P.iron, { alpha: 0.45, off: 0.6, spread: 1.2 }));
          d.stroke(gi, { w: 0.8, alpha: 0.5, sh: 0 });
          d.wash(SKETCH.ell(mx, my - 2, 4, 3.5, 10), P.core, { alpha: 0.95, off: 0, layers: 2 });
          // a long streak of sky caught in the glass
          d.stroke([[x + 8, y + 30], [x + w2 - 10, y + 130]], { w: 2.2, col: '#fbf3df', alpha: 0.5, layer: 'white', sh: 0 });
        }
        // rooftop bits: a spire, an antenna with a red light, a superhero beacon dish
        if (kind === 'curve') { d.stroke([[x + w2 * 0.5, y], [x + w2 * 0.5, y - 40]], { w: 1.4, sh: 0 }); d.wash(SKETCH.ell(x + w2 * 0.5, y - 42, 3, 3, 8), P.rust, { alpha: 0.9, off: 0, layers: 1 }); }
        if (kind === 'slab' && d.r() < 0.6) { const bx = x + w2 * 0.3; d.shape([[bx, y], [bx + 14, y - 10], [bx + 18, y - 6], [bx + 6, y + 2]], { fill: P.ironLight, w: 1, corner: 20 }); }
      }
      // a beacon beam from the dish tower: the hero signal on the clouds (a little lightning-bolt shape)
      d.wash([[434, 150], [470, 0], [520, 0], [446, 150]], P.coreHot, { alpha: 0.22, off: 0, spread: 2, layers: 2, edge: false });
      d.shape([[488, 18], [500, 18], [494, 30], [504, 30], [486, 50], [492, 34], [482, 34]], { fill: P.core, w: 1, corner: 20 });
    } else {
      // near rooftops: water tanks on stilts, a billboard (POW!), chimneys, a fire escape; warm last light on the tops
      let x = -10;
      while (x < 970) {
        const w2 = 80 + d.r() * 90, h = 50 + d.r() * 80, y = 320 - h;
        const body = [[x, 320], [x, y], [x + w2, y], [x + w2, 320]];
        d.solid(body, { kind: 'dusk' });
        d.wash(body, d.r() < 0.5 ? P.rustLight : P.soot, { alpha: 0.5, off: 0.8, spread: 1 });
        d.hatch(body, { a: 70, gap: 2.4, w: 0.5, alpha: 0.6, tone: (px, py) => 0.4 + (py - y) / h * 0.6 });
        d.outline(body, { w: 1.6, corner: 30 });
        d.stroke([[x + 2, y + 1], [x + w2 - 2, y + 1]], { w: 1.6, col: P.ochre, alpha: 0.8, sh: 0 });
        for (let wy = y + 16; wy < 316; wy += 18) for (let wx = x + 10; wx < x + w2 - 10; wx += 16) if (d.r() < 0.35) d.wash([[wx, wy], [wx + 7, wy], [wx + 7, wy + 9], [wx, wy + 9]], P.ochre, { alpha: 0.9, off: 0.2, layers: 1, edge: false });
        const r = d.r();
        if (r < 0.3) {
          // a water tank
          const tx = x + w2 * 0.55, ty = y - 30;
          d.shape([[tx - 14, ty], [tx + 14, ty], [tx + 14, ty + 20], [tx - 14, ty + 20]], { fill: P.rust, w: 1.4, corner: 30, hatch: { a: 90, gap: 2, w: 0.5, tone: px => (px - tx + 14) / 28 } });
          d.shape([[tx - 16, ty], [tx, ty - 10], [tx + 16, ty]], { fill: P.soot, w: 1.2, corner: 20 });
          for (const lx of [-10, 10]) d.stroke([[tx + lx, ty + 20], [tx + lx * 1.2, y]], { w: 1, sh: 0 });
        } else if (r < 0.48) {
          // the billboard
          const bx = x + 10, by = y - 46;
          d.shape([[bx, by], [bx + 70, by], [bx + 70, by + 30], [bx, by + 30]], { fill: P.core, w: 1.6, corner: 30 });
          d.word('POW!', bx + 35, by + 24, 18, { align: 'center', w: 2.4, col: P.rust });
          for (const lx of [10, 60]) d.stroke([[bx + lx, by + 30], [bx + lx, y]], { w: 1.1, sh: 0 });
        } else if (r < 0.7) {
          d.shape([[x + 14, y], [x + 14, y - 22], [x + 24, y - 22], [x + 24, y]], { fill: P.rustDark, w: 1.2, corner: 30 });
        }
        x += w2 + 4;
      }
    }
  }, { flat: true, seed: 5200 + l, versions: 2 });
  return key;
};
// a piece of the chest: the rib cage (each rib a riveted band, the city shows between them), the spine column, and
// the belt of plates along the bottom (world y -120 .. 80)
IRON_ART.chestWall = (k) => {
  const key = 'iron:chestwall:' + k;
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 480, 460, d => {
    const P = IRON_P, H = IRON_ART.helpers, bx = k * 480, by = -380;
    const L = (x, y) => [x - bx, y - by];
    // the ribs, back to front
    for (const side of [-1, 1]) for (let r = 0; r < 3; r++) {
      const path = ironRibPath(side, r).map(([x, y]) => L(x, y));
      if (path.every(([x]) => x < -60 || x > 540)) continue;
      const th = 30 - r * 3, top = path, bot = path.map(([x, y]) => [x, y + th]).reverse(), band = top.concat(bot);
      d.solid(band, { kind: 'dusk' });
      H.ironPlate(d, band, { fill: r === 1 ? P.ironLight : P.iron, fillAlpha: 0.92, shadeAlpha: 0.2, tone: (x, y) => 0.25 + (y - top[0][1]) / 60, hatchA: 20 * side, gap: 2.8, rustPatches: 1, w: 3.2, leave: 0, corner: 40, curve: true });
      // the underside in shadow (a soot glaze along the bottom edge, solid black spotting under it), the lit top edge
      d.washIn(band, () => d.wash(bot.concat(top.map(([x, y]) => [x, y + th * 0.55]).reverse()), P.soot, { alpha: 0.5, off: 0, spread: 1.4, layers: 2 }));
      d.stroke(top.map(([x, y]) => [x, y + 2.5]), { w: 1.6, col: '#fbf3df', alpha: 0.7, layer: 'white', sh: 0, curve: true, brk: 1.3 });
      // rivets along both edges; the underside in deep shade
      for (let i = 1; i < path.length - 1; i += 1) { const [x, y] = path[i]; if (x < 0 || x > 480) continue; H.ironBolt(d, x, y + 6, 2.2); H.ironBolt(d, x + side * 10, y + th - 6, 2); }
      d.within(band, () => d.hatch(bot.map(([x, y]) => [x, y + 1]).concat(top.map(([x, y]) => [x, y + th * 0.6]).reverse()), { a: -40 * side, gap: 2, w: 0.6, tone: () => 0.8 }));
    }
    // struts between the ribs (vertical ties) and a gallery rail
    for (let gx = 160; gx < 1920; gx += 320) {
      if (Math.abs(gx - 960) < 200) continue;
      const [x] = L(gx, 0); if (x < -30 || x > 510) continue;
      const strut = [[x - 9, 40], [x + 9, 40], [x + 9, 262], [x - 9, 262]];
      d.solid(strut, { kind: 'dusk' });
      H.ironPlate(d, strut, { fill: P.soot, fillAlpha: 0.9, rivetEdges: [1, 3], spacing: 14, inset: 4, r: 1.4, tone: px => 0.4 + (px - x + 9) / 30, hatchA: 90, gap: 2.2, rustPatches: 0, leave: 0 });
    }
    // the spine column (above the sternum plate): a ribbed tower with a ladder of rungs and a neck collar at its top
    { const [x0] = L(900, 0), [x1] = L(1020, 0);
      if (x1 > -10 && x0 < 490) {
        const col = [[x0, 0], [x1, 0], [x1, 192], [x0, 192]];
        d.solid(col, { kind: 'dusk' });
        H.ironPlate(d, col, { fill: P.iron, fillAlpha: 0.9, shadeAlpha: 0.2, rivetEdges: [1, 3], spacing: 13, inset: 6, r: 1.8, tone: px => 0.15 + Math.abs(px - (x0 + x1) / 2) / 70, hatchA: 90, gap: 2.4, cross: true, crossTone: px => (px - x0) / 120 - 0.3, rustPatches: 2, scratch: 3 });
        for (let y = 20; y < 190; y += 34) { d.stroke([[x0 + 4, y], [x1 - 4, y]], { w: 2.2, sh: 0.3 }); d.stroke([[x0 + 6, y + 3], [x1 - 6, y + 3]], { w: 0.8, col: '#fbf3df', layer: 'white', alpha: 0.6, sh: 0 }); }
        H.ironGrille(d, x0 + 30, 70, 60, 40, 5, {});
        d.washIn([[x0 + 30, 70], [x0 + 90, 70], [x0 + 90, 110], [x0 + 30, 110]], () => d.wash([[x0 + 30, 70], [x0 + 90, 70], [x0 + 90, 110], [x0 + 30, 110]], P.ember, { alpha: 0.5, off: 0, spread: 2 }));
      }
    }
    // the belt: a deep band of plates along the bottom, with the boiler's glow leaking from louvres, the lock hasps
    { const yb0 = L(0, -120)[1], yb1 = 460;
      const belt = [[-4, yb0 + 6], [484, yb0 + 6], [484, yb1], [-4, yb1]];
      d.solid(belt, { kind: 'dusk' });
      for (let i = 0; i < 4; i++) {
        const a = -4 + i * 122, b = a + 122, pts = [[a, yb0 + 8], [b, yb0 + 8], [b, yb1 - 2], [a, yb1 - 2]];
        H.ironPlate(d, pts, { fill: (i + k) % 3 === 0 ? P.ironLight : P.iron, fillAlpha: 0.88, shadeAlpha: 0.2, rivetEdges: [0, 1, 3], spacing: 14, inset: 6, r: 1.7, tone: (x, y) => 0.25 + (y - yb0) / 260, hatchA: 70, gap: 2.8, rustPatches: d.r() < 0.5 ? 1 : 0, scratch: 2 });
      }
      d.stroke([[-4, yb0 + 6], [484, yb0 + 6]], { w: 3.2, sh: 0.6 });
      // the belt's top rail
      d.shape([[-4, yb0 - 4], [484, yb0 - 4], [484, yb0 + 8], [-4, yb0 + 8]], { fill: P.soot, w: 2, corner: 30 });
      d.rivets(6, yb0 + 2, 474, yb0 + 2, 24, { r: 1.5 });
      d.wash([[-4, yb0 + 8], [484, yb0 + 8], [484, yb0 + 34], [-4, yb0 + 40]], P.soot, { alpha: 0.45, off: 0, spread: 2, layers: 2, edge: false });
      // louvres glowing from inside (the boiler), one per piece
      const lx = 180 + (k % 2) * 60, ly = yb0 + 40;
      H.ironGrille(d, lx, ly, 120, 46, 6, {});
      d.washIn([[lx, ly], [lx + 120, ly], [lx + 120, ly + 46], [lx, ly + 46]], () => { d.wash([[lx, ly], [lx + 120, ly], [lx + 120, ly + 46], [lx, ly + 46]], P.ember, { alpha: 0.55, off: 0, spread: 2 }); d.wash([[lx + 20, ly + 24], [lx + 100, ly + 24], [lx + 100, ly + 46], [lx + 20, ly + 46]], P.coreHot, { alpha: 0.5, off: 0, spread: 2 }); });
      H.ironStencil(d, ['C-1', 'C-2', 'C-3', 'C-4'][k], 60, yb0 + 70, 18, {});
      // soot above the louvres
      d.wash(SKETCH.ell(lx + 60, ly - 6, 70, 12, 14), P.soot, { alpha: 0.22, off: 0, spread: 2.4, edge: false });
    }
    // the shoulders: great round pauldrons at both ends of the chest
    if (k === 0 || k === 3) {
      const sxx = k === 0 ? 30 : 450, sh = SKETCH.ell(sxx, 60, 170, 150, 28);
      d.solid(sh, { kind: 'dusk' });
      H.ironPlate(d, sh, { fill: P.iron, fillAlpha: 0.9, shadeAlpha: 0.2, tone: (x, y) => Math.hypot(x - sxx - (k ? -60 : 60), y - 10) / 220, hatchA: 50, gap: 2.6, cross: true, crossTone: (x, y) => (y - 60) / 120, rustPatches: 2, w: 3, curve: true, scratch: 4 });
      for (let i = 0; i < 9; i++) { const a = (k === 0 ? 0.2 : Math.PI - 0.2 - 1.6) + i * 0.2; H.ironBolt(d, sxx + Math.cos(a) * 140, 60 + Math.sin(a) * 124, 3.4); }
      d.stroke(SKETCH.ell(sxx, 60, 150, 132, 30, 0, k === 0 ? -0.2 : Math.PI - 1.2, k === 0 ? 1.0 : Math.PI + 0.2), { w: 2, col: '#fbf3df', alpha: 0.65, layer: 'white', sh: 0, curve: true });
    }
  }, { seed: 5300 + k, versions: 2, ox: 0, oy: 0 });
  return key;
};
// the head leaning in from the top: the lower half (brow, the lantern eye in its cage, cheek plates, the jaw grille)
IRON_ART.colossusHead = () => {
  const key = 'iron:head';
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 560, 420, d => {
    const P = IRON_P, H = IRON_ART.helpers, cx = 280, ey = 250;
    // the skull: a broad riveted dome cut off by the top of the page, then the jaw
    const skull = [[30, -10], [530, -10], [540, 140], [520, 270], [470, 350], [380, 404], [180, 404], [90, 350], [40, 270], [20, 140]];
    d.solid(skull, { kind: 'dusk', curve: true });
    H.ironPlate(d, skull, { fill: P.iron, fillAlpha: 0.9, shadeAlpha: 0.22, tone: (x, y) => 0.15 + Math.abs(x - cx) / 320 + (y - 200) / 600, hatchA: 60, gap: 2.6, cross: true, crossTone: (x, y) => Math.abs(x - cx) / 260 - 0.2 + (y - 300) / 300, rustPatches: 3, w: 3.4, curve: true, scratch: 6 });
    // plate seams and rivet rows across the face
    for (const y of [70, 150]) { d.stroke([[34, y], [cx, y - 8], [526, y]], { w: 1.8, curve: true }); d.rivets(50, y + 5, 510, y + 5, 26, { r: 1.6, rust: 0.2 }); }
    // the brow: a heavy overhang over the eye, deep shade under it
    const brow = [[96, 160], [cx, 136], [464, 160], [454, 184], [cx, 168], [106, 184]];
    d.solid(brow, { kind: 'dusk' });
    H.ironPlate(d, brow, { fill: P.soot, tone: () => 0.7, hatchA: 0, gap: 2, rustPatches: 0, w: 2.6, leave: 0, corner: 30 });
    d.wash([[110, 186], [cx, 172], [450, 186], [440, 214], [cx, 200], [120, 214]], P.shadowInk, { alpha: 0.35, off: 0, spread: 1.6, layers: 2, edge: false });
    // the lantern: a cage of bars round a big round lens (its glow and its iris are drawn live)
    const lens = SKETCH.ell(cx, ey, 64, 60, 32);
    d.solid(lens, { kind: 'dusk' });
    d.ellipse(cx, ey, 82, 78, { fill: P.soot, w: 3.4, hatch: { a: 30, gap: 1.8, w: 0.6, tone: () => 0.85 } });
    d.ellipse(cx, ey, 64, 60, { fill: P.ochre, w: 2.6 });
    d.wash(SKETCH.ell(cx, ey, 52, 48, 24), P.coreHot, { alpha: 0.8, off: 0, spread: 1.6, layers: 2, edge: false });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; d.line(cx + Math.cos(a) * 60, ey + Math.sin(a) * 56, cx + Math.cos(a) * 90, ey + Math.sin(a) * 86, { w: 3, ov: 1 }); H.ironBolt(d, cx + Math.cos(a) * 88, ey + Math.sin(a) * 84, 3.6); }
    d.stroke(SKETCH.ell(cx, ey, 70, 66, 30, 0, -2.6, -1.4), { w: 2.4, col: '#fbf3df', alpha: 0.8, layer: 'white', sh: 0, curve: true });
    // cheek plates with vents, ear bolts
    for (const s of [-1, 1]) {
      const vx = cx + s * 170;
      H.ironGrille(d, vx - 34, 232, 68, 46, 5, {});
      d.wash(SKETCH.ell(vx, 226, 44, 10, 14), P.soot, { alpha: 0.3, off: 0, spread: 2, edge: false });
      d.ellipse(cx + s * 236, 210, 22, 26, { fill: P.ironLight, w: 2.4, hatch: { a: 45, gap: 2, w: 0.5, tone: x => (x - cx - s * 236 + 22) / 44 } });
      H.ironBolt(d, cx + s * 236, 210, 6);
    }
    // the jaw: a grille mouth, rust stains running from its corners
    const jaw = [[160, 322], [400, 322], [388, 374], [172, 374]];
    d.solid(jaw, { kind: 'dusk' });
    d.shape(jaw, { fill: P.soot, w: 2.6, corner: 30 });
    for (let x = 180; x < 390; x += 16) { d.stroke([[x, 326], [x + 2, 370]], { w: 3, sh: 0.2 }); d.stroke([[x + 4, 328], [x + 5, 366]], { w: 0.8, col: P.ochreDeep, alpha: 0.6, sh: 0 }); }
    for (const x of [170, 390]) d.wash([[x - 4, 374], [x + 4, 374], [x + 3, 404], [x - 2, 404]], P.rust, { alpha: 0.5, off: 0.3, spread: 1.4 });
    H.ironStencil(d, 'MK I', cx, 120, 22, {});
  }, { seed: 5400, versions: 3, ox: 280, oy: 250 });
  return key;
};
// a closed fist seen from the front, punching down: four fat curled fingers side by side (rust-red knuckle plates on
// their striking ends), the thumb wrapped across them, the back of the hand and the wrist cuff above, turned a little
// toward its arm's side (drawn for side 1, mirrored for -1); anchor: the middle of the bottom (the striking face)
IRON_ART.fist = (side) => {
  const key = 'iron:fist:' + side;
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 130, 120, d => {
    const P = IRON_P, H = IRON_ART.helpers, m = x => (side > 0 ? x : 130 - x);
    const pts = a => a.map(([x, y]) => [m(x), y]);
    // the wrist cuff and the back of the hand (behind the fingers)
    const cuff = pts([[30, 2], [104, 2], [108, 26], [26, 26]]);
    d.solid(cuff, { kind: 'dusk' });
    H.ironPlate(d, cuff, { fill: P.soot, fillAlpha: 0.9, rivetEdges: [2], spacing: 10, inset: 4, r: 1.6, tone: () => 0.55, hatchA: 0, gap: 2, rustPatches: 0, leave: 0 });
    const back = pts([[16, 24], [114, 22], [120, 56], [10, 58]]);
    d.solid(back, { kind: 'dusk', curve: true });
    H.ironPlate(d, back, { fill: P.iron, fillAlpha: 0.9, shadeAlpha: 0.2, tone: (x, y) => 0.15 + (y - 22) / 60, hatchA: 0, gap: 2.4, rustPatches: 1, w: 3, curve: true, leave: 0.3 });
    // four fingers, each a rounded roll, the middle two longest
    const fw = 26, x0 = 12, len = [44, 52, 50, 42];
    for (let i = 0; i < 4; i++) {
      const fx = x0 + i * fw, top = 40, bot = top + len[i] + 20, fl = pts([[fx + 2, top], [fx + fw - 2, top], [fx + fw, bot - 12], [fx + fw - 6, bot], [fx + 6, bot], [fx, bot - 12]]);
      d.solid(fl, { kind: 'dusk', curve: true });
      H.ironPlate(d, fl, { fill: i % 2 ? P.iron : P.ironLight, fillAlpha: 0.92, shadeAlpha: 0.22, tone: (x, y) => 0.2 + Math.abs(x - m(fx + fw * 0.4)) / 18 + (y - top) / 160, hatchA: 90, gap: 2.2, rustPatches: 0, w: 2.8, curve: true, leave: 0 });
      // the knuckle joint line and the rust-red nail plate on the striking end
      d.stroke(pts([[fx + 4, top + 26], [fx + fw / 2, top + 30], [fx + fw - 4, top + 26]]), { w: 1.6, curve: true });
      const nail = pts([[fx + 5, bot - 14], [fx + fw - 5, bot - 14], [fx + fw - 7, bot - 3], [fx + 7, bot - 3]]);
      d.shape(nail, { fill: P.rust, w: 1.8, corner: 30, hatch: { a: 45, gap: 1.8, w: 0.5, tone: () => 0.45 } });
      H.ironBolt(d, m(fx + fw / 2), top + 12, 2.4);
      d.stroke(pts([[fx + 5, top + 4], [fx + 6, top + 20]]), { w: 1.4, col: '#fbf3df', alpha: 0.7, layer: 'white', sh: 0 });
    }
    // the thumb wrapped across the front of the fingers
    const th = pts([[6, 56], [40, 50], [78, 52], [86, 62], [78, 74], [40, 74], [10, 72]]);
    d.solid(th, { kind: 'dusk', curve: true });
    H.ironPlate(d, th, { fill: P.ironLight, fillAlpha: 0.95, shadeAlpha: 0.2, tone: (x, y) => 0.1 + (y - 50) / 26, hatchA: 0, gap: 2, rustPatches: 0, w: 3, curve: true, leave: 0 });
    d.shape(pts([[66, 54], [82, 56], [84, 66], [70, 68]]), { fill: P.rust, w: 1.6, corner: 30 });
    d.stroke(pts([[14, 56], [40, 52], [70, 53]]), { w: 1.6, col: '#fbf3df', alpha: 0.8, layer: 'white', sh: 0, curve: true });
    // a heavier line along the striking face
    d.stroke(pts([[10, 100], [40, 112], [80, 112], [116, 100]]), { w: 3.6, sh: 0.6, curve: true });
  }, { seed: 5500 + (side > 0 ? 1 : 2), ox: 65, oy: 112 });
  return key;
};
// a forearm: a riveted cylinder with a hydraulic ram along it; the top edge is the walking line
IRON_ART.forearm = () => {
  const key = 'iron:forearm';
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 250, 64, d => {
    const P = IRON_P, H = IRON_ART.helpers, y0 = 6, y1 = 56;
    const tube = [[2, y0], [246, y0 + 2], [246, y1 - 2], [2, y1]];
    d.solid(tube, { kind: 'dusk' });
    H.ironPlate(d, tube, { fill: P.iron, fillAlpha: 0.9, shadeAlpha: 0.2, tone: (x, y) => Math.abs(y - 20) / 36 + 0.1, hatchA: 0, gap: 2.4, cross: true, crossTone: (x, y) => (y - 40) / 18, rustPatches: 2, w: 2.8, scratch: 3 });
    for (const x of [40, 120, 200]) { d.stroke([[x, y0 + 1], [x + 2, y1 - 1]], { w: 2.4, sh: 0.3 }); d.rivets(x - 5, y0 + 6, x - 5, y1 - 6, 4, { r: 1.5 }); }
    // the ram along the underside (polished)
    d.shape([[30, y1 - 14], [210, y1 - 14], [210, y1 - 6], [30, y1 - 6]], { fill: P.greyBlue, w: 1.6, corner: 30 });
    d.stroke([[34, y1 - 12], [206, y1 - 12]], { w: 1.2, col: '#fbf3df', layer: 'white', alpha: 0.8, sh: 0 });
    // the walking edge: a worn bright line
    d.stroke([[4, y0 + 1.5], [244, y0 + 3]], { w: 1.6, col: '#fbf3df', alpha: 0.75, layer: 'white', sh: 0, brk: 1.2 });
    d.stroke([[2, y0], [246, y0 + 2]], { w: 3, sh: 0.4 });
  }, { seed: 5510, ox: 0, oy: 6 });
  return key;
};
// the elbow joint: a heavy ring with the big pin through it (its top is the ledge the puller stands on)
IRON_ART.elbow = () => {
  const key = 'iron:elbow';
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 100, 90, d => {
    const P = IRON_P, H = IRON_ART.helpers, cx = 50, cy = 44;
    const ring = SKETCH.ell(cx, cy, 42, 38, 28);
    d.solid(ring, { kind: 'dusk' });
    H.ironPlate(d, ring, { fill: P.ironLight, fillAlpha: 0.9, tone: (x, y) => Math.hypot(x - cx + 18, y - cy + 18) / 60, hatchA: 45, gap: 2.2, rustPatches: 1, w: 3, curve: true, leave: 0 });
    // the deck on top (the ledge), the pin's head in the middle with a ring to pull
    d.shape([[6, 4], [94, 4], [90, 14], [10, 14]], { fill: P.soot, w: 2.2, corner: 30 });
    for (let x = 12; x < 90; x += 5) d.stroke([[x, 5], [x + 1, 12]], { w: 0.5, sh: 0, alpha: 0.6 });
    d.ellipse(cx, cy + 4, 15, 15, { fill: P.core, w: 2.4 });
    d.ellipse(cx, cy + 4, 6, 6, { fill: P.soot, w: 1.6 });
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; H.ironBolt(d, cx + Math.cos(a) * 30, cy + 4 + Math.sin(a) * 27, 2.6); }
    H.ironStencil(d, 'PIN', cx, cy + 34, 10, {});
  }, { seed: 5520, ox: 50, oy: 4 });
  return key;
};
// a chest lock: a big padlock on the chest plates, its shackle through a hasp on the ledge
IRON_ART.padlock = (s) => {
  const key = 'iron:padlock:' + s;
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 120, 140, d => {
    const P = IRON_P, H = IRON_ART.helpers, cx = 60, by = 134;
    // the hasp plate on the ledge
    d.shape([[cx - 46, by - 8], [cx + 46, by - 8], [cx + 50, by], [cx - 50, by]], { fill: P.soot, w: 2, corner: 30 });
    d.rivets(cx - 38, by - 4, cx + 38, by - 4, 5, { r: 1.6 });
    // the shackle: a thick U (popped open and twisted when broken)
    const up = s === 2 ? 18 : 0, sh = [];
    for (let i = 0; i <= 16; i++) { const a = Math.PI + i / 16 * Math.PI; sh.push([cx + Math.cos(a) * 28 + (s === 2 ? i * 0.8 : 0), 52 - up + Math.sin(a) * 34]); }
    d.stroke([[cx - 28, 70], ...sh, [cx + 28 + (s === 2 ? 12 : 0), 70 - (s === 2 ? 24 : 0)]], { w: 9, curve: true, sh: 0.4 });
    d.stroke(sh.slice(2, 9).map(([x, y]) => [x - 2, y - 2]), { w: 2, col: '#fbf3df', layer: 'white', alpha: 0.8, sh: 0, curve: true });
    // the body: heavy, rounded, riveted, a keyhole; dented when hit
    const body = [[cx - 44, 64], [cx + 44, 64], [cx + 48, 80], [cx + 46, by - 14], [cx + 36, by - 6], [cx - 36, by - 6], [cx - 46, by - 14], [cx - 48, 80]];
    if (s >= 1) body.splice(2, 0, [cx + 22, 70]);
    d.solid(body, { kind: 'dusk', curve: true });
    H.ironPlate(d, body, { fill: s === 2 ? P.rust : P.ironLight, fillAlpha: 0.9, tone: (x, y) => 0.2 + (x - cx + 44) / 160 + (y - 64) / 200, hatchA: 70, gap: 2.4, cross: s >= 1, crossTone: x => (x - cx) / 60, rustPatches: s + 1, w: 3.2, curve: true, scratch: 4 });
    d.rivets(cx - 36, 74, cx + 36, 74, 6, { r: 2 }); d.rivets(cx - 36, by - 16, cx + 36, by - 16, 6, { r: 2 });
    d.spot([[cx - 6, 92], [cx + 6, 92], [cx + 7, 100], [cx + 3, 104], [cx + 4, 116], [cx - 4, 116], [cx - 3, 104], [cx - 7, 100]], {});
    d.ellipse(cx, 98, 14, 14, { w: 2, ink: true });
    if (s === 2) { d.stroke([[cx - 30, 80], [cx - 10, 96], [cx - 20, 112], [cx + 4, 124]], { w: 2.6, sh: 0 }); d.stroke([[cx + 30, 76], [cx + 16, 92]], { w: 2, sh: 0 }); }
  }, { seed: 5530 + s, ox: 60, oy: 134 });
  return key;
};
// the chest ledge: a deck of chequer plate with a riveted face down to the bottom of the page
IRON_ART.chestLedge = (k) => {
  const key = 'iron:chestledge:' + k;
  if (SKETCH.has(key)) return key;
  const w = k === 0 ? 940 : 940;
  SKETCH.sheet(key, w + 12, 96, d => {
    const P = IRON_P, H = IRON_ART.helpers, x0 = 6, x1 = w + 6, top = 4;
    const face = [[x0, top + 8], [x1, top + 8], [x1, 94], [x0, 94]];
    d.solid(face, { kind: 'dusk' });
    for (let i = 0; i < 6; i++) {
      const a = x0 + i * w / 6, b = a + w / 6;
      H.ironPlate(d, [[a, top + 10], [b, top + 10], [b, 94], [a, 94]], { fill: (i + k) % 2 ? P.iron : P.ironLight, fillAlpha: 0.9, shadeAlpha: 0.2, rivetEdges: [0, 1, 3], spacing: 14, inset: 5, r: 1.6, tone: (x, y) => 0.35 + (y - top) / 100, hatchA: 70, gap: 2.6, rustPatches: d.r() < 0.5 ? 1 : 0, scratch: 2 });
    }
    const deck = [[x0 - 2, top], [x1 + 2, top], [x1, top + 10], [x0, top + 10]];
    d.solid(deck, { kind: 'dusk' });
    d.shape(deck, { fill: P.dust, w: 2, corner: 20 });
    for (let x = x0 + 6; x < x1 - 4; x += 12) d.stroke([[x, top + 3], [x + 5, top + 7]], { w: 0.8, sh: 0, alpha: 0.6, bend: 0 });
    d.stroke([[x0, top + 10], [x1, top + 10]], { w: 3, sh: 0.5 });
    d.stroke([[x0 + 8, top + 1], [x1 - 8, top + 1]], { w: 1.2, col: '#fbf3df', alpha: 0.7, layer: 'white', sh: 0, brk: 1.4 });
    H.ironStencil(d, k === 0 ? 'PORT' : 'STARBOARD', x0 + w / 2, top + 54, 20, {});
  }, { seed: 5540 + k, ox: 6, oy: 4 });
  return key;
};
// the sternum plate on its pillar (the breastbone): the deck the third lock sits on
IRON_ART.sternum = () => {
  const key = 'iron:sternum';
  if (SKETCH.has(key)) return key;
  const w = IRONFIST.plate[1] - IRONFIST.plate[0];
  SKETCH.sheet(key, w + 20, 214, d => {
    const P = IRON_P, H = IRON_ART.helpers, x0 = 10, x1 = w + 10, top = 4, pa = IRONFIST.pillar[0] - IRONFIST.plate[0] + 10, pb = IRONFIST.pillar[1] - IRONFIST.plate[0] + 10;
    // the pillar: a keel of plates down to the ledge
    const pil = [[pa, top + 18], [pb, top + 18], [pb + 6, 212], [pa - 6, 212]];
    d.solid(pil, { kind: 'dusk' });
    H.ironPlate(d, pil, { fill: P.soot, fillAlpha: 0.9, rivetEdges: [1, 3], spacing: 12, inset: 5, r: 1.6, tone: x => 0.4 + (x - pa) / 60, hatchA: 90, gap: 2, rustPatches: 1, leave: 0 });
    // brackets out under the plate
    for (const s of [-1, 1]) { const bx = s < 0 ? pa : pb, q = [[bx, top + 20], [bx + s * 90, top + 20], [bx, top + 100]]; d.solid(q, { kind: 'dusk' }); d.shape(q, { fill: P.iron, w: 2, corner: 30, hatch: { a: 70, gap: 2.2, w: 0.5, tone: () => 0.7 } }); }
    // the plate: a thick riveted slab with a lit top
    const slab = [[x0, top + 4], [x1, top + 4], [x1 - 6, top + 22], [x0 + 6, top + 22]];
    d.solid(slab, { kind: 'dusk' });
    H.ironPlate(d, slab, { fill: P.ironLight, fillAlpha: 0.9, rivetEdges: [0, 2], spacing: 14, inset: 4, r: 1.6, tone: (x, y) => 0.3 + (y - top) / 24, hatchA: 0, gap: 2.2, rustPatches: 1, leave: 0 });
    d.shape([[x0 - 2, top], [x1 + 2, top], [x1, top + 5], [x0, top + 5]], { fill: P.dust, w: 1.8, corner: 20 });
    d.stroke([[x0 + 6, top + 1], [x1 - 6, top + 1]], { w: 1.2, col: '#fbf3df', alpha: 0.7, layer: 'white', sh: 0, brk: 1.4 });
    // the closed hatch outline in the middle of the plate (it falls open after the third lock)
    const hm = (x0 + x1) / 2;
    d.stroke([[hm - 54, top + 2], [hm - 54, top + 20]], { w: 1.4, sh: 0 }); d.stroke([[hm + 54, top + 2], [hm + 54, top + 20]], { w: 1.4, sh: 0 });
    H.ironStencil(d, 'HATCH', hm, top + 17, 10, {});
  }, { seed: 5550, ox: 10, oy: 4 });
  return key;
};
// a tin wind-up mouse: a round body on little wheels, a big key on its back, a curly tail
IRON_ART.windMouse = (f) => {
  const key = 'iron:windmouse:' + f;
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 44, 34, d => {
    const P = IRON_P, by = 30;
    const body = [[6, by - 4], [10, by - 14], [22, by - 18], [32, by - 14], [38, by - 6], [36, by - 3]];
    d.shape(body, { fill: P.greyBlue, w: 1.8, corner: 30, curve: true, hatch: { a: 45, gap: 1.8, w: 0.5, tone: (x, y) => (y - by + 18) / 18 } });
    d.stroke([[10, by - 13], [22, by - 16], [30, by - 13]], { w: 1, col: '#fbf3df', layer: 'white', alpha: 0.8, sh: 0, curve: true });
    d.ellipse(32, by - 15, 4, 4, { fill: P.dust, w: 1.2 }); d.spot(SKETCH.ell(35, by - 10, 1.2, 1.2, 6), {});
    d.stroke([[38, by - 6], [42, by - 7]], { w: 0.8, sh: 0 });
    // the key: turns between frames
    const kx = 18, ky = by - 18, a = f ? 0.5 : -0.5;
    d.stroke([[kx, ky], [kx + Math.sin(a) * 4, ky - 6]], { w: 1.6, sh: 0 });
    d.shape([[kx + Math.sin(a) * 4 - 6, ky - 10], [kx + Math.sin(a) * 4, ky - 6], [kx + Math.sin(a) * 4 + 6, ky - 10], [kx + Math.sin(a) * 4, ky - 13]], { fill: P.core, w: 1.2, corner: 20 });
    d.stroke([[6, by - 5], [2, by - 8 - f * 2], [4, by - 12]], { w: 1, curve: true, sh: 0 });
    for (const x of [12, 30]) d.shape(SKETCH.ell(x, by - 2, 2.5, 2.5, 8), { fill: P.soot, w: 1 });
  }, { seed: 5560 + f, ox: 22, oy: 30 });
  return key;
};
// the chest hatch fallen open: a dark way in, the boiler's glow rising out of it, the lid hanging down
IRON_ART.chestHatch = () => {
  const key = 'iron:chesthatch';
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 140, 120, d => {
    const P = IRON_P, cx = 70, top = 10;
    const hole = [[cx - 54, top], [cx + 54, top], [cx + 50, top + 14], [cx - 50, top + 14]];
    d.solid(hole, { kind: 'dark' });
    d.shape(hole, { fill: '#2a2320', w: 2.4, corner: 30 });
    d.wash([[cx - 44, top + 2], [cx + 44, top + 2], [cx + 30, top + 12], [cx - 30, top + 12]], P.ember, { alpha: 0.6, off: 0, spread: 1.4 });
    // the lid, swung down on its hinge on the left, hanging below the plate
    const lid = [[cx - 54, top + 14], [cx - 44, top + 16], [cx - 40, top + 104], [cx - 52, top + 102]];
    d.solid(lid, { kind: 'dusk' });
    d.shape(lid, { fill: P.iron, w: 2.2, corner: 30, hatch: { a: 90, gap: 2, w: 0.5, tone: () => 0.6 } });
    d.rivets(cx - 47, top + 26, cx - 46, top + 94, 5, { r: 1.4 });
    // the glow rising
    for (let i = 0; i < 3; i++) d.stroke([[cx - 20 + i * 20, top - 2], [cx - 22 + i * 20, top - 14]], { w: 1.2, col: P.coreHot, sh: 0, alpha: 0.8 });
  }, { seed: 5570, ox: 70, oy: 10 });
  return key;
};
