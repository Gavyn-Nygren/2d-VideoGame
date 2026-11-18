/* Pip & Bo - World page previews: World 41 Pop-Up Storybook (41-1 Carry It Together). See js/previews/preview-core.js. */
'use strict';

/* 41-1 Carry It Together, drawn flat in the storybook's own colours (the level itself is 3D; a preview never loads it).
   A 6 s loop on one open page:
     0.0 - 2.0  the hedge garden: Pip and Bo carry the giant pencil along a hedge path to the river's edge
     2.0 - 3.6  the point dips onto a dotted line on the bank and draws it, dot by dot
     3.6 - 4.4  a paper bridge folds up across the water, plank by plank (each springs up with a wobble)
     4.4 - 6.0  over the bridge together; the Bookworm cheers from the margin
   A pure function of t. Every helper starts with pw41. */
const PW41 = { cream: '#f6efdf', rule: 'rgba(80,90,140,0.13)', ink: '#2b2130', hedge: '#5f8f4a', hedgeHi: '#86b56a', water: '#a9d6ea', gold: '#ffc53d' };

// the open book: two cream pages, a gutter shadow, faint rules, page numbers
function pw41Book(v) {
  const c = v.ctx, W = v.W, H = v.H;
  c.fillStyle = '#6b4a34'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) { c.fillStyle = 'rgba(40,24,14,0.18)'; c.fillRect(0, i * 22 + 6, W, 2); }
  c.fillStyle = '#e8dcc0'; v.rr(8, 10, W - 16, H - 16, 6); c.fill();
  c.fillStyle = PW41.cream; v.rr(10, 8, W - 20, H - 18, 5); c.fill();
  c.strokeStyle = PW41.rule; c.lineWidth = 1;
  for (let y = 26; y < H - 14; y += 11) { c.beginPath(); c.moveTo(18, y); c.lineTo(W - 18, y); c.stroke(); }
  const g = c.createLinearGradient(W / 2 - 14, 0, W / 2 + 14, 0);
  g.addColorStop(0, 'rgba(90,60,30,0)'); g.addColorStop(0.5, 'rgba(90,60,30,0.28)'); g.addColorStop(1, 'rgba(90,60,30,0)');
  c.fillStyle = g; c.fillRect(W / 2 - 14, 8, 28, H - 18);
  v.text('5', 20, H - 16, 8, 'rgba(43,33,48,0.5)', 'left'); v.text('6', W - 20, H - 16, 8, 'rgba(43,33,48,0.5)', 'right');
}
// a pop-up hedge card: a rounded green strip with a scalloped top and a darker base
function pw41Hedge(v, x, y, w, h) {
  const c = v.ctx;
  c.fillStyle = 'rgba(40,30,20,0.18)'; c.fillRect(x + 2, y + h - 2, w, 4);
  c.fillStyle = PW41.hedge; v.rr(x, y, w, h, 3); c.fill();
  c.fillStyle = PW41.hedgeHi;
  for (let k = 0; k < w - 4; k += 7) { c.beginPath(); c.arc(x + 4 + k, y + 2, 3.6, Math.PI, 0); c.fill(); }
  c.strokeStyle = PW41.ink; c.lineWidth = 1.2; v.rr(x, y, w, h, 3); c.stroke();
  c.fillStyle = 'rgba(30,60,30,0.3)'; c.fillRect(x + 1, y + h - 4, w - 2, 3);
}
// the giant pencil from (x0, y0) (eraser) to (x1, y1) (point)
function pw41Pencil(v, x0, y0, x1, y1) {
  const c = v.ctx, a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0);
  c.save(); c.translate(x0, y0); c.rotate(a);
  c.fillStyle = 'rgba(40,30,20,0.18)'; c.fillRect(4, 9, L - 6, 3);
  c.fillStyle = '#ef8fa0'; v.rr(-2, -3.5, 6, 7, 2); c.fill();
  c.fillStyle = '#d9a640'; c.fillRect(3, -3.6, 5, 7.2);
  c.fillStyle = '#f6c21c'; c.fillRect(8, -3.5, L - 18, 7);
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(8, -3.5, L - 18, 2);
  c.fillStyle = '#e2b07a'; c.beginPath(); c.moveTo(L - 10, -3.5); c.lineTo(L - 1, -0.6); c.lineTo(L - 1, 0.6); c.lineTo(L - 10, 3.5); c.fill();
  c.fillStyle = '#3a3742'; c.beginPath(); c.moveTo(L - 3, -1); c.lineTo(L + 1, 0); c.lineTo(L - 3, 1); c.fill();
  c.strokeStyle = PW41.ink; c.lineWidth = 1; c.strokeRect(3, -3.6, L - 13, 7.2);
  c.restore();
}
// the Bookworm: green segments, round glasses, a mortarboard
function pw41Worm(v, x, y, k) {
  const c = v.ctx;
  for (let i = 4; i >= 0; i--) {
    const bob = Math.sin(k * 10 + i) * 1.5;
    c.fillStyle = i % 2 ? '#8ccf74' : '#7cc46a'; v.circle(x - i * 6, y + bob - (i === 0 ? 4 : 0), i === 0 ? 7 : 5.5); c.fill();
    c.strokeStyle = PW41.ink; c.lineWidth = 1.1; c.stroke();
  }
  c.strokeStyle = PW41.ink; c.lineWidth = 1; c.fillStyle = 'rgba(255,255,255,0.7)';
  v.circle(x - 2.5, y - 5, 2.4); c.fill(); c.stroke(); v.circle(x + 2.5, y - 5, 2.4); c.fill(); c.stroke();
  c.fillStyle = PW41.ink; c.fillRect(x - 6, y - 13, 12, 2.5); c.fillRect(x - 3, y - 13, 6, 3.5);
  c.strokeStyle = PW41.gold; c.beginPath(); c.moveTo(x + 5, y - 12); c.lineTo(x + 7, y - 7); c.stroke();
}

