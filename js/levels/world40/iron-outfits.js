/* Pip & Bo - World 40 Colossus March: Pip and Bo's three outfits, drawn in the sketch kit. */
'use strict';

/* Outfits (Gavyn's rule: per-level outfits; built here, checked by the review). All parts draw with a live SKETCH drawer
   in the body's own frame (x -11..11, y -26 top of head .. 0 feet; eyes at about y -16). Pip: no blue or navy. Bo: no
   orange or red. Sprout and ears stay visible, the eyes are never covered, the two never share a hat.
     ironchase (Part 1)      Pip: brass dust goggles pushed up, a long cream scarf that streams behind.
                             Bo: a white aviator cap with the ears through it, a green neckerchief.
     ironrig (Parts 2, 3)    Pip: a dented yellow hard hat (sprout through a hole), a green tool belt with a wrench.
                             Bo: a teal welder's mask tipped up between the ears, a silver chain looped at the hip.
     ironcrew (Parts 4 to 8) Pip: a head torch on a white band, a soot-smudged cream bib.
                             Bo: brass ear-defenders on a band behind the ears, a grey bib, a yellow oil rag.
   IRON_OUTFIT.soot (0..1) dirties the crew bibs as the inside parts go on; IRON_OUTFIT.crooked (seconds) tips hats
   after a Clang (set per player: [pip, bo]). */

const IRON_OUTFIT = { soot: 0, crooked: [0, 0], dusty: [0, 0], bolt: [0, 0] };
const ironOfD = (c, k) => SKETCH.live(c.g, 5200 + c.id * 61 + k * 7, SKETCH.boil(c.t));
const ironOfPoly = (g, pts, col, a = 1) => { g.globalAlpha = a; g.fillStyle = col; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill(); g.globalAlpha = 1; };
const ironOfTilt = c => (IRON_OUTFIT.crooked[c.id] > 0 ? Math.sin(c.t * 9) * 0.18 * Math.min(1, IRON_OUTFIT.crooked[c.id]) - 0.12 : 0);

