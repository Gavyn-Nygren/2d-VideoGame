/* Pip & Bo - World 27 Robot Factory: the shared kit (drawing, key names, pops, idle checks, box physics, sounds). */
'use strict';

/* World 27 Robot Factory (world index 26). Every World 27 level file uses these helpers; they load first.
   Everything here is prefixed rf27 / RF27 (all scripts share one scope).
   - Key names: rf27Key(id, what) gives the key, button or touch word for player id's own device ('act', 'up', 'down',
     'left', 'right', 'jump'), as the level's prompts should name it.
   - People: rf27IsCpu(id) is true for the computer in 1-player mode; rf27People(st, dt) keeps st.press[id] (seconds
     since that player pressed anything; the computer always counts as pressing) and st.away (seconds since any person
     pressed anything). Levels use st.away for "Taking a break" and st.press for gold help that only comes while both
     play.
   - Pops and news: rf27Pop(st, x, y, text, col, size) a floating word in world coordinates; rf27News(st, text, gold, life)
     a banner under the HUD. rf27Fx(st, dt) ages them; rf27DrawPops(st) (inside the camera) and rf27DrawNews(st) draw.
   - Boxes: rf27Move(b, dx, dy, solids) moves an axis-aligned box { x, y, w, h } through solid rects
     ({ x, y, w, h, oneWay }) and returns what it hit; rf27Ground(b, solids) is the rect under the box (or null).
   - Drawing: rf27Backdrop(camX, camY, look, t) the factory hall; rf27Floor(x, y, w, h, look); rf27Crate(x, y, w, h,
     kind, t); rf27Gear(x, y, r, teeth, a, col); rf27Stripes(x, y, w, h); rf27Panel and rf27Chip for the HUD.
   - Sounds: Sfx.extra.rf27* (clank, bonk, whirr, ding, boing, zap, punch, beep, fix, stamp, magnet, drop, cheer). */
const RF27 = {
  FONT: '"Atkinson Hyperlegible", system-ui, sans-serif',
  DISPLAY: '"Lilita One", "Arial Rounded MT Bold", sans-serif',
  LOOKS: {
    // hall wall top/bottom, far girder, pipe, accent light, floor top, floor side
    bolts: { top: '#4b5d86', bot: '#9fb2d4', far: '#3c4a6e', pipe: '#6f86b6', light: '#ffb84d', floor: '#8a96b4', side: '#56607e' },
    paint: { top: '#5b4a86', bot: '#c4b0e0', far: '#47396e', pipe: '#9a7fd0', light: '#ff7ab8', floor: '#9a8cb8', side: '#605480' },
    spring: { top: '#3f6f78', bot: '#9fd2cc', far: '#2f5560', pipe: '#62a8a8', light: '#7affc4', floor: '#86a8a8', side: '#4f7278' },
    test: { top: '#6a4a3a', bot: '#e0bfa0', far: '#553a2e', pipe: '#c48a5c', light: '#ffd84d', floor: '#a8968a', side: '#6e5a50' },
    night: { top: '#22284a', bot: '#5a6494', far: '#1a1f3c', pipe: '#4a5688', light: '#5affff', floor: '#6a7296', side: '#3c4468' },
  },
};

const rf27Solo = () => typeof cpuSolo === 'function' && cpuSolo();
const rf27IsCpu = id => rf27Solo() && cpuOn(id);
const rf27Big = () => typeof hudBig === 'function' && hudBig();
function rf27Dev(id) { try { return actKey(id); } catch (e) { return 'kb'; } }
// a key, button or touch word for player id's own device
function rf27Key(id, what, actWord) {
  const d = rf27Dev(id), s = rf27Solo();
  const kb = { act: ['F', '/'], up: ['W', '↑'], jump: ['W', '↑'], down: ['S', '↓'], left: ['A', '←'], right: ['D', '→'] }[what] || ['', ''];
  if (d === 'pad') {
    if (what === 'act') { try { return glyph('act'); } catch (e) { return 'X'; } }
    if (what === 'up' || what === 'jump') { try { return glyph('a'); } catch (e) { return 'A'; } }
    return { down: 'stick ▼', left: 'stick ◀', right: 'stick ▶' }[what] || '';
  }
  if (d === 'touch') return { act: actWord ? 'the ' + actWord + ' button' : 'the round button', up: '▲', jump: '▲', down: '▼', left: '◀', right: '▶' }[what] || '';
  return s ? (what === 'act' ? 'F' : kb[0]) : kb[id] || kb[0];
}

/* ---------- people: who is pressing ---------- */
function rf27People(st, dt) {
  if (!st.press) st.press = [0, 0];
  if (st.away == null) st.away = 0;
  let any = false;
  for (const p of G.players) {
    const i = p.input, on = i.left || i.right || i.jump || i.down || i.up || i.act;
    if (typeof cpuOn === 'function' && cpuOn(p.id)) { st.press[p.id] = 0; continue; }
    st.press[p.id] = on ? 0 : st.press[p.id] + dt;
    if (on) any = true;
  }
  const people = G.players.filter(p => !(typeof cpuOn === 'function' && cpuOn(p.id)));
  st.away = !people.length ? 0 : any ? 0 : st.away + dt;
}
// both players pressed something in the last `secs` seconds (the computer always counts)
const rf27BothPlaying = (st, secs = 6) => !!st.press && st.press[0] < secs && st.press[1] < secs;

