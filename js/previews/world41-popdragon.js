/* Pip & Bo - World page preview: 41-3 Paper Dragon Flight. See js/previews/preview-core.js.
   (Its own file so the other World 41 previews in js/previews/world41.js never clash with it.)

   A 6 s loop, drawn in 2D with depth: the green and gold paper dragon ripples across the dark attic bedroom toward the
   right, Pip in the newspaper hat on the front saddle and Bo in the flying cap behind, scarves streaming. Gold stars
   drift past, the runaway page tumbles ahead, and two green cat eyes open by the bed. The still (3 s) has both heroes,
   the whole dragon, the page and the eyes in view. Every helper starts with pw41pd; the scene is a pure function of t. */
'use strict';

const PW41PD = { loop: 6, seg: 12, gap: 13.5, baseY: 100 };

// where the head is at time t, and the body's wavy line behind it
function pw41pdHeadX(t) { return -50 + t / PW41PD.loop * 480; }
function pw41pdY(x, t) { return PW41PD.baseY + Math.sin(x * 0.034 - t * 3.1) * 11 + Math.sin(x * 0.011 + 1.3) * 7; }

function pw41pdRoom(v, t) {
  const c = v.ctx, W = v.W, H = v.H;
  // the attic wall at night, planks with a lamp's warm glow on the left
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#171a26'); g.addColorStop(0.7, '#2a2230'); g.addColorStop(1, '#3a2a26');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1;
  for (let x = 6; x < W; x += 17) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 132); c.stroke(); }
  const glow = c.createRadialGradient(36, 40, 4, 36, 40, 120); glow.addColorStop(0, 'rgba(255,214,140,0.30)'); glow.addColorStop(1, 'rgba(255,214,140,0)');
  c.fillStyle = glow; c.fillRect(0, 0, W, H);
  // the round window with the moon and a shaft of moonlight
  c.save(); c.translate(262, 40);
  c.fillStyle = 'rgba(170,190,255,0.08)'; c.beginPath(); c.moveTo(-18, 6); c.lineTo(18, 6); c.lineTo(48, 140); c.lineTo(-30, 140); c.closePath(); c.fill();
  c.fillStyle = '#1d2a52'; v.circle(0, 0, 21); c.fill();
  c.fillStyle = '#f4ecc8'; v.circle(7, -6, 6); c.fill();
  for (let i = 0; i < 7; i++) { c.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.4 * v.rand(i + 3)) + ')'; v.circle(-14 + v.rand(i) * 26, -12 + v.rand(i + 9) * 24, 0.8); c.fill(); }
  c.strokeStyle = '#e8dcc0'; c.lineWidth = 3.5; v.circle(0, 0, 21); c.stroke();
  c.lineWidth = 2; c.beginPath(); c.moveTo(-21, 0); c.lineTo(21, 0); c.moveTo(0, -21); c.lineTo(0, 21); c.stroke();
  c.restore();
  // floorboards
  c.fillStyle = '#4a3226'; c.fillRect(0, 132, W, H - 132);
  c.strokeStyle = 'rgba(0,0,0,0.3)';
  for (let y = 138; y < H; y += 9) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  // the bed in the shadows (patchwork quilt) with the cat's eyes peeping over the end
  c.fillStyle = '#2b1f1a'; v.rr(170, 112, 120, 30, 4); c.fill();
  const quilt = ['#7a3f4a', '#3f5a7a', '#7a6a3a', '#3f6a4a'];
  for (let i = 0; i < 8; i++) { c.fillStyle = quilt[i % 4]; c.globalAlpha = 0.55; c.fillRect(174 + i * 14, 106, 14, 12); }
  c.globalAlpha = 1; c.fillStyle = '#21181a'; v.rr(166, 96, 10, 46, 3); c.fill();
}

