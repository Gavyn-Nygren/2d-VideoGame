/* Pip & Bo - Level previews: the small looping scenes on the world-select screens (js/home.js draws the screens).
   Every level can have one. A preview is a few seconds of cartoon that hints at what happens in the level; it is not
   the level itself, so it never touches G, C or the game canvas.

   Add one in js/previews/worldN.js (one file per world, loaded after this one):
     definePreview('Hold the Door', {        // the level's name, exactly as in LEVELS (names never change)
       blurb: 'One holds the button, the other runs through the gate.',   // one short line for the level card
       loop: 4,                               // seconds before the scene repeats (optional, default 4)
       still: 2.1,                            // the moment shown when nothing moves (reduced motion, world tiles)
       draw(v, t) { ... },                    // draw the scene at time t (seconds, already wrapped into 0..loop)
     });
   draw() paints a 320x180 scene with v, a small kit (below) whose colours already follow the level's world theme.
   A level with no preview gets a plain one made from its world's colours (team: a hop to the door, versus: a face-off),
   so a new level shows up fine before its preview is written. A preview that throws falls back to that too.

   The kit (v): v.W = 320, v.H = 180, v.ctx (a 2D context, scaled), v.c (palette: C plus the world's theme),
   v.world, v.level (the LEVELS entry), v.t.
   Timing: v.phase(t, period), v.seg(k, a, b) (0..1 inside a..b), v.ease.inOut/out/in/back, v.hop(k, h) (a jump arc,
   negative y), v.lerp, v.clamp, v.rand(n) (steady 0..1 per n), v.pingpong(k).
   Scenery: v.backdrop(groundY), v.sky(), v.sun(), v.clouds(t), v.hills(y, scroll), v.ground(y), v.block(x, y, w, h),
   v.plank(x, y, w), v.spikes(x, y, w), v.water(x, y, w, h, t), v.door(x, y, open), v.flag(x, y, col),
   v.button(x, y, col, down), v.key(x, y).
   Characters: v.hero(id, x, y, o) draws Pip (0) or Bo (1) standing with feet at (x, y). o: s (scale), face (1 right,
   -1 left), sq (squash: + wide, - tall), rot, mood ('happy' 'blink' 'joy' 'dizzy' 'wow' 'grit'), alpha.
   Effects and text: v.text(str, x, y, size, col, align), v.label(str, x, y, size, col) (outlined), v.pill(str, x, y, o),
   (v.pill's o: size, bg, col, align 'left'|'right'|'center', body false for the display font)
   v.star(x, y, r, col), v.heart(x, y, r, col), v.sparkle(x, y, k), v.confetti(x, y, k), v.puff(x, y, k),
   v.bubble(str, x, y, o), v.arrow(x1, y1, x2, y2, col), v.shadow(x, y, w), v.rr(x, y, w, h, r), v.circle(x, y, r).
*/
'use strict';

const PREVIEWS = {};
const PV_W = 320, PV_H = 180;
function definePreview(name, spec) { PREVIEWS[name] = spec; }
const previewFor = i => (LEVELS[i] && PREVIEWS[LEVELS[i].name]) || null;
// the short line under a level's name: the preview's blurb, else the level's own tip
const levelBlurb = i => { const p = previewFor(i); return (p && p.blurb) || LEVELS[i].blurb || LEVELS[i].tip || ''; };

