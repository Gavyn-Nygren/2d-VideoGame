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
  golfCam(0, true);
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
  g.walk = { fx: gp.x, fy: gp.y, to, t: 0, dur: clamp(dist / 520, 0.25, L.cols > COLS ? 1.8 : 1.1), hop: Math.min(70, dist * 0.3) + 10 };
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
      G.golf.bumps[ty * 1000 + tx] = 0.25;
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
        const key = p.ty * 1000 + p.tx;
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
    if (b.y > H + 40 || b.x < -30 || b.x > L.cols * T + 30) { golfPenalty('out'); return; }
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
  golfCam(dt);
  for (const p of G.players) p.pendingJump = false;
}

/* ---------- the camera on a wide course (def.wide: 3-4 Portal Park) ----------
   While the intro card is up it glides from the cup back to the tee, so you see the whole hole first. Aiming, it keeps
   the ball near the back of the screen so you see the way ahead; in flight it follows the ball (a little ahead of it),
   and it never lets the ball or the walking golfer leave the screen. One-screen holes keep G.camX at 0. */
function golfCam(dt, snap) {
  const L = G.level, g = G.golf, b = g.b, maxX = L.cols * T - W;
  if (maxX <= 0) { G.camX = 0; return; }
  let fx, rate = 3.2, keep = b.x;
  if (g.phase === 'aim' && (G.introT > 0 || snap) && g.strokes[g.hole] === 0) {
    // the flyover: from the cup to the tee while the card is up, then settle on the shot
    const k = snap ? 1 : clamp((G.introT - 0.9) / 2.4, 0, 1), e = k * k * (3 - 2 * k);
    const tee = b.x - (golfDir() > 0 ? W * 0.28 : W * 0.72), cup = L.cup.x - W / 2;
    fx = tee + (cup - tee) * e; rate = 9; keep = null;
  } else if (g.phase === 'aim' || g.phase === 'penalty') {
    const at = g.phase === 'penalty' ? b.from : b;
    fx = at.x - (golfDir() > 0 ? W * 0.28 : W * 0.72); keep = g.phase === 'penalty' ? null : b.x;
  } else if (g.phase === 'fly') {
    fx = b.x - W / 2 + clamp(b.vx * 0.35, -220, 220); rate = 4.5;
  } else if (g.phase === 'walk') {
    const gp = G.players[g.golfer], dir = g.walk.to.x >= g.walk.fx ? 1 : -1;
    fx = gp.x + PW / 2 - (dir > 0 ? W * 0.3 : W * 0.7); keep = gp.x + PW / 2; rate = 3.5;
  } else fx = L.cup.x - W / 2; // sunk
  fx = clamp(fx, 0, maxX);
  if (snap || G.camX == null) G.camX = fx;
  else G.camX += (fx - G.camX) * Math.min(1, dt * rate);
  // whatever we follow stays at least 90 px inside the screen
  if (keep != null) G.camX = clamp(G.camX, keep - W + 90, keep - 90);
  G.camX = clamp(G.camX, 0, maxX);
}
// the whole course in a strip at the bottom of the screen: tee, portals, the cup's flag, the ball and the golfer, and
// a box for the part you can see now (wide courses only)
function drawGolfMap() {
  const L = G.level, g = G.golf, b = g.b, cw = L.cols * T;
  if (cw <= W) return;
  const mw = 340, mh = 20, x0 = W / 2 - mw / 2, y0 = H - mh - 10, sx = x => x0 + 8 + (x / cw) * (mw - 16);
  ctx.save(); ctx.globalAlpha = 0.92;
  ctx.fillStyle = 'rgba(23,25,29,0.72)'; rr(x0, y0, mw, mh, mh / 2); ctx.fill();
  // the ground line: the top of each column, low = deep, high = raised
  ctx.strokeStyle = 'rgba(143,224,113,0.8)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let tx = 0; tx < L.cols; tx++) {
    let ty = 1; while (ty < ROWS && !golfSolid(tx, ty) && tile(tx, ty) !== 'w') ty++;
    const y = y0 + 3 + (ty / ROWS) * (mh - 6);
    if (tx === 0) ctx.moveTo(sx(tx * T), y); else ctx.lineTo(sx(tx * T + T / 2), y);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5;
  rr(sx(G.camX), y0 + 2, (W / cw) * (mw - 16), mh - 4, 4); ctx.stroke();
  for (const p of L.portals) { ctx.fillStyle = PORTAL_COL[p.ch]; circle(sx(p.x), y0 + mh / 2, 3); ctx.fill(); }
  ctx.fillStyle = C.gold; const fx = sx(L.cup.x);
  ctx.fillRect(fx - 0.75, y0 + 2, 1.5, mh - 6);
  ctx.beginPath(); ctx.moveTo(fx + 0.75, y0 + 2); ctx.lineTo(fx + 8, y0 + 5); ctx.lineTo(fx + 0.75, y0 + 8); ctx.fill();
  const gp = G.players[g.golfer];
  ctx.fillStyle = PCOL[g.golfer]; circle(sx(gp.x + PW / 2), y0 + mh / 2 + 2, 3); ctx.fill();
  if (!b.hidden && g.phase !== 'sunk') {
    ctx.fillStyle = '#fbfaf5'; circle(sx(b.x), y0 + mh / 2, 4); ctx.fill();
    ctx.strokeStyle = PCOL[g.ball]; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.restore();
}

function golfPaintSail(c, hw, L) {
  c.fillStyle = 'rgba(0,0,0,0.12)'; rrOn(c, 8, -hw + 3, L - 6, hw * 2, hw); c.fill(); // its shadow
  c.fillStyle = '#7a3b2e'; rrOn(c, 5, -hw - 1, L - 4, hw * 2 + 2, hw + 1); c.fill();
  c.save(); rrOn(c, 6, -hw, L - 6, hw * 2, hw); c.clip();
  c.fillStyle = '#f6efdf'; c.fillRect(6, -hw, L, hw * 2);
  c.fillStyle = '#e3d6bd'; c.fillRect(6, 0.5, L, hw);
  c.fillStyle = 'rgba(255,107,74,0.88)'; c.fillRect(L * 0.45, -hw, L, hw * 2);
  c.fillStyle = 'rgba(150,40,25,0.3)'; c.fillRect(L * 0.45, 0.5, L, hw);
  c.fillStyle = '#fff3e6'; c.fillRect(L * 0.68, -hw, 2.4, hw * 2);
  // the lattice
  c.fillStyle = 'rgba(122,59,46,0.28)';
  for (let x = 12; x < L - 2; x += 8) c.fillRect(x, -hw, 1.1, hw * 2);
  c.fillRect(6, -hw + 1.2, L, 0.9); c.fillRect(6, hw - 2.1, L, 0.9);
  c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(10, -hw + 0.4, L * 0.4, 0.9);
  c.restore();
  // the spar
  c.fillStyle = 'rgba(94,42,32,0.75)'; c.fillRect(0, -1.1, L - 2, 2.2);
  c.fillStyle = '#b07a52'; c.fillRect(0, -0.7, L - 2.6, 1.2);
  c.fillStyle = '#5e2a20'; circleOn(c, L - 3, 0, 1.6); c.fill(); c.fillStyle = '#c9a07a'; circleOn(c, L - 3.2, -0.3, 0.8); c.fill();
}
function drawMill(s) {
  ctx.save(); ctx.translate(s.x, s.y);
  // (rich props pass) each sail: a shadow, a dark outline, canvas on a lattice frame (crossbars and two rails), the
  // lower half in shade, the red tip with a stripe, and a wooden spar down the middle with a lit edge and an end cap
  // one picture per sail size, painted once and turned with the mill
  const hw = s.hw, L = s.len, sail = artSprite('gsail' + hw + '_' + L, L + 4, hw * 2 + 8, 0, hw + 2, c => golfPaintSail(c, hw, L));
  for (let k = 0; k < s.arms; k++) {
    ctx.save(); ctx.rotate(s.a + k * Math.PI * 2 / s.arms);
    blitSprite(sail, 0, 0);
    ctx.restore();
  }
  // the hub: a shadow, a wooden boss with a lit rim and bolts that turn with it, a brass cap with a glint
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; circle(1.5, 2, 9.5); ctx.fill();
  ctx.fillStyle = '#4e241b'; circle(0, 0, 9.6); ctx.fill();
  ctx.fillStyle = s.t > 0 ? '#ffe3ae' : '#7a3b2e'; circle(0, 0, 8.4); ctx.fill();
  ctx.fillStyle = s.t > 0 ? '#fff4d6' : '#9a5442'; ctx.beginPath(); ctx.arc(0, 0, 8.4, Math.PI * 0.95, Math.PI * 1.75); ctx.arc(0, 0, 6.6, Math.PI * 1.75, Math.PI * 0.95, true); ctx.fill();
  for (let k = 0; k < 6; k++) { const a = s.a + k * Math.PI / 3; ctx.fillStyle = '#c9a07a'; circle(Math.cos(a) * 5.8, Math.sin(a) * 5.8, 1.05); ctx.fill(); ctx.fillStyle = '#4e241b'; circle(Math.cos(a) * 5.8 + 0.3, Math.sin(a) * 5.8 + 0.3, 0.4); ctx.fill(); }
  ctx.fillStyle = '#b9850f'; circle(0, 0, 3.6); ctx.fill();
  ctx.fillStyle = '#ffd25e'; circle(-0.4, -0.4, 2.8); ctx.fill();
  ctx.fillStyle = '#fff6d8'; circle(-1.2, -1.2, 0.9); ctx.fill();
  ctx.restore();
}
function drawPortal(p) {
  const col = PORTAL_COL[p.ch], pulse = 1 + Math.sin(G.clock * 5 + p.x) * 0.06 + (p.t > 0 ? 0.25 : 0);
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(pulse, pulse);
  ctx.fillStyle = 'rgba(28,26,54,0.55)'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 17, 0, 0, Math.PI * 2); ctx.fill();
  // (rich props pass) a deep glow inside, a dark outline, the coloured rim with a lit upper-left and a shaded lower-right,
  // and four little rune studs round it
  ctx.fillStyle = col; ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.ellipse(0, 3, 7, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = shade(col, 0.5); ctx.lineWidth = 6.5; ctx.beginPath(); ctx.ellipse(0, 0, 12, 18, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 0, 12, 18, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = tint(col, 0.55); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(0, 0, 12.6, 18.6, 0, Math.PI * 0.95, Math.PI * 1.6); ctx.stroke();
  ctx.strokeStyle = shade(col, 0.3); ctx.beginPath(); ctx.ellipse(0, 0, 11.4, 17.4, 0, Math.PI * 1.95, Math.PI * 2.6); ctx.stroke();
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; ctx.fillStyle = shade(col, 0.5); circle(Math.cos(a) * 12, Math.sin(a) * 18, 2.1); ctx.fill(); ctx.fillStyle = tint(col, 0.6); circle(Math.cos(a) * 12 - 0.4, Math.sin(a) * 18 - 0.4, 1.1); ctx.fill(); }
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
  // (rich props pass) a lit upper arc, notches round the band and a twinkle
  ctx.strokeStyle = '#fff4c8'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(0, 0, 15.6, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
  ctx.strokeStyle = C.goldDark; ctx.lineWidth = 1;
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 13.3, Math.sin(a) * 13.3); ctx.lineTo(Math.cos(a) * 16.7, Math.sin(a) * 16.7); ctx.stroke(); }
  const tw = (Math.sin(G.clock * 3 + rg.x) + 1) / 2;
  if (tw > 0.5 && !rg.used) { const a2 = (tw - 0.5) * 2, r2 = 2 + a2 * 3; ctx.fillStyle = 'rgba(255,255,255,' + a2 + ')'; ctx.beginPath(); ctx.moveTo(-10, -11 - r2); ctx.lineTo(-9.4, -11.6); ctx.lineTo(-10 + r2, -11); ctx.lineTo(-9.4, -10.4); ctx.lineTo(-10, -11 + r2); ctx.lineTo(-10.6, -10.4); ctx.lineTo(-10 - r2, -11); ctx.lineTo(-10.6, -11.6); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
// a hole's `cave` (tile rectangles [x0, x1, y0, y1]: Portal Park's rabbit-hole tunnel) gets a dark cave wall behind its
// open cells instead of the sky
function drawGolfCaves(camX) {
  const L = G.level, vx0 = Math.floor(camX / T), vx1 = Math.floor((camX + W) / T);
  for (const [x0, x1, y0, y1] of L.def.cave || []) {
    for (let tx = Math.max(x0, vx0); tx <= Math.min(x1, vx1); tx++) for (let ty = y0; ty <= y1; ty++) {
      if (golfSolid(tx, ty)) continue;
      const x = tx * T, y = ty * T, h = hash(tx, ty);
      // (rich props pass) one picture per look: packed earth with strata, embedded stones, roots hanging from the roof
      const roof = golfSolid(tx, ty - 1), v = h % 8;
      const sp = artSprite('gcave' + v + (roof ? 1 : 0), T, T, 0, 0, c => paintGolfCave(c, hash(v * 11 + 1, 3), roof));
      blitSprite(sp, x, y);
    }
  }
}
function paintGolfCave(c, h, roof) {
  c.fillStyle = '#4d4054'; c.fillRect(-0.4, -0.4, T + 0.8, T + 0.8);
  // strata: two soft bands that line up from tile to tile
  c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(-0.4, 9, T + 0.8, 3); c.fillRect(-0.4, 22, T + 0.8, 2);
  c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(-0.4, 8, T + 0.8, 1); c.fillRect(-0.4, 21, T + 0.8, 1);
  // an embedded stone with a lit top and a shadow
  if (h % 3 !== 0) {
    const sx = 5 + (h >>> 3) % 16, sy = 5 + (h >>> 7) % 18, w = 4 + (h >>> 11) % 4;
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(sx + 0.8, sy + 1.2, w, w * 0.6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6a5d70'; c.beginPath(); c.ellipse(sx, sy, w, w * 0.6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#857891'; c.beginPath(); c.ellipse(sx - 0.8, sy - 0.8, w * 0.6, w * 0.3, 0, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 4; i++) { circleOn(c, 2 + (h >>> (i * 4)) % 26, 2 + (h >>> (i * 4 + 2)) % 26, 0.7); c.fill(); }
  // roots hanging from the roof
  if (roof) {
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(-0.4, 0, T + 0.8, 3);
    c.strokeStyle = '#7a5a48'; c.lineWidth = 1.2; c.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const rx = 6 + i * 13 + (h >>> (i * 5)) % 6, rl = 7 + (h >>> (i * 3 + 9)) % 9;
      c.beginPath(); c.moveTo(rx, 0); c.quadraticCurveTo(rx + 3, rl * 0.5, rx - 1, rl); c.stroke();
      c.lineWidth = 0.7; c.beginPath(); c.moveTo(rx + 1.2, rl * 0.45); c.quadraticCurveTo(rx + 4, rl * 0.6, rx + 4.5, rl * 0.85); c.stroke(); c.lineWidth = 1.2;
    }
  }
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
  // (rich props pass) a white cup liner with a shaded inside, a lit back wall and a dark bottom, dirt in the walls
  ctx.fillStyle = '#d9d6e6'; ctx.fillRect(c.x0 + 1, c.y0, 2.2, T - 4); ctx.fillRect(c.x0 + T - 3.2, c.y0, 2.2, T - 4);
  ctx.fillStyle = '#9e9ab4'; ctx.fillRect(c.x0 + T - 3.2, c.y0, 1, T - 4);
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(c.x0 + 3.2, c.y0 + 6, T - 6.4, 10);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(c.x0 + 3.2, c.y0 + T - 8, T - 6.4, 8);
  ctx.fillStyle = '#d9d6e6'; ctx.fillRect(c.x0 + 1, c.y0 + T - 5, T - 2, 1.4);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(c.x0 + 1, c.y0, T - 2, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(c.x0 + 1, c.y0, T - 2, 1.5); // the cup's lit rim
  ctx.fillStyle = '#ffffff'; ctx.fillRect(c.x0 + 1, c.y0 - 0.5, 3, 1.5); ctx.fillRect(c.x0 + T - 4, c.y0 - 0.5, 3, 1.5);
  const fx = c.x0 + T / 2 + 6, wave = Math.sin(G.clock * 6) * 3;
  // the pin: a white pole with red bands and a ball on top, the flag with a darker edge and a shadow fold
  ctx.fillStyle = '#e9e4f5'; ctx.fillRect(fx - 1.5, c.y0 - 70, 3, 70 + T - 4);
  ctx.fillStyle = '#e8483a'; for (let k = 0; k < 4; k++) ctx.fillRect(fx - 1.5, c.y0 - 40 + k * 14, 3, 6);
  ctx.fillStyle = '#ffffff'; circle(fx, c.y0 - 71, 2.6); ctx.fill();
  const fc = g.phase === 'sunk' ? C.grass : C.gold;
  ctx.fillStyle = fc; ctx.strokeStyle = shade(fc, 0.35); ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(fx + 1.5, c.y0 - 70); ctx.quadraticCurveTo(fx + 18, c.y0 - 66 + wave * 0.6, fx + 34, c.y0 - 58 + wave); ctx.quadraticCurveTo(fx + 18, c.y0 - 50 + wave * 0.4, fx + 1.5, c.y0 - 46); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.moveTo(fx + 1.5, c.y0 - 58); ctx.lineTo(fx + 34, c.y0 - 58 + wave); ctx.lineTo(fx + 1.5, c.y0 - 46); ctx.closePath(); ctx.fill();
  text(String(g.hole + 1), fx + 12, c.y0 - 58 + wave * 0.5, 12, C.ink, 'center');
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
  drawGolfMap();
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
