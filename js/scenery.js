/* Pip & Bo - Scenery: the third polish pass (Nov 2026). Extra environment detail on the shared backdrop (far
   mountains, trees, cottages, a little town, fairground tents, mist at the foot of the hills, a soft sun bloom), small
   drifting motes that suit each world (pollen, snow, embers, fireflies, petals ...), birds, and a soft light finish
   over the whole scene. Drawing only: placement comes from hash() and G.clock, never Math.random(). World 32 (comic
   book) and World 40 (hand-drawn) keep their own looks: artPlain() turns all of this off there. */
'use strict';

/* ---------- which scenery a backdrop gets ---------- */
// by the world whose colours are showing (THEME_W, set by applyTheme); a level or room can pick with
// theme: { scenery: 'pines' } (or 'none'). 'plain' = only the sky and mist touches, no props.
const SCENE_KITS = { 0: 'meadow', 1: 'town', 2: 'links', 3: 'fair' };
function sceneKit() { return C.scenery || SCENE_KITS[THEME_W] || 'plain'; }
function rgbaOf(str, a) {
  const m = /rgba?\(([^)]+)\)/.exec(str || '');
  const p = m ? m[1].split(',').map(Number) : hexRgb(str) || [255, 255, 255];
  return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + a + ')';
}
function colLum(c) { const p = hexRgb(c); return p ? (p[0] * 0.299 + p[1] * 0.587 + p[2] * 0.114) / 255 : 0.6; }

