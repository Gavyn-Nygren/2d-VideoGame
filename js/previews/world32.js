/* Pip & Bo - Level previews for World 32 Superhero City. Helpers are prefixed pw32. Each level's preview sits between
   its own BEGIN/END lines. The look matches the levels: a comic-book page (ink outlines, flat bold colours, halftone dot
   fades, Bangers lettering, jagged bursts, an inked panel border). */
'use strict';

const pw32TAU = Math.PI * 2, pw32INK = '#14121c';
const pw32Disp = n => n + 'px "Bangers", "Lilita One", sans-serif';
// fill the current path with an ink outline under it
const pw32Ink = (v, fill, lw = 1.6) => { const c = v.ctx; c.lineJoin = 'round'; c.strokeStyle = pw32INK; c.lineWidth = lw * 2; c.stroke(); c.fillStyle = fill; c.fill(); };
const pw32Box = (v, x, y, w, h, fill, lw = 1.5) => { v.ctx.beginPath(); v.ctx.rect(x, y, w, h); pw32Ink(v, fill, lw); };
// a halftone fade: dots of `col` that grow from nothing at y0 to touching at y1 (or the other way round when y1 < y0)
const pw32Dots = (v, x0, x1, y0, y1, col, cell = 6) => {
  const c = v.ctx; c.fillStyle = col; c.beginPath();
  const n = Math.abs(y1 - y0) / cell;
  for (let r = 0; r <= n; r++) {
    const y = y0 + Math.sign(y1 - y0) * r * cell, rad = cell * 0.72 * (r / Math.max(1, n));
    if (rad < 0.3) continue;
    for (let x = x0 + (r % 2) * cell / 2; x <= x1; x += cell) { c.moveTo(x + rad, y); c.arc(x, y, rad, 0, pw32TAU); }
  }
  c.fill();
};
// the night (or dusk) sky in flat bands with dot fades, stars, an inked moon and an inked colourful skyline
const pw32Sky = (v, t, o = {}) => {
  const c = v.ctx, dusk = o.dusk;
  const bands = dusk ? [['#1d2a7a', 0], ['#e8307a', 46], ['#ff7a2a', 92], ['#fff3a0', 132]] : [['#0f1650', 0], ['#2647b8', 44], ['#ff4f9a', 92], ['#ffb03a', 136]];
  for (const [col, y] of bands) { c.fillStyle = col; c.fillRect(0, y, v.W, v.H - y); if (y) pw32Dots(v, 0, v.W, y, y - 22, col, 6); }
  for (let i = 0; i < (dusk ? 6 : 16); i++) { const x = v.rand(i) * v.W, y = 6 + v.rand(i + 40) * 40, s = 1.2 + v.rand(i + 80) * 1.8 * (0.7 + 0.3 * Math.sin(t * 2 + i)); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.35, y); c.lineTo(x, y + s); c.lineTo(x - s * 0.35, y); c.closePath(); c.fill(); c.beginPath(); c.moveTo(x - s, y); c.lineTo(x, y + s * 0.35); c.lineTo(x + s, y); c.lineTo(x, y - s * 0.35); c.closePath(); c.fill(); }
  const mx = o.moonX || 270;
  if (dusk) { v.circle(mx, 128, 30); pw32Ink(v, '#fff3a0', 1.4); }
  else {
    v.circle(mx, 32, 17); pw32Ink(v, '#fff6b8', 1.3);
    for (const [dx, dy, r] of [[-6, -4, 3.5], [5, 5, 2.6], [6, -7, 1.8]]) { v.circle(mx + dx, 32 + dy, r); c.fillStyle = '#f0d27a'; c.fill(); c.strokeStyle = pw32INK; c.lineWidth = 1; c.stroke(); }
  }
  // two rows of inked towers with yellow windows
  const far = dusk ? ['#ffc24a', '#ff9a5a', '#e8307a'] : ['#7aa4ff', '#ff8ac8', '#8a7aff'];
  const near = dusk ? ['#8e1f4a', '#1f3f9a', '#a8401a', '#0e7a72'] : ['#a01f6a', '#0e7f8a', '#c84a1e', '#3a3fb8', '#1a5fc0'];
  for (const [base, pal, k0, sc] of [[o.base1 || 150, far, 0, 0.3], [o.base2 || 170, near, 30, 0.6]]) {
    for (let i = 0; i < 12; i++) {
      const w = 24 + v.rand(i + k0) * 22, x = ((i * 34 + v.rand(i + k0 + 5) * 12 - (o.scroll || 0) * sc) % (v.W + 60) + v.W + 60) % (v.W + 60) - 40;
      const h = 50 + v.rand(i + k0 + 9) * 70, col = pal[(i + k0) % pal.length];
      pw32Box(v, x, base - h, w, h + 60, col, 1.2);
      c.fillStyle = '#ffe14a';
      for (let wy = base - h + 6; wy < base; wy += 9) for (let wx = x + 4; wx < x + w - 5; wx += 7) if (v.rand(wx * 3 + wy) > 0.55) c.fillRect(wx, wy, 3.5, 4.5);
    }
  }
};
const pw32Cape = (v, id, x, y, s, face, t, fly) => {
  const c = v.ctx, col = id === 0 ? '#e8222e' : '#ffd23a', back = -face, f = v.clamp(fly || 0, 0, 1), sh = y - 18 * s;
  const tipX = x + back * (5 + f * 18) * s, tipY = sh + 18 * s - f * 10 * s, w = Math.sin(t * (8 + f * 10) + id) * (1.5 + f * 2) * s;
  c.beginPath(); c.moveTo(x - 7 * s, sh); c.lineTo(x + 7 * s, sh);
  c.quadraticCurveTo(tipX + back * 6 * s, (sh + tipY) / 2 + w, tipX + back * 8 * s, tipY + 3 * s); c.lineTo(tipX - back * 3 * s, tipY + 5 * s + w);
  c.quadraticCurveTo(x - back * 3 * s, sh + 10 * s, x - 7 * s, sh); c.closePath(); pw32Ink(v, col, 0.8);
};
// a hero in costume: inked cape and body, a star on the chest. o: as v.hero, plus fly (how hard the cape flies)
const pw32Hero = (v, id, x, y, o = {}) => {
  const s = o.s || 0.6, face = o.face == null ? (id === 0 ? 1 : -1) : o.face, c = v.ctx;
  if (o.alpha != null) { c.save(); c.globalAlpha *= o.alpha; }
  pw32Cape(v, id, x, y, s, face, v.t, o.fly);
  const d0 = v.c.pipDark, d1 = v.c.boDark;
  v.c.pipDark = v.c.boDark = pw32INK; // inked outline, like the level
  try { v.hero(id, x, y, Object.assign({ s, face }, o, { alpha: undefined })); } finally { v.c.pipDark = d0; v.c.boDark = d1; }
  if (!o.rot) { v.star(x + face * 1.5 * s, y - 6 * s, 3.6 * s, id === 0 ? '#ffe14a' : '#ffffff'); c.strokeStyle = pw32INK; c.lineWidth = 0.8; c.stroke(); }
  if (o.alpha != null) c.restore();
};
// a jagged comic burst with a red Bangers word
const pw32Comic = (v, x, y, str, s, col = '#ffe14a') => {
  const c = v.ctx;
  c.save(); c.translate(x, y); c.scale(s, s);
  const star = () => { c.beginPath(); for (let i = 0; i < 18; i++) { const a = i / 18 * pw32TAU, r = i % 2 ? 11 + v.rand(i) * 3 : 19 + v.rand(i + 9) * 4; c.lineTo(Math.cos(a) * r * 1.45, Math.sin(a) * r); } c.closePath(); };
  c.translate(2, 2); star(); c.fillStyle = pw32INK; c.fill(); c.translate(-2, -2);
  star(); pw32Ink(v, col, 1.3);
  c.restore();
  pw32Word(v, str, x, y + 1, 13 * s, '#ff2e3e', -0.08);
};
// a lettered word: Bangers in capitals with an ink outline (and a little tilt)
const pw32Word = (v, str, x, y, size, col = '#ffffff', rot = -0.05) => {
  const c = v.ctx;
  c.save(); c.translate(x, y); c.rotate(rot);
  c.font = pw32Disp(size); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.strokeStyle = pw32INK; c.lineWidth = Math.max(3, size * 0.3); c.strokeText(str.toUpperCase(), 0, 0);
  c.fillStyle = col; c.fillText(str.toUpperCase(), 0, 0);
  c.restore();
};
// the panel border over the whole preview
const pw32Frame = v => { const c = v.ctx; c.strokeStyle = pw32INK; c.lineWidth = 4; c.strokeRect(2, 2, v.W - 4, v.H - 4); };

