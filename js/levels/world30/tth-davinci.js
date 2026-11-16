/* Pip & Bo - Level 30-1 The Time Thief: era 'davinci' (Leonardo's Flying Machine, the 1490s). */
'use strict';

/* ===== 30-1 era 6: Leonardo's Flying Machine (TTH_PHASES.davinci) - Gavyn's pick =====
   "He steals the plans, so you fly Leonardo's wooden glider after him. One flaps, the other steers."
   Florence, the 1490s. The Time Thief snatches Leonardo da Vinci's plans and jets off over Tuscany, so Pip and Bo
   take the real thing: Leonardo's wood-and-canvas flying machine with flapping wings. The era scrolls right; both
   ride the machine (hide(st) is true: this file draws them in their seats and keeps p.x / p.y on them).

   THE TWO JOBS (they swap seats twice, so both do both):
     FLAPPER  (back seat, action word "flap"): every press of the action is ONE wingbeat. A beat pushes the machine
              forward and holds it up for TTHVINCI.beat.lift s. A steady beat of about 2 a second flies best: a
              beat is only full strength when the wing has had beat.full s to swing back up, and every beat costs
              wing power (the WING METER under the machine; it refills at beat.regen a second, so about 2.2 beats
              a second can go on for ever). Mashing empties the meter: "Wings tired!", no beats for beat.tired s.
              No beats = no lift: the machine glides down and LANDS softly (no bump); a beat takes off again.
     STEERER  (front seat, action word "shoo"): up (W / ↑ / ▲ / A / stick up) tilts the nose up: climb and slow
              down (it only climbs while the wings beat). Down tilts it down: dive and speed up. Nothing held =
              level. So the steerer picks the height, the flapper gives the power. The steerer's action toots the
              horn: a flock of pigeons in front of the machine scatters ("Shoo!").
   Neither can fly alone: without beats the machine sits on the ground; without steering it flies level into the
   first tower or banner (a bump pops it BACK at the SAME height, so it can never bump its way through).

   THE COURSE (hand-made, TTHVINCI_COURSE; the PAGES of the plans that blow out of the Thief's claw are the trail
   through every gap: fly through a page to collect it, "Pages 12/88" in the time pill):
     1 The Tuscan hills (learn to fly): hills to climb over, a storm cloud to dive under, a warm UPDRAFT (rings of
       rising air that lift the machine for free), a first flock of pigeons, a first storm gust.
     2 The rooftops of Florence (tight gaps): tower houses, washing lines (fly over), banners (fly under), tower +
       banner gates, a gusty storm cloud, the updraft up and over the great DOME, a swoop down after it, pigeons.
     3 The river and the piazza (the chase): the Thief flies just ahead and weaves. Stay close behind his machine,
       in his SLIPSTREAM (the streaks behind his jet; gold when you are in it), until the slipstream meter is full
       (chase.need s in it). Over the open piazza his jet runs out of puff and he sinks low: DIVE under his
       machine and fly through the plans case in his claw to snatch it. Era won. (The longer a dive takes, the
       slower he flies: from chase.diveV down to chase.diveSlow px/s after chase.diveHold s, and he hovers while
       the machine sits on the ground, so a pair with a slow flapper catches him too. A MISSED dive is flying
       past him without the plans, or a bump during the dive: he laughs, zips ahead and the dive starts again.)
   Between the stretches the machine lands by itself on a tower top with a gold flag (the checkpoint and the
   breather): "Swap seats!" (tthSwap), then the new flapper's first beat takes off. Room field `first` flaps first.

   HAZARDS, all soft (nobody is hurt, nothing breaks), all seen at least 0.6 s ahead:
     towers, washing, the dome   fixed, on screen about 2.5 s before you reach them. Side on: tthBump ("Bonk!",
                                 feathers) and the machine pops back chase.back px at the same height. Landing on
                                 top of one from above: a bump and a bounce up.
     storm clouds, banners       the same from above ("Zap!", "Whap!"); from below a bump and a push down.
     storm gusts                 slanted rain under some clouds pushes the machine down gently (hold the nose up).
     pigeons                     the Thief points and whistles, a red "!" blinks at the right edge at their height
                                 for flock.warn s, then the flock flies in. Dodge (the pages show a way round) or
                                 toot the horn when they are in front of you. A hit: "Squawk!", a bump, half speed.
     the ground, roofs, water    flying or diving into it: "Bump!" / "Splash!" and a bounce back up. Gliding down
                                 with no beats (or slowly) is a soft landing instead, never a bump.
     the top of the sky          a soft ceiling (TTHVINCI.top), no bump.
   A near miss (under TTHVINCI.close px from a tower, cloud or banner) pops "Close!" (counted, just for fun).

   GOLD HELP (always announced with tthHelp, never hidden):
     2 bumps on the same tower / cloud / banner (and again at 4)   "Gold wind!": that gap gets gold.shrink px
                                                                   wider and a gold arrow shows the way.
     3 ground bumps in one stretch    "Gold feathers!": every beat lifts for longer.
     3 times "Wings tired!"           "Gold beat!": a gold dot on the wing meter lights when to flap; quicker refill.
     7 times "Wings tired!"           "Gold wings!": the wings never tire again (a too-early press just does nothing),
                                      so a young kid who mashes the button can fly too.
     2 pigeon bumps                   smaller flocks.
     chase.goldAfter s of chase with the meter under half   a wider gold slipstream that never drains.
     2 missed dives                   "Gold claw!": the plans case is much easier to grab; after 4 a bigger gold claw;
                                      after 6 a "Gold magnet!": flying past him at any height takes the plans.

   FAIRNESS. The course has no randomness at all (pigeons come at fixed places); a bump never costs more than a
   few seconds; the Thief always waits on screen; while nobody plays (st.idle) the machine hangs still in the air
   and nothing moves. Nothing needs more than about 2 presses a second or two directions at once.
   THE THIEF flies ahead with the plans in his claw all era (loose pages flutter out), taunts, sends the pigeons,
   and is caught in the chase. History in his taunts and the news line: Leonardo drew flying machines with
   flapping wings around 1490, about 400 years before the first aeroplane; his never really flew (until today).
   Stats (st.stats.davinci): pages, of, flaps, tired, close, shoos, stretch [s per stretch], diveMiss.
   The brain (js/cpu/levels/world30/tth-davinci.js) reads TTHVINCI, tthVinciAim and st.ph.
   Names: tthVinci* / TTHVINCI*; sounds Sfx.extra.tthVinci*. All state lives in st.ph (fresh every start). */
const TTHVINCI = {
  top: 128, ground: 478, water: 494, bridge: 412,   // the soft ceiling (machine centre) and the ground levels (y)
  seatX: 250,                                       // where the machine sits on screen (x)
  hw: 28, hh: 12,                                   // the machine's hit box (half sizes): the basket, not the wings
  start: { x: 170, y: 336, x0: 40, x1: 300 },       // Leonardo's workshop roof
  beat: { push: 56, lift: 0.8, cost: 0.25, regen: 0.56, full: 0.45, min: 0.16, weak: 0.3, tired: 1.2, bob: 46 },
  drag: 0.5, vMax: 330, climb: 150, dive: 215, sink: 92, flare: 0.45, accY: 560, upSlow: 30, flareSlow: 70, diveAcc: 70, stallV: 110,
  landV: 105, groundPop: 300, groundSlow: 0.62,
  back: 230, backT: 0.45, backV: 130, safe: 0.5,    // the pop-back off a tower
  page: { rx: 44, ry: 40, gap: 250, en: 0.05 },
  up: 135, down: 78,                                // updraft and storm gust (px/s added to the climb / sink)
  flock: { lead: 700, warn: 1.0, v: 150, r: 46, goldR: 30, hw: 64, shoo: 430, cd: 1.0, slow: 0.55 },
  perch: { reach: 430, v: 200, swapAt: 0.35, ready: 1.5 },
  chase: { near: 70, far: 320, tol: 58, need: 7, drain: 0.05, v: 218, gap: 250, pull: 40, weaveA: 44, weaveT: 3.6, maxVy: 115, open: 7150,
    diveV: 150, diveSlow: 70, diveFade: 14, diveHold: 4, diveY: 345, diveGap: 330, grab: 46, goldGrab: 80, goldGrab2: 130, magnet: 56, goldAfter: 24, goldTol: 92 },
  gold: { hits: 2, shrink: 45, ground: 3, tired: 3, tired2: 7, birds: 2, dive: 2, dive2: 4, dive3: 6 },
  close: 20, lantern: 28, domeBase: 446,
};
/* The hand-made course: three stretches. x is counted from the stretch's start (the tower it took off from).
     ['hill', x, half width, height]            a round hill (stretch 1 only)
     ['tower', x, width, top y, style]          'mill' 'castle' 'house' 'bell' 'palace': fly over it
     ['wash', x, width, top y]                  washing lines between two poles: fly over
     ['dome', x, width, top y]                  the great dome (a little lantern on top)
     ['cloud', x, width, bottom y, gust]        a storm cloud: fly under (gust: rain that pushes down)
     ['banner', x, width, bottom y]             a hanging banner: fly under
     ['up', x, width]                           a warm updraft
     ['birds', x, y]                            a flock of pigeons at height y; it meets the machine near x
     ['way', x, y]                              the trail (the pages and the Thief follow it): a smooth line
                                                through these points, at least 50 px clear of everything
   len: the stretch's length; perch: the top y of the tower it ends on. tools/w30/davinci-course.js checks it. */
const TTHVINCI_COURSE = [
  { name: 'The Tuscan hills', len: 10200, perch: 300, items: [
    ['way', 170, 322], ['way', 520, 300],
    ['hill', 950, 300, 120], ['way', 950, 268],
    ['way', 1500, 382],
    ['hill', 2150, 260, 70], ['tower', 2150, 54, 300, 'mill'], ['way', 2090, 228], ['way', 2210, 228],
    ['cloud', 2950, 300, 285], ['way', 2800, 372], ['way', 3100, 372],
    ['up', 3500, 240], ['tower', 4000, 70, 215, 'castle'], ['way', 3950, 150], ['way', 4050, 150],
    ['birds', 4750, 190], ['way', 4500, 302], ['way', 4900, 302],
    ['hill', 5500, 320, 150], ['cloud', 5500, 320, 185], ['way', 5380, 254], ['way', 5620, 254],
    ['tower', 6250, 64, 270, 'castle'], ['way', 6200, 205], ['way', 6300, 205],
    ['cloud', 6900, 260, 250, true], ['way', 6770, 345], ['way', 7030, 345],
    ['tower', 7550, 60, 300, 'castle'], ['way', 7500, 235], ['way', 7600, 235],
    ['up', 8150, 240], ['hill', 8650, 240, 60], ['tower', 8650, 54, 205, 'mill'], ['way', 8600, 142], ['way', 8700, 142],
    ['birds', 9400, 160], ['way', 9150, 300], ['way', 9600, 300],
    ['way', 9800, 262] ] },
  { name: 'The rooftops of Florence', len: 12600, perch: 290, items: [
    ['way', 0, 286], ['way', 420, 270],
    ['tower', 800, 56, 300, 'house'], ['way', 750, 235], ['way', 850, 235],
    ['wash', 1400, 240, 330], ['banner', 1400, 80, 180], ['way', 1290, 255], ['way', 1510, 255],
    ['birds', 2150, 250], ['way', 1950, 368], ['way', 2300, 368],
    ['tower', 3000, 56, 260, 'bell'], ['way', 2950, 195], ['way', 3050, 195],
    ['banner', 3750, 90, 300], ['way', 3690, 372], ['way', 3810, 372],
    ['cloud', 4500, 320, 260, true], ['way', 4340, 345], ['way', 4660, 345],
    ['up', 5150, 220], ['dome', 5900, 460, 250], ['way', 5760, 150], ['way', 6040, 150],
    ['banner', 6900, 90, 290], ['way', 6840, 370], ['way', 6960, 370],
    ['tower', 7500, 56, 310, 'house'], ['banner', 7500, 80, 170], ['way', 7450, 240], ['way', 7550, 240],
    ['birds', 8250, 365], ['way', 8050, 225], ['way', 8400, 225],
    ['tower', 9000, 56, 285, 'house'], ['way', 8950, 215], ['way', 9050, 215],
    ['wash', 9700, 240, 335], ['cloud', 9700, 200, 190], ['way', 9590, 262], ['way', 9810, 262],
    ['banner', 10350, 90, 285], ['way', 10290, 362], ['way', 10410, 362],
    ['up', 10750, 200], ['tower', 11150, 56, 215, 'bell'], ['way', 11100, 150], ['way', 11200, 150],
    ['tower', 11800, 56, 325, 'house'], ['banner', 11800, 80, 185], ['way', 11750, 255], ['way', 11850, 255],
    ['way', 12200, 250] ] },
  { name: 'The river and the piazza', len: 7600, items: [
    ['way', 0, 276], ['way', 450, 290], ['way', 1000, 385],
    ['tower', 1700, 60, 315, 'house'], ['way', 1640, 250], ['way', 1760, 250],
    ['way', 2300, 380],
    ['banner', 3000, 90, 240], ['way', 2940, 340], ['way', 3060, 340],
    ['tower', 3800, 56, 235, 'bell'], ['way', 3740, 170], ['way', 3860, 170],
    ['banner', 4600, 90, 250], ['way', 4540, 345], ['way', 4660, 345],
    ['tower', 5200, 56, 290, 'house'], ['way', 5150, 225], ['way', 5250, 225],
    ['cloud', 5900, 280, 230, true], ['way', 5760, 325], ['way', 6040, 325],
    ['tower', 6700, 84, 240, 'palace'], ['way', 6640, 175], ['way', 6760, 175],
    ['way', 7600, 290] ] },
];
// stretch 3's ground, from its start: roofs, the river (with the old bridge), roofs again, then the piazza (from p0)
const TTHVINCI_RIVER = { x0: 520, x1: 2700, b0: 1500, b1: 1900, p0: 6100 };
const tthVinciSolo = id => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(id);

