/* Pip & Bo - Level previews for World 3 (see js/previews/preview-core.js for how to write one). */
'use strict';

/* World 3 props, drawn like js/levels/golf.js (scaled to the preview). Every helper starts with pw3. */
// the partner curled up as the ball: white with their colour round the edge, Bo's ears or Pip's sprout on top
function pw3Ball(v, id, x, y, o = {}) {
  const ctx = v.ctx, r = 10, col = id ? v.c.bo : v.c.pip, dark = id ? v.c.boDark : v.c.pipDark;
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.translate(x, y);
  if (id === 1) {
    ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
    for (const ex of [-6, 6]) { v.circle(ex, -r + 1, 3.8); ctx.fill(); ctx.stroke(); }
  } else {
    v.line(0, -r, 1, -r - 4, '#3f8f5c', 1.6);
    ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(4, -r - 5, 4.5, 2.2, -0.5, 0, Math.PI * 2); ctx.fill();
  }
  v.fillCircle(0, 0, r, '#fbfaf5');
  ctx.save(); ctx.rotate(o.spin || 0); ctx.fillStyle = 'rgba(28,26,54,0.13)';
  for (let i = 0; i < 6; i++) { const a = i * 1.05; v.circle(Math.cos(a) * 6, Math.sin(a) * 6, 1.4); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = col; ctx.lineWidth = 2.8; v.circle(0, 0, r); ctx.stroke();
  const lx = o.lx == null ? 1.2 : o.lx, ly = o.ly || 0;
  for (const ex of [-3.4, 3.4]) {
    if (o.dizzy) { v.line(ex - 1.8, -3.3, ex + 1.8, 0.3, v.c.ink, 1.4); v.line(ex + 1.8, -3.3, ex - 1.8, 0.3, v.c.ink, 1.4); continue; }
    v.fillCircle(ex + lx, -1.5 + ly, 1.9, v.c.ink);
    v.fillCircle(ex + lx + 0.6, -2.1 + ly, 0.6, '#fff');
  }
  ctx.restore();
}
// the club from the golfer's hands to just behind the ball at (bx, by); off = radians swung back (+) or through (-)
function pw3Club(v, x, gy, face, bx, by, off) {
  const ctx = v.ctx, hx = x + face * 4, hy = gy - 15, headX = bx - face * 12, headY = by + 7;
  const len = Math.hypot(headX - hx, headY - hy), ang = Math.atan2(headY - hy, headX - hx) + face * off;
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
  v.line(0, 0, len, 0, '#8d8aa6', 3);
  ctx.fillStyle = '#d9dbe8'; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.5;
  v.rr(len - 3, -2, 8, 9, 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
// the club's swing: charge from c0 to c1 (power 0..pow), whack, follow through, then back to rest
function pw3Swing(v, t, c0, c1, pow = 1) {
  if (t < c0) return { off: 0, p: 0 };
  if (t < c1) { const p = v.seg(t, c0, c1) * pow; return { off: 0.5 * v.seg(t, c0, c0 + 0.12) + p * 2.1, p }; }
  const back = 0.5 + pow * 2.1;
  if (t < c1 + 0.12) return { off: v.lerp(back, -2.3, v.ease.in(v.seg(t, c1, c1 + 0.12))), p: 0 };
  return { off: v.lerp(-2.3, 0, v.ease.inOut(v.seg(t, c1 + 1.1, c1 + 1.6))), p: 0 };
}
// the power meter beside the golfer (fills green, gold, then red)
function pw3Meter(v, x, y, f) {
  const ctx = v.ctx, mh = 34;
  ctx.fillStyle = 'rgba(28,26,54,0.8)'; v.rr(x - 3, y - 3, 16, mh + 6, 5); ctx.fill();
  ctx.fillStyle = f < 0.5 ? v.c.grass : f < 0.85 ? v.c.gold : '#ff6b6b';
  if (f > 0.02) { v.rr(x, y + mh * (1 - f), 10, mh * f, 3); ctx.fill(); }
}
// the cup in the ground at (x, y) with its flag (gold, green once the ball is in: sunk 0..1); wave 0..1 loops
function pw3Cup(v, x, y, sunk, wave) {
  const ctx = v.ctx, w = Math.sin(wave * Math.PI * 2) * 2.5, fx = x + 6;
  ctx.fillStyle = v.c.doorIn; ctx.fillRect(x - 12, y - 3, 24, 15);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 12, y - 3, 24, 4);
  ctx.fillStyle = '#e9e4f5'; ctx.fillRect(fx - 1.5, y - 48, 3, 52);
  ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.2;
  for (const [col, a] of [[v.c.gold, 1], [v.c.grass, sunk]]) {
    if (a <= 0) continue;
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(fx + 1.5, y - 48); ctx.lineTo(fx + 26, y - 40 + w); ctx.lineTo(fx + 1.5, y - 32); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}
// the golfer stands in the same spot at both ends of the loop, so it is drawn outside the fade: three joy hops once
// the ball is in (at inT), the club put away, then back in hand (and a calm face) while the scene fades to its start
function pw3Golfer(v, id, x, gy, t, loop, inT, mood, sw, bx, by, hopH) {
  const after = t > inT, fk = v.seg(t, loop - 0.5, loop);
  const j = after && t < inT + 1.5 ? v.hop(v.phase(t - inT, 0.5), hopH) : 0;
  v.hero(id, x, gy + j, { face: 1, mood: after ? (fk > 0.3 ? 'happy' : 'joy') : mood });
  const ca = !after || t < inT + 0.4 ? 1 : fk;
  if (ca <= 0) return;
  v.ctx.save(); v.ctx.globalAlpha *= ca; pw3Club(v, x, gy + j, 1, bx, by, sw.off); v.ctx.restore();
}
// how green the flag is: once the ball drops in, until the end-of-loop fade
const pw3Sunk = (v, t, loop, inT) => (t > inT ? 1 - v.seg(t, loop - 0.5, loop) : 0);
// a hero popping up out of the cup (k 0..1), hidden below the green
function pw3Pop(v, id, x, y, k, o) {
  if (k <= 0) return;
  const ctx = v.ctx;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, v.W, y + 1); ctx.clip();
  v.hero(id, x, y + (1 - v.ease.back(k)) * 30, Object.assign({ shadow: k >= 1 }, o));
  ctx.restore();
}
// the partner curling up into the ball on the tee: a squash, a puff, and there is the ball
function pw3Curl(v, id, t, x0, bx, gy, t0) {
  const hk = v.seg(t, t0, t0 + 0.4), sk = v.seg(t, t0 + 0.4, t0 + 0.55);
  if (sk < 1) v.hero(id, v.lerp(x0, bx, v.ease.inOut(hk)), gy + v.hop(hk, 14), { face: -1, s: 1 - sk * 0.5, sq: sk * 0.6, mood: sk > 0 ? 'blink' : 'happy', shadow: sk < 0.5 });
  v.puff(bx, gy - 4, v.seg(t, t0 + 0.5, t0 + 0.85));
}
// pink bounce pad on the ground at (x, base); sq 0..1 squashes it
function pw3Pad(v, x, base, sq) {
  const ctx = v.ctx, top = base - 11 + sq * 5;
  ctx.fillStyle = '#4a4766'; v.rr(x - 10, base - 4, 20, 4, 2); ctx.fill();
  ctx.strokeStyle = '#d9dbe8'; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i <= 4; i++) ctx.lineTo(x - 5 + (i % 2) * 10, base - 4 - (base - 4 - top) * i / 4);
  ctx.stroke();
  ctx.fillStyle = '#ff5fa2'; ctx.strokeStyle = '#6e1d48'; ctx.lineWidth = 1.5;
  v.rr(x - 12, top - 5, 24, 6, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.moveTo(x, top - 15); ctx.lineTo(x + 5, top - 8); ctx.lineTo(x - 5, top - 8); ctx.closePath(); ctx.fill();
}
// windmill sails (cream with orange tips) round a brown hub; a = angle of the first sail
function pw3Mill(v, x, y, a, arms, len, hw, lit) {
  const ctx = v.ctx;
  ctx.save(); ctx.translate(x, y);
  for (let k = 0; k < arms; k++) {
    ctx.save(); ctx.rotate(a + k * Math.PI * 2 / arms);
    ctx.fillStyle = '#f6efdf'; ctx.strokeStyle = '#7a3b2e'; ctx.lineWidth = 2;
    v.rr(5, -hw, len - 5, hw * 2, hw); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,107,74,0.85)'; v.rr(len * 0.45, -hw + 1.5, len * 0.5, hw * 2 - 3, 2); ctx.fill();
    ctx.restore();
  }
  v.fillCircle(0, 0, 7, lit ? '#ffe3ae' : '#7a3b2e');
  v.fillCircle(0, 0, 2.6, '#f6efdf');
  ctx.restore();
}
// a portal (an oval of colour with a swirl); ph turns the swirl, flash 0..1 makes it swell
function pw3Portal(v, x, y, col, ph, flash = 0) {
  const ctx = v.ctx, s = 1 + flash * 0.3;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(28,26,54,0.55)'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 0, 12, 18, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
  for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.ellipse(0, 0, 7, 12, 0, ph + k * Math.PI, ph + k * Math.PI + 1.8); ctx.stroke(); }
  ctx.restore();
}
// the ball's boost: its fuel bar above it and white puffs behind it (dir = which way it flies)
function pw3Boost(v, x, y, k, col, dir) {
  if (k <= 0 || k >= 1) return;
  const ctx = v.ctx;
  ctx.save();
  for (let q = 0; q < 4; q++) { ctx.globalAlpha = 0.9 - q * 0.2; v.fillCircle(x - dir * (13 + q * 7), y + 2 + q * 1.5, 4 - q * 0.7, col); }
  ctx.restore();
  ctx.fillStyle = 'rgba(28,26,54,0.75)'; v.rr(x - 15, y - 26, 30, 8, 4); ctx.fill();
  ctx.fillStyle = '#fff'; v.rr(x - 13, y - 24.5, 26 * (1 - k), 5, 2.5); ctx.fill();
}
// the end of every loop: the actors fade from the last moment back into the first
function pw3Fade(v, t, loop, fade, actors) {
  const k = v.seg(t, loop - fade, loop), ctx = v.ctx;
  if (k <= 0) { actors(t); return; }
  ctx.save(); ctx.globalAlpha *= 1 - k; actors(t); ctx.restore();
  ctx.save(); ctx.globalAlpha *= k; actors(0); ctx.restore();
}
// a short word that pops up and drifts up a little over k = 0..1
function pw3Pop2(v, str, x, y, k, size, col, rise = 8) {
  if (k <= 0 || k >= 1) return;
  const ctx = v.ctx;
  ctx.save(); ctx.globalAlpha *= 1 - v.seg(k, 0.7, 1);
  v.label(str, x, y - k * rise, size * (0.7 + 0.3 * v.ease.back(v.seg(k, 0, 0.25))), col);
  ctx.restore();
}

