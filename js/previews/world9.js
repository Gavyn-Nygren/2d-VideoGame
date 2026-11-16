/* Pip & Bo - Level previews for World 9 (see js/previews/preview-core.js for how to write one). */
'use strict';

/* ---------- shared bits for World 9 (every top-level name starts with pw9) ---------- */
// draws scene(k) and, at the end of the loop, fades the opening frame in over it, so the loop has no seam
function pw9Loop(v, k, scene, from = 0.93) {
  scene(k);
  if (k > from) { v.ctx.save(); v.ctx.globalAlpha *= v.ease.inOut(v.seg(k, from, 1)); scene(0); v.ctx.restore(); }
}
// a vertical gradient from y0 to y1 through the given colours
function pw9Grad(v, y0, y1, cols) {
  const g = v.ctx.createLinearGradient(0, y0, 0, y1);
  cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c));
  return g;
}
// a friendly volcano cone with a glowing top and fluffy grey puffs (x = crater, base = foot line, s = size)
function pw9Volcano(v, x, base, s, t, body, shade) {
  const ctx = v.ctx, top = base - 100 * s, w = 110 * s;
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.moveTo(x - w, base); ctx.quadraticCurveTo(x - w * 0.4, base - 60 * s, x - 18 * s, top); ctx.lineTo(x + 18 * s, top);
  ctx.quadraticCurveTo(x + w * 0.4, base - 60 * s, x + w, base); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade;
  ctx.beginPath(); ctx.moveTo(x + 6 * s, top); ctx.lineTo(x + 18 * s, top); ctx.quadraticCurveTo(x + w * 0.4, base - 60 * s, x + w, base); ctx.lineTo(x + 34 * s, base); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff9a4a'; ctx.beginPath(); ctx.ellipse(x, top, 19 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.ellipse(x, top - 0.5, 12 * s, 2.4 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,150,80,0.8)'; ctx.lineWidth = 3 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 8 * s, top + 3 * s); ctx.quadraticCurveTo(x - 15 * s, top + 22 * s, x - 11 * s, top + 38 * s);
  ctx.moveTo(x + 8 * s, top + 3 * s); ctx.quadraticCurveTo(x + 13 * s, top + 18 * s, x + 18 * s, top + 30 * s); ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const f = v.phase(t, 6, i), y = top - 6 * s - f * 90 * s, r = (8 + f * 20) * s, px = x + Math.sin(f * 5 + i) * 8 * s + f * 30 * s;
    v.fillCircle(px, y, r, 'rgba(150,140,160,' + (0.75 - f * 0.45).toFixed(3) + ')');
    v.fillCircle(px - r * 0.3, y - r * 0.3, r * 0.55, 'rgba(205,198,212,' + (0.6 - f * 0.35).toFixed(3) + ')');
  }
}
// a fluffy grey ash clump
function pw9Clump(v, x, y, r) {
  v.fillCircle(x, y, r, '#8e8598');
  v.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.5, '#b9b1c2');
}

