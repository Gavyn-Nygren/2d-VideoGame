/* Pip & Bo - World 40 Colossus March: inside the boiler (Part 4), chalk on charcoal paper. */
'use strict';

/* Inside the Colossus the page turns to dark charcoal paper and the line to chalk (d.dark: the ink colour is chalk,
   hatching marks LIGHT, and the dark paper is the shadow). The furnace glow is the only warm colour apart from the
   heroes. Sheets (made on first use, three boil versions):
     IRON_ART.boilerWall(chunk)  'iron:boiler:wall:<n>'   the riveted shell, pipes, gauges, chains, ladder (flat)
     IRON_ART.boilerFloor()      'iron:boiler:floor'      the catwalk grating (top y 450) and the dark under it (flat)
     IRON_ART.furnace()          'iron:furnace'           the furnace front with its open door (anchor: door centre)
     IRON_ART.porthole(world)    'iron:porthole:<world>'  a brass porthole with the outside world on cream paper:
                                                          'hollow' (Spooky Hollow, World 13) or 'candy' (World 16)
     IRON_ART.valve()            'iron:valve'             a valve wheel (anchor: its hub; blit with rot to turn it)
     IRON_ART.valveStand()       'iron:valvestand'        its pipe stand with the pressure dial housing (anchor: foot)
     IRON_ART.nozzle()           'iron:nozzle'            a steam jet nozzle on the ceiling pipe (anchor: its mouth)
   Live: IRON_ART.steam(d, x, y0, y1, k, t) a jet column; IRON_ART.flames(g, x, y, r, t) the fire in the door;
   IRON_ART.dial(g, x, y, r, k) the pressure dial (k 0..1, red from 0.75). */

