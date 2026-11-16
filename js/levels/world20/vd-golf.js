/* Pip & Bo - Level 20-1 Volcano Dragon: phase 'golf' (Gong Golf). */
'use strict';

/* ===== 20-1 phase 3: Gong Golf (VD_PHASES.golf) =====
   World 3 golf at the crater. One player golfs, the partner IS the ball: Pip golfs Bo on hole 1, then they swap
   (Bo golfs Pip on hole 2). Cinder sits in his lava hot tub in the middle; his giant gong hangs under a rock roof
   across the crater. Ringing the gong (the ball touching its disc) is the "cup": the hole is done ("BONNNG!", he gets
   dizzy). Two holes, par 3 each: "Over the Hot Tub" (left to right) and "Up and Over" (right to left, past a spire).
   Controls are World 3's: the golfer aims with left / right and holds jump (or the action, 'swing') to charge the
   meter that rises and falls, then lets go to swing; down cancels; a tap shorter than VDG.minHold is not a swing
   ("Hold it longer!"), so mashing never plays strokes. The ball player has a small boost bar in flight (hold a
   direction to push, 0.4 s per shot; the action, 'zoom', pushes along the flight).
   The crater is wide and the club is weaker than in World 3 (VDG.vmax), so the FIRE BOOST RINGS are the way across:
   each ring bobs up and down and throws a ball that flies through it off the way its flames point (arrows), at its
   own speed (never slower than VDG.ring.keep x the ball's). Ring 1 then ring 2 lands the ball by the gong (about 2
   strokes with the chip); missing them means lava, or the slow way over the rock islands (4-5 strokes).
   Cinder spits slow lava blobs (telegraphed: his cheeks puff for VDG.blob.warn s, a dotted arc and a dashed landing
   ring show the path); a blob that meets the ball knocks it away ("Blorp!", no stroke by itself). His head pokes out
   of the tub and is bouncy ("Boing!"). Lava = +1 stroke from the same spot ("Hot tub!"); flying off the sides or 14 s
   in the air = +1 ("Lost ball!"). Pick-up at VDG.maxStrokes (10, as World 3): the ball is dropped near the gong and the
   strokes stop counting; the hole still needs one ring of the gong from there (so a masher never finishes), and every
   miss after that comes back to the drop (never a long walk back across the crater), with a "Hold longer!" tip when
   the shot was soft.
   Gold help (announced, per hole): at par + 1 strokes long aim dots (the arc for a whole second), at par + 3 a big gong.
   Results: st.stats.golf { strokes [h1, h2], pars, lava, lost, rings, blobs, heads, picked, aces, whiffs }; the results
   tile is "Golf strokes N (par 6)".
   The shared ball physics (vdgTick) is a pure function of the ball and a scene, so the computer's brain
   (js/cpu/levels/world20/vd-golf.js) plans its shots with the very same code, like the World 3 brain does with its copy.
   World = screen here (one screen, st.cam stays 0). The ball player is hidden (p.alive false) all phase.
   Map chars: '#' rock, 'v' lava (non-solid; the surface is the top of the first 'v' row), 's' ash (dead bounce). The
   room map is hole 1; hole 2's grid replaces G.level.grid when it starts. */

const VDG = {
  vmax: 820, charge: 1.1, minHold: 0.14, maxStrokes: 10, flyMax: 14,
  g: 1200, drag: 0.1, r: 10, bounce: 0.42, roll: 320, sandBounce: 0.08, sandRoll: 2200,
  boostAcc: 800, boostTime: 0.4,
  ring: { r: 22, keep: 0.8 },     // catch radius; it never slows a fast ball below keep x its speed
  gongR: 26, bigK: 1.45,
  head: { e: 0.8, min: 260 },
  blob: { r: 13, g: 300, warn: 1.1, gap: [2.4, 3.8], T: [2.2, 2.8], max: 2, e: 0.75, push: 0.5, min: 220, first: 4 },
  help: { dots: 1, big: 3 },      // strokes over par on a hole: long aim dots, then the big gong
  cin: { s: 0.8, sink: 34 },      // Cinder's scale, and how deep his feet are under the lava surface
  holes: [
    { title: 'Over the Hot Tub', par: 3, lavaY: 450,
      tee: { x: 120, gy: 330 }, gong: { x: 905, y: 160, top: 120 }, drop: { x: 790, gy: 240 }, tub: 495,
      rings: [{ x: 290, y: 250, a: 55, v: 760, amp: 34, ph0: 0 }, { x: 600, y: 150, a: 5, v: 450, amp: 30, ph0: 2.2 }], ringPer: 3.6, spit: [230, 720],
      map: [
        '................................', //  0
        '................................', //  1
        '..........................######', //  2  the cave roof the gong hangs from
        '...........................#####', //  3
        '................................', //  4
        '................................', //  5
        '................................', //  6
        '............................####', //  7  the gong step
        '........................########', //  8  the gong cliff
        '........................########', //  9
        '#.1.2...................########', // 10
        '######..................########', // 11  the tee ledge
        '######.....###..........########', // 12  island 1
        '######.....###......###.########', // 13  island 2
        '######.....###......###.########', // 14
        '######vvvvv###vvvvvv###v########', // 15  lava (his hot tub)
        '######vvvvv###vvvvvv###v########', // 16
        '################################', // 17
      ] },
    { title: 'Up and Over', par: 3, lavaY: 450,
      tee: { x: 870, gy: 360 }, gong: { x: 55, y: 190, top: 150 }, drop: { x: 175, gy: 270 }, tub: 470,
      rings: [{ x: 660, y: 270, a: 125, v: 740, amp: 34, ph0: 1 }, { x: 390, y: 160, a: 172, v: 430, amp: 30, ph0: 3.4 }], ringPer: 3.4, spit: [250, 760],
      map: [
        '................................', //  0
        '................................', //  1
        '................................', //  2
        '######..........................', //  3  the cave roof
        '#####...........................', //  4
        '................................', //  5
        '................................', //  6
        '................................', //  7
        '####............................', //  8  the gong step
        '########........................', //  9  the gong ledge
        '########..##....................', // 10  the spire
        '########..##....................', // 11
        '########..##.................###', // 12  the tee ledge
        '########..##.................###', // 13
        '########..##......###........###', // 14  island
        '########vv##vvvvvv###vvvvvvvv###', // 15
        '########vv##vvvvvv###vvvvvvvv###', // 16
        '################################', // 17
      ] },
  ],
};

vdRoom('golf', {
  title: 'Gong Golf', first: 0,
  act: { label: 'swing', labels: ['swing', 'zoom'] },
  tip: 'Pip golfs and Bo is the ball, then swap! Shoot through the fire rings to ring Cinder\'s gong.',
  map: VDG.holes[0].map,
});

/* --- helpers --- */
const vdgSolo = () => typeof cpuSolo === 'function' && cpuSolo();
// bigger texts on small screens (a phone held sideways is about 0.67 of full size; vdBig() only starts below 0.6)
const vdgBig = () => vdBig();   // (the core's: big below 0.75 screen scale)
const vdgCpu = id => typeof cpuOn === 'function' && cpuOn(id);
const vdgGrid = map => map.map(r => r.split('').map(ch => (ch === '1' || ch === '2' ? '.' : ch)));
// the grid as the ball sees it: open sky above the screen, rock walls at the sides
function vdgTile(tx, ty) {
  if (ty < 0 || ty >= ROWS) return '.';
  if (tx < 0 || tx >= COLS) return '#';
  return G.level.grid[ty][tx];
}
const vdgSolid = (tx, ty) => { const ch = vdgTile(tx, ty); return ch === '#' || ch === 's'; };
const vdgHole = st => VDG.holes[st.ph.hole] || VDG.holes[0];
const vdgGongR = ph => VDG.gongR * (ph.help && ph.help.big ? VDG.bigK : 1);
const vdgDir = ph => (Math.cos(ph.aim * Math.PI / 180) >= 0 ? 1 : -1);
function vdgNewBall(x, y) {
  return { x, y, vx: 0, vy: 0, fuel: 1, flyT: 0, rest: 0, ground: true, sand: false, used: 0, hitMask: 0, spin: 0,
    boosting: false, from: { x, y }, hidden: false, sfxT: 0 };
}

/* --- blobs: a pure arc from launch time t0 to end time t1 (phase clock) --- */
function vdgBlobAt(bl, t) {
  if (t < bl.t0 || t > bl.t1) return null;
  const u = t - bl.t0;
  return { x: bl.x0 + bl.vx * u, y: bl.y0 + bl.vy * u + 0.5 * bl.g * u * u, vx: bl.vx, vy: bl.vy + bl.g * u };
}
// when (and how) a blob launched at (x0, y0) with (vx, vy) ends: in the lava, on rock or off the screen
function vdgBlobEnd(x0, y0, vx, vy, g) {
  for (let u = 0.05; u < 8; u += 1 / 60) {
    const x = x0 + vx * u, y = y0 + vy * u + 0.5 * g * u * u, vyu = vy + g * u;
    if (vyu <= 0) continue;
    const tx = Math.floor(x / T), ty = Math.floor(y / T), ch = vdgTile(tx, ty);
    if (ch === 'v' && y > ty * T + 4) return { u, how: 'lava', x, y: ty * T + 4 };
    if (ch === '#' || ch === 's') return { u, how: 'rock', x, y: ty * T };
    if (y > H + 20 || x < -40 || x > W + 40) return { u, how: 'out', x, y };
  }
  return { u: 8, how: 'out', x: x0, y: y0 };
}

