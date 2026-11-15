/* Pip & Bo - Level previews for World 38 Operation Midnight. Helpers are prefixed pw38. Each level's preview sits
   between its own BEGIN/END lines. v.hero draws Pip and Bo in each level's own outfit. */
'use strict';

// shared: the night sky and city, a Zero goon, the briefcase, a red beam
const pw38TAU = Math.PI * 2;
const pw38Night = (v, o = {}) => {
  const c = v.ctx, g = c.createLinearGradient(0, 0, 0, v.H);
  g.addColorStop(0, '#061820'); g.addColorStop(0.7, '#0b2430'); g.addColorStop(1, '#174a58');
  c.fillStyle = g; c.fillRect(0, 0, v.W, v.H);
  for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,255,240,' + (0.3 + 0.4 * Math.abs(Math.sin(v.t * 1.3 + i))) + ')'; c.fillRect(v.rand(i) * v.W, v.rand(i + 50) * v.H * 0.6, 1.2, 1.2); }
  if (o.moon !== false) { c.fillStyle = 'rgba(255,250,220,0.15)'; v.circle(o.mx || 268, o.my || 32, 22); c.fill(); c.fillStyle = '#f6f0d6'; v.circle(o.mx || 268, o.my || 32, 12); c.fill(); }
};
const pw38City = (v, base, s = 1, scroll = 0) => {
  const c = v.ctx;
  for (let i = 0; i < 16; i++) {
    const w = (14 + v.rand(i + 3) * 22) * s, h = (24 + v.rand(i + 7) * 60) * s;
    let x = ((i * 24 * s - scroll) % (16 * 24 * s) + 16 * 24 * s) % (16 * 24 * s) - 20;
    c.fillStyle = '#0a2a34'; c.fillRect(x, base - h, w, h);
    c.fillStyle = 'rgba(255,207,106,0.75)';
    for (let wy = base - h + 4 * s; wy < base - 3; wy += 6 * s) for (let wx = x + 3 * s; wx < x + w - 3; wx += 5 * s) if (v.rand(wx * 0.7 + wy * 1.3) > 0.6) c.fillRect(wx, wy, 1.6 * s, 2.4 * s);
  }
};
const pw38Zero = (v, x, y, o = {}) => {
  const c = v.ctx, s = o.s || 1;
  c.save(); c.translate(x, y); c.scale(s * (o.face || 1), s);
  c.fillStyle = '#23272e'; c.beginPath(); c.ellipse(0, -10, 7, 8, 0, 0, pw38TAU); c.fill();
  c.fillStyle = '#f2f2f2'; c.beginPath(); c.moveTo(-2, -17); c.lineTo(2, -17); c.lineTo(0, -9); c.fill();
  c.fillStyle = '#f0c8a0'; v.circle(0, -21, 4.5); c.fill();
  c.fillStyle = '#0c0e10'; c.fillRect(-3.5, -23, 7, 2.4);
  c.fillStyle = '#111316'; c.beginPath(); c.ellipse(0, -25, 6, 1.4, 0, 0, pw38TAU); c.fill(); c.beginPath(); c.ellipse(0, -26, 4, 3.5, 0, Math.PI, pw38TAU); c.fill();
  if (o.fist) { c.strokeStyle = '#23272e'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-5, -14); c.lineTo(-9, -22 + Math.sin(v.t * 14) * 2); c.stroke(); }
  c.restore();
};
const pw38Case = (v, x, y, s = 1, open = 0) => {
  const c = v.ctx;
  c.fillStyle = 'rgba(255,214,90,' + (0.2 + 0.1 * Math.sin(v.t * 3)) + ')'; v.circle(x, y - 4 * s, 9 * s); c.fill();
  c.fillStyle = '#1a1c20'; v.rr(x - 6 * s, y - 8 * s, 12 * s, 8 * s, 1.5 * s); c.fill();
  c.fillStyle = 'rgba(255,214,90,0.9)'; c.fillRect(x - 5.5 * s, y - 4.6 * s, 11 * s, 0.7 * s);
  if (open) { c.fillStyle = 'rgba(255,230,140,' + 0.7 * open + ')'; c.beginPath(); c.moveTo(x - 5 * s, y - 5 * s); c.lineTo(x + 5 * s, y - 5 * s); c.lineTo(x + 12 * s, y - 20 * s * open); c.lineTo(x - 12 * s, y - 20 * s * open); c.fill(); }
};
const pw38Beam = (v, x0, y0, x1, y1, col = '255,42,58') => {
  const c = v.ctx;
  c.strokeStyle = 'rgba(' + col + ',0.3)'; c.lineWidth = 5; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  c.strokeStyle = 'rgba(' + col + ',0.95)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
};

