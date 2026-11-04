/* Pip & Bo - Level previews for World 12 (see js/previews/preview-core.js for how to write one). */
'use strict';

/* ---------- shared bits for World 12 (every top-level name starts with pw12) ---------- */
// draws scene(k) and, at the end of the loop, crossfades its foreground into the opening frame's, so the loop has no seam
// scene(k, part) draws the background (part 1, the same at both ends of the loop) and/or the moving foreground (part 2)
function pw12Loop(v, k, scene, from = 0.92) {
  if (k <= from) { scene(k, 3); return; }
  const a = v.ease.inOut(v.seg(k, from, 1)), ctx = v.ctx;
  scene(k, 1);
  ctx.save(); ctx.globalAlpha *= 1 - a; scene(k, 2); ctx.restore();
  ctx.save(); ctx.globalAlpha *= a; scene(0, 2); ctx.restore();
}
// a six-armed snowflake
function pw12Flake(v, x, y, r, col = '#fff', lw = 1.6) {
  const ctx = v.ctx;
  ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3, cx = Math.cos(a), sy = Math.sin(a), mx = x + cx * r * 0.6, my = y + sy * r * 0.6, b = r * 0.3;
    ctx.moveTo(x, y); ctx.lineTo(x + cx * r, y + sy * r);
    if (r < 6) continue; // small ones: just the arms
    ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(a + 0.7) * b, my + Math.sin(a + 0.7) * b);
    ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(a - 0.7) * b, my + Math.sin(a - 0.7) * b);
  }
  ctx.stroke();
}
// a penguin fan or judge (like the game's), feet at (x, y); scarf: an optional scarf colour
function pw12Penguin(v, x, y, s = 1, flap = 0, scarf) {
  const ctx = v.ctx, P = Math.PI * 2;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#ffa53d'; ctx.beginPath(); ctx.ellipse(-4, 0, 3.5, 1.6, 0, 0, P); ctx.ellipse(4, 0, 3.5, 1.6, 0, 0, P); ctx.fill();
  ctx.fillStyle = '#26324a'; ctx.beginPath(); ctx.ellipse(0, -14, 10, 14, 0, 0, P); ctx.fill();
  for (const sd of [-1, 1]) { ctx.save(); ctx.translate(sd * 9, -16); ctx.rotate(sd * (-0.5 - flap)); ctx.beginPath(); ctx.ellipse(0, 4, 3, 8, 0, 0, P); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, -11, 6.5, 10, 0, 0, P); ctx.fill();
  v.circle(-3, -21, 2.4); ctx.fill(); v.circle(3, -21, 2.4); ctx.fill();
  ctx.fillStyle = v.c.ink; v.circle(-3, -20.6, 1.2); ctx.fill(); v.circle(3, -20.6, 1.2); ctx.fill();
  ctx.fillStyle = '#ffa53d'; ctx.beginPath(); ctx.moveTo(-3, -17); ctx.lineTo(3, -17); ctx.lineTo(0, -13.5); ctx.closePath(); ctx.fill();
  if (scarf) { ctx.fillStyle = scarf; ctx.fillRect(-8, -16, 16, 3); }
  ctx.restore();
}
// a gold medal on a ribbon, hanging from (x, y)
function pw12Medal(v, x, y, s = 1) {
  if (s <= 0) return;
  const ctx = v.ctx;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = v.c.bo; ctx.beginPath(); ctx.moveTo(-9, -14); ctx.lineTo(-3, -14); ctx.lineTo(3, 2); ctx.lineTo(-3, 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = v.c.pip; ctx.beginPath(); ctx.moveTo(9, -14); ctx.lineTo(3, -14); ctx.lineTo(-3, 2); ctx.lineTo(3, 2); ctx.closePath(); ctx.fill();
  v.fillCircle(0, 9, 10, v.c.goldDark); v.fillCircle(0, 9, 8.5, v.c.gold);
  v.star(0, 9, 5.5, '#fff6c8');
  ctx.restore();
}

/* ---------- 12-1 Curling ---------- */
// top-down sheet: Pip slides the stone, Bo skates beside it sweeping, and it stops right on the button
definePreview('Curling', {
  blurb: 'One slides the stone, the other sweeps the ice so it glides to the middle!',
  loop: 6, still: 2.5,
  draw(v, t) { pw12Loop(v, t / 6, (k, part) => this.scene(v, k, k * 6, part)); },
  scene(v, k, t, part) {
    const ctx = v.ctx, y0 = 52, y1 = 156, cy = 106, hx = 262, hog = 186, sr = 9;
    if (part & 1) { // the background: stands, sheet, snow bank
      // the stands: rows of penguin fans, then the snowflake banner on the boards
      ctx.fillStyle = '#5d7fa8'; ctx.fillRect(0, 0, v.W, 40);
      for (let r = 0; r < 2; r++) { ctx.fillStyle = r ? '#6c8fba' : '#7a9cc6'; ctx.fillRect(0, 6 + r * 17, v.W, 8); }
      const cheer = v.seg(k, 0.66, 0.7) * (1 - v.seg(k, 0.86, 0.9));
      // (the crowd is drawn in one path per colour: twenty little penguins, flapping when they cheer)
      const fans = [];
      for (let r = 0; r < 2; r++) for (let i = 0; i < 10; i++) fans.push([14 + i * 32 + r * 16, 18 + r * 17 - cheer * Math.abs(Math.sin(t * 10 + i + r)) * 4, cheer * Math.sin(t * 16 + i) * 0.6]);
      const crowd = (col, f) => { ctx.fillStyle = col; ctx.beginPath(); for (const [x, y, fl] of fans) f(x, y, fl); ctx.fill(); };
      const P2 = Math.PI * 2;
      crowd('#26324a', (x, y, fl) => {
        ctx.moveTo(x + 5, y - 7); ctx.ellipse(x, y - 7, 5, 7, 0, 0, P2);
        for (const sd of [-1, 1]) { const a = sd * (0.5 + fl), wx = x + sd * 4.5 - Math.sin(a) * 2, wy = y - 8 + Math.cos(a) * 2; ctx.moveTo(wx + 1.5, wy); ctx.ellipse(wx, wy, 1.5, 4, a, 0, P2); }
      });
      crowd('#fff', (x, y) => { ctx.moveTo(x + 3.2, y - 5.5); ctx.ellipse(x, y - 5.5, 3.2, 5, 0, 0, P2); ctx.moveTo(x - 0.3, y - 10.5); ctx.arc(x - 1.5, y - 10.5, 1.2, 0, P2); ctx.moveTo(x + 2.7, y - 10.5); ctx.arc(x + 1.5, y - 10.5, 1.2, 0, P2); });
      crowd(v.c.ink, (x, y) => { ctx.moveTo(x - 0.9, y - 10.3); ctx.arc(x - 1.5, y - 10.3, 0.6, 0, P2); ctx.moveTo(x + 2.1, y - 10.3); ctx.arc(x + 1.5, y - 10.3, 0.6, 0, P2); });
      crowd('#ffa53d', (x, y) => { ctx.moveTo(x - 1.5, y - 8.5); ctx.lineTo(x + 1.5, y - 8.5); ctx.lineTo(x, y - 6.8); ctx.closePath(); });
      ctx.fillStyle = '#2f4f7f'; ctx.fillRect(0, 38, v.W, 12);
      const fc = ['#9fd8ff', '#fff', '#c9b8ff', '#7fe0d8', '#d6e2f0'];
      for (let i = 0; i < 9; i++) pw12Flake(v, 20 + i * 35, 44, 4, fc[i % 5], 1.3);
      // the sheet: wood border, ice, the house, the lines
      ctx.fillStyle = '#c99760'; ctx.fillRect(0, y0 - 3, v.W, y1 - y0 + 6);
      const ice = ctx.createLinearGradient(0, y0, 0, y1);
      ice.addColorStop(0, '#eaf6ff'); ice.addColorStop(0.5, '#f6fbff'); ice.addColorStop(1, '#d6ecfa');
      ctx.fillStyle = ice; ctx.fillRect(0, y0, v.W, y1 - y0);
      ctx.fillStyle = 'rgba(150,190,225,0.35)';
      ctx.beginPath(); for (let q = 0; q < 40; q++) { const x = v.rand(q * 3 + 1) * v.W, y = y0 + 4 + v.rand(q * 5 + 2) * (y1 - y0 - 8); ctx.moveTo(x + 0.9, y); ctx.arc(x, y, 0.9, 0, Math.PI * 2); } ctx.fill();
      v.fillCircle(hx, cy, 36, '#4f8fe0'); v.fillCircle(hx, cy, 24, '#fff'); v.fillCircle(hx, cy, 12, '#ff5f6d'); v.fillCircle(hx, cy, 4, '#fff');
      ctx.strokeStyle = 'rgba(40,70,110,0.4)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(30, cy); ctx.lineTo(v.W, cy); ctx.moveTo(hx, y0); ctx.lineTo(hx, y1); ctx.moveTo(304, y0); ctx.lineTo(304, y1); ctx.stroke();
      v.line(hog, y0, hog, y1, 'rgba(230,80,100,0.75)', 3);
      ctx.fillStyle = '#2c2a40'; v.rr(14, cy - 13, 7, 8, 2); ctx.fill(); v.rr(14, cy + 5, 7, 8, 2); ctx.fill();
      // snow bank below
      ctx.fillStyle = '#f4fbff'; ctx.fillRect(0, y1 + 3, v.W, v.H);
      ctx.fillStyle = '#ddeefa'; ctx.beginPath(); for (let x = 0; x < v.W + 20; x += 24) { ctx.moveTo(x + 10, y1 + 18); ctx.arc(x, y1 + 18, 10, 0, Math.PI * 2); } ctx.fill();
    }
    if (!(part & 2)) return;
    // the stone: released at 0.14, slows down along a gentle curl and stops on the button at 0.66
    const rel = 0.14, stop = 0.66, u = v.ease.out(v.seg(k, rel, stop));
    const sx = v.lerp(50, hx, u), sy = cy - 16 * u * (1 - u) * 2.2;
    const sliding = k > rel && k < stop;
    // Pip: crouched at the hack, lunges forward on the throw, then cheers
    const lunge = v.ease.out(v.seg(k, rel - 0.04, rel + 0.08));
    const pipX = 22 + lunge * 16, pipY = cy + 8;
    // Bo: waits near the boards, skates to the stone, then sweeps right beside it
    const grab = v.ease.inOut(v.seg(k, rel + 0.02, rel + 0.14));
    let boX = v.lerp(84, sx + 2, grab), boY = v.lerp(y1 - 4, sy - 12, grab);
    if (k > rel + 0.14) { boX = sx + 2; boY = sy - 12; }
    // after the stop Bo glides back off the house so the rings show
    const back = v.ease.inOut(v.seg(k, stop + 0.01, stop + 0.08));
    if (back > 0) boX = v.lerp(hx + 2, hx - 50, back);
    const sweeping = k > rel + 0.12 && k < stop;
    const happy = k > stop + 0.02;
    const skate = sliding ? v.hop(v.phase(t, 0.32), 2) : 0;
    v.hero(0, pipX, pipY + (happy ? v.hop(v.phase(t, 0.45, 0.22), 6) : 0), { face: 1, sq: k < rel ? 0.25 : lunge > 0 && lunge < 1 ? 0.15 : 0, mood: happy ? 'joy' : k < rel ? 'grit' : 'happy' });
    v.hero(1, boX, boY + (happy ? v.hop(v.phase(t, 0.45), 6) : skate), { face: 1, mood: happy ? 'joy' : sweeping ? 'grit' : 'happy' });
    // the stone (orange middle: Pip threw it), handle turning as it spins
    ctx.fillStyle = 'rgba(40,70,110,0.22)'; v.circle(sx + 1.5, sy + 2, sr + 1); ctx.fill();
    const g = ctx.createRadialGradient(sx - 3, sy - 3, 1, sx, sy, sr);
    g.addColorStop(0, '#b9c0cf'); g.addColorStop(1, '#7d8598');
    ctx.fillStyle = g; v.circle(sx, sy, sr); ctx.fill();
    ctx.strokeStyle = '#535a6e'; ctx.lineWidth = 1.4; ctx.stroke();
    v.fillCircle(sx, sy, sr * 0.62, v.c.pip); ctx.strokeStyle = v.c.pipDark; ctx.lineWidth = 1.2; v.circle(sx, sy, sr * 0.62); ctx.stroke();
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(u * 5); ctx.fillStyle = '#fff'; v.rr(-2, -sr * 0.75, 4, sr * 1.1, 2); ctx.fill(); ctx.restore();
    // Bo's broom: in front of the stone, scrubbing side to side while sweeping
    const wig = sweeping ? Math.sin(t * 30) * 4 : 0;
    const brX = grab < 1 || back > 0 ? boX + 16 : sx + 15, brY = grab < 1 || back > 0 ? boY + 6 : sy + wig;
    v.line(boX + 6, boY - 10, brX, brY, '#8a5833', 2.5);
    ctx.save(); ctx.translate(brX, brY); ctx.fillStyle = v.c.bo; v.rr(-2.5, -6, 5, 12, 2); ctx.fill(); ctx.fillStyle = '#fff'; v.rr(1, -5, 3, 10, 1.5); ctx.fill(); ctx.restore();
    if (sweeping) for (let q = 0; q < 3; q++) { const f = v.phase(t, 0.3, q / 3); v.fillCircle(brX + 4 + f * 10, brY + (v.rand(q + Math.floor(t / 0.3) * 3) - 0.5) * 12, 1.8 * (1 - f) + 0.4, 'rgba(255,255,255,0.9)'); }
    // words: Pip's throw, Bo's sweeping, the bullseye
    if (k > rel - 0.06 && k < rel + 0.1) v.bubble('GO!', pipX + 2, pipY - 30, { size: 11 });
    if (sweeping && k > rel + 0.16) v.label('SWEEP!', sx + 10, 140, 14, '#bfe8ff');
    if (happy) {
      const pop = v.ease.back(v.seg(k, stop + 0.02, stop + 0.07));
      v.fillCircle(sx + 11, sy - 11, 7 * pop, v.c.gold); v.text('3', sx + 11, sy - 10.5, 10 * pop, v.c.ink, 'center', true);
      v.label('BULLSEYE!', 196, 140, 16 * pop, v.c.gold);
      v.star(hx - 30, 66, 7 * pop); v.star(hx + 30, 66, 7 * pop);
      v.confetti(hx, cy - 10, v.seg(k, stop + 0.02, 0.95));
    }
  },
});

/* ---------- 12-2 Bobsled ---------- */
// one rider seen from behind, seated (hips at (x, y), in the sled's units like the game's bobDrawRider): lean tips the
// body toward the curve
function pw12Rider(v, id, x, y, sc, lean) {
  const ctx = v.ctx, col = id ? v.c.bo : v.c.pip, dark = id ? v.c.boDark : v.c.pipDark, bh = 46, hy = -bh - 22;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.rotate(lean * 0.3);
  ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 3.5;
  v.rr(-30, -bh, 60, bh + 20, 18); ctx.fill(); ctx.stroke();
  ctx.fillStyle = dark; ctx.fillRect(-4, -bh + 4, 8, bh - 4);
  if (id === 1) { ctx.fillStyle = col; ctx.lineWidth = 3; for (const ex of [-18, 18]) { v.circle(ex, hy - 16, 9); ctx.fill(); ctx.stroke(); } }
  ctx.fillStyle = col; ctx.lineWidth = 3.5; v.circle(0, hy, 25); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.fillRect(-4, hy - 24, 8, 40);
  if (id === 0) { v.line(0, hy - 25, 2, hy - 36, '#3f8f5c', 3); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(9, hy - 39, 10, 5, -0.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
// a rider running beside the sled at the push start, seen from behind (feet at (x, y)); ph swings the legs, push leans in
function pw12Runner(v, id, x, y, s, ph, push) {
  const ctx = v.ctx, col = id ? v.c.bo : v.c.pip, dark = id ? v.c.boDark : v.c.pipDark;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(40,60,100,0.18)'; ctx.beginPath(); ctx.ellipse(0, 0, 30, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = dark;
  for (const sd of [-1, 1]) { const lift = Math.max(0, Math.sin(ph + (sd > 0 ? Math.PI : 0))) * 22; v.rr(sd * 14 - 8, -60, 16, 60 - lift, 7); ctx.fill(); }
  ctx.translate(0, -56); ctx.rotate(push * -0.12 * (id ? -1 : 1)); ctx.scale(1, 1 - 0.2 * push);
  ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 3.5;
  v.rr(-28, -80, 56, 86, 18); ctx.fill(); ctx.stroke();
  ctx.fillStyle = dark; ctx.fillRect(-4, -76, 8, 78);
  if (id === 1) { ctx.fillStyle = col; ctx.lineWidth = 3; for (const ex of [-18, 18]) { v.circle(ex, -118, 9); ctx.fill(); ctx.stroke(); } }
  ctx.fillStyle = col; ctx.lineWidth = 3.5; v.circle(0, -102, 25); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.fillRect(-4, -126, 8, 40);
  if (id === 0) { v.line(0, -127, 2, -138, '#3f8f5c', 3); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(9, -141, 10, 5, -0.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
// chase cam down the ice run: push on the beat, hop in, both lean right, both lean left, finish, gold!
definePreview('Bobsled', {
  blurb: 'Push off together, hop in, then BOTH lean into every curve!',
  loop: 7.5, still: 2.75,
  draw(v, t) { pw12Loop(v, t / 7.5, (k, part) => this.scene(v, k * 7.5, part)); },
  // how fast the sled goes (m/s) and how far it has gone at time t
  speed: t => (t < 1.5 ? 1 + t * 1.6 : t < 2.2 ? 3.4 + (t - 1.5) * 15 : t < 6.1 ? 14 : Math.max(0, 14 - (t - 6.1) * 18)),
  travel(t) {
    if (t < 1.5) return t + 0.8 * t * t;
    if (t < 2.2) { const d = t - 1.5; return 3.3 + 3.4 * d + 7.5 * d * d; }
    if (t < 6.1) return 9.355 + 14 * (t - 2.2);
    const d = Math.min(t - 6.1, 14 / 18); return 63.955 + 14 * d - 9 * d * d;
  },
  // the curve under the sled: +1 right, -1 left
  finS: 9.355 + 14 * 3.8 + 1.4,   // the finish line passes under the sled at t = 6.0
  curve(v, t) {
    const sm = k => k * k * (3 - 2 * k);
    return sm(v.seg(t, 1.9, 2.3)) - sm(v.seg(t, 2.9, 3.3)) - sm(v.seg(t, 3.7, 4.1)) + sm(v.seg(t, 4.6, 5.0));
  },
  scene(v, t, part) {
    const ctx = v.ctx, hor = 72, D = 120, camH = 1, zs = 1.4, fw = 0.7, seg = 1.5;
    const c = this.curve(v, t), cAhead = this.curve(v, t + 0.35), tr = this.travel(t);
    const fog = [234, 244, 251];
    const mix = (col, f) => 'rgb(' + col.map((q, i) => Math.round(q + (fog[i] - q) * f)).join(',') + ')';
    const P = (lat, h, z) => ({ X: 160 + (lat + cAhead * 0.03 * z * z) * D / z, Y: hor + (camH - h) * D / z });
    if (part & 1) { // the background: sky, peaks, the ice channel, speed streaks
      // sky and snowy peaks (they slide the other way as the run bends)
      v.sky(); v.sun(270, 30, 13);
      const sh = -cAhead * 40;
      for (const [layer, col] of [[0, v.c.hillFar], [1, v.c.hillNear]]) for (let i = 0; i < 6; i++) {
        const x = ((i * 80 + layer * 40 + sh) % 480 + 480) % 480 - 80, h = 26 + v.rand(i + layer * 7) * 26 - layer * 8, w = 50 - layer * 6;
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - w, hor + 2); ctx.lineTo(x, hor - h); ctx.lineTo(x + w, hor + 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - w * 0.3, hor - h * 0.7); ctx.lineTo(x, hor - h); ctx.lineTo(x + w * 0.3, hor - h * 0.7); ctx.lineTo(x, hor - h * 0.6); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#f7fcff'; ctx.fillRect(0, hor, v.W, v.H - hor);
      // the ice channel, far to near: floor, two wall bands and the striped lip on each side
      const quad = (a, b, cc, d, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(a.X, a.Y); ctx.lineTo(b.X, b.Y); ctx.lineTo(cc.X, cc.Y); ctx.lineTo(d.X, d.Y); ctx.closePath(); ctx.fill(); };
      const prof = [[fw, 0], [1.3, 0.7], [1.42, 0.78]];
      const walls = [[196, 225, 247], null], wallsR = [[178, 212, 240], null];
      // the stripes move a whole number of stripe patterns (6 m) over the loop, so the last frame matches the first
      const off = (tr * 72 / 69.4) % (4 * seg), finZ = this.finS - tr;
      const drawFinish = () => {
        if (finZ < 0.7 || finZ > 40) return;
        const f = Math.min(0.85, finZ / 40), pl = P(-1.6, 0.78, finZ), pr = P(1.6, 0.78, finZ), tl = P(-1.6, 4.2, finZ), trr = P(1.6, 4.2, finZ);
        const pw = Math.max(1.5, 0.12 * D / finZ);
        ctx.fillStyle = mix([232, 67, 79], f); ctx.fillRect(pl.X - pw / 2, tl.Y, pw, pl.Y - tl.Y); ctx.fillRect(pr.X - pw / 2, trr.Y, pw, pr.Y - trr.Y);
        const bh = 0.6 * D / finZ;
        ctx.fillStyle = mix([42, 39, 64], f); v.rr(tl.X - pw, tl.Y - bh * 0.6, trr.X - tl.X + pw * 2, bh, bh * 0.25); ctx.fill();
        if (bh > 4) v.text('FINISH', (tl.X + trr.X) / 2, tl.Y - bh * 0.1, Math.min(22, bh * 0.75), '#fff');
      };
      for (let i = 24; i >= 0; i--) {
        let za = 0.6 + i * seg - off, zb = za + seg;
        if (zb <= 0.6 || za > 31) continue;
        za = Math.max(0.6, za);
        const f = Math.pow(Math.min(1, za / 31), 1.2) * 0.9;
        const A = (l, h) => P(l, h, za), B = (l, h) => P(l, h, zb);
        quad(A(-fw, 0), A(fw, 0), B(fw, 0), B(-fw, 0), mix(i % 2 ? [232, 245, 255] : [214, 234, 251], f));
        for (const sd of [-1, 1]) {
          for (let b = 0; b < 2; b++) {
            const [l0, h0] = prof[b], [l1, h1] = prof[b + 1];
            const col = b === 1 ? ((i >> 1) % 2 ? [232, 67, 79] : [79, 143, 224]) : (sd < 0 ? walls : wallsR)[b];
            quad(A(sd * l0, h0), A(sd * l1, h1), B(sd * l1, h1), B(sd * l0, h0), mix(col, f));
          }
        }
        // the checkered finish line on the floor, and the arch over it
        if (finZ >= za && finZ < zb) {
          for (let q = 0; q < 6; q++) quad(P(-fw + q * fw / 3, 0, finZ), P(-fw + (q + 1) * fw / 3, 0, finZ), P(-fw + (q + 1) * fw / 3, 0, finZ + 0.4), P(-fw + q * fw / 3, 0, finZ + 0.4), q % 2 ? '#fff' : '#2a2740');
        }
        if (finZ >= za && finZ < zb && finZ > zs) drawFinish();
      }
      // speed streaks in the snow beside the run
      const fast = v.clamp((this.speed(t) - 4) / 10, 0, 1);
      if (fast > 0) for (let q = 0; q < 6; q++) {
        const f = v.phase(t, 0.35, q / 6), sd = q % 2 ? 1 : -1, x = 160 + sd * (90 + f * 90 + v.rand(q) * 20), y = 120 + f * 60 + v.rand(q + 9) * 10;
        ctx.save(); ctx.globalAlpha *= fast * (1 - f) * 0.9; v.line(x, y, x + sd * 10 * (0.5 + f), y + 6 * (0.5 + f), '#fff', 2); ctx.restore();
      }
    }
    if (!(part & 2)) return;
    // the sled: rides a little up the outer wall in a curve, banked
    const u = -c * 0.32, sp = P(u, 0.06 * c * c, zs), sc = 0.72, rot = c * 0.2, X = sp.X, Y = sp.Y;
    const hopA = id => v.seg(t, 1.15 + id * 0.12, 1.5 + id * 0.12);
    const beat = t < 1.15 ? Math.max(0, Math.sin(Math.PI * v.seg(v.phase(t, 0.5, 0.35), 0, 0.4))) : 0;
    const joy = v.seg(t, 6.15, 6.35);
    // seated riders: Pip pilots in front (higher, smaller), Bo brakes at the back; both lean the curve's way
    const lean = c, hipY = [-112, -40];
    ctx.fillStyle = 'rgba(40,60,100,0.18)'; ctx.beginPath(); ctx.ellipse(X, Y + 3, 40, 6, rot, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(X, Y); ctx.rotate(rot); ctx.scale(sc, sc);
    if (joy <= 0) {
      if (hopA(0) >= 1) pw12Rider(v, 0, lean * 12, hipY[0], 0.62, lean);
      if (hopA(1) >= 1) pw12Rider(v, 1, lean * 8, hipY[1], 0.78, lean);
    }
    ctx.restore();
    // at the finish they stand up and turn round to cheer
    if (joy > 0) {
      const hp = id => v.hop(v.phase(t, 0.5, id * 0.25), 7) * joy;
      v.hero(0, X - 15, Y - 40 + hp(0) - 6 * joy, { s: 1.05, face: 1, mood: 'joy', shadow: false });
      v.hero(1, X + 15, Y - 36 + hp(1) - 6 * joy, { s: 1.1, face: -1, mood: 'joy', shadow: false });
    }
    ctx.save(); ctx.translate(X, Y); ctx.rotate(rot); ctx.scale(sc, sc);
    ctx.fillStyle = '#3a3654'; v.rr(-38, -12, 10, 12, 3); ctx.fill(); v.rr(28, -12, 10, 12, 3); ctx.fill();
    ctx.fillStyle = '#e8434f'; ctx.strokeStyle = '#8a1f2c'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-46, -10); ctx.lineTo(46, -10); ctx.quadraticCurveTo(52, -40, 40, -62); ctx.quadraticCurveTo(0, -74, -40, -62); ctx.quadraticCurveTo(-52, -40, -46, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = v.c.gold; ctx.beginPath(); ctx.moveTo(-48, -32); ctx.lineTo(48, -32); ctx.lineTo(47, -24); ctx.lineTo(-47, -24); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.ellipse(-22, -52, 16, 6, -0.2, 0, Math.PI * 2); ctx.fill();
    v.fillCircle(0, -46, 10, '#fff'); v.star(0, -46, 7, '#e8434f');
    if (t < 1.6) { ctx.fillStyle = '#5a5a78'; ctx.fillRect(-40, -78, 6, 18); ctx.fillRect(34, -78, 6, 18); ctx.fillRect(-40, -80, 18, 5); ctx.fillRect(22, -80, 18, 5); }
    ctx.restore();
    // runners pushing at the start, then hopping up into their seats
    for (const id of [0, 1]) {
      const a = hopA(id);
      if (a >= 1) continue;
      const rx = X + (id ? 44 : -44), ry = Y + 10, seatY = Y + hipY[id] * sc, e = a * a * (3 - 2 * a);
      const px = v.lerp(rx, X, e), py = v.lerp(ry, seatY + 20 * sc, e) - Math.sin(Math.PI * a) * 26;
      pw12Runner(v, id, px, py, v.lerp(0.36, 0.26, e), t * 13 + id * 2, a > 0 ? 0 : beat);
    }
    // arrow badges above both riders while they lean into a curve
    if (Math.abs(c) > 0.35 && joy <= 0) {
      const dir = Math.sign(c), al = v.clamp((Math.abs(c) - 0.35) / 0.3, 0, 1);
      ctx.save(); ctx.globalAlpha *= al;
      for (const id of [0, 1]) {
        // beside each rider's helmet: hips, then up the leaning body, then the sled's bank
        const hx0 = lean * (id ? 8 : 12), hy0 = hipY[id], rs = id ? 0.78 : 0.62, la = lean * 0.3 + rot;
        const lx = hx0 * Math.cos(rot) - hy0 * Math.sin(rot), ly = hx0 * Math.sin(rot) + hy0 * Math.cos(rot);
        const hxS = X + lx * sc + Math.sin(la) * 68 * rs * sc, hyS = Y + ly * sc - Math.cos(la) * 68 * rs * sc;
        const bx = hxS + (id ? 27 : -25), by = hyS + (id ? 4 : -2);
        v.fillCircle(bx, by, 10, id ? v.c.bo : v.c.pip); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; v.circle(bx, by, 10); ctx.stroke();
        v.arrow(bx - dir * 5, by, bx + dir * 5, by, '#fff', 2.5);
      }
      ctx.restore();
    }
    // words
    if (t > 0.2 && t < 1.15) v.label('PUSH!', 160, 30, 18 + beat * 3, '#fff');
    if (t > 1.15 && t < 1.75) v.label('HOP IN!', 160, 30, 18, v.c.gold);
    if ((t > 1.95 && t < 2.9) || (t > 3.75 && t < 4.6)) v.label('LEAN!', 160, 20, 18, '#fff');
    if ((t > 3.0 && t < 3.6) || (t > 4.75 && t < 5.4)) v.label('SMOOTH!', 160, 20, 18, '#8fe3b0');
    if (joy > 0) {
      pw12Medal(v, 160, 26, v.ease.back(v.seg(t, 6.2, 6.45)) * 1.3);
      v.label('GOLD!', 214, 36, 18 * joy, v.c.gold);
      v.confetti(X, Y - 70, v.seg(t, 6.15, 7.3), 22);
    }
  },
});

/* ---------- 12-3 Ski Jump ---------- */
// a skier with feet at (x, y): skis at angle skiA (a second ski in a V while flying), the body tipped forward by lean
function pw12Skier(v, id, x, y, skiA, lean, o = {}) {
  const ctx = v.ctx, dark = id ? v.c.boDark : v.c.pipDark;
  ctx.save(); ctx.translate(x, y); ctx.rotate(skiA);
  const ski = (rot, alpha) => {
    ctx.save(); ctx.rotate(rot); ctx.globalAlpha *= alpha; ctx.fillStyle = dark;
    v.rr(-14, -1.2, 30, 3.2, 1.6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(15, -1.2); ctx.quadraticCurveTo(21, -2.5, 20, -6); ctx.lineTo(17.5, -4); ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  if (o.fly) ski(-0.18, 0.6);
  ski(0, 1);
  ctx.rotate(lean);
  v.hero(id, 0, -1.5, { face: 1, sq: o.sq || 0, mood: o.mood, shadow: false });
  ctx.restore();
}
// a giant wind fan on the catwalk (stand at (x, y), with its switch box), blowing straight up at the jumper while pow > 0
function pw12Fan(v, x, y, spin, pow, t) {
  const ctx = v.ctx, fy = y - 38;
  ctx.fillStyle = '#4a5578'; ctx.fillRect(x - 2.5, fy, 5, y - fy); ctx.fillRect(x - 8, y - 3, 16, 3);
  ctx.fillStyle = pow > 0 ? v.c.gold : '#9fb3d6'; v.rr(x + 1, y - 17, 8, 7, 2); ctx.fill();
  ctx.save(); ctx.translate(x, fy); ctx.scale(1, 0.62);
  v.fillCircle(0, 0, 14, '#2e3a5e'); ctx.strokeStyle = pow > 0 ? v.c.gold : '#e9eef9'; ctx.lineWidth = 3.5; v.circle(0, 0, 14); ctx.stroke();
  ctx.fillStyle = pow > 0.2 ? '#cfe8ff' : '#9fb3d6';
  for (let b = 0; b < 3; b++) { const a = spin + b * 2.094; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 6, Math.sin(a) * 6, 6, 3, a, 0, Math.PI * 2); ctx.fill(); }
  v.fillCircle(0, 0, 3, '#e9eef9');
  ctx.restore();
  if (pow <= 0) return;
  // the wind: wavy streaks rising from the fan
  ctx.save(); ctx.globalAlpha *= 0.85 * pow; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (let q = 0; q < 3; q++) {
    const f = v.phase(t, 0.45, q / 3), sx = x + (q - 1) * 8, y0 = fy - 8 - f * 50;
    ctx.beginPath();
    for (let s = 0; s <= 4; s++) ctx.lineTo(sx + Math.sin(s * 1.4 + t * 9 + q) * 2.5, y0 - s * 4);
    ctx.stroke();
  }
  ctx.restore();
}
// side view: Pip skis down and jumps, Bo runs along the catwalk switching on the fans under Pip, and Pip flies past K
definePreview('Ski Jump', {
  blurb: 'One jumps, the other turns on the fans to blow the jumper farther!',
  loop: 7, still: 2.5,
  draw(v, t) { pw12Loop(v, t / 7, (k, part) => this.scene(v, k * 7, part)); },
  hillY: x => 90 + 66 * (1 - Math.pow(1 - Math.min(1, Math.max(0, (x - 102) / 218)), 1.8)),
  scene(v, t, part) {
    const ctx = v.ctx, E = { x: 102, y: 86 }, hillY = this.hillY, catY = x => hillY(x) + 30;
    const fans = [132, 164, 196], greenX = 216, kX = 234, landX = 244, c0 = 112, c1 = 222;
    // the in-run: a curve from the start bar to the take-off lip
    const inr = u => { const a = 1 - u; return { x: a * a * 22 + 2 * a * u * 58 + u * u * E.x, y: a * a * 30 + 2 * a * u * 94 + u * u * E.y }; };
    if (part & 1) { // the background: sky, hill, in-run, catwalk
      // sky, far peaks, the snowy mountain and the landing hill
      v.sky(); v.sun(286, 28, 12);
      const drift = Math.sin(t / 7 * Math.PI * 2) * 12;
      v.cloud(150 + drift, 30, 0.9); v.cloud(232 - drift, 52, 0.7);
      for (let i = 0; i < 5; i++) {
        const x = 40 + i * 70, h = 30 + v.rand(i + 3) * 24;
        ctx.fillStyle = i % 2 ? v.c.hillFar : v.c.hillNear; ctx.beginPath(); ctx.moveTo(x - 50, 120); ctx.lineTo(x, 120 - h - 30); ctx.lineTo(x + 50, 120); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - 13, 120 - h - 22); ctx.lineTo(x, 120 - h - 30); ctx.lineTo(x + 13, 120 - h - 22); ctx.closePath(); ctx.fill();
      }
      const g = ctx.createLinearGradient(0, 86, 0, v.H);
      g.addColorStop(0, '#fff'); g.addColorStop(1, '#c4def3');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-2, v.H); ctx.lineTo(-2, 120); ctx.quadraticCurveTo(56, E.y + 12, E.x, E.y + 8);
      for (let x = E.x; x <= v.W + 8; x += 8) ctx.lineTo(x, hillY(x));
      ctx.lineTo(v.W + 6, v.H); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8fb6dc'; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let x = E.x; x <= v.W + 8; x += 8) ctx.lineTo(x, hillY(x));
      ctx.stroke();
      // the green line and the K line on the landing hill
      const band = (x0, x1, col) => { ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath(); for (let x = x0; x <= x1; x += 4) ctx.lineTo(x, hillY(x) + 2); ctx.stroke(); };
      band(greenX, kX, 'rgba(63,207,114,0.6)'); band(kX, 262, 'rgba(255,197,61,0.7)');
      for (const [x, col, word] of [[greenX, '#3fcf72', ''], [kX, v.c.gold, 'K']]) {
        const y = hillY(x); ctx.fillStyle = col; ctx.fillRect(x - 1, y - 18, 2, 18); v.rr(x - 7, y - 28, 14, 12, 4); ctx.fill();
        if (word) v.text(word, x, y - 21.5, 10, v.c.ink);
      }
      // the in-run tower and track, with gold stripes at the take-off
      ctx.strokeStyle = '#8a97b8'; ctx.lineWidth = 2.5;
      for (const u of [0.15, 0.4, 0.65]) { const p = inr(u); ctx.beginPath(); ctx.moveTo(p.x, p.y + 4); ctx.lineTo(p.x, 124 - (p.x / E.x) * 30); ctx.stroke(); }
      for (const [off, col, lw] of [[3, '#6d7fa8', 6], [1, '#f4fbff', 3]]) {
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
        for (let u = 0; u <= 1.001; u += 0.05) { const p = inr(u); ctx.lineTo(p.x, p.y + off); }
        ctx.stroke();
      }
      for (let q = 0; q < 3; q++) { const p = inr(0.86 + q * 0.05); ctx.fillStyle = q % 2 ? '#fff' : v.c.gold; ctx.fillRect(p.x - 2, p.y + 1, 4, 3); }
      ctx.fillStyle = '#c0584a'; v.rr(4, 14, 16, 16, 3); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(1, 16); ctx.lineTo(12, 7); ctx.lineTo(23, 16); ctx.closePath(); ctx.fill();
      // the catwalk with the crew hut at its left end
      const hy = catY(c0);
      ctx.fillStyle = '#c0584a'; v.rr(c0 - 25, hy - 26, 28, 26, 4); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(c0 - 29, hy - 24); ctx.lineTo(c0 - 11, hy - 37); ctx.lineTo(c0 + 7, hy - 24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffe8a6'; ctx.fillRect(c0 - 21, hy - 20, 6, 6);
      ctx.fillStyle = v.c.plankDark; for (let x = c0 + 6; x < c1; x += 24) ctx.fillRect(x - 1.5, catY(x), 3, 12);
      for (const [col, lw, dy] of [[v.c.plankDark, 5, 1.5], [v.c.plank, 3, 0]]) {
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); for (let x = c0; x <= c1; x += 5) ctx.lineTo(x, catY(x) + dy); ctx.stroke();
      }
    }
    if (!(part & 2)) return;
    // Pip: start bar, in-run (tucked), take-off at 1.6, flight past the fans, a telemark past the K line, a slide to a stop
    const t0 = 0.5, tOff = 1.6, tLand = 3.4, tStop = 4.0;
    let px, py, skiA, lean, fly = false, sq = 0, mood = 'happy';
    if (t < tOff) {
      const u = 0.12 + 0.88 * v.ease.in(v.seg(t, t0, tOff)), p = inr(u), q = inr(Math.min(1, u + 0.02)), p0 = inr(Math.max(0, u - 0.02));
      px = p.x; py = p.y; skiA = Math.atan2(q.y - p0.y, q.x - p0.x); lean = 0.25; sq = t > t0 ? 0.3 : 0; mood = t > t0 ? 'grit' : 'happy';
    } else if (t < tLand) {
      const u = v.seg(t, tOff, tLand); px = v.lerp(E.x, landX, u);
      // a gentle arc, lifted a little by each fan as Pip passes over it
      let lift = 0;
      for (const fx of fans) lift += 7 * Math.max(0, 1 - Math.abs(px - fx - 8) / 22);
      py = v.lerp(E.y, hillY(landX), Math.pow(u, 1.7)) - 20 * Math.sin(Math.PI * u) - lift * Math.sin(Math.PI * u);
      skiA = 0.12 + u * 0.3; lean = 0.75 - u * 0.2; fly = true; mood = 'wow';
    } else {
      const u = v.ease.out(v.seg(t, tLand, tStop)); px = v.lerp(landX, 258, u); py = hillY(px);
      skiA = Math.atan2(hillY(px + 2) - hillY(px - 2), 4); lean = 0; sq = t < tLand + 0.25 ? 0.3 : 0; mood = 'joy';
    }
    // Bo: runs out of the hut and switches on each fan as Pip flies over it
    const spot = fans.map(fx => fx - 11);
    const bx = t < 1.55 ? v.lerp(c0 - 11, spot[0], v.ease.inOut(v.seg(t, 0.8, 1.55)))
      : t < 2.0 ? spot[0] : t < 2.22 ? v.lerp(spot[0], spot[1], v.ease.inOut(v.seg(t, 2.0, 2.22)))
        : t < 2.45 ? spot[1] : t < 2.67 ? v.lerp(spot[1], spot[2], v.ease.inOut(v.seg(t, 2.45, 2.67))) : spot[2];
    const on = [[1.8, 2.3], [2.25, 2.75], [2.7, 3.2]].map(([a, b]) => v.clamp(Math.min((t - a) / 0.12, (b - t) / 0.2), 0, 1));
    fans.forEach((fx, i) => pw12Fan(v, fx, catY(fx), t * (2 + 16 * on[i]) + i, on[i], t));
    const pressing = on.some(o => o > 0.5), running = (t > 0.8 && t < 1.55) || (t > 2.0 && t < 2.22) || (t > 2.45 && t < 2.67);
    const happy = t > tLand + 0.1;
    v.hero(1, bx, catY(bx) + (happy ? v.hop(v.phase(t, 0.5), 7) : running ? v.hop(v.phase(t, 0.3), 3) : 0), { face: 1, sq: pressing ? 0.15 : 0, mood: happy ? 'joy' : pressing ? 'grit' : 'happy' });
    // the penguin judges and their score cards
    for (let i = 0; i < 2; i++) {
      const jx = 289 + i * 20, card = v.ease.back(v.seg(t, 4.1 + i * 0.25, 4.35 + i * 0.25));
      pw12Penguin(v, jx, hillY(jx) + 4, 0.7, card * 0.4, i ? '#5b95ff' : '#ff5f6d');
      if (card > 0.02) { ctx.fillStyle = '#fff'; v.rr(jx - 9, hillY(jx) - 40 - card * 4, 18, 14, 3); ctx.fill(); v.text('10', jx, hillY(jx) - 32.5 - card * 4, 10 * card, v.c.ink); }
    }
    pw12Skier(v, 0, px, py, skiA, lean, { fly, sq, mood });
    // words
    if (t > 0.15 && t < 0.75) v.label('GO!', 78, 26, 16, '#fff');
    if (t > 1.45 && t < 1.95) v.label('JUMP!', E.x + 4, 58, 15, v.c.gold);
    if (t > 2.0 && t < 3.2) v.label('WHOOSH!', 172, 34, 16, '#bfe8ff');
    if (t > tLand) {
      const pop = v.ease.back(v.seg(t, tLand, tLand + 0.25));
      v.pill('128 m', 222, 92, { size: 11 * pop + 0.01, bg: v.c.gold, col: v.c.ink });
      v.star(258, hillY(258) - 48, 8 * v.ease.back(v.seg(t, tStop, tStop + 0.25)));
      v.confetti(258, 110, v.seg(t, tStop, 6.4));
    }
  },
});

/* ---------- 12-4 Ice Hockey ---------- */
// a goalie robot like the game's (hockeyDrawBot), feet at (x, y), guarding net id (0 = Pip's, 1 = Bo's)
function pw12Bot(v, id, x, y, happy) {
  const ctx = v.ctx, dir = id ? -1 : 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(0.62, 0.62);
  ctx.fillStyle = 'rgba(28,26,54,0.22)'; ctx.beginPath(); ctx.ellipse(0, 2, 17, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e2475a'; ctx.strokeStyle = '#8a1f38'; ctx.lineWidth = 2; v.circle(dir * 8, 0, 7.5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#dfe6f1'; ctx.strokeStyle = '#8e9bb4'; ctx.lineWidth = 2.5; v.rr(-12, -32, 24, 30, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = id ? v.c.bo : v.c.pip; ctx.fillRect(-11, -12, 22, 5);
  ctx.fillStyle = '#2a3354'; v.rr(-9, -28, 18, 11, 5); ctx.fill();
  ctx.strokeStyle = '#7fe0ff'; ctx.fillStyle = '#7fe0ff'; ctx.lineWidth = 2;
  for (const ex of [-4, 4]) {
    if (happy) { ctx.beginPath(); ctx.moveTo(ex - 2.5, -21); ctx.lineTo(ex, -24); ctx.lineTo(ex + 2.5, -21); ctx.stroke(); } else { v.circle(ex, -22.5, 2); ctx.fill(); }
  }
  v.line(0, -32, 0, -39, '#8e9bb4', 2); v.fillCircle(0, -41, 3, '#ff5f6e');
  ctx.restore();
}
// a skater: the team ring, skates, Pip or Bo, and the stick (blade at (bx, by))
function pw12Skater(v, id, x, y, face, bx, by, o = {}) {
  const ctx = v.ctx;
  ctx.save(); ctx.globalAlpha *= 0.55; ctx.strokeStyle = id ? v.c.bo : v.c.pip; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y + 1, 15, 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  if (o.charge > 0) { ctx.strokeStyle = o.charge >= 1 ? v.c.gold : '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, y + 1, 19, 8, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * o.charge); ctx.stroke(); }
  for (const s of [-1, 1]) v.line(x + s * 5 - 4, y + 1, x + s * 5 + 4, y + 1, '#9aa7bd', 2);
  v.hero(id, x, y - (o.hop || 0), { face, mood: o.mood, sq: o.sq || 0, shadow: false });
  const hx = x + face * 5, hy = y - 11 - (o.hop || 0);
  v.line(hx, hy, bx, by, '#7d5530', 4); v.line(hx, hy, bx, by, '#c9955a', 2.2);
  const a = Math.atan2(by - hy, bx - hx), px = -Math.sin(a), py = Math.cos(a), sd = face;
  v.line(bx - px * 2 * sd, by - py * 2 * sd, bx + px * 5 * sd, by + py * 5 * sd, '#fff', 3.5);
}
// top-down rink: Pip carries the puck, Bo pokes it away, skates back and slaps the winning goal past Pip's robot
definePreview('Ice Hockey', {
  blurb: 'Skate, steal the puck and shoot it past the robot goalie. First to 3 wins!',
  loop: 7, still: 3.62,
  draw(v, t) { pw12Loop(v, t / 7, (k, part) => this.scene(v, k * 7, part)); },
  scene(v, t, part) {
    const ctx = v.ctx, x0 = 12, x1 = 308, y0 = 40, y1 = 172, cx = 160, cy = 106, cr = 28, gl = [36, 284], mouth = 17;
    const goal = t > 3.68, cheer = goal && t < 6.2;
    const rink = ins => v.rr(x0 + ins, y0 + ins, x1 - x0 - ins * 2, y1 - y0 - ins * 2, cr - ins);
    if (part & 1) { // the background: arena, rink, nets
      // the arena: pennants, the crowd, the boards and the ice with its lines
      ctx.fillStyle = '#22325a'; ctx.fillRect(0, 0, v.W, v.H);
      for (let r = 0; r < 2; r++) for (let i = 0; i < 22; i++) {
        const x = 8 + i * 15 + r * 7, hop = cheer ? Math.abs(Math.sin(t * 9 + i * 1.7 + r)) * 3 : 0;
        v.fillCircle(x, 22 + r * 10 - hop, 4, ['#ffd166', '#ff8fc7', '#b28dff', '#8fe3b0', '#fff', '#ff9a6b', '#7fc4ff'][(i * 3 + r) % 7]);
      }
      for (let i = 0; i < 11; i++) { const x = 15 + i * 29; ctx.fillStyle = i % 2 ? v.c.pip : v.c.bo; ctx.beginPath(); ctx.moveTo(x - 6, 0); ctx.lineTo(x + 6, 0); ctx.lineTo(x, 10); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = '#fff'; rink(-4); ctx.fill();
      ctx.fillStyle = '#ffc53d'; rink(-1.5); ctx.fill();
      const ig = ctx.createLinearGradient(0, y0, 0, y1); ig.addColorStop(0, '#eef7ff'); ig.addColorStop(1, '#d6e9f8');
      ctx.fillStyle = ig; rink(0); ctx.fill();
      ctx.fillStyle = '#e2475a'; ctx.fillRect(cx - 1.5, y0, 3, y1 - y0); ctx.fillRect(gl[0] - 0.75, y0 + 4, 1.5, y1 - y0 - 8); ctx.fillRect(gl[1] - 0.75, y0 + 4, 1.5, y1 - y0 - 8);
      ctx.fillStyle = '#4a86e0'; ctx.fillRect(cx - 52, y0, 4, y1 - y0); ctx.fillRect(cx + 48, y0, 4, y1 - y0);
      ctx.strokeStyle = '#4a86e0'; ctx.lineWidth = 2; v.circle(cx, cy, 22); ctx.stroke();
      for (let k = 0; k < 2; k++) {
        const dir = k ? -1 : 1, a0 = -Math.PI / 2;
        ctx.fillStyle = 'rgba(110,170,240,0.35)'; ctx.beginPath(); ctx.moveTo(gl[k], cy); ctx.arc(gl[k], cy, 21, a0, a0 + Math.PI * dir, dir < 0); ctx.closePath(); ctx.fill();
      }
      // the nets (Pip's net shakes when the goal goes in) and the goal lights
      const shake = goal && t < 4.2 ? Math.sin(t * 60) * 1.5 * (1 - v.seg(t, 3.68, 4.2)) : 0;
      for (let k = 0; k < 2; k++) {
        const dir = k ? -1 : 1, back = gl[k] - dir * 9, sx = k ? 0 : shake;
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(Math.min(gl[k], back) + sx, cy - mouth, 9, mouth * 2);
        ctx.strokeStyle = '#e2475a'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(gl[k] + sx, cy - mouth); ctx.lineTo(back + sx, cy - mouth + 2); ctx.lineTo(back + sx, cy + mouth - 2); ctx.lineTo(gl[k] + sx, cy + mouth); ctx.stroke();
        const lit = !k && goal && t < 5 && Math.floor(t * 8) % 2 === 0;
        v.fillCircle(k ? x1 + 1 : x0 - 1, cy, 4, lit ? '#ff3b4e' : '#7a2a3a');
        if (lit) v.fillCircle(x0 - 1, cy, 10, 'rgba(255,80,100,0.35)');
      }
    }
    if (!(part & 2)) return;
    // the story: faceoff, Pip skates off with the puck, Bo pokes it away (1.65), skates back, charges and shoots (3.5)
    const E = v.ease.inOut;
    let pip = { x: 130, y: cy, face: 1, mood: 'grit' }, bo = { x: 190, y: cy, face: -1, mood: 'grit' };
    if (t > 0.5) { const u = E(v.seg(t, 0.5, 1.6)); pip.x = v.lerp(130, 200, u); pip.y = cy + Math.sin(u * Math.PI) * 30 + u * 26; }
    if (t > 0.6) { const u = E(v.seg(t, 0.6, 1.5)); bo.x = v.lerp(190, 234, u); bo.y = v.lerp(cy, 100, u); }
    const steal = 1.65;
    if (t > steal) {
      const u = E(v.seg(t, steal + 0.1, 3.0));
      bo.x = v.lerp(234, 100, u); bo.y = v.lerp(100, 98, u) - Math.sin(u * Math.PI) * 14; bo.face = t > steal + 0.12 ? -1 : 1;
      const w = E(v.seg(t, steal + 0.35, 3.4));
      pip.x = v.lerp(200, 150, w); pip.y = v.lerp(132, 118, w); pip.face = t > steal + 0.3 ? -1 : 1; pip.mood = t < steal + 0.35 ? 'wow' : 'grit';
    }
    const shot = 3.5, ch = v.seg(t, 3.0, 3.45);
    if (goal) { bo.mood = 'joy'; pip.mood = t < 4.4 ? 'wow' : 'happy'; }
    const boHop = goal && t < 6.2 ? v.hop(v.phase(t, 0.45), 9) : 0;
    // the puck: at centre, on Pip's stick, poked loose to Bo, on Bo's stick, then a slapshot into Pip's net
    let px = cx, py = cy + 1;
    if (t > 0.62 && t < steal) { px = pip.x + 17; py = pip.y + 1; }
    if (t >= steal && t < steal + 0.15) { const u = v.seg(t, steal, steal + 0.15); px = v.lerp(217, bo.x - 16, u); py = v.lerp(133, bo.y + 1, u); }
    if (t >= steal + 0.15 && t < shot) { px = bo.x - 16; py = bo.y + 1; }
    if (t >= shot) { const u = v.seg(t, shot, 3.68); px = v.lerp(bo.x - 16, gl[0] - 4, u); py = v.lerp(bo.y + 1, cy + 6, u); }
    // Bo's stick: a poke lunge at the steal, wound up behind while charging the slapshot
    let bbx = bo.x + bo.face * 16, bby = bo.y + 1;
    if (t > steal - 0.12 && t < steal + 0.08) { const l = Math.sin(Math.PI * v.seg(t, steal - 0.12, steal + 0.08)); bbx = bo.x - 8 - l * 9; bby = bo.y + 4 + l * 29; }
    if (ch > 0 && t < shot) { bbx = bo.x + 14 * ch; bby = bo.y - 6 - 18 * ch; }
    // the robots: Pip's slides the wrong way a moment too late
    const botY0 = cy + v.lerp(0, -9, E(v.seg(t, 3.45, 3.75))), botY1 = cy + Math.sin(t * 1.3) * 5;
    pw12Bot(v, 0, gl[0] + 6, botY0 + 8, false);
    pw12Bot(v, 1, gl[1] - 6, botY1 + 8, false);
    // puck (behind whoever is lower on the ice)
    const puck = () => {
      if (t > shot && t < 3.68) for (let q = 1; q < 4; q++) { ctx.save(); ctx.globalAlpha *= 0.3 - q * 0.07; v.fillCircle(px + q * 8, py - q * 0.8, 4, '#9fb3cc'); ctx.restore(); }
      ctx.fillStyle = '#1f2233'; ctx.beginPath(); ctx.ellipse(px, py + 1, 4.5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a4f6e'; ctx.beginPath(); ctx.ellipse(px, py - 0.3, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
    };
    const pipStick = t < steal ? [pip.x + pip.face * 16, pip.y + 1] : [pip.x + pip.face * 15, pip.y + 1];
    const draws = [
      [pip.y, () => pw12Skater(v, 0, pip.x, pip.y, pip.face, pipStick[0], pipStick[1], { mood: pip.mood })],
      [bo.y, () => pw12Skater(v, 1, bo.x, bo.y, bo.face, bbx, bby, { mood: bo.mood, hop: boHop, charge: t < shot ? ch : 0 })],
      [py - 0.5, puck],
    ].sort((a, b) => a[0] - b[0]);
    for (const d of draws) d[1]();
    // the aim dots of the slapshot
    if (ch > 0 && t < shot) for (let q = 1; q <= 4; q++) v.fillCircle(px - q * (8 + 6 * ch), py + q * 1.2, 2, ch >= 1 ? v.c.gold : v.c.bo);
    // scoreboard: first to 3
    ctx.fillStyle = 'rgba(28,26,54,0.85)'; v.rr(cx - 34, 4, 68, 22, 11); ctx.fill();
    v.text('2', cx - 18, 15.5, 15, v.c.pip); v.text(':', cx, 14.5, 14, '#fff');
    const bs = goal ? 3 : 2, pop = goal ? v.ease.back(v.seg(t, 3.68, 3.95)) : 1;
    v.text(String(bs), cx + 18, 15.5, 15 * (goal ? 0.6 + 0.4 * pop : 1), v.c.bo);
    // words
    if (t > 0.1 && t < 0.6) v.label('GO!', cx, 74, 18, '#fff');
    if (t > steal && t < steal + 0.7) v.label('STEAL!', 252, 136, 15, '#bfe8ff');
    if (goal) {
      const g = v.ease.back(v.seg(t, 3.68, 3.95));
      v.label('GOAL!', 92, 150, 22 * g, v.c.gold);
      v.star(bo.x, bo.y - 44, 8 * v.ease.back(v.seg(t, 4.1, 4.4)));
      if (t > 4.3) v.label('BO WINS!', 214, 70, 15, v.c.bo);
      v.confetti(bo.x, bo.y - 30, v.seg(t, 3.75, 6.2), 20);
    }
  },
});
