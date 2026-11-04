/* Pip & Bo - Level previews for World 7 (see js/previews/preview-core.js for how to write one). */
'use strict';

/* the game's castle props (js/levels/world7/cannon-crew.js), drawn at preview size */
// a keg of powder centred on (x, y)
function pw7Keg(v, x, y, s = 1) {
  const ctx = v.ctx;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#9a6232'; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.5; v.rr(-8, -9, 16, 18, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(-5, -7, 3, 14);
  ctx.fillStyle = '#2a2f4f'; ctx.fillRect(-8, -5, 16, 3); ctx.fillRect(-8, 2, 16, 3);
  v.fillCircle(0, -10, 2.4, v.c.gold);
  ctx.restore();
}
// an iron cannonball centred on (x, y)
function pw7Ball(v, x, y, r = 8) {
  const ctx = v.ctx;
  ctx.fillStyle = '#3c4260'; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.5; v.circle(x, y, r); ctx.fill(); ctx.stroke();
  v.fillCircle(x - r * 0.35, y - r * 0.35, r * 0.3, 'rgba(255,255,255,0.32)');
}
// a wooden castle cube (top left at x, y)
function pw7Cube(v, x, y, sz) {
  const ctx = v.ctx;
  ctx.fillStyle = '#d9a066'; ctx.fillRect(x, y, sz, sz);
  ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(x, y, sz, 3);
  ctx.fillStyle = 'rgba(28,26,54,0.22)'; ctx.fillRect(x, y + sz - 3, sz, 3);
  ctx.strokeStyle = 'rgba(28,26,54,0.2)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let q = 1; q < 3; q++) { ctx.moveTo(x + 3, y + sz * q / 3); ctx.lineTo(x + sz - 3, y + sz * q / 3 + 1); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(28,26,54,0.6)'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.75, y + 0.75, sz - 1.5, sz - 1.5);
}
// a pointed roof on top of a cube (base from x to x + w at y); pw7Flag is the gold flag on its tip
function pw7Roof(v, x, y, w, h, col) {
  const ctx = v.ctx;
  ctx.fillStyle = col; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x + w / 2, y - h); ctx.lineTo(x + w + 3, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.moveTo(x + 2, y - 2); ctx.lineTo(x + w / 2 - 1, y - h + 5); ctx.lineTo(x + w / 2 + 1, y - h + 9); ctx.lineTo(x + 7, y - 2); ctx.closePath(); ctx.fill();
}
function pw7Flag(v, x, y, t, pole = 26) {
  const ctx = v.ctx, top = y - pole, wave = Math.sin(t * 6 + x) * 2;
  ctx.fillStyle = '#e9e4f5'; ctx.strokeStyle = 'rgba(28,26,54,0.5)'; ctx.lineWidth = 1;
  ctx.fillRect(x - 1.5, top, 3, pole); ctx.strokeRect(x - 1.5, top, 3, pole);
  v.fillCircle(x, top - 1, 2.5, v.c.gold);
  ctx.fillStyle = v.c.gold; ctx.beginPath(); ctx.moveTo(x + 1.5, top + 1);
  ctx.quadraticCurveTo(x + 11, top + 4 + wave * 0.5, x + 20, top + 7 + wave); ctx.quadraticCurveTo(x + 11, top + 10 + wave * 0.5, x + 1.5, top + 13);
  ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(28,26,54,0.45)'; ctx.stroke();
}

