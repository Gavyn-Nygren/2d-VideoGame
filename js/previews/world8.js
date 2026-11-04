/* Pip & Bo - Level previews for World 8 (see js/previews/preview-core.js for how to write one). */
'use strict';

// World 8 colours (the levels' own: plinko felt, roulette velvet, the pink prize ticket)
const pw8Col = {
  felt: '#2c1f5e', felt2: '#3a2a78', frame: '#7a2a6e', frameHi: '#a63c8f', pink: '#ff5fa2', ticket: '#ff8fc7', ticketInk: '#7a1f4a',
  bulb: '#fff3b0', bulbOff: 'rgba(255,214,120,0.45)', peg: '#f3e2b0', red: '#e8344e', redDk: '#9c1730',
};

// draw scene(v, t) and, over the last `fade` seconds of the loop, fade into the opening frame (scene at t - loop).
// The fading-in copy gets over = true: it may skip whatever looks the same in both frames (it is already there),
// so the fade frames stay cheap; it must still cover everything that differs with something opaque.
function pw8Fade(v, t, loop, fade, scene) {
  scene(v, t, false);
  if (t > loop - fade) {
    v.ctx.save(); v.ctx.globalAlpha = v.ease.inOut(v.seg(t, loop - fade, loop)); scene(v, t - loop, true); v.ctx.restore();
  }
}
// the backdrop only inside the box (x, y, w, h): paint(v) draws the full backdrop, the clip keeps it small
function pw8Patch(v, x, y, w, h, paint) {
  v.ctx.save(); v.ctx.beginPath(); v.ctx.rect(x, y, w, h); v.ctx.clip(); paint(v); v.ctx.restore();
}
// many circles in one fill: a = [x, y, r, x, y, r, ...]
function pw8Dots(v, a, col) {
  const ctx = v.ctx;
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < a.length; i += 3) { ctx.moveTo(a[i] + a[i + 2], a[i + 1]); ctx.arc(a[i], a[i + 1], a[i + 2], 0, Math.PI * 2); }
  ctx.fill();
}
// a row of chasing bulbs from (x0, y) to (x1, y)
function pw8Bulbs(v, x0, x1, y, gap, t, r = 2.6) {
  const ph = Math.floor(t * 6), on = [], off = [];
  for (let x = x0, k = 0; x <= x1; x += gap, k++) ((k + ph) % 3 === 0 ? on : off).push(x, y, (k + ph) % 3 === 0 ? r + 0.8 : r);
  pw8Dots(v, on, pw8Col.bulb); pw8Dots(v, off, pw8Col.bulbOff);
}
// a pink pretend ticket centred on (x, y)
function pw8Ticket(v, x, y, s = 1, rot = -0.15) {
  const ctx = v.ctx;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = pw8Col.ticket; v.rr(-9, -6, 18, 12, 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(-2, -5, 1.5, 10);
  v.fillCircle(4, 0, 2.5, v.c.gold);
  ctx.restore();
}
// an arcade star token (never a money coin); sx squashes it sideways (spinning in the air)
function pw8Token(v, x, y, r = 6, sx = 1) {
  const ctx = v.ctx;
  ctx.save(); ctx.translate(x, y); ctx.scale(Math.max(0.2, sx), 1);
  v.fillCircle(0, 0, r, v.c.goldDark);
  v.fillCircle(0, -0.6, r - 1.3, v.c.gold);
  v.fillCircle(-r * 0.35, -r * 0.4, r * 0.25, 'rgba(255,255,255,0.55)');
  v.star(0, -0.5, r * 0.55, 'rgba(185,133,15,0.85)');
  ctx.restore();
}

/* ---------- 8-1 Plinko Drop ---------- */

// the player-chip from the level (js/levels/world8/plinko-drop.js plinkoDrawBall): a round chip with a face
function pw8Chip(v, id, x, y, o = {}) {
  const ctx = v.ctx, r = o.r || 12, col = id ? v.c.bo : v.c.pip, dark = id ? v.c.boDark : v.c.pipDark;
  ctx.save(); ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
  ctx.translate(x, y); ctx.scale(1 + (o.sq || 0) * 0.3, 1 - (o.sq || 0) * 0.3);
  if (id === 1) { ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 1.6; for (const ex of [-6.5, 6.5]) { v.circle(ex, -r + 1, 4); ctx.fill(); ctx.stroke(); } }
  else { v.line(0, -r, 1, -r - 4.5, '#3f8f5c', 1.7); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(4.5, -r - 5.5, 5, 2.4, -0.5, 0, Math.PI * 2); ctx.fill(); }
  v.fillCircle(0, 0, r, col);
  ctx.save(); ctx.rotate(o.spin || 0); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.setLineDash([3.6, 5.6]); v.circle(0, 0, r - 2.2); ctx.stroke(); ctx.restore();
  ctx.strokeStyle = dark; ctx.lineWidth = 2.2; v.circle(0, 0, r); ctx.stroke();
  v.fillCircle(-3.8, -4.4, 3.4, 'rgba(255,255,255,0.3)');
  const mood = o.mood || 'happy', lx = o.lx || 0, ly = o.ly || 0;
  ctx.strokeStyle = v.c.ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (mood === 'joy') {
    ctx.lineWidth = 1.8;
    for (const ex of [-4, 4]) { ctx.beginPath(); ctx.moveTo(ex - 2.5, -0.6); ctx.lineTo(ex, -3.4); ctx.lineTo(ex + 2.5, -0.6); ctx.stroke(); }
    ctx.fillStyle = v.c.ink; ctx.beginPath(); ctx.arc(0, 2.4, 4, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#ff8fa8'; ctx.beginPath(); ctx.arc(0, 4.6, 2.1, 0, Math.PI); ctx.fill();
  } else {
    for (const ex of [-3.9, 3.9]) { v.fillCircle(ex + lx * 0.5, -1.6 + ly * 0.4, 3, '#fff'); v.fillCircle(ex + lx, -1.2 + ly * 0.6, 1.6, v.c.ink); }
    if (mood === 'wow') { ctx.fillStyle = v.c.ink; ctx.beginPath(); ctx.ellipse(0, 4.8, 1.9, 2.4, 0, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 3.1, 2.8, 0.18 * Math.PI, 0.82 * Math.PI); ctx.stroke(); }
  }
  ctx.restore();
}
// the kicker's paddle (plinkoDrawPad): the player's colour, ears or sprout on top, a face in the middle, the shiny kick end
function pw8Paddle(v, id, x, y, w, o = {}) {
  const ctx = v.ctx, h = 11, col = id ? v.c.bo : v.c.pip, dark = id ? v.c.boDark : v.c.pipDark, x0 = x - w / 2, yy = y - h / 2 + (o.dip || 0);
  const shine = o.shine || 0;   // which end glows: 1 right, -1 left, 0 none
  ctx.fillStyle = 'rgba(10,8,30,0.35)'; v.rr(x0 + 2, yy + 3, w, h, 6); ctx.fill();
  if (shine) { ctx.fillStyle = 'rgba(255,197,61,' + (0.5 + 0.35 * Math.sin(v.t * 9)).toFixed(3) + ')'; v.rr(x0 + (shine + 1) * w / 3 - 3, yy - 4, w / 3 + 6, h + 8, 9); ctx.fill(); }
  if (id === 1) { ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 1.5; for (const ex of [x - 10, x + 10]) { v.circle(ex, yy, 4.2); ctx.fill(); ctx.stroke(); } }
  else { v.line(x, yy, x + 1, yy - 5, '#3f8f5c', 1.8); ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(x + 5, yy - 7, 5, 2.4, -0.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 2; v.rr(x0, yy, w, h, 5.5); ctx.fill(); ctx.stroke();
  if (shine) { ctx.fillStyle = 'rgba(255,246,196,0.85)'; v.rr(x0 + (shine + 1) * w / 3 + 2, yy + 1.5, w / 3 - 4, h - 3, 4); ctx.fill(); }
  // the end arrows and the face
  const ay = yy + h / 2;
  for (const z of [-1, 1]) {
    const ex = z < 0 ? x0 + 7 : x0 + w - 7;
    ctx.fillStyle = z === shine ? dark : 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.moveTo(ex, ay); ctx.lineTo(ex - z * 6, ay - 3.5); ctx.lineTo(ex - z * 6, ay + 3.5); ctx.fill();
  }
  ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  if (o.mood === 'joy') for (const ex of [x - 4.5, x + 4.5]) { ctx.beginPath(); ctx.moveTo(ex - 2.4, ay + 1.3); ctx.lineTo(ex, ay - 1.6); ctx.lineTo(ex + 2.4, ay + 1.3); ctx.stroke(); }
  else if (o.mood === 'grit') for (const z of [-1, 1]) { const ex = x + z * 4.5; ctx.beginPath(); ctx.moveTo(ex + z * 2.3, ay - 2.3); ctx.lineTo(ex - z * 1.4, ay); ctx.lineTo(ex + z * 2.3, ay + 2.3); ctx.stroke(); }
  else for (const ex of [x - 4.5, x + 4.5]) { v.fillCircle(ex, ay, 2.8, '#fff'); v.fillCircle(ex + (o.look || 0) * 1.3, ay - 0.3, 1.5, v.c.ink); }
}

// 8-1: Pip is the chip and drops through the pegs; Bo slides the paddle under it, and its shiny end kicks Pip into the JACKPOT
definePreview('Plinko Drop', {
  blurb: 'One of you is the chip, the other kicks it into the JACKPOT with a paddle.',
  loop: 6, still: 2.02,
  draw(v, t) {
    const ctx = v.ctx, k = t / 6, P = pw8Col;
    // the cabinet: felt, frame, side bulbs, marquee
    const g = ctx.createLinearGradient(0, 20, 0, 180); g.addColorStop(0, P.felt2); g.addColorStop(1, P.felt);
    ctx.fillStyle = g; ctx.fillRect(0, 0, v.W, v.H);
    const dots = [];
    for (let q = 0; q < 26; q++) dots.push(14 + v.rand(q * 3 + 1) * 292, 26 + v.rand(q * 5 + 2) * 110, 1);
    pw8Dots(v, dots, 'rgba(255,255,255,0.08)');
    ctx.fillStyle = P.frame; ctx.fillRect(0, 0, v.W, 22); ctx.fillRect(0, 0, 10, v.H); ctx.fillRect(v.W - 10, 0, 10, v.H);
    ctx.fillStyle = v.c.gold; ctx.fillRect(0, 21, v.W, 2); ctx.fillRect(9, 22, 2, v.H); ctx.fillRect(v.W - 11, 22, 2, v.H);
    const ph = Math.floor(t * 6), bOn = [], bOff = [];
    for (let q = 0; q < 8; q++) for (const x of [5, v.W - 5]) { const on = (q + ph) % 3 === 0; (on ? bOn : bOff).push(x, 32 + q * 20, on ? 2.8 : 2.2); }
    pw8Dots(v, bOn, P.bulb); pw8Dots(v, bOff, P.bulbOff);
    ctx.fillStyle = 'rgba(28,26,54,0.55)'; v.rr(v.W / 2 - 46, 2, 92, 18, 9); ctx.fill();
    v.text('PLINKO', v.W / 2, 11.5, 14, v.c.gold);
    // the slots: the JACKPOT is the fifth of six
    const sw = 50, sTop = 142, jp = 4, vals = ['20', '20', '50', '150', '', '150'];
    const won = k > 0.56 && k < 0.92, glow = won ? 0.5 + 0.5 * Math.sin(t * 12) : 0;
    for (let s = 0; s < 6; s++) {
      const x0 = 10 + s * sw;
      ctx.fillStyle = s === jp ? 'rgba(255,197,61,' + (0.28 + glow * 0.3).toFixed(3) + ')' : s === 3 || s === 5 ? 'rgba(255,95,162,0.16)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(x0 + 3, sTop, sw - 6, v.H - sTop);
      if (s === jp) {
        const gr = ctx.createLinearGradient(0, sTop - 40, 0, sTop); gr.addColorStop(0, 'rgba(255,197,61,0)'); gr.addColorStop(1, 'rgba(255,197,61,0.25)');
        ctx.fillStyle = gr; ctx.fillRect(x0 + 3, sTop - 40, sw - 6, 40);
        const jOn = [], jOff = [];
        for (let q = 0; q < 4; q++) for (const x of [x0 + 6, x0 + sw - 6]) ((q + Math.floor(t * 8)) % 2 === 0 ? jOn : jOff).push(x, sTop + 5 + q * 9, 1.8);
        pw8Dots(v, jOn, P.bulb); pw8Dots(v, jOff, P.bulbOff);
        v.text('JACKPOT', x0 + sw / 2, sTop - 9, 10, P.bulb, 'center', true);
      } else v.text(vals[s], x0 + sw / 2, sTop + 22, 13, s === 3 || s === 5 ? '#ffd0e6' : 'rgba(246,239,223,0.8)');
    }
    const caps = [];
    ctx.fillStyle = '#d9c38a';
    for (let s = 1; s < 6; s++) { const x = 10 + s * sw; ctx.fillRect(x - 2.5, sTop - 2, 5, v.H - sTop + 2); caps.push(x, sTop - 3, 3); }
    pw8Dots(v, caps, P.bulb);
    // the chute (a gold rail) and the pegs
    const chuteY = 40;
    v.line(38, chuteY + 14, 128, chuteY + 14, 'rgba(28,26,54,0.6)', 5); v.line(38, chuteY + 13, 128, chuteY + 13, v.c.gold, 2.5);
    const pegs = [];
    for (let row = 0; row < 2; row++) for (let x = 24 + row * 13; x < 300; x += 26) pegs.push([x, 66 + row * 15]);
    for (let x = 30; x < 300; x += 26) pegs.push([x, 120]);
    // the chip's path: roll along the chute, drop through the pegs, land on the paddle's shiny end, get kicked to the JACKPOT
    const padY = 106, chipR = 12, jx = 10 + jp * sw + sw / 2;
    let cx = 54, cy = chuteY, mood = 'happy', sq = 0, alpha = 1, lx = 1, ly = 0;
    const roll = v.ease.inOut(v.seg(k, 0.03, 0.14));
    cx = v.lerp(54, 104, roll);
    const fall = v.seg(k, 0.16, 0.3), kick = v.seg(k, 0.33, 0.5), drop = v.seg(k, 0.5, 0.56);
    if (k > 0.16) { // falls, plinking off two pegs on the way down
      cy = v.lerp(chuteY, padY - 5.5 - chipR, fall * (0.4 + 0.6 * fall));
      cx = 104 + Math.sin(fall * Math.PI * 2) * 6 * (1 - fall);
      mood = 'wow'; lx = 0; ly = 1.4;
    }
    const landed = k > 0.3 && k <= 0.33;
    if (landed) { sq = 0.35 * Math.sin(v.seg(k, 0.3, 0.33) * Math.PI); mood = 'happy'; }
    if (k > 0.33) { // the kick: up and over to the right
      cx = v.lerp(104, jx, kick); cy = v.lerp(padY - 5.5 - chipR, sTop - 4, kick) + v.hop(kick, 26);
      mood = kick < 1 ? 'wow' : 'joy'; lx = 1.4; ly = kick < 0.5 ? -1 : 1;
    }
    if (k > 0.5) { cx = jx; cy = v.lerp(sTop - 4, sTop + 22, v.ease.out(drop)); mood = 'joy'; }
    if (k > 0.56) cy = sTop + 22 + v.hop(v.phase(t, 0.42), 6) * (k < 0.86 ? 1 : 0);
    if (k > 0.88) alpha = 1 - v.seg(k, 0.88, 0.94);
    if (k > 0.94 || k < 0.03) { cx = 54; cy = chuteY; mood = 'happy'; alpha = k > 0.94 ? v.seg(k, 0.94, 1) : 1; }
    // pegs light up as the chip brushes past
    const pSh = [], pCol = [], pLit = [], pHi = [];
    for (const [px, py] of pegs) {
      const near = Math.hypot(px - cx, py - cy) < chipR + 6;
      pSh.push(px + 1, py + 2, 4); (near ? pLit : pCol).push(px, py, 3.6); pHi.push(px - 1.2, py - 1.2, 1.2);
    }
    pw8Dots(v, pSh, 'rgba(10,8,30,0.35)'); pw8Dots(v, pCol, P.peg); pw8Dots(v, pLit, '#fff'); pw8Dots(v, pHi, 'rgba(255,255,255,0.85)');
    // the paddle rail and Bo's paddle: slides under the chip, kicks, then cheers and slides back
    ctx.setLineDash([4, 6]); v.line(18, padY, 302, padY, 'rgba(255,214,140,0.45)', 2); ctx.setLineDash([]);
    const padW = 72, padHome = 168, padAt = 104 - padW / 3;
    let padX = v.lerp(padHome, padAt, v.ease.inOut(v.seg(k, 0.14, 0.27)));
    if (k > 0.6) padX = v.lerp(padAt, padHome, v.ease.inOut(v.seg(k, 0.6, 0.8)));
    const dip = landed ? 3 * Math.sin(v.seg(k, 0.3, 0.33) * Math.PI) : k > 0.33 && k < 0.37 ? -3 * Math.sin(v.seg(k, 0.33, 0.37) * Math.PI) : 0;
    const aiming = k > 0.14 && k < 0.33;
    // the landing spot
    if (k > 0.18 && k < 0.3) {
      ctx.save(); ctx.globalAlpha = 0.8; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(104, padY - 7, 8, 2.6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    pw8Paddle(v, 1, padX, padY, padW, { shine: aiming ? 1 : 0, dip, mood: k > 0.5 && k < 0.9 ? 'joy' : k > 0.3 && k < 0.37 ? 'grit' : 'happy', look: aiming ? -1 : 1 });
    pw8Chip(v, 0, cx, cy, { r: chipR, mood, sq, alpha, lx, ly, spin: cx / 9 });
    // words: the kick, the jackpot and its tickets
    if (k > 0.1 && k < 0.22) v.bubble('Wheee!', cx - 20, cy - 13);   // follows the chip, clear of the marquee
    if (k > 0.33 && k < 0.46) v.label('KICK!', 52, 88 - v.seg(k, 0.33, 0.46) * 8, 15, v.c.bo);
    if (k > 0.56 && k < 0.9) {
      const a = v.ease.back(v.seg(k, 0.56, 0.62));
      ctx.save(); ctx.translate(v.W / 2 + 10, 62); ctx.scale(a, a); v.label('JACKPOT!', 0, 0, 24, v.c.gold); ctx.restore();
      v.star(jx, 104 - v.seg(k, 0.56, 0.9) * 10, 9 * v.seg(k, 0.56, 0.6), v.c.gold);
      for (let q = 0; q < 3; q++) {
        const tk = v.seg(k, 0.58 + q * 0.06, 0.8 + q * 0.06);
        if (tk > 0 && tk < 1) { ctx.save(); ctx.globalAlpha = 1 - v.ease.in(tk); pw8Ticket(v, jx + (q - 1) * 22 * v.ease.out(tk), sTop + 4 - 46 * v.ease.out(tk), 1.1, -0.3 + q * 0.3); ctx.restore(); }
      }
    }
    v.confetti(jx, sTop - 6, v.seg(k, 0.56, 0.86), 20);
  },
});

/* ---------- 8-2 Roulette Wheel ---------- */

// the six wedges of the level's wheel (js/levels/world8/roulette-wheel.js ROULETTE_WEDGES), clockwise from the right
// (band / dkBand: the same colours 22% darker, for the pocket band round the rim)
const pw8Wedges = [
  { col: '#ffcf3a', dk: '#c9971a', band: '#d0a63a', dkBand: '#a67a21', ink: '#7a5200', sym: 'star' },
  { col: '#ff7ab8', dk: '#c74a86', band: '#d0649d', dkBand: '#a43e76', ink: '#8a1f55', sym: 'heart' },
  { col: '#5fd06e', dk: '#2f9a48', band: '#53a763', dkBand: '#2d7d45', ink: '#1d5e2c', sym: 'clover' },
  { col: '#3d3a7a', dk: '#26235a', band: '#38326c', dkBand: '#262053', ink: '#ffd96b', sym: 'moon' },
  { col: '#3fd0c4', dk: '#1f968c', band: '#3aa7a6', dkBand: '#21797a', ink: '#0f5a54', sym: 'diamond' },
  { col: '#a274f2', dk: '#6c45b8', band: '#875fca', dkBand: '#5d3a9d', ink: '#3d1f7a', sym: 'crown' },
];
// a wedge symbol of size s at the origin (rouletteSymPath)
function pw8Sym(ctx, sym, s) {
  ctx.beginPath();
  if (sym === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.45 : s; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); }
  else if (sym === 'heart') { ctx.moveTo(0, s * 0.9); ctx.bezierCurveTo(-s * 1.3, -s * 0.1, -s * 0.55, -s, 0, -s * 0.35); ctx.bezierCurveTo(s * 0.55, -s, s * 1.3, -s * 0.1, 0, s * 0.9); ctx.closePath(); }
  else if (sym === 'clover') { for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 3, x = Math.cos(a) * s * 0.45, y = Math.sin(a) * s * 0.45; ctx.moveTo(x + s * 0.42, y); ctx.arc(x, y, s * 0.42, 0, Math.PI * 2); } ctx.rect(-s * 0.08, 0, s * 0.16, s); }
  else if (sym === 'moon') { ctx.arc(0, 0, s * 0.85, -2.2, 2.2, true); ctx.arc(s * 0.45, 0, s * 0.62, 1.95, -1.95, false); ctx.closePath(); }
  else if (sym === 'diamond') { ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.7, 0); ctx.closePath(); }
  else { ctx.moveTo(-s, s * 0.6); ctx.lineTo(-s, -s * 0.4); ctx.lineTo(-s * 0.5, s * 0.05); ctx.lineTo(0, -s * 0.75); ctx.lineTo(s * 0.5, s * 0.05); ctx.lineTo(s, -s * 0.4); ctx.lineTo(s, s * 0.6); ctx.closePath(); }
}
// a pretend poker chip (rouletteChipIcon): coloured disc, white notches, gold rim
function pw8PokerChip(v, x, y, r, col, sx = 1) {
  const ctx = v.ctx;
  ctx.save(); ctx.translate(x, y); ctx.scale(Math.max(0.15, sx), 1);
  v.fillCircle(0, 0, r, col);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.28; ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.moveTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78); ctx.arc(0, 0, r * 0.78, a, a + 0.5); }
  ctx.stroke();
  ctx.strokeStyle = v.c.goldDark; ctx.lineWidth = 1.5; v.circle(0, 0, r); ctx.stroke();
  v.fillCircle(0, 0, r * 0.32, 'rgba(255,255,255,0.9)');
  ctx.restore();
}

// 8-2: the ball lands on Hearts, both race to the pink wedge, Pip bumps Bo off it and wins the chip at LOCK
definePreview('Roulette Wheel', {
  blurb: 'Race to the colour the ball lands on and bump the other one off it!',
  loop: 6.5, still: 3.2,
  draw(v, t) { pw8Fade(v, t, 6.5, 0.5, (v2, tt, over) => this.scene(v2, tt, over)); },
  // over: the fading-in copy at the loop's end. Only the wheel, the players and the counters differ, so it skips
  // the tent, the table and the bowl's rings (the wheel's wedges cover the old players opaquely)
  scene(v, t, over) {
    const ctx = v.ctx, TAU = Math.PI * 2, cx = 160, cy = 102, kk = 0.5, R = 96, trackR = 106, frameR = 120, hubR = 16;
    const th0 = -0.124, spin = 0.18, th = th0 + spin * t, pocketA = Math.PI / 3, pocketR = 88;
    const proj = (u, w) => { const c = Math.cos(th), s = Math.sin(th); return { x: cx + u * c - w * s, y: cy + (u * s + w * c) * kk }; };
    const polar = (r, a) => ({ u: r * Math.cos(a), w: r * Math.sin(a) });
    const fromScreen = (X, Y) => { const c = Math.cos(th0), s = Math.sin(th0); return { u: X * c + Y * s, w: -X * s + Y * c }; };
    // the tent: velvet, a red marquee band with bulbs
    const velvet = () => {
      ctx.fillStyle = '#3a1550'; ctx.fillRect(0, 0, v.W, v.H);
      // the stripes stop where the table (an ellipse round cx, cy + 10) hides them
      ctx.fillStyle = '#41195a'; ctx.beginPath();
      for (let x = 0; x < v.W; x += 26) {
        const far = Math.max(Math.abs(x - cx), Math.abs(x + 11 - cx)), dy = far < 150 ? 66 * Math.sqrt(1 - (far / 154) * (far / 154)) - 4 : 0;
        if (dy > 0) { ctx.rect(x, 0, 11, cy + 10 - dy); ctx.rect(x, cy + 10 + dy, 11, v.H - cy - 10 - dy); } else ctx.rect(x, 0, 11, v.H);
      }
      ctx.fill();
    };
    if (over) pw8Patch(v, 6, 19, 52, 18, velvet);   // under Pip's chip counters
    else {
      velvet();
      ctx.fillStyle = '#c2304f'; ctx.fillRect(0, 0, v.W, 14); ctx.fillStyle = v.c.gold; ctx.fillRect(0, 13, v.W, 2.5);
      pw8Bulbs(v, 10, v.W, 7, 20, t, 2.6);
    }
    // the ball: rolls round the track the other way, slows, drops into a pink pocket at 2.0 s
    const tRoll = 1.6, tSet = 2.0, setPhi = pocketA + th0 + spin * tSet;
    const set = t >= tSet, lit = t >= 1.85 && t < 6.2;
    let bx, by, bz = 0;
    if (t < tRoll) {
      const u = Math.max(0, t) / tRoll, phi = setPhi + 2.3 * Math.PI * (1 - u) * (1 - u);
      bx = cx + Math.cos(phi) * trackR; by = cy + Math.sin(phi) * trackR * kk; bz = Math.abs(Math.sin(t * 22)) * 1.5;
    } else if (!set) {
      const u = v.seg(t, tRoll, tSet), phi = v.lerp(setPhi, pocketA + th, u), r = v.lerp(trackR, pocketR, v.ease.out(u));
      bx = cx + Math.cos(phi) * r; by = cy + Math.sin(phi) * r * kk; bz = -v.hop(u, 8);
    } else { const q = proj(pocketR * Math.cos(pocketA), pocketR * Math.sin(pocketA)); bx = q.x; by = q.y; }
    // the table felt and the bowl
    // (rings are strokes, not stacked discs: much less to paint each frame)
    if (!over) { ctx.fillStyle = '#1f7a52'; ctx.strokeStyle = '#145a3b'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(cx, cy + 10, 154, 66, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, kk);
    if (!over) {
      ctx.strokeStyle = '#5a2e1a'; ctx.lineWidth = 20; ctx.beginPath(); ctx.arc(0, 16, frameR - 10, 0, Math.PI); ctx.stroke();   // the bowl's side
      ctx.strokeStyle = '#8a4b2a'; ctx.lineWidth = frameR - trackR - 4; v.circle(0, 0, (frameR + trackR + 4) / 2); ctx.stroke();
      ctx.strokeStyle = '#b06a3a'; ctx.lineWidth = 3; v.circle(0, 0, frameR - 4); ctx.stroke();
    }
    const rolling = t < tRoll, chase = Math.floor(t * (rolling ? 14 : 5)), blink = Math.floor(t * 5) % 2, bOn = [], bOff = [];
    const bBack = [];
    for (let i = 0; i < 20; i++) {
      const a = i * TAU / 20, on = lit ? i % 2 === blink : (i + chase) % 4 === 0, x = Math.cos(a) * (frameR - 7), y = Math.sin(a) * (frameR - 7);
      (on ? bOn : bOff).push(x, y, on ? 3.4 : 2.8); bBack.push(x, y, 3.5);
    }
    if (over) pw8Dots(v, bBack, '#8a4b2a');   // hides the old frame's bigger lit bulbs
    pw8Dots(v, bOn, lit ? pw8Wedges[1].col : pw8Col.bulb); pw8Dots(v, bOff, '#b98a3a');
    if (!over) {
      ctx.strokeStyle = '#f3e2c0'; ctx.lineWidth = trackR + 4 - R; v.circle(0, 0, (trackR + 4 + R) / 2); ctx.stroke();
      ctx.strokeStyle = '#d9c193'; ctx.lineWidth = 2.5; v.circle(0, 0, R + 1); ctx.stroke();
    }
    // the turning head: six wedges, the lit one bright, the rest dimmed
    ctx.rotate(th);
    for (let i = 0; i < 6; i++) {
      const w = pw8Wedges[i], a0 = i * Math.PI / 3 - Math.PI / 6, a1 = a0 + Math.PI / 3, on = lit && i === 1;
      ctx.fillStyle = on ? '#ffa3cf' : lit ? w.dk : w.col; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R - 14, a0, a1); ctx.closePath(); ctx.fill();
      // the pocket band round the rim: the wedge's colour, darker (filled, not a see-through ring: cheaper)
      ctx.fillStyle = on ? '#d084af' : lit ? w.dkBand : w.band; ctx.beginPath(); ctx.arc(0, 0, R, a0, a1); ctx.arc(0, 0, R - 14.5, a1, a0, true); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = v.c.gold; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 - Math.PI / 6; ctx.moveTo(Math.cos(a) * hubR, Math.sin(a) * hubR); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); }
    ctx.stroke();
    if (lit) {
      const a0 = Math.PI / 6, a1 = Math.PI / 2;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath();
      ctx.moveTo(Math.cos(a0) * hubR, Math.sin(a0) * hubR); ctx.arc(0, 0, R - 2, a0, a1); ctx.lineTo(Math.cos(a1) * hubR, Math.sin(a1) * hubR); ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const w = pw8Wedges[i], am = i * Math.PI / 3, on = lit && i === 1, sc = on ? 1.2 + 0.08 * Math.sin(t * 8) : 1;
      ctx.save(); ctx.translate(Math.cos(am) * 56, Math.sin(am) * 56); ctx.rotate(-th); ctx.scale(sc, sc * 1.6);
      ctx.globalAlpha = on ? 1 : lit ? 0.5 : 0.85; pw8Sym(ctx, w.sym, 12);
      if (on) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.stroke(); }
      ctx.fillStyle = w.ink; ctx.fill(); ctx.restore();
    }
    v.fillCircle(0, 0, hubR + 3, v.c.goldDark); v.fillCircle(0, 0, hubR, '#8a4b2a');
    ctx.restore();
    // Pip and Bo: carried round by the wheel, then the race and the bump (positions in the wheel's own frame)
    const at = (a, b, k) => ({ u: v.lerp(a.u, b.u, k), w: v.lerp(a.w, b.w, k) });
    const pip0 = fromScreen(-62, 12), bo0 = fromScreen(62, 12);
    const boT = polar(70, pocketA - 0.16), pipT1 = polar(58, pocketA + 0.34), pipT2 = polar(64, pocketA + 0.02), boK = polar(76, pocketA - 0.95);
    const boRun = v.ease.inOut(v.seg(t, 2.0, 2.75)), pipRun = v.ease.inOut(v.seg(t, 2.1, 3.0));
    const lunge = v.seg(t, 3.0, 3.15), knock = v.ease.out(v.seg(t, 3.15, 3.55)), step = v.ease.inOut(v.seg(t, 3.2, 3.55));
    let bo = at(bo0, boT, boRun), pip = at(pip0, pipT1, pipRun);
    if (t > 3.0) pip = at(pipT1, boT, Math.sin(lunge * Math.PI) * 0.35);
    if (t > 3.15) { bo = at(boT, boK, knock); pip = at(pipT1, pipT2, step); }
    const pq = proj(pip.u, pip.w), bq = proj(bo.u, bo.w), win = t > 4.5;
    // the lock ring round the ball drains in Pip's colour, then pays out
    if (set && t < 4.5) {
      const f = 1 - v.seg(t, 3.3, 4.5);
      ctx.save(); ctx.translate(bx, by); ctx.scale(1, kk);
      ctx.strokeStyle = 'rgba(28,26,54,0.5)'; ctx.lineWidth = 5; v.circle(0, 0, 16); ctx.stroke();
      ctx.strokeStyle = t > 3.3 ? v.c.pip : '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, 16, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
      ctx.restore();
    }
    // a white ring under whoever stands on the lit wedge
    if (lit && t > 3.4) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(pq.x, pq.y, 15, 7, 0, 0, TAU); ctx.stroke(); }
    // painter's order: the turret, the ball and the two players by depth
    const turret = () => {
      ctx.fillStyle = v.c.goldDark; ctx.beginPath(); ctx.moveTo(cx - 12, cy); ctx.lineTo(cx - 3, cy - 18); ctx.lineTo(cx + 3, cy - 18); ctx.lineTo(cx + 12, cy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = v.c.gold; ctx.beginPath(); ctx.moveTo(cx - 9, cy - 1); ctx.lineTo(cx - 2, cy - 18); ctx.lineTo(cx + 1, cy - 18); ctx.lineTo(cx - 3, cy - 1); ctx.closePath(); ctx.fill();
      const knobs = [];
      ctx.strokeStyle = v.c.goldDark; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath();
      for (let i = 0; i < 4; i++) { const a = th + i * Math.PI / 2, ex = cx + Math.cos(a) * 13, ey = cy - 19 + Math.sin(a) * 13 * kk; ctx.moveTo(cx, cy - 19); ctx.lineTo(ex, ey); knobs.push(ex, ey, 2.6); }
      ctx.stroke(); pw8Dots(v, knobs, v.c.gold);
      v.fillCircle(cx, cy - 20, 3, pw8Col.bulb);
    };
    const ball = () => {
      v.shadow(bx, by + 1, 9);
      v.fillCircle(bx, by - 4.5 - bz, 5, '#fbfbff'); ctx.strokeStyle = '#8a90aa'; ctx.lineWidth = 1.5; v.circle(bx, by - 4.5 - bz, 5); ctx.stroke();
      v.fillCircle(bx - 1.7, by - 6.2 - bz, 1.8, '#fff');
    };
    const pipHop = win ? v.hop(v.phase(t, 0.45), 9) : pipRun > 0 && pipRun < 1 ? v.hop(v.phase(t, 0.3), 4) : t < 1.9 ? v.hop(v.phase(t, 0.6), 3) : 0;
    const boHop = boRun > 0 && boRun < 1 ? v.hop(v.phase(t, 0.3, 0.15), 4) : t < 1.9 ? v.hop(v.phase(t, 0.6, 0.3), 3) : 0;
    const dizzy = t > 3.15 && t < 4.3;
    const items = [
      { y: cy, f: turret },
      { y: by, f: ball },
      { y: pq.y, f: () => v.hero(0, pq.x, pq.y + pipHop, { face: t > 2.1 && t < 4.5 ? (bq.x > pq.x || t > 3.15 ? 1 : -1) : 1, mood: win ? 'joy' : t > 1.9 ? 'grit' : 'happy', sq: lunge > 0 && lunge < 1 ? -0.15 : 0 }) },
      { y: bq.y, f: () => v.hero(1, bq.x, bq.y + boHop, { face: t > 2.0 && t < 3.15 ? (bq.x > pq.x ? -1 : 1) : -1, mood: dizzy ? 'dizzy' : win ? 'wow' : t > 1.9 ? 'grit' : 'happy', rot: knock > 0 && knock < 1 ? Math.sin(knock * Math.PI) * 0.4 : 0 }) },
    ];
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.f();
    // the beacon arrow over the ball once it lands
    if (lit && t < 4.5) {
      const ay = by - 34 + Math.sin(t * 6) * 3;
      ctx.beginPath(); ctx.moveTo(bx - 7, ay - 6); ctx.lineTo(bx + 7, ay - 6); ctx.lineTo(bx, ay + 4); ctx.closePath();
      ctx.lineJoin = 'round'; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 3.5; ctx.stroke(); ctx.fillStyle = pw8Wedges[1].col; ctx.fill();
    }
    // words
    if (t > 3.05 && t < 3.6) v.label('BUMP!', (pq.x + bq.x) / 2 + 6, Math.min(pq.y, bq.y) - 40 - v.seg(t, 3.05, 3.6) * 6, 15, '#fff');
    if (t > 4.4 && t < 4.95) v.pill('LOCK!', cx, 30, { size: 11, bg: 'rgba(28,26,54,0.85)', col: v.c.gold });
    // chip counters (first to 3) and Pip's new chip flying up to his row (over: Bo's row is the same, so only Pip's)
    const pipChips = t > 5.2 ? 2 : 1;
    const empty = [];
    for (let q = 0; q < 3; q++) {
      for (const id of over ? [0] : [0, 1]) {
        const x = id ? v.W - 16 - q * 16 : 16 + q * 16, has = id ? q < 1 : q < pipChips;
        if (has) pw8PokerChip(v, x, 28, 6, id ? v.c.bo : v.c.pip); else empty.push(x);
      }
    }
    ctx.strokeStyle = 'rgba(246,239,223,0.4)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (const x of empty) { ctx.moveTo(x + 6, 28); ctx.arc(x, 28, 6, 0, TAU); }
    ctx.stroke();
    if (win && t < 5.2) {
      const u = v.seg(t, 4.5, 5.2), x = v.lerp(pq.x, 32, v.ease.inOut(u)), y = v.lerp(pq.y - 44, 28, v.ease.inOut(u)) + v.hop(u, 18);
      pw8PokerChip(v, x, y, 8 - u * 2, v.c.pip, 0.4 + 0.6 * Math.abs(Math.cos(t * 9)));
    }
    if (win && t < 6) v.label('+1', pq.x - 22, pq.y - 46 - v.seg(t, 4.5, 6) * 8, 15, v.c.pip);
    v.confetti(pq.x, pq.y - 30, v.seg(t, 4.5, 5.9));
  },
});

