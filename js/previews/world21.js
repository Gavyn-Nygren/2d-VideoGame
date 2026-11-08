/* Pip & Bo - Level previews for World 21 Sky Kingdom (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw21. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 21-1 Hot Air Balloon Climb preview -----
  // Pip burns, Bo steers: the balloon lifts off the meadow, Bo lines it up under the island gap, it rises through past
  // a grumpy cloud and grabs a star, then floats gently down onto the dock: confetti.
  const pw21balloonDock = { x: 236, h: 272, w: 84 };
  // the basket's altitude and x at time t
  const pw21balloonAt = (v, t) => {
    const up = v.ease.inOut(v.seg(t, 0.3, 3.5)), down = v.ease.inOut(v.seg(t, 4.25, 4.9));
    const h = 300 * up - 28 * down;
    const x = 92 + 88 * v.ease.inOut(v.seg(t, 0.4, 1.4)) + 56 * v.ease.inOut(v.seg(t, 3.35, 4.25));
    return { h, x: x + (t < 4.9 ? Math.sin(t * 2.2) * 1.5 : 0) };
  };
  const pw21balloonIsle = (v, x0, x1, y) => {
    const c = v.ctx;
    c.fillStyle = '#b8a6dc'; c.beginPath(); c.moveTo(x0, y + 4); c.lineTo(x1, y + 4);
    c.quadraticCurveTo(x1 - 8, y + 18, (x0 + x1) / 2, y + 22); c.quadraticCurveTo(x0 + 8, y + 18, x0, y + 4); c.fill();
    c.fillStyle = v.c.grass; v.rr(x0, y - 2, x1 - x0, 8, 4); c.fill();
    c.fillStyle = v.c.grassDark; c.fillRect(x0 + 3, y + 4, x1 - x0 - 6, 2);
  };
  const pw21balloonDraw = (v, x, y, t, burn, mood) => {
    const c = v.ctx, ey = y - 50, r = 27;
    // ropes, riders, basket
    c.strokeStyle = '#7a5a3a'; c.lineWidth = 1;
    for (const dx of [-10, 10]) { c.beginPath(); c.moveTo(x + dx, y - 14); c.lineTo(x + dx * 1.3, ey + r - 4); c.stroke(); }
    v.hero(0, x - 5, y - 9, { s: 0.55, face: 1, mood, shadow: false });
    v.hero(1, x + 6, y - 9, { s: 0.55, face: 1, mood, shadow: false });
    c.fillStyle = '#c99a5a'; v.rr(x - 12, y - 14, 24, 14, 3); c.fill();
    c.strokeStyle = '#9a6e3a'; c.lineWidth = 1;
    for (let k = 1; k < 3; k++) { c.beginPath(); c.moveTo(x - 12, y - 14 + k * 4.6); c.lineTo(x + 12, y - 14 + k * 4.6); c.stroke(); }
    // the flame
    if (burn > 0) {
      const f = 7 + burn * 8 + Math.sin(t * 40) * 2;
      c.fillStyle = '#ffb04a'; c.beginPath(); c.ellipse(x, ey + r - f / 2 + 2, 3.6, f / 2, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff2a0'; c.beginPath(); c.ellipse(x, ey + r - f / 3 + 2, 1.8, f / 3, 0, 0, Math.PI * 2); c.fill();
    }
    // the striped envelope
    c.save(); c.beginPath(); c.moveTo(x - 8, ey + r + 2); c.bezierCurveTo(x - r - 6, ey + 6, x - r, ey - r, x, ey - r);
    c.bezierCurveTo(x + r, ey - r, x + r + 6, ey + 6, x + 8, ey + r + 2); c.closePath(); c.clip();
    for (let k = -3; k <= 3; k++) { c.fillStyle = k % 2 ? v.c.pip : v.c.bo; c.fillRect(x + k * 9 - 4.5, ey - r - 2, 9, r * 2 + 6); }
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.ellipse(x - 9, ey - 10, 6, 11, -0.3, 0, Math.PI * 2); c.fill();
    c.restore();
    c.fillStyle = v.c.gold; c.fillRect(x - r + 3, ey + 4, (r - 3) * 2, 3);
  };
  definePreview('Hot Air Balloon Climb', {
    blurb: 'One burns, one steers. Thread the island gaps and land on the dock!',
    loop: 6.4, still: 1.7,
    draw(v, t) {
      const c = v.ctx, b = pw21balloonAt(v, t), d = pw21balloonDock;
      const cam = v.clamp(b.h - 40, 0, d.h - 42), Y = h => 170 - (h - cam), landed = t > 4.9;
      v.sky(); v.sun(); v.clouds(t);
      // the meadow
      const gy = Y(0);
      if (gy < 200) { v.hills(gy - 4, 0); v.ground(gy); c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(92, gy, 18, 3, 0, 0, Math.PI * 2); c.fill(); }
      // the island row with a gap, marked with a gold arrow
      const iy = Y(140);
      pw21balloonIsle(v, -10, 152, iy); pw21balloonIsle(v, 210, 330, iy);
      if (t < 2.4) { c.fillStyle = v.c.gold; c.beginPath(); c.moveTo(181, iy + 12 + Math.sin(t * 6) * 2); c.lineTo(175, iy + 20); c.lineTo(187, iy + 20); c.closePath(); c.fill(); }
      // a grumpy storm cloud off to the side
      const sx = 66 + Math.sin(t * 1.4) * 8, sy = Y(225);
      for (const [dx, dy, r] of [[-14, 2, 11], [0, -4, 14], [15, 2, 11]]) v.fillCircle(sx + dx, sy + dy, r, '#7c7896');
      v.line(sx - 7, sy - 4, sx - 2, sy - 2, '#3a3450', 1.5); v.line(sx + 7, sy - 4, sx + 2, sy - 2, '#3a3450', 1.5);
      v.line(sx - 4, sy + 5, sx + 4, sy + 5, '#3a3450', 1.5);
      if (Math.sin(t * 5) > 0.6) v.line(sx + 2, sy + 12, sx - 3, sy + 20, '#ffe066', 2);
      // a star on the way up
      const stY = Y(205), got = b.h > 190;
      if (!got) v.star(181, stY, 6, v.c.gold, Math.sin(t * 3) * 0.2);
      else v.sparkle(181, stY, v.seg(t, 2.0, 2.8));
      // the dock
      const dy = Y(d.h);
      if (dy < 200) {
        pw21balloonIsle(v, d.x - d.w / 2 - 12, d.x + d.w / 2 + 12, dy + 4);
        c.fillStyle = v.c.plank; c.fillRect(d.x - d.w / 2, dy - 4, d.w, 6); c.fillStyle = v.c.plankDark; c.fillRect(d.x - d.w / 2, dy + 1, d.w, 1.5);
        c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(d.x, dy - 4, 16, 2.5, 0, 0, Math.PI * 2); c.stroke();
        v.line(d.x + d.w / 2 - 4, dy - 4, d.x + d.w / 2 - 4, dy - 26, '#6a5a7a', 1.5);
        c.fillStyle = '#ff8a5a'; c.beginPath(); c.moveTo(d.x + d.w / 2 - 4, dy - 26); c.lineTo(d.x + d.w / 2 + 10 + Math.sin(t * 5) * 1.5, dy - 23); c.lineTo(d.x + d.w / 2 - 4, dy - 20); c.closePath(); c.fill();
      }
      // the balloon (burning while it climbs, little puffs on the way down)
      const burn = t < 4.2 ? (0.3 < t ? 0.6 + 0.4 * Math.max(0, Math.sin(t * 9)) : 0) : (!landed && Math.sin(t * 14) > 0.7 ? 0.3 : 0);
      pw21balloonDraw(v, b.x, Y(b.h) - (landed ? 4 : 0), t, burn, landed ? 'joy' : 'happy');
      if (landed) { v.confetti(b.x, Y(b.h) - 60, v.seg(t, 4.9, 6.3)); v.pill('Docked!', 110, 40, { size: 12, col: v.c.gold }); }
      else if (t > 0.3 && t < 1.7) v.pill('Steer to the gap!', 236, 30, { size: 11 });
      else if (t > 3.9) v.pill('Gently...', 110, 40, { size: 11 });
    },
  });
  // ----- END 21-1 Hot Air Balloon Climb preview -----

  // ----- BEGIN 21-2 Kite Tandem preview -----
  // Pip runs the rooftops holding the string, Bo rides the kite over a power line and through stars, then the roofs stop
  // at the clock tower and Bo flies up and grabs the flag: confetti.
  const pw21kiteRoof = 140, pw21kiteRun = 210;
  const pw21kiteScroll = t => 90 * Math.min(t, 4.2);
  // the kite's spot (screen px) at time t
  const pw21kiteSpot = (v, t) => {
    let y = 72, x = 112;
    y -= 24 * v.ease.inOut(v.seg(t, 0.6, 1.2)) * (1 - v.ease.inOut(v.seg(t, 1.9, 2.4)));
    y -= 18 * v.ease.inOut(v.seg(t, 1.9, 2.4)) * (1 - v.ease.inOut(v.seg(t, 3.1, 3.6)));
    const up = v.ease.inOut(v.seg(t, 4.1, 4.9));
    y = v.lerp(y, 30, up); x = v.lerp(x, 124, up);
    if (t > 5.3) y = 30 + Math.sin((t - 5.3) * 6) * 2;
    return { x: x + Math.sin(t * 3) * 2, y: y + Math.sin(t * 2.3) * 3, a: Math.sin(t * 2.6) * 0.08 - up * 0.1 };
  };
  const pw21kiteFlag = (v, x, y, t, s) => {
    const c = v.ctx;
    c.fillStyle = v.c.gold; c.beginPath(); c.moveTo(x, y);
    for (let k = 0; k <= 6; k++) c.lineTo(x + k * 3 * s, y + Math.sin(t * 7 + k) * 1.5 * s);
    for (let k = 6; k >= 0; k--) c.lineTo(x + k * 3 * s, y + 13 * s + Math.sin(t * 7 + k) * 1.5 * s);
    c.closePath(); c.fill();
    v.star(x + 9 * s, y + 6.5 * s, 3.4 * s, '#ffffff');
  };
  const pw21kiteHouses = (v, off) => {
    const c = v.ctx, cols = ['#f6c6a8', '#ffe0a0', '#c6dcf6', '#d8c8f0', '#f6cad8'];
    for (let k = Math.floor(off / 110) - 1; k < Math.floor(off / 110) + 5; k++) {
      const x = k * 110 - off, y = pw21kiteRoof + 6;
      c.fillStyle = cols[((k % 5) + 5) % 5]; c.fillRect(x, y, 111, 40);
      for (let w = 0; w < 3; w++) { c.fillStyle = '#ffffff'; v.rr(x + 14 + w * 32, y + 12, 14, 16, 3); c.fill(); c.fillStyle = (k + w) % 4 ? '#9fd0f0' : '#ffe9a8'; v.rr(x + 16 + w * 32, y + 14, 10, 12, 2); c.fill(); }
    }
    c.fillStyle = '#c96a5a'; c.fillRect(0, pw21kiteRoof, 320, 7); c.fillStyle = '#e88a6e'; c.fillRect(0, pw21kiteRoof, 320, 2.5);
    // chimneys
    for (const cx of [300, 620]) { const x = cx - off; if (x < -20 || x > 340) continue; c.fillStyle = '#c0583e'; c.fillRect(x, pw21kiteRoof - 18, 14, 18); c.fillStyle = '#5a4a6a'; c.fillRect(x - 2, pw21kiteRoof - 20, 18, 4); }
  };
  definePreview('Kite Tandem', {
    blurb: 'One runs with the string, one rides the kite. Grab the tower flag!',
    loop: 6.4, still: 2.2,
    draw(v, t) {
      const c = v.ctx, off = pw21kiteScroll(t), done = t > 4.95;
      v.sky(); v.sun(); v.clouds(t);
      // a far pale town
      c.fillStyle = '#cbd9f4';
      for (let k = -1; k < 9; k++) { const x = k * 44 - (off * 0.2) % 44, h = 18 + ((k * 37) % 5 + 5) % 5 * 7; c.fillRect(x, pw21kiteRoof - h, 40, h); }
      // the clock tower (it stops by the landing pad)
      const tx = 132 + 90 * 4.2 - off + 0;
      if (tx < 360) {
        c.fillStyle = '#e8c8a8'; c.fillRect(tx - 15, 70, 30, 80);
        c.fillStyle = '#c96a5a'; c.beginPath(); c.moveTo(tx - 19, 72); c.lineTo(tx, 52); c.lineTo(tx + 19, 72); c.closePath(); c.fill();
        v.fillCircle(tx, 86, 9, '#fffaf0'); v.line(tx, 86, tx, 80, '#5a4a6a', 1.5); v.line(tx, 86, tx + 4, 88, '#5a4a6a', 1.5);
        v.line(tx, 54, tx, 20, '#6a5a7a', 2);
        if (!done) pw21kiteFlag(v, tx, 22, t, 1);
      }
      // the power line the kite flies over, and stars to grab
      const wx = 218 - off;
      if (wx > -80 && wx < 360) {
        v.line(wx - 30, pw21kiteRoof, wx - 30, 78, '#8a6a4a', 2.5); v.line(wx + 40, pw21kiteRoof, wx + 40, 78, '#8a6a4a', 2.5);
        c.strokeStyle = '#4a3a5a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(wx - 30, 80); c.quadraticCurveTo(wx + 5, 88, wx + 40, 80); c.stroke();
        c.fillStyle = '#8a7ab8'; c.beginPath(); c.ellipse(wx + 5, 81, 4, 3.4, 0, 0, Math.PI * 2); c.fill();
      }
      const k = pw21kiteSpot(v, t);
      for (let i = 0; i < 3; i++) {
        const sx = 310 + i * 30 - off, got = sx < k.x + 4;
        if (!got && sx < 340) v.star(sx, 52, 6, v.c.gold, Math.sin(t * 3 + i) * 0.2);
        else if (got) v.sparkle(sx, 52, (k.x + 4 - sx) / 40);
      }
      pw21kiteHouses(v, off);
      // the landing pad
      const px = pw21kiteRun + 90 * 4.2 - off - 10;
      if (px < 360) { c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(px, pw21kiteRoof + 1, 26, 3.5, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = v.c.bo; c.beginPath(); c.ellipse(px, pw21kiteRoof + 1, 15, 2, 0, 0, Math.PI * 2); c.fill(); }
      // Pip running with the string
      const run = t < 4.2, ph = t * 11, hop = v.hop(v.seg(t, 0.75, 1.15), 22);
      const rx = pw21kiteRun, ry = pw21kiteRoof - (run ? Math.abs(Math.sin(ph)) * 1.5 : 0) + hop;
      const hand = { x: rx + 6, y: ry - 30 };
      c.strokeStyle = '#fff6e0'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(hand.x, hand.y); c.quadraticCurveTo((hand.x + k.x) / 2, (hand.y + k.y) / 2 + 10, k.x + 2, k.y + 16); c.stroke();
      v.hero(0, rx, ry, { face: 1, sq: run ? Math.sin(ph * 2) * 0.08 : 0, mood: done ? 'joy' : 'happy', s: 1.05 });
      v.line(rx + 3, ry - 14, hand.x, hand.y, v.c.pip, 3);
      // the kite with Bo on it
      c.save(); c.translate(k.x, k.y); c.rotate(k.a);
      c.strokeStyle = '#fff6e0'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, 22);
      for (let i = 1; i <= 5; i++) c.lineTo(-i * 8, 22 + i * 5 + Math.sin(t * 6 - i) * 3); c.stroke();
      for (let i = 1; i <= 5; i++) v.fillCircle(-i * 8, 22 + i * 5 + Math.sin(t * 6 - i) * 3, 2, ['#ffd36b', '#ffffff', '#ff8fc7'][i % 3]);
      c.fillStyle = '#ffd36b'; c.beginPath(); c.moveTo(0, -20); c.lineTo(17, -3); c.lineTo(0, -3); c.closePath(); c.fill(); c.beginPath(); c.moveTo(0, -3); c.lineTo(-17, -3); c.lineTo(0, 23); c.closePath(); c.fill();
      c.fillStyle = '#fffaf0'; c.beginPath(); c.moveTo(0, -20); c.lineTo(-17, -3); c.lineTo(0, -3); c.closePath(); c.fill(); c.beginPath(); c.moveTo(0, -3); c.lineTo(17, -3); c.lineTo(0, 23); c.closePath(); c.fill();
      c.strokeStyle = v.c.boDark; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -20); c.lineTo(17, -3); c.lineTo(0, 23); c.lineTo(-17, -3); c.closePath(); c.stroke();
      c.restore();
      v.hero(1, k.x, k.y + 4, { face: 1, s: 0.8, mood: done ? 'joy' : 'happy', shadow: false });
      if (done) { v.line(k.x + 9, k.y - 2, k.x + 9, k.y - 22, '#6a5a7a', 1.5); pw21kiteFlag(v, k.x + 9, k.y - 23, t, 0.7); }
      if (done) {
        v.confetti(k.x, k.y - 10, v.seg(t, 5.0, 6.3), 20);
        v.pill('Got the flag!', 236, 62, { size: 12, col: v.c.gold });
      } else if (t > 4.2) v.pill('Fly up, Bo!', 236, 62, { size: 11 });
    },
  });
  // ----- END 21-2 Kite Tandem preview -----

  // ----- BEGIN 21-3 Cloud Bridge Builder preview -----
  // Pip walks to the island edge and plants "here!" flags, Bo squeezes the cloud machine and puffs a cloud onto each
  // one; Pip walks over, Bo follows, the clouds wobble and pop behind them, and both cheer by the flag: confetti.
  const pw21cbTop = 124, pw21cbGap0 = 110, pw21cbBW = 34;
  // where Pip and Bo stand (x) at time t: [Pip, Bo]
  const pw21cbPos = (v, t) => {
    const e = v.ease.inOut, s = (a, b) => e(v.seg(t, a, b));
    const pip = v.lerp(v.lerp(v.lerp(v.lerp(70, 100, s(0, 0.5)), 128, s(1.2, 1.55)), 160, s(2.2, 2.55)), 246, s(3.2, 3.9));
    const bo = v.lerp(v.lerp(28, 62, s(0, 0.6)), 214, s(3.3, 4.3));
    return [pip, bo];
  };
  // cloud k (0..2): appears at a(k), wobbles, pops at b(k)
  const pw21cbBorn = k => 1.1 + k;
  const pw21cbPop = k => 4.4 + k * 0.4;
  const pw21cbIsle = (v, x0, x1, y) => {
    const c = v.ctx, w = x1 - x0;
    c.fillStyle = '#a29fd6'; c.beginPath(); c.moveTo(x0, y + 3); c.lineTo(x1, y + 3);
    c.quadraticCurveTo(x1 - 3, y + 30, x0 + w * 0.55, y + 50); c.quadraticCurveTo(x0 + 3, y + 30, x0, y + 3); c.fill();
    c.fillStyle = '#7c78bc'; c.beginPath(); c.moveTo(x0 + w * 0.5, y + 8); c.lineTo(x1 - 2, y + 8); c.quadraticCurveTo(x1 - 5, y + 30, x0 + w * 0.55, y + 50); c.fill();
    c.fillStyle = '#4fb276'; v.rr(x0 - 2, y - 1, w + 4, 8, 4); c.fill();
    c.fillStyle = '#8fe3a0'; v.rr(x0 - 2, y - 2, w + 4, 6, 3); c.fill();
  };
  const pw21cbCloud = (v, x, y, w, a, wob, thin) => {
    const c = v.ctx;
    c.save(); c.globalAlpha *= a; c.translate(x + wob, y);
    c.fillStyle = '#d8dcf6'; v.rr(0, 2, w, 12 * thin, 6); c.fill();
    c.fillStyle = '#ffffff'; v.rr(0, 0, w, 10 * thin, 5); c.fill();
    for (let k = 0; k < 3; k++) { v.circle((k + 0.5) * w / 3, 2, 6 * (0.7 + 0.3 * thin)); c.fill(); }
    if (thin > 0.7) { c.strokeStyle = 'rgba(90,80,140,0.5)'; c.lineWidth = 1; c.beginPath(); c.arc(w / 2, 5, 2, 0.2, Math.PI - 0.2); c.stroke(); }
    c.restore();
  };
  definePreview('Cloud Bridge Builder', {
    blurb: 'One plants flags over the gap, one puffs clouds onto them. Hurry, they melt!',
    loop: 6.4, still: 1.9,
    draw(v, t) {
      const c = v.ctx, [px, bx] = pw21cbPos(v, t), Y = pw21cbTop, done = t > 3.95;
      v.sky(); v.sun(); v.clouds(t);
      // the soft cloud sea far below
      c.fillStyle = 'rgba(255,255,255,0.8)';
      for (let k = 0; k < 7; k++) { v.circle(k * 56 - 10, 184, 26 + (k % 2) * 6); c.fill(); }
      pw21cbIsle(v, -10, pw21cbGap0, Y);
      pw21cbIsle(v, pw21cbGap0 + 3 * pw21cbBW, 330, Y);
      // the goal flag
      const fx = 286;
      v.line(fx, Y, fx, Y - 46, '#7a6a8a', 2);
      c.fillStyle = v.c.gold; c.beginPath(); c.moveTo(fx + 1, Y - 46);
      for (let k = 0; k <= 5; k++) c.lineTo(fx + 1 + k * 4, Y - 46 + Math.sin(t * 6 + k) * 1.4);
      for (let k = 5; k >= 0; k--) c.lineTo(fx + 1 + k * 4, Y - 33 + Math.sin(t * 6 + k) * 1.4);
      c.closePath(); c.fill();
      v.star(fx + 11, Y - 40, 3.4, '#ffffff');
      // the clouds, the flags and the puffs
      for (let k = 0; k < 3; k++) {
        const x = pw21cbGap0 + k * pw21cbBW, born = pw21cbBorn(k), pop = pw21cbPop(k), flagT = born - 0.6;
        if (t >= flagT && t < born) {
          // the flag ping and its dashed spot
          c.save(); c.setLineDash([3, 3]); c.strokeStyle = v.c.pip; c.lineWidth = 1.5; v.rr(x + 1, Y, pw21cbBW - 2, 11, 5); c.stroke(); c.restore();
          const fy = Y - 6 + Math.sin(t * 6) * 2;
          v.line(x + pw21cbBW / 2, fy, x + pw21cbBW / 2, fy - 16, '#6a5a7a', 1.5);
          c.fillStyle = v.c.pip; c.beginPath(); c.moveTo(x + pw21cbBW / 2 + 1, fy - 16); c.lineTo(x + pw21cbBW / 2 + 11, fy - 12); c.lineTo(x + pw21cbBW / 2 + 1, fy - 8); c.fill();
          // the puff flying from Bo's machine
          const u = v.seg(t, born - 0.4, born);
          if (u > 0) {
            const sx = bx + 14, sy = Y - 14, tx = x + pw21cbBW / 2, ty = Y + 4;
            const qx = v.lerp(sx, tx, u), qy = v.lerp(sy, ty, u) - Math.sin(u * Math.PI) * 18;
            c.fillStyle = '#ffffff'; v.circle(qx - 4, qy + 1, 5); c.fill(); v.circle(qx, qy - 2, 6); c.fill(); v.circle(qx + 4, qy + 1, 4.5); c.fill();
          }
        }
        if (t >= born && t < pop) {
          const left = pop - t, wob = left < 0.7 ? Math.sin(t * 40 + k) * 1.5 : 0, thin = left < 0.35 ? Math.max(0.3, left / 0.35) : 1;
          pw21cbCloud(v, x, Y, pw21cbBW, Math.min(1, (t - born) / 0.12), wob, thin);
        }
        if (t >= pop && t < pop + 0.4) v.puff(x + pw21cbBW / 2, Y + 4, v.seg(t, pop, pop + 0.4));
      }
      // Bo with the cloud machine (it squeezes as each puff goes)
      let squeeze = 0;
      for (let k = 0; k < 3; k++) { const u = v.seg(t, pw21cbBorn(k) - 0.45, pw21cbBorn(k) - 0.25); if (u > 0 && u < 1) squeeze = Math.sin(u * Math.PI); }
      const bhop = done ? v.hop(v.phase(t, 0.6, 0.3), 9) : 0;
      v.hero(1, bx, Y + bhop, { face: 1, mood: done ? 'joy' : 'happy', sq: squeeze * 0.15 });
      c.save(); c.translate(bx + 6, Y - 15 + bhop);
      c.fillStyle = '#f6efdf'; v.rr(-3, -1, 9, 8, 2); c.fill();
      const bw = 7 - squeeze * 3;
      c.fillStyle = '#ff9fc4'; c.beginPath(); c.moveTo(6, -2); for (let k = 0; k <= 3; k++) c.lineTo(6 + k * bw / 3, k % 2 ? 0 : -3); c.lineTo(6 + bw, 8); for (let k = 3; k >= 0; k--) c.lineTo(6 + k * bw / 3, k % 2 ? 6 : 9); c.fill();
      c.fillStyle = '#e8c070'; c.beginPath(); c.moveTo(6 + bw, 1); c.lineTo(11 + bw, -1); c.lineTo(11 + bw, 7); c.lineTo(6 + bw, 5); c.fill();
      c.restore();
      // Pip with the little pointer flag
      const phop = done ? v.hop(v.phase(t, 0.6), 11) : 0;
      v.hero(0, px, Y + phop, { face: done ? -1 : 1, mood: done ? 'joy' : 'happy' });
      v.line(px - 5, Y - 10 + phop, px - 9, Y - 30 + phop, '#6a5a7a', 1.5);
      c.fillStyle = v.c.pip; c.beginPath(); c.moveTo(px - 9, Y - 30 + phop); c.lineTo(px + 1, Y - 27 + phop); c.lineTo(px - 8, Y - 22 + phop); c.fill();
      if (!done && t > 0.4 && t < 3.1) v.bubble(t < 1.6 ? 'Here!' : t < 2.6 ? 'And here!' : 'One more!', px + 6, Y - 40, { size: 9 });
      if (done) {
        v.confetti(fx - 30, Y - 40, v.seg(t, 4.3, 5.8), 22);
        v.pill('Over the gap together!', 160, 40, { size: 11, col: v.c.gold });
      } else if (t > 3.3) v.pill('Hurry, Bo! It melts!', 160, 40, { size: 11 });
    },
  });
  // ----- END 21-3 Cloud Bridge Builder preview -----

  // ----- BEGIN 21-4 Paper Plane Race preview -----
  // Pip and Bo fling their paper planes from the slingshots. Pip dives into the shimmering warm air, rides it up and
  // zooms through a gold ring; Bo boings off a balloon; Pip glides first through the finish cloud arch: confetti.
  const pw21ppLoop = 6.6, pw21ppArch = 850;
  // where each plane is (world x, y, nose angle) at time t
  const pw21ppPip = (v, t) => {
    if (t < 0.6) return { x: 40 - 8 * v.seg(t, 0.1, 0.6), y: 78, a: -0.2 };
    const u = t - 0.6, x = Math.min(40 + 160 * u + 25 * Math.max(0, t - 3.4) ** 2, 836 + 50 * v.ease.out(v.seg(t, 5.25, 6.2)));
    let y = 78 + 46 * v.ease.inOut(v.seg(t, 0.7, 2.2)) - 54 * v.ease.inOut(v.seg(t, 2.2, 3.2)) + 40 * v.ease.inOut(v.seg(t, 3.6, 4.6));
    y -= 30 * v.ease.inOut(v.seg(t, 5.4, 6.0)) - 30 * v.ease.inOut(v.seg(t, 6.0, 6.5));
    const a = t < 2.2 ? 0.25 : t < 3.2 ? -0.15 : t < 3.6 ? 0 : t < 4.6 ? 0.28 : t < 5.4 ? 0.05 : -0.35;
    return { x, y, a };
  };
  const pw21ppBo = (v, t) => {
    if (t < 0.75) return { x: 40 - 8 * v.seg(t, 0.2, 0.75), y: 112, a: -0.2 };
    const P = pw21ppPip(v, t), d = 18 - 90 * v.ease.out(v.seg(t, 2.9, 4.2)) - 30 * v.seg(t, 4.2, 5.4);
    const bump = v.seg(t, 2.95, 3.6);
    const y = 112 + 18 * v.ease.inOut(v.seg(t, 0.8, 2.0)) - 22 * v.ease.inOut(v.seg(t, 2.0, 2.9)) + 18 * v.ease.out(bump);
    return { x: Math.max(P.x - 200, P.x + d - 26 * Math.max(0, 0.75 - t)), y, a: bump > 0 && bump < 1 ? Math.sin(bump * 30) * 0.4 : 0.08 };
  };
  const pw21ppPlane = (v, id, x, y, a, mood) => {
    const c = v.ctx, main = id ? '#6fa3ff' : '#ff7d5a', light = id ? '#a9c8ff' : '#ffb39a', dark = id ? '#3f6fd0' : '#c9533a';
    c.save(); c.translate(x, y); c.rotate(a);
    v.hero(id, -1, -2, { s: 0.42, face: 1, mood, shadow: false });
    c.fillStyle = dark; c.beginPath(); c.moveTo(19, 0.5); c.lineTo(-16, 0); c.lineTo(-13, 6); c.closePath(); c.fill();
    c.fillStyle = main; c.beginPath(); c.moveTo(19, 0.5); c.lineTo(-13, 0.5); c.lineTo(-14, 5); c.closePath(); c.fill();
    c.fillStyle = light; c.beginPath(); c.moveTo(19, 0); c.lineTo(-17, -6); c.lineTo(-13, 0); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 0.8; c.stroke();
    c.restore();
  };
  definePreview('Paper Plane Race', {
    blurb: 'Throw, then glide! Dive for speed, ride warm air, zoom through rings.',
    loop: pw21ppLoop,
    still: 3.45,
    draw(v, t) {
      const c = v.ctx, P = pw21ppPip(v, t), B = pw21ppBo(v, t);
      const cam = v.clamp(P.x - 140, 0, pw21ppArch - 236), sx = x => x - cam;
      v.sky(); v.sun(270, 46, 13);
      for (let i = 0; i < 4; i++) { const x = ((i * 110 - cam * 0.3) % 440 + 440) % 440 - 60; v.cloud(x, 60 + (i % 2) * 34, 0.8); }
      v.hills(150, cam * 0.6);
      // the cloud ceiling
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, v.W, 10);
      for (let i = -1; i < 13; i++) { const x = i * 28 - (cam % 28); v.circle(x, 12, 12); c.fill(); }
      // warm air (world 240..330)
      const ux = sx(240);
      if (ux > -100 && ux < v.W) {
        c.fillStyle = 'rgba(255,214,110,0.28)'; c.fillRect(ux, 20, 90, 140);
        c.strokeStyle = 'rgba(255,248,220,0.9)'; c.lineWidth = 1.4;
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
          const ph = (t * 0.6 + i * 0.3 + j * 0.5) % 1, lx = ux + 12 + i * 22, ly = 150 - ph * 120;
          c.globalAlpha = Math.sin(ph * Math.PI); c.beginPath();
          for (let k = 0; k < 5; k++) c.lineTo(lx + Math.sin(ly / 7 + k + t * 4) * 2.5, ly - k * 5); c.stroke();
        }
        c.globalAlpha = 1;
        for (let i = 0; i < 4; i++) { const fx = ux + 10 + i * 23; v.line(fx, 168, fx, 156, '#4f9a3f', 1.5); v.fillCircle(fx, 155, 3.4, v.c.gold); }
      }
      // the gold ring (world 488, 72) and a balloon (world 439)
      const rx = sx(488), got = t > 3.45;
      c.lineWidth = 3; c.strokeStyle = got ? 'rgba(255,214,90,0.5)' : v.c.gold;
      c.beginPath(); c.ellipse(rx, 72, 5, 15, 0, 0, Math.PI * 2); c.stroke();
      const bt = v.seg(t, 2.95, 4.0), bx = sx(452) + 30 * bt, by = 104 - 50 * bt;
      v.line(bx, by + 10, bx - 2, by + 34, 'rgba(80,70,110,0.6)', 0.8);
      c.fillStyle = '#ff8fc7'; c.beginPath(); c.ellipse(bx, by, 8, 10, 0, 0, Math.PI * 2); c.fill();
      // a little yellow bird bobbing high up
      const brx = sx(700) - t * 8, bry = 40 + Math.sin(t * 3) * 5;
      v.fillCircle(brx, bry, 6, '#ffd94a'); c.fillStyle = '#ff9a3a'; c.beginPath(); c.moveTo(brx - 6, bry); c.lineTo(brx - 10, bry + 1.5); c.lineTo(brx - 6, bry + 3); c.fill(); v.fillCircle(brx - 3, bry - 1.5, 1, v.c.ink);
      // the finish cloud arch
      const ax = sx(pw21ppArch);
      if (ax < v.W + 60) {
        ['#ff8fa0', '#ffc070', '#ffe680', '#a8e89a', '#8fd0ff', '#b9a0ff'].forEach((col, i) => { c.strokeStyle = col; c.lineWidth = 4; c.beginPath(); c.arc(ax, 190, 120 - i * 4, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); });
        for (let y = 14, k = 0; y < 166; y += 8, k++) { c.fillStyle = k % 2 ? '#fff' : '#5a4a8a'; c.fillRect(ax - 2, y, 4, 8); }
        c.fillStyle = '#fff'; v.circle(ax - 8, 168, 12); c.fill(); v.circle(ax + 10, 166, 14); c.fill();
      }
      // the ground and the slingshot pillar
      c.fillStyle = '#7fd35f'; c.fillRect(0, 168, v.W, 12);
      const px = sx(40);
      if (px > -60) {
        c.fillStyle = '#fff'; v.rr(px - 30, 96, 22, 74, 8); c.fill();
        for (const [fy, h] of [[78, 0], [112, 1]]) { c.strokeStyle = '#a06a3a'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(px - 19, fy + 18); c.lineTo(px - 19, fy + 6); c.lineTo(px - 13, fy - 4); c.moveTo(px - 19, fy + 6); c.lineTo(px - 25, fy - 4); c.stroke(); void h; }
        c.lineCap = 'butt';
      }
      // the planes (Bo behind)
      const bobMood = t > 2.95 && t < 3.7 ? 'dizzy' : 'happy', pipMood = t > 5.3 ? 'joy' : t > 3.4 && t < 4.0 ? 'wow' : 'happy';
      pw21ppPlane(v, 1, sx(B.x), B.y, B.a, bobMood);
      pw21ppPlane(v, 0, sx(P.x), P.y, P.a, pipMood);
      // words
      if (t < 0.7) v.pill('Hold, let go at the top!', 160, 30, { size: 9 });
      if (t > 1.7 && t < 2.9) v.label('Warm air!', sx(285), 34, 11, v.c.gold);
      if (t > 3.4 && t < 4.1) v.label('Zoom!', sx(P.x), P.y - 20, 12, v.c.gold);
      if (t > 3.0 && t < 3.7) v.label('Boing!', sx(B.x), B.y - 18, 10, '#fff');
      if (t > 3.45 && t < 3.9) for (let i = 0; i < 4; i++) v.sparkle(rx + Math.cos(i * 1.6) * 12, 72 + Math.sin(i * 1.6) * 14, v.seg(t, 3.45, 3.9), '#fff', 4);
      if (t > 5.35) { v.label('Pip wins!', 160, 40, 20, v.c.pip); v.confetti(ax, 70, v.seg(t, 5.35, 6.5)); }
    },
  });
  // ----- END 21-4 Paper Plane Race preview -----

}
