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
/* ----- END 13-2 Graveyard Bone Hunt ----- */

/* ----- BEGIN 13-3 Haunted Mansion ----- */
/* ----- END 13-3 Haunted Mansion ----- */

/* ----- BEGIN 13-4 Broomstick Race ----- */
/* ----- END 13-4 Broomstick Race ----- */