/* ---------- the sky (painted once into the cached sky picture) ---------- */
function paintSkyExtras(c, sunOn) {
  // thin high streaks of cloud
  for (let i = 0; i < 6; i++) {
    const h = hash(i, 41), x = 60 + (h % 840), y = 26 + ((h >>> 8) % 150), w = 70 + ((h >>> 4) % 90);
    c.fillStyle = 'rgba(255,255,255,' + (0.1 + ((h >>> 12) % 5) * 0.02) + ')';
    c.beginPath(); c.ellipse(x, y, w, 2.6 + ((h >>> 16) % 3), 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(x + w * 0.35, y + 5, w * 0.6, 2, 0, 0, Math.PI * 2); c.fill();
  }
  // a soft bloom round the sun
  if (sunOn) {
    const g = c.createRadialGradient(810, 105, 50, 810, 105, 230);
    g.addColorStop(0, rgbaOf(C.sunGlow, 0.3)); g.addColorStop(0.45, rgbaOf(C.sunGlow, 0.1)); g.addColorStop(1, rgbaOf(C.sunGlow, 0));
    c.fillStyle = g; c.fillRect(560, 0, 400, 340);
  }
  // light gathering at the horizon
  const hz = c.createLinearGradient(0, 190, 0, 340);
  hz.addColorStop(0, rgbaOf(tintHex(C.skyBot, 0.5), 0)); hz.addColorStop(1, rgbaOf(tintHex(C.skyBot, 0.5), 0.4));
  c.fillStyle = hz; c.fillRect(0, 190, W, 150);
}
// tint() gives 'rgb(...)': this one gives numbers rgbaOf can read
function tintHex(c, t) { const p = hexRgb(c) || [255, 255, 255]; return 'rgb(' + p.map(v => Math.round(v + (255 - v) * t)).join(',') + ')'; }

/* ---------- props (h: a hill strip's canvas; x, y: where the prop stands; s: size) ---------- */
function scTree(h, x, y, s, base) {
  h.fillStyle = 'rgba(20,20,40,0.1)'; h.beginPath(); h.ellipse(x + 2 * s, y + 1, 11 * s, 2.6 * s, 0, 0, Math.PI * 2); h.fill();
  h.fillStyle = shade(base, 0.42); h.fillRect(x - 1.6 * s, y - 12 * s, 3.2 * s, 13 * s);
  h.fillStyle = shade(base, 0.2);
  circleOn(h, x, y - 19 * s, 10 * s); h.fill(); circleOn(h, x - 7 * s, y - 13 * s, 7 * s); h.fill(); circleOn(h, x + 7.5 * s, y - 13 * s, 7.5 * s); h.fill();
  h.fillStyle = shade(base, 0.1);
  circleOn(h, x - 2 * s, y - 21 * s, 7.5 * s); h.fill(); circleOn(h, x - 7.5 * s, y - 15 * s, 5 * s); h.fill();
  h.fillStyle = tint(base, 0.16); circleOn(h, x - 4 * s, y - 24 * s, 3.4 * s); h.fill();
}
function scPine(h, x, y, s, base) {
  h.fillStyle = 'rgba(20,20,40,0.1)'; h.beginPath(); h.ellipse(x + 2 * s, y + 1, 8 * s, 2.2 * s, 0, 0, Math.PI * 2); h.fill();
  h.fillStyle = shade(base, 0.42); h.fillRect(x - 1.4 * s, y - 6 * s, 2.8 * s, 7 * s);
  for (let i = 0; i < 3; i++) {
    const w = (9 - i * 2.2) * s, ty = y - (5 + i * 8) * s, th = 12 * s;
    h.fillStyle = shade(base, 0.24); h.beginPath(); h.moveTo(x - w, ty); h.lineTo(x, ty - th); h.lineTo(x + w, ty); h.closePath(); h.fill();
    h.fillStyle = shade(base, 0.12); h.beginPath(); h.moveTo(x - w, ty); h.lineTo(x, ty - th); h.lineTo(x - w * 0.15, ty); h.closePath(); h.fill();
  }
}
function scHouse(h, x, y, s, base, hh, lit) {
  const wall = mixCol('#fff3dc', base, 0.42), roof = mixCol(['#d9705a', '#c98b5a', '#7d8fc4'][hh % 3], base, 0.4), w = (15 + (hh >>> 3) % 8) * s, ht = (11 + (hh >>> 6) % 5) * s;
  h.fillStyle = 'rgba(20,20,40,0.1)'; h.beginPath(); h.ellipse(x, y + 1, w * 0.75, 2.4 * s, 0, 0, Math.PI * 2); h.fill();
  h.fillStyle = wall; h.fillRect(x - w / 2, y - ht, w, ht + 1);
  h.fillStyle = 'rgba(20,20,40,0.1)'; h.fillRect(x + w * 0.18, y - ht, w * 0.32, ht + 1);
  h.fillStyle = shade(roof, 0.25); h.fillRect(x + w * 0.2, y - ht - 9 * s, 3 * s, 7 * s);   // chimney
  h.fillStyle = roof; h.beginPath(); h.moveTo(x - w / 2 - 2.5 * s, y - ht); h.lineTo(x, y - ht - 9 * s); h.lineTo(x + w / 2 + 2.5 * s, y - ht); h.closePath(); h.fill();
  h.fillStyle = shade(roof, 0.16); h.beginPath(); h.moveTo(x, y - ht - 9 * s); h.lineTo(x + w / 2 + 2.5 * s, y - ht); h.lineTo(x + w * 0.1, y - ht); h.closePath(); h.fill();
  h.fillStyle = shade(roof, 0.3); h.fillRect(x - 2 * s, y - 6.5 * s, 4 * s, 7 * s);          // door
  h.fillStyle = lit ? '#ffe9a8' : mixCol('#bfe3f0', base, 0.3);
  h.fillRect(x - w / 2 + 2.5 * s, y - ht + 3 * s, 3.4 * s, 3.4 * s); if (w > 18 * s) h.fillRect(x + w / 2 - 6 * s, y - ht + 3 * s, 3.4 * s, 3.4 * s);
}
function scWindmill(h, x, y, s, base) {
  const wall = mixCol('#fff3dc', base, 0.4);
  h.fillStyle = 'rgba(20,20,40,0.1)'; h.beginPath(); h.ellipse(x, y + 1, 10 * s, 2.4 * s, 0, 0, Math.PI * 2); h.fill();
  h.fillStyle = wall; h.beginPath(); h.moveTo(x - 7 * s, y + 1); h.lineTo(x - 4.5 * s, y - 24 * s); h.lineTo(x + 4.5 * s, y - 24 * s); h.lineTo(x + 7 * s, y + 1); h.closePath(); h.fill();
  h.fillStyle = 'rgba(20,20,40,0.1)'; h.beginPath(); h.moveTo(x + 1.5 * s, y + 1); h.lineTo(x + 1 * s, y - 24 * s); h.lineTo(x + 4.5 * s, y - 24 * s); h.lineTo(x + 7 * s, y + 1); h.closePath(); h.fill();
  h.fillStyle = mixCol('#d9705a', base, 0.4); h.beginPath(); h.moveTo(x - 6 * s, y - 24 * s); h.lineTo(x, y - 31 * s); h.lineTo(x + 6 * s, y - 24 * s); h.closePath(); h.fill();
  h.strokeStyle = shade(base, 0.45); h.lineWidth = 1.6 * s; h.lineCap = 'round';
  for (let i = 0; i < 4; i++) { const a = 0.5 + i * Math.PI / 2; h.beginPath(); h.moveTo(x, y - 24 * s); h.lineTo(x + Math.cos(a) * 16 * s, y - 24 * s + Math.sin(a) * 16 * s); h.stroke(); }
  h.fillStyle = tint(base, 0.5);
  for (let i = 0; i < 4; i++) { const a = 0.5 + i * Math.PI / 2; h.save(); h.translate(x, y - 24 * s); h.rotate(a); h.fillRect(5 * s, 0.6 * s, 11 * s, 3.4 * s); h.restore(); }
  h.fillStyle = shade(base, 0.45); circleOn(h, x, y - 24 * s, 1.8 * s); h.fill();
}
function scFence(h, k, x0, n, base) {
  h.strokeStyle = mixCol('#fff3dc', base, 0.45); h.lineWidth = 1.6; h.lineCap = 'round';
  for (let d = 2.5; d <= 6.5; d += 4) { h.beginPath(); for (let i = 0; i <= n; i++) { const X = x0 + i * 9, y = hillY(k, X) - d + 2; i ? h.lineTo(X, y) : h.moveTo(X, y); } h.stroke(); }
  h.lineWidth = 2; for (let i = 0; i <= n; i++) { const X = x0 + i * 9, y = hillY(k, X) + 2; h.beginPath(); h.moveTo(X, y + 1); h.lineTo(X, y - 8.5); h.stroke(); }
}
function scTower(h, x, y, s, base, hh, lit) {
  // a little block tower for the far town: stacked boxes with windows and a flag or a roof
  const cols = ['#ff8f7a', '#ffc978', '#8fc5ff', '#a5e0b0', '#f2a6d4'];
  let yy = y + 1; const n = 2 + (hh % 3);
  h.fillStyle = 'rgba(20,20,40,0.1)'; h.beginPath(); h.ellipse(x, y + 1, 11 * s, 2.4 * s, 0, 0, Math.PI * 2); h.fill();
  for (let i = 0; i < n; i++) {
    const w = (15 - i * 2.5) * s, bh = (9 + ((hh >>> (i * 3 + 2)) % 4)) * s, col = mixCol(cols[(hh >>> (i * 2 + 5)) % cols.length], base, 0.46);
    h.fillStyle = col; h.fillRect(x - w / 2, yy - bh, w, bh);
    h.fillStyle = 'rgba(20,20,40,0.1)'; h.fillRect(x + w * 0.15, yy - bh, w * 0.35, bh);
    h.fillStyle = 'rgba(255,255,255,0.22)'; h.fillRect(x - w / 2, yy - bh, w, 1.2 * s);
    h.fillStyle = lit ? '#ffe9a8' : mixCol('#eaf6ff', base, 0.3);
    for (let j = 0; j < 2; j++) if ((hh >>> (i * 2 + j)) & 1 || j === 0) h.fillRect(x - w / 2 + (2.2 + j * 5.2) * s, yy - bh + 2.6 * s, 2.6 * s, 3 * s);
    yy -= bh;
  }
  if (hh & 8) { h.fillStyle = mixCol('#d9705a', base, 0.4); h.beginPath(); h.moveTo(x - 6 * s, yy); h.lineTo(x, yy - 8 * s); h.lineTo(x + 6 * s, yy); h.closePath(); h.fill(); }
  else { h.strokeStyle = shade(base, 0.45); h.lineWidth = 1.2 * s; h.beginPath(); h.moveTo(x, yy); h.lineTo(x, yy - 10 * s); h.stroke(); h.fillStyle = mixCol('#ffc53d', base, 0.3); h.beginPath(); h.moveTo(x, yy - 10 * s); h.lineTo(x + 6 * s, yy - 8 * s); h.lineTo(x, yy - 6 * s); h.closePath(); h.fill(); }
}
function scCrane(h, x, y, s, base) {
  h.strokeStyle = mixCol('#ffc53d', base, 0.5); h.lineWidth = 1.8 * s; h.lineCap = 'round'; h.lineJoin = 'round';
  h.beginPath(); h.moveTo(x, y + 1); h.lineTo(x, y - 40 * s); h.moveTo(x - 9 * s, y - 36 * s); h.lineTo(x + 26 * s, y - 36 * s); h.moveTo(x, y - 44 * s); h.lineTo(x + 26 * s, y - 36 * s); h.moveTo(x, y - 44 * s); h.lineTo(x - 9 * s, y - 36 * s); h.moveTo(x, y - 40 * s); h.lineTo(x, y - 44 * s); h.stroke();
  h.lineWidth = 0.9 * s; h.strokeStyle = shade(base, 0.4); h.beginPath(); h.moveTo(x + 20 * s, y - 36 * s); h.lineTo(x + 20 * s, y - 22 * s); h.stroke();
  h.fillStyle = mixCol('#ff8f7a', base, 0.45); h.fillRect(x + 16.5 * s, y - 22 * s, 7 * s, 6 * s);
  h.fillStyle = shade(base, 0.35); h.fillRect(x - 9 * s, y - 38 * s, 4 * s, 5 * s);
}
function scLamp(h, x, y, s, base, lit) {
  h.strokeStyle = shade(base, 0.45); h.lineWidth = 1.4 * s; h.beginPath(); h.moveTo(x, y + 1); h.lineTo(x, y - 15 * s); h.stroke();
  if (lit) { h.fillStyle = 'rgba(255,233,168,0.22)'; circleOn(h, x, y - 16.5 * s, 6 * s); h.fill(); }
  h.fillStyle = lit ? '#ffe9a8' : tint(base, 0.5); circleOn(h, x, y - 16.5 * s, 2.4 * s); h.fill();
}
function scGolfFlag(h, x, y, s, base, hh) {
  h.fillStyle = shade(base, 0.2); h.beginPath(); h.ellipse(x, y + 1.5, 5 * s, 1.5 * s, 0, 0, Math.PI * 2); h.fill();
  h.strokeStyle = mixCol('#ffffff', base, 0.3); h.lineWidth = 1.3 * s; h.beginPath(); h.moveTo(x, y + 1); h.lineTo(x, y - 20 * s); h.stroke();
  h.fillStyle = mixCol(['#ff6b4a', '#ffc53d', '#5b95ff'][hh % 3], base, 0.3); h.beginPath(); h.moveTo(x, y - 20 * s); h.lineTo(x + 9 * s, y - 17 * s); h.lineTo(x, y - 14 * s); h.closePath(); h.fill();
}
function scBunker(h, x, y, s, base) {
  h.fillStyle = shade(base, 0.14); h.beginPath(); h.ellipse(x, y, 19 * s, 5.5 * s, 0, 0, Math.PI * 2); h.fill();
  h.fillStyle = mixCol('#f6e3b0', base, 0.3); h.beginPath(); h.ellipse(x, y + 1.2 * s, 17.5 * s, 4.4 * s, 0, 0, Math.PI * 2); h.fill();
  // (rich props pass) the far lip in shade, rake lines following the bowl, a lit near edge and a rake left in the sand
  h.fillStyle = mixCol('#c9ad78', base, 0.35); h.beginPath(); h.ellipse(x, y - 0.6 * s, 16.5 * s, 2.6 * s, 0, Math.PI, 0); h.fill();
  h.strokeStyle = mixCol('#d8bd86', base, 0.3); h.lineWidth = 0.7 * s;
  for (let k = 0; k < 3; k++) { h.beginPath(); h.ellipse(x + 1 * s, y + 1.6 * s, (6 + k * 3.4) * s, (1.2 + k * 0.7) * s, 0, 0.15, Math.PI - 0.15); h.stroke(); }
  h.fillStyle = 'rgba(255,255,255,0.25)'; h.beginPath(); h.ellipse(x - 4 * s, y + 2 * s, 8 * s, 1.5 * s, 0, 0, Math.PI * 2); h.fill();
  h.strokeStyle = mixCol('#8a6a48', base, 0.35); h.lineWidth = 0.9 * s; h.lineCap = 'round';
  h.beginPath(); h.moveTo(x + 9 * s, y + 2.4 * s); h.lineTo(x + 17 * s, y - 4.5 * s); h.stroke();
  h.beginPath(); h.moveTo(x + 6.6 * s, y + 1.6 * s); h.lineTo(x + 11.4 * s, y + 3.2 * s); h.stroke();
}
function scPond(h, x, y, s, base) {
  h.fillStyle = shade(base, 0.14); h.beginPath(); h.ellipse(x, y, 24 * s, 6 * s, 0, 0, Math.PI * 2); h.fill();
  h.fillStyle = mixCol('#8fd3f0', base, 0.3); h.beginPath(); h.ellipse(x, y + 1 * s, 22.5 * s, 4.8 * s, 0, 0, Math.PI * 2); h.fill();
  // (rich props pass) the far bank's reflection, glints, two lily pads, a few rim stones and a clump of reeds
  h.fillStyle = mixCol('#5fa8c8', base, 0.35); h.beginPath(); h.ellipse(x, y - 1 * s, 20 * s, 2.2 * s, 0, Math.PI, 0); h.fill();
  h.fillStyle = 'rgba(255,255,255,0.35)'; h.beginPath(); h.ellipse(x - 6 * s, y, 7 * s, 1 * s, 0, 0, Math.PI * 2); h.fill(); h.beginPath(); h.ellipse(x + 8 * s, y + 2.4 * s, 5 * s, 0.8 * s, 0, 0, Math.PI * 2); h.fill();
  for (const [dx, dy, r] of [[-10, 2, 2.6], [5, 0.6, 2]]) {
    h.fillStyle = mixCol('#4f9e5c', base, 0.3); h.beginPath(); h.ellipse(x + dx * s, y + dy * s, r * s, r * 0.45 * s, 0, 0.5, Math.PI * 2 + 0.1); h.lineTo(x + dx * s, y + dy * s); h.fill();
  }
  h.fillStyle = mixCol('#ff9fc0', base, 0.3); circleOn(h, x - 10.6 * s, y + 1.4 * s, 0.9 * s); h.fill();
  h.fillStyle = mixCol('#8a8f9e', base, 0.4);
  for (const [dx, dy, r] of [[-23, 1.4, 1.6], [-20, 4.2, 1.2], [22, 2.6, 1.5]]) { h.beginPath(); h.ellipse(x + dx * s, y + dy * s, r * 1.3 * s, r * s, 0, 0, Math.PI * 2); h.fill(); }
  h.strokeStyle = mixCol('#4c8a4a', base, 0.3); h.lineWidth = 0.9 * s; h.lineCap = 'round';
  for (let k = 0; k < 4; k++) { const rx = x + (16 + k * 1.6) * s; h.beginPath(); h.moveTo(rx, y + 1.5 * s); h.quadraticCurveTo(rx + (k - 1.5) * 0.8 * s, y - 4 * s, rx + (k - 1.5) * 1.6 * s, y - (8 + (k % 2) * 3) * s); h.stroke(); }
  h.fillStyle = mixCol('#7a5236', base, 0.3); h.beginPath(); h.ellipse(x + 17.8 * s, y - 7.6 * s, 0.9 * s, 2.2 * s, 0, 0, Math.PI * 2); h.fill();
}
function scTent(h, x, y, s, base, hh) {
  const a = mixCol(['#ff8f7a', '#8fc5ff', '#ffc978', '#f2a6d4'][hh % 4], base, 0.4), b = mixCol('#fff3dc', base, 0.38), w = 15 * s, ht = 9 * s;
  h.fillStyle = 'rgba(20,20,40,0.1)'; h.beginPath(); h.ellipse(x, y + 1, w * 1.1, 2.6 * s, 0, 0, Math.PI * 2); h.fill();
  for (let i = 0; i < 5; i++) { h.fillStyle = i % 2 ? b : a; h.fillRect(x - w + i * w * 0.4, y - ht, w * 0.4 + 0.3, ht + 1); }
  for (let i = 0; i < 5; i++) {
    h.fillStyle = i % 2 ? b : a; const x0 = x - w - 2 * s + i * (w * 2 + 4 * s) / 5, x1 = x0 + (w * 2 + 4 * s) / 5;
    h.beginPath(); h.moveTo(x0, y - ht); h.lineTo(x, y - ht - 13 * s); h.lineTo(x1 + 0.3, y - ht); h.closePath(); h.fill();
  }
  h.fillStyle = 'rgba(20,20,40,0.1)'; h.beginPath(); h.moveTo(x, y - ht - 13 * s); h.lineTo(x + w + 2 * s, y - ht); h.lineTo(x + w, y + 1); h.lineTo(x + w * 0.2, y + 1); h.closePath(); h.fill();
  h.fillStyle = shade(base, 0.45); h.fillRect(x - 2.4 * s, y - 6.5 * s, 4.8 * s, 7.5 * s);
  h.strokeStyle = shade(base, 0.45); h.lineWidth = 1.1 * s; h.beginPath(); h.moveTo(x, y - ht - 13 * s); h.lineTo(x, y - ht - 20 * s); h.stroke();
  h.fillStyle = mixCol('#ffc53d', base, 0.25); h.beginPath(); h.moveTo(x, y - ht - 20 * s); h.lineTo(x + 6 * s, y - ht - 18 * s); h.lineTo(x, y - ht - 16 * s); h.closePath(); h.fill();
}
function scFerris(h, x, y, s, base) {
  const r = 26 * s, cy = y - r - 7 * s, cols = ['#ff8f7a', '#8fc5ff', '#ffc978', '#a5e0b0', '#f2a6d4'];
  h.fillStyle = 'rgba(20,20,40,0.1)'; h.beginPath(); h.ellipse(x, y + 1, 20 * s, 3 * s, 0, 0, Math.PI * 2); h.fill();
  h.strokeStyle = shade(base, 0.38); h.lineWidth = 2 * s; h.lineCap = 'round';
  h.beginPath(); h.moveTo(x - 13 * s, y + 1); h.lineTo(x, cy); h.lineTo(x + 13 * s, y + 1); h.stroke();
  h.lineWidth = 1 * s; h.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + 0.2; h.moveTo(x, cy); h.lineTo(x + Math.cos(a) * r, cy + Math.sin(a) * r); } h.stroke();
  h.strokeStyle = mixCol('#fff3dc', base, 0.35); h.lineWidth = 1.8 * s; circleOn(h, x, cy, r); h.stroke();
  h.lineWidth = 1 * s; circleOn(h, x, cy, r * 0.62); h.stroke();
  for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + 0.2, gx = x + Math.cos(a) * r, gy = cy + Math.sin(a) * r; h.fillStyle = mixCol(cols[i % 5], base, 0.35); rrOn(h, gx - 3 * s, gy, 6 * s, 5 * s, 1.5 * s); h.fill(); }
  h.fillStyle = mixCol('#ffc53d', base, 0.3); circleOn(h, x, cy, 3 * s); h.fill();
}
function scBunting(h, k, x0, len, base) {
  // two poles with a string of little flags sagging between them
  const cols = ['#ff8f7a', '#ffc978', '#8fc5ff', '#a5e0b0', '#f2a6d4'], y0 = hillY(k, x0), y1 = hillY(k, x0 + len);
  h.strokeStyle = shade(base, 0.42); h.lineWidth = 1.8; h.lineCap = 'round';
  h.beginPath(); h.moveTo(x0, y0 + 2); h.lineTo(x0, y0 - 24); h.moveTo(x0 + len, y1 + 2); h.lineTo(x0 + len, y1 - 24); h.stroke();
  const at = t => [x0 + len * t, (y0 - 23) + (y1 - y0) * t + Math.sin(t * Math.PI) * 9];
  h.lineWidth = 0.9; h.beginPath(); for (let i = 0; i <= 12; i++) { const p = at(i / 12); i ? h.lineTo(p[0], p[1]) : h.moveTo(p[0], p[1]); } h.stroke();
  for (let i = 0; i < 9; i++) { const p = at((i + 0.7) / 10.4); h.fillStyle = mixCol(cols[i % 5], base, 0.3); h.beginPath(); h.moveTo(p[0] - 3, p[1]); h.lineTo(p[0] + 3, p[1]); h.lineTo(p[0], p[1] + 6); h.closePath(); h.fill(); }
}
function scHay(h, x, y, s, base) {
  const c = mixCol('#f2d27a', base, 0.4);
  h.fillStyle = 'rgba(20,20,40,0.1)'; h.beginPath(); h.ellipse(x, y + 1, 8 * s, 2 * s, 0, 0, Math.PI * 2); h.fill();
  h.fillStyle = c; rrOn(h, x - 6.5 * s, y - 9 * s, 13 * s, 10 * s, 3 * s); h.fill();
  h.fillStyle = 'rgba(20,20,40,0.1)'; rrOn(h, x + 1 * s, y - 9 * s, 5.5 * s, 10 * s, 3 * s); h.fill();
  h.strokeStyle = shade(c, 0.25); h.lineWidth = 0.9; h.beginPath(); h.moveTo(x - 6.5 * s, y - 5.5 * s); h.lineTo(x + 6.5 * s, y - 5.5 * s); h.moveTo(x - 6.5 * s, y - 2.5 * s); h.lineTo(x + 6.5 * s, y - 2.5 * s); h.stroke();
}

