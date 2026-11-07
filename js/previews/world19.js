/* Pip & Bo - Level previews for World 19 Tumbleweed Gulch (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw19. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 19-1 Train Heist Hop preview -----
  // (preview goes here)
  // ----- END 19-1 Train Heist Hop preview -----
  //
  //
  //
  // ----- BEGIN 19-2 Handcar Hustle preview -----
  // (preview goes here)
  // ----- END 19-2 Handcar Hustle preview -----
  //
  //
  //
  // ----- BEGIN 19-3 Gold Mine Cart preview -----
  // (preview goes here)
  // ----- END 19-3 Gold Mine Cart preview -----
  //
  //
  //
  // ----- BEGIN 19-4 Quick-Draw Showdown preview -----
  // Back to back, three paces apart, a crow's CAW! tempts nobody, then the gold DRAW!: Bo's cork pops Pip's hat off.
  const pw19qdGY = 150, pw19qdLoop = 6.4;
  // a cowboy hat with its brim centred at (x, y), scale s, in the player's band colour
  const pw19qdHat = (v, id, x, y, s, rot) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s);
    ctx.fillStyle = id ? '#6e4422' : '#b98545'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 3.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = id ? '#8a5a30' : '#d6a35e'; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(-9, -11, -4, -12); ctx.quadraticCurveTo(0, -9, 4, -12); ctx.quadraticCurveTo(9, -11, 8, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = id ? v.c.bo : v.c.pip; ctx.fillRect(-8, -4, 16, 3);
    ctx.restore();
  };
  // the toy popgun held out front (face 1 = pointing right); out: the cork is off on its string
  const pw19qdGun = (v, id, x, y, face, out) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
    ctx.fillStyle = '#fff'; v.rr(0, -3, 15, 6, 2); ctx.fill();
    ctx.fillStyle = id ? v.c.bo : v.c.pip; ctx.fillRect(4, -3, 2.5, 6); ctx.fillRect(9, -3, 2.5, 6);
    ctx.fillStyle = id ? v.c.boDark : v.c.pipDark; v.rr(-1, 0, 5, 7, 1.5); ctx.fill();
    if (!out) { ctx.fillStyle = '#c9925a'; v.rr(15, -2.5, 5, 5, 1.5); ctx.fill(); }
    ctx.restore();
  };
  const pw19qdScene = (v, t) => {
    const ctx = v.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, pw19qdGY);
    g.addColorStop(0, '#f7a85a'); g.addColorStop(1, '#fff0c9');
    ctx.fillStyle = g; ctx.fillRect(0, 0, v.W, v.H);
    v.fillCircle(250, 26, 18, 'rgba(255,246,206,0.6)'); v.fillCircle(250, 26, 11, '#fff7d6');
    // red mesas
    ctx.fillStyle = '#e3936a'; ctx.beginPath(); ctx.moveTo(0, 90); ctx.lineTo(14, 44); ctx.lineTo(70, 44); ctx.lineTo(86, 90); ctx.fill();
    ctx.fillStyle = '#c3653f'; ctx.beginPath(); ctx.moveTo(220, 90); ctx.lineTo(238, 34); ctx.lineTo(300, 34); ctx.lineTo(320, 90); ctx.fill();
    // shop fronts: store, saloon (with the Mayor on the balcony), hat shop
    ctx.fillStyle = '#8fae9a'; ctx.fillRect(0, 62, 100, 66);
    ctx.fillStyle = '#c9744a'; ctx.fillRect(108, 40, 104, 88); ctx.fillRect(130, 32, 60, 10);
    ctx.fillStyle = '#d9a85a'; ctx.fillRect(220, 66, 100, 62);
    ctx.fillStyle = '#ffe9b8'; v.rr(126, 34, 68, 13, 2); ctx.fill(); v.text('SALOON', 160, 41, 8, '#8f2f1a');
    ctx.fillStyle = '#f3e2b8'; v.rr(10, 68, 80, 12, 2); ctx.fill(); v.text('STORE', 50, 74.5, 8, '#7a3a26');
    ctx.fillStyle = '#fff1cc'; v.rr(230, 70, 80, 12, 2); ctx.fill(); v.text('HATS', 270, 76.5, 8, '#3f4a8a');
    ctx.fillStyle = '#7a4a24'; ctx.fillRect(108, 80, 104, 3);
    ctx.fillStyle = '#3a2232'; ctx.fillRect(146, 100, 28, 28);
    // the Mayor (tall hat, white mustache) and his gold bell
    ctx.fillStyle = '#5a4a8a'; v.rr(152, 62, 14, 17, 4); ctx.fill();
    v.fillCircle(159, 57, 6, '#f2c9a0'); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(159, 60, 5, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2d2a3e'; ctx.fillRect(153, 49, 12, 2); ctx.fillRect(155, 40, 8, 10);
    const ring = t > 3.0 && t < 4.2 ? Math.sin((t - 3) * 16) * Math.exp(-(t - 3) * 2.5) * 0.6 : 0;
    ctx.save(); ctx.translate(182, 56); ctx.rotate(ring); ctx.fillStyle = v.c.gold; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(7, 11); ctx.lineTo(-7, 11); ctx.closePath(); ctx.fill(); ctx.restore();
    // the crow on the hat shop
    const caw = t > 1.95 && t < 2.6;
    ctx.fillStyle = '#2d2a3e'; ctx.beginPath(); ctx.ellipse(298, 62, 6, 4.5, 0, 0, Math.PI * 2); ctx.fill(); v.circle(293, 58, 3.5); ctx.fill();
    ctx.fillStyle = '#f2b23a'; ctx.beginPath(); ctx.moveTo(290, 57); ctx.lineTo(286, caw ? 54 : 58); ctx.lineTo(290, 59); ctx.fill();
    // boardwalk and street
    ctx.fillStyle = '#c48a52'; ctx.fillRect(0, 128, v.W, 6); ctx.fillStyle = '#8a5a30'; ctx.fillRect(0, 134, v.W, 2);
    ctx.fillStyle = '#e6c486'; ctx.fillRect(0, 136, v.W, v.H - 136);
    ctx.fillStyle = 'rgba(160,110,60,0.25)'; ctx.fillRect(0, 168, v.W, 2);
    // a tumbleweed rolling by
    const tx = ((t * 40) % 400) - 40;
    ctx.strokeStyle = '#b08848'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(tx, 170, 6, 3.5, i * 0.8 + t * 3, 0, Math.PI * 2); ctx.stroke(); }
  };
  definePreview('Quick-Draw Showdown', {
    blurb: 'Ten paces, wait for the gold DRAW!, then pop your cork first. No peeking early!',
    loop: pw19qdLoop,
    still: 3.55,
    draw(v, t) {
      const ctx = v.ctx;
      pw19qdScene(v, t);
      // paces apart (0.3-1.6 s), turn (1.6-1.8), wait, DRAW! at 3.0, Bo fires at 3.22, Pip at 3.42
      const k = v.ease.inOut(v.seg(t, 0.3, 1.6)), turned = t > 1.7;
      const xs = [148 - k * 82, 172 + k * 82];
      const hatT = t - 3.38;
      for (const id of [0, 1]) {
        const face = turned ? (id ? -1 : 1) : (id ? 1 : -1), walk = t > 0.3 && t < 1.6 ? v.hop(v.phase(t, 0.43), 3) : 0;
        const win = id === 1 && t > 3.45, lose = id === 0 && t > 3.38;
        v.hero(id, xs[id], pw19qdGY + walk, { s: 1.15, face, mood: win ? 'joy' : lose ? 'wow' : t > 1.8 && t < 3.0 ? 'grit' : 'happy' });
        if (!(lose && hatT > 0)) pw19qdHat(v, id, xs[id], pw19qdGY - 27.6 + walk, 1.05, 0);
        const fired = t > (id ? 3.22 : 3.42);
        if (fired) pw19qdGun(v, id, xs[id] + face * 12, pw19qdGY - 12, face, id === 1 && t < 3.6);
      }
      // the cork on its string from Bo's gun to Pip's hat
      if (t > 3.22 && t < 3.75) {
        const c = Math.min(1, (t - 3.22) / 0.16) * (t > 3.5 ? Math.max(0, 1 - (t - 3.5) / 0.25) : 1);
        const x0 = xs[1] - 30, y0 = pw19qdGY - 12, x1 = x0 + (xs[0] + 2 - x0) * c, y1 = y0 + (pw19qdGY - 30 - y0) * c;
        v.line(x0, y0, x1, y1, 'rgba(255,250,235,0.9)', 1);
        ctx.fillStyle = '#c9925a'; v.rr(x1 - 3, y1 - 2.5, 6, 5, 1.5); ctx.fill();
      }
      // Pip's popped hat tumbling off
      if (hatT > 0) {
        const fl = Math.min(hatT, 0.75), hx = xs[0] - fl * 60, hy = pw19qdGY - 28 - 140 * fl + 260 * fl * fl;
        pw19qdHat(v, 0, hx, Math.min(hy, pw19qdGY - 2), 1.05, -fl * 9);
        if (hatT < 0.5) for (let i = 0; i < 4; i++) v.star(xs[0] + Math.cos(i * 1.6) * 12 * (1 + hatT * 2), pw19qdGY - 30 + Math.sin(i * 1.6) * 8 * (1 + hatT * 2), 2.4);
      }
      // the Mayor's count, the crow's fakeout, the real DRAW!
      if (t > 0.3 && t < 1.65) v.bubble(String(1 + Math.min(2, Math.floor((t - 0.3) / 0.45))) + '...', 132, 64, { size: 9 });
      if (pw19qdCaw(t)) v.label('CAW!', 290, 44, 13, '#f6efdf');
      if (t > 2.05 && t < 2.6) v.bubble('Not yet...', xs[0], pw19qdGY - 38, { size: 8 });
      if (t > 3.0 && t < 3.7) {
        const p = v.ease.back(v.seg(t, 3.0, 3.15));
        ctx.save(); ctx.translate(160, 100); ctx.scale(p, p); v.label('DRAW!', 0, 0, 34, v.c.gold); ctx.restore();
      }
      if (t > 3.4 && t < 4.2) v.pill('231 ms', xs[1], pw19qdGY - 52, { size: 9, col: v.c.gold });
      if (t > 3.8) { v.label('Bo wins!', 160, 92, 22, v.c.bo); if (t < 5.4) v.confetti(xs[1], pw19qdGY - 40, v.phase(t, 1.6, -3.8)); }
    },
  });
  const pw19qdCaw = t => t > 1.95 && t < 2.55;
  // ----- END 19-4 Quick-Draw Showdown preview -----
  //
  //
  //
}
