/* Pip & Bo - Level previews for World 17 Jungle Jamboree (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw17. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 17-1 Temple Doors preview -----
  // Pip stands on a gold plate and the stone door slides up; Bo runs through. Pip steps off, the door slides down slowly
  // while its glyph lights go out one by one, and Pip dashes under it just in time ("Dash!").
  const pw17tGY = 150, pw17tDX = 168, pw17tTop = 96;
  // how far down the door is (0 open .. 1 shut) at time t
  const pw17tCover = t => (t < 0.6 ? 1 : t < 1.0 ? 1 - (t - 0.6) / 0.4 : t < 1.8 ? 0 : Math.min(1, (t - 1.8) / 2.4));
  const pw17tPipX = t => (t < 0.6 ? 40 + 44 * (t / 0.6) : t < 1.8 ? 84 : t < 3.3 ? 84 + (226 - 84) * Math.min(1, (t - 1.8) / 1.3) : 226);
  const pw17tBoX = t => (t < 1.0 ? 136 : t < 1.7 ? 136 + (250 - 136) * ((t - 1.0) / 0.7) : 250);
  function pw17tLeaf(ctx, x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.55, s, 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-s * 0.45, s * 0.6); ctx.lineTo(s * 0.45, -s * 0.6); ctx.stroke();
    ctx.restore();
  }
  function pw17tRoom(v, t) {
    const ctx = v.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, v.H); g.addColorStop(0, '#46603f'); g.addColorStop(1, '#2c432b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, v.W, v.H);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 20; y < pw17tGY; y += 22) { ctx.moveTo(0, y); ctx.lineTo(v.W, y); for (let x = (y / 22) % 2 ? 0 : 22; x < v.W; x += 44) { ctx.moveTo(x, y); ctx.lineTo(x, y + 22); } }
    ctx.stroke();
    // sun shafts through the roof
    for (const [x, w] of [[40, 22], [212, 30]]) {
      ctx.fillStyle = 'rgba(255,248,200,0.12)'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x + w + 50, pw17tGY); ctx.lineTo(x + 50, pw17tGY); ctx.closePath(); ctx.fill();
    }
    // a carved sun face
    ctx.strokeStyle = 'rgba(255,230,170,0.12)'; ctx.lineWidth = 2; v.circle(270, 54, 18); ctx.stroke();
    // hanging vines
    for (const [x, len] of [[18, 40], [120, 26], [300, 34]]) {
      v.line(x, 0, x + 3, len, '#5a7a2c', 2);
      for (let k = 10; k < len; k += 12) pw17tLeaf(ctx, x + (k % 18 ? 5 : -3), k, 3.2, '#7ed05a');
    }
    // the floor
    ctx.fillStyle = '#7d6a52'; ctx.fillRect(0, pw17tGY, v.W, v.H - pw17tGY);
    ctx.fillStyle = '#52aa46'; ctx.fillRect(0, pw17tGY, v.W, 5); ctx.fillStyle = '#8fe071'; ctx.fillRect(0, pw17tGY, v.W, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; for (let x = 0; x < v.W; x += 30) ctx.fillRect(x, pw17tGY + 8, 2, v.H - pw17tGY);
    // the wall over the doorway and its lintel
    ctx.fillStyle = '#6d5643'; ctx.fillRect(pw17tDX - 3, 0, 22, pw17tTop - 4);
    ctx.fillStyle = '#7a6440'; ctx.fillRect(pw17tDX - 6, pw17tTop - 6, 28, 6);
    ctx.fillStyle = 'rgba(20,16,8,0.4)'; ctx.fillRect(pw17tDX - 2, pw17tTop, 20, pw17tGY - pw17tTop);
    // Mango the monkey on the lintel, swinging his tail
    const mx = pw17tDX + 8, my = 30 + Math.sin(t * 3) * 2;
    ctx.strokeStyle = '#8a5a2e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx + 5, my + 6); ctx.quadraticCurveTo(mx + 16, my + 14 + Math.sin(t * 4) * 4, mx + 12, my + 22); ctx.stroke();
    v.fillCircle(mx, my + 4, 7, '#a8703a'); v.fillCircle(mx, my - 5, 6, '#a8703a'); v.fillCircle(mx, my - 3.5, 4, '#f2cf9a');
    v.fillCircle(mx - 6, my - 7, 2.6, '#a8703a'); v.fillCircle(mx + 6, my - 7, 2.6, '#a8703a');
    v.fillCircle(mx - 1.6, my - 5, 0.9, '#2a1a10'); v.fillCircle(mx + 1.6, my - 5, 0.9, '#2a1a10');
    v.line(mx - 4, my + 9, mx - 6, my + 26, '#7a4a20', 2);
  }
  function pw17tDoor(v, t, cover) {
    const ctx = v.ctx, h = pw17tGY - pw17tTop, y1 = pw17tTop + h * cover;
    if (cover > 0.01) {
      ctx.save(); ctx.beginPath(); ctx.rect(pw17tDX - 2, pw17tTop, 20, h * cover); ctx.clip();
      const sy = y1 - h;
      ctx.fillStyle = '#9a8460'; ctx.fillRect(pw17tDX, sy, 16, h);
      ctx.fillStyle = '#b39c74'; ctx.fillRect(pw17tDX + 2, sy + 2, 12, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(pw17tDX, sy + h / 3, 16, 1.5); ctx.fillRect(pw17tDX, sy + h * 2 / 3, 16, 1.5);
      pw17tLeaf(ctx, pw17tDX + 8, sy + h / 2, 5, '#6fd65a');
      ctx.restore();
      ctx.fillStyle = '#6b5636'; ctx.fillRect(pw17tDX - 1, y1 - 2, 18, 2);
    }
    // the glyph lights over the door: all lit while held, going out one by one as it closes
    const n = 5, closing = t >= 1.8, left = closing ? Math.max(0, 1 - cover / 0.62) : 1, lit = Math.ceil(left * n - 0.001);
    for (let i = 0; i < n; i++) {
      const ly = pw17tTop - 12 - i * 8, on = i < lit;
      v.fillCircle(pw17tDX + 8, ly, 4.2, 'rgba(30,22,10,0.6)');
      if (on) {
        const blink = closing && i === lit - 1 ? 0.55 + 0.45 * Math.sin(t * 16) : 1;
        ctx.save(); ctx.globalAlpha *= blink; v.fillCircle(pw17tDX + 8, ly, 5.5, 'rgba(111,214,90,0.35)'); v.fillCircle(pw17tDX + 8, ly, 3, '#9dff8a'); ctx.restore();
      } else v.fillCircle(pw17tDX + 8, ly, 2.4, '#5a4a30');
    }
  }
  definePreview('Temple Doors', {
    blurb: 'Stand on a plate to lift the stone door, then dash through before it shuts!',
    loop: 5.2,
    still: 2.7,
    draw(v, t) {
      const ctx = v.ctx, cover = pw17tCover(t), px = pw17tPipX(t), bx = pw17tBoX(t);
      pw17tRoom(v, t);
      // the pressure plate (down while Pip stands on it)
      const down = t > 0.55 && t < 1.85;
      ctx.fillStyle = '#3a2e1a'; v.rr(70, pw17tGY - 4, 28, 5, 2); ctx.fill();
      ctx.fillStyle = down ? '#ffe9a0' : '#d6b25e'; v.rr(72, pw17tGY - (down ? 4 : 7), 24, down ? 3 : 6, 2); ctx.fill();
      if (down) { ctx.fillStyle = 'rgba(255,243,176,0.25)'; ctx.fillRect(70, pw17tGY - 18, 28, 14); }
      // a little tablet: this plate opens the leaf door
      ctx.fillStyle = 'rgba(40,30,14,0.7)'; v.rr(76, pw17tGY - 46, 16, 16, 4); ctx.fill(); pw17tLeaf(ctx, 84, pw17tGY - 38, 4.5, '#6fd65a');
      // a golden banana past the door
      if (t < 4.3) { const by = 112 + Math.sin(t * 3) * 3; ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(292, by, 7, 0.3, 2.4); ctx.stroke(); }
      pw17tDoor(v, t, cover);
      // the heroes
      const pipRun = t < 0.6 || (t > 1.8 && t < 3.3), boRun = t > 1.0 && t < 1.7;
      const done = t > 3.3;
      const pjump = 0, duck = t > 2.45 && t < 2.95 ? Math.sin((t - 2.45) / 0.5 * Math.PI) * 0.35 : 0;
      v.hero(1, bx, pw17tGY + (done ? v.hop(v.phase(t, 0.5), 7) : 0), { s: 0.95, face: done ? -1 : 1, sq: boRun ? Math.sin(t * 24) * 0.08 : 0, mood: done ? 'joy' : boRun ? 'grit' : 'happy' });
      v.hero(0, px, pw17tGY + pjump + (done ? v.hop(v.phase(t + 0.25, 0.5), 7) : 0), { s: 0.95, face: 1, sq: duck || (pipRun ? Math.sin(t * 24) * 0.08 : 0), mood: done ? 'joy' : t > 1.8 ? 'wow' : 'happy' });
      // words
      if (t > 0.65 && t < 1.7) v.bubble('Go, Bo!', 84, pw17tGY - 30);
      if (t > 2.65 && t < 3.6) v.label('Dash!', 214, 78 - (t - 2.65) * 10, 18, v.c.gold);
      if (t > 4.2 && t < 5.0) v.puff(pw17tDX + 8, pw17tGY, (t - 4.2) / 0.8, 'rgba(230,220,190,0.9)');
      if (t > 3.3) v.confetti(238, 110, (t - 3.3) / 1.6);
      if (t > 3.5) v.bubble('Ooh-ooh!', pw17tDX + 40, 44, { size: 9 });
    },
  });
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
      // (seats as in the game: the bailer, Bo, at the bow; the paddler, Pip, at the stern) Pip's paddle: a stroke on alternating sides until the pool
      const strokeK = v.phase(t, 0.8), side = strokeK < 0.5 ? -1 : 1, sk = (strokeK % 0.5) * 2, paddling = t < 4.8 && !(t > 2.0 && t < 2.75);
      if (paddling) {
        const px = cx + side * 20, py = cy + 20 + sk * 22;
        v.line(cx + side * 6, cy + 12, px, py, '#7a4a20', 3);
        ctx.fillStyle = '#c8873e'; ctx.beginPath(); ctx.ellipse(px, py, 3.5, 7, 0, 0, Math.PI * 2); ctx.fill();
        if (sk > 0.3) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(px, py + 9, 4 + sk * 4, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke(); }
      }
      v.hero(0, cx, cy + 28 + hopP, { s: 0.62, face: paddling ? side : 1, mood: party || (t > 3.9 && t < 4.3) ? 'joy' : 'happy', shadow: false });
      // Bo's oar: aims at the jam and pokes it, later the bucket bails a splash
      const aim = v.seg(t, 1.75, 2.05), jab = t > 2.3 && t < 2.6 ? Math.sin(v.seg(t, 2.3, 2.6) * Math.PI) : 0;
      if (aim > 0 && t < 2.75) {
        const ox = cx - 10, oy = cy - 30, tx = cx - 22, ty = pw17rJamS + pw17rScroll(2.05) + 4;
        const len = Math.hypot(tx - ox, ty - oy), reach = 0.72 + jab * 0.3, ux = (tx - ox) / len, uy = (ty - oy) / len;
        ctx.save(); ctx.setLineDash([3, 4]); ctx.globalAlpha *= 0.85 * aim; v.line(ox, oy, tx, ty, v.c.gold, 1.6); ctx.restore();
        v.line(ox, oy, ox + ux * len * reach, oy + uy * len * reach, '#7a4a20', 3);
        ctx.fillStyle = '#c8873e'; v.circle(ox + ux * len * reach, oy + uy * len * reach, 3.5); ctx.fill();
      }
      const bail = v.seg(t, 4.4, 4.95);
      v.hero(1, cx, cy - 18 + hopB, { s: 0.62, face: bail > 0 && bail < 1 ? 1 : -1, mood: party ? 'joy' : t > 2.4 && t < 2.9 ? 'wow' : 'happy', shadow: false });
      if (bail > 0 && bail < 1) {
        const bx = cx + 14 + bail * 8, by = cy - 22 - Math.sin(bail * Math.PI) * 10;
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
