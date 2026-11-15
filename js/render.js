/* Pip & Bo - Drawing: the shared canvas drawing (background, tiles, players, cords, HUD, match banners) and particle effects.
   Each level file draws its own level. */
'use strict';

/* ---------- particles ---------- */
function puff(x, y, n, col) {
  for (let i = 0; i < n; i++) G.particles.push({ x, y, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 60, life: 0.35, max: 0.35, col, size: 3 + Math.random() * 3, grav: 200, kind: 'dot' });
}
function burst(x, y, col, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 220;
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: 0.6, max: 0.6, col, size: 3 + Math.random() * 4, grav: 500, kind: 'dot' });
  }
}
function confetti(x, y) {
  const cols = [C.pip, C.bo, C.gold, C.grass, '#ff8fc7'];
  const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, s = 180 + Math.random() * 320;
  G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1.6, max: 1.6, col: cols[(Math.random() * cols.length) | 0], size: 4 + Math.random() * 4, grav: 420, kind: 'conf', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14 });
}
function updateParticles(dt) {
  const arr = G.particles;
  for (let i = arr.length - 1; i >= 0; i--) {
    const q = arr[i];
    q.life -= dt;
    if (q.life <= 0) { arr.splice(i, 1); continue; }
    q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt;
    if (q.kind === 'conf') { q.rot += q.vr * dt; q.vx *= 0.99; }
  }
  if (arr.length > 600) arr.splice(0, arr.length - 600);
}

/* ---------- drawing ---------- */
function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, C.skyTop); g.addColorStop(1, C.skyBot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.sun; circle(810, 105, 44); ctx.fill();
  ctx.fillStyle = C.sunGlow; circle(810, 105, 64); ctx.fill();
  for (let i = 0; i < 5; i++) {
    const speed = 6 + (i % 3) * 4;
    const x = ((i * 233 + G.clock * speed) % (W + 220)) - 110;
    const y = 50 + ((i * 71) % 130);
    drawCloud(x, y, 0.7 + (i % 2) * 0.4);
  }
  ctx.fillStyle = C.hillFar;
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 330 + Math.sin(x * 0.007 + 1.3) * 34 + Math.sin(x * 0.019) * 12);
  ctx.lineTo(W, H); ctx.fill();
  ctx.fillStyle = C.hillNear;
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 400 + Math.sin(x * 0.011 + 4) * 26 + Math.sin(x * 0.027 + 1) * 8);
  ctx.lineTo(W, H); ctx.fill();
}
function drawCloud(x, y, s) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(x, y, 18 * s, 0, Math.PI * 2); ctx.arc(x + 22 * s, y - 8 * s, 22 * s, 0, Math.PI * 2);
  ctx.arc(x + 46 * s, y, 17 * s, 0, Math.PI * 2); ctx.rect(x, y, 46 * s, 17 * s);
  ctx.fill();
}

