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
