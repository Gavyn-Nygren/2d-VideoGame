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
  // A farm field seen from above: Pip claps behind three slippery pigs, Bo swings the gate open, the pigs skid into
  // the pen, Bo shuts it: "All in!". Loop 5 s; still at 3.3 s (pigs in, gate shut).
  const pw23pPig = (v, x, y, o) => {
    const ctx = v.ctx, s = o.s || 1, f = o.face || 1, run = o.run || 0, t = o.t || 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(f * s, s);
    v.shadow(0, 8, 22);
    // legs (trotting)
    ctx.fillStyle = '#e48aa4';
    for (let i = 0; i < 4; i++) { const lx = -8 + i * 5.3, sw = Math.sin(t * 22 + i * 1.7) * 2.4 * run; ctx.fillRect(lx + sw, 3, 3, 6); }
    // body, head, ear, snout, tail
    ctx.fillStyle = '#ffb6c8'; v.rr(-12, -8, 22, 14, 7); ctx.fill();
    if (o.spot) { ctx.fillStyle = '#e892aa'; v.circle(-4, -3, 3.2); ctx.fill(); }
    v.fillCircle(11, -4, 7, '#ffb6c8');
    ctx.fillStyle = '#f496b0'; ctx.beginPath(); ctx.moveTo(8, -10); ctx.lineTo(13, -15); ctx.lineTo(14, -8); ctx.fill();
    v.fillCircle(17, -3, 3.2, '#f496b0');
    ctx.fillStyle = '#8a3a52'; ctx.fillRect(16, -4, 1.1, 1.6); ctx.fillRect(18, -4, 1.1, 1.6);
    v.fillCircle(12, -6, 1.2, '#2b1d22');
    ctx.strokeStyle = '#e48aa4'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(-14, -4, 2.6, 0, Math.PI * 1.6); ctx.stroke();
    ctx.restore();
  };
  definePreview('Runaway Pigs', {
    blurb: 'One claps the slippery pigs along, one opens and shuts the gates.',
    loop: 5,
    still: 3.3,
    draw(v, t) {
      const ctx = v.ctx;
      // grass with mown stripes, a dirt track
      ctx.fillStyle = '#8fd264'; ctx.fillRect(0, 0, v.W, v.H);
      ctx.fillStyle = '#86ca5c'; for (let i = 0; i < 9; i++) ctx.fillRect(i * 40, 0, 20, v.H);
      ctx.fillStyle = '#e2c58c'; v.rr(-10, 92, 270, 34, 16); ctx.fill();
      // the hedge along the top and a little red barn far away
      ctx.fillStyle = '#4f9a42'; ctx.fillRect(0, 0, v.W, 26);
      for (let i = 0; i < 12; i++) v.fillCircle(i * 30 + 10, 26, 13, '#5aa84c');
      ctx.fillStyle = '#c8483c'; ctx.fillRect(26, 4, 40, 26); ctx.fillStyle = '#7e2a22';
      ctx.beginPath(); ctx.moveTo(22, 6); ctx.lineTo(46, -8); ctx.lineTo(70, 6); ctx.fill();
      // the pen on the right (fences and a trough)
      const px = 250, py0 = 48, py1 = 168, gy0 = 88, gy1 = 132;
      ctx.fillStyle = '#d9c27a'; ctx.fillRect(px, py0, v.W - px, py1 - py0);
      ctx.fillStyle = '#a8743f';
      ctx.fillRect(px, py0 - 3, v.W - px, 5); ctx.fillRect(px, py1 - 3, v.W - px, 5);
      ctx.fillRect(px - 2, py0, 5, gy0 - py0); ctx.fillRect(px - 2, gy1, 5, py1 - gy1);
      ctx.fillStyle = '#8a5a30'; v.rr(296, 80, 14, 60, 4); ctx.fill(); ctx.fillStyle = '#e8c46a'; ctx.fillRect(299, 84, 8, 52);
      v.pill('PIG PEN', 285, 40, { size: 9, bg: '#c8483c', col: '#fff' });
      // the gate (Bo swings it open at 0.9 s, shut at 3.0 s)
      const open = v.ease.inOut(v.seg(t, 0.9, 1.3)) * (1 - v.ease.inOut(v.seg(t, 3.0, 3.4)));
      const ang = open * 1.5;
      ctx.save(); ctx.translate(px, gy0); ctx.rotate(-ang);
      ctx.fillStyle = '#c99260'; ctx.fillRect(-2, 0, 5, gy1 - gy0); ctx.fillRect(-2, 0, 5, 4);
      ctx.restore();
      // Bo by the gate
      const boX = 236, boY = 80;
      v.hero(1, boX, boY, { s: 0.8, face: 1, mood: t > 3.3 ? 'joy' : 'happy' });
      if (t > 0.8 && t < 1.4) v.label('Open!', boX + 6, boY - 30, 10, v.c.gold || '#ffd84a');
      if (t > 3.0 && t < 3.6) v.label('Click!', boX + 6, boY - 30, 10, '#fff3c4');
      // the pigs: trot right along the track, skid at the gate, end in the pen at the trough
      const pigs = [{ y0: 100, y1: 96, d: 0, spot: true }, { y0: 116, y1: 110, d: 0.18 }, { y0: 108, y1: 124, d: 0.34, spot: true }];
      pigs.forEach((q, i) => {
        const k = v.ease.inOut(v.seg(t, 0.5 + q.d, 2.7 + q.d * 0.6));
        let x = v.lerp(60 + i * 18, 270 + (i % 2) * 12, k), y = v.lerp(q.y0, q.y1, k) + Math.sin(t * 9 + i) * (k > 0 && k < 1 ? 3 : 0);
        // a little wiggle away from Pip's clap (slippery!)
        if (t > 1.1 && t < 1.7) x += Math.sin((t - 1.1) * 10) * 4;
        pw23pPig(v, x, y, { s: 1, face: 1, run: k > 0 && k < 1 ? 1 : 0.2, t, spot: q.spot });
      });
      // Pip walks behind them and claps
      const pk = v.ease.inOut(v.seg(t, 0.3, 2.6));
      const pipX = v.lerp(26, 200, pk);
      v.hero(0, pipX, 132, { s: 0.8, face: 1, mood: 'happy' });
      for (const c0 of [0.6, 1.6]) {
        const ck = v.seg(t, c0, c0 + 0.5);
        if (ck > 0 && ck < 1) {
          ctx.strokeStyle = 'rgba(255,255,255,' + (1 - ck).toFixed(2) + ')'; ctx.lineWidth = 3;
          v.circle(pipX, 118, 10 + ck * 46); ctx.stroke();
          v.label('CLAP!', pipX, 92, 10, '#ffffff');
        }
      }
      // all in
      if (t > 3.3 && t < 4.5) {
        v.pill('All in!', 160, 60, { size: 16, bg: '#ffd84a', col: '#5a3a10' });
        v.confetti(285, 60, v.seg(t, 3.3, 4.5));
      }
      // a soft fade over the loop's seam
      const fade = 0.85 * Math.max(v.seg(t, 4.65, 5), 1 - v.seg(t, 0, 0.2));
      if (fade > 0) { ctx.fillStyle = 'rgba(143,210,100,' + fade.toFixed(2) + ')'; ctx.fillRect(0, 0, v.W, v.H); }
    },
  });
  // ----- END 23-2 Runaway Pigs preview -----
  //
  //
  //
  //
  // ----- BEGIN 23-3 Hot Dog Stand Rush preview -----
  // (being built)
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