/* ---------- 9-1 Pompeii Escape ---------- */
// Pip rides the crane lift up the wall while Bo pulls its lever, Pip drops the rope ladder and Bo climbs it, and both hop
// onto the boat ahead of the lava
definePreview('Pompeii Escape', {
  blurb: 'Ride the crane lift up the walls, drop a rope ladder, and run to the boat before the lava!',
  loop: 6.5, still: 1.58,
  draw(v, t) { pw9Loop(v, t / 6.5, k => this.scene(v, k, k * 6.5)); },
  scene(v, k, t) {
    const ctx = v.ctx, gy = 150, wx = 150, roof = 94, hx1 = 238, deckX = 246, bob = Math.sin(t * 2.2) * 1.5, deck = 114 + bob;
    const sail = 64 * v.ease.in(v.seg(k, 0.84, 1));   // with both on deck, the ship sails off
    // sky, hazy sun, Vesuvius puffing away on the left, the bay on the right
    ctx.fillStyle = pw9Grad(v, 0, v.H, ['#d98d88', '#f5b88c', '#ffd9ab', '#ffe8c4']); ctx.fillRect(0, 0, v.W, v.H);
    v.fillCircle(262, 30, 20, 'rgba(255,236,190,0.35)'); v.fillCircle(262, 30, 12, 'rgba(255,242,205,0.9)');
    pw9Volcano(v, 50, gy, 0.8, t, '#a4808a', '#b8949a');
    ctx.fillStyle = '#c2a3a2'; ctx.beginPath(); ctx.moveTo(228, 128); ctx.quadraticCurveTo(270, 116, 320, 124); ctx.lineTo(320, 130); ctx.lineTo(228, 130); ctx.fill();
    ctx.fillStyle = pw9Grad(v, 128, v.H, ['#8cc3d0', '#3f7fa3']); ctx.fillRect(228, 128, 92, 52);
    // far houses of the town
    for (const [x, w, h] of [[96, 22, 18], [118, 26, 26]]) {
      ctx.fillStyle = '#efc3a4'; ctx.fillRect(x, gy - h, w, h);
      ctx.fillStyle = '#d0806a'; ctx.beginPath(); ctx.moveTo(x - 3, gy - h + 1); ctx.lineTo(x + w / 2, gy - h - 7); ctx.lineTo(x + w + 3, gy - h + 1); ctx.fill();
    }
    // the street: warm paving stones
    ctx.fillStyle = '#ad9a86'; ctx.fillRect(0, gy, wx + 2, v.H - gy);
    ctx.fillStyle = '#c5b29c'; for (let x = 0; x < wx; x += 16) { ctx.fillRect(x + 1, gy + 6, 13, 7); ctx.fillRect(x + 9, gy + 17, 13, 7); }
    ctx.fillStyle = '#d8c7b0'; ctx.fillRect(0, gy, wx + 2, 3);
    // the house: plaster wall, a shuttered window, terracotta roof tiles on top
    ctx.fillStyle = '#f2c784'; ctx.fillRect(wx, roof, hx1 - wx, gy - roof + 30);
    ctx.fillStyle = '#c98b4c'; ctx.fillRect(wx, roof, 3, gy - roof + 30); ctx.fillRect(hx1 - 3, roof, 3, gy - roof + 30);
    ctx.fillStyle = '#6f9e86'; ctx.fillRect(184, 106, 6, 16); ctx.fillRect(208, 106, 6, 16);
    ctx.fillStyle = '#5a3426'; v.rr(191, 105, 16, 18, 7); ctx.fill();
    ctx.fillStyle = '#c98b4c'; ctx.fillRect(186, 122, 26, 3);
    ctx.fillStyle = '#5fa65a'; v.circle(194, 120, 2.6); ctx.fill(); v.circle(203, 120, 2.6); ctx.fill();
    ctx.fillStyle = '#ff6f61'; v.circle(193, 118, 2); ctx.fill(); v.circle(198, 117, 2); ctx.fill(); v.circle(204, 118, 2); ctx.fill();
    ctx.save(); ctx.globalAlpha *= 0.82; v.text('POMPEII', 199, 140, 12, '#a3342a'); ctx.restore();
    ctx.fillStyle = '#b8463a'; ctx.fillRect(wx, 168, hx1 - wx, 12);
    ctx.fillStyle = '#9e3f2c'; ctx.fillRect(wx - 3, roof, hx1 - wx + 6, 9);
    ctx.fillStyle = '#d65f3f'; for (let x = wx - 2; x < hx1 + 2; x += 9) { v.rr(x + 0.5, roof + 1, 8, 6, 3); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,220,190,0.5)'; ctx.fillRect(wx - 3, roof + 1, hx1 - wx + 6, 1.5);
    // the boat at the quay: hull, mast, a striped sail and the ship's dog
    ctx.save(); ctx.translate(sail, bob);
    v.line(288, 30, 288, 114, '#6b4630', 4);
    ctx.fillStyle = '#f5ead2'; ctx.beginPath(); ctx.moveTo(290, 36); ctx.quadraticCurveTo(326, 64, 290, 100); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c9473a'; ctx.beginPath(); ctx.moveTo(290, 56); ctx.quadraticCurveTo(312, 68, 290, 80); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c9473a'; ctx.beginPath(); ctx.moveTo(289, 30); ctx.lineTo(304, 33 + Math.sin(t * 6) * 1.5); ctx.lineTo(289, 37); ctx.fill();
    ctx.fillStyle = '#8b5a3c'; ctx.beginPath(); ctx.moveTo(deckX, 114); ctx.lineTo(324, 114); ctx.lineTo(324, 150); ctx.lineTo(258, 150); ctx.quadraticCurveTo(248, 140, deckX, 114); ctx.fill();
    ctx.fillStyle = '#6e4429'; ctx.fillRect(deckX + 4, 124, 80, 4);
    ctx.fillStyle = '#4a2c1b'; for (const ox of [268, 290, 312]) { v.circle(ox, 136, 3); ctx.fill(); }
    ctx.fillStyle = '#c4935f'; ctx.fillRect(deckX, 114, 80, 3);
    const dx = 312, dy = 114, wag = Math.sin(t * 12) * 3;
    ctx.fillStyle = '#a0683f'; ctx.beginPath(); ctx.ellipse(dx, dy - 7, 9, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    v.circle(dx - 8, dy - 14, 5.5); ctx.fill();
    v.line(dx + 8, dy - 9, dx + 13, dy - 15 + wag, '#a0683f', 2.5);
    ctx.fillStyle = '#6d4126'; ctx.beginPath(); ctx.ellipse(dx - 6, dy - 18, 2.2, 4, 0.4, 0, Math.PI * 2); ctx.fill();
    v.fillCircle(dx - 10, dy - 15, 1.2, v.c.ink); v.fillCircle(dx - 13.5, dy - 13, 1.4, v.c.ink);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) { const x = 240 + ((i * 23 + t * 9) % 80), y = 156 + i * 6; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 5, y - 3, x + 10, y); ctx.stroke(); }
    // the lava creeps in along the street, always a good way behind the last one
    const front = v.lerp(-12, 92, v.ease.inOut(v.seg(k, 0.02, 0.58))) + 22 * v.seg(k, 0.58, 0.92), ly = gy - 3;
    if (front > -8) {
      ctx.fillStyle = 'rgba(255,140,60,0.28)'; v.rr(-20, ly - 16, front + 30, 24, 10); ctx.fill();
      const wave = x => ly + Math.sin(x / 9 + t * 2.4) * 1.2;
      ctx.beginPath(); ctx.moveTo(-10, v.H); ctx.lineTo(-10, wave(-10));
      for (let x = 0; x <= front - 8; x += 6) ctx.lineTo(x, wave(x));
      ctx.quadraticCurveTo(front + 4, ly - 1, front + 6, ly + 10); ctx.lineTo(front + 8, v.H); ctx.closePath();
      ctx.fillStyle = pw9Grad(v, ly, v.H, ['#ffb347', '#ff6a2a', '#c8391c']); ctx.fill();
      ctx.strokeStyle = '#ffe28a'; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let x = 0; x <= front - 8; x += 6) { if (x) ctx.lineTo(x, wave(x) + 1); else ctx.moveTo(x, wave(x) + 1); }
      ctx.stroke();
      for (let q = 0; q < 3; q++) { const bx = (q * 37 + t * 14) % Math.max(10, front - 10); if (bx < front - 12) v.fillCircle(bx, ly + 9 + q * 6, 2 + (q % 2), '#ffd27a'); }
    }
    // falling ash: soft clumps with a shadow where they will land, then a puff
    for (const [x, t0, land] of [[60, 0.2, gy], [214, 2.1, roof], [116, 4.4, gy]]) {
      const u = (t - t0) / 0.9;
      if (u > 0 && u < 1) { v.shadow(x, land, 8 + u * 8); pw9Clump(v, x, v.lerp(-12, land - 6, u * u), 6); }
      v.puff(x, land, (t - t0 - 0.9) / 0.5, 'rgba(200,192,206,0.9)');
    }
    // Pip walks onto the crane lift's deck by the wall, Bo to its lever; Bo pulls, the deck hoists Pip up to the roof
    const walk = (a, b) => (k > a && k < b ? v.hop(v.phase(t, 0.3), 4) : 0);
    const lvX = 102, dk0 = 128, dk1 = 150, up = v.ease.inOut(v.seg(k, 0.18, 0.32)) * (1 - v.ease.inOut(v.seg(k, 0.4, 0.5)));
    const deckY = v.lerp(gy, roof, up), pull = k > 0.14 && k < 0.36 ? 1 : 0;
    let boX = v.lerp(70, lvX + 8, v.ease.inOut(v.seg(k, 0.02, 0.12))), boY = gy + walk(0.02, 0.12), boFace = -1;
    let pipX = v.lerp(84, 139, v.ease.inOut(v.seg(k, 0, 0.12))), pipY = gy + walk(0, 0.12), pipFace = 1;
    if (k > 0.18) pipY = Math.min(pipY, deckY);
    if (k > 0.32) { const s = v.seg(k, 0.33, 0.37); pipX = v.lerp(139, 160, s); pipY = roof + v.hop(s, 6); }
    // then Pip drops the rope ladder from the edge and Bo climbs it
    const ladder = v.ease.out(v.seg(k, 0.38, 0.43)), lx = wx - 4;
    if (k > 0.37) pipFace = -1;
    if (k > 0.42) { boX = v.lerp(lvX + 8, lx - 2, v.ease.inOut(v.seg(k, 0.42, 0.46))); boFace = 1; boY = gy + walk(0.42, 0.46); }
    const climb = v.ease.inOut(v.seg(k, 0.46, 0.55));
    if (k > 0.46) { boX = lx - 2; boY = v.lerp(gy, roof, climb); }
    if (k > 0.55) { const s = v.seg(k, 0.55, 0.62); boX = v.lerp(lx - 2, 182, s); boY = roof + v.hop(s, 12); }
    if (k > 0.56) { pipX = v.lerp(160, 210, v.ease.inOut(v.seg(k, 0.56, 0.62))); pipFace = 1; pipY = roof + walk(0.56, 0.62); }
    // the crane: a timber post and arm, the deck on its rope, the lever on the street
    v.line(dk0 - 4, gy, dk0 - 4, roof - 26, '#6b4630', 4); v.line(dk0 - 6, roof - 26, dk1 - 2, roof - 26, '#6b4630', 4);
    v.line(dk1 - 8, roof - 24, dk1 - 8, deckY - 4, '#3a2a20', 1.5);
    ctx.fillStyle = '#8b5a3c'; ctx.fillRect(dk0, deckY - 3, dk1 - dk0, 5); ctx.fillStyle = '#c4935f'; ctx.fillRect(dk0, deckY - 3, dk1 - dk0, 1.5);
    v.line(lvX, gy, lvX, gy - 10, '#5a4a40', 4);
    const la = pull ? 0.7 : -0.5; v.line(lvX, gy - 8, lvX + Math.sin(la) * 16, gy - 8 - Math.cos(la) * 16, '#6b4630', 3); v.fillCircle(lvX + Math.sin(la) * 16, gy - 8 - Math.cos(la) * 16, 3.5, '#c9473a');
    if (ladder > 0 && k < 0.6) {
      const len = ladder * (gy - roof);
      v.line(lx - 5, roof, lx - 5, roof + len, '#a87c4a', 2); v.line(lx + 3, roof, lx + 3, roof + len, '#a87c4a', 2);
      for (let y = roof + 6; y < roof + len; y += 8) v.line(lx - 5, y, lx + 3, y, '#c89a5a', 2);
    }
    // and both run along the roof and hop down onto the boat
    if (k > 0.63) {
      pipX = v.lerp(210, 232, v.seg(k, 0.63, 0.66)); pipY = roof;
      if (k > 0.66) { const s = v.seg(k, 0.66, 0.74); pipX = v.lerp(232, 284, s); pipY = v.lerp(roof, deck, s) + v.hop(s, 22); }
    }
    if (k > 0.63) {
      boX = v.lerp(182, 232, v.seg(k, 0.63, 0.7)); boY = roof + walk(0.63, 0.7);
      if (k > 0.7) { const s = v.seg(k, 0.7, 0.78); boX = v.lerp(232, 259, s); boY = v.lerp(roof, deck, s) + v.hop(s, 18); }
    }
    if (k > 0.74) pipX += sail;
    if (k > 0.78) boX += sail;
    const happy = k > 0.79, riding = k > 0.18 && k < 0.33, climbing = k > 0.46 && k < 0.55;
    const boMood = happy ? 'joy' : climbing || (k > 0.14 && k < 0.33) ? 'grit' : 'happy';
    const pipMood = happy ? 'joy' : riding ? 'wow' : 'happy';
    v.hero(1, boX, boY, { face: boFace, mood: boMood, shadow: boY >= gy - 1 || happy || (k > 0.56 && k < 0.78) });
    v.hero(0, pipX, pipY, { face: pipFace, mood: pipMood, shadow: !(k > 0.66 && k < 0.74) });
    if (k > 0.04 && k < 0.14) v.bubble('Pull it!', pipX, gy - 30);
    if (k > 0.2 && k < 0.33) v.label('CLUNK!', lvX, gy - 36, 14, v.c.gold);
    if (k > 0.38 && k < 0.47) v.bubble('Climb up!', pipX, roof - 30);
    if (k > 0.8 && k < 0.93) v.bubble('Woof!', 304 + sail, deck - 24);
    v.confetti(272, 70, v.seg(k, 0.79, 0.99));
    v.star(272, 52 - 6 * v.seg(k, 0.8, 0.95), 9 * v.ease.back(v.seg(k, 0.79, 0.86)) * (k < 0.99 ? 1 : 0));
  },
});