/* ---- ironchase ---- */
defineOutfitPart('ironGoggles', { layer: 'head', draw(c) {
  const g = c.g, d = ironOfD(c, 1), lx = c.look * 0.6;
  // the strap round the forehead
  // pushed up high on the forehead, tipped back: flat brass rims riding on the head's top edge
  d.stroke([[-11.5, -22.8], [0, -24.6], [11.5, -22.8]], { w: 2, curve: true, col: '#5a4030', sh: 0, p: [1, 1, 1] });
  for (const ex of [-4.4, 4.4]) {
    const cx = ex + lx, cy = -25.6;
    ironOfPoly(g, SKETCH.ell(cx, cy, 4, 2.3, 12), '#c9973a');
    ironOfPoly(g, SKETCH.ell(cx, cy - 0.5, 2.6, 1.2, 10), '#7fb3a8');
    ironOfPoly(g, SKETCH.ell(cx - 1.2, cy - 0.8, 0.8, 0.45, 6), '#fffaf0');
    d.stroke(SKETCH.ell(cx, cy, 4, 2.3, 14, 0, -0.2, Math.PI * 1.85), { w: 1.05, curve: true, c: [cx, cy], sh: 1 });
  }
  d.stroke([[-0.6 + lx, -25.4], [0.6 + lx, -25.4]], { w: 1.2, sh: 0 });
} });
defineOutfitPart('ironScarf', { layer: 'body', draw(c) {
  const g = c.g, d = ironOfD(c, 2);
  const wrap = [[-11, -11.5], [0, -10.2], [11, -11.5], [11, -7.5], [0, -6.2], [-11, -7.5]];
  ironOfPoly(g, wrap, '#efe3c6');
  d.hatch(wrap, { a: 80, gap: 1.6, w: 0.4, force: true, tone: x => (x + 11) / 22, alpha: 0.6 });
  d.stroke([[-11, -11.5], [0, -10.2], [11, -11.5]], { w: 0.9, curve: true, sh: 0 });
  d.stroke([[-11, -7.5], [0, -6.2], [11, -7.5]], { w: 1.2, curve: true, sh: 0 });
} });
defineOutfitPart('ironScarfTail', { layer: 'back', draw(c) {
  // the tail streams behind: longer and flatter the faster they run (o.snap: dead straight, the chain ride)
  const g = c.g, d = ironOfD(c, 3), back = -c.face, sp = Math.min(1, Math.abs(c.vx) / 220), snap = IRON_OUTFIT.snap;
  const pts = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6, x = back * (4 + t * (8 + sp * 16 + (snap ? 10 : 0))), wav = snap ? 0 : Math.sin(c.t * 11 - t * 5) * (1.2 + sp * 1.6) * t;
    pts.push([x, -9 + t * (6 - sp * 5 - (snap ? 2 : 0)) + wav]);
  }
  const lower = pts.map(([x, y], i) => [x, y + 3.4 - i * 0.25]).reverse();
  ironOfPoly(g, pts.concat(lower), '#efe3c6');
  d.stroke(pts, { w: 0.9, curve: true, sh: 0 });
  d.stroke(lower, { w: 1.2, curve: true, sh: 0 });
  d.stroke([[pts[6][0], pts[6][1]], [pts[6][0] + back * 1.5, pts[6][1] + 2.5]], { w: 0.7, sh: 0 });
} });
defineOutfitPart('ironAviator', { layer: 'head', earsOver: true, lift: 2, draw(c) {
  const g = c.g, d = ironOfD(c, 4), lx = c.look * 0.4;
  const cap = [[-11.6, -15.5], [-12, -21], [-8.5, -26.6], [0, -28.6], [8.5, -26.6], [12, -21], [11.6, -15.5], [9.5, -15.2], [9.4, -20.4], [0, -21.2], [-9.4, -20.4], [-9.5, -15.2]];
  ironOfPoly(g, cap, '#f4f0e4');
  d.hatch(cap, { a: 65, gap: 1.6, w: 0.45, force: true, tone: (x, y) => (x + 11) / 22 * 0.9 - 0.1, alpha: 0.55 });
  d.outline(cap, { w: 1.3, corner: 60, smooth: true, c: [0, -21], ov: 0.6 });
  // seam and the earflap stitching
  d.stroke([[lx, -28.4], [lx + 0.5, -21.4]], { w: 0.6, sh: 0 });
  for (const sx of [-1, 1]) d.stroke([[sx * 10.6, -20.5], [sx * 10.8, -16]], { w: 0.5, sh: 0, brk: 1 });
} });
defineOutfitPart('ironNeckerchief', { layer: 'body', draw(c) {
  const g = c.g, d = ironOfD(c, 5), f = c.face;
  const tri = [[-10.5, -10.8], [10.5, -10.8], [f * 2, -3.2]];
  ironOfPoly(g, tri, '#5f9a4c');
  d.hatch([[f * 2, -10.8], [10.5, -10.8], [f * 2, -3.2]], { a: 40, gap: 1.4, w: 0.4, force: true, alpha: 0.6 });
  d.outline(tri, { w: 1, corner: 40, ov: 0.6 });
  ironOfPoly(g, SKETCH.ell(-f * 6, -10.6, 1.8, 1.5, 8), '#4b7f3a'); d.stroke(SKETCH.ell(-f * 6, -10.6, 1.8, 1.5, 8, 0, 0, 5.5), { w: 0.6, curve: true, sh: 0 });
} });

