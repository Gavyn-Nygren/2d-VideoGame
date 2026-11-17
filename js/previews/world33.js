/* Pip & Bo - Level previews for World 33 Storm Chasers. Helpers are prefixed pw33. Each level's preview sits between
   its own BEGIN/END lines. */
'use strict';

// shared: a storm sky (with an optional lightning flash), a storm chaser in a rain jacket, a funnel cloud, the van
const pw33TAU = Math.PI * 2;
const pw33Sky = (v, t, o = {}) => {
  const c = v.ctx, cols = { storm: ['#1c2620', '#4e5e52', '#7a8a72'], flood: ['#2a2420', '#5a4a3c', '#8a7a64'], snow: ['#8a98a8', '#c4ced8', '#e4eaf0'] }[o.mood || 'storm'];
  const g = c.createLinearGradient(0, 0, 0, v.H);
  g.addColorStop(0, cols[0]); g.addColorStop(0.6, cols[1]); g.addColorStop(1, cols[2]);
  c.fillStyle = g; c.fillRect(0, 0, v.W, v.H);
  // rolling cloud banks
  for (let layer = 0; layer < 2; layer++) {
    c.fillStyle = layer ? 'rgba(30,36,34,0.55)' : 'rgba(90,100,96,0.45)';
    if (o.mood === 'snow') c.fillStyle = layer ? 'rgba(150,160,175,0.5)' : 'rgba(210,218,228,0.5)';
    for (let i = 0; i < 8; i++) {
      const x = ((i * 52 - t * (8 + layer * 10)) % 420 + 420) % 420 - 50, y = 14 + layer * 16 + v.rand(i + layer * 9) * 12;
      v.circle(x, y, 22 + v.rand(i + 3) * 10); c.fill(); v.circle(x + 22, y + 4, 18); c.fill();
    }
  }
  if (o.flash) {
    const k = v.phase(t, o.flash);
    if (k < 0.03) { c.fillStyle = 'rgba(240,244,255,0.5)'; c.fillRect(0, 0, v.W, v.H); }
    if (k < 0.05) { c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); let x = o.boltX || 250, y = 0; c.moveTo(x, y); for (let s = 0; s < 6; s++) { x += (v.rand(s + 7) - 0.5) * 24; y += 14; c.lineTo(x, y); } c.stroke(); }
  }
};
// a storm chaser: the usual Pip / Bo with a rain jacket over the body and goggles on the forehead
const pw33Chaser = (v, id, x, y, o = {}) => {
  const c = v.ctx, s = o.s || 0.6, face = o.face == null ? 1 : o.face;
  v.hero(id, x, y, Object.assign({ s, face }, o));
  if (o.alpha != null) { c.save(); c.globalAlpha *= o.alpha; }
  const w = 22 * s * (1 + (o.sq || 0) * 0.5), h = 26 * s * (1 - (o.sq || 0) * 0.5);
  c.save(); c.translate(x, y - h / 2); c.rotate(o.rot || 0); c.translate(0, h / 2);
  c.fillStyle = id === 0 ? '#ffd23a' : '#ff8a2a'; c.strokeStyle = id === 0 ? '#c89a10' : '#c45a10'; c.lineWidth = 1.2;
  v.rr(-w / 2 - 1, -h * 0.36, w + 2, h * 0.36 + 1, 3 * s); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(-w / 2 - 1, -h * 0.16, w + 2, 1.4 * s);
  c.fillStyle = '#2a2a34'; c.fillRect(-w / 2 - 1, -h * 0.86, w + 2, 2.4 * s);
  v.fillCircle(-3.5 * s + face * s, -h * 0.86 + 1, 2.6 * s, '#8fdcff'); v.fillCircle(3.5 * s + face * s, -h * 0.86 + 1, 2.6 * s, '#8fdcff');
  c.restore();
  if (o.alpha != null) c.restore();
};
const pw33Funnel = (v, x, y, h, w, t, o = {}) => {
  const c = v.ctx, n = 16, foot = o.foot || 6;
  for (let i = n; i >= 0; i--) {
    const u = i / n, yy = y - u * h, sway = Math.sin(t * 2 + u * 4) * 6 * (1 - u) + (o.lean || 0) * u * u;
    const ww = v.lerp(foot, w, Math.pow(u, 1.7));
    c.fillStyle = o.col || '#4e5650'; c.globalAlpha = o.alpha || 0.92;
    c.beginPath(); c.ellipse(x + sway, yy, ww / 2, 3 + u * 6, 0, 0, pw33TAU); c.fill();
    c.globalAlpha = 0.35; c.strokeStyle = '#1e2420'; c.lineWidth = 1;
    const a0 = (t * 7 + u * 9) % pw33TAU; c.beginPath(); c.ellipse(x + sway, yy, ww / 2 * 0.85, (3 + u * 6) * 0.6, 0, a0, a0 + 1.6); c.stroke();
  }
  c.globalAlpha = 1;
  if (o.dust !== false) for (let k = 0; k < 8; k++) { const a = t * 5 + k * 0.8, r = 8 + (k % 3) * 5; v.fillCircle(x + Math.cos(a) * r, y - 2 + Math.sin(a) * 2 - (k % 2) * 2, 4 + (k % 3) * 2, k % 2 ? 'rgba(150,130,100,0.55)' : 'rgba(120,104,84,0.6)'); }
};
const pw33Van = (v, x, y, s, t, o = {}) => {
  const c = v.ctx;
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = '#f2f2ea'; v.rr(-40, -30, 80, 24, 5); c.fill();
  c.fillStyle = '#ffd23a'; c.fillRect(-40, -18, 80, 6); c.fillStyle = '#ff8a2a'; c.fillRect(-40, -12, 80, 3);
  c.fillStyle = '#3a4a5a'; v.rr(16, -27, 20, 10, 2); c.fill(); v.rr(-30, -27, 36, 9, 2); c.fill();
  for (const wx of [-24, 24]) { v.fillCircle(wx, -4, 7, '#2a2a30'); v.fillCircle(wx, -4, 2.5, '#9a9aa4'); }
  // the roof: a dish and a spinning wind gauge
  c.fillStyle = '#c8ccd4'; c.beginPath(); c.ellipse(-20, -34, 7, 4, -0.4, 0, pw33TAU); c.fill();
  v.line(10, -30, 10, -40, '#5a5e66', 1.5);
  for (let k = 0; k < 3; k++) { const a = t * 12 + k * 2.1; v.fillCircle(10 + Math.cos(a) * 5, -40 + Math.sin(a) * 1.5, 1.8, '#e8e8f0'); }
  if (o.dents) for (let k = 0; k < o.dents; k++) { c.strokeStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.arc(-30 + k * 18, -24, 3, 0, Math.PI); c.stroke(); }
  c.restore();
};
const pw33Rain = (v, t, n = 40, lean = 4, col = 'rgba(210,220,230,0.45)') => {
  const c = v.ctx;
  c.strokeStyle = col; c.lineWidth = 1;
  for (let i = 0; i < n; i++) { const x = (v.rand(i) * (v.W + 40) + t * 80) % (v.W + 40) - 20, y = (v.rand(i + 9) * v.H + t * 300) % v.H; c.beginPath(); c.moveTo(x, y); c.lineTo(x - lean, y + 10); c.stroke(); }
};
const pw33Hay = (v, x, y, s, rot) => {
  const c = v.ctx;
  c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(s, s);
  c.fillStyle = '#e8c45a'; c.strokeStyle = '#a8842a'; c.lineWidth = 1.5; v.rr(-10, -7, 20, 14, 3); c.fill(); c.stroke();
  v.line(-10, -2, 10, -2, '#a8842a', 1); v.line(-10, 3, 10, 3, '#a8842a', 1);
  c.restore();
};
const pw33Cow = (v, x, y, s, rot) => {
  const c = v.ctx;
  c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(s, s);
  c.fillStyle = '#ffffff'; v.rr(-11, -7, 22, 12, 5); c.fill();
  v.fillCircle(-4, -3, 3, '#2a2a30'); v.fillCircle(5, 0, 2.5, '#2a2a30');
  c.fillStyle = '#ffffff'; v.rr(9, -10, 8, 8, 3); c.fill(); v.fillCircle(16, -5, 2.4, '#f2a2a8');
  for (const lx of [-8, -3, 4, 8]) v.line(lx, 5, lx, 9, '#2a2a30', 1.6);
  c.restore();
};

