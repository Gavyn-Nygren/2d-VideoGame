/* Pip & Bo - Level 30-1 The Time Thief: era 'race' (Portal Race Home, versus). */
'use strict';

/* ===== 30-1 era 10: Portal Race Home (TTH_PHASES.race, versus inside the team boss level) =====
   History is safe and the Time Thief is a friend now, so the way home is a RACE through the time tunnel. Pip and Bo
   run on foot, side by side in a split screen like 20-1's lava surf race: Pip's lane on top, Bo's below, each with its
   own camera; the other racer shows as a faded ghost in your lane, and the bar between the lanes shows both faces, the
   lap marks and the home portal. Best of 3 races: first to 2 wins is the Race champ. A race is 3 LAPS, and every lap
   is a different time period with its own look and its own trick; between laps you run through a portal ring (a
   flash, the look changes; through it at speed = "Time boost!").
     run    hold ▶: you build speed, and a clean run builds a little more ("flow"). You keep your speed in the air, in
            a slide and for a moment (grace) after letting go, so a touch player can lift the thumb off ▶ to tap ▲ or
            ▼: nothing ever needs two directions at once. ◀ brakes.
     hop    ▲ (the jump button; tthUp): one fixed arc. On the Moon, and from an updraft, it is a big floaty jump.
     slide  ▼ on the ground: a low slide (0.9 s at most; it never ends under a lintel). ▼ in the air drops you fast.
            On ice the slide is the fast way to go; in a wind gust ▼ is a duck that keeps you moving.
     dash   the action: a time-sparkle burst of speed, then a cooldown (the little bar under your feet).
   The laps (TTHRACE_LAPS), with a true fact in the news line when the first racer runs in:
     dino     Dinosaur jungle     hop logs; meteor shadows (a meteor lands there: hop the hot rock)
     henge    Stonehenge          slide under the lintels
     olympics Olympia             hurdles in a rhythm, like a sprint
     troy     Walls of Troy       jump the gaps in the wall top
     vikings  Viking ice          slippery; long slides under ice arches (sliding is fastest)
     moon     The Moon            low gravity: huge floaty jumps over craters
     davinci  Florence rooftops   jump in an updraft to float over the wide alleys
     wright   Kitty Hawk dunes    headwind gusts: duck (hold ▼) through them
     tunnel   The Time Tunnel     the last lap of race 3: gears, pendulums and rifts, a bit of everything
   The races (TTHRACE_RACES; hand-made, the same track for both lanes): 1 Ancient Dash (dino, henge, olympics),
   2 Heroes' Run (troy, vikings, moon), 3 Sky Sprint (davinci, wright, tunnel). A dead heat replays the same race.
   Soft fails only (race slowdowns: they are NOT team bumps and never count for the trophy): running into a thing =
   "Bonk!" (a stumble: slower for a moment, the thing tips over, your flow is gone); a gap = "Whoops!" (you pop back
   out on the far side, slow); standing up in a gust = "Whoa!" (pushed back to a crawl while it lasts).
   Fairness: both lanes get the same things at the same spots; everything is seen at least 1.5 s ahead (a meteor's
   shadow is there from the start, the meteor itself lands 0.8 s after it starts falling); ties within 0.002 s are a
   dead heat (replayed; the 2nd tie in a row goes to fewer stumbles, else more time boosts, else the Thief's lucky
   watch, announced); a safety bell ends a race nobody finishes (furthest wins).
   Gold help (announced, never hidden): whoever trails in races gets GOLD SHOES (a quicker dash, softer stumbles,
   longer time boosts: on the race card, in the news and as a chip in the lane); and a racer far behind at a portal
   ring gets a longer "Gold boost!" there.
   Calm: the race (and its countdown) freezes while nobody plays for TTH.idleAfter s (the Thief waits), so an idle
   person never lets the computer win alone. If the people were away at GO (nobody left the start), the race starts
   again when they are back (a false start).
   The Thief is the starter and the commentator: he stands at his little desk between the lanes for the whole era
   (st.thief, on foot, happy), counts down, calls the lead changes and cheers. After the deciding race he hands the
   Golden Hourglass to the champ (a short scene), then tthPhaseDone starts the core's ending.
   Results: the line "Race champ: Bo (2-1)". Stats: st.stats.race { wins, champ, races, stumbles, boosts, best }.
   The engine players are hidden while the lanes draw (hide) and mirror each runner's screen spot (hints, bubbles).
   The brain (js/cpu/levels/world30/tth-race.js) is the OPPONENT and reads TTHRACE and these helpers.
   Names: tthRace* / TTHRACE*; sounds Sfx.extra.tthRace*. */

const TTHRACE = {
  laneY: [78, 320], laneH: 212, gy: 172, riderX: 190, RS: 1.3,     // lanes (screen), the ground line in a lane, the runner's spot, sprite scale
  run: 300, flow: 45, flowT: 4,                                    // top speed (px/s), the extra a clean run builds over flowT s
  acc: 380, over: 160, fric: 520, brake: 1000, grace: 0.35,        // speeding up, easing back to top speed, coasting, ◀, how long you keep running after ▶ is let go
  g: 2000, jumpV: 520, buf: 0.13, coyote: 0.08, dive: 2.6,         // the hop (0.52 s, 68 px high), press buffer, late-jump grace, ▼ in the air
  float: { v: 390, g: 700 },                                       // the Moon / an updraft: 1.1 s in the air, 109 px high
  hb: 8, standH: 34, lowH: 19, duckC: 26, edge: 6,                 // half a runner's width, heights standing / sliding, the room under a lintel, a gap's forgiving rim
  slideMin: 150, slideFric: 120, slideMax: 0.9,
  ice: { acc: 210, fric: 90, brake: 260, gain: 70, add: 55 },      // slippery: slow to speed up or stop; a slide gains speed
  wind: { stand: 0.45, duck: 0.85, brake: 700 },                   // a gust: your top speed (x run) standing / ducking
  dash: { add: 170, t: 0.6, cd: 3.2, acc: 1500 },
  boost: { add: 130, t: 1.0, min: 0.8 },                           // "Time boost!" through a ring at 80% of top speed or more
  st: { mul: 0.4, min: 110, t: 0.45, k: 0.55 },                    // a stumble: speed kept, the least, how long, top speed meanwhile
  fall: { t: 0.5, depth: 30, v: 130, pop: 330 },                   // a gap: s out of the race, how deep counts, speed after
  met: { trig: 620, fall: 0.8, w: 34, h: 24 },                     // a meteor starts falling when you are this near, lands 0.8 s later
  catchUp: { d: 380, t: 2.0 },                                     // this far behind at a ring: a gold boost of t s
  help: { cd: 0.7, st: 0.62, boost: 1.3 },                         // gold shoes: dash cooldown x, speed kept in a stumble, time boosts x
  finPortal: 230,                                                  // the home portal stands this far behind the finish line
  win: 2, cardT: 5, endT: 3, crownT: 4.6, tieEps: 0.002, limitK: 1.9,
};
// The laps. obs: ['h', x] a low thing to hop; ['d', x, w] a lintel to slide under; ['g', x0, w] a gap; ['u', x0, w] an
// updraft; ['w', x0, w] a wind gust; ['m', x] a meteor shadow (x from the lap's start; h, d, m: the middle of the thing).
const TTHRACE_LAPS = {
  dino: { name: 'Dinosaur jungle', when: '66 million years ago', len: 4300, hop: 'log', gap: 'hole', deco: 'grass',
    hint: 'Hop the logs. A shadow means a meteor!', fact: 'Dinosaurs ruled the Earth for over 150 million years!',
    sky: ['#2f9c98', '#ffd08a'], ground: ['#6fbf5a', '#7a5a3a', '#4f9a45'],
    obs: [['h', 700], ['h', 1150], ['m', 1600], ['h', 2000], ['h', 2350], ['m', 2800], ['h', 3150], ['m', 3500], ['h', 3830]] },
  henge: { name: 'Stonehenge', when: '2500 BC', len: 4300, hop: 'stone', duck: 'lintel', gap: 'hole', deco: 'grass',
    hint: 'Slide under the great stones.', fact: 'The biggest stones of Stonehenge weigh as much as 4 elephants!',
    sky: ['#f29a8a', '#fff0c9'], ground: ['#8fd17a', '#5f8f4f', '#6fb35f'],
    obs: [['d', 620, 110], ['d', 1060, 110], ['h', 1460], ['d', 1860, 130], ['d', 2300, 110], ['h', 2660], ['d', 3060, 120], ['d', 3460, 110], ['d', 3850, 120]] },
  olympics: { name: 'Olympia', when: '776 BC', len: 4400, hop: 'hurdle', gap: 'hole', deco: 'track',
    hint: 'Hurdles! Find the rhythm, then sprint.', fact: 'The first Olympic Games had just one event: a sprint!',
    sky: ['#3fa3f5', '#d6f0ff'], ground: ['#f0d9a0', '#d9b877', '#c9a55f'],
    obs: [['h', 620], ['h', 910], ['h', 1200], ['h', 1490], ['h', 2020], ['h', 2310], ['h', 2600], ['h', 2890], ['h', 3330], ['h', 3600], ['h', 3870]] },
  troy: { name: 'Walls of Troy', when: '1200 BC', len: 4300, hop: 'merlon', gap: 'hole', deco: 'blocks',
    hint: 'Run the wall top: jump the gaps.', fact: 'Troy was a real city. You can still visit its walls!',
    sky: ['#5a3d7a', '#ffb37a'], ground: ['#e6d2a8', '#b89f73', '#9a8258'],
    obs: [['g', 650, 80], ['h', 1070], ['g', 1450, 90], ['g', 1820, 80], ['h', 2260], ['g', 2600, 90], ['h', 3010], ['g', 3350, 90], ['g', 3720, 80]] },
  vikings: { name: 'Viking ice', when: '1000 AD', len: 4500, hop: 'ice', duck: 'arch', gap: 'hole', deco: 'ice', ice: true,
    hint: 'Slippery ice: a long slide is the fast way.', fact: 'Vikings sailed to America 500 years before Columbus!',
    sky: ['#0f2a4a', '#3f8fa8'], ground: ['#eaf8ff', '#7fbfe0', '#a8dcf5'],
    obs: [['d', 700, 220], ['h', 1220], ['d', 1700, 280], ['h', 2280], ['h', 2640], ['d', 3120, 320], ['h', 3640], ['d', 4000, 200]] },
  moon: { name: 'The Moon', when: '1969', len: 4500, hop: 'rock', gap: 'bowl', deco: 'moon', float: true,
    hint: 'Low gravity: huge floaty jumps over the craters.', fact: 'On the Moon you weigh six times less!',
    sky: ['#05060f', '#1a1c33'], ground: ['#c9ccd9', '#8a8da0', '#a3a6b8'],
    obs: [['g', 700, 230], ['h', 1380], ['g', 1950, 250], ['h', 2640], ['h', 3140], ['g', 3700, 240]] },
  davinci: { name: 'Florence rooftops', when: 'The 1490s', len: 4400, hop: 'pot', gap: 'alley', deco: 'tiles',
    hint: 'Jump in an updraft to float over the wide alleys.', fact: 'Leonardo drew flying machines 400 years before planes!',
    sky: ['#ffbf7a', '#ffe9c4'], ground: ['#d9744a', '#e8cfa6', '#b5583a'],
    obs: [['h', 650], ['u', 1010, 90], ['g', 1100, 190], ['g', 1720, 80], ['h', 2110], ['u', 2450, 90], ['g', 2540, 190], ['h', 3160], ['u', 3500, 90], ['g', 3590, 190]] },
  wright: { name: 'Kitty Hawk dunes', when: '1903', len: 4400, hop: 'fence', gap: 'hole', deco: 'sand',
    hint: 'Headwind gusts: duck through them.', fact: 'The very first plane flight lasted just 12 seconds!',
    sky: ['#7fc8f0', '#fff3d0'], ground: ['#f2dfae', '#e0c688', '#d4b872'],
    obs: [['h', 620], ['w', 960, 280], ['h', 1660], ['w', 2010, 300], ['h', 2720], ['h', 3020], ['w', 3360, 300], ['h', 3960]] },
  tunnel: { name: 'The Time Tunnel', when: 'Almost home', len: 4500, hop: 'gear', duck: 'pend', gap: 'rift', deco: 'brass',
    hint: 'A bit of everything. The gold portal is HOME!', fact: 'Last lap! Home is through the gold portal!',
    sky: ['#1c1446', '#6b4fb8'], ground: ['#f6d37a', '#3a2f7a', '#d9a441'],
    obs: [['h', 650], ['d', 1010, 100], ['g', 1400, 80], ['h', 1810], ['h', 2110], ['d', 2510, 120], ['g', 2900, 90], ['h', 3310], ['d', 3660, 100], ['g', 4000, 80]] },
};
const TTHRACE_RACES = [
  { name: 'Ancient Dash', laps: ['dino', 'henge', 'olympics'], say: 'No more stealing. Let\'s RACE home!' },
  { name: 'Heroes\' Run', laps: ['troy', 'vikings', 'moon'], say: 'Race 2! From Troy to the Moon!' },
  { name: 'Sky Sprint', laps: ['davinci', 'wright', 'tunnel'], say: 'The decider! Up on the rooftops!' },
];
const TTHRACE_HOPS = { log: [30, 24], stone: [30, 24], hurdle: [14, 28], merlon: [26, 24], ice: [28, 24], pot: [24, 26], fence: [18, 26], rock: [30, 24], gear: [28, 26] };
const TTHRACE_ICON = { tunnel: 'race' };   // (the strip icon that stands for a lap on the race card: the era's own thing)
const tthRaceCpu = k => typeof cpuSolo === 'function' && cpuSolo() && cpuOn(k);
// looks-only randomness (dust, sparks, which giggle the Thief says): never tthRand, so the race never depends on the drawing
let tthRaceVS = 20261109;
const tthRaceVR = () => { tthRaceVS = (Math.imul(tthRaceVS, 1664525) + 1013904223) >>> 0; return tthRaceVS / 4294967296; };