// 7-1: Pip brings powder and a ball to the cannon and shouts FIRE, Bo aims and fires, the tower tips and its flag falls
definePreview('Cannon Crew', {
  blurb: 'One brings powder and balls, the other aims the cannon. Knock the flags down!',
  loop: 6.5, still: 3.36,
  draw(v, t) {
    const ctx = v.ctx, gy = 150, k = t / 6.5, top = 112, cx = 136, sz = 22, tx = 251;
    v.sky(); v.sun(40, 30, 14); v.clouds(t); v.hills(gy - 30);
    // the yard, the moat, the castle's island
    ctx.fillStyle = v.c.stoneEdge; ctx.fillRect(164, gy, 52, 40);
    v.water(164, gy + 8, 52, 30, t);
    v.ground(gy, -2, 166); v.ground(gy, 214, 108);
    for (const [x, y] of [[18, -9], [40, -9], [29, -27]]) pw7Keg(v, x, gy + y);
    for (const [x, y] of [[54, -8], [70, -8], [62, -22]]) pw7Ball(v, x, gy + y, 7.5);
    // the gunner's stone platform with battlements
    v.block(68, top, 94, gy - top + 2, false);
    ctx.fillStyle = v.c.stoneLight; ctx.fillRect(68, top, 94, 3);
    // Pip: picks up powder and a ball, hops up past Bo, drops them in, then hops back down to the yard
    let pipX = 34, pipY = gy, pipFace = 1;
    const walk1 = v.ease.inOut(v.seg(k, 0.1, 0.17)), jump1 = v.seg(k, 0.17, 0.27), jump2 = v.seg(k, 0.86, 0.93), walk2 = v.ease.inOut(v.seg(k, 0.93, 0.99));
    if (k > 0.1) pipX = v.lerp(34, 52, walk1);
    if (k > 0.17) { pipX = v.lerp(52, 108, v.ease.out(jump1)); pipY = v.lerp(gy, top, jump1) + v.hop(jump1, 46); }
    if (k > 0.86) { pipX = v.lerp(108, 54, jump2); pipY = v.lerp(top, gy, jump2) + v.hop(jump2, 48); pipFace = -1; }
    if (k > 0.93) { pipX = v.lerp(54, 34, walk2); pipY = gy + (walk2 < 1 ? v.hop(v.phase(t, 0.36), 3) : 0); }
    if (k > 0.99) pipFace = 1;
    if (k > 0.1 && k < 0.17) pipY += v.hop(v.phase(t, 0.36), 4);
    // the cannon: aims from 20 to 42 degrees, kicks back when it fires, and settles again for the next shot
    const ang = (20 + 22 * v.ease.inOut(v.seg(k, 0.34, 0.46)) - 22 * v.ease.inOut(v.seg(k, 0.88, 0.98))) * Math.PI / 180;
    const fireK = v.seg(k, 0.48, 0.56), kick = fireK > 0 && fireK < 1 ? Math.sin(fireK * Math.PI) * 6 : 0;
    const py = top - 18, mx = cx + Math.cos(ang) * 36, my = py - Math.sin(ang) * 36;
    const kegIn = k > 0.31 && k < 0.48, ballIn = k > 0.35 && k < 0.48;
    // the hopper on the breech with its two lights (powder, ball)
    const hx = cx - 12, hy = py - 14;
    ctx.save(); ctx.translate(cx, py); ctx.rotate(-ang); ctx.translate(-kick, 0);
    ctx.fillStyle = '#3c4260'; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 2;
    v.rr(-16, -9, 50, 18, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a2f4f'; v.rr(28, -11, 9, 22, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; v.rr(-12, -7, 40, 4, 2); ctx.fill();
    ctx.fillStyle = v.c.gold; ctx.fillRect(4, -9, 3, 18);
    ctx.restore();
    ctx.fillStyle = '#8a5833'; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 22, top - 4); ctx.lineTo(cx - 6, py - 6); ctx.lineTo(cx + 8, py - 2); ctx.lineTo(cx + 18, top - 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (const wx of [cx - 12, cx + 10]) { ctx.fillStyle = '#c98b5a'; v.circle(wx, top - 8, 8); ctx.fill(); ctx.stroke(); v.fillCircle(wx, top - 8, 2.5, v.c.ink); }
    ctx.fillStyle = kegIn && ballIn ? v.c.gold : '#c98b5a';
    ctx.beginPath(); ctx.moveTo(hx - 12, hy - 12); ctx.lineTo(hx + 12, hy - 12); ctx.lineTo(hx + 4, hy); ctx.lineTo(hx - 4, hy); ctx.closePath(); ctx.fill(); ctx.stroke();
    [kegIn, ballIn].forEach((lit, q) => { v.circle(hx - 7 + q * 14, hy - 21, 4.5); ctx.fillStyle = lit ? v.c.gold : 'rgba(28,26,54,0.3)'; ctx.fill(); ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.2; ctx.stroke(); });
    // a curved arrow at the muzzle and aim dots while Bo turns the dial
    const turnA = v.seg(k, 0.33, 0.36) * (1 - v.seg(k, 0.45, 0.48));
    if (turnA > 0) {
      ctx.save(); ctx.globalAlpha = turnA; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, py, 50, -0.25, -0.9, true); ctx.stroke();
      const ax = cx + Math.cos(-0.95) * 50, ay = py + Math.sin(-0.95) * 50;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(ax - 6, ay - 3); ctx.lineTo(ax + 4, ay - 4); ctx.lineTo(ax + 1, ay + 6); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    const aimA = v.seg(k, 0.36, 0.4) * (1 - v.seg(k, 0.47, 0.49));
    if (aimA > 0) {
      ctx.save(); ctx.globalAlpha = aimA;
      for (let q = 1; q <= 5; q++) { const u = q * 0.14; v.fillCircle(v.lerp(mx, tx, u), v.lerp(my, 117, u) + v.hop(u, 46), 2.2, '#fff'); }
      ctx.restore();
    }
    // the castle: a base cube, the middle cube the ball breaks, and a top cube with a roof and the flag, which tips over
    const hit = k > 0.6, rebuild = v.ease.out(v.seg(k, 0.9, 1));
    pw7Cube(v, tx - 22, gy - sz, sz); pw7Cube(v, tx - 22, gy - 2 * sz, sz);
    pw7Roof(v, tx - 22, gy - 2 * sz, sz, 14, '#5b95ff');
    pw7Cube(v, tx, gy - sz, sz);
    const drawTop = (fall, tip, alpha, flag) => {
      ctx.save(); ctx.globalAlpha *= alpha;
      ctx.translate(tx + sz, gy - 2 * sz + fall); ctx.rotate(tip); ctx.translate(-(tx + sz), -(gy - 2 * sz));
      pw7Cube(v, tx, gy - 3 * sz, sz); pw7Roof(v, tx, gy - 3 * sz, sz, 18, '#ff6b6b');
      if (flag) pw7Flag(v, tx + sz / 2, gy - 3 * sz - 18, t);
      ctx.restore();
    };
    if (!hit) { pw7Cube(v, tx, gy - 2 * sz, sz); drawTop(0, 0, 1, true); }
    else {
      const fall = v.ease.in(v.seg(k, 0.6, 0.65)) * sz + v.ease.in(v.seg(k, 0.71, 0.75)) * sz, roll = v.ease.in(v.seg(k, 0.75, 0.84));
      const tip = v.ease.in(v.seg(k, 0.64, 0.71)) * Math.PI / 2;
      // it lands on its side, then skids off the island to the right
      if (roll < 1) { ctx.save(); ctx.translate(roll * 80, v.hop(roll, 8)); drawTop(fall, tip, 1, k < 0.66); ctx.restore(); }
      if (k > 0.9) { ctx.save(); ctx.translate(0, -150 * (1 - rebuild)); pw7Cube(v, tx, gy - 2 * sz, sz); drawTop(0, 0, 1, true); ctx.restore(); }
      // the flag falls off and fades, like in the game
      const fk = v.seg(k, 0.66, 0.84);
      if (fk > 0 && fk < 1) {
        ctx.save(); ctx.globalAlpha = 1 - v.seg(fk, 0.5, 1);
        ctx.translate(v.lerp(tx + sz / 2 + 3, tx + sz + 34, fk), v.lerp(gy - 3 * sz - 18 + sz, gy - 4, v.ease.in(fk))); ctx.rotate(0.13 + fk * 1.7);
        pw7Flag(v, 0, 0, t); ctx.restore();
      }
      // splinters from the broken cube
      const sk = v.seg(k, 0.6, 0.75);
      if (sk > 0 && sk < 1) {
        ctx.save(); ctx.globalAlpha = 1 - sk; ctx.fillStyle = '#d9a066'; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1;
        for (let q = 0; q < 5; q++) {
          const a = -2.6 + q * 0.55, sp = 30 + v.rand(q + 3) * 20;
          ctx.save(); ctx.translate(tx + sz / 2 + Math.cos(a) * sp * sk, gy - 1.5 * sz + Math.sin(a) * sp * sk + 60 * sk * sk); ctx.rotate(q + sk * 8);
          ctx.fillRect(-4, -2, 8, 4); ctx.strokeRect(-4, -2, 8, 4); ctx.restore();
        }
        ctx.restore();
      }
      v.puff(tx + sz / 2, gy - 1.5 * sz + 6, v.seg(k, 0.6, 0.72));
    }
    // the shot
    const fly = v.seg(k, 0.49, 0.6);
    if (fly > 0 && fly < 1) pw7Ball(v, v.lerp(mx, tx + 2, fly), v.lerp(my, 117, fly) + v.hop(fly, 46), 7.5);
    v.puff(mx + 6, my - 2, v.seg(k, 0.48, 0.6), 'rgba(255,255,255,0.95)');
    if (k > 0.48 && k < 0.58) v.label('BOOM!', mx + 26, my - 30, 16, v.c.gold);
    // Bo the gunner and Pip the loader
    const happy = k > 0.67 && k < 0.88, cheer = happy ? v.hop(v.phase(t, 0.5), 8) : 0;
    v.hero(1, 82, top + (happy ? v.hop(v.phase(t, 0.5, 0.25), 8) : 0), { face: 1, mood: happy ? 'joy' : k > 0.34 && k < 0.6 ? 'grit' : 'happy' });
    const flying = (k > 0.17 && k < 0.27) || (k > 0.86 && k < 0.93);
    v.hero(0, pipX, pipY + (k > 0.27 && k < 0.86 ? cheer : 0), { face: k > 0.27 && k < 0.36 ? 1 : pipFace, shadow: !flying, mood: happy ? 'joy' : flying ? 'grit' : 'happy' });
    // what Pip carries: the keg and the ball over the head, then tossed into the hopper
    const keg = v.seg(k, 0.03, 0.06), ball = v.seg(k, 0.06, 0.09), kegT = v.seg(k, 0.28, 0.31), ballT = v.seg(k, 0.32, 0.35);
    if (keg > 0 && kegT < 1) {
      const ux = kegT > 0 ? v.lerp(pipX - 6, hx, kegT) : pipX - 6, uy = kegT > 0 ? v.lerp(pipY - 34, hy - 8, kegT) + v.hop(kegT, 14) : pipY - 34 - (1 - keg) * -10;
      pw7Keg(v, ux, uy, 0.8);
    }
    if (ball > 0 && ballT < 1) {
      const ux = ballT > 0 ? v.lerp(pipX + 7, hx, ballT) : pipX + 7, uy = ballT > 0 ? v.lerp(pipY - 32, hy - 8, ballT) + v.hop(ballT, 14) : pipY - 32 - (1 - ball) * -10;
      pw7Ball(v, ux, uy, 6);
    }
    v.sparkle(hx, hy - 10, v.seg(k, 0.35, 0.45), v.c.gold, 10);
    if (k > 0.38 && k < 0.5) v.bubble('FIRE!', pipX, top - 32, { size: 11 });
    // a star for the fallen flag
    const starK = v.ease.back(v.seg(k, 0.7, 0.76)) * (1 - v.seg(k, 0.86, 0.9));
    v.star(tx + 30, 52 - v.seg(k, 0.7, 0.9) * 6, 10 * starK);
    v.confetti(tx + 30, gy - 50, v.seg(k, 0.7, 0.92));
  },
});

// a castle bell hanging from the ceiling at x down to y (its rim); ring 0..1 turns it gold, swing tilts it
function pw7Bell(v, x, y, ring, swing) {
  const ctx = v.ctx, top = y - 24;
  v.line(x, -2, x, top, v.c.ropeDark, 3.5);
  ctx.save(); ctx.translate(x, top); ctx.rotate(swing);
  if (ring > 0) { ctx.globalAlpha = 0.35 * ring; v.fillCircle(0, 12, 22, v.c.gold); ctx.globalAlpha = 1; }
  for (const [body, dark, a] of [['#b98a2a', '#6d4f18', 1], [v.c.gold, v.c.goldDark, ring]]) {
    if (a <= 0) continue;
    ctx.save(); ctx.globalAlpha *= a;
    v.fillCircle(0, 1, 3.6, dark);
    ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-6.5, 2); ctx.quadraticCurveTo(-11, 4, -11, 13); ctx.lineTo(-13.5, 21); ctx.quadraticCurveTo(0, 25.5, 13.5, 21); ctx.lineTo(11, 13); ctx.quadraticCurveTo(11, 4, 6.5, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-5.5, 3.5); ctx.quadraticCurveTo(-9.5, 5, -9.5, 13); ctx.lineTo(-11.5, 20); ctx.quadraticCurveTo(0, 23.5, 11.5, 20); ctx.lineTo(9.5, 13); ctx.quadraticCurveTo(9.5, 5, 5.5, 3.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-6, 7, 2.5, 11);
    ctx.restore();
  }
  v.fillCircle(Math.sin(swing * 3) * 3, 22.5, 3, '#3a2c10');
  ctx.restore();
}
// a hanging banner with Pip's sprout (id 0) or Bo's ears (id 1), like the game's castle rooms
function pw7Banner(v, x, y, len, id) {
  const ctx = v.ctx, col = id ? v.c.bo : v.c.pip, dark = id ? v.c.boDark : v.c.pipDark, w = 26;
  ctx.fillStyle = '#5a4630'; ctx.fillRect(x - w / 2 - 5, y, w + 10, 4);
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(x - w / 2, y + 4); ctx.lineTo(x + w / 2, y + 4); ctx.lineTo(x + w / 2, y + len); ctx.lineTo(x, y + len - 9); ctx.lineTo(x - w / 2, y + len); ctx.closePath(); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - w / 2 + 3, y + 4); ctx.lineTo(x + w / 2 - 3, y + 4); ctx.lineTo(x + w / 2 - 3, y + len - 5); ctx.lineTo(x, y + len - 13); ctx.lineTo(x - w / 2 + 3, y + len - 5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = v.c.gold; ctx.fillRect(x - w / 2 + 3, y + 9, w - 6, 3);
  const ey = y + len * 0.5;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  if (id === 0) { ctx.beginPath(); ctx.ellipse(x + 3, ey - 3, 6, 3, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - 1, ey - 2, 2, 9); }
  else { v.circle(x, ey + 2, 6); ctx.fill(); v.circle(x - 6, ey - 4, 3.2); ctx.fill(); v.circle(x + 6, ey - 4, 3.2); ctx.fill(); }
}

