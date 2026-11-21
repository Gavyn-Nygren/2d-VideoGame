/* Pip & Bo - preview for 43-4 Laser Tag Arena (world page card). Loaded after every level file, so it also keeps
   Laser Tag the world's last level whatever order the World 43 levels' script blocks load in. */
'use strict';

// 43-4 is the world's final level: move it after the other World 43 levels (level codes follow LEVELS order)
(function () {
  const i = LEVELS.findIndex(l => l.mode === 'arcadelaser');
  if (i < 0) return;
  let last = -1; LEVELS.forEach((l, j) => { if (l.world === LEVELS[i].world) last = j; });
  if (last > i) { const d = LEVELS.splice(i, 1)[0]; LEVELS.splice(last, 0, d); }
})();

/* 43-4 Laser Tag Arena, the arena seen from high at the front like the game. A 6 s loop:
     0.0 - 1.2  Pip (bottom left) and Bo (bottom right) strafe either side of a glowing pillar, the crowd bobbing in the
                gallery, lamps sweeping, the mirror ball throwing dots
     1.2 - 2.2  Pip holds fire: the dotted aiming line runs up to the mirror and bounces down to Bo
     2.2 - 2.7  the orange beam goes; Bo jumps it (DODGE!)
     3.1 - 3.6  Bo fires straight back: the blue beam splashes on the pillar Pip hides behind
     4.0 - 4.9  Pip banks it again while Bo is on the ground: TAG! Bo's vest flashes and sparks, Pip's score ticks
     4.9 - 6.0  Bo spins (safe for a moment), Pip cheers
   Still at 2.45 (the beam off the mirror, Bo in the air). A pure function of t. Every helper starts with pw43l. */
