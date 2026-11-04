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
  // ----- END 14-3 Tar Pit Pull preview -----
  //
  // ----- BEGIN 14-4 Raptor Race preview -----
  // Pip rides Zippy, Bo rides Noodle (the level's own raptor art, smaller). Two halves of 3.5 s: the raptor behind
  // hops up for a floating speed egg and DASHES past to lead; then the other one does the same. A log to hop in the
  // first half, a low branch to duck in the second. Everything that scrolls repeats exactly every 7 s, so there's no seam.
  const pw14rDino = [
    { body: '#ffcf4a', dark: '#d98f1f', stripe: '#ff8a3d', belly: '#fff2bf', feather: '#ff6b4a', featherDk: '#c8442c' },
    { body: '#b9a0ff', dark: '#7a5fd0', stripe: '#8a6ee8', belly: '#f1e9ff', feather: '#5b95ff', featherDk: '#2f5fc4' },
  ];
  const pw14rK = {
    dirt: '#b07a44', dirtDk: '#946233', dirtDk2: '#7d522b', grass: '#7ccf4f', grassDk: '#3f8f3a', grassHi: '#a8e86e',
    bark: '#8a5a32', barkDk: '#6a4224', leaf: '#4f9a3f', leafHi: '#6fbf4a', leafDk: '#3a7a30', hat: '#ecd9a4', hatDk: '#bfa46a',
    egg: '#fff4d6', eggSpot: '#3fb8a8', eggSpot2: '#ff9a3d',
  };
  // loop, half, trail speed (px/s), trail height, where the leader and the chaser run, the chaser's lag behind the leader
  const pw14rL = 7, pw14rHalf = 3.5, pw14rSp = 120, pw14rGy = 150, pw14rFront = 196, pw14rBack = 114;
  const pw14rLag = (pw14rFront - pw14rBack) / pw14rSp;
  const pw14rTAU = Math.PI * 2;
  // a speed egg (the level's: a zig-zag stripe and spots)
  const pw14rEgg = (v, x, y, s) => {
    const ctx = v.ctx, K = pw14rK;
    ctx.fillStyle = '#c8b48a'; ctx.beginPath(); ctx.ellipse(x, y + 0.8 * s, 9.6 * s, 12.6 * s, 0, 0, pw14rTAU); ctx.fill();
    ctx.fillStyle = K.egg; ctx.beginPath(); ctx.ellipse(x, y, 9 * s, 12 * s, 0, 0, pw14rTAU); ctx.fill();
    ctx.strokeStyle = K.eggSpot2; ctx.lineWidth = 2.2 * s; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - 8 * s, y + s); ctx.lineTo(x - 4 * s, y - 3 * s); ctx.lineTo(x, y + 2 * s); ctx.lineTo(x + 4 * s, y - 3 * s); ctx.lineTo(x + 8 * s, y + s); ctx.stroke();
    ctx.fillStyle = K.eggSpot;
    for (const [dx, dy, r] of [[-3, -7, 1.8], [4, -8, 1.3], [2, 7, 1.8], [-5, 6, 1.2]]) { v.circle(x + dx * s, y + dy * s, r * s); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(x - 3.5 * s, y - 5 * s, 2 * s, 3.4 * s, -0.3, 0, pw14rTAU); ctx.fill();
  };
  // a raptor and its rider, feet at (x, y), drawn like the level's (raptorDrawRider) at scale s.
  // o: ph (leg cycle), air, duck 0..1, dash 0..1, mood ('happy' | 'wow'), egg (an egg floats over the rider), gy (trail under it)
  const pw14rRider = (v, id, x, y, o) => {
    const ctx = v.ctx, D = pw14rDino[id], K = pw14rK, ink = v.c.ink, s = o.s || 0.62;
    const col = id ? v.c.bo : v.c.pip, dk = id ? v.c.boDark : v.c.pipDark;
    const air = !!o.air, dK = o.duck || 0, ph = o.ph, dash = o.dash || 0, wow = o.mood === 'wow';
    const bob = air ? 0 : Math.abs(Math.sin(ph)) * 3;
    const hh = v.clamp((o.gy - y) / 70, 0, 0.7);
    ctx.fillStyle = 'rgba(28,26,54,' + (0.22 * (1 - hh)) + ')'; ctx.beginPath(); ctx.ellipse(x + 1, o.gy, 19 * (1 - hh * 0.5), 3.2, 0, 0, pw14rTAU); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (dash > 0) { // the dash: a warm aura and speed lines
      ctx.globalAlpha = dash;
      ctx.fillStyle = 'rgba(255,197,61,0.3)'; ctx.beginPath(); ctx.ellipse(0, -28, 54, 31, 0, 0, pw14rTAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,248,214,0.95)'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      for (const oy of [-48, -30, -12]) { const len = 34 + v.rand(Math.floor(v.t * 18) * 7 + oy + 60) * 34; ctx.beginPath(); ctx.moveTo(-62, oy); ctx.lineTo(-62 - len, oy); ctx.stroke(); }
      ctx.lineCap = 'butt'; ctx.globalAlpha = 1;
    }
    const hipX = -4, hipY = -30 + dK * 9 + bob;
    const leg = (k, isNear) => { // thigh, shin, toes and a little claw (running cycle, tucked in the air)
      const a = ph + k * Math.PI;
      let fx, fy;
      if (air) { fx = hipX + 8 + (k ? -6 : 4); fy = hipY + 20; } else { fx = hipX + 6 + Math.cos(a) * 15; fy = -Math.max(0, Math.sin(a)) * 11; }
      const kx = (hipX + 4 + fx) / 2 + 8, ky = (hipY + 4 + fy) / 2 - 2;
      ctx.strokeStyle = isNear ? D.body : D.dark; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(hipX + 4, hipY + 2); ctx.lineTo(kx, ky); ctx.stroke();
      ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(fx - 3, fy - 4); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.strokeStyle = isNear ? D.dark : '#5a4a3a'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(fx - 2, fy); ctx.lineTo(fx + 9, fy); ctx.moveTo(fx, fy - 1); ctx.quadraticCurveTo(fx + 4, fy - 9, fx + 7, fy - 6); ctx.stroke();
      ctx.lineCap = 'butt';
    };
    leg(1, false);
    // the tail with its feather tuft, the body, the belly and back stripes
    const wag = Math.sin(ph * 0.5 + id) * 5 - (air ? 6 : 0);
    ctx.fillStyle = D.body; ctx.beginPath(); ctx.moveTo(hipX - 12, hipY - 12); ctx.quadraticCurveTo(hipX - 36, hipY - 18 + wag * 0.4, hipX - 56, hipY - 18 + wag); ctx.quadraticCurveTo(hipX - 36, hipY - 4 + wag * 0.3, hipX - 10, hipY + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = D.feather; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(hipX - 58 - k * 2, hipY - 20 + wag + (k - 1) * 5, 9, 3.4, (k - 1) * 0.35, 0, pw14rTAU); ctx.fill(); }
    ctx.fillStyle = D.body; ctx.beginPath(); ctx.ellipse(hipX + 2, hipY - 4, 24, 13 - dK * 2, -0.08 - dK * 0.05, 0, pw14rTAU); ctx.fill();
    ctx.fillStyle = D.belly; ctx.beginPath(); ctx.ellipse(hipX + 6, hipY + 2, 15, 6, -0.1, 0, pw14rTAU); ctx.fill();
    ctx.strokeStyle = D.stripe; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) { const sx = hipX - 14 + k * 9; ctx.beginPath(); ctx.moveTo(sx, hipY - 15); ctx.lineTo(sx + 3, hipY - 9); ctx.stroke(); }
    ctx.lineCap = 'butt';
    leg(0, true);
    // the neck and head (low and forward when ducking or dashing)
    const low = Math.max(dK, dash), hx = hipX + 34 + low * 8, hy = hipY - 26 + low * 18 - (dK > dash ? dK * 9 : 0);
    ctx.strokeStyle = D.body; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hipX + 16, hipY - 6); ctx.quadraticCurveTo(hipX + 24, hipY - 14, hx - 4, hy + 4); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = D.feather; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(hx - 10 - k * 4, hy - 9 + k * 3, 7, 3, -0.9 - k * 0.2, 0, pw14rTAU); ctx.fill(); }
    ctx.fillStyle = D.body; ctx.beginPath(); ctx.ellipse(hx, hy, 13, 10, 0, 0, pw14rTAU); ctx.fill();
    v.rr(hx, hy - 6, 17, 12, 6); ctx.fill(); // the snout
    ctx.fillStyle = D.belly; v.rr(hx + 2, hy + 1, 15, 5, 3); ctx.fill();
    const big = wow ? 1.25 : 1;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(hx + 2, hy - 3, 4.6 * big, 5.2 * big, 0, 0, pw14rTAU); ctx.fill();
    ctx.fillStyle = ink; v.circle(hx + 3.6, hy - 2.6, 2.6); ctx.fill(); ctx.fillStyle = '#fff'; v.circle(hx + 4.4, hy - 3.8, 1); ctx.fill();
    ctx.fillStyle = ink; v.circle(hx + 14, hy - 3, 1); ctx.fill(); // nostril
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
    if (dash > 0.3 || wow) { ctx.fillStyle = '#ff7a8a'; ctx.beginPath(); ctx.arc(hx + 9, hy + 2, 4.5, 0, Math.PI); ctx.fill(); ctx.beginPath(); ctx.arc(hx + 9, hy + 2, 4.5, 0, Math.PI); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(hx + 4, hy + 2.5); ctx.quadraticCurveTo(hx + 10, hy + 5.5, hx + 16, hy + 1.5); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,120,140,0.5)'; v.circle(hx - 2, hy + 3, 2.6); ctx.fill();
    // a little feathered arm, flapping
    ctx.save(); ctx.translate(hipX + 18, hipY - 4); ctx.rotate(0.6 + Math.sin(ph * 2) * 0.4);
    ctx.fillStyle = D.feather; ctx.beginPath(); ctx.ellipse(6, 0, 9, 3.5, 0, 0, pw14rTAU); ctx.fill(); ctx.fillStyle = D.featherDk; ctx.beginPath(); ctx.ellipse(9, 2, 5, 2, 0, 0, pw14rTAU); ctx.fill();
    ctx.restore();
    // the saddle and the rider in a safari hat, holding the reins (hugging low when ducking)
    const sx = hipX - 2, sy = hipY - 14;
    ctx.fillStyle = col; v.rr(sx - 12, sy - 1, 24, 6, 3); ctx.fill();
    ctx.fillStyle = '#8a5a32'; v.rr(sx - 9, sy - 4, 18, 6, 3); ctx.fill();
    const hug = low, rx = sx + hug * 5, ry = sy - 12 + hug * 4, rw = 18, rh = 20 - hug * 5;
    ctx.strokeStyle = '#6a4224'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(rx + 8, ry + 2); ctx.quadraticCurveTo(hx - 8, hy + 10, hx - 4, hy + 4); ctx.stroke();
    if (id === 1) { ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 1.8; v.circle(rx - 6, ry - rh / 2 + 1, 3.6); ctx.fill(); ctx.stroke(); v.circle(rx + 6, ry - rh / 2 + 1, 3.6); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = col; ctx.strokeStyle = dk; ctx.lineWidth = 2;
    v.rr(rx - rw / 2, ry - rh / 2, rw, rh, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; v.rr(rx - rw / 2 + 2, ry - rh / 2 + 2, 6, 6, 3); ctx.fill();
    ctx.fillStyle = col; v.circle(rx + 9, ry + 3, 3); ctx.fill(); ctx.stroke(); // a hand on the reins
    const ey = ry - 2;
    for (const ex of [2, 7]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(rx + ex, ey, 2.4 * big, 3 * big, 0, 0, pw14rTAU); ctx.fill(); ctx.fillStyle = ink; v.circle(rx + ex + 0.9, ey + 0.4, 1.3); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,120,140,0.5)'; v.circle(rx + 8.5, ey + 4.5, 1.8); ctx.fill();
    ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 1.2;
    if (wow) { ctx.beginPath(); ctx.ellipse(rx + 4.5, ey + 5, 1.4, 1.8, 0, 0, pw14rTAU); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(rx + 4.5, ey + 4, 2.2, 0.2, Math.PI - 0.2); ctx.stroke(); }
    const ht = ry - rh / 2 - 1; // the safari hat (Pip's sprout pokes out of the top)
    ctx.fillStyle = K.hatDk; ctx.beginPath(); ctx.ellipse(rx + 1, ht + 1, 13, 3.2, -0.05, 0, pw14rTAU); ctx.fill();
    ctx.fillStyle = K.hat; ctx.beginPath(); ctx.ellipse(rx, ht - 1, 9.5, 8, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col; ctx.fillRect(rx - 9.5, ht - 3, 19, 2.6);
    if (id === 0) { ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(rx, ht - 9); ctx.lineTo(rx + 1, ht - 13); ctx.stroke(); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(rx + 4.5, ht - 14, 4.6, 2.3, -0.5, 0, pw14rTAU); ctx.fill(); }
    ctx.restore();
    if (o.egg) pw14rEgg(v, x + 18 * s / 0.62, y - 60 * s / 0.62 + Math.sin(v.t * pw14rTAU) * 2, 0.55);
  };
  // the jungle behind the trail: sunset sky, the sleepy volcano, a pterodactyl, hills, palms and round trees
  const pw14rScene = (v, t) => {
    const ctx = v.ctx, K = pw14rK, gy = pw14rGy, scroll = t * pw14rSp;
    const g = ctx.createLinearGradient(0, 0, 0, v.H);
    g.addColorStop(0, '#f6a85e'); g.addColorStop(0.45, '#ffd08a'); g.addColorStop(1, '#fff1c9');
    ctx.fillStyle = g; ctx.fillRect(0, 0, v.W, v.H);
    const gl = ctx.createRadialGradient(252, 52, 10, 252, 52, 62);
    gl.addColorStop(0, 'rgba(255,240,180,0.7)'); gl.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = gl; v.circle(252, 52, 62); ctx.fill();
    v.fillCircle(252, 52, 19, '#fff3c0');
    // the volcano, puffing little smoke clouds
    const vx = 88, vt = 66;
    ctx.fillStyle = '#c99a7a'; ctx.beginPath(); ctx.moveTo(vx - 80, 132); ctx.lineTo(vx - 18, vt); ctx.quadraticCurveTo(vx, vt - 4, vx + 18, vt); ctx.lineTo(vx + 80, 132); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#dcae8a'; ctx.beginPath(); ctx.moveTo(vx - 18, vt); ctx.quadraticCurveTo(vx, vt - 4, vx + 18, vt); ctx.lineTo(vx + 9, vt + 13); ctx.lineTo(vx - 3, vt + 7); ctx.lineTo(vx - 12, vt + 15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,140,90,0.45)'; ctx.beginPath(); ctx.ellipse(vx, vt - 1, 14, 2.6, 0, 0, pw14rTAU); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const k = v.phase(t, pw14rL, i * pw14rL / 4), py = vt - 6 - k * 50, px = vx + Math.sin(k * 5 + i) * 5 + k * 13;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.6 * (1 - k)) + ')';
      v.circle(px, py, 4 + k * 9); ctx.fill(); v.circle(px + 5 + k * 4, py + 2, 3 + k * 7); ctx.fill();
    }
    // a pterodactyl gliding by, far away
    { const px = 360 - v.phase(t, pw14rL) * 420, py = 34 + Math.sin(t * pw14rTAU / pw14rL * 2) * 5, f = Math.sin(t * pw14rTAU * 2) * 3;
      ctx.strokeStyle = 'rgba(120,80,70,0.55)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px - 10, py - f); ctx.quadraticCurveTo(px - 4, py - 4, px, py); ctx.quadraticCurveTo(px + 4, py - 4, px + 10, py - f); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 5, py - 1); ctx.stroke(); ctx.lineCap = 'butt'; }
    // far hills (still), then a jungle line that drifts slowly (4 shapes, 42 px apart: 168 px every loop)
    ctx.fillStyle = v.c.hillFar; ctx.beginPath(); ctx.moveTo(0, v.H);
    for (let x = 0; x <= v.W; x += 8) ctx.lineTo(x, 112 + Math.sin(x * 0.014 + 1.2) * 9 + Math.sin(x * 0.045) * 3);
    ctx.lineTo(v.W, v.H); ctx.fill();
    ctx.fillStyle = v.c.hillNear;
    const off1 = (scroll * 0.2) % 168;
    for (let i = -1; i * 42 - off1 < v.W + 30; i++) {
      const x = i * 42 - off1, k = ((i % 4) + 4) % 4, hgt = [26, 18, 32, 22][k];
      if (k % 2 === 0) { // a palm
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, 134); ctx.quadraticCurveTo(x - 4, 134 - hgt * 0.6, x + 2, 130 - hgt); ctx.stroke();
        for (let j = 0; j < 5; j++) { const a = -2.6 + j * 0.55; ctx.beginPath(); ctx.ellipse(x + 2 + Math.cos(a) * 8, 130 - hgt + Math.sin(a) * 4 + 3, 9, 2.6, a, 0, pw14rTAU); ctx.fill(); }
      } else { v.circle(x, 132 - hgt * 0.6, 10 + hgt * 0.3); ctx.fill(); v.circle(x + 11, 134 - hgt * 0.45, 8 + hgt * 0.25); ctx.fill(); }
    }
    ctx.fillRect(0, 128, v.W, gy - 126);
    // trees next to the trail (4 kinds, 105 px apart: 420 px every loop)
    const off2 = (scroll * 0.5) % 420, base = gy + 1;
    for (let i = -1; i * 105 - off2 < v.W + 30; i++) {
      const sx = i * 105 - off2 + 30, k = ((i % 4) + 4) % 4;
      if (k === 0 || k === 2) { // a tall palm with coconuts
        const th = k ? 66 : 76;
        ctx.strokeStyle = '#8a6a42'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sx, base); ctx.quadraticCurveTo(sx + 8, base - th * 0.6, sx + 2, base - th); ctx.stroke(); ctx.lineCap = 'butt';
        ctx.fillStyle = '#4f9a3f';
        for (let j = 0; j < 6; j++) { const a = -Math.PI + j * 0.62 + Math.sin(t * pw14rTAU / pw14rL * 3 + i) * 0.05; ctx.beginPath(); ctx.ellipse(sx + 2 + Math.cos(a) * 12, base - th + Math.sin(a) * 5 + 4, 13, 3.2, a, 0, pw14rTAU); ctx.fill(); }
        ctx.fillStyle = '#8a5a32'; v.circle(sx + 1, base - th + 3, 2.4); ctx.fill(); v.circle(sx + 4, base - th + 4, 2); ctx.fill();
      } else if (k === 1) { // a round jungle tree with pink flowers
        ctx.fillStyle = K.barkDk; ctx.fillRect(sx - 3.5, base - 34, 7, 34);
        ctx.fillStyle = K.leafDk; v.circle(sx, base - 38, 18); ctx.fill();
        ctx.fillStyle = K.leaf; v.circle(sx - 9, base - 41, 13); ctx.fill(); v.circle(sx + 10, base - 37, 12); ctx.fill();
        ctx.fillStyle = '#ff8fa8'; for (let j = 0; j < 4; j++) { v.circle(sx - 12 + j * 8, base - 42 + (j % 2) * 7, 1.8); ctx.fill(); }
      } else { // a clump of giant ferns
        ctx.fillStyle = '#4f9a3f';
        for (let j = 0; j < 7; j++) { const a = -Math.PI * 0.92 + j * 0.3; ctx.beginPath(); ctx.ellipse(sx + Math.cos(a) * 14, base - 4 + Math.sin(a) * 16, 14, 2.4, a, 0, pw14rTAU); ctx.fill(); }
        ctx.fillStyle = '#6fbf4a';
        for (let j = 0; j < 5; j++) { const a = -Math.PI * 0.85 + j * 0.34; ctx.beginPath(); ctx.ellipse(sx + Math.cos(a) * 10, base - 4 + Math.sin(a) * 11, 10, 1.8, a, 0, pw14rTAU); ctx.fill(); }
      }
    }
    // the dirt trail with pebbles, a little fossil and grassy tufts (20 and 30 slots: 840 px every loop)
    ctx.fillStyle = K.dirt; ctx.fillRect(0, gy, v.W, v.H - gy);
    ctx.fillStyle = K.dirtDk; ctx.fillRect(0, gy + 17, v.W, 7); ctx.fillStyle = K.dirtDk2; ctx.fillRect(0, gy + 30, v.W, v.H);
    const off3 = scroll % 840;
    for (let i = 0; i < 10; i++) {
      const slot = Math.floor(off3 / 42) + i, k = slot % 20, px = slot * 42 - off3 + v.rand(k + 40) * 26, py = gy + 8 + v.rand(k + 70) * 18;
      if (k === 7) { // a fossil bone
        ctx.strokeStyle = '#f0e2c0'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px - 5, py); ctx.lineTo(px + 5, py - 1.5); ctx.stroke(); ctx.lineCap = 'butt';
        ctx.fillStyle = '#f0e2c0'; for (const [dx, dy] of [[-5.5, -1], [-5.5, 1.2], [5.5, -2.6], [5.5, -0.4]]) { v.circle(px + dx, py + dy, 1.6); ctx.fill(); }
      } else { ctx.fillStyle = v.rand(k + 90) < 0.5 ? 'rgba(80,50,30,0.35)' : 'rgba(255,230,190,0.28)'; ctx.beginPath(); ctx.ellipse(px, py, 2.5 + v.rand(k + 110) * 2.5, 1.5 + v.rand(k + 130), 0, 0, pw14rTAU); ctx.fill(); }
    }
    ctx.fillStyle = K.grassDk; ctx.fillRect(0, gy - 1, v.W, 5);
    ctx.fillStyle = K.grass; ctx.fillRect(0, gy - 2, v.W, 4);
    ctx.fillStyle = K.grassHi; ctx.fillRect(0, gy - 2, v.W, 1.2);
    ctx.fillStyle = K.grass;
    for (let i = 0; i < 13; i++) {
      const slot = Math.floor(off3 / 28) + i, k = slot % 30, tx = slot * 28 - off3 + v.rand(k + 160) * 10;
      ctx.beginPath(); ctx.moveTo(tx - 3, gy - 1); ctx.lineTo(tx - 1, gy - 5 - v.rand(k + 190) * 2); ctx.lineTo(tx, gy - 1); ctx.lineTo(tx + 2, gy - 6); ctx.lineTo(tx + 3, gy - 1); ctx.fill();
    }
  };
  // a mossy log with a red mushroom on top (feet at gy, left end at x)
  const pw14rLog = (v, x, gy) => {
    const ctx = v.ctx, w = 30, h = 15;
    ctx.fillStyle = 'rgba(28,26,54,0.2)'; ctx.beginPath(); ctx.ellipse(x + w / 2, gy, w * 0.6, 2.5, 0, 0, pw14rTAU); ctx.fill();
    ctx.fillStyle = '#7a4a26'; v.rr(x, gy - h, w, h, 6); ctx.fill();
    ctx.fillStyle = '#9a6232'; v.rr(x + 1.5, gy - h + 1.5, w - 3, h - 5, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(60,34,16,0.45)'; ctx.lineWidth = 1; for (const yy of [-10, -6]) { ctx.beginPath(); ctx.moveTo(x + 4, gy + yy); ctx.lineTo(x + w - 8, gy + yy + 0.6); ctx.stroke(); }
    ctx.fillStyle = '#e0b07a'; ctx.beginPath(); ctx.ellipse(x + w - 3, gy - h / 2, 4, h / 2 - 0.5, 0, 0, pw14rTAU); ctx.fill();
    ctx.strokeStyle = '#b07a44'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(x + w - 3, gy - h / 2, 2, h / 4, 0, 0, pw14rTAU); ctx.stroke();
    const mx = x + 11;
    ctx.fillStyle = '#fff2d6'; ctx.fillRect(mx - 1, gy - h - 4.5, 2, 4.5);
    ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.ellipse(mx, gy - h - 4.5, 4.5, 3.4, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#fff'; v.circle(mx - 1.6, gy - h - 6, 0.8); ctx.fill(); v.circle(mx + 1.6, gy - h - 5.7, 0.7); ctx.fill();
  };
  // a low leafy branch bending down from the canopy (its underside at bot), drawn in front of the raptors
  const pw14rBranch = (v, x, bot, t) => {
    const ctx = v.ctx, K = pw14rK, w = 34;
    ctx.strokeStyle = K.barkDk; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + w + 26, -4); ctx.quadraticCurveTo(x + w + 22, bot - 24, x + w + 6, bot - 9); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = K.leafDk; for (let k = 0; k < 3; k++) { v.circle(x + w + 14 + k * 12, 6 + (k % 2) * 6, 13); ctx.fill(); }
    ctx.fillStyle = K.leaf; for (let k = 0; k < 3; k++) { v.circle(x + w + 8 + k * 14, -2 + (k % 2) * 5, 10); ctx.fill(); }
    ctx.fillStyle = K.barkDk; v.rr(x - 8, bot - 10, w + 18, 9, 4.5); ctx.fill();
    ctx.fillStyle = K.bark; v.rr(x - 7, bot - 10, w + 15, 6, 3); ctx.fill();
    for (let k = 0; k < 4; k++) { const lx = x + 2 + k * (w - 4) / 3, sw = Math.sin(t * pw14rTAU + k) * 0.15; ctx.fillStyle = k % 2 ? K.leaf : K.leafHi; ctx.beginPath(); ctx.ellipse(lx, bot - 2 + (k % 2), 6, 3.6, 0.3 + sw, 0, pw14rTAU); ctx.fill(); }
  };
  // a word that pops up and floats away over k = 0..1
  const pw14rWord = (v, str, x, y, k, col, size = 12) => {
    if (k <= 0 || k >= 1) return;
    const ctx = v.ctx, pop = k < 0.15 ? v.ease.back(k / 0.15) : 1;
    ctx.save(); ctx.globalAlpha *= k > 0.7 ? (1 - k) / 0.3 : 1;
    ctx.translate(x, y - k * 8); ctx.scale(pop, pop); v.label(str, 0, 0, size, col); ctx.restore();
  };
  definePreview('Raptor Race', {
    blurb: 'Ride racing raptors! Hop logs, duck branches, grab a speed egg and DASH past.',
    loop: pw14rL,
    still: 2.62,
    draw(v, t) {
      const ctx = v.ctx, gy = pw14rGy, Sp = pw14rSp, L = pw14rL, Hf = pw14rHalf, F = pw14rFront, Bk = pw14rBack;
      pw14rScene(v, t);
      const half = t < Hf ? 0 : 1, u = t - half * Hf, chaser = half ? 1 : 0;
      // where a thing that reaches the leader at time tp is now (wrapped, so things from the other half show up in time)
      const at = tp => { let d = tp - t; d = ((d + L / 2) % L + L) % L - L / 2; return F + Sp * d; };
      const logTp = 0.55, eggTp = 1.5, grabU = eggTp + pw14rLag, dash0 = 2.45, dash1 = 3.45;
      // the log (first half) and the branch (second half)
      pw14rLog(v, at(logTp) - 15, gy);
      // the floating speed eggs, one per half (glowing; gone once the chaser grabs it)
      for (const h of [0, 1]) {
        if (half === h && u >= grabU) continue;
        const ex = at(h * Hf + eggTp), ey = gy - 64 + Math.sin(t * pw14rTAU) * 3;
        if (ex < -20 || ex > v.W + 20) continue;
        ctx.fillStyle = 'rgba(255,215,90,' + (0.3 + 0.1 * Math.sin(t * pw14rTAU * 2)) + ')'; v.circle(ex, ey, 13); ctx.fill();
        pw14rEgg(v, ex, ey, 0.62);
        v.sparkle(ex + 8, ey - 8, v.phase(t, 0.875), '#fff6c8', 4);
      }
      // the two racers
      const words = [];
      const rider = id => {
        const isC = id === chaser, near = id ? 3 : -3, ph = t * 44 * Math.PI / L + id * 1.3;
        let x, y = gy + near, air = false, duck = 0, dash = 0, mood = 'happy', egg = false, extra = 0;
        const myTp = p => (isC ? p + pw14rLag : p);
        if (isC) {
          const k = v.ease.inOut(v.seg(u, dash0, dash1));
          x = v.lerp(Bk, F, k); extra = 4 * Math.PI * k;
          dash = Math.min(v.seg(u, dash0 - 0.05, dash0 + 0.1), 1 - v.seg(u, dash1 - 0.25, Hf));
          // hop up for the egg
          const gk = v.seg(u, grabU - 0.3, grabU + 0.3);
          if (gk > 0 && gk < 1) { y += v.hop(gk, 32); air = true; mood = 'wow'; }
          egg = u >= grabU && u < dash0;
          if (u >= grabU - 0.02 && u < grabU + 0.6) words.push(['Got it!', x + 2, gy - 96, v.seg(u, grabU - 0.02, grabU + 0.6), '#fff6c8']);
          if (u >= dash0) { words.push(['DASH!', x + 14, gy - 66, v.seg(u, dash0, dash0 + 0.85), v.c.gold, 15]); v.sparkle(x + 18, gy - 60, v.seg(u, dash0 - 0.05, dash0 + 0.3), '#fff6c8', 9); }
        } else {
          x = v.lerp(F, Bk, v.ease.inOut(v.seg(u, dash0 + 0.05, dash1 + 0.05)));
          if (u > dash0 + 0.15 && u < dash1 - 0.1) mood = 'wow';
        }
        // the log to hop (first half) or the branch to duck (second half)
        const pass = myTp(logTp);
        if (!half) {
          const hk = v.seg(u, pass - 0.27, pass + 0.27);
          if (hk > 0 && hk < 1) { y += v.hop(hk, 24); air = true; }
          if (u > pass - 0.15 && u < pass + 0.6) words.push(['Hop!', x + 4, gy - 72, v.seg(u, pass - 0.15, pass + 0.6), '#ffffff']);
        } else {
          duck = Math.min(v.seg(u, pass - 0.42, pass - 0.24), 1 - v.seg(u, pass + 0.2, pass + 0.38));
          if (u > pass - 0.3 && u < pass + 0.45) words.push(['Duck!', x + 4, gy - 72, v.seg(u, pass - 0.3, pass + 0.45), '#ffffff']);
        }
        pw14rRider(v, id, x, y, { ph: ph + extra, air, duck, dash, mood, egg, gy: gy + near });
      };
      rider(1 - chaser); rider(chaser); // the raptor behind (the one that dashes) is drawn on top
      pw14rBranch(v, at(Hf + logTp) - 17, gy - 43, t);
      for (const w of words) pw14rWord(v, w[0], w[1], w[2], w[3], w[4], w[5]);
      // a little face-off pill
      ctx.font = '700 10px "Atkinson Hyperlegible", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(28,26,54,0.78)'; v.rr(v.W / 2 - 38, 6, 76, 17, 8.5); ctx.fill();
      v.text('Pip', v.W / 2 - 20, 15, 10, v.c.pip, 'center', true); v.text('vs', v.W / 2, 15, 10, '#fff', 'center', true); v.text('Bo', v.W / 2 + 20, 15, 10, v.c.bo, 'center', true);
    },
  });
  // ----- END 14-4 Raptor Race preview -----
}
