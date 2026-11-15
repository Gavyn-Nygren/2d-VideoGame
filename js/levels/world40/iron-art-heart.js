/* Pip & Bo - World 40 Colossus March: inside the chest (Part 5, the Gear Heart), chalk on charcoal paper. */
'use strict';

/* Clockwork: brass gears, chalk rails with sleepers, a signal booth with a big lever, a riveted carriage on two wheels,
   chain lifts, escapement pendulums, crusher jaws, and the gear heart itself (a heart-shaped clockwork with a red-brass
   shell and a glowing middle). Sheets (made on first use, three boil versions):
     IRON_ART.heartWall(k)     'iron:heart:wall:<k>'  the chest wall, 960 x 540, chunk k going UP (flat; world joins)
     IRON_ART.heartRails(k)    'iron:heart:rails:<k>' leg k's rail network, crusher housings and buffer stops
                                                      (960 x 540, top-left at (0, y0 - 480))
     IRON_ART.heartCatwalk()   'iron:heart:catwalk'   a full-width catwalk (top-left at (0, level y))
     IRON_ART.signalBooth()    'iron:booth'           the booth (anchor: the lever's floor spot, faces right; sx -1)
     IRON_ART.carriage()       'iron:carriage'        the carriage (anchor: the middle of its deck)
     IRON_ART.chainLift()      'iron:lift'            the lift cage floor (anchor: the middle of its top)
     IRON_ART.gear(r, n)       'iron:gear:<r>:<n>'    a gear (anchor: its hub; blit with rot)
     IRON_ART.pendulumBob()    'iron:pendulum'        the escapement bob (anchor: its middle)
     IRON_ART.gearHeart()      'iron:gearheart'       the gear heart (anchor: its middle)
     IRON_ART.escapePedal()    'iron:pedal'           the escapement pedal (anchor: its hinge on the floor)
     IRON_ART.crusherJaw()     'iron:crusher'         one toothed jaw, teeth down (anchor: the top middle) */

const H_CHALK = '#efe8d8';
IRON_ART.heartWall = (k = 0) => {
  const key = 'iron:heart:wall:' + k;
  if (!SKETCH.has(key)) SKETCH.sheet(key, 960, 540, d => {
    const P = IRON_P, H = IRON_ART.helpers, Y0 = 60 - 540 * (k + 1);   // world y of the sheet's top
    // the chest wall: tall plates laid in world rows (so the chunks join), kept quiet so the rails read on top
    for (let row = Math.floor((Y0 + 2160) / 180) - 1; row * 180 - 2160 < Y0 + 560; row++) {
      const ya = row * 180 - 2160 - Y0, yb = ya + 180, off = (row % 2) * 60;
      for (let x = -60 + off; x < 1000; x += 120) {
        const pts = [[x, ya], [x + 120, ya], [x + 121, yb], [x - 1, yb]];
        d.wash(pts, (row + Math.round(x / 120)) % 2 ? '#352e2b' : '#3b332f', { alpha: 0.5, off: 1.2, spread: 1.2, blooms: 1 });
        d.hatch(pts, { a: 75 + (row % 3) * 6, gap: 4.2, w: 0.5, alpha: 0.2, tone: (xx, yy) => 1 - (yy - ya) / 180 });
        d.outline(pts, { w: 1, corner: 40, alpha: 0.32 });
        d.rivets(x + 8, ya + 7, x + 112, ya + 7, 7, { r: 1.2, rust: 0.15 });
      }
    }
    // ribs: dim curved bands in the far dark, one per level
    for (let lv = 0; lv <= 5; lv++) {
      const wy = -360 * lv - 250 - Y0;
      if (wy < -120 || wy > 660) continue;
      const band = [[-20, wy + 40], [240, wy - 4], [480, wy - 18], [720, wy - 4], [980, wy + 40], [980, wy + 58], [720, wy + 14], [480, wy], [240, wy + 14], [-20, wy + 58]];
      d.wash(band, '#2a2421', { alpha: 0.55, off: 1, spread: 1.4 });
      d.outline(band, { w: 1.2, curve: true, alpha: 0.35 });
    }
    // pipes and a gauge column on each side, a ladder now and then
    H.ironPipe(d, [[34, -10], [36, 270], [32, 550]], 7, { flanges: [0.25, 0.75], col: '#6b7d70', alpha: 0.5 });
    H.ironPipe(d, [[928, -10], [925, 270], [930, 550]], 7, { flanges: [0.4, 0.9], col: '#7a5a48', alpha: 0.5 });
    H.ironStencil(d, ['TICK TOCK', 'MIND THE GAP', 'NO RIDING THE PENDULUM', 'HEART ROOM'][k], k % 2 ? 300 : 640, 120 + k * 30, 13);
    // a clock face set in the wall
    const cx = k % 2 ? 760 : 200, cy = 300;
    d.solid(SKETCH.ell(cx, cy, 44, 44, 30), { kind: 'dawn' });
    d.ellipse(cx, cy, 44, 44, { w: 2, col: SKETCH.INK });
    d.ellipse(cx, cy, 50, 50, { w: 2.4 });
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; d.line(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34, cx + Math.cos(a) * 40, cy + Math.sin(a) * 40, { w: i % 3 ? 0.9 : 1.8, col: SKETCH.INK, ov: 0 }); }
    d.line(cx, cy, cx + 6, cy - 26, { w: 2, col: SKETCH.INK }); d.line(cx, cy, cx + 22, cy + 8, { w: 1.4, col: SKETCH.INK });
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; H.ironBolt(d, cx + Math.cos(a) * 47, cy + Math.sin(a) * 47, 1.8, { col: P.ochre }); }
  }, { flat: true, paper: 'dark', seed: 8100 + k });
  return key;
};

