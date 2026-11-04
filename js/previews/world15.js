/* Pip & Bo - Level previews for World 15 Orbit Outpost (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw15. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 15-1 Tethered Spacewalk preview -----
  // ----- END 15-1 Tethered Spacewalk preview -----
  //
  // ----- BEGIN 15-2 Gravity Flip Station preview -----
  // ----- END 15-2 Gravity Flip Station preview -----
  //
  // ----- BEGIN 15-3 Moon Buggy Crew preview -----
  // ----- END 15-3 Moon Buggy Crew preview -----
  //
  // ----- BEGIN 15-4 Planet Hop Race preview -----
  // Pip and Bo race across three little planets: run round, hop over, Pip's jet puff wins it, the rocket takes off
  const pw15HopPlanets = [{ x: 58, y: 132, r: 30, col: '#7fd0ff', dk: '#4a8fc4' }, { x: 160, y: 98, r: 24, col: '#ff9ccf', dk: '#c9659c' },
    { x: 266, y: 128, r: 30, col: '#ffd36b', dk: '#c99a32' }];
  function pw15HopSky(v, t) {
    const ctx = v.ctx, g = ctx.createLinearGradient(0, 0, 0, v.H);
    g.addColorStop(0, '#1b1640'); g.addColorStop(1, '#3b2a6e'); ctx.fillStyle = g; ctx.fillRect(0, 0, v.W, v.H);
    for (let k = 0; k < 40; k++) {
      const tw = 0.5 + 0.5 * Math.sin(t * 3 + k * 1.7);
      ctx.globalAlpha = 0.35 + 0.5 * tw; v.fillCircle(v.rand(k) * v.W, v.rand(k + 50) * v.H, 0.6 + v.rand(k + 99) * 1.1, '#fff');
    }
    ctx.globalAlpha = 1;
  }
  function pw15HopPlanet(v, q) {
    const ctx = v.ctx;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); v.circle(q.x, q.y, q.r + 22); ctx.stroke(); ctx.setLineDash([]);
    const g = ctx.createRadialGradient(q.x - q.r * 0.35, q.y - q.r * 0.4, 2, q.x, q.y, q.r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, q.col); g.addColorStop(1, q.dk);
    ctx.fillStyle = g; v.circle(q.x, q.y, q.r); ctx.fill();
    ctx.fillStyle = 'rgba(40,30,80,0.2)'; v.circle(q.x + q.r * 0.3, q.y + q.r * 0.25, q.r * 0.16); ctx.fill(); v.circle(q.x - q.r * 0.4, q.y + q.r * 0.35, q.r * 0.1); ctx.fill();
    // a sleepy smile
    ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(q.x + s * q.r * 0.25, q.y - q.r * 0.05, 2, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(q.x, q.y + q.r * 0.12, 3.2, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }
  // a hero with feet at (x, y), tipped by rot (feet toward the planet)
  function pw15HopHero(v, id, x, y, rot, o) {
    const ctx = v.ctx; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); v.hero(id, 0, 0, Object.assign({ s: 0.62, shadow: false }, o)); ctx.restore();
  }
  // where a runner is at time k (seconds into the loop): legs of running round a planet and jumping to the next
  function pw15HopWhere(id, t) {
    const P = pw15HopPlanets, d = id ? 0.16 : 0; // Bo a little behind
    const legs = [
      { run: 0, a0: -2.4, a1: -0.7, t0: 0, t1: 0.75 + d },
      { hop: 0, from: -0.7, to: 1, la: -2.3, t0: 0.75 + d, t1: 1.45 + d },
      { run: 1, a0: -2.3, a1: -0.6, t0: 1.45 + d, t1: 2.1 + d },
      { hop: 1, from: -0.6, to: 2, la: -2.4, t0: 2.1 + d, t1: id ? 3.15 : 2.75, puff: !id },
      { run: 2, a0: -2.4, a1: id ? -2.0 : -1.62, t0: id ? 3.15 : 2.75, t1: id ? 3.6 : 3.1 },
    ];
    for (const L of legs) {
      if (t > L.t1 && L !== legs[legs.length - 1]) continue;
      const k = Math.max(0, Math.min(1, (t - L.t0) / (L.t1 - L.t0)));
      if (L.run != null) {
        const q = P[L.run], a = L.a0 + (L.a1 - L.a0) * k;
        return { x: q.x + Math.cos(a) * q.r, y: q.y + Math.sin(a) * q.r, rot: a + Math.PI / 2, air: false, k };
      }
      const q = P[L.hop], n = P[L.to], sx = q.x + Math.cos(L.from) * q.r, sy = q.y + Math.sin(L.from) * q.r;
      const ex = n.x + Math.cos(L.la) * n.r, ey = n.y + Math.sin(L.la) * n.r, cx = (sx + ex) / 2, cy = Math.min(sy, ey) - 42;
      const u = 1 - k, x = u * u * sx + 2 * u * k * cx + k * k * ex, y = u * u * sy + 2 * u * k * cy + k * k * ey;
      return { x, y, rot: (L.from + Math.PI / 2) * u + (L.la + Math.PI / 2) * k, air: true, k, puff: L.puff && k > 0.35 && k < 0.7, vx: ex - sx };
    }
  }
  function pw15HopRocket(v, x, y, lift, who) {
    const ctx = v.ctx; ctx.save(); ctx.translate(x, y - lift);
    if (lift > 0) { ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(-5, 0); ctx.quadraticCurveTo(0, 14 + Math.sin(v.t * 40) * 3, 5, 0); ctx.fill(); }
    ctx.fillStyle = '#f7f4ff'; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.quadraticCurveTo(-9, -20, 0, -36); ctx.quadraticCurveTo(9, -20, 7, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff5f6d'; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-12, 4); ctx.lineTo(-8, -10); ctx.fill(); ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(12, 4); ctx.lineTo(8, -10); ctx.fill();
    v.fillCircle(0, -19, 5, '#8fdcff'); if (who != null) v.fillCircle(0, -18.5, 3.4, who ? v.c.bo : v.c.pip);
    ctx.restore();
  }
  definePreview('Planet Hop Race', {
    blurb: 'Run round tiny planets and hop to the next. First to the rocket wins!',
    loop: 5, still: 2.45,
    draw(v, t) {
      const ctx = v.ctx, P = pw15HopPlanets, rk = { x: P[2].x, y: P[2].y - P[2].r };
      pw15HopSky(v, t);
      P.forEach(q => pw15HopPlanet(v, q));
      const lift = t > 3.75 ? Math.pow(t - 3.75, 2) * 70 : 0, inside = t > 3.6;
      pw15HopRocket(v, rk.x, rk.y, lift, inside ? 0 : null);
      for (const id of [1, 0]) {
        if (id === 0 && inside) continue;
        const w = pw15HopWhere(id, t);
        if (w.puff) { const ang = w.rot + Math.PI / 2 + 0.6; for (let k = 0; k < 3; k++) v.fillCircle(w.x + Math.cos(ang) * (8 + k * 6), w.y + Math.sin(ang) * (8 + k * 6), 4 - k, k ? 'rgba(255,255,255,0.7)' : '#ffb347'); }
        const mood = t > 3.7 ? (id ? 'wow' : 'joy') : w.air ? 'wow' : 'grit';
        pw15HopHero(v, id, w.x, w.y, w.rot, { face: 1, mood, sq: w.air ? -0.15 : Math.sin(t * 22 + id) * 0.08 });
        if (w.puff && id === 0) v.pill('boost!', w.x, w.y - 30, { size: 9, col: v.c.gold });
      }
      if (t > 3.6) { v.confetti(rk.x, rk.y - 20, v.seg(t, 3.6, 4.9)); v.sparkle(rk.x - 20, rk.y - 40, v.seg(t, 3.7, 4.3), v.c.gold); }
      if (t > 3.8) v.label('Pip wins!', v.W / 2, 26, 18, v.c.pip);
    },
  });
  // ----- END 15-4 Planet Hop Race preview -----
}