// ----- BEGIN 32-1 Runaway Subway -----
// A runaway train races through the tunnel. Pip (the speedster) zips to a lever and pulls; a steel girder drops from the
// roof and Bo (the strong hero) catches it overhead; the lever clunks home, sparks fly from the wheels and it slows.
{
  definePreview('Runaway Subway', {
    blurb: 'Stop the runaway train! The speedster pulls the brakes, the strong hero catches falling girders.',
    loop: 6, still: 3.2,
    draw(v, t) {
      const c = v.ctx, e = v.ease, floor = 140, roof = 46;
      const slow = v.seg(t, 4.2, 5.6), speed = 1 - slow * 0.7;
      // the tunnel wall: orange brick with inked courses, yellow lamps streaming past
      c.fillStyle = '#e0682e'; c.fillRect(0, 0, v.W, v.H);
      c.strokeStyle = pw32INK; c.lineWidth = 1.2; c.beginPath();
      const off = (t * 420 * speed) % 24;
      for (let y = 4; y < 36; y += 8) for (let x = -off + (y % 16 ? 12 : 0); x < v.W; x += 24) { c.moveTo(x, y); c.lineTo(x + 18, y); }
      c.stroke();
      pw32Dots(v, 0, v.W, 36, 22, '#8e2a14', 5);
      for (let k = 0; k < 6; k++) { const x = ((k * 70 - t * 420 * speed) % 420 + 420) % 420 - 50; v.circle(x, 20, 4.5); pw32Ink(v, '#ffe14a', 1.2); }
      // the car: blue body, cream skirt, yellow windows, all inked
      v.rr(6, roof - 8, v.W - 12, floor - roof + 26, 8); pw32Ink(v, '#2f6fe8', 1.6);
      pw32Box(v, 6, floor, v.W - 12, 8, '#ffe9a0', 1.2);
      for (let x = 26; x < v.W - 30; x += 58) { v.rr(x, roof + 6, 40, 26, 4); pw32Ink(v, '#ffe14a', 1.3); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x + 4, roof + 18); c.lineTo(x + 14, roof + 8); c.lineTo(x + 19, roof + 8); c.lineTo(x + 4, roof + 23); c.fill(); }
      c.fillStyle = '#ffe14a'; c.fillRect(6, floor - 14, v.W - 12, 4); c.fillStyle = pw32INK; c.fillRect(6, floor - 10, v.W - 12, 1.5);
      c.fillStyle = pw32INK; c.fillRect(6, floor + 8, v.W - 12, 10);
      // wheels (sparks when braking)
      for (const x of [50, 110, 210, 270]) { v.circle(x, floor + 22, 9); pw32Ink(v, '#3a3fb8', 1.2); v.fillCircle(x, floor + 22, 3, '#ffe14a'); }
      if (slow > 0 && slow < 1) for (let k = 0; k < 8; k++) { const u = (t * 5 + k * 0.13) % 1; v.fillCircle(270 - u * 40, floor + 28 - Math.sin(u * 3) * 8, 1.6, k % 2 ? '#ffe14a' : '#ffffff'); }
      // the lever (Pip pulls it 2.0-4.2)
      const pull = e.inOut(v.seg(t, 2.0, 4.2)), lx = 236;
      pw32Box(v, lx - 8, floor - 8, 16, 8, '#19a89a', 1.2);
      c.save(); c.translate(lx, floor - 6); c.rotate(-0.7 + pull * 1.3);
      v.line(0, 0, 0, -28, pw32INK, 6); v.line(0, 0, 0, -28, '#ffffff', 3);
      v.circle(0, -28, 5); pw32Ink(v, t > 1.6 && t < 4.2 ? '#ffe14a' : '#e8222e', 1.2); c.restore();
      // the girder: warning flash, drops 2.4-2.7, held up by Bo until 4.4, then set down
      const gx = 150, drop = v.seg(t, 2.4, 2.7), held = t >= 2.7 && t < 4.6;
      if (t > 1.8 && t < 2.4 && Math.sin(t * 30) > 0) pw32Box(v, gx - 34, roof - 4, 68, 4, '#e8222e', 1);
      const gy = t < 2.4 ? roof : held ? v.lerp(roof, floor - 34, drop) : t >= 4.6 ? v.lerp(floor - 34, floor - 6, v.seg(t, 4.6, 4.9)) : roof;
      pw32Box(v, gx - 34, gy, 68, 7, '#19a89a', 1.3);
      c.fillStyle = pw32INK; for (let x = gx - 30; x < gx + 30; x += 10) c.fillRect(x, gy + 2, 5, 3);
      // Bo stands under the girder, arms up while holding it
      const boY = floor;
      pw32Hero(v, 1, gx, boY, { s: 0.65, face: 1, sq: held ? 0.25 : 0, mood: held ? 'grit' : t > 4.6 ? 'joy' : 'happy' });
      if (held) for (const d of [-1, 1]) { v.line(gx + d * 6, boY - 14, gx + d * 8, gy + 7, pw32INK, 4.5); v.line(gx + d * 6, boY - 14, gx + d * 8, gy + 7, v.c.bo, 2.2); }
      // Pip zooms from the left to the lever, with ink speed lines (every third one white)
      const px = v.lerp(30, lx - 18, e.out(v.seg(t, 0.4, 1.6)));
      if (t > 0.4 && t < 1.6) for (let k = 0; k < 4; k++) v.line(px - 12 - k * 4, floor - 6 - k * 4, px - 30 - k * 8, floor - 6 - k * 4, k === 2 ? '#ffffff' : pw32INK, 1.6);
      pw32Hero(v, 0, px, floor, { s: 0.65, face: 1, fly: t < 1.6 ? 1 : 0, mood: t > 2 && t < 4.2 ? 'grit' : t > 4.6 ? 'joy' : 'happy' });
      if (t > 2.6 && t < 3.3) pw32Word(v, 'Clang!', gx, roof - 8, 15, '#ffe14a');
      if (t > 4.1 && t < 4.8) pw32Comic(v, lx, floor - 52, 'SCREEECH!', 1.1);
      if (t > 4.9) { pw32Word(v, 'Brakes on!', 160, 30, 17, '#ffe14a'); v.confetti(160, 40, t - 4.9); }
      pw32Frame(v);
    },
  });
}
// ----- END 32-1 Runaway Subway -----

