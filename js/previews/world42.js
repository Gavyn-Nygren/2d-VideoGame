/* Pip & Bo - World page previews: World 42 Midnight Theme Park (42-1 Runaway Coaster). See js/previews/preview-core.js. */
'use strict';

/* 42-1 Runaway Coaster, drawn flat and side-on (the level itself is 3D; a preview never loads it). A 6 s loop:
     0.0 - 2.2  the Comet's front car clanks up the lift hill (the chain ratchets, tickets flutter by the rail)
     2.2 - 2.7  over the crest: hands up for the camera (flash!)
     2.7 - 4.0  down the drop and swooping along the bottom, tickets snatched as it passes
     4.0 - 6.0  a gold double-arrow bend: both lean together, sparks fly off the wheels
   Behind: a midnight sky, the moon, a ferris wheel and a carousel lit with chasing bulbs. A pure function of t.
   Every helper starts with pw42. */
const PW42 = { sky0: '#0b0b26', sky1: '#3a2860', track: '#a89ad0', trackDk: '#5a4a8a', gold: '#ffd24a', cream: '#f2e6c8', ink: '#1a1530' };

// the track: a side-on curve from the station (left) up the lift, over the crest, down and along the bottom
const PW42_PTS = [[-20, 150], [40, 150], [70, 146], [150, 52], [168, 44], [186, 52], [232, 150], [260, 158], [340, 158]];
function pw42At(u) {
  // u 0..1 along the polyline by length -> { x, y, a (slope angle) }
  const P = PW42_PTS; let tot = 0; const ls = [];
  for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); ls.push(l); tot += l; }
  let d = clamp(u, 0, 1) * tot;
  for (let i = 0; i < ls.length; i++) {
    if (d <= ls[i] || i === ls.length - 1) { const k = clamp(d / ls[i], 0, 1), a = P[i], b = P[i + 1]; return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, a: Math.atan2(b[1] - a[1], b[0] - a[0]) }; }
    d -= ls[i];
  }
  return { x: 0, y: 0, a: 0 };
}
function pw42Sky(v, t) {
  const c = v.ctx, W = v.W, H = v.H, g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, PW42.sky0); g.addColorStop(0.7, PW42.sky1); g.addColorStop(1, '#6a3a6a');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7); c.fillStyle = `rgba(255,255,240,${0.3 + tw * 0.6})`; c.fillRect(v.rand(i) * W, v.rand(i + 99) * H * 0.6, 1.2, 1.2); }
  // the moon with a soft halo
  const mg = c.createRadialGradient(276, 34, 6, 276, 34, 34); mg.addColorStop(0, 'rgba(255,240,200,0.45)'); mg.addColorStop(1, 'rgba(255,240,200,0)');
  c.fillStyle = mg; c.fillRect(230, 0, 92, 80); c.fillStyle = '#fff3cf'; v.circle(276, 34, 12); c.fill();
  c.fillStyle = 'rgba(200,180,140,0.35)'; v.circle(272, 31, 2.6); c.fill(); v.circle(280, 38, 1.8); c.fill();
}
// a ferris wheel with chasing bulbs
function pw42Wheel(v, x, y, r, t) {
  const c = v.ctx;
  c.strokeStyle = 'rgba(160,140,220,0.55)'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(x - r * 0.5, y + r + 22); c.lineTo(x, y); c.lineTo(x + r * 0.5, y + r + 22); c.stroke();
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + t * 0.3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.stroke(); }
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2 + t * 0.3, on = (i + Math.floor(t * 8)) % 3 === 0; c.fillStyle = on ? '#fff6c0' : ['#ff6a9a', '#7ae0ff', '#ffd24a'][i % 3]; v.circle(x + Math.cos(a) * r, y + Math.sin(a) * r, on ? 1.8 : 1.2); c.fill(); }
}
// a little lit carousel tent
function pw42Carousel(v, x, y, t) {
  const c = v.ctx;
  c.fillStyle = '#3a2a5a'; c.fillRect(x - 22, y - 14, 44, 14);
  for (let i = 0; i < 5; i++) { const hx = x - 18 + ((i * 9 + t * 14) % 40), hy = y - 7 + Math.sin(t * 4 + i) * 2; c.fillStyle = ['#f2e6c8', '#ffb0c8', '#b0e0ff'][i % 3]; v.rr(hx - 3, hy - 2, 6, 4, 2); c.fill(); }
  c.fillStyle = '#c83a4a'; c.beginPath(); c.moveTo(x - 26, y - 14); c.lineTo(x, y - 30); c.lineTo(x + 26, y - 14); c.closePath(); c.fill();
  c.fillStyle = '#f4e8d0'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x - 26 + i * 13, y - 14); c.lineTo(x, y - 30); c.lineTo(x - 19.5 + i * 13, y - 14); c.closePath(); c.fill(); }
  for (let i = 0; i < 9; i++) { c.fillStyle = (i + Math.floor(t * 6)) % 2 ? '#ffd24a' : '#fff6e0'; v.circle(x - 24 + i * 6, y - 14, 1.2); c.fill(); }
}
function pw42Track(v) {
  const c = v.ctx;
  // supports
  c.strokeStyle = 'rgba(90,74,138,0.8)'; c.lineWidth = 1.4;
  for (let u = 0.02; u < 1; u += 0.025) { const p = pw42At(u); if (p.y < 150) { c.beginPath(); c.moveTo(p.x, p.y + 3); c.lineTo(p.x, 172); c.stroke(); } }
  c.strokeStyle = 'rgba(90,74,138,0.45)'; c.lineWidth = 0.8;
  for (let u = 0.02; u < 0.95; u += 0.05) { const a = pw42At(u), b = pw42At(u + 0.05); if (a.y < 150 && b.y < 150) { c.beginPath(); c.moveTo(a.x, a.y + 4); c.lineTo(b.x, 172); c.stroke(); } }
  // the rails, with little bulbs
  c.strokeStyle = PW42.trackDk; c.lineWidth = 4; c.beginPath(); PW42_PTS.forEach((p, i) => (i ? c.lineTo(p[0], p[1] + 2) : c.moveTo(p[0], p[1] + 2))); c.stroke();
  c.strokeStyle = PW42.track; c.lineWidth = 2; c.beginPath(); PW42_PTS.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
}
// the front car with Pip (left seat, nearer the back here) and Bo, tilted with the track; lean rolls them
function pw42Car(v, p, o) {
  const c = v.ctx;
  c.save(); c.translate(p.x, p.y); c.rotate(p.a);
  c.translate(0, -2 + (o.bump || 0)); c.scale(1.4, 1.4);
  c.rotate(o.lean || 0);
  // riders (drawn first, so the tub's rim is in front of their bodies)
  v.hero(0, -6, -2, { s: 0.42, face: 1, mood: o.mood, rot: o.arms ? -0.08 : 0 });
  v.hero(1, 7, -2, { s: 0.42, face: 1, mood: o.mood, rot: o.arms ? 0.08 : 0 });
  if (o.arms) { c.strokeStyle = PW42.ink; c.lineWidth = 1.6; for (const hx of [-10, -2, 3, 11]) { c.beginPath(); c.moveTo(hx, -9); c.lineTo(hx + (hx < 0 ? -2 : 2) * (hx % 2 ? 1 : -1), -20); c.stroke(); } }
  // the tub, gold rim, wheels, star nose
  c.fillStyle = PW42.cream; v.rr(-16, -8, 32, 9, 4); c.fill(); c.strokeStyle = PW42.ink; c.lineWidth = 1; c.stroke();
  c.fillStyle = '#d8a63a'; c.fillRect(-15, -4, 30, 2);
  c.fillStyle = PW42.gold; c.fillRect(-16, -9, 32, 1.6);
  c.fillStyle = '#2a2438'; v.circle(-9, 2, 2.4); c.fill(); v.circle(9, 2, 2.4); c.fill();
  v.star(19, -7, 5, PW42.gold);
  for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? '#ff8ab0' : '#ffe07a'; v.circle(-13 + i * 6.5, -5, 0.9); c.fill(); }
  c.restore();
}

