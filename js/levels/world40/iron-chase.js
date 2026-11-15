/* Pip & Bo - Level 40-1 The Iron Colossus: Part 1 'chase' (Under the Feet). */
'use strict';

/* ===== 40-1 Part 1: Under the Feet (IRON_PHASES.chase) ===============================================================
   Run after a giant across Pyramid Sands. Its feet land ahead of you and behind you; at the end you grab the chain
   dragging from its heel and it tows you up to its ankle.
   THE STRIDE: one footfall every IRONCHASE.stride s (the music's bar). The landing spot's shadow grows for `tell` s with
   a small "thoo..." word, then the foot lands: THOOM. Under it when it lands: a Clang (squashed flat, popped back out).
   It stays planted for `plant` s (a wall nobody gets through), then lifts, raining sand and stones for a second
   (a stone on the head: a stumble). Every landing sends a GROUND WAVE both ways (420 px/s): on the ground when it
   reaches you, you are tossed back ("Whoa!", no Clang); jump just before it and you ride it: a WAVE HOP, a free leap.
   THE CAMERA follows the slower hero (at most the giant's pace, `v`); nobody is pushed by the screen edge. The landing
   spots follow a pattern on the screen, so standing still is never safe for long.
   THREE STRETCHES with a flag between (the stomps pause `flagPause` s at a flag; the flags are safe spots):
     1 Open dunes       shadows and wave hops; toppled obelisks lie as ramps (rivets over them).
     2 Trampled ruins   temple walls too high to jump: a BOOST then a HAND UP (the plan alternates who climbs first);
                        cracks open in the ground after each footfall (jump them); pillars lean (1 s) and topple.
                        The feet never land near a wall someone is climbing.
     3 The heel chain   the chain's ring drags on the sand ahead. One grabs it (action), the other must take their hand
                        (action next to them) inside `chain.wait` s or the first lets go. Then both are towed for
                        `tow.T` s: ▲ hops over rocks and cacti, ▼ ducks under bone arches; every footfall the chain
                        whips them up in an arc (▲ at the top of the arc: higher, for a rivet). Then it reels them up.
   FAILS. Clangs: under a landing foot, under a toppling pillar, down a crack, into a rock / cactus / arch on the tow.
   GOLD HELP after IRON.goldAfter Clangs in one stretch: the shadows show `goldTell` s ahead and the waves only toss 40 px.
   Rivets: 10 (3 over obelisks, 4 in the ruins, 3 at the tops of the chain's whips).
   Stats (st.stats.chase): hops, tossed, stomped.   Names: ironChase* / IRONCHASE*, sounds ironchase*. */
const IRONCHASE = {
  v: 100, lead: 170, rightPad: 34, leftPad: 6,
  stride: 3, tell: 1.7, goldTell: 2.2, plant: 1.0, lift: 0.55, rain: 1.0, flagPause: 2,
  foot: { s: 0.8, w: 594, h: 248 },
  wave: { v: 420, reach: 560, toss: 270, goldToss: 140, hopWin: 0.42, hopVx: 330, hopVy: 380 },
  // where each landing's heel falls, in screen x (the zone is foot.w wide): a pattern, so standing still never works
  pattern: [360, -260, 180, 420, -120, 260, -330, 400, 80, -200],
  far: [-500, 700],                     // the only landings allowed near a wall being climbed, or at the chain
  flags: [3300, 6500],
  obelisks: [[760, 0], [1480, 1], [2280, 0]],
  walls: [3900, 4800, 5700], wallW: IRON_ART.WALL_W, wallH: 150,
  cracks: [3560, 4180, 4600, 5080, 5500, 6020], crackW: 46,
  pillars: [4460, 5360, 6260], pillarLen: 200,
  ruins: [3300, 6500],
  chain: { x0: 6900, v: 70, wait: 6, grab: 38, hand: 46 },
  tow: { v: 300, T: 20, whipVy: 760, topVy: 380 },
  // the tow's obstacles: [kind, the time (s into the tow) it reaches the front hero]. Kept clear of each whip's arc
  // (a whip every stride, airborne about 0.8 s, 1.2 s with the high jump at the top)
  towStuff: [['rock', 1.6], ['cactus', 4.9], ['arch', 7.4], ['cactus', 10.4], ['cactus', 11.3], ['arch', 13.5], ['rock', 16.6], ['arch', 19.4]],
  rivets: [[860, 360], [1620, 330], [2420, 350], [3930, 270], [4820, 270], [5720, 270], [5250, 370]],
};
const ironChaseGY = () => IRON_ART.GROUND_Y;
const ironChaseStretch = (x) => (x < IRONCHASE.flags[0] ? 0 : x < IRONCHASE.flags[1] ? 1 : 2);

