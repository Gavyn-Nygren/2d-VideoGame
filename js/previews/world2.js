/* Pip & Bo - Level previews for World 2 (see js/previews/preview-core.js for how to write one). */
'use strict';

// the falling-block colours (js/levels/block-building.js TETRO)
const pw2Col = { I: '#5fd0e6', O: '#ffd25e', T: '#b48cff', S: '#79d98b', Z: '#ff7a8a', L: '#ffa95c', J: '#7fa6ff' };
// one brick like the game's drawBrick, sz px square
function pw2Brick(v, x, y, col, sz = 20) {
  const ctx = v.ctx, e = sz * 0.15;
  ctx.fillStyle = col; ctx.fillRect(x, y, sz, sz);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y, sz, e); ctx.fillRect(x, y, e, sz);
  ctx.fillStyle = 'rgba(28,26,54,0.25)'; ctx.fillRect(x, y + sz - e, sz, e); ctx.fillRect(x + sz - e, y, e, sz);
  ctx.strokeStyle = 'rgba(28,26,54,0.45)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, sz - 1, sz - 1);
}
// a piece: cells [[cx, cy], ...] in sz-px tiles from (x, y); owner outlines it in the builder's colour while it falls,
// ghostY draws the dashed spot it will land on (red when it would land on the climber)
function pw2Piece(v, cells, x, y, col, o = {}) {
  const ctx = v.ctx, sz = o.sz || 20;
  if (o.ghostY != null && o.ghostY - y > 4) {
    ctx.save(); ctx.setLineDash([4, 3]); ctx.lineWidth = 1.6;
    ctx.strokeStyle = o.danger ? 'rgba(235,60,80,0.95)' : 'rgba(28,26,54,0.55)';
    for (const [cx, cy] of cells) {
      if (o.danger) { ctx.fillStyle = 'rgba(255,90,110,0.28)'; ctx.fillRect(x + cx * sz + 2, o.ghostY + cy * sz + 2, sz - 4, sz - 4); }
      ctx.strokeRect(x + cx * sz + 2, o.ghostY + cy * sz + 2, sz - 4, sz - 4);
    }
    ctx.restore();
  }
  ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  for (const [cx, cy] of cells) pw2Brick(v, x + cx * sz, y + cy * sz, col, sz);
  if (o.owner) { ctx.strokeStyle = o.owner; ctx.lineWidth = 2.2; for (const [cx, cy] of cells) ctx.strokeRect(x + cx * sz + 1.2, y + cy * sz + 1.2, sz - 2.4, sz - 2.4); }
  ctx.restore();
}
// the builder has no body in the game, so here Pip floats on a little cloud and drops the pieces
function pw2Builder(v, id, x, y, mood) {
  v.cloud(x - 12, y + 4, 1);
  v.hero(id, x, y + 2, { s: 0.9, face: 1, mood, shadow: false });
  v.cloud(x - 15, y + 7, 0.75);
}
// the gold finish flag (drawBuild), feet at (x, y); on 0..1 makes it glow
function pw2Flag(v, x, y, on, t) {
  const ctx = v.ctx;
  if (on > 0) v.fillCircle(x, y - 34, 16 + on * 4 + Math.sin(t * 4) * 2, 'rgba(255,215,90,' + (0.25 + on * 0.2) + ')');
  ctx.fillStyle = v.c.ink; ctx.fillRect(x - 1.5, y - 42, 3, 42);
  ctx.fillStyle = v.c.gold; ctx.beginPath(); ctx.moveTo(x + 1.5, y - 42); ctx.lineTo(x + 22, y - 34 + Math.sin(t * 6) * 2); ctx.lineTo(x + 1.5, y - 26); ctx.closePath(); ctx.fill();
}