IRON_ART.boilerWall = (chunk = 0) => {
  const key = 'iron:boiler:wall:' + chunk;
  if (!SKETCH.has(key)) SKETCH.sheet(key, 960, 540, d => {
    const P = IRON_P, H = IRON_ART.helpers;
    // the shell: tall curved plates (seams bow outward like the inside of a barrel), lit from the furnace (right)
    const cols = [-30, 110, 260, 420, 590, 760, 910, 1000];
    for (let i = 0; i < cols.length - 1; i++) {
      const xa = cols[i], xb = cols[i + 1];
      const o1 = (i % 3) * 34 - 30, o2 = ((i + 1) % 3) * 30 - 20;
      for (const [ya, yb] of [[-10, 150 + o1], [150 + o1, 300 + o2], [300 + o2, 452]]) {
        const bow = 14;
        const pts = [[xa, ya], [(xa + xb) / 2, ya - bow * 0.4], [xb, ya], [xb + 3, (ya + yb) / 2], [xb, yb], [(xa + xb) / 2, yb + bow * 0.4], [xa, yb], [xa - 3, (ya + yb) / 2]];
        d.wash(pts, i % 2 ? '#3e3632' : '#463c35', { alpha: 0.55, off: 1.5, spread: 1.3, blooms: 1 });
        // chalk hatching where the light falls (the upper part of each plate), paper left dark below
        d.hatch(pts, { a: 62 + i * 3, gap: 3.4, w: 0.6, alpha: 0.42, tone: (x, y) => 0.95 - (y - ya) / (yb - ya) * 1.2 + (x - xa) / (xb - xa) * 0.2 });
        d.outline(pts, { w: 1.5, corner: 40, alpha: 0.75, c: [(xa + xb) / 2, (ya + yb) / 2] });
        d.rivets(xa + 8, ya + 8, xb - 8, ya + 8, Math.round((xb - xa) / 17), { r: 1.7, rust: 0.25 });
        if (d.r() < 0.5) ironScratches(d, xa + (xb - xa) * 0.5, (ya + yb) / 2, 3);
        // a rib down the middle of the plate (the barrel's curve), and now and then a hatch, a patch or a number
        const mx = (xa + xb) / 2 + (d.r() - 0.5) * 30;
        d.stroke([[mx, ya + 14], [mx + 3, (ya + yb) / 2], [mx, yb - 14]], { w: 0.9, curve: true, alpha: 0.5, sh: 0 });
        const roll = d.r();
        if (roll < 0.18 && yb - ya > 110) {
          const hx = xa + 24 + d.r() * (xb - xa - 80), hy = ya + 30 + d.r() * (yb - ya - 80);
          const hd = [[hx, hy], [hx + 34, hy], [hx + 34, hy + 40], [hx, hy + 40]];
          d.shape(hd, { fill: '#2c2623', w: 1.4, corner: 30, hatch: { a: 80, gap: 2.2, w: 0.5, alpha: 0.6, tone: x => 1 - (x - hx) / 34 } });
          d.rivets(hx + 4, hy + 4, hx + 30, hy + 4, 3, { r: 1.2 }); d.stroke([[hx + 28, hy + 16], [hx + 30, hy + 24]], { w: 2, sh: 0 });
        } else if (roll < 0.34 && yb - ya > 100) {
          const px = xa + 20 + d.r() * (xb - xa - 70), py = ya + 24 + d.r() * (yb - ya - 70), pw = 40 + d.r() * 20, ph2 = 28 + d.r() * 16;
          const pt = [[px, py], [px + pw, py + 2], [px + pw - 2, py + ph2], [px + 2, py + ph2 - 1]];
          d.wash(pt, '#5c4a40', { alpha: 0.6, off: 1 }); d.outline(pt, { w: 1.2, corner: 30 });
          d.rivets(px + 4, py + 4, px + pw - 4, py + 5, Math.round(pw / 9), { r: 1.1 }); d.rivets(px + 5, py + ph2 - 4, px + pw - 5, py + ph2 - 4, Math.round(pw / 9), { r: 1.1 });
        } else if (roll < 0.46) {
          IRON_ART.helpers.ironStencil(d, String(2 + Math.floor(d.r() * 40)), (xa + xb) / 2 + 16, ya + 30, 15);
        }
      }
    }
    // the ceiling pipe (the jets hang off it) and a second pipe run with flanges and a little valve wheel
    H.ironPipe(d, [[-20, 46], [300, 44], [640, 50], [980, 46]], 11, { flanges: [0.08, 0.31, 0.55, 0.79], col: '#6b7d70', alpha: 0.6 });
    H.ironPipe(d, [[-20, 96], [180, 98], [260, 120], [330, 122], [420, 100], [520, 100]], 6, { flanges: [0.3, 0.75], col: '#7a5a48', alpha: 0.55 });
    // a vertical pipe bundle on the right wall
    for (let k = 0; k < 3; k++) H.ironPipe(d, [[900 + k * 16, -10], [898 + k * 16, 200], [902 + k * 16, 452]], 6, { flanges: [0.2 + k * 0.1, 0.65], col: k === 1 ? '#7a5a48' : '#6b7d70', alpha: 0.5 });
    // gauges on the pipe run
    for (const [gx, gy, r] of [[380, 150, 14], [420, 162, 10]]) {
      d.solid(SKETCH.ell(gx, gy, r, r, 16), { kind: 'dawn' });
      d.ellipse(gx, gy, r, r, { w: 1.8, col: S_INKDARK() });
      d.ellipse(gx, gy, r + 3, r + 3, { w: 1.5 });
      for (let k = 0; k < 7; k++) { const a = Math.PI * (0.8 + k * 0.233); d.line(gx + Math.cos(a) * r * 0.7, gy + Math.sin(a) * r * 0.7, gx + Math.cos(a) * r * 0.9, gy + Math.sin(a) * r * 0.9, { w: 0.7, col: S_INKDARK(), ov: 0 }); }
      d.line(gx, gy, gx + Math.cos(-0.6) * r * 0.75, gy + Math.sin(-0.6) * r * 0.75, { w: 1.3, col: P.rust, ov: 0 });
      d.line(gx, gy - r - 3, gx, 124, { w: 1.6 });
    }
    // hanging chains with hooks
    for (const cx of [470, 820]) {
      H.ironChain(d, [[cx, 56], [cx + 1, 130], [cx - 1, 200]], { link: 11, w: 1.3 });
      if (true) { d.stroke([[cx, 200], [cx, 210], [cx + 6, 218], [cx + 10, 212]], { w: 2, curve: true }); continue; }
      // a caged lamp: a warm bulb behind wire bars, with a little pool of light hatched round it
      const ly = 226;
      for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2, r0 = 22, r1 = r0 + 6 + d.r() * 18; d.stroke([[cx + Math.cos(a) * r0, ly + Math.sin(a) * r0], [cx + Math.cos(a) * r1, ly + Math.sin(a) * r1]], { w: 0.6, col: '#f3d9a0', alpha: 0.45, sh: 0, p: [1, 0.6, 0.05] }); }
      d.wash(SKETCH.ell(cx, ly, 14, 17, 14), IRON_P.core, { alpha: 0.9, off: 0, op: 'source-over', layer: 'white' });
      d.wash(SKETCH.ell(cx - 2, ly - 3, 6, 8, 10), IRON_P.coreHot, { alpha: 1, off: 0, op: 'source-over', layer: 'white' });
      d.stroke([[cx - 9, 204], [cx + 9, 204]], { w: 3 });
      for (const bx of [-14, -6, 4, 12]) d.stroke([[cx + bx * 0.6, 204], [cx + bx, ly], [cx + bx * 0.5, ly + 22]], { w: 1.2, curve: true });
      d.stroke(SKETCH.ell(cx, ly, 15, 6, 14, 0, 0, Math.PI), { w: 1.1, curve: true });
      d.stroke([[cx - 6, ly + 22], [cx + 6, ly + 22]], { w: 2.2 });
    }
    // a ladder up the right wall to a high hatch, and the hatch
    H.ironLadder(d, 856, 150, 452, 18, { step: 13 });
    d.shape([[846, 108], [884, 108], [884, 150], [846, 150]], { fill: '#2c2623', w: 1.8, corner: 30 });
    d.rivets(850, 112, 880, 112, 3, { r: 1.3 }); H.ironStencil(d, '4', 865, 132, 14);
    // a stencilled warning and a coal chute mouth at the top right
    H.ironStencil(d, 'MIND THE STEAM', 300, 250, 13, { rot: -0.01 });
    d.shape([[700, -10], [780, -10], [772, 34], [708, 34]], { fill: '#2a2421', w: 2, corner: 30, hatch: { a: 80, gap: 2.4, w: 0.55, alpha: 0.5, tone: x => 1 - (x - 700) / 80 } });
    d.spot([[712, 30], [768, 30], [762, 40], [718, 40]], { spread: 0.3, col: '#151210' });
    // a far crow's-nest of soot cobwebs in a corner (a little life)
    d.stroke([[0, 160], [30, 140], [60, 150]], { w: 0.5, curve: true, alpha: 0.5 }); d.stroke([[0, 175], [24, 150], [44, 132]], { w: 0.5, curve: true, alpha: 0.5 });
  }, { flat: true, paper: 'dark', seed: 7100 + chunk });
  return key;
};
const S_INKDARK = () => SKETCH.INK;