// ===== BEGIN 38-1 Skyscraper Window Climb =====
definePreview('Skyscraper Window Climb', {
  blurb: 'Climb the glass tower together: clamp when the searchlight passes, swing across the gaps.',
  loop: 5, still: 2.2,
  draw(v, t) {
    const c = v.ctx;
    pw38Night(v, { mx: 40, my: 30 });
    pw38City(v, 180, 0.5);
    // the tower: two glass columns with a gap (the neon "0") between
    for (const [x0, w] of [[40, 110], [196, 110]]) {
      c.fillStyle = '#1d4b5c'; c.fillRect(x0, 0, w, v.H);
      c.strokeStyle = '#9fb6be'; c.lineWidth = 1; for (let x = x0; x <= x0 + w; x += 22) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, v.H); c.stroke(); } for (let y = 6; y < v.H; y += 26) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + w, y); c.stroke(); }
      c.fillStyle = 'rgba(255,207,106,0.35)'; c.fillRect(x0 + 44, 58, 21, 25);
    }
    const ng = 0.6 + 0.4 * Math.sin(t * 6); c.strokeStyle = 'rgba(255,60,90,' + ng + ')'; c.lineWidth = 3; c.beginPath(); c.ellipse(173, 40, 12, 18, 0, 0, pw38TAU); c.stroke();
    // the searchlight sweeping across the left column
    const sx = 40 + 110 * v.pingpong(v.phase(t, 5)), on = Math.abs(sx - 92) < 26;
    c.fillStyle = 'rgba(255,250,210,0.18)'; c.beginPath(); c.moveTo(160, v.H + 20); c.lineTo(sx - 18, 95); c.lineTo(sx + 18, 95); c.fill();
    c.fillStyle = 'rgba(255,250,210,0.28)'; c.beginPath(); c.ellipse(sx, 100, 20, 14, 0, 0, pw38TAU); c.fill();
    // Pip clamped flat under it
    v.hero(0, 92, 116, { s: 1.1, face: 1, mood: on ? 'grit' : 'happy', sq: on ? 0.2 : 0 });
    if (on) v.pill('clamp!', 92, 82, { size: 9 });
    // Bo swinging across the gap on the rope
    const a = Math.sin(t * 1.26) * 0.9, ax = 150, ay = 70, L = 54, bx = ax + Math.sin(a) * L + 20, by = ay + Math.cos(a) * L;
    c.strokeStyle = '#d8a640'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(96, 104); c.quadraticCurveTo(130, 110, ax, ay); c.lineTo(bx, by - 26); c.stroke();
    v.hero(1, bx, by, { s: 1.1, face: 1, rot: -a * 0.5, mood: 'joy' });
  },
});
// ===== END 38-1 Skyscraper Window Climb =====

