/* Pip & Bo - Level previews for World 1, Sunny Meadow (see js/previews/preview-core.js for how to write one). */
'use strict';

// 1-1: Bo holds a button so Pip gets through the gate, then Pip holds the far button so Bo gets through too
definePreview('Hold the Door', {
  blurb: 'One of you holds the button so the other can get through the gate.',
  loop: 6, still: 2.1,
  draw(v, t) {
    const gy = 150, k = t / 6, ctx = v.ctx, gx = 164, bA = 70, bB = 228, door = 292;
    v.backdrop(gy);
    // who stands on which button
    const boRun = v.ease.inOut(v.seg(k, 0.5, 0.7)), pipRun = v.ease.inOut(v.seg(k, 0.2, 0.42));
    const boX = k < 0.5 ? v.lerp(30, bA, v.ease.inOut(v.seg(k, 0, 0.12))) : v.lerp(bA, door + 8, boRun);
    const pipX = k < 0.74 ? v.lerp(120, bB, pipRun) : v.lerp(bB, door - 12, v.ease.inOut(v.seg(k, 0.74, 0.84)));
    const onA = k > 0.12 && k < 0.5, onB = k > 0.42 && k < 0.74;
    const open = k < 0.12 ? 0 : k < 0.18 ? v.ease.out(v.seg(k, 0.12, 0.18)) : k < 0.74 ? 1 : 1 - v.seg(k, 0.74, 0.8);
    v.button(bA, gy, '#ffc53d', onA ? 1 : 0);
    v.button(bB, gy, '#ffc53d', onB ? 1 : 0);
    // the gate: gold bars that slide up into the stone wall above while a button is held
    ctx.save(); ctx.beginPath(); ctx.rect(gx - 14, 0, 28, gy); ctx.clip();
    ctx.fillStyle = '#ffc53d';
    for (let b = 0; b < 4; b++) { v.rr(gx - 11 + b * 6, gy - 54 - open * 46, 4, 54, 2); ctx.fill(); }
    ctx.restore();
    v.block(gx - 16, -4, 32, gy - 50, false);
    v.door(door, gy, k > 0.8 ? 1 : 0);
    const happy = k > 0.82;
    v.hero(1, boX, gy + (boRun > 0 && boRun < 1 ? v.hop(v.phase(t, 0.36), 5) : 0), { face: 1, sq: onA ? 0.12 : 0, mood: happy ? 'joy' : boRun > 0 && boRun < 1 ? 'grit' : 'happy' });
    v.hero(0, pipX, gy + (pipRun > 0 && pipRun < 1 ? v.hop(v.phase(t, 0.36), 5) : 0), { face: k > 0.42 && k < 0.74 ? -1 : 1, sq: onB ? 0.12 : 0, mood: happy ? 'joy' : pipRun > 0 && pipRun < 1 ? 'grit' : 'happy' });
    if (k > 0.14 && k < 0.36) v.bubble('Go!', bA, gy - 32);
    if (k > 0.47 && k < 0.66) v.bubble('Your turn!', bB, gy - 32);
    v.confetti(door, gy - 30, v.seg(k, 0.82, 1));
  },
});

// a padlock on a door with its feet at (x, y), fading out as it opens (k 0..1)
function pw1Lock(v, x, y, k = 0) {
  if (k >= 1) return;
  const ctx = v.ctx, cy = y - 14 - k * 10;
  ctx.save(); ctx.globalAlpha *= 1 - k;
  ctx.strokeStyle = v.c.gold; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, cy - 4, 4.5, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = v.c.gold; v.rr(x - 7, cy - 4, 14, 11, 3); ctx.fill();
  v.fillCircle(x, cy + 1, 2, v.c.doorIn);
  ctx.restore();
}
// the game's big key (js/render.js drawKey), centred on (x, y)
function pw1Key(v, x, y, s = 1) {
  const ctx = v.ctx;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  v.fillCircle(2, 0, 12, 'rgba(255,215,90,0.3)');
  ctx.fillStyle = v.c.gold; ctx.strokeStyle = v.c.goldDark; ctx.lineWidth = 2;
  v.circle(-4, 0, 5); ctx.fill(); ctx.stroke();
  ctx.fillRect(0, -1.8, 11, 3.6); ctx.fillRect(7, 1, 2.6, 4.5); ctx.fillRect(10.4, 1, 2, 3.4);
  v.fillCircle(-4, 0, 1.7, v.c.goldDark);
  ctx.restore();
}

