/* Pip & Bo - World 28 Pyramid Sands: a small kit the four World 28 levels share (loads before them). */
'use strict';

/* Every top-level name here starts with pyr / PYR (Sfx.extra.pyr* too). Nothing here keeps level state: each level
   keeps its own in G.mst and passes it in as `st`.
   - Moving in WORLD coordinates over a list of solid boxes (like 19-1 Train Heist Hop): a solid is
     { x0, y0, x1, y1, off } (off: true = not solid right now, e.g. an open door). pyrRun() moves one player with the
     engine's own control() (same jump, same feel as every other level) and returns what happened.
   - pyrInWorld(st, fn): during a level's tick the players are in world coordinates (p.x + st.camX); outside it p.x is
     on screen, so the engine draws Pip and Bo, their name tags and the computer's bubbles in the right place.
   - Effects (looks only, never rules): st.fx dust / debris / sparks / embers in world coordinates, st.pops floating
     words, pyrShake() a screen shake that respects reduced motion.
   - Drawing helpers: sandstone blocks, hieroglyphs, torches, levers, a darkness layer with holes of light.
   - Sounds: a soft noise rumble (made once, then reused), crashes, stone scrapes, clicks. */

let pyrVS = 20261128;
const pyrVR = () => { pyrVS = (Math.imul(pyrVS, 1664525) + 1013904223) >>> 0; return pyrVS / 4294967296; };
const pyrSolo = () => typeof cpuSolo === 'function' && cpuSolo();
const pyrCpu = id => pyrSolo() && cpuOn(id);
const pyrBig = () => typeof hudBig === 'function' && hudBig();
const pyrLerp = (a, b, u) => a + (b - a) * u;
const pyrEase = u => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

/* ---------- moving over solid boxes (world coordinates) ---------- */
const pyrOver = (p, s) => !s.off && p.x < s.x1 - 0.01 && p.x + p.w > s.x0 + 0.01 && p.y < s.y1 - 0.01 && p.y + p.h > s.y0 + 0.01;
function pyrMoveX(sol, p, dx) {
  if (!dx) return 0;
  const x0 = p.x;
  p.x += dx;
  for (const s of sol) if (pyrOver(p, s)) { if (dx > 0) p.x = Math.min(p.x, s.x0 - p.w); else p.x = Math.max(p.x, s.x1); p.vx = 0; }
  return p.x - x0;
}
function pyrMoveY(sol, p, dy) {
  if (!dy) return 0;
  const y0 = p.y;
  p.y += dy;
  for (const s of sol) if (pyrOver(p, s)) {
    if (dy > 0) { p.y = Math.min(p.y, s.y0 - p.h); p.vy = 0; }
    else { p.y = Math.max(p.y, s.y1); p.vy = Math.max(0, p.vy); p.jumping = false; }
  }
  return p.y - y0;
}
function pyrGroundOf(sol, p) {
  const by = p.y + p.h;
  for (const s of sol) if (!s.off && Math.abs(by - s.y0) < 1 && p.x < s.x1 - 0.01 && p.x + p.w > s.x0 + 0.01) return s;
  return null;
}
// one player's movement for one tick. opt: { freeze } (no input). Returns { ground, landed, landVy }.
function pyrRun(sol, p, dt, opt = {}) {
  const real = p.input;
  if (opt.freeze) { p.input = NO_INPUT; p.pendingJump = false; p.jumpBuf = 0; }
  const was = p.grounded;
  try { control(p, dt); } finally { p.input = real; }
  pyrMoveX(sol, p, p.vx * dt);
  const vy = p.vy;
  pyrMoveY(sol, p, p.vy * dt);
  const g = pyrGroundOf(sol, p);
  p.grounded = !!g; p.tileGround = !!g; p.onPartner = false; p.onOneWay = false;
  const landed = p.grounded && !was;
  if (landed && vy > 260) { p.sx = 1.25; p.sy = 0.78; Sfx.play('land'); }
  p.lastVy = p.grounded ? 0 : p.vy;
  return { ground: g, landed, landVy: vy };
}
// run fn with the players (and any particles made meanwhile) in world coordinates
function pyrInWorld(st, fn) {
  const ps = G.players, cx = st.camX || 0, cy = st.camY || 0;
  for (const p of ps) { p.x += cx; p.y += cy; }
  const n0 = G.particles.length;
  try { fn(); } finally {
    for (const p of ps) { p.x -= st.camX || 0; p.y -= st.camY || 0; }
    for (let i = n0; i < G.particles.length; i++) { G.particles[i].x -= st.camX || 0; G.particles[i].y -= st.camY || 0; }
  }
}

