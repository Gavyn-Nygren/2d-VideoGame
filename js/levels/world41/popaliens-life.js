/* Pip & Bo - World 41, 41-4 Paper Alien Invasion: the life on the page itself.
   Loaded on demand with the 3D kit, before popaliens-scene.js. Drawing only: nothing here feeds back into the rules.

   The reader has been doodling in this margin for years, and the doodles have come alive:
   - the page is coloured in: soft coloured-pencil meadows, highlighter swathes over the printed words, and doodles
     drawn flat on the paper (a sun with a face, hopscotch, hearts, a rainbow, a snail, a rocket, footprints, an
     arrow saying "this way") (PALIFE.paintBig, called from the scene's big print);
   - a meadow of pop-up doodle cards stands up off the page (grass, daisies, tulips, mushrooms, ferns, lollipop trees,
     pines, sunflowers, bluebells, little houses, fences): thousands of them, low and sparse on the path, tall and
     thick at the sides; they sway in the draft and bend out of the way as the heroes walk through;
   - little paper folk (stick people) live here: they wave at the heroes, run from the aliens, duck when a grenade
     goes off and jump up and cheer when an alien is crumpled;
   - paper butterflies flutter over the flowers;
   - a stream of blue fountain-pen ink winds across the page (twice across the path), with paper boats bobbing down it;
   - sticky notes with a curled corner, strips of washi tape, gold star stickers, and glitter that twinkles in the lamp.

   PALIFE.paintBig(c, X, Z, ppu)  paints the flat colour into the scene's big print canvas (under the printed words)
   PALIFE.build(K, st)            adds it all (called from PASCENE.build)
   PALIFE.update(K, st, dt, t)    every drawn frame (called from PASCENE.draw)
   PALIFE.nearStream(x, z)        how far a spot is from the middle of the ink stream (the scenery keeps notes out of it)
*/
'use strict';

