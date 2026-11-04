/* Pip & Bo - Level previews for World 13 Spooky Hollow (Halloween, silly-spooky). See js/previews/preview-core.js.
   Top-level helpers are prefixed pw13. Each level's preview sits between its own BEGIN/END lines. */
'use strict';

/* ----- BEGIN 13-1 Pumpkin Patch Roll ----- */
/* ----- END 13-1 Pumpkin Patch Roll ----- */

/* ----- BEGIN 13-2 Graveyard Bone Hunt ----- */
/* ----- END 13-2 Graveyard Bone Hunt ----- */

/* ----- BEGIN 13-3 Haunted Mansion ----- */
/* ----- END 13-3 Haunted Mansion ----- */

/* ----- BEGIN 13-4 Broomstick Race ----- */
// side-on, over the sleepy town at night: Bo zips through a glowing ring, Pip grabs a speed star; Bo bumps a friendly
// bat (Squeak!) and Pip ZOOMs past to win through the giant grinning jack-o'-lantern gate, then loops for joy
const PW13_BROOM = {
  S: 0.72, V: 140, stopT: 4.2, stopD: 0.8, gateX: 804, ringX: 278, ringY: 118, starX: 296, starY: 52, batX: 500, batY: 106,
  // flight paths: [t, x, y] in screen space (Catmull-Rom through them)
  pip: [[-0.6, 66, 64], [0, 70, 62], [0.8, 76, 58], [1.5, 86, 52], [2.2, 88, 56], [2.8, 92, 64], [3.3, 135, 76], [3.8, 175, 80],
    [4.3, 203, 78], [4.7, 240, 74], [5.0, 258, 72], [5.9, 264, 74], [6.6, 266, 74]],
  bo: [[-0.6, 96, 118], [0, 104, 118], [0.5, 118, 120], [1.0, 138, 118], [1.6, 165, 114], [2.2, 178, 108], [2.6, 162, 114],
    [3.0, 136, 122], [3.6, 128, 120], [4.2, 146, 116], [4.8, 164, 112], [5.3, 222, 116], [5.9, 236, 120], [6.6, 238, 120]],
};
// how far the camera has flown at time t (it eases to a stop at the finish)
function pw13BroomCam(t) {
  const P = PW13_BROOM;
  if (t < P.stopT) return P.V * t;
  const d = Math.min(t - P.stopT, P.stopD);
  return P.V * P.stopT + P.V * d - P.V * d * d / (2 * P.stopD);
}
function pw13BroomPath(keys, t) {
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const p0 = keys[Math.max(0, i - 1)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(keys.length - 1, i + 2)];
  const u = Math.max(0, Math.min(1, (t - p1[0]) / (p2[0] - p1[0]))), u2 = u * u, u3 = u2 * u;
  const cr = j => 0.5 * (2 * p1[j] + (p2[j] - p0[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * u3);
  return [cr(1), cr(2)];
}
function pw13BroomStar(v, x, y, r, col, rot = 0) {
  const ctx = v.ctx;
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + rot + i * Math.PI / 5, q = i % 2 ? r * 0.48 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  ctx.closePath(); ctx.fill();
}
// the night sky, the sleepy harvest moon, far hills and houses, then the near rooftops (scrolled by cam)
function pw13BroomTown(v, t, cam) {
  const ctx = v.ctx, W = v.W, H = v.H;
  // the sky only down to the lowest hill (everything below is covered by hills and houses)
  const g = ctx.createLinearGradient(0, 0, 0, 136);
  g.addColorStop(0, '#1d1640'); g.addColorStop(0.55, '#3b2766'); g.addColorStop(1, '#8a4a78');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 136);
  // twinkly stars, in three groups that twinkle in turn (one path each)
  for (let q = 0; q < 3; q++) {
    ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(t * (1 + q * 0.4) + q * 2));
    ctx.fillStyle = '#fff6dc'; ctx.beginPath();
    for (let i = q; i < 21; i += 3) { const sx = (i * 61.3 + 13) % W, sy = 6 + (i * 37) % 92, r = i % 2 ? 0.8 : 1.2; ctx.moveTo(sx + r, sy); ctx.arc(sx, sy, r, 0, Math.PI * 2); }
    ctx.fill();
    pw13BroomStar(v, (q * 117 + 40) % W, 14 + q * 27, 2.6, '#ffd77a');
  }
  ctx.globalAlpha = 1;
  // the moon, with a sleepy smile
  const mx = 38, my = 32;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  v.fillCircle(mx, my, 50, 'rgba(120,60,30,0.18)'); v.fillCircle(mx, my, 38, 'rgba(120,60,30,0.22)');
  ctx.restore();
  v.fillCircle(mx, my, 25, '#ffb45e'); v.fillCircle(mx - 5, my - 6, 18, '#ffc57a');
  ctx.fillStyle = 'rgba(214,120,58,0.35)'; ctx.beginPath(); ctx.arc(mx - 12, my + 9, 4, 0, Math.PI * 2); ctx.moveTo(mx + 16.2, my - 9); ctx.arc(mx + 13, my - 9, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(150,70,40,0.6)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath();
  ctx.arc(mx - 7, my - 1, 3.2, 0.25, Math.PI - 0.25); ctx.moveTo(mx + 7 + Math.cos(0.25) * 3.2, my - 1 + Math.sin(0.25) * 3.2);
  ctx.arc(mx + 7, my - 1, 3.2, 0.25, Math.PI - 0.25); ctx.moveTo(mx + Math.cos(0.4) * 5, my + 5 + Math.sin(0.4) * 5);
  ctx.arc(mx, my + 5, 5, 0.4, Math.PI - 0.4); ctx.stroke();
  // far hills and a row of far houses (one path for the houses, one for their windows)
  const off = cam * 0.15;
  ctx.fillStyle = '#4a3070'; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, 122 + Math.sin((x + off) * 0.018 + 1.2) * 9 + Math.sin((x + off) * 0.05) * 3);
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  const off2 = cam * 0.4, RW = 44, wins = [];
  ctx.fillStyle = '#2f2050'; ctx.beginPath();
  for (let i = -1; i < W / RW + 2; i++) {
    const k = Math.floor(off2 / RW) + i, x = k * RW - off2, h = 20 + v.rand(k * 3 + 1) * 18, w = 28 + v.rand(k * 3 + 2) * 12;
    ctx.rect(x, 160 - h, w, h + 20);
    ctx.moveTo(x - 3, 161 - h); ctx.lineTo(x + w / 2, 150 - h - v.rand(k * 3 + 3) * 8); ctx.lineTo(x + w + 3, 161 - h); ctx.closePath();
    if (v.rand(k * 7 + 5) > 0.4) wins.push(x + w / 2 - 2, 166 - h);
  }
  ctx.fill();
  ctx.fillStyle = 'rgba(255,215,122,0.55)'; ctx.beginPath();
  for (let i = 0; i < wins.length; i += 2) ctx.rect(wins[i], wins[i + 1], 4, 5);
  ctx.fill();
  // near houses: coloured walls, dark peaked roofs, warm lit windows, the odd chimney (batched into a few paths)
  const walls = ['#5a4a7a', '#4d6878', '#6a4a62', '#47587a', '#735570'], roofs = ['#2e2244', '#3b2a3e', '#283048', '#3a2850'];
  const HW = 68, hs = [];
  for (let i = -1; i < W / HW + 2; i++) {
    const k = Math.floor(cam / HW) + i, x = k * HW - cam + 4, w = 50 + v.rand(k * 5 + 1) * 12, top = 146 + v.rand(k * 5 + 2) * 12;
    hs.push({ k, x, w, top, peak: top - 16 - v.rand(k * 5 + 3) * 12 });
    ctx.fillStyle = walls[((k % 5) + 5) % 5]; ctx.fillRect(x, top, w, H - top);
  }
  const path = (col, f) => { ctx.fillStyle = col; ctx.beginPath(); for (const h of hs) f(h); ctx.fill(); };
  path('rgba(20,10,40,0.25)', h => ctx.rect(h.x + h.w - 4, h.top, 4, H - h.top));
  const win = lit => h => { for (const wx of [h.x + 9, h.x + h.w - 19]) if ((v.rand(h.k * 11 + wx - h.x) > 0.25) === lit) ctx.rect(wx, h.top + 6, 10, 11); };
  path('#ffd77a', win(true)); path('#3a3050', win(false));
  ctx.strokeStyle = 'rgba(30,20,50,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath();
  for (const h of hs) for (const wx of [h.x + 9, h.x + h.w - 19]) { ctx.moveTo(wx + 5, h.top + 6); ctx.lineTo(wx + 5, h.top + 17); ctx.moveTo(wx, h.top + 11.5); ctx.lineTo(wx + 10, h.top + 11.5); }
  ctx.stroke();
  for (let r = 0; r < 4; r++) path(roofs[r], h => { if (((h.k % 4) + 4) % 4 === r) { ctx.moveTo(h.x - 5, h.top + 1); ctx.lineTo(h.x + h.w / 2, h.peak); ctx.lineTo(h.x + h.w + 5, h.top + 1); ctx.closePath(); } });
  ctx.strokeStyle = 'rgba(255,200,140,0.28)'; ctx.beginPath();
  for (const h of hs) { ctx.moveTo(h.x - 5, h.top + 1); ctx.lineTo(h.x + h.w / 2, h.peak); }
  ctx.stroke();
  const chim = h => v.rand(h.k * 5 + 4) > 0.55;
  path('#7a4a5a', h => { if (chim(h)) ctx.rect(h.x + h.w * 0.7, h.peak + 2, 6, h.top - h.peak - 2); });
  path('#5a3444', h => { if (chim(h)) ctx.rect(h.x + h.w * 0.7 - 1.5, h.peak + 1, 9, 3); });
  ctx.fillStyle = '#241838'; ctx.fillRect(0, 174, W, H - 174);
  ctx.fillStyle = '#33244a'; ctx.fillRect(0, 174, W, 2);
}
// a glowing ring seen from the side; front: the near half (drawn over the riders); flash: Bo's colour after a clean pass
function pw13BroomRing(v, x, y, front, flash) {
  const ctx = v.ctx, rx = 8, ry = 25, a0 = front ? Math.PI / 2 : -Math.PI / 2, a1 = front ? Math.PI * 1.5 : Math.PI / 2;
  ctx.lineCap = 'round';
  for (const [col, lw] of [['rgba(255,179,71,0.3)', 9], ['rgba(60,20,50,0.6)', 6], [flash > 0 ? v.c.bo : '#ffb347', 4], ['#fff0c0', 1.4]]) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, a0, a1); ctx.stroke();
  }
  ctx.lineCap = 'butt';
}
// a friendly purple bat; hit 0..1 tumbles it
function pw13BroomBat(v, x, y, t, s, hit) {
  const ctx = v.ctx, f = Math.sin(t * (hit > 0 ? 26 : 15));
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (hit > 0) ctx.rotate(hit * Math.PI * 3);
  ctx.fillStyle = '#5b3f8c';
  for (const sd of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(sd * 7, -3); ctx.lineTo(sd * 25, -10 - f * 9); ctx.lineTo(sd * 22, 1 - f * 4);
    ctx.quadraticCurveTo(sd * 18, -1 - f * 3, sd * 15, 4 - f * 2); ctx.quadraticCurveTo(sd * 11, 1, sd * 7, 5); ctx.closePath(); ctx.fill();
  }
  v.fillCircle(0, 0, 10.5, '#6b4c9a');
  ctx.fillStyle = '#8a6ab8'; ctx.beginPath(); ctx.ellipse(0, 4, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6b4c9a'; ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(-6, -15); ctx.lineTo(-2, -8); ctx.moveTo(8, -5); ctx.lineTo(6, -15); ctx.lineTo(2, -8); ctx.fill();
  ctx.fillStyle = 'rgba(255,140,190,0.6)'; v.circle(-6, 2, 2); ctx.fill(); v.circle(6, 2, 2); ctx.fill();
  ctx.strokeStyle = v.c.ink; ctx.fillStyle = v.c.ink; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  if (hit > 0) for (const ex of [-3.5, 3.5]) { ctx.beginPath(); ctx.moveTo(ex - 2, -4); ctx.lineTo(ex + 1, -2); ctx.lineTo(ex - 2, 0); ctx.stroke(); }
  else for (const ex of [-3.5, 3.5]) { v.fillCircle(ex, -2, 3, '#fff'); v.fillCircle(ex - 0.8, -1.6, 1.5, v.c.ink); }
  ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 3, 2.5, 0.3, Math.PI - 0.3); ctx.stroke();
  ctx.restore();
}
// the big gold speed star with a face, glowing
function pw13BroomPickup(v, x, y, t) {
  const ctx = v.ctx;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; v.fillCircle(x, y, 17 + Math.sin(t * 5) * 1.5, 'rgba(160,110,30,0.4)'); v.fillCircle(x, y, 13, 'rgba(160,110,30,0.4)'); ctx.restore();
  pw13BroomStar(v, x, y + 1, 11, v.c.goldDark, Math.sin(t * 2) * 0.2); pw13BroomStar(v, x, y, 10.5, v.c.gold, Math.sin(t * 2) * 0.2);
  v.fillCircle(x - 3, y - 1, 1.2, v.c.ink); v.fillCircle(x + 3, y - 1, 1.2, v.c.ink);
  ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(x, y + 1.2, 2.6, 0.3, Math.PI - 0.3); ctx.stroke();
}
// Pip or Bo on a witch broom, middle at (x, y). o: rot, mood, zoom 0..1, burst 0..1, star, flap
function pw13BroomRider(v, id, x, y, t, o = {}) {
  const ctx = v.ctx, S = PW13_BROOM.S, col = id ? v.c.bo : v.c.pip, dk = id ? v.c.boDark : v.c.pipDark;
  ctx.save(); ctx.translate(x, y);
  const z = o.zoom || 0, b = o.burst || 0;
  if (z > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(200,140,40,' + (0.55 * z) + ')'; ctx.beginPath(); ctx.ellipse(-8, -6, 40 * z, 26 * z, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(200,140,40,' + (0.35 * z) + ')'; ctx.beginPath(); ctx.ellipse(-6, -6, 30 * z, 19 * z, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  if (z > 0 || b > 0) {
    ctx.save(); ctx.globalAlpha *= Math.max(z, b); ctx.strokeStyle = z > 0 ? '#fff0b4' : '#ffffff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (const [oy, q] of [[-18, 1], [-5, 2], [8, 3]]) { const L = 18 + v.rand(Math.floor(t * 24) * 3 + q) * 22; ctx.beginPath(); ctx.moveTo(-50, oy); ctx.lineTo(-50 - L, oy); ctx.stroke(); }
    ctx.restore();
  }
  ctx.rotate(o.rot || 0); ctx.scale(S, S);
  const sw = Math.sin(t * 11 + id) * 4;
  // the scarf, fluttering behind
  ctx.fillStyle = dk; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.quadraticCurveTo(-20, -10 + sw, -34, -6 + sw * 1.4); ctx.lineTo(-32, sw * 1.4); ctx.quadraticCurveTo(-20, -3 + sw, -6, 0); ctx.closePath(); ctx.fill();
  // the broom: stick, straw bristles, a band in the rider's colour
  ctx.strokeStyle = '#8a5833'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-32, 9); ctx.lineTo(30, 5); ctx.stroke();
  ctx.fillStyle = '#e8c36a'; ctx.beginPath(); ctx.moveTo(-31, 5); ctx.lineTo(-58, -3 + sw * 0.3); ctx.lineTo(-61, 10); ctx.lineTo(-58, 22 - sw * 0.3); ctx.lineTo(-31, 13); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#b08a3a'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-33, 7 + i * 2); ctx.lineTo(-57, 1 + i * 6); ctx.stroke(); }
  ctx.fillStyle = col; ctx.fillRect(-35, 3.5, 6, 11);
  // the rider, sitting on the stick, then a hand on it
  v.hero(id, 0, 7, { face: 1, mood: o.mood || 'happy', shadow: false });
  ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 2; v.circle(13, 5, 3.8); ctx.fill(); ctx.stroke();
  // the witch hat: a wide brim and a floppy cone bent back by the wind (Pip's sprout pops out of the tip)
  const flop = 4 + Math.sin(t * 7 + id) * 1.5 + z * 3;
  ctx.fillStyle = '#241a44'; ctx.beginPath(); ctx.ellipse(1, -17, 16, 4.2, -0.05, 0, Math.PI * 2); ctx.fill();
  // a step lighter than the level's #3a2a66, plus a moonlit rim, so the cone still reads against the night sky at card size
  ctx.fillStyle = '#4a3884'; ctx.beginPath(); ctx.moveTo(-8, -18); ctx.quadraticCurveTo(-4, -31, -6 - flop, -42);
  ctx.quadraticCurveTo(-2 - flop * 0.6, -37, 4 - flop * 1.6, -39 + flop * 0.4); ctx.quadraticCurveTo(4, -29, 10, -18); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,200,140,0.55)'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.fillStyle = col; ctx.fillRect(-8.5, -22, 18.5, 4);
  ctx.fillStyle = v.c.gold; ctx.fillRect(-1.5, -22.5, 5, 5); ctx.fillStyle = '#3a2a66'; ctx.fillRect(0, -21, 2, 2);
  if (id === 0) {
    ctx.strokeStyle = '#3f9a5e'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-6 - flop, -41); ctx.lineTo(-5 - flop, -45); ctx.stroke();
    ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(-6 - flop + 2.5, -46, 5.5, 2.6, -0.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  if (o.star) { const sy = y - 38 + Math.sin(t * 5) * 2; pw13BroomStar(v, x + 18, sy + 0.8, 7.5, v.c.goldDark, t * 2); pw13BroomStar(v, x + 18, sy, 6.8, v.c.gold, t * 2); }
}
// the giant jack-o'-lantern gate on the rooftops, with the checkered finish line in front; flash 0..1 lights it up
function pw13BroomGate(v, gx, t, flash, front) {
  const ctx = v.ctx, s = 0.3, cy = 132, RY = 186;
  if (gx < -90 || gx > v.W + 90) return;
  if (front) { // the FINISH banner at the top of the line, swinging a little
    ctx.save(); ctx.translate(gx, 14); ctx.rotate(Math.sin(t * 2) * 0.05);
    ctx.fillStyle = 'rgba(28,26,54,0.92)'; v.rr(-28, -9, 56, 18, 7); ctx.fill(); ctx.strokeStyle = v.c.gold; ctx.lineWidth = 2; v.rr(-28, -9, 56, 18, 7); ctx.stroke();
    v.text('FINISH', 0, 0.5, 12, flash > 0 ? '#fff' : v.c.gold);
    ctx.restore();
    return;
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  v.fillCircle(gx, cy, 90, 'rgba(120,60,20,' + (0.14 + 0.2 * flash) + ')'); v.fillCircle(gx, cy, 74, 'rgba(120,60,20,' + (0.16 + 0.3 * flash) + ')');
  ctx.restore();
  ctx.save(); ctx.translate(gx, cy); ctx.scale(s, s);
  for (const [ox, rx, col] of [[-118, 92, '#c95a12'], [118, 92, '#c95a12'], [-62, 104, '#f07a22'], [62, 104, '#f07a22'], [0, 108, '#ff8a2a']]) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(ox, 0, rx, RY * (1 - Math.abs(ox) / 1100), 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.beginPath(); ctx.ellipse(-70, -110, 22, 50, 0.35, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5a8a3a'; ctx.beginPath(); ctx.moveTo(-12, -RY + 8); ctx.quadraticCurveTo(-10, -RY - 22, 6, -RY - 34); ctx.lineTo(16, -RY - 26); ctx.quadraticCurveTo(6, -RY - 14, 12, -RY + 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6fb04a'; ctx.beginPath(); ctx.ellipse(40, -RY - 8, 26, 11, 0.35, 0, Math.PI * 2); ctx.fill();
  const lit = flash > 0 ? '#fffbe0' : '#ffe28a', deep = flash > 0 ? '#ffd24a' : '#ffb347';
  for (const sd of [-1, 1]) {
    const ex = sd * 72, ey = -62;
    ctx.fillStyle = deep; ctx.beginPath(); ctx.ellipse(ex, ey, 34, 30, 0, Math.PI, 0); ctx.ellipse(ex, ey + 4, 30, 14, 0, 0, Math.PI, true); ctx.closePath(); ctx.fill();
    ctx.fillStyle = lit; ctx.beginPath(); ctx.ellipse(ex, ey + 2, 24, 20, 0, Math.PI, 0); ctx.ellipse(ex, ey + 5, 22, 9, 0, 0, Math.PI, true); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = deep; ctx.beginPath(); ctx.moveTo(-14, -8); ctx.lineTo(0, -30); ctx.lineTo(14, -8); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-120, 18); ctx.quadraticCurveTo(0, 150, 120, 18); ctx.quadraticCurveTo(0, 70, -120, 18); ctx.closePath(); ctx.fill();
  ctx.fillStyle = lit; ctx.beginPath(); ctx.moveTo(-104, 30); ctx.quadraticCurveTo(0, 132, 104, 30); ctx.quadraticCurveTo(0, 80, -104, 30); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff8a2a'; v.rr(-34, 66, 22, 20, 4); ctx.fill(); v.rr(12, 66, 22, 20, 4); ctx.fill();
  ctx.fillStyle = 'rgba(255,120,120,0.35)'; v.circle(-132, -4, 18); ctx.fill(); v.circle(132, -4, 18); ctx.fill();
  ctx.restore();
  // the checkered finish line, from the banner down to the pumpkin's chin
  const top = 20, bot = cy + 40;
  ctx.fillStyle = 'rgba(28,26,54,0.35)'; ctx.fillRect(gx - 4.5, top, 9, bot - top);
  for (let yy = top, k = 0; yy < bot; yy += 6, k++) for (let j = 0; j < 2; j++) {
    ctx.fillStyle = (k + j) % 2 ? 'rgba(255,255,255,0.92)' : 'rgba(28,26,54,0.9)'; ctx.fillRect(gx - 4 + j * 4, yy, 4, Math.min(6, bot - yy));
  }
}
definePreview('Broomstick Race', {
  blurb: 'Race witch brooms through glowing rings, grab a star and ZOOM to the pumpkin!',
  loop: 6.4, still: 3.7,
  draw(v, t) {
    // a cartoon iris: it closes on the winner at the end and opens on the start line, so the loop has no seam
    this.scene(v, t);
    const close = v.seg(t, 5.9, 6.4), open = v.seg(t, 0, 0.45);
    let r = -1, cx = 90, cy = 88;
    if (close > 0) { r = 340 * (1 - v.ease.inOut(close)); [cx, cy] = pw13BroomPath(PW13_BROOM.pip, t); cy -= 8; }
    else if (open < 1) r = 340 * v.ease.inOut(open);
    if (r < 0) return;
    const ctx = v.ctx;
    ctx.fillStyle = '#120c26'; ctx.beginPath(); ctx.rect(0, 0, v.W, v.H); ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, Math.PI * 2, true); ctx.fill();
    if (r > 1) { ctx.strokeStyle = '#ff8a2a'; ctx.lineWidth = 3; v.circle(cx, cy, r); ctx.stroke(); }
  },
  scene(v, t) {
    const P = PW13_BROOM, ctx = v.ctx, cam = pw13BroomCam(t), gx = P.gateX - cam;
    const pipX = 4.3, boX = 4.8; // when each one crosses the finish line
    const flash = Math.max(v.seg(t, pipX, pipX + 0.6) > 0 ? 1 - v.seg(t, pipX, pipX + 0.6) : 0, v.seg(t, boX, boX + 0.5) > 0 ? 0.6 * (1 - v.seg(t, boX, boX + 0.5)) : 0);
    pw13BroomTown(v, t, cam);
    pw13BroomGate(v, gx, t, flash, false);
    // where everyone is
    const pos = id => pw13BroomPath(id ? P.bo : P.pip, t), [px0, py0] = pos(0), [bx0, by0] = pos(1);
    const tilt = id => { const [, y1] = pw13BroomPath(id ? P.bo : P.pip, t - 0.05), [, y2] = pw13BroomPath(id ? P.bo : P.pip, t + 0.05); return v.clamp((y2 - y1) * 0.04, -0.35, 0.35); };
    const bob = id => Math.sin(t * 4.2 + id * 1.7) * 2;
    // the ring (Bo flies through it at t = 1.0)
    const rx = P.ringX - cam, ringFlash = t > 1.0 && t < 1.6 ? 1 : 0;
    if (rx > -20) pw13BroomRing(v, rx, P.ringY, false, ringFlash);
    // the speed star (Pip grabs it at t = 1.5)
    const sx = P.starX - cam, sy = P.starY + Math.sin(t * 2.4) * 3;
    if (t < 1.5) pw13BroomPickup(v, sx, sy, t);
    v.sparkle(px0 + 6, py0 - 8, v.seg(t, 1.5, 1.9), '#ffe28a', 12);
    // the friendly bat: Bo bumps it at t = 2.2 and it tumbles away
    const hitT = 2.2, bh = v.seg(t, hitT, hitT + 1.1);
    let batx = P.batX - cam, baty = P.batY + Math.sin(t * 3) * 4;
    if (t > hitT) { const d = t - hitT, hx = P.batX - pw13BroomCam(hitT), hy = P.batY + Math.sin(hitT * 3) * 4; batx = hx + 60 * d; baty = hy - 70 * d + 30 * d * d; }
    if (batx < v.W + 30 && bh < 1) pw13BroomBat(v, batx, baty, t, 0.72, bh);
    // Bo: a burst from the ring, then the bump: a spin and dizzy eyes, then back on course
    const spin = v.seg(t, hitT, hitT + 0.7), dizzy = t > hitT && t < hitT + 1.0;
    const boMood = t > boX + 0.2 ? 'joy' : dizzy ? 'dizzy' : 'happy';
    pw13BroomRider(v, 1, bx0, by0 + bob(1), t, { rot: tilt(1) + v.ease.out(spin) * Math.PI * 2, mood: boMood, burst: v.seg(t, 1.0, 1.1) * (1 - v.seg(t, 1.4, 1.7)) });
    // Pip: holds the star, then ZOOM (gold aura) past Bo to win, and a loop-de-loop for joy
    const zoom = v.seg(t, 2.8, 2.95) * (1 - v.seg(t, 3.9, 4.4));
    let px = px0, py = py0 + bob(0), prot = tilt(0);
    const lk = v.ease.inOut(v.seg(t, 4.9, 5.6));
    if (lk > 0 && lk < 1) { const a = lk * Math.PI * 2, R = 13; px += Math.sin(a) * R; py -= (1 - Math.cos(a)) * R; prot -= a; }
    const pipMood = t > pipX ? 'joy' : zoom > 0.2 ? 'grit' : 'happy';
    pw13BroomRider(v, 0, px, py, t, { rot: prot, mood: pipMood, zoom, star: t > 1.5 && t < 2.8 });
    if (rx > -20) pw13BroomRing(v, rx, P.ringY, true, ringFlash);
    v.sparkle(px0 + 18, py0 - 32, v.seg(t, 2.8, 3.2), '#ffe28a', 14);
    pw13BroomGate(v, gx, t, flash, true);
    // words
    const pop = (str, x, y, a, b, col, size = 15) => {
      const k = v.seg(t, a, b);
      if (k <= 0 || k >= 1) return;
      ctx.save(); ctx.globalAlpha *= 1 - v.seg(k, 0.75, 1);
      v.label(str, x, y - k * 8, size * (0.7 + 0.3 * v.ease.back(v.seg(k, 0, 0.25))), col);
      ctx.restore();
    };
    pop('Whoosh!', 150, 150, 1.0, 1.8, '#ffe0a0');
    pop('Squeak!', 196, 84, hitT, hitT + 0.9, '#d9c4ff');
    pop('ZOOM!', 110, 34, 2.8, 3.7, v.c.gold, 18);
    if (t > pipX) {
      const k = v.seg(t, pipX, pipX + 0.3);
      v.confetti(gx, 60, v.seg(t, pipX, pipX + 1.3), 22);
      v.pill('Pip wins!', 252, 20, { size: 13 * v.ease.back(k) + 0.01, bg: v.c.pip, body: false });
    }
  },
});
/* ----- END 13-4 Broomstick Race ----- */

