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
  // beside a jungle waterfall Bo braces at the foot of a tall ledge; Pip hops on Bo's hands and BOOSTS way up, the view
  // climbs with them, Pip drops a vine at the post and Bo climbs it; both cheer as Tico the toucan flies past.
  const pw17wWall = { x: 196, top: 74 };            // the ledge (world px; ground at 160)
  const pw17wPip = (v, t) => {
    // Pip's feet (world px), its squash and mood along the loop
    const G = 160, onHands = G - 15;
    if (t < 0.9) return { x: 58 + 92 * v.ease.inOut(t / 0.9), y: G, sq: 0, mood: 'happy', face: 1 };
    if (t < 1.25) { const k = v.seg(t, 0.9, 1.25); return { x: v.lerp(150, 176, k), y: v.lerp(G, onHands, k) + v.hop(k, 18), sq: -0.1, mood: 'happy', face: 1 }; }
    if (t < 1.45) return { x: 176, y: onHands, sq: 0.35 * Math.sin(v.seg(t, 1.25, 1.45) * Math.PI), mood: 'grit', face: 1 };
    if (t < 2.25) {
      // the BIG boost: way up and over onto the ledge
      const k = v.seg(t, 1.45, 2.25), up = v.ease.out(Math.min(1, k * 1.25));
      return { x: v.lerp(176, 222, v.ease.inOut(k)), y: v.lerp(onHands, pw17wWall.top, up) - Math.sin(k * Math.PI) * 22, sq: -0.3 * (1 - k), mood: 'wow', face: 1 };
    }
    if (t < 2.6) return { x: v.lerp(222, 210, v.seg(t, 2.25, 2.6)), y: pw17wWall.top, sq: 0.3 * Math.max(0, 1 - (t - 2.25) * 6), mood: 'joy', face: -1 };
    if (t < 4.5) return { x: 210, y: pw17wWall.top, sq: t > 3.0 ? 0.08 * Math.sin(t * 14) : 0, mood: t > 3.0 ? 'grit' : 'happy', face: -1 };
    return { x: 210 + 6 * v.ease.inOut(v.seg(t, 4.5, 4.9)), y: pw17wWall.top + v.hop(v.phase(t - 4.9, 0.55), 10) * (t > 4.9 ? 1 : 0), sq: 0, mood: 'joy', face: -1 };
  };
  const pw17wBo = (v, t) => {
    const G = 160;
    if (t < 1.45) return { x: 176, y: G, sq: 0.35, mood: 'grit', face: 1 };
    if (t < 3.0) return { x: v.lerp(176, 184, v.seg(t, 2.6, 3.0)), y: G, sq: t < 1.7 ? 0.35 * (1 - v.seg(t, 1.45, 1.7)) : 0, mood: t < 2.3 ? 'wow' : 'happy', face: 1 };
    if (t < 4.2) { const k = v.ease.inOut(v.seg(t, 3.0, 4.2)); return { x: 184, y: v.lerp(G, pw17wWall.top + 4, k), sq: -0.08 + 0.08 * Math.sin(t * 16), mood: 'grit', face: 1, climb: true }; }
    if (t < 4.5) { const k = v.seg(t, 4.2, 4.5); return { x: v.lerp(184, 252, k), y: pw17wWall.top + v.hop(k, 14), sq: 0, mood: 'joy', face: 1 }; }
    return { x: 252, y: pw17wWall.top + v.hop(v.phase(t - 4.65, 0.55), 10) * (t > 4.65 ? 1 : 0), sq: 0, mood: 'joy', face: -1 };
  };
  const pw17wToucan = (v, x, y, flap) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#262340'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-2, -2); ctx.quadraticCurveTo(6, -14 * flap, 14, -6 * flap); ctx.lineTo(4, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.ellipse(-7, -2, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff9a1f'; ctx.beginPath(); ctx.moveTo(-10, -5); ctx.quadraticCurveTo(-26, -6, -28, 0); ctx.quadraticCurveTo(-20, 1, -10, 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8443a'; ctx.beginPath(); ctx.moveTo(-28, 0); ctx.lineTo(-24, -3); ctx.lineTo(-23, 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#262340'; v.circle(-7, -3, 1.5); ctx.fill();
    ctx.restore();
  };
  definePreview('Waterfall Climb', {
    blurb: 'Brace for a BIG boost up the falls, then drop a vine for your partner!',
    loop: 6,
    still: 1.9,
    draw(v, t) {
      const ctx = v.ctx, W = v.W, H = v.H;
      // the view climbs with the boost
      const cam = 34 * v.ease.inOut(v.seg(t, 1.5, 2.6)) * (1 - v.ease.inOut(v.seg(t, 5.55, 6)));
      const Y = y => y + cam;
      // jungle sky and leafy sides
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#bfe9d2'); g.addColorStop(1, '#eaf7d6');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#5fae6e';
      ctx.beginPath(); ctx.moveTo(0, 0);
      for (let y = 0; y <= H; y += 10) ctx.lineTo(34 + Math.sin((y - cam) / 23) * 9, y);
      ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4c9a5f';
      for (let k = 0; k < 6; k++) { const ly = ((k * 41 + cam) % 220) - 20; ctx.beginPath(); ctx.ellipse(30, ly, 16, 6, 0.6, 0, Math.PI * 2); ctx.fill(); }
      // the waterfall (streaks fall with t), with mist at the foot
      ctx.fillStyle = 'rgba(150,215,240,0.75)'; ctx.fillRect(70, 0, 58, H);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let k = 0; k < 9; k++) { const sx = 74 + k * 6.2, sy = ((t * 150 + k * 37) % 220) - 30; ctx.fillRect(sx, sy, 2, 18 + (k % 3) * 6); }
      for (let k = 0; k < 6; k++) v.fillCircle(78 + k * 9, Y(160) - 2 - Math.abs(Math.sin(t * 4 + k)) * 5, 6, 'rgba(255,255,255,0.7)');
      // ground and the tall ledge (with a gem waiting on top)
      v.block(40, Y(160), W - 40, 40, true);
      v.block(pw17wWall.x, Y(pw17wWall.top), W - pw17wWall.x, 200, true);
      const gemGot = t > 4.6;
      if (!gemGot) { ctx.save(); ctx.translate(290, Y(pw17wWall.top) - 14 + Math.sin(t * 3) * 2); ctx.fillStyle = '#ff7fb0'; ctx.strokeStyle = '#c23f78'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(5, 0); ctx.lineTo(0, 6); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
      // a friendly frog by the pool
      const blink = v.phase(t, 2.3) > 0.93;
      v.fillCircle(56, Y(156), 7, '#7fcf5a'); v.fillCircle(52, Y(150), 3.2, '#7fcf5a'); v.fillCircle(60, Y(150), 3.2, '#7fcf5a');
      if (!blink) { v.fillCircle(52, Y(150), 1.4, v.c.ink); v.fillCircle(60, Y(150), 1.4, v.c.ink); }
      // the vine post and the vine (unrolls at 2.6-3.0, rolls up after Bo is up)
      const px = pw17wWall.x + 4;
      ctx.fillStyle = '#9a6a3c'; ctx.fillRect(px - 2, Y(pw17wWall.top) - 14, 5, 14);
      const len = (pw17wWall.top < 160 ? 160 - pw17wWall.top : 0) * (v.seg(t, 2.6, 3.0) - v.seg(t, 4.3, 4.7));
      if (len > 1) {
        ctx.strokeStyle = '#3f9b4d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px - 8, Y(pw17wWall.top) - 10);
        for (let k = 0; k <= 10; k++) ctx.lineTo(px - 12 + Math.sin(k * 1.3 + t * 2) * 1.5, Y(pw17wWall.top) - 10 + len * k / 10);
        ctx.stroke();
        ctx.fillStyle = '#5cc27f';
        for (let k = 1; k < 6; k++) if (k * len / 6 < len - 4) { ctx.beginPath(); ctx.ellipse(px - 8, Y(pw17wWall.top) - 10 + k * len / 6, 4, 2, 0.6, 0, Math.PI * 2); ctx.fill(); }
      }
      // the pair
      const b = pw17wBo(v, t), p = pw17wPip(v, t);
      v.hero(1, b.x, Y(b.y), { sq: b.sq, mood: b.mood, face: b.face, shadow: !b.climb });
      v.hero(0, p.x, Y(p.y), { sq: p.sq, mood: p.mood, face: p.face });
      // words
      if (t > 1.3 && t < 2.0) { ctx.save(); ctx.globalAlpha = 1 - v.seg(t, 1.75, 2.0); v.label('BOOST!', 176, Y(122) - 20 * v.seg(t, 1.3, 2.0), 20, v.c.gold); ctx.restore(); }
      if (t < 1.3) v.bubble('Hop on!', 176, Y(122), { size: 11 });
      if (t > 2.65 && t < 3.3) v.label('Vine!', 214, Y(pw17wWall.top) - 36, 15, '#9cf06a');
      if (t > 3.2 && t < 4.2) v.label('Heave!', 228, Y(pw17wWall.top) - 36, 15, '#fff');
      // the happy payoff: Tico flies past, sparkles
      if (t > 4.5) {
        const k = v.seg(t, 4.5, 6);
        pw17wToucan(v, v.lerp(W + 30, -40, k), 34 + Math.sin(k * 9) * 6, Math.sin(t * 18) > 0 ? 1 : -0.4);
        v.sparkle(236, Y(pw17wWall.top) - 36, v.phase(t, 0.7));
        v.sparkle(212, Y(pw17wWall.top) - 44, v.phase(t + 0.35, 0.7));
        if (t > 4.6 && t < 5.4) v.label('Up!', 268, Y(pw17wWall.top) - 40 - 10 * v.seg(t, 4.6, 5.4), 18, v.c.gold);
      }
    },
  });
  // ----- END 17-3 Waterfall Climb preview -----
  //
  // ----- BEGIN 17-4 Vine Swing preview -----
  // Pip and Bo pump their vines higher, let go on the way up and fly; Bo opens a leaf and lands further.
  const pw17vGY = 150, pw17vL = 60, pw17vW = Math.PI * 2 / 1.3;
  // per hero: vine pivot, let-go time, flight time, landing x, distance, swing phase offset (so let-go is at +30 deg going forward)
  const pw17vH = [
    { px: 106, py: 12, tr: 2.0, ft: 1.3, lx: 240, m: 38 },
    { px: 88, py: 12, tr: 2.65, ft: 1.55, lx: 272, m: 44 },
  ];
  for (const h of pw17vH) h.ph = 0.44 - pw17vW * h.tr;
  const pw17vAmp = t => (22 + 56 * Math.min(1, t / 2)) * Math.PI / 180;   // a big swing, up near the branch
  const pw17vWin = 4.4;
  // several circles in one fill
  const pw17vBlobs = (ctx, col, list) => { ctx.fillStyle = col; ctx.beginPath(); for (const [x, y, r] of list) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); } ctx.fill(); };
  const pw17vHills = [[], [], [], []];
  for (let k = 0; k < 7; k++) pw17vHills[0].push([20 + k * 52, pw17vGY - 8, 30 + ((k * 37) % 10)]);
  for (let k = 0; k < 6; k++) pw17vHills[1].push([44 + k * 58, pw17vGY - 2, 20 + ((k * 53) % 8)]);
  for (let k = 0; k < 10; k++) pw17vHills[2].push([-6 + k * 15, -2 + ((k * 29) % 8), 15 + ((k * 17) % 6)]);
  for (let k = 0; k < 7; k++) pw17vHills[3].push([4 + k * 18, 6 + ((k * 13) % 6), 9]);
  const pw17vAng = (h, t) => pw17vAmp(t) * Math.sin(pw17vW * t + h.ph);
  const pw17vHand = (h, a) => ({ x: h.px + Math.sin(a) * pw17vL, y: h.py + Math.cos(a) * pw17vL });
  const pw17vVine = (v, x0, y0, x1, y1, sag) => {
    const ctx = v.ctx, mx = (x0 + x1) / 2 + sag, my = (y0 + y1) / 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2f5a2a'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
    ctx.strokeStyle = '#6fae4a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
    for (const k of [0.35, 0.7]) {
      const lx = (1 - k) * (1 - k) * x0 + 2 * k * (1 - k) * mx + k * k * x1, ly = (1 - k) * (1 - k) * y0 + 2 * k * (1 - k) * my + k * k * y1;
      ctx.fillStyle = '#5cae4c'; ctx.beginPath(); ctx.ellipse(lx + 3, ly, 3.4, 1.6, 0.5, 0, Math.PI * 2); ctx.fill();
    }
  };
  const pw17vLeaf = (v, x, y, s) => {
    const ctx = v.ctx;
    ctx.fillStyle = '#4fa84a'; ctx.beginPath(); ctx.ellipse(x, y, 14 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
    v.line(x - 13 * s, y, x + 13 * s, y, '#2f6a2c', 1.2); v.line(x, y, x, y + 9 * s, '#2f6a2c', 1.2);
  };
  const pw17vScene = (v, t) => {
    const ctx = v.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, v.H);
    g.addColorStop(0, '#8fd8c8'); g.addColorStop(1, '#d9f3c4');
    ctx.fillStyle = g; ctx.fillRect(0, 0, v.W, v.H);
    v.sun(278, 34, 13);
    // far jungle hills and trees
    pw17vBlobs(ctx, '#9fd38a', pw17vHills[0]);
    pw17vBlobs(ctx, '#7fbf6e', pw17vHills[1]);
    // ground and distance posts
    ctx.fillStyle = '#6cbf4f'; ctx.fillRect(0, pw17vGY, v.W, v.H - pw17vGY);
    ctx.fillStyle = '#58a63f'; ctx.fillRect(0, pw17vGY, v.W, 4);
    ctx.fillStyle = '#9a6a3a'; ctx.fillRect(0, pw17vGY + 9, v.W, v.H);
    ctx.fillStyle = '#6cbf4f'; ctx.fillRect(0, pw17vGY + 4, v.W, 6);
    for (let m = 10; m <= 50; m += 10) {
      const x = 52 + m * 5;
      ctx.fillStyle = '#7a5230'; ctx.fillRect(x - 1, pw17vGY - 9, 2, 10);
      v.text(m + 'm', x, pw17vGY + 15, 8, '#fff8e0', 'center', true);
    }
    // the big tree, its branch and the deck
    ctx.fillStyle = '#7a5230'; v.rr(-8, -4, 30, pw17vGY + 6, 8); ctx.fill();
    ctx.fillStyle = '#5e3e22'; ctx.fillRect(6, 30, 3, 90);
    ctx.fillStyle = '#7a5230'; v.rr(10, 6, 112, 10, 5); ctx.fill();
    pw17vBlobs(ctx, '#2f7a3a', pw17vHills[2]);
    pw17vBlobs(ctx, '#3f9446', pw17vHills[3]);
    ctx.fillStyle = '#b07a44'; ctx.fillRect(0, 118, 40, 6); ctx.fillStyle = '#8a5a30'; ctx.fillRect(4, 124, 3, 26); ctx.fillRect(33, 124, 3, 26);
  };
  definePreview('Vine Swing', {
    blurb: 'Pump your vine, let go on the way up and fly. Longest swing wins!',
    loop: 6,
    still: 4.9,
    draw(v, t) {
      const ctx = v.ctx;
      pw17vScene(v, t);
      const pos = [];
      for (let id = 0; id < 2; id++) {
        const h = pw17vH[id];
        if (t < h.tr) {
          const a = pw17vAng(h, t), hand = pw17vHand(h, a);
          pw17vVine(v, h.px, h.py, hand.x, hand.y, -Math.cos(pw17vW * t + h.ph) * 10);   // (the vine whips: it bows out behind)
          pos.push({ id, x: hand.x + Math.sin(a) * 12, y: hand.y + Math.cos(a) * 12 + 8.4, rot: -a, mood: t > h.tr - 0.5 ? 'grit' : 'happy', face: 1 });
        } else {
          // the empty vine swings back and settles
          const ar = pw17vAng(h, h.tr), dt = t - h.tr, a = ar * Math.cos(pw17vW * dt) * Math.exp(-dt * 0.9), hand = pw17vHand(h, a);
          pw17vVine(v, h.px, h.py, hand.x, hand.y, 0);
          const a0 = pw17vAng(h, h.tr), r0 = pw17vHand(h, a0), x0 = r0.x + Math.sin(a0) * 12, y0 = r0.y + Math.cos(a0) * 12 + 8.4;
          const k = Math.min(1, dt / h.ft);
          if (k < 1) {
            const glide = id === 1 && k > 0.42, kk = id === 1 ? (k < 0.42 ? k : 0.42 + (k - 0.42) * 0.92) : k;
            const x = v.lerp(x0, h.lx, k), y = v.lerp(y0, pw17vGY, Math.pow(kk, 1.7)) + v.hop(kk, id === 1 ? 52 : 46) * (glide ? 0.96 : 1);
            if (glide) pw17vLeaf(v, x, y - 30, Math.min(1, (k - 0.42) * 6));
            pos.push({ id, x, y, rot: glide ? 0 : (k * 5.5) % (Math.PI * 2) * (k < 0.7 ? 1 : 0), mood: 'wow', face: 1, fly: true });
            if (dt < 0.35) v.sparkle(x0, y0 - 10, dt / 0.35, '#fff6a0', 9);
          } else {
            const lt = dt - h.ft, win = id === 1 && t > pw17vWin;
            v.puff(h.lx, pw17vGY, lt / 0.5);
            const hop = win ? v.hop(v.phase(t - pw17vWin, 0.55), 10) : 0;
            pos.push({ id, x: h.lx, y: pw17vGY + hop, rot: 0, mood: win ? 'joy' : 'happy', face: id === 0 ? 1 : -1, sq: lt < 0.15 ? 0.5 : 0 });
            // flag with the distance
            const fk = v.ease.back(v.seg(lt, 0.1, 0.45));
            if (fk > 0) {
              ctx.save(); ctx.translate(h.lx + (id ? 14 : -16), pw17vGY); ctx.scale(1, fk); v.flag(0, 0, id === 0 ? v.c.pip : v.c.bo, t); ctx.restore();
              v.pill(h.m + ' m', h.lx + (id ? 16 : -20), pw17vGY - 40, { size: 9, bg: id === 0 ? v.c.pipDark : v.c.boDark });
            }
          }
        }
      }
      for (const p of pos) v.hero(p.id, p.x, p.y, { s: 0.7, rot: p.rot, mood: p.mood, face: p.face, sq: p.sq || 0, shadow: !p.fly && p.rot === 0 });
      if (t < 1.8) v.label('◀ ▶ pump!', 190, 40, 13, '#fff');
      else if (t < 3) v.label('Let go!', 190, 40, 13, '#fff6a0');
      if (t > pw17vWin) {
        v.confetti(272, pw17vGY - 30, v.seg(t, pw17vWin, 5.8));
        v.label('Bo wins!', 190, 46, 18, v.c.bo);
        v.star(272, 82 + Math.sin(t * 5) * 2, 7, v.c.gold, t);
      }
      // soft fade at the seam
      const fade = Math.max(v.seg(t, 5.7, 6), 0.6 * (1 - v.seg(t, 0, 0.2)));
      if (fade > 0) { ctx.fillStyle = 'rgba(217,243,196,' + fade.toFixed(3) + ')'; ctx.fillRect(0, 0, v.W, v.H); }
    },
  });
  // ----- END 17-4 Vine Swing preview -----
  //
}