definePreview('Carry It Together', {
  blurb: 'Carry the giant pencil together and draw your own way: trace the dots and a bridge pops up.',
  loop: 6,
  still: 3.2,
  draw(v, t) {
    const c = v.ctx, W = v.W;
    pw41Book(v);
    // the river across the right page, printed under blue tissue
    const rx0 = 176, rx1 = 236;
    c.fillStyle = PW41.water; c.fillRect(rx0, 12, rx1 - rx0, v.H - 22);
    c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) { const y = 20 + i * 17 + Math.sin(t * 2 + i) * 2, x = rx0 + 8 + (i * 13) % 40; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 6, y - 3, x + 12, y); c.stroke(); }
    c.fillStyle = 'rgba(30,70,110,0.18)'; c.fillRect(rx0, 12, 4, v.H - 22); c.fillRect(rx1 - 4, 12, 4, v.H - 22);
    // the hedge path on the left page and the far bank's hedges
    pw41Hedge(v, 18, 62, 150, 12); pw41Hedge(v, 18, 126, 150, 12);
    pw41Hedge(v, 244, 62, 60, 12); pw41Hedge(v, 244, 126, 60, 12);
    // a printed flower or two
    for (const [fx, fy, col] of [[40, 40], [92, 30], [140, 46], [270, 34], [292, 152], [60, 156]].map((p, i) => [...p, ['#e86a8a', '#f2c14e', '#7fb0e0'][i % 3]])) { c.fillStyle = col; v.circle(fx, fy, 2.4); c.fill(); c.fillStyle = '#fff6c0'; v.circle(fx, fy, 0.9); c.fill(); }
    // the dotted line on the near bank (the point inks it as it passes), then the bridge it draws across the water
    const lx0 = 104, lx1 = 168, by = 100, dotY = by + 10, gap = 54, drawK = v.seg(t, 2.0, 3.6), popT = t - 3.6;
    let bx;
    if (t < 2.0) bx = 76 + v.ease.inOut(v.seg(t, 0, 2.0)) * (lx0 - 12 - 76);
    else if (t < 3.6) bx = lx0 - 12 + (lx1 - lx0) * drawK;
    else if (t < 4.4) bx = lx1 - 12;
    else bx = lx1 - 12 + v.ease.inOut(v.seg(t, 4.4, 6.0)) * 140;
    const drawing = t >= 2.0 && t < 3.6, crossing = t >= 4.4, pointX = bx + 12;
    const dots = 10, inkTo = t < 2.0 ? lx0 - 1 : Math.min(lx1, pointX);
    if (t < 3.9) {
      c.globalAlpha = t < 3.6 ? 1 : 1 - (t - 3.6) / 0.3;
      if (inkTo > lx0) { c.strokeStyle = PW41.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(lx0, dotY); c.lineTo(inkTo, dotY); c.stroke(); }
      for (let i = 0; i <= dots; i++) { const x = lx0 + (lx1 - lx0) * i / dots; c.fillStyle = x <= inkTo ? PW41.ink : 'rgba(43,33,48,0.45)'; v.circle(x, dotY, x <= inkTo ? 1.8 : 1.3); c.fill(); }
      c.globalAlpha = 1;
    }
    // the bridge: planks spring up one after another across the river, each with a little overshoot
    if (popT > 0) {
      const n = 8, x0 = rx0 - 8, pw = (rx1 - rx0 + 16) / n;
      c.fillStyle = 'rgba(40,30,20,0.22)'; c.fillRect(x0, by + 20, pw * n * Math.min(1, popT / 0.6), 4);
      for (let i = 0; i < n; i++) {
        const k = clamp((popT - i * 0.07) / 0.35, 0, 1); if (k <= 0) continue;
        const sp = k >= 1 ? 1 : 1 + Math.sin(k * Math.PI * 1.5) * (1 - k) * 0.35 - Math.pow(1 - k, 3);
        const hh = 18 * sp, x = x0 + i * pw, y0 = by + 11 - hh / 2;
        c.fillStyle = i % 2 ? '#d7b386' : '#c9a170'; c.fillRect(x, y0, pw - 1, hh);
        c.strokeStyle = PW41.ink; c.lineWidth = 0.9; c.strokeRect(x, y0, pw - 1, hh);
        c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x + 1, y0 + 1, pw - 3, 2);
        if (k < 1) v.sparkle(x + pw / 2, by - 12, k);
      }
    }
    // Pip (the eraser end, behind) and Bo (the point, in front): the pencil is always the same length
    const walkK = t < 2.0 || crossing ? 1 : drawing ? 0.6 : 0, step = Math.abs(Math.sin(t * 9)) * 2 * walkK;
    const px = bx - gap;
    v.shadow(px, by + 13, 14); v.shadow(bx, by + 13, 14);
    v.hero(0, px, by + 12 - step, { s: 0.55, face: 1, mood: crossing ? 'joy' : 'grit' });
    v.hero(1, bx, by + 12 - (walkK ? 2 * walkK - step : 0), { s: 0.55, face: 1, mood: popT > 0 && popT < 0.8 ? 'wow' : crossing ? 'joy' : 'grit' });
    pw41Pencil(v, px + 2, by + 2, pointX, drawing ? dotY - 1 : by + 3);
    if (drawing) v.label('Trace the dots!', 136, 86, 9, PW41.gold);
    // the Bookworm in the margin, cheering once the bridge is up
    const cheer = v.seg(t, 4.0, 4.6);
    pw41Worm(v, W - 34, 30 - cheer * 4 + Math.sin(t * 6) * cheer * 2, t);
    if (t > 3.8 && t < 5.6) v.bubble('A bridge!', W - 70, 22, { size: 8 });
    // the pages' running head
    v.pill('Page 2: The Folded Bridges', 92, 16, { size: 7, bg: 'rgba(43,33,48,0.75)' });
  },
});