/* ---------- the course: tokens -> obstacles, air zones, flocks, the trail, pages ---------- */
function tthVinciCompile() {
  const K = TTHVINCI, obs = [], zones = [], flocks = [], ways = [], hills = [], perches = [], X = [];
  let x0 = 0;
  TTHVINCI_COURSE.forEach((S, k) => {
    X.push(x0);
    for (const it of S.items) {
      const kind = it[0], x = x0 + it[1], w = it[2], v = it[3];
      const ob = { kind, k, x0: x - w / 2, x1: x + w / 2, y: v, hits: 0, gold: 0, minC: 999, passed: false };
      if (kind === 'hill') hills.push({ x, w, h: v });
      else if (kind === 'tower' || kind === 'wash' || kind === 'dome') { ob.low = true; ob.style = it[4] || 'house'; ob.base = K.domeBase; obs.push(ob); }
      else if (kind === 'cloud' || kind === 'banner') {
        ob.low = false; ob.gust = !!it[4]; obs.push(ob);
        if (it[4]) zones.push({ kind: 'down', x0: ob.x0 + 16, x1: ob.x1 - 16, ob });
      }
      else if (kind === 'up') zones.push({ kind: 'up', x0: x - w / 2, x1: x + w / 2 });
      else if (kind === 'birds') flocks.push({ x, y: w, k, state: 0, wx: 0, t: 0, i: flocks.length });
      else if (kind === 'way') ways.push([x, w]);
    }
    x0 += S.len;
    if (S.perch) perches.push({ x: x0, y: S.perch, k });
  });
  obs.sort((a, b) => a.x0 - b.x0); ways.sort((a, b) => a[0] - b[0]);
  const c = { X, end: x0, obs, zones, flocks, ways, hills, perches, pages: [],
    spots: [{ x0: K.start.x0, x1: K.start.x1, y: K.start.y }].concat(perches.map(p => ({ x0: p.x - 66, x1: p.x + 66, y: p.y }))) };
  // the pages: along the trail, from just after each take-off to just before each landing
  for (let k = 0; k < 3; k++) {
    const a = X[k] + 470, b = k < 2 ? perches[k].x - K.perch.reach - 60 : X[2] + K.chase.open - 150;
    for (let x = a; x <= b; x += K.page.gap) c.pages.push({ x, y: tthVinciPath(c, x), got: false, k });
  }
  return c;
}
// the trail's height at x: a smooth S between the way points
function tthVinciPath(c, x) {
  const w = c.ways;
  if (x <= w[0][0]) return w[0][1];
  if (x >= w[w.length - 1][0]) return w[w.length - 1][1];
  let a = 0, b = w.length - 1;
  while (b - a > 1) { const m = (a + b) >> 1; if (w[m][0] <= x) a = m; else b = m; }
  const u = (x - w[a][0]) / Math.max(1, w[b][0] - w[a][0]);
  return w[a][1] + (w[b][1] - w[a][1]) * (0.5 - 0.5 * Math.cos(Math.PI * u));
}
// what the ground is at x: 'spot' (the workshop roof, a perch tower), 'hills', 'roofs', 'water', 'bridge', 'piazza'
function tthVinciLand(c, x) {
  for (const s of c.spots) if (x >= s.x0 && x <= s.x1) return 'spot';
  if (x < c.X[1] - 200) return 'hills';
  const r = x - c.X[2], R = TTHVINCI_RIVER;
  if (r < R.x0) return 'roofs';
  if (r < R.x1) return r >= R.b0 && r < R.b1 ? 'bridge' : 'water';
  return r < R.p0 ? 'roofs' : 'piazza';
}
function tthVinciHillY(c, x) {
  let y = TTHVINCI.ground - 5 * Math.sin(x * 0.0045) - 4 * Math.sin(x * 0.0113 + 1);
  for (const h of c.hills) { const d = Math.abs(x - h.x); if (d < h.w) y -= h.h * 0.5 * (1 + Math.cos(Math.PI * d / h.w)); }
  return y;
}
const tthVinciRoof = x => 446 + (hash(Math.floor(x / 96), 11) % 3) * 12;
function tthVinciGround(c, x) {
  const K = TTHVINCI, land = tthVinciLand(c, x);
  if (land === 'spot') { for (const s of c.spots) if (x >= s.x0 && x <= s.x1) return s.y; }
  if (land === 'hills') return tthVinciHillY(c, x);
  return land === 'roofs' ? tthVinciRoof(x) : land === 'water' ? K.water : land === 'bridge' ? K.bridge : K.ground;
}
// How far the machine's box at (x, y) is from an obstacle, up or down (px; 0 or less: it hits). null: not over / under it.
function tthVinciGap(ob, x, y) {
  const K = TTHVINCI, a = x - K.hw, b = x + K.hw;
  if (b <= ob.x0 || a >= ob.x1) return null;
  if (!ob.low) return (y - K.hh) - ob.y;
  let top = ob.y;
  if (ob.kind === 'dome') {
    const cx = (ob.x0 + ob.x1) / 2, hw = (ob.x1 - ob.x0) / 2, u = Math.min(1, Math.abs(clamp(cx, a, b) - cx) / hw);
    top = ob.base - (ob.base - ob.y) * Math.sqrt(1 - u * u);
    if (a < cx + 13 && b > cx - 13) top = ob.y - K.lantern;
  }
  return top - (y + K.hh);
}
// where the brain (and a person) should fly: the page trail a little ahead, the Thief's slipstream, the plans case
function tthVinciAim(st, lead = 110) {
  const ph = st.ph, g = ph.g, ch = ph.chase;
  if (ch && ph.mode === 'fly') {
    if (ch.phase === 'dive') return tthVinciClaw(st).y - 2;
    return tthVinciWake(st).y;
  }
  return tthVinciPath(ph.c, g.x + lead);
}
// the middle of the Thief's slipstream (just behind his jet) and the plans case in his claw (world)
function tthVinciWake(st) { const c = st.thief; return { x: c.x - 80 * c.s, y: c.y - 34 * c.s }; }
function tthVinciClaw(st) { const P = tthThiefPts(st.thief).claw; return { x: P.x, y: P.y + 8 * st.thief.s }; }

/* ---------- small things: tips over heads, feathers and other bits, sounds ---------- */
// a hint over player id, at most once every `every` s per key
function tthVinciTip(st, id, key, text, o = {}, every = 6) {
  const tp = st.ph.tips, k = key + id;
  if (tp[k] != null && st.ph.t - tp[k] < every) return;
  tp[k] = st.ph.t; tthHint(st, id, text, o);
}
function tthVinciFxAdd(ph, kind, x, y, vx, vy, life, col) {
  if (ph.fx.length > 70) ph.fx.shift();
  ph.fx.push({ kind, x, y, vx, vy, t: 0, life, col, rot: (x * 0.37 + y) % 6, vr: ((x + y) % 2 ? 1 : -1) * (3 + (x % 5)) });
}
function tthVinciFeathers(ph, x, y, n, col) {
  for (let i = 0; i < n; i++) { const a = i * 2.4 + x * 0.01; tthVinciFxAdd(ph, 'feather', x, y, Math.cos(a) * (60 + i * 14), Math.sin(a) * (50 + i * 9) - 60, 1.3, col || (i % 3 ? '#ffffff' : '#f3e3c0')); }
}
function tthVinciFx(st, dt) {
  const fx = st.ph.fx;
  for (let i = fx.length - 1; i >= 0; i--) {
    const q = fx[i];
    q.t += dt;
    if (q.t >= q.life) { fx.splice(i, 1); continue; }
    if (q.kind === 'feather' || q.kind === 'page') { q.vy = Math.min(q.vy + 160 * dt, 70); q.vx *= 1 - 1.6 * dt; q.x += (q.vx + Math.sin(q.t * 7 + q.rot) * 40) * dt; q.rot += q.vr * dt * 0.5; }
    else if (q.kind === 'drop') { q.vy += 900 * dt; q.x += q.vx * dt; }
    else q.x += q.vx * dt;
    q.y += q.vy * dt;
  }
}
Sfx.extra.tthVinciFlap = function (p) { this.tone(190 * p, 0.16, 'sawtooth', 0.03, 70 * p); this.tone(520 * p, 0.07, 'triangle', 0.02, 240 * p, 0.02); };
Sfx.extra.tthVinciWeak = function () { this.tone(150, 0.08, 'sawtooth', 0.018, 90); };
Sfx.extra.tthVinciTired = function () { this.tone(330, 0.28, 'sawtooth', 0.04, 110); this.tone(250, 0.3, 'triangle', 0.04, 90, 0.12); };
Sfx.extra.tthVinciPage = function (p, n) { const f = 660 * Math.pow(1.06, Math.min(12, n || 0)); this.tone(f, 0.07, 'triangle', 0.05); this.tone(f * 1.5, 0.12, 'triangle', 0.04, null, 0.05); };
Sfx.extra.tthVinciCrash = function () { this.tone(170, 0.2, 'square', 0.05, 60); this.tone(900, 0.12, 'sawtooth', 0.02, 200, 0.03); };
Sfx.extra.tthVinciLand = function () { this.tone(130, 0.1, 'triangle', 0.06, 80); this.tone(700, 0.05, 'square', 0.015, 400, 0.02); };
Sfx.extra.tthVinciToot = function () { this.tone(392, 0.12, 'square', 0.04); this.tone(523, 0.2, 'square', 0.04, null, 0.1); };
Sfx.extra.tthVinciBirds = function () { for (let k = 0; k < 4; k++) this.tone(1100 + (k % 2) * 260, 0.08, 'square', 0.025, 800, k * 0.11); };
Sfx.extra.tthVinciZap = function () { this.tone(1600, 0.16, 'sawtooth', 0.04, 200); this.tone(90, 0.3, 'square', 0.04, 50, 0.05); };
Sfx.extra.tthVinciWind = function () { this.tone(240, 0.5, 'sine', 0.035, 620); };
Sfx.extra.tthVinciSlip = function (p, n) { this.tone(420 + 60 * (n || 0), 0.14, 'sine', 0.03, 520 + 70 * (n || 0)); };
Sfx.extra.tthVinciDive = function () { this.tone(900, 0.6, 'sawtooth', 0.03, 240); this.tone(450, 0.6, 'triangle', 0.03, 120, 0.05); };
Sfx.extra.tthVinciSnatch = function () { [523, 784, 1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.055, null, i * 0.06)); };

/* ---------- the machine ---------- */
function tthVinciNewMachine() {
  const K = TTHVINCI;
  return { x: K.start.x, y: K.start.y - K.hh, v: 0, vy: 0, pitch: 0, beatT: 9, wingT: 9, liftT: 0, en: 1, tired: 0, landed: true,
    bounce: null, safeT: 0, spin: 0, air: 1, has: false, weakT: 0, noLiftT: 0, tail: 0 };
}
// both players in their seats (world coords inside the tick; called at the end of every hook that moves the machine)
function tthVinciSeat(st) {
  const ph = st.ph, g = ph.g, a = g.pitch + g.spin, ca = Math.cos(a), sa = Math.sin(a), k = ph.swapA, e = k * k * (3 - 2 * k);
  for (const p of G.players) {
    const now = p.id === ph.flap ? -13 : 13, was = k < 1 ? -now : now;
    const lx = was + (now - was) * e, ly = -4 - (k < 1 ? Math.sin(Math.PI * k) * (p.id === ph.flap ? 34 : 16) : 0);
    ph.seat[p.id].x = lx; ph.seat[p.id].y = ly;
    p.x = g.x + lx * ca - ly * sa - p.w / 2; p.y = g.y + lx * sa + ly * ca - p.h;
    if (G.introT > 0 && p.id === ph.flap) p.y -= 20;         // (the era card: the two name tags, one over the other)
    p.vx = 0; p.vy = 0; p.alive = true; p.grounded = true; p.face = 1; p.stun = 0; p.sx = 1; p.sy = 1;
  }
}
function tthVinciCam(st, dt) {
  const g = st.ph.g, want = Math.max(0, g.x - TTHVINCI.seatX);
  st.cam.x += (want - st.cam.x) * Math.min(1, dt * 7); st.cam.y = 0;
}
// one wingbeat (the flapper pressed the action)
function tthVinciBeat(st, F) {
  const ph = st.ph, K = TTHVINCI, B = K.beat, g = ph.g, s = tthStats(st);
  if (g.tired > 0) { g.weakT = 0.25; return false; }
  if (g.beatT < B.min) return false;                       // the wing is still on its way down
  if (g.en < B.cost) {
    if (ph.wingGold) { g.weakT = 0.25; return false; }      // gold wings: a too-early press is only a little flutter
    g.tired = B.tired; g.en = 0; g.weakT = 0.4; s.tired++; ph.tiredN++;
    tthPop(st, g.x, g.y - 64, 'Wings tired!', '#ffb3b3', 20); Sfx.play('tthVinciTired');
    if (ph.tiredN === K.gold.tired && !ph.beatGold) {
      ph.beatGold = true;
      tthHelp(st, 'Gold beat! Flap each time the gold dot lights up.', { id: F.id, hint: 'Slow and steady: flap on the gold dot' });
    } else if (ph.tiredN === K.gold.tired2 && !ph.wingGold) {
      ph.wingGold = true; g.tired = 0.5;
      tthHelp(st, 'Gold wings! They never get tired now.', { id: F.id, hint: 'Just keep flapping!' });
    } else tthVinciTip(st, F.id, 'tired', 'Too fast! Slow, steady beats', { cpu: 'Oops, too fast!' }, 3);
    return false;
  }
  const k = clamp(g.beatT / B.full, B.weak, 1);
  g.en -= B.cost; g.beatT = 0; g.wingT = 0;
  g.liftT = Math.max(g.liftT, B.lift * ph.liftK * (0.5 + 0.5 * k));
  g.v = Math.min(K.vMax, g.v + B.push * k);
  if (g.landed) { g.landed = false; g.vy = -170; g.y -= 3; g.v = Math.max(g.v, 90); puff(g.x, g.y + K.hh, 6, 'rgba(255,255,255,0.8)'); }
  else g.vy -= B.bob * k;
  g.air++; s.flaps++;
  Sfx.play(k > 0.7 ? 'tthVinciFlap' : 'tthVinciWeak', F.id);
  return true;
}
// the steerer's horn: pigeons in front of the machine scatter
function tthVinciShoo(st, S) {
  const ph = st.ph, K = TTHVINCI, g = ph.g;
  if (ph.shooCd > 0) return;
  ph.shooCd = K.flock.cd; ph.tootT = 0.5;
  Sfx.play('tthVinciToot');
  for (const f of ph.c.flocks) {
    if (f.state !== 2 || f.wx < g.x - 40 || f.wx > g.x + K.flock.shoo) continue;
    f.state = 3; f.t = 0; tthStats(st).shoos++;
    tthPop(st, f.wx, f.y - 50, 'Shoo!', C.gold, 22); Sfx.play('tthVinciBirds');
    tthVinciFeathers(ph, f.wx, f.y, 5, '#e9edf5');
  }
}
// a bump on the ground, a roof or the river: a bounce back up
function tthVinciGroundBump(st, land) {
  const ph = st.ph, K = TTHVINCI, g = ph.g, wet = land === 'water';
  tthBump(st, { word: wet ? 'Splash!' : 'Bump!', x: g.x + 10, y: g.y - 44, kind: wet ? 'water' : 'ground' });
  Sfx.play(wet ? 'splash' : 'tthVinciCrash');
  if (wet) for (let i = 0; i < 8; i++) tthVinciFxAdd(ph, 'drop', g.x + i * 6 - 20, g.y + 10, (i - 4) * 28, -260 - (i % 3) * 60, 0.7, '#bfe8ff');
  else tthVinciFeathers(ph, g.x, g.y, 6);
  g.vy = -K.groundPop; g.liftT = Math.max(g.liftT, 0.75); g.v *= K.groundSlow; g.air = 0; g.spin = 0.25;
  if (ph.chase && ph.chase.phase === 'dive') { tthVinciDiveMiss(st); return; }
  if (++ph.groundHits === K.gold.ground) {
    ph.liftK = 1.4;
    tthHelp(st, 'Gold feathers! Every wingbeat lifts for longer now.', { id: 1 - ph.flap, hint: 'Hold ' + tthKey(1 - ph.flap, 'up') + ' to climb' });
  } else tthVinciTip(st, 1 - ph.flap, 'pull', 'Nose up! Hold ' + tthKey(1 - ph.flap, 'up'), { cpu: 'Nose up!' }, 4);
}
// a crash into the side of a tower, cloud or banner: pop back, at the same height
function tthVinciCrash(st, ob) {
  const ph = st.ph, K = TTHVINCI, g = ph.g, c = ph.c, id = 1 - ph.flap;
  const word = { tower: 'Bonk!', wash: 'Twang!', dome: 'Bonk!', cloud: 'Zap!', banner: 'Whap!' }[ob.kind] || 'Bump!';
  tthBump(st, { word, x: g.x + 10, y: g.y - 44, kind: ob.kind });
  Sfx.play(ob.kind === 'cloud' ? 'tthVinciZap' : 'tthVinciCrash');
  tthVinciFeathers(ph, g.x + 16, g.y, 9, ob.kind === 'wash' ? '#ff8fc7' : null);
  let x1 = Math.min(g.x - 70, ob.x0 - K.back);
  const y1 = clamp(g.y, K.top + 10, tthVinciGround(c, x1) - 70);
  for (let n = 0; n < 3; n++) {   // never back into another tower or banner
    const o2 = c.obs.find(o => { if (o === ob) return false; const gp = tthVinciGap(o, x1, y1); return gp !== null && gp < 14; });
    if (!o2) break;
    x1 = o2.x0 - K.hw - 40;
  }
  x1 = Math.max(x1, ph.minX);
  g.bounce = { x0: g.x, y0: g.y, x1, y1, t: 0 }; g.v = 0; g.vy = 0; g.spin = 0;
  ob.hits++; ob.minC = 999;
  const how = ob.low ? 'Climb! Hold ' + tthKey(id, 'up') : 'Dive! Hold ' + tthKey(id, 'down'), cpu = ob.low ? 'I must climb!' : 'I must dive!';
  if (ob.hits === K.gold.hits || ob.hits === K.gold.hits * 2) {
    ob.gold++; ob.y += ob.low ? K.gold.shrink : -K.gold.shrink;
    tthHelp(st, ob.gold === 1 ? 'Gold wind! That gap is wider now.' : 'More gold wind! That gap is wider still.', { id, hint: how });
  } else tthHint(st, id, how, { cpu });
  if (ph.chase && ph.chase.phase === 'dive') tthVinciDiveMiss(st);
  else if (st.stats.team % 4 === 2) tthReact(st, 'happy', ob.low ? 'Ha ha! Mind the towers!' : 'Ha! Duck next time!', 1.6);
}
function tthVinciCloseCall(st, ob) {
  const g = st.ph.g;
  tthStats(st).close++;
  tthPop(st, g.x, g.y - 52, 'Close!', '#ffe9a8', 17); Sfx.play('whoosh');
}