// ----- BEGIN 32-2 Bridge Collapse -----
// A storm over a broken bridge. Bo (the stretchy hero) stretches across the gap like a rubber bridge; Pip (the strong
// hero) carries a bus over Bo's back, Bo sags under the weight, then boings back to the other side and they cheer.
{
  definePreview('Bridge Collapse', {
    blurb: 'Save the bridge in a storm! The stretchy hero spans the gaps, the strong hero carries the bus across.',
    loop: 6, still: 2.6,
    draw(v, t) {
      const c = v.ctx, e = v.ease, deck = 128, a = 120, b = 200;
      pw32Sky(v, t, { dusk: true, base1: 120, base2: 128 });
      // a jagged lightning bolt now and then
      if (v.phase(t, 6) > 0.6 && v.phase(t, 6) < 0.66) { c.beginPath(); c.moveTo(250, 0); c.lineTo(236, 34); c.lineTo(246, 34); c.lineTo(228, 70); c.lineTo(258, 28); c.lineTo(248, 28); c.lineTo(262, 0); c.closePath(); pw32Ink(v, '#fff36a', 1.3); }
      // rain: slanted white and ink strokes
      for (let i = 0; i < 30; i++) { const x = (v.rand(i) * v.W + t * 60) % v.W, y = (v.rand(i + 9) * v.H + t * 260) % v.H; v.line(x, y, x - 3, y + 9, i % 3 ? '#ffffff' : pw32INK, 1); }
      // the river far below, deep blue with white wave crests
      c.fillStyle = '#1f56c0'; c.fillRect(0, 150, v.W, 30); pw32Dots(v, 0, v.W, 180, 158, '#123a8e', 5);
      c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.beginPath(); for (let k = 0; k < 8; k++) { const x = (k * 46 + t * 20) % (v.W + 20) - 10; c.moveTo(x, 160 + (k % 2) * 8); c.quadraticCurveTo(x + 5, 156 + (k % 2) * 8, x + 10, 160 + (k % 2) * 8); } c.stroke();
      // red cables and the teal deck with a gap
      for (const [x1, y1, x2, y2] of [[0, 60, a, deck - 4], [b, deck - 4, v.W, 60]]) { v.line(x1, y1, x2, y2, pw32INK, 4.5); v.line(x1, y1, x2, y2, '#e8222e', 2.2); }
      for (const [x0, x1] of [[0, a], [b, v.W]]) {
        pw32Box(v, x0, deck, x1 - x0, 10, '#ffe9a0', 1.3);
        pw32Box(v, x0, deck + 10, x1 - x0, 12, '#19a89a', 1.3);
        c.strokeStyle = pw32INK; c.lineWidth = 1.2; c.beginPath(); for (let x = x0; x < x1; x += 12) { c.moveTo(x, deck + 10); c.lineTo(x + 6, deck + 22); c.lineTo(x + 12, deck + 10); } c.stroke();
      }
      // Bo stretches across (0.6-1.2), holds while Pip crosses (1.6-3.8), boings back (4.0-4.4)
      const st = e.out(v.seg(t, 0.6, 1.2)), back = e.inOut(v.seg(t, 4.0, 4.4)), span = st * (1 - back);
      const busX = t < 1.6 ? 70 : t < 3.8 ? v.lerp(70, 250, e.inOut(v.seg(t, 1.6, 3.8))) : 250;
      const on = busX > a - 10 && busX < b + 10, sag = on ? Math.sin(v.clamp((busX - a) / (b - a), 0, 1) * Math.PI) * 9 : 2;
      if (span > 0.02) {
        const x1 = v.lerp(a, b, span);
        c.lineCap = 'round';
        c.beginPath(); c.moveTo(a - 4, deck + 2); c.quadraticCurveTo((a + x1) / 2, deck + 2 + sag * 2 * span, x1, deck + 2);
        c.strokeStyle = pw32INK; c.lineWidth = 12; c.stroke(); c.strokeStyle = v.c.bo; c.lineWidth = 8; c.stroke();
        c.setLineDash([4, 7]); c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.stroke(); c.setLineDash([]);
        v.circle(x1, deck + 2, 6); pw32Ink(v, v.c.bo, 1.2);
        pw32Hero(v, 1, a - 6, deck + 8, { s: 0.55, face: 1, rot: -1.2, mood: on ? 'grit' : 'happy', shadow: false });
      } else {
        const bx = back > 0 ? v.lerp(a - 6, b + 20, back) : a - 14;
        pw32Hero(v, 1, bx, deck + (back > 0 && back < 1 ? v.hop(back, 30) : 0), { s: 0.6, face: 1, mood: t > 4.4 ? 'joy' : 'happy' });
      }
      // the yellow bus over Pip's head
      const px = busX, py = deck + (on ? sag * 0.9 : 0);
      pw32Hero(v, 0, px, py, { s: 0.6, face: 1, sq: 0.15, mood: 'grit' });
      for (const d of [-1, 1]) { v.line(px + d * 5, py - 11, px + d * 8, py - 24, pw32INK, 4); v.line(px + d * 5, py - 11, px + d * 8, py - 24, v.c.pip, 2); }
      v.rr(px - 30, py - 46, 60, 22, 4); pw32Ink(v, '#ffe14a', 1.4);
      for (let x = px - 26; x < px + 22; x += 12) pw32Box(v, x, py - 42, 9, 7, '#7af0ff', 0.8);
      for (const d of [-18, 18]) { v.circle(px + d, py - 23, 4); pw32Ink(v, '#3a3fb8', 1); }
      if (t > 1.0 && t < 1.7) pw32Word(v, 'Stretch!', 160, deck - 30, 15, '#7af0ff');
      if (t > 4.0 && t < 4.5) pw32Comic(v, 200, deck - 40, 'BOING!', 1);
      if (t > 4.6) { pw32Word(v, 'Across!', 230, 40, 17, '#ffe14a'); v.confetti(230, 50, t - 4.6); }
      pw32Frame(v);
    },
  });
}
// ----- END 32-2 Bridge Collapse -----