/* --- the ball physics, shared with the brain ---
   One physics tick (DT) of ball b with a boost push (ax, ay) (0, 0 for none) in scene E:
     E = { rings: [{x, y}], gong: {x, y, R}, head: {x, y, r} or null, blobs: [blob], t: phase clock at the tick start }
   b.used (a bitmask of rings this shot) and b.hitMask (blobs, by index in E.blobs) keep the shot's own record, so the
   brain can run it on copies. fx: null (the brain), or { ring(rg, i), bounce(v), head(), blob(bl), sand() }.
   Returns null while flying or rolling, else 'gong' | 'lava' | 'out' | 'lost' | 'rest'. */
function vdgCollide(b, fx) {
  const r = VDG.r;
  const x0 = Math.floor((b.x - r) / T), x1 = Math.floor((b.x + r) / T), y0 = Math.floor((b.y - r) / T), y1 = Math.floor((b.y + r) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!vdgSolid(tx, ty)) continue;
    const qx = clamp(b.x, tx * T, tx * T + T), qy = clamp(b.y, ty * T, ty * T + T);
    const dx = b.x - qx, dy = b.y - qy;
    let d = Math.hypot(dx, dy), nx, ny;
    if (d >= r) continue;
    if (d > 1e-6) { nx = dx / d; ny = dy / d; }
    else {   // the centre got inside the tile: leave by the nearest open side
      const outs = [[b.y - ty * T, 0, -1], [ty * T + T - b.y, 0, 1], [b.x - tx * T, -1, 0], [tx * T + T - b.x, 1, 0]]
        .filter(([, ox, oy]) => !vdgSolid(tx + ox, ty + oy)).sort((a, c) => a[0] - c[0]);
      const o = outs[0] || [b.y - ty * T, 0, -1];
      nx = o[1]; ny = o[2]; d = -o[0];
    }
    b.x += nx * (r - d); b.y += ny * (r - d);
    const vn = b.vx * nx + b.vy * ny, sand = vdgTile(tx, ty) === 's';
    if (vn < 0) {
      const hard = -vn > 90, e = hard ? (sand ? VDG.sandBounce : VDG.bounce) : 0;
      b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
      if (hard) {
        const vt = -b.vx * ny + b.vy * nx;   // a little grip on every bounce
        b.vx -= 0.12 * vt * -ny; b.vy -= 0.12 * vt * nx;
        if (fx && -vn > 200) fx.bounce(-vn, sand);
      }
    }
    if (ny < -0.6) { b.ground = true; if (sand) b.sand = true; }
  }
}
// bounce off a round thing (centre cx, cy, radius rad, its velocity svx, svy): restitution e, at least `min` px/s out
function vdgRound(b, cx, cy, rad, svx, svy, e, min) {
  let dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy);
  if (d >= rad) return false;
  if (d < 1e-6) { dx = 0; dy = -1; d = 1; }
  const nx = dx / d, ny = dy / d;
  b.x = cx + nx * rad; b.y = cy + ny * rad;
  const rvx = b.vx - svx, rvy = b.vy - svy, vn = rvx * nx + rvy * ny;
  if (vn < 0) { b.vx = svx + rvx - (1 + e) * vn * nx; b.vy = svy + rvy - (1 + e) * vn * ny; }
  const out = b.vx * nx + b.vy * ny;
  if (out < min) { b.vx += (min - out) * nx; b.vy += (min - out) * ny; }
  return true;
}
const vdgBP = [];   // (this tick's blob positions; reused)
// a fire ring's height at phase time t: it bobs up and down (amp px, per s a round)
const vdgRingY = (rg, t) => rg.y0 + rg.amp * Math.sin(2 * Math.PI * t / rg.per + rg.ph0);
function vdgTick(b, ax, ay, E, fx) {
  const dt = DT, K = VDG, r = K.r;
  b.flyT += dt; b.sfxT -= dt;
  b.boosting = false;
  if ((ax || ay) && b.fuel > 0) {
    const m = Math.hypot(ax, ay);
    b.vx += ax / m * K.boostAcc * dt; b.vy += ay / m * K.boostAcc * dt;
    b.fuel = Math.max(0, b.fuel - dt / K.boostTime); b.boosting = true;
  }
  b.vy += K.g * dt;
  const dr = 1 - K.drag * dt; b.vx *= dr; b.vy *= dr;
  // where the blobs are this tick
  const t = E.t + dt, bls = E.blobs, bp = vdgBP;
  bp.length = bls.length;
  for (let i = 0; i < bls.length; i++) bp[i] = bls[i].hit || (b.hitMask >> i) & 1 ? null : vdgBlobAt(bls[i], t);
  const n = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 4));
  b.ground = false; b.sand = false;
  for (let i = 0; i < n; i++) {
    b.x += b.vx * dt / n; b.y += b.vy * dt / n;
    vdgCollide(b, fx);
    // his head pokes out of the tub: boing
    const hd = E.head;
    if (hd && vdgRound(b, hd.x, hd.y, hd.r + r, 0, 0, K.head.e, K.head.min) && fx) fx.head();
    // lava blobs knock the ball
    for (let k = 0; k < bp.length; k++) {
      const q = bp[k];
      if (!q) continue;
      if (vdgRound(b, q.x, q.y, bls[k].r + r, q.vx * K.blob.push, q.vy * K.blob.push, K.blob.e, K.blob.min)) {
        b.hitMask |= 1 << k; bp[k] = null;
        if (fx) fx.blob(bls[k]);
      }
    }
    // fire rings (they bob up and down): WHOOSH, off the way the ring's flames point, at the ring's speed
    for (let k = 0; k < E.rings.length; k++) {
      const rg = E.rings[k];
      if ((b.used >> k) & 1) continue;
      const dx = b.x - rg.x, dy = b.y - vdgRingY(rg, t);
      if (dx * dx + dy * dy < K.ring.r * K.ring.r) {
        b.used |= 1 << k;
        const a = rg.a * Math.PI / 180, v = Math.max(rg.v, Math.hypot(b.vx, b.vy) * K.ring.keep);
        b.vx = Math.cos(a) * v; b.vy = -Math.sin(a) * v;
        if (fx) fx.ring(rg, k);
      }
    }
    const g = E.gong, gx = b.x - g.x, gy = b.y - g.y, gr = g.R + r;
    if (gx * gx + gy * gy < gr * gr) return 'gong';
    const tx = Math.floor(b.x / T), ty = Math.floor(b.y / T);
    if (vdgTile(tx, ty) === 'v' && b.y > ty * T + 6) return 'lava';
    if (b.y > H + 40 || b.x < -30 || b.x > W + 30) return 'out';
  }
  if (b.ground) { const f = (b.sand ? K.sandRoll : K.roll) * dt; b.vx = Math.abs(b.vx) <= f ? 0 : b.vx - Math.sign(b.vx) * f; }
  b.spin += b.vx * dt / r;
  if (b.ground && Math.hypot(b.vx, b.vy) < 14) b.rest += dt; else b.rest = 0;
  if (b.flyT > K.flyMax && !b.ground) return 'lost';
  if (b.rest > 0.25 || b.flyT > K.flyMax) return 'rest';
  return null;
}
// the scene the ball flies through right now (the brain copies it)
function vdgScene(st) {
  const ph = st.ph, c = st.cinder, P = vdCinderPts(c);
  return { rings: ph.rings, gong: { x: ph.gong.x, y: ph.gong.y, R: vdgGongR(ph) }, head: c.hidden ? null : { x: P.head.x, y: P.head.y, r: P.head.r * 0.9 },
    blobs: ph.blobs, t: ph.t };
}

/* --- the golfer --- */
// where the golfer stands: behind the ball, on the side they're hitting from (World 3's golferSpot)
function vdgGolferSpot(ph) {
  const b = ph.b, dir = vdgDir(ph), feet = b.y + VDG.r;
  const fits = x => {
    const c1 = Math.floor(x / T), c2 = Math.floor((x + PW - 0.01) / T), r1 = Math.floor((feet - PH) / T), r2 = Math.floor((feet - 1) / T);
    for (let c = c1; c <= c2; c++) for (let r = r1; r <= r2; r++) if (vdgSolid(c, r) || vdgTile(c, r) === 'v') return false;
    return x > -2 && x + PW < W + 2;
  };
  for (const d of [dir, -dir]) {
    const x = b.x - d * (VDG.r + 5) - (d > 0 ? PW : 0);
    if (fits(x)) return { x, y: feet - PH, face: dir };
  }
  return { x: b.x - PW / 2, y: feet - PH, face: dir };
}
function vdgPlaceGolfer(ph, sp) {
  const p = G.players[ph.golfer];
  Object.assign(p, { x: sp.x, y: sp.y, vx: 0, vy: 0, grounded: true, face: sp.face, alive: true });
}
function vdgAutoAim(ph, x) { return ph.gong.x >= x ? 40 : 140; }
function vdgStartWalk(st) {
  const ph = st.ph, gp = G.players[ph.golfer];
  ph.aim = vdgAutoAim(ph, ph.b.x);
  const to = vdgGolferSpot(ph), dist = Math.hypot(to.x - gp.x, to.y - gp.y);
  ph.walk = { fx: gp.x, fy: gp.y, to, t: 0, dur: clamp(dist / 520, 0.25, 1.1), hop: Math.min(70, dist * 0.3) + 10 };
  ph.mode = 'walk'; ph.mT = 0;
}