// 1-2: Bo gives Pip a boost up to the key, and the key opens the door for both
definePreview('Boost Me Up', {
  blurb: 'Stand on your partner’s head to reach high places.',
  loop: 6, still: 1.74,
  draw(v, t) {
    const gy = 150, k = t / 6, ledge = 82, wall = 200, door = 50;
    v.sky(); v.sun(96, 30); v.clouds(t); v.hills(gy - 30); v.ground(gy); // the sun sits left, clear of the key
    v.block(wall, ledge, 130, gy - ledge + 4);
    v.door(door, gy, v.seg(k, 0.72, 0.78) * (k < 0.95 ? 1 : 0));
    // fade out at the door, fade back in at the start
    const reset = k >= 0.95, alpha = k < 0.9 ? 1 : reset ? v.seg(k, 0.95, 1) : 1 - v.seg(k, 0.9, 0.95);
    const walk = (a, b) => (k > a && k < b ? v.hop(v.phase(t, 0.36), 4) : 0);
    // Bo: walks to the wall, jumps with Pip on top, then steps aside and heads for the door
    let boX = v.lerp(125, 184, v.ease.inOut(v.seg(k, 0, 0.12))), boY = gy, boFace = 1;
    const boJump = v.seg(k, 0.23, 0.33);
    boY += v.hop(boJump, 30) + walk(0, 0.12);
    if (k > 0.45) { boX = v.lerp(184, 122, v.ease.inOut(v.seg(k, 0.45, 0.55))); boFace = -1; boY += walk(0.45, 0.55); }
    if (k > 0.63) { boX = v.lerp(122, 26, v.ease.inOut(v.seg(k, 0.63, 0.76))); boY += walk(0.63, 0.76); }
    // Pip: hops onto Bo's head, rides the jump, jumps again at the top onto the ledge, gets the key, hops down
    let pipX = v.lerp(95, 150, v.ease.inOut(v.seg(k, 0, 0.12))), pipY = gy + walk(0, 0.12), pipFace = 1, rider = false;
    if (k > 0.13) { const s = v.seg(k, 0.13, 0.21); pipX = v.lerp(150, 184, s); pipY = v.lerp(gy, gy - 25, s) + v.hop(s, 20); }
    if (k > 0.21 && k <= 0.28) { pipX = boX; pipY = boY - 25; rider = true; }
    if (k > 0.28) { const s = v.seg(k, 0.28, 0.37); pipX = v.lerp(184, 228, v.ease.out(s)); pipY = v.lerp(gy - 55, ledge, s) + v.hop(s, 26); }
    if (k > 0.37) { pipX = v.lerp(228, 266, v.ease.inOut(v.seg(k, 0.37, 0.45))); pipY += walk(0.37, 0.45); }
    if (k > 0.47) { pipX = v.lerp(266, 214, v.ease.inOut(v.seg(k, 0.47, 0.55))); pipFace = -1; pipY = ledge + walk(0.47, 0.55); }
    if (k > 0.55) { const s = v.seg(k, 0.55, 0.63); pipX = v.lerp(214, 168, s); pipY = v.lerp(ledge, gy, s) + v.hop(s, 14); }
    if (k > 0.63) { pipX = v.lerp(168, 76, v.ease.inOut(v.seg(k, 0.63, 0.76))); pipY = gy + walk(0.63, 0.76); }
    if (reset) { boX = 125; boY = gy; pipX = 95; pipY = gy; boFace = 1; pipFace = 1; }
    // the key: on the ledge, then over Pip's head, then into the lock
    const got = k > 0.45 && !reset;
    if (!got) pw1Key(v, 270, ledge - 20 + Math.sin(t * 3) * 2.5);
    else if (k < 0.72) pw1Key(v, pipX, pipY - 40, 0.8);
    v.sparkle(270, ledge - 22, v.seg(k, 0.45, 0.55), v.c.gold, 10);
    pw1Lock(v, door, gy, reset ? 0 : v.seg(k, 0.72, 0.78));
    v.sparkle(door, gy - 16, v.seg(k, 0.72, 0.84), v.c.gold, 12);
    const happy = k > 0.76 && !reset, flying = k > 0.13 && k < 0.37;
    v.hero(1, boX, boY, { face: boFace, alpha, sq: rider ? 0.15 : 0, shadow: boJump <= 0 || boJump >= 1, mood: happy ? 'joy' : boJump > 0 && boJump < 1 ? 'grit' : 'happy' });
    v.hero(0, pipX, pipY, { face: pipFace, alpha, shadow: !flying, mood: happy ? 'joy' : flying ? 'grit' : got && k < 0.56 ? 'wow' : 'happy' });
    if (k > 0.07 && k < 0.2) v.bubble('Hop on!', boX, gy - 32);
    if (k > 0.26 && k < 0.38) v.label('BOOST!', 150, 58, 16, v.c.gold);
    v.heart(door, gy - 46 - v.seg(k, 0.78, 0.95) * 8, 6 * v.seg(k, 0.76, 0.82) * (reset ? 0 : 1));
    v.confetti(door, gy - 30, v.seg(k, 0.76, 0.95));
  },
});

