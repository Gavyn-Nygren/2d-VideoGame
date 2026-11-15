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
IRON_ART.meadow = (l, c = 0) => {
  const key = 'iron:meadow:' + l + ':' + c;
  if (SKETCH.has(key)) return key;
  SKETCH.sheet(key, 960, 540, d => IRON_ART.meadowDraw[l](d, c), { flat: true, seed: 9500 + l * 31 + c * 7, res: l === 0 ? Math.min(SKETCH.res, 1.25) : SKETCH.res });
  return key;
};
IRON_ART.meadowDraw = [];
// layer 0: the dawn sky: glazes from rose at the top to gold at the horizon, the sun rising, long pink-bellied clouds
IRON_ART.meadowDraw[0] = (d, c) => {
  const P = IRON_P;
  const bands = [[0, 120, '#c9a6b8', 0.35], [80, 230, '#e7a98c', 0.38], [190, 330, '#f2c27a', 0.45], [290, 420, '#f6dc8c', 0.5]];
  for (const [y0, y1, col, a] of bands) {
    for (let i = 0; i < 6; i++) {
      const x = -60 + i * 190 + d.r() * 40, w = 260 + d.r() * 80, blob = [];
      for (let k = 0; k <= 10; k++) { const t = k / 10; blob.push([x + w * t, y0 + Math.sin(t * Math.PI * 2 + i) * 10 - Math.sin(t * Math.PI) * 16]); }
      d.wash(blob.concat([[x + w, y1], [x, y1]]), col, { alpha: a, off: 0, spread: 2.2, layers: 2, edge: false, curve: true });
    }
  }
  if (c === 0) {
    const sx = 700, sy = 360;
    for (let i = 0; i < 6; i++) { const rr = 70 + i * 22; d.wash(SKETCH.ell(sx, sy, rr, rr * 0.92, 20, d.r()), i % 2 ? P.core : '#f6b27a', { alpha: 0.13, off: 0, spread: 2.2, edge: false }); }
    d.lift(SKETCH.ell(sx, sy, 50, 48, 18), 1);
    d.wash(SKETCH.ell(sx, sy, 48, 46, 18), P.coreHot, { alpha: 0.6, off: 0, spread: 1.4, edge: false });
    d.stroke(SKETCH.ell(sx, sy, 50, 48, 22, 0, -0.2, 2.5), { w: 1.4, curve: true, alpha: 0.6, p: [0.05, 1, 0.05] });
    for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, r0 = 60 + d.r() * 8, r1 = r0 + 10 + d.r() * (i % 2 ? 14 : 40); d.stroke([[sx + Math.cos(a) * r0, sy + Math.sin(a) * r0], [sx + Math.cos(a) * r1, sy + Math.sin(a) * r1]], { w: i % 2 ? 0.7 : 1.1, alpha: 0.4, sh: 0, p: [1, 0.8, 0.05] }); }
  }
  const clouds = c === 0 ? [[180, 90, 130], [420, 170, 100], [880, 60, 90]] : [[150, 140, 110], [520, 70, 140], [820, 180, 90]];
  for (const [cx, cy, r] of clouds) {
    const pts = []; for (let i = 0; i <= 18; i++) { const t = i / 18; pts.push([cx - r + 2 * r * t, cy - Math.sin(t * Math.PI) * r * 0.24 - Math.abs(Math.sin(t * 9)) * 7]); }
    const under = [[cx + r, cy], [cx + r * 0.3, cy + 6], [cx - r * 0.4, cy + 5], [cx - r, cy]];
    d.wash(pts.concat(under), '#f4eadf', { alpha: 0.55, off: 1.5, spread: 1.4 });
    d.wash(under.concat([[cx - r * 0.6, cy - 6], [cx + r * 0.6, cy - 6]]), '#e79a9a', { alpha: 0.4, off: 0, spread: 1.6, edge: false });
    d.stroke(under, { w: 1.2, curve: true, alpha: 0.5, p: [0.1, 1, 0.1] });
  }
  // birds
  for (let i = 0; i < 4; i++) { const bx = 300 + i * 120 + d.r() * 60, by = 120 + d.r() * 80; d.stroke([[bx - 7, by - 2], [bx, by + 2], [bx + 7, by - 3]], { w: 1.1, curve: true, alpha: 0.7, sh: 0 }); }
};
// layer 1: far hills, blue-green in the morning haze, and old friends standing small on the skyline
IRON_ART.meadowDraw[1] = (d, c) => {
  const P = IRON_P, hill = [];
  for (let x = -20; x <= 980; x += 20) hill.push([x, 380 - 40 * Math.sin(x / 190 + c * 2.1) - 18 * Math.sin(x / 71 + c)]);
  d.wash(hill.concat([[980, 560], [-20, 560]]), '#9fb59a', { alpha: 0.55, off: 0, spread: 1.6, layers: 2, edge: false, curve: true });
  d.wash(hill.concat([[980, 560], [-20, 560]]), '#c9d6d2', { alpha: 0.3, off: 0, spread: 2, edge: false, curve: true });
  d.stroke(hill, { w: 1.2, curve: true, alpha: 0.45, p: [0.2, 1, 0.2] });
  const yAt = x => 380 - 40 * Math.sin(x / 190 + c * 2.1) - 18 * Math.sin(x / 71 + c);
  // friends on the skyline: a dinosaur, a snowman, a robot, a little rocket (tiny ink silhouettes)
  const friends = c === 0 ? [['dino', 160], ['snow', 520], ['tree', 820]] : [['robot', 260], ['rocket', 640], ['tree', 900]];
  for (const [kind, x] of friends) {
    const y = yAt(x);
    if (kind === 'dino') { d.shape([[x - 16, y], [x - 10, y - 10], [x + 4, y - 12], [x + 12, y - 22], [x + 18, y - 20], [x + 12, y - 10], [x + 14, y], [x + 8, y], [x + 4, y - 6], [x - 6, y - 6], [x - 8, y]], { fill: '#5f7581', w: 1, corner: 40, alpha: 0.7 }); }
    else if (kind === 'snow') { d.ellipse(x, y - 7, 7, 7, { fill: '#f6ecd4', w: 1 }); d.ellipse(x, y - 18, 5, 5, { fill: '#f6ecd4', w: 1 }); d.line(x + 4, y - 18, x + 9, y - 17, { w: 1.4, col: P.ember, ov: 0 }); }
    else if (kind === 'robot') { d.shape(SKETCH.box(x - 6, y - 18, 12, 12), { fill: '#8fa3ad', w: 1 }); d.shape(SKETCH.box(x - 4, y - 26, 8, 7), { fill: '#8fa3ad', w: 1 }); d.line(x, y - 26, x, y - 31, { w: 0.8, ov: 0 }); d.line(x - 3, y - 6, x - 3, y, { w: 1.2, ov: 0 }); d.line(x + 3, y - 6, x + 3, y, { w: 1.2, ov: 0 }); }
    else if (kind === 'rocket') { d.shape([[x, y - 30], [x + 5, y - 18], [x + 5, y - 4], [x - 5, y - 4], [x - 5, y - 18]], { fill: '#e8e0d0', w: 1 }); d.shape([[x - 5, y - 8], [x - 9, y], [x - 5, y - 4]], { fill: P.rust, w: 0.8 }); d.shape([[x + 5, y - 8], [x + 9, y], [x + 5, y - 4]], { fill: P.rust, w: 0.8 }); }
    else { d.stroke([[x, y], [x, y - 14]], { w: 1.4 }); d.wash(SKETCH.ell(x, y - 20, 9, 8, 12), '#6f8f5a', { alpha: 0.7, off: 0.4 }); }
  }
};
// layer 2: the near meadow: rolling hills, hedges, trees, a fence, wildflowers; the cottage with its front door (c 1)
IRON_ART.meadowDraw[2] = (d, c) => {
  const P = IRON_P, hill = [], yAt = x => 450 - 26 * Math.sin(x / 260 + c * 1.3) - 10 * Math.sin(x / 90 + c * 3);
  for (let x = -20; x <= 980; x += 16) hill.push([x, yAt(x)]);
  d.wash(hill.concat([[980, 560], [-20, 560]]), P.green, { alpha: 0.75, off: 0, spread: 1.4, layers: 2, edge: false, curve: true });
  d.wash(hill.concat([[980, 560], [-20, 560]]), '#c8d27a', { alpha: 0.3, off: 0, spread: 2, edge: false, curve: true });
  d.hatch(hill.concat([[980, 560], [-20, 560]]), { a: 70, gap: 4, w: 0.5, alpha: 0.25, force: true });
  d.stroke(hill, { w: 1.6, curve: true, alpha: 0.6 });
  // grass tufts and flowers along the ridge
  for (let x = 10; x < 960; x += 22 + d.r() * 14) { const y = yAt(x) + 4 + d.r() * 30; d.stroke([[x - 3, y], [x - 1, y - 7]], { w: 0.8, sh: 0, alpha: 0.6 }); d.stroke([[x + 2, y], [x + 3, y - 6]], { w: 0.8, sh: 0, alpha: 0.6 }); if (d.r() < 0.4) d.ellipse(x, y - 8, 2, 2, { fill: d.r() < 0.5 ? '#f6ecd4' : P.core, w: 0.6 }); }
  // trees: round ink crowns with glaze, trunks
  const trees = c === 0 ? [120, 300, 860] : [80, 700];
  for (const x of trees) {
    const y = yAt(x);
    d.stroke([[x, y], [x + 1, y - 40]], { w: 3 });
    d.wash(SKETCH.ell(x, y - 56, 30, 26, 16), P.greenDark, { alpha: 0.8, off: 1 });
    d.wash(SKETCH.ell(x - 8, y - 64, 16, 12, 12), '#9ab45a', { alpha: 0.6, off: 0, edge: false });
    d.cloud(x, y - 56, 30, { puffs: 7, w: 1.2, curls: 1, fill: null });
  }
  // a fence
  for (let x = c === 0 ? 420 : 160; x < (c === 0 ? 700 : 420); x += 30) { const y = yAt(x); d.stroke([[x, y + 4], [x, y - 22]], { w: 1.6 }); }
  for (const dy of [-16, -8]) { const xs = c === 0 ? [420, 700] : [160, 420], pts = []; for (let x = xs[0]; x <= xs[1]; x += 30) pts.push([x, yAt(x) + dy]); d.stroke(pts, { w: 1.2, curve: true }); }
  if (c === 1) {
    // the cottage: their front door
    const hx = 540, hy = yAt(540) + 6;
    const wall = [[hx - 60, hy], [hx + 60, hy], [hx + 60, hy - 60], [hx - 60, hy - 60]];
    d.wash(wall, '#f2e6cc', { alpha: 0.9, off: 0.6 }); d.outline(wall, { w: 1.8, corner: 30 });
    const roof = [[hx - 74, hy - 58], [hx, hy - 110], [hx + 74, hy - 58]];
    d.wash(roof, P.rust, { alpha: 0.8, off: 0.8 }); d.outline(roof, { w: 2, corner: 30 });
    d.hatch(roof, { a: 30, gap: 3, w: 0.6, alpha: 0.4, force: true });
    const door = [[hx - 12, hy], [hx + 12, hy], [hx + 12, hy - 34], [hx - 12, hy - 34]];
    d.wash(door, '#c0402a', { alpha: 0.95, off: 0.4 }); d.outline(door, { w: 1.6, corner: 30 }); d.ellipse(hx + 7, hy - 16, 1.6, 1.6, { fill: P.core, w: 0.6 });
    for (const sx of [-38, 38]) { const win = SKETCH.box(hx + sx - 10, hy - 46, 20, 18); d.wash(win, P.coreHot, { alpha: 0.8, off: 0 }); d.outline(win, { w: 1.3, corner: 30 }); d.line(hx + sx, hy - 46, hx + sx, hy - 28, { w: 0.8, ov: 0 }); }
    d.stroke([[hx + 36, hy - 80], [hx + 36, hy - 100], [hx + 50, hy - 100], [hx + 50, hy - 72]], { w: 1.6 });
    for (let i = 0; i < 3; i++) d.cloud(hx + 44 + i * 8, hy - 112 - i * 14, 6 + i * 2, { puffs: 5, w: 0.8, curls: 0, fill: '#f6ecd4', fillAlpha: 0.6 });
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
    const fill = (pts, a = 0.18) => d.wash(pts.map(([x, y]) => [X(x), Y(y)]), '#b9b2a4', { alpha: a, off: 0, spread: 1.6, edge: false });
    const plate = pts => { fill(pts); shade(pts); pen(pts.concat([pts[0]]), { curve: false }); };
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
  SKETCH.sheet(key, w + 20, h + 20, d => {
    const x0 = 10, x1 = w + 10, top = 10, bot = wall ? 10 + 230 : 10 + 30;
    const pts = [[x0, top], [x1, top], [x1 - 4, bot], [x0 + 4, bot]];
    d.wash(pts, '#cfc7b8', { alpha: 0.7, off: 0.6, spread: 1.2 });
    d.hatch(pts, { a: 60, gap: 3.2, w: 0.6, alpha: 0.4, force: true, tone: (x, y) => 0.3 + (y - top) / (bot - top) });
    d.stroke([[x0, top], [x1, top]], { w: 2.6, col: F_INK() });
    d.stroke([[x1, top], [x1 - 4, bot], [x0 + 4, bot], [x0, top]], { w: 1.6, col: F_INK(), alpha: 0.8 });
    d.stroke([[x0 + 4, top + 3], [x1 - 4, top + 3]], { w: 1, col: '#ffffff', alpha: 0.6, sh: 0, layer: 'white' });
    const n = Math.max(2, Math.round(w / 34));
    d.rivets(x0 + 8, top + 8, x1 - 8, top + 8, n, { r: 1.4, rust: 0 });
    if (wall) for (let y = top + 50; y < bot - 10; y += 50) d.stroke([[x0 + 2, y], [x1 - 2, y + 2]], { w: 1, col: F_INK(), alpha: 0.5 });
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
IRON_ART.fallHands = () => {
  const key = 'iron:fall:hands';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 360, 180, d => {
    const P = IRON_P;
    for (const [hx, s] of [[100, -1], [260, 1]]) {
      const palm = [[hx - 60, 170], [hx + 60, 170], [hx + 54, 100], [hx - 50, 92]];
      d.wash(palm, P.iron, { alpha: 0.8, off: 0.8 }); d.hatch(palm, { a: 60, gap: 2.6, w: 0.6, alpha: 0.5, force: true }); d.outline(palm, { w: 2.4, corner: 30 });
      for (let i = 0; i < 4; i++) { const fx = hx - 45 + i * 30, f = [[fx - 11, 96], [fx + 11, 96], [fx + 9, 40 + i % 2 * 8], [fx - 9, 40 + i % 2 * 8]]; d.wash(f, P.ironLight, { alpha: 0.8, off: 0.6 }); d.outline(f, { w: 2, corner: 30 }); d.rivet(fx, 70, 1.6); }
      const th = [[hx + s * 56, 140], [hx + s * 96, 110], [hx + s * 104, 90], [hx + s * 70, 104]];
      d.wash(th, P.ironLight, { alpha: 0.8, off: 0.6 }); d.outline(th, { w: 2, corner: 30 });
    }
  }, { ox: 180, oy: 170, seed: 9740 });
  return key;
};
IRON_ART.fallKey = () => {
  const key = 'iron:fall:key';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 220, 160, d => {
    const P = IRON_P, cx = 110, fy = 150;
    d.shape(SKETCH.box(cx - 10, fy - 100, 20, 100), { fill: P.ochre, w: 2.2, corner: 30, hatch: { a: 90, gap: 2.4, w: 0.5, alpha: 0.5 } });
    for (const s of [-1, 1]) { d.ellipse(cx + s * 44, fy - 120, 42, 30, { fill: P.core, w: 2.6, hatch: { a: 45, gap: 2.6, w: 0.5, alpha: 0.5 } }); d.ellipse(cx + s * 44, fy - 120, 16, 10, { fill: '#e8d8b8', w: 1.6 }); }
    d.ellipse(cx, fy - 116, 14, 14, { fill: P.ochreDeep, w: 2 });
  }, { ox: 110, oy: 150, seed: 9750 });
  return key;
};
