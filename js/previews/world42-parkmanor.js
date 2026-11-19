/* Pip & Bo - World page preview: 42-3 Spook Manor. See js/previews/preview-core.js.

   Drawn flat and side-on (the level itself is 3D; a preview never loads it). An 8 s loop down a candlelit hall:
     0.0 - 2.4  Pip walks in with the lantern up; a sheet spook ahead creeps on while it is dark, freezes in the beam
     2.4 - 3.8  Bo steps up and turns the brass key in its back: it winds down and sags (a wisp pops out)
     3.8 - 5.6  the far door opens: Grimsby the Butler's silhouette with a candle; both duck behind the curtain
     5.6 - 8.0  he glides past and is gone; they step out and carry on, a portrait's eyes following them
   Every helper starts with pwm. A pure function of t. */
'use strict';
const PWM = { wall0: '#2a1630', wall1: '#3a2040', dado: '#1c0e16', floor: '#2a1a14', board: '#3a2418', gold: '#d8b060', ink: '#120a14' };

function pwmHall(v, t) {
  const c = v.ctx, W = v.W, H = v.H;
  // damask wallpaper with a stripe and a soft grime at the top
  const g = c.createLinearGradient(0, 0, 0, 132); g.addColorStop(0, '#120a18'); g.addColorStop(0.3, PWM.wall0); g.addColorStop(1, PWM.wall1);
  c.fillStyle = g; c.fillRect(0, 0, W, 132);
  for (let x = 6; x < W; x += 22) for (let y = 30; y < 118; y += 24) { c.fillStyle = 'rgba(120,70,120,0.22)'; c.beginPath(); c.ellipse(x + ((y / 24) % 2) * 11, y, 3.2, 5.2, 0, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = PWM.dado; c.fillRect(0, 112, W, 20); c.fillStyle = 'rgba(216,176,96,0.5)'; c.fillRect(0, 111, W, 1.5);
  // the boards
  c.fillStyle = PWM.floor; c.fillRect(0, 132, W, H - 132);
  c.strokeStyle = PWM.board; c.lineWidth = 1; for (let y = 138; y < H; y += 9) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  for (let i = 0; i < 18; i++) { const x = (v.rand(i) * W) | 0, y = 134 + ((v.rand(i + 30) * 5) | 0) * 9; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 9); c.stroke(); }
  // a long runner
  c.fillStyle = '#5a1420'; c.fillRect(0, 146, W, 14); c.fillStyle = 'rgba(216,176,96,0.6)'; c.fillRect(0, 147, W, 1); c.fillRect(0, 158, W, 1);
  // cobwebs in the top corners
  c.strokeStyle = 'rgba(220,220,235,0.35)'; c.lineWidth = 0.6;
  for (const [x, s] of [[0, 1], [W, -1]]) { for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x, k * 9); c.quadraticCurveTo(x + s * k * 5, k * 5, x + s * k * 9, 0); c.stroke(); } for (let a = 0; a < 4; a++) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + s * Math.cos(a * 0.4) * 30, Math.sin(a * 0.4 + 0.2) * 30); c.stroke(); } }
}
function pwmSconce(v, x, y, t, i) {
  const c = v.ctx, fl = 0.8 + 0.2 * Math.sin(t * 13 + i * 2) * Math.sin(t * 7 + i);
  const g = c.createRadialGradient(x, y - 6, 1, x, y - 6, 34); g.addColorStop(0, `rgba(255,190,110,${0.35 * fl})`); g.addColorStop(1, 'rgba(255,190,110,0)');
  c.fillStyle = g; c.fillRect(x - 36, y - 42, 72, 72);
  c.fillStyle = PWM.gold; c.fillRect(x - 1, y - 2, 2, 8); c.fillRect(x - 5, y + 5, 10, 2);
  c.fillStyle = '#f2e6c8'; c.fillRect(x - 1.5, y - 8, 3, 6); c.fillStyle = '#ffd27a'; c.beginPath(); c.ellipse(x, y - 11, 1.6 * fl, 3 * fl, 0, 0, Math.PI * 2); c.fill();
}
// a portrait whose eyes follow tx
function pwmPortrait(v, x, y, tx, face) {
  const c = v.ctx;
  c.fillStyle = PWM.gold; c.fillRect(x - 15, y - 19, 30, 38); c.fillStyle = '#1a1020'; c.fillRect(x - 12, y - 16, 24, 32);
  c.fillStyle = face; c.beginPath(); c.ellipse(x, y - 2, 7, 9, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#2a1a2a'; c.fillRect(x - 9, y + 7, 18, 9);
  const dx = v.clamp((tx - x) / 60, -1, 1) * 1.6;
  for (const sx of [-1, 1]) { c.fillStyle = '#f8f0e0'; v.circle(x + sx * 3, y - 4, 1.8); c.fill(); c.fillStyle = '#e02a2a'; v.circle(x + sx * 3 + dx, y - 4, 0.9); c.fill(); }
}
// a clockwork sheet spook: a draped sheet with eyes and a brass key in its back; sag 0..1 winds it down
function pwmSheet(v, x, y, t, lit, sag, keyTurn) {
  const c = v.ctx, bob = lit || sag > 0 ? 0 : Math.sin(t * 6) * 1.5, h = 34 * (1 - sag * 0.35);
  c.save(); c.translate(x, y + bob);
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(0, 1, 13, 3, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = lit ? '#f4f0fa' : '#b8b0d0'; c.strokeStyle = PWM.ink; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(-12, 0); for (let i = 0; i <= 6; i++) c.lineTo(-12 + i * 4, i % 2 ? -3 : 0);
  c.quadraticCurveTo(13, -h * 0.7, 0, -h); c.quadraticCurveTo(-13, -h * 0.7, -12, 0); c.closePath(); c.fill(); c.stroke();
  const eye = sag > 0.6 ? '#3a3040' : lit ? '#2a1a3a' : '#ff4a6a';
  for (const sx of [-1, 1]) { c.fillStyle = eye; c.beginPath(); c.ellipse(sx * 3.6 - 1, -h * 0.72, 1.8, sag > 0.6 ? 0.5 : 2.6, 0, 0, Math.PI * 2); c.fill(); }
  // the brass key in its back (facing left, so on its right side)
  c.save(); c.translate(11, -h * 0.5); c.rotate(keyTurn); c.strokeStyle = '#b88a2a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-2, 0); c.lineTo(5, 0); c.stroke();
  c.fillStyle = '#e8c060'; c.beginPath(); c.ellipse(7, -2.4, 2.2, 2.6, 0, 0, Math.PI * 2); c.ellipse(7, 2.4, 2.2, 2.6, 0, 0, Math.PI * 2); c.fill(); c.restore();
  c.restore();
}
// Grimsby the Butler, a tall silhouette with a candle, gliding
function pwmButler(v, x, y, t, a) {
  const c = v.ctx; c.save(); c.globalAlpha = a; c.translate(x, y);
  const g = c.createRadialGradient(10, -44, 1, 10, -44, 30); g.addColorStop(0, 'rgba(255,200,120,0.6)'); g.addColorStop(1, 'rgba(255,200,120,0)'); c.fillStyle = g; c.fillRect(-20, -80, 60, 70);
  c.fillStyle = '#0c0810'; c.beginPath(); c.moveTo(-9, 0); c.lineTo(-7, -40); c.quadraticCurveTo(0, -48, 7, -40); c.lineTo(9, 0); c.lineTo(4, 0); c.lineTo(0, -8); c.lineTo(-4, 0); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(-7, -18); c.lineTo(-13, 0); c.lineTo(-6, -4); c.fill(); c.beginPath(); c.moveTo(7, -18); c.lineTo(13, 0); c.lineTo(6, -4); c.fill();
  c.fillStyle = '#d8d0c8'; c.fillRect(-2.5, -40, 5, 10); c.fillStyle = '#0c0810'; c.beginPath(); c.ellipse(0, -51, 6, 7, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#ff3a3a'; for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * 2.4 + 1, -52, 1, 0, Math.PI * 2); c.fill(); }
  c.strokeStyle = '#0c0810'; c.lineWidth = 2; c.beginPath(); c.moveTo(6, -36); c.lineTo(10, -38); c.stroke();
  c.fillStyle = '#f2e6c8'; c.fillRect(9, -45, 2.4, 6); c.fillStyle = '#ffd27a'; c.beginPath(); c.ellipse(10.2, -48, 1.4, 2.8, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}
function pwmBeam(v, x, y, len, ang, k) {
  const c = v.ctx; c.save(); c.translate(x, y); c.rotate(ang);
  const g = c.createLinearGradient(0, 0, len, 0); g.addColorStop(0, `rgba(255,226,150,${0.55 * k})`); g.addColorStop(1, 'rgba(255,226,150,0)');
  c.fillStyle = g; c.beginPath(); c.moveTo(0, -2); c.lineTo(len, -22); c.lineTo(len, 22); c.lineTo(0, 2); c.closePath(); c.fill(); c.restore();
}

definePreview('Spook Manor', {
  blurb: 'One lantern, one key, and a clockwork butler. Stay in the light!', loop: 8, still: 1.9,
  draw(v, t) {
    const c = v.ctx, W = v.W, k = t % 8;
    pwmHall(v, t);
    // the far door (right): opens for the Butler
    const doorOpen = v.seg(k, 3.8, 4.2) * (1 - v.seg(k, 6.6, 7.0));
    c.fillStyle = '#0a060c'; c.fillRect(276, 52, 36, 80); c.fillStyle = '#4a2a1e'; c.fillRect(276, 52, 36 * (1 - doorOpen * 0.85), 80);
    c.strokeStyle = PWM.gold; c.lineWidth = 1.5; c.strokeRect(274, 50, 40, 82);
    for (const [x, i] of [[58, 0], [156, 1], [252, 2]]) pwmSconce(v, x, 64, t, i);
    pwmPortrait(v, 108, 70, 30 + k * 30, '#c8b8a0'); pwmPortrait(v, 206, 70, 30 + k * 30, '#a8c0b0');
    // the curtain they hide behind (centre-left)
    const hide = v.seg(k, 4.0, 4.4) * (1 - v.seg(k, 6.2, 6.6));
    // heroes: walk in, stop, Bo steps to the spook, back to the curtain, out again
    let px = v.lerp(-20, 120, v.ease.out(v.seg(k, 0, 1.8))), bx = v.lerp(-46, 94, v.ease.out(v.seg(k, 0.2, 2.0)));
    bx = v.lerp(bx, 200, v.ease.inOut(v.seg(k, 2.1, 2.7)));
    px = v.lerp(px, 76, v.ease.inOut(v.seg(k, 3.9, 4.3))); bx = v.lerp(bx, 92, v.ease.inOut(v.seg(k, 3.9, 4.3)));
    px = v.lerp(px, 340, v.ease.in(v.seg(k, 6.8, 8.0))); bx = v.lerp(bx, 316, v.ease.in(v.seg(k, 6.8, 8.0)));
    // the sheet: creeps left in the dark until the beam finds it, then Bo winds it down
    const lit = k > 1.2 && k < 2.6, sag = v.seg(k, 2.9, 3.6) * (1 - v.seg(k, 7.6, 8)), sx = 210 - Math.min(k, 1.2) * 22;
    const beamK = (k < 0.3 ? k / 0.3 : 1) * (1 - hide);
    pwmBeam(v, px + 9, 128, 120, -0.05, beamK);
    pwmSheet(v, sx, 140, t, lit || sag > 0, sag, k > 2.6 && k < 3.4 ? (k - 2.6) * 12 : 0);
    if (k > 3.3 && k < 4.4) { const u = v.seg(k, 3.3, 4.4); c.fillStyle = `rgba(122,255,214,${1 - u})`; v.circle(sx, 100 - u * 30, 4 + u * 3); c.fill(); v.sparkle(sx, 100 - u * 30, u); }
    // the Butler glides from the far door to the left and away
    const bA = v.seg(k, 4.0, 4.4) * (1 - v.seg(k, 6.4, 6.8)), btx = v.lerp(296, 30, v.ease.inOut(v.seg(k, 4.2, 6.6)));
    if (bA > 0) pwmButler(v, btx, 142, t, bA);
    // heroes (behind the curtain they show only as a bulge)
    const hA = 1 - hide * 0.85;
    v.hero(1, bx, 150, { face: (k > 2.5 && k < 3.6) || (k > 4 && k < 6.7) ? -1 : 1, alpha: hA, mood: k > 2.4 && k < 3.6 ? 'grit' : hide > 0.5 ? 'wow' : 'happy' });
    v.hero(0, px, 150, { face: 1, alpha: hA, mood: lit ? 'grit' : hide > 0.5 ? 'wow' : 'happy' });
    
    // the curtain: red velvet with gold tassels, swept closed while they hide
    const cw = 22 + hide * 26;
    c.fillStyle = '#6a0a1a'; c.fillRect(62, 34, cw, 118); c.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 5; i++) c.fillRect(64 + i * cw / 5, 34, 2, 118);
    c.fillStyle = PWM.gold; c.fillRect(58, 30, 60, 4); v.circle(62 + cw, 96, 2.2); c.fill();
    // a pill for the moment
    if (k > 4.4 && k < 6.2) v.pill('Hide!', 60, 22, { size: 10 });
    else if (k > 1.3 && k < 2.6) v.pill('Light it!', sx - 30, 22, { size: 10 });
    else if (k > 2.6 && k < 3.6) v.pill('Wind it down!', sx - 50, 22, { size: 10 });
    // a vignette
    const vg = c.createRadialGradient(W / 2, 100, 60, W / 2, 100, 220); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)'); c.fillStyle = vg; c.fillRect(0, 0, W, v.H);
  },
});