/* ---- ironcrew ---- */
defineOutfitPart('ironHeadTorch', { layer: 'head', lift: 0, draw(c) {
  const g = c.g, d = ironOfD(c, 6), f = c.face, tilt = ironOfTilt(c);
  g.save(); g.rotate(tilt);
  const band = [[-11.6, -23.8], [0, -25], [11.6, -23.8], [11.6, -20.6], [0, -21.8], [-11.6, -20.6]];
  ironOfPoly(g, band, '#f6f1e6');
  d.stroke([[-11.6, -23.8], [0, -25], [11.6, -23.8]], { w: 0.8, curve: true, sh: 0 });
  d.stroke([[-11.6, -20.6], [0, -21.8], [11.6, -20.6]], { w: 1.1, curve: true, sh: 0 });
  // the lamp on the side they look toward, and its little warm cone drawn as left paper with pencil edges
  const lx = f * 7.5, ly = -22.6;
  if (!IRON_OUTFIT.noBeam) {
    const cone = [[lx + f * 2.4, ly - 1.5], [lx + f * 26, ly - 6], [lx + f * 27, ly + 7], [lx + f * 2.4, ly + 1.5]];
    ironOfPoly(g, cone, 'rgba(255,240,190,0.33)');
    d.pencil([cone[0], cone[1]], { col: '#fff2c8', alpha: 0.55 }); d.pencil([cone[3], cone[2]], { col: '#fff2c8', alpha: 0.55 });
  }
  const lamp = [[lx - 3, ly - 3], [lx + 3, ly - 3], [lx + 3.4, ly + 3], [lx - 3, ly + 3]];
  ironOfPoly(g, lamp, '#8a8178');
  ironOfPoly(g, SKETCH.ell(lx + f * 2.6, ly, 1.3, 2.4, 8), '#ffe58a');
  d.outline(lamp, { w: 0.9, corner: 30, ov: 0.4 });
  g.restore();
} });
defineOutfitPart('ironBib', { layer: 'body', draw(c, o) {
  const g = c.g, d = ironOfD(c, 7), col = o.col || '#efe3c6';
  // a small bib low on the body, so the body still reads as the wearer's own colour
  const bib = [[-5.5, -8], [5.5, -8], [6.4, 0], [-6.4, 0]];
  d.stroke([[-5.5, -8], [-8.5, -10.5], [-10.6, -12]], { w: 1.3, curve: true, col: o.strap || '#7a6a5a', sh: 0, p: [1, 1, 0.6] });
  d.stroke([[5.5, -8], [8.5, -10.5], [10.6, -12]], { w: 1.3, curve: true, col: o.strap || '#7a6a5a', sh: 0, p: [1, 1, 0.6] });
  ironOfPoly(g, bib, col);
  d.hatch(bib, { a: 70, gap: 1.6, w: 0.4, force: true, tone: x => (x + 8) / 16, alpha: 0.5 });
  d.outline(bib, { w: 1, corner: 40, ov: 0.6 });
  // a pocket and soot smudges (more as the inside parts go on)
  d.stroke([[-2.8, -5.4], [2.8, -5.4], [2.8, -2.6], [-2.8, -2.6]], { w: 0.6, sh: 0 });
  const soot = Math.max(0.15, IRON_OUTFIT.soot);
  d.stipple(bib, { n: Math.round(8 + soot * 26), r: 0.55, force: true, alpha: 0.6, tone: (x, y) => 0.4 + (y + 6) / 12 });
  if (soot > 0.4) ironOfPoly(g, SKETCH.ell(c.id ? 3 : -3, -2, 3, 1.6, 8, 0.3), 'rgba(40,32,28,0.35)');
} });
defineOutfitPart('ironEarMuffs', { layer: 'head', earsOver: true, draw(c) {
  // a band arching behind the ears, brass cups over the sides of the head (never over the eyes)
  const g = c.g, d = ironOfD(c, 8), tilt = ironOfTilt(c);
  g.save(); g.rotate(tilt);
  d.stroke([[-11.4, -17], [-9.5, -24], [0, -27.2], [9.5, -24], [11.4, -17]], { w: 2.1, curve: true, col: '#5c5550', sh: 0, p: [1, 1, 1] });
  for (const sx of [-1, 1]) {
    const cup = SKETCH.ell(sx * 11.2, -15.4, 2.8, 4.4, 12);
    ironOfPoly(g, cup, '#c9973a');
    ironOfPoly(g, SKETCH.ell(sx * 11.2 - 0.8, -16.6, 0.9, 1.4, 6), '#fff2cc');
    d.stroke(SKETCH.ell(sx * 11.2, -15.4, 2.8, 4.4, 12, 0, -0.5, Math.PI * 1.7), { w: 0.95, curve: true, c: [sx * 11.2, -15.4], sh: 1 });
  }
  g.restore();
} });
defineOutfitPart('ironRag', { layer: 'back', draw(c) {
  const g = c.g, d = ironOfD(c, 9), x = -c.face * 9, sw = Math.sin(c.t * 6) * 1.2;
  const rag = [[x - 2, -6], [x + 2.5, -6.4], [x + 3.2 - c.face * 1.5 + sw, 0.5], [x + 0.5 + sw, -1.5], [x - 1.8 - c.face * 1 + sw, 1.2]];
  ironOfPoly(g, rag, '#e9c53a');
  d.outline(rag, { w: 0.8, corner: 40, ov: 0.3 });
} });