// a coloured block like the game's (js/render.js drawColorBlock): id 0 orange holds Pip, 1 blue holds Bo
function pw1ColorBlock(v, x, y, sz, id, face) {
  const ctx = v.ctx, col = id ? v.c.bo : v.c.pip, dark = id ? v.c.boDark : v.c.pipDark;
  ctx.save();
  ctx.fillStyle = col; ctx.fillRect(x + 1, y + 1, sz - 2, sz - 2);
  ctx.beginPath(); ctx.rect(x + 1, y + 1, sz - 2, sz - 2); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 3.5;
  for (let q = -sz; q < sz * 2; q += 10) { ctx.beginPath(); ctx.moveTo(x + q, y + sz); ctx.lineTo(x + q + sz, y); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, sz - 2, sz - 2);
  if (face) { v.fillCircle(x + sz * 0.36, y + sz * 0.42, 1.8, 'rgba(28,26,54,0.55)'); v.fillCircle(x + sz * 0.64, y + sz * 0.42, 1.8, 'rgba(28,26,54,0.55)'); }
}

// 1-3: Pip carries Bo over the orange blocks, Bo carries Pip over the blue ones, and the flag needs both
definePreview('Your Color, My Color', {
  blurb: 'Orange blocks hold Pip, blue blocks hold Bo. Give each other a ride!',
  loop: 6.5, still: 2.35,
  draw(v, t) {
    const ctx = v.ctx, gy = 136, k = t / 6.5, sz = 26, oX = 56, mX = 134, uX = 186, rX = 264, flagX = 298;
    v.sky(); v.sun(); v.clouds(t); v.hills(gy - 26);
    v.spikes(oX, 180, mX - oX); v.spikes(uX, 180, rX - uX);
    v.block(-2, gy, oX + 2, v.H - gy + 2); v.block(mX, gy, uX - mX, v.H - gy + 2); v.block(rX, gy, v.W - rX + 2, v.H - gy + 2);
    for (let q = 0; q < 3; q++) { pw1ColorBlock(v, oX + q * sz, gy, sz, 0, q === 1); pw1ColorBlock(v, uX + q * sz, gy, sz, 1, q === 1); }
    const reset = k >= 0.95, alpha = k < 0.9 ? 1 : reset ? v.seg(k, 0.95, 1) : 1 - v.seg(k, 0.9, 0.95);
    const walk = (a, b) => (k > a && k < b ? v.hop(v.phase(t, 0.36), 3) : 0);
    // Bo steps on orange and sinks right through (0.08-0.13), so hops onto Pip, who carries Bo across (0.28-0.45);
    // Bo hops down, Pip hops up; Bo carries Pip across blue (0.59-0.79)
    const sink = v.ease.out(v.seg(k, 0.08, 0.13)), up1 = v.seg(k, 0.21, 0.27), ride1 = v.ease.inOut(v.seg(k, 0.28, 0.45)), off1 = v.seg(k, 0.46, 0.5);
    const up2 = v.seg(k, 0.53, 0.585), ride2 = v.ease.inOut(v.seg(k, 0.59, 0.79)), off2 = v.seg(k, 0.8, 0.86);
    let pipX = k < 0.28 ? v.lerp(16, 40, v.ease.inOut(v.seg(k, 0.07, 0.14))) : v.lerp(40, 158, ride1), pipY = gy + walk(0.07, 0.14) + walk(0.28, 0.45);
    let boX = v.lerp(40, 70, v.ease.inOut(v.seg(k, 0.02, 0.08))), boY = gy + walk(0.02, 0.08) + sink * 16;
    if (k > 0.21) { boX = v.lerp(70, 40, up1); boY = v.lerp(gy + 16, gy - 25, up1) + v.hop(up1, 22); }
    if (k > 0.27) { boX = pipX; boY = pipY - 25; }
    if (k > 0.46) { boX = v.lerp(158, 182, off1); boY = v.lerp(gy - 25, gy, off1) + v.hop(off1, 12); }
    if (k > 0.53) { pipX = v.lerp(158, 182, up2); pipY = v.lerp(gy, gy - 25, up2) + v.hop(up2, 18); }
    if (k > 0.59) { boX = v.lerp(182, 280, ride2); boY = gy + walk(0.59, 0.79); }
    if (k > 0.585) { pipX = boX; pipY = boY - 25; }
    if (k > 0.8) { pipX = v.lerp(280, 306, off2); pipY = v.lerp(gy - 25, gy, off2) + v.hop(off2, 12); }
    if (reset) { pipX = 16; pipY = gy; boX = 40; boY = gy; }
    // the flag needs both: a light for each, and it rises when both are there
    const pipIn = k > 0.86 && !reset, boIn = k > 0.79 && !reset, up = pipIn ? v.ease.back(v.seg(k, 0.86, 0.92)) : 0;
    v.line(flagX, gy, flagX, gy - 50, v.c.ink, 3);
    const fy = v.lerp(gy - 22, gy - 50, up);
    ctx.fillStyle = up > 0 ? v.c.grass : '#b9b6cc'; ctx.beginPath();
    ctx.moveTo(flagX + 1.5, fy); ctx.lineTo(flagX + 19, fy + 6 + Math.sin(t * 6) * 1.5); ctx.lineTo(flagX + 1.5, fy + 12); ctx.closePath(); ctx.fill();
    for (const id of [0, 1]) {
      const lx = flagX - 6 + id * 12, on = id ? boIn : pipIn;
      v.circle(lx, gy - 60, 4.5); ctx.fillStyle = on ? (id ? v.c.bo : v.c.pip) : 'rgba(255,255,255,0.6)'; ctx.fill();
      ctx.strokeStyle = id ? v.c.bo : v.c.pip; ctx.lineWidth = 1.8; ctx.stroke();
    }
    const happy = k > 0.86 && !reset;
    const pipRide = k > 0.585 && k < 0.8, boRide = k > 0.27 && k < 0.46, sunk = k > 0.08 && k < 0.25;
    v.hero(0, pipX, pipY, { face: 1, alpha, shadow: !pipRide, sq: boRide ? 0.12 : 0, mood: happy ? 'joy' : k > 0.28 && k < 0.45 ? 'grit' : 'happy' });
    v.hero(1, boX, boY, { face: k > 0.14 && k < 0.27 ? -1 : 1, alpha, shadow: !boRide && !sunk, sq: pipRide ? 0.12 : 0, mood: happy ? 'joy' : sunk ? 'wow' : k > 0.59 && k < 0.79 ? 'grit' : 'happy' });
    // orange doesn't hold Bo: the blocks cover Bo's feet while Bo sinks in
    if (sunk && boY > gy) for (let q = 0; q < 2; q++) pw1ColorBlock(v, oX + q * sz, gy, sz, 0, q === 1);
    if (k > 0.09 && k < 0.15) v.bubble('Oops!', boX, boY - 34);
    if (k > 0.15 && k < 0.215) v.bubble('Hop on!', 40, gy - 32);
    if (k > 0.47 && k < 0.545) v.bubble('My turn!', 182, gy - 32);
    v.star(flagX + 10, gy - 78 - v.seg(k, 0.88, 1) * 6, 8 * v.ease.back(v.seg(k, 0.88, 0.93)) * (reset ? 0 : 1));
    v.confetti(flagX - 10, gy - 40, v.seg(k, 0.87, 1));
  },
});

