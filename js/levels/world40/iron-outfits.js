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

const IRON_OUTFIT = { soot: 0, crooked: [0, 0], dusty: [0, 0] };
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

defineOutfit('ironchase', { pip: [['ironScarfTail', {}], ['ironScarf', {}], ['ironGoggles', {}]], bo: [['ironNeckerchief', {}], ['ironAviator', {}]] });
defineOutfit('ironcrew', { pip: [['ironBib', { col: '#efe3c6' }], ['ironHeadTorch', {}]], bo: [['ironRag', {}], ['ironBib', { col: '#a9a59c', strap: '#5c5550' }], ['ironEarMuffs', {}]] });