// ----- BEGIN 33-1 Tornado Alley Run -----
// The van races down a country road with a tornado chasing behind. Bo drives, swerving into the other lane past a
// wreck; Pip rides on the roof and bats a flying hay bale away with a big swing, then the van pulls ahead.
{
  definePreview('Tornado Alley Run', {
    blurb: 'Outrun the tornado! One drives the van, the other swats the flying junk away from the roof.',
    loop: 6, still: 3.1,
    draw(v, t) {
      const c = v.ctx, e = v.ease;
      pw33Sky(v, t, { mood: 'storm', flash: 6, boltX: 60 });
      // far fields and the road
      c.fillStyle = '#5e7448'; c.fillRect(0, 112, v.W, 70);
      c.fillStyle = '#7a9256'; c.fillRect(0, 118, v.W, 64);
      for (let k = 0; k < 6; k++) { const x = ((k * 70 - t * 30) % 420 + 420) % 420 - 50; c.fillStyle = '#8a3a2a'; c.fillRect(x, 102, 20, 12); c.beginPath(); c.moveTo(x - 3, 102); c.lineTo(x + 10, 94); c.lineTo(x + 23, 102); c.fill(); }
      c.fillStyle = '#4a4a52'; c.fillRect(0, 128, v.W, 46);
      // (art pass) the road: gravel shoulder lines, worn wheel tracks, tar-sealed cracks and patches that scroll with it
      c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(0, 136, v.W, 6); c.fillRect(0, 160, v.W, 6);
      c.fillStyle = '#e8e8e0'; c.fillRect(0, 130, v.W, 1.5); c.fillRect(0, 171, v.W, 1.5);
      c.fillStyle = '#8a8a7a'; c.fillRect(0, 126, v.W, 2.5);
      for (let k = 0; k < 6; k++) {
        const x = ((k * 76 - t * 260) % 456 + 456) % 456 - 60, y = 134 + v.rand(k + 30) * 34;
        c.fillStyle = 'rgba(30,30,36,0.5)'; c.fillRect(x, y, 26 + v.rand(k + 31) * 20, 7);
        c.strokeStyle = 'rgba(20,20,24,0.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 40, y - 4); c.lineTo(x + 46, y + 2); c.lineTo(x + 44, y + 8); c.lineTo(x + 52, y + 12); c.stroke();
      }
      c.fillStyle = 'rgba(200,200,190,0.35)'; for (let k = 0; k < 40; k++) c.fillRect(((k * 23 - t * 260) % 920 + 920) % 920 / 2.3, 130 + v.rand(k + 80) * 42, 1.2, 1.2);
      c.fillStyle = '#f2e2a0'; for (let k = 0; k < 9; k++) { const x = ((k * 44 - t * 260) % 396 + 396) % 396 - 40; c.fillRect(x, 150, 22, 2.5); }
      // the tornado behind, on the left
      pw33Funnel(v, 26, 160, 150, 120, t, { foot: 14, lean: 20 });
      // a wreck in the near lane: the van swerves up a lane around it (1.0-2.4)
      const wx = v.lerp(380, -60, v.seg(t, 0.8, 2.8));
      c.fillStyle = '#6a6a74'; v.rr(wx - 16, 154, 32, 14, 3); c.fill(); c.fillStyle = '#ff8a3a'; v.circle(wx, 150, 4); c.fill();
      const lane = e.inOut(v.seg(t, 0.9, 1.3)) - e.inOut(v.seg(t, 2.4, 2.8)), vy = v.lerp(170, 146, lane), vx = 170 + Math.sin(t * 3) * 4 + e.out(v.seg(t, 4.5, 6)) * 20;
      pw33Van(v, vx, vy, 0.95, t, { dents: 1 });
      // Pip on the roof: a hay bale flies in from the tornado (2.6-3.3) and gets batted away (3.3-4.4)
      const swing = v.seg(t, 3.1, 3.35), roofY = vy - 36;
      const hit = t >= 3.3, hu = v.seg(t, 2.4, 3.3), bu = v.seg(t, 3.3, 4.4);
      const hx = hit ? v.lerp(vx + 14, 340, bu) : v.lerp(30, vx + 14, hu), hy = hit ? roofY - 18 - bu * 50 : v.lerp(60, roofY - 18, hu) - Math.sin(hu * Math.PI) * 30;
      if (t > 2.4 && t < 4.4) pw33Hay(v, hx, hy, 1, t * 6);
      pw33Chaser(v, 0, vx - 4, roofY, { s: 0.6, face: -1, mood: t > 2.6 && t < 3.4 ? 'grit' : hit && t < 4.6 ? 'joy' : 'happy' });
      const a = -2.4 + v.ease.back(swing) * 2.8;
      v.line(vx - 8, roofY - 10, vx - 8 + Math.cos(a) * -16, roofY - 10 + Math.sin(a) * 16, '#8a5a2a', 3);
      if (t > 3.3 && t < 3.9) v.label('WHACK!', vx - 10, roofY - 34, 13, v.c.gold);
      // Bo at the wheel (in the window)
      v.hero(1, vx + 26, vy - 13, { s: 0.38, face: 1, mood: lane > 0.1 && lane < 0.9 ? 'wow' : 'happy', shadow: false });
      pw33Rain(v, t, 40, 6);
    },
  });
}
// ----- END 33-1 Tornado Alley Run -----

