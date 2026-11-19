/* Pip & Bo - World page preview: 42-2 Log Flume Plunge (World 42 Midnight Theme Park). See js/previews/preview-core.js.
   Uses the World 42 sky and ferris wheel from js/previews/world42.js (loaded before this file). */
'use strict';

/* 42-2 Log Flume Plunge, drawn flat and side-on (the level itself is 3D; a preview never loads it). A 6 s loop:
     0.0 - 2.0  the beaver-headed log drifts along the top of the falls (Pip in the yellow rain hat in front, Bo in the
                snorkel mask behind), tips over the lip
     2.0 - 3.6  the plunge down the chute, white water streaming with it
     3.6 - 4.6  a huge splash: golden ducks fly up out of it
     4.6 - 6.0  the log bobs on across Splashdown Lagoon, the pair soaked and cheering
   Behind: the midnight sky, the moon and the lit ferris wheel. A pure function of t. Every helper starts with pw42f. */
const PW42F = { wood: '#7a4a2a', woodDk: '#4a2a16', water: '#2a5a8a', waterLt: '#9fd0ff', foam: '#eef8ff', gold: '#ffd24a', ink: '#1a1530' };

// the chute: a cubic from the lip down to the lagoon -> { x, y, a (slope angle) }
const PW42F_C = [[118, 64], [156, 64], [200, 150], [244, 152]];
function pw42fChute(u) {
  const P = PW42F_C, k = 1 - u;
  const x = k * k * k * P[0][0] + 3 * k * k * u * P[1][0] + 3 * k * u * u * P[2][0] + u * u * u * P[3][0];
  const y = k * k * k * P[0][1] + 3 * k * k * u * P[1][1] + 3 * k * u * u * P[2][1] + u * u * u * P[3][1];
  const dx = 3 * k * k * (P[1][0] - P[0][0]) + 6 * k * u * (P[2][0] - P[1][0]) + 3 * u * u * (P[3][0] - P[2][0]);
  const dy = 3 * k * k * (P[1][1] - P[0][1]) + 6 * k * u * (P[2][1] - P[1][1]) + 3 * u * u * (P[3][1] - P[2][1]);
  return { x, y, a: Math.atan2(dy, dx) };
}
// the falls: a tall wooden tower with the top channel, the chute down its side, lamps and a lit sign
function pw42fFalls(v, t) {
  const c = v.ctx;
  // trestle legs under the top channel and the chute
  c.strokeStyle = 'rgba(74,42,22,0.85)'; c.lineWidth = 1.6;
  for (let x = 12; x < 120; x += 14) { c.beginPath(); c.moveTo(x, 70); c.lineTo(x, 162); c.stroke(); }
  for (let u = 0.08; u < 0.8; u += 0.11) { const p = pw42fChute(u); c.beginPath(); c.moveTo(p.x, p.y + 5); c.lineTo(p.x, 162); c.stroke(); }
  c.strokeStyle = 'rgba(74,42,22,0.5)'; c.lineWidth = 0.9;
  for (let x = 12; x < 106; x += 14) { c.beginPath(); c.moveTo(x, 76); c.lineTo(x + 14, 120); c.moveTo(x + 14, 76); c.lineTo(x, 120); c.stroke(); }
  // the top channel (a wooden trough) and its water
  c.fillStyle = PW42F.woodDk; c.fillRect(0, 62, 122, 10);
  c.fillStyle = PW42F.wood; c.fillRect(0, 64, 122, 5);
  c.fillStyle = PW42F.water; c.fillRect(0, 60, 120, 4);
  // the chute: the trough's side, then the white water pouring down it
  c.lineCap = 'round';
  c.strokeStyle = PW42F.woodDk; c.lineWidth = 9; c.beginPath(); for (let u = 0; u <= 1.001; u += 0.05) { const p = pw42fChute(u); u ? c.lineTo(p.x, p.y + 4) : c.moveTo(p.x, p.y + 4); } c.stroke();
  c.strokeStyle = PW42F.wood; c.lineWidth = 5; c.beginPath(); for (let u = 0; u <= 1.001; u += 0.05) { const p = pw42fChute(u); u ? c.lineTo(p.x, p.y + 4) : c.moveTo(p.x, p.y + 4); } c.stroke();
  c.strokeStyle = 'rgba(160,210,255,0.8)'; c.lineWidth = 3; c.beginPath(); for (let u = 0; u <= 1.001; u += 0.05) { const p = pw42fChute(u); u ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); } c.stroke();
  c.lineCap = 'butt';
  for (let i = 0; i < 14; i++) { const u = ((t * 0.9 + i / 14) % 1), p = pw42fChute(u), q = pw42fChute(Math.min(1, u + 0.04)); c.strokeStyle = `rgba(240,250,255,${0.4 + 0.5 * u})`; c.lineWidth = 1.4; c.beginPath(); c.moveTo(p.x, p.y - 1); c.lineTo(q.x, q.y - 1); c.stroke(); }
  // bulbs along the chute's rim
  for (let i = 0; i < 12; i++) { const p = pw42fChute(i / 11), on = (i + Math.floor(t * 6)) % 3 === 0; c.fillStyle = on ? '#fff6c0' : ['#ff6a9a', '#7ae0ff', '#ffd24a'][i % 3]; v.circle(p.x - 2, p.y + 8, on ? 1.5 : 1.1); c.fill(); }
  // the neon sign on the tower
  c.fillStyle = '#241a34'; v.rr(18, 84, 74, 16, 3); c.fill();
  c.save(); c.shadowColor = '#7ad0ff'; c.shadowBlur = 6; v.text('TIMBER FALLS', 55, 95, 8, '#bfe8ff', 'center'); c.restore();
  // a lamp on the top deck
  const g = c.createRadialGradient(8, 50, 0, 8, 50, 16); g.addColorStop(0, 'rgba(255,214,140,0.6)'); g.addColorStop(1, 'rgba(255,214,140,0)'); c.fillStyle = g; c.fillRect(-8, 34, 32, 32);
  c.fillStyle = '#24223a'; c.fillRect(7, 50, 2, 12); c.fillStyle = '#fff0c0'; v.circle(8, 49, 2.2); c.fill();
}
// Splashdown Lagoon along the bottom, with the lights' reflections wobbling in it
function pw42fLagoon(v, t) {
  const c = v.ctx, y0 = 152;
  const g = c.createLinearGradient(0, y0, 0, v.H); g.addColorStop(0, '#2a5a8a'); g.addColorStop(1, '#10284a');
  c.fillStyle = g; c.fillRect(0, y0, v.W, v.H - y0);
  for (let i = 0; i < 26; i++) { const x = (v.rand(i) * v.W + t * 8) % v.W, y = y0 + 4 + v.rand(i + 40) * 22; c.fillStyle = `rgba(160,210,255,${0.25 + 0.2 * Math.sin(t * 3 + i)})`; c.fillRect(x, y, 6 + v.rand(i + 7) * 10, 1); }
  for (const [x, col] of [[250, '#ffd890'], [286, '#ff9ad6'], [212, '#7ae0ff'], [40, '#ffd890']]) for (let k = 0; k < 5; k++) { c.fillStyle = col; c.globalAlpha = 0.35 - k * 0.05; c.fillRect(x - 3 + Math.sin(t * 4 + k * 1.3) * 2, y0 + 3 + k * 4, 6, 2); }
  c.globalAlpha = 1;
}
// the log, side-on, nose to the right, tilted by a; Pip in front (right), Bo behind
function pw42fLog(v, x, y, a, o) {
  const c = v.ctx;
  c.save(); c.translate(x, y); c.rotate(a); c.translate(0, -6); c.scale(1.6, 1.6);
  // the riders first, so the log's side is in front of their bodies
  v.hero(1, -7, 0, { s: 0.4, face: 1, mood: o.mood, rot: o.arms ? -0.12 : -0.04 });
  v.hero(0, 8, 0, { s: 0.4, face: 1, mood: o.mood, rot: o.arms ? 0.12 : 0.04 });
  if (o.arms) { c.strokeStyle = PW42F.ink; c.lineWidth = 1.5; for (const hx of [-11, -3, 4, 12]) { c.beginPath(); c.moveTo(hx, -8); c.lineTo(hx + (hx < 0 ? -2 : 2), -20); c.stroke(); } }
  // the paddles across the log
  c.strokeStyle = '#c89a5a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-14, -4); c.lineTo(-2, 4); c.moveTo(4, -5); c.lineTo(16, 3); c.stroke();
  c.fillStyle = '#4a8ae0'; v.rr(-17, -7, 4, 6, 1.5); c.fill(); c.fillStyle = '#f08a3c'; v.rr(15, 1, 4, 6, 1.5); c.fill();
  // the log: bark, a pale cut lip, rope, the number plaque, the sawn stern
  c.fillStyle = PW42F.wood; v.rr(-22, -3, 40, 11, 5); c.fill(); c.strokeStyle = PW42F.ink; c.lineWidth = 1; c.stroke();
  c.fillStyle = '#d8b07a'; c.fillRect(-20, -3, 36, 1.8);
  c.strokeStyle = 'rgba(40,20,10,0.6)'; c.lineWidth = 0.6; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-18 + i * 6, 0); c.lineTo(-15 + i * 6, 7); c.stroke(); }
  c.strokeStyle = '#e8d6a8'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-18, 3); for (let i = 0; i < 6; i++) c.quadraticCurveTo(-15 + i * 6, 6, -12 + i * 6, 3); c.stroke();
  c.fillStyle = '#2f6a4a'; v.rr(-6, 1, 9, 5, 2.5); c.fill(); c.fillStyle = '#fff4d8'; v.text('12', -1.5, 5.2, 4, '#fff4d8', 'center');
  c.fillStyle = '#d8a86a'; v.circle(-22, 2.5, 5.5); c.fill(); c.strokeStyle = PW42F.woodDk; c.lineWidth = 0.8; c.stroke(); c.beginPath(); c.arc(-22, 2.5, 3, 0, Math.PI * 2); c.stroke();
  // the beaver's head prow: round, ears, a cheeky eye, two big teeth, a lantern hanging from its mouth
  c.fillStyle = '#8a5634'; v.circle(21, -2, 7); c.fill(); c.strokeStyle = PW42F.ink; c.lineWidth = 1; c.stroke();
  v.circle(17, -8, 2.2); c.fill(); c.stroke();
  c.fillStyle = '#a8704a'; v.rr(22, -2, 8, 6, 3); c.fill(); c.stroke();
  c.fillStyle = '#1a1210'; v.circle(29, -1, 1.4); c.fill();
  c.fillStyle = '#fff8ec'; v.circle(22, -5, 2); c.fill(); c.fillStyle = '#1a1210'; v.circle(22.8, -5, 1); c.fill();
  c.fillStyle = '#fff6e0'; c.fillRect(25, 3.5, 2.2, 3); c.strokeStyle = PW42F.ink; c.lineWidth = 0.5; c.strokeRect(25, 3.5, 2.2, 3);
  const lg = c.createRadialGradient(28, 11, 0, 28, 11, 10); lg.addColorStop(0, 'rgba(255,220,140,0.85)'); lg.addColorStop(1, 'rgba(255,220,140,0)');
  c.fillStyle = lg; c.fillRect(18, 1, 20, 20); c.fillStyle = '#ffe9a8'; v.rr(26.5, 8, 3, 5, 1); c.fill();
  // bulbs along the rail
  for (let i = 0; i < 5; i++) { c.fillStyle = ['#ff8ab0', '#ffe07a', '#7ae0ff'][i % 3]; v.circle(-16 + i * 7.5, -4, 0.9); c.fill(); }
  c.restore();
}

