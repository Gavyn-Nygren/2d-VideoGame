/* Pip & Bo - World 40 Colossus March: inside the head (Part 6, the Lantern Head), chalk on charcoal paper. */
'use strict';

/* A round room: curved iron ribs, plate rows bending round it, the back of the lantern eye (a great amber window with
   an iris of brass blades), racks of thinking valves, switchboards and cable trunks, a dome at the top. Galleries
   with brass spark knobs, rubber mats, copper earthing rods, Tick's enormous chair and the bulb in its cage.
   Sheets (made on first use, three boil versions):
     IRON_ART.lampWall(k)    'iron:lamp:wall:<k>'  the head's wall, 960 x 540, chunk k going UP (flat; world joins)
     IRON_ART.lampDeck()     'iron:lamp:deck'      a full-width gallery deck (top-left at (0, floor y))
     IRON_ART.lampStep(s)    'iron:lamp:step:<s>'  the stair block, its arrow on side s (anchor: its bottom-left)
     IRON_ART.lampRod()      'iron:lamp:rod'       an earthing rod (anchor: its foot; sx -1 for the right wall)
     IRON_ART.lampKnob()     'iron:lamp:knob'      a spark knob on its insulator (anchor: its foot; sy -1 hangs it)
     IRON_ART.lampMat()      'iron:lamp:mat'       the rubber mat (anchor: the middle of its bottom)
     IRON_ART.lampChair()    'iron:lamp:chair'     Tick's chair (anchor: world x 620 on the top floor)
     IRON_ART.lampBulb()     'iron:lamp:bulb'      the bulb (anchor: the middle of the glass)
     IRON_ART.lampCage()     'iron:lamp:cage'      the bulb's wire cage (anchor: the bulb's middle)
     IRON_ART.lampSpanner()  'iron:lamp:spanner'   a spanner (anchor: its middle)
     IRON_ART.lampClaw(f)    'iron:lamp:claw:<f>'  the chair's claw, f 0 open, 1 shut (anchor: its wrist) */