/* ---- ironrig ---- */
defineOutfitPart('ironHardHat', { layer: 'head', lift: 6, draw(c) {
  // a dented yellow hard hat, the sprout through a hole in the top
  const g = c.g, d = ironOfD(c, 10), tilt = ironOfTilt(c);
  g.save(); g.translate(0, -24); g.rotate(tilt); g.translate(0, 24);
  const dome = [[-9.6, -24.2], [-9.2, -28.6], [-5.8, -32.4], [-1.6, -33.4], [1.2, -32.2], [3.2, -33.2], [6.6, -31.6], [9.2, -28.4], [9.6, -24.2]];
  ironOfPoly(g, dome, '#f2c23a');
  d.hatch(dome, { a: 60, gap: 1.5, w: 0.45, force: true, tone: x => (x + 10) / 20 * 0.9, alpha: 0.6 });
  d.outline(dome, { w: 1.3, corner: 50, smooth: true, c: [0, -28], ov: 0.6 });
  // the dent, a ridge down the middle and the brim
  d.stroke([[1.2, -32.2], [1.8, -30.6], [3.4, -30.4]], { w: 0.7, curve: true, sh: 0 });
  d.stroke([[-2.6, -32.8], [-3, -25]], { w: 0.6, curve: true, sh: 0, brk: 1 });
  const brim = [[-13, -25.6], [13, -25.6], [12.6, -22.6], [-12.6, -22.6]];
  ironOfPoly(g, brim, '#e0aa25');
  d.outline(brim, { w: 1.2, corner: 30, ov: 0.5 });
  ironOfPoly(g, SKETCH.ell(-5.5, -30, 1.4, 0.8, 6, -0.6), '#fff6d8', 0.8);
  // the hole the sprout grows through
  ironOfPoly(g, SKETCH.ell(0, -33, 1.8, 0.7, 8), '#3a2c22', 0.8);
  g.restore();
} });
defineOutfitPart('ironToolBelt', { layer: 'body', draw(c) {
  // a green tool belt, a pouch and a wrench that swings when they move
  const g = c.g, d = ironOfD(c, 11), f = c.face, sw = Math.sin(c.t * 7) * Math.min(1, Math.abs(c.vx) / 120) * 0.35;
  const belt = [[-11.4, -6.6], [11.4, -6.6], [11.4, -3.8], [-11.4, -3.8]];
  ironOfPoly(g, belt, '#5f9a4c');
  d.hatch(belt, { a: 80, gap: 1.5, w: 0.4, force: true, alpha: 0.55 });
  d.outline(belt, { w: 1, corner: 30, ov: 0.5 });
  ironOfPoly(g, [[-1.8, -6.8], [1.8, -6.8], [1.8, -3.6], [-1.8, -3.6]], '#c9973a');
  d.outline([[-1.8, -6.8], [1.8, -6.8], [1.8, -3.6], [-1.8, -3.6]], { w: 0.7, corner: 20, ov: 0.3 });
  const px = -f * 6.5, pouch = [[px - 2.8, -4], [px + 2.8, -4], [px + 2.4, 0.4], [px - 2.4, 0.4]];
  ironOfPoly(g, pouch, '#4b7f3a'); d.outline(pouch, { w: 0.9, corner: 30, ov: 0.3 });
  // the wrench hangs on the facing side
  g.save(); g.translate(f * 7, -4.4); g.rotate(sw - f * 0.12);
  ironOfPoly(g, [[-0.8, 0], [0.8, 0], [0.8, 6.2], [-0.8, 6.2]], '#a9a59c');
  ironOfPoly(g, SKETCH.ell(0, 7.2, 1.9, 1.6, 10), '#a9a59c');
  ironOfPoly(g, [[-0.6, 7.4], [0.6, 7.4], [0.6, 9.2], [-0.6, 9.2]], '#efe3c6');
  d.outline([[-0.8, 0], [0.8, 0], [0.8, 5.8], [1.9, 6.8], [1.2, 8.8], [0.6, 7.6], [-0.6, 7.6], [-1.2, 8.8], [-1.9, 6.8], [-0.8, 5.8]], { w: 0.8, corner: 30, ov: 0.3 });
  g.restore();
} });
defineOutfitPart('ironWeldMask', { layer: 'head', lift: 0, draw(c) {
  // a teal welder's mask tipped right up between the ears (never down over the eyes): a curved shield with a dark window
  const g = c.g, d = ironOfD(c, 12), tilt = ironOfTilt(c), lx = c.look * 0.3;
  g.save(); g.translate(0, -24); g.rotate(tilt); g.translate(0, 24);
  d.stroke([[-10.8, -20.8], [-6, -23.4], [0, -24.4], [6, -23.4], [10.8, -20.8]], { w: 1.8, curve: true, col: '#3f4a4a', sh: 0, p: [1, 1, 1] });
  const shield = [[-4.6, -27], [-5.2, -33.6], [-3.2, -37.6], [3.2, -37.6], [5.2, -33.6], [4.6, -27], [0, -25.6]];
  ironOfPoly(g, shield, '#3f9a92');
  d.hatch(shield, { a: 70, gap: 1.4, w: 0.45, force: true, tone: x => (x + 5) / 10, alpha: 0.6 });
  d.outline(shield, { w: 1.3, corner: 50, smooth: true, c: [0, -32], ov: 0.6 });
  const win = [[-3 + lx, -35.4], [3 + lx, -35.4], [3 + lx, -32.6], [-3 + lx, -32.6]];
  ironOfPoly(g, win, '#2c2a2e');
  ironOfPoly(g, [[-2.3 + lx, -35], [-0.5 + lx, -35], [-1.2 + lx, -33], [-2.3 + lx, -33]], '#7fb3a8', 0.6);
  d.outline(win, { w: 0.8, corner: 20, ov: 0.3 });
  for (const sx of [-1, 1]) { ironOfPoly(g, SKETCH.ell(sx * 4.4, -27.4, 1.1, 1.1, 8), '#c9973a'); }
  g.restore();
} });
defineOutfitPart('ironGloves', { layer: 'front', draw(c) {
  // cream work gloves: two small cuffed mitts at the sides of the body
  const g = c.g, d = ironOfD(c, 13), sw = Math.sin(c.t * 8) * Math.min(1, Math.abs(c.vx) / 150);
  for (const sx of [-1, 1]) {
    const x = sx * 11.4, y = -8.5 + sx * sw;
    const mitt = SKETCH.ell(x, y, 2.6, 2.9, 10);
    ironOfPoly(g, mitt, '#efe3c6');
    d.outline(mitt, { w: 0.95, corner: 40, ov: 0.4 });
    d.stroke([[x - 2.2, y - 1.6], [x + 2.2, y - 1.6]], { w: 0.8, sh: 0 });
  }
} });
defineOutfitPart('ironHipChain', { layer: 'body', draw(c) {
  // a silver chain looped at the hip, swinging a little
  const g = c.g, d = ironOfD(c, 14), x0 = -c.face * 9.5, sw = Math.sin(c.t * 6.5) * 0.8;
  for (let i = 0; i < 6; i++) {
    const t = i / 5, x = x0 + c.face * t * 7, y = -5.2 + Math.sin(t * Math.PI) * (3.4 + sw);
    const ring = SKETCH.ell(x, y, 1.3, 0.85, 8, i % 2 ? 0.9 : -0.3);
    ironOfPoly(g, ring, '#d9d6cf');
    d.stroke(SKETCH.ell(x, y, 1.3, 0.85, 8, i % 2 ? 0.9 : -0.3), { w: 0.6, curve: true, c: [x, y], sh: 0 });
  }
} });