// 7-2: Pip drops onto the high end and Bo flies up to ring a bell; then Bo drops and Pip flies up to the other one
definePreview('Seesaw Climb', {
  blurb: 'Jump on the high end of the seesaw to fling your partner up the tower!',
  loop: 6, still: 1.75,
  draw(v, t) {
    const ctx = v.ctx, k = t / 6, gy = 166, cx = 160, py = 146, half = 72, rise = 18, ledge = 62;
    v.c.grass = '#9790ad'; v.c.grassDark = '#57516d';   // the castle rooms' stone floor caps
    // the castle hall: brick wall, a tall window, Pip's and Bo's banners
    ctx.fillStyle = '#9d97b6'; ctx.fillRect(0, 0, v.W, v.H);
    ctx.fillStyle = 'rgba(60,52,90,0.16)';
    for (let y = 0; y < gy; y += 16) { ctx.fillRect(0, y, v.W, 2); for (let x = (y / 16) % 2 ? 0 : 16; x < v.W; x += 32) ctx.fillRect(x, y, 2, 16); }
    const wx = 136, wy = 20, ww = 48, wh = 74;
    const g = ctx.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, v.c.skyTop); g.addColorStop(1, v.c.skyBot);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(wx, wy + wh); ctx.lineTo(wx, wy + ww / 2); ctx.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(wx + ww, wy + wh); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5e5878'; ctx.lineWidth = 5; ctx.stroke();
    v.line(wx + ww / 2, wy + 2, wx + ww / 2, wy + wh, 'rgba(46,40,70,0.7)', 2); v.line(wx, wy + wh * 0.55, wx + ww, wy + wh * 0.55, 'rgba(46,40,70,0.7)', 2);
    ctx.fillStyle = '#5e5878'; ctx.fillRect(wx - 7, wy + wh, ww + 14, 5);
    pw7Banner(v, 104, 0, 52, 0); pw7Banner(v, 216, 0, 52, 1);
    // the two towers and the pit floor
    v.block(-2, ledge, 64, v.H - ledge + 2); v.block(258, ledge, 64, v.H - ledge + 2); v.ground(gy, 60, 200);
    // the seesaw: it tips each time somebody lands on the high end
    const flip1 = v.ease.out(v.seg(k, 0.22, 0.25)), flip2 = v.ease.out(v.seg(k, 0.62, 0.65));
    const tilt = -1 + 2 * flip1 - 2 * flip2;
    const surf = x => py - 2 + ((x - cx) / half) * rise * tilt;
    ctx.fillStyle = '#34304a'; ctx.beginPath(); ctx.moveTo(cx - 15, gy + 1); ctx.lineTo(cx, py - 2); ctx.lineTo(cx + 15, gy + 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6e6a86'; ctx.beginPath(); ctx.moveTo(cx - 11, gy); ctx.lineTo(cx, py + 3); ctx.lineTo(cx + 11, gy); ctx.closePath(); ctx.fill();
    const ang = Math.atan2(rise * tilt, half), len = half / Math.cos(ang);
    ctx.save(); ctx.translate(cx, py); ctx.rotate(ang);
    for (const e of [-1, 1]) { const hx = e * (len - 22); ctx.fillStyle = '#34304a'; ctx.fillRect(hx - 2, -12, 4, 12); ctx.fillRect(hx - 6, -14, 12, 4); }
    ctx.fillStyle = v.c.plankDark; v.rr(-len - 1, -1.5, 2 * len + 2, 11, 4); ctx.fill();
    ctx.fillStyle = v.c.plank; ctx.fillRect(-len + 1, 0, 2 * len - 2, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-len + 6, 0.5, 2 * len - 12, 2);
    ctx.fillStyle = '#46425a'; ctx.fillRect(-len - 1, -2, 7, 12); ctx.fillRect(len - 6, -2, 7, 12);
    v.fillCircle(0, 4, 3.2, '#34304a'); v.fillCircle(0, 4, 1.4, '#b8b5c9');
    ctx.restore();
    // who is where: Bo sits on the left end, Pip waits on the right tower; then the other way round
    const lx = cx - 50, rx = cx + 50, drop1 = v.seg(k, 0.12, 0.22), fly1 = v.seg(k, 0.23, 0.4), drop2 = v.seg(k, 0.52, 0.62), fly2 = v.seg(k, 0.63, 0.8);
    let pipX = 286, pipY = ledge, boX = lx, boY = surf(lx);
    if (k > 0.12) { pipX = v.lerp(286, rx, drop1); pipY = v.lerp(ledge, surf(rx), drop1) + v.hop(drop1, 14); }
    if (k > 0.22) { pipX = rx; pipY = surf(rx); }
    if (k > 0.23) { boX = v.lerp(lx, 34, fly1); boY = v.lerp(surf(lx), ledge, fly1) + v.hop(fly1, 60); }
    if (k > 0.52) { boX = v.lerp(34, lx, drop2); boY = v.lerp(ledge, surf(lx), drop2) + v.hop(drop2, 14); }
    if (k > 0.62) { boX = lx; boY = surf(lx); }
    if (k > 0.63) { pipX = v.lerp(rx, 286, fly2); pipY = v.lerp(surf(rx), ledge, fly2) + v.hop(fly2, 60); }
    // the bells ring as each flyer passes them, and fade back for the next go
    const fade = 1 - v.seg(k, 0.9, 1), ringL = v.seg(k, 0.34, 0.37) * fade, ringR = v.seg(k, 0.74, 0.77) * fade;
    const sw = (a, b) => (k > a && k < b ? Math.sin((k - a) * 70) * 0.4 * (1 - v.seg(k, a, b)) : 0);
    pw7Bell(v, 62, 38, ringL, sw(0.35, 0.55)); pw7Bell(v, 258, 38, ringR, sw(0.75, 0.95));
    // speed lines under whoever is flying up
    for (const [on, x, y] of [[fly1 > 0 && fly1 < 0.45, boX, boY], [fly2 > 0 && fly2 < 0.45, pipX, pipY]]) {
      if (!on) continue;
      for (const dx of [-7, 0, 7]) v.line(x + dx, y + 6, x + dx, y + 22 - Math.abs(dx), 'rgba(255,255,255,0.8)', 2.5);
    }
    const happy = k > 0.8 && k < 0.96, bounce = q => (happy ? v.hop(v.phase(t, 0.5, q), 7) : 0);
    const flyB = fly1 > 0 && fly1 < 1, flyP = fly2 > 0 && fly2 < 1;
    v.hero(1, boX, boY + bounce(0), { face: k > 0.4 && k < 0.62 ? 1 : k > 0.23 && k < 0.4 ? -1 : 1, rot: tilt * 0.24 * (k < 0.23 || k > 0.62 ? 1 : 0), shadow: !flyB && !(drop2 > 0 && drop2 < 1),
      sq: k > 0.62 && k < 0.66 ? 0.3 : 0, mood: happy ? 'joy' : flyB ? 'wow' : drop2 > 0 && drop2 < 1 ? 'grit' : 'happy' });
    v.hero(0, pipX, pipY + bounce(0.25), { face: k > 0.22 && k < 0.63 ? -1 : k > 0.63 && k < 0.8 ? 1 : -1, rot: tilt * 0.24 * (k > 0.22 && k < 0.63 ? 1 : 0), shadow: !flyP && !(drop1 > 0 && drop1 < 1),
      sq: k > 0.22 && k < 0.26 ? 0.3 : 0, mood: happy ? 'joy' : flyP ? 'wow' : drop1 > 0 && drop1 < 1 ? 'grit' : 'happy' });
    if (k > 0.22 && k < 0.32) v.label('BOING!', rx, 86, 16, v.c.gold);
    if (k > 0.62 && k < 0.72) v.label('BOING!', lx, 86, 16, v.c.gold);
    if (k > 0.35 && k < 0.46) v.label('DING!', 94, 50, 13, '#fff');
    if (k > 0.75 && k < 0.86) v.label('DING!', 226, 50, 13, '#fff');
    if (k > 0.02 && k < 0.12) v.bubble('Jump!', boX, boY - 30);
    if (k > 0.42 && k < 0.52) v.bubble('Now you!', pipX, pipY - 30);
    v.star(cx, 112 - v.seg(k, 0.8, 1) * 6, 9 * v.ease.back(v.seg(k, 0.8, 0.85)) * (1 - v.seg(k, 0.94, 0.98)));
    v.confetti(cx, 120, v.seg(k, 0.8, 0.98));
  },
});

