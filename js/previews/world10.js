/* Pip & Bo - Level previews for World 10 (see js/previews/preview-core.js for how to write one). */
'use strict';

/* The Grand Collector, drawn like gcDrawBoss in js/levels/world10/grand-collector.js (fewer poses), plus the nine
   world pieces from his belly-jar. Every helper starts with pw10. */
const pw10Col = { brass: '#e0ab45', brassDk: '#8f6421', brassLt: '#f7d77e', purple: '#7a55c0', purpleDk: '#46307e', hat: '#2c2050', glass: 'rgba(205,236,255,0.42)' };
// the nine piece icons (n = world 1-9) in a circle of radius r around (x, y)
function pw10Icon(v, n, x, y, r) {
  const ctx = v.ctx, ink = v.c.ink, P = Math.PI * 2;
  ctx.save(); ctx.translate(x, y); ctx.scale(r / 10, r / 10);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 1.5; ctx.strokeStyle = ink;
  const blob = (col, path) => { ctx.fillStyle = col; ctx.beginPath(); path(); ctx.fill(); ctx.stroke(); };
  if (n === 1) { // sunflower
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; blob('#ffd23f', () => ctx.ellipse(Math.cos(a) * 6, Math.sin(a) * 6, 4.2, 2.4, a, 0, P)); }
    blob('#8a5a2b', () => v.circle(0, 0, 4.4));
  } else if (n === 2) { // a T block
    ctx.fillStyle = '#ff8f5a';
    for (const [cx, cy] of [[-6.6, -3.3], [0, -3.3], [6.6, -3.3], [0, 3.3]]) { ctx.fillRect(cx - 3.3, cy - 3.3, 6.6, 6.6); ctx.strokeRect(cx - 3.3, cy - 3.3, 6.6, 6.6); }
  } else if (n === 3) { // golf flag on a green
    blob('#7fd36b', () => ctx.ellipse(0, 7, 9.5, 3.2, 0, 0, P));
    v.line(-2, 7, -2, -9, '#fff', 2);
    ctx.lineWidth = 1.2; ctx.strokeStyle = ink; blob('#ff5f6d', () => { ctx.moveTo(-1, -9.5); ctx.lineTo(8.5, -5.5); ctx.lineTo(-1, -1.5); ctx.closePath(); });
  } else if (n === 4) { // boxing glove
    blob('#ff5f6d', () => v.rr(-7, -9, 15, 14, 6)); blob('#ff5f6d', () => v.circle(-7, -1, 3.8)); blob('#fff', () => v.rr(-5.5, 4, 11, 5.5, 2));
  } else if (n === 5) { // little car
    blob('#4fc3d9', () => v.rr(-5, -8, 10, 7, 3)); blob('#4fc3d9', () => v.rr(-9.5, -3, 19, 7.5, 3));
    v.fillCircle(-5, 5, 2.8, ink); v.fillCircle(5, 5, 2.8, ink);
  } else if (n === 6) { // cupcake
    blob('#d9a066', () => { ctx.moveTo(-6.5, 0); ctx.lineTo(6.5, 0); ctx.lineTo(4.5, 9); ctx.lineTo(-4.5, 9); ctx.closePath(); });
    blob('#ff8fc7', () => ctx.ellipse(0, -1.5, 8.5, 5.5, 0, 0, P)); blob('#e8475f', () => v.circle(0, -7.5, 2.6));
  } else if (n === 7) { // crown
    blob('#ffc53d', () => { ctx.moveTo(-9, 6); ctx.lineTo(-9.5, -6); ctx.lineTo(-4.5, -1); ctx.lineTo(0, -8); ctx.lineTo(4.5, -1); ctx.lineTo(9.5, -6); ctx.lineTo(9, 6); ctx.closePath(); });
    v.fillCircle(0, 2, 2, '#ff5f7e');
  } else if (n === 8) { // cherries
    ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-4, 2); ctx.quadraticCurveTo(-2, -6, 3, -9); ctx.moveTo(5, 3); ctx.quadraticCurveTo(4, -4, 3, -9); ctx.stroke();
    ctx.strokeStyle = ink; ctx.lineWidth = 1.3; blob('#e8475f', () => v.circle(-4.5, 4, 4.6)); blob('#e8475f', () => v.circle(5, 5, 4.6));
  } else { // volcano
    blob('#9a6a4a', () => { ctx.moveTo(-10, 8); ctx.lineTo(-3, -5); ctx.lineTo(3, -5); ctx.lineTo(10, 8); ctx.closePath(); });
    ctx.fillStyle = '#ff9a3d'; ctx.beginPath(); ctx.moveTo(-3, -5); ctx.lineTo(3, -5); ctx.lineTo(1.5, 1); ctx.lineTo(-1, 3); ctx.closePath(); ctx.fill();
    v.fillCircle(1, -9, 2.6, 'rgba(255,255,255,0.85)'); v.fillCircle(4, -11, 2, 'rgba(255,255,255,0.85)');
  }
  ctx.restore();
}
// the grabby claw at the end of his arm (local units), open 0..1
function pw10Claw(v, x, y, ang, open) {
  const ctx = v.ctx;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  for (const k of [-1, 0, 1]) {
    const a = k * (0.18 + 0.6 * open), tipx = Math.cos(a) * 26, tipy = Math.sin(a) * 26, hook = k === 0 ? 0 : -k * (0.9 - 0.5 * open);
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(tipx, tipy); ctx.lineTo(tipx + Math.cos(a + hook * 1.4) * 8, tipy + Math.sin(a + hook * 1.4) * 8);
    ctx.strokeStyle = v.c.ink; ctx.lineWidth = 7.5; ctx.stroke(); ctx.strokeStyle = '#d9dbe8'; ctx.lineWidth = 4; ctx.stroke();
  }
  ctx.fillStyle = pw10Col.purple; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 2.5; v.circle(0, 0, 11); ctx.fill(); ctx.stroke();
  v.fillCircle(-2, -3, 3.5, pw10Col.brassLt);
  ctx.restore();
}
/* The robot with his feet at (x, y), scale s, facing f (-1 = left). His idle wiggles repeat every 8 s (the loop), so the
   seam is smooth. o: t (clock), wob (hit wobble 0..1), mood
   ('smug' 'happy'), dizzy, wave, hand [x, y] and open for the front claw (local units), mono (false: the monocle is off),
   have(i) -> alpha of piece i in the jar (0 = gone). */