// 2-1: Pip drops two pieces, Bo climbs them up to the flag, then they swap jobs
definePreview('Brick by Brick', {
  blurb: 'One of you drops blocks, the other climbs them to the flag. Then swap!',
  loop: 6.5, still: 2.8,
  draw(v, t) {
    const gy = 160, k = t / 6.5, ledge = 80, sz = 20;
    v.backdrop(gy);
    v.block(250, ledge, 80, gy - ledge + 4);
    const reset = k >= 0.95, fade = k < 0.9 ? 1 : reset ? v.seg(k, 0.95, 1) : 1 - v.seg(k, 0.9, 0.95);
    const won = k > 0.69 && !reset;
    pw2Flag(v, 292, ledge, won ? v.seg(k, 0.69, 0.75) : 0, t);
    // piece A: a long I; piece B: a square O on its right end
    const I = [[0, 0], [1, 0], [2, 0], [3, 0]], O = [[0, 0], [1, 0], [0, 1], [1, 1]];
    const aX = v.lerp(120, 170, v.ease.inOut(v.seg(k, 0.04, 0.13))), aY = v.lerp(52, gy - sz, v.ease.in(v.seg(k, 0.14, 0.25)));
    const bX = v.lerp(190, 210, v.ease.inOut(v.seg(k, 0.29, 0.35))), bY = v.lerp(52, gy - 3 * sz, v.ease.in(v.seg(k, 0.37, 0.48)));
    const showB = k > 0.26;
    // Pip's cloud follows the piece being placed, then floats back to the middle
    let cloudX = k < 0.26 ? aX + 40 : bX + 20;
    if (k > 0.5) cloudX = v.lerp(230, 160, v.ease.inOut(v.seg(k, 0.5, 0.95)));
    if (reset) cloudX = 160;
    v.ctx.save(); v.ctx.globalAlpha *= 1 - v.seg(k, 0.9, 0.95);
    if (!reset) {
      pw2Piece(v, I, aX, aY, pw2Col.I, { owner: k < 0.25 ? v.c.pip : null, ghostY: gy - sz });
      if (showB) pw2Piece(v, O, bX, bY, pw2Col.O, { owner: k < 0.48 ? v.c.pip : null, ghostY: gy - 3 * sz, alpha: v.seg(k, 0.26, 0.29) });
    }
    v.ctx.restore();
    if (reset) pw2Piece(v, I, 120, 52, pw2Col.I, { owner: v.c.pip, ghostY: gy - sz, alpha: v.seg(k, 0.95, 1) });
    v.puff(aX + 10, gy, v.seg(k, 0.25, 0.37)); v.puff(bX + 30, gy - 2 * sz, v.seg(k, 0.48, 0.6));
    // Bo climbs: onto the I, onto the O, onto the ledge
    let boX = 100, boY = gy, air = false;
    const h1 = v.seg(k, 0.27, 0.35), h2 = v.seg(k, 0.51, 0.58), h3 = v.seg(k, 0.6, 0.67);
    if (k > 0.27) { boX = v.lerp(100, 184, h1); boY = v.lerp(gy, gy - sz, h1) + v.hop(h1, 18); air = h1 < 1; }
    if (k > 0.51) { boX = v.lerp(184, 230, h2); boY = v.lerp(gy - sz, gy - 3 * sz, h2) + v.hop(h2, 20); air = h2 < 1; }
    if (k > 0.6) { boX = v.lerp(230, 272, h3); boY = v.lerp(gy - 3 * sz, ledge, h3) + v.hop(h3, 16); air = h3 < 1; }
    if (reset) { boX = 100; boY = gy; }
    v.hero(1, boX, boY, { face: 1, alpha: fade, shadow: !air, mood: won ? 'joy' : air ? 'grit' : k > 0.36 && k < 0.5 ? 'wow' : 'happy' });
    pw2Builder(v, 0, cloudX, 40, won ? 'joy' : 'happy');
    v.confetti(292, ledge - 30, v.seg(k, 0.69, 0.9));
    if (k > 0.77 && k < 0.93) {
      const s = v.ease.back(v.seg(k, 0.77, 0.81));
      v.ctx.save(); v.ctx.translate(160, 92); v.ctx.scale(s, s); v.label('SWAP!', 0, 0, 22, v.c.gold); v.ctx.restore();
    }
  },
});

