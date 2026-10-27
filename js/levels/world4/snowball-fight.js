/* Pip & Bo - Level 4-2 Snowball Fight (versus). */
'use strict';

/* ----- 4-2 Snowball Fight (mode 'snow'): one snowball in hand, tap = quick throw, hold = lob along a dotted arc,
   duck to pack snow and let quick throws fly over, catch with empty hands. 4 hits make a snowman. Names: SNOW / snow*. ----- */
const SNOW = {
  hitsToFreeze: 4, avalancheAt: 35,                       // hits to make a snowman; round seconds until the avalanche
  tapT: 0.15, chargeT: 0.8, autoThrowT: 1.0,              // tap threshold, tap -> full power, held at full before it throws itself
  chargeMove: 0.6, throwCD: 0.25,                         // run speed while winding up; pause after a throw
  v0: 700, v1: 880, a0: 6, a1: 45, ballG: 1000, inherit: 0.3, handX: 8, handY: 7,
  aimRange: 300, aimCap: 30, aimHead: 22,                 // quick-throw auto-aim (targets standing head height)
  aimLow: 0.2, aimFade: 0.3,                              // a slow tap (power < 0.2) is auto-aimed too; fades out by 0.3
  r: 6, rMega: 14, giantR: 1.7, life: 4,
  refillT: 1.5, packT: 0.5,                               // empty hand refills by itself / by ducking
  duckCut: 14, catchWin: 0.3, catchCD: 0.9, catchThrowCD: 0.15,
  hitKX: 220, hitKY: -180, hitStun: 0.25, hitSlide: 0.3, safeT: 0.8,
  megaKX: 520, megaKY: -380, megaStun: 0.5, megaHits: 2,
  brickHP: 3, megaFirst: 15, megaAgain: 15, pickR: 14,
  windA: 260, windFlip: 7, iceGrip: 0.25, floorY: 480,
  avEvery: 1.6, avMin: 0.8, avRamp: 0.04, avSpread: 24, avY: 36, avV0: 150, avR: 10,
  roofT: 7, roofEvery: 1.2, roofWarn: 1.5, pocketL: 240, pocketR: 720,  // hiding behind your own fort over 7 s: snow falls on you
  hideNear: 150, nearRate: 0.5,                           // ...at half speed while the other player is within 150 px (a close fight, not hiding)
  cbHi: 0.45, cbLo: 0.30, cbMin: 4, cbR: 6, cbRefill: 0.5, hatAt: 0.5,   // comeback mittens + bobble hats
  leadSnow: 1,                                            // whoever leads by 2+ rounds starts the round with 1 snow layer on
  arcT: 1.6, hints: 2,
};
const SNOW_TWISTS = ['snowday', 'windy', 'giant', 'icy'];
const SNOW_CARD = {
  snowday: ['Snow Day', 'Hit them 4 times to make a snowman!'],
  windy: ['Windy!', 'The wind pushes snowballs — watch the arrow!'],
  giant: ['Giant Snowballs!', 'Big snowballs are easier to hit with!'],
  icy: ['Ice Rink!', 'The ground is slippery!'],
};
const SNOW_INK = 'rgba(28,26,54,';

const snowSolidAt = (x, y) => { const ch = tile(Math.floor(x / T), Math.floor(y / T)); return ch === '#' || ch === 'P'; };
const snowCircRect = (cx, cy, r, b) => { const nx = clamp(cx, b.x, b.x + b.w), ny = clamp(cy, b.y, b.y + b.h); return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) < r * r; };
// the body box snowballs test against: ducking removes its top 14 px
function snowBox(p) { const s = G.mst.pl && G.mst.pl[p.id], d = s && s.duck ? SNOW.duckCut : 0; return { x: p.x, y: p.y + d, w: p.w, h: p.h - d }; }
// comeback strength 0..1: whoever has landed under 45 % of this match's hits (once there are 4) gets bigger mittens
function snowCB(k) {
  const l = G.mst.landed, tot = l[0] + l[1];
  if (tot < SNOW.cbMin) return 0;
  return clamp((SNOW.cbHi - l[k] / tot) / (SNOW.cbHi - SNOW.cbLo), 0, 1);
}
const snowWind = () => (G.mst.twist === 'windy' ? SNOW.windA * G.mst.wind.dir : 0);
const snowRadius = k => (SNOW.r + SNOW.cbR * G.mst.b[k]) * (G.mst.twist === 'giant' ? SNOW.giantR : 1);
const snowRefillT = k => SNOW.refillT * Math.pow(SNOW.cbRefill, G.mst.b[k]);

// how much of the auto-aim a throw gets: all of it up to power 0.2 (a tap, or a slow tap held up to 0.31 s), none from 0.3
const snowAimW = power => clamp((SNOW.aimFade - power) / (SNOW.aimFade - SNOW.aimLow), 0, 1);
// where and how fast a snowball leaves the hand (aim 0..1: gently auto-aimed at the other player's standing head height)
function snowLaunch(p, power, aim) {
  let a = (SNOW.a0 + (SNOW.a1 - SNOW.a0) * power) * Math.PI / 180;
  const v = SNOW.v0 + (SNOW.v1 - SNOW.v0) * power, y = p.y + SNOW.handY;
  let x = p.x + p.w / 2 + p.face * SNOW.handX;
  if (snowSolidAt(x, y)) x = p.x + p.w / 2; // hugging a wall or your fort: throw from the middle
  const w = aim === true ? 1 : +aim || 0;
  if (w > 0) {
    const q = other(p), dx = (q.x + q.w / 2 - x) * p.face, dy = (q.y + q.h - SNOW.aimHead) - y;
    if (q.alive && dx > 0 && dx < SNOW.aimRange) {
      const want = Math.atan2(-dy, dx) + SNOW.ballG * dx / (2 * v * v), cap = SNOW.aimCap * Math.PI / 180;
      a += (clamp(want, a - cap, a + cap) - a) * w;
    }
  }
  return { x, y, vx: p.face * v * Math.cos(a) + SNOW.inherit * p.vx, vy: -v * Math.sin(a) };
}
// the flight, integrated exactly like the game, until the first stone/brick or the screen edge (planks and players ignored)
function snowPath(b0, maxT, wind, every = 1) {
  const b = { x: b0.x, y: b0.y, vx: b0.vx, vy: b0.vy }, pts = [], n = Math.ceil(maxT / DT);
  for (let i = 1; i <= n; i++) {
    b.vy += SNOW.ballG * DT; b.vx += wind * DT; b.x += b.vx * DT; b.y += b.vy * DT;
    const end = b.y > H + 20 || b.x < -20 || b.x > W + 20 || snowSolidAt(b.x, b.y);
    if (end || i % every === 0) pts.push({ x: b.x, y: b.y, t: i * DT, end });
    if (end) break;
  }
  return pts;
}
function snowCancel(s) { s.hold = -1; s.charge = 0; s.autoT = 0; s.full = false; s.fullT = 0; s.tickT = 0.1; }
function snowFx(kind, text, x, y, t, k) { G.mst.fx.push({ kind, text, x, y, t, max: t, k }); }
// an avalanche clump drops over player q (roof: the snow over their hideout slid off)
function snowClump(q, roof) {
  const x = clamp(q.x + q.w / 2 + (MODES.snow.rand() * 2 - 1) * SNOW.avSpread, 45, 915);
  G.mst.balls.push({ x, y: SNOW.avY, vx: 0, vy: SNOW.avV0, r: SNOW.avR, k: -1, roof: !!roof, mega: false, power: 0, x0: x, age: 0, n: 0, trail: [] });
}
// is player p's centre in their own pocket, behind their fort?
const snowInPocket = p => (p.id === 0 ? p.x + p.w / 2 < SNOW.pocketL : p.x + p.w / 2 > SNOW.pocketR);

function snowThrow(p) {
  const st = G.mst, k = p.id, s = st.pl[k];
  const tap = s.hold < SNOW.tapT, power = tap ? 0 : s.charge, mega = s.mega;
  const l = snowLaunch(p, power, snowAimW(power));
  st.balls.push({ x: l.x, y: l.y, vx: l.vx, vy: l.vy, r: mega ? SNOW.rMega : snowRadius(k), k, mega, power, x0: l.x, age: 0, n: 0,
    trail: [], spark: !mega && st.b[k] >= 0.3, spin: (k * 1.3 + st.throws[k] * 0.7) % 6.28 });
  if (mega) { s.mega = false; st.megaNext = st.t + SNOW.megaAgain; } else s.hand = 0;
  st.throws[k]++;
  snowCancel(s); s.cd = SNOW.throwCD;
  Sfx.play(mega || power >= 0.3 ? 'snowLob' : 'snowThrow', k);
  if (power >= 1) rumble(k, 0.1, 0.25, 50);
  puff(l.x, l.y, 2, 'rgba(255,255,255,0.9)');
  p.sx = 1.12; p.sy = 0.9;
}

