/* Pip & Bo - Levels: World 3 Fairway Fun golf (Tee for Two, Bounce House, Windmill Way, Portal Park), including its drawing. */
'use strict';

/* ---------- Tee for Two: one player golfs, the other IS the ball ---------- */
// The golfer aims and charges the swing. The ball player rides along and can spend a small
// boost bar mid-flight to nudge the ball. Each hole swaps who does what.
const GOLF = {
  g: 1200, vmax: 1150, r: 10, bounce: 0.42, roll: 320, drag: 0.1, sandBounce: 0.08, sandRoll: 2200,
  boostAcc: 1100, boostTime: 0.4, charge: 1.1, maxStrokes: 10, flyMax: 14,
  padV: 880, padSideV: 900, padAngle: 55, bumpBounce: 0.9, bumpMin: 380, millBounce: 0.55,
};
const golfSolid = (tx, ty) => { const ch = tile(tx, ty); return ch === '#' || ch === 'P' || ch === 's' || ch === 'X'; };
const golfDir = () => (Math.cos(G.golf.aim * Math.PI / 180) >= 0 ? 1 : -1);
function golfScoreName(s, par) {
  if (s === 1) return 'Hole in one!';
  const d = s - par;
  return d <= -3 ? 'Albatross!' : d === -2 ? 'Eagle!' : d === -1 ? 'Birdie!' : d === 0 ? 'Par' : d === 1 ? 'Bogey' : d === 2 ? 'Double bogey' : s + ' strokes';
}
// where the golfer stands: behind the ball, on the side they're hitting from
function golferSpot() {
  const g = G.golf, b = g.b, dir = golfDir(), feet = b.y + GOLF.r;
  const fits = x => {
    const c1 = Math.floor(x / T), c2 = Math.floor((x + PW - 0.01) / T), r1 = Math.floor((feet - PH) / T), r2 = Math.floor((feet - 1) / T);
    for (let c = c1; c <= c2; c++) for (let r = r1; r <= r2; r++) if (golfSolid(c, r)) return false;
    return true;
  };
  for (const d of [dir, -dir]) {
    const x = b.x - d * (GOLF.r + 5) - (d > 0 ? PW : 0);
    if (fits(x)) return { x, y: feet - PH, face: dir };
  }
  return { x: b.x - PW / 2, y: feet - PH, face: dir };
}
function placeGolfer(sp) {
  const p = G.players[G.golf.golfer];
  Object.assign(p, { x: sp.x, y: sp.y, vx: 0, vy: 0, grounded: true, face: sp.face });
}
function setupGolfHole(k) {
  const L = G.level, g = G.golf;
  g.hole = k; g.golfer = k % 2; g.ball = 1 - g.golfer; g.strokes[k] = 0;
  g.b = { x: L.tee.x, y: L.tee.y, vx: 0, vy: 0, spin: 0, fuel: 1, rest: 0, flyT: 0, from: { x: L.tee.x, y: L.tee.y }, boosting: false, ground: true, sfxT: 0, hidden: false };
  g.phase = 'aim'; g.phaseT = 0; g.charging = false; g.power = 0; g.powerT = 0; g.aimHold = 0; g.swingT = 0; g.msg = null; g.walk = null;
  g.aim = golfAutoAim(L.tee.x, L.tee.y);
  const gp = G.players[g.golfer], bp = G.players[g.ball];
  Object.assign(gp, makePlayer(gp.id), { input: gp.input, prevJump: true });
  Object.assign(bp, makePlayer(bp.id), { input: bp.input, prevJump: true, alive: false, respawnT: Infinity });
  placeGolfer(golferSpot());
  G.spawnPts = [];
}
function golfNextHole() {
  G.room = 1;
  G.level = parseLevel(roomDef(LEVELS[G.levelIndex], 1));
  G.particles = [];
  setupGolfHole(1);
  G.introT = 3.6;
  Sfx.play('room'); rumble(0, 0.2, 0.4, 120); rumble(1, 0.2, 0.4, 120);
}
function golfSwing() {
  const g = G.golf, b = g.b, a = g.aim * Math.PI / 180, v = g.power * GOLF.vmax;
  b.vx = Math.cos(a) * v; b.vy = -Math.sin(a) * v;
  b.from = { x: b.x, y: b.y }; b.fuel = 1; b.rest = 0; b.flyT = 0; b.ground = false; b.padCD = 0; b.portCD = 0; b.lastPad = -1; b.padStreak = 0;
  for (const rg of G.level.rings) rg.used = false;
  g.strokes[g.hole]++; g.charging = false; g.phase = 'fly'; g.phaseT = 0; g.swingT = 0.35;
  const gp = G.players[g.golfer]; gp.sx = 1.15; gp.sy = 0.88;
  Sfx.play('thwack', g.golfer);
  rumble(g.golfer, 0.25 + 0.5 * g.power, 0.5, 110); rumble(g.ball, 0.4, 0.6, 90);
  puff(b.x, b.y + GOLF.r, 6, 'rgba(255,255,255,0.9)');
}
function golfAutoAim(x, y) {
  const L = G.level, d = L.def, right = L.cup.x >= x;
  if (d.flatY && y > d.flatY) return d.flatAim ?? (right ? 0 : 180);
  return right ? 40 : 140;
}
function golfStartWalk() {
  const g = G.golf, L = G.level, b = g.b, gp = G.players[g.golfer];
  g.aim = golfAutoAim(b.x, b.y);
  const to = golferSpot();
  const dist = Math.hypot(to.x - gp.x, to.y - gp.y);
  g.walk = { fx: gp.x, fy: gp.y, to, t: 0, dur: clamp(dist / 520, 0.25, 1.1), hop: Math.min(70, dist * 0.3) + 10 };
  g.phase = 'walk'; g.phaseT = 0;
}
function golfHoleDone(pickedUp) {
  const g = G.golf, L = G.level;
  if (pickedUp) g.strokes[g.hole] = Math.min(g.strokes[g.hole], GOLF.maxStrokes);
  g.phase = 'sunk'; g.phaseT = 0; g.charging = false; g.b.boosting = false;
  g.verdict = pickedUp ? 'Pick it up!' : golfScoreName(g.strokes[g.hole], L.def.par);
  if (pickedUp) Sfx.play('die');
  else {
    Sfx.play('cup'); rumble(0, 0.3, 0.6, 250); rumble(1, 0.3, 0.6, 250);
    for (let k = 0; k < 50; k++) confetti(L.cup.x, L.cup.y0 - 10);
  }
}
function golfPenalty(kind) {
  const g = G.golf, b = g.b;
  g.strokes[g.hole]++;
  g.phase = 'penalty'; g.phaseT = 0; b.hidden = true; b.boosting = false;
  g.msg = { text: (kind === 'water' ? 'Splash!' : kind === 'lost' ? 'Lost ball!' : 'Ouch!') + '  +1 stroke', t: 1.5 };
  if (kind === 'water') {
    Sfx.play('splash');
    for (let i = 0; i < 14; i++) G.particles.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 200, vy: -120 - Math.random() * 260, life: 0.7, max: 0.7, col: 'rgba(170,220,255,0.95)', size: 3 + Math.random() * 3, grav: 900, kind: 'dot' });
  } else { Sfx.play('die'); burst(b.x, b.y, PCOL[g.ball], 12); }
  rumble(g.ball, 0.6, 0.6, 200);
}
// circle against the tile grid: push out of solid tiles and bounce
function golfCollide(b) {
  const r = GOLF.r;
  const x0 = Math.floor((b.x - r) / T), x1 = Math.floor((b.x + r) / T), y0 = Math.floor((b.y - r) / T), y1 = Math.floor((b.y + r) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!golfSolid(tx, ty)) continue;
    const qx = clamp(b.x, tx * T, tx * T + T), qy = clamp(b.y, ty * T, ty * T + T);
    const dx = b.x - qx, dy = b.y - qy;
    let d = Math.hypot(dx, dy), nx, ny;
    if (d >= r) continue;
    if (d > 1e-6) { nx = dx / d; ny = dy / d; }
    else { // the centre got inside the tile: leave by the nearest open side
      const outs = [[b.y - ty * T, 0, -1], [ty * T + T - b.y, 0, 1], [b.x - tx * T, -1, 0], [tx * T + T - b.x, 1, 0]]
        .filter(([, ox, oy]) => !golfSolid(tx + ox, ty + oy)).sort((a, c) => a[0] - c[0]);
      const o = outs[0] || [b.y - ty * T, 0, -1];
      nx = o[1]; ny = o[2]; d = -o[0];
    }
    b.x += nx * (r - d); b.y += ny * (r - d);
    const vn = b.vx * nx + b.vy * ny;
    const sand = tile(tx, ty) === 's', bump = tile(tx, ty) === 'X';
    if (vn < 0 && bump) {
      // bumpers kick the ball back out, hard
      const out = Math.max(GOLF.bumpMin, -vn * GOLF.bumpBounce);
      b.vx += (out - vn) * nx; b.vy += (out - vn) * ny;
      // landing on top of a bumper also pushes the ball sideways, so it can't hop on the spot forever
      if (ny < -0.6 && Math.abs(b.vx) < 120) b.vx = 120 * (Math.sign(b.vx) || (G.level.cup.x >= b.x ? 1 : -1));
      G.golf.bumps[ty * COLS + tx] = 0.25;
      if (b.sfxT <= 0) { Sfx.play('bumper'); b.sfxT = 0.06; rumble(G.golf.ball, 0.3, 0.4, 60); }
    } else if (vn < 0) {
      const hard = -vn > 90, e = hard ? (sand ? GOLF.sandBounce : GOLF.bounce) : 0;
      b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
      if (hard) {
        const vt = -b.vx * ny + b.vy * nx; // a little grip on every bounce
        b.vx -= 0.12 * vt * -ny; b.vy -= 0.12 * vt * nx;
        if (-vn > 200 && b.sfxT <= 0) { Sfx.play('bonk'); b.sfxT = 0.08; rumble(G.golf.ball, 0.15, 0.3, 40); }
      }
    }
    if (ny < -0.6 && !bump) { b.ground = true; if (sand) b.sand = true; }
  }
}
// windmill sails: spinning bars that bat the ball (the sail's own speed is added to the bounce)
function golfMills(b) {
  const r = GOLF.r;
  for (const s of G.level.spinners) {
    const hit = (qx, qy, rad, thin) => {
      let dx = b.x - qx, dy = b.y - qy, d = Math.hypot(dx, dy);
      if (d >= rad) return;
      if (d < 1e-6) { dx = thin[0]; dy = thin[1]; d = 1; }
      const nx = dx / d, ny = dy / d;
      b.x = qx + nx * rad; b.y = qy + ny * rad;
      const svx = -s.w * (qy - s.y), svy = s.w * (qx - s.x);
      const rvx = b.vx - svx, rvy = b.vy - svy, vn = rvx * nx + rvy * ny;
      if (vn < 0) {
        b.vx = svx + rvx - (1 + GOLF.millBounce) * vn * nx; b.vy = svy + rvy - (1 + GOLF.millBounce) * vn * ny;
        s.t = 0.2;
        if (-vn > 120 && b.sfxT <= 0) { Sfx.play('bonk'); b.sfxT = 0.08; rumble(G.golf.ball, 0.15, 0.3, 40); }
      }
    };
    hit(s.x, s.y, r + 8, [0, -1]); // the hub
    for (let k = 0; k < s.arms; k++) {
      const ang = s.a + k * Math.PI * 2 / s.arms, ex = Math.cos(ang), ey = Math.sin(ang);
      const t = clamp((b.x - s.x) * ex + (b.y - s.y) * ey, 0, s.len);
      hit(s.x + ex * t, s.y + ey * t, r + s.hw, [-ey, ex]);
    }
  }
}
// pads, portals and rings: things the ball passes through
function golfGadgets(b) {
  const L = G.level, g = G.golf, r = GOLF.r;
  if (b.padCD <= 0) for (const p of L.pads) {
    const x0 = p.tx * T, top = p.ty * T + 18, bot = (p.ty + 1) * T;
    if (b.x > x0 + 1 && b.x < x0 + T - 1 && b.y + r > top && b.y - r < bot) {
      // an up pad always gives a little drift (toward the cup if the ball came straight down), so a ball
      // can never bounce on the same pad forever
      if (p.dir === 0) {
        // the same pad again and again (say, against a wall): push harder, away from the wall
        const key = p.ty * COLS + p.tx;
        b.padStreak = b.lastPad === key ? (b.padStreak || 0) + 1 : 1; b.lastPad = key;
        let dir = Math.sign(b.vx) || (L.cup.x >= b.x ? 1 : -1);
        if (Math.abs(b.vx) < 90 && [0, 1, 2].some(k => golfSolid(p.tx + dir, p.ty - k))) dir = -dir;
        const drift = b.padStreak >= 3 ? 220 : 90;
        b.vx = Math.abs(b.vx) < drift ? drift * dir : b.vx * 0.85; b.vy = -GOLF.padV;
      }
      else { const a = GOLF.padAngle * Math.PI / 180; b.vx = p.dir * Math.cos(a) * GOLF.padSideV; b.vy = -Math.sin(a) * GOLF.padSideV; }
      b.y = Math.min(b.y, top - r); b.padCD = 0.25; p.t = 0.3;
      Sfx.play('boing', g.ball); rumble(g.ball, 0.4, 0.5, 90);
      puff(b.x, top, 6, 'rgba(255,170,210,0.9)');
      break;
    }
  }
  if (b.portCD <= 0 && Math.hypot(b.vx, b.vy) > 40) for (const p of L.portals) {
    if (Math.abs(b.x - p.x) < 12 && Math.abs(b.y - p.y) < 18) {
      const q = L.portals.find(o => o.ch === p.pair);
      if (!q) break;
      burst(b.x, b.y, PORTAL_COL[p.ch], 8);
      b.x = q.x; b.y = q.y; b.portCD = 0.45; p.t = q.t = 0.4;
      burst(b.x, b.y, PORTAL_COL[q.ch], 8);
      Sfx.play('portal'); rumble(g.ball, 0.2, 0.5, 80);
      break;
    }
  }
  for (const rg of L.rings) {
    if (!rg.used && Math.hypot(b.x - rg.x, b.y - rg.y) < 19) {
      rg.used = true; rg.t = 0.5; b.fuel = 1;
      Sfx.play('ring'); rumble(g.ball, 0, 0.4, 70);
      for (let k = 0; k < 10; k++) burst(rg.x, rg.y, C.gold, 1);
    }
  }
}
const PORTAL_COL = { O: '#b48cff', Q: '#b48cff', U: '#3fd6c4', V: '#3fd6c4' };
function golfFly(dt) {
  const g = G.golf, L = G.level, b = g.b, inp = G.players[g.ball].input;
  b.flyT += dt; b.sfxT -= dt; b.padCD = (b.padCD || 0) - dt; b.portCD = (b.portCD || 0) - dt;
  // the ball player's booster: hold a direction to push the ball that way
  let ax = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), ay = (inp.down ? 1 : 0) - (inp.jump || inp.up ? 1 : 0);
  b.boosting = false;
  if ((ax || ay) && b.fuel > 0 && !(b.ground && L.def.airBoost)) {
    const m = Math.hypot(ax, ay); ax /= m; ay /= m;
    b.vx += ax * GOLF.boostAcc * dt; b.vy += ay * GOLF.boostAcc * dt;
    b.fuel = Math.max(0, b.fuel - dt / GOLF.boostTime); b.boosting = true;
    if ((G.tickN & 1) === 0) G.particles.push({ x: b.x - ax * 11, y: b.y - ay * 11, vx: -ax * 160 + (Math.random() - 0.5) * 60, vy: -ay * 160 + (Math.random() - 0.5) * 60, life: 0.3, max: 0.3, col: PCOL[g.ball], size: 3 + Math.random() * 2, grav: 0, kind: 'dot' });
    if (b.sfxT <= 0) { Sfx.play('whoosh', g.ball); b.sfxT = 0.09; }
    if ((G.tickN % 12) === 0) rumble(g.ball, 0, 0.25, 60);
  }
  b.vy += GOLF.g * dt;
  const dr = 1 - GOLF.drag * dt; b.vx *= dr; b.vy *= dr;
  // small steps, so a fast ball can't skip through a tile
  const n = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 4));
  b.ground = false; b.sand = false;
  for (let i = 0; i < n; i++) {
    b.x += b.vx * dt / n; b.y += b.vy * dt / n;
    golfCollide(b);
    if (L.spinners.length) { golfMills(b); golfCollide(b); }
    golfGadgets(b);
    const c = L.cup;
    if (b.x > c.x0 + 2 && b.x < c.x0 + T - 2 && b.y > c.y0 + 3 && b.y < c.y0 + T + 4) {
      b.x = c.x0 + T / 2; b.y = c.y0 + T - GOLF.r; b.vx = 0; b.vy = 0;
      golfHoleDone(false); return;
    }
    const tx = Math.floor(b.x / T), ty = Math.floor(b.y / T);
    if (tile(tx, ty) === 'w' && b.y > ty * T + 6) { golfPenalty('water'); return; }
    const sy = Math.floor((b.y + GOLF.r - 2) / T);
    if (tile(tx, sy) === '^' && b.y + GOLF.r > sy * T + 14) { golfPenalty('spikes'); return; }
    if (b.y > H + 40 || b.x < -30 || b.x > W + 30) { golfPenalty('out'); return; }
  }
  if (b.ground) { const f = (b.sand ? GOLF.sandRoll : GOLF.roll) * dt; b.vx = Math.abs(b.vx) <= f ? 0 : b.vx - Math.sign(b.vx) * f; }
  b.spin += b.vx * dt / GOLF.r;
  if (b.ground && Math.hypot(b.vx, b.vy) < 14) b.rest += dt; else b.rest = 0;
  if (b.flyT > GOLF.flyMax && !b.ground) { golfPenalty('lost'); return; } // still flying after 14 s: lost ball
  if (b.rest > 0.25 || b.flyT > GOLF.flyMax) {
    b.vx = 0; b.vy = 0; b.boosting = false;
    if (g.strokes[g.hole] >= GOLF.maxStrokes) golfHoleDone(true); else golfStartWalk();
  }
}
function golfAim(dt) {
  const g = G.golf, gp = G.players[g.golfer], inp = gp.input;
  const dir = (inp.left ? 1 : 0) - (inp.right ? 1 : 0);
  if (dir) {
    g.aimHold += dt;
    g.aim = clamp(g.aim + dir * (35 + Math.min(1, g.aimHold / 0.6) * 85) * dt, 0, 180);
    const sp = golferSpot();
    if (sp.face !== gp.face || Math.abs(sp.x - gp.x) > 1) placeGolfer(sp);
  } else g.aimHold = 0;
  if (!g.charging) {
    if (gp.pendingJump && G.introT < 0.6) { g.charging = true; g.powerT = 0; g.power = 0.04; }
    return;
  }
  if (inp.down) { g.charging = false; g.power = 0; return; } // changed your mind
  g.powerT += dt;
  const ph = (g.powerT / GOLF.charge) % 2;
  g.power = Math.max(0.04, ph <= 1 ? ph : 2 - ph);
  if (!inp.jump) golfSwing();
}
function golfStep(dt) {
  const g = G.golf, b = g.b, L = G.level;
  g.phaseT += dt;
  for (const s of L.spinners) { s.a += s.w * dt; s.t -= dt; }
  for (const p of L.pads) p.t -= dt;
  for (const p of L.portals) p.t -= dt;
  for (const rg of L.rings) rg.t -= dt;
  for (const k in g.bumps) { g.bumps[k] -= dt; if (g.bumps[k] <= 0) delete g.bumps[k]; }
  if (g.swingT > 0) g.swingT -= dt;
  if (g.msg) { g.msg.t -= dt; if (g.msg.t <= 0) g.msg = null; }
  if (g.phase === 'aim') golfAim(dt);
  else if (g.phase === 'fly') golfFly(dt);
  else if (g.phase === 'walk') {
    const w = g.walk, gp = G.players[g.golfer];
    w.t += dt;
    const k = Math.min(1, w.t / w.dur);
    gp.x = w.fx + (w.to.x - w.fx) * k; gp.y = w.fy + (w.to.y - w.fy) * k - Math.sin(Math.PI * k) * w.hop;
    gp.face = w.to.x >= w.fx ? 1 : -1; gp.grounded = k >= 1;
    if (k >= 1) { placeGolfer(w.to); gp.sx = 1.2; gp.sy = 0.85; g.phase = 'aim'; g.phaseT = 0; g.walk = null; }
  } else if (g.phase === 'penalty') {
    if (g.phaseT > 1.0) {
      b.x = b.from.x; b.y = b.from.y; b.vx = 0; b.vy = 0; b.hidden = false;
      puff(b.x, b.y, 8, 'rgba(255,255,255,0.9)');
      if (g.strokes[g.hole] >= GOLF.maxStrokes) golfHoleDone(true); else golfStartWalk();
    }
  } else if (g.phase === 'sunk') {
    if (g.phaseT > 2.8) { if (g.hole === 0) golfNextHole(); else levelClear(); }
  }
  for (const p of G.players) p.pendingJump = false;
}