/* ---------- the track: three laps end to end ---------- */
function tthRaceTrack(i) {
  const D = TTHRACE_RACES[i], K = TTHRACE, T = { i, name: D.name, say: D.say, laps: [], obs: [], len: 0 };
  let x = 0;
  D.laps.forEach((key, n) => {
    const th = TTHRACE_LAPS[key], lap = { i: n, key, th, x0: x, x1: x + th.len, gaps: [] };
    for (const [kind, a, b] of th.obs) {
      const o = { kind, lap: n, th, hit: [false, false], t0: [null, null] };
      if (kind === 'h') { const [w, h] = TTHRACE_HOPS[th.hop]; Object.assign(o, { x: x + a, w, h, look: th.hop }); }
      else if (kind === 'm') Object.assign(o, { x: x + a, w: K.met.w, h: K.met.h, look: 'met' });
      else if (kind === 'd') Object.assign(o, { x: x + a, w: b, look: th.duck });
      else Object.assign(o, { x: x + a + b / 2, w: b, look: kind === 'g' ? th.gap : kind });
      o.x0 = o.x - o.w / 2; o.x1 = o.x + o.w / 2;
      if (kind === 'g') lap.gaps.push(o);
      T.obs.push(o);
    }
    T.laps.push(lap); x += th.len;
  });
  T.obs.sort((a, b) => a.x0 - b.x0);
  T.len = x;
  return T;
}
function tthRaceLapAt(T, x) { let i = 0; while (i < T.laps.length - 1 && x >= T.laps[i + 1].x0) i++; return i; }
// the things near a runner: the next few from r.oi (the first one not yet well behind)
function tthRaceNear(T, r, fn) {
  for (let i = r.oi; i < T.obs.length && i < r.oi + 4; i++) { const o = T.obs[i]; if (o.x0 > r.x + 900) break; if (fn(o, i) === false) break; }
}
// the gap under x (inside its forgiving rim), or null
function tthRaceGapAt(T, r, x) {
  let g = null;
  tthRaceNear(T, r, o => { if (o.kind === 'g' && x > o.x0 + TTHRACE.edge && x < o.x1 - TTHRACE.edge) g = o; });
  return g;
}
// a meteor's rock is there once it has landed in this runner's lane
const tthRaceRockOn = (ph, o, k) => o.kind !== 'm' || (o.t0[k] != null && ph.t >= o.t0[k] + TTHRACE.met.fall);
// what a runner's hop is right now: floaty on the Moon and from an updraft
function tthRaceJumpOf(T, r) {
  const K = TTHRACE;
  let up = null;
  tthRaceNear(T, r, o => { if (o.kind === 'u' && r.x >= o.x0 - 4 && r.x <= o.x1 + 4) up = o; });
  const flo = !!(T.laps[r.lap].th.float || up);
  return { flo, up, v: flo ? K.float.v : K.jumpV, g: flo ? K.float.g : K.g, air: 2 * (flo ? K.float.v / K.float.g : K.jumpV / K.g) };
}