// a snowball (or avalanche clump) reached player q
function snowHit(b, q) {
  const st = G.mst, v = q.id, s = st.pl[v], qx = q.x + q.w / 2, qy = q.y + q.h / 2;
  if (s.safe > 0) { puff(b.x, b.y, 6, 'rgba(255,255,255,0.9)'); Sfx.play('snowSplat'); return; } // blinking: it just splats
  if (s.catchT > 0 && b.k >= 0 && !b.mega && ((b.x - qx) * q.face > -4 || (b.vy > 0 && b.y < snowBox(q).y + 4 && Math.abs(b.x - qx) < 13))) {
    s.hand = 1; s.catchT = 0; s.catchCD = 0; s.cd = SNOW.catchThrowCD; s.refill = s.pack = 0; s.caughtT = 0.3;
    st.catches[v]++;
    burst(b.x, b.y, '#ffffff', 8);
    snowFx('catch', 'CATCH!', qx, q.y - 14, 0.6, v);
    Sfx.play('snowCatch', v); rumble(v, 0.2, 0.5, 80);
    return;
  }
  const n = b.mega ? SNOW.megaHits : 1, hatsOn = Math.max(0, s.hats - s.hits);
  s.hits += n; s.lastBy = b.mega ? 'mega' : b.roof ? 'roof' : b.k < 0 ? 'clump' : 'ball'; s.hitPop = 0.35;
  if (hatsOn > 0) { // the pom-pom pops off and soaks the hit
    burst(qx, q.y - 6, '#ffffff', 10); burst(qx, q.y - 6, PCOL[v], 4); Sfx.play('snowHat'); s.hatPop = 0.4;
  }
  const dir = Math.sign(b.vx) || (b.k < 0 ? -q.face : (qx < G.players[b.k].x + G.players[b.k].w / 2 ? -1 : 1));
  if (b.mega) knock(q, dir * SNOW.megaKX, SNOW.megaKY, SNOW.megaStun, SNOW.hitSlide);
  else knock(q, dir * SNOW.hitKX, SNOW.hitKY, SNOW.hitStun, SNOW.hitSlide);
  s.safe = SNOW.safeT; s.hand = 1; s.refill = s.pack = 0; s.catchT = 0; // snow back: your hand refills at once
  snowCancel(s);
  if (b.k >= 0) { st.landed[b.k] += n; st.ballHits[b.k]++; if (b.mega) st.megaHits[b.k]++; rumble(b.k, 0.1, 0.3, 60); }
  if (b.mega) {
    burst(qx, qy, '#ffffff', 26); burst(qx, qy, C.gold, 10);
    if (!reduceMotion) G.shake = 0.2;
    Sfx.play('snowMegaHit'); rumble(v, 0.9, 0.6, 240);
  } else {
    burst(qx, qy, '#ffffff', 14); puff(qx, qy, 6, PCOL[v]);
    Sfx.play('snowHit'); rumble(v, 0.6, 0.4, 140);
  }
}

// a snowball went into a fort brick: chip it (a MEGA smashes it and keeps going)
function snowBrick(b, tx, ty) {
  const st = G.mst, L = G.level, key = ty * COLS + tx;
  st.brickHP[key] = (st.brickHP[key] === undefined ? SNOW.brickHP : st.brickHP[key]) - (b.mega ? 99 : 1);
  if (st.brickHP[key] <= 0) {
    L.grid[ty][tx] = '.';
    for (let i = 0; i < 4; i++) G.particles.push({ x: tx * T + 8 + (i % 2) * 14, y: ty * T + 8 + (i >> 1) * 14, vx: (i % 2 ? 1 : -1) * (60 + Math.random() * 80), vy: -120 - Math.random() * 120, life: 0.7, max: 0.7, col: '#f4f9ff', size: 9, grav: 1400, kind: 'dot' });
    puff(tx * T + T / 2, ty * T + T / 2, 6, 'rgba(255,255,255,0.9)');
    Sfx.play('crumble');
    if (b.k >= 0) { st.bricks[b.k]++; rumble(b.k, 0.15, 0.3, 60); }
    if (b.mega) return true;
  } else { Sfx.play('crack'); }
  b.dead = true;
  puff(b.x, b.y, 5, 'rgba(255,255,255,0.9)');
  return false;
}
// a snowball hit stone: a puff and a white splat mark that fades
function snowSplat(b, px, py, tx, ty) {
  const st = G.mst;
  b.dead = true;
  puff(b.x, b.y, b.k < 0 ? 8 : 6, 'rgba(255,255,255,0.9)');
  Sfx.play('snowSplat');
  const side = Math.floor(px / T) !== tx && Math.floor(py / T) === ty;
  const x = side ? (b.vx > 0 ? tx * T : (tx + 1) * T) : b.x, y = side ? b.y : (b.vy > 0 ? ty * T : (ty + 1) * T);
  st.marks.push({ x, y, side, r: b.r, t: 1.5 });
  if (st.marks.length > 12) st.marks.shift();
}

function snowBalls(dt) {
  const st = G.mst, wind = snowWind(), ps = G.players;
  for (const b of st.balls) {
    if (b.dead) continue;
    const px = b.x, py = b.y;
    b.age += dt; b.n++;
    b.vy += SNOW.ballG * dt; if (b.k >= 0) b.vx += wind * dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.n % 2 === 0) { b.trail.push({ x: px, y: py }); if (b.trail.length > 3) b.trail.shift(); }
    if (b.y > H + 20 || b.x < -20 || b.x > W + 20 || b.age > SNOW.life) { b.dead = true; continue; }
    const tx = Math.floor(b.x / T), ty = Math.floor(b.y / T), ch = tile(tx, ty);
    if (ch === 'P') { if (!snowBrick(b, tx, ty)) continue; }
    else if (ch === '#') { snowSplat(b, px, py, tx, ty); continue; }
    const order = b.k < 0 && (G.tickN & 1) ? [ps[1], ps[0]] : ps; // clumps can hit either player
    for (const q of order) {
      if (q.id === b.k || !q.alive) continue;
      if (snowCircRect(b.x, b.y, b.r, snowBox(q))) { b.dead = true; snowHit(b, q); break; }
    }
  }
  // Pip's and Bo's snowballs meet in the air: both burst (a MEGA wins)
  for (const a of st.balls) {
    if (a.dead || a.k !== 0) continue;
    for (const c of st.balls) {
      if (a.dead) break;
      if (c.dead || c.k !== 1) continue;
      const dx = a.x - c.x, dy = a.y - c.y, rr2 = (a.r + c.r) * (a.r + c.r);
      if (dx * dx + dy * dy >= rr2) continue;
      if (a.mega && !c.mega) c.dead = true; else if (c.mega && !a.mega) a.dead = true; else { a.dead = true; c.dead = true; }
      const mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2;
      burst(mx, my, '#ffffff', 12); puff(mx - 6, my, 4, 'rgba(255,255,255,0.9)'); puff(mx + 6, my, 4, 'rgba(255,255,255,0.9)');
      snowFx('poof', 'POOF', mx, my - 10, 0.4);
      Sfx.play('snowClash');
      st.clashes++;
    }
  }
  st.balls = st.balls.filter(b => !b.dead);
}

function snowAnim(dt) {
  const st = G.mst;
  st.vt += dt;
  if (st.twist === 'windy') st.windX += st.wind.dir * dt;
  st.wind.bounce = Math.max(0, st.wind.bounce - dt);
  for (const m of st.marks) m.t -= dt;
  if (st.marks.length && st.marks[0].t <= 0) st.marks = st.marks.filter(m => m.t > 0);
  for (const f of st.fx) f.t -= dt;
  if (st.fx.length) st.fx = st.fx.filter(f => f.t > 0);
  if (st.mega) st.mega.t += dt;
  for (const s of st.pl) {
    s.hitPop = Math.max(0, s.hitPop - dt); s.hatPop = Math.max(0, s.hatPop - dt); s.caughtT = Math.max(0, s.caughtT - dt);
    s.fullT = Math.max(0, s.fullT - dt); s.emptyT = Math.max(0, s.emptyT - dt);
    if (s.frozen) s.frozenT += dt;
    if (s.hint) { // the "make snow" bubble fades out as soon as you hold a snowball again (or wind up)
      if (s.hand > 0 || s.mega || s.hold >= 0) s.hint.t = Math.min(s.hint.t, 0.12);
      s.hint.t -= dt; if (s.hint.t <= 0) s.hint = null;
    }
  }
}

// "S to make snow!" over a player who pressed throw with empty hands (twice a match)
function snowHint(p) {
  const st = G.mst, k = p.id;
  if (st.hintShown[k] >= SNOW.hints) return;
  st.hintShown[k]++;
  const how = actKey(k), key = how === 'pad' ? 'Down' : how === 'touch' ? '▼' : (k === 0 ? 'S' : '↓');
  st.pl[k].hint = { text: key + ' to make snow!', t: 1.2 };
}