definePreview('Log Flume Plunge', {
  blurb: 'Paddle together down the river: one paddle each, ducks to grab, and a giant plunge at the end. Hold on!',
  loop: 6,
  still: 3.0,
  draw(v, t) {
    const c = v.ctx;
    pw42Sky(v, t);
    pw42Wheel(v, 258, 84, 44, t);
    // the far park: lamp glows and dark trees along the lagoon's far side
    for (let i = 0; i < 8; i++) { const x = 132 + i * 26, g = c.createRadialGradient(x, 146, 0, x, 146, 12); g.addColorStop(0, 'rgba(255,214,140,0.4)'); g.addColorStop(1, 'rgba(255,214,140,0)'); c.fillStyle = g; c.fillRect(x - 12, 134, 24, 24); }
    c.fillStyle = '#18243a'; for (let i = 0; i < 9; i++) { const x = 130 + i * 24; c.beginPath(); c.arc(x, 150, 9 + v.rand(i) * 5, Math.PI, 0); c.fill(); }
    pw42fLagoon(v, t);
    pw42fFalls(v, t);
    // where the log is
    let x, y, a, mood = 'happy', arms = false, bob = 0;
    if (t < 2.0) {
      const k = v.ease.out(v.seg(t, 0, 1.6)), tip = v.seg(t, 1.6, 2.0);
      x = 30 + k * 82 + tip * 6; y = 59 + Math.sin(t * 3) * 0.6; a = tip * 0.35; mood = t > 1.5 ? 'wow' : 'happy';
    } else if (t < 3.6) {
      const u = v.ease.in(v.seg(t, 2.0, 3.6)), p = pw42fChute(u);
      x = p.x; y = p.y - 4; a = p.a; mood = 'wow'; arms = t > 2.3;
    } else {
      const k = v.ease.out(v.seg(t, 3.6, 6.0));
      x = 236 + k * 30; y = 150 + Math.sin(t * 4) * 1.2; a = Math.sin(t * 3) * 0.06; mood = 'joy'; arms = t < 5.0; bob = 1;
    }
    pw42fLog(v, x, y, a, { mood, arms });
    // spray streaming off the log in the plunge
    if (t > 2.3 && t < 3.6) for (let i = 0; i < 10; i++) { const k = (t * 4 + i * 0.1) % 1; c.fillStyle = `rgba(230,245,255,${1 - k})`; v.circle(x - 16 - k * 22 + v.rand(i) * 6, y - 8 - k * 10 + k * k * 14, 1.1); c.fill(); }
    // the splash: a plume of white water and golden ducks flying up out of it
    const sk = v.seg(t, 3.55, 4.7);
    if (sk > 0 && sk < 1) {
      for (let i = 0; i < 26; i++) { const ang = -Math.PI * (0.15 + 0.7 * v.rand(i)), sp = 30 + v.rand(i + 9) * 50; const px = 244 + Math.cos(ang) * sp * sk, py = 150 + Math.sin(ang) * sp * sk + 60 * sk * sk; c.fillStyle = `rgba(235,248,255,${1 - sk})`; v.circle(px, py, 1.6 + v.rand(i + 3) * 1.6); c.fill(); }
      c.fillStyle = `rgba(240,250,255,${0.8 * (1 - sk)})`; c.beginPath(); c.ellipse(244, 150, 28 * sk + 6, 30 * Math.sin(sk * Math.PI) + 2, 0, Math.PI, 0); c.fill();
      for (let i = 0; i < 6; i++) { const ang = -Math.PI * (0.25 + 0.5 * i / 5), sp = 70 + i * 6; const px = 244 + Math.cos(ang) * sp * sk, py = 146 + Math.sin(ang) * sp * sk + 80 * sk * sk; c.save(); c.translate(px, py); c.rotate(sk * 6 + i); c.fillStyle = PW42F.gold; v.circle(0, 0, 3.2); c.fill(); v.circle(2.6, -2.4, 2.1); c.fill(); c.fillStyle = '#f08a3c'; c.fillRect(4, -2.6, 2, 1.2); c.restore(); }
      v.label('SPLASH!', 244, 108 - sk * 10, 12, PW42F.gold);
    }
    if (bob && t > 4.6) for (let i = 0; i < 4; i++) { const dx = x - 30 - i * 9, k = (t * 2 + i * 0.25) % 1; c.strokeStyle = `rgba(200,230,255,${0.5 * (1 - k)})`; c.lineWidth = 0.8; c.beginPath(); c.ellipse(dx, 156, 4 + k * 6, 1.2, 0, 0, Math.PI * 2); c.stroke(); }
    if (t > 1.2 && t < 2.2) v.label('Hold on!', 92, 38, 10, PW42F.gold);
  },
});
