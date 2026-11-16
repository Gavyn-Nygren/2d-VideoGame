/* Pip & Bo - Level previews for World 5 (see js/previews/preview-core.js for how to write one). */
'use strict';

/* Each level of Road Trip paints itself in its own colours (def.theme in level-list.js), so a preview lays that theme
   over the world's for the length of one frame (pw5Themed). Every top-level helper starts with pw5. */
function pw5Themed(v, theme, fn) {
  const c0 = v.c;
  v.c = Object.assign({}, c0, theme);
  try { fn(); } finally { v.c = c0; }
}
// a soft loop seam: the whole frame fades through col (a = 0..1)
function pw5Veil(v, a, col) {
  if (a <= 0) return;
  v.ctx.save(); v.ctx.globalAlpha = Math.min(1, a); v.ctx.fillStyle = col; v.ctx.fillRect(0, 0, v.W, v.H); v.ctx.restore();
}

/* ---------- 5-1 Two-Seat Car ---------- */
// the toy car from above (js/levels/world5/two-seat-car.js carDrawCar), centre (x, y), heading a.
// o: s, wheel (front wheel turn), brake, joy (0..1 head hop), alpha
function pw5Car(v, x, y, a, o) {
  const ctx = v.ctx, s = o.s || 1, ink = v.c.ink;
  ctx.save(); ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
  ctx.save(); ctx.translate(x + 2, y + 4); ctx.rotate(a); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(28,26,54,0.24)'; v.rr(-25, -15, 50, 30, 11); ctx.fill();
  ctx.restore();
  ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
  ctx.fillStyle = ink;
  for (const [wx, wy, front] of [[15, -15, 1], [15, 15, 1], [-15, -15, 0], [-15, 15, 0]]) {
    ctx.save(); ctx.translate(wx, wy); if (front) ctx.rotate(o.wheel || 0); v.rr(-5, -3, 10, 6, 2); ctx.fill(); ctx.restore();
  }
  ctx.fillStyle = '#ffd77a'; v.rr(-24, -15, 48, 30, 10); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; v.rr(-20, -12, 40, 6, 3); ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = 2.5; v.rr(-24, -15, 48, 30, 10); ctx.stroke();
  ctx.fillStyle = '#ffffff'; v.rr(13, -2.5, 9, 5, 2); ctx.fill();
  ctx.fillStyle = '#bfe9ff'; v.rr(8.5, -11.5, 4.5, 23, 2); ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.stroke();
  v.fillCircle(21.5, -9.5, 2.6, '#fffbe0'); v.fillCircle(21.5, 9.5, 2.6, '#fffbe0');
  ctx.fillStyle = o.brake ? '#ff3030' : '#a8333f'; v.rr(-24.5, -12, 3, 5, 1); ctx.fill(); v.rr(-24.5, 7, 3, 5, 1); ctx.fill();
  if (o.brake) { v.fillCircle(-27, -9.5, 6, 'rgba(255,60,60,0.35)'); v.fillCircle(-27, 9.5, 6, 'rgba(255,60,60,0.35)'); }
  // Pip's steering wheel, in front of Pip's seat (left of the heading)
  ctx.strokeStyle = ink; ctx.lineWidth = 2; v.circle(4, -7.5, 4.6); ctx.stroke();
  ctx.save(); ctx.translate(4, -7.5); ctx.rotate((o.wheel || 0) * 2); ctx.beginPath(); ctx.moveTo(0, -4.6); ctx.lineTo(0, 4.6); ctx.stroke(); ctx.restore();
  for (const id of [0, 1]) {
    const hs = 1 + 0.3 * (o.joy || 0) * Math.abs(Math.sin((o.joyT || 0) * 9 + id * 1.6));
    ctx.save(); ctx.translate(-5, id ? 7.5 : -7.5); ctx.scale(hs, hs);
    if (id === 0) { ctx.fillStyle = v.c.grassDark; ctx.beginPath(); ctx.ellipse(-7.5, -1.5, 4, 2, -0.5, 0, Math.PI * 2); ctx.fill(); }
    else { v.fillCircle(-3, -6, 2.8, v.c.boDark); v.fillCircle(-3, 6, 2.8, v.c.boDark); }
    ctx.fillStyle = id ? v.c.bo : v.c.pip; v.circle(0, 0, 7); ctx.fill();
    ctx.strokeStyle = id ? v.c.boDark : v.c.pipDark; ctx.lineWidth = 1.2; ctx.stroke();
    if (o.joy > 0.5) {
      ctx.strokeStyle = ink; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
      for (const ey of [-2.6, 2.6]) { ctx.beginPath(); ctx.arc(4.6, ey, 1.8, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke(); }
    } else {
      v.fillCircle(3.6, -2.6, 2.1, '#fff'); v.fillCircle(3.6, 2.6, 2.1, '#fff');
      v.fillCircle(4.4, -2.6, 1.1, ink); v.fillCircle(4.4, 2.6, 1.1, ink);
    }
    ctx.restore();
  }
  ctx.restore();
}
// a duck seen from above, walking toward (fx, fy); r 8 = the mother (white), 6 = a duckling (yellow)
function pw5Duck(v, x, y, r, fx, fy) {
  const ctx = v.ctx;
  ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.beginPath(); ctx.ellipse(x + 1, y + r * 0.7, r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  v.fillCircle(x, y, r, r > 7 ? '#ffffff' : '#ffe066');
  ctx.strokeStyle = 'rgba(28,26,54,0.3)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#ffb02e'; ctx.beginPath();
  ctx.moveTo(x + fx * (r + 4), y + fy * (r + 4)); ctx.lineTo(x + fx * (r - 1) - fy * 3, y + fy * (r - 1) + fx * 3); ctx.lineTo(x + fx * (r - 1) + fy * 3, y + fy * (r - 1) - fx * 3); ctx.fill();
  v.fillCircle(x + fx * r * 0.4 - fy * r * 0.45, y + fy * r * 0.4 + fx * r * 0.45, 1.2, v.c.ink);
  v.fillCircle(x + fx * r * 0.4 + fy * r * 0.45, y + fy * r * 0.4 - fx * r * 0.45, 1.2, v.c.ink);
}
// who does what: Pip's wheel and Bo's pedals, like the level's role pill; hiP / hiB (0..1) ring the one at work
function pw5Roles(v, x, y, hiP, hiB) {
  const ctx = v.ctx;
  ctx.fillStyle = 'rgba(28,26,54,0.8)'; v.rr(x, y, 104, 26, 13); ctx.fill();
  for (const id of [0, 1]) {
    const cx = x + 14 + id * 50, cy = y + 13, hi = id ? hiB : hiP;
    if (hi > 0) { ctx.save(); ctx.globalAlpha *= hi; ctx.strokeStyle = v.c.gold; ctx.lineWidth = 3; v.circle(cx, cy, 12); ctx.stroke(); ctx.restore(); }
    v.fillCircle(cx, cy, 9.5, id ? v.c.bo : v.c.pip);
    if (id === 0) { // a wheel
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; v.circle(cx, cy, 5.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 5.5, cy); ctx.lineTo(cx + 5.5, cy); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + 5.5); ctx.stroke();
    } else { // go (up) and brake (down)
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx + 5, cy - 1); ctx.lineTo(cx - 5, cy - 1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx, cy + 7); ctx.lineTo(cx + 5, cy + 1); ctx.lineTo(cx - 5, cy + 1); ctx.closePath(); ctx.fill();
    }
    v.text(id ? 'Bo' : 'Pip', cx + 13, cy + 0.5, 12, id ? '#8fb6ff' : '#ff9a80', 'left', true);
  }
}