IRON_ART.boilerFloor = () => {
  const key = 'iron:boiler:floor';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 960, 540, d => {
    const gy = IRON_ART.GROUND_Y;
    // the dark under the catwalk
    d.solid([[-10, gy], [970, gy], [970, 545], [-10, 545]], { kind: 'dark' });
    d.wash([[-10, gy + 12], [970, gy + 12], [970, 545], [-10, 545]], '#1d1917', { alpha: 0.75, off: 0, layers: 3 });
    // the grating: a lit top edge, a deck of diagonal chalk lattice that fades into the dark
    const deck = [[-10, gy], [970, gy], [970, gy + 22], [-10, gy + 22]];
    d.wash(deck, '#57504a', { alpha: 0.7, off: 1 });
    d.hatch(deck, { a: 35, gap: 5, w: 0.8, alpha: 0.7, cross: true, crossA: 70, crossGap: 5, crossTone: () => 1, tone: () => 1 });
    d.stroke([[-10, gy + 0.5], [480, gy - 0.5], [970, gy + 0.5]], { w: 2.6, curve: true, sh: 0 });
    d.stroke([[-10, gy + 22], [480, gy + 23], [970, gy + 22]], { w: 1.6, curve: true, sh: 0 });
    // girders under it, and pipes in the dark
    for (let x = 40; x < 960; x += 160) {
      d.shape([[x, gy + 22], [x + 14, gy + 22], [x + 14, 545], [x, 545]], { fill: '#3a332f', w: 1.3, corner: 30, hatch: { a: 90, gap: 2.4, w: 0.5, alpha: 0.5, tone: xx => 1 - (xx - x) / 14 } });
      d.rivets(x + 7, gy + 34, x + 7, 530, 6, { r: 1.4 });
      d.line(x + 14, gy + 26, x + 74, gy + 70, { w: 1.4 }); d.line(x, gy + 26, x - 60, gy + 70, { w: 1.2 });
    }
    IRON_ART.helpers.ironPipe(d, [[-20, 512], [400, 506], [980, 514]], 9, { flanges: [0.2, 0.5, 0.8], col: '#6b7d70', alpha: 0.35 });
    // bolts along the deck edge
    for (let x = 12; x < 960; x += 40) d.rivet(x, gy + 11, 1.6);
  }, { flat: true, paper: 'dark', seed: 7300 });
  return key;
};