// 2-2: up a narrow shaft. A piece is about to land on Bo (red warning), Bo hops clear, then climbs to the ledge
definePreview('Sky Tower', {
  blurb: 'Stack blocks up the tower. Watch out, don’t drop one on your partner!',
  loop: 6.5, still: 2.25,
  draw(v, t) {
    const gy = 165, k = t / 6.5, sz = 20, ledge = 85, x0 = 130;
    v.sky(); v.sun(56, 40); v.clouds(t); v.hills(gy - 30); v.ground(gy);
    v.block(x0 - 22, -4, 22, gy + 4, false);
    v.block(x0 + 4 * sz, ledge, 120, gy - ledge + 4);
    const reset = k >= 0.95, fade = k < 0.9 ? 1 : reset ? v.seg(k, 0.95, 1) : 1 - v.seg(k, 0.9, 0.95);
    const won = k > 0.8 && !reset;
    pw2Flag(v, 282, ledge, won ? v.seg(k, 0.8, 0.86) : 0, t);
    // A: a square on the left; B: a tall J aimed right where Bo stands
    const O = [[0, 0], [1, 0], [0, 1], [1, 1]], J = [[0, 2], [1, 2], [1, 1], [1, 0]];
    const aX = v.lerp(160, x0, v.ease.inOut(v.seg(k, 0.03, 0.1))), aY = v.lerp(52, gy - 2 * sz, v.ease.in(v.seg(k, 0.1, 0.22)));
    const bY = v.lerp(46, gy - 3 * sz, v.ease.in(v.seg(k, 0.3, 0.5))), showB = k > 0.23;
    let boX = 182, boY = gy, air = false;
    const h1 = v.seg(k, 0.36, 0.44), h2 = v.seg(k, 0.58, 0.66), h3 = v.seg(k, 0.68, 0.75);
    if (k > 0.36) { boX = v.lerp(182, 148, h1); boY = v.lerp(gy, gy - 2 * sz, h1) + v.hop(h1, 18); air = h1 < 1; }
    if (k > 0.58) { boX = v.lerp(148, 199, h2); boY = v.lerp(gy - 2 * sz, gy - 3 * sz, h2) + v.hop(h2, 22); air = h2 < 1; }
    if (k > 0.68) { boX = v.lerp(199, 236, h3); boY = v.lerp(gy - 3 * sz, ledge, h3) + v.hop(h3, 16); air = h3 < 1; }
    if (k > 0.75) { boX = v.lerp(236, 262, v.ease.inOut(v.seg(k, 0.75, 0.8))); boY = ledge; }
    if (reset) { boX = 182; boY = gy; }
    const danger = showB && k < 0.4; // Bo is still under B's landing spot
    v.ctx.save(); v.ctx.globalAlpha *= 1 - v.seg(k, 0.9, 0.95);
    pw2Piece(v, O, aX, aY, pw2Col.O, { owner: k < 0.22 ? v.c.pip : null, ghostY: gy - 2 * sz });
    if (showB) pw2Piece(v, J, x0 + 2 * sz, bY, pw2Col.J, { owner: k < 0.5 ? v.c.pip : null, ghostY: gy - 3 * sz, danger, alpha: v.seg(k, 0.23, 0.27) });
    v.ctx.restore();
    if (reset) pw2Piece(v, O, 160, 52, pw2Col.O, { owner: v.c.pip, ghostY: gy - 2 * sz, alpha: v.seg(k, 0.95, 1) });
    v.puff(aX + 20, gy, v.seg(k, 0.22, 0.34)); v.puff(x0 + 2 * sz + 20, gy, v.seg(k, 0.5, 0.62));
    v.hero(1, boX, boY, { face: k > 0.36 && k < 0.5 ? -1 : 1, alpha: fade, shadow: !air, mood: won ? 'joy' : danger ? 'wow' : air ? 'grit' : 'happy' });
    // the warning over Bo's head while the drop would land on them
    if (danger && k > 0.27) {
      const hy = boY - 40 + Math.sin(t * 10) * 2;
      v.fillCircle(boX, hy, 9, '#eb3c50'); v.text('!', boX, hy + 1, 15, '#fff');
    }
    if (k > 0.5 && k < 0.6) v.bubble('Phew!', boX, boY - 30);
    const cloudX = reset ? 160 : k < 0.23 ? aX + 20 : v.lerp(x0 + 2 * sz + 20, 160, v.ease.inOut(v.seg(k, 0.6, 0.95)));
    pw2Builder(v, 0, cloudX, 40, won ? 'joy' : danger ? 'wow' : 'happy');
    v.confetti(282, ledge - 30, v.seg(k, 0.8, 1));
  },
});