// Pip steers round the corner, Bo does gas and brake (and waits for the ducks), and they park in the box
definePreview('Two-Seat Car', {
  blurb: 'One of you steers, the other does gas and brake. Park in the box!',
  loop: 7, still: 4.75,
  draw(v, t) {
    pw5Themed(v, { grass: '#8fe3b0', grassDark: '#55ad80' }, () => {
      const ctx = v.ctx, k = t / 7, CS = 1.3;
      // grass with a few flowers, a pond at the top, hedges along the edges
      ctx.fillStyle = v.c.grass; ctx.fillRect(0, 0, v.W, v.H);
      ctx.fillStyle = 'rgba(85,173,128,0.35)';
      for (let i = 0; i < 26; i++) { v.circle(v.rand(i * 3 + 1) * v.W, v.rand(i * 3 + 2) * v.H, 1.6 + (i % 2)); ctx.fill(); }
      for (const [fx, fy, col] of [[30, 112, '#ffc0de'], [150, 128, '#fff6d8'], [112, 166, '#ffc0de'], [304, 112, '#fff6d8']]) {
        ctx.fillStyle = col;
        for (let i = 0; i < 5; i++) { const a = i * 1.2566; v.circle(fx + Math.cos(a) * 2.8, fy + Math.sin(a) * 2.8, 2); ctx.fill(); }
        v.fillCircle(fx, fy, 1.6, v.c.gold);
      }
      ctx.fillStyle = '#4aa6d6'; ctx.beginPath(); ctx.ellipse(198, 2, 50, 22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#69c3f0'; ctx.beginPath(); ctx.ellipse(198, 0, 45, 18, 0, 0, Math.PI * 2); ctx.fill();
      for (const [bx, by, r] of [[10, 4, 14], [36, -2, 13], [62, 6, 12], [292, 4, 13], [318, 10, 14], [8, 150, 13], [-2, 176, 14], [172, 186, 14], [196, 178, 11]]) {
        v.fillCircle(bx, by, r + 2, '#3d8a5c'); v.fillCircle(bx, by, r, '#4fa36f'); v.fillCircle(bx - r * 0.35, by - r * 0.35, r * 0.4, 'rgba(255,255,255,0.13)');
      }
      // the road: right along the top, then down to the parking box
      const top = 30, bot = 84, xl = 226, xr = 280, R = 20;
      const road = inset => {
        ctx.beginPath(); ctx.moveTo(-10, top + inset); ctx.lineTo(xr - R, top + inset);
        ctx.arcTo(xr - inset, top + inset, xr - inset, top + R, R - inset); ctx.lineTo(xr - inset, v.H + 10);
        ctx.lineTo(xl + inset, v.H + 10); ctx.lineTo(xl + inset, bot - inset); ctx.lineTo(-10, bot - inset); ctx.closePath();
      };
      road(0); ctx.fillStyle = '#5a5675'; ctx.fill();
      road(3); ctx.fillStyle = '#6c6889'; ctx.fill();
      road(6); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.stroke();
      // the parking box: dashed outline and a P, gold once they park
      const parked = v.seg(k, 0.8, 0.84) * (1 - v.seg(k, 0.94, 0.99));
      const bx0 = xl + 5, by0 = 104, bw = xr - xl - 10, bh = 70;
      ctx.fillStyle = 'rgba(255,197,61,' + (0.25 + 0.35 * parked).toFixed(3) + ')'; ctx.fillRect(bx0, by0, bw, bh);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.strokeRect(bx0, by0, bw, bh); ctx.setLineDash([]);
      v.label('P', xl + 27, by0 + 50, 18, v.c.gold);
      // the car's trip: s = distance along the road (straight 177, quarter turn 47, down 56)
      const s = k < 0.27 ? 90 * v.ease.inOut(v.seg(k, 0.06, 0.27)) : 90 + 190 * v.ease.inOut(v.seg(k, 0.52, 0.8));
      let cx, cy, ca;
      if (s < 177) { cx = 46 + s; cy = 57; ca = 0; }
      else if (s < 224) { const p = (s - 177) / 30; cx = 223 + 30 * Math.sin(p); cy = 87 - 30 * Math.cos(p); ca = p; }
      else { cx = 253; cy = 87 + (s - 224); ca = Math.PI / 2; }
      const turning = s > 150 && s < 230, wheel = 0.5 * v.seg(s, 150, 172) * (1 - v.seg(s, 212, 228));
      const braking = (k > 0.19 && k < 0.5) || (k > 0.72 && k < 0.84);
      const going = (k > 0.03 && k < 0.18) || (k > 0.5 && k < 0.66);
      // the ducks cross while the car waits
      const dk = v.seg(k, 0.16, 0.66), duckY = v.lerp(-20, 200, dk);
      if (dk > 0 && dk < 1) for (let i = 2; i >= 0; i--) pw5Duck(v, 198 + Math.sin(t * 12 + i * 1.7) * 1.2, duckY - i * 15, i ? 6 : 8, 0, 1);
      const fade = k < 0.03 ? v.seg(k, 0, 0.03) : 1 - v.seg(k, 0.94, 0.99);
      const joy = v.seg(k, 0.82, 0.84) * (k < 0.94 ? 1 : 0);
      pw5Car(v, cx, cy, ca, { s: CS, wheel, brake: braking, joy, joyT: t, alpha: fade });
      if (k > 0.3 && k < 0.44) v.bubble('quack!', 206, duckY - 9);
      if (k > 0.02 && k < 0.13) v.bubble('Go!', cx - 6, cy - 24);
      pw5Roles(v, 10, 144, turning ? 0.6 + 0.4 * Math.sin(t * 12) : 0, going || braking ? 0.6 + 0.4 * Math.sin(t * 12) : 0);
      if (joy > 0) {
        v.label('PARKED!', 150, 116, 18, v.c.gold);
        v.star(253, 98 - 6 * Math.sin(t * 5), 8 * joy);
        v.confetti(253, 130, v.seg(k, 0.82, 0.98));
      }
    });
  },
});

/* ---------- 5-2 Pizza Delivery ---------- */
const pw5PizzaTheme = { skyTop: '#8fd3f0', skyBot: '#fff1d6', hillFar: '#bcd9e6', hillNear: '#a5c4d6',
  stone: '#5b5873', stoneLight: '#68657f', stoneEdge: '#3f3d55', grass: '#d9d2c3', grassDark: '#a69e8e', plank: '#c98b5a', plankDark: '#8a5833' };
// a closed pizza box (pzBoxShape), centre (x, y), turned rot
function pw5PizzaBox(v, x, y, rot, sc = 1) {
  const ctx = v.ctx;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
  ctx.fillStyle = '#f4e4c1'; v.rr(-20, -5, 40, 10, 2); ctx.fill();
  ctx.strokeStyle = '#c49a5a'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#e4572e'; ctx.fillRect(-18.5, -1, 37, 3);
  ctx.fillStyle = '#ffcf5a'; ctx.beginPath(); ctx.moveTo(-4, -3.5); ctx.lineTo(4, -3.5); ctx.lineTo(0, 3.5); ctx.closePath(); ctx.fill();
  v.fillCircle(0, -1.5, 1.2, '#e2452b');
  ctx.restore();
}

// they carry the tray up a hill (Pip raises the back, Bo lowers the front), over the top, down the other side where
// the stack slides toward Bo until Bo raises his end, and deliver to number 12
definePreview('Pizza Delivery', {
  blurb: 'Keep the tray level up and down the hills: raise your end, lower your end!',
  loop: 9, still: 2.2,
  draw(v, t) {
    pw5Themed(v, pw5PizzaTheme, () => {
      const ctx = v.ctx, k = t / 9, SPAN = 80, base = 150;
      // the street's heights (world x): up a hill, a flat top, down again to the house
      const cosr = (x, a, b, d) => (x <= a ? 0 : x >= b ? d : d * (1 - Math.cos(Math.PI * (x - a) / (b - a))) / 2);
      const gy = x => base - cosr(x, 150, 330, 38) + cosr(x, 410, 560, 38);
      // the pair's middle: walks up, pauses on the slide, walks to the door
      const MX = k < 0.06 ? 80 : k < 0.5 ? v.lerp(80, 470, v.ease.inOut(v.seg(k, 0.06, 0.5))) : k < 0.6 ? 470 + 20 * v.ease.out(v.seg(k, 0.5, 0.6))
        : v.lerp(490, 640, v.ease.inOut(v.seg(k, 0.62, 0.74)));
      const walking = (k > 0.07 && k < 0.49) || (k > 0.63 && k < 0.73);
      const cam = Math.max(0, Math.min(MX - 150, 720 - v.W));
      v.sky(); v.sun(270, 30, 14);
      v.cloud(40 + Math.sin(k * Math.PI * 2) * 6 - cam * 0.05, 26, 0.8); v.cloud(190 - Math.sin(k * Math.PI * 2) * 5 - cam * 0.05, 18, 0.6);
      // far rooftops (parallax)
      ctx.fillStyle = '#b9d3e2';
      for (let b = 0; b < 12; b++) { const x = b * 46 - cam * 0.4, h = 20 + (b * 37 % 23); ctx.fillRect(x, 96 - h, 40, h + 60); }
      ctx.fillStyle = 'rgba(255,241,214,0.4)'; ctx.fillRect(0, 50, v.W, 100);
      // houses up the hillside, each on the ground under it
      const facades = ['#f2c9b6', '#cfe3c8', '#f4e2ad', '#cbd7ec', '#ebcadf', '#e8d7bf', '#c3e2dc', '#d8cdea'], roofs = ['#b8664e', '#7d6a9e', '#4f7f80', '#a5694f'];
      const shut = ['#4f7f80', '#c0583c', '#5b7bb5', '#8a6fb0'];
      ctx.save(); ctx.translate(-cam, 0);
      for (let b = 0; b < 8; b++) {
        const x = b * 74 - 10, w = 68, g = Math.min(gy(x), gy(x + w)), topY = g - 62 - (b % 3) * 10;
        ctx.fillStyle = facades[b]; ctx.fillRect(x, topY, w, base + 40 - topY);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2, topY, w + 4, 3);
        ctx.fillStyle = roofs[b % 4]; ctx.beginPath(); ctx.moveTo(x - 4, topY + 1); ctx.lineTo(x + 10, topY - 14); ctx.lineTo(x + w - 10, topY - 14); ctx.lineTo(x + w + 4, topY + 1); ctx.closePath(); ctx.fill();
        for (let c = 0; c < 2; c++) for (let r = 0; r < 2; r++) {
          const wx = x + 12 + c * 30, wy = topY + 8 + r * 24;
          if (wy + 16 > gy(wx) - 26) continue;
          ctx.fillStyle = shut[b % 4]; ctx.fillRect(wx - 4, wy, 3, 16); ctx.fillRect(wx + 15, wy, 3, 16);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(wx - 1, wy - 1, 16, 18); ctx.fillStyle = '#cfe6f3'; ctx.fillRect(wx, wy, 14, 16);
        }
      }
      // number 12 at the end, with the customer at the window
      const door = 640, open = v.seg(k, 0.76, 0.79) * (1 - v.seg(k, 0.95, 0.99));
      ctx.fillStyle = '#ffd6a5'; ctx.fillRect(door - 50, 50, 110, base - 50);
      ctx.fillStyle = '#c0583c'; ctx.beginPath(); ctx.moveTo(door - 58, 52); ctx.lineTo(door + 5, 18); ctx.lineTo(door + 68, 52); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(door - 32, 60, 34, 26); ctx.fillStyle = '#ffe9a8'; ctx.fillRect(door - 30, 62, 30, 22);
      const bob = open > 0 ? Math.sin(t * 10) * 2 : Math.sin(t * 2);
      v.fillCircle(door - 15, 78 + bob, 7, '#b48cff'); v.fillCircle(door - 18, 76 + bob, 1.3, v.c.ink); v.fillCircle(door - 12, 76 + bob, 1.3, v.c.ink);
      ctx.fillStyle = '#5a3a20'; v.rr(door - 17, base - 42, 34, 42, 6); ctx.fill();
      ctx.fillStyle = open > 0 ? v.c.doorIn : '#8a5833'; v.rr(door - 14, base - 39, 28, 39, 5); ctx.fill();
      if (open > 0) { ctx.save(); ctx.translate(door + 4, base - 22); ctx.rotate(Math.sin(t * 14) * 0.5); v.fillCircle(0, -7, 5, '#f2c29b'); ctx.restore(); }
      ctx.fillStyle = '#fff8ea'; v.rr(door - 11, base - 57, 22, 13, 4); ctx.fill();
      v.text('12', door, base - 50, 10, v.c.ink, 'center', true);
      // the pavement and the stone wall under it
      ctx.beginPath(); ctx.moveTo(cam - 10, v.H);
      for (let x = cam - 10; x <= cam + v.W + 10; x += 4) ctx.lineTo(x, gy(x));
      ctx.lineTo(cam + v.W + 10, v.H); ctx.closePath();
      ctx.fillStyle = '#c4ad92'; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = 'rgba(90,60,40,0.16)';
      for (let y = 100, r = 0; y < v.H; y += 12, r++) { ctx.fillRect(cam - 10, y, v.W + 20, 1); for (let x = Math.floor(cam / 26) * 26 + (r % 2) * 13; x < cam + v.W; x += 26) ctx.fillRect(x, y, 1, 12); }
      ctx.restore();
      ctx.strokeStyle = '#e3d8c4'; ctx.lineWidth = 5; ctx.beginPath();
      for (let x = cam - 10; x <= cam + v.W + 10; x += 4) { if (x === cam - 10) ctx.moveTo(x, gy(x) + 2); else ctx.lineTo(x, gy(x) + 2); }
      ctx.stroke();
      // the pair: hands keep the tray level; on the way down Bo is late and the stack slides his way
      const xs = [MX - SPAN / 2, MX + SPAN / 2], feet = xs.map(x => gy(x));
      const step = id => (walking ? v.hop(v.phase(t, 0.34, id * 0.17), 2.5) : 0);
      const mean = (feet[0] + feet[1]) / 2 - 34;
      const late = v.seg(k, 0.44, 0.5) * (1 - v.ease.inOut(v.seg(k, 0.52, 0.6)));   // Bo's end hangs low for a moment
      const hand = [mean, mean + late * 14];
      const slide = v.seg(k, 0.46, 0.53) * (1 - v.ease.inOut(v.seg(k, 0.55, 0.64)));
      const joy = k > 0.86 && k < 0.95;
      ctx.lineCap = 'round';
      for (const id of [0, 1]) {
        const x = xs[id], ft = feet[id] + step(id) + (joy ? v.hop(v.phase(t, 0.5, id * 0.25), 6) : 0);
        const lift = hand[id] - (feet[id] - 34);            // + lowered, - raised
        const sq = Math.max(0, lift) / 30;
        v.hero(id, x, ft, { face: 1, sq, mood: joy ? 'joy' : slide > 0.3 ? 'wow' : lift < -6 ? 'grit' : 'happy' });
        const topY = ft - 24 * (1 - sq * 0.3);
        ctx.strokeStyle = id ? v.c.boDark : v.c.pipDark; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x - 7, topY + 7); ctx.lineTo(x - 3, hand[id]); ctx.moveTo(x + 7, topY + 7); ctx.lineTo(x + 5, hand[id]); ctx.stroke();
        v.fillCircle(x - 3, hand[id], 3, id ? v.c.bo : v.c.pip); v.fillCircle(x + 5, hand[id], 3, id ? v.c.bo : v.c.pip);
        // raise / lower hints over their heads while they work the hill
        if (k > 0.12 && k < 0.4 && Math.abs(lift) > 6) v.label(lift < 0 ? '▲' : '▼', x, ft - 52, 12, id ? v.c.bo : v.c.pip);
      }
      const a = Math.atan2(hand[1] - hand[0], SPAN);
      ctx.save(); ctx.translate(MX, (hand[0] + hand[1]) / 2); ctx.rotate(a);
      ctx.fillStyle = v.c.plankDark; v.rr(-SPAN / 2 - 9, -6, SPAN + 18, 6, 2); ctx.fill();
      ctx.fillStyle = v.c.plank; v.rr(-SPAN / 2 - 9, -6, SPAN + 18, 4, 2); ctx.fill();
      ctx.fillStyle = '#2f3142'; v.rr(-9, -5, 18, 5, 2.5); ctx.fill();
      ctx.fillStyle = late > 0.2 ? '#ffd23f' : '#9fe870'; v.rr(-8, -4.3, 16, 3.6, 1.8); ctx.fill();
      v.fillCircle(-a * 40, -2.5, 1.8, '#ffffff');
      // the stack: 4 boxes, sheared toward Bo while it slides
      const delivered = Math.floor(v.seg(k, 0.76, 0.86) * 4 + 0.0001), n = 4 - Math.min(4, delivered);
      for (let i = 0; i < n; i++) {
        const f = i / 3, shift = slide * (5 + 16 * f) + (walking ? Math.sin(t * 9) * 0.8 * f : 0);
        pw5PizzaBox(v, shift, -10.5 - i * 10, slide * 0.15 * f, 1.0);
      }
      ctx.restore();
      if (slide > 0.35) {
        const bx = MX + 30, by = (hand[0] + hand[1]) / 2 - 52 + Math.sin(t * 14) * 1.5;
        v.fillCircle(bx, by, 8, '#e4572e'); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2); ctx.stroke();
        v.text('!', bx, by + 1, 12, '#ffffff');
      }
      // delivered boxes fly in through the door
      for (let i = 0; i < 4; i++) {
        const f = v.seg(k, 0.76 + i * 0.025, 0.79 + i * 0.025);
        if (f <= 0 || f >= 1) continue;
        const y0 = mean - 12 - (3 - i) * 10;
        pw5PizzaBox(v, v.lerp(MX, door, f), v.lerp(y0, base - 22, f) - 36 * Math.sin(Math.PI * f), f * 2.4, 1.0 * (1 - 0.4 * f));
      }
      ctx.restore();
      if (k > 0.14 && k < 0.38) v.bubble('Keep it level!', MX - cam, Math.max(26, mean - 70));
      if (k > 0.47 && k < 0.57) v.label('Raise it, Bo!', MX - cam, Math.max(22, mean - 72), 14, v.c.gold);
      if (k > 0.86 && k < 0.95) v.bubble('Thanks!', door - cam - 15, 46);
      v.confetti(door - cam, base - 50, v.seg(k, 0.86, 0.97));
      pw5Veil(v, k < 0.04 ? 1 - v.seg(k, 0, 0.04) : v.seg(k, 0.95, 1), v.c.skyBot);
    });
  },
});