/* ----- drawing ----- */
function snowFlake(x, y, r, col, lw) {
  ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI / 3 + Math.PI / 2, c = Math.cos(a) * r, s = Math.sin(a) * r;
    ctx.moveTo(x - c, y - s); ctx.lineTo(x + c, y + s);
    for (const e of [-1, 1]) { // little V tips
      const tx = x + e * c * 0.62, ty = y + e * s * 0.62, b = a + Math.PI / 2;
      ctx.moveTo(tx + Math.cos(b) * r * 0.28 + e * c * 0.2, ty + Math.sin(b) * r * 0.28 + e * s * 0.2); ctx.lineTo(tx, ty);
      ctx.lineTo(tx - Math.cos(b) * r * 0.28 + e * c * 0.2, ty - Math.sin(b) * r * 0.28 + e * s * 0.2);
    }
  }
  ctx.stroke(); ctx.lineCap = 'butt';
}
function snowDrawBall(b) {
  const r = b.r;
  if (b.k < 0) { // avalanche clump: a lumpy blob
    ctx.fillStyle = SNOW_INK + '0.22)'; circle(b.x + 2, b.y + 3, r + 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#8aa3c6'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(b.x - 4, b.y + 1, r * 0.75, 0, Math.PI * 2); ctx.arc(b.x + 4, b.y + 2, r * 0.7, 0, Math.PI * 2); ctx.arc(b.x, b.y - 3, r * 0.8, 0, Math.PI * 2);
    ctx.stroke(); ctx.fill();
    ctx.fillStyle = '#dbe7f4'; circle(b.x + 3, b.y + 4, r * 0.4); ctx.fill();
    return;
  }
  // a faint 3-dot trail (gold sparkles for comeback snowballs)
  b.trail.forEach((t, i) => {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + i * 0.15) + ')'; circle(t.x, t.y, r * (0.45 + i * 0.12)); ctx.fill();
    if (b.spark && i > 0) { ctx.fillStyle = C.gold; circle(t.x + Math.sin(b.age * 30 + i) * 4, t.y + Math.cos(b.age * 30 + i) * 4, 1.8); ctx.fill(); }
  });
  if (b.mega) { snowDrawMega(b.x, b.y, r, b.age); return; }
  snowBallShape(b.x, b.y, r, PDARK[b.k], b.age * 14 * Math.sign(b.vx || 1) + b.spin);
}
// a white snowball with a lower-right shade, a dark outline and a drop shadow, so it reads on the pale sky too
function snowBallShape(x, y, r, edge, spin) {
  ctx.fillStyle = SNOW_INK + '0.3)'; circle(x + 1.5, y + 2, r + 1.2); ctx.fill();
  ctx.fillStyle = '#d6e4f2'; circle(x, y, r); ctx.fill();
  ctx.fillStyle = '#ffffff'; circle(x - r * 0.2, y - r * 0.2, r * 0.8); ctx.fill();
  ctx.strokeStyle = edge; ctx.lineWidth = 2; circle(x, y, r); ctx.stroke();
  if (spin !== undefined) { ctx.fillStyle = 'rgba(160,185,215,0.9)'; circle(x + Math.cos(spin) * r * 0.5, y + Math.sin(spin) * r * 0.5, Math.max(1.2, r * 0.18)); ctx.fill(); }
}
function snowDrawMega(x, y, r, t) {
  ctx.fillStyle = SNOW_INK + '0.3)'; circle(x + 2, y + 3, r + 1.5); ctx.fill();
  ctx.fillStyle = '#d6e4f2'; circle(x, y, r); ctx.fill();
  ctx.fillStyle = '#ffffff'; circle(x - r * 0.18, y - r * 0.18, r * 0.8); ctx.fill();
  ctx.strokeStyle = C.gold; ctx.lineWidth = 3; circle(x, y, r); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.95)'; circle(x - r * 0.42, y - r * 0.42, r * 0.16); ctx.fill(); // shine
  for (let i = 0; i < 4; i++) { // twinkles orbit clear of the gold rim
    const a = t * 2.2 + i * Math.PI / 2, d = r + 10, s = 1.7 + 1.0 * Math.sin(t * 9 + i * 1.7);
    const sx = x + Math.cos(a) * d, sy = y + Math.sin(a) * d;
    ctx.fillStyle = i % 2 ? '#ffffff' : C.gold;
    ctx.beginPath(); ctx.moveTo(sx, sy - s * 1.6); ctx.lineTo(sx + s * 0.5, sy); ctx.lineTo(sx, sy + s * 1.6); ctx.lineTo(sx - s * 0.5, sy); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx - s * 1.6, sy); ctx.lineTo(sx, sy + s * 0.5); ctx.lineTo(sx + s * 1.6, sy); ctx.lineTo(sx, sy - s * 0.5); ctx.closePath(); ctx.fill();
  }
}
function snowMitten(x, y, r, k, glow) {
  if (glow) { ctx.fillStyle = 'rgba(255,197,61,0.5)'; circle(x, y, r + 3.5); ctx.fill(); }
  ctx.fillStyle = PCOL[k]; ctx.strokeStyle = PDARK[k]; ctx.lineWidth = 1.8;
  circle(x, y, r); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff'; rr(x - r * 0.85, y + r * 0.35, r * 1.7, r * 0.7, r * 0.3); ctx.fill();
}
function snowDrawHat(cx, top, w, k, n, pop) {
  // a knitted bobble hat in the player's colour, one pom-pom per hat
  const hw = w * 0.44;
  ctx.fillStyle = PDARK[k]; ctx.beginPath(); ctx.ellipse(cx, top + 4, hw, 10, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = PCOL[k]; ctx.lineWidth = 2;
  for (const dx of [-hw * 0.45, 0, hw * 0.45]) { ctx.beginPath(); ctx.moveTo(cx + dx, top + 3); ctx.lineTo(cx + dx * 0.7, top - 4); ctx.stroke(); }
  ctx.fillStyle = '#ffffff'; rr(cx - hw - 1, top + 1, hw * 2 + 2, 5, 2.5); ctx.fill();
  ctx.fillStyle = PCOL[k]; for (let i = 0; i < 5; i++) { ctx.fillRect(cx - hw + 1 + i * hw * 0.42, top + 2, 1.5, 3); }
  const s = 1 + (pop || 0);
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#c9d8ea'; ctx.lineWidth = 1.5;
  const poms = n > 1 ? [-4.5, 4.5] : [0];
  for (const dx of poms) { circle(cx + dx, top - 8, 4.6 * s); ctx.fill(); ctx.stroke(); }
}
function snowDrawSnowman(p, s) {
  const k = p.id, cx = p.x + p.w / 2, by = p.y + p.h, f = p.face || 1;
  const t = Math.min(1, s.frozenT / 0.3), sq = 1.3 - 0.3 * (1 - (1 - t) * (1 - t));
  ctx.save(); ctx.translate(cx, by); ctx.scale(sq, 2 - sq);
  ctx.fillStyle = SNOW_INK + '0.18)'; ctx.beginPath(); ctx.ellipse(0, 0, 17, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  const ball = (y, r) => {
    ctx.fillStyle = '#dbe7f4'; circle(0, y, r); ctx.fill();
    ctx.fillStyle = '#ffffff'; circle(-r * 0.15, y - r * 0.15, r * 0.84); ctx.fill();
    ctx.strokeStyle = '#97adca'; ctx.lineWidth = 2; circle(0, y, r); ctx.stroke();
  };
  if (k === 1) { ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#97adca'; ctx.lineWidth = 2; for (const ex of [-8, 8]) { circle(ex, -48, 5.5); ctx.fill(); ctx.stroke(); } }
  ball(-16, 16);
  ball(-39, 11.5);
  if (k === 0) { // Pip's sprout pokes out of the snow
    ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(1, -56); ctx.stroke();
    ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(5, -58, 6, 3, -0.5, 0, Math.PI * 2); ctx.fill();
  }
  // scarf in the player's colour
  ctx.fillStyle = PCOL[k]; rr(-11, -31, 22, 6, 3); ctx.fill();
  ctx.fillStyle = PDARK[k]; rr(-f * 7 - 3, -28, 6, 13, 2.5); ctx.fill();
  // buttons, eyes, carrot nose
  ctx.fillStyle = C.ink; circle(0, -17, 1.8); ctx.fill(); circle(0, -10, 1.8); ctx.fill();
  for (const ex of [-4, 4]) { circle(ex + f * 1.5, -42, 2.1); ctx.fill(); }
  ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.moveTo(f * 2, -40); ctx.lineTo(f * 14, -37.5); ctx.lineTo(f * 2, -35.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,120,140,0.45)'; circle(-7 + f, -36, 2.2); ctx.fill(); circle(7 + f, -36, 2.2); ctx.fill();
  ctx.restore();
}
// the snow, hat, mittens and snowball drawn over a player
function snowDrawPlayer(p) {
  const st = G.mst, k = p.id, s = st.pl[k];
  if (!p.alive) return;
  if (s.frozen) { snowDrawSnowman(p, s); return; }
  const w = p.w * p.sx, h = p.h * p.sy, cx = p.x + p.w / 2, by = p.y + p.h, top = by - h, f = p.face;
  // snow packed on: boots, belly, neck (hats soak the first hits)
  const snow = Math.max(0, s.hits - s.hats) / SNOW.hitsToFreeze, lay = snow >= 0.75 ? 20 : snow >= 0.5 ? 14 : snow >= 0.25 ? 7 : 0;
  if (lay) {
    const lh = lay * p.sy;
    ctx.save(); rr(cx - w / 2, top, w, h, 8); ctx.clip();
    const edge = () => { for (let i = 0; i <= 6; i++) ctx.lineTo(cx - w / 2 - 2 + (w + 4) * i / 6, by - lh + Math.sin(i * 2.1 + k * 1.7 + lay) * 1.6); };
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(cx - w / 2 - 2, by + 2); edge(); ctx.lineTo(cx + w / 2 + 2, by + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c4d8ec'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - w / 2 - 2, by - lh + 3); edge(); ctx.stroke();
    ctx.fillStyle = 'rgba(160,190,225,0.35)'; ctx.fillRect(cx - w / 2, by - 3, w, 3);
    ctx.restore();
    if (lay >= 20) { // a lump of snow on the head
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#c4d8ec'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(cx + 2, top + 1, 7.5, 4, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      circle(cx - 3, top, 3); ctx.fill();
    }
  }
  // blinking after a hit: a frosty flash
  if (s.safe > 0 && Math.floor(s.safe / 0.08) % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; rr(cx - w / 2, top, w, h, 8); ctx.fill(); }
  const hatsOn = Math.max(0, s.hats - s.hits);
  if (hatsOn > 0) snowDrawHat(cx, top, w, k, hatsOn, 0);
  // mittens (bigger and glowing with the comeback)
  const b = st.b[k], mr = 4 * (1 + 0.5 * b), glow = b >= 0.3, hy = by - h * 0.42;
  const ballR = Math.min(9, snowRadius(k) * 0.7);
  if (s.catchT > 0 || s.caughtT > 0) { // big mittens open in front (snap shut on a catch)
    const open = s.caughtT > 0 ? 0 : 1, fx = cx + f * (w / 2 + 8);
    snowMitten(cx - f * (w / 2 + 1), hy, mr, k, glow);
    snowMitten(fx, hy - 4 - 5 * open, 7, k, glow);
    snowMitten(fx + f * 2 * open, hy + 5 * open, 7, k, glow);
    if (s.caughtT > 0) snowBallShape(fx + f * 6, hy - 1, ballR, PDARK[k]);
  } else if (s.mega) { // the MEGA snowball held over the head with both arms
    const wind = s.hold >= 0 ? s.charge : 0, mx = cx - f * 6 * wind, my = top - 15 - 3 * wind;
    snowMitten(cx - w / 2 + 1, top - 3, mr, k, glow); snowMitten(cx + w / 2 - 1, top - 3, mr, k, glow);
    snowDrawMega(mx, my, SNOW.rMega * 0.8, st.vt);
  } else {
    snowMitten(cx - f * (w / 2 + 1), hy, mr, k, glow);
    let hx = cx + f * (w / 2 + 1), hy2 = hy;
    if (s.hold >= 0) { const c = s.hold < SNOW.tapT ? 0 : s.charge; hx = cx - f * (w / 2 + 1 + 3 * c); hy2 = top + 3 - 7 * c; } // arm cocked back
    else if (s.duck) { hx = cx + f * (w / 2 - 1); hy2 = by - 3; }
    snowMitten(hx, hy2, mr, k, glow);
    if (s.hand > 0) {
      const c = s.hold >= SNOW.tapT ? s.charge : 0;
      ctx.save(); ctx.translate(hx + f * 1.5, hy2 - mr - ballR * 0.6); ctx.scale(1 + 0.25 * c, 1 - 0.18 * c);
      snowBallShape(0, 0, ballR * (1 + 0.15 * c), PDARK[k]); ctx.restore();
    }
  }
  // empty hands: a ring over the head fills until the next snowball (gold while packing)
  if (s.hand <= 0 && !s.mega) {
    const packing = s.duck && s.pack > 0, prog = packing ? s.pack / SNOW.packT : s.refill / snowRefillT(k);
    const rx = cx + (s.emptyT > 0 ? Math.sin(s.emptyT * 60) * 2 : 0), ry = top - 15 - (hatsOn ? 9 : 0);
    ctx.lineWidth = 3; ctx.strokeStyle = SNOW_INK + '0.4)'; circle(rx, ry, 7); ctx.stroke();
    ctx.lineWidth = 2.2; ctx.strokeStyle = packing ? C.gold : '#ffffff';
    ctx.beginPath(); ctx.arc(rx, ry, 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(prog, 0, 1)); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; circle(rx, ry, 2.2); ctx.fill();
  }
}
// the dotted arc of a held throw, exactly where it will fly, plus the shared charge ring
function snowDrawAim(p) {
  const st = G.mst, s = st.pl[p.id], k = p.id;
  if (s.hold < SNOW.tapT || !p.alive) return;
  const full = s.charge >= 1, warn = full && s.autoT > SNOW.autoThrowT - 0.5, flash = warn && Math.floor(s.autoT * 10) % 2 === 1;
  const all = snowPath(snowLaunch(p, s.charge, snowAimW(s.charge)), SNOW.arcT, snowWind(), 1);
  // where the snowball would meet the other player (the arc itself ignores players: it shows the free flight)
  const o = other(p), ob = snowBox(o), r = s.mega ? SNOW.rMega : snowRadius(k);
  const meet = o.alive && !st.pl[o.id].frozen ? all.findIndex(q => !q.end && snowCircRect(q.x, q.y, r, ob)) : -1;
  const pts = all.filter((q, i) => q.end || (i + 1) % 4 === 0);
  const n = pts.length, shake = warn && !reduceMotion ? 1.5 : 0; // C2: the arc shakes in the last 0.5 s before the auto-throw
  const ring = (x, y, a) => {
    ctx.globalAlpha = a;
    ctx.strokeStyle = SNOW_INK + '0.35)'; ctx.lineWidth = 4; circle(x, Math.min(y, H - 4), 7); ctx.stroke();
    ctx.strokeStyle = flash ? '#ffffff' : PCOL[k]; ctx.lineWidth = 2; circle(x, Math.min(y, H - 4), 7); ctx.stroke();
    ctx.globalAlpha = 1;
  };
  for (let i = 0; i < n; i++) {
    const q = pts[i]; if (q.end) break;
    const past = meet >= 0 && q.t > all[meet].t; // dots past the other player are faint
    ctx.globalAlpha = (0.9 - 0.6 * i / Math.max(1, n - 1)) * (past ? 0.35 : 1);
    ctx.fillStyle = flash ? '#ffffff' : PCOL[k];
    circle(q.x + shake * Math.sin(st.vt * 50 + i), q.y + shake * Math.cos(st.vt * 45 + i * 2), 3); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const e = pts[n - 1];
  if (e && e.end) ring(e.x, e.y, meet >= 0 ? 0.35 : 1);
  if (meet >= 0) { // it would hit them: a ring on them, and a little pulse
    const m = all[meet];
    ring(m.x, m.y, 1);
    ctx.strokeStyle = flash ? '#ffffff' : PCOL[k]; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(st.vt * 12);
    circle(m.x, m.y, 11 + Math.sin(st.vt * 12) * 1.5); ctx.stroke(); ctx.globalAlpha = 1;
  }
  // the charge ring (same look in every World 4 level)
  const rx = p.x + p.w / 2, ry = p.y + p.h / 2;
  ctx.lineWidth = 3;
  ctx.strokeStyle = SNOW_INK + '0.35)'; circle(rx, ry, 20); ctx.stroke();
  ctx.strokeStyle = !full ? PCOL[k] : s.fullT > 0 || flash ? '#ffffff' : C.gold;
  ctx.beginPath(); ctx.arc(rx, ry, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.charge); ctx.stroke();
}
function snowDrawDecor() {
  // a snowy pine in Pip's corner and a little snowman (with a bucket hat, so nobody mistakes it for a player) in Bo's
  const pine = (x, y, s) => {
    ctx.fillStyle = '#6b4a35'; ctx.fillRect(x - 3 * s, y - 12 * s, 6 * s, 12 * s);
    for (let i = 0; i < 3; i++) {
      const ty = y - 10 * s - i * 15 * s, hw = (22 - i * 5) * s;
      ctx.fillStyle = '#2f7a68'; ctx.beginPath(); ctx.moveTo(x - hw, ty); ctx.lineTo(x, ty - 24 * s); ctx.lineTo(x + hw, ty); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f8fcff'; ctx.beginPath(); ctx.moveTo(x - hw * 0.55, ty - 10 * s); ctx.lineTo(x, ty - 24 * s); ctx.lineTo(x + hw * 0.55, ty - 10 * s);
      ctx.quadraticCurveTo(x, ty - 6 * s, x - hw * 0.55, ty - 10 * s); ctx.fill();
    }
  };
  pine(50, SNOW.floorY, 1);
  const x = 908, y = SNOW.floorY;
  ctx.fillStyle = SNOW_INK + '0.15)'; ctx.beginPath(); ctx.ellipse(x, y, 14, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#6b4a35'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 7, y - 26); ctx.lineTo(x - 19, y - 33); ctx.moveTo(x + 7, y - 26); ctx.lineTo(x + 18, y - 35); ctx.stroke();
  for (const [yy, r] of [[-11, 11], [-29, 8]]) {
    ctx.fillStyle = '#ffffff'; circle(x, y + yy, r); ctx.fill(); ctx.strokeStyle = '#a6bad4'; ctx.lineWidth = 1.5; circle(x, y + yy, r); ctx.stroke();
  }
  ctx.fillStyle = '#7f8fb0'; ctx.beginPath(); ctx.moveTo(x - 8, y - 35); ctx.lineTo(x + 8, y - 35); ctx.lineTo(x + 6, y - 46); ctx.lineTo(x - 6, y - 46); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.ink; circle(x - 3, y - 30, 1.4); ctx.fill(); circle(x + 3, y - 30, 1.4); ctx.fill();
  ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.moveTo(x, y - 28); ctx.lineTo(x - 8, y - 26.5); ctx.lineTo(x, y - 25.5); ctx.closePath(); ctx.fill();
}
function snowDrawForts() {
  const st = G.mst, L = G.level;
  for (const f of st.forts) {
    if (L.grid[f.ty][f.tx] !== 'P') continue;
    const x = f.tx * T, y = f.ty * T, key = f.ty * COLS + f.tx, hp = st.brickHP[key] === undefined ? SNOW.brickHP : st.brickHP[key];
    ctx.fillStyle = '#f4f9ff'; ctx.fillRect(x, y, T, T);
    ctx.fillStyle = 'rgba(120,150,190,0.22)'; ctx.fillRect(x + T - 4, y, 4, T); ctx.fillRect(x, y + T - 3, T, 3);
    ctx.fillStyle = '#c3d3e7'; ctx.fillRect(x, y + 14, T, 2); ctx.fillRect(x + 14, y, 2, 14); ctx.fillRect(x + 6, y + 16, 2, 14); ctx.fillRect(x + 22, y + 16, 2, 14);
    ctx.strokeStyle = '#9fb6d3'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.75, y + 0.75, T - 1.5, T - 1.5);
    if (hp <= 2) {
      ctx.strokeStyle = '#7f97ba'; ctx.lineWidth = 1.6; ctx.beginPath();
      ctx.moveTo(x + 9, y + 2); ctx.lineTo(x + 13, y + 9); ctx.lineTo(x + 9, y + 14); ctx.lineTo(x + 14, y + 22);
      if (hp <= 1) { ctx.moveTo(x + 27, y + 18); ctx.lineTo(x + 20, y + 21); ctx.lineTo(x + 22, y + 28); }
      ctx.stroke();
      if (hp <= 1) { ctx.fillStyle = '#c3d3e7'; ctx.beginPath(); ctx.moveTo(x + T - 9, y); ctx.lineTo(x + T, y); ctx.lineTo(x + T, y + 8); ctx.closePath(); ctx.fill(); }
    }
    if (tile(f.tx, f.ty - 1) !== 'P') { // a rounded snow cap on the top brick
      ctx.fillStyle = '#ffffff'; rr(x - 2, y - 4, T + 4, 8, 4); ctx.fill();
      circle(x + 7, y + 4, 3); ctx.fill(); circle(x + 21, y + 4.5, 2.5); ctx.fill();
    }
  }
}
function snowDrawIce() {
  // Ice Rink: a glossy sheet on the ground floor (fort tops, the hill and planks stay snowy)
  for (let tx = 1; tx < COLS - 1; tx++) {
    if (tile(tx, 16) !== '#' || tile(tx, 15) !== '.') continue;
    const x = tx * T;
    ctx.fillStyle = 'rgba(150,212,255,0.7)'; ctx.fillRect(x, SNOW.floorY - 1, T, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x, SNOW.floorY - 1, T, 1.5);
    if (tx % 3 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.moveTo(x + 6, SNOW.floorY + 5); ctx.lineTo(x + 13, SNOW.floorY + 1); ctx.lineTo(x + 16, SNOW.floorY + 1); ctx.lineTo(x + 9, SNOW.floorY + 5); ctx.closePath(); ctx.fill(); }
  }
}
function snowDrawFlakes() {
  const st = G.mst, n = reduceMotion ? 10 : 25;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < n; i++) {
    const h1 = hash(i, 7), h2 = hash(i, 13), sp = 14 + (h1 % 18), x0 = h2 % W, y0 = (h1 >> 6) % H;
    const y = reduceMotion ? y0 : ((y0 + st.vt * sp) % (H + 20)) - 10, x = reduceMotion ? x0 : x0 + Math.sin(st.vt * 0.7 + i) * 14;
    circle(x, y, 1.4 + (h2 % 3) * 0.5); ctx.fill();
  }
  if (st.twist !== 'windy') return;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
  for (let i = 0; i < 40; i++) {
    const h1 = hash(i, 31), sp = 60 + (h1 % 80), span = W + 40;
    const x = (((h1 >> 3) % span + st.windX * sp) % span + span) % span - 20, y = (hash(i, 37) % 470) + 12 + Math.sin(st.vt * 2 + i) * 6;
    ctx.moveTo(x, y); ctx.lineTo(x - st.wind.dir * (5 + sp / 20), y);
  }
  ctx.stroke(); ctx.lineCap = 'butt';
}
function snowDrawShadows() {
  // a shadow on the ground under every falling avalanche clump warns where it lands
  const st = G.mst;
  for (const b of st.balls) {
    if (b.k >= 0) continue;
    const tx = Math.floor(b.x / T);
    for (let ty = Math.max(0, Math.floor(b.y / T) + 1); ty < ROWS; ty++) {
      const ch = tile(tx, ty);
      if (ch !== '=' && ch !== '#' && ch !== 'P') continue;
      const sy = ty * T, a = 0.25 + 0.15 * clamp((b.y - SNOW.avY) / Math.max(1, sy - SNOW.avY), 0, 1);
      ctx.fillStyle = SNOW_INK + (ch === '=' ? a * 0.7 : a) + ')'; ctx.beginPath(); ctx.ellipse(b.x, sy + 1, 12, 3, 0, 0, Math.PI * 2); ctx.fill();
      if (ch !== '=') break;
    }
  }
}
// hiding too long behind your fort: snow starts to trickle down on you, and a shadow grows at your feet (the same
// warning the avalanche clumps give), 1.5 s before the first clump drops
function snowDrawTrickle() {
  const st = G.mst;
  if (!G.match || G.match.phase !== 'live') return;
  for (const p of G.players) {
    const s = st.pl[p.id], a = clamp((s.pk - (SNOW.roofT - SNOW.roofWarn)) / SNOW.roofWarn, 0, 1);
    if (a <= 0 || !p.alive || s.frozen) continue;
    const cx = p.x + p.w / 2, top = SNOW.avY, bot = p.y - 6, n = 5 + Math.round(4 * a);
    ctx.fillStyle = SNOW_INK + (0.14 + 0.2 * a) + ')'; ctx.beginPath(); ctx.ellipse(cx, p.y + p.h + 1, 10 + 5 * a, 3 + a, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < n; i++) {
      const u = (i / n + st.vt * 0.9) % 1, x = cx + Math.sin(i * 2.4 + st.vt * 2) * (5 + 5 * u), y = top + (bot - top) * u;
      const r = (2.6 + 1.8 * a) * (i % 3 === 0 ? 1.5 : 1);
      ctx.fillStyle = SNOW_INK + '0.28)'; circle(x + 0.8, y + 1.2, r + 1); ctx.fill();
      ctx.fillStyle = '#ffffff'; circle(x, y, r); ctx.fill();
    }
  }
}
// phones (hudBig(): the stage is drawn under 0.6 of its size): the mode's HUD draws bigger, scaled about an anchor
function snowBig(ax, ay, S, fn) { if (S === 1) { fn(); return; } ctx.save(); ctx.translate(ax, ay); ctx.scale(S, S); ctx.translate(-ax, -ay); fn(); ctx.restore(); }
function snowChip(label, col, arrow) {
  ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
  const tw = ctx.measureText(label).width, w = tw + 28 + (arrow ? 30 : 0), x0 = pill(W - 14, 12, w, 28, 'right');
  if (!arrow) { text(label, x0 + w / 2, 26.5, 14, col, 'center', 'body'); return; }
  const st = G.mst, d = st.wind.dir, bo = Math.sin(st.wind.bounce / 0.4 * Math.PI) * 4;
  const tx = d > 0 ? x0 + 14 : x0 + 44, ax = d > 0 ? x0 + 14 + tw + 16 + bo : x0 + 28 - bo;
  text(label, tx, 26.5, 14, col, 'left', 'body');
  ctx.strokeStyle = C.gold; ctx.fillStyle = C.gold; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(ax - d * 10, 26); ctx.lineTo(ax + d * 6, 26); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(ax + d * 12, 26); ctx.lineTo(ax + d * 4, 20); ctx.lineTo(ax + d * 4, 32); ctx.closePath(); ctx.fill();
}
function snowMeter(k) {
  const st = G.mst, s = st.pl[k], right = k === 1, slotW = 21, mitt = st.b[k] >= 0.3;
  ctx.font = '16px "Lilita One", "Arial Rounded MT Bold", sans-serif';
  const nw = ctx.measureText(NAMES[k]).width, w = 14 + nw + 10 + s.need * slotW + 20 + (mitt ? 22 : 0) + 6;
  const x0 = pill(right ? W - 14 : 14, 505, w, 28, right ? 'right' : 'left'), cy = 519;
  text(NAMES[k], right ? x0 + w - 14 : x0 + 14, cy + 0.5, 16, PCOL[k], right ? 'right' : 'left');
  const slotX = i => (right ? x0 + w - 14 - nw - 10 - slotW / 2 - i * slotW : x0 + 14 + nw + 10 + slotW / 2 + i * slotW);
  for (let i = 0; i < s.need; i++) {
    const x = slotX(i), hit = i < s.hits, fresh = hit && i >= s.hits - (s.lastBy === 'mega' ? 2 : 1) && s.hitPop > 0;
    const sc = fresh ? 1 + 0.6 * Math.sin(s.hitPop / 0.35 * Math.PI) : 1;
    if (i < s.hats) { // a hat slot: a little pom-pom hat, gone once it soaked a hit
      if (hit) { ctx.strokeStyle = 'rgba(246,239,223,0.3)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, cy + 3, 6.5, 6, 0, Math.PI, 0); ctx.closePath(); ctx.stroke(); }
      else {
        ctx.fillStyle = PCOL[k]; ctx.beginPath(); ctx.ellipse(x, cy + 4, 7, 7, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 7.5, cy + 2, 15, 3.5); circle(x, cy - 5, 3.6); ctx.fill();
      }
      continue;
    }
    if (hit) {
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; circle(x, cy, 9 * sc); ctx.fill();
      snowFlake(x, cy, 7.5 * sc, '#ffffff', 2.2);
    } else snowFlake(x, cy, 6.5, 'rgba(246,239,223,0.32)', 1.6);
  }
  { // the meter ends in a little snowman: a full meter turns you into one
    const sx = slotX(s.need) + (right ? 2 : -2), on = s.frozen, a = on ? 1 : 0.55;
    ctx.fillStyle = on ? '#ffffff' : 'rgba(246,239,223,' + a * 0.5 + ')'; ctx.strokeStyle = 'rgba(246,239,223,' + a + ')'; ctx.lineWidth = 1.4;
    circle(sx, cy + 4, 5.5); ctx.fill(); ctx.stroke(); circle(sx, cy - 5, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = on ? '#ff8a2a' : 'rgba(255,138,42,0.8)'; ctx.beginPath(); ctx.moveTo(sx, cy - 6); ctx.lineTo(sx + (right ? -6 : 6), cy - 4.8); ctx.lineTo(sx, cy - 3.8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PCOL[k]; ctx.fillRect(sx - 4.5, cy - 1.6, 9, 2.4); // scarf
  }
  if (mitt) { // comeback mittens are on
    const mx = right ? x0 + 6 + 11 : x0 + w - 6 - 11;
    ctx.fillStyle = 'rgba(255,197,61,0.3)'; circle(mx, cy, 10); ctx.fill();
    ctx.fillStyle = C.gold; rr(mx - 5, cy - 7, 10, 12, 5); ctx.fill(); circle(mx + (right ? 5 : -5), cy - 1, 3); ctx.fill();
    ctx.fillStyle = '#ffffff'; rr(mx - 5.5, cy + 4, 11, 4, 2); ctx.fill();
  }
}

MODES.snow = {
  rand: Math.random,
  // test/bot helpers (not used by other modes)
  K: SNOW, launch: snowLaunch, aimW: snowAimW, path: snowPath, box: snowBox, circRect: snowCircRect, solidAt: snowSolidAt, wind: snowWind,
  setup(st, L) {
    st.forts = []; st.megaC = { x: W / 2, y: 405 }; st.megaSide = [null, null];
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
      const ch = L.grid[ty][tx];
      if (ch === 'f') { st.forts.push({ tx, ty }); L.grid[ty][tx] = 'P'; L.blockCol[ty][tx] = '#eaf3fb'; }
      else if (ch === 'm') { st.megaC = { x: (tx + 1) * T, y: ty * T + 15 }; L.grid[ty][tx] = '.'; }
      else if (ch === 'n') { const sp = { x: (tx + 1) * T, y: ty * T + 15 }; st.megaSide[sp.x < W / 2 ? 0 : 1] = sp; L.grid[ty][tx] = '.'; }
    }
    st.megaSide = st.megaSide.map(sp => sp || st.megaC);
    st.landed = [0, 0]; st.ballHits = [0, 0]; st.throws = [0, 0]; st.catches = [0, 0]; st.megaHits = [0, 0]; st.bricks = [0, 0];
    st.clashes = 0; st.avalancheRounds = 0; st.hintShown = [0, 0]; st.megaSpawns = 0; st.hatRounds = 0;
    st.vt = 0; st.windX = 0; st.sawPause = false; st.b = [0, 0];
  },
  resetRound(n, info) {
    const st = G.mst, L = G.level;
    for (const f of st.forts) { L.grid[f.ty][f.tx] = 'P'; L.blockCol[f.ty][f.tx] = '#eaf3fb'; }
    st.brickHP = {};
    st.twist = SNOW_TWISTS[(n - 1) % SNOW_TWISTS.length];
    st.sudden = !!info.suddenDeath;
    st.t = 0; st.balls = []; st.mega = null; st.megaNext = SNOW.megaFirst;
    st.wind = { dir: MODES.snow.rand() < 0.5 ? -1 : 1, t: SNOW.windFlip, bounce: 0 };
    st.av = { on: false, next: [0, 0] };
    st.marks = []; st.fx = []; st.sawPause = false;
    st.b = [snowCB(0), snowCB(1)];
    st.pl = [0, 1].map(k => {
      const b = st.b[k], behind = info.wins[1 - k] - info.wins[k];
      const hats = st.sudden ? 0 : b >= SNOW.hatAt ? (b >= 0.999 && behind >= 2 ? 2 : 1) : 0, ls = !st.sudden && behind <= -2 ? SNOW.leadSnow : 0;
      return { hand: 1, refill: 0, pack: 0, packPuff: 0, cd: 0, safe: 0, catchT: 0, catchCD: 0, caughtT: 0, emptyT: 0,
        hold: -1, charge: 0, autoT: 0, full: false, fullT: 0, tickT: 0.1, mega: false, duck: false, saved: null,
        hits: ls, ls, hats, need: st.sudden ? 1 : SNOW.hitsToFreeze + hats, pv: 0, lastBy: '', hitPop: 0, hatPop: 0,
        frozen: false, frozenT: 0, popped: false, hint: null, pk: 0, roofT: 0, roofN: 0 };
    });
    if (st.pl.some(s => s.hats)) st.hatRounds++;
  },
  go() {
    const st = G.mst; // comeback pops: a gold "Bobble hat!" over whoever starts the round with one, a white "Leader: 1 snow!"
    for (const p of G.players) { // over a player 2+ rounds ahead who starts with a layer on (a handicap, so not gold)
      const s = st.pl[p.id];
      if (s.hats) { snowFx('pop', s.hats > 1 ? 'Two bobble hats!' : 'Bobble hat!', 0, 0, 0.9, p.id); s.popped = true; }
      if (s.hits > 0 && !st.sudden) { snowFx('pop', 'Leader: ' + s.hits + ' snow!', 0, 0, 1.1, p.id); st.fx[st.fx.length - 1].col = '#ffffff'; s.popped = true; }
    }
  },
  pre(dt) {
    const st = G.mst;
    st.t += dt;
    if (st.sawPause) { // released throw while paused: drop that windup silently (keep the snowball)
      for (const p of G.players) { const s = st.pl[p.id]; if (s.hold >= 0 && !p.input.act) snowCancel(s); }
      st.sawPause = false;
    }
    st.b = [snowCB(0), snowCB(1)];
    for (const p of G.players) {
      const k = p.id, s = st.pl[k];
      s.cd = Math.max(0, s.cd - dt); s.safe = Math.max(0, s.safe - dt); s.catchCD = Math.max(0, s.catchCD - dt);
      if (s.catchT > 0) { s.catchT -= dt; if (s.catchT <= 0) { s.catchT = 0; Sfx.play('snowMiss', k); } }
      if (!s.popped && st.b[k] >= 0.3) { snowFx('pop', 'Snow mittens!', 0, 0, 0.9, k); s.popped = true; }
      // throw button: a fresh press starts a windup (or, with empty hands, a catch); never buffered
      if (p.pendingAct) {
        p.pendingAct = false;
        if (p.alive && p.stun <= 0 && s.hold < 0) {
          if (s.mega || s.hand > 0) { if (s.cd <= 0) { snowCancel(s); s.hold = 0; } }
          else {
            snowHint(p);
            if (s.catchCD <= 0) { s.catchT = SNOW.catchWin; s.catchCD = SNOW.catchCD; }
            else { Sfx.play('snowEmpty', k); s.emptyT = 0.25; }
          }
        }
      }
      if (s.hold >= 0) {
        if (!p.alive || p.stun > 0) snowCancel(s); // knocked out of the windup: the snowball stays in hand
        else {
          s.hold += dt;
          s.charge = s.hold < SNOW.tapT ? 0 : clamp((s.hold - SNOW.tapT) / SNOW.chargeT, 0, 1);
          if (s.charge > 0 && s.charge < 1) { s.tickT -= dt; if (s.tickT <= 0) { s.tickT = 0.1; Sfx.tone((300 + 400 * s.charge) * (k ? 0.84 : 1), 0.05, 'square', 0.02); } }
          if (s.charge >= 1) {
            if (!s.full) { s.full = true; s.fullT = 0.1; Sfx.play('snowReady', k); rumble(k, 0, 0.25, 50); }
            s.autoT += dt;
          }
          if (!p.input.act || s.autoT >= SNOW.autoThrowT) snowThrow(p);
        }
      }
      // duck: on solid ground only (on a plank ▼ is left alone, so the engine drops you through)
      s.duck = p.alive && p.input.down && p.grounded && p.tileGround && !p.onOneWay && !p.onPartner && s.hold < 0 && p.stun <= 0;
      if (s.duck) { // you can still turn around while ducking, just not walk
        if (p.input.left !== p.input.right) p.face = p.input.right ? 1 : -1;
        s.saved = [p.input.left, p.input.right]; p.input.left = p.input.right = false;
      }
      // an empty hand refills by itself, faster while ducking
      if (s.hand <= 0) {
        s.refill += dt;
        if (s.duck) {
          s.pack += dt; s.packPuff -= dt;
          if (s.packPuff <= 0) { s.packPuff = 0.15; puff(p.x + p.w / 2 + p.face * 9, p.y + p.h - 2, 2, 'rgba(255,255,255,0.9)'); }
        } else s.pack = 0;
        if (s.pack >= SNOW.packT || s.refill >= snowRefillT(k)) {
          if (s.pack >= SNOW.packT) Sfx.play('snowPack', k);
          s.hand = 1; s.refill = s.pack = 0;
          puff(p.x + p.w / 2 + p.face * 10, p.y + p.h * 0.5, 3, 'rgba(255,255,255,0.9)');
        }
      } else { s.refill = 0; s.pack = 0; }
      s.pv = p.vx;
    }
  },
  step(dt) {
    const st = G.mst;
    for (const p of G.players) {
      const s = st.pl[p.id];
      if (s.saved) { p.input.left = s.saved[0]; p.input.right = s.saved[1]; s.saved = null; }
      if (!p.alive) continue;
      if (st.twist === 'icy' && p.grounded && Math.abs(p.y + p.h - SNOW.floorY) < 1 && p.knockT <= 0) p.vx = s.pv + (p.vx - s.pv) * SNOW.iceGrip;
      if (s.hold >= 0 && p.knockT <= 0) { const lim = PHYS.maxRun * SNOW.chargeMove; p.vx = clamp(p.vx, -lim, lim); }
    }
    if (st.twist === 'windy') {
      st.wind.t -= dt;
      if (st.wind.t <= 0) { st.wind.t = SNOW.windFlip; st.wind.dir *= -1; st.wind.bounce = 0.4; Sfx.play('snowWind'); }
    }
    snowBalls(dt);
    // the MEGA snowball: 15 s in, on the side of whoever took more hits this round (the middle when even; a leader's start snow does not count)
    if (!st.mega && st.t >= st.megaNext && !st.pl.some(s => s.mega) && !st.balls.some(b => b.mega)) {
      const d = (st.pl[0].hits - st.pl[0].ls) - (st.pl[1].hits - st.pl[1].ls), sp = d === 0 ? st.megaC : st.megaSide[d > 0 ? 0 : 1];
      st.mega = { x: sp.x, y: sp.y, t: 0 }; st.megaSpawns++;
      Sfx.play('snowMega'); burst(sp.x, sp.y, C.gold, 12);
    }
    if (st.mega) {
      const m = st.mega, got = G.players.filter(p => p.alive && snowCircRect(m.x, m.y, SNOW.pickR, p));
      if (got.length) {
        const dd = p => Math.hypot(p.x + p.w / 2 - m.x, p.y + p.h / 2 - m.y);
        const p = got.length === 1 ? got[0] : dd(got[0]) === dd(got[1]) ? got[G.tickN & 1] : dd(got[0]) < dd(got[1]) ? got[0] : got[1];
        st.pl[p.id].mega = true; st.mega = null;
        Sfx.play('snowMega'); burst(m.x, m.y, C.gold, 14); rumble(p.id, 0.2, 0.4, 90);
      }
    }
    // the avalanche: from 35 s, snow clumps drop on both players, faster and faster
    if (st.t >= SNOW.avalancheAt) {
      if (!st.av.on) {
        const first = MODES.snow.rand() < 0.5 ? 0 : 1;
        st.av.on = true; st.av.next = [0, 0]; st.av.next[1 - first] = SNOW.avEvery / 2; st.avalancheRounds++;
        Sfx.play('snowAvalanche'); if (!reduceMotion) G.shake = 0.15;
        rumble(0, 0.3, 0.3, 220); rumble(1, 0.3, 0.3, 220);
      }
      // one clump over each player, half an interval apart (so two players standing still never freeze on the same tick)
      for (const q of G.players) {
        st.av.next[q.id] -= dt;
        if (st.av.next[q.id] > 0) continue;
        st.av.next[q.id] += Math.max(SNOW.avMin, SNOW.avEvery - SNOW.avRamp * (st.t - SNOW.avalancheAt));
        if (q.alive) snowClump(q, false);
      }
    }
    // the hideout rule: whoever stays in their own pocket (behind their fort) for over 7 s gets a clump every 1.2 s until
    // they come out (the clock runs at half speed while the other player is close by: being pinned in your corner is not
    // hiding). Two hiders get theirs half an interval apart, so it never ends in a double snowman.
    const was = st.pl.map(s => s.pk > SNOW.roofT);
    for (const q of G.players) {
      const s = st.pl[q.id], near = Math.abs(other(q).x - q.x) < SNOW.hideNear;
      s.pk = q.alive && !s.frozen && snowInPocket(q) ? s.pk + (near ? SNOW.nearRate : 1) * dt : 0;
    }
    const order = MODES.snow.rand() < 0.5 ? [0, 1] : [1, 0], on = was.slice();
    for (const k of order) {
      const s = st.pl[k], o = st.pl[1 - k];
      if (s.pk <= SNOW.roofT) { s.roofT = 0; continue; }
      if (!was[k]) s.roofT = on[1 - k] ? (o.roofT + SNOW.roofEvery / 2) % SNOW.roofEvery : 0; // just started: first clump now
      on[k] = true;
      s.roofT -= dt;
      if (s.roofT <= 0) { s.roofT += SNOW.roofEvery; snowClump(G.players[k], true); if (!s.roofN++) Sfx.play('snowRoof'); }
    }
    snowAnim(dt);
    // snowman check
    const fr = [0, 1].filter(k => st.pl[k].hits >= st.pl[k].need);
    if (!fr.length) return;
    for (const k of fr) {
      const s = st.pl[k], p = G.players[k];
      s.frozen = true; s.frozenT = 0; snowCancel(s); s.catchT = 0; s.duck = false; p.stun = 0;
      p.vx = 0; p.vy = Math.max(0, p.vy); p.knockT = 0; // a snowman stands still (no knockback flight under the banner)
      burst(p.x + p.w / 2, p.y + p.h / 2, '#ffffff', 30); for (let i = 0; i < 8; i++) confetti(p.x + p.w / 2, p.y);
      rumble(k, 1, 0.6, 400);
    }
    Sfx.play('snowFreeze');
    if (fr.length === 2) { matchRoundEnd(-1, 'Double snowman!'); return; }
    const v = fr[0], s = st.pl[v], name = NAMES[v];
    matchRoundEnd(1 - v, s.lastBy === 'mega' ? 'MEGA snowball! ' + name + ' is a snowman!' : s.lastBy === 'clump' ? name + ' got buried by the avalanche!'
      : s.lastBy === 'roof' ? name + ' hid too long!' : name + ' is a snowman!');
  },
  idle(dt) {
    const st = G.mst;
    if (!st.pl) return;
    snowAnim(dt);
    if (G.match && G.match.phase === 'end') { // the round is over: whatever is still flying bursts, hands relax
      if (st.balls.length) { for (const b of st.balls) puff(b.x, b.y, 4, 'rgba(255,255,255,0.9)'); st.balls = []; }
      for (const s of st.pl) { if (s.hold >= 0) snowCancel(s); s.catchT = 0; s.duck = false; }
    }
  },
  draw() {
    const st = G.mst;
    if (!st.pl) return;
    if (G.mode === 'paused') st.sawPause = true;
    snowDrawDecor();
    if (st.twist === 'icy') snowDrawIce();
    snowDrawForts();
    for (const m of st.marks) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * Math.min(1, m.t / 0.6)) + ')';
      ctx.beginPath(); ctx.ellipse(m.x, m.y, m.side ? m.r * 0.7 : m.r * 1.6, m.side ? m.r * 1.5 : m.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (st.mega) {
      const m = st.mega, bob = Math.sin(m.t * Math.PI * 4) * 3;
      ctx.fillStyle = 'rgba(255,215,90,' + (0.25 + 0.08 * Math.sin(m.t * 6)) + ')'; circle(m.x, m.y + bob, 22); ctx.fill();
      snowDrawMega(m.x, m.y + bob, SNOW.rMega, m.t);
      bigText('MEGA', m.x, m.y + bob - 27, 13, C.gold);
    }
    snowDrawShadows();
    snowDrawFlakes();
    snowDrawTrickle();
    for (const p of G.players) { // ducking squashes you down; a fresh hit makes you shiver
      const s = st.pl[p.id];
      if (s.frozen || !p.alive) continue;
      if (s.duck) { p.sx = 1.15; p.sy = 0.62; } else if (s.safe > 0 && !reduceMotion) p.sx = 1 + 0.05 * Math.sin(st.vt * 70);
    }
  },
  drawTop() {
    const st = G.mst;
    if (!st.pl) return;
    for (const p of G.players) snowDrawPlayer(p);
    for (const b of st.balls) snowDrawBall(b);
    for (const p of G.players) snowDrawAim(p);
    for (const f of st.fx) {
      const a = clamp(f.t / Math.min(0.25, f.max), 0, 1), u = 1 - f.t / f.max;
      ctx.save(); ctx.globalAlpha = a;
      if (f.kind === 'pop') { const p = G.players[f.k]; bigText(f.text, p.x + p.w / 2, p.y - 24 - 30 * u, 17, f.col || C.gold, 1 + 0.25 * Math.max(0, 1 - u * 5)); }
      else if (f.kind === 'catch') bigText(f.text, f.x, f.y - 16 * u, 16, '#ffffff', 1 + 0.3 * Math.max(0, 1 - u * 4));
      else bigText(f.text, f.x, f.y - 18 * u, 12, '#ffffff');
      ctx.restore();
    }
    for (const p of G.players) { // empty-hand hint bubble
      const h = st.pl[p.id].hint;
      if (!h || !p.alive) continue;
      ctx.save(); ctx.globalAlpha = clamp(h.t / 0.25, 0, 1);
      ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
      const S = hudBig() ? 1.4 : 1, w = ctx.measureText(h.text).width + 22, x = clamp(p.x + p.w / 2, S * w / 2 + 6, W - S * w / 2 - 6), y = p.y - 52;
      snowBig(x, p.y - 22, S, () => {
        pill(x, y, w, 24, 'center');
        ctx.fillStyle = 'rgba(28,26,54,0.78)'; ctx.beginPath(); ctx.moveTo(x - 5, y + 24); ctx.lineTo(x + 5, y + 24); ctx.lineTo(x, y + 30); ctx.fill();
        text(h.text, x, y + 12.5, 13, '#ffffff', 'center', 'body');
      });
      ctx.restore();
    }
  },
  hud() {
    const st = G.mst, m = G.match;
    if (!st.pl || !m) return;
    const card = SNOW_CARD[st.twist];
    // twist pill (twist rounds only), top left under the level pill
    const pillName = st.sudden ? 'Sudden death!' + (st.twist !== 'snowday' ? ' · ' + card[0] : '') : st.twist !== 'snowday' ? card[0] : '';
    const S = hudBig() ? 1.4 : 1;
    if (pillName) {
      ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
      const pw = ctx.measureText(pillName).width + 28, SP = Math.min(S, Math.max(1, 280 / pw)); // phones: stays clear of the match pill (x >= 305)
      snowBig(14, 46, SP, () => {
        ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
        pill(14, 46, pw, 26);
        text(pillName, 28, 59.5, 13, C.gold, 'left', 'body');
      });
    }
    // top right: one live alert at a time
    snowBig(W - 14, 12, S, () => {
      if (m.phase === 'live' || m.phase === 'end') {
        const t = st.t, avIn = SNOW.avalancheAt - t;
        const hid = m.phase === 'live' ? [0, 1].filter(k => st.pl[k].pk > SNOW.roofT - SNOW.roofWarn) : [];
        if (avIn > 0 && avIn <= 5) snowChip('Avalanche in ' + Math.ceil(avIn) + '…', C.paper);
        else if (st.av.on && t < SNOW.avalancheAt + 3) snowChip('AVALANCHE!', Math.floor(t * 6) % 2 ? '#ffffff' : C.gold);
        else if (hid.length) snowChip(hid.length > 1 ? 'Come out, you two!' : NAMES[hid[0]] + ', come out!', hid.length > 1 ? C.paper : PCOL[hid[0]]);
        else if (st.twist === 'windy') snowChip('Windy', C.paper, true);
        else if (st.av.on) snowChip('AVALANCHE!', C.gold);
      } else if (st.twist === 'windy') snowChip('Windy', C.paper, true);
    });
    // freeze meters in the bottom corners
    snowBig(14, 533, S, () => snowMeter(0)); snowBig(W - 14, 533, S, () => snowMeter(1));
    // the twist card under the countdown, every round (the plain round too)
    if (m.phase === 'ready' || m.phase === 'count') {
      const name = st.sudden ? 'Sudden death!' : card[0];
      const hint = st.sudden ? (st.twist === 'snowday' ? 'One hit makes a snowman!' : 'One hit wins · ' + card[0]) : card[1];
      ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
      const w = Math.max(300, ctx.measureText(hint).width + 48);
      ctx.save(); ctx.globalAlpha = m.phase === 'ready' ? clamp(m.t / 0.25, 0, 1) : 1;
      snowBig(W / 2, 284, S > 1 ? 1.25 : 1, () => {
        ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(W / 2 - w / 2, 284, w, 60, 16); ctx.fill();
        text(name, W / 2, 305, 26, C.gold, 'center');
        text(hint, W / 2, 330, 14, C.paper, 'center', 'body');
      });
      ctx.restore();
    }
  },
  timeUp() {
    const h = G.mst.pl.map(s => s.hits);
    if (h[0] === h[1]) return { winner: -1, reason: 'Snowed in!' };
    const w = h[0] < h[1] ? 0 : 1;
    return { winner: w, reason: 'Time! Less snow on ' + NAMES[w] + '!' };
  },
  tiebreak() {
    const l = G.mst.ballHits; // the same count as the "Snowball hits" tile
    return l[0] === l[1] ? -1 : { winner: l[0] > l[1] ? 0 : 1, reason: 'Most hits this match!' };
  },
  stats() {
    const st = G.mst, out = [{ label: 'Snowball hits', values: st.ballHits.slice() }, { label: 'Throws', values: st.throws.slice() }];
    for (const [label, v] of [['Catches', st.catches], ['MEGA hits', st.megaHits], ['Bricks smashed', st.bricks]]) if (out.length < 4 && (v[0] || v[1])) out.push({ label, values: v.slice() });
    if (st.avalancheRounds) out.push('Avalanches survived: ' + st.avalancheRounds);
    else if (st.clashes) out.push('Snowball clashes: ' + st.clashes);
    return out;
  },
};
Sfx.extra.snowThrow = function (p) { this.tone(720 * p, 0.08, 'sawtooth', 0.016, 260 * p); };
Sfx.extra.snowLob = function (p) { this.tone(420 * p, 0.16, 'sawtooth', 0.018, 760 * p); };
Sfx.extra.snowReady = function (p) { this.tone(1320 * p, 0.1, 'triangle', 0.05); this.tone(1760 * p, 0.12, 'triangle', 0.04, null, 0.05); };
Sfx.extra.snowHit = function () { this.tone(1300, 0.04, 'square', 0.02, 500); this.tone(190, 0.14, 'triangle', 0.08, 70); };
Sfx.extra.snowSplat = function () { this.tone(320, 0.06, 'triangle', 0.035, 150); };
Sfx.extra.snowCatch = function (p) { this.tone(660 * p, 0.05, 'square', 0.04); this.tone(990 * p, 0.09, 'triangle', 0.045, null, 0.04); };
Sfx.extra.snowMiss = function () { this.tone(240, 0.05, 'triangle', 0.025, 200); };
Sfx.extra.snowClash = function () { this.tone(520, 0.08, 'sawtooth', 0.02, 180); this.tone(240, 0.1, 'triangle', 0.05, 120); };
Sfx.extra.snowPack = function (p) { this.tone(150, 0.05, 'triangle', 0.03, 110); this.tone(440 * p, 0.05, 'triangle', 0.03, 640 * p, 0.05); };
Sfx.extra.snowEmpty = function () { this.tone(220, 0.04, 'square', 0.02); };
Sfx.extra.snowMega = function () { [523, 784, 1047, 1568].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.05, null, i * 0.05)); };
Sfx.extra.snowMegaHit = function () { this.tone(110, 0.32, 'square', 0.06, 45); this.tone(900, 0.18, 'sawtooth', 0.02, 200); };
Sfx.extra.snowHat = function () { this.tone(880, 0.06, 'square', 0.035, 1320); };
Sfx.extra.snowFreeze = function () { [1568, 1319, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.13, 'triangle', 0.05, null, i * 0.07)); };
Sfx.extra.snowAvalanche = function () { this.tone(90, 0.7, 'sawtooth', 0.04, 55); this.tone(130, 0.7, 'triangle', 0.05, 70, 0.05); };
Sfx.extra.snowWind = function () { this.tone(300, 0.45, 'sawtooth', 0.012, 540); };
Sfx.extra.snowRoof = function () { this.tone(520, 0.35, 'triangle', 0.03, 140); this.tone(160, 0.3, 'triangle', 0.05, 80, 0.2); };

