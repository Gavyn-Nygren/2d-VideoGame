/* Pip & Bo - World page previews: World 35 Wizard Academy (35-1 Moonwick Academy). See js/previews/preview-core.js. */
'use strict';

/* 35-1 Moonwick Academy: a school day of magic lessons in four quick scenes, all under the same big moon:
     0.0 - 2.2  Broom Flying: Pip steers, Bo kicks, and the broom swoops through a lantern ring past the towers
     2.2 - 4.4  Shape Shifting: a puff of green sparkles and Bo is a frog; Pip giggles, Bo ribbits
     4.4 - 6.6  The Final Exam: the Blot ink monster rises; Pip holds a shield bubble, Bo zaps its eye
     6.6 - 8.8  Graduation: both throw their hats in the air and the stars come down as confetti
   Every helper starts with pw35. The hats are small copies of wizDrawHat in js/levels/world35/wiz-school.js (that one
   paints the game canvas, so this draws on v.ctx). */
const pw35C = { night: '#2a2458', dusk: '#6b4f9e', stone: '#5e5878', stoneDk: '#3f3a5a', hat: '#2b2f5e', moon: '#fff3c4', ink: '#1d1830',
  lantern: '#ffd23f', frog: '#78c850', frogDk: '#4f9a34', shield: '#8fd3ff', zap: '#ffe14a', broom: '#a86b32', bristle: '#e3b45a' };
const PW35_SCENES = [{ t0: 0, len: 2.2, name: 'Broom Flying' }, { t0: 2.2, len: 2.2, name: 'Shape Shifting' }, { t0: 4.4, len: 2.2, name: 'The Final Exam' }, { t0: 6.6, len: 2.2, name: 'Graduation' }];

// the moonlit sky and the academy's towers (scroll: how far the towers have slid left)
function pw35Sky(v, t, scroll = 0, ground = 150) {
  const ctx = v.ctx, g = ctx.createLinearGradient(0, 0, 0, ground);
  g.addColorStop(0, pw35C.night); g.addColorStop(1, pw35C.dusk); ctx.fillStyle = g; ctx.fillRect(0, 0, v.W, ground);
  for (let k = 0; k < 18; k++) { const a = 0.35 + 0.65 * Math.abs(Math.sin(t * 2 + k)); ctx.fillStyle = `rgba(255,255,255,${a * 0.8})`; v.circle(v.rand(k) * v.W, v.rand(k + 40) * ground * 0.6, 0.9 + v.rand(k + 9)); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,243,196,0.18)'; v.circle(262, 40, 30); ctx.fill();
  ctx.fillStyle = pw35C.moon; v.circle(262, 40, 22); ctx.fill();
  ctx.fillStyle = 'rgba(200,190,150,0.5)'; v.circle(255, 35, 4); ctx.fill(); v.circle(268, 47, 3); ctx.fill();
  // the towers, a window or two lit
  for (let k = 0; k < 6; k++) {
    const x = ((k * 70 - scroll) % 420 + 420) % 420 - 50, h = 50 + v.rand(k + 3) * 40, w = 30;
    ctx.fillStyle = pw35C.stoneDk; ctx.fillRect(x, ground - h, w, h);
    ctx.beginPath(); ctx.moveTo(x - 4, ground - h); ctx.lineTo(x + w / 2, ground - h - 28); ctx.lineTo(x + w + 4, ground - h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,210,63,0.85)'; ctx.fillRect(x + 11, ground - h + 14, 7, 10);
    if (v.rand(k + 20) > 0.4) ctx.fillRect(x + 11, ground - h + 34, 7, 9);
  }
  ctx.fillStyle = pw35C.stone; ctx.fillRect(0, ground, v.W, v.H - ground);
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; for (let x = -((scroll * 1.5) % 30); x < v.W; x += 30) ctx.fillRect(x + 2, ground + 3, 26, 5);
}
// a pointed wizard hat, brim centre (x, y); id 0 Pip, 1 Bo (the band colour); s = 1 is about 28 px tall
function pw35Hat(v, id, x, y, s, t, rot = 0) {
  const ctx = v.ctx, flop = Math.sin(t * 2.2 + id) * 1.5;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * 0.62, s * 0.62); ctx.lineJoin = 'round';
  ctx.fillStyle = pw35C.hat; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 0, 15, 3.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-10, -1); ctx.quadraticCurveTo(-6, -30, 2, -44); ctx.quadraticCurveTo(10 + flop, -52, 16 + flop * 2, -44); ctx.quadraticCurveTo(8, -40, 5, -28); ctx.quadraticCurveTo(8, -12, 10, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = id === 0 ? v.c.pip : v.c.bo; ctx.fillRect(-9.6, -6, 19.2, 4);
  v.star(-1, -20, 3.2, pw35C.lantern);
  ctx.restore();
}
// a hero in a hat (feet at x, y)
function pw35Wiz(v, id, x, y, t, o = {}) {
  v.hero(id, x, y, o);
  if (o.hat !== false) pw35Hat(v, id, x + (o.face || (id ? -1 : 1)) * -1, y - 24 * (o.s || 1) * (1 - (o.sq || 0) * 0.3) - 1, o.s || 1, t, o.hatRot || 0);
}
// a little magic wand line with a spark at its tip
function pw35Wand(v, x, y, dx, dy, glow) {
  const ctx = v.ctx;
  ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y + dy); ctx.stroke();
  if (glow > 0) v.sparkle(x + dx, y + dy, glow, '#fff6c8', 7);
}