/* ---------- 9-2 San Francisco 1906 Quake ---------- */
// a plank bridge balanced on its middle: centre cx, top y, half length hl, tilt th
function pw9Plank(v, cx, y, hl, th) {
  const ctx = v.ctx;
  ctx.save(); ctx.translate(cx, y); ctx.rotate(th);
  ctx.fillStyle = v.c.plankDark; v.rr(-hl, 0, 2 * hl, 7, 3); ctx.fill();
  ctx.fillStyle = v.c.plank; v.rr(-hl, 0, 2 * hl, 5, 2.5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-hl + 3, 1, 2 * hl - 6, 1.2);
  ctx.fillStyle = v.c.plankDark; ctx.fillRect(-hl * 0.33, 0, 1.5, 5); ctx.fillRect(hl * 0.33, 0, 1.5, 5);
  ctx.restore();
}
// a crack in the street: a dark jagged hole from x0 to x1, y0 down to y1
function pw9Crack(v, x0, x1, y0, y1) {
  const ctx = v.ctx, n = 4;
  ctx.beginPath(); ctx.moveTo(x0, y0);
  for (let i = 1; i <= n; i++) ctx.lineTo(x0 + (i % 2 ? 6 : 1) + i * 2, y0 + (y1 - y0) * i / n);
  for (let i = n; i >= 1; i--) ctx.lineTo(x1 - (i % 2 ? 5 : 1) - i * 2, y0 + (y1 - y0) * i / n);
  ctx.lineTo(x1, y0); ctx.closePath();
  ctx.fillStyle = pw9Grad(v, y0, y1 + 10, ['#4a3550', '#1c1a36']); ctx.fill();
  ctx.strokeStyle = '#5e3d28'; ctx.lineWidth = 2; ctx.stroke();
}
// the balance gauge over a holder: keep the ball (b -1..1) in the green
function pw9Gauge(v, x, y, b, a) {
  if (a <= 0) return;
  const ctx = v.ctx, hw = 30, h = 10;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(28,26,54,0.85)'; v.rr(x - hw - 5, y - h / 2 - 4, 2 * hw + 10, h + 8, (h + 8) / 2); ctx.fill();
  ctx.save(); v.rr(x - hw, y - h / 2, 2 * hw, h, h / 2); ctx.clip();
  ctx.fillStyle = '#ff7a6b'; ctx.fillRect(x - hw, y - h / 2, 2 * hw, h);
  ctx.fillStyle = '#ffd36b'; ctx.fillRect(x - hw * 0.7, y - h / 2, hw * 1.4, h);
  ctx.fillStyle = '#7ee0a0'; ctx.fillRect(x - hw * 0.35, y - h / 2, hw * 0.7, h);
  ctx.restore();
  const bx = x + v.clamp(b, -1, 1) * (hw - h / 2);
  ctx.fillStyle = '#fff'; v.circle(bx, y, h / 2 + 1.2); ctx.fill();
  ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.restore();
}
// Bo cranks the winch to hold Pip's plank, Pip tiptoes over through a rumble, then Pip props up Bo's plank
definePreview('San Francisco 1906 Quake', {
  blurb: 'Hold the wobbly bridge steady so your partner can cross the crack.',
  loop: 7.5, still: 2.05,
  draw(v, t) { pw9Loop(v, t / 7.5, k => this.scene(v, k, k * 7.5)); },
  scene(v, k, t) {
    const ctx = v.ctx, up = 74, band = 96, lo = 146, W = v.W;
    const rum = v.seg(k, 0.2, 0.23) * (1 - v.seg(k, 0.3, 0.33)), rum2 = 0.55 * v.seg(k, 0.66, 0.68) * (1 - v.seg(k, 0.72, 0.75));
    const quake = Math.max(rum, rum2), shake = Math.sin(t * 55) * 2.2 * quake;
    // sky and far hills
    ctx.fillStyle = pw9Grad(v, 0, v.H, ['#86cdf0', '#ffe6c8']); ctx.fillRect(0, 0, W, v.H);
    ctx.fillStyle = '#b8c9e8'; ctx.beginPath(); ctx.moveTo(0, 60); ctx.quadraticCurveTo(90, 18, 190, 42); ctx.quadraticCurveTo(260, 26, 320, 40); ctx.lineTo(320, 80); ctx.lineTo(0, 80); ctx.fill();
    ctx.save(); ctx.translate(shake, 0);
    // painted-lady houses along the upper street
    const HS = [['#f7b8c8', '#d97f98', '#8f5a8c'], ['#bfe6cf', '#7fbf9c', '#4f7f8f'], ['#ffe39a', '#e0b453', '#b06a4a'], ['#c9d8ff', '#8ea6e6', '#5d5a9a'], ['#ffd0a8', '#e09a68', '#9a5a46']];
    for (let i = 0; i < 5; i++) {
      const [face, trim, roofC] = HS[i], x = -6 + i * 68, w = 62, top = 34 + (i % 2) * 6, sw = Math.sin(t * 40 + i) * quake * 0.03;
      ctx.save(); ctx.translate(x + w / 2, up); ctx.rotate(sw); ctx.translate(-x - w / 2, -up);
      ctx.fillStyle = roofC; ctx.beginPath(); ctx.moveTo(x - 3, top + 1); ctx.lineTo(x + w / 2, top - 15); ctx.lineTo(x + w + 3, top + 1); ctx.fill();
      ctx.fillStyle = face; ctx.fillRect(x, top, w, up - top);
      ctx.fillStyle = trim; ctx.fillRect(x, top, w, 3); ctx.fillRect(x, top, 3, up - top); ctx.fillRect(x + w - 3, top, 3, up - top);
      ctx.fillStyle = '#fff6e6'; v.rr(x + 9, top + 8, 16, 18, 3); ctx.fill(); v.rr(x + w - 25, top + 8, 16, 18, 3); ctx.fill();
      ctx.fillStyle = '#9fd3ef'; v.rr(x + 11, top + 10, 12, 14, 2); ctx.fill(); v.rr(x + w - 23, top + 10, 12, 14, 2); ctx.fill();
      ctx.fillStyle = '#fff6e6'; v.circle(x + w / 2, top - 4, 4); ctx.fill();
      ctx.restore();
    }
    // the upper street: cobbles on top, earth below, a crack through it
    ctx.fillStyle = '#a49fb9'; ctx.fillRect(0, up, W, 7);
    ctx.fillStyle = '#8e88a8'; for (let x = 0; x < W; x += 11) { v.rr(x + 1, up + 1.5 + (x / 11 % 2), 9, 4, 2); ctx.fill(); }
    ctx.fillStyle = '#6d6789'; ctx.fillRect(0, up + 7, W, 2);
    ctx.fillStyle = pw9Grad(v, up + 9, band, ['#b0825a', '#8a5c3b']); ctx.fillRect(0, up + 9, W, band - up - 9);
    ctx.fillStyle = '#5e3d28'; ctx.fillRect(0, band - 3, W, 3);
    // the stone wall between the streets, with ivy
    ctx.fillStyle = '#dcc7a2'; ctx.fillRect(0, band, W, lo - band);
    ctx.strokeStyle = '#c3aa82'; ctx.lineWidth = 1.2;
    for (let y = band, r = 0; y < lo; y += 12, r++) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      for (let x = (r % 2) * 14; x < W; x += 28) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 12); ctx.stroke(); }
    }
    ctx.fillStyle = 'rgba(40,30,60,0.22)'; ctx.fillRect(0, band, W, 6);
    for (const ix of [30, 290]) for (let j = 0; j < 4; j++) v.fillCircle(ix + (j % 2) * 7 - 3, band + 6 + j * 7, 5.5, j % 2 ? '#6fbf73' : '#5aa862');
    pw9Crack(v, 196, 250, up, band + 16);
    // the lower street, with its own crack
    ctx.fillStyle = '#a49fb9'; ctx.fillRect(0, lo, W, 7);
    ctx.fillStyle = '#8e88a8'; for (let x = 5; x < W; x += 11) { v.rr(x + 1, lo + 1.5 + ((x - 5) / 11 % 2), 9, 4, 2); ctx.fill(); }
    ctx.fillStyle = '#6d6789'; ctx.fillRect(0, lo + 7, W, 2);
    ctx.fillStyle = pw9Grad(v, lo + 9, v.H, ['#9c6e48', '#6f4a30']); ctx.fillRect(0, lo + 9, W, v.H - lo - 9);
    pw9Crack(v, 92, 148, lo, v.H + 4);
    // who is where: Pip tiptoes over the lower plank, walks to the prop jack; Bo leaves the winch and crosses the upper plank
    const tip = (a, b) => (k > a && k < b ? v.hop(v.phase(t, 0.24), 2.5) : 0), walk = (a, b) => (k > a && k < b ? v.hop(v.phase(t, 0.3), 4) : 0);
    const pipX = k < 0.42 ? v.lerp(64, 174, v.seg(k, 0.12, 0.4)) : v.lerp(174, 223, v.ease.inOut(v.seg(k, 0.42, 0.5)));
    const boX = k < 0.42 ? 108 : k < 0.58 ? v.lerp(108, 180, v.ease.inOut(v.seg(k, 0.42, 0.52))) : v.lerp(180, 270, v.seg(k, 0.58, 0.8));
    // plank 1 (lower street, worked by Bo's winch) and plank 2 (upper street, propped by Pip's jack)
    const on1 = Math.abs(pipX - 120) < 36 && k < 0.42, on2 = Math.abs(boX - 223) < 36 && k > 0.56;
    const b1 = v.clamp((on1 ? (pipX - 120) / 34 * 0.25 : 0) + 0.85 * rum * Math.sin((k - 0.2) * 48), -0.9, 0.9);
    const b2 = v.clamp((on2 ? (boX - 223) / 34 * 0.25 : 0) + 0.85 * rum2 * Math.sin((k - 0.66) * 60), -0.9, 0.9);
    const up1 = v.ease.inOut(v.seg(k, 0.04, 0.11)), up2 = v.ease.inOut(v.seg(k, 0.51, 0.57));
    const p1y = lo - 1 + 10 * (1 - up1), p1th = 0.24 * (1 - up1) + b1 * 0.12;
    const p2y = up - 1 + 10 * (1 - up2), p2th = -0.24 * (1 - up2) + b2 * 0.12;
    // the winch on the upper street and its rope down to plank 1
    const wx = 128, ang = t * (k > 0.04 && k < 0.42 ? 1.5 : 0) + b1 * 2;
    for (const [c, w] of [[v.c.ropeDark, 3.5], [v.c.rope, 1.8]]) v.line(wx, band + 7, 120, p1y - 2, c, w);
    v.fillCircle(wx, band + 7, 4.5, '#8e88a8'); v.fillCircle(wx, band + 7, 1.6, '#3b3550');
    ctx.fillStyle = v.c.bo; ctx.beginPath(); ctx.ellipse(wx - 12, up + 1.5, 13, 3, 0, 0, Math.PI * 2); ctx.fill();
    v.line(wx - 9, up, wx - 3, up - 18, '#6b4630', 3.5); v.line(wx + 9, up, wx + 3, up - 18, '#6b4630', 3.5);
    ctx.fillStyle = '#8a5833'; v.rr(wx - 8, up - 25, 16, 9, 3.5); ctx.fill();
    ctx.fillStyle = v.c.rope; for (let q = -5; q <= 5; q += 4) ctx.fillRect(wx + q - 0.8, up - 24, 1.6, 7);
    const kx = wx + Math.cos(ang) * 9, ky = up - 20.5 + Math.sin(ang) * 9;
    v.line(wx, up - 20.5, kx, ky, '#3b3550', 2.2); v.fillCircle(kx, ky, 2.6, v.c.gold);
    // the jack on the lower street and its prop pole up to plank 2
    const jx = 223;
    ctx.fillStyle = v.c.pip; ctx.beginPath(); ctx.ellipse(jx, lo + 1.5, 15, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a5833'; ctx.fillRect(jx - 3.5, p2y + 6, 7, lo - 6 - p2y - 6);
    ctx.fillStyle = '#b57a4a'; ctx.fillRect(jx - 1.8, p2y + 6, 3, lo - 6 - p2y - 6);
    ctx.fillStyle = '#5d5872'; ctx.fillRect(jx - 7, p2y + 5, 14, 3); ctx.fillRect(jx - 4.5, 112, 9, 3);
    v.rr(jx - 11, lo - 6, 22, 6, 2); ctx.fill();
    pw9Plank(v, 120, p1y, 34, p1th);
    pw9Plank(v, jx, p2y, 34, p2th);
    // bolts once a plank has been crossed
    if (k > 0.4) for (const x of [88, 152]) v.fillCircle(x, lo + 2, 2.4, '#5d5872');
    if (k > 0.8) for (const x of [191, 255]) v.fillCircle(x, up + 2, 2.4, '#5d5872');
    v.sparkle(152, lo - 4, v.seg(k, 0.4, 0.48), '#fff', 9);
    v.sparkle(255, up - 4, v.seg(k, 0.8, 0.88), '#fff', 9);
    // the heroes: feet on the plank while on it
    const surf = (cx, y, th, x) => y + (x - cx) * Math.tan(th);
    const pipY = (on1 ? surf(120, p1y, p1th, pipX) : lo) + (k < 0.42 ? tip(0.12, 0.4) : walk(0.42, 0.5));
    const boY = (on2 ? surf(jx, p2y, p2th, boX) : up) + (k < 0.58 ? walk(0.42, 0.52) : tip(0.58, 0.8));
    const happy = k > 0.82, hold1 = k > 0.04 && k < 0.42, hold2 = k > 0.51 && k < 0.82;
    if (hold1) { v.line(boX + 6, up - 12, kx, ky, v.c.boDark, 5.5); v.line(boX + 6, up - 12, kx, ky, v.c.bo, 3); }
    v.hero(1, boX, boY, { face: 1, sq: hold1 ? 0.08 : 0, mood: happy ? 'joy' : hold1 && rum > 0.2 ? 'grit' : rum2 > 0.2 && on2 ? 'wow' : 'happy' });
    v.hero(0, pipX, pipY, { face: 1, sq: hold2 ? 0.1 : 0, mood: happy ? 'joy' : on1 && rum > 0.2 ? 'wow' : hold2 && rum2 > 0.2 ? 'grit' : 'happy' });
    ctx.restore();
    pw9Gauge(v, boX, up - 38, b1, v.seg(k, 0.05, 0.1) * (1 - v.seg(k, 0.4, 0.44)));
    pw9Gauge(v, jx, lo - 38, b2, v.seg(k, 0.52, 0.56) * (1 - v.seg(k, 0.8, 0.84)));
    if (quake > 0.05) { ctx.save(); ctx.globalAlpha *= Math.min(1, quake * 2); v.label('RUMBLE!', 160 + Math.sin(t * 40) * 2, 14, 15, '#ffd36b'); ctx.restore(); }
    if (k > 0.41 && k < 0.5) v.bubble('Phew!', pipX, lo - 28);
    v.confetti(160, 70, v.seg(k, 0.82, 0.99));
    v.star(160, 40, 9 * v.ease.back(v.seg(k, 0.82, 0.88)) * (k < 0.99 ? 1 : 0));
  },
});