/* ---------- 5-3 Ice Slide ---------- */
const pw5IceTheme = { skyTop: '#a9dcff', skyBot: '#eef8ff', hillFar: '#cfe2f3', hillNear: '#e9f4fc', stone: '#5a7db3', stoneLight: '#7094c8',
  stoneEdge: '#3b5788', grass: '#c9f0ff', grassDark: '#7cc7ec', plank: '#bfe9ff', plankDark: '#5fa9d6',
  sun: 'rgba(255, 251, 230, 0.95)', sunGlow: 'rgba(255, 255, 245, 0.4)' };
// the level's penguin (iceDrawPenguin), feet at (x, y); flap 0..1 raises the flippers
function pw5Penguin(v, x, y, s, look, flap) {
  const ctx = v.ctx, body = '#2d3157';
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(28,26,54,0.16)'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff9f43'; ctx.beginPath(); ctx.ellipse(-4.5, -1, 4.2, 2, 0, 0, Math.PI * 2); ctx.ellipse(4.5, -1, 4.2, 2, 0, 0, Math.PI * 2); ctx.fill();
  for (const sd of [-1, 1]) {
    ctx.save(); ctx.translate(sd * 8.5, -15); ctx.rotate(sd * (0.35 + flap * 1.1));
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, 6, 3.2, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, -14, 10, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0.8 * look, -11, 6.6, 10, 0, 0, Math.PI * 2); ctx.fill();
  const ex = look * 2.2;
  v.fillCircle(ex - 3.8, -20, 2.8, '#fff'); v.fillCircle(ex + 3.8, -20, 2.8, '#fff');
  v.fillCircle(ex - 3.8 + look, -19.6, 1.5, v.c.ink); v.fillCircle(ex + 3.8 + look, -19.6, 1.5, v.c.ink);
  ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(ex - 2.6, -16.5); ctx.lineTo(ex + 2.6, -16.5); ctx.lineTo(ex + look * 1.5, -12.8); ctx.closePath(); ctx.fill();
  ctx.restore();
}
// white speed lines behind a slider at feet (x, y) moving dir (-1 / 1)
function pw5Trail(v, x, y, dir, a) {
  if (a <= 0) return;
  const ctx = v.ctx;
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (const [dy, len] of [[-6, 22], [-13, 14], [-19, 18]]) { ctx.beginPath(); ctx.moveTo(x - dir * 14, y + dy); ctx.lineTo(x - dir * (14 + len), y + dy); ctx.stroke(); }
  ctx.restore();
}

