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
  // The swamp from the side, scrolling right. One swings over the tar on a vine, the other hops in, gets stuck and is
  // lassoed out with a big "SHLORP!" over their partner's head; at the next pit they swap jobs. Two crossings make the
  // 8 s loop. The swamp repeats every bank + pit (200 px) and everything that moves runs on the absolute pit number and
  // periods that divide the loop, so the last frame is the first one again.
  const PW14T = { P: 200, bank: 90, gy: 130, ts: 138, ax: 145, ay: 4, r: 104, rest: 54, th: 0.62, cam0: -15, per: 4 };
  // the camera (x of the screen's left edge, relative to the bank the crossing starts on) during a crossing f = 0..1
  function pw14tCam(v, f) {
    return PW14T.cam0 + 80 * v.ease.inOut(v.seg(f, 0.34, 0.6)) + 120 * v.ease.inOut(v.seg(f, 0.8, 1));
  }
  // a vine's angle and length for its pit's crossing progress u (< 0: still tied, > 1: long done, dangling)
  function pw14tVine(v, u, t, n) {
    const P = PW14T;
    if (u < 0.16) return { th: -P.th, r: P.r, tied: true };
    if (u < 0.4) return { th: -P.th * Math.cos(Math.PI * v.seg(u, 0.16, 0.4)), r: P.r };
    const k = v.seg(u, 0.4, 0.66), calm = v.seg(u, 0.62, 0.8);
    const sway = Math.sin(Math.PI * 2 * t / 2 + Math.PI * (n & 1)) * 0.07 * calm;
    return { th: P.th * Math.cos(k * Math.PI * 3) * Math.pow(1 - k, 1.6) + sway, r: P.r - (P.r - P.rest) * v.ease.back(k) };
  }
  const pw14tTip = (ax, vn) => ({ x: ax + vn.r * Math.sin(vn.th), y: PW14T.ay + vn.r * Math.cos(vn.th) });
  // a springy green vine from its branch to the leafy handle (like the level's)
  function pw14tDrawVine(v, ax, tip, t, n) {
    const ctx = v.ctx, ay = PW14T.ay, mx = (ax + tip.x) / 2 + (tip.x - ax) * 0.06, my = (ay + tip.y) / 2 + 4;
    ctx.lineCap = 'round';
    for (const [col, lw] of [['#3c7a2e', 3.4], ['#6fbf47', 2]]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, tip.x, tip.y); ctx.stroke(); }
    for (let k = 1; k < 7; k++) {
      const u = k / 7, px = (1 - u) * (1 - u) * ax + 2 * u * (1 - u) * mx + u * u * tip.x, py = (1 - u) * (1 - u) * ay + 2 * u * (1 - u) * my + u * u * tip.y;
      const side = k % 2 ? 1 : -1, wob = Math.sin(Math.PI * 2 * t / 2 + k + n) * 0.2;
      ctx.fillStyle = k % 2 ? '#5cb84d' : '#4fa244'; ctx.beginPath(); ctx.ellipse(px + side * 2.6, py, 2.8, 1.4, side * 0.6 + wob, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#9be36a'; ctx.strokeStyle = '#2f6b26'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(tip.x, tip.y + 1, 3.2, 3.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4fa244'; ctx.beginPath(); ctx.ellipse(tip.x - 3, tip.y + 3, 3, 1.5, 0.7, 0, Math.PI * 2); ctx.ellipse(tip.x + 3, tip.y + 3, 3, 1.5, -0.7, 0, Math.PI * 2); ctx.fill();
  }
  // the scenery far away: a sleepy volcano, Gerty munching a treetop, two rows of jungle (they scroll slower)
  function pw14tFar(v, t, camAbs) {
    const ctx = v.ctx, P2 = Math.PI * 2;
    v.sky(); v.sun(286, 40, 11);
    ctx.save(); ctx.translate(70, 116); ctx.scale(0.36, 0.36);
    ctx.fillStyle = '#a08a9a'; ctx.beginPath(); ctx.moveTo(-170, 0); ctx.quadraticCurveTo(-70, -70, -34, -150); ctx.lineTo(34, -150); ctx.quadraticCurveTo(70, -70, 170, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.moveTo(-34, -150); ctx.quadraticCurveTo(-60, -80, -120, -10); ctx.lineTo(-80, -10); ctx.quadraticCurveTo(-30, -80, -14, -150); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffb36a'; v.rr(-30, -156, 60, 10, 5); ctx.fill();
    for (let k = 0; k < 3; k++) { // lazy smoke puffs
      const u = v.phase(t, 8 / 3, k / 3);
      v.fillCircle(Math.sin(u * 5 + k) * 10 + u * 34, -160 - u * 110, 12 + u * 26, 'rgba(240,235,245,' + (0.55 * (1 - u)).toFixed(3) + ')');
    }
    ctx.restore();
    // Gerty, far off behind the trees, nibbling leaves (her neck dips in time with the munching)
    const munch = Math.sin(P2 * t / 2), gx = 228, gy = 112, hx = gx + 26, hy = 70 + munch * 1.5;
    ctx.save(); ctx.globalAlpha = 0.9;
    ctx.strokeStyle = '#2f7a58'; ctx.lineCap = 'round'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(gx + 6, gy - 4); ctx.quadraticCurveTo(gx + 24, gy - 20, hx - 2, hy + 4); ctx.stroke();
    ctx.strokeStyle = '#5fbf8f'; ctx.lineWidth = 6.6; ctx.stroke();
    ctx.fillStyle = '#2f7a58'; ctx.beginPath(); ctx.ellipse(gx, gy, 20, 11, 0, 0, P2); ctx.fill();
    ctx.fillStyle = '#5fbf8f'; ctx.beginPath(); ctx.ellipse(gx, gy, 18.6, 9.8, 0, 0, P2); ctx.fill();
    ctx.translate(hx, hy); ctx.rotate(0.1 + munch * 0.06);
    ctx.fillStyle = '#2f7a58'; ctx.beginPath(); ctx.ellipse(0, 0, 8.4, 5.9, 0, 0, P2); ctx.fill();
    ctx.fillStyle = '#5fbf8f'; ctx.beginPath(); ctx.ellipse(0, 0, 7.6, 5.1, 0, 0, P2); ctx.fill();
    const blink = v.phase(t, 4) > 0.9 && v.phase(t, 4) < 0.94;
    if (blink) v.line(-2.8, -1.6, 0.6, -1.6, v.c.ink, 1);
    else { v.fillCircle(-1, -1.6, 2.1, '#fff'); v.fillCircle(-0.4, -1.3, 1.1, v.c.ink); }
    v.fillCircle(2.8, 1.8, 1.3, 'rgba(255,120,150,0.5)');
    ctx.strokeStyle = v.c.ink; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(3.6, 0.4, 2.6, 0.25, 1.35); ctx.stroke();
    for (let k = 0; k < 5; k++) { const a = k * 1.256; v.fillCircle(-5.4 + Math.cos(a) * 1.2, -4.2 + Math.sin(a) * 1.2, 0.95, '#ff9ac1'); }
    v.fillCircle(-5.4, -4.2, 0.7, '#ffe066');
    ctx.restore();
    // a leafy treetop right at her mouth
    v.fillCircle(hx + 11, hy + 6, 7, '#7fa866'); v.fillCircle(hx + 6, hy + 10, 5, '#86b06a');
    // two rows of round tree crowns (1/4 and 1/2 of the camera's speed; their patterns repeat over the loop's travel)
    for (const [y0, col, f, n] of [[110, '#86b06a', 0.25, 5], [121, '#6c9a58', 0.5, 10]]) {
      const off = camAbs * f, q0 = Math.floor((off - 20) / 20);
      ctx.fillStyle = col; ctx.beginPath();
      for (let q = q0; q <= q0 + 19; q++) {
        const m = ((q % n) + n) % n, r = 9 + v.rand(m * 5 + y0) * 7, x = q * 20 - off;
        ctx.moveTo(x + r, y0); ctx.arc(x, y0 + v.rand(m * 3 + y0) * 4, r, 0, P2);
      }
      ctx.rect(0, y0 + 2, v.W, v.H); ctx.fill();
    }
  }
  // one bank: warm rock with moss on top, and its own bits (palms, ferns, reeds, a sign; by the pit number's parity)
  function pw14tBank(v, x0, n) {
    const ctx = v.ctx, P = PW14T, gy = P.gy, w = P.bank;
    const g = ctx.createLinearGradient(0, gy, 0, v.H); g.addColorStop(0, '#a07a52'); g.addColorStop(1, '#634a32');
    ctx.fillStyle = g; ctx.fillRect(x0, gy, w, v.H - gy);
    ctx.fillStyle = 'rgba(255,230,190,0.14)';
    for (let k = 0; k < 6; k++) { v.rr(x0 + 6 + v.rand(k * 7 + (n & 1)) * (w - 16), gy + 12 + v.rand(k * 11 + 3 + (n & 1)) * 30, 6, 3.5, 1.7); ctx.fill(); }
    ctx.fillStyle = 'rgba(50,32,20,0.45)'; ctx.fillRect(x0, gy, 1.5, v.H - gy); ctx.fillRect(x0 + w - 1.5, gy, 1.5, v.H - gy);
    ctx.fillStyle = '#3f8f3a'; ctx.fillRect(x0, gy, w, 4);
    ctx.fillStyle = '#7ccf4f'; ctx.fillRect(x0, gy, w, 2.6);
    for (let k = 0; k < w / 6; k++) v.fillCircle(x0 + 3 + k * 6, gy + 2.6, 1.6, '#7ccf4f');
    ctx.fillStyle = '#9be36a'; ctx.fillRect(x0, gy, w, 1);
    for (let k = 0; k < 4; k++) { // tiny flowers
      const fx = x0 + 8 + v.rand(k * 13 + 5 + (n & 1)) * (w - 16);
      for (let q = 0; q < 5; q++) { const a = q * 1.256; v.fillCircle(fx + Math.cos(a) * 1.1, gy - 2 + Math.sin(a) * 1.1, 0.9, ['#ff9ac1', '#ffe066', '#ffffff'][k % 3]); }
    }
    // the stake by the pit edge that the next vine is tied to
    ctx.fillStyle = '#7d5530'; v.rr(x0 + 79, gy - 7, 3, 8, 1); ctx.fill(); ctx.fillStyle = '#a0703c'; v.rr(x0 + 78.5, gy - 8, 4, 2, 1); ctx.fill();
  }
  function pw14tDeco(v, x0, n) {
    const ctx = v.ctx, gy = PW14T.gy;
    if (!(n & 1)) { // a palm and a fern
      const x = x0 + 12, h = 62, lean = 0.2, tx = x + lean * h, ty = gy - h;
      ctx.strokeStyle = '#8a6440'; ctx.lineWidth = 3.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.quadraticCurveTo(x + lean * h * 0.3, gy - h * 0.5, tx, ty); ctx.stroke();
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + (k - 2.5) * 0.62, len = 20 + (k % 2) * 5;
        ctx.fillStyle = k % 2 ? '#4fa244' : '#5cb84d'; ctx.beginPath(); ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(tx + Math.cos(a - 0.3) * len * 0.6, ty + Math.sin(a - 0.3) * len * 0.6 - 3, tx + Math.cos(a) * len, ty + Math.sin(a) * len + 7);
        ctx.quadraticCurveTo(tx + Math.cos(a + 0.3) * len * 0.6, ty + Math.sin(a + 0.3) * len * 0.6, tx, ty); ctx.fill();
      }
      for (const [ox, oy] of [[-2, 1.5], [1.5, 2.2], [0, 3.4]]) v.fillCircle(tx + ox, ty + oy, 1.8, '#7a5a30');
      pw14tFern(v, x0 + 50, gy, 0.75);
    } else { // reeds, a rock, a friendly old fossil
      for (let k = 0; k < 5; k++) {
        const rx = x0 + 14 + k * 3, h = 16 + v.rand(k + 40) * 8;
        ctx.strokeStyle = '#6f9a3c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(rx, gy); ctx.quadraticCurveTo(rx + 1, gy - h * 0.5, rx + (k - 2), gy - h); ctx.stroke();
        if (k % 2 === 0) { ctx.fillStyle = '#7a4f2a'; v.rr(rx + (k - 2) - 1.2, gy - h - 1, 2.4, 6, 1.2); ctx.fill(); }
      }
      ctx.fillStyle = '#8f7a66'; ctx.beginPath(); ctx.ellipse(x0 + 56, gy, 9, 6, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(x0 + 53, gy - 3.5, 3, 1.5, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,248,230,0.6)';
      for (let k = 0; k < 4; k++) { v.rr(x0 + 22 + k * 5, gy + 9 + (k % 2), 3.5, 1.6, 0.8); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(x0 + 44, gy + 10, 2.6, 2, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  function pw14tFern(v, x, y, s) {
    const ctx = v.ctx;
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k - 3) * 0.38, len = (12 + (k % 3) * 3) * s, ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len * 0.9;
      ctx.strokeStyle = k % 2 ? '#3f8f3a' : '#57a84a'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5 - 2, ex, ey + 2); ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle;
      for (let j = 1; j < 5; j++) { const u = j / 5, px = x + (ex - x) * u, py = y + (ey + 2 - y) * u - 2 * Math.sin(u * Math.PI); ctx.beginPath(); ctx.ellipse(px, py, 2 * s * (1 - u * 0.5) + 0.4, 0.9, a + 1.2, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  // one pit of thick, glossy, bubbly purple tar from x0 to x1 (absX0 is its absolute x, for waves that line up)
  function pw14tTar(v, x0, x1, absX0, t, n, bumps) {
    const ctx = v.ctx, s = PW14T.ts, TAU = Math.PI * 2;
    const surf = x => {
      let y = s + Math.sin((x - x0 + absX0) * TAU / 50 + t * Math.PI) * 1 + Math.sin((x - x0 + absX0) * TAU / 100 - t * Math.PI / 2) * 0.7;
      for (const b of bumps) if (Math.abs(x - b.x) < b.w) y -= b.h * (1 - Math.abs(x - b.x) / b.w);
      return y;
    };
    ctx.fillStyle = 'rgba(40,28,52,0.6)'; ctx.fillRect(x0, s - 9, x1 - x0, 10);   // a dark stain on the pit walls
    const gr = ctx.createLinearGradient(0, s, 0, v.H); gr.addColorStop(0, '#3a2c4e'); gr.addColorStop(0.35, '#241a32'); gr.addColorStop(1, '#140e1c');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x0, v.H);
    for (let x = x0; x <= x1 + 0.1; x += 3) ctx.lineTo(Math.min(x, x1), surf(Math.min(x, x1)));
    ctx.lineTo(x1, v.H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(170,150,210,0.5)'; ctx.lineWidth = 1.1; ctx.beginPath();
    for (let x = x0 + 3; x <= x1 - 3; x += 3) { const y = surf(x) + 1.6; if (x === x0 + 3) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(200,180,240,0.16)';
    for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.ellipse(x0 + 24 + k * 54 + Math.sin(TAU * t / 8 + k) * 4, s + 7 + k * 5, 7, 1.4, 0, 0, TAU); ctx.fill(); }
    // little bubbles that grow and pop
    for (let k = 0; k < 3; k++) {
      const per = [2, 1.6, 8 / 3][k], u = v.phase(t, per, k * 0.3 + (n & 1) * 0.5), bx = x0 + [18, 50, 88][k] + (n & 1) * 6;
      if (u < 0.75) { const r = 0.8 + u * 2.4, by = surf(bx); ctx.fillStyle = 'rgba(90,72,120,0.95)'; ctx.beginPath(); ctx.arc(bx, by + 0.5, r, Math.PI, 0); ctx.fill(); v.fillCircle(bx - r * 0.4, by - r * 0.4, r * 0.28, 'rgba(220,200,255,0.6)'); }
      else { const k2 = (u - 0.75) / 0.25; ctx.strokeStyle = 'rgba(160,140,200,' + (0.7 * (1 - k2)).toFixed(3) + ')'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(bx, s, 2 + k2 * 4, 0.8 + k2, 0, 0, TAU); ctx.stroke(); }
    }
    return surf;
  }
  definePreview('Tar Pit Pull', {
    blurb: 'One swings over the sticky tar on a vine, then lassos the other out. SHLORP! Take turns!',
    loop: 8, still: 1.3,
    draw(v, t) {
      const P = PW14T, ctx = v.ctx, i = Math.floor(t / P.per) % 2, f = (t % P.per) / P.per;
      const S = i, W = 1 - i;                      // who swings this time (Pip at the even pits) and who waits
      const cam = pw14tCam(v, f), X = x => x - cam, gy = P.gy, ts = P.ts;
      pw14tFar(v, t, cam + P.P * i);
      // ---- the heroes' paths (bank-relative x, feet y) ----
      const tied = pw14tTip(P.ax, { th: -P.th, r: P.r });
      const vn0 = pw14tVine(v, f, t, i), tip0 = pw14tTip(P.ax, vn0);
      const hang = tp => ({ x: tp.x + Math.sin(vn0.th) * 8, y: tp.y + 32 });
      const s = { x: 64, y: gy, face: 1, mood: 'happy', sq: 0, rot: 0, hang: false };
      if (f < 0.07) { if (f > 0.025 && f < 0.045) s.mood = 'blink'; }
      else if (f < 0.16) { const u = v.ease.inOut(v.seg(f, 0.07, 0.16)), h = hang(tied); s.x = v.lerp(64, h.x, u); s.y = v.lerp(gy, h.y, u) + v.hop(u, 14); s.mood = 'wow'; s.sq = f < 0.085 ? 0.25 : -0.1; s.hang = f > 0.15; }
      else if (f < 0.4) { const h = hang(tip0); s.x = h.x; s.y = h.y; s.rot = -vn0.th * 0.5; s.mood = 'joy'; s.hang = true; }
      else if (f < 0.46) { const u = v.seg(f, 0.4, 0.46), h = hang(pw14tTip(P.ax, { th: P.th, r: P.r })); s.x = v.lerp(h.x, 216, u); s.y = v.lerp(h.y, gy, v.ease.in(u)) + v.hop(u, 6); s.mood = 'joy'; s.rot = -P.th * 0.5 * (1 - u); }
      else if (f < 0.64) { s.x = 216; s.sq = f < 0.49 ? 0.3 * (1 - v.seg(f, 0.46, 0.49)) : 0; s.face = f < 0.5 ? 1 : -1; }
      else if (f < 0.76) { const u = v.seg(f, 0.64, 0.76); s.x = v.lerp(216, 238, v.ease.inOut(u)); s.y = gy + v.hop(v.phase(t, 0.25), 1.5); s.face = -1; s.mood = 'grit'; s.sq = 0.08; }
      else { s.x = 238; s.face = f < 0.8 ? -1 : 1; s.mood = f < 0.86 ? 'wow' : f < 0.98 ? 'joy' : 'happy'; if (f > 0.88 && f < 0.96) s.y = gy + v.hop(v.seg(f, 0.88, 0.96), 7); }
      const w = { x: 38, y: gy, face: 1, mood: 'happy', sq: 0, rot: 0, inTar: false, depth: 0 };
      if (f < 0.42) { if (f > 0.4) w.mood = 'joy'; else if (f > 0.2) w.mood = 'wow'; }
      else if (f < 0.5) { w.x = v.lerp(38, 84, v.seg(f, 0.42, 0.5)); w.y = gy + v.hop(v.phase(t, 0.25), 2); }
      else if (f < 0.55) { const u = v.seg(f, 0.5, 0.55); w.x = v.lerp(84, 122, u); w.y = v.lerp(gy, ts + 3, v.ease.in(u)) + v.hop(u, 14); w.inTar = w.y > ts - 4; w.mood = 'wow'; }
      else if (f < 0.64) { const u = v.seg(f, 0.55, 0.64); w.inTar = true; w.x = 122 + Math.sin(Math.PI * 2 * t * 6) * 1.4; w.y = ts + 3 + 3 * v.ease.out(u); w.mood = 'wow'; }
      else if (f < 0.76) { const u = v.seg(f, 0.64, 0.76); w.inTar = true; w.x = v.lerp(122, 127, u) + Math.sin(Math.PI * 2 * t * 8) * 0.8 * (1 - u); w.y = ts + 6 - 5 * v.ease.in(u); w.mood = 'grit'; w.sq = -0.08 * u; }
      else if (f < 0.86) { const u = v.seg(f, 0.76, 0.86); w.x = v.lerp(127, 264, u); w.y = v.lerp(ts + 1, gy, u) + v.hop(u, 62); w.rot = Math.PI * 2 * v.ease.inOut(u); w.mood = 'joy'; w.sq = -0.15 * (1 - u); }
      else { w.x = 264; w.sq = f < 0.89 ? 0.35 * (1 - v.seg(f, 0.86, 0.89)) : 0; w.face = f > 0.88 && f < 0.95 ? -1 : 1; w.mood = f < 0.98 ? 'joy' : 'happy'; if (f > 0.9 && f < 0.97) w.y = gy + v.hop(v.seg(f, 0.9, 0.97), 7); }
      // ---- the canopy and every vine's branch ----
      for (let j = -1; j <= 2; j++) {
        const ax = X(j * P.P + P.ax);
        ctx.strokeStyle = '#6a4a2e'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(ax - 26, 0); ctx.quadraticCurveTo(ax - 8, 9, ax, P.ay); ctx.quadraticCurveTo(ax + 10, 10, ax + 30, 2); ctx.stroke();
      }
      {
        const q0 = Math.floor((cam - 20) / 20);
        for (let q = q0; q <= q0 + 19; q++) {
          const m = (((q + 10 * i) % 20) + 20) % 20, r = 9 + v.rand(m * 3 + 1) * 7;
          v.fillCircle(X(q * 20 + 6), -3 + v.rand(m * 5 + 2) * 7, r, m % 2 ? '#3f8f3a' : '#4fa244');
        }
      }
      // ---- banks, their bits, and the stake strings / vines ----
      for (let j = -1; j <= 2; j++) { const n = i + j, b0 = X(j * P.P); if (b0 > v.W + 2 || b0 + P.bank < -2) continue; pw14tBank(v, b0, n); pw14tDeco(v, b0, n); }
      // a dragonfly zipping by
      { const u = v.phase(t, 8), x = u * 380 - 30, y = 62 + Math.sin(Math.PI * 2 * t / 2) * 6, fl = Math.sin(Math.PI * 2 * t * 10) * 1;
        ctx.fillStyle = '#5bc0eb'; v.rr(x - 3.5, y - 0.8, 7, 1.6, 0.8); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.ellipse(x - 0.5, y - 1.6, 2.6, Math.max(0.3, 1 + fl * 0.2), -0.4, 0, Math.PI * 2); ctx.ellipse(x + 1, y - 1.6, 2.6, Math.max(0.3, 1 - fl * 0.2), 0.4, 0, Math.PI * 2); ctx.fill(); }
      const vines = [];
      for (let j = -1; j <= 2; j++) {
        const n = i + j, ax = X(j * P.P + P.ax);
        if (ax < -60 || ax > v.W + 60) continue;
        const vn = pw14tVine(v, f - j, t, n), tp = pw14tTip(ax, vn);
        if (vn.tied) { // the tie string to the stake on the near bank
          const sx = X(j * P.P + 80.5), sy = gy - 6;
          ctx.strokeStyle = '#6fbf47'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo((sx + tp.x) / 2, (sy + tp.y) / 2 + 3, tp.x, tp.y + 2); ctx.stroke();
        }
        vines.push([ax, tp, n]);
      }
      for (const [ax, tp, n] of vines) pw14tDrawVine(v, ax, tp, t, n);
      // ---- who's in the goo goes in first, then the tar over them ----
      const drawHero = (id, h) => v.hero(id, X(h.x), h.y, { face: h.face, mood: h.mood, sq: h.sq, rot: h.rot, shadow: !h.inTar && h.y >= gy - 0.5 && !h.hang });
      if (w.inTar) drawHero(W, w);
      const wx = X(w.x), enterK = v.seg(f, 0.53, 0.66), leaveK = v.seg(f, 0.76, 0.9);
      for (let j = -1; j <= 2; j++) {
        const n = i + j, x0 = X(j * P.P + P.bank), x1 = X((j + 1) * P.P);
        if (x0 > v.W || x1 < 0) continue;
        const bumps = j === 0 && w.inTar ? [{ x: wx, w: 14, h: 2.4 }] : [];
        const surf = pw14tTar(v, x0, x1, (n & 1) * P.P + P.bank, t, n, bumps);
        if (j !== 0) continue;
        if (w.inTar) { // goo hugging the stuck one, and a worried sweat drop
          ctx.fillStyle = '#2a2038'; ctx.beginPath(); ctx.ellipse(wx, surf(wx) + 0.5, 12, 2.6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(180,160,220,0.45)'; ctx.beginPath(); ctx.ellipse(wx - 4, surf(wx) - 0.6, 3.5, 0.9, 0, 0, Math.PI * 2); ctx.fill();
          if (f > 0.56 && f < 0.76) { const dy = v.phase(t, 0.5) * 4; ctx.fillStyle = '#8fd8ff'; ctx.beginPath(); ctx.ellipse(wx + 12, w.y - 24 + dy, 1.4, 2, 0, 0, Math.PI * 2); ctx.fill(); }
        }
        for (const [k, x] of [[enterK, X(122)], [leaveK, X(127)]]) if (k > 0 && k < 1) {
          ctx.strokeStyle = 'rgba(190,170,235,' + (0.7 * (1 - k)).toFixed(3) + ')'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.ellipse(x, ts, 6 + k * 18, 1.6 + k * 3, 0, 0, Math.PI * 2); ctx.stroke();
        }
        // the stretchy goo strand as they pop out
        const sk = v.seg(f, 0.76, 0.8);
        if (sk > 0 && sk < 1) { ctx.strokeStyle = 'rgba(42,32,56,' + (1 - sk).toFixed(3) + ')'; ctx.lineWidth = 4 * (1 - sk) + 0.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(X(127), ts); ctx.quadraticCurveTo(X(127) + 4, (ts + w.y) / 2, wx, w.y - 4); ctx.stroke(); }
      }
      // ---- the others, with the rider's arms and the vine lasso ----
      if (!w.inTar) drawHero(W, w);
      drawHero(S, s);
      if (s.hang) {
        const tp = f < 0.16 ? tied : tip0, sx = X(s.x), top = s.y - 22, col = S ? v.c.boDark : v.c.pipDark;
        v.line(sx - 5, top + 5, X(tp.x) - 1, tp.y + 2, col, 2); v.line(sx + 5, top + 5, X(tp.x) + 1, tp.y + 2, col, 2);
        v.fillCircle(X(tp.x) - 1.5, tp.y + 2, 1.8, S ? v.c.bo : v.c.pip); v.fillCircle(X(tp.x) + 1.5, tp.y + 2, 1.8, S ? v.c.bo : v.c.pip);
      }
      if (f > 0.57 && f < 0.76) { // the lasso: flies out, then pulls taut
        const ax = X(s.x) - 6, ay = s.y - 12, bx = wx, by = w.y - 16;
        const u = v.ease.out(v.seg(f, 0.57, 0.63)), ex = v.lerp(ax, bx, u), ey = v.lerp(ay, by, u) - 18 * Math.sin(u * Math.PI);
        const sag = f < 0.64 ? 8 : 8 * (1 - v.seg(f, 0.64, 0.7));
        for (const [col, lw] of [['#3c7a2e', 2.8], ['#8fdc5a', 1.4]]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + ex) / 2, Math.max(ay, ey) + sag, ex, ey); ctx.stroke(); }
        ctx.strokeStyle = '#6fbf47'; ctx.lineWidth = 1.4; v.circle(ex, ey, 3); ctx.stroke();
        if (f > 0.64) { // the pull meter over the puller
          const k = v.seg(f, 0.64, 0.75), mx = X(s.x) - 16, my = s.y - 40;
          ctx.fillStyle = 'rgba(28,26,54,0.8)'; v.rr(mx - 2, my - 2, 36, 7, 3.5); ctx.fill();
          ctx.fillStyle = '#8fdc5a'; v.rr(mx, my, Math.max(3, 32 * k), 3, 1.5); ctx.fill();
        }
      }
      // goo drips off the one who just went shlorp
      if (f > 0.86 && f < 0.98) {
        const a = 1 - v.seg(f, 0.9, 0.98);
        for (const [ox, ph] of [[-5, 0], [1, 0.4], [6, 0.8]]) { const dy = v.phase(t, 0.5, ph) * 5; ctx.fillStyle = 'rgba(42,32,56,' + a.toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(X(w.x) + ox, w.y - 3 + dy, 1.2, 1.7, 0, 0, Math.PI * 2); ctx.fill(); }
      }
      // ---- the words ----
      if (f > 0.2 && f < 0.38) v.bubble('Wheee!', X(tip0.x), tip0.y - 2, { size: 10 });
      if (f > 0.55 && f < 0.66) { const pop = v.ease.back(v.seg(f, 0.55, 0.58)); v.label('Stuck!', wx, ts - 32 - (f > 0.57 ? 8 : 0), 13 * pop, '#e2d4ff'); }
      if (f > 0.58 && f < 0.7) v.bubble('Grab on!', X(s.x), s.y - 28, { size: 10 });
      if (f > 0.76 && f < 0.92) { const pop = v.ease.back(v.seg(f, 0.76, 0.8)); v.label('SHLORP!', Math.max(X(150), 52), 92 - v.seg(f, 0.76, 0.92) * 6, 20 * pop, v.c.gold); }
      if (f > 0.87 && f < 0.98) { const k = v.seg(f, 0.87, 0.98); ctx.save(); ctx.globalAlpha *= 1 - v.ease.in(k); v.heart(X(251), gy - 40 - k * 12, 5 * v.ease.back(v.seg(k, 0, 0.3))); ctx.restore(); }
    },
  });
  // ----- END 14-3 Tar Pit Pull preview -----
  //
  // ----- BEGIN 14-4 Raptor Race preview -----
  // ----- END 14-4 Raptor Race preview -----
}