/* --- a hole --- */
function vdgStartHole(st, k) {
  const ph = st.ph, Hd = VDG.holes[k], c = st.cinder, first = (G.level.def.first || 0) % 2;
  if (k > 0) G.level.grid = vdgGrid(Hd.map);
  ph.hole = k; ph.golfer = (first + k) % 2; ph.ball = 1 - ph.golfer;
  ph.mode = 'aim'; ph.mT = 0; ph.charging = false; ph.power = 0; ph.powerT = 0; ph.aimHold = 0; ph.swingT = 0; ph.walk = null; ph.msg = null;
  ph.rings = Hd.rings.map(r => ({ x: r.x, y0: r.y, y: r.y, a: r.a, v: r.v, amp: r.amp || 0, per: Hd.ringPer, ph0: r.ph0 || 0, t: 0 }));
  ph.gong = { x: Hd.gong.x, y: Hd.gong.y, top: Hd.gong.top, a: 0, va: 0, hitT: 0, waves: [] };
  ph.blobs = []; ph.blobN = 0; ph.spitT = VDG.blob.first;
  ph.help = { dots: false, big: false };
  ph.shots = 0; ph.shotRings = 0; ph.lavaY = Hd.lavaY;
  ph.b = vdgNewBall(Hd.tee.x, Hd.tee.gy - VDG.r);
  ph.aim = vdgAutoAim(ph, ph.b.x);
  ph.strokes[k] = 0;
  const gp = G.players[ph.golfer], bp = G.players[ph.ball];
  Object.assign(gp, makePlayer(gp.id), { input: gp.input, prevJump: true, prevAct: true });
  Object.assign(bp, makePlayer(bp.id), { input: bp.input, prevJump: true, prevAct: true, alive: false, respawnT: Infinity });
  vdgPlaceGolfer(ph, vdgGolferSpot(ph));
  if (k > 0 && !st.idle) st.idleT = 0;   // a new hole is a fresh start for Cinder's idle wait (they just watched the gong)
  Object.assign(c, { x: Hd.tub, y: Hd.lavaY + VDG.cin.sink, s: VDG.cin.s, face: Hd.tee.x < Hd.tub ? -1 : 1, pose: 'tub', mood: 'grumpy', baseMood: 'grumpy',
    moodT: 0, air: false, gy: null, lava: Hd.lavaY + 3, act: null, hidden: false, alpha: 1, look: null });
  vdgStat(st).strokes[k] = 0;
}
const vdgStat = st => {
  const s = vdStats(st);
  if (!s.strokes) Object.assign(s, { strokes: [0, 0], pars: VDG.holes.map(h => h.par), lava: 0, lost: 0, rings: 0, blobs: 0, heads: 0, picked: 0, aces: 0, whiffs: 0 });
  return s;
};
function vdgSwing(st) {
  const ph = st.ph, b = ph.b, a = ph.aim * Math.PI / 180, v = ph.power * VDG.vmax;
  b.vx = Math.cos(a) * v; b.vy = -Math.sin(a) * v;
  b.from = { x: b.x, y: b.y }; b.fuel = 1; b.rest = 0; b.flyT = 0; b.ground = false; b.used = 0; b.hitMask = 0;
  for (const rg of ph.rings) rg.t = 0;
  if (!ph.picked[ph.hole]) { ph.strokes[ph.hole]++; vdgStat(st).strokes[ph.hole] = ph.strokes[ph.hole]; }
  ph.charging = false; ph.mode = 'fly'; ph.mT = 0; ph.swingT = 0.35; ph.shots++; ph.shotRings = 0; ph.lastPow = ph.power;
  const gp = G.players[ph.golfer]; gp.sx = 1.15; gp.sy = 0.88;
  Sfx.play('thwack', ph.golfer);
  rumble(ph.golfer, 0.25 + 0.5 * ph.power, 0.5, 110); rumble(ph.ball, 0.4, 0.6, 90);
  puff(b.x, b.y + VDG.r, 6, 'rgba(255,255,255,0.9)');
  if (ph.shots === 1 && ph.hole === 0) vdReact(st, 'surprised', 'Hey! Not my gong!', 1.6);
}
// the ball stopped (or came back after a penalty): pick-up, gold help, then the golfer walks over
function vdgNextShot(st) {
  const ph = st.ph, Hd = vdgHole(st), s = ph.strokes[ph.hole], over = s - Hd.par, ball = NAMES[ph.ball];
  if (!ph.picked[ph.hole] && s >= VDG.maxStrokes) {
    ph.picked[ph.hole] = true; vdgStat(st).picked++;
    ph.strokes[ph.hole] = Math.min(s, VDG.maxStrokes); vdgStat(st).strokes[ph.hole] = ph.strokes[ph.hole];
    const b = ph.b;
    puff(b.x, b.y, 8, 'rgba(255,255,255,0.9)');
    Object.assign(b, vdgNewBall(Hd.drop.x, Hd.drop.gy - VDG.r));
    puff(b.x, b.y, 10, 'rgba(255,220,150,0.95)');
    vdHelp(st, 'Pick it up! ' + ball + ' gets a free drop by the gong. One ring to finish!', { life: 4.5 });
    Sfx.play('flag');
  } else if (over >= VDG.help.big && !ph.help.big && !ph.picked[ph.hole]) {
    ph.help.big = true; vdHelp(st, 'Gold help: a BIG gong! Much easier to ring.'); ph.gong.hitT = 0.4;
  } else if (over >= VDG.help.dots && !ph.help.dots && !ph.picked[ph.hole]) {
    ph.help.dots = true; vdHelp(st, 'Gold help: long aim dots! Now you can see the whole shot.', { id: ph.golfer, hint: 'Long aim dots!' });
  }
  vdgStartWalk(st);
}
// after the pick-up every miss comes back to the drop by the gong (no wandering back across the crater)
function vdgRedrop(st) {
  const ph = st.ph, b = ph.b, Hd = vdgHole(st);
  puff(b.x, b.y, 8, 'rgba(255,255,255,0.9)');
  Object.assign(b, vdgNewBall(Hd.drop.x, Hd.drop.gy - VDG.r));
  puff(b.x, b.y, 10, 'rgba(255,220,150,0.95)');
  ph.msg = { text: 'Back by the gong!', t: 1.4 };
  vdgSoftTip(st);
  vdgStartWalk(st);
}
// a soft shot after the pick-up: tell the golfer to hold longer (the meter rises while held)
function vdgSoftTip(st) {
  const ph = st.ph;
  if (ph.picked[ph.hole] && (ph.lastPow || 0) < 0.45) vdHint(st, ph.golfer, 'Hold longer for more power!', { life: 3, cpu: null });
}
function vdgPenalty(st, kind) {
  const ph = st.ph, b = ph.b, S = vdgStat(st);
  if (!ph.picked[ph.hole]) { ph.strokes[ph.hole]++; S.strokes[ph.hole] = ph.strokes[ph.hole]; }
  ph.mode = 'pen'; ph.mT = 0; b.hidden = true; b.boosting = false;
  const plus = ph.picked[ph.hole] ? '' : '  +1 stroke';
  if (kind === 'lava') {
    S.lava++;
    ph.msg = { text: 'Hot tub!' + plus, t: 1.6 };
    Sfx.play('vdgSizzle');
    for (let i = 0; i < 16; i++) G.particles.push({ x: b.x, y: ph.lavaY, vx: (Math.random() - 0.5) * 220, vy: -140 - Math.random() * 260, life: 0.75, max: 0.75, col: i % 3 ? '#ffb347' : '#ffe08a', size: 3 + Math.random() * 3, grav: 900, kind: 'dot' });
    puff(b.x, ph.lavaY - 8, 6, 'rgba(120,110,120,0.8)');
    if (S.lava % 2 === 1) vdReact(st, 'smug', S.lava === 1 ? 'Ha! Nice and warm, huh?' : 'Splish! My hot tub!', 1.6);
  } else {
    S.lost++;
    ph.msg = { text: 'Lost ball!' + plus, t: 1.6 };
    Sfx.play('die'); burst(clamp(b.x, 10, W - 10), clamp(b.y, 10, H - 10), PCOL[ph.ball], 12);
  }
  rumble(ph.ball, 0.6, 0.6, 200);
}
function vdgRing(st) {
  const ph = st.ph, Hd = vdgHole(st), S = vdgStat(st), s = ph.strokes[ph.hole], c = st.cinder;
  ph.mode = 'rung'; ph.mT = 0; ph.charging = false; ph.b.boosting = false; st.hints[ph.golfer] = null;
  ph.verdict = ph.picked[ph.hole] ? 'Picked up' : golfScoreName(s, Hd.par);
  if (s === 1 && !ph.picked[ph.hole]) S.aces++;
  ph.gong.va = 3.2 * (ph.b.vx >= 0 ? 1 : -1); ph.gong.hitT = 1; ph.gong.waves.push(0);
  ph.rung = (ph.rung || 0) + 1;
  Sfx.play('vdGong'); rumble(0, 0.5, 0.8, 300); rumble(1, 0.5, 0.8, 300);
  vdPop(st, ph.gong.x, ph.gong.y - 50, 'BONNNG!', C.gold, 38);
  for (let k = 0; k < 40; k++) confetti(ph.gong.x, ph.gong.y);
  burst(ph.gong.x, ph.gong.y, '#fff1a8', 14);
  // the ball pops off the gong and vanishes into a puff (ready for the next hole)
  ph.b.hidden = true; puff(ph.b.x, ph.b.y, 10, 'rgba(255,255,255,0.95)');
  c.pose = 'dizzy'; c.act = null; c.mood = 'surprised'; c.moodT = 2.4; c.hitT = 0.8;
  vdCelebrate(st, 3.4);
  for (const bl of ph.blobs) if (bl.t0 > ph.t) bl.t1 = -1;   // a spit that hadn't left his mouth yet: swallowed
  vdSay(st, ph.hole === 0 ? 'Ooooh... my ears... *ding*' : 'Wobble wobble... hee... hee hee!', 2.4);
}
// a new lava blob: puffs his cheeks for VDG.blob.warn s, then lobs it along an arc that ends in the lava
function vdgSpit(st) {
  const ph = st.ph, Hd = vdgHole(st), K = VDG.blob, c = st.cinder, m = vdCinderPts(c).mouth;
  const T2 = K.T[0] + vdRand() * (K.T[1] - K.T[0]);
  // aim somewhere along the shot: between the ball and the gong, inside this hole's spit range
  const lo = Hd.spit[0], hi = Hd.spit[1];
  const x1 = lo + vdRand() * (hi - lo), y1 = ph.lavaY + 6, x0 = m.x, y0 = m.y;
  const vx = (x1 - x0) / T2, vy = (y1 - y0 - 0.5 * K.g * T2 * T2) / T2;
  const t0 = ph.t + K.warn, end = vdgBlobEnd(x0, y0, vx, vy, K.g);
  ph.blobs.push({ id: ph.blobN++, x0, y0, vx, vy, g: K.g, r: K.r, t0, t1: t0 + end.u, end, w0: ph.t, hit: false, out: false, seed: vdRand() });
  c.face = x1 >= c.x ? 1 : -1;
  Sfx.play('vdgPuff');
}
function vdgBlobTick(st, dt) {
  const ph = st.ph, c = st.cinder, K = VDG.blob;
  // a spit he was about to do is cancelled in a calm moment (idle, cutscene)
  if (vdCalm(st)) ph.blobs = ph.blobs.filter(bl => bl.t0 <= ph.t || bl.t1 < 0);
  let warn = null;
  for (const bl of ph.blobs) {
    if (bl.t1 < 0) { bl.out = true; continue; }
    if (ph.t < bl.t0) { warn = bl; continue; }
    if (!bl.launched) { bl.launched = true; Sfx.play('vdgSpit'); c.act = 'spit'; c.actT = 0.2; }
    if (!bl.out && (bl.hit || ph.t >= bl.t1)) {
      bl.out = true;
      if (!bl.hit) {
        const e = bl.end;
        if (e.how === 'lava') { for (let i = 0; i < 8; i++) G.particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 140, vy: -90 - Math.random() * 160, life: 0.5, max: 0.5, col: '#ffb347', size: 3 + Math.random() * 2, grav: 700, kind: 'dot' }); Sfx.play('vdgPlop'); }
        else if (e.how === 'rock') { puff(e.x, e.y, 6, 'rgba(110,100,110,0.8)'); burst(e.x, e.y - 4, '#ff9a3c', 5); Sfx.play('vdgPlop'); }
      }
    }
  }
  if (ph.blobs.some(bl => bl.out)) ph.blobs = ph.blobs.filter(bl => !bl.out);
  // his cheeks: puffed up while a blob waits in his mouth, then let go
  if (warn) { c.act = 'spit'; c.actT = 0.2 * clamp((ph.t - warn.w0) / K.warn, 0, 1); }
  else if (c.act === 'spit' && c.actT > 0.45) c.act = null;
  // a new spit now and then (never in a calm moment, never while the hole is being rung)
  const live = ph.blobs.filter(bl => !bl.out).length;
  if (!vdCalm(st) && ph.mode !== 'rung' && live < K.max && !warn && (ph.spitT -= dt) <= 0) {
    ph.spitT = K.gap[0] + vdRand() * (K.gap[1] - K.gap[0]);
    vdgSpit(st);
  }
}

