/* Pip & Bo - level previews for World 43 Arcade Cabinet (43-1 Coin Drop). Later World 43 levels keep their previews in
   their own files (js/previews/world43-<mode>.js). See js/previews/preview-core.js. */
'use strict';

/* 43-1 Coin Drop, drawn as a look down the brass coin chute (the level is 3D; a preview never loads it). A 6 s loop:
     0.0 - 2.2  the two riders spread out on their coins; the spark between them sweeps a row of coins (SWEEP!)
     2.2 - 3.6  a sagging wire comes up the chute: both jump, the coins flip under them
     3.6 - 6.0  they close up; a glitch bug crawls in the middle and the spark zaps it (ZAP!)
   Behind: the dark inside of the machine, circuit boards with blinking LEDs, the coin slot blazing high up. A pure
   function of t. Every helper starts with pw43. */
const PW43 = { ink: '#120d14', brass: '#c89a48', brassDk: '#7a5a22', lip: '#f0c870', spark: '#fff6d8' };
// the chute in perspective: depth d (0 near, 1 far) -> screen y and scale; X across (-1 wall .. 1 wall)
const pw43K = d => 1 / (1 + 4.2 * d);
const pw43P = (d, X) => { const k = pw43K(d); return { x: 160 + X * 150 * k, y: 62 + 128 * k, k }; };
function pw43Back(v, t) {
  const c = v.ctx;
  c.fillStyle = '#0c0a12'; c.fillRect(0, 0, v.W, v.H);
  // boards on the far walls, LEDs ticking
  for (const [x, y, w, h, col] of [[6, 18, 70, 44, '#1f6a3c'], [240, 10, 74, 50, '#1a4a6a'], [100, 4, 40, 26, '#22603a'], [196, 40, 40, 22, '#3a2a5a']]) {
    c.fillStyle = col; c.globalAlpha = 0.55; c.fillRect(x, y, w, h); c.globalAlpha = 1;
    for (let i = 0; i < 8; i++) { const on = Math.sin(t * 5 + i * 1.7 + x) > 0.2; c.fillStyle = on ? ['#5aff8a', '#4ae8ff', '#ffe24a', '#ff5ad6'][i % 4] : '#20202a'; c.fillRect(x + 5 + i * (w - 10) / 8, y + h - 7, 3, 3); }
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x + 8, y + 8, w * 0.3, h * 0.3);
  }
  // the coin slot, high and blazing, its beam falling across the chute
  const g = c.createRadialGradient(160, 16, 2, 160, 16, 46); g.addColorStop(0, 'rgba(255,244,216,0.9)'); g.addColorStop(1, 'rgba(255,230,180,0)');
  c.fillStyle = g; c.fillRect(110, 0, 100, 60);
  c.fillStyle = '#fff4d8'; c.fillRect(146, 13, 28, 5);
  c.fillStyle = 'rgba(255,240,200,0.07)'; c.beginPath(); c.moveTo(148, 18); c.lineTo(172, 18); c.lineTo(200, 120); c.lineTo(120, 120); c.closePath(); c.fill();
  // dust in the light
  for (let i = 0; i < 14; i++) { c.fillStyle = 'rgba(255,230,190,0.5)'; c.fillRect(130 + v.rand(i) * 60, (v.rand(i + 9) * 100 + t * 6) % 100 + 18, 1, 1); }
}
function pw43Chute(v, t) {
  const c = v.ctx, near = pw43P(0, 0), far = pw43P(1, 0);
  // the floor and the walls
  const fl = c.createLinearGradient(0, far.y, 0, near.y); fl.addColorStop(0, '#5a4220'); fl.addColorStop(1, PW43.brass);
  c.fillStyle = fl; c.beginPath(); const a = pw43P(0, -1), b = pw43P(0, 1), cc = pw43P(1, 1), d = pw43P(1, -1);
  c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(cc.x, cc.y); c.lineTo(d.x, d.y); c.closePath(); c.fill();
  // seams racing toward us (speed), worn coin tracks
  for (let i = 0; i < 9; i++) { const dd = ((i / 9) - t * 0.35) % 1, u = dd < 0 ? dd + 1 : dd, l = pw43P(u, -1), r = pw43P(u, 1); c.strokeStyle = `rgba(60,36,10,${0.5 * (1 - u)})`; c.lineWidth = 1.2 * l.k + 0.3; c.beginPath(); c.moveTo(l.x, l.y); c.lineTo(r.x, r.y); c.stroke(); }
  c.strokeStyle = 'rgba(255,236,190,0.12)'; c.lineWidth = 6; for (const X of [-0.45, 0.45]) { const p0 = pw43P(0, X), p1 = pw43P(1, X); c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.stroke(); }
  // the walls up to the rolled lips, bulbs chasing along them
  for (const sx of [-1, 1]) {
    const p0 = pw43P(0, sx), p1 = pw43P(1, sx), q0 = pw43P(0, sx * 1.08), q1 = pw43P(1, sx * 1.08);
    c.fillStyle = PW43.brassDk; c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.lineTo(q1.x, q1.y - 9 * pw43K(1)); c.lineTo(q0.x, q0.y - 30); c.closePath(); c.fill();
    c.strokeStyle = PW43.lip; c.lineWidth = 3; c.beginPath(); c.moveTo(q0.x, q0.y - 30); c.lineTo(q1.x, q1.y - 9 * pw43K(1)); c.stroke();
    for (let i = 0; i < 14; i++) { const u = ((i / 14) - t * 0.35 + 10) % 1, p = pw43P(u, sx * 1.08), on = (i + Math.floor(t * 6)) % 3 === 0; c.fillStyle = on ? '#ffffff' : (i % 5 ? '#ffe6b0' : '#5aff8a'); v.circle(p.x, p.y - 30 * p.k, 1.6 * p.k + 0.7); c.fill(); }
  }
}
function pw43Coin(v, id, x, y, s, flip) {
  const c = v.ctx, col = id ? '#b8d2f4' : '#f2a442', edge = id ? '#5aa8ff' : '#ff7a3a';
  c.save(); c.translate(x, y); c.scale(1, 0.32 + Math.abs(Math.cos(flip)) * 0.0);
  const g = c.createRadialGradient(0, 0, 2, 0, 0, 26 * s); g.addColorStop(0, edge); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.globalAlpha = 0.5; c.fillStyle = g; v.circle(0, 6 * s, 30 * s); c.fill(); c.globalAlpha = 1;
  c.restore();
  c.save(); c.translate(x, y); c.rotate(Math.sin(flip) * 0.4); c.scale(1, 0.32 * Math.cos(flip) || 0.05);
  c.fillStyle = PW43.ink; v.circle(0, 2, 22 * s); c.fill();
  c.fillStyle = col; v.circle(0, 0, 21 * s); c.fill();
  c.strokeStyle = edge; c.lineWidth = 2.4 * s; v.circle(0, 0, 18 * s); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.5)'; v.circle(-6 * s, -6 * s, 5 * s); c.fill();
  c.restore();
}
function pw43Spark(v, a, b, t, k) {
  const c = v.ctx; if (k <= 0) return;
  c.save(); c.globalAlpha = k;
  for (const [w, col] of [[7, 'rgba(255,210,122,0.35)'], [2.6, PW43.spark]]) {
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(a.x, a.y);
    for (let i = 1; i < 10; i++) { const u = i / 10; c.lineTo(a.x + (b.x - a.x) * u + (v.rand(i + Math.floor(t * 30) * 13) - 0.5) * 2, a.y + (b.y - a.y) * u + (v.rand(i * 7 + Math.floor(t * 30)) - 0.5) * 8); }
    c.lineTo(b.x, b.y); c.stroke();
  }
  c.restore();
}
definePreview('Coin Drop', {
  blurb: 'Ride your own coin down the machine. The spark between you scoops up the coins.',
  loop: 6, still: 1.5,
  draw(v, t) {
    const c = v.ctx;
    pw43Back(v, t); pw43Chute(v, t);
    // the pair's spread: wide for the row, close for the bug
    const spread = 0.28 + 0.3 * v.ease.inOut(v.seg(t, 0.2, 1.0)) - 0.3 * v.ease.inOut(v.seg(t, 2.0, 2.6)) + 0.12 * v.ease.inOut(v.seg(t, 3.8, 4.4)) - 0.12 * v.ease.inOut(v.seg(t, 5.4, 6));
    const dr = 0.12, hopK = v.seg(t, 2.55, 3.35), hop = hopK > 0 && hopK < 1 ? -v.hop(hopK, 26) : 0, flip = hopK > 0.2 && hopK < 0.8 ? (hopK - 0.2) / 0.6 * Math.PI * 2 : 0;
    // the row of coins coming up (0.4 - 1.6 s), the wire (2.2 - 3.3 s), the bug (3.8 - 5.0 s)
    const rowD = 1 - v.seg(t, 0.2, 1.55) * (1 - dr), got = t > 1.5 && t < 2.2;
    if (t > 0.2 && t < 1.55) for (let i = 0; i < 7; i++) { const p = pw43P(rowD, -0.75 + i * 0.25); c.fillStyle = PW43.ink; v.circle(p.x, p.y - 5 * p.k, 6 * p.k + 0.8); c.fill(); c.fillStyle = i === 3 ? '#ff8ac0' : '#ffd24a'; v.circle(p.x, p.y - 5 * p.k, 5 * p.k + 0.6); c.fill(); }
    const wd = 1 - v.seg(t, 2.1, 3.05) * (1 - dr * 0.6);
    if (t > 2.1 && t < 3.3) { const l = pw43P(Math.min(1, wd), -1.08), r = pw43P(Math.min(1, wd), 1.08); c.strokeStyle = '#2a2a30'; c.lineWidth = 3 * l.k + 1; c.beginPath(); c.moveTo(l.x, l.y - 28 * l.k); c.quadraticCurveTo((l.x + r.x) / 2, l.y - 4 * l.k, r.x, r.y - 28 * r.k); c.stroke(); for (let i = 0; i < 4; i++) { const u = (t * 2 + i / 4) % 1; v.sparkle(l.x + (r.x - l.x) * u, l.y - (28 - 24 * Math.sin(u * Math.PI)) * l.k, 0.6 + 0.4 * Math.sin(t * 20 + i)); } }
    const bd = 1 - v.seg(t, 3.8, 4.75) * (1 - dr - 0.02), zap = v.seg(t, 4.72, 5.3);
    if (t > 3.8 && t < 4.75) { const p = pw43P(bd, 0.02 * Math.sin(t * 20)); c.fillStyle = '#c84aff'; c.fillRect(p.x - 6 * p.k, p.y - 9 * p.k, 12 * p.k, 8 * p.k); c.fillStyle = '#ff5ad6'; c.fillRect(p.x - 4 * p.k, p.y - 12 * p.k, 8 * p.k, 4 * p.k); c.fillStyle = '#fff'; c.fillRect(p.x - 3 * p.k, p.y - 7 * p.k, 2 * p.k, 2 * p.k); c.fillRect(p.x + 1 * p.k, p.y - 7 * p.k, 2 * p.k, 2 * p.k); }
    // the riders on their coins
    const pp = [pw43P(dr, -spread), pw43P(dr, spread)];
    pp.forEach((p, id) => { pw43Coin(v, id, p.x, p.y - hop, 1.05, flip); });
    pw43Spark(v, { x: pp[0].x + 14, y: pp[0].y - 22 - hop }, { x: pp[1].x - 14, y: pp[1].y - 22 - hop }, t, 1);
    pp.forEach((p, id) => v.hero(id, p.x, p.y - 4 - hop - (hopK > 0.2 && hopK < 0.8 ? 10 : 0), { s: 0.95, face: id ? -1 : 1, mood: got || zap > 0 ? 'joy' : hopK > 0 && hopK < 1 ? 'wow' : 'happy' }));
    if (got) { for (let i = 0; i < 6; i++) v.sparkle(pp[0].x + (pp[1].x - pp[0].x) * (i / 5), pp[0].y - 30 - v.seg(t, 1.5, 2.2) * 20, 1 - v.seg(t, 1.5, 2.2)); v.pill('SWEEP!', 160, 40, { size: 15, bg: '#1a1420', col: '#ffe08a' }); }
    if (zap > 0 && zap < 1) { const m = { x: (pp[0].x + pp[1].x) / 2, y: pp[0].y - 18 }; v.star(m.x, m.y, 10 + zap * 14, `rgba(232,255,122,${1 - zap})`); v.pill('ZAP!', 160, 40, { size: 15, bg: '#1a1420', col: '#e8ff7a' }); }
  },
});
