/* Pip & Bo - Level previews for World 23 Barnyard Fair (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw23. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  //
  //
  // ----- BEGIN 23-1 Tractor & Trailer preview -----
  // Pip drives the little red tractor, Bo rides the hay wagon: a farmer tosses a bale ("Got it!"), Pip slows for a rock
  // while Bo holds the wobbly stack ("Hold tight!"), then the bales hop into the barn ("3 in the barn!"). Confetti.
  const pw23tGround = 140, pw23tWag = 118, pw23tTr = 196;
  // the tractor's speed (px/s) at time t: cruise, slow for the rock, speed up, stop at the barn
  const pw23tV = t => {
    if (t < 2.1) return 62;
    if (t < 2.5) return 62 - (t - 2.1) / 0.4 * 44;
    if (t < 3.4) return 18;
    if (t < 3.8) return 18 + (t - 3.4) / 0.4 * 56;
    if (t < 4.3) return 74;
    if (t < 4.85) return 74 * (1 - (t - 4.3) / 0.55);
    return 0;
  };
  // how far the tractor has gone at time t (a table summed once, so draw stays a pure function of t)
  const pw23tTab = (() => { const a = [0]; for (let i = 1; i <= 700; i++) a.push(a[i - 1] + pw23tV((i - 0.5) / 100) / 100); return a; })();
  const pw23tX = t => { const i = Math.max(0, Math.min(699, Math.floor(t * 100))), f = t * 100 - i; return pw23tTab[i] + (pw23tTab[i + 1] - pw23tTab[i]) * f; };
  const pw23tRock = pw23tX(3.0) + pw23tWag - pw23tTr, pw23tBarn = pw23tX(5) + 46;
  const pw23tFarmerX = pw23tX(0.6) + 66;
  const pw23tBale = (v, x, y, rot = 0, s = 1) => {
    const c = v.ctx;
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    c.fillStyle = '#f2c94c'; c.strokeStyle = '#b08a24'; c.lineWidth = 1.5;
    v.rr(-11, -7, 22, 14, 3); c.fill(); c.stroke();
    c.strokeStyle = '#c99a2e'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-9, 0); c.lineTo(9, 0.5); c.stroke();
    c.strokeStyle = '#8a5a2b'; c.lineWidth = 1.4; for (const xx of [-4, 4]) { c.beginPath(); c.moveTo(xx, -7); c.lineTo(xx, 7); c.stroke(); }
    c.restore();
  };
  const pw23tFarmer = (v, x, y, swing) => {
    const c = v.ctx;
    c.fillStyle = '#3d6fb6'; v.rr(x - 6, y - 22, 12, 14, 3); c.fill();
    c.fillStyle = '#5a3a22'; c.fillRect(x - 5, y - 9, 4, 9); c.fillRect(x + 1, y - 9, 4, 9);
    v.fillCircle(x, y - 28, 6, '#f1c9a0');
    c.fillStyle = '#e8c35a'; c.beginPath(); c.ellipse(x, y - 32, 11, 3, 0, 0, Math.PI * 2); c.fill(); v.rr(x - 5, y - 39, 10, 7, 3); c.fill();
    c.strokeStyle = '#f1c9a0'; c.lineWidth = 3; c.lineCap = 'round';
    const a = -0.6 - swing * 1.6;
    for (const dx of [-5, 5]) { c.beginPath(); c.moveTo(x + dx, y - 19); c.lineTo(x + dx + Math.cos(a) * -9, y - 19 + Math.sin(a) * 9); c.stroke(); }
  };
  const pw23tTractor = (v, x, gy, t, mood) => {
    const c = v.ctx, spin = pw23tX(t) / 14, bob = Math.sin(t * 20) * (pw23tV(t) > 5 ? 0.7 : 0);
    // exhaust puff
    if (pw23tV(t) > 5) for (let k = 0; k < 3; k++) { const p = (t * 1.4 + k / 3) % 1; c.fillStyle = 'rgba(120,120,120,' + (0.35 * (1 - p)) + ')'; v.circle(x + 18 - p * 16, gy - 54 - p * 18 + bob, 3 + p * 5); c.fill(); }
    c.fillStyle = '#666'; c.fillRect(x + 16, gy - 54 + bob, 3, 16);
    // body and hood
    c.fillStyle = '#e04a3a'; c.strokeStyle = '#9b2a20'; c.lineWidth = 1.6;
    v.rr(x - 22, gy - 38 + bob, 50, 18, 4); c.fill(); c.stroke();
    v.rr(x - 6, gy - 44 + bob, 32, 10, 3); c.fill(); c.stroke();
    c.fillStyle = '#ffe9a8'; v.fillCircle(x + 27, gy - 32 + bob, 2.6, '#fff4c0');
    // Pip in the seat
    v.hero(0, x - 14, gy - 34 + bob, { s: 0.5, face: 1, mood, shadow: false });
    c.strokeStyle = '#333'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 4, gy - 36 + bob); c.lineTo(x - 7, gy - 46 + bob); c.stroke();
    // wheels: a big one at the back, a small one in front
    for (const [wx, r] of [[x - 14, 15], [x + 20, 9]]) {
      v.fillCircle(wx, gy - r, r, '#2d2d2d'); v.fillCircle(wx, gy - r, r * 0.55, '#f2c94c');
      c.strokeStyle = '#8a5a2b'; c.lineWidth = 1.5;
      for (let k = 0; k < 3; k++) { const a = spin * (15 / r) + k * Math.PI / 3; c.beginPath(); c.moveTo(wx - Math.cos(a) * r * 0.5, gy - r - Math.sin(a) * r * 0.5); c.lineTo(wx + Math.cos(a) * r * 0.5, gy - r + Math.sin(a) * r * 0.5); c.stroke(); }
    }
  };
  const pw23tWagon = (v, x, gy, t, n, sway, lift, mood) => {
    const c = v.ctx, spin = pw23tX(t) / 10;
    c.save(); c.translate(x, gy - 12 - lift); c.rotate(sway * 0.06);
    // the hitch
    c.strokeStyle = '#5a3a22'; c.lineWidth = 3; c.beginPath(); c.moveTo(30, -2); c.lineTo(62, 2 + lift); c.stroke();
    // the deck
    c.fillStyle = '#b5773b'; c.strokeStyle = '#7a4a22'; c.lineWidth = 1.6; v.rr(-34, -10, 66, 8, 2); c.fill(); c.stroke();
    // the stack, rocking on the bump
    for (let i = 0; i < n; i++) {
      const col = i % 2, row = Math.floor(i / 2), sx = (row % 2 ? -10 : -12) + col * 24 + sway * row * 3.5;
      pw23tBale(v, sx - 6, -17 - row * 13, sway * row * 0.07);
    }
    // Bo on the load
    const top = -10 - Math.max(1, Math.floor(n / 2)) * 13;
    v.hero(1, 14 + sway * 3, top, { s: 0.55, face: 1, mood, shadow: false, sq: mood === 'grit' ? 0.15 : 0 });
    c.restore();
    for (const wx of [x - 20, x + 18]) {
      v.fillCircle(wx, gy - 9, 9, '#f2c94c'); c.strokeStyle = '#8a5a2b'; c.lineWidth = 2; v.circle(wx, gy - 9, 9); c.stroke();
      for (let k = 0; k < 2; k++) { const a = spin + k * Math.PI / 2; c.beginPath(); c.moveTo(wx - Math.cos(a) * 8, gy - 9 - Math.sin(a) * 8); c.lineTo(wx + Math.cos(a) * 8, gy - 9 + Math.sin(a) * 8); c.stroke(); }
    }
  };
  const pw23tBarnDraw = (v, x, gy, open) => {
    const c = v.ctx;
    c.fillStyle = '#c8402f'; c.strokeStyle = '#7d2418'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x, gy); c.lineTo(x, gy - 70); c.lineTo(x + 45, gy - 104); c.lineTo(x + 90, gy - 70); c.lineTo(x + 90, gy); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - 3, gy - 69); c.lineTo(x + 45, gy - 107); c.lineTo(x + 93, gy - 69); c.lineTo(x + 93, gy - 64); c.lineTo(x + 45, gy - 101); c.lineTo(x - 3, gy - 64); c.fill();
    c.fillStyle = '#3a1d14'; c.fillRect(x + 18, gy - 52, 54, 52);
    c.fillStyle = '#f2c94c'; c.fillRect(x + 22, gy - 14, 46, 14);
    c.strokeStyle = '#fff'; c.lineWidth = 2.5;
    c.save(); c.translate(x + 18, gy - 52); c.scale(1 - open * 0.8, 1); c.strokeRect(0, 0, 27, 52); c.beginPath(); c.moveTo(0, 0); c.lineTo(27, 52); c.stroke(); c.restore();
    c.fillStyle = '#3a1d14'; c.fillRect(x + 36, gy - 88, 18, 14);
  };
  definePreview('Tractor & Trailer', {
    blurb: 'One drives the tractor, one catches the hay. Slow down for bumps!',
    loop: 6.4, still: 1.75,
    draw(v, t) {
      const c = v.ctx, gy = pw23tGround, cam = pw23tX(t) - pw23tTr;
      // sky, a Ferris wheel far away, hills
      v.sky(); v.sun(270, 34, 15);
      v.cloud(((40 - cam * 0.1) % 380 + 380) % 380 - 40, 34, 0.9); v.cloud(((220 - cam * 0.1) % 380 + 380) % 380 - 40, 52, 0.7);
      const fw = 70 - cam * 0.15;
      c.strokeStyle = 'rgba(140,110,170,0.55)'; c.lineWidth = 2; v.circle(fw, 70, 26); c.stroke();
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + t * 0.4; c.beginPath(); c.moveTo(fw, 70); c.lineTo(fw + Math.cos(a) * 26, 70 + Math.sin(a) * 26); c.stroke(); v.fillCircle(fw + Math.cos(a) * 26, 70 + Math.sin(a) * 26, 3, ['#ff8fc7', '#ffd23f', '#6fd0ff'][k % 3]); }
      c.beginPath(); c.moveTo(fw - 14, 108); c.lineTo(fw, 70); c.lineTo(fw + 14, 108); c.stroke();
      v.hills(gy - 30, cam * 0.5);
      // the hay field behind the fence
      c.fillStyle = '#e6cf72'; c.fillRect(0, gy - 30, 320, 16);
      c.strokeStyle = '#c9ad4c'; c.lineWidth = 1;
      for (let k = 0; k < 24; k++) { const x = ((k * 17 - cam * 0.8) % 408 + 408) % 408 - 44; c.beginPath(); c.moveTo(x, gy - 16); c.lineTo(x + 6, gy - 28); c.stroke(); }
      // the farmer tossing, standing in the field
      const fx = pw23tFarmerX - cam, swing = v.ease.out(v.seg(t, 0.45, 0.65)) * (1 - v.seg(t, 0.9, 1.2));
      if (fx > -20 && fx < 340) pw23tFarmer(v, fx, gy - 16, swing);
      // the fence
      c.fillStyle = '#fff'; for (let k = 0; k < 12; k++) { const x = ((k * 32 - cam) % 384 + 384) % 384 - 32; c.fillRect(x, gy - 22, 4, 18); }
      c.fillRect(0, gy - 18, 320, 3); c.fillRect(0, gy - 10, 320, 3);
      // the dirt road and grass
      c.fillStyle = '#c8a06a'; c.fillRect(0, gy - 4, 320, 14);
      c.fillStyle = v.c.grass || '#6fbf4a'; c.fillRect(0, gy + 10, 320, 40);
      c.fillStyle = 'rgba(0,0,0,0.08)'; for (let k = 0; k < 16; k++) { const x = ((k * 23 - cam) % 368 + 368) % 368 - 24; c.fillRect(x, gy + 1, 8, 2); }
      // the barn at the end of the lane
      const bx = pw23tBarn - cam, open = v.seg(t, 4.3, 4.8);
      if (bx < 340) pw23tBarnDraw(v, bx, gy + 4, open);
      // the rock and its yellow sign
      const rx = pw23tRock - cam;
      c.fillStyle = '#8b8f98'; c.strokeStyle = '#5c606a'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(rx, gy + 3, 9, 6, 0, Math.PI, 0); c.fill(); c.stroke();
      const sgx = rx + 70;
      c.fillStyle = '#7a4a22'; c.fillRect(sgx - 1, gy - 22, 3, 22);
      c.save(); c.translate(sgx, gy - 30); c.rotate(Math.PI / 4); c.fillStyle = '#ffd23f'; c.strokeStyle = '#7a5a10'; c.lineWidth = 1.5; c.fillRect(-7, -7, 14, 14); c.strokeRect(-7, -7, 14, 14); c.restore();
      c.fillStyle = '#5a3a10'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', sgx, gy - 30);
      // the wagon rolling over the rock: a lift and a sway that dies down
      const over = v.seg(t, 2.75, 3.25), lift = Math.sin(over * Math.PI) * 4;
      const swayK = Math.max(0, 1 - Math.abs(t - 3.1) / 0.9), sway = Math.sin(t * 13) * swayK;
      const flying = [5.0, 5.25, 5.5].filter(a => t >= a).length;
      const n = (t < 1.6 ? 4 : 5) - flying;
      const boMood = t > 2.6 && t < 3.6 ? 'grit' : t > 1.6 && t < 2.1 ? 'joy' : t > 5.6 ? 'joy' : 'happy';
      pw23tWagon(v, pw23tWag, gy + 4, t, n, sway, lift, boMood);
      pw23tTractor(v, pw23tTr, gy + 4, t, t > 2.1 && t < 3.4 ? 'wow' : t > 5.6 ? 'joy' : 'happy');
      // the toss: from the farmer's hands to the top of the stack
      if (t >= 0.6 && t < 1.6) {
        const k = v.seg(t, 0.6, 1.6), sx = fx, sy = gy - 46, ex = pw23tWag + 6, ey = gy - 52;
        pw23tBale(v, v.lerp(sx, ex, k), v.lerp(sy, ey, k) + v.hop(k, 50), k * 5);
      }
      if (t >= 1.6 && t < 2.3) v.pill('Got it!', pw23tWag + 10, gy - 92, { size: 11, col: v.c.bo });
      // the slow-down
      if (t >= 2.2 && t < 3.6) {
        v.pill('Slow down for the rock!', 160, 20, { size: 11 });
        if (t > 2.6) v.pill('Hold tight!', pw23tWag - 10, gy - 92, { size: 10, col: v.c.bo });
      }
      // bales hop off the wagon into the barn
      for (const a of [5.0, 5.25, 5.5]) {
        if (t < a || t > a + 0.5) continue;
        const k = v.seg(t, a, a + 0.5), ex = bx + 45, ey = gy - 10;
        pw23tBale(v, v.lerp(pw23tWag, ex, k), v.lerp(gy - 40, ey, k) + v.hop(k, 30), k * 4, 1 - k * 0.3);
      }
      if (t > 5.75) { v.pill('3 in the barn!', 160, 22, { size: 13, col: v.c.gold }); v.confetti(bx + 45, gy - 60, v.seg(t, 5.75, 6.4)); }
    },
  });
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