// 3-1: Bo hops on the tee and curls up into the ball, Pip whacks him over the wall and the pond, Bo boosts, and drops in
definePreview('Tee for Two', {
  blurb: 'One of you swings the club. The other curls up and IS the ball!',
  loop: 6, still: 2.2,
  draw(v, t) {
    const gy = 150, green = 128, cupX = 268, ctx = v.ctx;
    v.sky(); v.sun(); v.clouds(24); v.hills(gy - 30);
    v.water(96, 156, 112, 30, t * Math.PI * 2 / 6 * 3);
    v.ground(gy, 0, 96);
    v.block(140, 90, 18, 100);
    v.block(208, green, 112, 60);
    const ballX0 = 64, ballY0 = gy - 10;
    pw3Cup(v, cupX, green, pw3Sunk(v, t, 6, 3.72), t / 2);
    {
      const sw = pw3Swing(v, t, 0.75, 1.6, 0.9);
      pw3Golfer(v, 0, 34, gy, t, 6, 3.72, t > 0.75 && t < 1.6 ? 'grit' : t > 1.6 ? 'wow' : 'happy', sw, ballX0, ballY0, 9);
      if (t > 0.75 && t < 1.62) pw3Meter(v, 8, gy - 52, sw.p);
    }
    pw3Fade(v, t, 6, 0.5, tt => {
      const done = tt > 3.72;
      // the ball: on the tee, over the wall and the pond, onto the green and into the cup
      const fk = v.seg(tt, 1.72, 3.3);
      let bx = ballX0, by = ballY0, spin = 0, show = tt > 0.55 && !done;
      if (tt > 1.72) {
        bx = v.lerp(ballX0, 246, fk); by = v.lerp(ballY0, green - 10, fk) - 4 * 86 * fk * (1 - fk); spin = fk * 14;
        if (tt > 3.3) { const rk = v.ease.out(v.seg(tt, 3.3, 3.6)); bx = v.lerp(246, cupX, rk); spin = 14 + rk * 3; by = green - 10 + v.seg(tt, 3.6, 3.72) * 14; }
      }
      // Bo: hops on, curls up, flies, pops out of the cup
      if (tt < 0.6) pw3Curl(v, 1, tt, 92, ballX0, gy, 0.05);
      if (show) {
        const fly = tt > 1.72 && tt < 3.3;
        pw3Boost(v, bx, by, v.seg(tt, 2.35, 2.95), v.c.bo, 1);
        pw3Ball(v, 1, bx, by, { spin, lx: fly ? 1.6 : 1.2, ly: fly ? (fk < 0.5 ? -1 : 1.2) : 0 });
        if (tt > 1.85 && tt < 2.32) v.bubble('Wheee!', bx, by - 14, { size: 11 });
      }
      if (done) {
        const pk = v.seg(tt, 3.85, 4.15);
        pw3Pop(v, 1, cupX - 2, green + (pk >= 1 ? v.hop(v.phase(tt - 4.15, 0.55), 7) : 0), pk, { face: -1, mood: 'joy' });
        v.sparkle(cupX, green - 8, v.seg(tt, 3.72, 4.1), '#fff', 10);
        v.confetti(cupX, green - 20, v.seg(tt, 3.75, 5.4));
        pw3Pop2(v, 'IN!', cupX - 46, green - 40, v.seg(tt, 3.8, 5.3), 20, v.c.gold);
      }
    });
  },
});