/* ---------- the drawing kit ---------- */
function pvKit(ctx, w = PV_W, h = PV_H) {
  const TAU = Math.PI * 2;
  const v = { ctx, W: w, H: h, t: 0, c: { ...BASE_C }, world: 0, level: null };
  v.setWorld = wi => { v.world = wi; v.c = Object.assign({}, BASE_C, (WORLDS[wi] || WORLDS[0]).theme); };

  /* timing helpers */
  v.clamp = clamp;
  v.lerp = (a, b, k) => a + (b - a) * k;
  v.phase = (t, period, off = 0) => ((((t + off) % period) + period) % period) / period;
  v.seg = (k, a, b) => clamp((k - a) / (b - a), 0, 1);
  v.pingpong = k => (k < 0.5 ? k * 2 : 2 - k * 2);
  v.ease = {
    inOut: k => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
    out: k => 1 - (1 - k) * (1 - k),
    in: k => k * k,
    back: k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  };
  v.hop = (k, hgt) => (k <= 0 || k >= 1 ? 0 : -4 * hgt * k * (1 - k));
  v.rand = n => (hash(n | 0, 977) % 10000) / 10000;

  /* shapes */
  v.rr = (x, y, ww, hh, r) => {
    r = Math.max(0, Math.min(r, ww / 2, hh / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + ww, y, x + ww, y + hh, r); ctx.arcTo(x + ww, y + hh, x, y + hh, r);
    ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + ww, y, r); ctx.closePath();
  };
  v.circle = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); };
  v.fillCircle = (x, y, r, col) => { ctx.fillStyle = col; v.circle(x, y, r); ctx.fill(); };
  v.line = (x1, y1, x2, y2, col, lw = 2) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };

  /* scenery */
  v.sky = () => {
    const g = ctx.createLinearGradient(0, 0, 0, v.H);
    g.addColorStop(0, v.c.skyTop); g.addColorStop(1, v.c.skyBot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, v.W, v.H);
  };
  v.sun = (x = v.W - 50, y = 34, r = 16) => { v.fillCircle(x, y, r * 1.7, v.c.sunGlow); v.fillCircle(x, y, r, v.c.sun); };
  v.cloud = (x, y, s = 1) => {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    v.circle(x, y, 9 * s); ctx.fill(); v.circle(x + 10 * s, y - 4 * s, 11 * s); ctx.fill(); v.circle(x + 21 * s, y, 8 * s); ctx.fill();
    v.rr(x - 6 * s, y, 34 * s, 8 * s, 4 * s); ctx.fill();
  };
  v.clouds = (t = v.t) => {
    const span = v.W + 80;
    v.cloud(((t * 6) % span) - 40, 30, 0.9);
    v.cloud(((t * 4 + span * 0.55) % span) - 40, 52, 0.7);
  };
  // two bands of hills around y; off scrolls them sideways (the far band moves at half speed)
  v.hills = (y = v.H - 60, off = 0) => {
    ctx.fillStyle = v.c.hillFar; ctx.beginPath(); ctx.moveTo(0, v.H);
    for (let x = 0; x <= v.W + 8; x += 8) { const u = x + off * 0.5; ctx.lineTo(x, y - 14 + Math.sin(u / 46 + 1.3) * 9 + Math.sin(u / 19) * 3); }
    ctx.lineTo(v.W, v.H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = v.c.hillNear; ctx.beginPath(); ctx.moveTo(0, v.H);
    for (let x = 0; x <= v.W + 8; x += 8) { const u = x + off; ctx.lineTo(x, y + 6 + Math.sin(u / 38 + 4) * 8); }
    ctx.lineTo(v.W, v.H); ctx.closePath(); ctx.fill();
  };
  // a solid strip of the world's stone with a grass top, from y down to the bottom (x, w optional)
  v.ground = (y = v.H - 30, x = 0, ww = v.W, grass = true) => v.block(x, y, ww, v.H - y + 2, grass);
  v.block = (x, y, ww, hh, grass = true) => {
    ctx.fillStyle = v.c.stone; ctx.fillRect(x, y, ww, hh);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, ww, hh); ctx.clip();
    ctx.fillStyle = v.c.stoneLight;
    for (let ty = 0; ty < hh; ty += 12) for (let tx = (ty / 12) % 2 ? -6 : 0; tx < ww; tx += 12) ctx.fillRect(x + tx + 1, y + ty + 1, 10, 10);
    ctx.restore();
    ctx.fillStyle = v.c.stoneEdge; ctx.fillRect(x, y + hh - 2, ww, 2);
    if (grass) {
      ctx.fillStyle = v.c.grassDark; v.rr(x - 1, y - 2, ww + 2, 7, 3); ctx.fill();
      ctx.fillStyle = v.c.grass; v.rr(x - 1, y - 3, ww + 2, 5, 2.5); ctx.fill();
    }
  };
  v.plank = (x, y, ww) => {
    ctx.fillStyle = v.c.plank; v.rr(x, y, ww, 5, 2); ctx.fill();
    ctx.fillStyle = v.c.plankDark; ctx.fillRect(x + 1, y + 4, ww - 2, 1.5);
  };
  v.spikes = (x, y, ww, col) => {
    const n = Math.max(1, Math.round(ww / 8)), sw = ww / n;
    for (let k = 0; k < n; k++) {
      ctx.fillStyle = col || v.c.spike; ctx.beginPath();
      ctx.moveTo(x + k * sw, y); ctx.lineTo(x + k * sw + sw / 2, y - 9); ctx.lineTo(x + (k + 1) * sw, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = v.c.spikeHi; ctx.beginPath();
      ctx.moveTo(x + k * sw + sw / 2, y - 9); ctx.lineTo(x + k * sw + sw / 2 + 1.5, y - 4); ctx.lineTo(x + k * sw + sw / 2 - 0.5, y - 4); ctx.closePath(); ctx.fill();
    }
  };
  v.water = (x, y, ww, hh, t = v.t) => {
    ctx.fillStyle = 'rgba(70,150,230,0.85)'; ctx.fillRect(x, y, ww, hh);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let xx = 0; xx <= ww; xx += 4) ctx.lineTo(x + xx, y + Math.sin(xx / 6 + t * 4) * 1.2);
    ctx.stroke();
  };
  // a door with its feet at (x, y); open 0..1 glows it up
  v.door = (x, y, open = 0) => {
    ctx.fillStyle = v.c.plankDark; v.rr(x - 13, y - 34, 26, 34, 10); ctx.fill();
    ctx.fillStyle = open > 0 ? v.c.glow : v.c.doorIn; v.rr(x - 9, y - 30, 18, 30, 8); ctx.fill();
    if (open > 0) { ctx.globalAlpha = open * 0.45; v.fillCircle(x, y - 16, 22, v.c.glow); ctx.globalAlpha = 1; }
  };
  v.flag = (x, y, col = v.c.gold, wave = v.t) => {
    v.line(x, y, x, y - 30, v.c.ink, 2);
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + 1, y - 30);
    ctx.quadraticCurveTo(x + 9, y - 27 + Math.sin(wave * 6) * 2, x + 16, y - 24); ctx.lineTo(x + 1, y - 19); ctx.closePath(); ctx.fill();
  };
  v.button = (x, y, col = v.c.gold, down = 0) => {
    ctx.fillStyle = v.c.ink; v.rr(x - 11, y - 3, 22, 3, 1.5); ctx.fill();
    ctx.fillStyle = col; v.rr(x - 8, y - 7 + down * 3, 16, 5 - down * 3 + 1, 2); ctx.fill();
  };
  v.key = (x, y, col = v.c.gold) => {
    ctx.strokeStyle = col; ctx.lineWidth = 2.5; v.circle(x - 4, y, 4); ctx.stroke();
    ctx.fillStyle = col; ctx.fillRect(x, y - 1.2, 9, 2.6); ctx.fillRect(x + 6, y, 2, 4); ctx.fillRect(x + 3, y, 2, 3);
  };

  /* Pip and Bo, drawn like the game's own sprites (js/render.js drawPlayer), feet at (x, y) */
  v.hero = (id, x, y, o = {}) => {
    const s = o.s || 1, sq = o.sq || 0, face = o.face == null ? (id === 0 ? 1 : -1) : o.face;
    const bw = 20 * s * (1 + sq * 0.35), bh = 24 * s * (1 - sq * 0.3);
    const col = id === 0 ? v.c.pip : v.c.bo, dark = id === 0 ? v.c.pipDark : v.c.boDark;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.translate(x, y);
    if (o.shadow !== false) { ctx.fillStyle = 'rgba(28,26,54,0.2)'; ctx.beginPath(); ctx.ellipse(0, 0, bw * 0.55, 2.5 * s, 0, 0, TAU); ctx.fill(); }
    if (o.rot) { ctx.translate(0, -bh / 2); ctx.rotate(o.rot); ctx.translate(0, bh / 2); }
    if (id === 1) { // Bo's round ears
      ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 1.8 * s;
      for (const ex of [-bw / 2 + 3.5 * s, bw / 2 - 3.5 * s]) { v.circle(ex, -bh + 1, 4.4 * s); ctx.fill(); ctx.stroke(); }
    }
    ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 2.2 * s;
    v.rr(-bw / 2, -bh, bw, bh, 7 * s); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; v.rr(-bw / 2 + 3 * s, -bh + 3 * s, bw * 0.35, bh * 0.4, 4 * s); ctx.fill();
    if (id === 0) { // Pip's sprout
      v.line(0, -bh, 1 * s, -bh - 5 * s, '#3f8f5c', 1.8 * s);
      ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(4.5 * s, -bh - 7 * s, 5.2 * s, 2.6 * s, -0.5, 0, TAU); ctx.fill();
    }
    const look = face * 2.2 * s, ey = -bh * 0.6, mood = o.mood || 'happy';
    ctx.strokeStyle = v.c.ink; ctx.fillStyle = v.c.ink; ctx.lineWidth = 1.8 * s; ctx.lineCap = 'round';
    for (const ex0 of [-4.5 * s, 4.5 * s]) {
      const ex = ex0 + look;
      if (mood === 'blink') { ctx.beginPath(); ctx.moveTo(ex - 2.6 * s, ey); ctx.lineTo(ex + 2.6 * s, ey); ctx.stroke(); }
      else if (mood === 'joy') { ctx.beginPath(); ctx.arc(ex, ey + 1.2 * s, 2.6 * s, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      else if (mood === 'dizzy') { ctx.beginPath(); ctx.moveTo(ex - 2.4 * s, ey - 2.4 * s); ctx.lineTo(ex + 2.4 * s, ey + 2.4 * s); ctx.moveTo(ex + 2.4 * s, ey - 2.4 * s); ctx.lineTo(ex - 2.4 * s, ey + 2.4 * s); ctx.stroke(); }
      else if (mood === 'grit') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey + 0.6 * s, 3.1 * s, 2.6 * s, 0, 0, TAU); ctx.fill(); ctx.fillStyle = v.c.ink; v.circle(ex + face * 1.1 * s, ey + 1 * s, 1.7 * s); ctx.fill(); ctx.beginPath(); ctx.moveTo(ex - 3.4 * s, ey - 3.2 * s + (ex0 < 0 ? -1 : 1) * face * 0.9 * s); ctx.lineTo(ex + 3.4 * s, ey - 3.2 * s - (ex0 < 0 ? -1 : 1) * face * 0.9 * s); ctx.stroke(); }
      else {
        const big = mood === 'wow' ? 1.18 : 1;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, 3.2 * s * big, 3.9 * s * big, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = v.c.ink; v.circle(ex + face * 1.1 * s, ey + 0.7 * s, 1.8 * s * (mood === 'wow' ? 0.8 : 1)); ctx.fill();
      }
    }
    ctx.fillStyle = 'rgba(255,120,140,0.45)'; v.circle(-7 * s + look * 0.5, ey + 5.5 * s, 2.1 * s); ctx.fill(); v.circle(7 * s + look * 0.5, ey + 5.5 * s, 2.1 * s); ctx.fill();
    if (mood === 'wow') { ctx.fillStyle = v.c.ink; ctx.beginPath(); ctx.ellipse(look * 0.6, ey + 6.5 * s, 1.8 * s, 2.2 * s, 0, 0, TAU); ctx.fill(); }
    else if (mood === 'joy' || mood === 'happy') { ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.5 * s; ctx.beginPath(); ctx.arc(look * 0.6, ey + 4.2 * s, 2.4 * s, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
    if (mood === 'dizzy') for (let k = 0; k < 3; k++) { const a = v.t * 7 + k * 2.1; v.fillCircle(Math.cos(a) * 10 * s, -bh - 6 * s + Math.sin(a) * 2.5 * s, 1.8 * s, v.c.gold); }
    ctx.restore();
  };
  v.shadow = (x, y, ww = 18) => { ctx.fillStyle = 'rgba(28,26,54,0.2)'; ctx.beginPath(); ctx.ellipse(x, y, ww / 2, 2.5, 0, 0, TAU); ctx.fill(); };

  /* text and effects */
  const FONT_D = '"Lilita One", "Arial Rounded MT Bold", sans-serif', FONT_B = '"Atkinson Hyperlegible", system-ui, sans-serif';
  v.text = (str, x, y, size = 14, col = v.c.ink, align = 'center', body = false) => {
    ctx.font = (body ? '700 ' : '') + size + 'px ' + (body ? FONT_B : FONT_D);
    ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(str, x, y);
  };
  v.label = (str, x, y, size = 16, col = '#fff', align = 'center') => {
    ctx.font = size + 'px ' + FONT_D; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.strokeStyle = v.c.ink; ctx.lineWidth = Math.max(3, size * 0.28); ctx.strokeText(str, x, y);
    ctx.fillStyle = col; ctx.fillText(str, x, y);
  };
  v.pill = (str, x, y, o = {}) => {
    const size = o.size || 11;
    ctx.font = (o.body === false ? '' : '700 ') + size + 'px ' + (o.body === false ? FONT_D : FONT_B);
    const tw = ctx.measureText(str).width, ww = tw + size * 1.3, hh = size * 1.75;
    const cx = o.align === 'right' ? x - ww / 2 : o.align === 'left' ? x + ww / 2 : x;
    ctx.fillStyle = o.bg || 'rgba(28,26,54,0.78)'; v.rr(cx - ww / 2, y - hh / 2, ww, hh, hh / 2); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = o.col || '#fff'; ctx.fillText(str, cx, y + 0.5);
  };
  v.star = (x, y, r = 6, col = v.c.gold, rot = 0) => {
    ctx.fillStyle = col; ctx.beginPath();
    for (let k = 0; k < 10; k++) { const a = rot - Math.PI / 2 + k * Math.PI / 5, rr2 = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    ctx.closePath(); ctx.fill();
  };
  v.heart = (x, y, r = 6, col = '#ff6b8a') => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.3, x, y - r * 0.45);
    ctx.bezierCurveTo(x + r * 0.6, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9); ctx.fill();
  };
  // a twinkle that grows and fades over k = 0..1
  v.sparkle = (x, y, k, col = '#fff', r = 7) => {
    if (k <= 0 || k >= 1) return;
    const a = 1 - k, rr2 = r * (0.4 + k);
    ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - rr2, y); ctx.lineTo(x + rr2, y); ctx.moveTo(x, y - rr2); ctx.lineTo(x, y + rr2); ctx.stroke(); ctx.restore();
  };
  // a burst of confetti from (x, y), k = 0..1 over its life
  v.confetti = (x, y, k, n = 16) => {
    if (k <= 0 || k >= 1) return;
    const cols = [v.c.pip, v.c.bo, v.c.gold, v.c.grass, '#ff8fc7'];
    ctx.save(); ctx.globalAlpha *= 1 - v.ease.in(k);
    for (let q = 0; q < n; q++) {
      const a = -Math.PI / 2 + (v.rand(q * 7 + 1) - 0.5) * 2.4, sp = 40 + v.rand(q * 13 + 2) * 50;
      const px = x + Math.cos(a) * sp * k, py = y + Math.sin(a) * sp * k + 70 * k * k;
      ctx.fillStyle = cols[q % cols.length];
      ctx.save(); ctx.translate(px, py); ctx.rotate(k * 9 + q); ctx.fillRect(-2.5, -1.2, 5, 2.4); ctx.restore();
    }
    ctx.restore();
  };
  // a dust puff at (x, y), k = 0..1
  v.puff = (x, y, k, col = 'rgba(255,255,255,0.85)') => {
    if (k <= 0 || k >= 1) return;
    ctx.save(); ctx.globalAlpha *= 1 - k; ctx.fillStyle = col;
    for (let q = 0; q < 5; q++) { const a = Math.PI + q * Math.PI / 4; v.circle(x + Math.cos(a) * 10 * k, y + Math.sin(a) * 4 * k - 2, 3 + 3 * k); ctx.fill(); }
    ctx.restore();
  };
  // a speech bubble with its tail at (x, y)
  v.bubble = (str, x, y, o = {}) => {
    const size = o.size || 10;
    ctx.font = '700 ' + size + 'px ' + FONT_B;
    const tw = ctx.measureText(str).width, ww = tw + 12, hh = size + 9, bx = clamp(x - ww / 2, 2, v.W - ww - 2), by = y - hh - 6;
    ctx.fillStyle = o.bg || '#fff'; v.rr(bx, by, ww, hh, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 4, by + hh - 1); ctx.lineTo(x, y); ctx.lineTo(x + 4, by + hh - 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = o.col || v.c.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(str, bx + ww / 2, by + hh / 2 + 0.5);
  };
  v.arrow = (x1, y1, x2, y2, col = '#fff', lw = 3) => {
    v.line(x1, y1, x2, y2, col, lw);
    const a = Math.atan2(y2 - y1, x2 - x1), hl = 4 + lw * 1.4;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x2 + Math.cos(a) * 2, y2 + Math.sin(a) * 2);
    ctx.lineTo(x2 - Math.cos(a - 0.5) * hl, y2 - Math.sin(a - 0.5) * hl); ctx.lineTo(x2 - Math.cos(a + 0.5) * hl, y2 - Math.sin(a + 0.5) * hl);
    ctx.closePath(); ctx.fill();
  };
  // sky, sun, clouds, hills and a grassy floor at groundY
  v.backdrop = (groundY = v.H - 28) => { v.sky(); v.sun(); v.clouds(); v.hills(groundY - 30); v.ground(groundY); };
  return v;
}

