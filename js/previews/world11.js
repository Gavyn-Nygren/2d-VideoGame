/* Pip & Bo - Level previews for World 11 (see js/previews/preview-core.js for how to write one). */
'use strict';

/* ---------- shared bits for World 11 (every top-level name starts with pw11) ---------- */
// draws scene(k) and, at the end of the loop, fades the opening frame in over it, so the loop has no seam
function pw11Loop(v, k, scene, from = 0.92) {
  scene(k);
  if (k > from) { v.ctx.save(); v.ctx.globalAlpha *= v.ease.inOut(v.seg(k, from, 1)); scene(0); v.ctx.restore(); }
}
// a gold medal on a ribbon, hanging from (x, y)
function pw11Medal(v, x, y, r = 9) {
  const ctx = v.ctx;
  ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.moveTo(x - r * 0.9, y); ctx.lineTo(x - r * 0.15, y + r * 1.4); ctx.lineTo(x + r * 0.15, y + r * 1.4); ctx.lineTo(x + r * 0.9, y); ctx.lineTo(x + r * 0.3, y); ctx.lineTo(x, y + r * 0.8); ctx.lineTo(x - r * 0.3, y); ctx.closePath(); ctx.fill();
  v.fillCircle(x, y + r * 2.2, r, v.c.gold);
  ctx.strokeStyle = v.c.goldDark; ctx.lineWidth = 1.5; v.circle(x, y + r * 2.2, r * 0.68); ctx.stroke();
  v.star(x, y + r * 2.2, r * 0.5, '#fff3b0');
}
// a little crowd: rows of fans (shirt + head) that bob, and jump while cheer > 0
function pw11Crowd(v, x0, x1, y, rows, gap, t, cheer, seed) {
  const ctx = v.ctx, shirts = ['#ff6b6b', '#2ec4b6', '#ffd23f', '#8e6cff', '#5bd16f', '#ff9f1c', '#ffffff', '#ff8fc7'], skins = ['#f6d3b3', '#e0a97c', '#b97a53', '#8a5636'];
  for (let r = 0; r < rows; r++) for (let x = x0 + (r % 2) * gap / 2, i = 0; x < x1; x += gap, i++) {
    const h = v.rand(seed + r * 97 + i * 7);
    if (h < 0.12) continue;
    const yy = y + r * 11 - (cheer > 0 ? Math.abs(Math.sin(t * 9 + i * 1.7 + r)) * 3 * cheer : 0);
    ctx.fillStyle = shirts[Math.floor(h * 8)]; ctx.fillRect(x - 4, yy - 1, 8, 6);
    v.fillCircle(x, yy - 4, 3, skins[Math.floor(v.rand(seed + i * 13 + r) * 4)]);
  }
}