// ----- BEGIN 33-2 Flash Flood Climb -----
// A canyon fills with brown water. Pip steps into the ore bucket and Bo cranks the winch: the bucket hauls Pip up to the
// next ledge, then Pip holds the rope at the ring while Bo climbs it, just ahead of the rising flood.
{
  definePreview('Flash Flood Climb', {
    blurb: 'The canyon is flooding! Crank the ore bucket up, drop the rope and climb before the water gets you.',
    loop: 6, still: 1.4,
    draw(v, t) {
      const c = v.ctx, e = v.ease;
      pw33Sky(v, t, { mood: 'flood', flash: 6, boltX: 200 });
      // canyon walls
      c.fillStyle = '#8a5e40'; c.fillRect(0, 0, 40, v.H); c.fillRect(v.W - 40, 0, 40, v.H);
      c.fillStyle = '#7a5238'; for (let y = 10; y < v.H; y += 22) { c.fillRect(36, y, 8, 4); c.fillRect(v.W - 44, y + 11, 8, 4); }
      // ledges: the low one (y 150) and the upper one (y 92) ending at x 190
      c.fillStyle = '#a87a52'; c.fillRect(40, 150, v.W - 80, 10); c.fillStyle = '#5a8a3a'; c.fillRect(40, 148, v.W - 80, 3);
      c.fillStyle = '#a87a52'; c.fillRect(40, 92, 150, 10); c.fillStyle = '#5a8a3a'; c.fillRect(40, 90, 150, 3);
      v.circle(186, 88, 3); c.strokeStyle = '#c8ccd4'; c.lineWidth = 1.5; c.stroke();
      // the winch: a timber gantry over the bucket, its cable down to a crank drum on the low ledge
      const bkX = 205, crX = 252, bkY = 148 - 58 * (e.inOut(v.seg(t, 0.85, 1.85)) - e.inOut(v.seg(t, 2.25, 2.85)));
      c.fillStyle = '#6e4a2c'; c.fillRect(224, 52, 5, 96); c.fillRect(196, 50, 33, 5);
      v.fillCircle(bkX, 58, 4, '#4a4f5a'); v.fillCircle(bkX, 58, 1.5, '#c8ccd4');
      v.line(bkX, 58, bkX, bkY - 13, '#3a3f4a', 1.4);
      v.line(bkX + 3, 57, crX, 136, '#3a3f4a', 1.4);
      c.fillStyle = '#6e4a2c'; c.fillRect(crX - 2, 136, 4, 12);
      v.fillCircle(crX, 136, 6, '#5a5f6a'); v.fillCircle(crX, 136, 2, '#c8ccd4');
      const turn = t * 11 * (t > 0.8 && t < 1.85 ? 1 : 0) + (t >= 1.85 ? 1.85 * 11 : 0);
      v.line(crX, 136, crX + Math.cos(turn) * 9, 136 + Math.sin(turn) * 9, '#8a5a2a', 2.2); v.fillCircle(crX + Math.cos(turn) * 9, 136 + Math.sin(turn) * 9, 2, '#e8443a');
      // the bucket's back and handle
      c.fillStyle = '#5a5f6a'; c.fillRect(bkX - 11, bkY - 11, 22, 3);
      c.strokeStyle = '#3a3f4a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(bkX - 11, bkY - 10); c.lineTo(bkX, bkY - 14); c.lineTo(bkX + 11, bkY - 10); c.stroke();
      // Pip: walks in 0-0.7, rides 0.85-1.85, steps off onto the ledge 1.9-2.2
      let px, py;
      if (t < 0.7) { const k = v.seg(t, 0, 0.7); px = v.lerp(150, bkX, e.inOut(k)); py = 148 + v.hop(v.seg(t, 0.5, 0.7), 8); }
      else if (t < 1.9) { px = bkX; py = bkY; }
      else { const k = v.seg(t, 1.9, 2.2); px = v.lerp(bkX, 182, k); py = 90 + v.hop(k, 8); }
      // the rope drops 2.3-2.6 and Bo climbs it 2.8-4.2
      const drop = v.seg(t, 2.3, 2.6), climb = e.inOut(v.seg(t, 2.8, 4.2));
      if (drop > 0) { const len = drop * 58; v.line(186, 90, 196, 92, '#c89a10', 3); v.line(196, 92, 196 + Math.sin(t * 3) * 2, 92 + len, '#ffd23a', 2.5); }
      const cranking = t > 0.8 && t < 1.85;
      const bx = t < 2.2 ? crX - 12 : t < 2.8 ? v.lerp(crX - 12, 198, e.inOut(v.seg(t, 2.2, 2.75))) : 198, by = t < 2.8 ? 148 : v.lerp(148, 90, climb);
      pw33Chaser(v, 1, bx, t >= 4.2 ? 90 : by, { s: 0.6, face: t < 2.2 ? 1 : -1, sq: cranking ? 0.1 * Math.sin(t * 22) : 0, mood: cranking || (t > 2.8 && t < 4.2) ? 'grit' : t > 4.4 ? 'joy' : 'happy' });
      pw33Chaser(v, 0, px, py, { s: 0.6, face: t < 1.9 ? 1 : -1, mood: t > 0.85 && t < 1.9 ? 'wow' : t > 2.6 && t < 4.2 ? 'grit' : 'happy' });
      // the tub's front, over Pip's legs
      c.fillStyle = '#7a808c'; c.beginPath(); c.moveTo(bkX - 12, bkY - 9); c.lineTo(bkX + 12, bkY - 9); c.lineTo(bkX + 9, bkY + 2); c.lineTo(bkX - 9, bkY + 2); c.closePath(); c.fill();
      c.fillStyle = '#5a5f6a'; c.fillRect(bkX - 12, bkY - 9, 24, 2.5); c.fillRect(bkX - 10, bkY - 3, 20, 1.5);
      if (t > 0.25 && t < 0.85) v.bubble('Crank me up!', 196, 112, { size: 10 });
      if (t > 0.9 && t < 1.6) v.label('CLANK!', crX - 4, 116 - 8 * v.seg(t, 0.9, 1.6), 12, v.c.gold);
      // the water rises the whole time
      const wy = v.lerp(178, 140, v.seg(t, 0, 5.2));
      c.fillStyle = '#8a6a44'; c.beginPath(); c.moveTo(0, wy); for (let x = 0; x <= v.W; x += 10) c.lineTo(x, wy + Math.sin(x * 0.08 + t * 4) * 2.5); c.lineTo(v.W, v.H); c.lineTo(0, v.H); c.closePath(); c.fill();
      c.fillStyle = 'rgba(239,230,208,0.8)'; for (let x = 6; x < v.W; x += 24) { if (Math.sin(x + t * 3) > 0.2) { c.beginPath(); c.ellipse(x, wy, 6, 1.6, 0, 0, pw33TAU); c.fill(); } }
      if (t > 4.4) { v.label('Up and away!', 160, 36, 13, '#ffffff'); v.confetti(120, 70, t - 4.4); }
      pw33Rain(v, t, 34, 4, 'rgba(210,200,180,0.5)');
    },
  });
}
// ----- END 33-2 Flash Flood Climb -----