/* ---------- the three ways the machine moves: perched, landing on a perch, flying ---------- */
function tthVinciPerch(st, dt) {
  const ph = st.ph, K = TTHVINCI, g = ph.g, P = ph.perch, c = ph.c;
  P.t += dt;
  g.v = 0; g.vy = 0; g.landed = true; g.pitch = approach(g.pitch, 0, dt * 2); g.x = P.x; g.y = P.y - K.hh;
  if (P.swap && !P.swapped && P.t >= K.perch.swapAt) {
    P.swapped = true; ph.flap = 1 - ph.flap; ph.swapA = 0;
    tthSwap(st);
    if (ph.stage === 1) { tthNews(st, 'True: Leonardo drew flying machines around 1490, 400 years before aeroplanes!', false, 6); tthSay(st, 'Florence! So many towers to bump into!', 2.6); }
    else { tthNews(st, 'True: Leonardo\'s flying machine never really flew... until today!', false, 6); tthSay(st, 'That old thing was never meant to fly!', 2.6); }
  }
  if (ph.swapA < 1) ph.swapA = Math.min(1, ph.swapA + dt / 0.8);
  const F = G.players[ph.flap], S = G.players[1 - ph.flap];
  S.pendingAct = false;
  if (P.t < (P.swap ? K.perch.ready : 0.15)) { F.pendingAct = false; return; }
  P.ready = true;
  if (ph.stage === 0 && !ph.said.hello) { ph.said.hello = true; tthSay(st, 'Leonardo\'s plans are MINE now! Ha ha!', 2.8); tthNews(st, 'Leonardo: "My plans! Take my flying machine and catch him!"', false, 5); }
  tthVinciTip(st, F.id, 'go', 'Tap ' + tthKey(F.id, 'act') + ' to flap the wings!', { cpu: 'I flap the wings!' }, 5);
  tthVinciTip(st, S.id, 'steer', tthKey(S.id, 'up') + ' climbs, ' + tthKey(S.id, 'down') + ' dives', { cpu: 'I steer!' }, 5);
  if (!F.pendingAct) return;
  F.pendingAct = false;
  g.beatT = 9;
  if (!tthVinciBeat(st, F)) return;
  // off we go
  ph.mode = 'fly'; ph.minX = P.x + 40; g.v = 150; g.vy = -150; ph.stageT0 = st.phT;
  st.hints[0] = st.hints[1] = null;
  if (ph.stage === 0) { tthReact(st, 'shocked', 'WHAT?! That old thing FLIES?!', 2); ph.leoT = 0.01; }
  if (ph.stage === 2) tthVinciChaseStart(st);
}
function tthVinciToPerch(st, dt) {
  const ph = st.ph, K = TTHVINCI, g = ph.g, A = ph.app;
  A.t += dt;
  const u = Math.min(1, A.t / A.T), e = u * u * (3 - 2 * u);
  g.x = A.x0 + (A.x1 - A.x0) * e; g.y = A.y0 + (A.y1 - A.y0) * e - Math.sin(u * Math.PI) * 26 * A.hop;
  g.pitch = approach(g.pitch, u < 0.7 ? -0.12 : 0.1, dt * 1.5); g.v = 0; g.vy = 0; g.wingT += dt;
  if ((A.beat -= dt) <= 0) { A.beat = 0.6; g.wingT = 0; }   // slow, easy beats on the way in
  if (u < 1) return;
  // landed on the tower: the checkpoint, and the seats swap
  const P = ph.c.perches[ph.stage];
  tthStats(st).stretch.push(Math.round((st.phT - ph.stageT0) * 10) / 10);
  ph.stage++; ph.mode = 'perch'; ph.perch = { x: P.x, y: P.y, t: 0, swap: true, swapped: false, ready: false };
  ph.groundHits = 0; g.landed = true; g.pitch = 0; g.en = 1; g.tired = 0;
  Sfx.play('tthVinciLand'); Sfx.play('tthDing'); puff(g.x - 20, g.y + K.hh, 6, 'rgba(255,255,255,0.8)'); puff(g.x + 20, g.y + K.hh, 6, 'rgba(255,255,255,0.8)');
  tthCelebrate(st, 0.8);
}
function tthVinciFly(st, dt) {
  const ph = st.ph, K = TTHVINCI, B = K.beat, g = ph.g, c = ph.c;
  const F = G.players[ph.flap], S = G.players[1 - ph.flap];
  g.beatT += dt; g.wingT += dt; g.safeT = Math.max(0, g.safeT - dt); g.weakT = Math.max(0, g.weakT - dt);
  g.en = Math.min(1, g.en + B.regen * (ph.beatGold ? 1.2 : 1) * dt);
  if (g.tired > 0 && (g.tired -= dt) <= 0) { g.tired = 0; g.en = Math.max(g.en, 0.5); }
  g.spin = approach(g.spin, 0, dt * 1.2);
  // popping back off a tower: nobody steers for a moment
  if (g.bounce) {
    const b = g.bounce;
    b.t += dt;
    const u = Math.min(1, b.t / K.backT), e = 1 - (1 - u) * (1 - u);
    g.x = b.x0 + (b.x1 - b.x0) * e; g.y = b.y0 + (b.y1 - b.y0) * e - Math.sin(u * Math.PI) * 16; g.spin = -0.5 * (1 - u); g.pitch = approach(g.pitch, 0, dt * 3);
    if (u >= 1) { g.bounce = null; g.v = K.backV; g.vy = 0; g.liftT = Math.max(g.liftT, 0.9); g.safeT = K.safe; g.beatT = 1; g.spin = 0; }
    return;
  }
  if (F.pendingAct) { F.pendingAct = false; tthVinciBeat(st, F); }
  if (S.pendingAct) { S.pendingAct = false; tthVinciShoo(st, S); }
  g.liftT = Math.max(0, g.liftT - dt);
  const up = tthUp(S), dn = S.input.down, steer = up && !dn ? -1 : dn && !up ? 1 : 0;
  ph.steer = steer;
  ph.noSteerT = steer || g.landed ? 0 : ph.noSteerT + dt;
  if (ph.noSteerT > 4 && !ph.chase) tthVinciTip(st, S.id, 'how', tthKey(S.id, 'up') + ' climbs, ' + tthKey(S.id, 'down') + ' dives: follow the pages!', {}, 7);
  if (g.landed) {
    // on the ground (a soft landing): only a wingbeat takes off again
    const land = tthVinciLand(c, g.x);
    g.v = approach(g.v, 0, 420 * dt); g.vy = 0; g.pitch = approach(g.pitch, 0, dt * 2);
    let nx = g.x + g.v * dt;
    for (const ob of c.obs) {   // it never slides into the foot of a tower
      if (ob.x0 > nx + K.hw) break;
      if (ob.low && ob.x1 > g.x && nx + K.hw > ob.x0 - 2 && tthVinciGap(ob, ob.x0 + 1, g.y) <= 0) { nx = Math.min(nx, Math.max(g.x, ob.x0 - 2 - K.hw)); g.v = 0; }
    }
    g.x = nx;
    g.y = Math.min(tthVinciGround(c, g.x - 14), tthVinciGround(c, g.x + 22)) - K.hh;
    tthVinciTip(st, F.id, 'up', (land === 'water' ? 'Afloat! Tap ' : 'Landed! Tap ') + tthKey(F.id, 'act') + ' to flap', { cpu: 'I\'ll flap us up!' }, 4);
    tthVinciAfter(st, dt);
    return;
  }
  const lift = g.liftT > 0;
  let ty = lift ? (steer < 0 ? -K.climb * clamp(g.v / K.stallV, 0.25, 1) : steer > 0 ? K.dive : 0)
    : (steer < 0 ? K.sink * K.flare : steer > 0 ? K.dive * 1.1 : K.sink);
  // warm updrafts lift the machine, storm gusts push it down
  ph.inUp = false; ph.inGust = false;
  for (const z of c.zones) {
    if (g.x < z.x0 || g.x > z.x1) continue;
    if (z.kind === 'up') { ty -= K.up; ph.inUp = true; }
    else if (g.y > z.ob.y) { ty += K.down; ph.inGust = true; }
  }
  if (ph.inUp && !ph.said.up) { ph.said.up = true; tthNews(st, 'Warm air rises: ride the rings up!', false, 3.5); Sfx.play('tthVinciWind'); }
  if (ph.inGust && !ph.said.gust) { ph.said.gust = true; tthVinciTip(st, S.id, 'gust', 'A storm gust! Hold ' + tthKey(S.id, 'up'), { cpu: 'A gust! Nose up!' }, 8); Sfx.play('tthVinciWind'); }
  g.vy = approach(g.vy, ty, K.accY * dt);
  g.v -= K.drag * g.v * dt;
  if (steer < 0) g.v -= (lift ? K.upSlow : K.flareSlow) * dt; else if (steer > 0) g.v += K.diveAcc * dt;
  if (ph.chase && ph.chase.in) g.v += K.chase.pull * dt;
  g.v = clamp(g.v, 0, K.vMax);
  g.x += g.v * dt; g.y += g.vy * dt;
  if (g.y < K.top) { g.y = K.top; if (g.vy < 0) g.vy = 0; }
  g.pitch = approach(g.pitch, clamp(g.vy / 520, -0.4, 0.45), dt * 2.6);
  // no lift for a while: tell the flapper
  g.noLiftT = lift ? 0 : g.noLiftT + dt;
  if (g.noLiftT > 0.7) tthVinciTip(st, F.id, 'flap', 'Flap! Tap ' + tthKey(F.id, 'act'), { cpu: g.tired > 0 ? 'Wings tired...' : 'Flap, flap!' }, 3.5);
  // the ground, roofs and the river
  const gy = Math.min(tthVinciGround(c, g.x - 14), tthVinciGround(c, g.x + 22));
  if (g.y + K.hh >= gy) {
    g.y = gy - K.hh;
    const land = tthVinciLand(c, g.x);
    if ((!lift && g.vy < 150) || g.v < K.landV) {   // gliding down or slow: a soft landing
      g.landed = true; g.vy = 0; Sfx.play('tthVinciLand'); puff(g.x, gy, 6, land === 'water' ? '#bfe8ff' : 'rgba(255,255,255,0.8)');
    } else tthVinciGroundBump(st, land);
  }
  // towers, washing, the dome, clouds and banners
  for (const ob of c.obs) {
    if (ob.x0 > g.x + K.hw + 2) break;
    if (ob.x1 < g.x - K.hw) { if (!ob.passed) { ob.passed = true; if (ob.minC < K.close) tthVinciCloseCall(st, ob); } continue; }
    const gap = tthVinciGap(ob, g.x, g.y);
    if (gap === null) continue;
    if (gap > 0) { ob.minC = Math.min(ob.minC, gap); continue; }
    if (g.safeT > 0) continue;
    if (g.x > ob.x0 + 6) {
      // over it (or under it) already: a bump and a bounce off, no pop-back
      const word = ob.kind === 'cloud' ? 'Zap!' : ob.kind === 'banner' ? 'Whap!' : ob.kind === 'wash' ? 'Twang!' : 'Bonk!';
      tthBump(st, { word, x: g.x + 10, y: g.y - 44, kind: ob.kind }); Sfx.play(ob.kind === 'cloud' ? 'tthVinciZap' : 'tthVinciCrash');
      tthVinciFeathers(ph, g.x, g.y, 6);
      g.y += gap * (ob.low ? 1 : -1); g.vy = ob.low ? -K.groundPop * 0.8 : 190; g.liftT = Math.max(g.liftT, 0.6); g.v *= 0.8; g.safeT = 0.35; ob.minC = 999; g.spin = ob.low ? 0.2 : -0.2;
      if (ph.chase && ph.chase.phase === 'dive') tthVinciDiveMiss(st);
    } else tthVinciCrash(st, ob);
    break;
  }
  tthVinciAfter(st, dt);
}
// what happens along the way while flying (and while sitting on the ground): pigeons, pages, the next perch, the chase
function tthVinciAfter(st, dt) {
  const ph = st.ph, K = TTHVINCI, g = ph.g, c = ph.c, s = tthStats(st);
  // the pages of the plans
  ph.streakT = Math.max(0, ph.streakT - dt);
  if (ph.streakT <= 0) ph.streak = 0;
  for (let i = ph.pi; i < c.pages.length; i++) {
    const q = c.pages[i];
    if (q.x > g.x + 80) break;
    if (q.x < g.x - 700) { ph.pi = i + 1; continue; }
    if (q.got || Math.abs(q.x - g.x) > K.page.rx || Math.abs(q.y - g.y + 6) > K.page.ry) continue;
    q.got = true; ph.got++; s.pages = ph.got; ph.streak++; ph.streakT = 2.2;
    g.en = Math.min(1, g.en + K.page.en);
    Sfx.play('tthVinciPage', ph.streak);
    for (let n = 0; n < 4; n++) tthVinciFxAdd(ph, 'spark', q.x, q.y, Math.cos(n * 1.6 + 0.4) * 90, Math.sin(n * 1.6 + 0.4) * 90, 0.4, n % 2 ? C.gold : '#ffffff');
    if (ph.streak > 0 && ph.streak % 10 === 0) tthPop(st, q.x + 40, q.y - 84, ph.streak + ' in a row!', C.gold, 17);
  }
  // the next tower to land on: the machine glides in by itself
  const P = ph.stage < 2 ? c.perches[ph.stage] : null;
  if (P && ph.mode === 'fly' && !g.bounce && g.x >= P.x - K.perch.reach) {
    ph.mode = 'toPerch';
    ph.app = { x0: g.x, y0: g.y, x1: P.x, y1: P.y - K.hh, t: 0, T: clamp((P.x - g.x) / K.perch.v, 1.1, 2.6), hop: g.landed ? 1 : 0.3, beat: 0 };
    g.landed = false; g.bounce = null;
    tthNews(st, 'Land on the tower with the gold flag!', true, 2.6);
    return;
  }
  if (ph.chase && ph.mode === 'fly') tthVinciChase(st, dt);
}