IRON_ART.furnace = () => {
  const key = 'iron:furnace';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 360, 360, d => {
    const P = IRON_P, cx = 180, cy = 170, R = 150;
    // the furnace face: a big round riveted plate on a square frame, the door hanging open
    const face = SKETCH.ell(cx, cy, R, R * 0.96, 48);
    // two squat feet bolt the furnace to the floor
    for (const sx of [-1, 1]) {
      const b = [[cx + sx * 70, cy + 132], [cx + sx * 104, cy + 140], [cx + sx * 112, cy + 186], [cx + sx * 60, cy + 186]];
      d.solid(b, { kind: 'dark' }); d.shape(b, { fill: '#3a322d', w: 2, corner: 30, hatch: { a: 70, gap: 2.4, w: 0.55, alpha: 0.5, tone: (x, y) => 1 - (y - cy - 132) / 50 } });
      d.rivet(cx + sx * 86, cy + 176, 2.2);
    }
    d.solid(face, { kind: 'dark', curve: true });
    d.wash(face, '#5a4038', { alpha: 0.65, off: 2, blooms: 2 });
    // warm light on the face round the door: chalk hatching radiating out, plus an ember glaze (no gradient)
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2 + d.r() * 0.05, r0 = 96 + d.r() * 8, r1 = r0 + 10 + d.r() * 34 * (0.5 + 0.5 * Math.sin(a * 3 + 1));
      d.stroke([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]], { w: 0.8, sh: 0, p: [1, 0.7, 0.05], alpha: 0.6, col: '#f3d9a0' });
    }
    d.wash(SKETCH.ell(cx, cy, 124, 120, 30), P.ember, { alpha: 0.14, off: 0, spread: 2.4, edge: false, layers: 4 });
    d.outline(face, { curve: true, w: 2.6, c: [cx, cy] });
    for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; d.rivet(cx + Math.cos(a) * (R - 12), cy + Math.sin(a) * (R - 12) * 0.96, 2.6); }
    // the door opening: a black ring with the fire inside (the flames themselves are live)
    const mouth = SKETCH.ell(cx, cy, 88, 84, 36);
    d.spot(mouth, { curve: true, col: '#130f0d' });
    // the firebox glow, laid over the black (top layer): ember, then core yellow, then the hot heart
    d.wash(SKETCH.ell(cx, cy + 12, 80, 70, 30), '#b4471c', { alpha: 0.9, off: 0, op: 'source-over', spread: 1.6, layer: 'white', layers: 4 });
    d.wash(SKETCH.ell(cx, cy + 20, 62, 50, 24), P.ember, { alpha: 0.95, off: 0, op: 'source-over', spread: 1.6, layer: 'white', layers: 4 });
    d.wash(SKETCH.ell(cx, cy + 30, 40, 28, 18), P.core, { alpha: 0.95, off: 0, op: 'source-over', layer: 'white', spread: 1.4 });
    d.wash(SKETCH.ell(cx, cy + 36, 20, 12, 14), P.coreHot, { alpha: 1, off: 0, op: 'source-over', layer: 'white' });
    // the grate bars across the bottom of the fire, and coals
    for (let k = -3; k <= 3; k++) d.line(cx + k * 20 - 4, cy + 50, cx + k * 20 + 4, cy + 80, { w: 3, col: '#151210', layer: 'white' });
    d.line(cx - 76, cy + 50, cx + 76, cy + 50, { w: 3.4, col: '#151210', layer: 'white' });
    for (let k = 0; k < 14; k++) { const x = cx - 60 + d.r() * 120, y = cy + 56 + d.r() * 14, s = 5 + d.r() * 5; d.spot([[x - s, y], [x - s * 0.3, y - s * 0.7], [x + s * 0.8, y - s * 0.4], [x + s, y + s * 0.4], [x, y + s * 0.6]], { col: '#2a1610', alpha: 0.9, layer: 'white' }); d.stroke([[x - s * 0.6, y - s * 0.3], [x + s * 0.5, y - s * 0.4]], { w: 1.2, col: '#ffcf6a', layer: 'white', sh: 0 }); }
    d.outline(mouth, { curve: true, w: 3, c: [cx, cy] });
    d.stroke(SKETCH.ell(cx, cy, 96, 92, 36, 0, 0.2, Math.PI * 2 - 0.4), { w: 1.6, curve: true, c: [cx, cy] });
    // the open door: a heavy round lid swung out toward us on its left hinges, seen as a tall ellipse
    const dcx = cx - 104, dcy = cy + 4;
    const door = SKETCH.ell(dcx, dcy, 30, 90, 30);
    d.solid(door, { kind: 'dark', curve: true });
    d.shape(door, { fill: '#5a463c', w: 2.6, curve: true });
    d.arcHatch(door, dcx - 6, dcy - 10, { r0: 20, r1: 96, n: 12, mid: 0.6, span: 2.2, sq: 1, w: 0.6, alpha: 0.7 });
    // its rim catches the fire light on the inside edge
    d.stroke(SKETCH.ell(dcx, dcy, 30, 90, 24, 0, -1.3, 1.3), { w: 2.6, col: '#f2b25a', curve: true, sh: 0, layer: 'white', alpha: 0.85 });
    d.stroke(SKETCH.ell(dcx, dcy, 22, 74, 24, 0, 0, 6.2), { w: 1.2, curve: true });
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; d.rivet(dcx + Math.cos(a) * 26, dcy + Math.sin(a) * 82, 1.9); }
    // a latch handle and the two hinge straps reaching back to the frame
    d.stroke([[dcx - 10, dcy - 6], [dcx - 18, dcy - 4], [dcx - 18, dcy + 12], [dcx - 10, dcy + 14]], { w: 2.6, curve: true });
    for (const hy of [dcy - 58, dcy + 58]) { const st = [[dcx + 8, hy - 6], [cx - 84, hy - 5], [cx - 84, hy + 5], [dcx + 8, hy + 6]]; d.solid(st, { kind: 'dark' }); d.shape(st, { fill: '#2a2421', w: 1.5, corner: 30 }); d.rivet(cx - 90, hy, 2.4); }
    // radial seams and a brass maker's plate on the face
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + 0.4; d.stroke([[cx + Math.cos(a) * 100, cy + Math.sin(a) * 96], [cx + Math.cos(a) * (R - 22), cy + Math.sin(a) * (R - 22) * 0.96]], { w: 1.2, sh: 0 }); }
    const plateB = [[cx + 40, cy - 128], [cx + 96, cy - 132], [cx + 98, cy - 110], [cx + 42, cy - 106]];
    d.solid(plateB, { kind: 'dark' }); d.shape(plateB, { fill: IRON_P.ochre, w: 1.4, corner: 30 });
    d.word('NO 1', cx + 69, cy - 119, 9, { align: 'center', col: SKETCH.INK, w: 1.3, rot: -0.08 });
    // heat scorch: soot hatching up the face above the mouth
    d.hatch([[cx - 70, cy - 96], [cx + 70, cy - 96], [cx + 50, cy - 140], [cx - 40, cy - 146]], { a: 88, gap: 2, w: 0.6, alpha: 0.5, col: '#120e0c', tone: (x, y) => 1 - (cy - 96 - y) / 50 });
    // stencil over the door
  }, { ox: 180, oy: 170, paper: 'dark', seed: 7400 });
  return key;
};

