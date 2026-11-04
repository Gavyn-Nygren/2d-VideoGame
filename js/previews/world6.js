/* Pip & Bo - Level previews for World 6 (see js/previews/preview-core.js for how to write one). */
'use strict';

/* World 6 props, drawn like the levels' own (js/levels/world6/), scaled to the preview. Every helper starts with pw6. */
// a level's own colours over the world theme (its def's theme in js/levels/level-list.js)
const pw6Theme = v => { if (v.level && v.level.theme) v.c = Object.assign({}, v.c, v.level.theme); };
// the loop's seam: scene(t, part) draws the scenery (part 1, the same at both ends of the loop) and/or the cast (part 2);
// over the last `fade` seconds only the cast cross-fades into its t = 0 pose, so no hidden layer shows through
function pw6Loop(v, t, loop, fade, scene) {
  if (t <= loop - fade) { scene(t, 3); return; }
  const a = v.ease.inOut(v.seg(t, loop - fade, loop)), ctx = v.ctx;
  scene(t, 1);
  // each pass stays solid for half the fade, so a figure that stands in the same place at both ends never looks see-through
  ctx.save(); ctx.globalAlpha *= Math.min(1, 2 - 2 * a); scene(t, 2); ctx.restore();
  ctx.save(); ctx.globalAlpha *= Math.min(1, 2 * a); scene(0, 2); ctx.restore();
}
// a clock for a wave of w rad/s that makes whole cycles over the loop, so ripples meet up at the seam
const pw6Cyc = (t, loop, w) => t * Math.max(1, Math.round(w * loop / (Math.PI * 2))) * Math.PI * 2 / (w * loop);
// clouds that drift a little and come back to where they started
const pw6Clouds = (v, t, loop) => v.clouds(6 + Math.sin(t / loop * Math.PI * 2) * 2.5);