function pw10Boss(v, x, y, s, f, o) {
  const ctx = v.ctx, B = pw10Col, ink = v.c.ink, t = o.t, P = Math.PI * 2;
  ctx.save();
  ctx.fillStyle = 'rgba(28,26,54,0.24)'; ctx.beginPath(); ctx.ellipse(x, y, 96 * s, 11 * s, 0, 0, P); ctx.fill();
  ctx.translate(x, y); ctx.scale(s * f, s);
  const wk = o.wob || 0, wob = wk > 0 ? Math.sin(wk * 23) * 0.09 * Math.min(1, (1 - wk) / 0.45) : 0;
  ctx.rotate(wob + (o.dizzy ? Math.sin(t * 5) * 0.06 : 0));
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = ink;
  // legs and feet
  for (const lx of [-30, 30]) {
    ctx.fillStyle = B.brassDk; ctx.lineWidth = 3; v.rr(lx - 13, -56, 26, 46, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = B.purpleDk; ctx.beginPath(); ctx.ellipse(lx + 6, -8, 25, 10, 0, 0, P); ctx.fill(); ctx.stroke();
  }
  // the short back arm (up while he waves)
  const bh = o.wave ? [-96, -196 + Math.sin(t * 9 + 1) * 10] : [-100, -104 + Math.sin(t * Math.PI / 2) * 2];
  ctx.beginPath(); ctx.moveTo(-70, -150); ctx.quadraticCurveTo(-100, -150, bh[0], bh[1]);
  ctx.strokeStyle = B.brassDk; ctx.lineWidth = 15; ctx.stroke(); ctx.strokeStyle = B.brass; ctx.lineWidth = 10; ctx.stroke();
  ctx.fillStyle = B.purple; ctx.strokeStyle = ink; ctx.lineWidth = 2.5; v.circle(bh[0], bh[1], 12); ctx.fill(); ctx.stroke();
  // the propeller on his back
  v.line(-46, -200, -58, -322, ink, 4);
  ctx.fillStyle = '#d9dbe8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(-58, -324, 15, 6, 0, 0, P); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff5f6d'; v.circle(-58, -324, 5); ctx.fill(); ctx.stroke();
  // torso, belt, rivets, chest lights
  ctx.fillStyle = B.brass; ctx.lineWidth = 4; v.rr(-82, -190, 164, 150, 44); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; v.rr(-70, -182, 46, 70, 20); ctx.fill();
  ctx.fillStyle = B.purple; ctx.lineWidth = 2.5; v.rr(-82, -64, 164, 20, 10); ctx.fill(); ctx.stroke();
  for (let k = -2; k <= 2; k++) v.fillCircle(k * 30, -176, 3, B.brassDk);
  for (const [lx, c] of [[-64, '#7fd36b'], [64, '#ff5f6d']]) { ctx.save(); ctx.globalAlpha *= 0.6 + 0.4 * Math.sin(t * Math.PI * 1.5 + lx); v.fillCircle(lx, -88, 6, c); ctx.restore(); }
  // the glass belly-jar and the pieces bobbing in it
  v.fillCircle(0, -112, 54, B.glass);
  for (let i = 0; i < 9; i++) {
    const al = o.have(i);
    if (al <= 0) continue;
    const a = i * 2.39 + t * Math.PI / 4, rad = 9 + (i % 3) * 13;
    ctx.save(); ctx.globalAlpha *= al; ctx.scale(f, 1);
    pw10Icon(v, i + 1, f * Math.cos(a) * rad, -112 + Math.sin(a) * rad * 0.8 + Math.sin(t * Math.PI / 2 + i) * 3, 12);
    ctx.restore();
  }
  ctx.strokeStyle = B.brassLt; ctx.lineWidth = 7; v.circle(0, -112, 54); ctx.stroke();
  ctx.strokeStyle = B.brassDk; ctx.lineWidth = 2; v.circle(0, -112, 57.5); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, -112, 42, -2.6, -1.9); ctx.stroke();
  // neck, the purple dome, the brass band, ear bolts
  ctx.strokeStyle = ink; ctx.fillStyle = B.brassDk; ctx.lineWidth = 2.5; v.rr(-22, -204, 44, 18, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = B.purple; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, -230, 62, 48, 0, Math.PI, 0); ctx.lineTo(62, -200); ctx.lineTo(-62, -200); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(-26, -256, 18, 10, -0.4, 0, P); ctx.fill();
  ctx.fillStyle = B.brass; ctx.lineWidth = 2.5; v.rr(-64, -206, 128, 14, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = B.brassLt; for (const ex of [-64, 64]) { v.circle(ex, -226, 8); ctx.fill(); ctx.stroke(); }
  // googly eyes: spirals when dizzy, happy arcs, else pupils
  const happy = o.mood === 'happy', jig = Math.sin(t * Math.PI * 3) * 1.4;
  for (const [ex, er] of [[-14, 14], [26, 16]]) {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 2.5; v.circle(ex, -234, er); ctx.fill(); ctx.stroke();
    if (o.dizzy) { ctx.lineWidth = 2.2; ctx.beginPath(); for (let a = 0; a < 9; a += 0.4) ctx.lineTo(ex + Math.cos(a + t * 6) * a * 0.9, -234 + Math.sin(a + t * 6) * a * 0.9); ctx.stroke(); }
    else if (happy) { ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(ex, -230, er * 0.55, Math.PI + 0.3, -0.3); ctx.stroke(); }
    else { v.fillCircle(ex + 3 + jig * 0.6, -231 + jig * 0.4, er * 0.42, ink); v.fillCircle(ex + 1 + jig * 0.6, -233, 1.8, '#fff'); }
  }
  ctx.strokeStyle = ink; ctx.lineWidth = 4;
  const brow = happy ? [[-24, -254, -4, -256], [14, -258, 38, -256]] : [[-26, -252, -4, -254], [14, -262, 38, -258]];
  for (const [x0, y0, x1, y1] of brow) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
  if (o.mono !== false) {
    ctx.strokeStyle = v.c.gold; ctx.lineWidth = 4; v.circle(26, -234, 20); ctx.stroke();
    ctx.strokeStyle = B.brassDk; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(40, -220); ctx.quadraticCurveTo(52, -206, 44, -194); ctx.stroke();
  }
  // mouth: an "O" when hit, a smile when happy, else the smug grille
  ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
  if (wk > 0 && wk < 0.65) { ctx.fillStyle = '#2a1f45'; ctx.beginPath(); ctx.ellipse(10, -207, 8, 7, 0, 0, P); ctx.fill(); ctx.stroke(); }
  else if (happy) { ctx.fillStyle = '#2a1f45'; ctx.beginPath(); ctx.arc(8, -214, 14, 0.15, Math.PI - 0.15); ctx.closePath(); ctx.fill(); ctx.stroke(); v.fillCircle(8, -204, 4, '#ff8fa3'); }
  else {
    ctx.fillStyle = '#d9dbe8'; v.rr(-8, -213, 36, 11, 4); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.beginPath(); for (let k = 1; k < 4; k++) { ctx.moveTo(-8 + k * 9, -213); ctx.lineTo(-8 + k * 9, -202); } ctx.stroke();
    if (!o.dizzy) { ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(28, -210); ctx.lineTo(34, -216); ctx.stroke(); }
  }
  v.fillCircle(46, -212, 6, 'rgba(255,120,140,0.4)'); v.fillCircle(-32, -212, 5, 'rgba(255,120,140,0.4)');
  // the tiny top hat (it hops when he is hit)
  const hop = wk > 0 ? Math.sin(wk * Math.PI) * 26 : 0;
  ctx.save(); ctx.translate(-6, -276 - hop); ctx.rotate(-0.12 + (wk > 0 ? Math.sin(wk * 18) * 0.2 * (1 - wk) : 0));
  ctx.fillStyle = B.hat; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(0, 4, 40, 8, 0, 0, P); ctx.fill(); ctx.stroke();
  v.rr(-24, -32, 48, 36, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = v.c.gold; ctx.fillRect(-24, -8, 48, 7);
  ctx.restore();
  // the grabby front arm: an accordion tube out to the claw
  const [hx, hy] = o.hand, dx = hx - 76, dy = hy + 160, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, n = Math.max(2, Math.round(d / 15));
  ctx.beginPath(); ctx.moveTo(76, -160); ctx.lineTo(hx, hy);
  ctx.strokeStyle = B.brassDk; ctx.lineWidth = 15; ctx.stroke(); ctx.strokeStyle = B.brass; ctx.lineWidth = 10; ctx.stroke();
  ctx.strokeStyle = B.brassDk; ctx.lineWidth = 2.2; ctx.beginPath();
  for (let k = 1; k < n; k++) { const px = 76 + dx * k / n, py = -160 + dy * k / n; ctx.moveTo(px - nx * 6, py - ny * 6); ctx.lineTo(px + nx * 6, py + ny * 6); }
  ctx.stroke();
  pw10Claw(v, hx, hy, Math.atan2(dy, dx), o.open);
  ctx.restore();
}
// the big bouncy ball: white with red, blue and yellow wedges, gold (and glowing) once it is set
function pw10Ball(v, x, y, r, spin, gold) {
  const ctx = v.ctx;
  if (gold) v.fillCircle(x, y, r + 5, 'rgba(255,214,90,0.45)');
  ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
  v.fillCircle(0, 0, r, '#fff');
  const cols = gold ? [v.c.gold, '#ffe58a', v.c.gold] : ['#ff5f6d', '#5b95ff', '#ffd23f'];
  for (let i = 0; i < 3; i++) { ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, i * 2.094, i * 2.094 + 0.9); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.6; v.circle(0, 0, r); ctx.stroke();
  v.fillCircle(-r * 0.3, -r * 0.35, r * 0.25, 'rgba(255,255,255,0.6)');
  ctx.restore();
}

// 10-1 (the Grand Finale room): he tosses a ball over the net, Pip sets it and Bo spikes it into his belly-jar (BOING,
// his monocle pops, the boxing glove flies home); then the jobs swap and the cupcake goes. Dizzy, he gives up with a
// smile, waves, and every piece flies home
definePreview('The Grand Collector', {
  blurb: 'Team up to bop the big silly robot and win back every world’s piece!',
  loop: 8, still: 2.42,
  draw(v, t) {
    const gy = 158, s = 0.44, bx = 252, f = -1, pipX = 56, boX = 112, jarX = bx, jarY = gy - 112 * s;
    v.sky(); v.sun(150, 32, 14); v.clouds(12); v.hills(gy - 30); v.ground(gy);
    // the story's beats: two rallies (toss, set, spike, hit), then the happy ending
    const R = [{ raise: 0.55, toss: 0.9, set: 1.5, spike: 2.05, hit: 2.28, setter: 0, spiker: 1 },
      { raise: 2.85, toss: 3.2, set: 3.8, spike: 4.35, hit: 4.6, setter: 1, spiker: 0 }];
    // the rallies win back the pieces the real room does: 4 (boxing glove), then 6 (cupcake)
    const heroX = [pipX, boX], gone = [3, 5], endT = 5.6, wave = t > 5.5 && t < 7.4, netX = 168;
    const order = [0, 1, 2, 4, 6, 7, 8];
    const leave = i => (i === gone[0] ? R[0].hit : i === gone[1] ? R[1].hit : endT + order.indexOf(i) * 0.1 - 0.05);
    // the net between them and him, drawn like the room's own (a brown post, a white mesh and tape)
    {
      const ctx = v.ctx, top = gy - 42;
      ctx.fillStyle = '#8a5833'; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.5; v.rr(netX - 2.5, top - 2, 5, 44, 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let y = top + 5; y <= top + 21; y += 5) { ctx.moveTo(netX - 13, y); ctx.lineTo(netX + 13, y); }
      for (let x = netX - 13; x <= netX + 13; x += 4.33) { ctx.moveTo(x, top + 2); ctx.lineTo(x, top + 21); }
      ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.lineWidth = 1.2; v.rr(netX - 14, top, 28, 4, 2); ctx.fill(); ctx.stroke();
    }
    // his front claw: raised with the ball before each toss, waving at the end, else resting
    let hand = [104, -84 + Math.sin(t * Math.PI / 2) * 2], open = 0.15, held = null;
    for (const r of R) {
      if (t > r.raise && t < r.toss + 0.5) {
        const up = v.ease.out(v.seg(t, r.raise, r.toss)), back = v.ease.inOut(v.seg(t, r.toss, r.toss + 0.5));
        hand = [v.lerp(104, 82, up - back), v.lerp(-84, -270, up - back)]; open = t < r.toss ? 0.15 : 1 - back * 0.85;
        if (t < r.toss) held = r;
      }
    }
    if (t > 5.5) {
      const k = v.ease.inOut(v.seg(t, 5.5, 5.8)) * (1 - v.ease.inOut(v.seg(t, 7.3, 7.7)));
      hand = [v.lerp(104, 108, k), v.lerp(-84, -296 + Math.sin(t * 9) * 16, k)]; open = 0.15 + k * 0.85;
    }
    const lastHit = t > R[1].hit ? R[1].hit : t > R[0].hit ? R[0].hit : -9, wk = v.seg(t, lastHit, lastHit + 0.9);
    const dizzy = t > R[1].hit + 0.3 && t < 5.5, happy = t > 5.5 && t < 7.6;
    const monoOff = wk > 0 && wk < 1;
    pw10Boss(v, bx, gy, s, f, {
      t, wob: wk > 0 && wk < 1 ? wk : 0, mood: happy ? 'happy' : 'smug', dizzy, wave, hand, open, mono: !monoOff,
      have: i => (t < leave(i) ? 1 : v.seg(t, 7.35, 7.9)),
    });
    // the monocle pops off to the side, flips like a coin and hops back on (a twinkle when it lands)
    {
      const ex = bx + f * 26 * s, ey = gy - 234 * s, ctx = v.ctx;
      if (monoOff) {
        ctx.save(); ctx.translate(ex - Math.sin(wk * Math.PI) * 28, ey + v.hop(wk, 16)); ctx.scale(Math.max(0.2, Math.abs(Math.cos(wk * 12))), 1);
        ctx.fillStyle = 'rgba(205,236,255,0.65)'; ctx.strokeStyle = v.c.gold; ctx.lineWidth = 2.5; v.circle(0, 0, 8.5); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      v.sparkle(ex, ey, v.seg(t, lastHit + 0.9, lastHit + 1.3), '#fff', 9);
    }
    if (dizzy) for (let k = 0; k < 4; k++) { const a = t * 4 + k * Math.PI / 2; v.star(bx - 4 + Math.cos(a) * 34, gy - 126 + Math.sin(a) * 7, 5.5, v.c.gold); }
    // the pieces flying home: up and out of the top of the scene
    for (let i = 0; i < 9; i++) {
      const t0 = leave(i), k = v.seg(t, t0, t0 + 0.95);
      if (k <= 0 || k >= 1) continue;
      const tx = i === gone[0] ? 40 : i === gone[1] ? 150 : 12 + order.indexOf(i) * 30;
      const px = v.lerp(jarX, tx, v.ease.out(k)), py = v.lerp(jarY, -20, v.ease.in(k)) + v.hop(k, 30);
      for (let q = 1; q <= 2; q++) v.fillCircle(px - (tx - jarX) * 0.06 * q, py + 9 * q, 2.6 - q * 0.6, 'rgba(255,255,255,0.7)');
      pw10Icon(v, i + 1, px, py, 10);
    }
    // Pip and Bo: the setter bumps, the spiker jumps; a happy hop when a piece comes home
    for (const id of [0, 1]) {
      let y = gy, sq = 0, mood = 'happy';
      for (const r of R) {
        if (r.setter === id) { const k = v.seg(t, r.set - 0.12, r.set + 0.2); y += v.hop(k, 8); if (t > r.toss && t < r.set) mood = 'grit'; }
        if (r.spiker === id) { const k = v.seg(t, r.spike - 0.22, r.spike + 0.2); y += v.hop(k, 28); if (t > r.set && t < r.spike + 0.2) mood = 'grit'; }
        if (t > r.hit && t < r.hit + 0.7) { mood = 'joy'; }
      }
      if (t > endT && t < 7.4) { mood = 'joy'; y += v.hop(v.phase(t - endT, 0.45, id * 0.22), 12); }
      const near = y >= gy - 0.5 && (t > R[0].set - 0.05 && t < R[0].set + 0.05);
      v.hero(id, heroX[id], y, { face: 1, mood, sq: near ? 0.15 : sq });
    }
    // the ball: held in the claw, tossed to the setter, set (gold) to the spiker, spiked into the jar, bounced away
    const clawX = bx + f * 82 * s - 10, clawY = gy - 270 * s - 6;
    for (const r of R) {
      const sx = heroX[r.setter], kx = heroX[r.spiker];
      let p = null, gold = false, a = 1;
      if (held === r) p = [clawX, clawY];
      else if (t >= r.toss && t < r.set) { const k = v.seg(t, r.toss, r.set); p = [v.lerp(clawX, sx, k), v.lerp(clawY, gy - 36, k) + v.hop(k, 26)]; }
      else if (t >= r.set && t < r.spike) { const k = v.seg(t, r.set, r.spike); p = [v.lerp(sx, kx, k), v.lerp(gy - 36, gy - 62, k) + v.hop(k, 44)]; gold = true; }
      else if (t >= r.spike && t < r.hit) { const k = v.seg(t, r.spike, r.hit); p = [v.lerp(kx, jarX - 24, k), v.lerp(gy - 62, jarY - 2, k)]; gold = true; }
      else if (t >= r.hit && t < r.hit + 0.6) { const k = v.seg(t, r.hit, r.hit + 0.6); p = [v.lerp(jarX - 24, jarX - 56, k), v.lerp(jarY - 2, gy - 8, k) + v.hop(k, 30)]; a = 1 - v.ease.in(k); }
      if (!p) continue;
      if (t >= r.spike && t < r.hit) for (let q = 1; q <= 3; q++) { const k = v.seg(t - q * 0.03, r.spike, r.hit); v.fillCircle(v.lerp(kx, jarX - 24, k), v.lerp(gy - 62, jarY - 2, k), 7 - q * 1.5, 'rgba(255,214,90,0.5)'); }
      v.ctx.save(); v.ctx.globalAlpha *= a; pw10Ball(v, p[0], p[1], 8, t * 7, gold); v.ctx.restore();
      if (t > r.set && t < r.set + 0.45) v.label('SET!', sx, gy - 44 - v.seg(t, r.set, r.set + 0.45) * 8, 14, v.c.gold);
    }
    for (const r of R) {
      const k = v.seg(t, r.hit, r.hit + 0.75);
      if (k > 0 && k < 1) { v.ctx.save(); v.ctx.globalAlpha *= 1 - v.seg(k, 0.7, 1); v.label('BOING!', jarX - 80, jarY - 36 - k * 6, 16 * (0.75 + 0.25 * v.ease.back(v.seg(k, 0, 0.3))), '#ff8fc7'); v.ctx.restore(); }
    }
    // talk: he is smug at the start and sorry at the end
    if (t > 0.08 && t < 0.62) v.bubble('Mine!', bx - 40, gy - 112, { size: 11 });
    if (t > 5.65 && t < 6.9) v.bubble('Sorry!', bx - 40, gy - 112, { size: 11 });
    v.confetti(84, gy - 40, v.seg(t, 5.7, 7.3), 20);
  },
});