// the pigeons (every mode, so a flock never hangs in the air; they only bump a flying machine)
function tthVinciFlocks(st, dt) {
  const ph = st.ph, K = TTHVINCI, g = ph.g, c = ph.c;
  ph.shooCd = Math.max(0, ph.shooCd - dt); ph.tootT = Math.max(0, ph.tootT - dt);
  for (const f of c.flocks) {
    if (f.state === 0) {
      if (g.x > f.x - K.flock.lead && ph.mode === 'fly' && !tthCalm(st)) {
        f.state = 1; f.t = 0; Sfx.play('tthVinciBirds');
        const b = st.thief; b.pose = 'point'; ph.pointT = 1.6;
        tthSay(st, f.i === 0 ? 'Pigeons! Go and peck them!' : f.i === 1 ? 'More pigeons! Shoo them at THEM!' : 'Fly, my pretties!', 2.2);
        const id = 1 - ph.flap;
        tthVinciTip(st, id, 'birds', 'Pigeons! Dodge, or shoo them: ' + tthKey(id, 'act'), { cpu: 'Pigeons! I\'ll shoo them!' }, 2);
      }
      continue;
    }
    if (f.state >= 4) continue;
    f.t += dt;
    if (f.state === 1) { f.wx = st.cam.x + W + 70; if (f.t >= K.flock.warn) { f.state = 2; f.t = 0; } continue; }
    f.wx -= K.flock.v * dt;
    if (f.state === 3) { if (f.t > 1.6) f.state = 4; continue; }
    if (f.wx < st.cam.x - 160) { f.state = 4; continue; }
    if (ph.mode === 'fly' && g.safeT <= 0 && !g.bounce && Math.abs(f.wx - g.x) < K.flock.hw && Math.abs(f.y - g.y) < ph.flockR + K.hh - 4) {
      f.state = 3; f.t = 0;
      tthBump(st, { word: 'Squawk!', x: g.x + 10, y: g.y - 44, kind: 'birds' }); Sfx.play('tthVinciBirds'); Sfx.play('tthVinciCrash');
      tthVinciFeathers(ph, g.x + 20, g.y, 12, '#e9edf5');
      g.v *= K.flock.slow; g.spin = 0.3; g.safeT = 0.4;
      if (++ph.birdHits === K.gold.birds) { ph.flockR = K.flock.goldR; tthHelp(st, 'Gold crumbs! The flocks are smaller now.', {}); }
    }
  }
}

/* ---------- stretch 3: the chase, the slipstream and the dive ---------- */
function tthVinciChaseStart(st) {
  const ph = st.ph, K = TTHVINCI.chase;
  ph.chase = { phase: 'tail', m: 0, t: 0, in: false, inT: 0, tol: K.tol, far: K.far, miss: 0, grab: K.grab, magnet: false, lead: false, full: false, gold: false, wt: 0, vx: 0, humT: 0, hum: 0, zip: 0, diveT: 0 };
  tthSay(st, 'Catch me if you can! Ha ha!', 2.4);
  tthNews(st, 'Stay close behind his jet, in his slipstream!', false, 4.5);
}
function tthVinciChase(st, dt) {
  const ph = st.ph, K = TTHVINCI, CH = K.chase, g = ph.g, ch = ph.chase, b = st.thief;
  ch.t += dt;
  if (ch.phase === 'tail') {
    const wk = tthVinciWake(st), dx = wk.x - g.x;
    const was = ch.in;
    ch.in = !g.landed && !g.bounce && dx > CH.near - 30 && dx < ch.far && Math.abs(g.y - wk.y) < ch.tol;
    if (ch.in) {
      ch.inT += dt;
      if (!ch.full) ch.m = Math.min(1, ch.m + dt / CH.need);
      if ((ch.humT -= dt) <= 0) { ch.humT = 0.45; Sfx.play('tthVinciSlip', Math.floor(ch.m * 8)); }
      if (!was && !ph.said.slip) { ph.said.slip = true; tthReact(st, 'shocked', 'Hey! Get out of my slipstream!', 1.8); }
      if (ch.m > 0.55 && !ph.said.tail) { ph.said.tail = true; tthSay(st, 'Stop tailgating me! Shoo!', 2); }
    } else {
      if (!ch.full && !ch.gold) ch.m = Math.max(0, ch.m - CH.drain * dt);
      const id = 1 - ph.flap, hi = g.y > wk.y;
      if (ch.full) { /* full: nothing to say, just keep up */ }
      else if (dx > 0 && dx < ch.far + 80 && Math.abs(g.y - wk.y) >= ch.tol) tthVinciTip(st, id, 'tail', (hi ? 'Up' : 'Down') + ' a bit! Get behind his jet', { cpu: 'Getting behind him!' }, 5);
      else if (dx >= ch.far + 80) tthVinciTip(st, ph.flap, 'tailF', 'Keep flapping! Catch up!', { cpu: 'Catching up!' }, 6);
    }
    if (!ch.gold && ch.t > CH.goldAfter && ch.m < 0.5) {
      ch.gold = true; ch.tol = CH.goldTol; ch.far = CH.far + 80;
      tthHelp(st, 'Gold slipstream! It is wider now and never fades.', { id: 1 - ph.flap, hint: 'Fly into the gold streaks' });
    }
    if (ch.m >= 1 && !ch.full) { ch.full = true; tthPop(st, g.x, g.y - 70, 'Slipstream full!', C.gold, 22); Sfx.play('tthGold'); if (b.x < ph.c.X[2] + CH.open - 400) tthNews(st, 'Slipstream full! Stay on his tail to the piazza!', true, 4); }
    if (ch.full && b.x > ph.c.X[2] + CH.open && !g.bounce) {
      ch.phase = 'dive'; ch.diveT = 0; ch.in = false; ch.lead = true;
      tthReact(st, 'shocked', 'Uh-oh! My jet is out of puff!', 2.2);
      tthNews(st, 'His jet sputters! Dive under him and grab the plans!', true, 4.5);
      Sfx.play('tthVinciDive');
      tthHint(st, 1 - ph.flap, 'DIVE! Hold ' + tthKey(1 - ph.flap, 'down'), { cpu: 'I dive!', life: 3.5 });
      tthHint(st, ph.flap, 'Flap! Catch him!', { cpu: 'Flap, flap!', life: 3.5 });
    }
    return;
  }
  // the dive: fly through the plans case under his machine
  ch.diveT += dt;
  const cl = tthVinciClaw(st), dx = cl.x - (g.x + 22), dy = cl.y - g.y;
  if (!ch.zip && (ch.magnet ? Math.abs(dx) < CH.magnet : dx * dx + dy * dy < ch.grab * ch.grab)) { tthVinciSnatch(st); return; }
  if (!ch.zip && g.x > b.x + 90) tthVinciDiveMiss(st);
  else if (!ch.zip && ch.diveT > 3) tthVinciTip(st, 1 - ph.flap, 'dive', (g.y > cl.y ? 'Up a bit!' : 'Dive! Hold ' + tthKey(1 - ph.flap, 'down') + '.') + ' Fly into the plans!', { cpu: 'Going for the plans!' }, 4);
}
function tthVinciDiveMiss(st) {
  const ph = st.ph, ch = ph.chase, K = TTHVINCI;
  if (!ch || ch.phase !== 'dive' || ch.zip) return;
  if (ch.magnet) { tthVinciTip(st, ph.flap, 'magnet', 'Flap! Fly past him', { cpu: 'Flap, flap!' }, 3); return; }   // (gold magnet: he stays put)
  ch.miss++; ch.zip = 1; ch.diveT = 0; tthStats(st).diveMiss = ch.miss;
  tthReact(st, 'happy', ch.miss % 2 ? 'Ha! Missed me!' : 'Too slow! Ha ha!', 1.8);
  if (ch.miss === K.gold.dive) { ch.grab = K.chase.goldGrab; tthHelp(st, 'Gold claw! The plans are easier to grab now.', { id: 1 - ph.flap, hint: 'Dive under his machine' }); }
  else if (ch.miss === K.gold.dive2) { ch.grab = K.chase.goldGrab2; tthHelp(st, 'Bigger gold claw! Fly anywhere near the plans.', { id: 1 - ph.flap, hint: 'Fly close to him' }); }
  else if (ch.miss === K.gold.dive3) { ch.magnet = true; tthHelp(st, 'Gold magnet! Just fly past him: the plans jump over.', { id: ph.flap, hint: 'Flap! Fly past him' }); }
  else tthHint(st, 1 - ph.flap, 'Again! Dive under his machine', { cpu: 'Again!' });
}
function tthVinciSnatch(st) {
  const ph = st.ph, g = ph.g, b = st.thief;
  ph.mode = 'won'; ph.wonT = 0; g.has = true; b.item = null; ph.chase.phase = 'done'; ph.chase.in = false;
  tthStats(st).stretch.push(Math.round((st.phT - ph.stageT0) * 10) / 10);
  tthReact(st, 'shocked', 'MY plans! Give them back!', 1.5); b.pose = 'shock'; b.hitT = 0.6;
  tthPop(st, g.x + 20, g.y - 70, 'Got the plans!', C.gold, 28);
  Sfx.play('tthVinciSnatch'); tthCelebrate(st, 1.5);
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.25);
  for (let n = 0; n < 10; n++) tthVinciFxAdd(ph, 'page', g.x + 30, g.y, 60 + n * 22, -120 + n * 20, 1.6, '#f0deb0');
  for (let n = 0; n < 16; n++) confetti(g.x + 20, g.y - 10);
  st.hints[0] = st.hints[1] = null;
}
// after the snatch (and during the portal cutscene): the machine flies itself, slow and level
function tthVinciAuto(st, dt) {
  const g = st.ph.g, K = TTHVINCI;
  g.wingT += dt; g.beatT += dt;
  if (g.wingT > 0.6) g.wingT = 0;
  g.v = approach(g.v, 46, 220 * dt); g.x += g.v * dt;
  const want = clamp((300 - g.y) * 2, -130, 90);
  g.vy = approach(g.vy, want, 400 * dt); g.y += g.vy * dt;
  g.pitch = approach(g.pitch, clamp(g.vy / 520, -0.3, 0.3), dt * 2); g.spin = approach(g.spin, 0, dt); g.liftT = 1; g.landed = false; g.en = Math.min(1, g.en + dt);
}
function tthVinciWon(st, dt) {
  const ph = st.ph, b = st.thief;
  ph.wonT += dt;
  tthVinciAuto(st, dt);
  if (ph.wonT > 1.5 && b.x > st.cam.x + 420 && b.x < st.cam.x + W - 90)
    tthPhaseDone(st, { say: 'Bah! Flying machines will NEVER catch on!', portal: { x: st.cam.x + W - 130, y: 210 } });
}

