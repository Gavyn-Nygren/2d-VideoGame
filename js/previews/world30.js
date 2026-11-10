/* Pip & Bo - World page previews: World 30 Time Chase (30-1 The Time Thief). See js/previews/preview-core.js. */
'use strict';

/* 30-1 The Time Thief: a chase through time in four quick eras. The Thief jets along on his brass time machine with a
   stolen thing in its claw, a clock-rimmed portal opens ahead, he zooms in and Pip and Bo dive in after him; a portal
   flash, and the chase is somewhere else in history:
     0.0 - 1.6  dinosaurs (the asteroid is on its way): he has the T. rex egg, Pip and Bo run after him
     1.6 - 3.2  Vikings, 1000 AD: he has the sunstone, Pip and Bo ride a longship through the waves
     3.2 - 4.8  Leonardo, 1490s: he has the plans, Pip and Bo flap Leonardo's flying machine over the rooftops
     4.8 - 7.2  the Moon, 1969: Bo bounces off Pip's head, grabs the Moon flag out of the claw and plants it;
                the time machine sputters down and the Thief sulks ("Hmph!")
   Every helper starts with pw30. The Thief, the portal and the loot are small copies of tthDrawThief, tthDrawPortal
   and tthDrawLoot in js/levels/world30/time-thief.js (those paint the game canvas, so these draw on v.ctx). */
const pw30C = { coat: '#5b3a9e', coatDk: '#3d2573', coatLt: '#7b56c4', skin: '#f3d9b8', skinDk: '#d9b48c', brass: '#d9a441', brassDk: '#9a6f22',
  brassLt: '#f6d37a', glass: '#8fe3e0', cream: '#fff4d6', flame: '#7fe9ff', nozzle: '#4a4466' };
const PW30_P = Math.PI * 2, PW30_PX = 290, PW30_PY = 90;   // where the portal opens
const PW30_ERAS = [
  { t0: 0, len: 1.6, loot: 'egg', when: '66 million years ago', ty: 110 },
  { t0: 1.6, len: 1.6, loot: 'sunstone', when: 'Vikings, 1000 AD', ty: 92 },
  { t0: 3.2, len: 1.6, loot: 'plans', when: 'Leonardo, 1490s', ty: 86 },
  { t0: 4.8, len: 2.4, loot: 'flag', when: 'The Moon, 1969', ty: 92 },
];
const pw30Wrap = (x, span) => ((x % span) + span) % span;

function pw30Grad(v, top, bot, y0, y1) {
  const g = v.ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, top); g.addColorStop(1, bot);
  v.ctx.fillStyle = g; v.ctx.fillRect(0, y0, v.W, y1 - y0);
}
// a clock face with two hands
function pw30Clock(v, x, y, r, t, speed, fill, lw) {
  const ctx = v.ctx;
  ctx.fillStyle = fill || pw30C.cream; ctx.strokeStyle = v.c.ink; ctx.lineWidth = lw || Math.max(1, r * 0.16);
  v.circle(x, y, r); ctx.fill(); ctx.stroke();
  const a1 = t * speed - Math.PI / 2, a2 = t * speed / 12 + 1;
  ctx.lineCap = 'round'; ctx.lineWidth = Math.max(0.8, r * 0.16); ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a1) * r * 0.7, y + Math.sin(a1) * r * 0.7);
  ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a2) * r * 0.45, y + Math.sin(a2) * r * 0.45); ctx.stroke();
}
// a time portal: a violet-and-teal swirl in a brass clock rim (open 0..1)
function pw30Portal(v, x, y, r, t, open) {
  if (open <= 0) return;
  const ctx = v.ctx, e = 1 - (1 - open) * (1 - open);
  ctx.save(); ctx.translate(x, y); ctx.scale(0.74 * e, e);
  ctx.fillStyle = 'rgba(178,141,255,0.22)'; v.circle(0, 0, r * 1.3); ctx.fill(); v.circle(0, 0, r * 1.15); ctx.fill();
  const g2 = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
  g2.addColorStop(0, '#fff7d6'); g2.addColorStop(0.25, '#7fe9ff'); g2.addColorStop(0.6, '#b28dff'); g2.addColorStop(1, '#2a1a5e');
  ctx.fillStyle = g2; v.circle(0, 0, r); ctx.fill();
  ctx.lineCap = 'round';
  for (let a = 0; a < 3; a++) {
    ctx.strokeStyle = a === 1 ? 'rgba(255,255,255,0.8)' : 'rgba(42,26,94,0.55)'; ctx.lineWidth = r * 0.08; ctx.beginPath();
    for (let q = 0; q <= 16; q++) { const u = q / 16, ang = t * 4 + a * 2.094 + u * 4.4, rad = r * (0.08 + 0.86 * u); ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad); }
    ctx.stroke();
  }
  ctx.strokeStyle = pw30C.brassDk; ctx.lineWidth = r * 0.15; v.circle(0, 0, r); ctx.stroke();
  ctx.strokeStyle = pw30C.brassLt; ctx.lineWidth = r * 0.06; v.circle(0, 0, r * 1.02); ctx.stroke();
  ctx.strokeStyle = pw30C.cream; ctx.lineWidth = 1.6;
  for (let n = 0; n < 12; n++) { const a = n * Math.PI / 6 - t * 0.5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.94, Math.sin(a) * r * 0.94); ctx.lineTo(Math.cos(a) * r * 1.08, Math.sin(a) * r * 1.08); ctx.stroke(); }
  ctx.restore();
}
// a stolen thing, centre (x, y); s = 1 is about 36 px
function pw30Loot(v, kind, x, y, s, t) {
  const ctx = v.ctx, ink = v.c.ink;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = ink; ctx.lineWidth = 2.4;
  if (kind === 'egg') {
    ctx.rotate(Math.sin(t * 3) * 0.1);
    ctx.fillStyle = '#f6efd8'; ctx.beginPath(); ctx.moveTo(0, -17); ctx.bezierCurveTo(11, -17, 14, 2, 13, 6); ctx.bezierCurveTo(12, 17, -12, 17, -13, 6); ctx.bezierCurveTo(-14, 2, -11, -17, 0, -17); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8fbf6a'; for (const [ex, ey, er] of [[-5, -4, 3], [5, 3, 3.5], [-3, 9, 2.5], [3, -9, 2]]) { v.circle(ex, ey, er); ctx.fill(); }
  } else if (kind === 'sunstone') {
    ctx.fillStyle = '#7fd6ff'; ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(11, -6); ctx.lineTo(8, 12); ctx.lineTo(-2, 17); ctx.lineTo(-11, 8); ctx.lineTo(-9, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d6f4ff'; ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(-9, -8); ctx.lineTo(-1, -2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(28,26,54,0.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-1, -2); ctx.lineTo(11, -6); ctx.moveTo(-1, -2); ctx.lineTo(-2, 17); ctx.moveTo(-1, -2); ctx.lineTo(-11, 8); ctx.stroke();
    v.star(8, -13, 5 + Math.sin(t * 9) * 2, '#fff', t);
  } else if (kind === 'plans') {
    ctx.rotate(-0.12);
    ctx.fillStyle = '#f0deb0'; ctx.fillRect(-14, -11, 28, 22); ctx.strokeRect(-14, -11, 28, 22);
    ctx.fillStyle = '#d9c08a'; for (const sx of [-14, 14]) { ctx.beginPath(); ctx.ellipse(sx, 0, 3, 11, 0, 0, PW30_P); ctx.fill(); ctx.stroke(); }
    ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -2); ctx.quadraticCurveTo(-6, -9, -10, -3); ctx.moveTo(0, -2); ctx.quadraticCurveTo(6, -9, 10, -3); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.moveTo(-7, 7); ctx.lineTo(7, 7); ctx.stroke();
  } else {   // the Moon flag
    ctx.strokeStyle = '#d9dbe8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-10, 17); ctx.lineTo(-10, -17); ctx.stroke();
    ctx.strokeStyle = ink; ctx.lineWidth = 1.8;
    const wv = Math.sin(t * 4) * 1.5;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-10, -16); ctx.quadraticCurveTo(0, -18 + wv, 14, -15); ctx.lineTo(14, 0); ctx.quadraticCurveTo(0, -2 + wv, -10, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff5f6d'; for (const sy of [-12, -6]) ctx.fillRect(-1, sy + wv * 0.3, 14, 2.6);
    ctx.fillStyle = '#4a6fd6'; ctx.fillRect(-9, -15, 9, 8);
  }
  ctx.restore();
}
/* The Thief on his time machine, the pod's underside at (x, y). o: t, pose ('grin' 'laugh' 'shock' 'sulk'), flame
   (0..1.6), claw (0..1), bob, tilt, alpha. Returns where the claw holds its loot. */