/* ---------- effects (looks only) ---------- */
function pyrFxNew(st) { st.fx = []; st.pops = []; }
// kind: 'dust' (grows and fades), 'rock' (tumbling chip, bounces on floorY), 'spark', 'ember' (rises), 'sand' (falls)
function pyrFx(st, x, y, vx, vy, life, col, size, grav, kind, floorY) {
  if (!st.fx) st.fx = [];
  st.fx.push({ x, y, vx, vy, life, max: life, col, size, grav: grav || 0, kind: kind || 'dust', rot: pyrVR() * 6.28, vr: (pyrVR() - 0.5) * 10, floor: floorY == null ? 1e9 : floorY });
  if (st.fx.length > 520) st.fx.splice(0, st.fx.length - 520);
}
function pyrDust(st, x, y, n, spread, col) {
  for (let i = 0; i < n; i++) pyrFx(st, x + (pyrVR() - 0.5) * spread, y - pyrVR() * 10, (pyrVR() - 0.5) * 120, -20 - pyrVR() * 60, 0.9 + pyrVR() * 0.9,
    col || (i % 3 ? 'rgba(222,196,150,0.55)' : 'rgba(190,160,112,0.5)'), 8 + pyrVR() * 12, -10, 'dust');
}
function pyrChips(st, x, y, n, floorY, col) {
  for (let i = 0; i < n; i++) pyrFx(st, x + (pyrVR() - 0.5) * 20, y, (pyrVR() - 0.5) * 320, -120 - pyrVR() * 260, 1.1 + pyrVR() * 0.6,
    col || ['#c99a5c', '#a87a44', '#e0b878'][i % 3], 2.5 + pyrVR() * 4, 1400, 'rock', floorY);
}
function pyrPop(st, text, x, y, col, size) {
  if (!st.pops) st.pops = [];
  st.pops.push({ text, x, y, col: col || '#ffffff', size: size || 18, t: 0 });
  if (st.pops.length > 12) st.pops.shift();
}
function pyrFxTick(st, dt) {
  const a = st.fx || [];
  let n = 0;
  for (const f of a) {
    f.life -= dt;
    if (f.kind === 'dust') { f.vx *= Math.exp(-2 * dt); f.vy *= Math.exp(-1.5 * dt); f.size += dt * 14; }
    f.vy += f.grav * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
    if (f.kind === 'rock' && f.y > f.floor) { f.y = f.floor; f.vy *= -0.35; f.vx *= 0.6; f.vr *= 0.5; }
    if (f.life > 0) a[n++] = f;
  }
  a.length = n;
  for (const p of st.pops || []) p.t += dt;
  if (st.pops) st.pops = st.pops.filter(p => p.t < 1.3);
}
function pyrFxDraw(st, front) {
  for (const f of st.fx || []) {
    if (!!front !== (f.kind === 'spark' || f.kind === 'ember' || f.kind === 'rock')) continue;
    const k = clamp(f.life / f.max, 0, 1);
    ctx.globalAlpha = f.kind === 'dust' ? k * 0.9 : Math.min(1, k * 2);
    ctx.fillStyle = f.col;
    if (f.kind === 'rock') { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.fillRect(-f.size / 2, -f.size / 2, f.size, f.size * 0.8); ctx.restore(); }
    else if (f.kind === 'spark' || f.kind === 'ember') { circle(f.x, f.y, f.size * (0.4 + 0.6 * k)); ctx.fill(); }
    else { circle(f.x, f.y, f.size); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}
function pyrPopsDraw(st) {
  for (const p of st.pops || []) {
    const u = p.t / 1.3, a = u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25, s = p.t < 0.12 ? 0.6 + p.t / 0.3 : 1;
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
    bigText(p.text, p.x, p.y - p.t * 34, (pyrBig() ? 1.3 : 1) * p.size, p.col, s);
    ctx.restore();
  }
}
function pyrShake(amt) { if (!reduceMotion) G.shake = Math.max(G.shake, amt); }

/* ---------- drawing helpers ---------- */
const PYR_SAND = { lite: '#e9c98e', mid: '#d4a865', dark: '#a8783e', deep: '#6e4a26', ink: '#3a2614' };
// a sandstone block wall (x, y, w, h), rows of blocks with a slight per-block tone; seed keeps it steady
function pyrBlocks(x, y, w, h, tone, bw = 60, bh = 30, seed = 0) {
  const t = tone || PYR_SAND;
  ctx.fillStyle = t.mid; ctx.fillRect(x, y, w, h);
  const r0 = Math.floor(y / bh), r1 = Math.ceil((y + h) / bh);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const specks = [];
  for (let r = r0; r < r1; r++) {
    const off = (r & 1) * bw / 2, c0 = Math.floor((x - off) / bw) - 1, c1 = Math.ceil((x + w - off) / bw);
    for (let c = c0; c <= c1; c++) {
      const bx = c * bw + off, by = r * bh, hv = hash(c + seed, r);
      // (a plain block is the base colour already, so only the light and dark ones are filled)
      if (hv % 5 === 0 || hv % 7 === 0) { ctx.fillStyle = hv % 5 === 0 ? t.lite : t.dark; ctx.fillRect(bx + 1, by + 1, bw - 2, bh - 2); }
      ctx.fillStyle = 'rgba(255,240,200,0.18)'; ctx.fillRect(bx + 2, by + 2, bw - 4, 3);
      ctx.fillStyle = 'rgba(70,40,15,0.16)'; ctx.fillRect(bx + bw - 5, by + 4, 4, bh - 6);
      if (hv % 4 === 1) { const px = bx + 8 + (hv >> 4) % (bw - 16), py = by + 8 + (hv >> 9) % Math.max(1, bh - 16); specks.push(px, py); }
      if (hv % 11 === 0) { ctx.strokeStyle = 'rgba(60,36,16,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx + 10, by + 6); ctx.lineTo(bx + 18, by + 14); ctx.lineTo(bx + 15, by + 24); ctx.stroke(); }
    }
    ctx.fillStyle = 'rgba(70,40,15,0.13)'; ctx.fillRect(x, r * bh + bh - 5, w, 4);
  }
  // little pits in the stone, all in one path
  if (specks.length) { ctx.fillStyle = 'rgba(70,40,15,0.22)'; ctx.beginPath(); for (let k = 0; k < specks.length; k += 2) { const px = specks[k], py = specks[k + 1]; ctx.moveTo(px + 1.3, py); ctx.arc(px, py, 1.3, 0, 7); ctx.moveTo(px + 5.9, py + 3); ctx.arc(px + 5, py + 3, 0.9, 0, 7); } ctx.fill(); }
  ctx.restore();
}
// a hieroglyph (simple shapes, no writing): eye, bird, scarab, sun, snake, cat, reed, wave
function pyrGlyph(kind, x, y, s, col, lw, inner) {
  // carved look: a pale lip under-right of the cut, then the cut itself
  if (!inner && typeof artPlain === 'function' && !artPlain()) pyrGlyph(kind, x + 1.2 * s, y + 1.2 * s, s, 'rgba(255,236,190,0.32)', lw, true);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = (lw || 2.4) / s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  switch (kind) {
    case 'eye':
      ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(0, -10, 12, 0); ctx.quadraticCurveTo(0, 8, -12, 0); ctx.stroke();
      circle(0, -1, 3.6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2, 5); ctx.lineTo(-4, 12); ctx.moveTo(5, 4); ctx.quadraticCurveTo(10, 12, 4, 13); ctx.stroke();
      break;
    case 'bird':
      ctx.beginPath(); ctx.ellipse(0, 2, 8, 6, -0.2, 0, Math.PI * 2); ctx.stroke();
      circle(6, -6, 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(9, -6); ctx.lineTo(14, -4); ctx.moveTo(-7, 4); ctx.lineTo(-13, 9); ctx.moveTo(-1, 8); ctx.lineTo(-2, 13); ctx.moveTo(3, 8); ctx.lineTo(4, 13); ctx.stroke();
      break;
    case 'scarab':
      ctx.beginPath(); ctx.ellipse(0, 3, 7, 9, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 12); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -8, 4, Math.PI, 0); ctx.stroke();
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 7, 0); ctx.lineTo(sx * 12, -4); ctx.moveTo(sx * 7, 6); ctx.lineTo(sx * 12, 9); ctx.stroke(); }
      break;
    case 'sun':
      circle(0, 0, 6); ctx.fill();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 9, Math.sin(a) * 9); ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); ctx.stroke(); }
      break;
    case 'snake':
      ctx.beginPath(); ctx.moveTo(-12, 8); ctx.bezierCurveTo(-6, -4, -2, 14, 4, 2); ctx.quadraticCurveTo(7, -6, 11, -8); ctx.stroke();
      circle(11, -9, 2.6); ctx.fill();
      break;
    case 'cat':
      ctx.beginPath(); ctx.moveTo(-6, 12); ctx.quadraticCurveTo(-9, 0, -4, -4); ctx.lineTo(-5, -12); ctx.lineTo(-1, -7); ctx.lineTo(3, -12); ctx.lineTo(3, -4); ctx.quadraticCurveTo(9, 2, 7, 12); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(7, 10); ctx.quadraticCurveTo(14, 8, 12, 0); ctx.stroke();
      break;
    case 'reed':
      for (const sx of [-5, 0, 5]) { ctx.beginPath(); ctx.moveTo(sx, 12); ctx.lineTo(sx, -6); ctx.stroke(); ctx.beginPath(); ctx.ellipse(sx, -9, 2.2, 4, 0, 0, Math.PI * 2); ctx.fill(); }
      break;
    case 'wave':
      for (const yy of [-6, 0, 6]) { ctx.beginPath(); for (let i = 0; i <= 6; i++) ctx.lineTo(-12 + i * 4, yy + (i % 2 ? -3 : 3)); ctx.stroke(); }
      break;
    default:
      circle(0, 0, 6); ctx.stroke();
  }
  ctx.restore();
}
// a wall torch / handheld torch flame at (x, y) = the top of the stick
function pyrFlame(x, y, s, t, bright) {
  const f = 1 + Math.sin(t * 17) * 0.08 + Math.sin(t * 29 + 1) * 0.06;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s * f);
  const g = ctx.createRadialGradient(0, -6, 1, 0, -6, 22);
  g.addColorStop(0, bright ? 'rgba(255,240,180,0.85)' : 'rgba(255,220,140,0.55)'); g.addColorStop(1, 'rgba(255,160,60,0)');
  ctx.fillStyle = g; circle(0, -6, 22); ctx.fill();
  ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.quadraticCurveTo(-8, -12, 0, -22 + Math.sin(t * 13) * 2); ctx.quadraticCurveTo(8, -12, 7, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.quadraticCurveTo(-4, -8, 0, -14 + Math.sin(t * 19) * 1.5); ctx.quadraticCurveTo(4, -8, 4, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function pyrTorchStick(x, y, len, ang) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0);
  ctx.fillStyle = '#7a4b25'; rr(-2.5, 0, 5, len, 2); ctx.fill();
  ctx.fillStyle = '#4e2e14'; ctx.fillRect(0.8, 1, 1.7, len - 2);
  ctx.fillStyle = '#c9a25a'; ctx.fillRect(-4, -2, 8, 5);
  ctx.fillStyle = '#8a6a2a'; ctx.fillRect(-4, 2, 8, 1.5); ctx.fillRect(-3.5, len * 0.55, 7, 3);
  ctx.restore();
}
// a floor lever (pivot at x, y on the floor); a 0 (left, closed) .. 1 (right, pulled)
function pyrLever(x, y, a, glow) {
  ctx.fillStyle = 'rgba(40,20,8,0.25)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 1, 18, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6e4a26'; rr(x - 13, y - 9, 26, 9, 3); ctx.fill();
  ctx.strokeStyle = '#3a2614'; ctx.lineWidth = 1.2; rr(x - 13, y - 9, 26, 9, 3); ctx.stroke();
  ctx.fillStyle = '#a8783e'; rr(x - 11, y - 8, 22, 3, 1.5); ctx.fill();
  const ang = pyrLerp(-0.7, 0.7, a), kx = x + Math.sin(ang) * 30, ky = y - 6 - Math.cos(ang) * 30;
  ctx.strokeStyle = '#3a2614'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(kx, ky); ctx.stroke();
  ctx.strokeStyle = '#7a5a40'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(kx, ky); ctx.stroke();
  if (glow) { ctx.fillStyle = 'rgba(255,205,80,0.35)'; circle(kx, ky, 13); ctx.fill(); }
  ctx.fillStyle = a > 0.5 ? C.gold : '#d9573a'; circle(kx, ky, 6.5); ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,10,0.6)'; ctx.lineWidth = 1.5; circle(kx, ky, 6.5); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; circle(kx - 2, ky - 2, 1.8); ctx.fill();
  ctx.lineCap = 'butt';
}
// a small rounded HUD pill with text (screen coords); returns its width
function pyrPill(str, x, y, col, align, size) {
  const fs = size || (pyrBig() ? 17 : 13), h = fs + 13;
  ctx.font = '700 ' + fs + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(str).width + 26;
  const px = pill(x, y, w, h, align || 'left');
  text(str, px + w / 2, y + h / 2 + 0.5, fs, col || C.paper, 'center', 'body');
  return w;
}
// the darkness layer: a full-screen dark wash with soft holes of light. lights: [{ x, y, r, k (0..1 strength), warm }]
let pyrDarkCv = null;
function pyrDarkness(alpha, lights, tint) {
  try {
    const cw = canvas.width, chh = canvas.height, sx = cw / W, sy = chh / H;
    if (!pyrDarkCv) pyrDarkCv = document.createElement('canvas');
    if (pyrDarkCv.width !== cw || pyrDarkCv.height !== chh) { pyrDarkCv.width = cw; pyrDarkCv.height = chh; }
    const d = pyrDarkCv.getContext('2d');
    d.setTransform(1, 0, 0, 1, 0, 0); d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, cw, chh);
    d.fillStyle = tint || 'rgba(10,6,18,1)'; d.globalAlpha = alpha; d.fillRect(0, 0, cw, chh); d.globalAlpha = 1;
    d.setTransform(sx, 0, 0, sy, 0, 0);
    d.globalCompositeOperation = 'destination-out';
    for (const l of lights) {
      const g = d.createRadialGradient(l.x, l.y, l.r * 0.15, l.x, l.y, l.r);
      g.addColorStop(0, 'rgba(0,0,0,' + (l.k == null ? 1 : l.k) + ')'); g.addColorStop(0.6, 'rgba(0,0,0,' + 0.75 * (l.k == null ? 1 : l.k) + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g; d.beginPath(); d.arc(l.x, l.y, l.r, 0, Math.PI * 2); d.fill();
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(pyrDarkCv, 0, 0); ctx.restore();
    // a warm glow over the lit spots
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const l of lights) if (l.warm) {
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.8);
      g.addColorStop(0, 'rgba(255,150,60,' + 0.16 * l.warm + ')'); g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g; circle(l.x, l.y, l.r * 0.8); ctx.fill();
    }
    ctx.restore();
  } catch (e) { /* no darkness layer: the level stays fully lit */ }
}

