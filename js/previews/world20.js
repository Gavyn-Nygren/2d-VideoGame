/* Pip & Bo - World page previews: World 20 Dragon Peak (20-1 Volcano Dragon). See js/previews/preview-core.js. */
'use strict';

/* 20-1 Volcano Dragon: up the volcano slope Pip holds the big shield while Bo hops a tall rock step; Cinder inhales,
   a glowing target zone shows where, and his fire splashes off the shield. Bo drops the rope ladder at the marked
   ledge, Pip climbs, and the camera follows them up to the crater rim. Cinder lands on a stone pillar over his lava
   hot tub and puffs fire again; Pip covers Bo while Bo holds the lever, the pillar sinks and SPLASH: Cinder sits in
   his hot tub, happy, and the volcano puffs friendly fireworks. Every helper starts with pw20. Cinder is drawn like
   vdDrawCinder in js/levels/world20/volcano-dragon.js (that one paints the game canvas, so this is a copy on v.ctx). */
const pw20C = { body: '#f2662f', bodyDk: '#b8401c', bodyLt: '#ff9257', belly: '#ffd9a0', bellyDk: '#e8ac68', wing: '#ffa040',
  wingDk: '#cc5a20', horn: '#fff1cf', ink: '#3a1a1a', lava: '#ff7a1f', lavaLt: '#ffc04d', lavaDk: '#d8461a', shield: '#7d8aa8' };
const PW20_P = Math.PI * 2;

