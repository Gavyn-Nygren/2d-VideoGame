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
  // (being built)
  // ----- END 23-3 Hot Dog Stand Rush preview -----
  //
  //
  //
  //
  // ----- BEGIN 23-4 Pie-Eating Contest preview -----
  // Pip and Bo sit at the judges' table with a pie each. The crowd claps a beat (the shrinking circle above each head);
  // Pip munches steadily and gulps on every clap ("GULP!"); Bo mashes, his hiccup jar fills and he bounces with the
  // hiccups; Pip swallows the last bite on the clap: "Pip wins the round!" and confetti.
  const pw23eLoop = 6.2, pw23eClaps = [1.5, 3, 4.5], pw23eX = [100, 220], pw23eTable = 124, pw23eHic = [3, 4.6];
  const pw23eSeg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  // Pip bites every 0.3 s (not right on a clap), Bo mashes from 1.6 s until the hiccups at 3 s, then nibbles again
  const pw23eBites = [[], []];
  for (let b = 0.2; b < 4.42; b += 0.3) if (pw23eClaps.every(c => Math.abs(b - c) > 0.12)) pw23eBites[0].push(b);
  for (let b = 0.25; b < 1.5; b += 0.32) pw23eBites[1].push(b);
  for (let b = 1.62; b < 2.95; b += 0.15) pw23eBites[1].push(b);
  for (let b = 4.75; b < 5.9; b += 0.34) pw23eBites[1].push(b);
  const pw23eLeft = (k, t) => { const n = pw23eBites[k].filter(b => b <= t).length; return k ? 1 - n * 0.032 : 1 - n / pw23eBites[0].length; };
  // bites in the cheeks: those since the last gulp (Pip gulps on every clap, Bo only on the first)
  const pw23eCheeks = (k, t) => {
    const gul = pw23eClaps.filter(c => c <= t && (k === 0 || c === 1.5)).pop() || -1;
    return Math.min(6, pw23eBites[k].filter(b => b <= t && b > gul).length);
  };
  const pw23eJar = (k, t) => {
    if (k === 0) return 0.18 + 0.06 * Math.sin(t * 2);
    if (t < 1.6) return 0.15;
    if (t < pw23eHic[0]) return 0.15 + 0.85 * Math.pow(pw23eSeg(t, 1.6, pw23eHic[0]), 1.4);
    return Math.max(0.1, 1 - (t - pw23eHic[0]) * 0.6);
  };
  const pw23ePie = (v, x, y, left, cream) => {
    const c = v.ctx;
    c.fillStyle = 'rgba(28,26,54,0.18)'; c.beginPath(); c.ellipse(x, y + 3, 26, 7, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(x, y, 26, 8, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#c9d6e8'; c.lineWidth = 1; c.stroke();
    if (left <= 0.01) return;
    c.save(); c.translate(x, y - 2); c.scale(1, 0.36);
    const a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2 * left;
    c.fillStyle = '#c47a35'; c.beginPath(); c.moveTo(0, 6); c.arc(0, 6, 20, a0, a1); c.closePath(); c.fill();
    c.fillStyle = '#e3a453'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 20, a0, a1); c.closePath(); c.fill();
    c.fillStyle = '#c0283c'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 15, a0, a1); c.closePath(); c.fill();
    c.save(); c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 15, a0, a1); c.closePath(); c.clip();
    c.strokeStyle = '#f2c57c'; c.lineWidth = 3.4;
    for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(k * 6, -16); c.lineTo(k * 6, 16); c.moveTo(-16, k * 6); c.lineTo(16, k * 6); c.stroke(); }
    c.restore();
    if (cream && left > 0.3) { c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(0, -2, 5, 0, Math.PI * 2); c.fill(); v.fillCircle(0, -4, 1.8, '#c0283c'); }
    c.restore();
  };
  const pw23eJarDraw = (v, x, y, f, t) => {
    const c = v.ctx, hot = f > 0.75;
    c.fillStyle = 'rgba(220,240,255,0.55)'; v.rr(x - 8, y - 24, 16, 24, 4); c.fill();
    c.fillStyle = hot ? (Math.sin(t * 20) > 0 ? '#ff6a5a' : '#ff9a6a') : '#8fd8ff';
    c.save(); v.rr(x - 8, y - 24, 16, 24, 4); c.clip(); c.fillRect(x - 8, y - 24 * f, 16, 24 * f); c.restore();
    c.strokeStyle = '#5a6a8a'; c.lineWidth = 1.4; v.rr(x - 8, y - 24, 16, 24, 4); c.stroke();
    c.fillStyle = '#8a6a4a'; v.rr(x - 9, y - 27, 18, 4, 2); c.fill();
    for (let i = 0; i < 2; i++) v.fillCircle(x - 3 + i * 6, y - 5 - ((t * 14 + i * 9) % (20 * f + 1)), 1.4, 'rgba(255,255,255,0.8)');
  };
  // the cheek ring above a head: 6 segments for the bites in the cheeks, and the clap circle shrinking onto it
  const pw23eRing = (v, x, y, n, t, glow) => {
    const c = v.ctx, next = pw23eClaps.find(cl => cl > t - 0.05), prev = next == null ? 4.5 : next - 1.5, k = next == null ? 1 : pw23eSeg(t, prev, next);
    c.fillStyle = 'rgba(28,26,54,0.55)'; v.circle(x, y, 13); c.fill();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 3 + 0.08;
      c.strokeStyle = i < n ? (n >= 6 ? '#ff7a6a' : '#ffd25a') : 'rgba(255,255,255,0.25)'; c.lineWidth = 4;
      c.beginPath(); c.arc(x, y, 9.5, a, a + Math.PI / 3 - 0.16); c.stroke();
    }
    if (glow > 0) { c.strokeStyle = 'rgba(110,230,120,' + glow + ')'; c.lineWidth = 4; v.circle(x, y, 13); c.stroke(); }
    if (next != null && t < 4.55) { c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 1.6; v.circle(x, y, 12 + 14 * (1 - k)); c.stroke(); }
  };
  definePreview('Pie-Eating Contest', {
    blurb: 'Munch your pie and gulp on the clap! Eat too fast and you get the hiccups.',
    loop: pw23eLoop,
    still: 3.08,
    draw(v, t) {
      const c = v.ctx, win = t > 4.5;
      // sky, the Ferris wheel and a red barn behind the stage, bunting
      const g = c.createLinearGradient(0, 0, 0, 100); g.addColorStop(0, '#7cc8f2'); g.addColorStop(1, '#d6f1ff');
      c.fillStyle = g; c.fillRect(0, 0, v.W, 110);
      v.cloud(60, 22, 0.7); v.cloud(250, 16, 0.6);
      c.save(); c.translate(36, 58); c.strokeStyle = '#e9e2f5'; c.lineWidth = 2; v.circle(0, 0, 34); c.stroke();
      for (let i = 0; i < 8; i++) { const a = t * 0.3 + i * Math.PI / 4; v.line(0, 0, Math.cos(a) * 34, Math.sin(a) * 34, '#e9e2f5', 1.2); v.fillCircle(Math.cos(a) * 34, Math.sin(a) * 34 + 3, 3.5, ['#ff7a8a', '#ffd25a', '#6ec8ff', '#9ad86a'][i % 4]); }
      v.line(0, 0, -16, 52, '#d8d0e8', 2.5); v.line(0, 0, 16, 52, '#d8d0e8', 2.5); c.restore();
      c.fillStyle = '#c8433c'; c.beginPath(); c.moveTo(262, 110); c.lineTo(262, 66); c.lineTo(286, 48); c.lineTo(310, 66); c.lineTo(310, 110); c.fill();
      c.fillStyle = '#fff'; c.fillRect(278, 80, 16, 30); c.fillStyle = '#c8433c'; c.fillRect(280, 82, 12, 28); v.line(280, 82, 292, 110, '#fff', 1.5); v.line(292, 82, 280, 110, '#fff', 1.5);
      c.fillStyle = '#7fcf6a'; c.fillRect(0, 100, v.W, 12);
      // the stage back wall and the sign
      c.fillStyle = '#e8b878'; c.fillRect(70, 62, 180, 50); c.fillStyle = '#d29a5a'; for (let x = 70; x < 250; x += 15) c.fillRect(x, 62, 1.5, 50);
      for (let i = 0; i < 11; i++) { const x = 72 + i * 17; c.fillStyle = ['#ff7a8a', '#ffd25a', '#6ec8ff'][i % 3]; c.beginPath(); c.moveTo(x, 62); c.lineTo(x + 14, 62); c.lineTo(x + 7, 71); c.fill(); }
      // Pip and Bo seated behind the table
      for (let k = 0; k < 2; k++) {
        const x = pw23eX[k], hic = k === 1 && t > pw23eHic[0] && t < pw23eHic[1];
        const lastBite = pw23eBites[k].filter(b => b <= t).pop() || -9, chew = pw23eSeg(t, lastBite, lastBite + 0.12);
        const gulpAt = pw23eClaps.find(cl => t >= cl && t < cl + 0.35 && (k === 0 || cl === 1.5));
        const bounce = hic ? -Math.abs(Math.sin((t - pw23eHic[0]) * 9)) * 9 : 0;
        const nod = chew < 1 ? Math.sin(chew * Math.PI) * 2.5 : 0;
        const mood = win ? (k === 0 ? 'joy' : 'wow') : hic ? 'blink' : k === 1 && t > 1.6 ? 'grit' : gulpAt != null ? 'joy' : 'happy';
        const y = pw23eTable + 4 + bounce + nod;
        v.hero(k, x, y, { s: 2, face: k ? -1 : 1, mood, shadow: false, sq: gulpAt != null ? -0.12 : 0 });
        // puffed cheeks
        const n = pw23eCheeks(k, t), puff = n / 6;
        if (n > 0 && gulpAt == null) for (const sd of [-1, 1]) { c.fillStyle = k ? v.c.bo : v.c.pip; c.strokeStyle = k ? v.c.boDark : v.c.pipDark; c.lineWidth = 1.8; v.circle(x + sd * (17 + puff * 4) + (k ? -4 : 4), y - 21, 4 + puff * 6); c.fill(); c.stroke(); }
        // the paper bib
        c.fillStyle = '#fffaf0'; c.beginPath(); c.moveTo(x - 11, y - 14); c.lineTo(x + 11, y - 14); c.lineTo(x + 8, y); c.lineTo(x - 8, y); c.closePath(); c.fill();
        v.fillCircle(x, y - 7, 2.6, '#c0283c');
        // the cheek ring
        const glow = gulpAt != null ? 1 - (t - gulpAt) / 0.35 : 0;
        if (!win) pw23eRing(v, x, 44 + bounce * 0.3, n, t, glow);
        if (hic) v.label('HIC!', x + 26, 64 + bounce, 13, '#ffd2a8');
        if (gulpAt != null) { const u = (t - gulpAt) / 0.35; c.save(); c.globalAlpha *= 1 - u * 0.6; v.label('GULP!', x, 70 - u * 10, 12, v.c.gold); c.restore(); }
      }
      // the sign (drawn over the clap circles so they never cross its words)
      c.fillStyle = '#fff4dc'; v.rr(98, 8, 124, 22, 6); c.fill(); c.strokeStyle = '#b5482e'; c.lineWidth = 2; c.stroke();
      v.text('PIE-EATING CONTEST', 160, 19.5, 10, '#b5482e');
      // the table with its checked cloth, the pies and the hiccup jars
      c.fillStyle = '#a0603a'; c.fillRect(56, pw23eTable, 208, 6);
      c.fillStyle = '#ffffff'; c.fillRect(56, pw23eTable + 6, 208, 26);
      c.fillStyle = 'rgba(214,58,70,0.45)';
      for (let x = 56; x < 264; x += 16) c.fillRect(x, pw23eTable + 6, 8, 26);
      for (let y = pw23eTable + 6; y < pw23eTable + 32; y += 16) c.fillRect(56, y, 208, 8);
      for (let k = 0; k < 2; k++) {
        pw23ePie(v, pw23eX[k], pw23eTable + 2, Math.max(0, pw23eLeft(k, t)), true);
        pw23eJarDraw(v, k ? 252 : 68, pw23eTable + 2, pw23eJar(k, t), t);
      }
      // the crowd from behind, clapping on the beat
      const clapNow = pw23eClaps.some(cl => t >= cl && t < cl + 0.15);
      for (let i = 0; i < 9; i++) {
        const x = 18 + i * 36 + (i % 2) * 6, hy = 168 - (i % 3) * 3, col = ['#7a5a9a', '#5a8ab0', '#b0705a', '#6a9a5a'][i % 4];
        c.fillStyle = col; v.rr(x - 13, hy - 2, 26, 30, 9); c.fill();
        v.fillCircle(x, hy - 8, 9, ['#6b4a2e', '#f2c27a', '#3a2a22', '#c88a52'][i % 4]);
        const up = clapNow || (win && i % 2 === 0) ? -14 : -4;
        v.fillCircle(x - (clapNow ? 4 : 9), hy + up, 3.5, '#f2c9a0'); v.fillCircle(x + (clapNow ? 4 : 9), hy + up, 3.5, '#f2c9a0');
      }
      if (clapNow && !win) v.label('clap!', 160, 150, 11, '#fff');
      if (win) {
        v.confetti(pw23eX[0], 60, pw23eSeg(t, 4.5, 6.2), 22); v.confetti(160, 40, pw23eSeg(t, 4.7, 6.2), 16);
        c.save(); c.globalAlpha *= Math.min(1, (t - 4.5) * 5); v.pill('Pip wins the round!', 160, 46, { size: 11, bg: 'rgba(28,26,54,0.82)' }); c.restore();
        v.star(pw23eX[0] - 30, 88, 6 * Math.min(1, (t - 4.5) * 4));
      }
    },
  });
  // ----- END 23-4 Pie-Eating Contest preview -----
  //
  //

}