// ----- BEGIN 33-3 Blizzard Whiteout -----
// A whiteout: only a circle of orange flare light. Pip and Bo walk roped together; lightning flashes and shows a
// crevasse edge and an ice wall ahead; Bo swings the pick and smashes the wall; they walk on.
{
  definePreview('Blizzard Whiteout', {
    blurb: 'Lost in a blizzard! Roped together, one holds the only flare, the other breaks the ice with a pick.',
    loop: 6, still: 3.4,
    draw(v, t) {
      const c = v.ctx;
      pw33Sky(v, t, { mood: 'snow' });
      const scroll = t < 2.2 ? t * 22 : t < 3.8 ? 48 : 48 + (t - 3.8) * 22;
      // the ground and what is ahead (a crevasse far right, an ice wall)
      c.fillStyle = '#eef3f8'; c.fillRect(0, 140, v.W, 40);
      const cx = 300 - scroll * 0.4;
      c.fillStyle = '#1e3a5a'; c.beginPath(); c.moveTo(cx, 140); c.lineTo(cx + 34, 140); c.lineTo(cx + 26, 180); c.lineTo(cx + 6, 180); c.closePath(); c.fill();
      const wallX = 214 - scroll, smashed = t > 3.4;
      // the two heroes, roped: Pip holds the flare (at 70), Bo walks ahead (at 140) and swings 2.4-3.4
      const fx = 70, bx = smashed ? 140 + (t - 3.8 > 0 ? 0 : 0) : 140;
      const sw = t > 2.4 && t < 3.4 ? Math.sin(v.phase(t - 2.4, 0.33) * Math.PI) : 0;
      // the fog: everything but the light circle
      const flick = 1 + Math.sin(t * 23) * 0.03, lx = fx + 6, ly = 112, r = 84 * flick;
      const flash = v.phase(t, 6) > 0.27 && v.phase(t, 6) < 0.36 ? 1 - (v.phase(t, 6) - 0.27) / 0.09 : 0;
      c.save();
      const fog = c.createRadialGradient(lx, ly, r * 0.55, lx, ly, r);
      fog.addColorStop(0, 'rgba(206,214,226,0)'); fog.addColorStop(1, 'rgba(190,200,214,' + (0.95 - flash * 0.55) + ')');
      c.fillStyle = fog; c.fillRect(0, 0, v.W, v.H); c.restore();
      const warm = c.createRadialGradient(lx, ly, 2, lx, ly, r); warm.addColorStop(0, 'rgba(255,150,70,0.35)'); warm.addColorStop(1, 'rgba(255,150,70,0)');
      c.fillStyle = warm; c.fillRect(lx - r, ly - r, r * 2, r * 2);
      c.globalAlpha = v.clamp(1.6 - (wallX - lx) / r, 0.3, 1) + flash * 0.4; c.globalAlpha = Math.min(1, c.globalAlpha);
      if (!smashed) { const g = c.createLinearGradient(wallX - 9, 0, wallX + 9, 0); g.addColorStop(0, '#8ec8e6'); g.addColorStop(0.5, '#e0f4ff'); g.addColorStop(1, '#6aa8cc'); c.fillStyle = g; c.fillRect(wallX - 9, 92, 18, 48); if (t > 2.6) v.line(wallX - 6, 120, wallX + 4, 108, '#2a5a80', 1); if (t > 3) v.line(wallX - 2, 134, wallX + 6, 100, '#2a5a80', 1); }
      else if (t < 4.3) for (let k = 0; k < 6; k++) { const u = v.seg(t, 3.4, 4.2); v.fillCircle(wallX + (k - 3) * 6 + u * (k - 3) * 10, 130 - u * 30 + u * u * 50, 2.5, '#cfeaf8'); }
      c.globalAlpha = 1;
      // the rope
      c.strokeStyle = '#7a3a8a'; c.lineWidth = 2; c.beginPath(); c.moveTo(fx, 128); c.quadraticCurveTo((fx + bx) / 2, 142, bx, 128); c.stroke();
      pw33Chaser(v, 0, fx, 140, { s: 0.6, face: 1, mood: flash > 0.3 ? 'wow' : 'happy' });
      // the flare: a red stick with sparks
      v.line(fx + 7, 124, fx + 6, 114, '#c8322a', 2.5);
      for (let k = 0; k < 4; k++) { const u = (t * 4 + k / 4) % 1; v.fillCircle(fx + 6 + Math.sin(t * 9 + k) * 3 * u, 112 - u * 12, 1.8 * (1 - u) + 0.4, k % 2 ? '#ffb04a' : '#ffe08a'); }
      pw33Chaser(v, 1, bx, 140, { s: 0.6, face: 1, alpha: 0.95, mood: sw > 0.5 ? 'grit' : 'happy' });
      const a = -1.8 + sw * 2.2; v.line(bx + 6, 126, bx + 6 + Math.cos(a) * 14, 126 + Math.sin(a) * 14, '#7a5434', 2.5); v.fillCircle(bx + 6 + Math.cos(a) * 14, 126 + Math.sin(a) * 14, 2.4, '#c8ccd4');
      if (t > 3.4 && t < 4) v.label('SMASH!', wallX, 86, 12, '#ffffff');
      // blowing snow on top
      for (let i = 0; i < 70; i++) { const x = ((v.rand(i) * (v.W + 60) - t * (120 + v.rand(i + 4) * 80)) % (v.W + 60) + v.W + 60) % (v.W + 60) - 30, y = (v.rand(i + 9) * v.H + t * 30 + Math.sin(t * 2 + i) * 6) % v.H; v.fillCircle(x, y, 0.8 + v.rand(i + 5) * 1.6, 'rgba(255,255,255,0.9)'); }
      if (flash > 0.6) { c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(0, 0, v.W, v.H); }
    },
  });
}
// ----- END 33-3 Blizzard Whiteout -----

