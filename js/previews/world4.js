/* Pip & Bo - Level previews for World 4 (see js/previews/preview-core.js for how to write one). */
'use strict';

/* World 4 props, drawn like the levels' own (js/levels/world4/), scaled to the preview. Every helper starts with pw4. */
// a level's own colours over the world theme (the level defs' theme in js/levels/level-list.js)
const PW4_THEME = {
  koth: { stone: '#6d5643', stoneLight: '#806650', stoneEdge: '#4e3d30', grass: '#8fe071', grassDark: '#52aa46' },
  snow: { skyTop: '#bcdcf2', skyBot: '#e6f0f9', hillFar: '#d5e5f2', hillNear: '#b9d0e4', stone: '#56688c', stoneLight: '#667aa0',
    stoneEdge: '#3b4a6c', grass: '#f8fcff', grassDark: '#c4d8ec', sun: 'rgba(255, 252, 238, 0.95)', sunGlow: 'rgba(255, 252, 238, 0.35)' },
  potato: { grass: '#f3d68f', grassDark: '#d9ae5c' },
  paint: { grass: '#f3ead8', grassDark: '#d6c8ad' },
};
const pw4Theme = (v, key) => { v.c = Object.assign({}, v.c, PW4_THEME[key]); };
const pw4Col = (v, id) => (id ? v.c.bo : v.c.pip);
const pw4Dark = (v, id) => (id ? v.c.boDark : v.c.pipDark);

// a 5-point star path (the levels' own star shape)
function pw4StarPath(v, x, y, r, ri) {
  const ctx = v.ctx;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? ri : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  ctx.closePath();
}
// the game's crown (js/render.js drawCrownShape)
function pw4Crown(v, x, y, s) {
  const ctx = v.ctx;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = v.c.gold; ctx.strokeStyle = v.c.goldDark; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, 7); ctx.lineTo(-13, -6); ctx.lineTo(-6, 0); ctx.lineTo(0, -9); ctx.lineTo(6, 0); ctx.lineTo(13, -6); ctx.lineTo(12, 7); ctx.closePath();
  ctx.fill(); ctx.stroke();
  v.fillCircle(0, 2, 2.6, '#ff5f7e'); v.fillCircle(-7, 3, 2, '#7fd8ff'); v.fillCircle(7, 3, 2, '#7fd8ff');
  ctx.restore();
}
// a score bar at the top: Pip's from the left edge, Bo's from the right (f 0..1), with a little icon at the outer end
function pw4Bars(v, fp, fb, o = {}) {
  const ctx = v.ctx, w = o.w || 112, y = o.y || 9;
  ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  for (const [id, x0, f] of [[0, 30, fp], [1, v.W - 30 - w, fb]]) {
    ctx.fillStyle = 'rgba(28,26,54,0.6)'; v.rr(x0, y, w, 12, 6); ctx.fill();
    const fw = (w - 4) * v.clamp(f, 0, 1);
    if (fw > 1) { ctx.fillStyle = f >= 1 ? v.c.gold : pw4Col(v, id); v.rr(id ? x0 + w - 2 - fw : x0 + 2, y + 2, fw, 8, 4); ctx.fill(); }
    const ix = id ? v.W - 16 : 16;
    v.fillCircle(ix, y + 6, 9, pw4Col(v, id));
    ctx.strokeStyle = pw4Dark(v, id); ctx.lineWidth = 2; v.circle(ix, y + 6, 9); ctx.stroke();
    if (o.icon) o.icon(ix, y + 6, id);
  }
  ctx.restore();
}