// ===== BEGIN 38-2 Laser Vault Heist =====
definePreview('Laser Vault Heist', {
  blurb: 'One bends the beams with a brass mirror, the other slides under them to the diamond.',
  loop: 4.5, still: 2.6,
  draw(v, t) {
    const c = v.ctx, fy = 150;
    c.fillStyle = '#10161c'; c.fillRect(0, 0, v.W, v.H);
    c.fillStyle = '#1a222a'; for (let x = 0; x < v.W; x += 40) c.fillRect(x, 20, 36, 120);
    c.fillStyle = '#e8e8e8'; for (let x = 0; x < v.W; x += 20) { c.fillStyle = (x / 20) % 2 ? '#1a1c20' : '#d8d8d8'; c.fillRect(x, fy, 20, 30); }
    // the green lens up on the wall
    c.fillStyle = '#5dff9a'; v.circle(64, 34, 6); c.fill(); c.fillStyle = 'rgba(93,255,154,0.25)'; v.circle(64, 34, 12); c.fill();
    // the beam from the left wall, bent up into the lens by Bo's mirror
    const flash = Math.sin(t * 10) > 0;
    pw38Beam(v, 0, 104, 64, 104); pw38Beam(v, 64, 104, 64, 40, '93,255,154');
    v.hero(1, 56, fy, { s: 1.2, face: 1, mood: 'grit' });
    c.save(); c.translate(64, 104); c.rotate(-Math.PI / 4); c.fillStyle = flash ? '#fff1c0' : '#d8a640'; c.fillRect(-7, -1.5, 14, 3); c.restore();
    c.strokeStyle = '#8a6420'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(60, 120); c.lineTo(64, 106); c.stroke();
    // waist-high beams and Pip sliding under them
    for (const x of [140, 190]) pw38Beam(v, x - 30, 128, x + 30, 128);
    pw38Beam(v, 120, 60, 260, 60);
    const k = v.seg(v.phase(t, 4.5), 0.1, 0.85), px = 100 + 150 * v.ease.inOut(k);
    v.hero(0, px, fy, { s: 1.2, face: 1, sq: k > 0.15 && k < 0.85 ? 0.55 : 0, rot: k > 0.15 && k < 0.85 ? -0.25 : 0, mood: 'wow' });
    // the diamond on its pillar
    c.fillStyle = '#4e5960'; c.fillRect(276, 112, 22, 38);
    c.fillStyle = '#7ee0ff'; c.beginPath(); c.moveTo(279, 104); c.lineTo(283, 98); c.lineTo(291, 98); c.lineTo(295, 104); c.lineTo(287, 112); c.fill();
    v.sparkle(287, 100, v.phase(t, 1.2));
  },
});
// ===== END 38-2 Laser Vault Heist =====

// ===== BEGIN 38-3 Air Vent Crawl =====
definePreview('Air Vent Crawl', {
  blurb: 'Crawl down through the dark ducts: one holds the torch, the other hacks the doors.',
  loop: 4, still: 1.8,
  draw(v, t) {
    const c = v.ctx;
    c.fillStyle = '#05080a'; c.fillRect(0, 0, v.W, v.H);
    // the duct (cut-away): a long run with a grate, the room below
    c.fillStyle = '#2a3238'; c.fillRect(0, 50, v.W, 4); c.fillRect(0, 104, v.W, 4);
    c.fillStyle = '#141a1e'; c.fillRect(0, 54, v.W, 50);
    c.fillStyle = '#1a2026'; c.fillRect(0, 108, v.W, 72);
    // a guard's torch coming up through a grate
    const gx = 80 + Math.sin(t * 1.5) * 30;
    c.fillStyle = '#3a4248'; for (let i = 0; i < 6; i++) c.fillRect(150 + i * 7, 104, 4, 4);
    c.fillStyle = 'rgba(255,240,180,0.18)'; c.beginPath(); c.moveTo(gx + 6, 156); c.lineTo(150, 108); c.lineTo(192, 108); c.fill();
    pw38Zero(v, gx, 172, { s: 0.9 });
    // the torch cone from Pip onto the door panel
    c.fillStyle = 'rgba(255,240,180,0.28)'; c.beginPath(); c.moveTo(118, 88); c.lineTo(250, 58); c.lineTo(250, 104); c.fill();
    v.hero(0, 108, 102, { s: 1.0, face: 1, sq: 0.45 });
    c.fillStyle = '#ffffcc'; v.circle(118, 88, 2); c.fill();
    // the door and its panel with green arrows; Bo with the briefcase beside it
    c.fillStyle = '#4e5960'; c.fillRect(256, 54, 10, 50);
    c.fillStyle = '#0c1410'; v.rr(234, 62, 20, 14, 2); c.fill();
    const n = Math.floor(v.phase(t, 4) * 5); const arr = ['◀', '▲', '▶', '▼'];
    for (let i = 0; i < 4; i++) v.text(arr[i], 237 + i * 5, 69, 5, i < n ? '#5dff9a' : 'rgba(93,255,154,0.4)', 'center');
    v.hero(1, 216, 102, { s: 1.0, face: 1, sq: 0.45 });
    pw38Case(v, 200, 102, 0.8);
    c.fillStyle = '#5dff9a'; v.circle(222, 92, 1.6); c.fill();
    // two red eyes far back in the dark
    const blink = v.phase(t, 2) > 0.9 ? 0.2 : 1;
    c.fillStyle = 'rgba(255,40,40,' + 0.8 * blink + ')'; v.circle(18, 84, 2); c.fill(); v.circle(26, 84, 2); c.fill();
    // the red alarm strobe
    if (v.phase(t, 2) < 0.08) { c.fillStyle = 'rgba(255,30,40,0.22)'; c.fillRect(0, 0, v.W, v.H); }
  },
});
// ===== END 38-3 Air Vent Crawl =====

