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
/* ----- END 13-3 Haunted Mansion ----- */

/* ----- BEGIN 13-4 Broomstick Race ----- */
/* ----- END 13-4 Broomstick Race ----- */