/* ---------- a runner ---------- */
function tthRaceRunner(k) {
  return { k, x: 0, y: 0, v: 0, vy: 0, air: false, airT: 0, jumped: false, g: TTHRACE.g, flo: false, buf: 0, upWas: false, runT: 9, low: false, lowT: 0, lowArm: true,
    stun: 0, clean: 0, dash: 0, dashCd: 0, boost: 0, gold: 0, fallT: 0, fallGap: null, lastGap: null, fin: null, goneT: 0, lap: 0, oi: 0, land: 0, step: 0,
    stumbles: 0, boosts: 0, miss: {}, wind: false, flash: 0, place: 0, dustT: 0, whoa: 0, lead: 0 };
}
function tthRacePop(ph, k, s, col = '#ffffff', size = 20, life = 0.9) {
  ph.pops = ph.pops.filter(q => q.k !== k || q.t > 0.3);
  ph.pops.push({ k, s, col, size, t: 0, life });
}
function tthRacePart(ph, k, x, y, vx, vy, life, col, size, grav = 900, kind = 'dot') {
  if (ph.parts.length > 260) ph.parts.shift();
  ph.parts.push({ k, x, y, vx, vy, life, max: life, col, size, grav, kind });
}
// a first-time hint over a runner, in that player's own keys (never for the computer's runner)
function tthRaceHint(st, k, key, text, life = 2.8) {
  const ph = st.ph;
  if (ph.hinted[k][key] || tthRaceCpu(k)) return;
  ph.hinted[k][key] = true;
  tthHint(st, k, text, { life });
}
// the Thief's commentary: short, and never two lines on top of each other
function tthRaceSay(st, text, life = 2, force = false) {
  const ph = st.ph;
  if (!force && ph.sayCd > 0) return false;
  ph.sayCd = life + 1.6;
  tthSay(st, text, life);
  return true;
}
function tthRaceStumble(st, r, o, word) {
  const K = TTHRACE, ph = st.ph, k = r.k, gy = K.gy;
  r.v = Math.max(K.st.min, r.v * (ph.help[k] ? K.help.st : K.st.mul)); r.stun = K.st.t; r.clean = 0; r.dash = 0; r.boost = 0; r.gold = 0; r.low = false;
  r.stumbles++; ph.stat.stumbles[k]++;
  r.miss[o.kind] = (r.miss[o.kind] || 0) + 1;
  tthRacePop(ph, k, word || 'Bonk!', '#ffffff', 22);
  for (let n = 0; n < 8; n++) tthRacePart(ph, k, o.x, gy - 12, -40 + tthRaceVR() * 240, -120 - tthRaceVR() * 200, 0.7, n % 2 ? '#ffffff' : '#ffd27a', 2.5 + tthRaceVR() * 3, 1100);
  Sfx.play('tthRaceBonk', k); rumble(k, 0.5, 0.3, 140);
  // the same kind twice: say how, in their own keys
  if (r.miss[o.kind] === 2) {
    const tip = o.kind === 'd' ? 'Slide sooner: hold ' + tthKey(k, 'down') : 'Hop a little sooner: ' + tthKey(k, 'jump');
    tthRaceHint(st, k, 'again' + o.kind, tip, 3);
  }
  if (tthRaceVR() < 0.35) { if (tthRaceSay(st, ['Oof! Mind your step!', 'Whoops-a-daisy!', 'Hee hee! Bonk!'][Math.floor(tthRaceVR() * 3)], 1.6)) { st.thief.pose = 'laugh'; ph.poseT = 1.2; } }
}
function tthRaceFall(st, r, g) {
  const K = TTHRACE, ph = st.ph, k = r.k;
  r.fallT = K.fall.t; r.fallGap = g; r.clean = 0; r.dash = 0; r.boost = 0; r.gold = 0; r.low = false; r.stun = 0;
  r.stumbles++; ph.stat.stumbles[k]++;
  r.miss.g = (r.miss.g || 0) + 1;
  tthRacePop(ph, k, 'Whoops!', '#ffffff', 22);
  Sfx.play('tthRaceFall', k); rumble(k, 0.4, 0.3, 160);
  if (r.miss.g === 2) tthRaceHint(st, k, 'againg', g.w > 150 ? (g.look === 'bowl' ? 'Jump ' + tthKey(k, 'jump') + ' at the crater\'s rim!' : 'Jump ' + tthKey(k, 'jump') + ' in the updraft!') : 'Jump ' + tthKey(k, 'jump') + ' at the edge!', 3);
}
function tthRaceJump(st, r) {
  const ph = st.ph, J = tthRaceJumpOf(ph.T, r);
  r.buf = 0; r.air = true; r.airT = 0; r.jumped = true; r.low = false; r.flo = J.flo; r.vy = J.v; r.g = J.g;
  if (J.up) {
    tthRacePop(ph, r.k, 'Whoosh!', '#fff3c4', 22);
    for (let n = 0; n < 8; n++) tthRacePart(ph, r.k, r.x - 16 + tthRaceVR() * 32, TTHRACE.gy - 6, -30 + tthRaceVR() * 60, -220 - tthRaceVR() * 160, 0.6, '#ffffff', 2.5, -200);
    Sfx.play('tthRaceWhoosh', r.k);
  } else Sfx.play(J.flo ? 'tthRaceFloat' : 'tthRaceHop', r.k);
}
// through a portal ring into the next lap
function tthRaceRing(st, r) {
  const K = TTHRACE, ph = st.ph, k = r.k, o = ph.R[1 - k], th = ph.T.laps[r.lap].th, hp = ph.help[k];
  r.flash = 0.4;
  const behind = o.x - r.x;
  if (behind > K.catchUp.d) {
    // far behind: a gold boost (announced)
    r.boost = K.catchUp.t; r.gold = K.catchUp.t; r.boosts++;
    tthRacePop(ph, k, 'Gold boost!', C.gold, 24, 1.1);
    if (!ph.goldSaid[k]) { ph.goldSaid[k] = true; tthHelp(st, 'Gold boost for ' + NAMES[k] + ': far behind at a portal, a longer time boost!', { life: 4 }); }
    Sfx.play('tthRaceBoost', k);
  } else if (r.v >= K.boost.min * K.run && r.stun <= 0) {
    r.boost = K.boost.t * (hp ? K.help.boost : 1); r.boosts++; ph.stat.boosts[k]++;
    tthRacePop(ph, k, 'Time boost!', '#9fe9ff', 24, 1.1);
    Sfx.play('tthRaceBoost', k);
    tthRaceHint(st, k, 'boost', 'Fast through a ring: Time boost!', 2.2);
  } else { tthRacePop(ph, k, th.name + '!', '#f6d37a', 20, 1.1); Sfx.play('tthRaceRing', k); }
  for (let n = 0; n < 12; n++) tthRacePart(ph, k, r.x, K.gy - 20 - tthRaceVR() * 110, 60 + tthRaceVR() * 260, -80 + tthRaceVR() * 160, 0.6, n % 3 ? '#b28dff' : '#9fe9ff', 3, 0, 'spark');
  // the first one in: the lap's name and a true fact in the news
  if (!ph.lapSaid[r.lap]) {
    ph.lapSaid[r.lap] = true;
    tthNews(st, th.name + ', ' + th.when + '. ' + th.fact, false, 4.6);
    if (r.lap === ph.T.laps.length - 1) tthRaceSay(st, 'Last lap! Sprint!', 1.8);
  }
  tthRaceLapHint(st, r);
}
function tthRaceLapHint(st, r) {
  const th = st.ph.T.laps[r.lap].th, k = r.k;
  if (th.float) tthRaceHint(st, k, 'float', 'Low gravity: big floaty jumps!', 3);
  if (th.ice) tthRaceHint(st, k, 'ice', 'Ice! Hold ' + tthKey(k, 'down') + ' to slide fast', 3);
}
// one runner's tick (a live race, or the stragglers' run-in after someone has won)
function tthRaceRun(st, r, p, dt) {
  const K = TTHRACE, ph = st.ph, T = ph.T, inp = p.input, k = r.k, hp = ph.help[k];
  const up = tthUp(p);
  if (p.pendingJump || (up && !r.upWas)) r.buf = K.buf; else r.buf = Math.max(0, r.buf - dt);
  p.pendingJump = false; r.upWas = up;
  const act = !!p.pendingAct; p.pendingAct = false;
  r.stun = Math.max(0, r.stun - dt); r.dash = Math.max(0, r.dash - dt); r.dashCd = Math.max(0, r.dashCd - dt); r.boost = Math.max(0, r.boost - dt);
  r.gold = Math.max(0, r.gold - dt); r.land = Math.max(0, r.land - dt); r.flash = Math.max(0, r.flash - dt); r.whoa = Math.max(0, r.whoa - dt);
  if (r.fin != null) { tthRaceRunIn(st, r, dt); return; }
  // down a gap: out for a moment, then popped back up on the far side
  if (r.fallT > 0) {
    r.fallT -= dt; r.y -= 260 * dt; r.buf = 0;
    if (r.fallT <= 0) {
      const g = r.fallGap;
      r.x = g.x1 + 10; r.y = 0; r.v = K.fall.v; r.vy = K.fall.pop; r.g = K.g; r.air = true; r.airT = 0.2; r.jumped = true; r.flo = false; r.stun = 0.15; r.fallGap = null;
      for (let n = 0; n < 6; n++) tthRacePart(ph, k, r.x, K.gy, -80 + tthRaceVR() * 160, -160 - tthRaceVR() * 120, 0.5, '#ffffff', 3, 900);
    }
    return;
  }
  while (r.oi < T.obs.length && r.x > T.obs[r.oi].x1 + 60) r.oi++;
  const th = T.laps[r.lap].th, ice = !!th.ice;
  // what is right here: a gust, a lintel overhead
  let wind = null, ceil = false;
  tthRaceNear(T, r, o => {
    if (o.x0 > r.x + 60) return false;
    if (o.kind === 'w' && r.x >= o.x0 && r.x <= o.x1) wind = o;
    else if (o.kind === 'd' && Math.abs(r.x - o.x) < o.w / 2 + K.hb + 4) ceil = true;
  });
  r.wind = !!wind;
  // the dash
  if (act && r.dashCd <= 0 && r.stun <= 0) {
    r.dash = K.dash.t; r.dashCd = K.dash.cd * (hp ? K.help.cd : 1);
    tthRacePop(ph, k, 'Dash!', '#9fe9ff', 20, 0.7);
    for (let n = 0; n < 10; n++) tthRacePart(ph, k, r.x - 10, K.gy - r.y - 6 - tthRaceVR() * 30, -160 - tthRaceVR() * 200, -60 + tthRaceVR() * 120, 0.5, n % 2 ? '#9fe9ff' : '#b28dff', 3, 0, 'spark');
    Sfx.play('tthRaceDash', k);
  }
  const fast = r.dash > 0 || r.boost > 0;
  let top = K.run + K.flow * Math.min(1, r.clean / K.flowT) + Math.max(r.dash > 0 ? K.dash.add : 0, r.boost > 0 ? K.boost.add : 0);
  if (inp.right) r.runT = 0; else r.runT += dt;
  const run = !inp.left && (inp.right || r.runT < K.grace);
  if (!r.air) {
    // the slide (a duck in a gust): low while ▼ is held, 0.9 s at most, but never standing up under a lintel
    if (r.low) {
      r.lowT += dt;
      if (!ceil && !(wind && inp.down) && (!inp.down || (r.lowT > K.slideMax && !ice))) { r.low = false; r.lowArm = !inp.down; }
    } else if (inp.down && r.lowArm && r.stun <= 0 && (r.v > 60 || wind)) { r.low = true; r.lowT = 0; Sfx.play('tthRaceSlide', k); }
    if (!inp.down) r.lowArm = true;
    let vt, a;
    if (r.low) {
      if (wind) { vt = K.run * K.wind.duck + (fast ? 60 : 0); a = r.v < vt ? K.acc : K.slideFric; }
      else if (ice) { vt = top + K.ice.add; a = r.v < vt ? (fast ? K.dash.acc : K.ice.gain) : 40; }
      else { vt = fast ? top : K.slideMin; a = r.v < vt ? K.dash.acc : K.slideFric; }
    } else if (wind) {
      vt = run ? K.run * K.wind.stand + (fast ? 80 : 0) : 0; a = r.v > vt ? K.wind.brake : K.acc;
      if (r.v > vt + 30 && r.whoa <= 0) { r.whoa = 1.4; tthRacePop(ph, k, 'Whoa!', '#ffffff', 20); r.clean = 0; Sfx.play('tthRaceGust', k); r.miss.w = (r.miss.w || 0) + 1; if (r.miss.w === 2) tthRaceHint(st, k, 'againw', 'Hold ' + tthKey(k, 'down') + ' all the way through the wind', 3); }
    } else if (r.stun > 0) { vt = run ? top * K.st.k : 0; a = r.v < vt ? K.acc * 0.5 : K.fric; }
    else if (run) { vt = top; a = r.v < vt ? (fast ? K.dash.acc : ice ? K.ice.acc : K.acc) : K.over; }
    else { vt = 0; a = inp.left ? (ice ? K.ice.brake : K.brake) : (ice ? K.ice.fric : K.fric); }
    r.v = approach(r.v, vt, a * dt);
    if (r.buf > 0 && r.stun <= 0 && !ceil) tthRaceJump(st, r);
    else {
      r.x += r.v * dt; r.step += r.v * dt * 0.07;
      const g = tthRaceGapAt(T, r, r.x);
      if (g) { r.air = true; r.airT = 0; r.jumped = false; r.flo = false; r.g = K.g; r.vy = 0; r.low = false; r.lastGap = g; }
      else if ((r.dustT -= dt) <= 0 && r.v > 150) {
        r.dustT = r.low ? 0.03 : 0.09;
        tthRacePart(ph, k, r.x - 12, K.gy - 2, -r.v * 0.2 - tthRaceVR() * 40, -30 - tthRaceVR() * 60, 0.35, ice ? '#ffffff' : th.ground[2], 2 + tthRaceVR() * 2, 300);
      }
    }
  } else {
    r.airT += dt;
    if (r.buf > 0 && !r.jumped && r.airT < K.coyote && r.stun <= 0) { r.y = Math.max(r.y, 0); tthRaceJump(st, r); }   // a moment late off an edge still counts
    r.vy -= r.g * (inp.down && r.jumped ? K.dive : 1) * dt; r.y += r.vy * dt;
    if (wind) { const vt = K.run * K.wind.stand; if (r.v > vt) r.v = Math.max(vt, r.v - K.wind.brake * dt); }
    else if (fast && r.v < top) r.v = Math.min(top, r.v + K.dash.acc * 0.6 * dt);
    else if (run && r.v < top) r.v = Math.min(top, r.v + K.acc * 0.3 * dt);
    r.x += r.v * dt;
    if (r.y <= 0) {
      const g = tthRaceGapAt(T, r, r.x);
      if (g) { r.lastGap = g; if (r.y < -K.fall.depth) tthRaceFall(st, r, g); }
      else if (r.y < -12 && r.lastGap && r.x < r.lastGap.x1 + 20) tthRaceFall(st, r, r.lastGap);   // into the far wall
      else {
        if (r.airT > 0.2) { Sfx.play('tthRaceLand', k); for (let n = 0; n < 5; n++) tthRacePart(ph, k, r.x - 12 + tthRaceVR() * 24, K.gy - 1, -60 + tthRaceVR() * 120, -50 - tthRaceVR() * 70, 0.4, ice ? '#ffffff' : th.ground[2], 2.5, 400); }
        r.y = 0; r.vy = 0; r.air = false; r.flo = false; r.land = 0.18; r.lowArm = true;
      }
    }
  }
  // a clean run builds flow
  if (r.v > K.run * 0.8 && r.stun <= 0) r.clean += dt; else if (r.v < K.run * 0.5) r.clean = Math.max(0, r.clean - dt * 2);
  if (r.fallT > 0) return;
  // the things in the way
  tthRaceNear(T, r, o => {
    if (o.x0 > r.x + K.met.trig + 40) return false;
    if (o.kind === 'm' && o.t0[k] == null && r.x > o.x - K.met.trig) { o.t0[k] = ph.t; Sfx.play('tthRaceMeteor', k); }
    if (o.hit[k] || Math.abs(r.x - o.x) >= o.w / 2 + K.hb) return;
    if ((o.kind === 'h' || o.kind === 'm') && tthRaceRockOn(ph, o, k) && r.y < o.h - 4) {
      o.hit[k] = true; tthRaceStumble(st, r, o);
      if (!r.air) { r.air = true; r.airT = 0.2; r.jumped = true; r.flo = false; r.g = K.g; r.vy = 210; }
    } else if (o.kind === 'd' && r.y + (r.low ? K.lowH : K.standH) > K.duckC + 3) {
      o.hit[k] = true; tthRaceStumble(st, r, o);
      if (r.air) r.vy = Math.min(r.vy, 0);
    }
  });
  // meteors landing in this lane: a thump
  tthRaceNear(T, r, o => { if (o.kind === 'm' && o.t0[k] != null && !o['boom' + k] && ph.t >= o.t0[k] + K.met.fall) { o['boom' + k] = true; tthRaceBoom(st, k, o); } });
  // the portal rings
  while (r.lap < T.laps.length - 1 && r.x >= T.laps[r.lap + 1].x0) { r.lap++; tthRaceRing(st, r); }
  tthRaceHints(st, r);
}
function tthRaceBoom(st, k, o) {
  const ph = st.ph, K = TTHRACE;
  for (let n = 0; n < 12; n++) tthRacePart(ph, k, o.x, K.gy - 6, -200 + tthRaceVR() * 400, -120 - tthRaceVR() * 260, 0.7, n % 3 ? '#ff9a4d' : '#6b4a3a', 3 + tthRaceVR() * 3, 1100);
  Sfx.play('tthRaceBoom', k); rumble(k, 0.5, 0.5, 160);
  ph.quake[k] = 0.25;
  if (!reduceMotion) G.shake = Math.max(G.shake, 0.1);
}
// after the line: jog on into the home portal
function tthRaceRunIn(st, r, dt) {
  const K = TTHRACE, T = st.ph.T, px = T.len + K.finPortal;
  if (r.air) { r.vy -= r.g * dt; r.y += r.vy * dt; if (r.y <= 0) { r.y = 0; r.vy = 0; r.air = false; r.land = 0.18; } }
  r.low = false; r.stun = 0;
  r.v = approach(r.v, 300, 500 * dt);
  if (r.x < px - 6) { r.x = Math.min(px - 6, r.x + r.v * dt); r.step += r.v * dt * 0.07; }
  else { if (r.goneT === 0) Sfx.play('tthRaceIn', r.k); r.goneT += dt; }
}
// first-time hints as each kind of thing comes into view
function tthRaceHints(st, r) {
  const ph = st.ph, k = r.k, H = ph.hinted[k];
  if (tthRaceCpu(k)) return;
  tthRaceNear(ph.T, r, o => {
    const d = o.x0 - r.x;
    if (d < 0 || d > 520) return;
    const key = o.kind === 'h' && o.look === 'hurdle' ? 'hurdle' : o.kind === 'g' && o.w > 150 ? 'G' + o.look : o.kind;
    if (H[key]) return;
    const J = tthKey(k, 'jump'), D = tthKey(k, 'down');
    const text = { h: 'Hop ' + J + ' over it!', hurdle: 'Hurdles: hop ' + J + ', hop, hop!', m: 'A meteor! Hop ' + J + ' the hot rock', d: 'Slide ' + D + ' under it!', g: 'Jump ' + J + ' the gap!',
      Gbowl: 'A crater: jump ' + J + ' at the rim!', u: 'Jump ' + J + ' in the updraft!', w: 'Wind! Hold ' + D + ' to duck' }[key];
    if (text) tthRaceHint(st, k, key, text, 2.6);
    return false;
  });
  if (!H.dash && ph.t > 5 && r.dashCd <= 0 && r.stun <= 0 && !st.hints[k]) tthRaceHint(st, k, 'dash', tthKey(k, 'act') + ': a time dash!', 2.6);
}