/* ---------- 8-3 Slot Machine Run ---------- */

// a stone ledge with a gold top, like v.block but in a single path (cheaper for three of them every frame)
function pw8Ledge(v, x, y, w, h) {
  const ctx = v.ctx;
  ctx.fillStyle = v.c.stone; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = v.c.stoneLight; ctx.beginPath();
  for (let ty = 0; ty < h - 2; ty += 12) for (let tx = (ty / 12) % 2 ? -6 : 0; tx < w; tx += 12) {
    const x0 = Math.max(x, x + tx + 1), x1 = Math.min(x + w, x + tx + 11);
    if (x1 > x0) ctx.rect(x0, y + ty + 1, x1 - x0, Math.min(10, h - ty - 1));
  }
  ctx.fill();
  ctx.fillStyle = v.c.grassDark; v.rr(x - 1, y - 2, w + 2, 7, 3); ctx.fill();
  ctx.fillStyle = v.c.grass; v.rr(x - 1, y - 3, w + 2, 5, 2.5); ctx.fill();
}
// one reel picture (slotsDrawSym) in a 44 x 28 cell with its top-left at (x, y)
function pw8SlotSym(v, ch, x, y, a = 1) {
  const ctx = v.ctx, cx = 45;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(44 / 90, 28 / 60);
  if (ch === 'B') {
    ctx.fillStyle = v.c.goldDark; v.rr(cx - 38, 28, 76, 28, 6); ctx.fill();
    ctx.fillStyle = v.c.gold; v.rr(cx - 38, 28, 76, 23, 6); ctx.fill();
  } else if (ch === '7') {
    ctx.fillStyle = pw8Col.red; ctx.strokeStyle = pw8Col.redDk; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 24, 2); ctx.lineTo(cx + 24, 2); ctx.lineTo(cx + 24, 13); ctx.lineTo(cx + 2, 56); ctx.lineTo(cx - 12, 56); ctx.lineTo(cx + 8, 14); ctx.lineTo(cx - 24, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (ch === 'b') {
    ctx.fillStyle = v.c.gold; ctx.strokeStyle = v.c.goldDark; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx - 26, 50); ctx.quadraticCurveTo(cx - 22, 30, cx - 15, 24); ctx.quadraticCurveTo(cx, 6, cx + 15, 24); ctx.quadraticCurveTo(cx + 22, 30, cx + 26, 50); ctx.closePath(); ctx.fill(); ctx.stroke();
    v.fillCircle(cx, 53, 5, v.c.goldDark);
  } else if (ch === 'C') {
    ctx.strokeStyle = '#3f8f3c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - 12, 40); ctx.quadraticCurveTo(cx - 4, 14, cx + 6, 8); ctx.moveTo(cx + 13, 42); ctx.quadraticCurveTo(cx + 10, 18, cx + 6, 8); ctx.stroke();
    v.fillCircle(cx - 13, 45, 12, pw8Col.red); v.fillCircle(cx + 14, 46, 12, pw8Col.red);
    v.fillCircle(cx - 17, 41, 3.5, 'rgba(255,255,255,0.7)'); v.fillCircle(cx + 10, 42, 3.5, 'rgba(255,255,255,0.7)');
  } else if (ch === 'L') {
    ctx.fillStyle = '#ffe36b'; ctx.strokeStyle = '#c9a62a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(cx, 34, 26, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  if (ch === 'B') { ctx.save(); ctx.globalAlpha *= a; v.text('BAR', x + 22, y + 19.5, 10, '#7a4a10', 'center', true); ctx.restore(); }
}

// 8-3: Bo stops the reels from the deck below; Pip hops across on the pictures (a BAR, a tall 7, a cherry trampoline)
// and pulls the JACKPOT lever
definePreview('Slot Machine Run', {
  blurb: 'One stops the spinning reels, the other hops across on the pictures!',
  loop: 7, still: 3.4,
  draw(v, t) { pw8Fade(v, t, 7, 0.5, (v2, tt, over) => this.scene(v2, tt, over)); },
  // over: the fading-in copy at the loop's end. The sky, the cabinet's back and its bulbs, and the left ledge look
  // the same then, so it skips them and repaints only the sky behind the lever and Pip (the reels, deck and ledges are opaque)
  scene(v, t, over) {
    const ctx = v.ctx, yp = 80, cell = 28, wy = yp - cell, rw = 44, deck = 176, panelY = 136;
    const reels = [
      { x0: 76, strip: 'B7BbLB', want: 'B', tStop: 0.75, p0: 0.3 },
      { x0: 132, strip: 'BLBb7B', want: '7', tStop: 1.85, p0: 2.1 },
      { x0: 188, strip: 'BCLBbB', want: 'C', tStop: 3.35, p0: 4.6 },
    ];
    const sp = 4.2, jack = t > 5.0;
    // the cabinet, its bulbs, the two ledges, the panel and the deck below
    if (over) pw8Patch(v, 248, 0, v.W - 248, 70, v2 => v2.sky());
    else {
      v.sky();
      ctx.fillStyle = 'rgba(120,20,60,0.55)'; v.rr(62, 26, 186, panelY - 26, 12); ctx.fill();
      pw8Bulbs(v, 74, 240, 34, 16, t, 2.5);
      pw8Ledge(v, 0, 94, 66, panelY - 94 + 10);
    }
    pw8Ledge(v, 244, 70, 76, panelY - 70 + 10);
    ctx.fillStyle = v.c.stoneEdge; ctx.fillRect(0, panelY + 10, v.W, deck - panelY - 10);
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (let x = 8; x < v.W; x += 30) ctx.fillRect(x, panelY + 10, 12, deck - panelY - 10);
    pw8Ledge(v, 0, deck, v.W, 8);
    // the reels
    for (const r of reels) {
      const n = r.strip.length, sym = q => r.strip[((q % n) + n) % n];
      const pS = r.p0 + sp * r.tStop;
      let target = Math.ceil(pS + 0.3); while (sym(target) !== r.want) target++;
      const stopped = t >= r.tStop, settle = v.seg(t, r.tStop, r.tStop + 0.25);
      const pos = stopped ? v.lerp(pS, target, v.ease.back(settle)) : r.p0 + sp * t;
      ctx.fillStyle = '#ffd75e'; v.rr(r.x0 - 3, wy - 3, rw + 6, cell * 3 + 6, 6); ctx.fill();
      ctx.fillStyle = '#fffaf0'; v.rr(r.x0, wy, rw, cell * 3, 4); ctx.fill();
      ctx.save(); v.rr(r.x0, wy, rw, cell * 3, 4); ctx.clip();
      const base = Math.floor(pos);
      for (let q = base - 2; q <= base + 2; q++) {
        const y = yp + (pos - q) * cell;
        if (y < wy - cell || y > wy + cell * 3) continue;
        pw8SlotSym(v, sym(q), r.x0, y, stopped ? (q === target ? 1 : 0.4) : 0.85);
      }
      if (!stopped) { ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(r.x0, wy, rw, cell * 3); }
      ctx.fillStyle = 'rgba(60,20,60,0.25)'; ctx.fillRect(r.x0, wy, rw, 10); ctx.fillRect(r.x0, wy + cell * 3 - 10, rw, 10);
      ctx.restore();
      // the payline frame: red while spinning, gold once a picture is a step (flashing on the jackpot)
      ctx.strokeStyle = jack && Math.floor(t * 8) % 2 ? '#fff' : stopped ? v.c.gold : 'rgba(232,52,78,0.8)'; ctx.lineWidth = stopped ? 2.5 : 2;
      v.rr(r.x0 + 0.5, yp, rw - 1, cell, 3); ctx.stroke();
    }
    // the panel with a STOP button under each reel, and the spotlight where Bo stands
    ctx.fillStyle = '#5a2e60'; ctx.fillRect(62, panelY, 186, 10); ctx.fillStyle = v.c.gold; ctx.fillRect(62, panelY, 186, 2);
    const boX = t < 1.15 ? 98 : t < 2.55 ? v.lerp(98, 154, v.ease.inOut(v.seg(t, 1.15, 1.7))) : v.lerp(154, 210, v.ease.inOut(v.seg(t, 2.55, 3.15)));
    reels.forEach((r, i) => {
      const bx = r.x0 + rw / 2, here = Math.abs(boX - bx) < 6, press = here && t > r.tStop - 0.15 && t < r.tStop + 0.2;
      if (here) {
        ctx.fillStyle = 'rgba(255,236,150,0.3)'; ctx.beginPath(); ctx.moveTo(bx - 10, panelY + 10); ctx.lineTo(bx + 10, panelY + 10); ctx.lineTo(bx + 24, deck); ctx.lineTo(bx - 24, deck); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = press ? '#ff6b7c' : '#d83a50'; ctx.strokeStyle = press ? '#fff3c4' : '#7a1428'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(bx, panelY + 5.5 + (press ? 1 : 0), 11, 3.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (press) v.pill('STOP!', bx + 30, 158, { size: 10, bg: 'rgba(28,26,54,0.85)', col: '#fff' });
    });
    // the JACKPOT lever on the right ledge
    const pull = v.ease.out(v.seg(t, 4.85, 5.05)) * (t < 6.3 ? 1 : 1 - v.seg(t, 6.3, 6.5));
    ctx.fillStyle = v.c.goldDark; v.rr(294, 62, 12, 8, 3); ctx.fill();
    ctx.save(); ctx.translate(300, 64); ctx.rotate(-pull * 0.75);
    v.line(0, 0, 0, -24, '#d9dbe8', 3.5); v.fillCircle(0, -27, 5.5, pw8Col.red); v.fillCircle(-1.8, -29, 1.8, 'rgba(255,255,255,0.55)');
    ctx.restore();
    if (!jack) v.text('JACKPOT', 282, 24, 11, v.c.gold);
    // Pip: hops from the ledge onto each picture as it stops, boings off the cherry, pulls the lever
    let px = 36, py = 94, sq = 0, mood = 'happy';
    const hop = (a, b, x0, y0, x1, y1, h) => { const u = v.seg(t, a, b); px = v.lerp(x0, x1, u); py = v.lerp(y0, y1, u) + v.hop(u, h); };
    if (t > 1.05) hop(1.05, 1.45, 36, 94, 98, 94, 22);
    if (t > 2.2) hop(2.2, 2.6, 98, 94, 154, 80, 24);
    if (t > 3.55) hop(3.55, 3.9, 154, 80, 210, 96, 18);
    if (t > 3.9 && t <= 4.1) { px = 210; py = 96; sq = 0.4 * Math.sin(v.seg(t, 3.9, 4.1) * Math.PI); }
    if (t > 4.1) hop(4.1, 4.6, 210, 96, 266, 70, 46);
    if (t > 4.6) { px = v.lerp(266, 261, v.ease.inOut(v.seg(t, 4.6, 4.85))); py = 70; }
    const flying = (t > 1.05 && t < 1.45) || (t > 2.2 && t < 2.6) || (t > 3.55 && t < 3.9) || (t > 4.1 && t < 4.6);
    if (flying) mood = t > 4.1 ? 'wow' : 'grit';
    if (jack) { mood = 'joy'; py = 70 + v.hop(v.phase(t, 0.5), 8); }
    // the cherry trampoline squash shows under Pip's feet
    v.hero(0, px, py, { face: 1, sq, mood, shadow: !flying });
    const boWalk = (t > 1.15 && t < 1.7) || (t > 2.55 && t < 3.15);
    v.hero(1, boX, deck + (boWalk ? v.hop(v.phase(t, 0.3), 3) : jack ? v.hop(v.phase(t, 0.5, 0.25), 6) : 0), { face: 1, mood: jack ? 'joy' : 'happy' });
    if (t > 3.92 && t < 4.4) v.label('BOING!', 214, 60 - v.seg(t, 3.92, 4.4) * 6, 14, '#ff8fc7');
    // the jackpot: tickets burst out of the reels, confetti, a big gold word
    if (jack && t < 6.5) {
      const a = v.ease.back(v.seg(t, 5.0, 5.3));
      ctx.save(); ctx.translate(154, 20); ctx.scale(a, a); v.label('JACKPOT!', 0, 0, 20, v.c.gold); ctx.restore();
      for (let q = 0; q < 6; q++) {
        const u = v.seg(t, 5.05 + q * 0.08, 6.1 + q * 0.08);
        if (u <= 0 || u >= 1) continue;
        ctx.save(); ctx.globalAlpha = 1 - v.ease.in(u);
        pw8Ticket(v, 98 + (q % 3) * 56 + (q < 3 ? -10 : 10) * u * 2, yp + 14 - 50 * v.ease.out(u) + 40 * u * u, 1.1, (q - 2.5) * 0.3 + u * 2);
        ctx.restore();
      }
    }
    v.confetti(250, 44, v.seg(t, 5.0, 6.2));
  },
});

/* ---------- 8-4 Coin Pusher ---------- */

// 8-4: the fountain sprays star tokens, Pip and Bo drop them in on their own colour, the pusher shoves the pile off
// each side into that player's tube, and Bo's tube reaches the gold line first; then the tubes clear for the next
// round, so the loop needs no fade (the pusher's 3 s sweep fits the 6 s loop twice)
definePreview('Coin Pusher', {
  blurb: 'Drop star tokens on your colour so the pusher shoves them into your tube!',
  loop: 6, still: 2.7,
  draw(v, t) {
    const ctx = v.ctx, roof = 96, bed = 150, eL = 50, eR = 270, hw = 32, ph = 16, ap = 6, cr = 6;
    const pusher = tt => 160 + 56 * Math.sin(tt * Math.PI * 2 / 3);
    const c = pusher(t), split = v.clamp(pusher(t + 0.4), eL, eR);
    const pipX = 104, boX = 216, sway = Math.sin(t * Math.PI / 3), reset = v.seg(t, 5.45, 5.85);
    v.sky(); v.cloud(34 + sway * 10, 30, 0.9); v.cloud(214 - sway * 8, 24, 0.7);
    // the cabinet, the window, the felt bed and its coloured lips, the front panel
    ctx.fillStyle = '#2b1b52'; ctx.fillRect(0, roof, v.W, v.H - roof);
    ctx.fillStyle = '#3b2670'; v.rr(3, roof + 2, v.W - 6, v.H - roof, 10); ctx.fill();
    const g = ctx.createLinearGradient(0, roof + 6, 0, bed); g.addColorStop(0, '#1c2d5e'); g.addColorStop(1, '#2c4f88');
    ctx.fillStyle = g; v.rr(eL - 4, roof + 6, eR - eL + 8, bed - roof, 6); ctx.fill();
    ctx.fillStyle = '#2f8f62'; ctx.fillRect(eL, bed, eR - eL, 4); ctx.fillStyle = '#226b49'; ctx.fillRect(eL, bed + 4, eR - eL, 3);
    ctx.fillStyle = v.c.pip; ctx.fillRect(eL - 4, bed, 4, 7); ctx.fillStyle = v.c.bo; ctx.fillRect(eR, bed, 4, 7);
    ctx.fillStyle = '#211544'; v.rr(62, 160, 196, 18, 6); ctx.fill();
    v.text('COIN PUSHER', 160, 169.5, 11, v.c.gold);
    // the pile on each side of the pusher: it packs tighter as the pusher's face comes at it
    const faceL = c - hw, faceR = c + hw, pile = [];
    const row = (from, to, n, y) => { for (let i = 0; i < n; i++) pile.push(v.lerp(from, to, n > 1 ? i / (n - 1) : 0), y); };
    row(eL + 6, Math.max(eL + 26, faceL - 7), 5, bed - cr);
    row(eL + 12, Math.max(eL + 22, faceL - 14), 2, bed - cr * 2.6);
    row(eR - 6, Math.min(eR - 26, faceR + 7), 5, bed - cr);
    row(eR - 12, Math.min(eR - 22, faceR + 14), 2, bed - cr * 2.6);
    // the tokens Pip and Bo dropped in ride on top of the pile toward the edge
    const dropIn = (x0, tA, side, face, tOff) => {
      const u = v.seg(t, tA, tA + 0.45);
      if (u <= 0 || t > tOff) return;   // from tOff they are the ones tumbling off the edge
      for (let j = 0; j < 2; j++) {
        const xx = side < 0 ? Math.min(x0 - j * 11, face - 8 - j * 11) : Math.max(x0 + j * 11, face + 8 + j * 11);
        if (u < 1) pile.push(x0 - side * j * 11 * u, v.lerp(roof - 34 - j * 6, bed - cr * 2.6, v.ease.in(u)));
        else pile.push(xx, bed - cr * 2.6);
      }
    };
    // the pusher: candy stripes, a tent top, each half tinted for the side it shoves to
    const ys = bed - ph, ya = ys - ap;
    ctx.save(); ctx.beginPath(); ctx.moveTo(c - hw, bed); ctx.lineTo(c - hw, ys); ctx.lineTo(c, ya); ctx.lineTo(c + hw, ys); ctx.lineTo(c + hw, bed); ctx.closePath();
    ctx.fillStyle = '#f6efdf'; ctx.fill(); ctx.clip();
    ctx.fillStyle = '#e8445a'; ctx.beginPath();
    for (let q = -4; q < 4; q++) { const sx = c + q * 9; ctx.moveTo(sx, bed); ctx.lineTo(sx + 4.5, bed); ctx.lineTo(sx + 16, ya); ctx.lineTo(sx + 11.5, ya); ctx.closePath(); }
    ctx.fill();
    ctx.fillStyle = 'rgba(255,107,74,0.3)'; ctx.fillRect(c - hw, ya, hw, ph + ap); ctx.fillStyle = 'rgba(91,149,255,0.3)'; ctx.fillRect(c, ya, hw, ph + ap);
    ctx.restore();
    ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(c - hw, bed); ctx.lineTo(c - hw, ys); ctx.lineTo(c, ya); ctx.lineTo(c + hw, ys); ctx.lineTo(c + hw, bed); ctx.stroke();
    // Pip drops at 1.3 s (left of the pusher), Bo at 2.6 s (right of it)
    dropIn(pipX, 1.3, -1, faceL, 2.05); dropIn(boX, 2.6, 1, faceR, 3.45);
    for (let i = 0; i < pile.length; i += 2) pw8Token(v, pile[i], pile[i + 1], cr);
    // tokens shoved off the edges tumble into the tubes: two for Pip, three for Bo
    const tubes = [{ x: 8, col: v.c.pip, n0: 5, add: 2, tA: 2.05 }, { x: 280, col: v.c.bo, n0: 6, add: 3, tA: 3.45 }];
    const slot = (tb, i) => ({ x: tb.x + 10 + (i % 2) * 12 + (Math.floor(i / 2) % 2) * 2, y: 170 - Math.floor(i / 2) * 9 });
    const lineY = 170 - 4 * 9 + 4, win = t > 4.15;
    tubes.forEach((tb, k) => {
      let n = tb.n0;
      for (let q = 0; q < tb.add; q++) if (t > tb.tA + 0.15 * q + 0.5) n++;
      const glow = k === 1 && win ? (0.5 + 0.5 * Math.sin(t * 10)) * (1 - reset) : 0;
      if (glow) { ctx.save(); ctx.globalAlpha = 0.25 + glow * 0.4; ctx.strokeStyle = v.c.gold; ctx.lineWidth = 6; v.rr(tb.x, roof + 4, 32, v.H - roof - 6, 8); ctx.stroke(); ctx.restore(); }
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; v.rr(tb.x, roof + 4, 32, v.H - roof - 6, 8); ctx.fill();
      ctx.setLineDash([4, 3]); v.line(tb.x + 3, lineY, tb.x + 29, lineY, v.c.gold, 1.6); ctx.setLineDash([]);
      // the next round: the new tokens fade away and the count goes back
      for (let i = 0; i < n; i++) {
        const s = slot(tb, i), a = i < tb.n0 ? 1 : 1 - reset;
        if (a < 1) { ctx.save(); ctx.globalAlpha = a; pw8Token(v, s.x, s.y, 5.5); ctx.restore(); } else pw8Token(v, s.x, s.y, 5.5);
      }
      ctx.strokeStyle = tb.col; ctx.lineWidth = 2.5; v.rr(tb.x, roof + 4, 32, v.H - roof - 6, 8); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(tb.x + 4, roof + 10, 3, v.H - roof - 20);
      if (reset <= 0) v.label(String(n), tb.x + 16, roof + 13, 13, tb.col);
      else {
        ctx.save(); ctx.globalAlpha = 1 - reset; v.label(String(n), tb.x + 16, roof + 13, 13, tb.col);
        ctx.globalAlpha = reset; v.label(String(tb.n0), tb.x + 16, roof + 13, 13, tb.col); ctx.restore();
      }
      for (let q = 0; q < tb.add; q++) { // the flight from the edge into the tube
        const u = v.seg(t, tb.tA + 0.15 * q, tb.tA + 0.15 * q + 0.5);
        if (u <= 0 || u >= 1) continue;
        const ex = k ? eR - 4 : eL + 4, s = slot(tb, tb.n0 + q);
        pw8Token(v, v.lerp(ex, s.x, u), v.lerp(bed - cr, s.y, u) + v.hop(u, 26), cr, 0.3 + 0.7 * Math.abs(Math.cos(u * 12)));
      }
      const pop = v.seg(t, tb.tA + 0.4, tb.tA + 1.2);
      if (pop > 0 && pop < 1) v.label('+' + tb.add, tb.x + 16 + (k ? -30 : 30), 118 - pop * 10, 15, tb.col);
    });
    // the glass the players stand on: orange where a token would go to Pip, blue where it would go to Bo
    ctx.fillStyle = 'rgba(255,107,74,0.85)'; ctx.fillRect(46, roof, split - 46, 5);
    ctx.fillStyle = 'rgba(91,149,255,0.85)'; ctx.fillRect(split, roof, 274 - split, 5);
    ctx.fillStyle = '#fff'; ctx.fillRect(split - 1.5, roof, 3, 5);
    for (const [fx, tA] of [[pipX, 1.3], [boX, 2.6]]) {
      const u = v.seg(t, tA, tA + 0.4);
      if (u > 0 && u < 1) { ctx.save(); ctx.globalAlpha = 1 - u; ctx.fillStyle = '#fff'; v.rr(fx - 8 - 18 * u, roof, 16 + 36 * u, 5, 2.5); ctx.fill(); ctx.restore(); }
    }
    // the fountain and its spray: two tokens to each player
    ctx.fillStyle = v.c.goldDark; ctx.fillRect(154, 0, 12, 20); ctx.fillStyle = v.c.gold; ctx.fillRect(157, 0, 5, 20);
    ctx.fillStyle = v.c.goldDark; v.rr(146, 18, 28, 10, 4); ctx.fill(); ctx.fillStyle = v.c.gold; v.rr(148, 19, 24, 6, 3); ctx.fill();
    v.star(160, 22, 3.2, v.c.goldDark);
    const carry = [0, 0];
    [[pipX, 0.1], [boX, 0.3]].forEach(([hx, t0], id) => {
      for (let j = 0; j < 2; j++) {
        const u = v.seg(t, t0 + j * 0.25, t0 + j * 0.25 + 0.55), held = (id ? 2.6 : 1.3);
        if (u >= 1 && t < held) carry[id]++;
        else if (u > 0 && u < 1) pw8Token(v, v.lerp(160, hx, u), v.lerp(28, roof - 32 - j * 6, u) + v.hop(u, 26), 6, 0.3 + 0.7 * Math.abs(Math.cos(u * 10)));
      }
    });
    // Pip and Bo on the glass, each holding their tokens up, hopping to catch, a little dip to drop them in
    const pose = (id, x, tCatch, tDrop) => {
      const catching = t > tCatch && t < tCatch + 0.6, dropping = t > tDrop - 0.1 && t < tDrop + 0.15;
      const y = roof + (catching ? v.hop(v.seg(t, tCatch, tCatch + 0.6), 6) : 0);
      const cheer = id === 1 && win && t < 5.5;   // Bo's last cheer hop lands at 5.5 s
      const mood = cheer ? 'joy' : id === 0 && win && t < 4.8 ? 'wow' : dropping ? 'grit' : 'happy';
      v.hero(id, x, y + (cheer ? v.hop(v.phase(t, 0.5), 9) : 0), { face: id ? -1 : 1, mood, sq: dropping ? 0.15 : 0 });
      for (let j = 0; j < carry[id]; j++) pw8Token(v, x, y - 32 - j * 6, 6);
    };
    pose(0, pipX, 0.4, 1.3); pose(1, boX, 0.6, 2.6);
    // Bo's tube passes the gold line first
    if (win) {
      const a = v.ease.back(v.seg(t, 4.15, 4.45)) * (1 - v.ease.in(reset));
      if (a > 0.01) { ctx.save(); ctx.translate(250, 60); ctx.scale(a, a); v.label('WIN!', 0, 0, 20, v.c.gold); ctx.restore(); }
      v.star(296, 82 - v.seg(t, 4.15, 5.5) * 6, 8 * v.seg(t, 4.15, 4.3) * (1 - reset), v.c.gold);
    }
    v.confetti(296, 96, v.seg(t, 4.15, 5.4));
  },
});
