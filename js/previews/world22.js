/* Pip & Bo - Level previews for World 22 Coral Deep (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw22. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 22-1 Submarine Duo preview -----
  // Pip steers the little yellow sub, Bo works the claw: a pearl, then the boulder in the pinch is lifted back into its
  // sandy hole ("Plop!") and the sub glides on through the reef. Confetti.
  const pw22sSand = 150, pw22sPinch = [196, 292];
  const pw22sK = (v, t, a, b) => v.ease.inOut(v.seg(t, a, b));
  // the sub's spot at time t
  const pw22sSubX = (v, t) => {
    let x = v.lerp(46, 100, pw22sK(v, t, 0, 0.9));
    x = v.lerp(x, 150, pw22sK(v, t, 1.55, 2.0));
    x = v.lerp(x, 96, pw22sK(v, t, 2.45, 3.2));
    x = v.lerp(x, 252, pw22sK(v, t, 3.85, 5.1));
    return x;
  };
  // where the boulder is: resting in the pinch, carried, then snug in its hole
  const pw22sRock = (v, t, sx) => {
    if (t < 2.4) return { x: 246, y: 126 };
    if (t < 3.2) { const u = pw22sK(v, t, 2.45, 3.2); return { x: v.lerp(246, 141, u), y: v.lerp(126, 120, u) }; }
    const u = pw22sK(v, t, 3.2, 3.55);
    void sx;
    return { x: 141, y: v.lerp(120, 158, u) };
  };
  const pw22sTip = (v, t, sh) => {
    const rest = { x: sh.x + 28, y: sh.y + 18 };
    if (t < 0.85) return rest;
    if (t < 1.5) { const u = pw22sK(v, t, 0.85, 1.15) * (1 - pw22sK(v, t, 1.3, 1.5)); return { x: v.lerp(rest.x, 166, u), y: v.lerp(rest.y, 129, u) }; }
    if (t < 2.4) { const u = pw22sK(v, t, 1.9, 2.25); return { x: v.lerp(rest.x, 246, u), y: v.lerp(rest.y, 104, u) }; }
    if (t < 3.6) { const r = pw22sRock(v, t); return { x: r.x, y: r.y - 22 }; }
    const u = pw22sK(v, t, 3.6, 3.9); return { x: v.lerp(141, rest.x, u), y: v.lerp(136, rest.y, u) };
  };
  const pw22sBoulder = (v, x, y) => {
    const c = v.ctx;
    c.fillStyle = '#8f96a8'; c.strokeStyle = '#5c6278'; c.lineWidth = 2;
    c.beginPath(); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, r = 24 * (0.92 + ((i * 7) % 5) / 50); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke();
    v.fillCircle(x - 8, y - 9, 5, 'rgba(255,255,255,0.25)'); v.fillCircle(x - 14, y - 14, 3, '#6fbf73'); v.fillCircle(x - 5, y - 20, 2.5, '#6fbf73');
  };
  const pw22sSub = (v, x, y, t, mood) => {
    const c = v.ctx;
    // propeller and fins
    const pa = t * 14;
    c.fillStyle = '#e8eef8'; for (let k = 0; k < 3; k++) { const h = Math.sin(pa + k * 2.1) * 8; c.beginPath(); c.ellipse(x - 34, y + h / 2, 2, Math.abs(h / 2) + 0.5, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#2bb5a8'; c.beginPath(); c.moveTo(x - 22, y - 5); c.lineTo(x - 31, y - 15); c.lineTo(x - 27, y - 3); c.fill(); c.beginPath(); c.moveTo(x - 22, y + 8); c.lineTo(x - 31, y + 17); c.lineTo(x - 27, y + 6); c.fill();
    // dome with the crew
    c.fillStyle = 'rgba(200,240,255,0.55)'; c.beginPath(); c.arc(x, y - 5, 16, Math.PI, 0); c.fill();
    v.hero(1, x - 7, y - 4, { s: 0.42, face: 1, mood, shadow: false });
    v.hero(0, x + 7, y - 4, { s: 0.42, face: 1, mood, shadow: false });
    c.strokeStyle = '#17786f'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y - 5, 16, Math.PI, 0); c.stroke();
    // the hull
    c.fillStyle = '#ffd23f'; c.strokeStyle = '#b8901a'; c.lineWidth = 1.8;
    c.beginPath(); c.ellipse(x, y + 3, 29, 13.5, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#2bb5a8'; v.rr(x - 27, y + 4, 54, 4.5, 2); c.fill();
    for (const px of [-15, 14]) { v.fillCircle(x + px, y + 1, 3.4, '#9fe8ff'); }
    v.fillCircle(x + 28, y, 2.4, '#fff6c0');
  };
  const pw22sArm = (v, ax, ay, tx, ty, shut) => {
    const c = v.ctx, L = 40, d = Math.min(Math.hypot(tx - ax, ty - ay), 2 * L - 1), base = Math.atan2(ty - ay, tx - ax);
    const k = Math.acos(v.clamp(d / (2 * L), -1, 1)), ex = ax + Math.cos(base - k) * L, ey = ay + Math.sin(base - k) * L;
    for (const [col, lw] of [['#17786f', 5.5], ['#2bd0c0', 3.2]]) { c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath(); c.moveTo(ax, ay); c.lineTo(ex, ey); c.lineTo(tx, ty); c.stroke(); }
    v.fillCircle(ax, ay, 3.2, '#ffd23f'); v.fillCircle(ex, ey, 3, '#ffd23f');
    const fa = Math.atan2(ty - ey, tx - ex), op = 1 - shut;
    c.save(); c.translate(tx, ty); c.rotate(fa); c.strokeStyle = '#c8d4e4'; c.lineWidth = 2.6;
    for (const sg of [-1, 1]) { const a = sg * (0.25 + op * 0.7); c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 8, Math.sin(a) * 8); c.stroke(); }
    c.restore();
  };
  definePreview('Submarine Duo', {
    blurb: 'One steers the sub, one works the claw. Lift the boulder out of the way!',
    loop: 6.2, still: 2.9,
    draw(v, t) {
      const c = v.ctx;
      // the water, sunbeams and a far reef
      const g = c.createLinearGradient(0, 0, 0, 180); g.addColorStop(0, '#6fe0ec'); g.addColorStop(1, '#2496c6');
      c.fillStyle = g; c.fillRect(0, 0, 320, 180);
      c.fillStyle = 'rgba(255,255,240,0.13)';
      for (let k = 0; k < 4; k++) { const x = k * 90 - 20 + Math.sin(t + k) * 6; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 24, 0); c.lineTo(x + 80, 160); c.lineTo(x + 56, 160); c.fill(); }
      c.fillStyle = '#47b9d2'; c.beginPath(); c.moveTo(0, 180); for (let x = 0; x <= 320; x += 10) c.lineTo(x, 128 + Math.sin(x * 0.03) * 8); c.lineTo(320, 180); c.fill();
      // the coral roof, with the pinch over the boulder
      c.fillStyle = '#f08aa0'; c.strokeStyle = '#c25d7a'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(0, -2); c.lineTo(0, 26);
      for (let x = 0; x <= 320; x += 4) { const u = x < pw22sPinch[0] - 20 ? 0 : x < pw22sPinch[0] ? (x - pw22sPinch[0] + 20) / 20 : x < pw22sPinch[1] ? 1 : x < pw22sPinch[1] + 20 ? 1 - (x - pw22sPinch[1]) / 20 : 0; c.lineTo(x, 26 + v.ease.inOut(v.clamp(u, 0, 1)) * 54); }
      c.lineTo(320, -2); c.closePath(); c.fill(); c.stroke();
      // the sand, with the hole the boulder fits in
      c.fillStyle = '#f6e2a8'; c.fillRect(0, pw22sSand, 320, 30);
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(0, pw22sSand, 320, 2);
      const plopped = t > 3.55;
      if (!plopped) { c.fillStyle = '#2b8fb8'; c.beginPath(); c.ellipse(141, pw22sSand, 26, 22, 0, 0, Math.PI); c.fill(); }
      v.star(30, pw22sSand + 12, 5, '#ff8a6a', 0.3); v.star(300, pw22sSand + 16, 4, '#ff8a6a', 0.8);
      // a pearl in an open oyster
      if (t < 1.2) { c.fillStyle = '#9a8ab0'; c.beginPath(); c.ellipse(166, pw22sSand - 14, 9, 3.5, 0, 0, Math.PI); c.fill(); v.fillCircle(166, pw22sSand - 19, 4.5, '#ffffff'); }
      v.sparkle(166, pw22sSand - 22, v.seg(t, 1.2, 1.8), '#ffffff', 9);
      // little fish
      for (let i = 0; i < 4; i++) { const fx = (300 - t * 26 + i * 18) % 340, fy = 52 + i * 6 + Math.sin(t * 2 + i) * 3; c.fillStyle = '#ffd36b'; c.beginPath(); c.ellipse(fx, fy, 4.5, 2.6, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(fx + 4, fy); c.lineTo(fx + 8, fy - 3); c.lineTo(fx + 8, fy + 3); c.fill(); }
      const sx = pw22sSubX(v, t), sy = 92 + 16 * pw22sK(v, t, 3.7, 4.2) + Math.sin(t * 2.2) * 1.5, sh = { x: sx + 19, y: sy + 12 };
      const rock = pw22sRock(v, t, sx), tip = pw22sTip(v, t, sh);
      // the boulder (snug in its hole after the plop: the sand covers its bottom)
      if (plopped) { c.save(); c.beginPath(); c.rect(100, 0, 90, pw22sSand + 1); c.clip(); pw22sBoulder(v, rock.x, rock.y); c.restore(); }
      else pw22sBoulder(v, rock.x, rock.y);
      const shut = (t > 1.15 && t < 1.45) || (t > 2.25 && t < 3.55) ? 1 : 0;
      const done = t > 3.6;
      pw22sSub(v, sx, sy, t, done ? 'joy' : 'happy');
      pw22sArm(v, sh.x, sh.y, tip.x, tip.y, shut);
      // bubbles from the propeller
      for (let i = 0; i < 4; i++) { const k = v.phase(t, 0.8, i * 0.2); v.circle(sx - 38 - k * 10, sy - k * 22, 1.5 + k * 1.5); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1; c.stroke(); }
      if (t > 3.55 && t < 4.6) v.label('Plop!', 141, 120 - v.seg(t, 3.55, 4.6) * 10, 16, v.c.gold);
      if (t > 1.2 && t < 1.9) v.label('Pearl!', 166, 112, 12, '#ffffff');
      if (t > 5.0) { v.confetti(sx, sy - 20, v.seg(t, 5.0, 6.1), 18); v.pill('Way clear!', 160, 160, { size: 11, col: v.c.gold }); }
    },
  });
  // ----- END 22-1 Submarine Duo preview -----

  // ----- BEGIN 22-2 Treasure Diver Rope preview -----
  // Bo in the boat lets out the rope and pumps air; Pip in a brass helmet sinks past a gem (got it), hooks the chest on
  // the sand, and Bo reels Pip back up. The chest opens in the boat: sparkles and confetti. A sleepy eel snoozes.
  const pw22dSurf = 40, pw22dSand = 162;
  // the diver's spot at time t (feet)
  const pw22dDiver = (v, t) => {
    const down = v.ease.inOut(v.seg(t, 0.3, 2.1)), up = v.ease.inOut(v.seg(t, 2.8, 4.5));
    const y = v.lerp(v.lerp(64, pw22dSand - 2, down), 50, up), x = v.lerp(v.lerp(176, 196, down), 186, up);
    return { x: x + Math.sin(t * 2.6) * (1 - up) * 2, y };
  };
  const pw22dChest = (v, x, y, open) => {
    const c = v.ctx;
    c.fillStyle = '#a0643a'; c.strokeStyle = v.c.ink; c.lineWidth = 1.6;
    v.rr(x - 13, y - 13, 26, 13, 2); c.fill(); c.stroke();
    c.save(); c.translate(x - 13, y - 13); c.rotate(-open * 1.8);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(26, 0); c.quadraticCurveTo(26, -9, 13, -9); c.quadraticCurveTo(0, -9, 0, 0); c.closePath(); c.fill(); c.stroke();
    c.restore();
    if (open > 0) { v.fillCircle(x, y - 15, 11 * open, 'rgba(255,230,120,0.7)'); for (let i = 0; i < 4; i++) v.fillCircle(x - 7 + i * 5, y - 13, 2.4, ['#ff5fa2', '#5fd0ff', '#8fe36b', '#ffd34a'][i]); }
    c.fillStyle = '#ffd34a'; c.fillRect(x - 9, y - 13, 3, 13); c.fillRect(x + 6, y - 13, 3, 13); v.rr(x - 3, y - 15, 6, 6, 1); c.fill();
  };
  const pw22dHelmet = (v, x, y, s, t) => {
    const c = v.ctx, cy = y - 13 * s;
    c.fillStyle = '#d99a3a'; c.strokeStyle = '#7a4e14'; c.lineWidth = 1.4;
    v.circle(x, y - 14 * s, 11.5 * s); c.fill(); c.stroke();
    v.hero(0, x, y, { s, face: 1, mood: t > 4.5 ? 'joy' : 'happy', shadow: false });
    c.strokeStyle = '#e8b04a'; c.lineWidth = 4.5 * s; c.beginPath(); c.arc(x, y - 14 * s, 13 * s, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
    c.fillStyle = '#c8862a'; v.rr(x - 3 * s, y - 31 * s, 6 * s, 5 * s, 1); c.fill();
    c.strokeStyle = '#e8b04a'; c.lineWidth = 3.6 * s; v.circle(x + 2 * s, cy - 1 * s, 8.5 * s); c.stroke();
    c.strokeStyle = '#7a4e14'; c.lineWidth = 1; v.circle(x + 2 * s, cy - 1 * s, 10.5 * s); c.stroke();
    c.fillStyle = 'rgba(200,240,255,0.25)'; v.circle(x + 2 * s, cy - 1 * s, 6.5 * s); c.fill();
    c.fillStyle = '#e8b04a'; v.rr(x - 10 * s, y - 7 * s, 20 * s, 4 * s, 2); c.fill();
    c.fillStyle = '#5a5f78'; v.rr(x - 8 * s, y - 3 * s, 6 * s, 4 * s, 1); c.fill(); v.rr(x + 2 * s, y - 3 * s, 6 * s, 4 * s, 1); c.fill();
  };
  definePreview('Treasure Diver Rope', {
    blurb: 'One dives for treasure, one pumps the air and reels them up. Bring it home!',
    loop: 6.4, still: 2.4,
    draw(v, t) {
      const c = v.ctx;
      // sky, sea, sunbeams
      const sk = c.createLinearGradient(0, 0, 0, pw22dSurf); sk.addColorStop(0, '#7fd3ff'); sk.addColorStop(1, '#dff7ff');
      c.fillStyle = sk; c.fillRect(0, 0, 320, pw22dSurf);
      v.fillCircle(272, 16, 9, 'rgba(255,248,205,0.95)');
      const g = c.createLinearGradient(0, pw22dSurf, 0, 180); g.addColorStop(0, '#68e2ec'); g.addColorStop(1, '#2384c4');
      c.fillStyle = g; c.fillRect(0, pw22dSurf, 320, 180 - pw22dSurf);
      c.fillStyle = 'rgba(255,255,255,0.12)';
      for (let k = 0; k < 4; k++) { const x = 20 + k * 80 + Math.sin(t * 0.8 + k) * 5; c.beginPath(); c.moveTo(x, pw22dSurf); c.lineTo(x + 18, pw22dSurf); c.lineTo(x + 70, 180); c.lineTo(x + 50, 180); c.fill(); }
      // rocks, sand, kelp, coral
      c.fillStyle = '#e2b07c'; c.strokeStyle = 'rgba(28,26,54,0.35)'; c.lineWidth = 1.5;
      v.rr(-20, 96, 74, 100, 12); c.fill(); c.stroke(); v.rr(262, 74, 80, 120, 12); c.fill(); c.stroke();
      c.fillStyle = '#f2dca0'; c.fillRect(0, pw22dSand, 320, 20); c.fillStyle = '#fff0c4'; c.fillRect(0, pw22dSand, 320, 3);
      c.strokeStyle = '#3f9a5a'; c.lineWidth = 4; c.lineCap = 'round';
      for (const kx of [86, 120, 236]) { c.beginPath(); c.moveTo(kx, pw22dSand); for (let i = 1; i <= 5; i++) c.lineTo(kx + Math.sin(t * 1.4 + kx + i * 0.6) * 4 * i / 5, pw22dSand - i * 12); c.stroke(); }
      for (const [cx, col] of [[20, '#ff7aa8'], [40, '#c38bff'], [290, '#ffb36b']]) { c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.moveTo(cx, cx < 100 ? 96 : 74); c.lineTo(cx - 4, (cx < 100 ? 96 : 74) - 9); c.moveTo(cx, cx < 100 ? 96 : 74); c.lineTo(cx + 4, (cx < 100 ? 96 : 74) - 10); c.stroke(); }
      // the sleepy eel in its hole (wakes a little as the diver passes)
      c.fillStyle = 'rgba(20,18,48,0.75)'; c.beginPath(); c.ellipse(264, 128, 6, 9, 0, 0, Math.PI * 2); c.fill();
      const peek = 6 + v.ease.inOut(v.pingpong(v.seg(t, 3.0, 4.4))) * 6;
      c.fillStyle = '#5cc77a'; c.strokeStyle = '#2f7f4a'; c.lineWidth = 1.4; c.beginPath(); c.ellipse(264 - peek, 128, 8, 6, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.strokeStyle = v.c.ink; c.lineWidth = 1.2; c.beginPath(); c.arc(260 - peek, 127, 1.8, 0.2, Math.PI - 0.2); c.stroke();
      const zt = v.phase(t, 1.6);
      c.globalAlpha = 1 - zt; v.label('z', 256 - peek - zt * 6, 116 - zt * 12, 8 + zt * 4, '#ffffff'); c.globalAlpha = 1;
      // a gem on the way down (picked up at about 1.1 s)
      const dv = pw22dDiver(v, t), got = t > 1.05 && t < 6.2;
      if (!got) { c.fillStyle = '#ff5fa2'; c.strokeStyle = v.c.ink; c.lineWidth = 1.4; c.beginPath(); c.moveTo(186, 100); c.lineTo(192, 106); c.lineTo(186, 114); c.lineTo(180, 106); c.closePath(); c.fill(); c.stroke(); }
      v.sparkle(186, 106, v.seg(t, 1.05, 1.6), '#ffffff', 8);
      // the chest: on the sand, hooked and hanging, then open in the boat
      const hooked = t > 2.4 && t < 4.6, inBoat = t >= 4.6;
      if (!hooked && !inBoat) pw22dChest(v, 204, pw22dSand + 1, 0);
      // the boat
      const bob = Math.sin(t * 2.2) * 1.2, bx = 150, by = pw22dSurf + bob;
      const reel = t > 2.7 && t < 4.5, outR = t > 0.3 && t < 1.2 || t > 1.5 && t < 2.1, pump = t > 1.15 && t < 1.55 || t > 2.1 && t < 2.6;
      const ca = reel ? -t * 9 : outR ? t * 9 : 0, pd = pump ? Math.abs(Math.sin(t * 16)) * 4 : 0;
      c.strokeStyle = '#5e3c1e'; c.lineWidth = 2; c.beginPath(); c.moveTo(bx - 34, by - 8); c.lineTo(bx - 34, by - 40); c.stroke();
      c.fillStyle = v.c.bo; c.beginPath(); c.moveTo(bx - 34, by - 40); c.lineTo(bx - 20, by - 36); c.lineTo(bx - 34, by - 32); c.fill();
      c.fillStyle = '#c9955a'; v.rr(bx - 30, by - 20, 11, 12, 2); c.fill(); c.fillStyle = '#5e3c1e'; v.rr(bx - 31, by - 26 + pd, 13, 3, 1.5); c.fill();
      v.hero(1, bx - 9, by - 7 - pd * 0.4, { s: 0.62, face: reel || outR ? 1 : -1, mood: inBoat ? 'joy' : 'happy', shadow: false });
      v.fillCircle(bx + 22, by - 13, 5, '#efe0b0'); v.line(bx + 22, by - 13, bx + 22 + Math.cos(ca) * 7, by - 13 + Math.sin(ca) * 7, '#5e3c1e', 2);
      // the hose down to the helmet
      const hy = dv.y - 24;
      c.strokeStyle = '#6b4a22'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(bx + 22, by - 10); c.quadraticCurveTo(bx + 24 + Math.sin(t * 2) * 4, (by + hy) / 2, dv.x, hy); c.stroke();
      c.strokeStyle = '#efe0b0'; c.lineWidth = 2; c.stroke();
      if (pump) { const u = v.phase(t, 0.4); v.fillCircle(v.lerp(bx + 22, dv.x, u), v.lerp(by - 10, hy, u), 2.2, '#ffffff'); }
      c.fillStyle = '#b5743e'; c.strokeStyle = v.c.ink; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(bx - 46, by - 8); c.lineTo(bx + 46, by - 8); c.quadraticCurveTo(bx + 42, by + 7, bx + 28, by + 8); c.lineTo(bx - 28, by + 8); c.quadraticCurveTo(bx - 42, by + 7, bx - 46, by - 8); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ffffff'; c.fillRect(bx - 44, by - 5, 88, 2.5);
      c.fillStyle = 'rgba(255,255,255,0.6)'; for (let x = 0; x < 320; x += 16) c.fillRect(x, pw22dSurf + Math.sin(t * 2.4 + x * 0.05) * 1.5, 10, 2);
      // the diver (and the hooked chest under them), then the chest open in the boat
      if (hooked) pw22dChest(v, dv.x + 6, dv.y + 16, 0);
      if (!inBoat) pw22dHelmet(v, dv.x, dv.y, 0.8, t);
      else {
        const u = v.ease.back(v.seg(t, 4.5, 4.9));
        pw22dHelmet(v, bx + 4, by - 8 - u * 6, 0.62, t);
        pw22dChest(v, bx + 30, by - 8, v.ease.out(v.seg(t, 4.8, 5.3)));
      }
      // bubbles from the helmet
      for (let i = 0; i < 4; i++) { const u = v.phase(t, 1.4, i * 0.35); if (inBoat) break; c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1; v.circle(dv.x + 6 + Math.sin(u * 9 + i) * 2, dv.y - 30 - u * 40, 1.6 + u * 1.5); c.stroke(); }
      if (t > 2.3 && t < 2.9) v.bubble('Grab!', dv.x + 4, dv.y - 34);
      if (t > 2.9 && t < 3.8) v.bubble('Reel up!', bx + 66, by - 4);
      v.confetti(bx + 30, by - 20, v.seg(t, 4.9, 6.2), 20);
      if (t > 5.0) v.label('Treasure!', 160, 78, 18, v.c.gold);
    },
  });
  // ----- END 22-2 Treasure Diver Rope preview -----

  // ----- BEGIN 22-3 Shipwreck Lights preview -----
  // Inside the dark sunken ship: Pip swims in carrying Glimmer the lantern fish, and its light shows a hidden lever.
  // Bo pulls it ("Clunk!"), the door slides up; Pip flashes and the grumpy pufferfish behind it says "Eek!" and swims
  // off; Bo grabs the coins the light shows. Confetti.
  const pw22wK = (v, t, a, b) => v.ease.inOut(v.seg(t, a, b));
  // Pip (the lantern) and Bo (the grabber): where they swim
  const pw22wPip = (v, t) => ({ x: v.lerp(v.lerp(v.lerp(30, 150, pw22wK(v, t, 0, 1.4)), 196, pw22wK(v, t, 3.0, 3.6)), 258, pw22wK(v, t, 4.3, 5.0)), y: v.lerp(v.lerp(96, 78, pw22wK(v, t, 0.4, 1.4)), 104, pw22wK(v, t, 4.3, 5.0)) + Math.sin(t * 2.4) * 2 });
  const pw22wBo = (v, t) => ({ x: v.lerp(v.lerp(v.lerp(6, 168, pw22wK(v, t, 0.3, 1.7)), 214, pw22wK(v, t, 3.1, 3.7)), 280, pw22wK(v, t, 4.4, 5.2)), y: v.lerp(v.lerp(130, 100, pw22wK(v, t, 0.8, 1.7)), 136, pw22wK(v, t, 4.4, 5.0)) + Math.sin(t * 2.1 + 1) * 2 });
  const pw22wGlimmer = (v, x, y, t) => {
    const c = v.ctx;
    v.fillCircle(x, y, 13, 'rgba(255,250,200,0.45)');
    c.fillStyle = '#ffc94a'; c.beginPath(); c.moveTo(x - 6, y); c.lineTo(x - 12, y - 4 + Math.sin(t * 9)); c.lineTo(x - 12, y + 4 - Math.sin(t * 9)); c.fill();
    c.fillStyle = '#ffd23f'; c.beginPath(); c.ellipse(x, y, 7, 6, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#d99a2a'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 2, y - 5); c.quadraticCurveTo(x + 5, y - 11, x + 9, y - 8); c.stroke();
    v.fillCircle(x + 9, y - 8, 2.4, '#ffffff');
    v.fillCircle(x + 3, y - 1, 2.4, '#ffffff'); v.fillCircle(x + 3.6, y - 1, 1.3, '#1c1a36');
  };
  const pw22wPuffer = (v, x, y, r, mood) => {
    const c = v.ctx;
    c.fillStyle = '#f2a03a'; c.beginPath(); c.moveTo(x + r * 0.8, y); c.lineTo(x + r * 1.4, y - r * 0.4); c.lineTo(x + r * 1.4, y + r * 0.4); c.fill();
    if (mood === 'eek') { c.strokeStyle = '#c87a1a'; c.lineWidth = 1.4; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; c.beginPath(); c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.lineTo(x + Math.cos(a) * (r + 4), y + Math.sin(a) * (r + 4)); c.stroke(); } }
    v.fillCircle(x, y, r, '#ffd25a');
    v.fillCircle(x - r * 0.35, y - r * 0.2, r * 0.2, '#ffffff'); v.fillCircle(x - r * 0.35, y - r * 0.18, r * 0.1, '#1c1a36');
    c.strokeStyle = '#7a4a10'; c.lineWidth = 1.4;
    if (mood === 'grump') { c.beginPath(); c.moveTo(x - r * 0.62, y - r * 0.5); c.lineTo(x - r * 0.15, y - r * 0.38); c.stroke(); c.beginPath(); c.arc(x - r * 0.3, y + r * 0.45, r * 0.18, Math.PI + 0.3, -0.3); c.stroke(); }
    else if (mood === 'eek') { v.circle(x - r * 0.3, y + r * 0.35, r * 0.12); c.stroke(); }
    else { c.beginPath(); c.arc(x - r * 0.3, y + r * 0.25, r * 0.2, 0.2, Math.PI - 0.2); c.stroke(); }
  };
  definePreview('Shipwreck Lights', {
    blurb: 'One carries a glowing lantern fish, one opens the doors in its light.',
    loop: 6.4, still: 2.2,
    draw(v, t) {
      const c = v.ctx;
      // the ship's hull: planks, ribs, a porthole, the floor
      c.fillStyle = '#5f8fa0'; c.fillRect(0, 0, 320, 180);
      for (let r = 0; r < 7; r++) { c.fillStyle = r % 2 ? '#578797' : '#5f8fa0'; c.fillRect(0, 24 + r * 20, 320, 20); }
      c.fillStyle = '#3f6d7e'; for (let x = 40; x < 320; x += 110) c.fillRect(x, 24, 10, 140);
      c.fillStyle = '#5a3b20'; c.fillRect(0, 0, 320, 24); c.fillStyle = '#77522f'; c.fillRect(0, 16, 320, 8);
      c.fillStyle = '#9c7c48'; c.fillRect(0, 160, 320, 20); c.fillStyle = '#c7a46a'; c.fillRect(0, 160, 320, 4);
      v.fillCircle(96, 60, 12, '#e8c35a'); v.fillCircle(96, 60, 9, '#7fd8ea');
      // the barrel and a sleepy crab
      c.fillStyle = '#9a6a3e'; v.rr(18, 136, 22, 26, 6); c.fill();
      c.fillStyle = '#ff7a5c'; c.beginPath(); c.ellipse(128, 160, 9, 6, 0, Math.PI, Math.PI * 2); c.fill();
      // the bulkhead and its door (slides up once the lever is pulled)
      const open = pw22wK(v, t, 2.3, 3.0);
      c.fillStyle = '#77522f'; c.fillRect(226, 24, 18, 40);
      c.save(); c.beginPath(); c.rect(224, 64, 22, 96); c.clip();
      c.fillStyle = '#8c6440'; c.fillRect(227, 64 - open * 96, 16, 96); c.fillStyle = '#56606c'; c.fillRect(227, 90 - open * 96, 16, 4); c.fillRect(227, 130 - open * 96, 16, 4);
      c.restore();
      // hidden things: the lever, the coins (only seen in the light, see the darkness below)
      const pulled = t > 1.95;
      c.fillStyle = '#56606c'; v.rr(204, 52, 14, 11, 3); c.fill();
      c.save(); c.translate(211, 58); c.rotate(pulled ? 0.7 : -0.7); c.fillStyle = '#d9b45a'; c.fillRect(-1.5, -13, 3, 13); v.fillCircle(0, -14, 3.5, '#ff6b6b'); c.restore();
      const coins = [[262, 120, 4.95], [282, 132, 5.15], [302, 120, 5.35]];
      for (const [x, y, got] of coins) if (t < got) { const sq = Math.abs(Math.cos(t * 3 + x)); c.fillStyle = '#ffd96b'; c.beginPath(); c.ellipse(x, y, 4.5 * (0.3 + 0.7 * sq), 4.5, 0, 0, Math.PI * 2); c.fill(); }
      // the grumpy pufferfish behind the door, shooed by the flash
      const flashT = 3.55, pu = pw22wK(v, t, flashT + 0.35, flashT + 1.3);
      const px = v.lerp(272, 300, pu), py = v.lerp(100, 40, pu) - Math.sin(pu * Math.PI) * 10;
      pw22wPuffer(v, px, py, t > flashT && t < flashT + 0.6 ? 14 : 11, t < flashT ? 'grump' : t < flashT + 1.3 ? 'eek' : 'happy');
      // the darkness: a deep blue all over, with Glimmer's soft light circle (bigger in the flash)
      const pp = pw22wPip(v, t), bp = pw22wBo(v, t), gx = pp.x + 14, gy = pp.y - 16;
      const fl = t > flashT ? Math.max(0, 1 - Math.abs(t - flashT - 0.25) / 0.6) : 0;
      const R = 62 + fl * 90;
      const g = c.createRadialGradient(gx, gy, 0, gx, gy, R);
      g.addColorStop(0, 'rgba(8,18,52,0)'); g.addColorStop(0.55, 'rgba(8,18,52,0)'); g.addColorStop(1, 'rgba(8,18,52,0.8)');
      c.fillStyle = g; c.fillRect(0, 0, 320, 180);
      // plankton specks glow in the dark
      for (let k = 0; k < 12; k++) v.fillCircle((k * 53 + t * 4) % 320, 34 + (k * 37) % 120, 1.2, 'rgba(200,255,245,' + (0.4 + 0.3 * Math.sin(t * 2 + k)) + ')');
      // the players (bright on top of the dark), Glimmer, the claw
      v.hero(1, bp.x, bp.y + 12, { s: 0.85, face: 1, mood: t > 5.4 ? 'joy' : 'happy', shadow: false, rot: Math.sin(t * 2) * 0.05 });
      const reach = t > 1.6 && t < 2.1 ? 6 : 0;
      c.strokeStyle = '#d9b45a'; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(bp.x + 5, bp.y + 2); c.lineTo(bp.x + 14 + reach, bp.y); c.stroke();
      v.hero(0, pp.x, pp.y + 12, { s: 0.85, face: 1, mood: t > 5.4 ? 'joy' : 'happy', shadow: false, rot: Math.sin(t * 2.4) * 0.05 });
      pw22wGlimmer(v, gx, gy, t);
      if (fl > 0) v.fillCircle(gx, gy, R * 0.6, 'rgba(255,250,210,' + fl * 0.25 + ')');
      // words
      if (t > 1.95 && t < 2.8) v.label('Clunk!', 211, 36 - v.seg(t, 1.95, 2.8) * 6, 13, v.c.gold);
      if (t > flashT + 0.1 && t < flashT + 1.1) v.label('Eek!', px, py - 18, 13, '#ffe27a');
      if (t > 4.95 && t < 5.9) v.label('+3', 282, 108 - v.seg(t, 4.95, 5.9) * 8, 12, v.c.gold);
      if (t > 5.3) v.confetti(250, 80, v.seg(t, 5.3, 6.3), 16);
      if (t < 1.4) v.pill('Glimmer lights the way', 160, 166, { size: 10, col: '#e6fbff' });
    },
  });
  // ----- END 22-3 Shipwreck Lights preview -----

  // ----- BEGIN 22-4 Dolphin Race preview -----
  // Pip and Bo race their dolphins. Pip dives, then leaps high out of the water through a gold hoop ("Zoom!"); Bo gets
  // tangled in a seaweed patch; Pip swims first through the coral arch: confetti.
  const pw22rLoop = 6.6, pw22rArch = 520, pw22rSurf = 82, pw22rBed = 166, pw22rHoop = { x: 216, y: 42 }, pw22rWeed = 250;
  // (slows down past the arch so Pip stays in the picture for the cheer)
  const pw22rPipX = t => Math.min(30 + 72 * t + 40 * Math.max(0, t - 2.575), pw22rArch + 1 + 18 * Math.max(0, t - 5.3));
  const pw22rPipY = (v, t) => {
    if (t < 1.3) return 100 + 2 * Math.sin(t * 3);
    if (t < 1.9) return v.lerp(100, 138, v.ease.inOut(v.seg(t, 1.3, 1.9)));
    if (t < 2.2) return v.lerp(138, pw22rSurf, Math.pow(v.seg(t, 1.9, 2.2), 1.3));
    if (t < 2.95) { const u = (t - 2.2) / 0.75; return pw22rSurf - 4 * 44 * u * (1 - u); }
    if (t < 3.5) { const k = v.seg(t, 2.95, 3.5); return v.lerp(pw22rSurf, 100, k) + 14 * Math.sin(k * Math.PI); }
    return 100 + 2 * Math.sin(t * 3);
  };
  const pw22rBoX = (v, t) => 18 + 72 * t - 38 * v.clamp(t - 3.2, 0, 0.9);
  const pw22rBoY = t => 128 + 2 * Math.sin(t * 2.6 + 1);
  // a dolphin side-on (nose right) with its rider, at (x, y), tilted a
  const pw22rDolphin = (v, id, x, y, a, mood, t) => {
    const c = v.ctx, main = id ? '#6fb3c8' : '#a9a8dc', dark = id ? '#4f8fa8' : '#8584be', belly = id ? '#e6f7ff' : '#f7ecff';
    c.save(); c.translate(x, y); c.rotate(a); c.scale(0.55, 0.55);
    v.hero(id, -3, -13, { s: 0.8, face: 1, mood, shadow: false });
    const fa = Math.sin(t * 10 + id) * 0.35;
    c.save(); c.translate(-34, -2); c.rotate(fa);
    c.fillStyle = dark; c.beginPath(); c.moveTo(4, 0); c.quadraticCurveTo(-8, -4, -18, -14); c.quadraticCurveTo(-12, 0, -18, 13); c.quadraticCurveTo(-8, 4, 4, 0); c.closePath(); c.fill();
    c.restore();
    c.fillStyle = main; c.beginPath(); c.moveTo(-36, -2); c.bezierCurveTo(-20, -18, 12, -20, 28, -8); c.quadraticCurveTo(38, -4, 46, -1);
    c.quadraticCurveTo(48, 2, 44, 4); c.quadraticCurveTo(36, 6, 28, 8); c.bezierCurveTo(10, 16, -18, 12, -36, 2); c.closePath(); c.fill();
    c.fillStyle = belly; c.beginPath(); c.moveTo(-26, 4); c.bezierCurveTo(-8, 12, 16, 12, 32, 6); c.quadraticCurveTo(14, 6, -26, 4); c.closePath(); c.fill();
    c.fillStyle = dark; c.beginPath(); c.moveTo(-14, -13); c.quadraticCurveTo(-18, -26, -26, -30); c.quadraticCurveTo(-12, -26, -2, -15); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(8, 6); c.quadraticCurveTo(2, 18, -6, 20); c.quadraticCurveTo(0, 12, 0, 6); c.closePath(); c.fill();
    c.fillStyle = id ? v.c.bo : v.c.pip; v.rr(-12, -17, 20, 7, 3.5); c.fill();
    v.fillCircle(30, -5, 2.6, v.c.ink); v.fillCircle(30.8, -5.8, 1, '#fff');
    c.strokeStyle = 'rgba(40,40,70,0.7)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(32, 3); c.quadraticCurveTo(38, 5, 44, 2); c.stroke();
    c.restore();
  };
  const pw22rAngle = (v, fx, fy, t) => v.clamp(Math.atan2(fy(t + 0.03) - fy(t - 0.03), fx(t + 0.03) - fx(t - 0.03)), -0.8, 0.8);
  definePreview('Dolphin Race', {
    blurb: 'Ride a dolphin! Leap through gold hoops for speed, dodge the seaweed.',
    loop: pw22rLoop,
    still: 2.55,
    draw(v, t) {
      const c = v.ctx, px = pw22rPipX(t), py = pw22rPipY(v, t), bx = pw22rBoX(v, t), by = pw22rBoY(t);
      const cam = v.clamp(px - 140, 0, pw22rArch - 250), sx = x => x - cam;
      // sky, sun, clouds, a palm island
      let g = c.createLinearGradient(0, 0, 0, pw22rSurf); g.addColorStop(0, '#4fc3f0'); g.addColorStop(1, '#c6f0ff');
      c.fillStyle = g; c.fillRect(0, 0, v.W, pw22rSurf);
      v.fillCircle(270, 26, 20, 'rgba(255,248,205,0.5)'); v.fillCircle(270, 26, 12, '#fff7d6');
      for (let i = 0; i < 4; i++) { const x = ((i * 110 - cam * 0.2) % 440 + 440) % 440 - 60; v.cloud(x, 22 + (i % 2) * 18, 0.7); }
      const ix = ((140 - cam * 0.25) % 420 + 420) % 420 - 60;
      c.fillStyle = '#8fd0a0'; c.beginPath(); c.moveTo(ix - 50, pw22rSurf); c.quadraticCurveTo(ix, pw22rSurf - 26, ix + 50, pw22rSurf); c.fill();
      v.line(ix, pw22rSurf - 12, ix + 5, pw22rSurf - 32, '#9a6a3e', 2.5);
      c.fillStyle = '#3fae5a'; for (let k = -2; k <= 2; k++) { c.save(); c.translate(ix + 5, pw22rSurf - 32); c.rotate(-Math.PI / 2 + k * 0.62); c.beginPath(); c.ellipse(8, 0, 9, 2.5, 0.25, 0, Math.PI * 2); c.fill(); c.restore(); }
      // the sea, sunbeams, the seabed
      g = c.createLinearGradient(0, pw22rSurf, 0, v.H); g.addColorStop(0, '#52d9d6'); g.addColorStop(0.5, '#2a9fc4'); g.addColorStop(1, '#17699a');
      c.fillStyle = g; c.fillRect(0, pw22rSurf, v.W, v.H - pw22rSurf);
      c.fillStyle = 'rgba(255,255,240,0.09)';
      for (let i = 0; i < 4; i++) { const x = ((i * 100 - cam * 0.4) % 400 + 400) % 400 - 60; c.beginPath(); c.moveTo(x, pw22rSurf); c.lineTo(x + 22, pw22rSurf); c.lineTo(x + 66, pw22rBed); c.lineTo(x + 30, pw22rBed); c.closePath(); c.fill(); }
      c.fillStyle = '#f6e2a6'; c.fillRect(0, pw22rBed, v.W, v.H - pw22rBed);
      for (let i = -1; i < 9; i++) {
        const n = Math.floor(cam / 44) + i, x = n * 44 - cam, col = ['#ff7f9f', '#ffa25a', '#c88dff'][((n % 3) + 3) % 3];
        if (v.rand(n) < 0.5) { v.line(x, pw22rBed + 2, x, pw22rBed - 5, col, 2.5); for (const k of [-1, 0, 1]) { v.line(x, pw22rBed - 4, x + k * 6, pw22rBed - 11 - (k ? 0 : 3), col, 2.5); v.fillCircle(x + k * 6, pw22rBed - 11 - (k ? 0 : 3), 1.8, col); } }
      }
      // the seaweed patch Bo bumps into
      const wx = sx(pw22rWeed);
      if (wx > -30 && wx < v.W + 30) for (const [dx, col] of [[-5, '#2f8f4a'], [5, '#3fa85a'], [0, '#5fc86a']]) {
        c.strokeStyle = col; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(wx + dx, pw22rBed + 4);
        for (let k = 1; k <= 6; k++) c.lineTo(wx + dx + Math.sin(t * 1.6 + k * 0.8 + dx) * (1 + k * 0.6), pw22rBed + 4 - (pw22rBed - 102) * k / 6);
        c.stroke(); c.lineCap = 'butt';
      }
      // the coral arch at the finish
      const ax = sx(pw22rArch);
      if (ax < v.W + 60) {
        c.strokeStyle = '#ff8fa8'; c.lineWidth = 9; c.lineCap = 'round';
        c.beginPath(); c.moveTo(ax - 32, pw22rBed); c.quadraticCurveTo(ax - 40, pw22rSurf - 20, ax, pw22rSurf - 62); c.quadraticCurveTo(ax + 40, pw22rSurf - 20, ax + 32, pw22rBed); c.stroke(); c.lineCap = 'butt';
        for (let y = pw22rSurf - 50, k = 0; y < pw22rBed; y += 8, k++) { c.fillStyle = k % 2 ? '#fff' : '#5a4a8a'; c.fillRect(ax - 2, y, 4, 8); }
      }
      // the gold hoop (back half), on its float pole
      const hx = sx(pw22rHoop.x), got = t > 2.575;
      v.line(hx, pw22rHoop.y + 15, hx, pw22rSurf, 'rgba(255,255,255,0.8)', 1);
      c.lineWidth = 3; c.strokeStyle = got ? 'rgba(255,214,90,0.55)' : v.c.gold;
      c.beginPath(); c.ellipse(hx, pw22rHoop.y, 5, 15, 0, Math.PI / 2, Math.PI * 1.5); c.stroke();
      // the dolphins (Bo behind)
      const boBump = t > 3.2 && t < 3.9, boA = boBump ? Math.sin((t - 3.2) * 26) * 0.3 : 0.04 * Math.sin(t * 2);
      pw22rDolphin(v, 1, sx(bx), by, boA, boBump ? 'dizzy' : 'happy', t);
      const pipA = pw22rAngle(v, pw22rPipX, x => pw22rPipY(v, x), t);
      pw22rDolphin(v, 0, sx(px), py, pipA, t > 5.3 ? 'joy' : t > 2.2 && t < 3.0 ? 'wow' : 'happy', t);
      // the hoop's front half, the wavy surface line over everything
      c.lineWidth = 3; c.strokeStyle = got ? 'rgba(255,214,90,0.55)' : v.c.gold;
      c.beginPath(); c.ellipse(hx, pw22rHoop.y, 5, 15, 0, -Math.PI / 2, Math.PI / 2); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.5; c.beginPath();
      for (let x = 0; x <= v.W; x += 8) c.lineTo(x, pw22rSurf + Math.sin((x + cam) / 18 + t * 2.4) * 1.2);
      c.stroke();
      // splashes and bubbles
      if (t > 2.15 && t < 2.5) v.puff(sx(pw22rPipX(2.2)), pw22rSurf, v.seg(t, 2.15, 2.5));
      if (t > 2.9 && t < 3.3) v.puff(sx(pw22rPipX(2.95)), pw22rSurf, v.seg(t, 2.9, 3.3));
      for (let i = 0; i < 6; i++) { const ph = (t * 0.8 + i / 6) % 1, x = ((i * 53 - cam * 0.6) % 320 + 320) % 320; c.strokeStyle = 'rgba(255,255,255,' + (0.6 * (1 - ph)).toFixed(2) + ')'; c.lineWidth = 1; v.circle(x, pw22rBed - 6 - ph * 70, 2 + i % 2); c.stroke(); }
      // words
      if (t < 1.2) v.pill('▲ ▼ swim · action: leap!', 160, 160, { size: 9 });
      if (t > 1.3 && t < 1.95) v.label('Dive...', sx(px), py + 22, 10, '#fff');
      if (t > 2.55 && t < 3.2) { v.label('Zoom!', sx(px) + 6, py - 20, 12, v.c.gold); for (let i = 0; i < 4; i++) v.sparkle(hx + Math.cos(i * 1.6) * 10, pw22rHoop.y + Math.sin(i * 1.6) * 14, v.seg(t, 2.57, 3.0), '#fff', 4); }
      if (boBump) v.label('Tangled!', sx(bx), by - 22, 10, '#fff');
      if (t > 5.3) { v.label('Pip wins!', 160, 36, 20, v.c.pip); v.confetti(ax, 40, v.seg(t, 5.3, 6.5)); }
    },
  });
  // ----- END 22-4 Dolphin Race preview -----

}
