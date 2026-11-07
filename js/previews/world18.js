/* Pip & Bo - Level previews for World 18 Pirate Cove (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw18. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 18-1 Runaway Ship preview -----
  // (preview goes here)
  // ----- END 18-1 Runaway Ship preview -----
  //
  //
  //
  // ----- BEGIN 18-2 Grapple & Zip preview -----
  // (preview goes here)
  // ----- END 18-2 Grapple & Zip preview -----
  //
  //
  //
  // ----- BEGIN 18-3 Tide Pool Dig preview -----
  // Pip digs at the X; a wave pours seawater into the hole ("Glub!"), Bo scoops it out and dumps the bucket in the sea.
  // Pip digs on to the chest (CLUNK!), coins shower out onto the blanket, a crab sneaks for one, Pip lands by it ("Shoo!").
  const pw18tGY = 104, pw18tHX = 128, pw18tHW = 26, pw18tSea = 246, pw18tChest = 46;
  const pw18tEase = k => 1 - (1 - k) * (1 - k);
  // how deep the hole is at time t (Pip stops while it's flooded)
  const pw18tDepth = t => (t < 1.3 ? 30 * (t / 1.3) : t < 2.3 ? 30 : t < 3.4 ? 30 + (pw18tChest - 30) * ((t - 2.3) / 1.1) : pw18tChest);
  // water in the hole: pours in with the wave, Bo scoops it out
  const pw18tWater = t => (t < 1.4 ? 0 : t < 1.9 ? 15 * ((t - 1.4) / 0.5) : t < 2.05 ? 15 : t < 2.3 ? 15 * (1 - (t - 2.05) / 0.25) : 0);
  // the wave's tongue: how far up the beach it reaches
  const pw18tTongue = t => (t < 1.0 ? pw18tSea : t < 1.35 ? pw18tSea - (pw18tSea - 118) * pw18tEase((t - 1.0) / 0.35) : t < 1.6 ? 118 : t < 2.1 ? 118 + (pw18tSea - 118) * ((t - 1.6) / 0.5) : pw18tSea);
  const pw18tBoX = t => (t < 1.7 ? 182 : t < 2.0 ? 182 - 20 * ((t - 1.7) / 0.3) : t < 2.35 ? 162 : t < 3.0 ? 162 + (264 - 162) * ((t - 2.35) / 0.65) : t < 3.3 ? 264 : t < 4.0 ? 264 - (264 - 176) * ((t - 3.3) / 0.7) : 176);
  // the coins that shower out of the chest and land on the blanket (the last one bounces further: the crab's coin)
  const pw18tCoins = [[46, 0], [56, 0], [66, 0], [51, -4], [61, -4], [56, -8], [92, 0]];
  const pw18tCrabX = t => (t < 4.0 ? -14 : t < 4.6 ? -14 + (86 + 14) * ((t - 4.0) / 0.6) : t < 5.0 ? 86 : 86 - 110 * ((t - 5.0) / 0.6));
  function pw18tBeach(v, t) {
    const ctx = v.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, pw18tGY); g.addColorStop(0, '#7cc8f2'); g.addColorStop(1, '#d4f0ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, v.W, pw18tGY);
    v.fillCircle(272, 30, 15, '#fff2a8'); v.fillCircle(272, 30, 11, '#ffe066');
    // far sea, an island with a palm and a little ship
    ctx.fillStyle = '#3f9fd8'; ctx.fillRect(0, 70, v.W, pw18tGY - 70);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; for (let k = 0; k < 6; k++) ctx.fillRect(((k * 61 + t * 6) % 340) - 10, 76 + (k % 3) * 8, 14, 1.5);
    ctx.fillStyle = '#e8cf8a'; ctx.beginPath(); ctx.ellipse(70, 72, 34, 6, 0, Math.PI, 0); ctx.fill();
    v.line(72, 68, 76, 50, '#7a5230', 2.5);
    ctx.fillStyle = '#3e9a4a'; for (const a of [-2.6, -1.9, -1.2, -0.5]) { ctx.beginPath(); ctx.ellipse(76 + Math.cos(a) * 7, 50 + Math.sin(a) * 3, 9, 2.6, a, 0, Math.PI * 2); ctx.fill(); }
    const sx = 200 + Math.sin(t * 0.9) * 2, sy = 70 + Math.sin(t * 2) * 0.8;
    ctx.fillStyle = '#7a4a26'; ctx.beginPath(); ctx.moveTo(sx - 14, sy - 4); ctx.lineTo(sx + 14, sy - 4); ctx.lineTo(sx + 9, sy + 1); ctx.lineTo(sx - 9, sy + 1); ctx.closePath(); ctx.fill();
    v.line(sx, sy - 4, sx, sy - 22, '#5a3418', 1.5);
    ctx.fillStyle = '#fff8ea'; ctx.beginPath(); ctx.moveTo(sx + 1, sy - 21); ctx.lineTo(sx + 11, sy - 8); ctx.lineTo(sx + 1, sy - 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff7a8a'; ctx.fillRect(sx, sy - 25, 6, 3);
    // the sand, in layers, with the hole cut into it
    const d = pw18tDepth(t);
    ctx.fillStyle = '#f2d999'; ctx.fillRect(0, pw18tGY, v.W, 8);
    ctx.fillStyle = '#e2c27a'; ctx.fillRect(0, pw18tGY + 8, v.W, 26);
    ctx.fillStyle = '#c9a463'; ctx.fillRect(0, pw18tGY + 34, v.W, 26);
    ctx.fillStyle = '#a9834c'; ctx.fillRect(0, pw18tGY + 60, v.W, v.H - pw18tGY - 60);
    for (let k = 0; k < 18; k++) v.fillCircle((k * 37) % 320 + 6, pw18tGY + 14 + (k * 23) % 60, 1.4, 'rgba(120,80,40,0.25)');
    // the near sea, right of the beach
    v.water(pw18tSea, pw18tGY + 3, v.W - pw18tSea, v.H - pw18tGY, t);
    // the buried chest (seen through the cut-away sand)
    if (t < 3.4) { ctx.save(); ctx.globalAlpha = 0.45; pw18tBox(v, pw18tHX - 1, pw18tGY + pw18tChest, 0); ctx.restore(); }
    // the hole
    if (d > 0) {
      ctx.fillStyle = '#7a5a32'; ctx.fillRect(pw18tHX - pw18tHW / 2, pw18tGY, pw18tHW, d);
      ctx.fillStyle = '#5e4424'; ctx.fillRect(pw18tHX - pw18tHW / 2, pw18tGY + d - 3, pw18tHW, 3);
    }
    // the X (until the hole swallows it), and the sand pile beside the hole
    if (d < 6) { ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(pw18tHX - 6, pw18tGY - 2); ctx.lineTo(pw18tHX + 6, pw18tGY + 4); ctx.moveTo(pw18tHX + 6, pw18tGY - 2); ctx.lineTo(pw18tHX - 6, pw18tGY + 4); ctx.stroke(); }
    const pile = Math.min(1, d / pw18tChest);
    ctx.fillStyle = '#f2d999'; ctx.beginPath(); ctx.ellipse(pw18tHX - 28, pw18tGY, 12 * pile + 2, 9 * pile + 1, 0, Math.PI, 0); ctx.fill();
    // the treasure blanket
    ctx.fillStyle = '#d24b4b'; ctx.fillRect(36, pw18tGY - 2, 42, 3);
    ctx.fillStyle = '#fff'; for (let x = 38; x < 78; x += 6) ctx.fillRect(x, pw18tGY - 2, 3, 3);
    // the crab burrow
    ctx.fillStyle = '#6a4a26'; ctx.beginPath(); ctx.ellipse(8, pw18tGY, 8, 3, 0, Math.PI, 0); ctx.fill();
  }
  // a chest with its bottom at (x, y); open 0..1 tips the lid back (the lid is drawn first, behind the box)
  function pw18tBox(v, x, y, open) {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x - 11, y - 9); ctx.rotate(-open * 1.3);
    ctx.fillStyle = '#8a4f22'; v.rr(0, -6, 22, 7, 3); ctx.fill(); ctx.fillStyle = '#d6a43a'; ctx.fillRect(9, -6, 4, 7);
    ctx.restore();
    ctx.fillStyle = '#6b3a18'; ctx.fillRect(x - 11, y - 10, 22, 10);
    ctx.fillStyle = '#d6a43a'; ctx.fillRect(x - 11, y - 10, 22, 2); ctx.fillRect(x - 2, y - 10, 4, 10);
    if (open > 0.3) { ctx.save(); ctx.globalAlpha *= Math.min(1, (open - 0.3) * 2); v.fillCircle(x, y - 12, 10, 'rgba(255,224,102,0.45)'); ctx.restore(); }
  }
  function pw18tCoin(v, x, y) {
    v.fillCircle(x, y, 3.4, '#b8860b'); v.fillCircle(x, y, 2.6, '#ffd84a'); v.fillCircle(x - 0.8, y - 0.8, 0.9, '#fff6c0');
  }
  function pw18tCrab(v, x, y, t, flee) {
    const ctx = v.ctx, w = Math.sin(t * 22) * 1.5;
    ctx.strokeStyle = '#b8321e'; ctx.lineWidth = 1.4;
    for (const s of [-1, 1]) for (const k of [0, 1, 2]) { ctx.beginPath(); ctx.moveTo(x + s * 4, y - 3 + k); ctx.lineTo(x + s * 9, y + (k % 2 ? w : -w) * 0.6); ctx.stroke(); }
    ctx.fillStyle = '#e8452c'; ctx.beginPath(); ctx.ellipse(x, y - 4, 7, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    v.fillCircle(x - 9, y - 8 - (flee ? 3 : 0), 2.6, '#e8452c'); v.fillCircle(x + 9, y - 8 - (flee ? 3 : 0), 2.6, '#e8452c');
    v.line(x - 2, y - 7, x - 3, y - 11, '#b8321e', 1); v.line(x + 2, y - 7, x + 3, y - 11, '#b8321e', 1);
    v.fillCircle(x - 3, y - 11, 1.4, '#fff'); v.fillCircle(x + 3, y - 11, 1.4, '#fff');
    v.fillCircle(x - 3, y - 11, 0.7, '#222'); v.fillCircle(x + 3, y - 11, 0.7, '#222');
  }
  function pw18tBucket(v, x, y, full) {
    const ctx = v.ctx;
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y - 7, 5, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#ff9f2e'; ctx.beginPath(); ctx.moveTo(x - 5.5, y - 7); ctx.lineTo(x + 5.5, y - 7); ctx.lineTo(x + 4, y + 2); ctx.lineTo(x - 4, y + 2); ctx.closePath(); ctx.fill();
    if (full) { ctx.fillStyle = '#4aa8f0'; ctx.fillRect(x - 5, y - 7, 10, 2); }
  }
  definePreview('Tide Pool Dig', {
    blurb: 'One digs for buried treasure, the other bails out the waves and shoos crabs!',
    loop: 6.6,
    still: 3.8,
    draw(v, t) {
      const ctx = v.ctx, d = pw18tDepth(t), w = pw18tWater(t), tg = pw18tTongue(t);
      pw18tBeach(v, t);
      // the wave tongue rushing up the beach, and the water pouring into the hole
      if (tg < pw18tSea - 1) {
        ctx.fillStyle = 'rgba(90,170,235,0.8)'; ctx.beginPath(); ctx.moveTo(pw18tSea, pw18tGY + 3); ctx.lineTo(tg + 8, pw18tGY - 1);
        ctx.quadraticCurveTo(tg, pw18tGY - 1, tg, pw18tGY + 1); ctx.lineTo(pw18tSea, pw18tGY + 1); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(tg + 2, pw18tGY - 2, 10, 1.5);
        if (tg < pw18tHX + pw18tHW / 2 + 2 && t > 1.3 && t < 1.95) {
          ctx.fillStyle = 'rgba(90,170,235,0.85)'; ctx.fillRect(pw18tHX + pw18tHW / 2 - 6, pw18tGY, 5, d - w);
        }
      }
      // the chest, once Pip reaches it
      const open = v.ease.out(v.seg(t, 3.5, 3.8));
      if (t >= 3.4) pw18tBox(v, pw18tHX - 1, pw18tGY + pw18tChest, open);
      // Pip in the hole with the shovel (floats up in the water while it's flooded), then climbs out and jumps by the crab
      const climbing = t > 3.95 && t < 4.35, out = t >= 4.35;
      let px = pw18tHX, py = pw18tGY + d - w * 0.6;
      if (t >= 3.4) py = pw18tGY + pw18tChest - 10;
      if (climbing) { const k = (t - 3.95) / 0.4; py = v.lerp(pw18tGY + pw18tChest - 10, pw18tGY, k) + v.hop(k, 12); px = v.lerp(pw18tHX, pw18tHX - 20, k); }
      if (out) { const k = v.seg(t, 4.55, 4.95); px = v.lerp(pw18tHX - 20, 102, v.ease.inOut(k)); py = pw18tGY + v.hop(k, 26); }
      if (t > 5.3) py = pw18tGY + v.hop(v.phase(t, 0.5), 8);
      const digging = t < 1.3 || (t > 2.3 && t < 3.4);
      const stroke = digging ? Math.sin(t * 14) : 0;
      if (t < 5.3) {
        const sxh = px + (out ? -7 : 7), syh = py - 12, ang = out ? Math.PI - 0.9 : 0.9 + stroke * 0.4;
        v.line(sxh, syh, sxh + Math.cos(ang) * 14, syh + Math.sin(ang) * 14, '#8a5a2e', 2);
        ctx.fillStyle = '#9aa4ad'; ctx.beginPath(); ctx.ellipse(sxh + Math.cos(ang) * 16, syh + Math.sin(ang) * 16, 3.4, 2.4, ang, 0, Math.PI * 2); ctx.fill();
      }
      v.hero(0, px, py, { s: 0.9, face: out ? -1 : 1, sq: digging ? stroke * 0.06 : 0, mood: t > 5.3 ? 'joy' : w > 6 ? 'wow' : t > 3.4 && t < 4 ? 'joy' : 'grit', shadow: d < 2 || out });
      if (w > 0) { ctx.fillStyle = 'rgba(70,150,230,0.7)'; ctx.fillRect(pw18tHX - pw18tHW / 2, pw18tGY + d - w, pw18tHW, w); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(pw18tHX - pw18tHW / 2, pw18tGY + d - w, pw18tHW, 1.2); }
      // sand flying out of the hole while Pip digs
      if (digging && d > 4) for (let k = 0; k < 3; k++) { const ph = v.phase(t, 0.38, k * 0.13); v.fillCircle(pw18tHX - 6 - ph * 22, pw18tGY + d * (1 - ph) - 20 * Math.sin(ph * Math.PI), 1.8, '#c9a463'); }
      // Bo with the bucket
      const bx = pw18tBoX(t), walking = (t > 1.7 && t < 2.0) || (t > 2.35 && t < 3.0) || (t > 3.3 && t < 4.0);
      const full = t > 2.1 && t < 3.05, scoopK = v.seg(t, 2.02, 2.28), dumpK = v.seg(t, 3.0, 3.25);
      const boFace = t < 2.35 ? -1 : t < 3.3 ? 1 : -1, cheer = t > 5.3;
      const by = pw18tGY + (cheer ? v.hop(v.phase(t, 0.5, 0.25), 8) : walking ? -Math.abs(Math.sin(t * 12)) * 2 : 0);
      v.hero(1, bx, by, { s: 0.9, face: boFace, sq: full && walking ? 0.08 : 0, mood: cheer ? 'joy' : full ? 'grit' : 'happy' });
      if (!cheer) {
        let kx = bx + boFace * 11, ky = by - 6;
        if (scoopK > 0 && scoopK < 1) { const s = Math.sin(scoopK * Math.PI); kx = v.lerp(bx - 14, pw18tHX + 9, s); ky = v.lerp(by - 6, pw18tGY + d - 6, s); }
        if (dumpK > 0 && dumpK < 1) { kx = bx + 14; ky = by - 12 - Math.sin(dumpK * Math.PI) * 6; }
        pw18tBucket(v, kx, ky, full);
        if (dumpK > 0 && dumpK < 1) for (let k = 0; k < 5; k++) v.fillCircle(kx + 4 + k * 2.5, ky + dumpK * 20 + k * 2, 1.6, '#4aa8f0');
      }
      // the coin shower from the chest onto the blanket
      if (t > 3.6) {
        pw18tCoins.forEach(([cx, cy], i) => {
          if (i === 6 && t > 4.6) return;
          const k = v.seg(t, 3.6 + i * 0.05, 4.0 + i * 0.05);
          const x = v.lerp(pw18tHX, cx, k), y = v.lerp(pw18tGY + pw18tChest - 12, pw18tGY - 3 + cy, k) + v.hop(k, 34);
          pw18tCoin(v, x, y);
        });
        if (t < 4.3) v.sparkle(pw18tHX, pw18tGY + pw18tChest - 16, v.seg(t, 3.6, 4.3));
      }
      // the crab: sneaks out of its burrow, grabs the stray coin, and drops it and runs when Pip lands next to it
      const cx = pw18tCrabX(t), flee = t > 5.0;
      if (cx > -14) {
        pw18tCrab(v, cx, pw18tGY, t, flee);
        if (t > 4.6 && t < 5.0) pw18tCoin(v, cx, pw18tGY - 14);
      }
      if (flee) pw18tCoin(v, 92, pw18tGY - 3);
      // words
      if (t > 1.55 && t < 2.2) v.bubble('Glub!', pw18tHX + 2, pw18tGY + d - w - 26, { size: 9 });
      if (t > 3.05 && t < 3.7) v.label('Sploosh!', 268, 80 - (t - 3.05) * 8, 12, '#bfe8ff');
      if (t > 3.4 && t < 4.0) v.label('CLUNK!', pw18tHX, pw18tGY + 20 - (t - 3.4) * 10, 14, v.c.gold);
      if (t > 4.95 && t < 5.4) v.puff(102, pw18tGY, v.seg(t, 4.95, 5.4));
      if (t > 4.95 && t < 5.7) v.bubble('Shoo!', 106, pw18tGY - 34, { size: 9 });
      if (t > 5.4) v.confetti(130, 70, v.seg(t, 5.4, 6.5));
    },
  });
  // ----- END 18-3 Tide Pool Dig preview -----
  //
  //
  //
  // ----- BEGIN 18-4 Plank Duel preview -----
  // (preview goes here)
  // ----- END 18-4 Plank Duel preview -----
  //
  //
  //
}