/* --- the ball's effects in the game (the brain flies it with fx = null) --- */
function vdgFx(st) {
  const ph = st.ph, S = vdgStat(st);
  return {
    ring(rg) {
      rg.t = 0.6; S.rings++; ph.shotRings++;
      Sfx.play('vdgRing', ph.ball); rumble(ph.ball, 0.3, 0.5, 110);
      for (let k = 0; k < 10; k++) burst(rg.x, rg.y, k % 2 ? '#ffb347' : '#fff1a8', 1);
      vdPop(st, rg.x, rg.y - 26, ph.shotRings > 1 ? 'WHOOSH!!' : 'WHOOSH!', '#ffd27a', 22);
    },
    bounce(v, sand) {
      const b = ph.b;
      if (b.sfxT > 0) return;
      b.sfxT = 0.08;
      if (sand) { Sfx.play('vdgPlop'); puff(b.x, b.y + VDG.r, 5, 'rgba(120,112,125,0.85)'); }
      else Sfx.play('bonk');
      rumble(ph.ball, 0.15, 0.3, 40);
    },
    head() {
      const b = ph.b;
      if (b.sfxT > 0) return;
      b.sfxT = 0.15; S.heads++;
      Sfx.play('vdgBoing'); rumble(ph.ball, 0.3, 0.4, 90);
      vdPop(st, b.x, b.y - 24, 'Boing!', '#ffffff', 20);
      st.cinder.hitT = 0.5;
      if (S.heads % 2 === 1) vdReact(st, 'surprised', S.heads === 1 ? 'Hey! That\'s my head!' : 'Hic! Hey, watch it!', 1.4);
      vdHiccup(st);
    },
    blob(bl) {
      const b = ph.b;
      bl.hit = true; S.blobs++;
      Sfx.play('vdgBlorp'); rumble(ph.ball, 0.45, 0.5, 120);
      const q = vdgBlobAt(bl, ph.t) || { x: b.x, y: b.y };
      for (let k = 0; k < 10; k++) G.particles.push({ x: q.x, y: q.y, vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.8) * 240, life: 0.55, max: 0.55, col: k % 2 ? '#ff8a3d' : '#ffd27a', size: 3 + Math.random() * 3, grav: 600, kind: 'dot' });
      vdPop(st, q.x, q.y - 22, 'Blorp!', '#ffd27a', 20);
      if (S.blobs % 3 === 1) vdReact(st, 'smug', 'Hee! Bonk!', 1.2);
    },
  };
}
function vdgFly(st, dt) {
  const ph = st.ph, b = ph.b, inp = G.players[ph.ball].input;
  let ax = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), ay = (inp.down ? 1 : 0) - (inp.jump || inp.up ? 1 : 0);
  // the action ('zoom') pushes along the flight
  if (!ax && !ay && inp.act) { const s = Math.hypot(b.vx, b.vy); if (s > 20) { ax = b.vx / s; ay = b.vy / s; } }
  b.hitMask = 0;
  const ev = vdgTick(b, ax, ay, vdgScene(st), ph.fx || (ph.fx = vdgFx(st)));
  if (b.boosting) {
    const m = Math.hypot(ax, ay) || 1, ux = ax / m, uy = ay / m;
    if ((G.tickN & 1) === 0) G.particles.push({ x: b.x - ux * 11, y: b.y - uy * 11, vx: -ux * 160 + (Math.random() - 0.5) * 60, vy: -uy * 160 + (Math.random() - 0.5) * 60, life: 0.3, max: 0.3, col: PCOL[ph.ball], size: 3 + Math.random() * 2, grav: 0, kind: 'dot' });
    if (b.sfxT <= 0) { Sfx.play('whoosh', ph.ball); b.sfxT = 0.09; }
    if ((G.tickN % 12) === 0) rumble(ph.ball, 0, 0.25, 60);
  }
  // a fiery trail while it's going fast after a ring
  if (ph.shotRings && Math.hypot(b.vx, b.vy) > 500 && (G.tickN % 2) === 0) G.particles.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 0.35, max: 0.35, col: G.tickN % 4 ? '#ff9a3c' : '#ffe08a', size: 3 + Math.random() * 3, grav: -60, kind: 'dot' });
  if (!ev) return;
  if (ev === 'gong') { vdgRing(st); return; }
  if (ev === 'lava') { vdgPenalty(st, 'lava'); return; }
  if (ev === 'out' || ev === 'lost') { vdgPenalty(st, 'lost'); return; }
  // rest
  b.vx = 0; b.vy = 0; b.boosting = false;
  if (ph.picked[ph.hole]) { vdgRedrop(st); return; }
  vdgNextShot(st);
}
function vdgAim(st, dt) {
  const ph = st.ph, gp = G.players[ph.golfer], inp = gp.input;
  const dir = (inp.left ? 1 : 0) - (inp.right ? 1 : 0);
  if (dir) {
    ph.aimHold += dt;
    ph.aim = clamp(ph.aim + dir * (35 + Math.min(1, ph.aimHold / 0.6) * 85) * dt, 0, 180);
    const sp = vdgGolferSpot(ph);
    if (sp.face !== gp.face || Math.abs(sp.x - gp.x) > 1) vdgPlaceGolfer(ph, sp);
  } else ph.aimHold = 0;
  // a pause (or a switch to another tab) in the middle of a charge: start again, so letting go meanwhile doesn't swing.
  // The HUD hook drops the charge while the game is paused; and G.clock runs on in frames that play no steps (a pause
  // card), while a slow frame (a hitch) adds at most 0.05 s, so a hitch never cancels a charge.
  const clk = G.clock, gap = clk - (ph.clk == null ? clk : ph.clk);
  ph.clk = clk;
  if (ph.charging && gap > 0.15) { ph.charging = false; ph.power = 0; }
  if (!ph.charging) {
    if (gp.pendingJump || gp.pendingAct) { ph.charging = true; ph.powerT = 0; ph.power = 0.04; ph.heldT = 0; return; }
    // still holding from before (the walk, a cancel, a pause): a charge needs a fresh press
    if (inp.jump || inp.act) {
      ph.heldT = (ph.heldT || 0) + dt;
      if (ph.heldT > 1.2 && (ph.whiffT || 0) <= 0) { ph.whiffT = 2.5; ph.heldT = 0; vdHint(st, ph.golfer, 'Let go, then hold ' + vdKey(ph.golfer, 'jump') + ' again!', { life: 2.4, cpu: null }); }
    } else ph.heldT = 0;
    return;
  }
  if (inp.down) { ph.charging = false; ph.power = 0; return; }   // changed your mind
  ph.powerT += dt;
  const k = (ph.powerT / VDG.charge) % 2;
  ph.power = Math.max(0.04, k <= 1 ? k : 2 - k);
  if (!inp.jump && !inp.act) {
    if (ph.powerT < VDG.minHold) {
      ph.charging = false; ph.power = 0; vdgStat(st).whiffs++;
      if ((ph.whiffT || 0) <= 0) { ph.whiffT = 2.5; vdHint(st, ph.golfer, 'Hold it longer, then let go!', { life: 2.2, cpu: null }); }
      return;
    }
    vdgSwing(st);
  }
}