definePreview('Runaway Coaster', {
  blurb: 'The coaster is running with nobody in charge! Lean together, hop the gaps and ride it home.',
  loop: 6,
  still: 4.9,
  draw(v, t) {
    const c = v.ctx;
    pw42Sky(v, t);
    pw42Wheel(v, 86, 70, 34, t);
    pw42Carousel(v, 282, 150, t);
    // the far park: tents and lamp glows along the bottom
    for (let i = 0; i < 9; i++) { const x = 10 + i * 38, g = c.createRadialGradient(x, 166, 0, x, 166, 14); g.addColorStop(0, 'rgba(255,214,140,0.45)'); g.addColorStop(1, 'rgba(255,214,140,0)'); c.fillStyle = g; c.fillRect(x - 14, 152, 28, 28); }
    c.fillStyle = '#1c1838'; c.fillRect(0, 168, v.W, 12);
    // lantern string across the top
    c.strokeStyle = 'rgba(40,30,60,0.8)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(0, 10); c.quadraticCurveTo(110, 30, 220, 12); c.stroke();
    for (let i = 0; i < 10; i++) { const k = i / 9, x = k * 220, y = (1 - k) * (1 - k) * 10 + 2 * (1 - k) * k * 30 + k * k * 12; c.fillStyle = ['#ff6a5a', '#ffd24a', '#7ae0a0', '#ff9ad6'][i % 4]; v.rr(x - 2.5, y, 5, 6, 2); c.fill(); }
    pw42Track(v);
    // the ride: up the lift slowly, over the crest, then fast
    let u;
    if (t < 2.2) u = 0.06 + v.seg(t, 0, 2.2) * 0.32;
    else if (t < 2.7) u = 0.38 + v.seg(t, 2.2, 2.7) * 0.06;
    else if (t < 4.0) u = 0.44 + v.ease.in(v.seg(t, 2.7, 4.0)) * 0.3;
    else u = 0.74 + v.ease.out(v.seg(t, 4.0, 6.0)) * 0.2;
    const p = pw42At(u > 1 ? 1 : u), bend = t > 4.2 && t < 5.8;
    // tickets beside the rail (taken as the car passes)
    for (let i = 0; i < 7; i++) { const tu = 0.18 + i * 0.1, tp = pw42At(tu); if (tu < u - 0.01) continue; c.save(); c.translate(tp.x, tp.y - 14 + Math.sin(t * 4 + i) * 1.5); c.rotate(Math.sin(t * 3 + i) * 0.3); c.fillStyle = PW42.gold; v.rr(-4, -2, 8, 4, 1); c.fill(); c.restore(); }
    // the gold arrow board for the bend
    if (t > 3.6) { const bx = 300, by = 120; c.fillStyle = '#2a2438'; c.fillRect(bx - 1, by, 2, 30); c.fillStyle = '#ffe9a8'; v.rr(bx - 12, by - 10, 24, 14, 2); c.fill(); c.fillStyle = '#c88a10'; for (const dx of [-5, 3]) { c.beginPath(); c.moveTo(bx + dx, by - 7); c.lineTo(bx + dx + 5, by - 3); c.lineTo(bx + dx, by + 1); c.closePath(); c.fill(); } }
    pw42Car(v, p, { lean: bend ? 0.22 : 0, arms: t > 2.25 && t < 3.4, mood: t < 2.2 ? 'wow' : t < 4 ? 'joy' : bend ? 'grit' : 'happy', bump: t < 2.2 ? (Math.floor(t * 8) % 2) * 0.6 : 0 });
    // sparks off the wheels in the bend
    if (bend) for (let i = 0; i < 8; i++) { const k = ((t * 3 + i * 0.13) % 1); c.fillStyle = `rgba(255,${200 + i * 6},120,${1 - k})`; v.circle(p.x - 10 - k * 26, p.y + 2 - k * 10 + k * k * 18, 1.2); c.fill(); }
    // the photo flash at the crest
    const fk = v.seg(t, 2.35, 2.75); if (fk > 0 && fk < 1) { c.fillStyle = `rgba(255,255,255,${(1 - fk) * 0.7})`; c.fillRect(0, 0, v.W, v.H); }
    if (t > 2.3 && t < 3.3) v.label('Hands up!', 168, 24, 10, PW42.gold);
    if (bend) v.label('Lean together!', p.x - 30, p.y - 34, 10, PW42.gold);
    if (t < 2.0) v.text('clack clack clack', 120, 140 - t * 30, 7, 'rgba(255,240,210,0.7)', 'center');
  },
});