// the cord between Pip and Bo, drawn like the game's (js/render.js drawRope / drawChain / drawBungee).
// o.sag bends it down at the middle, o.corner bends a rope over a ledge, o.gold lights a rope being climbed,
// o.stretch (0..1) thins a bungee
function pw1Cord(v, kind, ax, ay, bx, by, o = {}) {
  const ctx = v.ctx, sag = o.sag || 0, mx = (ax + bx) / 2, my = (ay + by) / 2 + sag;
  const path = () => {
    ctx.beginPath(); ctx.moveTo(ax, ay);
    if (o.corner) { ctx.lineTo(o.corner.x, o.corner.y); ctx.lineTo(bx, by); } else ctx.quadraticCurveTo(mx, my, bx, by);
  };
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'chain') {
    let px = ax, py = ay, run = 0, next = 3, n = 0;
    for (let i = 1; i <= 20; i++) {
      const u = i / 20, w = 1 - u, qx = w * w * ax + 2 * w * u * mx + u * u * bx, qy = w * w * ay + 2 * w * u * my + u * u * by;
      const seg = Math.hypot(qx - px, qy - py), ang = Math.atan2(qy - py, qx - px);
      while (seg > 0 && next <= run + seg) {
        const f = (next - run) / seg;
        ctx.save(); ctx.translate(px + (qx - px) * f, py + (qy - py) * f); ctx.rotate(ang); ctx.beginPath();
        if (n % 2 === 0) ctx.ellipse(0, 0, 5, 3, 0, 0, Math.PI * 2); else { ctx.moveTo(-4.5, 0); ctx.lineTo(4.5, 0); }
        ctx.strokeStyle = '#34304f'; ctx.lineWidth = 4; ctx.stroke();
        ctx.strokeStyle = n % 2 === 0 ? '#e4e6f2' : '#b4b8cc'; ctx.lineWidth = 1.9; ctx.stroke();
        ctx.restore();
        next += 7.5; n++;
      }
      run += seg; px = qx; py = qy;
    }
  } else if (kind === 'bungee') {
    const st = o.stretch || 0, lw = 5.5 - st * 3;
    ctx.strokeStyle = '#6e1d48'; ctx.lineWidth = lw + 2.5; path(); ctx.stroke();
    ctx.strokeStyle = st > 0.3 ? '#ff8cc0' : '#ff5fa2'; ctx.lineWidth = lw; path(); ctx.stroke();
    ctx.setLineDash([3, 4 + st * 5]); ctx.strokeStyle = 'rgba(255,236,246,0.85)'; ctx.lineWidth = Math.max(1, lw - 3); path(); ctx.stroke();
  } else {
    ctx.strokeStyle = v.c.ropeDark; ctx.lineWidth = 4.5; path(); ctx.stroke();
    ctx.strokeStyle = o.gold ? v.c.gold : v.c.rope; ctx.lineWidth = 2.5; path(); ctx.stroke();
  }
  ctx.restore();
}