/* ---------- a hill strip's extras (k: 0 far ridge, 1 far hills, 2 near hills; sw: the strip's width) ---------- */
// before the ridge is filled: mountains standing behind it
function paintFarPeaks(h, sw, kit) {
  if (kit === 'none' || kit === 'plain') return;
  const far = mixCol(C.hillFar, C.skyBot, 0.72), snow = mixCol('#ffffff', C.skyBot, 0.25);
  for (let i = 0; i * 150 < sw + 150; i++) {
    const hh = hash(i, 73), x = i * 150 + (hh % 70), pw = 70 + ((hh >>> 6) % 60), ph = 40 + ((hh >>> 12) % 44), by = 318, ty = by - ph - 24;
    h.fillStyle = far; h.beginPath(); h.moveTo(x - pw, by); h.lineTo(x - pw * 0.12, ty + 6); h.quadraticCurveTo(x, ty - 3, x + pw * 0.14, ty + 7); h.lineTo(x + pw, by); h.closePath(); h.fill();
    h.fillStyle = 'rgba(20,20,40,0.06)'; h.beginPath(); h.moveTo(x, ty); h.lineTo(x + pw * 0.14, ty + 7); h.lineTo(x + pw, by); h.lineTo(x + pw * 0.2, by); h.closePath(); h.fill();
    if (ph > 56) { // a snow cap with a jagged lower edge
      const d = 15;
      h.fillStyle = snow; h.beginPath(); h.moveTo(x - pw * 0.12, ty + 6); h.quadraticCurveTo(x, ty - 3, x + pw * 0.14, ty + 7);
      h.lineTo(x + pw * 0.14 + (pw * 0.86) * d / (by - ty - 7), ty + 7 + d); h.lineTo(x + pw * 0.14, ty + d - 2); h.lineTo(x + 2, ty + d + 5); h.lineTo(x - pw * 0.12, ty + d - 3);
      h.lineTo(x - pw * 0.12 - (pw * 0.88) * d / (by - ty - 6), ty + 6 + d); h.closePath(); h.fill();
    }
  }
}
function paintStripExtras(h, k, sw, kit) {
  if (kit === 'none') return;
  const lit = colLum(C.skyTop) < 0.66;   // a dusky sky: windows and lamps are lit
  if (k === 0) {
    // a line of far-off woods along the ridge
    if (kit !== 'plain') {
      h.fillStyle = shade(mixCol(C.hillFar, C.skyBot, 0.45), 0.07);
      for (let i = 0; i * 13 < sw + 20; i++) { const hh = hash(i, 19); if (hh % 5 < 2) continue; const x = i * 13 + (hh >>> 4) % 6, r = 4 + (hh >>> 8) % 4; circleOn(h, x, hillY(0, x) + r * 0.35, r); h.fill(); }
    }
  } else if (k === 1 && kit !== 'plain') {
    const base = C.hillFar;
    for (let i = 0; i * 62 < sw + 70; i++) {
      const hh = hash(i, 131), x = i * 62 + 12 + (hh % 34), y = hillY(1, x) + 3, s = 0.62 + ((hh >>> 5) % 4) * 0.07, pick = (hh >>> 9) % 10;
      if (kit === 'meadow') { if (pick < 4) scTree(h, x, y, s, base); else if (pick < 6) scPine(h, x, y, s * 1.1, base); else if (pick === 6) scHouse(h, x, y, s * 0.95, base, hh >>> 12, lit); else if (pick === 7 && i % 3 === 0) scWindmill(h, x, y, s * 0.9, base); }
      else if (kit === 'town') { if (pick < 5) scTower(h, x, y, s * 0.95, base, hh >>> 12, lit); else if (pick < 7) scHouse(h, x, y, s * 0.95, base, hh >>> 12, lit); else if (pick === 7) scCrane(h, x, y, s * 0.9, base); else if (pick === 8) scPine(h, x, y, s * 1.1, base); }
      else if (kit === 'links') { if (pick < 4) scTree(h, x, y, s, base); else if (pick === 4) scGolfFlag(h, x, y, s * 0.9, base, hh >>> 12); else if (pick === 5) scPine(h, x, y, s * 1.1, base); else if (pick === 6 && i % 4 === 1) scHouse(h, x, y, s * 1.05, base, hh >>> 12, lit); }
      else if (kit === 'fair') { if (pick < 2) scTent(h, x, y, s * 0.8, base, hh >>> 12); else if (pick < 5) scPine(h, x, y, s * 1.1, base); else if (pick === 5 && i % 5 === 2) scFerris(h, x, y, s * 0.85, base); else if (pick === 6) scTree(h, x, y, s, base); }
      else if (kit === 'pines') { if (pick < 6) scPine(h, x, y, s * (1 + (pick % 3) * 0.15), base); }
    }
  } else if (k === 2) {
    const base = C.hillNear;
    // soft bands of light following the slope, and a sprinkle of grass ticks
    h.lineCap = 'round';
    for (let b = 0; b < 3; b++) {
      h.strokeStyle = tint(base, 0.14 - b * 0.03); h.lineWidth = 5 - b;
      h.beginPath(); for (let X = -2; X <= sw + 12; X += 12) { const y = hillY(2, X) + 22 + b * 26 + Math.sin(X * 0.013 + b * 2) * 5; X === -2 ? h.moveTo(X, y) : h.lineTo(X, y); } h.stroke();
    }
    if (kit !== 'plain') {
      h.strokeStyle = shade(base, 0.13); h.lineWidth = 1.2;
      for (let i = 0; i * 23 < sw + 30; i++) {
        const hh = hash(i, 57), x = i * 23 + (hh % 17), y = hillY(2, x) + 12 + ((hh >>> 5) % 110);
        if (y > H - 4) continue;
        h.beginPath(); h.moveTo(x - 2.5, y); h.lineTo(x - 1.5, y - 4); h.moveTo(x, y); h.lineTo(x, y - 5); h.moveTo(x + 2.5, y); h.lineTo(x + 1.8, y - 3.6); h.stroke();
      }
      for (let i = 0; i * 118 < sw + 120; i++) {
        const hh = hash(i, 211), x = i * 118 + 20 + (hh % 70), y = hillY(2, x) + 4, s = 0.95 + ((hh >>> 5) % 4) * 0.09, pick = (hh >>> 9) % 10;
        if (kit === 'meadow') { if (pick < 3) scTree(h, x, y, s, base); else if (pick < 5) scFence(h, 2, x - 30, 7, base); else if (pick === 5) scHouse(h, x, y, s * 1.05, base, hh >>> 12, lit); else if (pick === 6) { scHay(h, x, y + 4, s, base); scHay(h, x + 17, y + 6, s * 0.85, base); } else if (pick === 7) scPine(h, x, y, s * 1.1, base); }
        else if (kit === 'town') { if (pick < 3) scHouse(h, x, y, s * 1.1, base, hh >>> 12, lit); else if (pick < 5) scLamp(h, x, y, s * 1.15, base, lit); else if (pick < 7) scTree(h, x, y, s * 0.9, base); else if (pick === 7) scTower(h, x, y, s * 1.05, base, hh >>> 12, lit); }
        else if (kit === 'links') { if (pick < 3) scTree(h, x, y, s, base); else if (pick < 5) scBunker(h, x, y + 16, s, base); else if (pick === 5) scGolfFlag(h, x, y + 2, s * 1.1, base, hh >>> 12); else if (pick === 6) scPond(h, x, y + 20, s, base); else if (pick === 7) scPine(h, x, y, s * 1.1, base); }
        else if (kit === 'fair') { if (pick < 2) scTent(h, x, y, s, base, hh >>> 12); else if (pick < 5) scBunting(h, 2, x - 30, 66, base); else if (pick < 7) scTree(h, x, y, s * 0.9, base); else if (pick === 7) scPine(h, x, y, s * 1.1, base); }
        else if (kit === 'pines') { if (pick < 7) scPine(h, x, y, s * (1.1 + (pick % 3) * 0.2), base); }
      }
    }
  }
  // mist gathering at the foot of the two far layers (only on the paint already there)
  if (k < 2) {
    const g = h.createLinearGradient(0, HILLS[k].base - 10, 0, HILLS[k].base + (k ? 150 : 90));
    g.addColorStop(0, rgbaOf(tintHex(C.skyBot, 0.35), 0)); g.addColorStop(1, rgbaOf(tintHex(C.skyBot, 0.35), k ? 0.3 : 0.38));
    h.globalCompositeOperation = 'source-atop'; h.fillStyle = g; h.fillRect(-2, 200, sw + 20, H - 200); h.globalCompositeOperation = 'source-over';
  }
}