/* ---------- sounds ---------- */
let pyrNoiseBuf = null;
function pyrNoise(sfx, dur, vol, freq, delay, sweepTo) {
  if (sfx.muted || !sfx.ctx) return;
  try {
    const a = sfx.ctx;
    if (!pyrNoiseBuf) {
      pyrNoiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
      const ch = pyrNoiseBuf.getChannelData(0);
      let b = 0;
      for (let i = 0; i < ch.length; i++) { b = 0.97 * b + 0.03 * (Math.random() * 2 - 1); ch[i] = b * 6; }
    }
    const t = a.currentTime + (delay || 0);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = pyrNoiseBuf; src.loop = true;
    f.type = 'lowpass'; f.frequency.setValueAtTime(freq || 400, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.04, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(a.destination);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  } catch (e) { /* ignore audio errors */ }
}
Sfx.extra.pyrRumble = function (p, v) { pyrNoise(this, 0.5, 0.06 + 0.1 * (v || 0), 160, 0); this.tone(48, 0.45, 'sine', 0.05 + 0.06 * (v || 0), 40); };
Sfx.extra.pyrCrash = function () { pyrNoise(this, 0.9, 0.35, 1800, 0, 120); this.tone(90, 0.6, 'triangle', 0.12, 40); this.tone(60, 0.8, 'sine', 0.12, 30, 0.05); };
Sfx.extra.pyrCrumble = function () { pyrNoise(this, 0.45, 0.16, 1200, 0, 200); [0, 0.06, 0.12].forEach((d, i) => this.tone(200 - i * 40, 0.08, 'square', 0.03, 80, d)); };
Sfx.extra.pyrSmash = function (p) { pyrNoise(this, 0.25, 0.22, 2500, 0, 300); this.tone(180 * p, 0.12, 'square', 0.05, 70); };
Sfx.extra.pyrStone = function () { pyrNoise(this, 0.7, 0.12, 500, 0, 200); this.tone(70, 0.6, 'sawtooth', 0.025, 55); };
Sfx.extra.pyrClick = function (p) { this.tone(1400 * p, 0.03, 'square', 0.04); this.tone(700 * p, 0.06, 'triangle', 0.05, null, 0.03); };
Sfx.extra.pyrLever = function (p) { this.tone(220 * p, 0.1, 'square', 0.04, 120 * p); this.tone(900, 0.05, 'triangle', 0.04, null, 0.1); pyrNoise(this, 0.25, 0.06, 900, 0.05); };
Sfx.extra.pyrGold = function () { [784, 988, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.06)); };
Sfx.extra.pyrWhoosh = function (p) { pyrNoise(this, 0.25, 0.08, 3000, 0, 600); };
Sfx.extra.pyrSquish = function (p) { this.tone(500 * p, 0.25, 'sine', 0.07, 150 * p); pyrNoise(this, 0.2, 0.1, 700); };
Sfx.extra.pyrFanfare = function () { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.06, null, i * 0.09)); };
Sfx.extra.pyrFwoosh = function () { pyrNoise(this, 0.4, 0.12, 1500, 0, 4000); this.tone(300, 0.3, 'sawtooth', 0.02, 600); };