/* --- the phase --- */
VD_PHASES.golf = {
  bubbleHidden: true,
  setup(st, L) {
    const ph = st.ph;
    ph.t = 0; ph.strokes = [0, 0]; ph.picked = [false, false]; ph.rung = 0; ph.whiffT = 0; ph.tips = {};
    vdgStat(st);
    vdgStartHole(st, 0);
  },
  coast(st, dt) { vdgAnim(st, dt); },
  step(st, dt) {
    const ph = st.ph, c = st.cinder;
    ph.t += dt; ph.mT += dt;
    if (ph.whiffT > 0) ph.whiffT -= dt;
    if (ph.swingT > 0) ph.swingT -= dt;
    if (ph.msg && (ph.msg.t -= dt) <= 0) ph.msg = null;
    vdgAnim(st, dt);
    vdgBlobTick(st, dt);
    // Cinder watches the ball
    if (ph.mode !== 'rung' && !ph.b.hidden) { c.look = { x: ph.b.x, y: ph.b.y }; if (!c.act) c.face = ph.b.x >= c.x ? 1 : -1; }
    vdgTips(st);
    if (ph.mode === 'aim') vdgAim(st, dt);
    else if (ph.mode === 'fly') vdgFly(st, dt);
    else if (ph.mode === 'walk') {
      const w = ph.walk, gp = G.players[ph.golfer];
      w.t += dt;
      const k = Math.min(1, w.t / w.dur);
      gp.x = w.fx + (w.to.x - w.fx) * k; gp.y = w.fy + (w.to.y - w.fy) * k - Math.sin(Math.PI * k) * w.hop;
      gp.face = w.to.x >= w.fx ? 1 : -1; gp.grounded = k >= 1;
      if (k >= 1) { vdgPlaceGolfer(ph, w.to); gp.sx = 1.2; gp.sy = 0.85; ph.mode = 'aim'; ph.mT = 0; ph.walk = null; }
    } else if (ph.mode === 'pen') {
      if (ph.mT > 1.0) {
        const b = ph.b;
        Object.assign(b, { x: b.from.x, y: b.from.y, vx: 0, vy: 0, hidden: false, fuel: 1, rest: 0, ground: true });
        puff(b.x, b.y, 8, 'rgba(255,255,255,0.9)');
        vdgSoftTip(st);
        vdgNextShot(st);
      }
    } else if (ph.mode === 'rung') {
      if (ph.mT > 1.6 && c.pose === 'dizzy' && ph.hole === VDG.holes.length - 1) { c.pose = 'cheer'; c.mood = 'happy'; c.baseMood = 'happy'; vdSay(st, 'That tickles! You two are FUN!', 2.2); Sfx.play('vdCheer'); }
      if (ph.mT > 3.4) {
        if (ph.hole < VDG.holes.length - 1) {
          vdgStartHole(st, ph.hole + 1);
          vdSwap(st);
          vdSay(st, 'Not my gong again! Grr... *hic*', 2.2);
        } else {
          ph.mode = 'done';
          vdPhaseDone(st, { say: 'Okay, okay, you win! Now... RACE me down the other side!' });
        }
      }
    }
    for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
  },
  labels: st => (st.ph.golfer === 0 ? ['swing', 'zoom'] : ['zoom', 'swing']),
  roles: st => (st.ph.golfer === 0 ? ['Golf!', null] : [null, 'Golf!']),
  legend(st) {
    const g = st.ph.golfer;
    const pip = g === 0 ? '<kbd>A</kbd><kbd>D</kbd> aim, hold <kbd>W</kbd> and let go to swing' : '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> steer the ball';
    const bo = g === 1 ? '<kbd>←</kbd><kbd>→</kbd> aim, hold <kbd>↑</kbd> and let go to swing' : '<kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> steer the ball';
    return { pip, bo, pad: 'stick aims (golfer) or steers (ball), hold <span data-glyph="a"></span> and let go to swing,' };
  },
  hudText(st) {
    const ph = st.ph, Hd = vdgHole(st), s = ph.strokes[ph.hole];
    return 'Hole ' + (ph.hole + 1) + '/2 · Par ' + Hd.par + ' · Strokes ' + s + (ph.picked[ph.hole] ? ' (up)' : '');
  },
  progress: st => ({ n: st.ph.rung || 0, of: 2 }),
  busy: (st, p) => p.id === st.ph.ball,
  headLift: () => 0,
  bubblePos(st, p) {
    const ph = st.ph;
    if (p.id === ph.ball) return ph.b.hidden ? null : { x: ph.b.x, y: Math.max(40, ph.b.y - VDG.r - 8) };
    return { x: p.x + p.w / 2, y: p.y };
  },
  stat(st) {
    const g = st.stats.golf;
    if (!g || !g.strokes) return null;
    return { label: 'Golf strokes', value: (g.strokes[0] + g.strokes[1]) + ' (par ' + (g.pars[0] + g.pars[1]) + ')' };
  },
  drawBack(st) { vdgDrawBack(st); },
  draw(st) { vdgDrawMid(st); },
  drawTop(st) { vdgDrawTop(st); },
  hud(st) { vdgHud(st); },
};

// things that move even during the cards and cutscenes: the gong swing, ring flashes
function vdgAnim(st, dt) {
  const ph = st.ph, g = ph.gong;
  if (!g) return;
  g.va += (-g.a * 26 - g.va * 1.6) * dt; g.a += g.va * dt;
  if (g.hitT > 0) g.hitT = Math.max(0, g.hitT - dt);
  for (let k = 0; k < g.waves.length; k++) g.waves[k] += dt;
  if (g.waves.length && g.waves[0] > 1.4) g.waves.shift();
  for (const rg of ph.rings) { if (rg.t > 0) rg.t = Math.max(0, rg.t - dt); rg.y = vdgRingY(rg, ph.t); }
}
// first-time tips (each once): over the golfer, and the news line
function vdgTips(st) {
  const ph = st.ph, T0 = ph.tips, gn = NAMES[ph.golfer], bn = NAMES[ph.ball];
  const once = (k, f) => { if (!T0[k]) { T0[k] = true; f(); } };
  if (ph.mode === 'aim' && ph.mT > 0.4 && ph.shots === 0 && st.badgeT < VD.badgeT - 0.6) {
    once('rings' + ph.hole, () => vdNews(st, ph.hole === 0 ? 'Fire rings make the ball go WHOOSH! Ring the gong!' : 'Swap! ' + gn + ' golfs, ' + bn + ' is the ball.', false, 4));
  }
  if (ph.mode === 'aim' && ph.mT > 9 && !ph.charging) once('slow' + ph.hole + ':' + ph.shots, () => vdHint(st, ph.golfer, 'Hold ' + vdKey(ph.golfer, 'jump') + ', let go to swing!', { life: 3, cpu: null }));
}