// the cat's eyes: they open at 2.2 s, blink once, and close again at 5.5 s
function pw41pdEyes(v, t) {
  const open = v.seg(t, 2.0, 2.4) * (1 - v.seg(t, 5.3, 5.6)) * (t > 4.1 && t < 4.25 ? 0.15 : 1);
  if (open <= 0.02) return;
  const c = v.ctx;
  for (const ex of [238, 251]) {
    c.fillStyle = 'rgba(140,255,120,0.18)'; v.circle(ex, 101, 7); c.fill();
    c.fillStyle = '#9cf26a'; c.beginPath(); c.ellipse(ex, 101, 4.4, 3.6 * open, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#10140c'; c.beginPath(); c.ellipse(ex + 0.6, 101, 0.9, 3.2 * open, 0, 0, Math.PI * 2); c.fill();
  }
}

// a folded gold star
function pw41pdStar(v, x, y, r, spin) {
  const c = v.ctx;
  c.save(); c.translate(x, y); c.scale(Math.max(0.25, Math.abs(Math.cos(spin))), 1);
  c.fillStyle = 'rgba(255,214,90,0.25)'; v.circle(0, 0, r * 1.8); c.fill();
  c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  c.closePath(); c.fillStyle = '#f2c14e'; c.fill(); c.strokeStyle = '#8a5a14'; c.lineWidth = 1; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.moveTo(0, -r); c.lineTo(0, 0); c.stroke();
  c.restore();
}

// the runaway page: a cream sheet with printed lines, tumbling
function pw41pdPage(v, x, y, t) {
  const c = v.ctx;
  c.save(); c.translate(x, y); c.rotate(Math.sin(t * 2.3) * 0.5 - 0.2); c.scale(Math.cos(t * 3.1) * 0.6 + 0.4 * Math.sign(Math.cos(t * 3.1) || 1), 1);
  c.fillStyle = '#f6eed8'; c.strokeStyle = '#2b2130'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-9, -12); c.lineTo(9, -12); c.lineTo(10, 11); c.lineTo(-8, 12); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(40,40,60,0.45)'; c.lineWidth = 0.9;
  for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-6, -8 + i * 3.4); c.lineTo(i === 5 ? 1 : 6, -8 + i * 3.4); c.stroke(); }
  c.restore();
}

// one pleated body segment (a short folded tube seen from the side), centred at 0,0 pointing +x
function pw41pdSeg(v, w, h, i) {
  const c = v.ctx;
  c.fillStyle = '#3f9a57'; c.strokeStyle = '#1f3a28'; c.lineWidth = 1.3;
  v.rr(-w / 2, -h / 2, w, h, 3); c.fill(); c.stroke();
  // the gold belly and the white cut edge
  c.fillStyle = '#e2b04a'; c.fillRect(-w / 2 + 1, h * 0.12, w - 2, h * 0.34);
  c.strokeStyle = '#fbf7ec'; c.lineWidth = 1; c.beginPath(); c.moveTo(-w / 2 + 1, h * 0.12); c.lineTo(w / 2 - 1, h * 0.12); c.stroke();
  // printed scales
  c.strokeStyle = 'rgba(20,60,30,0.55)'; c.lineWidth = 0.8;
  for (let k = 0; k < 2; k++) { c.beginPath(); c.arc(-w / 4 + k * w / 2, -h * 0.18, w * 0.2, 0, Math.PI); c.stroke(); }
  // the fold line between pleats
  c.strokeStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.moveTo(w / 2 - 1, -h / 2 + 1); c.lineTo(w / 2 - 1, h / 2 - 1); c.stroke();
  // the crest: red and gold card triangles in turn
  c.fillStyle = i % 2 ? '#e2b04a' : '#c8343c'; c.strokeStyle = '#2b2130'; c.lineWidth = 0.9;
  c.beginPath(); c.moveTo(-w * 0.3, -h / 2); c.lineTo(w * 0.05, -h / 2 - 7); c.lineTo(w * 0.3, -h / 2); c.closePath(); c.fill(); c.stroke();
}

