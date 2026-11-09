/* Pip & Bo - Level previews for World 23 Barnyard Fair (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw23. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  //
  //
  // ----- BEGIN 23-1 Tractor & Trailer preview -----
  // (being built)
  // ----- END 23-1 Tractor & Trailer preview -----
  //
  //
  //
  //
  // ----- BEGIN 23-2 Runaway Pigs preview -----
  // (being built)
  // ----- END 23-2 Runaway Pigs preview -----
  //
  //
  //
  //
  // ----- BEGIN 23-3 Hot Dog Stand Rush preview -----
  // Inside the striped hot dog stand: Pip (the cook) picks a golden sausage off the grill, puts it in a bun, squirts
  // ketchup and puts it on the pass shelf ("Order up!"); Bo (the server) grabs it and hands it to the cow in a straw hat
  // at the window, whose bubble wanted exactly that: "Yum!", hearts, three stars and confetti.
  const pw23hK = (v, t, a, b) => v.ease.inOut(v.seg(t, a, b));
  const pw23hDog = (v, x, y, s, ketchup) => {
    const c = v.ctx;
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#d99a4a'; v.rr(-11, -3, 22, 7, 3.5); c.fill();
    c.fillStyle = '#c4492e'; v.rr(-13, -4, 26, 6, 3); c.fill();
    if (ketchup) { c.strokeStyle = '#e8322f'; c.lineWidth = 1.8; c.lineJoin = 'round'; c.beginPath(); for (let k = 0; k <= 6; k++) c.lineTo(-9 + k * 3, -4 + (k % 2 ? 1.6 : -1.6)); c.stroke(); }
    c.fillStyle = '#f2b866'; v.rr(-11, 0, 22, 5.5, 2.8); c.fill();
    c.restore();
  };
  // Pip the cook: where she walks, and Bo the server
  const pw23hPipX = (v, t) => {
    let x = 52;
    x = v.lerp(x, 104, pw23hK(v, t, 0.9, 1.4));
    x = v.lerp(x, 134, pw23hK(v, t, 1.5, 1.85));
    x = v.lerp(x, 180, pw23hK(v, t, 2.05, 2.55));
    x = v.lerp(x, 60, pw23hK(v, t, 3.0, 4.2));
    return x;
  };
  const pw23hBoX = (v, t) => {
    let x = 236;
    x = v.lerp(x, 214, pw23hK(v, t, 2.7, 3.05));
    x = v.lerp(x, 262, pw23hK(v, t, 3.3, 3.85));
    return x;
  };
  definePreview('Hot Dog Stand Rush', {
    blurb: 'One grills the hot dogs, one serves the fairgoers before they walk off!',
    loop: 6.4, still: 1.95,
    draw(v, t) {
      const c = v.ctx, Y = 158, top = 140;
      // the fair through the window: sky, the Ferris wheel, grass
      const g = c.createLinearGradient(0, 30, 0, top); g.addColorStop(0, '#7cc9f4'); g.addColorStop(1, '#fff1c2');
      c.fillStyle = g; c.fillRect(204, 30, 116, top - 30);
      c.strokeStyle = '#ff7fb0'; c.lineWidth = 2.5; v.circle(286, 72, 30); c.stroke();
      for (let k = 0; k < 6; k++) { const a = t * 0.5 + k * Math.PI / 3; v.line(286, 72, 286 + Math.cos(a) * 30, 72 + Math.sin(a) * 30, 'rgba(255,255,255,0.9)', 1); v.fillCircle(286 + Math.cos(a) * 30, 72 + Math.sin(a) * 30 + 3, 3.5, ['#ff6b4a', '#5b95ff', '#ffc53d', '#7fd05a', '#b28dff', '#3fc6d8'][k]); }
      c.fillStyle = '#8cc65a'; c.fillRect(204, 108, 116, top - 108);
      // the kitchen's back wall: soft candy stripes, the order ticket
      for (let x = 0, k = 0; x < 204; x += 14, k++) { c.fillStyle = k % 2 ? '#f9d3c6' : '#fff3da'; c.fillRect(x, 30, 14, top - 30); }
      c.fillStyle = '#8f5524'; c.fillRect(20, 40, 150, 4);
      const served = t > 4.0;
      c.save(); if (served) c.globalAlpha = 0.35;
      c.fillStyle = '#fffdf4'; v.rr(70, 44, 52, 30, 3); c.fill(); pw23hDog(v, 96, 60, 1.15, true);
      c.restore();
      // the cow in a straw hat at the window, wanting a ketchup hot dog
      const cx = 274, cy = top + 10, joy = served;
      c.fillStyle = '#ffffff'; v.rr(cx - 15, cy - 34, 30, 40, 10); c.fill();
      c.fillStyle = '#2a2430'; v.circle(cx - 6, cy - 20, 4); c.fill();
      c.fillStyle = '#e8e2d8'; c.beginPath(); c.moveTo(cx - 8, cy - 52); c.lineTo(cx - 15, cy - 62); c.lineTo(cx - 5, cy - 54); c.fill(); c.beginPath(); c.moveTo(cx + 8, cy - 52); c.lineTo(cx + 15, cy - 62); c.lineTo(cx + 5, cy - 54); c.fill();
      v.fillCircle(cx, cy - 44, 13, '#ffffff');
      c.fillStyle = '#ffb6c8'; c.beginPath(); c.ellipse(cx, cy - 37, 9, 6, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#f2d27a'; c.beginPath(); c.ellipse(cx, cy - 56, 13, 3.5, 0, 0, Math.PI * 2); c.fill(); v.rr(cx - 7, cy - 64, 14, 9, 4); c.fill();
      v.fillCircle(cx + 5, cy - 60, 2.4, '#ff6b8a');
      c.strokeStyle = '#1c1a36'; c.lineWidth = 1.5;
      if (joy) { for (const e of [-4, 4]) { c.beginPath(); c.arc(cx + e, cy - 46, 2.2, Math.PI + 0.3, Math.PI * 2 - 0.3); c.stroke(); } }
      else { v.fillCircle(cx - 4, cy - 46, 1.6, '#1c1a36'); v.fillCircle(cx + 4, cy - 46, 1.6, '#1c1a36'); }
      if (joy) pw23hDog(v, cx - 2, cy - 22, 0.9, true);
      // her order bubble and patience ring (until it's served)
      if (!served) {
        c.fillStyle = '#ffffff'; c.strokeStyle = '#1c1a36'; c.lineWidth = 1.2; v.rr(cx - 18, cy - 96, 36, 22, 6); c.fill(); c.stroke();
        pw23hDog(v, cx, cy - 85, 1, true);
        const f = 0.95 - t * 0.09;
        v.fillCircle(cx - 20, cy - 96, 7, '#ffffff');
        c.strokeStyle = f > 0.5 ? '#5cc27f' : '#ffc53d'; c.lineWidth = 2.5; c.beginPath(); c.arc(cx - 20, cy - 96, 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); c.stroke();
      }
      // the counters and the floor, the divider with the pass shelf
      c.fillStyle = '#c98d52'; c.fillRect(0, Y, 320, 22);
      c.fillStyle = '#e6edf3'; c.fillRect(0, top, 200, Y - top); c.fillStyle = '#e2493b'; c.fillRect(0, top, 200, 2);
      for (let x = 200, k = 0; x < 320; x += 10, k++) { c.fillStyle = k % 2 ? '#fff3da' : '#f9d3c6'; c.fillRect(x, top, 10, Y - top); }
      c.fillStyle = '#8f5524'; c.fillRect(200, top - 3, 120, 4);
      c.fillStyle = '#b8342a'; c.fillRect(197, 30, 6, 90);
      c.fillStyle = '#8f5524'; c.fillRect(184, top - 2, 34, 3);
      // the grill, the bun basket, the ketchup
      c.fillStyle = '#3a3a48'; v.rr(28, top - 12, 66, 13, 3); c.fill();
      c.fillStyle = 'rgba(255,110,40,0.6)'; c.fillRect(32, top - 4, 58, 2);
      const picked = t > 0.85;
      if (!picked) { c.fillStyle = 'rgba(255,214,90,0.5)'; v.rr(39, top - 19, 26, 10, 5); c.fill(); c.fillStyle = '#c0542c'; v.rr(42, top - 17, 20, 6, 3); c.fill(); v.sparkle(60, top - 22, v.phase(t, 0.8)); }
      c.fillStyle = '#e0705a'; v.rr(70, top - 17, 20, 6, 3); c.fill();
      c.fillStyle = '#b8742c'; c.beginPath(); c.moveTo(92, top - 10); c.lineTo(116, top - 10); c.lineTo(113, top); c.lineTo(95, top); c.fill();
      c.fillStyle = '#f2b866'; c.beginPath(); c.ellipse(100, top - 12, 5, 3.5, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(108, top - 13, 5, 3.5, 0, 0, Math.PI * 2); c.fill();
      const sq = t > 1.85 && t < 2.1 ? 0.15 : 0;
      c.fillStyle = '#e8322f'; v.rr(129 - sq * 8, top - 22 + sq * 6, 10 + sq * 16, 22 - sq * 6, 4); c.fill();
      c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(131, top - 22); c.lineTo(137, top - 22); c.lineTo(134, top - 29); c.fill();
      // the hot dog's trip: Pip's hands, the shelf, Bo's hands, the cow
      const px = pw23hPipX(v, t), bx = pw23hBoX(v, t);
      const step = k => Math.abs(Math.sin(t * 9)) * (k > 0.02 && k < 0.98 ? 1.5 : 0);
      const pipWalk = [pw23hK(v, t, 0.9, 1.4), pw23hK(v, t, 1.5, 1.85), pw23hK(v, t, 2.05, 2.55), pw23hK(v, t, 3.0, 4.2)].some(k => k > 0.02 && k < 0.98);
      const boWalk = [pw23hK(v, t, 2.7, 3.05), pw23hK(v, t, 3.3, 3.85)].some(k => k > 0.02 && k < 0.98);
      v.hero(0, px, Y - (pipWalk ? step(0.5) : 0), { s: 0.95, face: t > 2.9 && t < 4.2 ? -1 : 1, mood: served ? 'joy' : 'happy' });
      v.hero(1, bx, Y - (boWalk ? step(0.5) : 0), { s: 0.95, face: t > 2.6 && t < 3.25 ? -1 : 1, mood: served ? 'joy' : 'happy' });
      if (t > 0.85 && t < 1.4) { c.fillStyle = '#c0542c'; v.rr(px - 10, Y - 34, 20, 6, 3); c.fill(); }
      if (t >= 1.4 && t < 2.6) pw23hDog(v, px, Y - 31, 1.0, t > 1.95);
      if (t >= 2.6 && t < 3.2) pw23hDog(v, 196, top - 6, 0.9, true);
      if (t >= 3.2 && t < 4.0) pw23hDog(v, bx, Y - 31, 1.0, true);
      // words and the happy ending
      if (t > 1.95 && t < 2.5) v.label('Ketchup!', 134, top - 40 - v.seg(t, 1.95, 2.5) * 6, 11, '#ff6b4a');
      if (t > 2.6 && t < 3.3) v.label('Order up!', 190, top - 30 - v.seg(t, 2.6, 3.3) * 6, 12, v.c.gold);
      if (served) {
        v.bubble('Yum!', cx, cy - 66, { size: 11 });
        for (let k = 0; k < 3; k++) { const u = v.seg(t, 4.05 + k * 0.12, 5.4); if (u > 0 && u < 1) v.heart(cx + 20 + k * 8, cy - 40 - u * 30, 4, '#ff5f8f'); }
        if (t < 5.6) for (let k = 0; k < 3; k++) v.star(cx - 12 + k * 12, cy - 112 + Math.min(0, (t - 4.2) * -8), 5.5);
        v.confetti(250, 60, v.seg(t, 4.1, 5.6), 18);
      }
      // the awning and the sign
      for (let x = 0, k = 0; x < 320; x += 20, k++) { c.fillStyle = k % 2 ? '#fff6e6' : '#e2493b'; c.fillRect(x, 0, 20, 24); c.beginPath(); c.arc(x + 10, 24, 10, 0, Math.PI); c.fill(); }
      c.fillStyle = '#8f5524'; v.rr(118, 4, 84, 20, 6); c.fill(); c.fillStyle = '#ffd36b'; v.rr(120, 6, 80, 16, 5); c.fill();
      v.text('HOT DOGS', 160, 14.5, 11, '#c8342a');
      if (t < 0.85) v.pill('Golden! Pick it up', 62, 108, { size: 9, col: '#fff6c8' });
    },
  });
  // ----- END 23-3 Hot Dog Stand Rush preview -----
  //
  //
  //
  //
  // ----- BEGIN 23-4 Pie-Eating Contest preview -----
  // (being built)
  // ----- END 23-4 Pie-Eating Contest preview -----
  //
  //

}