function drawStone(tx, ty) {
  const x = tx * T, y = ty * T;
  ctx.fillStyle = C.stone; ctx.fillRect(x - 0.5, y - 0.5, T + 1, T + 1); // slight overlap hides seams when scaled
  const h = hash(tx, ty);
  if (h % 3 === 0) { ctx.fillStyle = C.stoneLight; rr(x + 4 + (h % 15), y + 10 + ((h >> 4) % 12), 7, 4, 2); ctx.fill(); }
  ctx.fillStyle = C.stoneEdge;
  if (tile(tx - 1, ty) !== '#') ctx.fillRect(x, y, 2, T);
  if (tile(tx + 1, ty) !== '#') ctx.fillRect(x + T - 2, y, 2, T);
  if (ty + 1 < ROWS && !'#s'.includes(tile(tx, ty + 1))) ctx.fillRect(x, y + T - 3, T, 3);
  if (ty > 0 && !'#sw'.includes(tile(tx, ty - 1))) {
    ctx.fillStyle = C.grassDark; ctx.fillRect(x, y, T, 8);
    ctx.fillStyle = C.grass; ctx.fillRect(x, y, T, 6);
    ctx.fillStyle = C.grass;
    for (let i = 0; i < 3; i++) { circle(x + 5 + i * 10, y + 6, 3); ctx.fill(); }
  }
}
function drawSpikes(x, y) {
  for (let i = 0; i < 3; i++) {
    const sx = x + i * 10;
    ctx.fillStyle = C.spike;
    ctx.beginPath(); ctx.moveTo(sx, y + T); ctx.lineTo(sx + 5, y + 14); ctx.lineTo(sx + 10, y + T); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.spikeHi;
    ctx.beginPath(); ctx.moveTo(sx + 5, y + 14); ctx.lineTo(sx + 7, y + 22); ctx.lineTo(sx + 5, y + 21); ctx.closePath(); ctx.fill();
  }
}
function drawPlank(x, y, tx, ty) {
  ctx.fillStyle = C.plankDark; ctx.fillRect(x, y + 2, T, 9);
  ctx.fillStyle = C.plank; ctx.fillRect(x, y, T, 7);
  ctx.fillStyle = C.plankDark; circle(x + 5, y + 4, 1.4); ctx.fill(); circle(x + T - 5, y + 4, 1.4); ctx.fill();
  if (tile(tx - 1, ty) !== '=') { ctx.fillStyle = C.plankDark; ctx.fillRect(x + 3, y + 10, 3, 8); }
  if (tile(tx + 1, ty) !== '=') { ctx.fillStyle = C.plankDark; ctx.fillRect(x + T - 6, y + 10, 3, 8); }
}
function drawColorBlock(x, y, id, tx, ty) {
  const col = PCOL[id], dark = PDARK[id];
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = col; ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
  ctx.beginPath(); ctx.rect(x + 1, y + 1, T - 2, T - 2); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 4;
  for (let k = -T; k < T * 2; k += 12) { ctx.beginPath(); ctx.moveTo(x + k, y + T); ctx.lineTo(x + k + T, y); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, T - 2, T - 2);
  // a little face on the block says who it belongs to
  if ((tx + ty) % 3 === 0) { ctx.fillStyle = 'rgba(28,26,54,0.55)'; circle(x + 11, y + 13, 2); ctx.fill(); circle(x + 19, y + 13, 2); ctx.fill(); }
}
function drawSwitchTile(ch, x, y) {
  const s = G.level.sw[ch], col = LETTER_COL[s.plate] || C.gold;
  if (s.type === 'gate') {
    const a = s.anim; // 0 closed, 1 open
    if (a < 0.99) {
      ctx.save(); ctx.globalAlpha = 1 - a * 0.85;
      const shrink = a * (T - 4);
      ctx.fillStyle = 'rgba(28,26,54,0.35)'; ctx.fillRect(x + 2, y, T - 4, T - shrink);
      ctx.fillStyle = col;
      for (let i = 0; i < 3; i++) { rr(x + 4 + i * 8.5, y, 5, T - shrink, 2); ctx.fill(); }
      ctx.fillRect(x + 2, y + 12 - shrink * 0.4, T - 4, 4);
      ctx.restore();
    }
    ctx.strokeStyle = col; ctx.globalAlpha = 0.5; ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, T - 2, T - 2); ctx.globalAlpha = 1;
  } else {
    // bridges fill their whole tile, because that's how solid they are
    const a = s.anim;
    if (a > 0.02) {
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = col; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = 'rgba(28,26,54,0.22)';
      ctx.fillRect(x, y + 10, T, 2); ctx.fillRect(x, y + 20, T, 2); ctx.fillRect(x + T - 2, y, 2, T);
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x + 2, y + 2, T - 4, 3);
      ctx.restore();
    }
    if (a < 0.98) {
      ctx.save(); ctx.globalAlpha = 0.9 * (1 - a);
      ctx.fillStyle = 'rgba(255,143,199,0.18)'; ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]);
      ctx.strokeRect(x + 1.5, y + 1.5, T - 3, T - 3); ctx.restore();
    }
  }
}
function drawPlate(pl) {
  const x = pl.x * T, y = pl.y * T, col = LETTER_COL[pl.letter] || C.gold;
  ctx.fillStyle = C.ink; rr(x + 2, y + 25, T - 4, 5, 2); ctx.fill();
  const top = pl.down ? y + 23 : y + 19;
  ctx.fillStyle = col; rr(x + 5, top, T - 10, (y + 26) - top, 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x + 8, top + 1, T - 16, 2);
}
function drawDoor(d) {
  const L = G.level, locked = L.key && !L.key.got;
  const { x, y, w, h } = d;
  ctx.fillStyle = C.goldDark; rr(x - 3, y - 6, w + 6, h + 6, 14); ctx.fill();
  ctx.fillStyle = C.gold; rr(x - 1, y - 4, w + 2, h + 4, 12); ctx.fill();
  if (locked) { ctx.fillStyle = C.doorIn; }
  else {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#fff2c4'); g.addColorStop(1, C.glow); ctx.fillStyle = g;
  }
  rr(x + 4, y + 2, w - 8, h - 2, 9); ctx.fill();
  if (locked) {
    const cx = x + w / 2, cy = y + h / 2 + 4;
    ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy - 6, 6, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = C.gold; rr(cx - 9, cy - 6, 18, 14, 3); ctx.fill();
    ctx.fillStyle = C.doorIn; circle(cx, cy, 2.5); ctx.fill();
  }
  for (let i = 0; i < 2; i++) {
    const cx = x + w / 2 + (i === 0 ? -9 : 9), cy = y - 16;
    circle(cx, cy, 6);
    if (G.doorIn[i]) { ctx.fillStyle = PCOL[i]; ctx.fill(); }
    else { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill(); ctx.strokeStyle = PCOL[i]; ctx.lineWidth = 2; ctx.stroke(); }
  }
}
function drawKey(k) {
  if (k.got) return;
  const bob = Math.sin(G.clock * 3) * 3;
  ctx.save(); ctx.translate(k.x, k.y + bob);
  ctx.fillStyle = 'rgba(255,215,90,0.3)'; circle(0, 0, 15 + Math.sin(G.clock * 5) * 2); ctx.fill();
  ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 2;
  circle(-6, 0, 6); ctx.fill(); ctx.stroke();
  ctx.fillRect(-1, -2, 13, 4); ctx.fillRect(7, 1, 3, 5); ctx.fillRect(11, 1, 2, 4);
  ctx.fillStyle = C.goldDark; circle(-6, 0, 2); ctx.fill();
  ctx.restore();
}
function drawFlag(f) {
  const x = f.x + 15, base = f.y + T;
  ctx.fillStyle = C.ink; ctx.fillRect(x - 1.5, base - 52, 3, 52);
  ctx.fillStyle = f.on ? C.grass : '#b9b6cc';
  const wave = Math.sin(G.clock * 6) * 2;
  const top = f.on ? base - 52 : base - 28;
  ctx.beginPath(); ctx.moveTo(x + 1.5, top); ctx.lineTo(x + 22, top + 8 + wave); ctx.lineTo(x + 1.5, top + 16); ctx.closePath(); ctx.fill();
}
function drawCrownShape(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = C.gold; ctx.strokeStyle = C.goldDark; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, 7); ctx.lineTo(-13, -6); ctx.lineTo(-6, 0); ctx.lineTo(0, -9); ctx.lineTo(6, 0); ctx.lineTo(13, -6); ctx.lineTo(12, 7); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff5f7e'; circle(0, 2, 2.6); ctx.fill();
  ctx.fillStyle = '#7fd8ff'; circle(-7, 3, 2); ctx.fill(); circle(7, 3, 2); ctx.fill();
  ctx.restore();
}
function drawCrown() {
  const c = G.crown;
  if (!c) return;
  if (c.holder === null) {
    const bob = Math.sin(G.clock * 3) * 4;
    ctx.fillStyle = 'rgba(255,215,90,0.28)'; circle(c.x, c.y + bob, 20 + Math.sin(G.clock * 5) * 2); ctx.fill();
    drawCrownShape(c.x, c.y + bob, 1.1);
  } else {
    const p = G.players[c.holder];
    if (!p.alive) return;
    const flash = c.invuln > 0 && Math.floor(G.clock * 16) % 2 === 0;
    if (!flash) drawCrownShape(p.x + p.w / 2, p.y + p.h - p.h * p.sy - 10, 0.85);
  }
}
function drawRope() {
  const [a, b] = G.players;
  if (!a.alive || !b.alive) return;
  const L = G.ropeLen || G.level.def.tether;
  const ax = a.x + a.w / 2, ay = a.y + a.h * 0.6, bx = b.x + b.w / 2, by = b.y + b.h * 0.6;
  const d = Math.hypot(bx - ax, by - ay);
  const sag = Math.max(0, Math.min(42, (L - d) * 0.6));
  // When one player hangs below a ledge, bend the drawn rope over the ledge corner.
  let corner = null;
  const hi = ay < by ? a : b, lo = hi === a ? b : a;
  if (hi.grounded && !lo.grounded && Math.abs(ay - by) > 20) {
    const hx = hi.x + hi.w / 2, lx = lo.x + lo.w / 2, dir = lx > hx ? 1 : -1;
    const row = Math.floor((hi.y + hi.h + 1) / T);
    let c = Math.floor(hx / T);
    for (let k = 0; k < COLS && solidFor(tile(c + dir, row), hi); k++) c += dir;
    const cx = dir > 0 ? (c + 1) * T : c * T, cy = row * T;
    if ((dir > 0 && lx > cx - 12) || (dir < 0 && lx < cx + 12)) corner = { x: cx, y: cy - 1 };
  }
  const path = () => {
    ctx.beginPath(); ctx.moveTo(ax, ay);
    if (corner) { ctx.lineTo(corner.x, corner.y); ctx.lineTo(bx, by); }
    else ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + sag, bx, by);
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = C.ropeDark; ctx.lineWidth = 5; path(); ctx.stroke();
  ctx.strokeStyle = G.climbing ? C.gold : (G.taut ? '#ffe3ae' : C.rope); ctx.lineWidth = 2.5; path(); ctx.stroke();
}
function cordEnds() {
  const [a, b] = G.players;
  return { ax: a.x + a.w / 2, ay: a.y + a.h * 0.6, bx: b.x + b.w / 2, by: b.y + b.h * 0.6 };
}
function curvePts(ax, ay, bx, by, sag, n) {
  const mx = (ax + bx) / 2, my = (ay + by) / 2 + sag, pts = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; pts.push([u * u * ax + 2 * u * t * mx + t * t * bx, u * u * ay + 2 * u * t * my + t * t * by]); }
  return pts;
}
function drawChain() {
  const [a, b] = G.players;
  if (!a.alive || !b.alive) return;
  const { ax, ay, bx, by } = cordEnds();
  const d = Math.hypot(bx - ax, by - ay);
  const sag = G.held ? 0 : Math.max(0, Math.min(46, (G.level.def.tether - d) * 0.55));
  const pts = curvePts(ax, ay, bx, by, sag, 40);
  let run = 0, next = 4.5, k = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], seg = Math.hypot(x1 - x0, y1 - y0);
    if (seg === 0) continue;
    const ang = Math.atan2(y1 - y0, x1 - x0);
    while (next <= run + seg) {
      const t = (next - run) / seg;
      ctx.save(); ctx.translate(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t); ctx.rotate(ang);
      ctx.beginPath();
      if (k % 2 === 0) ctx.ellipse(0, 0, 6, 3.6, 0, 0, Math.PI * 2); else { ctx.moveTo(-6, 0); ctx.lineTo(6, 0); }
      ctx.strokeStyle = '#34304f'; ctx.lineWidth = 4.6; ctx.stroke();
      ctx.strokeStyle = k % 2 === 0 ? '#e4e6f2' : '#b4b8cc'; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.restore();
      next += 9; k++;
    }
    run += seg;
  }
}
function drawBungee() {
  const [a, b] = G.players;
  if (!a.alive || !b.alive) return;
  const { ax, ay, bx, by } = cordEnds();
  const L0 = G.level.def.tether, d = Math.hypot(bx - ax, by - ay), st = Math.max(0, d - L0);
  const sag = st > 0 ? 0 : Math.min(44, (L0 - d) * 0.5);
  const lw = clamp(7 - st / 30, 2.6, 7); // thinner the more it stretches
  const path = () => { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + sag, bx, by); };
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#6e1d48'; ctx.lineWidth = lw + 3; path(); ctx.stroke();
  ctx.strokeStyle = st > 20 ? '#ff8cc0' : '#ff5fa2'; ctx.lineWidth = lw; path(); ctx.stroke();
  ctx.setLineDash([4, 5 + st / 10]); ctx.strokeStyle = 'rgba(255,236,246,0.85)'; ctx.lineWidth = Math.max(1.2, lw - 3.5); path(); ctx.stroke();
  ctx.setLineDash([]);
}
function drawPlayer(p) {
  if (!p.alive) return;
  const col = PCOL[p.id], dark = PDARK[p.id];
  const w = p.w * p.sx, h = p.h * p.sy;
  const cx = p.x + p.w / 2, by = p.y + p.h;
  const of = outfitNow(), look0 = of && of.looks[p.id], oo = look0 && { face: p.face, t: G.clock, vx: p.vx };
  ctx.save(); ctx.translate(cx, by);
  ctx.fillStyle = 'rgba(28,26,54,0.18)'; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.55, 3, 0, 0, Math.PI * 2); ctx.fill();
  if (look0) outfitLayer(ctx, look0, 'back', p.id, 0, 0, w, h, oo);
  // ears / sprout (js/outfits.js: an outfit's hat can lift the sprout, or put the ears over the hat)
  const ears = () => { ctx.fillStyle = col; circle(-w / 2 + 4, -h + 1, 5); ctx.fill(); circle(w / 2 - 4, -h + 1, 5); ctx.fill(); ctx.strokeStyle = dark; ctx.lineWidth = 2; circle(-w / 2 + 4, -h + 1, 5); ctx.stroke(); circle(w / 2 - 4, -h + 1, 5); ctx.stroke(); };
  if (p.id === 1 && !(look0 && look0.earsOver)) ears();
  ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 2.5;
  rr(-w / 2, -h, w, h, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(-w / 2 + 3, -h + 3, w * 0.35, h * 0.4, 5); ctx.fill();
  if (look0) outfitLayer(ctx, look0, 'body', p.id, 0, 0, w, h, oo);
  // face
  const look = p.face * 2.5, ey = -h * 0.6 + clamp(p.vy / 300, -1.5, 1.5);
  if (p.stun > 0) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    for (const ex of [-5, 5]) { ctx.beginPath(); ctx.moveTo(ex - 3 + look, ey - 3); ctx.lineTo(ex + 3 + look, ey + 3); ctx.moveTo(ex + 3 + look, ey - 3); ctx.lineTo(ex - 3 + look, ey + 3); ctx.stroke(); }
  } else if (p.blink > 0) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    for (const ex of [-5, 5]) { ctx.beginPath(); ctx.moveTo(ex - 3 + look, ey); ctx.lineTo(ex + 3 + look, ey); ctx.stroke(); }
  } else {
    for (const ex of [-5, 5]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex + look, ey, 3.6, 4.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink; circle(ex + look + p.face * 1.2, ey + 0.8, 2); ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255,120,140,0.45)'; circle(-8 + look * 0.5, ey + 6, 2.4); ctx.fill(); circle(8 + look * 0.5, ey + 6, 2.4); ctx.fill();
  if (look0) outfitLayer(ctx, look0, 'head', p.id, 0, 0, w, h, oo);
  if (p.id === 0) {
    const lift = outfitLift(look0) * h / PH;
    ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -h - lift + (lift ? 1 : 0)); ctx.lineTo(1, -h - lift - 6); ctx.stroke();
    ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(5, -h - lift - 8, 6, 3, -0.5, 0, Math.PI * 2); ctx.fill();
  } else if (look0 && look0.earsOver) { ctx.save(); ctx.translate(0, -outfitLift(look0) * h / PH); ears(); ctx.restore(); }
  if (look0) outfitLayer(ctx, look0, 'front', p.id, 0, 0, w, h, oo);
  if (p.stun > 0) { // dizzy stars, above any hat
    const sy = -h - 8 - outfitLift(look0) * h / PH * 0.6;
    ctx.fillStyle = C.gold;
    for (let i = 0; i < 3; i++) { const a = G.clock * 8 + i * 2.1; circle(Math.cos(a) * 12, sy + Math.sin(a) * 3, 2.2); ctx.fill(); }
  }
  if (p.stompSafe > 0 && p.stun <= 0 && isVersus()) {
    // just stomped: a blinking bubble shows you can't be stomped again yet
    ctx.globalAlpha = 0.45 + 0.35 * Math.sin(G.clock * 18);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(0, -h / 2, w * 0.9, h * 0.78, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function pill(x, y, w, h, align) {
  const px = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  ctx.fillStyle = 'rgba(23,25,29,0.78)'; rr(px, y, w, h, h / 2); ctx.fill();
  return px;
}
function text(str, x, y, size, col, align = 'left', font = 'display') {
  ctx.font = (font === 'display' ? '' : '700 ') + size + 'px ' + (font === 'display' ? '"Lilita One", "Arial Rounded MT Bold", sans-serif' : '"Atkinson Hyperlegible", system-ui, sans-serif');
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(str, x, y);
}
function drawBumper(x, y, tx, ty) {
  const lit = G.golf && G.golf.bumps[ty * COLS + tx] > 0;
  ctx.fillStyle = lit ? '#ffd2dc' : '#ff4d6d'; rr(x + 1, y + 1, T - 2, T - 2, 8); ctx.fill();
  ctx.strokeStyle = '#8a1f38'; ctx.lineWidth = 2; rr(x + 1, y + 1, T - 2, T - 2, 8); ctx.stroke();
  ctx.fillStyle = '#ffffff'; circle(x + T / 2, y + T / 2, lit ? 7 : 5.5); ctx.fill();
}
function drawPad(p) {
  const x = p.tx * T, base = (p.ty + 1) * T, sq = p.t > 0 ? Math.min(1, p.t / 0.15) : 0;
  const top = base - 11 + sq * 5;
  ctx.fillStyle = '#4a4766'; rr(x + 3, base - 4, T - 6, 4, 2); ctx.fill();
  ctx.strokeStyle = '#d9dbe8'; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i <= 4; i++) ctx.lineTo(x + 9 + (i % 2) * 12, base - 4 - (base - 4 - top) * i / 4);
  ctx.stroke();
  ctx.fillStyle = '#ff5fa2'; ctx.strokeStyle = '#6e1d48'; ctx.lineWidth = 1.5;
  rr(x + 2, top - 5, T - 4, 6, 3); ctx.fill(); ctx.stroke();
  // which way it throws you
  ctx.save(); ctx.translate(x + T / 2, top - 13); ctx.rotate(p.dir * (90 - GOLF.padAngle) * Math.PI / 180);
  ctx.fillStyle = ctx.strokeStyle = 'rgba(255,255,255,0.9)'; if (p.dir) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, -3); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(5.5, -1); ctx.lineTo(-5.5, -1); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawSand(x, y, tx, ty) {
  ctx.fillStyle = '#e9cf8f'; ctx.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
  ctx.fillStyle = '#d2b06a';
  const h = hash(tx, ty);
  for (let i = 0; i < 5; i++) { circle(x + 4 + ((h >> (i * 3)) % 23), y + 6 + ((h >> (i * 4 + 2)) % 20), 1.4); ctx.fill(); }
  if (tile(tx, ty - 1) !== 's' && tile(tx, ty - 1) !== '#') { ctx.fillStyle = '#f6e2a8'; ctx.fillRect(x, y, T, 4); }
}
function drawWater(x, y, tx, ty) {
  const top = tile(tx, ty - 1) !== 'w';
  ctx.fillStyle = 'rgba(70,150,220,0.78)'; ctx.fillRect(x, y + (top ? 6 : 0), T, T - (top ? 6 : 0));
  if (top) {
    ctx.fillStyle = 'rgba(190,230,255,0.9)';
    const ph = G.clock * 3 + tx * 1.7;
    ctx.beginPath(); ctx.moveTo(x, y + 8);
    for (let i = 0; i <= 6; i++) ctx.lineTo(x + i * 5, y + 6 + Math.sin(ph + i * 0.9) * 1.6);
    ctx.lineTo(x + T, y + 10); ctx.lineTo(x, y + 10); ctx.closePath(); ctx.fill();
  }
}
function drawHUD() {
  const L = G.level, i = G.levelIndex;
  ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
  const label = `${levelCode(i)} · ${L.def.name}`;
  const lw = ctx.measureText(label).width + 28;
  // (a level that draws its own level and room pills, World 40's hand-drawn HUD, sets def.ownPills)
  if (!L.def.ownPills) { pill(14, 12, lw, 28); text(label, 28, 26.5, 14, C.paper, 'left', 'body'); }
  if (L.def.rooms && !L.def.golf && !L.def.ownPills) {
    const rl = `${L.def.roomWord || 'Room'} ${L.def.roomIndex + 1} of ${L.def.roomCount}: ${L.def.title}`;
    ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
    pill(14, 46, ctx.measureText(rl).width + 44, 26);
    const col = { rope: C.rope, chain: '#d9dbe8', bungee: '#ff5fa2' }[cordType()];
    ctx.fillStyle = col; circle(30, 59, 6); ctx.fill();
    text(rl, 42, 59.5, 13, C.gold, 'left', 'body');
  }
  if (G.build) {
    drawBuildHUD();
  } else if (G.pong) {
    drawPongHUD();
  } else if (G.golf) {
    drawGolfHUD();
  } else if (G.match) {
    drawMatchHUD();
  } else if (L.def.kind === 'versus' && G.vs) {
    const vs = G.vs, bw = 150;
    pill(W / 2, 10, 440, 34, 'center');
    for (let k = 0; k < 2; k++) {
      const bx = k === 0 ? W / 2 - 205 : W / 2 + 55;
      text(NAMES[k], k === 0 ? bx : bx + bw, 27, 16, PCOL[k], k === 0 ? 'left' : 'right');
      const barX = k === 0 ? bx + 34 : bx, barW = bw - 34;
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(barX, 22, barW, 10, 5); ctx.fill();
      const f = clamp(vs.score[k] / vs.target, 0, 1);
      ctx.fillStyle = PCOL[k];
      if (f > 0) { if (k === 0) rr(barX, 22, Math.max(10, barW * f), 10, 5); else rr(barX + barW - Math.max(10, barW * f), 22, Math.max(10, barW * f), 10, 5); ctx.fill(); }
    }
    if (vs.time <= 10) text(String(Math.ceil(vs.time)), W / 2, 27.5, 20, C.gold, 'center');
    else text('First to ' + vs.target + 's', W / 2, 27.5, 13, C.paper, 'center', 'body');
  } else if (!L.def.ownHUD && L.def.kind !== 'versus') {
    const s = `${fmtTime(G.time)}   Falls ${G.falls}`;
    ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
    const sw = ctx.measureText(s).width + 28;
    pill(W - 14, 12, sw, 28, 'right');
    ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
    text(s, W - 28, 26.5, 14, C.paper, 'right', 'body');
  }
  if (L.key && L.door) {
    const got = L.key.got;
    const s = got ? 'Door unlocked' : 'Find the key';
    ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
    const sw = ctx.measureText(s).width + 44;
    const ky = L.def.rooms ? 80 : 46;
    const px = pill(14, ky, sw, 26);
    ctx.save(); ctx.translate(px + 18, ky + 13); ctx.scale(0.7, 0.7);
    ctx.fillStyle = got ? C.gold : 'rgba(255,255,255,0.35)'; circle(-6, 0, 6); ctx.fill(); ctx.fillRect(-1, -2, 13, 4); ctx.fillRect(7, 1, 3, 5);
    ctx.restore();
    text(s, px + 32, ky + 13.5, 13, got ? C.gold : C.paper, 'left', 'body');
  }
  drawHook('hud');
}
// best-of-N HUD, top centre: Pip and her round-win dots, "Round N · Best of N", Bo's dots and Bo; a clock under it
// when rounds are timed (def.match.roundTime). On phones (hudBig()) it's bigger and shorter: "Pip ●●○ R3 ○○○ Bo",
// y 10..54 (clock y 58..90) instead of y 10..44 (clock y 48..72).
function roundDot(x, y, on, k, pop, r0 = 5.5) {
  const r = r0 * (pop ? 1 + 0.5 * pop : 1), big = r0 > 6;
  if (on) { ctx.fillStyle = PCOL[k]; circle(x, y, r); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = big ? 2 : 1.5; circle(x, y, r); ctx.stroke(); }
  else { ctx.strokeStyle = 'rgba(246,239,223,0.45)'; ctx.lineWidth = big ? 2.5 : 2; circle(x, y, r - 1); ctx.stroke(); }
}
function drawMatchHUD() {
  const m = G.match, big = hudBig();
  const S = big ? { gap: 24, r: 8.5, name: 22, toDot: 15, h: 44, mid: 20 } : { gap: 17, r: 5.5, name: 16, toDot: 10, h: 34, mid: 12 };
  ctx.font = S.name + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
  const nameW = big ? NAMES.map(n => ctx.measureText(n).width) : [30, 24];
  const mid = big ? 'R' + m.round : `Round ${m.round}  ·  Best of ${m.bestOf}`;
  ctx.font = big ? S.mid + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif' : '700 12px "Atkinson Hyperlegible", system-ui, sans-serif';
  const mw = ctx.measureText(mid).width + 28, side = 16 + Math.max(nameW[0], nameW[1]) + S.toDot + (m.need - 1) * S.gap + S.r + 2.5;
  const w = Math.round(mw + 2 * side), x0 = pill(W / 2, 10, w, S.h, 'center'), y = 10 + S.h / 2;
  G.matchHudBox = { x0, x1: x0 + w, y1: 10 + S.h }; // where the match pill sits this frame (modes keep their pills clear of it)
  // the dot a player just won pulses during the round-end banner
  const popFor = k => (m.end && m.end.winner === k && (m.phase === 'end' || m.phase === 'over') ? Math.max(0, Math.sin(Math.min(1, m.t / 0.5) * Math.PI)) : 0);
  text(NAMES[0], x0 + 16, y + 0.5, S.name, PCOL[0], 'left');
  for (let k = 0; k < m.need; k++) roundDot(x0 + 16 + nameW[0] + S.toDot + k * S.gap, y, k < m.wins[0], 0, k === m.wins[0] - 1 ? popFor(0) : 0, S.r);
  text(NAMES[1], x0 + w - 16, y + 0.5, S.name, PCOL[1], 'right');
  for (let k = 0; k < m.need; k++) roundDot(x0 + w - 16 - nameW[1] - S.toDot - k * S.gap, y, k < m.wins[1], 1, k === m.wins[1] - 1 ? popFor(1) : 0, S.r);
  text(mid, W / 2, y + 0.5, S.mid, C.paper, 'center', big ? 'display' : 'body');
  if (m.roundTime > 0) {
    const sec = Math.ceil(m.timeLeft), warn = m.phase === 'live' && sec <= MATCH.warn;
    const cy = big ? 58 : 48, ch = big ? 32 : 24, fs = big ? 22 : 15;
    pill(W / 2, cy, big ? 90 : 66, ch, 'center');
    text(Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'), W / 2, cy + ch / 2 + 0.5, warn ? fs + 2 : fs, warn ? C.gold : C.paper, 'center');
  }
}
// card: the intro card's box [x, y, w, h]. A tag that would sit on it goes under the hero's feet,
// or under the card when the hero is behind it, and points up
function drawNameTags(alpha, card) {
  const tagHw = p => cpuSolo() && cpuOn(p.id) ? 30 : 18;
  const onCard = (p, y0, y1) => card && p.x + p.w / 2 + tagHw(p) > card[0] && p.x + p.w / 2 - tagHw(p) < card[0] + card[2] && y1 > card[1] && y0 < card[1] + card[3];
  const lift = (LEVELS[G.levelIndex] || {}).tagLift || 0;
  const moved = p => onCard(p, p.y - 27 - lift, p.y - 5 - lift) || onCard(p, p.y, p.y + p.h); // the tag, or the hero, is on the card
  let row = 0; // moved tags share one row, under the lowest of those heroes
  for (const p of G.players) if (p.alive && moved(p)) row = Math.max(row, p.y + p.h + 18);
  for (const p of G.players) {
    if (!p.alive) continue;
    const x = p.x + p.w / 2; let y = p.y - 16 - lift; // tagLift: a level that carries things overhead
    const cpu = cpuSolo() && cpuOn(p.id), hw = tagHw(p); // the computer's tag says so
    const up = moved(p);
    if (up) y = onCard(p, row - 15, row + 7) ? card[1] + card[3] + 20 : row;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = PCOL[p.id]; rr(x - hw, y - 11, hw * 2, 18, 9); ctx.fill();
    ctx.beginPath();
    if (up) { ctx.moveTo(x - 4, y - 11); ctx.lineTo(x + 4, y - 11); ctx.lineTo(x, y - 15); }
    else { ctx.moveTo(x - 4, y + 7); ctx.lineTo(x + 4, y + 7); ctx.lineTo(x, y + 11); }
    ctx.fill();
    text(cpu ? NAMES[p.id] + ' · CPU' : NAMES[p.id], x, y - 1.5, 12, '#fff', 'center', 'body');
    ctx.restore();
  }
}
// big centre text with a dark outline (countdown numbers, GO!)
function bigText(str, x, y, size, col, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.font = size + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.16; ctx.strokeStyle = C.ink; ctx.strokeText(str, 0, 0);
  ctx.fillStyle = col; ctx.fillText(str, 0, 0);
  ctx.restore();
}
// "Round N" banner, 3-2-1, GO!, and the round-end banner
function drawMatchOverlay() {
  const m = G.match;
  if (!m || m.phase === 'intro') return;
  const easeBack = t => { const c = 1.7; t = clamp(t, 0, 1) - 1; return 1 + (c + 1) * t * t * t + c * t * t; };
  if (m.phase === 'ready' || m.phase === 'count') {
    drawNameTags(1);
    const subs = matchSubtitles();
    if (m.phase === 'ready') {
      const sc = easeBack(m.t / 0.25), h = 84 + subs.length * 22;
      ctx.save(); ctx.translate(W / 2, 205); ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(23,25,29,0.88)'; rr(-180, -h / 2, 360, h, 20); ctx.fill();
      text('Round ' + m.round, 0, -h / 2 + 40, 40, C.paper, 'center');
      subs.forEach(([t, c], k) => text(t, 0, -h / 2 + 78 + k * 22, 15, c, 'center', 'body'));
      ctx.restore();
    } else {
      // a small reminder of the round, and the number popping in on every beat
      ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
      const lab = 'Round ' + m.round + '  ·  ' + subs[0][0], lw = ctx.measureText(lab).width + 32;
      pill(W / 2, 128, lw, 30, 'center');
      text(lab, W / 2, 143.5, 14, subs[0][1], 'center', 'body');
      const n = Math.max(1, 3 - Math.floor(m.t / MATCH.beat)), f = (m.t % MATCH.beat) / MATCH.beat;
      ctx.fillStyle = 'rgba(23,25,29,0.82)'; circle(W / 2, 222, 52); ctx.fill();
      ctx.strokeStyle = 'rgba(255,197,61,0.9)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(W / 2, 222, 52, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - f)); ctx.stroke();
      bigText(String(n), W / 2, 225, 70, C.gold, 1 + 0.45 * Math.pow(1 - Math.min(1, f * 3), 2));
    }
  }
  if (m.phase === 'live' && m.goT > 0) {
    const f = 1 - m.goT / MATCH.go;
    ctx.save(); ctx.globalAlpha = clamp(m.goT / 0.3, 0, 1);
    bigText('GO!', W / 2, 222, 84, C.gold, 0.85 + 0.5 * f);
    ctx.restore();
  }
  if ((m.phase === 'end' || m.phase === 'over') && m.end) {
    const e = m.end, final = e.final;
    let title, tcol;
    if (final && e.matchWinner >= 0) { title = NAMES[e.matchWinner] + ' wins the match!'; tcol = PCOL[e.matchWinner]; }
    else if (final) { title = 'It’s a draw!'; tcol = C.paper; }
    else if (e.winner >= 0) { title = NAMES[e.winner] + ' wins the round!'; tcol = PCOL[e.winner]; }
    else { title = 'Tie! Replay the round'; tcol = C.paper; }
    const lines = [];
    if (e.reason) lines.push([e.reason, C.paper, 16]);
    if (final && e.winner < 0) lines.push(['Too many ties in a row: the match is called', '#d9d3ef', 13]);
    const sc = easeBack(m.t / 0.28);
    ctx.font = '34px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    let bw = ctx.measureText(title).width;
    for (const [t, , sz] of lines) { ctx.font = '700 ' + sz + 'px "Atkinson Hyperlegible", system-ui, sans-serif'; bw = Math.max(bw, ctx.measureText(t).width); }
    bw = Math.min(W - 40, Math.max(380, bw + 64));
    const bh = 78 + lines.length * 24 + 34;
    ctx.save(); ctx.translate(W / 2, 212); ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(23,25,29,0.9)'; rr(-bw / 2, -bh / 2, bw, bh, 20); ctx.fill();
    ctx.strokeStyle = final ? C.gold : (e.winner >= 0 ? PCOL[e.winner] : 'rgba(246,239,223,0.4)'); ctx.lineWidth = 3; rr(-bw / 2, -bh / 2, bw, bh, 20); ctx.stroke();
    let y = -bh / 2 + 40;
    text(title, 0, y, 34, tcol, 'center'); y += 38;
    for (const [t, c, sz] of lines) { text(t, 0, y, sz, c, 'center', 'body'); y += 24; }
    // the match score so far: Pip 2 – 1 Bo
    ctx.font = '22px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    const sw = ctx.measureText(' ' + m.wins[0] + ' – ' + m.wins[1] + ' ').width;
    text(m.wins[0] + ' – ' + m.wins[1], 0, y + 4, 22, C.gold, 'center');
    text(NAMES[0], -sw / 2 - 6, y + 4, 18, PCOL[0], 'right');
    text(NAMES[1], sw / 2 + 6, y + 4, 18, PCOL[1], 'left');
    ctx.restore();
  }
}
function drawIntro() {
  if (G.introT <= 0 || G.mode !== 'play') return;
  const a = clamp(G.introT / 0.5, 0, 1);
  const def = G.level.def;
  // straight after the ready card (which showed the tip and the controls): only the name tags
  if (G.introQuick) { if (!(G.mst && G.mst.arriveT > 0)) drawNameTags(a, null); return; }
  const actLine = def.act ? actHintLine() : null, note = cpuTipNote(def.tip);
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = '14px "Atkinson Hyperlegible", system-ui, sans-serif';
  const tw = Math.max(380, ctx.measureText(def.tip).width + 60, actLine ? ctx.measureText(actLine).width + 80 : 0, note ? ctx.measureText(note).width + 60 : 0);
  const card = [W / 2 - tw / 2, 168, tw, (actLine ? 120 : 92) + (note ? 22 : 0)];
  ctx.fillStyle = 'rgba(23,25,29,0.86)'; rr(card[0], card[1], card[2], card[3], 18); ctx.fill();
  const code = levelCode(G.levelIndex), wd = WORLDS[LEVELS[G.levelIndex].world];
  const first = code.endsWith('-1') && (!def.rooms || def.roomIndex === 0);
  const sub = (first ? `World ${LEVELS[G.levelIndex].world + 1}: ${wd.name} · ` : '') + (def.golf ? `Level ${code} · Hole ${def.roomIndex + 1} of ${def.roomCount} · Par ${def.par}`
    : def.rooms ? `Level ${code} · ${def.name} · ${def.roomWord || 'Room'} ${def.roomIndex + 1} of ${def.roomCount}` : `Level ${code}${def.kind === 'versus' ? ' · Versus' : ''}`);
  text(sub, W / 2, 190, 13, C.gold, 'center', 'body');
  text(def.rooms ? def.title + '!' : def.name, W / 2, 216, 30, C.paper, 'center');
  ctx.font = '400 14px "Atkinson Hyperlegible", system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.fillStyle = '#d9d3ef'; ctx.fillText(def.tip, W / 2, 244);
  // (1-player mode: the tip talks to the computer's character too)
  if (note) { ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.fillStyle = C.paper; ctx.fillText(note, W / 2, actLine ? 297 : 266); }
  if (actLine) {
    // the action button, in a little gold pill
    ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
    const aw = ctx.measureText(actLine).width + 28;
    ctx.fillStyle = 'rgba(255,197,61,0.16)'; rr(W / 2 - aw / 2, 259, aw, 24, 12); ctx.fill();
    text(actLine, W / 2, 271.5, 14, C.gold, 'center', 'body');
  }
  ctx.restore();
  // name tags over the players, kept off the card (and not yet, while a level's warp-in still hides them)
  if (!(G.mst && G.mst.arriveT > 0)) drawNameTags(a, card);
}

function render(dt) {
  const L = G.level;
  ctx.save();
  const s = canvas.width / W;
  ctx.setTransform(s, 0, 0, canvas.height / H, 0, 0);
  if (G.shake > 0) { const m = G.shake * 14; ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m); }
  drawBackground();
  for (const sg of L.def.signs || []) {
    ctx.font = '17px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(28,26,54,0.5)'; ctx.fillText(sg.text, sg.x, sg.y);
  }
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const ch = L.grid[ty][tx], x = tx * T, y = ty * T;
    if (ch === '#') drawStone(tx, ty);
    else if (ch === '^') drawSpikes(x, y);
    else if (ch === '=') drawPlank(x, y, tx, ty);
    else if (ch === 'o') drawColorBlock(x, y, 0, tx, ty);
    else if (ch === 'u') drawColorBlock(x, y, 1, tx, ty);
    else if (L.sw[ch]) drawSwitchTile(ch, x, y);
    else if (ch === 'P') { drawBrick(x, y, L.blockCol[ty][tx]); if (L.crack && L.crack[ty * COLS + tx]) drawCrack(x, y); }
    else if (ch === 'w') drawWater(x, y, tx, ty);
    else if (ch === 's') drawSand(x, y, tx, ty);
    else if (ch === 'X') drawBumper(x, y, tx, ty);
  }
  if (G.golf) drawGolf();
  if (G.build) drawBuild();
  if (G.pong) drawPong();
  for (const pl of L.plates) drawPlate(pl);
  for (const f of L.flags) drawFlag(f);
  if (L.door) drawDoor(L.door);
  if (L.key) drawKey(L.key);
  if (L.def.tether) { const c = cordType(); if (c === 'chain') drawChain(); else if (c === 'bungee') drawBungee(); else drawRope(); }
  drawHook('draw');
  if (G.mode !== 'title') for (const p of G.players) drawPlayer(p);
  if (G.golf && G.mode !== 'title') { drawGolfClub(); drawGolfBall(); }
  drawCrown();
  drawHook('drawTop');
  cpuDraw();
  for (const q of G.particles) {
    ctx.globalAlpha = clamp(q.life / q.max, 0, 1);
    ctx.fillStyle = q.col;
    if (q.kind === 'conf') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillRect(-q.size / 2, -q.size / 4, q.size, q.size / 2); ctx.restore(); }
    else { circle(q.x, q.y, q.size * (0.5 + 0.5 * q.life / q.max)); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  if (G.mode !== 'title') { drawHUD(); drawMatchOverlay(); drawIntro(); }
  ctx.restore();
}

