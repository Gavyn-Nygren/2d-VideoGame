/* Pip & Bo - Level previews for World 19 Tumbleweed Gulch (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw19. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 19-1 Train Heist Hop preview -----
  // Bo jumps the wide gap first, Pip tosses the gold sack over, Bo catches it, Pip hops across and they cheer.
  const pw19heistRoof = 112;
  const pw19heistSack = (v, x, y, rot, s) => {
    const c = v.ctx;
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(s || 1, s || 1);
    c.fillStyle = '#c9a36a'; c.beginPath(); c.moveTo(-5, -7); c.quadraticCurveTo(-11, 2, -9, 8); c.quadraticCurveTo(0, 11, 9, 8); c.quadraticCurveTo(11, 2, 5, -7); c.closePath(); c.fill();
    c.strokeStyle = '#8a6a3a'; c.lineWidth = 1.4; c.stroke();
    c.fillStyle = '#ffd34a'; v.circle(-3, -9, 3); c.fill(); v.circle(3, -10, 2.6); c.fill();
    c.strokeStyle = '#7a5228'; c.lineWidth = 2; c.beginPath(); c.moveTo(-6, -6); c.lineTo(6, -6); c.stroke();
    v.star(0, 2, 3.4, '#b9850f');
    c.restore();
  };
  const pw19heistBack = (v, t) => {
    const c = v.ctx;
    const g = c.createLinearGradient(0, 0, 0, 180);
    g.addColorStop(0, '#f6b86a'); g.addColorStop(0.55, '#fbd99a'); g.addColorStop(1, '#f2c48a');
    c.fillStyle = g; c.fillRect(0, 0, 320, 180);
    v.fillCircle(250, 52, 30, 'rgba(255,240,190,0.55)'); v.fillCircle(250, 52, 18, '#fff1b8');
    // far mesas: repeat every 160 px, slide 160 px per 6 s loop
    const off = (t / 6) * 160;
    c.fillStyle = '#d98a5a';
    for (let k = -1; k < 3; k++) {
      const x = k * 160 - off;
      c.beginPath(); c.moveTo(x + 10, 120); c.lineTo(x + 24, 78); c.lineTo(x + 70, 78); c.lineTo(x + 82, 120); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(x + 100, 120); c.lineTo(x + 108, 96); c.lineTo(x + 130, 96); c.lineTo(x + 140, 120); c.closePath(); c.fill();
    }
    c.fillStyle = '#e8b27a'; c.fillRect(0, 118, 320, 62);
    // telegraph poles every 80 px, 480 px per loop
    const po = (t * 80) % 80;
    for (let x = -po; x < 340; x += 80) { v.line(x, 132, x, 92, '#7a5034', 2.4); v.line(x - 7, 96, x + 7, 96, '#7a5034', 2); }
    c.strokeStyle = 'rgba(90,60,40,0.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, 97); c.lineTo(320, 97); c.stroke();
    // track
    c.fillStyle = '#9a6e4a'; c.fillRect(0, 160, 320, 4);
    c.fillStyle = '#6b4a30';
    const so = (t * 120) % 16;
    for (let x = -so; x < 330; x += 16) c.fillRect(x, 164, 9, 4);
    c.fillStyle = '#d9a46e'; c.fillRect(0, 168, 320, 12);
  };
  const pw19heistCar = (v, x0, x1, col, label, t) => {
    const c = v.ctx, R = pw19heistRoof;
    c.fillStyle = col; v.rr(x0, R, x1 - x0, 38, 3); c.fill();
    c.fillStyle = '#5a3420'; c.fillRect(x0 - 2, R - 3, x1 - x0 + 4, 5);
    c.fillStyle = 'rgba(0,0,0,0.14)'; c.fillRect(x0, R + 30, x1 - x0, 8);
    c.fillStyle = '#ffe6a8';
    for (let wx = x0 + 12; wx < x1 - 18; wx += 26) { v.rr(wx, R + 9, 14, 11, 2); c.fill(); }
    if (label) v.text(label, (x0 + x1) / 2, R + 32, 6, '#fff1c4', 'center');
    for (const wx of [x0 + 18, x0 + 36, x1 - 36, x1 - 18]) {
      v.fillCircle(wx, 156, 7, '#3a2a22'); v.fillCircle(wx, 156, 2.4, '#c9a36a');
      const a = t * Math.PI * 2;
      v.line(wx + Math.cos(a) * 6, 156 + Math.sin(a) * 6, wx - Math.cos(a) * 6, 156 - Math.sin(a) * 6, '#c9a36a', 1.4);
    }
  };
  definePreview('Train Heist Hop', {
    blurb: 'Jump the train gaps and toss the gold sack to your partner!',
    loop: 6,
    still: 3.3,
    draw(v, t) {
      const R = pw19heistRoof, e = v.ease;
      pw19heistBack(v, t);
      // couplers, then the two cars with a wide gap 150..196
      v.line(150, 146, 196, 146, '#3a2a22', 3);
      pw19heistCar(v, -20, 150, '#b8462e', 'GULCH LINE', t);
      pw19heistCar(v, 196, 340, '#3f6fa8', 'EXPRESS', t);
      // Bo: run to the edge, leap the gap, turn and wait; then cheer
      const kb1 = v.seg(t, 0.2, 1.0), kb2 = v.seg(t, 1.0, 1.65);
      let bx = v.lerp(70, 138, e.inOut(kb1)), by = R, bf = 1, bmood = 'happy', bsq = 0;
      if (t >= 1.0) { bx = v.lerp(138, 226, kb2); by = R + v.hop(kb2, 34); }
      if (t >= 1.65) { bf = -1; bsq = t < 1.8 ? 0.25 : 0; }
      const kt = v.seg(t, 2.5, 3.25);
      if (t >= 2.6 && t < 3.25) bmood = 'wow';
      if (t >= 3.25) { bmood = 'joy'; bsq = t < 3.4 ? 0.2 : 0; }
      // Pip: walks to the edge with the sack, winds up, tosses; then hops across (no sack: full jump)
      const kp1 = v.seg(t, 1.2, 2.1), kp2 = v.seg(t, 3.5, 4.1);
      let px = v.lerp(40, 128, e.inOut(kp1)), py = R, psq = 0, pmood = 'happy';
      if (t >= 2.1 && t < 2.5) { psq = 0.3 * v.seg(t, 2.1, 2.45); pmood = 'grit'; }
      if (t >= 3.5) { px = v.lerp(128, 200, kp2); py = R + v.hop(kp2, 40); pmood = 'joy'; }
      const cheer = v.seg(t, 4.2, 6);
      if (t >= 4.2) { py = R + v.hop(v.phase(t, 0.6), 7); by = R + v.hop(v.phase(t, 0.6, 0.3), 7); }
      v.shadow(px, R, 18); v.shadow(bx, R, 18);
      v.hero(1, bx, by, { face: bf, sq: bsq, mood: bmood });
      v.hero(0, px, py, { face: 1, sq: psq, mood: pmood });
      // the sack: on Pip's back, in the air, then held up by Bo
      if (t < 2.5) pw19heistSack(v, px - 13, py - 15, -0.3, 1);
      else if (t < 3.25) {
        const arc = k => R - 26 - 70 * 4 * k * (1 - k) + k * 6;
        // dotted aim arc fades as it flies
        v.ctx.globalAlpha = 0.5 * (1 - kt);
        for (let k = 0.1; k < 1; k += 0.1) v.fillCircle(v.lerp(136, 222, k), arc(k), 1.5, '#fff6d8');
        v.ctx.globalAlpha = 1;
        pw19heistSack(v, v.lerp(136, 222, kt), arc(kt), kt * 9, 1.1);
      } else pw19heistSack(v, bx, by - 40 + (t < 3.4 ? 3 : 0), 0, 1.1);
      if (t >= 3.25 && t < 4.2) { v.sparkle(bx, by - 42, v.seg(t, 3.25, 3.9)); v.label('Nice catch!', bx, by - 58, 11, '#ffd34a'); }
      if (t >= 0.25 && t < 1.0) v.bubble('Jump first!', 112, 74);
      if (t >= 1.8 && t < 2.45) v.bubble('Toss it!', 222, 72);
      if (t >= 4.2) {
        v.confetti(213, 70, cheer);
        v.pill('All aboard the gold!', 160, 34, { size: 12, align: 'center' });
      }
    },
  });
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
  // (preview goes here)
  // ----- END 19-4 Quick-Draw Showdown preview -----
  //
  //
  //
}