/* ---------- birds (live; only where the backdrop has a daytime kit) ---------- */
function drawBirds() {
  const kit = sceneKit();
  if (kit !== 'meadow' && kit !== 'links' && kit !== 'town') return;
  const t = reduceMotion ? 0 : G.clock;
  ctx.strokeStyle = rgbaOf(shade(C.hillNear, 0.45), 0.55); ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const flock = i < 3 ? 0 : 1, sp = flock ? 13 : 9, x = ((flock * 430 + i * 19 + t * sp) % (W + 160)) - 80, y = (flock ? 150 : 96) + (i % 3) * 11 + Math.sin(t * 0.7 + i) * 4;
    const f = Math.sin(t * 5.5 + i * 1.7) * 2.6, s = flock ? 1 : 0.8;
    ctx.moveTo(x - 5.5 * s, y - f * s); ctx.quadraticCurveTo(x - 2.5 * s, y - 2.6 * s, x, y); ctx.quadraticCurveTo(x + 2.5 * s, y - 2.6 * s, x + 5.5 * s, y - f * s);
  }
  ctx.stroke();
}

/* ---------- drifting motes and passing life over the scene ---------- */
// 'motes|life' per world (index = world number - 1), and per level where a level differs (by level code); a room can
// pick its own with theme: { motes: 'snow', life: '' }.
//   motes: pollen, dust, snow, embers, glow (fireflies), wisps (green fireflies), sparkle, petals, leaves, bubbles
//   life:  birds, gulls, bats, flies (butterflies), stars (a shooting star now and then)
const AMBIENCE_WORLD = ['pollen|flies', 'pollen|', 'pollen|flies', 'glow|', '|', 'pollen|flies', 'dust|', 'sparkle|', '|', 'dust|',
  '|', 'snow|', 'wisps|bats', 'pollen|birds', '|stars', 'sparkle|', 'pollen|flies', '|gulls', 'dust|birds', 'embers|',
  '|birds', '|', 'pollen|flies', 'dust|', 'wisps|bats', 'dust|', 'dust|', 'dust|', 'petals|', 'dust|',
  'pollen|flies', '|', 'leaves|', 'snow|', 'sparkle|stars', 'dust|', 'pollen|birds', '|', 'sparkle|', '|'];