// a fan wing of folded card, hinged at 0,0, opened by k (0 folded .. 1 open), beating by a
function pw41pdWing(v, a, far) {
  const c = v.ctx, n = 7, R = far ? 22 : 26;
  c.save(); c.rotate(a);
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI * 0.95 + i / n * Math.PI * 0.8, a1 = a0 + Math.PI * 0.8 / n;
    c.fillStyle = far ? (i % 2 ? '#2f7a45' : '#2a6a3c') : (i % 2 ? '#4fae64' : '#43a058');
    c.strokeStyle = '#fbf7ec'; c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R, a0, a1); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#c8343c'; v.circle(Math.cos((a0 + a1) / 2) * R * 0.7, Math.sin((a0 + a1) / 2) * R * 0.7, 1.3); c.fill();
  }
  c.strokeStyle = '#1f3a28'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, R, -Math.PI * 0.95, -Math.PI * 0.15); c.stroke();
  c.restore();
}

function pw41pdDragon(v, t) {
  const c = v.ctx, P = PW41PD, hx = pw41pdHeadX(t);
  // the body's points along the wave, head first
  const pts = [];
  for (let i = 0; i <= P.seg; i++) { const x = hx - 16 - i * P.gap; pts.push({ x, y: pw41pdY(x, t) }); }
  const ang = i => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(P.seg, i + 1)]; return Math.atan2(a.y - b.y, a.x - b.x); };
  const beat = Math.sin(t * 9);
  // the far wing (behind the body)
  const w3 = pts[4];
  c.save(); c.translate(w3.x + 2, w3.y - 6); pw41pdWing(v, 0.25 + beat * 0.35, true); c.restore();
  // the tail fan
  const tl = pts[P.seg];
  c.save(); c.translate(tl.x, tl.y); c.rotate(ang(P.seg) + Math.sin(t * 5) * 0.25);
  for (let k = -2; k <= 2; k++) { c.fillStyle = k % 2 ? '#e2b04a' : '#c8343c'; c.strokeStyle = '#2b2130'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(0, 0); c.lineTo(-17, k * 5 - 3); c.lineTo(-17, k * 5 + 3); c.closePath(); c.fill(); c.stroke(); }
  c.restore();
  // the body, back to front (smaller toward the tail)
  for (let i = P.seg; i >= 1; i--) {
    const p = pts[i], k = 1 - i / P.seg * 0.35;
    c.save(); c.translate(p.x, p.y); c.rotate(ang(i)); pw41pdSeg(v, P.gap + 2, 20 * k, i); c.restore();
    // the two folded legs
    if (i === 2 || i === 8) { c.save(); c.translate(p.x, p.y + 8 * k); c.strokeStyle = '#e2b04a'; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-3, 6); c.lineTo(2, 9); c.stroke(); c.restore(); }
  }
  // the near wing (between the saddles; the riders sit in front of it, beating)
  c.save(); c.translate(w3.x, w3.y - 2); pw41pdWing(v, 0.1 + beat * 0.45, false); c.restore();
  // saddles and riders: Pip on the front saddle (segment 2), Bo behind (segment 6)
  const riders = [[0, 1], [1, 6]];
  for (const [id, si] of riders) {
    const p = pts[si], a = ang(si);
    c.save(); c.translate(p.x, p.y); c.rotate(a);
    c.fillStyle = '#c8343c'; c.strokeStyle = '#2b2130'; c.lineWidth = 1; v.rr(-8, -11, 16, 6, 2); c.fill(); c.stroke();
    v.hero(id, 0, -9, { s: 0.78, face: 1, mood: id === 0 ? (t > 2.2 && t < 3.6 ? 'wow' : 'joy') : 'happy', shadow: false, vx: 300, rot: -0.12 });
    c.restore();
  }
  // the reins from Pip to the head
  c.strokeStyle = '#c8343c'; c.lineWidth = 1; c.beginPath(); c.moveTo(pts[1].x + 6, pts[1].y - 16); c.quadraticCurveTo(pts[0].x + 4, pts[0].y - 20, hx - 6, pw41pdY(hx, t) - 6); c.stroke();
  // the head: a folded box with a gold nose, a printed eye, horns, whiskers and a fringe
  const hy = pw41pdY(hx, t), ha = Math.atan2(hy - pts[1].y, hx - pts[1].x);
  c.save(); c.translate(hx, hy); c.rotate(ha * 0.7);
  for (let k = 0; k < 5; k++) { c.fillStyle = k % 2 ? '#e2b04a' : '#fbf7ec'; c.fillRect(-16 - k * 1.5, -11 + k * 4, 6, 2.2); }
  c.fillStyle = '#e2b04a'; c.strokeStyle = '#2b2130'; c.lineWidth = 1;
  for (const hxx of [-8, -2]) { c.beginPath(); c.moveTo(hxx, -10); c.lineTo(hxx - 7, -20); c.lineTo(hxx - 3, -10); c.closePath(); c.fill(); c.stroke(); }
  c.fillStyle = '#3f9a57'; c.strokeStyle = '#1f3a28'; c.lineWidth = 1.4; v.rr(-12, -11, 24, 15, 4); c.fill(); c.stroke();
  c.fillStyle = '#358a4b'; v.rr(-4, 1, 20, 7, 3); c.fill(); c.stroke();
  // the jaw open, with paper teeth (the Bookworm peeps out)
  c.fillStyle = '#8a1f2a'; c.beginPath(); c.moveTo(-2, 4); c.lineTo(16, 5); c.lineTo(14, 10); c.closePath(); c.fill();
  c.fillStyle = '#fbf7ec'; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(3 + k * 4, 4.5); c.lineTo(5 + k * 4, 7.5); c.lineTo(7 + k * 4, 4.5); c.fill(); }
  c.fillStyle = '#7cc46a'; v.circle(9, 7.5, 2.2); c.fill();
  c.fillStyle = '#e2b04a'; c.strokeStyle = '#2b2130'; c.lineWidth = 1; v.circle(12, -2, 4); c.fill(); c.stroke();
  c.fillStyle = '#fff'; v.circle(0, -5, 3.6); c.fill(); c.stroke(); c.fillStyle = '#2b2130'; v.circle(1.2, -5, 1.8); c.fill();
  c.strokeStyle = '#f0e6c8'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(12, 1); c.quadraticCurveTo(20, 4 + Math.sin(t * 6) * 3, 26, 1); c.moveTo(12, 3); c.quadraticCurveTo(18, 9, 24, 10 + Math.sin(t * 5) * 2); c.stroke();
  c.restore();
  return { hx, hy };
}