function ironChaseSetup(st, L) {
  const ph = st.ph, K = IRONCHASE, gy = ironChaseGY();
  ph.first = L.def.first || 0;
  ph.t = 0; ph.strideT = 1.6; ph.pat = 0; ph.feet = [{ id: 0, state: 'air', t: 0, x: 0 }, { id: 1, state: 'air', t: 0, x: 0 }]; ph.next = 0;
  ph.waves = []; ph.rain = []; ph.dust = []; ph.flagAt = -1; ph.pauseT = 0; ph.stretch = 0; ph.jumpAt = [-9, -9];
  ph.obelisks = K.obelisks.map(([x, k]) => ({ x, k }));
  ph.walls = K.walls.map((x, i) => ({ x, i, done: false, first: (ph.first + i) % 2 }));
  ph.cracks = K.cracks.map(x => ({ x, open: false, t: 0 }));
  ph.pillars = K.pillars.map(x => ({ x, state: 'up', t: 0 }));
  ph.chain = { x: K.chain.x0, state: 'drag', who: -1, t: 0, tries: 0 };
  ph.tow = null; ph.reel = null; ph.wordT = 0;
  ph.safeX = 120;
  ironChaseBuild(ph);
  const ps = G.players;
  ps.forEach((p, k) => Object.assign(p, { x: 110 + k * 46 - p.w / 2, y: gy - p.h, vx: 0, vy: 0, face: 1, grounded: true, alive: true }));
  st.cam = { x: 0, y: 0 };
  const R = K.rivets.slice();
  for (let i = 0; i < 3; i++) R.push([-9999, -9999]);   // (the three on the chain's whips are placed when the tow starts)
  ironRivetsSetup(st, R);
  const s = ironStats(st); Object.assign(s, { hops: s.hops || 0, tossed: s.tossed || 0, stomped: s.stomped || 0 });
  Object.assign(st.tick, { hidden: true });
  // the backdrop sheets, made during the part card a few at a time
  ph.prep = [];
  for (let l = 0; l < 4; l++) for (let c = 0; c < (l === 0 ? 2 : l === 1 ? 4 : 3); c++) ph.prep.push(() => IRON_ART.desert(l, c));
  ph.prep.push(() => IRON_ART.foot(), () => IRON_ART.shin(), () => IRON_ART.paving(0), () => IRON_ART.paving(1), () => IRON_ART.ring(), () => IRON_ART.pillar(), () => IRON_ART.boneArch());
  for (let k = 0; k < 2; k++) ph.prep.push(() => IRON_ART.obelisk(k), () => IRON_ART.rock(k), () => IRON_ART.cactus(k));
  for (let k = 0; k < 3; k++) ph.prep.push(() => IRON_ART.ruinWall(k));
  ph.prep.push(() => IRON_ART.rubble(0), () => IRON_ART.rubble(1));
}
// the static world: the ground (with the open cracks as gaps), walls, obelisk ramps, fallen pillars, planted feet
function ironChaseBuild(ph) {
  const K = IRONCHASE, gy = ironChaseGY(), S = [];
  const gaps = ph.cracks.filter(c => c.open).map(c => [c.x - K.crackW / 2, c.x + K.crackW / 2]).sort((a, b) => a[0] - b[0]);
  let x = -400;
  for (const [a, b] of gaps) { S.push({ x0: x, y0: gy, x1: a, y1: gy + 90, kind: 'ground' }); x = b; }
  S.push({ x0: x, y0: gy, x1: 40000, y1: gy + 90, kind: 'ground' });
  for (const w of ph.walls) {
    S.push({ x0: w.x, y0: gy - K.wallH, x1: w.x + K.wallW, y1: gy, kind: 'wall', wall: w });
    S.push({ x0: w.x + K.wallW, y0: gy - IRON_ART.RUBBLE.h, x1: w.x + K.wallW + IRON_ART.RUBBLE.w, y1: gy, kind: 'rubble' });
  }
  for (const o of ph.obelisks) { const [a, b] = IRON_ART.OBELISK.ramp; S.push({ slope: true, x0: o.x + a[0], x1: o.x + b[0], ya: gy - 100 + a[1], yb: gy - 100 + b[1], kind: 'obelisk', one: true }); }
  for (const pl of ph.pillars) if (pl.state === 'down') S.push({ x0: pl.x - K.pillarLen, y0: gy - 30, x1: pl.x - 6, y1: gy, kind: 'pillar' });
  for (const f of ph.feet) if (f.state === 'planted') S.push({ x0: f.x, y0: gy - K.foot.h, x1: f.x + K.foot.w, y1: gy, kind: 'foot' });
  ph.solids = S;
}
const ironChaseTell = st => (ironHasGold(st, 'stretch' + st.ph.stretch) ? IRONCHASE.goldTell : IRONCHASE.tell);
// a landing zone [x0, x1] (world) clashes with a wall someone has yet to climb, or with the chain set piece
function ironChaseCalm(ph, x0, x1) {
  const K = IRONCHASE;
  for (const w of ph.walls) if (!w.done && x1 > w.x - 600 && x0 < w.x + K.wallW + 200) return true;
  // at the chain: no landing near the ring, and none at all once someone holds it
  if (ph.stretch === 2) return ph.chain.state !== 'drag' || (x1 > ph.chain.x - 260 && x0 < ph.chain.x + 140);
  return false;
}
// a fair landing: every hero can run out of the zone (to a side on screen) in the tell, after a person's reaction time
function ironChaseFair(st, x, tell) {
  const K = IRONCHASE, a = st.cam.x + K.leftPad + PW / 2 + 2, b = st.cam.x + W - K.rightPad - PW / 2 - 2, gy = ironChaseGY();
  const L = x - 8, R = x + K.foot.w + 8, run = PHYS.maxRun * Math.max(0.2, tell - 0.5);
  return G.players.every(p => {
    if (!p.alive) return true;
    const cx = p.x + p.w / 2;
    if (cx < L || cx > R) return true;
    if (p.y + p.h <= gy - K.foot.h) return true;
    return (L >= a && cx - L < run) || (R <= b && R - cx < run);
  });
}
function ironChaseStomp(st) {
  const ph = st.ph, K = IRONCHASE, f = ph.feet[ph.next];
  if (f.state !== 'air') return;
  const tell = ironChaseTell(st);
  let L = K.pattern[ph.pat % K.pattern.length]; ph.pat++;
  let x = null;
  for (let k = 0; k <= 16 && x == null; k++) {
    const d = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 60, c = st.cam.x + L + d;
    if (!ironChaseCalm(ph, c, c + K.foot.w) && ironChaseFair(st, c, tell)) x = c;
  }
  if (x == null) {
    const alt = K.far.map(l => st.cam.x + l).find(a => !ironChaseCalm(ph, a, a + K.foot.w) && ironChaseFair(st, a, tell));
    if (alt == null) return;
    x = alt;
  }
  ph.next = 1 - ph.next;
  Object.assign(f, { state: 'tell', t: 0, x, tell });
  Sfx.play('ironStompTell');
  ironWord(st, 'thoo...', x + K.foot.w / 2, ironChaseGY() + 46, 16, { life: f.tell, grow: 1.1, fill: SKETCH.PAL.ochre, key: 'thoo' + f.id, rot: -0.04 });
}
function ironChaseLand(st, f) {
  const ph = st.ph, K = IRONCHASE, gy = ironChaseGY();
  f.state = 'planted'; f.t = 0;
  Sfx.play('ironStomp'); rumble(0, 0.9, 0.6, 300); rumble(1, 0.9, 0.6, 300);
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.32);
  ironWord(st, 'THOOM!', f.x + K.foot.w / 2, gy - K.foot.h - 30, 46, { life: 1.0, grow: 0.25, rise: 10 });
  let near = false;
  for (const p of G.players) {
    if (!p.alive) continue;
    const cx = p.x + p.w / 2;
    if (cx > f.x - 4 && cx < f.x + K.foot.w + 4 && p.y + p.h > gy - K.foot.h) {
      // out the nearer side that is on screen
      const L = f.x - 40, R = f.x + K.foot.w + 40;
      const tx = (cx - f.x < f.x + K.foot.w - cx && L > st.cam.x + 20) || R > st.cam.x + W - 20 ? Math.max(st.cam.x + 24, L) : R;
      if (ironClang(st, p, { to: { x: tx, y: gy }, kind: 'stomp', word: 'CLANG!' })) { ironStats(st).stomped++; if (ironMiss(st, 'stretch' + ph.stretch) >= IRON.goldAfter) ironChaseGold(st); }
    }
    if (cx > f.x - 140 && cx < f.x + K.foot.w + 140) near = true;
  }
  if (near) ironImpact(st, 'THOOM');
  (ph.birds || (ph.birds = [])).push({ x: f.x + K.foot.w * (0.3 + ironRand() * 0.4), y: 170 + ironRand() * 60, t: 0, n: 5 + Math.floor(ironRand() * 6), seed: 30 + Math.floor(ironRand() * 50) });
  if (ph.birds.length > 3) ph.birds.shift();
  // waves out both ways, dust at both ends
  ph.waves.push({ x: f.x - 6, dir: -1, t: 0, hit: [false, false] }, { x: f.x + K.foot.w + 6, dir: 1, t: 0, hit: [false, false] });
  Sfx.play('ironchaseWaveRumble');
  // the downdraft: sand blown out in rolling billows from under the heel and the toes
  ph.dust.push({ x: f.x - 10, y: gy - 14, t: 0, dir: -1, r: 22 }, { x: f.x + 30, y: gy - 6, t: 0, dir: -1, r: 13 }, { x: f.x + K.foot.w + 10, y: gy - 16, t: 0, dir: 1, r: 26 }, { x: f.x + K.foot.w - 40, y: gy - 6, t: 0, dir: 1, r: 15 });
  // cracks open in the ruins after a footfall
  if (ph.stretch === 1) for (const c of ph.cracks) {
    if (c.open || c.x < st.cam.x + 90 || c.x > st.cam.x + W - 60) continue;
    if (G.players.some(p => Math.abs(p.x + p.w / 2 - c.x) < 54)) continue;
    if (ph.walls.some(w => !w.done && w.x - c.x > -40 && w.x - c.x < 320)) continue;   // never in the way of a wall climb
    c.open = true; c.t = 0; Sfx.play('ironchaseCrackOpen'); ironWord(st, 'KRAK!', c.x, gy - 30, 20, { life: 0.8 });
  }
  // the chain whips on the tow
  ironChaseBuild(ph);
}
function ironChaseGold(st) {
  ironGoldOnce(st, 'stretch' + st.ph.stretch, 'Gold help! The shadows show earlier and the waves are gentler.');
}
function ironChaseStep(st, dt) {
  const ph = st.ph, K = IRONCHASE, gy = ironChaseGY(), ps = G.players;
  ph.t += dt;
  if (ph.reel) { ironChaseReelStep(st, dt); return; }
  if (ph.tow) { ironChaseTowStep(st, dt); return; }
  if (st.idle) { ironCoast(st, dt, ph.solids); return; }
  // which stretch: the slower hero's
  const rear = Math.min(ps[0].x, ps[1].x) + PW / 2;
  ph.stretch = Math.max(ph.stretch, ironChaseStretch(rear));
  // flags: both past one -> a safe spot, and the stomps pause
  for (let i = 0; i < K.flags.length; i++) if (ph.flagAt < i && ps.every(p => p.x + p.w / 2 > K.flags[i])) {
    ph.flagAt = i; ph.pauseT = K.flagPause; ph.safeX = K.flags[i] + 30; Sfx.play('flag'); ironNews(st, i === 0 ? 'Flag! The trampled ruins are next.' : 'Flag! There is its heel chain. Grab it!');
  }
  if (ph.pauseT > 0) ph.pauseT -= dt;
  // the stride
  if ((ph.strideT -= dt) <= 0) { ph.strideT += K.stride; if (ph.pauseT <= 0) ironChaseStomp(st); }
  for (const f of ph.feet) {
    f.t += dt;
    if (f.state === 'tell' && f.t >= f.tell) ironChaseLand(st, f);
    else if (f.state === 'planted' && f.t >= K.plant) { f.state = 'lift'; f.t = 0; ironChaseBuild(ph); ironChaseRain(st, f); }
    else if (f.state === 'lift' && f.t >= K.lift) { f.state = 'air'; f.t = 0; }
  }
  // the heroes
  ironHandUp(st, dt, { edge: 70 });
  for (const p of ps) {
    if (st.haul && st.haul.who === p.id) continue;
    const was = p.grounded;
    ironBody(p, dt, ph.solids, { partner: true, ctl: ph.chain.who === p.id ? ironChaseHeld : null });
    if (was && !p.grounded && p.vy < -300) ph.jumpAt[p.id] = ph.t;
    // the screen edges (the camera never pushes; it waits for the slower hero)
    if (p.x < st.cam.x + K.leftPad) { p.x = st.cam.x + K.leftPad; p.vx = Math.max(0, p.vx); }
    if (p.x + p.w > st.cam.x + W - K.rightPad) { p.x = st.cam.x + W - K.rightPad - p.w; p.vx = Math.min(0, p.vx); }
    // down a crack
    if (p.y + p.h > gy + 40 && p.alive) {
      const c = ph.cracks.find(q => q.open && Math.abs(q.x - (p.x + p.w / 2)) < 60);
      if (ironClang(st, p, { to: { x: (c ? c.x : p.x) - 70, y: gy }, kind: 'crack', word: 'CLANG!' }) && ironMiss(st, 'stretch' + ph.stretch) >= IRON.goldAfter) ironChaseGold(st);
      else if (p.y > gy + 200) { p.x = (c ? c.x : p.x) - 70; p.y = gy - p.h; p.vy = 0; }
    }
  }
  ironChaseWaves(st, dt);
  ironChaseRainStep(st, dt);
  ironChasePillars(st, dt);
  for (const w of ph.walls) if (!w.done && ps.every(p => p.x > w.x + K.wallW - 4 || (p.x + p.w / 2 > w.x && p.y + p.h <= gy - K.wallH + 2))) {
    if (ps.every(p => p.x + p.w / 2 > w.x)) { w.done = true; ironCelebrate(st, 0.6); if (ph.walls.filter(q => q.done).length < ph.walls.length) ironSwap(st); }
  }
  for (const c of ph.cracks) c.t += dt;
  if (ph.birds) for (const b of ph.birds) b.t += dt;
  for (const d of ph.dust) d.t += dt;
  if (ph.dust.length && ph.dust[0].t > 1.2) ph.dust = ph.dust.filter(d => d.t <= 1.2);
  // the camera: at most the giant's pace, never past the slower hero
  const want = Math.min(ps[0].x, ps[1].x) - K.lead;
  st.cam.x = Math.max(st.cam.x, Math.min(st.cam.x + K.v * dt, want));
  // the chain
  ironChaseChain(st, dt);
  ironRivetsStep(st, dt);
  ironChaseHints(st);
}
// a hero holding the chain's ring: dragged along, skiing; ▲ hops
function ironChaseHeld(p, dt) {
  const ph = G.mst.ph;
  const real = p.input;
  p.input = Object.assign({}, real, { left: false, right: false });
  try { control(p, dt); } finally { p.input = real; }
  p.vx = (ph.chain.x - 12 - (p.x + p.w / 2)) / Math.max(dt, 0.02) * 0.5;
}
function ironChaseWaves(st, dt) {
  const ph = st.ph, K = IRONCHASE, gy = ironChaseGY();
  for (const w of ph.waves) {
    if (w.dead) continue;
    const x0 = w.x; w.x += w.dir * K.wave.v * dt; w.t += dt;
    // a wave runs out after `reach` px, and a temple wall stops it (so a Boost at a wall is never shaken apart)
    if (w.t * K.wave.v > K.wave.reach || ph.walls.some(q => (x0 - q.x - K.wallW / 2) * (w.x - q.x - K.wallW / 2) <= 0)) { w.dead = true; continue; }
    for (const p of G.players) {
      if (!p.alive || w.hit[p.id] || ph.chain.who === p.id) continue;
      const cx = p.x + p.w / 2;
      if ((x0 - cx) * (w.x - cx) > 0) continue;
      w.hit[p.id] = true;
      if (st.haul && st.haul.who === p.id) continue;
      if (!p.grounded && p.y + p.h > gy - 70) {
        if (ph.t - ph.jumpAt[p.id] < K.wave.hopWin + 0.25) {
          // a WAVE HOP: a free forward leap
          p.vy = Math.min(p.vy, -K.wave.hopVy); p.vx = w.dir * K.wave.hopVx; p.carryVx = w.dir * K.wave.hopVx;
          ironStats(st).hops++; Sfx.play('ironchaseWaveHop', p.id); ironPop(st, cx, p.y - 8, 'WAVE HOP!', { size: 13, fill: SKETCH.PAL.core });
        }
      } else if (p.grounded && p.y + p.h >= gy - 2 && !(p.ground && p.ground.kind === 'wall')) {
        const toss = ironHasGold(st, 'stretch' + ph.stretch) ? K.wave.goldToss : K.wave.toss;
        knock(p, w.dir * toss, -230, 0.25, 0.3);
        ironStats(st).tossed++; IRON_OUTFIT.dusty[p.id] = 3; ironPop(st, cx, p.y - 8, 'WHOA!', { size: 13 });
      }
    }
  }
  if (ph.waves.some(w => w.dead || w.t > 3)) ph.waves = ph.waves.filter(w => !w.dead && w.t <= 3);
}
// sand and stones falling off a lifted sole for IRONCHASE.rain s
function ironChaseRain(st, f) {
  const ph = st.ph, K = IRONCHASE;
  for (let i = 0; i < 26; i++) ph.rain.push({ x: f.x + 20 + ironRand() * (K.foot.w - 40), y: ironChaseGY() - K.foot.h * 0.2 - ironRand() * 40, vy: 40 + ironRand() * 120, big: ironRand() < 0.22, delay: ironRand() * K.rain, t: 0 });
  Sfx.play('ironchaseSandRain');
}
function ironChaseRainStep(st, dt) {
  const ph = st.ph, gy = ironChaseGY();
  for (const r of ph.rain) {
    r.t += dt; if (r.t < r.delay) continue;
    r.vy += 900 * dt; r.y += r.vy * dt;
    if (r.big && !r.done) for (const p of G.players) {
      if (!p.alive || st.safe[p.id] > 0) continue;
      if (Math.abs(p.x + p.w / 2 - r.x) < 13 && r.y > p.y && r.y < p.y + 12) { r.done = true; p.stun = Math.max(p.stun, 0.3); p.vx *= 0.3; ironPop(st, r.x, p.y - 6, 'BONK', { size: 11 }); Sfx.play('bonk'); }
    }
  }
  if (ph.rain.length && ph.rain.some(r => r.y > gy + 10)) ph.rain = ph.rain.filter(r => r.y <= gy + 10 && !r.done);
}
function ironChasePillars(st, dt) {
  const ph = st.ph, K = IRONCHASE, gy = ironChaseGY();
  for (const pl of ph.pillars) {
    pl.t += dt;
    const near = G.players.some(p => p.alive && pl.x - (p.x + p.w / 2) < 300 && pl.x - (p.x + p.w / 2) > 60);
    if (pl.state === 'up' && near) { pl.state = 'lean'; pl.t = 0; Sfx.play('ironchasePillarLean'); ironWord(st, 'CREEAK', pl.x - 40, gy - 200, 15, { life: 1.0 }); }
    else if (pl.state === 'lean' && pl.t >= 1) { pl.state = 'fall'; pl.t = 0; }
    else if (pl.state === 'fall' && pl.t >= 0.35) {
      pl.state = 'down'; pl.t = 0;
      Sfx.play('ironchasePillarCrash'); if (!reduceMotion) G.shake = Math.max(G.shake, 0.2);
      ironWord(st, 'KRUMP!', pl.x - K.pillarLen / 2, gy - 60, 26, { life: 0.9 });
      ph.dust.push({ x: pl.x - K.pillarLen + 20, y: gy - 10, t: 0, dir: -1 });
      for (const p of G.players) {
        const cx = p.x + p.w / 2;
        if (p.alive && cx > pl.x - K.pillarLen - 4 && cx < pl.x && p.y + p.h > gy - 40) {
          if (ironClang(st, p, { to: { x: pl.x - K.pillarLen - 50, y: gy }, kind: 'pillar' }) && ironMiss(st, 'stretch1') >= IRON.goldAfter) ironChaseGold(st);
        }
      }
      ironChaseBuild(ph);
    }
  }
}
/* --- stretch 3: the heel chain --- */
function ironChaseChain(st, dt) {
  const ph = st.ph, K = IRONCHASE, c = ph.chain, ps = G.players, gy = ironChaseGY();
  if (ph.stretch < 2) { c.x = Math.max(c.x, st.cam.x + W + 200); return; }
  c.t += dt;
  if (c.state === 'drag') {
    c.x += K.chain.v * dt;
    c.x = Math.max(c.x, st.cam.x + 260);
    if (c.x > st.cam.x + W - 60) c.x = st.cam.x + W - 60;
    for (const p of ps) {
      if (!p.alive || !(p.input.act || p.pendingAct)) continue;
      if (Math.abs(p.x + p.w / 2 - c.x) < K.chain.grab && p.y + p.h > gy - 40) {
        c.state = 'one'; c.who = p.id; c.t = 0; c.tries++;
        Sfx.play('ironchaseChainGrab'); ironPop(st, c.x, gy - 50, 'GOT IT!', { size: 14 });
        ironHint(st, 1 - p.id, 'Take ' + NAMES[p.id] + '\'s hand! (' + ironKey(1 - p.id, 'act') + ')', { life: 4, cpu: '' });
        break;
      }
    }
  } else if (c.state === 'one') {
    c.x += K.chain.v * 1.4 * dt;
    const a = ps[c.who], b = ps[1 - c.who];
    if (c.x > st.cam.x + W - 60) c.x = st.cam.x + W - 60;
    if (b.alive && (b.input.act || b.pendingAct) && Math.abs(b.x - a.x) < K.chain.hand && Math.abs(b.y - a.y) < 40) {
      Sfx.play('ironchaseHandClasp'); ironPop(st, (a.x + b.x) / 2 + PW / 2, a.y - 14, 'HOLD ON!', { size: 15 });
      ironChaseTowStart(st);
      return;
    }
    if (c.t > K.chain.wait) {
      c.state = 'drag'; c.who = -1; c.t = 0; c.x += 120;
      ironNews(st, 'Lost it! Grab the ring again, then take each other\'s hand.');
      Sfx.play('ironchaseChainDrag');
    }
  }
}
function ironChaseTowStart(st) {
  const ph = st.ph, K = IRONCHASE, gy = ironChaseGY(), c = ph.chain;
  ph.towLead = c.who >= 0 ? c.who : 0;
  c.state = 'tow'; c.who = -1;
  ph.tow = { t: 0, x0: c.x, whipT: K.stride, whips: 0, stuff: K.towStuff.map(([kind, t], i) => ({ kind, x: c.x - 30 + K.tow.v * t, i, hit: [false, false] })) };
  // the three whip rivets: at the top of each of the first three whips (a hero is at ring - 30 / - 64)
  const R = ph.rivets.filter(r => r.x < -9000);
  for (let i = 0; i < R.length; i++) {
    const tw = K.stride * (i + 1) + 0.42, x = c.x + K.tow.v * tw - 46;
    R[i].x = x; R[i].y = gy - 168;
  }
  Sfx.play('ironchaseChainReel'); ironNews(st, 'Towed! ▲ hop the rocks, ▼ duck the bones. Jump at the top of each whip!');
  ironShowBadges(st);
}
function ironChaseTowStep(st, dt) {
  const ph = st.ph, K = IRONCHASE, gy = ironChaseGY(), tw = ph.tow, c = ph.chain, ps = G.players;
  tw.t += dt;
  c.x += K.tow.v * dt;
  st.cam.x = c.x - 360;
  ph.strideT -= dt;
  // the whip: every stride (the obstacles are placed clear of the arcs)
  if ((tw.whipT -= dt) <= 0) {
    tw.whipT += K.stride;
    tw.whips++; { Sfx.play('ironchaseChainWhip'); ironWord(st, 'WHIP!', c.x + 40, gy - 120, 22, { life: 0.8 }); for (const p of ps) { p.vy = -K.tow.whipVy; p.grounded = false; p.whipTop = false; } }
  }
  ps.forEach((p, k) => {
    const lead = k === ph.towLead ? 0 : 1;
    const want = c.x - 30 - lead * 34;
    // ▲ hops (and once, at the top of a whip, a higher lift), ▼ ducks
    const inp = st.idle ? NO_INPUT : p.input;
    if (p.grounded && (p.pendingJump || inp.jump)) { p.vy = -560; p.grounded = false; p.pendingJump = false; Sfx.play('jump', p.id); }
    if (!p.grounded && !p.whipTop && Math.abs(p.vy) < 170 && (p.pendingJump || inp.jump) && p.y + p.h < gy - 90) { p.vy -= K.tow.topVy; p.whipTop = true; p.pendingJump = false; ironPop(st, p.x + p.w / 2, p.y - 6, 'UP!', { size: 12 }); }
    p.pendingJump = false;
    p.vy = Math.min(p.vy + PHYS.g * dt, PHYS.maxFall);
    p.y += p.vy * dt;
    if (p.y + p.h >= gy) { if (!p.grounded && p.vy > 200) { p.sx = 1.2; p.sy = 0.8; } p.y = gy - p.h; p.vy = 0; p.grounded = true; }
    p.x = want - p.w / 2; p.vx = K.tow.v; p.face = 1;
    p.crouch = p.grounded && !!inp.down;
    p.ground = null;
  });
  // the obstacles
  for (const s of tw.stuff) for (const p of ps) {
    if (s.hit[p.id]) continue;
    const cx = p.x + p.w / 2, feet = p.y + p.h, top = p.crouch ? feet - 13 : p.y;
    const half = s.kind === 'arch' ? 70 : s.kind === 'cactus' ? 12 : 22;
    if (cx < s.x - half || cx > s.x + half) continue;
    let hit = false;
    if (s.kind === 'rock') hit = feet > gy - 32;
    else if (s.kind === 'cactus') hit = feet > gy - 56;
    else hit = top < gy - 20 && feet > gy - 108;
    if (hit) { s.hit[p.id] = true; if (ironClang(st, p, { still: true, kind: 'tow', word: s.kind === 'arch' ? 'BONK!' : 'OUCH!' }) && ironMiss(st, 'stretch2') >= IRON.goldAfter) ironGoldOnce(st, 'stretch2', 'Gold help! The rocks and bones are marked in gold.'); }
    else if (cx > s.x + half - 6) s.hit[p.id] = true;
  }
  ironRivetsStep(st, dt);
  if (tw.t >= K.tow.T) { ph.reel = { t: 0 }; ph.tow = null; Sfx.play('ironchaseChainReel'); ironNews(st, 'The chain reels you up to its ankle!'); }
}
function ironChaseReelStep(st, dt) {
  const ph = st.ph, r = ph.reel, c = ph.chain;
  r.t += dt;
  c.x += 120 * dt; st.cam.x = c.x - 360;
  G.players.forEach((p, k) => { p.vy = 0; p.y -= (60 + r.t * 260) * dt; p.x = c.x - 30 - k * 34 - p.w / 2; p.grounded = false; });
  if (r.t > 1.6 && !st.cut) ironPhaseDone(st, { say: 'Up to its ankle. Now climb!' });
}
// the plan: what each hero should be doing (the hints, the badges and the brain read it)
function ironChasePlan(st) {
  const ph = st.ph, K = IRONCHASE, ps = G.players, gy = ironChaseGY(), out = [{}, {}];
  if (ph.tow || ph.reel) return [{ why: 'tow' }, { why: 'tow' }];
  // a wall ahead that both have yet to climb
  const w = ph.walls.find(q => !q.done && ps.some(p => p.x + p.w / 2 < q.x + K.wallW));
  if (w && ps.every(p => w.x - (p.x + p.w / 2) < 380)) {
    const climb = w.first, step = 1 - climb, cp = ps[climb], sp = ps[step];
    const cOn = cp.x + cp.w / 2 > w.x - 2 && cp.y + cp.h <= gy - K.wallH + 2, sOn = sp.x + sp.w / 2 > w.x - 2 && sp.y + sp.h <= gy - K.wallH + 2;
    const past = q => q.x + q.w / 2 > w.x + K.wallW && q.y + q.h > gy - K.wallH + 2;
    if (!cOn && !sOn && (past(cp) || past(sp)) && !(past(cp) && past(sp))) {
      const a = past(cp) ? climb : step, b = 1 - a;
      out[a] = { why: 'back', x: w.x + 30, say: 'Back up the rubble onto the wall, then pull ' + NAMES[b] + ' up!' };
      out[b] = { why: 'wait', x: w.x - 14, say: 'Wait by the wall for a hand up.' };
      out.wall = w;
      return out;
    }
    if (!cOn && !sOn) {
      out[step] = { why: 'step', x: w.x - 20, hold: 'down', say: 'Crouch by the wall: be a step!' };
      out[climb] = { why: 'boost', x: w.x - 20, say: 'Jump off ' + NAMES[step] + '\'s head, onto the wall!' };
    } else if (cOn && !sOn) {
      out[climb] = { why: 'hand', x: w.x + 10, hold: 'act', say: 'Hold ' + ironKey(climb, 'act') + ' at the edge: pull ' + NAMES[step] + ' up!' };
      out[step] = { why: 'wait', x: w.x - 14, say: 'Wait by the wall for a hand up.' };
    } else if (sOn && !cOn) {
      out[step] = { why: 'hand', x: w.x + 10, hold: 'act', say: 'Pull ' + NAMES[climb] + ' up!' };
      out[climb] = { why: 'wait', x: w.x - 14 };
    } else { out[climb] = { why: 'run', x: w.x + 200 }; out[step] = { why: 'run', x: w.x + 200 }; }
    out.wall = w;
    return out;
  }
  if (ph.stretch === 2 && ph.chain.state !== 'tow') {
    const c = ph.chain;
    if (c.state === 'one') { const a = c.who, b = 1 - a; out[a] = { why: 'held' }; out[b] = { why: 'handchain', x: ps[a].x + PW / 2, hold: 'act' }; return out; }
    const d0 = Math.abs(ps[0].x - c.x), d1 = Math.abs(ps[1].x - c.x), g = d0 <= d1 ? 0 : 1;
    out[g] = { why: 'grab', x: c.x, say: 'Grab the ring! (' + ironKey(g, 'act') + ')' }; out[1 - g] = { why: 'follow', x: c.x - 50 };
    return out;
  }
  return [{ why: 'run' }, { why: 'run' }];
}
function ironChaseHints(st) {
  const ph = st.ph, P = ironChasePlan(st);
  for (const id of [0, 1]) {
    const s = P[id] && P[id].say;
    if (s && ph['said' + id] !== s) { ph['said' + id] = s; ironHint(st, id, s, { life: 3.4, cpu: '' }); }
    if (!s) ph['said' + id] = null;
  }
}

