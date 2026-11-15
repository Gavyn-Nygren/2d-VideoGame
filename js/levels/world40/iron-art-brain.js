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
    const P = IRON_P, H = IRON_ART.helpers, Y0 = 60 - 540 * (k + 1), Y = y => y - Y0, E = IRON_ART.LAMP_EYE;
    // the round wall: ribs bunch up toward the sides (it curves away), plate rows between them bend a little
    const th = [-1.25, -1, -0.72, -0.42, -0.14, 0.14, 0.42, 0.72, 1, 1.25], rx = t => 480 + 560 * Math.sin(t) / Math.sin(1.25) * 0.9;
    const bend = (x, y) => y + 10 * Math.cos((x - 480) / 560 * 1.4) - 10;
    for (let row = -1; row < 16; row++) {
      const ya = -150 * row + 60, yb = ya - 150;                 // world rows match the floors
      if (yb > Y0 + 560 || ya < Y0 - 20) continue;
      for (let i = 0; i < th.length - 1; i++) {
        const xa = rx(th[i]), xb = rx(th[i + 1]), edge = Math.abs(th[i] + th[i + 1]) / 2.5;
        const pts = [[xa, Y(bend(xa, yb))], [xb, Y(bend(xb, yb))], [xb, Y(bend(xb, ya))], [xa, Y(bend(xa, ya))]];
        d.wash(pts, (row + i) % 2 ? '#342d2a' : '#3a322e', { alpha: 0.55, off: 1.2, spread: 1.2, blooms: 1 });
        // darker toward the sides (the wall turns away from the eye's light)
        d.hatch(pts, { a: 80 + (i - 4) * 4, gap: 3.6 - edge * 1.2, w: 0.5, alpha: 0.18 + edge * 0.3, tone: (x2, y2) => 0.3 + edge + (y2 - Y(bend(x2, yb))) / 300 });
        d.outline(pts, { w: 1, corner: 40, alpha: 0.3 });
        d.rivets(xa + 6, Y(bend(xa, yb)) + 7, xb - 6, Y(bend(xb, yb)) + 7, Math.max(3, Math.round((xb - xa) / 16)), { r: 1.1, rust: 0.15 });
      }
    }
    // the ribs: tall curved iron bands with a lit edge
    for (const t of th.slice(1, -1)) {
      const x = rx(t), w = 10 * Math.cos(t) + 4;
      const band = [[x - w, -20], [x + w, -20], [x + w, 560], [x - w, 560]];
      d.wash(band, '#2a2421', { alpha: 0.7, off: 0.6, spread: 1 });
      d.stroke([[x - w, -20], [x - w, 560]], { w: 1.2, alpha: 0.5 });
      d.stroke([[x + w, -20], [x + w, 560]], { w: 1.2, alpha: 0.5 });
      d.stroke([[x + (t < 0 ? w - 2 : -w + 2), -20], [x + (t < 0 ? w - 2 : -w + 2), 560]], { w: 1, col: '#e8c890', alpha: 0.22, sh: 0, layer: 'white' });
      for (let y = 10 + ((Y0 % 30) + 30) % 30; y < 540; y += 30) d.rivet(x, y, 1.3);
    }
    // the side walls: racks of thinking valves (left), a switchboard (right), cable trunks between
    for (const sd of [-1, 1]) {
      const x0 = sd < 0 ? 70 : 760;
      for (let row = 0; row < 12; row++) {
        const wy = -150 * row - 95;                               // half way up each floor
        if (wy < Y0 - 80 || wy > Y0 + 600 || row === 0) continue;
        const yy = Y(wy);
        if ((row + (sd < 0 ? 0 : 1)) % 2 === 0) {
          // a valve rack: glass tubes in a frame (their glow is faint: they think slowly)
          const box = SKETCH.box(x0, yy - 34, 130, 60);
          d.solid(box, { kind: 'dark' });
          d.shape(box, { fill: '#2a2421', w: 1.6, corner: 30 });
          for (let i = 0; i < 6; i++) {
            const vx = x0 + 14 + i * 20, tube = [[vx - 6, yy + 18], [vx - 6, yy - 12], [vx - 4, yy - 22], [vx + 4, yy - 22], [vx + 6, yy - 12], [vx + 6, yy + 18]];
            d.wash(tube, i % 2 ? '#8a6a3a' : '#a37a3c', { alpha: 0.5, off: 0.4, spread: 1 });
            d.outline(tube, { w: 1, curve: true, alpha: 0.8 });
            d.stroke([[vx - 2, yy + 14], [vx - 2, yy - 6], [vx + 2, yy - 10], [vx + 2, yy + 14]], { w: 0.8, col: '#ffd27a', alpha: 0.6, sh: 0, layer: 'white' });
            d.shape(SKETCH.box(vx - 7, yy + 18, 14, 6), { fill: '#5a463c', w: 1, corner: 30 });
          }
          H.ironStencil(d, ['THINKING', 'DO NOT DISTURB', 'IDEAS', 'MEMORY', 'GRUMBLES', 'PLANS'][row % 6], x0 + 65, yy - 42, 10);
        } else {
          // a switchboard: dials and knife switches
          const box = SKETCH.box(x0, yy - 40, 130, 70);
          d.solid(box, { kind: 'dark' });
          d.shape(box, { fill: '#3a322d', w: 1.6, corner: 30, hatch: { a: 70, gap: 2.4, w: 0.45, alpha: 0.4 } });
          for (let i = 0; i < 3; i++) {
            const gx = x0 + 22 + i * 43, gy = yy - 18;
            d.solid(SKETCH.ell(gx, gy, 12, 12, 16), { kind: 'dawn' });
            d.ellipse(gx, gy, 12, 12, { w: 1.4, col: SKETCH.INK });
            d.ellipse(gx, gy, 14, 14, { w: 1.6 });
            const a = -2.4 + ((row * 3 + i * 7) % 10) / 10 * 1.8;
            d.line(gx, gy, gx + Math.cos(a) * 9, gy + Math.sin(a) * 9, { w: 1.3, col: P.rust, ov: 0 });
            d.stroke([[gx - 8, yy + 14], [gx + 2, yy + 2]], { w: 2, col: P.ochre, sh: 0 });
            d.ellipse(gx - 8, yy + 14, 2.4, 2.4, { fill: '#2a2421', w: 1 });
          }
          d.rivets(x0 + 6, yy - 34, x0 + 124, yy - 34, 9, { r: 1.1 });
        }
      }
      // a cable trunk up the wall: three bundled cables in clamps
      const tx = sd < 0 ? 218 : 742;
      for (let c = -1; c <= 1; c++) d.stroke([[tx + c * 6, -20], [tx + c * 6 + 2, 270], [tx + c * 6, 560]], { w: 4, col: ['#4a3a2e', '#5a2a1c', '#3a3a30'][c + 1], sh: 0, curve: true, alpha: 0.85 });
      for (let y = ((40 - Y0) % 120 + 120) % 120; y < 540; y += 120) { d.shape(SKETCH.box(tx - 12, y - 4, 24, 8), { fill: '#6a5446', w: 1.2, corner: 30 }); d.rivet(tx, y, 1.2); }
    }
    // the back of the lantern eye: a great amber window with an iris of brass blades, seen from inside
    const ey = Y(E.y);
    if (ey + E.r + 60 > 0 && ey - E.r - 60 < 540) {
      const rim = SKETCH.ell(E.x, ey, E.r + 30, E.r + 30, 60);
      d.solid(rim, { kind: 'dark' });
      d.ellipse(E.x, ey, E.r + 30, E.r + 30, { fill: '#2a2421', w: 3.4, hatch: { a: 30, gap: 2, w: 0.5, tone: (x, y) => 0.5 + ((x - E.x) + (y - ey)) / (E.r * 3) } });
      for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; H.ironBolt(d, E.x + Math.cos(a) * (E.r + 16), ey + Math.sin(a) * (E.r + 16), 4); }
      // the glass: amber, brighter in the middle, with the world outside a soft blur
      d.solid(SKETCH.ell(E.x, ey, E.r, E.r, 56), { kind: 'dawn', plain: true });
      d.wash(SKETCH.ell(E.x, ey, E.r, E.r, 48), P.ochre, { alpha: 0.85, off: 0, spread: 1.6, layers: 2, edge: false });
      d.wash(SKETCH.ell(E.x, ey + 10, E.r * 0.72, E.r * 0.66, 40), P.core, { alpha: 0.75, off: 0, spread: 1.8, layers: 2, edge: false });
      d.wash(SKETCH.ell(E.x - 20, ey - 10, E.r * 0.36, E.r * 0.32, 30), P.coreHot, { alpha: 0.85, off: 0, spread: 2, layers: 2, edge: false });
      // outside, through the glass: the far meadow hills at dawn, blurred and reversed
      d.wash([[E.x - E.r, ey + 70], [E.x - 120, ey + 40], [E.x, ey + 60], [E.x + 140, ey + 34], [E.x + E.r, ey + 64], [E.x + E.r, ey + E.r], [E.x - E.r, ey + E.r]], '#b9803e', { alpha: 0.5, off: 0, spread: 2, edge: false, curve: true });
      // the iris: eight brass blades round an open middle (held open: the Colossus is looking)
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2, b = a + Math.PI / 4 + 0.18, r0 = E.r * 0.62, r1 = E.r - 4;
        const blade = [[E.x + Math.cos(a) * r1, ey + Math.sin(a) * r1], [E.x + Math.cos(b) * r1, ey + Math.sin(b) * r1], [E.x + Math.cos(b - 0.1) * r0, ey + Math.sin(b - 0.1) * r0], [E.x + Math.cos(a + 0.25) * (r0 + 6), ey + Math.sin(a + 0.25) * (r0 + 6)]];
        d.wash(blade, P.ochreDeep, { alpha: 0.65, off: 0.6, spread: 1.2 });
        d.hatch(blade, { a: (a * 57 + 45) % 180, gap: 2.6, w: 0.5, alpha: 0.45, force: true });
        d.outline(blade, { w: 1.6, corner: 40 });
      }
      d.stroke(SKETCH.ell(E.x, ey, E.r * 0.62, E.r * 0.62, 40, 0, 0, Math.PI * 2), { w: 2.2, curve: true, alpha: 0.7 });
      // mullions: a cross of iron bars and a ring, the rivets where they meet
      for (const a of [0, Math.PI / 2]) {
        const bar = [[E.x + Math.cos(a) * E.r - Math.sin(a) * 7, ey + Math.sin(a) * E.r + Math.cos(a) * 7], [E.x - Math.cos(a) * E.r - Math.sin(a) * 7, ey - Math.sin(a) * E.r + Math.cos(a) * 7],
          [E.x - Math.cos(a) * E.r + Math.sin(a) * 7, ey - Math.sin(a) * E.r - Math.cos(a) * 7], [E.x + Math.cos(a) * E.r + Math.sin(a) * 7, ey + Math.sin(a) * E.r - Math.cos(a) * 7]];
        d.solid(bar, { kind: 'dark' });
        d.shape(bar, { fill: '#2a2421', w: 1.6, corner: 30 });
      }
      d.ellipse(E.x, ey, 30, 30, { fill: '#2a2421', w: 2 });
      H.ironBolt(d, E.x, ey, 8);
      // the glass's own shine, and the stencil seen backwards from inside
      d.stroke(SKETCH.ell(E.x, ey, E.r - 16, E.r - 16, 30, 0, 3.5, 4.4), { w: 3, col: '#fff3cf', alpha: 0.7, curve: true, sh: 0, layer: 'white' });
      d.stroke(SKETCH.ell(E.x, ey, E.r - 30, E.r - 30, 20, 0, 3.7, 4.1), { w: 1.6, col: '#fff3cf', alpha: 0.6, curve: true, sh: 0, layer: 'white' });
      d.outline(SKETCH.ell(E.x, ey, E.r, E.r, 56), { w: 3, curve: true });
      H.ironStencil(d, 'I KM', E.x, ey + E.r + 52, 16);
    }
    // the dome at the top: ribs bending in toward the crown, the bulb's cable trunk coming down
    const crown = Y(-1720);
    if (crown > -200 && crown < 600) {
      for (const t of th) {
        const x = rx(t);
        d.stroke([[x, Y(-1450)], [x + (480 - x) * 0.15, Y(-1560)], [x + (480 - x) * 0.45, Y(-1660)], [480 + (x - 480) * 0.2, crown - 20]], { w: 3, curve: true, alpha: 0.8 });
      }
      for (const yy of [-1560, -1640]) d.stroke(SKETCH.ell(480, Y(yy) + 40, 470 - (-yy - 1500) * 2.2, 60, 40, 0, Math.PI, Math.PI * 2), { w: 2, curve: true, alpha: 0.6 });
      H.ironStencil(d, 'HEAD ROOM', 260, Y(-1520), 14);
      H.ironStencil(d, 'QUIET PLEASE', 760, Y(-1580), 12, { rot: 0.05 });
      // the bulb's power: a fat cable trunk from the crown to the socket
      for (let c = -2; c <= 2; c++) d.stroke([[480 + c * 6, crown - 20], [560 + c * 5, Y(-1620)], [640 + c * 4, Y(-1530)], [642 + c * 2, Y(-1480)]], { w: 4.4, col: ['#4a3a2e', '#5a2a1c', '#3a3a30', '#5a2a1c', '#4a3a2e'][c + 2], sh: 0, curve: true });
    }
    H.ironStencil(d, ['MIND THE SPARKS', 'EARTH YOURSELF', 'NO RUNNING IN THE HEAD', 'TOP FLOOR: TICK ONLY'][k], k % 2 ? 300 : 660, k === 1 ? 470 : 80, 13);
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
    const box = [[x0, top], [x1, top], [x1, bot], [x0, bot]];
    d.solid(box, { kind: 'dark' });
    H.ironPlate(d, box, { fill: '#6a5446', fillAlpha: 0.7, tone: (x, y) => 0.25 + (y - top) / 120, hatchA: 70, gap: 2.6, rivetEdges: [0, 2], spacing: 12, w: 2.2, rustPatches: 1 });
    d.stroke([[x0, top + 1], [x1, top + 1]], { w: 2.4, col: '#e8c890', alpha: 0.5, sh: 0, layer: 'white' });
    // a chalk arrow up, on the side the stairs climb from
    const ax = side > 0 ? x0 + 22 : x1 - 22;
    d.stroke([[ax, bot - 14], [ax, top + 24]], { w: 2.4, col: P.core, sh: 0 });
    d.stroke([[ax - 8, top + 34], [ax, top + 22], [ax + 8, top + 34]], { w: 2.4, col: P.core, sh: 0 });
    d.word('UP', side > 0 ? x1 - 20 : x0 + 20, top + 42, 11, { align: 'center', col: L_CHALK, w: 1.6 });
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
    const rod = [[fx - 3.5, fy - 10], [fx + 3.5, fy - 10], [fx + 3, fy - 104], [fx - 3, fy - 104]];
    d.solid(rod, { kind: 'dark' });
    d.wash(rod, '#c0703a', { alpha: 0.9, off: 0.3 });
    d.outline(rod, { w: 1.4, corner: 30 });
    d.stroke([[fx - 1.5, fy - 12], [fx - 1.5, fy - 102]], { w: 1, col: '#ffd0a0', alpha: 0.7, sh: 0, layer: 'white' });
    for (const y of [fy - 24, fy - 30, fy - 36]) d.shape(SKETCH.ell(fx, y, 8, 3, 12), { fill: '#d8d0bc', w: 1.1, curve: true });
    const grip = SKETCH.box(fx - 5, fy - 74, 10, 24);
    d.shape(grip, { fill: '#5a2a1c', w: 1.4, corner: 30 });
    for (let y = fy - 70; y < fy - 52; y += 4) d.line(fx - 5, y, fx + 5, y + 1, { w: 0.8, ov: 0 });
    d.solid(SKETCH.ell(fx, fy - 110, 8, 8, 16), { kind: 'dark' });
    d.ellipse(fx, fy - 110, 8, 8, { fill: '#c0703a', w: 1.6, hatch: { a: 45, gap: 1.8, w: 0.4, tone: (x, y) => (x - fx + y - fy + 118) / 16 } });
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
// Tick's chair: an iron throne far too big for him (stool, seat, back), studded leather, pedals with blocks on them
IRON_ART.lampChair = () => {
  const key = 'iron:lamp:chair';
  if (!SKETCH.has(key)) SKETCH.sheet(key, 340, 330, d => {
    const P = IRON_P, H = IRON_ART.helpers, X = r => 160 + r, fy = 310;
    // the footstool (world x 520..580, 55 high)
    const stool = [[X(-100), fy - 55], [X(-40), fy - 55], [X(-42), fy], [X(-98), fy]];
    d.solid(stool, { kind: 'dark' });
    H.ironPlate(d, stool, { fill: '#5a463c', fillAlpha: 0.7, tone: (x, y) => 0.3 + (y - fy + 55) / 80, hatchA: 80, gap: 2.4, rivetEdges: [0], spacing: 12, w: 2, rustPatches: 0 });
    d.shape([[X(-104), fy - 55], [X(-36), fy - 55], [X(-38), fy - 49], [X(-102), fy - 49]], { fill: '#7a2e22', w: 1.4, corner: 30 });
    // the seat box (580..700, 110 high) with a buttoned cushion
    const seat = [[X(-40), fy - 110], [X(80), fy - 110], [X(80), fy], [X(-40), fy]];
    d.solid(seat, { kind: 'dark' });
    H.ironPlate(d, seat, { fill: '#6a5446', fillAlpha: 0.75, tone: (x, y) => 0.2 + (y - fy + 110) / 160 + (x - X(-40)) / 400, hatchA: 75, gap: 2.4, rivetEdges: [1, 3], spacing: 14, w: 2.4, rustPatches: 2, scratch: 3 });
    const cush = [[X(-44), fy - 110], [X(84), fy - 110], [X(82), fy - 96], [X(20), fy - 92], [X(-42), fy - 96]];
    d.solid(cush, { kind: 'dark' });
    d.shape(cush, { fill: '#8a3426', w: 1.8, corner: 40, curve: true, hatch: { a: 60, gap: 2, w: 0.45, alpha: 0.5, tone: (x, y) => (y - fy + 110) / 18 } });
    for (let x = X(-30); x < X(80); x += 22) { d.ellipse(x, fy - 102, 1.8, 1.8, { fill: P.core, w: 0.8 }); }
    // the pedals: two long levers out the front of the seat, wooden blocks strapped on top (Tick's legs are short)
    for (const [px, py] of [[X(-30), fy - 64], [X(-14), fy - 48]]) {
      d.stroke([[px + 30, py - 6], [px, py]], { w: 3 });
      d.shape(SKETCH.box(px - 14, py - 3, 18, 7), { fill: P.ochreDeep, w: 1.4, corner: 30 });
      d.shape(SKETCH.box(px - 12, py - 13, 13, 10), { fill: '#a37a3c', w: 1.2, corner: 30, hatch: { a: 0, gap: 2, w: 0.4, alpha: 0.5 } });
    }
    // claw feet
    for (const x of [X(-36), X(76)]) d.shape([[x - 10, fy], [x + 10, fy], [x + 6, fy - 12], [x - 6, fy - 12]], { fill: '#2a2421', w: 1.6, corner: 30 });
    // the back (700..728, 270 high): a tall riveted slab with a crest, a name plate and a winding key
    const back = [[X(80), fy - 270], [X(108), fy - 262], [X(108), fy], [X(80), fy]];
    d.solid(back, { kind: 'dark' });
    H.ironPlate(d, back, { fill: '#5a463c', fillAlpha: 0.8, tone: (x, y) => 0.3 + (x - X(80)) / 40, hatchA: 90, gap: 2.2, rivetEdges: [1], spacing: 14, w: 2.4, rustPatches: 1 });
    const crest = [[X(72), fy - 270], [X(94), fy - 300], [X(116), fy - 262], [X(108), fy - 262], [X(80), fy - 270]];
    d.solid(crest, { kind: 'dark' });
    d.shape(crest, { fill: P.ochre, w: 1.8, corner: 30 });
    d.shape(SKETCH.box(X(82), fy - 200, 24, 46), { fill: '#2a2421', w: 1.2, corner: 30 });
    d.word('T', X(94), fy - 186, 10, { align: 'center', col: P.core, w: 1.4 });
    d.word('I', X(94), fy - 176, 10, { align: 'center', col: P.core, w: 1.4 });
    d.word('C', X(94), fy - 166, 10, { align: 'center', col: P.core, w: 1.4 });
    d.word('K', X(94), fy - 156, 10, { align: 'center', col: P.core, w: 1.4 });
    d.stroke([[X(108), fy - 130], [X(130), fy - 130]], { w: 4 });
    d.shape([[X(130), fy - 148], [X(146), fy - 138], [X(146), fy - 122], [X(130), fy - 112], [X(138), fy - 130]], { fill: P.ochre, w: 1.6, corner: 30 });
    // an armrest on the back side, and the SWAP lever box beside the chair
    d.shape([[X(40), fy - 150], [X(82), fy - 156], [X(82), fy - 142], [X(44), fy - 138]], { fill: '#6a5446', w: 1.8, corner: 30 });
    d.stroke([[X(46), fy - 140], [X(50), fy - 110]], { w: 3 });
    const lb = SKETCH.box(X(120), fy - 50, 40, 50);
    d.solid(lb, { kind: 'dark' });
    d.shape(lb, { fill: '#3a322d', w: 1.6, corner: 30, hatch: { a: 45, gap: 2.2, w: 0.45, alpha: 0.5 } });
    d.stroke([[X(140), fy - 46], [X(152), fy - 86]], { w: 3, col: P.ironLight });
    d.ellipse(X(152), fy - 88, 5, 5, { fill: '#a7462a', w: 1.4 });
    d.word('SWAP', X(140), fy - 20, 9, { align: 'center', col: '#ffd9a8', w: 1.3 });
  }, { ox: 160, oy: 310, paper: 'dark', seed: 9350 });
  return key;
};
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