// 3-2: Bo putts Pip through the tunnel onto the pink pads: boing, boing, BOING up onto the high green
definePreview('Bounce House', {
  blurb: 'Roll the ball onto the pink pads and boing up to the hole!',
  loop: 6, still: 2.85,
  draw(v, t) {
    const gy = 156, green = 80, cupX = 276, pads = [118, 150, 182], hits = [2.0, 2.35, 2.75];
    v.sky(); v.sun(); v.clouds(24); v.hills(gy - 40);
    v.ground(gy, 0, 214);
    v.block(0, -4, 104, 112, false);
    v.block(214, green, 106, 110);
    const ballX0 = 62, ballY0 = gy - 10;
    pads.forEach((x, i) => pw3Pad(v, x, gy, t > hits[i] ? 1 - v.seg(t, hits[i] + 0.05, hits[i] + 0.3) : 0));
    pw3Cup(v, cupX, green, pw3Sunk(v, t, 6, 3.82), t / 2);
    {
      const sw = pw3Swing(v, t, 0.75, 1.5, 0.55);
      pw3Golfer(v, 1, 34, gy, t, 6, 3.82, t > 0.75 && t < 1.5 ? 'grit' : t > 1.5 ? 'wow' : 'happy', sw, ballX0, ballY0, 8);
      if (t > 0.75 && t < 1.52) pw3Meter(v, 8, gy - 44, sw.p);
    }
    pw3Fade(v, t, 6, 0.5, tt => {
      const done = tt > 3.82;
      // the ball's trip: roll, three bounces, a roll on the green, into the cup
      let bx = ballX0, by = ballY0, spin = 0, lift = 0;
      if (tt > 1.55) {
        if (tt < hits[0]) { const k = v.seg(tt, 1.55, hits[0]); bx = v.lerp(ballX0, pads[0], k); by = ballY0 - 10 * v.ease.in(v.seg(k, 0.75, 1)); spin = k * 6; }
        else if (tt < hits[1]) { const k = v.seg(tt, hits[0], hits[1]); bx = v.lerp(pads[0], pads[1], k); by = gy - 20 + v.hop(k, 40); spin = 6 + k * 3; lift = 1; }
        else if (tt < hits[2]) { const k = v.seg(tt, hits[1], hits[2]); bx = v.lerp(pads[1], pads[2], k); by = gy - 20 + v.hop(k, 50); spin = 9 + k * 3; lift = 1; }
        else if (tt < 3.4) { const k = v.seg(tt, hits[2], 3.4); bx = v.lerp(pads[2], 244, k); by = v.lerp(gy - 20, green - 10, k) - 240 * k * (1 - k); spin = 12 + k * 6; lift = 1; }
        else { const k = v.ease.out(v.seg(tt, 3.4, 3.7)); bx = v.lerp(244, cupX, k); by = green - 10 + v.seg(tt, 3.7, 3.82) * 14; spin = 18 + k * 3; }
      }
      // Pip curls up on the tee, then rides the pads
      if (tt < 0.6) pw3Curl(v, 0, tt, 90, ballX0, gy, 0.05);
      if (tt > 0.55 && !done) pw3Ball(v, 0, bx, by, { spin, lx: 1.6, ly: lift ? -1.4 : 0 });
      hits.forEach((h, i) => pw3Pop2(v, 'BOING!', pads[i], gy + 12, v.seg(tt, h, h + 0.45), 13, '#ff8fc7', 0));
      if (done) {
        const pk = v.seg(tt, 3.95, 4.25);
        pw3Pop(v, 0, cupX - 2, green + (pk >= 1 ? v.hop(v.phase(tt - 4.25, 0.55), 7) : 0), pk, { face: -1, mood: 'joy' });
        v.sparkle(cupX, green - 8, v.seg(tt, 3.82, 4.2), '#fff', 10);
        v.confetti(cupX, green - 20, v.seg(tt, 3.85, 5.4));
        pw3Pop2(v, 'IN!', cupX - 46, green - 34, v.seg(tt, 3.9, 5.4), 20, v.c.gold);
      }
    });
  },
});

