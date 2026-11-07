/* Pip & Bo - Level previews for World 18 Pirate Cove (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw18. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 18-1 Runaway Ship preview -----
  // Side view of the little ship: Pip at the wheel steers away from a rock, a leak spouts and Bo hammers it shut,
  // a big wave rolls in and Pip rings the bell as it hits ("Over the top!"), then at the buoy they swap jobs.
  const pw18rSeaY = 122, pw18rDeckY = 104;
  // the ship's lane (0 near .. 1 far) and the wave crest's x at time t
  const pw18rLane = t => (t < 0.35 ? 0 : t < 0.9 ? (t - 0.35) / 0.55 : t < 2.3 ? 1 : t < 2.8 ? 1 - (t - 2.3) / 0.5 : 0);
  const pw18rWaveX = t => 360 - (t - 2.9) * 190;
  const pw18rPitch = t => (t > 3.45 && t < 4.35 ? -0.13 * Math.sin((t - 3.45) / 0.9 * Math.PI * 2) * (1 - (t - 3.45) / 0.9) - 0.06 * Math.sin((t - 3.45) / 0.9 * Math.PI) : 0);
  function pw18rSea(v, t, y0, alpha) {
    const ctx = v.ctx;
    ctx.fillStyle = alpha ? 'rgba(46,160,200,0.92)' : '#3fb3d6'; ctx.beginPath(); ctx.moveTo(0, v.H);
    for (let x = 0; x <= v.W + 8; x += 8) ctx.lineTo(x, y0 + Math.sin(x / 18 + t * 3 + y0) * 2);
    ctx.lineTo(v.W, v.H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
    for (let k = 0; k < 6; k++) { const x = ((k * 61 - t * 40) % 360 + 360) % 360 - 20, y = y0 + 10 + (k % 3) * 9; ctx.beginPath(); ctx.arc(x, y, 5, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke(); }
  }
  function pw18rShip(v, t) {
    const ctx = v.ctx, x0 = 70, x1 = 252;
    // hull
    ctx.fillStyle = '#9a5a2c'; ctx.beginPath(); ctx.moveTo(x0 - 6, pw18rDeckY - 12); ctx.lineTo(x0 + 34, pw18rDeckY - 12); ctx.lineTo(x0 + 34, pw18rDeckY);
    ctx.lineTo(x1 - 34, pw18rDeckY); ctx.lineTo(x1 - 34, pw18rDeckY - 9); ctx.lineTo(x1 + 8, pw18rDeckY - 12); ctx.lineTo(x1 - 8, pw18rSeaY + 4);
    ctx.lineTo(x0 + 10, pw18rSeaY + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e4523e'; ctx.fillRect(x0 + 4, pw18rDeckY + 6, x1 - x0 - 8, 3); ctx.fillStyle = '#ffcf4a'; ctx.fillRect(x0 + 6, pw18rDeckY + 9, x1 - x0 - 12, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; for (let y = pw18rDeckY + 14; y < pw18rSeaY; y += 5) ctx.fillRect(x0 + 10, y, x1 - x0 - 20, 1);
    for (const px of [120, 150, 180, 210]) { v.fillCircle(px, pw18rDeckY + 15, 2.6, '#ffcf4a'); v.fillCircle(px, pw18rDeckY + 15, 1.6, '#2a3a5a'); }
    ctx.fillStyle = '#c98a4e'; ctx.fillRect(x0 + 34, pw18rDeckY - 2, x1 - x0 - 68, 3);
    // mast, sail, flag
    ctx.fillStyle = '#7a4a22'; ctx.fillRect(158, 18, 5, pw18rDeckY - 18);
    ctx.fillStyle = '#8a5a2e'; v.rr(151, 22, 19, 7, 2); ctx.fill();
    const puff = Math.sin(t * 2) * 2;
    ctx.fillStyle = '#fff6e2'; ctx.beginPath(); ctx.moveTo(130, 36); ctx.lineTo(192, 36); ctx.quadraticCurveTo(198 + puff, 58, 190, 84); ctx.lineTo(132, 84); ctx.quadraticCurveTo(138 + puff, 58, 130, 36); ctx.fill();
    ctx.fillStyle = '#e4523e'; ctx.fillRect(146, 36, 7, 48); ctx.fillRect(170, 36, 7, 48);
    ctx.fillStyle = '#7a4a22'; ctx.fillRect(126, 33, 70, 3);
    ctx.fillStyle = '#ff5a4a'; ctx.beginPath(); ctx.moveTo(163, 18); ctx.lineTo(180 + Math.sin(t * 6) * 2, 21); ctx.lineTo(163, 25); ctx.fill();
    ctx.strokeStyle = '#d9b77a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(163, 26); ctx.lineTo(x1 + 6, pw18rDeckY - 12); ctx.stroke();
    // the wheel and the bell
    ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 2; v.circle(84, pw18rDeckY - 27, 8); ctx.stroke();
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4 + Math.sin(t * 2) * 0.4; v.line(84 - Math.cos(a) * 11, pw18rDeckY - 27 - Math.sin(a) * 11, 84 + Math.cos(a) * 11, pw18rDeckY - 27 + Math.sin(a) * 11, '#7a4a22', 1.6); }
    ctx.fillStyle = '#7a4a22'; ctx.fillRect(83, pw18rDeckY - 26, 2, 14);
    const ring = t > 3.35 && t < 3.9 ? Math.sin((t - 3.35) * 30) * 0.5 * (1 - (t - 3.35) / 0.55) : 0;
    ctx.fillStyle = '#7a4a22'; ctx.fillRect(101, pw18rDeckY - 36, 2, 24); ctx.fillRect(101, pw18rDeckY - 36, 10, 2);
    ctx.save(); ctx.translate(110, pw18rDeckY - 34); ctx.rotate(ring); ctx.fillStyle = v.c.gold;
    ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.lineTo(6, 9); ctx.lineTo(-6, 9); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function pw18rRock(v, x, y) {
    const ctx = v.ctx;
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(x, y, 20, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7d8094'; ctx.beginPath(); ctx.moveTo(x - 16, y); ctx.lineTo(x - 8, y - 22); ctx.lineTo(x + 6, y - 26); ctx.lineTo(x + 16, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a2a6b8'; ctx.beginPath(); ctx.moveTo(x - 8, y - 22); ctx.lineTo(x + 6, y - 26); ctx.lineTo(x + 1, y - 12); ctx.closePath(); ctx.fill();
  }
  function pw18rBuoy(v, x, y, t) {
    const ctx = v.ctx, b = Math.sin(t * 4) * 1.5;
    ctx.fillStyle = '#ff5a4a'; v.rr(x - 6, y - 16 + b, 12, 16, 4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 6, y - 10 + b, 12, 4);
    ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x - 1, y - 26 + b, 2, 10); v.fillCircle(x, y - 27 + b, 2.5, v.c.gold);
  }
  definePreview('Runaway Ship', {
    blurb: 'One steers the ship past rocks and waves, the other patches leaks on deck. Swap at every buoy!',
    loop: 6.2,
    still: 3.6,
    draw(v, t) {
      const ctx = v.ctx, lane = pw18rLane(t), shipDy = -lane * 10, wx = pw18rWaveX(t);
      v.sky(); v.sun(270, 32, 13); v.clouds(t);
      // islands on the far sea
      ctx.fillStyle = '#7fcf8a'; ctx.beginPath(); ctx.ellipse(40, 98, 34, 10, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#6cc07a'; ctx.beginPath(); ctx.ellipse(292, 98, 26, 8, 0, Math.PI, 0); ctx.fill();
      v.line(292, 92, 289, 76, '#8a5a2e', 2); ctx.fillStyle = '#3e9a4a'; ctx.beginPath(); ctx.ellipse(284, 75, 7, 2.5, 0.4, 0, Math.PI * 2); ctx.ellipse(295, 75, 7, 2.5, -0.4, 0, Math.PI * 2); ctx.fill();
      pw18rSea(v, t, 98, false);
      // the far rock (in the lane the ship leaves)
      const rx = 380 - t * 95;
      if (rx > -30 && rx < 350) pw18rRock(v, rx, 148);
      // the ship (bobbing, rocking over the wave)
      const bob = Math.sin(t * 2.4) * 1.2;
      ctx.save(); ctx.translate(160, pw18rSeaY + shipDy + bob); ctx.rotate(pw18rPitch(t)); ctx.translate(-160, -pw18rSeaY);
      pw18rShip(v, t);
      // the leak: a spout, then Bo hammers a plank over it
      const lx = 204;
      if (t > 1.5 && t < 2.85) for (let k = 0; k < 5; k++) { const p = v.phase(t, 0.5, k * 0.1); v.fillCircle(lx + (k - 2) * 2.5 * p * 3, pw18rDeckY - 2 - Math.sin(p * Math.PI) * 18, 2.2, '#7fd4f0'); }
      if (t > 2.85) { ctx.fillStyle = '#c98a4e'; ctx.fillRect(lx - 7, pw18rDeckY - 3, 14, 3); }
      // the heroes: Pip at the wheel, Bo on deck; at the buoy they hop past each other
      const sw = v.seg(t, 5.0, 5.6), swE = v.ease.inOut(sw);
      const boX = t < 1.6 ? 150 : t < 2.05 ? v.lerp(150, lx - 10, (t - 1.6) / 0.45) : lx - 10;
      const pipX = v.lerp(84, boX, swE), bX = v.lerp(boX, 84, swE);
      const hammer = t > 2.05 && t < 2.85;
      const pipMood = t > 3.5 && t < 4.4 ? 'joy' : t > 0.1 && t < 0.9 ? 'grit' : 'happy';
      v.hero(0, pipX, pw18rDeckY - 2 + v.hop(sw, 22), { s: 0.8, face: sw > 0 && sw < 1 ? 1 : 1, mood: sw > 0 && sw < 1 ? 'joy' : pipMood });
      v.hero(1, bX, pw18rDeckY - 2 + v.hop(sw, 14), { s: 0.8, face: sw > 0 && sw < 1 ? -1 : 1, mood: hammer ? 'grit' : t > 2.85 && t < 3.6 ? 'joy' : 'happy', sq: hammer ? Math.abs(Math.sin(t * 14)) * 0.15 : 0 });
      if (hammer) {
        const a = -0.9 + Math.abs(Math.sin(t * 14)) * 1.3;
        ctx.save(); ctx.translate(bX + 7, pw18rDeckY - 14); ctx.rotate(a);
        ctx.fillStyle = '#8a5a2e'; ctx.fillRect(0, -1, 12, 2.4); ctx.fillStyle = '#9aa0b0'; ctx.fillRect(10, -4, 5, 8); ctx.restore();
        ctx.strokeStyle = v.c.gold; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(bX, pw18rDeckY - 34, 5, -Math.PI / 2, -Math.PI / 2 + (t - 2.05) / 0.8 * Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
      // the big wave rolling in
      if (wx > -60 && wx < 380) {
        const g = ctx.createLinearGradient(0, 88, 0, 150); g.addColorStop(0, 'rgba(70,190,225,0.95)'); g.addColorStop(1, 'rgba(70,190,225,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(wx - 50, 150); ctx.quadraticCurveTo(wx - 14, 132, wx - 4, 104); ctx.quadraticCurveTo(wx + 8, 88, wx + 24, 98); ctx.quadraticCurveTo(wx + 36, 128, wx + 70, 150); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(wx - 8, 110); ctx.quadraticCurveTo(wx + 6, 86, wx + 24, 98); ctx.stroke();
        v.fillCircle(wx + 26, 100, 2.5, '#fff'); v.fillCircle(wx + 20, 93, 2, '#fff');
      }
      // the buoy that ends the stretch
      const bx = 400 - (t - 4.2) * 110;
      if (t > 4.2 && bx > -20) pw18rBuoy(v, bx, 140, t);
      pw18rSea(v, t, 156, true);
      // words
      if (t > 0.15 && t < 1.1) v.bubble('Rock! Steer up!', 96, 46, { size: 9 });
      if (t > 1.6 && t < 2.1) v.label('Leak!', 226, 70, 13, '#7fd4f0');
      if (t > 2.85 && t < 3.4) v.label('Patched!', 214, 66 - (t - 2.85) * 10, 13, v.c.gold);
      if (t > 3.35 && t < 3.8) v.label('Ding!', 120, 54, 13, v.c.gold);
      if (t > 3.6 && t < 4.6) v.label('Over the top!', 160, 18 + (t - 3.6) * 4, 16, '#fff');
      if (t > 4.9 && t < 6.0) v.pill('Swap jobs!', 160, 160, { size: 12 });
      // fade at the seam (the jobs reset)
      const f = Math.max(v.seg(t, 5.95, 6.2), 1 - v.seg(t, 0, 0.2));
      if (f > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (f * 0.85) + ')'; ctx.fillRect(0, 0, v.W, v.H); }
    },
  });
  // ----- END 18-1 Runaway Ship preview -----
  //
  //
  //
  // ----- BEGIN 18-2 Grapple & Zip preview -----
  // (preview goes here)
  // ----- END 18-2 Grapple & Zip preview -----
  //
  //
  //
  // ----- BEGIN 18-3 Tide Pool Dig preview -----
  // (preview goes here)
  // ----- END 18-3 Tide Pool Dig preview -----
  //
  //
  //
  // ----- BEGIN 18-4 Plank Duel preview -----
  // (preview goes here)
  // ----- END 18-4 Plank Duel preview -----
  //
  //
  //
}