/* ----- 4-1 King of the Hill ----- */
// a cartoon boxing glove (js/levels/world4/king-of-the-hill.js kothDrawGlove), centred on (x, y), pointing face
function pw4Glove(v, x, y, sc, face, id, o = {}) {
  const ctx = v.ctx, sx = o.sx || 1, sy = o.sy || 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(face * sc * sx, sc * sy);
  const lw = 2 / sc, base = o.gold ? v.c.gold : pw4Dark(v, id), light = o.gold ? '#fff0b0' : pw4Col(v, id), line = o.gold ? v.c.goldDark : 'rgba(28,26,54,0.65)';
  if (o.glow > 0) v.fillCircle(0, 0, 17, 'rgba(255,197,61,' + o.glow + ')');
  ctx.fillStyle = '#fff3e0'; v.rr(-16, -6.5, 10, 13, 3); ctx.fill();
  ctx.fillStyle = o.gold ? v.c.goldDark : pw4Col(v, id); ctx.fillRect(-12.5, -6.5, 2.6, 13);
  ctx.strokeStyle = line; ctx.lineWidth = lw * 0.8; v.rr(-16, -6.5, 10, 13, 3); ctx.stroke();
  ctx.fillStyle = base; ctx.beginPath(); ctx.ellipse(0, 0.5, 10.5, 9.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.globalAlpha *= 0.6; ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(-1, -2.5, 7.5, 5.5, -0.25, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(0, 0.5, 10.5, 9.5, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = base; ctx.beginPath(); ctx.ellipse(1.5, -7.5, 5.5, 3.4, -0.15, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = lw * 0.85; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(-3.5, -3.5, 2.6, 1.6, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// a hero with a glove: o.punch 0..1 (o.reach px), o.charge 0..1 (wound up behind and puffing up), plus the hero's options
function pw4Boxer(v, id, x, y, t, o = {}) {
  const ctx = v.ctx, face = o.face, ch = o.charge || 0, pu = o.punch || 0;
  ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (ch > 0) { // the charge ring round the body
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(28,26,54,0.35)'; v.circle(x, y - 12, 19); ctx.stroke();
    ctx.strokeStyle = ch >= 1 ? v.c.gold : pw4Col(v, id);
    ctx.beginPath(); ctx.arc(x, y - 12, 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ch); ctx.stroke();
  }
  ctx.restore();
  v.hero(id, x, y, o);
  ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  const restX = x + face * 15, restY = y - 10 + Math.sin(t * 9 + id) * 1;
  let gx = restX, gy = restY, sc = 0.72, sx = 1, sy = 1, glow = 0;
  if (ch > 0) {
    sc = 0.72 * (1 + 0.45 * ch); gx = x - face * (12 + 5 * ch); gy = y - 15;
    const w = 0.05 + 0.08 * ch; sx = 1 + w * Math.sin(t * (10 + 16 * ch)); sy = 1 - w * Math.sin(t * (10 + 16 * ch));
    if (ch >= 1) { glow = 0.4 + 0.3 * Math.sin(t * 40); gx += Math.sin(t * 57) * 1.2; }
  } else if (pu > 0) {
    sc = o.mega ? 1.1 : 0.72; gx = restX + face * (o.reach || 14) * pu; sx = 1 + 0.25 * pu; sy = 1 - 0.12 * pu;
    const x0 = x + face * 8, x1 = gx - face * 11 * sc, len = x1 - x0;
    if (Math.abs(len) > 3) { // the spring arm
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [lw, col] of [[4.5, 'rgba(28,26,54,0.55)'], [2.2, '#e9e6f5']]) {
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x0, gy);
        for (let i = 1; i < 6; i++) ctx.lineTo(x0 + len * i / 6, gy + (i % 2 ? -4 : 4));
        ctx.lineTo(x1, gy); ctx.stroke();
      }
    }
    if (o.mega) { // speed lines
      ctx.strokeStyle = v.c.gold; ctx.lineWidth = 2.5; ctx.globalAlpha *= 0.85 * pu;
      for (const dy of [-8, 0, 8]) v.line(gx - face * 16, gy + dy, gx - face * (30 + Math.abs(dy)), gy + dy, v.c.gold, 2.5);
    }
  }
  pw4Glove(v, gx, gy, sc, face, id, { gold: o.mega || ch >= 1, glow, sx, sy });
  if (ch >= 0.5) for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; v.sparkle(gx + Math.cos(a) * 15, gy + Math.sin(a) * 12, v.phase(t, 0.5, i * 0.33), '#fff', 4); }
  ctx.restore();
}
// the summit: zone band, posts and the flag (orange or blue for one scorer, flickering stripes when both stand on it)
function pw4HillTop(v, t, x0, x1, top, state) {
  const ctx = v.ctx, hx = (x0 + x1) / 2, flick = Math.floor(t * 8) % 2;
  const col = state === 0 || state === 1 ? pw4Col(v, state) : state === 2 ? pw4Col(v, flick) : '#e9e4f5';
  ctx.save(); ctx.globalAlpha *= state === -1 ? 0.45 : 0.75; ctx.fillStyle = col; ctx.fillRect(x0, top, x1 - x0, 4); ctx.restore();
  for (const x of [x0, x1]) {
    ctx.fillStyle = '#fff3e0'; v.rr(x - 2, top - 14, 4, 14, 2); ctx.fill();
    v.fillCircle(x, top - 15, 2.6, v.c.gold);
  }
  const pt = top - 56;
  ctx.fillStyle = '#fff3e0'; ctx.fillRect(hx - 1.5, pt, 3, 56);
  ctx.fillStyle = 'rgba(28,26,54,0.25)'; ctx.fillRect(hx + 0.5, pt, 1, 56);
  v.fillCircle(hx, pt - 1, 3.5, v.c.gold);
  const wv = q => Math.sin(t * 6 + q * 3) * 2.2;
  ctx.beginPath(); ctx.moveTo(hx + 1.5, pt + 2);
  for (let i = 1; i <= 6; i++) ctx.lineTo(hx + 1.5 + i * 5, pt + 2 + wv(i) * i / 6);
  for (let i = 6; i >= 0; i--) ctx.lineTo(hx + 1.5 + i * 5, pt + 22 + wv(i) * i / 6);
  ctx.closePath();
  if (state === 2) {
    ctx.save(); ctx.clip();
    for (let i = 0; i < 8; i++) { ctx.fillStyle = pw4Col(v, (i + flick) % 2); ctx.fillRect(hx + i * 4, pt - 2, 4, 30); }
    ctx.restore();
  } else { ctx.fillStyle = col; ctx.fill(); }
  if (state === 0 || state === 1) pw4Crown(v, hx + 17, pt + 12 + wv(3) * 0.5, 0.5);
}

// 4-1: Pip holds the hill, Bo climbs up and charges a MEGA punch, Pip bounces off, and Bo fills the meter to win
definePreview('King of the Hill', {
  blurb: 'Stand alone on top of the hill to score. Punch your rival off!',
  loop: 7, still: 3.62,
  draw(v, t) {
    pw4Theme(v, 'koth');
    const ctx = v.ctx, gy = 160, k = t / 7, top = 88;
    v.sky(); v.sun(); v.clouds(t); v.hills(gy - 30); v.ground(gy);
    // the stepped hill, widest step first
    const tiers = [[70, 250, 142], [88, 232, 124], [106, 214, 106], [124, 196, 88]];
    for (const [a, b, y] of tiers) v.block(a, y, b - a, gy - y + 2);
    const reset = k >= 0.95, alpha = k < 0.91 ? 1 : reset ? v.seg(k, 0.95, 1) : 1 - v.seg(k, 0.91, 0.95);
    const walk = (a, b) => (k > a && k < b ? v.hop(v.phase(t, 0.34), 3) : 0);
    // Pip: on top, jabs, then gets MEGA-punched off to the left, sits dizzy, gets up and walks back
    const pip = { x: 146, y: top, face: 1, mood: 'happy', rot: 0, air: false, punch: 0 };
    if (k > 0.33 && k < 0.4) pip.punch = Math.sin(v.seg(k, 0.33, 0.4) * Math.PI);
    if (k > 0.3) pip.mood = 'grit';
    if (k > 0.5) {
      const s = v.seg(k, 0.5, 0.62);
      pip.x = v.lerp(146, 42, v.ease.out(s)); pip.y = v.lerp(top, gy, s) + v.hop(s, 34); pip.rot = -s * Math.PI * 2; pip.air = s < 1; pip.mood = 'wow';
    }
    if (k > 0.62) pip.mood = 'dizzy';
    if (k > 0.72) { pip.x = v.lerp(42, 60, v.ease.inOut(v.seg(k, 0.72, 0.8))); pip.y = gy + walk(0.72, 0.8); pip.mood = 'grit'; }
    if (k > 0.84) pip.mood = 'wow';
    // Bo: walks in, hops up the steps, charges, MEGA punch, then stands alone on top
    const bo = { x: v.lerp(292, 260, v.ease.inOut(v.seg(k, 0.02, 0.09))), y: gy + walk(0.02, 0.09), face: -1, mood: 'grit', air: false, charge: 0, punch: 0 };
    const steps = [[260, gy], [241, 142], [223, 124], [205, 106], [184, top]];
    for (let i = 0; i < 4; i++) {
      const a = 0.09 + i * 0.05, s = v.seg(k, a, a + 0.05);
      if (k > a) { const [x0, y0] = steps[i], [x1, y1] = steps[i + 1]; bo.x = v.lerp(x0, x1, s); bo.y = v.lerp(y0, y1, s) + v.hop(s, 12); bo.air = s < 1; }
    }
    if (k > 0.33 && k < 0.4) { bo.x = 184 + 4 * Math.sin(v.seg(k, 0.35, 0.4) * Math.PI); bo.mood = 'wow'; }
    if (k > 0.4 && k < 0.5) bo.charge = v.ease.out(v.seg(k, 0.4, 0.48));
    if (k > 0.5 && k < 0.58) bo.punch = k < 0.52 ? v.seg(k, 0.5, 0.52) : 1 - v.seg(k, 0.54, 0.58);
    if (k > 0.58) { bo.x = v.lerp(184, 142, v.ease.inOut(v.seg(k, 0.58, 0.66))); bo.y = top + walk(0.58, 0.66); bo.mood = 'happy'; }
    const win = k > 0.84 && !reset;
    if (win) { bo.mood = 'joy'; bo.y = top + v.hop(v.phase(t, 0.5), 7); }
    if (reset) { pip.x = 146; pip.y = top; pip.rot = 0; pip.mood = 'happy'; pip.air = false; bo.x = 292; bo.y = gy; bo.mood = 'grit'; bo.air = false; bo.charge = bo.punch = 0; }
    // who is scoring: Pip alone, both (nobody scores), Bo alone
    const pipOn = !reset && (k < 0.5), boOn = !reset && k > 0.3;
    const state = reset ? 0 : pipOn && boOn ? 2 : pipOn ? 0 : boOn ? 1 : -1;
    pw4HillTop(v, t, 124, 196, top, state);
    const reach = 26;
    pw4Boxer(v, 0, pip.x, pip.y, t, { face: pip.face, mood: pip.mood, rot: pip.rot, shadow: !pip.air, punch: pip.punch, reach: 10, alpha });
    pw4Boxer(v, 1, bo.x, bo.y, t, { face: bo.face, mood: bo.mood, shadow: !bo.air, charge: bo.charge, punch: bo.punch, reach, mega: bo.punch > 0, alpha });
    if (k > 0.5 && k < 0.64) { const s = v.ease.back(v.seg(k, 0.5, 0.53)); ctx.save(); ctx.translate(222, 48); ctx.rotate(-0.08); ctx.scale(s, s); v.label('POW!', 0, 0, 24, v.c.gold); ctx.restore(); }
    if (k > 0.5 && k < 0.6) v.sparkle(138, top - 14, v.seg(k, 0.5, 0.6), '#fff', 12);
    // knock-out stars: the hit knocks a little hill time out of Pip
    if (k > 0.51 && k < 0.62) {
      const u = v.seg(k, 0.51, 0.62);
      ctx.save(); ctx.globalAlpha *= 1 - v.ease.in(u);
      for (let i = 0; i < 3; i++) {
        const sx = 136 - (4 + i * 18) * u, sy = top - 18 + v.hop(u, 32 - i * 9);
        pw4StarPath(v, sx, sy, 6, 2.6); ctx.fillStyle = v.c.gold; ctx.fill(); ctx.strokeStyle = v.c.goldDark; ctx.lineWidth = 1.5; ctx.stroke();
      }
      ctx.restore();
    }
    if (k > 0.24 && k < 0.33) v.bubble('My hill!', bo.x, bo.y - 30);
    // meters: Pip scores first, loses a bit to the MEGA hit, Bo fills his to the top
    const pf = reset ? 0 : 0.45 * v.seg(k, 0, 0.3) - 0.12 * v.seg(k, 0.52, 0.56);
    const bf = reset ? 0 : v.seg(k, 0.6, 0.84);
    pw4Bars(v, pf, bf, { alpha: k < 0.91 ? 1 : reset ? 1 : 1 - v.seg(k, 0.91, 0.95), icon: (x, y) => pw4Crown(v, x, y + 1, 0.42) });
    if (win) {
      ctx.save(); ctx.globalAlpha *= alpha;
      pw4Crown(v, bo.x, bo.y - 40, 0.75 * v.ease.back(v.seg(k, 0.84, 0.88)));
      v.confetti(bo.x, bo.y - 30, v.seg(k, 0.84, 1));
      ctx.restore();
    }
  },
});

/* ----- 4-2 Snowball Fight ----- */
// a white snowball with a shade and an outline in the thrower's dark colour (snowBallShape)
function pw4Snowball(v, x, y, r, edge) {
  const ctx = v.ctx;
  v.fillCircle(x + 1.2, y + 1.6, r + 1, 'rgba(40,60,100,0.3)');
  v.fillCircle(x, y, r, '#d6e4f2');
  v.fillCircle(x - r * 0.2, y - r * 0.2, r * 0.8, '#ffffff');
  ctx.strokeStyle = edge; ctx.lineWidth = 1.8; v.circle(x, y, r); ctx.stroke();
}
// a round mitten in the player's colour with a white cuff (snowMitten)
function pw4Mitten(v, x, y, id, r = 3.6) {
  const ctx = v.ctx;
  ctx.fillStyle = pw4Col(v, id); ctx.strokeStyle = pw4Dark(v, id); ctx.lineWidth = 1.6;
  v.circle(x, y, r); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff'; v.rr(x - r * 0.85, y + r * 0.35, r * 1.7, r * 0.7, r * 0.3); ctx.fill();
}
// snow packed on a hero standing at (x, y): lay px up from the feet, a lump on the head when nearly full
function pw4SnowOn(v, x, y, lay) {
  if (lay <= 0) return;
  const ctx = v.ctx;
  ctx.save(); v.rr(x - 10, y - 24, 20, 24, 7); ctx.clip();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x - 12, y + 2);
  for (let i = 0; i <= 6; i++) ctx.lineTo(x - 12 + 24 * i / 6, y - lay + Math.sin(i * 2.1 + lay) * 1.5);
  ctx.lineTo(x + 12, y + 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#c4d8ec'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  if (lay >= 18) {
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#c4d8ec'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(x + 2, y - 24, 7, 4, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}
// a player turned snowman (snowDrawSnowman), feet at (x, y): Bo's ears or Pip's sprout poke out, scarf in their colour
function pw4Snowman(v, id, x, y, f, s, sq = 1) {
  const ctx = v.ctx;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * sq, s * (2 - sq));
  ctx.fillStyle = 'rgba(40,60,100,0.18)'; ctx.beginPath(); ctx.ellipse(0, 0, 17, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  const ball = (yy, r) => {
    v.fillCircle(0, yy, r, '#dbe7f4'); v.fillCircle(-r * 0.15, yy - r * 0.15, r * 0.84, '#ffffff');
    ctx.strokeStyle = '#97adca'; ctx.lineWidth = 2; v.circle(0, yy, r); ctx.stroke();
  };
  if (id === 1) { ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#97adca'; ctx.lineWidth = 2; for (const ex of [-8, 8]) { v.circle(ex, -48, 5.5); ctx.fill(); ctx.stroke(); } }
  ball(-16, 16); ball(-39, 11.5);
  if (id === 0) { v.line(0, -50, 1, -56, '#3f8f5c', 2); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(5, -58, 6, 3, -0.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = pw4Col(v, id); v.rr(-11, -31, 22, 6, 3); ctx.fill();
  ctx.fillStyle = pw4Dark(v, id); v.rr(-f * 7 - 3, -28, 6, 13, 2.5); ctx.fill();
  ctx.fillStyle = v.c.ink; v.circle(0, -17, 1.8); ctx.fill(); v.circle(0, -10, 1.8); ctx.fill();
  for (const ex of [-4, 4]) { v.circle(ex + f * 1.5, -42, 2.1); ctx.fill(); }
  ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(f * 1.5, -37, 3, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.moveTo(f * 2, -40); ctx.lineTo(f * 14, -37.5); ctx.lineTo(f * 2, -35.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,120,140,0.45)'; v.circle(-7 + f, -36, 2.2); ctx.fill(); v.circle(7 + f, -36, 2.2); ctx.fill();
  ctx.restore();
}
// a snow fort (snowDrawForts): bricks from (x, top) down to y, a rounded snow cap; chip 0..1 shows a crack
function pw4Fort(v, x, top, w, y, chip) {
  const ctx = v.ctx, h = y - top;
  ctx.fillStyle = '#f4f9ff'; ctx.fillRect(x, top, w, h);
  ctx.fillStyle = 'rgba(120,150,190,0.22)'; ctx.fillRect(x + w - 3, top, 3, h);
  ctx.fillStyle = '#c3d3e7'; ctx.fillRect(x, top + h / 2, w, 1.6); ctx.fillRect(x + w / 2, top, 1.6, h / 2); ctx.fillRect(x + w / 4, top + h / 2, 1.6, h / 2); ctx.fillRect(x + w * 3 / 4, top + h / 2, 1.6, h / 2);
  ctx.strokeStyle = '#9fb6d3'; ctx.lineWidth = 1.4; ctx.strokeRect(x + 0.7, top + 0.7, w - 1.4, h - 1.4);
  if (chip > 0) { ctx.strokeStyle = '#7f97ba'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 6, top + 1); ctx.lineTo(x + 10, top + 6); ctx.lineTo(x + 7, top + 10); ctx.stroke(); }
  ctx.fillStyle = '#ffffff'; v.rr(x - 2, top - 4, w + 4, 7, 3.5); ctx.fill();
  v.circle(x + 5, top + 3, 2.5); ctx.fill(); v.circle(x + w - 6, top + 3.5, 2); ctx.fill();
}
// a snowy pine (snowDrawDecor), feet at (x, y)
function pw4Pine(v, x, y, s) {
  const ctx = v.ctx;
  ctx.fillStyle = '#6b4a35'; ctx.fillRect(x - 3 * s, y - 12 * s, 6 * s, 12 * s);
  for (let i = 0; i < 3; i++) {
    const ty = y - 10 * s - i * 15 * s, hw = (22 - i * 5) * s;
    ctx.fillStyle = '#2f7a68'; ctx.beginPath(); ctx.moveTo(x - hw, ty); ctx.lineTo(x, ty - 24 * s); ctx.lineTo(x + hw, ty); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f8fcff'; ctx.beginPath(); ctx.moveTo(x - hw * 0.55, ty - 10 * s); ctx.lineTo(x, ty - 24 * s); ctx.lineTo(x + hw * 0.55, ty - 10 * s);
    ctx.quadraticCurveTo(x, ty - 6 * s, x - hw * 0.55, ty - 10 * s); ctx.fill();
  }
}

// 4-2: Bo throws and Pip ducks, then Pip lands four hits and Bo turns into a (smiling) snowman
definePreview('Snowball Fight', {
  blurb: 'Throw snowballs and duck! Four hits turn your rival into a snowman.',
  loop: 7.5, still: 6.6,
  draw(v, t) {
    pw4Theme(v, 'snow');
    const ctx = v.ctx, gy = 150, k = t / 7.5, pipX = 60, boX = 260;
    v.sky(); v.sun(); v.clouds(t); v.hills(gy - 30);
    pw4Pine(v, 20, gy, 0.8); pw4Pine(v, 302, gy, 0.8);
    v.ground(gy);
    // the snowy mound in the middle
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(160, gy, 34, 12, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#c4d8ec'; ctx.lineWidth = 1.5; ctx.stroke();
    const reset = k >= 0.96, alpha = k < 0.92 ? 1 : reset ? v.seg(k, 0.96, 1) : 1 - v.seg(k, 0.92, 0.96);
    // throws: [who, wind-up start, release, landing, target x, target y, arc height, hits Bo?]
    const throws = [
      [1, 0.04, 0.08, 0.2, 10, gy - 2, 28, false],        // Bo's throw comes in at head height and flies over ducking Pip
      [0, 0.21, 0.25, 0.34, boX, gy - 13, 40, true],       // Pip: hit 1
      [1, 0.35, 0.39, 0.48, 100, gy - 26, 30, false],      // Bo: thud into Pip's fort
      [0, 0.47, 0.51, 0.6, boX, gy - 13, 40, true],        // hit 2
      [0, 0.6, 0.63, 0.71, boX, gy - 13, 38, true],        // hit 3
      [0, 0.71, 0.74, 0.82, boX, gy - 13, 38, true],       // hit 4: snowman!
    ];
    let hits = 0, chip = 0;
    const hand = [{ s: 'hold', u: 0 }, { s: 'hold', u: 0 }];
    for (const [id, a, r, e, , , , hit] of throws) {
      if (k >= a && k < r) hand[id] = { s: 'wind', u: v.seg(k, a, r) };
      else if (k >= r && k < r + 0.04) hand[id] = { s: 'throw', u: v.seg(k, r, r + 0.04) };
      if (k >= e) { if (hit) hits++; else if (id === 1 && a > 0.3) chip = 1; }
    }
    if (reset) { hits = 0; chip = 0; }
    const frozen = hits >= 4, popK = v.seg(k, 0.82, 0.86);
    pw4Fort(v, 90, gy - 24, 20, gy, chip);
    pw4Fort(v, 210, gy - 24, 20, gy, 0);
    // Pip: ducks under Bo's first throw, cheers at the end
    const duck = v.ease.inOut(Math.min(v.seg(k, 0.09, 0.12), 1 - v.seg(k, 0.19, 0.22)));
    const pipWin = k > 0.84 && !reset;
    const pipY = gy + (pipWin ? v.hop(v.phase(t, 0.5), 9) : 0);
    const pipMood = pipWin ? 'joy' : duck > 0.3 ? 'wow' : hand[0].s !== 'hold' ? 'grit' : 'happy';
    const heroes = [[0, pipX, pipY, 1, duck, pipMood], [1, boX, gy, -1, 0, hits >= 3 ? 'wow' : hand[1].s !== 'hold' ? 'grit' : 'happy']];
    for (const [id, x, y, f, dk, mood] of heroes) {
      ctx.save(); ctx.globalAlpha *= alpha;
      if (id === 1 && frozen) { pw4Snowman(v, 1, x, y, f, 0.8, 1.3 - 0.3 * v.ease.out(popK)); ctx.restore(); continue; }
      v.hero(id, x, y, { face: f, mood, sq: dk * 0.9 });
      if (id === 1) pw4SnowOn(v, x, y, [0, 6, 11, 18][hits]);
      const hd = hand[id], top = y - 24 * (1 - dk * 0.27);
      pw4Mitten(v, x - f * 11, y - 10, id);
      let hx = x + f * 11, hy = y - 10, ball = true;
      if (dk > 0) { hx = x + f * 9; hy = y - 4; }
      if (hd.s === 'wind') { hx = x - f * (11 + 3 * hd.u); hy = top + 2 - 6 * hd.u; }
      if (hd.s === 'throw') { hx = x + f * (12 + 4 * hd.u); hy = top + 2; ball = false; }
      pw4Mitten(v, hx, hy, id);
      if (ball && !(id === 0 && pipWin) && dk === 0) pw4Snowball(v, hx + f * 1.5, hy - 6.5, 3.6, pw4Dark(v, id));
      ctx.restore();
    }
    // the snowballs in the air, and a puff where they land
    for (const [id, a, r, e, tx, ty, h, hit] of throws) {
      const f = id ? -1 : 1, x0 = (id ? boX : pipX) + f * 12, y0 = gy - 30;
      if (k >= r && k < e) { const s = v.seg(k, r, e); pw4Snowball(v, v.lerp(x0, tx, s), v.lerp(y0, ty, s) + v.hop(s, h), 5, pw4Dark(v, id)); }
      v.puff(tx - f * 4, ty + 4, v.seg(k, e, e + 0.06), '#ffffff');
      if (hit && e < 0.8 && k > e && k < e + 0.07) v.label('SPLAT!', tx, ty - 32 - v.seg(k, e, e + 0.07) * 8, 13, '#fff');
    }
    if (k > 0.1 && k < 0.22) v.label('DUCK!', pipX + 2, gy - 44, 14, '#fff');
    // the hit counters: four snowballs each, filled as hits land on that player
    const hitAt = throws.filter(q => q[7]).map(q => q[3]);
    for (const id of [0, 1]) {
      const n = id ? hits : 0, x0 = id ? v.W - 18 : 18;
      ctx.fillStyle = 'rgba(28,26,54,0.55)'; v.rr(id ? x0 - 72 : x0 - 2, 7, 74, 18, 9); ctx.fill();
      v.fillCircle(x0, 16, 9, pw4Col(v, id)); ctx.strokeStyle = pw4Dark(v, id); ctx.lineWidth = 2; v.circle(x0, 16, 9); ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const cx = x0 + (id ? -1 : 1) * (20 + i * 13);
        if (i < n) { const pop = i === n - 1 ? 1 + 0.5 * Math.sin(Math.PI * v.seg(k, hitAt[i], hitAt[i] + 0.04)) : 1; pw4Snowball(v, cx, 16, 5 * pop, '#97adca'); }
        else { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.6; v.circle(cx, 16, 4.5); ctx.stroke(); }
      }
    }
    if (frozen && !reset) {
      const s = v.ease.back(v.seg(k, 0.82, 0.86));
      ctx.save(); ctx.globalAlpha *= alpha;
      ctx.save(); ctx.translate(boX - 10, 56); ctx.scale(s, s); v.label('SNOWMAN!', 0, 0, 17, '#fff'); ctx.restore();
      v.confetti(pipX, gy - 30, v.seg(k, 0.84, 1));
      v.star(pipX, pipY - 44, 8 * v.ease.back(v.seg(k, 0.84, 0.88)));
      ctx.restore();
    }
  },
});

/* ----- 4-3 Hot Potato Volleyball ----- */
// a hex colour mix a -> b by k (potMix)
function pw4Mix(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = s => Math.round(((pa >> s) & 255) + ((((pb >> s) & 255) - ((pa >> s) & 255)) * k));
  return 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')';
}
// the potato bomb (potDrawPotato): a lumpy spud that reddens as the fuse burns (warm 0..1), a face, a wick of wick px with a spark
function pw4Potato(v, x, y, r, warm, spin, wick, t) {
  const ctx = v.ctx, hot = warm >= 0.85;
  if (hot) v.fillCircle(x, y, r + 5 + Math.sin(t * 28), 'rgba(255,90,60,' + (0.4 + 0.2 * Math.sin(t * 14)) + ')');
  else if (warm > 0) v.fillCircle(x, y, r + 4, 'rgba(255,140,80,' + 0.2 * warm + ')');
  ctx.save(); ctx.translate(x, y);
  ctx.save(); ctx.rotate(spin); ctx.beginPath();
  for (let i = 0; i <= 22; i++) {
    const a = i / 22 * Math.PI * 2, q = 1 + 0.06 * Math.sin(3 * a + 1) + 0.04 * Math.sin(5 * a + 2);
    ctx.lineTo(Math.cos(a) * r * 1.12 * q, Math.sin(a) * r * 0.95 * q);
  }
  ctx.closePath();
  ctx.fillStyle = pw4Mix('#c99a5b', '#ff5a3c', warm); ctx.fill();
  ctx.strokeStyle = pw4Mix('#7a5530', '#a8321e', warm); ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = pw4Mix('#a07440', '#c83a22', warm);
  for (const [ex, ey] of [[-0.62, 0.42], [0.66, 0.3], [0.18, 0.66]]) { v.circle(ex * r, ey * r, 1.5 * r / 11); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.ellipse(-r * 0.45, -r * 0.42, r * 0.32, r * 0.18, -0.5, 0, Math.PI * 2); ctx.fill();
  const s = r / 11;
  ctx.fillStyle = v.c.ink;
  for (const ex of [-3.6, 3.6]) { v.circle(ex * s, -1.2 * s, (hot ? 1.9 : 1.6) * s); ctx.fill(); }
  ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.4 * s; ctx.lineCap = 'round';
  if (hot) { ctx.beginPath(); ctx.ellipse(0, 4 * s, 2 * s, 2.6 * s, 0, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(0, 2.2 * s, 2.8 * s, 0.2, Math.PI - 0.2); ctx.stroke(); }
  ctx.restore();
  // the wick and its spark
  const top = y - r * 0.95, tx = x + 3 + Math.sin(t * 3) * 1.2, ty = top - wick;
  ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, top + 2); ctx.quadraticCurveTo(x - 3, top - wick * 0.5, tx, ty); ctx.stroke();
  const fl = 3 + 0.8 * Math.sin(t * 37);
  v.fillCircle(tx, ty, fl + 3, warm > 0.5 ? 'rgba(255,120,60,0.45)' : 'rgba(255,200,90,0.4)');
  ctx.fillStyle = '#fff3a0'; pw4StarPath(v, tx, ty, fl + 1, fl * 0.45); ctx.fill();
  v.fillCircle(tx, ty, 1.2, '#ffffff');
}
// an oven mitt (potMitt) centred on (x, y), fingers along ang (0 = up)
function pw4OvenMitt(v, x, y, ang, id) {
  const ctx = v.ctx;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.lineWidth = 1.4; ctx.strokeStyle = v.c.ink; ctx.fillStyle = v.c.paper;
  v.rr(-4.5, -6.5, 9, 10, 4.5); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-5, -0.5, 2.2, 3.2, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = pw4Col(v, id); v.rr(-4.5, 2.5, 9, 3.5, 1.5); ctx.fill(); ctx.stroke();
  ctx.restore();
}
// a sand castle with a flag in the player's colour (potDrawBeach), feet at (x, y)
function pw4Castle(v, x, y, id, t) {
  const ctx = v.ctx;
  ctx.fillStyle = '#e6bf74'; ctx.strokeStyle = '#b98a43'; ctx.lineWidth = 1.5;
  v.rr(x - 16, y - 13, 32, 13, 3); ctx.fill(); ctx.stroke();
  v.rr(x - 7, y - 25, 14, 13, 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#b98a43'; for (let i = 0; i < 3; i++) ctx.fillRect(x - 7 + i * 5.5, y - 28, 3, 3);
  ctx.fillStyle = '#7a5530'; v.rr(x - 2.5, y - 7, 5, 7, 2.5); ctx.fill();
  ctx.fillStyle = v.c.ink; ctx.fillRect(x - 0.75, y - 40, 1.5, 13);
  const wv = Math.sin(t * 5 + id) * 1.5;
  ctx.fillStyle = pw4Col(v, id); ctx.beginPath(); ctx.moveTo(x + 0.75, y - 40); ctx.lineTo(x + (id ? -10 : 10), y - 36 + wv); ctx.lineTo(x + 0.75, y - 32); ctx.closePath(); ctx.fill();
}

// 4-3: a rally over the net while the fuse burns down; red-hot, Bo spikes it onto Pip's sand: BOOM! Bo wins
// (in the game a red-hot potato that touches the sand goes BOOM at once)
definePreview('Hot Potato Volleyball', {
  blurb: 'Hit the potato over the net. Don’t let it go BOOM on your side!',
  loop: 7, still: 3.85,
  draw(v, t) {
    pw4Theme(v, 'potato');
    const ctx = v.ctx, gy = 150, k = t / 7, net = 160, nTop = 98;
    v.sky(); v.sun(); v.clouds(t); v.hills(gy - 30); v.ground(gy);
    // each half faintly in its player's colour
    ctx.fillStyle = 'rgba(255,107,74,0.07)'; ctx.fillRect(0, 0, net, gy);
    ctx.fillStyle = 'rgba(91,149,255,0.07)'; ctx.fillRect(net, 0, v.W - net, gy);
    pw4Castle(v, 22, gy, 0, t); pw4Castle(v, 298, gy, 1, t);
    for (const [x, id] of [[46, 0], [252, 1]]) for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#fff6e6' : pw4Col(v, id); ctx.fillRect(x + i * 6, gy - 2, 6, 3); }
    const reset = k >= 0.96, alpha = k < 0.92 ? 1 : reset ? v.seg(k, 0.96, 1) : 1 - v.seg(k, 0.92, 0.96);
    const boom = 0.6, gone = k >= boom && !reset;
    // the potato's path: serve, bump, bump, set to the net, SPIKE, lands on Pip's side
    const legs = [[0.05, 0.22, 92, 118, 228, 118, 60], [0.22, 0.38, 228, 118, 92, 118, 60], [0.38, 0.54, 92, 118, 176, 74, 40], [0.54, 0.6, 176, 74, 130, gy - 8, 0]];
    let px = 92, py = 104 + Math.sin(t * 3) * 3, spin = 0;
    for (const [a, b, x0, y0, x1, y1, h] of legs) if (k >= a) { const s = v.seg(k, a, b); px = v.lerp(x0, x1, s); py = v.lerp(y0, y1, s) + v.hop(s, h); spin += s * 5; }
    if (reset) { px = 92; py = 104; spin = 0; }
    // the fuse: 9 s down to 2 s at the BOOM; red-hot from 3 s, just before the spike
    const fuse = reset ? 9 : 9 - 7 * v.seg(k, 0, boom), fk = 1 - fuse / 9, warm = v.ease.in(v.clamp((9 - fuse) / 6, 0, 1)), wick = 3 + 17 * (1 - fk);
    // the net: tape, mesh and pole
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(net - 6, nTop, 12, gy - nTop);
    ctx.save(); ctx.beginPath(); ctx.rect(net - 6, nTop, 12, gy - nTop); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
    for (let y = nTop - 12; y < gy + 12; y += 7) { ctx.beginPath(); ctx.moveTo(net - 6, y); ctx.lineTo(net + 6, y + 12); ctx.moveTo(net + 6, y); ctx.lineTo(net - 6, y + 12); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = v.c.ink; ctx.fillRect(net - 1.5, nTop - 3, 3, gy - nTop + 3);
    ctx.fillStyle = v.c.paper; v.rr(net - 7, nTop - 4, 14, 5, 2); ctx.fill();
    // shadow under the potato
    if (!gone) { const hh = v.clamp((gy - py) / 120, 0, 1); ctx.fillStyle = 'rgba(20,16,40,' + (0.3 - 0.15 * hh) + ')'; ctx.beginPath(); ctx.ellipse(px, gy - 1, 9 * (1.1 - 0.5 * hh), 2.5, 0, 0, Math.PI * 2); ctx.fill(); }
    // red-hot: a red ring on the sand where it will come down (touching the sand now means BOOM)
    if (k > 0.54 && k < boom) { ctx.strokeStyle = 'rgba(255,70,50,' + (0.6 + 0.3 * Math.sin(t * 30)) + ')'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(130, gy - 1, 13, 3.5, 0, 0, Math.PI * 2); ctx.stroke(); }
    // the players, and their swings
    const swing = hk => (k > hk - 0.03 && k < hk + 0.05 ? v.seg(k, hk - 0.03, hk + 0.03) : -1);
    const walk = (a, b) => (k > a && k < b ? v.hop(v.phase(t, 0.3), 3) : 0);
    // Pip: bumps twice, dives for the spike and misses, then gets a sooty face
    let pipX = 84, pipY = gy, pipRot = 0, pipMood = 'grit', pipSw = Math.max(swing(0.05), swing(0.22 + 0.16));
    if (k > 0.54) { const s = v.seg(k, 0.54, 0.6); pipX = v.lerp(84, 102, v.ease.out(s)); pipY = gy + v.hop(s, 10); pipRot = 0.4 * s; pipMood = 'wow'; }
    if (k > boom) { const s = v.seg(k, boom, boom + 0.06); pipX = v.lerp(102, 82, s); pipY = gy + v.hop(s, 14); pipRot = 0; pipMood = 'dizzy'; }
    // Bo: bumps, runs to the net, jumps and SPIKES, then cheers
    let boX = 236, boY = gy, boMood = 'grit', boSw = Math.max(swing(0.22), swing(0.54));
    if (k > 0.4) { boX = v.lerp(236, 184, v.ease.inOut(v.seg(k, 0.4, 0.48))); boY = gy + walk(0.4, 0.48); }
    if (k > 0.48) boY = gy + v.hop(v.seg(k, 0.48, 0.6), 44);
    if (k > 0.62) { boX = v.lerp(184, 226, v.ease.inOut(v.seg(k, 0.62, 0.72))); boY = gy + walk(0.62, 0.72); }
    const win = k > boom + 0.02 && !reset;
    if (win) { boMood = 'joy'; boY = gy + v.hop(v.phase(t, 0.5), 8); }
    if (reset) { pipX = 84; pipY = gy; pipRot = 0; pipMood = 'grit'; boX = 236; boY = gy; pipSw = boSw = -1; }
    for (const [id, x, y, f, sw, mood, rot] of [[0, pipX, pipY, 1, pipSw, pipMood, pipRot], [1, boX, boY, -1, boSw, boMood, 0]]) {
      ctx.save(); ctx.globalAlpha *= alpha;
      v.hero(id, x, y, { face: f, mood, rot, shadow: y > gy - 2 });
      if (id === 0 && k > boom && !reset) { // a sooty face after the BOOM
        ctx.fillStyle = 'rgba(45,40,48,0.5)';
        for (const [ox, oy, r0] of [[-5, -3, 4.5], [4, -1, 4], [0, 3, 3.5], [6, 5, 2.5]]) { v.circle(x + ox, y - 13 + oy, r0); ctx.fill(); }
      }
      pw4OvenMitt(v, x - f * 13, y - 11, -0.2 * f, id);
      if (sw >= 0) { // the net-side mitt sweeps up over the head
        const a = 0.7 - 2.6 * Math.min(1, sw * 1.3), sx = x, sy = y - 16;
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); if (f > 0) ctx.arc(sx, sy, 19, 0.7, a, true); else ctx.arc(sx, sy, 19, Math.PI - 0.7, Math.PI - a, false); ctx.stroke();
        pw4OvenMitt(v, sx + f * Math.cos(a) * 15, sy + Math.sin(a) * 15, f * (a + Math.PI / 2), id);
      } else pw4OvenMitt(v, x + f * 13, y - 11, 0.2 * f, id);
      ctx.restore();
    }
    // the potato (fades back in for the next serve)
    if (!gone) { ctx.save(); ctx.globalAlpha *= reset ? alpha : 1; pw4Potato(v, px, py, 10, warm, spin, wick, t); ctx.restore(); }
    if (k < 0.05 || reset) v.pill('serve!', 92, 76, { size: 10, col: v.c.pip });
    // red-hot: 3 · 2 · 1 over the potato, the same seconds as the fuse timer
    const secs = Math.ceil(fuse);
    if (!gone && secs <= 3) v.label(String(secs), px > 150 ? px - 22 : px, Math.max(40, py - 36), 18, v.c.gold);
    if (k > 0.54 && k < boom) { const s = v.ease.back(v.seg(k, 0.54, 0.57)); ctx.save(); ctx.translate(214, 56); ctx.scale(s, s); v.label('SPIKE!', 0, 0, 17, '#fff'); ctx.restore(); }
    // the BOOM: a flash, a ring, and the comic star
    if (gone) {
      const bt = (k - boom) * 7;
      if (bt < 0.12) v.fillCircle(132, gy - 8, 16 + bt * 160, 'rgba(255,255,240,' + 0.9 * (1 - bt / 0.12) + ')');
      if (bt < 0.5) { ctx.strokeStyle = 'rgba(255,150,60,' + 0.85 * (1 - bt / 0.5) + ')'; ctx.lineWidth = 5 * (1 - bt / 0.5) + 1; v.circle(132, gy - 8, 10 + bt * 90); ctx.stroke(); }
      if (bt < 1.1) {
        const a = bt < 0.8 ? 1 : 1 - (bt - 0.8) / 0.3, sc = bt < 0.12 ? 0.4 + 5 * bt : 1;
        ctx.save(); ctx.globalAlpha *= v.clamp(a, 0, 1); ctx.translate(132, gy - 64); ctx.scale(sc * 0.8, sc * 0.8); ctx.rotate(-0.08);
        ctx.fillStyle = '#ffe08a'; ctx.strokeStyle = '#d0472a'; ctx.lineWidth = 3; ctx.beginPath();
        for (let i = 0; i < 16; i++) { const an = i / 16 * Math.PI * 2, q = i % 2 ? 22 : 38; ctx.lineTo(Math.cos(an) * q * 1.35, Math.sin(an) * q * 0.85); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        v.label('BOOM!', 0, 1, 22, '#ff5a3c');
        ctx.restore();
      }
      v.puff(132, gy - 4, v.seg(k, boom, boom + 0.12), 'rgba(90,80,90,0.6)');
      if (win) { ctx.save(); ctx.globalAlpha *= alpha; pw4Crown(v, boX, boY - 40, 0.75 * v.ease.back(v.seg(k, boom + 0.04, boom + 0.08))); v.confetti(boX, boY - 30, v.seg(k, boom + 0.04, 1)); ctx.restore(); }
    }
    // the fuse timer: a burning rope and the seconds left
    ctx.fillStyle = 'rgba(28,26,54,0.75)'; v.rr(118, 6, 84, 20, 10); ctx.fill();
    if (!gone) { ctx.fillStyle = '#5a3d22'; ctx.fillRect(126, 15, 46 * (1 - fk), 3); }
    if (!gone) { ctx.fillStyle = '#fff3a0'; pw4StarPath(v, 126 + 46 * (1 - fk), 16.5, 4.5, 2); ctx.fill(); }
    if (gone) v.text('BOOM!', 196, 16.5, 13, '#ffe08a', 'right');
    else v.text(String(secs), 188, 16.5, 13, warm > 0.6 ? '#ff8a6a' : '#fff');
  },
});

/* ----- 4-4 Paint the Floor ----- */
// 4-4: both run about painting the floor; Bo paints over Pip's tiles, Pip splat-dives off a plank for a big splash
// and wins the most floor at the bell
definePreview('Paint the Floor', {
  blurb: 'Run to paint the floor your colour. Most paint at the bell wins!',
  loop: 7.5, still: 4.62,
  // paint strokes: [who, surface (0 floor, 1 plank), from x, to x, start k, end k, splash]; a splash paints its whole span at once
  strokes: [
    [0, 0, 16, 150, 0.03, 0.27], [0, 1, 160, 160, 0.33, 0.33], [0, 1, 160, 200, 0.33, 0.43],
    [1, 0, 304, 182, 0.03, 0.25], [1, 0, 182, 96, 0.29, 0.45],
    [0, 0, 68, 190, 0.6, 0.6, true], [0, 0, 128, 240, 0.62, 0.8], [1, 0, 76, 20, 0.66, 0.8],
  ],
  draw(v, t) {
    pw4Theme(v, 'paint');
    const ctx = v.ctx, gy = 154, k = t / 7.5, pl = 100, plX0 = 112, plX1 = 208, cw = 8;
    v.sky(); v.sun(); v.clouds(t); v.hills(gy - 30); v.ground(gy);
    v.plank(plX0, pl, plX1 - plX0);
    for (const px of [plX0 + 4, plX1 - 7]) { ctx.fillStyle = v.c.plankDark; ctx.fillRect(px, pl + 5, 3, 6); }
    const reset = k >= 0.96, fade = k < 0.92 ? 1 : reset ? v.seg(k, 0.96, 1) : 1 - v.seg(k, 0.92, 0.96);
    // who owns each cell: whoever's brush (feet, 8 px each side) or splash passed it last
    const owner = (srf, cx) => {
      let best = -1, who = -1;
      for (const [id, s, xa, xb, a, b, splash] of this.strokes) {
        if (s !== srf || k < a) continue;
        let tc;
        if (splash) { if (cx < xa || cx > xb) continue; tc = a; }
        else {
          const lo = Math.min(xa, xb) - 8, hi = Math.max(xa, xb) + 8;
          if (cx < lo || cx > hi) continue;
          const dir = xb >= xa ? 1 : -1, u = xb === xa ? 0 : v.clamp((cx - dir * 8 - xa) / (xb - xa), 0, 1);
          tc = a + u * (b - a);
          if (tc > k) continue;
        }
        if (tc >= best) { best = tc; who = id; }
      }
      return who;
    };
    // count the cells, then paint them in one path per colour (dark under-stripe, colour with drips, a gloss line)
    const count = [0, 0], cells = [];
    let total = 0;
    for (const [srf, x0, x1, y] of [[0, 0, v.W, gy], [1, plX0, plX1, pl]]) {
      for (let x = x0; x < x1; x += cw) {
        const o = owner(srf, x + cw / 2);
        total++;
        if (o >= 0) { count[o]++; cells.push([x, y, srf, o]); }
      }
    }
    if (!reset && cells.length) {
      ctx.save(); ctx.globalAlpha *= fade;
      for (const o of [0, 1]) {
        ctx.beginPath();
        for (const [x, y, srf, q] of cells) if (q === o) ctx.rect(x, y - 3, cw, srf ? 5 : 8);
        ctx.fillStyle = pw4Dark(v, o); ctx.fill();
        ctx.beginPath();
        for (const [x, y, srf, q] of cells) {
          if (q !== o) continue;
          ctx.rect(x, y - 3, cw, srf ? 3.5 : 6);
          if (!srf && v.rand(x * 3 + o) < 0.3) { ctx.moveTo(x + 2, y + 3); ctx.lineTo(x + 6, y + 3); ctx.lineTo(x + 6, y + 6); ctx.arc(x + 4, y + 6, 2, 0, Math.PI); ctx.closePath(); }
        }
        ctx.fillStyle = pw4Col(v, o); ctx.fill();
      }
      ctx.beginPath(); for (const [x, y] of cells) ctx.rect(x, y - 2, cw, 1.2);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill();
      ctx.restore();
    }
    const walk = (a, b) => (k > a && k < b ? v.hop(v.phase(t, 0.3), 3) : 0);
    const run = (a, b, x0, x1) => v.lerp(x0, x1, v.seg(k, a, b));
    // Pip: runs, hops on the plank, paints it, jumps high and SPLATS down, then paints on to the right
    const pip = { x: run(0.03, 0.27, 16, 150), y: gy + walk(0.03, 0.27), face: 1, mood: 'happy', rot: 0, air: false, sq: 0 };
    if (k > 0.27) { const s = v.seg(k, 0.27, 0.33); pip.x = v.lerp(150, 160, s); pip.y = v.lerp(gy, pl, s) + v.hop(s, 22); pip.air = s < 1; }
    if (k > 0.33) { pip.x = run(0.33, 0.43, 160, 200); pip.y = pl + walk(0.33, 0.43); }
    if (k > 0.45) { const s = v.seg(k, 0.45, 0.53); pip.face = -1; pip.x = v.lerp(200, 132, v.ease.out(s)); pip.y = v.lerp(pl, 44, v.ease.out(s)); pip.air = true; pip.mood = 'grit'; pip.rot = -s * Math.PI * 2; }
    if (k > 0.53) { pip.rot = 0; pip.sq = -0.3; }
    if (k > 0.55) { const s = v.ease.in(v.seg(k, 0.55, 0.6)); pip.x = 132 - 4 * s; pip.y = v.lerp(44, gy, s); }
    if (k > 0.6) { pip.air = false; pip.sq = 0.4 * (1 - v.seg(k, 0.6, 0.63)); pip.mood = 'joy'; }
    if (k > 0.62) { pip.face = 1; pip.x = run(0.63, 0.8, 128, 240); pip.y = gy + walk(0.63, 0.8); pip.mood = 'happy'; }
    // Bo: runs in, paints back over Pip's floor, gets bounced by the splash, paints the far left
    const bo = { x: run(0.03, 0.25, 304, 182), y: gy + walk(0.03, 0.25), face: -1, mood: 'happy', air: false };
    if (k > 0.27) { bo.x = run(0.29, 0.45, 182, 96); bo.y = gy + walk(0.29, 0.45); bo.mood = k > 0.29 ? 'grit' : 'happy'; }
    if (k > 0.47) { bo.face = 1; bo.mood = 'wow'; }
    if (k > 0.6) { const s = v.seg(k, 0.6, 0.66); bo.x = v.lerp(96, 76, s); bo.y = gy + v.hop(s, 14); bo.mood = 'dizzy'; bo.air = s > 0 && s < 1; }
    if (k > 0.66) { bo.face = -1; bo.x = run(0.67, 0.8, 76, 20); bo.y = gy + walk(0.67, 0.8); bo.mood = 'grit'; }
    const win = k > 0.83 && !reset;
    if (win) { pip.mood = 'joy'; pip.face = -1; pip.y = gy + v.hop(v.phase(t, 0.5), 8); bo.mood = 'wow'; bo.face = 1; }
    if (reset) { Object.assign(pip, { x: 16, y: gy, face: 1, mood: 'happy', rot: 0, sq: 0, air: false }); Object.assign(bo, { x: 304, y: gy, face: -1, mood: 'happy', air: false }); }
    // the splash ring
    if (k > 0.6 && k < 0.66) { const u = v.seg(k, 0.6, 0.66); ctx.save(); ctx.globalAlpha *= 1 - u; ctx.strokeStyle = v.c.pip; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(129, gy - 1, 60 * (0.4 + 0.6 * u), 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    v.hero(1, bo.x, bo.y, { face: bo.face, mood: bo.mood, shadow: !bo.air, alpha: fade });
    v.hero(0, pip.x, pip.y, { face: pip.face, mood: pip.mood, rot: pip.rot, sq: pip.sq, shadow: !pip.air, alpha: fade });
    if (k > 0.53 && k < 0.6) v.arrow(pip.x + 20, 46, pip.x + 20, 72, '#fff', 2.5);
    if (k > 0.6 && k < 0.7) { const s = v.ease.back(v.seg(k, 0.6, 0.63)); ctx.save(); ctx.translate(150, 112); ctx.scale(s, s); v.label('SPLAT!', 0, 0, 18, v.c.pip); ctx.restore(); }
    if (k > 0.82 && k < 0.92) v.pill('TIME!', 160, 52, { size: 13, body: false, bg: v.c.gold, col: v.c.ink });
    // the paint bar: Pip's share from the left, Bo's from the right
    const bw = 200, bx = 60, fp = reset ? 0 : count[0] / total * fade, fb = reset ? 0 : count[1] / total * fade;
    ctx.fillStyle = 'rgba(28,26,54,0.6)'; v.rr(bx - 3, 6, bw + 6, 18, 9); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; v.rr(bx, 9, bw, 12, 6); ctx.fill();
    if (fp > 0.01) { ctx.fillStyle = v.c.pip; v.rr(bx, 9, bw * fp, 12, 6); ctx.fill(); }
    if (fb > 0.01) { ctx.fillStyle = v.c.bo; v.rr(bx + bw * (1 - fb), 9, bw * fb, 12, 6); ctx.fill(); }
    v.label(Math.round(fp * 100) + '%', bx - 22, 15, 12, v.c.pip);
    v.label(Math.round(fb * 100) + '%', bx + bw + 22, 15, 12, v.c.bo);
    if (win) {
      ctx.save(); ctx.globalAlpha *= fade;
      pw4Crown(v, pip.x, pip.y - 40, 0.75 * v.ease.back(v.seg(k, 0.83, 0.87)));
      v.confetti(pip.x, pip.y - 30, v.seg(k, 0.83, 1));
      ctx.restore();
    }
  },
});
