/* Pip & Bo - Level previews for World 17 Jungle Jamboree (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw17. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 17-1 Temple Doors preview -----
  // PLACEHOLDER
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
  // Pip and Bo pump their vines higher, let go at the top of the swing and fly; Bo opens a leaf and lands further.
  const pw17vGY = 150, pw17vL = 60, pw17vW = Math.PI * 2 / 1.3;
  // per hero: vine pivot, let-go time, flight time, landing x, distance, swing phase offset (so let-go is at +30 deg going forward)
  const pw17vH = [
    { px: 92, py: 12, tr: 2.0, ft: 1.3, lx: 240, m: 38 },
    { px: 74, py: 12, tr: 2.65, ft: 1.55, lx: 272, m: 44 },
  ];
  for (const h of pw17vH) h.ph = 0.44 - pw17vW * h.tr;
  const pw17vAmp = t => (22 + 48 * Math.min(1, t / 2)) * Math.PI / 180;
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
    ctx.fillStyle = '#7a5230'; v.rr(10, 6, 100, 10, 5); ctx.fill();
    pw17vBlobs(ctx, '#2f7a3a', pw17vHills[2]);
    pw17vBlobs(ctx, '#3f9446', pw17vHills[3]);
    ctx.fillStyle = '#b07a44'; ctx.fillRect(0, 118, 40, 6); ctx.fillStyle = '#8a5a30'; ctx.fillRect(4, 124, 3, 26); ctx.fillRect(33, 124, 3, 26);
  };
  definePreview('Vine Swing', {
    blurb: 'Pump your vine, let go at the top and fly. Longest swing wins!',
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
          pw17vVine(v, h.px, h.py, hand.x, hand.y, -Math.cos(pw17vW * t + h.ph) * 4);
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
