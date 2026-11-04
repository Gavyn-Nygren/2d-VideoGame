/* Pip & Bo - Level previews for World 14 Dino Valley (see js/previews/preview-core.js for how to write one).
   Every top-level name starts with pw14. The whole file is skipped when the preview engine isn't loaded yet. */
'use strict';

if (typeof definePreview === 'function') {
  // ----- BEGIN 14-1 Egg Rescue preview -----
  /* ---------- 14-1 Egg Rescue ---------- */
  // Bo (the back carrier) and Pip (the front, like room 1) carry Mama Dino's speckled egg on a leaf stretcher: both get
  // ready, hop the log together (once for each of them), then Pip lowers the front end and the egg rolls into Mama's
  // nest, wiggles, cracks and hatches. The scenery repeats exactly every loop; the moving bits crossfade at the end.
  const PW14E = { loop: 7, gy: 150, gap: 58, nest: 254, log: 140 };
  // where the pair is at time t: the back carrier's x (the front is gap px ahead), the hop lift, crouch/tilt and moods
  function pw14ePose(v, t) {
    const S = v.seg, E = v.ease.inOut, P = { bx: 18, lift: 0, crouch: 0, ready: 0, land: 0, walk: 0, tilt: 0, hopN: 0, hopK: 0 };
    const walk = (a, b, x0, x1) => { P.bx = v.lerp(x0, x1, S(t, a, b)); P.walk = t > a && t < b ? 1 : 0; };
    const ready = (a, x) => { P.bx = x; P.ready = 1; P.crouch = v.ease.out(S(t, a, a + 0.14)); };
    const hop = (a, x0, n) => { const k = S(t, a, a + 0.5); P.bx = v.lerp(x0, x0 + 40, E(k)); P.lift = v.hop(k, 22); P.hopN = n; P.hopK = k; };
    if (t < 1.05) walk(0.35, 1.05, 18, 58);
    else if (t < 1.35) ready(1.05, 58);
    else if (t < 1.85) hop(1.35, 58, 1);
    else if (t < 2.0) { P.bx = 98; P.land = 1 - S(t, 1.85, 2.0); }
    else if (t < 2.2) walk(2.0, 2.2, 98, 116);
    else if (t < 2.45) ready(2.2, 116);
    else if (t < 2.95) hop(2.45, 116, 2);
    else if (t < 3.1) { P.bx = 156; P.land = 1 - S(t, 2.95, 3.1); }
    else walk(3.1, 3.35, 156, 162);
    // at the nest: Pip lowers the front end, Bo lifts the back, then they level it again
    P.tilt = E(S(t, 3.35, 3.6)) * (1 - E(S(t, 4.0, 4.4)));
    P.fx = P.bx + PW14E.gap;
    return P;
  }
  // the leaf between the two hands, sagging a little in the middle (like the level's); returns a point finder
  function pw14eLeaf(v, bx, by, fx, fy) {
    const ctx = v.ctx, ex = 6, sag = 3, ux = ex / Math.max(1, fx - bx);
    const pt = u => [v.lerp(bx, fx, u), v.lerp(by, fy, u) + sag * (1 - (2 * u - 1) * (2 * u - 1))];
    ctx.fillStyle = '#5fbf4a'; ctx.strokeStyle = '#2f7d32'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) { const [x, y] = pt(-ux + (1 + 2 * ux) * i / 20); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    for (let i = 20; i >= 0; i--) { const [x, y] = pt(-ux + (1 + 2 * ux) * i / 20); ctx.lineTo(x, y + 5 * Math.sin(Math.PI * i / 20)); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(47,125,50,0.7)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i <= 10; i++) { const [x, y] = pt(-ux + (1 + 2 * ux) * i / 10); if (i) ctx.lineTo(x, y + 2.2); else ctx.moveTo(x, y + 2.2); }
    for (let i = 1; i < 6; i++) { const [x, y] = pt(i / 6); ctx.moveTo(x, y + 2.2); ctx.lineTo(x + 3.5, y + 4.4); }
    ctx.stroke();
    return pt;
  }
  // Mama's egg: cream with green and teal speckles; (x, y) is its bottom; cracks 0..4
  function pw14eEgg(v, x, y, rot = 0, cracks = 0, sq = 0) {
    const ctx = v.ctx, R = 17, Hh = 21, P2 = Math.PI * 2;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(0.6 * (1 + sq * 0.2), 0.6 * (1 - sq * 0.2)); ctx.translate(0, -Hh);
    ctx.fillStyle = '#fff3dc'; ctx.strokeStyle = '#c9a878'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.ellipse(0, 0, R, Hh, 0, 0, P2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(230,200,150,0.45)'; ctx.beginPath(); ctx.ellipse(4, 6, R * 0.8, Hh * 0.75, 0, 0, P2); ctx.fill();
    for (const [dx, dy, r, col] of [[-7, -10, 3.4, '#7cc9b5'], [6, -4, 2.6, '#9fd36b'], [-2, 7, 3, '#7cc9b5'], [9, 9, 2.2, '#9fd36b'], [-10, 3, 2, '#9fd36b'], [3, -15, 1.8, '#7cc9b5']]) v.fillCircle(dx, dy, r, col);
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.ellipse(-6, -9, 3.5, 7, 0.3, 0, P2); ctx.fill();
    ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 2.2;
    const crack = pts => { ctx.beginPath(); pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.stroke(); };
    if (cracks >= 1) crack([[-4, -18], [-1, -12], [-5, -8], [-1, -4]]);
    if (cracks >= 2) crack([[8, -14], [5, -9], [10, -5], [7, 0]]);
    if (cracks >= 3) crack([[-14, -2], [-9, 0], [-12, 5], [-6, 8]]);
    if (cracks >= 4) { crack([[2, 4], [6, 8], [3, 12], [8, 16]]); v.fillCircle(-1, -6, 1.8, v.c.ink); v.fillCircle(5, -6, 1.8, v.c.ink); }
    ctx.restore();
  }
  // the baby dino (the level's eggBaby): big eyes, a smile, waving arms and half an eggshell for a hat
  function pw14eBaby(v, x, y, u, t) {
    const ctx = v.ctx, P2 = Math.PI * 2, ink = v.c.ink, s = 0.45 * (0.4 + 0.6 * u);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#8fdc7a';
    ctx.beginPath(); ctx.ellipse(0, 6, 20, 18, 0, 0, P2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10, -14, 17, 15, 0.2, 0, P2); ctx.fill();
    ctx.fillStyle = '#c5f0b2'; ctx.beginPath(); ctx.ellipse(2, 12, 11, 10, 0, 0, P2); ctx.fill();
    v.fillCircle(6, -16, 6, '#fff'); v.fillCircle(18, -16, 5, '#fff');
    v.fillCircle(7, -15, 3, ink); v.fillCircle(19, -15, 2.6, ink); v.fillCircle(8, -17, 1.2, '#fff');
    ctx.strokeStyle = ink; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(14, -8, 5, 0.2, Math.PI - 0.2); ctx.stroke();
    v.fillCircle(2, -8, 3, 'rgba(255,120,140,0.5)');
    const w = Math.sin(t * 10) * 0.5;
    ctx.strokeStyle = '#6cc060'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-10, 2); ctx.lineTo(-20, -6 + w * 8); ctx.moveTo(14, 4); ctx.lineTo(24, -4 - w * 8); ctx.stroke();
    ctx.fillStyle = '#fff3dc'; ctx.beginPath(); ctx.moveTo(-6, -24); ctx.lineTo(0, -32); ctx.lineTo(5, -26); ctx.lineTo(10, -34); ctx.lineTo(15, -26);
    ctx.lineTo(21, -33); ctx.lineTo(26, -22); ctx.quadraticCurveTo(10, -40, -6, -24); ctx.fill();
    v.fillCircle(8, -30, 2, '#7cc9b5'); v.fillCircle(18, -28, 1.6, '#7cc9b5');
    ctx.restore();
  }
  // Mama Dino (the level's eggDrawMama, small): a round friendly long-neck with a pink bow, leaning down to the nest
  function pw14eMama(v, nx, ny, lean, t) {
    const ctx = v.ctx, P2 = Math.PI * 2, ink = v.c.ink, w = Math.sin(t * Math.PI * 2 / 3.5);
    ctx.save(); ctx.translate(nx + 50, ny - 20); ctx.scale(0.4, 0.4);
    ctx.fillStyle = '#7fc66a';
    ctx.beginPath(); ctx.moveTo(60, -10); ctx.quadraticCurveTo(140, 10 + w * 6, 170, 40); ctx.quadraticCurveTo(120, 30, 60, 30); ctx.fill();
    ctx.beginPath(); ctx.ellipse(20, 0, 74, 48, 0, 0, P2); ctx.fill();
    for (const lx of [-26, 4, 36, 60]) ctx.fillRect(lx - 10, 30, 20, 22);
    ctx.fillStyle = '#a5dc8a'; ctx.beginPath(); ctx.ellipse(10, 16, 46, 22, 0, 0, P2); ctx.fill();
    for (const [sx, sy, r] of [[20, -30, 8], [46, -16, 6], [-6, -36, 6], [60, -34, 5]]) v.fillCircle(sx, sy, r, '#5fae55');
    const hx = v.lerp(-40, -100, lean), hy = v.lerp(-150, -78, lean) + w * 4;
    ctx.strokeStyle = '#7fc66a'; ctx.lineWidth = 26; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-30, -20); ctx.quadraticCurveTo(-50, -110, hx + 10, hy + 8); ctx.stroke();
    ctx.fillStyle = '#7fc66a'; ctx.beginPath(); ctx.ellipse(hx, hy, 30, 22, -0.2 - lean * 0.3, 0, P2); ctx.fill();
    const blink = v.phase(t, 3.5) > 0.93;
    if (blink) v.line(hx - 15, hy - 5, hx - 3, hy - 5, ink, 3);
    else { v.fillCircle(hx - 8, hy - 6, 7, '#fff'); v.fillCircle(hx - 10, hy - 5, 3.6, ink); }
    ctx.strokeStyle = ink; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(hx - 12 + k * 4, hy - 13); ctx.lineTo(hx - 14 + k * 5, hy - 18); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(hx - 16, hy + 6, 7, 0.3, 1.8); ctx.stroke();
    v.fillCircle(hx - 2, hy + 6, 5, 'rgba(255,120,140,0.55)');
    ctx.fillStyle = '#ff8fc7'; ctx.beginPath(); ctx.moveTo(hx + 6, hy - 20); ctx.lineTo(hx - 6, hy - 30); ctx.lineTo(hx - 4, hy - 14); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 6, hy - 20); ctx.lineTo(hx + 20, hy - 28); ctx.lineTo(hx + 16, hy - 12); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // the nest's back (strands of twigs) and its front rim
  function pw14eNest(v, x, y, front) {
    const ctx = v.ctx, w = 26, h = 7;
    if (front) { ctx.fillStyle = '#b07a44'; ctx.beginPath(); ctx.ellipse(x, y + 1, w, 5, 0, 0, Math.PI); ctx.fill(); ctx.strokeStyle = '#7d5028'; ctx.lineWidth = 1; ctx.stroke(); return; }
    ctx.fillStyle = '#c08a50'; ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7d5028'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const sx = x - w + 4 + i * (2 * w - 8) / 8; ctx.moveTo(sx, y - h * 0.6); ctx.lineTo(sx + 5, y + h * 0.6); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(x, y - h * 0.3, w * 0.7, h * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  }
  // the background: a morning sky (Fern Path's), a sleepy puffing volcano, a long-neck munching on the far hills,
  // a far pterodactyl crossing once a loop, a palm, flowers, the log and Mama Dino (part of the scenery: her lean is the
  // same at both ends of the loop)
  function pw14eBack(v, t) {
    const ctx = v.ctx, gy = PW14E.gy, TAU = Math.PI * 2, L = PW14E.loop;
    const g = ctx.createLinearGradient(0, 0, 0, v.H);
    g.addColorStop(0, '#8fd3f0'); g.addColorStop(0.55, '#d8f2e6'); g.addColorStop(1, '#fff1c9');
    ctx.fillStyle = g; ctx.fillRect(0, 0, v.W, v.H);
    v.fillCircle(198, 30, 24, 'rgba(255,240,180,0.45)'); v.fillCircle(198, 30, 14, '#fff1a8');
    const bob = Math.sin(t * TAU / L);
    v.cloud(118 + bob * 6, 26, 0.8); v.cloud(232 - bob * 5, 50, 0.6);
    // the volcano, puffing little white clouds
    const vx = 66, vy = 118;
    ctx.fillStyle = '#b08a7a'; ctx.beginPath(); ctx.moveTo(vx - 62, vy + 10); ctx.lineTo(vx - 13, vy - 44); ctx.lineTo(vx + 13, vy - 44); ctx.lineTo(vx + 62, vy + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9c7568'; ctx.beginPath(); ctx.moveTo(vx - 13, vy - 44); ctx.lineTo(vx + 13, vy - 44); ctx.lineTo(vx + 7, vy - 38); ctx.lineTo(vx - 6, vy - 40); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 3; i++) { const u = v.phase(t, L / 2, i / 3); v.fillCircle(vx + Math.sin(u * 5 + i) * 5 + u * 12, vy - 48 - u * 40, 4 + u * 8, 'rgba(255,255,255,' + (0.6 * (1 - u)).toFixed(3) + ')'); }
    // the far pterodactyl (off screen at the loop's seam)
    { const u = v.phase(t, L), px = -20 + u * 360, py = 62 + Math.sin(u * TAU * 2) * 6, f = Math.sin(t * TAU / 0.35) * 3;
      ctx.strokeStyle = 'rgba(90,70,90,0.5)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px - 8, py - f); ctx.quadraticCurveTo(px - 3, py - 4, px, py); ctx.quadraticCurveTo(px + 3, py - 4, px + 8, py - f); ctx.stroke(); }
    // far hills with a long-neck dino
    const yAt = x => 116 + Math.sin(x * 0.02 + 1) * 6 + Math.sin(x * 0.05) * 2;
    ctx.fillStyle = '#a9cf8a'; ctx.beginPath(); ctx.moveTo(0, v.H);
    for (let x = 0; x <= v.W; x += 8) ctx.lineTo(x, yAt(x));
    ctx.lineTo(v.W, v.H); ctx.closePath(); ctx.fill();
    { const bx = 168, by = yAt(168) + 3, nod = Math.sin(t * TAU / 1.75) * 4;
      ctx.save(); ctx.translate(bx, by); ctx.scale(0.24, 0.24); ctx.fillStyle = 'rgba(70,110,80,0.35)';
      ctx.beginPath(); ctx.ellipse(0, -34, 50, 26, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-40, -40); ctx.quadraticCurveTo(-90, -30, -118, -8); ctx.quadraticCurveTo(-86, -20, -40, -22); ctx.fill();
      ctx.beginPath(); ctx.moveTo(26, -50); ctx.quadraticCurveTo(52, -96, 58, -132 + nod); ctx.lineTo(72, -130 + nod); ctx.quadraticCurveTo(66, -90, 46, -30); ctx.fill();
      ctx.beginPath(); ctx.ellipse(70, -136 + nod, 15, 9, 0.2, 0, TAU); ctx.fill();
      for (const lx of [-30, -10, 16, 34]) ctx.fillRect(lx - 6, -18, 12, 18);
      ctx.restore(); }
    // nearer jungle hills
    ctx.fillStyle = '#6fae5a'; ctx.beginPath(); ctx.moveTo(0, v.H);
    for (let x = 0; x <= v.W; x += 8) ctx.lineTo(x, 132 + Math.sin(x * 0.03 + 4) * 5);
    ctx.lineTo(v.W, v.H); ctx.closePath(); ctx.fill();
    // a palm by the start
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(10, gy); ctx.quadraticCurveTo(2, gy - 36, 8, gy - 70); ctx.stroke();
    for (let j = 0; j < 6; j++) { const a = -Math.PI / 2 + (j - 2.5) * 0.55 + Math.sin(t * TAU / L * 2 + j) * 0.04; ctx.fillStyle = j % 2 ? '#4f9a3a' : '#5aa844'; ctx.beginPath(); ctx.ellipse(8 + Math.cos(a) * 17, gy - 70 + Math.sin(a) * 7 + 5, 20, 5, a, 0, TAU); ctx.fill(); }
    v.fillCircle(4, gy - 65, 3, '#7d5530'); v.fillCircle(10, gy - 64, 3, '#7d5530');
    // Mama behind her nest (she leans down once the egg is home, and back up before the loop ends)
    const lean = v.ease.inOut(v.seg(t, 4.4, 4.9)) * (1 - v.ease.inOut(v.seg(t, 6.0, 6.6)));
    pw14eMama(v, PW14E.nest, gy, lean, t);
    v.ground(gy);
    // flowers and mushrooms along the path
    for (const [fx, col] of [[40, '#ff8fc7'], [96, '#ffd75e'], [196, '#ffffff'], [214, '#ff8fc7']]) {
      v.line(fx, gy + 12, fx, gy + 7, '#4f9a3a', 1.5);
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5; v.fillCircle(fx + Math.cos(a) * 2.4, gy + 7 + Math.sin(a) * 2.4, 1.8, col); }
      v.fillCircle(fx, gy + 7, 1.4, '#ffb02e');
    }
    // the log (a mushroom on top)
    const lx0 = PW14E.log - 10, lh = 12;
    ctx.fillStyle = '#8a5a34'; v.rr(lx0 - 2, gy - lh, 24, lh, lh / 2); ctx.fill();
    ctx.strokeStyle = '#5e3a1e'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#d9a86a'; ctx.beginPath(); ctx.ellipse(lx0 + 2, gy - lh / 2, 3.4, lh / 2 - 1, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6fbf4a'; ctx.beginPath(); ctx.ellipse(lx0 + 13, gy - lh + 1, 6, 2, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#fff1dc'; ctx.fillRect(lx0 + 16, gy - lh - 5, 3, 5);
    ctx.fillStyle = '#ff7a6b'; ctx.beginPath(); ctx.ellipse(lx0 + 17.5, gy - lh - 5, 5.5, 3.5, 0, Math.PI, 0); ctx.fill();
    pw14eNest(v, PW14E.nest, gy - 4, false);
  }
  // the moving part: the carriers, the leaf, the egg (on the leaf, rolling into the nest, hatching) and the words
  function pw14eFore(v, t) {
    const ctx = v.ctx, gy = PW14E.gy, S = v.seg, P = pw14ePose(v, t), nx = PW14E.nest;
    const feetY = gy + P.lift, crouch = Math.max(P.crouch * P.ready, P.land * 0.8);
    const step = P.walk ? v.hop(v.phase(t, 0.36), 2) : 0;
    const hatchT = 5.3, hatched = t >= hatchT, joy = t > hatchT + 0.05;
    // the hands: hip height, a little lower when crouched; the tilt lowers the front end and lifts the back
    const by = feetY - 16 + crouch * 3 + step - P.tilt * 6, fy = feetY - 16 + crouch * 3 + step + P.tilt * 7;
    const hbx = P.bx + 9, hfx = P.fx - 9;
    // the gold "ready" rings under their feet
    if (P.ready) for (const x of [P.bx, P.fx]) { ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 20); ctx.strokeStyle = v.c.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, gy + 1, 12, 3.5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
    // the bodies (Bo at the back, Pip at the front), with their own little celebration hops after the hatch
    const party = id => { const a = hatchT + 0.08 + id * 0.12, k = S(t, a, a + 0.84); return k > 0 && k < 1 ? v.hop((k * 2) % 1, 8) : 0; };
    for (const id of [1, 0]) {
      const front = id === 0, x = front ? P.fx : P.bx;
      const sq = crouch * 0.3 + (front ? P.tilt * 0.3 : -P.tilt * 0.12) + (P.lift < -2 ? -0.12 : 0);
      const mood = joy ? (t < hatchT + 0.4 ? 'wow' : 'joy') : P.ready ? 'grit' : P.lift < -2 ? 'joy' : t > 0.12 && t < 0.24 ? 'blink' : 'happy';
      if (P.lift < 0) v.shadow(x, gy, 18 + P.lift * 0.3);
      v.hero(id, x, feetY + step - party(id), { face: 1, sq, mood, shadow: P.lift >= 0 });
    }
    // the leaf and the egg on it
    const pt = pw14eLeaf(v, hbx, by, hfx, fy), span = hfx - hbx;
    const ROLL0 = 3.5, ROLL1 = 3.75, FLY1 = 4.25;
    if (t < FLY1) {
      // on the leaf it sways a little as they walk, bumps up when they land, then rolls to the front end
      const sway = Math.sin(t * Math.PI * 2 / 0.72) * 2.2 * S(t, 0.2, 0.5) * (1 - S(t, 3.1, 3.4));
      const s = t < ROLL0 ? sway : v.lerp(0, 14, v.ease.in(S(t, ROLL0, ROLL1)));
      const bump = v.hop(S(t, 1.85, 2.12), 5) + v.hop(S(t, 2.95, 3.22), 5);
      const wob = (Math.sin(t * 34) * 0.14) * (S(t, 1.85, 1.9) * (1 - S(t, 1.9, 2.25)) + S(t, 2.95, 3.0) * (1 - S(t, 3.0, 3.35)));
      const [ex, ey] = pt(0.5 + s / span), rot0 = s / 9 + wob;
      if (t < ROLL1) pw14eEgg(v, ex, ey + 0.5 + bump, rot0, 0);
      else {
        // ... and plops off it in a little arc into the nest
        const [x0, y0] = pt(0.5 + 14 / span), u = S(t, ROLL1, FLY1);
        const x = v.lerp(x0, nx, v.ease.out(u)), y = v.lerp(y0 + 0.5, gy - 5, u) + v.hop(u, 26);
        pw14eEgg(v, x, y, v.lerp(14 / 9, Math.PI * 2, u), 0);
      }
    } else if (!hatched) {
      const land = S(t, FLY1, FLY1 + 0.25), sqz = v.hop(land, 0.6) * -1;
      const wig = Math.sin(t * 32) * 0.16 * S(t, 4.6, 4.75), cracks = Math.min(4, Math.floor(S(t, 4.6, 5.25) * 4) + (t > 4.6 ? 1 : 0));
      pw14eEgg(v, nx, gy - 5, wig, cracks, sqz);
    } else {
      const u = v.ease.back(S(t, hatchT, hatchT + 0.3)), hop = v.hop(S(t, hatchT + 0.3, hatchT + 0.7), 6) + v.hop(S(t, hatchT + 0.7, hatchT + 1.1), 4);
      pw14eBaby(v, nx - 4, gy - 16 + hop, u, t);
      // bits of shell flying out
      const k = S(t, hatchT, hatchT + 0.7);
      if (k > 0 && k < 1) {
        ctx.save(); ctx.globalAlpha = 1 - k; ctx.fillStyle = '#fff3dc'; ctx.strokeStyle = '#c9a878'; ctx.lineWidth = 0.8;
        for (let q = 0; q < 7; q++) {
          const a = -Math.PI * (0.1 + 0.8 * q / 6), sp = 30 + v.rand(q + 3) * 16;
          const px = nx + Math.cos(a) * sp * k, py = gy - 18 + Math.sin(a) * sp * k + 50 * k * k;
          ctx.save(); ctx.translate(px, py); ctx.rotate(k * 8 + q); ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(0, -3.5); ctx.lineTo(3, 1.4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
        }
        ctx.restore();
      }
    }
    // the arms and hands gripping the ends of the leaf
    for (const id of [1, 0]) {
      const front = id === 0, x = front ? P.fx : P.bx, sx = x + (front ? -5 : 5), sy = feetY + step - 12 + crouch * 2 - party(id);
      const hx = front ? hfx : hbx, hy = front ? fy : by;
      const col = id ? v.c.bo : v.c.pip, dark = id ? v.c.boDark : v.c.pipDark;
      v.line(sx, sy, hx, hy + 1, dark, 3);
      v.fillCircle(hx, hy + 1, 3.2, col); ctx.strokeStyle = dark; ctx.lineWidth = 1.2; v.circle(hx, hy + 1, 3.2); ctx.stroke();
    }
    // words
    if (P.hopN) {
      const pop = v.ease.back(S(P.hopK, 0, 0.3)) * (1 - S(P.hopK, 0.85, 1));
      if (pop > 0.05) v.label(P.hopN === 1 ? 'Together!' : 'Hop!', P.bx + PW14E.gap / 2, 66, 15 * pop, v.c.gold);
    }
    if (t > 3.4 && t < 4.3) v.bubble('In you go!', P.fx + 2, gy - 30, { size: 9 });
    if (t > 4.7 && t < hatchT) v.label('Crack...', nx - 50, 104, 12, '#fff3c4');
    if (hatched) {
      const pop = v.ease.back(S(t, hatchT, hatchT + 0.25)) * (1 - S(t, 6.3, 6.5));
      if (pop > 0.05) v.label('POP! Hello, baby!', 160, 40, 17 * pop, v.c.gold);
      for (let q = 0; q < 4; q++) { const k = S(t, hatchT + 0.15 + q * 0.2, hatchT + 1.1 + q * 0.2); if (k > 0 && k < 1) { ctx.save(); ctx.globalAlpha = 1 - k; v.heart(nx - 22 + q * 15 + Math.sin(k * 6 + q) * 3, gy - 34 - k * 34, 4.5); ctx.restore(); } }
      v.confetti(nx - 4, gy - 30, S(t, hatchT, hatchT + 1.1));
    }
  }
  definePreview('Egg Rescue', {
    blurb: "Carry Mama Dino's wobbly egg home on a leaf: walk together, hop together!",
    loop: PW14E.loop, still: 1.6,
    draw(v, t) {
      const from = 6.4, ctx = v.ctx;
      pw14eBack(v, t);
      if (t <= from) pw14eFore(v, t);
      else { // crossfade the moving part into the opening frame's, so the loop has no seam
        const a = v.ease.inOut(v.seg(t, from, PW14E.loop));
        ctx.save(); ctx.globalAlpha *= 1 - a; pw14eFore(v, t); ctx.restore();
        ctx.save(); ctx.globalAlpha *= a; pw14eFore(v, 0); ctx.restore();
      }
      pw14eNest(v, PW14E.nest, PW14E.gy - 4, true);
    },
  });
  // ----- END 14-1 Egg Rescue preview -----
  //
  // ----- BEGIN 14-2 Pterodactyl Express preview -----
  // ----- END 14-2 Pterodactyl Express preview -----
  //
  // ----- BEGIN 14-3 Tar Pit Pull preview -----
  // ----- END 14-3 Tar Pit Pull preview -----
  //
  // ----- BEGIN 14-4 Raptor Race preview -----
  // ----- END 14-4 Raptor Race preview -----
}
