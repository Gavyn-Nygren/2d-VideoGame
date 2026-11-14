/* Pip & Bo - Outfits: themed clothes and hats for Pip and Bo, declared per world, per level or per room. */
'use strict';

/* ---------- how it works ----------
   Pip and Bo stay a little orange block with a sprout and a little blue block with round ears. An outfit is drawn
   on top of that body in layers, so it never changes a hitbox, the physics or the computer partner: it is paint.

   Declaring (any of these; the first one found wins):
     setOutfit('name')                     at run time from a level's own code, e.g. per era or phase (lasts until the
                                           next loadLevel; setOutfit(null) goes back to the declared one)
     rooms[i].outfit: 'name'              one room of a level
     def.outfit: 'name'                   a level (its LEVELS entry); 'none' = no outfit even if the world has one
     WORLDS[w].outfit: 'name'             every level of a world
   Worlds 1-31 declare theirs in js/outfits-worlds.js (by level name, so level-list.js is left alone).

   Defining:
     defineOutfit('name', { pip: [parts], bo: [parts] })   (or both: [parts] when Pip and Bo dress the same)
     A part is ['partName', { options }]. Parts come from OUTFIT_PARTS below (hats, scarves, capes, goggles...) or a
     level can add its own with defineOutfitPart('name', { layer, lift, draw(c, o) }).
     Colour options take a colour, or 'own' / 'ownDark' / 'ownLight' for the wearer's own colours.

   The canvas: each part draws in one fixed frame, the body's own: x from -11 to 11, y from -26 (top of the head) to
   0 (the feet), whatever size or squash the body is drawn at (the frame is scaled to fit). The eyes sit at about
   y -16 (x -5 and 5, shifted 2.5 the way the body faces), the cheeks at y -10. A hat sits on y -26 and should not
   come lower than y -21 over the eyes. Bo's ears are circles at (-7, -25) and (7, -25), r 5; Pip's sprout grows up
   from (0, -26). A head part with `lift: n` raises Pip's sprout n units so it grows out of the hat's top.
   c (the drawing context a part gets): g (the canvas context), id (0 Pip, 1 Bo), col, dark, light (the wearer's
   colours), face (-1..1, the way they look), t (seconds, for little animations), vx (sideways speed, for capes),
   look (eye shift).

   Layers, in drawing order: back (capes, packs, tanks: behind the body), body (clothes and masks: over the body,
   under the eyes), head (hats: over the face), front (goggles and visors: over everything).

   Rules: Pip must still read as orange and Bo as blue at a glance (keep most of the body in the player's own colour,
   or use 'own' for the outfit's main colour; no blue or navy on Pip, no orange or red on Bo); Pip and Bo should look different from each other (a different hat or
   colour); keep the eyes visible. Check a new outfit with `node tools/outfits/sheet.js` (every outfit, big) and in a
   level screenshot.

   Drawing an outfit on a hero drawn by a level's own code (not drawPlayer): call
     drawOutfit(id, layer, x, y, w, h, { face, t, vx })    for each layer at the right moment, where (x, y) is the
                                                           middle of the feet and w x h the body in the current
                                                           transform; or outfitBehind(...) before the body and
                                                           outfitOver(...) after the face to draw them all.
   The previews' v.hero() wears the previewed level's outfit by itself. */

const OUTFITS = {};
const OUTFIT_PARTS = {};
const OUTFIT_LAYERS = ['back', 'body', 'head', 'front'];
function defineOutfitPart(name, part) { OUTFIT_PARTS[name] = Object.assign({ layer: 'body', lift: 0 }, part); }
// spec: { pip: [parts], bo: [parts] } or { both: [parts] }; or { from: 'other', noHats: true } for another outfit
// without its hats (for a level that draws its own hats, e.g. job hats)
function defineOutfit(name, spec) {
  if (spec.from) { const src = OUTFITS[spec.from].spec; spec = Object.assign({}, src, spec, { from: null }); }
  const looks = [spec.pip || spec.both || [], spec.bo || spec.both || []].map(parts => {
    const look = { back: [], body: [], head: [], front: [], lift: 0, earsOver: false };
    for (const [pn, o = {}] of parts) {
      const part = OUTFIT_PARTS[pn];
      if (!part) { console.warn('Outfit "' + name + '": no part called ' + pn); continue; }
      const layer = o.layer || part.layer;
      if (spec.noHats && (layer === 'head' || part.hat)) continue;
      look[layer].push([part, o]);
      if (part.also) for (const l in part.also) look[l].push([{ draw: part.also[l] }, o]); // a part that draws on two layers
      look.lift = Math.max(look.lift, o.lift != null ? o.lift : part.lift);
      if (o.earsOver || part.earsOver) look.earsOver = true;
    }
    return look;
  });
  OUTFITS[name] = { name, looks, spec };
}

/* ---------- which outfit is on ---------- */
const OUTFIT_BY_LEVEL = {}; // level name -> outfit name (Worlds 1-31, filled in js/outfits-worlds.js)
const OUTFIT_BY_WORLD = {}; // world index -> outfit name
function setOutfit(name) { if (typeof G !== 'undefined' && G.mst) G.mst.outfit = name; }
// the outfit name for a level def (and room), or null
function outfitNameFor(def, room) {
  if (!def) return null;
  const r = room != null && def.rooms ? def.rooms[room] : null;
  const n = (r && r.outfit) || def.outfit || OUTFIT_BY_LEVEL[def.name] ||
    (WORLDS[def.world] && WORLDS[def.world].outfit) || OUTFIT_BY_WORLD[def.world] || null;
  return n === 'none' ? null : n;
}
let outfitsOn = true; // (a switch for tests and screenshots)
function outfitNow() {
  if (!outfitsOn || typeof G === 'undefined' || !G.level) return null;
  const forced = G.mst && G.mst.outfit;
  if (forced !== undefined && forced !== null) return forced === 'none' ? null : OUTFITS[forced] || null;
  return OUTFITS[outfitNameFor(G.level.def, G.room)] || null;
}

/* ---------- drawing ---------- */
const OF_W = 22, OF_H = 26;
const ofColor = (v, c) => (v === 'own' ? c.col : v === 'ownDark' ? c.dark : v === 'ownLight' ? c.light : v);
const OF_LIGHT = ['#ffb59f', '#a9c8ff'];
// draw one layer of a look. (x, y) is the middle of the feet, bw x bh the body as drawn, in the current transform
function outfitLayer(g, look, layer, id, x, y, bw, bh, o = {}) {
  const list = look && look[layer];
  if (!list || !list.length) return;
  const c = { g, id, col: PCOL[id], dark: PDARK[id], light: OF_LIGHT[id], face: o.face == null ? 1 : o.face, t: o.t || 0, vx: o.vx || 0 };
  c.look = c.face * 2.5;
  g.save();
  g.translate(x, y); g.scale(bw / OF_W, bh / OF_H);
  g.lineJoin = 'round'; g.lineCap = 'round';
  for (const [part, po] of list) {
    g.save();
    try { part.draw(c, po, ofColor); } catch (e) { if (!outfitLayer.warned) { outfitLayer.warned = true; console.warn('Outfit part failed:', e); } }
    g.restore();
  }
  g.restore();
}
// for heroes drawn by a level's own code: the current outfit's layer for player id
function drawOutfit(id, layer, x, y, w, h, o = {}) {
  const of = outfitNow();
  if (!of) return;
  outfitLayer(ctx, of.looks[id], layer, id, x, y, w, h, { face: o.face, t: o.t != null ? o.t : G.clock, vx: o.vx });
}
const outfitBehind = (id, x, y, w, h, o) => drawOutfit(id, 'back', x, y, w, h, o);
function outfitOver(id, x, y, w, h, o) { for (const l of ['body', 'head', 'front']) drawOutfit(id, l, x, y, w, h, o); }
// how far Pip's sprout and Bo's over-the-hat ears move up (in body units) for the look
const outfitLift = look => (look ? look.lift : 0);
// the same for a hero drawn by a level's own code: how far up to draw Pip's sprout now (body units)
function outfitSproutLift(id) { const of = outfitNow(); return of ? of.looks[id].lift : 0; }

