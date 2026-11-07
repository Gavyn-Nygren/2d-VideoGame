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
  // Two friendly pirate ships. Pip aims from the crow's nest, charges and throws the grappling hook through the next ring
  // ("Clink!"). Bo zips down the rope grabbing a coin and lifting legs over a flag, then cranks the capstan while Pip
  // rides across in the bosun's chair. "All aboard!"
  const pw18gSEA = 146, pw18gA = { x: 86, y: 50 }, pw18gR = { x: 246, y: 80 };
  // the rope from the nest to the ring: a sagging curve, k 0..1
  const pw18gRope = (k, sag) => {
    const cx = (pw18gA.x + pw18gR.x) / 2, cy = (pw18gA.y + pw18gR.y) / 2 + sag, u = 1 - k;
    return { x: u * u * pw18gA.x + 2 * u * k * cx + k * k * pw18gR.x, y: u * u * pw18gA.y + 2 * u * k * cy + k * k * pw18gR.y };
  };
  const pw18gBob = (t, ph) => Math.sin(t * 2.2 + ph) * 1.5;
  function pw18gShip(v, x, w, hull, sail, t, ph, nestY, nameStr) {
    const ctx = v.ctx, y = pw18gSEA + pw18gBob(t, ph), mx = x + w * 0.5;
    // mast, sail, crow's nest, rope ladder
    v.line(mx, y - 18, mx, nestY - 18, '#6b4424', 3.5);
    ctx.fillStyle = '#fff6e4'; v.rr(mx - 22, nestY + 22, 44, 30, 3); ctx.fill();
    ctx.fillStyle = sail; for (let k = 0; k < 3; k++) ctx.fillRect(mx - 22 + k * 16, nestY + 22, 8, 30);
    v.fillCircle(mx, nestY + 37, 6, '#ffd65a'); v.fillCircle(mx - 2, nestY + 36, 0.9, '#5a3a10'); v.fillCircle(mx + 2, nestY + 36, 0.9, '#5a3a10');
    ctx.fillStyle = '#8a5a30'; v.rr(mx - 14, nestY, 28, 8, 2); ctx.fill();
    ctx.fillStyle = '#6b4424'; ctx.fillRect(mx - 14, nestY + 2, 28, 1.5);
    v.flag(mx, nestY - 18, sail);
    // hull
    ctx.fillStyle = hull; ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x + w, y - 18); ctx.lineTo(x + w - 10, y + 6); ctx.lineTo(x + 10, y + 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe2a0'; ctx.fillRect(x + 3, y - 12, w - 6, 3);
    for (let k = 0; k < 4; k++) v.fillCircle(x + 18 + k * (w - 36) / 3, y - 3, 2.4, '#fff6e4');
    ctx.fillStyle = '#8a5a30'; ctx.fillRect(x - 2, y - 21, w + 4, 3);
    if (nameStr) v.pill(nameStr, x + w / 2, y + 16, { size: 7, bg: 'rgba(40,24,10,0.6)', col: '#ffe9b0' });
    return y - 21;
  }
  function pw18gPalm(v, x, y) {
    const ctx = v.ctx; ctx.fillStyle = '#3e9a4a';
    for (const a of [-2.6, -1.9, -1.2, -0.5]) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(9, 0, 10, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }
  function pw18gHook(v, x, y, rot) {
    const ctx = v.ctx; ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.strokeStyle = '#c8d4e6'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(4, 0); ctx.moveTo(4, 0); ctx.arc(4, -3.5, 3.5, Math.PI / 2, -Math.PI / 2, true); ctx.moveTo(4, 0); ctx.arc(4, 3.5, 3.5, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.restore();
  }
  definePreview('Grapple & Zip', {
    blurb: 'Throw the hook to the next ship, zip down the rope, crank your partner over!',
    loop: 6.4,
    still: 2.9,
    draw(v, t) {
      const ctx = v.ctx;
      // sky, sun, an island and the sea
      const g = ctx.createLinearGradient(0, 0, 0, pw18gSEA); g.addColorStop(0, '#62c6f2'); g.addColorStop(1, '#bdeaf8');
      ctx.fillStyle = g; ctx.fillRect(0, 0, v.W, pw18gSEA);
      v.fillCircle(286, 26, 14, '#fff3b0');
      v.clouds(t);
      ctx.fillStyle = '#5cc070'; ctx.beginPath(); ctx.ellipse(160, pw18gSEA, 56, 16, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#f3dca0'; ctx.fillRect(104, pw18gSEA - 2, 112, 3);
      v.line(150, pw18gSEA - 12, 146, pw18gSEA - 36, '#8a5a30', 2.5); pw18gPalm(v, 146, pw18gSEA - 36);
      v.water(0, pw18gSEA, v.W, v.H - pw18gSEA, t);
      // the ships
      const nestL = 52, nestR = 60;
      pw18gShip(v, 30, 104, '#e2604a', '#f07a62', t, 0, nestL, 'Sea Biscuit');
      const deckR = pw18gShip(v, 198, 106, '#3db3a8', '#5fd1c4', t, 1.4, nestR, 'Jolly Jelly');
      // the ring on the right mast
      const rg = pw18gR, caughtT = 1.9;
      ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 3; v.circle(rg.x, rg.y, 6); ctx.stroke();
      if (t < caughtT) { ctx.save(); ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 8); ctx.strokeStyle = '#fff6a0'; ctx.lineWidth = 2; v.circle(rg.x, rg.y, 10); ctx.stroke(); ctx.restore(); }
      v.line(rg.x + 6, rg.y, 251 + 0, rg.y, '#6b4424', 2);
      // a flag on the way (flown from a little rowboat) and a coin on the rope
      const flagX = 172, coinK = 0.42;
      // aim, charge, throw
      const thrown = t > 1.2, sag = t < 3.7 ? 14 : 14 + 8 * v.seg(t, 3.7, 4.0);
      if (t < 1.2) {
        // the aim dots and the power meter
        const a = -0.45 + 0.12 * Math.sin(t * 2), p = v.seg(t, 0.35, 1.2);
        for (let k = 1; k < 6; k++) { const d = k * 14; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(pw18gA.x + Math.cos(a) * d, pw18gA.y - 8 + Math.sin(a) * d + k * k * 0.6, 1.7, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = 'rgba(28,26,54,0.75)'; v.rr(pw18gA.x - 34, pw18gA.y + 12, 60, 8, 4); ctx.fill();
        ctx.fillStyle = '#ffd24a'; v.rr(pw18gA.x - 33, pw18gA.y + 13, 58 * p, 6, 3); ctx.fill();
      }
      let hookX = rg.x, hookY = rg.y;
      if (thrown && t < caughtT) {
        const k = v.seg(t, 1.2, caughtT);
        hookX = v.lerp(pw18gA.x, rg.x, k); hookY = v.lerp(pw18gA.y - 8, rg.y, k) - 46 * Math.sin(Math.PI * k);
        // the line paying out behind the hook
        ctx.strokeStyle = '#c9a26a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(pw18gA.x, pw18gA.y);
        for (let q = 0; q <= 12; q++) { const kk = k * q / 12; ctx.lineTo(v.lerp(pw18gA.x, rg.x, kk), v.lerp(pw18gA.y - 8, rg.y, kk) - 46 * Math.sin(Math.PI * kk) + 6 * q / 12); }
        ctx.stroke();
        pw18gHook(v, hookX, hookY, Math.atan2(-46 * Math.PI * Math.cos(Math.PI * k), rg.x - pw18gA.x));
      }
      if (t >= caughtT) {
        // the rope, taut, nest to ring
        ctx.strokeStyle = '#a77b44'; ctx.lineWidth = 2.2; ctx.beginPath();
        for (let q = 0; q <= 24; q++) { const p = pw18gRope(q / 24, sag); q ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
        ctx.stroke();
        pw18gHook(v, rg.x + 2, rg.y, 0);
      }
      if (t > caughtT && t < caughtT + 0.8) v.label('Clink!', rg.x - 6, rg.y - 18 - (t - caughtT) * 10, 13, '#ffffff');
      // the flag boat
      { const by = pw18gSEA + 2 + pw18gBob(t, 2.2); ctx.fillStyle = '#8a5a30'; v.rr(flagX - 12, by - 5, 24, 7, 3); ctx.fill();
        v.line(flagX, by - 5, flagX, 104, '#6b4424', 1.6); ctx.fillStyle = '#ff7a8a'; ctx.beginPath(); ctx.moveTo(flagX, 104); ctx.lineTo(flagX + 11, 108); ctx.lineTo(flagX, 112); ctx.fill(); }
      // the coin (until Bo grabs it)
      const zipK = t < 2.2 ? 0 : t < 3.6 ? v.ease.in(v.seg(t, 2.2, 3.6)) * 0.98 : 0.98;
      const zipping = t >= 2.2 && t < 3.7;
      const coinGot = zipK > coinK;
      if (t >= caughtT && !coinGot) { const p = pw18gRope(coinK, sag); v.star(p.x, p.y + 16, 4.5, '#ffd24a'); ctx.strokeStyle = '#c99a20'; ctx.lineWidth = 1; v.circle(p.x, p.y + 16, 5); ctx.stroke(); }
      if (coinGot && t < 3.7) { const p = pw18gRope(coinK, sag), k = v.seg(t, 2.85, 3.5); v.label('+1', p.x, p.y + 6 - k * 14, 11, '#ffe08a'); v.sparkle(p.x, p.y + 16, k); }
      // the capstan on the right deck
      const capX = 222, cr = t > 3.9 && t < 5.4 ? t * 6 : 0;
      ctx.fillStyle = '#8a5a30'; v.rr(capX - 5, deckR - 12, 10, 12, 2); ctx.fill();
      ctx.save(); ctx.translate(capX, deckR - 13); ctx.rotate(cr); v.line(-9, 0, 9, 0, '#6b4424', 2); ctx.restore();
      // Bo: in the left nest, then on the rope, then at the capstan
      if (t < 2.2) v.hero(1, pw18gA.x + 10, nestL, { s: 0.6, face: 1, mood: t > caughtT ? 'joy' : 'happy' });
      else if (zipping) {
        const p = pw18gRope(zipK, sag), legsUp = Math.abs(p.x - flagX) < 18;
        v.line(p.x, p.y, p.x, p.y + 8, '#6b4424', 1.6);
        v.hero(1, p.x, p.y + (legsUp ? 22 : 28), { s: 0.6, face: 1, sq: legsUp ? 0.25 : -0.08, mood: legsUp ? 'wow' : 'joy' });
        if (t < 2.9) v.label('Wheee!', p.x + 26, p.y + 2, 10, '#ffffff');
      } else v.hero(1, capX - 10, deckR, { s: 0.6, face: 1, sq: cr ? Math.sin(t * 12) * 0.08 : 0, mood: t > 5.4 ? 'joy' : 'grit' });
      // Pip: throws from the nest, rides the chair, hops aboard
      const chairK = t < 3.9 ? 0 : v.ease.inOut(v.seg(t, 3.9, 5.4)) * 0.97;
      if (t < 3.9) {
        const throwA = t > 1.2 && t < 1.5 ? 0.25 : 0;
        v.hero(0, pw18gA.x - 8, nestL, { s: 0.6, face: 1, rot: -throwA, mood: t < 1.2 ? 'grit' : t > caughtT ? 'joy' : 'wow' });
      } else if (t < 5.5) {
        const p = pw18gRope(chairK, sag);
        v.line(p.x - 4, p.y, p.x - 4, p.y + 18, '#6b4424', 1.3); v.line(p.x + 4, p.y, p.x + 4, p.y + 18, '#6b4424', 1.3);
        ctx.fillStyle = '#8a5a30'; v.rr(p.x - 7, p.y + 18, 14, 4, 2); ctx.fill();
        v.hero(0, p.x, p.y + 20, { s: 0.6, face: 1, mood: 'joy' });
      } else {
        const k = v.seg(t, 5.5, 5.9);
        v.hero(0, v.lerp(240, 262, k), deckR + v.hop(k, 10), { s: 0.6, face: -1, mood: 'joy' });
      }
      if (t > 4.0 && t < 5.3) v.label('Heave... ho!', capX - 6, 34, 11, '#ffffff');
      if (t > 5.5) { v.confetti(250, 70, (t - 5.5) / 0.9); v.bubble('All aboard!', 252, deckR - 30, { size: 9 }); }
      if (t < 1.2) v.bubble('Hold... let go!', pw18gA.x + 30, 22, { size: 8 });
    },
  });
  // ----- END 18-2 Grapple & Zip preview -----
  //
  //
  //
  // ----- BEGIN 18-3 Tide Pool Dig preview -----
  // Pip digs at the X; a wave pours seawater into the hole ("Glub!"), Bo scoops it out and dumps the bucket in the sea.
  // Pip digs on to the chest (CLUNK!), coins shower out onto the blanket, a crab sneaks for one, Pip lands by it ("Shoo!").
  const pw18tGY = 104, pw18tHX = 128, pw18tHW = 26, pw18tSea = 246, pw18tChest = 46;
  const pw18tEase = k => 1 - (1 - k) * (1 - k);
  // how deep the hole is at time t (Pip stops while it's flooded)
  const pw18tDepth = t => (t < 1.3 ? 30 * (t / 1.3) : t < 2.3 ? 30 : t < 3.4 ? 30 + (pw18tChest - 30) * ((t - 2.3) / 1.1) : pw18tChest);
  // water in the hole: pours in with the wave, Bo scoops it out
  const pw18tWater = t => (t < 1.4 ? 0 : t < 1.9 ? 15 * ((t - 1.4) / 0.5) : t < 2.05 ? 15 : t < 2.3 ? 15 * (1 - (t - 2.05) / 0.25) : 0);
  // the wave's tongue: how far up the beach it reaches
  const pw18tTongue = t => (t < 1.0 ? pw18tSea : t < 1.35 ? pw18tSea - (pw18tSea - 118) * pw18tEase((t - 1.0) / 0.35) : t < 1.6 ? 118 : t < 2.1 ? 118 + (pw18tSea - 118) * ((t - 1.6) / 0.5) : pw18tSea);
  const pw18tBoX = t => (t < 1.7 ? 182 : t < 2.0 ? 182 - 20 * ((t - 1.7) / 0.3) : t < 2.35 ? 162 : t < 3.0 ? 162 + (264 - 162) * ((t - 2.35) / 0.65) : t < 3.3 ? 264 : t < 4.0 ? 264 - (264 - 176) * ((t - 3.3) / 0.7) : 176);
  // the coins that shower out of the chest and land on the blanket (the last one bounces further: the crab's coin)
  const pw18tCoins = [[46, 0], [56, 0], [66, 0], [51, -4], [61, -4], [56, -8], [92, 0]];
  const pw18tCrabX = t => (t < 4.0 ? -14 : t < 4.6 ? -14 + (86 + 14) * ((t - 4.0) / 0.6) : t < 5.0 ? 86 : 86 - 110 * ((t - 5.0) / 0.6));
  function pw18tBeach(v, t) {
    const ctx = v.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, pw18tGY); g.addColorStop(0, '#7cc8f2'); g.addColorStop(1, '#d4f0ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, v.W, pw18tGY);
    v.fillCircle(272, 30, 15, '#fff2a8'); v.fillCircle(272, 30, 11, '#ffe066');
    // far sea, an island with a palm and a little ship
    ctx.fillStyle = '#3f9fd8'; ctx.fillRect(0, 70, v.W, pw18tGY - 70);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; for (let k = 0; k < 6; k++) ctx.fillRect(((k * 61 + t * 6) % 340) - 10, 76 + (k % 3) * 8, 14, 1.5);
    ctx.fillStyle = '#e8cf8a'; ctx.beginPath(); ctx.ellipse(70, 72, 34, 6, 0, Math.PI, 0); ctx.fill();
    v.line(72, 68, 76, 50, '#7a5230', 2.5);
    ctx.fillStyle = '#3e9a4a'; for (const a of [-2.6, -1.9, -1.2, -0.5]) { ctx.beginPath(); ctx.ellipse(76 + Math.cos(a) * 7, 50 + Math.sin(a) * 3, 9, 2.6, a, 0, Math.PI * 2); ctx.fill(); }
    const sx = 200 + Math.sin(t * 0.9) * 2, sy = 70 + Math.sin(t * 2) * 0.8;
    ctx.fillStyle = '#7a4a26'; ctx.beginPath(); ctx.moveTo(sx - 14, sy - 4); ctx.lineTo(sx + 14, sy - 4); ctx.lineTo(sx + 9, sy + 1); ctx.lineTo(sx - 9, sy + 1); ctx.closePath(); ctx.fill();
    v.line(sx, sy - 4, sx, sy - 22, '#5a3418', 1.5);
    ctx.fillStyle = '#fff8ea'; ctx.beginPath(); ctx.moveTo(sx + 1, sy - 21); ctx.lineTo(sx + 11, sy - 8); ctx.lineTo(sx + 1, sy - 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff7a8a'; ctx.fillRect(sx, sy - 25, 6, 3);
    // the sand, in layers, with the hole cut into it
    const d = pw18tDepth(t);
    ctx.fillStyle = '#f2d999'; ctx.fillRect(0, pw18tGY, v.W, 8);
    ctx.fillStyle = '#e2c27a'; ctx.fillRect(0, pw18tGY + 8, v.W, 26);
    ctx.fillStyle = '#c9a463'; ctx.fillRect(0, pw18tGY + 34, v.W, 26);
    ctx.fillStyle = '#a9834c'; ctx.fillRect(0, pw18tGY + 60, v.W, v.H - pw18tGY - 60);
    for (let k = 0; k < 18; k++) v.fillCircle((k * 37) % 320 + 6, pw18tGY + 14 + (k * 23) % 60, 1.4, 'rgba(120,80,40,0.25)');
    // the near sea, right of the beach
    // (a shallow sea over a sloping sandy seabed, so the cutaway stays sand all the way across)
    v.water(pw18tSea, pw18tGY + 3, v.W - pw18tSea, 30, t);
    ctx.fillStyle = '#e3c27e'; ctx.beginPath(); ctx.moveTo(pw18tSea, pw18tGY + 4); ctx.lineTo(v.W, pw18tGY + 28); ctx.lineTo(v.W, pw18tGY + 34); ctx.lineTo(pw18tSea, pw18tGY + 34); ctx.closePath(); ctx.fill();
    // the buried chest (seen through the cut-away sand)
    if (t < 3.4) { ctx.save(); ctx.globalAlpha = 0.45; pw18tBox(v, pw18tHX - 1, pw18tGY + pw18tChest, 0); ctx.restore(); }
    // the hole
    if (d > 0) {
      ctx.fillStyle = '#7a5a32'; ctx.fillRect(pw18tHX - pw18tHW / 2, pw18tGY, pw18tHW, d);
      ctx.fillStyle = '#5e4424'; ctx.fillRect(pw18tHX - pw18tHW / 2, pw18tGY + d - 3, pw18tHW, 3);
    }
    // the X (until the hole swallows it), and the sand pile beside the hole
    if (d < 6) { ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(pw18tHX - 6, pw18tGY - 2); ctx.lineTo(pw18tHX + 6, pw18tGY + 4); ctx.moveTo(pw18tHX + 6, pw18tGY - 2); ctx.lineTo(pw18tHX - 6, pw18tGY + 4); ctx.stroke(); }
    const pile = Math.min(1, d / pw18tChest);
    ctx.fillStyle = '#f2d999'; ctx.beginPath(); ctx.ellipse(pw18tHX - 28, pw18tGY, 12 * pile + 2, 9 * pile + 1, 0, Math.PI, 0); ctx.fill();
    // the treasure blanket
    ctx.fillStyle = '#d24b4b'; ctx.fillRect(36, pw18tGY - 2, 42, 3);
    ctx.fillStyle = '#fff'; for (let x = 38; x < 78; x += 6) ctx.fillRect(x, pw18tGY - 2, 3, 3);
    // the crab burrow
    ctx.fillStyle = '#6a4a26'; ctx.beginPath(); ctx.ellipse(8, pw18tGY, 8, 3, 0, Math.PI, 0); ctx.fill();
  }
  // a chest with its bottom at (x, y); open 0..1 tips the lid back (the lid is drawn first, behind the box)
  function pw18tBox(v, x, y, open) {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x - 11, y - 9); ctx.rotate(-open * 1.3);
    ctx.fillStyle = '#8a4f22'; v.rr(0, -6, 22, 7, 3); ctx.fill(); ctx.fillStyle = '#d6a43a'; ctx.fillRect(9, -6, 4, 7);
    ctx.restore();
    ctx.fillStyle = '#6b3a18'; ctx.fillRect(x - 11, y - 10, 22, 10);
    ctx.fillStyle = '#d6a43a'; ctx.fillRect(x - 11, y - 10, 22, 2); ctx.fillRect(x - 2, y - 10, 4, 10);
    if (open > 0.3) { ctx.save(); ctx.globalAlpha *= Math.min(1, (open - 0.3) * 2); v.fillCircle(x, y - 12, 10, 'rgba(255,224,102,0.45)'); ctx.restore(); }
  }
  function pw18tCoin(v, x, y) {
    v.fillCircle(x, y, 3.4, '#b8860b'); v.fillCircle(x, y, 2.6, '#ffd84a'); v.fillCircle(x - 0.8, y - 0.8, 0.9, '#fff6c0');
  }
  function pw18tCrab(v, x, y, t, flee) {
    const ctx = v.ctx, w = Math.sin(t * 22) * 1.5;
    ctx.strokeStyle = '#b8321e'; ctx.lineWidth = 1.4;
    for (const s of [-1, 1]) for (const k of [0, 1, 2]) { ctx.beginPath(); ctx.moveTo(x + s * 4, y - 3 + k); ctx.lineTo(x + s * 9, y + (k % 2 ? w : -w) * 0.6); ctx.stroke(); }
    ctx.fillStyle = '#e8452c'; ctx.beginPath(); ctx.ellipse(x, y - 4, 7, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    v.fillCircle(x - 9, y - 8 - (flee ? 3 : 0), 2.6, '#e8452c'); v.fillCircle(x + 9, y - 8 - (flee ? 3 : 0), 2.6, '#e8452c');
    v.line(x - 2, y - 7, x - 3, y - 11, '#b8321e', 1); v.line(x + 2, y - 7, x + 3, y - 11, '#b8321e', 1);
    v.fillCircle(x - 3, y - 11, 1.4, '#fff'); v.fillCircle(x + 3, y - 11, 1.4, '#fff');
    v.fillCircle(x - 3, y - 11, 0.7, '#222'); v.fillCircle(x + 3, y - 11, 0.7, '#222');
  }
  function pw18tBucket(v, x, y, full) {
    const ctx = v.ctx;
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y - 7, 5, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#ff9f2e'; ctx.beginPath(); ctx.moveTo(x - 5.5, y - 7); ctx.lineTo(x + 5.5, y - 7); ctx.lineTo(x + 4, y + 2); ctx.lineTo(x - 4, y + 2); ctx.closePath(); ctx.fill();
    if (full) { ctx.fillStyle = '#4aa8f0'; ctx.fillRect(x - 5, y - 7, 10, 2); }
  }
  definePreview('Tide Pool Dig', {
    blurb: 'One digs for buried treasure, the other bails out the waves and shoos crabs!',
    loop: 6.6,
    still: 3.8,
    draw(v, t) {
      const ctx = v.ctx, d = pw18tDepth(t), w = pw18tWater(t), tg = pw18tTongue(t);
      pw18tBeach(v, t);
      // the wave tongue rushing up the beach, and the water pouring into the hole
      if (tg < pw18tSea - 1) {
        ctx.fillStyle = 'rgba(90,170,235,0.8)'; ctx.beginPath(); ctx.moveTo(pw18tSea, pw18tGY + 3); ctx.lineTo(tg + 8, pw18tGY - 1);
        ctx.quadraticCurveTo(tg, pw18tGY - 1, tg, pw18tGY + 1); ctx.lineTo(pw18tSea, pw18tGY + 1); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(tg + 2, pw18tGY - 2, 10, 1.5);
        if (tg < pw18tHX + pw18tHW / 2 + 2 && t > 1.3 && t < 1.95) {
          ctx.fillStyle = 'rgba(90,170,235,0.85)'; ctx.fillRect(pw18tHX + pw18tHW / 2 - 6, pw18tGY, 5, d - w);
        }
      }
      // the chest, once Pip reaches it
      const open = v.ease.out(v.seg(t, 3.5, 3.8));
      if (t >= 3.4) pw18tBox(v, pw18tHX - 1, pw18tGY + pw18tChest, open);
      // Pip in the hole with the shovel (floats up in the water while it's flooded), then climbs out and jumps by the crab
      const climbing = t > 3.95 && t < 4.35, out = t >= 4.35;
      let px = pw18tHX, py = pw18tGY + d - w * 0.6;
      if (t >= 3.4) py = pw18tGY + pw18tChest - 10;
      if (climbing) { const k = (t - 3.95) / 0.4; py = v.lerp(pw18tGY + pw18tChest - 10, pw18tGY, k) + v.hop(k, 12); px = v.lerp(pw18tHX, pw18tHX - 20, k); }
      if (out) { const k = v.seg(t, 4.55, 4.95); px = v.lerp(pw18tHX - 20, 102, v.ease.inOut(k)); py = pw18tGY + v.hop(k, 26); }
      if (t > 5.3) py = pw18tGY + v.hop(v.phase(t, 0.5), 8);
      const digging = t < 1.3 || (t > 2.3 && t < 3.4);
      const stroke = digging ? Math.sin(t * 14) : 0;
      if (t < 5.3) {
        const sxh = px + (out ? -7 : 7), syh = py - 12, ang = out ? Math.PI - 0.9 : 0.9 + stroke * 0.4;
        v.line(sxh, syh, sxh + Math.cos(ang) * 14, syh + Math.sin(ang) * 14, '#8a5a2e', 2);
        ctx.fillStyle = '#9aa4ad'; ctx.beginPath(); ctx.ellipse(sxh + Math.cos(ang) * 16, syh + Math.sin(ang) * 16, 3.4, 2.4, ang, 0, Math.PI * 2); ctx.fill();
      }
      v.hero(0, px, py, { s: 0.9, face: out ? -1 : 1, sq: digging ? stroke * 0.06 : 0, mood: t > 5.3 ? 'joy' : w > 6 ? 'wow' : t > 3.4 && t < 4 ? 'joy' : 'grit', shadow: d < 2 || out });
      if (w > 0) { ctx.fillStyle = 'rgba(70,150,230,0.7)'; ctx.fillRect(pw18tHX - pw18tHW / 2, pw18tGY + d - w, pw18tHW, w); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(pw18tHX - pw18tHW / 2, pw18tGY + d - w, pw18tHW, 1.2); }
      // sand flying out of the hole while Pip digs
      if (digging && d > 4) for (let k = 0; k < 3; k++) { const ph = v.phase(t, 0.38, k * 0.13); v.fillCircle(pw18tHX - 6 - ph * 22, pw18tGY + d * (1 - ph) - 20 * Math.sin(ph * Math.PI), 1.8, '#c9a463'); }
      // Bo with the bucket
      const bx = pw18tBoX(t), walking = (t > 1.7 && t < 2.0) || (t > 2.35 && t < 3.0) || (t > 3.3 && t < 4.0);
      const full = t > 2.1 && t < 3.05, scoopK = v.seg(t, 2.02, 2.28), dumpK = v.seg(t, 3.0, 3.25);
      const boFace = t < 2.35 ? -1 : t < 3.3 ? 1 : -1, cheer = t > 5.3;
      const by = pw18tGY + (cheer ? v.hop(v.phase(t, 0.5, 0.25), 8) : walking ? -Math.abs(Math.sin(t * 12)) * 2 : 0);
      v.hero(1, bx, by, { s: 0.9, face: boFace, sq: full && walking ? 0.08 : 0, mood: cheer ? 'joy' : full ? 'grit' : 'happy' });
      if (!cheer) {
        let kx = bx + boFace * 11, ky = by - 6;
        if (scoopK > 0 && scoopK < 1) { const s = Math.sin(scoopK * Math.PI); kx = v.lerp(bx - 14, pw18tHX + 9, s); ky = v.lerp(by - 6, pw18tGY + d - 6, s); }
        if (dumpK > 0 && dumpK < 1) { kx = bx + 14; ky = by - 12 - Math.sin(dumpK * Math.PI) * 6; }
        pw18tBucket(v, kx, ky, full);
        if (dumpK > 0 && dumpK < 1) for (let k = 0; k < 5; k++) v.fillCircle(kx + 4 + k * 2.5, ky + dumpK * 20 + k * 2, 1.6, '#4aa8f0');
      }
      // the coin shower from the chest onto the blanket
      if (t > 3.6) {
        pw18tCoins.forEach(([cx, cy], i) => {
          if (i === 6 && t > 4.6) return;
          const k = v.seg(t, 3.6 + i * 0.05, 4.0 + i * 0.05);
          const x = v.lerp(pw18tHX, cx, k), y = v.lerp(pw18tGY + pw18tChest - 12, pw18tGY - 3 + cy, k) + v.hop(k, 34);
          pw18tCoin(v, x, y);
        });
        if (t < 4.3) v.sparkle(pw18tHX, pw18tGY + pw18tChest - 16, v.seg(t, 3.6, 4.3));
      }
      // the crab: sneaks out of its burrow, grabs the stray coin, and drops it and runs when Pip lands next to it
      const cx = pw18tCrabX(t), flee = t > 5.0;
      if (cx > -14) {
        pw18tCrab(v, cx, pw18tGY, t, flee);
        if (t > 4.6 && t < 5.0) pw18tCoin(v, cx, pw18tGY - 14);
      }
      if (flee) pw18tCoin(v, 92, pw18tGY - 3);
      // words
      if (t > 1.55 && t < 2.2) v.bubble('Glub!', pw18tHX + 2, pw18tGY + d - w - 26, { size: 9 });
      if (t > 3.05 && t < 3.7) v.label('Sploosh!', 268, 80 - (t - 3.05) * 8, 12, '#bfe8ff');
      if (t > 3.4 && t < 4.0) v.label('CLUNK!', pw18tHX + 34, pw18tGY - 14 - (t - 3.4) * 10, 14, v.c.gold);
      if (t > 4.95 && t < 5.4) v.puff(102, pw18tGY, v.seg(t, 4.95, 5.4));
      if (t > 4.95 && t < 5.7) v.bubble('Shoo!', 106, pw18tGY - 34, { size: 9 });
      if (t > 5.4) v.confetti(130, 70, v.seg(t, 5.4, 6.5));
    },
  });
  // ----- END 18-3 Tide Pool Dig preview -----
  //
  //
  //
  // ----- BEGIN 18-4 Plank Duel preview -----
  // Pip swings high and Bo blocks (Clack!), Bo swings low and Pip hops over it, Pip bonks Bo back, then a charged lunge
  // sends Bo teetering off the end: SPLASH! Bo bobs up laughing in the duck float, a fish jumps, Pip wins.
  const pw18pPY = 118, pw18pSea = 140, pw18pE0 = 52, pw18pE1 = 268;
  // the moments of the loop (seconds)
  const pw18pT = { wind1: 0.5, hit1: 0.95, wind2: 1.4, hit2: 1.85, wind3: 2.4, hit3: 2.8, charge: 3.15, lunge: 3.75, hit4: 3.95, fall: 4.45, splash: 4.75, win: 5.0 };
  // where each stands at time t (x of the feet)
  const pw18pX = (v, t) => {
    const T = pw18pT, e = v.ease.out;
    let pip = 132, bo = 186;
    // a block pushes both apart a little
    const kb = e(v.seg(t, T.hit1, T.hit1 + 0.25)); pip -= 5 * kb; bo += 5 * kb;
    // the high bonk sends Bo back, and Pip steps in
    const k3 = e(v.seg(t, T.hit3, T.hit3 + 0.35)); bo += 42 * k3;
    pip += 32 * v.ease.inOut(v.seg(t, T.hit3 + 0.15, T.charge));
    // the lunge: Pip dashes, Bo slides to the end and teeters
    pip += 30 * v.seg(t, T.lunge, T.hit4);
    const k4 = e(v.seg(t, T.hit4, T.hit4 + 0.4)); bo += (pw18pE1 + 4 - 233) * k4;
    return { pip, bo };
  };
  const pw18pSword = (v, x, y, ang, id, glow) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    if (glow) { ctx.fillStyle = 'rgba(255,230,120,' + (0.3 + 0.4 * glow).toFixed(2) + ')'; v.rr(0, -6, 26, 12, 6); ctx.fill(); }
    ctx.fillStyle = '#5a3a1e'; v.rr(-4, -1.5, 5, 3, 1.5); ctx.fill();
    ctx.fillStyle = v.c.gold; v.rr(0.5, -4, 2, 8, 1); ctx.fill();
    ctx.fillStyle = id ? '#7fb8ff' : '#ffa25a'; ctx.strokeStyle = id ? v.c.boDark : v.c.pipDark; ctx.lineWidth = 1;
    v.rr(2.5, -2.2, 20, 4.4, 2.2); ctx.fill(); ctx.stroke();
    ctx.restore();
  };
  const pw18pHat = (v, x, y, s, id) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#2b2a4a'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-9, -13, 0, -10); ctx.quadraticCurveTo(9, -13, 14, 0); ctx.quadraticCurveTo(0, -4, -14, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = id ? v.c.bo : v.c.pip; ctx.fillRect(-11, -4, 22, 2.2);
    ctx.restore();
    v.star(x, y - 7 * s, 3 * s, v.c.gold);
  };
  // a hero with a pirate hat and a foam sword (feet at x, y); ang: the sword (0 ahead, negative up)
  const pw18pFighter = (v, id, x, y, o) => {
    const s = 0.95, face = id ? -1 : 1, ctx = v.ctx;
    ctx.save();
    if (o.rot) { ctx.translate(x, y - 12); ctx.rotate(o.rot * face); ctx.translate(-x, -(y - 12)); }
    v.hero(id, x, y, { s, face, mood: o.mood, sq: o.sq || 0, shadow: o.shadow !== false && !o.rot });
    pw18pHat(v, x, y - 24 * s * (1 - (o.sq || 0) * 0.3) - 1, 0.9, id);
    pw18pSword(v, x + face * 8, y - 11, face > 0 ? o.ang : Math.PI - o.ang, id, o.glow || 0);
    ctx.restore();
  };
  const pw18pDuck = (v, x, y, s) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#ffd34d'; ctx.strokeStyle = '#d9a32a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 1, 18, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2aa3c4'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd34d'; v.circle(16, -7, 5.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.moveTo(20.5, -8); ctx.lineTo(26, -6); ctx.lineTo(20.5, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = v.c.ink; v.circle(18, -9, 1); ctx.fill();
    ctx.restore();
  };
  const pw18pFish = (v, x, y, s, face, rot) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * face, s);
    ctx.fillStyle = '#ffb03a'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-14, -5); ctx.lineTo(-14, 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; v.circle(4.5, -1.3, 2); ctx.fill(); ctx.fillStyle = v.c.ink; v.circle(5, -1.3, 1); ctx.fill();
    ctx.restore();
  };
  const pw18pScene = (v, t) => {
    const ctx = v.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, 100);
    g.addColorStop(0, '#46b8ec'); g.addColorStop(1, '#fff2cf');
    ctx.fillStyle = g; ctx.fillRect(0, 0, v.W, 100);
    v.sun(282, 28, 13);
    v.cloud(((t * 5) % 380) - 40, 26, 0.8); v.cloud(((t * 3 + 200) % 380) - 40, 46, 0.6);
    // far sea and an island
    const sg = ctx.createLinearGradient(0, 96, 0, pw18pSea);
    sg.addColorStop(0, '#3fb7cf'); sg.addColorStop(1, '#2aa3c4');
    ctx.fillStyle = sg; ctx.fillRect(0, 96, v.W, pw18pSea - 96);
    ctx.fillStyle = '#7fd0b8'; ctx.beginPath(); ctx.ellipse(110, 99, 46, 8, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#f2d68c'; ctx.beginPath(); ctx.ellipse(110, 99, 42, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    v.line(104, 99, 106, 76, '#a8743f', 2.5);
    ctx.fillStyle = '#3f9e46';
    for (let i = 0; i < 5; i++) { const a = i * 1.3 - 2.6; ctx.beginPath(); ctx.ellipse(106 + Math.cos(a) * 7, 76 + Math.sin(a) * 3, 8, 2.5, a, 0, Math.PI * 2); ctx.fill(); }
    for (let i = 0; i < 9; i++) { const x = (i * 41 + t * 6) % v.W, y = 104 + (i * 13) % 30; ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.3 * Math.sin(t * 3 + i)).toFixed(2) + ')'; ctx.fillRect(x, y, 7, 1.2); }
    // two ships at the sides, flags for Pip and Bo
    for (const id of [0, 1]) {
      const sx = id ? 304 : 16, f = id ? -1 : 1, by = 112 + Math.sin(t * 1.4 + id * 2) * 1.2;
      ctx.fillStyle = '#7d5030'; ctx.fillRect(sx + f * 6 - 1.5, by - 62, 3, 52);
      ctx.fillStyle = '#fbf3e0'; ctx.beginPath(); ctx.moveTo(sx + f * 4, by - 58); ctx.quadraticCurveTo(sx - f * 12, by - 40, sx + f * 4, by - 22); ctx.closePath(); ctx.fill();
      v.star(sx - f * 2, by - 40, 5, id ? v.c.bo : v.c.pip);
      ctx.fillStyle = id ? v.c.bo : v.c.pip; ctx.beginPath(); ctx.moveTo(sx + f * 6, by - 62); ctx.lineTo(sx + f * 18, by - 58 + Math.sin(t * 6) * 1.5); ctx.lineTo(sx + f * 6, by - 54); ctx.fill();
      ctx.fillStyle = '#9a6136'; ctx.beginPath(); ctx.moveTo(sx - f * 30, by - 12); ctx.lineTo(sx + f * 34, by - 14); ctx.lineTo(sx + f * 24, by + 6); ctx.lineTo(sx - f * 22, by + 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = id ? v.c.bo : v.c.pip; ctx.fillRect(Math.min(sx - f * 30, sx + f * 34), by - 15, 64, 2.5);
    }
    // Captain Polly on her post
    v.line(160, pw18pPY, 160, 58, '#7d5030', 3);
    const pol = 54 + Math.sin(t * 2.4) * 0.8;
    ctx.fillStyle = '#ff4f5f'; ctx.beginPath(); ctx.ellipse(160, pol - 4, 4.5, 6.5, 0, 0, Math.PI * 2); ctx.fill(); v.circle(161.5, pol - 12, 4); ctx.fill();
    ctx.fillStyle = '#3d8bff'; ctx.beginPath(); ctx.ellipse(158, pol - 4, 2.5, 5, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2e3b0'; ctx.beginPath(); ctx.moveTo(165, pol - 12); ctx.lineTo(169, pol - 10); ctx.lineTo(165, pol - 8); ctx.fill();
    ctx.fillStyle = '#2b2a4a'; ctx.beginPath(); ctx.moveTo(156, pol - 15); ctx.quadraticCurveTo(161, pol - 22, 166, pol - 15); ctx.fill();
    // rock, barrel, posts and the plank
    ctx.fillStyle = '#7a7f8e'; ctx.beginPath(); ctx.ellipse(160, pw18pSea + 2, 40, 12, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#c98e57'; v.rr(150, pw18pPY + 4, 20, pw18pSea - pw18pPY - 6, 4); ctx.fill();
    ctx.fillStyle = '#5a5a6a'; ctx.fillRect(150, pw18pPY + 7, 20, 1.5); ctx.fillRect(150, pw18pSea - 7, 20, 1.5);
    for (const px of [92, 228]) { ctx.fillStyle = '#7d5030'; ctx.fillRect(px - 2.5, pw18pPY + 4, 5, pw18pSea - pw18pPY); }
    ctx.fillStyle = '#7d5030'; v.rr(pw18pE0 - 6, pw18pPY, pw18pE1 - pw18pE0 + 12, 6, 2); ctx.fill();
    ctx.fillStyle = '#c98e57'; v.rr(pw18pE0 - 6, pw18pPY, pw18pE1 - pw18pE0 + 12, 4, 2); ctx.fill();
    ctx.fillStyle = '#fbf3e0'; for (const e of [pw18pE0 - 3, pw18pE1 + 1]) ctx.fillRect(e, pw18pPY, 2, 4);
    // the lagoon
    const lg = ctx.createLinearGradient(0, pw18pSea, 0, v.H);
    lg.addColorStop(0, '#2aa3c4'); lg.addColorStop(1, '#136b93');
    ctx.fillStyle = lg; ctx.fillRect(0, pw18pSea, v.W, v.H - pw18pSea);
    ctx.fillStyle = '#e8c97f'; ctx.fillRect(0, v.H - 9, v.W, 9);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 0; x <= v.W; x += 6) ctx.lineTo(x, pw18pSea + Math.sin(x / 9 + t * 3) * 1.2);
    ctx.stroke();
    for (let i = 0; i < 3; i++) pw18pFish(v, (i * 120 + t * (14 + i * 4)) % 360 - 20, 152 + i * 9, 0.8, 1, 0);
  };
  definePreview('Plank Duel', {
    blurb: 'Swing high or low, block, hop, then bonk them off the plank. SPLASH!',
    loop: 6.4,
    still: 4.0,
    draw(v, t) {
      const ctx = v.ctx, T = pw18pT, D = Math.PI / 180;
      pw18pScene(v, t);
      const xs = pw18pX(v, t);
      // Pip: wind high, strike, hop over the low swing, wind and bonk, charge and lunge, cheer
      let pa = -72 * D, pMood = 'happy', pY = pw18pPY, pGlow = 0, pRot = 0;
      if (t >= T.wind1 && t < T.hit1) { pa = -150 * D; pMood = 'grit'; }
      else if (t >= T.hit1 && t < T.hit1 + 0.2) pa = -8 * D;
      else if (t >= T.hit2 - 0.3 && t < T.hit2 + 0.25) { pY += v.hop(v.seg(t, T.hit2 - 0.3, T.hit2 + 0.25), 16); pa = -40 * D; pMood = 'joy'; }
      else if (t >= T.wind3 && t < T.hit3) { pa = -150 * D; pMood = 'grit'; }
      else if (t >= T.hit3 && t < T.hit3 + 0.2) pa = -8 * D;
      else if (t >= T.charge && t < T.lunge) { pa = -165 * D; pMood = 'grit'; pGlow = v.seg(t, T.charge, T.lunge); pRot = -0.12; }
      else if (t >= T.lunge && t < T.hit4 + 0.3) { pa = -4 * D; pMood = 'grit'; pRot = 0.22; }
      else if (t >= T.win) { pa = -120 * D + Math.sin(t * 9) * 0.3; pMood = 'joy'; pY += v.hop(v.phase(t - T.win, 0.5), 7); }
      // Bo: guards high (blocks), winds low and strikes, gets bonked (dizzy), teeters, splashes, bobs in the duck float
      let ba = -72 * D, bMood = 'happy', bSq = 0, bRot = 0, bY = pw18pPY;
      if (t >= T.hit1 && t < T.wind2) bMood = 'joy';
      if (t >= T.wind2 && t < T.hit2) { ba = 150 * D; bSq = 0.25; bMood = 'grit'; }
      else if (t >= T.hit2 && t < T.hit2 + 0.25) { ba = 30 * D; bSq = 0.25; }
      else if (t >= T.hit2 + 0.25 && t < T.hit3) { ba = 40 * D; bSq = 0.25; }
      else if (t >= T.hit3 && t < T.charge + 0.2) { ba = 30 * D; bMood = 'dizzy'; }
      else if (t >= T.charge + 0.2 && t < T.hit4) ba = -72 * D;
      else if (t >= T.hit4 && t < T.fall) { ba = -90 * D + Math.sin(t * 22) * 1.2; bMood = 'wow'; bRot = -(0.28 + Math.sin(t * 16) * 0.16); }
      let bx = xs.bo;
      if (t >= T.fall && t < T.splash) { const k = v.seg(t, T.fall, T.splash); bx += 14 * k; bY = pw18pPY + (pw18pSea + 4 - pw18pPY) * k * k - 10 * Math.sin(k * Math.PI); bRot = -(0.4 + k * 2.6); bMood = 'wow'; }
      const inFloat = t >= T.splash;
      // the wind-up badges over the head (▲ high, ▼ low)
      const badge = (x, y, up, k) => { ctx.globalAlpha = 0.5 + 0.5 * k; v.fillCircle(x, y, 6.5, 'rgba(28,26,54,0.85)'); v.text(up ? '▲' : '▼', x, y + 0.5, 8, '#fff3a0', 'center', true); ctx.globalAlpha = 1; };
      if (t >= T.wind1 && t < T.hit1) badge(xs.pip, pw18pPY - 40, true, v.seg(t, T.wind1, T.hit1));
      if (t >= T.wind3 && t < T.hit3) badge(xs.pip, pw18pPY - 40, true, v.seg(t, T.wind3, T.hit3));
      if (t >= T.charge && t < T.hit4) badge(xs.pip, pw18pPY - 40, true, 1);
      if (t >= T.wind2 && t < T.hit2) badge(xs.bo, pw18pPY - 36, false, v.seg(t, T.wind2, T.hit2));
      // the fighters
      pw18pFighter(v, 0, xs.pip, pY, { ang: pa, mood: pMood, glow: pGlow, rot: pRot, shadow: pY === pw18pPY });
      if (!inFloat) pw18pFighter(v, 1, bx, bY, { ang: ba, mood: bMood, sq: bSq, rot: bRot });
      // strike swooshes
      const swoosh = (x, y, k, f) => { if (k <= 0 || k >= 1) return; ctx.strokeStyle = 'rgba(255,255,255,' + (0.9 * (1 - k)).toFixed(2) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + f * 8, y, 18, f > 0 ? -0.6 : Math.PI - 0.6, f > 0 ? 0.6 : Math.PI + 0.6); ctx.stroke(); };
      swoosh(xs.pip, pw18pPY - 22, v.seg(t, T.hit1, T.hit1 + 0.25), 1);
      swoosh(xs.bo, pw18pPY - 8, v.seg(t, T.hit2, T.hit2 + 0.25), -1);
      swoosh(xs.pip, pw18pPY - 22, v.seg(t, T.hit3, T.hit3 + 0.25), 1);
      swoosh(xs.pip, pw18pPY - 18, v.seg(t, T.hit4, T.hit4 + 0.3), 1);
      // words
      const pop = (str, x, y, a, b, col, size) => { const k = v.seg(t, a, b); if (k <= 0 || k >= 1) return; ctx.globalAlpha = 1 - k * k; v.label(str, x, y - 10 * k, size || 13, col); ctx.globalAlpha = 1; };
      pop('Clack!', 160, 70, T.hit1, T.hit1 + 0.5, '#ffffff');
      if (t >= T.hit1 && t < T.hit1 + 0.3) v.sparkle(xs.pip + 26, pw18pPY - 24, v.seg(t, T.hit1, T.hit1 + 0.3), '#fff', 8);
      pop('Hop!', xs.pip, 74, T.hit2, T.hit2 + 0.5, '#c9ff8a');
      pop('Bonk!', 214, 70, T.hit3, T.hit3 + 0.5, '#ffd2c4');
      pop('LUNGE!', xs.pip + 6, 66, T.lunge - 0.1, T.hit4 + 0.4, v.c.gold, 14);
      pop('Whoa!', 248, 72, T.hit4 + 0.1, T.fall + 0.1, '#ffe6a8');
      // the splash, a friendly fish, and Bo bobbing up in the duck float
      if (inFloat) {
        const k = v.seg(t, T.splash, T.splash + 0.6), sx = pw18pE1 + 22;
        if (k < 1) {
          ctx.globalAlpha = 1 - k;
          for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.28; v.fillCircle(sx + Math.cos(a) * 26 * k, pw18pSea + Math.sin(a) * 30 * k + 30 * k * k, 2.4, i % 2 ? '#bfe8ff' : '#fff'); }
          ctx.globalAlpha = 1;
        }
        pop('SPLASH!', sx - 14, 84, T.splash, T.splash + 0.8, '#bfe8ff', 16);
        const fk = v.seg(t, T.splash + 0.2, T.splash + 1.2);
        if (fk > 0 && fk < 1) pw18pFish(v, sx - 40 + fk * 30, pw18pSea - Math.sin(fk * Math.PI) * 30, 1, 1, -0.8 + fk * 1.6);
        const up = v.ease.back(v.seg(t, T.splash + 0.1, T.splash + 0.5)), by = pw18pSea + 6 - 4 * up + Math.sin(t * 4) * 1;
        v.hero(1, sx, by, { s: 0.9, face: -1, mood: 'joy', shadow: false });
        pw18pHat(v, sx, by - 23, 0.85, 1);
        pw18pDuck(v, sx, by + 1, 1);
      } else pw18pDuck(v, 30 + Math.sin(t * 0.6) * 6, pw18pSea + Math.sin(t * 2) * 1, 0.8);
      if (t > T.win) {
        v.confetti(xs.pip, pw18pPY - 30, v.seg(t, T.win, 6.2));
        v.label('Pip wins!', 160, 30, 18, v.c.pip);
      }
      // a soft fade at the seam
      const fade = Math.max(v.seg(t, 6.1, 6.4), 0.6 * (1 - v.seg(t, 0, 0.2)));
      if (fade > 0) { ctx.fillStyle = 'rgba(191,233,246,' + fade.toFixed(3) + ')'; ctx.fillRect(0, 0, v.W, v.H); }
    },
  });
  // ----- END 18-4 Plank Duel preview -----
  //
  //
  //
}