/* --- drawing --- */
function ironChaseDrawBack(st) {
  const ph = st.ph, K = IRONCHASE, gy = ironChaseGY(), cx = st.cam.x, tow = !!(ph.tow || ph.reel);
  // the page and the four layers (screen coords for the parallax ones)
  ironScreen(st, () => {
    SKETCH.paper(ctx, 'sand');
    const par = [0.08, 0.25, 0.55];
    for (let l = 0; l < 3; l++) {
      const off = cx * par[l], n = l === 0 ? 2 : l === 1 ? 4 : 3, c0 = Math.floor(off / 960);
      for (let c = c0; c <= c0 + 1; c++) SKETCH.blit(ctx, IRON_ART.desert(l, ((c % n) + n) % n), c * 960 - off, 0);
      // aerial perspective: a warm haze over the far layers (soft top and bottom, never a band with an edge)
      if (l === 1) { const hz = ctx.createLinearGradient(0, 120, 0, 340); hz.addColorStop(0, 'rgba(244,227,194,0)'); hz.addColorStop(0.45, 'rgba(244,227,194,0.24)'); hz.addColorStop(0.8, 'rgba(244,227,194,0.2)'); hz.addColorStop(1, 'rgba(244,227,194,0)'); ctx.save(); ctx.fillStyle = hz; ctx.fillRect(0, 120, W, 220); ctx.restore(); }
    }
    SKETCH.glow(ctx, 168 - cx * 0.08, 172, 560, '255,206,128', 0.32);
    SKETCH.glow(ctx, 168 - cx * 0.08, 172, 150, '255,236,190', 0.5);
  });
  // the near ground (world coords), the temple paving through the ruins
  const c0 = Math.floor(cx / 960);
  for (let c = c0; c <= c0 + 1; c++) {
    SKETCH.blit(ctx, IRON_ART.desert(3, ((c % 3) + 3) % 3), c * 960, 0);
    const x0 = c * 960;
    if (x0 + 960 > K.ruins[0] && x0 < K.ruins[1]) { ctx.save(); ctx.beginPath(); ctx.rect(Math.max(x0, K.ruins[0]), gy - 4, Math.min(x0 + 960, K.ruins[1]) - Math.max(x0, K.ruins[0]), 90); ctx.clip(); SKETCH.blit(ctx, IRON_ART.paving(c % 2), x0, gy); ctx.restore(); }
  }
  const d = SKETCH.live(ctx, 4040, SKETCH.boil());
  // open cracks: a gash torn in the floor, seen from a little above: the back lip on the walking line, the front lip
  // nearer us, the far wall inside catching the light, cracks running out across the sand
  for (const c of ph.cracks) if (c.open) {
    const k = Math.min(1, c.t / 0.25), w = K.crackW / 2 * k, x = c.x, R = SKETCH.rng(c.x | 0);
    const hole = [];
    for (let i = 0; i < 14; i++) { const a = Math.PI + i / 14 * Math.PI * 2, j = 0.78 + R() * 0.3; hole.push([x + Math.cos(a) * w * j, gy + 13 + Math.sin(a) * 13 * k * j]); }
    d.wash(hole, '#2e2219', { alpha: 0.97, off: 0, force: true });
    d.spot(hole, { spread: 0.15, force: true });
    // the far wall: a lit band just under the back lip, hatched down its face
    const back = hole.slice(0, 8), wall = back.concat(back.slice().reverse().map(([px, py]) => [px, py + 7 * k]));
    d.wash(wall, IRON_P.ochreDeep, { alpha: 0.9, off: 0.3, force: true });
    for (let i = 1; i < back.length - 1; i++) d.stroke([[back[i][0], back[i][1] + 1], [back[i][0] + 0.5, back[i][1] + 6 * k]], { w: 0.6, sh: 0, alpha: 0.75 });
    d.stroke(hole.slice(0, 8), { w: 1.4, sh: 0.2 }); d.stroke(hole.slice(7).concat([hole[0]]), { w: 2.4, sh: 0.5 });
    // cracks running out over the sand, and broken crust heaped on the lips
    for (const [dx, dy] of [[-1, -0.1], [1, 0.05], [-0.7, 0.9], [0.8, 0.8]]) { const x0 = x + dx * w * 0.9, y0 = gy + 13 + dy * 12 * k; d.stroke([[x0, y0], [x0 + dx * 10 * k, y0 + dy * 5], [x0 + dx * 18 * k, y0 + dy * 6 + 2]], { w: 0.8, sh: 0, alpha: 0.8 }); }
    for (const sx of [-1, 1]) d.shape([[x + sx * (w - 2), gy + 2], [x + sx * (w + 5), gy - 4], [x + sx * (w + 14), gy - 1], [x + sx * (w + 18), gy + 3]], { fill: IRON_P.sand, w: 1.2, corner: 30 });
  }
  // pillars standing or leaning (behind the path), obelisks, walls
  for (const pl of ph.pillars) if (pl.state === 'up' || pl.state === 'lean' || pl.state === 'fall') {
    const rot = pl.state === 'up' ? 0 : pl.state === 'lean' ? -0.05 - Math.sin(pl.t * 18) * 0.03 * pl.t : -0.08 - (Math.PI / 2 - 0.08) * Math.pow(pl.t / 0.35, 2);
    SKETCH.blit(ctx, IRON_ART.pillar(), pl.x, gy, { rot });
  }
  for (const o of ph.obelisks) SKETCH.blit(ctx, IRON_ART.obelisk(o.k), o.x, gy);
  for (const w of ph.walls) { SKETCH.blit(ctx, IRON_ART.rubble(w.i % 2), w.x + K.wallW, gy); SKETCH.blit(ctx, IRON_ART.ruinWall(w.i % 3), w.x + K.wallW / 2, gy); }
  for (const pl of ph.pillars) if (pl.state === 'down') SKETCH.blit(ctx, IRON_ART.pillar(), pl.x - 4, gy - 2, { rot: -Math.PI / 2 });
  // flags
  K.flags.forEach((fx, i) => ironDrawFlag(fx, gy, ph.flagAt >= i));
  if (tow) ironChaseDrawTowStuff(st, d);
  // the feet: shadows first, then the feet and shins
  for (const f of ph.feet) ironChaseDrawShadow(st, f, d);
  // the chain (behind the heroes) from the right foot's heel
  ironChaseDrawChain(st, d);
  for (const f of ph.feet) ironChaseDrawFoot(st, f, d);
}
function ironChaseDrawShadow(st, f, d) {
  const K = IRONCHASE, gy = ironChaseGY();
  let k = 0;
  if (f.state === 'tell') k = Math.min(1, f.t / f.tell);
  else if (f.state === 'planted') k = 1;
  else if (f.state === 'lift') k = 1 - Math.min(1, f.t / K.lift);
  if (k <= 0) return;
  const L = f.x, R = f.x + K.foot.w, mid = (L + R) / 2, hw = (R - L) / 2 * (0.55 + 0.45 * k);
  const sh = SKETCH.ell(mid, gy + 4, hw, 6 + k * 7, 40);
  ctx.save(); ctx.globalAlpha = 0.35 + 0.55 * k;
  d.wash(sh, IRON_P.ochreDeep, { alpha: 0.55, off: 1, force: true });
  d.hatch(sh, { a: 4, gap: 2.6 - k, w: 0.9, alpha: 0.9, force: true, cross: k > 0.5, crossA: 64, crossGap: 2.6, crossTone: x => 1.25 - Math.abs(x - mid) / hw * 1.1 });
  ctx.restore();
  // gold help: a gold outline of where it lands
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(150,160,200,' + (0.28 * k).toFixed(3) + ')'; ctx.beginPath(); SKETCH.ell(mid + 20, gy + 6, hw * 0.95, 16, 40).forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.fill(); ctx.restore();
  if (ironHasGold(st, 'stretch' + st.ph.stretch) && f.state === 'tell') d.stroke([[L, gy + 2], [L + 10, gy - 6], [R - 10, gy - 6], [R, gy + 2]], { w: 2.2, col: SKETCH.PAL.core, curve: true });
}
// where the sole is: in the tell it drops into view, looms (slowly sinking, so you can read it), then slams down
function ironChaseSoleY(f) {
  const K = IRONCHASE, gy = ironChaseGY();
  if (f.state === 'tell') {
    const k = Math.min(1, f.t / f.tell);
    if (k < 0.22) { const e = k / 0.22; return gy - 620 + 360 * (1 - (1 - e) * (1 - e)); }
    if (k < 0.84) { const e = (k - 0.22) / 0.62; return gy - 260 + 150 * e * e; }
    const e = (k - 0.84) / 0.16; return gy - 110 + 110 * e * e;
  }
  if (f.state === 'planted') return gy;
  if (f.state === 'lift') { const k = Math.min(1, f.t / K.lift); return gy - 620 * k * k; }
  return null;
}
function ironChaseDrawFoot(st, f, d) {
  const K = IRONCHASE, s = K.foot.s, sy = ironChaseSoleY(f);
  if (sy == null || sy < -80) return;
  const ax = f.x + (380 - 6) * s;   // the sheet's anchor (the middle of the sole) is 374 px from the heel
  const tilt = f.state === 'tell' ? -0.025 * (1 - f.t / f.tell) : f.state === 'lift' ? 0.03 * f.t / K.lift : 0;
  SKETCH.blit(ctx, 'iron:shin', ax + (196 - 380) * s, sy + (14 - 320) * s, { sx: s, sy: s, rot: tilt });
  SKETCH.blit(ctx, 'iron:foot', ax, sy, { sx: s, sy: s, rot: tilt });
  // speed lines while it comes down fast, and the dust where it landed
  if (f.state === 'tell' && f.t / f.tell > 0.6) { d.speed(ax + 120, sy - 160, 0, -70, 5, { spread: 120, w: 1.2 }); d.speed(ax - 150, sy - 220, 0, -70, 3, { spread: 60, w: 1.1 }); }
  if (f.state === 'lift') { for (const sx of [ax - 120, ax + 20, ax + 150]) d.stroke([[sx, sy + 2], [sx + 1, sy + 30], [sx - 1, sy + 60]], { w: 2, p: [1, 0.6, 0.05], curve: true, col: '#9c7a46', alpha: 0.7, sh: 0, brk: 1 }); }
}
function ironChaseDrawChain(st, d) {
  const ph = st.ph, K = IRONCHASE, gy = ironChaseGY(), c = ph.chain, s = K.foot.s;
  if (ph.tow || ph.reel) {
    const top = [c.x + 640, -120];
    const ry = ph.reel ? gy - 14 - ph.reel.t * (60 + ph.reel.t * 130) : gy - 14;
    IRON_ART.helpers.ironChain(d, [[c.x, ry], [c.x + 160, ry - 40], [c.x + 380, ry - 180], top], { link: 13, w: 1.6 });
    SKETCH.blit(ctx, IRON_ART.ring(), c.x, ry, { rot: -0.6 });
    return;
  }
  // the right foot (feet[1]) trails the chain from its heel's eye bolt; in stretch 3 its ring drags ahead of the heroes
  const f = ph.feet[1], sy = ironChaseSoleY(f);
  if (ph.stretch === 2) {
    const ry = gy - 14;
    const held = c.state === 'one';
    IRON_ART.helpers.ironChain(d, [[c.x, ry], [c.x + 80, gy - 4], [c.x + 260, gy - 6], [c.x + 420, gy - 80], [c.x + 700, -100]], { link: 13, w: 1.6 });
    SKETCH.blit(ctx, IRON_ART.ring(), c.x, ry, { rot: held ? -0.4 : Math.sin(G.clock * 6) * 0.08 });
    d.cloud(c.x + 30, gy - 6, 9, { fill: SKETCH.PAL.dust, puffs: 5, flat: true, w: 1.1 });
    if (!held && ph.chain.state === 'drag') { const b = Math.abs(Math.sin(G.clock * 4)) * 4; d.word('GRAB!', c.x, gy - 60 - b, 14, { align: 'center', fill: SKETCH.PAL.core }); }
    return;
  }
  if (sy == null || sy < -60) return;
  const ax = f.x + (380 - 6) * s, ex = ax + (28 - 380) * s, ey = sy + (286 - 320) * s;
  IRON_ART.helpers.ironChain(d, [[ex, ey], [ex - 20, ey + 30], [ex - 60, gy - 2], [ex - 140, gy + 1], [ex - 220, gy - 1]], { link: 12, w: 1.5 });
}
function ironChaseDrawTowStuff(st, d) {
  const tw = st.ph.tow, gy = ironChaseGY();
  if (!tw) return;
  const gold = ironHasGold(st, 'stretch2');
  for (const s of tw.stuff) {
    if (s.x < st.cam.x - 200 || s.x > st.cam.x + W + 200) continue;
    if (s.kind === 'rock') SKETCH.blit(ctx, IRON_ART.rock(s.i % 2), s.x, gy + 2);
    else if (s.kind === 'cactus') SKETCH.blit(ctx, IRON_ART.cactus(s.i % 2), s.x, gy + 2);
    else SKETCH.blit(ctx, IRON_ART.boneArch(), s.x, gy + 2);
    if (gold) d.word(s.kind === 'arch' ? 'DUCK' : 'HOP', s.x, gy - (s.kind === 'arch' ? 120 : 76), 12, { align: 'center', fill: SKETCH.PAL.core });
  }
  // speed lines along the ground: they are going fast
  for (let i = 0; i < 6; i++) { const x = st.cam.x + ((i * 173 - G.clock * 600) % 1000 + 1000) % 1000, y = gy - 20 - (i % 3) * 40; d.stroke([[x, y], [x + 60 + (i % 2) * 40, y]], { w: 1, alpha: 0.5, sh: 0, p: [0.1, 1, 0.1] }); }
}
function ironChaseDraw(st) {
  const ph = st.ph, K = IRONCHASE, gy = ironChaseGY(), d = SKETCH.live(ctx, 4090, SKETCH.boil()), t = G.clock;
  // birds scattered off the sand by a footfall, small against the giant (that is how big it is)
  if (ph.birds) for (const b of ph.birds) if (b.t < 9) { ctx.save(); ctx.globalAlpha = Math.min(1, (9 - b.t) / 2); SKETCH.birds(d, b.x - b.t * 30, b.y - b.t * 14, b.n, b.t, { spread: 110, spreadY: 46, s: 6, dir: -1, seed: b.seed }); ctx.restore(); }
  // falling sand and stones from a lifted sole
  for (const r of ph.rain) {
    if (r.t < r.delay) continue;
    ctx.fillStyle = r.big ? 'rgba(70,46,26,0.9)' : 'rgba(120,88,48,0.75)';
    ctx.beginPath(); ctx.ellipse(r.x, r.y, r.big ? 2.6 : 1, r.big ? 2.2 : 1.8, 0.4, 0, 6.3); ctx.fill();
  }
  // the ground waves: a hump of sand rolling along
  for (const w of ph.waves) {
    const x = w.x, a = Math.max(0, Math.min(1, (IRONCHASE.wave.reach - w.t * IRONCHASE.wave.v) / 140));
    if (x < st.cam.x - 80 || x > st.cam.x + W + 80) continue;
    ctx.save(); ctx.globalAlpha = a;
    const hump = [[x - 40, gy + 1], [x - 14 * w.dir, gy - 9], [x + 8 * w.dir, gy - 13], [x + 30 * w.dir, gy - 4], [x + 48 * w.dir, gy + 1]];
    d.wash(hump, IRON_P.sand, { alpha: 0.9, off: 0.5 });
    d.stroke(hump, { w: 2, curve: true });
    for (let i = 0; i < 6; i++) { const an = -2.2 + i * 0.26; d.stroke([[x + Math.cos(an) * 18 * w.dir, gy - 13 + Math.sin(an) * 8], [x + Math.cos(an) * 26 * w.dir, gy - 13 + Math.sin(an) * 14]], { w: 1, sh: 0, alpha: 0.7 }); }
    ctx.restore();
  }
  // dust clouds where a foot or a pillar landed
  for (const q of ph.dust) {
    const k = q.t / 1.2, r = (q.r || 14) + k * 26;
    ctx.save(); ctx.globalAlpha = 1 - k;
    d.cloud(q.x + q.dir * k * 50, q.y - k * 10, r, { fill: IRON_P.dust, puffs: 6, w: 1.4, curls: 1, flat: true });
    d.cloud(q.x + q.dir * k * 90, q.y - 4, r * 0.6, { fill: IRON_P.dust, puffs: 5, w: 1.1, flat: true });
    ctx.restore();
  }
  // the held chain: a little sand spray behind the skier
  if (ph.chain.state === 'one' || ph.tow) for (const p of G.players) if (p.alive && (ph.tow || ph.chain.who === p.id)) d.cloud(p.x - 6 + st.cam.x, gy - 4 + st.cam.y, 6 + Math.sin(t * 20) * 1.5, { fill: IRON_P.dust, puffs: 4, w: 1, flat: true });
  void K;
}
function ironChaseHeroO(st, p) {
  const ph = st.ph;
  if (ph.tow || ph.chain.who === p.id) return { sx: p.crouch ? 1.12 : 1, sy: p.crouch ? 0.6 : 1 };
  return null;
}