/* ---------- 9-3 Ice Age Glacier ---------- */
// the ice floe: bottom middle at the origin, w wide and h thick
function pw9Floe(v, w, h) {
  const ctx = v.ctx;
  ctx.fillStyle = '#7cc4ec'; v.rr(-w / 2, -h, w, h, 5); ctx.fill();
  ctx.fillStyle = '#bfeaff'; v.rr(-w / 2, -h, w, h - 4, 5); ctx.fill();
  ctx.fillStyle = '#fff'; v.rr(-w / 2 + 2, -h - 2, w - 4, 6, 3); ctx.fill();
  ctx.strokeStyle = '#4f9fd6'; ctx.lineWidth = 2; v.rr(-w / 2, -h, w, h, 5); ctx.stroke();
}
// a friendly woolly mammoth (after the level's own): feet at (x, y), s = size, dir 1 faces right
function pw9Mammoth(v, x, y, s, dir, t, toot) {
  const ctx = v.ctx, fur = '#8b5a3c', dark = '#5e3a24';
  ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
  ctx.fillStyle = dark; for (const lx of [-38, -18, 14, 32]) { v.rr(lx - 8 + Math.sin(t * 6 + lx) * 3, -34, 16, 34, 6); ctx.fill(); }
  ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(-4, -54, 54, 36, 0, 0, Math.PI * 2); ctx.fill();
  v.circle(40, -74, 28); ctx.fill(); v.circle(30, -96, 16); ctx.fill();
  ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(22, -74, 10, 15, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = fur; ctx.lineWidth = 13; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(60, -68);
  if (toot) ctx.bezierCurveTo(78, -78, 84, -104, 76, -122); else ctx.bezierCurveTo(72, -50, 70, -26, 82, -20);
  ctx.stroke();
  ctx.strokeStyle = '#fffbe9'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(56, -60); ctx.quadraticCurveTo(76, -38, 92, -54); ctx.stroke();
  v.fillCircle(48, -82, 6, '#fff'); v.fillCircle(50, -82, 3.4, v.c.ink);
  ctx.restore();
  if (toot) for (let i = 0; i < 2; i++) {
    const u = v.phase(t, 1.2, i * 0.6);
    ctx.save(); ctx.globalAlpha *= 1 - u; v.text('♪', x + dir * (78 + u * 30) * s, y - 124 * s - u * 16, 12, '#fff'); ctx.restore();
  }
}
// Pip steers with the pole and Bo hops and ducks; the floe cracks, they swap seats in mid-air, Bo steers on, and a
// happy hop at the end puts them back in their first seats for the next loop
definePreview('Ice Age Glacier', {
  blurb: 'Slide down the glacier on one ice floe: one steers, one hops and ducks!',
  loop: 7, still: 3.3,
  draw(v, t) { pw9Loop(v, t / 7, k => this.scene(v, k, k * 7), 0.955); },
  scene(v, k, t) {
    const ctx = v.ctx, W = v.W, FX = 112, sl = 0.2, ang = Math.atan(sl), gyAt = x => 122 + (x - FX) * sl;
    const Sk = q => 92 * q * 7 + 70 * v.ease.inOut(v.seg(q, 0.3, 0.44)), S = Sk(k);
    const scr = wx => wx - S;   // world x -> screen x
    const archW = Sk(0.215) + FX, gapW = Sk(0.475) + FX, crackW = Sk(0.6) + FX;
    // sky, pale sun, far snowy peaks, near hills with pines (each scrolls slower than the ice)
    ctx.fillStyle = pw9Grad(v, 0, v.H, ['#7ec8f7', '#c9ecff', '#eef9ff']); ctx.fillRect(0, 0, W, v.H);
    v.fillCircle(270, 28, 20, 'rgba(255,253,235,0.35)'); v.fillCircle(270, 28, 13, 'rgba(255,253,235,0.95)');
    for (let i = 0; i < 5; i++) {
      const x = ((i * 92 - S * 0.07) % 460 + 460) % 460 - 70, h = 44 + (i * 17) % 26, w = 56 + (i * 13) % 20, y = 82;
      ctx.fillStyle = '#b9d6ef'; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x, y - h); ctx.lineTo(x + w, y); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - w * 0.3, y - h * 0.7); ctx.lineTo(x, y - h); ctx.lineTo(x + w * 0.3, y - h * 0.7); ctx.lineTo(x + w * 0.1, y - h * 0.62); ctx.lineTo(x - w * 0.1, y - h * 0.72); ctx.fill();
    }
    const hy = x => 84 + Math.sin((x + S * 0.28) * 0.02) * 6 + Math.sin((x + S * 0.28) * 0.047 + 2) * 3;
    ctx.fillStyle = '#e3f3fc'; ctx.beginPath(); ctx.moveTo(0, v.H); for (let x = 0; x <= W; x += 10) ctx.lineTo(x, hy(x)); ctx.lineTo(W, v.H); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const x = ((i * 97 - S * 0.28) % 388 + 388) % 388 - 30, y = hy(x) + 4;
      ctx.fillStyle = '#6f4a32'; ctx.fillRect(x - 1.5, y - 5, 3, 6);
      for (let j = 0; j < 2; j++) { ctx.fillStyle = j ? '#4f9a7c' : '#3f8a6e'; ctx.beginPath(); ctx.moveTo(x - 9 + j * 2, y - 4 - j * 7); ctx.lineTo(x, y - 18 - j * 7); ctx.lineTo(x + 9 - j * 2, y - 4 - j * 7); ctx.fill(); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - 3, y - 20); ctx.lineTo(x, y - 25); ctx.lineTo(x + 3, y - 20); ctx.fill();
    }
    // Mammo trots along the hills beside them and toots at the end
    const mx = 284;
    pw9Mammoth(v, mx, hy(mx) + 3, 0.2, -1, t, k > 0.8);
    // the glacier: ice with a snowy top, broken by one crevasse
    const g0 = scr(gapW) - 22, g1 = scr(gapW) + 22;
    const iceRun = (a, b) => {
      ctx.fillStyle = '#93d3f3'; ctx.beginPath(); ctx.moveTo(a, v.H); ctx.lineTo(a, gyAt(a)); ctx.lineTo(b, gyAt(b)); ctx.lineTo(b, v.H); ctx.fill();
      for (const [d, col, lw] of [[14, 'rgba(255,255,255,0.35)', 3], [32, 'rgba(110,185,230,0.55)', 4]]) v.line(a, gyAt(a) + d, b, gyAt(b) + d, col, lw);
      v.line(a, gyAt(a) + 3, b, gyAt(b) + 3, '#d6eefb', 8); v.line(a, gyAt(a) + 1, b, gyAt(b) + 1, '#fff', 5);
    };
    if (g1 < -10 || g0 > W + 10) iceRun(-10, W + 10);
    else {
      iceRun(-10, g0); iceRun(g1, W + 10);
      ctx.fillStyle = pw9Grad(v, gyAt(g0), v.H, ['#3d80c4', '#1b3d6c']);
      ctx.beginPath(); ctx.moveTo(g0, gyAt(g0) + 2); ctx.lineTo(g0 + 7, gyAt(g0) + 22); ctx.lineTo(g0 + 3, v.H); ctx.lineTo(g1 - 3, v.H); ctx.lineTo(g1 - 6, gyAt(g1) + 20); ctx.lineTo(g1, gyAt(g1) + 2); ctx.fill();
      v.fillCircle(g0 - 1, gyAt(g0) + 2, 5, '#fff'); v.fillCircle(g1 + 1, gyAt(g1) + 2, 5, '#fff');
    }
    // the crack: a zigzag that runs down through the ice where the floe splits
    const cx = scr(crackW), grow = v.seg(k, 0.56, 0.62);
    if (grow > 0 && cx > -20 && cx < W + 20) {
      const cy = gyAt(cx), pts = [[0, 0], [5, 10], [-4, 20], [6, 32], [-3, 46], [4, 60]];
      ctx.strokeStyle = '#1f4f86'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath();
      for (let i = 0; i < Math.max(2, Math.ceil(pts.length * grow)); i++) { const [dx, dy] = pts[i]; if (i) ctx.lineTo(cx + dx, cy + dy); else ctx.moveTo(cx + dx, cy + dy); }
      ctx.stroke(); ctx.lineJoin = 'miter';
    }
    // the icicle arch: back legs first, its top and icicles in front of the riders
    const ax = scr(archW), aOn = ax > -60 && ax < W + 60;
    if (aOn) {
      ctx.fillStyle = '#a9dcf5';
      for (const [x, d] of [[ax - 30, -1], [ax + 30, 1]]) { ctx.beginPath(); ctx.moveTo(x + d * 8, gyAt(x) + 2); ctx.lineTo(x + d * 2, gyAt(x) - 52); ctx.lineTo(x - d * 6, gyAt(x) - 52); ctx.lineTo(x - d * 2, gyAt(x) + 2); ctx.fill(); }
    }
    // the ride: speed by the pole, a duck under the arch, a hop over the crevasse
    const duck = v.seg(k, 0.15, 0.18) * (1 - v.seg(k, 0.26, 0.29));
    const hopK = v.seg(k, 0.42, 0.53), split = k > 0.6 && k < 0.72, swapped = k >= 0.66 && k < 0.88;
    const back = v.seg(k, 0.88, 0.955), hopBack = back > 0 && back < 1;   // the happy hop back to the first seats
    const fy = gyAt(FX) + v.hop(hopK, 24), push = k > 0.3 && k < 0.42;
    const floeA = v.seg(k, 0.66, 0.7);
    ctx.save(); ctx.translate(FX, fy); ctx.rotate(ang);
    if (split) {   // the two halves slide apart and sink into the crack
      const s = v.seg(k, 0.6, 0.7);
      for (const d of [-1, 1]) {
        ctx.save(); ctx.globalAlpha *= 1 - s; ctx.translate(d * (17 + s * 26), s * s * 30); ctx.rotate(d * s * 0.8); pw9Floe(v, 32, 11); ctx.restore();
      }
    }
    if (!split || floeA > 0) {
      ctx.save(); if (split) { ctx.scale(0.5 + 0.5 * floeA, floeA); }
      // the steerer's pole: pushing strokes, or held up
      // (laid back low while ducking, so it clears the icicles)
      const ph = v.phase(t, 0.35), tipX = push ? -40 - ph * 26 : v.lerp(-44, -60, duck), tipY = push ? 2 : v.lerp(-46, -18, duck), hy = -26 + duck * 6;
      if (!split && !hopBack) { v.line(-14, hy, tipX, tipY, '#8a5833', 3.5); v.line(-14, hy, tipX, tipY, '#c98b5a', 1.5); }
      pw9Floe(v, 70, 12);
      ctx.restore();
    }
    // riders: in mid-air during the split they cross over and swap seats
    const sp = v.seg(k, 0.6, 0.72), happy = k > 0.8;
    for (const id of [0, 1]) {
      const steer = (id === 0) !== swapped, seat0 = id === 0 ? -18 : 18;
      let x = seat0, y = -11, rot = 0;
      if (split) { x = v.lerp(seat0, -seat0, v.ease.inOut(sp)); y = -11 + v.hop(sp, id === 0 ? 46 : 30); rot = (id === 0 ? 1 : -1) * Math.sin(sp * Math.PI) * 0.5; }
      else if (hopBack) { x = v.lerp(-seat0, seat0, v.ease.inOut(back)); y = -11 + v.hop(back, id === 0 ? 36 : 6); }
      else if (swapped) x = -seat0;
      const mood = happy ? 'joy' : split ? 'wow' : duck > 0.5 ? 'grit' : !steer && hopK > 0 && hopK < 1 ? 'joy' : push && steer ? 'grit' : 'happy';
      v.hero(id, x, y, { face: 1, sq: duck * 1.0, rot, mood, shadow: !split && !hopBack });
    }
    ctx.restore();
    if (aOn) {
      const top = x => gyAt(x) - 52;
      ctx.fillStyle = '#c8eeff'; ctx.strokeStyle = '#5faedd'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax - 40, top(ax - 40)); ctx.quadraticCurveTo(ax, top(ax) - 20, ax + 40, top(ax + 40)); ctx.lineTo(ax + 40, top(ax + 40) + 6); ctx.lineTo(ax - 40, top(ax - 40) + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(ax - 42, top(ax - 42) - 1); ctx.quadraticCurveTo(ax, top(ax) - 23, ax + 42, top(ax + 42) - 1); ctx.quadraticCurveTo(ax, top(ax) - 14, ax - 42, top(ax - 42) - 1); ctx.fill();
      ctx.fillStyle = '#eafaff'; ctx.strokeStyle = '#8acdf0'; ctx.lineWidth = 1.2;
      for (let x = ax - 32, q = 0; x <= ax + 32; x += 9, q++) {
        const y0 = top(x) + 5, y1 = gyAt(x) - 34 - (q % 2) * 4;
        ctx.beginPath(); ctx.moveTo(x - 3.5, y0); ctx.lineTo(x + 3.5, y0); ctx.lineTo(x, y1); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    // speed streaks while pushing
    if (k > 0.33 && k < 0.5) {
      ctx.save(); ctx.globalAlpha *= v.seg(k, 0.33, 0.36) * (1 - v.seg(k, 0.46, 0.5));
      for (let i = 0; i < 3; i++) { const ph = v.phase(t, 0.3, i * 0.33), lx = FX - 46 - ph * 50, ly = fy - 14 - i * 9; v.line(lx, ly + (lx - FX) * sl, lx - 18, ly + (lx - 18 - FX) * sl, 'rgba(255,255,255,0.85)', 2.5); }
      ctx.restore();
    }
    // snowflakes along the ice after the swap: Pip (now up front) collects them
    for (const [q, fk] of [[0, 0.76], [1, 0.82]]) {
      const wx0 = Sk(fk) + FX + 30, x = scr(wx0), y = gyAt(x) - 30 + Math.sin(t * 3 + q) * 2;
      if (k < fk) { if (x < W + 20) { ctx.save(); ctx.translate(x, y); ctx.rotate(t); ctx.strokeStyle = '#5aa9e6'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; ctx.moveTo(-Math.cos(a) * 6, -Math.sin(a) * 6); ctx.lineTo(Math.cos(a) * 6, Math.sin(a) * 6); } ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); } }
      else { v.sparkle(FX + 18, fy - 36, v.seg(k, fk, fk + 0.06), '#fff', 8); const u = v.seg(k, fk, fk + 0.08); if (u < 1) { ctx.save(); ctx.globalAlpha *= 1 - u; v.label('+1', FX + 26, fy - 44 - u * 10, 12, '#bfeaff'); ctx.restore(); } }
    }
    // words
    const by = fy - 40;
    if (k > 0.1 && k < 0.18) v.bubble('Duck!', FX + 18, by);
    if (k > 0.3 && k < 0.4) v.bubble('Push!', FX - 18, by);
    if (k > 0.42 && k < 0.52) v.label('HOP!', FX + 30, 54, 16, '#fff');
    if (k > 0.6 && k < 0.74) v.label('SWAP!', FX, 40, 18, v.c.gold);
    v.confetti(FX, fy - 30, v.seg(k, 0.88, 0.99));
  },
});