/* --- drawing --- */
const VDGC = { post: '#7a3324', postLt: '#a8492f', postDk: '#4a1d15', gold: '#ffc94a', goldLt: '#fff1a8', goldDk: '#c98a1d', rope: '#e8c27a',
  ash: '#5d5560', ashLt: '#7a7180', ringDk: '#b8261a', ring: '#ff7a1f', ringLt: '#ffd27a' };
function vdgDrawBack(st) {
  const ph = st.ph, t = G.clock, Hd = vdgHole(st), L = G.level;
  vdDrawBackdrop(t, { x: ph.hole === 0 ? 470 : 520, y: 250 });
  // the far wall of the crater, glowing from the lava below
  ctx.fillStyle = '#4a2534';
  ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, 200);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 236 + Math.sin(x / W * Math.PI) * 110 + Math.sin(x * 0.045 + ph.hole) * 7 + (hash(x, 9) % 8));
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,160,120,0.3)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 237 + Math.sin(x / W * Math.PI) * 110 + Math.sin(x * 0.045 + ph.hole) * 7 + (hash(x, 9) % 8));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(25,8,18,0.22)'; ctx.lineWidth = 3;
  for (const dy of [30, 62]) { ctx.beginPath(); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 236 + dy + Math.sin(x / W * Math.PI) * 110 + Math.sin(x * 0.03 + dy) * 5); ctx.stroke(); }
  ctx.fillStyle = 'rgba(25,8,18,0.25)'; for (let k = 0; k < 26; k++) { const h = hash(k, 67), x = h % W; circle(x, 250 + Math.sin(x / W * Math.PI) * 110 + (h >> 10) % 60, 1.5 + (k % 3)); ctx.fill(); }
  ctx.fillStyle = '#5c2e3c';
  ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, 300);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 316 + Math.sin(x / W * Math.PI) * 70 + Math.sin(x * 0.07 + 2) * 5);
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,170,120,0.28)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 317 + Math.sin(x / W * Math.PI) * 70 + Math.sin(x * 0.07 + 2) * 5);
  ctx.stroke();
  const gl = ctx.createLinearGradient(0, 320, 0, Hd.lavaY);
  gl.addColorStop(0, 'rgba(255,120,50,0)'); gl.addColorStop(1, `rgba(255,140,60,${0.42 + 0.06 * Math.sin(t * 2)})`);
  ctx.fillStyle = gl; ctx.fillRect(0, 320, W, Hd.lavaY - 320);
  // steam off the lake (a pure function of the clock)
  for (let k = 0; k < 6; k++) {
    const u = (t * 0.15 + k / 6) % 1, x = 220 + ((k * 151) % 540) + Math.sin(u * 6 + k) * 16;
    const a = 0.15 * Math.sin(u * Math.PI), y = Hd.lavaY - 20 - u * 230, r = 14 + u * 26;
    ctx.fillStyle = `rgba(255,220,200,${a})`; ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, Math.PI * 2); ctx.arc(x - r * 0.5, y + r * 0.25, r * 0.55, 0, Math.PI * 2); ctx.arc(x + r * 0.5, y + r * 0.2, r * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,240,225,${a * 0.9})`; circle(x - r * 0.2, y - r * 0.3, r * 0.35); ctx.fill();
  }
  // the lava (each surface span), then the rock over the backdrop
  for (let ty = 0; ty < ROWS; ty++) {
    let x0 = -1;
    for (let tx = 0; tx <= COLS; tx++) {
      const lava = tx < COLS && L.grid[ty][tx] === 'v' && (ty === 0 || L.grid[ty - 1][tx] !== 'v');
      if (lava && x0 < 0) x0 = tx;
      if (!lava && x0 >= 0) { vdDrawLava(x0 * T, tx * T, ty * T + 4, t, { depth: (ROWS - ty) * T }); x0 = -1; }
    }
  }
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const ch = L.grid[ty][tx];
    if (ch === '#') drawStone(tx, ty);
    else if (ch === 's') vdgDrawAsh(tx, ty);
  }
  // glowing seams on the rock faces near the lava
  ctx.strokeStyle = `rgba(255,150,70,${0.5 + 0.2 * Math.sin(t * 1.9)})`; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let ty = 11; ty < ROWS - 1; ty++) for (let tx = 0; tx < COLS; tx++) {
    if (L.grid[ty][tx] !== '#' || hash(tx, ty + 40) % 5) continue;
    const x = tx * T + 6 + hash(tx, ty) % 14, y = ty * T + 6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 5, y + 8); ctx.lineTo(x + 1, y + 15); ctx.stroke();
  }
}
function vdgDrawAsh(tx, ty) {
  const x = tx * T, y = ty * T, h = hash(tx, ty);
  ctx.fillStyle = VDGC.ash; ctx.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
  ctx.fillStyle = VDGC.ashLt;
  for (let i = 0; i < 5; i++) { circle(x + 4 + ((h >> (i * 3)) % 23), y + 6 + ((h >> (i * 4 + 2)) % 20), 1.5); ctx.fill(); }
  if (h % 4 === 0) { ctx.fillStyle = 'rgba(30,20,35,0.25)'; ctx.beginPath(); ctx.ellipse(x + 8 + (h >> 7) % 16, y + 14 + (h >> 11) % 10, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill(); }
  if (vdgTile(tx, ty - 1) !== 's' && vdgTile(tx, ty - 1) !== '#') { ctx.fillStyle = '#8f8592'; ctx.fillRect(x, y, T, 4); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(x, y, T, 1.5); }
}
function vdgDrawGong(st) {
  const ph = st.ph, g = ph.gong, R = vdgGongR(ph), t = G.clock, top = g.top;
  // a carved beam under the cave roof, with curly ends; the disc hangs from it on two ropes and swings
  const w = R + 16;
  ctx.fillStyle = VDGC.post; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  rr(g.x - w, top - 2, 2 * w, 10, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = VDGC.postLt; ctx.fillRect(g.x - w + 4, top, 2 * w - 8, 2);
  ctx.strokeStyle = VDGC.postDk; ctx.lineWidth = 3;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(g.x + s * w, top + 3, 5, 0, Math.PI * 2); ctx.stroke(); }
  ctx.save(); ctx.translate(g.x, top + 6); ctx.rotate(g.a * 0.22);
  const cy = g.y - top - 6;
  ctx.strokeStyle = VDGC.rope; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-R * 0.6, 0); ctx.lineTo(-R * 0.42, cy - R * 0.9); ctx.moveTo(R * 0.6, 0); ctx.lineTo(R * 0.42, cy - R * 0.9); ctx.stroke();
  if (g.hitT > 0) { ctx.fillStyle = `rgba(255,236,150,${0.6 * g.hitT})`; circle(0, cy, R + 16 * g.hitT); ctx.fill(); }
  const gr = ctx.createRadialGradient(-R * 0.35, cy - R * 0.35, R * 0.1, 0, cy, R);
  gr.addColorStop(0, VDGC.goldLt); gr.addColorStop(0.55, VDGC.gold); gr.addColorStop(1, VDGC.goldDk);
  ctx.fillStyle = gr; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
  circle(0, cy, R); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(150,90,20,0.55)'; ctx.lineWidth = 1.5;
  circle(0, cy, R * 0.72); ctx.stroke(); circle(0, cy, R * 0.45); ctx.stroke();
  // a little flame mark in the middle (Cinder's own gong)
  ctx.fillStyle = '#ff7a1f'; ctx.beginPath(); ctx.moveTo(0, cy - R * 0.32); ctx.quadraticCurveTo(R * 0.26, cy, 0, cy + R * 0.26); ctx.quadraticCurveTo(-R * 0.26, cy, 0, cy - R * 0.32); ctx.fill();
  ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.moveTo(0, cy - R * 0.1); ctx.quadraticCurveTo(R * 0.12, cy + 0.08 * R, 0, cy + R * 0.2); ctx.quadraticCurveTo(-R * 0.12, cy + 0.08 * R, 0, cy - R * 0.1); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(-R * 0.42, cy - R * 0.4, R * 0.2, R * 0.1, -0.7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // sound waves after a ring
  for (const u of g.waves) {
    ctx.strokeStyle = `rgba(255,236,150,${clamp(1 - u / 1.4, 0, 1) * 0.8})`; ctx.lineWidth = 3;
    for (let k = 0; k < 2; k++) { const r2 = R + 10 + (u * 140 + k * 26); ctx.beginPath(); ctx.arc(g.x, g.y, r2, 0, Math.PI * 2); ctx.stroke(); }
  }
  // a gentle "ring me" shimmer while the hole is on
  if (ph.mode !== 'rung' && ph.mode !== 'done') {
    const u = (t * 0.8) % 1;
    ctx.strokeStyle = `rgba(255,241,168,${0.4 * (1 - u)})`; ctx.lineWidth = 2; circle(g.x, g.y, R + 4 + u * 16); ctx.stroke();
  }
}
// a fire hoop: it faces the way it throws the ball (flames trail behind it, arrows point ahead)
function vdgDrawRing(rg, used, t) {
  const pulse = rg.t > 0 ? 1 + rg.t * 0.6 : 1 + Math.sin(t * 5 + rg.x) * 0.04, R = 18;
  ctx.save(); ctx.translate(rg.x, rg.y); ctx.rotate(-rg.a * Math.PI / 180); ctx.scale(pulse, pulse);
  ctx.globalAlpha = used ? 0.35 : 1;
  const gl = ctx.createRadialGradient(0, 0, R * 0.5, 0, 0, R * 2);
  gl.addColorStop(0, 'rgba(255,160,60,0)'); gl.addColorStop(0.5, 'rgba(255,150,60,0.32)'); gl.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = gl; circle(0, 0, R * 2); ctx.fill();
  // flames streaming back out of the hoop
  for (let k = 0; k < 5; k++) {
    const y0 = (k - 2) * R * 0.38, len = R * (0.9 + 0.35 * Math.sin(t * 14 + k * 1.9)) * (k === 2 ? 1.35 : 1);
    ctx.fillStyle = k % 2 ? 'rgba(255,122,31,0.85)' : 'rgba(255,205,90,0.9)';
    ctx.beginPath(); ctx.moveTo(-R * 0.3, y0 - 5); ctx.quadraticCurveTo(-R * 0.3 - len * 0.6, y0 - 6 + Math.sin(t * 9 + k) * 3, -R * 0.3 - len, y0); ctx.quadraticCurveTo(-R * 0.3 - len * 0.6, y0 + 6, -R * 0.3, y0 + 5); ctx.closePath(); ctx.fill();
  }
  // arrows ahead: this way!
  for (let k = 0; k < 2; k++) {
    const u = (t * 1.6 + k * 0.5) % 1, x = R * 0.9 + u * R * 1.3;
    ctx.strokeStyle = `rgba(255,236,150,${0.9 * Math.sin(u * Math.PI)})`; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - 6, -8); ctx.lineTo(x + 2, 0); ctx.lineTo(x - 6, 8); ctx.stroke();
  }
  // the hoop, seen a little from the side
  const rx = R * 0.5, ry = R;
  ctx.strokeStyle = VDGC.ringDk; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = VDGC.ring; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = VDGC.ringLt; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(0, 0, rx - 1, ry - 1, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  for (let k = 0; k < 6; k++) {   // little flames licking round the rim
    const an = k * Math.PI / 3 + t * 2, fx = Math.cos(an) * rx, fy = Math.sin(an) * ry, fl = 5 + Math.sin(t * 15 + k * 2) * 2;
    ctx.fillStyle = 'rgba(255,200,80,0.9)'; ctx.beginPath(); ctx.moveTo(fx - 3, fy); ctx.quadraticCurveTo(fx, fy - fl * 1.6, fx + 1, fy - fl * 2); ctx.quadraticCurveTo(fx + 2, fy - fl, fx + 3, fy); ctx.closePath(); ctx.fill();
  }
  if (rg.t > 0) { ctx.strokeStyle = `rgba(255,255,255,${rg.t})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, rx + 6, ry + 6, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}