/* ---------- 11-1 Synchro Diving ---------- */
// three, two, one, go: Pip and Bo dive off the twin tower as mirror images, splash in together, and the judges hold up 10s
definePreview('Synchro Diving', {
  blurb: 'Dive off the tower together and do the same flips at the same time!',
  loop: 6, still: 2.75,
  draw(v, t) { pw11Loop(v, t / 6, k => this.scene(v, k, k * 6)); },
  scene(v, k, t) {
    const ctx = v.ctx, wy = 142, by = 64, tx0 = 148, tx1 = 172, top = 50;
    // sky, stands with a cheering crowd, the banner and the pool's far edge
    v.sky(); v.sun(292, 24, 11); v.clouds(t);
    ctx.fillStyle = '#5a6fa8'; ctx.fillRect(0, 92, v.W, 40);
    ctx.fillStyle = '#4a5c92'; ctx.fillRect(0, 92, v.W, 4);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, 96, v.W, 2);
    pw11Crowd(v, 4, v.W, 108, 2, 13, t, k > 0.56 && k < 0.95 ? 1 : 0, 11);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 126, v.W, 8);
    ctx.fillStyle = '#2ec4b6'; ctx.fillRect(0, 126, v.W, 2); ctx.fillStyle = '#ff6b6b'; ctx.fillRect(0, 132, v.W, 2);
    ctx.fillStyle = '#f3f7fb'; ctx.fillRect(0, 134, v.W, 8);
    ctx.fillStyle = '#c9d8e8'; for (let x = 0; x < v.W; x += 12) ctx.fillRect(x, 134, 1, 8);
    // the water
    const g = ctx.createLinearGradient(0, wy, 0, v.H);
    g.addColorStop(0, '#3fb4e8'); g.addColorStop(1, '#1d6fb8');
    ctx.fillStyle = g; ctx.fillRect(0, wy, v.W, v.H - wy);
    ctx.strokeStyle = 'rgba(200,240,255,0.35)'; ctx.lineWidth = 1.5;
    for (let r = 0; r < 2; r++) { ctx.beginPath(); for (let x = 0; x <= v.W; x += 16) ctx.lineTo(x, wy + 12 + r * 14 + Math.sin(x * 0.05 + t * 1.6 + r * 2) * 2); ctx.stroke(); }
    // the tower, its platforms (Pip's to the left, Bo's to the right) and a made-up pennant on top
    const tg = ctx.createLinearGradient(tx0, 0, tx1, 0);
    tg.addColorStop(0, '#cfd9e6'); tg.addColorStop(0.5, '#f4f7fb'); tg.addColorStop(1, '#bcc8d8');
    ctx.fillStyle = tg; ctx.fillRect(tx0, top, tx1 - tx0, v.H - top);
    ctx.strokeStyle = '#8f9bb0'; ctx.lineWidth = 1.5; ctx.strokeRect(tx0, top, tx1 - tx0, v.H - top);
    for (const [x0, w] of [[90, tx0 - 90], [tx1, 230 - tx1]]) {
      ctx.fillStyle = '#e9eef5'; ctx.fillRect(x0, by, w, 7);
      ctx.fillStyle = '#3f8fd6'; ctx.fillRect(x0, by, w, 2.5);
      ctx.fillStyle = '#9aa7bd'; ctx.fillRect(x0, by + 6, w, 1.5);
      const face = x0 === 90 ? tx0 : tx1, s = x0 === 90 ? -1 : 1;
      v.line(face, by + 26, face + s * 26, by + 7, '#b9c4d4', 3);
      ctx.strokeStyle = '#8f9bb0'; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(face, by - 14); ctx.lineTo(face + s * 22, by - 14); ctx.lineTo(face + s * 22, by); ctx.moveTo(face + s * 11, by - 14); ctx.lineTo(face + s * 11, by); ctx.stroke();
    }
    v.pill('10 m', 160, by + 20, { size: 10, bg: '#ffc53d', col: v.c.ink });
    ctx.fillStyle = '#8f9bb0'; ctx.fillRect(159, top - 16, 2, 16);
    ctx.fillStyle = '#8e6cff'; ctx.beginPath(); ctx.moveTo(161, top - 16); ctx.lineTo(176, top - 12 + Math.sin(t * 5) * 1.5); ctx.lineTo(161, top - 8); ctx.closePath(); ctx.fill();
    v.star(166, top - 12, 2.6, '#ffd23f');
    // the count on the beat, then the dive (both at once, mirror images of each other)
    const beat = [0.16, 0.24, 0.32].findIndex(b => k > b && k < b + 0.05);
    const u = v.seg(k, 0.37, 0.59) * 1.2;   // 0..1 from the board to the water, then a little more under it
    const flying = u > 0 && u < 1.2;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, v.W, wy + 1); ctx.clip();
    for (const id of [0, 1]) {
      const m = id ? 1 : -1, sx = 160 + m * 54;
      if (!flying && k < 0.5) {
        const lift = v.hop(v.seg(k, 0.34, 0.37), 4);
        v.hero(id, sx, by + lift, { face: m, sq: beat >= 0 ? 0.14 : 0, mood: k > 0.03 && k < 0.05 ? 'blink' : k > 0.15 ? 'grit' : 'happy' });
      } else if (flying) {
        const cx = sx + m * 46 * Math.min(1, u), cy = by - 12 - 120 * u + 208 * u * u;
        const f = v.seg(u, 0.05, 0.75), rot = m * Math.PI * 3 * v.ease.inOut(f);
        const sq = f > 0 && f < 1 ? 0.28 * Math.sin(Math.PI * f) : u > 0.75 ? -0.25 : 0;
        v.hero(id, cx, cy + 12 * (1 - sq * 0.3), { face: m, rot, sq, shadow: false, mood: 'grit' });
      } else {
        // heads pop up out of the water, smiling at each other
        const up = v.ease.back(v.seg(k, 0.64, 0.71)), bob = Math.sin(t * 4 + id) * 1.2;
        if (up > 0) v.hero(id, 160 + m * 100, wy + 22 - up * 18 + bob, { face: -m, mood: 'joy', shadow: false });
      }
    }
    ctx.restore();
    // the splashes, at the same moment for both
    const sk = v.seg(k, 0.55, 0.7);
    for (const m of [-1, 1]) {
      const x = 160 + m * 100;
      if (sk > 0 && sk < 1) {
        ctx.save(); ctx.globalAlpha *= 1 - sk * sk;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(x, wy, 9 + sk * 8, 36 * Math.sin(Math.PI * Math.min(1, sk * 1.3)), 0, Math.PI, 0); ctx.fill();
        for (let q = 0; q < 14; q++) {
          const a = -Math.PI / 2 + (v.rand(q * 5 + 3) - 0.5) * 2, sp = 34 + v.rand(q * 11 + 1) * 36;
          v.fillCircle(x + Math.cos(a) * sp * sk, wy + Math.sin(a) * sp * sk * 1.6 + 70 * sk * sk, 3, q % 3 ? '#ffffff' : '#9fdcff');
        }
        ctx.restore();
      }
      const rk = v.seg(k, 0.56, 0.9);
      if (rk > 0 && rk < 1) { ctx.strokeStyle = `rgba(255,255,255,${(0.7 * (1 - rk)).toFixed(3)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, wy + 3, 10 + rk * 26, 3 + rk * 5, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    // the judges at their desk: an owl for Pip, the top-hat penguin for sync, a frog for Bo
    const jy = 168, js = [[124, 'owl', v.c.pip, '9.5', 0.63], [160, 'penguin', v.c.gold, '10', 0.67], [196, 'frog', v.c.bo, '9.5', 0.65]];
    for (const [x, kind, col, card, at] of js) {
      const bob = Math.sin(t * 2 + x) * 0.8;
      this.judge(v, x, jy + bob, kind, col);
      const ck = v.seg(k, at, at + 0.05), c = v.ease.back(ck);
      if (ck > 0) {
        const big = kind === 'penguin', cw = big ? 30 : 26, ch = big ? 22 : 19, cy = jy - 46 - (big ? 4 : 0);
        v.line(x + 6, jy - 14, x + 3, cy + ch / 2, '#6b4630', 2);
        ctx.save(); ctx.translate(x, cy); ctx.scale(c, c);
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = col; ctx.lineWidth = big ? 3 : 2.5; v.rr(-cw / 2, -ch / 2, cw, ch, 4); ctx.fill(); ctx.stroke();
        v.text(card, 0, 1, big ? 15 : 13, v.c.ink);
        ctx.restore();
      }
    }
    ctx.fillStyle = '#2b3f63'; v.rr(108, jy - 2, 104, 7, 3); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(112, jy + 5, 96, v.H - jy);
    ['#ff6b4a', '#ffc53d', '#5b95ff'].forEach((s, i) => { ctx.fillStyle = s; ctx.fillRect(112 + i * 32, jy + 5, 32, 3); });
    // the words: the count, then the cheer
    const nums = ['3', '2', '1'];
    if (beat >= 0) v.label(nums[beat], 160, 22, 22, '#ffffff');
    if (k > 0.37 && k < 0.47) v.label('GO!', 160, 22, 22, v.c.gold);
    if (k > 0.04 && k < 0.14) { v.bubble('Ready!', 106, by - 30); v.bubble('Ready!', 214, by - 30); }
    if (k > 0.57 && k < 0.9) v.label('IN SYNC!', 160, 22, 20 + 2 * v.ease.back(v.seg(k, 0.57, 0.62)), v.c.gold);
    v.confetti(160, 40, v.seg(k, 0.69, 0.98), 22);
  },
  // a judge sitting behind the desk, feet hidden: body, face, and a scarf in the colour of the diver they watch
  judge(v, x, y, kind, col) {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, y); ctx.scale(0.8, 0.8);
    if (kind === 'owl') {
      ctx.fillStyle = '#9a6a3e'; v.rr(-14, -26, 28, 32, 12); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-12, -24); ctx.lineTo(-9, -34); ctx.lineTo(-4, -25); ctx.fill(); ctx.beginPath(); ctx.moveTo(12, -24); ctx.lineTo(9, -34); ctx.lineTo(4, -25); ctx.fill();
      ctx.fillStyle = '#e8c9a0'; ctx.beginPath(); ctx.ellipse(0, -2, 9, 8, 0, 0, Math.PI * 2); ctx.fill();
      for (const ex of [-6, 6]) { v.fillCircle(ex, -16, 5.5, '#fff'); v.fillCircle(ex, -16, 2.4, v.c.ink); }
      ctx.fillStyle = '#ffc53d'; ctx.beginPath(); ctx.moveTo(-2.5, -11); ctx.lineTo(2.5, -11); ctx.lineTo(0, -7); ctx.closePath(); ctx.fill();
    } else if (kind === 'penguin') {
      ctx.fillStyle = '#26304d'; v.rr(-15, -30, 30, 36, 14); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, -8, 10, 13, 0, 0, Math.PI * 2); ctx.fill();
      for (const ex of [-5, 5]) { v.fillCircle(ex, -20, 3.6, '#fff'); v.fillCircle(ex + 0.5, -20, 1.8, v.c.ink); }
      ctx.fillStyle = '#ff9f1c'; ctx.beginPath(); ctx.moveTo(-3, -16); ctx.lineTo(3, -16); ctx.lineTo(0, -12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = v.c.ink; ctx.fillRect(-9, -33, 18, 3); ctx.fillRect(-6, -43, 12, 11); ctx.fillStyle = v.c.gold; ctx.fillRect(-6, -36, 12, 2.5);
    } else {
      ctx.fillStyle = '#5bd16f'; v.rr(-15, -22, 30, 28, 12); ctx.fill();
      for (const ex of [-7, 7]) { v.fillCircle(ex, -22, 6.5, '#5bd16f'); v.fillCircle(ex, -22, 4.5, '#fff'); v.fillCircle(ex, -21.5, 2.2, v.c.ink); }
      ctx.strokeStyle = '#2f7a3e'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, -12, 6, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.2; v.circle(-7, -22, 5); ctx.stroke(); v.circle(7, -22, 5); ctx.stroke();
    }
    ctx.fillStyle = col; v.rr(-13, 0, 26, 6, 3); ctx.fill();
    ctx.restore();
  },
});

/* ---------- 11-2 Tandem Velodrome ---------- */
// seen from above: Pip pedals on Bongo's drum beat, Bo leans the tandem into the banked turns, they pass the Toucans and win
definePreview('Tandem Velodrome', {
  blurb: 'One pedals to the drum beat, one leans in the turns. Ride as a team!',
  loop: 6.4, still: 0.04,
  draw(v, t) { pw11Loop(v, t / 6.4, k => this.scene(v, k, k * 6.4)); },
  scene(v, k, t) {
    const ctx = v.ctx, XA = 100, XB = 220, CY = 92, R = 54, TW = 38, rIn = R - TW / 2, rOut = R + TW / 2, FX = 190;
    const S1 = XB - XA, S2 = S1 + Math.PI * R, S3 = S2 + S1, LAP = S3 + Math.PI * R;
    const stad = r => {
      ctx.beginPath(); ctx.moveTo(XA, CY + r); ctx.lineTo(XB, CY + r); ctx.arc(XB, CY, r, Math.PI / 2, -Math.PI / 2, true);
      ctx.lineTo(XA, CY - r); ctx.arc(XA, CY, r, -Math.PI / 2, -Math.PI * 1.5, true); ctx.closePath();
    };
    // a point on the track: s along the lap (from the left end of the home straight), r from a turn's centre
    const at = (s, r) => {
      s = ((s % LAP) + LAP) % LAP;
      if (s < S1) return { x: XA + s, y: CY + r, a: 0 };
      if (s < S2) { const th = Math.PI / 2 - (s - S1) / R; return { x: XB + r * Math.cos(th), y: CY + r * Math.sin(th), a: th - Math.PI / 2 }; }
      if (s < S3) return { x: XB - (s - S2), y: CY - r, a: Math.PI };
      const th = -Math.PI / 2 - (s - S3) / R; return { x: XA + r * Math.cos(th), y: CY + r * Math.sin(th), a: th - Math.PI / 2 };
    };
    // how far into a turn s is (0 on the straights, 1 well inside a turn)
    const inTurn = s => {
      s = ((s % LAP) + LAP) % LAP;
      const d = Math.max(Math.min(s - S1, S2 - s), Math.min(s - S3, LAP - s));
      return v.clamp((d + 10) / 40, 0, 1);
    };
    // the arena: stands all round, the crowd, the wall, the wooden boards, the blue apron, the lines and the infield
    ctx.fillStyle = '#3b4f8a'; ctx.fillRect(0, 0, v.W, v.H);
    for (let i = 6; i >= 0; i--) { stad(rOut + 12 + i * 12); ctx.fillStyle = i % 2 ? '#56689f' : '#6476ad'; ctx.fill(); }
    const cols = ['#ff6b4a', '#5b95ff', '#ffc53d', '#19b3a6', '#9b6fd6', '#8fd14f', '#ff7fb0', '#f6efdf'];
    const fin = k > 0.8 ? Math.abs(Math.sin(t * 9)) * 2.5 : 0;
    for (let ring = 0; ring < 2; ring++) {
      const r = rOut + 17 + ring * 12, n = Math.floor((2 * S1 + 2 * Math.PI * r) / 13);
      for (let i = 0; i < n; i++) {
        if (v.rand(i * 3 + ring * 71) < 0.15) continue;
        const p = at((i + ring * 0.5) / n * LAP, r), y = p.y - fin * v.rand(i + ring);
        if (p.x < -6 || p.x > v.W + 6 || p.y < -6 || p.y > v.H + 6) continue;
        ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(p.x - 3.5, y - 1, 7, 5);
        v.fillCircle(p.x, y - 3, 2.6, ['#f3c9a0', '#c98b5a', '#8a5833', '#ffe0c2'][(i + ring) % 4]);
      }
    }
    stad(rOut + 7); ctx.fillStyle = '#d8d2c4'; ctx.fill();
    stad(rOut + 3); ctx.fillStyle = '#2b3f63'; ctx.fill();
    stad(rOut); ctx.fillStyle = '#e4b273'; ctx.fill();
    ctx.lineWidth = 0.7; ctx.strokeStyle = 'rgba(120,70,30,0.2)';
    for (let r = rIn + 10; r < rOut - 2; r += 7) { stad(r); ctx.stroke(); }
    stad(rOut - 5); ctx.strokeStyle = 'rgba(110,60,25,0.22)'; ctx.lineWidth = 8; ctx.stroke();
    stad(rIn + 6); ctx.fillStyle = '#62b6ea'; ctx.fill();
    stad(rIn + 7); ctx.strokeStyle = '#26243f'; ctx.lineWidth = 1.5; ctx.stroke();
    stad(rIn + 13); ctx.strokeStyle = '#e8483d'; ctx.lineWidth = 1.3; ctx.stroke();
    stad(rIn + 24); ctx.strokeStyle = '#3a7fd6'; ctx.lineWidth = 1.3; ctx.stroke();
    stad(rOut - 1.5); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
    stad(rIn); ctx.fillStyle = '#7cc66a'; ctx.fill(); ctx.strokeStyle = '#4c9a48'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(FX - 3, CY + rIn, 6, TW);
    ctx.fillStyle = '#26243f'; ctx.fillRect(FX - 0.75, CY + rIn, 1.5, TW);
    // Bongo the bear bangs the big drum on every beat, in the middle of the infield
    const P = 0.4, hit = v.phase(t, P), boom = hit < 0.3 ? 1 - hit / 0.3 : 0, bx = 146, byy = 104;
    ctx.fillStyle = 'rgba(28,26,54,0.25)'; ctx.beginPath(); ctx.ellipse(160, byy + 13, 32, 5, 0, 0, Math.PI * 2); ctx.fill();
    v.fillCircle(bx - 8, byy - 15 - boom * 2, 4.5, '#9b6a4a'); v.fillCircle(bx + 8, byy - 15 - boom * 2, 4.5, '#9b6a4a');
    ctx.fillStyle = '#b07a55'; v.rr(bx - 12, byy - 14 - boom * 2, 24, 27, 10); ctx.fill();
    ctx.fillStyle = '#e8c9a8'; ctx.beginPath(); ctx.ellipse(bx, byy - 4 - boom * 2, 6, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    for (const ex of [-4.5, 4.5]) v.fillCircle(bx + ex, byy - 9 - boom * 2, 1.7, v.c.ink);
    v.fillCircle(bx, byy - 5.5 - boom * 2, 1.6, v.c.ink);
    ctx.fillStyle = '#ff6b4a'; ctx.fillRect(bx - 12, byy + 5 - boom * 2, 24, 4);
    ctx.fillStyle = '#e8483d'; v.rr(158, byy - 18, 30, 28, 5); ctx.fill();
    ctx.fillStyle = boom > 0 ? `rgba(255,236,170,${(0.6 + 0.4 * boom).toFixed(3)})` : '#f6efdf';
    ctx.beginPath(); ctx.ellipse(173, byy - 4, 13 + boom * 1.5, 11 + boom * 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffc53d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(173, byy - 4, 13, 11, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.save(); ctx.translate(bx + 9, byy); ctx.rotate(hit < 0.25 ? 0.15 : -0.8);
    v.line(0, 0, 18, 0, '#8a5833', 2.6); v.fillCircle(20, 0, 4, '#f6efdf');
    ctx.restore();
    if (boom > 0) { ctx.strokeStyle = `rgba(255,246,200,${boom.toFixed(3)})`; ctx.lineWidth = 2.2; for (const r of [18, 25]) { ctx.beginPath(); ctx.arc(173, byy - 4, r + (1 - boom) * 7, -0.9, 0.9); ctx.stroke(); } }
    // where the bikes are: ours does one lap a loop; the Toucans start ahead and we pass them on the far side
    const sUs = FX - XA + LAP * (k - 0.78), pass = v.ease.inOut(v.seg(k, 0.06, 0.4));
    const sThem = sUs + 60 - 120 * pass, wide = Math.sin(Math.PI * v.seg(k, 0.08, 0.38));
    const usR = R + 9 * wide, themR = R - 9;
    const leanK = inTurn(sUs), done = k > 0.78;
    const bike = (s, r, sc, frame, riders) => {
      const p = at(s, r);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(28,26,54,0.25)'; ctx.beginPath(); ctx.ellipse(1.5, 3, 20, 6.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#26243f'; v.rr(9, -1.6, 13, 3.2, 1.6); ctx.fill(); v.rr(-22, -1.6, 13, 3.2, 1.6); ctx.fill();
      v.line(-15, 0, 15, 0, frame, 3);
      v.line(12, -5.5, 12, 5.5, '#26243f', 2);
      riders();
      ctx.restore();
      return p;
    };
    // the Toucans: two teal riders with orange beaks
    bike(sThem, themR, 1.15, '#19b3a6', () => {
      for (const rx of [-6, 6]) {
        ctx.fillStyle = '#19b3a6'; ctx.beginPath(); ctx.ellipse(rx - 2, 0, 5.5, 6.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#0b6b63'; ctx.lineWidth = 1; ctx.stroke();
        v.fillCircle(rx + 1.5, 0, 4.3, '#2a2f4f');
        ctx.fillStyle = '#ff9a2e'; ctx.beginPath(); ctx.moveTo(rx + 3, -1); ctx.lineTo(rx + 9.5, 0.5); ctx.lineTo(rx + 3, 2); ctx.closePath(); ctx.fill();
      }
    });
    // us: Pip pedals in the back seat, Bo leans in the front; they slide toward the inside of the turn as Bo leans
    const rider = (id, rx) => {
      const col = id ? v.c.bo : v.c.pip, dark = id ? v.c.boDark : v.c.pipDark;
      ctx.save(); ctx.translate(rx, -leanK * 3.2);
      if (id === 1) { v.fillCircle(-1, -5.6, 2.6, dark); v.fillCircle(-1, 5.6, 2.6, dark); }
      ctx.fillStyle = col; v.rr(-6.5, -6, 12, 12, 4.5); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 1.3; ctx.stroke();
      if (id === 0) { ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(-6, -2, 3.6, 1.8, -0.4, 0, Math.PI * 2); ctx.fill(); }
      if (done) {
        ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1; ctx.beginPath();
        for (const ey of [-2.4, 2.4]) ctx.arc(2.6, ey, 1.6, Math.PI * 0.6, Math.PI * 1.4);
        ctx.stroke();
      } else for (const ey of [-2.4, 2.4]) { v.fillCircle(2.8, ey, 1.9, '#fff'); v.fillCircle(3.6, ey, 1, v.c.ink); }
      ctx.restore();
    };
    const crank = t * Math.PI * 2 / (2 * P);
    const us = bike(sUs, usR, 1.65, v.c.gold, () => {
      for (const [rx, ph] of [[-7, 0], [6, 0.5]]) for (const side of [-1, 1]) v.fillCircle(rx + Math.cos(crank + ph + (side > 0 ? 0 : Math.PI)) * 3, side * 5, 1.6, v.c.ink);
      rider(0, -7); rider(1, 6);
    });
    // a ring round our bike so it is easy to spot
    ctx.strokeStyle = 'rgba(255,214,90,' + (0.55 + 0.25 * Math.sin(t * 6)).toFixed(3) + ')'; ctx.lineWidth = 2;
    v.circle(us.x, us.y, 31); ctx.stroke();
    // Pip's feet on the beat: ◀ ▶ ◀ ▶ pop up from the back seat
    if (!done) {
      const n = Math.floor(t / P), q = v.phase(t, P);
      if (q < 0.7) {
        // (on the outside of the track, beside the back seat)
        const back = at(sUs - 11, usR), d = 24 + q * 8;
        ctx.save(); ctx.globalAlpha *= 1 - q / 0.7;
        v.pill(n % 2 ? '▶' : '◀', v.clamp(back.x - Math.sin(back.a) * d, 12, v.W - 12), v.clamp(back.y + Math.cos(back.a) * d, 11, v.H - 11), { size: 10, bg: v.c.pip });
        ctx.restore();
      }
    }
    // Bo calls the lean in the middle of each turn
    if (leanK > 0.5 && Math.abs(us.y - CY) < 34 && !done) v.bubble('Lean in!', us.x, us.y - 22);
    // over the line first: a medal and confetti
    if (done) {
      const m = v.ease.back(v.seg(k, 0.78, 0.84));
      ctx.save(); ctx.translate(160, 54); ctx.scale(m, m);
      v.label('1st!', 0, 0, 22, v.c.gold);
      ctx.restore();
      if (m > 0) { pw11Medal(v, 204, 62, 7 * m); pw11Medal(v, 116, 62, 7 * m); }
      v.confetti(us.x, us.y - 10, v.seg(k, 0.79, 0.99), 18);
    }
  },
});

/* ---------- 11-3 Hurdle Dash ---------- */
// a race over hurdles: Pip jumps from the gold zone for a speed burst, Bo jumps too early and clips one, then bursts back;
// Pip dips over the line just ahead
definePreview('Hurdle Dash', {
  blurb: 'Race over the hurdles! Jump from the gold zone for a speed burst.',
  loop: 6.4, still: 2.4,
  draw(v, t) { pw11Loop(v, t / 6.4, k => this.scene(v, k, k * 6.4)); },
  scene(v, k, t) {
    const ctx = v.ctx, lanes = [{ gy: 118, s: 0.95 }, { gy: 164, s: 1 }];
    // where each runner is (world px): a start from the blocks, then bursts and a stumble
    const base = kk => { const u = v.seg(kk, 0.08, 0.84); return 40 + 560 * (u < 0.12 ? u * u / 0.24 : u - 0.06) + 46 * v.ease.out(v.seg(kk, 0.84, 0.95)); };
    const H1 = base(0.33), H2 = base(0.6), FIN = base(0.82);
    const xOf = (id, kk) => base(kk) + (id === 0
      ? 30 * v.ease.inOut(v.seg(kk, 0.33, 0.46))
      : -24 * v.ease.out(v.seg(kk, 0.32, 0.42)) + 40 * v.ease.inOut(v.seg(kk, 0.6, 0.74)));
    // when runner id reaches world x (the runs only go forward, so halving the interval finds it)
    const when = (id, x) => { let a = 0, b = 1; for (let i = 0; i < 18; i++) { const m = (a + b) / 2; if (xOf(id, m) < x) a = m; else b = m; } return a; };
    const JUMP = 32;   // a hop takes off this far before the hurdle (when it's right on time)
    const jumps = [[when(0, H1 - JUMP), when(0, H2 - JUMP)], [when(1, H1 - JUMP - 22), when(1, H2 - JUMP)]];
    const AIR = 0.085;
    const xs = [xOf(0, k), xOf(1, k)];
    const cam = Math.min(Math.max(0, (xs[0] + xs[1]) / 2 - 150), FIN - 150);   // (stops so the winner ends mid-frame)
    const sx = x => x - cam;
    // stands, crowd, ad boards
    v.sky();
    ctx.fillStyle = '#3f5a86'; ctx.fillRect(0, 14, v.W, 50);
    ctx.fillStyle = '#4f6c9c'; for (let y = 22; y < 64; y += 12) ctx.fillRect(0, y, v.W, 2);
    ctx.save(); ctx.translate(-((cam * 0.3) % 13), 0);
    pw11Crowd(v, 4, v.W + 14, 34, 2, 13, t, k > 0.8 ? 1 : 0.25, 31);
    ctx.restore();
    const ads = [['#ffd166', '#5a3b00'], ['#5b95ff', '#ffffff'], ['#ff6b4a', '#ffffff'], ['#8fe3b0', '#1f5a3a'], ['#b28dff', '#ffffff']];
    for (let i = Math.floor(cam / 80) - 1; i < Math.floor(cam / 80) + 6; i++) {
      const a = ads[((i % 5) + 5) % 5], x = i * 80 - cam;
      ctx.fillStyle = a[0]; ctx.fillRect(x, 64, 78, 16);
      v.text(i % 2 ? 'GO FOR GOLD' : 'SUMMER GAMES', x + 39, 72.5, 10, a[1], 'center', true);
    }
    // the track: two lanes, white lines, a kerb and the grass
    ctx.fillStyle = '#d4553d'; ctx.fillRect(0, 80, v.W, 94);
    ctx.fillStyle = '#b2412d'; ctx.fillRect(0, 80, v.W, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; for (const y of [84, 128, 172]) ctx.fillRect(0, y - 1, v.W, 2);
    ctx.fillStyle = '#f1efe6'; ctx.fillRect(0, 173, v.W, 3);
    ctx.fillStyle = '#7ccc62'; ctx.fillRect(0, 176, v.W, 4);
    // the start line and the finish line (checks across both lanes, a FINISH board)
    if (sx(40) > -10) { ctx.fillStyle = '#fff'; ctx.fillRect(sx(40) + 10, 84, 3, 88); }
    const fx = sx(FIN);
    if (fx < v.W + 60) {
      for (let j = 0; j < 11; j++) for (let c = 0; c < 2; c++) { ctx.fillStyle = (j + c) % 2 ? '#ffffff' : '#1c1a36'; ctx.fillRect(fx + c * 5 - 5 + j * 0.4, 84 + j * 8, 5, 8); }
      ctx.fillStyle = '#c9cede'; ctx.fillRect(fx + 22, 52, 4, 32);
      ctx.fillStyle = '#2b2850'; v.rr(fx - 28, 38, 64, 20, 5); ctx.fill();
      ctx.strokeStyle = v.c.gold; ctx.lineWidth = 1.5; ctx.stroke();
      v.text('FINISH', fx + 4, 48.5, 13, v.c.gold);
    }
    // each lane: gold zones, hurdles, the runner
    for (const id of [0, 1]) {
      const { gy, s } = lanes[id], x = sx(xs[id]);
      for (const [hi, hx] of [[0, H1], [1, H2]]) {
        const zx = sx(hx - JUMP);
        if (zx < -40 || zx > v.W + 60) continue;
        ctx.fillStyle = 'rgba(255,205,70,0.7)'; ctx.beginPath();
        ctx.moveTo(zx - 11, gy - 6); ctx.lineTo(zx + 13, gy - 6); ctx.lineTo(zx + 9, gy + 6); ctx.lineTo(zx - 15, gy + 6); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,240,190,0.9)'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.strokeStyle = 'rgba(150,90,0,0.55)'; ctx.lineWidth = 1.6;
        for (let c = zx - 9; c < zx + 8; c += 7) { ctx.beginPath(); ctx.moveTo(c, gy - 3); ctx.lineTo(c + 3, gy); ctx.lineTo(c, gy + 3); ctx.stroke(); }
        // Bo's first jump is too early: the hurdle tips over as Bo's trailing foot catches it (nobody gets hurt)
        const tip = id === 1 && hi === 0 ? v.seg(k, jumps[1][0] + AIR * 0.75, jumps[1][0] + AIR * 0.75 + 0.03) : 0;
        this.hurdle(v, sx(hx), gy, s, tip * 1.4);
      }
      // the jump arcs, the stumble and the finish
      let y = gy, rot = 0.12, mood = 'grit', sq = 0;
      const set = k < 0.08;
      if (set) { sq = 0.22; rot = 0.3; mood = 'happy'; }
      for (const j of jumps[id]) { const u = v.seg(k, j, j + AIR); if (u > 0 && u < 1) { y = gy + v.hop(u, 30); rot = 0.25; } }
      if (!set && y === gy && k < 0.84) y = gy + v.hop(v.phase(t, 0.24, id * 0.5), 3);
      if (id === 1) { const st = v.seg(k, jumps[1][0] + AIR, jumps[1][0] + AIR + 0.06); if (st > 0 && st < 1) { rot = 0.35 * Math.sin(st * Math.PI * 3); mood = 'wow'; } }
      const dip = Math.sin(Math.PI * v.seg(k, 0.8, 0.88));
      if (dip > 0) rot += 0.45 * dip;
      if (k > 0.86) { rot = 0; mood = id === 0 ? 'joy' : 'happy'; if (id === 0) y = gy + v.hop(v.phase(t, 0.45), 8); }
      // a speed burst: a gold trail of streaks and twinkles
      const burst = id === 0 ? v.seg(k, jumps[0][0] + AIR, jumps[0][0] + AIR + 0.13) : v.seg(k, jumps[1][1] + AIR, jumps[1][1] + AIR + 0.13);
      if (burst > 0 && burst < 1) {
        ctx.save(); ctx.globalAlpha *= 1 - burst;
        for (let q = 0; q < 4; q++) v.line(x - 16 - q * 6, y - 6 - q * 5, x - 44 - q * 6, y - 6 - q * 5, v.c.gold, 2.2);
        ctx.restore();
        if (burst < 0.75) v.label('BURST!', id ? x + 44 : x + 2, id ? y - 24 : y - 44, 13, v.c.gold);
      }
      v.hero(id, x, y, { s, face: 1, rot, sq, mood, shadow: y > gy - 4 });
      if (id === 1) { const oop = v.seg(k, jumps[1][0] + AIR * 0.8, jumps[1][0] + AIR + 0.12); if (oop > 0 && oop < 1) v.label('Oops!', x + 40, gy - 22, 13, '#ffffff'); }
    }
    if (k > 0.04 && k < 0.14) v.label('GO!', 160, 104, 24, v.c.gold);
    // Pip wins by a chest
    if (k > 0.86) {
      const px = sx(xs[0]), m = v.ease.back(v.seg(k, 0.86, 0.9));
      v.star(px, lanes[0].gy - 52, 9 * m, v.c.gold, t * 2);
      v.label('WIN!', px + 34, lanes[0].gy - 40, 14, v.c.gold);
      v.confetti(px, lanes[0].gy - 30, v.seg(k, 0.86, 1), 18);
    }
  },
  // a hurdle seen a little from the side (near leg, far leg, the striped bar), feet at (x, gy); tip > 0 tips it forward
  hurdle(v, x, gy, s, tip) {
    const ctx = v.ctx, h = 26, fx = 12, fy = -10;
    ctx.save(); ctx.translate(x, gy); ctx.scale(s, s); ctx.rotate(tip);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#3d3a5c'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(fx - 10, fy); ctx.lineTo(fx, fy); ctx.lineTo(fx, fy - h + 2); ctx.stroke();
    ctx.strokeStyle = '#d9dbe8'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(0, 0); ctx.lineTo(0, -h + 2); ctx.stroke();
    const bh = 7, bar = () => { ctx.beginPath(); ctx.moveTo(-2, -h - 2); ctx.lineTo(fx + 2, fy - h - 2); ctx.lineTo(fx + 2, fy - h + bh); ctx.lineTo(-2, -h + bh); ctx.closePath(); };
    ctx.save(); bar(); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.clip();
    ctx.fillStyle = '#e8443a';
    for (let i = 0; i < 4; i++) ctx.fillRect(-2 + i * 5, -h - 20, 2.6, 34);
    ctx.restore();
    bar(); ctx.strokeStyle = 'rgba(28,26,54,0.6)'; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.restore();
  },
});

/* ---------- 11-4 Javelin Throw ---------- */
// both run up and throw at once: Pip's javelin lands at 66 m, Bo's perfect throw rides the tailwind to 82 m and wins
definePreview('Javelin Throw', {
  blurb: 'Run, throw at full power and watch the wind. The longest throw wins!',
  loop: 6.4, still: 4.05,
  draw(v, t) { pw11Loop(v, t / 6.4, k => this.scene(v, k, k * 6.4)); },
  scene(v, k, t) {
    const ctx = v.ctx, FX = 92, PX = 2.15, lanes = [{ gy: 132, d: 66 }, { gy: 170, d: 82 }];
    // sky, the stand with its roof flags blowing right (a tailwind), the torch and the crowd
    v.sky(); v.sun(292, 22, 10); v.clouds(t);
    ctx.fillStyle = '#5c6ea8'; ctx.fillRect(0, 50, v.W, 44);
    ctx.fillStyle = '#3f4f86'; ctx.fillRect(0, 90, v.W, 4);
    ctx.fillStyle = '#e9eef8'; ctx.fillRect(0, 44, v.W, 7); ctx.fillStyle = '#b7c0d6'; ctx.fillRect(0, 50, v.W, 2);
    const cheer = k > 0.6 && k < 0.95 ? 1 : 0.2;
    pw11Crowd(v, 5, v.W, 62, 3, 12, t, cheer, 53);
    const flags = [['#ff6f91', '#ffe066'], ['#3ec7a8', '#ffffff'], ['#8a7cf0', '#ffd34d'], ['#ff9a52', '#2fb3a6']];
    for (let i = 0; i < 5; i++) {
      const x = 20 + i * 70, f = flags[i % 4];
      if (i === 2) continue;
      v.line(x, 44, x, 24, '#8a90a6', 1.5);
      for (const [c, y0, yy] of [[f[0], 24, 30], [f[1], 30, 36]]) {
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y0);
        ctx.quadraticCurveTo(x + 8, y0 + Math.sin(t * 7 + i) * 2, x + 16, y0 + 1 + Math.sin(t * 7 + i + 1) * 2);
        ctx.lineTo(x + 16, yy + 1 + Math.sin(t * 7 + i + 1) * 2); ctx.quadraticCurveTo(x + 8, yy + Math.sin(t * 7 + i) * 2, x, yy); ctx.closePath(); ctx.fill();
      }
    }
    // the torch on the roof, its flame leaning with the wind
    ctx.fillStyle = '#8a90a6'; ctx.fillRect(157, 30, 6, 14);
    ctx.fillStyle = '#d9dde8'; ctx.beginPath(); ctx.moveTo(150, 24); ctx.lineTo(170, 24); ctx.lineTo(165, 32); ctx.lineTo(155, 32); ctx.closePath(); ctx.fill();
    const fl = t * 8;
    ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.moveTo(151, 24); ctx.quadraticCurveTo(152, 12, 168 + Math.sin(fl) * 2, 6); ctx.quadraticCurveTo(168, 16, 169, 24); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(155, 24); ctx.quadraticCurveTo(157, 16, 165 + Math.sin(fl * 1.3), 12); ctx.quadraticCurveTo(165, 18, 165, 24); ctx.closePath(); ctx.fill();
    // the field: grass, distance lines and boards, runways, the foul line
    const g = ctx.createLinearGradient(0, 94, 0, v.H);
    g.addColorStop(0, '#79c95e'); g.addColorStop(1, '#8edb6d');
    ctx.fillStyle = g; ctx.fillRect(0, 94, v.W, v.H - 94);
    for (const m of [20, 40, 60, 80]) {
      const x = FX + m * PX;
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(x - 1, 106, 2, v.H - 106);
      ctx.fillStyle = '#ffffff'; v.rr(x - 16, 95, 32, 13, 4); ctx.fill();
      v.text(m + ' m', x, 102, 10, v.c.ink, 'center', true);
    }
    for (const { gy } of lanes) {
      ctx.fillStyle = '#a9472d'; ctx.fillRect(0, gy - 7, FX, 15);
      ctx.fillStyle = '#d0603f'; ctx.fillRect(0, gy - 8, FX, 13);
      ctx.fillStyle = '#e27a57'; ctx.fillRect(0, gy - 8, FX, 2.5);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, gy - 9, FX, 1.5); ctx.fillRect(0, gy + 6, FX, 1.5);
    }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(FX - 2, 106, 4, v.H - 106);
    for (const { gy } of lanes) { ctx.fillStyle = '#ff5a5a'; ctx.fillRect(FX - 2, gy - 9, 4, 16); }
    // a javelin centred on (x, y), pointing along ang, with a grip in the thrower's colour
    const jav = (x, y, ang, id) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      const hl = 19;
      v.line(-hl, 0, hl - 5, 0, '#4d5470', 3.6); v.line(-hl, 0, hl - 5, 0, '#f3f5fa', 2);
      ctx.fillStyle = '#7d869c'; ctx.beginPath(); ctx.moveTo(hl + 3, 0); ctx.lineTo(hl - 6, -2.2); ctx.lineTo(hl - 6, 2.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = id ? v.c.bo : v.c.pip; ctx.fillRect(-4, -2, 8, 4);
      ctx.restore();
    };
    const REL = 0.3, best = k > 0.6;
    for (const id of [0, 1]) {
      const { gy, d } = lanes[id], land = FX + d * PX, flyEnd = REL + (id ? 0.25 : 0.22);
      // the run-up, the throw, then waiting to see how far it went
      const run = v.ease.inOut(v.seg(k, 0.04, REL)), x = v.lerp(30, FX - 12, run);
      const running = k > 0.04 && k < REL, throwK = v.seg(k, REL - 0.03, REL + 0.04);
      let y = gy + (running ? v.hop(v.phase(t, 0.26, id * 0.5), 4) : 0), mood = running ? 'grit' : 'happy', rot = running ? 0.12 : 0;
      if (throwK > 0 && throwK < 1) rot = -0.25 + 0.6 * throwK;
      let sq = 0;
      if (best) { mood = id === 1 ? 'joy' : 'wow'; rot = 0; if (id === 1) { const hk = v.phase(t, 0.5); y = gy + v.hop(hk, 3); sq = hk < 0.15 || hk > 0.9 ? 0.22 : -0.08; } }
      // the power meter behind the athlete fills as they run; Bo's reaches the top
      if (k < REL + 0.12) {
        const mk = Math.min(1, run * (id ? 1.02 : 0.72)), mx = x - 24, my = gy - 34;
        ctx.fillStyle = 'rgba(28,26,54,0.88)'; v.rr(mx - 2, my - 2, 9, 32, 3); ctx.fill();
        ctx.fillStyle = mk < 0.5 ? '#5bd36a' : mk < 0.85 ? '#ffd34d' : '#ff7b4a'; ctx.fillRect(mx, my + 28 * (1 - mk), 5, 28 * mk);
        if (id === 1 && k > REL - 0.02 && k < REL + 0.1) v.label('Perfect!', x + 40, gy - 14, 12, v.c.gold);
      }
      v.hero(id, x, y, { face: 1, rot, mood, sq });   // (Bo hops only a little: Pip's lane is right above)
      // the javelin: held over the head, then a long arc down the field, then stuck in the grass with a little wobble
      const fk = v.seg(k, REL, flyEnd);
      if (k < REL) jav(x - 2, y - 30 - Math.sin(rot) * 6, -0.22, id);
      else if (fk < 1) {
        const x0 = FX - 6, y0 = gy - 30, peak = id ? 74 : 66;
        const px = f => v.lerp(x0, land, f), py = f => v.lerp(y0, gy - 8, f) - 4 * peak * f * (1 - f);
        // a whoosh streak behind it (white and the thrower's colour, like the game) and its shadow on the grass
        ctx.save(); ctx.lineCap = 'round';
        const a0 = ctx.globalAlpha;
        for (let i = 1; i <= 6; i++) {
          const f0 = Math.max(0, fk - i * 0.045), f1 = Math.max(0, fk - (i - 1) * 0.045);
          ctx.globalAlpha = a0 * 0.75 * (1 - i / 7); ctx.strokeStyle = i % 2 ? '#ffffff' : id ? v.c.bo : v.c.pip; ctx.lineWidth = 4.5 - i * 0.5;
          ctx.beginPath(); ctx.moveTo(px(f0), py(f0)); ctx.lineTo(px(f1), py(f1)); ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.beginPath(); ctx.ellipse(px(fk), gy + 1, 12, 2, 0, 0, Math.PI * 2); ctx.fill();
        const dx = land - x0, dy = (gy - 8 - y0) - 4 * peak * (1 - 2 * fk);
        jav(px(fk), py(fk), Math.atan2(dy, dx), id);
      } else {
        const wob = Math.sin((k - flyEnd) * 6.4 * 30) * 0.18 * Math.max(0, 1 - (k - flyEnd) / 0.06), a = 0.75 + wob;
        jav(land - Math.cos(a) * 15, gy - Math.sin(a) * 15, a, id);
        v.puff(land, gy, v.seg(k, flyEnd, flyEnd + 0.1), 'rgba(201,180,138,0.9)');
        // the distance flag next to it
        const fpop = v.ease.back(v.seg(k, flyEnd + 0.02, flyEnd + 0.07));
        if (fpop > 0) {
          const lab = d + ' m', px = land + 5, ph = id ? 30 : 22;
          v.line(px, gy, px, gy - ph, '#ffffff', 1.5);
          ctx.save(); ctx.translate(px, gy - ph); ctx.scale(fpop, fpop);
          ctx.fillStyle = id ? v.c.bo : v.c.pip; v.rr(0, 0, 31, 15, 3); ctx.fill();
          v.text(lab, 15.5, 8, 11, '#ffffff', 'center', true);
          ctx.restore();
          if (id === 1 && best) v.star(px + 16, gy - 40, 8 + Math.sin(t * 6), v.c.gold, t);
        }
      }
    }
    if (k > 0.02 && k < 0.12) v.label('GO!', 52, 92, 20, v.c.gold);
    if (best) {
      v.label('WIN!', 124, lanes[1].gy - 18, 16, v.c.gold);
      v.confetti(80, lanes[1].gy - 30, v.seg(k, 0.6, 0.95), 18);
    }
  },
});
