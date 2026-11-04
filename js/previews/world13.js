/* Pip & Bo - Level previews for World 13 Spooky Hollow (Halloween, silly-spooky). See js/previews/preview-core.js.
   Top-level helpers are prefixed pw13. Each level's preview sits between its own BEGIN/END lines. */
'use strict';

/* ----- BEGIN 13-1 Pumpkin Patch Roll ----- */
/* ----- END 13-1 Pumpkin Patch Roll ----- */

/* ----- BEGIN 13-2 Graveyard Bone Hunt ----- */
/* ----- END 13-2 Graveyard Bone Hunt ----- */

/* ----- BEGIN 13-3 Haunted Mansion ----- */
// side-on, one dim mansion room: Pip holds the flashlight, Bo hops. The light lands on Bo first ("Eep!", frozen), then
// Pip lifts it over Bo's head and the two sleepy ghosts wake up minty; light off, Bo hops up them to the balcony, where
// a haunted portrait swaps Pip and Bo in purple smoke. Now Pip leans over the edge and shines down, the ghosts wake
// again, Bo hops up, and the door opens for both. The ghosts doze off as the loop wraps, so it starts over seamlessly.
const pw13MansionL = 7.2, pw13MansionFloor = 160, pw13MansionLedge = 64, pw13MansionEdge = 222;
// the two sleepy ghost platforms: left x, top y, width, and the times they wake and doze (twice per loop)
const pw13MansionGhosts = [
  { x: 136, y: 124, w: 38, wake: [1.12, 4.12], doze: [3.2, 6.85], ph: 0.4 },
  { x: 180, y: 94, w: 38, wake: [1.26, 4.0], doze: [3.2, 6.85], ph: 1.9 },
];
// how awake ghost g is at time t: 0 asleep, 1 awake (with a pop just after waking and a flicker before dozing off)
function pw13MansionAwake(g, t) {
  for (let i = 0; i < 2; i++) {
    if (t >= g.wake[i] && t < g.doze[i]) {
      const left = g.doze[i] - t, since = t - g.wake[i];
      return { a: left < 0.35 ? (Math.sin(t * 40) > 0 ? 1 : 0.35) : 1, pop: since < 0.25 ? since / 0.25 : 1 };
    }
  }
  return { a: 0, pop: 1 };
}
// a sheet-ghost platform: lying flat, scalloped hem; asleep it is a faint dotted outline with closed eyes and a "z"
function pw13MansionGhost(v, g, t) {
  const ctx = v.ctx, st = pw13MansionAwake(g, t), w = g.w, h = 11;
  const bob = Math.sin(t * Math.PI * 2 / 1.8 + g.ph) * 1.2, x = g.x, y = g.y + bob;
  const path = () => {
    ctx.beginPath(); ctx.moveTo(x + 2, y + h); ctx.lineTo(x + 2, y + 5); ctx.quadraticCurveTo(x + 2, y, x + 8, y);
    ctx.lineTo(x + w - 8, y); ctx.quadraticCurveTo(x + w - 2, y, x + w - 2, y + 5); ctx.lineTo(x + w - 2, y + h);
    const n = 4, sw = (w - 4) / n;
    for (let k = n - 1; k >= 0; k--) ctx.quadraticCurveTo(x + 2 + sw * (k + 0.5), y + h + 5, x + 2 + sw * k, y + h);
    ctx.closePath();
  };
  const cx = x + w / 2;
  ctx.save();
  const a0 = ctx.globalAlpha;
  if (st.a <= 0) {
    ctx.globalAlpha = a0 * (0.62 + 0.12 * Math.sin(t * 3 + g.ph));
    ctx.fillStyle = 'rgba(215,247,255,0.16)'; path(); ctx.fill();
    ctx.strokeStyle = '#d7f7ff'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 3]); path(); ctx.stroke(); ctx.setLineDash([]);
    ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    for (const ex of [cx - 6, cx + 6]) { ctx.beginPath(); ctx.arc(ex, y + 4.5, 2.4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
    const zp = v.phase(t, 1.8, g.ph / 3) * 1.8;
    if (zp < 1.2) { ctx.globalAlpha = a0 * 0.85 * Math.sin(zp / 1.2 * Math.PI); v.text('z', x + w - 4 + zp * 5, y - 5 - zp * 8, 10, '#d7f7ff', 'center', true); }
  } else {
    const s = v.ease.back(st.pop);
    ctx.globalAlpha = a0 * st.a;
    ctx.translate(cx, y + h / 2); ctx.scale(0.7 + 0.3 * s, 0.7 + 0.3 * s); ctx.translate(-cx, -(y + h / 2));
    ctx.fillStyle = 'rgba(140,255,215,0.2)'; ctx.beginPath(); ctx.ellipse(cx, y + 7, w * 0.68, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8fff0'; path(); ctx.fill();
    ctx.strokeStyle = '#3fbf96'; ctx.lineWidth = 1.6; path(); ctx.stroke();
    ctx.fillStyle = v.c.ink;
    for (const ex of [cx - 6, cx + 6]) { ctx.beginPath(); ctx.ellipse(ex, y + 4.5, 1.9, 2.5, 0, 0, Math.PI * 2); ctx.fill(); }
    v.fillCircle(cx - 11, y + 7.5, 1.8, 'rgba(255,140,170,0.7)'); v.fillCircle(cx + 11, y + 7.5, 1.8, 'rgba(255,140,170,0.7)');
    ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, y + 6.5, 2.4, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
  }
  ctx.restore();
  if (st.a > 0 && st.pop < 1) v.sparkle(x + w + 2, y - 4, st.pop, '#c8fff0', 6);
}
// the room, the same at both ends of the loop: wallpaper, the moon window, a candle, the floor, the pit and the balcony
function pw13MansionBack(v, t) {
  const ctx = v.ctx, F = pw13MansionFloor, Lg = pw13MansionLedge, E = pw13MansionEdge;
  const gr = ctx.createLinearGradient(0, 0, 0, v.H); gr.addColorStop(0, '#45306c'); gr.addColorStop(1, '#2c1f4a');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, v.W, v.H);
  ctx.fillStyle = 'rgba(255,255,255,0.035)'; ctx.beginPath(); for (let x = 6; x < v.W; x += 22) ctx.rect(x, 0, 7, v.H); ctx.fill();
  ctx.fillStyle = 'rgba(255,214,150,0.08)'; ctx.beginPath();
  for (let y = 12; y < v.H; y += 20) for (let x = (y / 20) % 2 > 0.5 ? 11 : 0; x < v.W; x += 22) { ctx.moveTo(x, y - 3); ctx.lineTo(x + 2.5, y); ctx.lineTo(x, y + 3); ctx.lineTo(x - 2.5, y); ctx.closePath(); }
  ctx.fill();
  // the arched window with the big orange moon and a tiny bat
  const wx = 66, wy = 18, ww = 40, wh = 64;
  ctx.fillStyle = '#1b1430'; ctx.beginPath(); ctx.moveTo(wx - ww / 2 - 4, wy + wh + 3); ctx.lineTo(wx - ww / 2 - 4, wy + ww / 2); ctx.arc(wx, wy + ww / 2, ww / 2 + 4, Math.PI, 0); ctx.lineTo(wx + ww / 2 + 4, wy + wh + 3); ctx.closePath(); ctx.fill();
  const sky = ctx.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#2b2155'); sky.addColorStop(1, '#b05e7c');
  ctx.fillStyle = sky; ctx.beginPath(); ctx.moveTo(wx - ww / 2, wy + wh); ctx.lineTo(wx - ww / 2, wy + ww / 2); ctx.arc(wx, wy + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(wx + ww / 2, wy + wh); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip();
  v.fillCircle(wx + 5, wy + 24, 17, 'rgba(255,160,80,0.35)'); v.fillCircle(wx + 5, wy + 24, 11, '#ffb867'); v.fillCircle(wx + 2, wy + 21, 2.5, 'rgba(200,110,50,0.45)');
  const bx = wx - 26 + v.phase(t, pw13MansionL) * 52, by = wy + 44 + Math.sin(t * 3) * 3, fl = Math.sin(t * 18) * 3;
  ctx.fillStyle = '#1b1430'; ctx.beginPath(); ctx.moveTo(bx - 7, by - fl); ctx.quadraticCurveTo(bx - 3, by - 2, bx, by + 1); ctx.quadraticCurveTo(bx + 3, by - 2, bx + 7, by - fl); ctx.quadraticCurveTo(bx + 3, by + 3, bx, by + 3); ctx.quadraticCurveTo(bx - 3, by + 3, bx - 7, by - fl); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#1b1430'; ctx.fillRect(wx - 1.5, wy + 2, 3, wh); ctx.fillRect(wx - ww / 2, wy + wh * 0.58, ww, 3);
  // cobweb in the corner
  ctx.strokeStyle = 'rgba(230,225,255,0.3)'; ctx.lineWidth = 0.9; ctx.beginPath();
  for (let k = 0; k < 4; k++) { const a = k / 3 * Math.PI / 2; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 30, Math.sin(a) * 30); }
  for (const r of [10, 18, 26]) { ctx.moveTo(r, 0); for (let k = 1; k <= 3; k++) { const a = k / 3 * Math.PI / 2, q = r * (k % 2 ? 0.85 : 1); ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } }
  ctx.stroke();
  // the pit: a dark drop between the floor and the balcony
  const pit = ctx.createLinearGradient(0, 110, 0, v.H); pit.addColorStop(0, 'rgba(14,8,28,0)'); pit.addColorStop(1, 'rgba(14,8,28,0.85)');
  ctx.fillStyle = pit; ctx.fillRect(128, 110, E - 128, v.H - 110);
  // the floor (left) and the balcony wall (right): plum stone with a wooden floorboard top
  const slab = (x, y, w, h) => {
    ctx.fillStyle = '#4a3352'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); for (let ty = y + 12; ty < y + h; ty += 16) for (let tx = x + ((ty - y) / 16 % 2 ? 4 : 12); tx < x + w - 4; tx += 18) ctx.rect(tx, ty, 14, 11); ctx.fill();
    ctx.fillStyle = '#6b4127'; ctx.fillRect(x, y, w, 7); ctx.fillStyle = '#9b6a40'; ctx.fillRect(x, y, w, 5);
    ctx.fillStyle = 'rgba(255,230,180,0.28)'; ctx.fillRect(x, y, w, 1.2);
    ctx.fillStyle = 'rgba(60,30,15,0.5)'; for (let tx = x + 10; tx < x + w; tx += 26) ctx.fillRect(tx, y + 1, 1.5, 4);
  };
  slab(0, F, 128, v.H - F); slab(E, Lg, v.W - E, v.H - Lg);
  // a red carpet runner on the balcony and a balcony rail
  ctx.fillStyle = '#7a2238'; ctx.fillRect(E + 6, Lg - 2, v.W - E - 6, 2);
  // a candle stand by the window (with a warm glow)
  const cx = 18, fy = F, fk = Math.sin(t * 9) * 0.8;
  v.fillCircle(cx, fy - 36, 22, 'rgba(255,170,80,0.12)');
  ctx.fillStyle = '#8a6a2a'; ctx.fillRect(cx - 6, fy - 3, 12, 3); ctx.fillRect(cx - 1.5, fy - 24, 3, 22); ctx.fillRect(cx - 8, fy - 26, 16, 2.5);
  for (const dx of [-6, 0, 6]) {
    ctx.fillStyle = '#f4ead2'; ctx.fillRect(cx + dx - 1.5, fy - 34, 3, 8);
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.ellipse(cx + dx, fy - 37.5 + fk * 0.3, 1.9, 3.6 + fk * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  }
  // dim the whole room: only the candle, the moon and the flashlight light it
  ctx.fillStyle = 'rgba(10,6,24,0.3)'; ctx.fillRect(0, 0, v.W, v.H);
}
// the haunted portrait (a ghost with a moustache whose eyes follow lookX); glow 0..1 lights it up purple
function pw13MansionPortrait(v, x, y, glow, lookX, t) {
  const ctx = v.ctx, w = 24, h = 28, look = v.clamp((lookX - x) / 80, -1, 1) * 1.8;
  v.fillCircle(x, y + h / 2, 26, 'rgba(185,120,255,' + (0.16 + 0.06 * Math.sin(t * 3) + glow * 0.45).toFixed(3) + ')');
  ctx.fillStyle = '#7a5a1a'; v.rr(x - w / 2 - 4, y - 4, w + 8, h + 8, 3); ctx.fill();
  ctx.fillStyle = '#e0b85a'; v.rr(x - w / 2 - 2.5, y - 2.5, w + 5, h + 5, 2); ctx.fill();
  ctx.fillStyle = '#5a3a8a'; ctx.fillRect(x - w / 2, y, w, h);
  ctx.fillStyle = '#eef3ff'; ctx.beginPath(); ctx.arc(x, y + 12, 7.5, Math.PI, 0); ctx.lineTo(x + 7.5, y + h - 2); ctx.lineTo(x - 7.5, y + h - 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = v.c.ink; v.circle(x - 2.6 + look, y + 11, 1.4); ctx.fill(); v.circle(x + 2.6 + look, y + 11, 1.4); ctx.fill();
  ctx.strokeStyle = '#3a2a2a'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 6, y + 13.5); ctx.quadraticCurveTo(x - 4, y + 17.5, x, y + 15); ctx.quadraticCurveTo(x + 4, y + 17.5, x + 6, y + 13.5); ctx.stroke();
  if (glow > 0) {
    ctx.save(); ctx.globalAlpha *= glow; ctx.strokeStyle = '#d6b8ff'; ctx.lineWidth = 1.8;
    for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.arc(x, y + h / 2, 20 + k * 6, t * 6 + k * 2, t * 6 + k * 2 + 3.6); ctx.stroke(); }
    ctx.restore();
  }
}
// the arched door with a jack-o'-lantern knocker; open 0..1 makes it glow
function pw13MansionDoor(v, x, y, open) {
  const ctx = v.ctx, w = 24, h = 34, top = y - h;
  const arch = (dx, r) => { ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x - r, top + 12 + dx); ctx.arc(x, top + 12 + dx, r, Math.PI, 0); ctx.lineTo(x + r, y); ctx.closePath(); };
  ctx.fillStyle = '#2a1a14'; arch(-2, w / 2 + 3); ctx.fill();
  ctx.fillStyle = '#7a4a2a'; arch(0, w / 2); ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,10,0.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x - 4, top + 4); ctx.lineTo(x - 4, y); ctx.moveTo(x + 4, top + 4); ctx.lineTo(x + 4, y); ctx.stroke();
  v.fillCircle(x, top + 18, 4.5, '#ff8a2a');
  ctx.fillStyle = '#ffe36a'; ctx.fillRect(x - 2.5, top + 16.5, 1.8, 1.8); ctx.fillRect(x + 0.8, top + 16.5, 1.8, 1.8); ctx.fillRect(x - 2, top + 19.5, 4, 1);
  if (open > 0) {
    ctx.save(); const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * open;
    const g = ctx.createLinearGradient(0, top, 0, y); g.addColorStop(0, '#fff2c4'); g.addColorStop(1, v.c.glow);
    ctx.fillStyle = g; arch(0, w / 2); ctx.fill();
    ctx.globalAlpha = a0 * open * 0.4; v.fillCircle(x, y - 16, 30, v.c.glow);
    ctx.restore();
  }
}
// the flashlight's warm cone from (ox, oy) along angle a, cut off by the stone (and at len)
function pw13MansionBeam(v, ox, oy, a, half, len, on) {
  if (on <= 0) return;
  const ctx = v.ctx;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, pw13MansionEdge, pw13MansionFloor); ctx.rect(128, pw13MansionFloor, pw13MansionEdge - 128, v.H); ctx.rect(pw13MansionEdge, 0, v.W, pw13MansionLedge); ctx.clip();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= on;
  const g = ctx.createRadialGradient(ox, oy, 3, ox, oy, len);
  g.addColorStop(0, 'rgba(255,236,150,0.6)'); g.addColorStop(0.65, 'rgba(255,220,120,0.3)'); g.addColorStop(1, 'rgba(255,210,110,0.08)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, len, a - half, a + half); ctx.closePath(); ctx.fill();
  ctx.restore();
}
// the flashlight itself, lens at (x, y) pointing along a; the holder's arm reaches to it from (sx, sy)
function pw13MansionLamp(v, sx, sy, x, y, a, on) {
  const ctx = v.ctx;
  v.line(sx, sy, x - Math.cos(a) * 7, y - Math.sin(a) * 7, v.c.pipDark, 4.5);
  v.line(sx, sy, x - Math.cos(a) * 7, y - Math.sin(a) * 7, v.c.pip, 2.6);
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = '#5a5a72'; v.rr(-10, -2.8, 10, 5.6, 1.5); ctx.fill();
  ctx.fillStyle = '#8a8aa8'; v.rr(-2, -4, 4.5, 8, 1.5); ctx.fill();
  ctx.fillStyle = on > 0.5 ? '#fff4b0' : '#3a3a4a'; ctx.fillRect(2, -3.2, 2, 6.4);
  ctx.restore();
}
// purple smoke puffing up at (x, y), k = 0..1
function pw13MansionSmoke(v, x, y, k) {
  if (k <= 0 || k >= 1) return;
  const ctx = v.ctx;
  ctx.save(); ctx.globalAlpha *= Math.sin(k * Math.PI);
  for (let q = 0; q < 7; q++) {
    const a = q / 7 * Math.PI * 2 + k * 2, r = 6 + k * 12;
    v.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.75, 7 + 4 * k, q % 2 ? '#b98cff' : '#d6b8ff');
  }
  v.fillCircle(x, y, 10 + 4 * k, '#c9a6ff');
  ctx.restore();
}
// a hop from (x0, y0) to (x1, y1) over k = 0..1, clearing the higher end by `over` px
function pw13MansionHop(v, k, x0, y0, x1, y1, over = 10) {
  const h = Math.max(0, (y0 - y1) / 2) + over;
  return [v.lerp(x0, x1, k), v.lerp(y0, y1, k) + v.hop(k, h)];
}
definePreview('Haunted Mansion', {
  blurb: 'One shines the light to wake sleepy ghosts, the other hops up on them!',
  loop: pw13MansionL, still: 1.42,
  draw(v, t) {
    const L = pw13MansionL, k = t / L, from = 0.952, ctx = v.ctx;
    pw13MansionBack(v, t);
    if (k <= from) { this.scene(v, t); return; }
    const a = v.ease.inOut(v.seg(k, from, 1));
    ctx.save(); ctx.globalAlpha *= 1 - a; this.scene(v, t); ctx.restore();
    ctx.save(); ctx.globalAlpha *= a; this.scene(v, 0); ctx.restore();
  },
  scene(v, t) {
    const ctx = v.ctx, F = pw13MansionFloor, Lg = pw13MansionLedge, E = pw13MansionEdge, Gs = pw13MansionGhosts;
    const G1 = Gs[0], G2 = Gs[1], bob = g => Math.sin(t * Math.PI * 2 / 1.8 + g.ph) * 1.2;
    const top1 = G1.y + bob(G1), top2 = G2.y + bob(G2), c1 = G1.x + G1.w / 2, c2 = G2.x + G2.w / 2;
    const DOOR = 302, PORT = 254;
    // ----- Bo (the mover): where his feet are
    const hop = (a, b, x0, y0, x1, y1) => { const kk = v.ease.inOut(v.seg(t, a, b)); return pw13MansionHop(v, kk, x0, y0, x1, y1); };
    let bx, by, bAir = false, bLand = -9, bFace = 1;
    if (t < 1.55) { bx = 108; by = F; }
    else if (t < 1.95) { [bx, by] = hop(1.55, 1.95, 108, F, c1, top1); bAir = true; }
    else if (t < 2.05) { bx = c1; by = top1; bLand = 1.95; }
    else if (t < 2.42) { [bx, by] = hop(2.05, 2.42, c1, top1, c2, top2); bAir = true; }
    else if (t < 2.5) { bx = c2; by = top2; bLand = 2.42; }
    else if (t < 2.88) { [bx, by] = hop(2.5, 2.88, c2, top2, 238, Lg); bAir = true; }
    else if (t < 3.24) { bx = v.lerp(238, PORT, v.ease.out(v.seg(t, 2.88, 3.05))); by = Lg; bLand = 2.88; }
    else if (t < 4.5) { bx = 92; by = F; }
    else if (t < 4.88) { [bx, by] = hop(4.5, 4.88, 92, F, c1, top1); bAir = true; }
    else if (t < 4.98) { bx = c1; by = top1; bLand = 4.88; }
    else if (t < 5.34) { [bx, by] = hop(4.98, 5.34, c1, top1, c2, top2); bAir = true; }
    else if (t < 5.42) { bx = c2; by = top2; bLand = 5.34; }
    else if (t < 5.8) { [bx, by] = hop(5.42, 5.8, c2, top2, 240, Lg); bAir = true; }
    else { bx = v.lerp(240, 254, v.ease.inOut(v.seg(t, 5.8, 6.0))); by = Lg; bLand = 5.8; }
    if (t > 3.05 && t < 3.24) bFace = -1;   // turns to the portrait... and to Pip
    // ----- Pip (the holder): where Pip is and what the light does
    let px, py, pFace = 1, pRot = 0, light = 0, lx, ly, la, len, sx, sy, half = 0.19;
    if (t < 3.24) {
      px = t < 1.6 ? 46 : v.lerp(46, 92, v.ease.inOut(v.seg(t, 1.6, 2.6))); py = F;
      const lift = v.ease.inOut(v.seg(t, 0.98, 1.3)) * (1 - v.ease.inOut(v.seg(t, 1.6, 1.85)));
      sx = px + 7; sy = py - 13;
      lx = px + 13 + lift * 0; ly = py - 13 - lift * 20;
      la = -0.19 * lift; len = v.lerp(bx - 9 - lx, 175, lift);
      light = v.seg(t, 0.34, 0.4) * (1 - v.seg(t, 1.5, 1.58));
    } else {
      // after the swap: Pip is on the balcony, walks to the edge, leans over and shines down
      const walk = v.ease.inOut(v.seg(t, 3.45, 3.78)), go = v.ease.inOut(v.seg(t, 4.5, 5.3));
      px = go > 0 ? v.lerp(230, 278, go) : v.lerp(PORT, 230, walk); py = Lg;
      pFace = go > 0 ? 1 : -1;
      const lean = v.ease.out(v.seg(t, 3.78, 3.92)) * (1 - v.ease.inOut(v.seg(t, 4.4, 4.55)));
      pRot = -0.32 * lean;
      sx = px - 6; sy = py - 14;
      lx = px - 8 - lean * 10; ly = py - 10 + lean * 6;
      la = Math.PI - 0.95 * lean - 0.05; len = 104; half = 0.21;
      light = v.seg(t, 3.9, 3.96) * (1 - v.seg(t, 4.36, 4.44));
      if (go > 0) { sx = px + 6; lx = px + 10; ly = py - 10; la = 0; }
    }
    const eep = t > 0.38 && t < 1.2;
    // ----- the light, the ghosts, the portrait and the door
    pw13MansionBeam(v, lx, ly, la, half, len, light);
    for (const g of Gs) pw13MansionGhost(v, g, t);
    const pg = v.seg(t, 2.95, 3.12) * (1 - v.seg(t, 3.4, 3.6));
    pw13MansionPortrait(v, PORT, 10, pg, bx, t);
    const open = v.ease.out(v.seg(t, 6.0, 6.25));
    pw13MansionDoor(v, DOOR, Lg, open);
    // ----- the swap: both vanish in purple smoke and come back in each other's place
    const sw = v.seg(t, 3.12, 3.62), gone = t > 3.2 && t < 3.3;
    const fadeOut = 1 - v.seg(t, 3.12, 3.22), fadeIn = v.seg(t, 3.28, 3.4);
    const heroA = t < 3.24 ? fadeOut : fadeIn;
    // ----- Pip
    const pHop = t > 6.1 ? v.hop(v.phase(t - 6.1, 0.5), 9) : 0;
    const pMood = t > 6.05 ? 'joy' : eep ? 'wow' : t > 3.9 && t < 4.4 ? 'grit' : 'happy';
    if (!gone) {
      v.hero(0, px, py + pHop, { face: pFace, rot: pRot, mood: pMood, alpha: heroA });
      if (t < 4.5 || light > 0) { ctx.save(); ctx.globalAlpha *= heroA; pw13MansionLamp(v, sx, sy + pHop, lx, ly + pHop, la, light); ctx.restore(); }
    }
    // ----- Bo
    const jit = eep ? Math.sin(t * 70) * 1.1 : 0, land = v.seg(t, bLand, bLand + 0.12);
    const bSq = bAir ? -0.12 : land > 0 && land < 1 ? 0.25 * (1 - land) : eep ? -0.15 : 0;
    const bHop = t > 6.15 ? v.hop(v.phase(t - 6.15, 0.5, 0.25), 9) : 0;
    const bMood = eep ? 'wow' : t > 6.05 ? 'joy' : 'happy';
    if (!gone) v.hero(1, bx + jit, by + bHop, { face: bFace, sq: bSq, mood: bMood, alpha: heroA });
    if (eep) {
      // the spooked shiver: little lines on both sides and a sweat drop
      const j = Math.sin(t * 50) * 1.2;
      for (const d of [-1, 1]) for (let q = 0; q < 2; q++) v.line(bx + d * (15 + q * 4) + j, by - 20 + q * 7, bx + d * (18 + q * 4) + j, by - 15 + q * 7, 'rgba(255,255,255,0.9)', 1.6);
      ctx.fillStyle = '#8fd8ff'; ctx.beginPath(); ctx.moveTo(bx + 11, by - 30); ctx.quadraticCurveTo(bx + 14.5, by - 25, bx + 11, by - 23.5); ctx.quadraticCurveTo(bx + 7.5, by - 25, bx + 11, by - 30); ctx.fill();
      const pop = v.ease.back(v.seg(t, 0.4, 0.55));
      v.label('Eep!', bx + 2, by - 44, 17 * pop, '#fff');
    }
    pw13MansionSmoke(v, 92, F - 12, sw); pw13MansionSmoke(v, PORT, Lg - 12, sw);
    if (sw > 0 && sw < 1) {
      // two sparks cross over on a purple arc: Pip's goes up, Bo's comes down
      const u = v.ease.inOut(v.seg(t, 3.18, 3.36));
      const arc = (q) => [v.lerp(92, PORT, q), v.lerp(F - 14, Lg - 14, q) - Math.sin(q * Math.PI) * 40];
      if (u > 0 && u < 1) { const [ax, ay] = arc(u), [cx2, cy2] = arc(1 - u); v.fillCircle(ax, ay, 5, v.c.pip); v.fillCircle(cx2, cy2, 5, v.c.bo); v.star(ax, ay, 3, '#fff'); v.star(cx2, cy2, 3, '#fff'); }
      v.label('Swap!', 172, 40, 15 * v.ease.back(v.seg(t, 3.15, 3.3)), '#d6b8ff');
    }
    if (t > 2.95 && t < 3.16) v.pill('⇄', PORT, Lg - 38, { size: 11, col: v.c.gold });
    // ----- the payoff: the door glows open, hearts and confetti
    if (t > 6.0) {
      v.heart(266, 20 - v.seg(t, 6.1, 6.9) * 6, 6 * v.ease.back(v.seg(t, 6.05, 6.25)));
      v.confetti(302, 36, v.seg(t, 6.05, 6.95), 18);
      v.label('Hooray!', 150, 40, 18 * v.ease.back(v.seg(t, 6.05, 6.25)), v.c.gold);
    }
  },
});
/* ----- END 13-3 Haunted Mansion ----- */

/* ----- BEGIN 13-4 Broomstick Race ----- */
/* ----- END 13-4 Broomstick Race ----- */