// 3-3: the sails bat Bo back (bonk!), Pip waits for the gap, then sends him straight through to the cup
definePreview('Windmill Way', {
  blurb: 'Wait for a gap in the spinning windmill sails, then swing!',
  loop: 7, still: 4.42,
  draw(v, t) {
    const gy = 156, cupX = 286, hubX = 166, hubY = 96, w = Math.PI * 2 / 7, ctx = v.ctx;
    // one sail points straight down at t = 1.0 (the bonk) and the sails leave a gap at the bottom at t = 4.5
    const ang = Math.PI / 2 + Math.PI / 3 + w * (t - 4.5);
    v.sky(); v.sun(); v.clouds(24); v.hills(gy - 36);
    v.ground(gy);
    v.block(hubX - 15, hubY + 8, 30, 14);
    // the mill turns all the time (one full turn per loop), lit up when it bats the ball
    pw3Mill(v, hubX, hubY, ang, 3, 54, 6, t > 1.25 && t < 1.5);
    const ballX0 = 60, ballY0 = gy - 10;
    pw3Cup(v, cupX, gy, pw3Sunk(v, t, 7, 5.02), t / 1.75);
    {
      const s1 = pw3Swing(v, t, 0.2, 0.85, 0.6), s2 = pw3Swing(v, t, 3.15, 4.2, 0.75), sw = t < 3.15 ? s1 : s2;
      const mood = (t > 0.2 && t < 0.85) || (t > 3.15 && t < 4.2) ? 'grit' : (t > 1.25 && t < 2.6) || t > 4.2 ? 'wow' : 'happy';
      pw3Golfer(v, 0, 34, gy, t, 7, 5.02, mood, sw, ballX0, ballY0, 9);
      if ((t > 0.2 && t < 0.87) || (t > 3.15 && t < 4.22)) pw3Meter(v, 8, gy - 52, sw.p);
      if (t > 2.4 && t < 3.3) v.bubble('Wait...', 34, gy - 34, { size: 11 });
      if (t > 3.9 && t < 4.5) v.bubble('Now!', 34, gy - 34, { size: 11 });
    }
    pw3Fade(v, t, 7, 0.5, tt => {
      const done = tt > 5.02;
      // the ball: a roll into the sails, batted back to the tee, then a fast roll through the gap
      let bx = ballX0, by = ballY0, spin = 0, dizzy = false;
      if (tt > 0.95 && tt < 1.25) { const k = v.seg(tt, 0.95, 1.25); bx = v.lerp(ballX0, 142, k); spin = k * 8; }
      else if (tt >= 1.25 && tt < 2.1) { const k = v.seg(tt, 1.25, 2.1); bx = v.lerp(142, ballX0, v.ease.out(k)); by = ballY0 + v.hop(k, 22); spin = 8 - v.ease.out(k) * 8; dizzy = tt < 2.7; }
      else if (tt >= 2.1 && tt < 2.7) dizzy = true;
      else if (tt >= 4.23) {
        if (tt < 4.6) { const k = v.seg(tt, 4.23, 4.6); bx = v.lerp(ballX0, 230, k); spin = k * 16; }
        else { const k = v.ease.out(v.seg(tt, 4.6, 4.9)); bx = v.lerp(230, cupX, k); spin = 16 + k * 5; by = ballY0 + v.seg(tt, 4.9, 5.02) * 14; }
      }
      if (!done) pw3Ball(v, 1, bx, by, { spin, dizzy, lx: tt > 4.2 ? 1.8 : 1.2 });
      pw3Pop2(v, 'BONK!', 150, 116, v.seg(tt, 1.25, 1.9), 15, '#ffb36b');
      if (done) {
        const pk = v.seg(tt, 5.15, 5.45);
        pw3Pop(v, 1, cupX - 2, gy + (pk >= 1 ? v.hop(v.phase(tt - 5.45, 0.55), 7) : 0), pk, { face: -1, mood: 'joy' });
        v.sparkle(cupX, gy - 8, v.seg(tt, 5.02, 5.4), '#fff', 10);
        v.confetti(cupX, gy - 20, v.seg(tt, 5.05, 6.5));
        pw3Pop2(v, 'IN!', cupX - 6, gy - 64, v.seg(tt, 5.1, 6.5), 20, v.c.gold);
      }
    });
  },
});

