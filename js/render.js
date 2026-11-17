/* Pip & Bo - Drawing: the shared canvas drawing (background, tiles, players, cords, HUD, match banners) and particle effects.
   Each level file draws its own level. */
'use strict';

/* ---------- particles ---------- */
function puff(x, y, n, col) {
  for (let i = 0; i < n; i++) G.particles.push({ x, y, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 60, life: 0.35, max: 0.35, col, size: 3 + Math.random() * 3, grav: 200, kind: 'dot' });
}
function burst(x, y, col, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 220;
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: 0.6, max: 0.6, col, size: 3 + Math.random() * 4, grav: 500, kind: 'dot' });
  }
}
function confetti(x, y) {
  const cols = [C.pip, C.bo, C.gold, C.grass, '#ff8fc7'];
  const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, s = 180 + Math.random() * 320;
  G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1.6, max: 1.6, col: cols[(Math.random() * cols.length) | 0], size: 4 + Math.random() * 4, grav: 420, kind: 'conf', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14 });
}
function updateParticles(dt) {
  const arr = G.particles;
  for (let i = arr.length - 1; i >= 0; i--) {
    const q = arr[i];
    q.life -= dt;
    if (q.life <= 0) { arr.splice(i, 1); continue; }
    q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt;
    if (q.kind === 'conf') { q.rot += q.vr * dt; q.vx *= 0.99; }
  }
  if (arr.length > 600) arr.splice(0, arr.length - 600);
}

/* ---------- drawing ---------- */
function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }

/* ---------- polished shared art (Nov 2026) ----------
   Gavyn asked for more detail and a more professional look across Worlds 1-39. The shared sky, hills, clouds, stone,
   grass, planks, spikes, water and sand below have shading, outlines and small hashed details. World 32 (comic book)
   and World 40 (hand-drawn) have their own looks, so they keep the plain versions (artPlain()). */
const ART_PLAIN_WORLDS = [31, 39];
function artPlain() { const d = G.level && G.level.def; return !!(d && ART_PLAIN_WORLDS.includes(d.world)); }
// colour helpers: mix two '#rrggbb' colours (anything else comes back as the first colour)
const _rgbCache = {};
function hexRgb(c) {
  if (_rgbCache[c] !== undefined) return _rgbCache[c];
  let m = /^#([0-9a-f]{6})$/i.exec(c || ''), r = null;
  if (m) { const n = parseInt(m[1], 16); r = [n >> 16, (n >> 8) & 255, n & 255]; }
  else if ((m = /^#([0-9a-f]{3})$/i.exec(c || ''))) r = m[1].split('').map(h => parseInt(h + h, 16));
  return (_rgbCache[c] = r);
}
const _mixCache = {};
function mixCol(a, b, t) {
  const k = a + '|' + b + '|' + t; if (_mixCache[k]) return _mixCache[k];
  const A = hexRgb(a), B = hexRgb(b);
  if (!A || !B) return (_mixCache[k] = a);
  return (_mixCache[k] = 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')');
}
const shade = (c, t) => mixCol(c, '#141428', t), tint = (c, t) => mixCol(c, '#ffffff', t);
// the same mix as a '#rrggbb' string, for a colour that is mixed again later (mixCol only reads hex)
function mixHex(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  if (!A || !B) return a;
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

function drawBackgroundPlain() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, C.skyTop); g.addColorStop(1, C.skyBot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.sun; circle(810, 105, 44); ctx.fill();
  ctx.fillStyle = C.sunGlow; circle(810, 105, 64); ctx.fill();
  for (let i = 0; i < 5; i++) {
    const speed = 6 + (i % 3) * 4;
    const x = ((i * 233 + G.clock * speed) % (W + 220)) - 110;
    const y = 50 + ((i * 71) % 130);
    drawCloudPlain(x, y, 0.7 + (i % 2) * 0.4);
  }
  const fx = (G.camX || 0) * 0.15, nx = (G.camX || 0) * 0.35;
  ctx.fillStyle = C.hillFar;
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 330 + Math.sin((x + fx) * 0.007 + 1.3) * 34 + Math.sin((x + fx) * 0.019) * 12);
  ctx.lineTo(W, H); ctx.fill();
  ctx.fillStyle = C.hillNear;
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 400 + Math.sin((x + nx) * 0.011 + 4) * 26 + Math.sin((x + nx) * 0.027 + 1) * 8);
  ctx.lineTo(W, H); ctx.fill();
}
function drawCloudPlain(x, y, s) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(x, y, 18 * s, 0, Math.PI * 2); ctx.arc(x + 22 * s, y - 8 * s, 22 * s, 0, Math.PI * 2);
  ctx.arc(x + 46 * s, y, 17 * s, 0, Math.PI * 2); ctx.rect(x, y, 46 * s, 17 * s);
  ctx.fill();
}
// The sky (gradient, sun) and each layer of hills are drawn once per level and theme into pictures and copied every
// frame; a scrolling level's hills are drawn as long strips covering its whole width, slid by the camera. Only the
// sun's rays and the clouds are drawn live.
const HILLS = [ // base, two sine waves (amp, freq, phase), parallax
  { base: 292, a1: 22, f1: 0.005, p1: 2.2, a2: 10, f2: 0.023, p2: 0.5, par: 0.07 },
  { base: 330, a1: 34, f1: 0.007, p1: 1.3, a2: 12, f2: 0.019, p2: 0, par: 0.15 },
  { base: 400, a1: 26, f1: 0.011, p1: 4, a2: 8, f2: 0.027, p2: 1, par: 0.35 },
];
const hillY = (k, X) => { const h = HILLS[k]; return h.base + Math.sin(X * h.f1 + h.p1) * h.a1 + Math.sin(X * h.f2 + h.p2) * h.a2; };
let _bg = { key: '' };
function bgLayers() {
  const L = G.level, sc = Math.max(1, Math.min(3, canvas.width / W));
  const levelW = L ? (L.cols || COLS) * T : W, maxCam = Math.max(0, levelW - W);
  const kit = sceneKit();
  const key = [C.skyTop, C.skyBot, C.sun, C.sunGlow, C.hillFar, C.hillNear, maxCam, sc, kit].join('|');
  if (_bg.key === key) return _bg;
  const mk = (w, h) => { const cv = document.createElement('canvas'); cv.width = Math.ceil(w * sc); cv.height = Math.ceil(h * sc); const c = cv.getContext('2d'); c.scale(sc, sc); return [cv, c]; };
  // the sky and the sun
  const [sky, c] = mk(W, H);
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, C.skyTop); g.addColorStop(0.62, mixCol(C.skyTop, C.skyBot, 0.75)); g.addColorStop(1, C.skyBot);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const sunOn = !/,\s*0\)\s*$/.test(C.sun);
  if (sunOn) {
    c.fillStyle = C.sunGlow; circleOn(c, 810, 105, 92); c.fill(); circleOn(c, 810, 105, 66); c.fill();
  }
  paintSkyExtras(c, sunOn);
  // the hills, each as a strip as wide as the screen plus how far that layer slides
  const top = 200, strips = [];
  for (let k = 0; k < 3; k++) {
    const sw = Math.min(W + Math.ceil(maxCam * HILLS[k].par) + 16, 4096 / sc);
    const [cv, h] = mk(sw, H - top); h.translate(0, -top);
    const path = () => { h.beginPath(); h.moveTo(-2, H); for (let X = -2; X <= sw + 12; X += 12) h.lineTo(X, hillY(k, X)); h.lineTo(sw + 12, H); h.closePath(); };
    const rim = (dy) => { h.beginPath(); for (let X = -2; X <= sw + 12; X += 12) { const y = hillY(k, X) + dy; X === -2 ? h.moveTo(X, y) : h.lineTo(X, y); } };
    if (k === 0) { paintFarPeaks(h, sw, kit); h.fillStyle = mixCol(C.hillFar, C.skyBot, 0.45); path(); h.fill(); }
    if (k === 1) {
      h.fillStyle = C.hillFar; path(); h.fill();
      h.strokeStyle = tint(C.hillFar, 0.28); h.lineWidth = 2.5; rim(1.5); h.stroke();
      h.fillStyle = shade(C.hillFar, 0.07);
      for (let i = 0; i * 97 + 30 < sw + 60; i++) {
        const x = i * 97 + 30, y = hillY(1, x), r = 7 + (hash(i % 14, 7) % 6);
        circleOn(h, x, y + r * 0.55, r); h.fill(); circleOn(h, x + r * 0.9, y + r * 0.8, r * 0.75); h.fill();
      }
    }
    if (k === 2) {
      const ng = h.createLinearGradient(0, 360, 0, H);
      ng.addColorStop(0, C.hillNear); ng.addColorStop(1, shade(C.hillNear, 0.16));
      h.fillStyle = ng; path(); h.fill();
      h.strokeStyle = tint(C.hillNear, 0.3); h.lineWidth = 3; rim(2); h.stroke();
      for (let i = 0; i * 151 + 60 < sw + 80; i++) {
        const x = i * 151 + 60, y = hillY(2, x), r = 9 + (hash(i % 9, 3) % 7);
        h.fillStyle = shade(C.hillNear, 0.1);
        circleOn(h, x, y + r * 0.5, r); h.fill(); circleOn(h, x + r, y + r * 0.75, r * 0.78); h.fill(); circleOn(h, x - r * 0.85, y + r * 0.85, r * 0.6); h.fill();
        h.fillStyle = tint(C.hillNear, 0.18); circleOn(h, x - r * 0.3, y + r * 0.1, r * 0.35); h.fill();
      }
    }
    paintStripExtras(h, k, sw, kit);
    strips.push({ cv, sw });
  }
  _bg = { key, sky, strips, sunOn, sc, top };
  return _bg;
}
function drawBackground() {
  if (artPlain()) return drawBackgroundPlain();
  const B = bgLayers(), sc = B.sc, exact = sc === canvas.width / W, sm = ctx.imageSmoothingEnabled;
  if (exact) ctx.imageSmoothingEnabled = false;
  ctx.drawImage(B.sky, 0, 0, W, H);
  ctx.imageSmoothingEnabled = sm;
  // the sun: slow turning rays over the glow, a bright core with a highlight
  if (B.sunOn) {
    ctx.save(); ctx.translate(810, 105);
    if (!reduceMotion) ctx.rotate(G.clock * 0.05);
    ctx.fillStyle = C.sunGlow; ctx.beginPath();
    for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.moveTo(-7, 52); ctx.lineTo(7, 52); ctx.lineTo(0, 86 + (i % 2) * 14); ctx.closePath(); }
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = C.sun; circle(810, 105, 44); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; circle(800, 95, 26); ctx.fill();
  }
  for (let i = 0; i < 5; i++) {
    const speed = 6 + (i % 3) * 4;
    const x = ((i * 233 + G.clock * speed) % (W + 220)) - 110;
    const y = 50 + ((i * 71) % 130);
    drawCloud(x, y, 0.7 + (i % 2) * 0.4);
  }
  drawBirds();
  const cam = G.camX || 0;
  // a level that doesn't scroll copies its hills as one picture (the three strips flattened once); copying the three
  // see-through strips each frame cost a slow CPU a few ms
  if (!cam && B.strips.every(st => st.sw >= W)) {
    if (!B.flat) {
      const cv = document.createElement('canvas'); cv.width = Math.round(W * sc); cv.height = Math.round((H - B.top) * sc);
      const c = cv.getContext('2d');
      for (const st of B.strips) c.drawImage(st.cv, 0, 0, cv.width, cv.height, 0, 0, cv.width, cv.height);
      B.flat = cv;
    }
    if (exact) ctx.imageSmoothingEnabled = false;
    ctx.drawImage(B.flat, 0, B.top, W, H - B.top);
    ctx.imageSmoothingEnabled = sm;
    return;
  }
  for (let k = 0; k < 3; k++) {
    const st = B.strips[k], off = Math.max(0, Math.min(cam * HILLS[k].par, st.sw - W));
    if (exact) ctx.imageSmoothingEnabled = false;
    ctx.drawImage(st.cv, Math.round(off * sc), 0, Math.round(W * sc), Math.round((H - B.top) * sc), 0, B.top, W, H - B.top);
    ctx.imageSmoothingEnabled = sm;
  }
}
// a cloud is drawn once per size into a picture and copied onto whole pixels after that
function drawCloud(x, y, s) {
  if (artPlain()) return drawCloudPlain(x, y, s);
  const m = ctx.getTransform(), sc = Math.max(1, Math.min(3, canvas.width / W));
  if (m.b !== 0 || m.c !== 0 || Math.abs(m.a - sc) > 1e-6) return paintCloud(ctx, x, y, s);
  const sp = artSprite('cloud' + s, 92 * s, 58 * s, 23 * s, 33 * s, c => paintCloud(c, 0, 0, s));
  blitSprite(sp, x, y);
}
function paintCloud(ctx, x, y, s) {
  // a soft shadow under the puffs, then the white puffs, then a bright top
  ctx.fillStyle = 'rgba(160,175,205,0.28)';
  ctx.beginPath();
  ctx.arc(x + 2 * s, y + 4 * s, 18 * s, 0, Math.PI * 2); ctx.arc(x + 24 * s, y - 4 * s, 22 * s, 0, Math.PI * 2);
  ctx.arc(x + 48 * s, y + 4 * s, 17 * s, 0, Math.PI * 2); ctx.rect(x + 2 * s, y + 4 * s, 46 * s, 17 * s);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(x, y, 18 * s, 0, Math.PI * 2); ctx.arc(x + 22 * s, y - 8 * s, 22 * s, 0, Math.PI * 2);
  ctx.arc(x + 46 * s, y, 17 * s, 0, Math.PI * 2); ctx.arc(x + 34 * s, y - 2 * s, 14 * s, 0, Math.PI * 2); ctx.rect(x, y, 46 * s, 17 * s);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  circleOn(ctx, x + 17 * s, y - 15 * s, 9 * s); ctx.fill(); circleOn(ctx, x - 4 * s, y - 5 * s, 6 * s); ctx.fill();
}

