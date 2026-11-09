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
      // (the warning comes before the rock; faint while the wagon or tractor rolls past it)
      const sgx = rx - 46;
      c.save(); c.globalAlpha = sgx > 76 && sgx < 232 ? 0.3 : 1;
      c.fillStyle = '#7a4a22'; c.fillRect(sgx - 1, gy - 22, 3, 22);
      c.save(); c.translate(sgx, gy - 30); c.rotate(Math.PI / 4); c.fillStyle = '#ffd23f'; c.strokeStyle = '#7a5a10'; c.lineWidth = 1.5; c.fillRect(-7, -7, 14, 14); c.strokeRect(-7, -7, 14, 14); c.restore();
      c.fillStyle = '#5a3a10'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', sgx, gy - 30);
      c.restore();
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