// one rail: a brass double line on dark sleepers, from a to b (in sheet coords)
function ironHeartRail(d, a, b, o = {}) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  // the bed: a dark band the rails sit on (it hides the wall's lines behind)
  d.solid([[a[0] + nx * 11, a[1] + ny * 11], [b[0] + nx * 11, b[1] + ny * 11], [b[0] - nx * 11, b[1] - ny * 11], [a[0] - nx * 11, a[1] - ny * 11]], { kind: 'dark' });
  d.wash([[a[0] + nx * 11, a[1] + ny * 11], [b[0] + nx * 11, b[1] + ny * 11], [b[0] - nx * 11, b[1] - ny * 11], [a[0] - nx * 11, a[1] - ny * 11]], '#1c1816', { alpha: 0.6, off: 0, layers: 2 });
  for (let s2 = 6; s2 < L - 2; s2 += 14) {
    const x = a[0] + dx * s2 / L, y = a[1] + dy * s2 / L;
    d.line(x + nx * 10, y + ny * 10, x - nx * 10, y - ny * 10, { w: 3.4, col: '#6a5446', ov: 0 });
  }
  for (const sd of [-6, 6]) d.line(a[0] + nx * sd, a[1] + ny * sd, b[0] + nx * sd, b[1] + ny * sd, { w: o.w || 2.4, col: o.col || IRON_P.ochre, ov: 0.6 });
}
IRON_ART.heartRails = (k = 0) => {
  const key = 'iron:heart:rails:' + k;
  if (!SKETCH.has(key)) SKETCH.sheet(key, 960, 540, d => {
    d.dark = true;
    const g = ironHeartLeg(k), oy = g.y0 - 480, Y = y => y - oy + 36, X = x => x, dir = g.dir;
    // the rails hang a little under the carriage deck (it rides on top): drawn 20 px lower than the path
    const R = (ax, ay, bx, by) => ironHeartRail(d, [X(ax), Y(ay)], [X(bx), Y(by)]);
    // the shaft from the dock up to junction 1, and on up to the top rail / down to the bottom
    R(g.xd, g.y0, g.xd, g.rows[0]);
    for (let r = 0; r < 3; r++) {
      const ok = r === g.L.j1, end = ok ? g.j2x : g.xd + 170 * dir;
      R(g.xd, g.rows[r], end, g.rows[r]);
      if (!ok) ironHeartRailEnd(d, end, Y(g.rows[r]) - 36, dir, r === g.L.c1);
    }
    // junction 2's shaft, its three rails, and the climb to the next dock
    R(g.j2x, Math.min(...g.rows) - 0, g.j2x, Math.max(...g.rows));
    for (let r = 0; r < 3; r++) {
      const ok = r === g.L.j2, end = ok ? g.xe : g.j2x + 170 * dir;
      R(g.j2x, g.rows[r], end, g.rows[r]);
      if (!ok) ironHeartRailEnd(d, end, Y(g.rows[r]) - 36, dir, r === g.L.c2);
    }
    R(g.xe, g.rows[g.L.j2], g.xe, g.y0 - 360);
    // the junction boxes: a riveted switch housing with a semaphore post at each junction
    for (const [jx, jy] of [[g.xd, g.rows[1]], [g.j2x, g.rows[g.L.j1]]]) {
      const bx = X(jx) - 16, by = Y(jy) - 16;
      d.solid(SKETCH.box(bx, by, 32, 32), { kind: 'dark' });
      d.shape(SKETCH.box(bx, by, 32, 32), { fill: '#5a463c', w: 1.8, corner: 30, hatch: { a: 45, gap: 2.2, w: 0.5, alpha: 0.5, tone: (x, y) => 1 - (x - bx + y - by) / 64 } });
      for (const [cx, cy] of [[bx + 4, by + 4], [bx + 28, by + 4], [bx + 4, by + 28], [bx + 28, by + 28]]) d.rivet(cx, cy, 1.5);
      d.word('J', bx + 16, by + 21, 11, { align: 'center', col: IRON_P.core, w: 1.6 });
    }
  }, { ox: 0, oy: 0, paper: 'dark', seed: 8200 + k });
  return key;
};
// the end of a wrong rail: a crusher (two piston housings, above and below; the jaws are live) or a buffer stop
function ironHeartRailEnd(d, x, y, dir, crush) {
  const ex = x;
  if (crush) {
    for (const hy of [y - 114]) {
      const pts = SKETCH.box(ex - 30, hy - 12, 60, 24);
      d.solid(pts, { kind: 'dark' });
      d.shape(pts, { fill: '#3a322d', w: 1.8, corner: 30 });
      for (let i = 0; i < 4; i++) d.line(ex - 24 + i * 14, hy - 12, ex - 16 + i * 14, hy + 12, { w: 3, col: IRON_P.core, ov: 0 });
      d.stroke([[ex - 32, hy], [ex - 46, hy]], { w: 2 }); d.rivet(ex - 46, hy, 2);
    }
    // a hand-lettered warning on a little plate
    const pl = SKETCH.box(ex - 30, y - 150, 60, 18);
    d.solid(pl, { kind: 'dark' }); d.shape(pl, { fill: '#5a2a1c', w: 1.4, corner: 30 });
    d.word('CRUSH', ex, y - 136, 10, { align: 'center', col: '#ffd9a8', w: 1.6 });
  } else {
    // a buffer stop: two sprung bumpers on a frame, and a chalk X
    const bx = x + 50 * dir; y += 30;
    d.stroke([[bx, y - 22], [bx, y + 18]], { w: 4 });
    for (const sy of [-8, 8]) { d.stroke([[bx - 10 * dir, y + sy], [bx, y + sy]], { w: 1.6 }); d.ellipse(bx - 13 * dir, y + sy, 4.5, 4.5, { fill: IRON_P.rust, w: 1.3 }); }
    d.stroke([[bx + 8 * dir, y - 30], [bx + 26 * dir, y - 12]], { w: 2.6, col: '#e06a4a' }); d.stroke([[bx + 26 * dir, y - 30], [bx + 8 * dir, y - 12]], { w: 2.6, col: '#e06a4a' });
    d.word('END', bx + 17 * dir, y - 40, 11, { align: 'center', col: H_CHALK, w: 1.6 });
  }
}
IRON_ART.heartCatwalk = () => {
  const key = 'iron:heart:catwalk';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 960, 40, d => {
    const deck = [[-10, 0], [970, 0], [970, 14], [-10, 14]];
    d.solid(deck, { kind: 'dark' });
    d.wash(deck, '#57504a', { alpha: 0.75, off: 0.6 });
    d.hatch(deck, { a: 35, gap: 5, w: 0.8, alpha: 0.7, cross: true, crossA: 70, crossGap: 5, crossTone: () => 1, tone: () => 1 });
    d.stroke([[-10, 0.5], [480, -0.5], [970, 0.5]], { w: 2.6, curve: true, sh: 0 });
    d.stroke([[-10, 14], [480, 15], [970, 14]], { w: 1.4, curve: true, sh: 0 });
    for (let x = 30; x < 960; x += 120) { d.stroke([[x, 14], [x + 10, 34]], { w: 1.4 }); d.stroke([[x + 60, 14], [x + 50, 34]], { w: 1.4 }); }
    for (let x = 12; x < 960; x += 40) d.rivet(x, 7, 1.4);
  }, { flat: true, paper: 'dark', seed: 8300 });
  return key;
};
IRON_ART.signalBooth = (side = 1) => {
  const key = 'iron:booth:' + side;
  if (!SKETCH.has(key)) SKETCH.sheet(key, 220, 200, d => {
    // anchor (110, 196): the lever's floor spot. side 1: the booth's lamp mast is on the left and the lever leans right
    const P = IRON_P, fx = 110, fy = 196, X = x => fx + x * side;
    const box = [[fx - 52, fy - 108], [fx + 52, fy - 108], [fx + 52, fy - 78], [fx - 52, fy - 78]];
    d.solid(box, { kind: 'dark' });
    d.shape(box, { fill: '#5a463c', w: 1.8, corner: 30, hatch: { a: 80, gap: 2.2, w: 0.5, alpha: 0.5 } });
    // a pitched roof with a lamp mast (the three lamps are live)
    const roof = [[fx - 62, fy - 106], [fx, fy - 130], [fx + 62, fy - 106]];
    d.solid(roof.concat([[fx + 62, fy - 104], [fx - 62, fy - 104]]), { kind: 'dark' });
    d.shape(roof, { fill: '#3a322d', w: 2.2, corner: 30 });
    d.stroke([[X(-30), fy - 120], [X(-30), fy - 180]], { w: 3 });
    const mast = SKETCH.box(X(-30) - 11, fy - 182, 22, 62);
    d.solid(mast, { kind: 'dark' }); d.shape(mast, { fill: '#2a2421', w: 1.6, corner: 30 });
    // two posts, a waist-high rail with a hatched panel, the stencil
    for (const x of [fx - 50, fx + 50]) d.stroke([[x, fy], [x, fy - 108]], { w: 2.6 });
    d.stroke([[fx - 50, fy - 42], [fx + 50, fy - 42]], { w: 1.6 });
    d.hatch([[fx - 50, fy - 42], [fx + 50, fy - 42], [fx + 50, fy], [fx - 50, fy]], { a: 60, gap: 4, w: 0.5, alpha: 0.3, force: true });
    IRON_ART.helpers.ironStencil(d, 'SIGNALS', fx, fy - 90, 11);
    // the lever's notched quadrant (the handle is live): a brass arc with three notches, top / middle / bottom
    const qx = X(18), qy = fy - 30, a0 = side > 0 ? -0.95 : Math.PI - 0.95, a1 = side > 0 ? 0.95 : Math.PI + 0.95;
    d.stroke(SKETCH.ell(qx, qy, 40, 40, 20, 0, a0, a1), { w: 3, col: P.ochre, curve: true });
    for (const a of [-0.75, 0, 0.75]) { const c = Math.cos(a) * side, sn = Math.sin(a); d.line(qx + c * 36, qy + sn * 36, qx + c * 47, qy + sn * 47, { w: 2.6, col: P.ochre, ov: 0 }); }
    d.word('T', qx + Math.cos(-0.75) * 56 * side, qy + Math.sin(-0.75) * 56 + 4, 9, { align: 'center', col: P.ochre, w: 1.3 });
    d.word('B', qx + Math.cos(0.75) * 56 * side, qy + Math.sin(0.75) * 56 + 4, 9, { align: 'center', col: P.ochre, w: 1.3 });
    const st = [[qx - 6, qy - 4], [qx + 6, qy - 4], [qx + 7, fy], [qx - 8, fy]];
    d.solid(st, { kind: 'dark' }); d.shape(st, { fill: '#3a322d', w: 1.6, corner: 30 });
    d.ellipse(qx, qy, 4, 4, { fill: P.ironLight, w: 1.2 });
  }, { ox: 110, oy: 196, paper: 'dark', seed: 8400 + (side > 0 ? 0 : 1) });
  return key;
};
IRON_ART.carriage = () => {
  const key = 'iron:carriage';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 120, 60, d => {
    const P = IRON_P, cx = 60, ty = 10;
    // a deck plate with a lip, a riveted skirt, two flanged wheels sitting on the rail 20 px down
    const deck = [[cx - 48, ty], [cx + 48, ty], [cx + 46, ty + 8], [cx - 46, ty + 8]];
    d.solid(deck, { kind: 'dark' });
    d.shape(deck, { fill: '#7a5a48', w: 2, corner: 30 });
    d.stroke([[cx - 48, ty + 0.5], [cx + 48, ty + 0.5]], { w: 2.4, col: '#f2b25a', sh: 0, layer: 'white', alpha: 0.6 });
    const skirt = [[cx - 44, ty + 8], [cx + 44, ty + 8], [cx + 38, ty + 22], [cx - 38, ty + 22]];
    d.solid(skirt, { kind: 'dark' });
    d.shape(skirt, { fill: '#3a322d', w: 1.6, corner: 30, hatch: { a: 70, gap: 2.2, w: 0.5, alpha: 0.5 } });
    d.rivets(cx - 38, ty + 14, cx + 38, ty + 14, 9, { r: 1.3 });
    for (const sx of [-26, 26]) {
      d.solid(SKETCH.ell(cx + sx, ty + 28, 9, 9, 16), { kind: 'dark' });
      d.ellipse(cx + sx, ty + 28, 9, 9, { fill: P.rust, w: 1.8 });
      d.ellipse(cx + sx, ty + 28, 3, 3, { fill: P.ironLight, w: 1 });
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; d.line(cx + sx, ty + 28, cx + sx + Math.cos(a) * 8, ty + 28 + Math.sin(a) * 8, { w: 0.9, ov: 0 }); }
    }
    // a little hand rail on each end
    for (const sx of [-1, 1]) d.stroke([[cx + sx * 44, ty], [cx + sx * 44, ty - 8], [cx + sx * 36, ty - 8]], { w: 1.6 });
  }, { ox: 60, oy: 10, paper: 'dark', seed: 8500 });
  return key;
};
IRON_ART.chainLift = () => {
  const key = 'iron:lift';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 80, 40, d => {
    const cx = 40;
    const pl = [[cx - 32, 4], [cx + 32, 4], [cx + 30, 16], [cx - 30, 16]];
    d.solid(pl, { kind: 'dark' });
    d.shape(pl, { fill: '#5a463c', w: 2, corner: 30, hatch: { a: 30, gap: 3, w: 0.5, alpha: 0.6, cross: true, crossA: 120, crossGap: 3 } });
    d.stroke([[cx - 32, 4.5], [cx + 32, 4.5]], { w: 2.2, col: '#f2b25a', sh: 0, layer: 'white', alpha: 0.5 });
    for (const sx of [-26, 26]) d.ellipse(cx + sx, 10, 3, 3, { fill: IRON_P.ironLight, w: 1 });
    d.stroke([[cx - 20, 16], [cx, 30], [cx + 20, 16]], { w: 1.4 });
  }, { ox: 40, oy: 4, paper: 'dark', seed: 8600 });
  return key;
};
IRON_ART.gear = (r = 70, n = 14) => {
  const key = 'iron:gear:' + r + ':' + n;
  if (!SKETCH.has(key)) SKETCH.sheet(key, r * 2 + 30, r * 2 + 30, d => {
    const P = IRON_P, c = r + 15, pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, w = Math.PI / n * 0.55;
      pts.push([c + Math.cos(a - w * 1.2) * (r - 8), c + Math.sin(a - w * 1.2) * (r - 8)], [c + Math.cos(a - w * 0.7) * (r + 4), c + Math.sin(a - w * 0.7) * (r + 4)],
        [c + Math.cos(a + w * 0.7) * (r + 4), c + Math.sin(a + w * 0.7) * (r + 4)], [c + Math.cos(a + w * 1.2) * (r - 8), c + Math.sin(a + w * 1.2) * (r - 8)]);
    }
    d.solid(pts, { kind: 'dark' });
    d.wash(pts, P.ochreDeep, { alpha: 0.75, off: 1 });
    d.hatch(pts, { a: 40, gap: 2.6, w: 0.5, alpha: 0.45, tone: (x, y) => 1 - ((x - c) + (y - c)) / (r * 1.4) });
    d.outline(pts, { w: 1.8, corner: 50 });
    // spokes cut out: dark windows between four spokes, a hub
    for (let i = 0; i < 4; i++) {
      const a0 = i * Math.PI / 2 + 0.25, a1 = a0 + Math.PI / 2 - 0.5;
      const win = SKETCH.ell(c, c, r * 0.68, r * 0.68, 10, 0, a0, a1).concat(SKETCH.ell(c, c, r * 0.3, r * 0.3, 6, 0, a0, a1).reverse());
      d.spot(win, { col: '#191512', spread: 0.3 });
      d.outline(win, { w: 1.2, corner: 50 });
    }
    d.ellipse(c, c, r * 0.18, r * 0.18, { fill: P.ironLight, w: 1.6 });
    d.ellipse(c, c, r * 0.07, r * 0.07, { fill: '#191512', w: 1 });
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; d.rivet(c + Math.cos(a) * r * 0.8, c + Math.sin(a) * r * 0.8, 1.6); }
  }, { ox: r + 15, oy: r + 15, paper: 'dark', seed: 8700 + r + n });
  return key;
};
IRON_ART.pendulumBob = () => {
  const key = 'iron:pendulum';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 50, 50, d => {
    const c = 25;
    const bob = SKETCH.ell(c, c, 15, 15, 24);
    d.solid(bob, { kind: 'dark' });
    d.shape(bob, { fill: IRON_P.ochre, w: 2.2, curve: true, hatch: { a: 45, gap: 2, w: 0.5, alpha: 0.6, tone: (x, y) => 1 - ((x - c) + (y - c)) / 20 } });
    d.stroke(SKETCH.ell(c, c, 9, 9, 16, 0, 3.6, 5.4), { w: 1.6, col: '#fff3cf', curve: true, layer: 'white', sh: 0 });
    d.rivet(c, c, 2);
  }, { ox: 25, oy: 25, paper: 'dark', seed: 8800 });
  return key;
};
IRON_ART.crusherJaw = () => {
  const key = 'iron:crusher';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 80, 90, d => {
    // a piston rod up to the housing (the sheet is long so the rod shows as the jaw comes out) and a toothed foot
    const cx = 40;
    for (const sx of [-8, 8]) { d.solid(SKETCH.box(cx + sx - 3, 0, 6, 50), { kind: 'dark' }); d.shape(SKETCH.box(cx + sx - 3, 0, 6, 50), { fill: '#8fa3ad', w: 1.2, corner: 30 }); }
    const jaw = [[cx - 28, 50], [cx + 28, 50], [cx + 28, 66], [cx + 21, 80], [cx + 14, 66], [cx + 7, 80], [cx, 66], [cx - 7, 80], [cx - 14, 66], [cx - 21, 80], [cx - 28, 66]];
    d.solid(jaw, { kind: 'dark' });
    d.shape(jaw, { fill: '#6b7d70', w: 1.8, corner: 20, hatch: { a: 90, gap: 2, w: 0.5, alpha: 0.6, tone: x => 1 - (x - cx + 28) / 56 } });
    d.rivets(cx - 22, 56, cx + 22, 56, 5, { r: 1.3 });
  }, { ox: 40, oy: 0, paper: 'dark', seed: 8900 });
  return key;
};
IRON_ART.escapePedal = () => {
  const key = 'iron:pedal';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 110, 50, d => {
    // a long toothed plate hinged at its middle on a block (anchor: the middle of its top, on the floor)
    const cx = 55, ty = 20;
    const pl = [[cx - 40, ty - 4], [cx + 40, ty - 4], [cx + 40, ty + 6], [cx - 40, ty + 6]];
    d.solid(pl, { kind: 'dark' });
    d.shape(pl, { fill: IRON_P.ochreDeep, w: 2, corner: 30 });
    for (let i = 0; i < 6; i++) d.shape([[cx - 36 + i * 14, ty - 4], [cx - 30 + i * 14, ty - 12], [cx - 24 + i * 14, ty - 4]], { fill: IRON_P.ochre, w: 1.2, corner: 30 });
    d.shape([[cx - 10, ty + 6], [cx + 10, ty + 6], [cx + 14, ty + 24], [cx - 14, ty + 24]], { fill: '#3a322d', w: 1.6, corner: 30 });
    d.rivet(cx, ty + 2, 2.2);
  }, { ox: 55, oy: 22, paper: 'dark', seed: 9000 });
  return key;
};
IRON_ART.gearHeart = () => {
  const key = 'iron:gearheart';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 260, 250, d => {
    const P = IRON_P, cx = 130, cy = 118;
    // a heart outline made of riveted red-brass plates, gears showing through windows, a glowing middle
    const heart = [];
    for (let i = 0; i <= 48; i++) { const t = i / 48 * Math.PI * 2, x = 16 * Math.pow(Math.sin(t), 3), y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); heart.push([cx + x * 6.4, cy + y * 6.4]); }
    d.solid(heart, { kind: 'dark', curve: true });
    d.wash(heart, '#9a4632', { alpha: 0.85, off: 1.4, blooms: 2 });
    d.hatch(heart, { a: 50, gap: 2.4, w: 0.55, alpha: 0.5, tone: (x, y) => 1 - ((x - cx) * 0.6 + (y - cy + 40)) / 140 });
    // the glowing middle and the gears in a window
    const win = SKETCH.ell(cx, cy + 4, 46, 40, 24);
    d.spot(win, { col: '#191512' });
    d.wash(SKETCH.ell(cx, cy + 8, 34, 28, 20), IRON_P.ember, { alpha: 0.9, off: 0, op: 'source-over', layer: 'white', spread: 1.4 });
    d.wash(SKETCH.ell(cx, cy + 10, 18, 14, 16), IRON_P.coreHot, { alpha: 1, off: 0, op: 'source-over', layer: 'white' });
    for (const [gx, gy, gr] of [[cx - 18, cy - 4, 16], [cx + 16, cy + 14, 12]]) {
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; d.line(gx + Math.cos(a) * gr * 0.7, gy + Math.sin(a) * gr * 0.7, gx + Math.cos(a) * gr, gy + Math.sin(a) * gr, { w: 2.2, col: '#2a1610', layer: 'white', ov: 0 }); }
      d.stroke(SKETCH.ell(gx, gy, gr * 0.7, gr * 0.7, 16, 0, 0, 6.3), { w: 1.6, col: '#2a1610', layer: 'white', curve: true, sh: 0 });
    }
    d.outline(win, { w: 2.4, curve: true });
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; d.rivet(cx + Math.cos(a) * 52, cy + 4 + Math.sin(a) * 46, 1.8); }
    // plate seams from the window out, and rivets round the edge
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + 0.3; d.stroke([[cx + Math.cos(a) * 56, cy + 4 + Math.sin(a) * 50], [cx + Math.cos(a) * 90, cy + 4 + Math.sin(a) * 84]], { w: 1.1, sh: 0, alpha: 0.8 }); }
    d.outline(heart, { curve: true, w: 3, c: [cx, cy] });
    for (let i = 2; i < heart.length - 2; i += 3) { const [x, y] = heart[i]; d.rivet(cx + (x - cx) * 0.93, cy + (y - cy) * 0.93, 1.9); }
    // the spindle collar on top and a winding key on the side
    d.shape(SKETCH.box(cx - 10, cy - 98, 20, 18), { fill: P.ironLight, w: 1.6, corner: 30 });
    d.stroke([[cx + 96, cy - 10], [cx + 116, cy - 10]], { w: 4 });
    d.shape([[cx + 116, cy - 26], [cx + 128, cy - 18], [cx + 128, cy - 2], [cx + 116, cy + 6], [cx + 122, cy - 10]], { fill: P.ochre, w: 1.6, corner: 30 });
    IRON_ART.helpers.ironStencil(d, 'NO 2', cx - 40, cy + 64, 12, { rot: 0.2 });
  }, { ox: 130, oy: 118, paper: 'dark', seed: 9100 });
  return key;
};