// ===== BEGIN 38-4 Speedboat Getaway =====
definePreview('Speedboat Getaway', {
  blurb: 'One steers, one works the gadgets: smoke, oil and Boost to shake Count Zero\'s fleet.',
  loop: 4, still: 1.6,
  draw(v, t) {
    const c = v.ctx, wy = 112;
    pw38Night(v, { mx: 280, my: 26 });
    pw38City(v, wy, 0.45, t * 20);
    // Zero Tower, small in the distance
    c.fillStyle = '#081c24'; c.fillRect(30, wy - 60, 10, 60); c.fillStyle = '#ff3a4a'; c.fillRect(34, wy - 64, 2, 3);
    const g = c.createLinearGradient(0, wy, 0, v.H); g.addColorStop(0, '#0f3a48'); g.addColorStop(1, '#05151c');
    c.fillStyle = g; c.fillRect(0, wy, v.W, v.H - wy);
    for (let i = 0; i < 24; i++) { const x = ((v.rand(i) * 400 - t * 160) % 400 + 400) % 400 - 40; c.fillStyle = 'rgba(160,210,230,0.12)'; c.fillRect(x, wy + 6 + v.rand(i + 9) * 60, 14, 1); }
    // the helicopter's light on the water
    const hx = 250 + Math.sin(t * 1.5) * 10;
    c.fillStyle = 'rgba(255,250,210,0.14)'; c.beginPath(); c.moveTo(hx, 26); c.lineTo(hx - 50, 150); c.lineTo(hx + 10, 150); c.fill();
    c.fillStyle = 'rgba(255,250,220,0.22)'; c.beginPath(); c.ellipse(hx - 20, 150, 32, 7, 0, 0, pw38TAU); c.fill();
    c.fillStyle = '#1a1c20'; c.beginPath(); c.ellipse(hx, 22, 18, 8, 0, 0, pw38TAU); c.fill(); c.fillRect(hx + 12, 19, 26, 3);
    const r = Math.sin(t * 40) * 26; c.strokeStyle = '#3a3e44'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(hx - r, 12); c.lineTo(hx + r, 12); c.stroke();
    pw38Zero(v, hx - 8, 30, { s: 0.4, face: -1, fist: true });
    // the smoke cloud and a spinning black boat behind
    for (let i = 0; i < 7; i++) { c.fillStyle = 'rgba(206,210,216,0.6)'; v.circle(40 + i * 14 + Math.sin(t * 2 + i) * 3, 132 - (i % 3) * 7, 12 + (i % 2) * 4); c.fill(); }
    c.save(); c.translate(30, 152); c.rotate(t * 5); c.fillStyle = '#121418'; c.beginPath(); c.moveTo(-22, 0); c.lineTo(20, 0); c.lineTo(24, -6); c.lineTo(-20, -6); c.fill(); c.restore();
    // the speedboat in mid-air off the ramp
    c.fillStyle = '#5a4a3a'; c.beginPath(); c.moveTo(100, 150); c.lineTo(140, 132); c.lineTo(140, 150); c.fill();
    const k = v.phase(t, 4), air = Math.sin(k * Math.PI), bx = 168, by = 140 - air * 34;
    c.save(); c.translate(bx, by); c.rotate(-0.2 + 0.3 * k);
    c.save(); c.beginPath(); c.rect(-40, -60, 90, 54); c.clip();
    v.hero(1, 8, 0, { s: 1, face: 1, mood: 'joy', vx: 260 });
    v.hero(0, -16, 0, { s: 1, face: -1, mood: 'grit', vx: 260 });
    c.restore();
    pw38Case(v, -4, -6, 0.6);
    c.fillStyle = '#7a1e24'; c.beginPath(); c.moveTo(-30, 0); c.lineTo(26, 0); c.lineTo(38, -10); c.lineTo(-28, -10); c.fill();
    c.fillStyle = '#f4f2ea'; c.fillRect(-28, -11, 64, 2);
    c.restore();
    for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(220,240,255,0.8)'; v.circle(bx - 34 - i * 5, by + 4 + Math.sin(t * 12 + i) * 3, 1.5); c.fill(); }
  },
});
// ===== END 38-4 Speedboat Getaway =====