/* ---------- 1: broom flying ---------- */
function pw35Broom(v, e, t) {
  const ctx = v.ctx, k = e / 2.2, scroll = e * 90;
  pw35Sky(v, t, scroll);
  // a lantern ring floats up ahead and slides past
  const rx = v.lerp(300, 40, k), ry = 70;
  ctx.strokeStyle = pw35C.lantern; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(rx, ry, 9, 24, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,210,63,0.35)'; ctx.lineWidth = 9; ctx.stroke();
  // the broom swoops up through it
  const bx = 150, by = 104 - Math.sin(k * Math.PI) * 32 + Math.sin(t * 7) * 2, tilt = -Math.cos(k * Math.PI) * 0.18;
  ctx.save(); ctx.translate(bx, by); ctx.rotate(tilt);
  ctx.strokeStyle = pw35C.broom; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-44, 0); ctx.lineTo(40, 0); ctx.stroke();
  ctx.fillStyle = pw35C.bristle; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-40, -3); ctx.lineTo(-64, -10); ctx.lineTo(-66, 10); ctx.lineTo(-40, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
  // Bo kicks at the back, Pip steers at the front
  const kick = Math.max(0, Math.sin(t * 12));
  pw35Wiz(v, 1, -24, -1, t, { s: 0.85, face: 1, mood: 'grit', shadow: false, sq: kick * 0.12 });
  pw35Wiz(v, 0, 16, -1, t, { s: 0.85, face: 1, mood: k > 0.4 && k < 0.7 ? 'joy' : 'happy', shadow: false });
  ctx.restore();
  for (let n = 0; n < 4; n++) v.puff(bx - 70 - n * 12, by + 4 + Math.sin(t * 9 + n) * 3, v.phase(t, 0.5, n * 0.12), 'rgba(255,255,255,0.7)');
  if (Math.abs(rx - bx) < 20) v.sparkle(rx, ry, v.seg(Math.abs(rx - bx), 20, 0), '#fff3c0', 16);
  if (k > 0.55) v.bubble('Wheee!', bx + 20, by - 50, { size: 9 });
}

