/* Pip & Bo - Level previews for World 16 Sugar Rush Factory (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw16. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 16-1 Conveyor Belt Chaos preview -----
  // PLACEHOLDER
  // ----- END 16-1 Conveyor Belt Chaos preview -----
  //
  // ----- BEGIN 16-2 Gumball Machine Puzzle preview -----
  // PLACEHOLDER
  // ----- END 16-2 Gumball Machine Puzzle preview -----
  //
  // ----- BEGIN 16-3 Chocolate River Raft preview -----
  // PLACEHOLDER
  // ----- END 16-3 Chocolate River Raft preview -----
  //
  // ----- BEGIN 16-4 Sprinkle Catch preview -----
  // Pip and Bo catch candy from the sprinkle shaker in baskets on their heads; a gobstopper bonks Bo, the spilled candy
  // goes to Pip, and Pip catches the golden candy to win
  const pw16sGY = 150, pw16sS = 1.15, pw16sHead = 24 * 1.15;
  const pw16sGum = ['#ff6f9f', '#7fdc7a', '#ffb347', '#a98bff'];
  function pw16sCandy(v, kind, x, y, s = 1, t = 0) {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (kind === 'mint') {
      ctx.fillStyle = '#ffe6ea'; ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-11, -4); ctx.lineTo(-11, 4); ctx.fill(); ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(11, -4); ctx.lineTo(11, 4); ctx.fill();
      v.fillCircle(0, 0, 6.5, '#ffffff'); ctx.fillStyle = '#ff4d63';
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 6, i * Math.PI / 3 + t, i * Math.PI / 3 + 0.5 + t); ctx.closePath(); ctx.fill(); }
    } else if (kind === 'gold') {
      v.fillCircle(0, 0, 12, 'rgba(255,214,90,' + (0.25 + 0.15 * Math.sin(t * 9)) + ')');
      ctx.fillStyle = '#ffcf3d'; ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-11, -5); ctx.lineTo(-11, 5); ctx.fill(); ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(11, -5); ctx.lineTo(11, 5); ctx.fill();
      ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.ellipse(0, 0, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c08a10'; ctx.lineWidth = 1.2; ctx.stroke();
      v.star(0, 0, 3.5, '#fff7d0');
    } else {
      ctx.fillStyle = pw16sGum[(kind | 0) % 4]; ctx.beginPath(); ctx.moveTo(-6.5, 4.5); ctx.quadraticCurveTo(-6.5, -7, 0, -6.5); ctx.quadraticCurveTo(6.5, -7, 6.5, 4.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; v.circle(-2.5, -1.5, 0.9); ctx.fill(); v.circle(2, -3, 0.9); ctx.fill(); v.circle(1, 1.5, 0.9); ctx.fill();
    }
    ctx.restore();
  }
  // a woven basket on a head (feet at x, y), with n candies peeking out
  function pw16sBasket(v, x, y, n, gold, tilt = 0) {
    const ctx = v.ctx, top = y - pw16sHead;
    ctx.save(); ctx.translate(x, top + 1); ctx.rotate(tilt);
    for (let i = 0; i < Math.min(n, 5); i++) pw16sCandy(v, i === 4 && gold ? 'gold' : i % 2 ? 'mint' : i, ((i * 37) % 5 - 2) * 3.4, -11 - i * 1.4, 0.55);
    ctx.fillStyle = '#d9a05b'; ctx.beginPath(); ctx.moveTo(-13, -10); ctx.lineTo(13, -10); ctx.lineTo(9, 0); ctx.lineTo(-9, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,70,30,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = -9; i <= 9; i += 4.5) { ctx.moveTo(i, -9); ctx.lineTo(i * 0.75, -1); } ctx.moveTo(-11, -5); ctx.lineTo(11, -5); ctx.stroke();
    ctx.fillStyle = '#f2c88a'; v.rr(-15, -12.5, 30, 4, 2); ctx.fill();
    ctx.restore();
  }
  function pw16sShaker(v, x, shake) {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, 14); ctx.rotate(shake ? Math.sin(shake * 60) * 0.2 : 0);
    ctx.fillStyle = 'rgba(255,240,248,0.95)'; v.rr(-11, 0, 22, 18, 6); ctx.fill();
    const sc = ['#ff5f8f', '#ffd23f', '#5fd0ff', '#8be07f', '#c58bff'];
    for (let i = 0; i < 12; i++) { ctx.fillStyle = sc[i % 5]; ctx.fillRect(-8 + (i * 5) % 16, 3 + (i * 3) % 12, 3.5, 1.5); }
    ctx.fillStyle = '#ff6fa8'; v.rr(-12, 17, 24, 7, 3); ctx.fill();
    ctx.fillStyle = '#ffffff'; v.circle(0, 9, 5); ctx.fill();
    ctx.fillStyle = v.c.ink; v.circle(-2, 8, 0.9); ctx.fill(); v.circle(2, 8, 0.9); ctx.fill();
    ctx.restore();
  }
  function pw16sGob(v, x, y, r, rot) {
    const ctx = v.ctx, cols = ['#5fc8ff', '#ff6fa8', '#ffe066', '#ffffff'];
    ctx.save(); ctx.translate(x, y); ctx.save(); ctx.rotate(rot);
    for (let i = 0; i < 4; i++) v.fillCircle(i * r * 0.08, 0, r * (1 - i * 0.22), cols[i]);
    ctx.restore();
    ctx.strokeStyle = 'rgba(90,40,80,0.45)'; ctx.lineWidth = 1.2; v.circle(0, 0, r); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.ellipse(0, 2, r * 0.55, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-3, 1.5, 1.6, Math.PI + 0.3, -0.3); ctx.stroke(); ctx.beginPath(); ctx.arc(3, 1.5, 1.6, Math.PI + 0.3, -0.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 3, 2.2, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.restore();
  }
  // where a candy dropped from the shaker at (x, t0) is at time t (null before it drops); it reaches the basket at t1
  const pw16sFall = (v, t, t0, t1, x, yEnd) => (t < t0 || t > t1 ? null : { x, y: v.lerp(42, yEnd, v.ease.in(v.seg(t, t0, t1))) });
  definePreview('Sprinkle Catch', {
    blurb: 'Catch falling candy in your basket while giant gobstoppers bounce around!',
    loop: 6,
    still: 4.9,
    draw(v, t) {
      const ctx = v.ctx, gy = pw16sGY, catchY = gy - pw16sHead - 6;
      v.sky(); v.sun(v.W - 40, 70, 12); v.hills(gy - 24);
      // lollipop trees
      for (const [lx, lc] of [[34, '#ffe066'], [150, '#9fe7ff'], [290, '#c9b0ff']]) { v.line(lx, gy - 30, lx, gy - 8, '#fff8f0', 2); v.fillCircle(lx, gy - 34, 8, lc); ctx.strokeStyle = '#ff7fae'; ctx.lineWidth = 2; v.circle(lx, gy - 34, 4.5); ctx.stroke(); }
      // chocolate floor with frosting and sprinkles
      ctx.fillStyle = '#7a4a32'; ctx.fillRect(0, gy, v.W, v.H - gy);
      ctx.fillStyle = '#fff4fa'; ctx.beginPath(); ctx.moveTo(0, gy - 1);
      for (let x = 0; x <= v.W; x += 16) { ctx.lineTo(x, gy + 4); ctx.quadraticCurveTo(x + 4, gy + 10 + (x / 16 % 2) * 2, x + 8, gy + 4); }
      ctx.lineTo(v.W, gy - 1); ctx.closePath(); ctx.fill();
      const sc = ['#ff5f8f', '#ffd23f', '#5fd0ff', '#8be07f'];
      for (let x = 6; x < v.W; x += 13) { ctx.fillStyle = sc[(x / 13 | 0) % 4]; ctx.fillRect(x, gy + 1 + (x % 3), 4, 1.5); }
      // a wafer up on the left
      ctx.fillStyle = '#d99a52'; v.rr(14, 96, 70, 8, 3); ctx.fill(); ctx.fillStyle = '#ff9ccf'; v.rr(12, 93, 74, 5, 2.5); ctx.fill();
      // the licorice rail and the shaker
      v.line(0, 12, v.W, 12, '#7a1f3d', 4);
      const shX = t < 1.1 ? 110 : t < 1.5 ? v.lerp(110, 225, v.ease.inOut(v.seg(t, 1.1, 1.5))) : t < 2.6 ? 225 : t < 3.5 ? v.lerp(225, 160, v.ease.inOut(v.seg(t, 2.6, 3.5))) : 160;
      const shaking = t < 0.3 ? t : t > 1.5 && t < 1.7 ? t : t > 3.6 && t < 3.9 ? t : 0;
      pw16sShaker(v, shX, shaking);
      // Pip: catches a mint, scoops two spilled candies, catches the golden candy
      const pipX = t < 1.1 ? v.lerp(78, 110, v.ease.out(v.seg(t, 0, 0.8))) : t < 3.2 ? 110 + Math.sin(t * 3) * 3 : t < 3.75 ? v.lerp(110, 168, v.ease.inOut(v.seg(t, 3.2, 3.75))) : 168 - 8 * v.ease.inOut(v.seg(t, 3.75, 4.3));
      const pipN = (t >= 1.1 ? 1 : 0) + (t >= 3.45 ? 1 : 0) + (t >= 3.7 ? 1 : 0) + (t >= 4.7 ? 1 : 0);
      const win = v.seg(t, 4.7, 6), pipHop = t > 4.75 ? v.hop(v.phase(t - 4.75, 0.5), 10) : 0;
      // Bo: catches a gumdrop, gets bonked (Boing!) and spills two
      const bonk = v.seg(t, 2.9, 3.3), boX = t < 1.7 ? v.lerp(258, 225, v.ease.out(v.seg(t, 0, 1.4))) : t < 2.9 ? 225 : t < 3.3 ? v.lerp(225, 198, bonk) : t < 3.9 ? 198 : v.lerp(198, 232, v.ease.inOut(v.seg(t, 3.9, 4.5)));
      const boY = gy + (t > 2.9 && t < 3.3 ? v.hop(bonk, 22) : 0), dizzy = t > 2.9 && t < 3.9;
      const boN = t >= 2.4 && t < 2.9 ? 1 : t < 2.4 ? 0 : 0;
      v.shadow(pipX, gy, 12); v.shadow(boX, gy, 12);
      v.hero(0, pipX, gy + pipHop, { s: pw16sS, face: t > 3.2 && t < 3.75 ? 1 : t > 3.75 && t < 4.3 ? -1 : 1, mood: win > 0 ? 'joy' : 'happy', sq: pipHop ? -0.1 : 0 });
      pw16sBasket(v, pipX, gy + pipHop, pipN, t >= 4.7, t > 1.05 && t < 1.3 ? -0.2 : 0);
      v.hero(1, boX, boY, { s: pw16sS, face: -1, mood: dizzy ? 'dizzy' : win > 0.2 ? 'happy' : 'happy' });
      pw16sBasket(v, boX, boY, boN, false, dizzy ? Math.sin(t * 20) * 0.2 : 0);
      // falling candy
      let c = pw16sFall(v, t, 0.3, 1.1, 110, catchY); if (c) pw16sCandy(v, 'mint', c.x, c.y, 1, t * 3);
      c = pw16sFall(v, t, 1.7, 2.4, 225, catchY); if (c) pw16sCandy(v, 1, c.x, c.y);
      c = pw16sFall(v, t, 3.9, 4.7, 160, catchY); if (c) pw16sCandy(v, 'gold', c.x, c.y, 1.15, t);
      // the spilled candy flies out of Bo's basket and lands by Pip
      for (const [k, lx, pick] of [[0, 172, 3.7], [1, 150, 3.45]]) {
        if (t < 2.9 || t >= pick) continue;
        const f = v.seg(t, 2.9, 3.3), x = v.lerp(225, lx, f), y = v.lerp(gy - pw16sHead - 8, gy - 6, f) + v.hop(f, 26);
        pw16sCandy(v, k ? 'mint' : 2, x, y + (f >= 1 ? Math.sin(t * 6 + k) : 0), 1, t * 2);
      }
      // the gobstopper rolls in bouncing, bonks Bo, bounces away
      if (t > 1.9 && t < 4.1) {
        const gx = t < 2.9 ? v.lerp(345, 246, v.seg(t, 1.9, 2.9)) : v.lerp(246, 350, v.seg(t, 2.9, 4.1));
        const gyB = gy - 13 - Math.abs(Math.sin((t - 1.9) * Math.PI * 1.6)) * 46;
        v.shadow(gx, gy, 14);
        pw16sGob(v, gx, gyB, 13, -t * 4);
      }
      // words
      const word = (str, x, y, a, b, col, size = 12) => { const k = v.seg(t, a, b); if (k > 0 && k < 1) { ctx.save(); ctx.globalAlpha *= 1 - k * k; v.label(str, x, y - 12 * k, size, col); ctx.restore(); } };
      word('+2', 110, catchY - 16, 1.1, 1.9, '#ff6f7f');
      word('+1', 225, catchY - 16, 2.4, 3.1, '#ffffff');
      word('Boing!', 222, catchY - 22, 2.9, 3.9, '#ffffff', 14);
      word('Scoop!', 160, catchY - 16, 3.45, 4.2, '#ffffff');
      word('Golden! +5', 160, catchY - 22, 4.7, 5.5, v.c.gold, 13);
      if (win > 0) { v.confetti(pipX, gy - 40, v.seg(t, 4.75, 5.9), 20); if (t > 5.1) v.pill('Pip wins!', v.W / 2, 50, { size: 13, col: v.c.gold }); }
      // the score
      const sp = 2 * (t >= 1.1) + 1 * (t >= 3.45) + 2 * (t >= 3.7) + 5 * (t >= 4.7), sb = t >= 2.4 && t < 2.9 ? 1 : 0;
      v.pill('Pip ' + sp, 8, v.H - 14, { size: 10, align: 'left', col: v.c.pip });
      v.pill(sb + ' Bo', v.W - 8, v.H - 14, { size: 10, align: 'right', col: v.c.bo });
    },
  });
  // ----- END 16-4 Sprinkle Catch preview -----
  //
}
