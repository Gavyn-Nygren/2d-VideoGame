/* Pip & Bo - Level previews for World 17 Jungle Jamboree (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw17. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 17-1 Temple Doors preview -----
  // PLACEHOLDER
  // ----- END 17-1 Temple Doors preview -----
  //
  // ----- BEGIN 17-2 River Rapids Canoe preview -----
  // PLACEHOLDER
  // ----- END 17-2 River Rapids Canoe preview -----
  //
  // ----- BEGIN 17-3 Waterfall Climb preview -----
  // beside a jungle waterfall Bo braces at the foot of a tall ledge; Pip hops on Bo's hands and BOOSTS way up, the view
  // climbs with them, Pip drops a vine at the post and Bo climbs it; both cheer as Tico the toucan flies past.
  const pw17wWall = { x: 196, top: 74 };            // the ledge (world px; ground at 160)
  const pw17wPip = (v, t) => {
    // Pip's feet (world px), its squash and mood along the loop
    const G = 160, onHands = G - 15;
    if (t < 0.9) return { x: 58 + 92 * v.ease.inOut(t / 0.9), y: G, sq: 0, mood: 'happy', face: 1 };
    if (t < 1.25) { const k = v.seg(t, 0.9, 1.25); return { x: v.lerp(150, 176, k), y: v.lerp(G, onHands, k) + v.hop(k, 18), sq: -0.1, mood: 'happy', face: 1 }; }
    if (t < 1.45) return { x: 176, y: onHands, sq: 0.35 * Math.sin(v.seg(t, 1.25, 1.45) * Math.PI), mood: 'grit', face: 1 };
    if (t < 2.25) {
      // the BIG boost: way up and over onto the ledge
      const k = v.seg(t, 1.45, 2.25), up = v.ease.out(Math.min(1, k * 1.25));
      return { x: v.lerp(176, 222, v.ease.inOut(k)), y: v.lerp(onHands, pw17wWall.top, up) - Math.sin(k * Math.PI) * 22, sq: -0.3 * (1 - k), mood: 'wow', face: 1 };
    }
    if (t < 2.6) return { x: v.lerp(222, 210, v.seg(t, 2.25, 2.6)), y: pw17wWall.top, sq: 0.3 * Math.max(0, 1 - (t - 2.25) * 6), mood: 'joy', face: -1 };
    if (t < 4.5) return { x: 210, y: pw17wWall.top, sq: t > 3.0 ? 0.08 * Math.sin(t * 14) : 0, mood: t > 3.0 ? 'grit' : 'happy', face: -1 };
    return { x: 210 + 6 * v.ease.inOut(v.seg(t, 4.5, 4.9)), y: pw17wWall.top + v.hop(v.phase(t - 4.9, 0.55), 10) * (t > 4.9 ? 1 : 0), sq: 0, mood: 'joy', face: -1 };
  };
  const pw17wBo = (v, t) => {
    const G = 160;
    if (t < 1.45) return { x: 176, y: G, sq: 0.35, mood: 'grit', face: 1 };
    if (t < 3.0) return { x: v.lerp(176, 184, v.seg(t, 2.6, 3.0)), y: G, sq: t < 1.7 ? 0.35 * (1 - v.seg(t, 1.45, 1.7)) : 0, mood: t < 2.3 ? 'wow' : 'happy', face: 1 };
    if (t < 4.2) { const k = v.ease.inOut(v.seg(t, 3.0, 4.2)); return { x: 184, y: v.lerp(G, pw17wWall.top + 4, k), sq: -0.08 + 0.08 * Math.sin(t * 16), mood: 'grit', face: 1, climb: true }; }
    if (t < 4.5) { const k = v.seg(t, 4.2, 4.5); return { x: v.lerp(184, 252, k), y: pw17wWall.top + v.hop(k, 14), sq: 0, mood: 'joy', face: 1 }; }
    return { x: 252, y: pw17wWall.top + v.hop(v.phase(t - 4.65, 0.55), 10) * (t > 4.65 ? 1 : 0), sq: 0, mood: 'joy', face: -1 };
  };
  const pw17wToucan = (v, x, y, flap) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#262340'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-2, -2); ctx.quadraticCurveTo(6, -14 * flap, 14, -6 * flap); ctx.lineTo(4, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.ellipse(-7, -2, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff9a1f'; ctx.beginPath(); ctx.moveTo(-10, -5); ctx.quadraticCurveTo(-26, -6, -28, 0); ctx.quadraticCurveTo(-20, 1, -10, 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8443a'; ctx.beginPath(); ctx.moveTo(-28, 0); ctx.lineTo(-24, -3); ctx.lineTo(-23, 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#262340'; v.circle(-7, -3, 1.5); ctx.fill();
    ctx.restore();
  };
  definePreview('Waterfall Climb', {
    blurb: 'Brace for a BIG boost up the falls, then drop a vine for your partner!',
    loop: 6,
    still: 1.9,
    draw(v, t) {
      const ctx = v.ctx, W = v.W, H = v.H;
      // the view climbs with the boost
      const cam = 34 * v.ease.inOut(v.seg(t, 1.5, 2.6)) * (1 - v.ease.inOut(v.seg(t, 5.55, 6)));
      const Y = y => y + cam;
      // jungle sky and leafy sides
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#bfe9d2'); g.addColorStop(1, '#eaf7d6');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#5fae6e';
      ctx.beginPath(); ctx.moveTo(0, 0);
      for (let y = 0; y <= H; y += 10) ctx.lineTo(34 + Math.sin((y - cam) / 23) * 9, y);
      ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4c9a5f';
      for (let k = 0; k < 6; k++) { const ly = ((k * 41 + cam) % 220) - 20; ctx.beginPath(); ctx.ellipse(30, ly, 16, 6, 0.6, 0, Math.PI * 2); ctx.fill(); }
      // the waterfall (streaks fall with t), with mist at the foot
      ctx.fillStyle = 'rgba(150,215,240,0.75)'; ctx.fillRect(70, 0, 58, H);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let k = 0; k < 9; k++) { const sx = 74 + k * 6.2, sy = ((t * 150 + k * 37) % 220) - 30; ctx.fillRect(sx, sy, 2, 18 + (k % 3) * 6); }
      for (let k = 0; k < 6; k++) v.fillCircle(78 + k * 9, Y(160) - 2 - Math.abs(Math.sin(t * 4 + k)) * 5, 6, 'rgba(255,255,255,0.7)');
      // ground and the tall ledge (with a gem waiting on top)
      v.block(40, Y(160), W - 40, 40, true);
      v.block(pw17wWall.x, Y(pw17wWall.top), W - pw17wWall.x, 200, true);
      const gemGot = t > 4.6;
      if (!gemGot) { ctx.save(); ctx.translate(290, Y(pw17wWall.top) - 14 + Math.sin(t * 3) * 2); ctx.fillStyle = '#ff7fb0'; ctx.strokeStyle = '#c23f78'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(5, 0); ctx.lineTo(0, 6); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
      // a friendly frog by the pool
      const blink = v.phase(t, 2.3) > 0.93;
      v.fillCircle(56, Y(156), 7, '#7fcf5a'); v.fillCircle(52, Y(150), 3.2, '#7fcf5a'); v.fillCircle(60, Y(150), 3.2, '#7fcf5a');
      if (!blink) { v.fillCircle(52, Y(150), 1.4, v.c.ink); v.fillCircle(60, Y(150), 1.4, v.c.ink); }
      // the vine post and the vine (unrolls at 2.6-3.0, rolls up after Bo is up)
      const px = pw17wWall.x + 4;
      ctx.fillStyle = '#9a6a3c'; ctx.fillRect(px - 2, Y(pw17wWall.top) - 14, 5, 14);
      const len = (pw17wWall.top < 160 ? 160 - pw17wWall.top : 0) * (v.seg(t, 2.6, 3.0) - v.seg(t, 4.3, 4.7));
      if (len > 1) {
        ctx.strokeStyle = '#3f9b4d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px - 8, Y(pw17wWall.top) - 10);
        for (let k = 0; k <= 10; k++) ctx.lineTo(px - 12 + Math.sin(k * 1.3 + t * 2) * 1.5, Y(pw17wWall.top) - 10 + len * k / 10);
        ctx.stroke();
        ctx.fillStyle = '#5cc27f';
        for (let k = 1; k < 6; k++) if (k * len / 6 < len - 4) { ctx.beginPath(); ctx.ellipse(px - 8, Y(pw17wWall.top) - 10 + k * len / 6, 4, 2, 0.6, 0, Math.PI * 2); ctx.fill(); }
      }
      // the pair
      const b = pw17wBo(v, t), p = pw17wPip(v, t);
      v.hero(1, b.x, Y(b.y), { sq: b.sq, mood: b.mood, face: b.face, shadow: !b.climb });
      v.hero(0, p.x, Y(p.y), { sq: p.sq, mood: p.mood, face: p.face });
      // words
      if (t > 1.3 && t < 2.0) { ctx.save(); ctx.globalAlpha = 1 - v.seg(t, 1.75, 2.0); v.label('BOOST!', 176, Y(122) - 20 * v.seg(t, 1.3, 2.0), 20, v.c.gold); ctx.restore(); }
      if (t < 1.3) v.bubble('Hop on!', 176, Y(122), { size: 11 });
      if (t > 2.65 && t < 3.3) v.label('Vine!', 214, Y(pw17wWall.top) - 36, 15, '#9cf06a');
      if (t > 3.2 && t < 4.2) v.label('Heave!', 228, Y(pw17wWall.top) - 36, 15, '#fff');
      // the happy payoff: Tico flies past, sparkles
      if (t > 4.5) {
        const k = v.seg(t, 4.5, 6);
        pw17wToucan(v, v.lerp(W + 30, -40, k), 34 + Math.sin(k * 9) * 6, Math.sin(t * 18) > 0 ? 1 : -0.4);
        v.sparkle(236, Y(pw17wWall.top) - 36, v.phase(t, 0.7));
        v.sparkle(212, Y(pw17wWall.top) - 44, v.phase(t + 0.35, 0.7));
        if (t > 4.6 && t < 5.4) v.label('Up!', 268, Y(pw17wWall.top) - 40 - 10 * v.seg(t, 4.6, 5.4), 18, v.c.gold);
      }
    },
  });
  // ----- END 17-3 Waterfall Climb preview -----
  //
  // ----- BEGIN 17-4 Vine Swing preview -----
  // PLACEHOLDER
  // ----- END 17-4 Vine Swing preview -----
  //
}