/* ---------- the race flow: card (3-2-1) -> live -> fin -> next card | crown ---------- */
function tthRaceNewRace(st, mode) {
  const K = TTHRACE, ph = st.ph;
  const ti = mode ? ph.ti : Math.min(ph.raceN - 1, TTHRACE_RACES.length - 1);
  ph.ti = ti; ph.T = tthRaceTrack(ti);
  ph.state = 'card'; ph.cardT = mode === 'again' ? K.cardT - 3.2 : 0; ph.t = 0; ph.end = null; ph.endT = 0; ph.go = 0;
  ph.R = [tthRaceRunner(0), tthRaceRunner(1)];
  ph.help = [0, 1].map(k => (ph.wins[1 - k] > ph.wins[k] ? 1 : 0));
  ph.replay = mode === 'tie';
  ph.cam = [0, 1].map(() => ({ x: -K.riderX, lead: 0 }));
  ph.parts = []; ph.pops = []; ph.quake = [0, 0];
  ph.stat = { stumbles: [0, 0], boosts: [0, 0] };
  ph.limit = ph.T.len / K.run * K.limitK + 12;
  ph.lapSaid = [false, false, false]; ph.goldSaid = [false, false]; ph.leader = -1; ph.leadT = 0; ph.wasIdle = false; ph.falseStart = false;
  if (ph.help.some(Boolean) && mode !== 'again') {
    const h = ph.help[0] ? 0 : 1;
    tthHelp(st, 'Gold shoes for ' + NAMES[h] + ': a quicker dash and softer stumbles!', { id: h, hint: 'Gold shoes!', life: 4.5 });
  }
  Sfx.play('tthRaceCard');
}
function tthRaceCams(st, dt) {
  const K = TTHRACE, ph = st.ph;
  for (const k of [0, 1]) {
    const r = ph.R[k], c = ph.cam[k];
    c.lead = approach(c.lead, clamp((r.v - K.run - 30) * 0.2, 0, 40), 50 * dt);   // going fast: a little more road ahead
    c.x = Math.min(r.x, ph.T.len + 70) - (K.riderX - c.lead);
  }
}
function tthRaceFx(st, dt) {
  const ph = st.ph;
  for (let i = ph.parts.length - 1; i >= 0; i--) {
    const q = ph.parts[i];
    q.life -= dt;
    if (q.life <= 0) { ph.parts.splice(i, 1); continue; }
    q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt;
  }
  for (let i = ph.pops.length - 1; i >= 0; i--) { ph.pops[i].t += dt; if (ph.pops[i].t > ph.pops[i].life) ph.pops.splice(i, 1); }
  ph.quake[0] = Math.max(0, ph.quake[0] - dt); ph.quake[1] = Math.max(0, ph.quake[1] - dt);
  ph.sayCd = Math.max(0, ph.sayCd - dt);
  if (ph.poseT > 0 && (ph.poseT -= dt) <= 0 && ph.state !== 'crown') st.thief.pose = 'idle';
}
// the engine players mirror each runner's screen spot (hint bubbles, the computer's bubbles)
function tthRaceMirror(st) {
  const K = TTHRACE, ph = st.ph;
  if (!ph.R) return;
  if (ph.state === 'crown') { tthRaceCrownPlace(st); return; }
  for (const p of G.players) {
    const r = ph.R[p.id], c = ph.cam[p.id];
    p.w = PW; p.h = PH;
    p.x = r.x - c.x - PW / 2 + st.cam.x; p.y = K.laneY[p.id] + K.gy - Math.max(0, r.y) - PH * K.RS + st.cam.y;
    p.vx = 0; p.vy = 0; p.alive = true; p.face = 1; p.grounded = !r.air; p.stun = 0; p.knockT = 0; p.sx = 1; p.sy = 1;
  }
}
function tthRaceFinish(st, crossed) {
  const ph = st.ph, [a, b] = ph.R;
  ph.state = 'fin'; ph.endT = 0;
  Sfx.play('tthRaceFinish');
  if (crossed.length === 2 && Math.abs(a.fin - b.fin) < TTHRACE.tieEps) { tthRaceTie(st, 'Dead heat!'); return; }
  const w = crossed.length === 2 ? (a.fin < b.fin ? 0 : 1) : crossed[0].k, L = ph.R[1 - w], R = ph.R[w];
  const lt = L.fin != null ? L.fin : ph.t + (ph.T.len - L.x) / Math.max(150, L.v);
  const m = Math.max(0.01, lt - R.fin);
  tthRaceResult(st, w, m < 0.1 ? 'by ' + m.toFixed(2) + ' s! Photo finish!' : 'by ' + m.toFixed(1) + ' s' + (m < 1 ? '!' : ''), m);
}
// A tie (a dead heat, or neck and neck at the bell): replay the race. A 2nd tie in a row is settled: fewer stumbles,
// else more time boosts, else the Thief's lucky watch (announced), so a tie can never replay for ever.
function tthRaceTie(st, word) {
  const ph = st.ph, [a, b] = ph.R;
  ph.ties++;
  if (ph.ties >= 2) {
    if (a.stumbles !== b.stumbles) { tthRaceResult(st, a.stumbles < b.stumbles ? 0 : 1, 'Fewer stumbles wins the tie!'); return; }
    if (a.boosts !== b.boosts) { tthRaceResult(st, a.boosts > b.boosts ? 0 : 1, 'More time boosts wins the tie!'); return; }
    const w = tthRand() < 0.5 ? 0 : 1;
    tthRaceSay(st, 'A tie again?! My lucky watch says... ' + NAMES[w] + '!', 2.6, true);
    tthRaceResult(st, w, 'The Thief\'s lucky watch!', null, true);
    return;
  }
  ph.end = { w: -1, reason: word };
  tthNews(st, word + ' Race again!', false, 2.6);
  tthRaceSay(st, word === 'Dead heat!' ? 'Exactly the same?! Wow!' : 'So close! Again!', 2, true);
}
function tthRaceResult(st, w, reason, margin, quiet) {
  const ph = st.ph, s = tthStats(st), R = ph.R[w];
  ph.ties = 0;
  ph.wins[w]++;
  ph.end = { w, reason };
  s.wins = ph.wins.slice();
  s.races = s.races || [];
  s.races.push({ track: ph.T.name, w, t: R.fin != null ? Math.round(R.fin * 10) / 10 : null });
  for (const key of ['stumbles', 'boosts']) { s[key] = s[key] || [0, 0]; for (const k of [0, 1]) s[key][k] += ph.stat[key][k]; }
  s.best = s.best || [null, null];
  for (const q of ph.R) if (q.fin != null && (s.best[q.k] == null || q.fin < s.best[q.k])) s.best[q.k] = Math.round(q.fin * 10) / 10;
  const champ = ph.wins[w] >= TTHRACE.win;
  tthNews(st, NAMES[w] + ' wins race ' + ph.raceN + ' ' + reason + (champ ? '' : '   ' + NAMES[0] + ' ' + ph.wins[0] + ' - ' + ph.wins[1] + ' ' + NAMES[1]), false, 2.8);
  if (!quiet) tthRaceSay(st, margin != null && margin < 0.5 ? 'What a finish! ' + NAMES[w] + ' by a nose!' : NAMES[w] + ' wins! What a race!', 2.2, true);
  st.thief.pose = 'cheer'; ph.poseT = 2.6;
  Sfx.play('tthRaceWin', w);
  if (champ) s.champ = w;
}
function tthRaceAfter(st) {
  const ph = st.ph;
  if (ph.end && ph.end.w < 0) { tthRaceNewRace(st, 'tie'); return; }
  ph.raceN++;
  if (ph.wins[0] >= TTHRACE.win || ph.wins[1] >= TTHRACE.win) { tthRaceCrownStart(st); return; }
  tthRaceNewRace(st, '');
}
function tthRaceBell(st) {
  const ph = st.ph, [a, b] = ph.R, d = a.x - b.x;
  ph.state = 'fin'; ph.endT = 0;
  Sfx.play('tthRaceFinish');
  if (Math.abs(d) < 6) { tthRaceTie(st, 'Neck and neck!'); return; }
  tthRaceResult(st, d > 0 ? 0 : 1, '(the furthest when the bell rang)!');
}
// the Thief calls a new leader (not at every little wobble)
function tthRaceLead(st, dt) {
  const ph = st.ph, [a, b] = ph.R, d = a.x - b.x;
  if (ph.t < 4 || a.fin != null || b.fin != null) return;
  const now = d > 50 ? 0 : d < -50 ? 1 : ph.leader;
  if (now === ph.leader) { ph.leadT = 0; return; }
  if ((ph.leadT += dt) < 0.4) return;
  const first = ph.leader < 0;
  ph.leader = now; ph.leadT = 0;
  if (!first) tthRaceSay(st, NAMES[now] + ' takes the lead!', 1.6);
}

/* ---------- the crowning: the Thief hands over the Golden Hourglass ---------- */
function tthRaceCrownStart(st) {
  const ph = st.ph, c = st.thief, w = ph.end.w;
  ph.state = 'crown'; ph.crT = 0; ph.champ = w; ph.crownSaid = 0;
  Object.assign(c, { hidden: false, alpha: 1, x: W + 60, y: 456, s: 0.95, face: -1, pose: 'run', mood: 'happy', baseMood: 'happy', jet: false, item: null, sayAt: null, look: null });
  st.hints = [null, null]; st.news = null; st.say = null;
  tthCelebrate(st, TTHRACE.crownT + 1);
  tthRaceCrownPlace(st);
  Sfx.play('tthRaceCrown');
}
function tthRaceCrownPlace(st) {
  const ph = st.ph, w = ph.champ, t = ph.crT;
  for (const p of G.players) {
    p.w = PW; p.h = PH; p.alive = true; p.vx = 0; p.stun = 0; p.knockT = 0;
    const champ = p.id === w;
    const fx = champ ? W / 2 - 40 : W / 2 - 200, fy = champ ? 396 : 456;
    const hop = champ ? (t > 2.2 ? Math.abs(Math.sin((t - 2.2) * 6)) * 18 : 0) : Math.abs(Math.sin(t * 5 + 1)) * 12;
    p.x = fx - PW / 2 + st.cam.x; p.y = fy - PH - hop + st.cam.y; p.vy = hop > 1 ? -100 : 0;
    p.face = 1; p.grounded = hop < 1; p.sx = 1; p.sy = 1;
  }
}
function tthRaceCrownStep(st, dt) {
  const ph = st.ph, c = st.thief, K = TTHRACE, w = ph.champ;
  ph.crT += dt;
  const t = ph.crT, tx = W / 2 + 110;
  // he trots in beside the podium, holds up the hourglass, hands it over, then cheers
  if (t < 1.1) { const u = t / 1.1, e = 1 - (1 - u) * (1 - u); c.x = W + 60 - (W + 60 - tx) * e; c.pose = 'run'; }
  else { c.x = tx; c.pose = t < 2.3 ? 'grab' : 'cheer'; }
  c.y = 456; c.face = -1;
  if (ph.crownSaid === 0 && t > 0.3) { ph.crownSaid = 1; tthSay(st, 'Race champ: ' + NAMES[w] + '! My Golden Hourglass is yours!', 2.6); }
  if (ph.crownSaid === 1 && t > 2.2) { ph.crownSaid = 2; Sfx.play('tthCheer'); for (let n = 0; n < 8; n++) confetti(st.cam.x + W / 2 - 40 + (n - 3.5) * 28, st.cam.y + 300); }
  if (t > 2.2 && (G.tickN % 10) === 0) confetti(st.cam.x + 120 + tthRaceVR() * (W - 240), st.cam.y + 60 + tthRaceVR() * 60);
  tthRaceCrownPlace(st);
  if (t >= K.crownT) {
    const s = tthStats(st); s.champ = w; s.wins = ph.wins.slice();
    tthPhaseDone(st, { say: NAMES[w] + ' wins the race home!' });
  }
}
// where the hourglass is: from his hands to over the champ's head (screen)
function tthRaceCrownAt(st) {
  const ph = st.ph, t = ph.crT, p = G.players[ph.champ], hx = p.x + p.w / 2, hy = p.y - 20;
  const P = tthThiefPts(st.thief), from = { x: P.head.x - 44, y: P.head.y + 26 };
  if (t < 1.7) return from;
  const u = clamp((t - 1.7) / 0.6, 0, 1), e = u * u * (3 - 2 * u);
  return { x: from.x + (hx - from.x) * e, y: from.y + (hy - from.y) * e - Math.sin(e * Math.PI) * 60 };
}

/* ---------- the phase ---------- */
TTH_PHASES.race = {
  bubbleHidden: true,   // (the lanes draw the runners: the computer's bubbles still show, over its runner)
  setup(st) {
    const ph = st.ph, c = st.thief, K = TTHRACE;
    // the Thief at his commentator's desk, between the lanes at the right
    Object.assign(c, { hidden: false, alpha: 1, jet: false, item: null, mood: 'happy', baseMood: 'happy', pose: 'wave', s: 0.5, face: -1, x: W - 84, y: K.laneY[1], sayAt: null, look: null });
    ph.wins = [0, 0]; ph.raceN = 1; ph.ties = 0; ph.ti = 0; ph.sayCd = 0; ph.poseT = 0;
    ph.hinted = [{}, {}];
    st.cam = { x: 0, y: 0 };
    tthRaceNewRace(st, '');
    tthRaceCams(st, 0);
    tthRaceMirror(st);
  },
  wait(st, dt) { st.idleT = 0; tthRaceFx(st, dt); tthRaceMirror(st); },   // (reading the era card is not being away)
  coast(st, dt) { tthRaceFx(st, dt); tthRaceMirror(st); },
  step(st, dt) {
    const ph = st.ph, K = TTHRACE;
    st.cam.x = 0; st.cam.y = 0;
    if (ph.state === 'crown') { st.idle = false; st.idleT = 0; tthRaceCrownStep(st, dt); return; }   // (a little scene: no idle nagging over it)
    if (st.idle) {
      // the Thief waits: nothing moves. Away at GO (no person left the start): a false start, run again when they are back
      if (!ph.wasIdle) { ph.wasIdle = true; ph.falseStart = ph.state === 'live' && tthHumanIds().every(k => ph.R[k].x < 150); }
      for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
      tthRaceMirror(st); return;
    }
    if (ph.wasIdle) {
      ph.wasIdle = false;
      if (ph.falseStart) { for (const h of ph.hinted) delete h.go; tthRaceNewRace(st, 'again'); tthRaceCams(st, 0); tthRaceSay(st, 'There you are! Ready... set...', 2, true); }
    }
    if (ph.state === 'card') {
      for (const p of G.players) { p.pendingJump = false; p.pendingAct = false; }
      const was = ph.cardT;
      if (G.introT <= 0) ph.cardT += dt;   // (race 1: the race card waits for the era card to go)
      if (was < 0.15 && ph.cardT >= 0.15) { tthRaceSay(st, ph.replay ? 'A tie?! Run it again!' : ph.T.say, 2.6, true); st.thief.pose = 'wave'; ph.poseT = 2.2; }
      for (const n of [1, 2, 3]) if (was < K.cardT - n && ph.cardT >= K.cardT - n) { Sfx.play('tthRaceBeep'); if (n === 3) { st.thief.pose = 'point'; ph.poseT = 3.8; tthRaceSay(st, 'Ready... set...', 2.4, true); } }
      if (ph.cardT >= K.cardT) {
        ph.state = 'live'; ph.go = 1; Sfx.play('tthRaceGo');
        const th = ph.T.laps[0].th;
        ph.lapSaid[0] = true; tthNews(st, th.name + ', ' + th.when + '. ' + th.fact, false, 4.6);
        tthRaceSay(st, 'GO! Run, run, run!', 1.4, true);
        for (const k of [0, 1]) { tthRaceHint(st, k, 'go', 'Hold ' + tthKey(k, 'right') + ' to run!', 3); tthRaceLapHint(st, ph.R[k]); }
      }
    } else if (ph.state === 'live' || ph.state === 'fin') {
      const live = ph.state === 'live', crossed = [];
      ph.t += dt; ph.go = Math.max(0, ph.go - dt);
      if (!live) ph.endT += dt;
      for (const r of ph.R) {
        const x0 = r.x, was = r.fin;
        tthRaceRun(st, r, G.players[r.k], dt);
        if (was == null && r.x >= ph.T.len) {
          r.fin = ph.t - dt + clamp(r.x > x0 ? (ph.T.len - x0) / (r.x - x0) : 1, 0, 1) * dt; crossed.push(r);
          for (let n = 0; n < 14; n++) tthRacePart(ph, r.k, ph.T.len, K.gy - 10 - tthRaceVR() * 90, -120 + tthRaceVR() * 300, -200 + tthRaceVR() * 200, 0.8, n % 2 ? C.gold : '#ffffff', 3, 300, 'spark');
        }
      }
      if (live) {
        if (crossed.length) tthRaceFinish(st, crossed);
        else if (ph.t >= ph.limit) tthRaceBell(st);
        else tthRaceLead(st, dt);
      } else if (ph.endT >= K.endT) tthRaceAfter(st);
    }
    tthRaceFx(st, dt);
    if (ph.state !== 'crown') tthRaceCams(st, dt);
    tthRaceMirror(st);
  },
  hide: st => st.ph.state !== 'crown',
  busy: () => true,       // (no team bumps here: race stumbles are the race's own)
  labels: () => ['dash', 'dash'],
  legend: () => ({ jump: 'hop', down: 'slide', padJump: 'hop', padDown: 'down slides' }),
  roles: () => null,
  hudText(st) { const ph = st.ph; return ph.state === 'crown' ? 'Champ!' : 'Race ' + ph.raceN + (ph.replay ? ' again' : ''); },
  progress(st) { const ph = st.ph; return { n: ph.wins[0] + ph.wins[1], of: 3 }; },
  headLift: () => 0,
  drawBack(st) { tthRaceDrawBack(st); },
  draw(st) { if (st.ph.R && st.ph.state !== 'crown') tthRaceDrawDesk(st); },
  drawTop(st) { if (st.ph.state === 'crown') tthRaceDrawCrown(st); },
  hud(st) { tthRaceHud(st); },
  statLine(st) {
    const s = st.stats.race;
    if (!s || s.champ == null || s.champ < 0) return '';
    return 'Race champ: ' + NAMES[s.champ] + (s.wins ? ' (' + Math.max(s.wins[0], s.wins[1]) + '-' + Math.min(s.wins[0], s.wins[1]) + ')' : '');
  },
};