/* ---------- the Thief: ahead on the trail with the plans; in stretch 3 just in front, weaving ---------- */
function tthVinciThief(st, dt) {
  const ph = st.ph, K = TTHVINCI, CH = K.chase, g = ph.g, c = ph.c, b = st.thief, ch = ph.chase;
  if (ph.pointT > 0 && (ph.pointT -= dt) <= 0 && b.pose === 'point') b.pose = 'idle';
  const flying = ph.mode === 'fly' || ph.mode === 'toPerch';
  if (ph.mode === 'won') {
    b.flame = approach(b.flame, 1, dt * 2); b.claw = approach(b.claw, 0.3, dt);
    const tx = st.cam.x + 690, ty = 290;
    b.x += clamp(tx - b.x, -260 * dt, 320 * dt); b.y += clamp(ty - b.y, -160 * dt, 160 * dt); b.face = 1;
    if (ph.wonT > 0.9 && b.pose === 'shock') b.pose = 'dizzy';
    return;
  }
  if (ch && ch.phase !== 'done' && ph.mode === 'fly') {
    // the chase: he keeps about chase.gap px ahead and never leaves the screen
    const gap = b.x - g.x, dive = ch.phase === 'dive';
    let vx = dive ? CH.diveV : CH.v;
    if (ch.zip) { vx = g.v + 300; if (gap > CH.diveGap) ch.zip = 0; }
    else if (ch.lead) { vx = g.v + 220; if (gap > CH.diveGap) ch.lead = false; }   // (he pulls ahead first: time to line up the dive)
    else if (dive) {   // his jet has less and less puff, and he hovers while the machine sits on the ground: a slow pair catches him too
      vx = g.landed || g.bounce ? (gap > 330 ? 0 : 70) : gap > 420 ? 60 : Math.max(CH.diveSlow, CH.diveV - CH.diveFade * Math.max(0, ch.diveT - CH.diveHold));
    }
    else if (g.landed || g.bounce) vx = gap > 330 ? 0 : 90;
    else if (gap > CH.gap + 60) vx = Math.max(50, Math.min(vx, g.v - 60));
    else if (gap < CH.gap - 70) vx = Math.max(vx, g.v + 60);
    if (gap > 560) vx = 0;
    ch.vx = approach(ch.vx, vx, 420 * dt); b.x += ch.vx * dt;
    if (!dive) b.x = Math.max(b.x, g.x + 60);                  // (in the dive the machine flies under him, and may fly past: a miss)
    // his height: the trail, with a weave where the sky is open
    let near = 9999;
    for (const ob of c.obs) { if (ob.k < 2) continue; near = Math.min(near, Math.max(0, ob.x0 - b.x - 40, b.x - ob.x1 - 40)); }
    if (!g.landed) ch.wt += dt;
    const wv = clamp((near - 160) / 220, 0, 1) * CH.weaveA * Math.sin(ch.wt * Math.PI * 2 / CH.weaveT);
    const ty = dive ? (ch.zip ? CH.diveY - 60 : CH.diveY) : tthVinciPath(c, b.x) + 34 * b.s + wv;
    b.y += clamp(ty - b.y, -(dive ? 150 : CH.maxVy) * dt, (dive ? 150 : CH.maxVy) * dt);
    b.face = 1; b.s = approach(b.s, 0.62, dt * 0.2);
    b.flame = approach(b.flame, dive && !ch.zip ? 0.3 + 0.25 * Math.max(0, Math.sin(ph.t * 13)) : 1, dt * 3);
    b.claw = approach(b.claw, dive ? 1 : 0.55, dt * 1.5);
    if (b.pose !== 'point' && b.moodT <= 0) b.pose = dive ? 'shock' : ch.in ? 'shock' : 'idle';
    return;
  }
  // stretches 1 and 2 (and on the perches): well ahead, at the right of the screen
  const tx = flying ? st.cam.x + 800 + Math.sin(ph.t * 0.7) * 22 : ph.perch.x + (ph.stage === 0 ? 590 : 540);
  b.x += (tx - b.x) * Math.min(1, dt * 4);
  const ty = tthVinciPath(c, b.x) + 50 + Math.sin(ph.t * 1.9) * 5;
  b.y += clamp(ty - b.y, -300 * dt, 300 * dt);
  b.face = flying ? 1 : -1; b.s = approach(b.s, 0.55, dt * 0.2); b.flame = flying ? 1 : 0.6; b.claw = 0.45;
  if (b.pose !== 'point' && b.moodT <= 0) b.pose = flying ? 'idle' : (ph.t % 6 < 3 ? 'laugh' : 'idle');
  // loose pages flutter out of his claw
  if (flying && (ph.looseT -= dt) <= 0) { ph.looseT = 0.8; const P = tthVinciClaw(st); tthVinciFxAdd(ph, 'page', P.x, P.y, -60, -30, 1.1, '#f0deb0'); }
}

/* ---------- drawing: the sky and the far layers (screen coords) ---------- */
const TTHVINCI_COL = { canvas: '#f6e8c6', canvasDk: '#dcc692', wood: '#b57a3c', woodDk: '#7a4a1e', roof: '#cf6a45', roofDk: '#a84f33',
  wall: ['#f2dcae', '#eccf9a', '#f6e6c4', '#e8c48e'], stone: '#c9c0ae', stoneDk: '#9f9684', grass: '#86c25c', grassDk: '#5f9f45', water: '#62b6dc', cloud: '#5d5a7a', cloudDk: '#484563' };
function tthVinciDrawSky(st) {
  const ph = st.ph, cam = st.cam.x, t = G.clock, city = clamp((cam + 480 - (ph.c.X[1] - 1000)) / 800, 0, 1);
  tthSky('#79c3ee', '#ffe9c6', 0, 440);
  ctx.fillStyle = '#ffe9c6'; ctx.fillRect(0, 440, W, H - 440);
  ctx.fillStyle = 'rgba(255,246,208,0.45)'; circle(800, 168, 62); ctx.fill();
  ctx.fillStyle = '#fff6cf'; circle(800, 168, 38); ctx.fill();
  for (let k = 0; k < 5; k++) {
    const x = (((k * 310 - cam * 0.05 - t * 4) % 1550) + 1550) % 1550 - 240, y = 150 + (k * 67) % 130, s = 0.8 + (k % 3) * 0.25;
    drawCloud(x, y, s);
  }
  // far blue hills
  ctx.fillStyle = '#b3d6d0'; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 24) { const u = x + cam * 0.1; ctx.lineTo(x, 356 - 34 * Math.sin(u * 0.0061) - 16 * Math.sin(u * 0.0147 + 2)); }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  // nearer hills, with little cypress trees
  const off = cam * 0.3;
  ctx.fillStyle = '#a5cf86'; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 20) { const u = x + off; ctx.lineTo(x, 410 - 26 * Math.sin(u * 0.0052 + 1) - 12 * Math.sin(u * 0.0131)); }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6fa36a';
  for (let i = Math.floor(off / 130); i * 130 < off + W + 60; i++) {
    const h = hash(i, 31), u = i * 130 + (h % 80), x = u - off, y = 410 - 26 * Math.sin(u * 0.0052 + 1) - 12 * Math.sin(u * 0.0131), hh = 16 + (h % 12);
    ctx.beginPath(); ctx.ellipse(x, y - hh / 2, 4.5, hh / 2 + 2, 0, 0, Math.PI * 2); ctx.fill();
    if (h % 5 === 0) { ctx.fillStyle = '#f3e2bd'; ctx.fillRect(x + 12, y - 9, 16, 10); ctx.fillStyle = '#c9785a'; ctx.beginPath(); ctx.moveTo(x + 10, y - 9); ctx.lineTo(x + 20, y - 16); ctx.lineTo(x + 30, y - 9); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#6fa36a'; }
  }
  // the city's far skyline
  if (city > 0) {
    ctx.save(); ctx.globalAlpha = city;
    for (let i = Math.floor(off / 58); i * 58 < off + W + 60; i++) {
      const h = hash(i, 77), x = i * 58 - off, tall = h % 9 === 0, hh = tall ? 120 + (h % 40) : 44 + (h % 50), y = 470 - hh, w = tall ? 22 : 54;
      ctx.fillStyle = ['#ecd3ab', '#e3c193', '#f0dcb8'][h % 3]; ctx.fillRect(x + (58 - w) / 2, y, w, hh + 80);
      ctx.fillStyle = '#d58a66';
      if (tall) ctx.fillRect(x + (58 - w) / 2 - 3, y - 5, w + 6, 6);
      else { ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x + 29, y - 12 - (h % 7)); ctx.lineTo(x + 60, y); ctx.closePath(); ctx.fill(); }
    }
    ctx.restore();
  }
}

