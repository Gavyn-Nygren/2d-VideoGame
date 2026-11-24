/* Pip & Bo - preview for 43-4 Laser Tag Arena (world page card). Loaded after every level file, so it also keeps
   Laser Tag the world's last level whatever order the World 43 levels' script blocks load in. */
'use strict';

// 43-4 is the world's final level: move it after the other World 43 levels (level codes follow LEVELS order)
(function () {
  const i = LEVELS.findIndex(l => l.mode === 'arcadelaser');
  if (i < 0) return;
  let last = -1; LEVELS.forEach((l, j) => { if (l.world === LEVELS[i].world) last = j; });
  if (last > i) { const d = LEVELS.splice(i, 1)[0]; LEVELS.splice(last, 0, d); }
})();
/* 43-4 Laser Tag Arena, first person and split screen like the game: Pip's eyes on the top half, Bo's below. 6 s loop:
     0.0 - 1.2  both creep forward through the hall (a walk bob), the crowd bobbing in the gallery, lamps sweeping
     1.2 - 2.2  Pip holds fire: the dotted aiming line runs to the mirror and bounces toward Bo. Bo sees the dots coming
                in their own view, and JUMP! flashes
     2.2 - 2.9  the orange beam goes; Bo jumps (Bo's view rises and the beam passes under: DODGE!)
     2.9 - 4.1  Pip steps behind the pillar; Bo fires straight back and the blue beam splashes on it
     4.0 - 4.9  Pip banks it again while Bo is on the ground: ZAP! in Pip's view, TAGGED in Bo's (the view wobbles, the
                edges flash orange, the blaster drops), Pip's lamps tick up
     4.9 - 6.0  Bo spins, safe for a moment
   Still at 2.45 (the beam off the mirror, Bo in the air). A pure function of t. Every helper starts with pw43l.
   Each view is its own little 3D scene: pw43lCam projects metres (x across, y up, z ahead) onto that half. */
