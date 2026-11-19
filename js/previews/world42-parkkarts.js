/* Pip & Bo - preview for 42-4 Go-Kart Grand Prix (world page card). Loaded after every level file, so it also keeps
   the Grand Prix the world's last level whatever order the World 42 levels' script blocks load in. */
'use strict';

// 42-4 is the world's final level: move it after the other World 42 levels (level codes follow LEVELS order)
(function () {
  const i = LEVELS.findIndex(l => l.mode === 'parkkarts');
  if (i < 0) return;
  let last = -1; LEVELS.forEach((l, j) => { if (l.world === LEVELS[i].world) last = j; });
  if (last > i) { const d = LEVELS.splice(i, 1)[0]; LEVELS.splice(last, 0, d); }
})();

/* 42-4 Go-Kart Grand Prix, drawn flat with a little depth. A 6 s loop:
     0.0 - 2.0  the two karts come round the far end of the bend, side by side under strings of bulbs
     2.0 - 4.2  both slide round it in a drift: tails out, sparks off the back tyres (yellow, then pink); a giant
                teddy bounces on the road behind; a firework bursts over the ferris wheel
     4.2 - 6.0  out of the bend, boost flames, away down the straight
   Pip in the orange kart with the chequered scarf streaming, Bo in the blue one with the purple helmet. Still at 3 s.
   A pure function of t. Every helper starts with pw42k. */