definePreview('Paper Dragon Flight', {
  blurb: 'Pip steers, Bo flies: ride a paper dragon after the runaway page.',
  loop: PW41PD.loop,
  still: 3,
  draw(v, t) {
    const c = v.ctx;
    pw41pdRoom(v, t);
    pw41pdEyes(v, t);
    // stars drifting past (they move left as the dragon flies right), a few far ones dim and slow
    for (let i = 0; i < 9; i++) {
      const far = i % 3 === 0, sp = far ? 30 : 70, x = ((v.rand(i) * 420 - t * sp) % 420 + 420) % 420 - 40, y = 30 + v.rand(i + 20) * 90;
      c.save(); if (far) c.globalAlpha = 0.5; pw41pdStar(v, x, y, far ? 3 : 4.5, t * 3 + i); c.restore();
    }
    const d = pw41pdDragon(v, t);
    // the page, always a little ahead, sometimes nearly in reach
    const px = d.hx + 34 + Math.sin(t * 1.7) * 10, py = d.hy - 22 + Math.sin(t * 2.2) * 9;
    pw41pdPage(v, px, py, t);
    // a near star whooshing by in front
    pw41pdStar(v, ((300 - t * 150) % 380 + 380) % 380 - 30, 150, 6, t * 4);
  },
});
