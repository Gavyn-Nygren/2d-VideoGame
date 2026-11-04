/* Pip & Bo - Level previews for World 13 Spooky Hollow (Halloween, silly-spooky). See js/previews/preview-core.js.
   Top-level helpers are prefixed pw13. Each level's preview sits between its own BEGIN/END lines. */
'use strict';

/* ----- BEGIN 13-1 Pumpkin Patch Roll ----- */
/* ----- END 13-1 Pumpkin Patch Roll ----- */

/* ----- BEGIN 13-2 Graveyard Bone Hunt ----- */
// Pip and Bo dig up a big bone, carry it together on their heads to Mr. Bones (a skull sitting on his hips), it snaps
// in as his backbone, he stretches up tall, tips over the open grave as a bridge, and they hop across him to cheer.
const PW13BH_BONE = '#f6f0de', PW13BH_EDGE = '#7d6f96', PW13BH_INK = '#2a1f45', PW13BH_L = 7;
// a cartoon bone from (x1, y1) to (x2, y2), w thick, with knobby ends
function pw13BhBone(v, x1, y1, x2, y2, w) {
  const ctx = v.ctx, len = Math.hypot(x2 - x1, y2 - y1), r = w * 0.48;
  ctx.save(); ctx.translate(x1, y1); ctx.rotate(Math.atan2(y2 - y1, x2 - x1));
  ctx.beginPath(); ctx.rect(0, -w * 0.3, len, w * 0.6);
  for (const ex of [0, len]) for (const ey of [-r * 0.75, r * 0.75]) { ctx.moveTo(ex + r, ey); ctx.arc(ex, ey, r, 0, Math.PI * 2); }
  ctx.strokeStyle = PW13BH_EDGE; ctx.lineWidth = Math.max(2, w * 0.3); ctx.lineJoin = 'round'; ctx.stroke();
  ctx.fillStyle = PW13BH_BONE; ctx.fill();
  ctx.restore();
}
// Mr. Bones' round grinning skull with big friendly eyes (look -1..1 shifts the eyes)
function pw13BhSkull(v, x, y, r, look, blink, happy) {
  const ctx = v.ctx;
  ctx.fillStyle = PW13BH_BONE; ctx.strokeStyle = PW13BH_EDGE; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 0.92, Math.PI * 2.08);
  ctx.lineTo(x + r * 0.62, y + r * 0.95); ctx.quadraticCurveTo(x, y + r * 1.15, x - r * 0.62, y + r * 0.95); ctx.closePath();
  ctx.fill(); ctx.stroke();
  for (const ex of [-0.4, 0.4]) {
    const cx = x + ex * r + look * r * 0.12, cy = y - r * 0.05;
    ctx.fillStyle = PW13BH_INK;
    if (blink) { ctx.fillRect(cx - r * 0.26, cy - 1, r * 0.52, 2.4); continue; }
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.27, r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    v.fillCircle(cx + r * 0.08 + look * r * 0.06, cy - r * 0.1, r * 0.11, '#fff');
  }
  v.fillCircle(x - r * 0.62, y + r * 0.35, r * 0.17, 'rgba(255,140,170,0.5)'); v.fillCircle(x + r * 0.62, y + r * 0.35, r * 0.17, 'rgba(255,140,170,0.5)');
  ctx.fillStyle = PW13BH_INK;
  ctx.beginPath(); ctx.moveTo(x, y + r * 0.22); ctx.lineTo(x - r * 0.1, y + r * 0.4); ctx.lineTo(x + r * 0.1, y + r * 0.4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = PW13BH_INK; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y + r * 0.42, r * (0.42 + happy * 0.08), 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.lineWidth = 1;
  for (const tx of [-0.2, 0, 0.2]) { ctx.beginPath(); ctx.moveTo(x + tx * r, y + r * 0.7); ctx.lineTo(x + tx * r, y + r * (0.83 + happy * 0.04)); ctx.stroke(); }
}
// Mr. Bones, feet at (x, feet): grow 0..1 is his new backbone (with ribs and arms), tip 0..1 lays him down to the right
function pw13BhMr(v, x, feet, grow, tip, t, look) {
  const ctx = v.ctx, sp = 28 * grow, rot = tip * Math.PI / 2, hipY = -27;
  ctx.save(); ctx.translate(x, feet); ctx.rotate(rot);
  ctx.lineCap = 'round';
  // arms: up and waving once he's tall, folded along his sides as he lies down
  if (grow > 0.05) for (const d of [-1, 1]) {
    const sx = d * 8, sy = hipY - sp + 5, wave = Math.sin(t * Math.PI * 2 * 10 / PW13BH_L + d) * 0.35 * (1 - tip);
    const a = v.lerp(-Math.PI / 2 + d * 0.75 + wave, Math.PI / 2 - d * 0.12, tip), al = 15 * Math.min(1, grow);
    pw13BhBone(v, sx, sy, sx + Math.cos(a) * al, sy + Math.sin(a) * al, 4.6);
  }
  for (const d of [-1, 1]) {
    pw13BhBone(v, d * 5, hipY + 2, d * 6, -4, 5.5);
    ctx.fillStyle = PW13BH_BONE; ctx.strokeStyle = PW13BH_EDGE; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(d * 6 + d * 3, -2.5, 5.5, 2.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = PW13BH_BONE; ctx.strokeStyle = PW13BH_EDGE; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, hipY, 11, 5.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (grow > 0.02) {
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 5; k++) { const vy = hipY - 4 - k * (sp - 4) / 4.2; v.rr(-3.8, vy - 2.3, 7.6, 4.6, 1.8); ctx.fill(); ctx.stroke(); }
    ctx.save(); ctx.globalAlpha *= Math.min(1, grow);
    for (const [lw, col] of [[4.8, PW13BH_EDGE], [2.8, PW13BH_BONE]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(0, hipY - sp + 7 + k * 5.5, 10.5 - k, 3.8, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke(); }
    }
    ctx.restore();
  }
  // the head stays upright, even lying down
  ctx.translate(0, hipY - sp - 12); ctx.rotate(-rot * 0.85);
  pw13BhSkull(v, 0, 0, 13, look, v.phase(t, 3.5) > 0.94, grow);
  ctx.restore(); ctx.lineCap = 'butt';
}
// a shovel held at hand (hx, hy) with its blade at (bx, by)
function pw13BhShovel(v, hx, hy, bx, by) {
  const ctx = v.ctx;
  v.line(hx, hy, bx, by, '#8a5c3a', 2.6);
  ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.atan2(by - hy, bx - hx));
  ctx.fillStyle = '#c3bdd6'; ctx.strokeStyle = '#5c5276'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-2, -4.5); ctx.lineTo(5, -4); ctx.quadraticCurveTo(10, 0, 5, 4); ctx.lineTo(-2, 4.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
// a friendly bat (ph flaps the wings)
function pw13BhBat(v, x, y, s, ph) {
  const ctx = v.ctx, f = Math.sin(ph);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#1b1233';
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 4, 0); ctx.quadraticCurveTo(d * 12, -8 - f * 6, d * 20, -2 - f * 8); ctx.quadraticCurveTo(d * 15, 0, d * 13, 3); ctx.quadraticCurveTo(d * 9, 1, d * 4, 4); ctx.fill(); }
  v.circle(0, 1, 5.5); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-4, -3); ctx.lineTo(-3, -8); ctx.lineTo(-1, -4); ctx.moveTo(4, -3); ctx.lineTo(3, -8); ctx.lineTo(1, -4); ctx.fill();
  v.fillCircle(-2, 0, 1.3, '#ffd77a'); v.fillCircle(2, 0, 1.3, '#ffd77a');
  ctx.restore();
}
// a little jack-o'-lantern (glow 0..1)
function pw13BhLantern(v, x, y, r, glow) {
  const ctx = v.ctx;
  v.fillCircle(x, y, r * 2.2, 'rgba(255,170,70,' + (0.12 + 0.18 * glow).toFixed(3) + ')');
  ctx.fillStyle = '#e8792c'; ctx.strokeStyle = '#9a4316'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x - r * 0.4, y, r * 0.65, r * 0.85, 0, 0, Math.PI * 2); ctx.ellipse(x + r * 0.4, y, r * 0.65, r * 0.85, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.6, r * 0.9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#4f7a35'; ctx.fillRect(x - 1.5, y - r * 0.9 - 4, 3, 5);
  ctx.fillStyle = 'rgba(255,230,130,' + (0.7 + 0.3 * glow).toFixed(3) + ')';
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + d * r * 0.45, y - r * 0.15); ctx.lineTo(x + d * r * 0.2, y - r * 0.42); ctx.lineTo(x + d * r * 0.08, y - r * 0.1); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(x - r * 0.5, y + r * 0.15); ctx.quadraticCurveTo(x, y + r * 0.75, x + r * 0.5, y + r * 0.15); ctx.quadraticCurveTo(x, y + r * 0.4, x - r * 0.5, y + r * 0.15); ctx.fill();
}
// one hero's trip over Mr. Bones the bridge (u 0..1): walk to the edge, hop on, walk across, hop over his head
function pw13BhCross(v, x0, x1, u, gy) {
  const top = gy - 15;
  if (u < 0.3) { const s = v.seg(u, 0, 0.3); return { x: v.lerp(x0, 166, s), y: gy + v.hop(v.phase(s, 0.5), 3) }; }
  if (u < 0.45) { const s = v.seg(u, 0.3, 0.45); return { x: v.lerp(166, 196, s), y: v.lerp(gy, top, s) + v.hop(s, 12) }; }
  if (u < 0.62) { const s = v.seg(u, 0.45, 0.62); return { x: v.lerp(196, 226, s), y: top + v.hop(v.phase(s, 0.5), 3) }; }
  const s = v.seg(u, 0.62, 1); return { x: v.lerp(226, x1, s), y: v.lerp(top, gy, s) + v.hop(s, 24) };
}
function pw13BhScene(v, t) {
  const ctx = v.ctx, gy = 146, L = PW13BH_L, mrX = 176, g0 = 188, g1 = 242, mx = 58;
  const w1 = Math.PI * 2 / L;
  // the night sky: deep purple down to a pumpkin-orange glow, stars and a big friendly harvest moon
  const sky = ctx.createLinearGradient(0, 0, 0, gy);
  sky.addColorStop(0, '#231a4a'); sky.addColorStop(0.5, '#4a2f72'); sky.addColorStop(0.85, '#a2557a'); sky.addColorStop(1, '#f0915a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, v.W, v.H);
  for (let i = 0; i < 16; i++) {
    const tw = 0.45 + 0.5 * Math.abs(Math.sin(t * w1 * (1 + (i % 3)) + i));
    ctx.fillStyle = 'rgba(255,245,220,' + tw.toFixed(3) + ')';
    ctx.fillRect(v.rand(i * 3 + 1) * v.W, 4 + v.rand(i * 3 + 2) * 80, 1.8, 1.8);
  }
  const ox = 262, oy = 38;
  v.fillCircle(ox, oy, 34, 'rgba(255,170,90,0.14)'); v.fillCircle(ox, oy, 26, 'rgba(255,170,90,0.2)'); v.fillCircle(ox, oy, 20, '#ffb867');
  v.fillCircle(ox - 8, oy - 8, 4, '#f7a352'); v.fillCircle(ox + 10, oy + 8, 3, '#f7a352');
  ctx.strokeStyle = 'rgba(150,80,40,0.6)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(ox + d * 6, oy, 2.6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(ox, oy + 6, 4, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); ctx.lineCap = 'butt';
  pw13BhBat(v, 120 + Math.sin(t * w1) * 16, 34 + Math.sin(t * w1 * 2) * 6, 0.7, t * w1 * 18);
  pw13BhBat(v, 214 + Math.sin(t * w1 + 2) * 12, 22 + Math.sin(t * w1 * 3 + 1) * 4, 0.55, t * w1 * 21 + 1);
  // far hills with a little chapel, then a near hill
  ctx.fillStyle = '#3d2a62'; ctx.beginPath(); ctx.moveTo(0, v.H);
  for (let x = 0; x <= v.W; x += 8) ctx.lineTo(x, 108 + Math.sin(x * 0.02 + 1.1) * 8 + Math.sin(x * 0.05) * 3);
  ctx.lineTo(v.W, v.H); ctx.fill();
  ctx.fillRect(96, 92, 22, 18); ctx.beginPath(); ctx.moveTo(93, 93); ctx.lineTo(107, 82); ctx.lineTo(121, 93); ctx.fill();
  ctx.fillRect(112, 76, 7, 20); ctx.beginPath(); ctx.moveTo(110, 77); ctx.lineTo(115.5, 68); ctx.lineTo(121, 77); ctx.fill();
  ctx.fillStyle = 'rgba(255,190,110,0.8)'; ctx.fillRect(100, 97, 4, 5); ctx.fillRect(108, 97, 4, 5);
  ctx.fillStyle = '#2f2150'; ctx.beginPath(); ctx.moveTo(0, v.H);
  for (let x = 0; x <= v.W; x += 8) ctx.lineTo(x, 128 + Math.sin(x * 0.035 + 3.4) * 5);
  ctx.lineTo(v.W, v.H); ctx.fill();
  // a crooked old tree and two headstones
  ctx.strokeStyle = '#1d1433'; ctx.lineCap = 'round';
  ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(14, gy); ctx.quadraticCurveTo(10, 100, 18, 62); ctx.stroke();
  ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(16, 82); ctx.quadraticCurveTo(30, 70, 44, 72); ctx.quadraticCurveTo(48, 72, 47, 64); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(15, 94); ctx.quadraticCurveTo(2, 86, -2, 72); ctx.stroke();
  ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(18, 64); ctx.quadraticCurveTo(26, 52, 20, 44); ctx.stroke(); ctx.lineCap = 'butt';
  for (const [x, h, tilt] of [[128, 24, -0.06]]) {
    ctx.save(); ctx.translate(x, gy + 2); ctx.rotate(tilt);
    ctx.fillStyle = '#6f6790'; ctx.strokeStyle = '#3f365e'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-10, -h + 10); ctx.arc(0, -h + 10, 10, Math.PI, 0); ctx.lineTo(10, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    v.text('RIP', 0, -h + 11, 7, '#2a2145', 'center', true);
    ctx.restore();
  }
  // the ground: dark earth with a mossy top, and an open grave with a springy mattress
  for (const [x0, x1] of [[0, g0], [g1, v.W]]) {
    ctx.fillStyle = '#3b2c47'; ctx.fillRect(x0, gy, x1 - x0, v.H - gy);
    ctx.fillStyle = '#41734a'; ctx.fillRect(x0, gy, x1 - x0, 7);
    ctx.fillStyle = '#5f9a52'; ctx.fillRect(x0, gy, x1 - x0, 4);
    for (let x = x0 + 3; x < x1 - 6; x += 11) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + 3, gy - 3 - (x % 3)); ctx.lineTo(x + 6, gy); ctx.fill(); }
  }
  ctx.fillStyle = '#4a3958'; for (const [x, y] of [[40, 162], [100, 170], [150, 160], [290, 168]]) { ctx.beginPath(); ctx.ellipse(x, y, 4, 2.6, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#160f29'; ctx.fillRect(g0, gy, g1 - g0, v.H - gy);
  ctx.fillStyle = '#2a1f3a'; ctx.fillRect(g0, gy, 4, v.H - gy); ctx.fillRect(g1 - 4, gy, 4, v.H - gy);
  const boing = v.seg(t, 4.15, 4.6), mb = Math.sin(boing * Math.PI * 3) * (1 - boing) * 2.5;
  ctx.fillStyle = '#ff8fb1'; v.rr(g0 + 6, 165 + mb, g1 - g0 - 12, 11, 4); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (let x = g0 + 12; x < g1 - 10; x += 9) ctx.fillRect(x, 166 + mb, 3, 9);
  pw13BhLantern(v, 312, gy - 8, 9, 0.5 + 0.5 * Math.sin(t * w1 * 6) * (t > 5.4 ? 1 : 0.3));

  // ---- the story ----
  const popT = 1.1, carry0 = 1.6, carry1 = 2.6, inT = 2.85, tip0 = 3.75, tip1 = 4.15;
  const grow = t < inT ? 0 : v.ease.back(v.seg(t, inT, inT + 0.45));
  const tipK = v.ease.in(v.seg(t, tip0, tip1)) - Math.sin(v.seg(t, tip1, tip1 + 0.22) * Math.PI) * 0.07;
  // the dig mound: shrinks as they dig, then a ring of loose dirt with the two shovels stuck in it
  const dug = v.seg(t, 0, popT), ms = 1 - dug * 0.45;
  ctx.fillStyle = '#6b4a3a'; ctx.strokeStyle = '#4a3324'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(mx, gy + 1, 22 * ms + 4, 12 * ms, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (t < popT) pw13BhBone(v, mx - 4, gy - 9 * ms + 2, mx + 9, gy - 13 * ms + 2, 6);
  else { ctx.fillStyle = '#2a1d30'; ctx.beginPath(); ctx.ellipse(mx, gy - 4, 9, 3, 0, 0, Math.PI * 2); ctx.fill(); }
  // Mr. Bones (behind the heroes: they walk over him once he's a bridge)
  const lookAt = t < inT ? -0.8 : t < tip0 ? -0.5 : 0.6;
  pw13BhMr(v, mrX, gy - 7 * v.ease.out(v.seg(t, tip0, tip1)), Math.max(0, grow), tipK, t, lookAt);
  // the heroes
  let pip = { x: 36, y: gy, face: 1, sq: 0, mood: 'happy' }, bo = { x: 80, y: gy, face: -1, sq: 0, mood: 'happy' };
  const digs = [];
  if (t < popT + 0.05) {
    for (const [h, off] of [[pip, 0], [bo, 0.22]]) {
      const u = v.phase(t + 0.44 - off, 0.44), down = u < 0.45 ? v.ease.out(u / 0.45) : 1 - v.ease.inOut(v.seg(u, 0.45, 1));
      h.sq = down * 0.18; h.mood = down > 0.6 ? 'blink' : 'happy';
      digs.push({ h, down, u });
    }
  } else if (t < carry0) {
    const land = v.seg(t, 1.42, 1.6);
    if (land > 0 && land < 1) { pip.sq = bo.sq = Math.sin(land * Math.PI) * 0.3; }
    pip.mood = bo.mood = t < 1.42 ? 'wow' : 'joy';
  } else if (t < tip1 + 0.15) {
    const d = 76 * v.ease.inOut(v.seg(t, carry0, carry1)), bob = t < carry1 ? v.hop(v.phase(t - carry0, 0.3), 4) : 0;
    pip = { x: 36 + d, y: gy + bob, face: 1, sq: 0, mood: 'happy' };
    bo = { x: 80 + d, y: gy + bob, face: 1, sq: 0, mood: 'happy' };
    if (t > inT) { pip.mood = bo.mood = t < tip0 ? 'joy' : 'wow'; pip.y = bo.y = gy + v.hop(v.seg(t, inT + 0.05, inT + 0.4), 9); }
  } else {
    const ub = v.seg(t, 4.3, 5.2), up = v.seg(t, 4.5, 5.45);
    const b = pw13BhCross(v, 156, 294, ub, gy), p = pw13BhCross(v, 112, 266, up, gy);
    bo = { x: b.x, y: b.y, face: 1, sq: 0, mood: ub > 0.6 && ub < 1 ? 'joy' : 'happy' };
    pip = { x: p.x, y: p.y, face: 1, sq: 0, mood: up > 0.6 && up < 1 ? 'joy' : 'happy' };
    if (t > 5.45) {   // made it! hop and cheer
      for (const [h, off, f] of [[pip, 0, 1], [bo, 0.25, -1]]) { h.y = gy + v.hop(v.phase(t - 5.45 + off, 0.5), 10); h.mood = 'joy'; h.face = f; }
    }
  }
  // the big bone: pops out of the mound, lands across both heads, rides along, then flies into Mr. Bones
  const headY = gy - 30;
  if (t >= popT && t < inT) {
    let bx = mx, by = headY, ang = 0, len = 50;
    if (t < 1.5) { const u = v.seg(t, popT, 1.5); by = v.lerp(gy - 10, headY, u) + v.hop(u, 40); ang = (1 - v.ease.out(u)) * Math.PI * 2; }
    else if (t < carry1) { bx = (pip.x + bo.x) / 2; by = (pip.y + bo.y) / 2 - 30; }
    else { const u = v.ease.inOut(v.seg(t, carry1, inT)); bx = v.lerp((pip.x + bo.x) / 2, mrX, u); by = v.lerp(headY, gy - 42, u); ang = u * Math.PI / 2; len = v.lerp(50, 28, u); }
    const cx = Math.cos(ang) * len / 2, cy = Math.sin(ang) * len / 2;
    pw13BhBone(v, bx - cx, by - cy, bx + cx, by + cy, 10);
  }
  for (const d of digs) {   // shovels in hand while digging
    const h = d.h, f = h.face, hy = h.y - 12;
    pw13BhShovel(v, h.x + f * 6, hy, mx - f * (14 - d.down * 6), gy - 18 + d.down * 14);
  }
  if (t >= popT + 0.05) { pw13BhShovel(v, mx - 13, gy - 24, mx - 5, gy - 4); pw13BhShovel(v, mx + 14, gy - 23, mx + 6, gy - 4); }
  v.hero(0, pip.x, pip.y, { s: 1.1, face: pip.face, sq: pip.sq, mood: pip.mood });
  v.hero(1, bo.x, bo.y, { s: 1.1, face: bo.face, sq: bo.sq, mood: bo.mood });
  // flung dirt: each dig tosses clods back over the digger's head
  for (const d of digs) {
    for (let q = 0; q < 2; q++) {
      const u = v.seg(d.u, 0.4 + q * 0.1, 0.95);
      if (u <= 0 || u >= 1) continue;
      const f = d.h.face, x = mx - f * (8 + u * (30 + q * 14)), y = v.lerp(gy - 10, gy - 2, u) + v.hop(u, 26 + q * 8);
      v.fillCircle(x, y, 2.6 - q * 0.5, '#7a5844');
    }
  }
  // words and sparkles
  if (t < popT) { const pulse = 1 + Math.sin(t * Math.PI * 2 / 0.44) * 0.06; ctx.save(); ctx.translate(mx, 92); ctx.scale(pulse, pulse); v.label('Dig dig!', 0, 0, 16, v.c.gold); ctx.restore(); }
  v.sparkle(mx - 10, gy - 30, v.seg(t, popT, popT + 0.4), v.c.gold, 9); v.sparkle(mx + 12, gy - 40, v.seg(t, popT + 0.1, popT + 0.5), '#fff', 8);
  if (t > inT && t < inT + 0.5) {
    const f = v.seg(t, inT, inT + 0.5);
    ctx.save(); ctx.globalAlpha *= (1 - f) * 0.7; v.fillCircle(mrX, gy - 48, 16 + f * 26, '#fff6c8'); ctx.restore();
  }
  if (t > 0.15 && t < carry1) {   // Mr. Bones dreams of his missing backbone
    const a = Math.min(v.seg(t, 0.15, 0.4), 1 - v.seg(t, carry1 - 0.25, carry1)), bob = Math.sin(t * w1 * 4) * 2;
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = 'rgba(255,255,255,0.95)';
    v.circle(mrX + 9, gy - 56, 2.5); ctx.fill(); v.circle(mrX + 14, gy - 63, 3.5); ctx.fill();
    ctx.beginPath(); ctx.ellipse(mrX + 30, gy - 80 + bob, 21, 13, 0, 0, Math.PI * 2); ctx.fill();
    pw13BhBone(v, mrX + 20, gy - 75 + bob, mrX + 40, gy - 85 + bob, 7);
    ctx.restore();
  }
  if (t > inT && t < inT + 0.6) { const f = v.seg(t, inT, inT + 0.6); v.label('Clack!', mrX - 52, gy - 78 - f * 8, 15, '#fff'); }
  if (t > 3.05 && t < 3.75) v.bubble('My backbone!', mrX, gy - 90, { size: 11 });
  if (t > tip1 && t < 4.7) {
    const f = v.ease.back(v.seg(t, tip1, tip1 + 0.25));
    ctx.save(); ctx.translate((g0 + g1) / 2, 86); ctx.scale(f, f); v.label('BRIDGE!', 0, 0, 20, v.c.gold); ctx.restore();
  }
  v.puff(g1 + 4, gy - 4, v.seg(t, tip1 - 0.05, tip1 + 0.4));
  if (t > 5.4) {
    v.confetti(280, gy - 34, v.seg(t, 5.4, 6.6), 18);
    for (let q = 0; q < 2; q++) { const f = v.seg(t, 5.55 + q * 0.35, 6.4 + q * 0.35); if (f > 0 && f < 1) { ctx.save(); ctx.globalAlpha *= 1 - f; v.heart(242 + q * 8, gy - 26 - f * 30, 5); ctx.restore(); } }
  }
}
definePreview('Graveyard Bone Hunt', {
  blurb: 'Dig up Mr. Bones’ lost bones: each one makes him a better helper!',
  loop: PW13BH_L, still: 4.85,
  draw(v, t) {
    pw13BhScene(v, t);
    const f = v.seg(t, PW13BH_L - 0.45, PW13BH_L);   // fade the opening frame in over the end: no seam
    if (f > 0) { v.ctx.save(); v.ctx.globalAlpha *= v.ease.inOut(f); pw13BhScene(v, 0); v.ctx.restore(); }
  },
});
/* ----- END 13-2 Graveyard Bone Hunt ----- */

/* ----- BEGIN 13-3 Haunted Mansion ----- */
/* ----- END 13-3 Haunted Mansion ----- */

/* ----- BEGIN 13-4 Broomstick Race ----- */
/* ----- END 13-4 Broomstick Race ----- */