// the level's first room: Pip slides to the gate, Bo bumps into Pip and lands on the gate's button; the gate opens,
// Pip slides through onto the door's own button (it keeps the gate open), and Bo slides after and bumps to a stop in the door
definePreview('Ice Slide', {
  blurb: 'On ice you slide until you bump into something, like your partner!',
  loop: 7, still: 2.45,
  draw(v, t) {
    pw5Themed(v, pw5IceTheme, () => {
      const ctx = v.ctx, k = t / 7, gy = 140, snowW = 76, gx = 208, gw = 18, gh = 50, wallX = 306, doorX = 273, btnA = 175, btnB = 295;
      const gold = '#ffc53d';
      v.sky();
      v.sun(150, 28, 12);
      v.cloud(40 + Math.sin(k * Math.PI * 2) * 6, 30, 0.8);
      // a far ice palace
      ctx.save(); ctx.translate(118, gy); ctx.globalAlpha = 0.85;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      for (const [x, w, h] of [[-46, 18, 64], [46, 18, 64], [-22, 16, 76], [22, 16, 76], [0, 22, 96]]) {
        ctx.fillRect(x - w / 2, -h, w, h);
        ctx.beginPath(); ctx.moveTo(x - w / 2 - 3, -h); ctx.lineTo(x + w / 2 + 3, -h); ctx.lineTo(x, -h - w * 1.2); ctx.closePath();
        ctx.fillStyle = 'rgba(150,205,246,0.75)'; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.6)';
      }
      ctx.fillRect(-56, -44, 112, 44);
      ctx.restore();
      v.hills(gy - 16);
      // floor: grippy snow on the left, shiny ice to the right
      v.block(0, gy, v.W, v.H - gy, false);
      ctx.fillStyle = '#7cc7ec'; ctx.fillRect(snowW, gy, v.W - snowW, 10);
      ctx.fillStyle = '#c9f0ff'; ctx.fillRect(snowW, gy, v.W - snowW, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; for (let x = snowW + 8; x < v.W; x += 30) ctx.fillRect(x + (x % 7), gy + 1.5, 10, 2);
      ctx.fillStyle = '#dfe9f3'; ctx.fillRect(0, gy, snowW, 10);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, gy, snowW, 6);
      for (let x = 5; x < snowW; x += 10) { v.circle(x, gy + 4, 4.5); ctx.fill(); }
      // the wall down the middle with the gate at its foot, and the room's outer wall
      v.block(gx, -2, gw, gy - gh + 2, false);
      v.block(wallX, -2, v.W - wallX, gy + 2, false);
      // who is where: a push slides you all the way, and you stop dead at what you hit
      const slide = (a, b, x0, x1) => v.lerp(x0, x1, Math.min(1, Math.pow(v.seg(k, a, b), 0.85)));
      const pA = gx - 11, bA = pA - 22, pB = wallX - 11, bB = pB - 22;
      let px = 58, bx = 36;
      if (k > 0.06) px = slide(0.06, 0.16, 58, pA);
      if (k > 0.22) bx = slide(0.22, 0.33, 36, bA);
      if (k > 0.45) px = slide(0.45, 0.53, pA, pB);
      if (k > 0.58) bx = slide(0.58, 0.68, bA, bB);
      const pSlide = (k > 0.06 && k < 0.16) || (k > 0.45 && k < 0.53), bSlide = (k > 0.22 && k < 0.33) || (k > 0.58 && k < 0.68);
      // the gate opens while someone stands on a button (Bo on the near one, then Pip on the door's)
      const gate = v.seg(k, 0.33, 0.38) * (1 - v.seg(k, 0.93, 0.98));
      if (gate < 0.99) {
        const hh = gh * (1 - gate);
        ctx.save(); ctx.globalAlpha = 1 - gate * 0.85;
        ctx.fillStyle = 'rgba(28,26,54,0.35)'; ctx.fillRect(gx + 1, gy - gh, gw - 2, hh);
        ctx.fillStyle = gold;
        for (let i = 0; i < 3; i++) { v.rr(gx + 2 + i * 5.5, gy - gh, 3.5, hh, 1.5); ctx.fill(); }
        ctx.fillRect(gx + 1, gy - gh + 10 * (1 - gate), gw - 2, 4);
        ctx.restore();
      }
      ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = gold; ctx.lineWidth = 2; ctx.strokeRect(gx + 1, gy - gh + 1, gw - 2, gh - 2); ctx.restore();
      const doorOn = v.seg(k, 0.68, 0.72) * (1 - v.seg(k, 0.93, 0.99));
      v.door(doorX, gy, doorOn);
      v.button(btnA, gy, gold, k > 0.33 && k < 0.58 ? 1 : 0);
      v.button(btnB, gy, gold, k > 0.53 && k < 0.95 ? 1 : 0);
      v.sparkle(gx + gw / 2, gy - gh - 6, v.seg(k, 0.33, 0.45), '#ffffff', 12);
      pw5Trail(v, bx, gy, 1, bSlide ? 1 : 0);
      pw5Trail(v, px, gy, 1, pSlide ? 1 : 0);
      const thunk = k < 0.3 ? v.seg(k, 0.16, 0.22) : v.seg(k, 0.53, 0.59), bump = k < 0.5 ? v.seg(k, 0.33, 0.39) : v.seg(k, 0.68, 0.74);
      const joy = k > 0.74 && k < 0.95, hit = f => f > 0 && f < 1;
      const fade = k < 0.04 ? v.seg(k, 0, 0.04) : 1 - v.seg(k, 0.92, 0.97);
      const jh = id => (joy ? v.hop(v.phase(t, 0.5, id * 0.25), 8) : 0);
      v.hero(1, bx, gy + jh(1), { face: 1, alpha: fade, sq: hit(bump) ? 0.18 * (1 - bump) : 0,
        mood: joy ? 'joy' : bSlide ? 'grit' : hit(bump) && bump < 0.8 ? 'wow' : 'happy' });
      v.hero(0, px, gy + jh(0), { face: joy ? -1 : 1, alpha: fade, sq: hit(thunk) ? 0.2 * (1 - thunk) : hit(bump) ? 0.12 * (1 - bump) : 0,
        mood: joy ? 'joy' : pSlide ? 'grit' : (hit(thunk) && thunk < 0.8) || (hit(bump) && bump < 0.8) ? 'wow' : 'happy' });
      if (hit(thunk)) {
        const wx = k < 0.3 ? gx : wallX;
        v.puff(wx - 2, gy - 12, thunk);
        if (thunk < 0.9) v.label('THUNK', wx - 30, gy - 44, 12, '#ffffff');
      }
      if (hit(bump)) {
        const mx = (px + bx) / 2;
        v.label('BUMP!', bx - 4, gy - 46 - bump * 6, 16, gold); v.sparkle(mx, gy - 14, bump, '#ffffff', 10);
      }
      if (k > 0.39 && k < 0.47) v.bubble('Open!', bA, gy - 30);
      // a penguin on the snow watches, and cheers at the end
      const cheer = joy ? Math.abs(Math.sin(t * 9)) : 0;
      pw5Penguin(v, 13, gy - cheer * 3, 0.8, 1, cheer);
      if (joy) v.star(doorX, gy - 52 - Math.sin(t * 5) * 3, 8);
      v.confetti(doorX + 10, gy - 34, v.seg(k, 0.75, 0.93));
      // falling snow (wraps once per loop)
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 18; i++) {
        const x = (i * 151 + Math.sin(k * Math.PI * 2 + i) * 10 + 400) % v.W, y = (i * 83 + k * 400) % 200 - 10;
        v.circle(x, y, 1.2 + (i % 3) * 0.6); ctx.fill();
      }
    });
  },
});

