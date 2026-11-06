/* Pip & Bo - Level previews for World 16 Sugar Rush Factory (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw16. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 16-1 Conveyor Belt Chaos preview -----
  // Pip slows the belt from the catwalk lever, Bo hops up, grabs the lollipop and tosses it into the right bin.
  // belt travel (px) at time t: fast (60 px/s) until Pip slows it at 1.0 s, then slow (20 px/s); 160 px a loop,
  // a whole number of chevrons, so the belt loops without a jump
  const pw16cBeltD = t => (t < 1 ? 60 * t : 60 + 20 * (t - 1));
  const pw16cLolly = (v, x, y, s = 1) => {
    const ctx = v.ctx;
    v.line(x, y + 4 * s, x, y + 13 * s, '#f4efe6', 2.2 * s);
    v.fillCircle(x, y, 6.5 * s, '#ff5c9a');
    ctx.strokeStyle = '#fff3f8'; ctx.lineWidth = 1.6 * s; ctx.beginPath();
    for (let a = 0; a < 9; a += 0.4) { const r = a * 0.62 * s; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.stroke();
  };
  const pw16cGum = (v, x, y, s = 1) => {
    const ctx = v.ctx;
    ctx.fillStyle = '#3fcf6f'; ctx.beginPath(); ctx.moveTo(x - 7 * s, y + 6 * s);
    ctx.quadraticCurveTo(x - 7 * s, y - 8 * s, x, y - 8 * s); ctx.quadraticCurveTo(x + 7 * s, y - 8 * s, x + 7 * s, y + 6 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#dfffe8'; for (const [dx, dy] of [[-3, -2], [2, -4], [3, 1], [-1, 3]]) { v.circle(x + dx * s, y + dy * s, 0.9 * s); ctx.fill(); }
  };
  const pw16cBin = (v, x, y, col, dark, kind, n) => {
    const ctx = v.ctx;
    ctx.fillStyle = dark; v.rr(x - 17, y - 34, 34, 7, 3); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 15, y - 28); ctx.lineTo(x + 15, y - 28); ctx.lineTo(x + 12, y); ctx.lineTo(x - 12, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; v.rr(x - 9, y - 24, 18, 17, 4); ctx.fill();
    if (kind === 'lolly') pw16cLolly(v, x, y - 18, 0.62); else pw16cGum(v, x, y - 15, 0.7);
    if (n != null) v.pill(n, x + 14, y - 38, { size: 8, bg: '#ffffff', col: dark });
  };
  definePreview('Conveyor Belt Chaos', {
    blurb: 'One works the belt levers, one rides the belts and sorts candy into the right bins. Swap jobs every room!',
    loop: 6,
    still: 2.25,
    draw(v, t) {
      const ctx = v.ctx, W = v.W, H = v.H;
      // the factory wall: candy stripes and a round window
      ctx.fillStyle = '#ffe3ef'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffd0e3'; for (let x = 0; x < W; x += 28) ctx.fillRect(x, 0, 14, H);
      v.fillCircle(216, 98, 19, '#f08cb4'); v.fillCircle(216, 98, 15, '#ffeef6');
      v.fillCircle(210, 104, 3, '#ff5c9a'); v.fillCircle(222, 102, 3, '#7fc8ff');
      // the floor
      ctx.fillStyle = '#a8724e'; ctx.fillRect(0, 162, W, H - 162);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 160, W, 3);
      ctx.fillStyle = '#ff7aa8'; for (let x = 0; x < W; x += 16) ctx.fillRect(x, 160, 8, 3);
      // the catwalk with its railing
      ctx.fillStyle = '#3fae9a'; ctx.fillRect(0, 48, W, 9);
      ctx.fillStyle = '#7fe0c8'; ctx.fillRect(0, 48, W, 2);
      ctx.strokeStyle = '#3fae9a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(W, 30);
      for (let x = 6; x < W; x += 18) { ctx.moveTo(x, 30); ctx.lineTo(x, 48); }
      ctx.stroke();
      // the chute
      ctx.fillStyle = '#ff9cc4'; ctx.fillRect(78, 57, 12, 10);
      ctx.fillStyle = '#e0568e'; ctx.beginPath(); ctx.moveTo(73, 66); ctx.lineTo(95, 66); ctx.lineTo(90, 74); ctx.lineTo(78, 74); ctx.closePath(); ctx.fill();
      // the bins
      pw16cBin(v, 28, 160, '#4fd07f', '#238a4c', 'gum', '0/3');
      pw16cBin(v, 292, 160, '#ff7aaa', '#c23a72', 'lolly', t >= 3.9 ? '2/3' : '1/3');
      // the belt
      const D = pw16cBeltD(t), x0 = 64, x1 = 252, by = 112;
      ctx.fillStyle = '#4a3d5c'; v.rr(x0 - 3, by + 2, x1 - x0 + 6, 11, 5); ctx.fill();
      ctx.fillStyle = '#2c2438'; ctx.fillRect(x0, by, x1 - x0, 5);
      ctx.save(); ctx.beginPath(); ctx.rect(x0, by - 1, x1 - x0, 7); ctx.clip();
      ctx.fillStyle = '#5ee0b0';
      for (let x = x0 - 16 + (D % 16); x < x1 + 16; x += 16) { ctx.beginPath(); ctx.moveTo(x + 4, by + 2.5); ctx.lineTo(x, by); ctx.lineTo(x, by + 5); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = '#9aa0b4'; for (let x = x0 + 6; x < x1; x += 14) { v.circle(x, by + 8, 2.6); ctx.fill(); }
      ctx.fillStyle = '#5ee0b0'; ctx.fillRect(x0, by + 12, x1 - x0, 2);
      // Pip at the lever (fast at 0, slow from 1.0; back to fast at the end of the loop)
      const toSlow = v.seg(t, 0.75, 1.0), toFast = v.seg(t, 5.7, 6.0);
      const lever = 0.6 - 1.2 * v.ease.inOut(toSlow) + 1.2 * v.ease.inOut(toFast);
      const sx = 168;
      ctx.fillStyle = '#2b9a73'; v.rr(sx - 11, 28, 22, 20, 4); ctx.fill();
      ctx.fillStyle = '#2a2140'; v.rr(sx - 8, 31, 16, 8, 2); ctx.fill();
      const slow = t >= 1.0 && t < 5.85;
      ctx.fillStyle = slow ? '#ffe680' : '#9fffd0';
      for (let k = 0; k < (slow ? 1 : 2); k++) { const ax = sx - (slow ? 0 : 3) + k * 6; ctx.beginPath(); ctx.moveTo(ax + 3, 35); ctx.lineTo(ax - 1.5, 32.5); ctx.lineTo(ax - 1.5, 37.5); ctx.closePath(); ctx.fill(); }
      ctx.save(); ctx.translate(sx, 45); ctx.rotate(lever);
      v.line(0, 0, 0, -13, '#5a4a6a', 2.5); v.fillCircle(0, -14, 3.4, '#ff5c8a');
      ctx.restore();
      v.line(sx, 57, sx, by - 2, 'rgba(63,174,154,0.55)', 1.2);
      const pulling = (t > 0.6 && t < 1.15) || t > 5.55;
      v.hero(0, sx - 24, 48, { face: 1, mood: pulling ? 'grit' : 'happy', sq: pulling ? 0.08 * Math.sin(t * 30) : 0 });
      // the lollipop: rides the belt, then Bo grabs it at 2.2 s and tosses it at 3.3 s
      const grabT = 2.2, tossT = 3.3, landT = 3.9;
      // Bo: walk under it, hop, carry it right, toss, walk back
      let bx, face = 1, hop = 0;
      if (t < 1.6) bx = v.lerp(140, 175, v.ease.inOut(v.seg(t, 0.2, 1.6)));
      else if (t < 2.5) bx = 175;
      else if (t < 4.3) bx = v.lerp(175, 236, v.ease.inOut(v.seg(t, 2.5, 3.2)));
      else { bx = v.lerp(236, 140, v.ease.inOut(v.seg(t, 4.3, 5.6))); face = t < 5.6 ? -1 : 1; }
      hop = v.hop(v.seg(t, 1.95, 2.45), 30);
      const bfy = 160 + hop;
      if (t < grabT) pw16cLolly(v, 91 + pw16cBeltD(t), by - 7);
      else if (t < tossT) pw16cLolly(v, bx, bfy - 31);
      else if (t < landT) {
        const k = v.seg(t, tossT, landT);
        pw16cLolly(v, v.lerp(236, 292, k), v.lerp(129, 116, k) + v.hop(k, 34), 1 - 0.3 * k);
      }
      // the next candy: a gumdrop drops from the chute and is on the belt when the loop starts again
      if (t > 5.3) {
        const k = v.seg(t, 5.3, 5.65);
        const gx = t < 5.65 ? 84 : 84 + 20 * (t - 5.65);
        pw16cGum(v, gx, v.lerp(76, by - 7, v.ease.in(k)));
      }
      v.hero(1, bx, bfy, { face, mood: t > 3.85 && t < 4.6 ? 'joy' : t > 1.9 && t < 2.5 ? 'wow' : 'happy', sq: hop < -2 ? -0.12 : 0 });
      if (t >= 3.15 && t < 3.45) v.sparkle(bx + 9, bfy - 28, v.seg(t, 3.15, 3.45), '#ffffff', 6);
      // words
      const pop = (s, x, y, a, b, col) => { if (t < a || t > b) return; const k = v.seg(t, a, b); ctx.save(); ctx.globalAlpha = 1 - k * k; v.label(s, x, y - k * 10, 13, col); ctx.restore(); };
      pop('Slow', 158, 96, 0.95, 1.8, '#9fffd0');
      pop('FAST!', 150, 96, 5.8, 6.0, '#9fffd0');
      if (t < 0.5) { ctx.save(); ctx.globalAlpha = 1 - t * 2; v.label('FAST!', 150, 94 - t * 6, 13, '#9fffd0'); ctx.restore(); }
      pop('Yum!', 292, 104, landT, 4.7, '#ffe680');
      if (t > landT && t < 4.5) { v.confetti(292, 124, v.seg(t, landT, 4.5)); }
      // the order board
      v.pill('ORDER', 128, 12, { size: 8, bg: 'rgba(255,255,255,0.92)', col: '#c23a72' });
      pw16cLolly(v, 162, 10, 0.55);
      v.text(t >= 3.9 ? '2/3' : '1/3', 170, 12, 9, '#5a2a44', 'left');
      pw16cGum(v, 199, 12, 0.55);
      v.text('0/3', 207, 12, 9, '#5a2a44', 'left');
    },
  });
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
  // PLACEHOLDER
  // ----- END 16-4 Sprinkle Catch preview -----
  //
}