IRON_ART.LAMP_EYE = { x: 480, y: -720, r: 236 };
const L_CHALK = '#efe8d8';
IRON_ART.lampWall = (k = 0) => {
  const key = 'iron:lamp:wall:' + k;
  if (!SKETCH.has(key)) SKETCH.sheet(key, 960, 540, d => {
    const P = IRON_P, H = IRON_ART.helpers, Y0 = 60 - 540 * (k + 1), Y = y => y - Y0, E = IRON_ART.LAMP_EYE, INK = SKETCH.INK;
    const vis = (y0, y1) => y1 > Y0 - 40 && y0 < Y0 + 580;
    // the round wall: wide plates in world rows (one per floor), narrower toward the sides where the wall turns away
    const th = [-1.3, -0.95, -0.5, 0, 0.5, 0.95, 1.3], rx = t => 480 + 520 * Math.sin(t) / Math.sin(1.3);
    for (let row = -1; row < 13; row++) {
      const ya = -150 * row + 60, yb = ya - 150;
      if (!vis(yb, ya)) continue;
      for (let i = 0; i < th.length - 1; i++) {
        const xa = rx(th[i]), xb = rx(th[i + 1]), edge = Math.abs(th[i] + th[i + 1]) / 2.6;
        const sag = x => 8 * Math.cos((x - 480) / 520 * 1.3);
        const pts = [[xa, Y(yb) + sag(xa)], [xb, Y(yb) + sag(xb)], [xb, Y(ya) + sag(xb)], [xa, Y(ya) + sag(xa)]];
        d.wash(pts, (row + i) % 2 ? '#352d2a' : '#3b322e', { alpha: 0.6, off: 1.2, spread: 1.2, blooms: 1 });
        d.hatch(pts, { a: 84 + (i - 2.5) * 5, gap: 3.8 - edge * 1.4, w: 0.5, alpha: 0.14 + edge * 0.28, tone: (x2, y2) => 0.25 + edge * 0.8 + (y2 - Y(yb)) / 360 });
        d.outline(pts, { w: 1, corner: 40, alpha: 0.22 });
        d.rivets(xa + 8, Y(yb) + sag(xa) + 8, xb - 8, Y(yb) + sag(xb) + 8, Math.max(3, Math.round((xb - xa) / 22)), { r: 1.1, rust: 0.15 });
      }
    }
    // the wall turns away at the sides: shadow pooled there
    for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) {
      const w = 40 + i * 34, x0 = sd < 0 ? -10 : 970 - w;
      d.wash([[x0, -20], [x0 + w, -20], [x0 + w, 560], [x0, 560]], P.shadowInk, { alpha: 0.1, off: 0, spread: 2, edge: false, layers: 1 });
    }
    // two great ribs, lit on the side toward the eye
    for (const t of [-0.95, 0.95]) {
      const x = rx(t), w = 9;
      const band = [[x - w, -20], [x + w, -20], [x + w, 560], [x - w, 560]];
      d.solid(band, { kind: 'dark' });
      d.wash(band, '#2a2421', { alpha: 0.9, off: 0.4 });
      d.hatch(band, { a: 90, gap: 2.2, w: 0.5, alpha: 0.5, force: true });
      d.stroke([[x - w, -20], [x - w, 560]], { w: 1.6 }); d.stroke([[x + w, -20], [x + w, 560]], { w: 1.6 });
      const lit = t < 0 ? x + w - 2.5 : x - w + 2.5;
      d.stroke([[lit, -20], [lit, 560]], { w: 1.4, col: '#f2c98a', alpha: 0.4, sh: 0, layer: 'white' });
      for (let y = ((10 - Y0) % 36 + 36) % 36; y < 540; y += 36) d.rivet(x, y, 1.5);
    }
    // the copper pipes up the edges of the lightning zone, a flange at every floor
    for (const [px, col] of [[198, '#6b7d70'], [762, '#7a5a48']]) {
      H.ironPipe(d, [[px, -20], [px + 1, 270], [px, 560]], 6, { col, alpha: 0.7 });
      for (let q = 0; q < 13; q++) { const fy = Y(-150 * q - 120); if (fy > -10 && fy < 550) { d.shape(SKETCH.box(px - 10, fy - 3, 20, 6), { fill: '#5a463c', w: 1.1, corner: 30 }); } }
    }
    // per floor: a pair of dials on the rod side, a caged work lamp over the stairs (it is lit live)
    for (let q = 0; q < 9; q++) {
      const fy = -150 * q;
      if (!vis(fy - 150, fy)) continue;
      const rodLeft = q % 2 === 0, dx = rodLeft ? [104, 140] : [856, 820];
      for (let i = 0; i < 2; i++) {
        const gx = dx[i], gy = Y(fy - 104 + i * 6), r = 12 - i * 2;
        d.solid(SKETCH.ell(gx, gy, r, r, 16), { kind: 'dawn' });
        d.ellipse(gx, gy, r, r, { w: 1.3, col: INK });
        d.ellipse(gx, gy, r + 2.5, r + 2.5, { w: 1.6 });
        const a = -2.2 + ((q * 5 + i * 3) % 7) / 7 * 1.6;
        d.line(gx, gy, gx + Math.cos(a) * (r - 3), gy + Math.sin(a) * (r - 3), { w: 1.2, col: P.rust, ov: 0 });
        d.stroke([[gx, gy - r - 2], [gx + (i ? 3 : -2), gy - r - 16]], { w: 1.2, alpha: 0.8 });
      }
      if (q < 8) {
        const lx = q % 2 === 0 ? 835 : 125, ly = Y(fy - 122);
        d.shape(SKETCH.box(lx - 9, ly - 14, 18, 6), { fill: '#5a463c', w: 1.2, corner: 30 });
        d.solid(SKETCH.ell(lx, ly - 2, 8, 8, 14), { kind: 'dark' });
        d.ellipse(lx, ly - 2, 8, 8, { fill: P.coreHot, w: 1.2 });
        for (const a of [-0.9, 0, 0.9]) d.stroke([[lx + Math.sin(a) * 9, ly - 8], [lx + Math.sin(a) * 10, ly + 6]], { w: 1.1, sh: 0 });
        d.stroke(SKETCH.ell(lx, ly - 2, 10, 10, 12, 0, 0.2, 2.9), { w: 1.1, curve: true, sh: 0 });
      }
    }
    // THE JAW, from inside (floors 0 and 1): a long grille, dawn light between its bars
    if (vis(-262, -40)) {
      const gx0 = 300, gx1 = 660, gy0 = Y(-262), gy1 = Y(-48);
      const frame = SKETCH.box(gx0 - 16, gy0 - 16, gx1 - gx0 + 32, gy1 - gy0 + 32);
      d.solid(frame, { kind: 'dark' });
      H.ironPlate(d, frame, { fill: P.soot, fillAlpha: 0.9, tone: () => 0.6, hatchA: 0, gap: 2.4, rivetEdges: [0, 1, 2, 3], spacing: 16, w: 2.6, rustPatches: 2, leave: 0 });
      const win = SKETCH.box(gx0, gy0, gx1 - gx0, gy1 - gy0);
      d.solid(win, { kind: 'dawn', plain: true });
      d.wash(win, '#f2c27a', { alpha: 0.7, off: 0, spread: 1.6, layers: 2, edge: false });
      d.washIn(win, () => {
        d.wash([[gx0, gy1 - 50], [gx0 + 120, gy1 - 76], [gx0 + 240, gy1 - 58], [gx1, gy1 - 84], [gx1, gy1], [gx0, gy1]], '#9aa86a', { alpha: 0.7, off: 0, spread: 1.6, edge: false, curve: true });
        d.wash(SKETCH.ell(gx0 + 250, gy0 + 60, 50, 50, 20), '#fff0c0', { alpha: 0.9, off: 0, spread: 2, edge: false });
      });
      for (let x = gx0 + 10; x < gx1; x += 26) {
        const bar = [[x - 4, gy0 - 2], [x + 4, gy0 - 2], [x + 4, gy1 + 2], [x - 4, gy1 + 2]];
        d.solid(bar, { kind: 'dark' });
        d.shape(bar, { fill: '#2a2421', w: 1.5, corner: 30 });
        d.stroke([[x - 2, gy0 + 4], [x - 2, gy1 - 4]], { w: 1, col: '#f2c98a', alpha: 0.5, sh: 0, layer: 'white' });
      }
      H.ironStencil(d, 'JAW  -  DO NOT OPEN', (gx0 + gx1) / 2, gy0 - 30, 13);
    }
    // THE EYE: the back of the lantern lens, a great amber window with an iris of brass blades
    const ey = Y(E.y);
    if (ey + E.r + 60 > 0 && ey - E.r - 60 < 540) {
      d.solid(SKETCH.ell(E.x, ey, E.r + 32, E.r + 32, 60), { kind: 'dark' });
      d.ellipse(E.x, ey, E.r + 32, E.r + 32, { fill: '#2a2421', w: 3.6, hatch: { a: 30, gap: 2, w: 0.5, tone: (x, y) => 0.45 + ((x - E.x) + (y - ey)) / (E.r * 3) } });
      d.stroke(SKETCH.ell(E.x, ey, E.r + 26, E.r + 26, 40, 0, 3.4, 4.7), { w: 1.6, col: '#f2c98a', alpha: 0.45, curve: true, sh: 0, layer: 'white' });
      for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; H.ironBolt(d, E.x + Math.cos(a) * (E.r + 17), ey + Math.sin(a) * (E.r + 17), 4); }
      const glass = SKETCH.ell(E.x, ey, E.r, E.r, 56);
      d.solid(glass, { kind: 'dawn', plain: true });
      d.washIn(glass, () => {
        d.wash(glass, P.ochre, { alpha: 0.85, off: 0, spread: 1.6, layers: 2, edge: false });
        d.wash(SKETCH.ell(E.x, ey + 10, E.r * 0.74, E.r * 0.68, 40), P.core, { alpha: 0.75, off: 0, spread: 1.8, layers: 2, edge: false });
        d.wash(SKETCH.ell(E.x - 20, ey - 10, E.r * 0.36, E.r * 0.32, 30), P.coreHot, { alpha: 0.85, off: 0, spread: 2, layers: 2, edge: false });
        // outside, reversed through the glass: the meadow hills and a little house, soft
        d.wash([[E.x - E.r - 10, ey + 74], [E.x - 120, ey + 44], [E.x, ey + 66], [E.x + 140, ey + 36], [E.x + E.r + 10, ey + 70], [E.x + E.r + 10, ey + E.r + 10], [E.x - E.r - 10, ey + E.r + 10]], '#b9803e', { alpha: 0.55, off: 0, spread: 2, edge: false, curve: true });
        d.wash(SKETCH.box(E.x + 90, ey + 22, 26, 20), '#8a5a30', { alpha: 0.5, off: 0, spread: 1.4, edge: false });
      });
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2, b = a + Math.PI / 4 + 0.18, r0 = E.r * 0.62, r1 = E.r - 4;
        const blade = [[E.x + Math.cos(a) * r1, ey + Math.sin(a) * r1], [E.x + Math.cos(b) * r1, ey + Math.sin(b) * r1], [E.x + Math.cos(b - 0.1) * r0, ey + Math.sin(b - 0.1) * r0], [E.x + Math.cos(a + 0.25) * (r0 + 6), ey + Math.sin(a + 0.25) * (r0 + 6)]];
        d.washIn(glass, () => { d.wash(blade, P.ochreDeep, { alpha: 0.75, off: 0.6, spread: 1.2 }); d.wash(blade, P.shadowInk, { alpha: 0.12, off: 0, spread: 1.6, edge: false }); });
        d.outline(blade, { w: 1.6, corner: 40, alpha: 0.85 });
        d.stroke([blade[0], blade[1]], { w: 1.4, col: '#fff3cf', alpha: 0.35, sh: 0, layer: 'white' });
      }
      d.stroke(SKETCH.ell(E.x, ey, E.r * 0.62, E.r * 0.62, 40, 0, 0, Math.PI * 2), { w: 2.2, curve: true, alpha: 0.7 });
      for (const a of [Math.PI / 4, -Math.PI / 4]) {
        const c = Math.cos(a), sn = Math.sin(a);
        const bar = [[E.x + c * E.r - sn * 6, ey + sn * E.r + c * 6], [E.x - c * E.r - sn * 6, ey - sn * E.r + c * 6], [E.x - c * E.r + sn * 6, ey - sn * E.r - c * 6], [E.x + c * E.r + sn * 6, ey + sn * E.r - c * 6]];
        d.solid(bar, { kind: 'dark' });
        d.shape(bar, { fill: '#2a2421', w: 1.6, corner: 30 });
      }
      d.ellipse(E.x, ey, 30, 30, { fill: '#2a2421', w: 2 });
      H.ironBolt(d, E.x, ey, 8);
      d.stroke(SKETCH.ell(E.x, ey, E.r - 16, E.r - 16, 30, 0, 3.5, 4.4), { w: 3, col: '#fff3cf', alpha: 0.7, curve: true, sh: 0, layer: 'white' });
      d.stroke(SKETCH.ell(E.x, ey, E.r - 30, E.r - 30, 20, 0, 3.7, 4.1), { w: 1.6, col: '#fff3cf', alpha: 0.6, curve: true, sh: 0, layer: 'white' });
      d.outline(glass, { w: 3, curve: true });
      H.ironStencil(d, 'I KM', E.x, ey + E.r + 56, 16);
    }
    // THE EAR (floors 7 and 8): a round louvred vent, sound tubes curling out of it
    const ex = 480, eyy = -1118, er = 74;
    if (vis(eyy - er - 20, eyy + er + 20)) {
      const ey2 = Y(eyy);
      d.solid(SKETCH.ell(ex, ey2, er + 14, er + 14, 40), { kind: 'dark' });
      d.ellipse(ex, ey2, er + 14, er + 14, { fill: '#2a2421', w: 3, hatch: { a: 40, gap: 2, w: 0.5, tone: () => 0.7 } });
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; H.ironBolt(d, ex + Math.cos(a) * (er + 7), ey2 + Math.sin(a) * (er + 7), 2.8); }
      for (let r = er; r > 10; r -= 12) d.stroke(SKETCH.ell(ex, ey2, r, r, 30, 0, 0, Math.PI * 2), { w: 2, curve: true, alpha: 0.8 });
      d.ellipse(ex, ey2, 12, 12, { fill: P.ochre, w: 1.6 });
      for (const sd of [-1, 1]) H.ironPipe(d, [[ex + sd * (er + 10), ey2 - 10], [ex + sd * (er + 70), ey2 - 50], [ex + sd * (er + 90), ey2 - 120]], 7, { col: '#a37a3c', alpha: 0.75, flanges: [0.2] });
      H.ironStencil(d, 'EAR (LEFT)', ex, ey2 + er + 32, 12);
    }
    // the dome at the top: ribs bending in toward the crown, the bulb's cable trunk coming down
    const crown = Y(-1720);
    if (crown > -200 && crown < 600) {
      for (const t of th) {
        const x = rx(t);
        d.stroke([[x, Y(-1420)], [x + (480 - x) * 0.15, Y(-1540)], [x + (480 - x) * 0.45, Y(-1650)], [480 + (x - 480) * 0.2, crown - 20]], { w: 3.2, curve: true, alpha: 0.85 });
      }
      for (const [yy, rr] of [[-1540, 440], [-1630, 300]]) d.stroke(SKETCH.ell(480, Y(yy) + 50, rr, 56, 40, 0, Math.PI, Math.PI * 2), { w: 2.2, curve: true, alpha: 0.6 });
      H.ironStencil(d, 'HEAD ROOM', 230, Y(-1500), 14);
      H.ironStencil(d, 'QUIET PLEASE', 800, Y(-1560), 12, { rot: 0.05 });
      for (let c = -2; c <= 2; c++) d.stroke([[480 + c * 6, crown - 20], [560 + c * 5, Y(-1620)], [640 + c * 4, Y(-1530)], [642 + c * 2, Y(-1480)]], { w: 4.4, col: ['#4a3a2e', '#5a2a1c', '#3a3a30', '#5a2a1c', '#4a3a2e'][c + 2], sh: 0, curve: true });
    }
    const sp = [[820, 430], [330, 300], [200, 300], [300, 490]][k];
    H.ironStencil(d, ['MIND THE SPARKS', 'EARTH YOURSELF', 'NO RUNNING IN THE HEAD', 'TOP FLOOR: TICK ONLY'][k], sp[0], sp[1], 13);
  }, { flat: true, paper: 'dark', seed: 9200 + k });
  return key;
};
IRON_ART.lampDeck = () => {
  const key = 'iron:lamp:deck';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 960, 40, d => {
    const deck = [[-10, 0], [970, 0], [970, 14], [-10, 14]];
    d.solid(deck, { kind: 'dark' });
    d.wash(deck, '#5a4f48', { alpha: 0.8, off: 0.6 });
    d.hatch(deck, { a: 20, gap: 4, w: 0.7, alpha: 0.6, tone: () => 1 });
    d.stroke([[-10, 0.5], [480, -0.5], [970, 0.5]], { w: 2.8, curve: true, sh: 0 });
    d.stroke([[-10, 1.6], [970, 1.6]], { w: 1.2, col: '#e8c890', alpha: 0.35, sh: 0, layer: 'white' });
    d.stroke([[-10, 14], [480, 15], [970, 14]], { w: 1.6, curve: true, sh: 0 });
    // a girder under the deck: a lattice
    for (let x = 0; x < 960; x += 40) { d.stroke([[x, 14], [x + 20, 30]], { w: 1.2, alpha: 0.7 }); d.stroke([[x + 20, 30], [x + 40, 14]], { w: 1.2, alpha: 0.7 }); }
    d.stroke([[-10, 30], [970, 30]], { w: 1.4, alpha: 0.7 });
    for (let x = 12; x < 960; x += 40) d.rivet(x, 7, 1.4);
  }, { flat: true, paper: 'dark', seed: 9300 });
  return key;
};
IRON_ART.lampStep = (side = 1) => {
  const key = 'iron:lamp:step:' + side;
  if (!SKETCH.has(key)) SKETCH.sheet(key, 90, 100, d => {
    const P = IRON_P, H = IRON_ART.helpers, x0 = 10, top = 15, bot = 90, x1 = 80;
    // an iron plinth: a tread plate with hazard stripes on top, a riveted front with rungs to climb
    const box = [[x0, top], [x1, top], [x1, bot], [x0, bot]];
    d.solid(box, { kind: 'dark' });
    H.ironPlate(d, box, { fill: '#4a3c34', fillAlpha: 0.8, tone: (x, y) => 0.45 + (y - top) / 140, hatchA: 80, gap: 2.4, rivetEdges: [1, 3], spacing: 12, w: 2.2, rustPatches: 1, leave: 0 });
    const tread = [[x0 - 3, top], [x1 + 3, top], [x1 + 3, top + 8], [x0 - 3, top + 8]];
    d.solid(tread, { kind: 'dark' });
    d.shape(tread, { fill: '#2a2421', w: 1.6, corner: 30 });
    for (let x = x0; x < x1; x += 10) d.shape([[x, top + 1], [x + 5, top + 1], [x + 1, top + 7], [x - 4, top + 7]], { fill: P.core, w: 0.6, corner: 30 });
    d.stroke([[x0 - 3, top], [x1 + 3, top]], { w: 2.2, col: '#f2c98a', alpha: 0.6, sh: 0, layer: 'white' });
    const rx0 = x0 + 16, rx1 = x1 - 16;
    for (let y = top + 22; y < bot - 4; y += 14) { d.stroke([[rx0, y], [rx1, y + 0.5]], { w: 2.4, col: P.ironLight, sh: 0 }); d.rivet(rx0, y, 1.3); d.rivet(rx1, y, 1.3); }
    // a chalk arrow up beside the rungs
    const ax = side > 0 ? x0 - 0 : x1;
    d.stroke([[ax + (side > 0 ? 6 : -6), bot - 18], [ax + (side > 0 ? 6 : -6), top + 30]], { w: 2.2, col: P.core, sh: 0 });
    d.stroke([[ax + (side > 0 ? -1 : -13), top + 38], [ax + (side > 0 ? 6 : -6), top + 28], [ax + (side > 0 ? 13 : 1), top + 38]], { w: 2.2, col: P.core, sh: 0 });
  }, { ox: 10, oy: 90, paper: 'dark', seed: 9310 + (side > 0 ? 0 : 1) });
  return key;
};
IRON_ART.lampRod = () => {
  const key = 'iron:lamp:rod';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 70, 140, d => {
    const P = IRON_P, H = IRON_ART.helpers, fx = 30, fy = 130;
    // a heavy base clamp, the copper rod with insulator rings, a rubber grip, a copper ball on top
    const base = [[fx - 20, fy], [fx + 20, fy], [fx + 16, fy - 10], [fx - 16, fy - 10]];
    d.solid(base, { kind: 'dark' });
    d.shape(base, { fill: '#5a463c', w: 1.8, corner: 30 });
    H.ironBolt(d, fx - 12, fy - 5, 2.4); H.ironBolt(d, fx + 12, fy - 5, 2.4);
    const rod = [[fx - 5, fy - 10], [fx + 5, fy - 10], [fx + 4.5, fy - 104], [fx - 4.5, fy - 104]];
    d.solid(rod, { kind: 'dark' });
    d.wash(rod, '#c0703a', { alpha: 0.9, off: 0.3 });
    d.outline(rod, { w: 1.4, corner: 30 });
    d.stroke([[fx - 1.5, fy - 12], [fx - 1.5, fy - 102]], { w: 1, col: '#ffd0a0', alpha: 0.7, sh: 0, layer: 'white' });
    for (const y of [fy - 24, fy - 31, fy - 38]) d.shape(SKETCH.ell(fx, y, 10, 3.5, 12), { fill: '#d8d0bc', w: 1.1, curve: true });
    const grip = SKETCH.box(fx - 7, fy - 74, 14, 24);
    d.shape(grip, { fill: '#5a2a1c', w: 1.4, corner: 30 });
    for (let y = fy - 70; y < fy - 52; y += 4) d.line(fx - 7, y, fx + 7, y + 1, { w: 0.8, ov: 0 });
    d.solid(SKETCH.ell(fx, fy - 110, 10, 10, 16), { kind: 'dark' });
    d.ellipse(fx, fy - 110, 10, 10, { fill: '#c0703a', w: 1.6, hatch: { a: 45, gap: 1.8, w: 0.4, tone: (x, y) => (x - fx + y - fy + 118) / 16 } });
    d.stroke(SKETCH.ell(fx, fy - 110, 5, 5, 10, 0, 3.6, 5), { w: 1.2, col: '#ffe0c0', curve: true, sh: 0, layer: 'white' });
    // the earthing strap to the floor, a stencil plate
    d.stroke([[fx + 4, fy - 16], [fx + 18, fy - 8], [fx + 30, fy - 2]], { w: 2.2, col: '#c0703a', curve: true, sh: 0 });
    d.shape(SKETCH.box(fx + 6, fy - 96, 26, 12), { fill: '#2a2421', w: 1, corner: 30 });
    d.word('EARTH', fx + 19, fy - 87, 6.5, { align: 'center', col: P.core, w: 1 });
  }, { ox: 30, oy: 130, paper: 'dark', seed: 9320 });
  return key;
};
IRON_ART.lampKnob = () => {
  const key = 'iron:lamp:knob';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 30, 24, d => {
    const cx = 15, fy = 22;
    d.shape([[cx - 7, fy], [cx + 7, fy], [cx + 4, fy - 6], [cx - 4, fy - 6]], { fill: '#d8d0bc', w: 1.1, corner: 30 });
    d.line(cx - 6, fy - 3, cx + 6, fy - 3, { w: 0.7, ov: 0 });
    d.stroke([[cx, fy - 6], [cx, fy - 10]], { w: 2 });
    d.ellipse(cx, fy - 14, 5, 5, { fill: IRON_P.ochre, w: 1.4 });
    d.stroke(SKETCH.ell(cx, fy - 14, 3, 3, 8, 0, 3.6, 5), { w: 1, col: '#fff3cf', curve: true, sh: 0, layer: 'white' });
  }, { ox: 15, oy: 22, paper: 'dark', seed: 9330 });
  return key;
};
IRON_ART.lampMat = () => {
  const key = 'iron:lamp:mat';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 80, 30, d => {
    const cx = 40, fy = 26;
    const mat = [[cx - 32, fy], [cx + 32, fy], [cx + 30, fy - 6], [cx - 30, fy - 6]];
    d.solid(mat, { kind: 'dark' });
    d.shape(mat, { fill: '#3a2a2a', w: 1.6, corner: 30 });
    for (let x = cx - 28; x < cx + 28; x += 5) d.line(x, fy - 5, x + 1, fy - 1, { w: 0.8, col: '#6a4a40', ov: 0 });
    d.word('SAFE', cx, fy - 10, 9, { align: 'center', col: IRON_P.core, w: 1.4 });
  }, { ox: 40, oy: 26, paper: 'dark', seed: 9340 });
  return key;
};
// Tick's chair: an iron throne far too big for him, seen side on (stool, seat, tall back), studded red leather,
// pedals with wooden blocks strapped on, a winding key in its back
IRON_ART.lampChair = () => {
  const key = 'iron:lamp:chair';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 360, 340, d => {
    const P = IRON_P, H = IRON_ART.helpers, X = r => 170 + r, fy = 320, LEATHER = '#8a3426';
    // the footstool (world x 520..580, 55 high): a padded drum on stubby legs
    const stool = [[X(-100), fy - 50], [X(-40), fy - 50], [X(-44), fy - 10], [X(-96), fy - 10]];
    d.solid(stool.concat([[X(-96), fy], [X(-44), fy]]), { kind: 'dark' });
    d.shape(stool, { fill: LEATHER, w: 2, corner: 40, hatch: { a: 70, gap: 2.2, w: 0.45, alpha: 0.5, tone: (x, y) => 0.2 + (y - fy + 50) / 50 } });
    d.shape([[X(-104), fy - 56], [X(-36), fy - 56], [X(-38), fy - 48], [X(-102), fy - 48]], { fill: '#5a463c', w: 1.6, corner: 30 });
    for (const x of [X(-92), X(-48)]) d.shape([[x - 4, fy - 10], [x + 4, fy - 10], [x + 3, fy], [x - 3, fy]], { fill: '#2a2421', w: 1.2, corner: 30 });
    for (let x = X(-92); x < X(-44); x += 12) d.ellipse(x, fy - 44, 1.6, 1.6, { fill: P.core, w: 0.7 });
    // the seat (580..700, 110 high): an upholstered side panel in an iron frame, carved trim, claw feet
    const seat = [[X(-40), fy - 110], [X(80), fy - 110], [X(80), fy], [X(-40), fy]];
    d.solid(seat, { kind: 'dark' });
    H.ironPlate(d, seat, { fill: '#4a3c34', fillAlpha: 0.85, tone: (x, y) => 0.35 + (y - fy + 110) / 200, hatchA: 80, gap: 2.4, w: 2.4, rustPatches: 1, leave: 0 });
    const panel = [[X(-30), fy - 92], [X(70), fy - 92], [X(70), fy - 22], [X(-30), fy - 22]];
    d.shape(panel, { fill: LEATHER, w: 1.8, corner: 40, hatch: { a: 60, gap: 2.2, w: 0.45, alpha: 0.5, tone: (x, y) => 0.15 + (y - fy + 92) / 90 } });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const bx = X(-18 + c * 26 + (r % 2) * 13), by = fy - 80 + r * 22; if (bx < X(66)) { d.ellipse(bx, by, 2, 2, { fill: P.core, w: 0.7 }); d.stroke([[bx - 6, by - 5], [bx, by], [bx + 6, by - 5]], { w: 0.7, alpha: 0.6, sh: 0 }); } }
    const cush = [[X(-46), fy - 112], [X(84), fy - 112], [X(82), fy - 100], [X(20), fy - 96], [X(-44), fy - 100]];
    d.solid(cush, { kind: 'dark' });
    d.shape(cush, { fill: LEATHER, w: 1.8, corner: 40 });
    d.stroke([[X(-44), fy - 111], [X(82), fy - 111]], { w: 1.6, col: '#f2b28a', alpha: 0.5, sh: 0, layer: 'white' });
    for (const x of [X(-36), X(76)]) d.shape([[x - 12, fy], [x + 12, fy], [x + 7, fy - 14], [x - 7, fy - 14]], { fill: '#2a2421', w: 1.6, corner: 30 });
    // the pedals: two long levers out the front of the seat, wooden blocks strapped on top (Tick's legs are short)
    for (const [px, py] of [[X(-34), fy - 70], [X(-20), fy - 54]]) {
      d.stroke([[px + 34, py - 8], [px, py]], { w: 3.2 });
      d.shape(SKETCH.box(px - 14, py - 3, 18, 7), { fill: P.ochreDeep, w: 1.4, corner: 30 });
      d.shape(SKETCH.box(px - 12, py - 13, 13, 10), { fill: '#a37a3c', w: 1.2, corner: 30, hatch: { a: 0, gap: 2, w: 0.4, alpha: 0.5 } });
      d.stroke([[px - 12, py - 8], [px + 1, py - 8]], { w: 0.9, col: '#5a2a1c', sh: 0 });
    }
    // the back (700..728, 270 high): a tall slab, an arched top, a round crest with a T, the winding key
    const back = [[X(80), fy - 250], [X(90), fy - 268], [X(100), fy - 268], [X(110), fy - 250], [X(110), fy], [X(80), fy]];
    d.solid(back, { kind: 'dark' });
    H.ironPlate(d, back, { fill: '#4a3c34', fillAlpha: 0.85, tone: (x, y) => 0.3 + (x - X(80)) / 50, hatchA: 90, gap: 2.2, rivetEdges: [4], spacing: 16, w: 2.4, rustPatches: 1, leave: 0 });
    d.shape([[X(84), fy - 240], [X(106), fy - 240], [X(106), fy - 118], [X(84), fy - 118]], { fill: LEATHER, w: 1.6, corner: 40, hatch: { a: 90, gap: 2.2, w: 0.45, alpha: 0.5 } });
    for (let y = fy - 228; y < fy - 124; y += 18) d.ellipse(X(95), y, 1.8, 1.8, { fill: P.core, w: 0.7 });
    d.solid(SKETCH.ell(X(95), fy - 282, 18, 18, 20), { kind: 'dark' });
    d.ellipse(X(95), fy - 282, 18, 18, { fill: P.ochre, w: 2, hatch: { a: 45, gap: 2, w: 0.45, alpha: 0.5, tone: (x, y) => (x - X(77) + y - fy + 300) / 36 } });
    d.ellipse(X(95), fy - 282, 12, 12, { w: 1.2 });
    d.word('T', X(95), fy - 276, 14, { align: 'center', col: INK_DARK(), w: 2 });
    d.stroke([[X(110), fy - 160], [X(132), fy - 160]], { w: 4.4 });
    for (const sy of [-1, 1]) d.ellipse(X(140), fy - 160 + sy * 11, 7, 10, { fill: P.ochre, w: 1.6, hatch: { a: 45, gap: 2, w: 0.4, alpha: 0.5 } });
    d.ellipse(X(134), fy - 160, 4, 4, { fill: P.ochreDeep, w: 1.2 });
    // an armrest along the back's front edge, and the SWAP lever box beside the chair
    d.shape([[X(46), fy - 156], [X(82), fy - 160], [X(82), fy - 146], [X(50), fy - 144]], { fill: '#5a463c', w: 1.8, corner: 30 });
    d.shape(SKETCH.ell(X(46), fy - 150, 6, 7, 10), { fill: P.ochre, w: 1.4, curve: true });
    d.stroke([[X(52), fy - 144], [X(56), fy - 112]], { w: 3 });
    const lb = SKETCH.box(X(122), fy - 50, 40, 50);
    d.solid(lb, { kind: 'dark' });
    d.shape(lb, { fill: '#3a322d', w: 1.6, corner: 30, hatch: { a: 45, gap: 2.2, w: 0.45, alpha: 0.5 } });
    d.stroke([[X(142), fy - 46], [X(154), fy - 86]], { w: 3, col: P.ironLight });
    d.ellipse(X(154), fy - 88, 5, 5, { fill: '#a7462a', w: 1.4 });
    d.word('SWAP', X(142), fy - 20, 9, { align: 'center', col: '#ffd9a8', w: 1.3 });
  }, { ox: 170, oy: 320, paper: 'dark', seed: 9350 });
  return key;
};
const INK_DARK = () => '#2a1a12';
// the bulb: a big pear of glass, a glowing zig-zag filament on its wires, a brass screw cap on top
IRON_ART.lampBulb = () => {
  const key = 'iron:lamp:bulb';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 120, 150, d => {
    const P = IRON_P, cx = 60, cy = 80;
    const glass = [];
    for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, r = 40 + (Math.sin(a) < 0 ? -Math.sin(a) * -6 : 0), x = Math.cos(a) * 42, y = Math.sin(a) * (Math.sin(a) < 0 ? 52 : 40); glass.push([cx + x * (Math.sin(a) < 0 ? 0.75 + 0.25 * (1 + Math.sin(a)) : 1), cy + y]); void r; }
    d.solid(glass, { kind: 'dark', curve: true });
    d.wash(glass, '#fff0c0', { alpha: 0.55, off: 0, spread: 1.6, layers: 2, edge: false, op: 'source-over', layer: 'white' });
    d.wash(SKETCH.ell(cx, cy + 4, 26, 24, 20), P.coreHot, { alpha: 0.9, off: 0, spread: 1.8, op: 'source-over', layer: 'white' });
    // the filament on two support wires
    d.stroke([[cx - 12, cy - 44], [cx - 14, cy - 2]], { w: 1, sh: 0 }); d.stroke([[cx + 12, cy - 44], [cx + 14, cy - 2]], { w: 1, sh: 0 });
    const fil = []; for (let i = 0; i <= 10; i++) fil.push([cx - 14 + i * 2.8, cy - 2 + (i % 2 ? -7 : 0)]);
    d.stroke(fil, { w: 2.2, col: '#fff8e0', sh: 0, layer: 'white' });
    d.stroke(fil, { w: 0.8, col: '#ff9a3a', sh: 0, alpha: 0.8 });
    d.outline(glass, { w: 2.4, curve: true, c: [cx, cy] });
    d.stroke(SKETCH.ell(cx - 6, cy, 30, 34, 20, 0, 3.4, 4.4), { w: 3, col: '#ffffff', curve: true, sh: 0, layer: 'white', alpha: 0.9 });
    d.stroke(SKETCH.ell(cx - 6, cy, 22, 26, 14, 0, 1.7, 2.2), { w: 1.6, col: '#ffffff', curve: true, sh: 0, layer: 'white', alpha: 0.7 });
    // the cap: brass threads
    const cap = [[cx - 18, cy - 44], [cx + 18, cy - 44], [cx + 16, cy - 72], [cx - 16, cy - 72]];
    d.solid(cap, { kind: 'dark' });
    d.shape(cap, { fill: P.ochre, w: 1.8, corner: 30, hatch: { a: 90, gap: 2, w: 0.45, alpha: 0.5, tone: x => (x - cx + 18) / 36 } });
    for (let y = cy - 68; y < cy - 46; y += 5) d.stroke([[cx - 17, y + 2], [cx + 17, y - 1]], { w: 1.2, sh: 0 });
    d.shape(SKETCH.box(cx - 8, cy - 78, 16, 6), { fill: '#2a2421', w: 1.2, corner: 30 });
  }, { ox: 60, oy: 80, paper: 'dark', seed: 9360 });
  return key;
};
IRON_ART.lampCage = () => {
  const key = 'iron:lamp:cage';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 150, 170, d => {
    const cx = 75, cy = 92;
    for (const k of [-0.9, -0.5, -0.15, 0.15, 0.5, 0.9]) {
      const pts = []; for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + i / 12 * Math.PI; pts.push([cx + Math.sin(k * 1.3) * 58 * Math.cos(a) * (0.6 + 0.4 * Math.cos(a)) + k * 4, cy - 18 + Math.sin(a) * 64]); }
      d.stroke(pts, { w: 1.8, curve: true, alpha: 0.9 });
    }
    for (const [yy, rr] of [[cy - 40, 44], [cy + 6, 58], [cy + 36, 40]]) d.stroke(SKETCH.ell(cx, yy, rr, 7, 20, 0, 0, Math.PI * 2), { w: 1.6, curve: true });
    d.shape(SKETCH.box(cx - 22, cy - 86, 44, 8), { fill: '#5a463c', w: 1.6, corner: 30 });
    d.ellipse(cx, cy + 48, 6, 4, { fill: IRON_P.ochre, w: 1.2 });
  }, { ox: 75, oy: 92, paper: 'dark', seed: 9370 });
  return key;
};
IRON_ART.lampSpanner = () => {
  const key = 'iron:lamp:spanner';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 64, 30, d => {
    const cx = 32, cy = 15;
    const sp = [[cx - 18, cy - 3], [cx + 14, cy - 3], [cx + 18, cy - 9], [cx + 28, cy - 9], [cx + 24, cy - 2], [cx + 18, cy - 2], [cx + 18, cy + 2], [cx + 24, cy + 2], [cx + 28, cy + 9], [cx + 18, cy + 9], [cx + 14, cy + 3], [cx - 18, cy + 3],
      [cx - 24, cy + 7], [cx - 30, cy + 2], [cx - 30, cy - 2], [cx - 24, cy - 7]];
    d.solid(sp, { kind: 'dark' });
    d.shape(sp, { fill: '#9aa6ad', w: 1.6, corner: 30, hatch: { a: 0, gap: 2, w: 0.4, alpha: 0.4 } });
    d.ellipse(cx - 25, cy, 2.4, 2.4, { fill: '#2a2421', w: 0.8 });
    d.stroke([[cx - 14, cy - 1.5], [cx + 10, cy - 1.5]], { w: 1, col: '#ffffff', sh: 0, layer: 'white', alpha: 0.7 });
  }, { ox: 32, oy: 15, paper: 'dark', seed: 9380 });
  return key;
};
IRON_ART.lampClaw = (f = 0) => {
  const key = 'iron:lamp:claw:' + f;
  if (!SKETCH.has(key)) SKETCH.sheet(key, 80, 80, d => {
    const P = IRON_P, cx = 40, wy = 14;
    d.shape(SKETCH.box(cx - 12, wy - 10, 24, 18), { fill: '#5a463c', w: 1.8, corner: 30 });
    d.rivet(cx - 6, wy - 2, 1.6); d.rivet(cx + 6, wy - 2, 1.6);
    // three hooked fingers, open wide (f 0) or curled shut (f 1)
    for (const s of [-1, 0, 1]) {
      const open = f === 0, a = s * (open ? 0.7 : 0.25);
      const k1 = [cx + s * 8 + Math.sin(a) * 18, wy + 8 + Math.cos(a) * 18], k2 = [k1[0] + Math.sin(a * (open ? 1.2 : -1.5)) * 18, k1[1] + Math.cos(a) * 14];
      const tip = [k2[0] - s * (open ? 2 : 8), k2[1] + (open ? 8 : 2)];
      d.stroke([[cx + s * 8, wy + 8], k1, k2, tip], { w: 5, col: '#2a2421', sh: 0 });
      d.stroke([[cx + s * 8, wy + 8], k1, k2, tip], { w: 2, col: P.ironLight, sh: 0 });
      d.ellipse(k1[0], k1[1], 3, 3, { fill: P.ochre, w: 1 });
    }
  }, { ox: 40, oy: 14, paper: 'dark', seed: 9390 + f });
  return key;
};
