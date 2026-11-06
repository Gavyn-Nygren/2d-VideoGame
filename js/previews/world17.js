/* Pip & Bo - Level previews for World 17 Jungle Jamboree (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw17. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 17-1 Temple Doors preview -----
  // PLACEHOLDER
  // ----- END 17-1 Temple Doors preview -----
  //
  // ----- BEGIN 17-2 River Rapids Canoe preview -----
  // Top-down river: Pip paddles at the bow, Bo pokes a branch jam out of the way, they scoop up a mango,
  // Bo bails a splash out, and they drift into the party pool.
  const pw17rCX = 160, pw17rCY = 124;
  // how fast the river slides past at time t (the canoe stops at the jam and in the pool)
  const pw17rSpeed = t => (t < 1.7 ? 52 : t < 2.05 ? 52 * (1 - (t - 1.7) / 0.35) : t < 2.7 ? 0 : t < 3.0 ? 52 * (t - 2.7) / 0.3 : t < 4.7 ? 52 : t < 5.4 ? 52 * (1 - (t - 4.7) / 0.7) : 0);
  const pw17rScroll = t => { let s = 0; const n = Math.ceil(t * 16), h = t / Math.max(1, n); for (let k = 0; k < n; k++) s += pw17rSpeed((k + 0.5) * h) * h; return s; };
  const pw17rJamS = 60 - pw17rScroll(2.05), pw17rFruitS = 98 - pw17rScroll(3.9);
  const pw17rBankX = (v, y, S, side, pool) => {
    const u = y - S, wob = Math.sin(u / 23 + side * 1.7) * 6 + Math.sin(u / 9 + side) * 2;
    return pw17rCX + side * (74 + pool * 70) + wob;
  };
  const pw17rLeaf = (v, x, y, r, col) => { const ctx = v.ctx; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.62, 0.6, 0, Math.PI * 2); ctx.fill(); };
  const pw17rBranch = (v, x, y, rot) => {
    const ctx = v.ctx; ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = '#6b4424'; v.rr(-17, -3.5, 34, 7, 3.5); ctx.fill();
    ctx.fillStyle = '#8a5a30'; v.rr(-15, -2.5, 30, 2.5, 1.2); ctx.fill();
    ctx.strokeStyle = '#6b4424'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(12, -9); ctx.moveTo(-8, 2); ctx.lineTo(-13, 8); ctx.stroke();
    pw17rLeaf(v, 13, -10, 4.5, '#3e9a4a'); pw17rLeaf(v, -14, 9, 4, '#4fb35a');
    ctx.restore();
  };
  const pw17rMango = (v, x, y, bob) => {
    const ctx = v.ctx;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, y + 4, 10, 3.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.ellipse(x, y + bob, 6.5, 5.5, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff6f3c'; ctx.beginPath(); ctx.ellipse(x + 2, y + 1.5 + bob, 3.5, 3, 0.4, 0, Math.PI * 2); ctx.fill();
    pw17rLeaf(v, x - 3, y - 6 + bob, 3, '#3e9a4a');
  };
  const pw17rCanoe = (v, x, y, rock) => {
    const ctx = v.ctx; ctx.save(); ctx.translate(x, y); ctx.rotate(rock);
    ctx.fillStyle = 'rgba(20,60,90,0.25)'; ctx.beginPath(); ctx.ellipse(3, 5, 16, 46, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a4f22'; ctx.beginPath(); ctx.moveTo(0, -46); ctx.quadraticCurveTo(19, -20, 15, 22); ctx.quadraticCurveTo(10, 44, 0, 46);
    ctx.quadraticCurveTo(-10, 44, -15, 22); ctx.quadraticCurveTo(-19, -20, 0, -46); ctx.fill();
    ctx.fillStyle = '#c98a4b'; ctx.beginPath(); ctx.moveTo(0, -40); ctx.quadraticCurveTo(14, -18, 11, 20); ctx.quadraticCurveTo(7, 38, 0, 40);
    ctx.quadraticCurveTo(-7, 38, -11, 20); ctx.quadraticCurveTo(-14, -18, 0, -40); ctx.fill();
    ctx.fillStyle = '#8a4f22'; ctx.fillRect(-12, -2, 24, 3);
    ctx.restore();
  };
  definePreview('River Rapids Canoe', {
    blurb: 'Share a canoe down the jungle river: one paddles, one bails and pokes logs.',
    loop: 6.2,
    still: 2.45,
    draw(v, t) {
      const ctx = v.ctx, S = pw17rScroll(t), pool = v.ease.inOut(v.seg(t, 4.6, 5.4)), cx = pw17rCX, cy = pw17rCY;
      // jungle floor and the river
      ctx.fillStyle = '#2f7a3a'; ctx.fillRect(0, 0, v.W, v.H);
      ctx.fillStyle = '#3f9b4a';
      for (let k = 0; k < 10; k++) { const yy = ((k * 42 + S) % 420) - 30; v.circle(v.rand(k) * 60 + 4, yy, 14 + v.rand(k + 50) * 8); ctx.fill(); v.circle(v.W - v.rand(k + 9) * 60 - 4, yy + 13, 14 + v.rand(k + 70) * 8); ctx.fill(); }
      ctx.fillStyle = '#d9b77a';
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(cx, -4);
        for (let y = -4; y <= v.H + 4; y += 9) ctx.lineTo(pw17rBankX(v, y, S, side, pool) + side * 6, y);
        ctx.lineTo(cx, v.H + 4); ctx.closePath(); ctx.fill();
      }
      const wg = ctx.createLinearGradient(cx - 90, 0, cx + 90, 0);
      wg.addColorStop(0, '#3fa7c9'); wg.addColorStop(0.5, '#56c3e0'); wg.addColorStop(1, '#3fa7c9');
      ctx.fillStyle = wg; ctx.beginPath();
      for (let y = -4; y <= v.H + 4; y += 9) ctx.lineTo(pw17rBankX(v, y, S, -1, pool), y);
      for (let y = v.H + 5; y >= -4; y -= 9) ctx.lineTo(pw17rBankX(v, y, S, 1, pool), y);
      ctx.closePath(); ctx.fill();
      // current streaks
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (let k = 0; k < 12; k++) {
        const yy = ((k * 37 + S * 1.15) % 444) - 30, xx = cx + (v.rand(k + 200) - 0.5) * 120;
        ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + 8 + v.rand(k + 300) * 6); ctx.stroke();
      }
      // party pool: lily pads, flowers and a capybara on the bank
      if (pool > 0) {
        ctx.save(); ctx.globalAlpha *= pool;
        for (const [px, py] of [[62, 40], [262, 70], [86, 150], [244, 156]]) { v.fillCircle(px, py, 9, '#5cbf5c'); v.fillCircle(px + 4, py - 3, 3, '#ff8fc7'); }
        ctx.fillStyle = '#a97a4a'; ctx.beginPath(); ctx.ellipse(286, 112, 15, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(298, 104, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
        v.fillCircle(300, 102, 1.4, v.c.ink);
        ctx.restore();
      }
      // the branch jam: two branches across the river, poked apart at 2.45
      const jy = pw17rJamS + S, fly = v.ease.out(v.seg(t, 2.45, 3.1));
      if (jy > -30 && jy < v.H + 30 && fly < 1) {
        ctx.save(); ctx.globalAlpha *= 1 - v.seg(t, 2.8, 3.1);
        pw17rBranch(v, cx - 18 - fly * 70, jy - fly * 10, 0.15 - fly * 1.2);
        pw17rBranch(v, cx + 20 + fly * 70, jy + 4 - fly * 6, -0.2 + fly * 1.3);
        ctx.restore();
      }
      // the mango, scooped up at 3.55
      const fy = pw17rFruitS + S;
      if (t < 3.9 && fy > -20) pw17rMango(v, cx + 2, fy, Math.sin(t * 6) * 1.2);
      // the canoe and its crew
      const rock = Math.sin(t * 5) * 0.03 + (t > 4.1 && t < 4.4 ? Math.sin((t - 4.1) * 30) * 0.05 : 0);
      pw17rCanoe(v, cx, cy, rock);
      const party = t > 5.2, hopP = party ? v.hop(v.phase(t, 0.5), 7) : 0, hopB = party ? v.hop(v.phase(t, 0.5, 0.25), 7) : 0;
      // Pip's paddle: a stroke on alternating sides until the pool
      const strokeK = v.phase(t, 0.8), side = strokeK < 0.5 ? -1 : 1, sk = (strokeK % 0.5) * 2, paddling = t < 4.8 && !(t > 2.0 && t < 2.75);
      if (paddling) {
        const px = cx + side * 20, py = cy - 26 + sk * 22;
        v.line(cx + side * 6, cy - 34, px, py, '#7a4a20', 3);
        ctx.fillStyle = '#c8873e'; ctx.beginPath(); ctx.ellipse(px, py, 3.5, 7, 0, 0, Math.PI * 2); ctx.fill();
        if (sk > 0.3) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(px, py + 9, 4 + sk * 4, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke(); }
      }
      v.hero(0, cx, cy - 18 + hopP, { s: 0.62, face: paddling ? side : 1, mood: party || (t > 3.9 && t < 4.3) ? 'joy' : 'happy', shadow: false });
      // Bo's oar: aims at the jam and pokes it, later the bucket bails a splash
      const aim = v.seg(t, 1.75, 2.05), jab = t > 2.3 && t < 2.6 ? Math.sin(v.seg(t, 2.3, 2.6) * Math.PI) : 0;
      if (aim > 0 && t < 2.75) {
        const ox = cx - 10, oy = cy + 14, tx = cx - 22, ty = pw17rJamS + pw17rScroll(2.05) + 4;
        const len = Math.hypot(tx - ox, ty - oy), reach = 0.72 + jab * 0.3, ux = (tx - ox) / len, uy = (ty - oy) / len;
        ctx.save(); ctx.setLineDash([3, 4]); ctx.globalAlpha *= 0.85 * aim; v.line(ox, oy, tx, ty, v.c.gold, 1.6); ctx.restore();
        v.line(ox, oy, ox + ux * len * reach, oy + uy * len * reach, '#7a4a20', 3);
        ctx.fillStyle = '#c8873e'; v.circle(ox + ux * len * reach, oy + uy * len * reach, 3.5); ctx.fill();
      }
      const bail = v.seg(t, 4.4, 4.95);
      v.hero(1, cx, cy + 28 + hopB, { s: 0.62, face: bail > 0 && bail < 1 ? 1 : -1, mood: party ? 'joy' : t > 2.4 && t < 2.9 ? 'wow' : 'happy', shadow: false });
      if (bail > 0 && bail < 1) {
        const bx = cx + 14 + bail * 8, by = cy + 24 - Math.sin(bail * Math.PI) * 10;
        ctx.fillStyle = '#5a6478'; v.rr(bx - 6, by - 6, 12, 11, 3); ctx.fill(); ctx.fillStyle = '#d0d6e4'; v.rr(bx - 5, by - 5, 10, 9, 2.5); ctx.fill();
        ctx.fillStyle = '#e8f8ff';
        for (let q = 0; q < 5; q++) { const k = v.seg(bail, 0.4 + q * 0.05, 1); if (k > 0 && k < 1) { v.circle(bx + 6 + k * 40 + q * 3, by - 6 - Math.sin(k * Math.PI) * 18 + q, 2.8); ctx.fill(); } }
      }
      // a splash comes over the side just before the bail
      const sp = v.seg(t, 4.1, 4.4);
      if (sp > 0 && sp < 1) for (let q = 0; q < 6; q++) v.fillCircle(cx - 20 + q * 3 + sp * 12, cy - 4 - Math.sin(sp * Math.PI) * (10 + q * 2), 2, 'rgba(255,255,255,0.9)');
      // little moments: Poke!, +1 fruit, Yay!
      if (t > 2.4 && t < 3.1) { v.puff(cx, pw17rJamS + pw17rScroll(2.05), v.seg(t, 2.4, 2.9)); v.pill('Poke!', cx - 54, 70, { size: 10, bg: v.c.bo }); }
      if (t > 3.9 && t < 4.6) { const k = v.seg(t, 3.9, 4.6); v.sparkle(cx + 2, cy - 44, k, '#fff', 9); v.pill('+1 fruit', cx + 38, cy - 50 - k * 10, { size: 10, bg: v.c.pip }); }
      // water meter on Bo's side
      const water = t < 4.1 ? 0.2 : t < 4.4 ? 0.2 + v.seg(t, 4.1, 4.4) * 0.45 : 0.65 - v.seg(t, 4.5, 4.95) * 0.55;
      ctx.fillStyle = 'rgba(28,26,54,0.7)'; v.rr(8, v.H - 22, 86, 14, 7); ctx.fill();
      v.text('water', 12, v.H - 15, 8, '#fff', 'left', true);
      ctx.fillStyle = water > 0.5 ? '#ff9a4a' : '#56c3e0'; v.rr(40, v.H - 19, 51 * water, 8, 4); ctx.fill();
      if (party) {
        const k = v.seg(t, 5.2, 6.2);
        v.confetti(cx, cy - 30, k, 22);
        v.heart(cx - 34, cy - 40 - k * 16, 6); v.heart(cx + 34, cy - 30 - k * 20, 5, '#ffd34d');
        v.label('Yay!', cx, 26, 20, v.c.gold);
      }
      // fade at the seam
      const fade = Math.max(v.seg(t, 5.95, 6.2), 1 - v.seg(t, 0, 0.2));
      if (fade > 0) { ctx.fillStyle = 'rgba(20,50,30,' + fade.toFixed(3) + ')'; ctx.fillRect(0, 0, v.W, v.H); }
    },
  });
  // ----- END 17-2 River Rapids Canoe preview -----
  //
  // ----- BEGIN 17-3 Waterfall Climb preview -----
  // PLACEHOLDER
  // ----- END 17-3 Waterfall Climb preview -----
  //
  // ----- BEGIN 17-4 Vine Swing preview -----
  // PLACEHOLDER
  // ----- END 17-4 Vine Swing preview -----
  //
}
