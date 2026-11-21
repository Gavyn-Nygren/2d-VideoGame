/* Pip & Bo - preview for 43-2 Pinball Panic (world page card).

   The Comet Carnival table seen from low at the bottom, looking up the slope to the lit backboard. A 6 s loop:
     0.0 - 1.6  Pip's glass ball rolls up the left lane and over the star roll-over; Bo waits below a shut gate
     1.6 - 2.4  the star flashes, a cable of white-gold chase lights runs across to Bo's gate, and the gate lifts
     2.4 - 4.2  Bo rolls through, the creatures on the shoulders cheer; both roll up to the twin flippers
     4.4 - 6.0  the flippers fire together and both balls fly up the table towards the backboard ("Up!")
   Pip's ball has an orange ring, Bo's a blue one. Still at 3.0 s. A pure function of t. Every helper starts with pw43p. */
'use strict';

const PW43P = { ink: '#16121c', field: '#1a2a6a', field2: '#24388a', red: '#c0182a', gold: '#e8b030', cream: '#f2e6c8', wood: '#5a3020',
  wood2: '#7a4428', orange: '#ff8a2a', blue: '#3d8ef0', cable: '#fff0b8', pink: '#e84ab0' };
// table point to screen: x across (-1 left rail .. 1 right rail), u up the slope (0 bottom .. 4 backboard)
function pw43pP(x, u) { const s = 1 / (1 + 2.4 * u); return { x: 160 + x * 150 * s, y: 34 + 140 * s, s }; }
function pw43pQuad(v, x0, x1, u0, u1, col) {
  const c = v.ctx, a = pw43pP(x0, u0), b = pw43pP(x1, u0), d = pw43pP(x1, u1), e = pw43pP(x0, u1);
  c.fillStyle = col; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(d.x, d.y); c.lineTo(e.x, e.y); c.closePath(); c.fill();
}
function pw43pRoom(v, t) {
  const c = v.ctx;
  const g = c.createLinearGradient(0, 0, 0, v.H); g.addColorStop(0, '#07060c'); g.addColorStop(1, '#140c18'); c.fillStyle = g; c.fillRect(0, 0, v.W, v.H);
  // the dark arcade beyond the glass: soft blurred neon
  for (let i = 0; i < 9; i++) { const x = v.rand(i + 3) * v.W, y = v.rand(i + 30) * 60, r = 10 + v.rand(i + 60) * 22; c.fillStyle = ['rgba(232,74,176,0.10)', 'rgba(74,232,255,0.09)', 'rgba(255,210,74,0.08)'][i % 3]; v.circle(x, y, r); c.fill(); }
}
function pw43pBackboard(v, t) {
  const c = v.ctx, x = 104, y = 4, w = 112, h = 40;
  c.fillStyle = '#2a0e1a'; v.rr(x - 4, y - 2, w + 8, h + 8, 4); c.fill();
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#3a1a6a'); g.addColorStop(1, '#c0306a'); c.fillStyle = g; v.rr(x, y, w, h, 3); c.fill();
  // the painted comet and big top
  c.fillStyle = '#ffe9a8'; v.circle(x + 22, y + 12, 4); c.fill();
  c.strokeStyle = 'rgba(255,233,168,0.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 22, y + 12); c.quadraticCurveTo(x + 40, y + 6, x + 60, y + 9); c.stroke();
  c.fillStyle = '#f2e6c8'; c.beginPath(); c.moveTo(x + 80, y + 36); c.lineTo(x + 92, y + 22); c.lineTo(x + 104, y + 36); c.fill();
  c.fillStyle = PW43P.red; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x + 84 + k * 7, y + 36); c.lineTo(x + 92, y + 22); c.lineTo(x + 87 + k * 7, y + 36); c.fill(); }
  v.label('COMET', x + w / 2 - 6, y + 15, 10, '#ffd24a'); v.label('CARNIVAL', x + w / 2 - 6, y + 28, 10, '#ffd24a');
  // the bulb frame chasing round
  const n = 34;
  for (let i = 0; i < n; i++) {
    const k = i / n, per = 2 * (w + h); let d = k * per, bx, by;
    if (d < w) { bx = x + d; by = y; } else if ((d -= w) < h) { bx = x + w; by = y + d; } else if ((d -= h) < w) { bx = x + w - d; by = y + h; } else { d -= w; bx = x; by = y + h - d; }
    const on = (i + Math.floor(t * 10)) % 4 === 0; c.fillStyle = on ? '#fff8d8' : '#c08a30'; v.circle(bx, by, on ? 1.6 : 1.1); c.fill();
  }
}
function pw43pTable(v, t) {
  const c = v.ctx;
  // shoulders (wood) and the playfield, in bands up the slope
  pw43pQuad(v, -1.55, 1.55, 0, 4, PW43P.wood);
  for (let k = 0; k < 16; k++) pw43pQuad(v, -1, 1, k * 0.25, (k + 1) * 0.25, k % 2 ? PW43P.field : PW43P.field2);
  // the red and gold bands of the part ahead, a big painted ring and the stars printed on the field
  pw43pQuad(v, -1, 1, 1.0, 1.25, '#7a1a3a'); pw43pQuad(v, -1, 1, 2.2, 2.4, '#6a3a1a');
  { const p = pw43pP(0, 0.62); c.strokeStyle = 'rgba(232,176,48,0.55)'; c.lineWidth = 2; c.beginPath(); c.ellipse(p.x, p.y, 120 * p.s, 24 * p.s, 0, 0, Math.PI * 2); c.stroke(); }
  for (let i = 0; i < 26; i++) { const p = pw43pP((v.rand(i + 5) - 0.5) * 1.8, v.rand(i + 70) * 3); v.star(p.x, p.y, 2.4 * p.s + 0.6, 'rgba(255,210,74,0.45)'); }
  // the rails, the centre divider and the shoulders' bulbs
  c.strokeStyle = '#c8ccd8'; c.lineWidth = 1.4;
  for (const x of [-1, 1]) { const a = pw43pP(x, 0), b = pw43pP(x, 4); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
  { const a = pw43pP(0, 0), b = pw43pP(0, 4); c.lineWidth = 2; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
  for (const x of [-1.42, 1.42]) for (let i = 0; i < 22; i++) { const u = i * 0.17, p = pw43pP(x, u), on = (i + Math.floor(t * 8)) % 3 === 0; c.fillStyle = on ? '#fff4d8' : '#e0a040'; v.circle(p.x, p.y, (on ? 2.4 : 1.6) * p.s + 0.4); c.fill(); }
}
// a pop bumper: a mushroom with a lit cap
function pw43pBumper(v, x, u, col, lit) {
  const c = v.ctx, p = pw43pP(x, u), r = 22 * p.s;
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(p.x, p.y + 2, r * 1.1, r * 0.35, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#f2e6c8'; c.beginPath(); c.ellipse(p.x, p.y, r, r * 0.32, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = col; c.fillRect(p.x - r * 0.7, p.y - r * 0.8, r * 1.4, r * 0.8);
  c.fillStyle = '#c8ccd8'; c.fillRect(p.x - r * 0.72, p.y - r * 0.5, r * 1.44, r * 0.12);
  c.fillStyle = lit ? '#ffd8f0' : col; c.beginPath(); c.ellipse(p.x, p.y - r * 0.8, r * 0.72, r * 0.26, 0, 0, Math.PI * 2); c.fill();
  if (lit) { c.fillStyle = 'rgba(255,140,220,0.25)'; v.circle(p.x, p.y - r * 0.8, r * 1.3); c.fill(); }
}
// a fairground stall on a shoulder: a striped awning and a creature behind the counter
function pw43pStall(v, x, u, col, t, k) {
  const c = v.ctx, p = pw43pP(x, u), w = 46 * p.s, h = 30 * p.s;
  c.fillStyle = PW43P.wood2; c.fillRect(p.x - w / 2, p.y - h, w, h);
  for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? PW43P.cream : col; c.fillRect(p.x - w / 2 + i * w / 6, p.y - h * 0.45, w / 6, h * 0.45); c.fillRect(p.x - w / 2 - 2 + i * (w + 4) / 6, p.y - h * 1.25, (w + 4) / 6, h * 0.3); }
  pw43pCritter(v, p.x, p.y - h * 0.45, 7 * p.s / 0.6, k ? '#ffd24a' : '#7affd8', t, 0.2);
}
// one of the town's blocky pixel creatures (cheer > 0 makes it hop with its arms up)
function pw43pCritter(v, x, y, s, col, t, cheer, ph = 0) {
  const c = v.ctx, hop = cheer > 0 ? Math.abs(Math.sin(t * 9 + ph)) * 4 * cheer : 0;
  c.fillStyle = col; c.fillRect(x - s / 2, y - s - hop, s, s * 0.85);
  c.fillStyle = '#f8f4ea'; c.fillRect(x - s * 0.32, y - s * 0.78 - hop, s * 0.24, s * 0.26); c.fillRect(x + s * 0.08, y - s * 0.78 - hop, s * 0.24, s * 0.26);
  c.fillStyle = PW43P.ink; c.fillRect(x - s * 0.24, y - s * 0.72 - hop, s * 0.11, s * 0.13); c.fillRect(x + s * 0.16, y - s * 0.72 - hop, s * 0.11, s * 0.13);
  if (cheer > 0.3) { c.fillStyle = col; c.fillRect(x - s * 0.7, y - s * 1.2 - hop, s * 0.16, s * 0.45); c.fillRect(x + s * 0.54, y - s * 1.2 - hop, s * 0.16, s * 0.45); }
}
// a glass ball with the hero inside: the ring (orange for Pip, blue for Bo) runs round its middle
function pw43pBall(v, id, x, u, lift, t, o = {}) {
  const c = v.ctx, p = pw43pP(x, u), r = 20 * p.s + 3, cy = p.y - r - lift;
  // the shadow and the pool of the ring's light on the field
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(p.x, p.y, r * 0.9, r * 0.28, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = id ? 'rgba(61,142,240,0.22)' : 'rgba(255,138,42,0.22)'; c.beginPath(); c.ellipse(p.x, p.y, r * 1.5, r * 0.42, 0, 0, Math.PI * 2); c.fill();
  // the back of the glass, the hero, the front of the glass
  c.fillStyle = 'rgba(190,220,255,0.10)'; v.circle(p.x, cy, r); c.fill();
  v.hero(id, p.x, cy + r * 0.78, { s: r / 24, face: 1, mood: o.mood || 'happy', rot: o.rot || 0, shadow: false });
  const col = id ? PW43P.blue : PW43P.orange;
  c.save(); c.shadowColor = col; c.shadowBlur = 8; c.strokeStyle = col; c.lineWidth = Math.max(1.6, r * 0.12);
  c.beginPath(); c.ellipse(p.x, cy + r * 0.38, r * 0.93, r * 0.26, 0, 0, Math.PI * 2); c.stroke(); c.restore();
  c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1; v.circle(p.x, cy, r); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(p.x - r * 0.38, cy - r * 0.5, r * 0.22, r * 0.11, -0.6, 0, Math.PI * 2); c.fill();
}
// a striped drop gate across a lane; k 0 shut .. 1 sunk into the table (a lit slot is left)
function pw43pGate(v, x0, x1, u, k) {
  const c = v.ctx, a = pw43pP(x0, u), b = pw43pP(x1, u), L = b.x - a.x, h = Math.max(0, 1 - k) * 12 * a.s;
  c.fillStyle = k > 0.5 ? 'rgba(255,240,184,0.8)' : '#0a0e24'; c.fillRect(a.x, a.y - 1, L, 2);
  if (h > 0.3) for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? PW43P.cream : PW43P.red; c.fillRect(a.x + i * L / 8, a.y - h, L / 8 + 0.5, h); }
  for (const x of [a.x, b.x]) { c.fillStyle = '#c8ccd8'; c.fillRect(x - 1.5, a.y - 14 * a.s, 3, 14 * a.s); c.fillStyle = k > 0.5 ? '#7aff9a' : '#ff5a4a'; v.circle(x, a.y - 14 * a.s - 1.5, 2); c.fill(); }
}
function pw43pTwin(v, u, fire) {
  // a cradle ring in each lane with a flipper bat just below it; fire swings both bats up together
  const c = v.ctx;
  for (const sd of [-1, 1]) {
    const p = pw43pP(sd * 0.36, u), b = pw43pP(sd * 0.64, u - 0.06), w = 40 * p.s;
    c.strokeStyle = 'rgba(255,240,184,0.75)'; c.setLineDash([3, 3]); c.lineWidth = 1; c.beginPath(); c.ellipse(p.x, p.y, w * 0.7, w * 0.2, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    c.save(); c.translate(b.x, b.y); c.rotate(sd * (0.3 - fire * 0.75)); c.fillStyle = 'rgba(0,0,0,0.3)'; v.rr(sd > 0 ? -w : 0, 1, w, 6, 3); c.fill();
    c.fillStyle = PW43P.cream; v.rr(sd > 0 ? -w : 0, -3, w, 6, 3); c.fill(); c.fillStyle = PW43P.red; c.fillRect((sd > 0 ? -w : 0) + 3, -1, w - 6, 2);
    c.fillStyle = '#c8ccd8'; v.circle(0, 0, 2.4); c.fill(); c.restore();
    if (fire > 0.2) { c.fillStyle = `rgba(255,240,184,${0.5 * fire})`; v.circle(p.x, p.y - 6, 14 * p.s + 6); c.fill(); }
  }
}
definePreview('Pinball Panic', {
  blurb: 'Roll over your switch to open your partner\'s gate, then fly up the table together.',
  loop: 6, still: 3.0,
  draw(v, t) {
    const c = v.ctx;
    pw43pRoom(v, t);
    pw43pBackboard(v, t);
    pw43pTable(v, t);
    // what is going on
    const starHit = t >= 1.5, cableK = v.seg(t, 1.5, 2.3), cheer = t > 2.4 && t < 3.8 ? 1 : t > 4.6 ? 1 : 0;
    const fire = t > 4.4 && t < 4.7 ? v.seg(t, 4.4, 4.5) : t >= 4.7 ? 1 - v.seg(t, 4.7, 5.0) : 0;
    // far scenery first: bumpers further up, the stalls on the shoulders, the creatures
    pw43pBumper(v, -0.55, 1.6, PW43P.pink, Math.floor(t * 3) % 2 === 0); pw43pBumper(v, 0.55, 1.6, PW43P.red, Math.floor(t * 3) % 2 === 1); pw43pBumper(v, 0, 2.6, '#3ac86a', true);
    pw43pStall(v, -1.3, 0.42, PW43P.red, t, 0); pw43pStall(v, 1.3, 0.42, PW43P.blue, t, 1);
    for (let i = 0; i < 12; i++) { const sd = i % 2 ? 1 : -1, u = 0.02 + Math.floor(i / 2) * 0.12, p = pw43pP(sd * (1.18 + v.rand(i) * 0.18), u); if (u > 0.33 && u < 0.52) continue; pw43pCritter(v, p.x, p.y, 13 * p.s, ['#ff5ad6', '#4ae8ff', '#ffd24a', '#7affd8', '#9a8aff'][i % 5], t, cheer, i); }
    // the twin flippers, the star roll-over and its cable to Bo's gate, the gate
    pw43pTwin(v, 0.4, fire);
    const star = pw43pP(-0.5, 0.15), gate = pw43pP(0.5, 0.23);
    c.fillStyle = starHit ? '#fff4c0' : 'rgba(255,210,74,0.6)'; c.beginPath(); c.ellipse(star.x, star.y, 15 * star.s, 4.6 * star.s, 0, 0, Math.PI * 2); c.fill();
    v.star(star.x, star.y - 1, 6 * star.s, starHit ? '#ffffff' : '#ffd24a');
    if (starHit && t < 2.2) { c.fillStyle = `rgba(255,240,184,${0.5 * (1 - v.seg(t, 1.5, 2.2))})`; v.circle(star.x, star.y - 4, 20 * star.s); c.fill(); }
    // the cable: chasing white-gold lights along the table from the star to the gate
    for (let i = 0; i <= 18; i++) {
      const k = i / 18, p = { x: star.x + (gate.x - star.x) * k, y: star.y + (gate.y - star.y) * k + Math.sin(k * Math.PI) * 4 };
      const lit = cableK >= k, chase = (i + Math.floor(t * 14)) % 3 === 0;
      c.fillStyle = lit ? (chase ? '#ffffff' : PW43P.cable) : 'rgba(255,240,184,0.25)'; v.circle(p.x, p.y, lit ? 1.5 : 1); c.fill();
    }
    pw43pGate(v, 0.06, 0.94, 0.23, v.seg(t, 2.25, 2.6));
    if (t > 2.3 && t < 3.4) v.label('Gate open!', gate.x + 30, gate.y - 4, 9, '#ffe9a8');
    // the balls: Pip up the left lane over the star, Bo waits, rolls through the opened gate; both onto the flippers, then up
    const flyK = v.seg(t, 4.5, 5.6);
    let pu = t < 1.6 ? 0.0 + v.ease.inOut(v.seg(t, 0, 1.6)) * 0.15 : t < 2.4 ? 0.15 : 0.15 + v.ease.inOut(v.seg(t, 2.6, 4.2)) * 0.25;
    let bu = t < 2.4 ? 0.0 + v.ease.out(v.seg(t, 0, 1.2)) * 0.17 : 0.17 + v.ease.inOut(v.seg(t, 2.4, 4.0)) * 0.23;
    let px = -0.5, bx = 0.5, pl = 0, bl = 0;
    if (t >= 4.2) { px = -0.36; bx = 0.36; } else if (t > 3.4) { const k = v.seg(t, 3.4, 4.2); px = -0.5 + k * 0.14; bx = 0.5 - k * 0.14; }
    if (flyK > 0) { pu = 0.4 + v.ease.out(flyK) * 0.6; bu = pu; pl = Math.sin(flyK * Math.PI) * 20; bl = pl; }
    if (flyK > 0.5) c.globalAlpha = 1 - v.seg(flyK, 0.5, 0.95);
    // draw the farther ball first
    const balls = [[0, px, pu, pl, flyK > 0 ? 'joy' : t > 1.4 && t < 2.0 ? 'wow' : 'happy'], [1, bx, bu, bl, flyK > 0 ? 'joy' : t < 2.3 && t > 1.2 ? 'blink' : 'happy']];
    balls.sort((a, b) => b[2] - a[2]).forEach(([id, x, u, l, mood]) => pw43pBall(v, id, x, u, l, t, { mood, rot: flyK > 0 ? Math.sin(t * 9 + id) * 0.4 : 0 }));
    c.globalAlpha = 1;
    if (t > 1.0 && t < 2.3) { const bp = pw43pP(bx, bu); v.bubble('Waiting...', bp.x + 4, bp.y - (20 * bp.s + 3) * 2 - 4, { size: 8 }); }
    if (flyK > 0 && flyK < 0.8) { const tp = pw43pP(0, 0.4); v.label('Up!', 160, tp.y - 34 - flyK * 14, 12, '#ffd24a'); v.sparkle(tp.x - 30, tp.y - 6, flyK); v.sparkle(tp.x + 30, tp.y - 6, flyK); }
  },
});
