/* Pip & Bo - Level previews for World 15 Orbit Outpost (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw15. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 15-1 Tethered Spacewalk preview -----
  // Pip holds a handle and swings Bo round past the rocks to a broken panel; Bo bolts it, grabs on, and they swap.
  const pw15swA = { x: 44, y: 96 }, pw15swB = { x: 150, y: 86 }, pw15swC = { x: 264, y: 90 }, pw15swP = { x: 150, y: 56 };
  const pw15swHandle = (v, x, y, face) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(face > 0 ? Math.PI / 2 : face < 0 ? -Math.PI / 2 : 0);
    ctx.lineCap = 'round';
    for (const [col, lw] of [['#7a5a10', 5], ['#ffc94a', 3]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(-6, -4); ctx.lineTo(6, -4); ctx.lineTo(6, 4); ctx.stroke();
    }
    ctx.restore();
  };
  const pw15swMast = (v, x, y0, y1) => { v.line(x, y0, x, y1, '#4a5374', 4); v.line(x, y0, x, y1, '#9aa6c4', 1.6); };
  const pw15swRock = (v, x, y, r, t) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.4);
    ctx.fillStyle = '#7d7890'; ctx.beginPath();
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, rr = r * (0.84 + v.rand(k + r * 7) * 0.3); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
    v.fillCircle(-r * 0.3, -r * 0.2, r * 0.22, '#5f5a72'); v.fillCircle(r * 0.3, r * 0.25, r * 0.16, '#5f5a72');
    ctx.restore();
  };
  const pw15swPanel = (v, x, y, fixed, glow) => {
    const ctx = v.ctx;
    if (glow > 0) { ctx.save(); ctx.globalAlpha *= glow * 0.5; v.fillCircle(x, y, 30, '#9fe8ff'); ctx.restore(); }
    ctx.fillStyle = '#c9a54a'; v.rr(x - 19, y - 12, 38, 24, 3); ctx.fill();
    ctx.fillStyle = fixed ? '#3d8de0' : '#2a3358'; ctx.fillRect(x - 16, y - 9, 32, 18);
    ctx.strokeStyle = fixed ? 'rgba(255,255,255,0.5)' : 'rgba(150,170,220,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (const gx of [-8, 0, 8]) { ctx.moveTo(x + gx, y - 9); ctx.lineTo(x + gx, y + 9); }
    ctx.moveTo(x - 16, y); ctx.lineTo(x + 16, y); ctx.stroke();
    if (fixed) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y + 0.5, 4.5, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
      v.fillCircle(x - 3, y - 3, 1.2, '#fff'); v.fillCircle(x + 3, y - 3, 1.2, '#fff');
    } else {
      ctx.strokeStyle = '#e8eefc'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x - 10, y - 8); ctx.lineTo(x - 3, y - 1); ctx.lineTo(x - 7, y + 4); ctx.moveTo(x - 3, y - 1); ctx.lineTo(x + 6, y + 2); ctx.stroke();
    }
  };
  // a floating hero in a fishbowl helmet, centred at (x, y)
  const pw15swFloater = (v, id, x, y, rot, mood) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = '#c3cbe2'; v.rr(-14, -8, 6, 16, 2); ctx.fill(); ctx.restore();
    v.hero(id, x, y + 11, { s: 0.85, rot, mood, shadow: false });
    ctx.fillStyle = 'rgba(200,230,255,0.16)'; v.circle(x, y - 1, 15); ctx.fill();
    ctx.strokeStyle = 'rgba(230,245,255,0.8)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y - 1, 11.5, -2.6, -1.9); ctx.stroke();
  };
  const pw15swTether = (v, x1, y1, x2, y2, slack) => {
    const ctx = v.ctx, mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + slack * 18;
    ctx.lineCap = 'round'; ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke();
    ctx.strokeStyle = '#ff7a6b'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke();
    ctx.setLineDash([]);
  };
  // a curved spin arrow round (x, y), from angle a0 to a1
  const pw15swSpin = (v, x, y, r, a0, a1, alpha) => {
    if (alpha <= 0) return;
    const ctx = v.ctx, d = a1 > a0 ? 1 : -1, ex = x + Math.cos(a1) * r, ey = y + Math.sin(a1) * r, tx = -Math.sin(a1) * d, ty = Math.cos(a1) * d;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y, r, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke();
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(ex + tx * 5, ey + ty * 5);
    ctx.lineTo(ex - tx * 2 + ty * 4, ey - ty * 2 - tx * 4); ctx.lineTo(ex - tx * 2 - ty * 4, ey - ty * 2 + tx * 4); ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  const pw15swAt = (c, r, a) => ({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
  definePreview('Tethered Spacewalk', {
    blurb: 'Tied together in space: one holds on and spins the other to fix the solar panels.',
    loop: 6,
    still: 2.6,
    draw(v, t) {
      const ctx = v.ctx, A = pw15swA, B = pw15swB, C = pw15swC, P = pw15swP;
      v.sky();
      for (let k = 0; k < 40; k++) {
        ctx.globalAlpha = 0.35 + 0.5 * v.pingpong(v.phase(t + v.rand(k) * 3, 3));
        v.fillCircle(v.rand(k * 3 + 1) * v.W, v.rand(k * 5 + 2) * v.H, 0.6 + v.rand(k * 7) * 0.9, '#fff');
      }
      ctx.globalAlpha = 1;
      // a little ringed planet
      v.fillCircle(300, 28, 13, '#b98ae6');
      ctx.strokeStyle = 'rgba(255,214,160,0.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(300, 28, 22, 5, -0.35, 0, Math.PI * 2); ctx.stroke();
      // the station: a module on the left, a truss below, struts up to the handles and the panel
      ctx.fillStyle = '#5c6688'; ctx.fillRect(0, 164, v.W, 16);
      ctx.strokeStyle = '#9aa6c4'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let x = 0; x < v.W; x += 16) { ctx.moveTo(x, 178); ctx.lineTo(x + 8, 166); ctx.lineTo(x + 16, 178); }
      ctx.stroke();
      ctx.fillStyle = '#e9eef8'; v.rr(-12, 30, 40, 134, 8); ctx.fill();
      ctx.fillStyle = '#4b8ff0'; ctx.fillRect(-12, 50, 40, 3); ctx.fillRect(-12, 120, 40, 3);
      v.fillCircle(12, 142, 6, '#2b3463');
      pw15swMast(v, P.x, P.y + 12, 164); pw15swMast(v, C.x, C.y + 4, 164);
      const rk = Math.sin(t * Math.PI * 2 / 6);
      pw15swRock(v, 96, 34 + rk * 3, 13, t); pw15swRock(v, 236, 38 - rk * 3, 11, -t);
      // the story: Pip swings Bo, Bo bolts the panel, they swap, Bo swings Pip
      const k1 = v.ease.inOut(v.seg(t, 0.4, 2.0)), bolt = v.seg(t, 2.0, 2.9), fixed = t >= 2.9, k2 = v.ease.inOut(v.seg(t, 3.25, 4.9));
      pw15swPanel(v, P.x, P.y, fixed, fixed ? 1 - v.seg(t, 2.9, 4) * 0.6 : 0);
      pw15swHandle(v, A.x - 10, A.y, 1); pw15swHandle(v, B.x + 6, B.y, 0); pw15swHandle(v, C.x, C.y, 0);
      const a1s = Math.atan2(140 - A.y, 72 - A.x), a1e = Math.atan2(P.y + 16 - A.y, P.x - A.x);
      const r1s = Math.hypot(72 - A.x, 140 - A.y), r1e = Math.hypot(P.x - A.x, P.y + 16 - A.y);
      const a2s = Math.atan2(A.y - B.y, A.x - B.x), a2e = Math.atan2(C.y + 14 - B.y, C.x - B.x);
      let pip, bo, anchor;
      if (t < 3.25) {
        pip = { x: A.x, y: A.y, rot: 0 };
        const p = t < 2.0 ? pw15swAt(A, v.lerp(r1s, r1e, k1), v.lerp(a1s, a1e, k1)) : { x: P.x, y: P.y + 16 };
        const toB = v.ease.inOut(v.seg(t, 2.95, 3.2));
        bo = { x: v.lerp(p.x, B.x + 12, toB), y: v.lerp(p.y, B.y + 2, toB), rot: t < 2.0 ? v.lerp(a1s, a1e, k1) - Math.PI / 2 : 0 };
        anchor = 0;
        pw15swSpin(v, A.x, A.y, 26, a1s, a1e, v.seg(t, 0.4, 0.6) * (1 - v.seg(t, 1.8, 2.0)));
      } else {
        bo = { x: B.x + 12, y: B.y + 2, rot: 0 };
        // the long way round underneath, pulled in a little at the bottom
        const a = v.lerp(a2s, a2e, k2), r = v.lerp(Math.hypot(A.x - B.x, A.y - B.y), Math.hypot(C.x - B.x, C.y + 14 - B.y), k2) - Math.sin(k2 * Math.PI) * 34;
        const p = t < 4.9 ? pw15swAt(B, r, a) : { x: C.x, y: C.y + 14 };
        pip = { x: p.x, y: p.y, rot: t < 4.9 ? a - Math.PI / 2 : 0 };
        anchor = 1;
        pw15swSpin(v, B.x, B.y, 24, a2s, a2e, v.seg(t, 3.25, 3.45) * (1 - v.seg(t, 4.6, 4.9)));
      }
      const slack = t < 0.5 ? 1 - v.seg(t, 0.2, 0.5) : t > 3.15 && t < 3.45 ? 0.6 : 0;
      pw15swTether(v, pip.x, pip.y, bo.x, bo.y, slack);
      const end = t > 4.9;
      pw15swFloater(v, 0, pip.x, pip.y, pip.rot * 0.5, end ? 'joy' : anchor === 0 ? 'grit' : 'wow');
      pw15swFloater(v, 1, bo.x, bo.y, bo.rot * 0.5, end || (fixed && t < 3.25) ? 'joy' : anchor === 1 ? 'grit' : 'wow');
      // bolting: a ring fills round the panel, then it sparkles
      if (bolt > 0 && !fixed) {
        ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(P.x, P.y, 24, -Math.PI / 2, -Math.PI / 2 + bolt * Math.PI * 2); ctx.stroke();
        v.sparkle(P.x - 12 + bolt * 24, P.y + 10, v.phase(t, 0.3), '#fff', 4);
      }
      if (fixed) {
        for (let q = 0; q < 4; q++) v.sparkle(P.x + Math.cos(q * 1.6) * 26, P.y + Math.sin(q * 1.6) * 18, v.seg(t, 2.9 + q * 0.08, 3.6 + q * 0.08), '#fff', 6);
        if (t < 3.7) v.bubble('Fixed!', P.x + 30, P.y - 12);
      }
      if (t > 3.05 && t < 3.6) v.pill('Swap!', v.W / 2, 150, { size: 11, bg: '#ffc94a', col: '#2b2155' });
      if (end) { v.star(pip.x + 18, pip.y - 20, 6 * v.seg(t, 4.9, 5.1)); v.confetti(C.x - 30, C.y, v.seg(t, 4.95, 6)); }
      // a soft fade before it starts again
      const fade = Math.min(1, v.seg(t, 5.7, 6) + (1 - v.seg(t, 0, 0.2)));
      if (fade > 0) { ctx.fillStyle = 'rgba(13,16,51,' + (fade * 0.8).toFixed(3) + ')'; ctx.fillRect(0, 0, v.W, v.H); }
    },
  });
  // ----- END 15-1 Tethered Spacewalk preview -----
  //
  // ----- BEGIN 15-2 Gravity Flip Station preview -----
  // ----- END 15-2 Gravity Flip Station preview -----
  //
  // ----- BEGIN 15-3 Moon Buggy Crew preview -----
  // ----- END 15-3 Moon Buggy Crew preview -----
  //
  // ----- BEGIN 15-4 Planet Hop Race preview -----
  // ----- END 15-4 Planet Hop Race preview -----
}