IRON_PHASES.chase = {
  setup(st, L) { ironChaseSetup(st, L); },
  wait(st, dt) { const ph = st.ph; if (ph.prep && ph.prep.length) ph.prep.shift()(); ironCoast(st, dt, ph.solids); },
  step(st, dt) { const ph = st.ph; if (ph.prep && ph.prep.length) ph.prep.shift()(); ironChaseStep(st, dt); IRON_OUTFIT.snap = !!(ph.chain && ph.chain.state === 'tow'); },
  plan(st) { return ironChasePlan(st); },
  present(st, p) { return !!st.ph.tow; },
  busy(st, p) { return !!st.ph.reel; },
  labels(st) { const P = ironChasePlan(st); return [0, 1].map(id => (P[id] && P[id].why === 'hand' ? 'hand' : 'grab')); },
  roles(st) {
    const P = ironChasePlan(st);
    return [0, 1].map(id => { const w = P[id] && P[id].why; return w === 'step' ? 'Step!' : w === 'boost' ? 'Climb!' : w === 'hand' ? 'Pull!' : w === 'grab' ? 'Grab!' : w === 'handchain' ? 'Hand!' : w === 'tow' ? 'Hold on!' : 'Run!'; });
  },
  hudText(st) {
    const ph = st.ph;
    if (ph.tow) return 'Towed: ' + Math.max(0, Math.ceil(IRONCHASE.tow.T - ph.tow.t)) + ' s';
    if (ph.chain.state === 'one') return 'Take their hand: ' + Math.max(0, Math.ceil(IRONCHASE.chain.wait - ph.chain.t)) + ' s';
    return ['Open dunes', 'The trampled ruins', 'The heel chain'][ph.stretch];
  },
  heroO(st, p) { return ironChaseHeroO(st, p); },
  drawBack(st) { ironChaseDrawBack(st); },
  draw(st) { ironChaseDraw(st); },
  music() { return { song: 'ironmarch', amb: 'ironDesert' }; },
  stat(st) { const s = st.stats.chase; return s && s.hops ? { label: 'Wave hops', value: s.hops } : null; },
  leave() { SKETCH.forget('iron:desert'); SKETCH.forget('iron:obelisk'); SKETCH.forget('iron:ruinwall'); SKETCH.forget('iron:paving'); },
};