// a Robo Pong paddle with a face (robo-pong.js drawPaddleFace): who 0 Pip, 1 Bo, 2 Robo; eyes follow the ball (bx, by)
function pw2Paddle(v, x, y, w, h, who, bx, by, joy) {
  const ctx = v.ctx, cx = x + w / 2, ey = y + Math.min(15, h * 0.3);
  const lx = v.clamp((bx - cx) / 100, -1, 1) * 1.4, ly = v.clamp((by - ey) / 70, -1, 1) * 1.4;
  if (who < 2) {
    const col = who ? v.c.bo : v.c.pip, dark = who ? v.c.boDark : v.c.pipDark;
    if (who === 1) { ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 1.6; for (const ex of [x + 2, x + w - 2]) { v.circle(ex, y + 1, 3.6); ctx.fill(); ctx.stroke(); } }
    ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 2;
    v.rr(x, y, w, h, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; v.rr(x + 2, y + 3, 3, h - 6, 1.5); ctx.fill();
    if (who === 0) { v.line(cx, y, cx + 1, y - 4, '#3f8f5c', 1.6); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(cx + 3.5, y - 5.5, 4.2, 2.1, -0.5, 0, Math.PI * 2); ctx.fill(); }
    for (const ex of [cx - 3, cx + 3]) {
      if (joy) { ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(ex, ey + 1, 2, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); continue; }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex + lx * 0.4, ey, 2.7, 3.3, 0, 0, Math.PI * 2); ctx.fill();
      v.fillCircle(ex + lx, ey + ly * 0.6, 1.5, v.c.ink);
    }
    v.fillCircle(cx, ey + 7, 1.7, 'rgba(255,120,140,0.5)');
  } else {
    v.line(cx, y, cx, y - 7, '#5d6485', 1.6);
    v.fillCircle(cx, y - 8.5, 2.6, (v.t % 1) < 0.5 ? '#ff5a6e' : '#ffd25e');
    ctx.fillStyle = '#c6cbe0'; ctx.strokeStyle = '#5d6485'; ctx.lineWidth = 2;
    v.rr(x, y, w, h, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; v.rr(x + 2, y + 3, 3, h - 6, 1.5); ctx.fill();
    ctx.fillStyle = '#5d6485'; for (let q = 1; q <= 3; q++) ctx.fillRect(x + 3, y + h - 6 * q - 2, w - 6, 1.5);
    ctx.fillStyle = '#2b2f4a'; v.rr(x + 1.5, ey - 5, w - 3, 10, 3); ctx.fill();
    v.fillCircle(cx + lx * 0.6, ey + ly * 0.8, 4.5, 'rgba(255,90,110,0.35)');
    v.fillCircle(cx + lx * 0.6, ey + ly * 0.8, 2.3, '#ff5a6e');
  }
}

// 2-3: a rally against Robo. Pip takes the top, Bo the bottom; Bo's shot sneaks past Robo for a point
definePreview('Robo Pong', {
  blurb: 'Pip guards the top, Bo the bottom. Team up to beat Robo at pong!',
  loop: 6.5, still: 4.16,
  draw(v, t) {
    const ctx = v.ctx, k = t / 6.5, top = 20, bot = 166, mid = 93, pw = 13, ph = 38, rh = 56, padX = 10, aiX = 297, r = 5;
    v.sky(); v.sun(); v.clouds(t); v.hills(120);
    // the court: a tinted field, each player's half on the left, a dashed centre line
    ctx.fillStyle = 'rgba(28,26,54,0.12)'; ctx.fillRect(0, top, v.W, bot - top);
    ctx.fillStyle = 'rgba(255,107,74,0.14)'; ctx.fillRect(0, top, 40, mid - top);
    ctx.fillStyle = 'rgba(91,149,255,0.14)'; ctx.fillRect(0, mid, 40, bot - mid);
    ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(v.W / 2, top + 4); ctx.lineTo(v.W / 2, bot); ctx.stroke();
    ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(28,26,54,0.35)';
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(40, mid); ctx.stroke(); ctx.restore();
    v.block(-2, -4, v.W + 4, top + 4, false); v.block(-2, bot, v.W + 4, v.H - bot + 2, false);
    v.label('Pip', 56, top + 12, 12, v.c.pip); v.label('Bo', 56, bot - 12, 12, v.c.bo);
    // the ball's path: serve to Robo, Pip, Robo, Bo, a bounce off the floor wall, and past Robo
    const K = [[0.06, 160, 93], [0.15, aiX - r, 70], [0.32, padX + pw + r, 38], [0.48, aiX - r, 120], [0.64, padX + pw + r, 144], [0.71, 150, bot - r], [0.8, 334, 103]];
    const ball = q => {
      if (q <= K[0][0]) return [K[0][1], K[0][2]];
      for (let i = 1; i < K.length; i++) if (q <= K[i][0]) { const s = (q - K[i - 1][0]) / (K[i][0] - K[i - 1][0]); return [v.lerp(K[i - 1][1], K[i][1], s), v.lerp(K[i - 1][2], K[i][2], s)]; }
      return null;
    };
    const hitAt = (q, at) => Math.max(0, 1 - Math.abs(q - at) / 0.03); // a short squash when the paddle hits
    // paddles slide to meet the ball, then drift back; Robo goes the wrong way at the end
    const ease = v.ease.inOut, sg = (a, b) => ease(v.seg(k, a, b));
    const pipY = 57 + (38 - 57) * sg(0.2, 0.3) - (38 - 57) * sg(0.36, 0.5);
    const boY = 130 + (144 - 130) * sg(0.52, 0.62) - (144 - 130) * sg(0.68, 0.85);
    const roboY = 93 + (70 - 93) * sg(0.04, 0.13) + (93 - 70) * sg(0.18, 0.3) + (120 - 93) * sg(0.34, 0.46) + (70 - 120) * sg(0.52, 0.76) + (93 - 70) * sg(0.86, 1);
    const b = ball(k), point = k > 0.8, joy = point && k < 0.97;
    const [bx, by] = b || [334, 103];
    pw2Paddle(v, padX - 2 * hitAt(k, 0.32), pipY - ph / 2, pw, ph, 0, bx, by, joy);
    pw2Paddle(v, padX - 2 * hitAt(k, 0.64), boY - ph / 2, pw, ph, 1, bx, by, joy);
    pw2Paddle(v, aiX + 2 * (hitAt(k, 0.15) + hitAt(k, 0.48)), roboY - rh / 2, pw, rh, 2, bx, by);
    // the ball (blinking while it waits to be served) with a short trail
    if (b && (k > 0.06 || (t * 4) % 1 < 0.6)) {
      for (let q = 4; q >= 1; q--) { const p = ball(k - q * 0.008); if (p) v.fillCircle(p[0], p[1], r * (1 - q * 0.15), 'rgba(255,255,255,' + (0.35 - q * 0.07) + ')'); }
      v.fillCircle(bx + 1, by + 2, r, 'rgba(28,26,54,0.25)');
      v.fillCircle(bx, by, r, '#fffaf0'); ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.6; v.circle(bx, by, r); ctx.stroke();
    }
    if (k > 0.76 && k < 0.92) v.label('?', aiX + pw / 2, roboY - rh / 2 - 20, 16, '#c6cbe0');
    if (point) {
      const s = v.ease.back(v.seg(k, 0.8, 0.85)) * (1 - v.seg(k, 0.94, 0.98));
      ctx.save(); ctx.translate(160, 62); ctx.scale(s, s); v.label('POINT!', 0, 0, 22, v.c.gold); ctx.restore();
      v.confetti(40, 93, v.seg(k, 0.8, 1));
      v.star(160, 92, 9 * s);
    }
    // the serve waits in the middle again at the end of the loop
    if (k > 0.93 && (t * 4) % 1 < 0.6) { ctx.save(); ctx.globalAlpha *= v.seg(k, 0.93, 0.97); v.fillCircle(160, 93, r, '#fffaf0'); ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.6; v.circle(160, 93, r); ctx.stroke(); ctx.restore(); }
  },
});

// the crown (render.js drawCrownShape), centred on (x, y)
function pw2Crown(v, x, y, s = 1) {
  const ctx = v.ctx;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * 0.75, s * 0.75);
  ctx.fillStyle = v.c.gold; ctx.strokeStyle = v.c.goldDark; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, 7); ctx.lineTo(-13, -6); ctx.lineTo(-6, 0); ctx.lineTo(0, -9); ctx.lineTo(6, 0); ctx.lineTo(13, -6); ctx.lineTo(12, 7); ctx.closePath();
  ctx.fill(); ctx.stroke();
  v.fillCircle(0, 2, 2.6, '#ff5f7e'); v.fillCircle(-7, 3, 2, '#7fd8ff'); v.fillCircle(7, 3, 2, '#7fd8ff');
  ctx.restore();
}