IRON_ART.porthole = (world = 'hollow') => {
  const key = 'iron:porthole:' + world;
  if (!SKETCH.has(key)) SKETCH.sheet(key, 150, 150, d => {
    const P = IRON_P, c = 75, r = 52;
    // the outside on cream paper: Spooky Hollow at dusk sliding by
    const glass = SKETCH.ell(c, c, r, r, 36);
    d.solid(glass, { kind: 'dawn' });
    const ink = SKETCH.INK;
    d.washIn(glass, () => {
      d.wash(SKETCH.box(c - r - 6, c - r - 6, r * 2 + 12, r * 1.1 + 6), P.greyBlue, { alpha: 0.55, off: 0, spread: 1.4, edge: false });
      d.wash(SKETCH.box(c - r - 6, c - 10, r * 2 + 12, 20), P.ochre, { alpha: 0.4, off: 0, spread: 1.6, edge: false });
    });
    // the moon left as paper, a crooked tree, a fence, a far house with a lit window, two muted pumpkins
    d.lift(SKETCH.ell(c + 22, c - 26, 9, 9, 12), 1);
    d.stroke(SKETCH.ell(c + 22, c - 26, 9, 9, 14, 0, -0.4, 5.6), { w: 0.8, curve: true, col: ink });
    const hill = [[c - r, c + 14], [c - 20, c + 6], [c + 10, c + 10], [c + r, c + 2], [c + r, c + r], [c - r, c + r]];
    d.washIn(glass, () => d.wash(hill, '#4d5a50', { alpha: 0.75, off: 0.5 })); d.stroke(hill.slice(0, 4), { w: 1, curve: true, col: ink });
    d.stroke([[c - 24, c + 8], [c - 26, c - 14], [c - 20, c - 30], [c - 28, c - 40]], { w: 2.2, curve: true, col: ink, p: [1, 0.8, 0.1] });
    d.stroke([[c - 25, c - 18], [c - 36, c - 26], [c - 42, c - 24]], { w: 1.2, curve: true, col: ink });
    d.stroke([[c - 22, c - 26], [c - 12, c - 34], [c - 8, c - 42]], { w: 1.1, curve: true, col: ink });
    for (let k = 0; k < 6; k++) d.line(c - 4 + k * 7, c + 4 - k * 0.6, c - 4 + k * 7, c - 6 - k * 0.6, { w: 0.9, col: ink, ov: 0.5 });
    d.line(c - 6, c - 2, c + 36, c - 6, { w: 0.8, col: ink });
    d.shape([[c + 30, c - 2], [c + 30, c - 14], [c + 36, c - 22], [c + 42, c - 14], [c + 42, c - 2]], { w: 1, col: ink, fill: '#2d2a33', corner: 30 });
    d.wash(SKETCH.box(c + 34, c - 12, 3.5, 4), P.core, { alpha: 0.95, off: 0, layers: 1 });
    for (const [px, py] of [[c - 34, c + 22], [c - 18, c + 26]]) { d.wash(SKETCH.ell(px, py, 6, 4.5, 10), '#c58a3e', { alpha: 0.85, off: 0.4 }); d.stroke(SKETCH.ell(px, py, 6, 4.5, 12, 0, 0, 5.8), { w: 0.9, curve: true, col: ink }); d.stroke([[px, py - 4], [px + 1, py - 7]], { w: 1, col: ink }); }
    // a glare streak across the glass (chalk) and the brass rim with bolts
    d.stroke([[c - 30, c - 30], [c - 10, c - 44]], { w: 3, col: '#fffaf0', alpha: 0.6, layer: 'white', sh: 0 });
    d.stroke([[c - 36, c - 18], [c - 26, c - 26]], { w: 1.6, col: '#fffaf0', alpha: 0.5, layer: 'white', sh: 0 });
    const rim = SKETCH.ring(c, c, r + 13, r, 40);
    d.solid(rim, { kind: 'dark' });
    d.wash(rim, P.ochreDeep, { alpha: 0.7, off: 0.8 });
    d.hatch(rim, { a: 50, gap: 2.2, w: 0.55, alpha: 0.5, tone: (x, y) => 1 - ((x - c) * 0.6 + (y - c) * 0.8) / r });
    d.stroke(SKETCH.ell(c, c, r + 13, r + 13, 40, 0, 0, 6.2), { w: 2.4, curve: true, c: [c, c] });
    d.stroke(SKETCH.ell(c, c, r, r, 40, 0, 0.3, 6.4), { w: 1.8, curve: true, c: [c, c] });
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + 0.3; IRON_ART.helpers.ironBolt(d, c + Math.cos(a) * (r + 6.5), c + Math.sin(a) * (r + 6.5), 2.6, { col: P.ochre }); }
  }, { ox: 75, oy: 75, paper: 'dark', seed: 7500 });
  return key;
};

