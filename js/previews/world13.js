/* Pip & Bo - Level previews for World 13 Spooky Hollow (Halloween, silly-spooky). See js/previews/preview-core.js.
   Top-level helpers are prefixed pw13. Each level's preview sits between its own BEGIN/END lines. */
'use strict';

/* ----- BEGIN 13-1 Pumpkin Patch Roll ----- */
// side-on: Pip pushes the giant pumpkin up the hill while Bo rides on top leaning forward; on the crest Pip leapfrogs
// over to the front and holds it back down the steep slope and over the pond bridge; then Pip leapfrogs back behind it
// and both of them get it up the ramp onto the hayride wagon (Pip pushing, Bo leaning), where it gets its carved grin
const pw13PumpkinR = 24, pw13PumpkinL = 6.5;
// the rolling surface: hill, crest, steep drop, the bridge (y 150), a plank ramp and the wagon bed (y 128)
function pw13PumpkinGY(x) {
  const ss = u => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
  if (x < 30) return 150;
  if (x < 122) return 150 - 32 * ss((x - 30) / 92);
  if (x < 136) return 118;
  if (x < 176) return 118 + 32 * ss((x - 136) / 40);
  if (x < 238) return 150;
  if (x < 254) return 150 - 22 * (x - 238) / 16;
  return 128;
}
// the pumpkin's centre over x: the lowest spot where a circle of radius R still rests on the surface
function pw13PumpkinCY(x) {
  const R = pw13PumpkinR;
  let y = Infinity;
  for (let d = -R; d <= R; d += 4) y = Math.min(y, pw13PumpkinGY(x + d) - Math.sqrt(R * R - d * d));
  return y;
}
// the giant pumpkin (like the level's), centre (x, y), turned by ang; face 0..1 pops in the carved grin
function pw13PumpkinBall(v, x, y, ang, face) {
  const ctx = v.ctx, R = pw13PumpkinR, TAU = Math.PI * 2, fl = 0.85 + 0.15 * Math.sin(v.t * 9);
  if (face > 0) { v.fillCircle(x, y, R * 1.9, 'rgba(255,200,90,' + (0.28 * face * fl).toFixed(3) + ')'); v.fillCircle(x, y, R * 1.4, 'rgba(255,210,110,' + (0.22 * face).toFixed(3) + ')'); }
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  v.fillCircle(0, 0, R, '#f07a1e');
  ctx.fillStyle = '#ff9233'; ctx.beginPath(); ctx.ellipse(0, 0, R * 0.72, R * 0.98, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffa547'; ctx.beginPath(); ctx.ellipse(0, 0, R * 0.36, R * 0.96, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#c4581a'; ctx.lineWidth = 1.8;
  for (const k of [0.36, 0.72]) { ctx.beginPath(); ctx.ellipse(0, 0, R * k, R * 0.98, 0, 0, TAU); ctx.stroke(); }
  ctx.strokeStyle = '#a8460f'; ctx.lineWidth = 2.4; v.circle(0, 0, R - 1); ctx.stroke();
  ctx.fillStyle = 'rgba(255,230,170,0.45)'; ctx.beginPath(); ctx.ellipse(-R * 0.5, -R * 0.35, R * 0.12, R * 0.3, 0.4, 0, TAU); ctx.fill();
  // the stem, a leaf and a curly vine
  ctx.fillStyle = '#6b7a2a'; ctx.beginPath(); ctx.moveTo(-3.5, -R + 3); ctx.lineTo(-2.5, -R - 7); ctx.quadraticCurveTo(1, -R - 10, 5, -R - 8); ctx.lineTo(3.5, -R + 3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#5f9a4c'; ctx.beginPath(); ctx.ellipse(-7, -R - 3, 5.5, 2.8, -0.5, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#5f9a4c'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(4, -R - 5); ctx.quadraticCurveTo(11, -R - 9, 10, -R - 2); ctx.arc(7.5, -R - 2, 2.5, 0, Math.PI * 1.5); ctx.stroke();
  ctx.restore();
  if (face <= 0) return;
  // the carved face, always facing you: triangle eyes, a nose and a big goofy grin with one tooth
  ctx.save(); ctx.translate(x, y); const s = (R / 46) * v.ease.back(Math.min(1, face)); ctx.scale(s, s);
  const path = () => {
    ctx.beginPath(); ctx.moveTo(-26, -6); ctx.lineTo(-15, -24); ctx.lineTo(-5, -6); ctx.closePath();
    ctx.moveTo(5, -6); ctx.lineTo(15, -24); ctx.lineTo(26, -6); ctx.closePath();
    ctx.moveTo(-4, 2); ctx.lineTo(0, -5); ctx.lineTo(4, 2); ctx.closePath();
    ctx.moveTo(-30, 8); ctx.quadraticCurveTo(0, 44, 30, 8); ctx.quadraticCurveTo(14, 18, 6, 16); ctx.lineTo(6, 24); ctx.lineTo(-2, 24); ctx.lineTo(-2, 17); ctx.quadraticCurveTo(-16, 18, -30, 8); ctx.closePath();
  };
  ctx.fillStyle = '#5a2208'; path(); ctx.fill();
  ctx.translate(0, 2); ctx.scale(0.9, 0.88); ctx.fillStyle = 'rgba(255,226,120,' + fl.toFixed(3) + ')'; path(); ctx.fill();
  ctx.restore();
}
// a little patch pumpkin sitting at (x, y)
function pw13PumpkinMini(v, x, y, r) {
  const ctx = v.ctx;
  ctx.fillStyle = '#e8741c'; ctx.beginPath(); ctx.ellipse(x, y - r * 0.8, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(150,55,10,0.65)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, y - r * 0.8, r * 0.4, r * 0.78, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#5b7a2a'; ctx.fillRect(x - 1, y - r * 1.75, 2, r * 0.4);
}
// a friendly bat, wings flapping by f (-1..1)
function pw13PumpkinBat(v, x, y, s, f) {
  const ctx = v.ctx;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#2a1d44';
  for (const sd of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(sd * 12, -10 - f * 12, sd * 24, -4 - f * 14);
    ctx.quadraticCurveTo(sd * 18, 0, sd * 16, 4); ctx.quadraticCurveTo(sd * 10, 2, sd * 7, 6); ctx.closePath(); ctx.fill();
  }
  ctx.beginPath(); ctx.ellipse(0, 1, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(-3, -11); ctx.lineTo(-1, -6); ctx.moveTo(5, -5); ctx.lineTo(3, -11); ctx.lineTo(1, -6); ctx.fill();
  v.fillCircle(-2.5, -1, 1.8, '#ffe08a'); v.fillCircle(2.5, -1, 1.8, '#ffe08a');
  ctx.restore();
}
// the backdrop, the same at both ends of the loop: night sky, moon, far farm, the patch, the pond and the hayride
function pw13PumpkinBack(v, t) {
  const ctx = v.ctx, L = pw13PumpkinL, TAU = Math.PI * 2, gy = pw13PumpkinGY;
  const sky = ctx.createLinearGradient(0, 0, 0, v.H);
  sky.addColorStop(0, '#241b4d'); sky.addColorStop(0.45, '#5a3a86'); sky.addColorStop(0.75, '#c46a7a'); sky.addColorStop(1, '#f0915a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, v.W, v.H);
  ctx.fillStyle = '#fff4d8';
  for (let i = 0; i < 16; i++) { ctx.globalAlpha = 0.45 + 0.4 * Math.sin(TAU * t / L * (1 + i % 3) + i * 1.7); v.circle(8 + v.rand(i * 3 + 1) * 304, 6 + v.rand(i * 5 + 2) * 60, 0.8 + v.rand(i + 9) * 0.8); ctx.fill(); }
  ctx.globalAlpha = 1;
  // the big harvest moon
  const mx = 52, my = 40;
  v.fillCircle(mx, my, 34, 'rgba(255,170,90,0.16)'); v.fillCircle(mx, my, 26, 'rgba(255,186,100,0.28)'); v.fillCircle(mx, my, 20, '#ffc86e');
  for (const [dx, dy, r] of [[-7, -5, 4], [6, 4, 3], [-2, 9, 2.2], [9, -8, 2]]) v.fillCircle(mx + dx, my + dy, r, '#f5b357');
  // a bat flaps across early in the loop (off screen at both ends, so out of the way of the leapfrog and the payoff)
  const bu = v.seg(t, 0, 2.1); if (bu > 0 && bu < 1) pw13PumpkinBat(v, -24 + bu * 368, 24 + Math.sin(bu * TAU) * 8, 0.55, Math.sin(t * 22) * 0.8);
  // far hills with a barn (lit window) and a windmill
  const hy = x => 112 + Math.sin(x * 0.02 + 1) * 7 + Math.sin(x * 0.047) * 3;
  ctx.fillStyle = '#5a3f78'; ctx.beginPath(); ctx.moveTo(0, v.H); for (let x = 0; x <= v.W; x += 10) ctx.lineTo(x, hy(x)); ctx.lineTo(v.W, v.H); ctx.fill();
  ctx.fillStyle = '#3f2c5a';
  const bx = 112, by = hy(112) + 3;
  ctx.beginPath(); ctx.moveTo(bx - 15, by); ctx.lineTo(bx - 15, by - 15); ctx.lineTo(bx - 9, by - 23); ctx.lineTo(bx + 9, by - 23); ctx.lineTo(bx + 15, by - 15); ctx.lineTo(bx + 15, by); ctx.fill();
  v.fillCircle(bx, by - 16, 7, 'rgba(255,207,110,0.25)'); ctx.fillStyle = '#ffcf6e'; ctx.fillRect(bx - 3, by - 19, 6, 5);
  ctx.fillStyle = '#3f2c5a'; const wx = 196, wy = hy(196) + 3; ctx.fillRect(wx - 1.5, wy - 30, 3, 30);
  ctx.save(); ctx.translate(wx, wy - 30); ctx.rotate(TAU * t / L);
  for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.fillRect(-1, 0, 2, 13); ctx.fillRect(-3, 4, 6, 8); }
  ctx.restore();
  // the soil, cut away into a pond under the bridge
  const basin = x => (x > 178 && x < 238 ? 26 * Math.pow(Math.sin(Math.PI * (x - 178) / 60), 0.6) : 0);
  ctx.fillStyle = '#2b4a80'; ctx.fillRect(178, 157, 60, 30);
  ctx.fillStyle = 'rgba(255,200,120,0.4)';
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(208 + Math.sin(TAU * t / L * 2 + k) * 2, 161 + k * 5, 11 - k * 3, 1.3, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#4f9a54'; ctx.beginPath(); ctx.ellipse(190, 159, 6, 2, 0, 0.3, TAU - 0.1); ctx.lineTo(190, 159); ctx.fill();
  v.fillCircle(192, 157.5, 1.8, '#ffb3d1');
  ctx.fillStyle = '#4a2f2a'; ctx.beginPath(); ctx.moveTo(0, v.H);
  for (let x = 0; x <= v.W; x += 4) ctx.lineTo(x, (x < 238 ? gy(x) : 150) + basin(x));
  ctx.lineTo(v.W, v.H); ctx.fill();
  ctx.strokeStyle = 'rgba(30,18,20,0.4)'; ctx.lineWidth = 6; ctx.beginPath();
  for (let x = 0; x <= v.W; x += 8) { const y = (x < 238 ? gy(x) : 150) + 18 + basin(x) * 0.5; if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  ctx.stroke();
  ctx.strokeStyle = v.c.grass; ctx.lineWidth = 3.5; ctx.lineJoin = 'round';
  for (const [a, b] of [[0, 180], [236, 320]]) { ctx.beginPath(); for (let x = a; x <= b; x += 4) { const y = (x < 238 ? gy(x) : 150) + 1; if (x === a) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); }
  // patch pumpkins and vines along the way
  ctx.strokeStyle = '#3f7a3c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(4, 152); ctx.quadraticCurveTo(14, 148, 22, 152); ctx.moveTo(60, gy(60) + 2); ctx.quadraticCurveTo(70, gy(70) - 2, 80, gy(80) + 2); ctx.stroke();
  pw13PumpkinMini(v, 10, 152, 6); pw13PumpkinMini(v, 74, gy(74) + 2, 5); pw13PumpkinMini(v, 150, gy(150) + 2, 4.5);
  // the hayride: ramp, posts with a string of glowing jack-o'-lanterns, hay bale at the back
  ctx.fillStyle = '#b87b4c'; ctx.strokeStyle = '#7a4c2c'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(236, 151); ctx.lineTo(255, 128); ctx.lineTo(255, 133); ctx.lineTo(240, 151); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6b4630'; ctx.fillRect(254, 34, 4, 94); ctx.fillRect(314, 34, 4, 94);
  ctx.strokeStyle = '#6b4630'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(256, 37); ctx.quadraticCurveTo(286, 54, 316, 37); ctx.stroke();
  for (let k = 0; k < 4; k++) {
    const u = (k + 0.5) / 4, px = 256 + 60 * u, py = 37 + 17 * 4 * u * (1 - u) * 0.85 + 6, f = 0.75 + 0.25 * Math.sin(TAU * t / L * 5 + k);
    v.fillCircle(px, py, 7, 'rgba(255,190,90,' + (0.25 * f).toFixed(3) + ')');
    v.fillCircle(px, py, 4, '#ff8a1f'); ctx.fillStyle = 'rgba(255,236,140,' + f.toFixed(3) + ')'; ctx.fillRect(px - 2.2, py - 1.5, 1.6, 1.6); ctx.fillRect(px + 0.6, py - 1.5, 1.6, 1.6); ctx.fillRect(px - 2, py + 1, 4, 1.1);
  }
  ctx.fillStyle = '#d9a63a'; v.rr(302, 110, 22, 18, 4); ctx.fill(); ctx.fillStyle = '#e8bd55'; v.rr(302, 110, 22, 6, 3); ctx.fill();
  ctx.strokeStyle = '#a8761e'; ctx.lineWidth = 1; for (let k = 306; k < 320; k += 4) { ctx.beginPath(); ctx.moveTo(k, 113); ctx.lineTo(k + 1.5, 127); ctx.stroke(); }
  // the wagon's red side boards and wheels
  ctx.fillStyle = '#b8423a'; v.rr(252, 128, 70, 12, 3); ctx.fill(); ctx.fillStyle = '#d65a4a'; ctx.fillRect(252, 130, 70, 3);
  for (const wx2 of [266, 306]) {
    v.fillCircle(wx2, 141, 9, '#3a2a40'); v.fillCircle(wx2, 141, 3.5, '#e8c36a');
    ctx.strokeStyle = '#e8c36a'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4; ctx.moveTo(wx2 + Math.cos(a) * 3, 141 + Math.sin(a) * 3); ctx.lineTo(wx2 + Math.cos(a) * 8, 141 + Math.sin(a) * 8); ctx.moveTo(wx2 - Math.cos(a) * 3, 141 - Math.sin(a) * 3); ctx.lineTo(wx2 - Math.cos(a) * 8, 141 - Math.sin(a) * 8); }
    ctx.stroke();
  }
}
// the bridge over the pond, sagging by sag where the pumpkin is (at px)
function pw13PumpkinBridge(v, px, sag) {
  const ctx = v.ctx;
  ctx.fillStyle = '#6b4630'; ctx.fillRect(186, 150, 3, 20); ctx.fillRect(228, 150, 3, 20);
  for (let x = 178; x < 238; x += 6) {
    const d = sag * Math.max(0, 1 - Math.abs(x + 3 - px) / 34);
    ctx.fillStyle = x % 12 ? v.c.plank : '#b5743f'; v.rr(x, 150 + d, 5.6, 5, 1.5); ctx.fill();
  }
}
// where everyone is at time t (s): the pumpkin's x, Pip, Bo's lean and the carve
function pw13PumpkinPose(v, t) {
  const R = pw13PumpkinR, e = v.ease;
  let px;
  if (t < 2.0) px = v.lerp(50, 126, e.inOut(v.seg(t, 0.25, 2.0)));
  else if (t < 2.6) px = v.lerp(126, 132, v.seg(t, 2.0, 2.6));
  else if (t < 3.7) px = v.lerp(132, 206, e.inOut(v.seg(t, 2.6, 3.7)));
  else px = v.lerp(206, 270, e.inOut(v.seg(t, 4.15, 4.9)));
  const s = { px, py: pw13PumpkinCY(px), ang: (px - 50) / R, sag: 0, carve: v.seg(t, 5.0, 5.35), sparkle: v.seg(t, 4.85, 5.15) };
  if (px > 180 && px < 236) s.sag = 2.5 * Math.sin(Math.PI * (px - 180) / 56);
  if (px > 180 && px < 236) s.py += s.sag;
  // Bo on top: phi is where on the top Bo stands (+ forward), lean tips the body
  const joy = t > 5.0;
  s.bo = t < 2.0 ? { phi: 0.14, lean: 0.28, mood: 'grit' } : t < 2.6 ? { phi: 0.05, lean: 0, mood: 'wow' } : t < 3.7 ? { phi: -0.14, lean: -0.32, mood: 'grit' }
    : t < 4.15 ? { phi: 0, lean: 0, mood: 'wow' } : t < 4.9 ? { phi: 0.16, lean: 0.3, mood: 'grit' } : { phi: 0, lean: 0, mood: joy ? 'joy' : 'happy' };
  // Pip: pushes from behind, leapfrogs over (a flip over Bo's head), holds it back from the front, leapfrogs back,
  // pushes it up the wagon ramp (a climb takes both of them), then steps back and cheers
  const front = px + R + 6, back = px - R - 7;
  if (t < 2.0) s.pip = { x: back, y: pw13PumpkinGY(back), rot: 0.3, face: 1, mood: 'grit', step: 1 };
  else if (t < 2.6) {
    const u = v.seg(t, 2.0, 2.6), x = v.lerp(back, front, e.inOut(u));
    s.pip = { x, y: v.lerp(pw13PumpkinGY(back), pw13PumpkinGY(front), u) + v.hop(u, 100), rot: e.inOut(v.seg(u, 0.15, 0.85)) * Math.PI * 2, face: 1, mood: 'joy', air: 1 };
  } else if (t < 3.7) s.pip = { x: front, y: pw13PumpkinGY(front) + (front > 180 && front < 236 ? s.sag * 0.4 : 0), rot: -0.3, face: -1, mood: 'grit', step: 1 };
  else if (t < 4.15) {
    const u = v.seg(t, 3.7, 4.15), x = v.lerp(front, back, e.inOut(u));
    s.pip = { x, y: 150 + v.hop(u, 100), rot: -e.inOut(v.seg(u, 0.15, 0.85)) * Math.PI * 2, face: -1, mood: 'joy', air: 1 };
  } else if (t < 4.9) s.pip = { x: back, y: pw13PumpkinGY(back) + (back > 180 && back < 236 ? s.sag * 0.4 : 0), rot: 0.3, face: 1, mood: 'grit', step: 1 };
  else {
    const u = e.inOut(v.seg(t, 4.9, 5.15)), x = v.lerp(back, 226, u);
    s.pip = { x, y: pw13PumpkinGY(x), rot: 0, face: 1, mood: joy ? 'joy' : 'happy', cheer: joy };
  }
  return s;
}
definePreview('Pumpkin Patch Roll', {
  blurb: 'One pushes a giant pumpkin, one rides on top and leans. Roll it to the hayride!',
  loop: pw13PumpkinL, still: 2.3,
  draw(v, t) {
    const L = pw13PumpkinL, ctx = v.ctx, from = L - 0.5;
    pw13PumpkinBack(v, t);
    if (t <= from) { this.scene(v, t); return; }
    const a = v.ease.inOut(v.seg(t, from, L));
    ctx.save(); ctx.globalAlpha *= 1 - a; this.scene(v, t); ctx.restore();
    ctx.save(); ctx.globalAlpha *= a; this.scene(v, 0); ctx.restore();
  },
  scene(v, t) {
    const s = pw13PumpkinPose(v, t), R = pw13PumpkinR, p = s.pip, b = s.bo;
    pw13PumpkinBridge(v, s.px, s.sag);
    pw13PumpkinBall(v, s.px, s.py, s.ang, s.carve);
    if (s.sparkle > 0) for (let i = 0; i < 4; i++) v.star(s.px + Math.cos(t * 20 + i * 1.6) * R * 0.6, s.py + Math.sin(t * 17 + i) * R * 0.4, 5 * (1 - s.sparkle) + 1, '#fff', t * 5);
    // Bo on top, stepping to keep the balance (hops for joy at the end)
    const bx = s.px + Math.sin(b.phi) * R, by = s.py - Math.cos(b.phi) * R + 1;
    const bHop = t > 5.0 ? v.hop(v.phase(t, 0.5), 9) : v.hop(v.phase(t, 0.36), 1.6);
    v.hero(1, bx, by + bHop, { s: 0.9, face: 1, rot: b.lean, mood: b.mood, shadow: false });
    // Pip
    const pHop = p.cheer ? v.hop(v.phase(t, 0.5, 0.25), 9) : p.step ? v.hop(v.phase(t, 0.4), 2) : 0;
    v.hero(0, p.x, p.y + pHop, { s: 0.9, face: p.face, rot: p.rot, mood: p.mood, shadow: !p.air, sq: p.step ? 0.08 : 0 });
    if (p.step && t > 0.3) v.puff(p.x - 6 * p.face, p.y, v.phase(t, 0.4));
    // the beats, big and short
    if (t > 0.35 && t < 1.9) v.label('PUSH!', Math.max(30, p.x - 6), p.y - 38, 15, v.c.gold);
    if (t > 2.0 && t < 2.65) v.label('LEAPFROG!', 214, 52, 15, '#bfe8ff');
    if (t > 2.75 && t < 3.65) v.label('SLOW...', 200, 44, 15, '#bfe8ff');
    if (t > 3.7 && t < 4.15) v.label('LEAPFROG!', 112, 60, 15, '#bfe8ff');
    if (t > 4.2 && t < 4.9) v.label('PUSH!', 190, 112, 15, v.c.gold);
    if (t > 5.05) {
      const pop = v.ease.back(v.seg(t, 5.05, 5.35));
      v.label('HAYRIDE!', 196, 30, 18 * pop, v.c.gold);
      v.confetti(s.px, s.py - R, v.seg(t, 5.05, 6.2));
    }
  },
});
/* ----- END 13-1 Pumpkin Patch Roll ----- */

/* ----- BEGIN 13-2 Graveyard Bone Hunt ----- */
// Pip and Bo dig up a big bone, carry it together on their heads and toss it over the open grave to Mr. Bones (a skull
// sitting on his hips), it snaps in as his backbone, he stretches up tall and tips back over the grave as a bridge (head
// on the near bank, toes on the far one, like the real level), and they hop across him to cheer.
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
// Mr. Bones, feet at (x, feet): grow 0..1 is his new backbone (with ribs and arms), tip 0..1 lays him down to the left
function pw13BhMr(v, x, feet, grow, tip, t, look) {
  const ctx = v.ctx, sp = 28 * grow, rot = -tip * Math.PI / 2, hipY = -27;
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
// a shovel held at hand (hx, hy) with its blade at (bx, by), s scales the blade and grip
function pw13BhShovel(v, hx, hy, bx, by, s) {
  const ctx = v.ctx, a = Math.atan2(by - hy, bx - hx);
  v.line(hx, hy, bx, by, '#3a2418', 3.4 * s + 1.6); v.line(hx, hy, bx, by, '#b07a4c', 3.4 * s);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(a); v.line(0, -3.5 * s, 0, 3.5 * s, '#3a2418', 2.6 * s); ctx.restore();
  ctx.save(); ctx.translate(bx, by); ctx.rotate(a); ctx.scale(s, s);
  ctx.fillStyle = '#dcd6ee'; ctx.strokeStyle = '#3f3560'; ctx.lineWidth = 1.4;
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
// one hero's trip over Mr. Bones the bridge (u 0..1): walk to the edge, hop over his head onto his ribs, walk across,
// hop down off his toes
function pw13BhCross(v, x0, x1, u, gy) {
  const top = gy - 16;
  if (u < 0.3) { const s = v.seg(u, 0, 0.3); return { x: v.lerp(x0, 140, s), y: gy + v.hop(v.phase(s, 0.5), 3) }; }
  if (u < 0.5) { const s = v.seg(u, 0.3, 0.5); return { x: v.lerp(140, 180, s), y: v.lerp(gy, top, s) + v.hop(s, 22) }; }
  if (u < 0.72) { const s = v.seg(u, 0.5, 0.72); return { x: v.lerp(180, 214, s), y: top + v.hop(v.phase(s, 0.5), 3) }; }
  const s = v.seg(u, 0.72, 1); return { x: v.lerp(214, x1, s), y: v.lerp(top, gy, s) + v.hop(s, 16) };
}
function pw13BhScene(v, t) {
  const ctx = v.ctx, gy = 146, L = PW13BH_L, mrX = 230, g0 = 168, g1 = 218, mx = 58;
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
  const ox = 284, oy = 38;
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
  pw13BhLantern(v, 128, gy - 29, 8, 0.5 + 0.5 * Math.sin(t * w1 * 6) * (t > 5.5 ? 1 : 0.3));   // sat on the headstone

  // ---- the story ----
  const popT = 1.1, carry0 = 1.6, carry1 = 2.6, inT = 2.85, tip0 = 3.75, tip1 = 4.15;
  const grow = t < inT ? 0 : v.ease.back(v.seg(t, inT, inT + 0.45));
  const tipK = v.ease.in(v.seg(t, tip0, tip1)) - Math.sin(v.seg(t, tip1, tip1 + 0.22) * Math.PI) * 0.07;
  // the dig mound: shrinks as they dig, then a ring of loose dirt with the two shovels stuck in it
  const dug = v.seg(t, 0, popT), ms = 1 - dug * 0.45;
  ctx.fillStyle = '#7a5440'; ctx.strokeStyle = '#3e2a1e'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.ellipse(mx, gy + 1, 26 * ms + 4, 17 * ms, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#946a50'; ctx.beginPath(); ctx.ellipse(mx - 6 * ms, gy - 9 * ms, 9 * ms, 3.5 * ms, -0.2, 0, Math.PI * 2); ctx.fill();
  if (t < popT) pw13BhBone(v, mx - 6, gy - 13 * ms + 2, mx + 10, gy - 18 * ms + 2, 8);
  else { ctx.fillStyle = '#2a1d30'; ctx.beginPath(); ctx.ellipse(mx, gy - 4, 9, 3, 0, 0, Math.PI * 2); ctx.fill(); }
  // Mr. Bones (behind the heroes: they walk over him once he's a bridge)
  const lookAt = t < tip0 ? -0.8 : t < 5.1 ? -0.6 : 0.7;
  pw13BhMr(v, mrX, gy - 7 * v.ease.out(v.seg(t, tip0, tip1)), Math.max(0, grow), tipK, t, lookAt);
  // the heroes
  const gather = v.ease.inOut(v.seg(t, popT, 1.5));   // step in from the dig spots to stand under the bone
  let pip = { x: v.lerp(20, 36, gather), y: gy, face: 1, sq: 0, mood: 'happy' }, bo = { x: v.lerp(96, 80, gather), y: gy, face: -1, sq: 0, mood: 'happy' };
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
    const d = 60 * v.ease.inOut(v.seg(t, carry0, carry1)), bob = t < carry1 ? v.hop(v.phase(t - carry0, 0.3), 4) : 0;
    pip = { x: 36 + d, y: gy + bob, face: 1, sq: 0, mood: 'happy' };
    bo = { x: 80 + d, y: gy + bob, face: 1, sq: 0, mood: 'happy' };
    if (t > inT) { pip.mood = bo.mood = t < tip0 ? 'joy' : 'wow'; pip.y = bo.y = gy + v.hop(v.seg(t, inT + 0.05, inT + 0.4), 9); }
  } else {
    const ub = v.seg(t, 4.35, 5.35), up = v.seg(t, 4.54, 5.54);
    const b = pw13BhCross(v, 140, 288, ub, gy), p = pw13BhCross(v, 96, 254, up, gy);
    bo = { x: b.x, y: b.y, face: 1, sq: 0, mood: ub > 0.7 && ub < 1 ? 'joy' : 'happy' };
    pip = { x: p.x, y: p.y, face: 1, sq: 0, mood: up > 0.7 && up < 1 ? 'joy' : 'happy' };
    if (t > 5.55) {   // made it! hop and cheer
      for (const [h, off, f] of [[pip, 0, 1], [bo, 0.25, -1]]) { h.y = gy + v.hop(v.phase(t - 5.55 + off, 0.5), 10); h.mood = 'joy'; h.face = f; }
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
  if (t >= popT + 0.05) { pw13BhShovel(v, mx - 15, gy - 28, mx - 6, gy - 5, 1.2); pw13BhShovel(v, mx + 16, gy - 27, mx + 7, gy - 5, 1.2); }
  v.hero(0, pip.x, pip.y, { s: 1.1, face: pip.face, sq: pip.sq, mood: pip.mood });
  v.hero(1, bo.x, bo.y, { s: 1.1, face: bo.face, sq: bo.sq, mood: bo.mood });
  for (const d of digs) {   // big shovels in hand while digging, drawn over the heroes so they always show
    const h = d.h, f = h.face;
    pw13BhShovel(v, h.x + f * 4, h.y - 30 + d.down * 8, mx - f * (24 - d.down * 10), gy - 18 + d.down * 13, 1.5);
  }
  // flung dirt: each dig tosses clods back over the digger's head
  for (const d of digs) {
    for (let q = 0; q < 2; q++) {
      const u = v.seg(d.u, 0.4 + q * 0.1, 0.95);
      if (u <= 0 || u >= 1) continue;
      const f = d.h.face, x = mx - f * (8 + u * (30 + q * 14)), y = v.lerp(gy - 10, gy - 2, u) + v.hop(u, 26 + q * 8);
      v.fillCircle(x, y, 4 - q * 0.8, '#946a50');
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
    v.circle(mrX - 9, gy - 56, 2.5); ctx.fill(); v.circle(mrX - 14, gy - 63, 3.5); ctx.fill();
    ctx.beginPath(); ctx.ellipse(mrX - 30, gy - 80 + bob, 21, 13, 0, 0, Math.PI * 2); ctx.fill();
    pw13BhBone(v, mrX - 40, gy - 75 + bob, mrX - 20, gy - 85 + bob, 7);
    ctx.restore();
  }
  if (t > inT && t < inT + 0.6) { const f = v.seg(t, inT, inT + 0.6); v.label('Clack!', mrX - 52, gy - 78 - f * 8, 15, '#fff'); }
  if (t > 3.05 && t < 3.75) v.bubble('My backbone!', mrX - 22, gy - 90, { size: 11 });
  if (t > tip1 && t < 4.7) {
    const f = v.ease.back(v.seg(t, tip1, tip1 + 0.25));
    ctx.save(); ctx.translate((g0 + g1) / 2, 86); ctx.scale(f, f); v.label('BRIDGE!', 0, 0, 20, v.c.gold); ctx.restore();
  }
  v.puff(g0 - 6, gy - 4, v.seg(t, tip1 - 0.05, tip1 + 0.4));
  if (t > 5.5) {
    v.confetti(271, gy - 36, v.seg(t, 5.5, 6.6), 18);
    for (let q = 0; q < 2; q++) { const f = v.seg(t, 5.6 + q * 0.35, 6.4 + q * 0.3); if (f > 0 && f < 1) { ctx.save(); ctx.globalAlpha *= 1 - f; v.heart(258 + q * 14, gy - 26 - f * 30, 5); ctx.restore(); } }
  }
}
definePreview('Graveyard Bone Hunt', {
  blurb: 'Dig up Mr. Bones’ lost bones: each one makes him a better helper!',
  loop: PW13BH_L, still: 5.04,
  draw(v, t) {
    pw13BhScene(v, t);
    const f = v.seg(t, PW13BH_L - 0.45, PW13BH_L);   // fade the opening frame in over the end: no seam
    if (f > 0) { v.ctx.save(); v.ctx.globalAlpha *= v.ease.inOut(f); pw13BhScene(v, 0); v.ctx.restore(); }
  },
});
/* ----- END 13-2 Graveyard Bone Hunt ----- */

/* ----- BEGIN 13-3 Haunted Mansion ----- */
// side-on, one dim mansion room: Pip holds the flashlight, Bo hops. The light lands on Bo first ("Eep!", frozen), then
// Pip lifts it over Bo's head and the two sleepy ghosts wake up minty; light off, Bo hops up them to the balcony, where
// a haunted portrait swaps Pip and Bo in purple smoke. Now Pip leans over the edge and shines down, the ghosts wake
// again, Bo hops up, and the door opens for both. The ghosts doze off as the loop wraps, so it starts over seamlessly.
const pw13MansionL = 7.2, pw13MansionFloor = 160, pw13MansionLedge = 64, pw13MansionEdge = 222;
// the two sleepy ghost platforms: left x, top y, width, and the times they wake and doze (twice per loop)
const pw13MansionGhosts = [
  { x: 136, y: 124, w: 38, wake: [1.12, 4.12], doze: [3.2, 6.85], ph: 0.4 },
  { x: 180, y: 94, w: 38, wake: [1.26, 4.0], doze: [3.2, 6.85], ph: 1.9 },
];
// how awake ghost g is at time t: 0 asleep, 1 awake (with a pop just after waking and a flicker before dozing off)
function pw13MansionAwake(g, t) {
  for (let i = 0; i < 2; i++) {
    if (t >= g.wake[i] && t < g.doze[i]) {
      const left = g.doze[i] - t, since = t - g.wake[i];
      return { a: left < 0.35 ? (Math.sin(t * 40) > 0 ? 1 : 0.35) : 1, pop: since < 0.25 ? since / 0.25 : 1 };
    }
  }
  return { a: 0, pop: 1 };
}
// a sheet-ghost platform: lying flat, scalloped hem; asleep it is a faint dotted outline with closed eyes and a "z"
function pw13MansionGhost(v, g, t) {
  const ctx = v.ctx, st = pw13MansionAwake(g, t), w = g.w, h = 11;
  const bob = Math.sin(t * Math.PI * 2 / 1.8 + g.ph) * 1.2, x = g.x, y = g.y + bob;
  const path = () => {
    ctx.beginPath(); ctx.moveTo(x + 2, y + h); ctx.lineTo(x + 2, y + 5); ctx.quadraticCurveTo(x + 2, y, x + 8, y);
    ctx.lineTo(x + w - 8, y); ctx.quadraticCurveTo(x + w - 2, y, x + w - 2, y + 5); ctx.lineTo(x + w - 2, y + h);
    const n = 4, sw = (w - 4) / n;
    for (let k = n - 1; k >= 0; k--) ctx.quadraticCurveTo(x + 2 + sw * (k + 0.5), y + h + 5, x + 2 + sw * k, y + h);
    ctx.closePath();
  };
  const cx = x + w / 2;
  ctx.save();
  const a0 = ctx.globalAlpha;
  if (st.a <= 0) {
    ctx.globalAlpha = a0 * (0.62 + 0.12 * Math.sin(t * 3 + g.ph));
    ctx.fillStyle = 'rgba(215,247,255,0.16)'; path(); ctx.fill();
    ctx.strokeStyle = '#d7f7ff'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 3]); path(); ctx.stroke(); ctx.setLineDash([]);
    ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    for (const ex of [cx - 6, cx + 6]) { ctx.beginPath(); ctx.arc(ex, y + 4.5, 2.4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
    const zp = v.phase(t, 1.8, g.ph / 3) * 1.8;
    if (zp < 1.2) { ctx.globalAlpha = a0 * 0.85 * Math.sin(zp / 1.2 * Math.PI); v.text('z', x + w - 4 + zp * 5, y - 5 - zp * 8, 10, '#d7f7ff', 'center', true); }
  } else {
    const s = v.ease.back(st.pop);
    ctx.globalAlpha = a0 * st.a;
    ctx.translate(cx, y + h / 2); ctx.scale(0.7 + 0.3 * s, 0.7 + 0.3 * s); ctx.translate(-cx, -(y + h / 2));
    ctx.fillStyle = 'rgba(140,255,215,0.2)'; ctx.beginPath(); ctx.ellipse(cx, y + 7, w * 0.68, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8fff0'; path(); ctx.fill();
    ctx.strokeStyle = '#3fbf96'; ctx.lineWidth = 1.6; path(); ctx.stroke();
    ctx.fillStyle = v.c.ink;
    for (const ex of [cx - 6, cx + 6]) { ctx.beginPath(); ctx.ellipse(ex, y + 4.5, 1.9, 2.5, 0, 0, Math.PI * 2); ctx.fill(); }
    v.fillCircle(cx - 11, y + 7.5, 1.8, 'rgba(255,140,170,0.7)'); v.fillCircle(cx + 11, y + 7.5, 1.8, 'rgba(255,140,170,0.7)');
    ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, y + 6.5, 2.4, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
  }
  ctx.restore();
  if (st.a > 0 && st.pop < 1) v.sparkle(x + w + 2, y - 4, st.pop, '#c8fff0', 6);
}
// the room, the same at both ends of the loop: wallpaper, the moon window, a candle, the floor, the pit and the balcony
function pw13MansionBack(v, t) {
  const ctx = v.ctx, F = pw13MansionFloor, Lg = pw13MansionLedge, E = pw13MansionEdge;
  const gr = ctx.createLinearGradient(0, 0, 0, v.H); gr.addColorStop(0, '#45306c'); gr.addColorStop(1, '#2c1f4a');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, v.W, v.H);
  ctx.fillStyle = 'rgba(255,255,255,0.035)'; ctx.beginPath(); for (let x = 6; x < v.W; x += 22) ctx.rect(x, 0, 7, v.H); ctx.fill();
  ctx.fillStyle = 'rgba(255,214,150,0.08)'; ctx.beginPath();
  for (let y = 12; y < v.H; y += 20) for (let x = (y / 20) % 2 > 0.5 ? 11 : 0; x < v.W; x += 22) { ctx.moveTo(x, y - 3); ctx.lineTo(x + 2.5, y); ctx.lineTo(x, y + 3); ctx.lineTo(x - 2.5, y); ctx.closePath(); }
  ctx.fill();
  // the arched window with the big orange moon and a tiny bat
  const wx = 66, wy = 18, ww = 40, wh = 64;
  ctx.fillStyle = '#1b1430'; ctx.beginPath(); ctx.moveTo(wx - ww / 2 - 4, wy + wh + 3); ctx.lineTo(wx - ww / 2 - 4, wy + ww / 2); ctx.arc(wx, wy + ww / 2, ww / 2 + 4, Math.PI, 0); ctx.lineTo(wx + ww / 2 + 4, wy + wh + 3); ctx.closePath(); ctx.fill();
  const sky = ctx.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#2b2155'); sky.addColorStop(1, '#b05e7c');
  ctx.fillStyle = sky; ctx.beginPath(); ctx.moveTo(wx - ww / 2, wy + wh); ctx.lineTo(wx - ww / 2, wy + ww / 2); ctx.arc(wx, wy + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(wx + ww / 2, wy + wh); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip();
  v.fillCircle(wx + 5, wy + 24, 17, 'rgba(255,160,80,0.35)'); v.fillCircle(wx + 5, wy + 24, 11, '#ffb867'); v.fillCircle(wx + 2, wy + 21, 2.5, 'rgba(200,110,50,0.45)');
  const bx = wx - 26 + v.phase(t, pw13MansionL) * 52, by = wy + 44 + Math.sin(t * 3) * 3, fl = Math.sin(t * 18) * 3;
  ctx.fillStyle = '#1b1430'; ctx.beginPath(); ctx.moveTo(bx - 7, by - fl); ctx.quadraticCurveTo(bx - 3, by - 2, bx, by + 1); ctx.quadraticCurveTo(bx + 3, by - 2, bx + 7, by - fl); ctx.quadraticCurveTo(bx + 3, by + 3, bx, by + 3); ctx.quadraticCurveTo(bx - 3, by + 3, bx - 7, by - fl); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#1b1430'; ctx.fillRect(wx - 1.5, wy + 2, 3, wh); ctx.fillRect(wx - ww / 2, wy + wh * 0.58, ww, 3);
  // cobweb in the corner
  ctx.strokeStyle = 'rgba(230,225,255,0.3)'; ctx.lineWidth = 0.9; ctx.beginPath();
  for (let k = 0; k < 4; k++) { const a = k / 3 * Math.PI / 2; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 30, Math.sin(a) * 30); }
  for (const r of [10, 18, 26]) { ctx.moveTo(r, 0); for (let k = 1; k <= 3; k++) { const a = k / 3 * Math.PI / 2, q = r * (k % 2 ? 0.85 : 1); ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } }
  ctx.stroke();
  // the pit: a dark drop between the floor and the balcony
  const pit = ctx.createLinearGradient(0, 110, 0, v.H); pit.addColorStop(0, 'rgba(14,8,28,0)'); pit.addColorStop(1, 'rgba(14,8,28,0.85)');
  ctx.fillStyle = pit; ctx.fillRect(128, 110, E - 128, v.H - 110);
  // the floor (left) and the balcony wall (right): plum stone with a wooden floorboard top
  const slab = (x, y, w, h) => {
    ctx.fillStyle = '#4a3352'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); for (let ty = y + 12; ty < y + h; ty += 16) for (let tx = x + ((ty - y) / 16 % 2 ? 4 : 12); tx < x + w - 4; tx += 18) ctx.rect(tx, ty, 14, 11); ctx.fill();
    ctx.fillStyle = '#6b4127'; ctx.fillRect(x, y, w, 7); ctx.fillStyle = '#9b6a40'; ctx.fillRect(x, y, w, 5);
    ctx.fillStyle = 'rgba(255,230,180,0.28)'; ctx.fillRect(x, y, w, 1.2);
    ctx.fillStyle = 'rgba(60,30,15,0.5)'; for (let tx = x + 10; tx < x + w; tx += 26) ctx.fillRect(tx, y + 1, 1.5, 4);
  };
  slab(0, F, 128, v.H - F); slab(E, Lg, v.W - E, v.H - Lg);
  // a red carpet runner on the balcony and a balcony rail
  ctx.fillStyle = '#7a2238'; ctx.fillRect(E + 6, Lg - 2, v.W - E - 6, 2);
  // a candle stand by the window (with a warm glow)
  const cx = 18, fy = F, fk = Math.sin(t * 9) * 0.8;
  v.fillCircle(cx, fy - 36, 22, 'rgba(255,170,80,0.12)');
  ctx.fillStyle = '#8a6a2a'; ctx.fillRect(cx - 6, fy - 3, 12, 3); ctx.fillRect(cx - 1.5, fy - 24, 3, 22); ctx.fillRect(cx - 8, fy - 26, 16, 2.5);
  for (const dx of [-6, 0, 6]) {
    ctx.fillStyle = '#f4ead2'; ctx.fillRect(cx + dx - 1.5, fy - 34, 3, 8);
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.ellipse(cx + dx, fy - 37.5 + fk * 0.3, 1.9, 3.6 + fk * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  }
  // dim the whole room: only the candle, the moon and the flashlight light it
  ctx.fillStyle = 'rgba(10,6,24,0.3)'; ctx.fillRect(0, 0, v.W, v.H);
}
// the haunted portrait (a ghost with a moustache whose eyes follow lookX); glow 0..1 lights it up purple
function pw13MansionPortrait(v, x, y, glow, lookX, t) {
  const ctx = v.ctx, w = 24, h = 28, look = v.clamp((lookX - x) / 80, -1, 1) * 1.8;
  v.fillCircle(x, y + h / 2, 26, 'rgba(185,120,255,' + (0.16 + 0.06 * Math.sin(t * 3) + glow * 0.45).toFixed(3) + ')');
  ctx.fillStyle = '#7a5a1a'; v.rr(x - w / 2 - 4, y - 4, w + 8, h + 8, 3); ctx.fill();
  ctx.fillStyle = '#e0b85a'; v.rr(x - w / 2 - 2.5, y - 2.5, w + 5, h + 5, 2); ctx.fill();
  ctx.fillStyle = '#5a3a8a'; ctx.fillRect(x - w / 2, y, w, h);
  ctx.fillStyle = '#eef3ff'; ctx.beginPath(); ctx.arc(x, y + 12, 7.5, Math.PI, 0); ctx.lineTo(x + 7.5, y + h - 2); ctx.lineTo(x - 7.5, y + h - 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = v.c.ink; v.circle(x - 2.6 + look, y + 11, 1.4); ctx.fill(); v.circle(x + 2.6 + look, y + 11, 1.4); ctx.fill();
  ctx.strokeStyle = '#3a2a2a'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 6, y + 13.5); ctx.quadraticCurveTo(x - 4, y + 17.5, x, y + 15); ctx.quadraticCurveTo(x + 4, y + 17.5, x + 6, y + 13.5); ctx.stroke();
  if (glow > 0) {
    ctx.save(); ctx.globalAlpha *= glow; ctx.strokeStyle = '#d6b8ff'; ctx.lineWidth = 1.8;
    for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.arc(x, y + h / 2, 20 + k * 6, t * 6 + k * 2, t * 6 + k * 2 + 3.6); ctx.stroke(); }
    ctx.restore();
  }
}
// the arched door with a jack-o'-lantern knocker; open 0..1 makes it glow
function pw13MansionDoor(v, x, y, open) {
  const ctx = v.ctx, w = 24, h = 34, top = y - h;
  const arch = (dx, r) => { ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x - r, top + 12 + dx); ctx.arc(x, top + 12 + dx, r, Math.PI, 0); ctx.lineTo(x + r, y); ctx.closePath(); };
  ctx.fillStyle = '#2a1a14'; arch(-2, w / 2 + 3); ctx.fill();
  ctx.fillStyle = '#7a4a2a'; arch(0, w / 2); ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,10,0.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x - 4, top + 4); ctx.lineTo(x - 4, y); ctx.moveTo(x + 4, top + 4); ctx.lineTo(x + 4, y); ctx.stroke();
  v.fillCircle(x, top + 18, 4.5, '#ff8a2a');
  ctx.fillStyle = '#ffe36a'; ctx.fillRect(x - 2.5, top + 16.5, 1.8, 1.8); ctx.fillRect(x + 0.8, top + 16.5, 1.8, 1.8); ctx.fillRect(x - 2, top + 19.5, 4, 1);
  if (open > 0) {
    ctx.save(); const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * open;
    const g = ctx.createLinearGradient(0, top, 0, y); g.addColorStop(0, '#fff2c4'); g.addColorStop(1, v.c.glow);
    ctx.fillStyle = g; arch(0, w / 2); ctx.fill();
    ctx.globalAlpha = a0 * open * 0.4; v.fillCircle(x, y - 16, 30, v.c.glow);
    ctx.restore();
  }
}
// the flashlight's warm cone from (ox, oy) along angle a, cut off by the stone (and at len)
function pw13MansionBeam(v, ox, oy, a, half, len, on) {
  if (on <= 0) return;
  const ctx = v.ctx;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, pw13MansionEdge, pw13MansionFloor); ctx.rect(128, pw13MansionFloor, pw13MansionEdge - 128, v.H); ctx.rect(pw13MansionEdge, 0, v.W, pw13MansionLedge); ctx.clip();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= on;
  const g = ctx.createRadialGradient(ox, oy, 3, ox, oy, len);
  g.addColorStop(0, 'rgba(255,236,150,0.6)'); g.addColorStop(0.65, 'rgba(255,220,120,0.3)'); g.addColorStop(1, 'rgba(255,210,110,0.08)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, len, a - half, a + half); ctx.closePath(); ctx.fill();
  ctx.restore();
}
// the flashlight itself, lens at (x, y) pointing along a; the holder's arm reaches to it from (sx, sy)
function pw13MansionLamp(v, sx, sy, x, y, a, on) {
  const ctx = v.ctx;
  v.line(sx, sy, x - Math.cos(a) * 7, y - Math.sin(a) * 7, v.c.pipDark, 4.5);
  v.line(sx, sy, x - Math.cos(a) * 7, y - Math.sin(a) * 7, v.c.pip, 2.6);
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = '#5a5a72'; v.rr(-10, -2.8, 10, 5.6, 1.5); ctx.fill();
  ctx.fillStyle = '#8a8aa8'; v.rr(-2, -4, 4.5, 8, 1.5); ctx.fill();
  ctx.fillStyle = on > 0.5 ? '#fff4b0' : '#3a3a4a'; ctx.fillRect(2, -3.2, 2, 6.4);
  ctx.restore();
}
// purple smoke puffing up at (x, y), k = 0..1
function pw13MansionSmoke(v, x, y, k) {
  if (k <= 0 || k >= 1) return;
  const ctx = v.ctx;
  ctx.save(); ctx.globalAlpha *= Math.sin(k * Math.PI);
  for (let q = 0; q < 7; q++) {
    const a = q / 7 * Math.PI * 2 + k * 2, r = 6 + k * 12;
    v.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.75, 7 + 4 * k, q % 2 ? '#b98cff' : '#d6b8ff');
  }
  v.fillCircle(x, y, 10 + 4 * k, '#c9a6ff');
  ctx.restore();
}
// a hop from (x0, y0) to (x1, y1) over k = 0..1, clearing the higher end by `over` px
function pw13MansionHop(v, k, x0, y0, x1, y1, over = 10) {
  const h = Math.max(0, (y0 - y1) / 2) + over;
  return [v.lerp(x0, x1, k), v.lerp(y0, y1, k) + v.hop(k, h)];
}
definePreview('Haunted Mansion', {
  blurb: 'One shines the light to wake sleepy ghosts, the other hops up on them!',
  loop: pw13MansionL, still: 1.42,
  draw(v, t) {
    const L = pw13MansionL, k = t / L, from = 0.952, ctx = v.ctx;
    pw13MansionBack(v, t);
    if (k <= from) { this.scene(v, t, 3); return; }
    // the crossfade back to the start: the props that never move are drawn once at full strength (the ghosts are
    // asleep and bob on a 1.8 s beat that fits the loop; the portrait's eyes swing back to Bo, the door's glow dims),
    // and only Pip, Bo and the cheering fade between the two passes
    const a = v.ease.inOut(v.seg(k, from, 1));
    this.props(v, t, v.lerp(250, 108, a), 0, 1 - a);
    ctx.save(); ctx.globalAlpha *= 1 - a; this.scene(v, t, 2); ctx.restore();
    ctx.save(); ctx.globalAlpha *= a; this.scene(v, 0, 2); ctx.restore();
  },
  // the ghosts, the portrait (eyes on lookX, glow pg) and the door (open 0..1)
  props(v, t, lookX, pg, open) {
    for (const g of pw13MansionGhosts) pw13MansionGhost(v, g, t);
    pw13MansionPortrait(v, 200, 12, pg, lookX, t);
    pw13MansionDoor(v, 302, pw13MansionLedge, open);
  },
  // parts: 1 the props, 2 Pip, Bo, the light and the effects, 3 both
  scene(v, t, parts) {
    const ctx = v.ctx, F = pw13MansionFloor, Lg = pw13MansionLedge, E = pw13MansionEdge, Gs = pw13MansionGhosts;
    const G1 = Gs[0], G2 = Gs[1], bob = g => Math.sin(t * Math.PI * 2 / 1.8 + g.ph) * 1.2;
    const top1 = G1.y + bob(G1), top2 = G2.y + bob(G2), c1 = G1.x + G1.w / 2, c2 = G2.x + G2.w / 2;
    const SWAP = 242;   // where Bo stands under the portrait when it swaps him with Pip
    // ----- Bo (the mover): where his feet are
    const hop = (a, b, x0, y0, x1, y1) => { const kk = v.ease.inOut(v.seg(t, a, b)); return pw13MansionHop(v, kk, x0, y0, x1, y1); };
    let bx, by, bAir = false, bLand = -9, bFace = 1;
    if (t < 1.55) { bx = 108; by = F; }
    else if (t < 1.95) { [bx, by] = hop(1.55, 1.95, 108, F, c1, top1); bAir = true; }
    else if (t < 2.05) { bx = c1; by = top1; bLand = 1.95; }
    else if (t < 2.42) { [bx, by] = hop(2.05, 2.42, c1, top1, c2, top2); bAir = true; }
    else if (t < 2.5) { bx = c2; by = top2; bLand = 2.42; }
    else if (t < 2.88) { [bx, by] = hop(2.5, 2.88, c2, top2, 238, Lg); bAir = true; }
    else if (t < 3.24) { bx = v.lerp(238, SWAP, v.ease.out(v.seg(t, 2.88, 3.0))); by = Lg; bLand = 2.88; }
    else if (t < 4.5) { bx = 92; by = F; }
    else if (t < 4.88) { [bx, by] = hop(4.5, 4.88, 92, F, c1, top1); bAir = true; }
    else if (t < 4.98) { bx = c1; by = top1; bLand = 4.88; }
    else if (t < 5.34) { [bx, by] = hop(4.98, 5.34, c1, top1, c2, top2); bAir = true; }
    else if (t < 5.42) { bx = c2; by = top2; bLand = 5.34; }
    else if (t < 5.8) { [bx, by] = hop(5.42, 5.8, c2, top2, 240, Lg); bAir = true; }
    else { bx = v.lerp(240, 250, v.ease.inOut(v.seg(t, 5.8, 6.0))); by = Lg; bLand = 5.8; }
    if (t > 2.95 && t < 3.24) bFace = -1;   // turns to the portrait... and to Pip
    // ----- Pip (the holder): where Pip is and what the light does
    let px, py, pFace = 1, pRot = 0, light = 0, lx, ly, la, len, sx, sy, half = 0.19;
    if (t < 3.24) {
      px = t < 1.6 ? 46 : v.lerp(46, 92, v.ease.inOut(v.seg(t, 1.6, 2.6))); py = F;
      const lift = v.ease.inOut(v.seg(t, 0.98, 1.3)) * (1 - v.ease.inOut(v.seg(t, 1.6, 1.85)));
      sx = px + 7; sy = py - 13;
      lx = px + 13 + lift * 0; ly = py - 13 - lift * 20;
      la = -0.19 * lift; len = v.lerp(bx - 9 - lx, 175, lift);
      light = v.seg(t, 0.34, 0.4) * (1 - v.seg(t, 1.5, 1.58));
    } else {
      // after the swap: Pip is on the balcony, walks to the edge, leans over and shines down
      const walk = v.ease.inOut(v.seg(t, 3.45, 3.78)), go = v.ease.inOut(v.seg(t, 4.5, 5.3));
      px = go > 0 ? v.lerp(230, 276, go) : v.lerp(SWAP, 230, walk); py = Lg;
      pFace = go > 0 ? 1 : -1;
      const lean = v.ease.out(v.seg(t, 3.78, 3.92)) * (1 - v.ease.inOut(v.seg(t, 4.4, 4.55)));
      pRot = -0.32 * lean;
      sx = px - 6; sy = py - 14;
      lx = px - 8 - lean * 10; ly = py - 10 + lean * 6;
      la = Math.PI - 0.95 * lean - 0.05; len = 104; half = 0.21;
      light = v.seg(t, 3.9, 3.96) * (1 - v.seg(t, 4.36, 4.44));
      if (go > 0) { sx = px + 6; lx = px + 10; ly = py - 10; la = 0; }
    }
    const eep = t > 0.38 && t < 1.2;
    // ----- the light, the ghosts, the portrait and the door
    if (parts & 2) pw13MansionBeam(v, lx, ly, la, half, len, light);
    if (parts & 1) this.props(v, t, bx, v.seg(t, 2.95, 3.12) * (1 - v.seg(t, 3.4, 3.6)), v.ease.out(v.seg(t, 6.0, 6.25)));
    if (!(parts & 2)) return;
    // ----- the swap: both vanish in purple smoke and come back in each other's place
    const sw = v.seg(t, 3.12, 3.62), gone = t > 3.2 && t < 3.3;
    const fadeOut = 1 - v.seg(t, 3.12, 3.22), fadeIn = v.seg(t, 3.28, 3.4);
    const heroA = t < 3.24 ? fadeOut : fadeIn;
    // ----- Pip
    const pHop = t > 6.1 ? v.hop(v.phase(t - 6.1, 0.5), 9) : 0;
    const pMood = t > 6.05 ? 'joy' : eep ? 'wow' : t > 3.9 && t < 4.4 ? 'grit' : 'happy';
    if (!gone) {
      v.hero(0, px, py + pHop, { face: pFace, rot: pRot, mood: pMood, alpha: heroA });
      if (t < 4.5 || light > 0) { ctx.save(); ctx.globalAlpha *= heroA; pw13MansionLamp(v, sx, sy + pHop, lx, ly + pHop, la, light); ctx.restore(); }
    }
    // ----- Bo
    const jit = eep ? Math.sin(t * 70) * 1.1 : 0, land = v.seg(t, bLand, bLand + 0.12);
    const bSq = bAir ? -0.12 : land > 0 && land < 1 ? 0.25 * (1 - land) : eep ? -0.15 : 0;
    const bHop = t > 6.15 ? v.hop(v.phase(t - 6.15, 0.5, 0.25), 9) : 0;
    const bMood = eep ? 'wow' : t > 6.05 ? 'joy' : 'happy';
    if (!gone) v.hero(1, bx + jit, by + bHop, { face: bFace, sq: bSq, mood: bMood, alpha: heroA });
    if (eep) {
      // the spooked shiver: little lines on both sides and a sweat drop
      const j = Math.sin(t * 50) * 1.2;
      for (const d of [-1, 1]) for (let q = 0; q < 2; q++) v.line(bx + d * (15 + q * 4) + j, by - 20 + q * 7, bx + d * (18 + q * 4) + j, by - 15 + q * 7, 'rgba(255,255,255,0.9)', 1.6);
      ctx.fillStyle = '#8fd8ff'; ctx.beginPath(); ctx.moveTo(bx + 11, by - 30); ctx.quadraticCurveTo(bx + 14.5, by - 25, bx + 11, by - 23.5); ctx.quadraticCurveTo(bx + 7.5, by - 25, bx + 11, by - 30); ctx.fill();
      const pop = v.ease.back(v.seg(t, 0.4, 0.55));
      v.label('Eep!', bx + 2, by - 44, 17 * pop, '#fff');
    }
    pw13MansionSmoke(v, 92, F - 12, sw); pw13MansionSmoke(v, SWAP, Lg - 12, sw);
    if (sw > 0 && sw < 1) {
      // two sparks cross over on a purple arc: Pip's goes up, Bo's comes down
      const u = v.ease.inOut(v.seg(t, 3.18, 3.36));
      const arc = (q) => [v.lerp(92, SWAP, q), v.lerp(F - 14, Lg - 14, q) - Math.sin(q * Math.PI) * 40];
      if (u > 0 && u < 1) { const [ax, ay] = arc(u), [cx2, cy2] = arc(1 - u); v.fillCircle(ax, ay, 5, v.c.pip); v.fillCircle(cx2, cy2, 5, v.c.bo); v.star(ax, ay, 3, '#fff'); v.star(cx2, cy2, 3, '#fff'); }
      v.label('Swap!', 150, 34, 15 * v.ease.back(v.seg(t, 3.15, 3.3)), '#d6b8ff');
    }
    if (t > 2.95 && t < 3.16) v.pill('⇄', 236, 20, { size: 11, col: v.c.gold });
    // ----- the payoff: the door glows open, hearts and confetti
    if (t > 6.0) {
      v.heart(263, 30 - v.seg(t, 6.1, 6.9) * 6, 5 * v.ease.back(v.seg(t, 6.05, 6.25)));
      v.confetti(302, 36, v.seg(t, 6.05, 6.95), 18);
      v.label('Hooray!', 262, 13, 17 * v.ease.back(v.seg(t, 6.05, 6.25)), v.c.gold);
    }
  },
});
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