// 2-4: Pip grabs the crown, Bo stomps Pip and steals it, Pip stomps back and fills the crown meter first
definePreview('Crown Keep', {
  blurb: 'Grab the crown and keep it! Stomp on whoever has it to steal it.',
  loop: 8, still: 3.2,
  draw(v, t) {
    const ctx = v.ctx, gy = 160, k = t / 8, pl = 112;
    v.backdrop(gy);
    v.block(142, gy - 20, 36, 22, false); // the stone lump in the middle of the floor
    v.plank(118, pl, 84); v.plank(22, 86, 60); v.plank(238, 86, 60);
    v.plank(58, 136, 46); v.plank(216, 136, 46); // the low steps: every plank is a short hop up, even with the heavy crown
    for (const px of [122, 194]) { ctx.fillStyle = v.c.plankDark; ctx.fillRect(px, pl + 5, 3, 6); }
    const reset = k >= 0.95, fade = k < 0.9 ? 1 : reset ? v.seg(k, 0.95, 1) : 1 - v.seg(k, 0.9, 0.95);
    const run = (a, b) => (k > a && k < b ? v.hop(v.phase(t, 0.34), 3) : 0);
    const pip = { x: 40, y: gy, face: 1, mood: 'grit', sq: 0, air: false }, bo = { x: 280, y: gy, face: -1, mood: 'grit', sq: 0, air: false };
    const arc = (h, a, b, x0, y0, x1, y1, hh) => { const s = v.seg(k, a, b); h.x = v.lerp(x0, x1, s); h.y = v.lerp(y0, y1, s) + v.hop(s, hh); h.air = s > 0 && s < 1; };
    // Pip: runs in, hops up, grabs the crown; gets stomped; stomps Bo back and wins
    pip.x = v.lerp(40, 108, v.ease.inOut(v.seg(k, 0.02, 0.12))); pip.y += run(0.02, 0.12);
    if (k > 0.12) arc(pip, 0.12, 0.19, 108, gy, 148, pl, 18);
    if (k > 0.38 && k < 0.5) { pip.mood = 'dizzy'; pip.sq = 0.3 * (1 - v.seg(k, 0.38, 0.44)); }
    if (k > 0.52) { pip.x = v.lerp(148, 190, v.ease.inOut(v.seg(k, 0.52, 0.6))); pip.y = pl + run(0.52, 0.6); pip.face = 1; }
    if (k > 0.61) arc(pip, 0.61, 0.69, 190, pl, 248, gy - 25, 14);
    if (k > 0.69) arc(pip, 0.69, 0.77, 248, gy - 25, 280, gy, 16);
    // Bo: runs in under the plank, hops onto its end, jumps on Pip's head, bounces off and runs off with the crown
    bo.x = v.lerp(280, 216, v.ease.inOut(v.seg(k, 0.03, 0.15))); bo.y += run(0.03, 0.15);
    if (k > 0.2) arc(bo, 0.2, 0.27, 216, gy, 192, pl, 16);
    if (k > 0.3) arc(bo, 0.3, 0.38, 192, pl, 150, pl - 25, 20);
    if (k > 0.38) arc(bo, 0.38, 0.46, 150, pl - 25, 180, pl, 16);
    if (k > 0.46) { bo.face = 1; }
    if (k > 0.47) arc(bo, 0.47, 0.54, 180, pl, 222, gy, 10);
    if (k > 0.54) { bo.x = v.lerp(222, 248, v.ease.inOut(v.seg(k, 0.54, 0.6))); bo.y = gy + run(0.54, 0.6); }
    if (k > 0.69 && k < 0.82) { bo.mood = 'dizzy'; bo.sq = 0.3 * (1 - v.seg(k, 0.69, 0.75)); bo.face = 1; }
    if (k > 0.82) { bo.mood = 'wow'; bo.face = 1; }
    if (reset) { pip.x = 40; pip.y = gy; bo.x = 280; bo.y = gy; bo.face = -1; bo.mood = pip.mood = 'grit'; pip.sq = bo.sq = 0; }
    const win = k > 0.82 && !reset;
    if (win) { pip.mood = 'joy'; pip.y = gy + v.hop(v.phase(t, 0.5), 8); pip.face = -1; }
    // who holds the crown: nobody, Pip (0.19), Bo (0.38 stomp), Pip (0.69 stomp)
    const head = h => [h.x, h.y - 24 * (1 - h.sq * 0.3) - 8];
    let cx = 160, cy = 92 + Math.sin(t * 3) * 3, holder = null;
    if (k > 0.19) holder = pip;
    if (k > 0.38) holder = bo;
    if (k > 0.69) holder = pip;
    if (reset) holder = null;
    if (holder) [cx, cy] = head(holder);
    // the stolen crown flies across in a little arc
    const fly = (a, b, from, to) => { const s = v.seg(k, a, b), [x0, y0] = head(from), [x1, y1] = head(to); cx = v.lerp(x0, x1, s); cy = v.lerp(y0, y1, s) + v.hop(s, 30); };
    if (k > 0.38 && k < 0.45) fly(0.38, 0.45, pip, bo);
    if (k > 0.69 && k < 0.75) fly(0.69, 0.75, bo, pip);
    if (!holder) v.fillCircle(cx, cy, 14 + Math.sin(t * 5) * 1.5, 'rgba(255,215,90,0.3)');
    v.hero(0, pip.x, pip.y, { face: pip.face, mood: pip.mood, sq: pip.sq, shadow: !pip.air, alpha: fade });
    v.hero(1, bo.x, bo.y, { face: bo.face, mood: bo.mood, sq: bo.sq, shadow: !bo.air, alpha: fade });
    ctx.save(); ctx.globalAlpha *= fade; pw2Crown(v, cx, cy, holder ? 0.9 : 1.1); ctx.restore();
    v.sparkle(160, 92, v.seg(k, 0.19, 0.3), v.c.gold, 12);
    // the shout goes beside the stomp, so it never hides the heroes or the crown
    for (const [a, x, y] of [[0.38, 92, pl - 50], [0.69, 200, gy - 66]]) {
      if (k > a && k < a + 0.09) { const s = v.ease.back(v.seg(k, a, a + 0.03)); ctx.save(); ctx.translate(x, y); ctx.scale(s, s); v.label('STOMP!', 0, 0, 15, '#fff'); ctx.restore(); }
    }
    // crown meters: Pip's fills from the left, Bo's from the right
    const pipM = 0.5 * v.seg(k, 0.19, 0.38) + 0.5 * v.seg(k, 0.72, 0.82), boM = 0.45 * v.seg(k, 0.44, 0.69);
    const mf = 1 - v.seg(k, 0.9, 0.95);
    for (const [id, x0, m] of [[0, 18, pipM], [1, 182, boM]]) {
      ctx.fillStyle = 'rgba(28,26,54,0.55)'; v.rr(x0, 9, 120, 12, 6); ctx.fill();
      const fw = 116 * m * mf;
      if (fw > 1) { ctx.fillStyle = id ? v.c.bo : v.c.pip; v.rr(id ? x0 + 118 - fw : x0 + 2, 11, fw, 8, 4); ctx.fill(); }
    }
    pw2Crown(v, 160, 15, 0.8);
    if (win) {
      const s = v.ease.back(v.seg(k, 0.82, 0.86));
      ctx.save(); ctx.globalAlpha *= fade; ctx.translate(160, 54); ctx.scale(s, s); v.label('WIN!', 0, 0, 24, v.c.gold); ctx.restore();
      v.confetti(pip.x, pip.y - 30, v.seg(k, 0.82, 1));
      v.star(78, 15, 8 * s);
    }
  },
});