const PALIFE = (function () {
  const T = K3D.T, P = POPUP;
  const L = {};
  const U = { wind: { value: 0 }, hero: { value: new T.Vector4(999, 999, 999, 999) } };
  const v = (x, y, z) => new T.Vector3(x, y, z);
  const TAU = Math.PI * 2;

  /* ---------- the ink stream's course ---------- */
  // from the printed column on the left, across the path near the start, along the right, back across the path, and
  // off down the margin on the left (it keeps clear of the staple wall at z -134)
  const WAY = [[-48, 22], [-30, 13], [-16, 6], [-5, -1], [5, -8], [14, -16], [20.5, -29], [22, -44], [19, -57], [17.5, -69],
    [10, -79], [0, -85.5], [-9.5, -91], [-17, -100], [-21.5, -114], [-21, -130], [-25.5, -148], [-33, -170], [-40, -184]];
  let SP = null;
  function stream() {
    if (SP) return SP;
    const curve = new T.CatmullRomCurve3(WAY.map(([x, z]) => v(x, 0, z)), false, 'centripetal');
    const pts = curve.getSpacedPoints(700), len = curve.getLength();
    SP = { pts, len, w: pts.map((p, i) => 2.3 + 0.55 * Math.sin(i * 0.07) + 0.3 * Math.sin(i * 0.23)) };
    return SP;
  }
  L.nearStream = function (x, z) {
    const s = stream(); let best = 1e9;
    for (let i = 0; i < s.pts.length; i += 2) { const p = s.pts[i], d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z); if (d < best) best = d; }
    return Math.sqrt(best);
  };
  // the index of the stream point nearest a z, scanning from the near end (for placing boats)
  function streamAtZ(z) { const s = stream(); let bi = 0, bd = 1e9; s.pts.forEach((p, i) => { const d = Math.abs(p.z - z); if (d < bd) { bd = d; bi = i; } }); return bi; }

  /* ---------- the flat colour on the page (into the scene's big print, under the printed words) ---------- */
  L.paintBig = function (c, X, Z, PPU) {
    const r = P.rng(303), u = PPU;
    // a noisy blob path
    const blob = (cx, cz, rx, rz, seed) => {
      const rr = P.rng(seed); c.beginPath();
      for (let i = 0; i <= 28; i++) {
        const a = i / 28 * TAU, k = 0.78 + rr() * 0.3;
        const px = X(cx) + Math.cos(a) * rx * u * k, py = Z(cz) + Math.sin(a) * rz * u * k;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.closePath();
    };
    // coloured-pencil hatching inside the current path
    const hatch = (cx, cz, rx, rz, col, alpha, ang, gap) => {
      c.save(); c.clip();
      const R = Math.max(rx, rz) * u * 1.2, x0 = X(cx), y0 = Z(cz), ca = Math.cos(ang), sa = Math.sin(ang);
      c.strokeStyle = col; c.lineCap = 'round';
      for (let d = -R; d < R; d += gap * (0.7 + r() * 0.6)) {
        c.globalAlpha = alpha * (0.6 + r() * 0.6); c.lineWidth = 1.2 + r() * 2.2;
        c.beginPath(); c.moveTo(x0 + ca * -R - sa * d, y0 + sa * -R + ca * d); c.lineTo(x0 + ca * R - sa * d + (r() - 0.5) * 6, y0 + sa * R + ca * d + (r() - 0.5) * 6); c.stroke();
      }
      c.restore(); c.globalAlpha = 1;
    };
    // a crayon line through points (a few jittered passes, so it has the grain of a coloured pencil)
    const crayon = (pts, col, w, alpha = 0.75, close = false) => {
      c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round';
      for (let pass = 0; pass < 3; pass++) {
        c.globalAlpha = alpha * (pass ? 0.45 : 0.8); c.lineWidth = w * u * (pass ? 0.6 : 1);
        c.beginPath();
        pts.forEach(([x, z], i) => { const px = X(x) + (r() - 0.5) * 1.5 * pass, py = Z(z) + (r() - 0.5) * 1.5 * pass; i ? c.lineTo(px, py) : c.moveTo(px, py); });
        if (close) c.closePath();
        c.stroke();
      }
      c.globalAlpha = 1;
    };
    const ring = (cx, cz, rad, n = 40, a0 = 0, a1 = TAU) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rad, cz + Math.sin(a) * rad]; });
    const fillBlob = (cx, cz, rx, rz, col, alpha, seed) => { blob(cx, cz, rx, rz, seed); c.globalAlpha = alpha; c.fillStyle = col; c.fill(); c.globalAlpha = 1; };

    // 1. coloured-pencil meadows: green and gold patches, strong at the sides, faint on the path
    const greens = ['#6fb34a', '#93c452', '#4f9e6e', '#b4cc4c', '#7fbf6a'];
    for (let i = 0; i < 60; i++) {
      const side = i % 3 === 0 ? 0 : (i % 2 ? 1 : -1);
      const cx = side === 0 ? (r() - 0.5) * 18 : side * (10 + r() * 16), cz = 18 - r() * 186;
      const rx = side === 0 ? 2 + r() * 3 : 3.5 + r() * 6, rz = rx * (0.6 + r() * 0.6), col = greens[i % greens.length];
      const a = side === 0 ? 0.2 : 0.42;
      fillBlob(cx, cz, rx * 0.95, rz * 0.95, col, a * 0.45, 900 + i);
      blob(cx, cz, rx, rz, 900 + i); hatch(cx, cz, rx, rz, col, a, 0.7 + r() * 0.3, 5);
      blob(cx, cz, rx * 0.8, rz * 0.8, 950 + i); hatch(cx, cz, rx, rz, col, a * 0.6, -0.6 - r() * 0.3, 7);
      // flowers dotted in the grass: little five-dot rosettes in pink, orange, lilac, yellow, sky blue
      const fl = ['#f07aa0', '#f39a3c', '#b083d8', '#f4d23c', '#6cb4e8'];
      const nf = side === 0 ? 5 : 6 + Math.floor(r() * 8);
      for (let k = 0; k < nf; k++) {
        const fx = cx + (r() - 0.5) * rx * 1.4, fz = cz + (r() - 0.5) * rz * 1.4, fc = fl[Math.floor(r() * fl.length)], fr = 0.18 + r() * 0.16;
        c.fillStyle = fc; c.globalAlpha = 0.8;
        for (let p = 0; p < 5; p++) { const a = p / 5 * TAU; c.beginPath(); c.arc(X(fx + Math.cos(a) * fr), Z(fz + Math.sin(a) * fr), fr * u * 0.7, 0, TAU); c.fill(); }
        c.fillStyle = '#f8e070'; c.beginPath(); c.arc(X(fx), Z(fz), fr * u * 0.5, 0, TAU); c.fill(); c.globalAlpha = 1;
      }
    }
    // 2. highlighter over the printed words (the reader marked the good bits) and two broad scribbled patches
    const hl = [['rgba(255,236,60,0.42)', -2], ['rgba(120,240,140,0.34)', -40.5], ['rgba(255,130,190,0.32)', -85.3], ['rgba(255,236,60,0.42)', -117.3], ['rgba(110,210,255,0.32)', -149.3]];
    for (const [col, z] of hl) {
      c.fillStyle = col; const x0 = X(-66 + r() * 10), x1 = X(-19 - r() * 4), y = Z(z);
      c.beginPath(); c.moveTo(x0, y - 2.6 * u); c.lineTo(x1, y - 2.8 * u); c.lineTo(x1 + 4, y + 0.7 * u); c.lineTo(x0 - 3, y + 0.9 * u); c.closePath(); c.fill();
    }
    for (const [cx, cz, col] of [[13, -70, 'rgba(255,236,60,0.30)'], [-12, -124, 'rgba(255,150,200,0.26)'], [-11, -60, 'rgba(120,230,255,0.22)']]) {
      c.strokeStyle = col; c.lineWidth = 1.1 * u; c.lineCap = 'round';
      c.beginPath(); for (let i = 0; i < 9; i++) { const zz = cz - 2.5 + i * 0.6; c.lineTo(X(cx - 3 + (i % 2) * 6 + r()), Z(zz)); } c.stroke();
    }
    // 3. the ink stream's wet edge: a soft blue bleed and a dark dried tide line soaking into the paper
    const s = stream();
    for (const [extra, col, wid] of [[1.6, 'rgba(70,110,200,0.10)', 1], [0.9, 'rgba(60,90,190,0.16)', 1], [0.2, 'rgba(30,50,130,0.35)', 0.12]]) {
      for (const side of [-1, 1]) {
        c.strokeStyle = col; c.lineWidth = wid * (extra > 0.5 ? extra * 2 : 1) * u; c.lineJoin = 'round';
        c.beginPath();
        s.pts.forEach((p, i) => {
          const q = s.pts[Math.min(i + 1, s.pts.length - 1)], o = s.pts[Math.max(i - 1, 0)], tx = q.x - o.x, tz = q.z - o.z, tl = Math.hypot(tx, tz) || 1;
          const hw = s.w[i] / 2 + (extra > 0.5 ? extra * 0.5 : extra);
          const px = p.x - tz / tl * hw * side, pz = p.z + tx / tl * hw * side;
          i ? c.lineTo(X(px), Z(pz)) : c.moveTo(X(px), Z(pz));
        });
        c.stroke();
      }
    }
    // 4. doodles drawn flat on the page in coloured pencil
    // footprints: someone small walked all the way up the margin
    for (let i = 0; i < 70; i++) {
      const z = 14 - i * 2.6, x = Math.sin(i * 0.17) * 6 + Math.sin(i * 0.05) * 4 + (i % 2 ? 0.45 : -0.45);
      c.fillStyle = 'rgba(120,80,50,0.28)'; c.beginPath(); c.ellipse(X(x), Z(z), 0.22 * u, 0.36 * u, Math.sin(i * 0.17) * 0.3, 0, TAU); c.fill();
      c.beginPath(); c.arc(X(x), Z(z - 0.48), 0.14 * u, 0, TAU); c.fill();
    }
    // a sun with a face
    crayon(ring(-8, 7, 2.1), '#f39a2c', 0.24, 0.8, true);
    blob(-8, 7, 2.0, 2.0, 77); hatch(-8, 7, 2, 2, '#f6c63a', 0.6, 0.8, 4);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; crayon([[-8 + Math.cos(a) * 2.6, 7 + Math.sin(a) * 2.6], [-8 + Math.cos(a) * 3.6, 7 + Math.sin(a) * 3.6]], '#f39a2c', 0.2); }
    crayon([[-8.7, 6.4], [-8.7, 6.5]], '#5a3a20', 0.28); crayon([[-7.3, 6.4], [-7.3, 6.5]], '#5a3a20', 0.28);
    crayon(ring(-8, 7.1, 1.1, 14, 0.3, Math.PI - 0.3), '#5a3a20', 0.16);
    // hopscotch
    const hop = [[0, 0], [0, -1], [-0.5, -2], [0.5, -2], [0, -3], [-0.5, -4], [0.5, -4], [0, -5]];
    hop.forEach(([hx, hz], i) => {
      const cx = 6 + hx * 2.4, cz = -9 + hz * 1.2;
      crayon([[cx - 0.6, cz - 0.6], [cx + 0.6, cz - 0.6], [cx + 0.6, cz + 0.6], [cx - 0.6, cz + 0.6]], '#3f7fd0', 0.13, 0.7, true);
      c.fillStyle = 'rgba(63,127,208,0.75)'; c.font = 'bold ' + Math.round(0.7 * u) + 'px "Comic Sans MS", "Chalkboard", sans-serif'; c.textAlign = 'center'; c.fillText(String(i + 1), X(cx), Z(cz) + 0.25 * u);
    });
    c.textAlign = 'left';
    // a big heart, coloured in
    const heart = (cx, cz, s2, col) => {
      const pts = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, hx = 16 * Math.pow(Math.sin(a), 3), hz = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); pts.push([cx + hx * s2, cz + hz * s2]); }
      c.beginPath(); pts.forEach(([x, z], i) => i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))); c.closePath(); hatch(cx, cz, 18 * s2, 18 * s2, col, 0.55, 0.9, 4);
      crayon(pts, col, 0.16);
    };
    heart(-6, -46, 0.13, '#e2484e'); heart(10.5, -138, 0.08, '#f07aa0'); heart(-12.5, -16, 0.06, '#e2484e');
    // a spiral and a snail
    const spiral = (cx, cz, n, rr, col) => crayon(Array.from({ length: n * 20 }, (_, i) => { const a = i / 20 * TAU, d = rr * i / (n * 20); return [cx + Math.cos(a) * d, cz + Math.sin(a) * d]; }), col, 0.15);
    spiral(9, -52, 3, 2.2, '#9b5fd0');
    spiral(11.5, -6, 2.5, 1.1, '#c0782c'); crayon([[10.3, -5], [13.2, -5], [13.6, -5.6], [13.4, -6.2]], '#7a9a3a', 0.16); crayon([[13.4, -5.8], [14, -6.8]], '#7a9a3a', 0.08); crayon([[13.2, -5.8], [13.3, -7]], '#7a9a3a', 0.08);
    // a rainbow over a cloud
    ['#e2484e', '#f39a2c', '#f4d23c', '#5fb84a', '#3f7fd0', '#8a5fd0'].forEach((col, i) => crayon(ring(4, -121, 4.6 - i * 0.42, 30, Math.PI, TAU), col, 0.36, 0.7));
    for (const [cx, cz] of [[-0.7, -121], [8.7, -121]]) { blob(cx, cz + 0.2, 1.4, 0.8, 31); c.globalAlpha = 0.9; c.fillStyle = '#ffffff'; c.fill(); c.globalAlpha = 1; crayon(ring(cx, cz + 0.2, 1.2, 20), '#7aa0d8', 0.1, 0.6); }
    // a rocket doodle, coloured in
    const rk = [[-8, -75], [-7.1, -77.2], [-7.1, -80], [-8.9, -80], [-8.9, -77.2]];
    c.beginPath(); rk.forEach(([x, z], i) => i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))); c.closePath(); hatch(-8, -77.5, 2, 3, '#e2484e', 0.55, 0.4, 4);
    crayon(rk, '#8a2a2a', 0.13, 0.8, true); crayon(ring(-8, -77.3, 0.45, 14), '#3f7fd0', 0.12);
    crayon([[-8.9, -79.5], [-9.7, -80.6], [-8.9, -80]], '#8a2a2a', 0.12); crayon([[-7.1, -79.5], [-6.3, -80.6], [-7.1, -80]], '#8a2a2a', 0.12);
    for (let i = 0; i < 3; i++) crayon([[-8.5 + i * 0.5, -80.3], [-8.6 + i * 0.5 + (r() - 0.5) * 0.4, -81.6 - r()]], '#f39a2c', 0.12);
    // "this way" with an arrow pointing on up the page
    c.fillStyle = 'rgba(40,120,70,0.8)'; c.font = Math.round(1.3 * u) + 'px "Comic Sans MS", "Chalkboard", sans-serif'; c.fillText('this way!', X(-6.2), Z(-104));
    crayon([[-2, -102.5], [-2, -108.5]], '#2f8a52', 0.18); crayon([[-3, -107.2], [-2, -108.6], [-1, -107.2]], '#2f8a52', 0.18);
    // a smiley flower drawn flat, stars, clouds, a treasure X with a dotted path, noughts and crosses
    for (let p = 0; p < 6; p++) { const a = p / 6 * TAU; blob(8 + Math.cos(a) * 0.9, -104 + Math.sin(a) * 0.9, 0.55, 0.55, 40 + p); hatch(8 + Math.cos(a) * 0.9, -104 + Math.sin(a) * 0.9, 0.6, 0.6, '#f07aa0', 0.6, 0.5, 3); }
    crayon(ring(8, -104, 0.6, 16), '#c0782c', 0.13); crayon([[8, -103.4], [8, -101]], '#5fb84a', 0.14);
    const star = (cx, cz, rr, col) => crayon(Array.from({ length: 11 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? rr * 0.45 : rr; return [cx + Math.cos(a) * d, cz + Math.sin(a) * d]; }), col, 0.13);
    [[-11, -2, '#f4b82c'], [3, -36, '#3f7fd0'], [12.5, -88, '#f4b82c'], [-3.5, -64, '#e2484e'], [-13, -150, '#9b5fd0'], [6, -156, '#f4b82c'], [-4, 12, '#5fb84a']].forEach(([x, z, col]) => star(x, z, 0.9, col));
    for (let i = 0; i < 14; i++) { const t = i / 13; crayon([[-12 + t * 6.5, -58 - t * 6 + Math.sin(t * 6) * 0.6], [-11.7 + t * 6.5, -58.3 - t * 6 + Math.sin(t * 6) * 0.6]], '#c0302c', 0.16); }
    crayon([[-5.9, -63.6], [-4.7, -64.8]], '#c0302c', 0.24); crayon([[-4.7, -63.6], [-5.9, -64.8]], '#c0302c', 0.24);
    for (let i = 0; i < 2; i++) { crayon([[-8.5 + i * 1.2 + 0.6, -141], [-8.5 + i * 1.2 + 0.6, -144.6]], '#4a4a5a', 0.1); crayon([[-8.5, -142.2 - i * 1.2], [-4.9, -142.2 - i * 1.2]], '#4a4a5a', 0.1); }
    crayon(ring(-7.9, -141.6, 0.4, 12), '#3f7fd0', 0.1); crayon([[-5.8, -143], [-5.2, -143.6]], '#e2484e', 0.1); crayon([[-5.2, -143], [-5.8, -143.6]], '#e2484e', 0.1);
    crayon(ring(-6.7, -144.2, 0.4, 12), '#3f7fd0', 0.1);
  };

  /* ---------- the pop-up doodle cards ---------- */
  // a 4 x 4 atlas of doodles, each drawn twice: first as a fat white silhouette (the cut paper edge), then in colour
  // with coloured-pencil grain and a graphite outline
  const DOODLE = ['grass', 'reeds', 'daisy', 'tulip', 'mushroom', 'fern', 'lolly', 'bush', 'puff', 'sunflower', 'bluebell', 'clover', 'spiral', 'house', 'pine', 'fence'];
  function doodleAtlas() {
    return K3D.paint('paDoodles', 1024, 1024, (c) => {
      c.clearRect(0, 0, 1024, 1024);
      DOODLE.forEach((name, i) => {
        const ox = (i % 4) * 256, oy = Math.floor(i / 4) * 256;
        c.save(); c.beginPath(); c.rect(ox + 2, oy + 2, 252, 252); c.clip(); c.translate(ox, oy);
        for (const cut of [true, false]) drawDoodle(c, name, cut, P.rng(500 + i));
        // coloured-pencil grain over the colour
        c.globalCompositeOperation = 'source-atop';
        const r = P.rng(600 + i);
        for (let k = 0; k < 160; k++) { c.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.06)'; c.lineWidth = 1 + r() * 1.5; const x = r() * 256, y = r() * 256; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 18, y - 14); c.stroke(); }
        c.globalCompositeOperation = 'source-over';
        c.restore();
      });
    });
  }
  // draw one doodle in its 256 cell: the base is at y 248, the middle at x 128
  function drawDoodle(c, name, cut, r) {
    const INK = 'rgba(52,46,58,0.92)';
    const fill = (col) => { if (cut) { c.fillStyle = '#ffffff'; c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 14; c.lineJoin = 'round'; c.stroke(); } else { c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.lineJoin = 'round'; c.stroke(); } };
    const line = (col, w) => { if (cut) { c.strokeStyle = '#ffffff'; c.lineWidth = w + 14; } else { c.strokeStyle = col; c.lineWidth = w; } c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); if (!cut && w > 5) { c.strokeStyle = INK; c.lineWidth = 2; } };
    const stem = (x0, y0, x1, y1, bend, col = '#4f9a3a', w = 7) => { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2 + bend, (y0 + y1) / 2, x1, y1); line(col, w); };
    const leaf = (x, y, len, ang, col = '#6fb34a') => {
      c.save(); c.translate(x, y); c.rotate(ang); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -len * 0.35, len, 0); c.quadraticCurveTo(len * 0.5, len * 0.35, 0, 0); fill(col);
      if (!cut) { c.beginPath(); c.moveTo(2, 0); c.lineTo(len * 0.8, 0); c.strokeStyle = 'rgba(40,80,30,0.5)'; c.lineWidth = 1.5; c.stroke(); }
      c.restore();
    };
    const circ = (x, y, rad, col) => { c.beginPath(); c.arc(x, y, rad, 0, TAU); fill(col); };
    const blade = (x, h, bend, col) => { c.beginPath(); c.moveTo(x - 7, 248); c.quadraticCurveTo(x + bend * 0.4, 248 - h * 0.6, x + bend, 248 - h); c.quadraticCurveTo(x + bend * 0.4 + 9, 248 - h * 0.5, x + 7, 248); c.closePath(); fill(col); };
    const petals = (x, y, n, len, wid, col, rot = 0) => { for (let k = 0; k < n; k++) { const a = rot + k / n * TAU; c.beginPath(); c.ellipse(x + Math.cos(a) * len * 0.55, y + Math.sin(a) * len * 0.55, len * 0.5, wid, a, 0, TAU); fill(col); } };
    switch (name) {
      case 'grass': for (let k = 0; k < 8; k++) blade(60 + k * 19 + (r() - 0.5) * 8, 120 + r() * 110, (r() - 0.5) * 60, ['#5fa83e', '#7cc04f', '#4f9a3a', '#93c452'][k % 4]); break;
      case 'reeds':
        for (let k = 0; k < 3; k++) { const x = 90 + k * 36, top = 20 + r() * 40; stem(x, 248, x + (k - 1) * 12, top + 40, (k - 1) * 10, '#6a9a3a', 6); c.beginPath(); c.ellipse(x + (k - 1) * 12, top + 40, 11, 32, (k - 1) * 0.1, 0, TAU); fill('#8a5a32'); }
        blade(80, 200, -40, '#7cb04a'); blade(170, 180, 40, '#5f9a3e'); break;
      case 'daisy':
        stem(128, 248, 124, 90, 14); leaf(126, 190, 60, -0.5); leaf(124, 160, 52, Math.PI + 0.6);
        petals(124, 84, 12, 70, 13, '#ffffff'); circ(124, 84, 20, '#f6c83a'); break;
      case 'tulip':
        stem(128, 248, 128, 100, -8); leaf(128, 236, 90, -1.1, '#5fae5a'); leaf(128, 230, 80, Math.PI + 1.0, '#5fae5a');
        c.beginPath(); c.moveTo(96, 70); c.lineTo(108, 92); c.lineTo(128, 64); c.lineTo(148, 92); c.lineTo(160, 70); c.quadraticCurveTo(166, 128, 128, 132); c.quadraticCurveTo(90, 128, 96, 70); fill('#e8484e'); break;
      case 'mushroom':
        c.beginPath(); c.moveTo(108, 248); c.quadraticCurveTo(102, 170, 112, 140); c.lineTo(146, 140); c.quadraticCurveTo(156, 170, 150, 248); c.closePath(); fill('#f4ead2');
        c.beginPath(); c.moveTo(30, 150); c.quadraticCurveTo(40, 40, 128, 36); c.quadraticCurveTo(216, 40, 226, 150); c.quadraticCurveTo(128, 166, 30, 150); fill('#d8403a');
        if (!cut) for (const [x, y, rr] of [[84, 92, 13], [132, 68, 16], [178, 100, 12], [110, 126, 9], [160, 132, 8]]) { c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fillStyle = '#fff6e8'; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke(); }
        break;
      case 'fern':
        stem(128, 248, 150, 20, -40, '#4f9a3a', 6);
        for (let k = 0; k < 9; k++) { const t = k / 9, y = 240 - t * 210, x = 128 + Math.sin(t * 1.6) * -20 + t * 30, len = 70 * (1 - t * 0.7); leaf(x, y, len, -0.5 - t * 0.3, '#5fae4a'); leaf(x, y, len, Math.PI + 0.5 + t * 0.3, '#6fb84f'); }
        break;
      case 'lolly':
        c.beginPath(); c.moveTo(116, 248); c.lineTo(120, 120); c.lineTo(136, 120); c.lineTo(142, 248); c.closePath(); fill('#9a6a3e');
        circ(128, 96, 86, '#5fae4a');
        if (!cut) { for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(128 + (r() - 0.5) * 100, 96 + (r() - 0.5) * 100, 14 + r() * 10, 0.3, 2.6); c.strokeStyle = 'rgba(40,90,30,0.6)'; c.lineWidth = 3; c.stroke(); } for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(128 + (r() - 0.5) * 110, 96 + (r() - 0.5) * 110, 8, 0, TAU); c.fillStyle = '#e8484e'; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke(); } }
        break;
      case 'bush':
        for (const [x, y, rr] of [[80, 190, 52], [176, 192, 50], [128, 150, 64], [100, 200, 46], [156, 206, 44]]) circ(x, y, rr, '#4f9e6e');
        if (!cut) { for (let k = 0; k < 7; k++) { c.beginPath(); c.arc(70 + r() * 116, 140 + r() * 90, 10 + r() * 8, 0, 4); c.strokeStyle = 'rgba(30,70,40,0.6)'; c.lineWidth = 3; c.stroke(); } for (let k = 0; k < 8; k++) { c.beginPath(); c.arc(70 + r() * 116, 130 + r() * 100, 7, 0, TAU); c.fillStyle = k % 2 ? '#b03a7a' : '#e8484e'; c.fill(); } }
        break;
      case 'puff':
        stem(128, 248, 128, 90, 10, '#6aa040', 6); leaf(128, 236, 70, -0.9);
        circ(128, 80, 58, '#fbf8f0');
        if (!cut) for (let k = 0; k < 22; k++) { const a = k / 22 * TAU; c.beginPath(); c.moveTo(128, 80); c.lineTo(128 + Math.cos(a) * 54, 80 + Math.sin(a) * 54); c.strokeStyle = 'rgba(120,120,130,0.55)'; c.lineWidth = 1.5; c.stroke(); c.beginPath(); c.arc(128 + Math.cos(a) * 54, 80 + Math.sin(a) * 54, 3, 0, TAU); c.fillStyle = 'rgba(120,120,130,0.7)'; c.fill(); }
        break;
      case 'sunflower':
        stem(128, 248, 128, 80, 16, '#4f9a3a', 9); leaf(130, 200, 70, -0.4, '#5fae4a'); leaf(128, 160, 64, Math.PI + 0.4, '#5fae4a');
        petals(128, 76, 16, 82, 13, '#f6c22c'); circ(128, 76, 34, '#7a4a22');
        if (!cut) for (let k = 0; k < 30; k++) { c.beginPath(); c.arc(128 + (r() - 0.5) * 50, 76 + (r() - 0.5) * 50, 2.5, 0, TAU); c.fillStyle = 'rgba(40,20,10,0.6)'; c.fill(); }
        break;
      case 'bluebell':
        stem(110, 248, 170, 50, -70, '#4f9a3a', 6); leaf(110, 240, 90, -1.2); leaf(110, 240, 70, Math.PI + 1.3);
        for (let k = 0; k < 5; k++) { const t = 0.25 + k * 0.17, x = 110 + (170 - 110) * t - 70 * 2 * t * (1 - t) * 0.5 + 12, y = 248 - (248 - 50) * t; c.beginPath(); c.moveTo(x - 16, y + 10); c.quadraticCurveTo(x - 18, y + 46, x - 22, y + 54); c.lineTo(x + 22, y + 54); c.quadraticCurveTo(x + 18, y + 46, x + 16, y + 10); c.quadraticCurveTo(x, y - 2, x - 16, y + 10); fill('#5a7ae0'); }
        break;
      case 'clover':
        stem(128, 248, 128, 140, 0, '#4f9a3a', 6);
        for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k - 1) * 2.1; c.save(); c.translate(128 + Math.cos(a) * 34, 120 + Math.sin(a) * 34); c.rotate(a + Math.PI / 2); c.beginPath(); c.moveTo(0, 30); c.bezierCurveTo(-50, -10, -20, -50, 0, -22); c.bezierCurveTo(20, -50, 50, -10, 0, 30); fill('#5fb84a'); c.restore(); }
        stem(150, 248, 190, 90, 20, '#4f9a3a', 5); circ(192, 80, 26, '#f07aa0');
        break;
      case 'spiral':
        stem(128, 248, 124, 120, -10, '#4f9a3a', 6); leaf(126, 210, 60, -0.6);
        circ(124, 80, 56, '#b083d8');
        if (!cut) { c.beginPath(); for (let k = 0; k < 80; k++) { const a = k / 80 * TAU * 3, d = 4 + k * 0.62; c.lineTo(124 + Math.cos(a) * d, 80 + Math.sin(a) * d); } c.strokeStyle = 'rgba(80,40,120,0.85)'; c.lineWidth = 3.5; c.stroke(); }
        break;
      case 'house':
        c.beginPath(); c.rect(52, 130, 152, 118); fill('#f4e2b8');
        c.beginPath(); c.moveTo(36, 136); c.lineTo(128, 40); c.lineTo(220, 136); c.closePath(); fill('#d8483e');
        c.beginPath(); c.rect(164, 52, 22, 50); fill('#a8583e');
        c.beginPath(); c.rect(108, 180, 38, 68); fill('#6a8ad0');
        c.beginPath(); c.rect(66, 154, 30, 30); fill('#fff2a8'); c.beginPath(); c.rect(162, 154, 30, 30); fill('#fff2a8');
        if (!cut) { c.beginPath(); c.moveTo(81, 154); c.lineTo(81, 184); c.moveTo(66, 169); c.lineTo(96, 169); c.moveTo(177, 154); c.lineTo(177, 184); c.moveTo(162, 169); c.lineTo(192, 169); c.strokeStyle = INK; c.lineWidth = 2; c.stroke(); c.beginPath(); c.arc(138, 216, 3, 0, TAU); c.fillStyle = INK; c.fill(); c.beginPath(); c.moveTo(175, 46); c.quadraticCurveTo(160, 30, 180, 20); c.quadraticCurveTo(200, 10, 186, 4); c.strokeStyle = 'rgba(120,120,130,0.6)'; c.lineWidth = 3; c.stroke(); }
        break;
      case 'pine':
        c.beginPath(); c.rect(116, 200, 24, 48); fill('#8a5a32');
        c.beginPath(); c.moveTo(128, 8); for (let k = 0; k < 4; k++) { const y = 60 + k * 46, w = 40 + k * 22; c.lineTo(128 + w, y); c.lineTo(128 + w * 0.45, y - 4); } c.lineTo(128 + 112, 210); c.lineTo(128 - 112, 210);
        for (let k = 3; k >= 0; k--) { const y = 60 + k * 46, w = 40 + k * 22; c.lineTo(128 - w * 0.45, y - 4); c.lineTo(128 - w, y); } c.closePath(); fill('#3f8a5a');
        break;
      case 'fence':
        for (let k = 0; k < 4; k++) { const x = 46 + k * 56; c.beginPath(); c.moveTo(x - 16, 248); c.lineTo(x - 16, 118); c.lineTo(x, 96); c.lineTo(x + 16, 118); c.lineTo(x + 16, 248); c.closePath(); fill('#fbf3dc'); }
        c.beginPath(); c.rect(22, 140, 212, 18); fill('#f0e2bc'); c.beginPath(); c.rect(22, 200, 212, 18); fill('#f0e2bc');
        break;
    }
  }
  // per-kind world height range and where it grows: 'path' (short things allowed on the walked path), 'side', 'far'
  const KIND = {
    grass: [0.45, 0.8, 'path'], reeds: [1.1, 1.8, 'bank'], daisy: [0.55, 0.9, 'path'], tulip: [0.55, 0.85, 'path'],
    mushroom: [0.45, 1.1, 'path'], fern: [0.8, 1.3, 'side'], lolly: [2.2, 3.8, 'far'], bush: [0.9, 1.5, 'side'],
    puff: [0.6, 1.0, 'path'], sunflower: [1.6, 2.6, 'side'], bluebell: [0.5, 0.8, 'path'], clover: [0.35, 0.55, 'path'],
    spiral: [0.6, 1.0, 'path'], house: [1.4, 2.2, 'far'], pine: [2.2, 3.6, 'far'], fence: [0.7, 0.9, 'side'],
  };

  // the shader bits: pick a cell of an atlas per instance (aCell: column, row, flip), and (for the meadow) sway in
  // the draft and bend away from the heroes
  const BEND = `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
mvPosition = instanceMatrix * mvPosition;
vec3 lfRoot = instanceMatrix[3].xyz;
float lfSz = length(instanceMatrix[1].xyz);
float lfK = position.y * position.y;
float lfPh = lfRoot.x * 0.37 + lfRoot.z * 0.23;
vec2 lfSway = vec2(sin(uWind * 1.3 + lfPh) * 0.09 + sin(uWind * 2.7 + lfPh * 1.3) * 0.04, sin(uWind * 1.1 + lfPh * 0.7) * 0.05) * min(lfSz, 2.5);
vec2 lfD0 = lfRoot.xz - uHero.xy, lfD1 = lfRoot.xz - uHero.zw;
vec2 lfPush = normalize(lfD0 + 1e-4) * smoothstep(1.9, 0.25, length(lfD0)) + normalize(lfD1 + 1e-4) * smoothstep(1.9, 0.25, length(lfD1));
float lfPl = min(length(lfPush), 1.0);
lfPush = normalize(lfPush + 1e-5) * lfPl;
mvPosition.xz += (lfSway + lfPush * 0.8 * min(lfSz, 1.6)) * lfK;
mvPosition.y -= lfPl * lfK * 0.4 * min(lfSz, 1.6);
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`;
  function atlasMat(mat, cols, rows, bend, tag) {
    mat.onBeforeCompile = sh => {
      if (bend) { sh.uniforms.uWind = U.wind; sh.uniforms.uHero = U.hero; }
      let vs = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aCell;' + (bend ? '\nuniform float uWind;\nuniform vec4 uHero;' : ''));
      vs = vs.replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\n{ vec2 uu = uv; if (aCell.z > 0.5) uu.x = 1.0 - uu.x;\n  vMapUv = vec2((aCell.x + uu.x) / ' + cols + '.0, 1.0 - (aCell.y + 1.0 - uu.y) / ' + rows + '.0); }\n#endif');
      if (bend) vs = vs.replace('#include <project_vertex>', BEND);
      sh.vertexShader = vs;
    };
    mat.customProgramCacheKey = () => 'palife-' + tag + cols + 'x' + rows + (bend ? 'b' : '');
    return mat;
  }
  function depthFor(map, cols, rows, bend, tag) {
    const d = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map, alphaTest: 0.5 });
    return atlasMat(d, cols, rows, bend, tag + 'd');
  }
  // a card: two quads back to back (each shows the doodle the right way round), normals straight up so the lamp lights
  // them like the page they stand on
  function cardGeo() {
    return K3D.geo('paLifeCard', () => {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0, 0.5, 0, 0, -0.5, 0, 0, -0.5, 1, 0, 0.5, 1, 0], 3));
      g.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1], 2));
      g.setAttribute('normal', new T.Float32BufferAttribute(Array.from({ length: 8 }, () => [0, 1, 0]).flat(), 3));
      g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
      return g;
    });
  }
  // o (the later stretches): { z0, z1, n, seed, ok(x, z, big) -> may it grow here, zone(x, z) -> 'path' | 'side' | 'far' }
  function meadow(K, o = {}) {
    const r = P.rng(o.seed || 4242), solids = PA_ROUTE.solids, N = o.n || 6400, z0 = o.z0 != null ? o.z0 : 20, z1 = o.z1 != null ? o.z1 : -172;
    const list = [];
    const blocked = (x, z, pad) => solids.some(s => Math.abs(x - s.x) < s.w / 2 + pad && Math.abs(z - s.z) < s.d / 2 + pad) || Math.abs(x + 27) < 2 && Math.abs(z + 88) < 9;
    const pick = (zone) => { const ks = DOODLE.filter(k => zone === 'path' ? KIND[k][2] === 'path' : zone === 'side' ? KIND[k][2] !== 'far' && KIND[k][2] !== 'bank' : true); return ks[Math.floor(r() * ks.length)]; };
    const add = (name, x, z, sc = 1) => {
      const [h0, h1] = KIND[name], h = (h0 + r() * (h1 - h0)) * sc;
      list.push({ i: DOODLE.indexOf(name), x, z, h, yaw: (r() - 0.5) * 0.9, flip: r() < 0.5 });
    };
    // grown in clumps (a few of a kind together), like a doodled garden
    let tries = 0;
    while (list.length < N && tries++ < N * 7) {
      const cx = -42 + r() * 72, cz = z0 - r() * (z0 - z1), ax = Math.abs(cx);
      const zone = o.zone ? o.zone(cx, cz) : ax < 10.5 ? 'path' : ax < 17 ? 'side' : 'far';
      if (!zone) continue;
      // the path stays mostly open (short things, thinly), the sides grow thick
      if (zone === 'path' && r() < 0.55) continue;
      const ds = L.nearStream(cx, cz);
      if (ds < 1.9) continue;
      const kind = ds < 3.4 && r() < 0.6 ? (r() < 0.6 ? 'reeds' : 'grass') : pick(zone);
      const n = kind === 'house' || kind === 'lolly' || kind === 'pine' ? 1 : zone === 'path' ? 1 + Math.floor(r() * 3) : 3 + Math.floor(r() * 6);
      for (let k = 0; k < n; k++) {
        const x = cx + (r() - 0.5) * (n > 1 ? 2.2 : 0), z = cz + (r() - 0.5) * (n > 1 ? 2.2 : 0);
        const big = kind === 'house' || kind === 'lolly' || kind === 'pine';
        if (blocked(x, z, big ? 1.6 : 0.35)) continue;
        if (o.ok && !o.ok(x, z, big)) continue;
        if (Math.abs(x) > 29.5) continue;
        if (L.nearStream(x, z) < 1.7) continue;
        // in the middle of the path only small things, a little smaller still
        add((o.zone ? zone === 'path' : Math.abs(x) < 10.5) && KIND[kind][2] !== 'path' ? 'grass' : kind, x, z, Math.abs(x) < 6 ? 0.8 : 1);
      }
    }
    // fences along a few spots at the sides, houses in little villages
    for (const [vx, vz] of o.villages || (o.z0 != null ? [] : [[-21, -22], [19, -96], [-23, -70], [24, -150], [-19, 4]])) {
      for (let k = 0; k < 3; k++) { const x = vx + (k - 1) * 3.4 + (r() - 0.5), z = vz + (r() - 0.5) * 4; if (L.nearStream(x, z) > 2.4) add('house', x, z); }
      for (let k = 0; k < 4; k++) { const x = vx - 5 + k * 0.85 * 1.0, z = vz + 3.2; if (L.nearStream(x, z) > 2) list.push({ i: 15, x, z, h: 0.8, yaw: 0, flip: false }); }
    }
    const atlas = doodleAtlas();
    const mat = atlasMat(K3D.toon('#ffffff', { map: atlas, alphaTest: 0.5 }), 4, 4, true, 'm');
    const m = new T.InstancedMesh(cardGeo(), mat, list.length);
    const cell = new T.InstancedBufferAttribute(new Float32Array(list.length * 3), 3);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
    list.forEach((d, i) => {
      e.set(0, d.yaw, 0); q.setFromEuler(e); m4.compose(v(d.x, 0, d.z), q, v(d.h, d.h, d.h)); m.setMatrixAt(i, m4);
      cell.setXYZ(i, d.i % 4, Math.floor(d.i / 4), d.flip ? 1 : 0);
      // a touch of variety in colour: some faded, some bright
      const b = 0.88 + r() * 0.14; m.setColorAt(i, new T.Color(b, b, b * (0.96 + r() * 0.06)));
    });
    m.geometry = m.geometry.clone(); m.geometry.setAttribute('aCell', cell);
    m.customDepthMaterial = depthFor(atlas, 4, 4, true, 'm');
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    K.add(m);
    return m;
  }

  /* ---------- the paper folk ---------- */
  // 8 poses in a row, two rows (a pointy hat; a bow and a skirt); every pose faces right (flipped in the shader)
  const POSE = {
    stand: { la: [44, 150], ra: [84, 150], ll: [52, 240], rl: [76, 240] },
    wave1: { la: [44, 150], ra: [100, 44], ll: [52, 240], rl: [76, 240] },
    wave2: { la: [44, 150], ra: [112, 70], ll: [52, 240], rl: [76, 240] },
    cheer: { la: [26, 50], ra: [102, 50], ll: [40, 240], rl: [88, 240] },
    run1: { la: [88, 118], ra: [40, 150], ll: [96, 236], rl: [34, 222], lean: 10 },
    run2: { la: [40, 118], ra: [92, 150], ll: [58, 240], rl: [76, 232], lean: 10 },
    duck: { la: [40, 112], ra: [88, 112], ll: [40, 240], rl: [88, 240], low: 46 },
    jump: { la: [30, 40], ra: [98, 40], ll: [44, 220], rl: [84, 220], up: -10 },
  };
  const POSES = ['stand', 'wave1', 'wave2', 'cheer', 'run1', 'run2', 'duck', 'jump'];
  function folkAtlas() {
    return K3D.paint('paFolk', 1024, 512, (c) => {
      c.clearRect(0, 0, 1024, 512);
      for (let row = 0; row < 2; row++) POSES.forEach((pn, f) => {
        const p = POSE[pn], ox = f * 128, oy = row * 256, low = p.low || 0, up = p.up || 0, lean = p.lean || 0;
        const head = [64 + lean, 64 + low + up], neck = [64 + lean * 0.8, 92 + low + up], hip = [64, 166 + low * 0.6 + up];
        const arm = (h) => [h[0], h[1] + (p.low ? low * 0.2 : 0)];
        for (const cut of [true, false]) {
          c.save(); c.translate(ox, oy); c.lineCap = 'round'; c.lineJoin = 'round';
          const S = (col, w) => { c.strokeStyle = cut ? '#ffffff' : col; c.lineWidth = cut ? w + 14 : w; c.stroke(); };
          const F = (col) => { if (cut) { c.fillStyle = '#ffffff'; c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 14; c.stroke(); } else { c.fillStyle = col; c.fill(); c.strokeStyle = 'rgba(40,36,48,0.95)'; c.lineWidth = 4; c.stroke(); } };
          const G2 = 'rgba(40,36,48,0.95)';
          // body, legs, arms
          c.beginPath(); c.moveTo(...neck); c.lineTo(...hip); S(G2, 7);
          c.beginPath(); c.moveTo(...hip); c.lineTo(p.ll[0], p.ll[1] + up); c.moveTo(...hip); c.lineTo(p.rl[0], p.rl[1] + up); S(G2, 7);
          c.beginPath(); c.moveTo(neck[0], neck[1] + 10); c.lineTo(...arm(p.la)); c.moveTo(neck[0], neck[1] + 10); c.lineTo(...arm(p.ra)); S(G2, 6);
          if (row === 1) { c.beginPath(); c.moveTo(hip[0] - 26, hip[1] + 26); c.lineTo(hip[0] + 26, hip[1] + 26); c.lineTo(hip[0], hip[1] - 30); c.closePath(); F('#f07aa0'); }
          else { c.beginPath(); c.moveTo(neck[0] - 14, neck[1] + 6); c.lineTo(neck[0] + 14, neck[1] + 6); c.lineTo(neck[0] + 22, neck[1] + 20); S('#3f7fd0', 7); }
          // the head with a face
          c.beginPath(); c.arc(head[0], head[1], 24, 0, TAU); F('#fbf6ea');
          if (!cut) {
            c.fillStyle = G2;
            if (pn === 'cheer' || pn === 'jump') { c.beginPath(); c.arc(head[0] - 8, head[1] - 4, 3.5, Math.PI, 0); c.arc(head[0] + 8, head[1] - 4, 3.5, Math.PI, 0); c.lineWidth = 2.5; c.strokeStyle = G2; c.stroke(); c.beginPath(); c.arc(head[0], head[1] + 6, 9, 0, Math.PI); c.fill(); }
            else if (pn === 'run1' || pn === 'run2' || pn === 'duck') { c.beginPath(); c.arc(head[0] - 7 + lean * 0.3, head[1] - 4, 4.5, 0, TAU); c.arc(head[0] + 9 + lean * 0.3, head[1] - 4, 4.5, 0, TAU); c.fill(); c.beginPath(); c.ellipse(head[0] + 2 + lean * 0.3, head[1] + 10, 5, 7, 0, 0, TAU); c.fill(); }
            else { c.beginPath(); c.arc(head[0] - 8, head[1] - 4, 3.5, 0, TAU); c.arc(head[0] + 8, head[1] - 4, 3.5, 0, TAU); c.fill(); c.beginPath(); c.arc(head[0], head[1] + 3, 10, 0.3, Math.PI - 0.3); c.lineWidth = 2.5; c.strokeStyle = G2; c.stroke(); }
            c.fillStyle = 'rgba(240,120,140,0.5)'; c.beginPath(); c.arc(head[0] - 14, head[1] + 6, 4, 0, TAU); c.arc(head[0] + 14, head[1] + 6, 4, 0, TAU); c.fill();
          }
          // hat (row 0) or a bow (row 1)
          if (row === 0) { c.beginPath(); c.moveTo(head[0] - 20, head[1] - 14); c.lineTo(head[0] + 6, head[1] - 60); c.lineTo(head[0] + 20, head[1] - 12); c.closePath(); F('#f39a2c'); }
          else { c.beginPath(); c.moveTo(head[0] + 10, head[1] - 22); c.lineTo(head[0] - 8, head[1] - 36); c.lineTo(head[0] - 6, head[1] - 12); c.closePath(); c.moveTo(head[0] + 10, head[1] - 22); c.lineTo(head[0] + 30, head[1] - 34); c.lineTo(head[0] + 28, head[1] - 10); c.closePath(); F('#e2484e'); }
          // duck: hands over the head
          c.restore();
        }
      });
    });
  }
  function folk(K) {
    const N = 40, atlas = folkAtlas();
    const geo = K3D.geo('paFolkQ', () => {
      const g = new T.PlaneGeometry(0.5, 1).translate(0, 0.5, 0), n = g.attributes.normal;
      for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
      return g;
    });
    const mat = atlasMat(K3D.toon('#ffffff', { map: atlas, alphaTest: 0.5 }), 8, 2, false, 'f');
    const m = new T.InstancedMesh(geo, mat, N);
    const cell = new T.InstancedBufferAttribute(new Float32Array(N * 3), 3);
    m.geometry = m.geometry.clone(); m.geometry.setAttribute('aCell', cell);
    m.customDepthMaterial = depthFor(atlas, 8, 2, false, 'f');
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    K.add(m);
    const r = P.rng(88);
    const p = Array.from({ length: N }, (_, i) => ({ x: (i % 2 ? 1 : -1) * (4 + r() * 16), z: 6 - r() * 50, row: i % 2, s: 1.0 + r() * 0.35, mode: 'idle', t: r() * 5, cheer: 0, duck: 0, wander: r() * 4, vx: 0, vz: 0, face: r() < 0.5 }));
    return { m, cell, p, n: -1 };
  }

  /* ---------- paper butterflies ---------- */
  function butterflyTex() {
    return K3D.paint('paButterfly', 256, 128, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      for (const s of [-1, 1]) {
        c.save(); c.translate(128, 64); c.scale(s, 1);
        c.beginPath(); c.moveTo(0, -4); c.bezierCurveTo(40, -70, 126, -60, 110, -8); c.bezierCurveTo(100, 14, 40, 6, 0, 2); c.fillStyle = '#ffffff'; c.fill(); c.strokeStyle = 'rgba(40,36,48,0.9)'; c.lineWidth = 4; c.stroke();
        c.beginPath(); c.moveTo(0, 4); c.bezierCurveTo(30, 10, 92, 30, 74, 56); c.bezierCurveTo(56, 70, 16, 40, 0, 8); c.fillStyle = '#f1f1f1'; c.fill(); c.stroke();
        c.fillStyle = 'rgba(40,36,48,0.55)'; c.beginPath(); c.arc(70, -28, 12, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.arc(70, -28, 5, 0, TAU); c.fill();
        c.fillStyle = 'rgba(40,36,48,0.3)'; c.beginPath(); c.arc(46, 36, 8, 0, TAU); c.fill();
        c.restore();
      }
      c.fillStyle = 'rgba(40,36,48,0.95)'; c.beginPath(); c.ellipse(128, 64, 6, 30, 0, 0, TAU); c.fill();
    });
  }
  function butterflies(K) {
    const N = 26;
    const geo = K3D.geo('paButterflyG', () => {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute([-1, 0, -0.5, 0, 0, -0.5, 0, 0, 0.5, -1, 0, 0.5, 0, 0, -0.5, 1, 0, -0.5, 1, 0, 0.5, 0, 0, 0.5], 3));
      g.setAttribute('uv', new T.Float32BufferAttribute([0, 1, 0.5, 1, 0.5, 0, 0, 0, 0.5, 1, 1, 1, 1, 0, 0.5, 0], 2));
      g.setIndex([0, 2, 1, 0, 3, 2, 4, 6, 5, 4, 7, 6]);
      return g;
    });
    const mat = K3D.flat('#ffffff', { map: butterflyTex(), side: T.DoubleSide });
    mat.alphaTest = 0.5;
    mat.onBeforeCompile = sh => {
      sh.uniforms.uWind = U.wind;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWind;').replace('#include <begin_vertex>',
        '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat bfA = sin(uWind * 24.0 + instanceMatrix[3].x * 3.1 + instanceMatrix[3].z * 1.7) * 0.95 + 0.35;\nfloat bfX = abs(position.x);\ntransformed.x = sign(position.x) * bfX * cos(bfA);\ntransformed.y = bfX * sin(bfA);\n#endif');
    };
    mat.customProgramCacheKey = () => 'palife-butterfly';
    const m = new T.InstancedMesh(geo, mat, N);
    m.frustumCulled = false; K.add(m);
    const cols = ['#f39a3c', '#6cb4e8', '#f07aa0', '#f4d23c', '#b083d8', '#7cc04f'], r = P.rng(31);
    const p = Array.from({ length: N }, (_, i) => {
      const o = { hx: (r() - 0.5) * 40, hz: 6 - r() * 46, a: 0.6 + r() * 0.6, b: 0.5 + r() * 0.7, ph: r() * 6, rad: 1.2 + r() * 2.2, s: 0.22 + r() * 0.12, up: 0 };
      m.setColorAt(i, new T.Color(cols[i % cols.length]));
      return o;
    });
    return { m, p };
  }

  /* ---------- the ink stream and its paper boats ---------- */
  const inkTex = () => K3D.paint('paInk', 128, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(22,40,110,0)'); g.addColorStop(0.05, 'rgba(22,40,110,0.85)'); g.addColorStop(0.14, 'rgba(30,58,150,0.95)'); g.addColorStop(0.5, 'rgba(46,86,190,0.95)');
    g.addColorStop(0.86, 'rgba(30,58,150,0.95)'); g.addColorStop(0.95, 'rgba(22,40,110,0.85)'); g.addColorStop(1, 'rgba(22,40,110,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const r = P.rng(19);
    // ripples: soft curved lighter lines running down the flow
    for (let i = 0; i < 60; i++) {
      const x = 14 + r() * 100, y = r() * h, l = 30 + r() * 60;
      c.strokeStyle = 'rgba(140,180,255,' + (0.12 + r() * 0.18) + ')'; c.lineWidth = 1.5 + r() * 2.5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + (r() - 0.5) * 16, y + l / 2, x + (r() - 0.5) * 6, y + l); c.stroke();
      if (y + l > h) { c.beginPath(); c.moveTo(x, y - h); c.quadraticCurveTo(x, y - h + l / 2, x, y - h + l); c.stroke(); }
    }
    for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(10,20,70,0.25)'; c.beginPath(); c.ellipse(14 + r() * 100, r() * h, 2 + r() * 4, 4 + r() * 10, 0, 0, TAU); c.fill(); }
  }, { repeat: true });
  const sheenTex = () => K3D.paint('paInkSheen', 128, 512, (c, w, h) => {
    c.fillStyle = '#000000'; c.fillRect(0, 0, w, h);
    const r = P.rng(23);
    for (let i = 0; i < 26; i++) {
      const x = 22 + r() * 84, y = r() * h, ry = 8 + r() * 26;
      const g = c.createRadialGradient(x, y, 0, x, y, ry); g.addColorStop(0, 'rgba(255,255,255,' + (0.35 + r() * 0.4) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.save(); c.translate(x, y); c.scale(0.25, 1); c.translate(-x, -y); c.fillStyle = g; c.fillRect(x - ry, y - ry, ry * 2, ry * 2); c.restore();
    }
  }, { repeat: true });
  function streamMesh(K) {
    const s = stream(), n = s.pts.length;
    const pos = [], uv = [], nor = [], idx = [];
    let along = 0;
    for (let i = 0; i < n; i++) {
      const p = s.pts[i], q = s.pts[Math.min(i + 1, n - 1)], o = s.pts[Math.max(i - 1, 0)], tx = q.x - o.x, tz = q.z - o.z, tl = Math.hypot(tx, tz) || 1;
      if (i) along += p.distanceTo(s.pts[i - 1]);
      const hw = s.w[i] / 2, nx = -tz / tl, nz = tx / tl;
      pos.push(p.x + nx * hw, 0, p.z + nz * hw, p.x - nx * hw, 0, p.z - nz * hw);
      uv.push(0, along / 2.6, 1, along / 2.6); nor.push(0, 1, 0, 0, 1, 0);
      if (i < n - 1) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
    const ink = inkTex(), sheen = sheenTex();
    const base = new T.Mesh(g, K3D.toon('#ffffff', { map: ink, transparent: true, depthWrite: false, polygonOffset: -3 }));
    base.position.y = 0.012; base.receiveShadow = true; base.renderOrder = 2; base.userData.live = true; K.add(base);
    const shine = new T.Mesh(g, K3D.flat('#cfe0ff', { map: sheen, transparent: true, add: true, depthWrite: false }));
    shine.material.polygonOffset = true; shine.material.polygonOffsetFactor = -4; shine.material.polygonOffsetUnits = -4;
    shine.position.y = 0.014; shine.renderOrder = 3; K.add(shine);
    return { ink, sheen };
  }
  // a paper boat folded from a page of print
  function boatGeo() {
    return K3D.geo('paBoat', () => {
      const P2 = (x, y, z) => [x, y, z];
      const TL = P2(-1, 0.34, 0), TR = P2(1, 0.34, 0), tri = [];
      for (const sd of [-1, 1]) {
        const BL = P2(-0.58, 0, 0.26 * sd), BR = P2(0.58, 0, 0.26 * sd), M = P2(0, 0.34, 0.3 * sd);
        tri.push(TL, BL, M, BL, BR, M, BR, TR, M);
      }
      tri.push(P2(-0.58, 0, 0.26), P2(-0.58, 0, -0.26), P2(0.58, 0, -0.26), P2(-0.58, 0, 0.26), P2(0.58, 0, -0.26), P2(0.58, 0, 0.26));
      tri.push(P2(-0.56, 0.32, 0), P2(0.56, 0.32, 0), P2(0, 1.1, 0));
      const g = new T.BufferGeometry(), pos = tri.flat();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new T.Float32BufferAttribute(tri.map(p => [p[0] * 0.5 + 0.5, p[1] + p[2] * 0.5]).flat(), 2));
      g.computeVertexNormals();
      return g;
    });
  }
  const boatTex = () => K3D.paint('paBoatTex', 256, 256, (c, w, h) => {
    P.paper(c, w, h, '#f6f1e2', 71);
    const r = P.rng(72);
    for (let y = 12; y < h; y += 11) { let x = 8; while (x < w - 10) { const ww = 6 + r() * 22; c.fillStyle = 'rgba(40,36,48,' + (0.3 + r() * 0.2) + ')'; c.fillRect(x, y, ww, 4); x += ww + 4; } }
    c.fillStyle = 'rgba(40,36,48,0.6)'; c.fillRect(20, 120, 90, 60);
  });
  function boats(K) {
    const out = [];
    for (let i = 0; i < 4; i++) {
      const m = new T.Mesh(boatGeo(), K3D.toon('#ffffff', { map: boatTex(), side: T.DoubleSide }));
      m.castShadow = true; m.scale.setScalar(0.62); K.add(m);
      out.push({ m, u: 0, ph: i * 1.7, set: false, sp: 1.1 + i * 0.12 });
    }
    return out;
  }

  /* ---------- sticky notes, washi tape, star stickers ---------- */
  function stickyTex(col, lines, seed) {
    return K3D.paint('paSticky' + seed, 256, 256, (c, w, h) => {
      c.fillStyle = col; c.fillRect(0, 0, w, h);
      const g = c.createLinearGradient(0, 0, 0, 40); g.addColorStop(0, 'rgba(0,0,0,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, w, 40);
      c.fillStyle = 'rgba(40,40,90,0.85)'; c.font = '30px "Comic Sans MS", "Chalkboard", "Marker Felt", sans-serif';
      lines.forEach((t, i) => c.fillText(t, 20, 62 + i * 42));
      c.strokeStyle = 'rgba(200,40,40,0.75)'; c.lineWidth = 4; c.beginPath(); c.ellipse(178, 200, 48, 26, -0.1, 0, TAU); c.stroke();
    });
  }
  function sticky(x, z, rot, col, lines, seed) {
    const S = 4.2, geo = new T.PlaneGeometry(S, S, 14, 14).rotateX(-Math.PI / 2), a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const px = a.getX(i) / (S / 2), pz = a.getZ(i) / (S / 2), d = (px - pz) / 2;  // 1 at the far right corner
      if (d > 0.45) { const k = (d - 0.45) / 0.55; a.setY(i, k * k * 1.3); a.setX(i, a.getX(i) - k * k * 0.35); a.setZ(i, a.getZ(i) + k * k * 0.35); }
    }
    geo.computeVertexNormals();
    const m = new T.Mesh(geo, K3D.toon('#ffffff', { map: stickyTex(col, lines, seed), side: T.DoubleSide, polygonOffset: -2 }));
    m.position.set(x, 0.02, z); m.rotation.y = rot; m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  function tapeTex(seed, col, dot) {
    return K3D.paint('paTape' + seed, 512, 64, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      // torn ends
      c.beginPath(); c.moveTo(10, 4); for (let y = 4; y <= 60; y += 7) c.lineTo(4 + (y % 14 ? 8 : 0), y); c.lineTo(w - 10, 60); for (let y = 60; y >= 4; y -= 7) c.lineTo(w - 4 - (y % 14 ? 8 : 0), y); c.closePath();
      c.fillStyle = col; c.fill();
      c.save(); c.clip();
      if (dot) { c.fillStyle = 'rgba(255,255,255,0.75)'; for (let x = 10; x < w; x += 22) for (let y = 10 + (x % 44 ? 11 : 0); y < h; y += 22) { c.beginPath(); c.arc(x, y, 4, 0, TAU); c.fill(); } }
      else for (let x = -40; x < w; x += 26) { c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.moveTo(x, 64); c.lineTo(x + 12, 64); c.lineTo(x + 52, 0); c.lineTo(x + 40, 0); c.closePath(); c.fill(); }
      c.restore();
    });
  }
  function tape(x, z, len, rot, seed, col, dot) {
    const m = new T.Mesh(new T.PlaneGeometry(len, 1.7).rotateX(-Math.PI / 2), K3D.toon('#ffffff', { map: tapeTex(seed, col, dot), transparent: true, opacity: 0.88, depthWrite: false, polygonOffset: -2 }));
    m.position.set(x, 0.016, z); m.rotation.y = rot; m.receiveShadow = true; m.renderOrder = 2;
    return m;
  }
  function starGeo() {
    return K3D.geo('paStarSticker', () => {
      const sh = new T.Shape();
      for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? 0.42 : 1; i ? sh.lineTo(Math.cos(a) * d, Math.sin(a) * d) : sh.moveTo(Math.cos(a) * d, Math.sin(a) * d); }
      return new T.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 1 }).rotateX(-Math.PI / 2);
    });
  }

  /* ---------- glitter ---------- */
  const sparkTex = () => K3D.paint('paSpark', 64, 64, (c, w, h) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.moveTo(32, 0); c.lineTo(35, 29); c.lineTo(64, 32); c.lineTo(35, 35); c.lineTo(32, 64); c.lineTo(29, 35); c.lineTo(0, 32); c.lineTo(29, 29); c.closePath(); c.fill();
  });

  /* ---------- build ---------- */
  L.meadow = meadow;   // the later stretches grow their own patches (PALANDS)
  L.build = function (K, st) {
    const V = st.v3, Lf = V.life = {};
    Lf.meadow = meadow(K);
    Lf.folk = folk(K);
    Lf.bf = butterflies(K);
    Lf.ink = streamMesh(K);
    Lf.boats = boats(K);
    const deco = new T.Group(); K.add(deco);
    deco.add(sticky(20.5, -38, 0.35, '#f7e27a', ["don't forget:", '- cocoa', '- ALIENS?!'], 1));
    deco.add(sticky(-13.5, -114, -0.25, '#f6a8c8', ['bunker', 'this way', '---->'], 2));
    deco.add(sticky(21, -118, 0.1, '#a8e0f0', ['p.112', 'finish', 'reading!!'], 3));
    deco.add(tape(1, -31, 30, 0.12, 1, 'rgba(70,190,180,0.95)', true));
    deco.add(tape(-2, -97, 26, -0.18, 2, 'rgba(240,120,150,0.95)', false));
    const gold = K3D.toon('#f2c33c', { emissive: '#6a4a00', emissiveIntensity: 0.35 });
    const r = P.rng(55);
    for (const [x, z, s] of [[8, -4, 0.7], [-6, -27, 0.55], [12, -45, 0.8], [-10.5, -68, 0.6], [3.5, -92, 0.5], [-12.5, -126, 0.75], [9.5, -146, 0.6], [-3, -160, 0.65], [14.5, -12, 0.5], [-14.5, -84, 0.6], [6, -70, 0.45]]) {
      const m = K3D.mesh(starGeo(), gold, { ink: '#6a4a10', inkW: 1 }); m.scale.setScalar(s); m.position.set(x, 0.01, z); m.rotation.y = r() * TAU; m.castShadow = true; deco.add(m);
    }
    // glitter lying on the page
    const NG = 420;
    Lf.glit = new T.InstancedMesh(K3D.geo('paSparkQ', () => new T.PlaneGeometry(1, 1)), K3D.flat('#ffffff', { map: sparkTex(), transparent: true, add: true, depthWrite: false }), NG);
    Lf.glit.frustumCulled = false; Lf.glit.renderOrder = 6; K.add(Lf.glit);
    const gc = ['#ffe28a', '#ffb0d8', '#a8e8ff', '#ffffff', '#c8ffb0'];
    Lf.glitP = Array.from({ length: NG }, (_, i) => ({ x: (r() - 0.5) * 56, z: -r() * 48 + 8, s: 0.12 + r() * 0.16, ph: r() * TAU, rate: 0.6 + r() * 1.6, c: new T.Color(gc[i % gc.length]) }));
  };

  /* ---------- every frame ---------- */
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sv = new T.Vector3(), pv = new T.Vector3(), col = new T.Color();
  L.update = function (K, st, dt, t) {
    const V = st.v3, Lf = V.life; if (!Lf) return;
    const cam = K.camera, cz = st.cz, pl = G.players;
    U.wind.value = t;
    U.hero.value.set(pl[0].b3.x, pl[0].b3.z, pl[1].b3.x, pl[1].b3.z);
    // the ink flows down toward the heroes, the glints a little faster
    Lf.ink.ink.offset.y = t * 0.09; Lf.ink.sheen.offset.y = t * 0.2; Lf.ink.sheen.offset.x = Math.sin(t * 0.7) * 0.02;
    // paper boats bob down the stream
    const s = stream();
    for (const b of Lf.boats) {
      const zz = s.pts[Math.floor(b.u)].z;
      if (!b.set || zz > cz + 12 || zz < cz - 70) { b.u = streamAtZ(cz - 26 - b.ph * 9); b.set = true; }
      b.u = Math.max(1, b.u - b.sp * dt * (s.pts.length - 1) / s.len);
      const i = Math.floor(b.u), p = s.pts[i], o = s.pts[Math.max(0, i - 1)];
      b.m.position.set(p.x + Math.sin(t * 0.9 + b.ph) * 0.25, 0.02 + Math.sin(t * 2.2 + b.ph) * 0.03, p.z);
      b.m.rotation.set(Math.sin(t * 1.7 + b.ph) * 0.1, Math.atan2(-(o.z - p.z), o.x - p.x) + Math.sin(t * 0.6 + b.ph) * 0.25, Math.sin(t * 2.1 + b.ph) * 0.06);
    }
    // the paper folk
    const F = Lf.folk, live = st.aliens.filter(a => a.st === 'live');
    for (const f of st.fx) {
      if (f.n <= F.n) continue;
      F.n = f.n;
      if ((f.kind === 'crumple' || f.kind === 'confetti') && f.a) for (const p of F.p) { if (Math.hypot(p.x - f.a.x, p.z - f.a.z) < 14 && p.mode !== 'flee') p.cheer = 1.1 + Math.random() * 0.8; }
      if (f.kind === 'burst' || f.kind === 'zap' || f.kind === 'stamp') for (const p of F.p) { if (Math.hypot(p.x - f.x, p.z - f.z) < 9) p.duck = 0.9 + Math.random() * 0.4; }
    }
    let k = 0;
    for (const p of F.p) {
      p.t += dt; p.cheer -= dt; p.duck -= dt; p.wander -= dt;
      if (p.z > cz + 9 || p.z < cz - 70) {
        // a new spot ahead, on open paper (not in a letter, the ink or a fold of the hill)
        for (let tr = 0; tr < 8; tr++) { p.z = cz - 24 - Math.random() * 28; p.x = (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 17); if (PALANDS.free(p.x, p.z, 0.6)) break; }
        p.hide = !PALANDS.free(p.x, p.z, 0.6); p.mode = 'idle';
      }
      if (p.hide) continue;
      let ad = 1e9, ax = 0, az = 0;
      for (const a of live) { const d = Math.hypot(a.x - p.x, a.z - p.z); if (d < ad) { ad = d; ax = a.x; az = a.z; } }
      let hd = 1e9; for (const h of pl) hd = Math.min(hd, Math.hypot(h.b3.x - p.x, h.b3.z - p.z));
      if (ad < 5.5) { p.mode = 'flee'; const d = ad || 1; p.vx = (p.x - ax) / d * 3.4; p.vz = (p.z - az) / d * 3.4; if (Math.abs(p.x) < 6) p.vx += Math.sign(p.x || 1) * 1.5; }
      else if (p.mode === 'flee' && ad > 8.5) p.mode = 'idle';
      if (p.mode !== 'flee') {
        if (p.duck > 0) p.mode = 'duck';
        else if (p.cheer > 0) p.mode = 'cheer';
        else if (hd < 7.5) p.mode = 'wave';
        else if (p.mode === 'walk' && p.wander > 0) p.mode = 'walk';
        else if (p.wander <= 0) { p.wander = 2 + Math.random() * 4; if (Math.random() < 0.45) { p.mode = 'walk'; const a = Math.random() * TAU; p.vx = Math.cos(a) * 0.7; p.vz = Math.sin(a) * 0.5; } else p.mode = 'idle'; }
        else if (p.mode !== 'walk') p.mode = 'idle';
      }
      let pose = 'stand', hop = 0;
      if (p.mode === 'flee' || p.mode === 'walk') {
        const nx = clamp(p.x + p.vx * dt, -27, 27), nz = p.z + p.vz * dt;
        if (PALANDS.free(nx, nz, 0.4)) { p.x = nx; p.z = nz; } else { p.vx = -p.vx; p.vz = -p.vz; }
        pose = Math.floor(p.t * (p.mode === 'flee' ? 9 : 4)) % 2 ? 'run1' : 'run2'; p.face = p.vx >= 0;
      } else if (p.mode === 'wave') { pose = Math.floor(p.t * 4) % 2 ? 'wave1' : 'wave2'; p.face = pl[0].b3.x > p.x; }
      else if (p.mode === 'cheer') { const j = Math.floor(p.t * 5) % 2; pose = j ? 'cheer' : 'jump'; hop = j ? 0 : 0.22; }
      else if (p.mode === 'duck') pose = 'duck';
      const yaw = Math.atan2(cam.position.x - p.x, cam.position.z - p.z);
      e.set(0, yaw, 0); q.setFromEuler(e); pv.set(p.x, hop, p.z); sv.set(p.s, p.s, p.s); m4.compose(pv, q, sv); F.m.setMatrixAt(k, m4);
      F.cell.setXYZ(k, POSES.indexOf(pose), p.row, p.face ? 0 : 1); k++;
    }
    F.m.count = k; F.m.instanceMatrix.needsUpdate = true; F.cell.needsUpdate = true;
    // butterflies loop over the flowers, rising out of the way of the heroes
    const B = Lf.bf;
    k = 0;
    for (const b of B.p) {
      if (b.hz > cz + 10) { b.hz = cz - 18 - Math.random() * 26; b.hx = (Math.random() - 0.5) * 40; }
      const x = b.hx + Math.sin(t * b.a + b.ph) * b.rad, z = b.hz + Math.cos(t * b.b + b.ph * 1.3) * b.rad;
      let near = 0; for (const h of pl) near = Math.max(near, 1 - Math.hypot(h.b3.x - x, h.b3.z - z) / 2.5);
      b.up = approach(b.up, Math.max(0, near) * 1.8, dt * 3);
      const y = 0.9 + Math.sin(t * 1.3 + b.ph) * 0.45 + Math.abs(Math.sin(t * 6 + b.ph)) * 0.12 + b.up;
      const vx = Math.cos(t * b.a + b.ph) * b.a, vz = -Math.sin(t * b.b + b.ph * 1.3) * b.b;
      e.set(0, Math.atan2(vx, vz) + Math.PI / 2, 0); q.setFromEuler(e); pv.set(x, y, z); sv.setScalar(b.s); m4.compose(pv, q, sv); B.m.setMatrixAt(k++, m4);
    }
    B.m.count = k; B.m.instanceMatrix.needsUpdate = true;
    // glitter twinkles as the light catches it
    const gm = Lf.glit;
    k = 0;
    for (const g of Lf.glitP) {
      const z = g.z + Math.round((cz - g.z - 16) / 48) * 48;
      const tw = Math.pow(Math.max(0, Math.sin(t * g.rate + g.ph)), 6);
      if (z < -318 && z > -482 && PA_ROUTE.inkAt(g.x + st.cx, z)) { gm.setMatrixAt(k, m4.makeScale(0, 0, 0)); k++; continue; }   // none on the wet ink
      pv.set(g.x + st.cx, 0.05, z); sv.setScalar(g.s * (0.25 + tw * 1.6)); m4.compose(pv, cam.quaternion, sv); gm.setMatrixAt(k, m4);
      col.copy(g.c).multiplyScalar(0.25 + tw); gm.setColorAt(k, col); k++;
    }
    gm.count = k; gm.instanceMatrix.needsUpdate = true; if (gm.instanceColor) gm.instanceColor.needsUpdate = true;
  };
  return L;
})();