/* ---------- the plain preview for a level that has none yet ---------- */
function pvGeneric(v, t, l) {
  const gy = v.H - 30;
  v.backdrop(gy);
  if (l && l.kind === 'versus') {
    const k = v.phase(t, 4), win = Math.floor(t / 4) % 2;
    for (const id of [0, 1]) {
      const bounce = v.hop(v.phase(t, 0.7, id * 0.35), 8);
      const lunge = Math.sin(k * Math.PI * 4) * 6 * (id ? -1 : 1);
      v.hero(id, v.W / 2 + (id ? 46 : -46) + lunge, gy + bounce, { face: id ? -1 : 1, mood: k > 0.75 ? (id === win ? 'joy' : 'dizzy') : 'grit' });
    }
    v.label('VS', v.W / 2, gy - 34, 22, v.c.gold);
    if (k > 0.75) { v.star(v.W / 2 + (win ? 46 : -46), gy - 46, 7); v.confetti(v.W / 2 + (win ? 46 : -46), gy - 30, v.seg(k, 0.75, 1)); }
  } else {
    const k = v.phase(t, 4.5), door = v.W - 48;
    v.door(door, gy, k > 0.72 ? 1 : 0);
    for (const id of [0, 1]) {
      const run = v.ease.inOut(v.seg(k, 0.05 + id * 0.08, 0.7));
      const x = v.lerp(36 + id * 28, door - 52 + id * 26, run), hopk = v.phase(t, 0.45, id * 0.22);
      v.hero(id, x, gy + (run > 0 && run < 1 ? v.hop(hopk, 6) : 0), { face: 1, mood: k > 0.72 ? 'joy' : 'happy' });
    }
    v.heart(door, gy - 44 - v.seg(k, 0.75, 1) * 8, 6 * v.seg(k, 0.72, 0.8));
    v.confetti(door, gy - 30, v.seg(k, 0.74, 1));
  }
}