/* ---------- drawing: the ground under the machine (world coords) ---------- */
function tthVinciDrawGround(st) {
  const ph = st.ph, c = ph.c, K = TTHVINCI, CO = TTHVINCI_COL, cam = st.cam.x, x0 = cam - 30, x1 = cam + W + 30, t = G.clock;
  const hillsEnd = c.X[1] - 200, R = TTHVINCI_RIVER, rv0 = c.X[2] + R.x0, rv1 = c.X[2] + R.x1, pz0 = c.X[2] + R.p0;
  ctx.lineJoin = 'round';
  // the Tuscan hills
  if (x0 < hillsEnd) {
    const b = Math.min(x1, hillsEnd);
    ctx.fillStyle = CO.grass; ctx.beginPath(); ctx.moveTo(x0, H + 10);
    for (let x = x0; x < b + 8; x += 8) ctx.lineTo(Math.min(x, b), tthVinciHillY(c, Math.min(x, b)));
    ctx.lineTo(b, H + 10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = x0; x < b + 8; x += 8) ctx.lineTo(Math.min(x, b), tthVinciHillY(c, Math.min(x, b)));
    ctx.stroke();
    for (let i = Math.floor(x0 / 120); i * 120 < b; i++) {
      const h = hash(i, 5), x = i * 120 + (h % 90), y = tthVinciHillY(c, x), kind = h % 4;
      if (x < 320 || x > hillsEnd - 40) continue;
      if (kind < 2) {   // a cypress
        const hh = 26 + (h % 16);
        ctx.fillStyle = '#7a5a34'; ctx.fillRect(x - 1.5, y - 6, 3, 8);
        ctx.fillStyle = '#3f8a4a'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - 4 - hh / 2, 6.5, hh / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else if (kind === 2) {   // poppies
        for (let n = 0; n < 4; n++) { ctx.fillStyle = n % 2 ? '#ff6b5a' : '#ffd23f'; circle(x + n * 9 - 14, y + 9 + (n % 2) * 6, 2.6); ctx.fill(); }
      } else {   // rows of vines
        ctx.strokeStyle = CO.grassDk; ctx.lineWidth = 2;
        for (let n = 0; n < 3; n++) { ctx.beginPath(); ctx.moveTo(x - 30, y + 14 + n * 12); ctx.quadraticCurveTo(x, y + 8 + n * 12, x + 30, y + 14 + n * 12); ctx.stroke(); }
      }
    }
  }
  // the rooftops of Florence
  for (const [lo, hi] of [[hillsEnd, rv0], [rv1, pz0]]) {
    const rf0 = Math.max(x0, lo), rf1 = Math.min(x1, hi);
    if (rf0 >= rf1) continue;
    for (let i = Math.floor(rf0 / 96); i * 96 < rf1; i++) {
      const x = Math.max(i * 96, lo), xe = Math.min((i + 1) * 96, hi), y = tthVinciRoof(i * 96), h = hash(i, 9), w = xe - x;
      if (w <= 0) continue;
      ctx.fillStyle = CO.wall[h % 4]; ctx.fillRect(x, y + 10, w, H - y);
      ctx.strokeStyle = 'rgba(28,26,54,0.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y + 10, w, H - y);
      ctx.fillStyle = '#6f8f5a';
      for (let n = 0; n < 2; n++) { const wx = x + 18 + n * 40; if (wx + 14 < xe) { ctx.fillRect(wx, y + 26, 14, 18); ctx.fillStyle = '#4a3a2a'; ctx.fillRect(wx + 3, y + 29, 8, 12); ctx.fillStyle = '#6f8f5a'; } }
      ctx.fillStyle = CO.roof; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; rr(x - 2, y, w + 4, 15, 4); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = CO.roofDk; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let n = 10; n < w; n += 12) { ctx.moveTo(x + n, y + 3); ctx.lineTo(x + n, y + 12); }
      ctx.stroke();
    }
  }
  // the river Arno and the old bridge
  if (x1 > rv0 && x0 < rv1) {
    const a = Math.max(x0, rv0), b = Math.min(x1, rv1), b0 = c.X[2] + R.b0, b1 = c.X[2] + R.b1;
    ctx.fillStyle = CO.water; ctx.fillRect(a, K.water, b - a, H - K.water + 10);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a, K.water); ctx.lineTo(b, K.water); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
    for (let i = Math.floor(a / 70); i * 70 < b; i++) { const x = i * 70 + ((t * 26) % 70), y = K.water + 12 + (i % 3) * 11; if (x < a + 4 || x > b - 26) continue; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 10, y - 4, x + 22, y); ctx.stroke(); }
    if (x1 > b0 - 20 && x0 < b1 + 20) {
      ctx.fillStyle = CO.stone; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillRect(b0, K.bridge + 36, b1 - b0, H); ctx.strokeRect(b0, K.bridge + 36, b1 - b0, H);
      ctx.fillStyle = '#3d7f9e';
      for (let n = 0; n < 3; n++) { const ax = b0 + 28 + n * 124; ctx.beginPath(); ctx.moveTo(ax, H + 6); ctx.lineTo(ax, K.water - 4); ctx.quadraticCurveTo(ax + 48, K.water - 52, ax + 96, K.water - 4); ctx.lineTo(ax + 96, H + 6); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      for (let n = 0; n < 5; n++) {   // the little shops on the bridge
        const sx = b0 + n * 80;
        ctx.fillStyle = CO.wall[(n + 1) % 4]; ctx.fillRect(sx, K.bridge + 10, 80, 28); ctx.strokeRect(sx, K.bridge + 10, 80, 28);
        ctx.fillStyle = '#4a3a2a'; ctx.fillRect(sx + 14, K.bridge + 18, 12, 12); ctx.fillRect(sx + 50, K.bridge + 18, 12, 12);
        ctx.fillStyle = CO.roof; rr(sx - 2, K.bridge, 84, 13, 4); ctx.fill(); ctx.stroke();
      }
    }
  }
  // the piazza, with the townsfolk cheering
  if (x1 > pz0) {
    const a = Math.max(x0, pz0), cheer = ph.mode === 'won' || (ph.chase && ph.chase.phase === 'dive');
    ctx.fillStyle = '#ead8b0'; ctx.fillRect(a, K.ground, x1 - a, H - K.ground + 10);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a, K.ground); ctx.lineTo(x1, K.ground); ctx.stroke();
    ctx.strokeStyle = 'rgba(138,110,70,0.4)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = Math.floor(a / 60); i * 60 < x1; i++) { const x = i * 60; if (x > a) { ctx.moveTo(x, K.ground + 4); ctx.lineTo(x - 16, H); } }
    ctx.moveTo(a, K.ground + 24); ctx.lineTo(x1, K.ground + 24); ctx.stroke();
    for (let i = Math.floor(a / 46); i * 46 < x1; i++) {
      const h = hash(i, 21), x = i * 46 + (h % 30);
      if (h % 3 === 0 || x < a + 10) continue;
      const hop = cheer ? Math.abs(Math.sin(t * 7 + i)) * 5 : 0, y = K.ground + 18 + (h % 3) * 9 - hop;
      ctx.fillStyle = ['#d9534f', '#4f8fd9', '#58a85c', '#e0a030', '#9a6fd0'][h % 5]; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
      rr(x - 5, y - 10, 10, 13, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f3d9b8'; circle(x, y - 14, 4.5); ctx.fill(); ctx.stroke();
      if (cheer) { ctx.beginPath(); ctx.moveTo(x - 5, y - 7); ctx.lineTo(x - 9, y - 16); ctx.moveTo(x + 5, y - 7); ctx.lineTo(x + 9, y - 16); ctx.stroke(); }
    }
  }
  // Leonardo's workshop (the start) and the two perch towers
  const S = K.start;
  if (x0 < S.x1 + 40) {
    ctx.fillStyle = '#ecd9b0'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillRect(S.x0 + 8, S.y + 10, S.x1 - S.x0 - 16, H); ctx.strokeRect(S.x0 + 8, S.y + 10, S.x1 - S.x0 - 16, H);
    ctx.fillStyle = '#8a5a2a'; rr(S.x0 + 70, S.y + 70, 40, 80, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9fd3e6'; circle(S.x0 + 180, S.y + 62, 16); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(S.x0 + 164, S.y + 62); ctx.lineTo(S.x0 + 196, S.y + 62); ctx.moveTo(S.x0 + 180, S.y + 46); ctx.lineTo(S.x0 + 180, S.y + 78); ctx.stroke();
    ctx.fillStyle = CO.wood; rr(S.x0, S.y, S.x1 - S.x0, 13, 4); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = CO.woodDk; ctx.lineWidth = 1.5; ctx.beginPath(); for (let x = S.x0 + 20; x < S.x1; x += 22) { ctx.moveTo(x, S.y + 2); ctx.lineTo(x, S.y + 11); } ctx.stroke();
    tthVinciDrawLeo(S.x0 + 34, S.y, ph);
  }
  for (const P of c.perches) {
    if (P.x + 90 < x0 || P.x - 90 > x1) continue;
    const bell = P.k === 1;
    ctx.fillStyle = bell ? '#f4efe2' : CO.stone; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.fillRect(P.x - 50, P.y + 10, 100, H); ctx.strokeRect(P.x - 50, P.y + 10, 100, H);
    if (bell) { ctx.fillStyle = '#6fa08a'; for (let y = P.y + 40; y < H; y += 44) ctx.fillRect(P.x - 48, y, 96, 8); ctx.fillStyle = '#c96a6a'; for (let y = P.y + 62; y < H; y += 44) ctx.fillRect(P.x - 48, y, 96, 4); }
    else { ctx.fillStyle = CO.stoneDk; for (let n = 0; n < 8; n++) ctx.fillRect(P.x - 40 + (n % 2) * 44 + ((n >> 1) % 2) * 10, P.y + 34 + n * 22, 22, 7); }
    ctx.fillStyle = '#3d3552'; rr(P.x - 12, P.y + 48, 24, 40, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = CO.wood; rr(P.x - 66, P.y, 132, 13, 4); ctx.fill(); ctx.stroke();
    // the gold flag: the checkpoint
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(P.x + 58, P.y); ctx.lineTo(P.x + 58, P.y - 66); ctx.stroke();
    const wv = Math.sin(t * 5 + P.x) * 4;
    ctx.fillStyle = C.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P.x + 58, P.y - 66); ctx.quadraticCurveTo(P.x + 78, P.y - 70 + wv, P.x + 96, P.y - 56 + wv); ctx.quadraticCurveTo(P.x + 78, P.y - 50 + wv, P.x + 58, P.y - 44); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}
// Leonardo himself, waving from his workshop roof (he cheers once his machine really flies)
function tthVinciDrawLeo(x, y, ph) {
  const t = G.clock, fly = ph.leoT > 0, hop = fly ? Math.abs(Math.sin(t * 6)) * 6 : 0;
  ctx.save(); ctx.translate(x, y - hop); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.fillStyle = '#a8403a'; ctx.beginPath(); ctx.moveTo(-9, -34); ctx.lineTo(9, -34); ctx.lineTo(15, 0); ctx.lineTo(-15, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  const wave = Math.sin(t * (fly ? 12 : 7)) * 0.4;
  ctx.strokeStyle = '#a8403a'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(8, -30); ctx.lineTo(8 + Math.cos(-1.1 + wave) * 18, -30 + Math.sin(-1.1 + wave) * 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-8, -30); if (fly) ctx.lineTo(-8 - Math.cos(-1.1 + wave) * 18, -30 + Math.sin(-1.1 + wave) * 18); else ctx.lineTo(-13, -14); ctx.stroke();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.fillStyle = '#f3d9b8'; circle(0, -44, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f4f1ea'; ctx.beginPath(); ctx.moveTo(-9, -42); ctx.quadraticCurveTo(0, -36, 9, -42); ctx.quadraticCurveTo(7, -22, 0, -14); ctx.quadraticCurveTo(-7, -22, -9, -42); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#5a3a6a'; ctx.beginPath(); ctx.moveTo(-11, -48); ctx.quadraticCurveTo(0, -64, 12, -49); ctx.quadraticCurveTo(0, -53, -11, -48); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.ink; circle(-3, -46, 1.5); ctx.fill(); circle(4, -46, 1.5); ctx.fill();
  ctx.restore();
}

/* ---------- drawing: towers, washing, the dome, clouds, banners, air, pages (world coords) ---------- */
function tthVinciDrawObs(st) {
  const ph = st.ph, c = ph.c, K = TTHVINCI, CO = TTHVINCI_COL, cam = st.cam.x, t = G.clock;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // warm updrafts (rising rings) and storm gusts (slanted rain)
  for (const z of c.zones) {
    if (z.x1 < cam - 20 || z.x0 > cam + W + 20) continue;
    const cx = (z.x0 + z.x1) / 2, w = z.x1 - z.x0;
    if (z.kind === 'up') {
      const gy = tthVinciGround(c, cx);
      for (let i = 0; i < 6; i++) {
        const u = ((t * 0.34 + i / 6) % 1), y = gy - u * (gy - 90), a = Math.sin(u * Math.PI) * 0.75;
        ctx.strokeStyle = `rgba(255,236,170,${a})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(cx + Math.sin(u * 9 + i) * 10, y, w * (0.26 + 0.2 * u), 9, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,236,170,0.8)';
      for (let i = 0; i < 3; i++) { const u = ((t * 0.5 + i / 3) % 1), y = gy - 30 - u * 250, x = cx + (i - 1) * w * 0.26; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + 8, y + 2); ctx.lineTo(x - 8, y + 2); ctx.closePath(); ctx.fill(); }
    } else {
      const y0 = z.ob.y, gy = tthVinciGround(c, cx);
      ctx.strokeStyle = 'rgba(214,236,255,0.7)'; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let i = 0; i < 12; i++) { const u = ((t * 1.3 + i * 0.283) % 1), x = z.x0 + ((i * 53) % w), y = y0 + u * (gy - y0 - 20); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 20); }
      ctx.stroke();
    }
  }
  for (const ob of c.obs) {
    if (ob.x1 < cam - 60 || ob.x0 > cam + W + 60) continue;
    const x = ob.x0, w = ob.x1 - ob.x0, cx = x + w / 2, y = ob.y;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
    if (ob.kind === 'tower') {
      const st2 = ob.style;
      if (st2 === 'mill') {
        ctx.fillStyle = '#f4ead2'; ctx.beginPath(); ctx.moveTo(x + 5, y + 2); ctx.lineTo(x + w - 5, y + 2); ctx.lineTo(x + w + 2, H + 10); ctx.lineTo(x - 2, H + 10); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = CO.roof; rr(x + 1, y, w - 2, 12, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#4a3a2a'; rr(cx - 7, y + 84, 14, 22, 7); ctx.fill();
        ctx.save(); ctx.translate(cx, y + 44); ctx.rotate(t * 1.4);
        for (let n = 0; n < 4; n++) { ctx.rotate(Math.PI / 2); ctx.fillStyle = CO.canvas; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(4, -30); ctx.lineTo(14, -28); ctx.lineTo(6, -2); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = CO.woodDk; circle(0, 0, 4); ctx.fill(); ctx.restore();
      } else {
        const col = st2 === 'castle' ? CO.stone : st2 === 'bell' ? '#f4efe2' : st2 === 'palace' ? '#d2ab7e' : '#e3b877';
        ctx.fillStyle = col; ctx.fillRect(x, y + 6, w, H); ctx.strokeRect(x, y + 6, w, H);
        if (st2 === 'castle' || st2 === 'palace') {
          const n = Math.max(3, Math.round(w / 20)), mw = (w + 8) / (n * 2 - 1);
          for (let i = 0; i < n; i++) { ctx.fillStyle = col; ctx.fillRect(x - 4 + i * mw * 2, y, mw, 16); ctx.strokeRect(x - 4 + i * mw * 2, y, mw, 16); }
          ctx.fillRect(x - 5, y + 14, w + 10, 12); ctx.strokeRect(x - 5, y + 14, w + 10, 12);
          ctx.fillStyle = st2 === 'castle' ? CO.stoneDk : '#b08a5e';
          for (let n2 = 0; n2 < 6; n2++) ctx.fillRect(x + 8 + (n2 % 2) * (w - 34), y + 42 + n2 * 30, 16, 6);
          ctx.fillStyle = '#3d3552'; rr(cx - 4, y + 44, 8, 22, 4); ctx.fill();
          if (st2 === 'palace') { tthClockFace(cx, y + 96, 13, t, { speed: 0.5, ticks: true, lw: 2.5 }); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; }
        } else if (st2 === 'bell') {
          ctx.fillStyle = '#6fa08a'; for (let yy = y + 64; yy < H; yy += 40) ctx.fillRect(x + 2, yy, w - 4, 7);
          ctx.fillStyle = CO.roof; rr(x - 4, y, w + 8, 12, 4); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#3d3552'; rr(cx - 12, y + 22, 24, 30, 12); ctx.fill(); ctx.stroke();
          ctx.fillStyle = C.gold; ctx.lineWidth = 2; ctx.save(); ctx.translate(cx, y + 30); ctx.rotate(Math.sin(t * 3) * 0.3); ctx.beginPath(); ctx.moveTo(-6, 14); ctx.quadraticCurveTo(-6, 0, 0, 0); ctx.quadraticCurveTo(6, 0, 6, 14); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
        } else {
          ctx.fillStyle = CO.roof; rr(x - 5, y, w + 10, 13, 4); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#4a3a2a'; for (let yy = y + 30; yy < H - 40; yy += 46) { rr(cx - 7, yy, 14, 20, 7); ctx.fill(); }
          ctx.strokeStyle = 'rgba(122,74,30,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let yy = y + 22; yy < H; yy += 46) { ctx.moveTo(x + 3, yy); ctx.lineTo(x + w - 3, yy); } ctx.stroke();
        }
      }
    } else if (ob.kind === 'wash') {
      const gy = tthVinciRoof(cx);
      ctx.strokeStyle = CO.woodDk; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + 5, H); ctx.lineTo(x + 5, y); ctx.moveTo(x + w - 5, H); ctx.lineTo(x + w - 5, y); ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      ctx.fillStyle = CO.wood; circle(x + 5, y, 5); ctx.fill(); ctx.stroke(); circle(x + w - 5, y, 5); ctx.fill(); ctx.stroke();
      for (let ly = y + 6, row = 0; ly < gy - 30; ly += 40, row++) {
        ctx.strokeStyle = '#6b4630'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 5, ly); ctx.quadraticCurveTo(cx, ly + 9, x + w - 5, ly); ctx.stroke();
        const n = Math.floor((w - 30) / 36);
        for (let i = 0; i < n; i++) {
          const h = hash(i + row * 7, Math.floor(x)), px = x + 22 + i * 36, u = (px - x) / w, py = ly + 9 * 4 * u * (1 - u) + 1, sw = Math.sin(t * 2.4 + i + row) * 2;
          ctx.fillStyle = ['#ff8fc7', '#ffffff', '#7fd6ff', '#ffd23f', '#9fe07f', '#ff9f6b'][h % 6]; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
          if (h % 3 === 0) { ctx.beginPath(); ctx.moveTo(px - 12, py); ctx.lineTo(px + 12, py); ctx.lineTo(px + 12 + sw, py + 30); ctx.lineTo(px - 12 + sw, py + 30); ctx.closePath(); ctx.fill(); ctx.stroke(); }
          else if (h % 3 === 1) { ctx.beginPath(); ctx.moveTo(px - 14, py); ctx.lineTo(px + 14, py); ctx.lineTo(px + 12, py + 9); ctx.lineTo(px + 8, py + 8); ctx.lineTo(px + 8 + sw, py + 26); ctx.lineTo(px - 8 + sw, py + 26); ctx.lineTo(px - 8, py + 8); ctx.lineTo(px - 12, py + 9); ctx.closePath(); ctx.fill(); ctx.stroke(); }
          else { ctx.beginPath(); ctx.moveTo(px - 8, py); ctx.lineTo(px + 8, py); ctx.lineTo(px + 9 + sw, py + 28); ctx.lineTo(px + 1 + sw, py + 28); ctx.lineTo(px, py + 12); ctx.lineTo(px - 1 + sw, py + 28); ctx.lineTo(px - 9 + sw, py + 28); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        }
      }
    } else if (ob.kind === 'dome') {
      const hw = w / 2, base = ob.base;
      ctx.fillStyle = '#f4efe2'; ctx.fillRect(cx - hw + 14, base - 4, w - 28, H); ctx.strokeRect(cx - hw + 14, base - 4, w - 28, H);
      ctx.fillStyle = '#d0563a'; ctx.beginPath(); ctx.ellipse(cx, base, hw, base - y, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#f4efe2'; ctx.lineWidth = 5;
      for (let n = -3; n <= 3; n++) { ctx.beginPath(); ctx.moveTo(cx + n * hw * 0.3, base - (base - y) * Math.sqrt(1 - 0.09 * n * n) + 3); ctx.quadraticCurveTo(cx + n * hw * 0.2, y + (base - y) * 0.2, cx + n * 4, y + 3); ctx.stroke(); }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
      ctx.fillStyle = '#f4efe2'; rr(cx - 11, y - 20, 22, 24, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3d3552'; rr(cx - 4, y - 14, 8, 12, 4); ctx.fill();
      ctx.fillStyle = C.gold; circle(cx, y - K.lantern + 5, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3d3552'; for (let n = -2; n <= 2; n++) { circle(cx + n * hw * 0.34, base + 22, 9); ctx.fill(); }
    } else if (ob.kind === 'cloud') {
      const n = Math.max(3, Math.round(w / 52)), r = (w - 12) / (2 * n), flash = ((t * 0.9 + ob.x0 * 0.01) % 1.7) < 0.12;
      const xl = x + 6, xr = x + w - 6, yb = y - r, m = Math.max(2, Math.round((yb + 10) / 56)), sh = (yb + 10) / m;
      ctx.fillStyle = flash ? '#8f8cb0' : CO.cloud;
      ctx.beginPath(); ctx.moveTo(xl, -10);
      for (let i = 0; i < m; i++) ctx.quadraticCurveTo(xl - 13, -10 + (i + 0.5) * sh, xl, -10 + (i + 1) * sh);      // puffy sides
      for (let i = 0; i < n; i++) ctx.arc(xl + r + i * 2 * r, yb, r, Math.PI, 0, true);                             // a scalloped belly
      for (let i = m - 1; i >= 0; i--) ctx.quadraticCurveTo(xr + 13, -10 + (i + 0.5) * sh, xr, -10 + i * sh);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = CO.cloudDk; ctx.beginPath(); for (let i = 0; i < n; i++) { const bx = xl + r + i * 2 * r; ctx.moveTo(bx + r - 4, yb + 2); ctx.arc(bx, yb + 2, r - 4, 0, Math.PI); } ctx.fill();
      // a grumpy face and a lightning zigzag inside it
      ctx.fillStyle = '#ffffff'; circle(cx - 20, y - r - 26, 8); ctx.fill(); circle(cx + 20, y - r - 26, 8); ctx.fill();
      ctx.fillStyle = C.ink; circle(cx - 18, y - r - 24, 3.5); ctx.fill(); circle(cx + 18, y - r - 24, 3.5); ctx.fill();
      ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(cx - 32, y - r - 40); ctx.lineTo(cx - 10, y - r - 32); ctx.moveTo(cx + 32, y - r - 40); ctx.lineTo(cx + 10, y - r - 32); ctx.stroke();
      ctx.strokeStyle = '#ffe66b'; ctx.lineWidth = flash ? 5 : 3; ctx.beginPath(); ctx.moveTo(cx - 12, y - r - 8); ctx.lineTo(cx - 3, y - r + 4); ctx.lineTo(cx - 8, y - r + 4); ctx.lineTo(cx + 4, y - r + 18); ctx.stroke();
    } else if (ob.kind === 'banner') {
      const sw = Math.sin(t * 2.2 + ob.x0) * 5, top = 66;
      ctx.strokeStyle = '#6b4630'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + 6, -4); ctx.lineTo(x + 4, top); ctx.moveTo(x + w - 6, -4); ctx.lineTo(x + w - 4, top); ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
      ctx.fillStyle = CO.wood; rr(x - 4, top - 5, w + 8, 10, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f6efdf'; ctx.beginPath(); ctx.moveTo(x, top + 4); ctx.lineTo(x + w, top + 4); ctx.lineTo(x + w + sw, y); ctx.lineTo(cx + sw, y - 20); ctx.lineTo(x + sw, y); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = '#c8372d'; ctx.fillRect(x - 8, top, w * 0.3 + 8, y); ctx.fillRect(x + w * 0.7, top, w * 0.3 + 8, y);
      ctx.restore(); ctx.stroke();
      const ey = top + (y - top) * 0.45;   // the red lily of Florence
      ctx.fillStyle = '#c8372d'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(cx + sw * 0.4, ey, 5, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx - 9 + sw * 0.4, ey + 2, 4, 10, -0.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 9 + sw * 0.4, ey + 2, 4, 10, 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.gold; ctx.fillRect(cx - 9 + sw * 0.4, ey + 8, 18, 4);
    }
    if (ob.gold) {   // gold help: a gold arrow in the gap
      const ay = ob.low ? ob.y - 50 + Math.sin(t * 6) * 5 : ob.y + 50 + Math.sin(t * 6) * 5;
      ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
      for (let n = 0; n < 2; n++) { const ax = cx - 26 + n * 22; ctx.beginPath(); ctx.moveTo(ax, ay - 12); ctx.lineTo(ax + 14, ay); ctx.lineTo(ax, ay + 12); ctx.lineTo(ax + 5, ay); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    }
  }
  // the pages of the plans: the trail
  const pg = c.pages;
  for (let i = ph.pi; i < pg.length; i++) {
    const q = pg[i];
    if (q.x > cam + W + 30) break;
    if (q.got || q.x < cam - 30) continue;
    const y = q.y + Math.sin(t * 3 + q.x * 0.013) * 4;
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; circle(q.x, y, 17); ctx.fill();
    ctx.save(); ctx.translate(q.x, y); ctx.rotate(Math.sin(t * 2 + q.x * 0.02) * 0.25);
    ctx.fillStyle = '#f6e9c4'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.fillRect(-8, -10, 16, 20); ctx.strokeRect(-8, -10, 16, 20);
    ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(0, -2); ctx.quadraticCurveTo(-4, -8, -6, -3); ctx.moveTo(0, -2); ctx.quadraticCurveTo(4, -8, 6, -3); ctx.moveTo(-5, 3); ctx.lineTo(5, 3); ctx.moveTo(-5, 6.5); ctx.lineTo(3, 6.5); ctx.stroke();
    ctx.restore();
  }
  // the Thief's slipstream (the chase)
  const ch = ph.chase;
  if (ch && ch.phase === 'tail' && ph.mode === 'fly') {
    const wk = tthVinciWake(st), far = ch.far - 40, tol = ch.tol;
    const rgb = ch.in || ch.gold ? '255,197,61' : '255,255,255', gr = ctx.createLinearGradient(wk.x, 0, wk.x - far, 0);
    gr.addColorStop(0, `rgba(${rgb},${ch.in ? 0.34 : 0.22})`); gr.addColorStop(0.7, `rgba(${rgb},${ch.in ? 0.2 : 0.13})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(wk.x, wk.y - 8); ctx.lineTo(wk.x - far, wk.y - tol); ctx.lineTo(wk.x - far, wk.y + tol); ctx.lineTo(wk.x, wk.y + 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ch.in || ch.gold ? 'rgba(255,214,110,0.95)' : 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3;
    for (let n = -2; n <= 2; n++) {
      ctx.beginPath();
      for (let k = 0; k <= 8; k++) { const u = k / 8, xx = wk.x - 10 - u * (far - 20), yy = wk.y + n * (4 + u * (tol - 12) / 2) + Math.sin(u * 12 - t * 14 + n) * 4 * u; if (k) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
      ctx.stroke();
    }
  }
}
// the pigeons: a red "!" at the right edge at their height, then a loose V flying left; scattered ones fly off
function tthVinciDrawBirds(st) {
  const ph = st.ph, K = TTHVINCI, t = G.clock, cam = st.cam.x, z = tthBig() ? 1.3 : 1;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const f of ph.c.flocks) {
    if (f.state === 0 || f.state >= 4) continue;
    if (f.state === 1) {
      const x = cam + W - 30 * z, y = f.y, s = z * (1 + 0.12 * Math.sin(t * 16));
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.fillStyle = '#ff5f6d'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-8, -17); ctx.lineTo(-8, -9); ctx.lineTo(14, -9); ctx.lineTo(14, 9); ctx.lineTo(-8, 9); ctx.lineTo(-8, 17); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      bigText('!', x + 3 * z, y, 22 * z, '#ffffff', 1);
      continue;
    }
    const n = ph.flockR < K.flock.r ? 4 : 7, sc = f.state === 3;
    for (let i = 0; i < n; i++) {
      const row = (i + 1) >> 1, side = i % 2 ? 1 : -1;
      let bx = f.wx + row * 21, by = f.y + (i ? side * row * (ph.flockR / 3.5) : 0) + Math.sin(t * 5 + i * 1.7) * 3, rot = 0;
      if (sc) { bx += (i - 3) * f.t * 46 + f.t * 90; by -= f.t * (150 + (i % 3) * 50) * (i % 2 ? 1 : 0.5) + f.t * f.t * 40; rot = -0.5; ctx.globalAlpha = clamp(1.6 - f.t, 0, 1); }
      const wing = Math.sin(t * (sc ? 30 : 17) + i * 2.1);
      ctx.save(); ctx.translate(bx, by); ctx.rotate(rot);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      ctx.fillStyle = '#9aa7c2'; ctx.beginPath(); ctx.moveTo(8, -1); ctx.lineTo(19, -4); ctx.lineTo(18, 3); ctx.closePath(); ctx.fill(); ctx.stroke();   // tail
      ctx.fillStyle = '#b9c4dc'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 6.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8fd0b4'; circle(-9, -4, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffb03a'; ctx.beginPath(); ctx.moveTo(-13, -5); ctx.lineTo(-19, -3); ctx.lineTo(-13, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.ink; circle(-10.5, -5, 1.3); ctx.fill();
      ctx.fillStyle = '#e9edf5'; ctx.beginPath(); ctx.moveTo(-4, -2); ctx.quadraticCurveTo(2, -6 - wing * 15, 10, -3 - wing * 12); ctx.quadraticCurveTo(6, -1, 5, 1); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
}
function tthVinciDrawFx(st) {
  ctx.lineJoin = 'round';
  for (const q of st.ph.fx) {
    ctx.globalAlpha = clamp((q.life - q.t) / 0.3, 0, 1);
    if (q.kind === 'feather') {
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
      ctx.fillStyle = q.col; ctx.strokeStyle = 'rgba(28,26,54,0.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, 0, 8, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
      ctx.restore();
    } else if (q.kind === 'page') {
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
      ctx.fillStyle = q.col; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.fillRect(-6, -8, 12, 16); ctx.strokeRect(-6, -8, 12, 16);
      ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(3, -3); ctx.moveTo(-3, 1); ctx.lineTo(3, 1); ctx.stroke();
      ctx.restore();
    } else { ctx.fillStyle = q.col; circle(q.x, q.y, q.kind === 'drop' ? 3.5 : 3.5 * (1 - q.t / q.life) + 1); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}

/* ---------- drawing: Leonardo's flying machine, with Pip and Bo in their seats (world coords) ---------- */
// how far up the wings are (-1 down .. 1 up): a quick downstroke after each beat, then a slower swing back up
function tthVinciWing(g) {
  const w = g.wingT;
  if (g.landed && w > 0.6) return -0.25 + Math.sin(G.clock * 1.6) * 0.05;      // folded a little, resting
  if (w < 0.13) return 0.35 - 1.35 * Math.sin(Math.PI / 2 * w / 0.13);
  if (w < 0.6) { const u = (w - 0.13) / 0.47; return -1 + 1.35 * u * (2 - u) + 0.4 * Math.sin(Math.PI * u); }
  return (g.tired > 0 ? -0.2 : 0.35) + Math.sin(G.clock * 2.3) * 0.05;
}
// one bat wing (wooden ribs, canvas between them) from its hinge; dir 1 points forward, -1 back; a: radians up
function tthVinciDrawWing(hx, hy, dir, L, a, fill, rib) {
  ctx.save(); ctx.translate(hx, hy); ctx.scale(dir, 1); ctx.rotate(-a);
  const P = [[L, 0], [L * 0.8, 21], [L * 0.55, 25], [L * 0.3, 20], [5, 9]];
  ctx.fillStyle = fill; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(L * 0.5, -9, L, 0);
  for (let i = 1; i < P.length; i++) { const p0 = P[i - 1], p1 = P[i]; ctx.quadraticCurveTo((p0[0] + p1[0]) / 2, Math.min(p0[1], p1[1]) - 4, p1[0], p1[1]); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = rib; ctx.lineWidth = 2.2; ctx.beginPath();
  for (let i = 1; i < P.length - 1; i++) { ctx.moveTo(L * 0.12, -2); ctx.lineTo(P[i][0], P[i][1] - 2); }
  ctx.stroke();
  ctx.strokeStyle = TTHVINCI_COL.woodDk; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(L * 0.5, -9, L, 0); ctx.stroke();
  ctx.restore();
}
function tthVinciDrawMachine(st) {
  const ph = st.ph, K = TTHVINCI, CO = TTHVINCI_COL, g = ph.g, t = G.clock;
  // its shadow on the ground
  const gy = tthVinciGround(ph.c, g.x), hgt = gy - (g.y + K.hh);
  if (hgt < 260) { ctx.fillStyle = `rgba(28,26,54,${0.22 * (1 - hgt / 260)})`; ctx.beginPath(); ctx.ellipse(g.x, gy + 2, 34 - hgt * 0.06, 5, 0, 0, Math.PI * 2); ctx.fill(); }
  const fl = tthVinciWing(g), shake = g.tired > 0 ? Math.sin(t * 38) * 0.05 : 0, a = 0.2 + fl * 0.55 + shake;
  const canvas = g.tired > 0 ? '#f3cdbd' : CO.canvas;
  ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.pitch + g.spin);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // speed streaks behind it
  if (g.v > 265 && !g.landed) {
    ctx.strokeStyle = `rgba(255,255,255,${clamp((g.v - 265) / 70, 0, 0.8)})`; ctx.lineWidth = 3; ctx.beginPath();
    for (let n = 0; n < 3; n++) { const o = ((t * 5 + n * 0.37) % 1) * 40; ctx.moveTo(-70 - o, -22 + n * 16); ctx.lineTo(-104 - o, -22 + n * 16); }
    ctx.stroke();
  }
  tthVinciDrawWing(1, -54, 1, 76, a * 0.9, CO.canvasDk, CO.woodDk);                    // the far wing
  // the tail fan (the steerer's tiller tilts it)
  ctx.save(); ctx.translate(-36, -3); ctx.rotate(g.tail * 0.42);
  ctx.fillStyle = CO.canvas; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30, -15); ctx.quadraticCurveTo(-27, -7, -36, -4); ctx.quadraticCurveTo(-28, 0, -32, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = CO.wood; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-33, -4); ctx.stroke();
  ctx.restore();
  // the mast and its ropes
  ctx.strokeStyle = 'rgba(107,70,48,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(-34, -6); ctx.moveTo(0, -54); ctx.lineTo(42, -8); ctx.stroke();
  ctx.fillStyle = CO.wood; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(-3, -58, 6, 54, 3); ctx.fill(); ctx.stroke();
  // Pip and Bo (the flapper squashes down with every beat)
  for (const p of G.players) {
    const s = ph.seat[p.id], fp = p.id === ph.flap, pull = fp && g.wingT < 0.16 ? 1 - g.wingT / 0.16 : 0;
    tthDrawHero(p.id, s.x, s.y, { face: 1, sx: 1 + 0.12 * pull, sy: 1 - 0.14 * pull });
  }
  // the hull: a little wooden boat on two wheels, with a brass horn at the prow
  ctx.fillStyle = CO.woodDk; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  for (const wx of [-20, 22]) { circle(wx, 7, 5); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = CO.wood; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-36, -6); ctx.lineTo(38, -6); ctx.quadraticCurveTo(50, -7, 54, -15); ctx.quadraticCurveTo(54, 0, 36, 7); ctx.lineTo(-28, 7); ctx.quadraticCurveTo(-38, 4, -36, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = CO.woodDk; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-34, -1); ctx.lineTo(46, -1); ctx.moveTo(-30, 3); ctx.lineTo(40, 3); ctx.stroke();
  ctx.fillStyle = TTHC.brass; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(44, -13); ctx.lineTo(56, -22); ctx.lineTo(60, -12); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (ph.tootT > 0) {
    ctx.strokeStyle = `rgba(255,255,255,${ph.tootT * 2})`; ctx.lineWidth = 3;
    for (let n = 0; n < 3; n++) { const r = 12 + n * 11 + (0.5 - ph.tootT) * 30; ctx.beginPath(); ctx.arc(58, -17, r, -0.9, 0.5); ctx.stroke(); }
  }
  // the flapper's pull rope, then the near wing
  const fs = ph.seat[ph.flap], wa = 0.2 + fl * 0.55, rx = -1 - Math.cos(wa) * 26, ry = -54 - Math.sin(wa) * 26 + 4;
  ctx.strokeStyle = '#6b4630'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fs.x + 7, fs.y - 12); ctx.lineTo(rx, ry); ctx.stroke();
  tthVinciDrawWing(-1, -54, -1, 84, a, canvas, CO.wood);
  ctx.fillStyle = CO.woodDk; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(0, -55, 5); ctx.fill(); ctx.stroke();
  // the plans, won back
  if (g.has) {
    const k = 0.5 + 0.5 * Math.sin(t * 8);
    ctx.fillStyle = `rgba(255,243,196,${0.35 + 0.25 * k})`; circle(38, -34, 22 + k * 4); ctx.fill();
    tthDrawLoot('plans', 38, -34, 1, t);
  }
  ctx.restore();
}
// over everything: the wing meter under the machine, the plans case to grab
function tthVinciDrawMeter(st) {
  const ph = st.ph, K = TTHVINCI, B = K.beat, g = ph.g, t = G.clock;
  if (ph.mode === 'won' || st.cut || G.introT > 0) return;
  const z = tthBig() ? 1.45 : 1, w = 68 * z, h = 10 * z, x = g.x - w / 2, y = g.y + 26 + 4 * z;
  const tired = g.tired > 0, col = tired ? (Math.sin(t * 18) > 0 ? '#ff5f6d' : '#ff9aa2') : g.en < B.cost ? '#ffb03a' : '#9fe07f';
  ctx.fillStyle = 'rgba(30,20,66,0.88)'; rr(x - 3, y - 3, w + 6, h + 6, (h + 6) / 2); ctx.fill();
  ctx.strokeStyle = PCOL[ph.flap]; ctx.lineWidth = 2; rr(x - 3, y - 3, w + 6, h + 6, (h + 6) / 2); ctx.stroke();
  const fw = Math.max(h, w * clamp(tired ? 1 - g.tired / B.tired : g.en, 0, 1));
  ctx.fillStyle = col; rr(x, y, fw, h, h / 2); ctx.fill();
  ctx.strokeStyle = 'rgba(30,20,66,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let n = 1; n < 4; n++) { ctx.moveTo(x + w * n / 4, y + 1); ctx.lineTo(x + w * n / 4, y + h - 1); }
  ctx.stroke();
  if (ph.beatGold) {   // gold help: the dot lights when it is time for the next beat
    const on = !tired && g.beatT >= B.full && g.en >= B.cost;
    ctx.fillStyle = on ? C.gold : 'rgba(30,20,66,0.88)'; ctx.strokeStyle = on ? '#ffffff' : C.gold; ctx.lineWidth = 2;
    circle(x + w + 14 * z, y + h / 2, (on ? 8 + Math.sin(t * 14) * 1.5 : 6) * z); ctx.fill(); ctx.stroke();
  }
  const ch = ph.chase;
  if (ch && ch.phase === 'dive' && !ch.zip) {
    const cl = tthVinciClaw(st), k = 0.5 + 0.5 * Math.sin(t * 9);
    if (ch.magnet) { ctx.fillStyle = `rgba(255,197,61,${0.16 + 0.1 * k})`; ctx.fillRect(cl.x - K.chase.magnet, K.top - 40, K.chase.magnet * 2, K.ground - K.top + 40); }
    ctx.strokeStyle = `rgba(255,197,61,${0.6 + 0.4 * k})`; ctx.lineWidth = 4; circle(cl.x, cl.y, Math.max(24, ch.grab - 22) + k * 6); ctx.stroke();
    ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    const ay = cl.y + 44 + k * 8;
    ctx.beginPath(); ctx.moveTo(cl.x, ay - 14); ctx.lineTo(cl.x + 12, ay); ctx.lineTo(cl.x + 5, ay); ctx.lineTo(cl.x + 5, ay + 12); ctx.lineTo(cl.x - 5, ay + 12); ctx.lineTo(cl.x - 5, ay); ctx.lineTo(cl.x - 12, ay); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}
// the HUD (screen coords): the slipstream meter of the chase, bottom centre
function tthVinciHud(st) {
  const ph = st.ph, ch = ph.chase;
  if (!ch || ch.phase === 'done' || ph.mode !== 'fly' || st.idle || st.cut || G.introT > 0) return;
  const big = tthBig(), z = big ? 1.4 : 1, t = G.clock, w = 290 * z, h = 24 * z, x = W / 2 - w / 2, y = H - 14 - h;
  if (ch.phase === 'dive') { bigText('Dive! Grab the plans!', W / 2, y + h / 2, 24 * z, C.gold, 1 + 0.05 * Math.sin(t * 9)); return; }
  ctx.save(); if (tthUnder(x, y, x + w, y + h)) ctx.globalAlpha = 0.45;
  ctx.fillStyle = 'rgba(30,20,66,0.88)'; rr(x, y, w, h, h / 2); ctx.fill();
  const fw = Math.max(h - 6, (w - 6) * clamp(ch.m, 0, 1));
  ctx.fillStyle = ch.full ? (Math.sin(t * 10) > 0 ? '#fff3c4' : C.gold) : ch.in ? C.gold : '#c9b27a'; rr(x + 3, y + 3, fw, h - 6, (h - 6) / 2); ctx.fill();
  ctx.strokeStyle = ch.in || ch.full ? C.gold : 'rgba(255,255,255,0.7)'; ctx.lineWidth = ch.in ? 3 : 2; rr(x, y, w, h, h / 2); ctx.stroke();
  const lab = ch.full ? 'FULL! Stay on his tail' : ch.gold ? 'GOLD SLIPSTREAM' : 'SLIPSTREAM';
  ctx.font = tthFont(13 * z); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(30,20,66,0.9)'; ctx.lineWidth = 4 * z; ctx.strokeText(lab, W / 2, y + h / 2 + 1);
  ctx.fillStyle = '#ffffff'; ctx.fillText(lab, W / 2, y + h / 2 + 1);
  ctx.restore();
}

/* ---------- the phase ---------- */
function tthVinciSetup(st, L) {
  const K = TTHVINCI, ph = st.ph, b = st.thief;
  ph.c = tthVinciCompile();
  ph.g = tthVinciNewMachine();
  ph.t = 0; ph.mode = 'perch'; ph.stage = 0; ph.stageT0 = 0;
  ph.flap = L && L.def && L.def.first ? 1 : 0;                  // room field `first`: who flaps first
  ph.perch = { x: K.start.x, y: K.start.y, t: 0, swap: false, swapped: true, ready: false };
  ph.app = null; ph.chase = null; ph.swapA = 1; ph.seat = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  ph.tips = {}; ph.said = {}; ph.fx = [];
  ph.tiredN = 0; ph.beatGold = false; ph.wingGold = false; ph.liftK = 1; ph.groundHits = 0; ph.birdHits = 0; ph.flockR = K.flock.r;
  ph.shooCd = 0; ph.tootT = 0; ph.pointT = 0; ph.looseT = 0; ph.leoT = 0; ph.wonT = 0;
  ph.streak = 0; ph.streakT = 0; ph.pi = 0; ph.got = 0; ph.minX = 0; ph.steer = 0; ph.noSteerT = 0; ph.inUp = false; ph.inGust = false;
  Object.assign(tthStats(st), { pages: 0, of: ph.c.pages.length, flaps: 0, tired: 0, close: 0, shoos: 0, stretch: [], diveMiss: 0 });
  Object.assign(b, { x: K.start.x + 590, y: 0, s: 0.55, face: -1, pose: 'laugh', jet: true, item: st.era.loot, claw: 0.45, flame: 0.6 });
  b.y = tthVinciPath(ph.c, b.x) + 50;
  st.cam.x = 0; st.cam.y = 0;
  tthVinciSeat(st);
}
function tthVinciStep(st, dt) {
  const ph = st.ph, g = ph.g;
  for (const p of G.players) p.pendingJump = false;
  if (st.idle) {   // nobody plays: the machine hangs still in the air, nothing moves
    for (const p of G.players) p.pendingAct = false;
    tthVinciSeat(st); return;
  }
  ph.t += dt;
  if (ph.leoT > 0) ph.leoT += dt;
  if (ph.mode === 'perch') tthVinciPerch(st, dt);
  else if (ph.mode === 'toPerch') tthVinciToPerch(st, dt);
  else if (ph.mode === 'fly') tthVinciFly(st, dt);
  else if (ph.mode === 'won') tthVinciWon(st, dt);
  tthVinciFlocks(st, dt);
  g.tail = approach(g.tail, ph.mode === 'fly' && !g.landed ? -ph.steer : 0, dt * 6);
  tthVinciThief(st, dt);
  tthVinciFx(st, dt);
  tthVinciCam(st, dt);
  tthVinciSeat(st);
}
// during the era card and the portal cutscene: perched it sits still; in the air it flies itself, slow and level
function tthVinciCoast(st, dt) {
  const ph = st.ph;
  for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
  if (!ph.g) return;
  if (ph.mode === 'won' || (ph.mode === 'fly' && !ph.g.landed)) tthVinciAuto(st, dt);
  ph.g.tail = approach(ph.g.tail, 0, dt * 4);
  tthVinciFx(st, dt);
  tthVinciCam(st, dt);
  tthVinciSeat(st);
}
TTH_PHASES.davinci = {
  setup(st, L) { tthVinciSetup(st, L); },
  step(st, dt) { tthVinciStep(st, dt); },
  coast(st, dt) { tthVinciCoast(st, dt); },
  hide: () => true,
  busy: () => true,
  drawBack(st) { tthScreen(st, () => tthVinciDrawSky(st)); tthVinciDrawGround(st); tthVinciDrawObs(st); },
  draw(st) { tthVinciDrawBirds(st); tthVinciDrawMachine(st); tthVinciDrawFx(st); },
  drawTop(st) { tthVinciDrawMeter(st); },
  hud(st) { tthVinciHud(st); },
  hudText(st) { const s = tthStats(st); return 'Pages ' + (s.pages || 0) + '/' + (s.of || 0); },
  progress(st) { return { n: st.ph.mode === 'won' ? 3 : st.ph.stage, of: 3 }; },
  labels(st) { return st.ph.flap === 0 ? ['flap', 'shoo'] : ['shoo', 'flap']; },
  jobKeys(st) { return st.ph.flap === 1 ? ['steerer', 'flapper'] : ['flapper', 'steerer']; },
  roles(st) { return st.ph.mode === 'won' ? null : st.ph.flap === 0 ? ['Flap!', 'Steer!'] : ['Steer!', 'Flap!']; },
  legend(st) {
    const f = st.ph.flap, steer = (u, d) => `<kbd>${u}</kbd> climb <kbd>${d}</kbd> dive`, flap = 'a steady beat:';
    return { pip: f === 0 ? flap : steer('W', 'S'), bo: f === 1 ? flap : steer('↑', '↓'), pad: 'steerer: stick up climbs, down dives; flapper: a steady beat of' };
  },
  headLift: () => 44,
  statLine(st) { const s = st.stats.davinci; return s && s.of && s.pages >= s.of ? 'Caught every page of Leonardo\'s plans' : ''; },
};

/* ---------- the room (this file fills in its own room of the level def) ---------- */
tthRoom('davinci', {
  jobs: {
    flapper: { title: 'Flapper', act: 'flap', legend: '',
      howTo: ['Flap with a steady beat, about 2 a second. Mashing tires the wings.'] },
    steerer: { title: 'Steerer', act: 'shoo', legend: '<kbd>W</kbd> climb <kbd>S</kbd> dive',
      howTo: ['Shoo toots the horn to scatter pigeons.'] },
  },
  tip: 'One flaps the wings with a steady beat. One steers: up climbs, down dives. Follow the pages and catch him!',
  act: { label: 'flap', labels: ['shoo', 'flap'] },
  legend: { pip: '<kbd>W</kbd> climb <kbd>S</kbd> dive', bo: 'a steady beat:', pad: 'steerer: stick up climbs, down dives; flapper: a steady beat of' },
  map: TTH_EMPTY_MAP,
});