// Cinder's pose geometry (like vdCinderGeo): o.pose, o.air, o.k (inhale 0..1), o.mood, o.t
function pw20Geo(o) {
  const p = o.pose, t = o.t, air = !!o.air, k = o.k || 0;
  const g = { o: Math.sin(t * 2.2) * 1.5, ang: 0, sx: 1, sy: 1, legs: air ? 'dangle' : 'stand', flap: air ? 0.15 + Math.sin(t * 12) * 0.65 : 0.05 + Math.sin(t * 2) * 0.06,
    arms: 'rest', eyes: 'open', mouth: o.mood === 'happy' ? 'smile' : o.mood === 'surprised' ? 'o' : 'frown', cheek: 0, belly: 1 };
  if (air) g.o = -6 + Math.sin(t * 3.4) * 5;
  if (p === 'inhale') { g.ang = -0.1 * k; g.cheek = k; g.belly = 1 + 0.06 * k; g.mouth = 'o'; g.arms = 'out'; if (!air) g.flap = 0.4; }
  else if (p === 'breathe') { g.ang = 0.14; g.mouth = 'wide'; if (!air) g.flap = -0.1; }
  else if (p === 'perch') { g.o = 2 + Math.sin(t * 2); g.legs = 'fold'; g.flap = -0.15; }
  else if (p === 'crouch') { g.sy = 0.84; g.sx = 1.1; g.o = 4; g.legs = 'fold'; g.flap = 0.7 + Math.sin(t * 20) * 0.2; g.arms = 'out'; }
  else if (p === 'splash') { g.ang = Math.sin(t * 22) * 0.07; g.arms = 'flail'; g.eyes = 'squeeze'; g.mouth = 'blub'; g.flap = 0.6 + Math.sin(t * 25) * 0.4; }
  else if (p === 'tub') { g.arms = 'rim'; g.eyes = 'content'; g.mouth = 'smile'; g.flap = -0.2 + Math.sin(t * 3) * 0.08; }
  return g;
}
function pw20Wing(v, x, y, flap, col, k) {
  const ctx = v.ctx;
  ctx.save(); ctx.translate(x, y); ctx.rotate(-flap); ctx.scale(k, k);
  ctx.fillStyle = col; ctx.strokeStyle = pw20C.ink; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-14, -42, -50, -40); ctx.quadraticCurveTo(-40, -26, -48, -12);
  ctx.quadraticCurveTo(-32, -18, -30, -2); ctx.quadraticCurveTo(-16, -10, -8, 6);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-4, -2); ctx.quadraticCurveTo(-18, -30, -48, -38); ctx.stroke();
  ctx.restore();
}
function pw20Leg(v, g, x, col, far) {
  const ctx = v.ctx;
  let y = -10, rx = 17, ry = 14, a = 0;
  if (g.legs === 'dangle') { y = -2; ry = 16; a = 0.25; } else if (g.legs === 'fold') { y = -8; rx = 22; ry = 11; }
  ctx.fillStyle = col; ctx.strokeStyle = pw20C.ink; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, a, 0, PW20_P); ctx.fill(); ctx.stroke();
  if (!far) { ctx.fillStyle = pw20C.horn; ctx.lineWidth = 1.5; for (let k = 0; k < 3; k++) { v.circle(x + 6 + k * 6, y + ry - 3, 2.6); ctx.fill(); ctx.stroke(); } }
}
function pw20Arm(v, g, side, t) {
  const ctx = v.ctx, sh = side > 0 ? [30, -78] : [-6, -82];
  let h;
  if (g.arms === 'out') h = side > 0 ? [66, -72] : [-46, -80];
  else if (g.arms === 'flail') h = side > 0 ? [64 + Math.sin(t * 18) * 10, -166] : [-30 + Math.sin(t * 16) * 8, -156];
  else if (g.arms === 'rim') h = side > 0 ? [84, -66] : [-68, -66];
  else h = side > 0 ? [44, -54] : [-16, -50];
  const col = side > 0 ? pw20C.body : pw20C.bodyDk;
  ctx.strokeStyle = pw20C.ink; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(h[0], h[1]); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = 8.5; ctx.stroke();
  ctx.fillStyle = col; ctx.strokeStyle = pw20C.ink; ctx.lineWidth = 2.5; v.circle(h[0], h[1], 7.5); ctx.fill(); ctx.stroke();
}
function pw20Eyes(v, g, look) {
  const ctx = v.ctx, lk = look[0], lky = look[1];
  for (const [ex, ey, er] of [[16, -134, 12.5], [42, -137, 14]]) {
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = pw20C.ink; ctx.lineWidth = 2.5;
    if (g.eyes === 'content') { ctx.lineWidth = 3.4; ctx.beginPath(); ctx.arc(ex, ey - 2, er * 0.65, 0.25, Math.PI - 0.25); ctx.stroke(); continue; }
    if (g.eyes === 'squeeze') { ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(ex - 8, ey - 6); ctx.lineTo(ex + 6, ey); ctx.lineTo(ex - 8, ey + 6); ctx.stroke(); continue; }
    v.circle(ex, ey, er); ctx.fill(); ctx.stroke();
    const px = ex + lk * er * 0.4, py = ey + lky * er * 0.35;
    ctx.fillStyle = pw20C.ink; v.circle(px, py, er * 0.5); ctx.fill();
    ctx.fillStyle = '#ffffff'; v.circle(px - er * 0.18, py - er * 0.2, er * 0.17); ctx.fill();
  }
}
function pw20Mouth(v, g, t) {
  const ctx = v.ctx;
  ctx.strokeStyle = pw20C.ink; ctx.lineWidth = 3;
  if (g.mouth === 'smile') {
    ctx.beginPath(); ctx.moveTo(44, -98); ctx.quadraticCurveTo(62, -84, 82, -98); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(52, -95); ctx.lineTo(56, -88); ctx.lineTo(60, -94); ctx.closePath(); ctx.fill();
  } else if (g.mouth === 'o') {
    ctx.fillStyle = '#5a1a20'; v.circle(80, -100, 6); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,180,70,0.85)'; v.circle(80, -100, 3.2); ctx.fill();
  } else if (g.mouth === 'wide') {
    ctx.fillStyle = '#5a1a20'; ctx.beginPath(); ctx.ellipse(78, -98, 12, 11, 0, 0, PW20_P); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.ellipse(80, -98, 7, 7, 0, 0, PW20_P); ctx.fill();
  } else if (g.mouth === 'blub') {
    ctx.beginPath(); for (let k = 0; k <= 6; k++) ctx.lineTo(48 + k * 5.5, -96 + Math.sin(t * 20 + k) * 3); ctx.stroke();
  } else { ctx.beginPath(); ctx.moveTo(46, -92); ctx.quadraticCurveTo(62, -102, 80, -94); ctx.stroke(); }
}
/* Cinder with his feet at (x, y), scale s, facing f (-1 = left). o: t, pose, air, k, mood, look [x, y] (-1..1),
   gy (ground under him, for the shadow). Returns where his mouth is (for the fire). */