/* ---------- drawing one preview frame ---------- */
const pvWarned = new Set();
function pvDrawLevel(v, i, t) {
  const l = LEVELS[i], spec = previewFor(i), ctx = v.ctx;
  v.setWorld(l.world); v.level = l;
  const loop = (spec && spec.loop) || 4.5, tt = ((t % loop) + loop) % loop;
  v.t = tt;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, v.W, v.H); ctx.clip();
  try {
    if (spec && spec.draw) spec.draw(v, tt); else pvGeneric(v, tt, l);
  } catch (e) {
    if (!pvWarned.has(l.name)) { pvWarned.add(l.name); console.warn('Preview for "' + l.name + '" failed:', e); }
    ctx.restore(); ctx.save(); ctx.globalAlpha = 1;
    pvGeneric(v, tt, l);
  }
  ctx.restore();
}
const pvStill = i => { const s = previewFor(i); return s && s.still != null ? s.still : 2; };

/* ---------- the title screen's banner: Pip and Bo run through every world in turn ---------- */
const HERO_W = 480, HERO_H = 150;
function pvDrawHero(v, t) {
  const ws = liveWorlds(), per = 3.2, n = ws.length, idx = Math.floor(t / per) % n, k = (t % per) / per;
  const draw = (w, alpha) => {
    v.ctx.save(); v.ctx.globalAlpha = alpha; v.setWorld(w);
    const gy = v.H - 22;
    v.sky(); v.sun(v.W - 70, 36, 18);
    const span = v.W + 80;
    v.cloud(((t * 10) % span) - 40, 30, 1); v.cloud(((t * 7 + span * 0.5) % span) - 40, 50, 0.8);
    v.hills(gy - 26, t * 30); // the hills scroll by: Pip and Bo run to the right
    v.ground(gy);
    v.ctx.fillStyle = v.c.grassDark;
    for (let x = -((t * 60) % 24); x < v.W; x += 24) v.ctx.fillRect(x, gy + 6, 10, 2);
    v.ctx.restore();
  };
  draw(ws[idx], 1);
  if (k > 0.85) draw(ws[(idx + 1) % n], v.seg(k, 0.85, 1));
  const gy = v.H - 22, hx = v.W * 0.28;
  for (const id of [0, 1]) {
    const hk = v.phase(t, 0.62, id * 0.31), big = Math.floor(t / 0.62 + id * 0.5) % 4 === 3;
    v.hero(id, hx + id * 34, gy + v.hop(hk, big ? 26 : 9), { s: 1.25, face: 1, sq: hk < 0.08 || hk > 0.94 ? 0.25 : -0.05, mood: big && hk > 0.2 && hk < 0.8 ? 'joy' : 'happy' });
  }
  const shown = ws[k > 0.85 ? (idx + 1) % n : idx];
  v.setWorld(shown);
  v.pill('World ' + (shown + 1) + ' · ' + WORLDS[shown].name, v.W - 10, v.H - 12, { size: 11, align: 'right' });
}