// 1-4: three cords in turn. Rope: Bo falls off and climbs back up. Chain: Pip holds it stiff and Bo swings
// right over for a key. Bungee: Pip drops in for the second key and bounces back up. Both keys: hooray!
definePreview('Rope, Chain & Bungee', {
  blurb: 'You’re tied together! Climb a rope, swing on a chain, bounce on a bungee.',
  loop: 7.5, still: 1.3,
  draw(v, t) {
    const ctx = v.ctx, gy = 96, edge = 158, per = 2.5, ph = Math.min(2, Math.floor(t / per)), p = (t - ph * per) / per;
    v.sky(); v.sun(104, 34, 13); v.clouds(t); v.hills(gy + 34);
    v.spikes(edge, 181, 270 - edge);
    v.block(-2, gy, edge + 2, v.H - gy + 2); v.block(270, gy, 52, v.H - gy + 2);
    const walk = (a, b) => (p > a && p < b ? v.hop(v.phase(t, 0.34), 3) : 0);
    const key1 = { x: 204, y: 64 }, key2 = { x: 212, y: 150 };
    // each hero: feet (x, y), plus rot (turns around the body's middle), face, mood
    const pip = { x: 92, y: gy, face: 1, mood: 'happy', rot: 0, sq: 0, air: false };
    const bo = { x: 126, y: gy, face: 1, mood: 'happy', rot: 0, sq: 0, air: false };
    let got1 = ph === 1 ? p > 0.49 : ph === 2 && p < 0.94, got2 = ph === 2 && p > 0.37 && p < 0.94, joy = false;
    const att = h => [h.x, h.y - 12]; // where the cord ties on
    if (ph === 0) {
      // ROPE: Bo walks off, dangles below the edge, climbs back up the rope
      const brace = v.ease.out(v.seg(p, 0.25, 0.35)) - v.ease.inOut(v.seg(p, 0.82, 0.96));
      pip.x = 92 + 16 * brace; if (brace > 0.5) { pip.mood = 'grit'; pip.sq = 0.1; }
      bo.x = v.lerp(126, 152, v.ease.inOut(v.seg(p, 0.1, 0.25))); bo.y += walk(0.1, 0.25);
      if (p > 0.25) { const s = v.seg(p, 0.25, 0.35); bo.x = v.lerp(152, 172, v.ease.out(s)); bo.y = v.lerp(gy, 150, v.ease.in(s)); bo.air = true; bo.mood = 'wow'; }
      if (p > 0.35) { const s = v.seg(p, 0.35, 0.5); bo.x = 172 + Math.sin(s * 9) * 3 * (1 - s); }
      if (p > 0.5) { const s = v.seg(p, 0.5, 0.72); bo.x = 172 - 4 * s; bo.y = v.lerp(150, 104, s) + Math.sin(s * 30) * 1.5; bo.face = -1; bo.mood = 'grit'; }
      if (p > 0.72) { const s = v.seg(p, 0.72, 0.82); bo.x = v.lerp(168, 140, s); bo.y = v.lerp(104, gy, s) + v.hop(s, 12); bo.face = -1; }
      if (p > 0.82) { bo.x = v.lerp(140, 126, v.ease.inOut(v.seg(p, 0.82, 0.96))); bo.y = gy + walk(0.82, 0.96); bo.air = false; bo.mood = 'happy'; bo.face = 1; }
      const [ax, ay] = att(pip), [bx, by] = att(bo), hang = bo.y > gy + 6 && bo.x > edge - 4;
      pw1Cord(v, 'rope', ax, ay, bx, by, { sag: Math.max(0, 40 - Math.abs(bx - ax)) * 0.5, corner: hang ? { x: edge + 1, y: gy - 1 } : null, gold: p > 0.5 && p < 0.72 });
      if (p > 0.38 && p < 0.62) v.bubble('Climb!', bo.x, bo.y - 32);
    } else if (ph === 1) {
      // CHAIN: Pip stands at the edge and holds it stiff; Bo swings right round, past the key, and lands behind
      const L = 58, piv = () => [pip.x + 4, pip.y - 11];
      pip.x = v.lerp(92, 142, v.ease.inOut(v.seg(p, 0.1, 0.24))); pip.y += walk(0.1, 0.24);
      bo.x = v.lerp(126, 172, v.ease.inOut(v.seg(p, 0.03, 0.16))); bo.y += walk(0.03, 0.15);
      const [px, py] = piv();
      const pend = th => [px + L * Math.sin(th), py + L * Math.cos(th)];
      const th0 = 0.45, th1 = Math.PI * 1.5;
      if (p > 0.16) {
        let cx, cy;
        if (p < 0.3) { const s = v.ease.in(v.seg(p, 0.16, 0.3)), [ex, ey] = pend(th0); cx = v.lerp(172, ex, s); cy = v.lerp(gy - 12, ey, s); }
        else { const th = v.lerp(th0, th1, v.ease.inOut(v.seg(p, 0.3, 0.76))); [cx, cy] = pend(th); bo.rot = -th * 4 / 3; }
        bo.x = cx; bo.y = cy + 12; bo.air = p < 0.76; bo.mood = p < 0.76 ? 'wow' : 'joy';
        pip.mood = p < 0.76 ? 'grit' : 'happy'; pip.sq = p < 0.76 ? 0.1 : 0;
      }
      if (p > 0.76) { bo.x = 92; bo.y = gy; bo.rot = 0; bo.air = false; }
      const [bx, by] = [bo.x, bo.y - 12], taut = p > 0.2 && p < 0.76;
      pw1Cord(v, 'chain', px, py, bx, by, { sag: taut ? 0 : Math.max(0, 50 - Math.abs(bx - px)) * 0.4 });
      if (p > 0.3 && p < 0.5) v.bubble('Hold on!', pip.x, gy - 32);
    } else {
      // BUNGEE: Pip drops in, grabs the key at the bottom and bounces right back up over Bo
      pip.x = 146; bo.x = 92;
      if (p > 0.05) { const s = v.seg(p, 0.05, 0.12); pip.x = v.lerp(146, 162, s); pip.y = gy + v.hop(s, 12); pip.air = true; }
      if (p > 0.12) { const s = v.seg(p, 0.12, 0.34); pip.x = v.lerp(162, key2.x, v.ease.out(s)); pip.y = v.lerp(gy, 162, v.ease.in(s)); pip.mood = 'wow'; }
      if (p > 0.34) { const s = v.seg(p, 0.34, 0.44); pip.sq = 0.35 * Math.sin(s * Math.PI); pip.y = 162 + 4 * Math.sin(s * Math.PI); pip.mood = 'grit'; }
      if (p > 0.44) { const s = v.seg(p, 0.44, 0.8); pip.x = v.lerp(key2.x, 92, s); pip.y = v.lerp(162, gy, s) + v.hop(s, 92); pip.rot = s * Math.PI * 2; pip.sq = 0; pip.mood = 'joy'; }
      if (p > 0.8) { pip.x = 92; pip.y = gy; pip.rot = 0; pip.air = false; joy = p < 0.97; }
      bo.x = v.lerp(92, 126, v.ease.inOut(v.seg(p, 0.5, 0.74))); bo.y = gy + walk(0.5, 0.74);
      bo.mood = p > 0.2 && p < 0.44 ? 'grit' : 'happy'; bo.sq = p > 0.25 && p < 0.44 ? 0.1 : 0;
      const [ax, ay] = att(bo), [bx, by] = att(pip), d = Math.hypot(bx - ax, by - ay);
      pw1Cord(v, 'bungee', ax, ay, bx, by, { stretch: v.clamp((d - 60) / 70, 0, 1), sag: Math.max(0, 60 - d) * 0.45 });
      if (p > 0.42 && p < 0.6) v.label('BOING!', 218, 116, 16, '#ff8cc0');
      if (joy) { pip.mood = 'joy'; bo.mood = 'joy'; }
    }
    // keys to collect (bobbing until grabbed)
    if (ph === 1 && !got1) pw1Key(v, key1.x, key1.y + Math.sin(t * 3) * 2);
    if (ph === 1) v.sparkle(key1.x, key1.y, v.seg(p, 0.49, 0.62), v.c.gold, 11);
    if (ph === 2 && p < 0.37) pw1Key(v, key2.x, key2.y + Math.sin(t * 3) * 2);
    if (ph === 2) v.sparkle(key2.x, key2.y, v.seg(p, 0.37, 0.5), v.c.gold, 11);
    for (const h of [pip, bo]) v.hero(h === pip ? 0 : 1, h.x, h.y, { face: h.face, mood: h.mood, rot: h.rot, sq: h.sq, shadow: !h.air });
    // a new cord: a twinkle in the middle, and its name in the corner
    v.sparkle((pip.x + bo.x) / 2, gy - 16, v.seg(p, 0, 0.16), '#fff', 9);
    const names = ['ROPE', 'CHAIN', 'BUNGEE'], bgs = ['#8a5833', '#5d6485', '#d6418a'];
    v.pill(names[ph], 10, 16, { size: 12, align: 'left', body: false, bg: bgs[ph] });
    // the two keys found so far
    ctx.fillStyle = 'rgba(28,26,54,0.55)'; v.rr(250, 6, 62, 22, 11); ctx.fill();
    const fade = ph === 2 ? 1 - v.seg(p, 0.94, 1) : 1;
    [got1, got2].forEach((g, i) => {
      ctx.save(); ctx.globalAlpha *= g ? fade : 0.35; pw1Key(v, 268 + i * 26, 17, 0.75); ctx.restore();
    });
    if (joy) { v.confetti(110, 60, v.seg(p, 0.8, 1)); v.star(281, 40, 7 * v.ease.back(v.seg(p, 0.8, 0.86))); }
  },
});
