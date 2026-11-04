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
  // Petra flies right over Dino Valley (the valley scrolls by), flapping on the beat with Pip on her back: each flap at the
  // gold TOP of the little wing meter is a PERFECT one. Bo hangs from her feet, swings out to grab a mango off a palm and
  // drops it into a nest (Nom!), then grabs a rock off a rock pillar and drops it on the stone switch, and the log gate
  // lifts just in time for Petra to fly through. Everything that changes is worked out from how far along the valley
  // Petra is, and the valley repeats every loop, so the loop has no seam.
  const PW14P = {
    loop: 6, L: 540, beats: 5, PX: 118, PY: 50, GY: 156, s: 0.5, arm: 9, feet: 24,
    // where Bo is along the valley (px) when things happen: grab the mango, drop it, grab a rock, drop it
    gF: 40, dF: 150, gR: 270, dR: 378, fallF: 0.3, fallR: 0.42,
  };
  const pw14pSmooth = u => u * u * (3 - 2 * u);
  const pw14pRock = (v, x, y, r) => {
    const ctx = v.ctx;
    ctx.fillStyle = '#a8a29a'; ctx.beginPath(); ctx.ellipse(x, y, r * 1.15, r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.35, r * 0.4, r * 0.28, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(60,50,40,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, r * 1.15, r, 0, 0, Math.PI * 2); ctx.stroke();
  };
  const pw14pMango = (v, x, y, r = 4.2) => {
    const ctx = v.ctx;
    ctx.fillStyle = '#ffb43d'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.15, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(224,123,31,0.55)'; ctx.beginPath(); ctx.ellipse(x + r * 0.3, y + r * 0.35, r * 0.55, r * 0.6, 0.3, 0, Math.PI * 2); ctx.fill();
    v.fillCircle(x - r * 0.35, y - r * 0.4, r * 0.3, 'rgba(255,255,255,0.55)');
    ctx.fillStyle = '#5fae3e'; ctx.beginPath(); ctx.ellipse(x + r * 0.5, y - r * 1.1, r * 0.55, r * 0.25, -0.5, 0, Math.PI * 2); ctx.fill();
  };
  const pw14pEye = (v, x, y, r, shut) => {
    const ctx = v.ctx;
    if (shut) { ctx.strokeStyle = v.c.ink; ctx.lineWidth = Math.max(1, r * 0.4); ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0.2, Math.PI - 0.2); ctx.stroke(); return; }
    v.fillCircle(x, y, r, '#fff'); v.fillCircle(x + r * 0.25, y + r * 0.1, r * 0.55, v.c.ink); v.fillCircle(x + r * 0.45, y - r * 0.25, r * 0.2, '#fff');
  };
  // a wing seen from the side: a leathery sail from the shoulder, its tip up (up = 1) or down (up = -1) (Petra's units)
  const pw14pWing = (ctx, sx, sy, up, s, col, light) => {
    const tipX = sx - 26 * s, tipY = sy - 84 * up * s, rearX = sx - 40 * s;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(sx + 14 * s, sy);
    ctx.quadraticCurveTo(sx + 6 * s, sy - 48 * up * s, tipX, tipY); ctx.quadraticCurveTo(sx - 26 * s, sy - 30 * up * s, rearX, sy + 4 * s);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = light; ctx.globalAlpha *= 0.6; ctx.beginPath(); ctx.moveTo(sx + 8 * s, sy);
    ctx.quadraticCurveTo(sx + 2 * s, sy - 36 * up * s, tipX + 4 * s, tipY + 10 * up * s); ctx.quadraticCurveTo(sx - 14 * s, sy - 20 * up * s, sx - 20 * s, sy + 2 * s);
    ctx.closePath(); ctx.fill(); ctx.globalAlpha /= 0.6;
    ctx.fillStyle = '#ffe6b0'; ctx.beginPath(); ctx.arc(sx + 14 * s + (tipX - sx - 14 * s) * 0.72, sy + (tipY - sy) * 0.72, 3 * s, 0, Math.PI * 2); ctx.fill();
  };
  // Petra (drawn like the level's), body centre at (x, y); up: the wing pose; tilt: nose up (negative) or down
  const pw14pPetra = (v, x, y, up, tilt, blink) => {
    const ctx = v.ctx, s = PW14P.s;
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(s, s);
    pw14pWing(ctx, -12, -8, up * 0.92, 0.85, '#2f8f86', '#57b8ab');
    ctx.fillStyle = '#3fb7a8'; ctx.beginPath(); ctx.moveTo(-34, -4); ctx.quadraticCurveTo(-60, 0, -74, 6); ctx.quadraticCurveTo(-58, 6, -34, 6); ctx.fill();
    ctx.fillStyle = '#ff7b54'; ctx.beginPath(); ctx.moveTo(-74, 6); ctx.lineTo(-84, -2); ctx.lineTo(-90, 8); ctx.lineTo(-82, 14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e8873c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-2, 10); ctx.lineTo(1, 24); ctx.moveTo(8, 10); ctx.lineTo(9, 24); ctx.stroke();
    ctx.fillStyle = '#3fb7a8'; ctx.beginPath(); ctx.ellipse(0, 0, 40, 19, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe6b0'; ctx.beginPath(); ctx.ellipse(6, 7, 28, 10, 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.ellipse(-8, -9, 18, 5, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7ccf4f'; ctx.beginPath(); ctx.ellipse(-8, -16, 16, 6, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#3f8f3a'; ctx.fillRect(-24, -17, 32, 3);
    ctx.fillStyle = '#3fb7a8'; ctx.beginPath(); ctx.moveTo(26, -10); ctx.quadraticCurveTo(40, -24, 44, -30); ctx.lineTo(54, -22); ctx.quadraticCurveTo(44, -8, 34, 4); ctx.fill();
    ctx.save(); ctx.translate(50, -30);
    ctx.fillStyle = '#ff7b54'; ctx.beginPath(); ctx.moveTo(-4, -8); ctx.quadraticCurveTo(-26, -24, -42, -20); ctx.quadraticCurveTo(-22, -10, -6, 2); ctx.fill();
    ctx.fillStyle = '#3fb7a8'; ctx.beginPath(); ctx.ellipse(0, -2, 15, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffc05a'; ctx.beginPath(); ctx.moveTo(8, -6); ctx.quadraticCurveTo(30, -4, 40, 2); ctx.quadraticCurveTo(26, 6, 8, 6); ctx.fill();
    ctx.strokeStyle = '#c98a2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(10, 2); ctx.quadraticCurveTo(24, 4, 36, 2); ctx.stroke();
    pw14pEye(v, 2, -5, 5, blink);
    v.fillCircle(-4, 4, 3.5, 'rgba(255,130,150,0.55)');
    ctx.restore();
    pw14pWing(ctx, -4, -6, up, 1, '#36a89a', '#6fd0c2');
    ctx.restore();
  };
  // a baby dino in its eggshell hat: hungry (mouth wide open, bobbing) or fed (happy eyes, a little sway)
  const pw14pBaby = (v, x, y, col, hungry, t) => {
    const ctx = v.ctx, bob = hungry ? Math.abs(Math.sin(t * Math.PI * 4)) * 2.5 : Math.sin(t * Math.PI * 2) * 0.8;
    ctx.save(); ctx.translate(x, y - bob); ctx.scale(0.62, 0.62);
    ctx.fillStyle = col; v.circle(0, 0, 10); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, 9, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff8e8'; ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-5, -12); ctx.lineTo(-2, -8); ctx.lineTo(1, -13); ctx.lineTo(4, -8); ctx.lineTo(7, -12); ctx.lineTo(8, -5); ctx.quadraticCurveTo(0, -9, -8, -6); ctx.fill();
    if (hungry) {
      pw14pEye(v, -4, -2, 3, false); pw14pEye(v, 4, -2, 3, false);
      const open = 3 + Math.abs(Math.sin(t * Math.PI * 4)) * 4;
      ctx.fillStyle = '#c2392b'; ctx.beginPath(); ctx.ellipse(0, 5, 5, open, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff8a8a'; ctx.beginPath(); ctx.ellipse(0, 5 + open * 0.4, 3, open * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.8;
      for (const ex of [-4, 4]) { ctx.beginPath(); ctx.arc(ex, -1, 2.4, Math.PI + 0.3, -0.3); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, 3, 3.5, 0.2, Math.PI - 0.2); ctx.stroke();
      v.fillCircle(-7, 3, 2.2, 'rgba(255,120,150,0.5)'); v.fillCircle(7, 3, 2.2, 'rgba(255,120,150,0.5)');
    }
    ctx.restore();
  };
  // a far-off friendly brontosaurus (the level's, small), feet at (x, gy)
  const pw14pBronto = (v, x, gy, s, t) => {
    const ctx = v.ctx;
    ctx.save(); ctx.translate(x, gy); ctx.scale(s, s);
    ctx.fillStyle = '#5c9580'; for (const lx of [-44, -18, 22, 46]) ctx.fillRect(lx - 8, -46, 16, 46);
    ctx.fillStyle = '#7fb9a0'; ctx.beginPath(); ctx.ellipse(0, -62, 70, 34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-60, -70); ctx.quadraticCurveTo(-120, -60, -150, -30); ctx.quadraticCurveTo(-110, -50, -60, -48); ctx.fill();
    ctx.save(); ctx.translate(46, -78); ctx.rotate(Math.sin(t * Math.PI * 2) * 0.08);
    ctx.beginPath(); ctx.moveTo(-14, 10); ctx.quadraticCurveTo(30, -40, 40, -120); ctx.lineTo(62, -118); ctx.quadraticCurveTo(48, -40, 20, 16); ctx.fill();
    ctx.beginPath(); ctx.ellipse(58, -124, 22, 13, 0.1, 0, Math.PI * 2); ctx.fill();
    pw14pEye(v, 60, -128, 5, false);
    ctx.strokeStyle = '#3c6e5c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(68, -120, 6, 0.2, Math.PI - 0.6); ctx.stroke();
    v.fillCircle(52, -118, 5, 'rgba(255,140,150,0.5)');
    ctx.restore();
    ctx.fillStyle = '#a9d8c2'; for (const [sx, sy] of [[-20, -80], [6, -88], [30, -78]]) { v.circle(sx, sy, 6); ctx.fill(); }
    ctx.restore();
  };
  // the scene at time t: Petra's beat, her bob and Bo's swing (everything but the scenery)
  const pw14pPose = t => {
    const P = PW14P, B = P.loop / P.beats, p = (((t / B) % 1) + 1) % 1, e = 1 - (1 - p) * (1 - p);
    // the wing meter: snapped down by the flap (p 0..0.1), rises to the TOP (0.1..0.78), waits there gold until the next flap
    const wing = p < 0.1 ? 0 : Math.min(1, (p - 0.1) / 0.68);
    const up = p < 0.1 ? 1.1 - 2 * (p / 0.1) : -0.9 + 2 * pw14pSmooth(wing);
    const py = P.PY + 3 - 6 * Math.sin(Math.PI * e), tilt = -0.07 * Math.sin(Math.PI * e) + 0.03;
    // Bo's swing: a lazy sway, swinging well forward to grab and a little to toss
    const near = (at, w) => { const d = ((t - at) % P.loop + P.loop * 1.5) % P.loop - P.loop / 2; return Math.exp(-(d / w) * (d / w)); };
    const k2t = u => u / P.L * P.loop;
    const a = 0.08 * Math.sin(t / P.loop * Math.PI * 4) + 0.55 * (near(k2t(P.gF), 0.32) + near(k2t(P.gR), 0.32)) + 0.2 * (near(k2t(P.dF), 0.2) + near(k2t(P.dR), 0.2));
    const pvx = P.PX + 2 * Math.cos(tilt) - 13 * Math.sin(tilt), pvy = py + 2 * Math.sin(tilt) + 13 * Math.cos(tilt);
    // Bo's hand (in front of his feet), turned with the swing
    const hx0 = 8, hy0 = P.feet - 3;
    const hand = { x: pvx + hx0 * Math.cos(a) + hy0 * Math.sin(a), y: pvy - hx0 * Math.sin(a) + hy0 * Math.cos(a) };
    return { p, wing, up, py, tilt, a, pvx, pvy, hand };
  };
  definePreview('Pterodactyl Express', {
    blurb: 'Flap Petra on the beat while your partner swings below to drop fruit for baby dinos and rocks on switches!',
    loop: PW14P.loop, still: 1.3,
    draw(v, t) {
      const ctx = v.ctx, P = PW14P, L = P.L, GY = P.GY, k = t / P.loop, u = k * L, bx0 = P.PX + 2;
      const pose = pw14pPose(t), t2u = tt => tt / P.loop * L, u2t = uu => uu / L * P.loop;
      // where things sit along the valley: each is put right under Bo's hand at its moment, so the grabs and drops line up
      const gF = pw14pPose(u2t(P.gF)).hand, dF = pw14pPose(u2t(P.dF)).hand, gR = pw14pPose(u2t(P.gR)).hand, dR = pw14pPose(u2t(P.dR)).hand;
      const landF = P.dF + t2u(P.fallF), landR = P.dR + t2u(P.fallR);
      const treeX = P.gF + gF.x - bx0, nestX = landF + dF.x - bx0, pileX = P.gR + gR.x - bx0, swX = landR + dR.x - bx0, gateX = swX + 96;
      const nestY = GY - 30;
      // sky, sun, drifting clouds (one valley's worth of clouds drifts by each loop)
      v.sky(); v.sun(v.W - 46, 30, 14);
      for (let q = -1; q < 9; q++) {
        const slot = ((q % 3) + 3) % 3; if (slot === 1) continue;
        const x = q * 45 - (u * 0.25) % 135 + 10;
        v.cloud(x, slot ? 44 : 24, slot ? 0.6 : 0.85);
      }
      // the sleepy volcano far away, puffing smoke rings, and the far hills
      const vx = 246, vt = 88;
      ctx.fillStyle = 'rgba(209,143,138,0.7)'; ctx.beginPath(); ctx.moveTo(vx - 62, GY - 24); ctx.quadraticCurveTo(vx - 20, vt + 12, vx - 10, vt); ctx.lineTo(vx + 10, vt); ctx.quadraticCurveTo(vx + 20, vt + 12, vx + 62, GY - 24); ctx.fill();
      ctx.fillStyle = '#e6977a'; ctx.beginPath(); ctx.ellipse(vx, vt + 1, 10, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(60,40,50,0.45)'; ctx.lineWidth = 1.3;
      for (const ex of [-6, 6]) { ctx.beginPath(); ctx.arc(vx + ex, vt + 18, 2.3, 0.2, Math.PI - 0.2); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(vx, vt + 24, 3, 0.3, Math.PI - 0.3); ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const q = (k * 3 + i / 3) % 1;
        ctx.save(); ctx.globalAlpha = 0.6 * (1 - q); v.cloud(vx - 8 + Math.sin(q * 5 + i) * 5, vt - 6 - q * 40, 0.22 + q * 0.35); ctx.restore();
      }
      ctx.fillStyle = 'rgba(227,165,155,0.75)'; ctx.beginPath(); ctx.moveTo(0, v.H);
      for (let x = 0; x <= v.W; x += 8) ctx.lineTo(x, GY - 34 + Math.sin(x / 50 + 1) * 8 + Math.sin(x / 21) * 3);
      ctx.lineTo(v.W, v.H); ctx.closePath(); ctx.fill();
      // the jungle hills (half speed: they move half a valley each loop) with a friendly bronto munching on them
      const off = u * 0.5, half = L / 2, hy = x => GY - 16 + Math.sin((x + off) / half * Math.PI * 2 + 1) * 6 + Math.sin((x + off) / half * Math.PI * 6) * 2.5;
      ctx.fillStyle = '#8cc47a'; ctx.beginPath(); ctx.moveTo(0, v.H);
      for (let x = 0; x <= v.W + 8; x += 8) ctx.lineTo(x, hy(x));
      ctx.lineTo(v.W, v.H); ctx.closePath(); ctx.fill();
      for (let q = -1; q < 4; q++) {
        const x = q * 135 - (off % 270) + 70;
        if (x < -60 || x > v.W + 60) continue;
        if (q % 2 === 0) pw14pBronto(v, x, hy(x) + 6, 0.2, k * 2 + q * 0.3);
        else {
          ctx.strokeStyle = '#6aa65f'; ctx.fillStyle = '#6aa65f'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x, hy(x) + 2); ctx.quadraticCurveTo(x + 4, hy(x) - 14, x + 2, hy(x) - 28); ctx.stroke();
          for (let j = 0; j < 5; j++) { const an = -Math.PI / 2 + (j - 2) * 0.55; ctx.beginPath(); ctx.ellipse(x + 2 + Math.cos(an) * 7, hy(x) - 28 + Math.sin(an) * 4 + 3, 8, 2.2, an, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      // the ground: dirt with a grassy top, tufts and flowers (one valley long, so it repeats each loop)
      ctx.fillStyle = '#a8754a'; ctx.fillRect(0, GY, v.W, v.H - GY);
      ctx.fillStyle = 'rgba(125,82,50,0.5)'; ctx.fillRect(0, GY + 12, v.W, 3);
      ctx.fillStyle = '#3f8f3a'; ctx.fillRect(0, GY - 2, v.W, 6);
      ctx.fillStyle = '#7ccf4f'; ctx.fillRect(0, GY - 3, v.W, 3.5);
      for (let q = Math.floor(u / 30) - 1; q < Math.floor(u / 30) + 13; q++) {
        const x = q * 30 - u + bx0 - 130, h = Math.floor(v.rand((((q % 18) + 18) % 18) + 3) * 1000);
        if (h % 3 === 0) { ctx.fillStyle = '#3f8f3a'; for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.ellipse(x + (j - 1) * 2, GY - 4, 1, 4, (j - 1) * 0.4, 0, Math.PI * 2); ctx.fill(); } }
        else if (h % 5 === 1) { v.fillCircle(x, GY - 4, 1.8, ['#ffd84d', '#ff8fb5', '#ffffff'][h % 3]); v.fillCircle(x, GY - 4, 0.7, '#ffb347'); }
        else if (h % 4 === 0) { ctx.fillStyle = '#7d5232'; ctx.beginPath(); ctx.ellipse(x, GY + 7 + (h % 7), 2.5, 1.5, 0, 0, Math.PI * 2); ctx.fill(); }
      }
      // the things along the valley, each copy with its own state (uu: how far Bo is past the start of that copy)
      const pop = [];
      for (let n = -1; n <= 1; n++) {
        const uu = u - n * L, sx = X => bx0 + X - uu;
        // the palm with its mango (it gives a little shake when Bo grabs it)
        const tx = sx(treeX);
        if (tx > -60 && tx < v.W + 60) {
          const wob = uu > P.gF ? Math.sin((uu - P.gF) * 0.5) * Math.max(0, 1 - (uu - P.gF) / 40) * 3 : 0, top = gF.y - 13;
          ctx.strokeStyle = '#a8754a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(tx, GY); ctx.quadraticCurveTo(tx - 8, (GY + top) / 2, tx + wob, top); ctx.stroke();
          ctx.strokeStyle = '#8a5a34'; ctx.lineWidth = 1;
          for (let yy = GY - 8; yy > top + 6; yy -= 8) { const f = (GY - yy) / (GY - top), xx = tx + wob * f - 8 * 2 * f * (1 - f); ctx.beginPath(); ctx.moveTo(xx - 2.5, yy); ctx.lineTo(xx + 2.5, yy - 1.5); ctx.stroke(); }
          for (let j = 0; j < 6; j++) {
            const an = -Math.PI / 2 + (j - 2.5) * 0.62 + Math.sin(k * Math.PI * 4 + j) * 0.04;
            ctx.fillStyle = j % 2 ? '#4f9a3c' : '#62b04a';
            ctx.beginPath(); ctx.ellipse(tx + wob + Math.cos(an) * 12, top + Math.sin(an) * 6 + 4, 14, 3.5, an, 0, Math.PI * 2); ctx.fill();
          }
          if (uu < P.gF) { v.line(tx + wob * 0.8, top + 3, tx, gF.y - 4, '#5a7a2a', 1); pw14pMango(v, tx, gF.y); }
        }
        // the nest on its stump, with a hungry baby (fed once the mango lands)
        const nx = sx(nestX);
        if (nx > -60 && nx < v.W + 60) {
          const fed = uu >= landF;
          ctx.fillStyle = '#8a5a34'; v.rr(nx - 11, nestY + 1, 22, GY - nestY, 3); ctx.fill();
          ctx.fillStyle = '#a8754a'; ctx.beginPath(); ctx.ellipse(nx, nestY + 2, 11, 3, 0, 0, Math.PI * 2); ctx.fill();
          pw14pBaby(v, nx, nestY - 7, '#ff9ec7', !fed, t);
          ctx.fillStyle = '#9a6a3a'; ctx.beginPath(); ctx.ellipse(nx, nestY, 17, 6, 0, 0, Math.PI); ctx.fill();
          ctx.strokeStyle = '#6b4226'; ctx.lineWidth = 1.3;
          for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.moveTo(nx - 17 + j * 2, nestY - 0.5 + j); ctx.quadraticCurveTo(nx, nestY + 4 + j, nx + 17 - j * 2, nestY - 0.5 + j); ctx.stroke(); }
          ctx.strokeStyle = '#c49460'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(nx, nestY, 17, 2.5, 0, 0, Math.PI * 2); ctx.stroke();
          if (fed && uu < landF + 110) {
            const f = (uu - landF) / 110;
            v.heart(nx + 9, nestY - 18 - f * 16, 3.5 * (1 - f * 0.4), '#ff6b8a');
            if (f < 0.7) pop.push(['Nom!', nx + 22, nestY - 22, 12, '#fff']);
            v.sparkle(nx, nestY - 6, f * 2.5);
          }
        }
        // the rock pillar with its rocks (Bo takes the top one)
        const rx = sx(pileX);
        if (rx > -60 && rx < v.W + 60) {
          const ptop = gR.y + 7;
          ctx.fillStyle = '#6b5a4a'; v.rr(rx - 10, ptop, 20, GY - ptop + 2, 2); ctx.fill();
          ctx.fillStyle = '#9a8a7a';
          for (let yy = ptop + 4, j = 0; yy < GY - 2; yy += 8, j++) { v.rr(rx - 9 + (j % 2) * 2, yy, 16, 6.5, 1.5); ctx.fill(); }
          ctx.fillStyle = '#6b5a4a'; v.rr(rx - 13, ptop - 2, 26, 5, 2); ctx.fill();
          pw14pRock(v, rx - 4.5, ptop - 4.5, 4); pw14pRock(v, rx + 4.5, ptop - 4.5, 4);
          if (uu < P.gR) pw14pRock(v, rx, gR.y, 4);
        }
        // the stone switch: pressed (gold) once the rock lands on it
        const wx = sx(swX);
        if (wx > -60 && wx < v.W + 60) {
          const down = uu >= landR, hgt = down ? 2 : 6.5, w = 25;
          ctx.fillStyle = '#5e5346'; v.rr(wx - w / 2 - 3, GY - 4, w + 6, 6, 2); ctx.fill();
          ctx.fillStyle = down ? '#ffd76a' : '#b8ada0'; ctx.beginPath(); ctx.ellipse(wx, GY - 4, w / 2, hgt, 0, Math.PI, 0); ctx.fill();
          ctx.strokeStyle = down ? '#b9850f' : '#7a6e60'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(wx, GY - 4, w / 2, hgt, 0, Math.PI, 0); ctx.stroke();
          if (down) {
            pw14pRock(v, wx, GY - 9, 4.5);
            const f = (uu - landR) / 40;
            if (f < 1) { ctx.save(); ctx.globalAlpha = 0.8 * (1 - f); v.fillCircle(wx, GY - 5, 12 + f * 14, v.c.gold); ctx.restore(); }
            if (uu < landR + 70) pop.push(['Clonk!', wx, GY - 30, 11, v.c.gold]);
          }
        }
        // the log gate: lifts as soon as the switch is down, just in time for Petra
        const gx = sx(gateX);
        if (gx > -60 && gx < v.W + 60) {
          const top = 4, open = pw14pSmooth(v.clamp((uu - landR) / 20, 0, 1)), lift = open * (GY - top + 6);
          ctx.save(); ctx.beginPath(); ctx.rect(gx - 16, top + 4, 32, GY - top - 4); ctx.clip();
          for (let j = -1; j <= 1; j++) {
            const lx = gx + j * 5.5;
            ctx.fillStyle = j ? '#a8703c' : '#b87d46'; v.rr(lx - 3, top - lift, 6, GY - top + 2, 3); ctx.fill();
            ctx.strokeStyle = '#7d4f28'; ctx.lineWidth = 1;
            for (let yy = top + 16 - lift; yy < GY - lift; yy += 23) { ctx.beginPath(); ctx.moveTo(lx - 2, yy); ctx.lineTo(lx + 1.5, yy + 4); ctx.stroke(); }
          }
          ctx.fillStyle = '#4f9a3c'; for (let yy = top + 30 - lift; yy < GY - lift; yy += 55) ctx.fillRect(gx - 9, yy, 18, 3);
          const by = GY - 45 - lift;
          v.fillCircle(gx, by, 6.5, uu >= landR ? '#ffd76a' : '#b8ada0');
          ctx.strokeStyle = uu >= landR ? '#b9850f' : '#7a6e60'; ctx.lineWidth = 1.2; ctx.beginPath();
          for (let an = 0; an < Math.PI * 3.2; an += 0.3) { const r = 0.5 + an * 0.6; ctx.lineTo(gx + Math.cos(an) * r, by + Math.sin(an) * r); } ctx.stroke();
          ctx.restore();
          for (const sd of [-1, 1]) { ctx.fillStyle = '#6b5a4a'; v.rr(gx + sd * 12 - 4, top, 8, GY - top + 2, 2.5); ctx.fill(); ctx.fillStyle = '#9a8a7a'; v.rr(gx + sd * 12 - 3, top, 4, GY - top + 2, 1.5); ctx.fill(); }
          ctx.fillStyle = '#6b5a4a'; v.rr(gx - 19, top - 6, 38, 11, 3); ctx.fill();
          ctx.fillStyle = '#62b04a'; ctx.beginPath(); ctx.ellipse(gx - 6, top + 3, 8, 2.5, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(gx + 9, top + 4, 6, 2, -0.4, 0, Math.PI * 2); ctx.fill();
        }
      }
      // falling things: they keep Petra's speed, so on screen they drop straight down onto the nest or the switch
      const since = at => ((t - at) % P.loop + P.loop) % P.loop;
      const fF = since(u2t(P.dF)), fR = since(u2t(P.dR));
      if (fF < P.fallF) { const f = fF / P.fallF; pw14pMango(v, dF.x, v.lerp(dF.y, nestY - 4, f * f)); }
      if (fR < P.fallR) { const f = fR / P.fallR; pw14pRock(v, dR.x, v.lerp(dR.y, GY - 9, f * f), 4); }
      // Bo hanging from Petra's feet, swinging (drawn before Petra so her body covers his hands)
      const hold = u >= P.gF && u < P.dF ? 'mango' : u >= P.gR && u < P.dR ? 'rock' : null;
      const grabbing = Math.min(since(u2t(P.gF)), since(u2t(P.gR))), justGrab = grabbing < 0.35;
      const happy = Math.min(since(u2t(landF)), since(u2t(landR))) < 0.9;
      ctx.save(); ctx.translate(pose.pvx, pose.pvy); ctx.rotate(-pose.a);
      v.line(-3, P.arm + 2, -1, 0, v.c.boDark, 2); v.line(3, P.arm + 2, 1, 0, v.c.boDark, 2);
      v.hero(1, 0, P.feet, { s: 0.7, face: 1, shadow: false, mood: justGrab ? 'wow' : happy ? 'joy' : 'happy' });
      ctx.restore();
      if (hold === 'mango') pw14pMango(v, pose.hand.x, pose.hand.y);
      if (hold === 'rock') pw14pRock(v, pose.hand.x, pose.hand.y, 4);
      if (justGrab) v.sparkle(pose.hand.x, pose.hand.y, grabbing / 0.35);
      // Petra, with Pip riding on the leafy saddle (bouncing a little on each flap)
      const flapK = pose.p < 0.25 ? 1 - pose.p / 0.25 : 0;
      pw14pPetra(v, P.PX, pose.py, pose.up, pose.tilt, false);
      const seat = { x: P.PX - 4 * Math.cos(pose.tilt) + 7 * Math.sin(pose.tilt), y: pose.py - 4 * Math.sin(pose.tilt) - 7 * Math.cos(pose.tilt) };
      v.hero(0, seat.x, seat.y - flapK * 2, { s: 0.7, face: 1, shadow: false, sq: flapK * 0.2, mood: flapK > 0.3 ? 'joy' : 'happy' });
      // the little wing meter beside her (the beat): fills as the wings rise, gold at the TOP; the flap makes a PERFECT
      const mx = P.PX - 50, my = pose.py - 28, mh = 26, topNow = pose.wing >= 1;
      ctx.fillStyle = 'rgba(28,26,54,0.72)'; v.rr(mx - 4.5, my - 3, 9, mh + 6, 4.5); ctx.fill();
      ctx.fillStyle = 'rgba(255,197,61,0.35)'; v.rr(mx - 2.5, my, 5, mh * 0.28, 2.5); ctx.fill();
      ctx.fillStyle = topNow ? v.c.gold : '#fff'; const fh = Math.max(3, mh * pose.wing); v.rr(mx - 2.5, my + mh - fh, 5, fh, 2.5); ctx.fill();
      if (topNow) { ctx.strokeStyle = v.c.gold; ctx.lineWidth = 1.5; v.rr(mx - 6, my - 4.5, 12, mh + 9, 6); ctx.stroke(); }
      if (pose.p < 0.3) { const f = pose.p / 0.3; ctx.save(); ctx.globalAlpha = f < 0.75 ? 1 : (1 - f) * 4; v.label('PERFECT!', P.PX + 44, pose.py - 30 - f * 5, 10, v.c.gold); ctx.restore(); }
      for (const [s, x, y, size, col] of pop) v.label(s, x, y, size, col);
    },
  });
  // ----- END 14-2 Pterodactyl Express preview -----
  //
  // ----- BEGIN 14-3 Tar Pit Pull preview -----
  // ----- END 14-3 Tar Pit Pull preview -----
  //
  // ----- BEGIN 14-4 Raptor Race preview -----
  // ----- END 14-4 Raptor Race preview -----
}