// ----- BEGIN 33-4 Twister Tag -----
// Two little tornadoes on a farm field, Pip's and Bo's, circling each other with hay and a cow orbiting them. Pip's
// twister grows, lunges with a gust dash and spits a hay bale at Bo's.
{
  definePreview('Twister Tag', {
    blurb: 'You ARE the tornado! Suck up hay, cows and tractors to grow, then swallow the other twister.',
    loop: 5, still: 2.2,
    draw(v, t) {
      const c = v.ctx, e = v.ease;
      pw33Sky(v, t, { mood: 'storm' });
      // the field at a slant, with crop rows
      c.fillStyle = '#6e8c46'; c.beginPath(); c.moveTo(20, 74); c.lineTo(300, 74); c.lineTo(340, 180); c.lineTo(-20, 180); c.closePath(); c.fill();
      for (let k = 0; k < 9; k++) { const u = k / 8; v.line(v.lerp(24, 296, u), 76, v.lerp(-10, 330, u), 180, k % 2 ? 'rgba(90,120,52,0.6)' : 'rgba(130,160,80,0.5)', 3); }
      c.strokeStyle = '#7a5434'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(20, 70); c.lineTo(300, 70); c.stroke();
      c.fillStyle = '#4a7a9a'; c.beginPath(); c.ellipse(160, 136, 34, 12, 0, 0, pw33TAU); c.fill();
      // the two twisters circle the pond; Pip's (orange ring) grows and lunges at 2.6-3.0
      const a = t * 1.2, lunge = v.seg(t, 2.6, 3.0), back = v.seg(t, 3.0, 3.6);
      const p0 = { x: 160 + Math.cos(a) * 90, y: 132 + Math.sin(a) * 30 }, p1 = { x: 160 + Math.cos(a + Math.PI) * 90, y: 132 + Math.sin(a + Math.PI) * 30 };
      const lx = (p1.x - p0.x) * 0.35 * e.out(lunge) * (1 - back), ly = (p1.y - p0.y) * 0.35 * e.out(lunge) * (1 - back);
      const big0 = 1 + v.seg(t, 0.5, 2.4) * 0.5;
      const tw = (p, id, sz) => {
        c.strokeStyle = id === 0 ? '#ff6a5a' : '#4a8aff'; c.lineWidth = 1.5; c.setLineDash([4, 4]); c.beginPath(); c.ellipse(p.x, p.y, 24 * sz, 9 * sz, 0, 0, pw33TAU); c.stroke(); c.setLineDash([]);
        // orbiting junk: behind, funnel, in front
        const items = id === 0 ? ['hay', 'cow', 'hay'] : ['hay', 'hay'];
        const orb = front => items.forEach((k, i) => { const q = t * 3 + i * 2.1, s2 = Math.sin(q); if ((s2 > 0) !== front) return; const x = p.x + Math.cos(q) * 16 * sz, y = p.y - (20 + i * 12) * sz + s2 * 4; c.globalAlpha = front ? 1 : 0.55; (k === 'cow' ? pw33Cow : pw33Hay)(v, x, y, 0.5 * sz, q * 2); c.globalAlpha = 1; });
        orb(false);
        pw33Funnel(v, p.x, p.y, 70 * sz, 44 * sz, t + id, { foot: 5 * sz, col: id === 0 ? '#8a8a6a' : '#8a7462', lean: id === 0 ? lx * 0.4 : 0 });
        c.strokeStyle = id === 0 ? '#ff6a5a' : '#4a8aff'; c.lineWidth = 2; c.beginPath(); c.ellipse(p.x, p.y - 38 * sz, 9 * sz, 3 * sz, 0, 0, Math.PI); c.stroke();
        orb(true);
      };
      const P0 = { x: p0.x + lx, y: p0.y + ly };
      const order = P0.y < p1.y ? [[P0, 0, big0], [p1, 1, 1]] : [[p1, 1, 1], [P0, 0, big0]];
      for (const [p, id, sz] of order) tw(p, id, sz);
      // the spat hay bale flies at Bo's twister
      if (t > 2.7 && t < 3.3) { const u = v.seg(t, 2.7, 3.2); pw33Hay(v, v.lerp(P0.x, p1.x, u), v.lerp(P0.y - 20, p1.y - 24, u), 0.7, t * 12); }
      if (t > 3.2 && t < 3.9) v.label('WHAM! -2', p1.x, p1.y - 76, 12, '#ffffff');
      pw33Rain(v, t, 30, 5);
    },
  });
}
// ----- END 33-4 Twister Tag -----