/* ---------- drawing: the backdrops, one per time period (lane coords: 0..W across, the ground line at gy) ---------- */
const tthRaceSkyG = {};
// a ridge line across the lane, filled down to the ground
function tthRaceRidge(off, y, a1, f1, a2, f2, col) {
  const gy = TTHRACE.gy;
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, gy);
  for (let x = 0; x <= W + 24; x += 24) { const wx = x + off; ctx.lineTo(x, y + Math.sin(wx * f1) * a1 + Math.sin(wx * f2 + 1.3) * a2); }
  ctx.lineTo(W + 24, gy); ctx.closePath(); ctx.fill();
}
// far things that repeat every sp px: fn(x on screen, n)
function tthRaceEach(off, sp, pad, fn) { for (let n = Math.floor((off - pad) / sp); n * sp - off < W + pad; n++) fn(n * sp - off, n); }
const TTHRACE_BACK = {
  dino(u, t) {
    const gy = TTHRACE.gy, vx = 660 - u * 0.03;
    // a smoking volcano, a long-neck far off, jungle
    ctx.fillStyle = '#8a5a52'; ctx.beginPath(); ctx.moveTo(vx - 180, gy); ctx.lineTo(vx - 28, 44); ctx.lineTo(vx + 28, 44); ctx.lineTo(vx + 180, gy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff9a4d'; ctx.beginPath(); ctx.ellipse(vx, 45, 28, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffb35a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(vx + 8, 48); ctx.quadraticCurveTo(vx + 20, 90, vx + 62, 126); ctx.stroke();
    for (let n = 0; n < 4; n++) { const k = (t * 0.12 + n / 4) % 1; ctx.fillStyle = `rgba(110,96,110,${0.5 * (1 - k)})`; circle(vx + k * 46 + Math.sin(n * 2) * 8, 36 - k * 40, 10 + k * 16); ctx.fill(); }
    tthRaceRidge(u * 0.08, 124, 12, 0.006, 5, 0.017, '#3f9a80');
    tthRaceEach(u * 0.12, 1250, 180, x => {
      const bx = x + 330, by = 128;
      ctx.fillStyle = '#2f806c'; ctx.strokeStyle = '#2f806c'; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(bx, by - 16, 36, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(bx - 24, by - 12, 9, 26); ctx.fillRect(bx + 14, by - 12, 9, 26);
      ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(bx + 28, by - 22); ctx.quadraticCurveTo(bx + 46, by - 60, bx + 62, by - 66 + Math.sin(t * 0.8) * 3); ctx.stroke();
      ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(bx - 32, by - 16); ctx.quadraticCurveTo(bx - 60, by - 14, bx - 76, by - 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(bx + 66, by - 67 + Math.sin(t * 0.8) * 3, 8, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.lineCap = 'butt';
    });
    tthRaceRidge(u * 0.3, 150, 7, 0.021, 4, 0.047, '#2f7a50');
    tthRaceEach(u * 0.3, 230, 70, (x, n) => {
      const h = 58 + (hash(n, 3) % 30), tx = x + 3;
      ctx.strokeStyle = '#6b4a30'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, gy); ctx.quadraticCurveTo(x + 8, gy - h / 2, tx, gy - h); ctx.stroke();
      ctx.strokeStyle = n % 2 ? '#3f9a5a' : '#2f8550'; ctx.lineWidth = 5;
      for (const [dx, dy] of [[-34, 4], [-24, -16], [0, -24], [24, -16], [34, 4]]) { ctx.beginPath(); ctx.moveTo(tx, gy - h); ctx.quadraticCurveTo(tx + dx * 0.6, gy - h + dy - 8, tx + dx, gy - h + dy + 10); ctx.stroke(); }
      ctx.lineCap = 'butt';
    });
  },
  henge(u) {
    const gy = TTHRACE.gy;
    // sunrise over the downs, a stone circle far off, bushes and sheep
    ctx.fillStyle = 'rgba(255,240,190,0.35)'; circle(740, 104, 56); ctx.fill();
    ctx.fillStyle = '#fff3c4'; circle(740, 104, 34); ctx.fill();
    tthRaceRidge(u * 0.05, 120, 10, 0.004, 4, 0.011, '#b9dba0');
    tthRaceEach(u * 0.12, 1500, 220, x => {
      ctx.fillStyle = '#8f9aa8';
      for (let i = -2; i <= 2; i++) { const px = x + 520 + i * 30, py = 104 + Math.abs(i) * 3; ctx.fillRect(px - 10, py, 6, 26); ctx.fillRect(px + 4, py, 6, 26); ctx.fillRect(px - 13, py - 6, 26, 6); }
    });
    tthRaceRidge(u * 0.12, 134, 8, 0.007, 4, 0.019, '#9fcf85');
    tthRaceEach(u * 0.32, 270, 90, (x, n) => {
      ctx.fillStyle = '#6fae62'; circle(x, gy - 6, 15); ctx.fill(); circle(x + 16, gy - 4, 11); ctx.fill();
      if (n % 3 === 0) {
        const sx = x + 110, sy = gy - 13;
        ctx.fillStyle = '#3a3340'; ctx.fillRect(sx - 7, sy + 5, 3, 9); ctx.fillRect(sx + 5, sy + 5, 3, 9); circle(sx + 13, sy - 2, 5); ctx.fill();
        ctx.fillStyle = '#fbf7ee'; ctx.beginPath(); ctx.ellipse(sx, sy, 13, 9, 0, 0, Math.PI * 2); ctx.fill();
      }
    });
  },
  olympics(u) {
    const gy = TTHRACE.gy;
    // bright Greek noon: hills, a temple, cypress trees
    ctx.fillStyle = 'rgba(255,250,200,0.4)'; circle(130, 46, 38); ctx.fill(); ctx.fillStyle = '#fff6c0'; circle(130, 46, 22); ctx.fill();
    tthRaceRidge(u * 0.05, 116, 12, 0.005, 5, 0.013, '#a8d3a8');
    tthRaceEach(u * 0.15, 1400, 240, x => {
      const cx = x + 430;
      ctx.fillStyle = '#efe6d0'; ctx.beginPath(); ctx.moveTo(cx - 80, 86); ctx.lineTo(cx, 60); ctx.lineTo(cx + 80, 86); ctx.closePath(); ctx.fill();
      ctx.fillRect(cx - 76, 86, 152, 8); ctx.fillRect(cx - 80, 130, 160, 6); ctx.fillRect(cx - 86, 136, 172, 6);
      ctx.fillStyle = '#fffaf0'; for (let i = 0; i < 6; i++) ctx.fillRect(cx - 68 + i * 25.4, 94, 9, 36);
      ctx.fillStyle = '#d9cdb0'; for (let i = 0; i < 6; i++) ctx.fillRect(cx - 62 + i * 25.4, 94, 3, 36);
    });
    tthRaceRidge(u * 0.15, 142, 5, 0.009, 3, 0.02, '#8fc48a');
    tthRaceEach(u * 0.3, 200, 90, (x, n) => {
      ctx.fillStyle = '#3f8558'; ctx.beginPath(); ctx.ellipse(x, gy - 32, 9, 33, 0, 0, Math.PI * 2); ctx.fill();
      if (n % 2) { ctx.fillStyle = '#86b874'; circle(x + 84, gy - 9, 14); ctx.fill(); circle(x + 98, gy - 6, 10); ctx.fill(); }
    });
  },
  troy(u, t) {
    const gy = TTHRACE.gy;
    // sunset over the sea, the wooden horse on the shore, the city's towers
    ctx.fillStyle = '#ffd98a'; circle(700, 128, 30); ctx.fill();
    ctx.fillStyle = '#4a6fa0'; ctx.fillRect(0, 128, W, gy - 128);
    ctx.strokeStyle = 'rgba(255,220,160,0.55)'; ctx.lineWidth = 2;
    for (let n = 0; n < 7; n++) { const x = 560 + n * 44 + Math.sin(t * 1.5 + n) * 6, y = 133 + (n % 3) * 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 22, y); ctx.stroke(); }
    tthRaceRidge(u * 0.1, 150, 3, 0.01, 2, 0.03, '#b08f66');
    tthRaceEach(u * 0.1, 1700, 220, x => {
      const cx = x + 540;
      ctx.fillStyle = '#7a5236';
      rr(cx - 34, 100, 68, 28, 8); ctx.fill();
      for (const lx of [-28, -13, 8, 22]) ctx.fillRect(cx + lx, 126, 7, 20);
      ctx.beginPath(); ctx.moveTo(cx + 16, 106); ctx.lineTo(cx + 36, 72); ctx.lineTo(cx + 48, 80); ctx.lineTo(cx + 34, 112); ctx.closePath(); ctx.fill();
      rr(cx + 34, 66, 28, 14, 5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + 38, 67); ctx.lineTo(cx + 41, 58); ctx.lineTo(cx + 46, 67); ctx.closePath(); ctx.fill();
      ctx.fillRect(cx - 46, 146, 92, 5); circle(cx - 30, 152, 6); ctx.fill(); circle(cx + 30, 152, 6); ctx.fill();
      ctx.strokeStyle = '#7a5236'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - 34, 106); ctx.quadraticCurveTo(cx - 48, 112, cx - 44, 126); ctx.stroke();
    });
    ctx.fillStyle = '#a08a70'; ctx.fillRect(0, gy - 20, W, 20);
    tthRaceEach(u * 0.26, 390, 80, (x, n) => {
      const h = 52 + (hash(n, 3) % 30);
      ctx.fillStyle = '#8f7560'; ctx.fillRect(x - 22, gy - h, 44, h);
      for (let i = 0; i < 3; i++) ctx.fillRect(x - 22 + i * 17, gy - h - 8, 10, 8);
      ctx.fillStyle = '#4a3a40'; rr(x - 5, gy - h + 14, 10, 16, 5); ctx.fill();
      if (n % 2) { ctx.strokeStyle = '#4a3a40'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, gy - h - 8); ctx.lineTo(x, gy - h - 30); ctx.stroke(); ctx.fillStyle = '#d9483a'; ctx.beginPath(); ctx.moveTo(x, gy - h - 30); ctx.lineTo(x + 16, gy - h - 25 + Math.sin(t * 5 + n) * 2); ctx.lineTo(x, gy - h - 20); ctx.closePath(); ctx.fill(); }
    });
  },
  vikings(u, t) {
    const gy = TTHRACE.gy;
    // northern lights, icebergs on a dark sea, a longship
    for (let n = 0; n < 16; n++) { const h = hash(n, 11); ctx.fillStyle = 'rgba(255,255,255,0.8)'; circle(h % W, (h >>> 10) % 110, 1 + (h % 2) * 0.5); ctx.fill(); }
    ctx.lineWidth = 16; ctx.lineCap = 'round';
    for (let b = 0; b < 3; b++) {
      ctx.strokeStyle = ['rgba(120,255,190,0.22)', 'rgba(110,220,255,0.18)', 'rgba(190,150,255,0.16)'][b]; ctx.beginPath();
      for (let x = -20; x <= W + 40; x += 40) ctx.lineTo(x, 34 + b * 17 + Math.sin(x * 0.008 + t * 0.5 + b * 2) * 12);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#255f80'; ctx.fillRect(0, 136, W, gy - 136);
    tthRaceEach(u * 0.08, 470, 130, (x, n) => {
      const h = hash(n, 5) % 30;
      ctx.fillStyle = '#d9f2ff'; ctx.beginPath(); ctx.moveTo(x - 64, 150); ctx.lineTo(x - 30, 96 - h); ctx.lineTo(x - 6, 112 - h); ctx.lineTo(x + 20, 78 - h); ctx.lineTo(x + 64, 150); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#a8d8f0'; ctx.beginPath(); ctx.moveTo(x + 20, 78 - h); ctx.lineTo(x + 64, 150); ctx.lineTo(x + 14, 150); ctx.closePath(); ctx.fill();
    });
    tthRaceEach(u * 0.18, 1600, 220, x => {
      const cx = x + 620, wy = 150;
      ctx.fillStyle = '#fbf3e0'; rr(cx - 28, wy - 58, 56, 36, 4); ctx.fill();
      ctx.fillStyle = '#d9483a'; for (let i = 0; i < 3; i++) ctx.fillRect(cx - 24 + i * 20, wy - 58, 9, 36);
      ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, wy - 62); ctx.lineTo(cx, wy - 8); ctx.stroke();
      ctx.fillStyle = '#7a4a2a'; ctx.beginPath(); ctx.moveTo(cx - 64, wy - 22); ctx.quadraticCurveTo(cx - 58, wy - 4, cx - 40, wy); ctx.lineTo(cx + 40, wy); ctx.quadraticCurveTo(cx + 60, wy - 6, cx + 66, wy - 30); ctx.lineTo(cx + 58, wy - 30); ctx.quadraticCurveTo(cx + 52, wy - 12, cx + 40, wy - 10); ctx.lineTo(cx - 40, wy - 10); ctx.quadraticCurveTo(cx - 52, wy - 12, cx - 58, wy - 24); ctx.closePath(); ctx.fill();
      circle(cx + 66, wy - 33, 5); ctx.fill();
      for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#ffd23f' : '#c0504a'; circle(cx - 28 + i * 14, wy - 6, 4.5); ctx.fill(); }
    });
    tthRaceEach(u * 0.4, 340, 70, (x, n) => { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(x, 158 + (hash(n, 2) % 8), 38, 5, 0, 0, Math.PI * 2); ctx.fill(); });
  },
  davinci(u) {
    const gy = TTHRACE.gy;
    // a golden afternoon: Tuscan hills, the great dome, a town of red roofs
    ctx.fillStyle = 'rgba(255,252,225,0.5)'; circle(810, 48, 40); ctx.fill(); ctx.fillStyle = '#fffbe0'; circle(810, 48, 24); ctx.fill();
    tthRaceRidge(u * 0.04, 118, 9, 0.005, 4, 0.012, '#c4bf86');
    tthRaceEach(u * 0.13, 1700, 280, x => {
      const cx = x + 540;
      ctx.fillStyle = '#f0e4cc'; ctx.fillRect(cx - 42, 110, 84, 50); ctx.fillRect(cx + 66, 66, 22, 94);
      ctx.fillStyle = '#b5583a'; ctx.beginPath(); ctx.moveTo(cx + 62, 66); ctx.lineTo(cx + 77, 48); ctx.lineTo(cx + 92, 66); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c9603a'; ctx.beginPath(); ctx.moveTo(cx - 44, 112); ctx.quadraticCurveTo(cx - 42, 60, cx, 50); ctx.quadraticCurveTo(cx + 42, 60, cx + 44, 112); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#fff3dc'; ctx.lineWidth = 2.5;
      for (const dx of [-24, 0, 24]) { ctx.beginPath(); ctx.moveTo(cx, 50); ctx.quadraticCurveTo(cx + dx * 0.9, 76, cx + dx, 112); ctx.stroke(); }
      ctx.fillStyle = '#fff3dc'; ctx.fillRect(cx - 5, 36, 10, 15); circle(cx, 33, 4); ctx.fill();
      ctx.fillStyle = '#b89a78'; for (let i = 0; i < 4; i++) ctx.fillRect(cx + 72, 76 + i * 20, 10, 10);
    });
    tthRaceEach(u * 0.24, 126, 140, (x, n) => {
      const h = 30 + (hash(n, 7) % 36), w = 118;
      ctx.fillStyle = ['#e8c99a', '#f0d8b0', '#dcb98c'][hash(n, 1) % 3]; ctx.fillRect(x, gy - h, w, h);
      ctx.fillStyle = '#b5583a'; ctx.beginPath(); ctx.moveTo(x - 6, gy - h); ctx.lineTo(x + w / 2, gy - h - 15); ctx.lineTo(x + w + 6, gy - h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7a5a48'; ctx.fillRect(x + 22, gy - h + 9, 9, 12); ctx.fillRect(x + 76, gy - h + 9, 9, 12);
    });
  },
  wright(u, t) {
    const gy = TTHRACE.gy;
    // a windy beach: clouds, the sea, dunes, and the Flyer on its first flight
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 3; i++) { const cx = ((i * 380 + t * 9 - u * 0.03) % (W + 240) + W + 240) % (W + 240) - 120, cy = 34 + i * 22; circle(cx, cy, 18); ctx.fill(); circle(cx + 22, cy + 5, 14); ctx.fill(); circle(cx - 20, cy + 6, 12); ctx.fill(); }
    ctx.fillStyle = '#5fb0d6'; ctx.fillRect(0, 124, W, 20);
    tthRaceRidge(u * 0.07, 136, 7, 0.006, 3, 0.015, '#f3e4b8');
    const fx = W + 180 - ((t * 30 + u * 0.12) % (W + 560) + W + 560) % (W + 560), fy = 58 + Math.sin(t * 1.3) * 5;
    ctx.lineCap = 'round';
    for (const [col, lw] of [[C.ink, 6.5], ['#f3ead2', 3.5]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
      ctx.moveTo(fx - 36, fy); ctx.lineTo(fx + 36, fy); ctx.moveTo(fx - 36, fy + 13); ctx.lineTo(fx + 36, fy + 13);
      ctx.moveTo(fx - 62, fy + 4); ctx.lineTo(fx - 46, fy + 4); ctx.moveTo(fx - 62, fy + 10); ctx.lineTo(fx - 46, fy + 10);
      ctx.moveTo(fx + 54, fy + 1); ctx.lineTo(fx + 54, fy + 13); ctx.stroke();
    }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath();
    for (const dx of [-30, -10, 10, 30]) { ctx.moveTo(fx + dx, fy); ctx.lineTo(fx + dx, fy + 13); }
    ctx.moveTo(fx - 46, fy + 7); ctx.lineTo(fx - 30, fy + 10); ctx.moveTo(fx + 36, fy + 7); ctx.lineTo(fx + 54, fy + 7); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(fx - 4, fy + 10, 8, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(60,50,40,0.35)'; ctx.beginPath(); ctx.ellipse(fx + 16, fy + 6, 2.5, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineCap = 'butt';
    tthRaceRidge(u * 0.2, 152, 8, 0.008, 4, 0.021, '#e6d199');
    tthRaceEach(u * 0.2, 180, 40, (x, n) => {
      ctx.strokeStyle = '#8fae6a'; ctx.lineWidth = 2; const by = 160 + (hash(n, 4) % 8);
      ctx.beginPath(); for (const dx of [-5, 0, 5]) { ctx.moveTo(x, by); ctx.lineTo(x + dx + Math.sin(t * 4 + n) * 2 - 3, by - 11); } ctx.stroke();
    });
  },
  moon(u, t) {
    const gy = TTHRACE.gy;
    // black sky, the Earth, grey mountains, the lander and its flag
    tthStars(t, 34, 0.9, 5);
    ctx.fillStyle = '#3f7fd9'; circle(800, 48, 25); ctx.fill();
    ctx.fillStyle = '#5fbf7a'; ctx.beginPath(); ctx.ellipse(792, 42, 9, 6, 0.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(808, 56, 7, 5, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(800, 48, 17, 3.6, 4.6); ctx.stroke(); ctx.beginPath(); ctx.arc(800, 48, 14, 0.4, 1.3); ctx.stroke(); ctx.lineCap = 'butt';
    tthRaceRidge(u * 0.07, 130, 14, 0.007, 7, 0.019, '#5a5d74');
    tthRaceEach(u * 0.2, 1700, 220, x => {
      const cx = x + 580, by = 160;
      ctx.strokeStyle = '#c9ccd9'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx - 12, by - 20); ctx.lineTo(cx - 26, by); ctx.moveTo(cx + 12, by - 20); ctx.lineTo(cx + 26, by); ctx.moveTo(cx - 31, by); ctx.lineTo(cx - 21, by); ctx.moveTo(cx + 21, by); ctx.lineTo(cx + 31, by); ctx.stroke();
      ctx.fillStyle = '#d9a441'; rr(cx - 18, by - 36, 36, 18, 3); ctx.fill();
      ctx.fillStyle = '#d5d8e4'; rr(cx - 12, by - 54, 24, 20, 6); ctx.fill(); ctx.fillStyle = '#2a2d44'; circle(cx - 2, by - 45, 4); ctx.fill();
      ctx.strokeStyle = '#d5d8e4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + 62, by + 2); ctx.lineTo(cx + 62, by - 36); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(cx + 63, by - 36, 24, 15); ctx.fillStyle = '#d9483a'; for (let i = 0; i < 3; i++) ctx.fillRect(cx + 63, by - 36 + i * 6, 24, 3); ctx.fillStyle = '#3f5fb8'; ctx.fillRect(cx + 63, by - 36, 10, 8);
    });
    tthRaceRidge(u * 0.2, 158, 5, 0.012, 3, 0.03, '#74778c');
  },
  tunnel(u, t) {
    // the time tunnel: rings of light rushing by, clocks adrift
    tthStars(t, 30, 0.8, 9);
    ctx.lineWidth = 3;
    for (let k = 0; k < 6; k++) { const r = ((t * 60 + k * 62) % 372) + 14; ctx.strokeStyle = `rgba(${k % 2 ? '178,141,255' : '127,233,255'},${0.5 * (1 - r / 390)})`; ctx.beginPath(); ctx.ellipse(W * 0.62, 86, r * 1.6, r * 0.75, 0, 0, Math.PI * 2); ctx.stroke(); }
    tthRaceEach(u * 0.3, 270, 40, (x, n) => { const h = hash(n, 2); tthClockFace(x, 34 + (h % 84) + Math.sin(t * 1.2 + n) * 5, 9 + (h % 7), t + n, { speed: 2 + (n & 3), lw: 1.6, fill: n % 2 ? '#fff4d6' : '#f6d37a' }); });
  },
};
function tthRaceDrawBackdrop(lap, cam, sx0, sx1, t) {
  const gy = TTHRACE.gy, th = lap.th;
  if (sx1 <= sx0) return;
  ctx.save(); ctx.beginPath(); ctx.rect(sx0, 0, sx1 - sx0, TTHRACE.laneH); ctx.clip();
  let g = tthRaceSkyG[lap.key];
  if (!g) { g = tthRaceSkyG[lap.key] = ctx.createLinearGradient(0, 0, 0, gy); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]); }
  ctx.fillStyle = g; ctx.fillRect(sx0, 0, sx1 - sx0, TTHRACE.laneH);
  TTHRACE_BACK[lap.key](cam.x - lap.x0, t);
  ctx.restore();
}

/* ---------- drawing: the ground, the things on it, the rings (world coords across, lane coords down) ---------- */
function tthRaceDrawGround(T, X0, X1, t) {
  const n = T.laps.length;
  for (const lap of T.laps) {
    const a = Math.max(X0, lap.i === 0 ? -1e9 : lap.x0), b = Math.min(X1, lap.i === n - 1 ? 1e9 : lap.x1);
    if (b <= a) continue;
    let x = a;
    for (const o of lap.gaps) {
      if (o.x1 <= a || o.x0 >= b) continue;
      if (o.x0 > x) tthRaceDrawRun(lap.th, x, o.x0, t);
      tthRaceDrawGap(lap.th, o, t);
      x = o.x1;
    }
    if (x < b) tthRaceDrawRun(lap.th, x, b, t);
  }
}
// a run of ground from x0 to x1 in a lap's own look
function tthRaceDrawRun(th, x0, x1, t) {
  const gy = TTHRACE.gy, LH = TTHRACE.laneH, w = x1 - x0, G3 = th.ground;
  ctx.fillStyle = G3[1]; ctx.fillRect(x0, gy, w, LH - gy);
  const each = (sp, fn) => { for (let n = Math.ceil((x0 + 6) / sp); n * sp < x1 - 6; n++) fn(n * sp, n); };
  switch (th.deco) {
    case 'grass':
      ctx.fillStyle = G3[2]; each(64, (x, n) => { ctx.beginPath(); ctx.ellipse(x, gy + 20 + (hash(n, 1) % 12), 14, 3, 0, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = G3[0]; ctx.fillRect(x0, gy, w, 8);
      ctx.strokeStyle = G3[2]; ctx.lineWidth = 2; ctx.beginPath(); each(46, (x, n) => { const d = hash(n, 2) % 14; ctx.moveTo(x + d, gy + 1); ctx.lineTo(x + d - 3, gy - 6); ctx.moveTo(x + d + 4, gy + 1); ctx.lineTo(x + d + 6, gy - 5); }); ctx.stroke();
      break;
    case 'track':
      ctx.fillStyle = G3[0]; ctx.fillRect(x0, gy, w, 14);
      ctx.fillStyle = '#ffffff'; each(60, x => ctx.fillRect(x, gy + 5, 30, 3));
      ctx.fillStyle = G3[2]; each(38, (x, n) => { circle(x + (hash(n, 3) % 20), gy + 22 + (hash(n, 4) % 12), 2); ctx.fill(); });
      break;
    case 'blocks':
      ctx.fillStyle = G3[0]; ctx.fillRect(x0, gy, w, 9);
      ctx.strokeStyle = G3[2]; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(x0, gy + 9); ctx.lineTo(x1, gy + 9); ctx.moveTo(x0, gy + 25); ctx.lineTo(x1, gy + 25);
      each(46, x => { ctx.moveTo(x, gy + 9); ctx.lineTo(x, gy + 25); ctx.moveTo(x + 23, gy + 25); ctx.lineTo(x + 23, gy + 40); }); ctx.stroke();
      break;
    case 'ice':
      ctx.fillStyle = G3[2]; ctx.fillRect(x0, gy, w, 12);
      ctx.fillStyle = G3[0]; ctx.fillRect(x0, gy, w, 5);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); each(110, (x, n) => { const d = hash(n, 6) % 40; ctx.moveTo(x + d, gy + 18); ctx.lineTo(x + d - 14, gy + 32); ctx.moveTo(x + d + 12, gy + 18); ctx.lineTo(x + d + 4, gy + 26); }); ctx.stroke(); ctx.lineCap = 'butt';
      break;
    case 'tiles':
      ctx.fillStyle = G3[0]; ctx.fillRect(x0, gy, w, 13);
      ctx.strokeStyle = G3[2]; ctx.lineWidth = 2; ctx.beginPath(); each(16, x => { ctx.moveTo(x - 8, gy + 3); ctx.quadraticCurveTo(x, gy + 13, x + 8, gy + 3); }); ctx.stroke();
      ctx.fillStyle = G3[2]; ctx.fillRect(x0, gy + 13, w, 3);
      ctx.fillStyle = '#7a5a48'; each(90, x => { if (x - 7 > x0 && x + 7 < x1) { rr(x - 6, gy + 22, 12, 16, 5); ctx.fill(); } });
      break;
    case 'sand':
      ctx.fillStyle = G3[0]; ctx.fillRect(x0, gy, w, 9);
      ctx.strokeStyle = G3[2]; ctx.lineWidth = 2; ctx.beginPath(); each(70, (x, n) => { const y = gy + 18 + (hash(n, 5) % 14); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 12, y - 5, x + 24, y); }); ctx.stroke();
      ctx.strokeStyle = '#8fae6a'; ctx.beginPath(); each(150, (x, n) => { const d = hash(n, 8) % 60; for (const dx of [-4, 0, 4]) { ctx.moveTo(x + d, gy + 1); ctx.lineTo(x + d + dx - 3, gy - 9); } }); ctx.stroke();
      break;
    case 'moon':
      ctx.fillStyle = G3[0]; ctx.fillRect(x0, gy, w, 7);
      ctx.fillStyle = G3[2]; each(120, (x, n) => { ctx.beginPath(); ctx.ellipse(x + (hash(n, 9) % 50), gy + 20 + (hash(n, 10) % 12), 12 + (hash(n, 3) % 8), 3.5, 0, 0, Math.PI * 2); ctx.fill(); });
      break;
    default:   // 'brass': the tunnel's path
      ctx.fillStyle = G3[2]; ctx.fillRect(x0, gy, w, 10);
      ctx.fillStyle = G3[0]; ctx.fillRect(x0, gy, w, 4);
      ctx.fillStyle = `rgba(178,141,255,${0.35 + 0.15 * Math.sin(t * 4)})`; ctx.fillRect(x0, gy + 10, w, 3);
      ctx.fillStyle = '#9a6f22'; each(36, x => { circle(x, gy + 7, 1.6); ctx.fill(); });
  }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); ctx.stroke();
}
function tthRaceDrawGap(th, o, t) {
  const gy = TTHRACE.gy, LH = TTHRACE.laneH;
  if (o.look === 'bowl') {
    // a Moon crater: a dusty bowl
    ctx.fillStyle = th.ground[1]; ctx.fillRect(o.x0, gy, o.w, LH - gy);
    ctx.fillStyle = '#5a5d74'; ctx.beginPath(); ctx.moveTo(o.x0, gy); ctx.quadraticCurveTo(o.x, gy + 62, o.x1, gy); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(o.x0, gy); ctx.quadraticCurveTo(o.x, gy + 62, o.x1, gy); ctx.stroke();
    ctx.fillStyle = th.ground[0]; rr(o.x0 - 9, gy - 4, 16, 7, 3); ctx.fill(); rr(o.x1 - 7, gy - 4, 16, 7, 3); ctx.fill();
    return;
  }
  ctx.fillStyle = o.look === 'rift' ? '#0f0a2a' : o.look === 'alley' ? '#4a2f3a' : '#2a2038'; ctx.fillRect(o.x0, gy, o.w, LH - gy);
  if (o.look === 'rift') { ctx.fillStyle = `rgba(127,233,255,${0.3 + 0.2 * Math.sin(t * 6 + o.x)})`; ctx.fillRect(o.x0 + 4, gy + 6, o.w - 8, 5); ctx.fillStyle = 'rgba(178,141,255,0.4)'; ctx.fillRect(o.x0 + 10, gy + 18, o.w - 20, 4); }
  if (o.look === 'alley') {
    // washing on a line across the alley
    ctx.strokeStyle = '#e8dcb0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(o.x0, gy + 12); ctx.quadraticCurveTo(o.x, gy + 20, o.x1, gy + 12); ctx.stroke();
    const n = Math.max(1, Math.floor(o.w / 46));
    for (let i = 0; i < n; i++) { const x = o.x0 + (i + 0.5) * o.w / n; ctx.fillStyle = ['#fbf7ee', '#7fd6ff', '#ff8fc7', '#ffd23f'][i % 4]; ctx.fillRect(x - 7, gy + 16, 14, 13 + Math.sin(t * 3 + i) * 1.5); }
  }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(o.x0, gy); ctx.lineTo(o.x0, LH); ctx.moveTo(o.x1, gy); ctx.lineTo(o.x1, LH); ctx.stroke();
}
// a low thing to hop (knocked over once this lane's runner has run into it)
function tthRaceDrawHop(o, k, t) {
  const gy = TTHRACE.gy, x = o.x, w = o.w, h = o.h;
  ctx.save(); ctx.translate(x, gy);
  if (o.hit[k]) { ctx.globalAlpha = 0.5; ctx.translate(10, 0); ctx.rotate(1.2); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  switch (o.look) {
    case 'log':
      ctx.fillStyle = '#9a6a3a'; rr(-w / 2, -h, w, h, 11); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e0b87a'; circle(0, -h / 2, 8); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#7a4a22'; ctx.stroke(); circle(0, -h / 2, 4); ctx.stroke();
      ctx.fillStyle = '#5cc27f'; ctx.beginPath(); ctx.ellipse(-9, -h - 2, 6, 3, -0.5, 0, Math.PI * 2); ctx.fill();
      break;
    case 'hurdle':
      ctx.fillStyle = '#fbf7ee'; ctx.fillRect(-6, -h, 3.5, h); ctx.strokeRect(-6, -h, 3.5, h); ctx.fillRect(3, -h, 3.5, h); ctx.strokeRect(3, -h, 3.5, h);
      ctx.fillStyle = '#ffffff'; rr(-10, -h - 3, 20, 8, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d9483a'; ctx.fillRect(-6, -h - 2, 4, 6); ctx.fillRect(2, -h - 2, 4, 6);
      break;
    case 'merlon':
      ctx.fillStyle = '#e6d2a8'; ctx.fillRect(-w / 2, -h, w, h); ctx.strokeRect(-w / 2, -h, w, h);
      ctx.strokeStyle = '#9a8258'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-w / 2 + 2, -h / 2); ctx.lineTo(w / 2 - 2, -h / 2); ctx.moveTo(0, -h + 2); ctx.lineTo(0, -h / 2); ctx.stroke();
      break;
    case 'ice':
      ctx.fillStyle = '#bfe9ff'; ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2 + 3, -h + 6); ctx.lineTo(-3, -h); ctx.lineTo(w / 2 - 2, -h + 8); ctx.lineTo(w / 2, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#3f7fa8'; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -h + 6); ctx.lineTo(-9, -8); ctx.stroke();
      break;
    case 'pot':
      ctx.fillStyle = '#c9603a'; ctx.fillRect(-w / 2 + 3, -h + 6, w - 6, h - 6); ctx.strokeRect(-w / 2 + 3, -h + 6, w - 6, h - 6);
      ctx.fillStyle = '#a8482a'; rr(-w / 2, -h, w, 8, 3); ctx.fill(); ctx.stroke();
      for (let n = 0; n < 2; n++) { const u = (t * 0.7 + n / 2) % 1; ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - u)})`; circle(Math.sin(u * 5 + n) * 4, -h - 6 - u * 22, 4 + u * 5); ctx.fill(); }
      break;
    case 'fence':
      ctx.fillStyle = '#c9a06a'; for (const dx of [-7, 3]) { ctx.beginPath(); ctx.moveTo(dx, 0); ctx.lineTo(dx, -h + 4); ctx.lineTo(dx + 2.5, -h); ctx.lineTo(dx + 5, -h + 4); ctx.lineTo(dx + 5, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#b08850'; ctx.fillRect(-11, -h + 9, 23, 4); ctx.strokeRect(-11, -h + 9, 23, 4);
      break;
    case 'gear': {
      ctx.fillStyle = '#d9a441'; ctx.save(); ctx.translate(0, -h / 2); ctx.rotate(t * 1.5 + x);
      for (let n = 0; n < 8; n++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-3.5, -h / 2 - 1, 7, 7); ctx.strokeRect(-3.5, -h / 2 - 1, 7, 7); }
      circle(0, 0, h / 2 - 3); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#3a2f7a'; circle(0, 0, 4); ctx.fill(); ctx.stroke(); ctx.restore();
      break;
    }
    case 'met':
      ctx.fillStyle = '#4a3a3a'; ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.quadraticCurveTo(-w / 2 - 1, -h * 0.8, -4, -h); ctx.quadraticCurveTo(w / 2 - 2, -h - 1, w / 2, -h * 0.4); ctx.lineTo(w / 2 + 1, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = `rgba(255,${150 + Math.round(Math.sin(t * 6 + x) * 50)},60,0.95)`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-7, -h + 5); ctx.lineTo(-1, -h / 2); ctx.lineTo(-6, -3); ctx.moveTo(-1, -h / 2); ctx.lineTo(8, -7); ctx.stroke();
      for (let n = 0; n < 2; n++) { const u = (t * 0.9 + n / 2) % 1; ctx.fillStyle = `rgba(90,80,90,${0.45 * (1 - u)})`; circle(Math.sin(u * 4 + n) * 5, -h - 6 - u * 26, 5 + u * 6); ctx.fill(); }
      break;
    default:   // 'stone' (a fallen sarsen), 'rock' (a Moon rock)
      ctx.fillStyle = o.look === 'rock' ? '#8a8da0' : '#a3adb8';
      ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.quadraticCurveTo(-w / 2 - 2, -h * 0.7, -w * 0.15, -h); ctx.quadraticCurveTo(w * 0.3, -h - 2, w / 2, -h * 0.45); ctx.lineTo(w / 2 + 1, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-w * 0.16, -h * 0.7, w * 0.17, h * 0.13, -0.4, 0, Math.PI * 2); ctx.fill();
      if (o.look === 'stone') { ctx.fillStyle = '#7fae6a'; circle(6, -6, 3); ctx.fill(); }
  }
  ctx.restore();
}
// a lintel to slide under: `front` draws what passes in front of the runner
function tthRaceDrawDuck(o, k, t) {
  const gy = TTHRACE.gy, c = TTHRACE.duckC, x = o.x, w = o.w, x0 = o.x0;
  ctx.save();
  if (o.hit[k]) ctx.globalAlpha = 0.55;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  if (o.look === 'pend') {
    // a brass beam on two chains, swinging a little
    const sw = Math.sin(t * 2 + x) * 3;
    ctx.strokeStyle = '#9a6f22'; ctx.lineWidth = 3; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(x0 + 14, 0); ctx.lineTo(x0 + 14 + sw, gy - c - 14); ctx.moveTo(o.x1 - 14, 0); ctx.lineTo(o.x1 - 14 + sw, gy - c - 14); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.fillStyle = '#d9a441'; rr(x0 + sw, gy - c - 18, w, 18, 9); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f6d37a'; rr(x0 + 6 + sw, gy - c - 15, w - 12, 4, 2); ctx.fill();
    tthClockFace(x + sw, gy - c - 9, 6, t + x, { speed: 4, lw: 1.5 });
  } else {
    const ice = o.look === 'arch', col = ice ? '#cfefff' : '#a3adb8', dark = ice ? '#8fc7e6' : '#7f8a96', sh = ice ? 20 : 24;
    // two uprights (behind the runner) and the slab across them
    ctx.fillStyle = dark;
    for (const px of [x0 + 2, o.x1 - 18]) { ctx.fillRect(px, gy - c, 16, c); ctx.strokeRect(px, gy - c, 16, c); }
    ctx.fillStyle = col; rr(x0 - 5, gy - c - sh, w + 10, sh, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; rr(x0 + 2, gy - c - sh + 4, w * 0.5, 4, 2); ctx.fill();
    if (ice) { ctx.fillStyle = '#eaf8ff'; for (let ix = x0 + 26; ix < o.x1 - 24; ix += 22) { ctx.beginPath(); ctx.moveTo(ix - 4, gy - c - 1); ctx.lineTo(ix, gy - c + 5 + (hash(ix | 0, 3) % 3)); ctx.lineTo(ix + 4, gy - c - 1); ctx.closePath(); ctx.fill(); } }
    else { ctx.fillStyle = '#7fae6a'; circle(x0 + w * 0.7, gy - c - sh + 5, 3.5); ctx.fill(); circle(x0 + w * 0.2, gy - c - 6, 2.5); ctx.fill(); }
  }
  ctx.restore();
}
function tthRaceDrawUpdraft(o, t) {
  const gy = TTHRACE.gy;
  // a roof vent with warm air (and gold arrows) rising
  ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(o.x0, gy - 120, o.w, 120);
  ctx.fillStyle = '#5a4038'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(o.x0 - 3, gy - 5, o.w + 6, 7, 3); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (let n = 0; n < 4; n++) {
    const x = o.x0 + 12 + n * (o.w - 24) / 3, off = (t * 90 + n * 31) % 28;
    ctx.beginPath(); for (let y = gy - 8 - off; y > gy - 118; y -= 28) { ctx.moveTo(x + Math.sin(y * 0.09 + n) * 4, y); ctx.lineTo(x + Math.sin((y - 14) * 0.09 + n) * 4, y - 14); } ctx.stroke();
  }
  ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.lineJoin = 'round';
  for (let n = 0; n < 2; n++) { const u = (t * 0.9 + n / 2) % 1, y = gy - 22 - u * 70; ctx.globalAlpha = Math.sin(u * Math.PI); ctx.beginPath(); ctx.moveTo(o.x - 11, y + 8); ctx.lineTo(o.x, y - 3); ctx.lineTo(o.x + 11, y + 8); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.lineCap = 'butt';
}
function tthRaceDrawWind(o, t) {
  const gy = TTHRACE.gy;
  // a windsock, and the gust streaming against you with flying sand
  ctx.fillStyle = 'rgba(255,255,255,0.13)'; ctx.fillRect(o.x0, gy - 100, o.w, 100);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(o.x0 - 4, gy); ctx.lineTo(o.x0 - 4, gy - 78); ctx.stroke();
  const fl = Math.sin(t * 14) * 3;
  for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#ffffff' : '#ff7a3d'; ctx.beginPath(); ctx.moveTo(o.x0 - 4 - i * 11, gy - 78 + i * 1.5 + (i ? fl * i / 3 : 0)); ctx.lineTo(o.x0 - 15 - i * 11, gy - 76.5 + i * 1.5 + fl * (i + 1) / 3); ctx.lineTo(o.x0 - 15 - i * 11, gy - 65 - i * 1.5 + fl * (i + 1) / 3); ctx.lineTo(o.x0 - 4 - i * 11, gy - 62 - i * 1.5 + (i ? fl * i / 3 : 0)); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.lineCap = 'round';
  for (let n = 0; n < 9; n++) {
    const u = ((t * 1.7 + n * 0.37) % 1), x = o.x1 - u * (o.w + 30), y = gy - 34 - ((n * 37) % 62);
    if (x < o.x0 - 20) continue;
    ctx.globalAlpha = Math.sin(u * Math.PI) * 0.9; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 22, y - 5, x + 44, y); ctx.stroke();
  }
  ctx.fillStyle = '#e0c688';
  for (let n = 0; n < 8; n++) { const u = ((t * 2.3 + n * 0.29) % 1), x = o.x1 - u * (o.w + 20), y = gy - 4 - ((n * 13) % 22); ctx.globalAlpha = 1 - u; circle(x, y, 2); ctx.fill(); }
  ctx.globalAlpha = 1; ctx.lineCap = 'butt';
}
// a meteor: its shadow on the ground, the fireball coming down, then the hot rock
function tthRaceDrawMeteor(ph, o, k, t) {
  const gy = TTHRACE.gy, K = TTHRACE, t0 = o.t0[k];
  if (t0 != null && ph.t >= t0 + K.met.fall) { tthRaceDrawHop(o, k, t); return; }
  const u = t0 == null ? 0 : clamp((ph.t - t0) / K.met.fall, 0, 1), pulse = 0.5 + 0.5 * Math.sin(t * 10);
  ctx.fillStyle = `rgba(28,26,54,${0.3 + 0.3 * u + 0.1 * pulse})`; ctx.beginPath(); ctx.ellipse(o.x, gy + 3, 14 + 12 * u + 3 * pulse, 4 + 2 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = `rgba(255,95,109,${0.6 + 0.4 * pulse})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(o.x, gy + 3, 22 + 3 * pulse, 6, 0, 0, Math.PI * 2); ctx.stroke();
  if (t0 == null) return;
  const mx = o.x + 250 * (1 - u), my = gy - 12 - 300 * (1 - u);
  ctx.strokeStyle = 'rgba(255,170,80,0.7)'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + 50, my - 60); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,170,0.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + 34, my - 41); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = '#ff8a3d'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; circle(mx, my, 11); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff1a8'; circle(mx - 2, my + 2, 5); ctx.fill();
}
// a portal ring between two laps: the back half behind the runner, the front half over them
function tthRaceDrawRing(x, t, front) {
  const gy = TTHRACE.gy, cy = gy - 74, rx = 26, ry = 88;
  if (!front) {
    // the seam between two times: a column of light
    const g = ctx.createLinearGradient(x - 26, 0, x + 26, 0);
    g.addColorStop(0, 'rgba(178,141,255,0)'); g.addColorStop(0.5, 'rgba(230,220,255,0.85)'); g.addColorStop(1, 'rgba(127,233,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 26, 0, 52, TTHRACE.laneH);
    ctx.fillStyle = `rgba(127,233,255,${0.25 + 0.1 * Math.sin(t * 5)})`; ctx.beginPath(); ctx.ellipse(x, cy, rx - 4, ry - 6, 0, 0, Math.PI * 2); ctx.fill();
  }
  const a0 = front ? -Math.PI / 2 : Math.PI / 2, a1 = front ? Math.PI / 2 : Math.PI * 1.5;
  ctx.lineCap = 'butt';
  ctx.strokeStyle = C.ink; ctx.lineWidth = 12; ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, a0, a1); ctx.stroke();
  ctx.strokeStyle = front ? TTHC.brass : TTHC.brassDk; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, a0, a1); ctx.stroke();
  ctx.strokeStyle = TTHC.brassLt; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, cy, rx + 2, ry + 2, 0, a0 + 0.1, a1 - 0.1); ctx.stroke();
  if (front) {
    ctx.fillStyle = TTHC.cream; for (let n = 0; n < 5; n++) { const a = -1.2 + n * 0.6 + Math.sin(t * 2) * 0.05; circle(x + Math.cos(a) * rx, cy + Math.sin(a) * ry, 2.6); ctx.fill(); }
    for (let n = 0; n < 4; n++) { const u = (t * 0.8 + n / 4) % 1, a = n * 1.7 + t; ctx.fillStyle = `rgba(255,255,255,${0.9 * (1 - u)})`; circle(x + Math.cos(a) * (10 + u * 40), cy + Math.sin(a) * (30 + u * 70), 2.2); ctx.fill(); }
  }
}
// the start arch, the finish line and the gold home portal behind it
function tthRaceDrawEnds(T, X0, X1, t) {
  const gy = TTHRACE.gy;
  if (X0 < 160) {
    for (const dx of [-52, 52]) { ctx.fillStyle = TTHC.brass; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.fillRect(40 + dx - 5, gy - 118, 10, 118); ctx.strokeRect(40 + dx - 5, gy - 118, 10, 118); }
    for (let i = 0; i < 14; i++) for (let j = 0; j < 3; j++) { ctx.fillStyle = (i + j) % 2 ? C.ink : '#ffffff'; ctx.fillRect(40 - 56 + i * 8, gy - 122 + j * 8 + Math.sin(t * 3 + i * 0.5) * 1.5, 8, 8); }
    ctx.fillStyle = '#9fe07f'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(40 - 34, gy - 96, 68, 20, 7); ctx.fill(); ctx.stroke();
    text('START', 40, gy - 85.5, 14, C.ink, 'center', 'body');
  }
  const fx = T.len;
  if (X1 > fx - 80) {
    for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) { ctx.fillStyle = (i + j) % 2 ? C.ink : '#ffffff'; ctx.fillRect(fx - 8 + i * 8, gy + j * 5, 8, 5); }
    const px = fx + TTHRACE.finPortal;
    tthDrawPortal(px, gy - 70, 68, t, { col: '#ffc53d' });
    ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(px - 34, gy - 158, 68, 22, 8); ctx.fill(); ctx.stroke();
    text('HOME', px, gy - 146.5, 15, C.ink, 'center', 'body');
  }
}
// a runner (feet on the ground line at r.x, world coords): o { alpha, s, ghost }
function tthRaceDrawRunner(st, r, o) {
  const K = TTHRACE, ph = st.ph, t = G.clock, gy = K.gy;
  if (r.goneT >= 0.35) return;
  let sx = 1, sy = 1, rot = 0, lift = 0, s = o.s, a = o.alpha;
  if (r.goneT > 0) { const u = r.goneT / 0.35; s *= 1 - 0.8 * u; a *= 1 - u; lift = 46 * u; rot = u * 5; }
  else if (r.fallT > 0) rot = Math.sin(t * 22) * 0.3;
  else if (r.air) { sy = 1.08; sx = 0.94; rot = clamp(-r.vy / 3000, -0.12, 0.2) + (r.flo ? Math.sin(t * 3 + r.k) * 0.1 : 0); }
  else if (r.low) { sx = 1.28; sy = 0.58; rot = -0.2; }
  else {
    const m = Math.min(1, r.v / 220);
    lift = Math.abs(Math.sin(r.step)) * 3.5 * m; rot = (0.05 + r.v / 4200) * m - (r.wind ? 0.3 : 0);
    if (r.land > 0) { sy = 1 - 0.22 * (r.land / 0.18); sx = 1.1; }
  }
  if (r.stun > 0) rot += Math.sin(t * 34) * 0.16;
  const x = r.x, y = gy - r.y - lift;
  ctx.save(); ctx.globalAlpha *= a;
  if (!o.ghost) {
    // a shadow on the ground; the trail of a dash (time sparkles) or a boost (gold for the gold boost)
    if (r.y >= 0) { ctx.fillStyle = 'rgba(28,26,54,0.22)'; ctx.beginPath(); ctx.ellipse(x, gy + 2, Math.max(5, 15 - r.y * 0.07), 3.5, 0, 0, Math.PI * 2); ctx.fill(); }
    if (r.dash > 0 || r.boost > 0) {
      const col = r.gold > 0 ? '255,197,61' : r.dash > 0 ? '159,233,255' : '178,141,255';
      for (let n = 0; n < 4; n++) { ctx.fillStyle = `rgba(${col},${0.5 - n * 0.11})`; rr(x - 30 - n * 20, y - 30 + n * 3, 24, 26 - n * 6, 8); ctx.fill(); }
    }
  }
  tthDrawHero(r.k, x, y, { face: 1, sx, sy, rot, s, stun: r.stun > 0 || r.fallT > 0, vy: -r.vy * 0.4 });
  // little running shoes (gold ones for whoever trails in races)
  if (!r.air && r.fallT <= 0 && r.goneT <= 0) {
    const gold = !!ph.help[r.k], sw = r.low ? 0 : Math.sin(r.step) * 7 * Math.min(1, r.v / 160);
    ctx.fillStyle = gold ? C.gold : PDARK[r.k]; ctx.strokeStyle = gold ? '#ffffff' : C.ink; ctx.lineWidth = 1.2;
    for (const d of [-1, 1]) { const fx = x + (r.low ? 14 + d * 5 : d * (5 + sw * d)), fy = gy - Math.max(0, d * Math.cos(r.step)) * 4 * Math.min(1, r.v / 160); ctx.beginPath(); ctx.ellipse(fx + 2, fy - 2, 5.5, 3.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  }
  ctx.restore();
  if (o.ghost && o.tag) {
    ctx.save(); ctx.globalAlpha = 0.8;
    ctx.fillStyle = PCOL[r.k]; rr(x - 15, y - PH * s - 26, 30, 15, 7); ctx.fill();
    text(NAMES[r.k], x, y - PH * s - 18, 10, '#ffffff', 'center', 'body');
    ctx.restore();
  }
}