const AMBIENCE_LEVEL = {
  '2-3': 'dust|', '4-2': 'snow|', '4-4': '|',
  '5-2': 'pollen|birds', '5-3': 'snow|', '5-4': 'embers|',
  '6-4': 'pollen|birds', '7-1': 'pollen|birds', '7-4': '|',
  '9-1': 'embers|', '9-2': 'dust|birds', '9-3': 'snow|', '9-4': 'embers|',
  '11-4': '|birds', '12-1': '|', '12-4': '|', '13-3': 'dust|', '14-3': 'pollen|flies', '15-2': '|',
  '17-1': 'dust|', '17-3': 'pollen|', '19-3': 'dust|',
  '22-1': 'bubbles|', '22-3': 'bubbles|', '22-4': '|gulls', '23-3': '|',
  '26-2': 'glow|', '26-3': 'pollen|birds', '26-4': 'glow|', '28-4': 'dust|birds', '29-4': 'dust|',
  '31-2': 'dust|', '33-3': '|', '34-1': 'snow|gulls', '34-3': 'dust|', '34-4': 'snow|gulls',
  '36-1': 'dust|birds', '39-1': 'dust|', '39-4': '|',
};
function ambience() {
  const d = G.level && G.level.def; if (!d || artPlain() || G.mode === 'title') return ['', ''];
  const code = typeof levelCode === 'function' ? levelCode(G.levelIndex) : '';
  const a = (AMBIENCE_LEVEL[code] !== undefined ? AMBIENCE_LEVEL[code] : AMBIENCE_WORLD[d.world] || '|').split('|');
  if (C.motes !== undefined) a[0] = C.motes;
  if (C.life !== undefined) a[1] = C.life;
  return a;
}
function drawLife(kind) {
  const t = reduceMotion ? 0 : G.clock;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'birds' || kind === 'gulls' || kind === 'bats') {
    const n = kind === 'bats' ? 4 : 5;
    for (let i = 0; i < n; i++) {
      const flock = i < 3 ? 0 : 1, sp = (flock ? 15 : 10) * (kind === 'bats' ? 2.4 : 1), dir = kind === 'bats' && i % 2 ? -1 : 1;
      let x = ((flock * 470 + i * 21 + t * sp) % (W + 160)) - 80, y = (flock ? 132 : 84) + (i % 3) * 12 + Math.sin(t * 0.7 + i) * 4;
      if (dir < 0) x = W - x;
      if (kind === 'bats') y += Math.sin(t * 3.1 + i * 2) * 12 + i * 14;
      const f = Math.sin(t * (kind === 'bats' ? 13 : kind === 'gulls' ? 3.4 : 5.5) + i * 1.7) * (kind === 'gulls' ? 2 : 2.8), s = (flock ? 1 : 0.8) * (kind === 'gulls' ? 1.25 : 1);
      if (kind === 'bats') {
        ctx.fillStyle = 'rgba(30,22,52,0.6)'; ctx.beginPath();
        ctx.moveTo(x, y - 1.5); ctx.lineTo(x - 3, y - 2 - f * 0.4); ctx.lineTo(x - 7, y - f); ctx.lineTo(x - 4.6, y + 0.6 - f * 0.3); ctx.lineTo(x - 2.4, y + 1.6); ctx.lineTo(x, y + 0.8);
        ctx.lineTo(x + 2.4, y + 1.6); ctx.lineTo(x + 4.6, y + 0.6 - f * 0.3); ctx.lineTo(x + 7, y - f); ctx.lineTo(x + 3, y - 2 - f * 0.4); ctx.closePath(); ctx.fill();
      } else {
        const wing = () => { ctx.beginPath(); ctx.moveTo(x - 5.5 * s, y - f * s); ctx.quadraticCurveTo(x - 2.5 * s, y - 2.6 * s, x, y); ctx.quadraticCurveTo(x + 2.5 * s, y - 2.6 * s, x + 5.5 * s, y - f * s); ctx.stroke(); };
        if (kind === 'gulls') { ctx.strokeStyle = 'rgba(60,70,100,0.35)'; ctx.lineWidth = 2.6; wing(); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5; wing(); }
        else { ctx.strokeStyle = 'rgba(40,36,66,0.5)'; ctx.lineWidth = 1.5; wing(); }
      }
    }
  } else if (kind === 'flies') {
    // butterflies: each keeps to its own patch, wandering in slow loops with quick wing beats
    const cols = ['255,236,150', '255,190,214', '255,255,255', '190,226,255'], cam = (G.camX || 0) * 0.8;
    for (let i = 0; i < 4; i++) {
      const h = hash(i, 733), hx = ((((h % 1000) / 1000 * (W + 200) - cam) % (W + 200)) + W + 200) % (W + 200) - 100, hy = 250 + ((h >>> 10) % 190);
      const x = hx + Math.sin(t * 0.37 + i * 2.1) * 46 + Math.sin(t * 1.3 + i) * 9, y = hy + Math.cos(t * 0.5 + i * 1.3) * 26 + Math.sin(t * 2.2 + i) * 5;
      const fl = Math.abs(Math.sin(t * 11 + i * 2)), c = cols[i % 4];
      ctx.fillStyle = 'rgba(' + c + ',0.85)';
      for (const sd of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(x + sd * 2.2 * fl, y - 1, 2.6 * fl + 0.4, 2.8, sd * 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + sd * 1.7 * fl, y + 1.8, 1.8 * fl + 0.3, 1.9, -sd * 0.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(50,40,60,0.7)'; ctx.fillRect(x - 0.5, y - 2.4, 1, 5);
    }
  } else if (kind === 'stars') {
    // a shooting star every few seconds, somewhere in the upper sky
    const P = 6.5, n = Math.floor(t / P), u = (t - n * P) / 0.7;
    if (u < 1 && t > 0) {
      const h = hash(n % 997, 811), x0 = 120 + (h % 700), y0 = 40 + ((h >>> 10) % 130), dir = (h >>> 20) & 1 ? 1 : -1;
      const x = x0 + dir * u * 150, y = y0 + u * 62, a = Math.sin(u * Math.PI);
      const g = ctx.createLinearGradient(x, y, x - dir * 58, y - 24);
      g.addColorStop(0, 'rgba(255,255,255,' + (0.85 * a) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dir * 58, y - 24); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,' + a + ')'; circle(x, y, 1.6); ctx.fill();
    }
  }
}
function drawMotes() {
  const amb = ambience(), kind = amb[0];
  if (amb[1]) { ctx.save(); drawLife(amb[1]); ctx.restore(); }
  if (!kind) return;
  const t = reduceMotion ? 0 : G.clock, cam = (G.camX || 0) * 0.5, wrap = (v, m) => ((v % m) + m) % m;
  ctx.save();
  const N = kind === 'snow' ? 26 : kind === 'sparkle' ? 12 : 18;
  for (let i = 0; i < N; i++) {
    const h = hash(i, 301), u = (h % 1000) / 1000, v = ((h >>> 10) % 1000) / 1000, w = ((h >>> 20) % 1000) / 1000;
    let x, y, a, r;
    if (kind === 'pollen' || kind === 'dust') {
      x = wrap(u * (W + 40) + t * (5 + w * 9) - cam, W + 40) - 20 + Math.sin(t * 0.6 + i) * 10; y = wrap(v * (H + 40) - t * (3 + u * 5), H + 40) - 20 + Math.sin(t * 0.45 + i * 2.1) * 8;
      a = (kind === 'dust' ? 0.2 : 0.34) * (0.55 + 0.45 * Math.sin(t * 0.9 + i * 1.3)); r = 1 + w * 1.3;
      ctx.fillStyle = kind === 'dust' ? 'rgba(255,244,214,' + a + ')' : 'rgba(255,255,236,' + a + ')'; circle(x, y, r); ctx.fill();
    } else if (kind === 'snow') {
      x = wrap(u * (W + 40) + Math.sin(t * 0.8 + i) * 14 - t * (4 + w * 8) - cam, W + 40) - 20; y = wrap(v * (H + 20) + t * (22 + w * 26), H + 20) - 10;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + w * 0.3) + ')'; circle(x, y, 1 + w * 1.5); ctx.fill();
    } else if (kind === 'embers') {
      x = wrap(u * (W + 40) + Math.sin(t * 1.1 + i * 1.9) * 16 - cam, W + 40) - 20; y = wrap(v * (H + 20) - t * (16 + w * 22), H + 20) - 10;
      a = 0.3 + 0.3 * Math.sin(t * 3 + i * 2.3);
      ctx.fillStyle = 'rgba(255,' + (150 + ((h >>> 5) % 70)) + ',70,' + a + ')'; circle(x, y, 1 + w * 1.2); ctx.fill();
    } else if (kind === 'glow' || kind === 'wisps') {
      // fireflies: slow wandering lights that fade in and out
      x = wrap(u * (W + 40) + Math.sin(t * 0.33 + i * 1.7) * 34 + Math.sin(t * 0.9 + i) * 8 - cam, W + 40) - 20; y = 120 + v * (H - 170) + Math.cos(t * 0.4 + i * 2.3) * 22;
      a = Math.max(0, Math.sin(t * (0.7 + w * 0.6) + i * 2.9)); if (a <= 0.02) continue;
      const col = kind === 'wisps' ? '190,255,200' : '255,240,170';
      ctx.fillStyle = 'rgba(' + col + ',' + (a * 0.16) + ')'; circle(x, y, 5); ctx.fill();
      ctx.fillStyle = 'rgba(' + col + ',' + (a * 0.75) + ')'; circle(x, y, 1.4); ctx.fill();
    } else if (kind === 'sparkle') {
      // little four-point twinkles that come and go in place
      const ph = t * (0.5 + w * 0.5) + i * 1.9, n = Math.floor(ph / Math.PI), hh = hash(i, 400 + (n % 97));
      a = Math.sin(ph - n * Math.PI); x = wrap((hh % 1000) / 1000 * W - cam, W); y = 30 + ((hh >>> 10) % 1000) / 1000 * (H - 90); r = (2 + w * 2.2) * a;
      ctx.fillStyle = 'rgba(255,255,240,' + (a * 0.6) + ')';
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
    } else if (kind === 'petals' || kind === 'leaves') {
      const sp = kind === 'leaves' ? 70 + w * 60 : 12 + w * 14;
      x = wrap(u * (W + 60) - t * sp + Math.sin(t * 0.9 + i) * 18 - cam, W + 60) - 30; y = wrap(v * (H + 30) + t * (kind === 'leaves' ? 26 + u * 20 : 20 + w * 16) + Math.sin(t * 1.3 + i * 2) * 10, H + 30) - 15;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * (1 + w) + i);
      ctx.fillStyle = kind === 'leaves' ? ['rgba(150,190,90,0.6)', 'rgba(205,165,80,0.6)', 'rgba(120,170,110,0.6)'][i % 3] : 'rgba(255,196,214,' + (0.5 + w * 0.25) + ')';
      ctx.beginPath(); ctx.ellipse(0, 0, 3 + w * 1.4, 1.5 + w * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    } else if (kind === 'bubbles') {
      x = wrap(u * (W + 40) + Math.sin(t * 1.2 + i * 1.9) * 7 - cam, W + 40) - 20; y = wrap(v * (H + 20) - t * (18 + w * 20), H + 20) - 10;
      ctx.strokeStyle = 'rgba(235,250,255,' + (0.3 + w * 0.2) + ')'; ctx.lineWidth = 1; circle(x, y, 1.6 + w * 2); ctx.stroke();
    }
  }
  ctx.restore();
}

