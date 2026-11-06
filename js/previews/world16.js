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
  // Pip paddles the cookie raft down the chocolate river; Bo hooks a sweet, shoves a wafer log away, hooks a gummy
  // bear, and they dock at the pier with a cheer.
  const pw16rRX = 112, pw16rRY = 104;
  // where a floating thing is on screen: it reaches x = at when t = tAt, drifting left at sp px/s
  const pw16rX = (t, at, tAt, sp) => at + (tAt - t) * sp;
  const pw16rBanks = (v, t) => {
    const ctx = v.ctx, sc = Math.min(t, 5) * 80;
    ctx.fillStyle = '#ffe0ef'; ctx.fillRect(0, 0, v.W, v.H);
    // chocolate
    ctx.fillStyle = '#713e22'; ctx.fillRect(0, 42, v.W, 116);
    ctx.fillStyle = 'rgba(255,220,190,0.08)'; ctx.fillRect(0, 70, v.W, 22);
    ctx.fillStyle = 'rgba(60,26,10,0.22)'; ctx.fillRect(0, 42, v.W, 10); ctx.fillRect(0, 148, v.W, 10);
    // ripples drifting with the current
    ctx.lineCap = 'round';
    for (let k = 0; k < 14; k++) {
      const x = ((v.rand(k) * 360 - t * 60 - sc * 0) % 360 + 360) % 360 - 20, y = 56 + v.rand(k + 30) * 92;
      ctx.strokeStyle = 'rgba(255,214,180,0.3)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.quadraticCurveTo(x, y - 2, x + 7, y); ctx.stroke();
    }
    // wafer edges with a cream frill
    for (const [y, s] of [[42, -1], [158, 1]]) {
      ctx.fillStyle = '#c98a45'; ctx.fillRect(0, y + (s < 0 ? -7 : 0), v.W, 7);
      ctx.fillStyle = '#e8b06a'; ctx.fillRect(0, y + (s < 0 ? -6 : 1), v.W, 5);
      ctx.strokeStyle = 'rgba(150,96,40,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = -((sc) % 8); x < v.W; x += 8) { ctx.moveTo(x, y + (s < 0 ? -7 : 0)); ctx.lineTo(x, y + (s < 0 ? 0 : 7)); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,248,236,0.95)'; ctx.lineWidth = 2.4; ctx.beginPath();
      for (let x = 0; x <= v.W; x += 4) ctx.lineTo(x, y - s * 1.5 + Math.sin((x + sc) / 7) * 1);
      ctx.stroke();
    }
    // candy trees on both banks
    const cols = ['#ff5fa2', '#58c6ff', '#ffd23d', '#8be37a', '#c58cff'];
    for (let k = 0; k < 9; k++) for (const top of [true, false]) {
      const x = ((k * 70 + (top ? 20 : 55) - sc) % 630 + 630) % 630 - 30, y = top ? 30 : 176, col = cols[(k + (top ? 0 : 2)) % 5];
      if (x < -20 || x > v.W + 20) continue;
      if (k % 2) { v.line(x, y, x, y - 14, '#fff', 2); v.fillCircle(x, y - 18, 7, col); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y - 18, 3.5, 0, 4.5); ctx.stroke(); }
      else { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.quadraticCurveTo(x - 7, y - 13, x, y - 13); ctx.quadraticCurveTo(x + 7, y - 13, x + 7, y); ctx.closePath(); ctx.fill(); v.fillCircle(x - 2, y - 9, 1.6, 'rgba(255,255,255,0.7)'); }
    }
  };
  const pw16rPier = (v, x) => {
    const ctx = v.ctx;
    if (x > v.W + 60) return;
    ctx.fillStyle = '#b07a3e'; ctx.fillRect(x - 34, 28, 68, 30);
    ctx.fillStyle = '#d9a35c'; for (let k = 0; k < 4; k++) ctx.fillRect(x - 32 + k * 17, 30, 15, 26);
    ctx.fillStyle = '#8a5a2a'; ctx.fillRect(x - 34, 56, 6, 10); ctx.fillRect(x + 28, 56, 6, 10);
    v.line(x + 28, 30, x + 28, 10, '#fff', 2); ctx.fillStyle = '#ff5fa2'; ctx.beginPath(); ctx.moveTo(x + 29, 10); ctx.lineTo(x + 42, 14); ctx.lineTo(x + 29, 18); ctx.closePath(); ctx.fill();
  };
  const pw16rWrap = (v, x, y, col, a) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-11, -5); ctx.lineTo(-11, 5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(11, -5); ctx.lineTo(11, 5); ctx.closePath(); ctx.fill();
    v.fillCircle(0, 0, 6, col); v.fillCircle(-2, -2, 2, 'rgba(255,255,255,0.75)');
    ctx.restore();
  };
  const pw16rGummy = (v, x, y, a) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = 'rgba(139,227,122,0.92)';
    v.circle(-4, -8, 3); ctx.fill(); v.circle(4, -8, 3); ctx.fill();
    v.circle(0, -4, 6); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, 4, 7, 7, 0, 0, Math.PI * 2); ctx.fill();
    v.fillCircle(-2, -5, 1, '#245a20'); v.fillCircle(2, -5, 1, '#245a20'); v.fillCircle(-3, 1, 2, 'rgba(255,255,255,0.5)');
    ctx.restore();
  };
  const pw16rLog = (v, x, y, a) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = '#c98a45'; v.rr(-22, -6, 44, 12, 4); ctx.fill();
    ctx.fillStyle = '#e8b06a'; v.rr(-20, -4, 40, 8, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(150,96,40,0.6)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = -16; k <= 16; k += 6) { ctx.moveTo(k, -4); ctx.lineTo(k, 4); }
    ctx.stroke();
    ctx.restore();
  };
  const pw16rRaft = (v, x, y, n) => {
    const ctx = v.ctx;
    ctx.fillStyle = 'rgba(40,16,4,0.3)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 5, 26, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d99a52'; ctx.beginPath(); ctx.ellipse(x, y, 26, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ecb46c'; ctx.beginPath(); ctx.ellipse(x, y - 1.5, 23, 9.5, 0, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 7; k++) v.fillCircle(x - 17 + v.rand(k + 5) * 34, y - 6 + v.rand(k + 15) * 10, 1.8, '#5a2c14');
    // the candy basket at the back
    ctx.fillStyle = '#ff8cc0'; v.rr(x - 6, y - 12, 12, 8, 2); ctx.fill();
    const cols = ['#58c6ff', '#8be37a', '#ffd23d', '#ff5fa2'];
    for (let k = 0; k < n; k++) v.fillCircle(x - 4 + (k % 3) * 4, y - 13 - Math.floor(k / 3) * 3, 2.2, cols[k % 4]);
  };
  definePreview('Chocolate River Raft', {
    blurb: 'One paddles the cookie raft, one hooks candy and shoves logs. Swap at each dock!',
    loop: 6,
    still: 1.15,
    draw(v, t) {
      const ctx = v.ctx, X = pw16rRX, docked = t >= 5;
      pw16rBanks(v, t);
      pw16rPier(v, Math.max(X, pw16rX(t, X, 5, 80)));
      const bob = Math.sin(t * 3) * 1.2, Y = pw16rRY + bob;
      // the hook: Bo's arm reaches the tip to where it's needed
      const rest = { x: X + 34, y: Y - 12 };
      const cand = { x: pw16rX(t, 166, 1.1, 60), y: 78 };
      const gum = { x: pw16rX(t, 170, 4.0, 55), y: 132 };
      const logX = t < 2.6 ? pw16rX(t, 172, 2.6, 110) : 172 - (t - 2.6) * 34, logY = t < 2.6 ? 112 : 112 + 30 * v.ease.out(v.seg(t, 2.6, 3.4));
      let tip = rest, got1 = t >= 1.1, got2 = t >= 4.0;
      const lerpP = (a, b, k) => ({ x: v.lerp(a.x, b.x, k), y: v.lerp(a.y, b.y, k) });
      if (t >= 0.6 && t < 1.1) tip = lerpP(rest, cand, v.ease.inOut(v.seg(t, 0.6, 1.1)));
      else if (t >= 1.1 && t < 1.5) tip = lerpP(cand, { x: X, y: Y - 12 }, v.ease.inOut(v.seg(t, 1.1, 1.5)));
      else if (t >= 1.5 && t < 2.2) tip = lerpP({ x: X, y: Y - 12 }, rest, v.seg(t, 1.5, 1.8));
      else if (t >= 2.2 && t < 2.75) { const at = { x: pw16rX(2.6, 172, 2.6, 110) - 18, y: 108 }; tip = lerpP(rest, at, v.ease.out(v.seg(t, 2.2, 2.55))); if (t > 2.55) tip = { x: at.x + 6 * Math.sin(v.seg(t, 2.55, 2.75) * Math.PI), y: at.y }; }
      else if (t >= 2.75 && t < 3.5) tip = lerpP({ x: 154, y: 108 }, rest, v.seg(t, 2.75, 3.1));
      else if (t >= 3.5 && t < 4.0) tip = lerpP(rest, gum, v.ease.inOut(v.seg(t, 3.5, 4.0)));
      else if (t >= 4.0 && t < 4.4) tip = lerpP(gum, { x: X, y: Y - 12 }, v.ease.inOut(v.seg(t, 4.0, 4.4)));
      else if (t >= 4.4) tip = lerpP({ x: X, y: Y - 12 }, rest, v.seg(t, 4.4, 4.7));
      // floating things
      if (!got1) pw16rWrap(v, cand.x, cand.y, '#58c6ff', Math.sin(t * 2) * 0.3);
      else if (t < 1.5) pw16rWrap(v, tip.x, tip.y, '#58c6ff', 0);
      if (!got2) pw16rGummy(v, gum.x, gum.y, Math.sin(t * 1.7) * 0.2);
      else if (t < 4.4) pw16rGummy(v, tip.x, tip.y, 0);
      if (logX < v.W + 30) pw16rLog(v, logX, logY, t < 2.6 ? 0.15 : 0.15 - 0.5 * v.ease.out(v.seg(t, 2.6, 3.4)));
      if (t > 2.55 && t < 3.0) v.puff(logX - 10, logY, v.seg(t, 2.55, 3.0));
      // the raft and crew
      pw16rRaft(v, X, Y, (t >= 1.5 ? 1 : 0) + (t >= 4.4 ? 3 : 0));
      const joy = docked ? v.hop(v.phase(t - 5, 0.5), 7) : 0;
      // Pip's paddle, sweeping strokes (still once docked)
      const ph = docked ? 0.2 : v.phase(t, 0.6), sw = Math.sin(ph * Math.PI * 2);
      const px = X - 12, py = Y - 10 + joy;
      ctx.strokeStyle = '#9a6a2e'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      const bx = px - 14 - sw * 8, by = Y + 12;
      ctx.beginPath(); ctx.moveTo(px + 4, py - 8); ctx.lineTo(bx, by); ctx.stroke();
      ctx.fillStyle = '#e8b06a'; ctx.beginPath(); ctx.ellipse(bx, by, 3, 6, 0.4, 0, Math.PI * 2); ctx.fill();
      if (!docked && ph > 0.25 && ph < 0.6) v.fillCircle(bx - 6, by + 2, 2, 'rgba(255,230,200,0.5)');
      v.hero(0, px, Y + 2 + joy, { s: 0.68, face: 1, mood: docked ? 'joy' : 'grit', shadow: false });
      // Bo and the candy-cane hook
      const hx = X + 12, hy = Y - 12 + joy;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tip.x, tip.y); ctx.stroke();
      ctx.strokeStyle = '#ff5fa2'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tip.x, tip.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#ff5fa2'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tip.x + 3, tip.y - 1, 3.5, Math.PI, Math.PI * 2.2); ctx.stroke();
      v.hero(1, hx, Y + 2 + joy, { s: 0.68, face: 1, mood: docked ? 'joy' : (t > 0.9 && t < 1.4) || (t > 3.8 && t < 4.3) ? 'wow' : 'happy', shadow: false });
      // pops
      if (t > 1.1 && t < 1.9) v.label('+1', X + 30, 64 - v.seg(t, 1.1, 1.9) * 12, 14, '#ffd23d');
      if (t > 2.6 && t < 3.3) v.label('shove!', 186, 96 - v.seg(t, 2.6, 3.3) * 8, 13, '#fff');
      if (t > 4.0 && t < 4.8) v.label('+3', X + 34, 120 - v.seg(t, 4.0, 4.8) * 12, 14, '#8be37a');
      if (docked) {
        const k = v.seg(t, 5, 6);
        v.confetti(X, 60, k); v.sparkle(X - 30, 70, k); v.sparkle(X + 34, 66, v.seg(t, 5.2, 6));
        v.heart(X, Y - 46 - k * 10, 6, '#ff5fa2');
        v.pill('swap jobs!', X + 70, 82, { size: 12, align: 'center' });
      }
      v.pill('candy ' + ((t >= 1.5 ? 1 : 0) + (t >= 4.4 ? 3 : 0)), v.W - 10, 10, { size: 12, align: 'right' });
    },
  });
  // ----- END 16-3 Chocolate River Raft preview -----
  //
  // ----- BEGIN 16-4 Sprinkle Catch preview -----
  // PLACEHOLDER
  // ----- END 16-4 Sprinkle Catch preview -----
  //
}