/* ---------- 2: shape shifting ---------- */
function pw35Morph(v, e, t) {
  const ctx = v.ctx, GY = 150;
  pw35Sky(v, t, 40);
  const zap = v.seg(e, 0.35, 0.7), frog = e >= 0.7;
  // Pip waves the wand
  pw35Wiz(v, 0, 110, GY, t, { face: 1, mood: frog ? 'joy' : 'happy', sq: frog ? Math.max(0, Math.sin(t * 16)) * 0.12 : 0 });
  pw35Wand(v, 120, GY - 14, 16, -10 + Math.sin(e * 14) * 4, e < 0.75 ? 0.4 + 0.6 * Math.abs(Math.sin(t * 9)) : 0);
  if (e > 0.35 && e < 0.7) { ctx.strokeStyle = 'rgba(140,230,110,0.9)'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(136, GY - 24); ctx.lineTo(v.lerp(136, 200, zap), GY - 18); ctx.stroke(); ctx.setLineDash([]); }
  const bx = 204;
  if (!frog) pw35Wiz(v, 1, bx, GY, t, { face: -1, mood: e > 0.45 ? 'wow' : 'happy' });
  else {
    // the frog Bo (still in the hat), hopping
    const hp = v.hop(v.phase(e - 0.7, 0.7), 12), fy = GY + hp;
    v.shadow(bx, GY, 14);
    ctx.fillStyle = pw35C.frog; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.ellipse(bx, fy - 8, 15, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    for (const ex of [-6, 6]) { ctx.fillStyle = pw35C.frog; v.circle(bx + ex, fy - 17, 5); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; v.circle(bx + ex, fy - 17, 3); ctx.fill(); ctx.fillStyle = v.c.ink; v.circle(bx + ex - 0.8, fy - 17, 1.5); ctx.fill(); }
    ctx.strokeStyle = pw35C.frogDk; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bx, fy - 9, 6, 0.2, Math.PI - 0.2); ctx.stroke();
    pw35Hat(v, 1, bx, fy - 21, 0.8, t, 0.15);
    if (e > 0.85) v.bubble('Ribbit!', bx + 6, fy - 58, { size: 9 });
  }
  v.sparkle(bx, GY - 16, v.seg(e, 0.62, 1.0), '#b6f59a', 18);
  v.puff(bx, GY - 10, v.seg(e, 0.66, 1.0), 'rgba(170,240,150,0.9)');
}