/* --- sounds --- */
Sfx.extra.ironchaseWaveRumble = function () { this.noise(0.7, { type: 'lowpass', f: 260, to: 120, vol: 0.05, a: 0.05 }); this.tone(55, 0.6, 'sine', 0.05, 40); };
Sfx.extra.ironchaseWaveHop = function (p) { this.tone(300 * p, 0.2, 'sawtooth', 0.02, 900 * p); this.noise(0.25, { f: 1800, to: 600, vol: 0.02 }); };
Sfx.extra.ironchaseSandRain = function () { for (let k = 0; k < 6; k++) this.noise(0.12, { type: 'highpass', f: 3000 + k * 200, vol: 0.012, delay: k * 0.12 }); };
Sfx.extra.ironchasePillarLean = function () { this.tone(140, 0.9, 'sawtooth', 0.02, 90); this.noise(0.9, { f: 600, q: 4, vol: 0.015, a: 0.3 }); };
Sfx.extra.ironchasePillarCrash = function () { this.tone(80, 0.4, 'sine', 0.09, 40); this.noise(0.5, { type: 'lowpass', f: 900, to: 200, vol: 0.06 }); };
Sfx.extra.ironchaseCrackOpen = function () { this.tone(900, 0.05, 'square', 0.03, 300); this.noise(0.25, { f: 1200, to: 300, vol: 0.04 }); };
Sfx.extra.ironchaseChainGrab = function () { [1200, 1500, 900].forEach((f, i) => this.tone(f, 0.05, 'square', 0.025, null, i * 0.04)); };
Sfx.extra.ironchaseChainDrag = function () { this.noise(0.6, { f: 2200, q: 5, vol: 0.02, a: 0.05 }); };
Sfx.extra.ironchaseChainWhip = function () { this.noise(0.25, { f: 3000, to: 800, q: 2, vol: 0.04 }); for (let k = 0; k < 4; k++) this.tone(1100 + k * 150, 0.04, 'square', 0.015, null, 0.05 + k * 0.03); };
Sfx.extra.ironchaseHandClasp = function () { this.tone(330, 0.08, 'triangle', 0.05); this.tone(495, 0.12, 'triangle', 0.04, null, 0.06); };
Sfx.extra.ironchaseChainReel = function () { for (let k = 0; k < 10; k++) this.tone(900 + (k % 2) * 200, 0.03, 'square', 0.015, null, k * 0.06); };

ironRoom('chase', {
  act: { label: 'grab', labels: ['grab', 'grab'] },
  tip: IRON_PARTS.chase.tip,
});