IRON_ART.valve = () => {
  const key = 'iron:valve';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 70, 70, d => {
    const c = 35, r = 25;
    const ring = SKETCH.ring(c, c, r, r - 5, 30);
    d.solid(ring, { kind: 'dark' });
    d.wash(ring, IRON_P.rust, { alpha: 0.85, off: 0.8 });
    d.hatch(ring, { a: 40, gap: 1.8, w: 0.5, alpha: 0.7, tone: (x, y) => 1 - ((x - c) + (y - c)) / r });
    d.stroke(SKETCH.ell(c, c, r, r, 30, 0, 0, 6.2), { w: 2.2, curve: true, c: [c, c] });
    d.stroke(SKETCH.ell(c, c, r - 5, r - 5, 26, 0, 0.5, 6.6), { w: 1.3, curve: true, c: [c, c] });
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; d.shape([[c + Math.cos(a - 0.12) * 5, c + Math.sin(a - 0.12) * 5], [c + Math.cos(a - 0.05) * (r - 4), c + Math.sin(a - 0.05) * (r - 4)], [c + Math.cos(a + 0.05) * (r - 4), c + Math.sin(a + 0.05) * (r - 4)], [c + Math.cos(a + 0.12) * 5, c + Math.sin(a + 0.12) * 5]], { fill: IRON_P.rust, w: 1.1, corner: 30 }); }
    d.ellipse(c, c, 6.5, 6.5, { fill: IRON_P.ironLight, w: 1.6 });
    // knobs round the rim to grip
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + 0.26; d.rivet(c + Math.cos(a) * (r - 2.5), c + Math.sin(a) * (r - 2.5), 1.4); }
  }, { ox: 35, oy: 35, paper: 'dark', seed: 7600 });
  return key;
};
IRON_ART.valveStand = () => {
  const key = 'iron:valvestand';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 120, 130, d => {
    // a pipe up from the floor to the wheel's hub (at 30, 30 above the foot at 30, 120), with a dial box beside it
    IRON_ART.helpers.ironPipe(d, [[30, 128], [30, 80], [30, 34]], 6, { flanges: [0.1, 0.7], col: '#6b7d70', alpha: 0.8 });
    d.solid([[20, 112], [40, 112], [44, 128], [16, 128]]);
    d.shape([[20, 112], [40, 112], [44, 128], [16, 128]], { fill: '#3a322d', w: 1.6, corner: 30 });
    // the dial's housing (its face is live) and the pipe to it
    IRON_ART.helpers.ironPipe(d, [[36, 70], [60, 70], [74, 58]], 3.5, { col: '#7a5a48', alpha: 0.8 });
    const box = SKETCH.ell(84, 46, 25, 25, 30);
    d.solid(box, { kind: 'dark' });
    d.shape(box, { fill: IRON_P.ochreDeep, w: 2.2, curve: true, hatch: { a: 45, gap: 2, w: 0.55, alpha: 0.6, tone: (x, y) => 1 - ((x - 84) + (y - 46)) / 25 } });
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.5; d.rivet(84 + Math.cos(a) * 22, 46 + Math.sin(a) * 22, 1.3); }
  }, { ox: 30, oy: 128, paper: 'dark', seed: 7700 });
  return key;
};
IRON_ART.nozzle = () => {
  const key = 'iron:nozzle';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 60, 70, d => {
    // a drop pipe from the ceiling pipe, a flared nozzle, a little shut-off valve
    const pts = [[22, 0], [38, 0], [38, 44], [46, 62], [14, 62], [22, 44]];
    d.solid(pts, { kind: 'dark' });
    d.shape(pts, { fill: '#6b7d70', w: 1.8, corner: 30, hatch: { a: 85, gap: 1.8, w: 0.5, alpha: 0.6, tone: x => 1 - (x - 14) / 32 } });
    d.spot([[16, 60], [44, 60], [42, 66], [18, 66]], { col: '#120f0d', spread: 0.3 });
    d.stroke([[14, 62], [30, 66], [46, 62]], { w: 1.6, curve: true });
    d.rivets(22, 20, 38, 20, 3, { r: 1.2 });
  }, { ox: 30, oy: 64, paper: 'dark', seed: 7800 });
  return key;
};