/* ---------- live previews in the menu: every canvas[data-pv] in the overlay ---------- */
// data-pv = "level:<i>" | "world:<w>" | "hero". Level previews and the hero always move; a world tile plays its levels'
// previews in turn only while it is focused or under the mouse, and otherwise shows its first level's still frame.
const PV = { list: [], raf: 0, last: 0 };
function mountPreviews(root) {
  PV.list = Array.from(root.querySelectorAll('canvas[data-pv]')).map(cv => {
    const [kind, n] = cv.dataset.pv.split(':'), hero = kind === 'hero';
    const ctx = cv.getContext('2d');
    return { cv, ctx, kind, n: +n, v: pvKit(ctx, hero ? HERO_W : PV_W, hero ? HERO_H : PV_H), size: '', still: '', t0: performance.now() / 1000, on: 0 };
  });
  if (PV.list.length) { pvFrame(performance.now(), true); }
}
function pvFrame(now, force) {
  if (!force) PV.raf = 0;
  PV.list = PV.list.filter(p => p.cv.isConnected);
  if (!PV.list.length) return;
  if (!PV.raf) PV.raf = requestAnimationFrame(pvFrame);
  if (!force && now - PV.last < 32) return; // about 30 frames a second is plenty for these
  PV.last = now;
  const box = overlay.getBoundingClientRect();
  for (const p of PV.list) {
    const cw = p.cv.clientWidth;
    if (!cw) continue;
    const r = p.cv.getBoundingClientRect();
    if (r.bottom < box.top || r.top > box.bottom) continue; // scrolled out of sight
    const dpr = Math.min(2, window.devicePixelRatio || 1), W2 = Math.round(cw * dpr), H2 = Math.round(cw * dpr * p.v.H / p.v.W);
    const size = W2 + 'x' + H2;
    if (p.size !== size) { p.cv.width = W2; p.cv.height = H2; p.size = size; p.still = ''; }
    const btn = p.cv.closest('button');
    const live = !reduceMotion && (p.kind !== 'world' || (btn && (btn === document.activeElement || btn.matches(':hover'))));
    const t = live ? now / 1000 - p.t0 : -1;
    if (!live && p.still === size) continue; // the still frame is already drawn
    p.ctx.setTransform(W2 / p.v.W, 0, 0, H2 / p.v.H, 0, 0);
    p.ctx.clearRect(0, 0, p.v.W, p.v.H);
    if (p.kind === 'hero') pvDrawHero(p.v, live ? t : 1.2);
    else if (p.kind === 'level') pvDrawLevel(p.v, p.n, live ? t : pvStill(p.n));
    else if (p.kind === 'world') pvDrawWorldTile(p, live, t);
    p.still = live ? '' : size;
  }
}
// a world tile: its levels' previews one after another (3 s each, quick fade), or the first one standing still
function pvDrawWorldTile(p, live, t) {
  const ls = worldLevels(p.n);
  if (!ls.length) return;
  if (!live) { pvDrawLevel(p.v, ls[0], pvStill(ls[0])); p.on = 0; return; }
  if (!p.on) { p.on = 1; p.t0 = performance.now() / 1000; t = 0; }
  const per = 3, idx = Math.floor(t / per) % ls.length, k = t % per;
  pvDrawLevel(p.v, ls[idx], pvStill(ls[idx]) - 0.6 + k);
  if (ls.length > 1 && k > per - 0.3) {
    const nx = ls[(idx + 1) % ls.length];
    p.ctx.save(); p.ctx.globalAlpha = (k - (per - 0.3)) / 0.3; pvDrawLevel(p.v, nx, pvStill(nx) - 0.6); p.ctx.restore();
  }
}