/* ---------- pops and news ---------- */
function rf27Pop(st, x, y, s, col = '#ffffff', size = 18) {
  if (!st.pops) st.pops = [];
  st.pops.push({ x, y, s: String(s), col, size, t: 0 });
  if (st.pops.length > 24) st.pops.shift();
}
function rf27News(st, s, gold = false, life = 4) { st.news = { s: String(s), gold, life, t: 0 }; }
function rf27Fx(st, dt) {
  if (st.pops) { for (const q of st.pops) q.t += dt; st.pops = st.pops.filter(q => q.t < 1.4); }
  if (st.news) { st.news.t += dt; if (st.news.t > st.news.life) st.news = null; }
  if (st.sparks) {
    for (const q of st.sparks) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 600 * dt; }
    st.sparks = st.sparks.filter(q => q.t < q.life);
  }
}
function rf27Sparks(st, x, y, n = 8, col = '#ffd36b', sp = 260) {
  if (!st.sparks) st.sparks = [];
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, v = sp * (0.4 + Math.random() * 0.6);
    st.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, t: 0, life: 0.35 + Math.random() * 0.35, col });
  }
  if (st.sparks.length > 220) st.sparks.splice(0, st.sparks.length - 220);
}
function rf27DrawPops(st) {
  for (const q of st.sparks || []) {
    ctx.globalAlpha = clamp(1 - q.t / q.life, 0, 1); ctx.fillStyle = q.col;
    ctx.fillRect(q.x - 2, q.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
  const big = rf27Big() ? 1.3 : 1;
  for (const q of st.pops || []) {
    const a = clamp(1.4 - q.t, 0, 1), y = q.y - q.t * 28, s = q.size * big;
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = s + 'px ' + RF27.DISPLAY; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(28,26,54,0.85)'; ctx.strokeText(q.s, q.x, y);
    ctx.fillStyle = q.col; ctx.fillText(q.s, q.x, y);
    ctx.restore();
  }
}
function rf27DrawNews(st, y = 92) {
  const n = st.news;
  if (!n) return;
  const a = clamp(Math.min(n.t / 0.25, (n.life - n.t) / 0.4), 0, 1), size = rf27Big() ? 20 : 15;
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = '700 ' + size + 'px ' + RF27.FONT;
  const w = ctx.measureText(n.s).width + 36;
  ctx.fillStyle = n.gold ? 'rgba(120,80,0,0.88)' : 'rgba(28,26,54,0.84)'; rr(W / 2 - w / 2, y, w, size + 16, (size + 16) / 2); ctx.fill();
  if (n.gold) { ctx.strokeStyle = C.gold; ctx.lineWidth = 2; rr(W / 2 - w / 2, y, w, size + 16, (size + 16) / 2); ctx.stroke(); }
  text(n.s, W / 2, y + (size + 16) / 2 + 0.5, size, n.gold ? C.gold : C.paper, 'center', 'body');
  ctx.restore();
}

/* ---------- boxes moving through solid rects ---------- */
// moves b by dx then dy; a oneWay rect only stops a box falling onto its top (and not while b.dropT > 0)
function rf27Move(b, dx, dy, solids) {
  const hit = { x: 0, y: 0, ground: null, ceil: null, wall: null };
  if (dx) {
    b.x += dx;
    for (const s of solids) {
      if (s.oneWay || s.off) continue;
      if (b.x < s.x + s.w && b.x + b.w > s.x && b.y < s.y + s.h - 0.01 && b.y + b.h > s.y + 0.01) {
        if (dx > 0) b.x = s.x - b.w; else b.x = s.x + s.w;
        hit.x = Math.sign(dx); hit.wall = s;
      }
    }
  }
  if (dy) {
    const y0 = b.y;
    b.y += dy;
    for (const s of solids) {
      if (s.off) continue;
      if (!(b.x < s.x + s.w - 0.01 && b.x + b.w > s.x + 0.01)) continue;
      if (s.oneWay) {
        if (dy > 0 && !(b.dropT > 0) && y0 + b.h <= s.y + 0.5 && b.y + b.h > s.y) { b.y = s.y - b.h; hit.y = 1; hit.ground = s; }
        continue;
      }
      if (b.y < s.y + s.h && b.y + b.h > s.y) {
        if (dy > 0) { b.y = s.y - b.h; hit.y = 1; hit.ground = s; } else { b.y = s.y + s.h; hit.y = -1; hit.ceil = s; }
      }
    }
  }
  return hit;
}
function rf27Ground(b, solids) {
  for (const s of solids) {
    if (s.off) continue;
    if (b.x < s.x + s.w - 0.5 && b.x + b.w > s.x + 0.5 && Math.abs(b.y + b.h - s.y) < 0.6) {
      if (s.oneWay && b.dropT > 0) continue;
      return s;
    }
  }
  return null;
}
// a player (engine physics: control() for speed and jumps) moved through solid rects; returns the ground under them
function rf27PlayerMove(p, dt, solids) {
  const was = p.grounded;
  control(p, dt);
  rf27Move(p, p.vx * dt, 0, solids);
  const vy = p.vy;
  const h = rf27Move(p, 0, p.vy * dt, solids);
  if (h.y > 0) p.vy = 0;
  if (h.y < 0) { p.vy = Math.max(0, p.vy); p.jumping = false; }
  const g = rf27Ground(p, solids);
  p.grounded = !!g; p.tileGround = !!g; p.onPartner = false; p.onOneWay = !!(g && g.oneWay);
  if (p.grounded && !was && vy > 260) { p.sx = 1.25; p.sy = 0.78; puff(p.x + p.w / 2, p.y + p.h, 5, 'rgba(255,255,255,0.75)'); Sfx.play('land'); }
  p.lastVy = p.grounded ? 0 : p.vy;
  return g;
}

/* ---------- drawing ---------- */
function rf27Stripes(x, y, w, h, a = '#ffc53d', b = '#2a2a3a') {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = a; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = b;
  for (let k = -h; k < w + h; k += 16) { ctx.beginPath(); ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + 8, y + h); ctx.lineTo(x + k + 8 + h, y); ctx.lineTo(x + k + h, y); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function rf27Gear(x, y, r, teeth, a, col, hole = '#2a2f4f') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = col; ctx.beginPath();
  for (let k = 0; k < teeth * 2; k++) {
    const rr0 = k % 2 ? r * 0.8 : r, a0 = (k / (teeth * 2)) * Math.PI * 2, a1 = ((k + 1) / (teeth * 2)) * Math.PI * 2;
    ctx.lineTo(Math.cos(a0) * rr0, Math.sin(a0) * rr0); ctx.lineTo(Math.cos(a1) * rr0, Math.sin(a1) * rr0);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = hole; circle(0, 0, r * 0.32); ctx.fill();
  ctx.restore();
}
const rf27Grad = {};
function rf27Backdrop(camX, camY, look, t) {
  const L = RF27.LOOKS[look] || RF27.LOOKS.bolts;
  // a hall that doesn't scroll copies its still far layers (wall, windows, girders) from one picture
  if (!camX && !camY) {
    const key = [look, canvas.width, canvas.height, typeof artPlain === 'function' && artPlain()].join('|');
    if (rf27Far.key === key) ctx.drawImage(rf27Far.cv, 0, 0, W, H);
    else {
      rf27BackdropFar(0, 0, look, L);
      const m = ctx.getTransform();
      if (!m.b && !m.c && !m.e && !m.f && Math.abs(m.a * W - canvas.width) < 1 && Math.abs(m.d * H - canvas.height) < 1 && ctx.globalAlpha === 1 && ctx.globalCompositeOperation === 'source-over') {
        const cv = document.createElement('canvas'); cv.width = canvas.width; cv.height = canvas.height; cv.getContext('2d').drawImage(canvas, 0, 0); rf27Far = { key, cv };
      }
    }
  } else rf27BackdropFar(camX, camY, look, L);
  rf27BackdropNear(camX, camY, look, L, t);
}
let rf27Far = { key: '' };
function rf27BackdropFar(camX, camY, look, L) {
  if (!rf27Grad[look]) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, L.top); g.addColorStop(1, L.bot); rf27Grad[look] = g; }
  ctx.fillStyle = rf27Grad[look]; ctx.fillRect(0, 0, W, H);
  // the far wall (slowest): tall factory windows with a cool glow and riveted wall panels between them
  {
    const wx0 = -((camX * 0.1) % 360) - 360, wy = 70 - camY * 0.1, win = mixCol(L.bot, '#ffffff', 0.35), frame = mixCol(L.top, L.bot, 0.55), pane = mixCol(frame, win, 0.5);
    for (let x = wx0; x < W + 360; x += 360) {
      if (x + 350 < 0 || x + 20 > W) continue;
      ctx.fillStyle = frame; ctx.fillRect(x + 100, wy, 150, 260);
      ctx.fillStyle = pane; ctx.fillRect(x + 108, wy + 8, 134, 244);
      ctx.fillStyle = mixCol(L.top, L.bot, 0.45);
      for (let k = 1; k < 4; k++) ctx.fillRect(x + 108 + k * 33.5 - 2, wy + 8, 4, 244);
      for (let k = 1; k < 6; k++) ctx.fillRect(x + 108, wy + 8 + k * 40.6 - 2, 134, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.moveTo(x + 120, wy + 252); ctx.lineTo(x + 170, wy + 8); ctx.lineTo(x + 196, wy + 8); ctx.lineTo(x + 146, wy + 252); ctx.fill();
      ctx.fillStyle = 'rgba(28,26,54,0.12)'; ctx.beginPath();
      for (const sx of [x + 20, x + 290]) for (let y = wy; y < wy + 260; y += 52) { ctx.rect(sx, y, 60, 1.5); ctx.moveTo(sx + 7.6, y + 6); ctx.arc(sx + 6, y + 6, 1.6, 0, 7); ctx.moveTo(sx + 55.6, y + 6); ctx.arc(sx + 54, y + 6, 1.6, 0, 7); }
      ctx.fill();
    }
  }
  // far girders (a slow parallax)
  const fx = -((camX * 0.2) % 240) - 240;
  ctx.fillStyle = L.far;
  for (let x = fx; x < W + 240; x += 240) {
    ctx.fillRect(x, 0, 18, H); ctx.fillRect(x + 222, 0, 18, H);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, 0, 4, H); ctx.fillRect(x + 222, 0, 4, H);
    ctx.fillStyle = 'rgba(0,0,20,0.12)'; ctx.fillRect(x + 14, 0, 4, H); ctx.fillRect(x + 236, 0, 4, H);
    ctx.fillStyle = L.far;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 6; ctx.strokeStyle = L.far;
    for (let y = 20 - ((camY * 0.2) % 120); y < H; y += 120) { ctx.beginPath(); ctx.moveTo(x + 18, y); ctx.lineTo(x + 222, y + 120); ctx.moveTo(x + 222, y); ctx.lineTo(x + 18, y + 120); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
}
function rf27BackdropNear(camX, camY, look, L, t) {
  // big turning gears in the background
  const gx = -((camX * 0.35) % 520);
  for (let x = gx; x < W + 520; x += 520) {
    const k = Math.round((x - gx) / 520 + camX * 0.35 / 520);
    ctx.globalAlpha = 0.35;
    rf27Gear(x + 140, 150 - camY * 0.35, 70, 12, t * 0.4 * (k % 2 ? 1 : -1), L.pipe, L.top);
    rf27Gear(x + 236, 214 - camY * 0.35, 40, 9, -t * 0.7 * (k % 2 ? 1 : -1) + 0.2, L.pipe, L.top);
    ctx.globalAlpha = 1;
    // the chain belt between the two gears
    ctx.strokeStyle = mixCol(L.far, L.pipe, 0.4); ctx.lineWidth = 3; ctx.globalAlpha = 0.45; ctx.setLineDash([6, 4]); ctx.lineDashOffset = -t * 30;
    ctx.beginPath(); ctx.moveTo(x + 140, 150 - camY * 0.35 - 62); ctx.lineTo(x + 236, 214 - camY * 0.35 - 36); ctx.moveTo(x + 140, 150 - camY * 0.35 + 62); ctx.lineTo(x + 236, 214 - camY * 0.35 + 36); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  // a hazy row of machines along the bottom of the hall: tanks, a chimney, control cabinets with blinking lights
  // (the machines are one picture per look with seams, bands, rivets, pipes, gauges and vents; the lights are live)
  {
    const mx0 = -((camX * 0.45) % 640) - 640, base = H + 20 - camY * 0.45;
    const pic = rf27Pic('w27mach|' + look, 640, 280, c => rf27MachineArt(c, L));
    for (let x = mx0; x < W + 640; x += 640) {
      if (x + 600 < 0 || x + 30 > W) continue;
      rf27Blit(pic, x, base - 280, 640, 280);
      for (let k = 0; k < 4; k++) { const on = Math.sin(t * 3 + k * 1.7 + x * 0.01) > 0; ctx.fillStyle = on ? L.light : 'rgba(0,0,0,0.2)'; ctx.globalAlpha = on ? 0.55 : 1; circle(x + 240 + k * 22, base - 96, 4); ctx.fill(); ctx.globalAlpha = 1; }
    }
  }
  // pipes along the ceiling, with warning lights
  const px = -((camX * 0.6) % 300);
  ctx.fillStyle = L.pipe; ctx.fillRect(0, 34 - camY * 0.6, W, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(0, 36 - camY * 0.6, W, 3);
  ctx.fillStyle = 'rgba(0,0,20,0.2)'; ctx.fillRect(0, 43 - camY * 0.6, W, 3);
  for (let x = px; x < W + 300; x += 300) {
    ctx.fillStyle = L.side; ctx.fillRect(x + 40, 30 - camY * 0.6, 14, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(x + 40, 30 - camY * 0.6, 14, 2);
    ctx.fillStyle = 'rgba(28,26,54,0.4)'; circle(x + 47, 34 - camY * 0.6, 1.5); ctx.fill(); circle(x + 47, 46 - camY * 0.6, 1.5); ctx.fill();
    // a hanger strap and a little valve wheel
    ctx.fillStyle = L.side; ctx.fillRect(x + 128, 0, 4, 36 - camY * 0.6);
    ctx.strokeStyle = L.light; ctx.globalAlpha = 0.7; ctx.lineWidth = 2.5; circle(x + 100, 28 - camY * 0.6, 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 94, 28 - camY * 0.6); ctx.lineTo(x + 106, 28 - camY * 0.6); ctx.moveTo(x + 100, 22 - camY * 0.6); ctx.lineTo(x + 100, 34 - camY * 0.6); ctx.stroke(); ctx.globalAlpha = 1;
    const on = Math.sin(t * 4 + x * 0.01) > 0.2;
    ctx.fillStyle = L.side; rr(x + 192, 44 - camY * 0.6, 16, 6, 2); ctx.fill();
    ctx.fillStyle = on ? L.light : 'rgba(0,0,0,0.25)'; circle(x + 200, 56 - camY * 0.6, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(x + 198, 54 - camY * 0.6, 1.8); ctx.fill();
    if (on) { ctx.fillStyle = 'rgba(255,255,255,0.12)'; circle(x + 200, 56 - camY * 0.6, 16); ctx.fill(); ctx.globalAlpha = 0.07; ctx.fillStyle = L.light; ctx.beginPath(); ctx.moveTo(x + 194, 60 - camY * 0.6); ctx.lineTo(x + 206, 60 - camY * 0.6); ctx.lineTo(x + 250, 220 - camY * 0.6); ctx.lineTo(x + 150, 220 - camY * 0.6); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
  }
}
// still art painted once into a picture at the screen's scale (keyed) and copied onto whole device pixels
// (Nov 2026 "richer props" pass: floors, crates, walls and machine parts got real detail; caching keeps it cheap)
const rf27Pics = {};
function rf27Scale() { return Math.max(1, Math.min(3, canvas.width / W)); }
function rf27Pic(key, w, h, paint) {
  const sc = rf27Scale(), k = key + '|' + sc;
  let p = rf27Pics[k];
  if (!p) { p = document.createElement('canvas'); p.width = Math.ceil(w * sc); p.height = Math.ceil(h * sc); const c = p.getContext('2d'); c.scale(sc, sc); paint(c, w, h); rf27Pics[k] = p; }
  return p;
}
function rf27Blit(pic, x, y, w, h) {
  const m = ctx.getTransform();
  if (m.b || m.c || Math.abs(m.a * w - pic.width) > 2 || Math.abs(m.d * h - pic.height) > 2) { ctx.drawImage(pic, x, y, w, h); return; }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(pic, Math.round(m.a * x + m.e), Math.round(m.d * y + m.f)); ctx.restore();
}
// '#rrggbb' mixes that stay '#rrggbb' (so they can be shaded again)
function rf27Mix(a, b, t) {
  const p = c => { const n = parseInt(String(c).slice(1, 7), 16) || 0; return [n >> 16, (n >> 8) & 255, n & 255]; };
  const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const rf27Dk = (c, t) => rf27Mix(c, '#14142a', t), rf27Lt = (c, t) => rf27Mix(c, '#ffffff', t);
// a riveted steel panel painted into c: brushed fill, inset bevel, corner rivets, the odd scratch; v picks a variant
// (0 plain, 1 vent grille, 2 stencil plate, 3 embossed cross brace)
function rf27PanelArt(c, x, y, w, h, col, v, seed) {
  c.fillStyle = col; c.fillRect(x, y, w, h);
  const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(20,18,40,0.14)');
  c.fillStyle = g; c.fillRect(x, y, w, h);
  c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 1; c.beginPath();
  for (let k = 3; k < h; k += 3) { c.moveTo(x + 2, y + k); c.lineTo(x + w - 2, y + k); }
  c.stroke();
  // inset bevel
  c.fillStyle = 'rgba(255,255,255,0.16)'; c.fillRect(x + 4, y + 4, w - 8, 1.5); c.fillRect(x + 4, y + 4, 1.5, h - 8);
  c.fillStyle = 'rgba(20,18,40,0.26)'; c.fillRect(x + 4, y + h - 5.5, w - 8, 1.5); c.fillRect(x + w - 5.5, y + 4, 1.5, h - 8);
  if (v === 1) {
    const vy = y + h * 0.3;
    c.fillStyle = rf27Dk(col, 0.35); c.fillRect(x + w * 0.25 - 2, vy - 2, w * 0.5 + 4, 26);
    for (let k = 0; k < 5; k++) { c.fillStyle = '#1c1a30'; c.fillRect(x + w * 0.25, vy + k * 5, w * 0.5, 2.6); c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(x + w * 0.25, vy + k * 5 + 2.6, w * 0.5, 0.8); }
  } else if (v === 2) {
    const py = y + h * 0.35, pw = Math.min(30, w - 16);
    c.fillStyle = rf27Lt(col, 0.25); c.fillRect(x + w / 2 - pw / 2, py, pw, 14);
    c.fillStyle = 'rgba(20,18,40,0.3)'; c.fillRect(x + w / 2 - pw / 2, py + 12.5, pw, 1.5);
    c.fillStyle = 'rgba(20,18,40,0.55)'; c.font = '700 9px ' + RF27.FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(['B-27', 'R-12', 'BAY 3', 'K-9'][seed % 4], x + w / 2, py + 7.5);
    for (const sx of [x + w / 2 - pw / 2 + 2.5, x + w / 2 + pw / 2 - 2.5]) { c.fillStyle = 'rgba(20,18,40,0.5)'; c.beginPath(); c.arc(sx, py + 7, 1, 0, 7); c.fill(); }
  } else if (v === 3) {
    c.strokeStyle = 'rgba(20,18,40,0.22)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 8, y + 8); c.lineTo(x + w - 8, y + h - 8); c.moveTo(x + w - 8, y + 8); c.lineTo(x + 8, y + h - 8); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 8, y + 7); c.lineTo(x + w - 8, y + h - 9); c.moveTo(x + w - 9, y + 8); c.lineTo(x + 7, y + h - 8); c.stroke();
  }
  // scratches and an oil spot now and then
  const hh = hash(seed, 271);
  if (hh % 3 === 0) { c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 0.8; c.beginPath(); const sx = x + 8 + hh % Math.max(1, w - 24), sy = y + 10 + (hh >>> 6) % Math.max(1, h - 20); c.moveTo(sx, sy); c.lineTo(sx + 10, sy + 3); c.moveTo(sx + 3, sy + 3); c.lineTo(sx + 9, sy + 5); c.stroke(); }
  if (hh % 5 === 1) { c.fillStyle = 'rgba(20,18,40,0.12)'; c.beginPath(); c.ellipse(x + w * 0.6, y + h - 10, 9, 3, 0, 0, 7); c.fill(); }
  // rivets with a lit side
  for (const [a, b] of [[7, 7], [w - 7, 7], [7, h - 7], [w - 7, h - 7]]) {
    c.fillStyle = rf27Dk(col, 0.45); c.beginPath(); c.arc(x + a, y + b, 2.2, 0, 7); c.fill();
    c.fillStyle = rf27Lt(col, 0.45); c.beginPath(); c.arc(x + a - 0.6, y + b - 0.6, 1, 0, 7); c.fill();
  }
  c.strokeStyle = rf27Dk(col, 0.4); c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
// the background machines (640 x 280, base line at y 280): same places and sizes as before, now with detail
function rf27MachineArt(c, L) {
  const mc = rf27Mix(L.far, L.bot, 0.35), mlit = rf27Mix(L.far, L.bot, 0.55), mdk = rf27Mix(L.far, L.bot, 0.2), b = 280;
  const seam = 'rgba(20,18,40,0.14)', hi = 'rgba(255,255,255,0.10)';
  const rivRow = (x0, x1, y, step = 12) => { c.fillStyle = mdk; for (let x = x0; x <= x1; x += step) { c.beginPath(); c.arc(x, y, 1.5, 0, 7); c.fill(); } c.fillStyle = hi; for (let x = x0; x <= x1; x += step) { c.beginPath(); c.arc(x - 0.5, y - 0.5, 0.7, 0, 7); c.fill(); } };
  // tank (rounded) with bands, a gauge and a pipe
  c.fillStyle = mc; rrOn(c, 30, b - 170, 90, 170, 30); c.fill();
  c.fillStyle = mdk; c.fillRect(92, b - 160, 28, 160);
  c.fillStyle = mlit; c.fillRect(40, b - 150, 6, 130);
  for (const by of [b - 120, b - 70]) { c.fillStyle = mlit; c.fillRect(30, by, 90, 4); c.fillStyle = seam; c.fillRect(30, by + 4, 90, 2); rivRow(36, 114, by + 2, 10); }
  c.fillStyle = mdk; c.beginPath(); c.arc(75, b - 145, 11, 0, 7); c.fill(); c.fillStyle = mlit; c.beginPath(); c.arc(75, b - 145, 8, 0, 7); c.fill();
  c.strokeStyle = mdk; c.lineWidth = 1.5; c.beginPath(); c.moveTo(75, b - 145); c.lineTo(80, b - 150); c.stroke();
  c.fillStyle = mc; c.fillRect(120, b - 40, 30, 10); c.fillStyle = mlit; c.fillRect(120, b - 40, 30, 2);
  // chimney with bands and ladder rungs
  c.fillStyle = mc; c.fillRect(150, b - 260, 34, 260);
  c.fillStyle = mdk; c.fillRect(174, b - 260, 10, 260); c.fillStyle = mlit; c.fillRect(150, b - 260, 34, 6); c.fillRect(153, b - 254, 3, 254);
  for (let y = b - 230; y < b; y += 46) { c.fillStyle = mdk; c.fillRect(148, y, 38, 5); c.fillStyle = hi; c.fillRect(148, y, 38, 1.2); }
  c.strokeStyle = mdk; c.lineWidth = 1.5; for (let y = b - 240; y < b - 10; y += 12) { c.beginPath(); c.moveTo(186, y); c.lineTo(194, y); c.stroke(); }
  c.beginPath(); c.moveTo(186, b - 245); c.lineTo(186, b); c.moveTo(194, b - 245); c.lineTo(194, b); c.stroke();
  // control cabinet with a door, vents and a dial (the light row is live)
  c.fillStyle = mc; rrOn(c, 220, b - 120, 120, 120, 6); c.fill();
  c.fillStyle = 'rgba(0,0,20,0.12)'; c.fillRect(236, b - 80, 88, 50);
  c.strokeStyle = seam; c.lineWidth = 1.5; c.strokeRect(232, b - 110, 96, 104);
  c.fillStyle = hi; c.fillRect(232, b - 110, 96, 1.5);
  for (let k = 0; k < 5; k++) { c.fillStyle = mdk; c.fillRect(244, b - 72 + k * 8, 72, 3); c.fillStyle = hi; c.fillRect(244, b - 69 + k * 8, 72, 1); }
  c.fillStyle = mdk; c.fillRect(320, b - 60, 4, 14);
  c.fillStyle = mlit; c.fillRect(220, b - 120, 120, 3);
  rivRow(228, 334, b - 114, 106);
  // tall dome tank with its base box, hoops and a pipe elbow
  c.fillStyle = mc; rrOn(c, 380, b - 200, 70, 200, 35); c.fill(); c.fillRect(360, b - 90, 110, 90);
  c.fillStyle = mdk; c.fillRect(432, b - 180, 18, 90); c.fillStyle = mlit; c.fillRect(390, b - 180, 6, 160);
  for (const by of [b - 150, b - 115]) { c.fillStyle = mlit; c.fillRect(380, by, 70, 3); c.fillStyle = seam; c.fillRect(380, by + 3, 70, 2); }
  c.strokeStyle = seam; c.lineWidth = 1.5; c.strokeRect(366, b - 84, 98, 78); rivRow(372, 458, b - 78, 14);
  c.strokeStyle = mc; c.lineWidth = 10; c.beginPath(); c.moveTo(450, b - 160); c.lineTo(480, b - 160); c.lineTo(480, b - 140); c.stroke();
  c.strokeStyle = mlit; c.lineWidth = 2; c.beginPath(); c.moveTo(450, b - 164); c.lineTo(484, b - 164); c.stroke();
  // a press machine box with a window and stacked crates in silhouette
  c.fillStyle = mc; c.fillRect(500, b - 140, 100, 140);
  c.fillStyle = 'rgba(0,0,20,0.12)'; c.fillRect(512, b - 126, 76, 30);
  c.fillStyle = hi; c.fillRect(514, b - 124, 30, 3);
  c.fillStyle = mlit; c.fillRect(500, b - 140, 100, 3); c.fillStyle = mdk; c.fillRect(588, b - 137, 12, 137);
  c.strokeStyle = seam; c.lineWidth = 1.5; for (let y = b - 86; y < b; y += 28) { c.beginPath(); c.moveTo(500, y); c.lineTo(600, y); c.stroke(); }
  rivRow(506, 594, b - 132, 11);
  c.fillStyle = mdk; c.fillRect(604, b - 40, 30, 40); c.fillRect(608, b - 64, 22, 24); c.fillStyle = hi; c.fillRect(604, b - 40, 30, 1.5); c.fillRect(608, b - 64, 22, 1.5);
}
function rf27Floor(x, y, w, h, look) {
  const L = RF27.LOOKS[look] || RF27.LOOKS.bolts;
  ctx.fillStyle = L.side; ctx.fillRect(x, y, w, h);
  const th = Math.min(h, 14);
  // the marks are only laid where the screen can see them (a floor can run far off-screen, and deep below it)
  const m = ctx.getTransform(), sx = m.a || 1, sy = m.d || 1;
  const vx0 = Math.max(x, (-m.e) / sx - 60), vx1 = Math.min(x + w, (canvas.width - m.e) / sx + 60), vy1 = Math.min(y + h, (canvas.height - m.f) / sy + 40);
  // riveted side panels (pictures: inset bevel, rivets, vents, stencil plates, braces, scratches), clipped to the floor
  if (h > 30) {
    const pw = w <= 120 ? w : 60, ph = 80, k0 = x + Math.max(0, Math.floor((vx0 - x) / pw) * pw);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y + th, w, h - th); ctx.clip();
    for (let k = k0; k < vx1; k += pw) {
      const col = Math.round((k - x) / pw);
      for (let yy = y + th + 4, row = 0; yy < vy1; yy += ph, row++) {
        const hh = hash(col + Math.round(x / 7), row * 13 + 5), v = row > 1 ? 0 : hh % 6 < 3 ? 0 : hh % 6 - 2;
        rf27Blit(rf27Pic('w27panel|' + look + '|' + pw + '|' + Math.min(v, 3) + '|' + (hh % 3), pw, ph, c => rf27PanelArt(c, 0, 0, pw, ph, L.side, Math.min(v, 3), hh % 3 + v * 3)), k, yy, pw, ph);
      }
    }
    // a soft shadow under the tread strip
    const g = ctx.createLinearGradient(0, y + th, 0, y + th + 12); g.addColorStop(0, 'rgba(20,18,40,0.35)'); g.addColorStop(1, 'rgba(20,18,40,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y + th, w, 12);
    ctx.restore();
  } else if (h > th) { ctx.fillStyle = 'rgba(28,26,54,0.22)'; ctx.fillRect(x, y + th, w, 5); }
  // the top: diamond tread plate (raised lozenges in two directions, each with a dark side and a lit side)
  ctx.fillStyle = L.floor; ctx.fillRect(x, y, w, th);
  if (th >= 12) {
    const a0 = x + 6 + Math.max(0, Math.floor((vx0 - x) / 12) * 12), a1 = Math.min(x + w - 6, vx1);
    for (const [col, ox, oy] of [['rgba(28,26,54,0.22)', 0.7, 0.7], ['rgba(255,255,255,0.22)', -0.5, -0.5]]) {
      ctx.fillStyle = col; ctx.beginPath();
      for (let k = a0; k < a1; k += 12) {
        const odd = ((k - x - 6) / 12) % 2, cy = y + 7.5 + ox * 0 + oy, cx = k + ox;
        if (odd) { ctx.moveTo(cx - 3.5, cy + 1.6); ctx.lineTo(cx + 2.3, cy - 2.9); ctx.lineTo(cx + 3.5, cy - 1.6); ctx.lineTo(cx - 2.3, cy + 2.9); }
        else { ctx.moveTo(cx - 2.3, cy - 2.9); ctx.lineTo(cx + 3.5, cy + 1.6); ctx.lineTo(cx + 2.3, cy + 2.9); ctx.lineTo(cx - 3.5, cy - 1.6); }
        ctx.closePath();
      }
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(28,26,54,0.08)'; ctx.fillRect(x, y + th * 0.55, w, th * 0.45);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x, y, w, 2.5);
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x, y + 2.5, w, 1);
  ctx.fillStyle = 'rgba(28,26,54,0.35)'; ctx.fillRect(x, y + th - 2, w, 2);
  // countersunk bolts along the strip, every 60 px, with a lit rim
  ctx.fillStyle = 'rgba(28,26,54,0.4)';
  ctx.beginPath(); for (let k = x + 10 + Math.max(0, Math.floor((vx0 - x) / 60) * 60); k < Math.min(x + w - 4, vx1); k += 60) { ctx.moveTo(k + 2.4, y + 7.5); ctx.arc(k, y + 7.5, 2.4, 0, 7); } ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath(); for (let k = x + 10 + Math.max(0, Math.floor((vx0 - x) / 60) * 60); k < Math.min(x + w - 4, vx1); k += 60) { ctx.moveTo(k + 0.4, y + 6.8); ctx.arc(k - 0.6, y + 6.8, 0.9, 0, 7); } ctx.fill();
  // lit top-left corner and a dark outline in the floor's own shade
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(x, y, 2, Math.min(h, 60));
  ctx.strokeStyle = shade(L.side, 0.4); ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
}
// kind: 'metal' (magnetic, grey-blue), 'wood', 'gold', 'spring' (a picture per size and kind)
function rf27Crate(x, y, w, h, kind = 'metal', t = 0) {
  rf27Blit(rf27Pic('w27crate|' + kind + '|' + w + '|' + h + '|' + (!document.fonts || document.fonts.status === 'loaded'), w, h, c => rf27CrateArt(c, w, h, kind)), x, y, w, h);
  void t;
}
function rf27CrateArt(c, w, h, kind) {
  const pal = { metal: ['#9aa8c8', '#4d5a7e', '#c4cee6'], wood: ['#d39a5c', '#7e4a22', '#e8b882'], gold: ['#ffd36b', '#a9750a', '#fff0b0'], spring: ['#8fd8b0', '#2f7a56', '#c8f2da'] }[kind] || ['#9aa8c8', '#4d5a7e', '#c4cee6'];
  const [base, dark, lit] = pal, m = Math.max(5, Math.round(Math.min(w, h) * 0.12));
  if (kind === 'wood') {
    // planks with grain and knots, a nailed frame and a diagonal brace
    c.save(); rrOn(c, 1.5, 1.5, w - 3, h - 3, 4); c.clip();
    const n = Math.max(3, Math.round(h / 14)), bh = h / n;
    for (let k = 0; k < n; k++) {
      const pc = rf27Mix(base, k % 2 ? '#ffffff' : '#3a1a08', 0.06 + (hash(k, w) % 3) * 0.03);
      c.fillStyle = pc; c.fillRect(0, k * bh, w, bh);
      c.strokeStyle = rf27Dk(base, 0.3); c.lineWidth = 0.7;
      for (let g = 0; g < 2; g++) { const gy = k * bh + bh * (0.3 + g * 0.35); c.beginPath(); c.moveTo(2, gy); c.bezierCurveTo(w * 0.3, gy + 1.5, w * 0.6, gy - 1.5, w - 2, gy + 0.5); c.stroke(); }
      c.fillStyle = 'rgba(60,30,10,0.35)'; c.fillRect(0, (k + 1) * bh - 1.2, w, 1.2);
      c.fillStyle = 'rgba(255,240,210,0.25)'; c.fillRect(0, k * bh, w, 1);
      if (hash(k, h) % 3 === 0) { c.fillStyle = rf27Dk(base, 0.35); c.beginPath(); c.ellipse(w * (0.25 + (hash(k, 3) % 50) / 100), k * bh + bh / 2, 2.6, 1.4, 0, 0, 7); c.fill(); }
    }
    c.restore();
    // frame and brace
    c.fillStyle = rf27Dk(base, 0.12);
    c.fillRect(1.5, 1.5, w - 3, m); c.fillRect(1.5, h - 1.5 - m, w - 3, m); c.fillRect(1.5, 1.5, m, h - 3); c.fillRect(w - 1.5 - m, 1.5, m, h - 3);
    c.save(); c.beginPath(); c.rect(m, m, w - 2 * m, h - 2 * m); c.clip();
    c.strokeStyle = rf27Dk(base, 0.12); c.lineWidth = m * 0.9; c.beginPath(); c.moveTo(m, h - m); c.lineTo(w - m, m); c.stroke();
    c.strokeStyle = 'rgba(255,240,210,0.3)'; c.lineWidth = 1; c.beginPath(); c.moveTo(m, h - m - m * 0.45); c.lineTo(w - m - m * 0.45, m); c.stroke();
    c.restore();
    c.fillStyle = 'rgba(255,240,210,0.35)'; c.fillRect(2, 2, w - 4, 1.2); c.fillRect(2, 2, 1.2, h - 4);
    c.fillStyle = 'rgba(40,20,5,0.3)'; c.fillRect(2, h - m - 1.5, w - 4, m); c.fillRect(w - m - 1.5, 2, m, h - 4);
    for (const [a, b] of [[m / 2 + 1.5, m / 2 + 1.5], [w - m / 2 - 1.5, m / 2 + 1.5], [m / 2 + 1.5, h - m / 2 - 1.5], [w - m / 2 - 1.5, h - m / 2 - 1.5]]) { c.fillStyle = '#4a4a5a'; c.beginPath(); c.arc(a, b, 1.4, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(a - 0.9, b - 1, 0.8, 0.8); }
    c.strokeStyle = dark; c.lineWidth = 2.5; rrOn(c, 1.5, 1.5, w - 3, h - 3, 4); c.stroke();
    return;
  }
  // steel (and gold and spring) crates: a framed box with a recessed face, corner brackets, rivets, a label
  const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, rf27Lt(base, 0.12)); g.addColorStop(0.55, base); g.addColorStop(1, rf27Dk(base, 0.18));
  c.fillStyle = g; rrOn(c, 1.5, 1.5, w - 3, h - 3, 5); c.fill();
  // the recessed face (dark top-left inner edge, lit bottom-right: it sits back)
  c.fillStyle = rf27Dk(base, 0.08); c.fillRect(m, m, w - 2 * m, h - 2 * m);
  c.fillStyle = 'rgba(20,18,40,0.28)'; c.fillRect(m, m, w - 2 * m, 2); c.fillRect(m, m, 2, h - 2 * m);
  c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(m, h - m - 1.5, w - 2 * m, 1.5); c.fillRect(w - m - 1.5, m, 1.5, h - 2 * m);
  // brushed lines on the face
  c.strokeStyle = 'rgba(255,255,255,0.07)'; c.lineWidth = 1; c.beginPath(); for (let k = m + 4; k < h - m; k += 3) { c.moveTo(m + 2, k); c.lineTo(w - m - 2, k); } c.stroke();
  // corner brackets
  c.fillStyle = rf27Dk(base, 0.22);
  for (const [a, b, sxx, syy] of [[1.5, 1.5, 1, 1], [w - 1.5, 1.5, -1, 1], [1.5, h - 1.5, 1, -1], [w - 1.5, h - 1.5, -1, -1]]) {
    c.beginPath(); c.moveTo(a, b); c.lineTo(a + sxx * m * 2.2, b); c.lineTo(a + sxx * m * 2.2, b + syy * m); c.lineTo(a + sxx * m, b + syy * m); c.lineTo(a + sxx * m, b + syy * m * 2.2); c.lineTo(a, b + syy * m * 2.2); c.closePath(); c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(2.5, 2.5, w - 5, 1.5); c.fillRect(2.5, 2.5, 1.5, h - 5);
  c.fillStyle = 'rgba(20,18,40,0.22)'; c.fillRect(2.5, h - 4.5, w - 5, 2); c.fillRect(w - 4.5, 2.5, 2, h - 5);
  for (const [a, b] of [[m * 0.55 + 1.5, m * 0.55 + 1.5], [w - m * 0.55 - 1.5, m * 0.55 + 1.5], [m * 0.55 + 1.5, h - m * 0.55 - 1.5], [w - m * 0.55 - 1.5, h - m * 0.55 - 1.5], [w / 2, m * 0.55 + 1.5], [w / 2, h - m * 0.55 - 1.5]]) {
    c.fillStyle = dark; c.beginPath(); c.arc(a, b, 2.2, 0, 7); c.fill();
    c.fillStyle = lit; c.beginPath(); c.arc(a - 0.6, b - 0.6, 1, 0, 7); c.fill();
  }
  if (kind === 'spring') {
    c.strokeStyle = dark; c.lineWidth = 2.5; c.beginPath(); for (let k = 0; k <= 6; k++) c.lineTo(w * 0.28 + (k % 2) * w * 0.44, h * 0.28 + k * h * 0.44 / 6); c.stroke();
    c.strokeStyle = lit; c.lineWidth = 1; c.beginPath(); for (let k = 0; k <= 6; k++) c.lineTo(w * 0.28 + (k % 2) * w * 0.44 - 0.8, h * 0.28 + k * h * 0.44 / 6 - 0.8); c.stroke();
  } else if (kind === 'gold') {
    c.fillStyle = '#fff6c8'; c.beginPath(); c.arc(w / 2, h / 2, Math.min(w, h) * 0.16, 0, 7); c.fill();
    c.strokeStyle = dark; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.moveTo(m + 4, h - m - 4); c.lineTo(m + 12, h - m - 4); c.lineTo(w - m - 4, m + 12); c.lineTo(w - m - 4, m + 4); c.closePath(); c.fill();
  } else {
    // a stencilled Fe, a hazard corner and a paper tag with a barcode
    c.fillStyle = 'rgba(28,26,54,0.3)'; c.font = Math.round(Math.min(w, h) * 0.32) + 'px ' + RF27.DISPLAY; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Fe', w / 2, h / 2 + 1);
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillText('Fe', w / 2 - 0.8, h / 2);
    c.save(); c.beginPath(); c.moveTo(w - m, h - m - 12); c.lineTo(w - m, h - m); c.lineTo(w - m - 12, h - m); c.closePath(); c.clip();
    c.fillStyle = '#ffc53d'; c.fillRect(w - m - 12, h - m - 12, 12, 12); c.fillStyle = '#2a2a3a'; for (let k = -12; k < 12; k += 5) { c.beginPath(); c.moveTo(w - m - 12 + k, h - m); c.lineTo(w - m - 9.5 + k, h - m); c.lineTo(w - m + 2.5 + k, h - m - 12); c.lineTo(w - m + k, h - m - 12); c.closePath(); c.fill(); }
    c.restore();
    const tw = Math.min(18, w * 0.26); c.fillStyle = '#f2ecd8'; c.fillRect(m + 3, m + 3, tw, 10); c.fillStyle = 'rgba(20,18,40,0.6)'; for (let k = 0; k < tw - 4; k += 2) c.fillRect(m + 5 + k, m + 5, (hash(k, w) % 2) + 0.6, 6);
  }
  // scuffs
  c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(w * 0.3, h * 0.72); c.lineTo(w * 0.42, h * 0.76); c.moveTo(w * 0.62, h * 0.3); c.lineTo(w * 0.7, h * 0.27); c.stroke();
  c.strokeStyle = dark; c.lineWidth = 2.5; rrOn(c, 1.5, 1.5, w - 3, h - 3, 5); c.stroke();
}
// a small rounded key chip ("F", "▲") at x, y (centre)
function rf27Chip(x, y, label, col = C.gold, size = 13) {
  ctx.font = '700 ' + size + 'px ' + RF27.FONT;
  const w = Math.max(size + 10, ctx.measureText(label).width + 12), h = size + 9;
  ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(x - w / 2, y - h / 2, w, h, 6); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; rr(x - w / 2, y - h / 2, w, h, 6); ctx.stroke();
  text(label, x, y + 0.5, size, col, 'center', 'body');
  return w;
}
// a job panel: a name line and up to two hint lines, in the player's colour, anchored at the bottom left or right
function rf27Panel(id, title, l1, l2, side) {
  const big = rf27Big(), s = big ? 1.3 : 1, f1 = Math.round(15 * s), f2 = Math.round(13 * s);
  ctx.font = '700 ' + f2 + 'px ' + RF27.FONT;
  const w = Math.max(150 * s, ctx.measureText(l1 || '').width + 24, ctx.measureText(l2 || '').width + 24, (ctx.measureText(title).width + 30) * 1.12);
  const h = (l2 ? 66 : 48) * s, y = H - h - 10;
  const x = side === 'right' ? W - w - 12 : 12;
  ctx.fillStyle = 'rgba(28,26,54,0.82)'; rr(x, y, w, h, 12); ctx.fill();
  ctx.strokeStyle = PCOL[id]; ctx.lineWidth = 2.5; rr(x, y, w, h, 12); ctx.stroke();
  text(title, x + 12, y + 14 * s, f1, PCOL[id], 'left');
  if (l1) text(l1, x + 12, y + 34 * s, f2, C.paper, 'left', 'body');
  if (l2) text(l2, x + 12, y + 52 * s, f2, '#d9d3ef', 'left', 'body');
  return { x, y, w, h };
}
// the top-right pill: a list of short strings ("2:14", "Bolts 12/40")
function rf27TopPill(parts) {
  const big = rf27Big(), size = big ? 18 : 14;
  const s = parts.filter(Boolean).join('   ');
  ctx.font = '700 ' + size + 'px ' + RF27.FONT;
  const w = ctx.measureText(s).width + 28;
  pill(W - 14, 12, w, size + 14, 'right');
  text(s, W - 28, 12 + (size + 14) / 2 + 0.5, size, C.paper, 'right', 'body');
}
// "Taking a break" card
function rf27Break() {
  const big = rf27Big(), size = big ? 26 : 20;
  ctx.fillStyle = 'rgba(28,26,54,0.55)'; ctx.fillRect(0, 0, W, H);
  text('Taking a break', W / 2, H / 2 - 12, size + 8, C.paper, 'center');
  text('Press any key to carry on', W / 2, H / 2 + 22, size - 4, '#d9d3ef', 'center', 'body');
}
// a cute boxy factory helper robot (scenery): x, y feet, s scale, col body colour
function rf27Bot(x, y, s, col, t, face = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * face, s);
  const bob = Math.sin(t * 5) * 1.5;
  ctx.fillStyle = 'rgba(28,26,54,0.2)'; ctx.beginPath(); ctx.ellipse(0, 1, 18, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4a4f6e'; ctx.fillRect(-10, -12, 6, 12); ctx.fillRect(4, -12, 6, 12);
  ctx.fillStyle = col; ctx.strokeStyle = 'rgba(28,26,54,0.6)'; ctx.lineWidth = 2;
  rr(-16, -40 + bob, 32, 30, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(28,26,54,0.18)'; rr(4, -39 + bob, 11, 28, 5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-13, -37 + bob, 2.5, 22);
  ctx.fillStyle = '#ffd36b'; circle(-6, -26 + bob, 2.2); ctx.fill(); ctx.fillStyle = '#8fe3b0'; circle(0, -26 + bob, 2.2); ctx.fill();
  ctx.fillStyle = col; rr(-12, -62 + bob, 24, 20, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#bff6ff'; rr(-8, -57 + bob, 16, 9, 3); ctx.fill();
  ctx.fillStyle = '#1c1a36'; circle(-3, -52.5 + bob, 1.8); ctx.fill(); circle(4, -52.5 + bob, 1.8); ctx.fill();
  ctx.strokeStyle = '#4a4f6e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -62 + bob); ctx.lineTo(0, -70 + bob); ctx.stroke();
  ctx.fillStyle = Math.sin(t * 6) > 0 ? '#ff6b6b' : '#ffd36b'; circle(0, -72 + bob, 3); ctx.fill();
  ctx.restore();
}

/* ---------- sounds ---------- */
Sfx.extra.rf27Clank = function (p) { p = p || 1; this.tone(180 * p, 0.12, 'square', 0.05, 90 * p); this.tone(1200 * p, 0.05, 'triangle', 0.02); };
Sfx.extra.rf27Bonk = function (p) { p = p || 1; this.tone(300 * p, 0.1, 'triangle', 0.06, 160 * p); };
Sfx.extra.rf27Whirr = function (p) { p = p || 1; this.tone(220 * p, 0.25, 'sawtooth', 0.015, 440 * p); };
Sfx.extra.rf27Ding = function (p) { p = p || 1; this.tone(1320 * p, 0.12, 'triangle', 0.045); this.tone(1760 * p, 0.14, 'triangle', 0.035, null, 0.07); };
Sfx.extra.rf27Boing = function (p) { p = p || 1; this.tone(180 * p, 0.3, 'sine', 0.06, 640 * p); };
Sfx.extra.rf27Zap = function (p) { p = p || 1; this.tone(900 * p, 0.12, 'sawtooth', 0.02, 300 * p); };
Sfx.extra.rf27Punch = function (p) { p = p || 1; this.tone(120 * p, 0.12, 'square', 0.06, 60 * p); this.tone(600, 0.04, 'triangle', 0.03); };
Sfx.extra.rf27Beep = function (p) { p = p || 1; this.tone(880 * p, 0.06, 'square', 0.025); };
Sfx.extra.rf27Fix = function (p) { p = p || 1; [520, 700, 940].forEach((f, i) => this.tone(f * p, 0.08, 'triangle', 0.04, null, i * 0.06)); };
Sfx.extra.rf27Stamp = function (p) { p = p || 1; this.tone(90 * p, 0.18, 'square', 0.06, 50 * p); };
Sfx.extra.rf27Magnet = function (p) { p = p || 1; this.tone(260 * p, 0.2, 'sine', 0.04, 520 * p); this.tone(1100 * p, 0.08, 'triangle', 0.015, null, 0.1); };
Sfx.extra.rf27Drop = function (p) { p = p || 1; this.tone(500 * p, 0.14, 'sine', 0.035, 200 * p); };
Sfx.extra.rf27Cheer = function () { [660, 880, 1100, 1320].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.04, null, i * 0.08)); };
