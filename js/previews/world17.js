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
  // PLACEHOLDER
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