const PW43L = { floor: '#15111f', floor2: '#1c1729', pink: '#ff5ad6', cyan: '#4ae8ff', green: '#5aff8a', yellow: '#ffe24a', orange: '#ff9a3a', blue: '#4aa8ff', ink: '#120e18' };
// the floor: the far edge (y 66) narrower than the near edge (y 176)
const pw43lX = (u, y) => { const k = (y - 66) / 110; return 160 + (u - 0.5) * (230 + k * 110); };
const PW43L_MIR = [164, 86], PW43L_PIP = [70, 158], PW43L_BO = [252, 158];
function pw43lHall(v, t) {
  const c = v.ctx;
  c.fillStyle = '#0b0912'; c.fillRect(0, 0, v.W, 70);
  // the gallery: glass panes full of pixel creatures, a bulb trim, the ZAP MAZE sign
  c.fillStyle = '#1a1424'; c.fillRect(0, 26, v.W, 38);
  for (let p = 0; p < 7; p++) {
    const x0 = 6 + p * 45;
    c.fillStyle = '#231b30'; c.fillRect(x0, 30, 40, 30);
    for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) {
      const n = p * 20 + r * 7 + k, col = ['#5aff8a', '#ff5ad6', '#4ae8ff', '#ffe24a', '#b48aff', '#7affd8'][n % 6];
      const bob = Math.abs(Math.sin(t * 5 + n)) * 2, x = x0 + 3 + k * 6.3, y = 45 + r * 8 - bob;
      c.fillStyle = col; c.fillRect(x, y, 5, 5);
      c.fillStyle = '#fff'; c.fillRect(x + 1, y + 1, 1.4, 1.4); c.fillRect(x + 3, y + 1, 1.4, 1.4);
      if ((n + Math.floor(t * 2)) % 9 === 0) { c.fillStyle = col; c.fillRect(x + 4.5, y - 3, 1.2, 3); }
    }
    c.fillStyle = 'rgba(160,200,255,0.08)'; c.fillRect(x0, 30, 40, 12);
  }
  for (let k = 0; k < 40; k++) { c.fillStyle = (k + Math.floor(t * 6)) % 4 ? '#ffd86a' : '#fff6d0'; v.circle(4 + k * 8.1, 27, 0.9); c.fill(); }
  c.fillStyle = PW43L.pink; c.fillRect(0, 63, v.W, 1.5);
  c.save(); c.shadowColor = PW43L.cyan; c.shadowBlur = 6; c.strokeStyle = PW43L.cyan; c.lineWidth = 1.2; v.rr(126, 9, 68, 14, 2); c.stroke();
  v.text('ZAP MAZE', 160, 16.5, 9, '#ffd0f4', 'center'); c.restore();
  // the scoreboard bulbs: Pip's tags on the left, Bo's on the right
  const tagged = t > 4.85 ? 1 : 0;
  for (let k = 0; k < 5; k++) { c.fillStyle = k < 3 + tagged ? PW43L.orange : '#3a2a2a'; v.circle(96 + k * 5, 16, 1.6); c.fill(); c.fillStyle = k < 2 ? PW43L.blue : '#22283a'; v.circle(204 + k * 5, 16, 1.6); c.fill(); }
}
function pw43lFloor(v, t) {
  const c = v.ctx;
  c.fillStyle = PW43L.floor; c.beginPath(); c.moveTo(pw43lX(0, 66), 66); c.lineTo(pw43lX(1, 66), 66); c.lineTo(pw43lX(1, 176), 176); c.lineTo(pw43lX(0, 176), 176); c.closePath(); c.fill();
  // glow-paint confetti on the floor
  for (let i = 0; i < 90; i++) { const y = 68 + v.rand(i + 3) * 106, x = pw43lX(v.rand(i + 40), y); c.fillStyle = ['#ff5ad6', '#4ae8ff', '#5aff8a', '#ffe24a'][i % 4]; c.globalAlpha = 0.35 + 0.25 * Math.sin(t * 2 + i); c.fillRect(x, y, 1.6, 0.9); }
  c.globalAlpha = 1;
  // the lane line and its chevrons, the neon border
  c.strokeStyle = 'rgba(90,255,138,0.6)'; c.setLineDash([6, 5]); c.lineWidth = 1; c.beginPath(); c.moveTo(pw43lX(0.02, 118), 118); c.lineTo(pw43lX(0.98, 118), 118); c.stroke(); c.setLineDash([]);
  for (const [u, d] of [[0.3, 1], [0.36, 1], [0.64, -1], [0.7, -1]]) { const x = pw43lX(u, 118); c.strokeStyle = PW43L.green; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - 3 * d, 114); c.lineTo(x + 2 * d, 118); c.lineTo(x - 3 * d, 122); c.stroke(); }
  c.save(); c.shadowColor = PW43L.pink; c.shadowBlur = 8; c.strokeStyle = PW43L.pink; c.lineWidth = 2;
  c.beginPath(); c.moveTo(pw43lX(0, 176), 176); c.lineTo(pw43lX(0, 66), 66); c.lineTo(pw43lX(1, 66), 66); c.lineTo(pw43lX(1, 176), 176); c.stroke(); c.restore();
  // the bases: PIP START and BO START pads
  for (const [x, col, s] of [[pw43lX(0.06, 166), PW43L.orange, 'PIP'], [pw43lX(0.94, 166), PW43L.blue, 'BO']]) { c.strokeStyle = col; c.lineWidth = 1; v.rr(x - 14, 160, 28, 10, 2); c.stroke(); v.text(s, x, 165.5, 5.5, col, 'center'); }
}
// a round pillar with pink neon rings (feet at x, y)
function pw43lPillar(v, x, y, h, t, splash) {
  const c = v.ctx, w = 18;
  c.fillStyle = '#231c30'; c.fillRect(x - w, y - h, w * 2, h);
  c.fillStyle = '#2e2540'; c.beginPath(); c.ellipse(x, y - h, w, 5, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#1a1424'; c.beginPath(); c.ellipse(x, y, w, 4, 0, 0, Math.PI); c.fill();
  c.save(); c.shadowColor = PW43L.pink; c.shadowBlur = 6; c.strokeStyle = PW43L.pink; c.lineWidth = 1.6;
  for (const k of [0.25, 0.7]) { c.beginPath(); c.ellipse(x, y - h * k, w, 4, 0, 0, Math.PI); c.stroke(); }
  c.restore();
  c.fillStyle = '#fff6d0'; v.circle(x, y - h - 1, 2.2); c.fill();
  if (splash > 0 && splash < 1) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(74,168,255,${1 - splash})`; v.circle(x + w - 2, y - 18, 3 + splash * 8); c.fill(); for (let i = 0; i < 6; i++) { const a = i * 1.05; c.fillStyle = `rgba(200,230,255,${1 - splash})`; v.circle(x + w + Math.cos(a) * splash * 12, y - 18 + Math.sin(a) * splash * 10, 1); c.fill(); } c.restore(); }
}
// cargo crates (made-up planet freight), two stacked, feet at x, y
function pw43lCrates(v, x, y) {
  const c = v.ctx;
  for (const [dx, dy, w, h] of [[-12, 0, 20, 15], [3, 0, 16, 13], [-6, -15, 16, 13]]) {
    c.fillStyle = '#5a3a2a'; c.fillRect(x + dx, y + dy - h, w, h); c.fillStyle = '#6e4a34'; c.fillRect(x + dx, y + dy - h, w, 3);
    c.strokeStyle = '#2a1a14'; c.lineWidth = 0.8; c.strokeRect(x + dx, y + dy - h, w, h); c.beginPath(); c.moveTo(x + dx, y + dy - h); c.lineTo(x + dx + w, y + dy); c.stroke();
  }
  v.text('PLANET', x - 2, y - 6, 3.6, '#e8c88a', 'center');
}
// a low row of sandbags (a cover you can jump)
function pw43lBags(v, x, y) {
  const c = v.ctx;
  for (let r = 0; r < 2; r++) for (let k = 0; k < 4 - r; k++) { c.fillStyle = (k + r) % 2 ? '#9a7a52' : '#8a6a46'; c.beginPath(); c.ellipse(x - 12 + k * 8 + r * 4, y - 3 - r * 5, 4.6, 3, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#3a2a1a'; c.lineWidth = 0.6; c.stroke(); }
}
// the mirror: a tall panel standing on the far side of the floor, its face toward the near edge
function pw43lMirror(v, t, flash) {
  const c = v.ctx, [x, y] = PW43L_MIR;
  const W = 22, H = 30;
  c.fillStyle = '#2a2236'; v.rr(x - W - 3, y - 3, W * 2 + 6, 5, 2); c.fill();
  c.fillStyle = '#3a3048'; c.fillRect(x - W - 3, y - H - 3, 3, H + 2); c.fillRect(x + W, y - H - 3, 3, H + 2);
  const g = c.createLinearGradient(x - W, y - H, x + W, y);
  g.addColorStop(0, '#7ac8e8'); g.addColorStop(0.45, '#e8fbff'); g.addColorStop(0.55, '#c8f0ff'); g.addColorStop(1, '#5aa0d0');
  c.fillStyle = g; c.fillRect(x - W, y - H, W * 2, H - 2);
  // the hall reflected faintly in it
  c.fillStyle = 'rgba(255,90,214,0.35)'; c.fillRect(x - W, y - 9, W * 2, 1.5); for (let k = 0; k < 6; k++) { c.fillStyle = ['#5aff8a', '#ff5ad6', '#ffe24a'][k % 3]; c.globalAlpha = 0.35; c.fillRect(x - W + 4 + k * 7, y - H + 6, 4, 4); } c.globalAlpha = 1;
  c.save(); c.shadowColor = PW43L.cyan; c.shadowBlur = 5; c.strokeStyle = PW43L.cyan; c.lineWidth = 1.4; c.strokeRect(x - W, y - H, W * 2, H - 2); c.restore();
  const sh = (t * 0.6) % 1; c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.moveTo(x - W + sh * W * 2, y - H); c.lineTo(x - W + 8 + sh * W * 2, y - H); c.lineTo(x - W + sh * W * 2, y - 2); c.closePath(); c.fill();
  if (flash > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(255,200,140,${flash})`; v.circle(x, y - 14, 4 + flash * 6); c.fill(); c.restore(); }
}
// the lamps sweeping beams through the haze, the mirror ball and its dots
function pw43lLights(v, t) {
  const c = v.ctx;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const [x, col, ph] of [[30, 'rgba(90,255,138,0.10)', 0], [290, 'rgba(255,226,74,0.10)', 2], [110, 'rgba(74,232,255,0.08)', 4]]) {
    const a = Math.sin(t * 0.9 + ph) * 0.45, ex = x + Math.sin(a) * 170, ey = 4 + Math.cos(a) * 170;
    const nx = Math.cos(a) * 24, ny = -Math.sin(a) * 24;
    c.fillStyle = col; c.beginPath(); c.moveTo(x, 0); c.lineTo(ex + nx, ey + ny); c.lineTo(ex - nx, ey - ny); c.closePath(); c.fill();
  }
  for (let i = 0; i < 26; i++) { const a = i * 2.4 + t * 0.3, r = 30 + (i * 37) % 120; const x = 160 + Math.cos(a) * r * 1.3, y = 60 + Math.abs(Math.sin(a)) * r * 0.8; c.fillStyle = 'rgba(255,255,255,0.45)'; v.circle(x, y, 1); c.fill(); }
  c.restore();
  c.strokeStyle = '#6a6672'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(160, 0); c.lineTo(160, 1); c.stroke();
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2 + t * 0.5; c.fillStyle = Math.cos(a) > 0 ? '#e8e8f0' : '#8a8a96'; c.fillRect(160 + Math.sin(a) * 4 - 1, 3 + (k % 4) * 2, 2, 2); }
}
// a beam along points pts, drawn up to distance d (and its tail fading behind)
function pw43lBeam(v, pts, d, col, tail = 70) {
  const c = v.ctx; let walked = 0;
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay);
    const s0 = Math.max(0, d - tail - walked), s1 = Math.min(L, d - walked);
    if (s1 > s0) {
      const p0 = [ax + (bx - ax) * s0 / L, ay + (by - ay) * s0 / L], p1 = [ax + (bx - ax) * s1 / L, ay + (by - ay) * s1 / L];
      for (const [w, a] of [[6, 0.25], [3, 0.6], [1.2, 1]]) { c.strokeStyle = a === 1 ? '#fffaf0' : col; c.globalAlpha = a; c.lineWidth = w; c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke(); }
    }
    walked += L;
  }
  c.restore();
}
function pw43lAim(v, pts, k, col) {
  const c = v.ctx; let left = k * 400;
  c.save(); c.fillStyle = col;
  for (let i = 0; i + 1 < pts.length && left > 0; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay);
    for (let s = 6; s < Math.min(L, left); s += 5) { v.circle(ax + (bx - ax) * s / L, ay + (by - ay) * s / L, 0.9); c.fill(); }
    left -= L;
  }
  c.restore();
}
function pw43lBlaster(v, x, y, face, col) {
  const c = v.ctx; c.save(); c.translate(x, y); c.scale(face, 1);
  c.fillStyle = '#2a2632'; v.rr(0, -2, 9, 3.4, 1); c.fill(); c.fillStyle = col; c.fillRect(7, -1.4, 3, 2.2); c.fillStyle = '#16121a'; c.fillRect(2, 1, 2, 3);
  c.restore();
}
definePreview('Laser Tag Arena', {
  blurb: 'Tag the other vest five times a round. Bounce your beam off the mirrors and jump theirs.',
  loop: 6, still: 2.45,
  draw(v, t) {
    const c = v.ctx;
    pw43lHall(v, t);
    pw43lFloor(v, t);
    pw43lLights(v, t);
    // where they are: a little strafe each, Bo's jump, Pip ducking behind the pillar for Bo's shot
    const pip = [PW43L_PIP[0] + Math.sin(t * 2.2) * 4 * (t < 1.2 ? 1 : 0.2), PW43L_PIP[1] + (t > 2.9 && t < 3.8 ? Math.sin(v.seg(t, 2.9, 3.8) * Math.PI) * 4 : 0)];
    const boHop = t > 2.25 && t < 2.85 ? v.hop(v.seg(t, 2.25, 2.85), 24) : 0;
    const spin = t > 4.85 && t < 5.7;
    const bo = [PW43L_BO[0] + Math.sin(t * 2.6 + 1) * 4 * (t < 1.2 ? 1 : 0.2), PW43L_BO[1]];
    const bank = [[pip[0] + 13, pip[1] - 14], [PW43L_MIR[0], PW43L_MIR[1] - 14], [bo[0], bo[1] - 14]];
    const flash = Math.max(t > 2.35 && t < 2.7 ? 1 - v.seg(t, 2.35, 2.7) : 0, t > 4.6 && t < 4.95 ? 1 - v.seg(t, 4.6, 4.95) : 0);
    pw43lMirror(v, t, flash);
    // the aiming lines: Pip holds fire, the dotted line runs to the mirror and down to Bo
    if (t > 1.2 && t < 2.2) pw43lAim(v, bank, v.seg(t, 1.2, 1.9), PW43L.orange);
    if (t > 4.0 && t < 4.5) pw43lAim(v, bank, v.seg(t, 4.0, 4.35), PW43L.orange);
    // the shots: the bank Bo jumps, Bo's straight shot into the pillar, the bank that tags
    const pillar = [163, 162];
    const pillarSplash = t > 3.35 ? v.seg(t, 3.35, 3.9) : 0;
    const order = [];
    order.push(() => { pw43lCrates(v, 104, 100); pw43lCrates(v, 226, 100); pw43lBags(v, 108, 132); pw43lBags(v, 220, 132); });
    order.push(() => pw43lPillar(v, pillar[0], pillar[1], 50, t, pillarSplash));
    order.push(() => {
      if (t > 2.2 && t < 2.9) pw43lBeam(v, bank.concat([[bo[0] + 40, bo[1] + 20]]), (t - 2.2) * 620, PW43L.orange);
      if (t > 4.5 && t < 5.0) pw43lBeam(v, bank, Math.min(250, (t - 4.5) * 620), PW43L.orange);
      if (t > 3.1 && t < 3.6) pw43lBeam(v, [[bo[0] - 13, bo[1] - 14], [pillar[0] + 18, bo[1] - 14]], (t - 3.1) * 620, PW43L.blue, 60);
    });
    order.forEach(f => f());
    // Pip and Bo in their tag vests with their blasters
    const pipMood = t > 4.9 ? 'joy' : t > 1.2 && t < 2.3 ? 'grit' : t > 3.1 && t < 3.7 ? 'wow' : 'happy';
    v.hero(0, pip[0], pip[1], { s: 1.6, face: 1, mood: pipMood, sq: t > 4.95 && t < 5.3 ? -0.2 : 0 });
    pw43lBlaster(v, pip[0] + 9, pip[1] - 14, 1, PW43L.orange);
    v.shadow(bo[0], bo[1], 22 - Math.min(10, -boHop * 0.4));
    v.hero(1, bo[0], bo[1] + boHop, { s: 1.6, face: spin ? (Math.floor(t * 10) % 2 ? 1 : -1) : -1, mood: spin ? 'dizzy' : t > 2.2 && t < 2.9 ? 'wow' : t > 3.0 && t < 3.6 ? 'grit' : 'happy', shadow: false, alpha: spin ? 0.6 + 0.4 * Math.abs(Math.sin(t * 18)) : 1 });
    if (!spin) pw43lBlaster(v, bo[0] - 9, bo[1] - 14 + boHop, -1, PW43L.blue);
    // the tag: Bo's vest lights up and throws sparks
    if (t > 4.85 && t < 5.6) {
      const k = v.seg(t, 4.85, 5.6);
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(255,154,58,${1 - k})`; v.circle(bo[0], bo[1] - 16, 12 + k * 14); c.fill(); c.restore();
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; c.fillStyle = i % 2 ? PW43L.yellow : PW43L.orange; v.circle(bo[0] + Math.cos(a) * k * 30, bo[1] - 16 + Math.sin(a) * k * 22 + k * k * 8, 1.4 * (1 - k) + 0.3); c.fill(); }
      v.label('TAG!', bo[0], bo[1] - 58 - k * 6, 15, PW43L.orange);
    }
    if (t > 2.4 && t < 3.0) v.label('Dodge!', bo[0], bo[1] - 66, 11, PW43L.blue);
    if (t > 4.6 && t < 5.4) v.label('Bank shot!', 160, 58, 10, PW43L.yellow);
    // score pills
    v.pill('Pip ' + (t > 4.85 ? 4 : 3), 6, 9, { size: 8, bg: 'rgba(20,16,30,0.8)', col: PW43L.orange, align: 'left' });
    v.pill('Bo 2', 314, 9, { size: 8, bg: 'rgba(20,16,30,0.8)', col: PW43L.blue, align: 'right' });
  },
});