// ----- BEGIN 32-3 Rooftop Chase -----
// Moonlit rooftops and a jewel thief running away. Pip shoots a web line to a hook over the gap, Bo holds on, and they
// swing across together ("Thwip!"), then Bo turns them both see-through to sneak under a guard drone's beam.
{
  definePreview('Rooftop Chase', {
    blurb: 'Chase the jewel thief over the rooftops! Web-swing across gaps and turn invisible past guard drones.',
    loop: 6.4, still: 2.2,
    draw(v, t) {
      const c = v.ctx, e = v.ease, r1 = 128, r2 = 120, ga = 110, gb = 190, hookX = 150, hookY = 26;
      pw32Sky(v, t, { moonX: 60 });
      // the two roofs: brick red and steel blue, inked, with yellow windows and a light cornice
      for (const [x0, x1, top, col, hi] of [[0, ga, r1, '#d8472c', '#ff8a5a'], [gb, v.W, r2, '#3e7fb0', '#8cc4e8']]) {
        pw32Box(v, x0, top, x1 - x0, v.H - top + 4, col, 1.5);
        for (let y = top + 12; y < v.H; y += 16) for (let x = x0 + 8; x < x1 - 8; x += 16) pw32Box(v, x, y, 7, 9, v.rand(x + y) > 0.5 ? '#ffe14a' : '#16307a', 0.7);
        pw32Box(v, x0 - 2, top - 3, x1 - x0 + 4, 5, hi, 1.3);
      }
      // the hook: a flagpole with a ring
      v.line(ga - 6, hookY + 30, hookX, hookY, pw32INK, 4); v.line(ga - 6, hookY + 30, hookX, hookY, '#d8dcf0', 2);
      v.circle(hookX, hookY + 2, 3.5); c.strokeStyle = pw32INK; c.lineWidth = 3; c.stroke(); c.strokeStyle = '#ffe14a'; c.lineWidth = 1.5; c.stroke();
      // the thief runs off to the right: striped shirt, mask, loot sack
      const tx = v.lerp(250, 340, v.seg(t, 0, 6.4));
      v.circle(tx - 9, r2 - 15, 5); pw32Ink(v, '#e08a2e', 0.9);
      v.rr(tx - 6, r2 - 16, 12, 12, 3); pw32Ink(v, '#ffffff', 0.9); c.fillStyle = pw32INK; for (let k = 0; k < 3; k++) c.fillRect(tx - 5, r2 - 14 + k * 3.5, 10, 1.6);
      v.circle(tx, r2 - 20, 5); pw32Ink(v, '#f2c8a0', 0.9); c.fillStyle = pw32INK; c.fillRect(tx - 5, r2 - 22, 10, 2.5);
      // the swing: web 0.6, swing 1.2-2.6, land; drone sneak 3.6-5.6
      const sw = v.seg(t, 1.2, 2.6), th = v.lerp(-0.85, 0.8, e.inOut(sw)), len = 98;
      let pX = 92, pY = r1, bX = 72, bY = r1, inv = 0;
      if (t >= 1.2 && t < 2.6) { pX = hookX + Math.sin(th) * len; pY = hookY + Math.cos(th) * len + 12; bX = pX - 4; bY = pY + 14; }
      else if (t >= 2.6) {
        const w = v.seg(t, 3.6, 5.6); pX = v.lerp(214, 290, w); bX = pX - 22; pY = bY = r2;
        inv = t > 3.4 && t < 5.8 ? 1 : 0;
      }
      if (t > 0.6 && t < 2.6) { const x0 = t < 1.2 ? 96 : pX, y0 = t < 1.2 ? r1 - 18 : pY - 18; v.line(x0, y0, hookX, hookY + 2, pw32INK, 3.5); v.line(x0, y0, hookX, hookY + 2, '#ffffff', 1.6); }
      // the drone and its dotted beam
      const dx = 250 + Math.sin(t * 1.5) * 20;
      c.save(); c.beginPath(); c.moveTo(dx, 52); c.lineTo(dx - 24, r2); c.lineTo(dx + 24, r2); c.closePath(); c.globalAlpha = 0.3; c.fillStyle = '#d6f4ff'; c.fill(); c.clip(); c.globalAlpha = 0.7; pw32Dots(v, dx - 30, dx + 30, 52, r2, '#d6f4ff', 6); c.restore();
      v.line(dx - 16, 42, dx - 6, 42, pw32INK, 3); v.line(dx + 6, 42, dx + 16, 42, pw32INK, 3);
      v.rr(dx - 12, 44, 24, 9, 4); pw32Ink(v, '#3a4478', 1.2); v.circle(dx, 50, 2.5); pw32Ink(v, inv ? '#5ff07a' : '#ff3b30', 0.7);
      pw32Hero(v, 1, bX, bY, { s: 0.6, face: 1, alpha: inv ? 0.35 : 1, mood: inv ? 'blink' : 'happy' });
      pw32Hero(v, 0, pX, pY, { s: 0.6, face: 1, fly: t > 1.2 && t < 2.6 ? 1 : 0, alpha: inv ? 0.35 : 1, mood: t > 1.2 && t < 2.6 ? 'joy' : 'happy' });
      if (inv) { c.setLineDash([3, 3]); v.line(bX + 6, bY - 9, pX - 6, pY - 9, '#d6f4ff', 1.6); c.setLineDash([]); }
      if (t > 0.6 && t < 1.2) pw32Word(v, 'Thwip!', 120, r1 - 42, 17, '#ffffff');
      if (t > 2.6 && t < 3.3) pw32Word(v, 'Made it!', 214, r2 - 42, 15, '#ffe14a');
      if (inv) pw32Word(v, 'Shh...', pX - 10, r2 - 42, 14, '#7af0ff');
      pw32Frame(v);
    },
  });
}
// ----- END 32-3 Rooftop Chase -----