function drawMill(s) {
  ctx.save(); ctx.translate(s.x, s.y);
  for (let k = 0; k < s.arms; k++) {
    ctx.save(); ctx.rotate(s.a + k * Math.PI * 2 / s.arms);
    ctx.fillStyle = '#f6efdf'; ctx.strokeStyle = '#7a3b2e'; ctx.lineWidth = 2;
    rr(6, -s.hw, s.len - 6, s.hw * 2, s.hw); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,107,74,0.85)'; rr(s.len * 0.45, -s.hw + 1.5, s.len * 0.5, s.hw * 2 - 3, 2); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = s.t > 0 ? '#ffe3ae' : '#7a3b2e'; circle(0, 0, 8); ctx.fill();
  ctx.fillStyle = '#f6efdf'; circle(0, 0, 3); ctx.fill();
  ctx.restore();
}
function drawPortal(p) {
  const col = PORTAL_COL[p.ch], pulse = 1 + Math.sin(G.clock * 5 + p.x) * 0.06 + (p.t > 0 ? 0.25 : 0);
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(pulse, pulse);
  ctx.fillStyle = 'rgba(28,26,54,0.55)'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 0, 12, 18, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
  for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.ellipse(0, 0, 7, 12, 0, G.clock * 3 + k * Math.PI, G.clock * 3 + k * Math.PI + 1.8); ctx.stroke(); }
  ctx.restore();
}
function drawRing(rg) {
  ctx.save();
  ctx.globalAlpha = rg.used ? 0.25 : 1;
  const s = 1 + (rg.t > 0 ? rg.t * 0.6 : Math.sin(G.clock * 4 + rg.x) * 0.05);
  ctx.translate(rg.x, rg.y); ctx.scale(s, s);
  ctx.strokeStyle = C.goldDark; ctx.lineWidth = 6; circle(0, 0, 15); ctx.stroke();
  ctx.strokeStyle = C.gold; ctx.lineWidth = 3.5; circle(0, 0, 15); ctx.stroke();
  ctx.restore();
}
// cup, tee, aim dots, club and power meter (drawn under the players)
function drawGolf() {
  const g = G.golf, L = G.level, b = g.b, c = L.cup;
  for (const p of L.pads) drawPad(p);
  for (const p of L.portals) drawPortal(p);
  for (const rg of L.rings) drawRing(rg);
  for (const s of L.spinners) drawMill(s);
  // the cup: a dark pocket with the flag standing in it
  ctx.fillStyle = C.doorIn; ctx.fillRect(c.x0 + 1, c.y0, T - 2, T);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(c.x0 + 1, c.y0, T - 2, 6);
  const fx = c.x0 + T / 2 + 6, wave = Math.sin(G.clock * 6) * 3;
  ctx.fillStyle = '#e9e4f5'; ctx.fillRect(fx - 1.5, c.y0 - 70, 3, 70 + T - 4);
  ctx.fillStyle = g.phase === 'sunk' ? C.grass : C.gold;
  ctx.beginPath(); ctx.moveTo(fx + 1.5, c.y0 - 70); ctx.lineTo(fx + 34, c.y0 - 58 + wave); ctx.lineTo(fx + 1.5, c.y0 - 46); ctx.closePath(); ctx.fill();
  text(String(g.hole + 1), fx + 13, c.y0 - 58 + wave * 0.5, 13, C.ink, 'center');
  if (g.phase !== 'aim' && g.phase !== 'fly') return;
  const gp = G.players[g.golfer], face = gp.face;
  if (g.phase === 'aim') {
    // a peek at the start of the flight
    const a = g.aim * Math.PI / 180, v = (g.charging ? g.power : 0.55) * GOLF.vmax;
    const vx = Math.cos(a) * v, vy = -Math.sin(a) * v;
    for (let i = 1; i <= 10; i++) {
      const t = i * 0.035, px = b.x + vx * t, py = b.y + vy * t + 0.5 * GOLF.g * t * t;
      ctx.globalAlpha = (g.charging ? 1 : 0.6) * (1 - i / 12);
      ctx.fillStyle = '#ffffff'; circle(px, py, 3.2); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // power meter beside the golfer while charging
  if (g.phase === 'aim' && g.charging) {
    const mx = gp.x + PW / 2 - face * 26 - 6, my = gp.y - 30, mh = 60;
    ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(mx - 3, my - 3, 18, mh + 6, 6); ctx.fill();
    const f = g.power, col = f < 0.5 ? C.grass : f < 0.85 ? C.gold : '#ff6b6b';
    ctx.fillStyle = col; rr(mx, my + mh * (1 - f), 12, mh * f, 4); ctx.fill();
  }
}
function drawGolfClub() {
  const g = G.golf, b = g.b;
  if (g.phase !== 'aim' && g.phase !== 'fly') return;
  const gp = G.players[g.golfer], face = gp.face;
  // the club: rests behind the ball, swings back as the power builds, follows through after the hit
  const hx = gp.x + PW / 2 + face * 4, hy = gp.y + PH * 0.35;
  const bx = g.phase === 'fly' ? b.from.x : b.x, by = g.phase === 'fly' ? b.from.y : b.y; // where the ball was hit from
  const headX = bx - face * (GOLF.r + 2), headY = by + GOLF.r - 3;
  const len = Math.hypot(headX - hx, headY - hy), a0 = Math.atan2(headY - hy, headX - hx);
  let ang = a0;
  if (g.phase === 'aim' && g.charging) ang = a0 + face * (0.5 + g.power * 2.7);
  else if (g.phase === 'fly' && g.swingT > 0) ang = a0 - face * (1 - g.swingT / 0.35) * 2.4;
  else if (g.phase === 'fly') ang = a0 - face * 2.4;
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
  ctx.strokeStyle = '#8d8aa6'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
  ctx.fillStyle = '#d9dbe8'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
  rr(len - 3, -2, 8, 9, 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawGolfBall() {
  const g = G.golf, b = g.b;
  if (b.hidden) return;
  const id = g.ball, col = PCOL[id], dark = PDARK[id], r = GOLF.r;
  ctx.save(); ctx.translate(b.x, b.y);
  if (g.phase === 'sunk') { ctx.restore(); return; }
  // ears / sprout so you know who's in there
  if (id === 1) {
    ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
    for (const ex of [-6, 6]) { circle(ex, -r + 1, 3.6); ctx.fill(); ctx.stroke(); }
  } else {
    ctx.strokeStyle = '#3f8f5c'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(1, -r - 4); ctx.stroke();
    ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(4, -r - 5, 4.5, 2.2, -0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#fbfaf5'; circle(0, 0, r); ctx.fill();
  ctx.save(); ctx.rotate(b.spin); ctx.fillStyle = 'rgba(28,26,54,0.13)';
  for (let i = 0; i < 6; i++) { const a = i * 1.05; circle(Math.cos(a) * 6, Math.sin(a) * 6, 1.4); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = col; ctx.lineWidth = 2.6; circle(0, 0, r); ctx.stroke();
  const sp = Math.hypot(b.vx, b.vy);
  const lx = sp > 30 ? (b.vx / sp) * 1.8 : golfDir() * 1.2, ly = sp > 30 ? (b.vy / sp) * 1.8 : 0;
  for (const ex of [-3.4, 3.4]) {
    ctx.fillStyle = C.ink; circle(ex + lx, -1.5 + ly, 1.9); ctx.fill();
    ctx.fillStyle = '#fff'; circle(ex + lx + 0.6, -2.1 + ly, 0.6); ctx.fill();
  }
  ctx.restore();
  // boost bar over the ball while it's in the air
  if (g.phase === 'fly') {
    const bw = 30, bx = b.x - bw / 2, by = b.y - r - 16;
    ctx.fillStyle = 'rgba(28,26,54,0.75)'; rr(bx - 2, by - 2, bw + 4, 9, 4.5); ctx.fill();
    if (b.fuel > 0) { ctx.fillStyle = b.boosting ? '#ffffff' : col; rr(bx, by, bw * b.fuel, 5, 2.5); ctx.fill(); }
  }
  // name tag during the intro card
  if (G.introT > 0 && G.mode === 'play') {
    const a = clamp(G.introT / 0.5, 0, 1), x = b.x + golfDir() * 14, y = b.y - r - 24;
    const cpu = typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id), hw = cpu ? 30 : 18; // like the players' tags
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = col; rr(x - hw, y - 11, hw * 2, 18, 9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 4, y + 7); ctx.lineTo(x + 4, y + 7); ctx.lineTo(x, y + 11); ctx.fill();
    text(cpu ? NAMES[id] + ' · CPU' : NAMES[id], x, y - 1.5, 12, '#fff', 'center', 'body');
    ctx.restore();
  }
}
function golfKeys(id, what) {
  const how = actKey(id), touch = how === 'touch', pad = how === 'pad'; // (each player's own device: js/controls.js)
  if (what === 'aim') {
    return pad ? 'stick aim   hold ' + glyph('a') + ', let go to swing'
      : touch ? '◀ ▶ aim   hold ▲, let go to swing'
      : id === 0 ? 'A D aim   hold W, let go to swing' : '← → aim   hold ↑, let go to swing';
  }
  return pad ? 'push the stick (or ' + glyph('a') + ' for up) to boost'
    : touch ? 'hold ◀ ▶ ▲ ▼ to boost'
    : id === 0 ? 'hold W A S D to boost' : 'hold the arrow keys to boost';
}
function drawGolfHUD() {
  const g = G.golf, L = G.level, gn = NAMES[g.golfer], bn = NAMES[g.ball];
  // hole and par
  const hl = `Hole ${g.hole + 1} of 2: ${L.def.title}  ·  Par ${L.def.par}`;
  ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
  pill(14, 46, ctx.measureText(hl).width + 28, 26);
  text(hl, 28, 59.5, 13, C.gold, 'left', 'body');
  // who does what, and the stroke count
  ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
  const parts = [[gn + ' golfs', PCOL[g.golfer]], ['  ·  ', C.paper], [bn + ' is the ball', PCOL[g.ball]], ['   Strokes ' + g.strokes[g.hole], C.paper]];
  const tw = parts.reduce((n, [t]) => n + ctx.measureText(t).width, 0);
  let x = pill(W - 14, 12, tw + 28, 28, 'right') + 14;
  for (const [t, c] of parts) { text(t, x, 26.5, 14, c, 'left', 'body'); x += ctx.measureText(t).width; }
  // what to press right now
  let hint = null, hc = C.paper;
  // in 1-player mode the computer's job gets a plain line instead of its keys
  const cpu = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);
  if (g.phase === 'aim') { hint = cpu(g.golfer) ? gn + ' is lining up the shot...' : gn + ', your shot:  ' + golfKeys(g.golfer, 'aim'); hc = PCOL[g.golfer]; }
  else if (g.phase === 'fly' && g.b.fuel > 0 && !(g.b.ground && G.level.def.airBoost)) { hint = cpu(g.ball) ? bn + ' is steering the ball!' : bn + ', steer!  ' + golfKeys(g.ball, 'boost'); hc = PCOL[g.ball]; }
  if (hint && G.introT <= 0) {
    ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
    const sw = ctx.measureText(hint).width + 28;
    pill(W / 2, 46, sw, 26, 'center');
    ctx.fillStyle = hc; circle(W / 2 - sw / 2 + 12, 59, 4); ctx.fill();
    text(hint, W / 2 + 4, 59.5, 13, C.paper, 'center', 'body');
  }
  if (g.msg) {
    ctx.save(); ctx.globalAlpha = clamp(g.msg.t / 0.3, 0, 1);
    ctx.fillStyle = 'rgba(28,26,54,0.86)'; rr(W / 2 - 150, 120, 300, 50, 16); ctx.fill();
    text(g.msg.text, W / 2, 146, 24, C.paper, 'center');
    ctx.restore();
  }
  if (g.phase === 'sunk') {
    const s = g.strokes[g.hole];
    const line2 = `Hole ${g.hole + 1} in ${s} stroke${s === 1 ? '' : 's'} (par ${L.def.par})`;
    const line3 = g.hole === 0 ? `Swap! ${bn} golfs next, ${gn} is the ball.` : 'Both holes done!';
    ctx.fillStyle = 'rgba(28,26,54,0.88)'; rr(W / 2 - 230, 150, 460, 112, 18); ctx.fill();
    text(g.verdict, W / 2, 182, 30, g.verdict === 'Pick it up!' ? C.paper : C.gold, 'center');
    text(line2, W / 2, 215, 15, C.paper, 'center', 'body');
    text(line3, W / 2, 240, 14, '#d9d3ef', 'center', 'body');
  }
}