/* ---------- small shape helpers (canvas g) ---------- */
function ofRR(g, x, y, w, h, r) {
  if (w < 0) { x += w; w = -w; }
  if (h < 0) { y += h; h = -h; }
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function ofCircle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); }
function ofFillStroke(g, fill, stroke, lw) {
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1.4; g.stroke(); }
}
function ofPoly(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }
// the body's own outline (the rounded box), to clip clothes to it
function ofBodyClip(g) { ofRR(g, -11, -26, 22, 26, 8); g.clip(); }
function ofStar(g, x, y, r, rot = 0) {
  g.beginPath();
  for (let k = 0; k < 10; k++) { const a = rot - Math.PI / 2 + k * Math.PI / 5, rr2 = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  g.closePath();
}
const OF_INK = '#1c1a36';

/* ---------- parts: head ---------- */
// options common to most: col (main), trim (band / stripe), ink (outline)
defineOutfitPart('cap', { layer: 'head', lift: 4, draw(c, o, k) {
  // a baseball cap, the peak out the way they face
  const g = c.g, f = c.face >= 0 ? 1 : -1, col = k(o.col || 'own', c), ink = o.ink || OF_INK;
  g.beginPath(); g.ellipse(f * 9, -24.2, 8, 2.4, 0, 0, Math.PI * 2); ofFillStroke(g, k(o.peak || o.col || 'own', c), ink, 1.3);
  g.beginPath(); g.moveTo(-10, -23.5); g.bezierCurveTo(-10, -33, 10, -33, 10, -23.5); g.closePath(); ofFillStroke(g, col, ink, 1.4);
  if (o.trim) { g.fillStyle = k(o.trim, c); g.beginPath(); g.moveTo(-4, -30.6); g.bezierCurveTo(-3, -31.7, 3, -31.7, 4, -30.6); g.lineTo(2.5, -23.6); g.lineTo(-2.5, -23.6); g.closePath(); g.fill(); }
  if (o.letter) { g.fillStyle = k(o.letterCol || '#fff', c); g.font = '700 6px "Atkinson Hyperlegible", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.letter, -f * 2, -27); }
  g.fillStyle = ink; ofCircle(g, 0, -31.2, 1.1); g.fill();
} });
defineOutfitPart('beanie', { layer: 'head', lift: 6, draw(c, o, k) {
  // a knitted hat with a folded band and a pompom
  const g = c.g, col = k(o.col || 'own', c), ink = o.ink || OF_INK;
  g.beginPath(); g.moveTo(-10.5, -24); g.bezierCurveTo(-10.5, -35, 10.5, -35, 10.5, -24); g.closePath(); ofFillStroke(g, col, ink, 1.4);
  if (o.stripe) { g.save(); g.clip(); g.fillStyle = k(o.stripe, c); g.fillRect(-12, -30.5, 24, 2.2); g.restore(); }
  ofRR(g, -11.5, -26.5, 23, 4.6, 2.2); ofFillStroke(g, k(o.trim || o.col || 'own', c), ink, 1.3);
  g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 0.8;
  for (let x = -8; x <= 8; x += 3.2) { g.beginPath(); g.moveTo(x, -25.8); g.lineTo(x, -22.6); g.stroke(); }
  if (o.pom !== false) { ofCircle(g, 0, -33.4, 3.1); ofFillStroke(g, k(o.pom || o.trim || '#fff', c), ink, 1.2); }
} });
defineOutfitPart('hardhat', { layer: 'head', lift: 6, draw(c, o, k) {
  const g = c.g, col = k(o.col || '#ffc53d', c), ink = o.ink || OF_INK;
  ofRR(g, -13, -25.6, 26, 3.4, 1.7); ofFillStroke(g, col, ink, 1.3);
  g.beginPath(); g.moveTo(-9.5, -24.5); g.bezierCurveTo(-9.5, -35, 9.5, -35, 9.5, -24.5); g.closePath(); ofFillStroke(g, col, ink, 1.4);
  ofRR(g, -1.6, -32.5, 3.2, 8, 1.4); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
  if (o.lamp) { ofCircle(g, c.face >= 0 ? 5 : -5, -28.5, 2.4); ofFillStroke(g, '#fff6c8', ink, 1); }
} });
defineOutfitPart('helmet', { layer: 'head', lift: 5, draw(c, o, k) {
  // a round sports helmet (bike, hockey, bobsled, race), with a stripe and an optional visor or cage
  const g = c.g, col = k(o.col || 'own', c), ink = o.ink || OF_INK;
  g.beginPath(); g.moveTo(-12, -21); g.bezierCurveTo(-13, -35, 13, -35, 12, -21); g.lineTo(9, -21); g.bezierCurveTo(9, -24, -9, -24, -9, -21); g.closePath(); ofFillStroke(g, col, ink, 1.4);
  if (o.stripe) { g.save(); g.clip(); g.fillStyle = k(o.stripe, c); g.fillRect(-2, -36, 4, 14); g.restore(); }
  if (o.vents) { g.fillStyle = 'rgba(0,0,0,0.3)'; for (const vx of [-6, 6]) { ofRR(g, vx - 1.2, -31, 2.4, 4.5, 1.2); g.fill(); } }
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-5, -29.5, 3, 1.6, -0.5, 0, Math.PI * 2); g.fill();
  if (o.visor) { const f = c.face >= 0 ? 1 : -1; g.beginPath(); g.moveTo(-10 * f, -23); g.quadraticCurveTo(4 * f, -26, 14 * f, -22.5); g.lineTo(13 * f, -21); g.quadraticCurveTo(3 * f, -23.5, -10 * f, -21.4); g.closePath(); ofFillStroke(g, k(o.visor, c), ink, 1); }
} });
defineOutfitPart('cage', { layer: 'front', draw(c, o, k) {
  // a hockey face cage: a light grid in front of the face
  const g = c.g, col = k(o.col || '#e8eef8', c), lx = c.look * 0.4;
  for (const [cl, lw] of [['rgba(28,26,54,0.45)', 1.6], [col, 0.8]]) {
    g.strokeStyle = cl; g.lineWidth = lw;
    g.beginPath(); g.moveTo(-10.4, -21); g.quadraticCurveTo(lx, -2, 10.4, -21); g.stroke();
    g.beginPath(); g.moveTo(-9.6, -12.4 + 0); g.lineTo(9.6, -12.4); g.stroke();
    for (const x of [-3.4, 3.4]) { g.beginPath(); g.moveTo(x + lx, -21); g.lineTo(x * 0.8 + lx, -8); g.stroke(); }
  }
} });
defineOutfitPart('tophat', { layer: 'head', lift: 13, draw(c, o, k) {
  const g = c.g, col = k(o.col || '#2b2840', c), ink = o.ink || OF_INK, tall = o.tall || 12;
  g.save(); g.translate(0, -25); g.rotate((o.tilt || 0) * (c.face >= 0 ? 1 : -1));
  ofRR(g, -12, -2, 24, 3.4, 1.7); ofFillStroke(g, col, ink, 1.3);
  ofRR(g, -7.5, -1.5 - tall, 15, tall, 1.6); ofFillStroke(g, col, ink, 1.4);
  g.fillStyle = k(o.band || '#e8483a', c); g.fillRect(-7, -5.2, 14, 3);
  if (o.flower) { ofCircle(g, 5, -3.7, 2.2); g.fillStyle = k(o.flower, c); g.fill(); }
  g.restore();
} });
defineOutfitPart('cowboy', { layer: 'head', lift: 9, draw(c, o, k) {
  const g = c.g, col = k(o.col || '#b07a44', c), ink = o.ink || OF_INK;
  g.beginPath(); g.moveTo(-16, -26); g.quadraticCurveTo(-13, -22, 0, -22.6); g.quadraticCurveTo(13, -22, 16, -26); g.quadraticCurveTo(13, -24.4, 0, -24.8); g.quadraticCurveTo(-13, -24.4, -16, -26); g.closePath(); ofFillStroke(g, col, ink, 1.3);
  g.beginPath(); g.moveTo(-8, -24.4); g.lineTo(-7, -33); g.quadraticCurveTo(-3.5, -35, 0, -32.4); g.quadraticCurveTo(3.5, -35, 7, -33); g.lineTo(8, -24.4); g.closePath(); ofFillStroke(g, col, ink, 1.4);
  g.fillStyle = k(o.band || '#5a2e16', c); g.fillRect(-7.6, -27.4, 15.2, 2.4);
  if (o.star) { g.fillStyle = '#ffd23f'; ofStar(g, 0, -26.2, 2.6); g.fill(); }
} });
defineOutfitPart('tricorn', { layer: 'head', lift: 8, draw(c, o, k) {
  // a pirate captain's hat, with a skull badge
  const g = c.g, col = k(o.col || '#2b2840', c), ink = o.ink || OF_INK;
  g.beginPath(); g.moveTo(-15, -27); g.quadraticCurveTo(-8, -23, 0, -23.4); g.quadraticCurveTo(8, -23, 15, -27); g.quadraticCurveTo(12, -31, 7, -29.4);
  g.quadraticCurveTo(0, -38, -7, -29.4); g.quadraticCurveTo(-12, -31, -15, -27); g.closePath(); ofFillStroke(g, col, ink, 1.4);
  g.strokeStyle = k(o.trim || '#ffc53d', c); g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(-14, -27); g.quadraticCurveTo(-8, -24.4, 0, -24.8); g.quadraticCurveTo(8, -24.4, 14, -27); g.stroke();
  if (o.skull !== false) { g.fillStyle = '#fff'; ofCircle(g, 0, -29.2, 2.3); g.fill(); g.fillRect(-1.4, -28, 2.8, 2); g.fillStyle = ink; ofCircle(g, -0.9, -29.4, 0.6); g.fill(); ofCircle(g, 0.9, -29.4, 0.6); g.fill(); }
  if (o.feather) { g.strokeStyle = k(o.feather, c); g.lineWidth = 2.2; g.beginPath(); g.moveTo(6, -30); g.quadraticCurveTo(12, -36, 16, -35); g.stroke(); }
} });
defineOutfitPart('bandana', { layer: 'head', lift: 3, draw(c, o, k) {
  // a cloth tied over the top of the head, knot and tails behind
  const g = c.g, col = k(o.col || '#e8483a', c), ink = o.ink || OF_INK, b = c.face >= 0 ? -1 : 1;
  g.beginPath(); g.moveTo(-11, -21); g.bezierCurveTo(-11, -31, 11, -31, 11, -21); g.quadraticCurveTo(0, -23.6, -11, -21); g.closePath(); ofFillStroke(g, col, ink, 1.3);
  if (o.dots !== false) { g.fillStyle = k(o.dots || '#fff', c); for (const [dx, dy] of [[-5, -25], [0, -27.5], [5, -25], [-2, -23.8], [3.4, -23.6]]) { ofCircle(g, dx, dy, 0.9); g.fill(); } }
  const t = Math.sin(c.t * 9) * 1.2;
  g.fillStyle = col; g.strokeStyle = ink; g.lineWidth = 1.1;
  ofPoly(g, [b * 10, -23, b * 16, -25 + t, b * 15, -21 + t]); g.fill(); g.stroke();
  ofPoly(g, [b * 10, -22, b * 15, -18 - t, b * 12.4, -16.6 - t]); g.fill(); g.stroke();
} });
defineOutfitPart('headband', { layer: 'body', lift: 0, hat: true, draw(c, o, k) {
  // a band round the forehead (sport sweatband, ninja hachimaki), tails behind when `tails`
  const g = c.g, col = k(o.col || '#fff', c), ink = o.ink || OF_INK, b = c.face >= 0 ? -1 : 1;
  g.save(); ofBodyClip(g); g.fillStyle = col; g.fillRect(-12, -24.6, 24, 3.6);
  if (o.stripe) { g.fillStyle = k(o.stripe, c); g.fillRect(-12, -23.4, 24, 1.2); }
  if (o.badge) { g.fillStyle = k(o.badge, c); ofCircle(g, c.look * 0.6, -22.8, 1.6); g.fill(); }
  g.restore();
  g.strokeStyle = 'rgba(28,26,54,0.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-10.6, -21); g.lineTo(10.6, -21); g.stroke();
  if (o.tails) {
    const t = Math.sin(c.t * 10) * 1.5, s = Math.max(0, Math.min(1, Math.abs(c.vx) / 200)) * 4;
    g.fillStyle = col; g.strokeStyle = ink; g.lineWidth = 1;
    ofPoly(g, [b * 10.5, -23.6, b * (17 + s), -26 + t, b * (16 + s), -23 + t]); g.fill(); g.stroke();
    ofPoly(g, [b * 10.5, -22.4, b * (16 + s), -19 - t, b * (14 + s), -17.6 - t]); g.fill(); g.stroke();
  }
} });
defineOutfitPart('crown', { layer: 'head', lift: 7, draw(c, o, k) {
  const g = c.g, col = k(o.col || '#ffc53d', c), ink = o.ink || OF_INK;
  ofPoly(g, [-8, -25, -9, -32, -4.5, -28.6, 0, -34, 4.5, -28.6, 9, -32, 8, -25]); ofFillStroke(g, col, ink, 1.3);
  g.fillStyle = k(o.gem || '#e8483a', c); ofCircle(g, 0, -27.4, 1.4); g.fill();
  g.fillStyle = '#5bd0ff'; ofCircle(g, -5, -26.8, 1); g.fill(); ofCircle(g, 5, -26.8, 1); g.fill();
} });
defineOutfitPart('wizard', { layer: 'head', lift: 16, draw(c, o, k) {
  // a tall floppy cone hat with stars (also a witch hat with `witch`, which has a wider brim)
  const g = c.g, col = k(o.col || '#3a3480', c), ink = o.ink || OF_INK, flop = Math.sin(c.t * 3) * 1.2 + (c.face >= 0 ? -1 : 1) * 2;
  const bw = o.witch ? 16 : 12.5;
  g.beginPath(); g.ellipse(0, -24.6, bw, 2.6, 0, 0, Math.PI * 2); ofFillStroke(g, col, ink, 1.3);
  g.beginPath(); g.moveTo(-8, -25); g.quadraticCurveTo(-4, -33, -1 + flop, -41); g.quadraticCurveTo(4 + flop, -42, 3 + flop, -40); g.quadraticCurveTo(4, -32, 8, -25); g.closePath(); ofFillStroke(g, col, ink, 1.4);
  if (o.band) { g.fillStyle = k(o.band, c); g.fillRect(-7.4, -28.4, 14.8, 2.6); if (o.buckle) { g.strokeStyle = '#ffd23f'; g.lineWidth = 1; g.strokeRect(-1.6, -28.6, 3.2, 3); } }
  if (o.stars !== false) { g.fillStyle = k(o.stars || '#ffd23f', c); ofStar(g, -2.4, -31, 1.8); g.fill(); ofStar(g, 2, -35.5, 1.3); g.fill(); }
} });
defineOutfitPart('chef', { layer: 'head', lift: 13, draw(c, o, k) {
  const g = c.g, ink = o.ink || OF_INK;
  ofRR(g, -7.5, -29, 15, 5, 1.4); ofFillStroke(g, '#fff', ink, 1.3);
  g.beginPath(); g.arc(-4.6, -31.5, 4.6, Math.PI * 0.6, Math.PI * 1.8); g.arc(0, -35, 5, Math.PI * 1.1, Math.PI * 1.9); g.arc(4.6, -31.5, 4.6, Math.PI * 1.2, Math.PI * 0.4); g.closePath(); ofFillStroke(g, '#fff', ink, 1.3);
  g.fillStyle = '#fff'; g.fillRect(-6.8, -30.6, 13.6, 2.4);
  if (o.band) { g.fillStyle = k(o.band, c); g.fillRect(-7, -27, 14, 1.4); }
} });
defineOutfitPart('viking', { layer: 'head', lift: 5, earsOver: false, draw(c, o, k) {
  // a round iron helmet with a nose guard rim and two horns
  const g = c.g, col = k(o.col || '#9aa3ad', c), ink = o.ink || OF_INK, horn = k(o.horn || '#f4ead0', c);
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 8, -26); g.quadraticCurveTo(s * 16, -27, s * 15.6, -36); g.quadraticCurveTo(s * 13, -30, s * 7.4, -29.6); g.closePath(); ofFillStroke(g, horn, ink, 1.2); }
  g.beginPath(); g.moveTo(-10.5, -22.5); g.bezierCurveTo(-10.5, -34, 10.5, -34, 10.5, -22.5); g.closePath(); ofFillStroke(g, col, ink, 1.4);
  g.fillStyle = k(o.trim || '#b07a44', c); ofRR(g, -11, -24.4, 22, 2.8, 1.2); g.fill(); g.strokeStyle = ink; g.lineWidth = 1; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(-4, -29.5, 2.4, 1.4, -0.4, 0, Math.PI * 2); g.fill();
  if (o.braids) { g.fillStyle = k(o.braids, c); for (const s of [-1, 1]) { ofRR(g, s * 11 - 1.8, -22, 3.6, 10, 1.8); g.fill(); g.strokeStyle = ink; g.lineWidth = 0.8; g.stroke(); } }
} });
defineOutfitPart('party', { layer: 'head', lift: 13, draw(c, o, k) {
  const g = c.g, col = k(o.col || '#ff8fc7', c), ink = o.ink || OF_INK, tilt = (c.face >= 0 ? 1 : -1) * 0.18;
  g.save(); g.translate(0, -25); g.rotate(tilt);
  ofPoly(g, [-6, 0, 0, -13, 6, 0]); ofFillStroke(g, col, ink, 1.3);
  g.save(); g.clip(); g.fillStyle = k(o.stripe || '#fff', c); for (let y = -11; y < 0; y += 4) { g.fillRect(-7, y, 14, 1.6); } g.restore();
  g.fillStyle = k(o.pom || '#ffd23f', c); ofCircle(g, 0, -13.6, 2.2); g.fill();
  g.restore();
} });
defineOutfitPart('beret', { layer: 'head', lift: 4, draw(c, o, k) {
  const g = c.g, col = k(o.col || '#e8483a', c), ink = o.ink || OF_INK, f = c.face >= 0 ? -1 : 1;
  g.beginPath(); g.ellipse(f * 1.5, -26.4, 11.4, 4.4, f * 0.12, Math.PI, Math.PI * 2.02); g.quadraticCurveTo(0, -24, -10, -25.4); g.closePath(); ofFillStroke(g, col, ink, 1.3);
  g.strokeStyle = ink; g.lineWidth = 1.4; g.beginPath(); g.moveTo(f * 1.5, -30.6); g.lineTo(f * 2, -33); g.stroke();
} });
defineOutfitPart('sunhat', { layer: 'head', lift: 6, draw(c, o, k) {
  // a wide straw hat (farm, beach, safari when `col` is khaki)
  const g = c.g, col = k(o.col || '#f2d07a', c), ink = o.ink || OF_INK;
  g.beginPath(); g.ellipse(0, -24.8, 16, 3.2, 0, 0, Math.PI * 2); ofFillStroke(g, col, ink, 1.3);
  g.beginPath(); g.moveTo(-8, -25); g.bezierCurveTo(-8.5, -32.5, 8.5, -32.5, 8, -25); g.closePath(); ofFillStroke(g, col, ink, 1.4);
  g.fillStyle = k(o.band || '#e8483a', c); g.fillRect(-8, -27.6, 16, 2.4);
  if (o.weave !== false) { g.strokeStyle = 'rgba(120,80,30,0.35)'; g.lineWidth = 0.7; for (const x of [-11, -6, 6, 11]) { g.beginPath(); g.moveTo(x, -26.6); g.lineTo(x * 1.08, -23.2); g.stroke(); } }
  if (o.flower) { g.fillStyle = k(o.flower, c); for (let a = 0; a < 5; a++) { ofCircle(g, 5 + Math.cos(a * 1.26) * 1.5, -26.4 + Math.sin(a * 1.26) * 1.5, 1.2); g.fill(); } g.fillStyle = '#ffd23f'; ofCircle(g, 5, -26.4, 0.9); g.fill(); }
} });
defineOutfitPart('pith', { layer: 'head', lift: 7, draw(c, o, k) {
  // an explorer's sun helmet
  const g = c.g, col = k(o.col || '#e6d3a0', c), ink = o.ink || OF_INK;
  g.beginPath(); g.ellipse(0, -24.4, 14, 2.8, 0, 0, Math.PI * 2); ofFillStroke(g, col, ink, 1.3);
  g.beginPath(); g.moveTo(-9.5, -24.5); g.bezierCurveTo(-10, -35.5, 10, -35.5, 9.5, -24.5); g.closePath(); ofFillStroke(g, col, ink, 1.4);
  g.fillStyle = k(o.band || '#7a5230', c); g.fillRect(-9.4, -27.4, 18.8, 2.2);
  g.fillStyle = col; ofCircle(g, 0, -33.4, 1.4); g.fill(); g.strokeStyle = ink; g.lineWidth = 0.9; g.stroke();
} });
defineOutfitPart('captain', { layer: 'head', lift: 6, draw(c, o, k) {
  // a peaked captain's / conductor's / pilot's cap: flat top, band, shiny peak and a badge
  const g = c.g, col = k(o.col || '#fff', c), ink = o.ink || OF_INK, f = c.face >= 0 ? 1 : -1;
  g.beginPath(); g.moveTo(-10, -25); g.lineTo(-12, -30.6); g.quadraticCurveTo(0, -34, 12, -30.6); g.lineTo(10, -25); g.closePath(); ofFillStroke(g, col, ink, 1.4);
  g.fillStyle = k(o.band || '#2b2840', c); g.fillRect(-10, -27.6, 20, 2.8);
  g.beginPath(); g.moveTo(-f * 4, -25); g.quadraticCurveTo(f * 8, -26, f * 13, -23); g.quadraticCurveTo(f * 6, -22.6, -f * 4, -23.4); g.closePath(); ofFillStroke(g, k(o.peak || '#2b2840', c), ink, 1.1);
  g.fillStyle = k(o.badge || '#ffc53d', c); ofCircle(g, 0, -29.6, 1.6); g.fill();
} });
defineOutfitPart('pilotcap', { layer: 'head', lift: 3, draw(c, o, k) {
  // a leather flying cap with ear flaps and goggles up on the forehead
  const g = c.g, col = k(o.col || '#8a5a32', c), ink = o.ink || OF_INK;
  g.beginPath(); g.moveTo(-11.4, -16); g.lineTo(-11.4, -24); g.bezierCurveTo(-11.4, -33, 11.4, -33, 11.4, -24); g.lineTo(11.4, -16); g.lineTo(8.6, -16); g.lineTo(8.6, -22.4); g.quadraticCurveTo(0, -24.6, -8.6, -22.4); g.lineTo(-8.6, -16); g.closePath(); ofFillStroke(g, col, ink, 1.3);
  const gc = k(o.lens || '#9fe0ff', c);
  for (const x of [-4.4, 4.4]) { ofCircle(g, x, -26.6, 3); ofFillStroke(g, gc, '#6a4a2a', 1.5); }
  g.strokeStyle = '#6a4a2a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-1.4, -26.6); g.lineTo(1.4, -26.6); g.stroke();
  if (o.scarf) {
    const b = c.face >= 0 ? -1 : 1, w = Math.sin(c.t * 11) * 1.5;
    g.fillStyle = k(o.scarf, c); g.beginPath(); g.moveTo(b * 9, -8); g.quadraticCurveTo(b * 15, -9 + w, b * 20, -7 - w); g.lineTo(b * 19, -4 - w); g.quadraticCurveTo(b * 14, -5 + w, b * 9, -4.4); g.closePath(); g.fill();
  }
} });
defineOutfitPart('swimcap', { layer: 'head', lift: 2, draw(c, o, k) {
  const g = c.g, col = k(o.col || 'own', c), ink = o.ink || OF_INK;
  g.beginPath(); g.moveTo(-11, -20); g.bezierCurveTo(-12.4, -32, 12.4, -32, 11, -20); g.quadraticCurveTo(0, -23.4, -11, -20); g.closePath(); ofFillStroke(g, col, ink, 1.3);
  g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(-4, -27.4, 3.2, 1.6, -0.4, 0, Math.PI * 2); g.fill();
  if (o.stripe) { g.fillStyle = k(o.stripe, c); g.fillRect(-1.2, -30.6, 2.4, 8); }
} });
defineOutfitPart('goggles', { layer: 'front', draw(c, o, k) {
  // goggles over the eyes (swim, ski, lab, welding), strap round the head; `up` = pushed up on the forehead
  const g = c.g, ink = o.ink || OF_INK, lens = k(o.lens || 'rgba(140,220,255,0.45)', c), frame = k(o.frame || '#2b2840', c);
  const y = o.up ? -25.4 : -16.2, lx = o.up ? 0 : c.look, r = o.up ? 3.2 : 4.4;
  g.fillStyle = k(o.strap || frame, c); g.fillRect(-11.6, y - 1.2, 23.2, 2.4);
  if (o.ski) { ofRR(g, -10 + lx, y - 4.4, 20, 8.8, 4); ofFillStroke(g, lens, frame, 1.8); g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(-4 + lx, y - 1.6, 3.4, 1.2, -0.2, 0, Math.PI * 2); g.fill(); return; }
  for (const ex of [-5, 5]) { ofCircle(g, ex + lx, y, r); ofFillStroke(g, lens, frame, 1.6); }
  g.fillStyle = 'rgba(255,255,255,0.6)'; for (const ex of [-5, 5]) { ofCircle(g, ex + lx - r * 0.35, y - r * 0.35, r * 0.25); g.fill(); }
} });
defineOutfitPart('divemask', { layer: 'front', hat: true, draw(c, o, k) {
  // one glass mask over both eyes with a snorkel up one side
  const g = c.g, lx = c.look, frame = k(o.frame || '#ffc53d', c), b = c.face >= 0 ? -1 : 1;
  if (o.snorkel !== false) { g.strokeStyle = OF_INK; g.lineWidth = 3.4; g.beginPath(); g.moveTo(b * 8, -12); g.lineTo(b * 12, -14); g.lineTo(b * 12, -32); g.stroke(); g.strokeStyle = k(o.snorkel || '#ff6b4a', c); g.lineWidth = 2; g.stroke(); }
  g.fillStyle = OF_INK; g.fillRect(-11.6, -18, 23.2, 2.4);
  ofRR(g, -9.4 + lx, -21, 18.8, 9.6, 4.4); ofFillStroke(g, 'rgba(150,225,255,0.22)', frame, 1.6);
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(-4.6 + lx, -18.6, 2.6, 1.1, -0.3, 0, Math.PI * 2); g.fill();
} });
defineOutfitPart('spacehelmet', { layer: 'front', lift: 0, hat: true, draw(c, o, k) {
  // a glass bubble over the whole head with a collar ring and a little antenna light
  const g = c.g, ring = k(o.ring || '#e8eef8', c), ink = o.ink || OF_INK;
  g.beginPath(); g.ellipse(0, -18, 15, 17, 0, 0, Math.PI * 2);
  g.fillStyle = 'rgba(190,235,255,0.18)'; g.fill(); g.strokeStyle = 'rgba(28,26,54,0.55)'; g.lineWidth = 1.4; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.8; g.beginPath(); g.arc(0, -18, 12.4, Math.PI * 1.1, Math.PI * 1.45); g.stroke();
  ofRR(g, -13, -4.4, 26, 4, 2); ofFillStroke(g, ring, ink, 1.2);
  g.strokeStyle = ink; g.lineWidth = 1.2; g.beginPath(); g.moveTo(6, -33); g.lineTo(8, -38); g.stroke();
  g.fillStyle = (Math.sin(c.t * 4) > 0) ? k(o.light || '#ff5a5a', c) : '#7a2a2a'; ofCircle(g, 8, -38.6, 1.6); g.fill();
} });
defineOutfitPart('hood', { layer: 'head', lift: 2, earsOver: true, draw(c, o, k) {
  // a hood up round the face (rain hood, parka with fur, monk), the face shows through an oval
  const g = c.g, col = k(o.col || '#ffd23f', c), ink = o.ink || OF_INK;
  g.beginPath(); g.moveTo(-12.4, -6); g.lineTo(-12.4, -22); g.bezierCurveTo(-12.4, -34, 12.4, -34, 12.4, -22); g.lineTo(12.4, -6);
  g.lineTo(9.6, -7); g.bezierCurveTo(11, -25, -11, -25, -9.6, -7); g.closePath(); ofFillStroke(g, col, ink, 1.3);
  if (o.fur) { g.strokeStyle = k(o.fur, c); g.lineWidth = 2.6; g.setLineDash([1.6, 1.2]); g.beginPath(); g.moveTo(-10.6, -7.4); g.bezierCurveTo(-12, -26.6, 12, -26.6, 10.6, -7.4); g.stroke(); g.setLineDash([]); }
  if (o.ears) { g.fillStyle = col; for (const s of [-1, 1]) { ofPoly(g, [s * 5, -30.6, s * 9, -36, s * 10.6, -28.4]); g.fill(); g.strokeStyle = ink; g.lineWidth = 1.1; g.stroke(); } }
} });
defineOutfitPart('earmuffs', { layer: 'head', lift: 2, draw(c, o, k) {
  const g = c.g, col = k(o.col || '#fff', c), ink = o.ink || OF_INK;
  g.strokeStyle = k(o.band || '#2b2840', c); g.lineWidth = 2; g.beginPath(); g.arc(0, -19, 12.4, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
  for (const s of [-1, 1]) { ofCircle(g, s * 11.6, -17, 3.6); ofFillStroke(g, col, ink, 1.1); }
} });
defineOutfitPart('flowers', { layer: 'head', lift: 2, draw(c, o, k) {
  // a ring of little flowers or laurel leaves round the head (`laurel`)
  const g = c.g, ink = o.ink || OF_INK;
  if (o.laurel) {
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const a = Math.PI * (s < 0 ? 1.05 + i * 0.1 : 1.95 - i * 0.1); g.save(); g.translate(Math.cos(a) * 11, -22 + Math.sin(a) * 6); g.rotate(a + Math.PI / 2 * s); g.fillStyle = k(o.col || '#ffc53d', c); g.beginPath(); g.ellipse(0, 0, 3, 1.4, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
    return;
  }
  const cols = o.cols || ['#ff8fc7', '#fff', '#ffd23f', '#b28dff'];
  g.strokeStyle = '#3f8f5c'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(0, -25, 10.6, 2.2, 0, Math.PI, Math.PI * 2); g.stroke();
  for (let i = 0; i < 5; i++) { const x = -9 + i * 4.5, y = -25 - Math.sin((i / 4) * Math.PI) * 2.2; g.fillStyle = k(cols[i % cols.length], c); for (let a = 0; a < 5; a++) { ofCircle(g, x + Math.cos(a * 1.26) * 1.4, y + Math.sin(a * 1.26) * 1.4, 1.1); g.fill(); } g.fillStyle = '#ffc53d'; ofCircle(g, x, y, 0.8); g.fill(); }
  void ink;
} });
defineOutfitPart('feather', { layer: 'head', lift: 1, draw(c, o, k) {
  // a headband with feathers up the back (jungle explorer)
  const g = c.g, ink = o.ink || OF_INK, b = c.face >= 0 ? -1 : 1, cols = o.cols || ['#e8483a', '#ffd23f', '#3fbf6a'];
  cols.forEach((fc, i) => { g.save(); g.translate(b * (4 + i * 2.6), -25); g.rotate(b * (0.2 + i * 0.25)); g.beginPath(); g.ellipse(0, -5, 2, 5.6, 0, 0, Math.PI * 2); ofFillStroke(g, k(fc, c), ink, 0.9); g.restore(); });
  g.save(); ofBodyClip(g); g.fillStyle = k(o.band || '#b07a44', c); g.fillRect(-12, -24.8, 24, 3.2); g.fillStyle = '#ffd23f'; for (let x = -9; x <= 9; x += 4.5) g.fillRect(x - 0.8, -23.8, 1.6, 1.2); g.restore();
} });
defineOutfitPart('propeller', { layer: 'head', lift: 8, draw(c, o, k) {
  // a propeller beanie (toy box), segments in bright colours, the propeller spins
  const g = c.g, ink = o.ink || OF_INK, cols = o.cols || ['#e8483a', '#ffd23f', '#3fbf6a', '#5b95ff'];
  g.save(); g.beginPath(); g.moveTo(-10.4, -24); g.bezierCurveTo(-10.4, -34, 10.4, -34, 10.4, -24); g.closePath(); g.clip();
  for (let i = 0; i < 4; i++) { g.fillStyle = k(cols[i], c); g.fillRect(-11 + i * 5.5, -35, 5.5, 12); }
  g.restore();
  g.beginPath(); g.moveTo(-10.4, -24); g.bezierCurveTo(-10.4, -34, 10.4, -34, 10.4, -24); g.closePath(); g.strokeStyle = ink; g.lineWidth = 1.3; g.stroke();
  g.strokeStyle = ink; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, -31.4); g.lineTo(0, -34.6); g.stroke();
  const a = c.t * 14, sx = Math.cos(a) * 7;
  g.fillStyle = k(o.blade || '#e8483a', c); g.beginPath(); g.ellipse(sx / 2, -35, Math.abs(sx / 2) + 0.4, 1.3, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(-sx / 2, -35, Math.abs(sx / 2) + 0.4, 1.3, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffd23f'; ofCircle(g, 0, -35, 1.2); g.fill();
} });
defineOutfitPart('antenna', { layer: 'head', lift: 0, draw(c, o, k) {
  // robot antennae with blinking bulbs (or one, `one`)
  const g = c.g, ink = o.ink || OF_INK;
  const xs = o.one ? [0] : [-5, 5];
  for (const x of xs) {
    g.strokeStyle = ink; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, -26); g.lineTo(x * 1.3, -33); g.stroke();
    const on = Math.sin(c.t * 5 + x) > -0.2;
    ofCircle(g, x * 1.3, -34.4, 2); ofFillStroke(g, on ? k(o.col || '#7dffb0', c) : '#3a5a4a', ink, 1);
  }
  ofRR(g, -6, -27.4, 12, 2.6, 1.2); ofFillStroke(g, '#c9d0da', ink, 1);
} });
defineOutfitPart('ringmaster', { layer: 'head', lift: 13, draw(c, o, k) {
  OUTFIT_PARTS.tophat.draw(c, Object.assign({ col: '#c8202a', band: '#ffc53d', tall: 11 }, o), k);
} });
defineOutfitPart('clownwig', { layer: 'head', lift: 5, earsOver: true, draw(c, o, k) {
  // curly clown hair puffs either side and a tiny hat
  const g = c.g, col = k(o.col || '#ff8fc7', c), ink = o.ink || OF_INK;
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { ofCircle(g, s * (11 + i * 0.8), -24 + i * 3.6, 3.4); ofFillStroke(g, col, ink, 1); }
  if (o.hat !== false) { ofRR(g, -4, -32, 8, 6.4, 1.2); ofFillStroke(g, k(o.hat || '#2b2840', c), ink, 1.2); g.fillRect(-6, -26.4, 12, 1.8); g.strokeRect(-6, -26.4, 12, 1.8); }
} });
defineOutfitPart('pumpkinhat', { layer: 'head', lift: 8, draw(c, o, k) {
  // a little pumpkin worn as a hat, with a leaf (`leaf: false` for Pip, whose sprout grows out of the stem)
  const g = c.g, ink = o.ink || OF_INK;
  for (const dx of [-5, 5, 0]) { g.beginPath(); g.ellipse(dx, -29, dx ? 5 : 5.6, 4.6, 0, 0, Math.PI * 2); ofFillStroke(g, k(o.col || '#ff8a1e', c), ink, 1.2); }
  g.strokeStyle = '#3f6a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -33); g.lineTo(1, -36.4); g.stroke();
  if (o.leaf !== false) { g.fillStyle = '#5cc27f'; g.beginPath(); g.ellipse(3.4, -35.6, 2.8, 1.4, -0.5, 0, Math.PI * 2); g.fill(); }
} });
defineOutfitPart('dinohood', { layer: 'head', lift: 4, earsOver: true, draw(c, o, k) {
  // a dino-costume hood: green with spikes down the back of the head
  const g = c.g, col = k(o.col || '#5cc27f', c), ink = o.ink || OF_INK, b = c.face >= 0 ? -1 : 1;
  for (let i = 0; i < 4; i++) { const a = Math.PI * (1.25 + i * 0.16) , x = Math.cos(a) * 11 * -b, y = -21 + Math.sin(a) * 10; ofPoly(g, [x - 2.4, y + 0.6, x + Math.cos(a) * 4.6 * -b, y + Math.sin(a) * 4.6, x + 2.4, y - 0.4]); ofFillStroke(g, k(o.spikes || '#ffc53d', c), ink, 1); }
  OUTFIT_PARTS.hood.draw(c, { col, ink }, k);
  g.fillStyle = '#fff'; for (const x of [-6, -2, 2, 6]) { ofPoly(g, [x - 1.4, -24.4, x, -22, x + 1.4, -24.4]); g.fill(); }
} });
defineOutfitPart('nemes', { layer: 'head', lift: 4, earsOver: true, draw(c, o, k) {
  // a pharaoh's striped headcloth down both sides
  const g = c.g, col = k(o.col || '#ffc53d', c), st = k(o.stripe || '#2f5fc4', c), ink = o.ink || OF_INK;
  g.beginPath(); g.moveTo(-14, -6); g.lineTo(-12.4, -22); g.bezierCurveTo(-12, -32, 12, -32, 12.4, -22); g.lineTo(14, -6); g.lineTo(9.6, -7); g.lineTo(9.6, -21.6); g.quadraticCurveTo(0, -24.4, -9.6, -21.6); g.lineTo(-9.6, -7); g.closePath();
  g.save(); g.fillStyle = col; g.fill(); g.clip(); g.fillStyle = st; for (let y = -31; y < -4; y += 3.4) g.fillRect(-15, y, 30, 1.5); g.restore();
  g.strokeStyle = ink; g.lineWidth = 1.3; g.stroke();
  g.fillStyle = '#ffd23f'; ofRR(g, -10, -24.2, 20, 2.4, 1); g.fill();
  g.fillStyle = k(o.gem || '#2fbf9f', c); ofCircle(g, 0, -26.4, 1.6); g.fill();
} });
defineOutfitPart('turban', { layer: 'head', lift: 7, draw(c, o, k) {
  // a wrapped desert headcloth with a tail (camel rider)
  const g = c.g, col = k(o.col || '#fff', c), ink = o.ink || OF_INK, b = c.face >= 0 ? -1 : 1;
  g.beginPath(); g.moveTo(-11, -22.6); g.bezierCurveTo(-12.6, -35, 12.6, -35, 11, -22.6); g.quadraticCurveTo(0, -25, -11, -22.6); g.closePath(); ofFillStroke(g, col, ink, 1.3);
  g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 1; for (const y of [-26, -29.5]) { g.beginPath(); g.moveTo(-10, y + 1); g.quadraticCurveTo(0, y - 2, 10, y + 1); g.stroke(); }
  g.fillStyle = col; g.strokeStyle = ink; g.lineWidth = 1.1; const w = Math.sin(c.t * 8) * 1.4;
  g.beginPath(); g.moveTo(b * 9, -24); g.quadraticCurveTo(b * 15, -20 + w, b * 14, -12 + w); g.lineTo(b * 10.6, -13); g.quadraticCurveTo(b * 11, -19, b * 8, -22); g.closePath(); g.fill(); g.stroke();
  if (o.gem) { g.fillStyle = k(o.gem, c); ofCircle(g, 0, -27.4, 1.6); g.fill(); }
} });
defineOutfitPart('rainhat', { layer: 'head', lift: 5, draw(c, o, k) {
  // a sou'wester rain hat: a long brim down the back
  const g = c.g, col = k(o.col || '#ffd23f', c), ink = o.ink || OF_INK, b = c.face >= 0 ? -1 : 1;
  g.beginPath(); g.moveTo(-b * 13, -24); g.quadraticCurveTo(0, -26, b * 14, -20); g.lineTo(b * 15, -17); g.quadraticCurveTo(0, -22.6, -b * 13, -22.4); g.closePath(); ofFillStroke(g, col, ink, 1.2);
  g.beginPath(); g.moveTo(-9.6, -24.2); g.bezierCurveTo(-10, -33.6, 10, -33.6, 9.6, -24.2); g.closePath(); ofFillStroke(g, col, ink, 1.4);
  g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(0, -31.6); g.lineTo(0, -24.6); g.stroke();
} });
defineOutfitPart('mohawk', { layer: 'head', lift: 6, draw(c, o, k) {
  // a punk spiky crest (toy-robot, superhero sidekick...), or a knight's plume when `plume`
  const g = c.g, col = k(o.col || '#e8483a', c), ink = o.ink || OF_INK;
  g.beginPath(); g.moveTo(-6, -25.6);
  for (let i = 0; i < 5; i++) { const x = -6 + i * 3; g.lineTo(x + 1.5, -33 - (i === 2 ? 2 : i % 2) * 1.6); g.lineTo(x + 3, -25.6); }
  g.closePath(); ofFillStroke(g, col, ink, 1.1);
} });
defineOutfitPart('knight', { layer: 'head', lift: 9, earsOver: false, draw(c, o, k) {
  // a knight's open helmet with a plume
  const g = c.g, col = k(o.col || '#c9d0da', c), ink = o.ink || OF_INK, b = c.face >= 0 ? -1 : 1;
  g.fillStyle = k(o.plume || '#e8483a', c); g.strokeStyle = ink; g.lineWidth = 1.1;
  g.beginPath(); g.moveTo(0, -31); g.quadraticCurveTo(b * 8, -40, b * 15, -33); g.quadraticCurveTo(b * 9, -35, 0, -29); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-11.4, -17); g.lineTo(-11.4, -23); g.bezierCurveTo(-11.4, -33.4, 11.4, -33.4, 11.4, -23); g.lineTo(11.4, -17); g.lineTo(9, -17); g.lineTo(9, -22); g.quadraticCurveTo(0, -24, -9, -22); g.lineTo(-9, -17); g.closePath(); ofFillStroke(g, col, ink, 1.3);
  g.strokeStyle = 'rgba(28,26,54,0.4)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(0, -32); g.lineTo(0, -23.4); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(-5, -28.8, 2.4, 1.3, -0.4, 0, Math.PI * 2); g.fill();
} });
defineOutfitPart('bow', { layer: 'head', lift: 0, draw(c, o, k) {
  // a ribbon bow on top of the head (on the side for Pip so the sprout shows)
  const g = c.g, col = k(o.col || '#ff8fc7', c), ink = o.ink || OF_INK, x = o.x != null ? o.x : (c.id === 0 ? -5 : 0);
  ofPoly(g, [x, -26.4, x - 5.4, -30.4, x - 5.4, -22.8]); ofFillStroke(g, col, ink, 1);
  ofPoly(g, [x, -26.4, x + 5.4, -30.4, x + 5.4, -22.8]); ofFillStroke(g, col, ink, 1);
  ofCircle(g, x, -26.4, 1.7); ofFillStroke(g, col, ink, 1);
} });
defineOutfitPart('ninjahood', { layer: 'body', lift: 0, hat: true, draw(c, o, k) {
  // a ninja wrap: the top of the head and the lower face covered, an open band across the eyes
  const g = c.g, col = k(o.col || '#2b2840', c);
  g.save(); ofBodyClip(g); g.fillStyle = col;
  g.fillRect(-12, -27, 24, 6.4); g.fillRect(-12, -11.4, 24, 6.4);
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(-12, -11.4, 24, 1);
  g.restore();
} });
defineOutfitPart('domino', { layer: 'body', draw(c, o, k) {
  // a superhero's eye mask (the eyes draw on top)
  const g = c.g, col = k(o.col || '#2b2840', c), lx = c.look;
  g.fillStyle = col; g.beginPath(); g.moveTo(-10.6 + lx, -18.4); g.quadraticCurveTo(-5 + lx, -22.6, 0 + lx, -19); g.quadraticCurveTo(5 + lx, -22.6, 10.6 + lx, -18.4);
  g.quadraticCurveTo(9.6 + lx, -12, 5 + lx, -12.4); g.quadraticCurveTo(1.6 + lx, -13, 0 + lx, -15); g.quadraticCurveTo(-1.6 + lx, -13, -5 + lx, -12.4); g.quadraticCurveTo(-9.6 + lx, -12, -10.6 + lx, -18.4); g.closePath(); g.fill();
} });

defineOutfitPart('visor', { layer: 'head', lift: 0, draw(c, o, k) {
  // a sun visor / dealer's visor: a band and a peak, no crown (Pip's sprout pokes out of the top)
  const g = c.g, col = k(o.col || '#3fbf6a', c), ink = o.ink || OF_INK, f = c.face >= 0 ? 1 : -1;
  g.beginPath(); g.moveTo(-f * 2, -23.6); g.quadraticCurveTo(f * 8, -25, f * 15, -21.4); g.quadraticCurveTo(f * 8, -20.4, -f * 2, -21.4); g.closePath();
  g.fillStyle = col; g.globalAlpha *= o.glass ? 0.75 : 1; g.fill(); g.globalAlpha = 1; g.strokeStyle = ink; g.lineWidth = 1.1; g.stroke();
  g.save(); ofBodyClip(g); g.fillStyle = k(o.band || o.col || '#3fbf6a', c); g.fillRect(-12, -25.4, 24, 3.2); g.restore();
  g.strokeStyle = 'rgba(28,26,54,0.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-10.6, -22.2); g.lineTo(10.6, -22.2); g.stroke();
} });
defineOutfitPart('flatcap', { layer: 'head', lift: 4, draw(c, o, k) {
  // a newsboy / flat cap, the peak the way they face
  const g = c.g, col = k(o.col || '#8a7a66', c), ink = o.ink || OF_INK, f = c.face >= 0 ? 1 : -1;
  g.beginPath(); g.moveTo(-f * 11, -23.4); g.quadraticCurveTo(-f * 12, -31, f * 2, -30.6); g.quadraticCurveTo(f * 13, -30, f * 14, -24.6); g.quadraticCurveTo(f * 8, -22.6, -f * 11, -23.4); g.closePath(); ofFillStroke(g, col, ink, 1.3);
  g.strokeStyle = 'rgba(28,26,54,0.3)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-f * 8, -24); g.quadraticCurveTo(f * 2, -27.4, f * 11, -25); g.stroke();
  g.fillStyle = ink; ofCircle(g, -f * 1.4, -30.2, 0.9); g.fill();
} });
defineOutfitPart('bowler', { layer: 'head', lift: 8, draw(c, o, k) {
  const g = c.g, col = k(o.col || '#2b2840', c), ink = o.ink || OF_INK;
  g.beginPath(); g.ellipse(0, -24.8, 12.6, 2.4, 0, 0, Math.PI * 2); ofFillStroke(g, col, ink, 1.3);
  g.beginPath(); g.moveTo(-7.6, -25); g.bezierCurveTo(-8.4, -35, 8.4, -35, 7.6, -25); g.closePath(); ofFillStroke(g, col, ink, 1.4);
  g.fillStyle = k(o.band || '#5a3a2a', c); g.fillRect(-7.6, -27.2, 15.2, 2);
} });
defineOutfitPart('nightcap', { layer: 'head', lift: 3, draw(c, o, k) {
  // a floppy sleeping cap, its tip and pompom flopping behind
  const g = c.g, col = k(o.col || 'own', c), ink = o.ink || OF_INK, b = c.face >= 0 ? -1 : 1, w = Math.sin(c.t * 4) * 1.2;
  g.beginPath(); g.moveTo(-b * 10.6, -23.4); g.bezierCurveTo(-b * 9, -33, b * 6, -34, b * 15, -26 + w); g.quadraticCurveTo(b * 11, -27, b * 10.6, -23.4); g.closePath(); ofFillStroke(g, col, ink, 1.3);
  if (o.stripe) { g.save(); g.clip(); g.fillStyle = k(o.stripe, c); for (let x = -12; x < 16; x += 5) { g.save(); g.translate(x, -28); g.rotate(-0.5 * b); g.fillRect(-1, -8, 2, 16); g.restore(); } g.restore(); g.strokeStyle = ink; g.lineWidth = 1.3; g.stroke(); }
  ofRR(g, -11.2, -25.4, 22.4, 3.6, 1.8); ofFillStroke(g, k(o.trim || '#fff', c), ink, 1.1);
  ofCircle(g, b * 15.4, -25 + w, 2.6); ofFillStroke(g, k(o.pom || '#fff', c), ink, 1);
} });
defineOutfitPart('saucepan', { layer: 'head', lift: 7, draw(c, o, k) {
  // a cooking pot worn as a helmet, handle sticking out the back
  const g = c.g, col = k(o.col || '#b8c0cc', c), ink = o.ink || OF_INK, b = c.face >= 0 ? -1 : 1;
  ofRR(g, b * 8, -30, b * 9, 2.8, 1.2); ofFillStroke(g, '#2b2840', ink, 1);
  ofRR(g, -10, -32, 20, 9, 1.6); ofFillStroke(g, col, ink, 1.4);
  ofRR(g, -11.4, -24.6, 22.8, 2.4, 1.2); ofFillStroke(g, col, ink, 1.1);
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(-7.4, -30.6, 2, 6);
  g.fillStyle = 'rgba(28,26,54,0.25)'; ofCircle(g, 3, -28, 1.4); g.fill();
} });
defineOutfitPart('acorn', { layer: 'head', lift: 7, draw(c, o, k) {
  // an acorn cap worn as a hat (tiny in a big world)
  const g = c.g, ink = o.ink || OF_INK;
  g.beginPath(); g.moveTo(-11.4, -24); g.bezierCurveTo(-12, -34, 12, -34, 11.4, -24); g.quadraticCurveTo(0, -21.4, -11.4, -24); g.closePath(); ofFillStroke(g, k(o.col || '#a5703a', c), ink, 1.3);
  g.save(); g.clip(); g.strokeStyle = 'rgba(60,30,10,0.45)'; g.lineWidth = 0.8;
  for (let x = -14; x < 14; x += 3) { g.beginPath(); g.moveTo(x, -21); g.lineTo(x + 8, -34); g.moveTo(x, -34); g.lineTo(x + 8, -21); g.stroke(); }
  g.restore();
  g.strokeStyle = '#6a4220'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, -31.6); g.lineTo(1.4, -35); g.stroke();
} });
defineOutfitPart('thimble', { layer: 'head', lift: 9, draw(c, o, k) {
  // a sewing thimble worn as a helmet
  const g = c.g, col = k(o.col || '#c9d0da', c), ink = o.ink || OF_INK;
  g.beginPath(); g.moveTo(-10, -23); g.lineTo(-8.6, -33); g.quadraticCurveTo(0, -36, 8.6, -33); g.lineTo(10, -23); g.closePath(); ofFillStroke(g, col, ink, 1.4);
  g.fillStyle = 'rgba(28,26,54,0.25)'; for (let y = -31; y < -25; y += 2.6) for (let x = -7; x <= 7; x += 2.6) { ofCircle(g, x + (y % 2 ? 1.3 : 0), y, 0.6); g.fill(); }
  ofRR(g, -10.6, -25.4, 21.2, 2.8, 1.2); ofFillStroke(g, col, ink, 1);
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(-6.6, -32, 1.6, 6);
} });
defineOutfitPart('greek', { layer: 'head', lift: 10, draw(c, o, k) {
  // an ancient Greek helmet with a tall crest front to back
  const g = c.g, col = k(o.col || '#d6a845', c), ink = o.ink || OF_INK, f = c.face >= 0 ? 1 : -1;
  g.beginPath(); g.moveTo(-f * 11, -28); g.quadraticCurveTo(-f * 4, -42, f * 9, -31); g.lineTo(f * 6, -30); g.quadraticCurveTo(-f * 3, -37, -f * 9, -27); g.closePath(); ofFillStroke(g, k(o.crest || '#e8483a', c), ink, 1.1);
  g.beginPath(); g.moveTo(-11.4, -15); g.lineTo(-11.4, -23); g.bezierCurveTo(-11.4, -33.4, 11.4, -33.4, 11.4, -23); g.lineTo(11.4, -15); g.lineTo(9, -16); g.lineTo(9, -22); g.quadraticCurveTo(0, -24, -9, -22); g.lineTo(-9, -16); g.closePath(); ofFillStroke(g, col, ink, 1.3);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-5, -29, 2.6, 1.3, -0.4, 0, Math.PI * 2); g.fill();
} });
defineOutfitPart('cavefur', { draw(c, o, k) {
  // a spotted fur wrap over one shoulder (Ice Age, Stonehenge)
  const g = c.g, col = k(o.col || '#e0a050', c);
  g.save(); ofBodyClip(g); g.fillStyle = col; ofPoly(g, [-12, -6, -4, -8, 6, -13, 12, -17, 12, 2, -12, 2]); g.fill();
  g.fillStyle = k(o.spots || '#7a4a1a', c); for (const [x, y] of [[-7, -3], [-1, -5.6], [5, -8], [8, -3], [1, -1.4], [-5, 0]]) { g.beginPath(); g.ellipse(x, y, 1.5, 1.1, 0.4, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = 'rgba(28,26,54,0.35)'; g.lineWidth = 0.9; g.setLineDash([1.6, 1.4]); g.beginPath(); g.moveTo(-12, -6); g.lineTo(-4, -8); g.lineTo(6, -13); g.lineTo(12, -17); g.stroke(); g.setLineDash([]);
  g.restore();
} });
defineOutfitPart('bib', { draw(c, o, k) {
  // a napkin tucked in (eating contests)
  const g = c.g, col = k(o.col || '#fff', c), ink = o.ink || OF_INK;
  ofPoly(g, [-8, -8.4, 8, -8.4, 6, 0, -6, 0]); ofFillStroke(g, col, ink, 1);
  if (o.check) { g.save(); ofPoly(g, [-8, -8.4, 8, -8.4, 6, 0, -6, 0]); g.clip(); g.fillStyle = k(o.check, c); for (let y = -8; y < 0; y += 3) for (let x = -8 + ((y / 3) % 2 ? 0 : 1.5); x < 8; x += 3) g.fillRect(x, y, 1.5, 1.5); g.restore(); }
  ofPoly(g, [-2, -8.4, 0, -10, 2, -8.4]); ofFillStroke(g, col, ink, 0.9);
} });

/* ---------- parts: body (clothes) ---------- */
// most clothes cover the lower body, from y -9 down to the feet, clipped to the body's outline
function ofLower(c, top, fill) { const g = c.g; g.save(); ofBodyClip(g); g.fillStyle = fill; g.fillRect(-12, top, 24, 30); g.restore(); }
function ofHem(c, y, col) { const g = c.g; g.save(); ofBodyClip(g); g.strokeStyle = col || 'rgba(28,26,54,0.45)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-12, y); g.lineTo(12, y); g.stroke(); g.restore(); }
defineOutfitPart('shirt', { draw(c, o, k) {
  // a top over the lower body (jersey, wetsuit, uniform). `top` is where it starts (default -8), `stripes` adds
  // horizontal stripes, `number` a big number, `collar` a V of colour
  const g = c.g, top = o.top != null ? o.top : -8, col = k(o.col || '#fff', c);
  ofLower(c, top, col);
  g.save(); ofBodyClip(g);
  if (o.stripes) { g.fillStyle = k(o.stripes, c); for (let y = top + 2; y < 0; y += 4) g.fillRect(-12, y, 24, 1.8); }
  if (o.vstripe) { g.fillStyle = k(o.vstripe, c); g.fillRect(-1.4, top, 2.8, -top); }
  if (o.side) { g.fillStyle = k(o.side, c); g.fillRect(-11, top, 2.4, -top); g.fillRect(8.6, top, 2.4, -top); }
  if (o.number != null) { g.fillStyle = k(o.numCol || 'own', c); g.font = '700 7px "Lilita One", "Arial Rounded MT Bold", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(o.number === 'id' ? c.id + 1 : o.number), 0, top / 2 + 0.6); }
  if (o.emblem) { g.fillStyle = k(o.emblem, c); ofStar(g, 0, top / 2, 2.6); g.fill(); }
  g.restore();
  if (o.collar) { g.fillStyle = k(o.collar, c); ofPoly(g, [-4, top, 0, top + 3.4, 4, top]); g.fill(); }
  ofHem(c, top);
  if (o.belt) { g.save(); ofBodyClip(g); g.fillStyle = k(o.belt, c); g.fillRect(-12, -3.4, 24, 1.8); g.restore(); }
} });
defineOutfitPart('overalls', { draw(c, o, k) {
  // dungarees: a bib with two straps over the shoulders, buttons
  const g = c.g, col = k(o.col || '#3d6fd0', c), ink = o.ink || OF_INK;
  g.save(); ofBodyClip(g);
  g.fillStyle = col; g.fillRect(-12, -6, 24, 7); ofRR(g, -6, -11, 12, 7, 1.4); g.fill();
  g.fillRect(-9, -26, 2.6, 16); g.fillRect(6.4, -26, 2.6, 16);
  g.fillStyle = k(o.button || '#ffc53d', c); ofCircle(g, -4.2, -9, 0.9); g.fill(); ofCircle(g, 4.2, -9, 0.9); g.fill();
  if (o.pocket) { g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.8; g.strokeRect(-2.4, -9, 4.8, 3.4); }
  g.restore();
  g.strokeStyle = 'rgba(28,26,54,0.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-6, -11); g.lineTo(6, -11); g.stroke(); void ink;
} });
defineOutfitPart('apron', { draw(c, o, k) {
  const g = c.g, col = k(o.col || '#fff', c);
  g.save(); ofBodyClip(g);
  g.fillStyle = col; ofRR(g, -7, -10, 14, 11, 1.6); g.fill();
  g.strokeStyle = col; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-7, -9.6); g.lineTo(-11, -12); g.moveTo(7, -9.6); g.lineTo(11, -12); g.stroke();
  if (o.trim) { g.fillStyle = k(o.trim, c); g.fillRect(-7, -1.6, 14, 1.6); }
  if (o.pocket) { g.strokeStyle = k(o.pocket, c); g.lineWidth = 0.9; g.strokeRect(-3, -6, 6, 3); }
  if (o.stain) { g.fillStyle = k(o.stain, c); ofCircle(g, 3.4, -4.4, 1.2); g.fill(); ofCircle(g, -3, -2.6, 0.8); g.fill(); }
  g.restore();
} });
defineOutfitPart('scarf', { draw(c, o, k) {
  // a scarf round the "neck" (just under the cheeks) with an end that flaps behind
  const g = c.g, col = k(o.col || '#e8483a', c), ink = o.ink || OF_INK, b = c.face >= 0 ? -1 : 1;
  const w = Math.sin(c.t * 9) * 1.4, s = Math.min(1, Math.abs(c.vx) / 220) * 5;
  g.fillStyle = col; g.strokeStyle = ink; g.lineWidth = 1.1;
  g.beginPath(); g.moveTo(b * 8, -6.6); g.quadraticCurveTo(b * (13 + s), -6 + w, b * (17 + s), -4 - w); g.lineTo(b * (16 + s), -1 - w); g.quadraticCurveTo(b * (12 + s), -2.6 + w, b * 8, -3.6); g.closePath(); g.fill(); g.stroke();
  g.save(); ofBodyClip(g); g.fillStyle = col; g.fillRect(-12, -7.4, 24, 3.6);
  if (o.stripe) { g.fillStyle = k(o.stripe, c); for (let x = -10; x < 12; x += 5) g.fillRect(x, -7.4, 2, 3.6); }
  g.restore();
  ofHem(c, -7.4, 'rgba(28,26,54,0.35)'); ofHem(c, -3.8, 'rgba(28,26,54,0.35)');
  g.fillStyle = col; ofRR(g, -b * 3 - 1.8, -5, 3.6, 5.4, 1); g.fill(); g.stroke();
} });
defineOutfitPart('neckerchief', { draw(c, o, k) {
  // a triangle of cloth tied at the neck (cowboy, scout, sailor)
  const g = c.g, col = k(o.col || '#e8483a', c), ink = o.ink || OF_INK;
  ofPoly(g, [-7.6, -8, 7.6, -8, 0, -1.4]); ofFillStroke(g, col, ink, 1);
  if (o.dots) { g.fillStyle = k(o.dots, c); for (const [x, y] of [[-3, -6.4], [2.6, -6.4], [0, -3.6]]) { ofCircle(g, x, y, 0.7); g.fill(); } }
} });
defineOutfitPart('bowtie', { draw(c, o, k) {
  const g = c.g, col = k(o.col || '#e8483a', c), ink = o.ink || OF_INK;
  ofPoly(g, [0, -6.4, -4.6, -9, -4.6, -3.8]); ofFillStroke(g, col, ink, 1);
  ofPoly(g, [0, -6.4, 4.6, -9, 4.6, -3.8]); ofFillStroke(g, col, ink, 1);
  ofCircle(g, 0, -6.4, 1.3); ofFillStroke(g, col, ink, 0.9);
  if (o.dots) { g.fillStyle = k(o.dots, c); ofCircle(g, -2.6, -6.4, 0.6); g.fill(); ofCircle(g, 2.6, -6.4, 0.6); g.fill(); }
} });
defineOutfitPart('tie', { draw(c, o, k) {
  const g = c.g, col = k(o.col || '#e8483a', c), ink = o.ink || OF_INK;
  ofPoly(g, [-1.6, -8, 1.6, -8, 1, -6.6, 2.2, -1.4, 0, 0.4, -2.2, -1.4, -1, -6.6]); ofFillStroke(g, col, ink, 0.9);
} });
defineOutfitPart('belt', { draw(c, o, k) {
  const g = c.g, col = k(o.col || '#5a3418', c);
  g.save(); ofBodyClip(g); g.fillStyle = col; g.fillRect(-12, o.y != null ? o.y : -5, 24, 2.6); g.restore();
  const y = o.y != null ? o.y : -5;
  g.fillStyle = k(o.buckle || '#ffd23f', c); g.strokeStyle = OF_INK; g.lineWidth = 0.7; ofRR(g, -2, y - 0.6, 4, 3.8, 0.8); g.fill(); g.stroke();
  if (o.pouch) { g.fillStyle = k(o.pouch, c); ofRR(g, 5, y + 1, 4, 4, 1); g.fill(); g.stroke(); }
} });
defineOutfitPart('sash', { draw(c, o, k) {
  // a diagonal band from one shoulder (pirate sash, pageant, ninja belt)
  const g = c.g, col = k(o.col || '#e8483a', c);
  g.save(); ofBodyClip(g); g.fillStyle = col; ofPoly(g, [-12, -14, -8, -14, 12, -1.6, 12, 2.4]); g.fill();
  g.strokeStyle = 'rgba(28,26,54,0.3)'; g.lineWidth = 0.8; g.stroke(); g.restore();
  if (o.knot) { g.fillStyle = col; ofCircle(g, 9.4, -2.6, 1.8); g.fill(); }
} });
defineOutfitPart('vest', { draw(c, o, k) {
  // an open vest: two panels down the sides of the lower body
  const g = c.g, col = k(o.col || '#8a5a32', c);
  g.save(); ofBodyClip(g); g.fillStyle = col;
  ofPoly(g, [-12, -12, -4, -9, -3, 1, -12, 1]); g.fill(); ofPoly(g, [12, -12, 4, -9, 3, 1, 12, 1]); g.fill();
  g.strokeStyle = 'rgba(28,26,54,0.35)'; g.lineWidth = 0.8; ofPoly(g, [-12, -12, -4, -9, -3, 1]); g.stroke(); ofPoly(g, [12, -12, 4, -9, 3, 1]); g.stroke();
  if (o.star) { g.fillStyle = '#ffd23f'; ofStar(g, -7, -5.4, 2.2); g.fill(); }
  if (o.buttons) { g.fillStyle = k(o.buttons, c); ofCircle(g, -4.6, -5, 0.6); g.fill(); ofCircle(g, -4.4, -2, 0.6); g.fill(); }
  g.restore();
} });
defineOutfitPart('tunic', { draw(c, o, k) {
  // a toga / tunic: a drape over one shoulder with a belt (Roman, Greek, robe)
  const g = c.g, col = k(o.col || '#f6efdf', c);
  g.save(); ofBodyClip(g); g.fillStyle = col; ofPoly(g, [-12, -9, 4, -9, 12, -16, 12, 2, -12, 2]); g.fill();
  g.strokeStyle = 'rgba(28,26,54,0.22)'; g.lineWidth = 0.8; for (const x of [-6, -1, 4]) { g.beginPath(); g.moveTo(x, -8); g.lineTo(x - 1.4, 0); g.stroke(); }
  g.strokeStyle = 'rgba(28,26,54,0.35)'; ofPoly(g, [-12, -9, 4, -9, 12, -16]); g.stroke();
  if (o.belt) { g.fillStyle = k(o.belt, c); g.fillRect(-12, -4.4, 24, 1.8); }
  g.restore();
} });
defineOutfitPart('robe', { draw(c, o, k) {
  // a long robe (wizard, mage, judge): lower body in a colour with a trim
  const g = c.g, col = k(o.col || '#3a3480', c);
  ofLower(c, -10, col);
  g.save(); ofBodyClip(g); g.fillStyle = k(o.trim || 'own', c); g.fillRect(-12, -2.6, 24, 2); g.fillRect(-1, -10, 2, 10); g.restore();
  ofHem(c, -10);
  g.fillStyle = k(o.clasp || '#ffd23f', c); ofCircle(g, 0, -9.4, 1.6); g.fill();
} });
defineOutfitPart('armor', { draw(c, o, k) {
  // a breastplate / chainmail with rivets
  const g = c.g, col = k(o.col || '#c9d0da', c);
  g.save(); ofBodyClip(g); g.fillStyle = col; ofRR(g, -11, -9, 22, 10, 3); g.fill();
  if (o.mail) { g.strokeStyle = 'rgba(28,26,54,0.25)'; g.lineWidth = 0.6; for (let y = -7.4; y < 0; y += 2) for (let x = -10; x < 11; x += 2.4) { g.beginPath(); g.arc(x + (y % 4 ? 1.2 : 0), y, 0.9, 0, Math.PI); g.stroke(); } }
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-8, -8, 4, 1.2);
  g.fillStyle = 'rgba(28,26,54,0.45)'; for (const x of [-8, 8]) { ofCircle(g, x, -6.4, 0.7); g.fill(); }
  if (o.emblem) { g.fillStyle = k(o.emblem, c); ofPoly(g, [0, -8, 3, -6.4, 2.4, -2.6, 0, -1.4, -2.4, -2.6, -3, -6.4]); g.fill(); }
  g.restore();
  ofHem(c, -9);
} });
defineOutfitPart('furtrim', { draw(c, o, k) {
  // a fur collar / cape edge (viking, arctic)
  const g = c.g, col = k(o.col || '#d8c4a0', c), ink = o.ink || OF_INK;
  g.save(); ofBodyClip(g); g.fillStyle = k(o.under || '#8a5a32', c); g.fillRect(-12, -6, 24, 8); g.restore();
  g.fillStyle = col; for (let x = -10.6; x <= 10.6; x += 3.5) { ofCircle(g, x, -7.4 + Math.abs(x) * 0.08, 2.4); g.fill(); }
  g.strokeStyle = 'rgba(28,26,54,0.3)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-11, -5.6); g.lineTo(11, -5.6); g.stroke(); void ink;
  if (o.belt) { g.save(); ofBodyClip(g); g.fillStyle = k(o.belt, c); g.fillRect(-12, -2.6, 24, 1.8); g.restore(); }
} });
defineOutfitPart('lifevest', { draw(c, o, k) {
  const g = c.g, col = k(o.col || '#ff7a1e', c), ink = o.ink || OF_INK;
  g.save(); ofBodyClip(g); g.fillStyle = col; ofRR(g, -11.4, -11, 8.4, 11.6, 2.4); g.fill(); ofRR(g, 3, -11, 8.4, 11.6, 2.4); g.fill();
  g.strokeStyle = ink; g.lineWidth = 0.9; ofRR(g, -11.4, -11, 8.4, 11.6, 2.4); g.stroke(); ofRR(g, 3, -11, 8.4, 11.6, 2.4); g.stroke();
  g.fillStyle = '#fff'; g.fillRect(-11, -5.6, 7.6, 1.4); g.fillRect(3.4, -5.6, 7.6, 1.4);
  g.restore();
} });
defineOutfitPart('spacesuit', { draw(c, o, k) {
  // a white suit over the lower body with a chest panel of buttons and a stripe in the wearer's colour
  const g = c.g, col = k(o.col || '#eef2f8', c);
  ofLower(c, -9, col);
  g.save(); ofBodyClip(g); g.fillStyle = k(o.stripe || 'own', c); g.fillRect(-12, -2.6, 24, 2.2);
  g.fillStyle = '#c9d0da'; ofRR(g, -4.4, -8, 8.8, 4.6, 1); g.fill();
  const on = Math.sin(c.t * 3 + c.id) > 0;
  g.fillStyle = on ? '#ff5a5a' : '#7dffb0'; ofCircle(g, -2, -5.7, 0.9); g.fill(); g.fillStyle = '#ffd23f'; ofCircle(g, 0.6, -5.7, 0.9); g.fill(); g.fillStyle = '#5bd0ff'; ofCircle(g, 2.6, -5.7, 0.7); g.fill();
  g.restore(); ofHem(c, -9);
} });
defineOutfitPart('emblem', { draw(c, o, k) {
  // a superhero's chest badge: a shield with a star, bolt or letter
  const g = c.g, ink = o.ink || OF_INK, y = o.y != null ? o.y : -5.6;
  ofPoly(g, [-4.2, y - 3.6, 4.2, y - 3.6, 4.2, y + 0.4, 0, y + 3.8, -4.2, y + 0.4]); ofFillStroke(g, k(o.col || '#ffd23f', c), ink, 1);
  g.fillStyle = k(o.mark || 'own', c);
  if (o.bolt) { ofPoly(g, [0.8, y - 3, -2, y + 0.4, 0, y + 0.4, -0.8, y + 3, 2, y - 0.6, 0, y - 0.6]); g.fill(); }
  else { ofStar(g, 0, y - 0.2, 2.4); g.fill(); }
} });
defineOutfitPart('dots', { draw(c, o, k) {
  // spots or a pattern on the lower body (clown suit, pyjamas, dino spots)
  const g = c.g; g.save(); ofBodyClip(g);
  if (o.base) { g.fillStyle = k(o.base, c); g.fillRect(-12, o.top != null ? o.top : -9, 24, 30); }
  g.fillStyle = k(o.col || '#fff', c);
  for (const [x, y, r] of o.at || [[-6, -5, 1.6], [1, -7, 1.3], [6, -3, 1.7], [-1.5, -2, 1.2], [8, -8, 1.1]]) { ofCircle(g, x, y, r); g.fill(); }
  g.restore();
  if (o.base) ofHem(c, o.top != null ? o.top : -9);
} });
defineOutfitPart('buttons', { draw(c, o, k) {
  // a row of big buttons (clown, snowman, coat)
  const g = c.g; g.fillStyle = k(o.col || '#ffd23f', c); g.strokeStyle = OF_INK; g.lineWidth = 0.7;
  for (const y of o.ys || [-6.6, -2.6]) { ofCircle(g, 0, y, 1.5); g.fill(); g.stroke(); }
} });
defineOutfitPart('lei', { draw(c, o, k) {
  const g = c.g, cols = o.cols || ['#ff8fc7', '#ffd23f', '#fff', '#b28dff'];
  for (let i = 0; i < 9; i++) { const x = -10 + i * 2.5, y = -7 + Math.sin(i / 8 * Math.PI) * 3.4; g.fillStyle = k(cols[i % cols.length], c); ofCircle(g, x, y, 1.6); g.fill(); }
} });
defineOutfitPart('ruff', { draw(c, o, k) {
  // a clown / jester collar of points
  const g = c.g, ink = o.ink || OF_INK, cols = o.cols || ['#ffd23f', '#e8483a'];
  for (let i = 0; i < 7; i++) { const x = -10.5 + i * 3.5; ofPoly(g, [x - 2.2, -8.4, x + 2.2, -8.4, x, -3.6]); ofFillStroke(g, k(cols[i % cols.length], c), ink, 0.8); }
} });
defineOutfitPart('labcoat', { draw(c, o, k) {
  const g = c.g, col = k(o.col || '#fff', c);
  g.save(); ofBodyClip(g); g.fillStyle = col; ofPoly(g, [-12, -11, -2.6, -9, -2.2, 2, -12, 2]); g.fill(); ofPoly(g, [12, -11, 2.6, -9, 2.2, 2, 12, 2]); g.fill();
  g.strokeStyle = 'rgba(28,26,54,0.3)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-2.6, -9); g.lineTo(-2.2, 2); g.moveTo(2.6, -9); g.lineTo(2.2, 2); g.stroke();
  if (o.pen) { g.fillStyle = k(o.pen, c); g.fillRect(-8, -7.6, 1.2, 3.4); }
  g.restore();
} });
defineOutfitPart('mustache', { layer: 'front', draw(c, o, k) {
  const g = c.g, lx = c.look * 0.6;
  g.fillStyle = k(o.col || '#5a3418', c);
  g.beginPath(); g.moveTo(lx, -9.8); g.quadraticCurveTo(lx - 3, -11.4, lx - 6, -9); g.quadraticCurveTo(lx - 3, -9.6, lx, -8.4); g.quadraticCurveTo(lx + 3, -9.6, lx + 6, -9); g.quadraticCurveTo(lx + 3, -11.4, lx, -9.8); g.fill();
} });
defineOutfitPart('eyepatch', { layer: 'front', draw(c, o, k) {
  // a pirate's patch over the eye on the side away from the way they look
  const g = c.g, ex = (c.face >= 0 ? -5 : 5) + c.look;
  g.strokeStyle = OF_INK; g.lineWidth = 1; g.beginPath(); g.moveTo(-11, -22); g.lineTo(11, -13.4); g.stroke();
  g.fillStyle = k(o.col || OF_INK, c); g.beginPath(); g.ellipse(ex, -15.8, 3.6, 4, 0, 0, Math.PI * 2); g.fill();
} });
defineOutfitPart('clownnose', { layer: 'front', draw(c, o, k) {
  const g = c.g; ofCircle(g, c.look * 0.8, -11.4, 2.2); ofFillStroke(g, k(o.col || '#e8202a', c), OF_INK, 0.8);
  g.fillStyle = 'rgba(255,255,255,0.6)'; ofCircle(g, c.look * 0.8 - 0.7, -12.1, 0.6); g.fill();
} });
defineOutfitPart('shades', { layer: 'front', draw(c, o, k) {
  // sunglasses over the eyes (cool, not hiding who's who)
  const g = c.g, lx = c.look, col = k(o.col || '#1c1a36', c);
  g.fillStyle = col; for (const ex of [-5, 5]) { ofRR(g, ex + lx - 3.6, -18.6, 7.2, 5, 1.8); g.fill(); }
  g.fillRect(lx - 1.6, -17.6, 3.2, 1);
  if (o.frame) { g.strokeStyle = k(o.frame, c); g.lineWidth = 0.9; for (const ex of [-5, 5]) { ofRR(g, ex + lx - 3.6, -18.6, 7.2, 5, 1.8); g.stroke(); } }
  g.fillStyle = 'rgba(255,255,255,0.45)'; for (const ex of [-5, 5]) g.fillRect(ex + lx - 2.4, -17.6, 2, 1);
} });

/* ---------- parts: back ---------- */
defineOutfitPart('cape', { layer: 'back', draw(c, o, k) {
  // a cape from the shoulders that streams behind when they run
  const g = c.g, col = k(o.col || '#e8483a', c), ink = o.ink || OF_INK, b = c.face >= 0 ? -1 : 1;
  const run = Math.min(1, Math.abs(c.vx) / 220), w = Math.sin(c.t * 10) * (1 + run * 2), len = o.len || 1;
  g.beginPath(); g.moveTo(-b * 6, -16);
  g.quadraticCurveTo(b * (12 + run * 10) * len, -12 + w, b * (14 + run * 16) * len, 1 - run * 8 + w);
  g.lineTo(b * (4 + run * 8) * len, 1 - run * 4 - w); g.lineTo(-b * 8, 0); g.closePath(); ofFillStroke(g, col, ink, 1.2);
  if (o.lining) { g.fillStyle = k(o.lining, c); g.beginPath(); g.moveTo(b * (14 + run * 16) * len, 1 - run * 8 + w); g.lineTo(b * (4 + run * 8) * len, 1 - run * 4 - w); g.lineTo(b * (8 + run * 10) * len, -3 - run * 5); g.closePath(); g.fill(); }
  // standing still, the cape hangs down both sides
  if (run < 0.6) { g.globalAlpha *= 1 - run / 0.6; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 9, -16); g.quadraticCurveTo(s * 13.4, -8, s * 13, 0.4); g.lineTo(s * 9, 0.4); g.closePath(); ofFillStroke(g, col, ink, 1.1); } }
}, also: { body(c, o, k) {
  // the cords from the shoulders to a clasp under the chin
  const g = c.g; g.strokeStyle = k(o.col || '#e8483a', c); g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(-10.4, -12); g.quadraticCurveTo(-5, -7.4, 0, -7.6); g.quadraticCurveTo(5, -7.4, 10.4, -12); g.stroke();
  ofCircle(g, 0, -7.4, 1.5); ofFillStroke(g, k(o.clasp || '#ffd23f', c), OF_INK, 0.7);
} } });
defineOutfitPart('backpack', { layer: 'back', draw(c, o, k) {
  const g = c.g, col = k(o.col || '#3fbf6a', c), ink = o.ink || OF_INK, b = c.face >= 0 ? -1 : 1;
  ofRR(g, b * 8 - 5, -18, 10, 14, 3); ofFillStroke(g, col, ink, 1.2);
  g.fillStyle = 'rgba(0,0,0,0.2)'; ofRR(g, b * 8 - 3.4 + b * 1.6, -11, 6.8, 5, 1.6); g.fill();
  if (o.roll) { g.fillStyle = k(o.roll, c); ofRR(g, b * 8 - 6, -21, 12, 4, 2); g.fill(); g.strokeStyle = ink; g.lineWidth = 1; g.stroke(); }
} });
defineOutfitPart('tank', { layer: 'back', draw(c, o, k) {
  // an air tank (diving) or jetpack (`jet`: twin tanks with little flames)
  const g = c.g, col = k(o.col || '#ffc53d', c), ink = o.ink || OF_INK, b = c.face >= 0 ? -1 : 1;
  const xs = o.jet ? [b * 8 - 3.2, b * 8 + 3.2] : [b * 9];
  for (const x of xs) { ofRR(g, x - 3.2, -22, 6.4, 17, 3); ofFillStroke(g, col, ink, 1.2); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x - 2, -20, 1.4, 12); }
  if (o.jet && o.flame !== false) { const f = 3 + Math.sin(c.t * 30) * 1.4; g.fillStyle = '#ffb02e'; for (const x of xs) { ofPoly(g, [x - 2.2, -5, x, -5 + f + 2, x + 2.2, -5]); g.fill(); } }
  if (!o.jet) { g.strokeStyle = ink; g.lineWidth = 1.2; g.beginPath(); g.moveTo(xs[0], -22); g.quadraticCurveTo(xs[0] - b * 2, -26, -b * 2, -12); g.stroke(); }
} });
defineOutfitPart('wings', { layer: 'back', draw(c, o, k) {
  // little wings (fairy, bat, angel, bird); `bat` for spiky ones
  const g = c.g, col = k(o.col || 'rgba(255,255,255,0.85)', c), ink = o.ink || OF_INK, flap = Math.sin(c.t * (o.fast ? 22 : 7)) * 0.25;
  for (const s of [-1, 1]) {
    g.save(); g.translate(s * 8, -15); g.rotate(s * flap);
    if (o.bat) { ofPoly(g, [0, 0, s * 12, -7, s * 11, -2, s * 14, 1, s * 9, 2, s * 9, 6, 0, 3]); }
    else { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 10, -12, s * 14, -4); g.quadraticCurveTo(s * 10, 3, 0, 4); g.closePath(); }
    ofFillStroke(g, col, ink, 1); g.restore();
  }
} });
defineOutfitPart('tail', { layer: 'back', draw(c, o, k) {
  // a costume tail (dino with `spikes`, cat, devil with `arrow`)
  const g = c.g, col = k(o.col || 'own', c), ink = o.ink || OF_INK, b = c.face >= 0 ? -1 : 1, w = Math.sin(c.t * 6) * 1.5;
  g.beginPath(); g.moveTo(b * 8, -8); g.quadraticCurveTo(b * 16, -6 + w, b * 18, -2 + w); g.quadraticCurveTo(b * 13, -1, b * 8, -2); g.closePath(); ofFillStroke(g, col, ink, 1.2);
  if (o.spikes) { g.fillStyle = k(o.spikes, c); for (const x of [11, 14]) { ofPoly(g, [b * (x - 1.4), -6.6 + (x - 11) * 0.4 + w * 0.4, b * x, -9.6 + (x - 11) * 0.5 + w * 0.5, b * (x + 1.4), -5.8 + (x - 11) * 0.5 + w * 0.5]); g.fill(); } }
} });
defineOutfitPart('quiver', { layer: 'back', draw(c, o, k) {
  // a sword on the back (ninja `sword`) or quiver of arrows
  const g = c.g, ink = o.ink || OF_INK, b = c.face >= 0 ? -1 : 1;
  g.save(); g.translate(b * 7, -13); g.rotate(b * -0.6);
  if (o.sword) { g.fillStyle = k(o.col || '#2b2840', c); ofRR(g, -1.6, -2, 3.2, 16, 1); g.fill(); g.fillStyle = '#ffd23f'; g.fillRect(-3, -3, 6, 1.6); g.fillStyle = k(o.grip || '#e8483a', c); ofRR(g, -1.2, -9, 2.4, 6.4, 1); g.fill(); }
  else { g.fillStyle = k(o.col || '#8a5a32', c); ofRR(g, -3, -3, 6, 15, 2); g.fill(); g.strokeStyle = ink; g.lineWidth = 1; g.stroke(); g.fillStyle = '#fff'; for (const x of [-1.6, 1.6]) ofPoly(g, [x - 1.2, -3, x, -7, x + 1.2, -3]), g.fill(); }
  g.restore();
} });