/* ---------- 9-4 Krakatoa Ash Run ---------- */
// a palm tree with its foot at (x, y)
function pw9Palm(v, x, y, s, t) {
  const ctx = v.ctx, sway = Math.sin(t * 1.3) * 0.06;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#9b6a3e'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(10, -50, 4 + sway * 120, -96); ctx.stroke();
  ctx.translate(4 + sway * 120, -96);
  for (let q = 0; q < 6; q++) {
    ctx.save(); ctx.rotate(-Math.PI / 2 + (q - 2.5) * 0.62 + sway * 2);
    ctx.fillStyle = q % 2 ? '#3fa45a' : '#2e7f45';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(26, -14, 52, 8); ctx.quadraticCurveTo(26, 0, 0, 0); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
// Pip fans the ash away, Bo follows the glowing footprints, floats over the gap on Pip's gust and drops the rope bridge
definePreview('Krakatoa Ash Run', {
  blurb: 'One fans the ash away, the other finds the path and pulls the levers.',
  loop: 7.5, still: 3.0,
  draw(v, t) { pw9Loop(v, t / 7.5, k => this.scene(v, k, k * 7.5)); },
  scene(v, k, t) {
    const ctx = v.ctx, W = v.W, gy = 148, gap0 = 174, gap1 = 230, lever = 280;
    // sky, sea at the horizon, Krakatoa puffing on the right
    ctx.fillStyle = pw9Grad(v, 0, v.H, ['#f29a7c', '#ffc49a', '#ffe3bb', '#fff0d6']); ctx.fillRect(0, 0, W, v.H);
    v.fillCircle(56, 30, 18, 'rgba(255,240,200,0.4)'); v.fillCircle(56, 30, 11, 'rgba(255,246,214,0.95)');
    ctx.fillStyle = pw9Grad(v, 112, v.H, ['#6cc6cf', '#2f8fb0']); ctx.fillRect(0, 112, W, v.H - 112);
    pw9Volcano(v, 238, 114, 0.62, t, '#8f6f7d', '#7a5c6b');
    ctx.fillStyle = 'rgba(70,130,90,0.55)'; ctx.beginPath(); ctx.moveTo(0, 130); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 122 + Math.sin(x * 0.03 + 2) * 4); ctx.lineTo(W, 130); ctx.fill();
    pw9Palm(v, 18, gy, 0.62, t); pw9Palm(v, 306, gy, 0.55, t + 1);
    // the jungle ground with a gap, sea down in the gap
    for (const [a, b] of [[-4, gap0], [gap1, W + 4]]) {
      ctx.fillStyle = '#7a5236'; ctx.fillRect(a, gy, b - a, v.H - gy);
      ctx.fillStyle = '#8c6142'; for (let x = a + 8; x < b - 10; x += 26) { v.rr(x, gy + 14 + (x % 3) * 4, 9, 5, 2.5); ctx.fill(); }
      ctx.fillStyle = '#5c3c26'; ctx.fillRect(a === -4 ? b - 3 : a, gy, 3, v.H - gy);
      ctx.fillStyle = '#4c9a38'; ctx.fillRect(a, gy, b - a, 7);
      ctx.fillStyle = '#6cc04a'; ctx.fillRect(a, gy, b - a, 4.5);
      for (let x = a + 5; x < b; x += 10) v.fillCircle(x, gy + 5, 2.8, '#6cc04a');
    }
    ctx.fillStyle = '#4fb9dc'; ctx.fillRect(gap0, 166, gap1 - gap0, v.H - 166);
    ctx.fillStyle = 'rgba(210,240,255,0.95)'; ctx.beginPath(); ctx.moveTo(gap0, 169);
    for (let i = 0; i <= 8; i++) ctx.lineTo(gap0 + i * 7, 166 + Math.sin(t * 3 + i) * 1.5);
    ctx.lineTo(gap1, 170); ctx.lineTo(gap0, 170); ctx.fill();
    // the rope bridge drops in, plank by plank, once Bo pulls the lever
    const drop = v.seg(k, 0.6, 0.67);
    if (drop > 0) {
      const n = 6, pw = (gap1 - gap0) / n;
      for (const x of [gap0 + 2, gap1 - 2]) v.line(x, gy, x, gy - 12, '#a07a45', 2);
      ctx.strokeStyle = '#e8cf95'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gap0 + 2, gy - 12); ctx.quadraticCurveTo((gap0 + gap1) / 2, gy - 4, gap1 - 2, gy - 12); ctx.stroke();
      for (let i = 0; i < n; i++) {
        const u = v.clamp(drop * (n + 2) - i, 0, 1);
        if (u <= 0) continue;
        const x = gap0 + i * pw, y = gy - 20 * (1 - u);
        ctx.save(); ctx.globalAlpha *= u;
        ctx.fillStyle = '#8a5833'; v.rr(x + 0.5, y, pw - 1, 6, 2); ctx.fill();
        ctx.fillStyle = '#d39a62'; v.rr(x + 1, y - 0.5, pw - 2, 4, 2); ctx.fill();
        ctx.restore();
      }
    }
    // the windsock at the gap: it streams out while the fan's gust blows
    const gust = v.seg(k, 0.3, 0.34) * (1 - v.seg(k, 0.5, 0.55));
    const sx = gap0 - 8;
    ctx.fillStyle = '#8a5833'; ctx.fillRect(sx - 1.5, gy - 40, 3, 40);
    ctx.save(); ctx.translate(sx + 1, gy - 37); ctx.rotate((1 - gust) * (0.9 + Math.sin(t * 2) * 0.15));
    for (let q = 0; q < 3; q++) {
      const fl = Math.sin(t * (gust > 0.5 ? 14 : 4)) * (q + 1) * 0.5, h0 = 6 - q * 1.2, h1 = 6 - (q + 1) * 1.2;
      ctx.fillStyle = q % 2 ? '#fff' : '#ff7a3d';
      ctx.beginPath(); ctx.moveTo(q * 8, -h0 + fl); ctx.lineTo(q * 8 + 8, -h1 + fl); ctx.lineTo(q * 8 + 8, h1 + fl); ctx.lineTo(q * 8, h0 + fl); ctx.fill();
    }
    ctx.restore();
    // the lever on the far side: red until pulled, then green
    const pulled = k > 0.57, la = pulled ? 0.75 * v.seg(k, 0.57, 0.6) : -0.6;
    ctx.fillStyle = '#5c3a20'; v.rr(lever - 10, gy - 7, 20, 7, 3); ctx.fill();
    ctx.save(); ctx.translate(lever, gy - 6); ctx.rotate(la); v.line(0, 0, 0, -22, '#d9c7a0', 4); v.fillCircle(0, -24, 5.5, pulled ? '#5fd17a' : '#e8344e'); ctx.restore();
    // glowing footprints: the trail only the leader knows
    for (const x of [96, 134, 254]) {
      ctx.fillStyle = 'rgba(255,215,90,0.35)'; ctx.beginPath(); ctx.ellipse(x, gy - 1, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd75e';
      for (const [dx, dy] of [[-4, 0], [4, -2]]) { ctx.beginPath(); ctx.ellipse(x + dx, gy - 1 + dy, 2.8, 1.8, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    // where everyone is
    const walk = (a, b) => (k > a && k < b ? v.hop(v.phase(t, 0.32), 4) : 0);
    const fanOn = k > 0.06 && k < 0.58;
    let pipX = v.lerp(28, 78, v.ease.inOut(v.seg(k, 0.08, 0.28))), pipY = gy + walk(0.08, 0.28);
    if (k > 0.66) { pipX = v.lerp(78, 214, v.ease.inOut(v.seg(k, 0.66, 0.82))); pipY = gy + walk(0.66, 0.82); }
    let boX = v.lerp(70, 160, v.ease.inOut(v.seg(k, 0.1, 0.3))), boY = gy + walk(0.1, 0.3), boFace = 1;
    const fly = v.seg(k, 0.34, 0.5);
    if (k > 0.34) { boX = v.lerp(160, 250, v.ease.inOut(fly)); boY = gy + v.hop(fly, 46); }
    if (k > 0.5) { boX = v.lerp(250, 266, v.seg(k, 0.5, 0.55)); boY = gy; }
    if (k > 0.62) boFace = -1;
    // the ash cloud: fluffy grey clumps, blown away in a cone in front of Pip's fan
    // (clumps are gathered into 5 see-through steps and each step is filled in one go: about 110 clumps stay cheap)
    const ox = pipX + 12, oy = gy - 14, reachR = 270 * v.ease.out(v.seg(k, 0.06, 0.3)), a0 = ctx.globalAlpha;
    const steps = [[], [], [], [], []];
    for (let cy = 50, row = 0; cy < gy + 2; cy += 20, row++) {
      for (let cx = -4 + (row % 2) * 13, col = 0; cx < W + 14; cx += 26, col++) {
        const x = cx + (v.rand(row * 41 + col) - 0.5) * 8, y = cy + (v.rand(row * 67 + col * 3) - 0.5) * 6;
        const dx = x - ox, half = 26 + Math.max(0, dx) * 0.6;
        // how far inside the cleared space this clump sits (bigger = more cleared); behind Pip stays clear too
        let inside = dx < 0 ? 60 - Math.abs(y - oy) : Math.min(reachR - dx, half - Math.abs(y - oy));
        inside = Math.max(inside, 92 - x);   // the clear pocket where Pip and Bo start
        const d = v.clamp(0.6 - inside / 18, 0, 1);
        if (d <= 0.04) continue;
        const r = (15 + v.rand(row * 13 + col * 7) * 6) * (0.55 + 0.45 * d), bx = Math.sin(t * 0.6 + row + col) * 1.5;
        steps[Math.min(4, Math.floor(d * 1.3 * 5))].push(x + bx, y, r);
      }
    }
    steps.forEach((s, i) => {
      if (!s.length) return;
      ctx.globalAlpha = a0 * (i + 1) / 5;
      for (const [col, f, o] of [['#8e8598', 1, 0], ['#b9b1c2', 0.5, -0.3]]) {
        ctx.fillStyle = col; ctx.beginPath();
        for (let j = 0; j < s.length; j += 3) { const r = s[j + 2] * f, x = s[j] + s[j + 2] * o, y = s[j + 1] + s[j + 2] * o; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); }
        ctx.fill();
      }
    });
    ctx.globalAlpha = a0;
    // wind streaks out of the fan, and swirls over the gap while the gust carries Bo
    if (fanOn) {
      for (let q = 0; q < 4; q++) {
        const u = v.phase(t, 0.6, q * 0.25), lx = ox + 10 + u * 120, ly = oy - 8 + (q - 1.5) * 9 + Math.sin(u * 8 + q) * 3;
        ctx.save(); ctx.globalAlpha *= Math.sin(u * Math.PI) * 0.85; v.line(lx, ly, lx + 16, ly - 1, '#fff', 2.5); ctx.restore();
      }
    }
    if (gust > 0) {
      ctx.save(); ctx.globalAlpha *= gust; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (let q = 0; q < 3; q++) { const u = v.phase(t, 1, q / 3), x = gap0 + u * (gap1 - gap0), y = gy - 30 - Math.sin(u * Math.PI) * 30; ctx.beginPath(); ctx.arc(x, y, 6, Math.PI * 0.2, Math.PI * 1.5); ctx.stroke(); }
      ctx.restore();
    }
    const happy = k > 0.83, lost = k < 0.1;
    // Bo, the leader, in an explorer hat
    v.hero(1, boX, boY, { face: boFace, mood: happy ? 'joy' : fly > 0 && fly < 1 ? 'wow' : k > 0.54 && k < 0.6 ? 'grit' : 'happy', shadow: fly <= 0 || fly >= 1 });
    const hy = boY - 25;
    ctx.fillStyle = '#c9a66b'; ctx.beginPath(); ctx.ellipse(boX, hy + 2, 13, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e0c48a'; ctx.beginPath(); ctx.ellipse(boX, hy + 1, 8, 7, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#8a5833'; ctx.fillRect(boX - 8, hy - 1, 16, 2.2);
    if (k > 0.54 && k < 0.6) { v.line(boX + 6, boY - 12, lever + Math.sin(la) * 22, gy - 6 - Math.cos(la) * 22, v.c.boDark, 5); v.line(boX + 6, boY - 12, lever + Math.sin(la) * 22, gy - 6 - Math.cos(la) * 22, v.c.bo, 2.8); }
    // Pip, the fanner, with a big palm-leaf fan
    v.hero(0, pipX, pipY, { face: 1, mood: happy ? 'joy' : fanOn && k > 0.3 && k < 0.5 ? 'grit' : 'happy' });
    const wave = fanOn ? Math.sin(t * 16) * 0.35 : Math.sin(t * 2) * 0.05;
    ctx.save(); ctx.translate(pipX + 9, pipY - 9); ctx.rotate(-0.55 + wave);
    v.line(0, 0, 9, -7, '#8a5833', 2.5); ctx.translate(9, -7);
    ctx.fillStyle = fanOn ? '#58c46e' : '#4caf5c'; ctx.strokeStyle = '#2e7f45'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 15, -1.25, 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // words
    if (lost) v.label('?', boX + 14, gy - 36, 16, '#fff');
    if (k > 0.13 && k < 0.27) v.bubble('This way!', boX, gy - 34);
    if (k > 0.36 && k < 0.5) v.label('WHOOSH!', 202, 52, 16, '#fff');
    if (k > 0.53 && k < 0.6) v.bubble('Pull!', boX, gy - 34);
    if (k > 0.83) { v.confetti(232, gy - 30, v.seg(k, 0.83, 0.99)); v.star(232, 72 - 6 * v.seg(k, 0.84, 0.95), 9 * v.ease.back(v.seg(k, 0.83, 0.9)) * (k < 0.99 ? 1 : 0)); }
  },
});
