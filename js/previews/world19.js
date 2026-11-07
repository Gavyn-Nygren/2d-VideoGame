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
  // where the handcar is along the track at time t (it rolls, brakes at the flag, waits, rolls on to the mail stop)
  const pw19handcarS = (v, t) => {
    if (t < 2.5) return t * 62;
    if (t < 3.2) return 155 + 22 * v.ease.out(v.seg(t, 2.5, 3.2));
    if (t < 4.3) return 177;
    return 177 + 92 * v.ease.inOut(v.seg(t, 4.3, 5.3));
  };
  const pw19handcarCar = (v, x, y, a, pumping, t) => {
    const ctx = v.ctx;
    // wheels and deck
    for (const wx of [x - 19, x + 19]) { v.fillCircle(wx, y - 6, 6.5, '#4a3d5c'); v.fillCircle(wx, y - 6, 2.4, '#c9c2dc'); }
    ctx.fillStyle = '#8a5a34'; v.rr(x - 32, y - 16, 64, 7, 2); ctx.fill();
    ctx.fillStyle = '#6b4226'; ctx.fillRect(x - 32, y - 11, 64, 2);
    // the A-frame post and the seesaw handle
    ctx.fillStyle = '#6b4226'; ctx.beginPath(); ctx.moveTo(x - 7, y - 16); ctx.lineTo(x + 7, y - 16); ctx.lineTo(x + 1.5, y - 40); ctx.lineTo(x - 1.5, y - 40); ctx.closePath(); ctx.fill();
    const hx = Math.cos(a) * 28, hy = Math.sin(a) * 28;
    v.line(x - hx, y - 40 - hy, x + hx, y - 40 + hy, '#7a5032', 3.5);
    v.fillCircle(x, y - 40, 2.6, '#d9d3ef');
    // Pip at the back end, Bo at the front: the one pushing their end down squashes a little
    const dn = Math.sin(a), mood = t > 5.2 ? 'joy' : t > 2.5 && t < 4.3 ? 'grit' : 'happy';
    v.hero(0, x - 21, y - 16, { s: 0.62, face: 1, sq: pumping ? Math.max(0, -dn) * 0.5 : 0, shadow: false, mood });
    v.hero(1, x + 21, y - 16, { s: 0.62, face: -1, sq: pumping ? Math.max(0, dn) * 0.5 : 0, shadow: false, mood });
    // their arms up to the handle grips
    v.line(x - 21, y - 26, x - hx * 0.95, y - 40 - hy * 0.95, v.c.pipDark, 2);
    v.line(x + 21, y - 26, x + hx * 0.95, y - 40 + hy * 0.95, v.c.boDark, 2);
  };
  definePreview('Handcar Hustle', {
    blurb: 'Take turns on the seesaw pump, brake for the flag, deliver the mail!',
    loop: 6,
    still: 1.1,
    draw(v, t) {
      const ctx = v.ctx, s = pw19handcarS(v, t), rail = 142, carX = 110;
      // sky, sun, far mesas
      v.sky(); v.sun(262, 40, 15);
      ctx.fillStyle = '#d98a58';
      for (let k = -1; k < 4; k++) {
        const mx = k * 150 - (s * 0.2) % 150 + 20;
        ctx.beginPath(); ctx.moveTo(mx, rail - 10); ctx.lineTo(mx + 14, rail - 52); ctx.lineTo(mx + 80, rail - 52); ctx.lineTo(mx + 94, rail - 10); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#efc58a'; ctx.fillRect(0, rail - 14, v.W, 20);
      // a cactus or two going by
      for (let k = 0; k < 4; k++) {
        const cx = ((k * 130 + 60 - s * 0.7) % 520 + 520) % 520 - 60;
        ctx.fillStyle = '#4f9a5a'; v.rr(cx - 3, rail - 36, 6, 26, 3); ctx.fill(); v.rr(cx - 10, rail - 28, 5, 10, 2.5); ctx.fill(); v.rr(cx + 5, rail - 32, 5, 10, 2.5); ctx.fill();
      }
      // the ground, ties and rails (with the broken bit until the crew lays the plank)
      ctx.fillStyle = '#c96f45'; ctx.fillRect(0, rail, v.W, v.H - rail);
      ctx.fillStyle = '#b25f3a'; for (let k = 0; k < 9; k++) ctx.fillRect(((k * 47 - s) % 330 + 330) % 330 - 10, rail + 18 + (k % 3) * 9, 6, 3);
      const gapX = 368 - s, fixK = v.seg(t, 3.4, 4.0);
      ctx.fillStyle = '#6b4a36';
      for (let k = -1; k < 24; k++) { const tx = k * 16 - (s % 16); if (tx > gapX && tx < gapX + 26 && fixK < 1) continue; ctx.fillRect(tx, rail + 1, 9, 5); }
      ctx.fillStyle = '#8e8aa6';
      if (gapX > 0) ctx.fillRect(0, rail - 2, gapX, 3);
      ctx.fillRect(Math.max(0, gapX + 26), rail - 2, v.W, 3);
      // the crew's new plank drops in
      if (t > 3.4) {
        const py = v.lerp(rail - 34, rail - 2, v.ease.in(fixK));
        ctx.fillStyle = '#c99a5c'; ctx.fillRect(gapX - 2, py, 30, 4);
        if (fixK >= 1 && t < 4.5) v.sparkle(gapX + 13, rail - 8, v.seg(t, 4.0, 4.5));
      }
      // the flagman: red flag (stop) until the track is fixed, then green
      const fx = 352 - s, flagOk = t > 4.05;
      ctx.save(); ctx.globalAlpha = 1 - v.seg(t, 4.5, 4.9); // he steps off the track once the handcar rolls by
      ctx.fillStyle = '#3c4a7a'; ctx.fillRect(fx - 4, rail - 18, 3, 12); ctx.fillRect(fx + 1, rail - 18, 3, 12);
      ctx.fillStyle = '#c0453a'; v.rr(fx - 6, rail - 34, 12, 17, 4); ctx.fill();
      v.fillCircle(fx, rail - 39, 5.5, '#f0c49a');
      ctx.fillStyle = '#6b4226'; ctx.fillRect(fx - 9, rail - 45, 18, 2.5); v.rr(fx - 5, rail - 51, 10, 7, 2); ctx.fill();
      const wave = flagOk ? Math.sin(t * 10) * 0.4 : Math.sin(t * 6) * 0.15;
      ctx.save(); ctx.translate(fx - 5, rail - 30); ctx.rotate(-0.6 + wave);
      ctx.fillStyle = '#7a5032'; ctx.fillRect(-1, -22, 2, 22);
      ctx.fillStyle = flagOk ? '#4fbf6a' : '#e04a3a'; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(-13, -18); ctx.lineTo(0, -13); ctx.closePath(); ctx.fill();
      ctx.restore(); ctx.restore();
      // the mail stop: a post with a mail sack waiting
      const mx = 452 - s;
      ctx.fillStyle = '#7a5032'; ctx.fillRect(mx - 2, rail - 46, 4, 44);
      ctx.fillStyle = '#f6e7c4'; v.rr(mx - 18, rail - 56, 36, 13, 3); ctx.fill();
      v.text('MAIL', mx, rail - 49, 9, '#6b4226');
      const sackGot = t > 5.25, sk = v.seg(t, 5.25, 5.7);
      const sx = sackGot ? v.lerp(mx + 12, carX + 3, sk) : mx + 12, sy = sackGot ? rail - 2 + v.hop(sk, 26) - 16 * sk : rail - 2;
      ctx.fillStyle = '#c9a26a'; v.rr(sx - 6, sy - 12, 12, 12, 4); ctx.fill(); v.text('M', sx, sy - 5.5, 7, '#6b4226');
      // the handcar: a seesaw beat while pumping, still while braking or waiting
      const pumping = t < 2.4 || (t > 4.3 && t < 5.0);
      const a = pumping ? Math.sin(t * Math.PI * 2 / 0.7) * 0.32 : 0.06;
      pw19handcarCar(v, carX, rail - 1, a, pumping, t);
      // brake sparks, and who pumps next
      if (t > 2.5 && t < 3.2) {
        for (let k = 0; k < 5; k++) { const kk = v.phase(t * 3 + k * 0.2, 1); v.line(carX + 22 - kk * 22, rail - 3, carX + 22 - kk * 30, rail - 6 - kk * 10 * v.rand(k + 1), '#ffd34d', 1.6); }
        v.pill('Brake!', carX, 34, { size: 12, bg: 'rgba(28,26,54,0.85)', col: '#ffcf3a' });
      } else if (t < 2.4) {
        const bo = Math.sin(t * Math.PI * 2 / 0.7) > 0;
        v.pill(bo ? 'Bo!' : 'Pip!', carX + (bo ? 24 : -24), 42, { size: 11, col: bo ? '#9fd0ff' : '#ffb58a' });
      } else if (t > 3.3 && t < 4.3) v.pill('Fixing the track...', 222, 34, { size: 10 });
      // the payoff: the mail is aboard
      if (t > 5.3) { v.confetti(carX, 60, v.seg(t, 5.3, 6)); v.label('Got the mail!', 160, 30, 18, '#ffcf3a'); }
    },
  });
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