// 7-3: Bo shines the lantern from the window; the hidden lasers glow only in its light, and Pip jumps, ducks and grabs the gem
definePreview('Laser Vault', {
  blurb: 'One shines the lantern to find hidden lasers, the other sneaks past them!',
  loop: 7, still: 3.25,
  // where the lantern spot is at time t (0..7): it leads Pip from beam to beam, then back to the start
  spot(v, t) {
    const keys = [[0, 44, 132], [0.07, 112, 146], [0.3, 112, 146], [0.36, 210, 136], [0.56, 210, 136], [0.62, 286, 130], [0.9, 286, 130], [0.95, 170, 96], [1, 44, 132]];
    const k = (((t / 7) % 1) + 1) % 1;
    for (let q = 1; q < keys.length; q++) {
      const [k1, x1, y1] = keys[q], [k0, x0, y0] = keys[q - 1];
      if (k <= k1) { const u = v.ease.inOut(v.seg(k, k0, k1)); return [v.lerp(x0, x1, u), v.lerp(y0, y1, u)]; }
    }
    return [44, 132];
  },
  draw(v, t) {
    const ctx = v.ctx, k = t / 7, gy = 158, R = 36;
    Object.assign(v.c, { stone: '#4d4570', stoneLight: '#5d5484', stoneEdge: '#2e2849', grass: '#8b80b5', grassDark: '#5f558a' });
    // the vault's bricks and floor
    ctx.fillStyle = '#37305b'; ctx.fillRect(0, 0, v.W, v.H);
    ctx.fillStyle = 'rgba(20,16,44,0.35)';
    for (let y = 0; y < gy; y += 15) { ctx.fillRect(0, y + 13, v.W, 2); for (let x = (y / 15) % 2 ? 0 : 15; x < v.W; x += 30) ctx.fillRect(x, y, 2, 13); }
    v.ground(gy);
    // the gem on its stand, and the two hidden beams: a low one to jump, a high one to duck under
    const got = k > 0.64 && k < 0.95, gx = 282;
    ctx.fillStyle = '#5d5484'; v.rr(gx - 10, gy - 14, 20, 14, 3); ctx.fill(); ctx.fillStyle = '#8a82b0'; ctx.fillRect(gx - 13, gy - 17, 26, 4);
    const beams = [[96, 150, 128, 150], [176, 132, 244, 132]];
    v.line(176, 0, 176, 129, '#2b2744', 3); v.line(244, 0, 244, 129, '#2b2744', 3);
    ctx.fillStyle = '#2b2744'; for (const x of [96, 128]) ctx.fillRect(x - 2, 150, 4, gy - 150);
    // the dark, with a hole where the lantern shines
    const [sx, sy] = this.spot(v, t);
    const g = ctx.createRadialGradient(sx, sy, R * 0.55, sx, sy, R * 1.08);
    g.addColorStop(0, 'rgba(12,9,30,0)'); g.addColorStop(1, 'rgba(12,9,30,0.7)');
    ctx.fillStyle = 'rgba(12,9,30,0.7)'; ctx.beginPath(); ctx.rect(0, 0, v.W, v.H); ctx.rect(sx - R * 1.1, sy - R * 1.1, R * 2.2, R * 2.2); ctx.fill('evenodd');
    ctx.fillStyle = g; ctx.fillRect(sx - R * 1.1, sy - R * 1.1, R * 2.2, R * 2.2);
    // a beam glows while the light is on it, and a moment after
    const near = (b, x, y) => { const u = v.clamp((x - b[0]) / (b[2] - b[0]), 0, 1); return Math.hypot(x - v.lerp(b[0], b[2], u), y - v.lerp(b[1], b[3], u)); };
    for (const b of beams) {
      let glow = 0;
      for (let q = 0; q < 5 && t - q * 0.25 >= 0; q++) { const [px, py] = this.spot(v, t - q * 0.25); glow = Math.max(glow, (1 - q * 0.22) * v.clamp((R + 4 - near(b, px, py)) / 12, 0, 1)); }
      if (k > 0.9) glow *= 1 - v.seg(k, 0.9, 0.93);
      if (glow <= 0.01) continue;
      ctx.save(); ctx.globalAlpha = glow; ctx.lineCap = 'round';
      v.line(b[0], b[1], b[2], b[3], 'rgba(255,75,92,0.35)', 9); v.line(b[0], b[1], b[2], b[3], '#ff4b5c', 3); v.line(b[0], b[1], b[2], b[3], 'rgba(255,255,255,0.85)', 1);
      for (const [x, y] of [[b[0], b[1]], [b[2], b[3]]]) { ctx.fillStyle = '#2b2744'; v.rr(x - 5, y - 5, 10, 10, 3); ctx.fill(); v.fillCircle(x, y, 2.5, '#ff4b5c'); }
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(255,240,190,0.08)'; v.circle(sx, sy, R); ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,190,0.3)'; ctx.lineWidth = 2; ctx.stroke();
    // the lookout's lit window with Bo in goggles, and the lantern on its arm
    const bx = 160, x0 = bx - 40, y0 = 2, w = 80, h = 52;
    ctx.fillStyle = '#2e2849'; v.rr(x0 - 6, y0 - 4, w + 12, h + 8, 12); ctx.fill();
    const wg = ctx.createLinearGradient(0, y0, 0, y0 + h); wg.addColorStop(0, '#fff1c9'); wg.addColorStop(1, '#f2b866');
    ctx.fillStyle = wg; v.rr(x0, y0, w, h + 4, 16); ctx.fill();
    const lx = bx + 32, ly = y0 + h + 10, la = Math.atan2(sy - ly, sx - lx);
    ctx.fillStyle = 'rgba(255,236,170,0.07)'; ctx.beginPath(); ctx.moveTo(lx, ly);
    const d = Math.hypot(sx - lx, sy - ly), off = Math.asin(Math.min(1, R / d)), tl = Math.sqrt(Math.max(0, d * d - R * R));
    ctx.lineTo(lx + Math.cos(la - off) * tl, ly + Math.sin(la - off) * tl); ctx.arc(sx, sy, R, la - off - Math.PI / 2, la + off + Math.PI / 2); ctx.closePath(); ctx.fill();
    const boHappy = k > 0.66 && k < 0.9;
    v.hero(1, bx - 6, y0 + h + (boHappy ? v.hop(v.phase(t, 0.5, 0.25), 5) : 0), { face: sx > bx ? 1 : -1, shadow: false, mood: boHappy ? 'joy' : 'happy' });
    if (!boHappy) { ctx.fillStyle = '#2b2744'; ctx.fillRect(bx - 16, y0 + h - 18, 20, 5); const gl = sx > bx ? 1.5 : -1.5; v.fillCircle(bx - 11 + gl, y0 + h - 15.5, 3.4, '#9ff0ff'); v.fillCircle(bx - 1 + gl, y0 + h - 15.5, 3.4, '#9ff0ff'); }
    ctx.fillStyle = '#8a5833'; v.rr(x0 - 6, y0 + h, w + 12, 7, 3); ctx.fill(); ctx.fillStyle = '#c98b5a'; ctx.fillRect(x0 - 6, y0 + h, w + 12, 2.5);
    ctx.fillStyle = '#6b4630'; ctx.fillRect(lx - 2, y0 + h + 6, 4, 6);
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(la);
    ctx.fillStyle = '#8a5833'; v.rr(-8, -8, 14, 16, 4); ctx.fill();
    ctx.fillStyle = '#d9a640'; ctx.beginPath(); ctx.moveTo(5, -7); ctx.lineTo(14, -10); ctx.lineTo(14, 10); ctx.lineTo(5, 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff4d6'; ctx.fillRect(13, -9, 2.5, 18);
    ctx.restore();
    // Pip sneaks: walk, jump the low beam, duck under the high one, grab the gem
    const walk = (a, b) => (k > a && k < b ? v.hop(v.phase(t, 0.36), 3) : 0);
    const jump = v.seg(k, 0.18, 0.27), duck = k > 0.39 && k < 0.56;
    let pipX = v.lerp(24, 76, v.ease.inOut(v.seg(k, 0.05, 0.18))), pipY = gy + walk(0.05, 0.18);
    if (k > 0.18) { pipX = v.lerp(76, 146, jump); pipY = gy + v.hop(jump, 30); }
    if (k > 0.27) { pipX = v.lerp(146, 162, v.ease.inOut(v.seg(k, 0.27, 0.36))); pipY = gy + walk(0.27, 0.36); }
    if (k > 0.39) { pipX = v.lerp(162, 258, v.seg(k, 0.4, 0.55)); pipY = gy + (duck ? v.hop(v.phase(t, 0.3), 1.5) : 0); }
    if (k > 0.56) { pipX = v.lerp(258, 266, v.ease.inOut(v.seg(k, 0.56, 0.63))); pipY = gy + walk(0.56, 0.63); }
    const pipHappy = k > 0.64 && k < 0.9;
    if (pipHappy) pipY += v.hop(v.phase(t, 0.5), 8);
    const alpha = k < 0.9 ? 1 : k < 0.95 ? 1 - v.seg(k, 0.9, 0.95) : v.seg(k, 0.95, 1);
    if (k >= 0.95) { pipX = 24; pipY = gy; }
    v.hero(0, pipX, pipY, { face: 1, alpha, sq: duck ? 1.4 : 0, shadow: !(jump > 0 && jump < 1), mood: pipHappy ? 'joy' : duck || (jump > 0 && jump < 1) ? 'grit' : 'happy' });
    // the gem: on its stand, then held up high
    const gemX = got ? pipX : gx, gemY = got ? pipY - 40 : gy - 31 + Math.sin(t * 3) * 2;
    ctx.save(); ctx.globalAlpha = k > 0.9 && k < 0.95 ? alpha : k >= 0.95 ? v.seg(k, 0.95, 1) : 1;
    v.fillCircle(gemX, gemY, 16, 'rgba(255,240,170,0.22)');
    ctx.fillStyle = '#7fe0ff'; ctx.beginPath(); ctx.moveTo(gemX, gemY - 11); ctx.lineTo(gemX + 10, gemY - 3); ctx.lineTo(gemX, gemY + 11); ctx.lineTo(gemX - 10, gemY - 3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(28,26,54,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.moveTo(gemX - 2, gemY - 8); ctx.lineTo(gemX - 7, gemY - 3); ctx.lineTo(gemX - 1, gemY - 3); ctx.closePath(); ctx.fill();
    ctx.restore();
    v.sparkle(gemX + 8, gemY - 8, v.seg(k, 0.64, 0.74), '#fff', 10);
    if (k > 0.08 && k < 0.18) v.bubble('Jump!', x0 - 28, 44);
    if (k > 0.33 && k < 0.44) v.bubble('Duck!', x0 - 28, 44);
    v.star(gx - 18, 84 - v.seg(k, 0.66, 0.9) * 6, 9 * v.ease.back(v.seg(k, 0.66, 0.72)) * (1 - v.seg(k, 0.86, 0.9)));
    v.confetti(gx - 18, 110, v.seg(k, 0.66, 0.9));
  },
});

// a bumper car seen from above, like the game's (js/levels/world7/bumper-cars.js): heading a, o: flags, boost, dizzy, happy, s, alpha
function pw7Car(v, x, y, a, id, o = {}) {
  const ctx = v.ctx, R = 19, s = o.s || 1, col = id ? v.c.bo : v.c.pip, dark = id ? v.c.boDark : v.c.pipDark;
  ctx.save(); ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
  ctx.fillStyle = 'rgba(28,26,54,0.25)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 5, (R + 2) * s, (R + 1) * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
  if (o.boost) {   // speed lines and a flame out of the back
    for (const oy of [-10, 0, 10]) v.line(-R - 6, oy, -R - 18 - Math.abs(oy) * 0.4, oy, 'rgba(255,255,255,0.8)', 2);
    ctx.fillStyle = v.c.gold; ctx.beginPath(); ctx.moveTo(-R - 1, -6); ctx.lineTo(-R - 14, 0); ctx.lineTo(-R - 1, 6); ctx.fill();
    ctx.fillStyle = '#ff9a3d'; ctx.beginPath(); ctx.moveTo(-R - 1, -3); ctx.lineTo(-R - 8, 0); ctx.lineTo(-R - 1, 3); ctx.fill();
  }
  v.fillCircle(0, 0, R + 1, '#2c2a40');
  ctx.strokeStyle = '#f6efdf'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, R - 2, -0.75, 0.75); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 2.2; v.circle(0, 0, R - 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(-4, -6, 6, 3, -0.3, 0, Math.PI * 2); ctx.fill();
  v.fillCircle(R - 6, -5.5, 2.3, '#fff6c8'); v.fillCircle(R - 6, 5.5, 2.3, '#fff6c8');
  v.fillCircle(-R + 5, 0, 4, '#1c1a36'); v.fillCircle(-R + 5, 0, 3, o.boost ? v.c.gold : '#5fe08a');
  // the driver from above: Bo's ears or Pip's sprout, eyes toward the nose
  ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 1.8;
  if (id === 1) { v.circle(-3, -7, 3.2); ctx.fill(); ctx.stroke(); v.circle(-3, 7, 3.2); ctx.fill(); ctx.stroke(); }
  v.circle(-1, 0, 7.5); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1.5;
  for (const ey of [-3.4, 3.4]) {
    if (o.dizzy) { ctx.beginPath(); ctx.moveTo(1.5, ey - 1.8); ctx.lineTo(5, ey + 1.8); ctx.moveTo(5, ey - 1.8); ctx.lineTo(1.5, ey + 1.8); ctx.stroke(); }
    else if (o.happy) { ctx.beginPath(); ctx.arc(4, ey, 2, Math.PI / 2 + 0.4, Math.PI * 1.5 - 0.4, true); ctx.stroke(); }
    else { v.fillCircle(3.6, ey, 2.4, '#fff'); v.fillCircle(4.6, ey, 1.2, v.c.ink); }
  }
  if (id === 0) { ctx.fillStyle = '#5cc27f'; ctx.strokeStyle = '#3d8f5a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(-5.5, -2, 4.5, 2.2, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  ctx.restore();
  // the flag pole (lives), upright at the back of the car
  const bx = x - Math.cos(a) * (R - 6) * s, by = y - Math.sin(a) * (R - 6) * s;
  v.line(bx, by, bx, by - 26 * s, '#d8d3e8', 2); v.fillCircle(bx, by - 26 * s, 2, v.c.gold);
  const nf = o.flags == null ? 2 : o.flags;
  for (let q = 0; q < Math.ceil(nf); q++) {
    const fs = s * Math.min(1, nf - q), fy = by - 24 * s + q * 6.5 * s, flap = Math.sin(v.t * 9 + q) * 0.6;
    ctx.fillStyle = col; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx, fy); ctx.lineTo(bx + 12 * fs, fy + 2.5 * fs + flap * fs / s); ctx.lineTo(bx, fy + 5.5 * fs); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

// 7-4: a face-off on the castle island: a bonk, a boost, and the other car slides into the moat. Pip wins, then Bo
definePreview('Bumper Cars', {
  blurb: 'Drive your bumper car into the other one and bump it into the moat!',
  loop: 8, still: 3.3,
  draw(v, t) {
    const ctx = v.ctx, w = t < 4 ? 0 : 1, u = (t % 4) / 4, L = 1 - w, y = 92;
    const mx = x => (w ? v.W - x : x), ma = a => (w ? Math.PI - a : a);
    // the moat, the castle wall at the top, the island of flagstones
    ctx.fillStyle = '#4aa3d8'; ctx.fillRect(0, 0, v.W, v.H);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    for (let q = 0; q < 8; q++) {
      const rx = (q * 97 + t * 10) % 340 - 10, ry = 22 + ((q * 53) % 140);
      if (rx > 34 && rx < 286 && ry > 26 && ry < 158) continue;
      ctx.beginPath(); ctx.moveTo(rx - 8, ry); ctx.quadraticCurveTo(rx, ry - 3, rx + 8, ry); ctx.stroke();
    }
    ctx.fillStyle = '#8d86a8'; ctx.fillRect(0, 0, v.W, 14);
    ctx.fillStyle = '#aaa4c3'; for (let x = 4; x < v.W; x += 20) { v.rr(x, 1, 12, 6, 2); ctx.fill(); }
    ctx.fillStyle = '#5f587e'; ctx.fillRect(0, 12, v.W, 3);
    const x0 = 40, y0 = 32, sz = 20;
    for (let r = 0; r < 6; r++) for (let c = 0; c < 12; c++) {
      if ((c === 0 || c === 11) && (r === 0 || r === 5)) continue;
      const x = x0 + c * sz, yy = y0 + r * sz;
      ctx.fillStyle = 'rgba(16,52,96,0.28)'; ctx.fillRect(x + 3, yy + 4, sz, sz);
    }
    for (let r = 0; r < 6; r++) for (let c = 0; c < 12; c++) {
      if ((c === 0 || c === 11) && (r === 0 || r === 5)) continue;
      const x = x0 + c * sz, yy = y0 + r * sz, edge = r === 5 || ((c === 0 || c === 11) && r === 4);
      ctx.fillStyle = (c + r) % 2 ? '#e8d9b5' : '#f3e7c8'; ctx.fillRect(x, yy, sz, sz);
      ctx.strokeStyle = 'rgba(120,96,60,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, yy + 0.5, sz - 1, sz - 1);
      if (edge) { ctx.fillStyle = '#c9b48a'; ctx.fillRect(x, yy + sz - 4, sz, 4); }
    }
    ctx.strokeStyle = 'rgba(160,120,70,0.35)'; ctx.lineWidth = 2.5; v.circle(160, y, 30); ctx.stroke();
    for (const id of [0, 1]) { ctx.strokeStyle = id ? v.c.bo : v.c.pip; ctx.globalAlpha = 0.45; v.circle(id ? 220 : 100, y, 19); ctx.stroke(); ctx.globalAlpha = 1; }
    // the stands with a cheering crowd
    ctx.fillStyle = '#d39a5e'; ctx.fillRect(0, 164, v.W, 16); ctx.fillStyle = '#8a5833'; ctx.fillRect(0, 164, v.W, 3);
    const cheer = u > 0.8 && u < 0.97;
    const crowd = ['#ffd166', '#ff8fc7', '#b28dff', '#8fe3b0', '#ffffff'];
    for (let q = 0; q < 16; q++) v.fillCircle(10 + q * 20, 176 + (cheer ? v.hop(v.phase(t, 0.4, q * 0.13), 4) : 0), 5, crowd[q % 5]);
    // the round (drawn for Pip winning; mirrored, with the cars swapped, for Bo winning)
    const go = v.ease.in(v.seg(u, 0.12, 0.3)), back = v.ease.out(v.seg(u, 0.3, 0.4)), ram = v.ease.in(v.seg(u, 0.5, 0.58));
    const slide = v.ease.out(v.seg(u, 0.58, 0.72)), teeter = v.seg(u, 0.72, 0.8), fall = v.seg(u, 0.8, 0.9);
    let wx = 100 + 41 * go - 17 * back + 36 * ram + 16 * slide, lx = 220 - 41 * go + 17 * back + 72 * slide + 8 * teeter + 20 * fall;
    let la = Math.PI + v.ease.inOut(v.seg(u, 0.4, 0.5)) * 0.5 + slide * 6 + Math.sin(teeter * 30) * 0.15 * (teeter < 1 ? 1 : 0);
    const home = v.ease.inOut(v.seg(u, 0.86, 1)), drop = v.seg(u, 0.84, 1);
    if (u > 0.86) wx = v.lerp(wx, 100, home);
    const sink = fall > 0, inAir = u > 0.84;
    // the loser's car sinks, then comes back down on a balloon at home
    if (sink && fall < 1) pw7Car(v, mx(lx), y, ma(la), L, { s: 1 - 0.5 * fall, alpha: 1 - 0.85 * fall, flags: 1, dizzy: true });
    if (inAir) {
      const lift = (1 - v.ease.out(drop)) * 70, ly = y - lift, sw = Math.sin(t * 3) * 3;
      ctx.save(); ctx.globalAlpha = v.seg(u, 0.84, 0.9) * (1 - v.seg(u, 0.97, 1));
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(mx(220), ly - 10); ctx.quadraticCurveTo(mx(220) + sw, ly - 24, mx(220) + sw * 0.6, ly - 34); ctx.stroke();
      ctx.fillStyle = L ? v.c.bo : v.c.pip; ctx.strokeStyle = L ? v.c.boDark : v.c.pipDark; ctx.beginPath(); ctx.ellipse(mx(220) + sw * 0.6, ly - 46, 11, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
      // it lands with the one flag it has left; the second grows back as the next round starts
      const regrow = v.ease.out(v.seg(u, 0.92, 0.99));
      pw7Car(v, mx(220), ly, ma(Math.PI), L, { s: 1 + lift / 200, alpha: v.seg(u, 0.84, 0.9), flags: 1 + regrow });
      v.sparkle(mx(220) + (w ? -7 : 19), ly - 18, v.seg(u, 0.92, 1), v.c.gold, 9);
    } else if (!sink) pw7Car(v, mx(lx), y, ma(la), L, { dizzy: u > 0.58, flags: 2 });
    const happy = u > 0.8 && u < 0.98;
    pw7Car(v, mx(wx), y, ma(0), w, { boost: u > 0.48 && u < 0.6, happy, flags: 2 });
    // splash, the lost flag, and the words
    const sk = v.seg(u, 0.8, 0.95);
    if (sk > 0 && sk < 1) {
      for (let q = 0; q < 6; q++) {
        const a = q / 6 * Math.PI * 2, hgt = Math.sin(Math.min(1, sk * 1.6) * Math.PI) * (16 + (q % 3) * 6);
        ctx.globalAlpha = 1 - sk; ctx.fillStyle = q % 2 ? '#ffffff' : '#bfe8ff';
        ctx.beginPath(); ctx.ellipse(mx(296) + Math.cos(a) * (8 + sk * 8), y + Math.sin(a) * 4 - hgt, 4, 6, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(mx(296), y + 4, 12 + 16 * sk, 4 + 4 * sk, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      const fx = mx(296 + 10 - sk * 50), fy = y - 30 - sk * 40 + Math.sin(sk * 12) * 4;
      ctx.save(); ctx.globalAlpha = 1 - sk; ctx.translate(fx, fy); ctx.rotate(Math.sin(sk * 9) * 0.8);
      ctx.fillStyle = L ? v.c.bo : v.c.pip; ctx.strokeStyle = v.c.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(12, 0); ctx.lineTo(0, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    if (u > 0.01 && u < 0.12) v.label('GO!', 160, 50, 18, v.c.gold);
    if (u > 0.3 && u < 0.4) { v.label('BONK!', 160, 62, 14, '#fff'); v.star(150, 76, 4); v.star(171, 72, 3.5); }
    if (u > 0.48 && u < 0.6) v.label('BOOST!', mx(wx), 58, 13, v.c.gold);
    if (u > 0.72 && u < 0.8) { const b = Math.abs(Math.sin(t * 12)) * 3; v.fillCircle(mx(lx), y - 40 - b, 9, 'rgba(28,26,54,0.75)'); v.text('!', mx(lx), y - 39 - b, 15, v.c.gold); }
    if (u > 0.8 && u < 0.92) v.label('SPLASH!', mx(262), 46, 14, '#bfe8ff');
    if (happy) {
      v.star(mx(wx), y - 48 - v.seg(u, 0.8, 0.98) * 5, 9 * v.ease.back(v.seg(u, 0.8, 0.86)) * (1 - v.seg(u, 0.93, 0.98)));
      v.confetti(mx(wx), y - 30, v.seg(u, 0.8, 0.98));
    }
  },
});