const PW42K = { road: '#3e3c56', road2: '#4a4866', kerbR: '#e0403a', kerbW: '#f4f0e8', orange: '#ff8a2a', orangeDk: '#c85a10', blue: '#3d8ef0', blueDk: '#1f5fb8', ink: '#1a1530' };
// the bend: a curve from the left (far), round the near side, off to the right; u 0..1 -> { x, y, a, s (scale) }
function pw42kAt(u, lane) {
  const a = Math.PI * (1.05 - u * 1.1), cx = 160, cy = 92, rx = 118 + lane * 13, ry = 50 + lane * 5;
  const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry * 0.95 + 18;
  return { x, y, a: Math.atan2(Math.cos(a) * ry, -Math.sin(a) * rx), s: 0.55 + (y - 70) / 140 };
}
function pw42kRoad(v, t) {
  const c = v.ctx;
  // the infield and the verge, then the road as a wide band round the bend with kerbs on its edges
  c.fillStyle = '#1e2a3a'; c.fillRect(0, 96, v.W, v.H - 96);
  for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(120,160,120,0.18)'; c.fillRect(v.rand(i + 7) * v.W, 100 + v.rand(i + 50) * 80, 2, 1); }
  const band = (lane, col) => { c.beginPath(); for (let k = 0; k <= 40; k++) { const p = pw42kAt(k / 40, lane); if (k) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); } c.strokeStyle = col; return c; };
  band(0, PW42K.road).lineWidth = 46; c.lineCap = 'butt'; c.stroke();
  band(0, PW42K.road2).lineWidth = 30; c.stroke();
  for (const lane of [-1.75, 1.75]) for (let k = 0; k < 40; k++) { const p = pw42kAt(k / 40, lane), q = pw42kAt((k + 1) / 40, lane); c.strokeStyle = k % 2 ? PW42K.kerbR : PW42K.kerbW; c.lineWidth = 4 * p.s; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke(); }
  // skid marks and a puddle that holds the bulbs
  c.strokeStyle = 'rgba(20,18,30,0.5)'; c.lineWidth = 1.4; for (const lane of [-0.6, 0.5]) { c.beginPath(); for (let k = 10; k <= 26; k++) { const p = pw42kAt(k / 40, lane); if (k > 10) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); } c.stroke(); }
  c.fillStyle = 'rgba(140,150,220,0.35)'; c.beginPath(); c.ellipse(232, 150, 16, 4, 0, 0, Math.PI * 2); c.fill();
  // tyre stacks on the outside
  for (let k = 0; k < 14; k++) { const p = pw42kAt(k / 13, 2.3); for (let j = 0; j < 2; j++) { c.fillStyle = (k + j) % 3 === 0 ? PW42K.kerbR : (k + j) % 3 === 1 ? '#2a2632' : PW42K.kerbW; v.rr(p.x - 4 * p.s, p.y - (6 + j * 5) * p.s, 8 * p.s, 5 * p.s, 2); c.fill(); } }
}
function pw42kBulbs(v, t) {
  const c = v.ctx;
  for (const [x0, y0, x1, y1] of [[-10, 30, 330, 22], [20, 52, 300, 48]]) {
    c.strokeStyle = 'rgba(40,36,60,0.9)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 12, x1, y1); c.stroke();
    for (let i = 0; i <= 26; i++) { const k = i / 26, x = (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * (x0 + x1) / 2 + k * k * x1, y = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * ((y0 + y1) / 2 + 12) + k * k * y1; const on = (i + Math.floor(t * 8)) % 3 === 0; c.fillStyle = on ? '#fff6c0' : ['#ff6a9a', '#7ae0ff', '#ffd24a'][i % 3]; v.circle(x, y + 2, on ? 1.9 : 1.3); c.fill(); }
  }
}
// a kart three-quarter from behind, at p, drifting by slip (radians), with its driver
function pw42kKart(v, id, p, slip, t, o = {}) {
  const c = v.ctx, s = p.s * 1.25, body = id ? PW42K.blue : PW42K.orange, dk = id ? PW42K.blueDk : PW42K.orangeDk;
  c.save(); c.translate(p.x, p.y); c.scale(s, s); c.rotate(slip * 0.5);
  c.fillStyle = 'rgba(20,18,40,0.35)'; c.beginPath(); c.ellipse(0, 1, 17, 4, 0, 0, Math.PI * 2); c.fill();
  // tyres, tray, body with the number, bumper
  c.fillStyle = '#25222c'; for (const dx of [-13, 9]) { v.rr(dx, -7, 5, 8, 2); c.fill(); }
  c.fillStyle = dk; v.rr(-14, -8, 28, 6, 3); c.fill();
  c.fillStyle = body; v.rr(-11, -14, 22, 9, 4); c.fill(); c.strokeStyle = PW42K.ink; c.lineWidth = 1; c.stroke();
  c.fillStyle = '#fbf7ec'; v.circle(0, -9.5, 3); c.fill(); v.text(String(id + 1), 0, -9.5, 4.5, PW42K.ink);
  c.fillStyle = '#ff3a3a'; v.rr(-10, -6, 3, 2, 1); c.fill(); v.rr(7, -6, 3, 2, 1); c.fill();
  c.restore();
  // the driver sits in it (the outfit draws the scarf or the helmet)
  v.hero(id, p.x + slip * 2, p.y - 12 * s, { s: 0.36 * s, face: 1, mood: o.mood, rot: -slip * 0.4, vx: 6, shadow: false });
}
function pw42kTeddy(v, x, y, t) {
  const c = v.ctx, b = Math.abs(Math.sin(t * 6)) * 6, sq = 1 + Math.max(0, 0.5 - Math.abs(Math.sin(t * 6))) * 0.25;
  c.save(); c.translate(x, y - b); c.scale(sq, 1 / sq);
  c.fillStyle = '#c98a5a'; c.strokeStyle = PW42K.ink; c.lineWidth = 1;
  for (const [px, py, r] of [[-6, -26, 4], [6, -26, 4], [0, -21, 8], [0, -8, 10], [-9, -10, 3.5], [9, -12, 3.5]]) { v.circle(px, py, r); c.fill(); c.stroke(); }
  c.fillStyle = '#f2d2b0'; v.circle(0, -18.5, 3.4); c.fill(); c.fillStyle = PW42K.ink; v.circle(-3, -23, 1); c.fill(); v.circle(3, -23, 1); c.fill(); v.circle(0, -19.5, 1.1); c.fill();
  c.fillStyle = '#ff6a9a'; c.beginPath(); c.moveTo(-4, -14); c.lineTo(4, -14); c.lineTo(0, -12); c.fill();
  c.restore();
}
function pw42kFirework(v, x, y, k, col) {
  const c = v.ctx; if (k <= 0 || k >= 1) return;
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, r = 4 + k * 26; c.fillStyle = col; c.globalAlpha = 1 - k; v.circle(x + Math.cos(a) * r, y + Math.sin(a) * r + k * k * 8, 1.4); c.fill(); }
  c.globalAlpha = 1;
}
definePreview('Go-Kart Grand Prix', {
  blurb: 'Drift round the bends and leave the other kart off the screen.',
  loop: 6, still: 3,
  draw(v, t) {
    const c = v.ctx;
    if (typeof pw42Sky === 'function') pw42Sky(v, t); else { c.fillStyle = '#0b0b26'; c.fillRect(0, 0, v.W, v.H); }
    if (typeof pw42Wheel === 'function') pw42Wheel(v, 62, 52, 30, t);
    pw42kFirework(v, 70, 34, v.seg(t, 2.4, 3.8), '#ffd24a'); pw42kFirework(v, 240, 26, v.seg(t, 2.8, 4.2), '#ff8ab0');
    pw42kRoad(v, t);
    pw42kBulbs(v, t);
    // where they are on the bend: in, round (drifting), out
    const u = t < 2 ? 0.08 + v.seg(t, 0, 2) * 0.32 : t < 4.2 ? 0.4 + v.seg(t, 2, 4.2) * 0.32 : 0.72 + v.ease.out(v.seg(t, 4.2, 6)) * 0.4;
    const drift = t > 1.8 && t < 4.4 ? Math.sin(v.seg(t, 1.8, 4.4) * Math.PI) : 0, spark = t > 3.1 ? '#ff6ad8' : '#ffd24a';
    // the teddy on the road behind them
    const tp = pw42kAt(Math.max(0.05, u - 0.3), 0.4); if (t > 1.6) pw42kTeddy(v, tp.x, tp.y, t);
    const kp = [pw42kAt(u + 0.05, -1.15), pw42kAt(u, 1.15)];
    for (const id of [0, 1]) {
      const p = kp[id], slip = drift * (id ? 0.85 : 0.75);
      if (drift > 0.2) for (let i = 0; i < 8; i++) { const k = ((t * 4 + i * 0.13 + id * 0.3) % 1), sx = p.x - 10 * p.s + (i % 2 ? 18 * p.s : 0); c.fillStyle = spark; c.globalAlpha = 1 - k; v.circle(sx - k * 18, p.y - 2 + k * k * 10 - k * 8, 1.8 - k); c.fill(); c.globalAlpha = 1; }
      if (t > 4.2 && t < 5.4) for (let i = 0; i < 4; i++) { c.fillStyle = ['#fff2a0', '#ffb04a', '#ff6a3a'][i % 3]; v.circle(p.x - 2 - i * 3, p.y - 8 * p.s + Math.sin(t * 30 + i) * 1.2, 2.2 - i * 0.4); c.fill(); }
    }
    // draw the farther kart first
    [0, 1].sort((a, b) => kp[a].y - kp[b].y).forEach(id => pw42kKart(v, id, kp[id], drift * (id ? 0.85 : 0.75), t, { mood: drift > 0.4 ? 'grit' : 'happy' }));
    if (drift > 0.5) v.label('Drift!', 160, 70, 11, '#ffd24a');
    if (t > 4.3 && t < 5.6) v.label('Boost!', kp[0].x, kp[0].y - 36, 10, '#ff8ab0');
  },
});