// a column of steam from a nozzle at (x, y0) down to the floor y1: chalk-outlined puffs with a grey glaze, rolling
IRON_ART.steam = (d, x, y0, y1, k, t) => {
  if (k <= 0) return;
  const n = Math.round(4 + (y1 - y0) / 26);
  for (let i = 0; i < n; i++) {
    const f = ((i / n + t * 1.6) % 1), y = y0 + 6 + f * (y1 - y0 - 6), r = (8 + f * 22) * (0.6 + 0.4 * k);
    const wob = Math.sin(t * 9 + i * 1.7) * 3 * f;
    d.cloud(x + wob, y, r, { fill: '#9a948a', fillAlpha: 0.35, puffs: 5 + (i % 3), w: 1.3, curls: i % 2, col: '#efe8d8', alpha: 0.85 * (1 - f * 0.5), seed: 9000 + i * 13 + Math.floor(t * 8) % 3 });
  }
  // the hiss: speed lines down the column
  d.speed(x, y0 + 10, 0, (y1 - y0) * 0.6, 5, { spread: 26, w: 1, col: '#efe8d8', alpha: 0.5 });
};
// the fire in the furnace door: tongues of flame drawn as ink-edged shapes in core yellow and ember (live)
IRON_ART.flames = (g, x, y, r, t) => {
  const d = SKETCH.live(g, 610, SKETCH.boil(t));
  const fill = (pts, col, a) => { g.fillStyle = col; g.globalAlpha = a; g.beginPath(); SKETCH.spline(pts, true, 2.5).forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.fill(); g.globalAlpha = 1; };
  // tongues of flame: S-curved, licking up and leaning with a slow draught; three nested colours each, an ink edge
  const base = y + r * 0.62;
  for (let i = 0; i < 6; i++) {
    const fx = x - r * 0.62 + i * r * 0.25 + Math.sin(i * 7.3) * 4, h = r * (0.75 + 0.3 * Math.sin(t * 5.3 + i * 1.9) + 0.12 * Math.sin(t * 11.7 + i * 3)) * (i === 2 || i === 3 ? 1.2 : 0.85);
    const w2 = r * (0.2 + 0.04 * Math.sin(t * 4 + i)), sway = Math.sin(t * 6.1 + i * 2.2) * w2 * 0.6, lean = Math.sin(t * 1.3) * 4;
    const tongue = s => [[fx - w2 * s, base], [fx - w2 * 0.9 * s + sway * 0.3, base - h * 0.35 * s], [fx - w2 * 0.2 * s - sway * 0.4 + lean * 0.5, base - h * 0.68 * s], [fx + sway + lean, base - h * s], [fx + w2 * 0.35 * s + sway * 0.2 + lean * 0.4, base - h * 0.6 * s], [fx + w2 * 0.85 * s - sway * 0.2, base - h * 0.28 * s], [fx + w2 * s, base]];
    fill(tongue(1), '#d9611f', 0.92); fill(tongue(0.72), IRON_P.core, 0.95); fill(tongue(0.38), IRON_P.coreHot, 1);
    const o = tongue(1);
    d.stroke(o.slice(0, 5), { w: 1.2, curve: true, col: '#5a1e0c', alpha: 0.85, sh: 0, p: [0.6, 1, 0.1] });
    d.stroke(o.slice(3), { w: 0.9, curve: true, col: '#5a1e0c', alpha: 0.7, sh: 0, p: [0.1, 1, 0.6] });
  }
  // a curl of flame breaking off the top, and sparks rising
  const ct = (t * 0.9) % 1, cy2 = base - r * 1.1 - ct * r * 0.5;
  fill(SKETCH.ell(x + Math.sin(t * 3) * 10, cy2, 6 * (1 - ct), 9 * (1 - ct), 10), IRON_P.core, 0.9 * (1 - ct));
  for (let i = 0; i < 8; i++) { const f = (t * 0.8 + i / 8) % 1, sx = x + Math.sin(i * 2.3 + t * 2) * r * 0.7, sy = base - r * 0.4 - f * r * 1.3; g.fillStyle = IRON_P.coreHot; g.globalAlpha = 1 - f; g.fillRect(sx, sy, 2.2, 2.2); }
  g.globalAlpha = 1;
};
// the pressure dial face: cream paper, ticks, a red sector from 0.75, the needle at k (0..1)
IRON_ART.dial = (g, x, y, r, k) => {
  const d = SKETCH.live(g, 620, SKETCH.boil());
  const face = SKETCH.ell(x, y, r, r, 24);
  g.fillStyle = '#efe3c6'; g.beginPath(); face.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.fill();
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, ak = a => a0 + (a1 - a0) * a;
  const red = [[x, y]].concat(SKETCH.ell(x, y, r * 0.86, r * 0.86, 10, 0, ak(0.75), ak(1)));
  g.fillStyle = 'rgba(167,70,42,0.75)'; g.beginPath(); red.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.fill();
  g.fillStyle = '#efe3c6'; g.beginPath(); SKETCH.ell(x, y, r * 0.55, r * 0.55, 16).forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.fill();
  for (let i = 0; i <= 8; i++) { const a = ak(i / 8); d.line(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, { w: i % 4 ? 0.8 : 1.4, col: SKETCH.INK, ov: 0 }); }
  const a = ak(k);
  d.stroke([[x - Math.cos(a) * r * 0.15, y - Math.sin(a) * r * 0.15], [x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82]], { w: 2, col: SKETCH.INK, p: [1, 1, 0.2], sh: 0 });
  d.stroke(SKETCH.ell(x, y, r, r, 20, 0, 0.3, 6.5), { w: 1.6, curve: true, col: SKETCH.INK, c: [x, y] });
  g.fillStyle = SKETCH.INK; g.beginPath(); SKETCH.ell(x, y, 2.4, 2.4, 8).forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.fill();
};