function drawStonePlain(tx, ty) {
  const x = tx * T, y = ty * T;
  ctx.fillStyle = C.stone; ctx.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
  const h = hash(tx, ty);
  if (h % 3 === 0) { ctx.fillStyle = C.stoneLight; rr(x + 4 + (h % 15), y + 10 + ((h >>> 4) % 12), 7, 4, 2); ctx.fill(); }
  ctx.fillStyle = C.stoneEdge;
  if (tile(tx - 1, ty) !== '#') ctx.fillRect(x, y, 2, T);
  if (tile(tx + 1, ty) !== '#') ctx.fillRect(x + T - 2, y, 2, T);
  if (ty + 1 < ROWS && !'#s'.includes(tile(tx, ty + 1))) ctx.fillRect(x, y + T - 3, T, 3);
  if (ty > 0 && !'#sw'.includes(tile(tx, ty - 1))) {
    ctx.fillStyle = C.grassDark; ctx.fillRect(x, y, T, 8);
    ctx.fillStyle = C.grass; ctx.fillRect(x, y, T, 6);
    ctx.fillStyle = C.grass;
    for (let i = 0; i < 3; i++) { circle(x + 5 + i * 10, y + 6, 3); ctx.fill(); }
  }
}
// The polished stone is drawn once per look into a small picture (sprite) and copied after that: a tile's look depends
// on which sides meet air, how deep it sits, one of 12 variants and the theme's colours. Drawing every tile from
// scratch cost about 5 ms a frame; copying costs about what the plain tiles did.
const STONE_VARIANTS = 12, _sprites = new Map();
let _spriteScale = 0;
// k (optional, above 1) paints the picture k times sharper than the screen, for art that is drawn scaled up or under
// a zooming camera; such a picture is always copied with a scaled, smoothed drawImage. Without k nothing changes.
function artSprite(key, w, h, ox, oy, paint, k) {
  const sc = Math.max(1, Math.min(3, canvas.width / W)), kk = k > 1 ? k : 1, s2 = sc * kk;
  if (sc !== _spriteScale) { _sprites.clear(); _spriteScale = sc; }
  if (kk !== 1) key += '|x' + kk;
  let sp = _sprites.get(key);
  if (!sp) {
    if (_sprites.size > 3000) _sprites.clear();
    // the picture's origin sits on a whole pixel, so a copy can land exactly on the screen's pixels
    const px = Math.ceil(ox * s2), py = Math.ceil(oy * s2);
    sp = document.createElement('canvas'); sp.width = Math.ceil(px + (w - ox) * s2); sp.height = Math.ceil(py + (h - oy) * s2);
    const c = sp.getContext('2d'); c.translate(px, py); c.scale(s2, s2); paint(c);
    sp.px = px; sp.py = py; sp.k = kk;
    _sprites.set(key, sp);
  }
  return sp;
}
// copy a picture made by artSprite with its origin at (x, y): onto whole screen pixels without smoothing when the
// screen isn't rotated or zoomed (smoothing made each copy several times slower on a computer without a graphics
// chip, and whole pixels leave no seams between tiles). A sharper picture (k) is scaled down with smoothing.
function blitSprite(sp, x, y) {
  if (sp.k > 1) {
    const s2 = _spriteScale * sp.k, sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(sp, x - sp.px / s2, y - sp.py / s2, sp.width / s2, sp.height / s2);
    ctx.imageSmoothingEnabled = sm; return;
  }
  const m = ctx.getTransform();
  if (m.b === 0 && m.c === 0 && Math.abs(m.a - _spriteScale) < 1e-6 && Math.abs(m.d - _spriteScale) < 1e-6) {
    const X = Math.round(m.a * x + m.e) - sp.px, Y = Math.round(m.d * y + m.f) - sp.py, sm = ctx.imageSmoothingEnabled;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sp, X, Y);
    ctx.setTransform(m); ctx.imageSmoothingEnabled = sm;
  } else ctx.drawImage(sp, x - sp.px / _spriteScale, y - sp.py / _spriteScale, sp.width / _spriteScale, sp.height / _spriteScale);
}
function rrOn(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function circleOn(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); }
function drawStone(tx, ty) {
  if (artPlain()) return drawStonePlain(tx, ty);
  const x = tx * T, y = ty * T;
  const L = tile(tx - 1, ty) !== '#', R = tile(tx + 1, ty) !== '#';
  const B = ty + 1 < ROWS && !'#s'.includes(tile(tx, ty + 1)), top = ty > 0 && !'#sw'.includes(tile(tx, ty - 1));
  let d = 0; for (let k = 1; k <= 3 && tile(tx, ty - k) === '#'; k++) d++;
  // (a masonry look repeats every SL_PX x SL_PY tiles, so its picture is picked by where the tile sits in that repeat)
  const look = stoneLook(), px = ((tx % SL_PX) + SL_PX) % SL_PX, py = ((ty % SL_PY) + SL_PY) % SL_PY;
  const v = look ? px + ',' + py : hash(tx, ty) % STONE_VARIANTS;
  const key = 'st' + look + C.stone + C.stoneLight + C.stoneEdge + C.grass + C.grassDark + (L ? 1 : 0) + (R ? 1 : 0) + (B ? 1 : 0) + (top ? 1 : 0) + d + ':' + v;
  const sp = artSprite(key, T + 8, T + 16, 4, 8, c => (look ? paintStoneLook(c, look, L, R, B, top, d, px, py) : paintStone(c, hash(v * 7 + 3, 911), L, R, B, top, d)));
  blitSprite(sp, x, y);
}
// The level's stone tiles are drawn in chunks of 16 columns into pictures, rebuilt only when a chunk's tiles (or the
// theme) change, and copied in one go: copying ~200 small tile pictures a frame still cost a phone-speed CPU several
// ms. render() draws them before its tile loop and the loop skips '#'. Off (null) when the screen is rotated or zoomed.
const STONE_CHUNK = 16, _chunks = new Map();
function drawStoneChunks(tx0, tx1) {
  if (artPlain()) return false;
  const m = ctx.getTransform(), sc = Math.max(1, Math.min(3, canvas.width / W));
  if (m.b !== 0 || m.c !== 0 || Math.abs(m.a - sc) > 1e-6 || Math.abs(m.d - sc) > 1e-6) return false;
  if (sc !== _spriteScale) { _sprites.clear(); _spriteScale = sc; }
  const look = stoneLook(), theme = look + C.stone + C.stoneLight + C.stoneEdge + C.grass + C.grassDark + '|' + sc;
  for (let c0 = Math.floor(tx0 / STONE_CHUNK) * STONE_CHUNK; c0 <= tx1; c0 += STONE_CHUNK) {
    // what the chunk's tiles look like depends on its cells and the ones around it
    let sig = 0;
    for (let ty = -3; ty <= ROWS; ty++) for (let tx = c0 - 1; tx <= c0 + STONE_CHUNK; tx++) sig = (Math.imul(sig, 31) + tile(tx, ty).charCodeAt(0)) | 0;
    const id = G.level.def.name + '|' + (G.level.def.roomIndex || 0) + '|' + c0;
    let ch = _chunks.get(id);
    if (!ch || ch.sig !== sig || ch.theme !== theme) {
      if (!ch) {
        if (_chunks.size >= 5) _chunks.delete(_chunks.keys().next().value); // the oldest
        const px = Math.ceil(4 * sc), py = Math.ceil(8 * sc);
        const cv = document.createElement('canvas'); cv.width = Math.ceil(px + (STONE_CHUNK * T + 4) * sc); cv.height = Math.ceil(py + (ROWS * T + 8) * sc);
        ch = { cv, px, py };
      }
      const c = ch.cv.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, ch.cv.width, ch.cv.height);
      c.setTransform(sc, 0, 0, sc, ch.px, ch.py);
      let r0 = ROWS, r1 = -1;
      for (let ty = 0; ty < ROWS; ty++) for (let tx = c0; tx < c0 + STONE_CHUNK; tx++) {
        if (tile(tx, ty) !== '#' || tx >= (G.level.cols || COLS)) continue;
        r0 = Math.min(r0, ty); r1 = Math.max(r1, ty);
        const L = tile(tx - 1, ty) !== '#', R = tile(tx + 1, ty) !== '#';
        const B = ty + 1 < ROWS && !'#s'.includes(tile(tx, ty + 1)), top = ty > 0 && !'#sw'.includes(tile(tx, ty - 1));
        let d = 0; for (let k = 1; k <= 3 && tile(tx, ty - k) === '#'; k++) d++;
        c.save(); c.translate((tx - c0) * T, ty * T);
        if (look) paintStoneLook(c, look, L, R, B, top, d, ((tx % SL_PX) + SL_PX) % SL_PX, ((ty % SL_PY) + SL_PY) % SL_PY);
        else { const v = hash(tx, ty) % STONE_VARIANTS; paintStone(c, hash(v * 7 + 3, 911), L, R, B, top, d); }
        c.restore();
      }
      ch.sig = sig; ch.theme = theme;
      // only the rows that hold stone get copied
      ch.sy = r1 < 0 ? 0 : Math.max(0, Math.floor(ch.py + (r0 * T - 8) * sc)); ch.sh = r1 < 0 ? 0 : Math.min(ch.cv.height, Math.ceil(ch.py + ((r1 + 1) * T + 8) * sc)) - ch.sy;
      _chunks.delete(id); _chunks.set(id, ch);
    }
    const X = Math.round(m.a * c0 * T + m.e) - ch.px, Y = Math.round(m.f) - ch.py, sm = ctx.imageSmoothingEnabled;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    if (ch.sh > 0) ctx.drawImage(ch.cv, 0, ch.sy, ch.cv.width, ch.sh, X, Y + ch.sy, ch.cv.width, ch.sh);
    ctx.setTransform(m); ctx.imageSmoothingEnabled = sm;
  }
  return true;
}
// one stone tile at (0, 0) on canvas c
function paintStone(c, h, L, R, B, top, d) {
  const x = 0, y = 0;
  // (fills reach half a pixel past the right and bottom edges, under the next tile, so no seam shows between tiles)
  c.fillStyle = C.stone; c.fillRect(x, y, T + 0.6, T + 0.6);
  // depth: rock gets a little darker the deeper it is under a surface (a smooth ramp over the top four rows)
  if (d < 4) {
    const g = c.createLinearGradient(0, y, 0, y + T);
    g.addColorStop(0, 'rgba(10,10,30,' + (0.035 * d) + ')'); g.addColorStop(1, 'rgba(10,10,30,' + (0.035 * Math.min(3, d + 1)) + ')');
    c.fillStyle = g;
  } else c.fillStyle = 'rgba(10,10,30,0.105)';
  c.fillRect(x, y, T + 0.6, T + 0.6);
  // carved stones: one or two rounded slabs with a lit top and a shaded foot
  const sl = shade(C.stone, 0.18), li = C.stoneLight;
  const n = 1 + (h % 2);
  for (let i = 0; i < n; i++) {
    const hh = h >>> (i * 7 + 3);
    const w = 9 + (hh % 9), hgt = 5 + ((hh >>> 4) % 5);
    const sx = x + 3 + ((hh >>> 2) % Math.max(1, T - w - 6)), sy = y + (top ? 12 : 4) + ((hh >>> 6) % Math.max(1, T - hgt - (top ? 15 : 8)));
    c.fillStyle = sl; rrOn(c, sx, sy + 1.5, w, hgt, 2.5); c.fill();
    c.fillStyle = li; rrOn(c, sx, sy, w, hgt, 2.5); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(sx + 2, sy + 1, w - 4, 1.2);
  }
  c.fillStyle = sl;
  if (h & 64) { circleOn(c, x + 6 + (h >>> 9) % 18, y + 18 + (h >>> 13) % 9, 1.2); c.fill(); }
  if (h & 128) { circleOn(c, x + 4 + (h >>> 11) % 22, y + 9 + (h >>> 15) % 12, 0.9); c.fill(); }
  // (third pass) now and then a hairline crack with a lit lower lip
  if ((h >>> 17) % 5 === 0 && !top) {
    const cx = x + 7 + (h >>> 20) % 12, cy = y + 6 + (h >>> 23) % 10;
    c.strokeStyle = 'rgba(255,255,255,0.09)'; c.lineWidth = 1; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(cx, cy + 1); c.lineTo(cx + 3, cy + 5); c.lineTo(cx + 1.5, cy + 9); c.lineTo(cx + 5, cy + 13); c.stroke();
    c.strokeStyle = sl; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + 3, cy + 4); c.lineTo(cx + 1.5, cy + 8); c.lineTo(cx + 5, cy + 12); c.stroke();
  }
  // edges: dark outline where the rock meets air, a thin lit bevel inside on the left
  c.fillStyle = C.stoneEdge;
  if (L) c.fillRect(x, y, 2.5, T);
  if (R) c.fillRect(x + T - 2.5, y, 2.5, T);
  if (B) {
    c.fillRect(x, y + T - 3.5, T, 3.5);
    // (third pass) little knobs of rock hanging under an overhang
    for (let i = 0; i < 2; i++) {
      if (!((h >>> (i + 9)) & 1)) continue;
      const nx = x + 5 + i * 13 + ((h >>> (i * 4 + 11)) % 7), nl = 2.5 + ((h >>> (i * 3 + 14)) % 4), nw = 2.2 + ((h >>> (i * 2 + 19)) % 2);
      c.beginPath(); c.moveTo(nx - nw, y + T - 0.5); c.quadraticCurveTo(nx - nw * 0.6, y + T + nl, nx, y + T + nl); c.quadraticCurveTo(nx + nw * 0.6, y + T + nl, nx + nw, y + T - 0.5); c.closePath(); c.fill();
    }
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(x, y + T - 6, T, 2.5);
  }
  if (L) { c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(x + 2.5, y, 1.5, T); }
  if (R) { c.fillStyle = 'rgba(0,0,0,0.1)'; c.fillRect(x + T - 5, y, 2.5, T); }
  if (top) paintTurf(c, h, L, R);
}
// the turf on a stone tile's open top (tile at 0, 0 on canvas c)
function paintTurf(c, h, L, R) {
  const x = 0, y = 0;
  // a shadow the turf throws on the rock, the turf with a scalloped lip, then blades and the odd flower
  c.fillStyle = 'rgba(0,0,0,0.16)'; c.fillRect(x, y + 8, T, 5);
  c.fillStyle = C.grassDark; c.fillRect(x, y, T, 9);
  for (let i = 0; i < 3; i++) { circleOn(c, x + 5 + i * 10, y + 8, 3.6); c.fill(); }
  c.fillStyle = C.grass; c.fillRect(x, y, T, 6);
  for (let i = 0; i < 3; i++) { circleOn(c, x + 5 + i * 10, y + 6, 3.1); c.fill(); }
  c.fillStyle = tint(C.grass, 0.35); c.fillRect(x, y, T, 1.6);
  c.fillStyle = C.grass;
  for (let i = 0; i < 3; i++) {
    if (!((h >>> (i + 2)) & 1)) continue;
    const bx = x + 3 + i * 10 + ((h >>> (i * 3)) % 5), bh = 3 + ((h >>> (i * 2 + 5)) % 3);
    c.beginPath(); c.moveTo(bx - 1.6, y + 0.5); c.lineTo(bx + 0.6, y - bh); c.lineTo(bx + 1.6, y + 0.5); c.closePath(); c.fill();
  }
  if (h % 4 === 0) {
    const fx = x + 8 + (h >>> 5) % 14;
    c.fillStyle = ['#fff4c2', '#ffd1e6', '#ffffff'][(h >>> 3) % 3];
    for (let a = 0; a < 5; a++) { circleOn(c, fx + Math.cos(a * 1.257) * 1.8, y - 2 + Math.sin(a * 1.257) * 1.8, 1.3); c.fill(); }
    c.fillStyle = '#ffc53d'; circleOn(c, fx, y - 2, 1.1); c.fill();
  }
  // (third pass) a taller tuft or a pebble on the turf here and there
  if ((h >>> 21) % 6 === 0) {
    const tx2 = x + 6 + (h >>> 24) % 16;
    c.fillStyle = C.grassDark; c.beginPath(); c.moveTo(tx2 - 3.4, y + 0.5); c.quadraticCurveTo(tx2 - 3.6, y - 4, tx2 - 4.6, y - 6); c.quadraticCurveTo(tx2 - 1.4, y - 4, tx2 - 0.8, y + 0.5); c.closePath(); c.fill();
    c.fillStyle = C.grass; c.beginPath(); c.moveTo(tx2 - 1.2, y + 0.5); c.quadraticCurveTo(tx2 - 0.6, y - 5.5, tx2 + 1, y - 7.5); c.quadraticCurveTo(tx2 + 1.6, y - 4, tx2 + 1.6, y + 0.5); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(tx2 + 1.2, y + 0.5); c.quadraticCurveTo(tx2 + 3.2, y - 3, tx2 + 5, y - 4.6); c.quadraticCurveTo(tx2 + 4, y - 1.4, tx2 + 3.6, y + 0.5); c.closePath(); c.fill();
  } else if ((h >>> 21) % 6 === 1) {
    const px2 = x + 6 + (h >>> 24) % 17;
    c.fillStyle = 'rgba(0,0,0,0.14)'; c.beginPath(); c.ellipse(px2 + 0.6, y + 0.6, 3.6, 1.2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = shade(C.stoneLight, 0.12); c.beginPath(); c.ellipse(px2, y - 1, 3, 2.2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = tint(C.stoneLight, 0.3); c.beginPath(); c.ellipse(px2 - 0.8, y - 1.7, 1.5, 0.9, 0, 0, Math.PI * 2); c.fill();
  }
  // the turf's ends curl down over the side
  if (L) { c.fillStyle = C.grassDark; rrOn(c, x - 1.5, y, 4, 11, 2); c.fill(); }
  if (R) { c.fillStyle = C.grassDark; rrOn(c, x + T - 2.5, y, 4, 11, 2); c.fill(); }
}
/* ---------- masonry looks for the stone (rich props pass 2, Nov 2026) ----------
   A world or a level can lay its '#' stone as real masonry instead of the carved slabs: 'brick' (bricks in running
   bond under a gold casino trim with marquee bulbs: World 8, and 10-1's Jackpot Reels that borrow its look), 'vault'
   (dressed ashlar blocks with tooled margins under a polished floor slab with dentils: 7-3) or 'cobble' (packed
   fieldstones under the turf: 10-1 rooms 3 and 4). A level or room picks one with theme: { stoneLook }, otherwise the
   world's entry in STONE_LOOKS counts; no look keeps the carved slabs. The blocks are laid in world space and run
   across tile edges; the pattern repeats every SL_PX x SL_PY tiles, so a tile's picture depends only on where it sits
   in that repeat and on its open sides (drawStone caches one picture per such case, drawStoneChunks paints them). */
const STONE_LOOKS = { 7: 'brick' };
function stoneLook() { return C.stoneLook || STONE_LOOKS[THEME_W] || ''; }
const SL_PX = 8, SL_PY = 4, SL_PW = SL_PX * T, _slCourses = {};
// the courses of a look over one repeat: [{ y, h, blocks: [[x0, x1, id]] }]; each course's blocks fill
// [off, off + SL_PW), wrapping round, so a block can sit astride the repeat's edge
function slCourses(look) {
  if (_slCourses[look]) return _slCourses[look];
  // (fieldstone courses vary in height; they add up to the repeat's height)
  const hs = look === 'brick' ? Array(SL_PY * 3).fill(10) : look === 'vault' ? Array(SL_PY * 2).fill(15) : [14, 17, 13, 16, 12, 18, 15, 15];
  const min = look === 'brick' ? 0.01 : look === 'vault' ? 22 : 11, out = [];
  for (let r = 0, y = 0; r < hs.length; y += hs[r], r++) {
    const off = look === 'brick' ? (r % 2) * 10 : look === 'vault' ? [0, 22.5, 7.5, 30][r % 4] : hash(r * 13 + 7, 389) % 17;
    const blocks = [];
    for (let x = off, i = 0; x < off + SL_PW - 0.01; i++) {
      const q = hash(r * 97 + i, 4211);
      let len = look === 'brick' ? 20 : look === 'vault' ? [30, 45, 37.5, 52.5, 60][q % 5] : 13 + (q % 12);
      if (off + SL_PW - x - len < min) len = off + SL_PW - x;   // the last block takes up the rest (never a sliver)
      blocks.push([x, x + len, r * 64 + i]); x += len;
    }
    out.push({ y, h: hs[r], blocks });
  }
  return (_slCourses[look] = out);
}
// one stone tile in a masonry look at (0, 0) on canvas c; (px, py) is where it sits in the repeat
function paintStoneLook(c, look, L, R, B, top, d, px, py) {
  const X0 = px * T, Y0 = py * T, mortar = mixHex(C.stone, C.stoneEdge, look === 'brick' ? 0.55 : look === 'vault' ? 0.7 : 0.62);
  c.save(); c.beginPath(); c.rect(0, 0, T + 0.6, T + 0.6); c.clip();
  // the mortar (or packed earth) between the blocks, then the blocks that reach into this tile
  c.fillStyle = mortar; c.fillRect(0, 0, T + 0.6, T + 0.6);
  for (const co of slCourses(look)) {
    const y = co.y - Y0;
    if (y >= T + 1 || y + co.h <= -1) continue;
    for (const [a0, b0, id] of co.blocks) for (const sh of [-SL_PW, 0]) {
      const a = a0 + sh - X0, b = b0 + sh - X0;
      if (b <= -1 || a >= T + 1) continue;
      if (look === 'brick') slBrick(c, a, y, b - a, co.h, id, mortar);
      else if (look === 'vault') slAshlar(c, a, y, b - a, co.h, id, mortar);
      else slCobble(c, a, y, b - a, co.h, id);
    }
  }
  // depth: a little darker the deeper it sits under a surface (the same ramp as the carved stone)
  if (d < 4) {
    const g = c.createLinearGradient(0, 0, 0, T);
    g.addColorStop(0, 'rgba(10,10,30,' + (0.035 * d) + ')'); g.addColorStop(1, 'rgba(10,10,30,' + (0.035 * Math.min(3, d + 1)) + ')');
    c.fillStyle = g;
  } else c.fillStyle = 'rgba(10,10,30,0.105)';
  c.fillRect(0, 0, T + 0.6, T + 0.6);
  c.restore();
  // edges: a dark outline where the wall meets air, a lit bevel inside on the left, a shade inside on the right
  c.fillStyle = C.stoneEdge;
  if (L) c.fillRect(0, 0, 2.5, T);
  if (R) c.fillRect(T - 2.5, 0, 2.5, T);
  if (B) {
    c.fillRect(0, T - 3.2, T, 3.2);
    if (look === 'cobble') {   // stones poking out under an overhang
      for (let i = 0; i < 2; i++) {
        const q = hash(px * 5 + i, 977 + py); if (q % 3 === 0) continue;
        const nx = 6 + i * 13 + (q >>> 3) % 6, nw = 3 + (q >>> 6) % 2;
        c.beginPath(); c.ellipse(nx, T - 1.2, nw, 2.4 + (q >>> 8) % 2, 0, 0, Math.PI); c.fill();
      }
    }
    c.fillStyle = 'rgba(0,0,0,0.13)'; c.fillRect(0, T - 5.8, T, 2.6);
  }
  if (L) { c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(2.5, 0, 1.5, T); }
  if (R) { c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(T - 5, 0, 2.5, T); }
  if (top) {
    if (look === 'brick') slTrim(c, L, R, px);
    else if (look === 'vault') slSlab(c, L, R, px);
    else paintTurf(c, hash(px * 7 + 3, 911 + py * 31), L, R);
  }
}
// a brick in running bond: its own tone (now and then a darker burnt one or a pale glazed one), a shaded foot and
// right end, a lit top and left edge, pores, and the odd chipped corner or hairline crack
function slBrick(c, a, y, w, hh, id, mortar) {
  const q = hash(id, 733), k = q % 11;
  const face = k === 0 ? mixHex(C.stone, C.stoneEdge, 0.3) : k === 1 ? mixHex(C.stoneLight, '#ffffff', 0.1) : mixHex(C.stone, C.stoneLight, [0.35, 0.55, 0.7, 0.45, 0.6, 0.8, 0.5, 0.4, 0.65][k - 2]);
  const x0 = a + 0.9, y0 = y + 0.9, bw = w - 1.8, bh = hh - 1.8;
  c.fillStyle = face; rrOn(c, x0, y0, bw, bh, 1.4); c.fill();
  c.fillStyle = 'rgba(16,8,36,0.24)'; c.fillRect(x0 + 0.6, y0 + bh - 2, bw - 1.2, 2); c.fillRect(x0 + bw - 1.6, y0 + 0.8, 1.6, bh - 2.6);
  c.fillStyle = 'rgba(255,255,255,0.26)'; c.fillRect(x0 + 1.2, y0, bw - 2.6, 1.1);
  c.fillStyle = 'rgba(255,255,255,0.11)'; c.fillRect(x0, y0 + 1.1, 1.1, bh - 3);
  if (k === 1) { c.fillStyle = 'rgba(255,255,255,0.16)'; c.fillRect(x0 + 2.5, y0 + 2.2, bw * 0.45, 0.9); }
  c.fillStyle = 'rgba(16,8,36,0.3)';
  for (let i = 0; i < 3; i++) { circleOn(c, x0 + 2.5 + ((q >>> (i * 5 + 3)) % Math.max(1, (bw - 5) | 0)), y0 + 2.2 + ((q >>> (i * 4 + 17)) % 4), 0.55); c.fill(); }
  if ((q >>> 11) % 6 === 0) { c.fillStyle = mortar; c.beginPath(); c.moveTo(x0 + bw - 3.8, y0 - 0.2); c.lineTo(x0 + bw + 0.2, y0 - 0.2); c.lineTo(x0 + bw + 0.2, y0 + 3.2); c.closePath(); c.fill(); }
  if ((q >>> 14) % 14 === 0) {
    const cx = x0 + 4 + (q >>> 18) % Math.max(1, (bw - 8) | 0);
    c.strokeStyle = 'rgba(16,8,36,0.38)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(cx, y0 + 0.5); c.lineTo(cx + 1.6, y0 + 3.4); c.lineTo(cx + 0.6, y0 + bh - 0.6); c.stroke();
  }
}
// a dressed ashlar block: a tooled margin round a slightly raised face with fine chisel marks, a lit top and left
// edge, a shaded foot and right edge, and now and then a chipped corner, a hairline crack or a damp streak
function slAshlar(c, a, y, w, hh, id, mortar) {
  const q = hash(id, 557), x0 = a + 0.7, y0 = y + 0.7, bw = w - 1.4, bh = hh - 1.4;
  const face = mixHex(C.stone, C.stoneLight, [0.15, 0.32, 0.48, 0.25, 0.6, 0.4][q % 6]);
  c.fillStyle = face; c.fillRect(x0, y0, bw, bh);
  c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(x0 + 2.4, y0 + 2.2, bw - 4.8, bh - 4.4);
  c.strokeStyle = 'rgba(16,8,36,0.18)'; c.lineWidth = 0.7; c.strokeRect(x0 + 2.4, y0 + 2.2, bw - 4.8, bh - 4.4);
  c.strokeStyle = 'rgba(16,8,36,0.09)'; c.beginPath();
  for (let sx = x0 + 4.5 + (q % 4); sx < x0 + bw - 6; sx += 4.5) { c.moveTo(sx, y0 + bh - 3.4); c.lineTo(sx + 2.2, y0 + 3.4); }
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(x0, y0, bw, 1.2);
  c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(x0, y0 + 1.2, 1, bh - 1.2);
  c.fillStyle = 'rgba(12,6,30,0.3)'; c.fillRect(x0, y0 + bh - 1.6, bw, 1.6);
  c.fillStyle = 'rgba(12,6,30,0.2)'; c.fillRect(x0 + bw - 1.2, y0, 1.2, bh - 1.6);
  if ((q >>> 5) % 5 === 0) {   // a chipped corner (bottom left or top right)
    c.fillStyle = mortar; c.beginPath();
    if ((q >>> 8) & 1) { c.moveTo(x0 - 0.2, y0 + bh - 4); c.lineTo(x0 + 4.5, y0 + bh + 0.2); c.lineTo(x0 - 0.2, y0 + bh + 0.2); }
    else { c.moveTo(x0 + bw - 5, y0 - 0.2); c.lineTo(x0 + bw + 0.2, y0 - 0.2); c.lineTo(x0 + bw + 0.2, y0 + 3.8); }
    c.closePath(); c.fill();
  }
  if ((q >>> 10) % 7 === 0) {
    const cx = x0 + 5 + (q >>> 13) % Math.max(1, (bw - 10) | 0);
    c.lineWidth = 0.8; c.strokeStyle = 'rgba(255,255,255,0.1)'; c.beginPath(); c.moveTo(cx + 0.6, y0 + 0.6); c.lineTo(cx + 3.4, y0 + 5.6); c.lineTo(cx + 1.6, y0 + 9.6); c.lineTo(cx + 3.8, y0 + bh); c.stroke();
    c.strokeStyle = 'rgba(16,8,36,0.42)'; c.beginPath(); c.moveTo(cx, y0); c.lineTo(cx + 2.8, y0 + 5); c.lineTo(cx + 1, y0 + 9); c.lineTo(cx + 3.2, y0 + bh); c.stroke();
  }
  if ((q >>> 16) % 6 === 0) {
    const sx = x0 + 3 + (q >>> 19) % Math.max(1, (bw - 8) | 0), g = c.createLinearGradient(0, y0, 0, y0 + bh);
    g.addColorStop(0, 'rgba(12,6,30,0.16)'); g.addColorStop(1, 'rgba(12,6,30,0)');
    c.fillStyle = g; c.fillRect(sx, y0 + 1, 3.5, bh - 2);
  }
}
// a fieldstone: a rounded stone of its own tone and size, its dark rim fuller on the lower right, a lit cap, speckle,
// and now and then a crack or a spot of moss
function slCobble(c, a, y, w, hh, id) {
  const q = hash(id, 389), face = mixHex(C.stone, C.stoneLight, [0.2, 0.45, 0.65, 0.35, 0.85, 0.55, 0.3][q % 7]);
  const x0 = a + 0.6 + ((q >>> 7) % 3) * 0.5, x1 = a + w - 0.6 - ((q >>> 9) % 3) * 0.5;
  const y0 = y + 0.5 + ((q >>> 3) % 3) * 0.6, y1 = y + hh - 0.4 - ((q >>> 5) % 3) * 0.5;
  // an irregular rounded outline: each corner nudged and rounded by its own amount
  const blob = (dx0, dy0, dx1, dy1) => {
    const X0 = x0 + dx0, Y0 = y0 + dy0, X1 = x1 - dx1, Y1 = y1 - dy1, m = Math.min((X1 - X0) / 2, (Y1 - Y0) / 2);
    const rad = k => Math.max(1, Math.min(m, 3 + ((q >>> (k * 3 + 11)) % 4)));
    const j = k => (((q >>> (k * 2 + 20)) % 3) - 1) * 0.7;
    c.beginPath(); c.moveTo(X0 + rad(0), Y0 + j(0));
    c.arcTo(X1 + j(1), Y0, X1, Y1, rad(1)); c.arcTo(X1, Y1 + j(2), X0, Y1, rad(2));
    c.arcTo(X0 + j(3), Y1, X0, Y0, rad(3)); c.arcTo(X0, Y0 + j(0), X1, Y0, rad(0)); c.closePath();
  };
  c.fillStyle = mixHex(face, C.stoneEdge, 0.6); blob(0, 0, 0, 0); c.fill();
  c.fillStyle = face; blob(0.8, 0.7, 1.5, 1.6); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.2)'; c.beginPath(); c.ellipse(x0 + (x1 - x0) * 0.42, y0 + 2.6, Math.max(1.5, (x1 - x0) * 0.27), 1.2, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(16,8,36,0.12)'; c.beginPath(); c.ellipse(x0 + (x1 - x0) * 0.6, y1 - 3.2, (x1 - x0) * 0.3, 1.4, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(16,8,36,0.3)';
  for (let i = 0; i < 2; i++) { circleOn(c, x0 + 3 + ((q >>> (i * 5 + 9)) % Math.max(1, (x1 - x0 - 6) | 0)), y0 + 4.5 + ((q >>> (i * 4 + 19)) % Math.max(1, (y1 - y0 - 8) | 0)), 0.6); c.fill(); }
  if ((q >>> 12) % 13 === 0) { c.strokeStyle = 'rgba(16,8,36,0.4)'; c.lineWidth = 0.7; const cx = x0 + (x1 - x0) * 0.55; c.beginPath(); c.moveTo(cx, y0 + 1); c.lineTo(cx - 1.4, y0 + 5); c.lineTo(cx + 0.6, y1 - 2); c.stroke(); }
  if ((q >>> 15) % 9 === 0) { c.fillStyle = mixCol(C.grassDark, face, 0.45); c.beginPath(); c.ellipse(x0 + 4 + (q >>> 18) % 6, y0 + 1.5, 2.8, 1.2, 0, 0, Math.PI * 2); c.fill(); }
}
// the casino trim on a brick ledge's top: a gold rail with a groove and a lit top, marquee bulbs in sockets every
// 15 px (warm white, pink and blue in turn), rivets, gold beads hanging below, and rounded end caps
function slTrim(c, L, R, px) {
  const g = C.grass, gd = C.grassDark, out = mixHex(gd, '#2a1400', 0.45), x0 = L ? -1.2 : 0, x1 = R ? T + 1.2 : T + 0.6, w = x1 - x0;
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(0, 9.5, T, 5);
  for (let i = 0; i < 6; i++) {
    const bx = 2.5 + i * 5; if ((L && bx < 3) || (R && bx > T - 3)) continue;
    c.fillStyle = out; circleOn(c, bx, 10.2, 2.4); c.fill();
    c.fillStyle = gd; circleOn(c, bx, 9.9, 1.7); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.45)'; circleOn(c, bx - 0.6, 9.3, 0.55); c.fill();
  }
  const o0 = L ? x0 - 0.6 : 0, o1 = R ? x1 + 0.6 : T + 0.6;
  c.fillStyle = out; rrOn(c, o0, -0.6, o1 - o0, 10.4, L || R ? 2.2 : 0.1); c.fill();
  if (!L) c.fillRect(0, -0.6, 3, 10.4);
  if (!R) c.fillRect(T - 2.4, -0.6, 3, 10.4);
  c.fillStyle = gd; c.fillRect(x0, 0, w, 9.2);
  c.fillStyle = g; c.fillRect(x0, 0, w, 6.4);
  c.fillStyle = tint(g, 0.5); c.fillRect(x0, 0, w, 1.5);
  c.fillStyle = mixHex(g, gd, 0.65); c.fillRect(x0, 3.2, w, 0.8);
  c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(x0, 4, w, 0.6);
  c.fillStyle = 'rgba(80,40,0,0.18)'; c.fillRect(x0, 8, w, 1.2);
  for (const rx of [0, 15]) {
    if ((L && rx === 0)) continue;
    c.fillStyle = out; circleOn(c, rx, 6.9, 1.1); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)'; circleOn(c, rx - 0.35, 6.5, 0.4); c.fill();
  }
  for (let i = 0; i < 2; i++) {
    const bx = 7.5 + i * 15, col = ['#fff4c2', '#ffd1e6', '#c8f6ff'][(px * 2 + i) % 3];
    c.fillStyle = 'rgba(255,240,200,0.35)'; circleOn(c, bx, 6.2, 3.4); c.fill();
    c.fillStyle = out; circleOn(c, bx, 6.4, 2.4); c.fill();
    c.fillStyle = col; circleOn(c, bx, 6.1, 1.75); c.fill();
    c.fillStyle = '#ffffff'; circleOn(c, bx - 0.6, 5.5, 0.65); c.fill();
  }
  for (const [ex, on] of [[x0, L], [x1, R]]) {
    if (!on) continue;
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(ex + (ex < 1 ? 0.4 : -1.6), 0.8, 1.2, 7);
  }
}
// the vault floor on a ledge's top: a polished slab (a lit lip, a soft reflection, a brass inlay line, joints that
// fall mid-tile so the floor reads as slabs, not tiles) over a row of dentils and the shadow it throws on the wall
function slSlab(c, L, R, px) {
  const g = C.grass, gd = C.grassDark, out = C.stoneEdge, x0 = L ? -1.5 : 0, x1 = R ? T + 1.5 : T + 0.6, w = x1 - x0;
  c.fillStyle = 'rgba(0,0,0,0.24)'; c.fillRect(0, 12, T, 4.5);
  c.fillStyle = out; c.fillRect(L ? 1 : 0, 8, (R ? T - 1 : T + 0.6) - (L ? 1 : 0), 4.8);
  for (let i = 0; i < 5; i++) {
    const dx = 1.3 + i * 6; if ((L && dx < 3) || (R && dx > T - 5)) continue;
    c.fillStyle = gd; c.fillRect(dx, 8.4, 3.6, 3.8);
    c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(dx, 8.4, 3.6, 0.8);
    c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(dx + 2.6, 9.2, 1, 3);
  }
  const o0 = L ? x0 - 0.6 : 0, o1 = R ? x1 + 0.6 : T + 0.6;
  c.fillStyle = out; rrOn(c, o0, -0.6, o1 - o0, 9.6, L || R ? 1.8 : 0.1); c.fill();
  if (!L) c.fillRect(0, -0.6, 3, 9.6);
  if (!R) c.fillRect(T - 2.4, -0.6, 3, 9.6);
  const gr = c.createLinearGradient(0, 0, 0, 8.2);
  gr.addColorStop(0, tint(g, 0.12)); gr.addColorStop(1, gd);
  c.fillStyle = gr; c.fillRect(x0, 0, w, 8.2);
  c.fillStyle = tint(g, 0.55); c.fillRect(x0, 0, w, 1.3);
  c.fillStyle = 'rgba(255,255,255,0.13)';
  const rx = 4 + (px * 11) % 16;
  c.beginPath(); c.moveTo(rx, 1.4); c.lineTo(rx + 5, 1.4); c.lineTo(rx + 2.5, 4.4); c.lineTo(rx - 2.5, 4.4); c.closePath(); c.fill();
  c.fillStyle = mixCol('#e8c36a', g, 0.3); c.fillRect(x0, 5.3, w, 0.9);
  c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(x0, 5.3, w, 0.35);
  c.fillStyle = out; c.fillRect(14.6, 0.5, 0.9, 7.7);
  c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(15.5, 1.4, 0.7, 6.6);
  if (px % 3 === 1) {   // a faint vein in the polished stone
    c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 0.6;
    c.beginPath(); c.moveTo(18, 2.2); c.quadraticCurveTo(22, 3.6, 25, 2.6); c.quadraticCurveTo(27, 2, 29.5, 3.4); c.stroke();
  }
  for (const [ex, on] of [[x0, L], [x1, R]]) {
    if (!on) continue;
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(ex + (ex < 1 ? 0.3 : -1.5), 1, 1.2, 6.4);
  }
}
function drawSpikes(x, y) {
  if (artPlain()) {
    for (let i = 0; i < 3; i++) {
      const sx = x + i * 10;
      ctx.fillStyle = C.spike;
      ctx.beginPath(); ctx.moveTo(sx, y + T); ctx.lineTo(sx + 5, y + 14); ctx.lineTo(sx + 10, y + T); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.spikeHi;
      ctx.beginPath(); ctx.moveTo(sx + 5, y + 14); ctx.lineTo(sx + 7, y + 22); ctx.lineTo(sx + 5, y + 21); ctx.closePath(); ctx.fill();
    }
    return;
  }
  // (rich props pass) a bolted base plate and three cone spikes with a lit left face, a shaded right face, a collar,
  // an outline in their own dark shade and a bright tip; drawn once per theme into a picture and copied
  const sp = artSprite('spk' + C.spike + C.spikeHi, T, T, 0, 0, c => paintSpikes(c));
  blitSprite(sp, x, y);
}
function paintSpikes(c) {
  const sc = C.spike, out = mixCol(sc, '#05050f', 0.45), lit = mixCol(sc, '#ffffff', 0.2), dk = mixCol(sc, '#05050f', 0.25);
  // the plate
  c.fillStyle = out; rrOn(c, -0.3, T - 5.2, T + 0.6, 5.2, 1.6); c.fill();
  c.fillStyle = mixCol(sc, '#ffffff', 0.1); rrOn(c, 0.6, T - 4.5, T - 1.2, 3.8, 1.2); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(1, T - 4.4, T - 2, 0.9);
  for (let i = 0; i < 3; i++) {
    const sx = i * 10;
    // cone: outline first, then the lit and the shaded face
    c.fillStyle = out;
    c.beginPath(); c.moveTo(sx - 0.2, T - 3.6); c.lineTo(sx + 5, 11.2); c.lineTo(sx + 10.2, T - 3.6); c.closePath(); c.fill();
    c.fillStyle = lit;
    c.beginPath(); c.moveTo(sx + 1, T - 4.2); c.lineTo(sx + 5, 12.6); c.lineTo(sx + 5.4, T - 4.2); c.closePath(); c.fill();
    c.fillStyle = dk;
    c.beginPath(); c.moveTo(sx + 5, 12.6); c.lineTo(sx + 9, T - 4.2); c.lineTo(sx + 5.4, T - 4.2); c.closePath(); c.fill();
    // a lit edge down the left face, a collar ring at the foot and a bright tip
    c.strokeStyle = mixCol(C.spikeHi, sc, 0.35); c.lineWidth = 0.9; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sx + 4.6, 14); c.lineTo(sx + 2, T - 5.2); c.stroke();
    c.fillStyle = out; c.fillRect(sx + 1.6, T - 6.4, 6.8, 1.6);
    c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(sx + 1.8, T - 6.4, 3, 0.7);
    c.fillStyle = C.spikeHi; circleOn(c, sx + 5, 13.2, 1.05); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(sx + 3.9, 15, 0.8, 3.2);
  }
  // rivets between the spikes
  for (const rx of [10, 20]) {
    c.fillStyle = out; circleOn(c, rx, T - 2.6, 1.3); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.45)'; circleOn(c, rx - 0.4, T - 3, 0.5); c.fill();
  }
}
function drawPlank(x, y, tx, ty) {
  const lEnd = tile(tx - 1, ty) !== '=', rEnd = tile(tx + 1, ty) !== '=';
  if (artPlain()) {
    ctx.fillStyle = C.plankDark; ctx.fillRect(x, y + 2, T, 9);
    ctx.fillStyle = C.plank; ctx.fillRect(x, y, T, 7);
    ctx.fillStyle = C.plankDark; circle(x + 5, y + 4, 1.4); ctx.fill(); circle(x + T - 5, y + 4, 1.4); ctx.fill();
    if (lEnd) { ctx.fillStyle = C.plankDark; ctx.fillRect(x + 3, y + 10, 3, 8); }
    if (rEnd) { ctx.fillStyle = C.plankDark; ctx.fillRect(x + T - 6, y + 10, 3, 8); }
    return;
  }
  // (rich props pass) a board with an outline, grain, a knot, nails, a seam between boards, end grain on the ends and
  // a post and brace with a bolt under each end; drawn once per look into a picture and copied
  const v = hash(tx, ty) % 6, look = plankLook();
  const sp = artSprite('pl' + look + C.plank + C.plankDark + (look ? C.rope + C.ropeDark : '') + (lEnd ? 1 : 0) + (rEnd ? 1 : 0) + v, T + 8, 24, 4, 3,
    c => (look === 'casino' ? paintPlankCasino(c, lEnd, rEnd, hash(v * 13 + 5, 77)) : paintPlank(c, lEnd, rEnd, hash(v * 13 + 5, 77))));
  blitSprite(sp, x, y);
}
function paintPlank(c, lEnd, rEnd, h) {
  // each board has its own tone (a little lighter, darker or warmer), so a ledge reads as boards laid side by side
  const tone = h % 4, pl = tone === 1 ? mixHex(C.plank, '#ffffff', 0.11) : tone === 2 ? mixHex(C.plank, '#141428', 0.09) : tone === 3 ? mixHex(C.plank, '#c8803a', 0.22) : C.plank, pd = C.plankDark, out = mixCol(pd, '#140c08', 0.42), x0 = lEnd ? 1 : -0.4, x1 = rEnd ? T - 1 : T + 0.4;
  // the posts and braces under the ends (behind the board)
  const bracket = (px, dir) => {
    c.fillStyle = out; c.fillRect(px - 0.8, 8, 4.6, 11.5);
    c.beginPath(); c.moveTo(px + (dir > 0 ? 3.8 : -0.8), 8); c.lineTo(px + (dir > 0 ? 11.5 : -8.5), 8); c.lineTo(px + (dir > 0 ? 3.8 : -0.8), 16.5); c.closePath(); c.fill();
    c.fillStyle = pd; c.fillRect(px, 8, 3, 10.5);
    c.beginPath(); c.moveTo(px + (dir > 0 ? 3 : 0), 9); c.lineTo(px + (dir > 0 ? 9.5 : -6.5), 9); c.lineTo(px + (dir > 0 ? 3 : 0), 14.8); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(px + 0.2, 9, 0.9, 9.5);
    c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(px + 2, 9, 1, 9.5);
    c.fillStyle = mixCol('#9aa0b8', pd, 0.25); circleOn(c, px + 1.5, 15.8, 1.1); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)'; circleOn(c, px + 1.2, 15.4, 0.4); c.fill();
  };
  if (lEnd) bracket(3, 1);
  if (rEnd) bracket(T - 6, -1);
  // a soft shadow under the board
  // (mid boards butt their shadows edge to edge, so a long ledge throws one unbroken shadow)
  c.fillStyle = 'rgba(0,0,0,0.13)'; c.fillRect(lEnd ? x0 + 1 : 0, 11, (rEnd ? x1 - 1 : T) - (lEnd ? x0 + 1 : 0), 2.6);
  // outline, the shaded front edge, the face and its lit top
  c.fillStyle = out; rrOn(c, x0 - 0.8, -0.8, x1 - x0 + 1.6, 12.4, lEnd || rEnd ? 2.8 : 0.1); c.fill();
  if (!lEnd) c.fillRect(-0.4, -0.8, 2, 12.4);
  if (!rEnd) c.fillRect(T - 1.6, -0.8, 2, 12.4);
  c.fillStyle = pd; c.fillRect(x0, 6.8, x1 - x0, 4.3);
  c.fillStyle = mixCol(pd, pl, 0.35); c.fillRect(x0, 6.8, x1 - x0, 1);
  c.fillStyle = pl; c.fillRect(x0, 0, x1 - x0, 7);
  c.fillStyle = tint(pl, 0.32); c.fillRect(x0, 0, x1 - x0, 1.4);
  c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(x0, 5.6, x1 - x0, 1.2);
  // grain: two long wavy lines and a short streak
  c.strokeStyle = shade(pl, 0.2); c.lineWidth = 0.75;
  c.beginPath(); c.moveTo(x0 + 1, 2.6 + (h % 2) * 0.6); c.bezierCurveTo(9, 1.6 + (h % 3) * 0.5, 18, 3.8, x1 - 1, 2.8 + ((h >>> 2) % 2) * 0.6); c.stroke();
  c.beginPath(); c.moveTo(x0 + 1, 4.6); c.bezierCurveTo(10, 5.4 - ((h >>> 3) % 2), 20, 4, x1 - 1, 4.9); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.16)'; c.beginPath(); c.moveTo(4 + (h >>> 5) % 8, 3.6); c.lineTo(12 + (h >>> 5) % 8, 3.4); c.stroke();
  // a knot (two rings round a dark heart) on some boards
  if (h % 3 === 0) {
    const kx = 9 + (h >>> 4) % 12;
    c.fillStyle = shade(pl, 0.12); c.beginPath(); c.ellipse(kx, 3.8, 3, 1.7, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = shade(pl, 0.3); c.lineWidth = 0.7; c.beginPath(); c.ellipse(kx, 3.8, 2.3, 1.2, 0, 0, Math.PI * 2); c.stroke();
    c.fillStyle = shade(pd, 0.2); c.beginPath(); c.ellipse(kx + 0.2, 3.9, 0.9, 0.55, 0, 0, Math.PI * 2); c.fill();
  }
  // a little chip out of the front edge now and then
  if ((h >>> 7) % 4 === 0) { c.fillStyle = shade(pd, 0.25); const cx = 7 + (h >>> 9) % 16; c.beginPath(); c.moveTo(cx, 11); c.lineTo(cx + 1.5, 9); c.lineTo(cx + 3.5, 11); c.closePath(); c.fill(); }
  // the seam where this board meets the next
  if (!rEnd) { c.fillStyle = out; c.fillRect(T - 0.8, 0, 0.9, 11); c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(T - 1.8, 0.4, 0.9, 6); }
  // end grain on a board's ends
  if (lEnd || rEnd) {
    c.strokeStyle = shade(pd, 0.15); c.lineWidth = 0.6;
    for (const [ex, d] of [[lEnd ? x0 + 0.5 : null, 1], [rEnd ? x1 - 0.5 : null, -1]]) {
      if (ex === null) continue;
      for (let r = 1.4; r < 5; r += 1.6) { c.beginPath(); c.arc(ex, 6.5, r, d > 0 ? -Math.PI / 2 : Math.PI / 2, d > 0 ? Math.PI / 2 : Math.PI * 1.5); c.stroke(); }
    }
  }
  // nails: a dark head with a lit dot and a tiny rust stain
  for (const nx of [5, T - 5]) {
    c.fillStyle = 'rgba(120,60,30,0.18)'; circleOn(c, nx + 0.5, 4.8, 2); c.fill();
    c.fillStyle = mixCol('#5a5f78', pd, 0.3); circleOn(c, nx, 4, 1.35); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.55)'; circleOn(c, nx - 0.45, 3.55, 0.5); c.fill();
  }
}
// (rich props pass 2) a world can give its planks a look of its own, like the stone: theme: { plankLook }, else
// PLANK_LOOKS by world. 'casino' (World 8): a lacquered shelf with a brass edge band, rivets, a diamond inlay, brass
// end caps and curled brass brackets, on exactly the plain plank's outline
const PLANK_LOOKS = { 7: 'casino' };
function plankLook() { return C.plankLook || PLANK_LOOKS[THEME_W] || ''; }
function paintPlankCasino(c, lEnd, rEnd, h) {
  const tone = h % 3, pl = mixHex(C.plank, '#8a2e22', 0.22 + tone * 0.05), pd = C.plankDark, out = mixHex(pd, '#140c08', 0.42);
  const br = mixHex(C.rope || '#ffd75e', '#e8a530', 0.25), brd = mixHex(C.ropeDark || '#8a5a12', '#140c08', 0.15), x0 = lEnd ? 1 : -0.4, x1 = rEnd ? T - 1 : T + 0.4;
  // curled brass brackets under the ends (behind the board): a post with a ball foot and a scroll brace
  const bracket = (px, dir) => {
    c.lineCap = 'round';
    for (const [col, lw] of [[brd, 3.4], [br, 1.8]]) {
      c.strokeStyle = col; c.lineWidth = lw;
      c.beginPath(); c.moveTo(px + 1.5, 9); c.lineTo(px + 1.5, 16.5); c.stroke();
      c.beginPath(); c.moveTo(px + 1.5, 15.5); c.bezierCurveTo(px + 1.5 + dir * 2, 10.5, px + 1.5 + dir * 7, 13, px + 1.5 + dir * 8.5, 9.5); c.stroke();
      c.beginPath(); c.arc(px + 1.5 + dir * 4.2, 13.2, 1.6, 0, Math.PI * 2); c.stroke();
    }
    c.fillStyle = brd; circleOn(c, px + 1.5, 18, 2.3); c.fill();
    c.fillStyle = br; circleOn(c, px + 1.5, 17.7, 1.5); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.7)'; circleOn(c, px + 1, 17.2, 0.55); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(px + 0.9, 9.5, 0.7, 6);
  };
  if (lEnd) bracket(3, 1);
  if (rEnd) bracket(T - 6, -1);
  c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(lEnd ? x0 + 1 : 0, 11.4, (rEnd ? x1 - 1 : T) - (lEnd ? x0 + 1 : 0), 2.6);
  // outline, the lacquered top board with a deep glossy shine, the brass edge band along the front
  c.fillStyle = out; rrOn(c, x0 - 0.8, -0.8, x1 - x0 + 1.6, 12.4, lEnd || rEnd ? 2.8 : 0.1); c.fill();
  if (!lEnd) c.fillRect(-0.4, -0.8, 2, 12.4);
  if (!rEnd) c.fillRect(T - 1.6, -0.8, 2, 12.4);
  c.fillStyle = pl; c.fillRect(x0, 0, x1 - x0, 7);
  c.fillStyle = 'rgba(40,10,10,0.14)'; c.fillRect(x0, 4.6, x1 - x0, 2.4);
  c.strokeStyle = shade(pl, 0.22); c.lineWidth = 0.6;
  c.beginPath(); c.moveTo(x0 + 1, 3 + (h % 2) * 0.5); c.bezierCurveTo(9, 2 + (h % 3) * 0.4, 19, 4.2, x1 - 1, 3.2); c.stroke();
  c.beginPath(); c.moveTo(x0 + 1, 5.2); c.bezierCurveTo(11, 5.8, 21, 4.6, x1 - 1, 5.4); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.42)'; c.fillRect(x0, 0, x1 - x0, 1.1);
  c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(x0 + 2 + (h >>> 4) % 6, 1.7, 9 + (h >>> 7) % 5, 0.8);
  // a little inlay on the board: a gold diamond (or, now and then, a round chip)
  const ix = 15 + ((h >>> 9) % 3 - 1) * 2;
  c.fillStyle = brd;
  if ((h >>> 11) % 3) { c.beginPath(); c.moveTo(ix, 1.3); c.lineTo(ix + 2.6, 3.6); c.lineTo(ix, 5.9); c.lineTo(ix - 2.6, 3.6); c.closePath(); c.fill(); c.fillStyle = br; c.beginPath(); c.moveTo(ix, 2); c.lineTo(ix + 1.8, 3.6); c.lineTo(ix, 5.2); c.lineTo(ix - 1.8, 3.6); c.closePath(); c.fill(); }
  else { circleOn(c, ix, 3.6, 2.2); c.fill(); c.fillStyle = br; circleOn(c, ix, 3.6, 1.5); c.fill(); c.fillStyle = brd; circleOn(c, ix, 3.6, 0.6); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,0.7)'; circleOn(c, ix - 0.6, 2.9, 0.45); c.fill();
  c.fillStyle = brd; c.fillRect(x0, 7, x1 - x0, 4.3);
  c.fillStyle = br; c.fillRect(x0, 7.4, x1 - x0, 3);
  c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(x0, 7.4, x1 - x0, 0.8);
  c.fillStyle = 'rgba(80,40,0,0.25)'; c.fillRect(x0, 9.6, x1 - x0, 0.8);
  for (const rx of [5, 15, 25]) {
    if ((lEnd && rx < 4) || (rEnd && rx > T - 4)) continue;
    c.fillStyle = brd; circleOn(c, rx, 8.9, 0.95); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.65)'; circleOn(c, rx - 0.3, 8.6, 0.35); c.fill();
  }
  // the seam to the next board, and brass caps on the shelf's ends
  if (!rEnd) { c.fillStyle = out; c.fillRect(T - 0.8, 0, 0.9, 7); c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(T - 1.8, 0.4, 0.9, 5); }
  for (const [ex, on, d] of [[x0, lEnd, 1], [x1, rEnd, -1]]) {
    if (!on) continue;
    const cx = d > 0 ? ex : ex - 3.4;
    c.fillStyle = brd; rrOn(c, cx - 0.4, -0.4, 3.8, 11.6, 1.4); c.fill();
    c.fillStyle = br; rrOn(c, cx + 0.2, 0.2, 2.6, 10.4, 1); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(cx + 0.6, 0.8, 0.8, 9);
    c.fillStyle = brd; circleOn(c, cx + 1.5, 3.6, 0.7); c.fill();
  }
}
function drawColorBlockPlain(x, y, id, tx, ty) {
  const col = PCOL[id], dark = PDARK[id];
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = col; ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
  ctx.beginPath(); ctx.rect(x + 1, y + 1, T - 2, T - 2); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 4;
  for (let k = -T; k < T * 2; k += 12) { ctx.beginPath(); ctx.moveTo(x + k, y + T); ctx.lineTo(x + k + T, y); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, T - 2, T - 2);
  // a little face on the block says who it belongs to
  if ((tx + ty) % 3 === 0) { ctx.fillStyle = 'rgba(28,26,54,0.55)'; circle(x + 11, y + 13, 2); ctx.fill(); circle(x + 19, y + 13, 2); ctx.fill(); }
}
// (rich props pass) a team block: a dark rim, a lit top/left and a shaded bottom/right bevel, a sunken striped panel with
// the owner's sign (Pip's leaf, Bo's bear ears) or the little face, corner screws and a gloss; one picture per look
function drawColorBlock(x, y, id, tx, ty) {
  if (artPlain()) return drawColorBlockPlain(x, y, id, tx, ty);
  const face = (tx + ty) % 3 === 0;
  const sp = artSprite('cb' + id + (face ? 1 : 0), T, T, 0, 0, c => paintColorBlock(c, id, face));
  const a = ctx.globalAlpha; ctx.globalAlpha = a * 0.95; blitSprite(sp, x, y); ctx.globalAlpha = a;
}
function paintColorBlock(c, id, face) {
  const col = PCOL[id], dark = PDARK[id], lo = shade(col, 0.2), hi = tint(col, 0.4);
  c.fillStyle = dark; rrOn(c, 0.6, 0.6, T - 1.2, T - 1.2, 4); c.fill();
  c.fillStyle = lo; rrOn(c, 2.2, 2.2, T - 4.4, T - 4.4, 3); c.fill();
  c.fillStyle = hi; rrOn(c, 2.2, 2.2, T - 6.2, T - 6.2, 3); c.fill();
  c.fillStyle = col; rrOn(c, 4.2, 4.2, T - 8.4, T - 8.4, 2.4); c.fill();
  // the sunken panel: stripes, a shaded top/left inner edge and a lit bottom/right one
  c.save(); rrOn(c, 7, 7, T - 14, T - 14, 2); c.clip();
  c.fillStyle = shade(col, 0.07); c.fillRect(7, 7, T - 14, T - 14);
  c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 2.6;
  for (let k = -T; k < T * 2; k += 7) { c.beginPath(); c.moveTo(k, T); c.lineTo(k + T, 0); c.stroke(); }
  c.fillStyle = shade(col, 0.3); c.fillRect(7, 7, T - 14, 1.4); c.fillRect(7, 7, 1.4, T - 14);
  c.fillStyle = tint(col, 0.35); c.fillRect(7, T - 8.4, T - 14, 1.4); c.fillRect(T - 8.4, 7, 1.4, T - 14);
  c.restore();
  // the owner's sign, embossed (a dark copy under a light one)
  const sign = (dx, dy, fill) => {
    c.fillStyle = fill;
    if (face) {
      circleOn(c, 11.5 + dx, 14 + dy, 1.9); c.fill(); circleOn(c, 18.5 + dx, 14 + dy, 1.9); c.fill();
      c.strokeStyle = fill; c.lineWidth = 1.3; c.lineCap = 'round'; c.beginPath(); c.arc(15 + dx, 16.5 + dy, 2.6, 0.35, Math.PI - 0.35); c.stroke();
    } else if (id === 0) {
      c.beginPath(); c.ellipse(15 + dx, 15 + dy, 4.8, 2.6, -0.6, 0, Math.PI * 2); c.fill();
    } else {
      circleOn(c, 15 + dx, 16 + dy, 3.6); c.fill(); circleOn(c, 11.6 + dx, 12.6 + dy, 1.8); c.fill(); circleOn(c, 18.4 + dx, 12.6 + dy, 1.8); c.fill();
    }
  };
  if (face) sign(0, 0, 'rgba(28,26,54,0.6)');
  else {
    sign(0.8, 0.8, shade(col, 0.4)); sign(0, 0, tint(col, 0.6));
    if (id === 0) { c.strokeStyle = shade(col, 0.25); c.lineWidth = 0.8; c.beginPath(); c.moveTo(11.5, 17.2); c.lineTo(18.5, 12.8); c.stroke(); }
  }
  // corner screws
  for (const [sx, sy] of [[4.6, 4.6], [T - 4.6, 4.6], [4.6, T - 4.6], [T - 4.6, T - 4.6]]) {
    c.fillStyle = dark; circleOn(c, sx, sy, 1.35); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.55)'; circleOn(c, sx - 0.4, sy - 0.4, 0.5); c.fill();
  }
  // gloss on the top-left corner
  c.fillStyle = 'rgba(255,255,255,0.32)';
  c.beginPath(); c.moveTo(3, 9); c.quadraticCurveTo(3, 3, 9, 3); c.lineTo(15, 3); c.quadraticCurveTo(6.5, 4.5, 4.5, 13); c.closePath(); c.fill();
}
function drawSwitchTile(ch, x, y) {
  const s = G.level.sw[ch], col = LETTER_COL[s.plate] || C.gold;
  if (s.type === 'gate') {
    const a = s.anim; // 0 closed, 1 open
    if (!artPlain()) { drawGateRich(ch, x, y, col, a); return; }
    if (a < 0.99) {
      ctx.save(); ctx.globalAlpha = 1 - a * 0.85;
      const shrink = a * (T - 4);
      ctx.fillStyle = 'rgba(28,26,54,0.35)'; ctx.fillRect(x + 2, y, T - 4, T - shrink);
      ctx.fillStyle = col;
      for (let i = 0; i < 3; i++) { rr(x + 4 + i * 8.5, y, 5, T - shrink, 2); ctx.fill(); }
      ctx.fillRect(x + 2, y + 12 - shrink * 0.4, T - 4, 4);
      ctx.restore();
    }
    ctx.strokeStyle = col; ctx.globalAlpha = 0.5; ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, T - 2, T - 2); ctx.globalAlpha = 1;
  } else {
    // bridges fill their whole tile, because that's how solid they are
    const a = s.anim;
    if (a > 0.02 && !artPlain()) {
      // (rich props pass) laid bricks: one picture per look, faded in with the bridge
      const tx = Math.round(x / T), ty = Math.round(y / T), v = hash(tx, ty) % 4;
      const top = tile(tx, ty - 1) !== ch, bot = tile(tx, ty + 1) !== ch;
      const sp = artSprite('br' + col + v + (top ? 1 : 0) + (bot ? 1 : 0) + (tx & 1), T, T, 0, 0, c => paintBridge(c, col, hash(v * 31 + 7, 5 + (tx & 1)), top, bot, tx & 1));
      const ga = ctx.globalAlpha; ctx.globalAlpha = ga * a; blitSprite(sp, x, y); ctx.globalAlpha = ga;
    } else if (a > 0.02) {
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = col; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = 'rgba(28,26,54,0.22)';
      ctx.fillRect(x, y + 10, T, 2); ctx.fillRect(x, y + 20, T, 2); ctx.fillRect(x + T - 2, y, 2, T);
      if (!artPlain()) { ctx.fillRect(x + 14, y, 2, 10); ctx.fillRect(x + 6, y + 12, 2, 8); ctx.fillRect(x + 21, y + 12, 2, 8); ctx.fillRect(x + 14, y + 22, 2, 8); ctx.fillStyle = 'rgba(28,26,54,0.3)'; ctx.fillRect(x, y + T - 2, T, 2); }
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x + 2, y + 2, T - 4, 3);
      ctx.restore();
    }
    if (a < 0.98 && !artPlain()) {
      // (rich props pass) the bridge still to come: a faint print of its bricks, dashed only round the outside of the
      // whole span (not tile by tile) with a corner tick at each end, so it reads as one bridge waiting to be built
      const tx = Math.round(x / T), ty = Math.round(y / T), v = hash(tx, ty) % 4;
      const top = tile(tx, ty - 1) !== ch, bot = tile(tx, ty + 1) !== ch, lf = tile(tx - 1, ty) !== ch, rt = tile(tx + 1, ty) !== ch;
      const sp = artSprite('br' + col + v + (top ? 1 : 0) + (bot ? 1 : 0) + (tx & 1), T, T, 0, 0, c => paintBridge(c, col, hash(v * 31 + 7, 5 + (tx & 1)), top, bot, tx & 1));
      ctx.save(); const ga = ctx.globalAlpha * (1 - a);
      ctx.globalAlpha = ga * 0.2; blitSprite(sp, x, y);
      ctx.globalAlpha = ga * 0.9; ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.setLineDash([5, 4]);
      ctx.beginPath();
      if (top) { ctx.moveTo(x, y + 1.5); ctx.lineTo(x + T, y + 1.5); }
      if (bot) { ctx.moveTo(x, y + T - 1.5); ctx.lineTo(x + T, y + T - 1.5); }
      if (lf) { ctx.moveTo(x + 1.5, y); ctx.lineTo(x + 1.5, y + T); }
      if (rt) { ctx.moveTo(x + T - 1.5, y); ctx.lineTo(x + T - 1.5, y + T); }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = shade(col, 0.3); ctx.lineWidth = 2.6; ctx.beginPath();
      if (lf && top) { ctx.moveTo(x + 1.5, y + 7); ctx.lineTo(x + 1.5, y + 1.5); ctx.lineTo(x + 7, y + 1.5); }
      if (rt && top) { ctx.moveTo(x + T - 7, y + 1.5); ctx.lineTo(x + T - 1.5, y + 1.5); ctx.lineTo(x + T - 1.5, y + 7); }
      if (lf && bot) { ctx.moveTo(x + 1.5, y + T - 7); ctx.lineTo(x + 1.5, y + T - 1.5); ctx.lineTo(x + 7, y + T - 1.5); }
      if (rt && bot) { ctx.moveTo(x + T - 7, y + T - 1.5); ctx.lineTo(x + T - 1.5, y + T - 1.5); ctx.lineTo(x + T - 1.5, y + T - 7); }
      ctx.stroke(); ctx.restore();
    } else if (a < 0.98) {
      ctx.save(); ctx.globalAlpha = 0.9 * (1 - a);
      ctx.fillStyle = 'rgba(255,143,199,0.18)'; ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]);
      ctx.strokeRect(x + 1.5, y + 1.5, T - 3, T - 3); ctx.restore();
    }
  }
}
// (rich props pass) one tile of a built bridge: three courses of bricks in running bond, each brick with its own tone, a
// lit top, a shaded foot and right end, specks, mortar lines; a capstone along the top and a shadow under the bottom
function paintBridge(c, col, h, top, bot) {
  const mort = shade(col, 0.42);
  c.fillStyle = mort; c.fillRect(0, 0, T + 0.4, T + 0.4);
  for (let r = 0; r < 3; r++) {
    const y0 = r * 10, odd = r % 2 === 1;
    const bricks = odd ? [[0, 7.5, 'L'], [7.5, 22.5, ''], [22.5, 30, 'R']] : [[0, 15, ''], [15, 30, '']];
    bricks.forEach(([b0, b1, half], k) => {
      const hh = h >>> (r * 4 + k * 2), tone = half ? col : (hh % 3 === 0 ? tint(col, 0.1) : hh % 3 === 1 ? shade(col, 0.07) : col);
      const xa = b0 + (half === 'L' ? 0 : 0.7), xb = b1 - (half === 'R' ? 0 : 0.7), ya = y0 + 0.7, yb = y0 + 10 - 0.7;
      c.fillStyle = shade(tone, 0.2); c.fillRect(xa, ya, xb - xa, yb - ya);
      c.fillStyle = tone; c.fillRect(xa, ya, xb - xa - (half === 'R' ? 0 : 1.6), yb - ya - 1.8);
      c.fillStyle = 'rgba(255,255,255,0.32)'; c.fillRect(xa, ya, xb - xa - (half === 'R' ? 0 : 1.6), 1.1);
      if (half !== 'L') { c.fillStyle = 'rgba(255,255,255,0.16)'; c.fillRect(xa, ya, 1, yb - ya - 1.8); }
      if ((hh >>> 5) % 3 === 0) { c.fillStyle = shade(tone, 0.25); circleOn(c, xa + 3 + (hh >>> 7) % Math.max(1, xb - xa - 6), ya + 3 + (hh >>> 9) % 4, 0.7); c.fill(); }
    });
  }
  if (top) {
    c.fillStyle = shade(col, 0.45); c.fillRect(0, 0, T + 0.4, 4.6);
    c.fillStyle = tint(col, 0.22); c.fillRect(0, 0, T + 0.4, 3.6);
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(0, 0, T + 0.4, 1);
    c.fillStyle = shade(col, 0.3); c.fillRect(14.6, 0, 0.8, 3.6);
  }
  if (bot) { c.fillStyle = 'rgba(28,26,54,0.3)'; c.fillRect(0, T - 2, T + 0.4, 2); }
}
// (rich props pass) a gate tile: a dark slot in a frame of rails, three round bars (lit left, shaded right, outlined,
// pointed at the bottom of the gate), a riveted crossbar and a lintel on the top tile; the bars slide up as it opens
function drawGateRich(ch, x, y, col, a) {
  const tx = Math.round(x / T), ty = Math.round(y / T), topEnd = tile(tx, ty - 1) !== ch, botEnd = tile(tx, ty + 1) !== ch;
  const dk = shade(col, 0.5), md = shade(col, 0.24), li = tint(col, 0.5);
  // the frame stays: two thin rails down the sides
  ctx.fillStyle = 'rgba(28,26,54,0.5)'; ctx.fillRect(x + 0.5, y, 2.6, T); ctx.fillRect(x + T - 3.1, y, 2.6, T);
  ctx.fillStyle = shade(col, 0.35); ctx.fillRect(x + 1, y, 1.6, T); ctx.fillRect(x + T - 2.6, y, 1.6, T);
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x + 1, y, 0.6, T);
  if (a < 0.99) {
    ctx.save(); ctx.globalAlpha *= 1 - a * 0.85;
    const shrink = a * (T - 4), hgt = T - shrink;
    ctx.fillStyle = 'rgba(28,26,54,0.35)'; ctx.fillRect(x + 3, y, T - 6, hgt);
    for (let i = 0; i < 3; i++) {
      const bx = x + 4.5 + i * 8, tip = botEnd ? Math.min(4, hgt) : 0, bh = hgt - tip;
      ctx.fillStyle = dk;
      ctx.beginPath(); ctx.moveTo(bx - 0.7, y); ctx.lineTo(bx + 5.7, y); ctx.lineTo(bx + 5.7, y + bh); if (tip) ctx.lineTo(bx + 2.5, y + hgt + 0.6); ctx.lineTo(bx - 0.7, y + bh); ctx.closePath(); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx + 5, y); ctx.lineTo(bx + 5, y + bh); if (tip) ctx.lineTo(bx + 2.5, y + hgt - 0.6); ctx.lineTo(bx, y + bh); ctx.closePath(); ctx.fill();
      ctx.fillStyle = md; ctx.fillRect(bx + 3.2, y, 1.8, bh);
      ctx.fillStyle = li; ctx.fillRect(bx + 0.8, y, 1.1, bh);
    }
    // the crossbar with a bolt on each bar
    const cy = y + 12 - shrink * 0.4;
    if (cy + 4 <= y + hgt + 0.5) {
      ctx.fillStyle = dk; ctx.fillRect(x + 3, cy - 0.7, T - 6, 5.4);
      ctx.fillStyle = col; ctx.fillRect(x + 3, cy, T - 6, 4);
      ctx.fillStyle = li; ctx.fillRect(x + 3, cy, T - 6, 1);
      ctx.fillStyle = md; ctx.fillRect(x + 3, cy + 3, T - 6, 1);
      for (let i = 0; i < 3; i++) { ctx.fillStyle = dk; circle(x + 7 + i * 8, cy + 2, 1.2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; circle(x + 6.7 + i * 8, cy + 1.6, 0.45); ctx.fill(); }
    }
    ctx.restore();
  }
  // a lintel over the top tile of the gate, with two rivets
  if (topEnd) {
    ctx.fillStyle = dk; rr(x + 0.5, y, T - 1, 5, 1.5); ctx.fill();
    ctx.fillStyle = md; rr(x + 1.2, y + 0.4, T - 2.4, 3.8, 1.2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 1.5, y + 0.6, T - 3, 0.9);
    for (const rx of [x + 4, x + T - 4]) { ctx.fillStyle = dk; circle(rx, y + 2.4, 1); ctx.fill(); }
  }
  ctx.strokeStyle = col; ctx.globalAlpha *= 0.35; ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.75, y + 0.75, T - 1.5, T - 1.5); ctx.globalAlpha = 1;
}
function drawPlateRich(pl) {
  const x = pl.x * T, y = pl.y * T, col = LETTER_COL[pl.letter] || C.gold;
  // a soft shadow, a metal bezel with two bolts, then the cap: shaded underside, face, lit band, gloss and a rim
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x + T / 2, y + 29.2, T / 2 + 0.5, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#14122a'; rr(x + 1.2, y + 24.2, T - 2.4, 6, 2.4); ctx.fill();
  ctx.fillStyle = '#3b3860'; rr(x + 2, y + 25, T - 4, 4.6, 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x + 3.5, y + 25.4, T - 7, 0.9);
  for (const bx of [x + 4.2, x + T - 4.2]) { ctx.fillStyle = '#8f8cad'; circle(bx, y + 27.6, 1.05); ctx.fill(); ctx.fillStyle = '#14122a'; ctx.fillRect(bx - 0.7, y + 27.4, 1.4, 0.4); }
  const top = pl.down ? y + 23 : y + 19, dk = shade(col, 0.45);
  ctx.fillStyle = dk; rr(x + 4.3, top - 0.7, T - 8.6, (y + 26) - top + 0.7, 3.4); ctx.fill();
  ctx.fillStyle = shade(col, 0.25); rr(x + 5, top, T - 10, (y + 26) - top, 3); ctx.fill();
  ctx.fillStyle = col; rr(x + 5, top, T - 10, (y + 26) - top - 2, 3); ctx.fill();
  ctx.fillStyle = tint(col, 0.45); rr(x + 7, top + 0.8, T - 14, 1.8, 0.9); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; circle(x + 8.5, top + 1.6, 0.9); ctx.fill();
  if (!pl.down) {
    ctx.fillStyle = shade(col, 0.15); ctx.fillRect(x + 6, top + 3.6, T - 12, 0.8);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.18 + 0.12 * Math.sin(G.clock * 3 + x)) + ')'; ctx.beginPath(); ctx.ellipse(x + T / 2, top - 1, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
  } else { ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x + 6, top - 0.2, T - 12, 0.6); }
}
function drawPlate(pl) {
  if (!artPlain()) return drawPlateRich(pl);
  const x = pl.x * T, y = pl.y * T, col = LETTER_COL[pl.letter] || C.gold;
  const plain = artPlain();
  if (!plain) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x + T / 2, y + 29, T / 2, 2.5, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = C.ink; rr(x + 2, y + 25, T - 4, 5, 2); ctx.fill();
  if (!plain) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x + 4, y + 25.5, T - 8, 1); }
  const top = pl.down ? y + 23 : y + 19;
  if (!plain) { ctx.fillStyle = shade(col, 0.3); rr(x + 5, top + 1.5, T - 10, (y + 26) - top - 1.5, 3); ctx.fill(); }
  ctx.fillStyle = col; rr(x + 5, top, T - 10, (y + 26) - top - (plain ? 0 : 2), 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x + 8, top + 1, T - 16, 2);
  if (!plain && !pl.down) { ctx.fillStyle = 'rgba(255,255,255,' + (0.18 + 0.12 * Math.sin(G.clock * 3 + x)) + ')'; ctx.beginPath(); ctx.ellipse(x + T / 2, top - 1, 9, 3, 0, 0, Math.PI * 2); ctx.fill(); }
}
function drawDoor(d) {
  if (!artPlain()) return drawDoorRich(d);
  const L = G.level, locked = L.key && !L.key.got;
  const { x, y, w, h } = d;
  if (!artPlain()) { ctx.fillStyle = 'rgba(255,215,90,' + (0.16 + 0.06 * Math.sin(G.clock * 2.5)) + ')'; rr(x - 9, y - 12, w + 18, h + 12, 20); ctx.fill(); }
  ctx.fillStyle = C.goldDark; rr(x - 3, y - 6, w + 6, h + 6, 14); ctx.fill();
  ctx.fillStyle = C.gold; rr(x - 1, y - 4, w + 2, h + 4, 12); ctx.fill();
  if (!artPlain()) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; rr(x + 1, y - 3, w - 2, 3, 1.5); ctx.fill(); ctx.fillStyle = C.goldDark; for (const sx of [x + 0.5, x + w - 2.5]) for (let k = 0; k < 3; k++) { circle(sx + 1, y + 8 + k * ((h - 16) / 2), 1.2); ctx.fill(); } }
  if (locked) { ctx.fillStyle = C.doorIn; }
  else {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#fff2c4'); g.addColorStop(1, C.glow); ctx.fillStyle = g;
  }
  rr(x + 4, y + 2, w - 8, h - 2, 9); ctx.fill();
  if (locked) {
    const cx = x + w / 2, cy = y + h / 2 + 4;
    ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy - 6, 6, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = C.gold; rr(cx - 9, cy - 6, 18, 14, 3); ctx.fill();
    ctx.fillStyle = C.doorIn; circle(cx, cy, 2.5); ctx.fill();
  }
  for (let i = 0; i < 2; i++) {
    const cx = x + w / 2 + (i === 0 ? -9 : 9), cy = y - 16;
    circle(cx, cy, 6);
    if (G.doorIn[i]) { ctx.fillStyle = PCOL[i]; ctx.fill(); }
    else { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill(); ctx.strokeStyle = PCOL[i]; ctx.lineWidth = 2; ctx.stroke(); }
  }
}
// (rich props pass) the goal door: a ground shadow, a brass frame outlined in its own dark shade, lit on the top and
// left and shaded down the right, with riveted hinge straps, a keystone gem, an inner bevel round the glowing doorway
// (soft light rays inside; planks and a padlock while locked) and a brass threshold. The still parts are one picture
// per size and state; the glow, the twinkle and the two arrival rings are drawn live.
function drawDoorRich(d) {
  const L = G.level, locked = !!(L.key && !L.key.got), { x, y, w, h } = d;
  ctx.fillStyle = 'rgba(255,215,90,' + (0.16 + 0.06 * Math.sin(G.clock * 2.5)) + ')'; rr(x - 9, y - 12, w + 18, h + 12, 20); ctx.fill();
  const sp = artSprite('door' + w + 'x' + h + (locked ? 'L' : 'O') + C.gold + C.goldDark + C.doorIn + C.glow, w + 20, h + 16, 10, 12, c => paintDoor(c, w, h, locked));
  blitSprite(sp, x, y);
  if (!locked) {
    const tw = reduceMotion ? 0.5 : (Math.sin(G.clock * 2.6) + 1) / 2, sx = x + w * 0.68, sy = y + h * 0.32, r2 = 1.5 + tw * 2.5;
    ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.5 * tw) + ')';
    ctx.beginPath(); ctx.moveTo(sx, sy - r2); ctx.lineTo(sx + 0.7, sy - 0.7); ctx.lineTo(sx + r2, sy); ctx.lineTo(sx + 0.7, sy + 0.7); ctx.lineTo(sx, sy + r2); ctx.lineTo(sx - 0.7, sy + 0.7); ctx.lineTo(sx - r2, sy); ctx.lineTo(sx - 0.7, sy - 0.7); ctx.closePath(); ctx.fill();
  }
  for (let i = 0; i < 2; i++) {
    const cx = x + w / 2 + (i === 0 ? -9 : 9), cy = y - 16;
    circle(cx, cy, 6);
    if (G.doorIn[i]) { ctx.fillStyle = PCOL[i]; ctx.fill(); }
    else { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill(); ctx.strokeStyle = PCOL[i]; ctx.lineWidth = 2; ctx.stroke(); }
  }
}
function paintDoor(c, w, h, locked) {
  const gd = C.goldDark, gl = C.gold, out = shade(gd, 0.42), x = 0, y = 0;
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(x + w / 2, y + h, w / 2 + 9, 3.2, 0, 0, Math.PI * 2); c.fill();
  // the frame
  c.fillStyle = out; rrOn(c, x - 4.2, y - 7.2, w + 8.4, h + 7.2, 15); c.fill();
  c.fillStyle = gd; rrOn(c, x - 3, y - 6, w + 6, h + 6, 14); c.fill();
  c.fillStyle = gl; rrOn(c, x - 1.6, y - 4.6, w + 2.2, h + 4.6, 12.5); c.fill();
  c.save(); rrOn(c, x - 3, y - 6, w + 6, h + 6, 14); c.clip();
  c.fillStyle = 'rgba(120,70,0,0.28)'; c.fillRect(x + w - 3, y - 6, 7, h + 6);
  c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(x - 3, y - 6, w + 6, 2.4); c.fillRect(x - 3, y - 6, 2.2, h + 6);
  c.restore();
  // hinge straps with rivets on both posts
  for (const sx of [x - 1.4, x + w - 3.2]) for (let k = 0; k < 3; k++) {
    const sy = y + 6 + k * ((h - 14) / 2);
    c.fillStyle = shade(gd, 0.15); rrOn(c, sx, sy, 4.6, 5.4, 1.2); c.fill();
    c.fillStyle = out; circleOn(c, sx + 2.3, sy + 2.7, 1.2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.65)'; circleOn(c, sx + 1.9, sy + 2.3, 0.45); c.fill();
  }
  // the inner bevel and the doorway
  c.fillStyle = out; rrOn(c, x + 2.6, y + 0.6, w - 5.2, h - 0.6, 10.5); c.fill();
  c.fillStyle = shade(gd, 0.1); rrOn(c, x + 3.4, y + 1.4, w - 6.8, h - 1.4, 10); c.fill();
  if (locked) c.fillStyle = C.doorIn;
  else { const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#fff2c4'); g.addColorStop(1, C.glow); c.fillStyle = g; }
  rrOn(c, x + 4.4, y + 2.4, w - 8.8, h - 2.4, 9); c.fill();
  c.save(); rrOn(c, x + 4.4, y + 2.4, w - 8.8, h - 2.4, 9); c.clip();
  if (locked) {
    // boarded up: three planks with dark joints and a shadow along the top
    c.fillStyle = 'rgba(255,255,255,0.05)'; for (let k = 0; k < 3; k++) c.fillRect(x + 6 + k * ((w - 12) / 3), y + 2, (w - 12) / 3 - 1.4, h);
    c.fillStyle = 'rgba(0,0,0,0.25)'; for (let k = 1; k < 3; k++) c.fillRect(x + 4.6 + k * ((w - 12) / 3), y + 2, 1.4, h);
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x + 4, y + 2, w - 8, 4);
  } else {
    // soft light rays slanting down, a lit rim along the top and a warmer floor
    c.fillStyle = 'rgba(255,255,255,0.28)';
    for (const [o, wd] of [[8, 7], [22, 4], [33, 9]]) { c.beginPath(); c.moveTo(x + o, y); c.lineTo(x + o + wd, y); c.lineTo(x + o + wd - 14, y + h); c.lineTo(x + o - 14, y + h); c.closePath(); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(x + 8, y + 3, w - 16, 1.4);
    c.fillStyle = 'rgba(200,140,20,0.25)'; c.fillRect(x + 4, y + h - 8, w - 8, 8);
  }
  c.restore();
  if (locked) {
    const cx = x + w / 2, cy = y + h / 2 + 4;
    c.lineCap = 'butt';
    c.strokeStyle = out; c.lineWidth = 4.4; c.beginPath(); c.arc(cx, cy - 6, 6, Math.PI, 0); c.stroke();
    c.strokeStyle = gl; c.lineWidth = 2.6; c.beginPath(); c.arc(cx, cy - 6, 6, Math.PI, 0); c.stroke();
    c.fillStyle = out; rrOn(c, cx - 10, cy - 7, 20, 16, 3.5); c.fill();
    c.fillStyle = gl; rrOn(c, cx - 9, cy - 6, 18, 14, 3); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(cx - 7.5, cy - 5, 15, 1.2);
    c.fillStyle = 'rgba(120,70,0,0.3)'; c.fillRect(cx - 9, cy + 4, 18, 4);
    c.fillStyle = C.doorIn; circleOn(c, cx, cy, 2.5); c.fill(); c.fillRect(cx - 0.9, cy, 1.8, 4);
  }
  // the keystone gem on top of the frame
  const kx = x + w / 2, ky = y - 3.6;
  c.fillStyle = out; c.beginPath(); c.moveTo(kx - 5.4, ky - 3); c.lineTo(kx + 5.4, ky - 3); c.lineTo(kx + 3.6, ky + 3.4); c.lineTo(kx - 3.6, ky + 3.4); c.closePath(); c.fill();
  c.fillStyle = gl; c.beginPath(); c.moveTo(kx - 4.3, ky - 2.2); c.lineTo(kx + 4.3, ky - 2.2); c.lineTo(kx + 2.9, ky + 2.6); c.lineTo(kx - 2.9, ky + 2.6); c.closePath(); c.fill();
  c.fillStyle = '#e8483a'; circleOn(c, kx, ky + 0.2, 1.7); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.8)'; circleOn(c, kx - 0.5, ky - 0.3, 0.6); c.fill();
  // the brass threshold
  c.fillStyle = out; rrOn(c, x - 4.2, y + h - 4.2, w + 8.4, 4.2, 1.6); c.fill();
  c.fillStyle = gd; rrOn(c, x - 3.4, y + h - 3.6, w + 6.8, 3, 1.2); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(x - 2.4, y + h - 3.4, w + 4.8, 0.8);
}
function drawKey(k) {
  if (k.got) return;
  const bob = Math.sin(G.clock * 3) * 3;
  ctx.save(); ctx.translate(k.x, k.y + bob);
  ctx.fillStyle = 'rgba(255,215,90,0.3)'; circle(0, 0, 15 + Math.sin(G.clock * 5) * 2); ctx.fill();
  if (artPlain()) {
    ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 2;
    circle(-6, 0, 6); ctx.fill(); ctx.stroke();
    ctx.fillRect(-1, -2, 13, 4); ctx.fillRect(7, 1, 3, 5); ctx.fillRect(11, 1, 2, 4);
    ctx.fillStyle = C.goldDark; circle(-6, 0, 2); ctx.fill();
    ctx.restore(); return;
  }
  // (rich props pass) an outlined brass key: a bevelled ring bow with a red gem, a collar, a grooved shaft, cut teeth,
  // a lit top edge and a twinkle
  const gd = C.goldDark, out = shade(C.goldDark, 0.35);
  ctx.fillStyle = out;
  ctx.beginPath(); ctx.arc(-6, 0, 7.2, 0, Math.PI * 2); ctx.fill();
  rr(-1.5, -3, 15, 6, 1.5); ctx.fill(); ctx.fillRect(6.2, 0, 4.6, 7); ctx.fillRect(10.4, 0, 3.6, 5.6);
  ctx.fillStyle = gd; ctx.fillRect(-1, -2.2, 14, 4.4); ctx.fillRect(7, 0.5, 3, 5.6); ctx.fillRect(11.1, 0.5, 2.2, 4.3);
  ctx.fillStyle = C.gold; ctx.fillRect(-1, -2.2, 14, 2.6); ctx.fillRect(7, 0.5, 1.6, 5); ctx.fillRect(11.1, 0.5, 1.2, 3.8);
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(0, -2, 12, 0.9);
  ctx.fillStyle = gd; ctx.fillRect(2.5, -2.2, 0.9, 4.4); ctx.fillRect(4.6, -2.2, 0.9, 4.4);
  ctx.fillStyle = gd; circle(-6, 0, 6.2); ctx.fill();
  ctx.fillStyle = C.gold; circle(-6.6, -0.6, 5.4); ctx.fill();
  ctx.fillStyle = tint(C.gold, 0.45); ctx.beginPath(); ctx.arc(-6.6, -0.6, 4.5, Math.PI * 0.9, Math.PI * 1.6); ctx.lineTo(-6.6, -0.6); ctx.fill();
  ctx.fillStyle = out; circle(-6, 0, 2.7); ctx.fill();
  ctx.fillStyle = '#e8483a'; circle(-6, 0, 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; circle(-6.6, -0.7, 0.7); ctx.fill();
  ctx.fillStyle = out; ctx.fillRect(-0.6, -3, 1.6, 6);
  const tw = (Math.sin(G.clock * 2.2) + 1) / 2;
  if (tw > 0.6) {
    const a = (tw - 0.6) * 2.5, s2 = 2 + a * 2.5;
    ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
    ctx.beginPath(); ctx.moveTo(-9, -5 - s2); ctx.lineTo(-8.4, -5.6); ctx.lineTo(-9 + s2, -5); ctx.lineTo(-8.4, -4.4); ctx.lineTo(-9, -5 + s2); ctx.lineTo(-9.6, -4.4); ctx.lineTo(-9 - s2, -5); ctx.lineTo(-9.6, -5.6); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function drawFlag(f) {
  if (!artPlain()) return drawFlagRich(f);
  const x = f.x + 15, base = f.y + T;
  const plain = artPlain();
  if (!plain) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x, base, 7, 2.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = C.ink; rr(x - 5, base - 4, 10, 4, 1.5); ctx.fill(); }
  ctx.fillStyle = C.ink; ctx.fillRect(x - 1.5, base - 52, 3, 52);
  if (!plain) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x - 1.5, base - 52, 1, 48); ctx.fillStyle = C.gold; circle(x, base - 53, 2.8); ctx.fill(); }
  const fc = f.on ? C.grass : '#c4c0b8';
  const wave = Math.sin(G.clock * 6) * 2;
  const top = f.on ? base - 52 : base - 28;
  ctx.fillStyle = fc;
  ctx.beginPath(); ctx.moveTo(x + 1.5, top); ctx.lineTo(x + 22, top + 8 + wave); ctx.lineTo(x + 1.5, top + 16); ctx.closePath(); ctx.fill();
  if (!plain) {
    ctx.strokeStyle = shade(fc, 0.3); ctx.lineWidth = 1.2; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.moveTo(x + 1.5, top + 8); ctx.lineTo(x + 22, top + 8 + wave); ctx.lineTo(x + 1.5, top + 16); ctx.closePath(); ctx.fill();
  }
}
// (rich props pass) a checkpoint flag: a bolted foot plate, a round metal pole (outlined, lit on the left, shaded on the
// right) with two collars and a brass ball on top, and a cloth pennant with an outline, a sewn sleeve round the pole,
// a shaded lower half, a lit top hem, stitching and a star (a dot while it is still down)
// a five-point star path centred on (x, y)
function flagStarPath(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  ctx.closePath();
}
function drawFlagRich(f) {
  const x = f.x + 15, base = f.y + T, ink = C.ink, metal = mixCol(ink, '#9aa0c0', 0.38);
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x, base, 9, 2.4, 0, 0, Math.PI * 2); ctx.fill();
  // the foot plate and its bolts
  ctx.fillStyle = ink; rr(x - 7, base - 5.4, 14, 5.4, 2); ctx.fill();
  ctx.fillStyle = metal; rr(x - 6.2, base - 4.7, 12.4, 3.9, 1.5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x - 5.5, base - 4.4, 11, 0.8);
  for (const bx of [x - 4, x + 4]) { ctx.fillStyle = ink; circle(bx, base - 2.6, 1); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.55)'; circle(bx - 0.3, base - 2.9, 0.4); ctx.fill(); }
  // the pole
  ctx.fillStyle = ink; ctx.fillRect(x - 2.3, base - 52, 4.6, 47);
  ctx.fillStyle = metal; ctx.fillRect(x - 1.5, base - 52, 3, 47);
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x - 1.2, base - 51, 0.9, 45);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 0.6, base - 52, 0.9, 47);
  for (const cy of [base - 12, base - 33]) { ctx.fillStyle = ink; rr(x - 2.8, cy - 1.6, 5.6, 3.2, 1); ctx.fill(); ctx.fillStyle = metal; ctx.fillRect(x - 2.1, cy - 1, 4.2, 1.2); }
  // the brass ball on top
  ctx.fillStyle = C.goldDark; circle(x, base - 53.5, 3.4); ctx.fill();
  ctx.fillStyle = C.gold; circle(x - 0.3, base - 53.8, 2.6); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; circle(x - 1.1, base - 54.7, 0.9); ctx.fill();
  // the pennant
  const fc = f.on ? C.grass : '#c4c0b8', dk = shade(fc, 0.38);
  const wave = reduceMotion ? 0 : Math.sin(G.clock * 6) * 2;
  const top = f.on ? base - 49 : base - 28, tipX = x + 23, tipY = top + 8 + wave;
  const shape = () => { ctx.beginPath(); ctx.moveTo(x + 1.5, top); ctx.quadraticCurveTo(x + 12, top + 2 + wave * 0.5, tipX, tipY); ctx.quadraticCurveTo(x + 12, top + 14 + wave * 0.5, x + 1.5, top + 16); ctx.closePath(); };
  ctx.fillStyle = dk; ctx.lineJoin = 'round'; ctx.strokeStyle = dk; ctx.lineWidth = 2.2; shape(); ctx.stroke();
  ctx.fillStyle = fc; shape(); ctx.fill();
  ctx.save(); shape(); ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.13)'; ctx.fillRect(x, top + 8 + wave * 0.6, 26, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(x + 1.5, top + 0.6); ctx.quadraticCurveTo(x + 12, top + 2.6 + wave * 0.5, tipX, tipY); ctx.lineTo(tipX - 3, tipY - 0.2); ctx.quadraticCurveTo(x + 12, top + 4.2 + wave * 0.5, x + 1.5, top + 2.6); ctx.closePath(); ctx.fill();
  ctx.restore();
  // the sewn sleeve round the pole, with stitches
  ctx.fillStyle = dk; rr(x - 0.6, top - 0.6, 5.4, 17.2, 1.5); ctx.fill();
  ctx.fillStyle = shade(fc, 0.12); rr(x + 0.2, top + 0.2, 3.8, 15.6, 1.2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 5.3, top + 2 + k * 3.6, 0.8, 1.8);
  // the emblem
  const ex = x + 11, ey = top + 8 + wave * 0.45;
  if (f.on) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; flagStarPath(ex + 0.6, ey + 0.6, 3.6); ctx.fill();
    ctx.fillStyle = '#ffffff'; flagStarPath(ex, ey, 3.6); ctx.fill();
  } else { ctx.fillStyle = shade(fc, 0.22); circle(ex, ey, 2.2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.45)'; circle(ex - 0.6, ey - 0.6, 0.8); ctx.fill(); }
}
function drawCrownShape(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, 7); ctx.lineTo(-13, -6); ctx.lineTo(-6, 0); ctx.lineTo(0, -9); ctx.lineTo(6, 0); ctx.lineTo(13, -6); ctx.lineTo(12, 7); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff5f7e'; circle(0, 2, 2.6); ctx.fill();
  ctx.fillStyle = '#7fd8ff'; circle(-7, 3, 2); ctx.fill(); circle(7, 3, 2); ctx.fill();
  ctx.restore();
}
function drawCrown() {
  const c = G.crown;
  if (!c) return;
  if (c.holder === null) {
    const bob = Math.sin(G.clock * 3) * 4;
    ctx.fillStyle = 'rgba(255,215,90,0.28)'; circle(c.x, c.y + bob, 20 + Math.sin(G.clock * 5) * 2); ctx.fill();
    drawCrownShape(c.x, c.y + bob, 1.1);
  } else {
    const p = G.players[c.holder];
    if (!p.alive) return;
    const flash = c.invuln > 0 && Math.floor(G.clock * 16) % 2 === 0;
    if (!flash) drawCrownShape(p.x + p.w / 2, p.y + p.h - p.h * p.sy - 10, 0.85);
  }
}
function drawRope() {
  const [a, b] = G.players;
  if (!a.alive || !b.alive) return;
  const L = G.ropeLen || G.level.def.tether;
  const ax = a.x + a.w / 2, ay = a.y + a.h * 0.6, bx = b.x + b.w / 2, by = b.y + b.h * 0.6;
  const d = Math.hypot(bx - ax, by - ay);
  const sag = Math.max(0, Math.min(42, (L - d) * 0.6));
  // When one player hangs below a ledge, bend the drawn rope over the ledge corner.
  let corner = null;
  const hi = ay < by ? a : b, lo = hi === a ? b : a;
  if (hi.grounded && !lo.grounded && Math.abs(ay - by) > 20) {
    const hx = hi.x + hi.w / 2, lx = lo.x + lo.w / 2, dir = lx > hx ? 1 : -1;
    const row = Math.floor((hi.y + hi.h + 1) / T);
    let c = Math.floor(hx / T);
    for (let k = 0; k < COLS && solidFor(tile(c + dir, row), hi); k++) c += dir;
    const cx = dir > 0 ? (c + 1) * T : c * T, cy = row * T;
    if ((dir > 0 && lx > cx - 12) || (dir < 0 && lx < cx + 12)) corner = { x: cx, y: cy - 1 };
  }
  const path = () => {
    ctx.beginPath(); ctx.moveTo(ax, ay);
    if (corner) { ctx.lineTo(corner.x, corner.y); ctx.lineTo(bx, by); }
    else ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + sag, bx, by);
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = C.ropeDark; ctx.lineWidth = 5; path(); ctx.stroke();
  ctx.strokeStyle = G.climbing ? C.gold : (G.taut ? '#ffe3ae' : C.rope); ctx.lineWidth = 2.5; path(); ctx.stroke();
}
function cordEnds() {
  const [a, b] = G.players;
  return { ax: a.x + a.w / 2, ay: a.y + a.h * 0.6, bx: b.x + b.w / 2, by: b.y + b.h * 0.6 };
}
function curvePts(ax, ay, bx, by, sag, n) {
  const mx = (ax + bx) / 2, my = (ay + by) / 2 + sag, pts = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; pts.push([u * u * ax + 2 * u * t * mx + t * t * bx, u * u * ay + 2 * u * t * my + t * t * by]); }
  return pts;
}
function drawChain() {
  const [a, b] = G.players;
  if (!a.alive || !b.alive) return;
  const { ax, ay, bx, by } = cordEnds();
  const d = Math.hypot(bx - ax, by - ay);
  const sag = G.held ? 0 : Math.max(0, Math.min(46, (G.level.def.tether - d) * 0.55));
  const pts = curvePts(ax, ay, bx, by, sag, 40);
  let run = 0, next = 4.5, k = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], seg = Math.hypot(x1 - x0, y1 - y0);
    if (seg === 0) continue;
    const ang = Math.atan2(y1 - y0, x1 - x0);
    while (next <= run + seg) {
      const t = (next - run) / seg;
      ctx.save(); ctx.translate(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t); ctx.rotate(ang);
      ctx.beginPath();
      if (k % 2 === 0) ctx.ellipse(0, 0, 6, 3.6, 0, 0, Math.PI * 2); else { ctx.moveTo(-6, 0); ctx.lineTo(6, 0); }
      ctx.strokeStyle = '#34304f'; ctx.lineWidth = 4.6; ctx.stroke();
      ctx.strokeStyle = k % 2 === 0 ? '#e4e6f2' : '#b4b8cc'; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.restore();
      next += 9; k++;
    }
    run += seg;
  }
}
function drawBungee() {
  const [a, b] = G.players;
  if (!a.alive || !b.alive) return;
  const { ax, ay, bx, by } = cordEnds();
  const L0 = G.level.def.tether, d = Math.hypot(bx - ax, by - ay), st = Math.max(0, d - L0);
  const sag = st > 0 ? 0 : Math.min(44, (L0 - d) * 0.5);
  const lw = clamp(7 - st / 30, 2.6, 7); // thinner the more it stretches
  const path = () => { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + sag, bx, by); };
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#6e1d48'; ctx.lineWidth = lw + 3; path(); ctx.stroke();
  ctx.strokeStyle = st > 20 ? '#ff8cc0' : '#ff5fa2'; ctx.lineWidth = lw; path(); ctx.stroke();
  ctx.setLineDash([4, 5 + st / 10]); ctx.strokeStyle = 'rgba(255,236,246,0.85)'; ctx.lineWidth = Math.max(1.2, lw - 3.5); path(); ctx.stroke();
  ctx.setLineDash([]);
}
function drawPlayer(p) {
  if (!p.alive) return;
  const col = PCOL[p.id], dark = PDARK[p.id];
  const w = p.w * p.sx, h = p.h * p.sy;
  const cx = p.x + p.w / 2, by = p.y + p.h;
  const of = outfitNow(), look0 = of && of.looks[p.id], oo = look0 && { face: p.face, t: G.clock, vx: p.vx };
  ctx.save(); ctx.translate(cx, by);
  const fine = !artPlain();   // (third pass) softer shadow, a shaded underside and a glint in the eyes
  if (fine) { ctx.fillStyle = 'rgba(28,26,54,0.08)'; ctx.beginPath(); ctx.ellipse(0, 0.5, w * 0.78, 4.4, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.55, 3, 0, 0, Math.PI * 2); ctx.fill();
  if (look0) outfitLayer(ctx, look0, 'back', p.id, 0, 0, w, h, oo);
  // ears / sprout (js/outfits.js: an outfit's hat can lift the sprout, or put the ears over the hat)
  const ears = () => { ctx.fillStyle = col; circle(-w / 2 + 4, -h + 1, 5); ctx.fill(); circle(w / 2 - 4, -h + 1, 5); ctx.fill(); ctx.strokeStyle = dark; ctx.lineWidth = 2; circle(-w / 2 + 4, -h + 1, 5); ctx.stroke(); circle(w / 2 - 4, -h + 1, 5); ctx.stroke(); };
  if (p.id === 1 && !(look0 && look0.earsOver)) ears();
  ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 2.5;
  rr(-w / 2, -h, w, h, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(-w / 2 + 3, -h + 3, w * 0.35, h * 0.4, 5); ctx.fill();
  if (fine) {
    ctx.fillStyle = 'rgba(40,20,60,0.1)'; rr(-w / 2 + 1.4, -h * 0.3, w - 2.8, h * 0.3 - 1.4, 6.5); ctx.fill();
    ctx.fillStyle = 'rgba(40,20,60,0.07)'; rr(w * 0.2, -h + 2.5, w * 0.3 - 1.4, h - 4, 5); ctx.fill();
  }
  if (look0) outfitLayer(ctx, look0, 'body', p.id, 0, 0, w, h, oo);
  // face
  const look = p.face * 2.5, ey = -h * 0.6 + clamp(p.vy / 300, -1.5, 1.5);
  if (p.stun > 0) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    for (const ex of [-5, 5]) { ctx.beginPath(); ctx.moveTo(ex - 3 + look, ey - 3); ctx.lineTo(ex + 3 + look, ey + 3); ctx.moveTo(ex + 3 + look, ey - 3); ctx.lineTo(ex - 3 + look, ey + 3); ctx.stroke(); }
  } else if (p.blink > 0) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    for (const ex of [-5, 5]) { ctx.beginPath(); ctx.moveTo(ex - 3 + look, ey); ctx.lineTo(ex + 3 + look, ey); ctx.stroke(); }
  } else {
    for (const ex of [-5, 5]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex + look, ey, 3.6, 4.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink; circle(ex + look + p.face * 1.2, ey + 0.8, 2); ctx.fill();
      if (fine) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; circle(ex + look + p.face * 1.2 - 0.8, ey - 0.1, 0.75); ctx.fill(); }
    }
  }
  ctx.fillStyle = 'rgba(255,120,140,0.45)'; circle(-8 + look * 0.5, ey + 6, 2.4); ctx.fill(); circle(8 + look * 0.5, ey + 6, 2.4); ctx.fill();
  if (look0) outfitLayer(ctx, look0, 'head', p.id, 0, 0, w, h, oo);
  if (p.id === 0) {
    const lift = outfitLift(look0) * h / PH;
    ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -h - lift + (lift ? 1 : 0)); ctx.lineTo(1, -h - lift - 6); ctx.stroke();
    ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(5, -h - lift - 8, 6, 3, -0.5, 0, Math.PI * 2); ctx.fill();
  } else if (look0 && look0.earsOver) { ctx.save(); ctx.translate(0, -outfitLift(look0) * h / PH); ears(); ctx.restore(); }
  if (look0) outfitLayer(ctx, look0, 'front', p.id, 0, 0, w, h, oo);
  if (p.stun > 0) { // dizzy stars, above any hat
    const sy = -h - 8 - outfitLift(look0) * h / PH * 0.6;
    ctx.fillStyle = C.gold;
    for (let i = 0; i < 3; i++) { const a = G.clock * 8 + i * 2.1; circle(Math.cos(a) * 12, sy + Math.sin(a) * 3, 2.2); ctx.fill(); }
  }
  if (p.stompSafe > 0 && p.stun <= 0 && isVersus()) {
    // just stomped: a blinking bubble shows you can't be stomped again yet
    ctx.globalAlpha = 0.45 + 0.35 * Math.sin(G.clock * 18);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(0, -h / 2, w * 0.9, h * 0.78, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function pill(x, y, w, h, align) {
  const px = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  if (!artPlain()) { ctx.fillStyle = 'rgba(0,0,0,0.16)'; rr(px, y + 2, w, h, h / 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(23,25,29,0.8)'; rr(px, y, w, h, h / 2); ctx.fill();
  if (!artPlain()) { ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.lineWidth = 1; rr(px + 0.5, y + 0.5, w - 1, h - 1, (h - 1) / 2); ctx.stroke(); }
  return px;
}
function text(str, x, y, size, col, align = 'left', font = 'display') {
  ctx.font = (font === 'display' ? '' : '700 ') + size + 'px ' + (font === 'display' ? '"Lilita One", "Arial Rounded MT Bold", sans-serif' : '"Atkinson Hyperlegible", system-ui, sans-serif');
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(str, x, y);
}
function drawBumper(x, y, tx, ty) {
  const lit = G.golf && G.golf.bumps[ty * 1000 + tx] > 0;
  if (artPlain()) {
    ctx.fillStyle = lit ? '#ffd2dc' : '#ff4d6d'; rr(x + 1, y + 1, T - 2, T - 2, 8); ctx.fill();
    ctx.strokeStyle = '#8a1f38'; ctx.lineWidth = 2; rr(x + 1, y + 1, T - 2, T - 2, 8); ctx.stroke();
    ctx.fillStyle = '#ffffff'; circle(x + T / 2, y + T / 2, lit ? 7 : 5.5); ctx.fill();
    return;
  }
  // (rich props pass) a rubber cushion (lit top-left, shaded foot, a stitched seam) round a chrome cap with four bolts
  const sp = artSprite('bmp' + (lit ? 1 : 0), T, T, 0, 0, c => paintBumper(c, lit));
  blitSprite(sp, x, y);
}
function paintBumper(c, lit) {
  const body = lit ? '#ffd2dc' : '#ff4d6d', dk = '#7a1832';
  c.fillStyle = dk; rrOn(c, 0.6, 0.6, T - 1.2, T - 1.2, 8.5); c.fill();
  c.fillStyle = shade(body, 0.22); rrOn(c, 1.8, 1.8, T - 3.6, T - 3.6, 7.5); c.fill();
  c.fillStyle = body; rrOn(c, 1.8, 1.8, T - 3.6, T - 6, 7.5); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.35)'; rrOn(c, 4, 2.8, T - 12, 2.2, 1.1); c.fill();
  c.strokeStyle = lit ? 'rgba(255,255,255,0.8)' : 'rgba(255,220,228,0.55)'; c.lineWidth = 0.8; c.setLineDash([2, 2]);
  rrOn(c, 4.2, 4.2, T - 8.4, T - 8.4, 5.5); c.stroke(); c.setLineDash([]);
  const cx = T / 2, cy = T / 2, r = lit ? 7.2 : 6;
  if (lit) { c.fillStyle = 'rgba(255,255,255,0.55)'; circleOn(c, cx, cy, r + 3); c.fill(); }
  c.fillStyle = '#5b5876'; circleOn(c, cx, cy, r + 1); c.fill();
  c.fillStyle = '#c9cde0'; circleOn(c, cx, cy, r); c.fill();
  c.fillStyle = '#9095b0'; c.beginPath(); c.arc(cx, cy, r, 0.1, Math.PI - 0.1); c.fill();
  c.fillStyle = '#ffffff'; circleOn(c, cx, cy, r * 0.55); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.ellipse(cx - 2, cy - 2.4, 2.2, 1.2, -0.6, 0, Math.PI * 2); c.fill();
  for (const [bx, by] of [[5, 5], [T - 5, 5], [5, T - 5], [T - 5, T - 5]]) { c.fillStyle = '#5b5876'; circleOn(c, bx, by, 1.3); c.fill(); c.fillStyle = '#e6e8f2'; circleOn(c, bx - 0.4, by - 0.4, 0.5); c.fill(); }
}
function drawPad(p) {
  const x = p.tx * T, base = (p.ty + 1) * T, sq = p.t > 0 ? Math.min(1, p.t / 0.15) : 0;
  const top = base - 11 + sq * 5;
  if (artPlain()) {
    ctx.fillStyle = '#4a4766'; rr(x + 3, base - 4, T - 6, 4, 2); ctx.fill();
    ctx.strokeStyle = '#d9dbe8'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 4; i++) ctx.lineTo(x + 9 + (i % 2) * 12, base - 4 - (base - 4 - top) * i / 4);
    ctx.stroke();
    ctx.fillStyle = '#ff5fa2'; ctx.strokeStyle = '#6e1d48'; ctx.lineWidth = 1.5;
    rr(x + 2, top - 5, T - 4, 6, 3); ctx.fill(); ctx.stroke();
  } else {
    // (rich props pass) a bolted steel foot, a two-tone coil (back turns darker), and a stitched pink cushion
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x + T / 2, base - 0.5, T / 2 - 1, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#26243e'; rr(x + 2.3, base - 5, T - 4.6, 5, 2); ctx.fill();
    ctx.fillStyle = '#5b5878'; rr(x + 3, base - 4.4, T - 6, 3.6, 1.6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x + 4, base - 4.2, T - 8, 0.8);
    for (const bx of [x + 6, x + T - 6]) { ctx.fillStyle = '#c9cde0'; circle(bx, base - 2.6, 0.9); ctx.fill(); }
    const n = 4, y0 = base - 4.5, y1 = top;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#7d7a99'; ctx.lineWidth = 2.6; ctx.beginPath();
    for (let i = 0; i < n; i++) { const ya = y0 - (y0 - y1) * i / n, yb = y0 - (y0 - y1) * (i + 0.5) / n; ctx.moveTo(x + 21, ya); ctx.lineTo(x + 9, yb); }
    ctx.stroke();
    ctx.strokeStyle = '#3d3a58'; ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i < n; i++) { const ya = y0 - (y0 - y1) * (i + 0.5) / n, yb = y0 - (y0 - y1) * (i + 1) / n; ctx.moveTo(x + 9, ya); ctx.lineTo(x + 21, yb); }
    ctx.stroke();
    ctx.strokeStyle = '#e6e8f2'; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.fillStyle = '#6e1d48'; rr(x + 1.3, top - 5.7, T - 2.6, 7.4, 3.6); ctx.fill();
    ctx.fillStyle = '#c93f80'; rr(x + 2, top - 5, T - 4, 6, 3); ctx.fill();
    ctx.fillStyle = '#ff5fa2'; rr(x + 2, top - 5, T - 4, 4.2, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; rr(x + 5, top - 4.4, T - 12, 1.2, 0.6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,230,242,0.7)'; ctx.lineWidth = 0.7; ctx.setLineDash([1.6, 1.6]);
    ctx.beginPath(); ctx.moveTo(x + 4.5, top - 1.2); ctx.lineTo(x + T - 4.5, top - 1.2); ctx.stroke(); ctx.setLineDash([]);
  }
  // which way it throws you
  ctx.save(); ctx.translate(x + T / 2, top - 13); ctx.rotate(p.dir * (90 - GOLF.padAngle) * Math.PI / 180);
  ctx.fillStyle = ctx.strokeStyle = 'rgba(255,255,255,0.9)'; if (p.dir) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, -3); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(5.5, -1); ctx.lineTo(-5.5, -1); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawSandPlain(x, y, tx, ty) {
  ctx.fillStyle = '#e9cf8f'; ctx.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
  ctx.fillStyle = '#d2b06a';
  const h = hash(tx, ty);
  for (let i = 0; i < 5; i++) { circle(x + 4 + ((h >>> (i * 3)) % 23), y + 6 + ((h >>> (i * 4 + 2)) % 20), 1.4); ctx.fill(); }
  if (tile(tx, ty - 1) !== 's' && tile(tx, ty - 1) !== '#') { ctx.fillStyle = '#f6e2a8'; ctx.fillRect(x, y, T, 4); }
}
function drawWaterPlain(x, y, tx, ty) {
  const top = tile(tx, ty - 1) !== 'w';
  ctx.fillStyle = 'rgba(70,150,220,0.78)'; ctx.fillRect(x, y + (top ? 6 : 0), T, T - (top ? 6 : 0));
  if (top) {
    ctx.fillStyle = 'rgba(190,230,255,0.9)';
    const ph = G.clock * 3 + tx * 1.7;
    ctx.beginPath(); ctx.moveTo(x, y + 8);
    for (let i = 0; i <= 6; i++) ctx.lineTo(x + i * 5, y + 6 + Math.sin(ph + i * 0.9) * 1.6);
    ctx.lineTo(x + T, y + 10); ctx.lineTo(x, y + 10); ctx.closePath(); ctx.fill();
  }
}
function drawSand(x, y, tx, ty) {
  if (artPlain()) return drawSandPlain(x, y, tx, ty);
  // (rich props pass) one picture per look: wind ripples with a lit and a shaded side, coloured grains, pebbles, a shell
  // or a twig now and then, a damp darker foot, and a crumbly lit lip on top
  const top = tile(tx, ty - 1) !== 's' && tile(tx, ty - 1) !== '#', bot = tile(tx, ty + 1) !== 's', v = hash(tx, ty) % 10;
  const sp = artSprite('sd' + (top ? 1 : 0) + (bot ? 1 : 0) + v, T, T + 3, 0, 3, c => paintSand(c, hash(v * 17 + 3, 41), top, bot, v));
  blitSprite(sp, x, y);
}
function paintSand(c, h, top, bot, v) {
  c.fillStyle = '#e9cf8f'; c.fillRect(-0.4, -0.4, T + 0.8, T + 0.8);
  c.fillStyle = 'rgba(160,120,60,0.12)'; c.fillRect(-0.4, T - 9, T + 0.8, 9.4);
  // ripples: a shaded trough under a lit crest
  for (let i = 0; i < 2; i++) {
    const ry = 11 + i * 9 + ((h >>> (i * 3)) % 4);
    c.lineWidth = 1.1;
    c.strokeStyle = 'rgba(176,134,66,0.55)'; c.beginPath(); c.moveTo(1, ry + 0.8); c.quadraticCurveTo(8, ry - 1.7, 15, ry + 0.8); c.quadraticCurveTo(22, ry + 3.3, T - 1, ry + 0.8); c.stroke();
    c.strokeStyle = 'rgba(255,246,214,0.75)'; c.beginPath(); c.moveTo(1, ry - 0.6); c.quadraticCurveTo(8, ry - 3.1, 15, ry - 0.6); c.quadraticCurveTo(22, ry + 1.9, T - 1, ry - 0.6); c.stroke();
  }
  // grains in three tones
  const g = ['#d2b06a', '#c49a55', '#b98f86'];
  for (let i = 0; i < 9; i++) { c.fillStyle = g[i % 3]; circleOn(c, 2 + ((h >>> (i * 3)) % 26), 6 + ((h >>> (i * 2 + 2)) % 22), i % 3 === 2 ? 0.7 : 1); c.fill(); }
  c.fillStyle = '#fff1c6';
  for (let i = 0; i < 3; i++) { circleOn(c, 4 + ((h >>> (i * 5 + 1)) % 22), 7 + ((h >>> (i * 6 + 3)) % 19), 0.8); c.fill(); }
  // a pebble, a shell or a twig
  if (v % 3 === 0) {
    const px = 7 + (h >>> 11) % 15, py = 15 + (h >>> 15) % 9;
    c.fillStyle = 'rgba(120,90,40,0.25)'; c.beginPath(); c.ellipse(px + 0.8, py + 1.4, 3.6, 1.4, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#a99c8e'; c.beginPath(); c.ellipse(px, py, 3.2, 2.2, 0.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#7e7266'; c.beginPath(); c.ellipse(px + 0.8, py + 0.8, 2.2, 1.2, 0.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#d6cdc2'; c.beginPath(); c.ellipse(px - 1, py - 0.9, 1.3, 0.7, 0.2, 0, Math.PI * 2); c.fill();
  } else if (v % 3 === 1 && v < 6) {
    const px = 8 + (h >>> 12) % 14, py = 14 + (h >>> 16) % 10;
    c.fillStyle = 'rgba(120,90,40,0.25)'; c.beginPath(); c.ellipse(px, py + 1.6, 3.6, 1.1, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffe4d6'; c.beginPath(); c.moveTo(px, py + 1.5); c.arc(px, py + 1.5, 3.6, Math.PI * 1.05, Math.PI * 1.95); c.closePath(); c.fill();
    c.strokeStyle = '#d99a86'; c.lineWidth = 0.6;
    for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(px, py + 1.5); c.lineTo(px + k * 1.5, py - 1.8 + Math.abs(k) * 0.5); c.stroke(); }
    c.beginPath(); c.arc(px, py + 1.5, 3.6, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  } else if (v === 8) {
    const px = 6 + (h >>> 13) % 12, py = 17 + (h >>> 17) % 8;
    c.strokeStyle = '#8a6440'; c.lineWidth = 1.2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(px, py); c.lineTo(px + 10, py - 2); c.moveTo(px + 6, py - 1.2); c.lineTo(px + 8.5, py - 4); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(px + 1, py - 0.6); c.lineTo(px + 8, py - 2); c.stroke();
  }
  if (bot) { c.fillStyle = 'rgba(120,86,40,0.2)'; c.fillRect(-0.4, T - 2.4, T + 0.8, 2.8); }
  if (top) {
    c.fillStyle = '#d9b874'; c.fillRect(-0.4, 3.2, T + 0.8, 1.6);
    c.fillStyle = '#f6e2a8'; c.fillRect(-0.4, 0, T + 0.8, 4);
    c.fillStyle = '#fff3cf'; c.fillRect(-0.4, 0, T + 0.8, 1.5);
    // loose grains heaped on the lip
    for (let i = 0; i < 4; i++) { const gx = 2 + ((h >>> (i * 4 + 2)) % 26); c.fillStyle = i % 2 ? '#f6e2a8' : '#e7cd8c'; c.beginPath(); c.ellipse(gx, -0.2, 1.6, 1, 0, Math.PI, 0); c.fill(); }
  }
}
function drawWater(x, y, tx, ty) {
  if (artPlain()) return drawWaterPlain(x, y, tx, ty);
  const top = tile(tx, ty - 1) !== 'w', deep = tile(tx, ty - 1) === 'w' && tile(tx, ty - 2) === 'w', floor = tile(tx, ty + 1) !== 'w';
  // (rich props pass) the still body of the water, one picture per look copied on whole pixels (no seams between
  // tiles): depth shading, a faint web of light on the bottom, drifting specks and, on the floor, sand and pebbles
  const v = hash(tx, ty) % 4;
  blitSprite(artSprite('wat' + (top ? 1 : 0) + (deep ? 1 : 0) + (floor ? 1 : 0) + v, T, T, 0, 0, c => paintWater(c, top, deep, floor, hash(v * 17 + 3, 41))), x, y);
  // light ripples drifting through the water
  const ph = G.clock * 1.6 + tx * 2.3 + ty * 1.1;
  ctx.strokeStyle = 'rgba(200,235,255,0.3)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
  const ry = y + (top ? 16 : 10) + Math.sin(ph) * 3;
  ctx.beginPath(); ctx.moveTo(x + 4, ry); ctx.quadraticCurveTo(x + 10, ry - 2, x + 16, ry); ctx.stroke();
  if (!top) { const r2 = y + 22 + Math.sin(ph * 0.8 + 2) * 2.5; ctx.strokeStyle = 'rgba(200,235,255,0.18)'; ctx.beginPath(); ctx.moveTo(x + 14, r2); ctx.quadraticCurveTo(x + 20, r2 - 1.6, x + 26, r2); ctx.stroke(); }
  if (top) {
    // the surface: a darker line where the light stops, the bright wavy band and a foam edge on top
    // (the wave's phase follows the world x, so it runs on unbroken from one tile into the next)
    const p2 = G.clock * 3, wy = i => y + 6 + Math.sin(p2 + (x + i * 5) * 0.18) * 1.6;
    ctx.fillStyle = 'rgba(40,110,190,0.35)'; ctx.fillRect(x, y + 10, T, 1.6);
    ctx.fillStyle = 'rgba(190,230,255,0.92)';
    ctx.beginPath(); ctx.moveTo(x, wy(0));
    for (let i = 1; i <= 6; i++) ctx.lineTo(x + i * 5, wy(i));
    ctx.lineTo(x + T, y + 10.4); ctx.lineTo(x, y + 10.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i <= 6; i++) i ? ctx.lineTo(x + i * 5, wy(i)) : ctx.moveTo(x, wy(0));
    ctx.stroke();
    // a glint now and then
    const g = (Math.sin(G.clock * 2.1 + tx * 3.7) + 1) / 2;
    if (g > 0.8) { ctx.fillStyle = 'rgba(255,255,255,' + ((g - 0.8) * 4) + ')'; circle(x + 8 + (tx * 7) % 14, y + 6.5, 1.6); ctx.fill(); }
  }
}
function paintWater(c, top, deep, floor, h) {
  const y0 = top ? 6 : 0;
  c.fillStyle = deep ? 'rgba(40,110,190,0.84)' : 'rgba(70,150,220,0.8)'; c.fillRect(0, y0, T, T - y0);
  // deeper down is darker
  c.fillStyle = 'rgba(20,60,130,0.14)'; c.fillRect(0, T - 12, T, 12);
  c.fillStyle = 'rgba(20,60,130,0.1)'; c.fillRect(0, T - 5, T, 5);
  // a faint web of light (it lines up from tile to tile: every strand starts and ends on a tile edge at the same height)
  c.strokeStyle = 'rgba(210,240,255,0.13)'; c.lineWidth = 0.9;
  c.beginPath(); c.moveTo(0, y0 + 9); c.bezierCurveTo(8, y0 + 5 + (h % 4), 18, y0 + 14 - (h >>> 3) % 4, T, y0 + 9); c.stroke();
  c.beginPath(); c.moveTo(0, 24); c.bezierCurveTo(9, 20 + (h >>> 5) % 3, 20, 28 - (h >>> 7) % 3, T, 24); c.stroke();
  c.beginPath(); c.moveTo(6 + (h >>> 9) % 6, y0 + 10); c.quadraticCurveTo(12, 18, 9 + (h >>> 11) % 8, 25); c.stroke();
  // little specks drifting in the water
  c.fillStyle = 'rgba(230,248,255,0.35)';
  for (let i = 0; i < 3; i++) { circleOn(c, 3 + (h >>> (i * 5)) % 24, y0 + 4 + (h >>> (i * 5 + 3)) % (T - y0 - 8), 0.6 + (i % 2) * 0.3); c.fill(); }
  if (floor) {
    // the bottom: a strip of sunk sand with a few pebbles and a weed
    c.fillStyle = 'rgba(150,140,100,0.45)'; c.beginPath(); c.moveTo(0, T - 3); c.quadraticCurveTo(T / 2, T - 5 - (h % 2), T, T - 3); c.lineTo(T, T); c.lineTo(0, T); c.closePath(); c.fill();
    for (let i = 0; i < (h >>> 15) % 3; i++) {
      const px = 5 + (h >>> (i * 6 + 1)) % 20, pr = 1.4 + (h >>> (i * 4 + 2)) % 2;
      c.fillStyle = 'rgba(60,70,90,0.45)'; c.beginPath(); c.ellipse(px, T - 2, pr * 1.3, pr, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(200,220,240,0.3)'; circleOn(c, px - 0.5, T - 2.6, pr * 0.45); c.fill();
    }
    if (h % 3 === 0) {
      const wx = 8 + (h >>> 13) % 14;
      c.strokeStyle = 'rgba(60,140,100,0.55)'; c.lineWidth = 1.2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(wx, T - 2); c.quadraticCurveTo(wx - 2.5, T - 7, wx + 0.5, T - 11); c.stroke();
      c.beginPath(); c.moveTo(wx + 1.5, T - 2); c.quadraticCurveTo(wx + 4, T - 6, wx + 2.5, T - 9); c.stroke();
    }
  }
}
function drawHUD() {
  const L = G.level, i = G.levelIndex;
  ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
  const label = `${levelCode(i)} · ${L.def.name}`;
  const lw = ctx.measureText(label).width + 28;
  // (a level that draws its own level and room pills, World 40's hand-drawn HUD, sets def.ownPills)
  if (!L.def.ownPills) { pill(14, 12, lw, 28); text(label, 28, 26.5, 14, C.paper, 'left', 'body'); }
  if (L.def.rooms && !L.def.golf && !L.def.ownPills) {
    const rl = `${L.def.roomWord || 'Room'} ${L.def.roomIndex + 1} of ${L.def.roomCount}: ${L.def.title}`;
    ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
    pill(14, 46, ctx.measureText(rl).width + 44, 26);
    const col = { rope: C.rope, chain: '#d9dbe8', bungee: '#ff5fa2' }[cordType()];
    ctx.fillStyle = col; circle(30, 59, 6); ctx.fill();
    text(rl, 42, 59.5, 13, C.gold, 'left', 'body');
  }
  if (G.build) {
    drawBuildHUD();
  } else if (G.pong) {
    drawPongHUD();
  } else if (G.golf) {
    drawGolfHUD();
  } else if (G.match) {
    drawMatchHUD();
  } else if (L.def.kind === 'versus' && G.vs) {
    const vs = G.vs, bw = 150;
    pill(W / 2, 10, 440, 34, 'center');
    for (let k = 0; k < 2; k++) {
      const bx = k === 0 ? W / 2 - 205 : W / 2 + 55;
      text(NAMES[k], k === 0 ? bx : bx + bw, 27, 16, PCOL[k], k === 0 ? 'left' : 'right');
      const barX = k === 0 ? bx + 34 : bx, barW = bw - 34;
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(barX, 22, barW, 10, 5); ctx.fill();
      const f = clamp(vs.score[k] / vs.target, 0, 1);
      ctx.fillStyle = PCOL[k];
      if (f > 0) { if (k === 0) rr(barX, 22, Math.max(10, barW * f), 10, 5); else rr(barX + barW - Math.max(10, barW * f), 22, Math.max(10, barW * f), 10, 5); ctx.fill(); }
    }
    if (vs.time <= 10) text(String(Math.ceil(vs.time)), W / 2, 27.5, 20, C.gold, 'center');
    else text('First to ' + vs.target + 's', W / 2, 27.5, 13, C.paper, 'center', 'body');
  } else if (!L.def.ownHUD && L.def.kind !== 'versus') {
    const s = `${fmtTime(G.time)}   Falls ${G.falls}`;
    ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
    const sw = ctx.measureText(s).width + 28;
    pill(W - 14, 12, sw, 28, 'right');
    ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
    text(s, W - 28, 26.5, 14, C.paper, 'right', 'body');
  }
  if (L.key && L.door) {
    const got = L.key.got;
    const s = got ? 'Door unlocked' : 'Find the key';
    ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
    const sw = ctx.measureText(s).width + 44;
    const ky = L.def.rooms ? 80 : 46;
    const px = pill(14, ky, sw, 26);
    ctx.save(); ctx.translate(px + 18, ky + 13); ctx.scale(0.7, 0.7);
    ctx.fillStyle = got ? C.gold : 'rgba(255,255,255,0.35)'; circle(-6, 0, 6); ctx.fill(); ctx.fillRect(-1, -2, 13, 4); ctx.fillRect(7, 1, 3, 5);
    ctx.restore();
    text(s, px + 32, ky + 13.5, 13, got ? C.gold : C.paper, 'left', 'body');
  }
  drawHook('hud');
}
// best-of-N HUD, top centre: Pip and her round-win dots, "Round N · Best of N", Bo's dots and Bo; a clock under it
// when rounds are timed (def.match.roundTime). On phones (hudBig()) it's bigger and shorter: "Pip ●●○ R3 ○○○ Bo",
// y 10..54 (clock y 58..90) instead of y 10..44 (clock y 48..72).
function roundDot(x, y, on, k, pop, r0 = 5.5) {
  const r = r0 * (pop ? 1 + 0.5 * pop : 1), big = r0 > 6;
  if (on) { ctx.fillStyle = PCOL[k]; circle(x, y, r); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = big ? 2 : 1.5; circle(x, y, r); ctx.stroke(); }
  else { ctx.strokeStyle = 'rgba(246,239,223,0.45)'; ctx.lineWidth = big ? 2.5 : 2; circle(x, y, r - 1); ctx.stroke(); }
}
function drawMatchHUD() {
  const m = G.match, big = hudBig();
  const S = big ? { gap: 24, r: 8.5, name: 22, toDot: 15, h: 44, mid: 20 } : { gap: 17, r: 5.5, name: 16, toDot: 10, h: 34, mid: 12 };
  ctx.font = S.name + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
  const nameW = big ? NAMES.map(n => ctx.measureText(n).width) : [30, 24];
  const mid = big ? 'R' + m.round : `Round ${m.round}  ·  Best of ${m.bestOf}`;
  ctx.font = big ? S.mid + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif' : '700 12px "Atkinson Hyperlegible", system-ui, sans-serif';
  const mw = ctx.measureText(mid).width + 28, side = 16 + Math.max(nameW[0], nameW[1]) + S.toDot + (m.need - 1) * S.gap + S.r + 2.5;
  const w = Math.round(mw + 2 * side), x0 = pill(W / 2, 10, w, S.h, 'center'), y = 10 + S.h / 2;
  G.matchHudBox = { x0, x1: x0 + w, y1: 10 + S.h }; // where the match pill sits this frame (modes keep their pills clear of it)
  // the dot a player just won pulses during the round-end banner
  const popFor = k => (m.end && m.end.winner === k && (m.phase === 'end' || m.phase === 'over') ? Math.max(0, Math.sin(Math.min(1, m.t / 0.5) * Math.PI)) : 0);
  text(NAMES[0], x0 + 16, y + 0.5, S.name, PCOL[0], 'left');
  for (let k = 0; k < m.need; k++) roundDot(x0 + 16 + nameW[0] + S.toDot + k * S.gap, y, k < m.wins[0], 0, k === m.wins[0] - 1 ? popFor(0) : 0, S.r);
  text(NAMES[1], x0 + w - 16, y + 0.5, S.name, PCOL[1], 'right');
  for (let k = 0; k < m.need; k++) roundDot(x0 + w - 16 - nameW[1] - S.toDot - k * S.gap, y, k < m.wins[1], 1, k === m.wins[1] - 1 ? popFor(1) : 0, S.r);
  text(mid, W / 2, y + 0.5, S.mid, C.paper, 'center', big ? 'display' : 'body');
  if (m.roundTime > 0) {
    const sec = Math.ceil(m.timeLeft), warn = m.phase === 'live' && sec <= MATCH.warn;
    const cy = big ? 58 : 48, ch = big ? 32 : 24, fs = big ? 22 : 15;
    pill(W / 2, cy, big ? 90 : 66, ch, 'center');
    text(Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'), W / 2, cy + ch / 2 + 0.5, warn ? fs + 2 : fs, warn ? C.gold : C.paper, 'center');
  }
}
// card: the intro card's box [x, y, w, h]. A tag that would sit on it goes under the hero's feet,
// or under the card when the hero is behind it, and points up
function drawNameTags(alpha, card) {
  // half the tag's width: its words plus 8 px of air each side (12 px bold)
  const tagHw = p => { ctx.font = '700 12px "Atkinson Hyperlegible", system-ui, sans-serif'; return Math.max(18, Math.ceil(ctx.measureText(cpuSolo() && cpuOn(p.id) ? NAMES[p.id] + ' · CPU' : NAMES[p.id]).width / 2) + 8); };
  const onCard = (p, y0, y1) => card && p.x - (G.camX || 0) + p.w / 2 + tagHw(p) > card[0] && p.x - (G.camX || 0) + p.w / 2 - tagHw(p) < card[0] + card[2] && y1 > card[1] && y0 < card[1] + card[3];
  const lift = (LEVELS[G.levelIndex] || {}).tagLift || 0;
  const moved = p => onCard(p, p.y - 27 - lift, p.y - 5 - lift) || onCard(p, p.y, p.y + p.h); // the tag, or the hero, is on the card
  let row = 0; // moved tags share one row, under the lowest of those heroes
  for (const p of G.players) if (p.alive && moved(p)) row = Math.max(row, p.y + p.h + 18);
  for (const p of G.players) {
    if (!p.alive) continue;
    const x = p.x + p.w / 2 - (G.camX || 0); let y = p.y - 16 - lift; // (on the screen: a wide level scrolls) // tagLift: a level that carries things overhead
    const cpu = cpuSolo() && cpuOn(p.id), hw = tagHw(p); // the computer's tag says so
    const up = moved(p);
    if (up) y = onCard(p, row - 15, row + 7) ? card[1] + card[3] + 20 : row;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = PCOL[p.id]; rr(x - hw, y - 11, hw * 2, 18, 9); ctx.fill();
    ctx.beginPath();
    if (up) { ctx.moveTo(x - 4, y - 11); ctx.lineTo(x + 4, y - 11); ctx.lineTo(x, y - 15); }
    else { ctx.moveTo(x - 4, y + 7); ctx.lineTo(x + 4, y + 7); ctx.lineTo(x, y + 11); }
    ctx.fill();
    text(cpu ? NAMES[p.id] + ' · CPU' : NAMES[p.id], x, y - 1.5, 12, '#fff', 'center', 'body');
    ctx.restore();
  }
}
// big centre text with a dark outline (countdown numbers, GO!)
function bigText(str, x, y, size, col, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.font = size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.16; ctx.strokeStyle = C.ink; ctx.strokeText(str, 0, 0);
  ctx.fillStyle = col; ctx.fillText(str, 0, 0);
  ctx.restore();
}
// "Round N" banner, 3-2-1, GO!, and the round-end banner
function drawMatchOverlay() {
  const m = G.match;
  if (!m || m.phase === 'intro') return;
  const easeBack = t => { const c = 1.7; t = clamp(t, 0, 1) - 1; return 1 + (c + 1) * t * t * t + c * t * t; };
  if (m.phase === 'ready' || m.phase === 'count') {
    drawNameTags(1);
    const subs = matchSubtitles();
    if (m.phase === 'ready') {
      const sc = easeBack(m.t / 0.25), h = 84 + subs.length * 22;
      ctx.save(); ctx.translate(W / 2, 205); ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(23,25,29,0.88)'; rr(-180, -h / 2, 360, h, 20); ctx.fill();
      text('Round ' + m.round, 0, -h / 2 + 40, 40, C.paper, 'center');
      subs.forEach(([t, c], k) => text(t, 0, -h / 2 + 78 + k * 22, 15, c, 'center', 'body'));
      ctx.restore();
    } else {
      // a small reminder of the round, and the number popping in on every beat
      ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
      const lab = 'Round ' + m.round + '  ·  ' + subs[0][0], lw = ctx.measureText(lab).width + 32;
      pill(W / 2, 128, lw, 30, 'center');
      text(lab, W / 2, 143.5, 14, subs[0][1], 'center', 'body');
      const n = Math.max(1, 3 - Math.floor(m.t / MATCH.beat)), f = (m.t % MATCH.beat) / MATCH.beat;
      ctx.fillStyle = 'rgba(23,25,29,0.82)'; circle(W / 2, 222, 52); ctx.fill();
      ctx.strokeStyle = 'rgba(255,197,61,0.9)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(W / 2, 222, 52, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - f)); ctx.stroke();
      bigText(String(n), W / 2, 225, 70, C.gold, 1 + 0.45 * Math.pow(1 - Math.min(1, f * 3), 2));
    }
  }
  if (m.phase === 'live' && m.goT > 0) {
    const f = 1 - m.goT / MATCH.go;
    ctx.save(); ctx.globalAlpha = clamp(m.goT / 0.3, 0, 1);
    bigText('GO!', W / 2, 222, 84, C.gold, 0.85 + 0.5 * f);
    ctx.restore();
  }
  if ((m.phase === 'end' || m.phase === 'over') && m.end) {
    const e = m.end, final = e.final;
    let title, tcol;
    if (final && e.matchWinner >= 0) { title = NAMES[e.matchWinner] + ' wins the match!'; tcol = PCOL[e.matchWinner]; }
    else if (final) { title = 'It’s a draw!'; tcol = C.paper; }
    else if (e.winner >= 0) { title = NAMES[e.winner] + ' wins the round!'; tcol = PCOL[e.winner]; }
    else { title = 'Tie! Replay the round'; tcol = C.paper; }
    const lines = [];
    if (e.reason) lines.push([e.reason, C.paper, 16]);
    if (final && e.winner < 0) lines.push(['Too many ties in a row: the match is called', '#e6e2d8', 13]);
    const sc = easeBack(m.t / 0.28);
    ctx.font = '34px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    let bw = ctx.measureText(title).width;
    for (const [t, , sz] of lines) { ctx.font = '700 ' + sz + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; bw = Math.max(bw, ctx.measureText(t).width); }
    bw = Math.min(W - 40, Math.max(380, bw + 64));
    const bh = 78 + lines.length * 24 + 34;
    ctx.save(); ctx.translate(W / 2, 212); ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(23,25,29,0.9)'; rr(-bw / 2, -bh / 2, bw, bh, 20); ctx.fill();
    ctx.strokeStyle = final ? C.gold : (e.winner >= 0 ? PCOL[e.winner] : 'rgba(246,239,223,0.4)'); ctx.lineWidth = 3; rr(-bw / 2, -bh / 2, bw, bh, 20); ctx.stroke();
    let y = -bh / 2 + 40;
    text(title, 0, y, 34, tcol, 'center'); y += 38;
    for (const [t, c, sz] of lines) { text(t, 0, y, sz, c, 'center', 'body'); y += 24; }
    // the match score so far: Pip 2 – 1 Bo
    ctx.font = '22px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const sw = ctx.measureText(' ' + m.wins[0] + ' – ' + m.wins[1] + ' ').width;
    text(m.wins[0] + ' – ' + m.wins[1], 0, y + 4, 22, C.gold, 'center');
    text(NAMES[0], -sw / 2 - 6, y + 4, 18, PCOL[0], 'right');
    text(NAMES[1], sw / 2 + 6, y + 4, 18, PCOL[1], 'left');
    ctx.restore();
  }
}
function drawIntro() {
  if (G.introT <= 0 || G.mode !== 'play') return;
  const a = clamp(G.introT / 0.5, 0, 1);
  const def = G.level.def;
  // straight after the ready card (which showed the tip and the controls): only the name tags
  if (G.introQuick) { if (!(G.mst && G.mst.arriveT > 0)) drawNameTags(a, null); return; }
  // a level with jobs: each player's job and its buttons (drawIntroJobs)
  if (def.jobs && jobFor(0)) { drawIntroJobs(a, def); return; }
  const actLine = def.act ? actHintLine() : null, note = cpuTipNote(def.tip);
  ctx.save(); ctx.globalAlpha = a;
  const code = levelCode(G.levelIndex), wd = WORLDS[LEVELS[G.levelIndex].world];
  const first = code.endsWith('-1') && (!def.rooms || def.roomIndex === 0);
  const sub = (first ? `World ${LEVELS[G.levelIndex].world + 1}: ${wd.name} · ` : '') + (def.golf ? `Level ${code} · Hole ${def.roomIndex + 1} of ${def.roomCount} · Par ${def.par}`
    : def.rooms ? `Level ${code} · ${def.name} · ${def.roomWord || 'Room'} ${def.roomIndex + 1} of ${def.roomCount}` : `Level ${code}${def.kind === 'versus' ? ' · Versus' : ''}`);
  // the card is as wide as its widest line (tip, heading, the gold line over it, the action pill, the 1-player note)
  ctx.font = '14px "Atkinson Hyperlegible", system-ui, sans-serif';
  let tw = Math.max(380, ctx.measureText(def.tip).width + 60, actLine ? ctx.measureText(actLine).width + 80 : 0);
  ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
  tw = Math.max(tw, ctx.measureText(sub).width + 60, note ? ctx.measureText(note).width + 60 : 0);
  ctx.font = '30px "Lilita One", "Arial Rounded MT Bold", sans-serif';
  tw = Math.min(W - 40, Math.max(tw, ctx.measureText(def.rooms ? def.title + '!' : def.name).width + 60));
  const card = [W / 2 - tw / 2, 168, tw, (actLine ? 120 : 92) + (note ? 22 : 0)];
  if (!artPlain()) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; rr(card[0], card[1] + 4, card[2], card[3], 18); ctx.fill(); }
  ctx.fillStyle = 'rgba(23,25,29,0.88)'; rr(card[0], card[1], card[2], card[3], 18); ctx.fill();
  if (!artPlain()) { ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5; rr(card[0] + 0.75, card[1] + 0.75, card[2] - 1.5, card[3] - 1.5, 17); ctx.stroke(); }
  text(sub, W / 2, 190, 13, C.gold, 'center', 'body');
  text(def.rooms ? def.title + '!' : def.name, W / 2, 216, 30, C.paper, 'center');
  ctx.font = '400 14px "Atkinson Hyperlegible", system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.fillStyle = '#e6e2d8'; ctx.fillText(def.tip, W / 2, 244, W - 80);
  // (1-player mode: the tip talks to the computer's character too)
  if (note) { ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.fillStyle = C.paper; ctx.fillText(note, W / 2, actLine ? 297 : 266); }
  if (actLine) {
    // the action button, in a little gold pill
    ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
    const aw = ctx.measureText(actLine).width + 28;
    ctx.fillStyle = 'rgba(255,197,61,0.16)'; rr(W / 2 - aw / 2, 259, aw, 24, 12); ctx.fill();
    text(actLine, W / 2, 271.5, 14, C.gold, 'center', 'body');
  }
  ctx.restore();
  // name tags over the players, kept off the card (and not yet, while a level's warp-in still hides them)
  if (!(G.mst && G.mst.arriveT > 0)) drawNameTags(a, card);
}

// a job's rows drawn on the canvas, in that player's own buttons, from y down; returns the height used
function drawJobRows(id, x, y, w, job) {
  const { rows } = controlRows(id, null, G.level.def.act, job), d = playerDevice(id);
  let yy = y;
  for (const r of rows.slice(0, 6)) {
    const vertical = r.whats.includes('jump') && r.whats.includes('down');
    let bx = x;
    for (const wt of r.whats) {
      if (wt === '+') { text('+', bx + 4, yy, 13, C.paper, 'center', 'body'); bx += 10; continue; }
      if (wt === 'or') { text('or', bx + 9, yy + 0.5, 12, '#b9b3cf', 'center', 'body'); bx += 20; continue; }
      if (!['left', 'right', 'jump', 'down', 'act'].includes(wt)) continue;
      const what = wt === 'jump' && vertical && d.kind !== 'kb' ? 'up' : wt;
      bx += drawBtn(id, what, bx, yy, { size: 20, align: 'left' }) + 3;
    }
    ctx.save(); ctx.beginPath(); ctx.rect(bx + 4, yy - 12, Math.max(0, x + w - bx - 4), 24); ctx.clip();
    text(r.text, bx + 8, yy + 0.5, 14, C.paper, 'left', 'body');
    ctx.restore();
    yy += 25;
  }
  return yy - y;
}
// the room or part card of a level with jobs: the tip, then a column per player with their job and buttons
// the jobs card's box: [x, y, w, h] (a boss level, jobParts, keeps it under the big era / class title at y 128)
function introJobsBox(def) {
  const note = cpuTipNote(def.tip), ids = [0, 1].filter(k => !isCpuPlayer(k));
  const nRows = Math.max(...ids.map(k => Math.min(6, controlRows(k, null, def.act).rows.length)), 1);
  ctx.save();
  ctx.font = '400 14px "Atkinson Hyperlegible", system-ui, sans-serif';
  const tw = Math.min(W - 40, Math.max(ids.length * 280 + 40, ctx.measureText(def.tip).width + 60));
  ctx.restore();
  const h = 124 + 30 + nRows * 25 + (note ? 22 : 0) + (cpuSolo() ? 20 : 0);
  const top = Math.max(LEVELS[G.levelIndex].jobParts ? 152 : 60, Math.min(150, (H - h) / 2));
  return [W / 2 - tw / 2, top, tw, h];
}
// the bottom of the room card while it is up (levels that put a line under it: the 30-1 / 35-1 / 40-1 checkpoint)
function introCardBottom() {
  const def = G.level && G.level.def;
  if (!def) return 168;
  if (def.jobs && jobFor(0)) { const b = introJobsBox(def); return b[1] + b[3]; }
  return 168 + (def.act ? 120 : 92) + (cpuTipNote(def.tip) ? 22 : 0);
}
function drawIntroJobs(a, def) {
  const note = cpuTipNote(def.tip), ids = [0, 1].filter(k => !isCpuPlayer(k));
  const colW = 280, card = introJobsBox(def), top = card[1], h = card[3];
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(23,25,29,0.9)'; rr(card[0], card[1], card[2], card[3], 18); ctx.fill();
  const code = levelCode(G.levelIndex), wd = WORLDS[LEVELS[G.levelIndex].world];
  const first = code.endsWith('-1') && (!def.rooms || def.roomIndex === 0);
  const sub = (first ? `World ${LEVELS[G.levelIndex].world + 1}: ${wd.name} · ` : '') + (def.rooms ? `Level ${code} · ${def.name} · ${def.roomWord || 'Room'} ${def.roomIndex + 1} of ${def.roomCount}` : `Level ${code}`);
  text(sub, W / 2, top + 22, 13, C.gold, 'center', 'body');
  text(def.rooms ? def.title + '!' : def.name, W / 2, top + 48, 30, C.paper, 'center');
  ctx.font = '400 14px "Atkinson Hyperlegible", system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.fillStyle = '#d9d3ef'; ctx.fillText(def.tip, W / 2, top + 76);
  let y = top + 104;
  if (note) { ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.fillStyle = C.paper; ctx.fillText(note, W / 2, y - 4); y += 22; }
  const x0 = W / 2 - (ids.length * colW) / 2;
  ids.forEach((k, n) => {
    const x = x0 + n * colW + 14, j = jobFor(k);
    ctx.font = '22px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const nw = ctx.measureText(NAMES[k]).width;
    text(NAMES[k], x, y + 6, 22, PCOL[k], 'left');
    if (j && j.title) text(j.title, x + nw + 10, y + 7, 15, C.gold, 'left', 'body');
    drawJobRows(k, x, y + 34, colW - 24, j);
  });
  if (cpuSolo()) {
    const c = 1 - cpuHuman(), cj = jobFor(c);
    if (cj && cj.title) text(`${NAMES[c]} (computer): ${cj.title}`, W / 2, card[1] + h - 16, 13, C.paper, 'center', 'body');
  }
  ctx.restore();
  if (!(G.mst && G.mst.arriveT > 0)) drawNameTags(a, card);
}

function render(dt) {
  if (K3D.proofOn) { K3D.proofFrame(dt); return; } // the 3D look-proof page (?k3dproof)
  const L = G.level;
  ctx.save();
  const s = canvas.width / W;
  ctx.setTransform(s, 0, 0, canvas.height / H, 0, 0);
  if (G.shake > 0) { const m = G.shake * 14; ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m); }
  drawBackground();
  // the world scrolls by G.camX in a wide level (0 everywhere else); the HUD and cards below stay on the screen
  const camX = Math.round(G.camX || 0);
  ctx.save(); ctx.translate(-camX, 0);
  if (G.golf && L.def.cave) drawGolfCaves(camX);
  for (const sg of L.def.signs || []) {
    ctx.font = '17px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (!artPlain()) { ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeText(sg.text, sg.x, sg.y); }
    ctx.fillStyle = artPlain() ? 'rgba(28,26,54,0.5)' : 'rgba(28,26,54,0.62)'; ctx.fillText(sg.text, sg.x, sg.y);
  }
  const tx0 = Math.max(0, Math.floor(camX / T)), tx1 = Math.min((L.cols || COLS) - 1, Math.floor((camX + W) / T));
  const chunked = drawStoneChunks(tx0, tx1);
  for (let ty = 0; ty < ROWS; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const ch = L.grid[ty][tx], x = tx * T, y = ty * T;
    if (ch === '#') { if (!chunked) drawStone(tx, ty); }
    else if (ch === '^') drawSpikes(x, y);
    else if (ch === '=') drawPlank(x, y, tx, ty);
    else if (ch === 'o') drawColorBlock(x, y, 0, tx, ty);
    else if (ch === 'u') drawColorBlock(x, y, 1, tx, ty);
    else if (L.sw[ch]) drawSwitchTile(ch, x, y);
    else if (ch === 'P') { drawBrick(x, y, L.blockCol[ty][tx]); if (L.crack && L.crack[ty * COLS + tx]) drawCrack(x, y); }
    else if (ch === 'w') drawWater(x, y, tx, ty);
    else if (ch === 's') drawSand(x, y, tx, ty);
    else if (ch === 'X') drawBumper(x, y, tx, ty);
  }
  if (G.golf) drawGolf();
  if (G.build) drawBuild();
  if (G.pong) drawPong();
  for (const pl of L.plates) drawPlate(pl);
  for (const f of L.flags) drawFlag(f);
  if (L.door) drawDoor(L.door);
  if (L.key) drawKey(L.key);
  if (L.def.tether) { const c = cordType(); if (c === 'chain') drawChain(); else if (c === 'bungee') drawBungee(); else drawRope(); }
  drawHook('draw');
  if (G.mode !== 'title') for (const p of G.players) drawPlayer(p);
  if (G.golf && G.mode !== 'title') { drawGolfClub(); drawGolfBall(); }
  drawCrown();
  drawHook('drawTop');
  cpuDraw();
  for (const q of G.particles) {
    ctx.globalAlpha = clamp(q.life / q.max, 0, 1);
    ctx.fillStyle = q.col;
    if (q.kind === 'conf') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillRect(-q.size / 2, -q.size / 4, q.size, q.size / 2); ctx.restore(); }
    else { circle(q.x, q.y, q.size * (0.5 + 0.5 * q.life / q.max)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  // drifting motes and the soft light finish over the scene, under the HUD (js/scenery.js)
  drawMotes(); drawFinish();
  // a level's own printPage() over the whole scene, under the HUD (World 32's printed comic page; not 'finish', which 11-3 already uses)
  if (G.mode !== 'title') drawHook('printPage');
  if (G.mode !== 'title') { drawHUD(); drawMatchOverlay(); drawIntro(); }
  ctx.restore();
}