/* ---- shared: desert dust after a ground wave (Part 1) and the Thumb War champion bolt (Part 8) ---- */
defineOutfitPart('ironDust', { layer: 'front', draw(c) {
  const a = Math.min(1, IRON_OUTFIT.dusty[c.id] || 0);
  if (a <= 0.02) return;
  const d = ironOfD(c, 15);
  d.stipple([[-11, -26], [11, -26], [11, 0], [-11, 0]], { n: 26, r: 0.6, force: true, col: '#c9a464', alpha: 0.9 * a, tone: (x, y) => 0.3 + (y + 26) / 40 });
} });
defineOutfitPart('ironBolt', { layer: 'front', draw(c) {
  // a gold bolt on a ribbon round the neck after a round win (one per win, side by side)
  const n = IRON_OUTFIT.bolt[c.id] || 0;
  if (!n) return;
  const g = c.g, d = ironOfD(c, 16);
  d.stroke([[-6, -11.2], [0, -8.6], [6, -11.2]], { w: 1.1, curve: true, col: c.id ? '#5f9a4c' : '#efe3c6', sh: 0, p: [1, 1, 1] });
  for (let k = 0; k < n; k++) {
    const x = (k - (n - 1) / 2) * 5.2, y = -6.4;
    const hex = []; for (let i = 0; i < 6; i++) hex.push([x + Math.cos(i * Math.PI / 3) * 2.4, y + Math.sin(i * Math.PI / 3) * 2.4]);
    ironOfPoly(g, hex, '#e8b83a');
    ironOfPoly(g, SKETCH.ell(x - 0.7, y - 0.8, 0.7, 0.45, 6), '#fff6d0');
    d.outline(hex, { w: 0.85, corner: 30, ov: 0.3 });
    ironOfPoly(g, SKETCH.ell(x, y, 0.8, 0.8, 6), '#8a6a22');
  }
} });

defineOutfit('ironchase', { pip: [['ironScarfTail', {}], ['ironScarf', {}], ['ironGoggles', {}], ['ironDust', {}]], bo: [['ironNeckerchief', {}], ['ironAviator', {}], ['ironDust', {}]] });
defineOutfit('ironrig', { pip: [['ironToolBelt', {}], ['ironHardHat', {}]], bo: [['ironHipChain', {}], ['ironWeldMask', {}], ['ironGloves', {}]] });
defineOutfit('ironcrew', { pip: [['ironBib', { col: '#efe3c6' }], ['ironHeadTorch', {}], ['ironBolt', {}]], bo: [['ironRag', {}], ['ironBib', { col: '#a9a59c', strap: '#5c5550' }], ['ironEarMuffs', {}], ['ironBolt', {}]] });