// 3-4: Bo putts Pip into the purple portal down in the tunnel; Pip zips out of the other one up high and lands on the green
definePreview('Portal Park', {
  blurb: 'Putt into a magic portal and zoom out of the other one!',
  loop: 6.5, still: 2.3,
  draw(v, t) {
    const gy = 170, slab = 118, green = 92, cupX = 262, inX = 298, inY = 150, outX = 52, outY = 52, ctx = v.ctx;
    const purple = '#b48cff', ph = t / 6.5 * Math.PI * 2 * 4;
    v.sky(); v.sun(v.W - 40, 30, 14); v.clouds(24); v.hills(slab - 18);
    v.block(0, slab, v.W, 20);
    v.block(196, green, 124, 30);
    ctx.fillStyle = v.c.stoneEdge; ctx.fillRect(0, slab + 20, v.W, gy - slab - 20);
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; for (let x = 8; x < v.W; x += 40) ctx.fillRect(x, slab + 26, 24, 26);
    v.ground(gy);
    const ballX0 = 58, ballY0 = gy - 10;
    pw3Portal(v, inX, inY, purple, ph, 1 - v.seg(Math.abs(t - 2.1), 0, 0.25));
    pw3Portal(v, outX, outY, purple, -ph, 1 - v.seg(Math.abs(t - 2.15), 0, 0.25));
    pw3Cup(v, cupX, green, pw3Sunk(v, t, 6.5, 3.47), t / 1.625);
    {
      const sw = pw3Swing(v, t, 0.65, 1.3, 0.7);
      pw3Golfer(v, 1, 32, gy, t, 6.5, 3.47, t > 0.65 && t < 1.3 ? 'grit' : t > 1.3 ? 'wow' : 'happy', sw, ballX0, ballY0, 6);
      if (t > 0.65 && t < 1.32) pw3Meter(v, 5, gy - 40, sw.p);
    }
    pw3Fade(v, t, 6.5, 0.5, tt => {
      const done = tt > 3.47;
      // the ball: a fast putt into the low portal, out of the high one at the same speed, onto the green
      let bx = ballX0, by = ballY0, spin = 0, show = tt > 0.55 && !done, lines = 0;
      if (tt > 1.38 && tt < 2.1) { const k = v.seg(tt, 1.38, 2.1); bx = v.lerp(ballX0, inX, k); spin = k * 20; lines = k > 0.15 ? 1 : 0; }
      else if (tt >= 2.1 && tt < 2.15) show = false;
      else if (tt >= 2.15 && tt < 3.1) { const k = v.seg(tt, 2.15, 3.1); bx = v.lerp(outX, 236, k); by = v.lerp(outY, green - 10, k) - 60 * k * (1 - k); spin = 20 + k * 12; lines = k > 0.08 && k < 0.45 ? 1 : 0; }
      else if (tt >= 3.1) { const k = v.ease.out(v.seg(tt, 3.1, 3.35)); bx = v.lerp(236, cupX, k); by = green - 10 + v.seg(tt, 3.35, 3.47) * 14; spin = 32 + k * 3; }
      if (show && lines) for (let q = 0; q < 3; q++) v.line(bx - 16 - q * 2, by - 5 + q * 5, bx - 30 - q * 6, by - 5 + q * 5, 'rgba(255,255,255,0.85)', 2);
      // Pip curls up on the tee, zooms through, pops out of the cup
      if (tt < 0.6) pw3Curl(v, 0, tt, 84, ballX0, gy, 0.05);
      if (show) {
        pw3Boost(v, bx, by, v.seg(tt, 2.55, 3.0), v.c.pip, 1);
        pw3Ball(v, 0, bx, by, { spin, lx: tt > 1.3 ? 1.8 : 1.2 });
      }
      pw3Pop2(v, 'ZAP!', inX - 26, inY - 26, v.seg(tt, 2.05, 2.6), 14, purple);
      pw3Pop2(v, 'ZAP!', outX + 4, outY - 28, v.seg(tt, 2.15, 2.7), 14, purple);
      if (done) {
        const pk = v.seg(tt, 3.6, 3.9);
        pw3Pop(v, 0, cupX - 2, green + (pk >= 1 ? v.hop(v.phase(tt - 3.9, 0.55), 7) : 0), pk, { face: -1, mood: 'joy' });
        v.sparkle(cupX, green - 8, v.seg(tt, 3.47, 3.85), '#fff', 10);
        v.confetti(cupX, green - 20, v.seg(tt, 3.5, 5.2));
        pw3Pop2(v, 'IN!', cupX - 40, green - 30, v.seg(tt, 3.55, 5.5), 20, v.c.gold);
      }
    });
  },
});
