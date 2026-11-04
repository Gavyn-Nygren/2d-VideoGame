/* Pip & Bo - Level previews for World 14 Dino Valley (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw14. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 14-1 Egg Rescue preview -----
  // ----- END 14-1 Egg Rescue preview -----
  //
  // ----- BEGIN 14-2 Pterodactyl Express preview -----
  // ----- END 14-2 Pterodactyl Express preview -----
  //
  // ----- BEGIN 14-3 Tar Pit Pull preview -----
  // ----- END 14-3 Tar Pit Pull preview -----
  //
  // ----- BEGIN 14-4 Raptor Race preview -----
  // Zippy (Pip) hops a log, Noodle (Bo) grabs a speed egg and dashes ahead, then they're neck and neck again
  const pw14rCols = [
    { body: '#ffcf4a', dark: '#d98f1f', belly: '#fff2bf', feather: '#ff6b4a' },
    { body: '#b9a0ff', dark: '#7a5fd0', belly: '#f1e9ff', feather: '#5b95ff' },
  ];
  // a little raptor with its rider, feet at (x, y); run = the leg cycle, o: { duck, dash, s }
  const pw14rRaptor = (v, id, x, y, run, o = {}) => {
    const ctx = v.ctx, K = pw14rCols[id], s = o.s || 1, d = o.duck ? 1 : 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    v.shadow(0, 0, 40);
    if (o.dash) { ctx.fillStyle = 'rgba(255,197,61,0.3)'; ctx.beginPath(); ctx.ellipse(-2, -18, 34, 18, 0, 0, Math.PI * 2); ctx.fill(); for (let k = 0; k < 3; k++) v.line(-40 - k * 6, -24 + k * 8, -24 - k * 6, -24 + k * 8, 'rgba(255,255,255,0.85)', 2); }
    // legs (two, out of step)
    for (const k of [0, 1]) {
      const a = Math.sin(run + k * Math.PI), lx = 2 + a * 7, ly = Math.max(0, -Math.cos(run + k * Math.PI)) * 4;
      v.line(-2 + k * 3, -14, lx, -ly, k ? K.dark : K.body, 3.2);
      v.line(lx, -ly, lx + 4, -ly, K.dark, 2.4);
    }
    // tail with feathers, body, belly
    ctx.fillStyle = K.feather; ctx.beginPath(); ctx.moveTo(-14, -22 + d * 4); ctx.quadraticCurveTo(-34, -30 + d * 4 + Math.sin(run) * 2, -40, -24 + d * 4); ctx.quadraticCurveTo(-30, -18 + d * 4, -14, -16 + d * 3); ctx.fill();
    ctx.fillStyle = K.body; ctx.strokeStyle = K.dark; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(0, -20 + d * 4, 17, 9 - d * 1.5, -0.08, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = K.belly; ctx.beginPath(); ctx.ellipse(3, -16 + d * 4, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    // neck and head (lower and forward when ducking or dashing)
    const hx = 22 + (d || o.dash ? 4 : 0), hy = -36 + (d || o.dash ? 14 : 0);
    ctx.strokeStyle = K.body; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(10, -22 + d * 4); ctx.lineTo(hx - 4, hy + 3); ctx.stroke();
    ctx.fillStyle = K.body; ctx.strokeStyle = K.dark; ctx.lineWidth = 1.6; v.rr(hx - 8, hy - 6, 18, 11, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = K.feather; ctx.beginPath(); ctx.moveTo(hx - 7, hy - 4); ctx.lineTo(hx - 13, hy - 10); ctx.lineTo(hx - 3, hy - 6); ctx.fill();
    v.fillCircle(hx + 2, hy - 2, 2.6, '#fff'); v.fillCircle(hx + 3, hy - 1.6, 1.3, v.c.ink);
    v.line(hx + 4, hy + 2.5, hx + 9, hy + 1.5, v.c.ink, 1.2);
    ctx.restore();
    // the rider in a little safari hat
    const ry = y + (-27 + d * 4) * s;
    v.hero(id, x - 2 * s, ry, { s: 0.55 * s, face: 1, shadow: false, mood: o.mood });
    ctx.fillStyle = '#e8d6a8'; v.rr(x - 9 * s, ry - 16 * s, 14 * s, 4 * s, 2 * s); ctx.fill();
    ctx.fillStyle = '#d8c08a'; v.rr(x - 6 * s, ry - 20 * s, 8 * s, 5 * s, 3 * s); ctx.fill();
  };
  definePreview('Raptor Race', {
    blurb: 'Race feathered raptors through the jungle: hop logs, duck branches, grab a speed egg and dash!',
    loop: 4,
    still: 2.1,
    draw(v, t) {
      const ctx = v.ctx, gy = 150, sp = 120, scroll = t * sp;
      v.sky(); v.sun(v.W - 54, 34, 15);
      // a smoky volcano far away, then the jungle hills
      ctx.fillStyle = 'rgba(120,80,70,0.35)'; ctx.beginPath(); ctx.moveTo(40, 120); ctx.lineTo(78, 64); ctx.lineTo(96, 64); ctx.lineTo(140, 120); ctx.fill();
      for (let k = 0; k < 3; k++) { const q = v.phase(t, 4, k * 1.3); ctx.globalAlpha = 0.5 * (1 - q); v.fillCircle(87 + q * 10, 58 - q * 30, 5 + q * 6, '#fff'); } ctx.globalAlpha = 1;
      v.hills(126, scroll * 0.6);
      // palm trees scrolling by
      for (let k = 0; k < 4; k++) {
        const x = ((k * 110 - scroll * 0.8) % 440 + 440) % 440 - 40;
        v.line(x, gy, x + 4, gy - 52, '#8a5a32', 4);
        ctx.fillStyle = '#4fa65a'; for (let j = 0; j < 5; j++) { const a = -Math.PI / 2 + (j - 2) * 0.6; ctx.beginPath(); ctx.ellipse(x + 4 + Math.cos(a) * 12, gy - 54 + Math.sin(a) * 6 + 4, 13, 4, a, 0, Math.PI * 2); ctx.fill(); }
      }
      // the dirt trail
      ctx.fillStyle = '#b07a44'; ctx.fillRect(0, gy, v.W, v.H - gy);
      ctx.fillStyle = '#946233'; ctx.fillRect(0, gy + 14, v.W, 4);
      ctx.fillStyle = '#7ccf4f'; ctx.fillRect(0, gy - 3, v.W, 5);
      for (let k = 0; k < 9; k++) { const x = ((k * 44 - scroll) % 396 + 396) % 396 - 20; v.fillCircle(x, gy + 22, 2.5, 'rgba(255,240,210,0.35)'); }
      // one log: Noodle (Bo, in front) hops it, then Zippy (Pip); then a speed egg for Noodle, who dashes ahead
      const logX = 330 - t * sp, pipX = 100, boBase = 196;
      if (logX > -40) {
        ctx.fillStyle = '#8a5a32'; v.rr(logX - 14, gy - 16, 28, 16, 6); ctx.fill();
        ctx.fillStyle = '#c8955a'; ctx.beginPath(); ctx.ellipse(logX + 12, gy - 8, 4, 7.5, 0, 0, Math.PI * 2); ctx.fill();
        v.fillCircle(logX - 4, gy - 19, 3, '#ff6b6b'); ctx.fillStyle = '#fff'; ctx.fillRect(logX - 5, gy - 18, 2, 3);
      }
      const eggT = 2.0, eggX = boBase + 12 + (eggT - t) * sp;
      if (t < eggT && eggX < v.W + 20) {
        ctx.fillStyle = '#fff6dc'; ctx.strokeStyle = '#d9b46a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(eggX, gy - 9, 5.5, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        v.line(eggX - 4, gy - 9, eggX + 4, gy - 9, '#ff8a3d', 1.4);
        v.sparkle(eggX + 6, gy - 18, v.phase(t, 0.8));
      }
      const boHop = v.seg(t, 0.75, 1.33), pipHop = v.seg(t, 1.55, 2.13), up = k => k > 0 && k < 1;
      const dashOn = t > 2.05 && t < 2.9, boX = boBase + v.ease.out(v.seg(t, 2.05, 2.9)) * 44 - v.ease.inOut(v.seg(t, 2.9, 3.9)) * 44;
      pw14rRaptor(v, 1, boX, gy + 1 + v.hop(boHop, 30), t * (dashOn ? 26 : 16), { dash: dashOn, mood: dashOn ? 'joy' : up(boHop) ? 'wow' : 'happy' });
      pw14rRaptor(v, 0, pipX, gy + v.hop(pipHop, 30), t * 16, { mood: up(pipHop) ? 'wow' : 'happy' });
      // floating words
      const word = (str, x, y, a, b, col) => { const k = v.seg(t, a, b); if (k > 0 && k < 1) { ctx.globalAlpha = 1 - k * k; v.label(str, x, y - k * 10, 13, col); ctx.globalAlpha = 1; } };
      word('Hop!', boBase, gy - 80, 0.85, 1.5, '#d8ffb0');
      word('Hop!', pipX, gy - 80, 1.65, 2.3, '#d8ffb0');
      word('DASH!', boBase + 30, gy - 64, 2.0, 2.8, v.c.gold);
      // the course map pill
      v.pill('Pip  vs  Bo', v.W / 2, 14, { size: 10 });
    },
  });
  // ----- END 14-4 Raptor Race preview -----
}