const PW43L = { pink: '#ff5ad6', cyan: '#4ae8ff', green: '#5aff8a', yellow: '#ffe24a', orange: '#ff9a3a', blue: '#4aa8ff', gold: '#ffd84a' };
const PW43L_F = 154, PW43L_VH = 89, PW43L_EYE = 0.6;
// a camera for the half starting at y0 (eye height eye, standing at x, z, looking straight down +z)
function pw43lCam(y0, x, z, eye, sway) {
  const hy = y0 + PW43L_VH / 2 - 0.055 * PW43L_F, cx = 160 + sway;
  return { y0, hy, eye, p(X, Y, Z) { const lz = Math.max(0.15, Z - z), k = PW43L_F / lz; return { x: cx + (X - x) * k, y: hy + (eye - Y) * k, k }; } };
}
const pw43lQuad = (c, pts, fill) => { c.fillStyle = fill; c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.closePath(); c.fill(); };
// the hall behind everything: ceiling and lamps, the gallery wall full of pixel creatures, side walls, the floor
function pw43lHall(v, t, cam, signX) {
  const c = v.ctx, P = cam.p, y0 = cam.y0;
  c.fillStyle = '#0b0912'; c.fillRect(0, y0, 320, PW43L_VH);
  // ceiling trusses running away
  c.strokeStyle = 'rgba(90,84,110,0.35)'; c.lineWidth = 0.8;
  for (let X = -12; X <= 12; X += 3) { const a = P(X, 4.2, 1.2), b = P(X, 4.2, 16); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
  // the far wall: a gallery of glass panes, bulb trim, a pink neon strip
  const top = P(0, 3.4, 16), bot = P(0, 0, 16);
  c.fillStyle = '#1a1424'; c.fillRect(0, top.y, 320, bot.y - top.y);
  for (let p = -11; p <= 10; p++) {
    const a = P(p * 1.7, 2.7, 16), b = P(p * 1.7 + 1.45, 1.05, 16);
    c.fillStyle = '#231b30'; c.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) {
      const n = (p + 20) * 9 + r * 5 + k, col = ['#5aff8a', '#ff5ad6', '#4ae8ff', '#ffe24a', '#b48aff', '#7affd8'][n % 6];
      const q = P(p * 1.7 + 0.18 + k * 0.33, 2.25 - r * 0.62 + Math.abs(Math.sin(t * 5 + n)) * 0.12, 16), s = q.k * 0.22;
      c.fillStyle = col; c.fillRect(q.x, q.y, s, s);
      c.fillStyle = '#fff'; c.fillRect(q.x + s * 0.2, q.y + s * 0.25, s * 0.25, s * 0.25); c.fillRect(q.x + s * 0.6, q.y + s * 0.25, s * 0.25, s * 0.25);
    }
    c.fillStyle = 'rgba(160,200,255,0.08)'; c.fillRect(a.x, a.y, b.x - a.x, (b.y - a.y) * 0.35);
  }
  for (let k = -40; k <= 40; k++) { const q = P(k * 0.45, 3.0, 16); c.fillStyle = (k + Math.floor(t * 6)) % 4 ? '#ffd86a' : '#fff6d0'; v.circle(q.x, q.y, 0.7); c.fill(); }
  { const a = P(-20, 0.75, 16), b = P(20, 0.68, 16); c.fillStyle = PW43L.pink; c.fillRect(0, a.y, 320, Math.max(1, b.y - a.y)); }
  // the ZAP MAZE sign over the gallery
  { const q = P(signX, 3.75, 15.8); c.save(); c.shadowColor = PW43L.cyan; c.shadowBlur = 6; c.strokeStyle = PW43L.cyan; c.lineWidth = 1; v.rr(q.x - 22, q.y - 5, 44, 10, 2); c.stroke(); v.text('ZAP MAZE', q.x, q.y + 0.5, 7, '#ffd0f4', 'center'); c.restore(); }
  // side walls with a neon strip and glow-paint murals
  for (const sx of [-1, 1]) {
    const X = sx * 5.2, n0 = P(X, 0, 1.3), n1 = P(X, 3.4, 1.3), f0 = P(X, 0, 16), f1 = P(X, 3.4, 16);
    pw43lQuad(c, [n0, f0, f1, n1], '#151020');
    const s0 = P(X, 1.0, 1.3), s1 = P(X, 1.0, 16); c.strokeStyle = sx < 0 ? PW43L.cyan : PW43L.pink; c.lineWidth = 1.4; c.beginPath(); c.moveTo(s0.x, s0.y); c.lineTo(s1.x, s1.y); c.stroke();
    for (const Z of [4, 8.5, 13]) { const m = P(X, 2.0, Z), r = m.k * 0.42; c.strokeStyle = ['#5aff8a', '#ffe24a', '#ff5ad6'][(Z | 0) % 3]; c.lineWidth = Math.max(0.6, m.k * 0.05); c.beginPath(); c.ellipse(m.x, m.y, r * 0.35, r, 0, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.ellipse(m.x, m.y + r * 0.25, r * 0.18, r * 0.4, 0, 0.2, Math.PI - 0.2); c.stroke(); }
  }
  // the floor: dark rubber, lines running away, glow-paint confetti, a gold lane line
  const fl = P(0, 0, 16);
  c.fillStyle = '#15111f'; c.fillRect(0, fl.y, 320, y0 + PW43L_VH - fl.y);
  c.strokeStyle = 'rgba(120,100,160,0.18)'; c.lineWidth = 0.7;
  for (let X = -5; X <= 5; X += 1.25) { const a = P(X, 0, 1.3), b = P(X, 0, 16); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
  for (const Z of [2, 3, 4.5, 6.5, 9, 12.5]) { const a = P(-5.2, 0, Z), b = P(5.2, 0, Z); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
  for (let i = 0; i < 80; i++) { const q = P(-5 + v.rand(i + 3) * 10, 0, 1.4 + v.rand(i + 60) * 14); c.fillStyle = ['#ff5ad6', '#4ae8ff', '#5aff8a', '#ffe24a'][i % 4]; c.globalAlpha = 0.4 + 0.25 * Math.sin(t * 2 + i); c.fillRect(q.x, q.y, Math.max(0.8, q.k * 0.07), Math.max(0.5, q.k * 0.025)); }
  c.globalAlpha = 1;
  c.save(); c.setLineDash([4, 4]); c.strokeStyle = 'rgba(255,216,74,0.55)'; c.lineWidth = 1; { const a = P(-5.2, 0, 10), b = P(5.2, 0, 10); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); } c.restore();
}
// lamps sweeping beams through the haze and the mirror ball's dots (drawn over the scene, added light)
function pw43lLights(v, t, cam, ph) {
  const c = v.ctx, y0 = cam.y0;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const [x, col, o] of [[40, 'rgba(90,255,138,0.09)', 0], [280, 'rgba(255,226,74,0.09)', 2], [150, 'rgba(74,232,255,0.07)', 4]]) {
    const a = Math.sin(t * 0.9 + o + ph) * 0.5, ex = x + Math.sin(a) * 110, ey = y0 + Math.cos(a) * 100, nx = Math.cos(a) * 18, ny = -Math.sin(a) * 18;
    c.fillStyle = col; c.beginPath(); c.moveTo(x, y0); c.lineTo(ex + nx, ey + ny); c.lineTo(ex - nx, ey - ny); c.closePath(); c.fill();
  }
  for (let i = 0; i < 18; i++) { const a = i * 2.4 + t * 0.35 + ph, x = 160 + Math.cos(a) * (40 + (i * 37) % 120), y = y0 + 8 + Math.abs(Math.sin(a * 1.3)) * 70; c.fillStyle = 'rgba(255,255,255,0.4)'; v.circle(x, y, 0.8); c.fill(); }
  c.restore();
}
// a padded pillar: quilted panels, two pink neon rings, a hazard-taped skirt (centre X, Z, radius r)
function pw43lPillar(v, cam, X, Z, r) {
  const c = v.ctx, b = cam.p(X, 0, Z), tp = cam.p(X, 2.25, Z), w = r * b.k;
  c.fillStyle = '#2a2138'; c.fillRect(b.x - w, tp.y, w * 2, b.y - tp.y);
  const g = c.createLinearGradient(b.x - w, 0, b.x + w, 0); g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(0.45, 'rgba(255,255,255,0.06)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
  c.fillStyle = g; c.fillRect(b.x - w, tp.y, w * 2, b.y - tp.y);
  // quilting: seams and buttons
  c.strokeStyle = 'rgba(10,6,18,0.6)'; c.lineWidth = Math.max(0.5, b.k * 0.012);
  for (let i = 1; i < 6; i++) { const x = b.x - w + w * 2 * (0.5 - Math.cos(i / 6 * Math.PI) / 2); c.beginPath(); c.moveTo(x, tp.y); c.lineTo(x, b.y); c.stroke(); }
  for (let j = 1; j < 9; j++) { const y = b.y - (b.y - tp.y) * j / 9; c.beginPath(); c.moveTo(b.x - w, y); c.lineTo(b.x + w, y); c.stroke(); for (let i = 1; i < 6; i++) { const x = b.x - w + w * 2 * (0.5 - Math.cos(i / 6 * Math.PI) / 2); c.fillStyle = '#140e1e'; v.circle(x, y, Math.max(0.4, b.k * 0.012)); c.fill(); } }
  // neon rings
  c.save(); c.shadowColor = PW43L.pink; c.shadowBlur = 6; c.strokeStyle = PW43L.pink; c.lineWidth = Math.max(1, b.k * 0.04);
  for (const y of [0.35, 1.55]) { const q = cam.p(X, y, Z); c.beginPath(); c.ellipse(b.x, q.y, w, w * 0.12, 0, 0, Math.PI); c.stroke(); }
  c.restore();
  // the skirt: yellow and black tape
  const sk = cam.p(X, 0.16, Z), sw = w * 1.06;
  c.save(); c.beginPath(); c.rect(b.x - sw, sk.y, sw * 2, b.y - sk.y); c.clip(); c.fillStyle = '#1a1620'; c.fillRect(b.x - sw, sk.y, sw * 2, b.y - sk.y);
  c.fillStyle = '#ffd23a'; for (let x = -sw; x < sw; x += b.k * 0.12) { c.beginPath(); c.moveTo(b.x + x, b.y); c.lineTo(b.x + x + b.k * 0.06, b.y); c.lineTo(b.x + x + b.k * 0.12, sk.y); c.lineTo(b.x + x + b.k * 0.06, sk.y); c.closePath(); c.fill(); }
  c.restore();
  // a zone number plate
  const zp = cam.p(X, 1.05, Z); c.fillStyle = '#d8d2c4'; v.rr(b.x - w * 0.32, zp.y - b.k * 0.1, w * 0.64, b.k * 0.2, 1); c.fill(); v.text('71', b.x, zp.y + 0.5, Math.max(4, b.k * 0.16), '#2a2232', 'center');
}
// a wooden prop crate (front face at Z, w x h metres), plank lines, a steel-capped edge, a stencil and a strap
function pw43lCrate(v, cam, X, Z, w, h, d, label) {
  const c = v.ctx, a = cam.p(X - w / 2, 0, Z), b = cam.p(X + w / 2, h, Z), k = a.k;
  // the side toward the middle of the view
  const sx = X > 0 ? X - w / 2 : X + w / 2, s0 = cam.p(sx, 0, Z), s1 = cam.p(sx, h, Z), s2 = cam.p(sx, h, Z + d), s3 = cam.p(sx, 0, Z + d);
  pw43lQuad(c, [s0, s1, s2, s3], '#3e281c');
  if (h < PW43L_EYE) pw43lQuad(c, [cam.p(X - w / 2, h, Z), cam.p(X + w / 2, h, Z), cam.p(X + w / 2, h, Z + d), cam.p(X - w / 2, h, Z + d)], '#7a5638');
  c.fillStyle = '#5e3e2a'; c.fillRect(a.x, b.y, b.x - a.x, a.y - b.y);
  c.strokeStyle = 'rgba(30,16,10,0.6)'; c.lineWidth = Math.max(0.5, k * 0.01);
  for (let i = 1; i < 5; i++) { const y = b.y + (a.y - b.y) * i / 5; c.beginPath(); c.moveTo(a.x, y); c.lineTo(b.x, y); c.stroke(); }
  c.lineWidth = Math.max(1, k * 0.05); c.strokeStyle = '#7a5638'; c.strokeRect(a.x + k * 0.03, b.y + k * 0.03, b.x - a.x - k * 0.06, a.y - b.y - k * 0.06);
  c.beginPath(); c.moveTo(a.x + k * 0.05, a.y - k * 0.05); c.lineTo(b.x - k * 0.05, b.y + k * 0.05); c.stroke();
  c.fillStyle = '#9aa0aa'; for (const [x, y] of [[a.x, b.y], [b.x, b.y], [a.x, a.y], [b.x, a.y]]) c.fillRect(x - k * 0.05, y - k * 0.05, k * 0.1, k * 0.1);
  if (label) v.text(label, (a.x + b.x) / 2, (a.y + b.y) / 2, Math.max(3, k * 0.13), 'rgba(232,200,138,0.85)', 'center');
  c.fillStyle = '#2a2a30'; c.fillRect(a.x + (b.x - a.x) * 0.7, b.y, Math.max(1, k * 0.05), a.y - b.y);
}
// a low wall of sandbags across from X0 to X1 at Z (three rows, a jumpable cover)
function pw43lBags(v, cam, X0, X1, Z) {
  const c = v.ctx;
  for (let r = 0; r < 3; r++) for (let X = X0 + (r % 2) * 0.17; X < X1 - 0.1; X += 0.34) {
    const q = cam.p(X + 0.17, 0.09 + r * 0.16, Z), rx = q.k * 0.18, ry = q.k * 0.095;
    c.fillStyle = (Math.round(X * 3) + r) % 2 ? '#9a7a52' : '#8a6a46'; c.beginPath(); c.ellipse(q.x, q.y, rx, ry, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#3a2a1a'; c.lineWidth = Math.max(0.5, q.k * 0.01); c.stroke();
    c.strokeStyle = 'rgba(58,42,26,0.5)'; c.beginPath(); c.moveTo(q.x - rx * 0.6, q.y - ry * 0.2); c.lineTo(q.x + rx * 0.6, q.y - ry * 0.2); c.stroke();
  }
}
// a chain fence along Z0..Z1 at X (side-on), posts, a diamond mesh, a NO CLIMBING sign and a glowing smiley
function pw43lFence(v, cam, X, Z0, Z1) {
  const c = v.ctx, a = cam.p(X, 0, Z0), b = cam.p(X, 1.6, Z0), e = cam.p(X, 1.6, Z1), f = cam.p(X, 0, Z1);
  pw43lQuad(c, [a, b, e, f], 'rgba(40,34,52,0.55)');
  c.strokeStyle = 'rgba(170,170,190,0.45)'; c.lineWidth = 0.5;
  for (let i = 0; i <= 14; i++) { const Z = Z0 + (Z1 - Z0) * i / 14; const p0 = cam.p(X, 0, Z), p1 = cam.p(X, 1.6, Math.min(Z1, Z + 0.8)); c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.stroke(); const p2 = cam.p(X, 1.6, Z), p3 = cam.p(X, 0, Math.min(Z1, Z + 0.8)); c.beginPath(); c.moveTo(p2.x, p2.y); c.lineTo(p3.x, p3.y); c.stroke(); }
  for (const Z of [Z0, (Z0 + Z1) / 2, Z1]) { const p0 = cam.p(X, 0, Z), p1 = cam.p(X, 1.7, Z); c.strokeStyle = '#4a4652'; c.lineWidth = Math.max(1, p0.k * 0.06); c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.stroke(); }
  const m = cam.p(X, 0.9, Z0 + (Z1 - Z0) * 0.68), r = m.k * 0.32;
  c.save(); c.shadowColor = PW43L.green; c.shadowBlur = 5; c.strokeStyle = PW43L.green; c.lineWidth = Math.max(0.8, m.k * 0.03);
  c.beginPath(); c.ellipse(m.x, m.y, r * 0.5, r, 0, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.ellipse(m.x, m.y + r * 0.2, r * 0.3, r * 0.5, 0, 0.3, Math.PI - 0.3); c.stroke(); c.restore();
  const s = cam.p(X, 1.25, Z0 + (Z1 - Z0) * 0.25); c.fillStyle = '#f4efe2'; c.fillRect(s.x - s.k * 0.12, s.y - s.k * 0.08, s.k * 0.24, s.k * 0.16); v.text('NO', s.x, s.y - s.k * 0.03, Math.max(2.5, s.k * 0.06), '#c0302a', 'center'); v.text('CLIMBING', s.x, s.y + s.k * 0.04, Math.max(2, s.k * 0.04), '#c0302a', 'center');
}
// a hazard barrier along Z0..Z1 at X: a low striped wall with a warning lamp
function pw43lHazard(v, cam, X, Z0, Z1, t) {
  const c = v.ctx, H = 0.62;
  pw43lQuad(c, [cam.p(X, 0, Z0), cam.p(X, H, Z0), cam.p(X, H, Z1), cam.p(X, 0, Z1)], '#1c1820');
  for (let i = 0; i < 8; i += 2) { const za = Z0 + (Z1 - Z0) * i / 8, zb = Z0 + (Z1 - Z0) * (i + 1) / 8; pw43lQuad(c, [cam.p(X, 0.08, za), cam.p(X, H - 0.08, za + 0.25), cam.p(X, H - 0.08, zb + 0.25), cam.p(X, 0.08, zb)], '#f2c230'); }
  const l = cam.p(X, H + 0.1, Z0 + 0.2); c.fillStyle = Math.sin(t * 6) > 0 ? '#ffb030' : '#7a4a20'; v.circle(l.x, l.y, Math.max(1, l.k * 0.06)); c.fill();
}
// the mirror: a framed panel from (ax, az) to (bx, bz), 1.6 m tall, with gold neon trim
function pw43lMirror(v, cam, ax, az, bx, bz, t, flash) {
  const c = v.ctx, p0 = cam.p(ax, 0.1, az), p1 = cam.p(ax, 1.6, az), p2 = cam.p(bx, 1.6, bz), p3 = cam.p(bx, 0.1, bz);
  const g = c.createLinearGradient(p0.x, p1.y, p3.x, p0.y); g.addColorStop(0, '#7ac8e8'); g.addColorStop(0.45, '#e8fbff'); g.addColorStop(0.6, '#b8e8ff'); g.addColorStop(1, '#4a88c0');
  pw43lQuad(c, [p0, p1, p2, p3], g);
  c.save(); c.beginPath(); [p0, p1, p2, p3].forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.closePath(); c.clip();
  const sh = (t * 0.5) % 1, sx = p0.x + (p3.x - p0.x) * sh; c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(sx, p2.y - 40, 4, 120);
  for (let k = 0; k < 5; k++) { c.fillStyle = ['#5aff8a', '#ff5ad6', '#ffe24a'][k % 3]; c.globalAlpha = 0.35; const q = cam.p(ax + (bx - ax) * (0.15 + k * 0.17), 1.2, az + (bz - az) * (0.15 + k * 0.17)); c.fillRect(q.x, q.y, q.k * 0.08, q.k * 0.08); }
  c.restore();
  c.save(); c.shadowColor = PW43L.gold; c.shadowBlur = 6; c.strokeStyle = '#fff2b0'; c.lineWidth = Math.max(1, p0.k * 0.05);
  c.beginPath(); [p0, p1, p2, p3].forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.closePath(); c.stroke(); c.restore();
  // the stand's feet
  c.fillStyle = '#3a3048'; for (const q of [cam.p(ax, 0, az), cam.p(bx, 0, bz)]) { c.fillRect(q.x - q.k * 0.1, q.y - q.k * 0.1, q.k * 0.2, q.k * 0.1); }
  if (flash > 0) { const m = cam.p((ax + bx) / 2, 0.34, (az + bz) / 2); c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(255,200,140,${flash})`; v.circle(m.x, m.y, m.k * (0.1 + flash * 0.25)); c.fill(); c.restore(); }
}
// the other player, seen across the hall: feet at (X, Z), up in the air by hop metres; their vest glows
function pw43lFoe(v, cam, id, X, Z, o) {
  const c = v.ctx, col = id ? PW43L.blue : PW43L.orange, f = cam.p(X, o.hop || 0, Z), g = cam.p(X, 0, Z), s = f.k * 0.87 / 30;
  v.shadow(g.x, g.y, f.k * 0.5);
  v.hero(id, f.x, f.y, { s, face: o.face, mood: o.mood, shadow: false, alpha: o.alpha });
  const vest = cam.p(X, (o.hop || 0) + 0.36, Z);
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = o.alpha == null ? 1 : o.alpha;
  c.fillStyle = col; c.globalAlpha *= 0.35; v.circle(vest.x, vest.y, f.k * 0.2); c.fill(); c.restore();
  c.fillStyle = '#e8e2f0'; v.rr(f.x + o.face * f.k * 0.12 - f.k * 0.11, vest.y - f.k * 0.04, f.k * 0.22, f.k * 0.08, f.k * 0.03); c.fill();
  c.fillStyle = col; v.circle(f.x + o.face * f.k * 0.24, vest.y, f.k * 0.035); c.fill();
  return { x: f.x + o.face * f.k * 0.25, y: vest.y, k: f.k };
}
// a beam along points [{x, y, w}], drawn up to d pixels along it and its tail fading behind; widths taper per point
function pw43lBeam(v, pts, d, col, tail = 140) {
  const c = v.ctx; let walked = 0;
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
  for (let i = 0; i + 1 < pts.length; i++) {
    const A = pts[i], B = pts[i + 1], L = Math.hypot(B.x - A.x, B.y - A.y) || 1;
    for (let s = 0; s < L; s += 6) {
      const at = walked + s; if (at > d || at < d - tail) continue;
      const k0 = s / L, k1 = Math.min(1, (s + 6) / L), w = A.w + (B.w - A.w) * k0, fade = 1 - (d - at) / tail;
      for (const [m, a] of [[2.6, 0.22], [1.3, 0.55], [0.5, 1]]) { c.strokeStyle = a === 1 ? '#fffaf0' : col; c.globalAlpha = a * fade; c.lineWidth = Math.max(0.6, w * m); c.beginPath(); c.moveTo(A.x + (B.x - A.x) * k0, A.y + (B.y - A.y) * k0); c.lineTo(A.x + (B.x - A.x) * k1, A.y + (B.y - A.y) * k1); c.stroke(); }
    }
    walked += L;
  }
  c.restore();
}
// the dotted aiming line along the same points, shown up to the fraction k
function pw43lAim(v, pts, k, col) {
  const c = v.ctx; let total = 0; for (let i = 0; i + 1 < pts.length; i++) total += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
  let left = k * total;
  c.save(); c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 3;
  for (let i = 0; i + 1 < pts.length && left > 0; i++) {
    const A = pts[i], B = pts[i + 1], L = Math.hypot(B.x - A.x, B.y - A.y) || 1;
    for (let s = 3; s < Math.min(L, left); s += 5) { const q = s / L, w = A.w + (B.w - A.w) * q; v.circle(A.x + (B.x - A.x) * q, A.y + (B.y - A.y) * q, Math.max(0.5, w * 0.35)); c.fill(); }
    left -= L;
  }
  c.restore();
}
// the blaster held in the right hand (bottom right of the half), the sleeve in the hero's colour; returns the muzzle
function pw43lHand(v, cam, id, o) {
  const c = v.ctx, col = id ? PW43L.blue : PW43L.orange, sleeve = id ? v.c.bo : v.c.pip, dark = id ? v.c.boDark : v.c.pipDark;
  const bx = 214 + (o.sway || 0) + (o.recoil || 0) * 4, by = cam.y0 + 70 + (o.low || 0) * 16 + (o.recoil || 0) * 2, a = 0.4;
  c.save(); c.translate(bx, by); c.rotate(a);
  // the sleeve and the coiled cable
  c.strokeStyle = dark; c.lineWidth = 15; c.lineCap = 'round'; c.beginPath(); c.moveTo(34, 34); c.lineTo(6, 8); c.stroke();
  c.strokeStyle = sleeve; c.lineWidth = 12; c.beginPath(); c.moveTo(34, 34); c.lineTo(6, 8); c.stroke();
  if (id === 0) { c.strokeStyle = '#ffd84a'; c.lineWidth = 12.5; c.beginPath(); c.moveTo(12, 14); c.lineTo(10, 12); c.stroke(); }
  c.strokeStyle = '#1e1a24'; c.lineWidth = 1.6; c.beginPath(); for (let i = 0; i <= 16; i++) { const u = i / 16; c.lineTo(12 + u * 26 + Math.sin(u * 30) * 2, 6 + u * 18 + Math.cos(u * 30) * 2); } c.stroke();
  // the shell: a chunky white-and-lilac body, the carry handle, a stripe in the vest's colour, the glowing nose
  c.fillStyle = '#d8d0e6'; v.rr(-20, -7, 38, 16, 7); c.fill();
  c.fillStyle = '#f2eef8'; v.rr(-20, -8, 36, 11, 6); c.fill();
  c.strokeStyle = v.c.ink; c.lineWidth = 1; v.rr(-20, -8, 38, 17, 7); c.stroke();
  c.fillStyle = col; c.fillRect(-12, 1, 22, 2.4);
  c.strokeStyle = '#1e1a24'; c.lineWidth = 3; c.beginPath(); c.moveTo(-6, -8); c.quadraticCurveTo(1, -20, 9, -8); c.stroke();
  c.fillStyle = '#c8c0d8'; c.beginPath(); c.ellipse(-21, 0.5, 4, 7, 0, 0, Math.PI * 2); c.fill();
  c.save(); c.shadowColor = col; c.shadowBlur = 6 + (o.glow || 0) * 8; c.strokeStyle = col; c.lineWidth = 2.4; c.beginPath(); c.ellipse(-23, 0.5, 2.6, 6, 0, 0, Math.PI * 2); c.stroke(); c.restore();
  if (o.flash > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(255,240,210,${o.flash})`; v.circle(-27, 0.5, 6 + o.flash * 6); c.fill(); c.restore(); }
  c.restore();
  return { x: bx - 26 * Math.cos(a), y: by - 26 * Math.sin(a), w: 5 };
}
// the half's own panel (name, five tag lamps), crosshair and radar
function pw43lHud(v, cam, id, tags, lock, t, foe) {
  const c = v.ctx, y0 = cam.y0, col = id ? PW43L.blue : PW43L.orange, other = id ? PW43L.orange : PW43L.blue;
  c.fillStyle = 'rgba(14,12,20,0.82)'; v.rr(4, y0 + 4, 52, 13, 3); c.fill(); c.strokeStyle = col; c.lineWidth = 0.8; v.rr(4, y0 + 4, 52, 13, 3); c.stroke();
  v.text(id ? 'Bo' : 'Pip', 8, y0 + 10.7, 6, col, 'left', true);
  for (let k = 0; k < 5; k++) { c.fillStyle = k < tags ? col : '#3a3446'; v.circle(25 + k * 6.2, y0 + 10.5, 2); c.fill(); }
  const cx = 160, cy = cam.y0 + PW43L_VH / 2, cc = lock ? PW43L.gold : col;
  c.strokeStyle = cc; c.lineWidth = 1; v.circle(cx, cy, 3.4); c.stroke();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.beginPath(); c.moveTo(cx + dx * 5, cy + dy * 5); c.lineTo(cx + dx * 8, cy + dy * 8); c.stroke(); }
  const rx = 300, ry = y0 + 70, R = 14;
  c.fillStyle = 'rgba(10,8,16,0.78)'; v.circle(rx, ry, R); c.fill(); c.strokeStyle = col; c.lineWidth = 1; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.15)'; v.circle(rx, ry, R * 0.55); c.stroke();
  c.fillStyle = '#8a8496'; for (const [dx, dy, w, h] of [[-6, -8, 3, 2], [4, -4, 2, 5], [-3, 3, 5, 2], [6, 5, 2, 2]]) c.fillRect(rx + dx, ry + dy, w, h);
  c.fillStyle = col; c.beginPath(); c.moveTo(rx, ry - 3); c.lineTo(rx + 2.2, ry + 2); c.lineTo(rx - 2.2, ry + 2); c.closePath(); c.fill();
  if (foe) { c.fillStyle = other; v.circle(rx + foe[0], ry + foe[1], 1.6 + Math.abs(Math.sin(t * 6)) * 0.6); c.fill(); }
}
definePreview('Laser Tag Arena', {
  blurb: 'Split screen, through your own eyes. Tag the other vest five times; bank shots off the mirrors count.',
  loop: 6, still: 2.45,
  draw(v, t) {
    const c = v.ctx, seg = v.seg;
    const walk = t < 1.2 ? 1 : 0.25, bump = (a, b) => (t > a && t < b ? Math.sin(seg(t, a, b) * Math.PI) : 0);
    const tagged = t > 4.85 && t < 5.9 ? seg(t, 4.85, 5.9) : 0, pipTags = t > 4.85 ? 4 : 3;
    const boHop = t > 2.2 && t < 2.85 ? -v.hop(seg(t, 2.2, 2.85), 0.55) : 0;
    const flashMir = Math.max(t > 2.38 && t < 2.7 ? 1 - seg(t, 2.38, 2.7) : 0, t > 4.66 && t < 4.95 ? 1 - seg(t, 4.66, 4.95) : 0);

    /* ---- Pip's eyes (top) ---- */
    {
      const strafe = 1.2 * bump(2.9, 4.1), y0 = 0;
      const cam = pw43lCam(y0, strafe, t * 0.12 * walk, PW43L_EYE + Math.sin(t * 7) * 0.012 * walk, Math.sin(t * 1.3) * 3);
      c.save(); c.beginPath(); c.rect(0, y0, 320, PW43L_VH); c.clip();
      pw43lHall(v, t, cam, 0);
      pw43lFence(v, cam, -3.4, 2.6, 7);
      pw43lHazard(v, cam, 3.2, 5, 7.5, t);
      const spin = t > 4.9 && t < 5.8;
      const bo = pw43lFoe(v, cam, 1, 1.1 + Math.sin(t * 2.6 + 1) * 0.15 * walk, 7.6, { hop: boHop, face: spin ? (Math.floor(t * 10) % 2 ? 1 : -1) : -1, mood: spin ? 'dizzy' : boHop ? 'wow' : t > 3 && t < 3.6 ? 'grit' : 'happy', alpha: t > 4.85 ? 0.55 + 0.45 * Math.abs(Math.sin(t * 18)) : 1 });
      pw43lCrate(v, cam, -2.5, 6.4, 1, 0.95, 0.9, 'PLANET'); pw43lCrate(v, cam, -1.75, 6.6, 0.7, 0.6, 0.7, '');
      // Bo's straight shot, splashing on the far side of the pillar Pip ducked behind (the glow spills round its edges)
      const pil = cam.p(1.5, 0.4, 3.4);
      if (t > 3.15 && t < 3.9) { const k = seg(t, 3.15, 3.9); c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(74,168,255,${0.8 * (1 - k)})`; v.circle(pil.x, pil.y, pil.k * (0.46 + k * 0.3)); c.fill(); c.restore(); }
      pw43lMirror(v, cam, -1.72, 4.52, -1.48, 5.48, t, flashMir);
      pw43lPillar(v, cam, 1.5, 3.4, 0.42);
      if (t > 3.15 && t < 3.9) { const k = seg(t, 3.15, 3.9); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, s = i % 2 ? -1 : 1; c.fillStyle = i % 3 ? '#cfe6ff' : PW43L.blue; v.circle(pil.x + s * (pil.k * 0.45 + k * 30 * Math.abs(Math.cos(a))), pil.y + Math.sin(a) * k * 14 + k * k * 10, 1.2 * (1 - k) + 0.3); c.fill(); } }
      pw43lBags(v, cam, -1.5, -0.4, 3.6);
      // Pip's hand: aiming, the shot's kick
      const aiming = (t > 1.2 && t < 2.2) || (t > 4.0 && t < 4.5);
      const kick = Math.max(t > 2.2 && t < 2.4 ? 1 - seg(t, 2.2, 2.4) : 0, t > 4.5 && t < 4.7 ? 1 - seg(t, 4.5, 4.7) : 0);
      const mz = pw43lHand(v, cam, 0, { sway: Math.sin(t * 7) * 1.2 * walk + (aiming ? -6 : 0), recoil: kick, flash: kick, glow: aiming ? 1 : 0 });
      const mir = cam.p(-1.6, 0.34, 5.0), path = [mz, { x: mir.x, y: mir.y, w: mir.k * 0.05 }, { x: bo.x, y: bo.y, w: bo.k * 0.05 }];
      if (t > 1.2 && t < 2.2) pw43lAim(v, path, seg(t, 1.2, 1.8), PW43L.orange);
      if (t > 4.0 && t < 4.5) pw43lAim(v, path, seg(t, 4.0, 4.3), PW43L.orange);
      if (t > 2.2 && t < 2.95) { const over = cam.p(1.9, 0.34, 9.4); pw43lBeam(v, path.slice(0, 2).concat([{ x: over.x, y: over.y, w: over.k * 0.05 }]), (t - 2.2) * 700, PW43L.orange); }
      if (t > 4.5 && t < 5.1) pw43lBeam(v, path, Math.min(330, (t - 4.5) * 700), PW43L.orange);
      pw43lLights(v, t, cam, 0);
      // the tag on Bo's vest: a flash, sparks and ZAP!
      if (t > 4.85 && t < 5.6) {
        const k = seg(t, 4.85, 5.6);
        c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(255,154,58,${1 - k})`; v.circle(bo.x, bo.y, 6 + k * 10); c.fill(); c.restore();
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; c.fillStyle = i % 2 ? PW43L.yellow : PW43L.orange; v.circle(bo.x + Math.cos(a) * k * 20, bo.y + Math.sin(a) * k * 14 + k * k * 6, 1.1 * (1 - k) + 0.3); c.fill(); }
        v.label('ZAP!', bo.x, bo.y - 22 - k * 5, 12, PW43L.orange);
      }
      if (t > 4.62 && t < 5.4) v.label('Bank shot!', 96, y0 + 26, 9, PW43L.yellow);
      pw43lHud(v, cam, 0, pipTags, aiming, t, [5 - strafe * 3, -9]);
      c.restore();
    }

    /* ---- Bo's eyes (bottom) ---- */
    {
      const y0 = 91, wob = tagged ? Math.sin(tagged * 20) * 0.07 * (1 - tagged) : 0;
      const cam = pw43lCam(y0, 0, t * 0.12 * walk, PW43L_EYE + boHop + Math.sin(t * 7 + 1) * 0.012 * walk, Math.sin(t * 1.1 + 2) * 3);
      c.save(); c.beginPath(); c.rect(0, y0, 320, PW43L_VH); c.clip();
      c.translate(160, y0 + PW43L_VH / 2); c.rotate(wob); c.translate(-160, -(y0 + PW43L_VH / 2));
      pw43lHall(v, t, cam, -2.5);
      pw43lFence(v, cam, 3.4, 3, 8);
      pw43lHazard(v, cam, -3.3, 3.5, 6, t + 1);
      const pipX = -1.2 + 0.8 * bump(2.9, 4.1);
      const pip = pw43lFoe(v, cam, 0, pipX + Math.sin(t * 2.2) * 0.12 * walk, 7.4, { face: 1, mood: t > 4.9 ? 'joy' : (t > 1.2 && t < 2.3) || (t > 4 && t < 4.6) ? 'grit' : t > 3.1 && t < 3.7 ? 'wow' : 'happy' });
      pw43lCrate(v, cam, 2.6, 6.2, 1, 0.95, 0.9, 'PLANET'); pw43lCrate(v, cam, 2.7, 6.25, 0.8, 0.55, 0.8, '');
      pw43lPillar(v, cam, -0.15, 5.6, 0.42);
      // Bo fires straight at Pip; Pip has stepped behind the pillar, so it splashes there
      const mir = cam.p(1.7, 0.34, 4.8);
      pw43lMirror(v, cam, 1.58, 5.28, 1.82, 4.32, t, flashMir);
      pw43lBags(v, cam, 0.5, 1.5, 3.7);
      const kick = t > 3.1 && t < 3.3 ? 1 - seg(t, 3.1, 3.3) : 0;
      const mz = pw43lHand(v, cam, 1, { sway: Math.sin(t * 7 + 1) * 1.2 * walk, recoil: kick, flash: kick, low: tagged ? 1 - tagged * 0.6 : 0, glow: t > 2.95 && t < 3.15 ? 1 : 0 });
      const hit = cam.p(-0.12, 0.38, 5.2);
      if (t > 3.1 && t < 3.6) pw43lBeam(v, [mz, { x: hit.x, y: hit.y, w: hit.k * 0.05 }], (t - 3.1) * 900, PW43L.blue);
      if (t > 3.25 && t < 3.9) { const k = seg(t, 3.25, 3.9); c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(74,168,255,${1 - k})`; v.circle(hit.x, hit.y, 3 + k * 9); c.fill(); c.restore(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; c.fillStyle = '#cfe6ff'; v.circle(hit.x + Math.cos(a) * k * 16, hit.y + Math.sin(a) * k * 10 + k * k * 6, 1 - k * 0.7); c.fill(); } }
      // Pip's aim and beam, seen coming: from Pip's blaster to the mirror, then at Bo (passing under the view)
      const near = cam.p(0.15, 0.34, cam.p(0, 0, 0).k ? 0.7 + t * 0.12 * walk : 0.7);
      const path = [{ x: pip.x, y: pip.y, w: pip.k * 0.05 }, { x: mir.x, y: mir.y, w: mir.k * 0.05 }, { x: near.x, y: near.y, w: 12 }];
      if (t > 1.2 && t < 2.2) pw43lAim(v, path, seg(t, 1.25, 1.85), PW43L.orange);
      if (t > 4.0 && t < 4.5) pw43lAim(v, path, seg(t, 4.05, 4.35), PW43L.orange);
      if (t > 2.2 && t < 2.95) pw43lBeam(v, path, (t - 2.2) * 700, PW43L.orange, 160);
      if (t > 4.5 && t < 5.0) pw43lBeam(v, path, (t - 4.5) * 700, PW43L.orange, 160);
      pw43lLights(v, t, cam, 2);
      c.restore();
      // the edges: orange when tagged, then a safe shimmer (not turned with the wobble)
      c.save(); c.beginPath(); c.rect(0, y0, 320, PW43L_VH); c.clip();
      if (tagged) {
        const a = tagged < 0.3 ? 0.75 : 0.25 + 0.2 * Math.abs(Math.sin(t * 14));
        const g = c.createRadialGradient(160, y0 + 44, 60, 160, y0 + 44, 190); g.addColorStop(0, 'rgba(255,154,58,0)'); g.addColorStop(1, tagged < 0.3 ? `rgba(255,154,58,${a})` : `rgba(230,240,255,${a})`);
        c.fillStyle = g; c.fillRect(0, y0, 320, PW43L_VH);
        v.label('TAGGED', 160, y0 + 30, 11, '#fff');
      }
      if (t > 1.8 && t < 2.3) v.label('JUMP!', 160, y0 + 32, 12, PW43L.yellow);
      if (t > 2.45 && t < 3.0) v.label('DODGE!', 160, y0 + 30, 11, PW43L.blue);
      pw43lHud(v, cam, 1, 2, false, t, [-6 + bump(2.9, 4.1) * 3, -10]);
      c.restore();
    }

    /* ---- the line between the halves, and the round clock ---- */
    c.fillStyle = '#0a0810'; c.fillRect(0, 89, 320, 2);
    c.fillStyle = PW43L.orange; c.fillRect(0, 88.6, 320, 0.8); c.fillStyle = PW43L.blue; c.fillRect(0, 90.6, 320, 0.8);
    v.pill('R3  0:' + String(41 - Math.floor(t)).padStart(2, '0'), 160, 90, { size: 6.5, bg: 'rgba(14,12,20,0.92)', col: '#fff' });
  },
});