// ----- BEGIN 32-4 Power Punch Showdown -----
// A rooftop brawl at night. A power-up floats down on a parachute; Bo grabs it and gets giant fists, Pip lands a quick
// "POW!", then Bo's giant punch sends Pip flying ("KA-POW!") and Bo cheers. The neon sign blinks behind them.
{
  definePreview('Power Punch Showdown', {
    blurb: 'Rooftop brawl! Punch, block and grab power-ups. Knock your rival off the roof to win the round.',
    loop: 6, still: 3.4,
    draw(v, t) {
      const c = v.ctx, e = v.ease, roof = 140, GLOVE = ['#2fc45a', '#ffe14a'];
      pw32Sky(v, t, { moonX: 280, base1: 140, base2: 150 });
      // the roof: a steel-blue building with yellow windows, a cream roof edge
      pw32Box(v, 30, roof, 260, v.H - roof + 4, '#3e7fb0', 1.5);
      for (let y = roof + 12; y < v.H; y += 16) for (let x = 40; x < 280; x += 18) pw32Box(v, x, y, 8, 9, v.rand(x * 2 + y) > 0.5 ? '#ffe14a' : '#16307a', 0.7);
      pw32Box(v, 26, roof - 3, 268, 6, '#fff3a8', 1.4);
      for (const x of [26, 286]) { v.circle(x + 4, roof - 10, 3); pw32Ink(v, Math.sin(t * 5 + x) > 0 ? '#ff3b30' : '#6a1410', 1); }
      // the HERO CITY sign: an inked neon billboard on two poles
      const on = Math.sin(t * 3) > -0.7;
      for (const x of [140, 180]) { v.line(x, 82, x, roof, pw32INK, 5); v.line(x, 82, x, roof, '#19a89a', 2.5); }
      pw32Box(v, 126, 48, 68, 34, '#1c2470', 1.6);
      if (on) { c.strokeStyle = '#ff5ab4'; c.lineWidth = 2; c.strokeRect(130, 52, 60, 26); }
      pw32Word(v, 'HERO', 160, 59, 12, on ? '#ffd0f4' : '#5a3a6a', 0); pw32Word(v, 'CITY', 160, 72, 11, on ? '#7af0ff' : '#2a4a6a', 0);
      // the power-up drops (0.3-1.5) on an inked parachute and Bo takes it (1.8)
      const oy = v.lerp(-10, roof - 10, v.seg(t, 0.3, 1.5)), ox = 200;
      if (t < 1.8) {
        if (t < 1.5) { v.line(ox - 10, oy - 16, ox - 3, oy - 5, '#fff', 1); v.line(ox + 10, oy - 16, ox + 3, oy - 5, '#fff', 1); c.beginPath(); c.arc(ox, oy - 16, 10, Math.PI, 0); c.closePath(); pw32Ink(v, '#ff6a5a', 1.1); }
        v.circle(ox, oy, 7); pw32Ink(v, '#1c2470', 1.2); v.circle(ox, oy, 3.5); pw32Ink(v, '#ff6a5a', 0.6);
      }
      if (t > 1.8 && t < 2.4) pw32Word(v, 'Giant fists!', 214, roof - 50, 14, '#ff6a5a');
      // Pip: punches at 2.6 ("POW!"), gets KA-POWed at 3.6 and flies off left, comes back for the next loop
      const hit = v.seg(t, 3.6, 4.6);
      let pipX = v.lerp(90, 150, e.out(v.seg(t, 0.2, 2.4))), pipY = roof, rot = 0;
      if (t > 3.6) { pipX = v.lerp(150, 10, e.out(hit)); pipY = roof + v.hop(hit, 60); rot = -hit * 4; }
      if (t > 5.2) { pipX = v.lerp(-10, 90, v.seg(t, 5.2, 6)); pipY = roof; rot = 0; }
      const boX = t < 1.8 ? v.lerp(250, ox, v.seg(t, 1.0, 1.8)) : v.lerp(ox, 176, v.seg(t, 2.0, 2.4));
      const boHurt = t > 2.6 && t < 3.0;
      pw32Hero(v, 1, boX + (boHurt ? 6 : 0), roof, { s: 0.7, face: -1, mood: boHurt ? 'dizzy' : t > 4.2 ? 'joy' : 'grit', rot: boHurt ? 0.25 : 0 });
      pw32Hero(v, 0, pipX, pipY, { s: 0.7, face: 1, rot, mood: t > 3.6 && t < 5.2 ? 'dizzy' : 'grit' });
      // boxing gloves in each hero's glove colour, inked
      const pPunch = t > 2.5 && t < 2.8, bPunch = t > 3.4 && t < 3.8, giant = t > 1.8 && t < 5.2;
      if (t < 3.6 || t > 5.2) { v.circle(pipX + (pPunch ? 22 : 9), roof - 10, 4); pw32Ink(v, GLOVE[0], 0.9); }
      v.circle(boX - (bPunch ? 30 : 10), roof - 11, giant ? 8 : 4); pw32Ink(v, GLOVE[1], giant ? 1.3 : 0.9);
      if (t > 2.6 && t < 3.1) pw32Comic(v, 176, roof - 40, 'POW!', 0.9);
      if (t > 3.6 && t < 4.3) pw32Comic(v, 140, roof - 46, 'KA-POW!', 1.2, '#ffd23a');
      if (t > 4.4 && t < 5.2) { pw32Word(v, 'Bo wins the round!', 160, 30, 16, v.c.bo); v.confetti(boX, roof - 40, t - 4.4); }
      pw32Frame(v);
    },
  });
}
// ----- END 32-4 Power Punch Showdown -----