/* ---- 6-1 Monster Feeding ---- */
// a food like monDrawFood: 'apple' | 'cake' | 'fish'
function pw6Food(v, type, x, y, s = 1, rot = 0) {
  const ctx = v.ctx;
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(s, s);
  ctx.lineWidth = 2; ctx.strokeStyle = v.c.ink; ctx.lineJoin = 'round';
  if (type === 'apple') {
    v.fillCircle(0, 1, 9, '#e5413a'); ctx.stroke();
    v.fillCircle(-3.5, -2, 2.6, 'rgba(255,255,255,0.5)');
    v.line(0, -7, 1, -12, '#6b4630', 2);
    ctx.fillStyle = '#5cc27f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(5.5, -11, 4.5, 2.2, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else {
    ctx.fillStyle = '#f6e0b5'; v.rr(-9, -1, 18, 10, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff9ccf'; ctx.beginPath(); ctx.arc(0, -1, 9, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    v.fillCircle(0, -11, 3, '#e5413a'); ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.restore();
}
// the catcher's basket, rim centred at (x, y)
function pw6Basket(v, x, y) {
  const ctx = v.ctx;
  ctx.lineWidth = 2; ctx.strokeStyle = v.c.ink; ctx.lineJoin = 'round'; ctx.fillStyle = '#d8a45e';
  ctx.beginPath(); ctx.moveTo(x - 15, y); ctx.lineTo(x + 15, y); ctx.lineTo(x + 11, y + 11); ctx.lineTo(x - 11, y + 11); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#b07a3a'; ctx.lineWidth = 1.5; ctx.beginPath();
  ctx.moveTo(x - 13, y + 5); ctx.lineTo(x + 13, y + 5);
  for (const dx of [-7, 0, 7]) { ctx.moveTo(x + dx, y + 2); ctx.lineTo(x + dx * 0.8, y + 10); }
  ctx.stroke();
  ctx.fillStyle = '#e9c48a'; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 2; v.rr(x - 16, y - 2, 32, 4, 2); ctx.fill(); ctx.stroke();
}
// the chef's white toque on a hero whose head top is at (x, y)
function pw6Toque(v, x, y) {
  const ctx = v.ctx;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.8;
  v.rr(x - 8, y - 8, 16, 10, 3); ctx.fill(); ctx.stroke();
  for (const [dx, dy, r] of [[-5, -11, 5.5], [5, -11, 5.5], [0, -15, 6.5]]) { v.circle(x + dx, y + dy, r); ctx.fill(); ctx.stroke(); }
  ctx.fillRect(x - 7, y - 11, 14, 6);
}
// the cauldron on its little fire, feet at (x, y)
function pw6Pot(v, x, y, t) {
  const ctx = v.ctx;
  for (let i = -1; i <= 1; i++) {
    const h = 7 + 3 * (0.5 + 0.5 * Math.sin(t * 20 + i * 2));
    ctx.fillStyle = i ? '#ffb347' : '#ffd75a'; ctx.beginPath(); ctx.moveTo(x + i * 6 - 3, y);
    ctx.quadraticCurveTo(x + i * 6 - 1.5, y - h * 0.6, x + i * 6, y - h); ctx.quadraticCurveTo(x + i * 6 + 1.5, y - h * 0.6, x + i * 6 + 3, y); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#3c3a52'; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 2;
  ctx.fillRect(x - 9, y - 6, 3, 6); ctx.fillRect(x + 6, y - 6, 3, 6);
  v.circle(x, y - 15, 11); ctx.fill(); ctx.stroke();
  v.fillCircle(x - 4, y - 18, 2.8, 'rgba(255,255,255,0.18)');
  ctx.fillStyle = '#9aa0c0'; v.rr(x - 12, y - 27, 24, 5, 2.5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#7be08a'; ctx.beginPath(); ctx.ellipse(x, y - 27, 9, 1.8, 0, 0, Math.PI * 2); ctx.fill();
}
// Munch, the purple monster (monDrawBig), feet on y, facing left. o: open (mouth 0..1), g (grumpy 0..100), full, arms (0..1 up), look, t
function pw6Munch(v, x, y, o) {
  const ctx = v.ctx, rx = 34, ry = 36, cy = y - ry, f = -1, t = o.t;
  const body = '#8f7be8', grumpy = !o.full && o.g >= 75, bob = Math.sin(t * 2.6) * 1.5;
  ctx.save(); ctx.translate(x, cy + bob);
  ctx.lineWidth = 2.5; ctx.strokeStyle = v.c.ink; ctx.lineJoin = 'round'; ctx.fillStyle = body;
  const tap = grumpy ? Math.max(0, Math.sin(t * 9)) * 4 : 0;
  v.rr(-f * 13 - 9, ry - 10 - bob, 18, 10, 5); ctx.fill(); ctx.stroke();
  v.rr(f * 13 - 9, ry - 10 - tap - bob, 18, 10, 5); ctx.fill(); ctx.stroke();
  for (const dx of [-1, 1]) {
    ctx.save(); ctx.translate(dx * (rx - 4), 4); ctx.rotate(-dx * (0.3 + 2.2 * o.arms));
    ctx.beginPath(); ctx.ellipse(0, 8, 6, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(-rx * 0.35, -ry * 0.5, rx * 0.3, ry * 0.18, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = v.c.paper; ctx.beginPath(); ctx.moveTo(-f * 6 - 5, -ry + 4); ctx.lineTo(-f * 7, -ry - 11); ctx.lineTo(-f * 6 + 5, -ry + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.ellipse(-f * 5, 14, 17, 14, 0, 0, Math.PI * 2); ctx.fill();
  // face: eyes at (ex +- 8, ey), mouth at (mx, my)
  const ex = f * 7, ey = -15, er = 6, mx = f * 7, my = 2;
  if (grumpy || o.full) { ctx.fillStyle = grumpy ? 'rgba(255,70,70,0.55)' : 'rgba(255,120,160,0.5)'; for (const d of [-1, 1]) { v.circle(ex + d * 14, ey + 10, 4.5); ctx.fill(); } }
  ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (const d of [-1, 1]) {
    const exx = ex + d * 8;
    if (o.full) { ctx.beginPath(); ctx.arc(exx, ey + 1, 4, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke(); continue; }
    ctx.fillStyle = '#fff'; v.circle(exx, ey, er); ctx.fill(); ctx.stroke();
    v.fillCircle(exx + o.look[0], ey + o.look[1], er * 0.48, v.c.ink);
    if (o.g >= 45) { // brows: inner ends down
      const a = o.g >= 75 ? 0.5 : 0.25, L = 5;
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(exx - d * L * Math.cos(a), ey - 9 - L * Math.sin(a)); ctx.lineTo(exx + d * L * Math.cos(a), ey - 9 + L * Math.sin(a)); ctx.stroke(); ctx.lineWidth = 2.5;
    }
  }
  if (o.open > 0.1) {
    const mh = 3 + 9 * o.open, mw = 10;
    ctx.save(); ctx.fillStyle = '#3a1630'; ctx.beginPath(); ctx.ellipse(mx, my, mw, mh, 0, 0, Math.PI * 2); ctx.fill(); ctx.clip();
    ctx.fillStyle = '#ff8fb0'; ctx.beginPath(); ctx.ellipse(mx, my + mh * 0.8, mw * 0.6, mh * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; for (const d of [-0.45, 0.45]) { ctx.beginPath(); ctx.moveTo(mx + d * mw - 2.5, my - mh); ctx.lineTo(mx + d * mw + 2.5, my - mh); ctx.lineTo(mx + d * mw, my - mh + 4); ctx.closePath(); ctx.fill(); }
    ctx.restore(); ctx.beginPath(); ctx.ellipse(mx, my, mw, mh, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (o.full || o.g < 45) { ctx.beginPath(); ctx.arc(mx, my - 4, 7, 0.18 * Math.PI, 0.82 * Math.PI); ctx.stroke(); }
  else if (o.g < 75) { ctx.beginPath(); ctx.moveTo(mx - 5, my); ctx.lineTo(mx + 5, my + 1); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(mx, my + 5, 5, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke(); }
  ctx.restore();
}
// the grumpy meter (monDrawMeter): a bar with a mood face at its left end, centred at (x, y)
function pw6Meter(v, x, y, g) {
  const ctx = v.ctx, col = g >= 75 ? '#ff5a5a' : g >= 45 ? '#ffc53d' : '#7be08a';
  ctx.fillStyle = 'rgba(28,26,54,0.7)'; v.rr(x - 30, y - 6, 62, 12, 6); ctx.fill();
  ctx.fillStyle = col; v.rr(x - 28, y - 4, Math.max(6, 58 * v.clamp(g, 0, 100) / 100), 8, 4); ctx.fill();
  ctx.fillStyle = col; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 2; v.circle(x - 31, y, 8); ctx.fill(); ctx.stroke();
  v.fillCircle(x - 34, y - 2, 1.3, v.c.ink); v.fillCircle(x - 28, y - 2, 1.3, v.c.ink);
  ctx.lineWidth = 1.6; ctx.beginPath();
  if (g < 45) ctx.arc(x - 31, y + 0.5, 3, 0.15 * Math.PI, 0.85 * Math.PI);
  else if (g < 75) { ctx.moveTo(x - 34, y + 3.5); ctx.lineTo(x - 28, y + 3.5); }
  else ctx.arc(x - 31, y + 6, 3, 1.2 * Math.PI, 1.8 * Math.PI);
  ctx.stroke();
}

// 6-1: Pip the chef throws an apple, Bo catches it in the basket and feeds grumpy Munch, who cheers up
definePreview('Monster Feeding', {
  blurb: 'One throws the food, one catches it and feeds the hungry monster!',
  loop: 7, still: 1.6,
  scene(v, t, part = 3) {
    const ctx = v.ctx, k = t / 7, gy = 150, kTop = 94, mX = 274;
    pw6Theme(v);
    if (part & 1) {
      v.sky(); v.sun(118, 30); pw6Clouds(v, t, 7); v.hills(gy - 30); v.ground(gy);
      // the kitchen: a stone ledge on the left with the pot
      v.block(-4, kTop, 70, v.H - kTop + 2);
      pw6Pot(v, 16, kTop, t);
    }
    if (!(part & 2)) return;
    // timeline: charge 0.02-0.16, flight 0.16-0.3, carry 0.34-0.48, toss 0.5-0.56, chomp 0.56-0.62, cheer, walk back 0.78-0.94
    const fly = v.seg(k, 0.16, 0.3), toss = v.seg(k, 0.5, 0.56), fed = k >= 0.56;
    const g = k < 0.56 ? v.lerp(30, 88, v.seg(k, 0, 0.56)) : k < 0.62 ? v.lerp(88, 5, v.seg(k, 0.56, 0.62)) : v.lerp(5, 30, v.seg(k, 0.7, 1));
    // Bo: to the X, catch, carry to Munch, back again
    const walk = (a, b) => (k > a && k < b ? v.hop(v.phase(t, 0.36), 4) : 0);
    let boX = v.lerp(118, 150, v.ease.inOut(v.seg(k, 0.12, 0.26))), boFace = 1;
    if (k > 0.34) boX = v.lerp(150, 226, v.ease.inOut(v.seg(k, 0.34, 0.48)));
    if (k > 0.78) { boX = v.lerp(226, 118, v.ease.inOut(v.seg(k, 0.78, 0.94))); boFace = k < 0.96 ? -1 : 1; }
    const boY = gy + walk(0.12, 0.26) + walk(0.34, 0.48) + walk(0.78, 0.94) + v.hop(toss, 8);
    const rimY = boY - 24 - 12;
    // the aim: a dotted arc and the X where it lands
    const x0 = 56, y0 = kTop - 30, x1 = 150, y1 = gy - 40;
    const arc = u => [v.lerp(x0, x1, u), v.lerp(y0, y1, u) - 4 * 50 * u * (1 - u)];
    if (k > 0.04 && k < 0.3) {
      ctx.save(); ctx.globalAlpha = k < 0.16 ? v.seg(k, 0.04, 0.08) : 1 - v.seg(fly, 0.6, 1);
      for (let i = 1; i < 10; i++) { const [px, py] = arc(i / 10); v.fillCircle(px, py, 2.2, v.c.pip); }
      ctx.lineCap = 'round'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath();
      ctx.moveTo(x1 - 8, gy - 9); ctx.lineTo(x1 + 8, gy + 1); ctx.moveTo(x1 + 8, gy - 9); ctx.lineTo(x1 - 8, gy + 1); ctx.stroke();
      ctx.strokeStyle = v.c.pip; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    }
    // Munch, its meter, and where it looks
    let fx = boX, fy = rimY;
    if (k > 0.16 && k < 0.3) [fx, fy] = arc(fly);
    const near = k > 0.42 && k < 0.58, chomp = k > 0.56 && k < 0.62 ? Math.abs(Math.cos(v.seg(k, 0.56, 0.62) * Math.PI * 2)) : 0;
    const lx = fx - mX, ly = fy - (gy - 50), ld = Math.hypot(lx, ly) || 1;
    pw6Munch(v, mX, gy, { t: pw6Cyc(t, 7, 2.6), g, full: fed && k < 0.86, open: chomp || (near ? v.seg(k, 0.42, 0.5) : 0), arms: fed && k < 0.8 ? 0.6 + 0.4 * Math.sin(t * 14) : near ? 1 : 0, look: [lx / ld * 2.5, ly / ld * 2.5] });
    pw6Meter(v, mX + 2, gy - 98, g);
    // Pip on the ledge in the chef's hat; the next apple pops out of the pot at the end
    const charge = k < 0.16 ? v.seg(k, 0.02, 0.15) : 0, throwK = v.seg(k, 0.16, 0.2), hasFood = k < 0.16 || k > 0.9;
    const pipX = 42, happy = fed && k < 0.84;
    v.hero(0, pipX, kTop, { face: 1, sq: k < 0.16 ? -0.08 * charge : 0.1 * (1 - throwK), mood: happy ? 'joy' : k > 0.02 && k < 0.16 ? 'grit' : 'happy' });
    pw6Toque(v, pipX, kTop - 24);
    if (hasFood) {
      const pk = v.seg(k, 0.9, 0.96);
      if (k > 0.9 && pk < 1) pw6Food(v, 'apple', v.lerp(16, pipX + 12, pk), v.lerp(kTop - 30, kTop - 26, pk) - Math.sin(pk * Math.PI) * 18, 0.8);
      else pw6Food(v, 'apple', pipX + 12 - 4 * charge, kTop - 26 - 4 * charge, 0.8);
    }
    if (k > 0.03 && k < 0.16) { // the charge ring
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(28,26,54,0.35)'; v.circle(pipX, kTop - 12, 17); ctx.stroke();
      ctx.strokeStyle = charge >= 1 ? v.c.gold : v.c.pip; ctx.beginPath(); ctx.arc(pipX, kTop - 12, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * charge); ctx.stroke();
    }
    // Bo with the basket on top; the apple rides in it, then flies into Munch's mouth
    v.hero(1, boX, boY, { face: boFace, mood: happy ? 'joy' : k > 0.24 && k < 0.34 ? 'wow' : 'happy' });
    const inBasket = k >= 0.3 && k < 0.5;
    if (inBasket) pw6Food(v, 'apple', boX, rimY - 3, 0.8);
    pw6Basket(v, boX, rimY);
    if (k > 0.16 && k < 0.3) pw6Food(v, 'apple', fx, fy, 0.9, t * 9);
    if (toss > 0 && toss < 1) pw6Food(v, 'apple', v.lerp(boX, mX - 7, toss), v.lerp(rimY - 3, gy - 34, toss) - Math.sin(toss * Math.PI) * 22, 0.8, t * 9);
    // words and the happy end
    if (k > 0.27 && k < 0.36) v.label('Catch!', boX, rimY - 22, 14, '#fff');
    if (k > 0.56 && k < 0.8) v.label('YUM!', mX - 4, gy - 120 - v.ease.out(v.seg(k, 0.56, 0.64)) * 6, 18, v.c.gold);
    if (fed && k < 0.84) {
      v.heart(mX - 40, gy - 82 - v.seg(k, 0.58, 0.84) * 16, 6 * v.seg(k, 0.58, 0.62));
      v.star(v.W / 2 + 30, 40 - v.ease.back(v.seg(k, 0.6, 0.68)) * 6, 12 * v.ease.back(v.seg(k, 0.6, 0.68)) * (1 - v.seg(k, 0.8, 0.84)));
    }
    v.confetti(mX - 20, gy - 70, v.seg(k, 0.57, 0.82));
  },
  draw(v, t) { pw6Loop(v, t, 7, 0.25, (tt, part) => this.scene(v, tt, part)); },
});

/* ---- 6-2 Tug of War ---- */
// the frog with the drum (drawFrog), sitting at (x, y); hit 0..1 after a BOOM squashes the drum
function pw6Frog(v, x, y, hit, s = 0.75) {
  const ctx = v.ctx, sq = hit < 0.15 ? 1 - hit / 0.15 : 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#3f8a3c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-13, -16); ctx.lineTo(-15, -38 + sq * 5); ctx.moveTo(13, -16); ctx.lineTo(15, -38 + sq * 5); ctx.stroke();
  ctx.fillStyle = '#5fb45a'; ctx.strokeStyle = '#2f6e33'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(0, -10 + sq * 2, 18, 15 - sq * 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#9be08e'; ctx.beginPath(); ctx.ellipse(0, -5 + sq * 2, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
  const ey = -26 + sq * 3;
  for (const ex of [-8, 8]) {
    ctx.fillStyle = '#5fb45a'; ctx.strokeStyle = '#2f6e33'; ctx.lineWidth = 2; v.circle(ex, ey, 6); ctx.fill(); ctx.stroke();
    if (hit < 0.1) v.line(ex - 3, ey, ex + 3, ey, v.c.ink, 2);
    else { v.fillCircle(ex, ey, 4, '#fff'); v.fillCircle(ex, ey + 0.5, 2, v.c.ink); }
  }
  ctx.strokeStyle = '#2f6e33'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -14 + sq * 2, 6, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  const dy = -60 + sq * 6;
  ctx.fillStyle = '#d24b4b'; ctx.strokeStyle = '#7c2424'; ctx.lineWidth = 2; v.rr(-14, dy, 28, 17, 5); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#f6efdf'; ctx.lineWidth = 1.5; ctx.beginPath();
  ctx.moveTo(-10, dy + 6); ctx.lineTo(-4, dy + 15); ctx.lineTo(2, dy + 6); ctx.lineTo(8, dy + 15); ctx.stroke();
  ctx.fillStyle = '#f6efdf'; ctx.beginPath(); ctx.ellipse(0, dy + 1, 14, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7c2424'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  return y + (dy + 1) * s; // the drum's top
}
// the mud puddle (drawMud): a sunken lens across x +- rx with its top at y; front = only the part below the grass line
function pw6Mud(v, x, y, rx, t, front) {
  const ctx = v.ctx, dep = 11;
  ctx.save();
  if (front) { ctx.beginPath(); ctx.rect(x - rx - 2, y + 3, 2 * rx + 4, dep + 6); ctx.clip(); }
  const g = ctx.createLinearGradient(0, y - 2, 0, y + dep);
  g.addColorStop(0, '#9a6636'); g.addColorStop(0.3, '#7a4f2a'); g.addColorStop(1, '#4a2b14');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - rx, y);
  for (let xx = x - rx + 6; xx < x + rx - 2; xx += 6) ctx.lineTo(xx, y + Math.sin(xx * 0.11 + t * 1.6) * 0.9);
  ctx.lineTo(x + rx, y); ctx.ellipse(x, y, rx, dep, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
  if (!front) {
    ctx.fillStyle = '#7a4f2a';
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + d * (rx - 3), y + 1, 7, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,240,215,0.38)'; ctx.beginPath(); ctx.ellipse(x - rx * 0.55, y + 2.5, rx * 0.2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
// a fan on the bench (drawFan) with a scarf in its player's colour, feet at (x, y)
function pw6Fan(v, x, y, kind, side, cheer, s) {
  const ctx = v.ctx, col = { bunny: '#f1ece6', duck: '#ffd84a', cat: '#9aa1b4', pig: '#f7a8b8' }[kind];
  const dk = { bunny: '#9b8f86', duck: '#c99a12', cat: '#5c637a', pig: '#c46a80' }[kind];
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = dk; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath();
  if (cheer) { ctx.moveTo(-10, -12); ctx.lineTo(-17, -30); ctx.moveTo(10, -12); ctx.lineTo(17, -30); }
  else { ctx.moveTo(-10, -10); ctx.lineTo(-14, -2); ctx.moveTo(10, -10); ctx.lineTo(14, -2); }
  ctx.stroke();
  ctx.fillStyle = col; ctx.lineWidth = 2; v.rr(-12, -18, 24, 20, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = side ? v.c.bo : v.c.pip; v.rr(-12, -19, 24, 6, 3); ctx.fill();
  const hy = -31;
  ctx.fillStyle = col;
  if (kind === 'bunny') for (const ex of [-5, 5]) { v.rr(ex - 3.5, hy - 25, 7, 18, 3.5); ctx.fill(); ctx.stroke(); }
  if (kind === 'cat' || kind === 'pig') for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 11, hy - 5); ctx.lineTo(d * 10, hy - 16); ctx.lineTo(d * 3, hy - 10); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  v.circle(0, hy, 12); ctx.fill(); ctx.stroke();
  if (cheer) { ctx.strokeStyle = v.c.ink; ctx.lineWidth = 2; for (const ex of [-4.5, 4.5]) { ctx.beginPath(); ctx.arc(ex, hy - 1, 2.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); } }
  else { v.fillCircle(-4.5, hy - 2, 1.8, v.c.ink); v.fillCircle(4.5, hy - 2, 1.8, v.c.ink); }
  if (kind === 'duck') { ctx.fillStyle = '#ff9a3d'; v.rr(-6, hy + 2, 12, cheer ? 7 : 5, 3); ctx.fill(); }
  else if (kind === 'pig') { ctx.fillStyle = '#f58ea4'; v.rr(-5, hy + 2, 10, 7, 3.5); ctx.fill(); }
  else v.fillCircle(0, hy + 3, 1.6, v.c.ink);
  ctx.restore();
}

// 6-2: both mash to pull; Pip pulls on the frog's BOOM for big heaves and Bo slides into the mud
definePreview('Tug of War', {
  blurb: 'Pull, pull, pull! Pull on the drum\'s BOOM to tug the other one into the mud.',
  loop: 6.5, still: 3.75,
  scene(v, t, part = 3) {
    const ctx = v.ctx, k = t / 6.5, gy = 136, mid = v.W / 2, mud = 44, half = 62, body = 15, tw = pw6Cyc(t, 6.5, 1.6);
    // the beat: a BOOM every 0.15 of the loop; Pip heaves on the 3rd and 4th
    const beats = [0.12, 0.27, 0.42, 0.57], hitK = beats.reduce((m, b) => (k >= b ? k - b : m), 1), hit = hitK * 6.5;
    const heave1 = v.ease.out(v.seg(k, 0.42, 0.47)), heave2 = v.ease.out(v.seg(k, 0.57, 0.64));
    const mash = k < 0.57 ? Math.sin(t * 9) * 3 + Math.sin(t * 3.1) * 4 * (1 - v.seg(k, 0.35, 0.42)) : 0;
    const ro = mash - 22 * (heave1 + heave2); // Bo ends with toes in the mud, clear of the frog
    const won = k > 0.6, inMud = v.seg(k, 0.6, 0.66);
    if (part & 1) {
      v.sky(); v.sun(); pw6Clouds(v, t, 6.5); v.hills(gy - 30); v.ground(gy);
      // the bench of fans below the field
      ctx.fillStyle = v.c.plank; v.rr(6, 166, 92, 6, 3); ctx.fill(); v.rr(222, 166, 92, 6, 3); ctx.fill();
      [[26, 'bunny', 0], [74, 'duck', 0], [246, 'cat', 1], [294, 'pig', 1]].forEach(([x, kind, side], i) => {
        const ch = won && side === 0 && k < 0.92;
        pw6Fan(v, x, 167 - (ch ? Math.abs(Math.sin(t * 9 + i)) * 5 : 0), kind, side, ch, 0.5);
      });
      // mud, stakes with their pennants, the frog
      pw6Mud(v, mid, gy - 3, mud, tw, false);
      for (const d of [-1, 1]) {
        const sx = mid + d * mud;
        ctx.fillStyle = v.c.plankDark; v.rr(sx - 2, gy - 22, 4, 24, 2); ctx.fill();
        ctx.fillStyle = d < 0 ? v.c.pip : v.c.bo; ctx.beginPath(); ctx.moveTo(sx, gy - 22); ctx.lineTo(sx + d * 11, gy - 18 + Math.sin(pw6Cyc(t, 6.5, 5) * 5 + d)); ctx.lineTo(sx, gy - 14); ctx.closePath(); ctx.fill();
      }
      const drumY = pw6Frog(v, mid, gy, hit);
      pw6Mud(v, mid, gy - 3, mud, tw, true);
      if (hit < 0.35 && k < 0.66) {
        const a = 1 - hit / 0.35;
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * a) + ')'; ctx.lineWidth = 2.5; v.circle(mid, drumY, 6 + hit / 0.35 * 18); ctx.stroke();
        ctx.save(); ctx.globalAlpha *= a; v.label('BOOM', mid, drumY - 14 - hit * 20, 12, '#fff1c9'); ctx.restore();
      }
    }
    if (!(part & 2)) return;
    // the players: Pip on the left, Bo on the right, leaning back; Bo slides into the mud at the end
    const hy = gy - 7, hx = [mid + ro - half, mid + ro + half];
    const pipX = hx[0] - body, boX = hx[1] + body;
    const sink = 7 * inMud, pipHop = won && k < 0.9 ? v.hop(v.phase(t, 0.5), 10) : 0;
    v.hero(0, pipX, gy + (won ? pipHop : 0), { face: 1, rot: won ? 0 : -0.22 - 0.1 * heave2, mood: won && k < 0.92 ? 'joy' : 'grit' });
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, v.W, gy - 3 + 1); ctx.clip();
    v.hero(1, boX, gy + sink, { face: -1, rot: won ? 0.15 * (1 - inMud) : 0.22 - 0.25 * heave1, shadow: !won, mood: won ? 'dizzy' : heave1 > 0 ? 'wow' : 'grit' });
    if (won) { // mud on Bo's tummy and a splat on the cheek
      ctx.fillStyle = 'rgba(110,72,38,0.85)'; v.rr(boX - 10, gy + sink - 11 + 1, 20, 11, 5); ctx.fill();
      v.fillCircle(boX - 6, gy + sink - 13, 2.4, 'rgba(110,72,38,0.8)'); v.fillCircle(boX + 5, gy + sink - 14, 1.8, 'rgba(110,72,38,0.8)');
    }
    ctx.restore();
    // the rope with its tails, the red ribbon, the mitts
    const ends = won ? [[hx[0], hy], [boX - 4, gy - 4]] : [[hx[0], hy], [hx[1], hy]];
    const rope = (lw, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(hx[0], hy); ctx.quadraticCurveTo(hx[0] - 20, hy + 2, hx[0] - 34, gy - 2); ctx.lineTo(hx[0] - 44, gy - 2);
      ctx.moveTo(ends[0][0], ends[0][1]); ctx.quadraticCurveTo((ends[0][0] + ends[1][0]) / 2, hy + (won ? 8 : 3), ends[1][0], ends[1][1]);
      if (!won) { ctx.moveTo(hx[1], hy); ctx.quadraticCurveTo(hx[1] + 20, hy + 2, hx[1] + 34, gy - 2); ctx.lineTo(hx[1] + 44, gy - 2); }
      ctx.stroke();
    };
    rope(5.5, v.c.ropeDark); rope(3, v.c.rope);
    const rbx = mid + ro, rby = hy + 2;
    ctx.save(); ctx.translate(rbx, rby); ctx.rotate(Math.sin(t * 6) * 0.15);
    ctx.fillStyle = '#e8443a'; ctx.strokeStyle = '#8c1f1a'; ctx.lineWidth = 1.2;
    for (const d of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(d * 5, 11); ctx.lineTo(d * 1, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(d * 7, -4); ctx.lineTo(d * 7, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    v.circle(0, 0, 2.5); ctx.fill(); ctx.stroke(); ctx.restore();
    for (let id = 0; id < 2; id++) {
      if (won && id === 1) continue;
      const jig = !won ? Math.max(0, Math.sin(t * 22 + id * 1.6)) * 3 : 0;
      ctx.fillStyle = v.c.paper; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 2; v.circle(hx[id] + (id ? jig : -jig), hy, 4.5); ctx.fill(); ctx.stroke();
      // the approach ring: it shrinks onto the hands and touches them on the BOOM
      const next = beats.find(b => b > k && b - k < 0.1);
      if (next != null && !won) { const f = (next - k) / 0.1; ctx.strokeStyle = id ? v.c.bo : v.c.pip; ctx.lineWidth = 2.5; v.circle(hx[id], hy, 8 + 18 * f); ctx.stroke(); }
    }
    // words, splash, the win
    if (k > 0.42 && k < 0.52) v.label('HEAVE!', pipX + 6, gy - 46 - heave1 * 6, 15, v.c.gold);
    if (k > 0.57 && k < 0.66) v.label('HEAVE!', pipX + 6, gy - 46 - heave2 * 6, 15, v.c.gold);
    if (k > 0.62 && k < 0.8) {
      const sk = v.seg(k, 0.62, 0.8);
      for (let q = 0; q < 6; q++) { const a = -Math.PI * (0.15 + 0.7 * q / 5); v.fillCircle(boX + Math.cos(a) * 26 * sk, gy - 4 + Math.sin(a) * 22 * sk + 30 * sk * sk, 2.6 * (1 - sk) + 0.5, '#7a4f2a'); }
      v.label('SPLAT!', boX + 22, gy - 44, 14, '#c98a52');
    }
    if (won && k < 0.92) {
      const sk = v.ease.back(v.seg(k, 0.64, 0.72));
      v.star(pipX, gy - 54 + pipHop, 11 * sk);
      v.confetti(pipX + 10, gy - 40, v.seg(k, 0.64, 0.9));
    }
  },
  draw(v, t) { pw6Loop(v, t, 6.5, 0.45, (tt, part) => this.scene(v, tt, part)); },
});

/* ---- 6-3 Train Tracks (top-down, 20 px cells) ---- */
// a piece of wooden track along a segment: { x1, y1, x2, y2 } or an arc { cx, cy, r, a0, a1, ccw }
function pw6TrackPath(ctx, g, off) {
  if (g.r == null) {
    const d = Math.hypot(g.x2 - g.x1, g.y2 - g.y1) || 1, nx = -(g.y2 - g.y1) / d * off, ny = (g.x2 - g.x1) / d * off;
    ctx.moveTo(g.x1 + nx, g.y1 + ny); ctx.lineTo(g.x2 + nx, g.y2 + ny);
  } else { ctx.moveTo(g.cx + Math.cos(g.a0) * (g.r + off), g.cy + Math.sin(g.a0) * (g.r + off)); ctx.arc(g.cx, g.cy, g.r + off, g.a0, g.a1, g.ccw); }
}
function pw6Track(v, g, o = {}) {
  const ctx = v.ctx;
  ctx.save(); ctx.lineCap = 'butt';
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.ghost) { // a dotted square still to build
    ctx.beginPath(); pw6TrackPath(ctx, g, 0); ctx.lineWidth = 11; ctx.strokeStyle = 'rgba(255,140,40,' + (0.35 + 0.2 * Math.sin(v.t * 8)) + ')'; ctx.stroke();
    ctx.setLineDash([3, 3]); ctx.beginPath(); pw6TrackPath(ctx, g, -5.5); pw6TrackPath(ctx, g, 5.5);
    ctx.strokeStyle = 'rgba(150,70,10,0.8)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); return;
  }
  ctx.beginPath(); pw6TrackPath(ctx, g, 0);
  ctx.strokeStyle = '#a8743f'; ctx.lineWidth = 13; ctx.stroke();
  ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 10; ctx.stroke();
  ctx.beginPath(); pw6TrackPath(ctx, g, -2.7); pw6TrackPath(ctx, g, 2.7);
  ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();
}
// a station hut (trainDrawHut) in a 20 px cell at (x, y), roof in the station's colour
function pw6Hut(v, x, y, col) {
  const ctx = v.ctx;
  ctx.fillStyle = 'rgba(28,26,54,0.16)'; ctx.fillRect(x + 3, y + 17, 18, 4);
  ctx.fillStyle = '#fff6e6'; ctx.fillRect(x + 2, y + 8, 16, 12); ctx.strokeStyle = '#d6c3a0'; ctx.lineWidth = 1.2; ctx.strokeRect(x + 2, y + 8, 16, 12);
  ctx.fillStyle = col; v.rr(x + 7, y + 13, 6, 7, 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 1, y + 9); ctx.lineTo(x + 21, y + 9); ctx.lineTo(x + 10, y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(28,26,54,0.45)'; ctx.stroke();
}
// the castle icon (trainIcon 'castle'), size s px
function pw6Castle(v, x, y, s) {
  const ctx = v.ctx, u = s / 16;
  ctx.save(); ctx.translate(x, y); ctx.scale(u, u);
  ctx.fillStyle = '#9a6bff'; ctx.strokeStyle = '#5b3ab8'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-5.5, 7); ctx.lineTo(-5.5, -4.5); ctx.lineTo(-3.5, -4.5); ctx.lineTo(-3.5, -2.5); ctx.lineTo(-1, -2.5); ctx.lineTo(-1, -4.5); ctx.lineTo(1, -4.5);
  ctx.lineTo(1, -2.5); ctx.lineTo(3.5, -2.5); ctx.lineTo(3.5, -4.5); ctx.lineTo(5.5, -4.5); ctx.lineTo(5.5, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3b2470'; ctx.beginPath(); ctx.moveTo(-1.8, 7); ctx.lineTo(-1.8, 3); ctx.arc(0, 3, 1.8, Math.PI, 0); ctx.lineTo(1.8, 7); ctx.closePath(); ctx.fill();
  v.line(0, -4.5, 0, -8.5, v.c.ink, 1);
  ctx.fillStyle = '#ff5a6e'; ctx.beginPath(); ctx.moveTo(0, -8.5); ctx.lineTo(4, -7.3); ctx.lineTo(0, -6); ctx.closePath(); ctx.fill();
  ctx.restore();
}
// the cow icon (trainIcon 'cow'), size s px
function pw6Cow(v, x, y, s) {
  const ctx = v.ctx, u = s / 16;
  ctx.save(); ctx.translate(x, y); ctx.scale(u, u);
  ctx.fillStyle = '#f2b8c6'; ctx.beginPath(); ctx.ellipse(-6.5, -3.5, 2.6, 1.7, -0.5, 0, Math.PI * 2); ctx.ellipse(6.5, -3.5, 2.6, 1.7, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, -0.5, 5.6, 6.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = v.c.ink; ctx.beginPath(); ctx.ellipse(-2.4, -3.6, 2.4, 2, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff9bb3'; ctx.beginPath(); ctx.ellipse(0, 3.2, 4.2, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  v.fillCircle(-1.5, 3.2, 0.8, v.c.ink); v.fillCircle(1.5, 3.2, 0.8, v.c.ink); v.fillCircle(2.4, -1.6, 0.9, v.c.ink);
  ctx.restore();
}
// a station's badge (trainBadge): a white disc in the station's colour with its icon
function pw6Badge(v, x, y, r, col, icon) {
  const ctx = v.ctx;
  v.fillCircle(x, y, r, '#fff'); ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, r * 0.23); v.circle(x, y, r - 0.5); ctx.stroke();
  if (icon === 'cow') pw6Cow(v, x, y, r * 1.35); else pw6Castle(v, x, y, r * 1.35);
}
// a bunny passenger's head (trainAnimal 'bunny')
function pw6Bunny(v, x, y, s = 1) {
  const ctx = v.ctx;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(28,26,54,0.55)'; ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-3, -8, 2.2, 5.5, -0.15, 0, Math.PI * 2); ctx.ellipse(3, -8, 2.2, 5.5, 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffb3c7'; ctx.beginPath(); ctx.ellipse(-3, -8, 1, 3.6, -0.15, 0, Math.PI * 2); ctx.ellipse(3, -8, 1, 3.6, 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; v.circle(0, 0, 7); ctx.fill(); ctx.stroke();
  v.fillCircle(-2.5, -1, 1.1, v.c.ink); v.fillCircle(2.5, -1, 1.1, v.c.ink); v.fillCircle(0, 1.8, 1.2, '#ff8fab');
  ctx.restore();
}
// one train car (trainDrawTrain) centred at (x, y), heading ang; kind 0 engine, 1 coach, 2 track wagon
function pw6Car(v, kind, x, y, ang) {
  const ctx = v.ctx;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(0.8, 0.8);
  if (kind === 0) {
    ctx.fillStyle = '#d23a3a'; v.rr(-12, -9, 24, 18, 6); ctx.fill();
    ctx.fillStyle = '#a82d2d'; v.rr(-12, -9, 9, 18, 5); ctx.fill();
    ctx.fillStyle = '#f2c14e'; ctx.fillRect(-2, -9, 3, 18); v.circle(3.5, 0, 2.5); ctx.fill();
    v.fillCircle(7.5, 0, 3.8, v.c.ink); v.fillCircle(7.5, 0, 2, '#5a5a6a');
    ctx.fillStyle = v.c.ink; v.rr(10.5, -7, 2.5, 14, 1); ctx.fill();
    ctx.strokeStyle = '#8f2424'; ctx.lineWidth = 1.5; v.rr(-12, -9, 24, 18, 6); ctx.stroke();
  } else if (kind === 1) {
    ctx.fillStyle = '#f6ecd2'; v.rr(-12, -9, 24, 18, 6); ctx.fill(); ctx.strokeStyle = '#c9b98f'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#2fb3a8'; v.rr(-10, -6.5, 20, 13, 4); ctx.fill();
  } else {
    ctx.fillStyle = '#b57a45'; v.rr(-12, -9, 24, 18, 5); ctx.fill();
    ctx.fillStyle = '#7d4f28'; v.rr(-9.5, -6.5, 19, 13, 2.5); ctx.fill();
    ctx.fillStyle = '#e0b07a'; for (let i = 0; i < 3; i++) { v.rr(-7.5, -5 + i * 3.7, 15, 2.8, 1.3); ctx.fill(); }
  }
  ctx.restore();
}

// 6-3: Pip lays the missing track, Bo flips the lever, and the bunny rides home to the castle
definePreview('Train Tracks', {
  blurb: 'One lays track for the train, one flips levers to take everyone home.',
  loop: 7.5, still: 1.12,
  // the route: along y 130, a curve at the junction (cell centre 210, 130), then up x 210; returns {x, y, ang}
  pos(s) {
    if (s < 300) return { x: s - 100, y: 130, ang: 0 };
    const L = Math.PI * 5;
    if (s < 300 + L) { const u = (s - 300) / L, a = Math.PI / 2 * (1 - u); return { x: 200 + 10 * Math.cos(a), y: 120 + 10 * Math.sin(a), ang: -u * Math.PI / 2 }; }
    return { x: 210, y: 120 - (s - 300 - L), ang: -Math.PI / 2 };
  },
  scene(v, t, part = 3) {
    const ctx = v.ctx, k = t / 7.5, ty = 130, jx = 210;
    if (part & 1) {
      // the play rug with its soft checker, hedges and trees
      ctx.fillStyle = '#8fd16f'; ctx.fillRect(0, 0, v.W, v.H);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      for (let y = 0; y < 9; y += 2) for (let x = (y / 2) % 2 ? 2 : 0; x < 16; x += 4) ctx.fillRect(x * 20, y * 20, 40, 40);
      for (const [x, y, r] of [[30, 30, 12], [92, 58, 10], [150, 22, 11], [290, 76, 12], [40, 168, 10], [130, 170, 9], [300, 20, 9], [20, 100, 9]]) {
        v.fillCircle(x + 2, y + 4, r, 'rgba(28,26,54,0.16)'); v.fillCircle(x, y, r, '#3f8f5c'); v.fillCircle(x - 3, y - 3, r * 0.55, '#5cb87a');
      }
      // the built line and the line up to the castle
      pw6Track(v, { x1: -10, y1: ty, x2: 160, y2: ty });
      pw6Track(v, { x1: jx, y1: ty - 10, x2: jx, y2: -10 });
      // stations with their badges (like the level's): the Farm down the straight line, the Castle up the curve
      pw6Hut(v, 280, 140, '#c8553d'); pw6Badge(v, 290, 168, 8, '#c8553d', 'cow');
      pw6Hut(v, 224, 22, '#9a6bff'); pw6Badge(v, 234, 13, 8, '#9a6bff', 'castle');
      ctx.fillStyle = '#d8d4cc'; ctx.fillRect(222, 44, 18, 5);
    }
    if (!(part & 2)) return;
    // the two dotted squares that Pip lays, the junction and its two ways
    const lay = [v.seg(k, 0.06, 0.09), v.seg(k, 0.17, 0.2)];
    for (let i = 0; i < 2; i++) {
      const g = { x1: 160 + i * 20, y1: ty, x2: 180 + i * 20, y2: ty };
      if (lay[i] <= 0) pw6Track(v, g, { ghost: true });
      else { const p = 1 + 0.35 * Math.sin(lay[i] * Math.PI); ctx.save(); ctx.translate(170 + i * 20, ty); ctx.scale(p, p); ctx.translate(-170 - i * 20, -ty); pw6Track(v, g); ctx.restore(); }
    }
    const flip = v.ease.inOut(v.seg(k, 0.12, 0.16)), east = { x1: 200, y1: ty, x2: 330, y2: ty };
    const curve = { cx: 200, cy: 120, r: 10, a0: Math.PI / 2, a1: 0, ccw: true };
    pw6Track(v, east, { alpha: 1 - 0.45 * flip });
    pw6Track(v, curve, { alpha: 0.55 + 0.45 * flip });
    // the chevron on the junction slides from the straight leg to the curve
    {
      const a = -flip * Math.PI / 4, cx = 207 + 3 * flip, cy = ty - 4 * flip;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-2.5, -3.5); ctx.lineTo(1.5, 0); ctx.lineTo(-2.5, 3.5);
      ctx.strokeStyle = 'rgba(28,26,54,0.35)'; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2; ctx.stroke(); ctx.restore();
    }
    // the lever and its lamp (red cross, then a green check)
    {
      const lx = 236, ly = 150, a = (-25 + 50 * flip) * Math.PI / 180 * -1;
      ctx.save(); ctx.setLineDash([3, 3]); v.line(lx, ly, jx, ty, 'rgba(28,26,54,0.25)', 1.5); ctx.restore();
      ctx.save(); ctx.translate(lx, ly + 5); ctx.scale(1.35, 1.35); ctx.translate(-lx, -ly - 5); // a bit bigger than life, to read on a card
      ctx.fillStyle = '#8a5a2b'; v.rr(lx - 6, ly + 3, 12, 6, 2); ctx.fill();
      const hx = lx + Math.sin(a) * 11, hy = ly + 5 - Math.cos(a) * 11;
      v.line(lx, ly + 5, hx, hy, v.c.ink, 2.5); v.fillCircle(hx, hy, 3.5, '#e04040');
      const px = lx - 12, py = ly - 4, green = flip > 0.5, pulse = 1 + 0.5 * Math.sin(v.seg(k, 0.14, 0.2) * Math.PI);
      v.line(px, ly + 7, px, py, '#4a4a5a', 2);
      v.fillCircle(px, py, 8 * pulse, green ? 'rgba(60,207,90,0.3)' : 'rgba(255,74,74,0.3)');
      v.fillCircle(px, py, 5, green ? '#3ccf5a' : '#ff4a4a'); ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.3; v.circle(px, py, 5); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath();
      if (green) { ctx.moveTo(px - 2.3, py); ctx.lineTo(px - 0.5, py + 2); ctx.lineTo(px + 2.5, py - 2.1); }
      else { ctx.moveTo(px - 2, py - 2); ctx.lineTo(px + 2, py + 2); ctx.moveTo(px + 2, py - 2); ctx.lineTo(px - 2, py + 2); }
      ctx.stroke(); ctx.restore();
    }
    // the train: rolls up to the gap, goes on once it's built, turns at the junction and stops at the castle
    const sStop = 300 + Math.PI * 5 + 80 + 21;
    const s = k < 0.17 ? v.lerp(150, 248, v.ease.out(v.seg(k, 0, 0.17))) : v.lerp(248, sStop, v.ease.inOut(v.seg(k, 0.21, 0.56)));
    const cars = [0, 1, 2].map(i => this.pos(s - i * 21));
    for (const p of cars) { ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.beginPath(); ctx.ellipse(p.x + 2, p.y + 3, 11, 9, 0, 0, Math.PI * 2); ctx.fill(); }
    v.line(cars[0].x, cars[0].y, cars[1].x, cars[1].y, v.c.ink, 2); v.line(cars[1].x, cars[1].y, cars[2].x, cars[2].y, v.c.ink, 2);
    for (let i = 2; i >= 0; i--) pw6Car(v, i, cars[i].x, cars[i].y, cars[i].ang);
    if (k < 0.5 && k > 0.03) for (let q = 0; q < 3; q++) { // steam
      const f = v.phase(t, 0.6, q / 3); ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * (1 - f)) + ')';
      v.circle(cars[0].x - Math.cos(cars[0].ang) * 10 * f + 3, cars[0].y - Math.sin(cars[0].ang) * 10 * f - 6 * f, 3 + 4 * f); ctx.fill();
    }
    // the bunny: rides in the coach with a castle in its bubble, hops off at the castle
    const hopK = v.seg(k, 0.58, 0.66), c = cars[1];
    if (hopK <= 0) {
      pw6Bunny(v, c.x, c.y - 2, 0.9);
      const sa = Math.abs(Math.sin(c.ang)), bx = c.x - 22 * sa, by = c.y - 22 * (1 - sa) - 8 * sa;
      ctx.fillStyle = '#fff'; v.rr(bx - 12, by - 10, 24, 20, 7); ctx.fill(); ctx.strokeStyle = '#9a6bff'; ctx.lineWidth = 2; ctx.stroke();
      pw6Castle(v, bx, by, 14);
    } else {
      const bx = v.lerp(c.x, 231, hopK), by = v.lerp(c.y - 2, 54, hopK) - Math.sin(hopK * Math.PI) * 16;
      pw6Bunny(v, bx, by + (hopK >= 1 ? -Math.abs(Math.sin(t * 9)) * 3 : 0), 0.9 + 0.35 * hopK);
      if (hopK >= 1 && k < 0.9) v.heart(246, 46 - v.seg(k, 0.66, 0.9) * 10, 5);
    }
    // Pip (builder: hard hat, track pieces on the head) and Bo (switcher: conductor's cap)
    const happy = k > 0.64 && k < 0.92;
    const walk = (a, b) => (k > a && k < b ? v.hop(v.phase(t, 0.3), 3) : 0);
    let pipX = v.lerp(150, 170, v.ease.inOut(v.seg(k, 0.0, 0.06))), pipY = ty - 5;
    if (k > 0.09) pipX = v.lerp(170, 190, v.ease.inOut(v.seg(k, 0.09, 0.14)));
    if (k > 0.2) { const m = v.ease.inOut(v.seg(k, 0.2, 0.26)); pipX = v.lerp(190, 168, m); pipY = v.lerp(ty - 5, 96, m); }
    if (k > 0.92) { const m = v.ease.inOut(v.seg(k, 0.92, 1)); pipX = v.lerp(168, 150, m); pipY = v.lerp(96, ty - 5, m); }
    pipY += walk(0, 0.06) + walk(0.09, 0.14) + walk(0.2, 0.26) + (happy ? v.hop(v.phase(t, 0.5), 8) : 0);
    const carry = k < 0.075 ? 2 : k < 0.185 ? 1 : k > 0.95 ? 2 : 0;
    v.hero(0, pipX, pipY, { face: 1, mood: happy ? 'joy' : 'happy' });
    ctx.fillStyle = '#ffcf33'; ctx.strokeStyle = '#b88a00'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(pipX, pipY - 23, 9, 7, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    v.rr(pipX - 11, pipY - 24, 22, 3, 1.5); ctx.fill(); ctx.stroke();
    for (let i = 0; i < carry; i++) { ctx.fillStyle = '#e0b07a'; ctx.strokeStyle = '#a8743f'; ctx.lineWidth = 1; v.rr(pipX - 8, pipY - 37 - 5 * i, 16, 4, 2); ctx.fill(); ctx.stroke(); }
    const press = v.seg(k, 0.11, 0.16), boX = 256, boY = 162 + (happy ? v.hop(v.phase(t, 0.5, 0.25), 8) : 0);
    v.hero(1, boX - 4 * Math.sin(press * Math.PI), boY, { face: -1, sq: 0.15 * Math.sin(press * Math.PI), mood: happy ? 'joy' : 'happy' });
    ctx.fillStyle = '#2b3a6b'; v.rr(boX - 8 - 4 * Math.sin(press * Math.PI), boY - 30, 16, 7, 3); ctx.fill();
    ctx.beginPath(); ctx.ellipse(boX - 6 - 4 * Math.sin(press * Math.PI), boY - 23, 6, 2, 0, 0, Math.PI * 2); ctx.fill();
    v.fillCircle(boX - 2 - 4 * Math.sin(press * Math.PI), boY - 27, 1.6, '#f2c14e');
    // words and the happy end
    if (k > 0.06 && k < 0.24) v.label('+1', 170 + (k > 0.17 ? 20 : 0), ty + 18 - v.seg(k, k > 0.17 ? 0.17 : 0.06, k > 0.17 ? 0.23 : 0.12) * 8, 13, '#fff');
    if (k > 0.12 && k < 0.24) v.label('Click!', 240, 122, 13, '#fff');
    if (k > 0.15 && k < 0.21) v.label('Toot!', cars[0].x - 6, ty + 20, 12, '#fff');
    v.star(270, 26 - v.ease.back(v.seg(k, 0.66, 0.74)) * 4, 11 * v.ease.back(v.seg(k, 0.66, 0.74)) * (1 - v.seg(k, 0.88, 0.92)));
    v.confetti(230, 40, v.seg(k, 0.65, 0.9));
  },
  draw(v, t) { pw6Loop(v, t, 7.5, 0.5, (tt, part) => this.scene(v, tt, part)); },
});

/* ---- 6-4 Sumo Bounce ---- */
// a sumo ball (sumoDrawBall) centred at (x, y), radius r. o: sq (+ wide), float (swim ring), mood ('happy' 'grit' 'joy' 'out' 'wow'),
// face (-1 / 1), spin (belt), alpha, charge (0..1 ring)
function pw6Ball(v, id, x, y, r, o = {}) {
  const ctx = v.ctx, col = id ? v.c.bo : v.c.pip, dark = id ? v.c.boDark : v.c.pipDark, s = r / 18, f = o.face || 1;
  const ring = front => { // the swim ring around the waist: white with red dashes
    ctx.save(); if (!front) ctx.globalAlpha *= 0.85; ctx.lineWidth = 5; ctx.lineCap = 'butt';
    const a0 = front ? 0 : Math.PI, a1 = front ? Math.PI : Math.PI * 2;
    ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 4 * s, r + 4, 5.5, 0, a0, a1); ctx.stroke();
    ctx.strokeStyle = '#ff5f6d'; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.restore();
  };
  ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.translate(x, y + r); ctx.scale(1 + (o.sq || 0), 1 - (o.sq || 0)); ctx.translate(0, -r);
  if (o.float) ring(false);
  if (id === 1) { ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 2; for (const d of [-1, 1]) { v.circle(d * r * 0.62, -r * 0.8, r * 0.3); ctx.fill(); ctx.stroke(); } }
  else { v.line(0, -r + 1, 1, -r - 6, '#3f8f5c', 2); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(5.5, -r - 8, 6.5, 3.2, -0.5, 0, Math.PI * 2); ctx.fill(); }
  v.fillCircle(0, 0, r, col);
  ctx.save(); v.circle(0, 0, r); ctx.clip();
  ctx.save(); ctx.rotate(o.spin || 0); ctx.fillStyle = dark; ctx.fillRect(-r, r * 0.3, r * 2, 5); ctx.restore();
  ctx.fillStyle = 'rgba(28,26,54,0.14)'; ctx.beginPath(); ctx.arc(r * 0.25, r * 0.3, r, 0, Math.PI * 2); ctx.arc(0, 0, r + 1, 0, Math.PI * 2, true); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.32, r * 0.2, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = dark; ctx.lineWidth = 2.5; v.circle(0, 0, r); ctx.stroke();
  // the face
  const m = o.mood || 'happy', l = f * 2.5 * s;
  ctx.save(); ctx.translate(l, 0); ctx.scale(s, s); ctx.strokeStyle = v.c.ink; ctx.lineWidth = 2; ctx.lineCap = 'round';
  if (m === 'out') for (const d of [-1, 1]) { const ex = d * 5; ctx.beginPath(); ctx.moveTo(ex - 3 * d, -9); ctx.lineTo(ex + 1.5 * d, -6); ctx.lineTo(ex - 3 * d, -3); ctx.stroke(); }
  else if (m === 'joy') for (const ex of [-5, 5]) { ctx.beginPath(); ctx.arc(ex, -5, 3, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  else for (const ex of [-5, 5]) {
    const big = m === 'wow';
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, -6, 3.6, m === 'grit' ? 3.2 : 4.4, 0, 0, Math.PI * 2); ctx.fill();
    v.fillCircle(ex + (big ? 0 : f), -5.5, big ? 1.4 : 2, v.c.ink);
  }
  if (m === 'grit') for (const d of [-1, 1]) v.line(d * 2, -11, d * 8.5, -12.5, dark, 2);
  ctx.fillStyle = 'rgba(255,120,140,0.45)'; v.circle(-8.5, 0, 2.4); ctx.fill(); v.circle(8.5, 0, 2.4); ctx.fill();
  if (m === 'joy') { ctx.fillStyle = '#7a2a3a'; ctx.beginPath(); ctx.arc(0, 0.5, 4, 0, Math.PI); ctx.closePath(); ctx.fill(); }
  else if (m === 'out') { ctx.beginPath(); ctx.arc(0, 4, 3, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
  else if (m === 'wow') { ctx.beginPath(); ctx.ellipse(0, 2, 2.4, 3, 0, 0, Math.PI * 2); ctx.stroke(); }
  else if (m === 'grit') v.line(-3, 1.5, 3, 1.5, v.c.ink, 1.8);
  else { ctx.beginPath(); ctx.arc(0, -0.5, 2.6, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
  ctx.restore();
  if (o.float) ring(true);
  ctx.restore();
  if (o.charge > 0) {
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(28,26,54,0.35)'; v.circle(x, y, r + 7); ctx.stroke();
    ctx.strokeStyle = o.charge >= 1 ? v.c.gold : col; ctx.beginPath(); ctx.arc(x, y, r + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * o.charge); ctx.stroke();
  }
}

// 6-4: Bo boings Pip into the pool (the floatie pops and bubbles Pip back), then boings again for the win
definePreview('Sumo Bounce', {
  blurb: 'Bounce into each other! Knock the other ball off the mat into the pool.',
  loop: 7, still: 2.3,
  scene(v, t, part = 3) {
    const ctx = v.ctx, k = t / 7, cx = v.W / 2, top = 98, R = 300, hw = 104, wy = 150, r = 16, mcy = top + R;
    const surf = x => mcy - Math.sqrt(R * R - (x - cx) * (x - cx)), rim = surf(cx - hw);
    if (part & 1) {
      v.sky(); v.sun(56, 32); pw6Clouds(v, t, 7); v.hills(wy - 26);
      // garden fence and party bunting behind the pool
      ctx.fillStyle = '#f0d3a6';
      ctx.beginPath();
      for (let x = 4; x < v.W; x += 18) { ctx.moveTo(x, wy); ctx.lineTo(x, wy - 34); ctx.lineTo(x + 6, wy - 40); ctx.lineTo(x + 12, wy - 34); ctx.lineTo(x + 12, wy); ctx.closePath(); }
      ctx.fill();
      ctx.fillStyle = '#dcb47f'; ctx.fillRect(0, wy - 27, v.W, 4); ctx.fillRect(0, wy - 12, v.W, 4);
      const cols = [v.c.pip, v.c.gold, v.c.bo, '#ff8fc7', v.c.grass];
      for (const [x0, x1] of [[0, cx], [cx, v.W]]) {
        ctx.strokeStyle = 'rgba(122,82,50,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath();
        for (let i = 0; i <= 12; i++) { const fq = i / 12; ctx.lineTo(x0 + (x1 - x0) * fq, 14 + 22 * 4 * fq * (1 - fq)); }
        ctx.stroke();
        for (let i = 1; i < 8; i++) {
          const fq = i / 8, x = x0 + (x1 - x0) * fq, y = 14 + 22 * 4 * fq * (1 - fq);
          ctx.fillStyle = cols[(i + (x0 ? 2 : 0)) % 5]; ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.lineTo(x + Math.sin(pw6Cyc(t, 7, 2) * 2 + i) * 1.2, y + 10); ctx.closePath(); ctx.fill();
        }
      }
      // the pool and the stone pedestal standing in it
      v.water(0, wy, v.W, v.H - wy, pw6Cyc(t, 7, 4));
      ctx.fillStyle = v.c.stoneEdge; ctx.fillRect(cx - 28, rim + 8, 56, v.H - rim);
      ctx.fillStyle = v.c.stone; ctx.fillRect(cx - 22, rim + 8, 44, v.H - rim);
      ctx.fillStyle = v.c.stoneLight; ctx.fillRect(cx - 22, rim + 8, 7, v.H - rim);
      ctx.fillStyle = 'rgba(70,150,220,0.6)'; ctx.fillRect(cx - 28, wy, 56, v.H - wy);
      // the domed clay mat: side band, light top, the white straw ring and the two start lines, straw bales at the rim
      const a = Math.asin(hw / R), cap = (dy) => { ctx.beginPath(); ctx.arc(cx, mcy + dy, R, -Math.PI / 2 - a, -Math.PI / 2 + a); ctx.closePath(); };
      ctx.fillStyle = '#b8733f'; cap(10); ctx.fill(); ctx.fillRect(cx - hw, rim, hw * 2, 10);
      ctx.fillStyle = '#8d5329'; ctx.fillRect(cx - hw, rim + 7, hw * 2, 3);
      ctx.fillStyle = '#ecd29c'; cap(0); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, mcy, R - 4, -Math.PI / 2 - a * 0.92, -Math.PI / 2 + a * 0.92); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (const d of [-1, 1]) ctx.fillRect(cx + d * 30 - 1.5, surf(cx + d * 30) + 5, 3, 6);
      for (const d of [-1, 1]) { const bx = cx + d * hw; v.fillCircle(bx, rim, 7, v.c.rope); ctx.strokeStyle = v.c.ropeDark; ctx.lineWidth = 1.8; v.circle(bx, rim, 7); ctx.stroke(); }
    }
    if (!(part & 2)) return;
    // the story: idle hops, Bo charges and boings Pip in (the floatie pops, a bubble brings Pip back), then again for the win
    const ch1 = v.seg(k, 0.1, 0.24), dash1 = v.seg(k, 0.24, 0.29), fly1 = v.seg(k, 0.29, 0.4), back = v.seg(k, 0.44, 0.56);
    const ch2 = v.seg(k, 0.56, 0.66), dash2 = v.seg(k, 0.66, 0.7), fly2 = v.seg(k, 0.7, 0.8), won = k > 0.8;
    const idle = (id, on) => (on ? v.hop(v.phase(t, 0.55, id * 0.4), 7) : 0);
    // Bo
    let boX = 200, boMood = 'happy', boSq = 0, boCharge = 0;
    if (k > 0.1) { boMood = 'grit'; boCharge = ch1; boSq = 0.1 * ch1; }
    if (k > 0.24) { boX = v.lerp(200, 152, v.ease.in(dash1)); boCharge = 0; boSq = -0.12; }
    if (k > 0.29) { boX = v.lerp(152, 186, v.ease.out(v.seg(k, 0.29, 0.38))); boSq = 0; boMood = 'happy'; }
    if (k > 0.56) { boMood = 'grit'; boCharge = ch2; boSq = 0.1 * ch2; }
    if (k > 0.66) { boX = v.lerp(186, 132, v.ease.in(dash2)); boCharge = 0; boSq = -0.12; }
    if (k > 0.7) { boX = v.lerp(132, 146, v.ease.out(v.seg(k, 0.7, 0.78))); boSq = 0; boMood = won ? 'joy' : 'wow'; }
    const boHop = idle(1, k < 0.1 || (k > 0.38 && k < 0.56)) + (won ? v.hop(v.phase(t, 0.5), 14) : 0);
    // Pip
    let pipX = 120, pipY = surf(120) - r, pipMood = 'happy', pipAlpha = 1, inPool = false;
    const pipFloat = k < 0.4;
    if (k > 0.2) pipMood = 'wow';
    if (k > 0.29) { pipX = v.lerp(120, 30, fly1); pipY = v.lerp(surf(120) - r, wy + 2, fly1) + v.hop(fly1, 34); inPool = fly1 >= 1; }
    if (k > 0.44) { pipX = v.lerp(30, 100, back); pipY = v.lerp(wy + 2, surf(100) - r, back) + v.hop(back, 56); inPool = false; pipAlpha = back < 1 ? 0.7 : 1; pipMood = back < 1 ? 'wow' : 'grit'; }
    if (k > 0.56) { pipX = 100; pipY = surf(100) - r + idle(0, k < 0.66); pipMood = k > 0.62 ? 'wow' : 'grit'; }
    if (k > 0.7) { pipX = v.lerp(100, 40, fly2); pipY = v.lerp(surf(100) - r, wy + 3, fly2) + v.hop(fly2, 30); inPool = fly2 >= 1; pipMood = inPool ? 'out' : 'wow'; }
    if (k < 0.29) pipY += idle(0, k < 0.2);
    if (inPool) pipY += Math.sin(t * 4) * 1.2;
    // shadows on the mat, then the balls (a ball in the pool is cut at the water line)
    for (const [x, y] of [[boX, surf(boX) - r - boHop], [pipX, pipY]]) if (Math.abs(x - cx) < hw) { ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.beginPath(); ctx.ellipse(x, surf(x) + 1, r * 0.8, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.save();
    if (inPool) { ctx.beginPath(); ctx.rect(0, 0, v.W, wy + 2); ctx.clip(); }
    pw6Ball(v, 0, pipX, pipY, r, { float: pipFloat, mood: pipMood, face: 1, spin: -(pipX - 120) / r, alpha: pipAlpha });
    ctx.restore();
    if (inPool) { ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(pipX, wy + 2, r + 5 + Math.sin(t * 4) * 1.5, 3, 0, 0, Math.PI * 2); ctx.stroke(); }
    if (pipAlpha < 1) { ctx.strokeStyle = 'rgba(190,232,255,0.9)'; ctx.lineWidth = 2; v.circle(pipX, pipY, r + 5); ctx.stroke(); v.fillCircle(pipX, pipY, r + 5, 'rgba(190,232,255,0.2)'); }
    pw6Ball(v, 1, boX, surf(boX) - r - boHop, r, { float: true, mood: boMood, face: -1, sq: boSq, spin: (boX - 200) / r, charge: boCharge });
    // speed lines behind a dash
    for (const d of [dash1, dash2]) if (d > 0 && d < 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (const [oy, len] of [[-7, 12], [0, 18], [7, 12]]) { const y = surf(boX) - r + oy; ctx.beginPath(); ctx.moveTo(boX + r + 4, y); ctx.lineTo(boX + r + 4 + len, y); ctx.stroke(); }
    }
    // splashes, the popped floatie, words
    const splash = (x, sk) => {
      if (sk <= 0 || sk >= 1) return;
      for (let q = 0; q < 7; q++) { const an = -Math.PI * (0.12 + 0.76 * q / 6), dy = Math.sin(an) * 30 * sk + 40 * sk * sk; if (dy < 0) v.fillCircle(x + Math.cos(an) * 24 * sk, wy + dy, 2.8 * (1 - sk) + 0.6, '#bfe8ff'); }
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.85 * (1 - sk)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, wy + 2, 8 + 34 * sk, 2 + 5 * sk, 0, 0, Math.PI * 2); ctx.stroke();
    };
    splash(30, v.seg(k, 0.4, 0.5)); splash(40, v.seg(k, 0.8, 0.92));
    const pk = v.seg(k, 0.4, 0.48);
    if (pk > 0 && pk < 1) {
      ctx.save(); ctx.globalAlpha = 1 - pk; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3 + 0.3, rr = (r + 4) * (1 + 1.2 * pk); ctx.beginPath(); ctx.ellipse(30, wy - 4, rr, rr * 0.45, 0, an, an + 0.45); ctx.stroke(); }
      ctx.restore();
    }
    if (k > 0.24 && k < 0.34) v.label('BOING!', 168, 58, 16, v.c.gold);
    if (k > 0.41 && k < 0.52) v.label('POP!', 44, wy - 46 - pk * 6, 14, '#fff');
    if (k > 0.66 && k < 0.76) v.label('BOING!', 152, 58, 16, v.c.gold);
    if (k > 0.8 && k < 0.92) v.label('SPLASH!', 58, wy - 52, 14, '#bfe8ff');
    if (won) {
      const sk = v.ease.back(v.seg(k, 0.8, 0.88)), by = surf(boX) - r - boHop;
      v.star(boX, by - r - 18, 11 * sk);
      v.confetti(boX, by - 20, v.seg(k, 0.8, 0.98));
    }
  },
  draw(v, t) { pw6Loop(v, t, 7, 0.45, (tt, part) => this.scene(v, tt, part)); },
});