function pw30Thief(v, x, y, s, face, o) {
  const ctx = v.ctx, t = o.t, pose = o.pose || 'grin', ink = v.c.ink, P = pw30C;
  const bob = o.bob == null ? Math.sin(t * 3) * 4 : o.bob, cl = 12 + (o.claw || 0) * 46, fl = o.flame == null ? 1 : o.flame;
  let lean = 0.1, armF = 1.6, armB = -0.3, hat = 0, mouth = 'grin';
  if (pose === 'laugh') { lean = -0.1; armF = 2.4 + Math.sin(t * 14) * 0.3; armB = -0.9; mouth = 'open'; }
  else if (pose === 'shock') { lean = -0.16; armF = 2.6; armB = -2.6; hat = 9 + Math.sin(t * 20) * 2; mouth = 'open'; }
  else if (pose === 'sulk') { lean = 0.1; armF = 0.95; armB = 0.6; hat = -1; mouth = 'frown'; }
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.translate(x, y); ctx.scale(s * face, s); ctx.translate(0, bob); ctx.rotate(o.tilt || 0);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // the jet flame and nozzle, the tail fin and the blinking antenna
  if (fl > 0.05) {
    const len = (30 + Math.sin(t * 40) * 7 + Math.sin(t * 23) * 5) * fl;
    ctx.fillStyle = P.flame; ctx.beginPath(); ctx.moveTo(-78, -48); ctx.quadraticCurveTo(-84 - len * 0.6, -36, -80 - len, -34); ctx.quadraticCurveTo(-84 - len * 0.6, -32, -78, -22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-78, -41); ctx.quadraticCurveTo(-80 - len * 0.4, -35, -79 - len * 0.55, -34.5); ctx.quadraticCurveTo(-80 - len * 0.4, -33, -78, -29); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = P.nozzle; ctx.strokeStyle = ink; ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.moveTo(-58, -48); ctx.lineTo(-80, -51); ctx.lineTo(-80, -19); ctx.lineTo(-58, -22); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = P.coatLt; ctx.beginPath(); ctx.moveTo(-50, -58); ctx.lineTo(-72, -82); ctx.lineTo(-32, -60); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-26, -60); ctx.lineTo(-32, -88); ctx.stroke();
  ctx.fillStyle = Math.sin(t * 9) > 0 ? '#ff5f6d' : '#ffd23f'; v.circle(-32, -90, 4.5); ctx.fill(); ctx.stroke();
  // the claw arm under the machine
  const cy = -12 + cl - 8, op = o.item ? 0.5 : 0.3;
  ctx.strokeStyle = P.nozzle; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(16, -12); ctx.lineTo(16, cy); ctx.stroke();
  ctx.strokeStyle = ink; ctx.lineWidth = 3.2; ctx.beginPath();
  ctx.moveTo(16, cy); ctx.quadraticCurveTo(16 - 12 * (0.6 + op), cy + 6, 16 - 7 * (0.4 + op), cy + 15);
  ctx.moveTo(16, cy); ctx.quadraticCurveTo(16 + 12 * (0.6 + op), cy + 6, 16 + 7 * (0.4 + op), cy + 15); ctx.stroke();
  // the Thief: his coat of clocks, head, goggles, moustache and top hat (his legs are inside the pod)
  ctx.save(); ctx.translate(-8, -58); ctx.rotate(lean);
  const arm = (sx, a, front) => {
    const hx = sx + Math.sin(a) * 27, hy = -80 + Math.cos(a) * 27;
    ctx.strokeStyle = ink; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(sx, -80); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.strokeStyle = front ? P.coatLt : P.coatDk; ctx.lineWidth = 7.5; ctx.beginPath(); ctx.moveTo(sx, -80); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = P.skin; ctx.strokeStyle = ink; ctx.lineWidth = 2.4; v.circle(hx, hy, 5.5); ctx.fill(); ctx.stroke();
  };
  arm(-10, armB, false);
  ctx.fillStyle = P.coat; ctx.strokeStyle = ink; ctx.lineWidth = 3.2;
  ctx.beginPath(); ctx.moveTo(-15, -87); ctx.lineTo(15, -87); ctx.lineTo(22, -16); ctx.lineTo(-26, -16); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = P.coatLt; ctx.beginPath(); ctx.moveTo(3, -86); ctx.lineTo(13, -86); ctx.lineTo(9, -60); ctx.closePath(); ctx.fill();
  for (const [kx, ky, kr, sp] of [[-6, -68, 6, 2.2], [9, -48, 5.4, -3.1], [-8, -46, 6.4, 1.4]]) pw30Clock(v, kx, ky, kr, t + kx, sp, null, 1.8);
  ctx.fillStyle = P.skin; ctx.strokeStyle = ink; ctx.lineWidth = 3.2; v.circle(2, -98, 14.5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = P.skinDk; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(13, -100); ctx.lineTo(23, -95); ctx.lineTo(13, -93); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (const ex of [-3, 8.5]) {   // brass goggles
    ctx.fillStyle = P.glass; ctx.strokeStyle = P.brassDk; ctx.lineWidth = 3; v.circle(ex, -101, 5.8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ink; v.circle(ex + 1.6, -101 + (mouth === 'frown' ? 1.8 : 0), 2.6); ctx.fill();
  }
  ctx.strokeStyle = ink; ctx.lineWidth = 3;   // the moustache, then the mouth
  ctx.beginPath(); ctx.moveTo(9, -93); ctx.quadraticCurveTo(3, -88, -3, -93); ctx.quadraticCurveTo(-7, -95, -5, -98); ctx.moveTo(9, -93); ctx.quadraticCurveTo(13, -88, 18, -92); ctx.stroke();
  ctx.lineWidth = 2.2;
  if (mouth === 'open') { ctx.fillStyle = '#7a2a3a'; ctx.beginPath(); ctx.ellipse(8, -86, 4.5, 3.6 + Math.abs(Math.sin(t * 11)) * 1.5, 0, 0, PW30_P); ctx.fill(); ctx.stroke(); }
  else { ctx.beginPath(); if (mouth === 'frown') { ctx.moveTo(3, -84.5); ctx.quadraticCurveTo(8, -89, 13, -84.5); } else { ctx.moveTo(2, -89); ctx.quadraticCurveTo(8, -83, 14, -89); } ctx.stroke(); }
  ctx.save(); ctx.translate(1, -110 - hat); ctx.rotate(-0.1);   // top hat with a clock on the band
  ctx.fillStyle = P.coatDk; ctx.strokeStyle = ink; ctx.lineWidth = 3.2;
  ctx.beginPath(); ctx.ellipse(0, 0, 20, 5, 0, 0, PW30_P); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-12, -1); ctx.lineTo(-13, -25); ctx.lineTo(13, -25); ctx.lineTo(12, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = P.brass; ctx.fillRect(-11.5, -9, 23, 6);
  pw30Clock(v, 0, -12, 6, t, 5, null, 1.8);
  ctx.restore();
  arm(11, armF, true);
  ctx.restore();
  // the brass pod over his legs: windshield, belly, and the big spinning clock dial
  ctx.fillStyle = P.brass; ctx.strokeStyle = ink; ctx.lineWidth = 3.6; v.rr(-60, -60, 122, 50, 22); ctx.fill(); ctx.stroke();
  ctx.fillStyle = P.brassDk; ctx.beginPath(); ctx.moveTo(-52, -22); ctx.quadraticCurveTo(0, -4, 54, -22); ctx.quadraticCurveTo(52, -12, 40, -11.5); ctx.lineTo(-38, -11.5); ctx.quadraticCurveTo(-50, -12, -52, -22); ctx.closePath(); ctx.fill();
  ctx.fillStyle = P.brassLt; v.rr(-50, -55, 60, 6, 3); ctx.fill();
  ctx.fillStyle = 'rgba(143,227,224,0.6)'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(26, -60); ctx.quadraticCurveTo(40, -88, 59, -62); ctx.lineTo(56, -56); ctx.closePath(); ctx.fill(); ctx.stroke();
  pw30Clock(v, -6, -35, 16, t, 9, null, 3);
  ctx.fillStyle = '#ff5f6d'; ctx.lineWidth = 2; v.circle(34, -34, 4.5); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#9fe07f'; v.circle(46, -38, 3.5); ctx.fill(); ctx.stroke();
  ctx.restore();
  return { x: x + 16 * s * face, y: y + (bob + cy + 15) * s };
}
// the trip through time: the whole picture goes violet and teal, with a swirl and tumbling clocks (a = 0..1)
function pw30Warp(v, a, t) {
  if (a <= 0) return;
  const ctx = v.ctx, cx = v.W / 2, cy = v.H / 2;
  ctx.save(); ctx.globalAlpha *= Math.min(1, a);
  const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 190);
  g.addColorStop(0, '#fff7d6'); g.addColorStop(0.22, '#7fe9ff'); g.addColorStop(0.55, '#b28dff'); g.addColorStop(1, '#2a1a5e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, v.W, v.H);
  ctx.lineCap = 'round';
  for (let k = 0; k < 4; k++) {
    ctx.strokeStyle = k % 2 ? 'rgba(255,255,255,0.7)' : 'rgba(42,26,94,0.45)'; ctx.lineWidth = 5; ctx.beginPath();
    for (let q = 0; q <= 14; q++) { const u = q / 14, ang = t * 7 + k * 1.571 + u * 3.6, rad = 12 + 190 * u; ctx.lineTo(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * 0.7); }
    ctx.stroke();
  }
  for (let k = 0; k < 5; k++) { const ang = t * 3 + k * 1.257, rad = 52 + k * 11; pw30Clock(v, cx + Math.cos(ang) * rad * 1.5, cy + Math.sin(ang) * rad * 0.8, 7 + (k % 2) * 3, t + k, 14, k % 2 ? pw30C.brassLt : pw30C.cream, 1.6); }
  ctx.restore();
}

/* ---------- the four eras' backdrops (sc = how far the chase has scrolled, e = seconds into the era) ---------- */
function pw30Dino(v, t, e, sc) {
  const ctx = v.ctx, GY = 152;
  pw30Grad(v, '#e9603f', '#ffd27e', 0, GY);
  // the volcano, far off, with a lazy plume
  const vx = 236 - sc * 0.05;
  ctx.fillStyle = 'rgba(110,70,90,0.55)'; for (let k = 0; k < 4; k++) { v.circle(vx + 4 + k * 9 + Math.sin(t * 1.5 + k) * 2, 62 - k * 9, 8 + k * 2.5); ctx.fill(); }
  ctx.fillStyle = '#93506a'; ctx.beginPath(); ctx.moveTo(vx - 70, GY); ctx.lineTo(vx - 13, 72); ctx.lineTo(vx + 13, 72); ctx.lineTo(vx + 74, GY); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffb03a'; ctx.beginPath(); ctx.moveTo(vx - 13, 72); ctx.lineTo(vx + 13, 72); ctx.lineTo(vx + 9, 84); ctx.lineTo(vx + 3, 78); ctx.lineTo(vx - 3, 92); ctx.lineTo(vx - 8, 80); ctx.closePath(); ctx.fill();
  // the asteroid, streaking down the sky
  const ax = v.lerp(50, 128, e / 1.6), ay = v.lerp(6, 46, e / 1.6);
  ctx.fillStyle = 'rgba(255,240,170,0.5)'; ctx.beginPath(); ctx.moveTo(ax - 78, ay - 44); ctx.lineTo(ax + 3, ay - 10); ctx.lineTo(ax - 9, ay + 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffb03a'; ctx.beginPath(); ctx.moveTo(ax - 46, ay - 26); ctx.lineTo(ax + 4, ay - 8); ctx.lineTo(ax - 7, ay + 6); ctx.closePath(); ctx.fill();
  v.fillCircle(ax, ay, 9 + Math.sin(t * 30), '#fff3c0'); v.fillCircle(ax + 1, ay + 1, 5.5, '#8a5a4a');
  // the jungle ridge and a long-neck dinosaur looking up
  ctx.fillStyle = '#4f8a55'; ctx.beginPath(); ctx.moveTo(0, GY);
  for (let x = 0; x <= 328; x += 8) { const u = x + sc * 0.3; ctx.lineTo(x, 132 + Math.sin(u / 23) * 5 + Math.sin(u / 9 + 1) * 2.5); }
  ctx.lineTo(328, GY); ctx.closePath(); ctx.fill();
  const dx = pw30Wrap(190 - sc * 0.3, 430) - 50;
  ctx.fillStyle = '#3c6e4c'; ctx.strokeStyle = '#3c6e4c'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.ellipse(dx, 126, 17, 9, 0, 0, PW30_P); ctx.fill();
  ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(dx + 12, 122); ctx.quadraticCurveTo(dx + 22, 108, dx + 20, 94); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(dx + 23, 92, 6, 3.6, -0.3, 0, PW30_P); ctx.fill();
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(dx - 14, 124); ctx.quadraticCurveTo(dx - 28, 124, dx - 34, 134); ctx.stroke();
  ctx.fillRect(dx - 11, 128, 6, 12); ctx.fillRect(dx + 5, 128, 6, 12);
  // the ground and the palms rushing by
  ctx.fillStyle = '#a8763e'; ctx.fillRect(0, GY, v.W, v.H - GY); ctx.fillStyle = '#7a5226'; for (let k = 0; k < 6; k++) ctx.fillRect(pw30Wrap(k * 61 - sc, 366) - 20, GY + 12 + (k % 3) * 5, 12, 3);
  ctx.fillStyle = '#6f9f45'; ctx.fillRect(0, GY - 2, v.W, 7);
  for (let k = 0; k < 3; k++) {
    const px = pw30Wrap(k * 150 + 60 - sc, 450) - 60, top = GY - 44 - (k % 2) * 8;
    ctx.strokeStyle = '#7a5226'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(px, GY); ctx.quadraticCurveTo(px + 6, GY - 22, px + 2, top); ctx.stroke();
    ctx.strokeStyle = '#2f7a46'; ctx.lineWidth = 4.5;
    for (let f = 0; f < 5; f++) { const a = -2.75 + f * 0.6; ctx.beginPath(); ctx.moveTo(px + 2, top); ctx.quadraticCurveTo(px + 2 + Math.cos(a) * 14, top + Math.sin(a) * 14 - 5, px + 2 + Math.cos(a) * 22, top + Math.sin(a) * 12 + 5); ctx.stroke(); }
  }
}
function pw30VikingSea(v, t, sc) {
  const ctx = v.ctx;
  pw30Grad(v, '#4f6f9c', '#cfe7ec', 0, 132);
  v.cloud(pw30Wrap(250 - sc * 0.1, 400) - 40, 30, 1); v.cloud(pw30Wrap(90 - sc * 0.07, 400) - 40, 52, 0.7);
  ctx.fillStyle = '#5d7fa3'; ctx.beginPath(); ctx.moveTo(0, 132);   // fjord cliffs
  for (let x = 0; x <= 328; x += 8) { const u = x + sc * 0.15; ctx.lineTo(x, 112 - Math.abs(Math.sin(u / 47)) * 30 - Math.abs(Math.sin(u / 13 + 2)) * 6); }
  ctx.lineTo(328, 132); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2f73a0'; ctx.fillRect(0, 128, v.W, v.H - 128);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.6; ctx.beginPath();
  for (let x = 0; x <= 324; x += 6) ctx.lineTo(x, 131 + Math.sin((x + sc * 0.5) / 9) * 1.5);
  ctx.stroke();
}
// the rolling wave in front of the ship
function pw30VikingWave(v, t, sc) {
  const ctx = v.ctx;
  for (let r = 0; r < 2; r++) {
    const y0 = 147 + r * 15, sp = 0.8 + r * 0.5;
    ctx.fillStyle = r ? '#1f547e' : '#27659a'; ctx.beginPath(); ctx.moveTo(0, v.H);
    for (let x = 0; x <= 324; x += 6) ctx.lineTo(x, y0 + Math.sin((x + sc * sp) / 15 + r * 2) * 4);
    ctx.lineTo(324, v.H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 0; x <= 324; x += 6) ctx.lineTo(x, y0 + Math.sin((x + sc * sp) / 15 + r * 2) * 4);
    ctx.stroke();
  }
}
// a Viking longship, its waterline at (cx, cy); the deck Pip and Bo stand on is at cy - 9
function pw30Ship(v, cx, cy, t) {
  const ctx = v.ctx, ink = v.c.ink;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = '#6b4424'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(cx - 2, cy - 6); ctx.lineTo(cx - 2, cy - 70); ctx.stroke();
  const bl = 4 + Math.sin(t * 5) * 1.5;   // the striped sail, full of wind
  for (let k = 0; k < 5; k++) {
    const x0 = cx - 26 + k * 10;
    ctx.fillStyle = k % 2 ? '#fff4d6' : '#e8554a'; ctx.beginPath();
    ctx.moveTo(x0, cy - 67); ctx.lineTo(x0 + 10.5, cy - 67); ctx.quadraticCurveTo(x0 + 10.5 + bl, cy - 52, x0 + 10.5, cy - 37); ctx.lineTo(x0, cy - 37); ctx.quadraticCurveTo(x0 + bl, cy - 52, x0, cy - 67); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx - 26, cy - 67); ctx.lineTo(cx + 24.5, cy - 67); ctx.quadraticCurveTo(cx + 24.5 + bl, cy - 52, cx + 24.5, cy - 37); ctx.lineTo(cx - 26, cy - 37); ctx.quadraticCurveTo(cx - 26 + bl, cy - 52, cx - 26, cy - 67); ctx.closePath(); ctx.stroke();
  // the dragon prow and the curled stern
  ctx.strokeStyle = ink; ctx.lineWidth = 7.5; ctx.beginPath(); ctx.moveTo(cx + 38, cy - 6); ctx.quadraticCurveTo(cx + 50, cy - 14, cx + 49, cy - 30); ctx.moveTo(cx - 40, cy - 6); ctx.quadraticCurveTo(cx - 52, cy - 14, cx - 49, cy - 26); ctx.stroke();
  ctx.strokeStyle = '#9a6634'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx + 38, cy - 6); ctx.quadraticCurveTo(cx + 50, cy - 14, cx + 49, cy - 30); ctx.moveTo(cx - 40, cy - 6); ctx.quadraticCurveTo(cx - 52, cy - 14, cx - 49, cy - 26); ctx.stroke();
  ctx.fillStyle = '#9a6634'; ctx.strokeStyle = ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(cx + 53, cy - 32, 7, 4.5, -0.2, 0, PW30_P); ctx.fill(); ctx.stroke();
  v.fillCircle(cx + 53, cy - 33.5, 1.4, '#fff'); v.fillCircle(cx - 48, cy - 27, 3.2, '#9a6634');
  ctx.fillStyle = '#e8554a'; ctx.beginPath(); ctx.moveTo(cx + 46, cy - 35); ctx.lineTo(cx + 43, cy - 41); ctx.lineTo(cx + 50, cy - 36); ctx.closePath(); ctx.fill();
  // the hull and its row of shields
  ctx.fillStyle = '#9a6634'; ctx.strokeStyle = ink; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(cx - 46, cy - 10); ctx.lineTo(cx + 44, cy - 10); ctx.quadraticCurveTo(cx + 36, cy + 8, cx + 20, cy + 8); ctx.lineTo(cx - 22, cy + 8); ctx.quadraticCurveTo(cx - 38, cy + 8, cx - 46, cy - 10); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#6b4424'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx - 40, cy - 2); ctx.lineTo(cx + 39, cy - 2); ctx.stroke();
  for (let k = 0; k < 5; k++) { ctx.fillStyle = k % 2 ? '#f2c84b' : '#5fb0e8'; ctx.strokeStyle = ink; ctx.lineWidth = 1.4; v.circle(cx - 30 + k * 15, cy - 4, 5); ctx.fill(); ctx.stroke(); v.fillCircle(cx - 30 + k * 15, cy - 4, 1.5, '#fff4d6'); }
}
function pw30Leo(v, t, e, sc) {
  const ctx = v.ctx;
  pw30Grad(v, '#f5b877', '#fff0cc', 0, 150);
  v.fillCircle(52, 36, 26, 'rgba(255,255,255,0.35)'); v.fillCircle(52, 36, 14, '#fff6d8');
  ctx.fillStyle = '#d7c489'; ctx.beginPath(); ctx.moveTo(0, v.H);   // far Tuscan hills, with cypress trees
  for (let x = 0; x <= 328; x += 8) ctx.lineTo(x, 122 + Math.sin((x + sc * 0.1) / 50) * 9);
  ctx.lineTo(328, v.H); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6f8a4a'; for (let k = 0; k < 5; k++) { const x = pw30Wrap(k * 83 + 20 - sc * 0.1, 415) - 40; ctx.beginPath(); ctx.ellipse(x, 110 + (k % 2) * 6, 3.4, 12, 0, 0, PW30_P); ctx.fill(); }
  // the great dome and its bell tower
  const dx = pw30Wrap(262 - sc * 0.22, 520) - 90;
  ctx.fillStyle = '#f1e2bd'; ctx.fillRect(dx - 52, 84, 13, 66); ctx.fillRect(dx - 26, 118, 52, 32);
  ctx.fillStyle = '#b9532f'; ctx.beginPath(); ctx.moveTo(dx - 54, 84); ctx.lineTo(dx - 45.5, 72); ctx.lineTo(dx - 37, 84); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#cf6a3d'; ctx.beginPath(); ctx.moveTo(dx - 28, 119); ctx.bezierCurveTo(dx - 28, 84, dx - 10, 74, dx, 72); ctx.bezierCurveTo(dx + 10, 74, dx + 28, 84, dx + 28, 119); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#f1e2bd'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(dx, 72); ctx.lineTo(dx, 119); ctx.moveTo(dx, 72); ctx.quadraticCurveTo(dx - 14, 86, dx - 15, 119); ctx.moveTo(dx, 72); ctx.quadraticCurveTo(dx + 14, 86, dx + 15, 119); ctx.stroke();
  ctx.fillStyle = '#f1e2bd'; ctx.fillRect(dx - 3, 62, 6, 11); v.fillCircle(dx, 60, 2.6, '#d9a441');
  ctx.fillStyle = '#8a6a4a'; for (let k = 0; k < 3; k++) ctx.fillRect(dx - 47.5, 92 + k * 16, 4, 8);
  // the rooftops rushing by below
  for (let k = 0; k < 7; k++) {
    const w = 46 + (k % 3) * 8, x = pw30Wrap(k * 58 - sc, 406) - 62, y = 150 + (k * 7) % 11;
    ctx.fillStyle = k % 2 ? '#ecd9aa' : '#e2c890'; ctx.fillRect(x, y, w, v.H - y);
    ctx.fillStyle = '#7a5a3e'; ctx.fillRect(x + 8, y + 9, 6, 9); ctx.fillRect(x + w - 16, y + 9, 6, 9);
    ctx.fillStyle = k % 2 ? '#c9603a' : '#b9532f'; ctx.beginPath(); ctx.moveTo(x - 4, y + 2); ctx.lineTo(x + w * 0.5, y - 13); ctx.lineTo(x + w + 4, y + 2); ctx.closePath(); ctx.fill();
  }
}
// Leonardo's flying machine: a wooden frame with two big flapping canvas wings; the seat bar is at cy
function pw30Flyer(v, cx, cy, t) {
  const ctx = v.ctx, ink = v.c.ink;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const wing = (ox, f, fill) => {
    const rx = cx + ox, ry = cy - 5, a = -1.75 + f, c = Math.cos(a), s = Math.sin(a);
    const P = (u, w) => [rx + c * u - s * w, ry + s * u + c * w];   // u along the wing, w toward its trailing edge
    const tip = P(58, 0), m1 = P(46, 17), m2 = P(30, 22), m3 = P(13, 20), b1 = P(52, 9), b2 = P(38, 15), b3 = P(22, 15);
    ctx.fillStyle = fill; ctx.strokeStyle = ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(tip[0], tip[1]);
    ctx.quadraticCurveTo(b1[0], b1[1], m1[0], m1[1]); ctx.quadraticCurveTo(b2[0], b2[1], m2[0], m2[1]); ctx.quadraticCurveTo(b3[0], b3[1], m3[0], m3[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 1.5; ctx.beginPath(); for (const m of [m1, m2, m3]) { ctx.moveTo(rx, ry); ctx.lineTo(m[0], m[1]); } ctx.stroke();
    ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
  };
  const f = Math.sin(t * 10) * 0.42;
  wing(12, -f * 0.8 - 0.1, '#d9c08a'); wing(-6, f, '#f4e4b8');
  // the tail fan, the keel and the seat bar
  ctx.fillStyle = '#f4e4b8'; ctx.strokeStyle = ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx - 30, cy + 2); ctx.lineTo(cx - 54, cy - 12); ctx.lineTo(cx - 52, cy + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = ink; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.moveTo(cx - 34, cy + 2.5); ctx.lineTo(cx + 36, cy + 2.5); ctx.stroke();
  ctx.strokeStyle = '#a8703a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - 34, cy + 2.5); ctx.lineTo(cx + 36, cy + 2.5); ctx.stroke();
  ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(cx - 26, cy + 5); ctx.quadraticCurveTo(cx, cy + 20, cx + 30, cy + 5); ctx.moveTo(cx - 6, cy + 5); ctx.lineTo(cx - 6, cy + 12); ctx.moveTo(cx + 12, cy + 5); ctx.lineTo(cx + 12, cy + 12); ctx.stroke();
}
function pw30MoonSky(v, t, sc) {
  const ctx = v.ctx, GY = 150;
  pw30Grad(v, '#090918', '#262650', 0, GY);
  for (let k = 0; k < 34; k++) { ctx.fillStyle = `rgba(255,255,255,${0.45 + 0.5 * Math.sin(t * (2 + k % 5) + k)})`; ctx.fillRect(v.rand(k * 3 + 1) * v.W, v.rand(k * 3 + 2) * 128, 1.5, 1.5); }
  // the Earth
  const ex = 284, ey = 32;
  v.fillCircle(ex, ey, 19, 'rgba(120,180,255,0.18)'); v.fillCircle(ex, ey, 15, '#4f9be8');
  ctx.save(); v.circle(ex, ey, 15); ctx.clip();
  ctx.fillStyle = '#6fc46a'; ctx.beginPath(); ctx.ellipse(ex - 6, ey - 3, 6, 8, 0.5, 0, PW30_P); ctx.fill(); ctx.beginPath(); ctx.ellipse(ex + 7, ey + 6, 5, 4, -0.4, 0, PW30_P); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(ex + 2, ey - 9, 9, 2.2, 0.2, 0, PW30_P); ctx.fill();
  ctx.fillStyle = 'rgba(9,9,24,0.45)'; v.circle(ex + 9, ey + 5, 17); ctx.fill();
  ctx.restore();
  // far ridges, the grey ground and its craters
  ctx.fillStyle = '#8f93a8'; ctx.beginPath(); ctx.moveTo(0, GY);
  for (let x = 0; x <= 328; x += 8) ctx.lineTo(x, 142 - Math.abs(Math.sin((x + sc * 0.3) / 37)) * 9);
  ctx.lineTo(328, GY); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c9cbd8'; ctx.fillRect(0, GY, v.W, v.H - GY); ctx.fillStyle = '#e3e5ee'; ctx.fillRect(0, GY, v.W, 2.5);
  for (let k = 0; k < 6; k++) {
    const x = pw30Wrap(k * 67 + 20 - sc, 402) - 40, y = GY + 9 + (k % 3) * 7, w = 9 + (k % 2) * 6;
    ctx.fillStyle = '#a3a6b8'; ctx.beginPath(); ctx.ellipse(x, y, w, 3, 0, 0, PW30_P); ctx.fill();
    ctx.fillStyle = '#8b8ea2'; ctx.beginPath(); ctx.ellipse(x, y - 0.8, w * 0.75, 1.8, 0, 0, PW30_P); ctx.fill();
  }
}
// the Moon lander, its feet at (x, y)
function pw30Lander(v, x, y) {
  const ctx = v.ctx, ink = v.c.ink;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 9, y - 12); ctx.lineTo(x - 17, y); ctx.moveTo(x + 9, y - 12); ctx.lineTo(x + 17, y); ctx.moveTo(x - 21, y); ctx.lineTo(x - 13, y); ctx.moveTo(x + 13, y); ctx.lineTo(x + 21, y); ctx.stroke();
  ctx.lineWidth = 1.6; ctx.fillStyle = '#e0b040'; v.rr(x - 13, y - 22, 26, 12, 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d5d8e4'; ctx.beginPath(); ctx.moveTo(x - 9, y - 22); ctx.lineTo(x - 11, y - 31); ctx.lineTo(x - 5, y - 38); ctx.lineTo(x + 5, y - 38); ctx.lineTo(x + 11, y - 31); ctx.lineTo(x + 9, y - 22); ctx.closePath(); ctx.fill(); ctx.stroke();
  v.fillCircle(x, y - 30, 3.2, '#3d4a78');
  ctx.beginPath(); ctx.moveTo(x + 7, y - 37); ctx.lineTo(x + 13, y - 44); ctx.stroke(); ctx.fillStyle = '#d5d8e4'; ctx.beginPath(); ctx.ellipse(x + 14, y - 45, 5, 2.4, -0.7, 0, PW30_P); ctx.fill(); ctx.stroke();
}

/* ---------- the three chase eras: he flies into the portal with the loot, Pip and Bo dive in after him ---------- */
function pw30Chase(v, ei, e, t) {
  const ctx = v.ctx, E = v.ease, era = PW30_ERAS[ei], sc = e * 150 + ei * 90, PX = PW30_PX, PY = PW30_PY;
  if (ei === 0) pw30Dino(v, t, e, sc); else if (ei === 1) pw30VikingSea(v, t, sc); else pw30Leo(v, t, e, sc);
  pw30Portal(v, PX, PY, 36, t, v.seg(e, 0.45, 0.78));
  // the Thief: hovers ahead, then zooms into the portal and shrinks away
  const ke = E.in(v.seg(e, 0.84, 1.14)), ts = 0.4 * (1 - 0.82 * ke);
  if (ke < 1) {
    const tx = v.lerp(206 + Math.sin(t * 2.3) * 4, PX + 3, ke), ty = v.lerp(era.ty, PY + 10, ke);
    const cl = pw30Thief(v, tx, ty, ts, 1, { t, pose: e > 0.25 && e < 0.84 && ei === 1 ? 'laugh' : 'grin', flame: 1 + ke * 0.6, claw: 0.25, item: 1, alpha: 1 - v.seg(ke, 0.75, 1) });
    ctx.save(); ctx.globalAlpha *= 1 - v.seg(ke, 0.75, 1); pw30Loot(v, era.loot, cl.x, cl.y + 7 * ts / 0.4, 0.66 * ts / 0.4, t); ctx.restore();
  }
  v.sparkle(PX, PY, v.seg(e, 1.08, 1.34), '#fff', 16);
  // Pip and Bo (and their ride): chase, then one big dive into the portal
  const kd = E.in(v.seg(e, 1.14, 1.47)), gx = 88, gy = ei === 0 ? 138 : ei === 1 ? 124 : 96;
  const mood = kd > 0 ? 'wow' : 'grit';
  if (kd < 1) {
    ctx.save();
    ctx.globalAlpha *= 1 - v.seg(kd, 0.8, 1);
    ctx.translate(v.lerp(gx, PX, kd), v.lerp(gy, PY, kd) + v.hop(kd, 24)); ctx.rotate(-0.3 * Math.sin(kd * Math.PI)); ctx.scale(1 - 0.85 * kd, 1 - 0.85 * kd); ctx.translate(-gx, -gy);
    if (ei === 0) {
      const GY = 152, run = kd > 0 ? 0 : 1;
      for (const [id, x, off] of [[1, 66, 0.15], [0, 104, 0]]) {
        const hp = v.hop(v.phase(t, 0.3, off), 6) * run;
        if (run) v.shadow(x, GY, 16 + hp);
        v.hero(id, x, GY + hp, { face: 1, mood, rot: 0.14, shadow: false });
        if (run) v.puff(x - 12, GY, v.phase(t, 0.3, off + 0.1), 'rgba(255,240,210,0.8)');
      }
    } else if (ei === 1) {
      const cy = 142 + Math.sin(t * 5) * 2.5;
      ctx.translate(92, cy); ctx.rotate(Math.sin(t * 5 + 1) * 0.045); ctx.translate(-92, -cy);
      pw30Ship(v, 92, cy, t);
      v.hero(1, 68, cy - 9, { face: 1, mood, shadow: false }); v.hero(0, 112, cy - 9 + v.hop(v.phase(t, 0.8), 4), { face: 1, mood, shadow: false, rot: 0.1 });
    } else {
      const cy = 112 + Math.sin(t * 10 + 1.2) * 3;
      pw30Flyer(v, 90, cy, t);
      v.hero(1, 72, cy, { face: 1, mood, shadow: false, rot: 0.08 }); v.hero(0, 106, cy, { face: 1, mood, shadow: false, rot: 0.12 });
    }
    ctx.restore();
  }
  if (ei === 1) pw30VikingWave(v, t, sc);
  if (ei === 0 && e > 0.22 && e < 0.84) v.bubble('Stop, thief!', 96, 118, { size: 9 });
  if (ei === 1 && e > 0.25 && e < 0.84) v.bubble('Hee hee!', 218, 30, { size: 9 });
}

/* ---------- the Moon: Bo bounces off Pip, grabs the flag back and plants it; the Thief sulks ---------- */
function pw30Moon(v, m, t) {
  const ctx = v.ctx, E = v.ease, GY = 150, sc = E.out(v.seg(m, 0, 0.9)) * 110;
  pw30MoonSky(v, t, sc);
  pw30Lander(v, 152 - sc, GY + 1);
  const got = m >= 1.0, joy = m >= 1.5;
  // the Thief: flying off with the flag, a shock, then his machine sputters down and he sulks
  const down = E.inOut(v.seg(m, 1.25, 1.75)), tf = v.lerp(1, -1, v.seg(m, 1.3, 1.5));
  const tx = v.lerp(214 + Math.sin(t * 2.3) * 3, 264, down), ty = v.lerp(92, 147, down);
  const cl = pw30Thief(v, tx, ty, 0.4, tf, { t, pose: m < 1.0 ? 'grin' : m < 1.45 ? 'shock' : 'sulk', claw: 0.25 * (1 - down), item: !got, flame: m < 1.0 ? 1 : (1 - down) * (0.5 + 0.5 * Math.sin(t * 40)),
    bob: down > 0 ? (1 - down) * Math.sin(t * 30) * 4 : m >= 1.0 ? Math.sin(t * 40) * 3 : undefined, tilt: down * -0.07 });
  if (m > 1.7) for (let k = 0; k < 2; k++) v.puff(tx + 33, ty - 16 - v.phase(t, 0.9, k * 0.45) * 12, v.phase(t, 0.9, k * 0.45), 'rgba(170,165,190,0.9)');
  // Pip runs in and stops; Bo bounces off his head in a slow Moon jump up to the claw
  const px = v.lerp(84, 150, E.out(v.seg(m, 0, 0.5)));
  let bx, by;
  if (m < 0.45) { bx = v.lerp(40, 112, m / 0.45); by = GY + v.hop(v.phase(m, 0.45), 9); }
  else if (m < 0.68) { const k = v.seg(m, 0.45, 0.68); bx = v.lerp(112, 150, k); by = v.lerp(GY, GY - 25, k) + v.hop(k, 13); }
  else if (m < 1.0) { const k = v.seg(m, 0.68, 1.0); bx = v.lerp(150, 207, k); by = v.lerp(GY - 25, 126, E.out(k)); }
  else if (m < 1.45) { const k = v.seg(m, 1.0, 1.45); bx = v.lerp(207, 194, k); by = v.lerp(126, GY, E.inOut(k)); }
  else { bx = 194; by = GY; }
  const jh = id => (joy ? v.hop(v.phase(m - 1.5, 0.6, id * 0.3), 10) : 0);
  const pipSq = m >= 0.68 && m < 0.9 ? 0.3 * (1 - v.seg(m, 0.68, 0.9)) : 0, pipHop = m < 0.45 ? v.hop(v.phase(m, 0.45, 0.5), 6) : 0;
  // the flag: in the claw, then in Bo's hands, then planted between them
  const plant = E.out(v.seg(m, 1.45, 1.62));
  const fx = got ? v.lerp(bx + 13, 172, plant) : cl.x, fy = got ? v.lerp(by - 17, GY - 15, plant) : cl.y + 7;
  v.shadow(px, GY, 16); v.shadow(bx, GY, 16 - Math.min(10, (GY - by) * 0.2));
  if (!got) pw30Loot(v, 'flag', fx, fy, 0.66, t);
  v.hero(0, px, GY + pipHop + jh(0), { face: 1, mood: joy ? 'joy' : m >= 0.68 ? 'wow' : 'grit', sq: pipSq, shadow: false });
  if (got) pw30Loot(v, 'flag', fx, fy, 0.66 + 0.24 * plant, t);
  v.hero(1, bx, by + jh(1), { face: joy ? -1 : 1, mood: joy ? 'joy' : got ? 'happy' : 'grit', shadow: false, sq: m >= 0.68 && m < 1.0 ? -0.12 : 0 });
  v.sparkle(212, 110, v.seg(m, 0.97, 1.3), '#fff', 13);
  v.puff(bx, GY, v.seg(m, 1.45, 1.8), 'rgba(230,230,240,0.9)');
  // the happy ending
  v.confetti(172, GY - 34, v.seg(m, 1.5, 2.4), 18);
  if (joy) {
    const lk = v.seg(m, 1.5, 1.72);
    v.label('Got it back!', 128, 62 - E.out(lk) * 6, 16 * (0.6 + 0.4 * E.back(lk)), v.c.gold);
    for (const [sx, sy, o] of [[152, 116, 0], [190, 104, 0.33], [170, 96, 0.66]]) v.sparkle(sx, sy, v.phase(m, 0.7, o), '#fff3c0', 5);
  }
  if (m > 1.8 && m < 2.3) v.bubble('Hmph!', tx - 6, ty - 80, { size: 9 });
}

function pw30Scene(v, t) {
  const ctx = v.ctx, ei = t < 1.6 ? 0 : t < 3.2 ? 1 : t < 4.8 ? 2 : 3, era = PW30_ERAS[ei], e = t - era.t0;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, v.W, v.H); ctx.clip();
  if (ei < 3) pw30Chase(v, ei, e, t); else pw30Moon(v, e, t);
  // when are we? a little brass tag with a spinning clock
  const tw = 16 + era.when.length * 4.9;
  ctx.fillStyle = 'rgba(28,26,54,0.8)'; v.rr(6, 159, tw + 8, 16, 8); ctx.fill();   // (bottom left: the menus put their badges on the top corners)
  pw30Clock(v, 15, 167, 5, t, 12, pw30C.brassLt, 1.2);
  v.text(era.when, 24, 167.5, 9, '#fff', 'left', true);
  // the portal flash between eras (and round the loop's seam)
  pw30Warp(v, Math.max(1 - v.seg(e, 0, 0.2), v.seg(e, era.len - 0.17, era.len)), t);
  ctx.restore();
}

definePreview('The Time Thief', {
  blurb: 'Chase the Time Thief through history and win back everything he stole!',
  loop: 7.2, still: 0.8,
  draw(v, t) { pw30Scene(v, t); },
});