function pw20Cinder(v, x, y, s, f, o) {
  const ctx = v.ctx, g = pw20Geo(o), t = o.t, D = pw20C;
  if (o.gy != null) {
    const k = v.clamp(1 - (o.gy - y) / 120, 0.3, 1);
    ctx.fillStyle = `rgba(30,12,20,${0.25 * k})`; ctx.beginPath(); ctx.ellipse(x, o.gy, 62 * s * k, 9 * s * k, 0, 0, PW20_P); ctx.fill();
  }
  ctx.save();
  ctx.translate(x, y); ctx.scale(s * f, s); ctx.translate(0, g.o);
  ctx.translate(0, -40); ctx.rotate(g.ang); ctx.translate(0, 40); ctx.scale(g.sx, g.sy);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = D.ink;
  // the curly tail with its little spade
  ctx.save(); ctx.translate(-40, -34); ctx.rotate(Math.sin(t * 2.1) * 0.12);
  const tail = () => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-38, 26, -58, -2); ctx.quadraticCurveTo(-70, -26, -50, -32); ctx.quadraticCurveTo(-34, -34, -38, -18); };
  ctx.lineWidth = 15; ctx.strokeStyle = D.ink; tail(); ctx.stroke();
  ctx.lineWidth = 10; ctx.strokeStyle = D.bodyDk; tail(); ctx.stroke();
  ctx.fillStyle = D.horn; ctx.strokeStyle = D.ink; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-38, -18); ctx.lineTo(-30, -6); ctx.lineTo(-44, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  pw20Wing(v, -6, -100, g.flap * 0.9 + 0.12, D.wingDk, 0.9);
  pw20Leg(v, g, -24, D.bodyDk, true);
  pw20Arm(v, g, -1, t);
  // round body, back spikes, striped belly
  ctx.fillStyle = D.body; ctx.strokeStyle = D.ink; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(0, -58, 52 * g.belly, 52, 0, 0, PW20_P); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.beginPath(); ctx.ellipse(-18, -82, 18, 12, -0.5, 0, PW20_P); ctx.fill();
  ctx.fillStyle = D.horn; ctx.lineWidth = 2;
  for (const [sx, sy, a] of [[-38, -92, -2.3], [-50, -70, -2.7], [-53, -46, -3.05]]) {
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(0, 11); ctx.lineTo(6, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  ctx.fillStyle = D.belly; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(16, -54, 32 * g.belly, 37, 0.08, 0, PW20_P); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = D.bellyDk;
  for (const by of [-74, -56, -38]) { ctx.beginPath(); ctx.moveTo(-6, by); ctx.quadraticCurveTo(16, by + 6, 40, by - 1); ctx.stroke(); }
  pw20Leg(v, g, 22, D.body, false);
  pw20Wing(v, -14, -96, g.flap, D.wing, 1);
  const armUp = g.arms === 'flail';
  if (armUp) pw20Arm(v, g, 1, t);
  // head, puffed cheek, horns, snout, blush, eyes, brows, mouth
  ctx.fillStyle = D.body; ctx.strokeStyle = D.ink; ctx.lineWidth = 4;
  v.circle(26, -124, 42); ctx.fill(); ctx.stroke();
  if (g.cheek > 0) { ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(46, -106, 16 + 10 * g.cheek, 14 + 8 * g.cheek, 0, 0, PW20_P); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = D.horn; ctx.lineWidth = 2.5;
  for (const [hx, hy, a] of [[6, -158, -0.5], [32, -164, -0.15]]) {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-7, 4); ctx.quadraticCurveTo(-6, -14, 2, -20); ctx.quadraticCurveTo(4, -8, 8, 4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  ctx.fillStyle = D.bodyLt; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(60, -106, 27, 19, -0.05, 0, PW20_P); ctx.fill(); ctx.stroke();
  ctx.fillStyle = D.ink;
  for (const [nx, ny] of [[70, -116], [80, -113]]) { ctx.beginPath(); ctx.ellipse(nx, ny, 2.6, 3.6, 0.3, 0, PW20_P); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,120,140,0.5)'; ctx.beginPath(); ctx.ellipse(36, -102, 8, 5, 0, 0, PW20_P); ctx.fill();
  pw20Eyes(v, g, o.look || [0.5, 0.2]);
  ctx.strokeStyle = D.ink; ctx.lineWidth = 4;
  const brow = o.mood === 'grumpy' && g.eyes === 'open' ? [[4, -156, 22, -148], [32, -152, 54, -158]]
    : o.mood === 'surprised' ? [[4, -160, 22, -164], [32, -166, 54, -164]] : [[4, -154, 22, -158], [32, -160, 54, -158]];
  for (const [x0, y0, x1, y1] of brow) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
  pw20Mouth(v, g, t);
  if (!armUp) pw20Arm(v, g, 1, t);
  ctx.restore();
  // the mouth in scene coords (same lean and squash as the drawing, pivot 40 units over his feet)
  const lx = 84 * g.sx, ly = -100 * g.sy + 40, ca = Math.cos(g.ang), sa = Math.sin(g.ang);
  return { x: x + (lx * ca - ly * sa) * s * f, y: y + (lx * sa + ly * ca - 40 + g.o) * s };
}

// friendly cartoon lava from x0 to x1, surface at y, down to y + d
function pw20Lava(v, x0, x1, y, t, d = 120) {
  const ctx = v.ctx, gr = ctx.createLinearGradient(0, y - 3, 0, y + 50);
  gr.addColorStop(0, pw20C.lavaLt); gr.addColorStop(0.4, pw20C.lava); gr.addColorStop(1, pw20C.lavaDk);
  const top = x => y + Math.sin(x * 0.09 + t * 2.4) * 1.6 + Math.sin(x * 0.21 - t * 1.7) * 0.8;
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x0, y + d);
  for (let x = x0; x <= x1 + 6; x += 6) ctx.lineTo(Math.min(x, x1), top(Math.min(x, x1)));
  ctx.lineTo(x1, y + d); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,170,0.9)'; ctx.lineWidth = 1.6; ctx.beginPath();
  for (let x = x0; x <= x1 + 6; x += 6) ctx.lineTo(Math.min(x, x1), top(Math.min(x, x1)));
  ctx.stroke();
  for (let x = Math.ceil(x0 / 34) * 34; x < x1 - 4; x += 34) {   // bubbles, a pure function of x and t
    const u = (t * 0.7 + v.rand(x + 900)) % 1, bx = x + v.rand(x + 77) * 14;
    if (u > 0.7) continue;
    ctx.fillStyle = 'rgba(255,225,140,0.9)'; v.circle(bx, y + 8 - u * 7, 1.4 + u * 2.6); ctx.fill();
  }
}
// the big shield over a hero's head: feet at (hx, hy), raised k 0..1, offset dx, half width rx, flash hit 0..1
function pw20Shield(v, id, hx, hy, k, dx, rx, hit) {
  if (k <= 0.02) return null;
  const ctx = v.ctx, cx = hx + dx * k, y = hy - 22 - 13 * k, w = rx * (0.5 + 0.5 * k), ry = 10 * (0.6 + 0.4 * k);
  v.line(cx, y, hx + 3, hy - 13, '#6b4a2a', 2.6);
  if (hit > 0) { ctx.fillStyle = `rgba(255,220,120,${0.7 * hit})`; ctx.beginPath(); ctx.ellipse(cx, y, w + 6, ry + 5, 0, Math.PI, 0); ctx.fill(); }
  ctx.fillStyle = pw20C.shield; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.ellipse(cx, y, w, ry, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.beginPath(); ctx.ellipse(cx - w * 0.35, y - ry * 0.5, w * 0.28, ry * 0.25, -0.3, 0, PW20_P); ctx.fill();
  v.line(cx - w, y, cx + w, y, id ? v.c.bo : v.c.pip, 2.6);
  v.fillCircle(cx, y - ry * 0.55, 2.2, v.c.gold);
  return { x: cx, y: y - ry, w };
}
// the glowing dashed target zone on the ground (k = how close the fire is)
function pw20Zone(v, cx, gy, w, k, t) {
  const ctx = v.ctx;
  ctx.fillStyle = `rgba(255,120,40,${0.18 + 0.3 * k})`; ctx.beginPath(); ctx.ellipse(cx, gy, w, 4 + 2 * k, 0, 0, PW20_P); ctx.fill();
  ctx.strokeStyle = `rgba(255,70,50,${0.6 + 0.4 * Math.sin(t * 14)})`; ctx.lineWidth = 1.8; ctx.setLineDash([5, 4]);
  ctx.beginPath(); ctx.ellipse(cx, gy, w, 4 + 2 * k, 0, 0, PW20_P); ctx.stroke(); ctx.setLineDash([]);
}
// sparks sucked into his mouth while he inhales
function pw20Inhale(v, m, k, t) {
  const ctx = v.ctx;
  ctx.fillStyle = 'rgba(255,230,150,0.9)';
  for (let n = 0; n < 6; n++) { const u = (t * 2 + n / 6) % 1, a = n * 1.1 + 0.6; v.circle(m.x + Math.cos(a) * 22 * (1 - u), m.y + Math.sin(a) * 15 * (1 - u), 0.8 + k); ctx.fill(); }
  ctx.fillStyle = `rgba(255,180,70,${0.3 + 0.5 * k})`; v.circle(m.x, m.y, 2 + 3 * k); ctx.fill();
}
// the fire breath from the mouth m onto the shield top sh (it splashes off both sides), fading in and out with a
function pw20Fire(v, m, sh, a, t) {
  if (a <= 0) return;
  const ctx = v.ctx, tx = sh.x, ty = sh.y, w = sh.w * 0.8;
  ctx.save(); ctx.globalAlpha *= a;
  for (const [col, k] of [['rgba(230,60,30,0.85)', 1], ['rgba(255,150,50,0.9)', 0.66], ['rgba(255,236,140,0.95)', 0.34]]) {
    const fl = Math.sin(t * 30 + k * 7) * 3;
    ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(m.x, m.y - 2 * k);
    ctx.quadraticCurveTo((m.x + tx) / 2 + fl, (m.y + ty) / 2 - 8 * k, tx - w * k, ty);
    ctx.lineTo(tx + w * k, ty);
    ctx.quadraticCurveTo((m.x + tx) / 2 - fl, (m.y + ty) / 2 + 8 * k, m.x, m.y + 2 * k);
    ctx.closePath(); ctx.fill();
  }
  // flame licks along the shield, and sparks flying off its rims
  for (let x = tx - sh.w + 3; x < tx + sh.w; x += 6) {
    const h = 6 + Math.sin(t * 25 + x) * 3;
    ctx.fillStyle = 'rgba(255,120,40,0.9)'; ctx.beginPath(); ctx.moveTo(x - 4, ty + 3); ctx.quadraticCurveTo(x, ty - h, x + 4, ty + 3); ctx.fill();
  }
  for (let n = 0; n < 8; n++) {
    const u = (t * 2.6 + n / 8) % 1, side = n % 2 ? 1 : -1;
    ctx.fillStyle = n % 3 ? 'rgba(255,214,90,0.95)' : 'rgba(255,140,60,0.95)';
    v.circle(tx + side * (sh.w + u * 16), ty + 6 - 10 * u + 26 * u * u, 1.8 * (1 - u) + 0.4); ctx.fill();
  }
  ctx.restore();
}
// the volcano's outside slope (top surface y for world x)
function pw20Ground(x) {
  if (x < 140) return 170 - (x + 20) * 0.2;
  if (x < 215) return 100 - (x - 140) * 4 / 75;
  if (x < 300) return 96 - (x - 215) * 46 / 85;
  return 50;
}
// the whole scene at time t (seconds, 0..7)
function pw20Scene(v, t) {
  const ctx = v.ctx, E = v.ease, gold = v.c.gold;
  // camera: the slope, then a pan up and right to the crater rim
  const pan = E.inOut(v.seg(t, 3.15, 4.0)), camX = 300 * pan, camY = -72 * pan;
  // ---- sky (screen space): sunset, embers, far hills with a little parallax
  v.sky(); v.sun(56, 40 + pan * 10, 13);
  for (let n = 0; n < 7; n++) {
    const u = (t / 7 + v.rand(n + 40)) % 1, ex = (v.rand(n + 50) * 360 - camX * 0.2 + 400) % 340 - 10;
    ctx.fillStyle = `rgba(255,190,90,${0.7 * Math.sin(u * Math.PI)})`; v.circle(ex + Math.sin(u * 9 + n) * 6, 175 - u * 170, 1.2); ctx.fill();
  }
  ctx.save(); ctx.translate(0, -camY * 0.35); v.hills(118, camX * 0.45); ctx.restore();
  // ---- the world
  ctx.save(); ctx.translate(-camX, -camY);
  // smoke from the crater and the crater's back wall
  for (let n = 0; n < 4; n++) {
    const u = (t / 3.5 + n / 4) % 1;
    ctx.fillStyle = `rgba(110,90,110,${0.4 * (1 - u)})`; v.circle(585 + Math.sin(u * 5 + n) * 10 + u * 20, -6 - u * 90, 9 + u * 18); ctx.fill();
  }
  ctx.fillStyle = '#4a2530'; ctx.beginPath(); ctx.moveTo(375, 92); ctx.lineTo(375, 62); ctx.lineTo(430, 36); ctx.lineTo(560, 30); ctx.lineTo(640, 8); ctx.lineTo(640, 92); ctx.closePath(); ctx.fill();
  ctx.fillStyle = v.c.hillNear; ctx.beginPath(); ctx.moveTo(612, 200); ctx.lineTo(612, 86); ctx.lineTo(632, -10); ctx.lineTo(700, -60); ctx.lineTo(700, 200); ctx.closePath(); ctx.fill();
  // the slope: basalt with a glowing orange crust
  const pts = [[-40, 174], [-20, 170], [140, 138], [140, 100], [215, 96], [300, 50], [375, 50], [375, 92]];
  ctx.save(); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.lineTo(380, 260); ctx.lineTo(-40, 260); ctx.closePath();
  ctx.fillStyle = v.c.stone; ctx.fill(); ctx.clip();
  ctx.fillStyle = v.c.stoneLight;
  const x0 = Math.floor((camX - 12) / 12) * 12, y0 = Math.floor((camY + 40) / 12) * 12;
  for (let ty = y0; ty < camY + 184; ty += 12) for (let tx = x0 + ((ty / 12) & 1 ? -6 : 0); tx < Math.min(380, camX + 330); tx += 12) ctx.fillRect(tx + 1, ty + 1, 10, 10);
  ctx.strokeStyle = 'rgba(255,140,60,0.55)'; ctx.lineWidth = 1.2; ctx.beginPath();
  for (const [cx, cy] of [[30, 172], [100, 158], [190, 118], [250, 96], [330, 74], [360, 104]]) { ctx.moveTo(cx, cy); ctx.lineTo(cx + 6, cy + 5); ctx.lineTo(cx + 13, cy + 3); }
  ctx.stroke();
  ctx.restore();
  ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]);
  ctx.strokeStyle = v.c.grassDark; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = v.c.grass; ctx.lineWidth = 2; ctx.stroke();
  // the slow lava creeping up behind them (bottom left)
  pw20Lava(v, -40, 30, 166 - v.seg(t, 0, 3.2) * 4, t, 40);
  // ---- the crater: the pillar (it sinks after the pull), a far pillar, the lever and its chain
  const pull = 5.0, sinkK = E.in(v.seg(t, pull, pull + 0.35)), pTop = 40 + sinkK * 58, pX = 482, lavaY = 86;
  for (const [px, top, w] of [[572, 47, 30], [pX, pTop, 38]]) {
    ctx.fillStyle = v.c.stone; ctx.strokeStyle = v.c.stoneEdge; ctx.lineWidth = 1.5;
    v.rr(px - w / 2, top, w, 120, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = v.c.stoneLight; ctx.fillRect(px - w / 2 + 3, top + 8, 5, 40); ctx.fillRect(px + 2, top + 16, 6, 30);
    ctx.fillStyle = '#57505e'; v.rr(px - w / 2 - 2, top - 3, w + 4, 7, 3); ctx.fill(); ctx.stroke();
  }
  const lvX = 372, lvAng = t < pull ? -0.55 - 0.18 * v.seg(t, 4.2, pull) : -2.4;   // the handle tips over toward Bo
  {
    const taut = t >= pull - 0.05, sag = taut ? 2 : 12, ex = pX - 19, ey = pTop + 26;
    ctx.strokeStyle = '#8a8296'; ctx.lineWidth = 1.6; ctx.setLineDash([3, 2]); ctx.beginPath();
    ctx.moveTo(lvX, 48); ctx.quadraticCurveTo((lvX + ex) / 2, Math.max(48, ey) + sag, ex, ey); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#57505e'; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.4; v.rr(lvX - 6, 44, 12, 7, 2); ctx.fill(); ctx.stroke();
    const hx = lvX + Math.cos(lvAng) * 15, hy = 46 + Math.sin(lvAng) * 15;
    v.line(lvX, 46, hx, hy, v.c.ink, 3.2); v.line(lvX, 46, hx, hy, '#c9c2d4', 1.6);
    v.fillCircle(hx, hy, 3.4, '#ff5f6d'); ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.2; v.circle(hx, hy, 3.4); ctx.stroke();
  }
  // ---- the rope ladder Bo drops at the marked ledge
  const ladK = E.out(v.seg(t, 2.2, 2.55));
  if (ladK <= 0) {   // the marked spot: a pulsing gold plate (and Bo's rope coil)
    ctx.fillStyle = `rgba(255,197,61,${0.55 + 0.35 * Math.sin(t * 8)})`; v.rr(141, 98, 12, 3, 1.5); ctx.fill();
    v.arrow(147, 80 + Math.sin(t * 6) * 2, 147, 92, gold, 2);
  } else {
    const L = 38 * ladK;
    ctx.strokeStyle = v.c.ropeDark; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(131, 100); ctx.lineTo(131, 100 + L); ctx.moveTo(139, 100); ctx.lineTo(139, 100 + L); ctx.stroke();
    ctx.strokeStyle = v.c.rope; ctx.lineWidth = 1.8; ctx.beginPath();
    for (let y = 105; y < 100 + L; y += 6) { ctx.moveTo(131, y); ctx.lineTo(139, y); }
    ctx.stroke();
    if (ladK < 1) { ctx.fillStyle = v.c.rope; ctx.strokeStyle = v.c.ropeDark; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(135, 100 + L, 6, 3, 0, 0, PW20_P); ctx.fill(); ctx.stroke(); }
    v.fillCircle(141, 100, 2, v.c.ropeDark);
  }
  // ---- Pip (the shielder) and Bo (the climber): where they are
  let pip, bo;
  if (t < 2.35) pip = { x: v.lerp(48, 128, t / 2.35) };
  else if (t < 2.65) pip = { x: 128 };
  else if (t < 3.1) { const k = v.seg(t, 2.65, 3.05); pip = { x: v.lerp(128, 133, v.seg(k, 0, 0.15)) + v.seg(k, 0.85, 1) * 14, y: v.lerp(138.4, 100, Math.floor(k * 6) / 6 * 0.3 + k * 0.7), climb: k < 0.95 }; }
  else pip = { x: v.lerp(147, 342, E.inOut(v.seg(t, 3.15, 4.0))) };
  if (t < 0.75) bo = { x: v.lerp(92, 120, t / 0.75) };
  else if (t < 1.25) { const k = v.seg(t, 0.75, 1.25); bo = { x: v.lerp(120, 150, k), y: v.lerp(pw20Ground(120), pw20Ground(150), k) + v.hop(k, 22), air: 1 }; }
  else if (t < 3.0) bo = { x: 150, face: -1 };
  else bo = { x: v.lerp(150, 362, E.inOut(v.seg(t, 3.0, 3.9))) };
  for (const h of [pip, bo]) if (h.y == null) h.y = pw20Ground(h.x);
  const walkP = !pip.climb && ((t > 0.02 && t < 2.35) || (t > 3.15 && t < 4.0)), walkB = (t < 0.75) || (t > 3.0 && t < 3.9);
  if (walkP) pip.y += v.hop(v.phase(t, 0.36), 2);
  if (walkB) bo.y += v.hop(v.phase(t, 0.3, 0.15), 4);
  // shields: up on the slope until the ladder, up again on the rim until the dunk
  const shK = t < 2.5 ? 1 - v.seg(t, 2.4, 2.55) : t < 4.6 ? v.seg(t, 4.0, 4.15) : 1 - v.seg(t, 5.1, 5.3);
  const onRim = t > 3.9, hitT = t > 1.35 && t < 2.15 ? 1 - v.seg(t, 1.35, 1.6) + 0.35 : t > 4.45 && t < 4.95 ? 1 - v.seg(t, 4.45, 4.7) + 0.35 : 0;
  // ---- Cinder: flies over the slope, then lands on the pillar in the crater
  let cx, cy, pose = 'fly', air = true, mood = 'grumpy', ck = 0, look = [0.7, 0.8];
  if (t < 2.35) { cx = 232 + Math.sin(t * 1.3) * 4; cy = 66; }
  else if (t < 3.95) { const k = E.inOut(v.seg(t, 2.35, 3.95)); cx = v.lerp(232, pX, k); cy = v.lerp(66, pTop, k) + v.hop(k, 46); look = [0.9, -0.2]; }
  else { cx = pX; cy = pTop; air = false; pose = 'perch'; look = [0.8, 0.9]; }
  if (t > 0.6 && t < 1.35) { pose = 'inhale'; ck = v.seg(t, 0.6, 1.2); }
  else if (t >= 1.35 && t < 2.15) pose = 'breathe';
  else if (t >= 3.95 && t < 4.1) pose = 'crouch';
  else if (t >= 4.1 && t < 4.45) { pose = 'inhale'; ck = v.seg(t, 4.1, 4.4); }
  else if (t >= 4.45 && t < 4.95) pose = 'breathe';
  if (t >= pull && t < pull + 0.35) mood = 'surprised';
  if (t >= pull + 0.35) { cy = lavaY + 18 + Math.sin(t * 3) * 1.2; air = false; pose = t < 5.9 ? 'splash' : 'tub'; mood = 'happy'; }
  const gyC = t < 2.35 ? pw20Ground(232) : null;
  const mouth = pw20Cinder(v, cx, cy, 0.3, -1, { t, pose, air, k: ck, mood, look, gy: gyC });
  // the hot tub covers his lower half once he is dunked
  pw20Lava(v, 375, 612, lavaY, t, 120);
  if (t >= pull + 0.35) {   // ripples round him in the tub
    ctx.strokeStyle = 'rgba(255,230,150,0.85)'; ctx.lineWidth = 1.4;
    for (let k = 0; k < 2; k++) { const u = (t * 0.7 + k * 0.5) % 1; ctx.globalAlpha = 1 - u; ctx.beginPath(); ctx.ellipse(cx, lavaY + 1, 20 * (0.7 + u * 0.7), 2.4 * (0.7 + u * 0.6), 0, 0, PW20_P); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  // the target zones (on the ground under the players, before the heroes)
  if (t > 0.6 && t < 2.15) pw20Zone(v, 108, pw20Ground(108), 22, v.seg(t, 0.6, 1.35), t);
  if (t > 4.1 && t < 4.95) pw20Zone(v, 350, 50, 24, v.seg(t, 4.1, 4.45), t);
  // ---- the heroes
  const fireOn = (t > 1.35 && t < 2.15) || (t > 4.45 && t < 4.95), dunked = t > pull + 0.3;
  const joy = dunked && t < 6.85, jh = id => (joy ? v.hop(v.phase(t - pull, 0.5, id * 0.25), 9) : 0);
  const holding = t > 4.15 && t < pull;
  v.hero(1, bo.x, bo.y + jh(1), { face: bo.face || 1, mood: joy ? 'joy' : holding ? 'grit' : fireOn && !onRim ? 'wow' : 'happy',
    sq: bo.air ? -0.12 : (t > 2.12 && t < 2.24) ? 0.18 : holding ? 0.06 : 0, rot: holding ? 0.12 : 0 });
  v.hero(0, pip.x, pip.y + jh(0), { face: 1, mood: joy ? 'joy' : fireOn ? 'grit' : 'happy', sq: pip.climb ? Math.sin(t * 30) * 0.06 : 0 });
  const sh = pw20Shield(v, 0, pip.x, pip.y + jh(0), shK, onRim ? 7 : 0, onRim ? 25 : 21, hitT);
  // ---- fire: sparks while he inhales, then the flame splashing off the shield
  if (pose === 'inhale') pw20Inhale(v, mouth, ck, t);
  if (fireOn && sh) pw20Fire(v, mouth, sh, Math.min(v.seg(t, t < 3 ? 1.35 : 4.45, (t < 3 ? 1.35 : 4.45) + 0.08), 1 - v.seg(t, t < 3 ? 2.0 : 4.82, t < 3 ? 2.15 : 4.95)), t);
  // ---- the lever's hold ring over Bo, the splash
  if (holding) {
    const k = v.seg(t, 4.15, pull), rx = bo.x, ry = bo.y - 38;
    ctx.fillStyle = 'rgba(28,26,54,0.6)'; v.circle(rx, ry, 7); ctx.fill();
    ctx.strokeStyle = gold; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(rx, ry, 7, -Math.PI / 2, -Math.PI / 2 + k * PW20_P); ctx.stroke();
    v.pill('pull', rx, ry - 14, { size: 8, bg: 'rgba(28,26,54,0.8)', col: gold });
  }
  if (t > 2.08 && t < 2.6) v.pill('ladder', 150, 62, { size: 8, bg: 'rgba(28,26,54,0.8)', col: gold });
  const spl = v.seg(t, pull + 0.33, pull + 1.1);
  if (spl > 0 && spl < 1) {
    for (let n = 0; n < 12; n++) {
      const a = -Math.PI / 2 + (v.rand(n * 5 + 3) - 0.5) * 2.6, sp = 40 + v.rand(n * 11 + 1) * 46;
      ctx.fillStyle = n % 2 ? pw20C.lavaLt : pw20C.lava;
      v.circle(pX + Math.cos(a) * sp * spl, lavaY + Math.sin(a) * sp * spl + 90 * spl * spl, 2.8 * (1 - spl) + 0.8); ctx.fill();
    }
  }
  // a happy smoke ring from his nostrils in the tub
  v.puff(cx - 22, cy - 36, v.seg(t, 6.15, 6.75), 'rgba(140,120,140,0.8)');
  ctx.restore();
  // ---- words and fireworks (screen space)
  if (t > 0.1 && t < 0.75) v.bubble('Grr! My peak!', 196, 36, { size: 9 });
  const bl = t < 3 ? v.seg(t, 1.45, 2.15) : v.seg(t, 4.55, 5.1);
  if (bl > 0 && bl < 1 && sh) { ctx.save(); ctx.globalAlpha *= 1 - v.seg(bl, 0.7, 1); v.label('Blocked!', sh.x - camX - (onRim ? 26 : 0), sh.y - camY - 14 - bl * 6, 12, gold); ctx.restore(); }
  const sk = v.seg(t, pull + 0.35, pull + 1.2);
  if (sk > 0 && sk < 1) { ctx.save(); ctx.globalAlpha *= 1 - v.seg(sk, 0.75, 1); v.label('SPLASH!', pX - camX, 40 - sk * 6, 18 * (0.7 + 0.3 * E.back(v.seg(sk, 0, 0.3))), pw20C.lavaLt); ctx.restore(); }
  if (t > 5.95 && t < 6.85) v.bubble('Ahh... hot tub!', pX - camX + 8, cy - camY - 48, { size: 9 });
  for (const [fx, fy, t0, col] of [[268, 34, 5.7, v.c.gold], [222, 22, 6.05, '#ff8fc7'], [300, 58, 6.35, '#7fd6ff']]) {
    const k = v.seg(t, t0, t0 + 0.75), up = v.seg(t, t0 - 0.35, t0);
    if (up > 0 && up < 1) v.fillCircle(fx, v.lerp(118, fy, E.out(up)), 1.6, '#fff3c0');
    if (k <= 0 || k >= 1) continue;
    ctx.save(); ctx.globalAlpha *= 1 - E.in(k);
    for (let n = 0; n < 8; n++) { const a = n * Math.PI / 4 + t0, r = 4 + E.out(k) * 15; v.star(fx + Math.cos(a) * r, fy + Math.sin(a) * r + k * k * 6, 2.6, col, a); }
    ctx.restore();
  }
  if (joy) v.heart(pX - camX - 18, cy - camY - 44 - v.seg(t, 5.6, 6.8) * 10, 4.5 * v.seg(t, 5.55, 5.75));
}

definePreview('Volcano Dragon', {
  blurb: 'Shield and climb, then dunk grumpy Cinder the dragon in his lava hot tub!',
  loop: 7, still: 1.75,
  draw(v, t) {
    // the seam: a quick dip to dusk, from the hot tub back to the foot of the slope
    const k = v.seg(t, 6.7, 7), back = k >= 0.5;
    pw20Scene(v, back ? 0 : t);
    if (k > 0) { v.ctx.fillStyle = `rgba(42,18,38,${0.92 * (back ? 2 - 2 * k : 2 * k)})`; v.ctx.fillRect(0, 0, v.W, v.H); }
  },
});