/* ---------- 5-4 Rising Lava ---------- */
const pw5LavaTheme = { skyTop: '#ffb08a', skyBot: '#ffe6c4', hillFar: '#e5a493', hillNear: '#cf8a82', stone: '#4b3a55', stoneLight: '#5d4968',
  stoneEdge: '#2f2338', grass: '#ffb35c', grassDark: '#d9773a', sun: 'rgba(255, 236, 190, 0.95)', sunGlow: 'rgba(255, 170, 120, 0.35)' };
// a step in a player's colour (drawColorBlock), top-left (x, y), size sz; on 0 = a dashed ghost, 1 = solid; flash 0..1
function pw5Step(v, x, y, sz, id, on, flash) {
  const ctx = v.ctx, col = id ? v.c.bo : v.c.pip, dark = id ? v.c.boDark : v.c.pipDark;
  if (on < 1) {
    ctx.save(); ctx.globalAlpha *= 1 - on;
    ctx.save(); ctx.globalAlpha *= 0.12; ctx.fillStyle = col; ctx.fillRect(x + 2, y + 2, sz - 4, sz - 4); ctx.restore();
    ctx.save(); ctx.globalAlpha *= 0.6; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.strokeRect(x + 2, y + 2, sz - 4, sz - 4); ctx.restore();
    ctx.restore();
    if (on <= 0) return;
  }
  ctx.save(); ctx.globalAlpha *= on;
  ctx.fillStyle = col; ctx.fillRect(x + 1, y + 1, sz - 2, sz - 2);
  ctx.save(); ctx.beginPath(); ctx.rect(x + 1, y + 1, sz - 2, sz - 2); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 3.5;
  for (let q = -sz; q < sz * 2; q += 10) { ctx.beginPath(); ctx.moveTo(x + q, y + sz); ctx.lineTo(x + q + sz, y); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, sz - 2, sz - 2);
  v.fillCircle(x + sz * 0.36, y + sz * 0.45, 1.8, 'rgba(28,26,54,0.55)'); v.fillCircle(x + sz * 0.64, y + sz * 0.45, 1.8, 'rgba(28,26,54,0.55)');
  if (flash > 0 && flash < 1) { ctx.globalAlpha *= 0.8 * (1 - flash); ctx.fillStyle = '#fff'; ctx.fillRect(x, y, sz, sz); }
  ctx.restore();
}
// a lava button (feet at y): the cap in the owner's colour, a little block on it in the partner's colour
function pw5LavaButton(v, x, y, owner, down) {
  const ctx = v.ctx, own = owner ? v.c.bo : v.c.pip, par = owner ? v.c.pip : v.c.bo;
  ctx.fillStyle = v.c.stoneEdge; v.rr(x - 13, y - 5, 26, 5, 2); ctx.fill();
  if (down) { ctx.fillStyle = own; v.rr(x - 11, y - 7, 22, 3, 2); ctx.fill(); return; }
  ctx.fillStyle = owner ? v.c.boDark : v.c.pipDark; v.rr(x - 11, y - 13, 22, 9, 4); ctx.fill();
  ctx.fillStyle = own; v.rr(x - 11, y - 15, 22, 9, 4); ctx.fill();
  ctx.fillStyle = par; v.rr(x - 5.5, y - 13, 11, 6, 1.5); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke();
}
// a dot zipping from a pressed button to the steps it builds, along an arc lift px high (f 0..1), in the partner's colour
function pw5Zip(v, x0, y0, x1, y1, f, col, lift = 40) {
  if (f <= 0 || f >= 1) return;
  const ctx = v.ctx, mx = (x0 + x1) / 2, my = Math.min(y0, y1) - lift;
  ctx.save(); ctx.setLineDash([2, 7]); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1);
  ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.stroke();
  ctx.globalAlpha = 0.9; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
  const u = 1 - f, px = u * u * x0 + 2 * u * f * mx + f * f * x1, py = u * u * y0 + 2 * u * f * my + f * f * y1;
  v.fillCircle(px, py, 5, col); v.fillCircle(px, py, 2.4, '#fff');
}
// the rising lava (MODES.lava.drawLava): surface at y, a wobbly crest, glowing blobs
function pw5Lava(v, y, t) {
  if (y >= v.H + 6) return;
  const ctx = v.ctx, W = v.W, H = v.H;
  const wave = x => y + 2.2 * Math.sin(2 * Math.PI * (x / 60 + 0.7 * t)) + 1.1 * Math.sin(2 * Math.PI * (x / 23 - 1.3 * t));
  const gl = ctx.createLinearGradient(0, y - 40, 0, y);
  gl.addColorStop(0, 'rgba(255,140,60,0)'); gl.addColorStop(1, 'rgba(255,140,60,0.3)');
  ctx.fillStyle = gl; ctx.fillRect(0, y - 40, W, 40);
  const g = ctx.createLinearGradient(0, y - 6, 0, H);
  g.addColorStop(0, '#ffb347'); g.addColorStop(0.3, '#ff6a2a'); g.addColorStop(1, '#d8431f');
  ctx.beginPath(); ctx.moveTo(0, H + 2);
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, wave(x));
  ctx.lineTo(W, H + 2); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
  ctx.fillStyle = 'rgba(255,214,120,0.25)';
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse((i * 97 + t * 14) % (W + 60) - 30, y + 12 + i * 5, 20, 4, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = '#ffe28a'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath();
  for (let x = 0; x <= W; x += 8) { if (x) ctx.lineTo(x, wave(x) + 1.5); else ctx.moveTo(x, wave(x) + 1.5); }
  ctx.stroke();
}