/* ---------- the light finish: gently darker corners with a little of the sun's warmth on its side ---------- */
// One cached picture at the screen's own size, copied on whole pixels without smoothing, and only its four edge
// bands: the middle of the screen is untouched (clear in the picture), so it isn't copied at all.
let _finish = { key: '' };
const FINISH_HOLE = { x0: 150, y0: 60, x1: 810, y1: 436 };   // inside the vignette's clear radius (380 round 480, 248)
function drawFinish() {
  if (artPlain() || G.mode === 'title') return;
  const m = ctx.getTransform(), sc = canvas.width / W, sunOn = !/,\s*0\)\s*$/.test(C.sun);
  const key = [C.sunGlow, sunOn, canvas.width, canvas.height].join('|');
  if (_finish.key !== key) {
    const cv = document.createElement('canvas'); cv.width = canvas.width; cv.height = canvas.height;
    const c = cv.getContext('2d'); c.scale(sc, canvas.height / H);
    const v = c.createRadialGradient(W / 2, 248, 380, W / 2, 248, 640);
    v.addColorStop(0, 'rgba(20,18,44,0)'); v.addColorStop(0.45, 'rgba(20,18,44,0.05)'); v.addColorStop(1, 'rgba(20,18,44,0.2)');
    c.fillStyle = v; c.fillRect(0, 0, W, H);
    if (sunOn) {   // the sun's side keeps a touch of its colour instead of going dark
      const g = c.createRadialGradient(900, 20, 20, 900, 20, 330); g.addColorStop(0, rgbaOf(C.sunGlow, 0.16)); g.addColorStop(1, rgbaOf(C.sunGlow, 0));
      c.fillStyle = g; c.fillRect(FINISH_HOLE.x1, 0, W - FINISH_HOLE.x1, 360); c.fillRect(560, 0, FINISH_HOLE.x1 - 560, FINISH_HOLE.y0);
    }
    _finish = { key, cv };
  }
  const cv = _finish.cv, sy = canvas.height / H;
  const x0 = Math.round(FINISH_HOLE.x0 * sc), x1 = Math.round(FINISH_HOLE.x1 * sc), y0 = Math.round(FINISH_HOLE.y0 * sy), y1 = Math.round(FINISH_HOLE.y1 * sy), cw = cv.width, chh = cv.height;
  const sm = ctx.imageSmoothingEnabled;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cv, 0, 0, cw, y0, 0, 0, cw, y0);
  ctx.drawImage(cv, 0, y1, cw, chh - y1, 0, y1, cw, chh - y1);
  ctx.drawImage(cv, 0, y0, x0, y1 - y0, 0, y0, x0, y1 - y0);
  ctx.drawImage(cv, x1, y0, cw - x1, y1 - y0, x1, y0, cw - x1, y1 - y0);
  ctx.setTransform(m); ctx.imageSmoothingEnabled = sm;
}