/* ---------- 3: the Blot ---------- */
function pw35Blot(v, e, t) {
  const ctx = v.ctx, GY = 150, rise = v.ease.out(v.seg(e, 0, 0.6));
  pw35Sky(v, t, 80);
  ctx.fillStyle = 'rgba(20,14,40,0.35)'; ctx.fillRect(0, 0, v.W, v.H);
  // the ink monster: a wobbling blob with drips and one big eye
  const bx = 236, top = v.lerp(GY, 62, rise);
  ctx.fillStyle = pw35C.ink; ctx.beginPath(); ctx.moveTo(bx - 50, GY);
  for (let a = 0; a <= 20; a++) { const u = a / 20, ang = Math.PI + u * Math.PI, r = 50 + Math.sin(t * 5 + u * 9) * 5; ctx.lineTo(bx + Math.cos(ang) * r, GY - (GY - top) * Math.sin(u * Math.PI) - Math.sin(t * 4 + u * 7) * 4); }
  ctx.lineTo(bx + 50, GY); ctx.closePath(); ctx.fill();
  for (let n = 0; n < 3; n++) { const dx = bx - 30 + n * 28, dk = v.phase(t, 0.9, n * 0.3); ctx.beginPath(); ctx.ellipse(dx, GY + dk * 14, 3, 5, 0, 0, Math.PI * 2); ctx.fill(); }
  const hit = v.seg(e, 1.45, 1.6), ey = top + 30, eyeR = 11 * rise;
  if (rise > 0.2) {
    ctx.fillStyle = hit > 0 && e < 1.9 ? '#ffe14a' : '#fff'; v.circle(bx, ey, eyeR); ctx.fill();
    ctx.fillStyle = '#c02a6e'; v.circle(bx - 3, ey + 1, eyeR * 0.45); ctx.fill();
  }
  // an ink wave sloshes at Pip: the shield bubble holds it
  const wv = v.seg(e, 0.5, 1.1);
  if (wv > 0 && wv < 1) { ctx.fillStyle = pw35C.ink; ctx.beginPath(); ctx.ellipse(v.lerp(186, 108, wv), GY - 6, 14, 9 + Math.sin(t * 20) * 2, 0, 0, Math.PI * 2); ctx.fill(); }
  const shOn = e > 0.4 && e < 1.4;
  pw35Wiz(v, 0, 80, GY, t, { face: 1, mood: shOn ? 'grit' : 'happy' });
  if (shOn) { ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = pw35C.shield; v.circle(80, GY - 15, 22); ctx.fill(); ctx.globalAlpha = 0.9; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
  v.puff(110, GY - 8, v.seg(e, 1.08, 1.4), 'rgba(40,30,70,0.8)');
  // Bo on a step, zapping the eye
  ctx.fillStyle = pw35C.stoneDk; ctx.fillRect(126, GY - 26, 40, 26);
  pw35Wiz(v, 1, 146, GY - 26, t, { face: 1, mood: e > 1.6 ? 'joy' : 'grit' });
  pw35Wand(v, 154, GY - 40, 12, -8, e > 1.1 && e < 1.5 ? 1 : 0);
  const zk = v.seg(e, 1.15, 1.5);
  if (zk > 0 && zk < 1) { ctx.fillStyle = pw35C.zap; v.circle(v.lerp(166, bx, zk), v.lerp(GY - 48, ey, zk), 5); ctx.fill(); }
  v.sparkle(bx, ey, v.seg(e, 1.5, 2.0), '#fff3c0', 18);
  if (e > 1.6) v.label('Zap!', bx, ey - 26, 14, v.c.gold);
}

/* ---------- 4: graduation ---------- */
function pw35Grad(v, e, t) {
  const ctx = v.ctx, GY = 150;
  pw35Sky(v, t, 120);
  const toss = v.seg(e, 0.3, 1.6), up = toss > 0;
  const hatY = id => (up ? GY - 26 + v.hop(toss, 92) : GY - 26), hatX = id => (id ? 182 - toss * 18 : 138 + toss * 18);
  pw35Wiz(v, 0, 130, GY + (up ? v.hop(v.phase(e, 0.5), 7) : 0), t, { face: 1, mood: up ? 'joy' : 'happy', hat: false });
  pw35Wiz(v, 1, 190, GY + (up ? v.hop(v.phase(e, 0.5, 0.25), 7) : 0), t, { face: -1, mood: up ? 'joy' : 'happy', hat: false });
  for (const id of [0, 1]) pw35Hat(v, id, hatX(id), hatY(id), 1, t, up ? toss * 9 * (id ? -1 : 1) : 0);
  v.confetti(160, 60, v.seg(e, 0.9, 2.2), 22);
  for (const [sx, sy, o] of [[90, 60, 0], [230, 54, 0.3], [160, 34, 0.6]]) v.sparkle(sx, sy, v.phase(t, 0.8, o), '#fff3c0', 6);
  if (e > 1.0) { const lk = v.seg(e, 1.0, 1.25); v.label('Graduates!', 160, 112 - v.ease.out(lk) * 6, 16 * (0.6 + 0.4 * v.ease.back(lk)), v.c.gold); }
}

function pw35Scene(v, t) {
  const ctx = v.ctx, si = t < 2.2 ? 0 : t < 4.4 ? 1 : t < 6.6 ? 2 : 3, sc = PW35_SCENES[si], e = t - sc.t0;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, v.W, v.H); ctx.clip();
  [pw35Broom, pw35Morph, pw35Blot, pw35Grad][si](v, e, t);
  // the lesson's name, bottom left (the menus put their badges on the top corners)
  const tw = 12 + sc.name.length * 5;
  ctx.fillStyle = 'rgba(28,26,54,0.8)'; v.rr(6, 159, tw, 16, 8); ctx.fill();
  v.text(sc.name, 12, 167.5, 9, '#fff', 'left', true);
  // a soft fade between the lessons
  const f = Math.max(1 - v.seg(e, 0, 0.18), v.seg(e, sc.len - 0.15, sc.len));
  if (f > 0) { ctx.fillStyle = `rgba(28,22,60,${f * 0.85})`; ctx.fillRect(0, 0, v.W, v.H); }
  ctx.restore();
}

definePreview('Moonwick Academy', {
  blurb: 'A whole school day of magic lessons, the Blot at the final exam, and a graduation duel!',
  loop: 8.8, still: 5.7,
  draw(v, t) { pw35Scene(v, t); },
});