// like floor 1: Pip (left) presses his button and blue steps pop in for Bo (right); Bo climbs, presses his, and orange
// steps pop in for Pip, who climbs out before the lava; they meet at the door
definePreview('Rising Lava', {
  blurb: 'Your button makes steps for your partner. Climb before the lava does!',
  loop: 8, still: 4.95,
  draw(v, t) {
    pw5Themed(v, pw5LavaTheme, () => {
      const k = t / 8, gy = 160, top = 66, S = 24;
      v.sky(); v.sun(286, 30, 13); v.hills(112);
      v.ground(gy);
      v.block(102, top, 116, 14);
      const doorOpen = v.seg(k, 0.82, 0.86) * (1 - v.seg(k, 0.94, 0.99));
      v.door(160, top, doorOpen);
      // the steps: blue ones (they hold Bo) up the right, orange ones (they hold Pip) up the left
      const blue = [[266, 136], [242, 112], [218, 88]], orange = [[30, 136], [54, 112], [78, 88]];
      const gone = 1 - v.seg(k, 0.9, 0.97);
      const built = (at, i) => (k >= at + i * 0.03 ? gone : 0);
      blue.forEach(([x, y], i) => pw5Step(v, x, y, S, 1, built(0.15, i), v.seg(k, 0.15 + i * 0.03, 0.18 + i * 0.03)));
      orange.forEach(([x, y], i) => pw5Step(v, x, y, S, 0, built(0.51, i), v.seg(k, 0.51 + i * 0.03, 0.54 + i * 0.03)));
      const pipDown = k > 0.09 && k < 0.58, boDown = k > 0.45 && k < 0.78;
      pw5LavaButton(v, 16, gy, 0, pipDown);
      pw5LavaButton(v, 200, top, 1, boDown);
      pw5Zip(v, 16, gy - 10, 278, 136, v.seg(k, 0.09, 0.16), v.c.bo);
      pw5Zip(v, 200, top - 10, 42, 136, v.seg(k, 0.45, 0.52), v.c.pip, 100); // high, over the door
      // hops from step to step: [time from, time to, x0, y0, x1, y1]
      const climb = (path, x, y) => {
        for (const [a, b, x0, y0, x1, y1] of path) {
          if (k < a) break;
          const f = v.seg(k, a, b);
          x = v.lerp(x0, x1, f); y = v.lerp(y0, y1, f) + (y1 !== y0 ? v.hop(f, 16) : v.hop(v.phase(t, 0.34), 3) * (f > 0 && f < 1 ? 1 : 0));
        }
        return [x, y];
      };
      const [bx, by] = climb([[0.24, 0.29, 306, gy, 278, 136], [0.29, 0.34, 278, 136, 254, 112], [0.34, 0.39, 254, 112, 230, 88],
        [0.39, 0.45, 230, 88, 200, top], [0.78, 0.83, 200, top, 179, top]], 306, gy);
      const [px, py] = climb([[0.03, 0.09, 70, gy, 16, gy], [0.58, 0.63, 16, gy, 42, 136], [0.63, 0.68, 42, 136, 66, 112],
        [0.68, 0.73, 66, 112, 90, 88], [0.73, 0.78, 90, 88, 124, top], [0.78, 0.83, 124, top, 140, top]], 70, gy);
      const lavaY = k < 0.84 ? (k < 0.6 ? v.lerp(198, 171, v.ease.out(v.seg(k, 0.02, 0.6))) : v.lerp(172, 148, v.ease.out(v.seg(k, 0.6, 0.8)))) : v.lerp(148, 198, v.ease.inOut(v.seg(k, 0.84, 0.96)));
      const fade = k < 0.04 ? v.seg(k, 0, 0.04) : 1 - v.seg(k, 0.92, 0.97), joy = k > 0.84 && k < 0.95;
      const jh = id => (joy ? v.hop(v.phase(t, 0.5, id * 0.25), 8) : 0);
      const bMove = k > 0.24 && k < 0.45, pMove = k > 0.58 && k < 0.78;
      v.hero(1, bx, by + jh(1), { face: -1, alpha: fade, mood: joy ? 'joy' : bMove ? 'grit' : 'happy', sq: boDown && !joy && k < 0.48 ? 0.12 : 0 });
      v.hero(0, px, py + jh(0), { face: k < 0.09 ? -1 : 1, alpha: fade,
        mood: joy ? 'joy' : pMove ? 'grit' : lavaY < 180 && k < 0.6 ? 'wow' : 'happy', sq: pipDown && k < 0.13 ? 0.12 : 0 });
      pw5Lava(v, lavaY, t);
      if (k > 0.5 && k < 0.59) {
        const cx = px, cy = py - 40 + Math.sin(t * 12) * 1.5;
        v.ctx.fillStyle = '#ffffff'; v.rr(cx - 8, cy - 8, 16, 16, 5); v.ctx.fill();
        v.text('!', cx, cy + 1, 13, '#e5322d');
      }
      if (k > 0.47 && k < 0.6) v.bubble('Hurry!', bx, top - 30);
      if (k > 0.1 && k < 0.2) v.label('STEPS!', 160, 112, 15, v.c.bo);
      if (k > 0.46 && k < 0.55) v.label('STEPS!', 90, 40, 15, v.c.pip);
      if (joy) v.star(160, top - 52 - Math.sin(t * 5) * 3, 9);
      v.confetti(160, top - 30, v.seg(k, 0.84, 0.97));
    });
  },
});