function vdgDrawBlob(x, y, r, t, seed, a = 1) {
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(255,150,60,0.35)'; circle(x, y, r * 1.6); ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.15, x, y, r);
  g.addColorStop(0, '#fff1a8'); g.addColorStop(0.45, '#ffa040'); g.addColorStop(1, '#d8461a');
  ctx.fillStyle = g; ctx.strokeStyle = '#7a2414'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let k = 0; k <= 12; k++) { const an = k * Math.PI / 6, w = r * (1 + Math.sin(t * 9 + k * 1.7 + seed * 9) * 0.07); ctx.lineTo(x + Math.cos(an) * w, y + Math.sin(an) * w); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(122,36,20,0.6)'; circle(x + r * 0.3, y + r * 0.2, r * 0.18); ctx.fill(); circle(x - r * 0.25, y + r * 0.4, r * 0.12); ctx.fill();
  ctx.restore();
}
function vdgDrawBlobs(st) {
  const ph = st.ph, t = G.clock;
  for (const bl of ph.blobs) {
    if (bl.out || bl.t1 < 0) continue;
    const warn = ph.t < bl.t0, k = warn ? clamp((ph.t - bl.w0) / VDG.blob.warn, 0, 1) : 1;
    // the path: dotted while it waits in his mouth, fading behind it once it flies
    const u0 = warn ? 0 : ph.t - bl.t0, du = (bl.t1 - bl.t0) / 22;
    for (let i = 1; i <= 22; i++) {
      const u = i * du;
      if (u < u0) continue;
      const x = bl.x0 + bl.vx * u, y = bl.y0 + bl.vy * u + 0.5 * bl.g * u * u;
      ctx.fillStyle = `rgba(255,${warn ? 90 : 170},60,${(warn ? 0.35 + 0.5 * k : 0.28) * (warn ? Math.min(1, k * 22 / i) : 1)})`;
      circle(x, y, warn ? 3.2 : 2.4); ctx.fill();
    }
    const e = bl.end;
    if (warn) {
      // where it will land, and the blob growing in his mouth
      const pulse = 0.6 + 0.4 * Math.sin(G.clock * 12);
      ctx.strokeStyle = `rgba(255,90,60,${pulse * k})`; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.ellipse(e.x, e.y, 18, 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      vdgDrawBlob(bl.x0, bl.y0, bl.r * (0.35 + 0.65 * k), t, bl.seed, 0.6 + 0.4 * k);
    } else {
      const q = vdgBlobAt(bl, ph.t);
      if (q && !bl.hit) {
        ctx.fillStyle = 'rgba(255,190,90,0.5)'; circle(q.x - q.vx * 0.04, q.y - q.vy * 0.04, bl.r * 0.55); ctx.fill();
        vdgDrawBlob(q.x, q.y, bl.r, t, bl.seed);
      }
    }
  }
}
function vdgDrawMid(st) {
  const ph = st.ph, t = G.clock, b = ph.b, c = st.cinder;
  // dizzy stars round his head
  if (c.pose === 'dizzy') {
    const P = vdCinderPts(c);
    for (let k = 0; k < 3; k++) { const a = t * 4 + k * 2.1; vdStar(P.head.x + Math.cos(a) * P.head.r * 1.1, P.top.y - 6 + Math.sin(a) * 7, 7, '#ffe08a'); }
  }
  vdgDrawGong(st);
  for (let k = 0; k < ph.rings.length; k++) vdgDrawRing(ph.rings[k], ph.mode === 'fly' && (b.used >> k) & 1, t);
  vdgDrawBlobs(st);
  if (ph.mode !== 'aim' || b.hidden) return;
  // the aim: a peek at the start of the flight (gold help: the whole arc for a second)
  const gp = G.players[ph.golfer], a = ph.aim * Math.PI / 180, v = (ph.charging ? ph.power : 0.55) * VDG.vmax;
  const vx = Math.cos(a) * v, vy = -Math.sin(a) * v, long = ph.help.dots, n = long ? 30 : 10, dt = long ? 0.034 : 0.035;
  for (let i = 1; i <= n; i++) {
    const tt = i * dt, px = b.x + vx * tt, py = b.y + vy * tt + 0.5 * VDG.g * tt * tt;
    if (py > H) break;
    ctx.globalAlpha = (ph.charging ? 1 : 0.6) * (1 - i / (n + 2));
    ctx.fillStyle = long ? '#fff3c4' : '#ffffff'; circle(px, py, 3.2); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (ph.charging) {
    const face = gp.face, mx = gp.x + PW / 2 - face * 26 - 6, my = gp.y - 30, mh = 60, f = ph.power;
    ctx.fillStyle = 'rgba(28,26,54,0.8)'; rr(mx - 3, my - 3, 18, mh + 6, 6); ctx.fill();
    ctx.fillStyle = f < 0.5 ? '#9fe07f' : f < 0.85 ? C.gold : '#ff6b6b'; rr(mx, my + mh * (1 - f), 12, mh * f, 4); ctx.fill();
  }
}
function vdgDrawClub(st) {
  const ph = st.ph, b = ph.b;
  if (ph.mode !== 'aim' && ph.mode !== 'fly') return;
  const gp = G.players[ph.golfer], face = gp.face;
  const hx = gp.x + PW / 2 + face * 4, hy = gp.y + PH * 0.35;
  const bx = ph.mode === 'fly' ? b.from.x : b.x, by = ph.mode === 'fly' ? b.from.y : b.y;
  const headX = bx - face * (VDG.r + 2), headY = by + VDG.r - 3;
  const len = Math.hypot(headX - hx, headY - hy), a0 = Math.atan2(headY - hy, headX - hx);
  let ang = a0;
  if (ph.mode === 'aim' && ph.charging) ang = a0 + face * (0.5 + ph.power * 2.7);
  else if (ph.mode === 'fly' && ph.swingT > 0) ang = a0 - face * (1 - ph.swingT / 0.35) * 2.4;
  else if (ph.mode === 'fly') ang = a0 - face * 2.4;
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
  ctx.strokeStyle = '#8d8aa6'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
  ctx.fillStyle = '#d9dbe8'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
  rr(len - 3, -2, 8, 9, 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function vdgDrawBall(st) {
  const ph = st.ph, b = ph.b, id = ph.ball, col = PCOL[id], dark = PDARK[id], r = VDG.r;
  if (b.hidden || ph.mode === 'done') return;
  const off = b.y < -r;   // above the screen: an arrow at the top edge shows where it is
  if (off) {
    const x = clamp(b.x, 16, W - 16), up = Math.min(1, -b.y / 400);
    ctx.fillStyle = col; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, 6); ctx.lineTo(x + 9, 22); ctx.lineTo(x - 9, 22); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; circle(x, 30, 5 - up * 2); ctx.fill();
    return;
  }
  ctx.save(); ctx.translate(b.x, b.y);
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
  const lx = sp > 30 ? (b.vx / sp) * 1.8 : vdgDir(ph) * 1.2, ly = sp > 30 ? (b.vy / sp) * 1.8 : 0;
  for (const ex of [-3.4, 3.4]) {
    ctx.fillStyle = C.ink; circle(ex + lx, -1.5 + ly, 1.9); ctx.fill();
    ctx.fillStyle = '#fff'; circle(ex + lx + 0.6, -2.1 + ly, 0.6); ctx.fill();
  }
  ctx.restore();
  // the boost bar over the ball in flight
  if (ph.mode === 'fly') {
    const bw = 30, bx = b.x - bw / 2, by = Math.max(4, b.y - r - 16);
    ctx.fillStyle = 'rgba(28,26,54,0.75)'; rr(bx - 2, by - 2, bw + 4, 9, 4.5); ctx.fill();
    if (b.fuel > 0) { ctx.fillStyle = b.boosting ? '#ffffff' : col; rr(bx, by, bw * b.fuel, 5, 2.5); ctx.fill(); }
  }
  // name tag during the room card, and "Ball!" with the role badges
  const card = G.introT > 0 && G.mode === 'play', badge = st.badgeT > 0 && !st.cut && G.introT <= 0;
  if (card || badge) {
    const cpu = vdgSolo() && vdgCpu(id), word = card ? (cpu ? NAMES[id] + ' · CPU' : NAMES[id]) : 'Ball!';
    const a = card ? clamp(G.introT / 0.5, 0, 1) : clamp(st.badgeT / 0.4, 0, 1), big = vdgBig(), fs = big ? 18 : 12;
    ctx.font = vdFont(fs);
    const hw = ctx.measureText(word).width / 2 + 9, y = b.y - r - (big ? 30 : 24);
    let x = b.x + vdgDir(ph) * 14;
    // keep clear of the golfer's own tag or "Golf!" badge (the golfer stands right behind the ball; on a phone the
    // bigger badges overlapped)
    const gp = G.players[ph.golfer];
    if (gp && gp.alive && gp.id !== id) {
      ctx.font = vdFont(big ? 20 : 12);
      const gHalf = ctx.measureText(card ? NAMES[gp.id] : 'Golf!').width / 2 + 9, gx = gp.x + gp.w / 2;
      ctx.font = vdFont(fs);
      x = vdgDir(ph) > 0 ? Math.max(x, gx + gHalf + hw + 4) : Math.min(x, gx - gHalf - hw - 4);
    }
    x = clamp(x, hw + 4, W - hw - 4);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = col; rr(x - hw, y - fs * 0.9, hw * 2, fs * 1.6, fs * 0.8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 4, y + fs * 0.7); ctx.lineTo(x + 4, y + fs * 0.7); ctx.lineTo(b.x, y + fs * 0.7 + 4); ctx.fill();
    text(word, x, y - 0.5, fs, '#fff', 'center', 'body');
    ctx.restore();
  }
}
function vdgDrawTop(st) { vdgDrawClub(st); vdgDrawBall(st); }

/* --- the HUD --- */
// what the player whose turn it is presses, on their own device
function vdgKeys(id, what) {
  const d = vdDev(id);
  if (what === 'aim') {
    if (d === 'pad') return 'stick aims, hold ' + glyph('a') + ', let go to swing';
    if (d === 'touch') return '◀ ▶ aim, hold ▲, let go to swing';
    return vdKey(id, 'move') + ' aim, hold ' + vdKey(id, 'jump') + ', let go to swing';
  }
  if (d === 'pad') return 'push the stick to steer, ' + glyph('act') + ' to zoom';
  if (d === 'touch') return 'hold ◀ ▶ ▲ ▼ to steer, the round button to zoom';
  return 'hold ' + (vdgSolo() || id === 0 ? 'W A S D' : 'the arrows') + ' to steer, ' + vdKey(id, 'act') + ' to zoom';
}
function vdgHud(st) {
  const ph = st.ph, big = vdgBig(), gn = NAMES[ph.golfer], bn = NAMES[ph.ball], Hd = vdgHole(st);
  if (G.mode === 'paused' && ph.charging) { ph.charging = false; ph.power = 0; }   // paused mid-charge: no swing on resume
  const cpu = id => vdgSolo() && vdgCpu(id);
  // who does what right now: one pill at the bottom
  let line = null, dot = C.paper;
  if (ph.mode === 'aim' && !ph.b.hidden) { line = cpu(ph.golfer) ? gn + ' is lining up the shot...' : gn + ', your shot: ' + vdgKeys(ph.golfer, 'aim'); dot = PCOL[ph.golfer]; }
  else if (ph.mode === 'fly' && ph.b.fuel > 0) { line = cpu(ph.ball) ? bn + ' is steering!' : bn + ', you\'re the ball: ' + vdgKeys(ph.ball, 'boost'); dot = PCOL[ph.ball]; }
  if (line && G.introT <= 0 && !st.idle && !st.cut) {
    const fs = big ? 19 : 13, h = big ? 36 : 26, y = H - h - (big ? 8 : 10);
    ctx.font = vdFont(fs);
    const w = Math.min(W - 20, ctx.measureText(line).width + 34);
    ctx.save(); if (G.players.some(p => p.alive && p.y + p.h > y - 4 && p.x + p.w > W / 2 - w / 2 && p.x < W / 2 + w / 2) || (!ph.b.hidden && ph.b.y > y - 12 && Math.abs(ph.b.x - W / 2) < w / 2 + 10)) ctx.globalAlpha = 0.45;
    ctx.fillStyle = 'rgba(40,18,32,0.86)'; rr(W / 2 - w / 2, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = dot; circle(W / 2 - w / 2 + 13, y + h / 2, big ? 5 : 4); ctx.fill();
    text(line, W / 2 + 6, y + h / 2 + 0.5, fs, C.paper, 'center', 'body');
    ctx.restore();
  }
  // a penalty word
  if (ph.msg) {
    const fs = big ? 32 : 24, w = big ? 400 : 300, h = big ? 64 : 50;
    ctx.save(); ctx.globalAlpha = clamp(ph.msg.t / 0.3, 0, 1);
    ctx.fillStyle = 'rgba(40,18,32,0.88)'; rr(W / 2 - w / 2, 150, w, h, 16); ctx.fill();
    text(ph.msg.text, W / 2, 150 + h / 2, fs, C.paper, 'center');
    ctx.restore();
  }
  // the hole's score card
  if (ph.mode === 'rung' && ph.mT > 0.5) {
    const s = ph.strokes[ph.hole], a = clamp((ph.mT - 0.5) / 0.25, 0, 1) * clamp((3.4 - ph.mT) / 0.3, 0, 1), k = big ? 1.35 : 1;
    const l2 = ph.picked[ph.hole] ? `Hole ${ph.hole + 1}: picked up at ${s} (par ${Hd.par})` : `Hole ${ph.hole + 1} in ${s} stroke${s === 1 ? '' : 's'} (par ${Hd.par})`;
    const l3 = ph.hole === 0 ? `Swap! ${bn} golfs next, ${gn} is the ball.` : 'Both holes done!';
    const w = 460 * k, h = 112 * k, y = 160;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(40,18,32,0.9)'; rr(W / 2 - w / 2, y, w, h, 18); ctx.fill();
    ctx.strokeStyle = 'rgba(255,138,61,0.8)'; ctx.lineWidth = 2; rr(W / 2 - w / 2, y, w, h, 18); ctx.stroke();
    text(ph.verdict, W / 2, y + 32 * k, 30 * k, ph.picked[ph.hole] ? C.paper : C.gold, 'center');
    text(l2, W / 2, y + 65 * k, 15 * k, C.paper, 'center', 'body');
    text(l3, W / 2, y + 90 * k, 14 * k, '#ffd9b0', 'center', 'body');
    ctx.restore();
  }
}

/* --- sounds --- */
Sfx.extra.vdgRing = function (p) { this.tone(260 * p, 0.28, 'sawtooth', 0.03, 980 * p); [988, 1319, 1760].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.04, null, 0.05 + i * 0.04)); };
Sfx.extra.vdgPuff = function () { this.tone(140, 0.5, 'sine', 0.03, 260); };
Sfx.extra.vdgSpit = function () { this.tone(520, 0.08, 'square', 0.03, 180); this.tone(120, 0.16, 'sine', 0.06, 70, 0.03); };
Sfx.extra.vdgBlorp = function () { this.tone(180, 0.22, 'sine', 0.08, 60); this.tone(620, 0.1, 'triangle', 0.035, 300, 0.02); };
Sfx.extra.vdgPlop = function () { this.tone(150, 0.14, 'sine', 0.035, 70); };
Sfx.extra.vdgSizzle = function () { this.tone(1200, 0.4, 'sawtooth', 0.018, 200); this.tone(260, 0.35, 'sine', 0.06, 80, 0.03); this.tone(90, 0.3, 'triangle', 0.05, 50, 0.08); };
Sfx.extra.vdgBoing = function () { this.tone(140, 0.32, 'sine', 0.09, 520); this.tone(700, 0.08, 'square', 0.025, 1100, 0.02); };
